-- FEAT-833 — transfer_subscription(), the transfer ledger, the failed-proof counter, the
-- tombstone's coarsened updated_at, and the hourly prune.
--
-- The Deno half (supabase/functions/_tests/subscription-transfer-status.test.ts) pins the
-- status set and the tombstone column list against the migration text; this file pins the
-- behaviour. ci.yml's `Supabase SQL suites` job runs it on every PR against a freshly reset
-- local stack (INFRA-782; non-strict until INFRA-829).
--
-- HOW TO RUN (local stack, after the migration):
--   supabase start && supabase db reset
--   docker exec -i supabase_db_$(basename "$PWD") psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/feat833_subscription_transfer.sql
-- (\ir below resolves relative to this file, so run it with -f from the repo root instead of
-- stdin if your psql cannot see the tests directory:
--   psql ... -v ON_ERROR_STOP=1 -f supabase/tests/feat833_subscription_transfer.sql)
--
-- SAFE AGAINST SHARED PROD: every data test is one DO block rolled back by a sentinel
-- exception, and the fixed principals below exist only inside those blocks. The helper is a
-- pg_temp function and vanishes with the session.
--
-- Last validated: not yet run (written 2026-10-22; no local Docker in the authoring session).

\set ON_ERROR_STOP on

-- Fixture: three principals and A's live apple subscription on 'F833-TXN'. Returns A's row id.
CREATE FUNCTION pg_temp.f833_setup() RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_row uuid;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
  SELECT u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()
    FROM unnest(ARRAY[
      '83383383-3833-4833-8833-83383383a001'::uuid,  -- A, the holder
      '83383383-3833-4833-8833-83383383b002'::uuid,  -- B, the caller
      '83383383-3833-4833-8833-83383383c003'::uuid   -- C, a third uid
    ]) u;
  INSERT INTO public.subscriptions (
    user_id, platform, original_transaction_id, platform_subscription_id, platform_customer_id,
    receipt_hash, receipt_data_encrypted, environment, status, tier, interval,
    subscription_start_date, subscription_end_date, last_payment_date, last_receipt_verified,
    last_store_event_at, updated_at
  ) VALUES (
    '83383383-3833-4833-8833-83383383a001', 'apple', 'F833-TXN', 'F833-TXN', 'cust',
    'hash-a', 'enc-a', 'Sandbox', 'active', 'standard', 'monthly',
    now() - interval '10 days', now() + interval '20 days', now() - interval '10 days', now() - interval '1 day',
    now() - interval '2 hours', now() - interval '1 day'
  ) RETURNING id INTO v_row;
  RETURN v_row;
END $$;

-- The verified fields FEAT-714's handler would pass for B.
CREATE FUNCTION pg_temp.f833_fields() RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object(
    'status', 'active', 'interval', 'monthly', 'environment', 'Sandbox',
    'platform_subscription_id', 'F833-TXN', 'receipt_hash', 'hash-b', 'receipt_data_encrypted', 'enc-b',
    'subscription_start_date', '2026-10-01T00:00:00Z', 'subscription_end_date', '2026-11-01T00:00:00Z',
    'last_receipt_verified', '2026-10-21T12:00:00Z', 'last_store_event_at', '2026-10-21T11:59:30Z'
  )
$$;

CREATE FUNCTION pg_temp.f833_key() RETURNS text LANGUAGE sql AS $$
  SELECT encode(sha256(convert_to('apple' || E'\x1f' || 'F833-TXN', 'UTF8')), 'hex')
$$;

-- ============ Test 1: a transfer — tombstone, caller row, ledger, audit, all in one call
DO $$
DECLARE
  a constant uuid := '83383383-3833-4833-8833-83383383a001';
  b constant uuid := '83383383-3833-4833-8833-83383383b002';
  v_old_id uuid;
  v_res    jsonb;
  v_old    public.subscriptions%ROWTYPE;
  v_new    public.subscriptions%ROWTYPE;
  v_n      integer;
  v_meta   jsonb;
