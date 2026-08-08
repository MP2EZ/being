-- MAINT-347 retention-heartbeat verification suite — proves the unschedulable function is
-- gone, and that the prune that DOES run records whether it ran.
--
-- WHAT THIS EXISTS TO CATCH. Three silent failures, none of which breaks a build:
--   1. cleanup_orphaned_backups() coming back. It deleted encrypted_backups on 180 days of
--      user inactivity while privacy-policy §7.3 promises retention "until you disable
--      backup or request deletion" — both USER ACTS. Scheduling it would silently delete a
--      user's only cloud restore point on an undisclosed trigger. Test 1 catches a
--      resurrection; test 2 catches the more likely regression, someone scheduling it.
--   2. The heartbeat losing its operator-only posture. Test 3.
--   3. THE SUBTLE ONE, test 5: a `RAISE` being added to the wrapper's EXCEPTION handler.
--      A plpgsql exception block is a subtransaction, so re-raising rolls back the very
--      INSERT that records the failure — the error row silently never lands and the job
--      fails exactly as invisibly as it did before this migration. That is a one-word edit
--      that looks like an improvement and quietly restores the original defect, which is
--      why it gets both a static check (test 5) and a behavioural one (test 7).
--
-- HOW TO RUN (local stack; no remote/paid resources):
--   supabase start && supabase db reset            # applies all migrations
--   docker exec -i supabase_db_$(basename "$PWD") psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/maint347_retention_heartbeat.sql
--   # exit 0 + "ALL MAINT-347 RETENTION-HEARTBEAT TESTS PASSED" = green; any RAISE = a regression.
--
-- Do NOT run this against the shared prod project — it inserts and deletes rows. The data
-- tests are wrapped in a transaction that is ROLLED BACK, and the suite is re-runnable.
--
-- NOT YET VALIDATED ON THE LOCAL STACK — authored 2026-08-08 alongside the migration.
-- Run it before/with the manual `supabase db push` (INFRA-379) and record the result here,
-- matching infra265_probe_verification.sql's "Last validated:" line.

\set ON_ERROR_STOP on

\set U '99999999-9999-9999-9999-999999999348'

-- ============ Test 1: the unschedulable function is gone ============
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
     WHERE proname = 'cleanup_orphaned_backups'
       AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION
      'FAIL(1): public.cleanup_orphaned_backups() exists again. It deletes encrypted_backups '
      'on 180 days of inactivity, which privacy-policy §7.3 does not permit (it promises '
      'retention until the USER disables backup or requests deletion). If a dormancy prune '
      'is genuinely wanted, it needs a truthful name, SECURITY DEFINER + pinned search_path, '
      'an AFTER DELETE branch on update_backup_stats, and a §7.3 amendment across all four '
      'legal mirrors — see 20260808000000_retention_prune_heartbeat.sql.';
  END IF;
  RAISE NOTICE 'PASS(1): cleanup_orphaned_backups() is absent';
END $$;

-- ============ Test 2: and nothing schedules it ============
-- Stronger than test 1: catches a resurrection under any name whose command reaches it.
DO $$
DECLARE
  offending text;
BEGIN
  SELECT string_agg(jobname, ', ') INTO offending
    FROM cron.job
   WHERE command ILIKE '%cleanup_orphaned_backups%';

  IF offending IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL(2): cron job(s) [%] invoke cleanup_orphaned_backups()', offending;
  END IF;
  RAISE NOTICE 'PASS(2): no cron job invokes cleanup_orphaned_backups()';
END $$;

-- ============ Test 3: heartbeat table exists, operator-only, PII-free ============
DO $$
DECLARE
  rls_on  boolean;
  n_pol   integer;
  n_grant integer;
  leaky   text;
