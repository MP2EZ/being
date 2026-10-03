/**
 * alertLogic.ts behavioral tests (INFRA-219)
 *
 * The crisis-detection alerting decision logic is PURE, stateful, and
 * edge-case-heavy → CLAUDE.md forces test-first (TDD). These tests exercise the
 * three decision functions in isolation from the edge runtime (no network, no
 * Date.now — `nowMs` is injected):
 *
 *   evaluateLiveness  — distinguishes fresh / stale / unproven / clock-skew from
 *                       `last_detection_at` AGE (never from volume==0). The
 *                       staleness guard is the safety-critical alert.
 *   evaluateSpike     — volume spike vs trailing baseline with a cold-start guard
 *                       (no div-by-zero) and an absolute floor (1-vs-0 is not a spike).
 *   buildAlertPayload — assembles a PII-FREE, counts-only alert body and applies the
 *                       compliance ≥3 minimum-count floor to per-bucket rows before
 *                       anything leaves Supabase.
 *
 * Boundary obligations map to the crisis specialist's T1–T14 planning pass.
 */

import {
  assert,
  assertEquals,
  assertFalse,
} from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import {
  evaluateLiveness,
  evaluateProbeLiveness,
  evaluateSpike,
  evaluateBackfill,
  buildAlertPayload,
  composeReason,
  shouldPingHealthcheck,
  priorRunPagedSpike,
  alertAxes,
  anyAxisTripped,
  composeSubject,
  composeBackfillLines,
  selectTodayBuckets,
  LIVENESS_ONLY_SUBJECT,
  type AxisAlerts,
  type BackfillVerdict,
  type BucketRow,
} from '../crisis-detection-alerting/alertLogic.ts';

// A live synthetic-probe verdict to satisfy buildAlertPayload's required `probe` axis
// (INFRA-265). buildAlertPayload only passes it through; these tests assert on the real
// liveness/spike/bucket-floor behavior, so a constant live probe is sufficient here.
const PROBE_LIVE = evaluateProbeLiveness({
  lastProbeAt: new Date(Date.parse('2026-06-07T11:00:00.000Z')).toISOString(),
  nowMs: Date.parse('2026-06-07T12:00:00.000Z'),
  stalenessThresholdHours: 12,
});

// Anchor "now" deterministically. 2026-06-07T12:00:00Z.
const NOW = Date.parse('2026-06-07T12:00:00.000Z');
const HOUR = 3_600_000;
const STALE_HOURS = 48; // threshold under test
const TODAY = '2026-06-07';

// DEBUG-541: a settled backfill verdict for payload tests that are not about backfill.
// Identical maps => nothing grew.
const NO_BACKFILL = evaluateBackfill({
  currentCounts: { '2026-06-06': 2, '2026-06-07': 2 },
  watermark: { '2026-06-06': 2, '2026-06-07': 2 },
  today: TODAY,
  minGrowthToReport: 5,
  spikeMultiplier: 3,
  minAbsoluteForSpike: 5,
});

// All-event-time provenance, so payload tests are not implicitly asserting a fallback state.
const CLEAN_PROVENANCE = {
  eventTimeRows: 11,
  ingestTimeRows: 0,
  clockSkewCount: 0,
  implausiblePastCount: 0,
};

// ---------------------------------------------------------------------------
// evaluateLiveness — the safety-critical guard
// ---------------------------------------------------------------------------

// T2 — last detection one unit OLDER than threshold → alert (stale).
Deno.test('liveness: detection older than threshold → stale alert', () => {
  const v = evaluateLiveness({
    lastDetectionAt: new Date(NOW - (STALE_HOURS + 1) * HOUR).toISOString(),
    totalDetectionsRetained: 5,
    nowMs: NOW,
    stalenessThresholdHours: STALE_HOURS,
  });
  assert(v.alert);
  assertEquals(v.status, 'stale');
});

// T1 — exactly AT the threshold → alert-on-equal (documented bias-to-alert).
Deno.test('liveness: exactly at threshold → alert (alert-on-equal)', () => {
  const v = evaluateLiveness({
    lastDetectionAt: new Date(NOW - STALE_HOURS * HOUR).toISOString(),
    totalDetectionsRetained: 5,
    nowMs: NOW,
    stalenessThresholdHours: STALE_HOURS,
  });
  assert(v.alert);
  assertEquals(v.status, 'stale');
});

// T3 — younger than threshold → no liveness alert (fresh).
Deno.test('liveness: detection younger than threshold → fresh, no alert', () => {
  const v = evaluateLiveness({
    lastDetectionAt: new Date(NOW - (STALE_HOURS - 1) * HOUR).toISOString(),
    totalDetectionsRetained: 5,
    nowMs: NOW,
    stalenessThresholdHours: STALE_HOURS,
  });
  assertFalse(v.alert);
  assertEquals(v.status, 'fresh');
});

