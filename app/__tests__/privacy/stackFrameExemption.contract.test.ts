/**
 * MAINT-401 — the stack-frame exemption is SLOT-SCOPED, and the slot is coarsened
 *
 * DEBUG-338 established that `collectContentText` walks named content-bearing
 * surfaces and deliberately does NOT walk `exception.values[].stacktrace`. That
 * is the path-vs-content line, and it is the right line: a frame is structural
 * metadata, not prose.
 *
 * But an exemption is not the same as a control. `sanitizeScreenName` /
 * `isSensitiveRoute` exist specifically to stop a sensitive-surface signal
 * (crisis, assessment, journal) leaking via screen name. A raw crisis path
 * sitting in `frames[].filename` recreates that same signal through a slot the
 * screenName coarsening was built to close — and `frames[].function` reproduces
 * it a second time, since `renderCrisisResources` says exactly what
 * `CrisisResourcesScreen.tsx` says.
 *
 * So this file pins three things:
 *
 *  1. COARSENING. A sensitive path SEGMENT (and a sensitive function name) is
 *     replaced with a fixed token before transmission, reusing the shared
 *     `isSensitiveRoute` keyword set so the list provably cannot drift from
 *     `sanitizeScreenName`. Non-sensitive paths survive VERBATIM — coarsening
 *     that degenerates into blanket redaction would destroy the crash-triage
 *     purpose that legitimises transmitting the frame at all.
 *
 *  2. SLOT SCOPING. The exemption lives in `sanitizeFilename`, whose only
 *     callers are the frame slots. It is NOT, and must never become, a
 *     "strip path-shaped substrings before scanning" pre-pass over content.
 *     `crisis_alerts/insert score=21` is path-SHAPED but arrives as content,
 *     and a shape heuristic would exempt it wholesale. `scrubSensitiveData`
 *     cannot recover it — `/score[:\s]*[0-9]+/gi` requires `:` or whitespace,
 *     and `=` defeats it. The wholesale-drop assertion below is what keeps a
 *     future refactor honest.
 *
 *  3. THE COMPENSATING CONTROL. `applyAllowlist` does not pass frames through;
 *     it REBUILDS each one as exactly four scalars. `context_line`,
 *     `pre_context`, `post_context`, `abs_path`, `module` and `vars` are the
 *     fields that can carry actual source text, and dropping them is what makes
 *     "a frame is a path, not prose" true in the first place. Nothing asserted
 *     this before; a future `...frame` spread would silently reopen it.
 *
 * CURRENT PRODUCTION EFFECT: none, and that is recorded deliberately rather than
 * glossed. Sentry's default `createReactNativeRewriteFrames()` hard-assigns
 * `filename` to `app:///main.jsbundle` under Expo and deletes `abs_path` inside
 * `_prepareEvent`, which resolves BEFORE `beforeSend`; the only integration that
 * restores real paths is `__DEV__`-gated, and the dev DSN is empty. Release
 * bundles are minified, so `function` is mangled too. These assertions pin the
 * filter's behaviour on the input it WOULD receive. See the DPIA §7 control #10
 * entry, which records the same thing and names the three falsifiers that would
 * make this control live.
 *
 * THE GUARANTEE THIS MUST NOT WEAKEN: genuine crisis CONTENT still causes a
 * WHOLESALE drop, never a partial scrub.
 */

const mockInit = jest.fn();
const mockAddEventProcessor = jest.fn();

jest.mock('@sentry/react-native', () => ({
  init: (...args: unknown[]) => mockInit(...args),
  addEventProcessor: (...args: unknown[]) => mockAddEventProcessor(...args),
  feedbackIntegration: jest.fn(() => ({ name: 'Feedback' })),
}));

import { ExternalErrorReporter } from '@/core/services/logging/ExternalErrorReporter';

const TEST_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0';

/** Fresh singleton + initialize, returning the options actually passed to Sentry.init. */
async function initAndCaptureOptions(): Promise<any> {
  (ExternalErrorReporter as any).instance = undefined;
  mockInit.mockClear();
  const reporter = ExternalErrorReporter.getInstance();
  await reporter.initialize(TEST_DSN);
  expect(mockInit).toHaveBeenCalledTimes(1);
  return mockInit.mock.calls[0][0];
}

/** A benign event carrying NO crisis content in any content-bearing field. */
function benignEvent(): any {
  return {
    event_id: 'aaaaaaaabbbbccccddddeeeeffff0000',
    level: 'error',
    message: 'Unhandled TypeError',
    environment: 'production',
    platform: 'ios',
    exception: {
      values: [
        {
          type: 'TypeError',
          value: 'undefined is not a function',
          mechanism: { type: 'onerror', handled: false },
          stacktrace: {
            frames: [
              { filename: 'app:///main.jsbundle', function: 'render', lineno: 42, colno: 7 },
            ],
          },
        },
      ],
    },
  };
}

/** Replace the single frame on a benign event and run it through beforeSend. */
function sendWithFrame(options: any, frame: Record<string, unknown>): any {
  const event = benignEvent();
  event.exception.values[0].stacktrace.frames = [frame];
  return options.beforeSend(event);
}

