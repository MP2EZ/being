-- INFRA-828 — subscription_verification_watchdog() (20260618000000): when it escalates, when it
-- stays quiet, what it sends, and that it stays scheduled.
--
-- The watchdog is the dead-man's switch for grace-period-automation. Nothing pinned it: a
-- migration that changed its 26h window, dropped the error override, widened its payload or
-- unscheduled it would have shipped green. Each case reads the pg_net queue delta its own call
-- produced, filtered by a sentinel Resend key, so pg_cron firings on the local stack cannot
-- move the count.
--
-- ci.yml's `Supabase SQL suites` job runs this on every PR against a freshly reset local stack
-- (INFRA-782). LOCAL ONLY otherwise:
--   supabase start && supabase db reset
--   psql ... -v ON_ERROR_STOP=1 -f supabase/tests/infra828_subscription_watchdog.sql
--
-- Do NOT run against the shared prod project (yliycxslzdsgjtpxggtf). The guard below refuses a
-- database that holds Vault secrets or an auth.users row older than a day, which is what a real
-- project looks like. Every write sits inside one transaction that ends in ROLLBACK, including
-- the planted Vault secrets: pg_net only sends committed queue rows, so nothing reaches Resend.
-- The planted values are fake and the addresses are .invalid, a second barrier.

\set ON_ERROR_STOP on

-- ============ Guard: a fresh local reset, or nothing runs
DO $$
DECLARE
  v_n integer;
BEGIN
  SELECT count(*) INTO v_n FROM vault.secrets;
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'INFRA-828 guard: vault.secrets holds % row(s); this is not a fresh local reset', v_n;
  END IF;
  SELECT count(*) INTO v_n FROM auth.users WHERE created_at < now() - interval '1 day';
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'INFRA-828 guard: % auth.users row(s) are older than a day; this is not a fresh local reset', v_n;
  END IF;
END $$;

BEGIN;

-- Sentinel-filtered count of the watchdog's own sends. The key is fake, so a match can only be
-- a row this transaction enqueued.
CREATE FUNCTION pg_temp.i828_sent() RETURNS integer LANGUAGE sql AS $$
  SELECT count(*)::integer FROM net.http_request_queue
   WHERE url = 'https://api.resend.com/emails'
     AND headers->>'Authorization' = 'Bearer i828-sentinel-not-a-key';
$$;

-- Every Resend send, whatever its key. With Vault empty outside this transaction, no other
-- writer can enqueue one, so this isolates the missing-secret cases where the key is absent.
CREATE FUNCTION pg_temp.i828_resend_rows() RETURNS integer LANGUAGE sql AS $$
  SELECT count(*)::integer FROM net.http_request_queue WHERE url = 'https://api.resend.com/emails';
$$;

CREATE FUNCTION pg_temp.i828_plant(p_key boolean, p_from boolean, p_to boolean) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF p_key  THEN PERFORM vault.create_secret('i828-sentinel-not-a-key', 'subscription_alert_resend_key'); END IF;
  IF p_from THEN PERFORM vault.create_secret('watchdog-i828@sentinel.invalid', 'subscription_alert_from'); END IF;
  IF p_to   THEN PERFORM vault.create_secret('founder-i828@sentinel.invalid', 'subscription_alert_to'); END IF;
END $$;

-- Delta of sentinel sends produced by one watchdog call.
CREATE FUNCTION pg_temp.i828_run() RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  v_before integer := pg_temp.i828_sent();
BEGIN
  PERFORM public.subscription_verification_watchdog();
  RETURN pg_temp.i828_sent() - v_before;
END $$;

-- ============ Test 1: a fresh ok run sends nothing
SAVEPOINT t1;
DO $$
DECLARE
  v_delta integer;
BEGIN
  DELETE FROM public.grace_period_automation_runs;
  PERFORM pg_temp.i828_plant(true, true, true);
  INSERT INTO public.grace_period_automation_runs (ran_at, status) VALUES (now() - interval '1 hour', 'ok');
  v_delta := pg_temp.i828_run();
  IF v_delta <> 0 THEN RAISE EXCEPTION 'INFRA-828 watchdog Test 1 FAIL: a 1h-old ok run sent % email(s)', v_delta; END IF;
  RAISE NOTICE 'INFRA-828 watchdog Test 1 PASS: a fresh ok run sends nothing.';
END $$;
ROLLBACK TO SAVEPOINT t1;

