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
function runHelper(script, { table = '', lockRoot, env = {} } = {}) {
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
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, E2E_LOCK_ROOT: root, ...env },
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

// --- Namespaces (INFRA-463) --------------------------------------------------------

describe('the lock guards two resources without letting them collide', () => {
  // The gate worktree is shared mutable state exactly as the simulator is, so it reuses this
  // primitive rather than re-deriving the holder logic — a re-derivation this subsystem has
  // already got wrong twice (DEBUG-392, INFRA-423).

  it('keeps the default path at sim-<udid>.d', () => {
    // Load-bearing compatibility, not cosmetics: worktrees hold independent copies of this
    // file, so a peer session on an older checkout must land on the SAME path as a newer
    // one. If the default moved, two sessions would each hold "the" lock and see no contest.
    const r = runHelper(`e2e_lock_dir "${UDID}"`, { table: psTable([]) });
    expect(r.stdout).toMatch(new RegExp(`/sim-${UDID}\\.d$`));
  });

  it('puts a gatetree lock on its own path', () => {
    const r = runHelper(`e2e_lock_dir "some_gate_path" gatetree`, { table: psTable([]) });
    expect(r.stdout).toMatch(/\/gatetree-some_gate_path\.d$/);
  });

  it('a held sim lock does not block the same key in the gatetree namespace', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra463-ns-'));
    fs.mkdirSync(path.join(root, `sim-${UDID}.d`), { recursive: true });
    fs.writeFileSync(path.join(root, `sim-${UDID}.d`, 'owner'), `999001\t${START_A}\tbash\tpeer\n`);

    const r = runHelper(`e2e_lock_acquire "${UDID}" 1 mine gatetree`, {
      table: psTable([LIVE_HOLDER]),
      lockRoot: root,
    });
    expect(r.status).toBe(0);
  });

  it('names the gate worktree, not the simulator, when a gatetree lock times out', () => {
    // A timeout that says "simulator lock" sends the operator into the wrong subsystem.
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra463-nsmsg-'));
    fs.mkdirSync(path.join(root, 'gatetree-k.d'), { recursive: true });
    fs.writeFileSync(path.join(root, 'gatetree-k.d', 'owner'), `999001\t${START_A}\tbash\tpeer\n`);

    const r = runHelper(`e2e_lock_acquire "k" 1 mine gatetree`, {
      table: psTable([LIVE_HOLDER]),
      lockRoot: root,
    });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/gate-worktree/i);
    expect(r.stderr).not.toMatch(/simulator/i);
  });

  it('releases only within its own namespace', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra463-nsrel-'));
    const r = runHelper(
      `e2e_lock_acquire "${UDID}" 1 mine gatetree && e2e_lock_release "${UDID}" && ` +
        `{ [ -d "$(e2e_lock_dir "${UDID}" gatetree)" ] && echo STILL_THERE || echo GONE; }`,
      { table: psTable([LIVE_HOLDER]), lockRoot: root }
    );
    // A release that ignored the namespace would silently free a lock it does not hold.
    expect(r.stdout).toContain('STILL_THERE');
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

// --- The PAIR, the override, and inheritance (INFRA-472) ---------------------------

/**
 * INFRA-472 — the gate leases TWO resources, and until now took them one at a time,
 * separately, at different moments.
 *
 * WHY A PAIR AND NOT TWO LOCKS. The provenance marker lives inside the INSTALLED CONTAINER
 * on a device, and `simctl install` of the same bundle id replaces it. So two sessions that
 * build in separate worktrees but install to one simulator still clobber each other — the
 * worktree lease alone does not cover the resource that actually carries the evidence.
 * CLAUDE.md already records that two worktrees routinely share one simulator.
 *
 * WHY ORDERING IS LOAD-BEARING. The moment a session holds one lease and waits for another,
 * two sessions taking them in opposite orders deadlock — for up to E2E_LOCK_TIMEOUT (1800 s
 * by default), which inside `/b-close` is indistinguishable from a hang. The fix is not
 * "be careful at the call site": it is that the pair helper sorts its own arguments, so
 * every caller acquires in the same global order whether it knows to or not.
 *
 * WHY INHERITANCE IS EXPLICIT AND DATA-CHECKED. `e2e-gate.sh` holds the simulator lease and
 * then invokes `e2e-sim-build.sh`, which acquires the same lease — a self-deadlock. The
 * child is told what its lineage already holds through the environment. It is NOT inferred
 * from the process tree: DEBUG-392 and INFRA-423 are two prior burns from process-identity
 * heuristics in this exact subsystem. And the token is not trusted on its own either — it
 * names a pid, and is honoured only when the on-disk owner record names that same pid AND
 * that pid classifies LIVE. A stale or hand-exported variable therefore falls through to a
 * normal acquire rather than silently disabling the lock.
 */

/** The real start time of this jest process — the only way to make a holder classify LIVE
 *  without a `ps` stub. A synthetic pid can never be LIVE against the real table. */
function realStartOf(pid) {
  const row = spawnSync('/bin/sh', ['-c', `ps -axo pid=,lstart=,comm= | awk '$1 == ${pid}'`], {
    encoding: 'utf8',
  }).stdout.trim();
  expect(row).not.toBe('');
  return row.split(/\s+/).slice(1, 6).join(' ');
}

function plantOwner(root, ns, key, { pid, start, comm = 'jest', label = 'peer', acquired } = {}) {
  const dir = path.join(root, `${ns}-${key}.d`);
  fs.mkdirSync(dir, { recursive: true });
  const fields = [pid, start, comm, label];
  if (acquired !== undefined) fields.push(acquired);
  fs.writeFileSync(path.join(dir, 'owner'), `${fields.join('\t')}\n`);
  return dir;
}

describe('the owner record carries when the lease was taken', () => {
  it('records an acquisition epoch alongside the holder identity', () => {
    // AC1 asks for "acquisition time". The existing record carries the holder PROCESS start
    // time, which is a different fact: a long-lived shell can acquire a lease hours after it
    // started, and "running since 09:02" then badly misreports how long the gate has been held.
    const before = Math.floor(Date.now() / 1000);
    const r = runHelper(`e2e_lock_acquire "${UDID}" 1 && cat "$(e2e_lock_dir "${UDID}")/owner"`, {
      table: psTable([LIVE_HOLDER]),
    });
    expect(r.status).toBe(0);
    const fields = r.stdout.split('\t');
    expect(fields.length).toBeGreaterThanOrEqual(5);
    const acquired = Number(fields[4]);
    expect(Number.isFinite(acquired)).toBe(true);
    expect(acquired).toBeGreaterThanOrEqual(before - 5);
  });

  it('reports it in the contention message, distinctly from the process start time', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra472-acq-'));
    plantOwner(root, 'sim', UDID, {
      pid: 999001,
      start: START_A,
      comm: 'bash',
      label: 'peer-suite',
      acquired: 1755400000,
    });

    const r = runHelper(`e2e_lock_acquire "${UDID}" 1`, { table: psTable([LIVE_HOLDER]), lockRoot: root });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/acquired/i);
    // Both facts present and labelled — "running since" alone is what this replaces.
    expect(r.stderr).toContain(START_A);
  });

  it('still reads a 4-field record written by an older checkout', () => {
    // Load-bearing compatibility, same reasoning as the sim-<udid>.d path: worktrees hold
    // independent copies of this file, so a peer on an older checkout writes 4 fields. If a
    // missing 5th field made the record unreadable it would classify RECYCLED and this
    // session would reclaim a LIVE peer's lease — the silent-wrong-answer failure.
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra472-compat-'));
    plantOwner(root, 'sim', UDID, { pid: 999001, start: START_A, comm: 'bash', label: 'old-peer' });

    const r = runHelper(`e2e_lock_acquire "${UDID}" 1`, { table: psTable([LIVE_HOLDER]), lockRoot: root });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('999001');
    expect(r.stderr).toMatch(/old-peer/);
  });
});