BEGIN
  v_old_id := pg_temp.f833_setup();
  v_res := public.transfer_subscription('apple', 'F833-TXN', b, a, pg_temp.f833_fields(), 'proof-1');
  IF v_res->>'outcome' <> 'transferred' THEN
    RAISE EXCEPTION 'FEAT-833 Test 1 FAIL: outcome %', v_res->>'outcome';
  END IF;

  SELECT * INTO v_old FROM public.subscriptions WHERE id = v_old_id;
  SELECT * INTO v_new FROM public.subscriptions WHERE user_id = b;
  IF v_new.id IS DISTINCT FROM (v_res->>'subscription_id')::uuid THEN
    RAISE EXCEPTION 'FEAT-833 Test 1 FAIL: returned subscription_id is not the caller''s row';
  END IF;

  -- Tombstone: in place, same uid, expired, every identifying column NULL, the rest kept.
  IF v_old.user_id <> a OR v_old.status <> 'expired'
     OR v_old.original_transaction_id IS NOT NULL OR v_old.platform_subscription_id IS NOT NULL
     OR v_old.platform_customer_id IS NOT NULL OR v_old.receipt_hash IS NOT NULL
     OR v_old.receipt_data_encrypted IS NOT NULL OR v_old.trial_start_date IS NOT NULL
     OR v_old.trial_end_date IS NOT NULL OR v_old.subscription_start_date IS NOT NULL
     OR v_old.subscription_end_date IS NOT NULL OR v_old.grace_period_end IS NOT NULL
     OR v_old.last_payment_date IS NOT NULL OR v_old.last_receipt_verified IS NOT NULL
     OR v_old.last_store_event_at IS NOT NULL THEN
    RAISE EXCEPTION 'FEAT-833 Test 1 FAIL: the tombstone is not minimised in place';
  END IF;
  IF v_old.environment <> 'Sandbox' OR v_old.interval <> 'monthly' OR v_old.tier <> 'standard'
     OR v_old.platform <> 'apple' THEN
    RAISE EXCEPTION 'FEAT-833 Test 1 FAIL: the tombstone dropped a kept column';
  END IF;

  -- Coarsened: a UTC midnight, never the new row's instant, never the old value.
  IF v_old.updated_at <> date_trunc('day', v_old.updated_at, 'UTC')
     OR v_old.updated_at > now() OR v_old.updated_at < now() - interval '2 days' THEN
    RAISE EXCEPTION 'FEAT-833 Test 1 FAIL: tombstone updated_at % carries a time of day', v_old.updated_at;
  END IF;
  IF v_old.updated_at = v_new.updated_at THEN
    RAISE EXCEPTION 'FEAT-833 Test 1 FAIL: tombstone and new row share an updated_at (the cross-uid join)';
  END IF;

  -- The caller's row: bound, live, last_store_event_at = the verification signedDate passed in.
  IF v_new.original_transaction_id <> 'F833-TXN' OR v_new.status <> 'active' OR v_new.platform <> 'apple'
     OR v_new.last_store_event_at <> '2026-10-21T11:59:30Z'::timestamptz
     OR v_new.updated_at <> now() THEN
    RAISE EXCEPTION 'FEAT-833 Test 1 FAIL: the caller row is not the verified binding';
  END IF;

  -- Ledger: one row, keyed by the hash, proof recorded, no uid column at all.
  SELECT count(*) INTO v_n FROM public.subscription_transfer_ledger
   WHERE txn_key = pg_temp.f833_key() AND proof_hash = 'proof-1';
  IF v_n <> 1 THEN RAISE EXCEPTION 'FEAT-833 Test 1 FAIL: % ledger rows', v_n; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'subscription_transfer_ledger'
                AND data_type = 'uuid') THEN
    RAISE EXCEPTION 'FEAT-833 Test 1 FAIL: the ledger has a uuid column';
  END IF;

  -- Audit: on the new uid and row only, metadata exactly {platform, reason}.
  SELECT count(*), (array_agg(metadata))[1] INTO v_n, v_meta FROM public.subscription_events
   WHERE user_id = b AND subscription_id = v_new.id AND event_type = 'subscription_restored';
  IF v_n <> 1 OR v_meta <> '{"platform": "apple", "reason": "transfer"}'::jsonb THEN
    RAISE EXCEPTION 'FEAT-833 Test 1 FAIL: audit rows % metadata %', v_n, v_meta;
  END IF;
  IF EXISTS (SELECT 1 FROM public.subscription_events WHERE user_id = a AND created_at = now()) THEN
    RAISE EXCEPTION 'FEAT-833 Test 1 FAIL: the old uid received an event from the transfer';
  END IF;

  -- uniq_txn_per_platform still fires for a third uid.
  BEGIN
    INSERT INTO public.subscriptions (user_id, platform, original_transaction_id, environment, status, tier, interval)
    VALUES ('83383383-3833-4833-8833-83383383c003', 'apple', 'F833-TXN', 'Sandbox', 'active', 'standard', 'monthly');
    RAISE EXCEPTION 'FEAT-833 Test 1 FAIL: a third uid bound the transferred transaction';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  RAISE NOTICE 'FEAT-833 Test 1 PASS: transfer tombstones in place, binds the caller, ledgers and audits.';
  RAISE EXCEPTION 'F833_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'F833_ROLLBACK' THEN RAISE; END IF;
