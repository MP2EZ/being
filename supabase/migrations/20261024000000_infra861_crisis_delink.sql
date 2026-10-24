-- INFRA-861 — de-link crisis_detected from the account identity.
--
-- THE GAP. Every crisis row carried user_id = auth.uid() (which joins auth.sessions' IP and
-- user agent, DEBUG-850), the rotating session_id that the same install's identified
-- operational rows also carry, and a full-precision created_at. On a fresh install the first
-- crisis was what minted the anonymous identity, so auth.users.created_at lined up with it.
-- regulatory-applicability §2a gap 5 accepted that only until the first external tester.
--
-- THE SHAPE (crisis + compliance + security planning pass, 2026-10-24).
--   - The table enforces the de-link, not the client: a BEFORE INSERT trigger rebuilds every
--     crisis row, and CHECKs hold the result for every role, service_role and UPDATE included.
--   - Delivery is unauthenticated: anon may INSERT (event_type, properties) and nothing else,
--     under a TO anon policy admitting only crisis rows. No SECURITY DEFINER RPC — the
--     DEBUG-440 sweep forbids anon-executable DEFINER functions and has no allowlist, and an
--     /rpc/<crisis> path would name the event in gateway logs.
--   - Authenticated crisis inserts are closed outright. Pre-change builds' inserts are
--     rejected; their events stay in the durable on-device queue and drain through the anon
--     lane after update. Nothing is dropped.
--   - created_at is truncated to the UTC DAY (not the hour): every consumer buckets by day,
--     and an hour would co-time a crisis row with the identified backup writes the same
--     foreground handler sends. Day truncation only ages last_detection_at, which biases the
--     staleness alert toward paging.
--
-- NORMALISATION COERCES, NEVER REJECTS. The client sends its whole queue as one batch, so a
-- row rejected for its content fails every retry and stalls delivery for good. Out-of-domain
-- enum values become 'unknown'; non-YYYY-MM-DD detected_on is dropped (no plausibility
-- window: the DEBUG-541 resolver judges a shape-valid date). The only rejections are a
-- probe_type key (INFRA-265 R2: synthetic rows fail loud, never stripped into real ones) and
-- the per-statement cap. Messages are fixed text: never a NEW value, never SQLERRM.
--
-- PRE-CHANGE ROWS ARE DELETED, not backfilled: they were collected under privacy-policy §7.4's
-- "deleting your account deletes the event", which a backfill would make impossible to keep.
-- Every identity on this project is the founder's (verified before the push and recorded in
-- the DPIA §9 row); the DO block refuses the push if any identity carries contact details.
--
-- RESIDUALS (recorded in the DPIA and LIA, never called "anonymous"): Supabase request logs
-- keep the connecting IP for a day; heap order/xmin give sub-day ordering against adjacent
-- writes. Never move id to a time-ordered UUID or an identity sequence.

-- ============================================================================
-- 0. Refuse the push unless every identity is contact-free (compliance K2)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email IS NOT NULL OR phone IS NOT NULL) THEN
    RAISE EXCEPTION 'INFRA-861: an auth.users row carries an email or phone. Pre-change crisis '
      'rows may belong to someone other than the founder; deleting them needs a compliance ruling.';
  END IF;
END $$;

-- ============================================================================
-- 1. Delete pre-change crisis rows, then relax identity for crisis rows only
-- ============================================================================
DELETE FROM public.analytics_events WHERE event_type = 'crisis_detected';

ALTER TABLE public.analytics_events ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.analytics_events ALTER COLUMN session_id DROP NOT NULL;

-- ============================================================================
-- 2. The row trigger: rebuild every crisis row
-- ============================================================================
CREATE OR REPLACE FUNCTION public.analytics_events_crisis_delink()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  src jsonb := NEW.properties;
  out jsonb;
