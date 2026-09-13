/**
 * INFRA-478 — the gate must NAME the device it ran on, and the smallest-viewport check
 * must key on the viewport rather than on a display name.
 *
 * WHY THIS EXISTS
 * ===============
 * `e2e_resolve_sim_device` resolved exactly one UDID (INFRA-405) but pinned no model and
 * no iOS version, and recorded neither. Measured on one commit, one binary lineage, quiet
 * host, full suite: iPhone 16 Pro / 402x874 gave 8/8 PASS and iPhone SE 3 / 375x667 gave
 * 5/8. Same tree, opposite verdicts. A green whose viewport is unrecorded therefore cannot
 * say what it certified — DEBUG-432 (a false green that stood for a flow's entire life) and
 * DEBUG-473 (a contention failure mis-filed as a fold defect) are both products of that.
 *
 * Choosing the device is INFRA-486. This pins the attribution half only.
 *
 * THE RENAME HOLE
 * ===============
 * The check used to `case` the simulator's DISPLAY NAME against the bare substring
 * "iPhone SE". That is wrong in both directions, and both are pinned below: an iPhone SE
 * 1st-gen is 320x568 — genuinely smaller than the declared baseline — and silently
 * satisfied it, while any renamed simulator defeated it. The predicate is now the DERIVED
 * viewport, which is what the layout assertions actually depend on.
 *
 * WARN-ONLY IS STRUCTURAL. A negative pin below asserts the function cannot exit non-zero,
 * so a future change converting the warning into a refusal fails here rather than in an
 * operator's close. AC 3's reasoning: a gate that refuses on a judgement the operator
 * disagrees with trains the `--skip-e2e` reflex it exists to prevent.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_APP = path.resolve(__dirname, '..', '..');
const HELPER = path.join(REPO_APP, 'scripts', 'e2e-sim-device.sh');

const SE3_UDID = '658FB733-C7D8-4997-AC12-551E1FD41C1D';
const SE3_TYPE = 'com.apple.CoreSimulator.SimDeviceType.iPhone-SE-3rd-generation';
const PRO_UDID = '11111111-2222-3333-4444-555566667777';
const PRO_TYPE = 'com.apple.CoreSimulator.SimDeviceType.iPhone-16-Pro';
const SE1_TYPE = 'com.apple.CoreSimulator.SimDeviceType.iPhone-SE';
const RUNTIME = 'com.apple.CoreSimulator.SimRuntime.iOS-18-6';

/** Real device-type bundle layout: <bundlePath>/Contents/Resources/profile.plist. */
const PROFILES = {
  [SE3_TYPE]: { name: 'iPhone SE (3rd generation)', w: 750, h: 1334, scale: '2.000000' },
  [PRO_TYPE]: { name: 'iPhone 16 Pro', w: 1206, h: 2622, scale: '3.000000' },
  [SE1_TYPE]: { name: 'iPhone SE (1st generation)', w: 640, h: 1136, scale: '2.000000' },
};

/**
 * Stub `xcrun` and `plutil` as real executables earlier on PATH, so the shipped commands
 * run verbatim. `node` is deliberately NOT stubbed — the helper's JSON parsing is part of
 * what is under test.
 */
