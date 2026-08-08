-- Re-activate the dormant grace-period-automation daily cron (INFRA-266).
--
-- Follow-up to INFRA-219. The `grace-period-automation` edge function (subscription
-- trial/grace-expiry + receipt re-verification) lost its schedule when Supabase CLI v2
-- dropped the inline [[functions.X.schedule]] block (see config.toml), so the daily
-- 2 AM UTC run has not fired since. This migration applies the INFRA-219 pg_cron + pg_net
-- + Vault-by-name pattern to re-schedule it, and adds a heartbeat table so a successful
-- scheduled run is observable (the function previously wrote no run record).
--
-- NOT safety-critical: grace-period automation is subscription lifecycle ops, not crisis
-- monitoring. It deliberately uses its OWN distinct Vault secret + a separate trust domain
-- from the crisis alerter.
--
-- AMENDED BY INFRA-296. This header previously continued "...and needs no
-- watchdog/dead-man's-switch (that is reserved for the crisis-detection pipeline)". That
-- is no longer true and the reasoning behind it did not hold: the argument conflated
-- SEVERITY (grace-period is not life-safety, correct) with FAILURE DOMAIN (an in-Supabase
-- watchdog cannot page when the DB hosting it is down — true regardless of severity).
-- This job now fires a bare GET to its own external healthchecks.io check on each clean
-- run, so its silence pages the founder. Separate check and separate ping-URL secret from
-- the crisis pipeline's; the trust-domain separation asserted above is preserved, not
-- weakened. See docs/development/post-launch-monitoring-runbook.md §3.
--
-- SECURITY / SECRETS — NO SECRET VALUE APPEARS IN THIS FILE.
--   The cron command reads secrets from Supabase Vault BY NAME at run time. Bootstrap these
--   OUT OF BAND before the job can fire (Supabase dashboard -> Project Settings -> Vault,
--   or a non-committed psql session):
--     grace_period_cron_secret    — fresh >=256-bit random; DISTINCT from the crisis
--                                   alerter's `crisis_alert_cron_secret` (separate trust
--                                   domain). Must equal the grace-period-automation edge
--                                   function's CRON_SECRET edge-secret (the two ends of the
--                                   X-Cron-Secret check in index.ts).
--     grace_period_function_url   — https://<project-ref>.functions.supabase.co/grace-period-automation
--   The edge function reads CRON_SECRET / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from
--   EDGE secrets (`supabase secrets set`). pg_net request/response hardening + the
--   `net`-schema-not-exposed boundary were established once by 20260607000000_crisis_alert_cron
--   and are not repeated here.
--
-- Idempotent: guarded CREATE/unschedule; safe to re-run.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ---------------------------------------------------------------------------
-- Heartbeat / run-record table. One row per grace-period-automation run, written by the
-- edge function via the service_role key. Carries ONLY PII-free ops counters mirroring the
-- function's AutomationResult — no user_id, subscription_id, or receipt data. Mirrors the
-- crisis_alert_runs / crisis_liveness_probe posture exactly: RLS on with no policies +
-- REVOKE = doubly locked against anon/authenticated; service_role bypasses RLS.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.grace_period_automation_runs (
  id                          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ran_at                      timestamptz NOT NULL DEFAULT now(),
  status                      text NOT NULL CHECK (status IN ('ok', 'error')),
  trials_expired              integer,
  grace_periods_expired       integer,
  trials_expiring_soon        integer,
  grace_periods_expiring_soon integer,
  receipts_verified           integer,
  errors                      jsonb,
  duration_ms                 integer
);

CREATE INDEX IF NOT EXISTS grace_period_automation_runs_ran_at_idx
  ON public.grace_period_automation_runs (ran_at DESC);

ALTER TABLE public.grace_period_automation_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.grace_period_automation_runs FROM anon, authenticated;
-- The edge function (service_role key) inserts heartbeat rows via PostgREST. service_role
-- bypasses RLS but still needs a table grant. anon/authenticated stay denied (no grant + RLS
-- with no policies = doubly locked).
GRANT SELECT, INSERT ON public.grace_period_automation_runs TO service_role;

COMMENT ON TABLE public.grace_period_automation_runs IS
  'INFRA-266 heartbeat: one row per grace-period-automation run. status ok|error; ok is a '
  'healthy heartbeat, error is not. PII-free subscription-ops counters only (no user/receipt '
  'data). Operator-only (RLS, no policies).';

-- ---------------------------------------------------------------------------
-- Schedule (idempotent: unschedule-if-exists, then schedule).
-- Daily 2 AM UTC — the original config.toml intent. Reads CRON_SECRET + function URL from
-- Vault BY NAME at run time (no secret literal here). The edge function authenticates the
-- X-Cron-Secret header (constant-time) then runs the subscription-lifecycle automation.
-- ---------------------------------------------------------------------------
SELECT cron.unschedule('grace-period-automation')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'grace-period-automation');

SELECT cron.schedule(
  'grace-period-automation',
  '0 2 * * *',
  $cron$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'grace_period_function_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'grace_period_cron_secret')
    ),
    body := jsonb_build_object('source', 'pg_cron')
  );
  $cron$
);

-- Retention: prune heartbeat rows older than 90 days (PII-free ops data; bound growth).
-- Mirrors the crisis_alert_runs / crisis_liveness_probe prune cadence (offset to 03:50 to
-- avoid colliding with the crisis prunes at 03:30 / 03:45).
SELECT cron.unschedule('grace-period-automation-runs-prune')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'grace-period-automation-runs-prune');

SELECT cron.schedule(
  'grace-period-automation-runs-prune',
  '50 3 * * *',
  $cron$ DELETE FROM public.grace_period_automation_runs WHERE ran_at < now() - interval '90 days'; $cron$
);
