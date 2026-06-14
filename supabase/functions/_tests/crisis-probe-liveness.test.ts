/**
 * evaluateProbeLiveness behavioral tests (INFRA-265)
 *
 * The synthetic-probe liveness axis is PURE, stateful, and edge-case-heavy →
 * CLAUDE.md forces test-first (TDD). It runs ALONGSIDE evaluateLiveness (the
 * real-detection axis) and turns INFRA-219's advisory `unproven` (at zero real
 * volume) into an AUTHORITATIVE dead-pipeline page for the ingest/cron/edge leg.
 *
 * `nowMs` is injected so the staleness comparison is deterministic (no Date.now).
 *
 * NON-NEGOTIABLE invariant under test (crisis specialist C3/C4): the probe verdict
 * is strictly ADDITIVE — a `live` probe may UPGRADE confidence ("quiet, proven
 * alive") but must NEVER downgrade/mask/suppress a real liveness or spike alert.
 */

import {
  assert,
  assertEquals,
  assertFalse,
} from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import {
  evaluateLiveness,
  evaluateSpike,
  evaluateProbeLiveness,
} from '../crisis-detection-alerting/alertLogic.ts';

// Anchor "now" deterministically. 2026-06-13T12:00:00Z.
const NOW = Date.parse('2026-06-13T12:00:00.000Z');
const HOUR = 3_600_000;
const PROBE_STALE_HOURS = 12; // probe runs every 6h; threshold tolerates one missed run + slack

// ---------------------------------------------------------------------------
// evaluateProbeLiveness — authoritative dead-pipeline guard for the probe leg
// ---------------------------------------------------------------------------

// Probe younger than threshold → live, no alert.
Deno.test('probe: fresh probe younger than threshold → live, no alert', () => {
  const v = evaluateProbeLiveness({
    lastProbeAt: new Date(NOW - (PROBE_STALE_HOURS - 1) * HOUR).toISOString(),
    nowMs: NOW,
    stalenessThresholdHours: PROBE_STALE_HOURS,
  });
  assertFalse(v.alert);
  assertEquals(v.status, 'live');
});

// Exactly AT the threshold → alert-on-equal (bias-to-alert, mirrors evaluateLiveness).
Deno.test('probe: exactly at threshold → dead alert (alert-on-equal)', () => {
  const v = evaluateProbeLiveness({
    lastProbeAt: new Date(NOW - PROBE_STALE_HOURS * HOUR).toISOString(),
    nowMs: NOW,
    stalenessThresholdHours: PROBE_STALE_HOURS,
  });
  assert(v.alert);
  assertEquals(v.status, 'dead');
});

// Older than threshold → dead alert (authoritative, NOT advisory).
Deno.test('probe: probe older than threshold → dead alert (authoritative)', () => {
  const v = evaluateProbeLiveness({
    lastProbeAt: new Date(NOW - (PROBE_STALE_HOURS + 6) * HOUR).toISOString(),
    nowMs: NOW,
    stalenessThresholdHours: PROBE_STALE_HOURS,
  });
  assert(v.alert);
  assertEquals(v.status, 'dead');
  assert((v.ageHours ?? 0) >= PROBE_STALE_HOURS);
});

// No probe ever recorded (empty marker table) → cold_start advisory, NOT a page.
// (Before the first scheduled run; the setup checklist asserts the first probe lands.)
Deno.test('probe: null lastProbeAt → cold_start (advisory, never silently live)', () => {
  const v = evaluateProbeLiveness({
    lastProbeAt: null,
    nowMs: NOW,
    stalenessThresholdHours: PROBE_STALE_HOURS,
  });
  assertFalse(v.alert);
  assertEquals(v.status, 'cold_start');
  assert(v.status !== 'live'); // must NOT read as proven-alive
});

// Probe timestamp in the FUTURE (clock skew) → handled deterministically, treated as
// live (not inverted into a huge staleness), anomaly noted — mirrors evaluateLiveness.
Deno.test('probe: future lastProbeAt (clock skew) → future_skew, no alert', () => {
  const v = evaluateProbeLiveness({
    lastProbeAt: new Date(NOW + 3 * HOUR).toISOString(),
    nowMs: NOW,
    stalenessThresholdHours: PROBE_STALE_HOURS,
  });
  assertFalse(v.alert);
  assertEquals(v.status, 'future_skew');
});

