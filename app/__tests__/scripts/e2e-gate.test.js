/**
 * INFRA-436 — the gate wrapper's refusals, which are the part that must not be wrong.
 *
 * WHAT THIS COVERS AND WHAT IT DELIBERATELY DOES NOT
 * ==================================================
 * `e2e-gate.sh` is mostly IO: it moves a worktree, maybe runs `npm ci`, and shells out to
 * `e2e-sim-build.sh`. Faking all of that would test the fake. What IS worth pinning is the
 * set of decisions it makes BEFORE spending 21 minutes, plus the one structural rule this
 * subsystem has already been burned by.
 *
 * The build/worktree path itself is left to the real thing — it is exercised end to end
 * every time the gate runs, and a green Maestro run against a MATCH_CLEAN artifact is a
 * stronger signal than any stub could produce.
 *
 * WHY THE DIRTY-CALLER REFUSAL IS THE CENTRAL TEST
 * ================================================
 * The gate worktree checks out a COMMIT, so its tree is clean by construction. If the
 * calling worktree is not byte-identical to that commit, `verify` refuses — but only after
 * a build. Refusing up front converts a ~90 s round trip plus a one-word MISMATCH into an
 * immediate list of files. This is not hypothetical: during the INFRA-436 investigation
 * `feat-417` sat with three untracked files under `app/src`, which was enough to make its
 * fingerprint differ from a byte-identical sibling worktree. The provenance fingerprint
 * hashes untracked CONTENT, so "I only added a scratch file" still breaks the match.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.resolve(__dirname, '..', '..', 'scripts', 'e2e-gate.sh');
const LOCK_HELPER = path.resolve(__dirname, '..', '..', 'scripts', 'e2e-sim-lock.sh');

function git(args, cwd) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return (r.stdout || '').trim();
}

/**
 * A caller worktree with one commit, and a stub dir on PATH. `npm` and `xcrun` are stubbed
 * to append to a trace file, so a test can assert that an expensive step was NEVER reached
 * — "it refused" and "it refused before building" are different claims.
 *
 * `npmHook` (INFRA-463) is shell injected into the `npm` stub, so a test can mutate the
 * shared gate worktree from INSIDE the call the gate is waiting on. That reproduces the
 * reported incident — a peer re-pointing the worktree mid-build — rather than a stand-in
 * for it. `secondCommit` provides the foreign commit such a peer would move to.
 */
const SIM_UDID = '5C81114E-3891-40DD-9E7F-4511389F9C3F';
const SECOND_UDID = '5BAF97CA-1111-2222-3333-444455556666';

/** One booted simulator, named so `e2e_warn_if_not_smallest_viewport` stays quiet. */
function bootedJson(udids) {
  const list = udids.map(u => ({ udid: u, name: 'iPhone SE (3rd generation)', state: 'Booted' }));
  return JSON.stringify({ devices: { 'com.apple.CoreSimulator.SimRuntime.iOS-18-6': list } });
}

