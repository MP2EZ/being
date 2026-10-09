/**
 * DEBUG-640 instance 3 — `head` / `repoRoot` are TREE identifiers, read as an owner.
 *
 * THE OBSERVED FAILURE
 * ====================
 * A booted iPhone 16 Pro carried a marker reading `repoRoot /Users/max/dev/being/e2e-gate`,
 * `head 40dc2905`. That SHA belonged to a peer, so the device was attributed to them. It
 * was not theirs: `e2e-gate` is the SHARED gate worktree, so ANY session running
 * `e2e:safety:gate` builds that tree and inherits that head. Disconfirming evidence sat
 * unread in the same marker — its own `containerPath` named a third device, and `builtAt`
 * was ~30 minutes after the attributed session had left the host.
 *
 * `head` answers "which tree is this binary from", which is exactly its job as merge
 * evidence, and is ownership-blind BY CONSTRUCTION in a shared worktree.
 *
 * WHAT FIXES IT, AND WHY IT IS A UUID RATHER THAN SOMETHING MEANINGFUL
 * ===================================================================
 * The planning panel split on whether an "owner" is buildable at all: nothing on this
 * machine is per-session, survives the build process, and is human-actionable minutes
 * later (`e2e-sim-lock.sh`'s own header explains at length why no identity spans
 * build -> flows). The resolution is narrower than "who is this person": a per-BUILD
 * `crypto.randomUUID()` makes "is this MY build?" exactly answerable, which is the
 * question instance 3 actually got wrong. Two builds of the same shared worktree at the
 * same head produce the same treeHash, the same repoRoot, the same branch — and
 * DIFFERENT ownerIds. That single property is the whole fix.
 *
 * THE TWO THINGS THAT MUST NOT MOVE
 * =================================
 * INFRA-434 compares the marker's FULL BYTES before every flow. So the owner may be
 * written exactly once, at build time, and never touched by verify/explain/attribute —
 * otherwise the suite reports `replaced` against its own binary and VOIDs every completed
 * flow. The tempting "fix" for that is to narrow the watch from bytes to selected fields,
 * which destroys the content-addressing that makes it work; the byte-stability test below
 * exists so that pressure never arises.
 *
 * INFRA-384's `fingerprint()` hashes the WORKING TREE. The marker lives inside the
 * simulator container, outside every worktree, so it cannot perturb the hash — but only
 * as long as the owner value is not sourced from a file dropped in the repo. Both the
 * structural and behavioural halves of that are pinned here.
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

function run(args, cwd) {
  const r = spawnSync('node', [SCRIPT, ...args], { cwd, encoding: 'utf8' });
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

/**
 * The container is created OUTSIDE the repo, deliberately.
 *
 * `fingerprint()` hashes untracked file contents repo-wide, so a container nested inside
 * the working tree would make writing the marker change the very hash the marker records —
 * every `verify` would then read MISMATCH against a tree nothing had touched. That is not
 * a quirk of the test: it is the INFRA-384 property these suites exist to protect, and the
 * real marker lives in the simulator container, outside every worktree, for the same
 * reason. Nesting it here would quietly test the opposite of production.
 */
function makeRepo(tag) {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `debug640-${tag}-`)));
  const root = path.join(base, 'repo');
  const container = path.join(base, 'container');
  fs.mkdirSync(root);
  fs.mkdirSync(container);
  git(['init', '-q', '-b', 'main'], root);
  git(['config', 'user.email', 't@example.com'], root);
  git(['config', 'user.name', 'T'], root);
  fs.writeFileSync(path.join(root, 'a.txt'), 'one\n');
  git(['add', '.'], root);
  git(['commit', '-qm', 'first'], root);
  return { root, container };
}

const markerFile = (container) => path.join(container, '.e2e-provenance.json');
const readMarker = (container) => JSON.parse(fs.readFileSync(markerFile(container), 'utf8'));

