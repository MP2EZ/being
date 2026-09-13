-- DEBUG-446 — the success-audit path actually writes a row, and an unknown event type is
-- refused rather than silently no-oping.
--
-- WHY THIS FILE EXISTS SEPARATELY FROM THE DENO TEST.
-- supabase/functions/_tests/subscription-audit-error-handling.test.ts pins the SOURCE SHAPE —
-- that no caller discards the RPC result. It cannot pin BEHAVIOUR: the `Edge Functions (Deno)`
-- CI job runs `--cached-only` with no network egress (INFRA-354), so nothing there can reach a
-- real Postgres and observe a real CHECK constraint. This file is the behavioural half, and it
-- is run by hand — no CI workflow references supabase/tests/.
--
-- That split is deliberate and worth stating plainly rather than papering over: the assertion
-- that a successful verification produces an audit row is verified on demand, not on every PR.
--
-- HOW TO RUN (local stack):
--   supabase start && supabase db reset
--   docker exec -i supabase_db_$(basename "$PWD") psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/debug446_subscription_event_audit.sql
--
-- SAFE AGAINST SHARED PROD: every write happens inside a transaction that is ROLLED BACK.
-- Nothing persists. Running it in the Supabase SQL editor after a migration push is the
-- intended use.
--
-- Last validated: 2026-08-16 against the shared prod project.

\set ON_ERROR_STOP on

-- ============ Test 1: the constraint permits the success value, and still permits all 12 originals
DO $$
DECLARE
  v_def text;
  v_val text;
  v_all text[] := ARRAY[
    'trial_started', 'trial_ending_soon', 'trial_ended', 'subscription_started',
    'subscription_renewed', 'subscription_cancelled', 'payment_failed',
    'grace_period_started', 'grace_period_ending', 'subscription_expired',
    'subscription_restored', 'receipt_verification_failed',
    'receipt_verification_succeeded'
  ];
BEGIN
  SELECT pg_get_constraintdef(con.oid) INTO v_def
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = rel.relnamespace
   WHERE n.nspname = 'public' AND rel.relname = 'subscription_events'
     AND con.conname = 'subscription_events_event_type_check';

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'DEBUG-446 Test 1 FAIL: subscription_events_event_type_check is missing';
  END IF;

  FOREACH v_val IN ARRAY v_all LOOP
    IF v_def NOT LIKE '%' || v_val || '%' THEN
      RAISE EXCEPTION
        'DEBUG-446 Test 1 FAIL: constraint does not permit %. Definition: %', v_val, v_def;
    END IF;
  END LOOP;

  RAISE NOTICE 'DEBUG-446 Test 1 PASS: all 13 event types permitted.';
END $$;

-- ============ Test 2: a success event actually lands, and an unknown type is REFUSED
-- Rolled back. The row is constructed against a real user so the FK holds; if the table is
-- empty the test skips rather than inventing a user.
DO $$
DECLARE
  v_user     uuid;
  v_event_id uuid;
  v_landed   integer;
  v_refused  boolean := false;
BEGIN
  SELECT id INTO v_user FROM public.users LIMIT 1;

  IF v_user IS NULL THEN
    RAISE NOTICE
      'DEBUG-446 Test 2 SKIP: public.users is empty, so no FK-valid row can be constructed. '
      'Re-run against a database with at least one user. Test 1 still covers the constraint.';
    RETURN;
  END IF;

  -- (a) the success path writes a row. This is the assertion the ticket is about: before the
  -- migration this INSERT raised 23514 and the calling code threw the error away.
  v_event_id := public.log_subscription_event(
    v_user, NULL, 'receipt_verification_succeeded',
    jsonb_build_object('platform', 'apple', 'debug446_probe', true)
  );

  SELECT count(*) INTO v_landed
    FROM public.subscription_events
   WHERE id = v_event_id AND event_type = 'receipt_verification_succeeded';

  IF v_landed <> 1 THEN
    RAISE EXCEPTION
      'DEBUG-446 Test 2 FAIL: a receipt_verification_succeeded event did NOT produce an audit '
      'row (found % rows for id %)', v_landed, v_event_id;
  END IF;

  -- (b) an unknown type SURFACES rather than silently no-opping. The defect had two halves;
  -- this is the half that stays dangerous if only the enum value is added.
  BEGIN
    PERFORM public.log_subscription_event(
      v_user, NULL, 'debug446_definitely_not_a_real_event_type', '{}'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    v_refused := true;
  END;

  IF NOT v_refused THEN
    RAISE EXCEPTION
      'DEBUG-446 Test 2 FAIL: an unknown event_type was accepted. The CHECK constraint is no '
      'longer constraining, or log_subscription_event is swallowing the violation internally.';
  END IF;

  RAISE NOTICE
    'DEBUG-446 Test 2 PASS: success event landed (id %); unknown event type refused.', v_event_id;

  -- Nothing persists.
  RAISE EXCEPTION 'DEBUG446_ROLLBACK_SENTINEL';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'DEBUG446_ROLLBACK_SENTINEL' THEN
    RAISE NOTICE 'DEBUG-446 Test 2: probe rows rolled back, nothing persisted.';
  ELSE
    RAISE;
  END IF;
END $$;
