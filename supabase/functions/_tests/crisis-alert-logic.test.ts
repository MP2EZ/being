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
  // NB: bare 'q9' is intentionally NOT in this list — it is a substring of the
  // legitimate label 'phq9'. We forbid the raw Q9 ANSWER/score shapes instead.
  for (const forbidden of ['user_id', 'session_id', 'device_id', 'distinct_session', 'q9_value', 'q9_answer', 'raw_score', 'phq9_total', 'gad7_total']) {
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
