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

  // The COUNT is a deliberate tripwire, not bookkeeping: `npm run e2e:safety` globs by
  // tag, so a flow silently acquiring `- safety` changes what the gate runs with nothing
  // else to catch it. Adding a safety flow is therefore SUPPOSED to red-line this test —
  // bump the number in the same commit that adds the flow, and only after confirming the
  // new flow belongs in the default suite (not `safety-device-only`, not
  // `safety-dynamic-type`, both of which the suite can neither select nor validly run).
  // 10 → 11: FEAT-457 added guidance-suppressed-handoff.
  // 11 → 12: INFRA-420 added guidance-gentle-tier-cap.
  // 12 → 14: FEAT-570 added bug-report-crisis-reachability and
  //          bug-report-suppressed-route. TWO, not one, and not the "flow edits"
  //          the work item originally specified: Maestro 2.6.0 has no shake
  //          command, so the root-armed entry point cannot be driven by editing
  //          an existing flow. The second flow covers what the Profile entry
  //          structurally cannot — the form arriving on a FAB-suppressed route.
  // 14 → 15: DEBUG-506 added crisis-keyboard-reachability — the sim half of a contract
  //          whose only pin could not run where the gate runs. It served DEBUG-590's
  //          AC 1–3; DEBUG-590 moved the device flow's record to MIGRATED.
  test('the exact-tag matcher the suite uses still selects exactly the fifteen safety flows', () => {
    const files = fs.readdirSync(MAESTRO).filter((f) => f.endsWith('.yaml') && !f.startsWith('_'));
    const tagged = files.filter((f) =>
      /^\s*-\s+safety\s*$/m.test(fs.readFileSync(path.join(MAESTRO, f), 'utf8'))
    );
    expect(tagged).toHaveLength(15);
    expect(tagged).not.toContain('daily-loop-ax5-entry.yaml');
  });
});

describe('DEBUG-546 — the skip-breath scroll must not centre an element that cannot centre', () => {
  // The SkipLink is the last node in beat 1's scroll content. `centerElement` there costs
  // five guaranteed extra swipes inside a scroll racing the 30s breath timer, which is what
  // held this flow red. Nothing that gates on merge runs the flow, so this is the only
  // thing that notices the neighbouring continue-button step's shape being copied back.
  const stepsOf = (src, command) => {
    const lines = src.split('\n').filter((l) => !/^\s*#/.test(l));
    const steps = [];
    lines.forEach((line, i) => {
      const m = line.match(new RegExp(`^(\\s*)-\\s+${command}:\\s*$`));
      if (!m) return;
      const body = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() === '') continue;
        if (lines[j].match(/^\s*/)[0].length <= m[1].length) break;
        body.push(lines[j]);
      }
      steps.push(body.join('\n'));
    });
    return steps;
  };
  const CENTRED = /^\s*centerElement:\s*true\s*$/m;

  test('daily-loop-skip-breath is scrolled to WITHOUT centerElement', () => {
    const src = fs.readFileSync(path.join(MAESTRO, 'daily-loop-ax5-entry.yaml'), 'utf8');
    const scrolls = stepsOf(src, 'scrollUntilVisible');
    const skip = scrolls.filter((s) => /id:\s*"daily-loop-skip-breath"/.test(s));
    const cont = scrolls.filter((s) => /id:\s*"continue-button"/.test(s));

    // Controls against the file itself: the slicer found exactly the real step (it carries
    // its timeout), and the centring matcher fires on this file's formatting.
    expect(skip).toHaveLength(1);
    expect(skip[0]).toMatch(/^\s*timeout:\s*\d+\s*$/m);
    expect(cont.some((s) => CENTRED.test(s))).toBe(true);

    expect(skip[0]).not.toMatch(CENTRED);
  });
});

