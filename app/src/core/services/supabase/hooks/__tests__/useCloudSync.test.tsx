/**
 * useCloudSync / useCloudBackupConfig — hook state machine (MAINT-744)
 *
 * The real cloud-services barrel never loads here: `../../index` is mocked
 * wholesale, so these tests pin ONLY the hook's own behaviour — mount refresh,
 * the 30s refresh interval, the isLoading re-entrancy guard, and how each
 * result shape from the barrel is turned into `error` state.
 *
 * Not asserted: that mounting without cloud_sync consent initializes services.
 * That decision lives in the barrel (see cloudServicesBarrel.privacy.test.ts);
 * the hook only forwards calls.
 *
 * The `refreshStatus failure paths` below are mock-only: in production the
 * barrel's getCloudSyncStatus catches internally and resolves an error-shaped
 * status instead of rejecting, so the hook's catch branch is defensive.
 *
 * Terminology: "wellness data", not PHI.
 */

import { act, renderHook } from '@testing-library/react-native';
import { useCloudSync, useCloudBackupConfig } from '../useCloudSync';
import CloudServices from '../../index';

jest.mock('../../index', () => ({
  __esModule: true,
  default: {
    getCloudSyncStatus: jest.fn(),
    getCloudSyncStats: jest.fn(),
    checkForCloudRestore: jest.fn(),
    forceSync: jest.fn(),
    restoreFromCloud: jest.fn(),
    testCloudConnectivity: jest.fn(),
    configureCloudBackup: jest.fn(),
  },
}));
jest.mock('@/core/services/logging', () => ({
  logSecurity: jest.fn(),
  logPerformance: jest.fn(),
  logError: jest.fn(),
  LogCategory: { SYSTEM: 'SYSTEM' },
}));

const mocked = CloudServices as unknown as Record<
  | 'getCloudSyncStatus'
  | 'getCloudSyncStats'
  | 'checkForCloudRestore'
  | 'forceSync'
  | 'restoreFromCloud'
  | 'testCloudConnectivity'
  | 'configureCloudBackup',
  jest.Mock
>;

const HEALTHY_STATUS = {
  isInitialized: true,
  isOnline: true,
  pendingOperations: 0,
  circuitBreakerState: 'closed',
};
const EMPTY_STATS = {
  totalBackups: 0,
  totalRestores: 0,
  successRate: 0,
  averageBackupSizeMB: 0,
  averageSyncTimeMs: 0,
  offlineOperationsProcessed: 0,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

async function mountHook() {
  const rendered = renderHook(() => useCloudSync());
  await act(async () => {});
  return rendered;
}

beforeEach(() => {
  jest.useFakeTimers();
  Object.values(mocked).forEach((fn) => fn.mockReset());
  mocked.getCloudSyncStatus.mockResolvedValue(HEALTHY_STATUS);
  mocked.getCloudSyncStats.mockResolvedValue(EMPTY_STATS);
  mocked.checkForCloudRestore.mockResolvedValue({ hasBackup: false, shouldPromptRestore: false });
  mocked.forceSync.mockResolvedValue({ success: true });
  mocked.restoreFromCloud.mockResolvedValue({ success: true, restoredStores: ['a'], errors: [] });
  mocked.testCloudConnectivity.mockResolvedValue({ canConnect: true });
  mocked.configureCloudBackup.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useCloudSync — mount', () => {
  it('refreshes status and stats once, then checks for a restore', async () => {
    const { result } = await mountHook();

    expect(mocked.getCloudSyncStatus).toHaveBeenCalledTimes(1);
    expect(mocked.getCloudSyncStats).toHaveBeenCalledTimes(1);
    expect(mocked.checkForCloudRestore).toHaveBeenCalledTimes(1);
    expect(result.current.isInitialized).toBe(true);
    expect(result.current.isOnline).toBe(true);
  });

  it('exposes the restore prompt reported by checkForCloudRestore', async () => {
    mocked.checkForCloudRestore.mockResolvedValue({
      hasBackup: true,
      backupTime: 1000,
      shouldPromptRestore: true,
    });
    const { result } = await mountHook();

    expect(result.current.hasCloudBackup).toBe(true);
    expect(result.current.shouldPromptRestore).toBe(true);
  });

  it('arms the 30s refresh interval only after the mount awaits, and clears it on unmount', async () => {
    const { unmount } = await mountHook();
    expect(mocked.getCloudSyncStatus).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });
    expect(mocked.getCloudSyncStatus).toHaveBeenCalledTimes(2);

    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });
    expect(mocked.getCloudSyncStatus).toHaveBeenCalledTimes(3);

    unmount();
    await act(async () => {
      jest.advanceTimersByTime(120_000);
    });
    expect(mocked.getCloudSyncStatus).toHaveBeenCalledTimes(3);
  });

  it('does not arm the interval when unmounted before the mount awaits settle', async () => {
    const gate = deferred<typeof HEALTHY_STATUS>();
    mocked.getCloudSyncStatus.mockReturnValue(gate.promise);

    const { unmount } = renderHook(() => useCloudSync());
    unmount();
    gate.resolve(HEALTHY_STATUS);
    await act(async () => {});

    await act(async () => {
      jest.advanceTimersByTime(90_000);
    });
    expect(mocked.getCloudSyncStatus).toHaveBeenCalledTimes(1);
  });
});

