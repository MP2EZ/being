-- INFRA-846 — webhook_replay_cache prune: the 14-day boundary, its heartbeat, the failure path,
-- and the job's posture and schedule.
--
-- Until 20261023000000 nothing deleted a webhook_replay_cache row. The window is 14 days
-- (compliance ruling): twice Pub/Sub's 7-day default retention, the longest a store can
-- redeliver a notification id the handler would still accept.
--
-- ci.yml's `Supabase SQL suites` job runs this on every PR against a freshly reset local
-- stack (INFRA-782). LOCAL ONLY otherwise:
--   supabase start && supabase db reset
--   psql ... -v ON_ERROR_STOP=1 -f supabase/tests/infra846_webhook_replay_cache_prune.sql
--
-- Do NOT run against the shared prod project. Every data test is one DO block rolled back by
-- a sentinel exception, including the forced-failure trigger in Test 2.

\set ON_ERROR_STOP on

-- ============ Test 1: the 14-day boundary on both sources, one ok heartbeat
DO $$
DECLARE
  v_n integer;
  r   public.retention_prune_runs%ROWTYPE;
BEGIN
  INSERT INTO public.webhook_replay_cache (source, notification_id, processed_at) VALUES
    ('apple',  'i846-old-apple',    now() - interval '15 days'),
    ('google', 'i846-old-google',   now() - interval '15 days'),
    ('apple',  'i846-young-apple',  now() - interval '13 days'),
    ('google', 'i846-young-google', now() - interval '13 days'),
    ('apple',  'i846-now-apple',    now());

  PERFORM public.run_webhook_replay_cache_prune();

  SELECT count(*) INTO v_n FROM public.webhook_replay_cache WHERE notification_id LIKE 'i846-old-%';
  IF v_n <> 0 THEN RAISE EXCEPTION 'INFRA-846 Test 1 FAIL: % rows older than 14 days survive', v_n; END IF;
  SELECT count(*) INTO v_n FROM public.webhook_replay_cache
   WHERE notification_id IN ('i846-young-apple', 'i846-young-google', 'i846-now-apple');
  IF v_n <> 3 THEN RAISE EXCEPTION 'INFRA-846 Test 1 FAIL: % rows inside 14 days survive (want 3)', v_n; END IF;

  SELECT count(*) INTO v_n FROM public.retention_prune_runs
   WHERE job_name = 'webhook-replay-cache-prune' AND ran_at = now();
  IF v_n <> 1 THEN RAISE EXCEPTION 'INFRA-846 Test 1 FAIL: % heartbeat rows for one run (want 1)', v_n; END IF;
  SELECT * INTO r FROM public.retention_prune_runs
   WHERE job_name = 'webhook-replay-cache-prune' AND ran_at = now();
  -- >= 2, not = 2: rows_deleted counts the whole table, and only ours are known here.
  IF r.status <> 'ok' OR r.rows_deleted IS NULL OR r.rows_deleted < 2 OR r.duration_ms IS NULL THEN
    RAISE EXCEPTION 'INFRA-846 Test 1 FAIL: heartbeat status % rows_deleted % duration_ms %',
      r.status, r.rows_deleted, r.duration_ms;
  END IF;

  RAISE NOTICE 'INFRA-846 Test 1 PASS: 15d deleted (apple and google), 13d and now kept, one ok heartbeat.';
  RAISE EXCEPTION 'I846_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'I846_ROLLBACK' THEN RAISE; END IF;
END $$;

-- ============ Test 2: a failing prune writes one error row and deletes nothing
-- The behavioural half of the no-RAISE guard (Test 3 is the static half): a re-raise in the
-- handler would roll back this error row with the failed DELETE (see 20260808000000).
DO $$
DECLARE
  v_n integer;
  r   public.retention_prune_runs%ROWTYPE;
BEGIN
  INSERT INTO public.webhook_replay_cache (source, notification_id, processed_at)
  VALUES ('apple', 'i846-old-forced', now() - interval '30 days');

  CREATE FUNCTION public.i846_refuse_delete() RETURNS trigger LANGUAGE plpgsql AS $f$
  BEGIN RAISE EXCEPTION 'i846 forced prune failure'; END $f$;
  CREATE TRIGGER i846_refuse_delete BEFORE DELETE ON public.webhook_replay_cache
    FOR EACH ROW EXECUTE FUNCTION public.i846_refuse_delete();

  PERFORM public.run_webhook_replay_cache_prune();

  SELECT count(*) INTO v_n FROM public.retention_prune_runs
   WHERE job_name = 'webhook-replay-cache-prune' AND ran_at = now();
  IF v_n <> 1 THEN RAISE EXCEPTION 'INFRA-846 Test 2 FAIL: % heartbeat rows for one failed run (want 1)', v_n; END IF;
  SELECT * INTO r FROM public.retention_prune_runs
   WHERE job_name = 'webhook-replay-cache-prune' AND ran_at = now();
  IF r.status <> 'error' OR r.sqlstate <> 'P0001' OR r.detail NOT LIKE '%i846 forced prune failure%' THEN
    RAISE EXCEPTION 'INFRA-846 Test 2 FAIL: heartbeat status % sqlstate % detail %', r.status, r.sqlstate, r.detail;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.webhook_replay_cache WHERE notification_id = 'i846-old-forced') THEN
    RAISE EXCEPTION 'INFRA-846 Test 2 FAIL: the failed run still deleted the row';
  END IF;

  RAISE NOTICE 'INFRA-846 Test 2 PASS: a failed run records one error row and deletes nothing.';
  RAISE EXCEPTION 'I846_ROLLBACK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM <> 'I846_ROLLBACK' THEN RAISE; END IF;
