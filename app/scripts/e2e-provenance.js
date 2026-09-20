#!/usr/bin/env node
'use strict';

/**
 * e2e-provenance.js — INFRA-384
 *
 * Binds the Maestro safety gate's INSTALLED BINARY to the TREE it was built from.
 *
 * The gap this closes was pre-existing and self-documented: `/b-close` Step 2.5.4 only
 * grepped `xcrun simctl listapps` for the bundle ID, so a green gate meant "some Being
 * build was installed and the flows passed", not "the flows passed against this branch's
 * code". INFRA-383 asserts the artifact's SHAPE (launcher-free, fresh bundle, env parity,
 * LSApplicationQueriesSchemes) but never its LINEAGE.
 *
 * It became urgent when INFRA-383 dropped EAS: `requireCommit: true` had supplied
 * provenance as a side effect, since the artifact necessarily corresponded to a commit.
 * The clean-tree pre-flight was kept as a stand-in. This script is what buys its
 * relaxation — and the result is strictly stronger than what EAS gave, because
 * `requireCommit` only proved the tree was COMMITTED, never that the installed binary
 * came from it.
 *
 * USAGE
 *   node scripts/e2e-provenance.js write  <containerPath>
 *   node scripts/e2e-provenance.js verify <containerPath>
 *
 * `verify` prints exactly one verdict word on stdout:
 *   MATCH_CLEAN  — binary built from this exact tree, and that tree was clean   (exit 0)
 *   MATCH_DIRTY  — binary built from this exact tree, but it was dirty          (exit 0)
 *   MISMATCH     — the tree has moved since the build                           (exit 1)
 *   MISSING      — no marker, unreadable, unparseable, or unknown schema        (exit 1)
 *
 * FAIL CLOSED IS THE WHOLE POINT. Every non-match path — absent marker, bad JSON, a
 * schema this build does not understand, an empty field, a git invocation that failed —
 * resolves to a refusing verdict. The verdict variable is initialised to MISMATCH and
 * only ever narrowed on positive evidence. Callers must never write
 * `if [ -f "$MARKER" ]; then compare; fi`, which silently passes when the marker is gone
 * — the marker being gone is precisely the reinstall case this exists to catch.
 *
 * WHY THE MARKER LIVES INSIDE THE INSTALLED CONTAINER. `simctl` mints a new container
 * UUID on every fresh install, so any reinstall — `npm run ios`, a manual
 * `simctl install`, a colleague's build — replaces the directory and takes the marker
 * with it. That disappearance IS the binding; we do not have to detect the reinstall,
 * only refuse when the marker is absent.
 *
 * WHY NODE AND NOT BASH. Two reasons, both learned from this script's neighbours:
 *   1. `node` is deliberately NOT PATH-shimmed in the jest harness, so the real logic
 *      here is genuinely exercised rather than stubbed.
 *   2. `crypto.createHash` sidesteps the macOS/Linux `shasum`-vs-`sha1sum` dialect trap
 *      that already burned the `stat -f` / `stat -c` probe in e2e-sim-build.sh.
 *
 * WHY THE FINGERPRINT INCLUDES UNTRACKED FILE CONTENTS. The obvious recipe —
 * `git status --porcelain` + `git diff HEAD` — is BLIND to them, and this was verified
 * empirically rather than assumed: rewriting an untracked file wholesale and adding new
 * files inside an untracked directory left that hash byte-identical. `status --porcelain`
 * emits the same `?? path` line regardless of content, and `diff HEAD` covers tracked
 * files only. Untracked `.ts` under `app/src` IS bundled into `main.jsbundle`, so a
 * fingerprint blind to it would call a materially different binary a match.
 *
 * KNOWN BLIND SPOTS, stated rather than papered over:
 *   * `app/ios/` and `app/.env.*` are gitignored, so `--exclude-standard` hides them.
 *     A native-side or env-file edit does not move the fingerprint. INFRA-383's own
 *     env-parity and Info.plist asserts cover that surface at build time.
 *   * The fingerprint is REPO-WIDE, so editing `app/.maestro/*.yaml` between build and
 *     run invalidates the marker. That is over-refusal — the safe direction — but it
 *     will surprise someone tweaking a flow, hence this note.
 */

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCHEMA = 1;
const MARKER_NAME = '.e2e-provenance.json';
const BUNDLE_ID = 'fyi.being.app';

