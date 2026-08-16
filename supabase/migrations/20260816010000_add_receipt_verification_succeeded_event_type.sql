-- DEBUG-446 — the subscription success-audit path is dead. Add the missing enum value.
--
-- ============================================================================
-- THE DEFECT
-- ============================================================================
-- verify-apple-receipt/index.ts:259 and verify-google-receipt/index.ts:255 both call
-- log_subscription_event with p_event_type = 'receipt_verification_succeeded'. That value is
-- NOT in subscription_events.event_type's CHECK constraint (20260523000000_base_schema.sql,
-- :508-521 — twelve values, ending at 'receipt_verification_failed').
--
-- The constraint violation is real, and it is thrown away: neither call site destructures the
-- RPC's returned `error`. So EVERY successful receipt verification has silently written no
-- audit row, since the day the function shipped.
--
-- WHY NOBODY NOTICED: no receipt has ever been verified in production — there are no live
-- subscribers — so the success path has never executed. Same shape as the `subscriptions`
-- service_role grant defect INFRA-379 found: invisible precisely because no data flows.
--
-- WHAT IT CONTRADICTS: the function's own header ("Audit logging for all verification
-- attempts"), and docs/legal/dpia-sensitive-wellness-data.md §7 control 8, which credits
-- "audit logging on subscription events" as a mitigation. A credited control that cannot
-- fire is a DPIA accuracy problem, not only a code bug.
--
-- ============================================================================
-- SCOPE OF THE FIX, AND WHY IT IS WIDER THAN THE TWO NAMED LINES
-- ============================================================================
-- The missing enum value is one line. The swallowed error is the defect that will hide the
-- NEXT mismatch just as completely, so it is fixed as a class:
--   * All 12 log_subscription_event call sites now route through _shared/subscriptionAudit.ts,
--     which destructures and surfaces the error. Twelve, not the two that happen to hit the
--     constraint today.
--   * The value is added to all THREE copies of the allowed list, which had drifted apart and
--     are the reason this was possible: this constraint, the app-side mirror at
--     app/src/core/services/supabase/schema.sql, and the TypeScript union
--     SubscriptionEventType at app/src/core/types/subscription/index.ts.
--
-- Note the ticket asserts the TS union "includes the success value". It does not — verified.
-- That claim is corrected rather than carried forward.
--
-- AC3 RECONCILIATION, RECORDED SO IT IS NOT REDONE: every other p_event_type value passed
-- anywhere in supabase/functions/ is already permitted — 'trial_ending_soon' and
-- 'grace_period_ending' (grace-period-automation), 'receipt_verification_failed' (×6 across
-- the two verifiers), and subscription-webhook's dynamic `eventType` variable, traced through
-- both of its switch statements to values already in the list. 'receipt_verification_succeeded'
-- is the ONLY missing one. Recorded as a finding rather than inventing a second.
--
-- ============================================================================
-- SHAPE OF THIS MIGRATION
-- ============================================================================
-- DROP + re-ADD, following the convention 20260607120000_auth_uid_rls.sql already uses.
-- Postgres has no "add a value to a CHECK constraint" primitive.
--
-- The constraint is UNNAMED in base_schema.sql, so Postgres auto-named it
-- `subscription_events_event_type_check`. That name is VERIFIED against the live catalog
-- (pg_constraint), not assumed from the naming rule.
--
-- The separate `metadata_size` CHECK (pg_column_size(metadata) <= 2048) is NOT touched.
--
-- ROLLBACK: re-run the DROP and re-ADD with the original twelve values. Safe as long as no
-- row carrying the new value exists yet; once one does, the row must be deleted or migrated
-- first or the re-ADD will fail validation.
--
-- Idempotent: DROP ... IF EXISTS + re-ADD; safe to re-run.

ALTER TABLE public.subscription_events
  DROP CONSTRAINT IF EXISTS subscription_events_event_type_check;

ALTER TABLE public.subscription_events
  ADD CONSTRAINT subscription_events_event_type_check CHECK (event_type IN (
    'trial_started',
    'trial_ending_soon',
    'trial_ended',
    'subscription_started',
    'subscription_renewed',
    'subscription_cancelled',
    'payment_failed',
    'grace_period_started',
    'grace_period_ending',
    'subscription_expired',
    'subscription_restored',
    'receipt_verification_failed',
    'receipt_verification_succeeded'   -- DEBUG-446: the value the success path has always sent
  ));

-- ============================================================================
-- Fail-closed assertions.
-- ============================================================================
DO $$
DECLARE
  v_def       text;
  v_probe_id  uuid;
BEGIN
  SELECT pg_get_constraintdef(con.oid) INTO v_def
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = rel.relnamespace
   WHERE n.nspname = 'public'
     AND rel.relname = 'subscription_events'
     AND con.conname = 'subscription_events_event_type_check';

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'DEBUG-446 FAIL: subscription_events_event_type_check does not exist after re-ADD';
  END IF;

  -- (i) the new value is permitted.
  IF v_def NOT LIKE '%receipt_verification_succeeded%' THEN
    RAISE EXCEPTION
      'DEBUG-446 FAIL: constraint does not permit receipt_verification_succeeded. Definition: %', v_def;
  END IF;

  -- (ii) the twelve originals SURVIVED. A DROP+ADD that silently narrowed the allowed set
  -- would break the failure path and the webhook while making the success path work — a
  -- strictly worse outcome than the defect being fixed.
  IF v_def NOT LIKE '%trial_started%'
     OR v_def NOT LIKE '%trial_ending_soon%'
     OR v_def NOT LIKE '%trial_ended%'
     OR v_def NOT LIKE '%subscription_started%'
     OR v_def NOT LIKE '%subscription_renewed%'
     OR v_def NOT LIKE '%subscription_cancelled%'
     OR v_def NOT LIKE '%payment_failed%'
     OR v_def NOT LIKE '%grace_period_started%'
     OR v_def NOT LIKE '%grace_period_ending%'
     OR v_def NOT LIKE '%subscription_expired%'
     OR v_def NOT LIKE '%subscription_restored%'
     OR v_def NOT LIKE '%receipt_verification_failed%'
  THEN
    RAISE EXCEPTION
      'DEBUG-446 FAIL: the re-ADDed constraint dropped one of the twelve original values. Definition: %', v_def;
  END IF;

  -- (iii) the metadata_size CHECK is untouched — it caps the JSONB at 2KB and is a
  -- compliance-relevant control, not incidental.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = rel.relnamespace
     WHERE n.nspname = 'public' AND rel.relname = 'subscription_events'
       AND con.conname = 'metadata_size'
  ) THEN
    RAISE EXCEPTION 'DEBUG-446 FAIL: the metadata_size CHECK is gone';
  END IF;

  RAISE NOTICE
    'DEBUG-446 PASS: event_type now permits 13 values incl. receipt_verification_succeeded; '
    'all 12 originals intact; metadata_size CHECK untouched.';
END $$;
