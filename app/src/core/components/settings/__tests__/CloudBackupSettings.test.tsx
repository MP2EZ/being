/**
 * CloudBackupSettings status section (MAINT-702)
 *
 * The section used to host SyncStatusIndicator, which read the dormant
 * SyncCoordinator and reported "Critical Issues" on every render of every
 * install, because the coordinator is never initialized. It was hidden only by
 * the `cloud_sync` runtime flag. This pins the replacement: the screen's own
 * Connection / Last Backup rows, with no alarm, in both the default and the
 * advanced view (advanced used to show the indicator and nothing else).
 */
import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import CloudBackupSettings from '../CloudBackupSettings';
import type { UseCloudSyncReturn } from '@/core/services/supabase/hooks/useCloudSync';

let mockCloudSync: UseCloudSyncReturn;

jest.mock('@/core/services/supabase/hooks/useCloudSync', () => ({
  useCloudSync: () => mockCloudSync,
  useCloudBackupConfig: () => ({
    config: { autoBackupEnabled: true, autoBackupIntervalMs: 4 * 60 * 60 * 1000 },
    updateConfig: jest.fn(),
    isLoading: false,
    error: null,
    clearError: jest.fn(),
  }),
}));

function syncState(overrides: Partial<UseCloudSyncReturn> = {}): UseCloudSyncReturn {
  return {
    status: { isInitialized: false, isOnline: false, pendingOperations: 0, circuitBreakerState: 'closed' },
    stats: {
      totalBackups: 0,
      totalRestores: 0,
      successRate: 0,
      averageBackupSizeMB: 0,
      averageSyncTimeMs: 0,
      offlineOperationsProcessed: 0,
    },
    isInitialized: false,
    isOnline: false,
    isLoading: false,
    error: null,
    createBackup: jest.fn(),
    restoreFromBackup: jest.fn(),
    forceSync: jest.fn(),
    hasCloudBackup: false,
    shouldPromptRestore: false,
    lastBackupTime: null,
    lastSyncTime: null,
    checkForRestore: jest.fn(),
    testConnectivity: jest.fn(),
    clearError: jest.fn(),
    refreshStatus: jest.fn(),
    ...overrides,
  };
}

const ALARM = /critical/i;

describe('CloudBackupSettings status section (MAINT-702)', () => {
  it('fresh install: no alarm, and its own status rows render', () => {
    mockCloudSync = syncState();
    const { getByText, queryByText } = render(<CloudBackupSettings />);

    expect(queryByText(ALARM)).toBeNull();
    expect(getByText('Connection:')).toBeTruthy();
    expect(getByText('Initializing...')).toBeTruthy();
    expect(getByText('Last Backup:')).toBeTruthy();
    expect(getByText('Never')).toBeTruthy();
  });

  it('advanced view keeps the status rows instead of an empty section', () => {
    mockCloudSync = syncState();
    const { getByLabelText, getByText, queryByText } = render(<CloudBackupSettings />);

    fireEvent.press(getByLabelText('Show advanced settings'));

    expect(getByLabelText('Hide advanced settings')).toBeTruthy();
    expect(queryByText(ALARM)).toBeNull();
    expect(getByText('Connection:')).toBeTruthy();
    expect(getByText('Last Backup:')).toBeTruthy();
  });

  it('cloud sync on and connected: reads Online, still no alarm', () => {
    mockCloudSync = syncState({
      status: { isInitialized: true, isOnline: true, pendingOperations: 0, circuitBreakerState: 'closed' },
      isInitialized: true,
      isOnline: true,
    });
    const { getByText, queryByText } = render(<CloudBackupSettings />);

    expect(queryByText(ALARM)).toBeNull();
    expect(getByText('Online')).toBeTruthy();
  });
});

// DEBUG-767: Test Connection used to say "Successfully connected" whatever happened, because
// testConnectivity never throws. The alert now follows the returned result.
describe('CloudBackupSettings Test Connection result (DEBUG-767)', () => {
  const SUCCESS_COPY = /connected to cloud backup|successfully connected|is set up/i;
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });
  afterEach(() => alertSpy.mockRestore());

  async function pressTest(result: unknown) {
    mockCloudSync = syncState({ testConnectivity: jest.fn().mockResolvedValue(result) });
    const utils = render(<CloudBackupSettings />);
    fireEvent.press(utils.getByLabelText('Show advanced settings'));
    await act(async () => {
      fireEvent.press(utils.getByLabelText('Test connection'));
    });
    return utils;
  }

  const alertText = () => alertSpy.mock.calls.map((c) => `${c[0]} ${c[1]}`).join('\n');

  it('a failed connection shows the failure message, not success', async () => {
    await pressTest({ canConnect: false, error: 'unreachable' });
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertText()).toMatch(/couldn.t connect/i);
    expect(alertText()).not.toMatch(SUCCESS_COPY);
    expect(alertText()).not.toMatch(/unreachable/);
  });

  it('consent absent says cloud backup is off, in plain language', async () => {
    await pressTest({ canConnect: false, error: 'cloud_sync_consent_absent' });
    expect(alertText()).toMatch(/cloud backup is off/i);
    expect(alertText()).not.toMatch(/cloud_sync_consent_absent/);
    expect(alertText()).not.toMatch(SUCCESS_COPY);
  });

  it('success now claims reachability, never that a backup exists or data is safe (DEBUG-783)', async () => {
    await pressTest({ canConnect: true, responseTimeMs: 5 });
    expect(alertText()).toMatch(/connected to cloud backup/i);
    expect(alertText()).not.toMatch(/backed up|your data|safe|sign.?in|account/i);
  });

  it('no session gets its own plain-language copy, never the raw code (DEBUG-783)', async () => {
    await pressTest({ canConnect: false, error: 'cloud_no_session' });
    expect(alertText()).toMatch(/couldn.t set up cloud backup/i);
    expect(alertText()).not.toMatch(/cloud_no_session/);
    expect(alertText()).not.toMatch(SUCCESS_COPY);
  });

  it.each(['cloud_unreachable', 'cloud_init_failed'])(
    '%s shares the plain couldn\'t-connect copy (DEBUG-783)',
    async (code) => {
      await pressTest({ canConnect: false, error: code });
      expect(alertText()).toMatch(/couldn.t connect/i);
      expect(alertText()).not.toMatch(new RegExp(code));
    }
  );

  it('a test already in flight shows nothing', async () => {
    await pressTest(null);
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('the error banner never shows the raw consent token', () => {
    mockCloudSync = syncState({ error: 'cloud_sync_consent_absent' });
    const { queryByText, getByText } = render(<CloudBackupSettings />);
    expect(queryByText(/cloud_sync_consent_absent/)).toBeNull();
    expect(getByText(/cloud backup is off/i)).toBeTruthy();
  });

  it.each([
    ['cloud_no_session', /couldn.t set up cloud backup/i],
    ['cloud_unreachable', /couldn.t connect/i],
    ['cloud_init_failed', /couldn.t connect/i],
  ])('the error banner maps %s to plain copy, never the raw code (DEBUG-783)', (code, copy) => {
    mockCloudSync = syncState({ error: code });
    const { queryByText, getByText } = render(<CloudBackupSettings />);
    expect(queryByText(new RegExp(code))).toBeNull();
    expect(getByText(copy)).toBeTruthy();
  });

  it('the button reports busy while a test runs', () => {
    mockCloudSync = syncState({ isLoading: true });
    const { getByLabelText } = render(<CloudBackupSettings />);
    fireEvent.press(getByLabelText('Show advanced settings'));
    expect(getByLabelText('Test connection').props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true, busy: true })
    );
  });
});
