/**
 * INFRA-568 — session_id rotation on the crisis telemetry sink — UNIT
 *
 * WHAT THIS PINS
 * ==============
 * `session_id` is written on every `analytics_events` row, including the
 * vital-interest `crisis_detected` event. It was minted ONCE per process in the
 * `SupabaseService` constructor with a UTC date baked in — so a process alive
 * across midnight wrote rows whose session date disagreed with their own
 * `created_at`, and a long-lived process produced one "session" spanning days.
 * The schema comment claimed a daily rotation that never happened.
 *
 * WHY THE PREDICATE LIVES IN SupabaseService.ts AND NOT core/utils/id.ts
 * =====================================================================
 * `crisis` ruling (INFRA-568): `id.ts` also exports `generateComponentId`,
 * `generateUUID` and `generateTimestampedId` — shared UI primitives. Putting a
 * crisis-path predicate there would drag the whole file onto a Protected Path and
 * charge a sim build to every UI-id edit, which is the over-trigger that trains
 * the `--skip-e2e` reflex. `generateSessionId()` is therefore left byte-identical,
 * preserving its already-verified conformance to the live CHECK constraint.
 *
 * THE FORMAT IS THE HIGH-SEVERITY SURFACE, NOT THE DATE
 * ====================================================
 * `flushCrisisAnalytics` inserts the batch as ONE multi-row `insert(rows)`. A
 * single malformed `session_id` aborts the whole statement with 23514, the queue
 * is RETAINED, and every later flush re-sends the same poisoned batch — and it is
 * called with `bypassCircuitBreaker: true`, so nothing ever opens to stop the
 * loop. The sink would stall permanently and silently. Hence: validate before
 * assigning, and never return a non-conforming string.
 *
 * ROTATION IS ASSERTED VIA THE DATE COMPONENT OR A MINT SPY — NEVER VIA SUFFIX
 * INEQUALITY. Under `JEST_QUICK=true` (`__tests__/setup/quick-setup.js`)
 * `getRandomBytes` returns constant bytes, so every mint is the identical string
 * and a suffix-inequality assertion silently cannot fail.
 */
import { jest } from '@jest/globals';

// Explicit factory rather than the auto-mock: this suite calls jest.resetModules()
// to swap expo-crypto per-test, after which the auto-mock's `default` is undefined
// and cannot be spied on. The factory closes over a test-scope fn, so the SAME spy
// survives every module-registry reset.
const mockSetItem = jest.fn(async () => undefined);
const mockGetItem = jest.fn(async () => null);
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { setItem: mockSetItem, getItem: mockGetItem, removeItem: jest.fn(), multiRemove: jest.fn() },
  setItem: mockSetItem,
  getItem: mockGetItem,
}));
jest.mock('@/core/services/security/pinned-fetch', () => ({
  validatePinningConfiguration: () => ({ valid: true, errors: [] }),
  createSupabasePinnedFetch: () => async () => new Response('[]', { status: 200 }),
}));

import {
  SESSION_ID_IDLE_MS,
  isSessionIdStale,
  sessionIdDate,
  utcDateString,
} from '../SupabaseService';

/** The exact live constraint, not a looser copy. */
const CHECK = /^session_[0-9]{4}-[0-9]{2}-[0-9]{2}_[a-z0-9]+$/;

