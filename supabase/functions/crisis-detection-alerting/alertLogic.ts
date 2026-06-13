/**
 * alertLogic.ts — pure decision logic for INFRA-219 crisis-detection alerting.
 *
 * Runtime-free and side-effect-free by design: no network, no Supabase client, no
 * Date.now(). `nowMs` is injected so the staleness comparison is deterministic and
 * unit-testable. The edge function (index.ts) wires these against the live views.
 *
 * Three responsibilities, kept separate:
 *   - evaluateLiveness  : is the detection→Supabase pipeline alive? (safety-critical)
 *   - evaluateSpike     : is today's volume an anomalous spike vs the trailing baseline?
 *   - buildAlertPayload : assemble a PII-free, counts-only alert body with the ≥N
 *                         minimum-count floor applied before anything leaves Supabase.
 *
 * NON-NEGOTIABLE invariants (crisis + compliance + security planning passes):
 *   - Liveness is decided by the AGE of last_detection_at, NEVER by volume==0. A quiet
 *     day and a dead pipeline are NOT the same; only age (monotonic) separates them.
 *     (A true dead-vs-quiet discriminator needs a synthetic end-to-end probe — tracked
 *     as a follow-up; this tranche ships passive staleness, advisory at zero volume.)
 *   - Nothing identifiable ever enters a payload: no user_id, session_id, raw scores,
 *     Q9 value, sub-day timestamps, or distinct_sessions. Counts and bucket labels only.
 *   - Per-bucket rows below the floor are SUPPRESSED from the external breakdown but still
 *     COUNTED in the aggregate — never silently dropped (k-anon is not claimed; a rare
 *     crisis is real signal, it just isn't transmitted at row granularity).
 */

const MS_PER_HOUR = 3_600_000;

// ---------------------------------------------------------------------------
// Liveness
// ---------------------------------------------------------------------------

export interface LivenessInput {
  /** ISO timestamp of the most recent crisis_detected, or null if none retained. */
  lastDetectionAt: string | null;
  /** total_detections_retained from crisis_detection_liveness. */
  totalDetectionsRetained: number;
  /** Injected "now" in epoch ms (deterministic; no Date.now in this module). */
  nowMs: number;
  /** Alert when age >= this many hours. Operator-tunable (env-sourced in index.ts). */
  stalenessThresholdHours: number;
}

export type LivenessStatus = 'fresh' | 'stale' | 'unproven' | 'future_skew';

export interface LivenessVerdict {
  alert: boolean;
  status: LivenessStatus;
  /** Hours since last detection; null when unproven (no detection retained). */
  ageHours: number | null;
  detail: string;
}

/**
 * Decide pipeline liveness from the age of the most recent detection.
 *
 * - No detection ever retained (null / total 0) → `unproven`: advisory, NOT a
 *   dead-pipeline page (at pre-launch zero-volume this is the legitimate state), but
 *   surfaced as unproven so it is never silently read as healthy.
 * - last_detection_at in the future (clock skew) → `future_skew`: treated as fresh,
 *   flagged as an anomaly, never inverted into a spurious huge staleness.
 * - age >= threshold → `stale` ALERT (alert-on-equal; bias toward alerting).
 * - otherwise → `fresh`.
 */
export function evaluateLiveness(input: LivenessInput): LivenessVerdict {
  const { lastDetectionAt, totalDetectionsRetained, nowMs, stalenessThresholdHours } = input;

  if (lastDetectionAt === null || totalDetectionsRetained <= 0) {
    return {
      alert: false,
      status: 'unproven',
      ageHours: null,
      detail:
        'No crisis_detected rows retained yet — liveness unproven (not healthy). ' +
        'Covered by the manual release-time active-liveness assertion until the ' +
        'synthetic end-to-end probe ships.',
    };
  }

  const ageMs = nowMs - Date.parse(lastDetectionAt);
  const ageHours = ageMs / MS_PER_HOUR;

  if (ageMs < 0) {
    return {
      alert: false,
      status: 'future_skew',
      ageHours: round1(ageHours),
      detail: 'last_detection_at is in the future (clock skew); treated as fresh, anomaly noted.',
    };
  }

  if (ageHours >= stalenessThresholdHours) {
    return {
      alert: true,
      status: 'stale',
      ageHours: round1(ageHours),
      detail: `Last detection ${round1(ageHours)}h ago >= ${stalenessThresholdHours}h threshold — possible dead pipeline.`,
    };
  }

  return {
    alert: false,
    status: 'fresh',
    ageHours: round1(ageHours),
    detail: `Last detection ${round1(ageHours)}h ago — within ${stalenessThresholdHours}h threshold.`,
  };
}

// ---------------------------------------------------------------------------
// Spike
// ---------------------------------------------------------------------------

export interface SpikeInput {
  /** Today's crisis_detected count. */
  todayCount: number;
  /** Trailing per-day counts (excluding today) for the baseline. */
  baselineCounts: number[];
  /** Alert when todayCount >= baselineMean * this. */
  spikeMultiplier: number;
  /** Absolute floor: below this, never a spike (so 1-vs-0 doesn't page). */
  minAbsoluteForSpike: number;
}

export type SpikeStatus = 'normal' | 'spike' | 'cold_start';

