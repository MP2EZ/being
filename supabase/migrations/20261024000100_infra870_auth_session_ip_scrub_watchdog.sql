-- INFRA-870 — page the founder when the INFRA-851 auth-session IP scrub stops.
--
-- THE GAP. auth-session-ip-scrub (20261023000200) is what makes privacy-policy v1.30's "the IP
-- address and user agent are deleted within a day of each connection" true, and it fails safe in
-- the wrong direction for that promise: a stopped job leaves the values in place. Until now the
-- only check was the runbook's per-release probe, and nothing paged (DPIA control 23).
--
-- TWO FUNCTIONS, NO EDGE FUNCTION. Pure SQL on the existing watchdog pattern
-- (subscription_verification_watchdog, 20260618000000), so there is no Deno.env.get and no
-- deploy-manifest.json entry.
--   auth_session_ip_scrub_health()   read-only predicate, returns counts, ages and statuses only.
--   auth_session_ip_scrub_watchdog() returns early when healthy, else one direct Resend POST.
--
-- BREACH, any of:
--   1. cron.job has no active 'auth-session-ip-scrub' row.
--   2. No 'ok' heartbeat for the job in retention_prune_runs within 3 hours. Never-ran is a
--      breach. The heartbeat is read, never cron.job_run_details: the scrub catches its own
--      errors and writes an 'error' heartbeat, so cron records those runs as succeeded.
--   3. An auth.sessions row still carries ip or user_agent more than 3 hours after its latest
--      activity (GREATEST(created_at, updated_at, refreshed_at)), the runbook probe's predicate.
-- A single error row alone does not page: the next hourly run usually clears it, and three
-- missed hours trip (2) anyway. The scrub runs at :25 and this check at :10 every 3 hours, so
-- two missed runs stay quiet and the third pages, about 3 hours before the oldest value reaches
-- a day. Re-alerts on every unhealthy run.
--
-- PII-FREE. auth.sessions is read with count(*) only; ip and user_agent are never selected into
-- a variable, the result or the email. No uid, no SQLERRM (a message can quote a row). The email
-- is built only from the health result.
--
-- TRUST DOMAIN. Ops monitoring, so it reuses the ops-domain Vault secrets
-- subscription_alert_resend_key / _from / _to by name (already bootstrapped on prod for
-- INFRA-282), never crisis_alert_*. Missing secrets → RAISE WARNING and return, no exception.
--
-- STRICTLY READ-ONLY. Writes nothing, and never touches the session timestamps INFRA-848 reads.
-- The cron command names only the watchdog: INFRA-851 Test 4 fails if any other job's command
-- mentions auth.sessions or run_auth_session_ip_scrub.
--
-- RESIDUAL (accepted). This runs inside the project it watches, so a project-wide pg_cron stall or
-- a paused project silences it together with the scrub. There is no external dead-man switch.
--
-- Operator-only: both revoked from PUBLIC, anon, authenticated and service_role. pg_cron runs the
-- watchdog as its owner, which must read auth.sessions past RLS, or condition 3 counts zero and
-- never fires; the DO block below refuses the push when it cannot.
--
-- The founder runs the push. Idempotent: functions replaced, job unscheduled before rescheduling.
-- Pinned by supabase/tests/infra870_auth_session_ip_scrub_watchdog.sql.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.auth_session_ip_scrub_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
SET lock_timeout = '1s'
AS $$
DECLARE
  v_job_active    boolean;
  v_last_ok       timestamptz;
  v_latest_status text;
  v_populated     integer;
  v_reasons       text[] := ARRAY[]::text[];
