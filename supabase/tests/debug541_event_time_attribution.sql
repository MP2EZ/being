-- DEBUG-541 event-time attribution verification suite — proves the resolution rule is
-- TOTAL, that every rejection falls back rather than inventing a day, that the two
-- day-series views kept their column types, and that the liveness view did NOT move.
--
-- HOW TO RUN (local stack; no remote/paid resources):
--   supabase start && supabase db reset            # applies all migrations
--   docker exec -i supabase_db_$(basename "$PWD") psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/debug541_event_time_attribution.sql
--   # exit 0 + "ALL DEBUG-541 EVENT-TIME TESTS PASSED" = green; any RAISE is a regression.
--
-- Do NOT run this against the shared prod project. It is self-cleaning and re-runnable.
--
-- WHAT THIS PROVES AND WHAT IT DOES NOT. Tests 2-8 drive the resolution functions directly
-- rather than inserting rows, because the functions are pure and an insert would need an
-- auth-schema FK principal for no added coverage: the views' ONLY date expression is
-- `crisis_event_day(properties, created_at)`, so function-level behaviour IS view-level
-- behaviour here. Test 9 pins that claim by reading the view definitions back. What is NOT
-- covered: the alerter's own arithmetic over these columns, which is unit-tested in deno at
-- supabase/functions/_tests/crisis-alert-logic.test.ts.
--
-- Last validated: NOT YET RUN — requires a local stack (see close-out).

\set ON_ERROR_STOP on

-- ============ Test 1: both functions exist, are STABLE, and pin search_path ============
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT unnest(ARRAY['crisis_event_day', 'crisis_event_day_source']) AS fname
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = r.fname
    ) THEN
      RAISE EXCEPTION 'FAIL: public.% does not exist', r.fname;
    END IF;
    -- DEBUG-455 posture: an unpinned search_path on a function reachable from a view is
    -- the hijack surface that item swept the schema for.
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = r.fname
        AND p.proconfig IS NOT NULL
        AND EXISTS (SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%')
    ) THEN
      RAISE EXCEPTION 'FAIL: public.% does not pin search_path', r.fname;
    END IF;
  END LOOP;
  RAISE NOTICE 'PASS: both resolution functions exist with a pinned search_path';
END $$;

-- ============ Test 2: TOTALITY — the rule can never error a view ============
-- The load-bearing test. `properties` is client-written JSONB under RLS with no CHECK on
-- detected_on, so a crafted value reaches this code. A raise here is not a wrong number,
-- it is every alerter read failing and the monitor going blind behind a watchdog page.
DO $$
DECLARE
  v_now   timestamptz := '2026-09-13T12:00:00Z';
  v_case  jsonb;
  v_out   text;
BEGIN
  FOREACH v_case IN ARRAY ARRAY[
    '{}'::jsonb,
    '{"detected_on": null}'::jsonb,
    '{"detected_on": ""}'::jsonb,
    '{"detected_on": "2026-02-31"}'::jsonb,   -- digit-shaped, NOT a calendar date
    '{"detected_on": "2026-13-01"}'::jsonb,   -- month 13
    '{"detected_on": "0000-00-00"}'::jsonb,
    '{"detected_on": "not-a-date"}'::jsonb,
    '{"detected_on": "2026-09-13T12:00:00Z"}'::jsonb,
    '{"detected_on": 20260913}'::jsonb,       -- number, not text
    '{"detected_on": {"nested": "object"}}'::jsonb,
    '{"detected_on": ["2026-09-13"]}'::jsonb,
    '{"detected_on": "  2026-09-13  "}'::jsonb,
    '{"detected_on": "99999-01-01"}'::jsonb
  ]
  LOOP
    BEGIN
      v_out := public.crisis_event_day_source(v_case, v_now);
      PERFORM public.crisis_event_day(v_case, v_now);
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'FAIL: resolution raised on % (%)', v_case, SQLERRM;
    END;
    IF v_out = 'event' THEN
      RAISE EXCEPTION 'FAIL: hostile input % was accepted as event time', v_case;
    END IF;
  END LOOP;
  RAISE NOTICE 'PASS: 13 hostile inputs resolved without raising, none accepted';
