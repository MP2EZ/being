-- INFRA-260 RLS negative-test suite — runtime proof that auth.uid() isolation is
-- actually enforced (the evidence docs/security/supabase-rls-verification.md needs).
--
-- HOW TO RUN (local stack; no remote/paid resources):
--   supabase start && supabase db reset            # applies all migrations
--   docker exec -i supabase_db_$(basename "$PWD") psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/infra260_rls_negative.sql
--   # exit 0 + "ALL RLS NEGATIVE TESTS PASSED" = green; any RAISE = a real RLS hole.
--
-- Fidelity: sets `request.jwt.claims` (what Supabase's auth.uid() actually reads
-- at runtime) + role=authenticated — NOT the old SET LOCAL app.device_id that the
-- stale supabase-rls-verification.md used. Each assertion RAISEs on failure.
--
-- Last validated: 2026-06-07 on the local stack — 6/6 PASS.

\set ON_ERROR_STOP on

-- Two distinct anonymous principals. Insert into auth.users so the
-- on_auth_user_created trigger provisions the matching public.users rows
-- (also proves that trigger fires).
\set A '11111111-1111-1111-1111-111111111111'
\set B '22222222-2222-2222-2222-222222222222'

INSERT INTO auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
VALUES
  (:'A', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()),
  (:'B', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now());

-- TRIGGER PROOF: public.users rows auto-provisioned for both auth users.
DO $$
BEGIN
  IF (SELECT count(*) FROM public.users WHERE id IN
        ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222')) <> 2 THEN
    RAISE EXCEPTION 'FAIL: on_auth_user_created did not provision both public.users rows';
  END IF;
  RAISE NOTICE 'PASS: on_auth_user_created provisioned public.users for both principals';
END $$;

-- Helper: act as a given authenticated principal.
CREATE OR REPLACE FUNCTION _be_act_as(uid text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role','authenticated')::text, true);
END $$;

-- ============ Test 1: A can insert its OWN backup (WITH CHECK passes) ============
BEGIN;
  SELECT _be_act_as(:'A');
  INSERT INTO encrypted_backups (user_id, encrypted_data, checksum, size_bytes)
  VALUES (:'A', 'cipherA', repeat('a',64), 10);
  DO $$ BEGIN
    IF (SELECT count(*) FROM encrypted_backups) <> 1 THEN
      RAISE EXCEPTION 'FAIL: A could not read back its own backup';
    END IF;
    RAISE NOTICE 'PASS: A inserted + reads its own backup';
  END $$;
COMMIT;

-- ============ Test 2: A CANNOT insert a row owned by B (WITH CHECK rejects) =======
BEGIN;
  SELECT _be_act_as(:'A');
  DO $$ BEGIN
    BEGIN
      INSERT INTO encrypted_backups (user_id, encrypted_data, checksum, size_bytes)
      VALUES ('22222222-2222-2222-2222-222222222222', 'forged', repeat('b',64), 10);
      RAISE EXCEPTION 'FAIL: WITH CHECK allowed A to insert a row owned by B (forged user_id)';
    EXCEPTION WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE 'PASS: WITH CHECK rejected A inserting a forged user_id (B)';
    END;
  END $$;
ROLLBACK;

-- ============ Test 3: B CANNOT read A's backup (cross-user isolation) ============
BEGIN;
  SELECT _be_act_as(:'B');
  DO $$ BEGIN
    IF (SELECT count(*) FROM encrypted_backups) <> 0 THEN
      RAISE EXCEPTION 'FAIL: B can see A''s backup rows — cross-user isolation broken';
    END IF;
    RAISE NOTICE 'PASS: B sees 0 rows of A''s backups';
  END $$;
COMMIT;

-- ============ Test 4: unauthenticated (anon, no JWT sub) sees nothing ===========
BEGIN;
  SELECT set_config('role', 'anon', true);
  SELECT set_config('request.jwt.claims', NULL, true);
  DO $$ BEGIN
    BEGIN
      IF (SELECT count(*) FROM encrypted_backups) <> 0 THEN
        RAISE EXCEPTION 'FAIL: anon role can read backups';
      END IF;
      RAISE NOTICE 'PASS: anon (no session) sees 0 backup rows (fail-closed)';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS: anon role denied table access entirely (grants revoked)';
    END;
  END $$;
ROLLBACK;

-- ============ Test 5: analytics_events client DELETE is withheld ================
BEGIN;
  SELECT _be_act_as(:'A');
  INSERT INTO analytics_events (user_id, event_type, properties, session_id)
  VALUES (:'A', 'crisis_detected', '{"trigger_type":"x","severity_bucket":"high","assessment_type":"phq9","intervention_surfaced":true}',
          'session_2026-06-07_abc');
  DO $$
  DECLARE deleted int;
  BEGIN
    BEGIN
      DELETE FROM analytics_events WHERE user_id = '11111111-1111-1111-1111-111111111111';
      GET DIAGNOSTICS deleted = ROW_COUNT;
      IF deleted > 0 THEN
        RAISE EXCEPTION 'FAIL: client could DELETE analytics_events (crisis-audit integrity broken)';
      END IF;
      RAISE NOTICE 'PASS: client DELETE on analytics_events affected 0 rows (no DELETE policy)';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS: client DELETE on analytics_events denied outright';
    END;
  END $$;
ROLLBACK;

DROP FUNCTION _be_act_as(text);
SELECT 'ALL RLS NEGATIVE TESTS PASSED' AS result;
