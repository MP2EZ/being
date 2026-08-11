/**
 * DEBUG-338 — `containsCrisisContent` scans CONTENT, not the whole event
 *
 * The filter used to do `JSON.stringify(event).toLowerCase()` and drop the event
 * if any `CRISIS_CONTENT_PATTERNS` entry appeared anywhere in that string. Two
 * consequences, one of them a live defect:
 *
 *  1. THE LIVE DEFECT. `'988'` was a bare substring match against the RAW event,
 *     which still carries `event_id` (32 hex chars), `contexts.trace.trace_id`
 *     and `.span_id`, and `sdkProcessingMetadata.dynamicSamplingContext` —
 *     stamped unconditionally by `_prepareEvent` even with tracing off. A
 *     32-char hex run contains `988` roughly 0.7% of the time, and there are
 *     several such fields per event, so ~2-4% of ALL error events app-wide were
 *     dropped at random with zero crisis content in them. Nothing in
 *     privacy-policy.md or the DPIA promises identifier-entropy-driven drops, so
 *     this is a bug, not a contract.
 *
 *  2. A stack frame's `filename` is structural metadata, not prose. Scoping the
 *     scan to content-bearing fields is what makes a path-vs-content distinction
 *     expressible at all — once flattened into one string, a `filename` and a
 *     free-text `message` are indistinguishable.
 *
 * NOTE ON (2): in every SHIPPING build this half is currently inert. Sentry's
 * default `createReactNativeRewriteFrames()` rewrites `filename` to
 * `app:///main.jsbundle` and deletes `abs_path` before `beforeSend` runs, and the
 * only integration that restores real paths is `__DEV__`-gated where the DSN is
 * empty. The frame assertions below therefore pin the FILTER's behaviour on the
 * input it would receive, not an event shape users produce today. They are the
 * forward-looking half; the identifier assertions are the live one.
 *
 * THE GUARANTEE THIS MUST NOT WEAKEN: genuine crisis CONTENT still causes a
 * WHOLESALE drop — never a partial scrub. That is pinned here and in
 * releaseHealthSession.contract.test.ts, and predates this work.
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

/**
 * A benign error event carrying NO crisis content in any content-bearing field.
 * Individual tests bolt identifiers or frames onto it.
 */
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
              {
                filename: 'app:///main.jsbundle',
                function: 'render',
                lineno: 42,
                colno: 7,
              },
            ],
          },
        },
      ],
    },
  };
}

describe('DEBUG-338 — structural identifiers must not trip the content filter', () => {
  it('does not drop an event whose event_id happens to contain 988', async () => {
    const options = await initAndCaptureOptions();
    const event = benignEvent();
    // A real 32-hex event_id. `988` appears by chance, as it does in ~0.7% of them.
    event.event_id = 'c3f1988ab2d4e5f60718293a4b5c6d7e';

    expect(options.beforeSend(event)).not.toBeNull();
  });

  it('does not drop an event whose trace_id / span_id happen to contain 988', async () => {
    const options = await initAndCaptureOptions();
    const event = benignEvent();
    // `_prepareEvent` stamps these unconditionally, even with tracing disabled.
    event.contexts = {
      trace: { trace_id: '0af7651916cd43dd8448eb211c988319', span_id: 'b7ad6b7169988fa1' },
    };

    expect(options.beforeSend(event)).not.toBeNull();
  });

  it('does not drop an event whose device memory figures contain 988', async () => {
    const options = await initAndCaptureOptions();
    const event = benignEvent();
    // 9-10 digit integers; `988` shows up in them routinely.
    event.contexts = { device: { free_memory: 1988234112, memory_size: 3988807680 } };

    expect(options.beforeSend(event)).not.toBeNull();
  });

  it('does not drop an event solely because a stack frame originates in crisis code', async () => {
    const options = await initAndCaptureOptions();
    const event = benignEvent();
    event.exception.values[0].stacktrace.frames = [
      {
        filename: '/Users/max/dev/being/app/src/features/crisis/screens/CrisisResourcesScreen.tsx',
        function: 'renderResources',
        lineno: 88,
        colno: 12,
      },
    ];

    expect(options.beforeSend(event)).not.toBeNull();
  });
});

describe('DEBUG-338 — genuine crisis CONTENT is still dropped wholesale', () => {
  it('drops on a crisis term in the message', async () => {
    const options = await initAndCaptureOptions();
    const event = benignEvent();
    event.message = 'crisis intervention modal failed to mount';

    expect(options.beforeSend(event)).toBeNull();
  });

  it('drops on a crisis term in exception.values[].value', async () => {
    const options = await initAndCaptureOptions();
    const event = benignEvent();
    event.exception.values[0].value = 'suicidal ideation flag was undefined';

    expect(options.beforeSend(event)).toBeNull();
  });

  it('drops on a wellness marker in extra', async () => {
    const options = await initAndCaptureOptions();
    const event = benignEvent();
    event.extra = { lastScreening: 'phq-9 completed', note: 'score recorded' };

    expect(options.beforeSend(event)).toBeNull();
  });

  it('drops on a crisis term in a breadcrumb message', async () => {
    const options = await initAndCaptureOptions();
    const event = benignEvent();
    event.breadcrumbs = [
      { category: 'console', message: 'gad-7 severe threshold reached', level: 'info' },
    ];

    expect(options.beforeSend(event)).toBeNull();
  });

  it('drops on a real 988 reference in prose', async () => {
    const options = await initAndCaptureOptions();
    const event = benignEvent();
    event.message = 'failed to dial 988 lifeline';

    expect(options.beforeSend(event)).toBeNull();
  });

  it('drops on a crisis term in tags', async () => {
    const options = await initAndCaptureOptions();
    const event = benignEvent();
    event.tags = { surface: 'crisis-overlay' };

    expect(options.beforeSend(event)).toBeNull();
  });

  it('still drops when the wellness marker is the ONLY crisis signal present', async () => {
    const options = await initAndCaptureOptions();
    const event = benignEvent();
    // No 'crisis' anywhere; the scan must still catch the screening identifier.
    event.message = 'render failed';
    event.extra = { lastResult: 'gad7 total 18' };

    expect(options.beforeSend(event)).toBeNull();
  });
});

describe('DEBUG-338 — the 988 match is word-bounded, not a bare substring', () => {
  it('does not match 988 embedded in a longer digit run', async () => {
    const options = await initAndCaptureOptions();
    const event = benignEvent();
    event.message = 'request 4988213 timed out';

    expect(options.beforeSend(event)).not.toBeNull();
  });

  it('still matches 988 as a standalone token', async () => {
    const options = await initAndCaptureOptions();
    const event = benignEvent();
    event.message = 'user tapped 988';

    expect(options.beforeSend(event)).toBeNull();
  });
});
