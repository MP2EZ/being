/**
 * DEBUG-413 — the pre-fix crisis backlog is SUPPRESSED at load, not flushed — UNIT
 *
 * THE DEFECT. `flushCrisisAnalytics` projects each queued row as
 * `{user_id, event_type, properties, session_id}`. `enqueued_at` IS captured at enqueue
 * time and IS dropped at flush time, and `analytics_events.created_at` defaults to
 * `NOW()`. Separately, DEBUG-409 gave shipped devices a working Supabase client, and
 * `loadCrisisAnalyticsQueue()` adopts the persisted queue unconditionally — so months of
 * accumulated crisis events flush whether or not anyone decides they should, every one of
 * them stamped with today's date.
 *
 * Consequences, none of them hypothetical:
 *   • `crisis_detection_daily` shows a false spike.
 *   • The INFRA-219 alerter fires. Its spike rule is
 *     `todayCount >= CRISIS_ALERT_SPIKE_MIN (5)` AND `todayCount >= baselineMean * 3`;
 *     with a ~zero baseline the multiplier term is 0, so the floor of 5 is the SOLE gate
 *     and any single UTC day landing 5+ rows pages the founder.
 *   • The 3-year retention carve-out anchors from the wrong date.
 *
 * THE DECISION (founder, at the `/b-batch` Step 2.3 round): SUPPRESS, not re-timestamp.
 * "Do nothing" was explicitly not an option, because doing nothing IS the false-spike
 * behaviour. Re-timestamping is the better long-term endpoint — an `event_time` column is
 * what this table should have had — but it is live-project DDL in the same risk class
 * INFRA-379 is parked over, with no down-migration, an irreversible deploy ordering, a
 * payload widening that trips `lia-crisis-telemetry.md`'s own review clause, and a SECOND
 * false-positive path nobody had noticed (old-dated rows flip `crisis_detection_liveness`
 * from `unproven` to `stale`, which pages at >=48h). Suppression has zero Supabase surface.
 *
 * WHY SUPPRESSION IS IMPLEMENTABLE AT ALL — this was the open question. `git log -S
 * enqueued_at` bottoms out at 7de7b097 (INFRA-214, 2026-06-03), the SAME commit that
 * introduced `trackCrisisDetection`. So no build ever wrote a crisis row without the
 * field, and no persisted row can be un-datable. Corroborated on the read path: the
 * DEBUG-335 dedupe identity already keys on `e?.enqueued_at`.
 *
 * WHY THE GUARANTEE IS STRUCTURAL RATHER THAN CONDITIONAL. Suppressed rows never reach
 * `analytics_events`, so the alerter sees the same zero it sees now on BOTH axes — the
 * spike floor and the liveness check. Nothing in Supabase changes, so nothing can be
 * mis-ordered or half-deployed. That is the property this file pins.
 *
 * WHAT IS DELIBERATELY NOT FIXED HERE. The underlying `NOW()` defect survives for future
 * late flushes: a post-fix device offline for three weeks still stamps three-week-old
 * crises with today's date. Closing that needs a relative staleness rule, which would
 * permanently discard legitimately-late vital-interest events and contradict the
 * never-drop invariant the whole enqueue design rests on. Bounded, recorded, and filed
 * rather than silently absorbed.
 */
import { jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage');

import AsyncStorage from '@react-native-async-storage/async-storage';
import supabaseService from '@/core/services/supabase/SupabaseService';
import { PRE_FIX_CRISIS_BACKLOG_CUTOFF_MS } from '@/core/services/supabase/SupabaseService';

const payload = {
  trigger_type: 'phq9_suicidal_ideation',
  severity_bucket: 'critical',
  intervention_surfaced: true,
  assessment_type: 'PHQ-9',
};

const row = (enqueued_at: number, session_id = 's1') => ({
  event_type: 'crisis_detected',
  properties: payload,
  session_id,
  enqueued_at,
});

/** A day before the cutoff — a genuine pre-fix backlog entry. */
const PRE = PRE_FIX_CRISIS_BACKLOG_CUTOFF_MS - 86_400_000;
/** A day after — enqueued by a build that carries the fix. */
const POST = PRE_FIX_CRISIS_BACKLOG_CUTOFF_MS + 86_400_000;

describe('DEBUG-413 — pre-fix crisis backlog suppression', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    service = new (supabaseService as any).constructor();
  });

  const seed = (rows: any[]) =>
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(rows));

  describe('the cutoff itself', () => {
    test('is an ABSOLUTE instant, not a relative age', () => {
      // The semantic wanted is "enqueued by a build that predates the fix", which is a
      // fixed point in time. A relative rule (drop anything older than N days) would keep
      // discarding legitimately-late vital-interest events forever — a different and much
      // larger decision than the one that was made.
      expect(typeof PRE_FIX_CRISIS_BACKLOG_CUTOFF_MS).toBe('number');
      expect(Number.isFinite(PRE_FIX_CRISIS_BACKLOG_CUTOFF_MS)).toBe(true);
      // Sits after INFRA-214 (2026-06-03) introduced enqueued_at — before that there is
      // nothing to suppress — and is not in the future.
      expect(PRE_FIX_CRISIS_BACKLOG_CUTOFF_MS).toBeGreaterThan(Date.UTC(2026, 5, 3));
      expect(PRE_FIX_CRISIS_BACKLOG_CUTOFF_MS).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('adoption on a normal boot (nothing in memory)', () => {
    test('drops pre-cutoff rows and adopts post-cutoff ones', async () => {
      seed([row(PRE, 'old-1'), row(POST, 'new-1'), row(PRE, 'old-2')]);
      await service.loadCrisisAnalyticsQueue();
      expect(service.crisisAnalyticsQueue).toHaveLength(1);
      expect(service.crisisAnalyticsQueue[0].session_id).toBe('new-1');
    });

    test('an all-pre-fix backlog is emptied entirely', async () => {
      seed([row(PRE, 'a'), row(PRE, 'b'), row(PRE, 'c')]);
      await service.loadCrisisAnalyticsQueue();
      expect(service.crisisAnalyticsQueue).toHaveLength(0);
    });

    test('an all-post-fix queue is adopted untouched — the common case must not regress', async () => {
      // The suppression is one-shot and must be invisible to every device that never
      // held a pre-fix backlog, which after the first boot is all of them.
      seed([row(POST, 'a'), row(POST, 'b')]);
      await service.loadCrisisAnalyticsQueue();
      expect(service.crisisAnalyticsQueue).toHaveLength(2);
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    test('a row exactly AT the cutoff is kept, not dropped', async () => {
      // The boundary belongs to the fix. Dropping it would discard an event a fixed
      // build could have enqueued in the same millisecond the cutoff names.
      seed([row(PRE_FIX_CRISIS_BACKLOG_CUTOFF_MS, 'boundary')]);
      await service.loadCrisisAnalyticsQueue();
      expect(service.crisisAnalyticsQueue).toHaveLength(1);
    });
  });

  describe('durability — the drop is one-shot, not re-evaluated every boot', () => {
    test('persists immediately after suppressing', async () => {
      seed([row(PRE, 'old'), row(POST, 'new')]);
      await service.loadCrisisAnalyticsQueue();
      await new Promise((r) => setTimeout(r, 0));
      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const written = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1] as string);
      expect(written).toHaveLength(1);
      expect(written[0].session_id).toBe('new');
    });

    test('persists even when suppression empties the queue completely', async () => {
      // The branch that returns early on an empty adoption must still write, or the
      // backlog is re-read and re-suppressed on every single boot forever.
      seed([row(PRE, 'a'), row(PRE, 'b')]);
      await service.loadCrisisAnalyticsQueue();
      await new Promise((r) => setTimeout(r, 0));
      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const written = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1] as string);
      expect(written).toEqual([]);
    });
  });

  describe('the DEBUG-335 merge path (a detection fired before load)', () => {
    test('suppresses pre-fix disk rows without touching the live in-memory event', async () => {
      // initialize() is lazy, so a detection can fire BEFORE the load. That live event is
      // in memory and post-fix by construction; suppression must not reach it.
      service.crisisAnalyticsQueue = [row(POST, 'live')];
      seed([row(PRE, 'old'), row(POST, 'recovered')]);
      await service.loadCrisisAnalyticsQueue();
      const ids = service.crisisAnalyticsQueue.map((e: any) => e.session_id);
      expect(ids).toContain('live');
      expect(ids).toContain('recovered');
      expect(ids).not.toContain('old');
    });

    test('persists when the merge recovers nothing but suppression dropped rows', async () => {
      // recovered.length === 0 returns early. Without a write there, an all-pre-fix disk
      // backlog survives on disk next to a live in-memory event and is re-read forever.
      service.crisisAnalyticsQueue = [row(POST, 'live')];
      seed([row(PRE, 'old-1'), row(PRE, 'old-2')]);
      await service.loadCrisisAnalyticsQueue();
      await new Promise((r) => setTimeout(r, 0));
      expect(AsyncStorage.setItem).toHaveBeenCalled();
      expect(service.crisisAnalyticsQueue.map((e: any) => e.session_id)).toEqual(['live']);
    });
  });

  describe('defensive: rows that cannot be dated', () => {
    // Unreachable in practice — enqueued_at landed in the same commit as
    // trackCrisisDetection, so no build ever wrote a row without it. Treated as pre-fix
    // anyway: an undatable row cannot be shown to be post-fix, and the whole point is to
    // avoid stamping unknown-age events with today's date.
    test.each([
      ['missing', {}],
      ['null', { enqueued_at: null }],
      ['a string', { enqueued_at: 'yesterday' }],
      ['NaN', { enqueued_at: Number.NaN }],
    ])('%s enqueued_at is treated as pre-fix and dropped', async (_label, extra) => {
      seed([{ event_type: 'crisis_detected', properties: payload, session_id: 'x', ...extra }]);
      await service.loadCrisisAnalyticsQueue();
      expect(service.crisisAnalyticsQueue).toHaveLength(0);
    });
  });

  describe('the flush projection is unchanged (AC4 — no payload widening)', () => {
    test('suppression adds no transmitted field', async () => {
      // Re-timestamping would have added a fifth field, which
      // docs/legal/lia-crisis-telemetry.md commits to re-reviewing. Suppression is a
      // client-side drop and must leave the wire format byte-identical, so no compliance
      // pass is owed. Read the mapper's source rather than the shape of one call, so a
      // future field addition is caught even if no test exercises that row.
      const src = require('fs').readFileSync(
        require('path').resolve(__dirname, '../SupabaseService.ts'),
        'utf8'
      );
      // The projection block in flushCrisisAnalytics.
      const mapper = src.slice(src.indexOf('const pending = ['), src.indexOf('const pending = [') + 900);
      expect(mapper).toMatch(/user_id/);
      expect(mapper).toMatch(/event_type/);
      expect(mapper).toMatch(/session_id/);
      // The two things a re-timestamp would have introduced.
      expect(mapper).not.toMatch(/event_time/);
      expect(mapper).not.toMatch(/enqueued_at\s*:/);
      // Matcher liveness: prove the slice is real and the negative assertions can fire.
      expect(mapper.length).toBeGreaterThan(100);
      expect('event_time: x').toMatch(/event_time/);
    });
  });
});
