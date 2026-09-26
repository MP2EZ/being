/**
 * INFRA-657 — an app that went MISSING after this run's own gate verified it is contention,
 * and earns the one rebuild a peer-attributed mismatch already gets (INFRA-484).
 *
 * The gap: the per-invocation lease leaves nothing owning the simulator between the gate
 * and the flows. A peer that installs there leaves a foreign marker, which INFRA-484 turns
 * into one rebuild. A peer that UNINSTALLS there leaves nothing at all — no marker, no
 * container — and the pre-flight exited 2 with "run e2e:safety:build first", voiding a
 * detached close that a relaunch then passed.
 *
 * The evidence that separates that case from a never-built worktree is the gate RECEIPT,
 * written by e2e-gate.sh outside the container (the marker left with the app). Everything
 * here is pinned against a stubbed rebuild, so nothing drives a simulator or xcodebuild.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPTS = path.resolve(__dirname, '..', '..', 'scripts');
const SIM_A = 'AAAA-1111';
const MARKER_NAME = '.e2e-provenance.json';

const SOURCED = [
  'e2e-safety.sh',
  'e2e-sim-device.sh',
  'e2e-real-device.sh',
  'e2e-driver-ownership.sh',
  'e2e-content-size.sh',
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

function makeContainer(root, name) {
  const c = path.join(root, 'containers', name);
  fs.mkdirSync(c, { recursive: true });
  fs.writeFileSync(path.join(c, 'main.jsbundle'), '// bundle\n');
  fs.writeFileSync(path.join(c, 'Being'), 'binary\n');
  fs.writeFileSync(path.join(c, 'Info.plist'), '<plist/>\n');
  return c;
}

function provenance(root, args) {
  return spawnSync('node', [path.join(root, 'scripts', 'e2e-provenance.js'), ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}

/**
 * `rebuild`: 'repair' installs a marker fingerprinted against THIS tree into a fresh
 * container; 'noop' leaves the app missing; 'peer' installs a foreign marker; 'fail' exits 7.
 * `receipt`: 'valid' mints one through the real writer; 'none' names no path; 'other-sim'
 * mints one for a different simulator; 'garbage' writes junk.
 */
function makeSandbox({ rebuild = 'repair', receipt = 'valid' } = {}) {
  // Repo and mutable state in separate directories: the fingerprint hashes untracked files
  // repo-wide, so state inside the repo would move the tree under the gate (INFRA-484).
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'infra657-absent-')));
  const root = path.join(base, 'repo');
  const state = path.join(base, 'state');
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.mkdirSync(state, { recursive: true });
  for (const f of SOURCED) {
    const src = path.join(SCRIPTS, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(root, 'scripts', f));
  }
  fs.mkdirSync(path.join(root, '.maestro'), { recursive: true });
  fs.writeFileSync(path.join(root, '.maestro', 'q9-single-alert.yaml'), 'tags:\n  - safety\n');

  const gated = makeContainer(state, 'gated');
  const fresh = makeContainer(state, 'fresh-rebuild');
  const stubs = fs.mkdtempSync(path.join(os.tmpdir(), 'infra657-stubs-'));
  const pointer = path.join(state, 'container-path');
  const lookups = path.join(state, 'lookups');
  const buildLog = path.join(state, 'build-invocations');
  const receiptPath = path.join(state, 'e2e-gate-receipt.json');
  fs.writeFileSync(pointer, '');
  fs.writeFileSync(lookups, '');
  fs.writeFileSync(buildLog, '');

  const booted = JSON.stringify({
    devices: {
      'com.apple.CoreSimulator.SimRuntime.iOS-18-6': [
        { udid: SIM_A, name: 'iPhone SE (3rd generation)', state: 'Booted' },
      ],
    },
  });
  fs.writeFileSync(path.join(state, 'booted.json'), booted);
  writeStub(
    stubs,
    'xcrun',
    [
      'case "$*" in',
      `  *"simctl list devices booted"*) cat "${path.join(state, 'booted.json')}" ;;`,
      // An empty pointer is an uninstalled app: simctl exits non-zero, exactly as it does.
      `  *"get_app_container"*) echo lookup >> "${lookups}"; p="$(cat "${pointer}")"; [ -n "$p" ] || exit 1; echo "$p" ;;`,
      '  *) exit 0 ;;',
      'esac',
    ].join('\n')
  );
  writeStub(stubs, 'otool', 'echo "\t/usr/lib/libSystem.B.dylib"');
  writeStub(stubs, 'plutil', "echo '[\"tel\",\"sms\"]'");
  writeStub(stubs, 'maestro', 'if [ "$1" = "--version" ]; then echo 2.6.0; else exit 0; fi');
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ maestro: { pinnedVersion: '2.6.0' } }));

  const behaviour = {
    repair: [
      `  printf '%s' "${fresh}" > "${pointer}"`,
      `  node "${root}/scripts/e2e-provenance.js" write "${fresh}" >/dev/null 2>&1`,
    ].join('\n'),
    noop: '  :',
    peer: [
      `  printf '%s' "${fresh}" > "${pointer}"`,
      `  printf '%s' '{"schema":1,"bundleId":"fyi.being.app","repoRoot":"/Users/max/dev/being/debug-650","treeHash":"peer","dirty":false}' > "${fresh}/${MARKER_NAME}"`,
    ].join('\n'),
    fail: '  exit 7',
  }[rebuild];
  writeStub(
    path.join(root, 'scripts'),
    'e2e-sim-build.sh',
    [
      `echo "BUILD inherited=[${'${E2E_LOCK_INHERITED:-}'}]" >> "${buildLog}"`,
      `cd "${root}" || exit 1`,
      behaviour,
      'exit 0',
    ].join('\n')
  );

  git(['init', '-q', '-b', 'main'], root);
  git(['config', 'user.email', 't@example.com'], root);
  git(['config', 'user.name', 'T'], root);
  git(['add', '-A'], root);
  git(['commit', '-qm', 'init'], root);

  // The gate's half, through the REAL writer: a verified install, a receipt, then the
  // peer's uninstall (the pointer emptied). A writer/reader mismatch fails here, not later.
  if (receipt === 'valid' || receipt === 'other-sim') {
    expect(provenance(root, ['write', gated]).status).toBe(0);
    const sim = receipt === 'valid' ? SIM_A : 'BBBB-2222';
    const w = provenance(root, ['receipt', gated, receiptPath, '--sim', sim, '--item', 'INFRA-657', '--gate', '424242']);
    expect(w.status).toBe(0);
  } else if (receipt === 'garbage') {
    fs.writeFileSync(receiptPath, '{not json');
  }

  return { root, state, stubs, fresh, pointer, lookups, buildLog, receiptPath, lockRoot: path.join(state, 'locks') };
}

