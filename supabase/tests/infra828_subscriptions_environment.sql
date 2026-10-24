-- INFRA-828 — the two subscriptions.environment CHECKs (20260821000000, DEBUG-474):
--   subscriptions_environment_valid          environment IS NULL OR IN ('Production','Sandbox')
--   subscriptions_apple_environment_present  platform <> 'apple' OR environment IS NOT NULL
--
-- Without them an apple row the grace-period cron can never re-verify pages the watchdog every
-- night. Each rejection is matched by CONSTRAINT_NAME, so the other CHECK cannot satisfy a test
-- meant for this one, and convalidated catches a NOT VALID re-add that would skip existing rows.
--
-- ci.yml's `Supabase SQL suites` job runs this on every PR against a freshly reset local stack
-- (INFRA-782). LOCAL ONLY otherwise:
--   supabase start && supabase db reset
--   psql ... -v ON_ERROR_STOP=1 -f supabase/tests/infra828_subscriptions_environment.sql
--
-- Do NOT run against the shared prod project (yliycxslzdsgjtpxggtf). The guard below refuses a
-- database that holds Vault secrets or an auth.users row older than a day. Every write sits
-- inside one transaction that ends in ROLLBACK; the probe principals never persist.

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

-- One anonymous principal per subscriptions row (one_subscription_per_user). The
-- on_auth_user_created trigger provisions public.users.
INSERT INTO auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
SELECT ('82882882-8828-4828-8828-8288288280' || lpad(n::text, 2, '0'))::uuid,
       '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()
  FROM generate_series(1, 12) AS n;

-- Insert one row for principal n; returns the CHECK it violated, or NULL if it was accepted.
CREATE FUNCTION pg_temp.i828_insert(n integer, p_platform text, p_env text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  v_constraint text;
BEGIN
  INSERT INTO public.subscriptions
    (user_id, platform, original_transaction_id, status, tier, interval, crisis_access_enabled, environment)
  VALUES (('82882882-8828-4828-8828-8288288280' || lpad(n::text, 2, '0'))::uuid,
          p_platform, 'i828-probe-' || n, 'active', 'standard', 'monthly', true, p_env);
  RETURN NULL;
EXCEPTION WHEN check_violation THEN
  GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
  RETURN v_constraint;
END $$;

-- ============ Test 1: both CHECKs exist on subscriptions and are validated
DO $$
DECLARE
  v_name text;
  v_ok   boolean;
BEGIN
  FOREACH v_name IN ARRAY ARRAY['subscriptions_environment_valid', 'subscriptions_apple_environment_present'] LOOP
    SELECT convalidated INTO v_ok FROM pg_constraint
     WHERE conrelid = 'public.subscriptions'::regclass AND conname = v_name AND contype = 'c';
    IF NOT FOUND THEN RAISE EXCEPTION 'INFRA-828 environment Test 1 FAIL: CHECK % is missing', v_name; END IF;
    IF NOT v_ok THEN RAISE EXCEPTION 'INFRA-828 environment Test 1 FAIL: CHECK % is NOT VALID', v_name; END IF;
  END LOOP;
  RAISE NOTICE 'INFRA-828 environment Test 1 PASS: both CHECKs exist and are validated.';
END $$;

-- ============ Test 2: non-apple rows may leave environment NULL
SAVEPOINT t2;
DO $$
DECLARE
  v_res text;
BEGIN
  v_res := pg_temp.i828_insert(1, 'google', NULL);
  IF v_res IS NOT NULL THEN RAISE EXCEPTION 'INFRA-828 environment Test 2 FAIL: google with NULL environment rejected by %', v_res; END IF;
  v_res := pg_temp.i828_insert(2, 'none', NULL);
  IF v_res IS NOT NULL THEN RAISE EXCEPTION 'INFRA-828 environment Test 2 FAIL: none with NULL environment rejected by %', v_res; END IF;
  RAISE NOTICE 'INFRA-828 environment Test 2 PASS: google and none accept NULL environment.';
END $$;
ROLLBACK TO SAVEPOINT t2;

-- ============ Test 3: apple accepts both real environments (positive control for Test 4)
SAVEPOINT t3;
DO $$
DECLARE
  v_res text;
BEGIN
  v_res := pg_temp.i828_insert(3, 'apple', 'Sandbox');
  IF v_res IS NOT NULL THEN RAISE EXCEPTION 'INFRA-828 environment Test 3 FAIL: apple Sandbox rejected by %', v_res; END IF;
  v_res := pg_temp.i828_insert(4, 'apple', 'Production');
  IF v_res IS NOT NULL THEN RAISE EXCEPTION 'INFRA-828 environment Test 3 FAIL: apple Production rejected by %', v_res; END IF;
  RAISE NOTICE 'INFRA-828 environment Test 3 PASS: apple accepts Sandbox and Production.';
END $$;
ROLLBACK TO SAVEPOINT t3;

-- ============ Test 4: apple without environment is rejected, on INSERT and on UPDATE
SAVEPOINT t4;
DO $$
DECLARE
  v_res        text;
  v_constraint text;
  v_refused    boolean := false;
BEGIN
  v_res := pg_temp.i828_insert(5, 'apple', NULL);
  IF v_res IS DISTINCT FROM 'subscriptions_apple_environment_present' THEN
    RAISE EXCEPTION 'INFRA-828 environment Test 4 FAIL: apple with NULL environment gave % (want subscriptions_apple_environment_present)',
      COALESCE(v_res, 'acceptance');
  END IF;

  -- An accepted row cannot be emptied later either.
  v_res := pg_temp.i828_insert(6, 'apple', 'Sandbox');
  IF v_res IS NOT NULL THEN RAISE EXCEPTION 'INFRA-828 environment Test 4 FAIL: setup row rejected by %', v_res; END IF;
  BEGIN
    UPDATE public.subscriptions SET environment = NULL WHERE original_transaction_id = 'i828-probe-6';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
    v_refused := true;
  END;
  IF NOT v_refused OR v_constraint <> 'subscriptions_apple_environment_present' THEN
    RAISE EXCEPTION 'INFRA-828 environment Test 4 FAIL: clearing an apple row''s environment gave % (want subscriptions_apple_environment_present)',
      COALESCE(v_constraint, 'acceptance');
  END IF;

  RAISE NOTICE 'INFRA-828 environment Test 4 PASS: apple without environment is refused on INSERT and UPDATE.';
END $$;
ROLLBACK TO SAVEPOINT t4;

-- ============ Test 5: values outside Production/Sandbox are rejected on every platform
SAVEPOINT t5;
DO $$
DECLARE
  v_case record;
  v_res  text;
BEGIN
  FOR v_case IN
    SELECT * FROM (VALUES
      (7,  'apple',  'production'),
      (8,  'apple',  'Xcode'),
      (9,  'google', 'Production '),
      (10, 'google', 'Sandbox2')
    ) AS c(n, platform, env)
  LOOP
    v_res := pg_temp.i828_insert(v_case.n, v_case.platform, v_case.env);
    IF v_res IS DISTINCT FROM 'subscriptions_environment_valid' THEN
      RAISE EXCEPTION 'INFRA-828 environment Test 5 FAIL: % with environment % gave % (want subscriptions_environment_valid)',
        v_case.platform, quote_literal(v_case.env), COALESCE(v_res, 'acceptance');
    END IF;
  END LOOP;
  RAISE NOTICE 'INFRA-828 environment Test 5 PASS: out-of-domain values are refused by subscriptions_environment_valid.';
END $$;
ROLLBACK TO SAVEPOINT t5;

ROLLBACK;

\echo 'ALL INFRA-828 environment TESTS PASSED'