END $$;

-- ============ Test 3: the matcher still FIRES (paired control for test 2) ============
-- DEBUG-390's lesson: a rejection suite that rejects EVERYTHING is indistinguishable from
-- a harness that never ran. A good value must be accepted, or test 2 proves nothing.
DO $$
DECLARE v_now timestamptz := '2026-09-13T12:00:00Z';
BEGIN
  IF public.crisis_event_day_source('{"detected_on": "2026-09-10"}'::jsonb, v_now) <> 'event' THEN
    RAISE EXCEPTION 'FAIL: a well-formed in-range date was not accepted — test 2 is vacuous';
  END IF;
  IF public.crisis_event_day('{"detected_on": "2026-09-10"}'::jsonb, v_now) <> DATE '2026-09-10' THEN
    RAISE EXCEPTION 'FAIL: accepted date did not resolve to itself';
  END IF;
  RAISE NOTICE 'PASS: a usable date is accepted and returned verbatim';
END $$;

-- ============ Test 4: absent detected_on falls back — never a NULL group ============
-- Pre-DEBUG-541 clients are a PERMANENT population. Without the fallback these rows would
-- DATE_TRUNC(NULL) into a null group and vanish from every operator view.
DO $$
DECLARE v_now timestamptz := '2026-09-13T12:00:00Z';
BEGIN
  IF public.crisis_event_day_source('{}'::jsonb, v_now) <> 'absent' THEN
    RAISE EXCEPTION 'FAIL: a row with no detected_on was not classified absent';
  END IF;
  IF public.crisis_event_day('{}'::jsonb, v_now) IS NULL THEN
    RAISE EXCEPTION 'FAIL: absent detected_on resolved to NULL — rows would vanish';
  END IF;
  IF public.crisis_event_day('{}'::jsonb, v_now) <> DATE '2026-09-13' THEN
    RAISE EXCEPTION 'FAIL: absent detected_on did not fall back to the ingest day';
  END IF;
  RAISE NOTICE 'PASS: absent detected_on falls back to the ingest day, never NULL';
END $$;

-- ============ Test 5: upper clamp — a forward clock cannot hide a detection ============
-- A future bucket is never "today" and never a closed day the watermark revisits, so an
-- unclamped skew is a PERMANENT silent false negative with no recovery path.
DO $$
DECLARE v_now timestamptz := '2026-09-13T12:00:00Z';
BEGIN
  IF public.crisis_event_day_source('{"detected_on": "2026-09-14"}'::jsonb, v_now) <> 'future_skew' THEN
    RAISE EXCEPTION 'FAIL: a next-day value was not classified future_skew';
  END IF;
  IF public.crisis_event_day('{"detected_on": "2027-01-01"}'::jsonb, v_now) <> DATE '2026-09-13' THEN
    RAISE EXCEPTION 'FAIL: a future value was not attributed to the ingest day';
  END IF;
  -- Same-day is NOT skew: the common case is detect-and-flush within milliseconds.
  IF public.crisis_event_day_source('{"detected_on": "2026-09-13"}'::jsonb, v_now) <> 'event' THEN
    RAISE EXCEPTION 'FAIL: a same-day detection was rejected as skew';
  END IF;
  RAISE NOTICE 'PASS: future values attributed to ingest day; same-day accepted';
END $$;

-- ============ Test 6: lower floor, and it FALLS BACK rather than clamping ============
-- Clamping a 1970 row UP to the floor day would manufacture a spike on a day that had no
-- crisis — the exact harm class DEBUG-541 exists to remove.
DO $$
DECLARE v_now timestamptz := '2026-09-13T12:00:00Z';
BEGIN
  IF public.crisis_event_day_source('{"detected_on": "1970-01-01"}'::jsonb, v_now) <> 'implausible_past' THEN
    RAISE EXCEPTION 'FAIL: a 1970 value was not classified implausible_past';
  END IF;
  IF public.crisis_event_day('{"detected_on": "1970-01-01"}'::jsonb, v_now) <> DATE '2026-09-13' THEN
    RAISE EXCEPTION 'FAIL: an out-of-range past value was not attributed to the ingest day';
  END IF;
  IF public.crisis_event_day('{"detected_on": "1970-01-01"}'::jsonb, v_now)
     = DATE '2026-09-13' - 90 THEN
    RAISE EXCEPTION 'FAIL: out-of-range value was CLAMPED to the floor, inventing a day';
  END IF;
  RAISE NOTICE 'PASS: out-of-range past falls back to ingest day, never clamped to floor';
