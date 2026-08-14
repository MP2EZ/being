/**
 * INFRA-436 — a MISMATCH verdict must name the files responsible.
 *
 * THE PROBLEM
 * ===========
 * `e2e-provenance.js verify` prints one word. On MISMATCH, `e2e-safety.sh` refuses every
 * flow with "the installed binary was not built from the current tree ... Rebuild". That
 * is correct and useless: it does not say WHAT moved, so the operator's only move is to
 * rebuild blind and hope. A cold rebuild in a fresh worktree measured 21m31s, so a blind
 * rebuild is an expensive coin flip.
 *
 * It gets worse under the gate-worktree workflow this item introduces, where the build
 * legitimately happens in a DIFFERENT worktree from the one running the flows. Then a
 * MISMATCH has two completely different causes with the same one-word verdict:
 *   * the two worktrees are at different commits (usually: the item worktree back-merged
 *     `origin/development` and the gate worktree was never moved to the merge commit), or
 *   * the item worktree carries stray uncommitted or untracked files.
 * The second is not hypothetical — `feat-417` was sitting in exactly that state during the
 * INFRA-436 investigation, with three untracked files under `app/src`, and its fingerprint
 * differed from a byte-identical sibling worktree for that reason alone.
 *
 * WHY THE FILES CAN BE NAMED AT ALL, WITHOUT A SCHEMA CHANGE
 * ==========================================================
 * The marker stores a HASH, which cannot be inverted. But the fingerprint is
 * `head + status --porcelain + diff HEAD + untracked contents`, so:
 *   * if the recorded head differs from the current head, `git diff --name-only` between
 *     them names the difference exactly;
 *   * if the heads MATCH and the marker recorded `dirty: false`, then the build tree had an
 *     empty porcelain — so every entry in the CURRENT porcelain is, precisely, the
 *     difference. No stored file list required.
 * A same-head, both-clean mismatch is impossible by construction (empty porcelain implies
 * no untracked entries too, since `--porcelain` reports `??` lines), which is why these two
 * cases are exhaustive for a clean-built marker.
 *
 * `explain` is diagnostic, not a gate: it exits 0 and prints. The refusal decision stays
 * with `verify`, so this can never turn a MISMATCH into a pass.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.resolve(__dirname, '..', '..', 'scripts', 'e2e-provenance.js');

function git(args, cwd) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`);
  return (r.stdout || '').trim();
}

/** A throwaway repo with one commit, plus a "container" directory to hold the marker. */
function makeRepo() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'infra436-explain-')));
  git(['init', '-q', '-b', 'main'], root);
  git(['config', 'user.email', 't@example.com'], root);
  git(['config', 'user.name', 'T'], root);
  fs.writeFileSync(path.join(root, 'a.txt'), 'one\n');
  fs.writeFileSync(path.join(root, 'b.txt'), 'two\n');
  git(['add', '.'], root);
  git(['commit', '-qm', 'first'], root);
  const container = path.join(root, 'container');
  fs.mkdirSync(container);
  return { root, container };
}

/** Write a marker describing the repo's CURRENT state (i.e. a build from right now). */
function writeMarker({ root, container }, overrides = {}) {
  const r = spawnSync('node', [SCRIPT, 'fingerprint'], { cwd: root, encoding: 'utf8' });
  const marker = {
    schema: 1,
    bundleId: 'fyi.being.app',
    repoRoot: root,
    branch: 'main',
    head: git(['rev-parse', 'HEAD'], root),
    treeHash: (r.stdout || '').trim(),
    dirty: false,
    builtAt: '2026-08-14T00:00:00.000Z',
    containerPath: container,
    ...overrides,
  };
  fs.writeFileSync(path.join(container, '.e2e-provenance.json'), JSON.stringify(marker, null, 2));
  return marker;
}