/** The one frame the filter emitted, or undefined if the event was dropped. */
function emittedFrame(result: any): any {
  return result?.exception?.values?.[0]?.stacktrace?.frames?.[0];
}

/**
 * ⚠️ WHY EVERY PATH FIXTURE BELOW IS SHORT.
 *
 * `beforeSendHook` runs `scrubSensitiveData` AFTER `applyAllowlist`, and one of
 * its patterns is a base64 heuristic — `(?:[A-Za-z0-9+/]{4}){10,}` — whose
 * character class includes `/`. Any path containing a run of 40+ characters
 * drawn from `[A-Za-z0-9/]` is therefore blanket-replaced with `[REDACTED]`,
 * regardless of whether it is sensitive. Measured on the real pattern:
 *
 *   54 chars  .../features/crisis/screens/CrisisResourcesScreen.tsx -> /~[REDACTED]en.tsx
 *   48 chars  .../features/home/CleanHomeScreen.tsx                 -> /~[REDACTED].tsx
 *   39 chars  .../features/assessment/PHQ9Screen.tsx                -> SURVIVES VERBATIM
 *
 * That is an accidental, LENGTH-DEPENDENT control, and it is exactly why these
 * fixtures must stay under the threshold: a long crisis path is destroyed by the
 * base64 rule whether or not the coarsening below exists, so a test using one
 * would go green without exercising a single line of MAINT-401. Short fixtures
 * make the coarsening the only thing that can satisfy the assertion.
 *
 * The interaction itself is pinned (not fixed) at the bottom of this file.
 */

describe('MAINT-401 — sensitive path segments are coarsened in frames[].filename', () => {
  it('coarsens a crisis path segment and the crisis-named file', async () => {
    const options = await initAndCaptureOptions();
    const result = sendWithFrame(options, {
      filename: '/~/src/features/crisis/CrisisScreen.tsx',
      function: 'renderResources',
      lineno: 88,
      colno: 12,
    });

    // The event still ships — a frame is not content, and dropping it would
    // destroy crash triage. But the sensitive signal is gone.
    expect(result).not.toBeNull();
    expect(emittedFrame(result).filename).not.toMatch(/crisis/i);
    expect(emittedFrame(result).filename).not.toMatch(/CrisisScreen/);
  });

  it('coarsens an assessment path segment', async () => {
    const options = await initAndCaptureOptions();
    // 39-char run: survives the base64 rule intact today, so this path leaks
    // verbatim without the coarsening. The clearest case in the file.
    const result = sendWithFrame(options, {
      filename: '/~/app/src/features/assessment/PHQ9Screen.tsx',
      function: 'render',
      lineno: 10,
      colno: 1,
    });

    expect(emittedFrame(result).filename).not.toMatch(/assessment/i);
    expect(emittedFrame(result).filename).not.toMatch(/phq/i);
  });

  it('preserves path separators — the result is still a path, not a blob', async () => {
    const options = await initAndCaptureOptions();
    const result = sendWithFrame(options, {
      filename: '/~/src/features/crisis/CrisisScreen.tsx',
      function: 'render',
      lineno: 1,
      colno: 1,
    });

    const emitted = emittedFrame(result).filename;
    // Non-sensitive segments survive in place, so the frame is still triageable.
    expect(emitted).toContain('/src/');
    expect(emitted).toContain('/features/');
  });

  it('leaves a NON-sensitive path verbatim — coarsening must not become blanket redaction', async () => {
    const options = await initAndCaptureOptions();
    const path = '/~/src/features/home/HomeScreen.tsx';
    const result = sendWithFrame(options, {
      filename: path,
      function: 'render',
      lineno: 3,
      colno: 4,
    });

    expect(emittedFrame(result).filename).toBe(path);
  });

  it('leaves the rewritten Expo bundle filename untouched', async () => {
    const options = await initAndCaptureOptions();
    // This is what every shipping build actually emits.
    const result = sendWithFrame(options, {
      filename: 'app:///main.jsbundle',
      function: 'render',
      lineno: 1,
      colno: 1,
    });

    expect(emittedFrame(result).filename).toBe('app:///main.jsbundle');
  });

  it('leaves the [native code] marker untouched', async () => {
    const options = await initAndCaptureOptions();
    const result = sendWithFrame(options, {
      filename: '[native code]',
      function: 'render',
      lineno: 0,
      colno: 0,
    });

    expect(emittedFrame(result).filename).toBe('[native code]');
  });
});

