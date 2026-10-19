/**
 * DEBUG-791 — the cloud-backup offline queue never replays an OLDER snapshot over a newer
 * one, and the replay pass is a single flight.
 *
 * THE DEFECT. The server keeps ONE row per user (upsert onConflict user_id), so the last
 * write wins. A failed snapshot parked in the offline queue is older than whatever uploaded
 * after it, yet `processOfflineQueue` replayed it blindly — and ran as parallel loops (one
 * foreground fires it from two AppState listeners; `forceSync` runs a direct upload and then
 * a pass), so an old snapshot could land last and silently replace the newest backup.
 *
 * THE FIX (SupabaseService.ts).
 *  A. Snapshot-time watermark: `saveBackup` stamps `snapshotAt` at entry; a successful upload
 *     writes LAST_SYNC = snapshotAt (a replay: the op's own timestamp), never the completion
 *     time — which would mark a never-uploaded op1 "superseded" by an op0 that merely finished
 *     later (case 5).
 *  B. Replays only: an op strictly older than LAST_SYNC is 'superseded' and removed unsent.
 *     Equal is not stale; a missing or corrupt LAST_SYNC fails OPEN. Direct saves are never
 *     checked.
 *  C. Every upload attempt runs inside one promise lane, so two uploads never interleave.
 *  D. `processOfflineQueue` joins the in-flight pass.
 *  E. Erasure guards: the uid/client bound at attempt start, an erasure epoch the pass checks
 *     before every op, and no upload while deleteAccount() is in flight.
 *  F. `queueOfflineOperation`'s fire-and-forget write can no longer reject unhandled.
 *
 * WHY THE REAL SERVICE: every case is an interaction between the lane, the executeWithResilience
 * retry/breaker and the pass loop. A stubbed saveBackup would test the stub.
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

const mockLogSecurity = jest.fn();
jest.mock('../../logging', () => {
  const actual = jest.requireActual('../../logging') as Record<string, unknown>;
  return { ...actual, logSecurity: (...args: unknown[]) => mockLogSecurity(...args) };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import supabaseService from '@/core/services/supabase/SupabaseService';
import { useConsentStore } from '@/core/stores/consentStore';

const OFFLINE_QUEUE_KEY = '@being/supabase/offline_queue';
const LAST_SYNC_KEY = '@being/supabase/last_sync';

type QueuedOp = { operation: string; data: { encryptedData: string }; timestamp: number };

type ServiceInternals = {
  offlineQueue: QueuedOp[];
  isInitialized: boolean;
  client: unknown;
  userId: string | null;
  deletionsInFlight: number;
  circuitBreaker: { failures: number; lastFailureTime: number; state: string };
  config: { circuitBreaker: { threshold: number } };
  crisisAnalyticsQueue: unknown[];
  setupAppStateListener: () => void;
  runOfflineQueuePass: () => Promise<void>;
};
const internals = supabaseService as unknown as ServiceInternals;
const setItem = AsyncStorage.setItem as unknown as jest.Mock;

type Deferred = { promise: Promise<void>; release: () => void };
const deferred = (): Deferred => {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
};

/** Payloads whose upload fails; every other payload succeeds. */
let failing: (encryptedData: string) => boolean = () => false;
/** Payloads whose upsert blocks until released — holds the upload lane open. */
const holds = new Map<string, Deferred>();
/** `start:x` / `end:x` per upsert, in order — an interleave shows as start,start. */
let events: string[] = [];

type Row = { user_id: string; encrypted_data: string };

function makeClient(label = 'A') {
  const upsert = jest.fn(async (row: Row) => {
    events.push(`start:${row.encrypted_data}`);
    const hold = holds.get(row.encrypted_data);
    if (hold) await hold.promise;
    events.push(`end:${row.encrypted_data}`);
    return failing(row.encrypted_data)
      ? { data: null, error: { message: `RLS denied (${label})` } }
      : { data: null, error: null };
  });
  const insert = jest.fn(async (_rows: unknown[]) => ({ data: [{}], error: null }));
  const client = {
    from: jest.fn((table: string) => {
      if (table === 'encrypted_backups') return { upsert };
      if (table === 'analytics_events') return { insert };
      throw new Error(`unexpected table ${table}`);
    }),
  };
  return { client, upsert, insert };
}

