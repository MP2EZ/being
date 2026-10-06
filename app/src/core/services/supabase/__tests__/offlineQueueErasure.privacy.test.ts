/**
 * DEBUG-698 — the config-backup retry buffer (`@being/supabase/offline_queue`) is
 * erased with the account and does not come back.
 *
 * THE GAP. `SupabaseService` persists its backup retry queue under a key that
 * matches no swept prefix and was not on `SWEPT_EXACT_KEYS`, so it survived
 * `clearAllWellnessData`. Its payloads are CloudBackupService ciphertext under the
 * master key (crypto-shredded by the same erasure), so this is residue and metadata
 * hygiene, not plaintext wellness data.
 *
 * WHY MEMBERSHIP ALONE IS A FAKE CONTROL (the DEBUG-381 write-back class). The queue
 * is not a passive buffer: `queueOfflineOperation`, `processOfflineQueue` and
 * `cleanup` each re-serialise the WHOLE in-memory `offlineQueue` to that key. Sweep
 * the key without dropping the array and the next one of those writes restores every
 * pre-erasure op verbatim. So the erasure reset registered by SupabaseService and the
 * list entry must land and stay together, and the negative control below proves the
 * "does not come back" pin is not vacuous: without the reset, the op DOES come back.
 *
 * WHY THIS SUITE LOADS THE REAL SupabaseService. The registration happens at module
 * scope in SupabaseService.ts and binds the singleton. A suite that mocks the service
 * (as accountErasureInMemoryState does) never sees the owner.
 *
 * WHAT IS FAKED: AsyncStorage (a real in-memory map, because enumeration and
 * re-persistence are the mechanism under test) and expo-secure-store (no persisted
 * session, so `deleteAccount()` takes its no-account early return, which performs no
 * teardown). The registry, the sweep and SupabaseService are real.
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

import SecureStorageService, {
  SECURE_STORAGE_CONFIG,
} from '@/core/services/security/SecureStorageService';
import {
  registeredErasureResetOwners,
  resetInMemoryStateForErasure,
} from '@/core/services/privacy/erasureResetRegistry';
import supabaseService from '@/core/services/supabase/SupabaseService';

const OFFLINE_QUEUE_KEY = '@being/supabase/offline_queue';
/** A recognisable stand-in for a queued backup's ciphertext. */
const MARKER = 'PRE_ERASURE_BACKUP_CIPHERTEXT_d698';

/** Private state the scenarios drive; the shapes mirror SupabaseService's fields. */
type ServiceInternals = {
  offlineQueue: unknown[];
  isInitialized: boolean;
  client: unknown;
  userId: string | null;
};
const internals = supabaseService as unknown as ServiceInternals;

const settle = async () => {
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 0));
  }
};

const wholeStoreDump = () => JSON.stringify([...mockMemoryStore.entries()]);

/**
 * The service as erasure finds it: initialised this run (so `processOfflineQueue`
 * does not return early), with no live identity — the shape both a never-signed-in
 * device and a post-`teardownErasedSession` service have — and a backup that could
 * not be sent sitting in the queue. The op is enqueued through the real path
 * (`saveBackup` → `queueOfflineOperation`), which also persists it.
 */
async function seedQueuedBackup(): Promise<void> {
  internals.isInitialized = true;
  internals.client = null;
  internals.userId = null;
  await supabaseService.saveBackup(MARKER, 'checksum-d698', 1);
  await settle();
}

beforeEach(() => {
  mockMemoryStore.clear();
  internals.offlineQueue = [];
  internals.isInitialized = false;
  internals.client = null;
  internals.userId = null;
});

afterAll(async () => {
  await supabaseService.cleanup();
});

describe('offline_queue is on the auditable exact-key list (DEBUG-698)', () => {
  it('@being/supabase/offline_queue is on SWEPT_EXACT_KEYS', () => {
    // Membership, not behaviour — the behaviour is proven below. This pins WHERE
    // the coverage lives, beside crisis_analytics_queue and storage_metadata_index.
    expect(SECURE_STORAGE_CONFIG.SWEPT_EXACT_KEYS).toContain(OFFLINE_QUEUE_KEY);
  });

  it('supabaseService is a registered erasure owner', () => {
    // The list entry and the in-memory reset land together; this is the reset half.
    expect(registeredErasureResetOwners()).toContain('supabaseService');
  });
});

describe('the queued backup does not COME BACK after erasure (DEBUG-698)', () => {
  it('seeding reaches disk — the scenarios below start from a persisted, non-empty queue', async () => {
    await seedQueuedBackup();

    expect(internals.offlineQueue.length).toBeGreaterThan(0);
    expect(mockMemoryStore.get(OFFLINE_QUEUE_KEY)).toContain(MARKER);
  });

  it('reset + wipe: neither processOfflineQueue nor cleanup re-persists a pre-erasure op', async () => {
    await seedQueuedBackup();
    expect(mockMemoryStore.get(OFFLINE_QUEUE_KEY)).toContain(MARKER);

    // AccountDeletionService order: server erasure, in-memory reset, then the wipe.
    // With no persisted session deleteAccount() takes its early return and tears
    // nothing down, so it cannot be what clears the queue.
    expect(await supabaseService.deleteAccount()).toBe(true);
    expect(internals.offlineQueue.length).toBeGreaterThan(0);

    await resetInMemoryStateForErasure();
    await SecureStorageService.clearAllWellnessData({ deleteMasterKey: true });

    expect(mockMemoryStore.has(OFFLINE_QUEUE_KEY)).toBe(false);

    // The two writers that re-serialise the whole in-memory queue.
    await supabaseService.processOfflineQueue();
    await supabaseService.cleanup();
    await settle();

    // cleanup() legitimately writes '[]', so assert content, not absence.
    expect(wholeStoreDump()).not.toContain(MARKER);
    expect(JSON.parse(mockMemoryStore.get(OFFLINE_QUEUE_KEY) ?? '[]')).toEqual([]);
  });

  it('NEGATIVE CONTROL — without the reset, the wipe alone is undone and the op comes back', async () => {
    // Proves the pin above is not vacuous: the same sequence minus the registry
    // reset restores the pre-erasure op from memory, whatever the sweep removed.
    await seedQueuedBackup();

    await SecureStorageService.clearAllWellnessData({ deleteMasterKey: true });
    await supabaseService.processOfflineQueue();
    await supabaseService.cleanup();
    await settle();

    expect(mockMemoryStore.get(OFFLINE_QUEUE_KEY)).toContain(MARKER);
  });
});
