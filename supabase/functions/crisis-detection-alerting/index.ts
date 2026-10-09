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
 *
 * CORRECTIONS TO 20260913000000_crisis_event_time_attribution.sql (DEBUG-684). That migration
 * is applied and stays unedited; these supersede three of its claims:
 *   - Line 29, "Client-first would put event-time backfill in front of an alerter that cannot
 *     see it": wrong. Client-first is inert — until the migration lands the views ignore
 *     detected_on. The dangerous state is the migration live + an alerter older than v15 +
 *     detected_on rows: backfilled rows then land on closed days that nothing re-reads. Never
 *     roll this function back below v15 once the client half has shipped.
 *   - Line 86, "matches the alerter's revisit horizon": it does not. This alerter looks back
 *     8 days (today + CRISIS_ALERT_BASELINE_DAYS=7, persisted as evaluated_counts); the SQL
 *     floor is 90.
 *   - Line 191, "RECLASSIFIED, not deleted": only inside those 8 days. A backlog 8–90 days old
 *     lands SILENTLY — the arrival view counts it as today's arrivals, but no axis pages on
 *     it. A known limitation, not a fix: `crisis` ruled it acceptable during INFRA-613 because
 *     it does not distort the 7-day baseline (finding (d), recorded on DEBUG-684).
 *
 * LAYOUT (MAINT-740): the handler lives in runAlerter.ts so tests can import it. This file is
 *   the deploy entry point. It resolves every env name by LITERAL — the trust-domain pin and
 *   the deploy-drift reconcile match on those literals and on envInt's call sites, so they
 *   must stay here — takes the evaluation instant per request, and passes the client as a
 *   thunk that runAlerter invokes only after the auth gate, exactly as before.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { runAlerter } from './runAlerter.ts';

/** Integer env with a default; never throws on absent/garbage. */
function envInt(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  const n = raw === undefined ? NaN : Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

serve((req) =>
  runAlerter(req, {
    env: {
      CRON_SECRET: Deno.env.get('CRON_SECRET'),
      RESEND_API_KEY: Deno.env.get('RESEND_API_KEY'),
      CRISIS_ALERT_FROM: Deno.env.get('CRISIS_ALERT_FROM'),
      CRISIS_ALERT_TO: Deno.env.get('CRISIS_ALERT_TO'),
      CRISIS_HEALTHCHECK_PING_URL: Deno.env.get('CRISIS_HEALTHCHECK_PING_URL'),
      // Operator-tunable; conservative defaults bias toward alerting.
      stalenessThresholdHours: envInt('CRISIS_ALERT_STALENESS_HOURS', 48),
      spikeMultiplier: envInt('CRISIS_ALERT_SPIKE_MULTIPLIER', 3),
      minAbsoluteForSpike: envInt('CRISIS_ALERT_SPIKE_MIN', 5),
      bucketFloor: envInt('CRISIS_ALERT_BUCKET_FLOOR', 3),
      baselineDays: envInt('CRISIS_ALERT_BASELINE_DAYS', 7),
      // INFRA-265: the synthetic probe runs every 6h; alert when the latest marker is older
      // than this (default 12h tolerates one missed run + slack). Authoritative dead page.
      probeStalenessHours: envInt('CRISIS_PROBE_STALENESS_HOURS', 12),
    },
    supabase: () =>
      createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      ),
    fetch: (input, init) => fetch(input, init),
    nowMs: Date.now(),
  })
);
