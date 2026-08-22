/**
 * INFRA-423 — the driver reset must reap by OWNERSHIP, not by a command-line substring.
 *
 * THE DEFECT THIS EXISTS FOR
 * ==========================
 * `e2e-safety.sh` reset the XCUITest driver between flows with
 *
 *     pkill -9 -f "test-without-building"
 *
 * `pkill -f` matches a SUBSTRING of every process's full command line. It is blind to
 * which worktree, session, or device owns a driver, so it reaped every driver on the
 * machine — including one another worktree's suite was actively using. It also matched
 * any *shell* that merely MENTIONED the string, which is the same inverted-guard bug
 * DEBUG-392 recorded for `pgrep -f`: Claude Code wraps Bash calls in `/bin/zsh -c '…'`,
 * so a check written that way matches its own wrapper. Correct when a human tests it
 * interactively, wrong when it runs from a script or an agent — which is why review does
 * not catch it.
 *
 * WHAT DEBUG-392 DID AND DID NOT FIX
 * ==================================
 * DEBUG-392 added `other_maestro_jvms()`, gating the reap on "no peer JVM is live". That
 * changed how OFTEN the pkill fired, never WHAT it targeted. Two gaps survived, and the
 * item's own headline incident is NOT one of them — that incident (2026-08-12 21:46:55)
 * predates the guard commit `8e4e9407` (22:16:19 the same day) by 29 minutes, and its
 * victim was mid-flow with a live JVM, i.e. exactly the case the guard now catches.
 *
 * What actually survives:
 *   1. When the reap DOES fire it is still machine-wide. A peer sitting between its own
 *      flows has no live JVM — it is in its own `sleep 8` settle — so the guard sees
 *      nothing, fires, and reaps a driver belonging to a run that is very much alive.
 *   2. The guard cannot tell a peer's LIVE JVM from a STALE driver left by this session's
 *      own crashed run, so it declines the self-recovery the reset exists for.
 *
 * WHY OWNERSHIP IS DECIDED BY PARENT, NOT BY DEVICE
 * =================================================
 * Captured live on this machine at planning (read-only `ps`, maestro 2.6.0):
 *
 *   pid    pgid   ppid   args
 *   47671  42244  42290  java … maestro.cli.AppKt test --device 5C81114E-… journal-crisis-scan.yaml
 *   47709  42244  47671  …/xcodebuild test-without-building -xctestrun /…/5C81114E-…  -destination id=5C81114E-…
 *
 * The driver is a DIRECT CHILD of the maestro JVM and inherits its PGID — maestro does
 * not daemonize it away. And the UDID really is in the driver's argv. But the same
 * capture killed UDID-as-ownership outright: TWO worktrees were pinned to the SAME
 * simulator simultaneously. On this machine the UDID is a DEVICE FILTER, never an owner.
 * Reaping `test-without-building + $SIM_UDID` would be the identical defect with a longer
 * pattern.
 *
 * So ownership is: **attributable to a live maestro JVM**. An orphan (`ppid 1`, JVM gone)
 * belongs to no running suite and is reaped — deliberately including a peer's crashed
 * leftover, which wedges the shared simulator and cannot be serving a live run. That one
 * rule serves both the never-reap-a-peer case and the self-recovery case with no state
 * file to rot, and no dependence on a PID that can be recycled.
 *
 * WHAT THIS SUITE PINS
 * ====================
 * The classifier, against SYNTHETIC `ps` tables — so both load-bearing ACs are proven
 * with zero signals sent, no simulator, and no live driver. One fixture is the VERBATIM
 * captured line above, so the matcher is pinned against reality rather than an invented
 * shape; and one is a `/bin/zsh -c` wrapper whose command line contains both
 * `test-without-building` and the UDID, which is the regression test for the entire
 * defect class. That wrapper row is not hypothetical — the planning probe that captured
 * the table produced exactly such a line.
 *
 * The suite also asserts the matcher can still GO RED (it matches the real driver), for
 * the reason CLAUDE.md already gives for `check:breathing-worklets` and DEBUG-390: a
 * structural assertion that cannot fail is worse than none. Here the specific hazard is
 * an over-narrow matcher that silently stops reaping — which looks identical to a healthy
 * quiet machine.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_APP = path.resolve(__dirname, '..', '..');
const HELPER = path.join(REPO_APP, 'scripts', 'e2e-driver-ownership.sh');

const UDID = '5C81114E-3891-40DD-9E7F-4511389F9C3F';
const OTHER_UDID = '5BAF97CA-1111-2222-3333-444455556666';

/** The real driver line, captured 2026-08-14 from maestro 2.6.0 + Xcode xcodebuild. */
const REAL_DRIVER_ARGS =
  '/Applications/Xcode.app/Contents/Developer/usr/bin/xcodebuild test-without-building ' +
  `-xctestrun /var/folders/l0/3pfcmjf97f3_2nw8ct1htwy40000gn/T/${UDID}2260908988885619994/maestro-driver-ios-config.xctestrun ` +
  `-destination id=${UDID} ` +
  '-derivedDataPath /var/folders/l0/T/maestro_xctestrunner_xcodebuild_output8064045307406885223';

