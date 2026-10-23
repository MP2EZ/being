-- INFRA-848 — the orphaned-identity census: the transfer-tombstone class, census by default,
-- the not-yet-enabled delete mode, its cap, and a heartbeat that never carries a uid.
--
-- Tombstones are minted through the real transfer_subscription(), never hand-built, so a
-- change to the tombstone's shape fails here rather than silently emptying the class.
-- Delete mode is forced inside rolled-back blocks only: the migration ships census.
--
-- ci.yml's `Supabase SQL suites` job runs this on every PR against a freshly reset local
-- stack (INFRA-782). LOCAL ONLY otherwise:
--   supabase start && supabase db reset
--   psql ... -v ON_ERROR_STOP=1 -f supabase/tests/infra848_orphaned_identity_prune.sql
--
-- Do NOT run against the shared prod project. Every data test is one DO block rolled back by
-- a sentinel exception, and the fixed principals exist only inside those blocks. The helpers
-- are pg_temp functions and vanish with the session.

\set ON_ERROR_STOP on

-- An anonymous (or not) principal; handle_new_auth_user() provisions public.users.
CREATE FUNCTION pg_temp.i848_user(p_id uuid, p_anon boolean DEFAULT true) RETURNS void
LANGUAGE sql AS $$
  INSERT INTO auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
  VALUES (p_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          p_anon, now(), now())
$$;

-- Holder A pays on p_txn, then the subscription moves to caller B through the real RPC.
CREATE FUNCTION pg_temp.i848_transfer(p_a uuid, p_b uuid, p_txn text, p_a_anon boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_res jsonb;
BEGIN
  PERFORM pg_temp.i848_user(p_a, p_a_anon);
  PERFORM pg_temp.i848_user(p_b);
  INSERT INTO public.subscriptions (
    user_id, platform, original_transaction_id, platform_subscription_id, receipt_hash,
    environment, status, tier, interval, subscription_start_date, subscription_end_date,
    last_store_event_at, updated_at
  ) VALUES (
    p_a, 'apple', p_txn, p_txn, 'hash-a', 'Sandbox', 'active', 'standard', 'monthly',
    now() - interval '10 days', now() + interval '20 days', now() - interval '2 hours', now() - interval '1 day'
  );
  v_res := public.transfer_subscription('apple', p_txn, p_b, p_a,
    jsonb_build_object('status', 'active', 'interval', 'monthly', 'environment', 'Sandbox',
                       'platform_subscription_id', p_txn, 'receipt_hash', 'hash-b',
                       'subscription_end_date', (now() + interval '20 days')::text,
                       'last_store_event_at', (now() - interval '1 minute')::text),
    'proof-' || p_txn);
  IF v_res->>'outcome' <> 'transferred' THEN
    RAISE EXCEPTION 'INFRA-848 fixture: transfer of % gave %', p_txn, v_res;
  END IF;
END $$;

-- Age a principal: its auth timestamps and, when it has one, its subscriptions row, kept in
-- the shape the RPC wrote (created_at = updated_at = a UTC midnight). The timestamp trigger
-- would otherwise stamp now(); the caller's block rolls the DISABLE back.
-- p_tomb_days ages the subscriptions row separately (default: the same age).
CREATE FUNCTION pg_temp.i848_age(p_id uuid, p_days integer, p_tomb_days integer DEFAULT NULL) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE v_day timestamptz := date_trunc('day', now() - make_interval(days => coalesce(p_tomb_days, p_days)), 'UTC');
BEGIN
  UPDATE auth.users SET created_at = now() - make_interval(days => p_days),
                        last_sign_in_at = now() - make_interval(days => p_days)
   WHERE id = p_id;
  ALTER TABLE public.subscriptions DISABLE TRIGGER update_subscription_timestamp_trigger;
  UPDATE public.subscriptions SET created_at = v_day, updated_at = v_day WHERE user_id = p_id;
  ALTER TABLE public.subscriptions ENABLE TRIGGER update_subscription_timestamp_trigger;
END $$;

CREATE FUNCTION pg_temp.i848_heartbeats(p_job text) RETURNS SETOF public.retention_prune_runs
LANGUAGE sql AS $$
  SELECT * FROM public.retention_prune_runs WHERE job_name = p_job AND ran_at = now()
$$;

-- ============ Test 1: census (the shipped mode) deletes nothing and writes counts only
DO $$
DECLARE
  a constant uuid := '84884884-8488-4848-8848-84884884a001';
  b constant uuid := '84884884-8488-4848-8848-84884884b001';
  r   public.retention_prune_runs%ROWTYPE;
  v_n integer;
BEGIN
  IF (SELECT mode FROM public.orphaned_identity_prune_config WHERE id) <> 'census' THEN
    RAISE EXCEPTION 'INFRA-848 Test 1 FAIL: the migration did not leave mode = census';
  END IF;
  PERFORM pg_temp.i848_transfer(a, b, 'I848-T1');
  PERFORM pg_temp.i848_age(a, 40);

  PERFORM public.run_orphaned_identity_prune();

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = a) THEN
    RAISE EXCEPTION 'INFRA-848 Test 1 FAIL: census deleted the dormant identity';
  END IF;
  SELECT count(*) INTO v_n FROM pg_temp.i848_heartbeats('orphaned-identity-census');
  IF v_n <> 1 THEN RAISE EXCEPTION 'INFRA-848 Test 1 FAIL: % census heartbeats (want 1)', v_n; END IF;
  IF EXISTS (SELECT 1 FROM pg_temp.i848_heartbeats('orphaned-identity-prune')) THEN
    RAISE EXCEPTION 'INFRA-848 Test 1 FAIL: a census run wrote a delete-job heartbeat';
  END IF;
  SELECT * INTO r FROM pg_temp.i848_heartbeats('orphaned-identity-census');
  IF r.status <> 'ok' OR r.rows_deleted <> 0
     OR (substring(r.detail FROM '^candidates=(\d+) '))::integer < 1
     OR r.detail !~ 'subscriptions=\d+ subscription_events=\d+ analytics_events=\d+ proof_failures=\d+ sessions=\d+ refresh_tokens=\d+ identities=\d+$' THEN
    RAISE EXCEPTION 'INFRA-848 Test 1 FAIL: census heartbeat status % rows_deleted % detail %',
      r.status, r.rows_deleted, r.detail;
  END IF;

  RAISE NOTICE 'INFRA-848 Test 1 PASS: census counted the dormant tombstone, deleted nothing, one census heartbeat.';
  RAISE EXCEPTION 'I848_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'I848_ROLLBACK' THEN RAISE; END IF;
