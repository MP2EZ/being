/**
 * alertLogic.ts — pure decision logic for INFRA-219 crisis-detection alerting.
 *
 * Runtime-free and side-effect-free by design: no network, no Supabase client, no
 * Date.now(). `nowMs` is injected so the staleness comparison is deterministic and
 * unit-testable. The edge function (index.ts) wires these against the live views.
 *
 * Responsibilities, kept separate:
 *   - evaluateLiveness      : is the detection→Supabase pipeline alive? (safety-critical)
 *   - evaluateProbeLiveness : has the INFRA-265 synthetic probe landed recently? — the
 *                             authoritative dead-vs-quiet discriminator for the ingest leg.
 *   - evaluateSpike         : is today's volume an anomalous spike vs the trailing baseline?
 *   - evaluateBackfill      : did a CLOSED day grow since we last evaluated it? (DEBUG-541)
 *   - buildAlertPayload     : assemble a PII-free, counts-only alert body with the ≥N
 *                             minimum-count floor applied before anything leaves Supabase.
 *
 * NON-NEGOTIABLE invariants (crisis + compliance + security planning passes):
 *   - Liveness is decided by the AGE of last_detection_at, NEVER by volume==0. A quiet
 *     day and a dead pipeline are NOT the same; only age (monotonic) separates them.
 *     At zero real volume passive staleness is advisory (`unproven`); the INFRA-265
 *     synthetic probe (evaluateProbeLiveness) supplies the authoritative dead-vs-quiet
 *     signal — but ONLY for the ingest/cron/edge leg it drives, NOT the on-device emit
 *     leg (which the manual release-time active-liveness assertion still covers).
 *   - The probe verdict is strictly ADDITIVE: it may UPGRADE confidence or RAISE a
 *     dead-pipeline page, but must NEVER downgrade/mask a real liveness or spike alert.
 *   - Nothing identifiable ever enters a payload: no user_id, session_id, raw scores,
 *     Q9 value, sub-day timestamps, or distinct_sessions. Counts and bucket labels only.
 *   - Per-bucket rows below the floor are SUPPRESSED from the external breakdown but still
 *     COUNTED in the aggregate — never silently dropped (k-anon is not claimed; a rare
 *     crisis is real signal, it just isn't transmitted at row granularity).
 *   - DEBUG-541: the series is keyed on OCCURRENCE time, but "have I already evaluated
 *     this day" is keyed on INGEST. Without that second key a backfilled detection lands
 *     in an already-closed day, is never spike-tested, AND raises the baseline the next
 *     genuine spike is measured against — trading a visible false positive for a silent
 *     false negative. The backfill axis is strictly ADDITIVE, like the probe.
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
        'No crisis_detected rows retained yet — real-detection liveness unproven (not ' +
        'healthy). The INFRA-265 synthetic probe now backstops this for the ingest/cron/edge ' +
        'leg; the on-device emit leg remains covered by the manual release-time ' +
        'active-liveness assertion.',
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
// Probe liveness (INFRA-265) — authoritative dead-vs-quiet for the ingest leg
// ---------------------------------------------------------------------------

export interface ProbeLivenessInput {
  /** ISO timestamp of the most recent synthetic probe (MAX(probed_at)), or null if none. */
  lastProbeAt: string | null;
  /** Injected "now" in epoch ms (deterministic; no Date.now in this module). */
  nowMs: number;
  /**
   * Alert when the latest probe is >= this many hours old. Set to the probe cadence
   * plus tolerance for one missed run (operator-tunable, env-sourced in index.ts).
   */
  stalenessThresholdHours: number;
}

export type ProbeStatus = 'live' | 'dead' | 'cold_start' | 'future_skew';

export interface ProbeLivenessVerdict {
  alert: boolean;
  status: ProbeStatus;
  /** Hours since the last probe; null when no probe has landed (cold start). */
  ageHours: number | null;
  detail: string;
}

/**
 * Decide whether the synthetic-probe pipeline is alive from the AGE of the most recent
 * probe marker. This is the active counterpart to evaluateLiveness's passive staleness:
 * a missed probe is an AUTHORITATIVE dead-pipeline page (for the ingest/cron/edge leg the
 * probe drives), not the advisory `unproven` that real zero-volume yields.
 *
 * SCOPE (mandatory honesty — crisis specialist C8): a live probe proves only that the
 * cron → edge → PostgREST write leg is alive. It does NOT run the React Native app code,
 * so it is NOT proof the on-device emit path works — that stays covered by the manual
 * release-time active-liveness assertion. Do not read a `live` probe as end-to-end.
 *
 * - No probe ever recorded (null) → `cold_start`: advisory, NOT a page (this is the
 *   pre-first-run state; the setup checklist confirms the first probe lands). Surfaced as
 *   cold_start so it is never silently read as `live`.
 * - probe timestamp in the future (clock skew) → `future_skew`: treated as live, flagged,
 *   never inverted into a spurious huge staleness.
 * - age >= threshold → `dead` ALERT (alert-on-equal; bias toward alerting).
 * - otherwise → `live`.
 */
