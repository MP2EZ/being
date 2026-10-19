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

// DEBUG-784: Backup now and Restore reported success whatever happened, and the raw service
// strings reached the user — restore errors can carry fragments of decrypted content
// (DEBUG-625), so no raw string may reach an Alert or the banner. Copy is asserted PRESENT,
// not only absent, so a silent no-op cannot pass.
describe('CloudBackupSettings Backup now / Restore results (DEBUG-784)', () => {
  const SENTINEL = 'SENTINEL_RAW_ERR user_id=abc';
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });
  afterEach(() => alertSpy.mockRestore());

  const alertText = () => alertSpy.mock.calls.map((c) => `${c[0]} ${c[1]}`).join('\n');

  async function pressBackup(createBackup: jest.Mock) {
    // The button is disabled while offline, so a press would be a silent no-op.
    mockCloudSync = syncState({ isOnline: true, createBackup });
    const utils = render(<CloudBackupSettings />);
    await act(async () => {
      fireEvent.press(utils.getByLabelText('Back up now'));
    });
    return utils;
  }

  async function confirmRestore(restoreFromBackup: jest.Mock, onRestoreComplete = jest.fn()) {
    mockCloudSync = syncState({ hasCloudBackup: true, restoreFromBackup });
    const utils = render(<CloudBackupSettings onRestoreComplete={onRestoreComplete} />);
    await act(async () => {
      fireEvent.press(utils.getByLabelText('Restore from cloud'));
    });
    const buttons = alertSpy.mock.calls[0][2] as Array<{ text: string; onPress?: () => Promise<void> }>;
    alertSpy.mockClear();
    await act(async () => {
      await buttons.find((b) => b.text === 'Restore')!.onPress!();
    });
    return { ...utils, onRestoreComplete };
  }

  it('a failed backup shows failure copy, never success or the raw error', async () => {
    await pressBackup(jest.fn().mockResolvedValue({ success: false, error: SENTINEL }));
    expect(alertText()).toMatch(/couldn.t back up/i);
    expect(alertText()).not.toMatch(/completed successfully|backup complete/i);
    expect(alertText()).not.toContain(SENTINEL);
  });

  it('a consent-absent backup shows the cloud-backup-off copy, not the code', async () => {
    await pressBackup(jest.fn().mockResolvedValue({ success: false, error: 'cloud_sync_consent_absent' }));
    expect(alertText()).toMatch(/cloud backup is off/i);
    expect(alertText()).not.toMatch(/cloud_sync_consent_absent|completed successfully/i);
  });

  it('a rejected backup shows failure copy', async () => {
    await pressBackup(jest.fn().mockRejectedValue(new Error(SENTINEL)));
    expect(alertText()).toMatch(/couldn.t back up/i);
    expect(alertText()).not.toContain(SENTINEL);
  });

  it('a successful backup says the settings are backed up, without the old wording', async () => {
    await pressBackup(jest.fn().mockResolvedValue({ success: true }));
    expect(alertText()).toMatch(/your settings are backed up/i);
    expect(alertText()).not.toMatch(/completed successfully/i);
  });

  it.each([[null], [undefined]])('an in-flight backup (%s) shows nothing', async (r) => {
    await pressBackup(jest.fn().mockResolvedValue(r));
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('a failed restore shows fixed copy and none of the raw errors', async () => {
    await confirmRestore(jest.fn().mockResolvedValue({ success: false, restoredStores: [], errors: [SENTINEL, 'b'] }));
    expect(alertText()).toMatch(/couldn.t restore/i);
    expect(alertText()).not.toContain(SENTINEL);
  });

  it('a restore that restored nothing is not reported as complete, and notifies no one', async () => {
    const { onRestoreComplete } = await confirmRestore(
      jest.fn().mockResolvedValue({ success: true, restoredStores: [], errors: [] })
    );
    expect(alertText()).toMatch(/nothing to restore/i);
    expect(alertText()).not.toMatch(/restore complete|restored:/i);
    expect(onRestoreComplete).not.toHaveBeenCalled();
  });

  it('a successful restore says so without listing internal store labels', async () => {
    const label = 'assessment (config only - PHI excluded per Privacy)';
    const { onRestoreComplete } = await confirmRestore(
      jest.fn().mockResolvedValue({ success: true, restoredStores: [label], errors: [] })
    );
    expect(alertText()).toMatch(/restore complete/i);
    expect(alertText()).not.toMatch(/PHI|config only/);
    expect(onRestoreComplete).toHaveBeenCalledTimes(1);
  });

  it('"No backup found" gets its own plain copy', async () => {
    await confirmRestore(jest.fn().mockResolvedValue({ success: false, restoredStores: [], errors: ['No backup found'] }));
    expect(alertText()).toMatch(/couldn.t find a cloud backup/i);
  });

  it('a rejected restore shows fixed failure copy', async () => {
    await confirmRestore(jest.fn().mockRejectedValue(new Error(SENTINEL)));
    expect(alertText()).toMatch(/couldn.t restore/i);
    expect(alertText()).not.toContain(SENTINEL);
  });

  it('the error banner never shows a raw service string', () => {
    mockCloudSync = syncState({ error: SENTINEL });
    const { queryByText, getByText } = render(<CloudBackupSettings />);
    expect(queryByText(new RegExp(SENTINEL))).toBeNull();
    expect(getByText(/something went wrong with cloud backup/i)).toBeTruthy();
  });

  it('Back up now and Restore report busy while an operation runs', () => {
    mockCloudSync = syncState({ isLoading: true, isOnline: true, hasCloudBackup: true });
    const { getByLabelText } = render(<CloudBackupSettings />);
    for (const label of ['Back up now', 'Restore from cloud']) {
      expect(getByLabelText(label).props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true, busy: true })
      );
    }
  });
});
