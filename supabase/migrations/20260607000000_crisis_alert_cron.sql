-- Automated crisis-detection volume/liveness alerting (INFRA-219).
--
-- Establishes the FIRST pg_cron + pg_net job in this repo (grace-period-automation's
-- schedule was dropped by Supabase CLI v2 — see config.toml). Schedules a daily call to
-- the `crisis-detection-alerting` edge function, which reads the FEAT-129 operator-only
-- views and emails the founder (via Resend) on a volume spike or a liveness/pipeline-dead
-- breach. A second cron (the watchdog) makes the alerter itself observable.
--
-- SECURITY / SECRETS — NO SECRET VALUE APPEARS IN THIS FILE.
--   The cron command and the watchdog read secrets from Supabase Vault BY NAME at run
--   time. Bootstrap these Vault secrets OUT OF BAND before the jobs can fire (Supabase
--   dashboard → Project Settings → Vault, or a non-committed psql session):
--     crisis_alert_cron_secret   — fresh >=256-bit random; DISTINCT from grace-period's
--                                  CRON_SECRET. Must equal the edge function's CRON_SECRET
--                                  edge-secret (the two ends of the X-Cron-Secret check).
--     crisis_alert_function_url  — https://<project-ref>.functions.supabase.co/crisis-detection-alerting
--     crisis_alert_resend_key    — Resend API key (watchdog's independent send path).
--     crisis_alert_from          — e.g. 'Being Alerts <alerts@being.fyi>'
--     crisis_alert_to            — founder destination address.
--   The edge function reads RESEND_API_KEY / CRISIS_ALERT_FROM / CRISIS_ALERT_TO / CRON_SECRET
--   from EDGE secrets (`supabase secrets set`). The watchdog duplicates resend_key/from/to
--   in Vault deliberately: it is an INDEPENDENT code path (direct pg_net → Resend) so it can
--   still page when the edge function itself is broken. See crisis-analytics-runbook.md.
--
-- Monitoring-only: this infra must never sit in a detection / 988 / intervention path.
-- Idempotent: guarded CREATE/REPLACE/unschedule; safe to re-run.

-- Extensions (Supabase may require enabling pg_cron/pg_net via the dashboard first).
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ---------------------------------------------------------------------------
-- The edge function reads the FEAT-129 operator-only views through PostgREST as the
-- `service_role` role. FEAT-129 deliberately granted those views to NO API role (they were
-- queried only via the SQL editor as `postgres`), so service_role has no SELECT by default
-- and the function's reads fail with a permission error. Grant SELECT to service_role only.
-- This does NOT widen exposure: anon/authenticated remain ungranted (verify they stay false),
-- and service_role is a secret, server-only key never shipped to clients.
-- ---------------------------------------------------------------------------
GRANT SELECT ON
  public.crisis_detection_volume_daily,
  public.crisis_detection_liveness,
  public.crisis_detection_daily
  TO service_role;

-- ---------------------------------------------------------------------------
-- Heartbeat / run-record table. A healthy run writes 'ok' (no email); a breach
-- writes 'alerted' (+ email); any failure writes 'error' (never a healthy heartbeat).
-- The watchdog reads this to decide whether the primary alerter is alive.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crisis_alert_runs (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ran_at          timestamptz NOT NULL DEFAULT now(),
  status          text NOT NULL CHECK (status IN ('ok', 'alerted', 'error')),
  reason          text,
  liveness_status text,
  spike_status    text,
  today_volume    integer,
  alert_sent      boolean NOT NULL DEFAULT false,
  errors          jsonb,
  duration_ms     integer
);

CREATE INDEX IF NOT EXISTS crisis_alert_runs_ran_at_idx
  ON public.crisis_alert_runs (ran_at DESC);

-- Operator-only: RLS on with NO policies denies anon/authenticated entirely; the
-- service_role (edge function) bypasses RLS. Mirrors the FEAT-129 views' posture.
ALTER TABLE public.crisis_alert_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crisis_alert_runs FROM anon, authenticated;
-- The edge function (service_role key) inserts heartbeat rows via PostgREST. service_role
-- bypasses RLS but still needs a table grant. anon/authenticated stay denied (no grant + RLS
-- with no policies = doubly locked).
GRANT SELECT, INSERT ON public.crisis_alert_runs TO service_role;

COMMENT ON TABLE public.crisis_alert_runs IS
  'INFRA-219 heartbeat: one row per crisis-detection-alerting run. status ok|alerted|error; '
  'ok/alerted are healthy heartbeats, error is not. Operator-only (RLS, no policies). PII-free.';

-- ---------------------------------------------------------------------------
-- Watchdog: makes the alerter observable. Escalates (independent direct Resend POST)
-- when the primary alerter has not cleanly run recently, OR its most recent run errored
-- (covers cron-not-scheduled, edge-function-erroring, project-paused, and a silent
-- alert-DELIVERY failure). SECURITY DEFINER so it can read Vault + post via pg_net.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crisis_alert_watchdog()
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
  FROM public.crisis_alert_runs
  WHERE status IN ('ok', 'alerted');

  SELECT status INTO v_latest_status
  FROM public.crisis_alert_runs
  ORDER BY ran_at DESC
  LIMIT 1;

  -- Healthy if a clean run landed within 26h (primary runs daily; 26h tolerates one
  -- slightly-late run, not a missed day) AND the most recent run did not error.
  IF v_last_ok IS NOT NULL
     AND v_last_ok >= now() - interval '26 hours'
     AND v_latest_status IS DISTINCT FROM 'error' THEN
    RETURN;
  END IF;

  SELECT decrypted_secret INTO v_resend_key FROM vault.decrypted_secrets WHERE name = 'crisis_alert_resend_key';
  SELECT decrypted_secret INTO v_from       FROM vault.decrypted_secrets WHERE name = 'crisis_alert_from';
  SELECT decrypted_secret INTO v_to         FROM vault.decrypted_secrets WHERE name = 'crisis_alert_to';

  IF v_resend_key IS NULL OR v_from IS NULL OR v_to IS NULL THEN
    RAISE WARNING 'crisis_alert_watchdog: escalation secrets missing from Vault; cannot send';
    RETURN;
  END IF;

  v_msg := format(
    'WATCHDOG: the crisis-detection alerter has not completed a clean run since %s '
    '(latest run status: %s). The detection-pipeline monitor may be down — cron unscheduled, '
    'edge function erroring, alert delivery failing, or the project paused. '
    'Investigate: SELECT * FROM crisis_alert_runs ORDER BY ran_at DESC LIMIT 10; '
    'and query crisis_detection_liveness directly. (Monitoring-only — the on-device crisis '
    'audit log remains the accountability record.)',
    COALESCE(v_last_ok::text, 'never'),
    COALESCE(v_latest_status, 'none')
  );

  -- Fixed allow-listed destination constant (never derived from row/view data) → SSRF-safe.
  PERFORM net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_resend_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', v_from,
      'to', v_to,
      'subject', '[Being] WATCHDOG — crisis-detection alerter heartbeat missing',
      'text', v_msg
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.crisis_alert_watchdog() FROM anon, authenticated;

COMMENT ON FUNCTION public.crisis_alert_watchdog() IS
  'INFRA-219 dead-man''s-switch. Escalates via an independent direct Resend POST when the '
  'primary alerter has no clean run in 26h or its latest run errored. Shares Supabase''s '
  'failure domain — an external watcher (healthchecks.io) is the tracked follow-up.';

-- ---------------------------------------------------------------------------
-- pg_net hardening: the request rows in net.* persist the X-Cron-Secret / Authorization
-- headers, so they must never be readable by anon/authenticated, and old rows must age out.
-- ---------------------------------------------------------------------------
-- pg_net hardening — IMPORTANT Supabase-managed reality (investigated under INFRA-219).
-- pg_net's internal tables (`net._http_response`, `net.http_request_queue` — the latter
-- carries the outgoing X-Cron-Secret / Authorization headers) are owned by `supabase_admin`
-- and granted to PUBLIC by default. The `postgres` role that runs migrations is NOT a member
-- of `supabase_admin` (pg_has_role('postgres','supabase_admin') = false), so it CANNOT revoke
-- that PUBLIC grant — the REVOKE below is a best-effort no-op on managed Supabase (it does the
-- right thing only where the migration role owns pg_net, e.g. self-hosted).
--
-- The REAL control that keeps these secret-bearing rows unreachable by anon/authenticated is
-- that the `net` schema is NOT exposed through the PostgREST Data API (Supabase default exposes
-- only `public` + `graphql_public`; `authenticator` carries no `pgrst.db_schemas` override here).
-- A client holding the anon/authenticated key cannot run arbitrary SQL — it can only reach
-- exposed schemas via PostgREST — so the table-level PUBLIC grant is not reachable.
-- ACTION FOR THE OPERATOR: confirm in Dashboard → Settings → API → "Exposed schemas" that
-- `net` is absent. That is the boundary; do not add `net` there.
DO $$
BEGIN
  REVOKE ALL ON net._http_response     FROM PUBLIC, anon, authenticated;
  REVOKE ALL ON net.http_request_queue FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_table OR undefined_object THEN
  RAISE NOTICE 'pg_net internal tables not present yet; REVOKE skipped (will re-run on next apply).';
