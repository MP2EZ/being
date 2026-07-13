-- Synthetic end-to-end crisis-detection liveness probe (INFRA-265).
--
-- Follow-up to INFRA-219. INFRA-219 ships PASSIVE staleness: liveness is decided by
-- age(last_detection_at) over the real crisis_detected events, which at low/zero volume
-- cannot tell "dead pipeline" from "genuinely quiet day" (it returns the advisory
-- `unproven`). This migration adds an ACTIVE probe: a scheduled edge function
-- (crisis-liveness-probe) writes a clearly-tagged SYNTHETIC marker row here every few
-- hours, and the INFRA-219 alerter reads MAX(probed_at) as an AUTHORITATIVE dead-pipeline
-- signal for the ingest/cron/edge leg the probe drives.
--
-- SCOPE / HONESTY (crisis specialist C8): a fresh probe proves only that the
-- cron -> edge -> PostgREST write leg is alive. It does NOT run the React Native app
-- code, so it is NOT proof the on-device emit path works — that stays covered by the
-- manual release-time active-liveness assertion (crisis-analytics-runbook.md step 1).
--
-- HARD RED LINE (R2 from INFRA-219, compliance-reviewed): the synthetic signal must
-- NEVER land in crisis_detected / the FEAT-129 views / any compliance export. It lives in
-- its OWN dedicated table (the FEAT-129 views physically cannot reference it), and a
-- belt-and-suspenders CHECK on analytics_events actively REJECTS any synthetic-tagged row
-- so accidental routing fails LOUD at the DB layer instead of silently corrupting counts.
--
-- SECURITY / SECRETS — NO SECRET VALUE APPEARS IN THIS FILE.
--   The probe cron reads secrets from Supabase Vault BY NAME at run time. Bootstrap these
--   OUT OF BAND before the job can fire (dashboard -> Vault, or a non-committed psql):
--     crisis_alert_cron_secret   — REUSED from INFRA-219 (same crisis-monitoring cron
--                                  secret; must equal the probe edge function's CRON_SECRET
--                                  edge-secret — the two ends of the X-Cron-Secret check).
--     crisis_probe_function_url  — https://<project-ref>.functions.supabase.co/crisis-liveness-probe
--   The edge function reads CRON_SECRET / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from
--   EDGE secrets (`supabase secrets set`). It shares CRON_SECRET with crisis-detection-alerting
--   (same trust domain — both are pg_cron-invoked crisis-monitoring functions).
--
-- Monitoring-only: this infra must never sit in a detection / 988 / intervention path.
-- Idempotent: guarded CREATE/ALTER/unschedule; safe to re-run.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ---------------------------------------------------------------------------
-- Synthetic-probe marker table. One row per successful probe run. Carries ONLY a
-- timestamp, the synthetic constant, a status, and ops metadata — no user_id,
-- session_id, scores, or any wellness data (PII-free by construction). Mirrors the
-- crisis_alert_runs posture exactly: RLS on with no policies + REVOKE = doubly locked
-- against anon/authenticated; service_role (edge function / alerter) bypasses RLS.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crisis_liveness_probe (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  probed_at   timestamptz NOT NULL DEFAULT now(),
  -- The synthetic tag is a STORED, CHECK-pinned constant so the row is unmistakably
  -- non-real at the schema level and can never be confused with a crisis_detected event.
  probe_type  text NOT NULL DEFAULT 'synthetic_liveness'
                CHECK (probe_type = 'synthetic_liveness'),
  status      text NOT NULL CHECK (status IN ('ok', 'error')),
  source      text,           -- e.g. 'edge' / 'pg_cron'
  duration_ms integer,
  detail      text
);

CREATE INDEX IF NOT EXISTS crisis_liveness_probe_probed_at_idx
  ON public.crisis_liveness_probe (probed_at DESC);

