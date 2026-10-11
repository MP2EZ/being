/**
 * PRIVACY CONTRACT — Sentry follows the crash-reports consent and Universal Opt-Out (DEBUG-776).
 *
 * Privacy policy §5.3: Universal Opt-Out "immediately suppresses all non-essential analytics,
 * crash reporting". §6: "Opt-Out: Disable ... crash reporting". Before DEBUG-776,
 * `initializeExternalReporting()` (App.tsx) started Sentry unconditionally — crash events,
 * breadcrumbs and release-health sessions left the device whatever the toggle said.
 *
 * Founder rulings (2026-10-10): AC1 (a) fix the code to match the policy. AC5: a bug report
 * the user sends is separate processing, consented by the act of sending, so it is NOT
 * suppressed by the crash-reports toggle — it goes through a feedback-only client with no
 * crash handler, no sessions and no breadcrumbs, closed after the send.
 *
 * Drives the REAL consent store through the REAL `initializeExternalReporting` wiring, in a
 * fresh module graph per case. `canPerformOperation('crash_reports')` is the only consent
 * input: false while consent is still loading, false unless crash reports were granted, and
 * false under Universal Opt-Out.
 */

const mockInit = jest.fn();
const mockClientClose = jest.fn(() => Promise.resolve(true));
const mockClose = jest.fn(() => Promise.resolve());
const mockCaptureException = jest.fn();
const mockCaptureFeedback = jest.fn();
const mockAddEventProcessor = jest.fn();
const mockClearBreadcrumbs = jest.fn();
const mockFeedbackIntegration = jest.fn((opts: unknown) => ({ name: 'MobileFeedback', options: opts }));

jest.mock('@sentry/react-native', () => ({
  init: (...args: unknown[]) => mockInit(...args),
  close: (...args: unknown[]) => mockClose(...(args as [])),
  captureException: (...args: unknown[]) => mockCaptureException(...args),
  captureFeedback: (...args: unknown[]) => mockCaptureFeedback(...args),
  addEventProcessor: (...args: unknown[]) => mockAddEventProcessor(...args),
  feedbackIntegration: (opts: unknown) => mockFeedbackIntegration(opts),
  getClient: () => ({ close: (...args: unknown[]) => mockClientClose(...(args as [])) }),
  getIsolationScope: () => ({ clearBreadcrumbs: () => mockClearBreadcrumbs() }),
}));

const TEST_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0';

jest.mock('@/core/config/env', () => ({
  ...jest.requireActual('@/core/config/env'),
  env: { ...jest.requireActual('@/core/config/env').env, EXPO_PUBLIC_SENTRY_DSN: 'https://examplePublicKey@o0.ingest.sentry.io/0' },
}));

jest.mock('@/core/navigation/navigationRef', () => ({
  ...jest.requireActual('@/core/navigation/navigationRef'),
  navigationRef: { isReady: () => true, getCurrentRoute: () => ({ name: 'Home' }) },
}));

type Logging = typeof import('@/core/services/logging');
type Reporter = typeof import('@/core/services/logging/ExternalErrorReporter');
type ConsentModule = typeof import('@/core/stores/consentStore');

interface Graph {
  logging: Logging;
  reporter: Reporter;
  store: ConsentModule['useConsentStore'];
}

/** Lets the gate's deferred init/close and its promise chain run. */
async function flush(): Promise<void> {
  for (let i = 0; i < 4; i++) await new Promise((r) => setTimeout(r, 0));
}

/** A fresh module graph; `body` runs inside it, so the reporter's lazy store import resolves here. */
async function inGraph(body: (g: Graph) => Promise<void>): Promise<void> {
  await jest.isolateModulesAsync(async () => {
    /* eslint-disable @typescript-eslint/no-var-requires */
    const logging = require('@/core/services/logging') as Logging;
    const reporter = require('@/core/services/logging/ExternalErrorReporter') as Reporter;
    const { useConsentStore } = require('@/core/stores/consentStore') as ConsentModule;
    /* eslint-enable @typescript-eslint/no-var-requires */
    await body({ logging, reporter, store: useConsentStore });
  });
}