describe('MAINT-401 — frames[].function carries the same signal and is coarsened too', () => {
  it('coarsens a crisis-named function', async () => {
    const options = await initAndCaptureOptions();
    // A symbolicated __DEV__ frame yields real function names. `renderCrisisResources`
    // discloses exactly what the path does; coarsening only `filename` would be cosmetic.
    const result = sendWithFrame(options, {
      filename: 'app:///main.jsbundle',
      function: 'renderCrisisResources',
      lineno: 88,
      colno: 12,
    });

    expect(result).not.toBeNull();
    expect(emittedFrame(result).function).not.toMatch(/crisis/i);
  });

  it('leaves a benign function name verbatim', async () => {
    const options = await initAndCaptureOptions();
    const result = sendWithFrame(options, {
      filename: 'app:///main.jsbundle',
      function: 'renderHomeHeader',
      lineno: 5,
      colno: 6,
    });

    expect(emittedFrame(result).function).toBe('renderHomeHeader');
  });

  it('tolerates a frame with no function name', async () => {
    const options = await initAndCaptureOptions();
    const result = sendWithFrame(options, {
      filename: 'app:///main.jsbundle',
      lineno: 5,
      colno: 6,
    });

    expect(result).not.toBeNull();
    expect(emittedFrame(result).function).toBeUndefined();
  });
});

describe('MAINT-401 — the exemption is slot-scoped, never substring-shaped', () => {
  it('still drops WHOLESALE on path-shaped crisis content arriving via extra', async () => {
    const options = await initAndCaptureOptions();
    const event = benignEvent();
    // Path-SHAPED, but it is content, not a frame. A "strip path-shaped
    // substrings before scanning" implementation would exempt this wholesale.
    event.extra = { op: 'crisis_alerts/insert score=21' };

    expect(options.beforeSend(event)).toBeNull();
  });

  it('still drops WHOLESALE on a crisis term in the message even with a coarsened frame', async () => {
    const options = await initAndCaptureOptions();
    const event = benignEvent();
    event.message = 'crisis intervention modal failed to mount';
    event.exception.values[0].stacktrace.frames = [
      {
        filename: '/~/app/src/features/crisis/screens/CrisisResourcesScreen.tsx',
        function: 'renderResources',
        lineno: 1,
        colno: 1,
      },
    ];

    // Coarsening the frame must never be mistaken for a reason to keep the event.
    expect(options.beforeSend(event)).toBeNull();
  });
});

describe('MAINT-401 — applyAllowlist rebuilds each frame as exactly four scalars', () => {
  it('drops context_line, pre/post_context, abs_path, module and vars even when present', async () => {
    const options = await initAndCaptureOptions();
    const result = sendWithFrame(options, {
      filename: 'app:///main.jsbundle',
      function: 'render',
      lineno: 42,
      colno: 7,
      // Every one of these can carry actual source text or locals. The rebuild
      // is the compensating control that makes the frames exemption defensible.
      abs_path: '/~/dev/being/app/src/features/crisis/screens/CrisisResourcesScreen.tsx',
      context_line: "  const phq9Score = responses.reduce((a, b) => a + b, 0);",
      pre_context: ['function renderCrisisResources() {'],
      post_context: ['  return <CrisisResources score={phq9Score} />;'],
      module: 'features/crisis/screens/CrisisResourcesScreen',
      in_app: true,
      vars: { phq9Score: 21 },
    });

    const emitted = emittedFrame(result);
    expect(Object.keys(emitted).sort()).toEqual(['colno', 'filename', 'function', 'lineno']);
    expect(emitted).not.toHaveProperty('context_line');
    expect(emitted).not.toHaveProperty('pre_context');
    expect(emitted).not.toHaveProperty('post_context');
    expect(emitted).not.toHaveProperty('abs_path');
    expect(emitted).not.toHaveProperty('module');
    expect(emitted).not.toHaveProperty('vars');
  });
});

describe('MAINT-401 — PINNED, NOT FIXED: the base64 scrub also eats long file paths', () => {
  /**
   * NOT a MAINT-401 defect and deliberately NOT fixed here — widening the diff
   * into `scrubSensitiveData` would change scrub behaviour for every field on
   * every event, which is a separate decision with its own blast radius.
   *
   * It is pinned because it is load-bearing for how the assertions above are
   * read, and because it is the sharpest argument FOR the coarsening: without a
   * decided control, whether a sensitive path leaves the device is settled by
   * its character count. Filed as a follow-up.
   */
  it('redacts a long NON-sensitive path via the base64 heuristic, independently of coarsening', async () => {
    const options = await initAndCaptureOptions();
    // 48-char [A-Za-z0-9/] run. Nothing sensitive in it; the base64 rule fires anyway.
    const result = sendWithFrame(options, {
      filename: '/~/dev/being/app/src/features/home/CleanHomeScreen.tsx',
      function: 'render',
      lineno: 1,
      colno: 1,
    });

    expect(emittedFrame(result).filename).toContain('[REDACTED]');
  });

  it('leaves a short sensitive path for the coarsening to handle, proving the two are independent', async () => {
    const options = await initAndCaptureOptions();
    // 39-char run — under the base64 threshold, so the ONLY thing that can
    // remove the sensitive segment here is MAINT-401's coarsening.
    const result = sendWithFrame(options, {
      filename: '/~/app/src/features/assessment/PHQ9Screen.tsx',
      function: 'render',
      lineno: 1,
      colno: 1,
    });

    expect(emittedFrame(result).filename).not.toContain('[REDACTED]');
    expect(emittedFrame(result).filename).not.toMatch(/assessment/i);
  });
});