const REAL_JVM_ARGS =
  'java -classpath /opt/homebrew/Cellar/maestro/2.6.0/libexec/lib/* maestro.cli.AppKt ' +
  `test --device ${UDID} .maestro/journal-crisis-scan.yaml`;

const XCODEBUILD_COMM = '/Applications/Xcode.app/Contents/Developer/usr/bin/xcodebuild';

/**
 * INFRA-476 — the fixture must model what `ps` ACTUALLY returns, per column form.
 *
 * This used to build ONE five-column table with the full `comm` path. Real macOS `ps`
 * cannot produce that: when `args` is requested in the same invocation, `comm` is capped
 * at 16 characters (measured — a 119-char comm renders as `/System/Library/`). So the
 * old fixture was unfaithful to the very command it claimed to exercise, and every
 * xcodebuild matcher passed here while matching nothing on a real machine.
 *
 * `psTable` is now just the row set; `runHelper` renders it per form.
 */
function psTable(rows) {
  return rows;
}

/** `comm` as macOS renders it when `args` shares the invocation: 16 chars, hard cap. */
const COMM_CAP = 16;

/**
 * Run one helper function with `ps` stubbed. The stub DISPATCHES ON ARGUMENT SHAPE so
 * each column form returns what the real tool returns for that form — including the
 * truncation, so a regression back to the single five-column read fails here.
 *
 * The stub is a real executable earlier on PATH, so the helper's own `ps` invocation is
 * exercised verbatim — we are testing the shipped command, not a re-implementation.
 */
