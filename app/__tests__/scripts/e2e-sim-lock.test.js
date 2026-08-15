/**
 * INFRA-436 — mutual exclusion on the simulator the safety gate builds and runs against.
 *
 * THE DEFECT THIS EXISTS FOR
 * ==========================
 * Captured live on 2026-08-14 while measuring the gate build: THREE sessions were driving
 * one machine. A peer's `npm run e2e:safety` full suite was mid-flow on simulator
 * 05176B22 while this session's `e2e-sim-build.sh` uninstalled and reinstalled
 * `fyi.being.app` on that same device — twice. `e2e-sim-build.sh` step 3 uninstalls FIRST,
 * by design, so the peer's app vanished underneath a running flow. Both sides died with
 * `java.net.ConnectException` from the XCUITest driver. A peer then DELETED the simulator
 * outright, mid-measurement.
 *
 * `b-batch.md` Step 4.1 reasons that the simulator needs no lock because "a single human
 * serializes that naturally". That holds WITHIN one batch and is false ACROSS sessions,
 * which is the case nothing in the tooling could see.
 *
 * WHAT THIS LOCK IS AND IS NOT FOR
 * ================================
 * It is NOT a correctness fix. INFRA-384 provenance already fails closed across sessions:
 * a foreign binary carries a foreign repoRoot + treeHash, so a peer's verify returns
 * MISMATCH and REFUSES rather than producing a false green. That was confirmed in the same
 * incident. This lock buys liveness and non-wasted work — it stops the destructive
 * interleaving (an uninstall landing mid-flow), which provenance cannot prevent, only
 * detect after the fact.
 *
 * That distinction sets the SCOPE, and the scope is the whole design:
 *
 *   PER-INVOCATION, NOT SPANNING BUILD -> FLOWS.
 *
 * A lock spanning both would have to survive the build process exiting, so its liveness
 * could not be anchored to any running process — there is no process representing "this
 * session is between its build and its flows". That forces a TTL, and a TTL is wrong in
 * both directions: too short and it expires while a human reads a diff; too long and a
 * crashed session wedges the gate for everyone. DEBUG-392 and INFRA-423 are two prior
 * burns from process-identity heuristics in this exact subsystem; a timer would be a third.
 *
 * WHY THIS CANNOT REPEAT THE pgrep -f DEFECT CLASS
 * ================================================
 * DEBUG-392: `pgrep -f` / `pkill -f` match a SUBSTRING of a full command line, so they also
 * match any shell that merely MENTIONS the string — including Claude Code's own
 * `/bin/zsh -c '…'` wrapper. Correct when a human tests it interactively, wrong from a
 * script or an agent.
 *
 * The holder here is identified by PID + PROCESS START TIME, never by command-line text, so
 * there is no substring to over-match. Start time is what makes it safe: a bare PID is
 * recycled by the OS, and reclaiming a lock because some UNRELATED new process now holds
 * the old PID is the silent-wrong-answer failure this pairs against. `comm` is recorded for
 * the human-facing timeout message only, and is never load-bearing.
 *
 * WHY THE KEY IS THE UDID, GIVEN INFRA-423 SAID UDID IS NEVER AN OWNER
 * ====================================================================
 * These are different jobs and both are right. INFRA-423 established that a UDID cannot
 * ATTRIBUTE an already-running process to a run, because two worktrees were pinned to one
 * simulator at once. Here the UDID is the key for EXCLUSION — the device IS the contended
 * resource. INFRA-423 observed that two worktrees could share a simulator; this is what
 * stops them. Nothing is regressed.
 *
 * WHAT THIS SUITE PINS
 * ====================
 * The classifier and the acquire/release protocol, against SYNTHETIC `ps` tables — so every
 * AC is proven with no simulator, no build, and no second session. Per the standing rule in
 * CLAUDE.md (check:breathing-worklets, DEBUG-390) the suite also asserts the classifier can
 * still GO RED against a genuinely live process: a liveness check that silently stops
 * detecting holders looks exactly like an uncontended machine, and would hand out the lock
 * to everyone.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_APP = path.resolve(__dirname, '..', '..');
const HELPER = path.join(REPO_APP, 'scripts', 'e2e-sim-lock.sh');

const UDID = '5C81114E-3891-40DD-9E7F-4511389F9C3F';
const OTHER_UDID = '5BAF97CA-1111-2222-3333-444455556666';

/** `ps -axo pid=,lstart=,comm=`. lstart is ALWAYS 5 whitespace tokens, even when the
 *  day-of-month is space-padded ("Fri Aug  1 …" collapses to 5 under awk). */
