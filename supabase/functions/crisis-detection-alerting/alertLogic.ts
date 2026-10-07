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
// Count window (MAINT-740) — the gap-filled per-day series a run evaluates
// ---------------------------------------------------------------------------

export interface CountWindowRow {
  event_date: string;
  detection_count: number;
}

export interface CountWindow {
  /** UTC 'YYYY-MM-DD' of nowMs. */
  today: string;
  todayCount: number;
  /** Newest first: [today-1, …, today-baselineDays]. Excludes today. */
  baselineCounts: number[];
  /** today and the baselineDays before it, every day a PRESENT key (0 when quiet). */
  currentCounts: DayCounts;
}

const DAY_MS = 86_400_000;

/** YYYY-MM-DD (UTC). */
function dayString(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Build the gap-filled per-day count map a run evaluates (a quiet day is a real 0, not a
 * missing row).
 *
 * Gap-filling is load-bearing, not tidiness (DEBUG-541): currentCounts is persisted as the
 * next run's watermark, and evaluateBackfill only considers days that are KEYS in it — so
 * "present with count 0" and "absent" must mean different things, or a day sliding out of
 * the window reads as growth-from-zero. Today's key is load-bearing even at 0 (DEBUG-684):
 * the next run reads the latest key as this run's partial day.
 */
export function buildCountWindow(input: {
  volumeRows: CountWindowRow[];
  nowMs: number;
  baselineDays: number;
}): CountWindow {
  const { volumeRows, nowMs, baselineDays } = input;
  const countByDay = new Map<string, number>();
  for (const r of volumeRows) {
    countByDay.set(r.event_date.slice(0, 10), r.detection_count);
  }
  const today = dayString(nowMs);
  const todayCount = countByDay.get(today) ?? 0;
  const baselineCounts: number[] = [];
  for (let i = 1; i <= baselineDays; i++) {
    baselineCounts.push(countByDay.get(dayString(nowMs - i * DAY_MS)) ?? 0);
  }
  const currentCounts: DayCounts = {};
  for (let i = 0; i <= baselineDays; i++) {
    const d = dayString(nowMs - i * DAY_MS);
    currentCounts[d] = countByDay.get(d) ?? 0;
  }
  return { today, todayCount, baselineCounts, currentCounts };
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
  /**
   * Whether the run that wrote the watermark PAGED a spike on its own today — which is the
   * partial day. Read from that row via priorRunPagedSpike, never recomputed. Absent =
   * not paged, so a missing input fails toward paging.
   */
  priorPaged?: boolean;
}

export type BackfillStatus =
  | 'cold_start'
  | 'none'
  | 'backfill'
  | 'partial_day'
  | 'backfill+partial_day';

/**
 * The day the previous run counted while it was still open (DEBUG-684). Day precision and
 * counts only — never the run's timestamp.
 */
export interface PartialDayReading {
  day: string;
  /** Its count as the previous run saw it, part-way through the day. */
  priorCount: number;
  /** Its full count now; null when the day has left the window and cannot be evaluated. */
  currentCount: number | null;
  delta: number | null;
  evaluable: boolean;
  /** The previous run already paged this day as a VOLUME spike. */
  priorPaged: boolean;
  /** FULL-DAY SPIKE page: the full count newly clears the spike test. */
  alert: boolean;
  /** Counted into backfill_status as `partial_day`. */
  reported: boolean;
}

/** A closed day whose count grew. Day precision only — never a sub-day timestamp. */
export interface GrownDay {
  day: string;
  priorCount: number;
  currentCount: number;
  delta: number;
}

export interface BackfillVerdict {
  /** CLOSED-day page only. The partial day pages through `partialDay.alert`. */
  alert: boolean;
  status: BackfillStatus;
  /** Closed days only — the partial day never appears here. */
  grownDays: GrownDay[];
  partialDay: PartialDayReading | null;
  detail: string;
}

/**
 * Did the run that wrote the watermark page a spike? Read from its own row rather than
 * recomputed. Any other value, null included, reads as not paged.
 */
export function priorRunPagedSpike(
  row: { spike_status?: unknown; status?: unknown } | null,
): boolean {
  return row?.spike_status === 'spike' && row?.status === 'alerted';
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The partial day: the watermark's latest date-shaped key, if it is earlier than today.
 * By construction that key IS the previous run's own today — the day its `spike_status`
 * describes. Deliberately not `dayString(ran_at)` (crisis AC0 ruling R5): `ran_at` is the DB
 * clock at insert, and a run straddling midnight or an edge/DB skew would apply day D's
 * verdict to D-1. A later key than today is degenerate → no partial day, every other key
 * is read as closed (over-reports, never under-reports). Non-date keys are ignored, so a
 * future map format cannot become the partial day.
 */
function partialDayOf(watermark: DayCounts, today: string): string | null {
  let latest: string | null = null;
  for (const k of Object.keys(watermark)) {
    if (DATE_KEY.test(k) && (latest === null || k > latest)) latest = k;
  }
  return latest !== null && latest < today ? latest : null;
}

/**
 * Decide whether any CLOSED day grew since the last evaluated run, and read the partial day
 * separately (DEBUG-684).
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
 *
 * THE PARTIAL DAY (DEBUG-684). The previous run counted its own today part-way through, so
 * that day's ordinary later traffic is growth on a day that was never closed. It is NOT
 * excluded (crisis ruling, INFRA-613 (b)): its full count is the only full-day check of the
 * window after the run, and back-dated rows can land on it too. Instead it is read on its
 * own: never in `grownDays`, never `backfill`, and it pages as a FULL-DAY SPIKE when its full
 * count clears evaluateSpike against current neighbours, the day itself moved, and the
 * previous run did not already page it — a verdict READ from that run's row, never
 * recomputed, since a neighbour that shrank (erasure) or a changed env would make a
 * recompute suppress a page that was never sent. Independent of minGrowthToReport: a day at
 * 4 when counted that ends at 6 against a zero baseline pages here and nowhere else.
 *
 * REMAINING GAP: count diffs cannot tell back-dated rows landing on the partial day from its
 * ordinary later traffic, so both are labelled partial-day. The full-day spike test still
 * covers them, which is the ruled reason not to exclude the day. Splitting them needs a
 * per-day arrival-vs-event view — a migration, out of scope here.
 */
export function evaluateBackfill(input: BackfillInput): BackfillVerdict {
  const {
    currentCounts,
    watermark,
    today,
    minGrowthToReport,
    spikeMultiplier,
    minAbsoluteForSpike,
    priorPaged = false,
  } = input;

  if (watermark === null) {
    return {
      alert: false,
      status: 'cold_start',
      grownDays: [],
      partialDay: null,
      detail:
        'No usable watermark from a prior run (first run, or the previous run predates ' +
        'DEBUG-541) — recording this run’s counts as the baseline. Deliberately NOT a page: ' +
        'reading an absent watermark as an empty map would report the entire series as ' +
        'backfill on the first run after deploy.',
    };
  }

  const partialDay = partialDayOf(watermark, today);

  const grownDays: GrownDay[] = [];
  for (const day of Object.keys(watermark)) {
    if (day === today) continue; // today is still open; the spike axis owns it
    if (day === partialDay) continue; // never closed; read separately below
    const priorCount = watermark[day] ?? 0;
    const currentCount = currentCounts[day] ?? priorCount;
    const delta = currentCount - priorCount;
    if (delta >= minGrowthToReport && delta > 0) {
      grownDays.push({ day, priorCount, currentCount, delta });
    }
  }
  grownDays.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));

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

  let partial: PartialDayReading | null = null;
  if (partialDay !== null) {
    const priorCount = watermark[partialDay] ?? 0;
    const currentCount = currentCounts[partialDay];
    if (currentCount === undefined) {
      // Left the window (prior clean run 8+ days back). Defaulting to the prior would read
      // as "unchanged" — a silent none. Say it could not be evaluated instead.
      partial = {
        day: partialDay, priorCount, currentCount: null, delta: null, evaluable: false,
        priorPaged, alert: false, reported: false,
      };
    } else {
      const delta = currentCount - priorCount;
      // The 7 days before it: exactly the baseline the previous run's spike test used, at
      // CURRENT values. A neighbour that slid out of this run's window keeps its watermark
      // value — never 0.
      const neighbours = Object.keys(watermark)
        .filter((d) => DATE_KEY.test(d) && d !== partialDay && d !== today)
        .map((d) => currentCounts[d] ?? watermark[d]);
      const fullDaySpike = evaluateSpike({
        todayCount: currentCount,
        baselineCounts: neighbours,
        spikeMultiplier,
        minAbsoluteForSpike,
      }).alert;
      const alert = delta > 0 && fullDaySpike && !priorPaged;
      partial = {
        day: partialDay, priorCount, currentCount, delta, evaluable: true, priorPaged, alert,
        reported: (delta > 0 && delta >= minGrowthToReport) || alert,
      };
    }
  }

  const closedGrew = grownDays.length > 0;
  const partialReported = partial?.reported ?? false;
  const status: BackfillStatus = closedGrew && partialReported
    ? 'backfill+partial_day'
    : closedGrew
      ? 'backfill'
      : partialReported
        ? 'partial_day'
        : 'none';

  const summary = grownDays
    .map((g) => `${g.day} ${g.priorCount}→${g.currentCount} (+${g.delta})`)
    .join(', ');
  const closedDetail = closedGrew
    ? `${grownDays.length} closed day(s) grew since the last evaluated run: ${summary}. ` +
      (pageWorthy.length > 0
        ? `${pageWorthy.length} of them also clear the spike test against current neighbours.`
        : 'None clear the spike test against current neighbours — reported, not paged.')
    : 'No closed day grew since the last evaluated run.';
  const partialDetail = partial === null
    ? ''
    : !partial.evaluable
      ? ` Partial day ${partial.day} is not evaluable: it has left the evaluated window.`
      : ` Partial day ${partial.day}: ${partial.priorCount}→${partial.currentCount}` +
        (partial.alert ? ' — FULL-DAY SPIKE: its full count newly clears the spike test.' : '.');

  return {
    alert: pageWorthy.length > 0,
    status,
    grownDays,
    partialDay: partial,
    detail: closedDetail + partialDetail,
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
  partialDayAlert = false,
): AlertReason {
  const axes: string[] = [];
  if (livenessAlert) axes.push('liveness');
  if (spikeAlert) axes.push('spike');
  if (probeAlert) axes.push('probe');
  if (backfillAlert) axes.push('backfill');
  if (partialDayAlert) axes.push('partial_day');
  return axes.join('+');
}

/** Which axes PAGE this run. Reported-but-not-paged readings never appear here. */
export interface AxisAlerts {
  liveness: boolean;
  spike: boolean;
  probe: boolean;
  /** A CLOSED day grew and cleared the spike test. */
  backfill: boolean;
  /** The partial day's full count newly cleared the spike test (FULL-DAY SPIKE). */
  partialDay: boolean;
}

export function alertAxes(input: {
  liveness: { alert: boolean };
  spike: { alert: boolean };
  probe: { alert: boolean };
  backfill: BackfillVerdict;
}): AxisAlerts {
  return {
    liveness: input.liveness.alert,
    spike: input.spike.alert,
    probe: input.probe.alert,
    backfill: input.backfill.alert,
    partialDay: input.backfill.partialDay?.alert ?? false,
  };
}

/** The send decision. Every axis is OR'd — no axis can suppress another. */
export function anyAxisTripped(a: AxisAlerts): boolean {
  return a.liveness || a.spike || a.probe || a.backfill || a.partialDay;
}

export const LIVENESS_ONLY_SUBJECT =
  '[Being] Crisis-detection LIVENESS alert — possible dead pipeline';

/**
 * Lead order (crisis AC0 rulings R3/R4): a dead probe makes every other number suspect, so it
 * leads; LIVENESS is habituated (it has paged daily since 2026-09-28), so it goes last. The
 * founder triages from a possibly truncated inbox subject.
 */
const SUBJECT_ORDER: Array<[keyof AxisAlerts, string]> = [
  ['probe', 'PROBE DEAD (ingest leg)'],
  ['spike', 'VOLUME SPIKE'],
  ['partialDay', 'FULL-DAY SPIKE'],
  ['backfill', 'BACKFILL SPIKE'],
  ['liveness', 'LIVENESS'],
];

/**
 * The email subject, naming every PAGING axis in lead order. Liveness alone keeps its
 * legacy string verbatim — the one special case. A reported-but-not-paged reading never
 * reaches the subject. The partial day is a FULL-DAY SPIKE and is never called backfill.
 */
export function composeSubject(a: AxisAlerts): string {
  const labels = SUBJECT_ORDER.filter(([k]) => a[k]).map(([, label]) => label);
  if (labels.length === 0) return '[Being] Crisis-detection alert'; // unreachable: no send
  if (labels.length === 1 && a.liveness) return LIVENESS_ONLY_SUBJECT;
  return `[Being] Crisis-detection ${labels.join(' + ')}`;
}

/** Keep only TODAY's crisis_detection_daily rows for the Detection mix. */
export function selectTodayBuckets(
  rows: Array<Partial<BucketRow> & { event_date?: unknown }>,
  today: string,
): BucketRow[] {
  return rows
    // A row without event_date cannot be attributed to a day, so it is dropped, not passed.
    .filter((r) => typeof r.event_date === 'string' && r.event_date.slice(0, 10) === today)
    .map((r) => ({
      assessment_type: r.assessment_type as string,
      trigger_type: r.trigger_type as string,
      severity_bucket: r.severity_bucket as string,
      detection_count: r.detection_count as number,
    }));
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
  backfill: {
    status: BackfillStatus;
    alert: boolean;
    grownDays: GrownDay[];
    partialDay: PartialDayReading | null;
  };
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
      partialDay: backfill.partialDay,
    },
    provenance: { ...provenance, fallbackShare },
    buckets: included,
    suppressedBucketCount,
    suppressedDetectionTotal,
    bucketFloor,
    lastDetectionDate,
  };
}