END $$;

-- ============ Test 2: the CAS outcomes write nothing
DO $$
DECLARE
  a constant uuid := '83383383-3833-4833-8833-83383383a001';
  b constant uuid := '83383383-3833-4833-8833-83383383b002';
  c constant uuid := '83383383-3833-4833-8833-83383383c003';
  v_old_id uuid;
  v_out    text;
BEGIN
  v_old_id := pg_temp.f833_setup();

  v_out := public.transfer_subscription('apple', 'F833-NOPE', b, a, pg_temp.f833_fields()) ->> 'outcome';
  IF v_out <> 'not_found' THEN RAISE EXCEPTION 'FEAT-833 Test 2 FAIL: not_found gave %', v_out; END IF;

  v_out := public.transfer_subscription('apple', 'F833-TXN', a, a, pg_temp.f833_fields()) ->> 'outcome';
  IF v_out <> 'same_holder' THEN RAISE EXCEPTION 'FEAT-833 Test 2 FAIL: same_holder gave %', v_out; END IF;

  v_out := public.transfer_subscription('apple', 'F833-TXN', b, c, pg_temp.f833_fields()) ->> 'outcome';
  IF v_out <> 'cas_miss' THEN RAISE EXCEPTION 'FEAT-833 Test 2 FAIL: cas_miss gave %', v_out; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE id = v_old_id AND original_transaction_id = 'F833-TXN')
     OR EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = b)
     OR EXISTS (SELECT 1 FROM public.subscription_transfer_ledger WHERE txn_key = pg_temp.f833_key()) THEN
    RAISE EXCEPTION 'FEAT-833 Test 2 FAIL: a refused transfer wrote something';
  END IF;

  RAISE NOTICE 'FEAT-833 Test 2 PASS: not_found, same_holder and cas_miss write nothing.';
  RAISE EXCEPTION 'F833_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'F833_ROLLBACK' THEN RAISE; END IF;
END $$;

-- ============ Test 3: a caller's live row refuses; an expired one is overwritten whole
DO $$
DECLARE
  a constant uuid := '83383383-3833-4833-8833-83383383a001';
  b constant uuid := '83383383-3833-4833-8833-83383383b002';
  v_b_id uuid;
  v_out  text;
  v_new  public.subscriptions%ROWTYPE;
