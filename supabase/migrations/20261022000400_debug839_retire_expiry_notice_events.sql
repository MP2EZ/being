-- DEBUG-839 — retire the trial/grace expiry-notice audit rows, and refuse store dates in any
-- subscription_events metadata.
--
-- THE DEFECT. grace-period-automation wrote `trial_ending_soon` / `grace_period_ending` rows
-- whose metadata carried the exact store `trial_end_date` / `grace_period_end`. Audit rows are
-- kept up to three years and are not touched by a subscription transfer (FEAT-833), while the
-- new uid's subscriptions row carries the same verified store fields — an exact-value join
-- between an old and a new anonymous identity, which the 2026-10-21 founder ruling forbids.
-- Dropping the keys alone is not enough: the row's existence plus its created_at against the
-- 02:00 UTC run still bounds the store date to under a day, finer under a manual or retried run.
--
-- COMPLIANCE RULING (2026-10-22), shape (ii): stop writing both event types (handler.ts, same
-- change) and delete their existing rows. They have no consumer — the app reference is a type
-- union and the notification sends were TODOs. Privacy-policy §7.3's three years is a ceiling,
-- so deletion is within it: no policy edit, no CONSENT_VERSION bump. DPIA correction row added.
--
-- ORDER (founder-run): deploy grace-period-automation and byte-verify it BEFORE this push, or a
-- 02:00 run of the old function re-writes a row — which the CHECK below now refuses, so the old
-- function's audit write would fail (non-fatally, by ruling) rather than re-introduce a key.
--
-- NOT TOUCHED (founder decision): the event_type CHECK, the TypeScript union, schema.sql.
--
-- Residuals, named not fixed: Supabase backups/PITR keep pre-delete rows for the backup window;
-- timing channels through OTHER old-uid rows' created_at are DEBUG-842.
--
-- Idempotent: the DELETE matches nothing on re-run, and the constraint is dropped and re-added.
-- Pinned by supabase/tests/debug839_metadata_no_store_dates.sql and, for writers in code, by
-- supabase/functions/_tests/subscription-audit-metadata-allowlist.test.ts.

DELETE FROM public.subscription_events
 WHERE event_type IN ('trial_ending_soon', 'grace_period_ending');

ALTER TABLE public.subscription_events
  DROP CONSTRAINT IF EXISTS subscription_events_metadata_no_store_dates;
ALTER TABLE public.subscription_events
  ADD CONSTRAINT subscription_events_metadata_no_store_dates
  CHECK (NOT (metadata ?| ARRAY['trial_end_date', 'grace_period_end'])) NOT VALID;

-- Fail closed. Counts only — never a uid.
DO $$
DECLARE
  v_retired bigint;
  v_keyed   bigint;
BEGIN
  SELECT count(*) INTO v_retired FROM public.subscription_events
   WHERE event_type IN ('trial_ending_soon', 'grace_period_ending');
  IF v_retired <> 0 THEN
    RAISE EXCEPTION 'DEBUG-839: % retired expiry-notice row(s) remain after the DELETE', v_retired;
  END IF;

  SELECT count(*) INTO v_keyed FROM public.subscription_events
   WHERE metadata ?| ARRAY['trial_end_date', 'grace_period_end'];
  IF v_keyed <> 0 THEN
    RAISE EXCEPTION 'DEBUG-839: % subscription_events row(s) of other event types carry a store-date key', v_keyed;
  END IF;

  ALTER TABLE public.subscription_events VALIDATE CONSTRAINT subscription_events_metadata_no_store_dates;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid = 'public.subscription_events'::regclass
                    AND conname = 'subscription_events_metadata_no_store_dates'
                    AND contype = 'c' AND convalidated) THEN
    RAISE EXCEPTION 'DEBUG-839: subscription_events_metadata_no_store_dates is missing or not validated';
  END IF;
END $$;
