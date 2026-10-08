/**
 * handleProbe — the crisis liveness probe's request handler (MAINT-740).
 *
 * Lifted out of index.ts so it can be exercised as production code: index.ts calls
 * serve() at module scope, so importing it starts a listener and no test can load it.
 * index.ts is now a thin adapter that resolves env by LITERAL name and builds the client.
 *
 * Deliberately import-safe: no serve(), no Deno.env, no supabase-js, no network at import.
 * Env arrives as resolved values so the literal reads stay greppable in index.ts, which
 * the INFRA-379 trust-domain pin and the INFRA-442 deploy-drift reconcile both match on.
 *
 * Every invariant documented in index.ts's header still holds here — notably the R2 red
 * line: this writes ONLY to crisis_liveness_probe, never to analytics_events.
 */

import { timingSafeEqual } from 'node:crypto';

/** The one write the probe makes. Structural, so tests need no supabase-js. */
export interface ProbeClient {
  from(table: string): {
    insert(row: Record<string, unknown>): PromiseLike<{ error: unknown }>;
  };
}

export interface ProbeDeps {
  env: { CRON_SECRET?: string };
  /** Invoked only after the 405/401 gates, so a rejected request never builds a client. */
  client: () => ProbeClient;
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

export async function handleProbe(req: Request, deps: ProbeDeps): Promise<Response> {
  const startedMs = Date.now();

  // --- Auth: reject before any work, fail-closed, POST-only. ---
  if (req.method !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }
  const providedSecret = req.headers.get('x-cron-secret');
  const expectedSecret = deps.env.CRON_SECRET;
  if (!expectedSecret || !providedSecret || !constantTimeEqual(providedSecret, expectedSecret)) {
    return json(401, { error: 'Unauthorized' });
  }

  const supabase = deps.client();

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
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
