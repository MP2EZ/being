-- DEBUG-440 verification suite — proves `public.crisis_alert_watchdog()` is NOT reachable by
-- an unauthenticated caller, and that closing it did not sever the pg_cron path that is the
-- watchdog's only legitimate caller.
--
-- WHY THIS FILE EXISTS AT ALL, when the migration already asserts the same facts.
-- The migration's DO block fires exactly once, at apply time. This is re-runnable, so it is
-- the artifact you point at AFTER any later schema push, function replacement, or restore —
-- the events that can silently reopen the hole. `CREATE OR REPLACE` preserves a function's
-- ACL but `DROP` + recreate resets EXECUTE to PUBLIC, and nothing in the schema announces
-- that; only a privilege query does.
--
-- WHY IT IS NOT A SOURCE TEST. The defect being verified here is precisely that a source
-- assertion CANNOT see it: `20260607000000_crisis_alert_cron.sql:154` has always contained
-- `REVOKE ALL ON FUNCTION public.crisis_alert_watchdog() FROM anon, authenticated`, and the
-- function was anon-executable the whole time anyway (revoking from a role does not touch
-- the PUBLIC grant it inherits). A test grepping for that REVOKE would have passed against
-- the broken state. Privilege is runtime state. Query it.
--
-- HOW TO RUN (local stack):
--   supabase start && supabase db reset            # applies all migrations
--   docker exec -i supabase_db_$(basename "$PWD") psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/debug440_watchdog_privilege.sql
--   # exit 0 + "ALL DEBUG-440 TESTS PASSED" = green; any RAISE = a real regression.
--
-- UNLIKE the other files in this directory, this one is SAFE TO RUN AGAINST THE SHARED PROD
-- PROJECT: it is strictly read-only — no INSERT, no UPDATE, no transaction to roll back — and
-- it never invokes the watchdog. Running it in the Supabase SQL editor after a deploy is the
-- intended post-deploy verification. Do NOT "improve" it by calling the function to see what
-- happens: the watchdog is normally in its healthy early-return, so a successful call proves
-- nothing about the send path, and forcing the escalation branch pages the founder.
--
-- Last validated: 2026-08-15 against the shared prod project.

\set ON_ERROR_STOP on

-- ============ Test 1: anon and authenticated cannot EXECUTE ============
DO $$
BEGIN
  IF has_function_privilege('anon', 'public.crisis_alert_watchdog()', 'EXECUTE') THEN
    RAISE EXCEPTION
      'FAIL: anon holds EXECUTE on crisis_alert_watchdog() — reachable at '
      'POST /rest/v1/rpc/crisis_alert_watchdog with the app-embedded anon key';
  END IF;
  IF has_function_privilege('authenticated', 'public.crisis_alert_watchdog()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: authenticated holds EXECUTE on crisis_alert_watchdog()';
  END IF;
  RAISE NOTICE 'PASS: anon + authenticated denied EXECUTE on crisis_alert_watchdog()';
END $$;

-- ============ Test 2: the PUBLIC grant itself is gone ============
-- Test 1 can be satisfied by a role-level revoke while PUBLIC still holds EXECUTE in some
-- configurations, so assert the ACL shape directly. A NULL proacl means "defaults", which
-- for a function INCLUDES `EXECUTE TO PUBLIC` — so NULL is a FAILURE here, not an absence.
DO $$
DECLARE
  v_acl text;
BEGIN
  SELECT p.proacl::text INTO v_acl
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'crisis_alert_watchdog';

  IF v_acl IS NULL THEN
    RAISE EXCEPTION
      'FAIL: crisis_alert_watchdog() has a NULL proacl — that is the DEFAULT ACL, which '
      'grants EXECUTE to PUBLIC. The function was probably dropped and recreated.';
  END IF;
  -- The leading `=X/` entry is PUBLIC holding EXECUTE (no grantee before the `=`).
  IF v_acl LIKE '%{=X/%' OR v_acl LIKE '%,=X/%' THEN
    RAISE EXCEPTION 'FAIL: proacl still carries a PUBLIC EXECUTE entry: %', v_acl;
  END IF;
  RAISE NOTICE 'PASS: no PUBLIC EXECUTE entry in proacl (%)', v_acl;
END $$;

-- ============ Test 3: the cron path is INTACT (did not over-revoke) ============
-- The failure this guards is worse than the defect: a revoke that also severed `postgres`
-- would leave the crisis watchdog silently not escalating, which is the exact condition the
-- watchdog exists to detect and cannot report about itself.
DO $$
BEGIN
  IF NOT has_function_privilege('postgres', 'public.crisis_alert_watchdog()', 'EXECUTE') THEN
    RAISE EXCEPTION
      'FAIL: postgres lacks EXECUTE on crisis_alert_watchdog() — the pg_cron watchdog runs '
      'as postgres and would silently stop escalating';
  END IF;
  RAISE NOTICE 'PASS: postgres retains EXECUTE (pg_cron path intact)';
END $$;

-- ============ Test 4: the watchdog job is still scheduled, active, and owned by postgres ==
-- Keyed on jobname, never jobid: jobids are assignment-ordered and differ between the local
-- stack and prod, so a jobid literal would pass or fail for the wrong reason.
-- `username` is asserted because Test 3's privilege check is only meaningful if the job
-- actually runs as that role.
DO $$
DECLARE
  v_active   boolean;
  v_schedule text;
  v_username text;
BEGIN
  SELECT active, schedule, username INTO v_active, v_schedule, v_username
  FROM cron.job WHERE jobname = 'crisis-alerter-watchdog';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FAIL: cron job "crisis-alerter-watchdog" does not exist';
  END IF;
  IF NOT v_active THEN
    RAISE EXCEPTION 'FAIL: cron job "crisis-alerter-watchdog" exists but is INACTIVE';
  END IF;
  IF v_username <> 'postgres' THEN
    RAISE EXCEPTION
      'FAIL: "crisis-alerter-watchdog" runs as % , not postgres — Test 3 asserts the wrong '
      'role and the job may lack EXECUTE', v_username;
  END IF;
  RAISE NOTICE 'PASS: crisis-alerter-watchdog active, schedule=%, runs as %', v_schedule, v_username;
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL DEBUG-440 TESTS PASSED'; END $$;