export interface SpikeVerdict {
  alert: boolean;
  status: SpikeStatus;
  /** Mean of the baseline window; null on cold start (no history). */
  baselineMean: number | null;
  detail: string;
}

/**
 * Decide whether today's volume is an anomalous spike vs the trailing baseline.
 *
 * - Empty baseline → `cold_start`: no div-by-zero, no false spike (the first days
 *   post-launch have nothing to compare against).
 * - Below the absolute floor → `normal`: a count of 1 against a zero baseline is real
 *   signal but not a "spike"; it still flows into the payload aggregate, just doesn't page.
 * - todayCount >= floor AND todayCount >= baselineMean*multiplier → `spike` ALERT
 *   (alert-on-equal). When baselineMean is 0, the floor is the sole gate (emergence
 *   from flat zero pages only once it clears the floor).
 */
export function evaluateSpike(input: SpikeInput): SpikeVerdict {
  const { todayCount, baselineCounts, spikeMultiplier, minAbsoluteForSpike } = input;

  if (baselineCounts.length === 0) {
    return {
      alert: false,
      status: 'cold_start',
      baselineMean: null,
      detail: 'No baseline history yet (cold start) — spike detection deferred until a window accrues.',
    };
  }

  const baselineMean = baselineCounts.reduce((a, b) => a + b, 0) / baselineCounts.length;

  if (todayCount < minAbsoluteForSpike) {
    return {
      alert: false,
      status: 'normal',
      baselineMean: round1(baselineMean),
      detail: `Today ${todayCount} below absolute floor ${minAbsoluteForSpike} — not a spike (count retained in aggregate).`,
    };
  }

  if (todayCount >= baselineMean * spikeMultiplier) {
    return {
      alert: true,
      status: 'spike',
      baselineMean: round1(baselineMean),
      detail: `Today ${todayCount} >= ${spikeMultiplier}x baseline mean ${round1(baselineMean)} — volume spike.`,
    };
  }

  return {
    alert: false,
    status: 'normal',
    baselineMean: round1(baselineMean),
    detail: `Today ${todayCount} within ${spikeMultiplier}x baseline mean ${round1(baselineMean)}.`,
  };
}

// ---------------------------------------------------------------------------
// Payload assembly
// ---------------------------------------------------------------------------

/** A per-day x bucket row from crisis_detection_daily (counts + category labels only). */
export interface BucketRow {
  assessment_type: string;
  trigger_type: string;
  severity_bucket: string;
  detection_count: number;
}

/** Public-facing bucket row — identical shape, but only emitted when count >= floor. */
export interface PublicBucket {
  assessment_type: string;
  trigger_type: string;
  severity_bucket: string;
  detection_count: number;
}

export type AlertReason = 'liveness' | 'spike' | 'liveness+spike';

export interface AlertPayloadInput {
  reason: AlertReason;
  liveness: LivenessVerdict;
  spike: SpikeVerdict;
  todayVolume: number;
  buckets: BucketRow[];
  /** Minimum per-bucket count to transmit a row externally (compliance floor; >= 3). */
  bucketFloor: number;
  /** Day-truncated date string (YYYY-MM-DD) of last detection, or null. */
  lastDetectionDate: string | null;
}

export interface AlertPayload {
  reason: AlertReason;
  todayVolume: number;
  liveness: { status: LivenessStatus; alert: boolean; ageHours: number | null };
  spike: { status: SpikeStatus; alert: boolean; baselineMean: number | null };
  /** Only rows with detection_count >= bucketFloor. */
  buckets: PublicBucket[];
  /** How many per-bucket rows were withheld for being below the floor. */
  suppressedBucketCount: number;
  /** Total detections folded into the suppressed set (counted, never dropped). */
  suppressedDetectionTotal: number;
  bucketFloor: number;
  /** Day-precision only — never an HH:MM:SS wall-clock (re-identification boundary). */
  lastDetectionDate: string | null;
}

/**
 * Assemble the PII-free alert payload. Carries counts, category labels, verdict
 * statuses, and a day-level date only. Per-bucket rows below `bucketFloor` are
 * withheld from the breakdown but their count is reported in aggregate. Returns
 * structured data; the edge function composes the human-readable subject/body from it.
 */
export function buildAlertPayload(input: AlertPayloadInput): AlertPayload {
  const { reason, liveness, spike, todayVolume, buckets, bucketFloor, lastDetectionDate } = input;

  const included: PublicBucket[] = [];
  let suppressedBucketCount = 0;
  let suppressedDetectionTotal = 0;

  for (const b of buckets) {
    if (b.detection_count >= bucketFloor) {
      included.push({
        assessment_type: b.assessment_type,
        trigger_type: b.trigger_type,
        severity_bucket: b.severity_bucket,
        detection_count: b.detection_count,
      });
    } else {
      suppressedBucketCount += 1;
      suppressedDetectionTotal += b.detection_count;
    }
  }

  return {
    reason,
    todayVolume,
    liveness: { status: liveness.status, alert: liveness.alert, ageHours: liveness.ageHours },
    spike: { status: spike.status, alert: spike.alert, baselineMean: spike.baselineMean },
    buckets: included,
    suppressedBucketCount,
    suppressedDetectionTotal,
    bucketFloor,
    lastDetectionDate,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