BEGIN
  SELECT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auth-session-ip-scrub' AND active)
    INTO v_job_active;

  SELECT max(ran_at) INTO v_last_ok
    FROM public.retention_prune_runs
   WHERE job_name = 'auth-session-ip-scrub' AND status = 'ok';

  SELECT status INTO v_latest_status
    FROM public.retention_prune_runs
   WHERE job_name = 'auth-session-ip-scrub'
   ORDER BY ran_at DESC, id DESC
   LIMIT 1;

  SELECT count(*) INTO v_populated
    FROM auth.sessions
   WHERE (ip IS NOT NULL OR user_agent IS NOT NULL)
     AND GREATEST(created_at, updated_at, refreshed_at AT TIME ZONE 'UTC') < now() - interval '3 hours';

  IF NOT v_job_active THEN
    v_reasons := array_append(v_reasons, 'job_missing_or_inactive');
  END IF;
  IF v_last_ok IS NULL OR v_last_ok < now() - interval '3 hours' THEN
    v_reasons := array_append(v_reasons, 'no_ok_run_within_3h');
  END IF;
  IF v_populated > 0 THEN
    v_reasons := array_append(v_reasons, 'populated_past_interval');
  END IF;

  RETURN jsonb_build_object(
    'breach',                  cardinality(v_reasons) > 0,
    'reasons',                 to_jsonb(v_reasons),
    'job_active',              v_job_active,
    'hours_since_last_ok',     floor(EXTRACT(EPOCH FROM (now() - v_last_ok)) / 3600)::integer,
    'latest_status',           v_latest_status,
    'populated_past_interval', v_populated
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.auth_session_ip_scrub_health()
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public.auth_session_ip_scrub_health() IS
  'INFRA-870: read-only health of auth-session-ip-scrub. breach when the job is missing or '
  'inactive, no ok heartbeat in 3h, or a session holds ip/user_agent 3h past its last activity. '
  'Counts, ages and statuses only. Operator-only.';

CREATE OR REPLACE FUNCTION public.auth_session_ip_scrub_watchdog()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_health     jsonb := public.auth_session_ip_scrub_health();
  v_resend_key text;
  v_from       text;
  v_to         text;
  v_msg        text;
BEGIN
  IF NOT (v_health->>'breach')::boolean THEN
    RETURN;
  END IF;

  SELECT decrypted_secret INTO v_resend_key FROM vault.decrypted_secrets WHERE name = 'subscription_alert_resend_key';
  SELECT decrypted_secret INTO v_from       FROM vault.decrypted_secrets WHERE name = 'subscription_alert_from';
  SELECT decrypted_secret INTO v_to         FROM vault.decrypted_secrets WHERE name = 'subscription_alert_to';
  IF v_resend_key IS NULL OR v_from IS NULL OR v_to IS NULL THEN
    RAISE WARNING 'auth_session_ip_scrub_watchdog: escalation secrets missing from Vault; cannot send';
    RETURN;
  END IF;

  v_msg := format(
    'WATCHDOG: the hourly auth-session IP scrub (INFRA-851) is not keeping the privacy policy''s '
    'promise that the IP address and user agent are deleted within a day of each connection. '
    'Reasons: %s. Job active: %s. Hours since last ok run: %s. Latest run status: %s. '
    'Sessions still carrying a value 3h past their last activity: %s. '
    'Investigate: SELECT public.auth_session_ip_scrub_health(); '
    'SELECT * FROM public.retention_prune_health WHERE job_name = ''auth-session-ip-scrub''; '
    'SELECT jobname, schedule, active FROM cron.job WHERE jobname = ''auth-session-ip-scrub''; '
    'Respond per supabase-operations-runbook.md: restore the job, then run the scrub by hand '
    'before the oldest value reaches a day. (Privacy retention, ops trust domain.)',
    array_to_string(ARRAY(SELECT jsonb_array_elements_text(v_health->'reasons')), ', '),
    v_health->>'job_active',
    COALESCE(v_health->>'hours_since_last_ok', 'never'),
    COALESCE(v_health->>'latest_status', 'none'),
    v_health->>'populated_past_interval'
  );

  -- Fixed destination constant, never derived from table data.
  PERFORM net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_resend_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', v_from,
      'to', v_to,
      'subject', '[Being] WATCHDOG — auth-session IP scrub stalled (privacy retention)',
      'text', v_msg
    )
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.auth_session_ip_scrub_watchdog()
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public.auth_session_ip_scrub_watchdog() IS
  'INFRA-870: emails the founder via a direct Resend POST (subscription_alert_* Vault secrets) '
  'when auth_session_ip_scrub_health() reports a breach. PII-free. Writes nothing. Operator-only.';

SELECT cron.unschedule('auth-session-ip-scrub-watchdog')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auth-session-ip-scrub-watchdog');
-- :10 every 3 hours; the scrub runs hourly at :25.
SELECT cron.schedule(
  'auth-session-ip-scrub-watchdog',
  '10 */3 * * *',
  $cron$ SET statement_timeout = '5s'; SELECT public.auth_session_ip_scrub_watchdog(); $cron$
);

-- Fail closed: a watchdog that cannot see auth.sessions would report healthy forever.
DO $$
DECLARE
  wd      constant regprocedure := 'public.auth_session_ip_scrub_watchdog()'::regprocedure;
  hl      constant regprocedure := 'public.auth_session_ip_scrub_health()'::regprocedure;
  v_owner name;
  r       text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job
                  WHERE jobname = 'auth-session-ip-scrub-watchdog' AND schedule = '10 */3 * * *' AND active) THEN
    RAISE EXCEPTION 'INFRA-870: auth-session-ip-scrub-watchdog is not scheduled';
  END IF;
  IF NOT (SELECT prosecdef FROM pg_proc WHERE oid = wd) THEN
    RAISE EXCEPTION 'INFRA-870: auth_session_ip_scrub_watchdog is not SECURITY DEFINER';
  END IF;
  IF NOT ('search_path=public, pg_temp' = ANY (coalesce((SELECT proconfig FROM pg_proc WHERE oid = wd), '{}')))
     OR NOT ('search_path=public, pg_temp' = ANY (coalesce((SELECT proconfig FROM pg_proc WHERE oid = hl), '{}'))) THEN
    RAISE EXCEPTION 'INFRA-870: a watchdog function does not pin search_path';
  END IF;
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF has_function_privilege(r, wd, 'EXECUTE') OR has_function_privilege(r, hl, 'EXECUTE') THEN
      RAISE EXCEPTION 'INFRA-870: % can EXECUTE a watchdog function', r;
    END IF;
  END LOOP;
  SELECT proowner::regrole::name INTO v_owner FROM pg_proc WHERE oid = wd;
  IF NOT has_table_privilege(v_owner, 'auth.sessions', 'SELECT') THEN
    RAISE EXCEPTION 'INFRA-870: % cannot SELECT auth.sessions', v_owner;
  END IF;
  IF (SELECT relrowsecurity FROM pg_class WHERE oid = 'auth.sessions'::regclass)
     AND NOT (SELECT rolbypassrls FROM pg_roles WHERE rolname = v_owner)
     AND (SELECT relowner::regrole::name FROM pg_class WHERE oid = 'auth.sessions'::regclass) <> v_owner THEN
    RAISE EXCEPTION 'INFRA-870: auth.sessions has RLS on and % neither bypasses it nor owns the table', v_owner;
  END IF;
END $$;

-- =====================================================
-- ROLLBACK (manual). Removes the alert only; the scrub is untouched.
-- =====================================================
-- SELECT cron.unschedule('auth-session-ip-scrub-watchdog');
-- DROP FUNCTION IF EXISTS public.auth_session_ip_scrub_watchdog();
-- DROP FUNCTION IF EXISTS public.auth_session_ip_scrub_health();
