/**
 * INFRA-492 — a detached close must never merge on a verdict it did not actually read.
 *
 * WHY THIS EXISTS
 * ===============
 * `/b-close` blocks its session for the gate build (~90 s warm, ~7 min post-regen, 21m31s
 * cold) plus the scoped flows. Detaching that block removes the human cost of serialised
 * closes — but it also moves an unattended process next to the merge button, which is
 * strictly worse than the blocking it removes if the verdict can be misread. The item is
 * Risk 3 for exactly that reason.
 *
 * Two misreads are already documented in this repo and both are pinned below:
 *   - INFRA-329: a commit can carry two runs, and a rollup with one SUCCESS and one FAILURE
 *     row for the same check name is RED. `gh pr checks --watch` exits green on it.
 *   - Non-Actions integrations report `.state`, not `.conclusion`. Reading only
 *     `.conclusion` renders those rows as literal null and reads as permanently red.
 *
 * WHAT IS PINNED HERE
 * ===================
 * 1. The CI filter is the ONE in `/b-close` Step 3.4(c), evaluated as jq against real-shaped
 *    rollup JSON — not a bash re-implementation that can drift from the skill it mirrors.
 * 2. FAIL-CLOSED IS STRUCTURAL. `b_close_stage_verdict` must never answer OK for an outcome
 *    it does not recognise, on any stage. An unrecognised outcome is the shape a future
 *    exit code arrives in, and OK is the only answer that merges.
 * 3. LIVENESS. A classifier that silently matches nothing looks exactly like a green run —
 *    the one failure a merge gate cannot survive — so the GREEN case is asserted to fire
 *    against verbatim rollup JSON alongside every refusal case.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_APP = path.resolve(__dirname, '..', '..');
const HELPER = path.join(REPO_APP, 'scripts', 'b-close-verdict.sh');
const RUNNER = path.join(REPO_APP, 'scripts', 'b-close-run.sh');

/** Source the helper and evaluate one expression, returning {stdout, status}. */
function sh(expr, env = {}) {
  const r = spawnSync('bash', ['-c', `set -u; . "${HELPER}"; ${expr}`], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  return { stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim(), status: r.status };
}

/** Evaluate the shipped CI filter against rollup JSON, exactly as `gh -q` would. */
function ciVerdict(rollup) {
  const filter = sh('printf %s "$B_CLOSE_CI_JQ"').stdout;
  expect(filter).not.toBe(''); // liveness: an empty filter would make every case pass
  const r = spawnSync('jq', ['-r', filter], {
    input: JSON.stringify({ statusCheckRollup: rollup }),
    encoding: 'utf8',
  });
  if (r.error) throw new Error(`jq unavailable: ${r.error.message}`);
  expect(r.status).toBe(0);
  return r.stdout.trim();
}

/** The pending probe: whether any rollup row is still running. */
function ciPending(rollup) {
  const filter = sh('printf %s "$B_CLOSE_CI_PENDING_JQ"').stdout;
  expect(filter).not.toBe('');
  const r = spawnSync('jq', ['-r', filter], {
    input: JSON.stringify({ statusCheckRollup: rollup }),
    encoding: 'utf8',
  });
  if (r.error) throw new Error(`jq unavailable: ${r.error.message}`);
  expect(r.status).toBe(0);
  return r.stdout.trim();
}

/** Strip block + line comments before asserting on what a script DOES (DEBUG-390). */
function stripped(file) {
  const src = fs.readFileSync(file, 'utf8');
  const out = src.replace(/^\s*#.*$/gm, '');
  expect(out.length).toBeGreaterThan(500); // the stripper must not have eaten the file
  return out;
}

describe('INFRA-492 CI rollup verdict — the filter that decides whether a detached close merges', () => {
  it('returns GREEN for an all-SUCCESS rollup (liveness: the classifier fires)', () => {
    expect(
      ciVerdict([
        { name: 'CI pass', conclusion: 'SUCCESS' },
        { name: 'Safety + privacy gates', conclusion: 'SUCCESS' },
      ])
    ).toBe('GREEN');
  });

  it('treats NEUTRAL and SKIPPED as green, matching Step 3.4(c)', () => {
    expect(
      ciVerdict([
        { name: 'CI pass', conclusion: 'SUCCESS' },
        { name: 'optional', conclusion: 'NEUTRAL' },
        { name: 'conditional', conclusion: 'SKIPPED' },
      ])
    ).toBe('GREEN');
  });

  it('returns RED when any row failed', () => {
    expect(
      ciVerdict([
        { name: 'CI pass', conclusion: 'SUCCESS' },
        { name: 'Performance regression', conclusion: 'FAILURE' },
      ])
    ).toBe('RED');
  });

  it('returns RED on the INFRA-329 shape — two runs on one SHA, one green one red', () => {
    // This is the case `gh pr checks --watch` exits GREEN on, having read only one run.
    expect(
      ciVerdict([
        { name: 'CI pass', conclusion: 'SUCCESS' },
        { name: 'CI pass', conclusion: 'FAILURE' },
      ])
    ).toBe('RED');
  });

  it('reads StatusContext rows via .state rather than rendering them null', () => {
    // Non-Actions integrations carry .state. `.conclusion` alone reads these as null → RED
    // forever, which would park every healthy branch that has one.
    expect(
      ciVerdict([
        { name: 'CI pass', conclusion: 'SUCCESS' },
        { name: 'legacy-integration', state: 'SUCCESS' },
      ])
    ).toBe('GREEN');
  });

  it('returns RED for a still-running row rather than merging early', () => {
    expect(
      ciVerdict([
        { name: 'CI pass', conclusion: null, status: 'IN_PROGRESS' },
        { name: 'other', conclusion: 'SUCCESS' },
      ])
    ).toBe('RED');
  });

  it('keeps waiting while a row is still running, and stops once every row completed', () => {
    // Only used to decide whether to KEEP WAITING. The merge is gated on B_CLOSE_CI_JQ
    // alone, so a misread here costs a premature CI_RED — a false refusal, never a merge.
    expect(ciPending([{ conclusion: null, status: 'IN_PROGRESS' }])).toBe('true');
    expect(ciPending([{ conclusion: 'SUCCESS', status: 'COMPLETED' }])).toBe('false');
  });

  it('treats a StatusContext row with no .status as completed rather than waiting forever', () => {
    expect(ciPending([{ state: 'SUCCESS' }])).toBe('false');
  });

  it('returns EMPTY — never GREEN — when no checks have registered', () => {
    // `CI pass` is the sole required context; an empty rollup is indistinguishable from
    // "the workflow never triggered", so it must never merge.
    expect(ciVerdict([])).toBe('EMPTY');
  });
});

describe('INFRA-492 stage verdicts — fail-closed typing of every exit alphabet', () => {
  const ok = (stage, outcome) => sh(`b_close_stage_verdict ${stage} ${outcome}`).stdout;

  it('maps the gate alphabet, keeping lease contention distinct from failure', () => {
    expect(ok('gate', 0)).toBe('OK');
    expect(ok('gate', 4)).toBe('LEASE_BUSY'); // INFRA-472 — contention, not a regression
    expect(ok('gate', 1)).toBe('GATE_FAILED');
  });

  it('maps e2e-safety.sh 0/1/2/3 to four distinct verdicts, never collapsing them', () => {
    // Collapsing 2 or 3 into "regression" trains a re-run-or-bypass reflex; they are not
    // verdicts about the branch at all.
    expect(ok('flows', 0)).toBe('OK');
    expect(ok('flows', 1)).toBe('FLOW_RED');
    expect(ok('flows', 2)).toBe('HARNESS');
    expect(ok('flows', 3)).toBe('TARGET_REPLACED'); // INFRA-434 — completed flows are VOID
    expect(new Set([ok('flows', 1), ok('flows', 2), ok('flows', 3)]).size).toBe(3);
  });

  it('maps the CI word to a named verdict, including the bounded-wait timeout', () => {
    expect(ok('ci', 'GREEN')).toBe('OK');
    expect(ok('ci', 'RED')).toBe('CI_RED');
    expect(ok('ci', 'EMPTY')).toBe('CI_EMPTY');
    expect(ok('ci', 'TIMEOUT')).toBe('CI_TIMEOUT');
  });

  it('names the remaining stages so a failure reports WHICH, per AC2', () => {
    expect(ok('precommit', 1)).toBe('PRECOMMIT_RED');
    expect(ok('sync', 1)).toBe('CONFLICT');
    expect(ok('merge', 1)).toBe('MERGE_REFUSED');
  });

  it('separates a merge conflict from a broken worktree, which have opposite fixes', () => {
    // Observed while smoke-testing the runner: a non-repo worktree reported CONFLICT.
    // Both refuse, so this is not a merge-safety hole — but a wrong verdict carrying a
    // plausible, specific, WRONG causal story is the failure mode INFRA-500 is about, and
    // "resolve the conflict" is unactionable advice when there is no repository.
    expect(ok('sync', 1)).toBe('CONFLICT');    // git merge's conflict exit
    expect(ok('sync', 2)).toBe('SYNC_FAILED'); // fetch failed / worktree unreadable
    expect(ok('sync', 128)).toBe('SYNC_FAILED');
  });

  it('NEVER answers OK for an unrecognised outcome, on any stage', () => {
    // The single most important property here: OK is the only answer that merges, so an
    // exit code added upstream must arrive as a refusal, not as consent.
    for (const stage of ['gate', 'flows', 'ci', 'precommit', 'sync', 'push', 'pr', 'merge']) {
      for (const outcome of ['99', 'MAYBE', '-1', 'null']) {
        const v = ok(stage, outcome);
        expect(v).not.toBe('OK');
        expect(v).not.toBe('');
      }
    }
  });

  it('NEVER answers OK for an unrecognised STAGE', () => {
    expect(ok('nonesuch', 0)).not.toBe('OK');
    expect(ok('nonesuch', 0)).not.toBe('');
  });

  it('b_close_mergeable succeeds only on OK', () => {
    expect(sh('b_close_mergeable OK').status).toBe(0);
    for (const v of ['CI_RED', 'CI_EMPTY', 'FLOW_RED', 'LEASE_BUSY', 'HARNESS', 'GREEN', '']) {
      expect(sh(`b_close_mergeable ${v || '""'}`).status).not.toBe(0);
    }
  });
});

describe('INFRA-492 failure hint — a stage name alone is not "naming which" (AC2)', () => {
  // First real detached run reported `PRECOMMIT_RED — exit 1` against a 200,000-line log.
  // The cause was the documented parallel-load flake, but nothing in the report could
  // distinguish that from a genuine crisis-path regression without grepping the log.
  const write = body => {
    const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'infra492h-')), 'log');
    fs.writeFileSync(f, body);
    return f;
  };

  it('names the failing suite and test from a jest log', () => {
    const f = write([
      'PASS __tests__/safety/other.test.ts',
      'FAIL __tests__/safety/offline-crisis-management.test.ts (12.914 s)',
      '      ✕ detects suicidal ideation (Q9 > 0) without any network call (11905 ms)',
      'Tests:       1 failed, 475 passed, 476 total',
    ].join('\n'));
    const hint = sh(`b_close_fail_hint "${f}"`).stdout;
    expect(hint).toContain('offline-crisis-management');
    expect(hint).toContain('suicidal ideation');
  });

  it('is quiet when the log carries no failure, rather than emitting noise', () => {
    expect(sh(`b_close_fail_hint "${write('Tests: 476 passed, 476 total\n')}"`).stdout).toBe('');
  });

  it('survives a missing log without failing the caller', () => {
    const r = sh('b_close_fail_hint /nonexistent/log');
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('');
  });

  it('stays one line, so a DONE record cannot be split into unparseable records', () => {
    const f = write(Array.from({ length: 40 }, (_, i) => `      ✕ case ${i} failed`).join('\n'));
    expect(sh(`b_close_fail_hint "${f}"`).stdout.split('\n').length).toBe(1);
  });
});

