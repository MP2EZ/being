/**
 * CONTRACT — INFRA-555 Sentry `environment` discriminates simulator traffic.
 *
 * The safety-gate build (`npm run e2e:safety:build`) is a Release build that resolves
 * `.env.production`, so it carries the live DSN and `__DEV__ === false`. Before INFRA-555,
 * `detectEnvironment()` fell through to `'production'` for it, and every error event in
 * `being-prod` over the first 90 days was a simulator reporting as production.
 *
 * An env var cannot discriminate that build — the gate uses the production env on purpose —
 * so the probe is `expo-device`'s `Device.isDevice`, read at runtime.
 *
 * Pinned here:
 * 1. A simulator never reports as `production`, at every point the value leaves the reporter
 *    (`Sentry.init`, which also configures the native SDK; `beforeSend`; `captureException` tags).
 * 2. RETAGGED, NOT DROPPED. A simulator event still survives `beforeSend`. Dropping would make
 *    `count() = 0` ambiguous again between "quiet" and "never receiving".
 * 3. FAIL DIRECTION. Only an explicit `isDevice === false` retags. An unresolved probe reports
 *    `production`: hiding a real device's crash from production triage is the worse error.
 *
 * Runs in `npm run precommit` via `test:privacy`.
 *
 * @see docs/development/post-launch-monitoring-runbook.md §1
 */

const mockInit = jest.fn();
const mockCaptureException = jest.fn();

jest.mock('@sentry/react-native', () => ({
  init: (...args: unknown[]) => mockInit(...args),
  captureException: (...args: unknown[]) => mockCaptureException(...args),
  addEventProcessor: jest.fn(),
  feedbackIntegration: jest.fn(() => ({ name: 'Feedback' })),
}));

import { ExternalErrorReporter } from '@/core/services/logging/ExternalErrorReporter';

const TEST_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0';

// Both objects are SHARED with every other suite in the worker. A leaked `isDevice: false`
// would silently invert the haptics eligibility assertions, so afterEach restores all three.
const mockDevice = jest.requireMock('expo-device') as { isDevice: boolean | undefined };
const mockPlatform = jest.requireMock('react-native').Platform as { OS: string };
const globalWithDev = global as unknown as { __DEV__: boolean };

const ORIGINAL_IS_DEVICE = mockDevice.isDevice;
const ORIGINAL_OS = mockPlatform.OS;
const ORIGINAL_DEV = globalWithDev.__DEV__;

/** A fresh singleton built under the given probe readings, initialized against a test DSN. */
async function reporterUnder(probe: {
  isDev: boolean;
  isDevice: boolean | undefined;
  os?: string;
}) {
  globalWithDev.__DEV__ = probe.isDev;
  mockDevice.isDevice = probe.isDevice;
  mockPlatform.OS = probe.os ?? 'ios';
  (ExternalErrorReporter as any).instance = undefined;
  mockInit.mockClear();
  mockCaptureException.mockClear();

  const reporter = ExternalErrorReporter.getInstance();
  await reporter.initialize(TEST_DSN);
  expect(mockInit).toHaveBeenCalledTimes(1);
  return { reporter, options: mockInit.mock.calls[0][0] };
}

function makeNativeShapedEvent(): any {
  return {
    level: 'error',
    message: 'App Hanging: App hanging for at least 2000 ms.',
    platform: 'cocoa',
    exception: {
      values: [
        {
          type: 'App Hanging',
          value: 'App hanging for at least 2000 ms.',
          mechanism: { type: 'AppHang', handled: true, synthetic: false },
        },
      ],
    },
  };
}

afterEach(() => {
  globalWithDev.__DEV__ = ORIGINAL_DEV;
  mockDevice.isDevice = ORIGINAL_IS_DEVICE;
  mockPlatform.OS = ORIGINAL_OS;
  (ExternalErrorReporter as any).instance = undefined;
});

describe('INFRA-555 — a simulator Release build does not report as production', () => {
  it('resolves `simulator` when the device probe reports a simulator', async () => {
    const { reporter } = await reporterUnder({ isDev: false, isDevice: false });
    expect(reporter.getStatus().environment).toBe('simulator');
  });

  it('passes `simulator` to Sentry.init, which is what the native SDK tags its own events with', async () => {
    // JAVASCRIPT-REACT-5/6 were native AppHang events that never touch beforeSend, so the init
    // option — forwarded to RNSentry.initNativeSdk — is the only place their environment is set.
    const { options } = await reporterUnder({ isDev: false, isDevice: false });
    expect(options.environment).toBe('simulator');
    expect(options.environment).not.toBe('production');
  });

  it('tags a captured JS error with `simulator`', async () => {
    const { reporter } = await reporterUnder({ isDev: false, isDevice: false });
    await reporter.reportError(new Error('boom'));

    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    expect(mockCaptureException.mock.calls[0][1].tags.environment).toBe('simulator');
  });
});

describe('INFRA-555 — retagged, not dropped', () => {
  it('a simulator event still survives beforeSend, carrying the simulator environment', async () => {
    const { options } = await reporterUnder({ isDev: false, isDevice: false });
    const sent = options.beforeSend(makeNativeShapedEvent());

    expect(sent).not.toBeNull();
    expect(sent.environment).toBe('simulator');
  });
});

describe('INFRA-555 — every other build resolves as before', () => {
  it('a physical device Release build is still `production`', async () => {
    const { reporter, options } = await reporterUnder({ isDev: false, isDevice: true });
    expect(reporter.getStatus().environment).toBe('production');
    expect(options.environment).toBe('production');
  });

  it('a __DEV__ build is `development` even on a simulator', async () => {
    const { reporter } = await reporterUnder({ isDev: true, isDevice: false });
    expect(reporter.getStatus().environment).toBe('development');
  });

  it('an unresolved probe reports `production` — never hides a real device from triage', async () => {
    const { reporter } = await reporterUnder({ isDev: false, isDevice: undefined });
    expect(reporter.getStatus().environment).toBe('production');
  });

  it('Android reports `production` even when the probe says emulator', async () => {
    // Android's isDevice is a substring heuristic that can match a real device on a custom
    // ROM — the hide-a-real-crash direction. The gate is iOS-only, so it buys nothing there.
    const { reporter } = await reporterUnder({ isDev: false, isDevice: false, os: 'android' });
    expect(reporter.getStatus().environment).toBe('production');
  });
});