/**
 * 256 MB. The 1 MB default TRUNCATES a real dirty diff — and a truncated diff still
 * hashes to something, so the failure would be a silently weaker fingerprint rather than
 * an error. Truncation sets `r.error`, which is treated as failure below.
 */
const MAX_BUFFER = 256 * 1024 * 1024;

const VERDICT = {
  MATCH_CLEAN: 'MATCH_CLEAN',
  MATCH_DIRTY: 'MATCH_DIRTY',
  MISMATCH: 'MISMATCH',
  MISSING: 'MISSING',
};

/** Run git, returning raw stdout bytes, or null on ANY failure. */
function git(args, cwd) {
  const r = spawnSync('git', args, { cwd, encoding: 'buffer', maxBuffer: MAX_BUFFER });
  if (r.error || r.status !== 0 || !r.stdout) return null;
  return r.stdout;
}

function gitText(args, cwd) {
  const out = git(args, cwd);
  return out === null ? null : out.toString('utf8').trim();
}

/**
 * Fingerprint the working tree. Returns null if the tree cannot be read at all, which
 * every caller treats as a refusal rather than as "no changes".
 */
function fingerprint(cwd) {
  const repoRoot = gitText(['rev-parse', '--show-toplevel'], cwd);
  if (!repoRoot) return null;

  const head = gitText(['rev-parse', 'HEAD'], repoRoot);
  const branch = gitText(['rev-parse', '--abbrev-ref', 'HEAD'], repoRoot);
  // Raw bytes, not text: a diff can carry any encoding, and hashing the decoded form
  // would lose byte-level changes that survive a lossy decode.
  const status = git(['status', '--porcelain'], repoRoot);
  const diff = git(['diff', 'HEAD'], repoRoot);
  const untracked = git(['ls-files', '-o', '--exclude-standard'], repoRoot);

  // `git` returns null for an empty stdout too, which is the common clean-tree case —
  // so only `head` is required to be non-empty. The others are normalised to empty.
  if (!head) return null;

  const statusBuf = status || Buffer.alloc(0);
  const diffBuf = diff || Buffer.alloc(0);
  const untrackedBuf = untracked || Buffer.alloc(0);

  const h = crypto.createHash('sha256');
  h.update(`schema:${SCHEMA}\0`);
  h.update(`head:${head}\0`);
  h.update('status:\0');
  h.update(statusBuf);
  h.update('\0diff:\0');
  h.update(diffBuf);
  h.update('\0untracked:\0');

  // Sorted so the hash does not depend on git's enumeration order.
  const files = untrackedBuf
    .toString('utf8')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .sort();

  for (const rel of files) {
    h.update(`${rel}\0`);
    try {
      h.update(fs.readFileSync(path.join(repoRoot, rel)));
    } catch {
      // A file listed but unreadable (a dangling symlink, a race with a delete) must
      // still perturb the hash — never silently contribute nothing.
      h.update('<unreadable>');
    }
    h.update('\0');
  }

  return {
    repoRoot,
    branch: branch || '<detached>',
    head,
    treeHash: h.digest('hex'),
    dirty: statusBuf.toString('utf8').trim().length > 0,
  };
}

function markerPath(containerPath) {
  return path.join(containerPath, MARKER_NAME);
}

