/**
 * DEBUG-756 — a settings backup queued while cloud_sync consent was valid does not upload
 * after the user withdraws it, or turns on Universal Opt-Out.
 *
 * THE GAP. `processOfflineQueue` replays queued `saveBackup` ops on every foreground, and
 * `saveBackup` checked only isInitialized / client / userId - never consent. Privacy policy §9
 * says Universal Opt-Out "immediately suppresses ... settings backup", and GDPR Art. 7(3) makes
 * withdrawal as effective as the grant.
 *
 * THE RULING (compliance + crisis, b-batch panel). Consent is read when the queue is processed:
 *   - definitively absent (cloud_sync off, Universal Opt-Out, revoked, any non-valid status
 *     other than 'loading') -> DROP the queue, persisted, so loadOfflineQueue cannot restore it;
 *   - 'loading' (not yet known, e.g. a cold-start foreground before hydration) -> HOLD: no
 *     upload and no drop, or a consenting user's queue would be destroyed on every boot;
 *   - valid -> process as before.
 * saveBackup refuses without consent and does not enqueue, so a refusal cannot re-create the
 * queue just dropped. The crisis-telemetry retry on the same 'active' event is vital-interest
 * and must run whatever the consent state.
 *
 * WHY THE REAL SERVICE AND THE REAL CONSENT STORE. The defect is a consent TRANSITION after an
 * enqueue, and the predicate (incl. the honorUniversalOptOut short-circuit) lives in the store.
 * Mocking canPerformOperation to false from the start would not reproduce it.
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

import { AppState } from 'react-native';
import supabaseService from '@/core/services/supabase/SupabaseService';
import { useConsentStore } from '@/core/stores/consentStore';

const OFFLINE_QUEUE_KEY = '@being/supabase/offline_queue';
const MARKER = 'QUEUED_SETTINGS_BACKUP_CIPHERTEXT_d756';

type ServiceInternals = {
  offlineQueue: unknown[];
  isInitialized: boolean;
  client: unknown;
  userId: string | null;
  setupAppStateListener: () => void;
  flushCrisisAnalytics: () => Promise<void>;
};
const internals = supabaseService as unknown as ServiceInternals;

const upsert = jest.fn(async () => ({ data: null, error: null }));
const fakeClient = {
  from: jest.fn((table: string) => {
    if (table !== 'encrypted_backups') throw new Error(`unexpected table ${table}`);
    return { upsert };
  }),
};

const settle = async () => {
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 0));
  }
};

type Consent = {
  consentStatus: string;
  canSyncToCloud: boolean;
  honorUniversalOptOut: boolean;
};

function setConsent({ consentStatus, canSyncToCloud, honorUniversalOptOut }: Consent) {
  useConsentStore.setState({
    consentStatus: consentStatus as never,
    consentCache: {
      ...useConsentStore.getState().consentCache,
      canSyncToCloud,
      honorUniversalOptOut,
    },
  });
}

const VALID: Consent = { consentStatus: 'valid', canSyncToCloud: true, honorUniversalOptOut: false };

/** A backup that could not be sent while consent WAS valid, enqueued through the real path. */
async function seedQueuedBackupUnderValidConsent(): Promise<void> {
  setConsent(VALID);
  internals.isInitialized = true;
  internals.client = null;
  internals.userId = null;
  await supabaseService.saveBackup(MARKER, 'checksum-d756', 1);
  await settle();
  expect(internals.offlineQueue).toHaveLength(1);
  expect(mockMemoryStore.get(OFFLINE_QUEUE_KEY)).toContain(MARKER);
  // Connectivity is back: a foreground would now upload it.
  internals.client = fakeClient;
  internals.userId = 'user-d756';
}

let flushSpy: jest.SpyInstance;

/** The service's own AppState 'active' handler - the independent path the barrel cannot gate. */
function serviceActiveHandler(): (state: string) => void {
  const spy = jest.spyOn(AppState, 'addEventListener');
  internals.setupAppStateListener();
  const handler = spy.mock.calls[spy.mock.calls.length - 1][1] as (state: string) => void;
  spy.mockRestore();
  return handler;
}

