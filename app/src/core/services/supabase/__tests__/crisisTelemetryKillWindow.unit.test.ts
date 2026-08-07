/**
 * Crisis-detection telemetry — durability across an app kill (DEBUG-335) — UNIT
 *
 * Since DEBUG-305 removed the local `crisis_intervention_*` record,
 * `@being/supabase/crisis_analytics_queue` is the SOLE crisis audit sink. A lost event
 * is a silent, unrecoverable gap in the only crisis audit trail.
 *
 * DEBUG-335 closes three loss paths on that one key:
 *   1. the enqueue write was fire-and-forget (`void AsyncStorage.setItem`), so a
 *      rejected write was swallowed and never retried;
 *   2. the enqueue write and the post-flush truncation write were unserialized, so a
 *      later-settling stale snapshot could clobber a newer one;
 *   3. `loadCrisisAnalyticsQueue` blind-assigned over the in-memory queue, and
 *      `initialize()` is lazy — a detection can fire before it runs.
 *
 * WHY THE HARNESS LOOKS LIKE THIS. The AC explicitly rejects "it was called"
 * assertions, and for good reason: `expect(AsyncStorage.setItem).toHaveBeenCalledWith(...)`
 * passes against the *buggy* code, which is how the defect shipped. So this file uses a
 * write-behind AsyncStorage fake where a write is only durable once the test commits it.
 * "Kill the app" = drop everything in flight WITHOUT committing. "Restart" = build a
 * fresh service and read the surviving disk back. Durability is defined as
 * recoverability, never as the write having been issued.
 *
 * Do NOT drain with a bare `await flushPromises()` before reading disk — that models a
 * graceful shutdown, and the pre-fix code passes it.
 */
import { jest } from '@jest/globals';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn(() => ({})) }));