END $$;

-- ============ Test 7: the 90-day horizon boundary is inclusive ============
-- The horizon and the alerter's revisit window are the SAME number: a day whose prior count
-- is no longer held cannot be re-evaluated. Off-by-one here silently drops a real day.
DO $$
DECLARE
  v_now  timestamptz := '2026-09-13T12:00:00Z';
  v_at   text := to_char(DATE '2026-09-13' - 90, 'YYYY-MM-DD');
  v_past text := to_char(DATE '2026-09-13' - 91, 'YYYY-MM-DD');
BEGIN
  IF public.crisis_event_day_source(jsonb_build_object('detected_on', v_at), v_now) <> 'event' THEN
    RAISE EXCEPTION 'FAIL: exactly 90 days back was rejected (boundary must be inclusive)';
  END IF;
  IF public.crisis_event_day_source(jsonb_build_object('detected_on', v_past), v_now) <> 'implausible_past' THEN
    RAISE EXCEPTION 'FAIL: 91 days back was accepted (boundary is not enforced)';
  END IF;
  RAISE NOTICE 'PASS: horizon boundary inclusive at 90d, rejecting at 91d';
END $$;

-- ============ Test 8: UTC, not server-local ============
-- A device-local day boundary would disagree with created_at for every user west of UTC and
-- would pass on a UTC CI box while failing elsewhere.
DO $$
DECLARE v_late timestamptz := '2026-09-13T23:30:00Z';
BEGIN
  IF public.crisis_event_day('{}'::jsonb, v_late) <> DATE '2026-09-13' THEN
    RAISE EXCEPTION 'FAIL: late-UTC ingest did not resolve to the UTC day';
  END IF;
  RAISE NOTICE 'PASS: resolution uses the UTC day';
END $$;

-- ============ Test 9: view shapes — types preserved, liveness NOT moved ============
DO $$
DECLARE v_def text;
BEGIN
  -- event_date must stay timestamptz. A bare `date` would have made CREATE OR REPLACE fail
  -- outright, and would break the alerter's event_date.slice(0, 10).
  IF (SELECT format_type(atttypid, atttypmod) FROM pg_attribute
      WHERE attrelid = 'public.crisis_detection_volume_daily'::regclass
        AND attname = 'event_date') <> 'timestamp with time zone' THEN
    RAISE EXCEPTION 'FAIL: volume_daily.event_date is no longer timestamptz';
  END IF;
  IF (SELECT format_type(atttypid, atttypmod) FROM pg_attribute
      WHERE attrelid = 'public.crisis_detection_daily'::regclass
        AND attname = 'event_date') <> 'timestamp with time zone' THEN
    RAISE EXCEPTION 'FAIL: detection_daily.event_date is no longer timestamptz';
  END IF;

  -- Both day-series views must carry the provenance split. LABEL, NEVER SUPPRESS.
  IF NOT EXISTS (SELECT 1 FROM pg_attribute
                 WHERE attrelid = 'public.crisis_detection_volume_daily'::regclass
                   AND attname IN ('event_time_rows','ingest_time_rows',
                                   'clock_skew_count','implausible_past_count')
                 GROUP BY attrelid HAVING count(*) = 4) THEN
    RAISE EXCEPTION 'FAIL: volume_daily is missing provenance columns';
  END IF;

  -- Both day-series views moved together. Repointing one alone makes todayVolume stop
  -- equalling the sum of buckets in the document a founder reads under pressure.
  v_def := pg_get_viewdef('public.crisis_detection_volume_daily'::regclass, true);
  IF v_def NOT LIKE '%crisis_event_day%' THEN
    RAISE EXCEPTION 'FAIL: volume_daily is still on ingest time';
  END IF;
  v_def := pg_get_viewdef('public.crisis_detection_daily'::regclass, true);
  IF v_def NOT LIKE '%crisis_event_day%' THEN
    RAISE EXCEPTION 'FAIL: detection_daily is still on ingest time';
  END IF;

  -- Liveness answers "is the pipeline dead" — an INGEST question. On event time a healthy
  -- pipeline draining old events pages as dead.
  v_def := pg_get_viewdef('public.crisis_detection_liveness'::regclass, true);
  IF v_def LIKE '%crisis_event_day%' THEN
    RAISE EXCEPTION 'FAIL: liveness was moved to event time — it must stay on created_at';
  END IF;
  IF v_def NOT LIKE '%created_at%' THEN
    RAISE EXCEPTION 'FAIL: liveness no longer reads created_at';
  END IF;
  RAISE NOTICE 'PASS: day-series views moved together on event time; liveness stays on ingest';