// T4/T5 — NULL last_detection_at (empty view / never had a detection) → 'unproven',
// never silently 'fresh'/'healthy'. At pre-launch zero-volume this is the legitimate
// state, so it is advisory (alert=false) but MUST be surfaced as unproven, not healthy.
Deno.test('liveness: null last_detection_at → unproven (never silently healthy)', () => {
  const v = evaluateLiveness({
    lastDetectionAt: null,
    totalDetectionsRetained: 0,
    nowMs: NOW,
    stalenessThresholdHours: STALE_HOURS,
  });
  assertEquals(v.status, 'unproven');
  // It must NOT be reported as fresh/healthy.
  assert(v.status !== 'fresh');
});

// quiet-but-alive: total>0, recent detection, zero detections "today" is irrelevant —
// liveness is decided by age of last_detection_at, NOT by today's volume==0.
Deno.test('liveness: quiet day but recent detection → fresh (quiet != dead)', () => {
  const v = evaluateLiveness({
    lastDetectionAt: new Date(NOW - 2 * HOUR).toISOString(),
    totalDetectionsRetained: 1,
    nowMs: NOW,
    stalenessThresholdHours: STALE_HOURS,
  });
  assertFalse(v.alert);
  assertEquals(v.status, 'fresh');
});

// T8 — clock skew: last_detection_at in the FUTURE must be handled deterministically,
// not crash and not silently invert the comparison into a huge "stale".
Deno.test('liveness: future last_detection_at (clock skew) → handled, not stale', () => {
  const v = evaluateLiveness({
    lastDetectionAt: new Date(NOW + 6 * HOUR).toISOString(),
    totalDetectionsRetained: 3,
    nowMs: NOW,
    stalenessThresholdHours: STALE_HOURS,
  });
  assertFalse(v.alert);
  assertEquals(v.status, 'future_skew');
});

// ---------------------------------------------------------------------------
// evaluateSpike — volume drift
// ---------------------------------------------------------------------------

const SPIKE_X = 3; // multiplier
const SPIKE_MIN = 5; // absolute floor

// T9 — exactly at multiplier*baseline → alert-on-equal.
Deno.test('spike: today == multiplier*baseline → spike alert', () => {
  const v = evaluateSpike({
    todayCount: 9, // 3 * mean(3,3,3)=3 => 9
    baselineCounts: [3, 3, 3],
    spikeMultiplier: SPIKE_X,
    minAbsoluteForSpike: SPIKE_MIN,
  });
  assert(v.alert);
  assertEquals(v.status, 'spike');
});

Deno.test('spike: below multiplier → normal, no alert', () => {
  const v = evaluateSpike({
    todayCount: 8,
    baselineCounts: [3, 3, 3],
    spikeMultiplier: SPIKE_X,
    minAbsoluteForSpike: SPIKE_MIN,
  });
  assertFalse(v.alert);
  assertEquals(v.status, 'normal');
});

// T10 — empty baseline (cold start) → no div-by-zero, no false spike.
Deno.test('spike: empty baseline → cold_start, no alert, no div-by-zero', () => {
  const v = evaluateSpike({
    todayCount: 12,
    baselineCounts: [],
    spikeMultiplier: SPIKE_X,
    minAbsoluteForSpike: SPIKE_MIN,
  });
  assertFalse(v.alert);
  assertEquals(v.status, 'cold_start');
  assert(Number.isFinite(v.baselineMean ?? 0));
});

// T11 — a single detection against an all-zero baseline is NOT suppressed from the
// data but must NOT page as a spike (below absolute floor).
Deno.test('spike: 1 vs all-zero baseline → not a spike (below absolute floor)', () => {
  const v = evaluateSpike({
    todayCount: 1,
    baselineCounts: [0, 0, 0, 0],
    spikeMultiplier: SPIKE_X,
    minAbsoluteForSpike: SPIKE_MIN,
  });
  assertFalse(v.alert);
  assertEquals(v.status, 'normal');
});

// genuine emergence from a flat-zero baseline once past the absolute floor.
Deno.test('spike: emergence above floor from zero baseline → spike', () => {
  const v = evaluateSpike({
    todayCount: 6,
    baselineCounts: [0, 0, 0],
    spikeMultiplier: SPIKE_X,
    minAbsoluteForSpike: SPIKE_MIN,
  });
  assert(v.alert);
  assertEquals(v.status, 'spike');
});

// ---------------------------------------------------------------------------
// buildAlertPayload — PII-free, ≥3 bucket floor
// ---------------------------------------------------------------------------

// NB: bare 'q9' is intentionally NOT in this list — it is a substring of the legitimate
// label 'phq9'. We forbid the raw Q9 ANSWER/score shapes instead. DEBUG-684 adds the run
// timestamp: the partial-day reading is keyed on a day, never on when the run fired.
const PAYLOAD_DENYLIST = [
  'user_id', 'session_id', 'device_id', 'distinct_session', 'q9_value', 'q9_answer',
  'raw_score', 'phq9_total', 'gad7_total', 'ran_at', 'ranat',
];

