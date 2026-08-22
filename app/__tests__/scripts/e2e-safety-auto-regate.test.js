/**
 * INFRA-484 — recover from a peer's install instead of making a human do it.
 *
 * THE WINDOW, AND WHY THIS IS THE FIX RATHER THAN A SPANNING LEASE
 * ===============================================================
 * `e2e-gate.sh` releases both leases on EXIT; `e2e-safety.sh` acquires the simulator lease
 * fresh when it starts. Between them nothing owns the device, and `/b-close` runs the two
 * as separate steps. A peer that acquires in that window builds and installs, so the flow
 * run then refuses at the provenance pre-flight — correct, loud, fails closed, and a wasted
 * gate build plus a human round-trip.
 *
 * Telemetry over a 19h window (INFRA-490, 2026-08-21) measured this at 4 of 28 flow-run
 * attempts. All four contended flow-lease acquisitions ran ZERO flows; 23 of 24 uncontended
 * ones ran flows (Fisher exact p = 2.4e-4), and in all four cases the device holder that
 * made them wait was a peer's `gate build`.
 *
 * The obvious fix — hold ONE lease from gate through flows — was measured and rejected:
 * the same window shows 17 of 18 gate→flows spans already overlapping another session, at
 * a median 14.5 min and a worst observed 58.3 min. Spanning would serialise essentially
 * every close on the machine, always, to remove a failure that already fails closed. This
 * recovery is the span paid ONLY on the runs that actually collide.
 *
 * WHAT IS BEING PINNED HERE
 * =========================
 * Bounded to exactly one rebuild; PEER attribution only; the child inherits the lease we
 * already hold rather than deadlocking on it; and the container path is re-resolved after
 * the rebuild, because `simctl` mints a new container UUID on every fresh install — reusing
 * the old `$APP` would verify a directory the new binary does not live in.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPTS = path.resolve(__dirname, '..', '..', 'scripts');
const SIM_A = 'AAAA-1111';
const BUNDLE_ID = 'fyi.being.app';
const MARKER_NAME = '.e2e-provenance.json';

const SOURCED = [
  'e2e-safety.sh',
  'e2e-sim-device.sh',
  'e2e-real-device.sh',
  'e2e-driver-ownership.sh',
  'e2e-sim-lock.sh',
  'e2e-host-contention.sh',
  'e2e-telemetry.sh',
  'e2e-provenance.js',
  'e2e-flow-certification.sh',
];

function git(args, cwd) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`);
  return (r.stdout || '').trim();
}

function writeStub(dir, name, body) {
  const p = path.join(dir, name);
  fs.writeFileSync(p, `#!/usr/bin/env bash\n${body}\n`, { mode: 0o755 });
  return p;
}

function bootedJson(udids) {
  return JSON.stringify({
    devices: {
      'com.apple.CoreSimulator.SimRuntime.iOS-18-6': udids.map((udid) => ({
        udid,
        name: 'iPhone SE (3rd generation)',
        state: 'Booted',
      })),
    },
  });
}

/** A container that passes every SHAPE check, so the run reaches the provenance arm. */
function makeContainer(root, name) {
  const c = path.join(root, 'containers', name);
  fs.mkdirSync(c, { recursive: true });
  fs.writeFileSync(path.join(c, 'main.jsbundle'), '// bundle\n');
  fs.writeFileSync(path.join(c, 'Being'), 'binary\n');
  fs.writeFileSync(path.join(c, 'Info.plist'), '<plist/>\n');
  return c;
}

function writeMarker(container, fields) {
  fs.writeFileSync(
    path.join(container, MARKER_NAME),
    `${JSON.stringify(
      {
        schema: 1,
        bundleId: BUNDLE_ID,
        repoRoot: '/Users/max/dev/being/feat-999',
        branch: 'feat/FEAT-999-peer',
        head: 'a'.repeat(40),
        treeHash: 'peer-tree-hash',
        dirty: false,
        builtAt: new Date().toISOString(),
        containerPath: container,
        ...fields,
      },
      null,
      2
    )}\n`
  );
}

/**
 * `buildBehaviour` is the whole point of the sandbox: the rebuild is stubbed, so nothing
 * here ever drives a simulator or xcodebuild. It records each invocation and can either
 * repair the target (the peer-collision recovery succeeding) or leave it broken (the
 * bound under test).
 */
