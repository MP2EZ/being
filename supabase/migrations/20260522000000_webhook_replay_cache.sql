-- Idempotency / replay protection for incoming webhook notifications.
--
-- Each row represents a single notification we have already processed.
-- The subscription-webhook function checks this table BEFORE mutating
-- subscription state and writes a row AFTER successful processing.
--
-- This prevents two failure modes:
--   1. Replay attacks: an attacker captures a valid Apple/Google webhook
--      (still inside the 24h signedDate freshness window) and submits it
--      again later — without dedup, this would re-trigger state changes.
--   2. Redundant work: Apple/Google retry on 5xx responses. If our first
--      attempt processed but the response was lost, the retry would
--      re-process identical state changes.
--
-- The (source, notification_id) pair is the natural unique key:
--   - Apple notifications carry notificationUUID (per Apple ASN V2 spec)
--   - Google Pub/Sub messages carry message.messageId
--
-- Old entries can be pruned by the grace-period-automation cron job; the
-- table is unbounded by default to keep this migration self-contained.

CREATE TABLE IF NOT EXISTS public.webhook_replay_cache (
  source           TEXT        NOT NULL CHECK (source IN ('apple', 'google')),
  notification_id  TEXT        NOT NULL,
  processed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (source, notification_id)
);

CREATE INDEX IF NOT EXISTS webhook_replay_cache_processed_at_idx
  ON public.webhook_replay_cache (processed_at);

COMMENT ON TABLE public.webhook_replay_cache IS
  'Idempotency cache for Apple/Google subscription webhooks. Prevents replay attacks and redundant processing of retried notifications. Written by the subscription-webhook edge function.';

-- RLS: only the service role (used by edge functions) needs access.
-- No client-side reads or writes; the table is purely server-internal.
ALTER TABLE public.webhook_replay_cache ENABLE ROW LEVEL SECURITY;

-- No policies defined — RLS with no policies denies all access except
-- to the service role (which bypasses RLS by design). This is the
-- intended posture: clients have no business reading or writing this table.