function setConsent(
  store: Graph['store'],
  c: { status: 'loading' | 'valid'; crash?: boolean; uoo?: boolean },
): void {
  store.setState({
    consentStatus: c.status,
    consentCache: {
      ...store.getState().consentCache,
      canCollectCrashReports: c.crash === true,
      honorUniversalOptOut: c.uoo === true,
    },
  } as never);
}

/** The full client: the init that registers the crash handler and sessions. */
const fullInits = () => mockInit.mock.calls.filter(([o]) => o?.enableAutoSessionTracking === true);

// The first case loads the whole logging + consent module graph cold.
jest.setTimeout(30_000);

let consoleErrorSpy: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => consoleErrorSpy.mockRestore());

describe('DEBUG-776 · default deny at boot', () => {
  it('consent still loading: initializeExternalReporting() does not start Sentry', async () => {
    await inGraph(async ({ logging, store }) => {
      setConsent(store, { status: 'loading' });
      await logging.initializeExternalReporting();
      await flush();
      expect(mockInit).not.toHaveBeenCalled();
    });
  });

  it('valid consent with crash reports OFF (the default): no Sentry.init', async () => {
    await inGraph(async ({ logging, store }) => {
      setConsent(store, { status: 'valid', crash: false });
      await logging.initializeExternalReporting();
      await flush();
      expect(mockInit).not.toHaveBeenCalled();
    });
  });

  it('crash reports ON but Universal Opt-Out ON: no Sentry.init', async () => {
    await inGraph(async ({ logging, store }) => {
      setConsent(store, { status: 'valid', crash: true, uoo: true });
      await logging.initializeExternalReporting();
      await flush();
      expect(mockInit).not.toHaveBeenCalled();
    });
  });
});

describe('DEBUG-776 · consent granted', () => {
  it('starts the full client exactly once when crash reports are granted at boot', async () => {
    await inGraph(async ({ logging, store, reporter }) => {
      setConsent(store, { status: 'valid', crash: true });
      await logging.initializeExternalReporting();
      await flush();
      expect(fullInits()).toHaveLength(1);
      expect(fullInits()[0][0].dsn).toBe(TEST_DSN);
      expect(reporter.isExternalReportingActive()).toBe(true);
    });
  });

  it('starts it once consent HYDRATES to granted after boot (subscription, not a one-shot read)', async () => {
    await inGraph(async ({ logging, store }) => {
      setConsent(store, { status: 'loading' });
      await logging.initializeExternalReporting();
      await flush();
      expect(mockInit).not.toHaveBeenCalled();

      setConsent(store, { status: 'valid', crash: true });
      await flush();
      expect(fullInits()).toHaveLength(1);
    });
  });

  it('a second initializeExternalReporting() does not subscribe twice', async () => {
    await inGraph(async ({ logging, store }) => {
      setConsent(store, { status: 'loading' });
      await logging.initializeExternalReporting();
      await logging.initializeExternalReporting();
      setConsent(store, { status: 'valid', crash: true });
      await flush();
      expect(fullInits()).toHaveLength(1);
    });
  });
});

