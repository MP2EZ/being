/**
 * PRIVACY + CORRECTNESS CONTRACT — INFRA-295 Sentry release-health sessions.
 *
 * TWO facts this file exists to pin, both of which were wrong before INFRA-295:
 *
 * 1. THE OPTION KEY. `ExternalErrorReporter.initialize()` used to pass
 *    `autoSessionTracking: false`. That key does not exist in
 *    @sentry/react-native — the SDK reads `enableAutoSessionTracking`, and
 *    unrecognized keys are forwarded to the native layer, which applies its own
 *    default of ON. So the option we believed was disabling release-health
 *    sessions had no effect whatsoever, and sessions were most likely already
 *    being transmitted from every non-__DEV__ build. A silent no-op like this is
 *    invisible to TypeScript (the RN options type carries an index signature),
 *    so it needs a test.
 *
 * 2. CRASH ATTRIBUTION. `applyAllowlist` rebuilt `exception.values` as
 *    `{type, value, stacktrace}` and dropped `mechanism`. The SDK decides whether
 *    a JS error counts as a hard crash in `isHardCrash()`, which requires
 *    `mechanism.handled === false && mechanism.type === 'onerror'` — and
 *    `beforeSend` runs BEFORE envelope creation. Net effect: a JS fatal error
 *    never marked its session crashed, so a crash-free-session-rate signal would
 *    have counted native crashes only and read systematically optimistic. An
 *    alert built on that would under-fire exactly when it mattered.
 *
 * We import the SDK's REAL `isHardCrash` rather than re-implementing it, so this
 * contract also fails if a future @sentry/react-native bump changes the
 * crash-attribution rule out from under us.
 *
 * Sessions themselves are NOT covered by beforeSend: a session is an envelope
 * session item, not an event, so `beforeSend` / `normalizeDepth` / the FEAT-284
 * `addEventProcessor` never see one. The session payload's privacy posture is
 * therefore a schema argument, documented in the DPIA — not something this file
 * can assert. What this file CAN assert is that the error path feeding session
 * crash-attribution stays both correct and scrubbed.
 *
 * Runs in `npm run precommit` via `test:privacy`.
 *
 * @see docs/legal/dpia-sensitive-wellness-data.md §2 (Sentry)
 * @see docs/development/post-launch-monitoring-runbook.md §1
 */

import { isHardCrash } from '@sentry/react-native/dist/js/misc';

const mockInit = jest.fn();
const mockAddEventProcessor = jest.fn();

jest.mock('@sentry/react-native', () => ({
  init: (...args: unknown[]) => mockInit(...args),
  addEventProcessor: (...args: unknown[]) => mockAddEventProcessor(...args),
  feedbackIntegration: jest.fn(() => ({ name: 'Feedback' })),
}));

import { ExternalErrorReporter } from '@/core/services/logging/ExternalErrorReporter';

const TEST_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0';

/** Fresh singleton + initialize, returning the options object actually passed to Sentry.init. */
async function initAndCaptureOptions(): Promise<any> {
  (ExternalErrorReporter as any).instance = undefined;
  mockInit.mockClear();
  const reporter = ExternalErrorReporter.getInstance();
  await reporter.initialize(TEST_DSN);
  expect(mockInit).toHaveBeenCalledTimes(1);
  return mockInit.mock.calls[0][0];
}

/**
 * An unhandled JS error shaped the way the SDK's global handler emits one.
 *
 * Deliberately carries identifiers (which must be STRIPPED) but NOT wellness
 * markers — an event containing those is dropped wholesale by
 * `containsCrisisContent`, which is a different and stronger guarantee, pinned
 * separately below. Mixing the two into one fixture would mean this event never
 * reaches the allowlist at all, and the crash-attribution assertions would be
 * vacuous.
 */