const START_A = 'Fri Aug 14 13:47:35 2026';
const START_B = 'Fri Aug 14 09:02:11 2026';

function psTable(rows) {
  return rows.map(r => `${r.pid} ${r.start} ${r.comm}`).join('\n');
}

/**
 * Run helper functions with `ps` stubbed to emit `table`, in an isolated lock root.
 * The stub is a real executable earlier on PATH, so the helper's own `ps` invocation is
 * exercised verbatim rather than re-implemented here.
 */
function runHelper(script, { table = '', lockRoot } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'infra436-'));
  const stub = path.join(dir, 'ps');
  // Fixture rows FIRST, then the REAL process table appended. The helper has to find this
  // very bash process in `ps` to record itself as owner, so a purely synthetic table would
  // make every acquire fail for a reason unrelated to what is under test. Fixture pids sit
  // above the macOS pid ceiling (99999), so they can never collide with a real row.
  fs.writeFileSync(stub, `#!/bin/sh\ncat <<'PSEOF'\n${table}\nPSEOF\nexec /bin/ps "$@"\n`, { mode: 0o755 });
  const root = lockRoot || fs.mkdtempSync(path.join(os.tmpdir(), 'infra436-root-'));

  const res = spawnSync('/bin/bash', ['-c', `. "${HELPER}"; ${script}`], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, E2E_LOCK_ROOT: root },
  });
  fs.rmSync(dir, { recursive: true, force: true });
  return {
    status: res.status,
    stdout: (res.stdout || '').trim(),
    stderr: (res.stderr || '').trim(),
    root,
  };
}

const LIVE_HOLDER = { pid: 999001, start: START_A, comm: 'bash' };

// --- The holder classifier --------------------------------------------------------

describe('holder classification decides whether a lock may be reclaimed', () => {
  it('reports LIVE when the pid exists and its start time matches the record', () => {
    const r = runHelper(`e2e_lock_holder_state 999001 "${START_A}"`, { table: psTable([LIVE_HOLDER]) });
    expect(r.stdout).toBe('LIVE');
  });

  it('reports DEAD when the pid is gone entirely (the crash case)', () => {
    const r = runHelper(`e2e_lock_holder_state 999001 "${START_A}"`, { table: psTable([]) });
    expect(r.stdout).toBe('DEAD');
  });

  it('reports RECYCLED when the pid exists but started at a different time', () => {
    // The silent-wrong-answer guard: without the start-time half, an unrelated process
    // that inherited the dead holder's pid would read as LIVE and wedge the gate forever.
    const r = runHelper(`e2e_lock_holder_state 999001 "${START_A}"`, {
      table: psTable([{ pid: 999001, start: START_B, comm: 'vim' }]),
    });
    expect(r.stdout).toBe('RECYCLED');
  });

  it('does not confuse a different pid whose start time happens to match', () => {
    const r = runHelper(`e2e_lock_holder_state 999001 "${START_A}"`, {
      table: psTable([{ pid: 999002, start: START_A, comm: 'bash' }]),
    });
    expect(r.stdout).toBe('DEAD');
  });

  it('an empty recorded start time is never treated as a match', () => {
    // Fail closed: a truncated or half-written owner record must not resolve to LIVE
    // (which would wedge) OR silently to DEAD via an empty-string comparison.
    const r = runHelper(`e2e_lock_holder_state 999001 ""`, { table: psTable([LIVE_HOLDER]) });
    expect(r.stdout).toBe('RECYCLED');
  });
});

