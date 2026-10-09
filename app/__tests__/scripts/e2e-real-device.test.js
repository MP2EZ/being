/**
 * DEBUG-584 — `e2e-real-device.sh`'s device census and resolution, pinned per arm.
 *
 * WHY THIS FILE EXISTS. Before it, `e2e-real-device.sh` had ZERO tests — nothing in
 * either test root drove it. That is how a whole class of mis-resolution survived
 * INFRA-424: the resolver's four refusal arms were reviewed as prose and never executed.
 *
 * THE DEFECT THIS PINS. `e2e_attached_devices` filtered on `tunnelState`, treating a
 * TRANSIENT LIVENESS SIGNAL as a STATIC ELIGIBILITY PROPERTY. Measured 2026-09-18 on
 * iPhone 16e / iOS 26.6.2 / Xcode 26.0.1, sampling every 20s after an explicit
 * `devicectl device info details` wake:
 *
 *     transport      t+0s        t+20s           t+40s .. t+140s
 *     wired          connected   disconnected    disconnected
 *     localNetwork   connected   disconnected    (reconnects only while something
 *                                                 is actively driving the device)
 *
 * So the tunnel is LAZY on both transports and decays within ~20s of the last thing
 * that talked to the device. `tunnelState` answers "is anyone talking to this device
 * right now", not "can this device be driven". Filtering eligibility on it is wrong in
 * both directions, and both directions are real:
 *
 *   FALSE NEGATIVE (the common one) — a quiet machine with a cabled, unlocked,
 *   Developer-Mode iPhone reports `disconnected`, so the census is empty and the
 *   resolver refuses with "no eligible iPhone attached" while one is plugged in.
 *   This is the hazard CLAUDE.md documents as the sleeping tunnel; the measurement
 *   above makes it the DEFAULT state rather than an edge case.
 *
 *   FALSE POSITIVE (DEBUG-584 as filed) — a device poked within the preceding ~20s
 *   reports `connected`, so the resolver pins it; the tunnel then decays before
 *   maestro attaches and the flow dies `NO_REPORT` on the crisis path.
 *
 * WHAT THE FIX IS, AND WHY IT IS NOT A TRANSPORT CHECK. DEBUG-584 was filed believing
 * a network-paired device was undrivable and a cable was the fix. Both halves are false:
 * maestro 2.6.0 printed `Detected connected iPhone` against `transportType: localNetwork`,
 * and the wired tunnel above decays FASTER than the network one. `transportType` is
 * therefore not a discriminator and must never become one here. CLAUDE.md already draws
 * the correct line and the resolver simply never implemented it: `disconnected` plus a
 * transport is ASLEEP and wakeable; `unavailable` with no transport is ABSENT.
 *
 * The resolver must therefore ESTABLISH the tunnel it depends on rather than observe it,
 * and refuse only when it will not come up. That refusal is the fifth arm.
 *
 * Exit codes are the FUNCTION's, not the gate's: `e2e-safety.sh` collapses every one of
 * them to `exit 2` at its single call site, which `e2e-safety-exit-alphabet.test.js`
 * pins separately. Nothing here should assert a gate-level code.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPTS = path.resolve(__dirname, '../../scripts');
const RESOLVER = path.join(SCRIPTS, 'e2e-real-device.sh');

const IPHONE_A = '00008140-0014119A3A0A801C';
const IPHONE_B = '00008110-000A15C43C63801E';
const IPAD = '00008103-0014542801E8A01E';

function writeStub(dir, name, body) {
  const p = path.join(dir, name);
  fs.writeFileSync(p, `#!/usr/bin/env bash\n${body}\n`, { mode: 0o755 });
  return p;
}

/**
 * One device census entry. `tunnel` and `transport` are the fields under test, so every
 * case states them explicitly rather than inheriting a default that hides the variable.
 */
function device({
  udid,
  deviceType = 'iPhone',
  platform = 'iOS',
  pairingState = 'paired',
  tunnelState,
  transportType,
}) {
  const connectionProperties = { pairingState };
  if (tunnelState !== undefined) connectionProperties.tunnelState = tunnelState;
  if (transportType !== undefined) connectionProperties.transportType = transportType;
  return {
    hardwareProperties: { udid, platform, deviceType, productType: 'iPhone17,1' },
    deviceProperties: { name: `${deviceType} ${udid.slice(-4)}` },
    connectionProperties,
  };
}

function censusJson(devices) {
  return JSON.stringify({ result: { devices } });
}