function makeCaller({ npmHook = '', secondCommit = false, branch = 'main', booted = [SIM_UDID] } = {}) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'infra436-gate-')));
  git(['init', '-q', '-b', branch], root);
  git(['config', 'user.email', 't@example.com'], root);
  git(['config', 'user.name', 'T'], root);
  fs.mkdirSync(path.join(root, 'app'));
  fs.writeFileSync(path.join(root, 'app', 'keep.txt'), 'x\n');
  git(['add', '.'], root);
  git(['commit', '-qm', 'first'], root);

  // The peer's commit, created FIRST so that HEAD — the commit under gate — stays second.
  let otherSha = null;
  if (secondCommit) {
    otherSha = git(['rev-parse', 'HEAD'], root);
    fs.writeFileSync(path.join(root, 'app', 'keep.txt'), 'second\n');
    git(['commit', '-qam', 'second'], root);
  }

  const stubs = fs.mkdtempSync(path.join(os.tmpdir(), 'infra436-gatestubs-'));
  const trace = path.join(stubs, 'trace.log');
  fs.writeFileSync(trace, '');
  // `simctl list devices booted -j` must return real JSON: since INFRA-472 the gate resolves
  // the device through `e2e_resolve_sim_device` BEFORE it touches the shared worktree, so a
  // stub that answered nothing would abort every spec below at setup while looking like a
  // genuine refusal. `booted` is the knob the ambiguity spec turns.
  fs.writeFileSync(
    path.join(stubs, 'xcrun'),
    `#!/bin/sh
echo "xcrun $@" >> "${trace}"
if [ "$1" = "simctl" ] && [ "$2" = "list" ]; then
  cat <<'JSON'
${bootedJson(booted)}
JSON
  exit 0
fi
exit 0
`,
    { mode: 0o755 }
  );

  // Isolated from /tmp/being-e2e-locks: this machine runs real gate builds, and a test that
  // reclaimed or wedged a live session's lock would be worse than no test.
  const lockRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'infra463-lockroot-'));
  // The parent exists but `gate` itself must not — `git worktree add` refuses a path that
  // is already there.
  const gateParent = fs.mkdtempSync(path.join(os.tmpdir(), 'infra463-gatewt-'));
  const gate = path.join(gateParent, 'gate');
  // The gate links `app/.env.*` to `../../.config/.env.*` and dies if the target does not
  // resolve. Without these the script never reaches the logic under test, and every spec
  // below would go red on setup while looking like a genuine refusal.
  fs.mkdirSync(path.join(gateParent, '.config'));
  for (const env of ['production', 'development']) {
    fs.writeFileSync(path.join(gateParent, '.config', `.env.${env}`), '# fixture\n');
  }

  const ctx = { root, stubs, trace, lockRoot, gate, otherSha };
  // The hook is resolved against the finished context, so it can name `gate`/`otherSha`.
  const hook = typeof npmHook === 'function' ? npmHook(ctx) : npmHook;
  fs.writeFileSync(
    path.join(stubs, 'npm'),
    `#!/bin/sh\nTRACE_FILE="${trace}"\necho "npm $@" >> "$TRACE_FILE"\n${hook}\nexit 0\n`,
    { mode: 0o755 }
  );
  return ctx;
}

/** Mirrors the sanitiser in e2e-gate.sh. If the two ever drift, the lock a test plants
 *  lands on a path the gate never consults — which shows up as the build running when the
 *  test asserted it must not, not as a silent pass. */
function gateLockDir({ lockRoot, gate }) {
  return path.join(lockRoot, `gatetree-${gate.replace(/[^A-Za-z0-9._-]/g, '_')}.d`);
}

/** A genuinely live holder: this jest process, with its real start time from `ps`. No
 *  synthetic pid can be classified LIVE, and a fake one would test the fake. */
function plantLiveLock(caller, label = 'peer-gate-run') {
  const row = spawnSync('/bin/sh', ['-c', `ps -axo pid=,lstart=,comm= | awk '$1 == ${process.pid}'`], {
    encoding: 'utf8',
  }).stdout.trim();
  expect(row).not.toBe('');
  const start = row.split(/\s+/).slice(1, 6).join(' ');
  const dir = gateLockDir(caller);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'owner'), `${process.pid}\t${start}\tjest\t${label}\n`);
  return dir;
}

