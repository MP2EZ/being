-- DEBUG-440 — the generalized guard: NO callable SECURITY DEFINER function in `public` may be
-- executable by `anon` or `authenticated`.
--
-- WHY THIS FILE IS THE POINT OF THE TICKET.
-- DEBUG-440 was filed against one function. The enumeration its AC5 demanded found eight, six
-- of them genuinely exposed and two returning other users' data. That ratio is the lesson: the
-- defect class is not "someone forgot a REVOKE on function X", it is "Postgres grants EXECUTE
-- to PUBLIC by default and PostgREST publishes `public` at /rest/v1/rpc/<name>", so EVERY new
-- SECURITY DEFINER function is born exposed unless someone remembers. A per-function pin
-- catches the one you already know about. This catches the next one.
--
-- WHY THE EXCLUSION IS A RULE, NOT AN ALLOWLIST.
-- Trigger-typed functions (`RETURNS trigger` / `RETURNS event_trigger`) are excluded because
-- Postgres itself refuses to invoke them outside trigger context (ERROR 42809) whatever the
-- grants say — they are unreachable by construction, not by configuration. Encoding that as a
-- predicate on `prorettype` rather than as a list of names means a future trigger function
-- excludes itself, and — more importantly — a future NON-trigger function cannot be quietly
-- added to a list to make this test go green. There is no allowlist to grow.
--
-- Known members of the excluded set at time of writing: `handle_new_auth_user()` (ours,
-- `20260607120000`) and `rls_auto_enable()` (in NO tracked migration; body matches the standard
-- Supabase auto-enable-RLS event trigger, i.e. platform-managed). The latter is a separate
-- finding — "the migrations directory is ground truth for production" is currently FALSE — and
-- is filed rather than absorbed here.
--
-- HOW TO RUN (local stack):
--   supabase start && supabase db reset
--   docker exec -i supabase_db_$(basename "$PWD") psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/debug440_rpc_execute_sweep.sql
--
-- SAFE AGAINST SHARED PROD: strictly read-only, invokes nothing. Running it in the Supabase
-- SQL editor after any migration push is the intended use.
--
-- Last validated: 2026-08-15 against the shared prod project.

\set ON_ERROR_STOP on

-- ============ Test 1: the sweep — no callable SECDEF function is anon/authenticated-executable
DO $$
DECLARE
  v_offenders text;
  v_count     integer;
BEGIN
  SELECT count(*), string_agg(sig, E'\n    ' ORDER BY sig)
    INTO v_count, v_offenders
  FROM (
    SELECT p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
           || ' [anon=' || has_function_privilege('anon', p.oid, 'EXECUTE')::text
           || ' authenticated=' || has_function_privilege('authenticated', p.oid, 'EXECUTE')::text || ']' AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef                                   -- SECURITY DEFINER only
      AND p.prorettype NOT IN ('trigger'::regtype, 'event_trigger'::regtype)  -- uncallable by type
      AND ( has_function_privilege('anon',          p.oid, 'EXECUTE')
         OR has_function_privilege('authenticated', p.oid, 'EXECUTE') )
  ) s;

  IF v_count > 0 THEN
    RAISE EXCEPTION
      E'FAIL: % callable SECURITY DEFINER function(s) in `public` are executable by anon or authenticated.\n'
      '    Each is reachable at POST /rest/v1/rpc/<name> with the anon key that ships in the app.\n'
      '    %\n'
      '    Fix: REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated — and, if a server-side caller\n'
      '    uses it, GRANT EXECUTE ... TO service_role IN THE SAME MIGRATION. service_role often\n'
      '    reaches these ONLY via the inherited PUBLIC grant, so a bare revoke breaks the pipeline.',
      v_count, v_offenders;
  END IF;
  RAISE NOTICE 'PASS: no callable SECURITY DEFINER function in public is anon/authenticated-executable';
END $$;

-- ============ Test 2: the over-revoke direction — service_role must KEEP its five ============
-- The failure this guards turns a security fix into an outage: `grace-period-automation` calls
-- all five with the service_role key through PostgREST, and before DEBUG-440 service_role
-- reached them ONLY by inheriting PUBLIC (no explicit grant, and it is a member of neither
-- postgres nor authenticated — verified). A revoke without the matching grant breaks the daily
-- 02:00 UTC run, silently, one day after INFRA-379 fixed that same pipeline.
DO $$
DECLARE
  fn  text;
  fns text[] := ARRAY[
    'public.expire_old_trials()',
    'public.expire_grace_periods()',
    'public.get_expiring_trials(integer)',
    'public.get_expiring_grace_periods(integer)',
    'public.log_subscription_event(uuid, uuid, text, jsonb)'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    IF NOT has_function_privilege('service_role', fn, 'EXECUTE') THEN
      RAISE EXCEPTION
        'FAIL: service_role lacks EXECUTE on % — grace-period-automation (daily 02:00 UTC) '
        'calls it with the service_role key and will fail', fn;
    END IF;
  END LOOP;
  RAISE NOTICE 'PASS: service_role retains EXECUTE on all 5 subscription RPCs';
END $$;

-- ============ Test 3: the grants are EXPLICIT, not inherited from PUBLIC ============
-- Test 2 would pass on the pre-DEBUG-440 state, where service_role's access came from the very
-- PUBLIC grant we are removing. Asserting an explicit `service_role=X` ACL entry is what makes
-- the fix durable: a future hardening pass that revokes PUBLIC again cannot silently take the
-- pipeline with it.
DO $$
DECLARE
  v_missing text;
BEGIN
  SELECT string_agg(proname, ', ' ORDER BY proname) INTO v_missing
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('expire_old_trials','expire_grace_periods','get_expiring_trials',
                      'get_expiring_grace_periods','log_subscription_event')
    AND (p.proacl IS NULL OR p.proacl::text NOT LIKE '%service_role=%');

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION
      'FAIL: no EXPLICIT service_role grant on: %. Access is inherited from PUBLIC and will '
      'vanish the next time PUBLIC is revoked.', v_missing;
  END IF;
  RAISE NOTICE 'PASS: all 5 carry an explicit service_role=X ACL entry';
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL DEBUG-440 SWEEP TESTS PASSED'; END $$;
