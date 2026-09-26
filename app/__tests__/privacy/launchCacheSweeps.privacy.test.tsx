/**
 * DEBUG-655 — both cache sweeps run at launch, and neither can take init down with it.
 *
 * A data export stranded by a process killed mid-share, and raw audio stranded by a crash
 * mid-recording, both sit in the app cache. Account deletion sweeps them, but a user who
 * never deletes their account kept them indefinitely: nothing swept the cache at launch
 * for exports, and the audio sweep FEAT-283 wired into `initializeApp` had no test at all,
 * so deleting it turned nothing red.
 *
 * WHY A RENDER AND NOT A SOURCE PIN. The ruling that matters here is behavioural: each
 * sweep runs once, after the first commit (never at module scope, where it would delay
 * the first paint of every 988 affordance), in its OWN try/catch, so a throw in one can
 * neither skip the other nor skip the crisis telemetry and monitoring init that follow.
 * A source pin can see a `try`; only running it can see the rest.
 *
 * Every dependency below is mocked to a no-op except what is under test. The navigator is
 * a stub, so this renders App's init effect and nothing of the crisis UI — that is pinned
 * by crisis-zero-988-windows.test.tsx, which this suite must never replace.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

const mockOrder: string[] = [];
const track = (name: string, impl: () => unknown = () => undefined) =>
  jest.fn(() => {
    mockOrder.push(name);
    return impl();
  });

const mockSweepExport = track('sweepExport', () => 0);
const mockSweepAudio = track('sweepAudio', () => 0);
const mockEncryptionInit = track('encryptionInit', () => Promise.resolve());
const mockSeed = track('seed', () => Promise.resolve());
const mockTelemetry = track('telemetry', () => Promise.resolve());
const mockMonitoring = track('monitoring', () => Promise.resolve());
const mockLogSystem = jest.fn();
const mockLogError = jest.fn();

jest.mock('@/core/services/privacy/exportArtifactSweeper', () => ({
  sweepExportArtifacts: (...a: unknown[]) => mockSweepExport(...(a as [])),
}));
jest.mock('@/core/services/speech/audioArtifactSweeper', () => ({
  sweepStaleAudioArtifacts: (...a: unknown[]) => mockSweepAudio(...(a as [])),
}));
jest.mock('@/core/services/security/legacyPlaintextRecordSweeper', () => ({
  sweepLegacyPlaintextRecords: jest.fn(() => Promise.resolve(0)),
}));
jest.mock('@/core/services/security/EncryptionService', () => ({
  __esModule: true,
  default: { initialize: () => mockEncryptionInit() },
}));
jest.mock('@/core/config/e2eSeed', () => ({ maybeSeedE2EOnboardedState: () => mockSeed() }));
jest.mock('@/core/services/supabase/SupabaseService', () => ({
  __esModule: true,
  default: { initializeCrisisTelemetry: () => mockTelemetry() },
}));
jest.mock('@/core/services/monitoring', () => ({ initializeCrisisMonitoring: () => mockMonitoring() }));
jest.mock('@/core/services/data-retention', () => ({
  DataRetentionService: { runRetentionCleanup: jest.fn(() => Promise.resolve()) },
}));
jest.mock('@/core/services/subscription/IAPService', () => ({
  IAPService: { isAvailable: () => false, initialize: jest.fn() },
}));
jest.mock('@/core/stores/subscriptionStore', () => ({
  useSubscriptionStore: { getState: () => ({ loadSubscription: jest.fn(() => Promise.resolve()) }) },
}));
jest.mock('@/core/services/logging', () => ({
  initializeExternalReporting: jest.fn(() => Promise.resolve()),
  logSystem: (...a: unknown[]) => mockLogSystem(...a),
  logError: (...a: unknown[]) => mockLogError(...a),
  logCrisis: jest.fn(),
  LogCategory: { SYSTEM: 'SYSTEM' },
}));
jest.mock('@/core/navigation/CleanRootNavigator', () => ({ __esModule: true, default: () => null }));
jest.mock('@/features/crisis/components/RootCrisisBoundary', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/core/analytics', () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/core/hooks/useBugReportShake', () => ({ useBugReportShake: jest.fn() }));
jest.mock('@sentry/react-native', () => ({
  wrap: (c: unknown) => c,
  startSpan: (_o: unknown, fn: () => unknown) => fn(),
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('expo-dev-menu', () => ({ closeMenu: jest.fn() }));

// Loaded ONCE. `jest.resetModules()` would hand App a second React instance from the one
// `render` uses. Sweep calls are recorded right after the load, before any render: a
// module-scope call would show up here.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const App: React.ComponentType = require('../../App').default;
const callsAtLoad = { export: mockSweepExport.mock.calls.length, audio: mockSweepAudio.mock.calls.length };

const initComplete = () =>
  waitFor(() => expect(mockLogSystem).toHaveBeenCalledWith('App initialization complete'));

beforeEach(() => {
  mockOrder.length = 0;
  [mockSweepExport, mockSweepAudio, mockEncryptionInit, mockSeed, mockTelemetry, mockMonitoring, mockLogSystem, mockLogError].forEach(
    (m) => m.mockClear()
  );
  mockSweepExport.mockImplementation(() => {
    mockOrder.push('sweepExport');
    return 0;
  });
  mockSweepAudio.mockImplementation(() => {
    mockOrder.push('sweepAudio');
    return 0;
  });
});

describe('DEBUG-655 — launch-time cache sweeps', () => {
  test('neither sweep runs at module scope, where it would delay first paint', () => {
    expect(callsAtLoad).toEqual({ export: 0, audio: 0 });
  });

  test('after the first commit, each sweep runs exactly once, before encryption init', async () => {
    render(<App />);
    await initComplete();
    expect(mockSweepExport).toHaveBeenCalledTimes(1);
    expect(mockSweepAudio).toHaveBeenCalledTimes(1);
    expect(mockOrder.indexOf('sweepExport')).toBeGreaterThan(-1);
    expect(mockOrder.indexOf('sweepExport')).toBeLessThan(mockOrder.indexOf('encryptionInit'));
    expect(mockOrder.indexOf('sweepAudio')).toBeLessThan(mockOrder.indexOf('encryptionInit'));
  });

  test.each([
    ['the export sweep', 'export'],
    ['the audio sweep', 'audio'],
    ['both sweeps', 'both'],
  ])('%s throwing skips nothing else in init', async (_label, which) => {
    const boom = () => {
      throw new Error('sweep exploded');
    };
    if (which !== 'audio') mockSweepExport.mockImplementation(boom);
    if (which !== 'export') mockSweepAudio.mockImplementation(boom);

    render(<App />);
    await initComplete();

    // The other sweep still ran: one throw cannot skip its sibling.
    expect(mockSweepExport).toHaveBeenCalledTimes(1);
    expect(mockSweepAudio).toHaveBeenCalledTimes(1);
    // And everything after them still ran, including the crisis telemetry and monitoring.
    expect(mockEncryptionInit).toHaveBeenCalledTimes(1);
    expect(mockSeed).toHaveBeenCalledTimes(1);
    expect(mockTelemetry).toHaveBeenCalledTimes(1);
    expect(mockMonitoring).toHaveBeenCalledTimes(1);
    // Contained at the call site, not by the outer init catch.
    expect(mockLogError).not.toHaveBeenCalledWith('SYSTEM', 'App initialization error', expect.anything());
    expect(mockLogError).toHaveBeenCalledWith('SYSTEM', expect.stringMatching(/sweep failed \(non-blocking\)/), expect.any(Error));
  });

  test('a swept count is logged without naming any file', async () => {
    mockSweepExport.mockImplementation(() => 2);
    render(<App />);
    await initComplete();
    const line = mockLogSystem.mock.calls.map((c) => String(c[0])).find((m) => /export/i.test(m));
    expect(line).toMatch(/2/);
    expect(line).not.toMatch(/being-export-/);
  });
});