BEGIN
  PERFORM pg_temp.f833_setup();
  INSERT INTO public.subscriptions (user_id, platform, original_transaction_id, environment, status, tier, interval,
                                    trial_start_date, trial_end_date)
  VALUES (b, 'apple', 'F833-OTHER', 'Sandbox', 'active', 'standard', 'yearly',
          now() - interval '40 days', now() - interval '10 days')
  RETURNING id INTO v_b_id;

  v_out := public.transfer_subscription('apple', 'F833-TXN', b, a, pg_temp.f833_fields()) ->> 'outcome';
  IF v_out <> 'caller_has_live_row' THEN
    RAISE EXCEPTION 'FEAT-833 Test 3 FAIL: a live caller row gave %', v_out;
  END IF;

  UPDATE public.subscriptions SET status = 'expired' WHERE id = v_b_id;
  v_out := public.transfer_subscription('apple', 'F833-TXN', b, a, pg_temp.f833_fields()) ->> 'outcome';
  IF v_out <> 'transferred' THEN RAISE EXCEPTION 'FEAT-833 Test 3 FAIL: an expired caller row gave %', v_out; END IF;

  SELECT * INTO v_new FROM public.subscriptions WHERE user_id = b;
  IF v_new.id <> v_b_id OR v_new.original_transaction_id <> 'F833-TXN' OR v_new.interval <> 'monthly'
     OR v_new.trial_start_date IS NOT NULL OR v_new.trial_end_date IS NOT NULL THEN
    RAISE EXCEPTION 'FEAT-833 Test 3 FAIL: the expired caller row kept stale values';
  END IF;

  RAISE NOTICE 'FEAT-833 Test 3 PASS: caller_has_live_row refuses; an expired caller row is overwritten whole.';
  RAISE EXCEPTION 'F833_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'F833_ROLLBACK' THEN RAISE; END IF;
END $$;

-- ============ Test 4: rate limits — 10 min, 3/24h, 10/30d per transaction; 5 failed proofs/uid/h
DO $$
DECLARE
  a constant uuid := '83383383-3833-4833-8833-83383383a001';
  b constant uuid := '83383383-3833-4833-8833-83383383b002';
  v_out text;
BEGIN
  PERFORM pg_temp.f833_setup();

  INSERT INTO public.subscription_transfer_ledger (txn_key, transferred_at) VALUES (pg_temp.f833_key(), now() - interval '5 minutes');
  v_out := public.transfer_subscription('apple', 'F833-TXN', b, a, pg_temp.f833_fields()) ->> 'outcome';
  IF v_out <> 'rate_limited' THEN RAISE EXCEPTION 'FEAT-833 Test 4 FAIL: 10-minute limit gave %', v_out; END IF;
  DELETE FROM public.subscription_transfer_ledger WHERE txn_key = pg_temp.f833_key();

  INSERT INTO public.subscription_transfer_ledger (txn_key, transferred_at)
  SELECT pg_temp.f833_key(), now() - make_interval(hours => h) FROM generate_series(2, 4) h;
  v_out := public.transfer_subscription('apple', 'F833-TXN', b, a, pg_temp.f833_fields()) ->> 'outcome';
  IF v_out <> 'rate_limited' THEN RAISE EXCEPTION 'FEAT-833 Test 4 FAIL: 3/24h limit gave %', v_out; END IF;
  DELETE FROM public.subscription_transfer_ledger WHERE txn_key = pg_temp.f833_key();

  INSERT INTO public.subscription_transfer_ledger (txn_key, transferred_at)
  SELECT pg_temp.f833_key(), now() - make_interval(days => d) FROM generate_series(2, 11) d;
  v_out := public.transfer_subscription('apple', 'F833-TXN', b, a, pg_temp.f833_fields()) ->> 'outcome';
  IF v_out <> 'rate_limited' THEN RAISE EXCEPTION 'FEAT-833 Test 4 FAIL: 10/30d limit gave %', v_out; END IF;
  DELETE FROM public.subscription_transfer_ledger WHERE txn_key = pg_temp.f833_key();

  INSERT INTO public.subscription_transfer_proof_failures (user_id, failed_at)
  SELECT b, now() - make_interval(mins => m) FROM generate_series(1, 5) m;
  v_out := public.transfer_subscription('apple', 'F833-TXN', b, a, pg_temp.f833_fields()) ->> 'outcome';
  IF v_out <> 'rate_limited' THEN RAISE EXCEPTION 'FEAT-833 Test 4 FAIL: failed-proof limit gave %', v_out; END IF;
  DELETE FROM public.subscription_transfer_proof_failures WHERE user_id = b;

  -- Control: under every limit (2 in 24h, failures outside the hour) the transfer goes through.
  INSERT INTO public.subscription_transfer_ledger (txn_key, transferred_at)
  SELECT pg_temp.f833_key(), now() - make_interval(hours => h) FROM generate_series(2, 3) h;
  INSERT INTO public.subscription_transfer_proof_failures (user_id, failed_at)
  SELECT b, now() - interval '2 hours' FROM generate_series(1, 5);
  v_out := public.transfer_subscription('apple', 'F833-TXN', b, a, pg_temp.f833_fields()) ->> 'outcome';
  IF v_out <> 'transferred' THEN RAISE EXCEPTION 'FEAT-833 Test 4 FAIL: the under-limit control gave %', v_out; END IF;

  -- The failure RPC counts only the last hour.
  IF public.record_subscription_transfer_proof_failure(b) <> 1 THEN
    RAISE EXCEPTION 'FEAT-833 Test 4 FAIL: record_subscription_transfer_proof_failure miscounts';
  END IF;

  RAISE NOTICE 'FEAT-833 Test 4 PASS: all four limits refuse, and the under-limit control transfers.';
  RAISE EXCEPTION 'F833_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'F833_ROLLBACK' THEN RAISE; END IF;
