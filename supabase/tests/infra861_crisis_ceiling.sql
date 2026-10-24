-- INFRA-861 crisis ingest ceiling suite — proves the daily, identifier-free ceiling on
-- crisis_detected inserts (SQLSTATE BE862) and the config table that holds it.
--
-- WHAT THIS EXISTS TO CATCH. Since the de-link the crisis sink takes unauthenticated
-- inserts, and forged rows can no longer be found and purged by user_id. The ceiling bounds
-- what one UTC day can write; it keys on nothing but the event type and the day. A held
-- ceiling only delays delivery (the client queue is durable and treats BE862 as final for
-- the flight), and the alerter pages from committed arrivals before it is reached.
--
-- HOW TO RUN (local stack; no remote/paid resources):
--   supabase start && supabase db reset            # applies all migrations
--   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
--     -v ON_ERROR_STOP=1 -X -f supabase/tests/infra861_crisis_ceiling.sql
--   # exit 0 + "ALL INFRA-861 CRISIS CEILING TESTS PASSED" = green.
--
-- Do NOT run against the shared project — it inserts rows and edits the config. Data tests
-- are rolled back.

\set ON_ERROR_STOP on

CREATE OR REPLACE FUNCTION _be862_insert_as_anon(n int) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('role', 'anon', true);
  PERFORM set_config('request.jwt.claims', '', true);
  INSERT INTO public.analytics_events (event_type, properties)
  SELECT 'crisis_detected', '{"trigger_type":"gad7_severe_score","severity_bucket":"high"}'::jsonb
  FROM generate_series(1, n);
  PERFORM set_config('role', 'none', true);
END $$;

-- ============ Test 1: the config table is operator-only ============
DO $$
DECLARE r text;
BEGIN
  IF (SELECT daily_ceiling FROM public.crisis_ingest_config WHERE id) IS DISTINCT FROM 500 THEN
    RAISE EXCEPTION 'FAIL(1): crisis_ingest_config is not seeded with daily_ceiling 500';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.crisis_ingest_config'::regclass) THEN
    RAISE EXCEPTION 'FAIL(1): RLS is off on crisis_ingest_config';
  END IF;
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF has_table_privilege(r, 'public.crisis_ingest_config', 'SELECT')
       OR has_table_privilege(r, 'public.crisis_ingest_config', 'INSERT')
       OR has_table_privilege(r, 'public.crisis_ingest_config', 'UPDATE')
       OR has_table_privilege(r, 'public.crisis_ingest_config', 'DELETE') THEN
      RAISE EXCEPTION 'FAIL(1): % holds a privilege on crisis_ingest_config', r;
    END IF;
  END LOOP;
  IF NOT has_table_privilege('service_role', 'public.crisis_ingest_config', 'UPDATE') THEN
    RAISE EXCEPTION 'FAIL(1): service_role cannot tune the ceiling';
  END IF;
  BEGIN
    UPDATE public.crisis_ingest_config SET daily_ceiling = 14 WHERE id;
    RAISE EXCEPTION 'FAIL(1): a ceiling below the spike floor (15) was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.crisis_ingest_config (id, daily_ceiling) VALUES (false, 100);
    RAISE EXCEPTION 'FAIL(1): a second config row was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  RAISE NOTICE 'PASS(1): one seeded row, RLS on, client roles locked out, floor 15 enforced';
END $$;

-- ============ Test 2: the ceiling admits up to N per UTC day and rejects past it ============
BEGIN;
  DELETE FROM public.analytics_events WHERE event_type = 'crisis_detected';
  UPDATE public.crisis_ingest_config SET daily_ceiling = 15 WHERE id;
  SELECT _be862_insert_as_anon(10);
  SELECT _be862_insert_as_anon(5);   -- exactly at the ceiling: admitted
  DO $$
  DECLARE got text;
  BEGIN
    BEGIN
      PERFORM _be862_insert_as_anon(1);
      RAISE EXCEPTION 'FAIL(2): the 16th crisis row of the day was admitted past a ceiling of 15';
    EXCEPTION WHEN SQLSTATE 'BE862' THEN
      GET STACKED DIAGNOSTICS got = MESSAGE_TEXT;
    END;
    IF got <> 'crisis ingest ceiling reached' THEN
      RAISE EXCEPTION 'FAIL(2): BE862 carried unexpected text: %', got;
    END IF;
    IF (SELECT count(*) FROM public.analytics_events WHERE event_type = 'crisis_detected') <> 15 THEN
      RAISE EXCEPTION 'FAIL(2): the rejected statement left rows behind';
    END IF;
    RAISE NOTICE 'PASS(2): 15 admitted, the 16th rejected with BE862 and rolled back';
  END $$;
ROLLBACK;

