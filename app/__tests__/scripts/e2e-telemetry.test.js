/**
 * INFRA-490 — lease waits and host contention, recorded rather than printed and dropped.
 *
 * WHY THIS EXISTS
 * ===============
 * Three locks exist (INFRA-436 simulator, INFRA-463 gate worktree, INFRA-472 the pair) and
 * none of them recorded anything, so "how often does a session actually wait, and for how
 * long?" had no answer. Every concurrency judgement to date rested on one captured
 * incident each — real, but a rate is not an anecdote. INFRA-476 already computed peer
 * JVM / driver / build counts and a load ratio, then printed an advisory and discarded it.
 *
 * WHAT THIS SUITE PINS
 * ====================
 * Three things, each of which is a way this could be built and be useless:
 *
 *   1. THE DENOMINATOR. A zero-wait acquire must be recorded. A log holding only the waits
 *      cannot say whether waiting is common or vanishingly rare, which is the only question
 *      INFRA-491 has to answer.
 *   2. THE PATH. The file must sit outside every worktree. e2e-provenance.js fingerprints
 *      UNTRACKED file contents repo-wide, so a log under the repo makes the next verify
 *      return MISMATCH and forces a rebuild on every gate run.
 *   3. FAIL-OPEN. Telemetry that can fail an acquire is worse than no telemetry: it would
 *      make the gate less reliable in the name of measuring its reliability.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_APP = path.resolve(__dirname, '..', '..');
const HELPER = path.join(REPO_APP, 'scripts', 'e2e-telemetry.sh');

/** Run helper functions with the log pointed at a throwaway file. */
function run(script, { file, env = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'infra490-'));
  const logFile = file || path.join(dir, 'events.jsonl');
  const res = spawnSync('/bin/bash', ['-c', `. "${HELPER}"; ${script}`], {
    encoding: 'utf8',
    env: { ...process.env, E2E_TELEMETRY_FILE: logFile, ...env },
  });
  const lines = fs.existsSync(logFile)
    ? fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean)
    : [];
  return {
    status: res.status,
    stdout: (res.stdout || '').trim(),
    stderr: (res.stderr || '').trim(),
    dir,
    logFile,
    lines,
    records: lines.map(l => JSON.parse(l)),
  };
}

const FACTS = 'peer_jvms=2 peer_drivers=1 other_xcodebuild=1 load1=31.5 ncpu=10 ratio=3.15';

// --- The path (AC4) ---------------------------------------------------------------

describe('the log lives outside every worktree', () => {
  it('defaults to a shared /tmp path, not $TMPDIR and not the repo', () => {
    // $TMPDIR is per-user private on macOS and the repo is fingerprinted by
    // e2e-provenance.js; both are disqualifying for different reasons.
    const r = run('printf "%s\\n" "$E2E_TELEMETRY_FILE"', { env: { E2E_TELEMETRY_FILE: '' } });
    expect(r.stdout).toBe('/tmp/being-e2e-telemetry/events.jsonl');
    expect(r.stdout.startsWith('/tmp/')).toBe(true);
  });

  it('the default path is not inside this repo', () => {
    const r = run('printf "%s\\n" "$E2E_TELEMETRY_FILE"', { env: { E2E_TELEMETRY_FILE: '' } });
    const repoRoot = path.resolve(REPO_APP, '..');
    expect(r.stdout).not.toBe('');
    expect(r.stdout.startsWith(repoRoot)).toBe(false);
  });

  it('creates the directory on first write', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'infra490-nested-'));
    const nested = path.join(dir, 'a', 'b', 'events.jsonl');
    const r = run('e2e_telemetry_lock 1000 sim UDID acquired 0 gate', { file: nested });
    expect(r.status).toBe(0);
    expect(r.records).toHaveLength(1);
  });
});

// --- Lock records (AC1, AC2) ------------------------------------------------------

