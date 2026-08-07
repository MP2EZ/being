-- DEBUG-340 — make privacy-policy §7.2's published "3 years" TRUE of the server sink.
--
-- THE DEFECT. Three mutually inconsistent facts shipped simultaneously:
--   1. privacy-policy.md §7.2 promises 3 years for crisis-related data, and its third
--      bullet names "Crisis Detection Events" — i.e. the SERVER-side analytics_events
--      rows written by SupabaseService.trackCrisisDetection. §7.4 further says deletion
--      removes data "both on your device and on our servers", so the policy does not
--      carve out server data; it affirmatively covers it.
--   2. Device-side, DataRetentionService DOES honour 3 years for crisis-flagged
--      assessments (the isCrisis || suicidalIdeation || phq9>=20 || gad7>=15 predicate
--      inside the assessment_history sweep, wired at App.tsx). That half was truthful.
--   3. Server-side, cleanup_old_analytics() deleted ALL of analytics_events at 90 days
--      with no event_type carve-out — contradicting the 3-year promise — EXCEPT it was
--      never cron.schedule'd, so in practice nothing pruned it and real retention was
--      INDEFINITE.
--
-- So the live violation was over-retention, not under-retention: the policy said 3 years
-- and the server kept forever. That is the FTC §5 "said we'd delete, secretly kept"
-- pattern and it also breaches the data-minimisation duties in TDPSA §541.105 /
-- CPA §6-1-1309 / VCDPA §59.1-580 / CTDPA §6, under which a stated period is a CEILING.
--
-- WHY NOT SIMPLY SCHEDULE THE EXISTING FUNCTION. Scheduling it unchanged would have
-- converted a silent violation into an active one: at first run it would delete every
-- crisis_detected row older than 90 days, breaching the still-published 3-year promise
-- the moment the job fired. It would also gut the FEAT-129 historical aggregates and
-- reset crisis_detection_liveness's baseline, which the INFRA-219 alerter reads as its
-- dead-vs-quiet signal. The function had to become category-aware BEFORE it could be
-- scheduled at all.
--
-- THE DECISION. Keep §7.2's published "3 years" and make it true, rather than editing a
-- published number downward. No statute floors or ceilings crisis-record retention for a
-- consumer wellness app (Being is not a healthcare provider), so the figure is a business
-- choice constrained only by truthfulness and the minimisation test. A shorter server
-- window was available and defensible — the payload is PII-free and bucketed — but
-- keeping 3 years requires no change to a live user-facing promise and no material-change
-- notice, and it preserves the safety-monitoring continuity §7.2 gives as its rationale.
--
-- The 90-day tier for everything else matches what the function already coded and what
-- §7.1 describes for the general wellness tier. Note §7.1 previously stated no period for
-- server-side analytics at all, so that number was UNPROMISED; DEBUG-340 also adds it to
-- §7.1 so this branch has a stated home rather than being asserted only here.
--
-- ⚠️  DEPLOY IS MANUAL AND THE FIRST RUN IS IRREVERSIBLE.
-- Migrations do NOT auto-deploy on merge (there is no CI hook). Until someone runs
-- `supabase db push` against the project, this file changes nothing. Before that push,
-- take a pre-flight census — the first scheduled run permanently deletes every non-crisis
-- row older than 90 days that has accumulated since the table was created:
--     SELECT event_type, count(*), min(created_at), max(created_at)
--       FROM public.analytics_events GROUP BY 1 ORDER BY 2 DESC;
-- Then verify afterwards with:
--     SELECT jobname, schedule FROM cron.job WHERE jobname = 'analytics-retention-prune';
-- and re-run `get_advisors` to confirm no mutable-search-path finding.

-- ============================================================================
-- 1. Category-aware retention
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_analytics()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
-- pg_cron executes jobs as the job owner, so an unpinned search_path is both an
-- advisor finding and a real hijack surface for a SECURITY DEFINER function.
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.analytics_events
  WHERE
    -- Everything that is not a durable crisis record: the 90-day general tier
    -- (privacy-policy §7.1).
    (event_type <> 'crisis_detected' AND created_at < NOW() - INTERVAL '90 days')
    OR
    -- Crisis Detection Events: the 3-year tier (privacy-policy §7.2). These are
    -- aggregate and PII-free (trigger_type + severity_bucket; no raw score, no Q9
    -- value, no persistent identifier), processed on a vital-interests basis, and
    -- they feed the FEAT-129 operator views plus the INFRA-219 alerter's
    -- dead-vs-quiet baseline. They must OUTLIVE the 90-day tier, not share it.
    (event_type = 'crisis_detected' AND created_at < NOW() - INTERVAL '3 years');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_analytics() IS
  'DEBUG-340: enforces privacy-policy.md §7.1 (90 days, general analytics) and §7.2 '
  '(3 years, crisis_detected). Scheduled as cron job "analytics-retention-prune". '
  'Editing either interval here without editing §7.1/§7.2 — and their copies in '
  'docs/legal/california-privacy.md, the being-website repo, and '
  'app/src/features/profile/content/legalContent.generated.ts — reintroduces the exact '
  'policy-to-implementation gap this migration closed.';

-- Retention scans filter on event_type then created_at; without this the daily prune is
-- a full scan of a table intended to grow to 3 years of crisis history.
CREATE INDEX IF NOT EXISTS idx_analytics_retention
  ON public.analytics_events (event_type, created_at);

-- ============================================================================
-- 2. Schedule it — the half that was missing entirely
-- ============================================================================
-- The function has existed since the base schema (20260523000000) and was never
-- scheduled, which is why real retention was indefinite. Verified at the time of this
-- migration: cron.job held five jobs (crisis-detection-alerting, crisis-alerter-watchdog,
-- crisis-alert-runs-prune, crisis-liveness-probe, crisis-liveness-probe-prune) and none
-- of them was this one.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Idempotent unschedule/reschedule, matching the pattern the crisis cron migrations use.
SELECT cron.unschedule('analytics-retention-prune')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'analytics-retention-prune');

-- 04:20 UTC deliberately clears the existing 03:30 / 03:45 / 03:50 prunes so the
-- retention sweep never contends with them.
SELECT cron.schedule(
  'analytics-retention-prune',
  '20 4 * * *',
  $cron$ SELECT public.cleanup_old_analytics(); $cron$
);