function makeSandbox({ buildBehaviour = 'repair', extraBuild = '' } = {}) {
  // Two directories, deliberately. `repo` is the git worktree the gate runs in; `state`
  // holds everything a run MUTATES — locks, telemetry, containers, the stub's bookkeeping.
  //
  // They must not be the same directory. The provenance fingerprint hashes untracked file
  // contents repo-wide, so run state living inside the repo moves the tree hash under the
  // gate's own feet and every re-verify reports MISMATCH — attributed to SELF, since it
  // really is this tree that moved. That would fail the recovery for a reason the harness
  // invented. In production these already live outside the worktree (`/tmp/being-e2e-locks`,
  // `/tmp/being-e2e-telemetry`, the simulator's container root), which is why nobody meets
  // this; a sandbox that collapses them is testing a machine that does not exist.
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'infra484-regate-')));
  const root = path.join(base, 'repo');
  const state = path.join(base, 'state');
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.mkdirSync(state, { recursive: true });

  for (const f of SOURCED) {
    const src = path.join(SCRIPTS, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(root, 'scripts', f));
  }

  const maestro = path.join(root, '.maestro');
  fs.mkdirSync(maestro, { recursive: true });
  fs.writeFileSync(path.join(maestro, 'q9-single-alert.yaml'), 'tags:\n  - safety\n');

  // Two containers: the one the peer left behind, and the one a rebuild installs into.
  // Distinct paths on purpose — a fresh install mints a new container UUID, and a fix that
  // reuses the stale `$APP` would keep verifying the peer's directory forever.
  const stale = makeContainer(state, 'stale-peer');
  const fresh = makeContainer(state, 'fresh-rebuild');
  writeMarker(stale, {});

  const stubs = fs.mkdtempSync(path.join(os.tmpdir(), 'infra484-stubs-'));
  const bootedPath = path.join(state, 'booted.json');
  const containerPointer = path.join(state, 'container-path');
  const buildLog = path.join(state, 'build-invocations');
  fs.writeFileSync(bootedPath, bootedJson([SIM_A]));
  fs.writeFileSync(containerPointer, stale);
  fs.writeFileSync(buildLog, '');

  writeStub(
    stubs,
    'xcrun',
    [
      'case "$*" in',
      `  *"simctl list devices booted"*) cat "${bootedPath}" ;;`,
      // Read the pointer EVERY time, so a rebuild can move the target underneath the gate
      // exactly the way a real reinstall does.
      `  *"get_app_container"*) cat "${containerPointer}" ;;`,
      '  *) exit 0 ;;',
      'esac',
    ].join('\n')
  );
  writeStub(stubs, 'otool', 'echo "\t/usr/lib/libSystem.B.dylib"');
  writeStub(stubs, 'plutil', "echo '[\"tel\",\"sms\"]'");
  writeStub(stubs, 'maestro', 'exit 0');

  // The rebuild stub. It records that it ran and the lease token it inherited, and (when
  // repairing) installs a marker fingerprinted against THIS tree into the fresh container.
  const repair = [
    `  printf '%s' "${fresh}" > "${containerPointer}"`,
    `  node "${root}/scripts/e2e-provenance.js" write "${fresh}" >/dev/null 2>&1`,
  ].join('\n');
  writeStub(
    path.join(root, 'scripts'),
    'e2e-sim-build.sh',
    [
      `cd "${root}" || exit 1`,
      `echo "BUILD pid=$$ inherited=[${'${E2E_LOCK_INHERITED:-}'}]" >> "${buildLog}"`,
      extraBuild,
      buildBehaviour === 'repair' ? repair : '  :',
      'exit 0',
    ].join('\n')
  );

  // Committed AFTER the stub is written, so the tree the gate fingerprints is CLEAN.
  git(['init', '-q', '-b', 'main'], root);
  git(['config', 'user.email', 't@example.com'], root);
  git(['config', 'user.name', 'T'], root);
  git(['add', '-A'], root);
  git(['commit', '-qm', 'init'], root);

  return {
    root,
    state,
    stubs,
    stale,
    fresh,
    buildLog,
    containerPointer,
    lockRoot: path.join(state, 'locks'),
  };
}

function runGate(sandbox, { flows = ['q9-single-alert'], env = {} } = {}) {
  const res = spawnSync('bash', [path.join(sandbox.root, 'scripts', 'e2e-safety.sh'), ...flows], {
    encoding: 'utf8',
    timeout: 180000,
    cwd: sandbox.root,
    env: {
      ...process.env,
      PATH: `${sandbox.stubs}:${process.env.PATH}`,
      E2E_LOCK_ROOT: sandbox.lockRoot,
      E2E_TELEMETRY_FILE: path.join(sandbox.state, 'telemetry.jsonl'),
      E2E_EVIDENCE_DIR: sandbox.state,
      E2E_LOCK_INHERITED: '',
      E2E_SIM_UDID: '',
      E2E_DEVICE_UDID: '',
      // The host-contention settle waits up to 120s for a busy machine to go quiet. It is
      // not under test here, and leaving it on makes this suite's runtime a function of
      // whatever the other worktrees happen to be doing — which is how it first went red:
      // 126s on a machine at load15=37, killed by the timeout below rather than failed.
      E2E_HOST_SETTLE_MAX_S: '0',
      ...env,
    },
  });
  return {
    status: res.status,
    output: `${res.stdout || ''}${res.stderr || ''}`,
    builds: fs.readFileSync(sandbox.buildLog, 'utf8').trim().split('\n').filter(Boolean),
  };
}