describe('every acquire records an outcome', () => {
  it('records namespace, key, wait duration and outcome for a zero-wait acquire', () => {
    // THE DENOMINATOR. Without this row a wait distribution has no population.
    const r = run('e2e_telemetry_lock 1755000000 sim ABC-123 acquired 0 "gate build"');
    expect(r.records).toHaveLength(1);
    expect(r.records[0]).toMatchObject({
      kind: 'lock',
      epoch: 1755000000,
      ns: 'sim',
      key: 'ABC-123',
      outcome: 'acquired',
      waited_s: 0,
      contended: false,
      label: 'gate build',
    });
    expect(typeof r.records[0].pid).toBe('number');
  });

  it('marks a non-zero wait contended and carries the holder pid and label (AC2)', () => {
    const r = run(
      'e2e_telemetry_lock 1755000000 gatetree GATE refused 1800 "safety flows" 4242 "gate build"'
    );
    expect(r.records[0]).toMatchObject({
      ns: 'gatetree',
      outcome: 'refused',
      waited_s: 1800,
      contended: true,
      holder_pid: 4242,
      holder_label: 'gate build',
    });
  });

  it('omits holder fields when none was observed, rather than writing nulls', () => {
    const r = run('e2e_telemetry_lock 1755000000 sim ABC acquired 0 gate');
    expect(r.records[0]).not.toHaveProperty('holder_pid');
    expect(r.records[0]).not.toHaveProperty('holder_label');
  });

  it('carries the reclaimed-stale outcome distinctly from a plain acquire', () => {
    // A reclaim means the previous holder crashed. Folding it into `acquired` would hide
    // exactly the failure rate INFRA-491 needs to weigh.
    const r = run('e2e_telemetry_lock 1755000000 sim ABC reclaimed-stale 2 gate 999 dead-peer');
    expect(r.records[0].outcome).toBe('reclaimed-stale');
  });

  it('records a forced override as a flag, not as a fourth outcome', () => {
    const r = run('e2e_telemetry_lock 1755000000 sim ABC acquired 3 gate 999 peer 1');
    expect(r.records[0]).toMatchObject({ outcome: 'acquired', forced: true });
  });
});

describe('the log is valid JSON under hostile input', () => {
  it('escapes quotes and backslashes in a label', () => {
    // Single-quoted in the shell, so bash passes the backslash through verbatim.
    const r = run(`e2e_telemetry_lock 1755000000 sim ABC acquired 0 'he said "hi" c:\\x'`);
    expect(r.records[0].label).toBe('he said "hi" c:\\x');
  });

  it('flattens a newline in a label so one record stays one line', () => {
    // A label is env-supplied (E2E_LOCK_LABEL). A raw newline would split one record into
    // two unparseable ones and silently corrupt every later reader.
    const r = run(`e2e_telemetry_lock 1755000000 sim ABC acquired 0 "$(printf 'a\\nb')"`);
    expect(r.lines).toHaveLength(1);
    expect(r.records[0].label).toBe('a b');
  });

  it('keeps a record comfortably under PIPE_BUF so concurrent appends stay atomic', () => {
    // Nothing locks the log — several sessions append at once. A single write() under
    // 4096 bytes is atomic; a longer line could interleave. This is the guard on that.
    const r = run('e2e_telemetry_lock 1755000000 sim 5C81114E-3891-40DD-9E7F-4511389F9C3F acquired 12 "safety flows" 4242 "gate build"');
    expect(r.lines[0].length).toBeLessThan(1024);
  });
});

// --- Flow records (AC3) -----------------------------------------------------------

describe('a flow run is recorded with its host reading, wall-clock and verdict', () => {
  it('carries the INFRA-476 facts alongside the verdict and elapsed seconds', () => {
    const r = run(`e2e_telemetry_flow q9-single-alert FAIL 912 402x874 "${FACTS}"`);
    expect(r.records[0]).toMatchObject({
      kind: 'flow',
      flow: 'q9-single-alert',
      verdict: 'FAIL',
      elapsed_s: 912,
      viewport: '402x874',
      peer_jvms: 2,
      peer_drivers: 1,
      other_xcodebuild: 1,
      load1: 31.5,
      ncpu: 10,
      ratio: 3.15,
    });
  });

  it('degrades to null rather than writing invalid JSON when sysctl gave nothing', () => {
    const r = run(
      'e2e_telemetry_flow q9 PASS 117 unknown "peer_jvms=0 peer_drivers=0 other_xcodebuild=0 load1=unknown ncpu=unknown ratio=unknown"'
    );
    expect(r.records[0]).toMatchObject({ verdict: 'PASS', load1: null, ratio: null });
  });

  it('groups a suite by the writing pid, so flows of one invocation stay correlatable', () => {
    const r = run('e2e_telemetry_flow a PASS 1 v "" ; e2e_telemetry_flow b PASS 2 v ""');
    expect(r.records[0].pid).toBe(r.records[1].pid);
  });
});

// --- Fail-open (AC6, and the gate's reliability) ----------------------------------

