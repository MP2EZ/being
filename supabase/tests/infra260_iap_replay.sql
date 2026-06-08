-- INFRA-260 PR2 — IAP replay backstop (uniq_txn_per_platform) — DB-level proof.
--
-- Mirrors the edge-function path: verify-{apple,google}-receipt write with the
-- SERVICE-ROLE key (RLS-bypassing), so this runs as the table owner. The UNIQUE
-- index is the TOCTOU backstop behind the in-function ownership check.
--
-- Run: docker exec -i supabase_db_$(basename "$PWD") psql -U postgres -d postgres \
--        -v ON_ERROR_STOP=1 < supabase/tests/infra260_iap_replay.sql
-- Last validated: 2026-06-07 on the local stack.

\set ON_ERROR_STOP on
\set A '11111111-1111-1111-1111-111111111111'
\set B '22222222-2222-2222-2222-222222222222'

INSERT INTO auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
VALUES
  (:'A', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()),
  (:'B', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now());

-- A binds transaction TXN1.
INSERT INTO subscriptions (user_id, platform, original_transaction_id, status, tier, interval, crisis_access_enabled)
VALUES (:'A', 'apple', 'TXN1', 'active', 'standard', 'monthly', true);

-- Test 1: B CANNOT bind the same (platform, txn) — replay backstop fires.
DO $$ BEGIN
  BEGIN
    INSERT INTO subscriptions (user_id, platform, original_transaction_id, status, tier, interval, crisis_access_enabled)
    VALUES ('22222222-2222-2222-2222-222222222222', 'apple', 'TXN1', 'active', 'standard', 'monthly', true);
    RAISE EXCEPTION 'FAIL: B bound a transaction already owned by A (replay backstop missing)';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'PASS: uniq_txn_per_platform rejected B replaying A''s transaction';
  END;
END $$;

-- Test 2: same txn id on a DIFFERENT platform is allowed (namespaces are scoped).
INSERT INTO subscriptions (user_id, platform, original_transaction_id, status, tier, interval, crisis_access_enabled)
VALUES (:'B', 'google', 'TXN1', 'active', 'standard', 'monthly', true);
DO $$ BEGIN
  RAISE NOTICE 'PASS: same txn id under a different platform is permitted';
END $$;

SELECT 'ALL IAP REPLAY TESTS PASSED' AS result;