export function evaluateProbeLiveness(input: ProbeLivenessInput): ProbeLivenessVerdict {
  const { lastProbeAt, nowMs, stalenessThresholdHours } = input;

  if (lastProbeAt === null) {
    return {
      alert: false,
      status: 'cold_start',
      ageHours: null,
      detail:
        'No synthetic probe marker recorded yet — probe liveness cold-start (not proven ' +
        'alive). Confirm the first scheduled probe lands per the setup checklist.',
    };
  }

  const ageMs = nowMs - Date.parse(lastProbeAt);
  const ageHours = ageMs / MS_PER_HOUR;

  if (ageMs < 0) {
    return {
      alert: false,
      status: 'future_skew',
      ageHours: round1(ageHours),
      detail: 'last probe is in the future (clock skew); treated as live, anomaly noted.',
    };
  }

  if (ageHours >= stalenessThresholdHours) {
    return {
      alert: true,
      status: 'dead',
      ageHours: round1(ageHours),
      detail:
        `Last synthetic probe ${round1(ageHours)}h ago >= ${stalenessThresholdHours}h threshold — ` +
        'the ingest/cron/edge pipeline appears DEAD (authoritative). Run the manual ' +
        'active-liveness assertion to also confirm the on-device emit leg.',
    };
  }

  return {
    alert: false,
    status: 'live',
    ageHours: round1(ageHours),
    detail: `Last synthetic probe ${round1(ageHours)}h ago — within ${stalenessThresholdHours}h threshold (ingest leg live).`,
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
// Backfill (DEBUG-541) — did a day we already closed the books on grow?
// ---------------------------------------------------------------------------

/** Per-day counts, keyed 'YYYY-MM-DD'. */
export type DayCounts = Record<string, number>;

export interface BackfillInput {
  /** Per-day occurrence counts as THIS run observes them, gap-filled over the window. */
  currentCounts: DayCounts;
  /**
   * The same map as recorded by the newest prior run that completed cleanly AND persisted
   * one. `null` means no usable watermark — a first run, or a run from the pre-deploy
   * alerter whose column is NULL. Both are cold start; neither may page.
   */
  watermark: DayCounts | null;
  /** Today ('YYYY-MM-DD'). Excluded — today is the spike axis's job, not this one. */
  today: string;
  /** A closed day growing by at least this much is REPORTED. */
  minGrowthToReport: number;
  /** Ratio a grown day must clear against its CURRENT neighbours to page. */
  spikeMultiplier: number;
  /** Absolute floor a grown day must clear to page (never page on 1-vs-0). */
  minAbsoluteForSpike: number;
}

export type BackfillStatus = 'cold_start' | 'none' | 'backfill';

/** A closed day whose count grew. Day precision only — never a sub-day timestamp. */
export interface GrownDay {
  day: string;
  priorCount: number;
  currentCount: number;
  delta: number;
}

export interface BackfillVerdict {
  alert: boolean;
  status: BackfillStatus;
  grownDays: GrownDay[];
  detail: string;
}

/**
 * Decide whether any CLOSED day grew since the last evaluated run.
 *
 * Why this exists at all: the cron is daily and the spike test reads only the current day,
 * so once event-time attribution lands, every backfilled detection arrives into a day that
 * has already been evaluated and will never be evaluated again. It is invisible to the
 * spike test and it silently lifts the trailing baseline. This axis is the second key.
 *
 * EDGE-TRIGGERED, deliberately. A stateless "re-check the whole window every run" would be
 * level-triggered: it re-pages for the same day every day until it ages out, which trains
 * the reader to ignore the axis. The watermark is what makes a page mean "something changed
 * since you last looked".
 *
 * ONLY days present as KEYS in the watermark are evaluated. A day absent from it was never
 * previously evaluated, so it cannot be shown to have GROWN — and treating absent as zero
 * would make the first run after the window slides report the whole tail as backfill. This
 * is also why the caller must persist a GAP-FILLED map: with gap-filling, "key present with
 * count 0" and "key absent" mean different things, and only the first is a real prior.
 *
 * Growth magnitude is an INDEPENDENT trigger from the ratio. Backfill raises the baseline,
 * so a day's own neighbours may have grown too — meaning a backfill can mask the very day it
 * lands on if the ratio were the only gate. A day that grows by >= minGrowthToReport is
 * therefore always REPORTED even when it does not page.
 *
 * The per-day ratio is computed from CURRENT neighbour counts, excluding the day itself —
 * never from the stored watermark, which is by definition the stale view.
 */
export function evaluateBackfill(input: BackfillInput): BackfillVerdict {
  const {
    currentCounts,
    watermark,
    today,
    minGrowthToReport,
    spikeMultiplier,
    minAbsoluteForSpike,
  } = input;

  if (watermark === null) {
    return {
      alert: false,
      status: 'cold_start',
      grownDays: [],
      detail:
        'No usable watermark from a prior run (first run, or the previous run predates ' +
        'DEBUG-541) — recording this run’s counts as the baseline. Deliberately NOT a page: ' +
        'reading an absent watermark as an empty map would report the entire series as ' +
        'backfill on the first run after deploy.',
    };
  }

  const grownDays: GrownDay[] = [];
  for (const day of Object.keys(watermark)) {
    if (day === today) continue; // today is still open; the spike axis owns it
    const priorCount = watermark[day] ?? 0;
    const currentCount = currentCounts[day] ?? priorCount;
    const delta = currentCount - priorCount;
    if (delta >= minGrowthToReport && delta > 0) {
      grownDays.push({ day, priorCount, currentCount, delta });
    }
  }
  grownDays.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));

  if (grownDays.length === 0) {
    return {
      alert: false,
      status: 'none',
      grownDays: [],
      detail: 'No closed day grew since the last evaluated run.',
    };
  }

  // Page only if a grown day also looks anomalous against its CURRENT neighbours.
  const pageWorthy = grownDays.filter((g) => {
    if (g.currentCount < minAbsoluteForSpike) return false;
    const neighbours = Object.keys(watermark)
      .filter((d) => d !== g.day && d !== today)
      .map((d) => currentCounts[d] ?? watermark[d] ?? 0);
    if (neighbours.length === 0) return false;
    const mean = neighbours.reduce((a, b) => a + b, 0) / neighbours.length;
    return g.currentCount >= mean * spikeMultiplier;
  });

  const summary = grownDays
    .map((g) => `${g.day} ${g.priorCount}→${g.currentCount} (+${g.delta})`)
    .join(', ');

  return {
    alert: pageWorthy.length > 0,
    status: 'backfill',
    grownDays,
    detail:
      `${grownDays.length} closed day(s) grew since the last evaluated run: ${summary}. ` +
      (pageWorthy.length > 0
        ? `${pageWorthy.length} of them also clear the spike test against current neighbours.`
        : 'None clear the spike test against current neighbours — reported, not paged.'),
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

/**
 * Which axes tripped, '+'-joined in fixed order (liveness, spike, probe, backfill) — e.g.
 * 'liveness', 'probe', 'liveness+spike', 'liveness+spike+probe+backfill'. A free-form
 * composed string (not a closed union) so adding an axis needs no type churn.
 */
export type AlertReason = string;

/** Compose the reason label from the tripped axes, in fixed order. '' when none tripped. */
export function composeReason(
  livenessAlert: boolean,
  spikeAlert: boolean,
  probeAlert: boolean,
  backfillAlert: boolean,
): AlertReason {
  const axes: string[] = [];
  if (livenessAlert) axes.push('liveness');
  if (spikeAlert) axes.push('spike');
  if (probeAlert) axes.push('probe');
  if (backfillAlert) axes.push('backfill');
  return axes.join('+');
}

/**
 * Per-window provenance counts (DEBUG-541). Every field is a COUNT or a ratio — no
 * identifier, no timestamp. These exist so the alert can say how much of the occurrence
 * series is real event time; the mixed population is permanent, so an unlabelled
 * occurrence number would be a number whose basis the reader cannot know.
 */
export interface ProvenanceCounts {
  /** Rows in the window attributed by their own detected_on. */
  eventTimeRows: number;
  /** Rows attributed by ingest date — no usable detected_on. */
  ingestTimeRows: number;
  /** Rows whose detected_on was later than ingest (untrusted clock), so it was rejected. */
  clockSkewCount: number;
  /** Rows whose detected_on fell before the horizon, so it was rejected. */
  implausiblePastCount: number;
}

export interface AlertPayloadInput {
  reason: AlertReason;
  liveness: LivenessVerdict;
  spike: SpikeVerdict;
  /** INFRA-265 synthetic-probe verdict (the ingest/cron/edge-leg liveness axis). */
  probe: ProbeLivenessVerdict;
  /** DEBUG-541 backfill verdict (did a closed day grow since we last looked?). */
  backfill: BackfillVerdict;
  /** Today's OCCURRENCE count — right-truncated by construction (see evaluateBackfill). */
  todayVolume: number;
  /** Today's ARRIVAL count (ingest-keyed, never truncated). Pairs with todayVolume. */
  arrivalToday: number;
  /** Provenance split over the evaluated window. */
  provenance: ProvenanceCounts;
  buckets: BucketRow[];
  /** Minimum per-bucket count to transmit a row externally (compliance floor; >= 3). */
  bucketFloor: number;
  /** Day-truncated date string (YYYY-MM-DD) of last detection, or null. */
  lastDetectionDate: string | null;
}

export interface AlertPayload {
  reason: AlertReason;
  /** OCCURRENCE count for today. Right-truncated: devices that detected today and have
   *  not yet flushed are not in it. Always read alongside `arrivalToday`. */
  todayVolume: number;
  /** ARRIVAL count for today (ingest-keyed). Never truncated. A large gap between this
   *  and `todayVolume` means a backlog flushed, not that a surge occurred. */
  arrivalToday: number;
  liveness: { status: LivenessStatus; alert: boolean; ageHours: number | null };
  spike: { status: SpikeStatus; alert: boolean; baselineMean: number | null };
  /** Probe leg (INFRA-265): proves cron/edge/ingest only, NOT the on-device emit path. */
  probe: { status: ProbeStatus; alert: boolean; ageHours: number | null };
  /** Backfill axis (DEBUG-541). `cold_start` is stated explicitly, never rendered as
   *  "no backfill" — an absent watermark is not evidence that nothing grew. */
  backfill: { status: BackfillStatus; alert: boolean; grownDays: GrownDay[] };
  /** Counts only. `fallbackShare` is 0..1 over the window; null when the window is empty
   *  (a share of "0 of 0" would read as fully trustworthy, which is the wrong direction). */
  provenance: ProvenanceCounts & { fallbackShare: number | null };
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
  const {
    reason,
    liveness,
    spike,
    probe,
    backfill,
    todayVolume,
    arrivalToday,
    provenance,
    buckets,
    bucketFloor,
    lastDetectionDate,
  } = input;

  const attributedRows = provenance.eventTimeRows + provenance.ingestTimeRows;
  const fallbackShare =
    attributedRows > 0 ? round1((provenance.ingestTimeRows / attributedRows) * 100) / 100 : null;

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
    arrivalToday,
    liveness: { status: liveness.status, alert: liveness.alert, ageHours: liveness.ageHours },
    spike: { status: spike.status, alert: spike.alert, baselineMean: spike.baselineMean },
    probe: { status: probe.status, alert: probe.alert, ageHours: probe.ageHours },
    backfill: {
      status: backfill.status,
      alert: backfill.alert,
      grownDays: backfill.grownDays,
    },
    provenance: { ...provenance, fallbackShare },
    buckets: included,
    suppressedBucketCount,
    suppressedDetectionTotal,
    bucketFloor,
    lastDetectionDate,
  };
}

// ---------------------------------------------------------------------------
// External dead-man's-switch gate (INFRA-264)
// ---------------------------------------------------------------------------

/**
 * Decide whether this run may emit a success ping to the external healthchecks.io
 * dead-man's-switch (INFRA-264). Pure by design (no network, no Deno.env) so the
 * load-bearing gate is unit-tested, not buried in the edge glue — the actual GET ping
 * lives in index.ts.
 *
 * The contract is the whole point of a dead-man's-switch: a success ping means ONLY
 * "this alerting run completed cleanly AND persisted its own heartbeat" — i.e. the SAME
 * clean-evaluation condition as a `crisis_alert_runs` 'ok'/'alerted' heartbeat. It pings
 * iff `errorCount === 0`, where `errorCount` is the run's FINAL error tally *after* the
 * heartbeat insert (so a failed heartbeat write also suppresses the ping). An 'alerted'
 * run is still a clean run → it pings (the email and the heartbeat ping are orthogonal).
 *
 * The safety property is in the SILENCE: any error → no ping → healthchecks.io sees a
 * missed expected ping within its grace window → it pages the founder. This is the only
 * layer that survives a total Supabase/edge outage that blinds both the alerter and its
 * in-Supabase watchdog (which share Supabase's failure domain). It proves NOTHING about
 * crisis detection, the on-device emit leg, or ingest — only that this cron ran clean.
 */
export function shouldPingHealthcheck(input: { errorCount: number }): boolean {
  return input.errorCount === 0;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