function run(fnCall, { booted = [], name } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'infra478-'));
  const profileRoot = path.join(dir, 'Profiles');

  const devicetypes = [];
  for (const [identifier, p] of Object.entries(PROFILES)) {
    const bundle = path.join(profileRoot, `${p.name}.simdevicetype`);
    fs.mkdirSync(path.join(bundle, 'Contents', 'Resources'), { recursive: true });
    fs.writeFileSync(
      path.join(bundle, 'Contents', 'Resources', 'profile.plist'),
      JSON.stringify({ mainScreenWidth: p.w, mainScreenHeight: p.h, mainScreenScale: p.scale })
    );
    devicetypes.push({ identifier, bundlePath: bundle });
  }

  const devicesJson = JSON.stringify({
    devices: {
      [RUNTIME]: booted.map(b => ({
        udid: b.udid,
        name: name || PROFILES[b.type].name,
        state: 'Booted',
        deviceTypeIdentifier: b.type,
      })),
    },
  });

  fs.writeFileSync(
    path.join(dir, 'xcrun'),
    `#!/bin/sh
case "$*" in
  *"list devices booted"*) cat <<'J'
${devicesJson}
J
  ;;
  *"list devicetypes"*) cat <<'J'
${JSON.stringify({ devicetypes })}
J
  ;;
  *) exit 1 ;;
esac
`,
    { mode: 0o755 }
  );

  // Real plutil reads binary/XML plists; ours are JSON fixtures, so shim -extract.
  fs.writeFileSync(
    path.join(dir, 'plutil'),
    `#!/usr/bin/env node
const fs = require('fs');
const a = process.argv.slice(2);
const key = a[a.indexOf('-extract') + 1];
try {
  const j = JSON.parse(fs.readFileSync(a[a.length - 1], 'utf8'));
  if (!(key in j)) process.exit(1);
  console.log(j[key]);
} catch { process.exit(1); }
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
    stderr: (res.stderr || '').trim(),
  };
}

const describeCall = udid =>
  `e2e_describe_sim_device "${udid}"; echo "NAME=$E2E_SIM_NAME"; echo "MODEL=$E2E_SIM_MODEL_ID"; ` +
  `echo "IOS=$E2E_SIM_IOS"; echo "VIEWPORT=$E2E_SIM_VIEWPORT"; echo "LINE=$E2E_SIM_DEVICE_LINE"`;

const field = (out, k) => {
  const m = out.match(new RegExp(`^${k}=(.*)$`, 'm'));
  return m ? m[1] : undefined;
};

describe('AC1: the resolved device is described — model, iOS, viewport', () => {
  it('derives all three for the SE 3', () => {
    const r = run(describeCall(SE3_UDID), { booted: [{ udid: SE3_UDID, type: SE3_TYPE }] });
    expect(field(r.stdout, 'NAME')).toBe('iPhone SE (3rd generation)');
    expect(field(r.stdout, 'MODEL')).toBe(SE3_TYPE);
    expect(field(r.stdout, 'IOS')).toBe('18.6');
    expect(field(r.stdout, 'VIEWPORT')).toBe('375x667');
    expect(field(r.stdout, 'LINE')).toBe('iPhone SE (3rd generation) / iOS 18.6 / 375x667');
  });

  it('derives a large device correctly too', () => {
    const r = run(describeCall(PRO_UDID), { booted: [{ udid: PRO_UDID, type: PRO_TYPE }] });
    expect(field(r.stdout, 'VIEWPORT')).toBe('402x874');
    expect(field(r.stdout, 'IOS')).toBe('18.6');
  });

  it('derives the viewport from the plist, NOT from a hard-coded table', () => {
    // 1206/3 = 402 and 2622/3 = 874 come out of the fixture's own numbers. A lookup table
    // keyed on model name would pass this too — so the SE 1 case below is what proves it,
    // since no table in this repo has ever carried 320x568.
    const r = run(describeCall(PRO_UDID), { booted: [{ udid: PRO_UDID, type: PRO_TYPE }] });
    expect(field(r.stdout, 'VIEWPORT')).toBe('402x874');
  });

  it('degrades to unknown rather than failing when the device is not booted', () => {
    const r = run(describeCall('NO-SUCH-UDID'), { booted: [{ udid: SE3_UDID, type: SE3_TYPE }] });
    expect(r.status).toBe(0);
    expect(field(r.stdout, 'VIEWPORT')).toBe('unknown');
    expect(field(r.stdout, 'IOS')).toBe('unknown');
  });
});

describe('AC4: the predicate is the VIEWPORT, not the display name', () => {
  const warn = (udid, booted, name) =>
    run(`e2e_warn_if_not_smallest_viewport "${udid}" "$(e2e_booted_devices)"`, { booted, name });

  it('accepts a RENAMED SE 3 — the rename hole, closed', () => {
    // The old check `case`d the display name against "iPhone SE", so renaming the
    // simulator anything else defeated it. CLAUDE.md flags exactly this hazard.
    const r = warn(SE3_UDID, [{ udid: SE3_UDID, type: SE3_TYPE }], 'my-gate-sim');
    expect(r.stderr).not.toMatch(/NOT the smallest supported viewport/);
    expect(r.status).toBe(0);
  });

  it('REJECTS an iPhone SE 1st-gen, which the name substring silently accepted', () => {
    // 320x568 is genuinely SMALLER than the 375x667 baseline, so it is not the declared
    // viewport and a green on it does not certify one. The old substring matched "iPhone
    // SE" and stayed silent — the hole in the opposite direction.
    const r = warn(PRO_UDID, [{ udid: PRO_UDID, type: SE1_TYPE }], 'iPhone SE (1st generation)');
    expect(r.stderr).toMatch(/NOT the smallest supported viewport/);
    expect(r.stderr).toMatch(/320x568/);
  });

  it('warns on a large device and names both viewports', () => {
    const r = warn(PRO_UDID, [{ udid: PRO_UDID, type: PRO_TYPE }]);
    expect(r.stderr).toMatch(/NOT the smallest supported viewport \(375x667\)/);
    expect(r.stderr).toMatch(/this run is 402x874/);
  });

  it('always names the device, warning or not', () => {
    const quiet = warn(SE3_UDID, [{ udid: SE3_UDID, type: SE3_TYPE }]);
    expect(quiet.stderr).toMatch(/iPhone SE \(3rd generation\) \/ iOS 18\.6 \/ 375x667/);
    const loud = warn(PRO_UDID, [{ udid: PRO_UDID, type: PRO_TYPE }]);
    expect(loud.stderr).toMatch(/iPhone 16 Pro \/ iOS 18\.6 \/ 402x874/);
  });
});

describe('AC3: WARN-ONLY is structural — it can never refuse', () => {
  const warn = (udid, booted, name) =>
    run(`e2e_warn_if_not_smallest_viewport "${udid}" "$(e2e_booted_devices)"`, { booted, name });

  it('exits 0 on the declared viewport', () => {
    expect(warn(SE3_UDID, [{ udid: SE3_UDID, type: SE3_TYPE }]).status).toBe(0);
  });

  it('exits 0 on a NON-declared viewport — never refuses because the device is large', () => {
    // The load-bearing negative pin. INFRA-486 may add a refusal, but only on the device
    // being UNKNOWN or UNPINNED; refusing because it is large is what AC 3 forbids, and a
    // change that does it fails here rather than in an operator's close.
    expect(warn(PRO_UDID, [{ udid: PRO_UDID, type: PRO_TYPE }]).status).toBe(0);
  });

  it('exits 0 when the viewport cannot be derived at all', () => {
    const r = warn('NO-SUCH-UDID', [{ udid: SE3_UDID, type: SE3_TYPE }]);
    expect(r.status).toBe(0);
    expect(r.stderr).toMatch(/Viewport could not be derived/);
  });
});

describe('the runtime-key parser', () => {
  it.each([
    ['com.apple.CoreSimulator.SimRuntime.iOS-18-6', '18.6'],
    ['com.apple.CoreSimulator.SimRuntime.iOS-26-0', '26.0'],
    ['com.apple.CoreSimulator.SimRuntime.iOS-17-5-1', '17.5.1'],
    ['garbage', ''],
  ])('parses %s as %s', (key, want) => {
    expect(run(`e2e_ios_version_from_runtime "${key}"`).stdout).toBe(want);
  });
});