let main = makeClient();

/** Drain fake-timer backoff (1s/2s retry sleeps) and the microtasks queued behind it. */
const settle = async () => {
  await jest.runAllTimersAsync();
  for (let i = 0; i < 20; i++) await Promise.resolve();
};
/** Microtasks only — never advances the fake clock or fires a retry sleep. */
const flush = async () => {
  for (let i = 0; i < 40; i++) await Promise.resolve();
};

function serviceActiveHandler(): (state: string) => void {
  const spy = jest.spyOn(AppState, 'addEventListener');
  internals.setupAppStateListener();
  const handler = spy.mock.calls[spy.mock.calls.length - 1][1] as (state: string) => void;
  spy.mockRestore();
  return handler;
}

/** A pass, with the fake-timer retry sleeps drained while it runs. */
async function runPass(): Promise<void> {
  const pass = supabaseService.processOfflineQueue();
  await settle();
  await pass;
}

const queueWrites = () => setItem.mock.calls.filter(([key]) => key === OFFLINE_QUEUE_KEY);
const upsertedPayloads = (m = main) => m.upsert.mock.calls.map(([row]) => row.encrypted_data);
const iso = (ms: number) => new Date(ms).toISOString();

const T0 = 1_000_000;

function goOnline(uid = 'user-d791', m = main) {
  internals.client = m.client;
  internals.userId = uid;
}

/**
 * Enqueue `payloads` through the real path (client unavailable), 10 ms apart so each op has
 * its own snapshot time, then bring connectivity back. Counters are cleared afterwards.
 */
async function seedQueue(payloads: string[], { online = true } = {}): Promise<QueuedOp[]> {
  internals.isInitialized = true;
  internals.client = null;
  internals.userId = null;
  for (let i = 0; i < payloads.length; i++) {
    jest.setSystemTime(T0 + i * 10);
    await supabaseService.saveBackup(payloads[i], `checksum-${payloads[i]}`, 1);
  }
  await settle();
  expect(internals.offlineQueue).toHaveLength(payloads.length);
  if (online) goOnline();
  setItem.mockClear();
  main.upsert.mockClear();
  events = [];
  return [...internals.offlineQueue];
}

const THRESHOLD = internals.config.circuitBreaker.threshold;

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(T0);
  mockMemoryStore.clear();
  setItem.mockClear();
  mockLogSecurity.mockClear();
  holds.clear();
  events = [];
  failing = () => false;
  main = makeClient();
  internals.offlineQueue = [];
  internals.crisisAnalyticsQueue = [];
  internals.isInitialized = false;
  internals.client = null;
  internals.userId = null;
  internals.deletionsInFlight = 0;
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
  holds.forEach((h) => h.release());
  jest.restoreAllMocks();
  jest.useRealTimers();
});

afterAll(async () => {
  internals.client = null;
  await supabaseService.cleanup();
});

describe('watermark: LAST_SYNC is the snapshot time, not the completion time (A)', () => {
  it('a direct upload that completes later still records the time its snapshot was taken', async () => {
    internals.isInitialized = true;
    goOnline();
    holds.set('snap', deferred());
    jest.setSystemTime(5_000);
    const save = supabaseService.saveBackup('snap', 'c', 1);
    await flush();
    jest.setSystemTime(9_000); // the upload finishes 4 s after the snapshot
    holds.get('snap')!.release();

    expect(await save).toBe(true);
    expect(mockMemoryStore.get(LAST_SYNC_KEY)).toBe(iso(5_000));
  });

  it('a failed direct upload is queued with the snapshot time, not the time the retries ran out', async () => {
    internals.isInitialized = true;
    goOnline();
    failing = () => true;
    jest.setSystemTime(5_000);
    const save = supabaseService.saveBackup('snap', 'c', 1);
    await settle(); // retry sleeps advance the fake clock past 5_000

    expect(await save).toBe(false);
    expect(Date.now()).toBeGreaterThan(5_000);
    expect(internals.offlineQueue).toHaveLength(1);
    expect(internals.offlineQueue[0].timestamp).toBe(5_000);
  });
});