-- ============ Test 2: the 26h boundary, and what an escalation sends
-- now() is the transaction start, so `exactly 26h` is exact: the window is `>=`.
SAVEPOINT t2;
DO $$
DECLARE
  v_delta integer;
  v_body  jsonb;
  v_keys  text[];
BEGIN
  DELETE FROM public.grace_period_automation_runs;
  PERFORM pg_temp.i828_plant(true, true, true);

  INSERT INTO public.grace_period_automation_runs (ran_at, status) VALUES (now() - interval '26 hours', 'ok');
  v_delta := pg_temp.i828_run();
  IF v_delta <> 0 THEN RAISE EXCEPTION 'INFRA-828 watchdog Test 2 FAIL: an ok run exactly 26h old sent % email(s)', v_delta; END IF;

  DELETE FROM public.grace_period_automation_runs;
  INSERT INTO public.grace_period_automation_runs (ran_at, status) VALUES (now() - interval '26 hours 1 second', 'ok');
  v_delta := pg_temp.i828_run();
  IF v_delta <> 1 THEN RAISE EXCEPTION 'INFRA-828 watchdog Test 2 FAIL: an ok run 26h+1s old sent % email(s) (want 1)', v_delta; END IF;

  SELECT convert_from(body, 'UTF8')::jsonb INTO v_body FROM net.http_request_queue
   WHERE url = 'https://api.resend.com/emails'
     AND headers->>'Authorization' = 'Bearer i828-sentinel-not-a-key'
   ORDER BY id DESC LIMIT 1;

  -- The payload boundary to Resend, a third-party processor: exactly these four keys, and no
  -- identifier in the text. A later edit that sends a user id or subscription data fails here.
  SELECT array_agg(k ORDER BY k) INTO v_keys FROM jsonb_object_keys(v_body) AS k;
  IF v_keys IS DISTINCT FROM ARRAY['from', 'subject', 'text', 'to'] THEN
    RAISE EXCEPTION 'INFRA-828 watchdog Test 2 FAIL: payload keys are % (want from, subject, text, to)', v_keys;
  END IF;
  IF v_body->>'from' <> 'watchdog-i828@sentinel.invalid' OR v_body->>'to' <> 'founder-i828@sentinel.invalid' THEN
    RAISE EXCEPTION 'INFRA-828 watchdog Test 2 FAIL: from/to are not the Vault values';
  END IF;
  IF v_body->>'subject' NOT LIKE '%WATCHDOG%' THEN
    RAISE EXCEPTION 'INFRA-828 watchdog Test 2 FAIL: subject % is not the watchdog subject', v_body->>'subject';
  END IF;
  IF v_body->>'text' ~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' THEN
    RAISE EXCEPTION 'INFRA-828 watchdog Test 2 FAIL: the email text carries a uuid';
  END IF;

  RAISE NOTICE 'INFRA-828 watchdog Test 2 PASS: 26h is quiet, 26h+1s escalates, payload is {from, subject, text, to} with no uuid.';
END $$;
ROLLBACK TO SAVEPOINT t2;

-- ============ Test 3: a latest error run overrides a recent ok
SAVEPOINT t3;
DO $$
DECLARE
  v_delta integer;
BEGIN
  DELETE FROM public.grace_period_automation_runs;
  PERFORM pg_temp.i828_plant(true, true, true);

  INSERT INTO public.grace_period_automation_runs (ran_at, status) VALUES
    (now() - interval '1 hour', 'ok'),
    (now() - interval '5 minutes', 'error');
  v_delta := pg_temp.i828_run();
  IF v_delta <> 1 THEN RAISE EXCEPTION 'INFRA-828 watchdog Test 3 FAIL: a latest error over a recent ok sent % email(s) (want 1)', v_delta; END IF;

  -- Control: the same two statuses in the other order. Only the LATEST run decides.
  DELETE FROM public.grace_period_automation_runs;
  INSERT INTO public.grace_period_automation_runs (ran_at, status) VALUES
    (now() - interval '2 hours', 'error'),
    (now() - interval '1 hour', 'ok');
  v_delta := pg_temp.i828_run();
  IF v_delta <> 0 THEN RAISE EXCEPTION 'INFRA-828 watchdog Test 3 FAIL: an older error under a newer ok sent % email(s)', v_delta; END IF;

  RAISE NOTICE 'INFRA-828 watchdog Test 3 PASS: the latest error escalates; an older error does not.';
END $$;
ROLLBACK TO SAVEPOINT t3;

