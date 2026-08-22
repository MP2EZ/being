-- DEBUG-340 analytics-retention verification suite — proves the two-tier retention
-- carve-out and the schedule that enforces it.
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

-- ============ Test 2: the body is category-aware, not a blanket delete ============
DO $$
DECLARE
  body TEXT;
BEGIN
  SELECT prosrc INTO body FROM pg_proc
   WHERE proname = 'cleanup_old_analytics' AND pronamespace = 'public'::regnamespace;

  IF body NOT LIKE '%crisis_detected%' THEN
    RAISE EXCEPTION
      'FAIL(2): cleanup_old_analytics does not mention crisis_detected — the carve-out is gone, '
      'so crisis rows are being pruned on the general tier again (the original DEBUG-340 defect)';
  END IF;
  IF body NOT LIKE '%3 years%' THEN
    RAISE EXCEPTION 'FAIL(2): cleanup_old_analytics has no 3-year branch (privacy-policy §7.2)';
  END IF;
  IF body NOT LIKE '%90 days%' THEN
    RAISE EXCEPTION 'FAIL(2): cleanup_old_analytics has no 90-day branch (privacy-policy §7.1)';
  END IF;

  RAISE NOTICE 'PASS(2): body carries both retention tiers';
END $$;

-- ============ Test 3: BEHAVIOUR — a 100-day-old crisis row SURVIVES ============
-- The load-bearing test. A blanket 90-day delete passes tests 1, 2 and 4 by accident if
-- someone reintroduces it with the right strings in a comment; only executing it proves
-- the carve-out works.
BEGIN;

INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
VALUES (:'U'::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'debug340-retention@test.invalid', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
-- on_auth_user_created provisions the matching public.users row.

INSERT INTO public.analytics_events (user_id, event_type, properties, session_id, created_at)
VALUES
  -- 100 days old, crisis: MUST survive (retained 3 years).
  (:'U'::uuid, 'crisis_detected',
   '{"trigger_type":"phq9_total","severity_bucket":"severe"}'::jsonb,
   'session_2026-04-28_debug340a', NOW() - INTERVAL '100 days'),
  -- 100 days old, non-crisis: MUST be deleted (90-day tier).
  (:'U'::uuid, 'screen_view', '{}'::jsonb,
   'session_2026-04-28_debug340b', NOW() - INTERVAL '100 days'),
  -- 10 days old, non-crisis: MUST survive (inside the 90-day window).
  (:'U'::uuid, 'screen_view', '{}'::jsonb,
   'session_2026-07-27_debug340c', NOW() - INTERVAL '10 days'),
  -- 4 years old, crisis: MUST be deleted (past the 3-year tier). Proves the crisis
  -- branch is a real bound and not an unconditional exemption — the failure mode that
  -- would quietly restore indefinite retention.
  (:'U'::uuid, 'crisis_detected',
   '{"trigger_type":"phq9_item9","severity_bucket":"severe"}'::jsonb,
   'session_2022-08-06_debug340d', NOW() - INTERVAL '4 years');

SELECT public.cleanup_old_analytics();

DO $$
DECLARE
  crisis_100d INTEGER;
  plain_100d  INTEGER;
  plain_10d   INTEGER;
  crisis_4y   INTEGER;
BEGIN
  SELECT count(*) INTO crisis_100d FROM public.analytics_events
   WHERE session_id = 'session_2026-04-28_debug340a';
  SELECT count(*) INTO plain_100d FROM public.analytics_events
   WHERE session_id = 'session_2026-04-28_debug340b';
  SELECT count(*) INTO plain_10d FROM public.analytics_events
   WHERE session_id = 'session_2026-07-27_debug340c';
  SELECT count(*) INTO crisis_4y FROM public.analytics_events
   WHERE session_id = 'session_2022-08-06_debug340d';

  IF crisis_100d <> 1 THEN
    RAISE EXCEPTION
      'FAIL(3): a 100-day-old crisis_detected row was DELETED. privacy-policy §7.2 promises '
      '3 years; the carve-out is broken.';
  END IF;
  IF plain_100d <> 0 THEN
    RAISE EXCEPTION 'FAIL(3): a 100-day-old non-crisis row survived the 90-day tier (§7.1)';
  END IF;
  IF plain_10d <> 1 THEN
    RAISE EXCEPTION 'FAIL(3): a 10-day-old non-crisis row was deleted — the prune is too aggressive';
  END IF;
  IF crisis_4y <> 0 THEN
    RAISE EXCEPTION
      'FAIL(3): a 4-year-old crisis_detected row survived. The crisis branch must be a BOUND, '
      'not an exemption — otherwise server retention is indefinite again.';
  END IF;

  RAISE NOTICE 'PASS(3): 100d crisis kept, 100d non-crisis pruned, 10d kept, 4y crisis pruned';
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
-- Without it the daily prune full-scans a table designed to hold 3 years of history.
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
