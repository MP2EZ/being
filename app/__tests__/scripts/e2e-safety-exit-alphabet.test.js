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
  'e2e-content-size.sh',
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

describe('DEBUG-469 — the sandbox stages every helper the script sources', () => {
  // SOURCED is a hand-maintained mirror of a real dependency graph. When it drifts, bash
  // reports "No such file or directory" on the source line and CARRIES ON, so the missing
  // helper's functions are merely `command not found` — every arm below still runs, still
  // exits non-zero, and six of the seven still exit 2 for the WRONG reason. The suite stays
  // green while testing a script that could not load. Derive the list instead of trusting it.
  test('no `. "$(dirname "$0")/x.sh"` in e2e-safety.sh is missing from SOURCED', () => {
    const src = fs.readFileSync(path.join(SCRIPTS, 'e2e-safety.sh'), 'utf8');
    const sourced = [...src.matchAll(/^\s*\.\s+"\$\(dirname "\$0"\)\/([\w.-]+)"/gm)].map((m) => m[1]);
    expect(sourced.length).toBeGreaterThan(0);
    expect(sourced.filter((f) => !SOURCED.includes(f))).toEqual([]);
  });
});

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

describe('DEBUG-496 — the alphabet still has teeth (this suite can go red)', () => {
  test('a refusal that is genuinely about the SELECTION still exits 1', () => {
    // AC2's local control. A mixed simulator + device-only selection is refused because the
    // INVOCATION is wrong — the operator asked for something incoherent — not because the
    // harness could not run. If a blanket "every refusal is 2" edit ever lands, this goes
    // red, which is what stops this file being satisfied by `exit 2` everywhere.
    const r = runGate(makeSandbox({ booted: [SIM_A] }), {
      flows: ['q9-single-alert', 'crisis-988-dial'],
    });
    expect(r.output).toMatch(/mixed flow selection/i);
    expect(r.status).toBe(1);
  }, 60000);

  test('no `|| exit 1` survives on a line that resolves a target or claims the device', () => {
    // A source-shape backstop for the arms an executable test cannot cheaply reach, and the
    // pin that makes the AC4 sweep re-checkable rather than a one-time reading. Comments are
    // stripped first (DEBUG-390): this file's own prose discusses `|| exit 1` by name.
    const src = fs
      .readFileSync(path.join(SCRIPTS, 'e2e-safety.sh'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((l) => !/^\s*#/.test(l))
      .join('\n');

    // The matcher must still fire, or "no matches" would read as a pass forever.
    expect(/e2e_resolve_sim_device/.test(src)).toBe(true);

    const offenders = src
      .split('\n')
      .filter((l) => /\|\|\s*exit\s+1\b/.test(l))
      .filter((l) => /e2e_resolve_sim_device|e2e_resolve_real_device|e2e_lock_acquire/.test(l));
    expect(offenders).toEqual([]);
  });
});
