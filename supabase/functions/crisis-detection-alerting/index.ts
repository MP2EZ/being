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
  evaluateSpike,
  buildAlertPayload,
  type AlertReason,
  type BucketRow,
} from './alertLogic.ts';

/** Constant-time compare; false (without timing leak) when byte-lengths differ. */
function constantTimeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  if (aBytes.byteLength !== bBytes.byteLength) return false;
  return timingSafeEqual(aBytes, bBytes);
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
    errors.push(`liveness view read failed: ${e instanceof Error ? e.message : String(e)}`);
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
    errors.push(`volume view read failed: ${e instanceof Error ? e.message : String(e)}`);
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
    errors.push(`daily view read failed: ${e instanceof Error ? e.message : String(e)}`);
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

  const shouldAlert = liveness.alert || spike.alert;
  const reason: AlertReason =
    liveness.alert && spike.alert ? 'liveness+spike' : liveness.alert ? 'liveness' : 'spike';

  const payload = buildAlertPayload({
    reason,
    liveness,
    spike,
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
      errors.push(`alert delivery failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // --- Record the run (heartbeat). 'ok'/'alerted' only on a CLEAN full evaluation;
  //     any error → 'error' (never a healthy heartbeat). ---
  const status = errors.length > 0 ? 'error' : alertSent ? 'alerted' : 'ok';
  try {
    await supabase.from('crisis_alert_runs').insert({
      status,
      reason: shouldAlert ? reason : null,
      liveness_status: liveness.status,
      spike_status: spike.status,
      today_volume: todayCount,
      alert_sent: alertSent,
      errors: errors.length ? errors : null,
      duration_ms: Date.now() - startedMs,
    });
  } catch (e) {
    // If we cannot even record the run, surface it in the response; the watchdog will
    // see no fresh heartbeat and escalate.
    errors.push(`run-record insert failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  return json(errors.length ? 500 : 200, {
    success: errors.length === 0,
    status,
    evaluated: { liveness: liveness.status, spike: spike.status, todayVolume: todayCount },
    alertSent,
    errors,
  });
});

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
  lines.push('', 'Monitoring-only. Confirm via the Supabase SQL editor; see crisis-analytics-runbook.md.');

  const subject =
    payload.reason === 'liveness'
      ? '[Being] Crisis-detection LIVENESS alert — possible dead pipeline'
      : payload.reason === 'spike'
        ? '[Being] Crisis-detection VOLUME spike alert'
        : '[Being] Crisis-detection LIVENESS + VOLUME alert';

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
