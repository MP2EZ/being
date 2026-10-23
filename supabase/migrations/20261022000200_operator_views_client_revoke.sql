-- INFRA-782 — operator-only views: remove the client-role access a fresh reset grants them.
--
-- Found by this PR's first `Supabase SQL suites` run: debug541 Test 11 failed with
-- "anon/authenticated can read public.crisis_detection_daily (must be operator-only)".
--
-- THE DEFECT. 20260605000000 states "absence of a grant to authenticated/anon keeps these
-- views" operator-only. That premise holds only where the default ACL grants clients nothing.
-- The local image's pg_default_acl grants anon and authenticated arwdDxtm on every new public
-- relation, views included, and these views run with their OWNER's privileges, so RLS on
-- analytics_events / subscriptions / users does not apply to a client reading them. On a fresh
-- reset any anon key could read per-day crisis_detected volume and the all-users aggregates.
-- debug541 passed against the shared project on 2026-10-02, whose default ACL differs. That
-- covers only the four crisis views; the founder's pre-push query checks all eight.
--
-- The four base-schema views (20260523000000) are the same class with no test. schema.sql
-- documents every one of them as service-role only, and nothing in app/src or
-- supabase/functions reads them, so the revoke narrows nothing that is in use.
-- retention_prune_health (20260808000000) already does exactly this.
--
-- service_role is untouched: the crisis views' explicit GRANT SELECT (20260913000000) stays,
-- and the alerter reads through it.

REVOKE ALL ON
  public.crisis_detection_daily,
  public.crisis_detection_volume_daily,
  public.crisis_detection_liveness,
  public.crisis_detection_arrival_daily,
  public.analytics_summary,
  public.free_tier_usage,
  public.subscription_metrics,
  public.subscription_events_summary
  FROM anon, authenticated;

DO $$
DECLARE
  v text;
  role_name text;
BEGIN
  FOREACH v IN ARRAY ARRAY[
    'crisis_detection_daily', 'crisis_detection_volume_daily', 'crisis_detection_liveness',
    'crisis_detection_arrival_daily', 'analytics_summary', 'free_tier_usage',
    'subscription_metrics', 'subscription_events_summary'
  ] LOOP
    FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF has_table_privilege(role_name, 'public.' || v, 'SELECT') THEN
        RAISE EXCEPTION 'INFRA-782: % can still read public.% after the REVOKE', role_name, v;
      END IF;
    END LOOP;
  END LOOP;

  FOREACH v IN ARRAY ARRAY[
    'crisis_detection_daily', 'crisis_detection_volume_daily', 'crisis_detection_liveness',
    'crisis_detection_arrival_daily'
  ] LOOP
    IF NOT has_table_privilege('service_role', 'public.' || v, 'SELECT') THEN
      RAISE EXCEPTION 'INFRA-782: service_role lost SELECT on public.%; the alerter reads it', v;
    END IF;
  END LOOP;
END $$;