describe('useCloudSync — refreshStatus failure paths (mock-only)', () => {
  it('sets the Error message when getCloudSyncStatus rejects', async () => {
    mocked.getCloudSyncStatus.mockRejectedValue(new Error('status boom'));
    const { result } = await mountHook();
    expect(result.current.error).toBe('status boom');
  });

  it('falls back to a generic message for a non-Error rejection', async () => {
    mocked.getCloudSyncStatus.mockRejectedValue('nope');
    const { result } = await mountHook();
    expect(result.current.error).toBe('Failed to refresh status');
  });

  it('surfaces the error carried on a resolved status', async () => {
    mocked.getCloudSyncStatus.mockResolvedValue({ ...HEALTHY_STATUS, error: 'offline mode' });
    const { result } = await mountHook();
    expect(result.current.error).toBe('offline mode');
  });

  it('clearError resets the error to null', async () => {
    mocked.getCloudSyncStatus.mockRejectedValue(new Error('status boom'));
    const { result } = await mountHook();
    expect(result.current.error).toBe('status boom');

    act(() => {
      result.current.clearError();
    });
    expect(result.current.error).toBeNull();
  });
});

describe('useCloudSync — restoreFromBackup', () => {
  it('keeps shouldPromptRestore and sets the error when the restore reports partial errors', async () => {
    mocked.checkForCloudRestore.mockResolvedValue({ hasBackup: true, shouldPromptRestore: true });
    mocked.restoreFromCloud.mockResolvedValue({ success: true, restoredStores: ['a'], errors: ['partial'] });
    const { result } = await mountHook();
    expect(result.current.shouldPromptRestore).toBe(true);

    await act(async () => {
      await result.current.restoreFromBackup();
    });

    expect(result.current.error).toBe('partial');
    expect(result.current.shouldPromptRestore).toBe(true);
  });

  it('clears the restore prompt and refreshes status after a clean restore', async () => {
    mocked.checkForCloudRestore.mockResolvedValue({ hasBackup: true, shouldPromptRestore: true });
    const { result } = await mountHook();
    expect(mocked.getCloudSyncStatus).toHaveBeenCalledTimes(1);

    let returned: unknown;
    await act(async () => {
      returned = await result.current.restoreFromBackup();
    });

    expect(returned).toEqual({ success: true, restoredStores: ['a'], errors: [] });
    expect(result.current.error).toBeNull();
    expect(result.current.shouldPromptRestore).toBe(false);
    expect(mocked.getCloudSyncStatus).toHaveBeenCalledTimes(2);
  });

  it('joins several errors and falls back to "Restore failed" when none are given', async () => {
    const { result } = await mountHook();

    mocked.restoreFromCloud.mockResolvedValue({ success: false, restoredStores: [], errors: ['a', 'b'] });
    await act(async () => {
      await result.current.restoreFromBackup();
    });
    expect(result.current.error).toBe('a, b');

    mocked.restoreFromCloud.mockResolvedValue({ success: false, restoredStores: [], errors: [] });
    await act(async () => {
      await result.current.restoreFromBackup();
    });
    expect(result.current.error).toBe('Restore failed');
  });

  it('returns a failure result and sets the error when the restore rejects', async () => {
    mocked.restoreFromCloud.mockRejectedValue(new Error('restore boom'));
    const { result } = await mountHook();

    let returned: unknown;
    await act(async () => {
      returned = await result.current.restoreFromBackup();
    });

    expect(returned).toEqual({ success: false, restoredStores: [], errors: ['restore boom'] });
    expect(result.current.error).toBe('restore boom');
  });

  it('returns "Operation in progress" without calling the service while another operation is loading', async () => {
    const { result } = await mountHook();
    const gate = deferred<{ success: boolean }>();
    mocked.forceSync.mockReturnValue(gate.promise);

    let pending: Promise<void> | undefined;
    act(() => {
      pending = result.current.forceSync();
    });
    expect(result.current.isLoading).toBe(true);

    let returned: unknown;
    await act(async () => {
      returned = await result.current.restoreFromBackup();
    });

    expect(returned).toEqual({ success: false, restoredStores: [], errors: ['Operation in progress'] });
    expect(mocked.restoreFromCloud).not.toHaveBeenCalled();

    gate.resolve({ success: true });
    await act(async () => {
      await pending;
    });
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useCloudSync — isLoading re-entrancy guard', () => {
  it('a second forceSync while the first is in flight is a no-op', async () => {
    const { result } = await mountHook();
    const gate = deferred<{ success: boolean }>();
    mocked.forceSync.mockReturnValue(gate.promise);

    let first: Promise<void> | undefined;
    act(() => {
      first = result.current.forceSync();
    });
    // Read through result.current AFTER the loading re-render so the guard sees isLoading=true.
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await result.current.forceSync();
    });
    expect(mocked.forceSync).toHaveBeenCalledTimes(1);

    gate.resolve({ success: true });
    await act(async () => {
      await first;
    });
    expect(result.current.isLoading).toBe(false);
  });
});