describe('the pair is acquired in one global order, all of it or none of it', () => {
  it('orders identically however the caller lists the two resources', () => {
    // The deadlock guard. If this ever returned argument order, two sessions calling with
    // opposite orders would each hold one lease and wait out the full timeout.
    const a = runHelper(`e2e_lock_pair_order sim "${UDID}" gatetree GATE`, { table: psTable([]) });
    const b = runHelper(`e2e_lock_pair_order gatetree GATE sim "${UDID}"`, { table: psTable([]) });
    expect(a.status).toBe(0);
    expect(a.stdout).not.toBe('');
    expect(b.stdout).toBe(a.stdout);
  });

  it('acquires both when both are free', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra472-pair-ok-'));
    const r = runHelper(
      `e2e_lock_acquire_pair sim "${UDID}" gatetree GATE 1 mine && ` +
        `{ [ -d "$(e2e_lock_dir "${UDID}")" ] && [ -d "$(e2e_lock_dir GATE gatetree)" ] && echo BOTH; }`,
      { table: psTable([LIVE_HOLDER]), lockRoot: root }
    );
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('BOTH');
  });

  it('releases the first when the second is held, leaving nothing dangling', () => {
    // AC2's real content. A partial acquire is worse than none: this session refuses anyway,
    // but a peer that only needed the OTHER resource is now blocked by a lease nobody holds
    // — and it is LIVE (this pid), so it is not reclaimable either.
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra472-pair-roll-'));
    plantOwner(root, 'sim', UDID, {
      pid: process.pid,
      start: realStartOf(process.pid),
      label: 'peer-flows',
    });

    const r = runHelper(
      `e2e_lock_acquire_pair sim "${UDID}" gatetree GATE 1 mine; ` +
        `echo "rc=$?"; [ -d "$(e2e_lock_dir GATE gatetree)" ] && echo LEAKED || echo CLEAN`,
      { lockRoot: root }
    );
    expect(r.stdout).toMatch(/rc=[1-9]/);
    expect(r.stdout).toContain('CLEAN');
  });

  it('refuses on the simulator even when the gate worktree is free', () => {
    // The pinned AC2 case, stated as the item states it: a device another session holds is
    // refused, not "the worktree was available so we proceeded".
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra472-pair-sim-'));
    plantOwner(root, 'sim', UDID, {
      pid: process.pid,
      start: realStartOf(process.pid),
      label: 'peer-flows',
    });

    const r = runHelper(`e2e_lock_acquire_pair sim "${UDID}" gatetree FREE 1 mine`, { lockRoot: root });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/peer-flows|simulator/i);
  });

  it('does NOT refuse when neither is held', () => {
    // The control for both refusals above: without it, a pair helper that always failed —
    // or one whose keys never matched — would keep them green.
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra472-pair-ctl-'));
    const r = runHelper(`e2e_lock_acquire_pair sim "${UDID}" gatetree FREE 1 mine`, {
      table: psTable([LIVE_HOLDER]),
      lockRoot: root,
    });
    expect(r.status).toBe(0);
  });
});