BEGIN
  IF NEW.event_type IS DISTINCT FROM 'crisis_detected' THEN
    RETURN NEW;
  END IF;

  IF jsonb_typeof(src) = 'object' AND src ? 'probe_type' THEN
    RAISE EXCEPTION 'synthetic probe rows are not crisis detections'
      USING ERRCODE = 'check_violation';
  END IF;
  IF jsonb_typeof(src) IS DISTINCT FROM 'object' THEN
    src := '{}'::jsonb;
  END IF;

  -- The domains are every value an emitter can send (app/src/features/crisis/types/safety.ts,
  -- journalCrisisScan.ts, SupabaseService requireCrisisField sentinels). A new trigger type
  -- added client-side without one here degrades to 'unknown' — the jest parity test catches it.
  out := jsonb_build_object(
    'trigger_type',
      CASE WHEN jsonb_typeof(src->'trigger_type') = 'string'
                AND src->>'trigger_type' = ANY (ARRAY[
                  'phq9_moderate_severe_score', 'phq9_severe_score', 'phq9_suicidal_ideation',
                  'gad7_severe_score', 'combined_high_risk', 'manual_override',
                  'journal_text_match'])
           THEN src->'trigger_type' ELSE to_jsonb('unknown'::text) END,
    'severity_bucket',
      CASE WHEN jsonb_typeof(src->'severity_bucket') = 'string'
                AND src->>'severity_bucket' = ANY (ARRAY['moderate', 'high', 'critical', 'emergency'])
           THEN src->'severity_bucket' ELSE to_jsonb('unknown'::text) END,
    'assessment_type',
      CASE WHEN jsonb_typeof(src->'assessment_type') = 'string'
                AND src->>'assessment_type' = ANY (ARRAY['phq9', 'gad7', 'voice_journal'])
           THEN src->'assessment_type' ELSE to_jsonb('unknown'::text) END,
    -- A non-boolean is unknown, not false: false would claim no intervention was shown.
    'intervention_surfaced',
      CASE WHEN jsonb_typeof(src->'intervention_surfaced') = 'boolean'
           THEN src->'intervention_surfaced' ELSE 'null'::jsonb END
  );
  IF jsonb_typeof(src->'detected_on') = 'string'
     AND src->>'detected_on' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
    out := out || jsonb_build_object('detected_on', src->'detected_on');
  END IF;

  NEW.properties := out;
  NEW.user_id := NULL;
  NEW.session_id := NULL;
  -- Explicit UTC: the two-argument date_trunc uses the session TimeZone, which would move a
  -- row across a UTC day — into a day the alerter has already evaluated (DEBUG-541).
  NEW.created_at := date_trunc('day', LEAST(COALESCE(NEW.created_at, now()), now()), 'UTC');
  RETURN NEW;
END;
$$;

-- Supabase default privileges grant EXECUTE to the client roles by name, so PUBLIC alone is
-- not enough. Trigger-typed functions are uncallable anyway (42809); this is hygiene.
REVOKE EXECUTE ON FUNCTION public.analytics_events_crisis_delink() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS analytics_events_crisis_delink ON public.analytics_events;
CREATE TRIGGER analytics_events_crisis_delink
  BEFORE INSERT ON public.analytics_events
  FOR EACH ROW EXECUTE FUNCTION public.analytics_events_crisis_delink();

-- ============================================================================
-- 3. The statement trigger: at most 50 crisis rows per statement
-- ============================================================================
-- An identifier-free bound on what one request can write; the client chunks strictly below
-- it. Counts the transition table only, so it needs no SELECT on the table and stays INVOKER.
-- SQLSTATE BE861 is the client's structural "chunk smaller" signal.
CREATE OR REPLACE FUNCTION public.analytics_events_crisis_statement_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF (SELECT count(*) FROM new_rows WHERE event_type = 'crisis_detected') > 50 THEN
    RAISE EXCEPTION 'too many crisis rows in one statement'
      USING ERRCODE = 'BE861';
  END IF;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.analytics_events_crisis_statement_cap() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS analytics_events_crisis_statement_cap ON public.analytics_events;
CREATE TRIGGER analytics_events_crisis_statement_cap
  AFTER INSERT ON public.analytics_events
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.analytics_events_crisis_statement_cap();