function write(containerPath, expected) {
  if (!containerPath || !fs.existsSync(containerPath)) {
    console.error(`e2e-provenance: container path does not exist: ${containerPath}`);
    return 1;
  }
  const fp = fingerprint(process.cwd());
  if (!fp) {
    console.error('e2e-provenance: could not fingerprint the working tree (not a git repo?)');
    return 1;
  }

  // MID-BUILD MUTATION GUARD.
  //
  // The binary corresponds to the tree AS IT WAS WHEN BUNDLED; this marker records the
  // tree as it is NOW. Those are the same instant only if nothing moved in between — and
  // the build takes 35-75s warm, so they can differ. The dangerous direction is specific:
  // commit (or edit) mid-build and the marker records dirty:false at a NEW head with a
  // hash the binary does not match, which then verifies as MATCH_CLEAN. That is a false
  // green of exactly the kind this file exists to prevent.
  //
  // It is not hypothetical hygiene: relaxing the clean-tree pre-flight makes dirty builds
  // routine, and the script's own remediation text is "commit and rebuild before closing",
  // which trains the commit-while-building reflex.
  //
  // The caller snapshots the fingerprint immediately before the build and passes it here.
  if (expected && expected !== fp.treeHash) {
    console.error('e2e-provenance: the working tree CHANGED during the build.');
    console.error('  The binary was bundled from one tree and this marker would record');
    console.error('  another, so the marker would attest something untrue. Rebuild.');
    return 1;
  }
  const marker = {
    schema: SCHEMA,
    bundleId: BUNDLE_ID,
    repoRoot: fp.repoRoot,
    branch: fp.branch,
    head: fp.head,
    treeHash: fp.treeHash,
    dirty: fp.dirty,
    builtAt: new Date().toISOString(),
    containerPath,
    // DEBUG-640 instance 3 — OWNERSHIP, recorded separately from tree identity.
    //
    // `repoRoot`, `branch` and `head` answer "which TREE is this binary from". That is
    // exactly their job as merge evidence, and it makes them ownership-blind BY
    // CONSTRUCTION under the shared `e2e-gate` worktree: every session running
    // `e2e:safety:gate` builds that tree and inherits the same three values, so reading
    // any of them as "whose device is this" attributes a peer's build to whoever last
    // held that SHA.
    //
    // `ownerId` is a fresh uuid PER BUILD, which is the narrow thing that actually fixes
    // it: two builds of the same worktree at the same commit produce the same treeHash,
    // the same repoRoot and the same branch, and different ownerIds — so "is this MY
    // build?" becomes exactly answerable. It deliberately does not try to identify a
    // person or a session; nothing on this machine is per-session, survives the build
    // process and stays meaningful minutes later (see e2e-sim-lock.sh's header).
    //
    // Written ONCE, here, and never touched by verify/explain/attribute: INFRA-434
    // compares this file's FULL BYTES before every flow, so a diagnostic that rewrote it
    // would report `replaced` against our own binary and VOID every completed flow.
    ownerId: crypto.randomUUID(),
    ownerHost: os.hostname(),
    ownerUser: os.userInfo().username,
    // The shell that invoked us, i.e. e2e-sim-build.sh. A trace, not a liveness signal:
    // it is dead by the time anyone reads it, and pids are recycled.
    ownerPid: process.ppid,
    // Self-declared, never verified, null when unset. Recorded verbatim so a wrapper can
    // opt into a spanning id later without a schema change.
    ownerSession: process.env.E2E_SESSION_ID || null,
  };
  try {
    fs.writeFileSync(markerPath(containerPath), `${JSON.stringify(marker, null, 2)}\n`);
  } catch (e) {
    console.error(`e2e-provenance: could not write marker: ${e.message}`);
    return 1;
  }
  console.error(
    `✓ provenance marker written (${fp.head.slice(0, 8)}${fp.dirty ? ', DIRTY tree' : ', clean tree'})`
  );
  return 0;
}

function verify(containerPath) {
  // Default to refusal; narrow only on positive evidence.
  let verdict = VERDICT.MISMATCH;

  let raw = null;
  try {
    raw = fs.readFileSync(markerPath(containerPath), 'utf8');
  } catch {
    console.log(VERDICT.MISSING);
    return 1;
  }

  let marker;
  try {
    marker = JSON.parse(raw);
  } catch {
    console.log(VERDICT.MISSING);
    return 1;
  }

  // An unknown schema is MISSING, not MISMATCH: a newer marker we cannot interpret is
  // absence of usable evidence, and must not be reported as "the tree moved".
  if (!marker || marker.schema !== SCHEMA) {
    console.log(VERDICT.MISSING);
    return 1;
  }

  // Assert every field we are about to compare is actually present BEFORE comparing.
  // Without this, an empty recorded hash could compare equal to an empty computed one.
  const recordedHash = typeof marker.treeHash === 'string' ? marker.treeHash.trim() : '';
  const recordedBundle = typeof marker.bundleId === 'string' ? marker.bundleId.trim() : '';
  if (!recordedHash || !recordedBundle) {
    console.log(VERDICT.MISSING);
    return 1;
  }
  if (recordedBundle !== BUNDLE_ID) {
    console.log(VERDICT.MISMATCH);
    return 1;
  }

  const fp = fingerprint(process.cwd());
  if (!fp || !fp.treeHash) {
    console.log(VERDICT.MISMATCH);
    return 1;
  }

  if (fp.treeHash === recordedHash) {
    verdict = marker.dirty === true ? VERDICT.MATCH_DIRTY : VERDICT.MATCH_CLEAN;
  }

  console.log(verdict);
  return verdict === VERDICT.MISMATCH ? 1 : 0;
}