describe('a child process inherits its parent lease instead of deadlocking on it', () => {
  it('returns success without disturbing the record its lineage already holds', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra472-inh-'));
    const dir = plantOwner(root, 'sim', UDID, {
      pid: process.pid,
      start: realStartOf(process.pid),
      label: 'parent-gate',
    });
    const before = fs.readFileSync(path.join(dir, 'owner'), 'utf8');

    const r = runHelper(`e2e_lock_acquire "${UDID}" 1`, {
      lockRoot: root,
      env: { E2E_LOCK_INHERITED: `sim:${UDID}:${process.pid}` },
    });
    expect(r.status).toBe(0);
    // The parent still owns it. A child that overwrote the record would make the parent's
    // own release a no-op, leaking the lease for the rest of the machine's life.
    expect(fs.readFileSync(path.join(dir, 'owner'), 'utf8')).toBe(before);
  });

  it('does not let a child release what its parent holds', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra472-inh-rel-'));
    plantOwner(root, 'sim', UDID, {
      pid: process.pid,
      start: realStartOf(process.pid),
      label: 'parent-gate',
    });

    const r = runHelper(
      `e2e_lock_release "${UDID}"; [ -d "$(e2e_lock_dir "${UDID}")" ] && echo STILL_THERE || echo GONE`,
      { lockRoot: root, env: { E2E_LOCK_INHERITED: `sim:${UDID}:${process.pid}` } }
    );
    expect(r.stdout).toContain('STILL_THERE');
  });

  it('ignores a token whose pid is not the one on disk — a peer is still a peer', () => {
    // The hole this closes: if the token were trusted on its own, any stale or hand-exported
    // E2E_LOCK_INHERITED would wave a session straight past a LIVE peer's lease and into the
    // uninstall/install it exists to prevent.
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra472-inh-peer-'));
    plantOwner(root, 'sim', UDID, {
      pid: process.pid,
      start: realStartOf(process.pid),
      label: 'peer-flows',
    });

    const r = runHelper(`e2e_lock_acquire "${UDID}" 1`, {
      lockRoot: root,
      env: { E2E_LOCK_INHERITED: `sim:${UDID}:999001` },
    });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/peer-flows/);
  });

  it('falls through to a normal acquire when the named lease is not actually held', () => {
    // A token left over in an exported shell must not disable locking. Nothing is on disk,
    // so this must take the lease for real rather than assume it already has it.
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra472-inh-stale-'));
    const r = runHelper(
      `e2e_lock_acquire "${UDID}" 1 && cat "$(e2e_lock_dir "${UDID}")/owner"`,
      { table: psTable([LIVE_HOLDER]), lockRoot: root, env: { E2E_LOCK_INHERITED: `sim:${UDID}:999001` } }
    );
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/^\d+\t/);
  });
});