const BUCKETS: BucketRow[] = [
  { assessment_type: 'phq9', trigger_type: 'phq9_severe_score', severity_bucket: 'high', detection_count: 7 },
  { assessment_type: 'gad7', trigger_type: 'gad7_severe_score', severity_bucket: 'high', detection_count: 3 },
  // below the ≥3 floor — must be suppressed from the per-bucket breakdown:
  { assessment_type: 'phq9', trigger_type: 'phq9_suicidal_ideation', severity_bucket: 'undefined', detection_count: 1 },
];

Deno.test('payload: per-bucket rows below the ≥3 floor are suppressed from breakdown', () => {
  const p = buildAlertPayload({
    reason: 'spike',
    liveness: evaluateLiveness({ lastDetectionAt: new Date(NOW - HOUR).toISOString(), totalDetectionsRetained: 11, nowMs: NOW, stalenessThresholdHours: STALE_HOURS }),
    spike: evaluateSpike({ todayCount: 11, baselineCounts: [2, 2, 2], spikeMultiplier: SPIKE_X, minAbsoluteForSpike: SPIKE_MIN }),
    probe: PROBE_LIVE,
    backfill: NO_BACKFILL,
    todayVolume: 11,
    arrivalToday: 11,
    provenance: CLEAN_PROVENANCE,
    buckets: BUCKETS,
    bucketFloor: 3,
    lastDetectionDate: '2026-06-07',
  });
  // Only the two rows with count >= 3 survive into the breakdown.
  assertEquals(p.buckets.length, 2);
  // The 1-count rare row is suppressed from the breakdown but COUNTED, not dropped.
  assertEquals(p.suppressedBucketCount, 1);
  assertEquals(p.suppressedDetectionTotal, 1);
});

Deno.test('payload: never contains PII / forbidden keys (denylist over serialized body)', () => {
  const p = buildAlertPayload({
    reason: 'liveness+spike',
    liveness: evaluateLiveness({ lastDetectionAt: null, totalDetectionsRetained: 0, nowMs: NOW, stalenessThresholdHours: STALE_HOURS }),
    spike: evaluateSpike({ todayCount: 11, baselineCounts: [2, 2, 2], spikeMultiplier: SPIKE_X, minAbsoluteForSpike: SPIKE_MIN }),
    probe: PROBE_LIVE,
    // DEBUG-541: exercise the denylist against a payload that actually CARRIES backfill
    // detail and provenance counts — a clean verdict here would leave the new fields
    // untested by the one assertion that guards what leaves Supabase.
    backfill: evaluateBackfill({
      currentCounts: { '2026-06-05': 9, '2026-06-06': 1, '2026-06-07': 11 },
      watermark: { '2026-06-05': 1, '2026-06-06': 1, '2026-06-07': 0 },
      today: TODAY,
      minGrowthToReport: 5,
      spikeMultiplier: SPIKE_X,
      minAbsoluteForSpike: SPIKE_MIN,
    }),
    todayVolume: 11,
    arrivalToday: 4,
    provenance: { eventTimeRows: 6, ingestTimeRows: 5, clockSkewCount: 2, implausiblePastCount: 1 },
    buckets: BUCKETS,
    bucketFloor: 3,
    lastDetectionDate: null,
  });
  const serialized = JSON.stringify(p).toLowerCase();
  for (const forbidden of PAYLOAD_DENYLIST) {
    assertFalse(serialized.includes(forbidden), `payload must not contain "${forbidden}"`);
  }
});

Deno.test('payload: last_detection granularity is day-level only (no sub-day timestamp)', () => {
  const p = buildAlertPayload({
    reason: 'liveness',
    liveness: evaluateLiveness({ lastDetectionAt: new Date(NOW - 60 * HOUR).toISOString(), totalDetectionsRetained: 4, nowMs: NOW, stalenessThresholdHours: STALE_HOURS }),
    spike: evaluateSpike({ todayCount: 0, baselineCounts: [0, 0], spikeMultiplier: SPIKE_X, minAbsoluteForSpike: SPIKE_MIN }),
    probe: PROBE_LIVE,
    // Carry real grown-day detail: those entries hold DATE strings, and this assertion is
    // the one that would catch a future change putting a run timestamp in the payload.
    backfill: evaluateBackfill({
      currentCounts: { '2026-06-05': 9, '2026-06-06': 1, '2026-06-07': 0 },
      watermark: { '2026-06-05': 1, '2026-06-06': 1, '2026-06-07': 0 },
      today: TODAY,
      minGrowthToReport: 5,
      spikeMultiplier: SPIKE_X,
      minAbsoluteForSpike: SPIKE_MIN,
    }),
    todayVolume: 0,
    arrivalToday: 0,
    provenance: CLEAN_PROVENANCE,
    buckets: [],
    bucketFloor: 3,
    lastDetectionDate: '2026-06-05',
  });
  // Day-precision string only — must NOT carry an HH:MM:SS wall-clock.
  assert(/^\d{4}-\d{2}-\d{2}$/.test(p.lastDetectionDate ?? ''));
  // No sub-day time component anywhere in the serialized payload (an ISO timestamp
  // would surface as HH:MM). Checking for a time pattern is robust against camelCase
  // keys, unlike a bare 'T' substring test.
  assertFalse(/\d{2}:\d{2}/.test(JSON.stringify(p)), 'no sub-day time component should appear');
});