describe('INFRA-492 run directory — the status surface an operator is told to read', () => {
  let root;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra492-'));
  });

  const withRoot = expr => sh(expr, { B_CLOSE_RUN_ROOT: root });

  it('lives outside every worktree, because provenance hashes untracked files repo-wide', () => {
    // A status file under a worktree changes the tree hash, so the next provenance verify
    // returns MISMATCH and — under E2E_REQUIRE_CLEAN_PROVENANCE=1 — refuses the very close
    // it is tracking. Same constraint e2e-telemetry.sh documents.
    const dflt = sh('printf %s "$B_CLOSE_RUN_ROOT"').stdout;
    expect(dflt.startsWith('/tmp/')).toBe(true);
    expect(dflt).not.toContain('/dev/being');
  });

  it('writes DONE last, so a run dir without it is in-flight rather than passed', () => {
    const d = path.join(root, 'r1');
    withRoot(`b_close_run_init "${d}" INFRA-492 chore/x && b_close_status_write "${d}" flows`);
    expect(fs.existsSync(path.join(d, 'status'))).toBe(true);
    expect(fs.existsSync(path.join(d, 'DONE'))).toBe(false);

    withRoot(`b_close_done "${d}" FLOW_RED flows "daily-loop-quick-depth"`);
    const done = fs.readFileSync(path.join(d, 'DONE'), 'utf8');
    expect(done).toContain('FLOW_RED');
    expect(done).toContain('flows');
  });

  it('surfaces an un-ACKed failure and exits non-zero — AC2, not silently absorbed', () => {
    const d = path.join(root, 'r2');
    withRoot(`b_close_run_init "${d}" INFRA-492 chore/x && b_close_done "${d}" CI_RED ci "CI pass"`);
    const r = withRoot('b_close_status');
    expect(r.status).not.toBe(0);
    expect(r.stdout).toContain('CI_RED');
    expect(r.stdout).toContain('INFRA-492');
  });

  it('goes quiet only once the failure is acknowledged', () => {
    const d = path.join(root, 'r3');
    withRoot(`b_close_run_init "${d}" INFRA-492 chore/x && b_close_done "${d}" CI_RED ci detail`);
    expect(withRoot('b_close_status').status).not.toBe(0);
    fs.writeFileSync(path.join(d, 'ACK'), 'seen\n');
    expect(withRoot('b_close_status').status).toBe(0);
  });

  it('reports a MERGED run as success but still surfaces it as un-ACKed work', () => {
    // Notion is NOT updated by the runner — the acknowledging session does that, so a
    // merged-but-unacknowledged run is pending work, not noise.
    const d = path.join(root, 'r4');
    withRoot(`b_close_run_init "${d}" INFRA-492 chore/x && b_close_done "${d}" MERGED merge "#123"`);
    const r = withRoot('b_close_status');
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('MERGED');
  });

  it('survives a stat that answers non-numerically, instead of corrupting the age', () => {
    // GNU coreutils reads `stat -f` as --file-system and `%m` as the MOUNT POINT, so on
    // Linux `stat -f %m` prints "/" and EXITS 0 — a `||` fallback never fires and the
    // arithmetic below gets a path. Caught by CI, not by this suite, because the dev
    // machine is BSD-only. The stub reproduces the GNU answer on any host.
    const d = path.join(root, 'r6');
    withRoot(`b_close_run_init "${d}" INFRA-492 chore/x && b_close_status_write "${d}" flows`);
    const stub = fs.mkdtempSync(path.join(os.tmpdir(), 'infra492s-'));
    fs.writeFileSync(path.join(stub, 'stat'), '#!/bin/sh\necho /\n');
    fs.chmodSync(path.join(stub, 'stat'), 0o755);
    const r = sh('b_close_status', { B_CLOSE_RUN_ROOT: root, PATH: `${stub}:${process.env.PATH}` });
    expect(r.stdout).not.toMatch(/\(\/s\)|\(-\d+s\)/); // no path or negative age leaked
    expect(r.stdout).toContain('in flight');
  });

  it('flags a stale in-flight run rather than reporting it as still working', () => {
    // A runner killed mid-flight leaves `status` frozen and no DONE. Silence there is
    // indistinguishable from a long build, which is the failure mode the item names.
    const d = path.join(root, 'r5');
    withRoot(`b_close_run_init "${d}" INFRA-492 chore/x && b_close_status_write "${d}" flows`);
    const old = Math.floor(Date.now() / 1000) - 7200;
    fs.utimesSync(path.join(d, 'status'), old, old);
    const r = withRoot('B_CLOSE_STALE_S=1800 b_close_status');
    expect(r.stdout).toContain('STALE');
    expect(r.status).not.toBe(0);
  });
});

