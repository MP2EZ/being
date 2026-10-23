-- DEBUG-840 — subscription_events retention: the 3-year prune, its heartbeat, NOT NULL
-- created_at, and the job's schedule.
--
-- privacy-policy §7.3 promises audit logs are kept 3 years; until this migration nothing
-- deleted a subscription_events row. 3 years is a CEILING (compliance ruling, AC1): a
-- transfer does not reset the clock, and a NULL created_at row is undatable, so the
-- migration deletes those and makes the column NOT NULL.
--
-- ci.yml's `Supabase SQL suites` job runs this on every PR against a freshly reset local
-- stack (INFRA-782). LOCAL ONLY otherwise:
--   supabase start && supabase db reset
--   psql ... -v ON_ERROR_STOP=1 -f supabase/tests/debug840_subscription_events_retention.sql
--
-- Do NOT run against the shared prod project. Every data test is one DO block rolled back by
-- a sentinel exception, including the forced-failure trigger in Test 3.

\set ON_ERROR_STOP on

-- Fixture: one principal and a subscription row. Returns the subscription row id.
CREATE FUNCTION pg_temp.d840_setup() RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_row uuid;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
  VALUES ('84084084-0840-4840-8840-84084084a001', '00000000-0000-0000-0000-000000000000',
          'authenticated', 'authenticated', true, now(), now());
  INSERT INTO public.subscriptions (
    user_id, platform, original_transaction_id, platform_subscription_id, platform_customer_id,
    receipt_hash, receipt_data_encrypted, environment, status, tier, interval,
    subscription_start_date, subscription_end_date, last_payment_date, last_receipt_verified
  ) VALUES (
    '84084084-0840-4840-8840-84084084a001', 'apple', 'D840-TXN', 'D840-TXN', 'cust',
    'hash', 'enc', 'Sandbox', 'active', 'standard', 'monthly',
    now() - interval '10 days', now() + interval '20 days', now() - interval '10 days', now() - interval '1 day'
  ) RETURNING id INTO v_row;
  RETURN v_row;
END $$;

-- ============ Test 1: the 3-year boundary, linked and orphaned rows, one ok heartbeat
DO $$
DECLARE
  u constant uuid := '84084084-0840-4840-8840-84084084a001';
  v_sub uuid;
  v_n   integer;
  r     public.retention_prune_runs%ROWTYPE;
BEGIN
  v_sub := pg_temp.d840_setup();
  INSERT INTO public.subscription_events (user_id, subscription_id, event_type, metadata, created_at) VALUES
    (u, v_sub, 'subscription_renewed', '{"d840":"old-linked"}',   now() - interval '3 years' - interval '1 day'),
    (u, NULL,  'subscription_renewed', '{"d840":"old-orphan"}',   now() - interval '3 years' - interval '1 day'),
    (u, v_sub, 'subscription_renewed', '{"d840":"young-linked"}', now() - interval '3 years' + interval '1 day'),
    (u, NULL,  'subscription_renewed', '{"d840":"young-orphan"}', now() - interval '3 years' + interval '1 day');

  PERFORM public.run_subscription_events_retention_prune();

  SELECT count(*) INTO v_n FROM public.subscription_events WHERE metadata->>'d840' LIKE 'old-%';
  IF v_n <> 0 THEN RAISE EXCEPTION 'DEBUG-840 Test 1 FAIL: % rows older than 3 years survive', v_n; END IF;
  SELECT count(*) INTO v_n FROM public.subscription_events WHERE metadata->>'d840' LIKE 'young-%';
  IF v_n <> 2 THEN RAISE EXCEPTION 'DEBUG-840 Test 1 FAIL: % rows inside 3 years survive (want 2)', v_n; END IF;

  SELECT count(*) INTO v_n FROM public.retention_prune_runs
   WHERE job_name = 'subscription-events-retention-prune' AND ran_at = now();
  IF v_n <> 1 THEN RAISE EXCEPTION 'DEBUG-840 Test 1 FAIL: % heartbeat rows for one run (want 1)', v_n; END IF;
  SELECT * INTO r FROM public.retention_prune_runs
   WHERE job_name = 'subscription-events-retention-prune' AND ran_at = now();
  -- >= 2, not = 2: rows_deleted counts the whole table, and only ours are known here.
  IF r.status <> 'ok' OR r.rows_deleted IS NULL OR r.rows_deleted < 2 OR r.duration_ms IS NULL THEN
    RAISE EXCEPTION 'DEBUG-840 Test 1 FAIL: heartbeat status % rows_deleted % duration_ms %',
      r.status, r.rows_deleted, r.duration_ms;
  END IF;

  RAISE NOTICE 'DEBUG-840 Test 1 PASS: 3y+1d deleted (linked and orphaned), 3y-1d kept, one ok heartbeat.';
  RAISE EXCEPTION 'D840_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'D840_ROLLBACK' THEN RAISE; END IF;