// ---------------------------------------------------------------------------
// shouldPingHealthcheck — external dead-man's-switch gate (INFRA-264)
// ---------------------------------------------------------------------------
// The safety property is in the SILENCE: a ping fires ONLY on a fully clean run, so any
// error suppresses it and healthchecks.io pages on the missed expected ping. These pin
// the two failure modes that silently break the switch in the no-page direction.

Deno.test('healthcheck gate: clean run (0 errors) → ping', () => {
  assert(shouldPingHealthcheck({ errorCount: 0 }));
});

Deno.test('healthcheck gate: an alerted-but-clean run still pings (orthogonal to alert)', () => {
  // An 'alerted' run has errorCount 0 (the breach email is not an error); it must ping —
  // gating must be on errors, never entangled with alertSent/status.
  assert(shouldPingHealthcheck({ errorCount: 0 }));
});

Deno.test('healthcheck gate: ANY error → no ping (dead-man fires)', () => {
  assertFalse(shouldPingHealthcheck({ errorCount: 1 }));
  assertFalse(shouldPingHealthcheck({ errorCount: 3 }));
});

// ---------------------------------------------------------------------------
// evaluateBackfill — the second key (DEBUG-541)
// ---------------------------------------------------------------------------
// The series is keyed on OCCURRENCE; "have I already evaluated this day" is keyed on
// INGEST. Without the second key a backfilled detection lands in an already-closed day,
// is never spike-tested, AND lifts the baseline the next genuine spike is measured
// against — trading a visible false positive for a silent false negative. These pin the
// failure modes that are silent in the no-page direction.

const BF = {
  minGrowthToReport: 5,
  spikeMultiplier: SPIKE_X,
  minAbsoluteForSpike: SPIKE_MIN,
  today: TODAY,
};

Deno.test('backfill: absent watermark is cold_start, never none', () => {
  const v = evaluateBackfill({ ...BF, currentCounts: { '2026-06-01': 4 }, watermark: null });
  assertEquals(v.status, 'cold_start');
  assertFalse(v.alert);
  assertEquals(v.grownDays.length, 0);
});

Deno.test('backfill: cold_start does NOT page even on a large series', () => {
  // The first run after deploy reads a NULL evaluated_counts from the pre-deploy alerter.
  // Reading that as an empty map would report the whole series as grown-from-zero, and an
  // operator's introduction to a new axis being a cry of wolf is how an axis gets ignored.
  const v = evaluateBackfill({
    ...BF,
    currentCounts: { '2026-06-01': 99, '2026-06-02': 99, '2026-06-03': 99 },
    watermark: null,
  });
  assertFalse(v.alert);
  assertEquals(v.status, 'cold_start');
});

Deno.test('backfill: nothing grew → none', () => {
  const counts = { '2026-06-01': 3, '2026-06-02': 4, [TODAY]: 1 };
  const v = evaluateBackfill({ ...BF, currentCounts: { ...counts }, watermark: { ...counts } });
  assertEquals(v.status, 'none');
  assertFalse(v.alert);
});

Deno.test('backfill: a grown closed day is REPORTED even when it does not page', () => {
  // Growth magnitude is an INDEPENDENT trigger from the ratio. Backfill lifts neighbours
  // too, so a ratio-only gate lets a backfill mask the very day it lands on.
  const v = evaluateBackfill({
    ...BF,
    currentCounts: { '2026-06-01': 6, '2026-06-02': 20, '2026-06-03': 20, [TODAY]: 0 },
    watermark: { '2026-06-01': 0, '2026-06-02': 20, '2026-06-03': 20, [TODAY]: 0 },
  });
  assertEquals(v.status, 'backfill');
  assertEquals(v.grownDays.length, 1);
  assertEquals(v.grownDays[0].day, '2026-06-01');
  assertEquals(v.grownDays[0].delta, 6);
  assertFalse(v.alert); // 6 is nowhere near 3x a neighbour mean of 20
});

Deno.test('backfill: a grown day that also clears the spike test PAGES', () => {
  const v = evaluateBackfill({
    ...BF,
    currentCounts: { '2026-06-01': 9, '2026-06-02': 0, '2026-06-03': 0, [TODAY]: 0 },
    watermark: { '2026-06-01': 0, '2026-06-02': 0, '2026-06-03': 0, [TODAY]: 0 },
  });
  assert(v.alert);
  assertEquals(v.status, 'backfill');
});

Deno.test('backfill: today is EXCLUDED — the spike axis owns the open day', () => {
  // Double-counting today would page twice for one event and make the two axes disagree.
  const v = evaluateBackfill({
    ...BF,
    currentCounts: { '2026-06-01': 1, [TODAY]: 50 },
    watermark: { '2026-06-01': 1, [TODAY]: 0 },
  });
  assertEquals(v.status, 'none');
  assertFalse(v.alert);
});