describe('INFRA-492 runner — structural guarantees that cannot be asserted by running it', () => {
  it('never backgrounds the flow suite, per the CLAUDE.md reap-able-task rule (AC5)', () => {
    // A killed run takes the XCUITest driver with it: the flow reports `Unknown error` with
    // ConnectException only in maestro.log — indistinguishable from a regression — and a
    // kill during clearState leaves the app uninstalled. Detachment happens ONCE, when the
    // skill launches this runner with nohup; inside the runner every child is foreground.
    const src = stripped(RUNNER);
    expect(src).not.toMatch(/e2e-safety\.sh[^\n]*&\s*$/m);
    expect(src).not.toMatch(/e2e:safety:gate[^\n]*&\s*$/m);
  });

  it('delegates to the existing gate and suite scripts, so all three leases are inherited (AC3)', () => {
    const src = stripped(RUNNER);
    expect(src).toMatch(/e2e:safety:gate/);
    expect(src).toMatch(/e2e-safety\.sh/);
    // Serialisation is preserved, never reimplemented: no lock handling of its own.
    expect(src).not.toMatch(/E2E_LOCK_ROOT/);
  });

  it('keeps the provenance guarantees unchanged (AC6)', () => {
    expect(stripped(RUNNER)).toMatch(/E2E_REQUIRE_CLEAN_PROVENANCE\s*=\s*1/);
  });

  it('never passes --skip-e2e, which is hotfix-only and never automatic', () => {
    expect(stripped(RUNNER)).not.toMatch(/--skip-e2e/);
  });

  it('reads the CI verdict from the shared filter, never from `gh pr checks --watch` status', () => {
    const src = stripped(RUNNER);
    expect(src).toMatch(/B_CLOSE_CI_JQ/);
    // --watch may be used to BLOCK, but its exit code must be discarded (INFRA-329).
    const watch = src.match(/gh pr checks[^\n]*--watch[^\n]*/);
    if (watch) expect(watch[0]).toMatch(/\|\|\s*true/);
  });

  it('decides the merge by PR STATE, never by `gh pr merge`\'s exit code', () => {
    // `gh pr merge --delete-branch` ALWAYS fails its local-checkout step in this repo:
    // development is held by a worktree, so gh reports `fatal: 'development' is already
    // used by worktree at …` and exits 1 — after the merge has landed. Routing on that
    // exit code reports MERGE_REFUSED for a successful merge and skips the postmerge
    // sync, which is worse than a plain failure because it invites re-running a merge
    // that already happened. Same lesson as Step 3.4's rollup: route on the state the
    // command produced, not on the status it returned.
    const src = stripped(RUNNER);
    expect(src).toMatch(/gh pr view[^\n]*--json state|--json state[^\n]*state/);
    expect(src).toMatch(/MERGED/);
    // The merge invocation itself must not be what decides.
    const call = src.match(/gh pr merge[^\n]*/);
    expect(call).not.toBeNull();
    expect(call[0]).toMatch(/\|\|\s*true/);
  });

  it('is idempotent at the PR stage, because CI-red re-entry is the common case', () => {
    // /b-close is documented as safe to re-run. `gh pr create` errors when one exists, so
    // without this a relaunch after any red gate reports PR_FAILED and strands the branch.
    const src = stripped(RUNNER);
    expect(src).toMatch(/gh pr list[^\n]*--head[^\n]*--state open/);
  });

  it('bounds the lease retry rather than looping forever on a peer (approved fork)', () => {
    const src = stripped(RUNNER);
    expect(src).toMatch(/B_CLOSE_LEASE_RETRIES/);
    const dflt = sh('printf %s "$B_CLOSE_LEASE_RETRIES"').stdout;
    expect(Number(dflt)).toBeGreaterThan(0);
    expect(Number(dflt)).toBeLessThan(10);
  });
});

