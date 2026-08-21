/**
 * DEBUG-496 — e2e-safety.sh's exit alphabet, pinned per class.
 *
 * THE DEFECT THIS EXISTS FOR
 * ==========================
 * The gate owns a four-token alphabet that `/b-close` Step 2.5.5 routes the merge decision
 * on, and that `/b-batch` reaches indirectly through the message `/b-close` prints:
 *
 *     0  every flow passed
 *     1  a Maestro safety flow FAILED — a regression in the branch under test
 *     2  the harness could not complete — no verdict was produced
 *     3  the gate target was replaced mid-suite (INFRA-434)
 *
 * `SIM_UDID="$(e2e_resolve_sim_device "safety gate")" || exit 1` discarded the resolver's
 * refusal and reported 1. So on 2026-08-20, during the MAINT-487 close, a peer session
 * booting a second simulator made the resolver refuse — correctly, because simctl's
 * `booted` is ambiguous — and the gate announced a crisis-flow regression on a branch that
 * then passed 9/9 when re-run pinned. 1 and 2 exist as separate codes precisely because
 * they demand opposite responses; collapsing them puts a confusing red in front of someone
 * mid-close, which is the documented pressure that produces a reflexive `--skip-e2e`.
 *
 * WHY THE FIX IS A COLLAPSE AND NOT A PROPAGATION
 * ===============================================
 * The obvious repair — capture the resolver's status and pass it through — is WRONG, and
 * wrong in a way that reads as more careful than the bug. `e2e_resolve_sim_device` has its
 * OWN private alphabet (1 = could not enumerate, 2 = none booted, 3 = ambiguous / bad
 * override), and it collides numerically with the gate's while meaning something else
 * entirely: propagating its 3 would announce INFRA-434's "a peer replaced the installed
 * binary mid-suite" for what is actually "two simulators are booted". Every refusal arm of
 * the resolver is one fact to this script — no target, therefore no flow ran, therefore no
 * verdict — so all of them collapse to 2. The tests below drive each arm SEPARATELY for
 * that reason: a single case would be satisfied by a propagation that is right once by
 * coincidence.
 *
 * WHY A SEPARATE SANDBOX FROM e2e-sim-build.test.js
 * =================================================
 * That file's `runSafety()` runs the gate against a real built artifact, which is what its
 * subject (provenance) requires and what makes it slow. Every refusal pinned here fires
 * BEFORE the container pre-flight — the resolver is line 1 of target selection — so a
 * sandbox that stages the sourced helpers and stops there exercises the arms under test
 * exactly, in milliseconds, following the self-contained shape of e2e-gate.test.js and
 * e2e-sim-lock.test.js. The 0 / 1 / 3 arms of AC2 are NOT re-implemented here: they need a
 * real artifact and are pinned to exact codes in e2e-sim-build.test.js, where that harness
 * already lives. Duplicating it would test the duplicate.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPTS = path.resolve(__dirname, '..', '..', 'scripts');

/** Everything e2e-safety.sh sources. A missing one dies on the source line, not under test. */
const SOURCED = [
  'e2e-safety.sh',
  'e2e-sim-device.sh',
  'e2e-real-device.sh',
  'e2e-driver-ownership.sh',
  'e2e-sim-lock.sh',
  'e2e-host-contention.sh',
  'e2e-telemetry.sh',
];

const SIM_A = 'AAAA-1111';
const SIM_B = 'BBBB-2222';
const DEV_1 = 'DEV-1111';
const DEV_2 = 'DEV-2222';

function writeStub(dir, name, body) {
  const p = path.join(dir, name);
  fs.writeFileSync(p, `#!/usr/bin/env bash\n${body}\n`, { mode: 0o755 });
  return p;
}

function bootedJson(udids) {
  return JSON.stringify({
    devices: {
      'com.apple.CoreSimulator.SimRuntime.iOS-18-6': udids.map((udid) => ({
        udid,
        // Named so e2e_warn_if_not_smallest_viewport stays quiet — its warning is
        // informational and must not be confused for the refusal under test.
        name: 'iPhone SE (3rd generation)',
        state: 'Booted',
      })),
    },
  });
}