END $$;

-- ============ Test 2: mode off does nothing at all
DO $$
DECLARE
  a constant uuid := '84884884-8488-4848-8848-84884884a002';
  b constant uuid := '84884884-8488-4848-8848-84884884b002';
BEGIN
  PERFORM pg_temp.i848_transfer(a, b, 'I848-T2');
  PERFORM pg_temp.i848_age(a, 40);
  UPDATE public.orphaned_identity_prune_config SET mode = 'off' WHERE id;

  PERFORM public.run_orphaned_identity_prune();

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = a) THEN
    RAISE EXCEPTION 'INFRA-848 Test 2 FAIL: mode off deleted an identity';
  END IF;
  IF EXISTS (SELECT 1 FROM public.retention_prune_runs
              WHERE job_name LIKE 'orphaned-identity-%' AND ran_at = now()) THEN
    RAISE EXCEPTION 'INFRA-848 Test 2 FAIL: mode off wrote a heartbeat';
  END IF;

  RAISE NOTICE 'INFRA-848 Test 2 PASS: mode off writes nothing and deletes nothing.';
  RAISE EXCEPTION 'I848_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'I848_ROLLBACK' THEN RAISE; END IF;
END $$;

-- ============ Test 3: delete mode removes a dormant tombstone with zero residue
DO $$
DECLARE
  a constant uuid := '84884884-8488-4848-8848-84884884a003';
  b constant uuid := '84884884-8488-4848-8848-84884884b003';
  v_sess      uuid := gen_random_uuid();
  v_b_events  integer;
  v_b_row     uuid;
  r           public.retention_prune_runs%ROWTYPE;
