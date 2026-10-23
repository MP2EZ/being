-- INFRA-851 — null the IP address and user agent GoTrue keeps on every auth.sessions row,
-- hourly (ruling (c), founder decision 2026-10-23).
--
-- THE GAP. GoTrue writes auth.sessions.ip and .user_agent when a session is created and
-- rewrites both on every token refresh (internal/tokens/service.go:615-626,
-- Session.UpdateOnlyRefreshInfo at internal/models/sessions.go:175, read at the hosted tag
-- v2.197.0). Nothing in GoTrue reads them back: they are assignments and JSON serialisation
-- only. So every anonymous identity carries the IP address of its latest connection for as long
-- as it exists, which joins a crisis_detected row or a backup to a network, and joins an old
-- install's identity to a reinstall's (MAINT-847, disclosed by DEBUG-850).
--
-- WHY A JOB, NOT A TRIGGER. A trigger runs inside GoTrue's own writes to a table GoTrue owns, so
-- an upgrade that changes those writes could break sign-in or refresh, and an anonymous user who
-- loses a session loses the identity and its cloud data. A job fails safe: if it stops, the IP is
-- retained, which DEBUG-850's disclosure already covers. The trade is that a row carries an IP
-- for up to an hour after each refresh. No trigger is added to any auth.* table.
--
-- THE SCRUB. Every row, not only is_anonymous ones: every identity on this project is anonymous.
--   - Sets ip and user_agent ONLY. Never created_at, updated_at or refreshed_at:
--     orphaned_identity_candidates() (INFRA-848) reads them as last activity, and touching them
--     would make every identity look live.
--   - FOR UPDATE SKIP LOCKED, so the job never waits on a session GoTrue is refreshing. GoTrue
--     itself takes the row with FOR UPDATE SKIP LOCKED and retries for 5 seconds
--     (service.go:29, :210), so the scrub's own row locks, held for the few milliseconds of one
--     UPDATE, cannot turn a refresh into a lost session. A skipped row is caught next hour.
--   - lock_timeout '1s' stops the job queueing behind a table lock (a GoTrue upgrade's DDL) and
--     stalling auth traffic behind it. The cron command sets statement_timeout '5s': a function's
--     own SET cannot bound the statement that called it.
--   - At most 5000 rows a run; the hosted table holds ~150.
--
-- LOGGING. One retention_prune_runs row per run, job 'auth-session-ip-scrub'. rows_deleted holds
-- the rows scrubbed (nothing is deleted; the column is the shared heartbeat's count), and detail
-- holds 'remaining=N': rows still carrying a value afterwards, from a refresh since or a skipped
-- lock. The error path records SQLSTATE and a fixed reason, never SQLERRM, which can quote the
-- row it failed on — an IP address and user agent. No column carries a uid or a value.
--
-- Operator-only: revoked from PUBLIC, anon, authenticated and service_role. pg_cron runs the job
-- as the owner, which must hold UPDATE on the two columns and bypass auth.sessions' RLS (GoTrue
-- enables it). The DO block below refuses the push when it does not, rather than shipping a job
-- that scrubs zero rows and reports ok.
--
-- No backfill here: the founder runs SELECT public.run_auth_session_ip_scrub() once after the
-- push. Idempotent: the function is replaced and the job unscheduled before it is rescheduled.
-- Pinned by supabase/tests/infra851_auth_session_ip_scrub.sql.

CREATE OR REPLACE FUNCTION public.run_auth_session_ip_scrub()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET lock_timeout = '1s'
AS $$
DECLARE
  started_at  timestamptz := clock_timestamp();
  n_scrubbed  integer;
  n_remaining integer;
BEGIN
  UPDATE auth.sessions
     SET ip = NULL, user_agent = NULL
   WHERE id IN (SELECT id FROM auth.sessions
                 WHERE ip IS NOT NULL OR user_agent IS NOT NULL
                 ORDER BY id
                 LIMIT 5000
                 FOR UPDATE SKIP LOCKED);
  GET DIAGNOSTICS n_scrubbed = ROW_COUNT;
  SELECT count(*) INTO n_remaining FROM auth.sessions WHERE ip IS NOT NULL OR user_agent IS NOT NULL;
  INSERT INTO public.retention_prune_runs (job_name, status, rows_deleted, duration_ms, detail)
  VALUES (
    'auth-session-ip-scrub', 'ok', n_scrubbed,
    (EXTRACT(EPOCH FROM (clock_timestamp() - started_at)) * 1000)::integer,
    format('remaining=%s', n_remaining)
  );
EXCEPTION WHEN OTHERS THEN
  -- ⚠️ No RAISE here: re-raising would roll back this heartbeat row too (see 20260808000000).
  -- A fixed reason, never SQLERRM: a constraint or trigger message can quote an IP address.
  INSERT INTO public.retention_prune_runs (job_name, status, duration_ms, sqlstate, detail)
  VALUES (
    'auth-session-ip-scrub', 'error',
    (EXTRACT(EPOCH FROM (clock_timestamp() - started_at)) * 1000)::integer,
    SQLSTATE, 'auth-session-ip-scrub run failed'
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.run_auth_session_ip_scrub()
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public.run_auth_session_ip_scrub() IS
  'INFRA-851: nulls auth.sessions.ip and user_agent (never the timestamps INFRA-848 reads) and '
  'writes one retention_prune_runs heartbeat per run: rows_deleted = rows scrubbed, detail = '
  'remaining count. Scheduled hourly as auth-session-ip-scrub. Operator-only.';

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.unschedule('auth-session-ip-scrub')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auth-session-ip-scrub');
-- :25 is free: the hourly job runs at :05, the six-hourly ones at :00, the rest nightly.
SELECT cron.schedule(
  'auth-session-ip-scrub',
  '25 * * * *',
  $cron$ SET statement_timeout = '5s'; SELECT public.run_auth_session_ip_scrub(); $cron$
);

-- Fail closed: a job that cannot write the columns would report ok while scrubbing nothing.
DO $$
DECLARE
  fn    constant regprocedure := 'public.run_auth_session_ip_scrub()'::regprocedure;
  v_owner name;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job
                  WHERE jobname = 'auth-session-ip-scrub' AND schedule = '25 * * * *' AND active) THEN
    RAISE EXCEPTION 'INFRA-851: auth-session-ip-scrub is not scheduled';
  END IF;
  IF NOT (SELECT prosecdef FROM pg_proc WHERE oid = fn) THEN
    RAISE EXCEPTION 'INFRA-851: run_auth_session_ip_scrub is not SECURITY DEFINER';
  END IF;
  SELECT proowner::regrole::name INTO v_owner FROM pg_proc WHERE oid = fn;
  IF NOT has_table_privilege(v_owner, 'auth.sessions', 'SELECT')
     OR NOT has_column_privilege(v_owner, 'auth.sessions', 'ip', 'UPDATE')
     OR NOT has_column_privilege(v_owner, 'auth.sessions', 'user_agent', 'UPDATE') THEN
    RAISE EXCEPTION 'INFRA-851: % cannot SELECT auth.sessions and UPDATE its ip and user_agent', v_owner;
  END IF;
  IF (SELECT relrowsecurity FROM pg_class WHERE oid = 'auth.sessions'::regclass)
     AND NOT (SELECT rolbypassrls FROM pg_roles WHERE rolname = v_owner)
     AND (SELECT relowner::regrole::name FROM pg_class WHERE oid = 'auth.sessions'::regclass) <> v_owner THEN
    RAISE EXCEPTION 'INFRA-851: auth.sessions has RLS on and % neither bypasses it nor owns the table', v_owner;
  END IF;
END $$;

-- =====================================================
-- ROLLBACK (manual). Scrubbed values are not recoverable; GoTrue rewrites them on the next refresh.
-- =====================================================
-- SELECT cron.unschedule('auth-session-ip-scrub');
-- DROP FUNCTION IF EXISTS public.run_auth_session_ip_scrub();
