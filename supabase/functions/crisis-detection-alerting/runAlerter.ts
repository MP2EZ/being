/**
 * runAlerter — the crisis-detection alerter's request handler (MAINT-740).
 *
 * Lifted out of index.ts so it can be exercised as production code: index.ts calls
 * serve() at module scope, so importing it starts a listener and no test can load it.
 * It takes the Request so the 405/401 gates under test are the deployed gates.
 *
 * Deliberately import-safe: no serve(), no Deno.env, no supabase-js, no network at import.
 * Env arrives as RESOLVED VALUES from index.ts, which reads every name by literal — the
 * INFRA-379 trust-domain pin and the INFRA-442 deploy-drift reconcile both match on those
 * literals (and on envInt's call sites), so they must stay in index.ts.
 *
 * Every invariant documented in index.ts's header still holds here: monitoring, NOT a safety
 * mechanism; reads only the operator views, never analytics_events; PII-free payloads; an
 * 'ok'/'alerted' heartbeat only on a clean run; the healthchecks ping is the last action and
 * is gated on the final error tally.
 */

import { timingSafeEqual } from 'node:crypto';
import {
  evaluateLiveness,
  evaluateProbeLiveness,
  evaluateSpike,
  evaluateBackfill,
  buildAlertPayload,
  buildCountWindow,
  composeReason,
  shouldPingHealthcheck,
  priorRunPagedSpike,
  alertAxes,
  anyAxisTripped,
  composeSubject,
  composeBackfillLines,
  selectTodayBuckets,
  type BucketRow,
  type DayCounts,
} from './alertLogic.ts';

export interface AlerterEnv {
  CRON_SECRET?: string;
  RESEND_API_KEY?: string;
  CRISIS_ALERT_FROM?: string;
  CRISIS_ALERT_TO?: string;
  CRISIS_HEALTHCHECK_PING_URL?: string;
  stalenessThresholdHours: number;
  spikeMultiplier: number;
  minAbsoluteForSpike: number;
  bucketFloor: number;
  baselineDays: number;
  probeStalenessHours: number;
}

export interface AlerterDeps {
  env: AlerterEnv;
  /** Invoked only after the 405/401 gates, so a rejected request never builds a client. */
  // deno-lint-ignore no-explicit-any
  supabase: () => { from(table: string): any };
  fetch: (input: string, init?: RequestInit) => Promise<Response>;
  /** The run's evaluation instant: day keys and staleness ages are computed from it. */
  nowMs: number;
}

/** Constant-time compare; false (without timing leak) when byte-lengths differ. */
function constantTimeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  if (aBytes.byteLength !== bBytes.byteLength) return false;
  return timingSafeEqual(aBytes, bBytes);
}

/**
 * Extract a human message from any thrown value. Supabase JS client errors are plain
 * objects ({message, details, hint, code}), NOT Error instances, so `String(e)` yields
 * the useless "[object Object]" — pull `.message` (or the next-best field) first.
 */
function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object') {
    const o = e as Record<string, unknown>;
    return String(o.message ?? o.error_description ?? o.error ?? JSON.stringify(e));
  }
  return String(e);
}

