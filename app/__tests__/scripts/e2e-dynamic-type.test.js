/**
 * DEBUG-469 AC4 — the `safety-dynamic-type` runner.
 *
 * WHAT IS ACTUALLY AT RISK HERE. This script deliberately does the one thing
 * e2e-content-size.sh exists to forbid: it puts a shared, device-global, PERSISTENT setting
 * into a non-default state. The setting survives relaunch, clearState, clearKeychain and the
 * process that set it, and this machine shares one simulator across worktrees — so the
 * failure mode is not "this run is wrong", it is "every later run on this machine is wrong,
 * including a peer's, and attributed to the wrong cause". The restore is therefore the
 * product; the flow run is incidental. These tests pin the restore on the paths where it is
 * easiest to lose: a failing inner run, and a device whose size cannot be read at all.
 *
 * The inner e2e-safety.sh is STUBBED. The wrapper is the unit under test; running the real
 * gate would need an artifact, a simulator and a lease, and would test neither the trap nor
 * the refusal.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPTS = path.resolve(__dirname, '..', '..', 'scripts');
const MAESTRO = path.resolve(__dirname, '..', '..', '.maestro');
const SOURCED = ['e2e-dynamic-type.sh', 'e2e-sim-device.sh', 'e2e-content-size.sh'];
const UDID = 'AAAA-1111';

function makeSandbox({ startSize = 'large', readable = true, innerExit = 0 } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'debug469-'));
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  for (const f of SOURCED) fs.copyFileSync(path.join(SCRIPTS, f), path.join(root, 'scripts', f));

  const sizeFile = path.join(root, 'content_size');
  fs.writeFileSync(sizeFile, `${startSize}\n`);
  const bootedFile = path.join(root, 'booted.json');
  fs.writeFileSync(
    bootedFile,
    JSON.stringify({
      devices: {
        'com.apple.CoreSimulator.SimRuntime.iOS-18-6': [
          { udid: UDID, name: 'iPhone SE (3rd generation)', state: 'Booted', isAvailable: true,
            deviceTypeIdentifier: 'com.apple.CoreSimulator.SimDeviceType.iPhone-SE-3rd-generation' },
        ],
      },
    })
  );

  // The inner gate, replaced by a recorder: it captures the content size AS OBSERVED FROM
  // INSIDE the run, which is the only place the set can be proven to have taken effect.
  fs.writeFileSync(
    path.join(root, 'scripts', 'e2e-safety.sh'),
    [
      '#!/usr/bin/env bash',
      `echo "INNER_SIZE=$(cat "${sizeFile}")" >> "${root}/inner.log"`,
      `echo "INNER_OPTIN=\${E2E_ALLOW_NON_DEFAULT_CONTENT_SIZE:-unset}" >> "${root}/inner.log"`,
      `echo "INNER_FLOWS=$*" >> "${root}/inner.log"`,
      `exit ${innerExit}`,
    ].join('\n')
  );

  const stubs = fs.mkdtempSync(path.join(os.tmpdir(), 'debug469-stubs-'));
  fs.writeFileSync(
    path.join(stubs, 'xcrun'),
    [
      '#!/usr/bin/env bash',
      'if [ "$1" = "simctl" ] && [ "$2" = "list" ]; then',
      `  cat "${bootedFile}"; exit 0`,
      'fi',
      'if [ "$1" = "simctl" ] && [ "$2" = "ui" ] && [ "$4" = "content_size" ]; then',
      '  if [ -n "${5:-}" ]; then',
      `    printf '%s\\n' "$5" > "${sizeFile}"; exit 0`,
      '  fi',
      readable ? `  cat "${sizeFile}"; exit 0` : '  exit 1',
      'fi',
      'exit 0',
    ].join('\n'),
    { mode: 0o755 }
  );

  return { root, stubs, sizeFile };
}

function run(sandbox, { args = ['some-flow'], env = {} } = {}) {
  const res = spawnSync('bash', [path.join(sandbox.root, 'scripts', 'e2e-dynamic-type.sh'), ...args], {
    encoding: 'utf8',
    timeout: 60000,
    env: { ...process.env, PATH: `${sandbox.stubs}:${process.env.PATH}`, E2E_SIM_UDID: '', ...env },
  });
  const inner = fs.existsSync(path.join(sandbox.root, 'inner.log'))
    ? fs.readFileSync(path.join(sandbox.root, 'inner.log'), 'utf8')
    : '';
  return {
    status: res.status,
    output: `${res.stdout || ''}${res.stderr || ''}`,
    inner,
    finalSize: fs.readFileSync(sandbox.sizeFile, 'utf8').trim(),
  };
}

describe('DEBUG-469 — the scaled-type run sets AX5 and always puts it back', () => {
  test('the inner gate observes AX5 and the opt-in, and the device is restored after', () => {
    const s = makeSandbox({ startSize: 'large' });
    const r = run(s);
    expect(r.status).toBe(0);
    expect(r.inner).toMatch(/INNER_SIZE=accessibility-extra-extra-extra-large/);
    // Without the opt-in the inner pre-flight would refuse the very size we just set.
    expect(r.inner).toMatch(/INNER_OPTIN=1/);
    expect(r.finalSize).toBe('large');
  });

  test('a FAILING inner run still restores — the trap, not the happy path', () => {
    const s = makeSandbox({ startSize: 'large', innerExit: 1 });
    const r = run(s);
    expect(r.status).toBe(1); // exit code propagates; a regression stays a regression
    expect(r.finalSize).toBe('large');
  });

  test('a non-default STARTING size is restored to what it was, not to the default', () => {
    // The operator may have set it deliberately. Restoring to `large` would be this script
    // silently overwriting someone else's state under cover of cleaning up its own.
    const s = makeSandbox({ startSize: 'extra-large' });
    const r = run(s);
    expect(r.finalSize).toBe('extra-large');
  });

  test('an UNREADABLE size refuses with 2 and never sets — a set it cannot undo is the leak', () => {
    const s = makeSandbox({ startSize: 'large', readable: false });
    const r = run(s);
    expect(r.status).toBe(2);
    expect(r.output).toMatch(/cannot be READ/i);
    expect(r.inner).toBe(''); // the gate must not have run
    expect(r.finalSize).toBe('large'); // and nothing was written
  });
});

describe('DEBUG-469 — the class stays OUT of the default safety suite', () => {
  // e2e-safety.sh selects the suite on an EXACT `- safety` tag. If this flow ever acquires
  // that tag, `npm run e2e:safety` starts asserting two different text sizes in one run and
  // a red can no longer be read without asking which one produced it.
  test('daily-loop-ax5-entry is tagged safety-dynamic-type and NOT safety', () => {
    const src = fs.readFileSync(path.join(MAESTRO, 'daily-loop-ax5-entry.yaml'), 'utf8');
    expect(/^\s*-\s+safety-dynamic-type\s*$/m.test(src)).toBe(true);
    expect(/^\s*-\s+safety\s*$/m.test(src)).toBe(false);
  });

  test('the exact-tag matcher the suite uses still selects exactly the nine safety flows', () => {
    const files = fs.readdirSync(MAESTRO).filter((f) => f.endsWith('.yaml') && !f.startsWith('_'));
    const tagged = files.filter((f) =>
      /^\s*-\s+safety\s*$/m.test(fs.readFileSync(path.join(MAESTRO, f), 'utf8'))
    );
    expect(tagged).toHaveLength(9);
    expect(tagged).not.toContain('daily-loop-ax5-entry.yaml');
  });
});