describe('a replay is superseded by a newer upload (B)', () => {
  it('case 1: newer direct upload, then a pass — the older queued op is not upserted, is removed, ONE queue write', async () => {
    await seedQueue(['old']);
    jest.setSystemTime(T0 + 5_000);
    expect(await supabaseService.saveBackup('new', 'c-new', 1)).toBe(true);
    main.upsert.mockClear();
    setItem.mockClear();

    await runPass();

    expect(main.upsert).not.toHaveBeenCalled();
    expect(internals.offlineQueue).toEqual([]);
    expect(queueWrites()).toHaveLength(1);
    expect(JSON.parse(mockMemoryStore.get(OFFLINE_QUEUE_KEY) ?? 'null')).toEqual([]);
  });

  it('case 2: forceSync order (direct save, then the pass) — the final upsert is the newest snapshot', async () => {
    await seedQueue(['old1', 'old2']);
    jest.setSystemTime(T0 + 5_000);
    await supabaseService.saveBackup('newest', 'c-newest', 1);
    await runPass();

    expect(upsertedPayloads()).toEqual(['newest']);
    expect(internals.offlineQueue).toEqual([]);
  });

  it('case 3: a replay upsert in flight while a direct save is called — the uploads are serialized, newest lands last', async () => {
    await seedQueue(['old']);
    holds.set('old', deferred());
    const pass = supabaseService.processOfflineQueue();
    await flush();
    expect(events).toEqual(['start:old']);

    jest.setSystemTime(T0 + 5_000);
    const save = supabaseService.saveBackup('new', 'c-new', 1);
    await flush();
    // The direct save waits its turn: no start:new while old is still in flight.
    expect(events).toEqual(['start:old']);

    holds.get('old')!.release();
    await pass;
    expect(await save).toBe(true);

    expect(events).toEqual(['start:old', 'end:old', 'start:new', 'end:new']);
    expect(mockMemoryStore.get(LAST_SYNC_KEY)).toBe(iso(T0 + 5_000));
  });

  it('case 3b: a direct save in flight while the pass starts — the replay waits, then is superseded', async () => {
    await seedQueue(['old']);
    jest.setSystemTime(T0 + 5_000);
    holds.set('new', deferred());
    const save = supabaseService.saveBackup('new', 'c-new', 1);
    await flush();
    const pass = supabaseService.processOfflineQueue();
    await flush();
    expect(events).toEqual(['start:new']);

    holds.get('new')!.release();
    expect(await save).toBe(true);
    await pass;
    await settle();

    expect(upsertedPayloads()).toEqual(['new']);
    expect(internals.offlineQueue).toEqual([]);
  });

  it('case 4: [op0 fails, op1 ok] — the NEXT pass does not upsert op0', async () => {
    internals.config.circuitBreaker.threshold = 100;
    failing = (p) => p === 'op0';
    await seedQueue(['op0', 'op1']);

    await runPass();
    expect(internals.offlineQueue.map((op) => op.data.encryptedData)).toEqual(['op0']);

    failing = () => false;
    main.upsert.mockClear();
    await runPass();

    expect(upsertedPayloads()).toEqual([]);
    expect(internals.offlineQueue).toEqual([]);
  });

  it('case 5: [op0 ok, op1 fails] — the next pass DOES upsert op1 (LAST_SYNC is op0\'s snapshot, not its completion)', async () => {
    internals.config.circuitBreaker.threshold = 100;
    failing = (p) => p === 'op1';
    const ops = await seedQueue(['op0', 'op1']);
    // The pass runs long after both snapshots: a completion-time watermark would sit
    // past op1's timestamp and wrongly supersede it.
    jest.setSystemTime(T0 + 60_000);

    await runPass();
    expect(mockMemoryStore.get(LAST_SYNC_KEY)).toBe(iso(ops[0].timestamp));
    expect(internals.offlineQueue.map((op) => op.data.encryptedData)).toEqual(['op1']);

    failing = () => false;
    main.upsert.mockClear();
    jest.setSystemTime(T0 + 120_000);
    await runPass();

    expect(upsertedPayloads()).toEqual(['op1']);
    expect(internals.offlineQueue).toEqual([]);
  });

  it('an op whose timestamp EQUALS LAST_SYNC is not stale', async () => {
    await seedQueue(['op0']);
    mockMemoryStore.set(LAST_SYNC_KEY, iso(internals.offlineQueue[0].timestamp));

    await runPass();

    expect(upsertedPayloads()).toEqual(['op0']);
  });
});