/**
 * DEBUG-511 — ACK must clear a run that died WITHOUT a verdict.
 *
 * The `ACK` check lived inside the `DONE` branch, so it was only ever reachable for a run
 * that finished. A run that is killed, crashes, or loses its host never writes `DONE`: it
 * ages past `B_CLOSE_STALE_S` into the STALE arm, which consulted nothing. That entry
 * reports forever and holds `rc=1` forever, and `touch <dir>/ACK` — the remedy the STALE
 * line itself does not offer, and the DONE line does — cannot clear it.
 *
 * Why that is worse than a stray line: `/b-work` Step 0.3 and `/b-close` both gate on this
 * exit code and tell the operator to stop and handle a non-zero result. One unclearable
 * entry therefore stops every future session with an already-handled line, until the check
 * becomes noise the operator skips — and the next genuine failed close lands in a channel
 * nobody reads. That is the failure the mailbox exists to prevent, inverted.
 *
 * THE IN-FLIGHT ARM IS DELIBERATELY EXEMPT (AC3). `ACK` is honoured by the DONE and STALE
 * arms only; on a run still making progress it is IGNORED, not refused.
 *   - Ignored rather than honoured: the in-flight arm contributes nothing to `rc`, so there
 *     is no noise for an ACK to remove — it could only hide a live run from an operator
 *     about to start work on the same tree, which is the harm AC3 names.
 *   - Ignored rather than refused: making a premature `touch ACK` an error clearable only
 *     by DELETING the file rebuilds this very bug mirror-imaged — an entry the documented
 *     remedy cannot clear.
 * Accepted consequence, stated so the next reader knows it is a decision and not an
 * oversight: an ACK written while a run is live pre-arms the mute, so if that run later
 * dies its STALE line never appears. This already held for the DONE arm before this fix;
 * ACK is a claim by a human that the run is handled, and nothing here outranks that.
 */
