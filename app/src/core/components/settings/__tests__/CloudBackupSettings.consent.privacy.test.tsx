/**
 * CloudBackupSettings opened without cloud_sync consent (DEBUG-757)
 *
 * Opening the Cloud Backup screen used to start Supabase and mint an anonymous session for a
 * user who had never turned backup on: useCloudSync's mount effect calls getCloudSyncStatus
 * and checkForCloudRestore, and its 30s poll calls getCloudSyncStatus again. Privacy policy
 * §4.1 says the identifier is created when you USE the optional backup, and §4.2 calls it
 * opt-in - a screen view is neither.
 *
 * CloudBackupSettings.test.tsx mocks useCloudSync wholesale, so it cannot see an init. This
 * suite renders the screen over the REAL hook and the REAL barrel, mocking only the two
 * service singletons and the consent store, so supabaseService.initialize is the observable.
 * signInAnonymously is reachable only through SupabaseService.ensureClient, whose sole caller
 * from this screen is initialize - so no initialize means no session.
 */
import React from 'react';
import { AppState } from 'react-native';
import { act, render } from '@testing-library/react-native';

const mockCanPerform = jest.fn();

const mockSupabase = {
  initialize: jest.fn(),
  getStatus: jest.fn(),
  processOfflineQueue: jest.fn(),
  cleanup: jest.fn(),
  trackEvent: jest.fn(),
};
const mockBackup = {
  initialize: jest.fn(),
  createBackup: jest.fn(),
  getBackupStatus: jest.fn(),
  restoreFromBackup: jest.fn(),
  updateConfig: jest.fn(),
  cleanup: jest.fn(),
};

jest.mock('@/core/services/supabase/SupabaseService', () => ({ __esModule: true, default: mockSupabase }));
jest.mock('@/core/services/supabase/CloudBackupService', () => ({ __esModule: true, default: mockBackup }));
jest.mock('@/core/stores/consentStore', () => ({
  useConsentStore: { getState: () => ({ canPerformOperation: mockCanPerform }) },
}));

/**
 * Required lazily, not imported: an import is hoisted above the mock fns, and the barrel reads
 * consent at import time. The module stays cached across tests, so afterEach resets the
 * barrel's own initialized flag through its public cleanup.
 */
function loadScreen(): React.ComponentType {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../CloudBackupSettings').default;
}

const POLL_MS = 30_000;

let addEventListenerSpy: jest.SpyInstance;

beforeEach(() => {
  jest.useFakeTimers();
  [...Object.values(mockSupabase), ...Object.values(mockBackup), mockCanPerform].forEach((fn) => fn.mockReset());
  mockSupabase.initialize.mockResolvedValue(undefined);
  mockSupabase.getStatus.mockReturnValue({
    isInitialized: false,
    offlineQueueSize: 0,
    circuitBreakerState: 'closed',
    lastSyncTime: undefined,
  });
  mockBackup.initialize.mockResolvedValue(undefined);
  mockBackup.getBackupStatus.mockResolvedValue({
    hasCloudBackup: true,
    hasLocalData: false,
    cloudBackupTime: 1234,
  });
  addEventListenerSpy = jest.spyOn(AppState, 'addEventListener');
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  await require('@/core/services/supabase').cleanupCloudServices();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function mountAndPollOnce() {
  const CloudBackupSettings = loadScreen();
  const screen = render(<CloudBackupSettings />);
  // The mount effect: refreshStatus, then checkForRestore, then the interval is armed.
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    jest.advanceTimersByTime(POLL_MS + 1);
    await Promise.resolve();
  });
  return screen;
}

it('without consent: mounting and one 30s poll start no cloud service and read no backup', async () => {
  mockCanPerform.mockReturnValue(false);

  const screen = await mountAndPollOnce();

  expect(mockCanPerform).toHaveBeenCalledWith('cloud_sync');
  expect(mockSupabase.initialize).not.toHaveBeenCalled();
  expect(mockBackup.initialize).not.toHaveBeenCalled();
  expect(mockBackup.getBackupStatus).not.toHaveBeenCalled();
  expect(addEventListenerSpy).not.toHaveBeenCalled();
  screen.unmount();
});

// Positive control: proves the suite can observe an init through the real hook and barrel,
// so the silence above is the gate and not an inert harness.
it('with consent: mounting initializes the cloud services', async () => {
  mockCanPerform.mockReturnValue(true);

  const screen = await mountAndPollOnce();

  expect(mockSupabase.initialize).toHaveBeenCalledTimes(1);
  expect(mockBackup.getBackupStatus).toHaveBeenCalled();
  screen.unmount();
});

/**
 * Privacy notice copy (MAINT-867, compliance ruling 2026-10-23). The notice used to say wellness
 * data "stays on this device only", which the policy's own disclosed flows (export, bug reports,
 * crisis_detected, usage analytics) contradict. Every claim is now scoped to Settings Backup,
 * which collectStoreData limits to autoSaveEnabled.
 */
describe('privacy notice copy (MAINT-867)', () => {
  const NOTE =
    'Settings Backup does not save your wellness data. It is stored on this device, so if you ' +
    'uninstall the app or lose your device, Settings Backup cannot restore it. To keep a copy, ' +
    'use Export my data in Privacy & Data.';
  const NOT_BACKED_UP =
    'What is not backed up: Your wellness check-in responses, self-screening results, and ' +
    'crisis data are never included in Settings Backup.';

  it('states only what Settings Backup does, with no absolute device-only claim', async () => {
    mockCanPerform.mockReturnValue(false);

    const screen = await mountAndPollOnce();

    expect(screen.getByText(NOTE)).toBeTruthy();
    // The label is a nested Text, so the outer Text's content is the concatenation.
    expect(screen.getByText(NOT_BACKED_UP)).toBeTruthy();
    expect(screen.queryByText(/stays on this device only/)).toBeNull();
    expect(screen.queryByText(/What stays on your device/)).toBeNull();
    expect(screen.queryByText(/device-level encryption/)).toBeNull();
    expect(screen.queryByText(/never backed up to the cloud/)).toBeNull();
    screen.unmount();
  });
});
