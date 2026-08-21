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
function run(fnCall, { rows = [], loadavg = '{ 3.93 8.40 9.16 }', ncpu = '10', env = {} } = {}) {
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

  fs.writeFileSync(
    path.join(dir, 'sysctl'),
    `#!/bin/sh
case "$*" in
  *vm.loadavg*) ${loadavg === null ? 'exit 1' : `echo '${loadavg}'`} ;;
  *hw.ncpu*)    ${ncpu === null ? 'exit 1' : `echo '${ncpu}'`} ;;
  *) exit 1 ;;
esac
`,
    { mode: 0o755 }
  );

  const res = spawnSync('/bin/bash', ['-c', `. "${HELPER}"; ${fnCall}`], {
    encoding: 'utf8',
    env: { ...process.env, ...env, PATH: `${dir}:${process.env.PATH}` },
  });
  fs.rmSync(dir, { recursive: true, force: true });
  return {
    status: res.status,
    stdout: (res.stdout || '').trim(),
    stderr: (res.stderr || '').trim(),
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