END $$;

-- ============ Test 3: posture, grants, the cron job, and a non-raising handler (read-only)
DO $$
DECLARE
  fn constant regprocedure := 'public.run_webhook_replay_cache_prune()'::regprocedure;
  p   pg_proc%ROWTYPE;
  src text;
  r   text;
  v_state text;
BEGIN
  SELECT * INTO p FROM pg_proc WHERE oid = fn;
  IF NOT p.prosecdef THEN
    RAISE EXCEPTION 'INFRA-846 Test 3 FAIL: the prune is not SECURITY DEFINER';
  END IF;
  IF p.proconfig IS NULL OR NOT ('search_path=public, pg_temp' = ANY (p.proconfig)) THEN
    RAISE EXCEPTION 'INFRA-846 Test 3 FAIL: the prune''s search_path is not pinned to public, pg_temp (%)', p.proconfig;
  END IF;

  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF has_function_privilege(r, fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'INFRA-846 Test 3 FAIL: % can EXECUTE the prune', r;
    END IF;
  END LOOP;
  -- The prune runs as its owner; it must not have widened the edge functions' role.
  IF has_table_privilege('service_role', 'public.webhook_replay_cache', 'DELETE') THEN
    RAISE EXCEPTION 'INFRA-846 Test 3 FAIL: service_role holds DELETE on webhook_replay_cache';
  END IF;

  -- Behavioural: an authenticated caller is refused at the door, before any DELETE runs.
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM public.run_webhook_replay_cache_prune();
    v_state := 'none';
  EXCEPTION WHEN OTHERS THEN
    v_state := SQLSTATE;
  END;
  RESET ROLE;
  IF v_state <> '42501' THEN
    RAISE EXCEPTION 'INFRA-846 Test 3 FAIL: authenticated calling the prune gave SQLSTATE % (want 42501)', v_state;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job
                  WHERE jobname = 'webhook-replay-cache-prune'
                    AND schedule = '35 3 * * *'
                    AND command ILIKE '%run_webhook_replay_cache_prune()%') THEN
    RAISE EXCEPTION 'INFRA-846 Test 3 FAIL: webhook-replay-cache-prune is not scheduled at 35 3 * * *';
  END IF;
  -- Its own job, never folded into another prune: one heartbeat per table.
  IF EXISTS (SELECT 1 FROM cron.job
              WHERE jobname <> 'webhook-replay-cache-prune'
                AND (command ILIKE '%webhook_replay_cache%' OR command ILIKE '%run_webhook_replay_cache_prune%')) THEN
    RAISE EXCEPTION 'INFRA-846 Test 3 FAIL: another cron job touches webhook_replay_cache';
  END IF;

  -- Comments stripped: the handler's own warning names the keyword it forbids.
  src := regexp_replace(pg_get_functiondef(fn), '--[^\n]*', '', 'g');
  IF position('EXCEPTION WHEN OTHERS' IN src) = 0 THEN
    RAISE EXCEPTION 'INFRA-846 Test 3 FAIL: the prune has no EXCEPTION WHEN OTHERS handler';
  END IF;
  IF substring(src FROM position('EXCEPTION WHEN OTHERS' IN src)) ~* '\mRAISE\M' THEN
    RAISE EXCEPTION 'INFRA-846 Test 3 FAIL: the prune''s exception handler re-raises';
  END IF;

  RAISE NOTICE 'INFRA-846 Test 3 PASS: definer with pinned path, client roles locked out, service_role not widened, own job at 03:35, non-raising handler.';
END $$;

-- The repo-wide sweeps enumerate pg_proc themselves; they must still pass with the new function.
\ir debug440_rpc_execute_sweep.sql
\ir debug455_search_path_pin_sweep.sql

SELECT 'ALL INFRA-846 REPLAY-CACHE PRUNE TESTS PASSED' AS result;