/**
 * A sandbox whose `xcrun` answers off state files, modelling the wake as a real state
 * TRANSITION rather than a static census.
 *
 * `afterWake` is what `devicectl list devices` returns once a wake has succeeded. That
 * two-census shape is the whole point: a single fixed census cannot distinguish "the
 * resolver observed a live tunnel" from "the resolver established one", and those are
 * exactly the two behaviours this file exists to tell apart.
 *
 * `wakeFails` models a device that enumerates but whose tunnel will not come up — the
 * fifth arm's trigger.
 */
function makeSandbox({ devices = [], afterWake = null, wakeFails = false, enumerateFails = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'debug584-'));
  const stubs = fs.mkdtempSync(path.join(os.tmpdir(), 'debug584-stubs-'));

  const censusPath = path.join(root, 'devices.json');
  const afterWakePath = path.join(root, 'devices-after-wake.json');
  const markerPath = path.join(root, 'woke');
  const wakeLogPath = path.join(root, 'wake.log');

  fs.writeFileSync(censusPath, censusJson(devices));
  fs.writeFileSync(afterWakePath, censusJson(afterWake || devices));

  writeStub(
    stubs,
    'xcrun',
    [
      'prev=""; out=""',
      'case "$*" in',
      // The wake call. Logged so a case can assert the resolver actually made it —
      // a resolver that never wakes would still pass every census-shaped assertion.
      '  *"devicectl device info details"*)',
      `    echo "$*" >> "${wakeLogPath}"`,
      wakeFails ? '    exit 1 ;;' : `    touch "${markerPath}" ; exit 0 ;;`,
      '  *"devicectl list devices"*)',
      enumerateFails
        ? '    echo "xcrun: error: unable to find utility devicectl" >&2; exit 72 ;;'
        : [
            '    for a in "$@"; do',
            '      if [ "$prev" = "--json-output" ]; then out="$a"; fi',
            '      prev="$a"',
            '    done',
            // devicectl writes JSON ONLY to --json-output; its stdout is a human table
            // the resolver discards. A stub echoing to stdout leaves the file empty,
            // which reads as an ENUMERATION failure and silently swaps one arm for
            // another — the shim bug the sibling suites warn about.
            `    if [ -n "\${out:-}" ]; then`,
            `      if [ -f "${markerPath}" ]; then cp "${afterWakePath}" "$out"; else cp "${censusPath}" "$out"; fi`,
            '    fi',
            '    ;;',
          ].join('\n'),
      '  *) exit 0 ;;',
      'esac',
    ].join('\n')
  );

  return { root, stubs, wakeLogPath, markerPath };
}

/**
 * Run one resolver function under `bash`, never the caller's shell. zsh does not
 * word-split unquoted expansions, so an extracted block yields one blob where bash
 * yields N — the documented way to manufacture a phantom defect in this tooling.
 */