function devicesJson(udids) {
  return JSON.stringify({
    result: {
      devices: udids.map((udid) => ({
        hardwareProperties: { udid, platform: 'iOS', deviceType: 'iPhone', productType: 'iPhone17,1' },
        deviceProperties: { name: `iPhone ${udid}` },
        connectionProperties: { pairingState: 'paired', tunnelState: 'connected' },
      })),
    },
  });
}

/**
 * A project root the script's `cd "$(dirname "$0")/.."` lands in, with the real helpers
 * staged and `xcrun` shimmed off state files so a case can describe the machine it needs.
 *
 * `simctlFails` is the distinct third refusal arm: "could not enumerate" is NOT the same
 * fact as "none booted" — the resolver says so in its own message — and both must reach
 * the same gate-level code by way of different resolver codes.
 */
function makeSandbox({ booted = [SIM_A], devices = [], simctlFails = false, lockRootBroken = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'debug496-'));
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  for (const f of SOURCED) fs.copyFileSync(path.join(SCRIPTS, f), path.join(root, 'scripts', f));

  const maestro = path.join(root, '.maestro');
  fs.mkdirSync(maestro, { recursive: true });
  fs.writeFileSync(path.join(maestro, 'q9-single-alert.yaml'), 'tags:\n  - safety\n');
  fs.writeFileSync(path.join(maestro, 'crisis-988-dial.yaml'), 'tags:\n  - safety-device-only\n');

  const stubs = fs.mkdtempSync(path.join(os.tmpdir(), 'debug496-stubs-'));
  const bootedPath = path.join(root, 'booted.json');
  const devicesPath = path.join(root, 'devices.json');
  fs.writeFileSync(bootedPath, bootedJson(booted));
  fs.writeFileSync(devicesPath, devicesJson(devices));

  writeStub(
    stubs,
    'xcrun',
    [
      'prev=""; out=""',
      'case "$*" in',
      simctlFails
        ? '  *"simctl list devices booted"*) echo "xcrun: error: unable to find utility" >&2; exit 72 ;;'
        : `  *"simctl list devices booted"*) cat "${bootedPath}" ;;`,
      // devicectl emits JSON ONLY to the path given by --json-output; its stdout is a
      // human table the resolver discards. A stub that echoes to stdout leaves the file
      // empty, which the resolver reads as an ENUMERATION failure rather than as the
      // device census under test — the shim bug e2e-sim-build.test.js warns about, in the
      // direction that silently swaps one refusal arm for another.
      '  *"devicectl list devices"*)',
      '    for a in "$@"; do',
      '      if [ "$prev" = "--json-output" ]; then out="$a"; fi',
      '      prev="$a"',
      '    done',
      `    [ -n "\${out:-}" ] && cp "${devicesPath}" "$out"`,
      '    ;;',
      '  *) exit 0 ;;',
      'esac',
    ].join('\n')
  );

  // `ps` is deliberately NOT stubbed. The lock helper's liveness probe must answer
  // truthfully about `$$` or the acquire refuses for a reason unrelated to any test here,
  // and a passthrough stub hardcoding an absolute path would be a portability hazard on
  // the ubuntu-latest runner that executes `npm run test:scripts` — for no gain, since
  // resolving the real `ps` from PATH is exactly what the passthrough was imitating.

  // INFRA-436's lock root, sandboxed so a test never contends with a real gate run.
  // `lockRootBroken` points it THROUGH a regular file, so every mkdir fails with ENOTDIR
  // and the acquire exhausts its wait — the acquire-refusal arm, deterministic and fast.
  let lockRoot = path.join(root, '.locks');
  if (lockRootBroken) {
    const blocker = path.join(root, 'not-a-dir');
    fs.writeFileSync(blocker, 'x');
    lockRoot = path.join(blocker, 'locks');
  }

  return { root, stubs, lockRoot };
}