function runHelper(fnCall, rows) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'infra423-'));
  const stub = path.join(dir, 'ps');

  const commTable = rows.map(r => `${r.pid} ${r.ppid} ${r.pgid} ${r.comm}`).join('\n');
  const argsTable = rows.map(r => `${r.pid} ${r.args}`).join('\n');
  const truncTable = rows
    .map(r => `${r.pid} ${r.ppid} ${r.pgid} ${r.comm.slice(0, COMM_CAP)} ${r.args}`)
    .join('\n');

  fs.writeFileSync(
    stub,
    `#!/bin/sh
case "$*" in
  *comm=*args=*) cat <<'PSEOF'
${truncTable}
PSEOF
  ;;
  *args=*) cat <<'PSEOF'
${argsTable}
PSEOF
  ;;
  *comm=*) cat <<'PSEOF'
${commTable}
PSEOF
  ;;
  *) exit 0 ;;
esac
`,
    { mode: 0o755 }
  );

  const res = spawnSync('/bin/bash', ['-c', `. "${HELPER}"; ${fnCall}`], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}` },
  });
  fs.rmSync(dir, { recursive: true, force: true });
  return {
    status: res.status,
    stdout: (res.stdout || '').trim(),
    pids: (res.stdout || '').trim().split(/\s+/).filter(Boolean),
  };
}

const reap = (table, ownPgid, udid) =>
  runHelper(`e2e_drivers_to_reap ${ownPgid} ${udid}`, table);

// --- Fixtures ---------------------------------------------------------------------

/** Our own run: JVM already reaped by `wait`, so our driver is an orphan of our PGID. */
const OURS = { pid: 200, ppid: 1, pgid: 100, comm: XCODEBUILD_COMM, args: REAL_DRIVER_ARGS };

/** A peer, mid-flow: live JVM parent, different PGID, SAME simulator. */
const PEER_JVM = { pid: 300, ppid: 299, pgid: 300, comm: 'java', args: REAL_JVM_ARGS };
const PEER_DRIVER = { pid: 301, ppid: 300, pgid: 300, comm: XCODEBUILD_COMM, args: REAL_DRIVER_ARGS };

/** A crashed run's leftover: JVM gone, reparented to launchd. */
const ORPHAN = { pid: 400, ppid: 1, pgid: 400, comm: XCODEBUILD_COMM, args: REAL_DRIVER_ARGS };

/** A driver on a different device entirely. */
const OTHER_DEVICE = {
  pid: 500, ppid: 1, pgid: 500, comm: XCODEBUILD_COMM,
  args: REAL_DRIVER_ARGS.split(UDID).join(OTHER_UDID),
};

/** THE defect-class row: a shell that merely MENTIONS the driver string and the UDID. */
const ZSH_WRAPPER = {
  pid: 600, ppid: 599, pgid: 600, comm: '/bin/zsh',
  args: `/bin/zsh -c ps -axww | grep test-without-building | grep ${UDID}`,
};

describe('a peer\'s live driver is never reaped (AC3)', () => {
  it('protects a driver whose parent is a live maestro JVM, on the same simulator', () => {
    const r = reap(psTable([PEER_JVM, PEER_DRIVER]), 100, UDID);
    expect(r.pids).not.toContain('301');
    expect(r.pids).toEqual([]);
  });

  it('still protects the peer when our own driver is present and reaped alongside', () => {
    const r = reap(psTable([OURS, PEER_JVM, PEER_DRIVER]), 100, UDID);
    expect(r.pids).toContain('200');
    expect(r.pids).not.toContain('301');
  });
});

describe('an ownerless driver IS reaped (AC4 — the self-recovery case)', () => {
  it('reaps an orphan whose maestro JVM has exited', () => {
    const r = reap(psTable([ORPHAN]), 100, UDID);
    expect(r.pids).toContain('400');
  });

  it('reaps a PEER\'s orphan too — an orphan belongs to no live run', () => {
    // Founder-approved widening beyond a literal "only THIS run": an orphaned driver
    // wedges the shared simulator and cannot be serving a suite that is still going.
    const r = reap(psTable([PEER_JVM, PEER_DRIVER, ORPHAN]), 100, UDID);
    expect(r.pids).toContain('400');
    expect(r.pids).not.toContain('301');
  });

  it('reaps our own driver by process group even before it is orphaned', () => {
    const ourLive = { ...OURS, ppid: 199, pgid: 100 };
    const ourJvm = { pid: 199, ppid: 198, pgid: 100, comm: 'java', args: REAL_JVM_ARGS };
    const r = reap(psTable([ourJvm, ourLive]), 100, UDID);
    expect(r.pids).toContain('200');
  });
});

describe('the substring-matching defect class cannot recur', () => {
  it('does not reap a shell that merely MENTIONS the driver string and the UDID', () => {
    // The exact shape that made `pgrep -f` fire on peers LOOKING for maestro rather than
    // on maestro (DEBUG-392), and that Claude Code's /bin/zsh -c wrapper reproduces.
    const r = reap(psTable([ZSH_WRAPPER]), 100, UDID);
    expect(r.pids).not.toContain('600');
    expect(r.pids).toEqual([]);
  });

  it('does not reap a driver pinned to a different simulator', () => {
    const r = reap(psTable([OTHER_DEVICE]), 100, UDID);
    expect(r.pids).not.toContain('500');
  });
});

describe('unknown parentage fails toward NOT killing (AC6)', () => {
  it('protects a driver whose live parent is not a maestro JVM', () => {
    // If a future maestro inserts a wrapper between JVM and xcodebuild, we degrade to
    // under-reaping rather than to reaping a peer.
    const wrapper = { pid: 700, ppid: 699, pgid: 700, comm: '/usr/bin/some-wrapper', args: 'some-wrapper --run' };
    const child = { pid: 701, ppid: 700, pgid: 700, comm: XCODEBUILD_COMM, args: REAL_DRIVER_ARGS };
    const r = reap(psTable([wrapper, child]), 100, UDID);
    expect(r.pids).not.toContain('701');
  });
});

describe('an empty UDID reaps nothing — an empty match string must never widen', () => {
  it('returns no pids when the udid argument is empty (device-only run)', () => {
    const r = reap(psTable([OURS, ORPHAN, PEER_JVM, PEER_DRIVER]), 100, '""');
    expect(r.pids).toEqual([]);
  });
});

describe('the matcher can still go red — it matches the REAL captured driver', () => {
  // A structural guard that silently stops matching looks exactly like a quiet machine.
  // This is the positive existence claim that turns "we found nothing" into a real signal.
  it('identifies the verbatim captured driver line as a driver', () => {
    const r = runHelper(`e2e_xcuitest_drivers ${UDID}`, psTable([PEER_JVM, PEER_DRIVER]));
    expect(r.stdout).toContain('301');
  });

  it('identifies the verbatim captured JVM line as a live maestro JVM', () => {
    const r = runHelper('e2e_maestro_jvm_pids', psTable([PEER_JVM, PEER_DRIVER]));
    expect(r.stdout.split(/\s+/)).toContain('300');
  });

  it('does NOT count the zsh wrapper as a live maestro JVM', () => {
    const mentioner = {
      pid: 800, ppid: 799, pgid: 800, comm: '/bin/zsh',
      args: '/bin/zsh -c pgrep -f maestro.cli.AppKt',
    };
    const r = runHelper('e2e_maestro_jvm_pids', psTable([mentioner]));
    expect(r.stdout).toBe('');
  });
});

/**
 * INFRA-476 — the truncation that made every xcodebuild matcher dead code.
 *
 * `_e2e_ps_table` read `ps -axo pid=,ppid=,pgid=,comm=,args=`. macOS caps `comm` at 16
 * characters whenever `args` is requested in the same invocation, so the driver's
 * `/Applications/Xcode.app/Contents/Developer/usr/bin/xcodebuild` arrived as
 * `/Applications/Xc` and could never satisfy `(^|/)xcodebuild$`. The java matchers kept
 * working because `java` is 4 characters — which is exactly why the asymmetry survived
 * review, and why the reap looked healthy on a quiet machine.
 *
 * These run REAL `ps`, no stub. They are the reason the helper makes two reads.
 */
describe('INFRA-476: real `ps` truncates comm when args shares the invocation', () => {
  const realPs = args =>
    spawnSync('/bin/sh', ['-c', `ps ${args}`], { encoding: 'utf8' }).stdout || '';

  const maxCommLen = out =>
    out
      .split('\n')
      .filter(Boolean)
      .reduce((m, line) => Math.max(m, (line.trim().split(/\s+/)[3] || '').length), 0);

  it('caps comm at 16 chars in the five-column form', () => {
    const five = maxCommLen(realPs('-axo pid=,ppid=,pgid=,comm=,args='));
    expect(five).toBeLessThanOrEqual(COMM_CAP);
  });

  it('returns comm in full when args is NOT requested', () => {
    const four = maxCommLen(realPs('-axo pid=,ppid=,pgid=,comm='));
    // Any real machine has at least one executable path longer than the 16-char cap.
    expect(four).toBeGreaterThan(COMM_CAP);
  });

  it('proves the old single-read form could not have matched a real xcodebuild path', () => {
    const truncated = XCODEBUILD_COMM.slice(0, COMM_CAP);
    expect(truncated).toBe('/Applications/Xc');
    expect(/(^|\/)xcodebuild$/.test(truncated)).toBe(false);
    // ...while the untruncated path, which the two-read helper now yields, does match.
    expect(/(^|\/)xcodebuild$/.test(XCODEBUILD_COMM)).toBe(true);
  });
});

/**
 * Liveness. A matcher that silently stops matching is indistinguishable from a quiet
 * machine, which is the failure this whole item exists to remove — so assert the shipped
 * matcher FIRES against the verbatim captured driver, through the real two-read path.
 */
describe('INFRA-476: the xcodebuild matcher fires through the two-read table', () => {
  it('finds the captured driver when comm arrives untruncated', () => {
    const r = runHelper(`e2e_xcuitest_drivers ${UDID}`, psTable([PEER_JVM, PEER_DRIVER]));
    expect(r.stdout).toContain('301');
  });

  it('reaps an orphaned xcodebuild driver — the case the truncation silently disabled', () => {
    const r = reap(psTable([ORPHAN]), 100, UDID);
    expect(r.pids).toContain('400');
  });
});
