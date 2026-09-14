-- DEBUG-541 — attribute crisis detections to the day they HAPPENED, not the day they
-- were ingested, without blinding the spike test that a backlog flush was falsely tripping.
--
-- THE DEFECT. `analytics_events.created_at` defaults to NOW() and the client's flush
-- projection dropped the enqueue timestamp, so a device that detected offline and flushed
-- days later produced rows dated by the FLUSH. A backlog read as a same-day spike in the
-- FEAT-129 operator views and could false-positive the INFRA-219 alerter.
--
-- WHY A NAIVE REPOINT WOULD BE WORSE THAN THE DEFECT (crisis ruling, DEBUG-541).
-- Moving every consumer to event time converts a VISIBLE false positive (a stale spike an
-- operator dismisses in 30 seconds) into a SILENT false negative. The alerter's cron is
-- daily and reads only the current day, so a backfilled detection lands in an
-- already-evaluated day, is never spike-tested, AND raises the trailing baseline that the
-- next genuine spike is measured against. This migration therefore supplies event time to
-- the two DAY-SERIES views only, and ships the watermark column the alerter needs to
-- re-evaluate a day whose count grew after the fact.
--
-- WHAT DOES NOT MOVE, AND WHY:
--   * `crisis_detection_liveness` stays on created_at. It answers "is the pipeline dead",
--     which is an INGEST question. On event time a healthy pipeline draining old events
--     pages as dead. (crisisBacklogSuppression.unit.test.ts already names old-dated rows
--     flipping liveness `unproven` -> `stale` as a false-positive path.)
--   * Retention (`cleanup_old_analytics`, DEBUG-340) stays on created_at. It enforces a
--     published promise about how long data is HELD — an ingest question by definition.
--     Anchoring it to a client-reported date would let a skewed value extend a row's life
--     past the 3 years published at privacy-policy.md §7.2.
--
-- DEPLOY ORDER: this migration, THEN the alerter, THEN the client. Each is inert until the
-- next lands. Client-first would put event-time backfill in front of an alerter that cannot
-- see it — the silent-false-negative state, live. Supabase migrations do NOT auto-deploy on
-- merge; apply with `supabase db push` and verify.

-- ---------------------------------------------------------------------------
-- Resolution rule. ONE function, because the clamp, the floor and the
-- unparseable case are the same question: is this value usable at all?
--
-- TOTALITY IS THE POINT, NOT DEFENSIVENESS. `properties` is client-written JSONB under
-- RLS with no CHECK on `detected_on`, and a cast error inside a VIEW is not a bad number —
-- it is a view that ERRORS. Every alerter read would fail, every run would record 'error',
-- and the watchdog would page every 6h while the monitor is blind. Note the digit-shape
-- regex is NOT sufficient on its own: '2026-02-31' matches it and still raises on ::date,
-- which is why the cast sits inside an exception block.
--
-- FALL BACK, NEVER CLAMP TO THE BOUNDARY. A rejected value resolves to the ingest day —
-- the pre-fix behaviour, which is visible and biased toward the false-positive direction.
-- Clamping a 1970 row UP to the floor day would manufacture a spike on a day that had no
-- crisis, which is the exact harm this item exists to remove.
CREATE OR REPLACE FUNCTION public.crisis_event_day_source(
  p_properties jsonb,
  p_created_at timestamptz
)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_raw        text;
  v_day        date;
  v_ingest_day date := (p_created_at AT TIME ZONE 'UTC')::date;
BEGIN
  v_raw := p_properties ->> 'detected_on';

  -- A client predating DEBUG-541. Permanent population, not a transition window.
  IF v_raw IS NULL THEN
    RETURN 'absent';
  END IF;

  IF v_raw !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RETURN 'malformed';
  END IF;

  BEGIN
    v_day := v_raw::date;
  EXCEPTION WHEN others THEN
    -- Digit-shaped but not a real calendar date (e.g. 2026-02-31).
    RETURN 'malformed';
  END;

  -- Upper clamp. A forward-skewed handset clock would otherwise land in a day bucket that
  -- is never "today" and never a closed day the watermark revisits — permanently invisible.
  IF v_day > v_ingest_day THEN
    RETURN 'future_skew';
  END IF;

  -- Lower floor. Bounds `evaluated_counts` and matches the alerter's revisit horizon: a day
  -- whose prior count is no longer held cannot be re-evaluated. Deliberately a RELATIVE
  -- horizon, not PRE_FIX_CRISIS_BACKLOG_CUTOFF_MS — that is an absolute date that goes
  -- stale, and a client-side invariant the server cannot verify.
  IF v_day < v_ingest_day - 90 THEN
    RETURN 'implausible_past';
  END IF;

  RETURN 'event';
