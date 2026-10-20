/**
 * MAINT-815 — one offline-queue trigger per foreground, across BOTH AppState listeners.
 *
 * Two listeners used to call `processOfflineQueue` on every 'active': SupabaseService's own
 * (registered in its constructor, on every install) and the cloud-services barrel's (registered
 * only after a consented `initializeCloudServices`). DEBUG-791 made the second call join the
 * first, so the duplicate was harmless, but it was two owners for one trigger. The ruling
 * (crisis + compliance, b-batch panel) keeps the service's listener: it is the only one that
 * runs the DEBUG-756 drop/hold disposition without consent, and it carries the vital-interest
 * telemetry retry. The barrel's 'active' arm is gone.
 *
 * WHY BOTH REAL MODULES. Each existing suite sees one listener: the barrel suite factory-mocks
 * SupabaseService, and the SupabaseService suites never load the barrel. Only a run that loads
 * both, with `AppState.addEventListener` spied before either registers, can count what one
 * foreground does. Counts are taken on the PUBLIC `processOfflineQueue`, never on passes or
 * upserts: single-flight folds a duplicate call into one pass, which would hide it.
 */

const mockMemoryStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => {
  const impl = {
    getItem: jest.fn(async (k: string) => mockMemoryStore.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => {
      mockMemoryStore.set(k, v);
    }),
    removeItem: jest.fn(async (k: string) => {
      mockMemoryStore.delete(k);
    }),
    getAllKeys: jest.fn(async () => [...mockMemoryStore.keys()]),
    multiRemove: jest.fn(async (keys: string[]) => {
      keys.forEach((k) => mockMemoryStore.delete(k));
    }),
  };
  return { __esModule: true, default: impl, ...impl };
});

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('../CloudBackupService', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn(async () => undefined),
    createBackup: jest.fn(async () => undefined),
  },
}));

type Handler = (state: string) => unknown;

interface Loaded {
  handlers: Handler[];
  queue: jest.SpyInstance;
  flush: jest.SpyInstance;
  drain: jest.SpyInstance;
  createBackup: jest.Mock;
}

const settle = async () => {
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 0));
  }
};

/**
 * Fresh registry: spy AppState first, set consent, load the real service (its constructor
 * registers), stub its side-effecting methods, then load the real barrel (its import-time
 * init registers the second listener when cloud_sync consent is valid).
 */
async function loadBoth(cloudSyncConsent: boolean): Promise<Loaded> {
  let addSpy!: jest.SpyInstance;
  let rest!: Omit<Loaded, 'handlers'>;
  jest.isolateModules(() => {
    const { AppState } = require('react-native');
    // The RN preset already mocks addEventListener; spyOn hands back that mock, whose calls
    // persist across tests, so clear it before anything registers.
    addSpy = jest.spyOn(AppState, 'addEventListener');
    addSpy.mockClear();
    const { useConsentStore } = require('@/core/stores/consentStore');
    useConsentStore.setState({
      consentStatus: cloudSyncConsent ? 'valid' : 'loading',
      consentCache: {
        ...useConsentStore.getState().consentCache,
        canSyncToCloud: cloudSyncConsent,
        honorUniversalOptOut: false,
      },
    });
    const svc = require('../SupabaseService').default;
    jest.spyOn(svc, 'initialize').mockResolvedValue(undefined);
    rest = {
      queue: jest.spyOn(svc, 'processOfflineQueue').mockResolvedValue(undefined),
      flush: jest.spyOn(svc, 'flushCrisisAnalytics').mockResolvedValue(undefined),
      drain: jest.spyOn(svc, 'drainPendingBackupDelete').mockResolvedValue(undefined),
      createBackup: require('../CloudBackupService').default.createBackup,
    };
    require('../index');
  });
  await settle();
  const handlers = addSpy.mock.calls
    .filter(([event]) => event === 'change')
    .map(([, handler]) => handler as Handler);
  return { handlers, ...rest };
}

/** What the OS does on a foreground: every registered 'change' handler gets 'active'. */
async function foreground(handlers: Handler[]): Promise<void> {
  for (const handler of handlers) await handler('active');
  await settle();
}

beforeEach(() => {
  mockMemoryStore.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('MAINT-815 — one foreground trigger across the service and barrel listeners', () => {
  it('with cloud_sync consent (both listeners registered): one queue trigger and one telemetry retry per foreground', async () => {
    const { handlers, queue, flush, drain, createBackup } = await loadBoth(true);
    // Anti-vacuity: the barrel's listener really registered, so a duplicate trigger would show.
    expect(handlers).toHaveLength(2);

    await foreground(handlers);
    expect(queue).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledTimes(1);
    expect(drain).toHaveBeenCalledTimes(1);
    expect(createBackup).not.toHaveBeenCalled();

    await foreground(handlers);
    expect(queue).toHaveBeenCalledTimes(2);
    expect(flush).toHaveBeenCalledTimes(2);
  });

  it('without consent (service listener only): still one queue trigger, so the drop/hold disposition runs, and one telemetry retry', async () => {
    const { handlers, queue, flush } = await loadBoth(false);
    expect(handlers).toHaveLength(1);

    await foreground(handlers);
    expect(queue).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it('a rejected queue pass does not stop the telemetry retry', async () => {
    const { handlers, queue, flush } = await loadBoth(true);
    queue.mockRejectedValue(new Error('queue boom'));

    await foreground(handlers);
    expect(queue).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledTimes(1);
  });
});
