-- MAINT-347 (Half A) — delete a retention function that must not run, and give the one
-- that DOES run a heartbeat.
--
-- ============================================================================
-- PART 1 — WHY cleanup_orphaned_backups() IS DELETED RATHER THAN SCHEDULED
-- ============================================================================
--
-- The work item proposed scheduling it, "the same class of defect DEBUG-340 fixed for
-- cleanup_old_analytics()", on the stated grounds that there is no policy contradiction
-- because §7.3 says settings backup is retained "until you disable backup". That reading
-- is inverted, and scheduling would have introduced the violation rather than closed one.
--
-- The published clause (docs/legal/privacy-policy.md §7.3, duplicated verbatim in
-- docs/legal/california-privacy.md's retention table) is:
--
--     "Settings Backup: Retained until you disable backup or request deletion via
--      in-app Privacy & Data settings"
--
-- Both triggers are USER ACTS. The function deleted on 180 days of inactivity with no
-- user act:
--
--     DELETE FROM encrypted_backups
--      WHERE user_id IN (SELECT id FROM users
--                         WHERE last_sync < NOW() - INTERVAL '180 days');
--
-- So §7.3 is a PROMISE OF RETENTION that this function breaks. Today's unscheduled state
-- is what keeps the promise; scheduling is what would break it. This is the MIRROR IMAGE
-- of DEBUG-340, not the same defect:
--
--   DEBUG-340   policy promised a 90-day prune, no cron delivered it
--               → promise exceeded practice → over-retention → scheduling FIXED it.
--   MAINT-347   policy promises retention until a user acts, the function deletes anyway
--               → scheduling would make practice exceed promise → silent deletion of a
--                 user's only cloud restore point on an undisclosed trigger.
--
-- Deleting makes the code match the published policy exactly and requires no legal edit.
-- Scheduling would have required amending §7.3 across all four mirrors that DEBUG-340's
-- own function COMMENT enumerates (privacy-policy.md, california-privacy.md, the
-- being-website repo, and legalContent.generated.ts), plus the three fixes below.
--
-- THREE FURTHER REASONS THE FUNCTION COULD NOT HAVE BEEN SCHEDULED AS WRITTEN:
--
--   1. Its name is impossible. encrypted_backups.user_id is
--      `REFERENCES users(id) ON DELETE CASCADE` with `UNIQUE(user_id)`, so a backup whose
--      owner is gone cannot exist. cleanup_orphaned_backups() can never delete an orphan;
--      it is a DORMANCY prune wearing an orphan's name.
--
--   2. Its predicate silently changed meaning underneath it. INFRA-260 dropped
--      get_or_create_user (20260607120000_auth_uid_rls.sql), which used to advance
--      users.last_sync on every session. The only remaining writer is the
--      update_backup_stats trigger, which fires AFTER INSERT OR UPDATE ON
--      encrypted_backups. So last_sync now means "time of last backup WRITE", not "last
--      user activity" — and a user who enables backup once and never re-saves would be
--      purged at 180 days. That is precisely the user §7.3 undertakes to protect.
--
--   3. update_backup_stats has no AFTER DELETE branch. Any prune would therefore leave
--      users.backup_count and users.total_backup_size_bytes permanently inflated, and the
--      free_tier_usage view (which sums them) over-reporting capacity forever.
--
-- Live pre-flight census taken before writing this migration: 1 user, 0 users dormant
-- beyond 180 days, 0 rows in encrypted_backups. The drop destroys no data and no live
-- behaviour, which makes now the cheapest moment this decision will ever be available.
--
-- IF A DORMANCY PRUNE IS EVER WANTED, it is a new function and a policy change together,
-- not a resurrection of this one: rename it to say what it does, give it SECURITY DEFINER
-- with a pinned search_path, add the AFTER DELETE branch to update_backup_stats, amend
-- §7.3 across the four mirrors, and route it through the heartbeat below.
--
-- ============================================================================
-- PART 2 — WHY THE HEARTBEAT LANDS ON THE ANALYTICS PRUNE
-- ============================================================================
--
-- The work item asks for a run-log "matching the existing crisis_alert_runs and
-- grace_period_automation_runs pattern", because a silently failing retention job is
-- invisible until the next compliance audit. That is right, but a run-log for a deleted
-- function logs nothing — so it goes on the retention prune that actually runs:
-- analytics-retention-prune, scheduled by DEBUG-340, which shipped with no run-log at all.
--
-- ⚠️  DEPLOY IS MANUAL. Migrations do not auto-deploy; until someone runs
-- `supabase db push` this file changes nothing. At the time of writing, the live project
-- was at 20260613000000 with THREE migrations already unapplied — including DEBUG-340's,
-- so analytics-retention-prune does not yet exist in cron.job and cleanup_old_analytics()
-- is dormant in production. This migration would be the fourth in that queue, and the
-- push applies them together. Tracked as INFRA-379; verify afterwards with:
--     SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;
--     SELECT 1 FROM pg_proc WHERE proname = 'cleanup_orphaned_backups';  -- expect 0 rows
--     SELECT * FROM public.retention_prune_health;
-- and re-run get_advisors to confirm no mutable-search-path finding on the new function.

-- ============================================================================
-- 1. Drop the function that must not run
-- ============================================================================

DROP FUNCTION IF EXISTS public.cleanup_orphaned_backups();

-- ============================================================================
-- 2. Retention-prune heartbeat
-- ============================================================================
-- ONE table with a job_name column, rather than one table per job as the three existing
-- heartbeats do. Those each record a distinct EDGE FUNCTION's invocation; retention
-- prunes are same-family pure-SQL jobs that will accrete (analytics today, plausibly
-- others later), and a table apiece would be three near-identical schemas. The RLS /
-- grant / comment posture below is copied from crisis_alert_runs verbatim.

CREATE TABLE IF NOT EXISTS public.retention_prune_runs (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ran_at       timestamptz NOT NULL DEFAULT now(),
  job_name     text NOT NULL,
  status       text NOT NULL CHECK (status IN ('ok', 'error')),
  rows_deleted integer,
  duration_ms  integer,
  sqlstate     text,
  detail       text
);

CREATE INDEX IF NOT EXISTS retention_prune_runs_job_ran_at_idx
  ON public.retention_prune_runs (job_name, ran_at DESC);

-- Operator-only: RLS on with NO policies denies anon/authenticated entirely. Unlike the
-- edge-function heartbeats, the writer here is a SECURITY DEFINER function running under
-- pg_cron as the table owner, so no service_role INSERT grant is required for the write
-- path; SELECT is granted so an operator using the service key can read the health view.
ALTER TABLE public.retention_prune_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.retention_prune_runs FROM anon, authenticated;
GRANT SELECT ON public.retention_prune_runs TO service_role;

COMMENT ON TABLE public.retention_prune_runs IS
  'MAINT-347 heartbeat: one row per retention-prune run, keyed by job_name. '
  'status ok|error. Operator-only (RLS, no policies). PII-FREE BY CONSTRUCTION — it '
  'records counts and timings only; never add a user_id, device_id, or any column '
  'carrying row content, or this table becomes a second copy of what the prune deleted.';

-- ============================================================================
-- 3. Wrapper that prunes AND records
-- ============================================================================

CREATE OR REPLACE FUNCTION public.run_analytics_retention_prune()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
-- pg_cron executes jobs as the job owner, so an unpinned search_path is both an advisor
-- finding and a real hijack surface for a SECURITY DEFINER function (DEBUG-340's fix).
SET search_path = public, pg_temp
AS $$
DECLARE
  started_at timestamptz := clock_timestamp();
  deleted    integer;
BEGIN
  deleted := public.cleanup_old_analytics();

  INSERT INTO public.retention_prune_runs (job_name, status, rows_deleted, duration_ms)
  VALUES (
    'analytics-retention-prune',
    'ok',
    deleted,
    (EXTRACT(EPOCH FROM (clock_timestamp() - started_at)) * 1000)::integer
  );
EXCEPTION WHEN OTHERS THEN
  -- ⚠️ DO NOT ADD A `RAISE` HERE. A plpgsql exception block is a subtransaction: re-raising
  -- rolls this INSERT back with it, so the failure that most needs recording would leave
  -- no row and the job would fail exactly as invisibly as it does today — reproducing the
  -- defect this heartbeat exists to fix. Swallowing loses nothing, because pg_cron records
  -- the failure independently in cron.job_run_details; this table is the retention-specific
  -- view of it, not the only one.
  INSERT INTO public.retention_prune_runs (job_name, status, duration_ms, sqlstate, detail)
  VALUES (
    'analytics-retention-prune',
    'error',
    (EXTRACT(EPOCH FROM (clock_timestamp() - started_at)) * 1000)::integer,
    SQLSTATE,
    SQLERRM
  );
END;
$$;

COMMENT ON FUNCTION public.run_analytics_retention_prune() IS
  'MAINT-347: calls cleanup_old_analytics() and writes a retention_prune_runs heartbeat '
  'for the outcome. Scheduled as cron job "analytics-retention-prune" (DEBUG-340 pointed '
  'that job directly at cleanup_old_analytics; this wrapper interposes the heartbeat). '
  'Its EXCEPTION handler deliberately does not re-raise — see the note in the body.';

-- ============================================================================
-- 4. Re-point the schedule at the wrapper
-- ============================================================================
-- Same jobname and same 04:20 UTC slot DEBUG-340 chose (it clears the 03:30 / 03:45 /
-- 03:50 prunes so the retention sweep never contends with them). Only the command changes.

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('analytics-retention-prune')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'analytics-retention-prune');

SELECT cron.schedule(
  'analytics-retention-prune',
  '20 4 * * *',
  $cron$ SELECT public.run_analytics_retention_prune(); $cron$
);

-- The heartbeat table needs its own bound, or the thing that watches retention becomes
-- the thing with no retention. 03:55 is the next free slot after the 30/45/50 prunes.
SELECT cron.unschedule('retention-prune-runs-prune')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'retention-prune-runs-prune');

