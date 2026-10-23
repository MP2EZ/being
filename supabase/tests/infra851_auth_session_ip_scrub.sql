-- INFRA-851 — the hourly auth.sessions IP / user-agent scrub: what it nulls, what it must never
-- touch, its heartbeat, its failure path, and its posture.
--
-- ci.yml's `Supabase SQL suites` job runs this on every PR against a freshly reset local
-- stack (INFRA-782). LOCAL ONLY otherwise:
--   supabase start && supabase db reset
--   psql ... -v ON_ERROR_STOP=1 -f supabase/tests/infra851_auth_session_ip_scrub.sql
--
-- Do NOT run against the shared prod project. Every data test is one DO block rolled back by
-- a sentinel exception; the fixture principals exist only inside those blocks. Addresses are
-- from the documentation range (203.0.113.0/24). The helpers are pg_temp functions.

\set ON_ERROR_STOP on

CREATE FUNCTION pg_temp.i851_user(p_id uuid) RETURNS void
LANGUAGE sql AS $$
  INSERT INTO auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
  VALUES (p_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          true, now() - interval '3 days', now() - interval '3 days')
$$;

-- A session in the shape GoTrue leaves it, aged so a timestamp the scrub touched would show.
CREATE FUNCTION pg_temp.i851_session(p_id uuid, p_user uuid, p_ip inet, p_ua text) RETURNS void
LANGUAGE sql AS $$
  INSERT INTO auth.sessions (id, user_id, created_at, updated_at, refreshed_at, aal, ip, user_agent)
  VALUES (p_id, p_user, now() - interval '2 days', now() - interval '2 days',
          (now() - interval '2 hours') AT TIME ZONE 'UTC', 'aal1', p_ip, p_ua)
$$;

-- Everything on a session row except the two scrubbed columns.
CREATE FUNCTION pg_temp.i851_rest(p_id uuid) RETURNS jsonb
LANGUAGE sql AS $$
  SELECT to_jsonb(s) - 'ip' - 'user_agent' FROM auth.sessions s WHERE s.id = p_id
$$;

CREATE FUNCTION pg_temp.i851_heartbeats() RETURNS SETOF public.retention_prune_runs
LANGUAGE sql AS $$
  SELECT * FROM public.retention_prune_runs
   WHERE job_name = 'auth-session-ip-scrub' AND ran_at = now() ORDER BY id
$$;

-- ============ Test 1: every populated column is nulled; nothing else on the row moves
DO $$
DECLARE
  u      constant uuid := '85185185-8518-4518-8518-85185185a001';
  s_both constant uuid := '85185185-8518-4518-8518-85185185b001';
  s_ip   constant uuid := '85185185-8518-4518-8518-85185185b002';
  s_ua   constant uuid := '85185185-8518-4518-8518-85185185b003';
  s_none constant uuid := '85185185-8518-4518-8518-85185185b004';
  ua     constant text := 'Being/42 CFNetwork/3826.500.111 Darwin/25.0.0';
  ids    constant uuid[] := ARRAY[s_both, s_ip, s_ua, s_none];
  before jsonb;
  after  jsonb;
  r      public.retention_prune_runs%ROWTYPE;
  v_n    integer;
BEGIN
  PERFORM pg_temp.i851_user(u);
  PERFORM pg_temp.i851_session(s_both, u, '203.0.113.7', ua);
  PERFORM pg_temp.i851_session(s_ip,   u, '203.0.113.8', NULL);
  PERFORM pg_temp.i851_session(s_ua,   u, NULL, ua);
  PERFORM pg_temp.i851_session(s_none, u, NULL, NULL);
  SELECT jsonb_object_agg(i, pg_temp.i851_rest(i)) INTO before FROM unnest(ids) i;

  PERFORM public.run_auth_session_ip_scrub();

  IF EXISTS (SELECT 1 FROM auth.sessions WHERE id = ANY (ids) AND (ip IS NOT NULL OR user_agent IS NOT NULL)) THEN
    RAISE EXCEPTION 'INFRA-851 Test 1 FAIL: a seeded session still carries an ip or user_agent';
  END IF;
  SELECT jsonb_object_agg(i, pg_temp.i851_rest(i)) INTO after FROM unnest(ids) i;
  IF after IS DISTINCT FROM before THEN
    RAISE EXCEPTION 'INFRA-851 Test 1 FAIL: the scrub changed another column. before % after %', before, after;
  END IF;
  -- Named explicitly: these are what orphaned_identity_candidates() reads as last activity.
  IF EXISTS (SELECT 1 FROM auth.sessions
              WHERE id = ANY (ids)
                AND (updated_at > now() - interval '1 day'
                     OR created_at > now() - interval '1 day'
                     OR refreshed_at > (now() - interval '1 hour') AT TIME ZONE 'UTC')) THEN
    RAISE EXCEPTION 'INFRA-851 Test 1 FAIL: the scrub moved created_at, updated_at or refreshed_at';
  END IF;

  SELECT count(*) INTO v_n FROM pg_temp.i851_heartbeats();
  IF v_n <> 1 THEN RAISE EXCEPTION 'INFRA-851 Test 1 FAIL: % heartbeats for one run (want 1)', v_n; END IF;
  SELECT * INTO r FROM pg_temp.i851_heartbeats();
  -- coalesce: a NULL column would make each comparison NULL and the IF pass.
  IF r.status IS DISTINCT FROM 'ok' OR coalesce(r.rows_deleted, -1) < 3
     OR coalesce(r.detail, '') !~ '^remaining=\d+$' THEN
    RAISE EXCEPTION 'INFRA-851 Test 1 FAIL: heartbeat status % rows_deleted % detail %', r.status, r.rows_deleted, r.detail;
  END IF;

  RAISE NOTICE 'INFRA-851 Test 1 PASS: ip and user_agent nulled on every populated row; every other column, timestamps included, unchanged; one ok heartbeat.';
  RAISE EXCEPTION 'I851_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'I851_ROLLBACK' THEN RAISE; END IF;
