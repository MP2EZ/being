-- DEBUG-836 — log_subscription_event's p_subscription_id is the subscriptions row uuid, owned by
-- p_user_id. A store identifier there is refused, which is why the verifiers' success audit rows
-- never landed while they passed Apple's originalTransactionId / Google's orderId.
--
-- WHY THIS FILE EXISTS SEPARATELY FROM THE DENO TEST.
-- supabase/functions/_tests/helpers/fakeSupabase.ts mirrors the uuid parameter (22P02) and the
-- receipt-handler tests assert the row-uuid-or-null contract at every verifier call site. That
-- pins the CALLERS against a fake; this file pins the FUNCTION, so the fake cannot drift from
-- the database unnoticed. It is run by hand — no CI workflow references supabase/tests/.
--
-- HOW TO RUN (local stack):
--   supabase start && supabase db reset
--   docker exec -i supabase_db_$(basename "$PWD") psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/debug836_audit_subscription_row_id.sql
--
-- SAFE AGAINST SHARED PROD: every write happens inside one DO block that is ROLLED BACK by a
-- sentinel exception. Nothing persists, including the two probe principals.
--
-- Last validated: not yet run (written 2026-10-22; no local Docker in the authoring session).

\set ON_ERROR_STOP on

DO $$
DECLARE
  v_a        uuid := '83683683-6836-4836-8836-836836836a01';
  v_b        uuid := '83683683-6836-4836-8836-836836836b02';
  v_row      uuid;
  v_event_id uuid;
  v_landed   integer;
  v_refused  boolean;
BEGIN
  -- Two anonymous principals; the on_auth_user_created trigger provisions public.users.
  INSERT INTO auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
  VALUES
    (v_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()),
    (v_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now());

  -- A google row: apple rows must carry `environment` (subscriptions_apple_environment_present).
  INSERT INTO public.subscriptions (user_id, platform, original_transaction_id, status, tier, interval, crisis_access_enabled)
  VALUES (v_a, 'google', 'debug836-probe-token', 'active', 'standard', 'monthly', true)
  RETURNING id INTO v_row;

  -- ============ Test 1: the row uuid its owner holds lands, linked to that row
  v_event_id := public.log_subscription_event(
    v_a, v_row, 'receipt_verification_succeeded', jsonb_build_object('platform', 'google')
  );
  SELECT count(*) INTO v_landed
    FROM public.subscription_events
   WHERE id = v_event_id AND user_id = v_a AND subscription_id = v_row;
  IF v_landed <> 1 THEN
    RAISE EXCEPTION 'DEBUG-836 Test 1 FAIL: the owner''s row uuid did not produce a linked audit row';
  END IF;
  RAISE NOTICE 'DEBUG-836 Test 1 PASS: an owned row uuid lands, linked.';

  -- ============ Test 2: a store-shaped identifier is refused with 22P02
  -- An UNTYPED literal, as PostgREST sends it: Postgres casts it to the uuid parameter and fails
  -- the cast. (A text-typed variable would fail function resolution with 42883 instead, which
  -- is not what the edge functions hit.)
  v_refused := false;
  BEGIN
    PERFORM public.log_subscription_event(
      v_a, '2000000847061713', 'receipt_verification_succeeded', '{}'::jsonb
    );
  EXCEPTION WHEN invalid_text_representation THEN
    v_refused := true;
  END;
  IF NOT v_refused THEN
    RAISE EXCEPTION 'DEBUG-836 Test 2 FAIL: a store transaction id was accepted as p_subscription_id';
  END IF;
  RAISE NOTICE 'DEBUG-836 Test 2 PASS: a store identifier is refused (22P02).';

  -- ============ Test 3: a valid uuid owned by ANOTHER user is refused
  -- Without this, Test 1 would pass on any uuid; the ownership check is half the contract.
  v_refused := false;
  BEGIN
    PERFORM public.log_subscription_event(
      v_b, v_row, 'receipt_verification_succeeded', '{}'::jsonb
    );
  EXCEPTION WHEN raise_exception THEN
    v_refused := SQLERRM LIKE '%does not belong%';
  END;
  IF NOT v_refused THEN
    RAISE EXCEPTION 'DEBUG-836 Test 3 FAIL: another user''s row uuid was accepted';
  END IF;
  RAISE NOTICE 'DEBUG-836 Test 3 PASS: another user''s row uuid is refused.';

  -- ============ Test 4: null still lands, unlinked (every verifier failure path passes null)
  v_event_id := public.log_subscription_event(
    v_a, NULL, 'receipt_verification_failed', jsonb_build_object('platform', 'google')
  );
  SELECT count(*) INTO v_landed
    FROM public.subscription_events
   WHERE id = v_event_id AND subscription_id IS NULL;
  IF v_landed <> 1 THEN
    RAISE EXCEPTION 'DEBUG-836 Test 4 FAIL: a null p_subscription_id did not land';
  END IF;
  RAISE NOTICE 'DEBUG-836 Test 4 PASS: a null row id lands unlinked.';

  -- Nothing persists.
  RAISE EXCEPTION 'DEBUG836_ROLLBACK_SENTINEL';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'DEBUG836_ROLLBACK_SENTINEL' THEN
    RAISE NOTICE 'DEBUG-836: probe rows rolled back, nothing persisted.';
  ELSE
    RAISE;
  END IF;
END $$;