END;
$$;

-- Defense-in-depth check. If the PUBLIC table grant is still present (the managed-Supabase
-- case, which postgres cannot revoke), WARN loudly rather than ABORT: the schema-not-exposed
-- control above is the real boundary, and hard-failing here would block the entire crisis
-- safety monitor over an unrevocable, non-API-reachable managed grant.
DO $$
BEGIN
  IF has_table_privilege('anon',          'net._http_response',     'SELECT')
     OR has_table_privilege('authenticated', 'net._http_response',     'SELECT')
     OR has_table_privilege('anon',          'net.http_request_queue', 'SELECT')
     OR has_table_privilege('authenticated', 'net.http_request_queue', 'SELECT') THEN
    RAISE WARNING 'INFRA-219: pg_net request/response rows carry a PUBLIC grant (managed-Supabase default; not revocable by postgres). The control that keeps the X-Cron-Secret/Authorization headers unreachable is that the `net` schema is NOT in the PostgREST exposed schemas — confirm Dashboard → Settings → API → Exposed schemas excludes `net`.';
  END IF;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'pg_net internal tables not present yet; grant check deferred.';
END;
$$;

-- ---------------------------------------------------------------------------
-- Schedules (idempotent: unschedule-if-exists, then schedule).
-- ---------------------------------------------------------------------------