END;
$$;

CREATE OR REPLACE FUNCTION public.crisis_event_day(
  p_properties jsonb,
  p_created_at timestamptz
)
RETURNS date
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.crisis_event_day_source(p_properties, p_created_at) = 'event' THEN
    RETURN (p_properties ->> 'detected_on')::date;
  END IF;
  RETURN (p_created_at AT TIME ZONE 'UTC')::date;
END;
$$;

-- Neither function is SECURITY DEFINER and neither reads a table: both are pure
-- computations over arguments the caller already holds, so EXECUTE discloses nothing and
-- the DEBUG-440 PUBLIC-EXECUTE revoke does not apply. search_path is pinned per DEBUG-455.
COMMENT ON FUNCTION public.crisis_event_day_source(jsonb, timestamptz) IS
  'DEBUG-541: why a crisis row was attributed as it was — event|absent|malformed|future_skew|implausible_past. Total: never raises, so a crafted properties value cannot error a view.';
COMMENT ON FUNCTION public.crisis_event_day(jsonb, timestamptz) IS
  'DEBUG-541: the UTC day a crisis_detected row is attributed to. detected_on when usable, else the ingest day. Never clamps to a boundary — a rejected value falls back rather than inventing a day.';

-- ---------------------------------------------------------------------------
-- (a) Detection mix. CREATE OR REPLACE, never DROP: replace cannot change a column's type,
-- name or order and can only APPEND, so the existing grants survive and the alerter's
-- `event_date.slice(0, 10)` keeps working. DATE_TRUNC is retained so event_date stays
-- timestamptz — emitting a bare `date` here would make the replace FAIL outright.
-- If you ever convert this to DROP + CREATE you MUST re-issue the grants at the bottom of
-- 20260607000000_crisis_alert_cron.sql; without them every alerter read fails on
-- permissions, every run records 'error', and the monitor goes blind behind a watchdog page.
CREATE OR REPLACE VIEW public.crisis_detection_daily AS
SELECT
  DATE_TRUNC('day', public.crisis_event_day(properties, created_at)::timestamptz)
                                                                      AS event_date,
  properties->>'assessment_type'                                      AS assessment_type,
  properties->>'trigger_type'                                         AS trigger_type,
  properties->>'severity_bucket'                                      AS severity_bucket,
  COUNT(*)                                                            AS detection_count,
  COUNT(*) FILTER (WHERE properties->>'intervention_surfaced' = 'true')
                                                                      AS intervention_surfaced_count,
  -- Provenance, appended. LABEL, NEVER SUPPRESS: the mixed population is permanent, so an
  -- operator must be able to see how much of a day's count is real event time.
  COUNT(*) FILTER (WHERE public.crisis_event_day_source(properties, created_at) = 'event')
                                                                      AS event_time_rows,
  COUNT(*) FILTER (WHERE public.crisis_event_day_source(properties, created_at) <> 'event')
                                                                      AS ingest_time_rows
FROM public.analytics_events
WHERE event_type = 'crisis_detected'
GROUP BY 1, 2, 3, 4
ORDER BY event_date DESC, detection_count DESC;

-- (b) Detection volume. This is the view the INFRA-219 trailing baseline is actually
-- computed from (index.ts:135) — `crisis_detection_daily` above only feeds the email
-- breakdown. The two MUST move together: repointing one alone makes `todayVolume` stop
-- equalling the sum of `buckets` in the one document a founder reads under time pressure.
CREATE OR REPLACE VIEW public.crisis_detection_volume_daily AS
SELECT
  DATE_TRUNC('day', public.crisis_event_day(properties, created_at)::timestamptz)
                                 AS event_date,
  COUNT(*)                       AS detection_count,
  COUNT(DISTINCT session_id)     AS distinct_sessions,
  COUNT(*) FILTER (WHERE public.crisis_event_day_source(properties, created_at) = 'event')
                                 AS event_time_rows,
  COUNT(*) FILTER (WHERE public.crisis_event_day_source(properties, created_at) <> 'event')
                                 AS ingest_time_rows,
  -- Two counters over the SINGLE resolution rule, split so the alerter can report a bad
  -- clock separately from a bad value. Both are attributed to the INGEST day, because a
  -- rejected value is exactly what we could not place.
  COUNT(*) FILTER (WHERE public.crisis_event_day_source(properties, created_at) = 'future_skew')
                                 AS clock_skew_count,
  COUNT(*) FILTER (WHERE public.crisis_event_day_source(properties, created_at) = 'implausible_past')
                                 AS implausible_past_count