function runGate(s, { env = {}, named = true } = {}) {
  const res = spawnSync('bash', [path.join(s.root, 'scripts', 'e2e-safety.sh'), 'q9-single-alert'], {
    encoding: 'utf8',
    timeout: 180000,
    cwd: s.root,
    env: {
      ...process.env,
      PATH: `${s.stubs}:${process.env.PATH}`,
      E2E_LOCK_ROOT: s.lockRoot,
      E2E_TELEMETRY_FILE: path.join(s.state, 'telemetry.jsonl'),
      E2E_EVIDENCE_DIR: s.state,
      E2E_LOCK_INHERITED: '',
      E2E_SIM_UDID: '',
      E2E_DEVICE_UDID: '',
      E2E_NO_AUTO_REGATE: '',
      E2E_HOST_SETTLE_MAX_S: '0',
      E2E_GATE_RECEIPT_PATH: named ? s.receiptPath : '',
      ...env,
    },
  });
  return {
    status: res.status,
    output: `${res.stdout || ''}${res.stderr || ''}`,
    builds: fs.readFileSync(s.buildLog, 'utf8').trim().split('\n').filter(Boolean),
  };
}

describe('INFRA-657 — reachability control', () => {
  test('an absent app with no gate receipt keeps exit 2 and the build instruction', () => {
    const s = makeSandbox({ receipt: 'none' });
    const r = runGate(s, { named: false });
    // The control that the absent-app path is what ran: the stub was asked and said no.
    expect(fs.readFileSync(s.lookups, 'utf8')).toMatch(/lookup/);
    expect(r.status).toBe(2);
    expect(r.output).toMatch(/is not installed on simulator .* run 'npm run e2e:safety:build' first/);
    expect(r.builds).toHaveLength(0);
  }, 180000);
});

describe('INFRA-657 — a verified-then-missing app rebuilds once', () => {
  test('exactly one rebuild, logged as contention, then the pre-flight re-attests and runs', () => {
    const s = makeSandbox({ rebuild: 'repair' });
    const r = runGate(s);
    expect(r.builds).toHaveLength(1);
    expect(r.output).toMatch(/CONTENTION/);
    expect(r.output).toMatch(/cause is not observable/);
    expect(r.output).toMatch(/✓ provenance/);
    expect(r.output).toMatch(/e2e:safety summary/);
    // Not the PEER arm: that path names a foreign tree, and here there is none.
    expect(r.output).not.toMatch(/carries a marker from a different tree/);
    expect(fs.readFileSync(s.pointer, 'utf8')).toBe(s.fresh);
  }, 180000);

  test('the rebuild inherits the lease this run already holds', () => {
    const s = makeSandbox({ rebuild: 'repair' });
    const r = runGate(s);
    expect(r.builds[0]).toMatch(new RegExp(`sim:${SIM_A}:\\d+`));
  }, 180000);

  test('with no contended acquire, the banner says the prior holder is not attributable', () => {
    const s = makeSandbox({ rebuild: 'repair' });
    const r = runGate(s);
    expect(r.output).toMatch(/Prior holder: not attributable/);
  }, 180000);

  test('a lease it had to reclaim is named, as correlation', () => {
    const s = makeSandbox({ rebuild: 'repair' });
    const dir = path.join(s.lockRoot, `sim-${SIM_A}.d`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'owner'), `999999\tMon Jan  1 00:00:00 2024\tnode\tDEBUG-650 @ abcd1234\t1\n`);
    const r = runGate(s);
    expect(r.builds).toHaveLength(1);
    expect(r.output).toMatch(/DEBUG-650 @ abcd1234/);
    expect(r.output).toMatch(/correlation, not cause/);
  }, 180000);
});

