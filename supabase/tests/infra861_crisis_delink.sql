-- INFRA-861 crisis de-link suite — proves a crisis_detected row carries no account or
-- session identifier and a day-only arrival time, whichever role or path writes it, and
-- that the unauthenticated delivery lane (anon, column-scoped INSERT) still works.
--
-- WHAT THIS EXISTS TO CATCH. Before INFRA-861 every crisis row carried user_id =
-- auth.uid() (joinable to auth.sessions IP/user agent, DEBUG-850), the rotating session_id
-- that identified operational rows also carry, and a full-precision created_at — and the
-- first crisis on an install was what minted the identity. The de-link is enforced in the
-- table (trigger + CHECK), so a regression here is silent everywhere else: no client test
-- can see a server column, and the alerter only reads counts.
--
-- HOW TO RUN (local stack; no remote/paid resources):
--   supabase start && supabase db reset            # applies all migrations
--   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
--     -v ON_ERROR_STOP=1 -X -f supabase/tests/infra861_crisis_delink.sql
--   # exit 0 + "ALL INFRA-861 CRISIS DE-LINK TESTS PASSED" = green.
--
-- Do NOT run against the shared project — it inserts rows. Data tests are rolled back.
-- PostgREST statement shape (return=minimal vs representation, user-JWT 403) is NOT
-- reproducible from psql role switching; that half is the curl check recorded on the PR.

\set ON_ERROR_STOP on

\set U '86186186-1861-1861-1861-861861861861'

DELETE FROM auth.users WHERE id = :'U';
INSERT INTO auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
VALUES (:'U', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now());

CREATE OR REPLACE FUNCTION _be861_act_as_anon() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('role', 'anon', true);
  PERFORM set_config('request.jwt.claims', '', true);
END $$;