describe('DEBUG-629 — the AX5 VirtuousResponse flow joins the class, not the default suite', () => {
  const FLOW = 'daily-loop-ax5-virtuous.yaml';

  // Same carve-out and same reason as daily-loop-ax5-entry above. Note this flow does NOT
  // move the fifteen-flow count asserted there, and that is the point of the class: it adds
  // accessibility-size coverage without changing what the default suite runs.
  test('is tagged safety-dynamic-type and NOT safety', () => {
    const src = fs.readFileSync(path.join(MAESTRO, FLOW), 'utf8');
    expect(/^\s*-\s+safety-dynamic-type\s*$/m.test(src)).toBe(true);
    expect(/^\s*-\s+safety\s*$/m.test(src)).toBe(false);
  });

  // The coverage gap this flow exists to close, pinned so it cannot be closed by accident
  // and then silently reopened. `daily-loop-quick-depth` reaches this beat but runs at the
  // default size by construction; `daily-loop-ax5-entry` runs at AX5 but stops one beat
  // short. If either of those facts changes, this flow's justification changes with it.
  test('is the only AX5 flow that reaches VirtuousResponse', () => {
    const files = fs
      .readdirSync(MAESTRO)
      .filter((f) => f.endsWith('.yaml') && !f.startsWith('_'));
    const ax5ReachingBeat3 = files.filter((f) => {
      const src = fs.readFileSync(path.join(MAESTRO, f), 'utf8');
      return (
        /^\s*-\s+safety-dynamic-type\s*$/m.test(src) && src.includes('daily-loop-VirtuousResponse')
      );
    });
    expect(ax5ReachingBeat3).toEqual([FLOW]);

    const entry = fs.readFileSync(path.join(MAESTRO, 'daily-loop-ax5-entry.yaml'), 'utf8');
    expect(entry.includes('daily-loop-VirtuousResponse')).toBe(false);
  });

  // MEASURED, not defensive. A `centerElement` scroll leaves the list coasting and RN's
  // ScrollView claims a touch that starts mid-deceleration (`_isAnimating()` in
  // `_handleStartShouldSetResponderCapture`), so the tap only STOPS the list: 1 of 2 AX5
  // runs had `tapOn: continue-button` COMPLETED with VirtuousResponse never appearing.
  // A longer timeout cannot fix a consumed tap, which is why the retry is pinned rather
  // than left as a shape someone may "simplify" away.
  test('retries the beat-2 advance, guarded on not having navigated', () => {
    const src = fs.readFileSync(path.join(MAESTRO, FLOW), 'utf8');
    expect(src).toMatch(
      /notVisible:\s*\n\s*id:\s*"daily-loop-VirtuousResponse-screen"[\s\S]*?tapOn:\s*\n\s*id:\s*"continue-button"/,
    );
  });

  // The crisis invariant the crisis ruling requires this flow to carry: the support line is
  // asserted on the beat showsSupportLine() selects with NO scroll in front of it, and its
  // absence on beat 3 is asserted only AFTER a positive assertion, so the negative can
  // never be satisfied by an empty screen.
  test('asserts the support line unscrolled on beat 2 and its absence after arriving on beat 3', () => {
    const src = fs.readFileSync(path.join(MAESTRO, FLOW), 'utf8');
    const sphere = src.indexOf('daily-loop-SphereSovereignty-screen');
    const supportAssert = src.indexOf('assertVisible:\n    id: "daily-loop-support-line"');
    const beat3 = src.indexOf('assertVisible:\n    id: "daily-loop-VirtuousResponse-screen"');
    const notVisible = src.indexOf('assertNotVisible:');

    expect(sphere).toBeGreaterThan(-1);
    expect(supportAssert).toBeGreaterThan(sphere);
    expect(src.slice(sphere, supportAssert)).not.toMatch(/scrollUntilVisible|swipe:/);
    expect(notVisible).toBeGreaterThan(beat3);
  });
});

