/**
 * INFRA-476 — the safety gate must SAY when the host is too busy for its own verdict to
 * mean anything, and must never refuse on that basis.
 *
 * WHY THIS EXISTS
 * ===============
 * The gate is single-DEVICE by construction (INFRA-405) but not single-MACHINE-RUN, and
 * nothing enforced that. Measured on one unchanged tree, Release build, clean provenance
 * (DEBUG-473): idle gave 1m57s x5 with <1% variance and PASS x5; two peer drivers plus an
 * Xcode build gave 2m21s / 15m12s / 45m20s and FAIL. A single `scrollUntilVisible`
 * iteration went from ~1.5s to 13.7s, and the failing element WANDERED between
 * `profile-card-export` and `profile-card-delete` across runs of a byte-identical tree.
 *
 * That is not flakiness — it is a false red carrying a plausible, specific, WRONG causal
 * story. DEBUG-473 was filed as a fold defect on the strength of one.
 *
 * WHAT IS PINNED HERE
 * ===================
 * 1. AC2 is STRUCTURAL, not stylistic: the reporter returns 0 on every path, including
 *    when contended and when `sysctl` is unavailable. A pre-flight that can refuse trains
 *    the `--skip-e2e` reflex it exists to prevent — a false "someone else is running"
 *    means the human does not run the gate at all, failing toward NOT TESTING (DEBUG-392).
 * 2. AC3: identity by EXECUTABLE. The `/bin/zsh -c '... maestro.cli.AppKt ...'` wrapper
 *    row is the regression test for the whole defect class.
 * 3. LIVENESS. A counter that silently reports zero looks exactly like a quiet machine —
 *    the one failure a warn-never-fail advisory cannot survive. So the matcher is asserted
 *    to FIRE against the verbatim captured driver and JVM lines.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_APP = path.resolve(__dirname, '..', '..');
const HELPER = path.join(REPO_APP, 'scripts', 'e2e-host-contention.sh');

const UDID = '5C81114E-3891-40DD-9E7F-4511389F9C3F';

/** Verbatim captures (maestro 2.6.0 + Xcode xcodebuild), same source as INFRA-423's suite. */
const XCODEBUILD_COMM = '/Applications/Xcode.app/Contents/Developer/usr/bin/xcodebuild';
const REAL_DRIVER_ARGS =
  `${XCODEBUILD_COMM} test-without-building ` +
  `-xctestrun /var/folders/l0/T/${UDID}/maestro-driver-ios-config.xctestrun -destination id=${UDID}`;
const REAL_JVM_ARGS =
  'java -classpath /opt/homebrew/Cellar/maestro/2.6.0/libexec/lib/* maestro.cli.AppKt ' +
  `test --device ${UDID} .maestro/journal-crisis-scan.yaml`;

/**
 * Run the helper with `ps` and `sysctl` stubbed as real executables earlier on PATH, so
 * the shipped commands are exercised verbatim rather than re-implemented.
 *
 * The `ps` stub dispatches on argument shape: since INFRA-476 the process table is read in
 * TWO invocations (macOS caps `comm` at 16 chars when `args` shares the call), so a stub
 * that answered one fixed table would not exercise the real path.
 */
function run(
  fnCall,
  { rows = [], loadavg = '{ 3.93 8.40 9.16 }', loadavgSeq = null, ncpu = '10', env = {} } = {}
) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'infra476-'));

  const commTable = rows.map(r => `${r.pid} ${r.ppid} ${r.pgid} ${r.comm}`).join('\n');
  const argsTable = rows.map(r => `${r.pid} ${r.args}`).join('\n');
  fs.writeFileSync(
    path.join(dir, 'ps'),
    `#!/bin/sh
case "$*" in
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

  // A SEQUENCE, not a constant: the settle loop re-reads load on every poll, so a stub
  // answering one fixed value could never distinguish "decayed below the threshold" from
  // "never moved". Reads past the end clamp to the last entry, which is what a host that
  // has stopped changing looks like.
  const seq = loadavgSeq || (loadavg === null ? null : [loadavg]);
  if (seq) fs.writeFileSync(path.join(dir, 'loadavg.seq'), `${seq.join('\n')}\n`);

  fs.writeFileSync(
    path.join(dir, 'sysctl'),
    `#!/bin/sh
D="${dir}"
case "$*" in
  *vm.loadavg*)