CREATE OR REPLACE FUNCTION _be861_act_as(uid text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
END $$;

-- ============ Test 1: anon inserts a crisis row; it lands de-linked ============
BEGIN;
  SELECT _be861_act_as_anon();
  INSERT INTO public.analytics_events (event_type, properties)
  VALUES ('crisis_detected',
          '{"trigger_type":"phq9_suicidal_ideation","severity_bucket":"emergency","assessment_type":"phq9","intervention_surfaced":true,"detected_on":"2026-10-24"}');
  RESET role;
  DO $$
  DECLARE r public.analytics_events%ROWTYPE;
  BEGIN
    SELECT * INTO r FROM public.analytics_events
     WHERE event_type = 'crisis_detected' AND properties->>'trigger_type' = 'phq9_suicidal_ideation';
    IF r.id IS NULL THEN RAISE EXCEPTION 'FAIL(1): anon crisis insert did not land'; END IF;
    IF r.user_id IS NOT NULL OR r.session_id IS NOT NULL THEN
      RAISE EXCEPTION 'FAIL(1): crisis row kept an identifier (user_id or session_id)';
    END IF;
    IF r.created_at <> (date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') THEN
      RAISE EXCEPTION 'FAIL(1): created_at is not the current UTC day-start';
    END IF;
    IF r.properties <> '{"trigger_type":"phq9_suicidal_ideation","severity_bucket":"emergency","assessment_type":"phq9","intervention_surfaced":true,"detected_on":"2026-10-24"}'::jsonb THEN
      RAISE EXCEPTION 'FAIL(1): in-domain properties were altered';
    END IF;
    RAISE NOTICE 'PASS(1): anon crisis insert stored with NULL identity and a UTC day-start';
  END $$;
ROLLBACK;

-- ============ Test 2: anon cannot write the protected columns ============
DO $$
DECLARE col text;
BEGIN
  FOREACH col IN ARRAY ARRAY['id', 'user_id', 'session_id', 'created_at'] LOOP
    IF has_column_privilege('anon', 'public.analytics_events', col, 'INSERT') THEN
      RAISE EXCEPTION 'FAIL(2): anon holds INSERT on analytics_events.%', col;
    END IF;
  END LOOP;
  RAISE NOTICE 'PASS(2): anon has no INSERT on id/user_id/session_id/created_at';
END $$;

BEGIN;
  SELECT _be861_act_as_anon();
  DO $$ BEGIN
    BEGIN
      INSERT INTO public.analytics_events (event_type, properties, user_id)
      VALUES ('crisis_detected', '{}', '86186186-1861-1861-1861-861861861861');
      RAISE EXCEPTION 'FAIL(2): anon set user_id';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS(2): anon supplying user_id is denied';
    END;
    BEGIN
      INSERT INTO public.analytics_events (event_type, properties, created_at)
      VALUES ('crisis_detected', '{}', now() - interval '3 hours');
      RAISE EXCEPTION 'FAIL(2): anon set created_at';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS(2): anon supplying created_at is denied';
    END;
  END $$;
ROLLBACK;

-- ============ Test 3: anon cannot insert any other event type ============
BEGIN;
  SELECT _be861_act_as_anon();
  DO $$ BEGIN
    BEGIN
      INSERT INTO public.analytics_events (event_type, properties) VALUES ('screen_view', '{}');
      RAISE EXCEPTION 'FAIL(3): anon inserted a non-crisis row';
    EXCEPTION WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE 'PASS(3): anon non-crisis insert rejected';
    END;
  END $$;
ROLLBACK;

-- ============ Test 4: anon has no other privilege ============
DO $$
DECLARE verb text;
BEGIN
  FOREACH verb IN ARRAY ARRAY['SELECT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] LOOP
    IF has_table_privilege('anon', 'public.analytics_events', verb) THEN
      RAISE EXCEPTION 'FAIL(4): anon holds % on analytics_events', verb;
    END IF;
  END LOOP;
  IF NOT has_column_privilege('anon', 'public.analytics_events', 'event_type', 'INSERT')
     OR NOT has_column_privilege('anon', 'public.analytics_events', 'properties', 'INSERT') THEN
    -- The over-revoke direction: a future hardening sweep silently killing the
    -- delivery lane is invisible to the staleness alert while forged traffic flows.
    RAISE EXCEPTION 'FAIL(4): anon lost INSERT on (event_type, properties) — crisis delivery is dead';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'analytics_events'
       AND cmd = 'INSERT' AND roles = '{anon}'
       AND with_check LIKE '%crisis_detected%' AND with_check LIKE '%user_id IS NULL%'
       AND with_check LIKE '%session_id IS NULL%') THEN
    RAISE EXCEPTION 'FAIL(4): the TO anon crisis INSERT policy is missing or changed';
  END IF;
  RAISE NOTICE 'PASS(4): anon holds exactly INSERT(event_type, properties) under a TO anon crisis policy';
END $$;

-- ============ Test 5: authenticated crisis inserts are closed; identified rows still work ============
BEGIN;
  SELECT _be861_act_as(:'U');
  DO $$ BEGIN
    BEGIN
      INSERT INTO public.analytics_events (user_id, event_type, properties, session_id)
      VALUES ('86186186-1861-1861-1861-861861861861', 'crisis_detected',
              '{"trigger_type":"phq9_severe_score","severity_bucket":"high","assessment_type":"phq9","intervention_surfaced":true}',
              'session_2026-10-24_infra861a');
      RAISE EXCEPTION 'FAIL(5): authenticated (JWT-bearing) crisis insert accepted';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS(5): authenticated crisis insert rejected';
    END;
  END $$;
  INSERT INTO public.analytics_events (user_id, event_type, properties, session_id)
  VALUES (:'U', 'backup_completed', '{}', 'session_2026-10-24_infra861b');
  DO $$ BEGIN
    IF (SELECT count(*) FROM public.analytics_events WHERE session_id = 'session_2026-10-24_infra861b') <> 1 THEN
      RAISE EXCEPTION 'FAIL(5): authenticated own-uid non-crisis insert no longer works';
    END IF;
    RAISE NOTICE 'PASS(5): authenticated own-uid non-crisis insert still works';
  END $$;
ROLLBACK;

BEGIN;
  INSERT INTO public.analytics_events (event_type, properties)
  VALUES ('crisis_detected', '{"trigger_type":"manual_override"}');
  SELECT _be861_act_as(:'U');
  DO $$ BEGIN
    IF (SELECT count(*) FROM public.analytics_events WHERE event_type = 'crisis_detected') <> 0 THEN
      RAISE EXCEPTION 'FAIL(5): an authenticated client can read de-linked crisis rows';
    END IF;
    RAISE NOTICE 'PASS(5): de-linked crisis rows are invisible to authenticated';
  END $$;
ROLLBACK;

-- ============ Test 6: the de-link binds privileged roles, and UPDATE ============
BEGIN;
  -- postgres (superuser) supplies every identifier and a mid-day timestamp.
  INSERT INTO public.analytics_events (user_id, event_type, properties, session_id, created_at)
  VALUES (:'U', 'crisis_detected', '{"trigger_type":"gad7_severe_score"}',
          'session_2026-10-20_infra861c', '2026-10-20 13:47:12+00');
  DO $$
  DECLARE r public.analytics_events%ROWTYPE;
  BEGIN
    SELECT * INTO r FROM public.analytics_events
     WHERE event_type = 'crisis_detected' AND properties->>'trigger_type' = 'gad7_severe_score';
    IF r.user_id IS NOT NULL OR r.session_id IS NOT NULL THEN
      RAISE EXCEPTION 'FAIL(6): a privileged crisis insert kept its identifiers';
    END IF;
    IF r.created_at <> '2026-10-20 00:00:00+00'::timestamptz THEN
      RAISE EXCEPTION 'FAIL(6): a supplied past created_at was not truncated to its UTC day (got %)', r.created_at;
    END IF;
    RAISE NOTICE 'PASS(6): privileged crisis insert nulled and day-truncated';
  END $$;

  -- A future created_at is clamped to today, never stored ahead of now().
  INSERT INTO public.analytics_events (event_type, properties, created_at)
  VALUES ('crisis_detected', '{"trigger_type":"combined_high_risk"}', now() + interval '400 days');
  DO $$ BEGIN
    IF (SELECT created_at FROM public.analytics_events
         WHERE properties->>'trigger_type' = 'combined_high_risk')
       <> (date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') THEN
      RAISE EXCEPTION 'FAIL(6): a future created_at was not clamped to the current UTC day';
    END IF;
    RAISE NOTICE 'PASS(6): future created_at clamped to today';
  END $$;

  DO $$ BEGIN
    BEGIN
      UPDATE public.analytics_events SET user_id = '86186186-1861-1861-1861-861861861861'
       WHERE properties->>'trigger_type' = 'gad7_severe_score';
      RAISE EXCEPTION 'FAIL(6): UPDATE re-attached user_id to a crisis row';
    EXCEPTION WHEN check_violation THEN
      RAISE NOTICE 'PASS(6): UPDATE re-attaching user_id is a check_violation';
    END;
    BEGIN
      UPDATE public.analytics_events SET session_id = 'session_2026-10-20_infra861d'
       WHERE properties->>'trigger_type' = 'gad7_severe_score';
      RAISE EXCEPTION 'FAIL(6): UPDATE re-attached session_id to a crisis row';
    EXCEPTION WHEN check_violation THEN
      RAISE NOTICE 'PASS(6): UPDATE re-attaching session_id is a check_violation';
    END;
    BEGIN
      UPDATE public.analytics_events SET created_at = '2026-10-20 13:47:12+00'
       WHERE properties->>'trigger_type' = 'gad7_severe_score';
      RAISE EXCEPTION 'FAIL(6): UPDATE gave a crisis row a sub-day created_at';
    EXCEPTION WHEN check_violation THEN
      RAISE NOTICE 'PASS(6): UPDATE to a sub-day created_at is a check_violation';
    END;
    BEGIN
      UPDATE public.analytics_events SET properties = properties || '{"note":"x"}'
       WHERE properties->>'trigger_type' = 'gad7_severe_score';
      RAISE EXCEPTION 'FAIL(6): UPDATE added a non-allowlisted key to a crisis row';
    EXCEPTION WHEN check_violation THEN
      RAISE NOTICE 'PASS(6): UPDATE adding a non-allowlisted key is a check_violation';
    END;
  END $$;
ROLLBACK;

-- ============ Test 7: non-crisis rows keep their identifiers ============
BEGIN;
  DO $$ BEGIN
    BEGIN
      INSERT INTO public.analytics_events (user_id, event_type, properties, session_id)
      VALUES (NULL, 'backup_completed', '{}', 'session_2026-10-24_infra861e');
      RAISE EXCEPTION 'FAIL(7): a non-crisis row was stored without user_id';
    EXCEPTION WHEN check_violation THEN
      RAISE NOTICE 'PASS(7): non-crisis row without user_id rejected';
    END;
    BEGIN
      INSERT INTO public.analytics_events (user_id, event_type, properties, session_id)
      VALUES ('86186186-1861-1861-1861-861861861861', 'backup_completed', '{}', NULL);
      RAISE EXCEPTION 'FAIL(7): a non-crisis row was stored without session_id';
    EXCEPTION WHEN check_violation THEN
      RAISE NOTICE 'PASS(7): non-crisis row without session_id rejected';
    END;
  END $$;
ROLLBACK;

-- ============ Test 8: normalisation coerces, never rejects ============
BEGIN;
  -- Start from an empty crisis set (rolled back): other suites may leave crisis rows.
  DELETE FROM public.analytics_events WHERE event_type = 'crisis_detected';
  SELECT _be861_act_as_anon();
  INSERT INTO public.analytics_events (event_type, properties) VALUES
    -- out-of-domain enums, a smuggled identifier, a nested object and free text
    ('crisis_detected', '{"trigger_type":"undefined","severity_bucket":"severe","assessment_type":"bdi","intervention_surfaced":"yes","user_id":"86186186-1861-1861-1861-861861861861","session_id":"session_2026-10-24_x","nested":{"a":1},"note":"free text 861-sentinel"}'),
    -- non-object properties
    ('crisis_detected', '"just a string"'),
    -- detected_on not shaped YYYY-MM-DD: dropped
    ('crisis_detected', '{"trigger_type":"journal_text_match","severity_bucket":"high","assessment_type":"voice_journal","intervention_surfaced":false,"detected_on":"yesterday"}'),
    ('crisis_detected', '{"trigger_type":"phq9_moderate_severe_score","detected_on":20261024}'),
    -- shape-valid but impossible date: kept, the DEBUG-541 resolver labels it malformed
    ('crisis_detected', '{"trigger_type":"phq9_severe_score","detected_on":"2026-02-31"}'),
    -- future and ancient dates: kept and classified by the resolver, never rejected
    ('crisis_detected', '{"trigger_type":"gad7_severe_score","severity_bucket":"critical","detected_on":"2099-01-01"}'),
    ('crisis_detected', '{"trigger_type":"manual_override","severity_bucket":"moderate","detected_on":"2001-01-01"}');
  RESET role;
  DO $$
  DECLARE n int; p jsonb;
  BEGIN
    SELECT count(*) INTO n FROM public.analytics_events WHERE event_type = 'crisis_detected';
    IF n <> 7 THEN RAISE EXCEPTION 'FAIL(8): % of 7 rows stored — normalisation rejected a row', n; END IF;

    IF EXISTS (SELECT 1 FROM public.analytics_events
                WHERE event_type = 'crisis_detected'
                  AND (properties - ARRAY['trigger_type','severity_bucket','assessment_type',
                                          'intervention_surfaced','detected_on']) <> '{}'::jsonb) THEN
      RAISE EXCEPTION 'FAIL(8): a non-allowlisted key survived normalisation';
    END IF;
    IF EXISTS (SELECT 1 FROM public.analytics_events
                WHERE event_type = 'crisis_detected' AND properties::text LIKE '%861-sentinel%') THEN
      RAISE EXCEPTION 'FAIL(8): caller free text survived normalisation';
    END IF;

    SELECT properties INTO p FROM public.analytics_events WHERE properties->>'assessment_type' IS NOT NULL
       AND properties->>'trigger_type' = 'unknown' AND properties->>'severity_bucket' = 'unknown'
       AND jsonb_typeof(properties->'intervention_surfaced') = 'null' LIMIT 1;
    IF p IS NULL OR p->>'assessment_type' <> 'unknown' THEN
      RAISE EXCEPTION 'FAIL(8): out-of-domain enums were not coerced to unknown';
    END IF;

    IF (SELECT count(*) FROM public.analytics_events
         WHERE properties->>'trigger_type' IN ('journal_text_match', 'phq9_moderate_severe_score')
           AND NOT properties ? 'detected_on') <> 2 THEN
      RAISE EXCEPTION 'FAIL(8): a non-shape detected_on was not dropped';
    END IF;
    IF (SELECT count(*) FROM public.analytics_events
         WHERE properties->>'detected_on' IN ('2026-02-31', '2099-01-01', '2001-01-01')) <> 3 THEN
      RAISE EXCEPTION 'FAIL(8): a shape-valid detected_on was dropped (the resolver, not the trigger, judges it)';
    END IF;
    IF public.crisis_event_day_source('{"detected_on":"2026-02-31"}', now()) <> 'malformed'
       OR public.crisis_event_day_source('{"detected_on":"2099-01-01"}', now()) <> 'future_skew'
       OR public.crisis_event_day_source('{"detected_on":"2001-01-01"}', now()) <> 'implausible_past' THEN
      RAISE EXCEPTION 'FAIL(8): the DEBUG-541 resolver no longer classifies kept dates';
    END IF;
    RAISE NOTICE 'PASS(8): every row kept; keys stripped, enums coerced, non-shape dates dropped';
  END $$;
ROLLBACK;

-- ============ Test 9: probe_type fails loud, never stripped ============
BEGIN;
  SELECT _be861_act_as_anon();
  DO $$ BEGIN
    BEGIN
      INSERT INTO public.analytics_events (event_type, properties)
      VALUES ('crisis_detected', '{"probe_type":"synthetic_liveness","note":"861-sentinel"}');
      RAISE EXCEPTION 'FAIL(9): a probe_type row was accepted (stripped into a real crisis row)';
    EXCEPTION WHEN check_violation THEN
      IF SQLERRM LIKE '%861-sentinel%' THEN
        RAISE EXCEPTION 'FAIL(9): the rejection echoed request content';
      END IF;
      RAISE NOTICE 'PASS(9): probe_type row rejected loud, no input echoed';
    END;
  END $$;
ROLLBACK;

-- ============ Test 10: per-statement cap ============
BEGIN;
  SELECT _be861_act_as_anon();
  INSERT INTO public.analytics_events (event_type, properties)
  SELECT 'crisis_detected', '{"trigger_type":"manual_override"}' FROM generate_series(1, 50);
  DO $$ BEGIN
    BEGIN
      INSERT INTO public.analytics_events (event_type, properties)
      SELECT 'crisis_detected', '{"trigger_type":"manual_override","note":"861-sentinel"}' FROM generate_series(1, 51);
      RAISE EXCEPTION 'FAIL(10): a 51-row crisis statement was accepted';
    EXCEPTION WHEN SQLSTATE 'BE861' THEN
      IF SQLERRM LIKE '%861-sentinel%' THEN
        RAISE EXCEPTION 'FAIL(10): the cap rejection echoed request content';
      END IF;
      RAISE NOTICE 'PASS(10): 50 rows accepted, 51 rejected with SQLSTATE BE861';
    END;
  END $$;
ROLLBACK;

-- ============ Test 11: no pre-INFRA-861 crisis row survives the migration ============
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.analytics_events
              WHERE event_type = 'crisis_detected'
                AND (user_id IS NOT NULL OR session_id IS NOT NULL
                     OR created_at <> (date_trunc('day', created_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'))) THEN
    RAISE EXCEPTION 'FAIL(11): an identified or sub-day crisis row exists';
  END IF;
  RAISE NOTICE 'PASS(11): no crisis row carries an identifier or a sub-day time';
END $$;

-- ============ Test 12: the operator views still count crisis rows ============
BEGIN;
  SELECT _be861_act_as_anon();
  INSERT INTO public.analytics_events (event_type, properties)
  VALUES ('crisis_detected', '{"trigger_type":"phq9_severe_score","severity_bucket":"high","assessment_type":"phq9","intervention_surfaced":true}');
  RESET role;
  DO $$ BEGIN
    IF (SELECT total_detections_retained FROM public.crisis_detection_liveness) < 1 THEN
      RAISE EXCEPTION 'FAIL(12): crisis_detection_liveness does not count the anon row';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.crisis_detection_volume_daily
                    WHERE event_date = date_trunc('day', now() AT TIME ZONE 'UTC') AND detection_count >= 1
                      AND distinct_sessions IS NULL) THEN
      RAISE EXCEPTION 'FAIL(12): crisis_detection_volume_daily lost the row, or distinct_sessions is not NULL';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.crisis_detection_daily WHERE detection_count >= 1) THEN
      RAISE EXCEPTION 'FAIL(12): crisis_detection_daily does not count the anon row';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.crisis_detection_arrival_daily) THEN
      RAISE EXCEPTION 'FAIL(12): crisis_detection_arrival_daily does not count the anon row';
    END IF;
    RAISE NOTICE 'PASS(12): liveness, volume, daily and arrival views count the anon row';
  END $$;
ROLLBACK;

DO $$
DECLARE v text; rol text;
BEGIN
  FOREACH v IN ARRAY ARRAY['crisis_detection_liveness', 'crisis_detection_volume_daily',
                           'crisis_detection_daily', 'crisis_detection_arrival_daily'] LOOP
    IF NOT has_table_privilege('service_role', 'public.' || v, 'SELECT') THEN
      RAISE EXCEPTION 'FAIL(12): service_role lost SELECT on % — the alerter goes blind', v;
    END IF;
    FOREACH rol IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF has_table_privilege(rol, 'public.' || v, 'SELECT') THEN
        RAISE EXCEPTION 'FAIL(12): % can read operator view %', rol, v;
      END IF;
    END LOOP;
  END LOOP;
  RAISE NOTICE 'PASS(12): view grants unchanged (service_role reads, clients do not)';
END $$;

-- ============ Test 13: a crisis row survives erasure of any account ============
BEGIN;
  INSERT INTO public.analytics_events (event_type, properties)
  VALUES ('crisis_detected', '{"trigger_type":"phq9_suicidal_ideation"}');
  DELETE FROM auth.users WHERE id = :'U';
  DO $$ BEGIN
    IF (SELECT count(*) FROM public.analytics_events
         WHERE properties->>'trigger_type' = 'phq9_suicidal_ideation') <> 1 THEN
      RAISE EXCEPTION 'FAIL(13): an account deletion removed a de-linked crisis row';
    END IF;
    RAISE NOTICE 'PASS(13): de-linked crisis row is unaffected by account deletion';
  END $$;
ROLLBACK;

-- ============ Test 14: the new trigger functions are not callable surface ============
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY['analytics_events_crisis_delink', 'analytics_events_crisis_statement_cap'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = fn AND pronamespace = 'public'::regnamespace
                     AND prorettype = 'trigger'::regtype AND NOT prosecdef
                     AND proconfig IS NOT NULL
                     AND EXISTS (SELECT 1 FROM unnest(proconfig) c WHERE c LIKE 'search_path=%')) THEN
      RAISE EXCEPTION 'FAIL(14): % is missing, not trigger-typed, SECURITY DEFINER, or unpinned', fn;
    END IF;
    IF has_function_privilege('anon', 'public.' || fn || '()', 'EXECUTE')
       OR has_function_privilege('authenticated', 'public.' || fn || '()', 'EXECUTE') THEN
      RAISE EXCEPTION 'FAIL(14): a client role holds EXECUTE on %', fn;
    END IF;
    IF (SELECT prosrc FROM pg_proc WHERE proname = fn AND pronamespace = 'public'::regnamespace)
       ~ '(request\.headers|request\.jwt|current_setting)' THEN
      RAISE EXCEPTION 'FAIL(14): % reads request headers, JWT claims or settings', fn;
    END IF;
  END LOOP;
  RAISE NOTICE 'PASS(14): trigger functions are INVOKER, pinned, unreachable, and read no request context';
END $$;

DELETE FROM auth.users WHERE id = :'U';
DROP FUNCTION _be861_act_as_anon();
DROP FUNCTION _be861_act_as(text);

\echo 'ALL INFRA-861 CRISIS DE-LINK TESTS PASSED'