BEGIN
  PERFORM pg_temp.i848_transfer(a, b, 'I848-T3');
  -- Every child table the cascade must reach, each with a row for A.
  INSERT INTO public.analytics_events (user_id, session_id, event_type)
  VALUES (a, 'session_2026-10-23_i848', 'i848_probe');
  -- A late event written after the transfer (the transfer itself deletes the old uid's history).
  INSERT INTO public.subscription_events (user_id, event_type) VALUES (a, 'subscription_expired');
  INSERT INTO public.subscription_transfer_proof_failures (user_id) VALUES (a);
  INSERT INTO auth.sessions (id, user_id, created_at, updated_at, refreshed_at)
  VALUES (v_sess, a, now() - interval '50 days', now() - interval '50 days',
          (now() - interval '50 days') AT TIME ZONE 'UTC');
  INSERT INTO auth.refresh_tokens (instance_id, token, user_id, revoked, created_at, updated_at, session_id)
  VALUES ('00000000-0000-0000-0000-000000000000', 'i848-token', a::text, false,
          now() - interval '50 days', now() - interval '50 days', v_sess);
  INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  VALUES (a::text, a, '{}'::jsonb, 'i848', now() - interval '50 days', now() - interval '50 days');
  PERFORM pg_temp.i848_age(a, 40);

  SELECT count(*) INTO v_b_events FROM public.subscription_events WHERE user_id = b;
  UPDATE public.orphaned_identity_prune_config SET mode = 'delete' WHERE id;

  PERFORM public.run_orphaned_identity_prune();

  IF EXISTS (SELECT 1 FROM auth.users WHERE id = a)
     OR EXISTS (SELECT 1 FROM public.users WHERE id = a)
     OR EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = a)
     OR EXISTS (SELECT 1 FROM public.subscription_events WHERE user_id = a)
     OR EXISTS (SELECT 1 FROM public.analytics_events WHERE user_id = a)
     OR EXISTS (SELECT 1 FROM public.subscription_transfer_proof_failures WHERE user_id = a)
     OR EXISTS (SELECT 1 FROM auth.sessions WHERE user_id = a)
     OR EXISTS (SELECT 1 FROM auth.refresh_tokens WHERE user_id = a::text)
     OR EXISTS (SELECT 1 FROM auth.identities WHERE user_id = a) THEN
    RAISE EXCEPTION 'INFRA-848 Test 3 FAIL: the dormant identity left residue';
  END IF;

  -- The transfer's new holder is untouched: a webhook on the transaction still resolves to it.
  SELECT user_id INTO v_b_row FROM public.subscriptions
   WHERE platform = 'apple' AND original_transaction_id = 'I848-T3';
  IF v_b_row IS DISTINCT FROM b THEN
    RAISE EXCEPTION 'INFRA-848 Test 3 FAIL: the transaction resolves to % (want the new uid)', v_b_row;
  END IF;
  IF (SELECT count(*) FROM public.subscription_events WHERE user_id = b) <> v_b_events THEN
    RAISE EXCEPTION 'INFRA-848 Test 3 FAIL: the new uid''s events changed';
  END IF;

  SELECT * INTO r FROM pg_temp.i848_heartbeats('orphaned-identity-prune');
  IF r.status IS DISTINCT FROM 'ok' OR r.rows_deleted < 1 THEN
    RAISE EXCEPTION 'INFRA-848 Test 3 FAIL: delete heartbeat status % rows_deleted %', r.status, r.rows_deleted;
  END IF;

  RAISE NOTICE 'INFRA-848 Test 3 PASS: delete mode removed the dormant tombstone and every child row; the new holder is intact.';
  RAISE EXCEPTION 'I848_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'I848_ROLLBACK' THEN RAISE; END IF;
END $$;

