/**
 * PRIVACY CONTRACT — ExternalErrorReporter operator/emergency kill switch (MAINT-748).
 *
 * `kill()` is an operator/emergency circuit breaker: something we fire when a
 * privacy concern is found in the external reporting path. It is NOT the user's
 * opt-out. There is no consent gate and no environment switch in this module —
 * `environment` is a label, never a switch — and the only other "off" state is
 * the empty-DSN sentinel, which is an absence of configuration rather than an
 * incident. Sentry consent gating is tracked separately (DEBUG-776) and is
 * deliberately NOT asserted here.
 *
 * What this file pins is the part of the breaker that fails SILENTLY if it
 * regresses: a reporter that still transmits after `kill()` looks identical, on
 * screen, to one that does not.
 *
 * `bugReportSubmit.contract.test.ts` already owns: kill refuses submitFeedback
 * (including the fresh read at submit time), kill still OPENS the form, the
 * payload shape, call-site scrubbing and the identity floor. Those cases are
 * deliberately not repeated here — this file covers the lifecycle and the two
 * Sentry hooks, plus the `submitFeedback` gaps that file leaves open.
 *
 * Isolation: the reporter is a module-level singleton and the module-level
 * convenience functions close over it, so resetting the static instance alone
 * would not reach them. Every case therefore loads a fresh module graph.
 */

const mockInit = jest.fn();
const mockClose = jest.fn();
const mockCaptureException = jest.fn();
const mockCaptureFeedback = jest.fn();
const mockAddEventProcessor = jest.fn();
const mockFeedbackIntegration = jest.fn((opts: unknown) => ({
  name: 'MobileFeedback',
  options: opts,
}));

// A single mutable object so one case can delete `captureFeedback` before the
// reporter reads it. The factory is lazy: it runs at the first require inside a
// test, after these consts have initialised.
const mockSentry: Record<string, unknown> = {};
function resetSentryMock(): void {
  for (const key of Object.keys(mockSentry)) delete mockSentry[key];
  Object.assign(mockSentry, {
    init: (...args: unknown[]) => mockInit(...args),
    close: (...args: unknown[]) => mockClose(...args),
    captureException: (...args: unknown[]) => mockCaptureException(...args),
    captureFeedback: (...args: unknown[]) => mockCaptureFeedback(...args),
    addEventProcessor: (...args: unknown[]) => mockAddEventProcessor(...args),
    feedbackIntegration: (opts: unknown) => mockFeedbackIntegration(opts),
  });
}

jest.mock('@sentry/react-native', () => mockSentry);

// The empty-DSN sentinel case must not depend on the ambient test env.
jest.mock('@/core/config/env', () => ({
  env: { EXPO_PUBLIC_SENTRY_DSN: '' },
}));

const mockIsReady = jest.fn(() => true);
const mockGetCurrentRoute = jest.fn((): { name: string } | undefined => ({ name: 'Home' }));
jest.mock('@/core/navigation/navigationRef', () => ({
  navigationRef: {
    isReady: (...args: unknown[]) => mockIsReady(...(args as [])),
    getCurrentRoute: (...args: unknown[]) => mockGetCurrentRoute(...(args as [])),
  },
}));

type ReporterModule = typeof import('@/core/services/logging/ExternalErrorReporter');

const TEST_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0';

/** A fresh module graph, so no singleton state survives from a previous case. */
function loadModule(): ReporterModule {
  let mod!: ReporterModule;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mod = require('@/core/services/logging/ExternalErrorReporter');
  });
  return mod;
}

async function freshInitialized(): Promise<ReporterModule> {
  const mod = loadModule();
  const ok = await mod.externalErrorReporter.initialize(TEST_DSN);
  expect(ok).toBe(true);
  return mod;
}

/** The hooks exactly as the SDK receives them, not reached through private fields. */
function registeredHooks(): {
  beforeSend: (event: unknown) => unknown;
  beforeBreadcrumb: (crumb: unknown) => unknown;
} {
  expect(mockInit).toHaveBeenCalledTimes(1);
  const options = mockInit.mock.calls[0][0];
  expect(typeof options.beforeSend).toBe('function');
  expect(typeof options.beforeBreadcrumb).toBe('function');
  return options;
}