function explain({ root, container }) {
  const r = spawnSync('node', [SCRIPT, 'explain', container], { cwd: root, encoding: 'utf8' });
  return { status: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}

describe('explain names a commit divergence', () => {
  it('names both commits and the files that differ between them', () => {
    const repo = makeRepo();
    writeMarker(repo);
    const before = git(['rev-parse', 'HEAD'], repo.root);

    fs.writeFileSync(path.join(repo.root, 'a.txt'), 'CHANGED\n');
    git(['commit', '-qam', 'second'], repo.root);
    const after = git(['rev-parse', 'HEAD'], repo.root);

    const r = explain(repo);
    expect(r.out).toContain(before.slice(0, 8));
    expect(r.out).toContain(after.slice(0, 8));
    expect(r.out).toContain('a.txt');
    // b.txt did not move; naming it would send the operator after the wrong file.
    expect(r.out).not.toContain('b.txt');
  });
});

describe('explain names working-tree divergence at the same commit', () => {
  it('names an UNTRACKED file — the case that actually bit (feat-417)', () => {
    const repo = makeRepo();
    writeMarker(repo);
    fs.writeFileSync(path.join(repo.root, 'stray.ts'), 'export const x = 1;\n');

    const r = explain(repo);
    expect(r.out).toContain('stray.ts');
  });

  it('names a MODIFIED tracked file', () => {
    const repo = makeRepo();
    writeMarker(repo);
    fs.writeFileSync(path.join(repo.root, 'b.txt'), 'edited\n');

    const r = explain(repo);
    expect(r.out).toContain('b.txt');
  });

  it('names a file inside an untracked DIRECTORY, not just the directory', () => {
    // `git status --porcelain` collapses an untracked directory to a single `?? dir/`
    // entry, which would name a directory the operator then has to go rummage through.
    const repo = makeRepo();
    writeMarker(repo);
    fs.mkdirSync(path.join(repo.root, 'nested'));
    fs.writeFileSync(path.join(repo.root, 'nested', 'deep.ts'), 'export const y = 2;\n');

    const r = explain(repo);
    expect(r.out).toContain('nested/deep.ts');
  });
});

describe('explain refuses to invent an explanation it does not have', () => {
  it('says so when there is no marker at all', () => {
    const repo = makeRepo();
    const r = explain(repo);
    expect(r.out).toMatch(/no .*marker|marker .*(missing|absent)/i);
  });

  it('says so when the marker is unparseable', () => {
    const repo = makeRepo();
    fs.writeFileSync(path.join(repo.container, '.e2e-provenance.json'), '{not json');
    const r = explain(repo);
    expect(r.out).toMatch(/unreadable|unparseable|could not/i);
  });

  it('reports a DIRTY-built marker as unattributable rather than guessing', () => {
    // The recorded tree had a non-empty porcelain, so "our porcelain IS the difference"
    // no longer holds and naming files from it would be a lie.
    const repo = makeRepo();
    writeMarker(repo, { dirty: true, treeHash: 'deadbeef' });
    fs.writeFileSync(path.join(repo.root, 'b.txt'), 'edited\n');

    const r = explain(repo);
    expect(r.out).toMatch(/dirty/i);
  });
});

describe('explain does not manufacture a difference where there is none', () => {
  it('reports a match when the tree has not moved', () => {
    const repo = makeRepo();
    writeMarker(repo);
    const r = explain(repo);
    expect(r.out).toMatch(/match/i);
    expect(r.out).not.toMatch(/a\.txt|b\.txt/);
  });

  it('exits 0 even on mismatch — it is diagnostic, never a second gate', () => {
    // If explain could fail the run it would become a parallel verdict channel, and
    // e2e-verdict.js exists precisely because two disagreeing channels is a bug class.
    const repo = makeRepo();
    writeMarker(repo);
    fs.writeFileSync(path.join(repo.root, 'b.txt'), 'edited\n');
    const r = explain(repo);
    expect(r.status).toBe(0);
  });
});