function runGate(sandbox, { flows = [], env = {} } = {}) {
  const res = spawnSync('bash', [path.join(sandbox.root, 'scripts', 'e2e-safety.sh'), ...flows], {
    encoding: 'utf8',
    timeout: 60000,
    env: {
      ...process.env,
      PATH: `${sandbox.stubs}:${process.env.PATH}`,
      E2E_LOCK_ROOT: sandbox.lockRoot,
      E2E_TELEMETRY_FILE: path.join(sandbox.root, '.telemetry.jsonl'),
      // Inherited-lock state from an enclosing real gate run would otherwise let the
      // acquire short-circuit and skip the arm under test.
      E2E_LOCK_INHERITED: '',
      E2E_SIM_UDID: '',
      E2E_DEVICE_UDID: '',
      ...env,
    },
  });
  return { status: res.status, output: `${res.stdout || ''}${res.stderr || ''}` };
}

// --- AC1: every device-resolution refusal is 2 -------------------------------------------

describe('DEBUG-496 — a device-resolution refusal is exit 2, never 1', () => {
  test('2+ simulators booted: the ambiguity refusal is a harness fact, not a regression', () => {
    // The reported incident, verbatim: a peer session booted a second simulator mid-close.
    const r = runGate(makeSandbox({ booted: [SIM_A, SIM_B] }));
    expect(r.output).toMatch(/ambiguous/i);
    expect(r.status).toBe(2);
  }, 60000);

  test('no simulator booted: still 2 — a different resolver code, the same gate fact', () => {
    const r = runGate(makeSandbox({ booted: [] }));
    expect(r.output).toMatch(/no iOS simulator booted/i);
    expect(r.status).toBe(2);
  }, 60000);

  test('simctl cannot be enumerated at all: still 2', () => {
    // The resolver returns 1 here and is emphatic in its own message that this is NOT the
    // same as "none booted". Both are "no target" to the gate; neither is a flow failure.
    const r = runGate(makeSandbox({ simctlFails: true }));
    expect(r.output).toMatch(/could not enumerate booted simulators/i);
    expect(r.status).toBe(2);
  }, 60000);

  test('E2E_SIM_UDID naming a device that is not booted: still 2', () => {
    const r = runGate(makeSandbox({ booted: [SIM_A, SIM_B] }), {
      env: { E2E_SIM_UDID: 'CCCC-3333' },
    });
    expect(r.output).toMatch(/not among the booted simulators/i);
    expect(r.status).toBe(2);
  }, 60000);

  test('the real-device sibling refuses identically — 2+ attached', () => {
    // `:246` carried the identical `|| exit 1`. It is reached only by a device-only flow,
    // which is why the defect could survive a reading of the simulator path alone.
    const r = runGate(makeSandbox({ devices: [DEV_1, DEV_2] }), { flows: ['crisis-988-dial'] });
    expect(r.output).toMatch(/ambiguous/i);
    expect(r.status).toBe(2);
  }, 60000);

  test('the real-device sibling refuses identically — none attached', () => {
    const r = runGate(makeSandbox({ devices: [] }), { flows: ['crisis-988-dial'] });
    expect(r.output).toMatch(/no eligible iPhone attached/i);
    expect(r.status).toBe(2);
  }, 60000);
});

// --- AC4: the same flattening, swept across the rest of the file --------------------------

describe('DEBUG-496 — the AC4 sweep: every other `|| exit 1` that flattens a harness fact', () => {
  test('a simulator lock the gate cannot acquire is 2, not a flow regression', () => {
    // INFRA-436 acquires the device for the whole run before any flow. A peer holding it,
    // or an unwritable lock root, means no flow ran — which is 2 by definition. Reporting
    // 1 here blames the branch for a machine that was busy.
    const r = runGate(makeSandbox({ lockRootBroken: true }), { env: { E2E_LOCK_TIMEOUT: '1' } });
    expect(r.output).toMatch(/could not acquire/i);
    expect(r.status).toBe(2);
  }, 60000);
});

// --- The falsifiability guard -------------------------------------------------------------