function runGate({ root, stubs, lockRoot, gate }, args = [], extraEnv = {}) {
  const res = spawnSync('bash', [SCRIPT, ...args], {
    cwd: path.join(root, 'app'),
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${stubs}:${process.env.PATH}`,
      // DEBUG-497: scrub the operator's session pin. The override is now honoured at any
      // device count, so an exported E2E_SIM_UDID naming a real simulator refuses against
      // this sandbox's stubbed devices — and the docs tell operators to export it for a
      // whole session. Same reasoning as e2e-sim-build.test.js's runBuild.
      E2E_SIM_UDID: '',
      E2E_DEVICE_UDID: '',
      E2E_LOCK_ROOT: lockRoot,
      // INFRA-490: sandbox the telemetry log too. Unset, it appends to the SHARED /tmp
      // collection INFRA-491 is read off — and these specs plant live holders on 1s
      // timeouts to prove refusal, so they would write a fabricated contention rate into
      // the one file that decision depends on.
      //
      // Beside lockRoot, NOT inside `root`: `root` is the sandbox WORKTREE, and
      // e2e-gate.sh refuses a dirty one. A log file there makes every gate run refuse
      // and build nothing — the same "never write inside a worktree" rule
      // e2e-telemetry.sh exists to honour, which this harness has to honour too.
      E2E_TELEMETRY_FILE: path.join(lockRoot, '..', path.basename(lockRoot) + '-telemetry.jsonl'),
      E2E_GATE_WORKTREE: gate,
      E2E_LOCK_TIMEOUT: '1',
      ...extraEnv,
    },
    timeout: 60000,
  });
  return { status: res.status, out: `${res.stdout || ''}${res.stderr || ''}` };
}

describe('a dirty calling worktree is refused before anything expensive happens', () => {
  it('names an untracked file and does not start a build', () => {
    const c = makeCaller();
    fs.writeFileSync(path.join(c.root, 'app', 'stray.ts'), 'export const x = 1;\n');

    const r = runGate(c);
    expect(r.status).not.toBe(0);
    expect(r.out).toContain('stray.ts');
    // The claim is "refused BEFORE building", so prove the build was never invoked.
    expect(fs.readFileSync(c.trace, 'utf8')).not.toMatch(/e2e:safety:build/);
  });

  it('names a modified tracked file', () => {
    const c = makeCaller();
    fs.writeFileSync(path.join(c.root, 'app', 'keep.txt'), 'edited\n');

    const r = runGate(c);
    expect(r.status).not.toBe(0);
    expect(r.out).toContain('keep.txt');
  });

  it('does NOT refuse a clean worktree for being dirty', () => {
    // The control that stops the refusal above from passing vacuously: if this fired on a
    // clean tree the gate would be unusable, and every test above would still be green.
    const c = makeCaller();
    const r = runGate(c);
    expect(r.out).not.toMatch(/is not clean/);
  });
});

describe('ref resolution', () => {
  it('refuses a ref that does not resolve to a commit, naming it', () => {
    const c = makeCaller();
    const r = runGate(c, ['no-such-ref']);
    expect(r.status).not.toBe(0);
    expect(r.out).toMatch(/no-such-ref/);
    expect(fs.readFileSync(c.trace, 'utf8')).not.toMatch(/e2e:safety:build/);
  });

  it('warns when the requested ref is not this worktree HEAD', () => {
    // Gating a commit other than HEAD is legal but the provenance check compares against
    // THIS tree, so it will refuse later. Say so before spending the build.
    const c = makeCaller();
    fs.writeFileSync(path.join(c.root, 'app', 'keep.txt'), 'second\n');
    git(['commit', '-qam', 'second'], c.root);
    const first = git(['rev-parse', 'HEAD~1'], c.root);

    const r = runGate(c, [first]);
    expect(r.out).toMatch(/not this worktree's HEAD/i);
  });
});

describe('the build invocation is never piped', () => {
  // CLAUDE.md: a pipeline reports the LAST command's status, so a piped build reports exit
  // 0 on failure — a false green on the one thing that gates safety merges. Asserting on
  // source, so strip comments first (DEBUG-390: this repo names anti-patterns in prose to
  // warn readers off them, and a bare substring match hits the warning instead of the code).
  const source = fs.readFileSync(SCRIPT, 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*#.*$/gm, '');

  it('invokes e2e:safety:build without a pipe', () => {
    const buildLines = code.split('\n').filter(l => l.includes('e2e:safety:build'));
    expect(buildLines.length).toBeGreaterThan(0); // the matcher can still find the call
    for (const line of buildLines) {
      expect(line).not.toMatch(/\|\s*(tee|tail|head|cat|grep)/);
    }
  });

  it('the comment stripper leaves real code behind', () => {
    // A stripper plus a narrow regex is exactly the combination that can silently match
    // nothing at all, so prove the stripped source is still substantive.
    expect(code).toMatch(/npm run e2e:safety:build/);
    expect(code.length).toBeGreaterThan(500);
  });
});

/**
 * INFRA-463 — the shared gate worktree has no per-session ownership.
 *
 * THE DEFECT. INFRA-436 traded N cold builds for one warm shared worktree at
 * `~/dev/being/e2e-gate`. The saving is real and is kept. What it did not add is ownership:
 * any session may `git -C e2e-gate checkout` at any moment, including between another
 * session's checkout and that session's build. Observed 2026-08-16 with ten worktrees live —
 * a gate build compiled a peer's FEAT-433 tree and died on an import that exists on no
 * branch of the caller. It failed loudly only because that tree happened not to compile. Had
 * it compiled, the gate would have produced a confident verdict about the wrong binary.
 *
 * WHY THE LOCK IS HELD OVER THE BUILD SPAN ONLY. `e2e-safety.sh` re-reads the provenance
 * marker inside the INSTALLED CONTAINER (`$APP/<marker>`), never the gate worktree, so the
 * worktree is an input to `e2e-gate.sh` and to nothing else. Its whole contention window
 * therefore sits inside one live process and can be anchored to that process's pid — no TTL,
 * which is the objection `e2e-sim-lock.sh` raises against a lock spanning build -> flows.
 * The post-build span is already INFRA-434's (marker re-check, exit 3).
 *
 * WHY THE ASSERTIONS ARE NOT REDUNDANT WITH THE LOCK. A hand-run `git -C e2e-gate checkout`
 * takes no lock at all. The lock stops tool-driven interleaving; re-reading HEAD catches
 * everything else, including a human.
 */

describe('INFRA-463: a peer holding the gate worktree', () => {
  it('refuses, names the holder, and never starts a build', () => {
    const c = makeCaller();
    plantLiveLock(c);

    const r = runGate(c);

    expect(r.status).not.toBe(0);
    expect(r.out).toContain(String(process.pid));
    // The load-bearing assertion. If the lock silently failed to block, the run would carry
    // on and reach the build — so this is what stops the spec passing for the wrong reason
    // (it would otherwise still exit non-zero, on the stubbed simulator lookup).
    expect(fs.readFileSync(c.trace, 'utf8')).not.toMatch(/e2e:safety:build/);
  });

  it('tells the blocked session what to do instead of waiting', () => {
    // AC3. A refusal with no way forward just moves the stall. The cold per-worktree build
    // is correct and available, and is what unblocked the original investigation.
    const c = makeCaller();
    plantLiveLock(c);

    const r = runGate(c);
    expect(r.out).toMatch(/e2e:safety:build/);
    expect(r.out).toMatch(/own worktree/i);
  });

  it('does NOT refuse when the lock is free', () => {
    // The control for both specs above: with no holder planted, the identical call must get
    // past the lock and reach the build. Without this, a gate that refused unconditionally
    // — or one whose lock key never matched — would keep them green.
    const c = makeCaller();

    const r = runGate(c);
    expect(r.out).not.toMatch(/held by pid/i);
    expect(fs.readFileSync(c.trace, 'utf8')).toMatch(/e2e:safety:build/);
  });

  it('releases the lock on exit, so a queue of closes does not wedge', () => {
    // Serialising builds is the accepted cost; serialising them PERMANENTLY is not. A
    // second run against the same gate path must still get through.
    const c = makeCaller();

    runGate(c);
    expect(fs.existsSync(gateLockDir(c))).toBe(false);

    fs.writeFileSync(c.trace, '');
    runGate(c);
    expect(fs.readFileSync(c.trace, 'utf8')).toMatch(/e2e:safety:build/);
  });
});

describe('INFRA-463: the gate worktree moving under a run', () => {
  it('refuses BEFORE compiling when a peer re-points it during dependency install', () => {
    // AC1's "fails fast, before compiling". The peer moves the worktree from inside
    // `npm ci`, which the gate runs before the build.
    const c = makeCaller({
      secondCommit: true,
      npmHook: ({ gate, otherSha }) =>
        `if [ "$1" = "ci" ]; then git -C "${gate}" checkout --detach ${otherSha} >/dev/null 2>&1; fi`,
    });

    const asked = git(['rev-parse', 'HEAD'], c.root);
    const r = runGate(c);

    expect(r.status).not.toBe(0);
    // Both commits named — the operator cannot act on "they differ".
    expect(r.out).toContain(asked.slice(0, 8));
    expect(r.out).toContain(c.otherSha.slice(0, 8));
    // ...and the cause named, rather than a rebuild suggested.
    expect(r.out).toMatch(/concurrent|another session/i);
    expect(fs.readFileSync(c.trace, 'utf8')).not.toMatch(/e2e:safety:build/);
  });

  it('refuses before producing a verdict when a peer re-points it during the build', () => {
    // The dangerous window: 90 s warm, 21 min cold. Today this surfaces only afterwards, as
    // a provenance MISMATCH whose message points at rebuilding rather than at the peer.
    const base = makeCaller({
      secondCommit: true,
      npmHook: ({ gate, otherSha }) =>
        `if [ "$2" = "e2e:safety:build" ]; then git -C "${gate}" checkout --detach ${otherSha} >/dev/null 2>&1; fi`,
    });

    const asked = git(['rev-parse', 'HEAD'], base.root);
    const r = runGate(base);

    expect(r.status).not.toBe(0);
    expect(r.out).toContain(asked.slice(0, 8));
    expect(r.out).toContain(base.otherSha.slice(0, 8));
    expect(r.out).toMatch(/concurrent|another session/i);
    // AC4: "must refuse rather than produce a verdict". The proxy is the container lookup the
    // provenance step performs, NOT `xcrun` in general — since INFRA-472 the gate also calls
    // `xcrun simctl list` up front to resolve the device it leases, so a bare /xcrun/ is now
    // in the trace on every run and would make this assertion unfalsifiable.
    const trace = fs.readFileSync(base.trace, 'utf8');
    expect(trace).toMatch(/e2e:safety:build/);
    expect(trace).toMatch(/simctl list/); // the matcher can still see xcrun calls at all
    expect(trace).not.toMatch(/get_app_container/);
  });

  it('does NOT refuse when the worktree stays put', () => {
    // Control: the same shape with no peer must reach the provenance step. Without it, a
    // gate that always refused would satisfy both specs above.
    const c = makeCaller({ secondCommit: true });

    const r = runGate(c);
    expect(r.out).not.toMatch(/not at the commit/i);
    expect(fs.readFileSync(c.trace, 'utf8')).toMatch(/xcrun/);
  });
});

/**
 * INFRA-472 — the lease covered the worktree but not the device, and it was taken too late.
 *
 * WHY THE WORKTREE ALONE IS NOT THE LEASABLE UNIT. The provenance marker lives inside the
 * INSTALLED CONTAINER on a simulator, and `simctl install` of the same bundle id replaces it.
 * Two sessions building in separate worktrees but installing to one device therefore still
 * clobber each other, with the worktree lease held and satisfied throughout. CLAUDE.md
 * already records that two worktrees routinely share one simulator.
 *
 * WHY THE ORDER OF OPERATIONS IS PART OF THE FIX. INFRA-436's simulator lock is taken inside
 * `e2e-sim-build.sh` — i.e. AFTER this script has already re-pointed the shared worktree and
 * run `npm ci`. So a device collision was discovered late, having already taken the worktree
 * away from a peer, and then blocked on it for up to E2E_LOCK_TIMEOUT. Resolving the device
 * and taking BOTH leases up front is what turns that into an immediate refusal that has
 * mutated nothing.
 *
 * WHY EXIT 4. `e2e-safety.sh` already spends 0 pass / 1 flow regression / 2 harness could not
 * complete / 3 target replaced (INFRA-434). "A peer owns the gate slot" is none of those, and
 * an operator — or `/b-close` — must be able to tell "your change broke a safety flow" from
 * "come back in ninety seconds" without reading prose.
 */

/** Mirrors e2e-sim-lock.sh's owner-record layout. Planted with THIS jest process as holder:
 *  no synthetic pid can classify LIVE, and a fake one would test the fake. */
function plantLiveLockAt(lockRoot, ns, key, label) {
  const row = spawnSync('/bin/sh', ['-c', `ps -axo pid=,lstart=,comm= | awk '$1 == ${process.pid}'`], {
    encoding: 'utf8',
  }).stdout.trim();
  expect(row).not.toBe('');
  const start = row.split(/\s+/).slice(1, 6).join(' ');
  const dir = path.join(lockRoot, `${ns}-${key}.d`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'owner'),
    `${process.pid}\t${start}\tjest\t${label}\t${Math.floor(Date.now() / 1000)}\n`
  );
  return dir;
}

const LEASE_EXIT = 4;

describe('INFRA-472: the lease covers the worktree and the simulator together', () => {
  it('refuses on the simulator even though the gate worktree is free', () => {
    const c = makeCaller();
    plantLiveLockAt(c.lockRoot, 'sim', SIM_UDID, 'peer-flows');

    const r = runGate(c);

    expect(r.status).toBe(LEASE_EXIT);
    expect(r.out).toMatch(/peer-flows|simulator/i);
    // The load-bearing half: refusing is not enough if it refused AFTER re-pointing the
    // shared worktree, which is the thing that voids a peer's in-flight run.
    expect(fs.existsSync(c.gate)).toBe(false);
    expect(fs.readFileSync(c.trace, 'utf8')).not.toMatch(/e2e:safety:build/);
  });

  it('refuses on the gate worktree with the same code, not a flow-regression code', () => {
    // Exit 1 is what `e2e-safety.sh` returns for "a safety flow went red". A lease refusal
    // reporting 1 is a contention event wearing a regression's clothes.
    const c = makeCaller();
    plantLiveLockAt(c.lockRoot, 'gatetree', c.gate.replace(/[^A-Za-z0-9._-]/g, '_'), 'peer-gate');

    const r = runGate(c);

    expect(r.status).toBe(LEASE_EXIT);
    expect(r.out).toContain('peer-gate');
    expect(fs.readFileSync(c.trace, 'utf8')).not.toMatch(/e2e:safety:build/);
  });

  it('leaves no half-held lease behind when the second resource is taken', () => {
    // The rollback, observed from the gate rather than the helper. A leaked gatetree lease
    // would be held by a pid that has since exited — reclaimable, but only after the next
    // session waits out its classifier — and a leaked one from a LIVE pid wedges the gate.
    const c = makeCaller();
    plantLiveLockAt(c.lockRoot, 'sim', SIM_UDID, 'peer-flows');

    runGate(c);

    expect(fs.existsSync(gateLockDir(c))).toBe(false);
  });

  it('does NOT refuse when neither resource is held', () => {
    // The control for all three refusals above. Without it a gate that refused
    // unconditionally — or one whose lock keys never matched the planted ones — stays green.
    const c = makeCaller();

    const r = runGate(c);

    expect(r.status).not.toBe(LEASE_EXIT);
    expect(fs.readFileSync(c.trace, 'utf8')).toMatch(/e2e:safety:build/);
  });
});

describe('INFRA-472: the device is resolved before the shared worktree is touched', () => {
  it('refuses two booted simulators without having re-pointed anything', () => {
    // AC4: `e2e_resolve_sim_device`'s 2+ refusal must still fire. It is the mechanical
    // guarantee that `simctl` cannot silently pick an unnamed device, and moving the gate to
    // a lease must not quietly replace it with lease discipline.
    const c = makeCaller({ booted: [SIM_UDID, SECOND_UDID] });

    const r = runGate(c);

    expect(r.status).not.toBe(0);
    expect(r.out).toMatch(/2 simulators booted|ambiguous/i);
    expect(fs.existsSync(c.gate)).toBe(false);
    expect(fs.readFileSync(c.trace, 'utf8')).not.toMatch(/e2e:safety:build/);
  });

  it('does not hand the child build an E2E_SIM_UDID override', () => {
    // Also AC4. Resolving once and threading the UDID down would look like INFRA-405's
    // "resolve once, thread it through" — but exported into the child it SUPPRESSES the 2+
    // refusal above, so a simulator booted mid-run would be silently tolerated by the very
    // check that exists to catch it. The child re-resolves; the shared lease is what stops
    // it deadlocking, not a pre-answered device.
    const c = makeCaller({
      npmHook: `echo "CHILD_SIM_UDID=[\${E2E_SIM_UDID:-}]" >> "$TRACE_FILE"`,
    });

    runGate(c);

    expect(fs.readFileSync(c.trace, 'utf8')).toContain('CHILD_SIM_UDID=[]');
  });

  it('hands the child its inherited lease, so the build does not deadlock on its parent', () => {
    // The self-deadlock this creates if left unhandled: the gate now holds the simulator
    // lease across the build, and `e2e-sim-build.sh` acquires the same one. Without
    // inheritance the child waits out the full timeout on a lease its own parent holds.
    const c = makeCaller({
      npmHook: ({ }) =>
        `if [ "$2" = "e2e:safety:build" ]; then\n` +
        `  . "${LOCK_HELPER}"\n` +
        `  if e2e_lock_acquire "${SIM_UDID}" 5 child-build; then echo CHILD_ACQUIRED_OK >> "$TRACE_FILE";` +
        ` else echo CHILD_BLOCKED >> "$TRACE_FILE"; fi\n` +
        `fi`,
    });

    runGate(c);

    const trace = fs.readFileSync(c.trace, 'utf8');
    expect(trace).toContain('CHILD_ACQUIRED_OK');
    expect(trace).not.toContain('CHILD_BLOCKED');
  });

  it('a child NOT in the lineage is still blocked by the same lease', () => {
    // The control that stops inheritance from becoming "locking is off inside the gate".
    // Same call, same lease, but the token does not name the holder — it must contend.
    const c = makeCaller({
      npmHook: `if [ "$2" = "e2e:safety:build" ]; then
  . "${LOCK_HELPER}"
  if E2E_LOCK_INHERITED="sim:${SIM_UDID}:999001" e2e_lock_acquire "${SIM_UDID}" 1 outsider 2>/dev/null; then
    echo OUTSIDER_ACQUIRED >> "$TRACE_FILE"
  else
    echo OUTSIDER_BLOCKED >> "$TRACE_FILE"
  fi
fi`,
    });

    runGate(c);

    const trace = fs.readFileSync(c.trace, 'utf8');
    expect(trace).toContain('OUTSIDER_BLOCKED');
  });
});

describe('INFRA-472: a refusal names who to go and ask', () => {
  it("carries the caller's work item into the lease label", () => {
    // AC1. `pid 48213 (bash)` identifies a process; it does not tell the blocked session
    // which item is being closed, which is the only fact that lets them judge how long to
    // wait or whom to ask.
    const c = makeCaller({
      branch: 'chore/INFRA-472-gate-worktree-lease',
      npmHook: ctx => `cat "${gateLockDir(ctx)}/owner" >> "$TRACE_FILE" 2>/dev/null || true`,
    });

    runGate(c);

    expect(fs.readFileSync(c.trace, 'utf8')).toContain('INFRA-472');
  });

  it('reports the lease exit code in its own message', () => {
    const c = makeCaller();
    plantLiveLockAt(c.lockRoot, 'sim', SIM_UDID, 'peer-flows');

    const r = runGate(c);
    expect(r.out).toMatch(/exit 4/);
  });
});