BEGIN
  SELECT relrowsecurity INTO rls_on
    FROM pg_class WHERE oid = 'public.retention_prune_runs'::regclass;
  IF rls_on IS NULL THEN
    RAISE EXCEPTION 'FAIL(3): public.retention_prune_runs does not exist';
  END IF;
  IF NOT rls_on THEN
    RAISE EXCEPTION 'FAIL(3): retention_prune_runs has RLS disabled';
  END IF;

  SELECT count(*) INTO n_pol
    FROM pg_policy WHERE polrelid = 'public.retention_prune_runs'::regclass;
  IF n_pol <> 0 THEN
    RAISE EXCEPTION
      'FAIL(3): retention_prune_runs has % RLS policies; the operator-only posture is '
      'RLS ON with NO policies (a policy would grant access, not restrict it)', n_pol;
  END IF;

  SELECT count(*) INTO n_grant
    FROM information_schema.role_table_grants
   WHERE table_schema = 'public'
     AND table_name = 'retention_prune_runs'
     AND grantee IN ('anon', 'authenticated');
  IF n_grant <> 0 THEN
    RAISE EXCEPTION 'FAIL(3): retention_prune_runs grants % privilege(s) to anon/authenticated', n_grant;
  END IF;

  -- PII-free by construction. The table records counts and timings; a column naming a user
  -- would turn the audit trail into a second copy of what the prune deleted.
  SELECT string_agg(column_name, ', ') INTO leaky
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'retention_prune_runs'
     AND column_name IN ('user_id', 'device_id', 'email', 'payload', 'content');
  IF leaky IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL(3): retention_prune_runs has identifying column(s): %', leaky;
  END IF;

  RAISE NOTICE 'PASS(3): retention_prune_runs is operator-only and PII-free';
END $$;

-- ============ Test 4: the wrapper has the right security posture ============
DO $$
DECLARE
  fn pg_proc%ROWTYPE;
BEGIN
  SELECT * INTO fn FROM pg_proc
   WHERE proname = 'run_analytics_retention_prune'
     AND pronamespace = 'public'::regnamespace;

  IF fn IS NULL THEN
    RAISE EXCEPTION 'FAIL(4): public.run_analytics_retention_prune() does not exist';
  END IF;
  IF NOT fn.prosecdef THEN
    RAISE EXCEPTION 'FAIL(4): run_analytics_retention_prune() is not SECURITY DEFINER';
  END IF;
  IF fn.proconfig IS NULL
     OR NOT EXISTS (SELECT 1 FROM unnest(fn.proconfig) c WHERE c LIKE 'search_path=%') THEN
    RAISE EXCEPTION
      'FAIL(4): run_analytics_retention_prune() has no pinned search_path. pg_cron runs '
      'jobs as the job owner, so this is both an advisor finding and a hijack surface.';
  END IF;
  RAISE NOTICE 'PASS(4): wrapper is SECURITY DEFINER with a pinned search_path';
END $$;

-- ============ Test 5: the EXCEPTION handler does not re-raise ============
-- The static half of the subtransaction guard. See the header note.
DO $$
DECLARE
  body text;
BEGIN
  SELECT prosrc INTO body FROM pg_proc
   WHERE proname = 'run_analytics_retention_prune'
     AND pronamespace = 'public'::regnamespace;

  IF body !~* 'EXCEPTION' THEN
    RAISE EXCEPTION
      'FAIL(5): run_analytics_retention_prune() has no EXCEPTION block, so a failing prune '
      'writes no error heartbeat — the exact invisibility this migration exists to fix.';
  END IF;

  -- Any bare RAISE / RAISE EXCEPTION / RERAISE in the body would abort the subtransaction
  -- and discard the error INSERT. RAISE NOTICE and friends are harmless, so they are
  -- allowed explicitly rather than by omission.
  IF body ~* '(^|[^[:alnum:]_])raise[[:space:]]*(;|exception)' THEN
    RAISE EXCEPTION
      'FAIL(5): run_analytics_retention_prune() re-raises inside its EXCEPTION handler. '
      'A plpgsql exception block is a subtransaction — re-raising rolls back the heartbeat '
      'INSERT with it, so the failure that most needs recording leaves no row. pg_cron '
      'already records the failure in cron.job_run_details; do not re-raise here.';
  END IF;
  RAISE NOTICE 'PASS(5): EXCEPTION handler present and does not re-raise';
END $$;

-- ============ Test 6: the schedule points at the wrapper, not past it ============
DO $$
DECLARE
  cmd  text;
  sched text;