describe('the force override names what it is overriding', () => {
  it('reclaims a LIVE holder and prints the record it destroyed', () => {
    // AC6. Without an override a genuinely wedged holder — a process alive but no longer
    // doing anything — can only be cleared by `rm -rf`ing a path by hand, which is exactly
    // what the timeout message tells operators never to do.
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra472-force-'));
    plantOwner(root, 'sim', UDID, {
      pid: process.pid,
      start: realStartOf(process.pid),
      label: 'wedged-peer',
      acquired: 1755400000,
    });

    const r = runHelper(`e2e_lock_acquire "${UDID}" 1`, {
      lockRoot: root,
      env: { E2E_LOCK_FORCE: '1' },
    });
    expect(r.status).toBe(0);
    expect(r.stderr).toMatch(/force/i);
    expect(r.stderr).toContain('wedged-peer');
    expect(r.stderr).toContain(String(process.pid));
  });

  it('refuses the identical setup without the override', () => {
    // The control. An override that is always on is not an override, and every assertion
    // above would still pass.
    // NB: no "force" in the fixture prefix — the lock root is echoed in the timeout message,
    // so a prefix containing it would make the negative assertion below fail on its own path.
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra472-noovr-ctl-'));
    plantOwner(root, 'sim', UDID, {
      pid: process.pid,
      start: realStartOf(process.pid),
      label: 'wedged-peer',
    });

    const r = runHelper(`e2e_lock_acquire "${UDID}" 1`, { lockRoot: root });
    expect(r.status).not.toBe(0);
    // Not "the word force is absent" — the refusal legitimately OFFERS the override as the
    // remedy. The claim is that it did not FIRE, so assert on the banner and on the record
    // still being the peer's.
    expect(r.stderr).not.toMatch(/FORCE — overriding/);
    expect(fs.readFileSync(path.join(root, `sim-${UDID}.d`, 'owner'), 'utf8')).toContain('wedged-peer');
  });
});

describe('the holder is never identified by command-line text', () => {
  // DEBUG-392: `pgrep -f` / `pkill -f` match a SUBSTRING of a full command line, so they also
  // match any shell that merely MENTIONS the string — including Claude Code's own
  // `/bin/zsh -c '…'` wrapper. Correct when a human tests it interactively, wrong from a
  // script or an agent, which is why review does not catch it. Three independent derivations
  // of the broken form landed on one day; a structural pin is cheaper than a fourth.
  const files = ['e2e-sim-lock.sh', 'e2e-gate.sh'];

  it.each(files)('%s uses no pgrep -f / pkill -f in executable code', file => {
    const source = fs.readFileSync(path.join(REPO_APP, 'scripts', file), 'utf8');
    // Strip comments first. This repo deliberately NAMES the anti-pattern in prose to warn
    // the next reader off it (DEBUG-390), so a bare substring match hits the warning.
    const code = source.replace(/^\s*#.*$/gm, '');
    expect(code).not.toMatch(/\bp(grep|kill)\b/);
  });

  it('the comment stripper leaves real code behind, and the matcher still fires', () => {
    // A stripper plus a narrow regex is exactly the combination that can silently match
    // nothing at all. Prove both halves: the stripped source is substantive, and the pattern
    // still goes red against a known-bad line.
    const code = fs
      .readFileSync(HELPER, 'utf8')
      .replace(/^\s*#.*$/gm, '');
    expect(code).toMatch(/e2e_lock_acquire\(\)/);
    expect(code.length).toBeGreaterThan(500);
    expect('  pkill -f "test-without-building"').toMatch(/\bp(grep|kill)\b/);
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
