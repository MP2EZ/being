/**
 * Cloud services barrel (supabase/index.ts) — consent gate + lifecycle contracts (MAINT-744)
 *
 * The barrel is the front door to cloud egress: it decides WHEN Supabase is
 * initialized, WHEN a manual sync may run, and what the AppState handler does.
 * This suite pins the consent-sensitive behaviour of that decision layer. The
 * `.privacy` suffix puts it in `npm run test:privacy` (precommit + CI).
 *
 * Mocking strategy: SupabaseService and CloudBackupService are factory-mocked
 * singletons (the real SupabaseService.ts, a Protected Path, never loads). The
 * consent store is mocked to a single `canPerformOperation` fn that each test
 * flips. The barrel is `jest.resetModules()`d and re-required per test, with
 * the consent mock set BEFORE the require, because the module evaluates its
 * auto-initialize `if` at import.
 *
 * What is deliberately NOT pinned here:
 *  - The consent chokepoint inside CloudBackupService.createBackup. The 'background'
 *    handler below is pinned as DELEGATING to createBackup only; the gate lives in
 *    createBackup itself and is pinned by __tests__/unit/cloud-backup-consent.test.ts
 *    and CloudBackupService.privacy.test.ts. Asserting "background skips createBackup
 *    without consent" with CloudBackupService mocked would need a mock that re-encodes
 *    the gate — a test of the mock.
 *
 * The AppState listener count IS pinned (MAINT-817): live handlers = isInitialized ? 1 : 0,
 * across cleanup + re-init cycles and on both branches of cleanupCloudServices.
 *
 * Consent is read at the moment of every cloud act (DEBUG-757): getCloudSyncStatus,
 * configureCloudBackup, testCloudConnectivity and checkForCloudRestore all refuse to
 * initialize Supabase without cloud_sync consent. restoreFromCloud, a tap followed by a
 * destructive confirm, is the only exemption.
 *
 * Terminology: "wellness data", not PHI — Being is not a HIPAA entity.
 */

const mockCanPerform = jest.fn();
const mockAddEventListener = jest.fn();
// Module-scope so it survives jest.resetModules(); a factory-created fn would be
// re-created per registry and the test would hold a stale reference.
const mockLogSecurity = jest.fn();

const mockSupabase = {
  initialize: jest.fn(),
  getStatus: jest.fn(),
  processOfflineQueue: jest.fn(),
  cleanup: jest.fn(),
  trackEvent: jest.fn(),
  getAuthenticatedClient: jest.fn(),
};
const mockBackup = {
  initialize: jest.fn(),
  createBackup: jest.fn(),
  getBackupStatus: jest.fn(),
  restoreFromBackup: jest.fn(),
  updateConfig: jest.fn(),
  cleanup: jest.fn(),
};

jest.mock('../SupabaseService', () => ({ __esModule: true, default: mockSupabase }));
jest.mock('../CloudBackupService', () => ({ __esModule: true, default: mockBackup }));
jest.mock('@/core/stores/consentStore', () => ({
  useConsentStore: { getState: () => ({ canPerformOperation: mockCanPerform }) },
}));
jest.mock('@/core/services/logging', () => ({
  logSecurity: mockLogSecurity,
  logPerformance: jest.fn(),
  logError: jest.fn(),
  LogCategory: { SYSTEM: 'SYSTEM' },
}));
jest.mock('react-native', () => ({
  AppState: { addEventListener: mockAddEventListener },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null) },
}));

type Barrel = typeof import('../index');
type AppStateHandler = (state: string) => Promise<void>;

// Handlers whose subscription has not been removed (MAINT-817). Module-scope for the
// same reason as the mocks above; never referenced inside a jest.mock factory.
const liveHandlers = new Set<AppStateHandler>();

let consoleLogSpy: jest.SpyInstance;

/** Re-evaluate the barrel from scratch; the consent mock must already be set. */
function loadBarrel(): Barrel {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../index') as Barrel;
}