// --- Acquire / release ------------------------------------------------------------

describe('acquiring an uncontended lock', () => {
  it('succeeds and records pid + start time + comm', () => {
    const r = runHelper(`e2e_lock_acquire "${UDID}" 1 && cat "$(e2e_lock_dir "${UDID}")/owner"`, {
      table: psTable([LIVE_HOLDER]),
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/^\d+\t.+\t.+/);
  });

  it('is exclusive: a second acquire in the same root does not also win', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra436-excl-'));
    const first = runHelper(`e2e_lock_acquire "${UDID}" 1`, { table: psTable([LIVE_HOLDER]), lockRoot: root });
    expect(first.status).toBe(0);
    // The recorded holder is the FIRST bash, which has since exited -> DEAD -> reclaimable.
    // Pin the holder as live so this asserts contention rather than reclaim.
    const [ownerPid, ownerStart] = fs
      .readFileSync(path.join(root, `sim-${UDID}.d`, 'owner'), 'utf8')
      .split('\t');
    // Replay the RECORDED start, not a synthetic one. The first bash has exited, so the
    // holder must be pinned live for this to assert contention; feeding START_A instead
    // would mismatch the record, classify RECYCLED, and silently turn this into a reclaim
    // test that passes for the opposite reason to the one named in the title.
    const second = runHelper(`e2e_lock_acquire "${UDID}" 1`, {
      table: psTable([{ pid: ownerPid, start: ownerStart, comm: 'bash' }]),
      lockRoot: root,
    });
    expect(second.status).not.toBe(0);
  });
});

describe('a lock held by a LIVE process blocks, then fails naming the holder', () => {
  it('times out non-zero and the message identifies the holder', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra436-live-'));
    fs.mkdirSync(path.join(root, `sim-${UDID}.d`), { recursive: true });
    fs.writeFileSync(path.join(root, `sim-${UDID}.d`, 'owner'), `999001\t${START_A}\tbash\tpeer-suite\n`);

    const r = runHelper(`e2e_lock_acquire "${UDID}" 1`, { table: psTable([LIVE_HOLDER]), lockRoot: root });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('999001');
    // A bare "could not acquire" would send someone hunting; the holder must be named.
    expect(r.stderr).toMatch(/peer-suite|bash/);
  });
});

describe('a lock held by a DEAD or RECYCLED process is reclaimed', () => {
  it('reclaims when the holder crashed (pid absent)', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra436-dead-'));
    fs.mkdirSync(path.join(root, `sim-${UDID}.d`), { recursive: true });
    fs.writeFileSync(path.join(root, `sim-${UDID}.d`, 'owner'), `999001\t${START_A}\tbash\tcrashed\n`);

    const r = runHelper(`e2e_lock_acquire "${UDID}" 1`, { table: psTable([]), lockRoot: root });
    expect(r.status).toBe(0);
  });

  it('reclaims when the pid was recycled by an unrelated process', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra436-recyc-'));
    fs.mkdirSync(path.join(root, `sim-${UDID}.d`), { recursive: true });
    fs.writeFileSync(path.join(root, `sim-${UDID}.d`, 'owner'), `999001\t${START_A}\tbash\told\n`);

    const r = runHelper(`e2e_lock_acquire "${UDID}" 1`, {
      table: psTable([{ pid: 999001, start: START_B, comm: 'Finder' }]),
      lockRoot: root,
    });
    expect(r.status).toBe(0);
  });

  it('reclaims when the owner record is missing entirely (half-created lock dir)', () => {
    // mkdir is atomic but the owner write is a separate step; a kill in between must not
    // wedge the gate permanently.
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra436-halfdir-'));
    fs.mkdirSync(path.join(root, `sim-${UDID}.d`), { recursive: true });

    const r = runHelper(`e2e_lock_acquire "${UDID}" 1`, { table: psTable([LIVE_HOLDER]), lockRoot: root });
    expect(r.status).toBe(0);
  });
});