function makeUnhandledErrorEvent(): any {
  return {
    level: 'fatal',
    message: 'Unhandled TypeError',
    environment: 'production',
    platform: 'ios',
    user: { id: 'anon-uid-123', email: 'leaked@example.com', ip_address: '1.2.3.4' },
    extra: {
      lastRoute: 'CleanHomeScreen',
      note: 'I have been feeling low all week',
    },
    exception: {
      values: [
        {
          type: 'TypeError',
          value: 'undefined is not a function',
          mechanism: { type: 'onerror', handled: false, synthetic: false },
          stacktrace: {
            frames: [
              {
                filename: '/Users/max/dev/being/app/src/features/home/CleanHomeScreen.tsx',
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

describe('INFRA-295 — Sentry init options', () => {
  it('passes the real SDK option `enableAutoSessionTracking: true`', async () => {
    const options = await initAndCaptureOptions();
    expect(options.enableAutoSessionTracking).toBe(true);
  });

  it('no longer passes the dead `autoSessionTracking` key', async () => {
    // Regression guard: this key is silently ignored by the SDK and forwarded to
    // native. Its presence means someone reintroduced a no-op believing it did
    // something. TypeScript cannot catch this — the options type is indexed.
    const options = await initAndCaptureOptions();
    expect(options).not.toHaveProperty('autoSessionTracking');
  });

  it('leaves performance tracing OFF (that is INFRA-297 scope, deliberately deferred)', async () => {
    const options = await initAndCaptureOptions();
    expect(options.enableAutoPerformanceTracing).toBe(false);
    expect(options.tracesSampleRate).toBeUndefined();
  });

  it('keeps the privacy hooks wired', async () => {
    const options = await initAndCaptureOptions();
    expect(typeof options.beforeSend).toBe('function');
    expect(typeof options.beforeBreadcrumb).toBe('function');
    expect(options.normalizeDepth).toBe(3);
  });
});

describe('INFRA-295 — crash attribution survives the scrub', () => {
  it('an unhandled error still satisfies the SDK’s real isHardCrash() after beforeSend', async () => {
    const options = await initAndCaptureOptions();
    const scrubbed = options.beforeSend(makeUnhandledErrorEvent());

    expect(scrubbed).not.toBeNull();
    // The whole point: without `mechanism` surviving, this is false and every JS
    // fatal is invisible to crash-free-session-rate.
    expect(isHardCrash(scrubbed)).toBe(true);
  });

  it('preserves exactly the non-PII mechanism scalars', async () => {
    const options = await initAndCaptureOptions();
    const scrubbed = options.beforeSend(makeUnhandledErrorEvent());
    const mechanism = scrubbed.exception.values[0].mechanism;

    expect(mechanism).toEqual({ type: 'onerror', handled: false, synthetic: false });
  });

  it('preserves `level`, which distinguishes fatal from non-fatal', async () => {
    const options = await initAndCaptureOptions();
    const scrubbed = options.beforeSend(makeUnhandledErrorEvent());

    expect(scrubbed.level).toBe('fatal');
  });

  it('a handled error is NOT reported as a hard crash', async () => {
    const options = await initAndCaptureOptions();
    const event = makeUnhandledErrorEvent();
    event.exception.values[0].mechanism = { type: 'generic', handled: true, synthetic: false };

    const scrubbed = options.beforeSend(event);
    expect(isHardCrash(scrubbed)).toBe(false);
  });
});

describe('INFRA-295 — the scrub is still a scrub', () => {
  it('strips identifiers and wellness data from the same event that keeps its mechanism', async () => {
    const options = await initAndCaptureOptions();
    const scrubbed = options.beforeSend(makeUnhandledErrorEvent());
    const serialized = JSON.stringify(scrubbed);

    // Identity
    expect(scrubbed).not.toHaveProperty('user');
    expect(serialized).not.toContain('leaked@example.com');
    expect(serialized).not.toContain('anon-uid-123');
    expect(serialized).not.toContain('1.2.3.4');

    // Free-text context — the allowlist drops `extra` wholesale.
    expect(scrubbed).not.toHaveProperty('extra');
    expect(serialized).not.toContain('feeling low');
  });

  it('still drops an event carrying wellness markers ENTIRELY, rather than scrubbing it', async () => {
    // This is the stronger, pre-existing guarantee and it must not regress:
    // `containsCrisisContent` hard-drops the event before the allowlist runs.
    // Pinned here because INFRA-295 touches the same path, and a mistake that
    // turned a drop into a scrub would look like a passing test elsewhere.
    const options = await initAndCaptureOptions();
    const event = makeUnhandledErrorEvent();
    event.extra = { phq9Score: 21, gad7Score: 18 };

    expect(options.beforeSend(event)).toBeNull();
  });

  it('does not let mechanism become a smuggling channel for extra keys', async () => {
    const options = await initAndCaptureOptions();
    const event = makeUnhandledErrorEvent();
    event.exception.values[0].mechanism = {
      type: 'onerror',
      handled: false,
      synthetic: false,
      // A future SDK (or a caller) could attach richer context here. The
      // allowlist must copy named scalars, never spread the object.
      // NB: deliberately NOT a wellness marker — those are dropped wholesale by
      // containsCrisisContent (pinned above), which would make this vacuous.
      data: { url: 'https://being.fyi/u/anon-uid-123', route: 'CleanHomeScreen' },
    };

    const scrubbed = options.beforeSend(event);
    const mechanism = scrubbed.exception.values[0].mechanism;

    expect(mechanism).not.toHaveProperty('data');
    expect(JSON.stringify(scrubbed)).not.toContain('anon-uid-123');
  });

  it('drops every non-allowlisted mechanism key, not just `data`', async () => {
    const options = await initAndCaptureOptions();
    const event = makeUnhandledErrorEvent();
    event.exception.values[0].mechanism = {
      type: 'onerror',
      handled: false,
      synthetic: false,
      source: 'cause',
      exception_id: 7,
      parent_id: 3,
    };

    const mechanism = options.beforeSend(event).exception.values[0].mechanism;
    expect(mechanism).toEqual({ type: 'onerror', handled: false, synthetic: false });
  });

  it('falls back to a safe mechanism.type when it is not a string', async () => {
    const options = await initAndCaptureOptions();
    const event = makeUnhandledErrorEvent();
    event.exception.values[0].mechanism = { type: { evil: 'object' }, handled: false };

    const mechanism = options.beforeSend(event).exception.values[0].mechanism;
    expect(mechanism.type).toBe('generic');
  });

  it('drops a `level` outside Sentry’s closed enum', async () => {
    // Guards a future foot-gun: captureMessage(msg, someVariable) putting
    // free text where an enum belongs.
    const options = await initAndCaptureOptions();
    const event = makeUnhandledErrorEvent();
    event.level = 'user said: I have been feeling low all week';

    const scrubbed = options.beforeSend(event);
    expect(scrubbed).not.toHaveProperty('level');
    expect(JSON.stringify(scrubbed)).not.toContain('feeling low');
  });

  it('keeps every legitimate enum level', async () => {
    const options = await initAndCaptureOptions();
    for (const level of ['fatal', 'error', 'warning', 'log', 'info', 'debug']) {
      const event = makeUnhandledErrorEvent();
      event.level = level;
      expect(options.beforeSend(event).level).toBe(level);
    }
  });
});
