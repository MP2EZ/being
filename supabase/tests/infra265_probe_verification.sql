-- INFRA-265 synthetic-liveness-probe verification suite — proves the migration's schema,
-- access posture, the analytics_events reject-guard, the cron schedule, and the marker
-- mechanics the alerter reads. (The probe DECISION logic — live/dead/cold_start/skew and
-- the never-downgrade composition — is unit-tested in deno: supabase/functions/_tests/
-- crisis-probe-liveness.test.ts. This file proves the SQL/DB side those tests assume.)
--
-- HOW TO RUN (local stack; no remote/paid resources):
--   supabase start && supabase db reset            # applies all migrations
--   docker exec -i supabase_db_$(basename "$PWD") psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/infra265_probe_verification.sql
--   # exit 0 + "ALL INFRA-265 PROBE TESTS PASSED" = green; any RAISE = a real regression.
--
-- Do NOT run this against the shared prod project — it inserts/rolls back test rows.
-- It is self-cleaning + re-runnable.
--
-- Last validated: 2026-06-13 on the local stack — 7/7 PASS.

\set ON_ERROR_STOP on

-- A throwaway principal for the reject-guard test (rolled back; on_auth_user_created
-- provisions the matching public.users row so an analytics_events FK is satisfiable).
\set U '99999999-9999-9999-9999-999999999999'

-- ============ Test 1: marker table exists, RLS on, ZERO policies ============
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'crisis_liveness_probe'
                 AND relnamespace = 'public'::regnamespace) THEN
    RAISE EXCEPTION 'FAIL: public.crisis_liveness_probe does not exist';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'crisis_liveness_probe') THEN
    RAISE EXCEPTION 'FAIL: RLS is not enabled on crisis_liveness_probe';
  END IF;
  IF (SELECT count(*) FROM pg_policies WHERE tablename = 'crisis_liveness_probe') <> 0 THEN
    RAISE EXCEPTION 'FAIL: crisis_liveness_probe has policies (expected RLS-on + ZERO policies)';
  END IF;
  RAISE NOTICE 'PASS: crisis_liveness_probe exists, RLS on, 0 policies (doubly-locked)';
END $$;

-- ============ Test 2: access posture — anon/authenticated denied, service_role allowed =
DO $$
BEGIN
  IF has_table_privilege('anon',          'public.crisis_liveness_probe', 'SELECT')
  OR has_table_privilege('authenticated', 'public.crisis_liveness_probe', 'SELECT')
  OR has_table_privilege('anon',          'public.crisis_liveness_probe', 'INSERT')
  OR has_table_privilege('authenticated', 'public.crisis_liveness_probe', 'INSERT') THEN
    RAISE EXCEPTION 'FAIL: anon/authenticated can reach crisis_liveness_probe (must be denied)';
  END IF;
  IF NOT (has_table_privilege('service_role', 'public.crisis_liveness_probe', 'SELECT')
      AND has_table_privilege('service_role', 'public.crisis_liveness_probe', 'INSERT')) THEN
    RAISE EXCEPTION 'FAIL: service_role lacks SELECT+INSERT on crisis_liveness_probe';
  END IF;
  RAISE NOTICE 'PASS: anon/authenticated denied; service_role has SELECT+INSERT';
END $$;

-- ============ Test 3: probe_type is pinned + status is enum-constrained ============
DO $$
BEGIN
  -- probe_type may only ever be the synthetic constant.
  BEGIN
    INSERT INTO public.crisis_liveness_probe (probe_type, status) VALUES ('real_crisis', 'ok');
    RAISE EXCEPTION 'FAIL: crisis_liveness_probe accepted a non-synthetic probe_type';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS: probe_type CHECK pins the synthetic constant';
  END;
  -- status may only be ok|error.
  BEGIN
    INSERT INTO public.crisis_liveness_probe (status) VALUES ('bogus');
    RAISE EXCEPTION 'FAIL: crisis_liveness_probe accepted an out-of-enum status';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS: status CHECK rejects values outside ok|error';
  END;
END $$;

