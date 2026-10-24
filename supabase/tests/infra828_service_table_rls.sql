-- INFRA-828 — service-table RLS behaviour for webhook_replay_cache and grace_period_automation_runs.
--
-- Both tables are server-internal and doubly locked against client roles:
--   lock one: REVOKE ALL from anon/authenticated   (20260522000000:37, 20260616000000:84)
--   lock two: RLS enabled with zero policies       (20260522000000:37, 20260616000000:83)
-- maint441_service_role_grants.sql Test 7 (DEBUG-795) pins lock one at privilege level; this file
-- does not repeat it. Nothing pinned lock two. A migration that adds a permissive policy while the
-- grant stays revoked passes every behavioural check, and the next GRANT then exposes the table, so
-- the catalog test below pins RLS on and zero policies directly. The behavioural tests check what
-- each client role actually gets, against a seeded row, after a positive control proves it exists.
--
-- ci.yml's `Supabase SQL suites` job runs this on every PR against a freshly reset local stack
-- (INFRA-782). LOCAL ONLY otherwise:
--   supabase start && supabase db reset
--   psql ... -v ON_ERROR_STOP=1 -f supabase/tests/infra828_service_table_rls.sql
--
-- Do NOT run against the shared prod project (yliycxslzdsgjtpxggtf). The guard below refuses a
-- database that holds Vault secrets or an auth.users row older than a day. Every write sits
-- inside one transaction that ends in ROLLBACK.

\set ON_ERROR_STOP on

-- ============ Guard: a fresh local reset, or nothing runs
DO $$
DECLARE
  v_n integer;
BEGIN
  SELECT count(*) INTO v_n FROM vault.secrets;
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'INFRA-828 guard: vault.secrets holds % row(s); this is not a fresh local reset', v_n;
  END IF;
  SELECT count(*) INTO v_n FROM auth.users WHERE created_at < now() - interval '1 day';
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'INFRA-828 guard: % auth.users row(s) are older than a day; this is not a fresh local reset', v_n;
  END IF;
END $$;

BEGIN;

-- ============ Test 1: lock two in the catalog — RLS on, no policy for any role
DO $$
DECLARE
  v_table text;
  v_rls   boolean;
  v_n     integer;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['webhook_replay_cache', 'grace_period_automation_runs'] LOOP
    SELECT relrowsecurity INTO v_rls FROM pg_class WHERE oid = ('public.' || v_table)::regclass;
    IF NOT v_rls THEN RAISE EXCEPTION 'INFRA-828 RLS Test 1 FAIL: RLS is disabled on %', v_table; END IF;
    SELECT count(*) INTO v_n FROM pg_policies WHERE schemaname = 'public' AND tablename = v_table;
    IF v_n <> 0 THEN RAISE EXCEPTION 'INFRA-828 RLS Test 1 FAIL: % has % polic(ies); server-only tables have none', v_table, v_n; END IF;
  END LOOP;
  RAISE NOTICE 'INFRA-828 RLS Test 1 PASS: both tables have RLS enabled and zero policies.';
END $$;

-- ============ Seed, as postgres, and prove the rows exist (positive control)
-- Without this, a renamed or emptied table would make every zero-row reading below pass.
INSERT INTO public.webhook_replay_cache (source, notification_id) VALUES ('apple', 'i828-sentinel');
INSERT INTO public.grace_period_automation_runs (status, duration_ms) VALUES ('ok', -828);

DO $$
DECLARE
  v_n integer;
BEGIN
  SELECT count(*) INTO v_n FROM public.webhook_replay_cache WHERE notification_id = 'i828-sentinel';
  IF v_n <> 1 THEN RAISE EXCEPTION 'INFRA-828 RLS seed FAIL: % webhook_replay_cache sentinel rows (want 1)', v_n; END IF;
  SELECT count(*) INTO v_n FROM public.grace_period_automation_runs WHERE duration_ms = -828;
  IF v_n <> 1 THEN RAISE EXCEPTION 'INFRA-828 RLS seed FAIL: % grace_period_automation_runs sentinel rows (want 1)', v_n; END IF;
  RAISE NOTICE 'INFRA-828 RLS seed PASS: one sentinel row in each table, visible to postgres.';
END $$;

