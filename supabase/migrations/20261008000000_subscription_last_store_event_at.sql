-- DEBUG-751 — a monotonic watermark for store notifications, and a read-only `subscriptions`
-- for end users.
--
-- DEPLOY ORDER: this migration, THEN the subscription-webhook function. The new function
-- selects and writes `last_store_event_at`; deployed first, every notification would be a 500
-- until the column exists. Supabase migrations do NOT auto-deploy on merge; apply with
-- `supabase db push --project-ref <ref>` and verify the column and the grants.
--
-- ============================================================================
-- PART 1 — subscriptions.last_store_event_at
-- ============================================================================
-- THE DEFECT. Apple and Google deliver subscription notifications at-least-once and out of
-- order, and `subscription-webhook` defers a notification whose row does not exist yet (503)
-- so it is redelivered behind newer ones. Applying them in arrival order lets a late EXPIRED
-- undo a newer RENEWED, or a late PURCHASED resurrect a row that has since expired: the user
-- ends up with the wrong entitlement until the nightly re-verification happens to correct it.
--
-- THE FIX. Each row remembers the store's own time of the newest notification applied to it;
-- the webhook acknowledges (marks processed, writes nothing) any notification strictly older.
--   Apple  = the verified outer payload's `signedDate`
--   Google = the Pub/Sub message's top-level `eventTimeMillis`
-- Equal is not stale: a redelivery of the newest applied event is idempotent.
--
-- NULLABLE, NO DEFAULT, NO BACKFILL. NULL means "no store event has been applied to this row
-- yet" (every row verified by verify-*-receipt but not yet touched by a webhook), and the
-- guard treats it as no watermark. There is nothing to backfill: the value is a property of
-- notifications, and none has ever been applied to a pre-existing row.
--
-- WRITTEN ONLY BY subscription-webhook. verify-apple-receipt / verify-google-receipt do not
-- touch it, so a receipt verification never advances the watermark past events it has not
-- seen; grace-period-automation does not either. An application-side backstop: the guard
-- ignores a watermark more than five minutes in the future, so a bad value cannot freeze a
-- row against real events.
--
-- DATA HANDLING. A store-supplied event timestamp: no identifier, no user content, nothing
-- that was not already implied by the row's `updated_at`. It sits inside the existing
-- `subscriptions` classification (sensitive wellness data: the row correlates a person with
-- paid use of a wellness app) and adds no category. It is not PHI - Being is not a HIPAA
-- covered entity (docs/legal/regulatory-applicability.md) - and is erased with the row by the
-- delete-account cascade (`user_id ... ON DELETE CASCADE`). It is never logged.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS last_store_event_at TIMESTAMPTZ;

COMMENT ON COLUMN public.subscriptions.last_store_event_at IS
  'Store event time of the newest notification applied to this row: Apple signedDate or '
  'Google eventTimeMillis. Written only by subscription-webhook; it acknowledges, without '
  'applying, any later-delivered notification strictly older than this. NULL = no webhook '
  'event applied yet (no watermark). A value more than 5 minutes in the future is ignored '
  'by the guard. (DEBUG-751)';

-- ============================================================================
-- PART 2 — `authenticated` can no longer INSERT or UPDATE subscriptions
-- ============================================================================
-- WHY IT IS IN THIS MIGRATION. The watermark and `status` decide who has access, and both
-- are meant to be written by exactly two things: the receipt verifiers and the webhook, all
-- running as service_role. Base schema §16 nevertheless granted `SELECT, INSERT, UPDATE ON
-- subscriptions TO authenticated`, and the INFRA-260 RLS policies (`subscriptions_insert`,
-- `subscriptions_update`: user_id = auth.uid()) allow an anonymous-session user to write their
-- OWN row. Any such user could therefore set their own `status` to 'active', or rewind or
-- advance `last_store_event_at` to make the webhook's guard drop real events. Nothing in the
-- client does this - grepped at authoring time: no `.from('subscriptions')` anywhere in
-- app/src (either test root), and the only edge-function callers are service_role - so
-- revoking costs nothing and closes the surface.
--
-- WHAT STAYS. SELECT (the app reads its own subscription row; RLS `subscriptions_select`
-- unchanged). service_role keeps SELECT, INSERT, UPDATE (20260814000000). The SECURITY
-- DEFINER functions that write the table (expire_old_trials, expire_grace_periods,
-- log_subscription_event, ...) run as their owner and are unaffected.
--
-- The `subscriptions_insert` / `subscriptions_update` policies are left in place: with no
-- table privilege they can never be reached, they are harmless, and dropping them would make
-- a future re-GRANT silently permissive instead of still RLS-bound.
--
-- Idempotent: REVOKE of a privilege not held is a no-op.

REVOKE INSERT, UPDATE ON public.subscriptions FROM authenticated;

-- ============================================================================
-- Fail-closed assertions.
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'subscriptions'
       AND column_name = 'last_store_event_at'
       AND data_type = 'timestamp with time zone' AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'DEBUG-751 FAIL: subscriptions.last_store_event_at is missing or not a nullable timestamptz';
  END IF;

  IF has_any_column_privilege('authenticated', 'public.subscriptions', 'INSERT')
     OR has_any_column_privilege('authenticated', 'public.subscriptions', 'UPDATE') THEN
    RAISE EXCEPTION 'DEBUG-751 FAIL: authenticated still holds INSERT or UPDATE on public.subscriptions';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.subscriptions', 'SELECT') THEN
    RAISE EXCEPTION 'DEBUG-751 FAIL: authenticated lost SELECT on public.subscriptions (the app reads its own row)';
  END IF;

  IF NOT (has_table_privilege('service_role', 'public.subscriptions', 'SELECT')
          AND has_table_privilege('service_role', 'public.subscriptions', 'INSERT')
          AND has_table_privilege('service_role', 'public.subscriptions', 'UPDATE')) THEN
    RAISE EXCEPTION 'DEBUG-751 FAIL: service_role lacks SELECT/INSERT/UPDATE on public.subscriptions (INFRA-379)';
  END IF;

  RAISE NOTICE 'DEBUG-751 PASS: last_store_event_at present; authenticated is SELECT-only on subscriptions; service_role intact';
END $$;

-- =====================================================
-- ROLLBACK (manual; run in this order):
-- GRANT INSERT, UPDATE ON public.subscriptions TO authenticated;
-- ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS last_store_event_at;
-- The webhook selects and writes last_store_event_at, so roll the function back FIRST (or
-- the dropped column turns every webhook into a 500). Dropping the column discards the
-- watermark; the guard then simply has nothing to compare against until events re-stamp rows.
-- =====================================================