-- ============ Test 4: an empty heartbeat table escalates
SAVEPOINT t4;
DO $$
DECLARE
  v_delta integer;
  v_text  text;
BEGIN
  DELETE FROM public.grace_period_automation_runs;
  PERFORM pg_temp.i828_plant(true, true, true);
  v_delta := pg_temp.i828_run();
  IF v_delta <> 1 THEN RAISE EXCEPTION 'INFRA-828 watchdog Test 4 FAIL: an empty table sent % email(s) (want 1)', v_delta; END IF;

  SELECT convert_from(body, 'UTF8')::jsonb->>'text' INTO v_text FROM net.http_request_queue
   WHERE url = 'https://api.resend.com/emails'
     AND headers->>'Authorization' = 'Bearer i828-sentinel-not-a-key'
   ORDER BY id DESC LIMIT 1;
  IF v_text NOT LIKE '%since never%' OR v_text NOT LIKE '%status: none%' THEN
    RAISE EXCEPTION 'INFRA-828 watchdog Test 4 FAIL: the empty-table email does not say never/none';
  END IF;

  RAISE NOTICE 'INFRA-828 watchdog Test 4 PASS: no run ever escalates, and the email says never/none.';
END $$;
ROLLBACK TO SAVEPOINT t4;

-- ============ Test 5: missing Vault secrets take the WARNING path
-- PL/pgSQL cannot catch a WARNING, so this is asserted by behaviour: in an escalating state,
-- each partial set and the empty set return normally and enqueue nothing. Test 4 is the
-- positive control: the same state with all three secrets enqueues one email.
SAVEPOINT t5;
DO $$
DECLARE
  v_case   record;
  v_before integer;
  v_after  integer;
BEGIN
  FOR v_case IN
    SELECT * FROM (VALUES
      ('no key',     false, true,  true),
      ('no from',    true,  false, true),
      ('no to',      true,  true,  false),
      ('no secrets', false, false, false)
    ) AS c(label, p_key, p_from, p_to)
  LOOP
    DELETE FROM public.grace_period_automation_runs;
    DELETE FROM vault.secrets WHERE name LIKE 'subscription_alert_%';
    PERFORM pg_temp.i828_plant(v_case.p_key, v_case.p_from, v_case.p_to);

    v_before := pg_temp.i828_resend_rows();
    PERFORM public.subscription_verification_watchdog();
    v_after := pg_temp.i828_resend_rows();
    IF v_after <> v_before THEN
      RAISE EXCEPTION 'INFRA-828 watchdog Test 5 FAIL (%): % email(s) enqueued with a secret missing',
        v_case.label, v_after - v_before;
    END IF;
  END LOOP;

  RAISE NOTICE 'INFRA-828 watchdog Test 5 PASS: any missing secret returns normally and sends nothing.';
END $$;
ROLLBACK TO SAVEPOINT t5;

-- ============ Test 6: the watchdog stays scheduled (read-only)
-- A migration that unschedules or deactivates it disables subscription monitoring silently.
DO $$
DECLARE
  r cron.job%ROWTYPE;
BEGIN
  SELECT * INTO r FROM cron.job WHERE jobname = 'subscription-verification-watchdog';
  IF NOT FOUND THEN RAISE EXCEPTION 'INFRA-828 watchdog Test 6 FAIL: subscription-verification-watchdog is not scheduled'; END IF;
  IF NOT r.active THEN RAISE EXCEPTION 'INFRA-828 watchdog Test 6 FAIL: subscription-verification-watchdog is inactive'; END IF;
  IF r.username <> 'postgres' THEN RAISE EXCEPTION 'INFRA-828 watchdog Test 6 FAIL: the job runs as %', r.username; END IF;
  IF r.command NOT LIKE '%public.subscription_verification_watchdog()%' THEN
    RAISE EXCEPTION 'INFRA-828 watchdog Test 6 FAIL: the job command does not call the watchdog: %', r.command;
  END IF;
  IF NOT has_function_privilege('postgres', 'public.subscription_verification_watchdog()', 'EXECUTE') THEN
    RAISE EXCEPTION 'INFRA-828 watchdog Test 6 FAIL: postgres cannot execute the watchdog';
  END IF;
  RAISE NOTICE 'INFRA-828 watchdog Test 6 PASS: scheduled, active, runs as postgres, calls the watchdog.';
END $$;

ROLLBACK;

\echo 'ALL INFRA-828 watchdog TESTS PASSED'
