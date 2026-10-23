-- DEBUG-842 — after transfer_subscription() the old uid keeps no subscription history and no
-- store date: its subscription_events are deleted, the tombstone's created_at is the coarsened
-- transfer day, and the new row's start dates are the RPC's own, never the handler's.
--
-- RULING (founder + compliance, 2026-10-22): fix shapes (a) and (d), with (c) enforced in the
-- RPC. Channels and the accepted residual: the DEBUG-842 Notion page, AC1 + AC2 sections.
--
-- HOW TO RUN (local stack, after the migrations):
--   supabase start && supabase db reset
--   docker exec -i supabase_db_$(basename "$PWD") psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/debug842_transfer_old_uid_history.sql
--
-- SAFE AGAINST SHARED PROD: every data test is one DO block rolled back by a sentinel
-- exception, and the fixed principals below exist only inside those blocks.

\set ON_ERROR_STOP on

-- Fixture: A holds a live apple subscription created mid-day 40 days ago, with history on A;
-- B (the caller) and C (a bystander) each have an event of their own. Returns A's row id.
CREATE FUNCTION pg_temp.d842_setup() RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
  a constant uuid := '84284284-2842-4842-8842-84284284a001';
  b constant uuid := '84284284-2842-4842-8842-84284284b002';
  c constant uuid := '84284284-2842-4842-8842-84284284c003';
  v_row uuid;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
  SELECT u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()
    FROM unnest(ARRAY[a, b, c]) u;
  INSERT INTO public.subscriptions (
    user_id, platform, original_transaction_id, platform_subscription_id, environment,
    status, tier, interval, subscription_start_date, subscription_end_date,
    last_receipt_verified, last_store_event_at, created_at, updated_at
  ) VALUES (
    a, 'apple', 'D842-TXN', 'D842-TXN', 'Sandbox', 'active', 'standard', 'monthly',
    now() - interval '40 days 3 hours 17 minutes', now() + interval '20 days 20 hours 43 minutes',
    now() - interval '1 day', now() - interval '2 hours',
    now() - interval '40 days 3 hours 17 minutes', now() - interval '1 day'
  ) RETURNING id INTO v_row;

  INSERT INTO public.subscription_events (user_id, subscription_id, event_type, metadata, created_at) VALUES
    (a, v_row, 'receipt_verification_succeeded', '{"platform": "apple"}', now() - interval '40 days 3 hours 16 minutes'),
    (a, v_row, 'subscription_started', '{"platform": "apple"}', now() - interval '40 days 3 hours 16 minutes'),
    (a, v_row, 'subscription_renewed', '{"platform": "apple"}', now() - interval '9 days 3 hours'),
    (a, NULL,  'payment_failed', '{"platform": "apple"}', now() - interval '2 hours'),
    (b, NULL,  'subscription_started', '{"platform": "apple"}', now() - interval '5 days'),
    (c, NULL,  'subscription_renewed', '{"platform": "apple"}', now() - interval '3 days');
  RETURN v_row;
END $$;

-- The verified fields FEAT-714's handler would pass for B. No start dates: the RPC sets them.
CREATE FUNCTION pg_temp.d842_fields() RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object(
    'status', 'active', 'interval', 'monthly', 'environment', 'Sandbox',
    'platform_subscription_id', 'D842-TXN', 'receipt_hash', 'hash-b',
    'subscription_end_date', (now() + interval '20 days 20 hours 43 minutes')::text,
    'last_receipt_verified', now()::text, 'last_store_event_at', (now() - interval '30 seconds')::text
  )
$$;

-- ============ Test 1: a transfer deletes every old-uid event and nobody else's
DO $$
DECLARE
  a constant uuid := '84284284-2842-4842-8842-84284284a001';
  b constant uuid := '84284284-2842-4842-8842-84284284b002';
  c constant uuid := '84284284-2842-4842-8842-84284284c003';
  v_out text;