describe('DEBUG-776 · runtime withdrawal, Universal Opt-Out and re-grant', () => {
  it('withdrawal blocks capture IN THE SAME TICK, then closes the client — not the kill switch', async () => {
    await inGraph(async ({ logging, store, reporter }) => {
      setConsent(store, { status: 'valid', crash: true });
      await logging.initializeExternalReporting();
      await flush();
      const { beforeSend, beforeBreadcrumb } = fullInits()[0][0];

      setConsent(store, { status: 'valid', crash: false });

      // Synchronously, before any deferred close has run:
      expect(beforeSend({ message: 'timer drifted' })).toBeNull();
      expect(beforeBreadcrumb({ category: 'console', message: 'x' })).toBeNull();
      expect(reporter.isExternalReportingActive()).toBe(false);
      await reporter.reportExternalError(new Error('later'));
      expect(mockCaptureException).not.toHaveBeenCalled();

      await flush();
      expect(mockClose).toHaveBeenCalledTimes(1);
      expect(reporter.isExternalReportingKilled()).toBe(false);
    });
  });

  it('turning on Universal Opt-Out closes the client', async () => {
    await inGraph(async ({ logging, store }) => {
      setConsent(store, { status: 'valid', crash: true });
      await logging.initializeExternalReporting();
      await flush();

      setConsent(store, { status: 'valid', crash: true, uoo: true });
      await flush();
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  it('re-granting re-initializes, and clears breadcrumbs gathered while withdrawn', async () => {
    await inGraph(async ({ logging, store, reporter }) => {
      setConsent(store, { status: 'valid', crash: true });
      await logging.initializeExternalReporting();
      await flush();
      setConsent(store, { status: 'valid', crash: false });
      await flush();
      mockClearBreadcrumbs.mockClear();

      setConsent(store, { status: 'valid', crash: true });
      await flush();
      expect(fullInits()).toHaveLength(2);
      expect(mockClearBreadcrumbs).toHaveBeenCalled();
      expect(reporter.isExternalReportingActive()).toBe(true);
      // The feedback scrub processor is registered once, not stacked per init.
      expect(mockAddEventProcessor).toHaveBeenCalledTimes(1);
    });
  });

  it('a failing Sentry.init never throws back into the consent write', async () => {
    await inGraph(async ({ logging, store }) => {
      mockInit.mockImplementation(() => {
        throw new Error('native init failed');
      });
      setConsent(store, { status: 'loading' });
      await logging.initializeExternalReporting();
      expect(() => setConsent(store, { status: 'valid', crash: true })).not.toThrow();
      await flush();
      mockInit.mockReset();
    });
  });
});

describe('DEBUG-776 AC5 · a sent bug report is not suppressed by the crash-reports toggle', () => {
  it('with crash reports withheld, submitFeedback sends through a feedback-only client, then closes it', async () => {
    await inGraph(async ({ logging, store, reporter }) => {
      setConsent(store, { status: 'valid', crash: false });
      await logging.initializeExternalReporting();
      await flush();
      expect(mockInit).not.toHaveBeenCalled();

      expect(reporter.submitFeedback('The timer froze on step two')).toBe(true);

      expect(mockInit).toHaveBeenCalledTimes(1);
      const opts = mockInit.mock.calls[0][0];
      expect(opts).toEqual(
        expect.objectContaining({
          dsn: TEST_DSN,
          enableNative: false,
          defaultIntegrations: false,
          enableAutoSessionTracking: false,
          enableAutoPerformanceTracing: false,
          maxBreadcrumbs: 0,
        }),
      );
      expect(opts.integrations).toEqual([]);
      expect(opts.beforeSend({ message: 'an error' })).toBeNull();
      expect(opts.beforeBreadcrumb({ category: 'x' })).toBeNull();
      expect(mockCaptureFeedback).toHaveBeenCalledTimes(1);
      expect(mockCaptureFeedback.mock.calls[0]).toHaveLength(1);
      expect(mockClientClose).toHaveBeenCalledTimes(1);
      // A feedback send is not a crash-reporting grant.
      expect(reporter.isExternalReportingActive()).toBe(false);
    });
  });

  it('the kill switch still refuses a bug report on the feedback-only path', async () => {
    await inGraph(async ({ logging, store, reporter }) => {
      setConsent(store, { status: 'valid', crash: false });
      await logging.initializeExternalReporting();
      reporter.killExternalReporting();
      expect(reporter.submitFeedback('anything')).toBe(false);
      expect(mockCaptureFeedback).not.toHaveBeenCalled();
      expect(mockInit).not.toHaveBeenCalled();
    });
  });

  it('a message that scrubs to nothing starts no client at all', async () => {
    await inGraph(async ({ logging, store, reporter }) => {
      setConsent(store, { status: 'valid', crash: false });
      await logging.initializeExternalReporting();
      expect(reporter.submitFeedback('   ')).toBe(false);
      expect(mockInit).not.toHaveBeenCalled();
    });
  });
});