/** A legacy marker: schema 1, no owner keys at all — what is installed in the field today. */
function writeLegacyMarker({ root, container }, overrides = {}) {
  const treeHash = run(['fingerprint'], root).stdout.trim();
  const marker = {
    schema: 1,
    bundleId: 'fyi.being.app',
    repoRoot: root,
    branch: 'main',
    head: git(['rev-parse', 'HEAD'], root),
    treeHash,
    dirty: false,
    builtAt: '2026-08-14T00:00:00.000Z',
    containerPath: container,
    ...overrides,
  };
  fs.writeFileSync(markerFile(container), `${JSON.stringify(marker, null, 2)}\n`);
  return marker;
}

// ---------------------------------------------------------------------------
// AC2 — the owner field
// ---------------------------------------------------------------------------

describe('DEBUG-640 AC2 — the marker carries an owner distinct from the tree identifiers', () => {
  test('THE ANTI-REGRESSION PIN: two builds of ONE tree at ONE head differ only by owner', () => {
    // This is instance 3 reproduced as a unit. Before the fix these two markers were
    // byte-identical apart from `builtAt`, which is why a peer's build read as ours.
    const repo = makeRepo('same-tree');

    expect(run(['write', repo.container], repo.root).code).toBe(0);
    const first = readMarker(repo.container);

    expect(run(['write', repo.container], repo.root).code).toBe(0);
    const second = readMarker(repo.container);

    // Tree identity is unchanged — that is the whole point, and why head cannot answer.
    expect(second.treeHash).toBe(first.treeHash);
    expect(second.head).toBe(first.head);
    expect(second.repoRoot).toBe(first.repoRoot);
    expect(second.branch).toBe(first.branch);

    // Ownership is not.
    expect(typeof first.ownerId).toBe('string');
    expect(first.ownerId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(second.ownerId).not.toBe(first.ownerId);
  });

  test('the owner block records host, user and build pid alongside the id', () => {
    const repo = makeRepo('fields');
    run(['write', repo.container], repo.root);
    const m = readMarker(repo.container);

    expect(m.ownerHost).toBe(os.hostname());
    expect(m.ownerUser).toBe(os.userInfo().username);
    expect(typeof m.ownerPid).toBe('number');
    // Self-declared and unverified; null when unset rather than absent, so a reader can
    // tell "no session id was offered" from "this key is from a newer schema".
    expect(m).toHaveProperty('ownerSession');
  });

  test('SCHEMA stays at 1 — a bump would map every installed marker to MISSING', () => {
    // Not stylistic. `verify` maps an unknown schema to MISSING (refuse), so bumping
    // invalidates every binary already installed on every simulator on this machine,
    // each costing an 11-14 min post-regen or 21m31s cold rebuild, for zero safety gain.
    expect(require(SCRIPT).SCHEMA).toBe(1);
    const repo = makeRepo('schema');
    run(['write', repo.container], repo.root);
    expect(readMarker(repo.container).schema).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// The owner must never become a second refusal channel
// ---------------------------------------------------------------------------

describe('DEBUG-640 — verify() and attribute() are unchanged by the owner', () => {
  test('a FOREIGN ownerId with a matching treeHash still verifies MATCH_CLEAN', () => {
    // The owner is diagnostic. If it ever gated the verdict it would become a second
    // channel that can disagree with the first, which is the bug class e2e-verdict.js
    // exists to prevent.
    const repo = makeRepo('foreign-owner');
    run(['write', repo.container], repo.root);
    const m = readMarker(repo.container);
    m.ownerId = '00000000-0000-4000-8000-000000000000';
    fs.writeFileSync(markerFile(repo.container), `${JSON.stringify(m, null, 2)}\n`);

    const r = run(['verify', repo.container], repo.root);
    expect(r.stdout.trim()).toBe('MATCH_CLEAN');
    expect(r.code).toBe(0);
  });

  test('a LEGACY owner-less marker still verifies MATCH_CLEAN', () => {
    // Backward compatibility is the reason SCHEMA does not move. Every marker in the
    // field right now has no owner keys.
    const repo = makeRepo('legacy-verify');
    writeLegacyMarker(repo);
    const r = run(['verify', repo.container], repo.root);
    expect(r.stdout.trim()).toBe('MATCH_CLEAN');
    expect(r.code).toBe(0);
  });

  test('a dirty-built marker is still MATCH_DIRTY, and E2E_REQUIRE_CLEAN_PROVENANCE still has something to refuse', () => {
    const repo = makeRepo('dirty');
    fs.writeFileSync(path.join(repo.root, 'a.txt'), 'changed\n');
    run(['write', repo.container], repo.root);
    expect(readMarker(repo.container).dirty).toBe(true);
    expect(run(['verify', repo.container], repo.root).stdout.trim()).toBe('MATCH_DIRTY');
  });

  test('attribute() still prints SELF for a differing ownerId at the same repoRoot', () => {
    // INFRA-484 routes its automatic single re-gate on this token. If the owner became
    // the predicate, your own previous build would read PEER on every self-edit and
    // convert a keystroke into a rebuild of up to 21m31s — the inversion INFRA-484
    // explicitly refused.
    const repo = makeRepo('attrib');
    run(['write', repo.container], repo.root);
    const m = readMarker(repo.container);
    m.ownerId = '11111111-1111-4111-8111-111111111111';
    fs.writeFileSync(markerFile(repo.container), `${JSON.stringify(m, null, 2)}\n`);

    const r = run(['attribute', repo.container], repo.root);
    expect(r.stdout.trim()).toBe('SELF');
    expect(r.code).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// INFRA-434 — the marker's bytes are the watch
// ---------------------------------------------------------------------------

describe('DEBUG-640 — INFRA-434 byte stability', () => {
  test('repeated verify/explain/attribute leave the marker byte-identical', () => {
    // e2e-safety.sh snapshots these bytes after the pre-flight verdict and re-reads them
    // before every flow; any drift is reported as `replaced`, exits 3 and relabels every
    // completed flow VOID. A diagnostic that rewrote the marker would fire that against
    // our own binary.
    const repo = makeRepo('bytes');
    run(['write', repo.container], repo.root);
    const before = fs.readFileSync(markerFile(repo.container));

    for (let i = 0; i < 3; i += 1) {
      run(['verify', repo.container], repo.root);
      run(['explain', repo.container], repo.root);
      run(['attribute', repo.container], repo.root);
    }

    expect(fs.readFileSync(markerFile(repo.container)).equals(before)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// INFRA-384 — the owner must not reach the tree hash
// ---------------------------------------------------------------------------

describe('DEBUG-640 — INFRA-384 fingerprint isolation', () => {
  test('behavioural: a clean build writes dirty:false and verifies MATCH_CLEAN', () => {
    const repo = makeRepo('fp-clean');
    expect(git(['status', '--porcelain'], repo.root)).toBe('');
    run(['write', repo.container], repo.root);
    expect(readMarker(repo.container).dirty).toBe(false);
    expect(run(['verify', repo.container], repo.root).stdout.trim()).toBe('MATCH_CLEAN');
  });

  test('structural: fingerprint() references no owner token', () => {
    const src = stripJsComments(fs.readFileSync(SCRIPT, 'utf8'));
    const slice = sliceFunction(src, 'fingerprint');

    // MATCHER INTEGRITY (DEBUG-390): prove the slice is real and that this matcher can
    // still fire, by running it against the same slice with an owner line spliced in.
    expect(slice.length).toBeGreaterThan(200);
    expect(slice).toMatch(/treeHash/);
    const mutated = slice.replace(/treeHash/, "h.update(String(marker.ownerId)); const treeHash");
    expect(mutated).toMatch(/ownerId/);

    expect(slice).not.toMatch(/owner/i);
  });
});

// ---------------------------------------------------------------------------
// AC2 — explain() surfaces it, and says what it cannot establish
// ---------------------------------------------------------------------------

describe('DEBUG-640 AC2 — explain() reports the owner and disclaims the tree identifiers', () => {
  test('prints the owner on the MATCH path, not only after a mismatch', () => {
    // Instance 3's misreading happened with NO mismatch in play — a human read repoRoot
    // and head off a marker on a booted device. Printing the owner only on the failure
    // path would correct the surface nobody was looking at.
    const repo = makeRepo('explain-match');
    run(['write', repo.container], repo.root);
    const id = readMarker(repo.container).ownerId;

    const r = run(['explain', repo.container], repo.root);
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/MATCHES/);
    expect(r.stdout).toContain(id);
  });

  test('prints the owner on the MISMATCH path too', () => {
    const repo = makeRepo('explain-mismatch');
    run(['write', repo.container], repo.root);
    const id = readMarker(repo.container).ownerId;
    fs.writeFileSync(path.join(repo.root, 'a.txt'), 'moved\n');

    const r = run(['explain', repo.container], repo.root);
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/MISMATCH/);
    expect(r.stdout).toContain(id);
  });

  test('a legacy marker reports "no owner recorded" and does NOT fall back to head/repoRoot', () => {
    // The fallback is the defect. Markers with no owner are exactly the ones in the field
    // where instance 3 happened, so this is the case that must not silently re-offer a
    // tree identifier as an actor.
    const repo = makeRepo('explain-legacy');
    writeLegacyMarker(repo);
    const r = run(['explain', repo.container], repo.root);
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/no owner recorded/i);
  });

  test('names e2e-gate as the shared worktree that makes head/repoRoot ambiguous', () => {
    const repo = makeRepo('explain-caveat');
    run(['write', repo.container], repo.root);
    const r = run(['explain', repo.container], repo.root);
    expect(r.stdout).toMatch(/e2e-gate/);
    expect(r.stdout).toMatch(/cannot establish ownership|not an owner|does not identify/i);
  });

  test('flags a recorded containerPath that differs from the one being read', () => {
    // The disconfirming evidence that went unread during instance 3: the marker's own
    // containerPath named a different device than the one it was found on.
    const repo = makeRepo('explain-container');
    run(['write', repo.container], repo.root);
    const m = readMarker(repo.container);
    m.containerPath = '/some/other/device/container';
    fs.writeFileSync(markerFile(repo.container), `${JSON.stringify(m, null, 2)}\n`);

    const r = run(['explain', repo.container], repo.root);
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/\/some\/other\/device\/container/);
  });

  test('explain always exits 0, including on an unreadable marker', () => {
    const repo = makeRepo('explain-exit');
    fs.writeFileSync(markerFile(repo.container), 'not json');
    expect(run(['explain', repo.container], repo.root).code).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// AC2 — the documentation clause. Lives in a comment, so it is matched RAW.
// ---------------------------------------------------------------------------

describe('DEBUG-640 AC2 — head/repoRoot are documented as ownership-blind', () => {
  test('the file states it, naming the shared worktree', () => {
    // Deliberately matched against RAW source: this assertion is ABOUT a comment, so a
    // comment-stripped matcher structurally cannot see it. That is the inverse of the
    // DEBUG-390 rule, and is stated here so the next reader does not "fix" it.
    const raw = fs.readFileSync(SCRIPT, 'utf8');
    expect(raw).toMatch(/e2e-gate/);
    expect(raw).toMatch(/ownership-blind|cannot establish ownership/i);
  });
});

// --- helpers ---------------------------------------------------------------

/** JS comment stripper — correct for .js, and NOT usable on a shell file. */
function stripJsComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/**
 * Slice a top-level `function NAME(...) { ... }` by brace balance, anchored at BOTH ends
 * to the function's own structure rather than to a byte offset or the next blank line.
 */
function sliceFunction(src, name) {
  const start = src.indexOf(`function ${name}(`);
  if (start < 0) return '';
  const open = src.indexOf('{', start);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return '';
}
