-- INFRA-870 — the auth-session IP scrub watchdog (20261024000100): when it pages, when it stays
-- quiet, what it sends, that it reads no session value and writes nothing, and its posture.
--
-- Each send is read as the pg_net queue delta its own call produced, filtered by a sentinel
-- Resend key, so pg_cron firings on the local stack cannot move the count. The job-missing
-- breach is not exercised: these suites never change cron.job. Test 6 pins that the job exists.
--
-- ci.yml's `Supabase SQL suites` job runs this on every PR against a freshly reset local stack
-- (INFRA-782). LOCAL ONLY otherwise:
--   supabase start && supabase db reset
--   psql ... -v ON_ERROR_STOP=1 -f supabase/tests/infra870_auth_session_ip_scrub_watchdog.sql
--
-- Do NOT run against the shared prod project (yliycxslzdsgjtpxggtf). The guard below refuses a
-- database that holds Vault secrets or an auth.users row older than a day. Every write sits inside
-- one transaction that ends in ROLLBACK, including the planted Vault secrets: pg_net only sends
-- committed queue rows, so nothing reaches Resend. Addresses are from the documentation range
-- (203.0.113.0/24) and the mail addresses are .invalid.

\set ON_ERROR_STOP on

-- ============ Guard: a fresh local reset, or nothing runs
DO $$
DECLARE
  v_n integer;
BEGIN
  SELECT count(*) INTO v_n FROM vault.secrets;
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'INFRA-870 guard: vault.secrets holds % row(s); this is not a fresh local reset', v_n;
  END IF;
  SELECT count(*) INTO v_n FROM auth.users WHERE created_at < now() - interval '1 day';
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'INFRA-870 guard: % auth.users row(s) are older than a day; this is not a fresh local reset', v_n;
  END IF;
END $$;

BEGIN;