FROM public.analytics_events
WHERE event_type = 'crisis_detected'
GROUP BY 1
ORDER BY event_date DESC;

-- (c) crisis_detection_liveness is DELIBERATELY NOT REDEFINED HERE. See the header.

-- (d) Arrival volume — per-INGEST-day totals. NEW in DEBUG-541, and it exists because
-- moving the series to event time introduces a failure at the OTHER end of the series.
--
-- An event-time series is RIGHT-TRUNCATED: a device that detected today and has not yet
-- flushed is not in today's occurrence count, and cannot be. An ingest-time series never
-- is — a row exists the instant it lands. Evaluating the spike test on occurrence time
-- alone therefore desensitises the LEADING edge, which is the same silent-false-negative
-- class this item is guarding against, reintroduced at the opposite end.
--
-- Keeping both is also what lets the alerter describe a backlog flush HONESTLY instead of
-- suppressing it: arrival high + occurrence spread across older days is a backlog, not a
-- surge. The original false positive gets RECLASSIFIED, not deleted.
CREATE OR REPLACE VIEW public.crisis_detection_arrival_daily AS
SELECT
  DATE_TRUNC('day', created_at)  AS arrival_date,
  COUNT(*)                       AS arrival_count
FROM public.analytics_events
WHERE event_type = 'crisis_detected'
GROUP BY 1
ORDER BY arrival_date DESC;

COMMENT ON VIEW public.crisis_detection_arrival_daily IS
  'DEBUG-541 operator-only aggregate: per-INGEST-day crisis_detected arrivals. Deliberately NOT event time — this is the un-truncated counterpart to crisis_detection_volume_daily, so the alerter can tell a backlog flush (arrivals high, occurrences spread over older days) from a real same-day surge. PII-free (counts only).';

-- ---------------------------------------------------------------------------
-- Watermark for the alerter's backfill axis. Additive and nullable, mirroring INFRA-265's
-- `probe_status`: an older row, or a run from the pre-deploy alerter, simply leaves these
-- NULL. That NULL must be read as COLD START, never as an empty map — reading it as empty
-- makes the first run after deploy page a full-series backfill alert, and an operator's
-- introduction to a new axis being a cry of wolf is how an axis gets ignored.
ALTER TABLE public.crisis_alert_runs
  ADD COLUMN IF NOT EXISTS evaluated_counts jsonb,
  ADD COLUMN IF NOT EXISTS backfill_status  text;

COMMENT ON COLUMN public.crisis_alert_runs.evaluated_counts IS
  'DEBUG-541 watermark: per-day crisis counts as evaluated by this run, {"YYYY-MM-DD": n}. The next run diffs against the newest prior ok/alerted row holding a non-null map. Written ONLY when the volume read succeeded — persisting a partial map would make the following run read the whole series as grown-from-zero.';
COMMENT ON COLUMN public.crisis_alert_runs.backfill_status IS
  'DEBUG-541 backfill axis: cold_start|none|backfill. Strictly ADDITIVE — it may raise a page, never downgrade or mask liveness/spike/probe.';

COMMENT ON VIEW public.crisis_detection_daily IS
  'FEAT-129 operator-only aggregate: crisis_detected counts per day x assessment_type x trigger_type x severity_bucket. DEBUG-541: event_date is the DETECTION day (detected_on, clamped to <= ingest day and floored at 90d) falling back to the ingest day; event_time_rows/ingest_time_rows expose that split per row group. PII-free (bucketed counts; selects neither user_id nor session_id). No k-anon suppression — a safety monitor must not hide the first crisis.';
COMMENT ON VIEW public.crisis_detection_volume_daily IS
  'FEAT-129 operator-only aggregate: per-day crisis_detected volume. COUNT(*) is authoritative. DEBUG-541: event_date is the DETECTION day, not ingest; this is the view the INFRA-219 trailing baseline reads, and it moves in lockstep with crisis_detection_daily. clock_skew_count / implausible_past_count count rows whose client-supplied date was rejected and attributed to the ingest day instead. distinct_sessions counts EPISODES, not devices (INFRA-568).';

-- Re-issued deliberately, not redundantly. The grants live in
-- 20260607000000_crisis_alert_cron.sql, a DIFFERENT file from the one defining these views,
-- which is precisely how a future DROP + CREATE loses them silently. Idempotent.
GRANT SELECT ON
  public.crisis_detection_volume_daily,
  public.crisis_detection_liveness,
  public.crisis_detection_daily,
  public.crisis_detection_arrival_daily
  TO service_role;