-- ============ Test 3: a statement that would cross the ceiling is rejected whole ============
BEGIN;
  DELETE FROM public.analytics_events WHERE event_type = 'crisis_detected';
  UPDATE public.crisis_ingest_config SET daily_ceiling = 15 WHERE id;
  SELECT _be862_insert_as_anon(10);
  DO $$
  BEGIN
    BEGIN
      PERFORM _be862_insert_as_anon(6);
      RAISE EXCEPTION 'FAIL(3): a 6-row statement took the day to 16 past a ceiling of 15';
    EXCEPTION WHEN SQLSTATE 'BE862' THEN NULL;
    END;
    IF (SELECT count(*) FROM public.analytics_events WHERE event_type = 'crisis_detected') <> 10 THEN
      RAISE EXCEPTION 'FAIL(3): part of the rejected statement was kept';
    END IF;
    RAISE NOTICE 'PASS(3): a crossing statement is rejected whole';
  END $$;
ROLLBACK;

-- ============ Test 4: yesterday's rows do not count against today ============
BEGIN;
  DELETE FROM public.analytics_events WHERE event_type = 'crisis_detected';
  UPDATE public.crisis_ingest_config SET daily_ceiling = 15 WHERE id;
  INSERT INTO public.analytics_events (event_type, properties, created_at)
  SELECT 'crisis_detected', '{"trigger_type":"gad7_severe_score","severity_bucket":"high"}'::jsonb,
         now() - interval '1 day'
  FROM generate_series(1, 15);
  SELECT _be862_insert_as_anon(15);
  DO $$
  BEGIN
    IF (SELECT count(*) FROM public.analytics_events WHERE event_type = 'crisis_detected') <> 30 THEN
      RAISE EXCEPTION 'FAIL(4): rows from an earlier UTC day counted against today';
    END IF;
    RAISE NOTICE 'PASS(4): the window is the current UTC day';
  END $$;
ROLLBACK;

-- ============ Test 5: non-crisis inserts are never counted or held ============
BEGIN;
  DELETE FROM public.analytics_events WHERE event_type = 'crisis_detected';
  UPDATE public.crisis_ingest_config SET daily_ceiling = 15 WHERE id;
  SELECT _be862_insert_as_anon(15);
  INSERT INTO auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
  VALUES ('86286286-2862-2862-2862-862862862862', '00000000-0000-0000-0000-000000000000',
          'authenticated', 'authenticated', true, now(), now());
  INSERT INTO public.analytics_events (user_id, session_id, event_type, properties)
  SELECT '86286286-2862-2862-2862-862862862862', 'session_2026-10-24_be862', 'screen_view', '{}'::jsonb
  FROM generate_series(1, 20);
  DO $$ BEGIN RAISE NOTICE 'PASS(5): non-crisis inserts pass at a full crisis ceiling'; END $$;
ROLLBACK;

-- ============ Test 6: no config row admits (misconfiguration never holds delivery) ============
BEGIN;
  DELETE FROM public.analytics_events WHERE event_type = 'crisis_detected';
  DELETE FROM public.crisis_ingest_config;
  SELECT _be862_insert_as_anon(50);
  SELECT _be862_insert_as_anon(50);
  DO $$ BEGIN RAISE NOTICE 'PASS(6): with no config row, crisis inserts are admitted'; END $$;
ROLLBACK;

-- ============ Test 7: the trigger function is definer, pinned and unreachable ============
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc
                  WHERE proname = 'analytics_events_crisis_daily_ceiling'
                    AND pronamespace = 'public'::regnamespace
                    AND prorettype = 'trigger'::regtype
                    AND prosecdef
                    AND EXISTS (SELECT 1 FROM unnest(proconfig) c WHERE c LIKE 'search_path=%')) THEN
    RAISE EXCEPTION 'FAIL(7): ceiling function missing, not trigger-typed, not definer, or unpinned';
  END IF;
  IF has_function_privilege('anon', 'public.analytics_events_crisis_daily_ceiling()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.analytics_events_crisis_daily_ceiling()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL(7): a client role holds EXECUTE on the ceiling function';
  END IF;
  IF (SELECT prosrc FROM pg_proc WHERE proname = 'analytics_events_crisis_daily_ceiling'
       AND pronamespace = 'public'::regnamespace)
     ~ '(request\.headers|request\.jwt|current_setting|inet_client_addr)' THEN
    RAISE EXCEPTION 'FAIL(7): the ceiling reads request context — it must key on nothing per-client';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger
                  WHERE tgrelid = 'public.analytics_events'::regclass
                    AND tgname = 'analytics_events_crisis_daily_ceiling' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'FAIL(7): the ceiling trigger is not attached to analytics_events';
  END IF;
  RAISE NOTICE 'PASS(7): definer, pinned, unreachable, identifier-free, attached';
END $$;

DROP FUNCTION _be862_insert_as_anon(int);

\echo 'ALL INFRA-861 CRISIS CEILING TESTS PASSED'
