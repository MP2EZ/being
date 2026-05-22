/**
 * Idempotency cache for incoming subscription webhooks.
 *
 * Apple notifications carry a `notificationUUID` and Google Pub/Sub
 * messages carry a `message.messageId`. Both are stable per-notification
 * identifiers we can use to detect:
 *   - Replay attacks (an attacker re-submits a previously-valid webhook).
 *   - Retries from Apple/Google after our previous attempt 5xx'd.
 *
 * Backed by the `webhook_replay_cache` Postgres table (see
 * `supabase/migrations/20260522000000_webhook_replay_cache.sql`). RLS is
 * enabled with no policies, so only the service role (used here in
 * edge-function context) can read or write.
 *
 * Usage:
 *   if (await wasProcessed(supabase, 'apple', uuid)) { return 200 no-op; }
 *   await handleAppleWebhook(...);
 *   await markProcessed(supabase, 'apple', uuid);
 *
 * Processing-then-mark is intentional: if processing fails, the cache row
 * is NOT written, so Apple/Google's retry will re-attempt the work.
 * Handlers must be idempotent (subscription upserts keyed by stable
 * transaction/purchase tokens already are).
 */

export type WebhookSource = 'apple' | 'google';

/**
 * Check whether a notification has already been processed.
 *
 * Returns true if a cache row exists, false otherwise. Throws on
 * unexpected database errors (so the caller can fail fast rather than
 * silently double-process).
 */
export async function wasProcessed(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  source: WebhookSource,
  notificationId: string
): Promise<boolean> {
  if (!notificationId) {
    // Defensive: a missing ID means we can't dedup. Treat as "not seen"
    // and let the caller proceed; the audit log will still show the
    // notification.
    console.warn(`[Replay Cache] Missing notification_id for source=${source}`);
    return false;
  }

  const { data, error } = await supabase
    .from('webhook_replay_cache')
    .select('notification_id')
    .eq('source', source)
    .eq('notification_id', notificationId)
    .maybeSingle();

  if (error) {
    throw new Error(`Replay-cache check failed: ${error.message}`);
  }

  return data !== null;
}

/**
 * Mark a notification as processed.
 *
 * Tolerates concurrent-insert races (two workers processing the same
 * notification at once) — the unique-constraint violation is logged and
 * swallowed because either insert "wins" and the resulting state is the
 * same: a single row exists.
 */
export async function markProcessed(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  source: WebhookSource,
  notificationId: string
): Promise<void> {
  if (!notificationId) return;

  const { error } = await supabase
    .from('webhook_replay_cache')
    .insert({ source, notification_id: notificationId });

  if (error) {
    if (error.code === '23505') {
      // Postgres unique_violation: a concurrent insert won the race.
      // Idempotent outcome — log and proceed.
      console.log(
        `[Replay Cache] Concurrent insert for ${source}/${notificationId}; treating as already-marked.`
      );
      return;
    }
    throw new Error(`Replay-cache mark failed: ${error.message}`);
  }
}