describe.each([
  ['createBackup', 'Backup failed'],
  ['forceSync', 'Sync failed'],
] as const)('useCloudSync.%s', (method, fallback) => {
  it('on success refreshes status and leaves no error', async () => {
    const { result } = await mountHook();
    expect(mocked.getCloudSyncStatus).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current[method]();
    });

    expect(mocked.forceSync).toHaveBeenCalledTimes(1);
    expect(mocked.getCloudSyncStatus).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('sets the reported error when the result is a failure with a message', async () => {
    mocked.forceSync.mockResolvedValue({ success: false, error: 'x' });
    const { result } = await mountHook();

    await act(async () => {
      await result.current[method]();
    });

    expect(result.current.error).toBe('x');
    expect(mocked.getCloudSyncStatus).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toBe(false);
  });

  it(`sets "${fallback}" when the failure carries no message`, async () => {
    mocked.forceSync.mockResolvedValue({ success: false });
    const { result } = await mountHook();

    await act(async () => {
      await result.current[method]();
    });

    expect(result.current.error).toBe(fallback);
  });

  it('sets the message when the call rejects with an Error', async () => {
    mocked.forceSync.mockRejectedValue(new Error('network gone'));
    const { result } = await mountHook();

    await act(async () => {
      await result.current[method]();
    });

    expect(result.current.error).toBe('network gone');
    expect(result.current.isLoading).toBe(false);
  });

  it(`sets "${fallback}" when the call rejects with a non-Error`, async () => {
    mocked.forceSync.mockRejectedValue('nope');
    const { result } = await mountHook();

    await act(async () => {
      await result.current[method]();
    });

    expect(result.current.error).toBe(fallback);
  });

  it('surfaces a cloud_sync_consent_absent refusal as an error, not as a success', async () => {
    mocked.forceSync.mockResolvedValue({ success: false, error: 'cloud_sync_consent_absent' });
    const { result } = await mountHook();

    await act(async () => {
      await result.current[method]();
    });

    expect(result.current.error).toBe('cloud_sync_consent_absent');
    // A success would have triggered the post-sync status refresh.
    expect(mocked.getCloudSyncStatus).toHaveBeenCalledTimes(1);
  });
});

describe('useCloudSync.testConnectivity', () => {
  it('sets the reported error, or a fallback, when the connection test fails', async () => {
    const { result } = await mountHook();

    mocked.testCloudConnectivity.mockResolvedValue({ canConnect: false, error: 'unreachable' });
    await act(async () => {
      await result.current.testConnectivity();
    });
    expect(result.current.error).toBe('unreachable');

    mocked.testCloudConnectivity.mockResolvedValue({ canConnect: false });
    await act(async () => {
      await result.current.testConnectivity();
    });
    expect(result.current.error).toBe('Connection test failed');
  });
});

describe('useCloudBackupConfig', () => {
  const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

  it('starts with auto-backup on and a four-hour interval', () => {
    const { result } = renderHook(() => useCloudBackupConfig());
    expect(result.current.config).toEqual({
      autoBackupEnabled: true,
      autoBackupIntervalMs: FOUR_HOURS_MS,
    });
  });

  it('updateConfig forwards the partial and merges it, keeping autoBackupIntervalMs', async () => {
    const { result } = renderHook(() => useCloudBackupConfig());

    await act(async () => {
      await result.current.updateConfig({ autoBackupEnabled: false });
    });

    expect(mocked.configureCloudBackup).toHaveBeenCalledWith({ autoBackupEnabled: false });
    expect(result.current.config).toEqual({
      autoBackupEnabled: false,
      autoBackupIntervalMs: FOUR_HOURS_MS,
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('leaves config unchanged and sets the error when configureCloudBackup rejects', async () => {
    mocked.configureCloudBackup.mockRejectedValue(new Error('config boom'));
    const { result } = renderHook(() => useCloudBackupConfig());

    await act(async () => {
      await result.current.updateConfig({ autoBackupEnabled: false });
    });

    expect(result.current.error).toBe('config boom');
    expect(result.current.config.autoBackupEnabled).toBe(true);
  });
});
