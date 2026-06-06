-- Crisis-detection analytics views (FEAT-129).
--
-- Operator-only aggregate views over the vital-interests `crisis_detected` event
-- that INFRA-214 routes into analytics_events (GDPR Art. 6(1)(d)/9(2)(c) basis).
-- Purpose: release-health safety monitoring — confirm the crisis safety net is still
-- firing after each release, and produce an aggregate, PII-free compliance record.
--
-- These views are PII-FREE BY CONSTRUCTION: they emit bucketed counts only and never
-- select user_id or raw session_id. They are deliberately NOT granted to the
-- `authenticated` / `anon` roles — service-role access only (Supabase SQL editor / MCP),
-- matching the existing analytics_summary / subscription_metrics monitoring views.
--
-- Reviewed by the crisis + compliance specialists (FEAT-129). Design invariants that
-- MUST be preserved (see app/src/core/services/supabase/schema.sql §6b and
-- docs/development/crisis-analytics-runbook.md for full rationale):
--   * No k-anonymity / HAVING COUNT(*) >= N suppression — a safety monitor must never
--     hide the first / rare crisis detection. k-anon is NOT claimed (DPIA v1.2).
--   * COUNT(*) is authoritative; COUNT(DISTINCT session_id) under-counts (daily-rotated).
--   * Rows with severity_bucket / assessment_type = the literal text 'undefined' are
--     surfaced, not filtered — the inline PHQ-9 Q9 path currently emits String(undefined)
--     for those fields and the dashboard must make that mis-tag visible, not launder it.
--
-- Idempotent: CREATE OR REPLACE VIEW is safe to re-run. No time-window filter — the
-- 90-day analytics retention already bounds the rows, and a window would drop
-- durably-queued events that flush late with an older created_at.

-- (a) Detection mix — per-day breakdown by assessment, trigger, and severity bucket.
CREATE OR REPLACE VIEW public.crisis_detection_daily AS
SELECT
  DATE_TRUNC('day', created_at)                                       AS event_date,
  properties->>'assessment_type'                                      AS assessment_type,
  properties->>'trigger_type'                                         AS trigger_type,
  properties->>'severity_bucket'                                      AS severity_bucket,
  COUNT(*)                                                            AS detection_count,
  COUNT(*) FILTER (WHERE properties->>'intervention_surfaced' = 'true')
                                                                      AS intervention_surfaced_count
FROM public.analytics_events
WHERE event_type = 'crisis_detected'
GROUP BY 1, 2, 3, 4
ORDER BY event_date DESC, detection_count DESC;

-- (b) Detection volume — per-day total for spike/drift monitoring.
CREATE OR REPLACE VIEW public.crisis_detection_volume_daily AS
SELECT
  DATE_TRUNC('day', created_at)  AS event_date,
  COUNT(*)                       AS detection_count,
  COUNT(DISTINCT session_id)     AS distinct_sessions
FROM public.analytics_events
WHERE event_type = 'crisis_detected'
GROUP BY 1
ORDER BY event_date DESC;

-- (c) Liveness / reconciliation — distinguishes "zero crises (healthy)" from
--     "pipeline dead (no events landing)" in the post-release safety check.
CREATE OR REPLACE VIEW public.crisis_detection_liveness AS
SELECT
  COUNT(*)         AS total_detections_retained,
  MAX(created_at)  AS last_detection_at,
  MIN(created_at)  AS first_detection_retained_at
FROM public.analytics_events
WHERE event_type = 'crisis_detected';

COMMENT ON VIEW public.crisis_detection_daily IS
  'FEAT-129 operator-only aggregate: crisis_detected counts per day x assessment_type x trigger_type x severity_bucket. PII-free (bucketed counts; no user_id/session_id). No k-anon suppression. severity_bucket=''undefined'' rows surfaced, not filtered (inline-Q9 emit bug).';
COMMENT ON VIEW public.crisis_detection_volume_daily IS
  'FEAT-129 operator-only aggregate: per-day crisis_detected volume. COUNT(*) authoritative; distinct_sessions under-counts (daily-rotated session_id).';
COMMENT ON VIEW public.crisis_detection_liveness IS
  'FEAT-129 operator-only: total retained crisis_detected + last_detection_at, for the post-release safety-pipeline liveness check.';

-- No GRANT statements: absence of a grant to authenticated/anon keeps these views
-- service-role-only by default, which is the intended posture (no client-facing exposure).