BEGIN
  SELECT command, schedule INTO cmd, sched
    FROM cron.job WHERE jobname = 'analytics-retention-prune';

  IF cmd IS NULL THEN
    RAISE EXCEPTION 'FAIL(6): cron job "analytics-retention-prune" is not scheduled';
  END IF;
  IF cmd NOT ILIKE '%run_analytics_retention_prune%' THEN
    RAISE EXCEPTION
      'FAIL(6): "analytics-retention-prune" runs [%] rather than the heartbeat wrapper. '
      'Calling cleanup_old_analytics() directly prunes correctly but records nothing, '
      'which is the state DEBUG-340 left and MAINT-347 fixed.', cmd;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'retention-prune-runs-prune') THEN
    RAISE EXCEPTION
      'FAIL(6): "retention-prune-runs-prune" is not scheduled — the heartbeat table would '
      'grow unbounded, making the retention watcher the one thing with no retention.';
  END IF;

  RAISE NOTICE 'PASS(6): schedule points at the wrapper (%) and the heartbeat is bounded', sched;
END $$;

-- ============ Test 7: round-trip — a real run writes a real heartbeat ============
-- Behavioural counterpart to test 5. Rolled back.
BEGIN;

-- analytics_events requires a real user_id FK and a session_id matching
-- '^session_[0-9]{4}-[0-9]{2}-[0-9]{2}_[a-z0-9]+$'; seeding auth.users lets
-- on_auth_user_created provision the matching public.users row (DEBUG-340's pattern).
INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
VALUES (:'U'::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'maint347-heartbeat@test.invalid', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 400 days old and non-crisis, so the 90-day tier deletes it. Deliberately NOT
-- crisis_detected: that tier is retained 3 years and would survive, making rows_deleted 0
-- and the assertion below vacuous.
INSERT INTO public.analytics_events (user_id, event_type, properties, session_id, created_at)
VALUES (:'U'::uuid, 'maint347_probe', '{}'::jsonb,
        'session_2025-07-05_maint347a', NOW() - INTERVAL '400 days');

SELECT public.run_analytics_retention_prune();

  DO $$
  DECLARE
    r public.retention_prune_runs%ROWTYPE;
  BEGIN
    SELECT * INTO r FROM public.retention_prune_runs
     WHERE job_name = 'analytics-retention-prune'
     ORDER BY ran_at DESC, id DESC LIMIT 1;

    IF r IS NULL THEN
      RAISE EXCEPTION 'FAIL(7): the prune ran but wrote no heartbeat row';
    END IF;
    IF r.status <> 'ok' THEN
      RAISE EXCEPTION 'FAIL(7): heartbeat status is % (detail: %)', r.status, r.detail;
    END IF;
    IF r.rows_deleted IS NULL OR r.rows_deleted < 1 THEN
      RAISE EXCEPTION
        'FAIL(7): heartbeat recorded rows_deleted=% but the probe row (400 days old, '
        'non-crisis) should have been pruned', r.rows_deleted;
    END IF;
    IF r.duration_ms IS NULL THEN
      RAISE EXCEPTION 'FAIL(7): heartbeat recorded no duration_ms';
    END IF;

    -- The probe row itself must be gone; proves the wrapper actually pruned rather than
    -- only logging that it did.
    IF EXISTS (SELECT 1 FROM public.analytics_events WHERE event_type = 'maint347_probe') THEN
      RAISE EXCEPTION 'FAIL(7): probe row survived the prune';
    END IF;

    RAISE NOTICE 'PASS(7): run wrote an ok heartbeat (rows_deleted=%, %ms)',
      r.rows_deleted, r.duration_ms;
  END $$;

ROLLBACK;

-- ============ Test 8: the health view reads back ============
DO $$
BEGIN
  IF to_regclass('public.retention_prune_health') IS NULL THEN
    RAISE EXCEPTION 'FAIL(8): public.retention_prune_health does not exist';
  END IF;
  PERFORM * FROM public.retention_prune_health;
  RAISE NOTICE 'PASS(8): retention_prune_health is queryable';
END $$;

\echo 'ALL MAINT-347 RETENTION-HEARTBEAT TESTS PASSED'