describe('INFRA-657 — refusals keep today\'s exit 2 and build nothing', () => {
  test.each([
    ['a receipt for another simulator', { receipt: 'other-sim' }, {}, /other-simulator/],
    ['an unreadable receipt', { receipt: 'garbage' }, {}, /unreadable/],
    ['E2E_NO_AUTO_REGATE', { receipt: 'valid' }, { E2E_NO_AUTO_REGATE: '1' }, /E2E_NO_AUTO_REGATE/],
  ])('%s', (_name, opts, env, reason) => {
    const s = makeSandbox(opts);
    const r = runGate(s, { env });
    expect(r.builds).toHaveLength(0);
    expect(r.status).toBe(2);
    expect(r.output).toMatch(/not installed on simulator/);
    expect(r.output).toMatch(reason);
  }, 180000);

  test('a tree that moved after the receipt does not qualify', () => {
    const s = makeSandbox({ receipt: 'valid' });
    fs.writeFileSync(path.join(s.root, 'moved.txt'), 'edited after the gate\n');
    const r = runGate(s);
    expect(r.builds).toHaveLength(0);
    expect(r.status).toBe(2);
    expect(r.output).toMatch(/tree-moved/);
  }, 180000);
});

describe('INFRA-657 — bounded to one rebuild per invocation', () => {
  test('a rebuild that leaves the app missing refuses rather than looping', () => {
    const s = makeSandbox({ rebuild: 'noop' });
    const r = runGate(s);
    expect(r.builds).toHaveLength(1);
    expect(r.status).toBe(2);
  }, 180000);

  test('a rebuild that lands a PEER marker shares the budget and does not build again', () => {
    const s = makeSandbox({ rebuild: 'peer' });
    const r = runGate(s);
    expect(r.builds).toHaveLength(1);
    expect(r.status).toBe(2);
    expect(r.output).toMatch(/Refusing to loop/);
  }, 180000);

  test('a failed rebuild reports the gate\'s exit 2, never the build\'s own code', () => {
    const s = makeSandbox({ rebuild: 'fail' });
    const r = runGate(s);
    expect(r.builds).toHaveLength(1);
    expect(r.status).toBe(2);
    expect(r.output).toMatch(/automatic rebuild FAILED after the gate target went missing/);
  }, 180000);

  test('the suite receipt records the cause', () => {
    const s = makeSandbox({ rebuild: 'repair' });
    const receipt = path.join(s.state, 'suite-receipt.txt');
    runGate(s, { env: { E2E_RECEIPT_PATH: receipt } });
    expect(fs.readFileSync(receipt, 'utf8')).toMatch(/^auto_regate:\s+absent-app$/m);
  }, 180000);
});

describe('INFRA-657 — source shape', () => {
  const strip = (src) => src.replace(/^\s*#.*$/gm, '');
  const code = strip(fs.readFileSync(path.join(SCRIPTS, 'e2e-safety.sh'), 'utf8'));

  test('the arm sits after the flow lease and before the pre-flight, on one shared budget', () => {
    const lease = code.indexOf('e2e_lock_acquire "$SIM_UDID"');
    const arm = code.indexOf('e2e-provenance.js gated');
    const preflight = code.indexOf('elif APP="$(xcrun simctl get_app_container');
    // Positive controls: every anchor still exists, so an ordering assertion cannot pass vacuously.
    expect(lease).toBeGreaterThan(-1);
    expect(arm).toBeGreaterThan(-1);
    expect(preflight).toBeGreaterThan(-1);
    expect(lease).toBeLessThan(arm);
    expect(arm).toBeLessThan(preflight);
    // One initialisation, above the arm: a second one inside the provenance loop would
    // grant absent -> rebuild -> PEER a second rebuild.
    const inits = [...code.matchAll(/^\s*PROVENANCE_REGATED=0\s*$/gm)].map((m) => m.index);
    expect(inits).toHaveLength(1);
    expect(inits[0]).toBeLessThan(arm);
    // Both arms rebuild through the one helper.
    expect(code.match(/e2e_auto_regate_build "/g)).toHaveLength(2);
  });

  test('every helper e2e-safety.sh sources is staged by this sandbox', () => {
    const src = fs.readFileSync(path.join(SCRIPTS, 'e2e-safety.sh'), 'utf8');
    const sourced = [...src.matchAll(/^\s*\.\s+"\$\(dirname "\$0"\)\/([\w.-]+)"/gm)].map((m) => m[1]);
    expect(sourced.length).toBeGreaterThan(0);
    expect(sourced.filter((f) => !SOURCED.includes(f))).toEqual([]);
  });
});
