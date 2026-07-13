-- Subscription-verification-failure watchdog (INFRA-282).
--
-- Closes the "Subscription-verification-failure alert" line item of the five INFRA-87
-- post-launch monitoring alerts. A pg_cron dead-man's-switch mirroring `crisis_alert_watchdog`
-- (20260607000000_crisis_alert_cron.sql) but pointed at the INFRA-266 grace-period heartbeat
-- table `grace_period_automation_runs` instead of `crisis_alert_runs`. It escalates via an
-- INDEPENDENT direct Resend POST when the `grace-period-automation` daily job has had no clean
-- run in 26h OR its most recent run errored — i.e. trial/grace-expiry + receipt re-verification
-- has silently stopped (cron unscheduled, edge function erroring, project paused, or a run that
-- threw). Without this, a dead subscription pipeline is invisible until a missed renewal.
--
-- TRUST DOMAIN — deliberately SEPARATE from the crisis pipeline (INFRA-219/264/265).
--   This is subscription / ops monitoring, NOT the safety-critical crisis path. It uses its
--   OWN distinct Vault secrets (`subscription_alert_*`) and its own channel, never the crisis
--   alerter's `crisis_alert_*` secrets. The operator MAY point them at the same Resend account
--   + founder inbox, but the names stay distinct so the two domains rotate independently. This
--   watchdog must never sit in a detection / 988 / intervention path. (It also needs no external
--   healthchecks.io dead-man's-switch: grace-period is not life-safety, so the in-Supabase
--   watchdog is sufficient — that external layer is reserved for the crisis pipeline.)
--
-- SECURITY / SECRETS — NO SECRET VALUE APPEARS IN THIS FILE.
--   The watchdog reads secrets from Supabase Vault BY NAME at run time. Bootstrap these OUT OF
--   BAND before the job can send (Supabase dashboard -> Project Settings -> Vault, or a
--   non-committed psql session):
--     subscription_alert_resend_key  — Resend API key (independent direct-send path).
--     subscription_alert_from        — e.g. 'Being Alerts <alerts@being.fyi>'
--     subscription_alert_to          — founder destination address.
--   pg_net request/response hardening + the `net`-schema-not-exposed boundary were established
--   once by 20260607000000_crisis_alert_cron and are not repeated here.
--
-- PII-free: the escalation payload carries only ops status text + timestamps — never user_id,
-- subscription_id, receipt data, or any per-user counter (mirrors the INFRA-219 DPIA boundary).
--
-- Idempotent: CREATE OR REPLACE + guarded unschedule/schedule; safe to re-run.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ---------------------------------------------------------------------------
-- Watchdog: makes the grace-period-automation job observable. Escalates (independent direct
-- Resend POST) when the daily automation has not cleanly run recently OR its most recent run
-- errored. Reads ONLY the INFRA-266 heartbeat table; writes nothing. SECURITY DEFINER so it can
-- read Vault + post via pg_net. Mirrors crisis_alert_watchdog() exactly, minus the 'alerted'
-- status (grace-period status is ok|error only — it is automation, not an alerter).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.subscription_verification_watchdog()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, vault, extensions
AS $$
DECLARE
  v_last_ok        timestamptz;
  v_latest_status  text;
  v_resend_key     text;
  v_from           text;
  v_to             text;
  v_msg            text;
BEGIN
  SELECT max(ran_at) INTO v_last_ok
  FROM public.grace_period_automation_runs
  WHERE status = 'ok';

  SELECT status INTO v_latest_status
  FROM public.grace_period_automation_runs
  ORDER BY ran_at DESC
  LIMIT 1;

  -- Healthy if a clean run landed within 26h (automation runs daily at 02:00 UTC; 26h tolerates
  -- one slightly-late run, not a missed day) AND the most recent run did not error.
  IF v_last_ok IS NOT NULL
     AND v_last_ok >= now() - interval '26 hours'
     AND v_latest_status IS DISTINCT FROM 'error' THEN
    RETURN;
  END IF;

  SELECT decrypted_secret INTO v_resend_key FROM vault.decrypted_secrets WHERE name = 'subscription_alert_resend_key';
  SELECT decrypted_secret INTO v_from       FROM vault.decrypted_secrets WHERE name = 'subscription_alert_from';
  SELECT decrypted_secret INTO v_to         FROM vault.decrypted_secrets WHERE name = 'subscription_alert_to';

  IF v_resend_key IS NULL OR v_from IS NULL OR v_to IS NULL THEN
    RAISE WARNING 'subscription_verification_watchdog: escalation secrets missing from Vault; cannot send';
    RETURN;
  END IF;

  v_msg := format(
    'WATCHDOG: grace-period-automation (subscription trial/grace-expiry + receipt re-verification) '
    'has not completed a clean run since %s (latest run status: %s). The subscription-verification '
    'pipeline may be down — the daily cron may be unscheduled, the edge function erroring, or the '
    'project paused. Renewals/expiries may be silently unprocessed. '
    'Investigate: SELECT * FROM grace_period_automation_runs ORDER BY ran_at DESC LIMIT 10; '
    'and confirm the grace-period-automation cron is scheduled + active (SELECT * FROM cron.job). '
    '(Subscription/ops monitoring — SEPARATE trust domain from the crisis pipeline.)',
    COALESCE(v_last_ok::text, 'never'),
    COALESCE(v_latest_status, 'none')
  );

  -- Fixed allow-listed destination constant (never derived from row/table data) → SSRF-safe.
  PERFORM net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_resend_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', v_from,
      'to', v_to,
      'subject', '[Being] WATCHDOG — subscription-verification automation heartbeat missing',
      'text', v_msg
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.subscription_verification_watchdog() FROM anon, authenticated;

COMMENT ON FUNCTION public.subscription_verification_watchdog() IS
  'INFRA-282 dead-man''s-switch for grace-period-automation (INFRA-266). Escalates via an '
  'independent direct Resend POST when the daily subscription-verification job has no clean run '
  'in 26h or its latest run errored. SEPARATE trust domain + Vault secrets (subscription_alert_*) '
  'from the crisis alerter. PII-free payload. Reads grace_period_automation_runs; writes nothing.';

-- ---------------------------------------------------------------------------
-- Schedule (idempotent: unschedule-if-exists, then schedule). Every 6h, mirroring the crisis
-- watchdog cadence. Independent of the grace-period-automation edge-function code path.
-- ---------------------------------------------------------------------------
SELECT cron.unschedule('subscription-verification-watchdog')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'subscription-verification-watchdog');

SELECT cron.schedule(
  'subscription-verification-watchdog',
  '0 */6 * * *',
  $cron$ SELECT public.subscription_verification_watchdog(); $cron$
);