-- ============================================================================
-- 4. CHECKs: the durable invariant, independent of the trigger
-- ============================================================================
-- All-IMMUTABLE form (AT TIME ZONE 'UTC' both ways), so the CHECK is session-independent.
ALTER TABLE public.analytics_events
  ADD CONSTRAINT analytics_events_crisis_delinked CHECK (
    event_type <> 'crisis_detected'
    OR (
      user_id IS NULL
      AND session_id IS NULL
      AND created_at IS NOT NULL
      AND created_at = (date_trunc('day', created_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
      AND jsonb_typeof(properties) = 'object'
      AND (properties - ARRAY['trigger_type', 'severity_bucket', 'assessment_type',
                              'intervention_surfaced', 'detected_on']) = '{}'::jsonb
    )
  );

ALTER TABLE public.analytics_events
  ADD CONSTRAINT analytics_events_noncrisis_identified CHECK (
    event_type = 'crisis_detected' OR (user_id IS NOT NULL AND session_id IS NOT NULL)
  );

-- ============================================================================
-- 5. Privileges and policies
-- ============================================================================
-- Authenticated: own rows only, and never a crisis row (a JWT-bearing request on the crisis
-- sink is exactly what this item removes). TO authenticated, not PUBLIC: permissive policies
-- OR together per role, so a PUBLIC policy would leak into anon's set.
DROP POLICY IF EXISTS analytics_insert ON public.analytics_events;
CREATE POLICY analytics_insert ON public.analytics_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND event_type <> 'crisis_detected');

-- Anon: crisis rows only, with no identity. WITH CHECK runs after the BEFORE trigger, so the
-- NULLs are the trigger's output; the predicate stops a future trigger edit reopening a path.
DROP POLICY IF EXISTS analytics_insert_crisis_anon ON public.analytics_events;
CREATE POLICY analytics_insert_crisis_anon ON public.analytics_events
  FOR INSERT TO anon
  WITH CHECK (event_type = 'crisis_detected' AND user_id IS NULL AND session_id IS NULL);

-- Column-scoped: anon cannot name id, user_id, session_id or created_at at all. No SELECT,
-- so the client inserts with Prefer: return=minimal. analytics_select (user_id = auth.uid())
-- already hides NULL-identity rows from authenticated; never widen it to `user_id IS NULL OR`.
GRANT INSERT (event_type, properties) ON public.analytics_events TO anon;

-- ============================================================================
-- 6. Operator views
-- ============================================================================
-- distinct_sessions has nothing left to count. NULL, not 0 ("zero sessions" would read as a
-- finding). CREATE OR REPLACE keeps name, type, position and the service_role grants; never
-- DROP a crisis view (20260913000000's header: the alerter goes blind behind a watchdog page).
CREATE OR REPLACE VIEW public.crisis_detection_volume_daily AS
SELECT
  DATE_TRUNC('day', public.crisis_event_day(properties, created_at)::timestamptz)
                                 AS event_date,
  COUNT(*)                       AS detection_count,
  NULL::bigint                   AS distinct_sessions,
  COUNT(*) FILTER (WHERE public.crisis_event_day_source(properties, created_at) = 'event')
                                 AS event_time_rows,
  COUNT(*) FILTER (WHERE public.crisis_event_day_source(properties, created_at) <> 'event')
                                 AS ingest_time_rows,
  COUNT(*) FILTER (WHERE public.crisis_event_day_source(properties, created_at) = 'future_skew')
                                 AS clock_skew_count,
  COUNT(*) FILTER (WHERE public.crisis_event_day_source(properties, created_at) = 'implausible_past')
                                 AS implausible_past_count
FROM public.analytics_events
WHERE event_type = 'crisis_detected'
GROUP BY 1
ORDER BY event_date DESC;

COMMENT ON VIEW public.crisis_detection_volume_daily IS
  'FEAT-129 operator-only aggregate: per-day crisis_detected volume. COUNT(*) is authoritative. DEBUG-541: event_date is the DETECTION day, not ingest; this is the view the INFRA-219 trailing baseline reads, and it moves in lockstep with crisis_detection_daily. clock_skew_count / implausible_past_count count rows whose client-supplied date was rejected and attributed to the ingest day instead. distinct_sessions is always NULL since INFRA-861: crisis rows carry no session_id.';

COMMENT ON VIEW public.analytics_summary IS
  'Operator-only. unique_users is 0 for crisis_detected since INFRA-861: crisis rows carry no user_id.';

-- Re-issued deliberately (see 20260913000000): idempotent, and the replace above must not be
-- what silently costs the alerter its read.
GRANT SELECT ON public.crisis_detection_volume_daily TO service_role;
REVOKE ALL ON public.crisis_detection_volume_daily FROM anon, authenticated;

COMMENT ON COLUMN public.analytics_events.user_id IS
  'auth.uid() of the writer. NULL on every crisis_detected row (INFRA-861), NOT NULL otherwise — both held by CHECK.';
COMMENT ON COLUMN public.analytics_events.created_at IS
  'Ingest time. crisis_detected rows are truncated to the UTC day by trigger and CHECK (INFRA-861); other rows are full precision.';
