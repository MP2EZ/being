-- INFRA-861 (2 of 2) — daily ceiling on crisis inserts, and one 90-day retention rule.
--
-- Founder runs this push AFTER deploying the crisis-detection-alerting function from the
-- same PR (crisis ruling: alerter first). That alerter keeps liveness `stale` when the
-- table empties ("sticky stale") and pages when today's arrivals near the ceiling; without
-- it, the 90-day prune would turn a dead pipeline into an advisory `unproven`.
--
-- 1. public.crisis_ingest_config: one row, the operator-tunable daily ceiling.
-- 2. An AFTER INSERT statement trigger rejects a statement that takes today's committed
--    crisis rows past the ceiling, SQLSTATE BE862. The client treats BE862 as final for the
--    flight: no retry, everything retained, next attempt after min(15 min, next UTC day).
--    The window is the UTC day because created_at is cut to the day (20261024000000); an
--    hourly window would need sub-day crisis timing, which LIA-crisis-telemetry rejects.
--    Keys on nothing but the event type and the day: no IP, header or identifier.
-- 3. cleanup_old_analytics(): every event type at 90 days (privacy-policy §7.1, §7.3).
--    Crisis rows carry no identity since the de-link, so the 3-year tier's justification
--    (evidence in proceedings) cannot apply; nothing operational reads back past 90 days.
--    Retention runs on created_at, which for a crisis row is its arrival day, so a row is
--    held up to a day less than 90 days from arrival, never longer.

-- ============================================================================
-- 1. Config
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.crisis_ingest_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  -- ≥10× plausible daily arrivals, and never below the alerter's spike floor (15).
  daily_ceiling integer NOT NULL CHECK (daily_ceiling >= 15),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.crisis_ingest_config (id, daily_ceiling)
VALUES (true, 500)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.crisis_ingest_config ENABLE ROW LEVEL SECURITY;
-- Supabase's default privileges grant every new table to the client roles.
REVOKE ALL ON TABLE public.crisis_ingest_config FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.crisis_ingest_config TO service_role;

COMMENT ON TABLE public.crisis_ingest_config IS
  'INFRA-861: single-row operator config for the crisis ingest ceiling. daily_ceiling is '
  'the most crisis_detected rows accepted per UTC day (BE862 above it). The alerter pages '
  'at daily_ceiling - 50 arrivals. Change with UPDATE as service_role; no client role can read it.';

-- ============================================================================
-- 2. Daily ceiling
-- ============================================================================
-- SECURITY DEFINER because the inserting role (anon) can read neither the config nor the
-- table. Trigger-typed, so the debug440 sweep of client-callable definer functions does
-- not apply; EXECUTE is revoked anyway. A missing config row admits the statement: a
-- misconfiguration must never be what holds crisis delivery.
CREATE OR REPLACE FUNCTION public.analytics_events_crisis_daily_ceiling()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_ceiling integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM new_rows WHERE event_type = 'crisis_detected') THEN
    RETURN NULL;
  END IF;

  SELECT daily_ceiling INTO v_ceiling FROM public.crisis_ingest_config WHERE id;
  IF v_ceiling IS NULL THEN
    RETURN NULL;
  END IF;

  IF (
    SELECT count(*)
    FROM public.analytics_events
    WHERE event_type = 'crisis_detected'
      AND created_at = date_trunc('day', now(), 'UTC')
  ) > v_ceiling THEN
    RAISE EXCEPTION 'crisis ingest ceiling reached'
      USING ERRCODE = 'BE862';
  END IF;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.analytics_events_crisis_daily_ceiling() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS analytics_events_crisis_daily_ceiling ON public.analytics_events;
CREATE TRIGGER analytics_events_crisis_daily_ceiling
  AFTER INSERT ON public.analytics_events
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.analytics_events_crisis_daily_ceiling();

-- ============================================================================
-- 3. Retention: one rule
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_analytics()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.analytics_events
  WHERE created_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_analytics() IS
  'DEBUG-340, INFRA-861: deletes every analytics_events row at 90 days, crisis_detected '
  'included (privacy-policy.md §7.1 and §7.3). Scheduled as cron job "analytics-retention-prune" '
  'through run_analytics_retention_prune(). Editing the interval without editing §7.1/§7.3 — and '
  'their copies in docs/legal/california-privacy.md, the being-website repo, and '
  'app/src/features/profile/content/legalContent.generated.ts — reintroduces the '
  'policy-to-implementation gap DEBUG-340 closed.';