describe('the watermark is never an obstacle to a legitimate upload (case 6)', () => {
  it('LAST_SYNC in the future: a DIRECT backup still uploads', async () => {
    internals.isInitialized = true;
    goOnline();
    mockMemoryStore.set(LAST_SYNC_KEY, iso(Date.now() + 86_400_000));

    expect(await supabaseService.saveBackup('direct', 'c', 1)).toBe(true);
    expect(upsertedPayloads()).toEqual(['direct']);
  });

  it.each([
    ['corrupt', 'not-a-date'],
    ['missing', null],
  ])('%s LAST_SYNC: a replay proceeds (fails open)', async (_label, value) => {
    await seedQueue(['op0']);
    if (value !== null) mockMemoryStore.set(LAST_SYNC_KEY, value);
    else mockMemoryStore.delete(LAST_SYNC_KEY);

    await runPass();

    expect(upsertedPayloads()).toEqual(['op0']);
    expect(internals.offlineQueue).toEqual([]);
  });
});

describe('the pass is a single flight (D, case 7)', () => {
  it('two concurrent processOfflineQueue calls upsert each op once and both resolve', async () => {
    await seedQueue(['a', 'b']);
    const pass = jest.spyOn(internals, 'runOfflineQueuePass');

    const first = supabaseService.processOfflineQueue();
    const second = supabaseService.processOfflineQueue();
    await Promise.all([first, second]);
    await settle();

    expect(pass).toHaveBeenCalledTimes(1);
    expect(upsertedPayloads()).toEqual(['a', 'b']);
    expect(internals.offlineQueue).toEqual([]);
    expect(queueWrites()).toHaveLength(1);
  });

  it('two AppState "active" events in a row upsert each op once', async () => {
    await seedQueue(['a', 'b']);
    const onActive = serviceActiveHandler();

    onActive('active');
    onActive('active');
    await settle();

    expect(upsertedPayloads()).toEqual(['a', 'b']);
    expect(queueWrites()).toHaveLength(1);
  });

  it('a rejected pass clears the handle — the next call starts a fresh pass', async () => {
    await seedQueue(['a']);
    const pass = jest.spyOn(internals, 'runOfflineQueuePass').mockRejectedValueOnce(new Error('pass blew up'));

    await expect(supabaseService.processOfflineQueue()).rejects.toThrow('pass blew up');
    await runPass();

    expect(pass).toHaveBeenCalledTimes(2);
    expect(upsertedPayloads()).toEqual(['a']);
  });

  it('a "hold" pass (consent still loading) does not latch the handle', async () => {
    await seedQueue(['a']);
    useConsentStore.setState({ consentStatus: 'loading' as never });
    await supabaseService.processOfflineQueue();
    expect(main.upsert).not.toHaveBeenCalled();

    useConsentStore.setState({ consentStatus: 'valid' as never });
    await runPass();

    expect(upsertedPayloads()).toEqual(['a']);
  });

  it('a "drop" pass (consent withdrawn) does not latch the handle', async () => {
    await seedQueue(['a']);
    useConsentStore.setState({
      consentCache: { ...useConsentStore.getState().consentCache, canSyncToCloud: false },
    });
    await supabaseService.processOfflineQueue();
    expect(internals.offlineQueue).toEqual([]);

    useConsentStore.setState({
      consentCache: { ...useConsentStore.getState().consentCache, canSyncToCloud: true },
    });
    await seedQueue(['b']);
    await runPass();

    expect(upsertedPayloads()).toEqual(['b']);
  });
});