-- ============ Test 4: every leg keeps what it should, beside one identity that goes
DO $$
DECLARE
  -- Deleted: the positive control, so a run that deletes nothing cannot pass.
  d   constant uuid := '84884884-8488-4848-8848-84884884d004';
  -- Kept, one leg each.
  k_young   constant uuid := '84884884-8488-4848-8848-84884884e401';  -- tombstone 10 days old, auth 40
  k_session constant uuid := '84884884-8488-4848-8848-84884884e402';  -- session refreshed yesterday
  k_token   constant uuid := '84884884-8488-4848-8848-84884884e403';  -- refresh token used yesterday
  k_backup  constant uuid := '84884884-8488-4848-8848-84884884e404';  -- holds an encrypted backup
  k_named   constant uuid := '84884884-8488-4848-8848-84884884e405';  -- is_anonymous = false
  k_null    constant uuid := '84884884-8488-4848-8848-84884884e406';  -- no dated auth activity
  k_otx     constant uuid := '84884884-8488-4848-8848-84884884e407';  -- store-expired, otx kept
  k_live    constant uuid := '84884884-8488-4848-8848-84884884e408';  -- an aged active row
  k_nosub   constant uuid := '84884884-8488-4848-8848-84884884e409';  -- no subscriptions row
  v_sess    uuid := gen_random_uuid();
  v_tok_sess uuid := gen_random_uuid();
  kept      uuid[];
  callers   uuid[] := ARRAY[
    '84884884-8488-4848-8848-84884884f004', '84884884-8488-4848-8848-84884884f401',
    '84884884-8488-4848-8848-84884884f402', '84884884-8488-4848-8848-84884884f403',
    '84884884-8488-4848-8848-84884884f404', '84884884-8488-4848-8848-84884884f405',
    '84884884-8488-4848-8848-84884884f406']::uuid[];
  v_missing uuid;
BEGIN
  PERFORM pg_temp.i848_transfer(d,         callers[1], 'I848-T4-D');
  PERFORM pg_temp.i848_transfer(k_young,   callers[2], 'I848-T4-YOUNG');
  PERFORM pg_temp.i848_transfer(k_session, callers[3], 'I848-T4-SESSION');
  PERFORM pg_temp.i848_transfer(k_token,   callers[4], 'I848-T4-TOKEN');
  PERFORM pg_temp.i848_transfer(k_backup,  callers[5], 'I848-T4-BACKUP');
  PERFORM pg_temp.i848_transfer(k_named,   callers[6], 'I848-T4-NAMED', false);
  PERFORM pg_temp.i848_transfer(k_null,    callers[7], 'I848-T4-NULL');

  PERFORM pg_temp.i848_age(d, 40);
  -- Dormant for 40 days, but transferred only 10 days ago: the tombstone-age leg alone keeps it.
  PERFORM pg_temp.i848_age(k_young, 40, 10);
  PERFORM pg_temp.i848_age(k_session, 40);
  PERFORM pg_temp.i848_age(k_token, 40);
  PERFORM pg_temp.i848_age(k_backup, 40);
  PERFORM pg_temp.i848_age(k_named, 40);
  PERFORM pg_temp.i848_age(k_null, 40);
  UPDATE auth.users SET created_at = NULL, last_sign_in_at = NULL WHERE id = k_null;

  -- Recent activity that only the session and token legs can see: last_sign_in_at stays 40 days old.
  INSERT INTO auth.sessions (id, user_id, created_at, updated_at, refreshed_at)
  VALUES (v_sess, k_session, now() - interval '40 days', now() - interval '40 days',
          (now() - interval '1 day') AT TIME ZONE 'UTC');
  INSERT INTO auth.sessions (id, user_id, created_at, updated_at, refreshed_at)
  VALUES (v_tok_sess, k_token, now() - interval '40 days', now() - interval '40 days',
          (now() - interval '40 days') AT TIME ZONE 'UTC');
  INSERT INTO auth.refresh_tokens (instance_id, token, user_id, revoked, created_at, updated_at, session_id)
  VALUES ('00000000-0000-0000-0000-000000000000', 'i848-token-recent', k_token::text, false,
          now() - interval '1 day', now() - interval '1 day', v_tok_sess);

  INSERT INTO public.encrypted_backups (user_id, encrypted_data, checksum, size_bytes)
  VALUES (k_backup, 'ciphertext', repeat('a', 64), 10);

  -- Not tombstones at all: an expired row the store wrote, a live row, no row.
  PERFORM pg_temp.i848_user(k_otx);
  INSERT INTO public.subscriptions (user_id, platform, original_transaction_id, environment, status, tier, interval)
  VALUES (k_otx, 'apple', 'I848-T4-OTX', 'Sandbox', 'expired', 'standard', 'monthly');
  PERFORM pg_temp.i848_age(k_otx, 40);
  PERFORM pg_temp.i848_user(k_live);
  INSERT INTO public.subscriptions (user_id, platform, original_transaction_id, environment, status, tier, interval,
                                    subscription_start_date, subscription_end_date)
  VALUES (k_live, 'apple', 'I848-T4-LIVE', 'Sandbox', 'active', 'standard', 'monthly',
          now() - interval '60 days', now() + interval '5 days');
  PERFORM pg_temp.i848_age(k_live, 40);
  PERFORM pg_temp.i848_user(k_nosub);
  PERFORM pg_temp.i848_age(k_nosub, 40);

  UPDATE public.orphaned_identity_prune_config SET mode = 'delete' WHERE id;
  PERFORM public.run_orphaned_identity_prune();

  IF EXISTS (SELECT 1 FROM auth.users WHERE id = d) THEN
    RAISE EXCEPTION 'INFRA-848 Test 4 FAIL: the positive control survived, so the run deleted nothing';
  END IF;
  kept := ARRAY[k_young, k_session, k_token, k_backup, k_named, k_null, k_otx, k_live, k_nosub] || callers;
  SELECT k INTO v_missing FROM unnest(kept) k WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE id = k) LIMIT 1;
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'INFRA-848 Test 4 FAIL: % was deleted but one leg should keep it', v_missing;
  END IF;

  RAISE NOTICE 'INFRA-848 Test 4 PASS: young, session, token, backup, named, NULL-activity, store-expired, live, no-row and every new holder kept; the dormant tombstone deleted.';
  RAISE EXCEPTION 'I848_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'I848_ROLLBACK' THEN RAISE; END IF;