describe('telemetry never fails the thing it measures', () => {
  it('returns 0 when the log path is unwritable', () => {
    const r = run('e2e_telemetry_lock 1 sim ABC acquired 0 gate; echo "rc=$?"', {
      file: '/dev/null/nope/events.jsonl',
    });
    expect(r.stdout).toBe('rc=0');
  });

  it('writes nothing and returns 0 when disabled', () => {
    const r = run('e2e_telemetry_lock 1 sim ABC acquired 0 gate; echo "rc=$?"', {
      env: { E2E_TELEMETRY: '0' },
    });
    expect(r.stdout).toBe('rc=0');
    expect(r.lines).toHaveLength(0);
  });

  it('appends rather than truncating, so a peer session does not lose its rows', () => {
    const r = run(
      'e2e_telemetry_lock 1 sim A acquired 0 g; e2e_telemetry_lock 2 sim B acquired 0 g; e2e_telemetry_lock 3 sim C acquired 0 g'
    );
    expect(r.records.map(x => x.key)).toEqual(['A', 'B', 'C']);
  });
});

// --- The summariser (AC5) ---------------------------------------------------------

describe('the log can be read back (AC5)', () => {
  /** waits, in seconds, one lock record each. */
  function seed(waits, extra = []) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'infra490-seed-'));
    const file = path.join(dir, 'events.jsonl');
    const rows = waits.map((w, i) =>
      JSON.stringify({
        epoch: 1755000000 + i, kind: 'lock', ns: 'sim', key: 'K', outcome: 'acquired',
        waited_s: w, contended: w > 0, pid: 1, label: 'gate',
      })
    );
    fs.writeFileSync(file, rows.concat(extra.map(e => JSON.stringify(e))).join('\n') + '\n');
    return file;
  }

  it('reports median and p90 wait by nearest rank', () => {
    // 10 values 1..10: p50 = rank 5, p90 = rank 9.
    const file = seed([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const r = run(`e2e_telemetry_summary "${file}"`);
    expect(r.stdout).toMatch(/median\s+5s/);
    expect(r.stdout).toMatch(/p90\s+9s/);
  });

  it('counts zero-wait acquires in the distribution, not just the contended ones', () => {
    // Nine instant acquires and one long wait is a healthy machine. Reporting p90 over the
    // waits ALONE would call it a 60s p90 and read as a crisis.
    const file = seed([0, 0, 0, 0, 0, 0, 0, 0, 0, 60]);
    const r = run(`e2e_telemetry_summary "${file}"`);
    expect(r.stdout).toMatch(/median\s+0s/);
    expect(r.stdout).toMatch(/contended[^\n]*10(\.0)?%/);
  });

  it('reports refusals and the outcome breakdown', () => {
    const file = seed([0, 0], [
      { epoch: 1, kind: 'lock', ns: 'sim', key: 'K', outcome: 'refused', waited_s: 1800, contended: true, pid: 1, label: 'g' },
      { epoch: 2, kind: 'lock', ns: 'sim', key: 'K', outcome: 'reclaimed-stale', waited_s: 2, contended: true, pid: 1, label: 'g' },
    ]);
    const r = run(`e2e_telemetry_summary "${file}"`);
    expect(r.stdout).toMatch(/refused\s+1/);
    expect(r.stdout).toMatch(/reclaimed-stale\s+1/);
  });

  it('excludes inherited acquires from the contended rate', () => {
    // An inherited lease is a child honouring its parent's hold. It could never have
    // waited, so counting it would dilute the rate toward zero by construction.
    const file = seed([0, 10], [
      { epoch: 3, kind: 'lock', ns: 'sim', key: 'K', outcome: 'inherited', waited_s: 0, contended: false, pid: 1, label: 'g' },
      { epoch: 4, kind: 'lock', ns: 'sim', key: 'K', outcome: 'inherited', waited_s: 0, contended: false, pid: 1, label: 'g' },
    ]);
    const r = run(`e2e_telemetry_summary "${file}"`);
    expect(r.stdout).toMatch(/contended[^\n]*50(\.0)?%/);
  });

  it('summarises flow runs beside the lock waits', () => {
    const file = seed([0], [
      { epoch: 5, kind: 'flow', flow: 'q9', verdict: 'PASS', elapsed_s: 117, pid: 1, ratio: 0.4 },
      { epoch: 6, kind: 'flow', flow: 'gad7', verdict: 'FAIL', elapsed_s: 912, pid: 1, ratio: 3.1 },
    ]);
    const r = run(`e2e_telemetry_summary "${file}"`);
    expect(r.stdout).toMatch(/flow runs\s+2/);
    expect(r.stdout).toMatch(/FAIL\s+1/);
  });

  it('says the log is empty rather than printing a table of zeroes', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'infra490-empty-'));
    const r = run(`e2e_telemetry_summary "${path.join(dir, 'nope.jsonl')}"`);
    expect(r.stdout).toMatch(/no telemetry/i);
    expect(r.status).toBe(0);
  });
});

