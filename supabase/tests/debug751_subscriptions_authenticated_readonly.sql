-- DEBUG-751 — `authenticated` is SELECT-only on public.subscriptions (migration
-- 20261008000000). Entitlement (`status`) and the webhook's ordering watermark
-- (`last_store_event_at`) are written by service_role code only.
--
-- HOW TO RUN (local stack only; never against the shared project):
--   supabase start && supabase db reset
--   docker exec -i supabase_db_$(basename "$PWD") psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/debug751_subscriptions_authenticated_readonly.sql
--   # exit 0 + "DEBUG-751 TESTS PASSED" = green.

\set ON_ERROR_STOP on
\set A '33333333-3333-3333-3333-333333333333'

DELETE FROM auth.users WHERE id = :'A';
INSERT INTO auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
VALUES (:'A', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now());

-- Seed one row as the owner role, then try to write it as the user it belongs to.
INSERT INTO subscriptions (user_id, platform, original_transaction_id, status, tier, interval, crisis_access_enabled)
VALUES (:'A', 'google', 'DEBUG751-TOKEN', 'expired', 'standard', 'monthly', true);

BEGIN;
  SELECT set_config('role', 'authenticated', true);
  SELECT set_config('request.jwt.claims', json_build_object('sub', :'A', 'role', 'authenticated')::text, true);

  DO $$
  BEGIN
    BEGIN
      UPDATE subscriptions SET status = 'active' WHERE original_transaction_id = 'DEBUG751-TOKEN';
      RAISE EXCEPTION 'FAIL: authenticated could UPDATE its own subscriptions row (self-granted entitlement)';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS: authenticated UPDATE on subscriptions denied';
    END;

    BEGIN
      UPDATE subscriptions SET last_store_event_at = now() + interval '10 years'
       WHERE original_transaction_id = 'DEBUG751-TOKEN';
      RAISE EXCEPTION 'FAIL: authenticated could write last_store_event_at';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS: authenticated cannot write the ordering watermark';
    END;

    BEGIN
      INSERT INTO subscriptions (user_id, platform, original_transaction_id, status, tier, interval, crisis_access_enabled)
      VALUES ('33333333-3333-3333-3333-333333333333', 'google', 'DEBUG751-OTHER', 'active', 'standard', 'monthly', true);
      RAISE EXCEPTION 'FAIL: authenticated could INSERT a subscriptions row';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS: authenticated INSERT on subscriptions denied';
    END;

    IF (SELECT count(*) FROM subscriptions WHERE original_transaction_id = 'DEBUG751-TOKEN') <> 1 THEN
      RAISE EXCEPTION 'FAIL: authenticated cannot SELECT its own subscriptions row (the app reads it)';
    END IF;
    RAISE NOTICE 'PASS: authenticated can still SELECT its own subscriptions row';
  END $$;
ROLLBACK;

DELETE FROM auth.users WHERE id = :'A';
SELECT 'DEBUG-751 TESTS PASSED' AS result;