describe('DEBUG-507 — the XXXL profile-entry flow joins the class, not the default suite', () => {
  const FLOW = 'profile-voice-reflection-xxxl.yaml';

  // Same carve-out as daily-loop-ax5-entry above, and for the same reason: `npm run
  // e2e:safety` selects on an EXACT `- safety` tag, and this flow asserts a NON-default
  // text size. If it ever acquires that tag the default suite starts mixing two text
  // sizes in one run and a red stops being readable.
  test('is tagged safety-dynamic-type and NOT safety', () => {
    const src = fs.readFileSync(path.join(MAESTRO, FLOW), 'utf8');
    expect(/^\s*-\s+safety-dynamic-type\s*$/m.test(src)).toBe(true);
    expect(/^\s*-\s+safety\s*$/m.test(src)).toBe(false);
  });

  // MEASURED, not guessed. At extra-extra-extra-large the Profile list is ~1.35x taller
  // and Maestro's default 20000 ms scroll budget does not reach the last card: 7 of 7 runs
  // failed at 20000 ms, 15 of 18 passed at >= 30000 ms. DEBUG-473 had already measured this
  // flow class at 95% of its scroll budget on an IDLE machine at the default text size, so
  // the larger size simply spends what was left. Dropping this back to the default is the
  // one edit that silently restores the defect, which is why it is pinned rather than
  // left as a number in a file.
  test('gives the scroll a budget that actually reaches the last card at XXXL', () => {
    const src = fs.readFileSync(path.join(MAESTRO, FLOW), 'utf8');
    const m = src.match(/timeout:\s*(\d+)/);
    expect(m).not.toBeNull();
    expect(Number(m[1])).toBeGreaterThanOrEqual(30000);
  });
});

describe('DEBUG-579 — the tab-label capture harness joins the class, not the default suite', () => {
  const FLOW = 'tab-label-dynamic-type-capture.yaml';
  const PKG = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '..', '..', 'package.json'), 'utf8')
  );

  // The same carve-out as the two above, and the case for it is stronger here: this flow
  // CANNOT fail on its own subject. Maestro asserts presence, not clipping or truncation,
  // so in the default suite it would contribute a green that discharges nothing while
  // also mixing a second text size into a run whose reds must stay readable.
  test('is tagged safety-dynamic-type and NOT safety', () => {
    const src = fs.readFileSync(path.join(MAESTRO, FLOW), 'utf8');
    expect(/^\s*-\s+safety-dynamic-type\s*$/m.test(src)).toBe(true);
    expect(/^\s*-\s+safety\s*$/m.test(src)).toBe(false);
  });

  // DEBUG-579 AC6 requires observation at AX1 *and* AX5, and the evidence is per-size
  // screenshots. Two edits lose a size SILENTLY — both runners naming the same content
  // size, or the same DEBUG579_LABEL, which makes the second run overwrite the first's
  // images and leaves the operator adjudicating one size twice believing it was two.
  test('the two runners request different sizes and different screenshot labels', () => {
    const ax1 = PKG.scripts['e2e:capture:tabbar-ax1'];
    const ax5 = PKG.scripts['e2e:capture:tabbar-ax5'];
    expect(ax1).toContain('E2E_DYNAMIC_TYPE_SIZE=accessibility-medium');
    expect(ax5).toContain('E2E_DYNAMIC_TYPE_SIZE=accessibility-extra-extra-extra-large');

    const label = (s) => (s.match(/DEBUG579_LABEL=([A-Za-z0-9_-]+)/) || [])[1];
    expect(label(ax1)).toBeDefined();
    expect(label(ax5)).toBeDefined();
    expect(label(ax1)).not.toBe(label(ax5));

    // Both must go through the wrapper: a bare `maestro test` sets no size and, worse,
    // restores none — the device-global leak the whole class exists to prevent.
    for (const s of [ax1, ax5]) {
      expect(s).toContain(`scripts/e2e-dynamic-type.sh ${FLOW.replace(/\.yaml$/, '')}`);
    }
  });

  // Every capture path carries the label. A path that forgets it reintroduces the
  // overwrite above one line at a time, and the loss is invisible in a green run.
  test('every screenshot path carries the per-run label', () => {
    const src = fs.readFileSync(path.join(MAESTRO, FLOW), 'utf8');
    const shots = src.match(/^-\s+takeScreenshot:.*$/gm) || [];
    expect(shots.length).toBeGreaterThan(1);
    for (const s of shots) expect(s).toContain('${DEBUG579_LABEL}');
  });

  // The flow asserts the label ARRIVED. Without it a dropped -e yields one silently
  // overwritten set rather than a failure, which is the same loss by a different route.
  test('the flow refuses to run without the label', () => {
    const src = fs.readFileSync(path.join(MAESTRO, FLOW), 'utf8');
    expect(/assertTrue:.*DEBUG579_LABEL/.test(src)).toBe(true);
  });
});