describe('the lock is per-device', () => {
  it('a lock on one simulator does not block another', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra436-perdev-'));
    fs.mkdirSync(path.join(root, `sim-${UDID}.d`), { recursive: true });
    fs.writeFileSync(path.join(root, `sim-${UDID}.d`, 'owner'), `999001\t${START_A}\tbash\tpeer\n`);

    const r = runHelper(`e2e_lock_acquire "${OTHER_UDID}" 1`, { table: psTable([LIVE_HOLDER]), lockRoot: root });
    expect(r.status).toBe(0);
  });

  it('refuses an empty udid rather than locking a wildcard path', () => {
    // An empty key would collapse every device onto one lock — the same "empty match
    // string must never widen" rule INFRA-423 pins for the reaper.
    //
    // The `good` control is load-bearing, not decoration. Asserting only `status != 0`
    // passes against ANY broken state — including a helper that does not exist at all,
    // which is precisely how this spec went green before a line of the implementation was
    // written. The refusal only means something if the identical call shape SUCCEEDS with
    // a real udid under the same conditions.
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra436-emptyudid-'));
    const bad = runHelper(`e2e_lock_acquire "" 1`, { table: psTable([]), lockRoot: root });
    const good = runHelper(`e2e_lock_acquire "${UDID}" 1`, { table: psTable([]), lockRoot: root });

    expect(bad.status).not.toBe(0);
    expect(bad.stderr).toMatch(/udid/i);
    expect(good.status).toBe(0);
    expect(fs.existsSync(path.join(root, 'sim-.d'))).toBe(false);
  });
});

describe('release', () => {
  it('releases a lock this process owns', () => {
    const r = runHelper(
      `e2e_lock_acquire "${UDID}" 1 && e2e_lock_release "${UDID}" && ` +
        `{ [ -d "$(e2e_lock_dir "${UDID}")" ] && echo STILL_THERE || echo GONE; }`,
      { table: psTable([LIVE_HOLDER]) }
    );
    expect(r.stdout).toContain('GONE');
  });

  it('does NOT release a lock held by someone else', () => {
    // Releasing unconditionally in a trap would hand a peer's device away mid-flow —
    // the very interleaving this exists to prevent.
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra436-rel-'));
    fs.mkdirSync(path.join(root, `sim-${UDID}.d`), { recursive: true });
    fs.writeFileSync(path.join(root, `sim-${UDID}.d`, 'owner'), `999001\t${START_A}\tbash\tpeer\n`);

    const r = runHelper(
      `e2e_lock_release "${UDID}"; { [ -d "$(e2e_lock_dir "${UDID}")" ] && echo STILL_THERE || echo GONE; }`,
      { table: psTable([LIVE_HOLDER]), lockRoot: root }
    );
    expect(r.stdout).toContain('STILL_THERE');
  });
});

// --- The guard must be able to fail ------------------------------------------------

describe('the liveness check can still go red against a REAL live process', () => {
  // If this classifier silently stopped detecting holders, every session would win every
  // lock and the suite above would still be green — indistinguishable from a quiet machine.
  it('classifies this very jest process as LIVE using real ps output', () => {
    const realStart = spawnSync('/bin/sh', ['-c', `ps -axo pid=,lstart=,comm= | awk '$1 == ${process.pid}'`], {
      encoding: 'utf8',
    }).stdout.trim();
    expect(realStart).not.toBe('');
    const start = realStart.split(/\s+/).slice(1, 6).join(' ');

    // No ps stub: the helper runs against the real process table.
    const res = spawnSync('/bin/bash', ['-c', `. "${HELPER}"; e2e_lock_holder_state ${process.pid} "${start}"`], {
      encoding: 'utf8',
      env: { ...process.env },
    });
    expect((res.stdout || '').trim()).toBe('LIVE');
  });
});