-- The probe, run under whatever role the caller set. SELECT is denied if it raises 42501 or sees
-- no sentinel row; INSERT, UPDATE and DELETE must raise 42501. Only insufficient_privilege counts
-- as denial: any other error (a renamed column, a missing table) propagates and fails the suite.
CREATE FUNCTION pg_temp.i828_probe(p_label text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_n       integer;
  v_denied  boolean;
BEGIN
  -- webhook_replay_cache
  BEGIN
    SELECT count(*) INTO v_n FROM public.webhook_replay_cache WHERE notification_id = 'i828-sentinel';
    IF v_n <> 0 THEN
      RAISE EXCEPTION 'INFRA-828 RLS FAIL (%): webhook_replay_cache SELECT returned % sentinel row(s)', p_label, v_n;
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  v_denied := false;
  BEGIN
    INSERT INTO public.webhook_replay_cache (source, notification_id) VALUES ('google', 'i828-client-write');
  EXCEPTION WHEN insufficient_privilege THEN v_denied := true;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'INFRA-828 RLS FAIL (%): webhook_replay_cache INSERT was not refused with 42501', p_label; END IF;

  v_denied := false;
  BEGIN
    UPDATE public.webhook_replay_cache SET processed_at = now() WHERE notification_id = 'i828-sentinel';
  EXCEPTION WHEN insufficient_privilege THEN v_denied := true;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'INFRA-828 RLS FAIL (%): webhook_replay_cache UPDATE was not refused with 42501', p_label; END IF;

  v_denied := false;
  BEGIN
    DELETE FROM public.webhook_replay_cache WHERE notification_id = 'i828-sentinel';
  EXCEPTION WHEN insufficient_privilege THEN v_denied := true;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'INFRA-828 RLS FAIL (%): webhook_replay_cache DELETE was not refused with 42501', p_label; END IF;

  -- grace_period_automation_runs
  BEGIN
    SELECT count(*) INTO v_n FROM public.grace_period_automation_runs WHERE duration_ms = -828;
    IF v_n <> 0 THEN
      RAISE EXCEPTION 'INFRA-828 RLS FAIL (%): grace_period_automation_runs SELECT returned % sentinel row(s)', p_label, v_n;
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  v_denied := false;
  BEGIN
    INSERT INTO public.grace_period_automation_runs (status, duration_ms) VALUES ('error', -8280);
  EXCEPTION WHEN insufficient_privilege THEN v_denied := true;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'INFRA-828 RLS FAIL (%): grace_period_automation_runs INSERT was not refused with 42501', p_label; END IF;

  v_denied := false;
  BEGIN
    UPDATE public.grace_period_automation_runs SET status = 'error' WHERE duration_ms = -828;
  EXCEPTION WHEN insufficient_privilege THEN v_denied := true;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'INFRA-828 RLS FAIL (%): grace_period_automation_runs UPDATE was not refused with 42501', p_label; END IF;

  v_denied := false;
  BEGIN
    DELETE FROM public.grace_period_automation_runs WHERE duration_ms = -828;
  EXCEPTION WHEN insufficient_privilege THEN v_denied := true;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'INFRA-828 RLS FAIL (%): grace_period_automation_runs DELETE was not refused with 42501', p_label; END IF;
END $$;

-- ============ Test 2: anon, with no claims
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '', true);
SELECT pg_temp.i828_probe('anon');
RESET ROLE;
DO $$ BEGIN RAISE NOTICE 'INFRA-828 RLS Test 2 PASS: anon reads no row and every write raises 42501 on both tables.'; END $$;

-- ============ Test 3: authenticated, carrying an identity
-- A claimless run leaves auth.uid() NULL, so a future policy like USING (auth.uid() IS NOT NULL)
-- would pass unseen. Run as a signed-in user.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '82882882-8828-4828-8828-828828828aaa', 'role', 'authenticated')::text, true);
SELECT pg_temp.i828_probe('authenticated');
RESET ROLE;
DO $$ BEGIN RAISE NOTICE 'INFRA-828 RLS Test 3 PASS: an authenticated user reads no row and every write raises 42501 on both tables.'; END $$;

-- ============ The seeded rows survived the probes
DO $$
DECLARE
  v_n integer;
BEGIN
  SELECT count(*) INTO v_n FROM public.webhook_replay_cache WHERE notification_id IN ('i828-sentinel', 'i828-client-write');
  IF v_n <> 1 THEN RAISE EXCEPTION 'INFRA-828 RLS FAIL: webhook_replay_cache holds % probe rows after the client probes (want 1)', v_n; END IF;
  SELECT count(*) INTO v_n FROM public.grace_period_automation_runs WHERE duration_ms IN (-828, -8280) AND status = 'ok';
  IF v_n <> 1 THEN RAISE EXCEPTION 'INFRA-828 RLS FAIL: grace_period_automation_runs holds % unchanged probe rows (want 1)', v_n; END IF;
END $$;

ROLLBACK;

\echo 'ALL INFRA-828 RLS TESTS PASSED'
