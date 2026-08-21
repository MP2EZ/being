/**
 * INFRA-484 — a MISMATCH must say WHOSE build is on the device.
 *
 * WHY THIS SUBCOMMAND EXISTS
 * ==========================
 * `verify` prints one word and `explain` prints prose for a human. Neither is a decision
 * a script can branch on, and the decision INFRA-484 needs is narrow and mechanical:
 * may this run rebuild ITSELF, unattended, while holding the simulator lease?
 *
 * The answer turns entirely on attribution, because the two causes of a MISMATCH want
 * opposite handling:
 *
 *   * a PEER's build landed on our target — nobody chose this, the operator's tree is
 *     exactly as they left it, and the only recovery is to rebuild. Automating it costs
 *     a build and saves a human round-trip.
 *   * OUR OWN tree moved since the build — the operator edited or committed something.
 *     Rebuilding is still the fix, but it is THEIR call: an unattended rebuild here would
 *     silently spend up to 21m31s reacting to a keystroke, and would train the operator
 *     to stop reading the one message that tells them their tree and their binary have
 *     diverged.
 *
 * `attribute` therefore reports SELF / PEER / NONE and nothing else. It is diagnostic in
 * the same sense `explain` is — it always exits 0, so it can never turn a refusal into a
 * pass. Only `verify` refuses.
 *
 * NONE IS NOT A THIRD KIND OF PEER
 * ================================
 * A missing, unreadable or unparseable marker carries no repoRoot, so there is nobody to
 * attribute it to. INFRA-434 already settled the same question for its mid-suite watch and
 * chose to refuse without attribution rather than invent one; this follows that ruling.
 * The practical consequence is deliberate: a markerless container (a `npm run ios` Debug
 * install, an interrupted build) never triggers an automatic rebuild.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.resolve(__dirname, '..', '..', 'scripts', 'e2e-provenance.js');
const MARKER_NAME = '.e2e-provenance.json';
const BUNDLE_ID = 'fyi.being.app';

function git(args, cwd) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`);
  return (r.stdout || '').trim();
}

/** A throwaway repo plus a "container" directory to hold the marker. */
function makeRepo(prefix = 'infra484-attr-') {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
  git(['init', '-q', '-b', 'main'], root);
  git(['config', 'user.email', 't@example.com'], root);
  git(['config', 'user.name', 'T'], root);
  fs.writeFileSync(path.join(root, 'a.txt'), 'one\n');
  git(['add', '.'], root);
  git(['commit', '-qm', 'init'], root);
  const container = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}container-`));
  return { root, container };
}

function writeMarker(container, fields) {
  fs.writeFileSync(
    path.join(container, MARKER_NAME),
    `${JSON.stringify(
      {
        schema: 1,
        bundleId: BUNDLE_ID,
        repoRoot: '/somewhere',
        branch: 'main',
        head: 'a'.repeat(40),
        treeHash: 'deadbeef',
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

function attribute(container, cwd) {
  const r = spawnSync('node', [SCRIPT, 'attribute', container], { cwd, encoding: 'utf8' });
  return { status: r.status, out: (r.stdout || '').trim(), err: r.stderr || '' };
}

describe('INFRA-484 — `attribute` names whose build is installed', () => {
  test('a marker built in ANOTHER repo root reports PEER, and names it', () => {
    const { root, container } = makeRepo();
    writeMarker(container, { repoRoot: '/Users/max/dev/being/feat-999', branch: 'feat/FEAT-999' });

    const r = attribute(container, root);
    expect(r.out).toMatch(/^PEER\b/);
    // The path is the whole point: an operator reading this needs to know which worktree
    // to go and look at, and /b-close needs it for the message it prints while rebuilding.
    expect(r.out).toContain('/Users/max/dev/being/feat-999');
  });

  test('a marker built in THIS repo root reports SELF even though the tree has moved', () => {
    const { root, container } = makeRepo();
    // Same repoRoot, deliberately stale treeHash: this is precisely the "you edited
    // something" case, which verify() calls MISMATCH and which must NOT auto-rebuild.
    writeMarker(container, { repoRoot: root, treeHash: 'stale-hash-not-current' });

    const r = attribute(container, root);
    expect(r.out).toBe('SELF');
  });

  test('no marker reports NONE — absence of evidence is not a peer', () => {
    const { root, container } = makeRepo();
    const r = attribute(container, root);
    expect(r.out).toBe('NONE');
  });

  test('an unparseable marker reports NONE rather than guessing', () => {
    const { root, container } = makeRepo();
    fs.writeFileSync(path.join(container, MARKER_NAME), '{ not json');
    const r = attribute(container, root);
    expect(r.out).toBe('NONE');
  });

  test('a marker with no repoRoot reports NONE — there is nobody to blame', () => {
    const { root, container } = makeRepo();
    writeMarker(container, { repoRoot: undefined });
    const r = attribute(container, root);
    expect(r.out).toBe('NONE');
  });

  test('it always exits 0 — a diagnostic can never soften or harden a gate', () => {
    const { root, container } = makeRepo();
    for (const fields of [
      { repoRoot: '/elsewhere' },
      { repoRoot: root },
      null, // no marker at all
    ]) {
      if (fields) writeMarker(container, fields);
      else fs.rmSync(path.join(container, MARKER_NAME), { force: true });
      expect(attribute(container, root).status).toBe(0);
    }
  });

  test('a container path that does not exist reports NONE, not a crash', () => {
    const { root } = makeRepo();
    const r = attribute(path.join(root, 'no-such-container'), root);
    expect(r.status).toBe(0);
    expect(r.out).toBe('NONE');
  });
});
