/**
 * DEBUG-766 — a backup that fails during `processOfflineQueue` stays queued ONCE; the pass
 * never pushes a duplicate of it onto the array it is iterating.
 *
 * THE DEFECT. `processOfflineQueue` replays each queued op through the public `saveBackup`,
 * and `saveBackup` enqueued on its own failure. Called from inside the replay loop that
 * pushed a second copy of the failing op onto `this.offlineQueue` — the array the loop was
 * walking — so every failed foreground pass grew the queue, and the `splice` bookkeeping that
 * followed removed by INDEX after earlier removals had already shifted them.
 *
 * THE FIX (SupabaseService.ts). The upload body is a private `attemptBackupUpload` that
 * reports 'uploaded' | 'refused' | 'unavailable' | 'failed' and never enqueues; public
 * `saveBackup` enqueues once on 'unavailable' / 'failed'. The pass loops a SNAPSHOT, collects
 * the finished ops by object identity, and filters the CURRENT array afterwards, so an op
 * enqueued or a queue reset by a concurrent caller mid-pass is never undone.
 *
 * Superseding an older queued snapshot and single-flighting the pass are DEBUG-791
 * (offlineQueueSupersede.unit.test.ts).
 *
 * WHY THE REAL SERVICE. The duplicate only exists in the interaction between the public
 * `saveBackup`, the executeWithResilience retry/breaker and the loop. A stubbed saveBackup
 * would test the stub.
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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import supabaseService from '@/core/services/supabase/SupabaseService';
import { useConsentStore } from '@/core/stores/consentStore';

const OFFLINE_QUEUE_KEY = '@being/supabase/offline_queue';

type QueuedOp = { operation: string; data: { encryptedData: string }; timestamp: number };

type ServiceInternals = {
  offlineQueue: QueuedOp[];
  isInitialized: boolean;
  client: unknown;
  userId: string | null;
  circuitBreaker: { failures: number; lastFailureTime: number; state: string };
  config: { circuitBreaker: { threshold: number } };
  crisisAnalyticsQueue: unknown[];
  setupAppStateListener: () => void;
  processOfflineQueue: () => Promise<void>;
};
const internals = supabaseService as unknown as ServiceInternals;
const setItem = AsyncStorage.setItem as unknown as jest.Mock;

// Payloads whose upload fails; every other payload succeeds.
let failing: (encryptedData: string) => boolean = () => true;

const upsert = jest.fn(async (row: { encrypted_data: string }) =>
  failing(row.encrypted_data)
    ? { data: null, error: { message: 'RLS denied' } }
    : { data: null, error: null },
);
const insert = jest.fn(async (_rows: unknown[]) => ({ data: [{}], error: null }));
const fakeClient = {
  from: jest.fn((table: string) => {
    if (table === 'encrypted_backups') return { upsert };
    if (table === 'analytics_events') return { insert };
    throw new Error(`unexpected table ${table}`);
  }),
};

/** Drain fake-timer backoff (1s/2s retry sleeps) and the microtasks queued behind it. */
const settle = async () => {
  await jest.runAllTimersAsync();
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

/** The service's own AppState 'active' handler — the path a real foreground takes. */
function serviceActiveHandler(): (state: string) => void {
  const spy = jest.spyOn(AppState, 'addEventListener');
  internals.setupAppStateListener();
  const handler = spy.mock.calls[spy.mock.calls.length - 1][1] as (state: string) => void;
  spy.mockRestore();
  return handler;
}

/** setItem calls on the offline-queue key only — other keys (last_sync, crisis) are noise here. */
const queueWrites = () => setItem.mock.calls.filter(([key]) => key === OFFLINE_QUEUE_KEY);

/**
 * Enqueue `payloads` through the real path (client unavailable), then bring connectivity back.
 * The enqueue writes are cleared so a test counts only what the foreground pass does.
 */
async function seedQueue(payloads: string[], { online = true } = {}): Promise<QueuedOp[]> {
  internals.isInitialized = true;
  internals.client = null;
  internals.userId = null;
  for (const p of payloads) await supabaseService.saveBackup(p, `checksum-${p}`, 1);
  await settle();
  expect(internals.offlineQueue).toHaveLength(payloads.length);
  if (online) {
    internals.client = fakeClient;
    internals.userId = 'user-d766';
    // INFRA-861: the crisis flush writes through its own session-free client.
    internals.crisisClient = fakeClient;
  }
  setItem.mockClear();
  upsert.mockClear();
  return [...internals.offlineQueue];
}

const payloadsOf = (ops: QueuedOp[]) => ops.map((op) => op.data.encryptedData);

/** Same op OBJECTS, same order — the queue was not rebuilt or re-pushed. */
function expectSameOps(actual: QueuedOp[], expected: QueuedOp[]) {
  expect(actual).toHaveLength(expected.length);
  expected.forEach((op, i) => expect(actual[i]).toBe(op));
}

const THRESHOLD = internals.config.circuitBreaker.threshold;

beforeEach(() => {
  jest.useFakeTimers();
  mockMemoryStore.clear();
  setItem.mockClear();
  upsert.mockClear();
  insert.mockClear();
  fakeClient.from.mockClear();
  failing = () => true;
  internals.offlineQueue = [];
  internals.crisisAnalyticsQueue = [];
  internals.isInitialized = false;
  internals.client = null;
  internals.userId = null;
  internals.circuitBreaker = { failures: 0, lastFailureTime: 0, state: 'closed' };
  internals.config.circuitBreaker.threshold = THRESHOLD;
  useConsentStore.setState({
    consentStatus: 'valid' as never,
    consentCache: {
      ...useConsentStore.getState().consentCache,
      canSyncToCloud: true,
      honorUniversalOptOut: false,
    },
  });
});

afterEach(() => {
  jest.useRealTimers();
});

afterAll(async () => {
  internals.client = null;
  await supabaseService.cleanup();
});

describe('a failed backup stays queued once through a foreground pass (DEBUG-766)', () => {
  it('POSITIVE CONTROL — every upsert succeeds: the queue empties with ONE queue write', async () => {
    failing = () => false;
    await seedQueue(['a', 'b', 'c']);
    const onActive = serviceActiveHandler();

    onActive('active');
    await settle();

    expect(upsert).toHaveBeenCalledTimes(3);
    expect(internals.offlineQueue).toEqual([]);
    expect(queueWrites()).toHaveLength(1);
    expect(JSON.parse(mockMemoryStore.get(OFFLINE_QUEUE_KEY) ?? 'null')).toEqual([]);
  });

  it('3 distinct payloads, every upsert fails: the same 3 ops stay, in order, with ONE queue write', async () => {
    const before = await seedQueue(['a', 'b', 'c']);
    const onActive = serviceActiveHandler();

    onActive('active');
    await settle();

    expect(upsert).toHaveBeenCalled();
    expectSameOps(internals.offlineQueue, before);
    expect(queueWrites()).toHaveLength(1);
    expect(JSON.parse(mockMemoryStore.get(OFFLINE_QUEUE_KEY) ?? 'null')).toHaveLength(3);
  });

  it('client and userId unavailable: nothing is uploaded and the same 3 ops stay, with ONE queue write', async () => {
    const before = await seedQueue(['a', 'b', 'c'], { online: false });
    const onActive = serviceActiveHandler();

    onActive('active');
    await settle();

    expect(upsert).not.toHaveBeenCalled();
    expectSameOps(internals.offlineQueue, before);
    expect(queueWrites()).toHaveLength(1);
  });

  it('mixed [fail, ok, fail, ok]: exactly the two failures remain, by identity, in order', async () => {
    // Raised so the two failures cannot open the breaker and turn the ok ops into refusals.
    internals.config.circuitBreaker.threshold = 100;
    failing = (p) => p === 'op0' || p === 'op2';
    const before = await seedQueue(['op0', 'op1', 'op2', 'op3']);
    const onActive = serviceActiveHandler();

    onActive('active');
    await settle();

    expectSameOps(internals.offlineQueue, [before[0], before[2]]);
    expect(queueWrites()).toHaveLength(1);
    expect(JSON.parse(mockMemoryStore.get(OFFLINE_QUEUE_KEY) ?? 'null')).toHaveLength(2);
  });

  it('100 distinct payloads, all failing: all 100 survive, identity and order preserved, none evicted', async () => {
    const before = await seedQueue(Array.from({ length: 100 }, (_, i) => `p${i}`));
    const onActive = serviceActiveHandler();

    onActive('active');
    await settle();

    expectSameOps(internals.offlineQueue, before);
    expect(payloadsOf(internals.offlineQueue)).toEqual(payloadsOf(before));
    expect(queueWrites()).toHaveLength(1);
  });

  it('a saveBackup failure enqueued by a concurrent caller mid-pass survives the pass', async () => {
    internals.config.circuitBreaker.threshold = 100;
    failing = (p) => p !== 'a';
    const before = await seedQueue(['a', 'b', 'c']);
    const onActive = serviceActiveHandler();

    // 'a' uploads, and while the pass is still walking b and c a separate caller's own
    // upload fails and enqueues 'late'. The pass must remove 'a' without undoing 'late'.
    upsert.mockImplementationOnce(async (row: { encrypted_data: string }) => {
      void supabaseService.saveBackup('late', 'checksum-late', 1);
      return failing(row.encrypted_data)
        ? { data: null, error: { message: 'RLS denied' } }
        : { data: null, error: null };
    });

    onActive('active');
    await settle();

    expect(payloadsOf(internals.offlineQueue)).toEqual(['b', 'c', 'late']);
    expect(internals.offlineQueue[0]).toBe(before[1]);
    expect(internals.offlineQueue[1]).toBe(before[2]);
  });
});

describe('the crisis analytics flush in the same AppState handler is untouched (DEBUG-766)', () => {
  const crisisEvent = () => ({
    event_type: 'crisis_detected',
    properties: {
      trigger_type: 'phq9_suicidal_ideation',
      severity_bucket: 'critical',
      intervention_surfaced: true,
      assessment_type: 'PHQ-9',
    },
    session_id: 'session-d766',
    enqueued_at: Date.now(),
  });

  /** The REAL flushCrisisAnalytics ran to the analytics_events insert, with the queued row. */
  function expectCrisisInsertedOnce() {
    expect(fakeClient.from).toHaveBeenCalledWith('analytics_events');
    expect(insert).toHaveBeenCalledTimes(1);
    const rows = insert.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(expect.objectContaining({ event_type: 'crisis_detected' }));
    // INFRA-861: no identifier on the wire.
    expect(rows[0]).not.toHaveProperty('user_id');
  }

  it('6 failing queued backups (the breaker opens mid-pass) do not stand between the foreground and the crisis insert', async () => {
    await seedQueue(['a', 'b', 'c', 'd', 'e', 'f']);
    internals.crisisAnalyticsQueue = [crisisEvent()];
    const onActive = serviceActiveHandler();

    onActive('active');
    await settle();

    expect(internals.circuitBreaker.state).toBe('open');
    expectCrisisInsertedOnce();
  });

  it.each<[string, () => Promise<void>]>([
    ['processOfflineQueue rejects', () => Promise.reject(new Error('queue pass blew up'))],
    ['processOfflineQueue never settles', () => new Promise<void>(() => {})],
  ])('%s: the crisis insert still happens exactly once', async (_label, behaviour) => {
    await seedQueue(['a', 'b']);
    internals.crisisAnalyticsQueue = [crisisEvent()];
    const passSpy = jest.spyOn(internals, 'processOfflineQueue').mockImplementation(behaviour);
    const onActive = serviceActiveHandler();

    try {
      onActive('active');
      await settle();

      expect(passSpy).toHaveBeenCalledTimes(1);
      expectCrisisInsertedOnce();
    } finally {
      passSpy.mockRestore();
    }
  });
});