-- Primary: daily 14:15 UTC. Reads CRON_SECRET + function URL from Vault BY NAME at run
-- time (no secret literal here). Edge function evaluates the views and alerts on breach.
SELECT cron.unschedule('crisis-detection-alerting')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'crisis-detection-alerting');

SELECT cron.schedule(
  'crisis-detection-alerting',
  '15 14 * * *',
  $cron$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'crisis_alert_function_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'crisis_alert_cron_secret')
    ),
    body := jsonb_build_object('source', 'pg_cron')
  );
  $cron$
);

-- Watchdog: every 6h. Independent of the edge-function code path.
SELECT cron.unschedule('crisis-alerter-watchdog')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'crisis-alerter-watchdog');

SELECT cron.schedule(
  'crisis-alerter-watchdog',
  '0 */6 * * *',
  $cron$ SELECT public.crisis_alert_watchdog(); $cron$
);

-- Retention: prune heartbeat rows older than 90 days (PII-free ops data; bound growth).
SELECT cron.unschedule('crisis-alert-runs-prune')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'crisis-alert-runs-prune');

SELECT cron.schedule(
  'crisis-alert-runs-prune',
  '30 3 * * *',
  $cron$ DELETE FROM public.crisis_alert_runs WHERE ran_at < now() - interval '90 days'; $cron$
);

-- pg_net response/request rows (which carry auth headers) are auto-purged by pg_net's
-- background worker (default TTL). We rely on that rather than racing it with manual
-- DELETEs; the REVOKE + assertion above are the access-posture control.