describe('DEBUG-511 ACK — the four terminal states, plus the in-flight carve-out', () => {
  let root;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'debug511-'));
  });

  const withRoot = expr => sh(expr, { B_CLOSE_RUN_ROOT: root });
  const STALE = 'B_CLOSE_STALE_S=1800 b_close_status';

  /** A run dir frozen far enough in the past to land in the STALE arm. */
  const deadRun = name => {
    const d = path.join(root, name);
    withRoot(`b_close_run_init "${d}" DEBUG-511 fix/x && b_close_status_write "${d}" flows`);
    const old = Math.floor(Date.now() / 1000) - 7200;
    fs.utimesSync(path.join(d, 'status'), old, old);
    return d;
  };

  // ---- {no DONE} x {no ACK} — the control AC2 protects. Must stay RED across the fix.
  it('still reports a stale run with no ACK, and still returns non-zero (AC2)', () => {
    deadRun('s1');
    const r = withRoot(STALE);
    expect(r.stdout).toContain('STALE');
    expect(r.status).not.toBe(0);
  });

  // ---- {no DONE} x {ACK} — THE FIX. Red before it, green after.
  it('goes quiet on a stale run once ACK is present, without a DONE file (AC1)', () => {
    const d = deadRun('s2');
    expect(withRoot(STALE).status).not.toBe(0); // liveness: it was reporting a moment ago
    fs.writeFileSync(path.join(d, 'ACK'), 'seen\n');
    const r = withRoot(STALE);
    expect(r.stdout).not.toContain('STALE');
    expect(r.stdout).not.toContain('DEBUG-511');
    expect(r.status).toBe(0);
  });

  // ---- {DONE} x {ACK} and {DONE} x {no ACK} — controls. Must stay green across the fix.
  it('stays quiet on an ACKed failed run that DID write DONE', () => {
    const d = path.join(root, 'd1');
    withRoot(`b_close_run_init "${d}" DEBUG-511 fix/x && b_close_done "${d}" CI_RED ci detail`);
    expect(withRoot('b_close_status').status).not.toBe(0);
    fs.writeFileSync(path.join(d, 'ACK'), 'seen\n');
    expect(withRoot('b_close_status').status).toBe(0);
  });

  it('still reports a failed run with DONE and no ACK', () => {
    const d = path.join(root, 'd2');
    withRoot(`b_close_run_init "${d}" DEBUG-511 fix/x && b_close_done "${d}" CI_RED ci detail`);
    const r = withRoot('b_close_status');
    expect(r.stdout).toContain('CI_RED');
    expect(r.status).not.toBe(0);
  });

  // ---- AC3: an ACK on a run that is still making progress changes nothing.
  it('keeps listing an in-flight run even when ACK is present, and stays rc 0 (AC3)', () => {
    const d = path.join(root, 'f1');
    withRoot(`b_close_run_init "${d}" DEBUG-511 fix/x && b_close_status_write "${d}" flows`);
    fs.writeFileSync(path.join(d, 'ACK'), 'premature\n');
    const r = withRoot('b_close_status');
    expect(r.stdout).toContain('in flight');
    expect(r.stdout).toContain('DEBUG-511');
    expect(r.status).toBe(0);
  });

  // ---- The mute is per-directory. Silencing the sweep would satisfy AC1 and break AC2.
  it('mutes only the ACKed dead run, leaving an un-ACKed peer reporting and rc non-zero', () => {
    const acked = deadRun('m1');
    fs.writeFileSync(path.join(acked, 'ACK'), 'seen\n');
    fs.writeFileSync(path.join(acked, 'meta'), 'item=DEBUG-511-ACKED\nbranch=fix/a\n');
    const open = deadRun('m2');
    fs.writeFileSync(path.join(open, 'meta'), 'item=DEBUG-511-OPEN\nbranch=fix/b\n');

    const r = withRoot(STALE);
    expect(r.stdout).toContain('DEBUG-511-OPEN');
    expect(r.stdout).not.toContain('DEBUG-511-ACKED');
    expect(r.status).not.toBe(0);
  });
});