Deno.test('backfill: a day ABSENT from the watermark is not growth-from-zero', () => {
  // A day the previous run never evaluated cannot be shown to have grown. Treating absent
  // as 0 would report the whole tail as backfill every time the window slides.
  const v = evaluateBackfill({
    ...BF,
    currentCounts: { '2026-06-01': 50, '2026-06-02': 1 },
    watermark: { '2026-06-02': 1 },
  });
  assertEquals(v.status, 'none');
  assertEquals(v.grownDays.length, 0);
});

Deno.test('backfill: growth below the report threshold is ignored', () => {
  const v = evaluateBackfill({
    ...BF,
    currentCounts: { '2026-06-01': 4 },
    watermark: { '2026-06-01': 1 }, // +3, below minGrowthToReport of 5
  });
  assertEquals(v.status, 'none');
});

Deno.test('backfill: a day that SHRANK is not reported as growth', () => {
  // Retention pruning moves counts DOWN. A negative delta must never read as backfill.
  const v = evaluateBackfill({
    ...BF,
    currentCounts: { '2026-06-01': 2 },
    watermark: { '2026-06-01': 10 },
  });
  assertEquals(v.status, 'none');
  assertEquals(v.grownDays.length, 0);
});

Deno.test('backfill: grown days carry DAY precision only (no sub-day timestamp)', () => {
  const v = evaluateBackfill({
    ...BF,
    currentCounts: { '2026-06-01': 9, '2026-06-02': 0, [TODAY]: 0 },
    watermark: { '2026-06-01': 0, '2026-06-02': 0, [TODAY]: 0 },
  });
  for (const g of v.grownDays) {
    assert(/^\d{4}-\d{2}-\d{2}$/.test(g.day), `grown day must be YYYY-MM-DD, got ${g.day}`);
  }
  assertFalse(/\d{2}:\d{2}/.test(JSON.stringify(v.grownDays)));
});

// ---------------------------------------------------------------------------
// composeReason — the backfill axis is additive and last
// ---------------------------------------------------------------------------

Deno.test('composeReason: backfill appears last and never displaces another axis', () => {
  assertEquals(composeReason(false, false, false, false), '');
  assertEquals(composeReason(false, false, false, true), 'backfill');
  assertEquals(composeReason(true, false, false, true), 'liveness+backfill');
  assertEquals(composeReason(true, true, true, true), 'liveness+spike+probe+backfill');
  // A backfill trip must never suppress a real verdict — the other axes survive intact.
  assertEquals(composeReason(true, true, false, false), 'liveness+spike');
});

// ---------------------------------------------------------------------------
// DEBUG-684 — the partial day, subjects, and the Detection mix
// ---------------------------------------------------------------------------
// Each run stores its own today as a PARTIAL count, so the next run used to read that
// day's ordinary later traffic as `backfill`. Rulings: crisis AC0 gate, 2026-10-02.