const BENIGN_EVENT = { message: 'timer drifted', level: 'error' };
const BENIGN_CRUMB = { category: 'console', message: 'timer drifted' };

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  // clearAllMocks keeps implementations; a case that made one throw must not leak.
  mockClose.mockReset();
  mockCaptureFeedback.mockReset();
  resetSentryMock();
  mockIsReady.mockReturnValue(true);
  mockGetCurrentRoute.mockReturnValue({ name: 'Home' });
  // kill() logs a critical security line at ERROR, which the test logger prints.
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('MAINT-748 · kill() ordering against initialize()', () => {
  it('kill before initialize resolves false and never calls Sentry.init', async () => {
    const mod = loadModule();
    mod.killExternalReporting();

    await expect(mod.externalErrorReporter.initialize(TEST_DSN)).resolves.toBe(false);

    expect(mockInit).not.toHaveBeenCalled();
    expect(mod.isExternalReportingActive()).toBe(false);
    expect(mod.isExternalReportingKilled()).toBe(true);
  });

  it('initialize then kill closes the SDK once and flips the three readings', async () => {
    const mod = await freshInitialized();
    // Anti-vacuity: the reading really was live before the breaker fired.
    expect(mod.isExternalReportingActive()).toBe(true);
    expect(mod.isExternalReportingKilled()).toBe(false);

    mod.killExternalReporting();

    expect(mockClose).toHaveBeenCalledTimes(1);
    expect(mod.externalErrorReporter.isActive()).toBe(false);
    expect(mod.isExternalReportingActive()).toBe(false);
    expect(mod.isExternalReportingKilled()).toBe(true);
  });

  it('still marks the breaker fired when Sentry.close throws', async () => {
    mockClose.mockImplementation(() => {
      throw new Error('native close failed');
    });
    const mod = await freshInitialized();

    expect(() => mod.killExternalReporting()).not.toThrow();
    expect(mod.isExternalReportingKilled()).toBe(true);
    expect(mod.isExternalReportingActive()).toBe(false);
  });

  it('refuses to re-initialize after it has fired', async () => {
    const mod = await freshInitialized();
    mod.killExternalReporting();
    mockInit.mockClear();

    await expect(mod.externalErrorReporter.initialize(TEST_DSN)).resolves.toBe(false);
    expect(mockInit).not.toHaveBeenCalled();
    expect(mod.isExternalReportingActive()).toBe(false);
  });
});

describe('MAINT-748 · nothing is transmitted once the breaker has fired', () => {
  it('reportError captures while active and stops after kill()', async () => {
    const mod = await freshInitialized();

    await mod.reportExternalError(new Error('boom'));
    expect(mockCaptureException).toHaveBeenCalledTimes(1);

    mod.killExternalReporting();
    mockCaptureException.mockClear();

    await mod.reportExternalError(new Error('boom again'));
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('beforeSend passes a benign event while active and returns null after kill()', async () => {
    const mod = await freshInitialized();
    const { beforeSend } = registeredHooks();

    // Anti-vacuity: a hook that always returned null would pass the second
    // assertion for the wrong reason.
    expect(beforeSend({ ...BENIGN_EVENT })).not.toBeNull();

    mod.killExternalReporting();

    expect(beforeSend({ ...BENIGN_EVENT })).toBeNull();
  });

  it('beforeBreadcrumb passes a benign crumb while active and returns null after kill()', async () => {
    const mod = await freshInitialized();
    const { beforeBreadcrumb } = registeredHooks();

    expect(beforeBreadcrumb({ ...BENIGN_CRUMB })).not.toBeNull();

    mod.killExternalReporting();

    expect(beforeBreadcrumb({ ...BENIGN_CRUMB })).toBeNull();
  });
});

describe('MAINT-748 · the empty-DSN sentinel is the only other off state', () => {
  it.each([
    ['no argument', undefined],
    ['an empty string', ''],
  ])('initialize with %s resolves false and never calls Sentry.init', async (_label, dsn) => {
    const mod = loadModule();

    await expect(mod.externalErrorReporter.initialize(dsn)).resolves.toBe(false);

    expect(mockInit).not.toHaveBeenCalled();
    expect(mod.isExternalReportingActive()).toBe(false);
    // Absence of configuration is not an incident: the breaker has NOT fired.
    expect(mod.isExternalReportingKilled()).toBe(false);
  });
});

describe('MAINT-748 · submitFeedback gaps', () => {
  it('refuses when the reporter was never initialized', () => {
    const mod = loadModule();

    expect(mod.submitFeedback('the send button does nothing')).toBe(false);
    expect(mockCaptureFeedback).not.toHaveBeenCalled();
  });

  it('refuses when the SDK has no captureFeedback', async () => {
    const mod = await freshInitialized();
    delete mockSentry.captureFeedback;

    expect(mod.submitFeedback('the send button does nothing')).toBe(false);
    expect(mockCaptureFeedback).not.toHaveBeenCalled();
  });

  it('refuses, rather than throwing, when captureFeedback throws', async () => {
    const mod = await freshInitialized();
    mockCaptureFeedback.mockImplementation(() => {
      throw new Error('transport down');
    });

    expect(mod.submitFeedback('the send button does nothing')).toBe(false);
    expect(mockCaptureFeedback).toHaveBeenCalledTimes(1);
  });

  it('carries only the allowlisted keys, and no identity key at all, when no route is known', async () => {
    // Distinct angle from bugReportSubmit's toEqual: with navigation not ready the
    // tag is omitted, so the payload is EXACTLY message + source. Any identity
    // field added later (name, email, associatedEventId) changes this key set.
    mockIsReady.mockReturnValue(false);
    const mod = await freshInitialized();

    expect(mod.submitFeedback('the app opened to a blank screen')).toBe(true);

    const [params] = mockCaptureFeedback.mock.calls[0];
    expect(Object.keys(params).sort()).toEqual(['message', 'source']);
  });
});