function dayString(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

interface VolumeRow {
  event_date: string;
  detection_count: number;
  // DEBUG-541 provenance split. Nullable in practice: a row read before the migration
  // lands carries none of these, so every consumer coalesces rather than assuming.
  event_time_rows?: number | null;
  ingest_time_rows?: number | null;
  clock_skew_count?: number | null;
  implausible_past_count?: number | null;
}

export async function runAlerter(req: Request, deps: AlerterDeps): Promise<Response> {
  // Evaluation clock (day keys, staleness ages) is injected so a test can pin the UTC day;
  // duration_ms keeps a real clock, or it would be garbage under a fixed nowMs.
  const startedMs = deps.nowMs;
  const wallStartMs = Date.now();
  const errors: string[] = [];

  // --- Auth: reject before any work, fail-closed, POST-only. ---
  if (req.method !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }
  const providedSecret = req.headers.get('x-cron-secret');
  const expectedSecret = deps.env.CRON_SECRET;
  if (!expectedSecret || !providedSecret || !constantTimeEqual(providedSecret, expectedSecret)) {
    return json(401, { error: 'Unauthorized' });
  }

  // --- Config (operator-tunable; resolved in index.ts by literal name via envInt). ---
  const {
    stalenessThresholdHours,
    spikeMultiplier,
    minAbsoluteForSpike,
    bucketFloor,
    baselineDays,
    probeStalenessHours,
  } = deps.env;

  const supabase = deps.supabase();

  // --- Read ONLY the operator views (never analytics_events). ---
  let totalDetectionsRetained = 0;
  let lastDetectionAt: string | null = null;
  let volumeRows: VolumeRow[] = [];
  let bucketRows: BucketRow[] = [];
  // DEBUG-541: the watermark must NOT be persisted by a run whose volume read failed.
  // Each view read has its own try/catch and execution CONTINUES, so without this flag a
  // failed read would persist an empty map and the next run would see the entire series as
  // grown-from-zero and page a full-series backfill alert.
  let volumeReadOk = false;
  let arrivalToday = 0;

  try {
    const { data, error } = await supabase
      .from('crisis_detection_liveness')
      .select('total_detections_retained, last_detection_at')
      .single();
    if (error) throw error;
    totalDetectionsRetained = data?.total_detections_retained ?? 0;
    lastDetectionAt = data?.last_detection_at ?? null;
  } catch (e) {
    errors.push(`liveness view read failed: ${errMsg(e)}`);
  }

  try {
    const { data, error } = await supabase
      .from('crisis_detection_volume_daily')
      .select(
        'event_date, detection_count, event_time_rows, ingest_time_rows, ' +
          'clock_skew_count, implausible_past_count',
      )
      .order('event_date', { ascending: false })
      .limit(baselineDays + 2);
    if (error) throw error;
    volumeRows = (data ?? []) as VolumeRow[];
    volumeReadOk = true;
  } catch (e) {
    errors.push(`volume view read failed: ${errMsg(e)}`);
  }

  try {
    const { data, error } = await supabase
      .from('crisis_detection_daily')
      .select('event_date, assessment_type, trigger_type, severity_bucket, detection_count')
      .order('event_date', { ascending: false })
      .limit(200);
    if (error) throw error;
    // Keep only TODAY's bucket rows for the breakdown. event_date MUST be selected: without
    // it every row passed the filter and the mix was the latest 200 rows across all days.
    bucketRows = selectTodayBuckets(
      (data ?? []) as Array<BucketRow & { event_date?: string }>,
      dayString(startedMs),
    );
  } catch (e) {
    errors.push(`daily view read failed: ${errMsg(e)}`);
  }

  // INFRA-265: read the latest synthetic-probe marker (MAX(probed_at)). Independent input
  // from a SEPARATE table — it can never alter any real-detection number (todayCount,
  // baseline, lastDetectionAt). A failed read becomes an 'error' run → watchdog escalates.
  let lastProbeAt: string | null = null;
  try {
    const { data, error } = await supabase
      .from('crisis_liveness_probe')
      .select('probed_at')
      .order('probed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    lastProbeAt = data?.probed_at ?? null;
  } catch (e) {
    errors.push(`probe marker read failed: ${errMsg(e)}`);
  }

  // DEBUG-541: today's ARRIVAL count (ingest-keyed). The occurrence series is
  // right-truncated — a device that detected today and has not flushed is not in today's
  // occurrence count and cannot be — so evaluating on occurrence alone goes blind at the
  // LEADING edge. This is the un-truncated counterpart, and it is what lets the alert say
  // "a backlog flushed" instead of "a spike occurred".
  try {
    const { data, error } = await supabase
      .from('crisis_detection_arrival_daily')
      .select('arrival_date, arrival_count')
      .order('arrival_date', { ascending: false })
      .limit(baselineDays + 2);
    if (error) throw error;
    const todayKey = dayString(startedMs);
    const row = ((data ?? []) as Array<{ arrival_date: string; arrival_count: number }>).find(
      (r) => typeof r.arrival_date === 'string' && r.arrival_date.slice(0, 10) === todayKey,
    );
    arrivalToday = row?.arrival_count ?? 0;
  } catch (e) {
    errors.push(`arrival view read failed: ${errMsg(e)}`);
  }

  // DEBUG-541: the backfill watermark — per-day counts as the last CLEAN run saw them.
  // Read only from a run that both completed cleanly AND persisted a map. A NULL map is a
  // run from the pre-deploy alerter; that is a COLD START, not an empty map, and the
  // distinction is what stops the first run after deploy paging the whole series.
  // DEBUG-684: the same row's spike verdict says whether that run already paged the partial
  // day. Read, never recomputed (see evaluateBackfill).
  let watermark: DayCounts | null = null;
  let priorPaged = false;
  try {
    const { data, error } = await supabase
      .from('crisis_alert_runs')
      .select('evaluated_counts, spike_status, status')
      .in('status', ['ok', 'alerted'])
      .not('evaluated_counts', 'is', null)
      .order('ran_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    const raw = data?.evaluated_counts ?? null;
    watermark = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as DayCounts) : null;
    priorPaged = priorRunPagedSpike(data ?? null);
  } catch (e) {
    errors.push(`backfill watermark read failed: ${errMsg(e)}`);
  }

  // DEBUG-541: the gap-filled window this run evaluated; currentCounts is persisted as the
  // next run's watermark. Why gap-filling and today's key are load-bearing: buildCountWindow.
  const { today, todayCount, baselineCounts, currentCounts } = buildCountWindow({
    volumeRows,
    nowMs: startedMs,
    baselineDays,
  });

  // Provenance over the same window. Coalesced: rows read before the migration lands carry
  // none of these columns, and a missing column must not read as a zero-fallback share.
  const provenance = volumeRows.reduce(
    (acc, r) => ({
      eventTimeRows: acc.eventTimeRows + (r.event_time_rows ?? 0),
      ingestTimeRows: acc.ingestTimeRows + (r.ingest_time_rows ?? 0),
      clockSkewCount: acc.clockSkewCount + (r.clock_skew_count ?? 0),
      implausiblePastCount: acc.implausiblePastCount + (r.implausible_past_count ?? 0),
    }),
    { eventTimeRows: 0, ingestTimeRows: 0, clockSkewCount: 0, implausiblePastCount: 0 },
  );

  // --- Evaluate (pure logic). ---
  const liveness = evaluateLiveness({
    lastDetectionAt,
    totalDetectionsRetained,
    nowMs: startedMs,
    stalenessThresholdHours,
  });
  const spike = evaluateSpike({
    todayCount,
    baselineCounts,
    spikeMultiplier,
    minAbsoluteForSpike,
  });
  // INFRA-265 probe axis — authoritative dead-pipeline for the ingest/cron/edge leg.
  const probe = evaluateProbeLiveness({
    lastProbeAt,
    nowMs: startedMs,
    stalenessThresholdHours: probeStalenessHours,
  });

  // DEBUG-541 backfill axis — did a day we already closed the books on grow? Reuses
  // minAbsoluteForSpike as the report threshold rather than introducing a new env name:
  // its horizon must stay pinned to the SQL floor in the migration, and a tunable that can
  // drift from a hardcoded SQL constant is a silent-miss surface, not a feature.
  const backfill = evaluateBackfill({
    currentCounts,
    watermark,
    today,
    minGrowthToReport: minAbsoluteForSpike,
    spikeMultiplier,
    minAbsoluteForSpike,
    priorPaged,
  });

  // STRICTLY ADDITIVE (crisis specialist C3/C4): the probe, backfill and partial-day axes can
  // RAISE a page but NEVER suppress a real verdict — five independent axes OR'd together.
  const axes = alertAxes({ liveness, spike, probe, backfill });
  const shouldAlert = anyAxisTripped(axes);
  const reason = composeReason(
    axes.liveness,
    axes.spike,
    axes.probe,
    axes.backfill,
    axes.partialDay,
    axes.gapDay,
  );

  // DEBUG-700: gap days are recorded even when nothing pages (no email then). Dates and day
  // counts only — never a detection count, never a clock time.
  if (backfill.gapDays.length > 0 || backfill.gapRange !== null) {
    const paged = backfill.gapDays.filter((g) => g.alert).map((g) => g.day);
    const unchecked = backfill.gapDays.filter((g) => !g.evaluable).map((g) => g.day);
    console.warn(
      `[crisis-alerter] gap days since the last clean run: ${backfill.gapDays.length} in window` +
        ` (GAP-DAY SPIKE: ${paged.join(', ') || 'none'}; not evaluable: ${unchecked.join(', ') || 'none'})` +
        (backfill.gapRange
          ? `; not checked, outside the window: ${backfill.gapRange.from} to ${backfill.gapRange.to} (${backfill.gapRange.days} days)`
          : ''),
    );
  }

  const payload = buildAlertPayload({
    reason,
    liveness,
    spike,
    probe,
    backfill,
    todayVolume: todayCount,
    arrivalToday,
    provenance,
    buckets: bucketRows,
    bucketFloor,
    lastDetectionDate: lastDetectionAt ? lastDetectionAt.slice(0, 10) : null,
  });

  // --- Notify on breach (Resend). A delivery failure is itself recorded as an error
  //     so the watchdog catches a silent alert-delivery failure. ---
  let alertSent = false;
  if (shouldAlert && errors.length === 0) {
    try {
      await sendResendAlert(payload, composeSubject(axes), deps);
      alertSent = true;
    } catch (e) {
      errors.push(`alert delivery failed: ${errMsg(e)}`);
    }
  }

  // --- Record the run (heartbeat). 'ok'/'alerted' only on a CLEAN full evaluation;
  //     any error → 'error' (never a healthy heartbeat). ---
  const status = errors.length > 0 ? 'error' : alertSent ? 'alerted' : 'ok';
  try {
    // .insert() does NOT throw on a DB/permission error — it returns { error }. Check it,
    // or a failed heartbeat write silently looks like success (and the row never lands).
    const { error: insErr } = await supabase.from('crisis_alert_runs').insert({
      status,
      reason: shouldAlert ? reason : null,
      liveness_status: liveness.status,
      spike_status: spike.status,
      probe_status: probe.status,
      // cold_start|none, or '+'-joined backfill→partial_day→gap_day (9 strings). The column
      // COMMENT still lists only cold_start|none|backfill; a COMMENT is DDL, so it rides the
      // next migration.
      backfill_status: backfill.status,
      today_volume: todayCount,
      alert_sent: alertSent,
      // Persist the watermark ONLY when the volume read actually succeeded. A partial or
      // empty map would make the NEXT run read the whole series as grown-from-zero.
      evaluated_counts: volumeReadOk ? currentCounts : null,
      errors: errors.length ? errors : null,
      duration_ms: Date.now() - wallStartMs,
    });
    if (insErr) throw insErr;
  } catch (e) {
    // If we cannot even record the run, surface it in the response; the watchdog will
    // see no fresh heartbeat and escalate.
    errors.push(`run-record insert failed: ${errMsg(e)}`);
  }

  // --- External dead-man's-switch (INFRA-264). LAST action before return, gated on the
  //     FINAL error tally (post heartbeat-insert): ping the external healthchecks.io check
  //     ONLY on a fully clean run, so a failed heartbeat write ALSO suppresses the ping.
  //     The safety property is in the SILENCE — any error → no ping → healthchecks.io pages
  //     on the missed expected ping. This is the only layer that survives a total
  //     Supabase/edge outage that blinds both this alerter and its in-Supabase watchdog
  //     (they share Supabase's failure domain). Fire-and-forget: a ping failure (or an
  //     unset secret) NEVER flips `status`, NEVER enters `errors`, NEVER throws. It proves
  //     ONLY that this cron ran clean — not detection, the on-device emit leg, or ingest. ---
  if (shouldPingHealthcheck({ errorCount: errors.length })) {
    await pingExternalHealthcheck(deps);
  }

  return json(errors.length ? 500 : 200, {
    success: errors.length === 0,
    status,
    evaluated: {
      liveness: liveness.status,
      spike: spike.status,
      probe: probe.status,
      backfill: backfill.status,
      // Day-level date and counts only — never the prior run's timestamp.
      partialDay: backfill.partialDay,
      // DEBUG-700: day-level gap readings and the out-of-window range (dates and day counts).
      gapDays: backfill.gapDays,
      gapRange: backfill.gapRange,
      // Occurrence vs arrival, named so the basis of each number is never implicit.
      todayVolume: todayCount,
      arrivalToday,
    },
    alertSent,
    errors,
  });
}

/**
 * Fire the external healthchecks.io dead-man's-switch success ping (INFRA-264).
 *
 * The check URL (e.g. https://hc-ping.com/<uuid>) is a CAPABILITY URL — treat it as a
 * secret. It is read BY NAME from the `CRISIS_HEALTHCHECK_PING_URL` Edge secret and used
 * ONLY as the fetch target; it is NEVER interpolated into a logged/thrown/response string,
 * never written to the heartbeat row, never appended with run details (no PII, no counts —
 * GET, no body, no query params).
 *
 * Fully best-effort and bounded:
 *   - Unset/blank secret → skip silently (the switch is simply not provisioned yet; the
 *     runbook setup checklist confirms the first ping lands). It must NOT page through the
 *     internal watchdog for a missing-config state.
 *   - GET with `redirect: 'error'` (a capability URL resolves directly to the known host;
 *     following an unexpected redirect would be an exfiltration vector) and a 5s timeout
 *     (a hung endpoint must never stall the function or bleed into the next cron tick).
 *   - Any failure is swallowed (a generic, URL-free console line only) so a healthchecks.io
 *     outage can never flip this run to 'error' or falsely trip the in-Supabase watchdog.
 */
async function pingExternalHealthcheck(deps: AlerterDeps): Promise<void> {
  const pingUrl = deps.env.CRISIS_HEALTHCHECK_PING_URL;
  if (!pingUrl) return; // not provisioned — skip silently (see runbook setup checklist)
  try {
    const res = await deps.fetch(pingUrl, {
      method: 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    // Drain/close the body; outcome recorded as status only, never the URL.
    if (!res.ok) {
      console.warn(`healthcheck ping returned non-2xx (${res.status})`);
    }
  } catch {
    // URL-free by construction — never echo the capability URL into logs.
    console.warn('healthcheck ping failed (network/timeout)');
  }
}

/**
 * Send the alert via Resend. Composes the human-readable subject/body from the
 * already-PII-free payload (no identifiers, day-level date only). Throws on non-2xx so
 * the caller records a delivery failure.
 */
async function sendResendAlert(
  payload: ReturnType<typeof buildAlertPayload>,
  subject: string,
  deps: AlerterDeps,
): Promise<void> {
  const apiKey = deps.env.RESEND_API_KEY;
  const from = deps.env.CRISIS_ALERT_FROM;
  const to = deps.env.CRISIS_ALERT_TO;
  if (!apiKey || !from || !to) {
    throw new Error('Resend env not configured (RESEND_API_KEY / CRISIS_ALERT_FROM / CRISIS_ALERT_TO)');
  }

  const lines: string[] = [
    `Crisis-detection alert (${payload.reason}).`,
    '',
    `Liveness: ${payload.liveness.status}` +
      (payload.liveness.ageHours != null ? ` (last detection ~${payload.liveness.ageHours}h ago)` : '') +
      (payload.lastDetectionDate ? ` [last detection day ${payload.lastDetectionDate}]` : ' [no detection retained]'),
    `Volume (OCCURRENCE — the day detection happened): today ${payload.todayVolume}, ` +
      `spike status ${payload.spike.status}` +
      (payload.spike.baselineMean != null ? `, baseline mean ${payload.spike.baselineMean}` : ' (cold start)'),
    `Volume (ARRIVAL — the day the row reached the server): today ${payload.arrivalToday}`,
    ...(payload.arrivalToday !== payload.todayVolume
      ? [
          `  NOTE: occurrence and arrival differ by ${Math.abs(payload.arrivalToday - payload.todayVolume)}. ` +
            (payload.arrivalToday > payload.todayVolume
              ? 'More arrived than occurred today — that is a BACKLOG FLUSH (events detected on earlier days), not a surge.'
              : 'More occurred than arrived today — detections are still on devices that have not flushed yet.'),
        ]
      : []),
    `Probe (INFRA-265, ingest/cron/edge leg only — NOT the on-device emit leg): ${payload.probe.status}` +
      (payload.probe.ageHours != null ? ` (last probe ~${payload.probe.ageHours}h ago)` : ' (no probe recorded)'),
    '',
    // TODAY only: on a FULL-DAY SPIKE email the reader would otherwise attribute it to the
    // completed day.
    "Detection mix — TODAY's buckets only (at or above the reporting floor):",
    ...payload.buckets.map(
      (b) => `  - ${b.assessment_type} / ${b.trigger_type} / ${b.severity_bucket}: ${b.detection_count}`,
    ),
  ];
  if (payload.suppressedBucketCount > 0) {
    lines.push(
      `  - (${payload.suppressedBucketCount} rare bucket row(s) below the floor of ${payload.bucketFloor}, ` +
        `${payload.suppressedDetectionTotal} detection(s) total, withheld at row granularity)`,
    );
  }
  if (payload.probe.alert) {
    lines.push(
      '',
      'NOTE: the synthetic probe is stale/missing — the ingest/cron/edge leg appears DEAD. ' +
        'This does NOT cover the on-device emit leg; run the manual active-liveness assertion ' +
        '(runbook step 1) to confirm the app path.',
    );
  }

  // DEBUG-541 — provenance, printed on EVERY alert, not only when fallback is present.
  // A number whose basis is implicit is the defect this item fixes, one layer up.
  lines.push(
    '',
    `Attribution over the evaluated window: ${payload.provenance.eventTimeRows} row(s) by ` +
      `detection date, ${payload.provenance.ingestTimeRows} by arrival date (no usable ` +
      `detected_on)` +
      (payload.provenance.fallbackShare != null
        ? ` — fallback share ${Math.round(payload.provenance.fallbackShare * 100)}%.`
        : ' — no rows in window.'),
  );
  if (payload.provenance.fallbackShare != null && payload.provenance.fallbackShare >= 0.5) {
    lines.push(
      '  WARNING: most rows in this window are attributed by ARRIVAL date, not detection ' +
        'date. The occurrence series is not yet trustworthy — clients predating DEBUG-541 ' +
        'send no detected_on, and that population is permanent, not a transition window.',
    );
  }
  if (payload.provenance.clockSkewCount > 0 || payload.provenance.implausiblePastCount > 0) {
    lines.push(
      `  Rejected client dates: ${payload.provenance.clockSkewCount} ahead of arrival ` +
        `(clock skew), ${payload.provenance.implausiblePastCount} older than the horizon. ` +
        'Both were attributed to the arrival date rather than dropped.',
    );
  }

  lines.push(...composeBackfillLines(payload.backfill, deps.env.spikeMultiplier));
  lines.push('', 'Monitoring-only. Confirm via the Supabase SQL editor; see crisis-analytics-runbook.md.');

  const res = await deps.fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, text: lines.join('\n') }),
  });

  if (!res.ok) {
    // Do NOT echo the response body verbatim into a thrown message that might land in
    // logs with the auth header; status + statusText is enough for the watchdog.
    throw new Error(`Resend returned ${res.status} ${res.statusText}`);
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
