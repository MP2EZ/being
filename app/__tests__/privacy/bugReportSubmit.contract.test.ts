/**
 * PRIVACY / SAFETY CONTRACT — FEAT-570 first-party bug-report submission.
 *
 * FEAT-284 presented Sentry's own feedback widget. DEBUG-533 ruled that a
 * zero-988-affordance window; FEAT-570 replaced the presentation with our own
 * form and kept the SDK only as the transport. This file pins the parts of that
 * swap that are invisible on screen and would fail SILENTLY:
 *
 *   • the SDK presenter is never called again (the guard pins the call site;
 *     this pins the behaviour);
 *   • the kill switch still covers feedback, which it no longer does for free —
 *     `showFeedbackForm()` used to gate on `isActive()`, so killing the reporter
 *     also disabled the surface. Presentation is now ours and opens regardless,
 *     so the check MOVED to the submit path. If that move is ever undone, the
 *     form still opens, the user still types, and submission still transmits;
 *   • the payload carries no identity fields;
 *   • the message is scrubbed at the CALL SITE, independently of the event
 *     processor — which `initialize()` only registers behind a `typeof` guard,
 *     so it can legitimately be absent.
 *
 * @see docs/legal/dpia-sensitive-wellness-data.md §2 (Sentry)
 */

const mockInit = jest.fn();
const mockAddEventProcessor = jest.fn();
const mockCaptureFeedback = jest.fn();
const mockShowFeedbackWidget = jest.fn();

jest.mock('@sentry/react-native', () => ({
  init: (...args: unknown[]) => mockInit(...args),
  addEventProcessor: (...args: unknown[]) => mockAddEventProcessor(...args),
  captureFeedback: (...args: unknown[]) => mockCaptureFeedback(...args),
  // Present in the mock ON PURPOSE. If it were absent, "the presenter is never
  // called" would pass because the module lacks it, not because we stopped
  // calling it — the vacuous-green shape this repo keeps finding.
  showFeedbackWidget: (...args: unknown[]) => mockShowFeedbackWidget(...args),
  feedbackIntegration: jest.fn((opts: unknown) => ({ name: 'MobileFeedback', options: opts })),
}));

// `bug_reporting` is a BUILD-TIME flag read from EXPO_PUBLIC_FEATURE_FLAGS, which
// is unset under jest — so without this every `showFeedbackForm()` case would
// pass through the flag guard and prove nothing. Mocked rather than stubbed into
// the env so the guard itself can be exercised in both directions below.
const mockIsFeatureEnabled = jest.fn(() => true);
jest.mock('@/core/services/featureFlags', () => ({
  isFeatureEnabled: (...args: unknown[]) => mockIsFeatureEnabled(...(args as [])),
}));

import { ExternalErrorReporter } from '@/core/services/logging/ExternalErrorReporter';
import { useBugReportStore } from '@/core/stores/bugReportStore';

const TEST_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0';

async function freshReporter(): Promise<ExternalErrorReporter> {
  (ExternalErrorReporter as any).instance = undefined;
  jest.clearAllMocks();
  const reporter = ExternalErrorReporter.getInstance();
  await reporter.initialize(TEST_DSN);
  mockIsFeatureEnabled.mockReturnValue(true);
  return reporter;
}

beforeEach(() => {
  useBugReportStore.setState({ visible: false });
});

describe('FEAT-570 · the SDK presenter is gone', () => {
  it('never calls showFeedbackWidget when the form is opened', async () => {
    const reporter = await freshReporter();
    reporter.showFeedbackForm();
    expect(mockShowFeedbackWidget).not.toHaveBeenCalled();
  });

  it('opens our own form instead', async () => {
    const reporter = await freshReporter();
    reporter.showFeedbackForm();
    expect(useBugReportStore.getState().visible).toBe(true);
  });

  it('is gated by the bug_reporting flag, in ONE place both entries funnel through', async () => {
    // crisis constraint: the flag check lives at showFeedbackForm(), not
    // duplicated by convention at each call site. The store stays flag-free.
    const reporter = await freshReporter();
    mockIsFeatureEnabled.mockReturnValue(false);

    reporter.showFeedbackForm();
    expect(useBugReportStore.getState().visible).toBe(false);
  });

  it('the mocked presenter is callable — the assertion above is not vacuous', () => {
    // Without this, deleting `showFeedbackWidget` from the mock would make the
    // first case pass for the wrong reason.
    const sentry = require('@sentry/react-native');
    expect(typeof sentry.showFeedbackWidget).toBe('function');
  });
});