END $$;

-- ============ Test 5: over the cap, delete mode deletes nothing and records an error
DO $$
DECLARE
  r public.retention_prune_runs%ROWTYPE;
BEGIN
  PERFORM pg_temp.i848_transfer('84884884-8488-4848-8848-84884884a005', '84884884-8488-4848-8848-84884884b005', 'I848-T5-1');
  PERFORM pg_temp.i848_transfer('84884884-8488-4848-8848-84884884a015', '84884884-8488-4848-8848-84884884b015', 'I848-T5-2');
  PERFORM pg_temp.i848_age('84884884-8488-4848-8848-84884884a005', 40);
  PERFORM pg_temp.i848_age('84884884-8488-4848-8848-84884884a015', 40);
  UPDATE public.orphaned_identity_prune_config SET mode = 'delete', max_per_run = 1 WHERE id;

  PERFORM public.run_orphaned_identity_prune();

  IF (SELECT count(*) FROM auth.users WHERE id IN ('84884884-8488-4848-8848-84884884a005',
                                                    '84884884-8488-4848-8848-84884884a015')) <> 2 THEN
    RAISE EXCEPTION 'INFRA-848 Test 5 FAIL: a capped run deleted identities';
  END IF;
  SELECT * INTO r FROM pg_temp.i848_heartbeats('orphaned-identity-prune');
  IF r.status IS DISTINCT FROM 'error' OR r.rows_deleted <> 0 OR r.detail NOT LIKE 'cap exceeded:%' THEN
    RAISE EXCEPTION 'INFRA-848 Test 5 FAIL: capped heartbeat status % rows_deleted % detail %',
      r.status, r.rows_deleted, r.detail;
  END IF;

  RAISE NOTICE 'INFRA-848 Test 5 PASS: over max_per_run, nothing deleted and one error row.';
  RAISE EXCEPTION 'I848_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'I848_ROLLBACK' THEN RAISE; END IF;
END $$;

-- ============ Test 6: a failing run records SQLSTATE and a fixed reason, never the uid
DO $$
DECLARE
  a constant uuid := '84884884-8488-4848-8848-84884884a006';
  r   public.retention_prune_runs%ROWTYPE;