-- ============ Test 4: reject-guard on analytics_events ============
-- A synthetic-tagged row MUST be rejected; an equivalent real row MUST be accepted.
-- Wrapped + rolled back so it leaves no data. The throwaway auth.user satisfies the FK
-- and the session_id format CHECK so the ONLY constraint that can trip is the guard.
BEGIN;
  DELETE FROM auth.users WHERE id = :'U';
  INSERT INTO auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
  VALUES (:'U', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now());

  DO $$
  BEGIN
    -- NEGATIVE: probe_type-tagged row rejected at the DB layer.
    BEGIN
      INSERT INTO public.analytics_events (user_id, event_type, properties, session_id)
      VALUES ('99999999-9999-9999-9999-999999999999', 'crisis_detected',
              '{"probe_type":"synthetic_liveness"}'::jsonb, 'session_2026-06-13_test01');
      RAISE EXCEPTION 'FAIL: analytics_events accepted a probe_type-tagged synthetic row';
    EXCEPTION WHEN check_violation THEN
      RAISE NOTICE 'PASS: reject-guard blocked the synthetic row (check_violation)';
    END;

    -- POSITIVE CONTROL: an equivalent real crisis_detected row WITHOUT probe_type passes.
    INSERT INTO public.analytics_events (user_id, event_type, properties, session_id)
    VALUES ('99999999-9999-9999-9999-999999999999', 'crisis_detected',
            '{"trigger_type":"phq9_severe_score","severity_bucket":"high"}'::jsonb,
            'session_2026-06-13_test01');
    RAISE NOTICE 'PASS: a real crisis_detected row (no probe_type) is still accepted';
  END $$;
ROLLBACK;

-- ============ Test 5: crisis_alert_runs gained probe_status ============
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'crisis_alert_runs' AND column_name = 'probe_status') THEN
    RAISE EXCEPTION 'FAIL: crisis_alert_runs.probe_status column missing';
  END IF;
  RAISE NOTICE 'PASS: crisis_alert_runs.probe_status present (alerter records the probe axis)';
END $$;

-- ============ Test 6: cron jobs scheduled ============
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job
                 WHERE jobname = 'crisis-liveness-probe' AND schedule = '0 */6 * * *') THEN
    RAISE EXCEPTION 'FAIL: crisis-liveness-probe cron not scheduled every 6h';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'crisis-liveness-probe-prune') THEN
    RAISE EXCEPTION 'FAIL: crisis-liveness-probe-prune cron not scheduled';
  END IF;
  RAISE NOTICE 'PASS: probe + prune cron jobs scheduled';
END $$;

-- ============ Test 7: marker mechanics — what the alerter reads ============
-- Proves a probe write lands and MAX(probed_at) reflects it (fresh), then that a backdated
-- marker is observably stale (the input that drives evaluateProbeLiveness -> 'dead').
BEGIN;
  INSERT INTO public.crisis_liveness_probe (status, source, detail)
  VALUES ('ok', 'verification-test', 'infra265 marker mechanics');

  DO $$
  DECLARE v_age_hours numeric;
  BEGIN
    -- Fresh marker: age ~0h, well under the 12h default threshold (-> 'live').
    SELECT extract(epoch FROM (now() - max(probed_at))) / 3600
      INTO v_age_hours FROM public.crisis_liveness_probe WHERE source = 'verification-test';
    IF v_age_hours IS NULL OR v_age_hours > 1 THEN
      RAISE EXCEPTION 'FAIL: fresh marker not readable as recent (age=%h)', round(v_age_hours, 2);
    END IF;
    RAISE NOTICE 'PASS: fresh marker readable; MAX(probed_at) age %h (-> live)', round(v_age_hours, 2);

    -- Backdate past the 12h staleness threshold and confirm it is observably stale
    -- (this is the exact MAX(probed_at) the alerter passes to evaluateProbeLiveness -> dead).
    UPDATE public.crisis_liveness_probe
      SET probed_at = now() - interval '13 hours' WHERE source = 'verification-test';
    SELECT extract(epoch FROM (now() - max(probed_at))) / 3600
      INTO v_age_hours FROM public.crisis_liveness_probe WHERE source = 'verification-test';
    IF v_age_hours < 12 THEN
      RAISE EXCEPTION 'FAIL: backdated marker not stale (age=%h, expected >=12h)', round(v_age_hours, 2);
    END IF;
    RAISE NOTICE 'PASS: backdated marker is stale; age %h >= 12h (-> dead/authoritative)', round(v_age_hours, 2);
  END $$;
ROLLBACK;

SELECT 'ALL INFRA-265 PROBE TESTS PASSED' AS result;
