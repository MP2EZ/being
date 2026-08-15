/**
 * DEBUG-392 — the safety gate needs a verdict channel that can say "I don't know".
 *
 * THE FAILURE THIS EXISTS FOR
 * ===========================
 * `e2e-safety.sh` adjudicated a flow purely on `maestro test`'s exit code. On
 * 2026-08-08 the harness wedged ~80 minutes inside `Maestro.clearAppState`
 * (Maestro.kt:93) and had to be `kill -9`'d, emitting no verdict at all. A
 * process that never exits has no exit code, so the one channel the gate read
 * carried nothing — and `/b-close` Phase 2.5 routes the merge decision on it.
 *
 * WHY JUNIT AND NOT THE DEBUG ARTIFACT
 * ====================================
 * The obvious second channel is `~/.maestro/tests/<ts>/commands-*.json`, and
 * that is how DEBUG-392's own re-test runs were adjudicated by hand. It is the
 * wrong channel to automate on, for two reasons found by inspecting the real
 * corpus on this machine:
 *
 *   1. It TRUNCATES silently. A genuine assertion failure wrote 53 top-level
 *      entries where a pass writes 83 (dirs 2026-08-12_153305 vs _162825). A
 *      run killed mid-flow therefore yields all-COMPLETED-and-short — which a
 *      "no FAILED node present" rule reads as green. Defending that needs a
 *      command-count invariant derived from the YAML, which in turn breaks the
 *      day a flow gains a top-level conditional.
 *   2. It is an internal debug format. `metadata.status` is not a published
 *      contract; if it is renamed, "no FAILED found" becomes vacuously true and
 *      the adjudicator silently degrades to always-pass — the exact
 *      silently-green failure this work exists to remove.
 *
 * `maestro test --format=JUNIT --output=<file>` is a published schema, is
 * written only by a run that reaches the end, and states pass/fail positively.
 * A killed run leaves NO report, and "absent" is unambiguous in a way "short"
 * is not. So the whole truncation class stops being representable rather than
 * being guarded against.
 *
 * WHAT THIS SUITE PINS
 * ====================
 * Every verdict token, and — critically — that the matcher can still GO RED.
 * A structural assertion that cannot fail is worse than none, the same argument
 * CLAUDE.md already makes for `check:breathing-worklets` and DEBUG-390. The
 * NO_TESTCASE token is that guard: it is the positive existence claim that
 * turns "we parsed nothing" into a refusal instead of a pass.
 *
 * FAIL-CLOSED IS THE WHOLE POINT. Every ambiguous input — absent, empty,
 * unparseable, naming a different flow — must resolve to a non-PASS token.
 * This mirrors the `*)` arm of the provenance case at e2e-safety.sh:189-191,
 * and for the same reason: the caller runs under `set -u` without `-e`, so a
 * helper that dies yields an empty string, and empty must refuse.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const HELPER = path.join(__dirname, '..', '..', 'scripts', 'e2e-verdict.js');
const { VERDICT, adjudicate } = require('../../scripts/e2e-verdict');

const FLOW = 'crisis-button-reachability';

/**
 * A JUnit report in the shape Maestro emits. Kept as a builder rather than a
 * frozen string so a test can perturb exactly one axis (failure count, flow
 * name, testcase presence) and leave the rest realistic.
 */