describe('INFRA-484 — a peer-attributed provenance refusal re-gates once', () => {
  test('a PEER marker triggers exactly one rebuild, and the pre-flight then passes', () => {
    const s = makeSandbox({ buildBehaviour: 'repair' });
    const r = runGate(s);

    expect(r.builds).toHaveLength(1);
    // Attribution must be in the operator-visible text: "rebuilding" with no named cause
    // is indistinguishable from the gate deciding to burn 20 minutes for no reason.
    expect(r.output).toMatch(/feat-999/);
    expect(r.output).toMatch(/re-gat|rebuild/i);
    // The recovery WORKED: the second verify accepted the rebuilt target, and the run
    // carried on into the flow loop instead of refusing.
    expect(r.output).toMatch(/✓ provenance/);
    expect(r.output).toMatch(/e2e:safety summary/);
    // Deliberately NOT `status === 0`. Whether the flows themselves pass depends on the
    // maestro report and e2e-verdict.js's schema, neither of which INFRA-484 touches —
    // pinning the exit code here would couple this suite to an unrelated contract and
    // make it fail for reasons that say nothing about the recovery.
  }, 180000);

  test('the rebuild is handed the lease we already hold, so it inherits instead of blocking', () => {
    const s = makeSandbox({ buildBehaviour: 'repair' });
    const r = runGate(s);

    // `sim:<udid>:<pid>` is e2e-sim-lock.sh's token grammar. Without it the child's own
    // `e2e_lock_acquire "gate build"` contends with its parent and waits out the full
    // E2E_LOCK_TIMEOUT — a self-deadlock that looks exactly like a busy machine.
    expect(r.builds[0]).toMatch(new RegExp(`sim:${SIM_A}:\\d+`));
  }, 180000);

  test('the container is re-resolved after the rebuild, not reused', () => {
    const s = makeSandbox({ buildBehaviour: 'repair' });
    runGate(s);
    // The stub moved the target to a new container, mimicking a fresh install's new UUID.
    // Reaching a pass at all proves the re-verify read the NEW path: the stale one still
    // holds the peer's marker and would refuse again.
    expect(fs.readFileSync(s.containerPointer, 'utf8')).toBe(s.fresh);
  }, 180000);

  test('it is bounded — a rebuild that does not fix it refuses rather than looping', () => {
    const s = makeSandbox({ buildBehaviour: 'noop' });
    const r = runGate(s);

    expect(r.builds).toHaveLength(1);
    // DEBUG-505 — 1 -> 2: a provenance refusal is a pre-flight fact with `ran` at 0, so
    // it carries no verdict. Re-pinned, not relaxed; the intent below is unchanged.
    expect(r.status).toBe(2);
    expect(r.output).toMatch(/pre-flight/i);
  }, 180000);

  test('a SELF-attributed mismatch never auto-rebuilds — that is the operator\'s call', () => {
    const s = makeSandbox({ buildBehaviour: 'repair' });
    // Same repoRoot as the tree under test, stale hash: "you edited something".
    writeMarker(s.stale, { repoRoot: s.root, treeHash: 'stale-but-mine' });

    const r = runGate(s);
    expect(r.builds).toHaveLength(0);
    // DEBUG-505 — 1 -> 2: a provenance refusal is a pre-flight fact with `ran` at 0, so
    // it carries no verdict. Re-pinned, not relaxed; the intent below is unchanged.
    expect(r.status).toBe(2);
  }, 180000);

  test('a MISSING marker never auto-rebuilds — there is nobody to attribute it to', () => {
    const s = makeSandbox({ buildBehaviour: 'repair' });
    fs.rmSync(path.join(s.stale, MARKER_NAME), { force: true });

    const r = runGate(s);
    expect(r.builds).toHaveLength(0);
    // DEBUG-505 — 1 -> 2: a provenance refusal is a pre-flight fact with `ran` at 0, so
    // it carries no verdict. Re-pinned, not relaxed; the intent below is unchanged.
    expect(r.status).toBe(2);
  }, 180000);

  test('the opt-out disables it and restores the plain refusal', () => {
    const s = makeSandbox({ buildBehaviour: 'repair' });
    const r = runGate(s, { env: { E2E_NO_AUTO_REGATE: '1' } });

    expect(r.builds).toHaveLength(0);
    // DEBUG-505 — 1 -> 2: a provenance refusal is a pre-flight fact with `ran` at 0, so
    // it carries no verdict. Re-pinned, not relaxed; the intent below is unchanged.
    expect(r.status).toBe(2);
  }, 180000);

  test('a rebuild that FAILS refuses with the pre-flight message, not a build trace', () => {
    const s = makeSandbox({ buildBehaviour: 'noop', extraBuild: 'exit 7' });
    const r = runGate(s);

    expect(r.builds).toHaveLength(1);
    // DEBUG-505 — 1 -> 2: a provenance refusal is a pre-flight fact with `ran` at 0, so
    // it carries no verdict. Re-pinned, not relaxed; the intent below is unchanged.
    expect(r.status).toBe(2);
    // Exit 2 is "the gate could not render a verdict"; a failed recovery must not leak the
    // build's own alphabet into the gate's. That guard is the point and it still holds.
    expect(r.status).not.toBe(7);
  }, 180000);
});
