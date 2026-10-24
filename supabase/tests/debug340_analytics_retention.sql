-- DEBUG-340 analytics-retention verification suite — proves the retention rule and the
-- schedule that enforces it. (Two tiers until INFRA-861; one 90-day rule since.)
--
-- WHAT THIS EXISTS TO CATCH. Before DEBUG-340, cleanup_old_analytics() deleted ALL of
-- analytics_events at 90 days with no event_type carve-out, contradicting the 3-year
-- crisis promise in privacy-policy §7.2 — and it was never cron.schedule'd, so nothing
-- pruned anything and real server retention was INDEFINITE. Both halves of that defect
-- are silent: neither shows up in application tests, neither breaks a build, and the
-- second is invisible even to a careful read of the migration (the absence of a call).
-- Test 3 below is the one that would have caught the original bug; test 4 is the one that
-- would have caught the missing schedule.
--
-- HOW TO RUN (local stack; no remote/paid resources):
--   supabase start && supabase db reset            # applies all migrations
--   docker exec -i supabase_db_$(basename "$PWD") psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/debug340_analytics_retention.sql
--   # exit 0 + "ALL DEBUG-340 RETENTION TESTS PASSED" = green; any RAISE = a real regression.
--
-- Do NOT run this against the shared prod project — it inserts test rows. It wraps its
-- data tests in a transaction that is ROLLED BACK, and is re-runnable.
--
-- NOT YET VALIDATED ON THE LOCAL STACK — authored 2026-08-06 alongside the migration.
-- Run it before/with the manual `supabase db push` and record the result here, matching
-- infra265_probe_verification.sql's "Last validated:" line.

\set ON_ERROR_STOP on

\set U '99999999-9999-9999-9999-999999999999'

-- ============ Test 1: the function exists with the right security posture ============
DO $$
DECLARE
  fn pg_proc%ROWTYPE;
BEGIN
  SELECT * INTO fn FROM pg_proc
   WHERE proname = 'cleanup_old_analytics'
     AND pronamespace = 'public'::regnamespace;

  IF fn IS NULL THEN
    RAISE EXCEPTION 'FAIL(1): public.cleanup_old_analytics() does not exist';
  END IF;

  -- pg_cron runs jobs as the job owner; an unpinned search_path on a SECURITY DEFINER
  -- function is both a Supabase advisor finding and a genuine hijack surface.
  IF NOT fn.prosecdef THEN
    RAISE EXCEPTION 'FAIL(1): cleanup_old_analytics is not SECURITY DEFINER';
  END IF;
  IF fn.proconfig IS NULL
     OR NOT EXISTS (SELECT 1 FROM unnest(fn.proconfig) c WHERE c LIKE 'search_path=%') THEN
    RAISE EXCEPTION 'FAIL(1): cleanup_old_analytics has no pinned search_path';
  END IF;

  RAISE NOTICE 'PASS(1): function exists, SECURITY DEFINER, search_path pinned';
END $$;

-- ============ Test 2: (retired) ============
-- Asserted the body's strings ('crisis_detected', '3 years', '90 days'). INFRA-861 made
-- retention a single 90-day rule, and the crisis ruling pins the boundary by behaviour
-- (test 3), never by matching the function body.

-- ============ Test 3: BEHAVIOUR — one 90-day boundary for every event type ============
-- INFRA-861: crisis rows carry no identity, so the 3-year tier's justification no longer
-- applies (privacy-policy §7.3: 90 days from receipt). 88 days kept, 92 days deleted, for
-- crisis and non-crisis rows alike. A crisis row's created_at is cut to its UTC day, so its
-- age here is 88–89 or 92–93 days: still on the same side of the boundary.
BEGIN;

INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
VALUES (:'U'::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'debug340-retention@test.invalid', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
-- on_auth_user_created provisions the matching public.users row.

INSERT INTO public.analytics_events (user_id, event_type, properties, session_id, created_at)
VALUES
  -- The trigger nulls user_id/session_id on crisis rows, so they are found by their
  -- detected_on marker instead.
  (NULL, 'crisis_detected',
   '{"trigger_type":"manual_override","severity_bucket":"high","detected_on":"1999-03-40"}'::jsonb,
   NULL, NOW() - INTERVAL '88 days'),
  (NULL, 'crisis_detected',
   '{"trigger_type":"combined_high_risk","severity_bucket":"high","detected_on":"1999-03-41"}'::jsonb,
   NULL, NOW() - INTERVAL '92 days'),
  (:'U'::uuid, 'screen_view', '{}'::jsonb, 'session_2026-01-01_debug340e', NOW() - INTERVAL '88 days'),
  (:'U'::uuid, 'screen_view', '{}'::jsonb, 'session_2026-01-01_debug340f', NOW() - INTERVAL '92 days');

SELECT public.cleanup_old_analytics();

DO $$
DECLARE
  crisis_88d INTEGER;
  crisis_92d INTEGER;
  plain_88d  INTEGER;
  plain_92d  INTEGER;
BEGIN
  SELECT count(*) INTO crisis_88d FROM public.analytics_events
   WHERE event_type = 'crisis_detected' AND properties->>'detected_on' = '1999-03-40';
  SELECT count(*) INTO crisis_92d FROM public.analytics_events
   WHERE event_type = 'crisis_detected' AND properties->>'detected_on' = '1999-03-41';
  SELECT count(*) INTO plain_88d FROM public.analytics_events WHERE session_id = 'session_2026-01-01_debug340e';
  SELECT count(*) INTO plain_92d FROM public.analytics_events WHERE session_id = 'session_2026-01-01_debug340f';

  IF crisis_88d <> 1 OR plain_88d <> 1 THEN
    RAISE EXCEPTION 'FAIL(3): an 88-day-old row was deleted (crisis %, other %) — the prune is too aggressive',
      crisis_88d, plain_88d;
  END IF;
  IF crisis_92d <> 0 THEN
    RAISE EXCEPTION
      'FAIL(3): a 92-day-old crisis_detected row survived. privacy-policy §7.3 publishes 90 days '
      'from receipt; a crisis carve-out is back.';
  END IF;
  IF plain_92d <> 0 THEN
    RAISE EXCEPTION 'FAIL(3): a 92-day-old non-crisis row survived the 90-day rule (§7.1)';
  END IF;

  RAISE NOTICE 'PASS(3): 88d kept and 92d pruned, crisis and non-crisis alike';
END $$;

ROLLBACK;

-- ============ Test 4: the job is actually SCHEDULED ============
-- The defect that made all of the above moot: the function existed since the base schema
-- and was never scheduled, so nothing ran and retention was indefinite in practice.
DO $$
DECLARE
  sched TEXT;
BEGIN
  SELECT schedule INTO sched FROM cron.job WHERE jobname = 'analytics-retention-prune';
  IF sched IS NULL THEN
    RAISE EXCEPTION
      'FAIL(4): cron job "analytics-retention-prune" is not scheduled. The function can be '
      'perfect and retention still be INDEFINITE — this is the original DEBUG-340 defect.';
  END IF;
  RAISE NOTICE 'PASS(4): analytics-retention-prune scheduled (%)', sched;
END $$;

-- ============ Test 5: the supporting index exists ============
-- Without it the daily prune full-scans the table, and the INFRA-861 daily ceiling's count
-- (event_type, created_at = today) has no index to use.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'public' AND indexname = 'idx_analytics_retention'
  ) THEN
    RAISE EXCEPTION 'FAIL(5): idx_analytics_retention missing — the prune will full-scan';
  END IF;
  RAISE NOTICE 'PASS(5): idx_analytics_retention present';
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL DEBUG-340 RETENTION TESTS PASSED'; END $$;