END $$;

-- ============ Test 2: a run with nothing to scrub still proves the job is alive
DO $$
DECLARE
  u constant uuid := '85185185-8518-4518-8518-85185185a002';
  r public.retention_prune_runs%ROWTYPE;
BEGIN
  PERFORM pg_temp.i851_user(u);
  PERFORM pg_temp.i851_session('85185185-8518-4518-8518-85185185b021', u, '203.0.113.21', 'Being/42');

  PERFORM public.run_auth_session_ip_scrub();
  PERFORM public.run_auth_session_ip_scrub();

  IF (SELECT count(*) FROM pg_temp.i851_heartbeats()) <> 2 THEN
    RAISE EXCEPTION 'INFRA-851 Test 2 FAIL: two runs did not write two heartbeats';
  END IF;
  SELECT * INTO r FROM pg_temp.i851_heartbeats() OFFSET 1;
  IF r.status IS DISTINCT FROM 'ok' OR r.rows_deleted IS DISTINCT FROM 0
     OR r.detail IS DISTINCT FROM 'remaining=0' THEN
    RAISE EXCEPTION 'INFRA-851 Test 2 FAIL: second run status % rows_deleted % detail %', r.status, r.rows_deleted, r.detail;
  END IF;

  RAISE NOTICE 'INFRA-851 Test 2 PASS: a second run scrubs nothing and still writes an ok heartbeat.';
  RAISE EXCEPTION 'I851_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'I851_ROLLBACK' THEN RAISE; END IF;
END $$;

-- ============ Test 3: a failing run records SQLSTATE and a fixed reason, never the values
DO $$
DECLARE
  u constant uuid := '85185185-8518-4518-8518-85185185a003';
  s constant uuid := '85185185-8518-4518-8518-85185185b031';
  r public.retention_prune_runs%ROWTYPE;
BEGIN
  PERFORM pg_temp.i851_user(u);
  PERFORM pg_temp.i851_session(s, u, '203.0.113.31', 'Being/42 CFNetwork/i851');
  -- The forced error quotes the address and user agent, as a constraint or trigger message would.
  CREATE FUNCTION public.i851_refuse_update() RETURNS trigger LANGUAGE plpgsql AS $f$
  BEGIN RAISE EXCEPTION 'i851 forced failure on % %', OLD.ip, OLD.user_agent; END $f$;
  CREATE TRIGGER i851_refuse_update BEFORE UPDATE ON auth.sessions
    FOR EACH ROW EXECUTE FUNCTION public.i851_refuse_update();

  PERFORM public.run_auth_session_ip_scrub();

  IF NOT EXISTS (SELECT 1 FROM auth.sessions WHERE id = s AND ip IS NOT NULL AND user_agent IS NOT NULL) THEN
    RAISE EXCEPTION 'INFRA-851 Test 3 FAIL: the failed run still changed the session';
  END IF;
  SELECT * INTO r FROM pg_temp.i851_heartbeats();
  IF r.status IS DISTINCT FROM 'error' OR r.sqlstate IS DISTINCT FROM 'P0001'
     OR r.detail IS DISTINCT FROM 'auth-session-ip-scrub run failed' THEN
    RAISE EXCEPTION 'INFRA-851 Test 3 FAIL: error heartbeat status % sqlstate % detail %', r.status, r.sqlstate, r.detail;
  END IF;
  IF row_to_json(r)::text ~ '203\.0\.113|CFNetwork' THEN
    RAISE EXCEPTION 'INFRA-851 Test 3 FAIL: the error heartbeat quotes the address or user agent';
  END IF;

  RAISE NOTICE 'INFRA-851 Test 3 PASS: a failed run changes nothing and records SQLSTATE with a fixed reason, no value.';
  RAISE EXCEPTION 'I851_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'I851_ROLLBACK' THEN RAISE; END IF;