/**
 * INFRA-436 — say WHAT moved, not merely THAT something did.
 *
 * `verify` prints one word, and e2e-safety.sh turns MISMATCH into "rebuild". Correct, and
 * useless: a cold rebuild measured 21m31s, so a blind one is an expensive coin flip. Under
 * the gate-worktree workflow the same one-word verdict covers two unrelated causes — the
 * two worktrees are at different commits, or the running one carries stray files — and the
 * fix differs completely.
 *
 * The marker stores a hash, which cannot be inverted, but it does not need to be:
 *   * heads differ -> `git diff --name-only` between them names the difference exactly;
 *   * heads match and the marker recorded dirty:false -> the build tree's porcelain was
 *     empty, so everything dirty or untracked HERE is, precisely, the difference.
 * A same-head both-clean mismatch cannot occur (an empty porcelain implies no `??` entries
 * either), so for a clean-built marker those two cases are exhaustive.
 *
 * DIAGNOSTIC ONLY — always exits 0. If this could fail a run it would become a second
 * verdict channel, and e2e-verdict.js exists precisely because two channels that can
 * disagree is a bug class in this subsystem.
 */
const EXPLAIN_CAP = 20;

function explainList(label, files) {
  if (!files.length) return;
  console.log(`  ${label}:`);
  for (const f of files.slice(0, EXPLAIN_CAP)) console.log(`    ${f}`);
  if (files.length > EXPLAIN_CAP) {
    console.log(`    … and ${files.length - EXPLAIN_CAP} more`);
  }
}

/**
 * DEBUG-640 — report what the marker OBSERVED, and say plainly what it cannot establish.
 *
 * Every line here is diagnostic. It cannot change a verdict, and must not: `verify`
 * compares `treeHash` and `bundleId` only, and adding a second channel that can disagree
 * with the first is the bug class `e2e-verdict.js` exists to prevent.
 */
function explainOwner(marker, containerPath) {
  const id = marker && typeof marker.ownerId === 'string' ? marker.ownerId.trim() : '';

  console.log('OWNER — who built and installed this binary:');
  if (id) {
    const who = [marker.ownerUser, marker.ownerHost].filter(Boolean).join('@');
    console.log(`  build id:   ${id}`);
    if (who) console.log(`  built by:   ${who}`);
    if (marker.ownerPid) {
      console.log(`  build pid:  ${marker.ownerPid} (dead by now; pids recycle — implies no liveness)`);
    }
    if (marker.ownerSession) {
      console.log(`  session:    ${marker.ownerSession} (self-declared, never verified)`);
    }
    if (marker.builtAt) console.log(`  built at:   ${marker.builtAt}`);
  } else {
    // The markers already installed in the field have no owner keys, and they are exactly
    // the ones where this misreading happens. Say so, and offer NO substitute: falling
    // back to head or repoRoot here would re-commit the defect this block exists to fix.
    console.log('  no owner recorded — this marker predates the owner field.');
    console.log('  Nothing below identifies a session; rebuild to record one.');
  }

  // The disconfirming evidence that sat unread during the original misattribution: the
  // marker's own containerPath named a different device than the one it was found on.
  const recordedContainer =
    marker && typeof marker.containerPath === 'string' ? marker.containerPath.trim() : '';
  if (recordedContainer && containerPath && path.resolve(recordedContainer) !== path.resolve(containerPath)) {
    console.log('  ⚠️  this marker records a DIFFERENT container than the one it was read from:');
    console.log(`      recorded: ${recordedContainer}`);
    console.log(`      read from: ${containerPath}`);
    console.log('      It was copied, or you are looking at another device.');
  }

  console.log('TREE IDENTIFIERS (these CANNOT establish ownership):');
  console.log(`  repoRoot / branch / head answer "which tree is this binary from", which is`);
  console.log('  their job as merge evidence. The gate worktree /Users/max/dev/being/e2e-gate');
  console.log('  is SHARED — every session running e2e:safety:gate builds it and inherits the');
  console.log('  same values — so a matching head does not make a build yours, and a foreign');
  console.log('  one does not make it a peer\'s.');
  console.log('');
}