async function flushMicrotasks() {
  for (let i = 0; i < 20; i++) {
    await Promise.resolve();
  }
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function appStateHandler(): AppStateHandler {
  expect(mockAddEventListener).toHaveBeenCalledTimes(1);
  const [event, handler] = mockAddEventListener.mock.calls[0];
  expect(event).toBe('change');
  return handler as AppStateHandler;
}

beforeEach(() => {
  [...Object.values(mockSupabase), ...Object.values(mockBackup), mockCanPerform, mockAddEventListener, mockLogSecurity]
    .forEach((fn) => fn.mockReset());

  mockSupabase.initialize.mockResolvedValue(undefined);
  mockSupabase.processOfflineQueue.mockResolvedValue(undefined);
  mockBackup.initialize.mockResolvedValue(undefined);
  mockBackup.createBackup.mockResolvedValue({ success: true });
  mockBackup.getBackupStatus.mockResolvedValue({
    hasCloudBackup: false,
    hasLocalData: false,
    cloudBackupTime: undefined,
  });
  liveHandlers.clear();
  mockAddEventListener.mockImplementation((_event: string, handler: AppStateHandler) => {
    liveHandlers.add(handler);
    return { remove: jest.fn(() => { liveHandlers.delete(handler); }) };
  });
  mockCanPerform.mockReturnValue(false);

  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  consoleLogSpy.mockRestore();
});

describe('cloud services barrel — import-time auto-initialize', () => {
  it('without cloud_sync consent: no Supabase init, no backup init, no AppState listener', async () => {
    mockCanPerform.mockReturnValue(false);
    loadBarrel();
    await flushMicrotasks();

    expect(mockCanPerform).toHaveBeenCalledWith('cloud_sync');
    expect(mockSupabase.initialize).not.toHaveBeenCalled();
    expect(mockBackup.initialize).not.toHaveBeenCalled();
    expect(mockAddEventListener).not.toHaveBeenCalled();
  });

  // Positive control only. In production this branch is dead: consentStatus is
  // 'loading' at import time, so canPerformOperation is false here (DEBUG-409).
  // It proves the no-consent test above is silent because of the gate, not
  // because the mocks cannot observe an init.
  it('with consent at import: initializes each service exactly once and registers one listener', async () => {
    mockCanPerform.mockReturnValue(true);
    loadBarrel();
    await flushMicrotasks();

    expect(mockSupabase.initialize).toHaveBeenCalledTimes(1);
    expect(mockBackup.initialize).toHaveBeenCalledTimes(1);
    expect(mockAddEventListener).toHaveBeenCalledTimes(1);
  });
});

describe('cloud services barrel — forceSync consent gate', () => {
  it('without consent resolves exactly the refusal and touches no service', async () => {
    mockCanPerform.mockReturnValue(false);
    const { forceSync } = loadBarrel();

    await expect(forceSync()).resolves.toEqual({
      success: false,
      error: 'cloud_sync_consent_absent',
    });

    expect(mockSupabase.initialize).not.toHaveBeenCalled();
    expect(mockBackup.initialize).not.toHaveBeenCalled();
    expect(mockBackup.createBackup).not.toHaveBeenCalled();
    expect(mockSupabase.processOfflineQueue).not.toHaveBeenCalled();
  });

  it('asks the consent store for exactly cloud_sync, and reads it on every call', async () => {
    mockCanPerform.mockReturnValue(false);
    const { forceSync } = loadBarrel();
    mockCanPerform.mockClear();

    await expect(forceSync()).resolves.toMatchObject({ success: false });
    mockCanPerform.mockReturnValue(true);
    await expect(forceSync()).resolves.toEqual({ success: true });
    mockCanPerform.mockReturnValue(false);
    await expect(forceSync()).resolves.toMatchObject({ success: false });

    expect(mockCanPerform).toHaveBeenCalledTimes(3);
    for (const args of mockCanPerform.mock.calls) {
      expect(args).toEqual(['cloud_sync']);
    }
  });

  it('with consent runs init, createBackup, then processOfflineQueue and reports success', async () => {
    mockCanPerform.mockReturnValue(false); // no eager init at import
    const { forceSync } = loadBarrel();
    mockCanPerform.mockReturnValue(true);

    await expect(forceSync()).resolves.toEqual({ success: true });

    expect(mockSupabase.initialize).toHaveBeenCalledTimes(1);
    expect(mockBackup.initialize).toHaveBeenCalledTimes(1);
    expect(mockBackup.createBackup).toHaveBeenCalledTimes(1);
    expect(mockSupabase.processOfflineQueue).toHaveBeenCalledTimes(1);
  });

  it('surfaces a failed createBackup and does not process the offline queue', async () => {
    mockCanPerform.mockReturnValue(false);
    const { forceSync } = loadBarrel();
    mockCanPerform.mockReturnValue(true);
    mockBackup.createBackup.mockResolvedValue({ success: false, error: 'upload_failed' });

    await expect(forceSync()).resolves.toEqual({ success: false, error: 'upload_failed' });
    expect(mockSupabase.processOfflineQueue).not.toHaveBeenCalled();
  });

  it('mid-session withdrawal: a later forceSync is refused even though services are initialized', async () => {
    mockCanPerform.mockReturnValue(false);
    const { forceSync } = loadBarrel();

    mockCanPerform.mockReturnValue(true);
    await expect(forceSync()).resolves.toEqual({ success: true });
    expect(mockBackup.createBackup).toHaveBeenCalledTimes(1);
    expect(mockSupabase.processOfflineQueue).toHaveBeenCalledTimes(1);

    // Services are now initialized (isInitialized is true); withdrawal must still win.
    mockCanPerform.mockReturnValue(false);
    await expect(forceSync()).resolves.toEqual({
      success: false,
      error: 'cloud_sync_consent_absent',
    });
    expect(mockBackup.createBackup).toHaveBeenCalledTimes(1);
    expect(mockSupabase.processOfflineQueue).toHaveBeenCalledTimes(1);
  });
});

describe('cloud services barrel — initialization concurrency', () => {
  it('concurrent consented calls share one initialization', async () => {
    mockCanPerform.mockReturnValue(false);
    const { forceSync, checkForCloudRestore } = loadBarrel();
    mockCanPerform.mockReturnValue(true);

    const gate = deferred();
    mockSupabase.initialize.mockReturnValue(gate.promise);

    const calls = Promise.all([forceSync(), forceSync(), checkForCloudRestore()]);
    await flushMicrotasks();
    expect(mockSupabase.initialize).toHaveBeenCalledTimes(1);

    gate.resolve();
    await calls;

    expect(mockSupabase.initialize).toHaveBeenCalledTimes(1);
    expect(mockBackup.initialize).toHaveBeenCalledTimes(1);
    expect(mockAddEventListener).toHaveBeenCalledTimes(1);
  });

  it('concurrent calls without consent initialize nothing', async () => {
    mockCanPerform.mockReturnValue(false);
    const { forceSync } = loadBarrel();

    const results = await Promise.all([forceSync(), forceSync(), forceSync()]);

    for (const result of results) {
      expect(result).toEqual({ success: false, error: 'cloud_sync_consent_absent' });
    }
    expect(mockSupabase.initialize).not.toHaveBeenCalled();
    expect(mockBackup.initialize).not.toHaveBeenCalled();
    expect(mockAddEventListener).not.toHaveBeenCalled();
  });
});

describe('cloud services barrel — failed initialization', () => {
  it('a Supabase init failure is swallowed, registers no listener, and the next call retries', async () => {
    mockCanPerform.mockReturnValue(false);
    const { checkForCloudRestore } = loadBarrel();
    mockCanPerform.mockReturnValue(true);
    mockSupabase.initialize.mockRejectedValueOnce(new Error('supabase down'));

    await expect(checkForCloudRestore()).resolves.toBeDefined();
    expect(mockSupabase.initialize).toHaveBeenCalledTimes(1);
    expect(mockBackup.initialize).not.toHaveBeenCalled();
    expect(mockAddEventListener).not.toHaveBeenCalled();

    await checkForCloudRestore();
    expect(mockSupabase.initialize).toHaveBeenCalledTimes(2);
    expect(mockBackup.initialize).toHaveBeenCalledTimes(1);
    expect(mockAddEventListener).toHaveBeenCalledTimes(1);
  });

  it('a backup-service init failure is swallowed, registers no listener, and the next call retries', async () => {
    mockCanPerform.mockReturnValue(false);
    const { checkForCloudRestore } = loadBarrel();
    mockCanPerform.mockReturnValue(true);
    mockBackup.initialize.mockRejectedValueOnce(new Error('backup init down'));

    await expect(checkForCloudRestore()).resolves.toBeDefined();
    expect(mockSupabase.initialize).toHaveBeenCalledTimes(1);
    expect(mockBackup.initialize).toHaveBeenCalledTimes(1);
    expect(mockAddEventListener).not.toHaveBeenCalled();

    await checkForCloudRestore();
    expect(mockSupabase.initialize).toHaveBeenCalledTimes(2);
    expect(mockBackup.initialize).toHaveBeenCalledTimes(2);
    expect(mockAddEventListener).toHaveBeenCalledTimes(1);
  });

  it('retry after a failed init is refused when consent is withdrawn in between', async () => {
    mockCanPerform.mockReturnValue(false);
    const { forceSync } = loadBarrel();

    mockCanPerform.mockReturnValue(true);
    mockSupabase.initialize.mockRejectedValueOnce(new Error('supabase down'));
    await expect(forceSync()).resolves.toBeDefined();
    expect(mockSupabase.initialize).toHaveBeenCalledTimes(1);

    mockCanPerform.mockReturnValue(false);
    await expect(forceSync()).resolves.toEqual({
      success: false,
      error: 'cloud_sync_consent_absent',
    });
    expect(mockSupabase.initialize).toHaveBeenCalledTimes(1);
  });
});

describe('cloud services barrel — checkForCloudRestore', () => {
  // Its only caller is useCloudSync's mount effect: a passive read, not a user act. It used
  // to be exempt from the cloud_sync gate on a "user-initiated recovery" premise that the
  // call site did not match, and minted an anonymous session on every screen open (DEBUG-757).
  it('without consent: no init, no backup read, resolves no backup and no prompt', async () => {
    mockCanPerform.mockReturnValue(false);
    const { checkForCloudRestore } = loadBarrel();
    mockCanPerform.mockClear();

    await expect(checkForCloudRestore()).resolves.toEqual({
      hasBackup: false,
      shouldPromptRestore: false,
    });

    expect(mockCanPerform).toHaveBeenCalledWith('cloud_sync');
    expect(mockSupabase.initialize).not.toHaveBeenCalled();
    expect(mockBackup.initialize).not.toHaveBeenCalled();
    expect(mockBackup.getBackupStatus).not.toHaveBeenCalled();
    expect(mockAddEventListener).not.toHaveBeenCalled();
  });

  it('with consent: initializes once and reads the backup status', async () => {
    mockCanPerform.mockReturnValue(false);
    const { checkForCloudRestore } = loadBarrel();
    mockCanPerform.mockReturnValue(true);

    await checkForCloudRestore();

    expect(mockSupabase.initialize).toHaveBeenCalledTimes(1);
    expect(mockBackup.initialize).toHaveBeenCalledTimes(1);
    expect(mockBackup.getBackupStatus).toHaveBeenCalledTimes(1);
  });

  it.each([
    // [hasCloudBackup, hasLocalData, shouldPromptRestore]
    [true, false, true],
    [true, true, false],
    [false, false, false],
    [false, true, false],
  ])(
    'hasCloudBackup=%s hasLocalData=%s -> shouldPromptRestore=%s',
    async (hasCloudBackup, hasLocalData, shouldPromptRestore) => {
      mockCanPerform.mockReturnValue(false);
      const { checkForCloudRestore } = loadBarrel();
      mockCanPerform.mockReturnValue(true);
      mockBackup.getBackupStatus.mockResolvedValue({
        hasCloudBackup,
        hasLocalData,
        cloudBackupTime: 1234,
      });

      await expect(checkForCloudRestore()).resolves.toEqual({
        hasBackup: hasCloudBackup,
        backupTime: 1234,
        shouldPromptRestore,
      });
    },
  );

  it('resolves no backup and no prompt when reading backup status fails', async () => {
    mockCanPerform.mockReturnValue(false);
    const { checkForCloudRestore } = loadBarrel();
    mockCanPerform.mockReturnValue(true);
    mockBackup.getBackupStatus.mockRejectedValue(new Error('status unavailable'));

    await expect(checkForCloudRestore()).resolves.toEqual({
      hasBackup: false,
      shouldPromptRestore: false,
    });
  });
});

describe('cloud services barrel — restoreFromCloud stays exempt', () => {
  // The one exemption left: a Restore tap followed by a destructive confirm is a
  // user-initiated recovery act, so it may initialize services with consent absent.
  it('initializes services and restores with consent absent', async () => {
    mockCanPerform.mockReturnValue(false);
    const { restoreFromCloud } = loadBarrel();
    mockBackup.restoreFromBackup.mockResolvedValue({ success: true, restoredStores: ['settings'], errors: [] });

    await expect(restoreFromCloud()).resolves.toEqual({
      success: true,
      restoredStores: ['settings'],
      errors: [],
    });
    expect(mockSupabase.initialize).toHaveBeenCalledTimes(1);
    expect(mockBackup.restoreFromBackup).toHaveBeenCalledTimes(1);
  });
});

const LOCAL_STATUS = {
  isInitialized: false,
  offlineQueueSize: 2,
  circuitBreakerState: 'closed',
  lastSyncTime: undefined,
};

describe('cloud services barrel — getCloudSyncStatus consent gate', () => {
  it('without consent: no init, no backup read, a local-only status with no error', async () => {
    mockCanPerform.mockReturnValue(false);
    const { getCloudSyncStatus } = loadBarrel();
    mockSupabase.getStatus.mockReturnValue(LOCAL_STATUS);
    mockCanPerform.mockClear();

    await expect(getCloudSyncStatus()).resolves.toEqual({
      isInitialized: false,
      isOnline: false,
      pendingOperations: 2,
      circuitBreakerState: 'closed',
    });
    await flushMicrotasks();

    expect(mockCanPerform).toHaveBeenCalledWith('cloud_sync');
    expect(mockSupabase.initialize).not.toHaveBeenCalled();
    expect(mockBackup.initialize).not.toHaveBeenCalled();
    expect(mockBackup.getBackupStatus).not.toHaveBeenCalled();
    expect(mockAddEventListener).not.toHaveBeenCalled();
  });

  it('with consent: kicks one initialization and reads the backup status', async () => {
    mockCanPerform.mockReturnValue(false);
    const { getCloudSyncStatus } = loadBarrel();
    mockCanPerform.mockReturnValue(true);
    mockSupabase.getStatus.mockReturnValue(LOCAL_STATUS);

    await getCloudSyncStatus();
    await flushMicrotasks();

    expect(mockSupabase.initialize).toHaveBeenCalledTimes(1);
    expect(mockBackup.getBackupStatus).toHaveBeenCalledTimes(1);
  });

  it('mid-session withdrawal: a later poll stops reading the backup status', async () => {
    mockCanPerform.mockReturnValue(false);
    const { getCloudSyncStatus } = loadBarrel();
    mockSupabase.getStatus.mockReturnValue({ ...LOCAL_STATUS, isInitialized: true });

    mockCanPerform.mockReturnValue(true);
    await getCloudSyncStatus();
    await flushMicrotasks();
    expect(mockBackup.getBackupStatus).toHaveBeenCalledTimes(1);

    mockCanPerform.mockReturnValue(false);
    await expect(getCloudSyncStatus()).resolves.toMatchObject({ isInitialized: false, isOnline: false });
    expect(mockBackup.getBackupStatus).toHaveBeenCalledTimes(1);
  });
});

describe('cloud services barrel — configureCloudBackup consent gate', () => {
  it('without consent: no init and no config write, and it does not throw', async () => {
    mockCanPerform.mockReturnValue(false);
    const { configureCloudBackup } = loadBarrel();

    await expect(configureCloudBackup({ autoBackupEnabled: false })).resolves.toBeUndefined();

    expect(mockCanPerform).toHaveBeenCalledWith('cloud_sync');
    expect(mockSupabase.initialize).not.toHaveBeenCalled();
    expect(mockBackup.initialize).not.toHaveBeenCalled();
    expect(mockBackup.updateConfig).not.toHaveBeenCalled();
  });

  it('with consent: initializes and writes the config', async () => {
    mockCanPerform.mockReturnValue(false);
    const { configureCloudBackup } = loadBarrel();
    mockCanPerform.mockReturnValue(true);

    await configureCloudBackup({ autoBackupEnabled: false });

    expect(mockSupabase.initialize).toHaveBeenCalledTimes(1);
    expect(mockBackup.updateConfig).toHaveBeenCalledWith({ autoBackupEnabled: false });
  });
});

describe('cloud services barrel — testCloudConnectivity consent gate', () => {
  it('without consent: refuses before init, before any client, and before any read', async () => {
    mockCanPerform.mockReturnValue(false);
    const { testCloudConnectivity } = loadBarrel();

    await expect(testCloudConnectivity()).resolves.toEqual({
      canConnect: false,
      error: 'cloud_sync_consent_absent',
    });

    expect(mockCanPerform).toHaveBeenCalledWith('cloud_sync');
    expect(mockSupabase.initialize).not.toHaveBeenCalled();
    expect(mockSupabase.getAuthenticatedClient).not.toHaveBeenCalled();
    expect(mockSupabase.trackEvent).not.toHaveBeenCalled();
  });
});

/**
 * DEBUG-783: canConnect:true only after a real authenticated round-trip. The probe is a
 * head-only read of the user's own encrypted_backups row (RLS-scoped, no body). It never
 * mints an identity, writes nothing, and sends no connectivity event.
 */
describe('cloud services barrel — testCloudConnectivity round-trip (DEBUG-783)', () => {
  const USER_ID = 'uid-1';

  /** A client whose from().select().eq() settles as `outcome` says (created lazily, per call). */
  function probeClient(outcome: () => Promise<unknown>) {
    const eq = jest.fn(() => outcome());
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    return { client: { from }, from, select, eq };
  }

  async function consentedBarrel(): Promise<Barrel> {
    mockCanPerform.mockReturnValue(false);
    const barrel = loadBarrel();
    mockCanPerform.mockReturnValue(true);
    return barrel;
  }

  it('success: one head-only read of the own row, zero rows still counts, and no event is sent', async () => {
    const probe = probeClient(() => Promise.resolve({ error: null, count: 0, status: 200 }));
    mockSupabase.getAuthenticatedClient.mockResolvedValue({ ok: true, client: probe.client, userId: USER_ID });
    const { testCloudConnectivity } = await consentedBarrel();

    const result = await testCloudConnectivity();

    expect(result.canConnect).toBe(true);
    expect(typeof result.responseTimeMs).toBe('number');
    expect(mockSupabase.getAuthenticatedClient).toHaveBeenCalledWith({ mint: false });
    expect(probe.from).toHaveBeenCalledWith('encrypted_backups');
    expect(probe.select).toHaveBeenCalledWith('user_id', expect.objectContaining({ head: true }));
    expect(probe.eq).toHaveBeenCalledWith('user_id', USER_ID);
    expect(mockSupabase.trackEvent).not.toHaveBeenCalled();
  });

  it('init failure: cloud_init_failed, and no probe', async () => {
    mockSupabase.initialize.mockRejectedValue(new Error('boom'));
    const { testCloudConnectivity } = await consentedBarrel();

    await expect(testCloudConnectivity()).resolves.toEqual({ canConnect: false, error: 'cloud_init_failed' });
    expect(mockSupabase.getAuthenticatedClient).not.toHaveBeenCalled();
  });

  it('no session: cloud_no_session, asked with mint:false, and no read or event', async () => {
    mockSupabase.getAuthenticatedClient.mockResolvedValue({ ok: false, reason: 'no_session' });
    const { testCloudConnectivity } = await consentedBarrel();

    await expect(testCloudConnectivity()).resolves.toEqual({ canConnect: false, error: 'cloud_no_session' });
    expect(mockSupabase.getAuthenticatedClient).toHaveBeenCalledWith({ mint: false });
    expect(mockSupabase.trackEvent).not.toHaveBeenCalled();
  });

  it('client unavailable: cloud_init_failed', async () => {
    mockSupabase.getAuthenticatedClient.mockResolvedValue({ ok: false, reason: 'client_unavailable' });
    const { testCloudConnectivity } = await consentedBarrel();

    await expect(testCloudConnectivity()).resolves.toEqual({ canConnect: false, error: 'cloud_init_failed' });
  });

  it.each([
    ['a resolved { error } (supabase-js does not throw)', () => Promise.resolve({ error: { message: 'Network request failed' }, status: 0 })],
    ['a rejected request', () => Promise.reject(new Error('Network request failed'))],
    ['an HTTP error status', () => Promise.resolve({ error: null, status: 503 })],
  ])('offline / unreachable via %s: cloud_unreachable, never the raw message', async (_label, outcome) => {
    const probe = probeClient(outcome);
    mockSupabase.getAuthenticatedClient.mockResolvedValue({ ok: true, client: probe.client, userId: USER_ID });
    const { testCloudConnectivity } = await consentedBarrel();

    const result = await testCloudConnectivity();
    expect(result).toEqual({ canConnect: false, error: 'cloud_unreachable' });
    expect(JSON.stringify(result)).not.toMatch(/Network request failed/);
    expect(mockSupabase.trackEvent).not.toHaveBeenCalled();
  });

  it('a read that never settles is bounded: cloud_unreachable once the probe timeout passes', async () => {
    jest.useFakeTimers();
    try {
      const probe = probeClient(() => new Promise(() => undefined));
      mockSupabase.getAuthenticatedClient.mockResolvedValue({ ok: true, client: probe.client, userId: USER_ID });
      const barrel = await consentedBarrel();

      let settled: unknown = 'pending';
      void barrel.testCloudConnectivity().then((r) => {
        settled = r;
      });
      await flushMicrotasks();
      expect(settled).toBe('pending');

      await jest.advanceTimersByTimeAsync(barrel.CONNECTIVITY_PROBE_TIMEOUT_MS);
      expect(settled).toEqual({ canConnect: false, error: 'cloud_unreachable' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('exports the closed set of error codes the settings screen maps', async () => {
    const { CONNECTIVITY_ERROR } = await consentedBarrel();
    expect(CONNECTIVITY_ERROR).toEqual({
      CONSENT_ABSENT: 'cloud_sync_consent_absent',
      INIT_FAILED: 'cloud_init_failed',
      NO_SESSION: 'cloud_no_session',
      UNREACHABLE: 'cloud_unreachable',
    });
  });
});

describe('cloud services barrel — AppState lifecycle handler', () => {
  async function consentedHandler(): Promise<AppStateHandler> {
    mockCanPerform.mockReturnValue(true);
    loadBarrel();
    await flushMicrotasks();
    return appStateHandler();
  }

  // Delegation only. The consent chokepoint is inside CloudBackupService.createBackup
  // and is pinned by __tests__/unit/cloud-backup-consent.test.ts; with that service
  // mocked here, this test says only that 'background' hands off to it.
  it("'background' delegates to cloudBackupService.createBackup", async () => {
    const handler = await consentedHandler();

    await handler('background');

    expect(mockBackup.createBackup).toHaveBeenCalledTimes(1);
    expect(mockSupabase.processOfflineQueue).not.toHaveBeenCalled();
  });

  // MAINT-815: the foreground trigger has one owner, SupabaseService.setupAppStateListener
  // (one call per foreground across both modules is pinned by
  // foregroundQueueTrigger.unit.test.ts). The barrel's handler does nothing on 'active'.
  it("'active' does not process the offline queue: SupabaseService owns the foreground", async () => {
    const handler = await consentedHandler();

    await handler('active');

    expect(mockSupabase.processOfflineQueue).not.toHaveBeenCalled();
    expect(mockBackup.createBackup).not.toHaveBeenCalled();
  });

  it("'inactive' does neither", async () => {
    const handler = await consentedHandler();

    await handler('inactive');

    expect(mockBackup.createBackup).not.toHaveBeenCalled();
    expect(mockSupabase.processOfflineQueue).not.toHaveBeenCalled();
  });

  it("swallows a rejected createBackup on 'background' and logs it", async () => {
    const handler = await consentedHandler();
    mockBackup.createBackup.mockRejectedValue(new Error('backup boom'));

    await expect(handler('background')).resolves.toBeUndefined();
    expect(mockLogSecurity).toHaveBeenCalledWith(
      '[CloudServices] Background backup failed:',
      'medium',
      expect.objectContaining({ error: expect.any(Error) }),
    );
  });
});

describe('cloud services barrel — AppState subscription lifecycle (MAINT-817)', () => {
  async function consentedBarrel(): Promise<Barrel> {
    mockCanPerform.mockReturnValue(true);
    const barrel = loadBarrel();
    await flushMicrotasks();
    return barrel;
  }

  async function emit(state: string) {
    for (const handler of [...liveHandlers]) {
      await handler(state);
    }
  }

  it('init → 1 live handler, cleanup → 0, re-init → 1', async () => {
    const barrel = await consentedBarrel();
    expect(liveHandlers.size).toBe(1);

    await barrel.cleanupCloudServices();
    expect(liveHandlers.size).toBe(0);

    await barrel.default.initializeCloudServices();
    expect(liveHandlers.size).toBe(1);
  });

  it('three full cycles end at one handler, and one background runs exactly one backup', async () => {
    const barrel = await consentedBarrel();
    for (let i = 0; i < 3; i++) {
      await barrel.cleanupCloudServices();
      expect(liveHandlers.size).toBe(0);
      await barrel.default.initializeCloudServices();
    }
    expect(liveHandlers.size).toBe(1);

    mockBackup.createBackup.mockClear();
    await emit('background');
    expect(mockBackup.createBackup).toHaveBeenCalledTimes(1);
  });

  // AC4: the handler goes in the same branch that clears isInitialized. A rejected service
  // cleanup leaves both in place, so live handlers = isInitialized ? 1 : 0 on this path too.
  it.each([
    ['CloudBackupService', () => mockBackup.cleanup],
    ['SupabaseService', () => mockSupabase.cleanup],
  ])('a rejected %s cleanup keeps the handler and the initialized flag together', async (_name, cleanupOf) => {
    const barrel = await consentedBarrel();
    cleanupOf().mockRejectedValueOnce(new Error('cleanup boom'));

    await expect(barrel.cleanupCloudServices()).resolves.toBeUndefined();
    expect(mockLogSecurity).toHaveBeenCalledWith(
      '[CloudServices] Cleanup failed:',
      'medium',
      expect.objectContaining({ error: expect.any(Error) }),
    );
    expect(liveHandlers.size).toBe(1);

    // Still initialized: a re-init is a no-op and registers nothing more.
    await barrel.default.initializeCloudServices();
    expect(mockBackup.initialize).toHaveBeenCalledTimes(1);
    expect(liveHandlers.size).toBe(1);

    mockBackup.createBackup.mockClear();
    await emit('background');
    expect(mockBackup.createBackup).toHaveBeenCalledTimes(1);

    // A later successful cleanup takes the other branch.
    await barrel.cleanupCloudServices();
    expect(liveHandlers.size).toBe(0);
    await barrel.default.initializeCloudServices();
    expect(liveHandlers.size).toBe(1);
  });
});
