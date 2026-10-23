-- DEBUG-841 — clients cannot write public.subscription_events; server writers still can.
--
-- Before 20261022000300, `authenticated` held INSERT (base_schema GRANT) and an own-row INSERT
-- policy, so any client could forge "audit" rows on its own uid, including a NULL or
-- far-future created_at that escapes a created_at-based prune (DEBUG-840).
--
-- A 42501 alone proves nothing here: an RLS refusal is ALSO insufficient_privilege. Every
-- denial below therefore checks SQLERRM names the TABLE GRANT, not a policy.
--
-- Self-provisioning (fixed-uid auth.users fixture), never SKIPs, and every write by a
-- client role is rolled back. ci.yml's `Supabase SQL suites` job runs it on every PR.
--
-- HOW TO RUN (local stack only; never against the shared project — it seeds auth.users):
--   supabase start && supabase db reset
--   docker exec -i supabase_db_$(basename "$PWD") psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/debug841_subscription_events_authenticated_readonly.sql
--   # exit 0 + "DEBUG-841 TESTS PASSED" = green.

\set ON_ERROR_STOP on
\set U '84100000-0000-0000-0000-000000000841'

DELETE FROM auth.users WHERE id = :'U';
INSERT INTO auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
VALUES (:'U', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now());

-- Seed as the owner: one own audit row for the SELECT check, one subscriptions row for the
-- service_role path that links an event to it.
INSERT INTO subscription_events (user_id, event_type, metadata)
VALUES (:'U', 'subscription_started', '{"debug841_seed": true}');
INSERT INTO subscriptions (user_id, platform, original_transaction_id, status, tier, interval, crisis_access_enabled)
VALUES (:'U', 'google', 'DEBUG841-TOKEN', 'active', 'standard', 'monthly', true);

-- ============ Test 1: authenticated cannot INSERT (grant refusal), can still SELECT its own rows
BEGIN;
  SELECT set_config('role', 'authenticated', true);
  SELECT set_config('request.jwt.claims', json_build_object('sub', :'U', 'role', 'authenticated')::text, true);

  DO $$
  BEGIN
    BEGIN
      INSERT INTO subscription_events (user_id, event_type, metadata)
      VALUES ('84100000-0000-0000-0000-000000000841', 'subscription_renewed', '{"forged": true}');
      RAISE EXCEPTION 'DEBUG-841 Test 1 FAIL: authenticated could INSERT its own subscription_events row (forged audit row)';
    EXCEPTION WHEN insufficient_privilege THEN
      IF SQLERRM NOT LIKE 'permission denied for table subscription_events%' THEN
        RAISE EXCEPTION 'DEBUG-841 Test 1 FAIL: INSERT was refused by RLS, not by the table grant: %', SQLERRM;
      END IF;
      RAISE NOTICE 'DEBUG-841 Test 1 PASS: authenticated INSERT refused by the table grant';
    END;

    -- The prune-escape shape: an explicit NULL created_at.
    BEGIN
      INSERT INTO subscription_events (user_id, event_type, metadata, created_at)
      VALUES ('84100000-0000-0000-0000-000000000841', 'subscription_renewed', '{}', NULL);
      RAISE EXCEPTION 'DEBUG-841 Test 1 FAIL: authenticated could INSERT a NULL-created_at row that no prune reaches';
    EXCEPTION WHEN insufficient_privilege THEN
      IF SQLERRM NOT LIKE 'permission denied for table subscription_events%' THEN
        RAISE EXCEPTION 'DEBUG-841 Test 1 FAIL: NULL-created_at INSERT refused by RLS, not the grant: %', SQLERRM;
      END IF;
      RAISE NOTICE 'DEBUG-841 Test 1 PASS: NULL-created_at INSERT refused by the table grant';
    END;

    IF (SELECT count(*) FROM subscription_events
         WHERE user_id = '84100000-0000-0000-0000-000000000841') <> 1 THEN
      RAISE EXCEPTION 'DEBUG-841 Test 1 FAIL: authenticated cannot SELECT its own subscription_events row';
    END IF;
    RAISE NOTICE 'DEBUG-841 Test 1 PASS: authenticated still SELECTs its own row';

    BEGIN
      PERFORM public.log_subscription_event(
        '84100000-0000-0000-0000-000000000841', NULL, 'subscription_renewed', '{}'::jsonb);
      RAISE EXCEPTION 'DEBUG-841 Test 1 FAIL: authenticated could EXECUTE log_subscription_event';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'DEBUG-841 Test 1 PASS: authenticated cannot EXECUTE log_subscription_event';
    END;
  END $$;
ROLLBACK;