END $$;

-- ============ Test 4: posture — the job, the definer, the grants, the handler (read-only)
-- This is the test that fails if the job is missing.
DO $$
DECLARE
  fn constant regprocedure := 'public.run_auth_session_ip_scrub()'::regprocedure;
  r  text;
  src text;
  handler text;
  v_state text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job
                  WHERE jobname = 'auth-session-ip-scrub' AND schedule = '25 * * * *' AND active
                    AND command ILIKE '%run_auth_session_ip_scrub()%'
                    AND command ILIKE '%statement_timeout%') THEN
    RAISE EXCEPTION 'INFRA-851 Test 4 FAIL: auth-session-ip-scrub is not scheduled hourly at :25 with a statement_timeout';
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job
              WHERE jobname <> 'auth-session-ip-scrub'
                AND (command ILIKE '%auth.sessions%' OR command ILIKE '%run_auth_session_ip_scrub%')) THEN
    RAISE EXCEPTION 'INFRA-851 Test 4 FAIL: another cron job touches auth.sessions or calls the scrub';
  END IF;

  IF NOT (SELECT prosecdef FROM pg_proc WHERE oid = fn) THEN
    RAISE EXCEPTION 'INFRA-851 Test 4 FAIL: the scrub is not SECURITY DEFINER';
  END IF;
  IF NOT ('search_path=public, pg_temp' = ANY (coalesce((SELECT proconfig FROM pg_proc WHERE oid = fn), '{}')))
     OR NOT ('lock_timeout=1s' = ANY (coalesce((SELECT proconfig FROM pg_proc WHERE oid = fn), '{}'))) THEN
    RAISE EXCEPTION 'INFRA-851 Test 4 FAIL: the scrub does not pin search_path and lock_timeout (proconfig %)',
      (SELECT proconfig FROM pg_proc WHERE oid = fn);
  END IF;
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF has_function_privilege(r, fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'INFRA-851 Test 4 FAIL: % can EXECUTE the scrub', r;
    END IF;
  END LOOP;
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM public.run_auth_session_ip_scrub();
    v_state := 'none';
  EXCEPTION WHEN OTHERS THEN
    v_state := SQLSTATE;
  END;
  RESET ROLE;
  IF v_state <> '42501' THEN
    RAISE EXCEPTION 'INFRA-851 Test 4 FAIL: authenticated calling the scrub gave SQLSTATE % (want 42501)', v_state;
  END IF;

  -- Comments stripped: the function's own notes may name what it must not do.
  src := regexp_replace(pg_get_functiondef(fn), '--[^\n]*', '', 'g');
  IF src ~* '\m(created_at|updated_at|refreshed_at)\M' THEN
    RAISE EXCEPTION 'INFRA-851 Test 4 FAIL: the scrub names a session timestamp INFRA-848 reads';
  END IF;
  IF src !~* 'SET\s+ip\s*=\s*NULL\s*,\s*user_agent\s*=\s*NULL' OR src !~* 'FOR UPDATE SKIP LOCKED' THEN
    RAISE EXCEPTION 'INFRA-851 Test 4 FAIL: the scrub no longer nulls both columns under SKIP LOCKED';
  END IF;
  IF position('EXCEPTION WHEN OTHERS' IN src) = 0 THEN
    RAISE EXCEPTION 'INFRA-851 Test 4 FAIL: the scrub has no EXCEPTION WHEN OTHERS handler';
  END IF;
  handler := substring(src FROM position('EXCEPTION WHEN OTHERS' IN src));
  IF handler ~* '\mRAISE\M' THEN
    RAISE EXCEPTION 'INFRA-851 Test 4 FAIL: the scrub''s exception handler re-raises';
  END IF;
  IF handler ~* '\mSQLERRM\M' THEN
    RAISE EXCEPTION 'INFRA-851 Test 4 FAIL: the scrub''s exception handler records SQLERRM';
  END IF;

  -- Ruling (c), not (a): nothing of ours runs inside GoTrue's writes.
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'auth.sessions'::regclass AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'INFRA-851 Test 4 FAIL: auth.sessions carries a non-internal trigger';
  END IF;

  RAISE NOTICE 'INFRA-851 Test 4 PASS: hourly job at :25 with a statement_timeout, definer with pinned search_path and lock_timeout, every client and service_role locked out, no timestamp named, handler neither re-raises nor records SQLERRM, no trigger on auth.sessions.';
END $$;

-- The repo-wide sweeps enumerate pg_proc themselves; they must still pass with the new function.
\ir debug440_rpc_execute_sweep.sql
\ir debug455_search_path_pin_sweep.sql

SELECT 'ALL INFRA-851 AUTH-SESSION-IP-SCRUB TESTS PASSED' AS result;