END $$;

-- ============ Test 9b: the arrival view exists and is NOT on event time ============
-- It is the un-truncated counterpart to the occurrence series. If this ever gets
-- "consistently" repointed onto detected_on it stops being able to see the leading edge,
-- and the backlog-vs-surge distinction collapses.
DO $$
DECLARE v_def text;
BEGIN
  IF to_regclass('public.crisis_detection_arrival_daily') IS NULL THEN
    RAISE EXCEPTION 'FAIL: public.crisis_detection_arrival_daily does not exist';
  END IF;
  v_def := pg_get_viewdef('public.crisis_detection_arrival_daily'::regclass, true);
  IF v_def LIKE '%crisis_event_day%' THEN
    RAISE EXCEPTION 'FAIL: arrival view was moved to event time — it must stay on created_at';
  END IF;
  IF v_def NOT LIKE '%created_at%' THEN
    RAISE EXCEPTION 'FAIL: arrival view does not read created_at';
  END IF;
  RAISE NOTICE 'PASS: arrival view exists and is keyed on ingest time';
END $$;

-- ============ Test 10: watermark columns exist and are nullable ============
-- Nullable is load-bearing: a pre-deploy alerter row leaves them NULL, and NULL must read
-- as cold_start rather than as an empty map (which would page a full-series backfill).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_attribute
                 WHERE attrelid = 'public.crisis_alert_runs'::regclass
                   AND attname = 'evaluated_counts' AND NOT attnotnull) THEN
    RAISE EXCEPTION 'FAIL: crisis_alert_runs.evaluated_counts missing or NOT NULL';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_attribute
                 WHERE attrelid = 'public.crisis_alert_runs'::regclass
                   AND attname = 'backfill_status' AND NOT attnotnull) THEN
    RAISE EXCEPTION 'FAIL: crisis_alert_runs.backfill_status missing or NOT NULL';
  END IF;
  RAISE NOTICE 'PASS: evaluated_counts + backfill_status present and nullable';
END $$;

-- ============ Test 11: access posture survived the replace ============
-- CREATE OR REPLACE preserves grants; a future DROP + CREATE would silently lose them,
-- and the grants live in a DIFFERENT migration file from the view definitions.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT unnest(ARRAY['crisis_detection_daily',
                               'crisis_detection_volume_daily',
                               'crisis_detection_liveness',
                               'crisis_detection_arrival_daily']) AS v
  LOOP
    IF has_table_privilege('anon', 'public.' || r.v, 'SELECT')
    OR has_table_privilege('authenticated', 'public.' || r.v, 'SELECT') THEN
      RAISE EXCEPTION 'FAIL: anon/authenticated can read public.% (must be operator-only)', r.v;
    END IF;
    IF NOT has_table_privilege('service_role', 'public.' || r.v, 'SELECT') THEN
      RAISE EXCEPTION 'FAIL: service_role lost SELECT on public.% — alerter reads would fail', r.v;
    END IF;
  END LOOP;
  RAISE NOTICE 'PASS: views operator-only; service_role retains SELECT on all three';
END $$;

SELECT 'ALL DEBUG-541 EVENT-TIME TESTS PASSED' AS result;