function junit({
  flow = FLOW,
  tests = 1,
  failures = 0,
  errors = 0,
  body = null,
  suiteName = 'Test Suite',
} = {}) {
  const inner =
    body !== null
      ? body
      : `<testcase name="${flow}" classname="${flow}" time="128.4"${
          failures > 0
            ? '><failure>Assertion is false: id: crisis-resources-screen is visible</failure></testcase>'
            : '/>'
        }`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="${suiteName}" tests="${tests}" failures="${failures}" errors="${errors}" time="128.4">
    ${inner}
  </testsuite>
</testsuites>`;
}

function withReport(contents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-verdict-'));
  const p = path.join(dir, 'report.xml');
  if (contents !== null) fs.writeFileSync(p, contents);
  return p;
}

/** Exercise the real CLI the shell calls, not just the exported function. */
function runCli(reportPath, flow = FLOW) {
  const res = spawnSync('node', [HELPER, 'adjudicate', reportPath, flow], { encoding: 'utf8' });
  return { token: (res.stdout || '').trim(), status: res.status };
}

// =====================================================================================

describe('e2e-verdict — the green path', () => {
  test('PASS on a report with one clean testcase naming the flow', () => {
    expect(adjudicate(withReport(junit()), FLOW)).toBe(VERDICT.PASS);
  });

  test('PASS survives a self-closing testcase tag', () => {
    // Maestro emits `<testcase … />` for a pass. A parser that only counted
    // `</testcase>` would find zero and refuse every green run.
    const p = withReport(junit({ body: `<testcase name="${FLOW}" classname="${FLOW}" time="1.0"/>` }));
    expect(adjudicate(p, FLOW)).toBe(VERDICT.PASS);
  });
});

describe('e2e-verdict — it can go red (the falsifiability guard)', () => {
  test('FAIL when a testcase carries a <failure> element', () => {
    expect(adjudicate(withReport(junit({ failures: 1 })), FLOW)).toBe(VERDICT.FAIL);
  });

  test('FAIL when the suite attribute reports failures but no element is present', () => {
    // Belt and braces: the attribute and the element are independent signals and
    // either alone must be enough. A generator that reports failures="1" while
    // omitting the child element must not read as green.
    const p = withReport(junit({ failures: 1, body: `<testcase name="${FLOW}"/>` }));
    expect(adjudicate(p, FLOW)).toBe(VERDICT.FAIL);
  });

  test('FAIL on an <error> element (harness error, not an assertion)', () => {
    const p = withReport(
      junit({ errors: 1, body: `<testcase name="${FLOW}"><error>Failed to connect to /127.0.0.1:55364</error></testcase>` })
    );
    expect(adjudicate(p, FLOW)).toBe(VERDICT.FAIL);
  });
});

describe('e2e-verdict — fail-closed on every ambiguous input', () => {
  test('NO_REPORT when the file is absent — the killed/wedged case', () => {
    // THE case this work exists for. A wedged run leaves no report; absence must
    // never be read as "nothing failed".
    expect(adjudicate(withReport(null), FLOW)).toBe(VERDICT.NO_REPORT);
  });

  test('NO_REPORT on an empty file', () => {
    expect(adjudicate(withReport(''), FLOW)).toBe(VERDICT.NO_REPORT);
  });

  test('UNPARSEABLE when the file is not a JUnit document', () => {
    expect(adjudicate(withReport('Exception in thread "main" java.lang.OutOfMemoryError'), FLOW)).toBe(
      VERDICT.UNPARSEABLE
    );
  });

  test('NO_TESTCASE when a well-formed suite contains no testcase', () => {
    // The positive existence claim. If Maestro renames the element, this token
    // fires and the gate refuses — rather than "we found no failures, ship it".
    const p = withReport(`<?xml version="1.0"?><testsuites><testsuite name="s" tests="0"/></testsuites>`);
    expect(adjudicate(p, FLOW)).toBe(VERDICT.NO_TESTCASE);
  });

  test('FLOW_MISMATCH when the report names a different flow', () => {
    // Guards the concurrency hazard: ~/.maestro is global, this machine runs
    // several worktrees against one simulator, and adjudicating another
    // session's green report is a laundered pass.
    expect(adjudicate(withReport(junit({ flow: 'q9-single-alert' })), FLOW)).toBe(VERDICT.FLOW_MISMATCH);
  });

  test('every non-PASS token is distinguishable from PASS', () => {
    // Pins the contract the shell switch depends on: it matches PASS explicitly
    // and routes everything else to a refusal arm.
    const tokens = Object.values(VERDICT).filter((t) => t !== VERDICT.PASS);
    expect(tokens.length).toBeGreaterThan(0);
    for (const t of tokens) expect(t).not.toBe(VERDICT.PASS);
  });
});

describe('e2e-verdict — the CLI contract the shell relies on', () => {
  test('prints the token on stdout and exits 0 only for PASS', () => {
    const r = runCli(withReport(junit()));
    expect(r.token).toBe(VERDICT.PASS);
    expect(r.status).toBe(0);
  });

  test('exits non-zero on a failing report', () => {
    const r = runCli(withReport(junit({ failures: 1 })));
    expect(r.token).toBe(VERDICT.FAIL);
    expect(r.status).not.toBe(0);
  });

  test('exits non-zero and prints a token when the report is missing', () => {
    // The shell captures stdout into VERDICT under `set -u` with no `-e`. A
    // helper that printed nothing here would yield an empty string, which the
    // caller must still refuse — but printing the token is what makes the
    // failure legible in the gate output.
    const r = runCli(withReport(null));
    expect(r.token).toBe(VERDICT.NO_REPORT);
    expect(r.status).not.toBe(0);
  });

  test('a missing flow argument is a usage error, not a pass', () => {
    const res = spawnSync('node', [HELPER, 'adjudicate', withReport(junit())], { encoding: 'utf8' });
    expect(res.status).not.toBe(0);
    expect(`${res.stdout || ''}`.trim()).not.toBe(VERDICT.PASS);
  });
});

// =====================================================================================
// DEBUG-392 — naming the dial-and-background failure instead of re-investigating it.
//
// The filed defect: a tap on `crisis-button-root` that should open CrisisResources
// instead left the app backgrounded, with no crash report. The only call on that path
// that hands off to another app is `openCrisisUrl('tel:988')`, reached from
// RootCrisisButton.tsx:132-167 when `navigationRef.isReady()` is still false at the
// 400ms NAV_READY_DEADLINE_MS. It took a full investigation cycle to get that far, and
// the run that produced it is gone.
//
// On the SIMULATOR that dial cannot complete — `canOpenURL('tel:')` is unconditionally
// false there — so openCrisisUrl renders its manual-dial alert, titled "Unable to Call".
// That string is app-owned and nothing else on this path emits it, which makes it a
// precise witness. The flow's own `assertVisible: crisis-resources-screen` fails FIRST
// when the fallback fires, so the alert never reaches the flow's absence check; it
// reaches the FAILED command's hierarchy dump, which is where this matcher looks.
//
// THE FALSE-POSITIVE THIS MUST NOT HAVE. The same DEBUG-392 change added
// `extendedWaitUntil: notVisible: "Unable to Call"` to 13 sites in
// crisis-button-reachability.yaml. Maestro embeds each command's selector in the
// artifact, so the literal string is now present in EVERY run of that flow, pass or
// fail. A whole-file grep would therefore report the dial fallback on every single
// failure of any kind. The matcher must read `error.hierarchyRoot` and nothing else.
//
// Following the INFRA-407 precedent at e2e-safety.sh:269-271: match narrowly, and
// prefer saying nothing to saying something wrong. A wrong explanation costs more than
// no explanation, because it sends the next reader somewhere else entirely.

const { diagnose, DIAGNOSIS } = require('../../scripts/e2e-verdict');

/** Build a commands artifact in the shape Maestro writes (status under `metadata`). */
function commandsArtifact(entries) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-diag-'));
  fs.writeFileSync(path.join(dir, 'commands-(crisis-button-reachability.yaml).json'), JSON.stringify(entries));
  return dir;
}

const TAP_CRISIS_BUTTON = {
  command: { tapOnElement: { selector: { idRegex: 'crisis-button-root' } } },
  metadata: { status: 'COMPLETED' },
};

/** The E5 absence check, as it appears in EVERY run of this flow from now on. */
const ABSENCE_CHECK = {
  command: { extendedWaitUntilCommand: { condition: { notVisible: { textRegex: 'Unable to Call' } } } },
  metadata: { status: 'COMPLETED' },
};

function failedAssert({ hierarchyRoot = null, error = null } = {}) {
  return {
    command: { assertConditionCommand: { condition: { visible: { idRegex: 'crisis-resources-screen' } } } },
    metadata: {
      status: 'FAILED',
      error: error || {
        message: 'Assertion is false: id: crisis-resources-screen is visible',
        ...(hierarchyRoot ? { hierarchyRoot } : {}),
      },
    },
  };
}

describe('e2e-verdict diagnose — identifies the DEBUG-341 dial fallback', () => {
  test('DIAL_FALLBACK when the failing assertion’s hierarchy shows the manual-dial alert', () => {
    const dir = commandsArtifact([
      TAP_CRISIS_BUTTON,
      failedAssert({
        hierarchyRoot: {
          children: [{ attributes: { text: 'Unable to Call' } }, { attributes: { text: 'Please manually dial 988 for support.' } }],
        },
      }),
    ]);
    expect(diagnose(dir)).toBe(DIAGNOSIS.DIAL_FALLBACK);
  });

  test('NONE when the alert string appears ONLY as a command selector', () => {
    // The regression guard for this work's own flow change. Every future run of
    // crisis-button-reachability carries this node; if it triggered the matcher, the
    // gate would blame the crisis button for every unrelated failure.
    const dir = commandsArtifact([
      TAP_CRISIS_BUTTON,
      ABSENCE_CHECK,
      failedAssert({ hierarchyRoot: { children: [{ attributes: { text: 'Privacy & Data' } }] } }),
    ]);
    expect(diagnose(dir)).toBe(DIAGNOSIS.NONE);
  });

  test('NONE for an infrastructure failure, which carries no hierarchyRoot', () => {
    // The driver-connect class: `Failed to connect to /127.0.0.1:55364`. 239+ of these
    // per run appeared in six zero-artifact runs on 2026-08-12. Structurally excluded
    // by requiring hierarchyRoot, rather than by string-matching the error text.
    const dir = commandsArtifact([
      failedAssert({
        error: { message: 'Unable to set permissions for app fyi.being.app: Failed to connect to /127.0.0.1:55364', cause: 'x' },
      }),
    ]);
    expect(diagnose(dir)).toBe(DIAGNOSIS.NONE);
  });

  test('NONE when nothing failed at all', () => {
    expect(diagnose(commandsArtifact([TAP_CRISIS_BUTTON, ABSENCE_CHECK]))).toBe(DIAGNOSIS.NONE);
  });

  test('NONE on a missing or empty evidence directory, without throwing', () => {
    // Runs on the failure path of a gate that is already failing. It must never turn a
    // legible failure into a crash in the diagnostician.
    expect(diagnose(path.join(os.tmpdir(), 'definitely-not-here-392'))).toBe(DIAGNOSIS.NONE);
    expect(diagnose(fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-diag-empty-')))).toBe(DIAGNOSIS.NONE);
  });

  test('survives an unparseable artifact', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-diag-bad-'));
    fs.writeFileSync(path.join(dir, 'commands-(x.yaml).json'), 'not json at all');
    expect(diagnose(dir)).toBe(DIAGNOSIS.NONE);
  });
});