// ---------------------------------------------------------------------------
// Composition invariant — the probe NEVER downgrades a real verdict (C3/C4)
// ---------------------------------------------------------------------------

const STALE_HOURS = 48;
const SPIKE_X = 3;
const SPIKE_MIN = 5;

// A live probe must NOT cancel a real liveness (stale) alert: shouldAlert is OR-only.
Deno.test('composition: live probe does NOT mask a real stale-liveness alert', () => {
  const realLiveness = evaluateLiveness({
    lastDetectionAt: new Date(NOW - (STALE_HOURS + 1) * HOUR).toISOString(),
    totalDetectionsRetained: 5,
    nowMs: NOW,
    stalenessThresholdHours: STALE_HOURS,
  });
  const spike = evaluateSpike({
    todayCount: 0,
    baselineCounts: [0, 0, 0],
    spikeMultiplier: SPIKE_X,
    minAbsoluteForSpike: SPIKE_MIN,
  });
  const probe = evaluateProbeLiveness({
    lastProbeAt: new Date(NOW - 1 * HOUR).toISOString(), // fresh / live
    nowMs: NOW,
    stalenessThresholdHours: PROBE_STALE_HOURS,
  });
  assert(realLiveness.alert);     // real pipeline is stale
  assertFalse(probe.alert);       // probe leg is live
  // The alerter composes with OR — a live probe cannot zero this out.
  const shouldAlert = realLiveness.alert || spike.alert || probe.alert;
  assert(shouldAlert, 'a real stale-liveness alert must survive a live probe');
});

// A live probe must NOT cancel a real spike alert either.
Deno.test('composition: live probe does NOT mask a real volume-spike alert', () => {
  const realLiveness = evaluateLiveness({
    lastDetectionAt: new Date(NOW - 1 * HOUR).toISOString(),
    totalDetectionsRetained: 20,
    nowMs: NOW,
    stalenessThresholdHours: STALE_HOURS,
  });
  const spike = evaluateSpike({
    todayCount: 30,
    baselineCounts: [2, 2, 2],
    spikeMultiplier: SPIKE_X,
    minAbsoluteForSpike: SPIKE_MIN,
  });
  const probe = evaluateProbeLiveness({
    lastProbeAt: new Date(NOW - 1 * HOUR).toISOString(),
    nowMs: NOW,
    stalenessThresholdHours: PROBE_STALE_HOURS,
  });
  assert(spike.alert);
  assertFalse(probe.alert);
  const shouldAlert = realLiveness.alert || spike.alert || probe.alert;
  assert(shouldAlert, 'a real spike alert must survive a live probe');
});

// The probe ADDS coverage: at zero real volume (real liveness merely `unproven`,
// advisory) a DEAD probe escalates to an authoritative page — the dead-vs-quiet
// discriminator this work item exists to provide.
Deno.test('composition: dead probe escalates the zero-volume unproven state to a page', () => {
  const realLiveness = evaluateLiveness({
    lastDetectionAt: null,
    totalDetectionsRetained: 0,
    nowMs: NOW,
    stalenessThresholdHours: STALE_HOURS,
  });
  const spike = evaluateSpike({
    todayCount: 0,
    baselineCounts: [0, 0],
    spikeMultiplier: SPIKE_X,
    minAbsoluteForSpike: SPIKE_MIN,
  });
  const probe = evaluateProbeLiveness({
    lastProbeAt: new Date(NOW - (PROBE_STALE_HOURS + 1) * HOUR).toISOString(), // dead
    nowMs: NOW,
    stalenessThresholdHours: PROBE_STALE_HOURS,
  });
  assertFalse(realLiveness.alert);      // unproven is advisory, not a page
  assertEquals(realLiveness.status, 'unproven');
  assert(probe.alert);                  // probe says the pipeline is dead
  const shouldAlert = realLiveness.alert || spike.alert || probe.alert;
  assert(shouldAlert, 'a dead probe must page even when real volume is zero/unproven');
});