beforeEach(() => {
  mockMemoryStore.clear();
  upsert.mockClear();
  fakeClient.from.mockClear();
  internals.offlineQueue = [];
  internals.isInitialized = false;
  internals.client = null;
  internals.userId = null;
  setConsent({ consentStatus: 'loading', canSyncToCloud: false, honorUniversalOptOut: false });
  flushSpy = jest.spyOn(internals, 'flushCrisisAnalytics').mockResolvedValue(undefined);
});

afterEach(() => {
  flushSpy.mockRestore();
});

afterAll(async () => {
  internals.client = null;
  await supabaseService.cleanup();
});

describe('a queued backup does not upload after consent is withdrawn (DEBUG-756)', () => {
  it.each<[string, Consent]>([
    ['cloud_sync toggled off', { consentStatus: 'valid', canSyncToCloud: false, honorUniversalOptOut: false }],
    ['Universal Opt-Out on, granular cloud_sync still granted', { consentStatus: 'valid', canSyncToCloud: true, honorUniversalOptOut: true }],
    ['consent revoked', { consentStatus: 'revoked', canSyncToCloud: true, honorUniversalOptOut: false }],
  ])('%s: foregrounding uploads nothing and DROPS the queue, in memory and on disk', async (_label, consent) => {
    await seedQueuedBackupUnderValidConsent();
    const onActive = serviceActiveHandler();

    setConsent(consent);
    onActive('active');
    await settle();

    expect(upsert).not.toHaveBeenCalled();
    expect(internals.offlineQueue).toEqual([]);
    expect(JSON.parse(mockMemoryStore.get(OFFLINE_QUEUE_KEY) ?? 'null')).toEqual([]);
  });

  it("consent still 'loading': uploads nothing and HOLDS the queue (a cold start must not drop it)", async () => {
    await seedQueuedBackupUnderValidConsent();
    const onActive = serviceActiveHandler();

    setConsent({ consentStatus: 'loading', canSyncToCloud: false, honorUniversalOptOut: false });
    onActive('active');
    await settle();

    expect(upsert).not.toHaveBeenCalled();
    expect(internals.offlineQueue).toHaveLength(1);
    expect(mockMemoryStore.get(OFFLINE_QUEUE_KEY)).toContain(MARKER);
  });

  it('POSITIVE CONTROL — consent still valid: the queued backup uploads once and leaves the queue', async () => {
    await seedQueuedBackupUnderValidConsent();
    const onActive = serviceActiveHandler();

    onActive('active');
    await settle();

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(internals.offlineQueue).toEqual([]);
  });

  it('a direct saveBackup while withdrawn returns false, uploads nothing and enqueues nothing', async () => {
    setConsent({ consentStatus: 'valid', canSyncToCloud: false, honorUniversalOptOut: false });
    internals.isInitialized = true;
    internals.client = fakeClient;
    internals.userId = 'user-d756';

    await expect(supabaseService.saveBackup(MARKER, 'checksum-d756', 1)).resolves.toBe(false);
    await settle();

    expect(upsert).not.toHaveBeenCalled();
    expect(internals.offlineQueue).toEqual([]);
    expect(mockMemoryStore.get(OFFLINE_QUEUE_KEY) ?? '').not.toContain(MARKER);
  });

  it('a saveBackup refused while uninitialised and withdrawn does not enqueue either', async () => {
    setConsent({ consentStatus: 'valid', canSyncToCloud: false, honorUniversalOptOut: false });
    internals.isInitialized = false;

    await expect(supabaseService.saveBackup(MARKER, 'checksum-d756', 1)).resolves.toBe(false);
    await settle();

    expect(internals.offlineQueue).toEqual([]);
  });
});

describe('the crisis-telemetry retry on the same foreground is consent-independent (DEBUG-756)', () => {
  it.each<[string, Consent]>([
    ['cloud_sync withdrawn', { consentStatus: 'valid', canSyncToCloud: false, honorUniversalOptOut: false }],
    ['Universal Opt-Out on', { consentStatus: 'valid', canSyncToCloud: true, honorUniversalOptOut: true }],
  ])("%s: 'active' still flushes crisis analytics while no backup uploads", async (_label, consent) => {
    await seedQueuedBackupUnderValidConsent();
    const onActive = serviceActiveHandler();
    setConsent(consent);
    flushSpy.mockClear();

    onActive('active');
    await settle();

    expect(flushSpy).toHaveBeenCalledTimes(1);
    expect(upsert).not.toHaveBeenCalled();
  });
});