jest.mock('@react-native-async-storage/async-storage', () => {
  const disk = new Map<string, string>();
  let inFlight: Array<{ commit: () => void; settle: () => void }> = [];
  let failNext = false;

  const api = {
    getItem: jest.fn((k: string) => Promise.resolve(disk.has(k) ? disk.get(k)! : null)),
    setItem: jest.fn((k: string, v: string) => {
      const p = new Promise<void>((resolve, reject) => {
        const shouldFail = failNext;
        failNext = false;
        inFlight.push({
          commit: () => {
            if (!shouldFail) disk.set(k, v);
          },
          settle: () => (shouldFail ? reject(new Error('simulated write failure')) : resolve()),
        });
      });
      // The PRE-FIX code does `void AsyncStorage.setItem(...)`, so a rejection has no
      // handler and Node 22 aborts the jest worker. Mark it handled here so the red run
      // REPORTS instead of crashing; callers can still attach their own handlers to `p`.
      p.catch(() => {});
      return p;
    }),
    removeItem: jest.fn((k: string) => {
      disk.delete(k);
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => Promise.resolve([...disk.keys()])),
    multiRemove: jest.fn(() => Promise.resolve()),

    // Control handles live ON the api object, not merely on the module namespace:
    // SupabaseService imports the DEFAULT export, so the test drives the same object
    // the code under test writes through.
    __disk: disk,
    /**
     * Commit + settle every in-flight write, looping so chained writes — and writes
     * issued a microtask later by an awaiting caller — also drain. Stops only after
     * two consecutive empty rounds, since `flushCrisisAnalytics` awaits its own write
     * and cannot issue the next one until this settles the previous.
     */
    __settleWrites: async (reverse = false) => {
      let emptyRounds = 0;
      for (let guard = 0; guard < 50 && emptyRounds < 2; guard += 1) {
        if (inFlight.length === 0) {
          emptyRounds += 1;
        } else {
          emptyRounds = 0;
          const batch = reverse ? [...inFlight].reverse() : [...inFlight];
          inFlight = [];
          batch.forEach((w) => {
            w.commit();
            w.settle();
          });
        }
        // Let awaiting callers resume and schedule their next write.
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      }
    },
    __failNextWrite: () => {
      failNext = true;
    },
    /** The process dies: nothing in flight ever reaches disk. */
    __killApp: () => {
      inFlight = [];
    },
    __inFlightCount: () => inFlight.length,
    __seedDisk: (k: string, v: string) => disk.set(k, v),
    __reset: () => {
      disk.clear();
      inFlight = [];
      failNext = false;
    },
  };

  return { __esModule: true, default: api, ...api };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import supabaseService from '@/core/services/supabase/SupabaseService';

const storage = AsyncStorage as unknown as {
  __settleWrites: (reverse?: boolean) => Promise<void>;
  __failNextWrite: () => void;
  __killApp: () => void;
  __inFlightCount: () => number;
  __seedDisk: (k: string, v: string) => void;
  __reset: () => void;
  __disk: Map<string, string>;
};

const CRISIS_KEY = '@being/supabase/crisis_analytics_queue';

const payload = {
  trigger_type: 'phq9_suicidal_ideation',
  severity_bucket: 'critical',
  intervention_surfaced: true,
  assessment_type: 'PHQ-9',
};

const secondPayload = {
  trigger_type: 'gad7_severe',
  severity_bucket: 'severe',
  intervention_surfaced: true,
  assessment_type: 'GAD-7',
};

/** Build a fresh service — the "restart" half of a kill/restart cycle. */
const newService = (): any => new (supabaseService as any).constructor();

/** What actually survived on disk, as the next launch would read it. */
const readDisk = (): any[] => {
  const raw = storage.__disk.get(CRISIS_KEY);
  return raw ? JSON.parse(raw) : [];
};

describe('crisis telemetry durability across an app kill (DEBUG-335)', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    storage.__reset();
    service = newService();
  });

  it('recovers a FAILED persist so the event survives a later kill (loss path 1)', async () => {
    storage.__failNextWrite();

    // Caller does NOT await — mirrors assessmentStore.ts:811 exactly.
    service.trackCrisisDetection(payload);
    await storage.__settleWrites(); // the write rejects; nothing reaches disk

    expect(readDisk()).toHaveLength(0);

    // An ordinary later flush attempt is the retry opportunity.
    await service.flushCrisisAnalytics();
    await storage.__settleWrites();

    // Now the process dies. Anything still in flight is gone.
    storage.__killApp();

    const revived = newService();
    await revived.loadCrisisAnalyticsQueue();

    expect(revived.crisisAnalyticsQueue).toHaveLength(1);
    expect(revived.crisisAnalyticsQueue[0].properties.trigger_type).toBe(
      'phq9_suicidal_ideation'
    );
  });

  it('does not let an older write snapshot clobber a newer one (loss path 2)', async () => {
    // Two detections in quick succession, neither write settled yet.
    service.trackCrisisDetection(payload); // event A
    service.trackCrisisDetection(secondPayload); // event B

    // Settle NEWEST-FIRST. Pre-fix, both writes are issued immediately and are in
    // flight simultaneously with independent snapshots ("[A]" and "[A,B]"), so the
    // older "[A]" lands last and B is erased from the only crisis audit sink.
    // Serialized, only one write is ever in flight and each re-serializes the live
    // queue at write time, so settle order cannot change the outcome.
    await storage.__settleWrites(true);
    storage.__killApp();

    const revived = newService();
    await revived.loadCrisisAnalyticsQueue();

    const triggers = revived.crisisAnalyticsQueue.map((e: any) => e.properties.trigger_type);
    expect(triggers).toEqual(['phq9_suicidal_ideation', 'gad7_severe']);
  });

  it('never UNDER-counts an event enqueued during an in-flight flush (loss path 2b)', async () => {
    // `trackCrisisDetection` fires its own `void flushCrisisAnalytics()`, so enqueuing
    // during a flight starts a SECOND concurrent flush. That is re-entrant by design and
    // can insert an event twice — which is the correct trade for the sole audit sink:
    // over-count beats under-count. What must never happen is an event that is dropped
    // from the queue without ever having been inserted.
    const inserted: string[] = [];
    service.client = {
      from: jest.fn(() => ({
        insert: jest.fn((rows: any[]) => {
          rows.forEach((r) => inserted.push(r.properties.trigger_type));
          return Promise.resolve({ data: [{}], error: null });
        }),
      })),
    };
    service.userId = 'user_debug335';

    service.trackCrisisDetection(payload); // event A
    await storage.__settleWrites();

    const flushing = service.flushCrisisAnalytics();
    service.trackCrisisDetection(secondPayload); // event B, enqueued mid-flight

    // Settle BEFORE awaiting the flush: the flush awaits its own truncation write, and
    // the write-behind fake holds it open until the test commits it.
    await storage.__settleWrites(true);
    await flushing;
    await storage.__settleWrites(true);

    // Every enqueued event reached the server at least once — nothing silently dropped.
    expect(inserted).toContain('phq9_suicidal_ideation');
    expect(inserted).toContain('gad7_severe');

    // And what remains queued matches what survived on disk, so a kill here cannot
    // resurrect a flushed event nor lose an unflushed one.
    storage.__killApp();
    const revived = newService();
    await revived.loadCrisisAnalyticsQueue();
    expect(revived.crisisAnalyticsQueue).toEqual(service.crisisAnalyticsQueue);
  });

  it('does not clobber an in-memory event when the lazy startup load runs late (loss path 3)', async () => {
    // A prior session left an unflushed event on disk.
    storage.__seedDisk(
      CRISIS_KEY,
      JSON.stringify([
        {
          event_type: 'crisis_detected',
          properties: secondPayload,
          session_id: 'prior_session',
          enqueued_at: 1,
        },
      ])
    );

    // initialize() is lazy (it runs on Cloud Backup, not at boot), so a detection can
    // fire before loadCrisisAnalyticsQueue has run.
    const fresh = newService();
    fresh.trackCrisisDetection(payload);

    await fresh.loadCrisisAnalyticsQueue();
    await storage.__settleWrites();

    const triggers = fresh.crisisAnalyticsQueue.map((e: any) => e.properties.trigger_type);
    expect(triggers).toContain('phq9_suicidal_ideation'); // the live one must not vanish
    expect(triggers).toContain('gad7_severe'); // nor the one recovered from disk
    expect(fresh.crisisAnalyticsQueue).toHaveLength(2);
  });

  it('issues the durable write in the SAME synchronous step as the enqueue', () => {
    // Guards the <200ms crisis budget: the write must not slip behind a microtask.
    service.trackCrisisDetection(payload);

    // No `await` has run between the call and this assertion.
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(CRISIS_KEY, expect.any(String));
    expect(storage.__inFlightCount()).toBeGreaterThan(0);
  });

  it('stays a synchronous void call whose failed write never escapes into the crisis flow', async () => {
    // The `: void` signature is a SAFETY property, not a style choice: assessmentStore
    // wraps the call at :811 in a synchronous try/catch, and journalCrisisScan.ts:143
    // already writes `await SupabaseService.trackCrisisDetection(...)` — inert only
    // while this returns undefined. Making it async would arm that await silently.
    storage.__failNextWrite();

    expect(service.trackCrisisDetection(payload)).toBeUndefined();

    // The internal chain is the barrier. Capture it before settling — the identity
    // guard nulls the field once it resolves.
    const tail = service.crisisPersistTail;
    expect(typeof tail.then).toBe('function');

    await storage.__settleWrites();
    await expect(tail).resolves.toBeUndefined(); // a failed write must not reject out
    expect(service.crisisPersistDirty).toBe(true); // marked for retry, not lost

    // A synchronously-throwing setItem still cannot escape into the crisis flow.
    (AsyncStorage.setItem as jest.Mock).mockImplementationOnce(() => {
      throw new Error('disk full');
    });
    expect(() => service.trackCrisisDetection(payload)).not.toThrow();
  });
});