END $$;

-- ============ Test 5: a reused proof is refused inside the transaction, and writes nothing
DO $$
DECLARE
  a constant uuid := '83383383-3833-4833-8833-83383383a001';
  b constant uuid := '83383383-3833-4833-8833-83383383b002';
  v_old_id uuid;
  v_out    text;
BEGIN
  v_old_id := pg_temp.f833_setup();
  INSERT INTO public.subscription_transfer_ledger (txn_key, transferred_at, proof_hash)
  VALUES ('some-other-transaction', now() - interval '40 days', 'proof-used');

  v_out := public.transfer_subscription('apple', 'F833-TXN', b, a, pg_temp.f833_fields(), 'proof-used') ->> 'outcome';
  IF v_out <> 'proof_reused' THEN RAISE EXCEPTION 'FEAT-833 Test 5 FAIL: a reused proof gave %', v_out; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE id = v_old_id AND original_transaction_id = 'F833-TXN')
     OR EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = b) THEN
    RAISE EXCEPTION 'FEAT-833 Test 5 FAIL: a reused proof moved the binding';
  END IF;

  RAISE NOTICE 'FEAT-833 Test 5 PASS: a reused proof is refused and writes nothing.';
  RAISE EXCEPTION 'F833_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'F833_ROLLBACK' THEN RAISE; END IF;
END $$;