ALTER TABLE public.crisis_liveness_probe ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crisis_liveness_probe FROM anon, authenticated;
-- The probe edge function INSERTs and the alerter SELECTs MAX(probed_at) via PostgREST
-- using the service_role key (bypasses RLS but still needs a table grant). anon/authenticated
-- stay denied (no grant + RLS with no policies = doubly locked).
GRANT SELECT, INSERT ON public.crisis_liveness_probe TO service_role;

COMMENT ON TABLE public.crisis_liveness_probe IS
  'INFRA-265 synthetic liveness probe markers. One row per successful probe run; '
  'probe_type pinned to ''synthetic_liveness''. PII-free synthetic ops telemetry — NEVER '
  'real crisis data, NEVER referenced by the FEAT-129 crisis_detection_* views or any '
  'compliance export (R2 boundary; DPIA v1.5). Operator-only (RLS, no policies).';

-- ---------------------------------------------------------------------------
-- Belt-and-suspenders guard (compliance requirement). The R2 boundary is primarily
-- architectural — the probe writes here, never to analytics_events, so the FEAT-129 views
-- (WHERE event_type = 'crisis_detected') cannot see it. This CHECK is the secondary
-- structural backstop: if a future code path ever accidentally routes a synthetic-tagged
-- payload through analytics_events, the insert FAILS LOUD at the DB layer rather than
-- silently inflating the real crisis counts / compliance export. `properties ? 'probe_type'`
-- is the jsonb key-existence test; a NULL properties yields NULL (constraint not violated).
-- Idempotent: pg has no ADD CONSTRAINT IF NOT EXISTS, so guard via catalog lookup.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'analytics_events_reject_synthetic_probe'
  ) THEN
    ALTER TABLE public.analytics_events
      ADD CONSTRAINT analytics_events_reject_synthetic_probe
      CHECK (NOT (properties ? 'probe_type'));
  END IF;
END;
$$;

COMMENT ON CONSTRAINT analytics_events_reject_synthetic_probe ON public.analytics_events IS
  'INFRA-265: rejects any row carrying a synthetic probe tag (properties->''probe_type''). '
  'Belt-and-suspenders so a synthetic liveness marker can never be miscounted as a real '
  'crisis_detected event in the FEAT-129 views or the DPIA compliance export.';

-- ---------------------------------------------------------------------------
-- Surface the probe verdict on the alerter's heartbeat. The INFRA-219 alerter records one
-- crisis_alert_runs row per run; INFRA-265 adds the probe axis alongside liveness/spike so
-- an operator sees real-detection vs probe at a glance. Additive, nullable (older rows /
-- a pre-deploy alerter simply leave it NULL). The probe axis NEVER overwrites status —
-- a dead probe sets status='alerted' via the existing shouldAlert OR, never suppresses it.
-- ---------------------------------------------------------------------------
ALTER TABLE public.crisis_alert_runs
  ADD COLUMN IF NOT EXISTS probe_status text;

-- ---------------------------------------------------------------------------
-- Schedule (idempotent: unschedule-if-exists, then schedule).
-- Probe runs every 6h — more frequently than the daily alerter so a fresh marker always
-- exists when the alerter reads at 14:15 UTC. Reads CRON_SECRET + function URL from Vault
-- BY NAME at run time (no secret literal here).
-- ---------------------------------------------------------------------------
SELECT cron.unschedule('crisis-liveness-probe')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'crisis-liveness-probe');

SELECT cron.schedule(
  'crisis-liveness-probe',
  '0 */6 * * *',
  $cron$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'crisis_probe_function_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'crisis_alert_cron_secret')
    ),
    body := jsonb_build_object('source', 'pg_cron')
  );
  $cron$
);

-- Retention: prune probe markers older than 90 days (PII-free ops data; bound growth).
-- Mirrors the crisis_alert_runs prune cadence.
SELECT cron.unschedule('crisis-liveness-probe-prune')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'crisis-liveness-probe-prune');

SELECT cron.schedule(
  'crisis-liveness-probe-prune',
  '45 3 * * *',
  $cron$ DELETE FROM public.crisis_liveness_probe WHERE probed_at < now() - interval '90 days'; $cron$
);