describe('FEAT-570 · the kill switch covers feedback on the SUBMIT path', () => {
  it('refuses submission once the reporter is killed', async () => {
    const reporter = await freshReporter();
    reporter.kill();

    expect(reporter.submitFeedback('the send button does nothing')).toBe(false);
    expect(mockCaptureFeedback).not.toHaveBeenCalled();
  });

  it('accepts submission while the reporter is active — the refusal is real', async () => {
    const reporter = await freshReporter();
    expect(reporter.submitFeedback('the send button does nothing')).toBe(true);
    expect(mockCaptureFeedback).toHaveBeenCalledTimes(1);
  });

  it('reads `killed` FRESH at submit time, not from when the form opened', async () => {
    // kill() is an emergency circuit breaker and can fire while the form is
    // already open with text in it. A value cached at open time would submit
    // straight through it.
    const reporter = await freshReporter();
    reporter.showFeedbackForm();
    expect(useBugReportStore.getState().visible).toBe(true);

    reporter.kill();

    expect(reporter.submitFeedback('typed before the kill landed')).toBe(false);
    expect(mockCaptureFeedback).not.toHaveBeenCalled();
  });

  it('still OPENS the form while killed — refusing to open would be a silent no-op', async () => {
    // Ruled by crisis + compliance: the kill switch changes what the form
    // RENDERS (no input, no submit control), never whether the entry point
    // responds. A Profile card that advertises "Report a bug" and does nothing
    // is the silence this item exists to remove.
    const reporter = await freshReporter();
    reporter.kill();
    reporter.showFeedbackForm();
    expect(useBugReportStore.getState().visible).toBe(true);
  });
});

describe('FEAT-570 · the submitted payload carries no identity', () => {
  it('sends message + source and nothing else', async () => {
    const reporter = await freshReporter();
    reporter.submitFeedback('the timer resets when I background the app');

    const [params] = mockCaptureFeedback.mock.calls[0];
    expect(params).toEqual({
      message: 'the timer resets when I background the app',
      source: 'first-party-form',
    });
  });

  it('omits name, email and associatedEventId at SOURCE', async () => {
    // Omitted rather than deleted downstream. `scrubFeedbackEvent` strips
    // associated_event_id but never reads contact_email or name, so relying on
    // the processor for these would rely on something that does not happen.
    const reporter = await freshReporter();
    reporter.submitFeedback('a report');

    const [params] = mockCaptureFeedback.mock.calls[0];
    expect(params).not.toHaveProperty('name');
    expect(params).not.toHaveProperty('email');
    expect(params).not.toHaveProperty('associatedEventId');
  });

  it('is not wrapped in a scope — the event processor must still see it', async () => {
    // `scrubFeedbackEvent` is registered on the ISOLATION scope via
    // addEventProcessor. captureFeedback is called with ONE argument, so no
    // scope override is passed.
    const reporter = await freshReporter();
    reporter.submitFeedback('a report');
    expect(mockCaptureFeedback.mock.calls[0]).toHaveLength(1);
  });
});

describe('FEAT-570 · the message is scrubbed at the call site', () => {
  it('redacts an inline email before the event is built', async () => {
    const reporter = await freshReporter();
    reporter.submitFeedback('reach me at leaked@example.com about this');

    const [params] = mockCaptureFeedback.mock.calls[0];
    expect(params.message).not.toContain('leaked@example.com');
    expect(params.message).toContain('[REDACTED]');
  });

  it('truncates to the 500-char contract', async () => {
    // Deliberately PROSE, not `'x'.repeat(900)`: a long single-character run
    // matches one of SENSITIVE_DATA_PATTERNS' secret shapes and scrubs to
    // `[REDACTED]`, so that fixture never reached the truncation it claimed to
    // test — it was 10 characters long and passing for the wrong reason.
    const reporter = await freshReporter();
    reporter.submitFeedback('the breathing timer drifts a little every cycle. '.repeat(30));

    const [params] = mockCaptureFeedback.mock.calls[0];
    expect(params.message).toHaveLength(500);
  });

  it('refuses a message that scrubs down to nothing', async () => {
    const reporter = await freshReporter();
    expect(reporter.submitFeedback('   ')).toBe(false);
    expect(mockCaptureFeedback).not.toHaveBeenCalled();
  });
});

describe('FEAT-570 · the integration stays registered as an identity floor', () => {
  it('registers feedbackIntegration with showName and showEmail false', async () => {
    await freshReporter();
    const options = mockInit.mock.calls[0][0];
    const integrations = options.integrations([]);
    const feedback = integrations.find((i: any) => i.name === 'MobileFeedback');

    // Not decorative. With no MobileFeedback integration registered,
    // getFeedbackOptions() returns {} and FeedbackWidget falls back to
    // defaultProps, where showName and showEmail are BOTH true. scrubFeedbackEvent
    // never reads contact_email or name, so this registration is the only control
    // on them if a presenter call is ever reintroduced.
    expect(feedback).toBeDefined();
    expect(feedback.options.showName).toBe(false);
    expect(feedback.options.showEmail).toBe(false);
  });

  it('pins both screenshot options OFF rather than omitting them', async () => {
    // The SDK defaults agree today, but omission would inherit whatever a future
    // SDK bump makes the default, and the drift direction is toward capturing —
    // over a mid-assessment or journal screen, on a root-armed surface.
    await freshReporter();
    const options = mockInit.mock.calls[0][0];
    const feedback = options.integrations([]).find((i: any) => i.name === 'MobileFeedback');

    expect(feedback.options.enableScreenshot).toBe(false);
    expect(feedback.options.enableTakeScreenshot).toBe(false);
  });
});