BEGIN
  PERFORM pg_temp.i848_transfer(a, '84884884-8488-4848-8848-84884884b006', 'I848-T6');
  PERFORM pg_temp.i848_age(a, 40);
  -- The forced error quotes the uid, as an FK or lock message would.
  CREATE FUNCTION public.i848_refuse_delete() RETURNS trigger LANGUAGE plpgsql AS $f$
  BEGIN RAISE EXCEPTION 'i848 forced failure on %', OLD.id; END $f$;
  CREATE TRIGGER i848_refuse_delete BEFORE DELETE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.i848_refuse_delete();
  UPDATE public.orphaned_identity_prune_config SET mode = 'delete' WHERE id;

  PERFORM public.run_orphaned_identity_prune();

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = a) THEN
    RAISE EXCEPTION 'INFRA-848 Test 6 FAIL: the failed run still deleted the identity';
  END IF;
  SELECT * INTO r FROM pg_temp.i848_heartbeats('orphaned-identity-prune');
  IF r.status IS DISTINCT FROM 'error' OR r.sqlstate <> 'P0001' OR r.detail <> 'orphaned-identity run failed' THEN
    RAISE EXCEPTION 'INFRA-848 Test 6 FAIL: error heartbeat status % sqlstate % detail %', r.status, r.sqlstate, r.detail;
  END IF;

  RAISE NOTICE 'INFRA-848 Test 6 PASS: a failed run deletes nothing and records SQLSTATE with a fixed reason.';
  RAISE EXCEPTION 'I848_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'I848_ROLLBACK' THEN RAISE; END IF;
END $$;

-- ============ Test 7: no heartbeat, in any mode or outcome, carries a uuid
DO $$
DECLARE
  v_n integer;
BEGIN
  PERFORM pg_temp.i848_transfer('84884884-8488-4848-8848-84884884a007', '84884884-8488-4848-8848-84884884b007', 'I848-T7-1');
  PERFORM pg_temp.i848_transfer('84884884-8488-4848-8848-84884884a017', '84884884-8488-4848-8848-84884884b017', 'I848-T7-2');
  PERFORM pg_temp.i848_age('84884884-8488-4848-8848-84884884a007', 40);
  PERFORM pg_temp.i848_age('84884884-8488-4848-8848-84884884a017', 40);

  PERFORM public.run_orphaned_identity_prune();                                -- census
  UPDATE public.orphaned_identity_prune_config SET mode = 'delete', max_per_run = 1 WHERE id;
  PERFORM public.run_orphaned_identity_prune();                                -- capped
  UPDATE public.orphaned_identity_prune_config SET max_per_run = 25 WHERE id;
  PERFORM public.run_orphaned_identity_prune();                                -- delete

  SELECT count(*) INTO v_n FROM public.retention_prune_runs
   WHERE job_name LIKE 'orphaned-identity-%' AND ran_at = now();
  IF v_n <> 3 THEN RAISE EXCEPTION 'INFRA-848 Test 7 FAIL: % heartbeats for three runs', v_n; END IF;
  IF EXISTS (SELECT 1 FROM public.retention_prune_runs h
              WHERE h.job_name LIKE 'orphaned-identity-%' AND h.ran_at = now()
                AND row_to_json(h)::text ~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}') THEN
    RAISE EXCEPTION 'INFRA-848 Test 7 FAIL: a heartbeat row carries a uuid';
  END IF;

  RAISE NOTICE 'INFRA-848 Test 7 PASS: census, capped and delete heartbeats carry no uuid.';
  RAISE EXCEPTION 'I848_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'I848_ROLLBACK' THEN RAISE; END IF;
END $$;

-- ============ Test 8: posture, grants, config bounds, the job, and the handler (read-only)
DO $$
DECLARE
  run  constant regprocedure := 'public.run_orphaned_identity_prune()'::regprocedure;
  cand constant regprocedure := 'public.orphaned_identity_candidates(timestamptz)'::regprocedure;
  fn   regprocedure;
  r    text;
  verb text;
  src  text;
  handler text;
  v_state text;
