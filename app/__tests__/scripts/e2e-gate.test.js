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
 */
function makeCaller() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'infra436-gate-')));
  git(['init', '-q', '-b', 'main'], root);
  git(['config', 'user.email', 't@example.com'], root);
  git(['config', 'user.name', 'T'], root);
  fs.mkdirSync(path.join(root, 'app'));
  fs.writeFileSync(path.join(root, 'app', 'keep.txt'), 'x\n');
  git(['add', '.'], root);
  git(['commit', '-qm', 'first'], root);

  const stubs = fs.mkdtempSync(path.join(os.tmpdir(), 'infra436-gatestubs-'));
  const trace = path.join(stubs, 'trace.log');
  fs.writeFileSync(trace, '');
  for (const cmd of ['npm', 'xcrun']) {
    fs.writeFileSync(
      path.join(stubs, cmd),
      `#!/bin/sh\necho "${cmd} $@" >> "${trace}"\nexit 0\n`,
      { mode: 0o755 }
    );
  }
  return { root, stubs, trace };
}

function runGate({ root, stubs }, args = []) {
  const res = spawnSync('bash', [SCRIPT, ...args], {
    cwd: path.join(root, 'app'),
    encoding: 'utf8',
    env: { ...process.env, PATH: `${stubs}:${process.env.PATH}` },
    timeout: 30000,
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