BEGIN
  PERFORM pg_temp.d842_setup();
  v_out := public.transfer_subscription('apple', 'D842-TXN', b, a, pg_temp.d842_fields(), 'd842-proof-1') ->> 'outcome';
  IF v_out <> 'transferred' THEN RAISE EXCEPTION 'DEBUG-842 Test 1 FAIL: outcome %', v_out; END IF;

  IF EXISTS (SELECT 1 FROM public.subscription_events WHERE user_id = a) THEN
    RAISE EXCEPTION 'DEBUG-842 Test 1 FAIL: % old-uid events survived the transfer',
      (SELECT count(*) FROM public.subscription_events WHERE user_id = a);
  END IF;
  IF (SELECT count(*) FROM public.subscription_events WHERE user_id = c) <> 1 THEN
    RAISE EXCEPTION 'DEBUG-842 Test 1 FAIL: a bystander''s event was touched';
  END IF;
  -- B keeps its own prior event and gains exactly the transfer audit.
  IF (SELECT count(*) FROM public.subscription_events WHERE user_id = b AND event_type = 'subscription_started') <> 1
     OR (SELECT count(*) FROM public.subscription_events WHERE user_id = b AND event_type = 'subscription_restored') <> 1 THEN
    RAISE EXCEPTION 'DEBUG-842 Test 1 FAIL: the caller''s events are not its prior one plus the transfer audit';
  END IF;

  RAISE NOTICE 'DEBUG-842 Test 1 PASS: the transfer deletes the old uid''s events only.';
  RAISE EXCEPTION 'D842_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'D842_ROLLBACK' THEN RAISE; END IF;
END $$;

-- ============ Test 2: the tombstone's created_at is the coarsened transfer day
DO $$
DECLARE
  a constant uuid := '84284284-2842-4842-8842-84284284a001';
  b constant uuid := '84284284-2842-4842-8842-84284284b002';
  v_old_id uuid;
  v_old    public.subscriptions%ROWTYPE;
BEGIN
  v_old_id := pg_temp.d842_setup();
  PERFORM public.transfer_subscription('apple', 'D842-TXN', b, a, pg_temp.d842_fields(), 'd842-proof-2');
  SELECT * INTO v_old FROM public.subscriptions WHERE id = v_old_id;

  IF v_old.created_at IS DISTINCT FROM v_old.updated_at THEN
    RAISE EXCEPTION 'DEBUG-842 Test 2 FAIL: tombstone created_at % <> updated_at %', v_old.created_at, v_old.updated_at;
  END IF;
  IF v_old.created_at <> date_trunc('day', v_old.created_at, 'UTC')
     OR v_old.created_at > now() OR v_old.created_at < now() - interval '2 days' THEN
    RAISE EXCEPTION 'DEBUG-842 Test 2 FAIL: tombstone created_at % is not the transfer day', v_old.created_at;
  END IF;

  RAISE NOTICE 'DEBUG-842 Test 2 PASS: the tombstone carries no creation time of day.';
  RAISE EXCEPTION 'D842_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'D842_ROLLBACK' THEN RAISE; END IF;
END $$;

-- ============ Test 3: start dates are the transfer time, and the handler cannot supply them
DO $$
DECLARE
  a constant uuid := '84284284-2842-4842-8842-84284284a001';
  b constant uuid := '84284284-2842-4842-8842-84284284b002';
  v_new public.subscriptions%ROWTYPE;
  k     text;