${
  seq === null
    ? '    exit 1'
    : `    N=$(cat "$D/loadavg.n" 2>/dev/null || echo 0); N=$((N + 1)); echo "$N" > "$D/loadavg.n"
    L=$(sed -n "\${N}p" "$D/loadavg.seq"); [ -n "$L" ] || L=$(tail -1 "$D/loadavg.seq")
    echo "$L"`
}
    ;;
  *hw.ncpu*)    ${ncpu === null ? 'exit 1' : `echo '${ncpu}'`} ;;
  *) exit 1 ;;
esac
`,
    { mode: 0o755 }
  );

  // Stubbed so a 120s bound costs no wall-clock, and so the test can assert HOW LONG the
  // settle believed it waited — a loop that returns instantly and one that honours its
  // bound are otherwise indistinguishable from the outside.
  fs.writeFileSync(
    path.join(dir, 'sleep'),
    `#!/bin/sh
echo "$1" >> "${dir}/sleeps"
exit 0
`,
    { mode: 0o755 }
  );

  const res = spawnSync('/bin/bash', ['-c', `. "${HELPER}"; ${fnCall}`], {
    encoding: 'utf8',
    env: { ...process.env, ...env, PATH: `${dir}:${process.env.PATH}` },
  });
  const sleepLog = path.join(dir, 'sleeps');
  const sleeps = fs.existsSync(sleepLog)
    ? fs.readFileSync(sleepLog, 'utf8').trim().split('\n').filter(Boolean).map(Number)
    : [];
  fs.rmSync(dir, { recursive: true, force: true });
  return {
    status: res.status,
    stdout: (res.stdout || '').trim(),
    stderr: (res.stderr || '').trim(),
    sleeps,
    slept: sleeps.reduce((a, b) => a + b, 0),
  };
}

const fact = (line, key) => {
  const m = line.match(new RegExp(`${key}=(\\S+)`));
  return m ? m[1] : undefined;
};

// --- Fixtures ----------------------------------------------------------------------
const PEER_JVM = { pid: 300, ppid: 299, pgid: 300, comm: 'java', args: REAL_JVM_ARGS };
const PEER_DRIVER = { pid: 301, ppid: 300, pgid: 300, comm: XCODEBUILD_COMM, args: REAL_DRIVER_ARGS };
const OUR_JVM = { pid: 200, ppid: 199, pgid: 100, comm: 'java', args: REAL_JVM_ARGS };
const OUR_DRIVER = { pid: 201, ppid: 200, pgid: 100, comm: XCODEBUILD_COMM, args: REAL_DRIVER_ARGS };
const COMPILE = {
  pid: 400, ppid: 399, pgid: 400, comm: XCODEBUILD_COMM,
  args: `${XCODEBUILD_COMM} -workspace Being.xcworkspace -scheme Being build`,
};
/** `_e2e_load1` reads field 2 of `{ a b c }`, so a ratio fixture only needs the 1-min slot. */
const LA = ratio => `{ ${(ratio * 10).toFixed(2)} 1.00 1.00 }`; // ncpu is 10 everywhere here

/** THE defect-class row: a shell that merely MENTIONS the strings. */
const ZSH_WRAPPER = {
  pid: 600, ppid: 599, pgid: 600, comm: '/bin/zsh',
  args: `/bin/zsh -c ps -axww | grep maestro.cli.AppKt | grep test-without-building`,
};

describe('counts peers by executable, never by command line (AC1, AC3)', () => {
  it('counts a peer maestro JVM and its driver separately from a plain compile', () => {
    const r = run('e2e_host_contention_facts ""', { rows: [PEER_JVM, PEER_DRIVER, COMPILE] });
    expect(fact(r.stdout, 'peer_jvms')).toBe('1');
    expect(fact(r.stdout, 'peer_drivers')).toBe('1');
    expect(fact(r.stdout, 'other_xcodebuild')).toBe('1');
  });

  it('does NOT count a shell that merely mentions maestro.cli.AppKt or the driver string', () => {
    // The exact shape that made `pgrep -f` fire on peers LOOKING for maestro rather than
    // on maestro. Claude Code wraps Bash calls in /bin/zsh -c, so this row is not
    // hypothetical — a check written against args matches its own wrapper.
    const r = run('e2e_host_contention_facts ""', { rows: [ZSH_WRAPPER] });
    expect(fact(r.stdout, 'peer_jvms')).toBe('0');
    expect(fact(r.stdout, 'peer_drivers')).toBe('0');
    expect(fact(r.stdout, 'other_xcodebuild')).toBe('0');
  });

  it('excludes our own process group — those are not peers', () => {
    const r = run('e2e_host_contention_facts 100', { rows: [OUR_JVM, OUR_DRIVER, PEER_JVM, PEER_DRIVER] });
    expect(fact(r.stdout, 'peer_jvms')).toBe('1');
    expect(fact(r.stdout, 'peer_drivers')).toBe('1');
  });

  it('counts everything as a peer at pre-flight, when nothing is ours yet', () => {
    // e2e-safety.sh passes "" here: no `$child` exists before the first flow.
    const r = run('e2e_host_contention_facts ""', { rows: [OUR_JVM, OUR_DRIVER] });
    expect(fact(r.stdout, 'peer_jvms')).toBe('1');
    expect(fact(r.stdout, 'peer_drivers')).toBe('1');
  });
});

describe('load is read against hw.ncpu, and degrades rather than failing', () => {
  it('computes the ratio from the 1-minute load average', () => {
    const r = run('e2e_host_contention_facts ""', { loadavg: '{ 12.50 8.40 9.16 }', ncpu: '10' });
    expect(fact(r.stdout, 'load1')).toBe('12.50');
    expect(fact(r.stdout, 'ncpu')).toBe('10');
    expect(fact(r.stdout, 'ratio')).toBe('1.25');
  });

  it('reports unknown and still exits 0 when sysctl is unavailable', () => {
    const r = run('e2e_host_contention_facts ""', { loadavg: null, ncpu: null });
    expect(r.status).toBe(0);
    expect(fact(r.stdout, 'load1')).toBe('unknown');
    expect(fact(r.stdout, 'ratio')).toBe('unknown');
  });
});

describe('AC2: it WARNS and NEVER FAILS — structural, not stylistic', () => {
  it('returns 0 when contended by peers', () => {
    const r = run(
      'f="$(e2e_host_contention_facts "")"; e2e_host_contention_warn "$f"',
      { rows: [PEER_JVM, PEER_DRIVER] }
    );
    expect(r.status).toBe(0);
    expect(r.stderr).toMatch(/HOST LOOKS CONTENDED/);
  });

  it('returns 0 when contended by load alone, with no peer processes', () => {
    const r = run('f="$(e2e_host_contention_facts "")"; e2e_host_contention_warn "$f"', {
      rows: [],
      loadavg: '{ 412.50 8.40 9.16 }',
    });
    expect(r.status).toBe(0);
    expect(r.stderr).toMatch(/HOST LOOKS CONTENDED/);
  });

  it('returns 0 and stays silent on a quiet host', () => {
    const r = run('f="$(e2e_host_contention_facts "")"; e2e_host_contention_warn "$f"', {
      rows: [],
      loadavg: '{ 3.20 4.00 5.00 }',
    });
    expect(r.status).toBe(0);
    expect(r.stderr).toBe('');
  });

  it('returns 0 even when sysctl is broken AND peers are present', () => {
    const r = run('f="$(e2e_host_contention_facts "")"; e2e_host_contention_warn "$f"', {
      rows: [PEER_DRIVER],
      loadavg: null,
      ncpu: null,
    });
    expect(r.status).toBe(0);
  });

  it('never tells the operator the run is blocked', () => {
    const r = run('f="$(e2e_host_contention_facts "")"; e2e_host_contention_warn "$f"', {
      rows: [PEER_JVM, PEER_DRIVER],
    });
    expect(r.stderr).toMatch(/ADVISORY/);
    expect(r.stderr).toMatch(/Nothing is blocked/);
    // Refusal VERBS, not the word "blocked" — the message says "Nothing is blocked",
    // which a crude /blocked/ would flag as the very thing it is denying.
    expect(r.stderr).not.toMatch(/\b(aborting|refusing|refused|will not run|cannot run)\b/i);
  });

  it('honours E2E_HOST_LOAD_WARN_RATIO', () => {
    const quiet = { rows: [], loadavg: '{ 5.00 1.00 1.00 }', ncpu: '10' }; // 0.5x
    expect(run('f="$(e2e_host_contention_facts "")"; e2e_host_contention_warn "$f"', quiet).stderr).toBe('');
    const strict = run('f="$(e2e_host_contention_facts "")"; e2e_host_contention_warn "$f"', {
      ...quiet,
      env: { E2E_HOST_LOAD_WARN_RATIO: '0.4' },
    });
    expect(strict.stderr).toMatch(/HOST LOOKS CONTENDED/);
    expect(strict.status).toBe(0);
  });
});

describe('LIVENESS — the counter can still go red', () => {
  // A matcher that silently reports zero is indistinguishable from a quiet machine, which
  // is precisely the reading this item exists to make trustworthy. Assert it FIRES against
  // the verbatim captured lines, through the real two-read ps path.
  it('fires on the verbatim captured driver line', () => {
    const r = run('e2e_host_contention_facts ""', { rows: [PEER_DRIVER] });
    expect(fact(r.stdout, 'peer_drivers')).toBe('1');
  });

  it('fires on the verbatim captured JVM line', () => {
    const r = run('e2e_host_contention_facts ""', { rows: [PEER_JVM] });
    expect(fact(r.stdout, 'peer_jvms')).toBe('1');
  });

  it('would have reported zero under the pre-INFRA-476 truncated comm', () => {
    // The regression this whole item turns on: `/Applications/Xc` cannot match
    // `(^|/)xcodebuild$`. If someone reverts the two-read table, this is what they get.
    expect(/(^|\/)xcodebuild$/.test(XCODEBUILD_COMM.slice(0, 16))).toBe(false);
    expect(/(^|\/)xcodebuild$/.test(XCODEBUILD_COMM)).toBe(true);
  });
});

// =====================================================================================
// INFRA-500 — the 1.0x threshold's "empty band" was unsampled, not empty
// =====================================================================================

describe('INFRA-500 AC1: the default threshold warns in the band the gate itself produces', () => {
  // The incident: a 1073s gate build left load1 at 14.88/10cpu, the flow run started
  // immediately into that decay at 0.91x, `daily-loop-quick-depth` failed at
  // scrollUntilVisible — and `grep -c 'HOST LOOKS CONTENDED'` on that run returned 0.
  it('warns at 0.91x, the reading that went unwarned', () => {
    const r = run('f="$(e2e_host_contention_facts "")"; e2e_host_contention_warn "$f"', {
      rows: [],
      loadavg: LA(0.91),
    });
    expect(r.stderr).toMatch(/HOST LOOKS CONTENDED/);
    expect(r.status).toBe(0);
  });

  // The floor is not free to move down. DEBUG-473 documents an idle ceiling of 0.3-0.5x
  // and INFRA-490 measured 0.26-0.29x on this machine; a threshold at or below 0.5x would
  // warn on genuinely quiet runs, which is how an advisory becomes wallpaper.
  it.each([0.26, 0.29, 0.5])('stays quiet at the observed idle ratio %sx', ratio => {
    const r = run('f="$(e2e_host_contention_facts "")"; e2e_host_contention_warn "$f"', {
      rows: [],
      loadavg: LA(ratio),
    });
    expect(r.stderr).toBe('');
  });

  it('quotes evidence from the band it now fires in, not only the severe one', () => {
    // Lowering the threshold without this makes the warning oversell: an operator at 0.8x
    // was being shown a case measured on a host 40x busier than theirs, which is the same
    // "plausible but wrong causal story" failure the item was filed against, inverted.
    const r = run('f="$(e2e_host_contention_facts "")"; e2e_host_contention_warn "$f"', {
      rows: [],
      loadavg: LA(0.91),
    });
    expect(r.stderr).toMatch(/INFRA-490/);
    expect(r.stderr).toMatch(/0\.91x/);
    expect(r.stderr).toMatch(/fixed-duration flows did not move/);
  });

  it('tells the operator which threshold produced the warning', () => {
    const r = run('f="$(e2e_host_contention_facts "")"; e2e_host_contention_warn "$f"', {
      rows: [],
      loadavg: LA(0.91),
    });
    expect(r.stderr).toMatch(/E2E_HOST_LOAD_WARN_RATIO \(current: 0\.7x\)/);
  });
});

describe('INFRA-500 AC5: the header records WHICH sample the number came from', () => {
  const src = fs.readFileSync(HELPER, 'utf8');

  it('no longer claims the band it splits is empty', () => {
    // Falsified, not refined — INFRA-490's telemetry contains the moderate band that
    // DEBUG-473's bimodal sample did not. Left standing, it is the exact sentence that
    // would talk the next reader out of re-deriving the number.
    expect(src).not.toMatch(/band it splits is empty/);
  });

  it('cites the INFRA-490 sample and the paired-flow evidence', () => {
    expect(src).toMatch(/INFRA-490/);
    expect(src).toMatch(/0\.91x/);
    // The reading that must survive: the stretch is SELECTIVE, concentrated in
    // scroll/wait-dominated flows, so a reader cannot infer "everything gets 40% slower".
    expect(src).toMatch(/scrollUntilVisible|scroll/i);
  });

  it('the matcher can still go red', () => {
    // A source assertion that matches nothing looks identical to one that passes.
    expect(/band it splits is empty/.test('so the band it splits is empty in the')).toBe(true);
    expect(src.length).toBeGreaterThan(2000);
  });
});

// =====================================================================================
// INFRA-500 AC2/AC3/AC4 — a BOUNDED SETTLE, which is a wait and never a refusal
// =====================================================================================

const SETTLE = 'f="$(e2e_host_settle "")"; echo "$f"';

describe('INFRA-500 AC2: a bounded post-build settle', () => {
  it('does not wait at all when the host is already quiet', () => {
    const r = run(SETTLE, { rows: [], loadavg: LA(0.29) });
    expect(r.sleeps).toEqual([]);
    expect(fact(r.stdout, 'settle')).toBe('quiet');
    expect(fact(r.stdout, 'settle_waited_s')).toBe('0');
  });

  it('waits, then proceeds once the load decays below the threshold', () => {
    const r = run(SETTLE, {
      rows: [],
      // 1.49x -> 1.10x -> 0.85x -> 0.62x: three polls of decay, as a 1-min load average
      // sheds a finished build.
      loadavgSeq: [LA(1.49), LA(1.1), LA(0.85), LA(0.62)],
      env: { E2E_HOST_SETTLE_MAX_S: '120', E2E_HOST_SETTLE_INTERVAL_S: '5' },
    });
    expect(fact(r.stdout, 'settle')).toBe('settled');
    expect(fact(r.stdout, 'settle_waited_s')).toBe('15');
    expect(r.slept).toBe(15);
    expect(r.stderr).toMatch(/settled/i);
  });

  it('returns the POST-settle reading, not the one that triggered the wait', () => {
    // Load-bearing: the caller feeds this line to the summary AND the warning. If it
    // carried the pre-settle figure, the gate would wait out the contention and then warn
    // about it anyway — reporting a host state that no longer exists.
    const r = run(SETTLE, {
      rows: [],
      loadavgSeq: [LA(1.49), LA(0.3)],
      env: { E2E_HOST_SETTLE_MAX_S: '120', E2E_HOST_SETTLE_INTERVAL_S: '5' },
    });
    expect(fact(r.stdout, 'ratio')).toBe('0.30');
  });

  it('proceeds when the bound expires with the host still loaded, and says so', () => {
    const r = run(SETTLE, {
      rows: [],
      loadavg: LA(1.2), // never decays
      env: { E2E_HOST_SETTLE_MAX_S: '20', E2E_HOST_SETTLE_INTERVAL_S: '5' },
    });
    expect(fact(r.stdout, 'settle')).toBe('timeout');
    expect(fact(r.stdout, 'settle_waited_s')).toBe('20');
    expect(r.slept).toBe(20);
    expect(r.status).toBe(0);
  });

  it('honours E2E_HOST_SETTLE_MAX_S=0 as "do not settle"', () => {
    const r = run(SETTLE, {
      rows: [],
      loadavg: LA(1.49),
      env: { E2E_HOST_SETTLE_MAX_S: '0' },
    });
    expect(r.sleeps).toEqual([]);
    expect(fact(r.stdout, 'settle')).toBe('disabled');
  });

  it('proceeds without waiting when sysctl gives no load at all', () => {
    const r = run(SETTLE, { rows: [], loadavg: null, ncpu: null });
    expect(r.sleeps).toEqual([]);
    expect(fact(r.stdout, 'settle')).toBe('unknown');
    expect(r.status).toBe(0);
  });
});

describe('INFRA-500: e2e-safety.sh actually goes through the settle', () => {
  // The one thing the jest suite cannot execute: the four lines in e2e-safety.sh that
  // consume this helper. Running them needs a booted simulator and an installed gate
  // target, so a typo'd function name would surface only as a live gate failure — at
  // which point it is someone else's close that pays. Pin the seam statically instead.
  const safety = fs.readFileSync(path.join(REPO_APP, 'scripts', 'e2e-safety.sh'), 'utf8');
  const helper = fs.readFileSync(HELPER, 'utf8');

  it('reads its host facts through a settle-capable entry point that exists', () => {
    const m = safety.match(/HOST_FACTS="\$\((e2e_host_\w+)\s+""\)"/);
    expect(m).not.toBeNull();
    expect(m[1]).toBe('e2e_host_settle');
    // …and that name resolves to a function the sourced helper defines.
    expect(helper).toMatch(new RegExp(`^${m[1]}\\(\\)\\s*\\{`, 'm'));
  });

  it('feeds the SAME post-settle reading to the summary and the warning', () => {
    // Re-reading the facts for either would report a host state that the settle has
    // already changed, which is the defect this item exists to remove, one step later.
    expect(safety).toMatch(/e2e_host_summary_line "\$HOST_FACTS"/);
    expect(safety).toMatch(/e2e_host_contention_warn "\$HOST_FACTS"/);
    expect(safety).not.toMatch(/e2e_host_(summary_line|contention_warn) "\$\(/);
  });

  it('the matchers can still go red', () => {
    expect(/HOST_FACTS="\$\((e2e_host_\w+)\s+""\)"/.test('HOST_FACTS="$(e2e_host_typo "")"')).toBe(true);
    expect(new RegExp('^e2e_host_settle\\(\\)\\s*\\{', 'm').test('e2e_host_settle() {')).toBe(true);
  });
});

describe('INFRA-500 AC3: a settle is a WAIT, never a refusal', () => {
  const timedOut = () =>
    run('f="$(e2e_host_settle "")"; e2e_host_contention_warn "$f"', {
      rows: [],
      loadavg: LA(1.2),
      env: { E2E_HOST_SETTLE_MAX_S: '10', E2E_HOST_SETTLE_INTERVAL_S: '5' },
    });

  it('exits 0 after the bound expires — the flows still run', () => {
    expect(timedOut().status).toBe(0);
  });

  it('uses no refusal verb on any settle path', () => {
    // Same matcher shape as the INFRA-476 test above: refusal VERBS, not the word
    // "blocked", because the advisory text says "Nothing is blocked".
    expect(timedOut().stderr).not.toMatch(
      /\b(aborting|refusing|refused|will not run|cannot run|skipping the gate)\b/i
    );
  });

  it('says out loud that waiting is not refusing', () => {
    const r = run(SETTLE, {
      rows: [],
      loadavg: LA(1.2),
      env: { E2E_HOST_SETTLE_MAX_S: '10', E2E_HOST_SETTLE_INTERVAL_S: '5' },
    });
    expect(r.stderr).toMatch(/not a refusal/i);
  });

  it('the source keeps the reasoning, not just the behaviour', () => {
    const src = fs.readFileSync(HELPER, 'utf8');
    expect(src).toMatch(/not a refusal|never a refusal/i);
    expect(src).toMatch(/--skip-e2e/);
  });
});

describe('INFRA-500 AC4: a peer\'s load is warned, not waited out', () => {
  it('does not spend the bound on a peer that cannot decay', () => {
    // A peer mid-build holds the host for as long as its build takes — up to 21 minutes
    // cold. No useful bound waits that out, so the honest move is to report it now.
    const r = run(SETTLE, { rows: [COMPILE], loadavg: LA(1.49) });
    expect(r.sleeps).toEqual([]);
    expect(fact(r.stdout, 'settle')).toBe('peers');
  });

  it('still warns after declining to wait', () => {
    const r = run('f="$(e2e_host_settle "")"; e2e_host_contention_warn "$f"', {
      rows: [PEER_JVM, PEER_DRIVER],
      loadavg: LA(1.49),
    });
    expect(r.stderr).toMatch(/HOST LOOKS CONTENDED/);
    expect(r.status).toBe(0);
  });

  it('a quiet host with a peer still warns, and never settles it away', () => {
    const r = run('f="$(e2e_host_settle "")"; e2e_host_contention_warn "$f"', {
      rows: [PEER_DRIVER],
      loadavg: LA(0.26),
    });
    expect(r.stderr).toMatch(/HOST LOOKS CONTENDED/);
  });
});

describe('elapsed formatting', () => {
  it.each([
    ['117', '1m57s'],
    ['2720', '45m20s'],
    ['45', '45s'],
    ['', '?s'],
  ])('formats %s as %s', (secs, want) => {
    expect(run(`e2e_fmt_elapsed "${secs}"`).stdout).toBe(want);
  });
});