function explain(containerPath) {
  let marker;
  try {
    marker = JSON.parse(fs.readFileSync(markerPath(containerPath), 'utf8'));
  } catch (e) {
    // Distinguish "never built here" from "built, but the record is corrupt" — they lead
    // to different next actions.
    const missing = e && e.code === 'ENOENT';
    console.log(
      missing
        ? `No provenance marker in ${containerPath} — nothing was installed by e2e-sim-build.sh, or it was reinstalled since.`
        : `Provenance marker is unreadable/unparseable in ${containerPath}: ${e.message}`
    );
    return 0;
  }

  const fp = fingerprint(process.cwd());
  if (!fp) {
    console.log('Could not fingerprint the current tree, so the difference cannot be attributed.');
    return 0;
  }

  // DEBUG-640 instance 3 — printed BEFORE the match/mismatch fork, deliberately.
  //
  // The misreading that produced this block happened with no mismatch in play at all: a
  // human read `repoRoot` and `head` off a marker on a booted device and concluded whose
  // device it was. Surfacing ownership only on the failure path would have corrected the
  // one surface nobody was looking at.
  explainOwner(marker, containerPath);

  if (fp.treeHash === marker.treeHash) {
    console.log('Provenance MATCHES: the installed binary was built from this exact tree.');
    return 0;
  }

  console.log('Provenance MISMATCH — the installed binary was not built from this tree.');
  console.log(`  built from tree:   ${marker.repoRoot || '<unknown>'}`);
  console.log(`  running from tree: ${fp.repoRoot}`);

  if (marker.head !== fp.head) {
    console.log('');
    console.log('COMMIT DIVERGENCE — the build and this tree are at different commits.');
    console.log(`  marker head:  ${marker.head}`);
    console.log(`  current head: ${fp.head}`);
    // The marker's commit may not exist locally (a different clone, a pruned branch).
    // Naming the SHAs is still useful; inventing a file list is not.
    const known = spawnSync('git', ['cat-file', '-e', `${marker.head}^{commit}`], {
      cwd: fp.repoRoot,
    });
    if (known.status === 0) {
      const out = gitText(['diff', '--name-only', marker.head, fp.head], fp.repoRoot);
      explainList('files differing between those commits', out ? out.split('\n').filter(Boolean) : []);
    } else {
      console.log('  (that commit is not present locally, so the file list cannot be computed)');
    }
    console.log('  Fix: rebuild the gate against THIS commit — the back-merge belongs in the');
    console.log('  item worktree first, then point the gate worktree at the resulting commit.');
  }

  if (marker.dirty === true) {
    console.log('');
    console.log('The build was made from a DIRTY tree, so its working-tree state was not');
    console.log('recorded and the remaining difference cannot be attributed to files.');
    console.log('Rebuild from a clean tree: a dirty build is refused as merge evidence anyway.');
    return 0;
  }

  // Heads match (or already reported). The marker's tree was clean, so anything uncommitted
  // here is the whole remaining difference. Use ls-files/diff rather than `status
  // --porcelain`, which collapses an untracked directory to one `?? dir/` entry and would
  // send the operator rummaging.
  const modified = gitText(['diff', '--name-only', 'HEAD'], fp.repoRoot);
  const untracked = gitText(['ls-files', '-o', '--exclude-standard'], fp.repoRoot);
  const mod = modified ? modified.split('\n').filter(Boolean) : [];
  const unt = untracked ? untracked.split('\n').filter(Boolean) : [];

  if (mod.length || unt.length) {
    console.log('');
    console.log('WORKING-TREE DIVERGENCE — the build tree was clean, so these files ARE the');
    console.log('difference. Commit, stash, or remove them, then re-run the gate.');
    explainList('modified', mod);
    explainList('untracked', unt);
  }

  return 0;
}

