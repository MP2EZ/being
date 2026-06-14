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
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { timingSafeEqual } from 'node:crypto';

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

serve(async (req) => {
  const startedMs = Date.now();

  // --- Auth: reject before any work, fail-closed, POST-only. ---
  if (req.method !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }
  const providedSecret = req.headers.get('x-cron-secret');
  const expectedSecret = Deno.env.get('CRON_SECRET');
  if (!expectedSecret || !providedSecret || !constantTimeEqual(providedSecret, expectedSecret)) {
    return json(401, { error: 'Unauthorized' });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // --- Drive the real write leg: insert a synthetic marker via PostgREST. ---
  // The row is PII-free synthetic ops telemetry: probe_type defaults to the pinned
  // 'synthetic_liveness' constant; we carry only a status + ops metadata. NEVER any
  // user/session id, score, or wellness data. We deliberately do NOT call
  // SupabaseService.trackCrisisDetection (that writes analytics_events) — R2 boundary.
  try {
    // .insert() returns { error } rather than throwing on a DB/permission failure — check
    // it explicitly, or a failed write would look like success and no marker would land
    // (the alerter would then page on staleness, which is fail-closed but mislabelled).
    const { error: insErr } = await supabase.from('crisis_liveness_probe').insert({
      status: 'ok',
      source: 'edge',
      duration_ms: Date.now() - startedMs,
      detail: 'synthetic liveness probe — ingest/cron/edge write leg exercised',
    });
    if (insErr) throw insErr;
  } catch (e) {
    // Surface the failure in the response. No marker row lands, so the alerter sees a
    // stale probe within the staleness window and raises the authoritative dead page.
    return json(500, { success: false, error: `probe marker insert failed: ${errMsg(e)}` });
  }

  return json(200, {
    success: true,
    status: 'ok',
    durationMs: Date.now() - startedMs,
  });
});

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