describe('DEBUG-505 — every invocation error and pre-flight refusal is 2, not 1', () => {
  // DEBUG-496 moved the five sites its ACs scoped. These are the rest: each reports a fact
  // that is NOT "a Maestro flow was adjudicated red", and each is reachable in this sandbox
  // without an artifact. One case per CLASS — the eight preflight_fail callers share a
  // single exit, so the per-fact reasoning lives in a table above that function rather than
  // in eight near-identical specs here.

  test('a helper subflow named by name is an invocation error, not a regression', () => {
    // `_`-prefixed files are includes, not runnable flows. No flow ran.
    const r = runGate(makeSandbox({ booted: [SIM_A] }), { flows: ['_seeded-home'] });
    expect(r.output).toMatch(/helper subflow/i);
    expect(r.status).toBe(2);
  }, 60000);

  test('naming a flow that does not exist is an invocation error', () => {
    // The closest call of the four: a branch that renamed a flow while /b-close's mapping
    // still names it IS a branch fault. 2 still wins, because the alphabet is defined by
    // whether a VERDICT EXISTS, not by who is at fault — and the exit-1 message tells the
    // operator to debug a flow file that is not there.
    const r = runGate(makeSandbox({ booted: [SIM_A] }), { flows: ['no-such-flow'] });
    expect(r.output).toMatch(/no such flow/i);
    expect(r.status).toBe(2);
  }, 60000);

  test('a mixed simulator + device-only selection is an invocation error', () => {
    // This used to be this file's exit-1 falsifiability control. It moves because `ran` is
    // 0 here by construction: the refusal fires during selection, before any flow starts.
    // The control it anchored is replaced by the source-shape proof below.
    const r = runGate(makeSandbox({ booted: [SIM_A] }), {
      flows: ['q9-single-alert', 'crisis-988-dial'],
    });
    expect(r.output).toMatch(/mixed flow selection/i);
    expect(r.status).toBe(2);
  }, 60000);

  test('the app not being installed is a pre-flight refusal, not a crisis regression', () => {
    // The likeliest of all of these to fire in practice: a fresh worktree whose gate target
    // has not been built yet. Reported today as "a Maestro safety flow FAILED", pointing at
    // --skip-e2e, when the remedy is one build command.
    const r = runGate(makeSandbox({ booted: [SIM_A] }), { flows: ['q9-single-alert'] });
    expect(r.output).toMatch(/not installed/i);
    expect(r.status).toBe(2);
  }, 60000);
});

// --- The falsifiability guard -------------------------------------------------------------