-- ============ Test 6: invalid arguments RAISE (the handler's 500), and name no principal
DO $$
DECLARE
  a constant uuid := '83383383-3833-4833-8833-83383383a001';
  b constant uuid := '83383383-3833-4833-8833-83383383b002';
  v_cases jsonb[] := ARRAY[
    pg_temp.f833_fields() || '{"user_id": "x"}',
    pg_temp.f833_fields() || '{"status": "expired"}',
    pg_temp.f833_fields() - 'last_store_event_at'
  ];
  v_case   jsonb;
  v_raised boolean;
BEGIN
  PERFORM pg_temp.f833_setup();
  FOREACH v_case IN ARRAY v_cases LOOP
    v_raised := false;
    BEGIN
      PERFORM public.transfer_subscription('apple', 'F833-TXN', b, a, v_case);
    EXCEPTION WHEN raise_exception THEN
      v_raised := true;
      IF SQLERRM LIKE '%' || a::text || '%' OR SQLERRM LIKE '%' || b::text || '%' THEN
        RAISE EXCEPTION 'FEAT-833 Test 6 FAIL: an error message names a principal';
      END IF;
    END;
    IF NOT v_raised THEN RAISE EXCEPTION 'FEAT-833 Test 6 FAIL: accepted %', v_case; END IF;
  END LOOP;

  RAISE NOTICE 'FEAT-833 Test 6 PASS: a foreign key, a non-live status and a missing signedDate RAISE.';
  RAISE EXCEPTION 'F833_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'F833_ROLLBACK' THEN RAISE; END IF;
END $$;

-- ============ Test 7: the trigger — a tombstone keeps its value, every other update gets now()
DO $$
DECLARE
  v_id uuid;
  v_at timestamptz;
BEGIN
  v_id := pg_temp.f833_setup();
  UPDATE public.subscriptions SET status = 'grace', updated_at = '2000-01-01T00:00:00Z' WHERE id = v_id;
  SELECT updated_at INTO v_at FROM public.subscriptions WHERE id = v_id;
  IF v_at <> now() THEN RAISE EXCEPTION 'FEAT-833 Test 7 FAIL: an ordinary update kept %', v_at; END IF;

  UPDATE public.subscriptions SET original_transaction_id = NULL, updated_at = '2000-01-01T00:00:00Z' WHERE id = v_id;
  SELECT updated_at INTO v_at FROM public.subscriptions WHERE id = v_id;
  IF v_at <> '2000-01-01T00:00:00Z'::timestamptz THEN
    RAISE EXCEPTION 'FEAT-833 Test 7 FAIL: the tombstone transition was overwritten with %', v_at;
  END IF;

  RAISE NOTICE 'FEAT-833 Test 7 PASS: only the txn-NULLing transition keeps an explicit updated_at.';
  RAISE EXCEPTION 'F833_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'F833_ROLLBACK' THEN RAISE; END IF;
END $$;

-- ============ Test 8: a webhook holding the pre-transfer updated_at loses its conditioned UPDATE
-- The exact predicate subscription-webhook/handlers.ts uses (eq id, eq updated_at).
DO $$
DECLARE
  a constant uuid := '83383383-3833-4833-8833-83383383a001';
  b constant uuid := '83383383-3833-4833-8833-83383383b002';
  v_old_id   uuid;
  v_captured timestamptz;
  v_n        integer;
  v_holder   uuid;
BEGIN
  v_old_id := pg_temp.f833_setup();
  SELECT updated_at INTO v_captured FROM public.subscriptions WHERE id = v_old_id;
  PERFORM public.transfer_subscription('apple', 'F833-TXN', b, a, pg_temp.f833_fields());

  UPDATE public.subscriptions SET status = status WHERE id = v_old_id AND updated_at = v_captured;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 0 THEN RAISE EXCEPTION 'FEAT-833 Test 8 FAIL: the stale webhook write matched the tombstone'; END IF;

  SELECT user_id INTO v_holder FROM public.subscriptions
   WHERE platform = 'apple' AND original_transaction_id = 'F833-TXN';
  IF v_holder IS DISTINCT FROM b THEN RAISE EXCEPTION 'FEAT-833 Test 8 FAIL: the re-read does not find the new holder'; END IF;

  RAISE NOTICE 'FEAT-833 Test 8 PASS: the racing webhook write misses; the re-read finds the new holder.';
  RAISE EXCEPTION 'F833_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'F833_ROLLBACK' THEN RAISE; END IF;
END $$;

-- ============ Test 9: the prune deletes only expired rows and writes its heartbeat
DO $$
DECLARE
  b constant uuid := '83383383-3833-4833-8833-83383383b002';
  v_n integer;
BEGIN
  PERFORM pg_temp.f833_setup();
  INSERT INTO public.subscription_transfer_ledger (txn_key, transferred_at) VALUES
    ('f833-prune', now() - interval '32 days'), ('f833-prune', now() - interval '30 days');
  INSERT INTO public.subscription_transfer_proof_failures (user_id, failed_at) VALUES
    (b, now() - interval '2 hours'), (b, now() - interval '10 minutes');

  PERFORM public.run_subscription_transfer_prune();

  SELECT count(*) INTO v_n FROM public.subscription_transfer_ledger WHERE txn_key = 'f833-prune';
  IF v_n <> 1 THEN RAISE EXCEPTION 'FEAT-833 Test 9 FAIL: % ledger rows survive (want 1)', v_n; END IF;
  SELECT count(*) INTO v_n FROM public.subscription_transfer_proof_failures WHERE user_id = b;
  IF v_n <> 1 THEN RAISE EXCEPTION 'FEAT-833 Test 9 FAIL: % failure rows survive (want 1)', v_n; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.retention_prune_runs
                  WHERE job_name = 'subscription-transfer-prune' AND status = 'ok' AND ran_at = now()) THEN
    RAISE EXCEPTION 'FEAT-833 Test 9 FAIL: no ok heartbeat row';
  END IF;

  RAISE NOTICE 'FEAT-833 Test 9 PASS: the prune keeps the window and writes its heartbeat.';
  RAISE EXCEPTION 'F833_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'F833_ROLLBACK' THEN RAISE; END IF;
