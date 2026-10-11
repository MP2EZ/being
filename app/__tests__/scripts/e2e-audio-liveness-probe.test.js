/**
 * Exit-alphabet tests for scripts/e2e-audio-liveness-probe.sh (MAINT-743 / TEST-50).
 *
 * The probe resolves a simulator, reads a launchd pid before and after a measured dwell,
 * and routes its precondition through "$SCRIPT_DIR/e2e-safety.sh". So the real probe and
 * the real e2e-sim-device.sh are copied into a mkdtemp root next to a STUB e2e-safety.sh
 * (a fake on PATH would never be reached), and `xcrun` is a stub that answers only the
 * three simctl calls the probe makes. It never delegates to the real xcrun, so no real
 * simulator is touched.
 *
 * Exit alphabet: 0 survived a measured dwell / 1 regression (process died) / 2 harness
 * could not produce a verdict.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPTS = path.resolve(__dirname, '..', '..', 'scripts');
const FAKE_UDID = 'FAKE-0000-UDID';

function writeExec(dir, name, body) {
  const p = path.join(dir, name);
  fs.writeFileSync(p, `#!/usr/bin/env bash\n${body}\n`, { mode: 0o755 });
  return p;
}

function makeSandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'debug524-'));
  const stubs = fs.mkdtempSync(path.join(os.tmpdir(), 'debug524-stubs-'));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'debug524-home-'));
  const scripts = path.join(root, 'scripts');
  fs.mkdirSync(scripts);
  for (const f of ['e2e-audio-liveness-probe.sh', 'e2e-sim-device.sh']) {
    fs.copyFileSync(path.join(SCRIPTS, f), path.join(scripts, f));
  }

  const xcrunLog = path.join(root, 'xcrun.log');
  const safetyLog = path.join(root, 'safety.log');
  const counter = path.join(root, 'launchctl.count');
  const bootedPath = path.join(root, 'booted.json');
  fs.writeFileSync(
    bootedPath,
    JSON.stringify({
      devices: {
        'com.apple.CoreSimulator.SimRuntime.iOS-18-6': [
          {
            udid: FAKE_UDID,
            name: 'iPhone SE (3rd generation)',
            state: 'Booted',
            deviceTypeIdentifier: 'com.apple.CoreSimulator.SimDeviceType.iPhone-SE-3rd-generation',
          },
        ],
      },
    })
  );

  // Stateful launchctl answers: call 1 = SpringBoard control, 2 = pid before, 3 = pid after.
  writeExec(
    stubs,
    'xcrun',
    [
      `echo "$*" >> "${xcrunLog}"`,
      'case "$*" in',
      `  "simctl list devices booted -j") cat "${bootedPath}" ;;`,
      '  "simctl list devicetypes -j") echo \'{"devicetypes":[]}\' ;;',
      `  "simctl spawn ${FAKE_UDID} launchctl list")`,
      `    n=$(cat "${counter}" 2>/dev/null || echo 0); n=$((n + 1)); echo "$n" > "${counter}"`,
      '    printf "PID\\tStatus\\tLabel\\n"',
      '    printf "-\\t0\\tcom.apple.unrelated.job\\n"',
      '    if [ "$n" -eq 1 ]; then',
      '      [ "${STUB_SCENARIO:-}" = "blind" ] || printf "1001\\t0\\tcom.apple.SpringBoard\\n"',
      '    elif [ "$n" -eq 2 ]; then',
      '      [ "${STUB_SCENARIO:-}" = "absent-before" ] || printf "2002\\t0\\tUIKitApplication:fyi.being.app[1234][rb-legacy]\\n"',
      '    else',
      '      case "${STUB_SCENARIO:-}" in',
      '        absent-after) ;;',
      '        pid-changed) printf "3003\\t0\\tUIKitApplication:fyi.being.app[1234][rb-legacy]\\n" ;;',
      '        *) printf "2002\\t0\\tUIKitApplication:fyi.being.app[1234][rb-legacy]\\n" ;;',
      '      esac',
      '    fi',
      '    ;;',
      '  *) echo "xcrun stub: unexpected invocation: $*" >&2; exit 64 ;;',
      'esac',
    ].join('\n')
  );

  // Stub precondition runner, found as "$SCRIPT_DIR/e2e-safety.sh".
  writeExec(scripts, 'e2e-safety.sh', `echo "$@" >> "${safetyLog}"\nexit \${STUB_SAFETY_RC:-0}`);

  return { root, stubs, home, scripts, xcrunLog, safetyLog };
}

function runProbe(sb, { scenario = 'survive', safetyRc = 0, minDwell = '0', dwell = '0' } = {}) {
  const res = spawnSync('bash', [path.join(sb.scripts, 'e2e-audio-liveness-probe.sh')], {
    encoding: 'utf8',
    timeout: 60000,
    env: {
      ...process.env,
      PATH: `${sb.stubs}:${process.env.PATH}`,
      HOME: sb.home,
      E2E_SIM_UDID: FAKE_UDID,
      E2E_ABORT_DWELL_S: dwell,
      E2E_ABORT_MIN_DWELL_S: minDwell,
      E2E_HOST_SETTLE_MAX_S: '0',
      STUB_SCENARIO: scenario,
      STUB_SAFETY_RC: String(safetyRc),
    },
  });
  const log = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8').trim().split('\n') : []);
  return { status: res.status, stdout: res.stdout, stderr: res.stderr, xcrun: log(sb.xcrunLog), safety: log(sb.safetyLog) };
}

const LAUNCHCTL_CALL = `simctl spawn ${FAKE_UDID} launchctl list`;

describe('e2e-audio-liveness-probe.sh exit alphabet', () => {
  const sandboxes = [];
  const fresh = () => {
    const sb = makeSandbox();
    sandboxes.push(sb);
    return sb;
  };

  afterAll(() => {
    for (const sb of sandboxes) {
      for (const d of [sb.root, sb.stubs, sb.home]) fs.rmSync(d, { recursive: true, force: true });
    }
  });

  it('exit 0 when the pid is unchanged across a measured dwell', () => {
    const r = runProbe(fresh(), { scenario: 'survive' });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/oracle control — SpringBoard pid 1001 readable/);
    expect(r.stdout).toMatch(/survived a measured \d+s dwell .*pid 2002 unchanged/);
    // device resolution, device description, then exactly three launchctl reads
    expect(r.xcrun.filter((l) => l === LAUNCHCTL_CALL)).toHaveLength(3);
    expect(r.xcrun).toContain('simctl list devices booted -j');
    expect(r.xcrun).toContain('simctl list devicetypes -j');
    // the precondition was routed through the gate script, with the flow name
    expect(r.safety).toEqual(['journal-record-liveness']);
  });

  it('exit 2 when the SpringBoard control is unreadable (blind oracle)', () => {
    const sb = fresh();
    const r = runProbe(sb, { scenario: 'blind' });
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/oracle is blind: could not read a pid for com\.apple\.SpringBoard/);
    expect(r.xcrun.filter((l) => l === LAUNCHCTL_CALL)).toHaveLength(1);
    expect(r.safety).toEqual([]); // no precondition attempted from a blind read
  });

  it('exit 1 when the app pid is absent before the dwell begins', () => {
    const r = runProbe(fresh(), { scenario: 'absent-before' });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/REGRESSION — fyi\.being\.app was alive at the end of journal-record-liveness and is gone before the dwell began/);
    expect(r.xcrun.filter((l) => l === LAUNCHCTL_CALL)).toHaveLength(2);
  });

  it('exit 1 when the app pid is absent after the dwell', () => {
    const r = runProbe(fresh(), { scenario: 'absent-after' });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/REGRESSION — fyi\.being\.app died during a \d+s dwell after the record tap \(was pid 2002\)/);
    expect(r.xcrun.filter((l) => l === LAUNCHCTL_CALL)).toHaveLength(3);
  });

  it('exit 2 when the pid changed (a relaunch is not survival)', () => {
    const r = runProbe(fresh(), { scenario: 'pid-changed' });
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/app pid changed under the probe \(2002 -> 3003\)/);
  });

  it('exit 2 when the measured dwell is below the floor', () => {
    const r = runProbe(fresh(), { scenario: 'survive', dwell: '0', minDwell: '5' });
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/dwell was \d+s, below the 5s floor/);
    // the verdict read is never taken from a window that was too short
    expect(r.xcrun.filter((l) => l === LAUNCHCTL_CALL)).toHaveLength(2);
  });

  it('exit 2 when the precondition (e2e-safety.sh) fails', () => {
    const r = runProbe(fresh(), { scenario: 'survive', safetyRc: 1 });
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/could not establish the precondition \(journal-record-liveness exited 1\)/);
    expect(r.xcrun.filter((l) => l === LAUNCHCTL_CALL)).toHaveLength(1);
  });

  it('never invokes xcrun for anything outside the three expected simctl calls', () => {
    const r = runProbe(fresh(), { scenario: 'survive' });
    const allowed = new Set(['simctl list devices booted -j', 'simctl list devicetypes -j', LAUNCHCTL_CALL]);
    for (const line of r.xcrun) expect(allowed.has(line)).toBe(true);
  });
});