function dayMinus(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00.000Z`) - n * 86_400_000).toISOString().slice(0, 10);
}

/** A gap-filled map as a run on `runDay` persists it: runDay..runDay-7, latest key first. */
function runMap(runDay: string, overrides: Record<string, number> = {}, fill = 0) {
  const m: Record<string, number> = {};
  for (let i = 0; i <= 7; i++) m[dayMinus(runDay, i)] = fill;
  return { ...m, ...overrides };
}

const D = dayMinus(TODAY, 1); // the previous run's today
const NOT_PAGED = priorRunPagedSpike({ spike_status: 'normal', status: 'ok' });

function partial(
  watermarkOverrides: Record<string, number>,
  currentOverrides: Record<string, number>,
  opts: { watermarkFill?: number; currentFill?: number; priorPaged?: boolean } = {},
): BackfillVerdict {
  return evaluateBackfill({
    ...BF,
    watermark: runMap(D, watermarkOverrides, opts.watermarkFill ?? 0),
    currentCounts: runMap(TODAY, currentOverrides, opts.currentFill ?? 0),
    priorPaged: opts.priorPaged ?? NOT_PAGED,
  });
}

// R1 — page iff the full count clears evaluateSpike, the day moved, and the prior run did
// not already page it. Independent of the growth threshold.

Deno.test('partial day (R1a): 4 at the run → 6 at day end against zero neighbours PAGES', () => {
  // The silent miss: +2 is below the report threshold and 4 was below the floor, so this
  // full-day spike paged under no axis before DEBUG-684.
  const v = partial({ [D]: 4 }, { [D]: 6 });
  assert(v.partialDay?.alert);
  assertFalse(v.alert, 'the closed-day axis did not page');
  assertEquals(v.status, 'partial_day');
});

Deno.test('partial day (R1b): full count equal to the floor pages; an unmoved day does not', () => {
  assert(partial({ [D]: 4 }, { [D]: 5 }).partialDay?.alert);
  assertFalse(partial({ [D]: 4 }, { [D]: 4 }).partialDay?.alert);
});

Deno.test('partial day (R1c): ratio against current neighbours, alert-on-equal', () => {
  // Neighbour mean 2, multiplier 3 → threshold 6.
  assert(partial({ [D]: 3 }, { [D]: 6 }, { watermarkFill: 2, currentFill: 2 }).partialDay?.alert);
  assertFalse(partial({ [D]: 3 }, { [D]: 5 }, { watermarkFill: 2, currentFill: 2 }).partialDay?.alert);
});

Deno.test('partial day (R1d): a day the prior run already paged is reported, not re-paged', () => {
  const v = partial({ [D]: 9 }, { [D]: 15 }, {
    priorPaged: priorRunPagedSpike({ spike_status: 'spike', status: 'alerted' }),
  });
  assertFalse(v.partialDay?.alert);
  assert(v.partialDay?.priorPaged);
  assertEquals(v.status, 'partial_day');
});

Deno.test('partial day (R1e/f): an unsent or unknown prior verdict fails toward paging', () => {
  for (const row of [{ spike_status: 'spike', status: 'ok' }, { spike_status: null, status: 'alerted' }, null]) {
    const v = partial({ [D]: 9 }, { [D]: 15 }, { priorPaged: priorRunPagedSpike(row) });
    assert(v.partialDay?.alert, `prior row ${JSON.stringify(row)} must not suppress the page`);
  }
});

Deno.test('partial day (R1g): the prior verdict is READ, so a shrunk neighbour cannot suppress', () => {
  // Prior partial 5 vs mean 2 (threshold 6) → not paged. Neighbours then shrink to 1, so
  // a recompute would say "5 already cleared" and swallow the full count of 12.
  const v = partial({ [D]: 5 }, { [D]: 12 }, { watermarkFill: 2, currentFill: 1 });
  assert(v.partialDay?.alert);
});

Deno.test('partial day (R1h): a day that did not move never pages', () => {
  assertFalse(partial({ [D]: 6 }, { [D]: 6 }).partialDay?.alert);
});

// R5 — confirmations

Deno.test('partial day (AC2 i): growth ≥ threshold is partial_day, never backfill or grownDays', () => {
  const v = partial({ [D]: 2 }, { [D]: 9 }, { watermarkFill: 20, currentFill: 20 });
  assertEquals(v.status, 'partial_day');
  assertEquals(v.grownDays.length, 0, 'the partial day must never be listed as a closed day');
  assertFalse(v.alert);
  assertFalse(v.partialDay?.alert, '9 is nowhere near 3x a neighbour mean of 20');
  assert(v.partialDay?.reported);
  assertEquals(v.partialDay?.delta, 7);
});

Deno.test('partial day (AC2 ii): the same growth on a CLOSED day is backfill and pages', () => {
  const closed = dayMinus(TODAY, 3);
  const v = partial({}, { [closed]: 9 });
  assertEquals(v.status, 'backfill');
  assert(v.alert);
  assertEquals(v.grownDays.map((g) => g.day), [closed]);
  assertFalse(v.partialDay?.alert);
  assertFalse(v.partialDay?.reported);
});

Deno.test('partial day (AC2 ii): closed-day growth AND a reported partial day → both readings', () => {
  const closed = dayMinus(TODAY, 3);
  const v = partial({ [D]: 1 }, { [D]: 7, [closed]: 9 }, { watermarkFill: 0, currentFill: 0 });
  assertEquals(v.status, 'backfill+partial_day');
});

Deno.test('partial day (AC2 iv): a same-day re-run has no partial day; closed days still evaluated', () => {
  const v = evaluateBackfill({
    ...BF,
    watermark: runMap(TODAY, { [TODAY]: 3 }),
    currentCounts: runMap(TODAY, { [TODAY]: 50, [D]: 9 }),
    priorPaged: NOT_PAGED,
  });
  assertEquals(v.partialDay, null);
  assertEquals(v.grownDays.map((g) => g.day), [D]);
  assertEquals(v.status, 'backfill');
});

Deno.test('partial day (AC2 v): prior clean run 2 days back → its day is the partial day', () => {
  const P = dayMinus(TODAY, 2);
  const v = evaluateBackfill({
    ...BF,
    watermark: runMap(P, { [P]: 1 }),
    currentCounts: runMap(TODAY, { [D]: 50, [P]: 3 }),
    priorPaged: NOT_PAGED,
  });
  assertEquals(v.partialDay?.day, P);
  // The gap day was never evaluated by any run: neither backfill nor the partial day.
  assertEquals(v.grownDays.filter((g) => g.day === D).length, 0);
  assertEquals(v.status, 'none');
});

Deno.test('partial day (AC2 vi): a v15 flat map is a valid prior, never cold_start', () => {
  const v = evaluateBackfill({
    ...BF,
    watermark: runMap(D),
    currentCounts: runMap(TODAY),
    priorPaged: NOT_PAGED,
  });
  assert(v.status !== 'cold_start');
  assertEquals(v.partialDay?.day, D);
});

Deno.test('partial day: derived from date-shaped keys only (a future map format cannot hijack it)', () => {
  const v = evaluateBackfill({
    ...BF,
    watermark: { ...runMap(D), _meta: 1, zz: 2 },
    currentCounts: runMap(TODAY),
    priorPaged: NOT_PAGED,
  });
  assertEquals(v.partialDay?.day, D);
});

Deno.test('partial day: a latest key AFTER today is degenerate → no partial day, over-reports', () => {
  const v = evaluateBackfill({
    ...BF,
    watermark: runMap(dayMinus(TODAY, -1)),
    currentCounts: runMap(TODAY, { [D]: 9 }),
    priorPaged: NOT_PAGED,
  });
  assertEquals(v.partialDay, null);
  assertEquals(v.status, 'backfill', 'pre-DEBUG-684 behaviour: D is read as a closed day');
});

Deno.test('partial day: older than the window is NOT EVALUABLE, never a silent none-with-zero-growth', () => {
  const P = dayMinus(TODAY, 9);
  const v = evaluateBackfill({
    ...BF,
    watermark: runMap(P, { [P]: 1 }),
    currentCounts: runMap(TODAY),
    priorPaged: NOT_PAGED,
  });
  assertEquals(v.partialDay?.day, P);
  assertFalse(v.partialDay?.evaluable);
  assertEquals(v.partialDay?.currentCount, null);
  assertFalse(v.partialDay?.alert);
});

Deno.test('priorRunPagedSpike: only a sent spike page counts', () => {
  assert(priorRunPagedSpike({ spike_status: 'spike', status: 'alerted' }));
  assertFalse(priorRunPagedSpike({ spike_status: 'spike', status: 'ok' }));
  assertFalse(priorRunPagedSpike({ spike_status: 'normal', status: 'alerted' }));
  assertFalse(priorRunPagedSpike({ spike_status: null, status: 'alerted' }));
  assertFalse(priorRunPagedSpike(null));
});

// The send decision and the reason

const NO_AXIS = { alert: false };

Deno.test('send decision: a FULL-DAY SPIKE alone sends, under its own reason token', () => {
  const a = alertAxes({ liveness: NO_AXIS, spike: NO_AXIS, probe: NO_AXIS, backfill: partial({ [D]: 4 }, { [D]: 6 }) });
  assertEquals(a, { liveness: false, spike: false, probe: false, backfill: false, partialDay: true });
  assert(anyAxisTripped(a));
  assertEquals(composeReason(a.liveness, a.spike, a.probe, a.backfill, a.partialDay), 'partial_day');
});

Deno.test('composeReason: partial_day comes after backfill and displaces nothing', () => {
  assertEquals(composeReason(true, false, false, true, true), 'liveness+backfill+partial_day');
  assertEquals(composeReason(true, true, true, true, true), 'liveness+spike+probe+backfill+partial_day');
  assertEquals(composeReason(false, false, false, false, true), 'partial_day');
});

// Subject — R3/R4. Lead order PROBE > VOLUME > FULL-DAY > BACKFILL > LIVENESS.

const SUBJECT_PREFIX = '[Being] Crisis-detection ';
const SUBJECT_AXES: Array<[keyof AxisAlerts, string]> = [
  ['probe', 'PROBE DEAD (ingest leg)'],
  ['spike', 'VOLUME SPIKE'],
  ['partialDay', 'FULL-DAY SPIKE'],
  ['backfill', 'BACKFILL SPIKE'],
  ['liveness', 'LIVENESS'],
];

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

Deno.test('subject: every one of the 31 paging combinations names exactly its axes', () => {
  for (let mask = 1; mask < 32; mask++) {
    const a = {} as AxisAlerts;
    SUBJECT_AXES.forEach(([k], i) => (a[k] = Boolean(mask & (1 << i))));
    const s = composeSubject(a);
    const tripped = SUBJECT_AXES.filter(([k]) => a[k]);
    if (tripped.length === 1 && a.liveness) {
      assertEquals(s, LIVENESS_ONLY_SUBJECT);
      continue;
    }
    const label = JSON.stringify(a);
    assert(s !== LIVENESS_ONLY_SUBJECT, `${label} fell through to the liveness subject`);
    assert(s.startsWith(SUBJECT_PREFIX + tripped[0][1]), `${label} must lead with ${tripped[0][1]}: ${s}`);
    for (const [k, l] of SUBJECT_AXES) {
      assertEquals(occurrences(s, l), a[k] ? 1 : 0, `${label}: "${l}" in "${s}"`);
    }
    assertEquals(s.includes('BACKFILL'), a.backfill, `${label}: BACKFILL only on a closed-day page`);
  }
});

Deno.test('subject (R4): probe-only and probe + liveness name the dead ingest leg first', () => {
  const none: AxisAlerts = { liveness: false, spike: false, probe: false, backfill: false, partialDay: false };
  assertEquals(composeSubject({ ...none, probe: true }), '[Being] Crisis-detection PROBE DEAD (ingest leg)');
  assertEquals(
    composeSubject({ ...none, probe: true, liveness: true }),
    '[Being] Crisis-detection PROBE DEAD (ingest leg) + LIVENESS',
  );
  assertEquals(composeSubject(none), '[Being] Crisis-detection alert');
});

Deno.test('subject: backfill reported-not-paged + liveness stays the liveness subject', () => {
  const reportedOnly = evaluateBackfill({
    ...BF,
    currentCounts: { '2026-06-01': 6, '2026-06-02': 20, '2026-06-03': 20, [TODAY]: 0 },
    watermark: { '2026-06-01': 0, '2026-06-02': 20, '2026-06-03': 20, [TODAY]: 0 },
  });
  assertEquals(reportedOnly.status, 'backfill');
  const a = alertAxes({ liveness: { alert: true }, spike: NO_AXIS, probe: NO_AXIS, backfill: reportedOnly });
  assertEquals(composeSubject(a), LIVENESS_ONLY_SUBJECT);
});

// Body — AC3

Deno.test('body: a partial day is reported as such, never under the closed-day heading', () => {
  const lines = composeBackfillLines(buildPayload(partial({ [D]: 2 }, { [D]: 9 }, { watermarkFill: 20, currentFill: 20 })).backfill);
  const body = lines.join('\n');
  assert(body.includes('since the last evaluated run'));
  assert(body.includes(`${D}: 2 -> 9 (+7)`));
  assertFalse(body.includes('Closed days that grew'));
  assertFalse(body.includes('Reported, not paged'), 'that line belongs to the closed-day axis only');
  assertFalse(body.includes('FULL-DAY SPIKE'));
  assertFalse(/\d{2}:\d{2}/.test(body), 'no clock time');
});

Deno.test('body: a FULL-DAY SPIKE says so; an unevaluable partial day says so', () => {
  assert(composeBackfillLines(buildPayload(partial({ [D]: 4 }, { [D]: 6 })).backfill).join('\n').includes('FULL-DAY SPIKE'));
  const P = dayMinus(TODAY, 9);
  const stale = evaluateBackfill({ ...BF, watermark: runMap(P), currentCounts: runMap(TODAY), priorPaged: NOT_PAGED });
  assert(composeBackfillLines(buildPayload(stale).backfill).join('\n').includes('not evaluable'));
});

Deno.test('payload: a populated partial-day reading passes the denylist and carries no clock time', () => {
  const p = buildPayload(partial({ [D]: 4 }, { [D]: 6 }));
  assert(p.backfill.partialDay !== null);
  const serialized = JSON.stringify(p);
  for (const forbidden of PAYLOAD_DENYLIST) {
    assertFalse(serialized.toLowerCase().includes(forbidden), `payload must not contain "${forbidden}"`);
  }
  assertFalse(/\d{2}:\d{2}/.test(serialized));
});

// Detection mix — AC4

Deno.test('detection mix: only TODAY\'s rows; a row without event_date is dropped, not passed', () => {
  const rows = [
    { event_date: TODAY, assessment_type: 'phq9', trigger_type: 'phq9_severe_score', severity_bucket: 'high', detection_count: 4 },
    { event_date: `${TODAY}T00:00:00+00:00`, assessment_type: 'gad7', trigger_type: 'gad7_severe_score', severity_bucket: 'high', detection_count: 1 },
    { event_date: D, assessment_type: 'phq9', trigger_type: 'phq9_severe_score', severity_bucket: 'high', detection_count: 30 },
    { assessment_type: 'phq9', trigger_type: 'phq9_severe_score', severity_bucket: 'high', detection_count: 30 },
  ];
  const today = selectTodayBuckets(rows, TODAY);
  assertEquals(today.map((b) => b.detection_count), [4, 1]);
  // Visible + withheld must account for exactly today's volume, no more.
  const p = buildAlertPayload({ ...payloadBase(), todayVolume: 5, arrivalToday: 5, buckets: today });
  assertEquals(p.buckets.reduce((n, b) => n + b.detection_count, 0) + p.suppressedDetectionTotal, p.todayVolume);
});

function payloadBase() {
  return {
    reason: 'partial_day',
    liveness: evaluateLiveness({ lastDetectionAt: null, totalDetectionsRetained: 0, nowMs: NOW, stalenessThresholdHours: STALE_HOURS }),
    spike: evaluateSpike({ todayCount: 0, baselineCounts: [0], spikeMultiplier: SPIKE_X, minAbsoluteForSpike: SPIKE_MIN }),
    probe: PROBE_LIVE,
    backfill: NO_BACKFILL,
    todayVolume: 0,
    arrivalToday: 0,
    provenance: CLEAN_PROVENANCE,
    buckets: [] as BucketRow[],
    bucketFloor: 3,
    lastDetectionDate: null,
  };
}

function buildPayload(backfill: BackfillVerdict) {
  return buildAlertPayload({ ...payloadBase(), backfill });
}
