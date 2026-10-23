-- DEBUG-840 — enforce privacy-policy §7.3's three-year retention on subscription_events.
--
-- THE DEFECT. §7.3 says audit logs are kept three years; nothing ever deleted a
-- subscription_events row, so the promise was a floor in practice and a ceiling only on paper.
--
-- COMPLIANCE RULING (2026-10-22, AC1). Enforce 3 years as a CEILING. "Audit logs" in §7.3 is
-- subscription_events alone: the ops heartbeats already have 90-day prunes, FEAT-833 prunes the
-- transfer tables, and webhook_replay_cache's missing prune is INFRA-846. A
-- transfer does not reset the clock — old-uid rows keep their own created_at. No §7.3 edit.
--
-- NULL created_at. Such a row is undatable, so no prune can ever reach it: it would be kept
-- forever, outside the ceiling. They are deleted here, and the column becomes NOT NULL (the
-- now() default stays, so no writer changes). Supabase backups/PITR keep pre-delete rows for
-- the backup window — named, not fixed.
--
-- THE JOB. Its own function, job name and heartbeat, never folded into
-- analytics-retention-prune: one job_name per table keeps retention_prune_health readable per
-- promise. Body copied from run_subscription_transfer_prune (20261021000000), including the
-- non-raising handler (see 20260808000000 for why). 03:40 UTC is a free slot among the nightly
-- prunes. No service_role grant: pg_cron runs it as the owner.
--
-- Idempotent: the DELETE matches nothing on re-run, SET NOT NULL is a no-op, the function is
-- replaced and the job unscheduled before it is rescheduled.
-- Pinned by supabase/tests/debug840_subscription_events_retention.sql.

DELETE FROM public.subscription_events WHERE created_at IS NULL;
ALTER TABLE public.subscription_events ALTER COLUMN created_at SET NOT NULL;

CREATE OR REPLACE FUNCTION public.run_subscription_events_retention_prune()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  started_at timestamptz := clock_timestamp();
  n_deleted  integer;
BEGIN
  DELETE FROM public.subscription_events WHERE created_at < now() - interval '3 years';
  GET DIAGNOSTICS n_deleted = ROW_COUNT;
  INSERT INTO public.retention_prune_runs (job_name, status, rows_deleted, duration_ms)
  VALUES (
    'subscription-events-retention-prune', 'ok', n_deleted,
    (EXTRACT(EPOCH FROM (clock_timestamp() - started_at)) * 1000)::integer
  );
EXCEPTION WHEN OTHERS THEN
  -- ⚠️ No RAISE here: re-raising would roll back this heartbeat row too (see 20260808000000).
  INSERT INTO public.retention_prune_runs (job_name, status, duration_ms, sqlstate, detail)
  VALUES (
    'subscription-events-retention-prune', 'error',
    (EXTRACT(EPOCH FROM (clock_timestamp() - started_at)) * 1000)::integer,
    SQLSTATE, SQLERRM
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.run_subscription_events_retention_prune() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.run_subscription_events_retention_prune() IS
  'DEBUG-840: deletes subscription_events older than 3 years (privacy-policy §7.3 ceiling) and '
  'writes one retention_prune_runs heartbeat per run. Scheduled as subscription-events-retention-prune.';

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.unschedule('subscription-events-retention-prune')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'subscription-events-retention-prune');
SELECT cron.schedule(
  'subscription-events-retention-prune',
  '40 3 * * *',
  $cron$ SELECT public.run_subscription_events_retention_prune(); $cron$
);

-- Fail closed. Counts only — never a uid.
DO $$
BEGIN
  IF NOT (SELECT attnotnull FROM pg_attribute
           WHERE attrelid = 'public.subscription_events'::regclass AND attname = 'created_at') THEN
    RAISE EXCEPTION 'DEBUG-840: subscription_events.created_at is still nullable';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM cron.job
                  WHERE jobname = 'subscription-events-retention-prune' AND schedule = '40 3 * * *') THEN
    RAISE EXCEPTION 'DEBUG-840: subscription-events-retention-prune is not scheduled';
  END IF;
END $$;

-- =====================================================
-- ROLLBACK (manual). Deleted rows are not recoverable short of a backup restore.
-- =====================================================
-- SELECT cron.unschedule('subscription-events-retention-prune');
-- DROP FUNCTION IF EXISTS public.run_subscription_events_retention_prune();
-- ALTER TABLE public.subscription_events ALTER COLUMN created_at DROP NOT NULL;