END $$;

-- ============ Test 2: created_at is NOT NULL and keeps its now() default
DO $$
DECLARE
  u constant uuid := '84084084-0840-4840-8840-84084084a001';
  v_state text;
  v_at    timestamptz;
BEGIN
  PERFORM pg_temp.d840_setup();
  BEGIN
    INSERT INTO public.subscription_events (user_id, event_type, created_at)
    VALUES (u, 'subscription_renewed', NULL);
    v_state := 'none';
  EXCEPTION WHEN OTHERS THEN
    v_state := SQLSTATE;
  END;
  IF v_state <> '23502' THEN
    RAISE EXCEPTION 'DEBUG-840 Test 2 FAIL: a NULL created_at insert gave SQLSTATE % (want 23502)', v_state;
  END IF;

  INSERT INTO public.subscription_events (user_id, event_type) VALUES (u, 'subscription_renewed')
  RETURNING created_at INTO v_at;
  IF v_at IS DISTINCT FROM now() THEN
    RAISE EXCEPTION 'DEBUG-840 Test 2 FAIL: an omitted created_at defaulted to %', v_at;
  END IF;

  RAISE NOTICE 'DEBUG-840 Test 2 PASS: NULL created_at refused with 23502; the default still fills it.';
  RAISE EXCEPTION 'D840_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'D840_ROLLBACK' THEN RAISE; END IF;
END $$;

-- ============ Test 3: a failing prune writes one error row and deletes nothing
-- The behavioural half of the no-RAISE guard (Test 4 is the static half): a re-raise in the
-- handler would roll back this error row with the failed DELETE (see 20260808000000).
DO $$
DECLARE
  u constant uuid := '84084084-0840-4840-8840-84084084a001';
  v_n integer;
  r   public.retention_prune_runs%ROWTYPE;
BEGIN
  PERFORM pg_temp.d840_setup();
  INSERT INTO public.subscription_events (user_id, event_type, metadata, created_at)
  VALUES (u, 'subscription_renewed', '{"d840":"old-forced"}', now() - interval '4 years');

  CREATE FUNCTION public.d840_refuse_delete() RETURNS trigger LANGUAGE plpgsql AS $f$
  BEGIN RAISE EXCEPTION 'd840 forced prune failure'; END $f$;
  CREATE TRIGGER d840_refuse_delete BEFORE DELETE ON public.subscription_events
    FOR EACH ROW EXECUTE FUNCTION public.d840_refuse_delete();

  PERFORM public.run_subscription_events_retention_prune();

  SELECT count(*) INTO v_n FROM public.retention_prune_runs
   WHERE job_name = 'subscription-events-retention-prune' AND ran_at = now();
  IF v_n <> 1 THEN RAISE EXCEPTION 'DEBUG-840 Test 3 FAIL: % heartbeat rows for one failed run (want 1)', v_n; END IF;
  SELECT * INTO r FROM public.retention_prune_runs
   WHERE job_name = 'subscription-events-retention-prune' AND ran_at = now();
  IF r.status <> 'error' OR r.sqlstate <> 'P0001' OR r.detail NOT LIKE '%d840 forced prune failure%' THEN
    RAISE EXCEPTION 'DEBUG-840 Test 3 FAIL: heartbeat status % sqlstate % detail %', r.status, r.sqlstate, r.detail;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.subscription_events WHERE metadata->>'d840' = 'old-forced') THEN
    RAISE EXCEPTION 'DEBUG-840 Test 3 FAIL: the failed run still deleted the row';
  END IF;

  RAISE NOTICE 'DEBUG-840 Test 3 PASS: a failed run records one error row and deletes nothing.';
  RAISE EXCEPTION 'D840_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'D840_ROLLBACK' THEN RAISE; END IF;