describe('DEBUG-505 — the alphabet still has teeth (this suite can go red)', () => {
  // WHERE THE EXECUTABLE EXIT-1 CONTROL LIVES, AND WHY NOT HERE.
  //
  // It used to be the mixed-selection case above, which now correctly exits 2 — and after
  // this change NO exit-1 path is reachable from this sandbox at all, by design: 1 now means
  // exactly "a Maestro flow was adjudicated red", which requires a real artifact and a real
  // report. That is precisely what this file's header declines to duplicate. The executable
  // control therefore lives in e2e-sim-build.test.js, whose runSafety() harness stages a
  // container and a stubbed maestro, and which pins `status).toBe(1)` on genuinely red
  // flows. Do not re-import that harness here to restore a local exit-1 case; it would test
  // the duplicate.
  //
  // What replaces it is stronger than what it replaced: a proof of AC 2 itself.

  test('AC 2 — no bare `exit 1` survives anywhere; the sole 1-producer is the verdict', () => {
    // Comments are stripped first (DEBUG-390): this file and the script both discuss
    // `exit 1` by name in prose, and a bare identifier match cannot tell a use from a
    // mention.
    const raw = fs.readFileSync(path.join(SCRIPTS, 'e2e-safety.sh'), 'utf8');
    const src = raw
      .split('\n')
      .filter((l) => !/^\s*#/.test(l))
      .join('\n');

    // Two canaries. Comment-stripping plus a narrow regex is exactly the combination that
    // can silently match nothing and read as a pass forever, so prove the matcher fires and
    // prove the stripped source is still substantial.
    expect(src.split('\n').length).toBeGreaterThan(500);
    expect(/\bexit\s+2\b/.test(src)).toBe(true);

    const offenders = src.split('\n').filter((l) => /\bexit\s+1\b/.test(l));
    expect(offenders).toEqual([]);

    // The verdict line is the ONLY thing that may produce 1, and `fail` is assigned 1 in
    // exactly one place — the FAIL arm of the per-flow adjudication.
    expect(/exit\s+"\$fail"/.test(src)).toBe(true);
    expect(src.match(/^\s*fail=1\s*$/gm)).toHaveLength(1);
  });

  test('AC 3 — the rest of the alphabet is unchanged and still present', () => {
    const src = fs
      .readFileSync(path.join(SCRIPTS, 'e2e-safety.sh'), 'utf8')
      .split('\n')
      .filter((l) => !/^\s*#/.test(l))
      .join('\n');

    expect(/\bexit\s+3\b/.test(src)).toBe(true); // INFRA-434, target replaced
    expect(/\bexit\s+4\b/.test(src)).toBe(false); // belongs to e2e-gate.sh (INFRA-472)
  });

  test('the target-replaced verdict is reached BEFORE the zero-flow guard', () => {
    // Found while sweeping the 11 sites, and not covered by any AC.
    //
    // The flow loop `break`s when e2e_assert_gate_target fails, and that break is ABOVE
    // `ran=$((ran + 1))` — so a target replaced before the first flow leaves ran at 0. With
    // the zero-flow guard checked first, that fell straight through it and exited 1: for the
    // 1-of-1 scoped run /b-close Phase 2.5 usually takes, INFRA-434's exit 3 was unreachable
    // and a mid-suite substitution reported a crisis-flow regression instead.
    //
    // Ordering is the whole fix, so ordering is what this pins. Line-index comparison rather
    // than a runtime case because reaching it live needs a peer swapping the container
    // mid-run.
    const lines = fs
      .readFileSync(path.join(SCRIPTS, 'e2e-safety.sh'), 'utf8')
      .split('\n')
      .map((l) => (/^\s*#/.test(l) ? '' : l));

    // Anchor on `exit 3` itself, which occurs exactly once. Matching the CONDITION instead
    // is what a first draft of this test did, and it passed against the unfixed script:
    // `GATE_TARGET_REPLACED` appears seven times — three assignments, a summary-labelling
    // branch at the VOID arm, the receipt line — so findIndex hit an earlier occurrence and
    // compared the wrong pair. Same trap the AC 2 canaries above exist for.
    const exit3Idx = lines.findIndex((l) => /\bexit\s+3\b/.test(l));
    const zeroFlowIdx = lines.findIndex((l) => /"\$ran"\s*-lt\s*1/.test(l));

    expect(exit3Idx).toBeGreaterThan(-1);
    expect(zeroFlowIdx).toBeGreaterThan(-1);
    expect(lines.filter((l) => /\bexit\s+3\b/.test(l))).toHaveLength(1);
    expect(exit3Idx).toBeLessThan(zeroFlowIdx);
  });

  test('`ran` counts flows that actually launched maestro', () => {
    // Companion to the ordering fix: the increment sits below the run-directory creation, so
    // an iteration that refuses before invoking maestro is not counted as a flow that ran.
    // That is what makes AC 2's proof exact rather than approximately true, and it stops the
    // receipt's flows_ran over-reporting.
    const lines = fs
      .readFileSync(path.join(SCRIPTS, 'e2e-safety.sh'), 'utf8')
      .split('\n')
      .map((l) => (/^\s*#/.test(l) ? '' : l));

    const mktempIdx = lines.findIndex((l) => /RUN_DIR="\$\(mktemp -d/.test(l));
    const ranIdx = lines.findIndex((l) => /ran=\$\(\(ran \+ 1\)\)/.test(l));

    expect(mktempIdx).toBeGreaterThan(-1);
    expect(ranIdx).toBeGreaterThan(mktempIdx);
  });
});
