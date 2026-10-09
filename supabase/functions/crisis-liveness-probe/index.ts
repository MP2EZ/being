/**
 * CRISIS-DETECTION SYNTHETIC LIVENESS PROBE EDGE FUNCTION (INFRA-265)
 *
 * Invoked on a schedule (pg_cron every 6h, see migration 20260613000000_crisis_liveness_probe.sql).
 * Writes a clearly-tagged SYNTHETIC marker row to `crisis_liveness_probe` by driving the
 * real cron -> edge -> supabase-js -> PostgREST write leg. The INFRA-219 alerter reads
 * MAX(probed_at) and turns a stale/missing probe into an AUTHORITATIVE dead-pipeline page —
 * the active dead-vs-quiet discriminator that passive staleness (over real crisis_detected
 * volume) cannot provide at low volume.
 *
 * SCOPE / HONESTY (crisis specialist C8):
 *   A successful probe proves only that the cron + edge + PostgREST write leg is alive.
 *   It does NOT run the React Native app code, so it is NOT proof the ON-DEVICE emit path
 *   works. The manual release-time active-liveness assertion (crisis-analytics-runbook.md
 *   step 1) remains the gold-standard end-to-end gate. A green probe is NOT end-to-end.
 *
 * SAFETY POSTURE (monitoring, NOT a safety mechanism):
 *   Fourth-order release-health infra. It MUST NOT sit in, import from, or feed back into
 *   any detection / 988 / intervention code path. It shares NO code/lock/queue with the
 *   on-device crisis emit path (crisis specialist C1/C2).
 *
 * HARD RED LINE (R2):
 *   Writes ONLY to crisis_liveness_probe — NEVER to analytics_events. The synthetic signal
 *   can never enter crisis_detected / the FEAT-129 views / a compliance export. A
 *   belt-and-suspenders CHECK on analytics_events rejects synthetic-tagged rows at the DB
 *   layer (same migration). The marker is PII-free by construction (no user/session id).
 *
 * AUTH: X-Cron-Secret constant-time (mirrors crisis-detection-alerting). verify_jwt=false
 *   (pg_net carries no user JWT) — the secret check is the sole compensating control.
 *   Shares CRON_SECRET with crisis-detection-alerting (same crisis-monitoring trust domain).
 *
 * LAYOUT (MAINT-740): the handler lives in handleProbe.ts so tests can import it. This file
 *   is the deploy entry point: it resolves env by LITERAL name — the trust-domain pin and the
 *   deploy-drift reconcile match on those literals, so they must stay here — and builds the
 *   client lazily, after the auth gate, exactly as before.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { handleProbe } from './handleProbe.ts';

serve((req) =>
  handleProbe(req, {
    env: { CRON_SECRET: Deno.env.get('CRON_SECRET') },
    client: () =>
      createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      ),
  })
);
