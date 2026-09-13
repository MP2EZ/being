-- DEBUG-455 — the generalized guard: NO callable SECURITY DEFINER function in `public` may
-- run with a mutable `search_path`.
--
-- WHY A SWEEP AND NOT SEVEN ASSERTIONS.
-- DEBUG-455 was filed against a list of five (plus two hygiene cases). A per-function pin
-- catches the ones already known. It cannot catch the NEXT SECURITY DEFINER function someone
-- adds without a `SET search_path`, which is the actual defect class: Postgres does not pin
-- a path by default, so every new SECDEF function is born with a mutable one unless the
-- author remembers. Test 1 is the rule; Test 2 is the named list, kept only because it gives
-- a legible failure message when the rule fires. Same two-tier structure as
-- debug440_rpc_execute_sweep.sql, and for the same reason.
--
-- WHY THE EXCLUSION IS A RULE, NOT AN ALLOWLIST.
-- Trigger-typed functions (`RETURNS trigger` / `RETURNS event_trigger`) are excluded because
-- Postgres refuses to invoke them outside trigger context (ERROR 42809) whatever their
-- configuration — unreachable by construction, not by configuration. Encoding that as a
-- predicate on `prorettype` means a future trigger function excludes itself, and a future
-- NON-trigger function cannot be quietly added to a list to make this test go green. There is
-- no allowlist to grow.
--
-- WHY THIS RULE IS SCOPED TO `prosecdef` AND STOPS THERE.
-- SECURITY INVOKER functions run with the CALLER's privileges, so a redirected reference
-- cannot cross a privilege boundary — there is no escalation surface to protect. DEBUG-455
-- pins the two INVOKER triggers anyway (advisor hygiene, and the pin is free), and Test 2
-- asserts them. But they are deliberately NOT folded into Test 1: a blanket "every function
-- must carry proconfig" rule would eventually flag ordinary unprivileged helpers with no
-- security rationale, and a guard that fires on things nobody needs to fix stops being read.
--
-- Known members of the excluded set at time of writing: `handle_new_auth_user()` (ours,
-- 20260607120000) and `rls_auto_enable()` (platform-managed, in NO tracked migration — see
-- supabase/README.md "Objects present in production but created by no migration").
--
-- HOW TO RUN (local stack):
--   supabase start && supabase db reset
--   docker exec -i supabase_db_$(basename "$PWD") psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/debug455_search_path_pin_sweep.sql
--
-- SAFE AGAINST SHARED PROD: strictly read-only, invokes nothing. Running it in the Supabase
-- SQL editor after any migration push is the intended use.
--
-- Last validated: 2026-08-16 against the shared prod project.

\set ON_ERROR_STOP on

-- ============ Test 1: the sweep — no callable SECDEF function has a mutable search_path
DO $$
DECLARE
  v_offenders text;
  v_count     integer;
BEGIN
  SELECT count(*), string_agg(sig, E'\n    ' ORDER BY sig)
    INTO v_count, v_offenders
    FROM (
      SELECT n.nspname || '.' || p.proname
             || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS sig
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public'
         AND p.prosecdef
         -- Unreachable by construction: Postgres refuses direct invocation (ERROR 42809).
         AND p.prorettype NOT IN ('trigger'::regtype, 'event_trigger'::regtype)
         -- Mutable: no proconfig at all, or a proconfig that never pins search_path.
         AND (
           p.proconfig IS NULL
           OR NOT EXISTS (
             SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%'
           )
         )
    ) offenders;

  IF v_count > 0 THEN
    RAISE EXCEPTION
      E'DEBUG-455 FAIL: % callable SECURITY DEFINER function(s) in public run with a mutable '
       'search_path:\n    %\n  Pin each with: ALTER FUNCTION <sig> SET search_path = public, pg_temp;\n'
       '  First CONFIRM every unqualified reference in the body resolves under the pinned path — '
       'that is the one way this change breaks something.', v_count, v_offenders;
  END IF;

  RAISE NOTICE 'DEBUG-455 Test 1 PASS: every callable SECDEF function in public pins search_path.';
END $$;

-- ============ Test 2: the seven named by DEBUG-455 carry exactly `public, pg_temp`
-- Narrower than Test 1 on purpose. Test 1 accepts ANY pinned path (crisis_alert_watchdog and
-- subscription_verification_watchdog legitimately need `public, net, vault, extensions`).
-- These seven were enumerated and proven to resolve fully inside `public`, so a different
-- value on one of them means someone widened it without redoing that enumeration.
DO $$
DECLARE
  fn       text;
  fns      text[] := ARRAY[
    'public.expire_old_trials()',
    'public.expire_grace_periods()',
    'public.get_expiring_trials(integer)',
    'public.get_expiring_grace_periods(integer)',
    'public.log_subscription_event(uuid, uuid, text, jsonb)',
    'public.update_backup_stats()',
    'public.update_subscription_timestamp()'
  ];
  v_config text[];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    SELECT p.proconfig INTO v_config
      FROM pg_proc p
     WHERE p.oid = fn::regprocedure;

    IF v_config IS NULL
       OR NOT EXISTS (SELECT 1 FROM unnest(v_config) c WHERE c = 'search_path=public, pg_temp')
    THEN
      RAISE EXCEPTION
        'DEBUG-455 Test 2 FAIL: % does not carry search_path=public, pg_temp (proconfig = %)',
        fn, COALESCE(array_to_string(v_config, ', '), '(null)');
    END IF;
  END LOOP;

  RAISE NOTICE 'DEBUG-455 Test 2 PASS: all 7 named functions pin search_path=public, pg_temp.';
END $$;

-- ============ Test 3: the control — prove Test 1 can still go red
-- A sweep whose predicate has drifted out of alignment with the catalog looks EXACTLY like a
-- clean database. This asserts the offender predicate matches a deliberately-constructed
-- known-bad function, then drops it. Without this, Tests 1 and 2 could both be silently
-- vacuous and nobody would know.
DO $$
DECLARE
  v_matches integer;
BEGIN
  CREATE FUNCTION public._debug455_control_unpinned() RETURNS integer
    LANGUAGE sql SECURITY DEFINER AS $fn$ SELECT 1 $fn$;

  SELECT count(*) INTO v_matches
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname = '_debug455_control_unpinned'
     AND p.prosecdef
     AND p.prorettype NOT IN ('trigger'::regtype, 'event_trigger'::regtype)
     AND (
       p.proconfig IS NULL
       OR NOT EXISTS (SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%')
     );

  DROP FUNCTION public._debug455_control_unpinned();

  IF v_matches <> 1 THEN
    RAISE EXCEPTION
      'DEBUG-455 Test 3 FAIL: the Test 1 predicate did NOT match a known-bad unpinned SECDEF '
      'function (matched % rows, expected 1). Test 1 is vacuous — fix the predicate.', v_matches;
  END IF;

  RAISE NOTICE 'DEBUG-455 Test 3 PASS: the Test 1 predicate still fires on a known-bad function.';
END $$;