SELECT cron.schedule(
  'retention-prune-runs-prune',
  '55 3 * * *',
  $cron$ DELETE FROM public.retention_prune_runs WHERE ran_at < now() - interval '90 days'; $cron$
);

-- ============================================================================
-- 5. Operator health view
-- ============================================================================
-- Deliberately NOT a watchdog. INFRA-266 establishes that automated escalation is
-- reserved for the crisis pipeline; a retention prune that misses a night is not a
-- life-safety event. This is the one-SELECT answer to "is the prune still running", which
-- is what the work item's "invisible until the next compliance audit" actually needs.

CREATE OR REPLACE VIEW public.retention_prune_health AS
SELECT
  job_name,
  max(ran_at) FILTER (WHERE status = 'ok')            AS last_ok_at,
  now() - max(ran_at) FILTER (WHERE status = 'ok')    AS since_last_ok,
  (array_agg(status ORDER BY ran_at DESC))[1]         AS latest_status,
  (array_agg(rows_deleted ORDER BY ran_at DESC))[1]   AS latest_rows_deleted,
  count(*) FILTER (WHERE status = 'error')            AS error_runs
FROM public.retention_prune_runs
GROUP BY job_name;

REVOKE ALL ON public.retention_prune_health FROM anon, authenticated;
GRANT SELECT ON public.retention_prune_health TO service_role;

COMMENT ON VIEW public.retention_prune_health IS
  'MAINT-347 operator view: per-job liveness of the retention prunes. A NULL last_ok_at, '
  'or a since_last_ok beyond ~1 day, means the prune is not running. Operator-only.';
