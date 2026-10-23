-- INFRA-846 — bound webhook_replay_cache with a scheduled prune (DEBUG-840 follow-up).
--
-- THE DEFECT. 20260522000000 says old entries "can be pruned by the grace-period-automation
-- cron job". Nothing ever did: no migration, cron job or edge function deletes from the table
-- (20261014000000 already noted it), so retention was indefinite. That file is never edited;
-- this header and the COMMENT ON TABLE below carry the correction.
--
-- THE WINDOW: 14 days (compliance ruling, founder-approved 2026-10-23). A row only matters while
-- the same notification id can arrive again and still be accepted:
--   - Apple: verifyAppleJWS rejects a signedDate older than 24h (_shared/verifyAppleJWS.ts), and
--     Apple retries a failed notification for about 72h, so a redelivery is bounded at ~96h.
--   - Google: the replay path has no message-age gate. A captured request is bounded by the
--     OIDC token's exp (~1h); a legitimate redelivery reuses the messageId for as long as the
--     Pub/Sub subscription retains the message. ASSUMPTION: the subscription keeps Pub/Sub's
--     7-day default and does not retain acked messages. That setting lives in GCP, not this
--     repo; if it is ever raised, the window must become retention + 7 days.
--   - Second line of defence: isStaleEvent acks any strictly older event without a write, so a
--     redelivery past the window cannot roll subscription state back.
-- 14 days is twice the 7-day floor. Margin matters only at the early end: a failed run keeps
-- rows longer, it never deletes early. The cache is pseudonymous (processed_at matches a
-- webhook-written subscription_events row to the millisecond, DEBUG-842), so the window also
-- caps that residual timeline at ~15 days.
--
-- THE JOB. Its own function, job name and heartbeat, copied from
-- run_subscription_events_retention_prune (20261022000500), including the non-raising handler
-- (see 20260808000000 for why). 03:35 UTC is free among the nightly prunes, clear of the hourly
-- :05 and six-hourly :00 jobs. No service_role grant: pg_cron runs it as the owner, and
-- service_role must keep only SELECT, INSERT here (20261022000100, maint441 Test 7).
--
-- Idempotent: the function is replaced and the job unscheduled before it is rescheduled.
-- Pinned by supabase/tests/infra846_webhook_replay_cache_prune.sql.

CREATE OR REPLACE FUNCTION public.run_webhook_replay_cache_prune()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  started_at timestamptz := clock_timestamp();
  n_deleted  integer;
BEGIN
  DELETE FROM public.webhook_replay_cache WHERE processed_at < now() - interval '14 days';
  GET DIAGNOSTICS n_deleted = ROW_COUNT;
  INSERT INTO public.retention_prune_runs (job_name, status, rows_deleted, duration_ms)
  VALUES (
    'webhook-replay-cache-prune', 'ok', n_deleted,
    (EXTRACT(EPOCH FROM (clock_timestamp() - started_at)) * 1000)::integer
  );
EXCEPTION WHEN OTHERS THEN
  -- ⚠️ No RAISE here: re-raising would roll back this heartbeat row too (see 20260808000000).
  INSERT INTO public.retention_prune_runs (job_name, status, duration_ms, sqlstate, detail)
  VALUES (
    'webhook-replay-cache-prune', 'error',
    (EXTRACT(EPOCH FROM (clock_timestamp() - started_at)) * 1000)::integer,
    SQLSTATE, SQLERRM
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.run_webhook_replay_cache_prune() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.run_webhook_replay_cache_prune() IS
  'INFRA-846: deletes webhook_replay_cache rows older than 14 days and writes one '
  'retention_prune_runs heartbeat per run. Scheduled as webhook-replay-cache-prune.';

COMMENT ON TABLE public.webhook_replay_cache IS
  'Idempotency cache for Apple/Google subscription webhooks. Prevents replay attacks and redundant '
  'processing of retried notifications. Written by the subscription-webhook edge function. Pruned at '
  '14 days by webhook-replay-cache-prune (INFRA-846).';

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.unschedule('webhook-replay-cache-prune')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'webhook-replay-cache-prune');
SELECT cron.schedule(
  'webhook-replay-cache-prune',
  '35 3 * * *',
  $cron$ SELECT public.run_webhook_replay_cache_prune(); $cron$
);

-- Fail closed.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job
                  WHERE jobname = 'webhook-replay-cache-prune' AND schedule = '35 3 * * *') THEN
    RAISE EXCEPTION 'INFRA-846: webhook-replay-cache-prune is not scheduled';
  END IF;
  IF NOT (SELECT prosecdef FROM pg_proc
           WHERE oid = 'public.run_webhook_replay_cache_prune()'::regprocedure) THEN
    RAISE EXCEPTION 'INFRA-846: run_webhook_replay_cache_prune is not SECURITY DEFINER';
  END IF;
END $$;

-- =====================================================
-- ROLLBACK (manual). Deleted rows are not recoverable short of a backup restore.
-- =====================================================
-- SELECT cron.unschedule('webhook-replay-cache-prune');
-- DROP FUNCTION IF EXISTS public.run_webhook_replay_cache_prune();