describe('case 8: a non-saveBackup op still takes the default branch', () => {
  it('an unknown operation is removed, not uploaded, with ONE queue write', async () => {
    internals.isInitialized = true;
    goOnline();
    internals.offlineQueue = [{ operation: 'test', data: { encryptedData: 'x' }, timestamp: 1 }];

    await runPass();

    expect(main.upsert).not.toHaveBeenCalled();
    expect(internals.offlineQueue).toEqual([]);
    expect(queueWrites()).toHaveLength(1);
  });
});

describe('the AppState handler never waits on the pass (cases 9, 10)', () => {
  const crisisEvent = (n: number) => ({
    event_type: 'crisis_detected',
    properties: {
      trigger_type: 'phq9_suicidal_ideation',
      severity_bucket: 'critical',
      intervention_surfaced: true,
      assessment_type: 'PHQ-9',
    },
    session_id: 'session-d791',
    enqueued_at: T0 + n,
  });

  it('case 9: with a pass blocked in the lane, the crisis insert still happens exactly once per "active" event', async () => {
    await seedQueue(['a']);
    // A direct save holds the lane; the pass's replay is queued behind it.
    holds.set('held', deferred());
    const held = supabaseService.saveBackup('held', 'c', 1);
    await flush();
    const onActive = serviceActiveHandler();

    internals.crisisAnalyticsQueue = [crisisEvent(1)];
    onActive('active');
    await flush();
    expect(main.insert).toHaveBeenCalledTimes(1);

    internals.crisisAnalyticsQueue = [crisisEvent(2)];
    onActive('active');
    await flush();
    expect(main.insert).toHaveBeenCalledTimes(2);
    expect(events).toEqual(['start:held']); // the lane is still held

    holds.get('held')!.release();
    await held;
    await settle();
  });

  it('case 10: a pass that throws synchronously does not stop flushCrisisAnalytics', async () => {
    await seedQueue(['a']);
    internals.crisisAnalyticsQueue = [crisisEvent(1)];
    jest.spyOn(internals, 'runOfflineQueuePass').mockImplementation(() => {
      throw new Error('sync throw');
    });
    const onActive = serviceActiveHandler();

    expect(() => onActive('active')).not.toThrow();
    await settle();

    expect(main.insert).toHaveBeenCalledTimes(1);
  });
});

