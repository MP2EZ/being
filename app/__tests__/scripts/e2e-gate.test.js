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
function makeCaller({ npmHook = '', secondCommit = false } = {}) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'infra436-gate-')));
  git(['init', '-q', '-b', 'main'], root);
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
  fs.writeFileSync(
    path.join(stubs, 'xcrun'),
    `#!/bin/sh\necho "xcrun $@" >> "${trace}"\nexit 0\n`,
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
    `#!/bin/sh\necho "npm $@" >> "${trace}"\n${hook}\nexit 0\n`,
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
      E2E_LOCK_ROOT: lockRoot,
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
    // AC4: "must refuse rather than produce a verdict". The provenance step resolves the
    // simulator through `xcrun`, so no xcrun means the run stopped short of a verdict.
    const trace = fs.readFileSync(base.trace, 'utf8');
    expect(trace).toMatch(/e2e:safety:build/);
    expect(trace).not.toMatch(/xcrun/);
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