-- One principal for every fixture session.
INSERT INTO auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
VALUES ('87087087-8708-4870-8870-87087087a001', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', true, now(), now());

CREATE FUNCTION pg_temp.i870_sent() RETURNS integer LANGUAGE sql AS $$
  SELECT count(*)::integer FROM net.http_request_queue
   WHERE url = 'https://api.resend.com/emails'
     AND headers->>'Authorization' = 'Bearer i870-sentinel-not-a-key';
$$;

-- Every Resend send, whatever its key: with Vault empty outside this transaction, no other
-- writer can enqueue one, so this isolates the missing-secret cases where the key is absent.
CREATE FUNCTION pg_temp.i870_resend_rows() RETURNS integer LANGUAGE sql AS $$
  SELECT count(*)::integer FROM net.http_request_queue WHERE url = 'https://api.resend.com/emails';
$$;

CREATE FUNCTION pg_temp.i870_plant(p_key boolean, p_from boolean, p_to boolean) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF p_key  THEN PERFORM vault.create_secret('i870-sentinel-not-a-key', 'subscription_alert_resend_key'); END IF;
  IF p_from THEN PERFORM vault.create_secret('watchdog-i870@sentinel.invalid', 'subscription_alert_from'); END IF;
  IF p_to   THEN PERFORM vault.create_secret('founder-i870@sentinel.invalid', 'subscription_alert_to'); END IF;
END $$;

CREATE FUNCTION pg_temp.i870_run() RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  v_before integer := pg_temp.i870_sent();
BEGIN
  PERFORM public.auth_session_ip_scrub_watchdog();
  RETURN pg_temp.i870_sent() - v_before;
END $$;

-- The body of the most recent sentinel send.
CREATE FUNCTION pg_temp.i870_last_body() RETURNS jsonb LANGUAGE sql AS $$
  SELECT convert_from(body, 'UTF8')::jsonb FROM net.http_request_queue
   WHERE headers->>'Authorization' = 'Bearer i870-sentinel-not-a-key'
   ORDER BY id DESC LIMIT 1;
$$;

-- Reset to a known state: no sessions, no scrub heartbeats, all three secrets.
CREATE FUNCTION pg_temp.i870_clean() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM auth.sessions;
  DELETE FROM public.retention_prune_runs WHERE job_name = 'auth-session-ip-scrub';
  DELETE FROM vault.secrets WHERE name LIKE 'subscription_alert_%';
  PERFORM pg_temp.i870_plant(true, true, true);
END $$;

CREATE FUNCTION pg_temp.i870_heartbeat(p_age interval, p_status text) RETURNS void LANGUAGE sql AS $$
  INSERT INTO public.retention_prune_runs (ran_at, job_name, status, rows_deleted, duration_ms, detail)
  VALUES (now() - p_age, 'auth-session-ip-scrub', p_status, 0, 1, 'remaining=0')
$$;

-- A session whose three timestamps all sit p_age in the past.
CREATE FUNCTION pg_temp.i870_session(p_n integer, p_age interval, p_ip inet, p_ua text) RETURNS void
LANGUAGE sql AS $$
  INSERT INTO auth.sessions (id, user_id, created_at, updated_at, refreshed_at, aal, ip, user_agent)
  VALUES (('87087087-8708-4870-8870-8708708700' || lpad(p_n::text, 2, '0'))::uuid,
          '87087087-8708-4870-8870-87087087a001',
          now() - p_age, now() - p_age, (now() - p_age) AT TIME ZONE 'UTC', 'aal1', p_ip, p_ua)
$$;

-- ============ Test 1: healthy — a recent ok run and only fresh values
SAVEPOINT t1;
DO $$
DECLARE
  h jsonb;
BEGIN
  PERFORM pg_temp.i870_clean();
  PERFORM pg_temp.i870_heartbeat(interval '30 minutes', 'ok');
  PERFORM pg_temp.i870_session(1, interval '30 minutes', '203.0.113.7', 'i870-agent CFNetwork/1');
  PERFORM pg_temp.i870_session(2, interval '2 days', NULL, NULL);

  h := public.auth_session_ip_scrub_health();
  IF (h->>'breach')::boolean OR jsonb_array_length(h->'reasons') <> 0 THEN
    RAISE EXCEPTION 'INFRA-870 Test 1 FAIL: healthy state reports a breach: %', h;
  END IF;
  IF NOT (h->>'job_active')::boolean OR (h->>'hours_since_last_ok')::integer <> 0
     OR h->>'latest_status' <> 'ok' OR (h->>'populated_past_interval')::integer <> 0 THEN
    RAISE EXCEPTION 'INFRA-870 Test 1 FAIL: unexpected health fields: %', h;
  END IF;
  IF (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(h) k)
     <> ARRAY['breach', 'hours_since_last_ok', 'job_active', 'latest_status', 'populated_past_interval', 'reasons'] THEN
    RAISE EXCEPTION 'INFRA-870 Test 1 FAIL: health keys are %', (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(h) k);
  END IF;
  IF pg_temp.i870_run() <> 0 THEN
    RAISE EXCEPTION 'INFRA-870 Test 1 FAIL: the watchdog sent an email in a healthy state';
  END IF;
  RAISE NOTICE 'INFRA-870 Test 1 PASS: a recent ok run and fresh values are healthy and send nothing.';
END $$;
ROLLBACK TO SAVEPOINT t1;

-- ============ Test 2: stalled — the 3h window, an empty history, and a lone error
SAVEPOINT t2;
DO $$
DECLARE
  h    jsonb;
  body jsonb;
BEGIN
  -- Just inside the window: quiet.
  PERFORM pg_temp.i870_clean();
  PERFORM pg_temp.i870_heartbeat(interval '2 hours 59 minutes', 'ok');
  IF (public.auth_session_ip_scrub_health()->>'breach')::boolean OR pg_temp.i870_run() <> 0 THEN
    RAISE EXCEPTION 'INFRA-870 Test 2 FAIL: an ok run 2h59m ago paged';
  END IF;

  -- A 4h-old ok run: pages, for that reason only.
  PERFORM pg_temp.i870_clean();
  PERFORM pg_temp.i870_heartbeat(interval '4 hours', 'ok');
  h := public.auth_session_ip_scrub_health();
  IF NOT (h->>'breach')::boolean OR h->'reasons' <> '["no_ok_run_within_3h"]'::jsonb
     OR (h->>'hours_since_last_ok')::integer <> 4 THEN
    RAISE EXCEPTION 'INFRA-870 Test 2 FAIL: a 4h-old ok run gave %', h;
  END IF;
  IF pg_temp.i870_run() <> 1 THEN
    RAISE EXCEPTION 'INFRA-870 Test 2 FAIL: a 4h-old ok run did not send exactly one email';
  END IF;
  body := pg_temp.i870_last_body();
  IF (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(body) k) <> ARRAY['from', 'subject', 'text', 'to'] THEN
    RAISE EXCEPTION 'INFRA-870 Test 2 FAIL: payload keys are %', (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(body) k);
  END IF;
  IF body->>'from' <> 'watchdog-i870@sentinel.invalid' OR body->>'to' <> 'founder-i870@sentinel.invalid' THEN
    RAISE EXCEPTION 'INFRA-870 Test 2 FAIL: from/to are not the Vault values: %', body;
  END IF;
  IF body->>'subject' NOT LIKE '%WATCHDOG%auth-session IP scrub%' THEN
    RAISE EXCEPTION 'INFRA-870 Test 2 FAIL: subject is %', body->>'subject';
  END IF;
  IF body->>'text' NOT LIKE '%no_ok_run_within_3h%' OR body->>'text' NOT LIKE '%Hours since last ok run: 4.%' THEN
    RAISE EXCEPTION 'INFRA-870 Test 2 FAIL: text does not report the reason and age: %', body->>'text';
  END IF;

  -- No heartbeat ever: pages, and says never/none.
  PERFORM pg_temp.i870_clean();
  h := public.auth_session_ip_scrub_health();
  IF NOT (h->>'breach')::boolean OR h->'hours_since_last_ok' <> 'null'::jsonb OR h->'latest_status' <> 'null'::jsonb THEN
    RAISE EXCEPTION 'INFRA-870 Test 2 FAIL: an empty history gave %', h;
  END IF;
  IF pg_temp.i870_run() <> 1 THEN
    RAISE EXCEPTION 'INFRA-870 Test 2 FAIL: an empty history did not send exactly one email';
  END IF;
  body := pg_temp.i870_last_body();
  IF body->>'text' NOT LIKE '%Hours since last ok run: never.%' OR body->>'text' NOT LIKE '%Latest run status: none.%' THEN
    RAISE EXCEPTION 'INFRA-870 Test 2 FAIL: empty-history text is %', body->>'text';
  END IF;

  -- A lone error after a recent ok run does not page.
  PERFORM pg_temp.i870_clean();
  PERFORM pg_temp.i870_heartbeat(interval '1 hour', 'ok');
  PERFORM pg_temp.i870_heartbeat(interval '5 minutes', 'error');
  h := public.auth_session_ip_scrub_health();
  IF (h->>'breach')::boolean OR h->>'latest_status' <> 'error' OR pg_temp.i870_run() <> 0 THEN
    RAISE EXCEPTION 'INFRA-870 Test 2 FAIL: a lone error after a recent ok paged: %', h;
  END IF;
  RAISE NOTICE 'INFRA-870 Test 2 PASS: 2h59m quiet, 4h pages, never-ran pages, a lone error does not.';
END $$;
ROLLBACK TO SAVEPOINT t2;

-- ============ Test 3: a populated value past the interval pages despite a fresh ok run
SAVEPOINT t3;
DO $$
DECLARE
  h        jsonb;
  before   jsonb;
  after    jsonb;
  runs_pre integer;
BEGIN
  PERFORM pg_temp.i870_clean();
  PERFORM pg_temp.i870_heartbeat(interval '10 minutes', 'ok');
  -- Created long ago but refreshed recently: activity is the latest timestamp, so not stale.
  INSERT INTO auth.sessions (id, user_id, created_at, updated_at, refreshed_at, aal, ip, user_agent)
  VALUES ('87087087-8708-4870-8870-870870870010', '87087087-8708-4870-8870-87087087a001',
          now() - interval '2 days', now() - interval '2 days', (now() - interval '1 hour') AT TIME ZONE 'UTC',
          'aal1', '203.0.113.10', NULL);
  h := public.auth_session_ip_scrub_health();
  IF (h->>'breach')::boolean THEN
    RAISE EXCEPTION 'INFRA-870 Test 3 FAIL: a session refreshed 1h ago counted as stale: %', h;
  END IF;

  -- Stale: one with an IP only, one with a user agent only.
  PERFORM pg_temp.i870_session(11, interval '4 hours', '203.0.113.11', NULL);
  PERFORM pg_temp.i870_session(12, interval '4 hours', NULL, 'i870-agent CFNetwork/1');
  h := public.auth_session_ip_scrub_health();
  IF NOT (h->>'breach')::boolean OR h->'reasons' <> '["populated_past_interval"]'::jsonb
     OR (h->>'populated_past_interval')::integer <> 2 THEN
    RAISE EXCEPTION 'INFRA-870 Test 3 FAIL: two stale populated sessions gave %', h;
  END IF;

  -- Strictly read-only: the watchdog moves no session column and writes no heartbeat.
  SELECT jsonb_agg(to_jsonb(s) ORDER BY s.id) INTO before FROM auth.sessions s;
  SELECT count(*) INTO runs_pre FROM public.retention_prune_runs;
  IF pg_temp.i870_run() <> 1 THEN
    RAISE EXCEPTION 'INFRA-870 Test 3 FAIL: stale populated sessions did not send exactly one email';
  END IF;
  SELECT jsonb_agg(to_jsonb(s) ORDER BY s.id) INTO after FROM auth.sessions s;
  IF before IS DISTINCT FROM after THEN
    RAISE EXCEPTION 'INFRA-870 Test 3 FAIL: the watchdog changed auth.sessions';
  END IF;
  IF (SELECT count(*) FROM public.retention_prune_runs) <> runs_pre THEN
    RAISE EXCEPTION 'INFRA-870 Test 3 FAIL: the watchdog wrote a heartbeat';
  END IF;
  IF pg_temp.i870_last_body()->>'text' NOT LIKE '%3h past their last activity: 2.%' THEN
    RAISE EXCEPTION 'INFRA-870 Test 3 FAIL: text does not report the count: %', pg_temp.i870_last_body()->>'text';
  END IF;
  RAISE NOTICE 'INFRA-870 Test 3 PASS: stale values page with a fresh ok run; the watchdog writes nothing.';
END $$;
ROLLBACK TO SAVEPOINT t3;

-- ============ Test 4: missing Vault secrets take the WARNING path
-- PL/pgSQL cannot catch a WARNING, so this is asserted by behaviour: in a breaching state, each
-- partial set and the empty set return normally and enqueue nothing. Tests 2 and 3 are the
-- positive control: the same states with all three secrets enqueue one email.
SAVEPOINT t4;
DO $$
DECLARE
  v_case   record;
  v_before integer;
BEGIN
  FOR v_case IN
    SELECT * FROM (VALUES
      ('no key',     false, true,  true),
      ('no from',    true,  false, true),
      ('no to',      true,  true,  false),
      ('no secrets', false, false, false)
    ) AS c(label, p_key, p_from, p_to)
  LOOP
    PERFORM pg_temp.i870_clean();
    DELETE FROM vault.secrets WHERE name LIKE 'subscription_alert_%';
    PERFORM pg_temp.i870_plant(v_case.p_key, v_case.p_from, v_case.p_to);
    v_before := pg_temp.i870_resend_rows();
    PERFORM public.auth_session_ip_scrub_watchdog();
    IF pg_temp.i870_resend_rows() <> v_before THEN
      RAISE EXCEPTION 'INFRA-870 Test 4 FAIL (%): an email was enqueued with a secret missing', v_case.label;
    END IF;
  END LOOP;
  RAISE NOTICE 'INFRA-870 Test 4 PASS: any missing secret returns normally and sends nothing.';
END $$;
ROLLBACK TO SAVEPOINT t4;

-- ============ Test 5: no session value or identifier leaves the database
-- Every reason fires at once, against sessions carrying an IP, a user agent and a uuid.
SAVEPOINT t5;
DO $$
DECLARE
  v_text text;
BEGIN
  PERFORM pg_temp.i870_clean();
  PERFORM pg_temp.i870_heartbeat(interval '5 hours', 'error');
  PERFORM pg_temp.i870_session(21, interval '6 hours', '203.0.113.21', 'i870-agent CFNetwork/1');
  IF pg_temp.i870_run() <> 1 THEN
    RAISE EXCEPTION 'INFRA-870 Test 5 FAIL: the breaching state did not send exactly one email';
  END IF;
  v_text := public.auth_session_ip_scrub_health()::text || ' ' || pg_temp.i870_last_body()::text;
  IF v_text ~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' THEN
    RAISE EXCEPTION 'INFRA-870 Test 5 FAIL: a uuid reached the health result or the email';
  END IF;
  IF v_text ~ '\m\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\M' OR v_text LIKE '%203.0.113%' THEN
    RAISE EXCEPTION 'INFRA-870 Test 5 FAIL: an IP address reached the health result or the email';
  END IF;
  IF v_text ILIKE '%i870-agent%' OR v_text ILIKE '%CFNetwork%' THEN
    RAISE EXCEPTION 'INFRA-870 Test 5 FAIL: a user agent reached the health result or the email';
  END IF;
  RAISE NOTICE 'INFRA-870 Test 5 PASS: no uuid, IP address or user agent in the result or the email.';
END $$;
ROLLBACK TO SAVEPOINT t5;

-- ============ Test 6: posture — the job, the definer, the grants (read-only)
DO $$
DECLARE
  wd      constant regprocedure := 'public.auth_session_ip_scrub_watchdog()'::regprocedure;
  hl      constant regprocedure := 'public.auth_session_ip_scrub_health()'::regprocedure;
  j       cron.job%ROWTYPE;
  r       text;
  v_state text;
BEGIN
  SELECT * INTO j FROM cron.job WHERE jobname = 'auth-session-ip-scrub-watchdog';
  IF NOT FOUND THEN RAISE EXCEPTION 'INFRA-870 Test 6 FAIL: auth-session-ip-scrub-watchdog is not scheduled'; END IF;
  IF NOT j.active OR j.schedule <> '10 */3 * * *' OR j.username <> 'postgres' THEN
    RAISE EXCEPTION 'INFRA-870 Test 6 FAIL: job is active=% schedule=% username=%', j.active, j.schedule, j.username;
  END IF;
  IF j.command NOT LIKE '%public.auth_session_ip_scrub_watchdog()%' OR j.command NOT LIKE '%statement_timeout%' THEN
    RAISE EXCEPTION 'INFRA-870 Test 6 FAIL: the job command is %', j.command;
  END IF;
  IF j.command ILIKE '%auth.sessions%' OR j.command ILIKE '%run_auth_session_ip_scrub%' THEN
    RAISE EXCEPTION 'INFRA-870 Test 6 FAIL: the job command names the scrub or auth.sessions: %', j.command;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auth-session-ip-scrub' AND active) THEN
    RAISE EXCEPTION 'INFRA-870 Test 6 FAIL: the scrub it watches is not scheduled';
  END IF;

  IF NOT (SELECT prosecdef FROM pg_proc WHERE oid = wd) THEN
    RAISE EXCEPTION 'INFRA-870 Test 6 FAIL: the watchdog is not SECURITY DEFINER';
  END IF;
  IF (SELECT prosecdef FROM pg_proc WHERE oid = hl) OR (SELECT provolatile FROM pg_proc WHERE oid = hl) <> 's' THEN
    RAISE EXCEPTION 'INFRA-870 Test 6 FAIL: health() must be SECURITY INVOKER and STABLE';
  END IF;
  IF NOT ('search_path=public, pg_temp' = ANY (coalesce((SELECT proconfig FROM pg_proc WHERE oid = wd), '{}')))
     OR NOT ('search_path=public, pg_temp' = ANY (coalesce((SELECT proconfig FROM pg_proc WHERE oid = hl), '{}'))) THEN
    RAISE EXCEPTION 'INFRA-870 Test 6 FAIL: search_path is not pinned on both functions';
  END IF;
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF has_function_privilege(r, wd, 'EXECUTE') OR has_function_privilege(r, hl, 'EXECUTE') THEN
      RAISE EXCEPTION 'INFRA-870 Test 6 FAIL: % can EXECUTE a watchdog function', r;
    END IF;
  END LOOP;
  IF NOT has_function_privilege('postgres', wd, 'EXECUTE') THEN
    RAISE EXCEPTION 'INFRA-870 Test 6 FAIL: postgres cannot execute the watchdog';
  END IF;
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM public.auth_session_ip_scrub_watchdog();
    v_state := 'none';
  EXCEPTION WHEN OTHERS THEN
    v_state := SQLSTATE;
  END;
  RESET ROLE;
  IF v_state <> '42501' THEN
    RAISE EXCEPTION 'INFRA-870 Test 6 FAIL: authenticated calling the watchdog gave SQLSTATE % (want 42501)', v_state;
  END IF;
  RAISE NOTICE 'INFRA-870 Test 6 PASS: scheduled every 3h at :10 as postgres, definer pinned, clients denied.';
END $$;

ROLLBACK;

-- The repo-wide sweeps, so a local run of this file alone also proves the new definer function
-- is not client-callable and pins search_path.
\ir debug440_rpc_execute_sweep.sql
\ir debug455_search_path_pin_sweep.sql

\echo 'ALL INFRA-870 watchdog TESTS PASSED'