END $$;

-- ============ Test 4: posture, grants, the cron job, and a non-raising handler (read-only)
DO $$
DECLARE
  fn constant regprocedure := 'public.run_subscription_events_retention_prune()'::regprocedure;
  p   pg_proc%ROWTYPE;
  src text;
  r   text;
  v_state text;
BEGIN
  SELECT * INTO p FROM pg_proc WHERE oid = fn;
  IF NOT p.prosecdef THEN
    RAISE EXCEPTION 'DEBUG-840 Test 4 FAIL: the prune is not SECURITY DEFINER';
  END IF;
  IF p.proconfig IS NULL OR NOT ('search_path=public, pg_temp' = ANY (p.proconfig)) THEN
    RAISE EXCEPTION 'DEBUG-840 Test 4 FAIL: the prune''s search_path is not pinned to public, pg_temp (%)', p.proconfig;
  END IF;

  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF has_function_privilege(r, fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'DEBUG-840 Test 4 FAIL: % can EXECUTE the prune', r;
    END IF;
    IF has_table_privilege(r, 'public.subscription_events', 'DELETE, TRUNCATE') THEN
      RAISE EXCEPTION 'DEBUG-840 Test 4 FAIL: % can DELETE or TRUNCATE subscription_events', r;
    END IF;
  END LOOP;

  -- Behavioural: an authenticated caller is refused at the door, before any DELETE runs.
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM public.run_subscription_events_retention_prune();
    v_state := 'none';
  EXCEPTION WHEN OTHERS THEN
    v_state := SQLSTATE;
  END;
  RESET ROLE;
  IF v_state <> '42501' THEN
    RAISE EXCEPTION 'DEBUG-840 Test 4 FAIL: authenticated calling the prune gave SQLSTATE % (want 42501)', v_state;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job
                  WHERE jobname = 'subscription-events-retention-prune'
                    AND schedule = '40 3 * * *'
                    AND command ILIKE '%run_subscription_events_retention_prune()%') THEN
    RAISE EXCEPTION 'DEBUG-840 Test 4 FAIL: subscription-events-retention-prune is not scheduled at 40 3 * * *';
  END IF;
  -- Its own job, never folded into the analytics prune: one heartbeat per table.
  IF EXISTS (SELECT 1 FROM cron.job
              WHERE jobname <> 'subscription-events-retention-prune'
                AND command ILIKE '%subscription_events%') THEN
    RAISE EXCEPTION 'DEBUG-840 Test 4 FAIL: another cron job touches subscription_events';
  END IF;

  -- Comments stripped: the handler's own warning names the keyword it forbids.
  src := regexp_replace(pg_get_functiondef(fn), '--[^\n]*', '', 'g');
  IF position('EXCEPTION WHEN OTHERS' IN src) = 0 THEN
    RAISE EXCEPTION 'DEBUG-840 Test 4 FAIL: the prune has no EXCEPTION WHEN OTHERS handler';
  END IF;
  IF substring(src FROM position('EXCEPTION WHEN OTHERS' IN src)) ~* '\mRAISE\M' THEN
    RAISE EXCEPTION 'DEBUG-840 Test 4 FAIL: the prune''s exception handler re-raises';
  END IF;

  RAISE NOTICE 'DEBUG-840 Test 4 PASS: definer with pinned path, client roles locked out, own job at 03:40, non-raising handler.';
END $$;

-- The repo-wide sweeps enumerate pg_proc themselves; they must still pass with the new function.
\ir debug440_rpc_execute_sweep.sql
\ir debug455_search_path_pin_sweep.sql

SELECT 'ALL DEBUG-840 RETENTION TESTS PASSED' AS result;