// --- The wiring into e2e-safety.sh (AC3) ------------------------------------------

describe('the gate actually records each flow', () => {
  /**
   * Source-shape rather than executable, for the reason e2e-safety-gate-marker.test.js
   * gives: the flow loop lives inside a script that runs on source, so it cannot be
   * `.`-sourced the way the helpers above can. Comments are stripped first (DEBUG-390):
   * this file deliberately names anti-patterns in prose, and a bare substring match would
   * be satisfied by the comment explaining a call rather than by the call.
   */
  const RAW = fs.readFileSync(path.join(REPO_APP, 'scripts', 'e2e-safety.sh'), 'utf8');
  const CODE = RAW.split('\n').filter(l => !/^\s*#/.test(l)).join('\n');

  const CALL = /e2e_telemetry_flow\s+"\$name"/;

  it('the comment stripper leaves real code behind, and the matcher still fires', () => {
    // A stripped-source matcher that silently matches nothing looks exactly like a passing
    // pin. Prove both halves before trusting the assertions below.
    expect(CODE.length).toBeGreaterThan(1000);
    expect(CODE).not.toMatch(/^\s*# INFRA-490/m);
    expect(CALL.test('  e2e_telemetry_flow "$name" "$flow_outcome" "$flow_secs" \\')).toBe(true);
    expect(CALL.test('  echo telemetry')).toBe(false);
  });

  it('sources the writer explicitly rather than relying on e2e-sim-lock.sh', () => {
    // Transitive: e2e-sim-lock.sh pulls the writer in today. Reordering the sources above
    // it should not silently stop the gate recording itself.
    expect(CODE).toMatch(/\.\s+"\$\(dirname "\$0"\)\/e2e-telemetry\.sh"/);
  });

  it('records the flow with the host facts taken at gate start', () => {
    expect(CODE).toMatch(CALL);
    const call = CODE.slice(CODE.search(CALL), CODE.search(CALL) + 220);
    expect(call).toContain('"$HOST_FACTS"');
    expect(call).toContain('"$flow_secs"');
    expect(call).toContain('"$flow_outcome"');
  });

  it('records after the verdict is decided, never before', () => {
    // Emitted at the top of the loop the outcome would always be the PREVIOUS flow's — the
    // kind of off-by-one that produces a plausible, fully-populated, wrong log.
    expect(CODE.indexOf('flow_outcome=FAIL')).toBeGreaterThan(-1);
    expect(CODE.search(CALL)).toBeGreaterThan(CODE.indexOf('flow_outcome=FAIL'));
  });

  it('renders the summary line from the same seconds it records', () => {
    // One source for both, so a reader cannot be shown 1m57s while the log holds something
    // else.
    expect(CODE).toMatch(/flow_secs=\$\(\(\s*\$\(date \+%s\) - flow_t0\s*\)\)/);
    expect(CODE).toMatch(/flow_elapsed="\$\(e2e_fmt_elapsed "\$flow_secs"\)"/);
  });
});

// --- Degradation when the writer is absent ----------------------------------------

describe('a missing writer degrades the gate to no-ops, never to a failure', () => {
  /** Stage e2e-sim-lock.sh alone, with no e2e-telemetry.sh beside it. */
  function stageLockWithoutWriter() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'infra490-noheler-'));
    fs.copyFileSync(path.join(REPO_APP, 'scripts', 'e2e-sim-lock.sh'), path.join(dir, 'e2e-sim-lock.sh'));
    return dir;
  }

  it('still acquires, under the same `set -e` the gate build runs with', () => {
    // An unconditional source of an absent file aborts e2e-sim-build.sh outright under its
    // `set -euo pipefail`. A gate that refuses to run because it cannot measure itself is
    // the exact inversion this telemetry exists to avoid.
    const dir = stageLockWithoutWriter();
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra490-nohelper-root-'));
    const res = spawnSync(
      '/bin/bash',
      ['-c', `set -euo pipefail; . "${dir}/e2e-sim-lock.sh"; e2e_lock_acquire KEY 1 lbl; echo "rc=$?"`],
      { encoding: 'utf8', env: { ...process.env, E2E_LOCK_ROOT: root } }
    );
    expect(res.status).toBe(0);
    expect((res.stdout || '').trim()).toBe('rc=0');
  });

  it('says so out loud — a recorder that stops recording must not look like a quiet machine', () => {
    const dir = stageLockWithoutWriter();
    const res = spawnSync('/bin/bash', ['-c', `. "${dir}/e2e-sim-lock.sh"; true`], { encoding: 'utf8' });
    expect(res.stderr).toMatch(/telemetry.*off for this run/i);
  });
});