describe('INFRA-568 · session_id rotation predicate', () => {
  describe('utcDateString — UTC, never device-local', () => {
    it('formats as YYYY-MM-DD', () => {
      expect(utcDateString(Date.UTC(2026, 8, 4, 12, 0, 0))).toBe('2026-09-04');
    });

    it('uses the UTC day, not the local one', () => {
      // created_at is TIMESTAMPTZ and both operator views group on
      // DATE_TRUNC('day', created_at) in UTC. A local-date prefix would recreate
      // the very disagreement rotation exists to remove, for every user west of
      // UTC — and would pass on UTC CI while failing on a developer's machine.
      expect(utcDateString(Date.UTC(2026, 8, 4, 23, 30, 0))).toBe('2026-09-04');
      expect(utcDateString(Date.UTC(2026, 8, 5, 0, 30, 0))).toBe('2026-09-05');
    });

    it('zero-pads so the CHECK regex still matches', () => {
      expect(utcDateString(Date.UTC(2026, 0, 1))).toBe('2026-01-01');
    });
  });

  describe('sessionIdDate — parse, never coerce', () => {
    it('extracts the date component of a well-formed id', () => {
      expect(sessionIdDate('session_2026-09-04_abc123def')).toBe('2026-09-04');
    });

    it('returns null for a malformed id rather than salvaging it', () => {
      // Coercing a near-miss into something date-shaped would let it survive to
      // the insert, where the CHECK rejects it and poisons the batch.
      expect(sessionIdDate('session_2026-9-4_abc')).toBeNull();
      expect(sessionIdDate('session_2026-09-04_ABC')).toBeNull();
      expect(sessionIdDate('run_2026-09-04_abc123def')).toBeNull();
      expect(sessionIdDate('session_2026-09-04_')).toBeNull(); // `+`, not `*`
      expect(sessionIdDate('')).toBeNull();
    });
  });

  describe('isSessionIdStale — the UTC date clause', () => {
    const now = Date.UTC(2026, 8, 5, 0, 30, 0);

    it('is stale when the embedded date is yesterday', () => {
      expect(isSessionIdStale('session_2026-09-04_abc123def', now - 60_000, now)).toBe(true);
    });

    it('is NOT stale on the same UTC day with a short gap', () => {
      expect(isSessionIdStale('session_2026-09-05_abc123def', now - 60_000, now)).toBe(false);
    });

    it('is stale on a malformed id, so a bad value can never be written', () => {
      expect(isSessionIdStale('not-a-session-id', now, now)).toBe(true);
    });

    it('is stale on a future-dated id — a backwards clock still rotates', () => {
      expect(isSessionIdStale('session_2026-09-06_abc123def', now, now)).toBe(true);
    });
  });

  describe('isSessionIdStale — the idle clause', () => {
    const now = Date.UTC(2026, 8, 4, 12, 0, 0);
    const today = 'session_2026-09-04_abc123def';

    it('rotates strictly AFTER the threshold, not at it', () => {
      expect(isSessionIdStale(today, now - SESSION_ID_IDLE_MS - 1, now)).toBe(true);
      expect(isSessionIdStale(today, now - SESSION_ID_IDLE_MS, now)).toBe(false);
    });

    it('uses the 30-minute boundary INFRA-542 already established', () => {
      // SINCE_LAST_ACTIVE_BUCKETS splits at 5m_30m / 30m_24h, so the product
      // already treats a >30m gap as a different visit. Not GA folklore.
      expect(SESSION_ID_IDLE_MS).toBe(30 * 60 * 1000);
    });

    it('does not rotate at 29 minutes, does at 31', () => {
      expect(isSessionIdStale(today, now - 29 * 60 * 1000, now)).toBe(false);
      expect(isSessionIdStale(today, now - 31 * 60 * 1000, now)).toBe(true);
    });
  });

  describe('the two clauses are independent', () => {
    it('date-stale fires even when the gap is one millisecond', () => {
      const now = Date.UTC(2026, 8, 5, 0, 0, 1);
      expect(isSessionIdStale('session_2026-09-04_abc123def', now - 1, now)).toBe(true);
    });

    it('idle-stale fires even when the date matches', () => {
      const now = Date.UTC(2026, 8, 4, 23, 0, 0);
      expect(isSessionIdStale('session_2026-09-04_abc123def', now - 12 * 3600_000, now)).toBe(true);
    });

    it('a freshly minted id is not immediately stale', () => {
      const now = Date.UTC(2026, 8, 4, 9, 0, 0);
      expect(isSessionIdStale('session_2026-09-04_abc123def', now, now)).toBe(false);
    });
  });
});

describe('INFRA-568 · rotation cannot lose or poison a crisis event', () => {
  const realNow = Date.now;
  afterEach(() => {
    Date.now = realNow;
    jest.resetModules();
  });

  it('enqueues and durably persists the crisis event even when the mint THROWS', async () => {
    // The failure this guards: `crisisAnalyticsQueue.push({...})` is the FIRST
    // statement inside trackCrisisDetection's try, and that catch is a DROP
    // (its body is only logSecurity). A throw while evaluating the `session_id:`
    // expression means the event is never enqueued, never persisted, never
    // flushed — total silent loss on the sole vital-interest crisis audit sink,
    // which is strictly worse than the stale date this item exists to fix.
    jest.resetModules();
    jest.doMock('expo-crypto', () => ({
      getRandomBytes: () => {
        throw new Error('crypto unavailable');
      },
      digestStringAsync: async () => 'deadbeef',
      CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    }));
    mockSetItem.mockClear();

    const { supabaseService } = await import('../SupabaseService');
    // Force the stale branch so the mint is actually attempted.
    Date.now = () => realNow() + 10 * 24 * 3600_000;

    await supabaseService.trackCrisisDetection({
      trigger_type: 'phq9_suicidal_ideation',
      severity_bucket: 'critical',
      intervention_surfaced: true,
      assessment_type: 'PHQ-9',
    } as never);

    const queue = (supabaseService as unknown as { crisisAnalyticsQueue: Array<{ session_id: string }> })
      .crisisAnalyticsQueue;
    expect(queue.length).toBeGreaterThan(0);
    const written = queue[queue.length - 1]!.session_id;
    // Not a looser regex copied from crypto-id-generation.test.ts — the exact
    // constraint, because a 23514 on one row aborts the whole insert batch.
    expect(written).toMatch(CHECK);
    // The durable persist must still have been attempted — losing the event is the
    // failure mode this test exists to exclude, and the queue alone does not survive a kill.
    expect(mockSetItem).toHaveBeenCalled();
  });
});