describe('case 11: queueOfflineOperation cannot reject unhandled (F)', () => {
  it('a rejected queue write is caught and logged by count only — never the payload', async () => {
    jest.useRealTimers();
    const SECRET = 'SECRET_CIPHERTEXT_d791';
    const CHECKSUM = 'SECRET_CHECKSUM_d791';
    const unhandled = jest.fn();
    process.on('unhandledRejection', unhandled);
    setItem.mockImplementationOnce(async () => {
      throw new Error('disk full');
    });
    internals.isInitialized = true;
    internals.client = null;

    try {
      await supabaseService.saveBackup(SECRET, CHECKSUM, 1);
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(unhandled).not.toHaveBeenCalled();
      expect(JSON.stringify(mockLogSecurity.mock.calls)).not.toContain(SECRET);
      expect(JSON.stringify(mockLogSecurity.mock.calls)).not.toContain(CHECKSUM);
      const failureLog = mockLogSecurity.mock.calls.find(([msg]) => /queue.*persist|persist.*queue/i.test(String(msg)));
      expect(failureLog).toBeDefined();
      expect(failureLog?.[1]).toBe('low');
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });
});

describe('case 12: erasure and bound-identity guards (E)', () => {
  it('(b) a pass in flight when erasure fires uploads nothing more and writes no queue', async () => {
    await seedQueue(['a', 'b', 'c']);
    holds.set('a', deferred());
    const pass = supabaseService.processOfflineQueue();
    await flush();
    expect(events).toEqual(['start:a']);

    supabaseService.resetOfflineQueueForErasure();
    setItem.mockClear();
    holds.get('a')!.release();
    await pass;
    await settle();

    expect(upsertedPayloads()).toEqual(['a']);
    expect(internals.offlineQueue).toEqual([]);
    expect(queueWrites()).toHaveLength(0);
  });

  it('(b) control: the same pass with no erasure uploads every op', async () => {
    await seedQueue(['a', 'b', 'c']);
    holds.set('a', deferred());
    const pass = supabaseService.processOfflineQueue();
    await flush();
    holds.get('a')!.release();
    await pass;
    await settle();

    expect(upsertedPayloads()).toEqual(['a', 'b', 'c']);
  });

  it('(b) an op removed from the live queue mid-pass (requestBackupDeletion\'s filter) is skipped', async () => {
    await seedQueue(['a', 'b']);
    holds.set('a', deferred());
    const pass = supabaseService.processOfflineQueue();
    await flush();

    internals.offlineQueue = internals.offlineQueue.filter((op) => op.operation !== 'saveBackup');
    holds.get('a')!.release();
    await pass;
    await settle();

    expect(upsertedPayloads()).toEqual(['a']);
    expect(internals.offlineQueue).toEqual([]);
  });

  it('(a) a retry after erasure never uploads under the identity minted after teardown', async () => {
    internals.isInitialized = true;
    goOnline('user-old');
    const fresh = makeClient('fresh');
    let calls = 0;
    main.upsert.mockImplementation(async (row: Row) => {
      events.push(`start:${row.encrypted_data}`);
      calls += 1;
      return calls === 1 ? { data: null, error: { message: 'transient' } } : { data: null, error: null };
    });

    const save = supabaseService.saveBackup('pre-erasure', 'c', 1);
    await flush(); // attempt 1 failed; the retry is sleeping
    expect(main.upsert).toHaveBeenCalledTimes(1);

    // Erasure lands inside the retry-sleep window, then a new anonymous identity is minted.
    supabaseService.resetOfflineQueueForErasure();
    goOnline('user-new', fresh);
    await settle();
    await save;

    expect(fresh.upsert).not.toHaveBeenCalled();
    expect(main.upsert).toHaveBeenCalledTimes(1);
    expect(internals.offlineQueue).toEqual([]);
  });

  it('(a) control: the same transient failure with no erasure is retried and uploads', async () => {
    internals.isInitialized = true;
    goOnline('user-old');
    let calls = 0;
    main.upsert.mockImplementation(async (row: Row) => {
      calls += 1;
      return calls === 1
        ? { data: null, error: { message: 'transient' } }
        : { data: null, error: null, row };
    });

    const save = supabaseService.saveBackup('pre-erasure', 'c', 1);
    await settle();

    expect(await save).toBe(true);
    expect(main.upsert).toHaveBeenCalledTimes(2);
  });

  it('(a) an upload queued behind the lane uses the uid bound at attempt start, not one swapped in meanwhile', async () => {
    internals.isInitialized = true;
    goOnline('user-old');
    const fresh = makeClient('fresh');
    holds.set('first', deferred());
    const first = supabaseService.saveBackup('first', 'c1', 1);
    await flush();
    const second = supabaseService.saveBackup('second', 'c2', 1); // waits in the lane
    await flush();

    goOnline('user-new', fresh); // identity swapped while `second` is queued
    holds.get('first')!.release();
    await first;
    await settle();

    expect(await second).toBe(false);
    expect(fresh.upsert).not.toHaveBeenCalled();
    expect(upsertedPayloads()).toEqual(['first']);
  });

  it('(a) control: with the identity unchanged, the queued second upload goes out under the same uid', async () => {
    internals.isInitialized = true;
    goOnline('user-old');
    holds.set('first', deferred());
    const first = supabaseService.saveBackup('first', 'c1', 1);
    await flush();
    const second = supabaseService.saveBackup('second', 'c2', 1);
    await flush();
    holds.get('first')!.release();
    await first;

    expect(await second).toBe(true);
    expect(main.upsert.mock.calls.map(([row]) => row.user_id)).toEqual(['user-old', 'user-old']);
  });

  it('(c) no upload while deleteAccount() is in flight; the backup is not lost', async () => {
    internals.isInitialized = true;
    goOnline();
    internals.deletionsInFlight = 1;

    expect(await supabaseService.saveBackup('during-delete', 'c', 1)).toBe(false);
    expect(main.upsert).not.toHaveBeenCalled();
    expect(internals.offlineQueue).toHaveLength(1);

    internals.deletionsInFlight = 0;
    expect(await supabaseService.saveBackup('after', 'c', 1)).toBe(true);
    expect(upsertedPayloads()).toEqual(['after']);
  });
});
