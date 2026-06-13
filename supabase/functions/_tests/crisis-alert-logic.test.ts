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
  evaluateSpike,
  buildAlertPayload,
  type BucketRow,
} from '../crisis-detection-alerting/alertLogic.ts';

// Anchor "now" deterministically. 2026-06-07T12:00:00Z.
const NOW = Date.parse('2026-06-07T12:00:00.000Z');
const HOUR = 3_600_000;
const STALE_HOURS = 48; // threshold under test

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
    todayVolume: 11,
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
    todayVolume: 11,
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
    todayVolume: 0,
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