BEGIN
  IF NOT (SELECT prosecdef FROM pg_proc WHERE oid = run) THEN
    RAISE EXCEPTION 'INFRA-848 Test 8 FAIL: the prune is not SECURITY DEFINER';
  END IF;
  FOREACH fn IN ARRAY ARRAY[run, cand] LOOP
    IF NOT ('search_path=public, pg_temp' = ANY (coalesce((SELECT proconfig FROM pg_proc WHERE oid = fn), '{}'))) THEN
      RAISE EXCEPTION 'INFRA-848 Test 8 FAIL: % has no pinned search_path', fn;
    END IF;
    FOREACH r IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
      IF has_function_privilege(r, fn, 'EXECUTE') THEN
        RAISE EXCEPTION 'INFRA-848 Test 8 FAIL: % can EXECUTE %', r, fn;
      END IF;
    END LOOP;
  END LOOP;

  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM public.run_orphaned_identity_prune();
    v_state := 'none';
  EXCEPTION WHEN OTHERS THEN
    v_state := SQLSTATE;
  END;
  RESET ROLE;
  IF v_state <> '42501' THEN
    RAISE EXCEPTION 'INFRA-848 Test 8 FAIL: authenticated calling the prune gave SQLSTATE % (want 42501)', v_state;
  END IF;

  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.orphaned_identity_prune_config'::regclass)
     OR EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orphaned_identity_prune_config') THEN
    RAISE EXCEPTION 'INFRA-848 Test 8 FAIL: the config table is not RLS-on with no policies';
  END IF;
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    FOREACH verb IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] LOOP
      IF has_table_privilege(r, 'public.orphaned_identity_prune_config', verb) THEN
        RAISE EXCEPTION 'INFRA-848 Test 8 FAIL: % holds % on the config table', r, verb;
      END IF;
    END LOOP;
  END LOOP;
  FOREACH verb IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
    IF has_table_privilege('service_role', 'public.orphaned_identity_prune_config', verb) THEN
      RAISE EXCEPTION 'INFRA-848 Test 8 FAIL: service_role holds % on the config table', verb;
    END IF;
  END LOOP;

  -- The inactivity floor holds whatever an operator writes.
  BEGIN
    UPDATE public.orphaned_identity_prune_config SET inactivity_days = 29 WHERE id;
    v_state := 'none';
  EXCEPTION WHEN check_violation THEN
    v_state := '23514';
  END;
  IF v_state <> '23514' THEN
    RAISE EXCEPTION 'INFRA-848 Test 8 FAIL: inactivity_days = 29 was accepted';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job
                  WHERE jobname = 'orphaned-identity-prune' AND schedule = '35 4 * * *'
                    AND command ILIKE '%run_orphaned_identity_prune()%') THEN
    RAISE EXCEPTION 'INFRA-848 Test 8 FAIL: orphaned-identity-prune is not scheduled at 35 4 * * *';
  END IF;

  -- Comments stripped: the handler's own warnings name what they forbid.
  src := regexp_replace(pg_get_functiondef(run), '--[^\n]*', '', 'g');
  IF position('EXCEPTION WHEN OTHERS' IN src) = 0 THEN
    RAISE EXCEPTION 'INFRA-848 Test 8 FAIL: the prune has no EXCEPTION WHEN OTHERS handler';
  END IF;
  handler := substring(src FROM position('EXCEPTION WHEN OTHERS' IN src));
  IF handler ~* '\mRAISE\M' THEN
    RAISE EXCEPTION 'INFRA-848 Test 8 FAIL: the prune''s exception handler re-raises';
  END IF;
  IF handler ~* '\mSQLERRM\M' THEN
    RAISE EXCEPTION 'INFRA-848 Test 8 FAIL: the prune''s exception handler records SQLERRM';
  END IF;

  RAISE NOTICE 'INFRA-848 Test 8 PASS: definer with pinned paths, every client and service_role locked out, config floor holds, job at 04:35, handler neither re-raises nor records SQLERRM.';
END $$;

-- The repo-wide sweeps enumerate pg_proc themselves; they must still pass with the new functions.
\ir debug440_rpc_execute_sweep.sql
\ir debug455_search_path_pin_sweep.sql

SELECT 'ALL INFRA-848 ORPHANED-IDENTITY TESTS PASSED' AS result;