-- ============ Test 2: anon cannot INSERT
BEGIN;
  SELECT set_config('role', 'anon', true);

  DO $$
  BEGIN
    BEGIN
      INSERT INTO subscription_events (user_id, event_type, metadata)
      VALUES ('84100000-0000-0000-0000-000000000841', 'subscription_renewed', '{}');
      RAISE EXCEPTION 'DEBUG-841 Test 2 FAIL: anon could INSERT a subscription_events row';
    EXCEPTION WHEN insufficient_privilege THEN
      IF SQLERRM NOT LIKE 'permission denied for table subscription_events%' THEN
        RAISE EXCEPTION 'DEBUG-841 Test 2 FAIL: anon INSERT refused by RLS, not by the grant: %', SQLERRM;
      END IF;
      RAISE NOTICE 'DEBUG-841 Test 2 PASS: anon INSERT refused by the table grant';
    END;
  END $$;
ROLLBACK;

-- ============ Test 3: the server writer still writes, with and without a subscriptions row id
BEGIN;
  SELECT set_config('role', 'service_role', true);

  DO $$
  DECLARE
    v_sub uuid;
    v_a   uuid;
    v_b   uuid;
  BEGIN
    SELECT id INTO v_sub FROM public.subscriptions WHERE original_transaction_id = 'DEBUG841-TOKEN';
    IF v_sub IS NULL THEN
      RAISE EXCEPTION 'DEBUG-841 Test 3 FAIL: service_role cannot read the seeded subscriptions row';
    END IF;

    v_a := public.log_subscription_event(
      '84100000-0000-0000-0000-000000000841', NULL, 'subscription_renewed', '{}'::jsonb);
    v_b := public.log_subscription_event(
      '84100000-0000-0000-0000-000000000841', v_sub, 'subscription_renewed', '{}'::jsonb);

    IF (SELECT count(*) FROM public.subscription_events WHERE id IN (v_a, v_b)) <> 2
       OR NOT EXISTS (SELECT 1 FROM public.subscription_events
                       WHERE id = v_b AND subscription_id = v_sub) THEN
      RAISE EXCEPTION 'DEBUG-841 Test 3 FAIL: log_subscription_event did not land both rows (got % / %)', v_a, v_b;
    END IF;
    RAISE NOTICE 'DEBUG-841 Test 3 PASS: service_role log_subscription_event writes, with and without subscription_id';
  END $$;
ROLLBACK;

-- ============ Test 4: catalog posture
DO $$
DECLARE
  r text;
  f text;
  v_table_owner oid;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF has_any_column_privilege(r, 'public.subscription_events', 'INSERT')
       OR has_any_column_privilege(r, 'public.subscription_events', 'UPDATE')
       OR has_table_privilege(r, 'public.subscription_events', 'DELETE')
       OR has_table_privilege(r, 'public.subscription_events', 'TRUNCATE') THEN
      RAISE EXCEPTION 'DEBUG-841 Test 4 FAIL: % holds INSERT, UPDATE, DELETE or TRUNCATE on subscription_events', r;
    END IF;
  END LOOP;

  IF NOT has_table_privilege('authenticated', 'public.subscription_events', 'SELECT') THEN
    RAISE EXCEPTION 'DEBUG-841 Test 4 FAIL: authenticated lost SELECT on subscription_events (the app reads its own rows)';
  END IF;

  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.subscription_events'::regclass) THEN
    RAISE EXCEPTION 'DEBUG-841 Test 4 FAIL: RLS is off on subscription_events';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policy
              WHERE polrelid = 'public.subscription_events'::regclass AND polcmd IN ('a', '*')) THEN
    RAISE EXCEPTION 'DEBUG-841 Test 4 FAIL: an INSERT or ALL policy exists on subscription_events';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policy
                  WHERE polrelid = 'public.subscription_events'::regclass
                    AND polname = 'subscription_events_select' AND polcmd = 'r') THEN
    RAISE EXCEPTION 'DEBUG-841 Test 4 FAIL: subscription_events_select is missing';
  END IF;

  -- The server writers must keep writing without a client grant: SECURITY DEFINER, owned by
  -- the table's owner.
  SELECT relowner INTO v_table_owner FROM pg_class WHERE oid = 'public.subscription_events'::regclass;
  FOREACH f IN ARRAY ARRAY[
    'public.log_subscription_event(uuid, uuid, text, jsonb)',
    'public.expire_old_trials()',
    'public.expire_grace_periods()',
    'public.transfer_subscription(text, text, uuid, uuid, jsonb, text)'
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_proc
                    WHERE oid = f::regprocedure AND prosecdef AND proowner = v_table_owner) THEN
      RAISE EXCEPTION 'DEBUG-841 Test 4 FAIL: % is not SECURITY DEFINER owned by the table owner', f;
    END IF;
  END LOOP;

  IF NOT has_function_privilege('service_role', 'public.log_subscription_event(uuid, uuid, text, jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'DEBUG-841 Test 4 FAIL: service_role cannot EXECUTE log_subscription_event';
  END IF;

  RAISE NOTICE 'DEBUG-841 Test 4 PASS: clients SELECT-only, no INSERT policy, RLS on, server writers intact';
END $$;

DELETE FROM auth.users WHERE id = :'U';
SELECT 'DEBUG-841 TESTS PASSED' AS result;