/** The backfill block of the email body. Day-level dates and counts only. */
export function composeBackfillLines(b: AlertPayload['backfill']): string[] {
  // Not "Backfill axis": a partial_day status under that heading is the misreading DEBUG-684 removes.
  const lines: string[] = ['', `Backfill / partial-day axis: ${b.status}.`];
  if (b.status === 'cold_start') {
    lines.push(
      '  No watermark from a prior run — this run recorded the baseline. This is NOT a ' +
        'statement that nothing was backfilled; it is a statement that we could not tell.',
    );
  } else if (b.grownDays.length > 0) {
    lines.push('  Closed days that grew since the last evaluated run:');
    for (const g of b.grownDays) {
      lines.push(`    - ${g.day}: ${g.priorCount} -> ${g.currentCount} (+${g.delta})`);
    }
    if (!b.alert) {
      lines.push('  Reported, not paged: none cleared the spike test against current neighbours.');
    }
  }
  const p = b.partialDay;
  if (p !== null && !p.evaluable) {
    lines.push(
      `  Partial day ${p.day}: not evaluable — it has left the evaluated window, so its full ` +
        'count was never checked.',
    );
  } else if (p !== null && p.currentCount !== null && p.delta !== null) {
    lines.push(
      '  Partial day completed since the last evaluated run (that run counted it before the ' +
        'day ended, so growth here is the day\'s own later traffic plus any back-dated rows ' +
        'landing on it):',
      `    - ${p.day}: ${p.priorCount} -> ${p.currentCount} (${p.delta >= 0 ? '+' : ''}${p.delta})` +
        (p.alert
          ? ' — FULL-DAY SPIKE: its full count clears the spike test against current neighbours.'
          : p.priorPaged
            ? ' (already paged as a VOLUME spike by the last evaluated run)'
            : ''),
    );
  }
  return lines;
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
