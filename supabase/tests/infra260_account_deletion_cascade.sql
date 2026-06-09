-- INFRA-260 PR3 — account-deletion erasure cascade. Proves that hard-deleting an
-- auth.users row (what the delete-account edge function does via
-- auth.admin.deleteUser) removes EVERY uid-keyed row, satisfying right-to-erasure.
--
-- Run: docker exec -i supabase_db_$(basename "$PWD") psql -U postgres -d postgres \
--        -v ON_ERROR_STOP=1 < supabase/tests/infra260_account_deletion_cascade.sql
-- Last validated: 2026-06-08 on the local stack.

\set ON_ERROR_STOP on
\set U '33333333-3333-3333-3333-333333333333'

-- Self-cleaning: order-independent + re-runnable.
DELETE FROM auth.users WHERE id = :'U';

-- Provision an anonymous principal (trigger creates public.users) + a full set of
-- uid-keyed rows across every cascading table.
INSERT INTO auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
VALUES (:'U', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now());

INSERT INTO encrypted_backups (user_id, encrypted_data, checksum, size_bytes)
VALUES (:'U', 'cipher', repeat('a',64), 10);
INSERT INTO analytics_events (user_id, event_type, properties, session_id)
VALUES (:'U', 'crisis_detected', '{"trigger_type":"x","severity_bucket":"high","assessment_type":"phq9","intervention_surfaced":true}', 'session_2026-06-08_abc');
INSERT INTO subscriptions (user_id, platform, original_transaction_id, status, tier, interval, crisis_access_enabled)
VALUES (:'U', 'apple', 'TXN-DEL', 'active', 'standard', 'monthly', true);
INSERT INTO subscription_events (user_id, event_type, metadata)
VALUES (:'U', 'subscription_started', '{}');

DO $$ BEGIN
  IF (SELECT count(*) FROM users WHERE id = '33333333-3333-3333-3333-333333333333') <> 1
     OR (SELECT count(*) FROM encrypted_backups WHERE user_id = '33333333-3333-3333-3333-333333333333') <> 1
     OR (SELECT count(*) FROM analytics_events WHERE user_id = '33333333-3333-3333-3333-333333333333') <> 1
     OR (SELECT count(*) FROM subscriptions WHERE user_id = '33333333-3333-3333-3333-333333333333') <> 1
     OR (SELECT count(*) FROM subscription_events WHERE user_id = '33333333-3333-3333-3333-333333333333') <> 1 THEN
    RAISE EXCEPTION 'FAIL: fixture rows were not all created';
  END IF;
  RAISE NOTICE 'PASS: fixture — 1 row in each of users + 4 child tables';
END $$;

-- The erasure: delete the auth principal (what auth.admin.deleteUser does).
DELETE FROM auth.users WHERE id = :'U';

DO $$ BEGIN
  IF (SELECT count(*) FROM users WHERE id = '33333333-3333-3333-3333-333333333333') <> 0
     OR (SELECT count(*) FROM encrypted_backups WHERE user_id = '33333333-3333-3333-3333-333333333333') <> 0
     OR (SELECT count(*) FROM analytics_events WHERE user_id = '33333333-3333-3333-3333-333333333333') <> 0
     OR (SELECT count(*) FROM subscriptions WHERE user_id = '33333333-3333-3333-3333-333333333333') <> 0
     OR (SELECT count(*) FROM subscription_events WHERE user_id = '33333333-3333-3333-3333-333333333333') <> 0 THEN
    RAISE EXCEPTION 'FAIL: erasure left residual uid-keyed rows — cascade incomplete';
  END IF;
  RAISE NOTICE 'PASS: deleting auth.users cascaded to ALL uid-keyed rows (users + 4 children)';
END $$;

SELECT 'ACCOUNT DELETION CASCADE TEST PASSED' AS result;