END $$;

-- ============ Test 10: grants, RLS, the cron job, and a non-raising prune handler (read-only)
DO $$
DECLARE
  t   text;
  fn  text;
  src text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.transfer_subscription(text, text, uuid, uuid, jsonb, text)',
    'public.record_subscription_transfer_proof_failure(uuid)'
  ] LOOP
    IF has_function_privilege('anon', fn, 'EXECUTE') OR has_function_privilege('authenticated', fn, 'EXECUTE')
       OR NOT has_function_privilege('service_role', fn, 'EXECUTE')
       OR (SELECT proacl::text NOT LIKE '%service_role=X%' FROM pg_proc WHERE oid = fn::regprocedure) THEN
      RAISE EXCEPTION 'FEAT-833 Test 10 FAIL: % is not service_role-only with an explicit grant', fn;
    END IF;
  END LOOP;
  IF has_function_privilege('anon', 'public.run_subscription_transfer_prune()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.run_subscription_transfer_prune()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FEAT-833 Test 10 FAIL: the prune is client-callable';
  END IF;

  FOREACH t IN ARRAY ARRAY['public.subscription_transfer_ledger', 'public.subscription_transfer_proof_failures'] LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = t::regclass) THEN
      RAISE EXCEPTION 'FEAT-833 Test 10 FAIL: RLS is off on %', t;
    END IF;
    IF has_table_privilege('anon', t, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE')
       OR has_table_privilege('authenticated', t, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE') THEN
      RAISE EXCEPTION 'FEAT-833 Test 10 FAIL: a client role holds a verb on %', t;
    END IF;
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'subscription-transfer-prune' AND schedule = '5 * * * *') THEN
    RAISE EXCEPTION 'FEAT-833 Test 10 FAIL: the hourly prune job is not scheduled';
  END IF;

  -- Comments stripped: the handler's own warning names the keyword it forbids.
  src := regexp_replace(pg_get_functiondef('public.run_subscription_transfer_prune()'::regprocedure), '--[^\n]*', '', 'g');
  IF substring(src FROM position('EXCEPTION WHEN OTHERS' IN src)) ~* '\mRAISE\M' THEN
    RAISE EXCEPTION 'FEAT-833 Test 10 FAIL: the prune''s exception handler re-raises';
  END IF;

  RAISE NOTICE 'FEAT-833 Test 10 PASS: service_role-only RPCs, client roles locked out, RLS on, hourly job, non-raising handler.';
END $$;

-- The repo-wide sweeps enumerate pg_proc themselves; they must still pass with the new functions.
\ir debug440_rpc_execute_sweep.sql
\ir debug455_search_path_pin_sweep.sql

SELECT 'ALL FEAT-833 TRANSFER TESTS PASSED' AS result;