BEGIN
  PERFORM pg_temp.d842_setup();
  PERFORM public.transfer_subscription('apple', 'D842-TXN', b, a, pg_temp.d842_fields(), 'd842-proof-3');
  SELECT * INTO v_new FROM public.subscriptions WHERE user_id = b;
  IF v_new.subscription_start_date IS DISTINCT FROM now() THEN
    RAISE EXCEPTION 'DEBUG-842 Test 3 FAIL: new subscription_start_date % is not the transfer time', v_new.subscription_start_date;
  END IF;

  FOREACH k IN ARRAY ARRAY['subscription_start_date', 'trial_start_date'] LOOP
    BEGIN
      PERFORM public.transfer_subscription('apple', 'D842-TXN', b, a,
        pg_temp.d842_fields() || jsonb_build_object(k, (now() - interval '40 days')::text), 'd842-proof-3' || k);
      RAISE EXCEPTION 'DEBUG-842 Test 3 FAIL: the RPC accepted % from the handler', k;
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM NOT LIKE '%outside the whitelist%' THEN RAISE; END IF;
    END;
  END LOOP;

  RAISE NOTICE 'DEBUG-842 Test 3 PASS: start dates come from the RPC, never the handler.';
  RAISE EXCEPTION 'D842_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'D842_ROLLBACK' THEN RAISE; END IF;
END $$;

-- ============ Test 4: in grace past expiry the start date stays before the end (CHECK holds)
DO $$
DECLARE
  a constant uuid := '84284284-2842-4842-8842-84284284a001';
  b constant uuid := '84284284-2842-4842-8842-84284284b002';
  v_end timestamptz := now() - interval '1 day';
  v_out text;
  v_new public.subscriptions%ROWTYPE;
BEGIN
  PERFORM pg_temp.d842_setup();
  v_out := public.transfer_subscription('apple', 'D842-TXN', b, a,
    pg_temp.d842_fields() || jsonb_build_object('status', 'grace', 'subscription_end_date', v_end::text,
                                                'grace_period_end', (v_end + interval '16 days')::text),
    'd842-proof-4') ->> 'outcome';
  IF v_out <> 'transferred' THEN RAISE EXCEPTION 'DEBUG-842 Test 4 FAIL: outcome %', v_out; END IF;
  SELECT * INTO v_new FROM public.subscriptions WHERE user_id = b;
  IF v_new.subscription_start_date IS NULL OR v_new.subscription_start_date >= v_new.subscription_end_date THEN
    RAISE EXCEPTION 'DEBUG-842 Test 4 FAIL: start % not before end %', v_new.subscription_start_date, v_new.subscription_end_date;
  END IF;

  RAISE NOTICE 'DEBUG-842 Test 4 PASS: a grace transfer past expiry keeps start before end.';
  RAISE EXCEPTION 'D842_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'D842_ROLLBACK' THEN RAISE; END IF;
END $$;

-- ============ Test 5: a refused transfer deletes nothing
DO $$
DECLARE
  a constant uuid := '84284284-2842-4842-8842-84284284a001';
  b constant uuid := '84284284-2842-4842-8842-84284284b002';
  c constant uuid := '84284284-2842-4842-8842-84284284c003';
  v_old_id  uuid;
  v_created timestamptz;
  v_out     text;
BEGIN
  v_old_id := pg_temp.d842_setup();
  SELECT created_at INTO v_created FROM public.subscriptions WHERE id = v_old_id;
  v_out := public.transfer_subscription('apple', 'D842-TXN', b, c, pg_temp.d842_fields()) ->> 'outcome';
  IF v_out <> 'cas_miss' THEN RAISE EXCEPTION 'DEBUG-842 Test 5 FAIL: outcome %', v_out; END IF;
  IF (SELECT count(*) FROM public.subscription_events WHERE user_id = a) <> 4
     OR (SELECT created_at FROM public.subscriptions WHERE id = v_old_id) IS DISTINCT FROM v_created THEN
    RAISE EXCEPTION 'DEBUG-842 Test 5 FAIL: a refused transfer touched the holder''s history';
  END IF;

  RAISE NOTICE 'DEBUG-842 Test 5 PASS: a refused transfer deletes nothing.';
  RAISE EXCEPTION 'D842_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'D842_ROLLBACK' THEN RAISE; END IF;
END $$;