/**
 * INFRA-484 — WHOSE build is installed, as one word a script can branch on.
 *
 * `verify` says the binary does not match this tree; it cannot say why, and the two causes
 * want opposite handling. A PEER's build landing on our target is nobody's decision and its
 * only recovery is a rebuild, so automating that costs a build and saves a human round-trip.
 * OUR OWN tree having moved is the operator's own edit — the rebuild is still the fix, but
 * making it automatic would spend up to 21m31s reacting to a keystroke and would train them
 * past the one message saying their tree and their binary have diverged.
 *
 * NONE is not a third kind of peer. A missing, unreadable or repoRoot-less marker carries no
 * attribution, and INFRA-434 already settled that inventing one is worse than refusing
 * without it. So a markerless container never triggers an automatic rebuild.
 *
 * DEBUG-640 — SELF and PEER are a TREE comparison, not a statement about a person. They
 * answer "was this built from the worktree I am standing in", which is what decides whether
 * a rebuild is automatic or the operator's call. Under the SHARED `e2e-gate` worktree a
 * genuine peer's build resolves to the same repoRoot and therefore reads SELF — so a SELF
 * verdict is not evidence that nobody else touched this device. `explain` carries the
 * per-build `ownerId` for that question; deliberately NOT consumed here, because making
 * ownership the predicate would read PEER on your own previous build after any edit and
 * turn a keystroke into a rebuild of up to 21m31s — the inversion INFRA-484 refused.
 *
 * Diagnostic, like `explain`: it always exits 0 and only ever prints. `verify` keeps the
 * refusal, so nothing here can turn a MISMATCH into a pass.
 */
function attribute(containerPath) {
  let marker;
  try {
    marker = JSON.parse(fs.readFileSync(markerPath(containerPath), 'utf8'));
  } catch {
    console.log('NONE');
    return 0;
  }

  const recorded = marker && typeof marker.repoRoot === 'string' ? marker.repoRoot.trim() : '';
  if (!recorded) {
    console.log('NONE');
    return 0;
  }

  // Fingerprinting only to learn OUR repo root. A tree we cannot fingerprint cannot be
  // compared against, and "cannot tell" must read as NONE rather than as a peer.
  const fp = fingerprint(process.cwd());
  if (!fp || !fp.repoRoot) {
    console.log('NONE');
    return 0;
  }

  // Resolved before comparing: worktree paths reach here through symlinks (/tmp vs
  // /private/tmp on macOS is the everyday case), and a textual compare would report a
  // session as a peer of itself — which is the one direction that auto-rebuilds wrongly.
  if (path.resolve(recorded) === path.resolve(fp.repoRoot)) {
    console.log('SELF');
    return 0;
  }

  console.log(`PEER ${recorded}`);
  return 0;
}

function main(argv) {
  const [cmd, containerPath, ...rest] = argv;
  switch (cmd) {
    // Print just the tree hash. The build script snapshots this immediately before the
    // build and hands it back to `write --expect`, which is how the mid-build mutation
    // guard is armed.
    case 'fingerprint': {
      const fp = fingerprint(process.cwd());
      if (!fp) return 1;
      console.log(fp.treeHash);
      return 0;
    }
    case 'write': {
      const i = rest.indexOf('--expect');
      return write(containerPath, i >= 0 ? rest[i + 1] : undefined);
    }
    case 'verify':
      if (!containerPath) {
        console.log(VERDICT.MISSING);
        return 1;
      }
      return verify(containerPath);
    case 'explain':
      if (!containerPath) {
        console.log('usage: e2e-provenance.js explain <containerPath>');
        return 0;
      }
      return explain(containerPath);
    // No container path is "nothing to attribute", which is NONE and exit 0 — not the
    // usage error `verify` returns, because a caller branching on this must never have to
    // tell an empty argument apart from an unattributable marker.
    case 'attribute':
      if (!containerPath) {
        console.log('NONE');
        return 0;
      }
      return attribute(containerPath);
    default:
      console.error('usage: e2e-provenance.js <write|verify|explain|attribute> <containerPath>');
      return 2;
  }
}

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}

module.exports = { fingerprint, MARKER_NAME, SCHEMA, VERDICT };
