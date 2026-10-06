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
import { fireEvent, render } from '@testing-library/react-native';
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