function runResolver(sandbox, snippet) {
  return spawnSync(
    'bash',
    ['-c', `set -u; . "${RESOLVER}"; ${snippet}`],
    {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${sandbox.stubs}:${process.env.PATH}` },
      cwd: sandbox.root,
      timeout: 30000,
    }
  );
}

describe('DEBUG-584 — a sleeping tunnel is eligible, not absent', () => {
  test('a cabled iPhone whose tunnel has decayed still resolves', () => {
    // The measured DEFAULT state of a quiet machine: plugged in, unlocked, and
    // `disconnected` because nothing has talked to it for 20 seconds.
    const sandbox = makeSandbox({
      devices: [device({ udid: IPHONE_A, tunnelState: 'disconnected', transportType: 'wired' })],
      afterWake: [device({ udid: IPHONE_A, tunnelState: 'connected', transportType: 'wired' })],
    });

    const r = runResolver(sandbox, `e2e_resolve_real_device "spec"`);

    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe(IPHONE_A);
  });

  test('the same device over the local network also resolves — transport is not a discriminator', () => {
    // DEBUG-584 was filed believing this case was undrivable. Maestro 2.6.0 attached to
    // it. If a future change reintroduces a transport filter, this goes red.
    const sandbox = makeSandbox({
      devices: [device({ udid: IPHONE_A, tunnelState: 'disconnected', transportType: 'localNetwork' })],
      afterWake: [device({ udid: IPHONE_A, tunnelState: 'connected', transportType: 'localNetwork' })],
    });

    const r = runResolver(sandbox, `e2e_resolve_real_device "spec"`);

    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe(IPHONE_A);
  });

  test('the resolver ESTABLISHES the tunnel rather than observing it', () => {
    // Without this, a resolver that merely got lucky on a live census would pass the
    // two cases above. The wake call is the mechanism; assert it was made, for the
    // device that was actually selected.
    const sandbox = makeSandbox({
      devices: [device({ udid: IPHONE_A, tunnelState: 'disconnected', transportType: 'wired' })],
      afterWake: [device({ udid: IPHONE_A, tunnelState: 'connected', transportType: 'wired' })],
    });

    runResolver(sandbox, `e2e_resolve_real_device "spec"`);

    expect(fs.existsSync(sandbox.wakeLogPath)).toBe(true);
    expect(fs.readFileSync(sandbox.wakeLogPath, 'utf8')).toContain(IPHONE_A);
  });
});

describe('DEBUG-584 — the fifth arm: present but its tunnel will not come up', () => {
  test('refuses with its own code rather than resolving', () => {
    const sandbox = makeSandbox({
      devices: [device({ udid: IPHONE_A, tunnelState: 'disconnected', transportType: 'wired' })],
      wakeFails: true,
    });

    const r = runResolver(sandbox, `e2e_resolve_real_device "spec"`);

    expect(r.status).toBe(4);
    expect(r.stdout.trim()).toBe('');
  });

  test('a wake that reports success but leaves the tunnel down is still a refusal', () => {
    // The dangerous shape: `devicectl` exits 0 and the tunnel is still not up. Trusting
    // the exit code alone re-creates the original mis-pin one layer down, which is the
    // recursion AC3 warned about.
    const sandbox = makeSandbox({
      devices: [device({ udid: IPHONE_A, tunnelState: 'disconnected', transportType: 'wired' })],
      afterWake: [device({ udid: IPHONE_A, tunnelState: 'disconnected', transportType: 'wired' })],
    });

    const r = runResolver(sandbox, `e2e_resolve_real_device "spec"`);

    expect(r.status).toBe(4);
  });

  test('the diagnostic names the tunnel, and does not send the reader to a rebuild or a timeout', () => {
    const sandbox = makeSandbox({
      devices: [device({ udid: IPHONE_A, tunnelState: 'disconnected', transportType: 'wired' })],
      wakeFails: true,
    });

    const { stderr } = runResolver(sandbox, `e2e_resolve_real_device "spec"`);

    expect(stderr).toMatch(/tunnel/i);
    expect(stderr).toContain(IPHONE_A);
    // The two wrong diagnoses. A harness that says "rebuild" here spends 11-21 minutes
    // of build on a device that was never reachable.
    expect(stderr).not.toMatch(/rebuild/i);
    expect(stderr).not.toMatch(/timeout/i);
  });
});

describe('DEBUG-584 — the arms INFRA-424 shipped still hold', () => {
  test('`unavailable` with no transport is ABSENT, not asleep — zero eligible', () => {
    // The one tunnelState that IS a static fact. Excluding it is what stops the resolver
    // selecting a device that is merely remembered.
    const sandbox = makeSandbox({
      devices: [device({ udid: IPAD, deviceType: 'iPad', tunnelState: 'unavailable' })],
    });

    const r = runResolver(sandbox, `e2e_resolve_real_device "spec"`);

    expect(r.status).toBe(2);
  });

  test('an iPhone in `unavailable` is excluded too — the iPad is not what makes it ineligible', () => {
    const sandbox = makeSandbox({
      devices: [device({ udid: IPHONE_A, tunnelState: 'unavailable' })],
    });

    expect(runResolver(sandbox, `e2e_resolve_real_device "spec"`).status).toBe(2);
  });

  test('an unpaired iPhone is excluded', () => {
    const sandbox = makeSandbox({
      devices: [
        device({ udid: IPHONE_A, pairingState: 'unpaired', tunnelState: 'disconnected', transportType: 'wired' }),
      ],
    });

    expect(runResolver(sandbox, `e2e_resolve_real_device "spec"`).status).toBe(2);
  });

  test('an enumeration failure is its own arm, distinct from "none attached"', () => {
    const sandbox = makeSandbox({ enumerateFails: true });

    const r = runResolver(sandbox, `e2e_resolve_real_device "spec"`);

    expect(r.status).toBe(1);
  });

  test('two eligible iPhones with no override is ambiguous', () => {
    const sandbox = makeSandbox({
      devices: [
        device({ udid: IPHONE_A, tunnelState: 'disconnected', transportType: 'wired' }),
        device({ udid: IPHONE_B, tunnelState: 'disconnected', transportType: 'wired' }),
      ],
    });

    const r = runResolver(sandbox, `E2E_DEVICE_UDID= e2e_resolve_real_device "spec"`);

    expect(r.status).toBe(3);
  });

  test('E2E_DEVICE_UDID picks one of two, and it is the one named', () => {
    const sandbox = makeSandbox({
      devices: [
        device({ udid: IPHONE_A, tunnelState: 'disconnected', transportType: 'wired' }),
        device({ udid: IPHONE_B, tunnelState: 'disconnected', transportType: 'wired' }),
      ],
      afterWake: [
        device({ udid: IPHONE_A, tunnelState: 'connected', transportType: 'wired' }),
        device({ udid: IPHONE_B, tunnelState: 'connected', transportType: 'wired' }),
      ],
    });

    const r = runResolver(sandbox, `E2E_DEVICE_UDID=${IPHONE_B} e2e_resolve_real_device "spec"`);

    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe(IPHONE_B);
  });

  test('never falls back to a simulator udid on any refusal', () => {
    // The defect INFRA-424 exists to prevent. Asserted against the refusal arms because
    // that is where a `${UDID:-booted}`-shaped shorthand would surface.
    const sandbox = makeSandbox({ devices: [] });

    const r = runResolver(sandbox, `e2e_resolve_real_device "spec"`);

    expect(r.status).not.toBe(0);
    expect(r.stdout.trim()).toBe('');
    expect(r.stdout).not.toMatch(/booted/i);
  });
});

describe('DEBUG-584 — an explicit pin is honoured at any attached-device count', () => {
  // Found by this file's own falsifiability control. The override block used to sit
  // BELOW the count==1 branch, so with exactly one iPhone attached — the ordinary
  // configuration — a pin naming a different device was silently ignored. The resolver's
  // header already claimed the opposite, citing a leaked E2E_SIM_UDID being "refused".
  test('a pin naming an absent device refuses rather than falling back to the one attached', () => {
    const sandbox = makeSandbox({
      devices: [device({ udid: IPHONE_A, tunnelState: 'disconnected', transportType: 'wired' })],
      afterWake: [device({ udid: IPHONE_A, tunnelState: 'connected', transportType: 'wired' })],
    });

    const r = runResolver(sandbox, `E2E_DEVICE_UDID=${IPHONE_B} e2e_resolve_real_device "spec"`);

    expect(r.status).toBe(3);
    expect(r.stdout.trim()).toBe('');
  });

  test('a simulator udid leaking in via the wrong variable is refused, as the header claims', () => {
    const sandbox = makeSandbox({
      devices: [device({ udid: IPHONE_A, tunnelState: 'disconnected', transportType: 'wired' })],
      afterWake: [device({ udid: IPHONE_A, tunnelState: 'connected', transportType: 'wired' })],
    });

    const r = runResolver(
      sandbox,
      `E2E_DEVICE_UDID=A640FF80-132F-4B07-91BD-B99C44696338 e2e_resolve_real_device "spec"`
    );

    expect(r.status).toBe(3);
  });

  test('a pin is matched on the udid field, not as a substring of the row', () => {
    // The listing carries name and transport columns, so a substring match could be
    // satisfied by one device's NAME while reporting another device's udid.
    const sandbox = makeSandbox({
      devices: [device({ udid: IPHONE_A, tunnelState: 'disconnected', transportType: 'wired' })],
      afterWake: [device({ udid: IPHONE_A, tunnelState: 'connected', transportType: 'wired' })],
    });

    expect(runResolver(sandbox, `E2E_DEVICE_UDID=wired e2e_resolve_real_device "spec"`).status).toBe(3);
    // A prefix of a real udid is not a match either.
    expect(
      runResolver(sandbox, `E2E_DEVICE_UDID=${IPHONE_A.slice(0, 12)} e2e_resolve_real_device "spec"`).status
    ).toBe(3);
  });
});

describe('DEBUG-584 — this suite can go red', () => {
  test('the sandbox actually drives the real resolver, not a stub of it', () => {
    // The control the house convention asks for: a source-shaped suite that matches
    // nothing looks identical to a passing one. Prove the file under test is the real
    // one and that the census fixture reaches it.
    expect(fs.existsSync(RESOLVER)).toBe(true);

    const sandbox = makeSandbox({
      devices: [device({ udid: IPHONE_A, tunnelState: 'disconnected', transportType: 'wired' })],
      afterWake: [device({ udid: IPHONE_A, tunnelState: 'connected', transportType: 'wired' })],
    });

    // A udid absent from the census must NOT resolve — if the fixture were being ignored,
    // this would pass for the wrong reason and every case above would be vacuous.
    const r = runResolver(sandbox, `E2E_DEVICE_UDID=DEAD-BEEF e2e_resolve_real_device "spec"`);
    expect(r.status).not.toBe(0);
  });
});
