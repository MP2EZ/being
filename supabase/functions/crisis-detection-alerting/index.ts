/**
 * CRISIS-DETECTION ALERTING EDGE FUNCTION (INFRA-219)
 *
 * Periodically (pg_cron, see migration 20260607000000_crisis_alert_cron.sql) evaluates
 * the FEAT-129 operator-only views and notifies the founder on a threshold breach:
 *   - (a) volume spike vs trailing baseline
 *   - (b) liveness / pipeline-dead guard (last_detection_at age)
 *
 * SAFETY POSTURE (monitoring, NOT a safety mechanism):
 *   This is third-order release-health monitoring over an aggregate copy of crisis
 *   detections. It MUST NOT sit in, import from, or feed back into any detection / 988 /
 *   intervention code path. The in-app on-device crisis audit log is the accountability
 *   record; these views are observation only. (docs/development/crisis-analytics-runbook.md)
 *
 * SELF-OBSERVABILITY (dead-man's-switch):
 *   Every run records a row in `crisis_alert_runs`. A HEALTHY run records status 'ok'
 *   and sends no email; a BREACH records 'alerted' and emails. Any error records 'error'
 *   — never a healthy heartbeat. The watchdog cron (same migration) escalates when no
 *   recent 'ok'/'alerted' row exists or when an alert POST failed. The watchdog shares
 *   Supabase's failure domain; an external dead-man's-switch (healthchecks.io) is the
 *   tracked follow-up that closes the total-outage gap.
 *
 * PRIVACY (PII-free by construction):
 *   Reads ONLY the operator views (never analytics_events). Alert payloads carry counts,
 *   category labels, verdict statuses, and a DAY-level date only — never user_id,
 *   session_id, raw scores, Q9 value, distinct_sessions, or sub-day timestamps. The
 *   compliance ≥N bucket floor is applied in alertLogic.buildAlertPayload before send.
 *
 * AUTH: X-Cron-Secret constant-time (mirrors grace-period-automation). verify_jwt=false
 *   (pg_net carries no user JWT) — the secret check is the sole compensating control.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { timingSafeEqual } from 'node:crypto';
import {
  evaluateLiveness,
  evaluateProbeLiveness,
  evaluateSpike,
  buildAlertPayload,
  composeReason,
  shouldPingHealthcheck,
  type BucketRow,
} from './alertLogic.ts';

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

/** Integer env with a default; never throws on absent/garbage. */
function envInt(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  const n = raw === undefined ? NaN : Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

const DAY_MS = 86_400_000;

function dayString(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

interface VolumeRow {
  event_date: string;
  detection_count: number;
}

serve(async (req) => {
  const startedMs = Date.now();
  const errors: string[] = [];

  // --- Auth: reject before any work, fail-closed, POST-only. ---
  if (req.method !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }
  const providedSecret = req.headers.get('x-cron-secret');
  const expectedSecret = Deno.env.get('CRON_SECRET');
  if (!expectedSecret || !providedSecret || !constantTimeEqual(providedSecret, expectedSecret)) {
    return json(401, { error: 'Unauthorized' });
  }

  // --- Config (operator-tunable; conservative defaults bias toward alerting). ---
  const stalenessThresholdHours = envInt('CRISIS_ALERT_STALENESS_HOURS', 48);
  const spikeMultiplier = envInt('CRISIS_ALERT_SPIKE_MULTIPLIER', 3);
  const minAbsoluteForSpike = envInt('CRISIS_ALERT_SPIKE_MIN', 5);
  const bucketFloor = envInt('CRISIS_ALERT_BUCKET_FLOOR', 3);
  const baselineDays = envInt('CRISIS_ALERT_BASELINE_DAYS', 7);
  // INFRA-265: the synthetic probe runs every 6h; alert when the latest marker is older
  // than this (default 12h tolerates one missed run + slack). Authoritative dead page.
  const probeStalenessHours = envInt('CRISIS_PROBE_STALENESS_HOURS', 12);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // --- Read ONLY the operator views (never analytics_events). ---
  let totalDetectionsRetained = 0;
  let lastDetectionAt: string | null = null;
  let volumeRows: VolumeRow[] = [];
  let bucketRows: BucketRow[] = [];

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
      .select('event_date, detection_count')
      .order('event_date', { ascending: false })
      .limit(baselineDays + 2);
    if (error) throw error;
    volumeRows = (data ?? []) as VolumeRow[];
  } catch (e) {
    errors.push(`volume view read failed: ${errMsg(e)}`);
  }

  try {
    const { data, error } = await supabase
      .from('crisis_detection_daily')
      .select('assessment_type, trigger_type, severity_bucket, detection_count')
      .order('event_date', { ascending: false })
      .limit(200);
    if (error) throw error;
    // Keep only TODAY's bucket rows for the breakdown.
    const today = dayString(startedMs);
    bucketRows = ((data ?? []) as Array<BucketRow & { event_date?: string }>)
      .filter((r) => typeof r.event_date !== 'string' || r.event_date.slice(0, 10) === today)
      .map((r) => ({
        assessment_type: r.assessment_type,
        trigger_type: r.trigger_type,
        severity_bucket: r.severity_bucket,
        detection_count: r.detection_count,
      }));
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

  // Build a gap-filled per-day count map (a quiet day is a real 0, not a missing row).
  const countByDay = new Map<string, number>();
  for (const r of volumeRows) {
    countByDay.set(r.event_date.slice(0, 10), r.detection_count);
  }
  const today = dayString(startedMs);
  const todayCount = countByDay.get(today) ?? 0;
  const baselineCounts: number[] = [];
  for (let i = 1; i <= baselineDays; i++) {
    baselineCounts.push(countByDay.get(dayString(startedMs - i * DAY_MS)) ?? 0);
  }

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

  // STRICTLY ADDITIVE (crisis specialist C3/C4): the probe can RAISE a page but NEVER
  // suppress a real verdict — three independent axes OR'd together, never gated.
  const shouldAlert = liveness.alert || spike.alert || probe.alert;
  const reason = composeReason(liveness.alert, spike.alert, probe.alert);

  const payload = buildAlertPayload({
    reason,
    liveness,
    spike,
    probe,
    todayVolume: todayCount,
    buckets: bucketRows,
    bucketFloor,
    lastDetectionDate: lastDetectionAt ? lastDetectionAt.slice(0, 10) : null,
  });

  // --- Notify on breach (Resend). A delivery failure is itself recorded as an error
  //     so the watchdog catches a silent alert-delivery failure. ---
  let alertSent = false;
  if (shouldAlert && errors.length === 0) {
    try {
      await sendResendAlert(payload);
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
      today_volume: todayCount,
      alert_sent: alertSent,
      errors: errors.length ? errors : null,
      duration_ms: Date.now() - startedMs,
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
    await pingExternalHealthcheck();
  }

  return json(errors.length ? 500 : 200, {
    success: errors.length === 0,
    status,
    evaluated: {
      liveness: liveness.status,
      spike: spike.status,
      probe: probe.status,
      todayVolume: todayCount,
    },
    alertSent,
    errors,
  });
});

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
async function pingExternalHealthcheck(): Promise<void> {
  const pingUrl = Deno.env.get('CRISIS_HEALTHCHECK_PING_URL');
  if (!pingUrl) return; // not provisioned — skip silently (see runbook setup checklist)
  try {
    const res = await fetch(pingUrl, {
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
async function sendResendAlert(payload: ReturnType<typeof buildAlertPayload>): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('CRISIS_ALERT_FROM');
  const to = Deno.env.get('CRISIS_ALERT_TO');
  if (!apiKey || !from || !to) {
    throw new Error('Resend env not configured (RESEND_API_KEY / CRISIS_ALERT_FROM / CRISIS_ALERT_TO)');
  }

  const lines: string[] = [
    `Crisis-detection alert (${payload.reason}).`,
    '',
    `Liveness: ${payload.liveness.status}` +
      (payload.liveness.ageHours != null ? ` (last detection ~${payload.liveness.ageHours}h ago)` : '') +
      (payload.lastDetectionDate ? ` [last detection day ${payload.lastDetectionDate}]` : ' [no detection retained]'),
    `Volume: today ${payload.todayVolume}, spike status ${payload.spike.status}` +
      (payload.spike.baselineMean != null ? `, baseline mean ${payload.spike.baselineMean}` : ' (cold start)'),
    `Probe (INFRA-265, ingest/cron/edge leg only — NOT the on-device emit leg): ${payload.probe.status}` +
      (payload.probe.ageHours != null ? ` (last probe ~${payload.probe.ageHours}h ago)` : ' (no probe recorded)'),
    '',
    'Detection mix (buckets at or above the reporting floor):',
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
  lines.push('', 'Monitoring-only. Confirm via the Supabase SQL editor; see crisis-analytics-runbook.md.');

  // Subject derived from the tripped axes (reason is a '+'-composed string). Liveness and
  // probe are both pipeline-dead-flavored; spike is volume.
  const pipelineAlert = payload.liveness.alert || payload.probe.alert;
  const subject =
    pipelineAlert && payload.spike.alert
      ? '[Being] Crisis-detection LIVENESS + VOLUME alert'
      : payload.spike.alert
        ? '[Being] Crisis-detection VOLUME spike alert'
        : '[Being] Crisis-detection LIVENESS alert — possible dead pipeline';

  const res = await fetch('https://api.resend.com/emails', {
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
