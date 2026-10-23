-- DEBUG-842 — after a subscription transfer the old uid keeps no subscription history and no
-- store date. Replaces transfer_subscription() from 20261021000000 with three changes:
--
--   (a) It DELETEs the old uid's subscription_events. Each one dates a purchase, renewal or
--       billing failure that the new row's exact store dates still carry, to within seconds to a
--       day: a unique join at N≈1. This carves events out of FEAT-833's "never DELETE", which was
--       about subscriptions rows and still holds for them. It supersedes DEBUG-840's "a transfer
--       does not reset the clock": §7.3's 3 years is a ceiling, and the stores, as merchant of
--       record, keep the refund and dispute trail.
--   (d) The tombstone's created_at becomes v_day, equal to its coarsened updated_at. Left alone it
--       recorded the first verify, which matches the purchase time of day on every later
--       subscription_end_date.
--   (c) subscription_start_date and trial_start_date are out of p_fields' whitelist. The RPC
--       sets them to the transfer time, so FEAT-714 cannot copy Apple's originalPurchaseDate in.
--       Each is clamped 1µs below its end date: a grace transfer past expiry still satisfies the
--       start < end CHECKs, and the clamped value repeats a date the row already holds.
--
-- RULING (founder + compliance, 2026-10-22). Accepted residual, recorded on FEAT-714 and handed to
-- MAINT-834: the transfer day (ruling 6), the tombstone's plan attributes, and the old uid's
-- auth.users / public.users created_at when the purchase minted it (MAINT-847 maps the rest).
-- Supported claim: no record stores both identifiers. Never "cannot be linked".
--
-- Grants and ownership are unchanged: CREATE OR REPLACE keeps them, and the REVOKE/GRANT below
-- restate them. service_role holds no DELETE on subscription_events; the function's owner does.
-- Idempotent: the function is replaced whole.
-- Pinned by supabase/tests/debug842_transfer_old_uid_history.sql, alongside
-- supabase/tests/feat833_subscription_transfer.sql. The Deno column-list pin
-- (supabase/functions/_tests/subscription-transfer-status.test.ts) now reads this file.

CREATE OR REPLACE FUNCTION public.transfer_subscription(
  p_platform text,
  p_original_transaction_id text,
  p_caller_uid uuid,
  p_expected_holder uuid,
  p_fields jsonb,
  p_proof_hash text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  allowed_keys constant text[] := ARRAY[
    'status', 'interval', 'tier', 'platform_subscription_id', 'platform_customer_id',
    'receipt_hash', 'receipt_data_encrypted', 'environment', 'price_usd', 'currency',
    'trial_end_date', 'subscription_end_date',
    'grace_period_end', 'last_payment_date', 'last_receipt_verified', 'last_store_event_at'
  ];
  v_old        public.subscriptions%ROWTYPE;
  v_mine       public.subscriptions%ROWTYPE;
  v_key        text;
  v_ledger_id  bigint;
  v_day        timestamptz;
  v_new_id     uuid;
  v_sub_end    timestamptz;
  v_trial_end  timestamptz;
BEGIN
  IF p_platform IS NULL OR p_platform NOT IN ('apple', 'google') THEN
    RAISE EXCEPTION 'transfer_subscription: invalid platform';
  END IF;
  IF p_original_transaction_id IS NULL OR length(p_original_transaction_id) = 0 THEN
    RAISE EXCEPTION 'transfer_subscription: missing transaction id';
  END IF;
  IF p_caller_uid IS NULL OR p_expected_holder IS NULL THEN
    RAISE EXCEPTION 'transfer_subscription: missing principal';
  END IF;
  IF p_fields IS NULL OR jsonb_typeof(p_fields) <> 'object' THEN
    RAISE EXCEPTION 'transfer_subscription: p_fields must be an object';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_fields) k WHERE k <> ALL (allowed_keys)) THEN
    RAISE EXCEPTION 'transfer_subscription: p_fields carries a key outside the whitelist';
  END IF;
  IF (p_fields->>'status') IS NULL OR (p_fields->>'status') NOT IN ('active', 'trial', 'grace') THEN
    RAISE EXCEPTION 'transfer_subscription: status must be active, trial or grace';
  END IF;
  IF (p_fields->>'interval') IS NULL OR (p_fields->>'last_store_event_at') IS NULL THEN
    RAISE EXCEPTION 'transfer_subscription: interval and last_store_event_at are required';
  END IF;

  -- Lock the bound row and the caller's row in ONE statement, in id order, so two transfers
  -- crossing in opposite directions cannot deadlock.
  PERFORM 1 FROM public.subscriptions
   WHERE (platform = p_platform AND original_transaction_id = p_original_transaction_id)
      OR user_id = p_caller_uid
   ORDER BY id
   FOR UPDATE;

  SELECT * INTO v_old FROM public.subscriptions
   WHERE platform = p_platform AND original_transaction_id = p_original_transaction_id;
  IF NOT FOUND THEN
    -- The holder deleted their account mid-flight: the caller falls back to a normal verify.
    RETURN jsonb_build_object('outcome', 'not_found', 'subscription_id', NULL);
  END IF;
  IF v_old.user_id = p_caller_uid THEN
    RETURN jsonb_build_object('outcome', 'same_holder', 'subscription_id', NULL);
  END IF;
  IF v_old.user_id <> p_expected_holder THEN
    RETURN jsonb_build_object('outcome', 'cas_miss', 'subscription_id', NULL);
  END IF;

  SELECT * INTO v_mine FROM public.subscriptions WHERE user_id = p_caller_uid;
  IF FOUND AND v_mine.status IN ('active', 'trial', 'grace')
     AND v_mine.original_transaction_id IS DISTINCT FROM p_original_transaction_id THEN
    RETURN jsonb_build_object('outcome', 'caller_has_live_row', 'subscription_id', NULL);
  END IF;

  IF (SELECT count(*) FROM public.subscription_transfer_proof_failures
       WHERE user_id = p_caller_uid AND failed_at > now() - interval '1 hour') >= 5 THEN
    RETURN jsonb_build_object('outcome', 'rate_limited', 'subscription_id', NULL);
  END IF;

  v_key := encode(sha256(convert_to(p_platform || E'\x1f' || p_original_transaction_id, 'UTF8')), 'hex');
  IF EXISTS (SELECT 1 FROM public.subscription_transfer_ledger
              WHERE txn_key = v_key AND transferred_at > now() - interval '10 minutes')
     OR (SELECT count(*) FROM public.subscription_transfer_ledger
          WHERE txn_key = v_key AND transferred_at > now() - interval '24 hours') >= 3
     OR (SELECT count(*) FROM public.subscription_transfer_ledger
          WHERE txn_key = v_key AND transferred_at > now() - interval '30 days') >= 10 THEN
    RETURN jsonb_build_object('outcome', 'rate_limited', 'subscription_id', NULL);
  END IF;

  -- The UNIQUE index settles a reused proof inside this transaction, not in a check-then-act read.
  INSERT INTO public.subscription_transfer_ledger (txn_key, proof_hash)
  VALUES (v_key, p_proof_hash)
  ON CONFLICT (proof_hash) DO NOTHING
  RETURNING id INTO v_ledger_id;
  IF v_ledger_id IS NULL THEN
    RETURN jsonb_build_object('outcome', 'proof_reused', 'subscription_id', NULL);
  END IF;

  -- Tombstone. The UTC day, never now(): it must differ from the new row's updated_at, carry no
  -- time of day, and still differ from the old value so a racing webhook's CAS trips.
  v_day := date_trunc('day', now(), 'UTC');
  WHILE v_day = now() OR v_day IS NOT DISTINCT FROM v_old.updated_at LOOP
    v_day := v_day - interval '1 day';
  END LOOP;

  -- Keep this column list identical to TOMBSTONE_NULLED_COLUMNS (a Deno test parses it).
  UPDATE public.subscriptions SET
    status = 'expired',
    original_transaction_id = NULL,
    platform_subscription_id = NULL,
    platform_customer_id = NULL,
    receipt_hash = NULL,
    receipt_data_encrypted = NULL,
    trial_start_date = NULL,
    trial_end_date = NULL,
    subscription_start_date = NULL,
    subscription_end_date = NULL,
    grace_period_end = NULL,
    last_payment_date = NULL,
    last_receipt_verified = NULL,
    last_store_event_at = NULL,
    created_at = v_day,
    updated_at = v_day
  WHERE id = v_old.id;

  -- DEBUG-842 (a): the old uid keeps no subscription history. Every one of its events dates a
  -- purchase, renewal or billing failure that the new row's store dates still carry.
  DELETE FROM public.subscription_events WHERE user_id = v_old.user_id;

  -- DEBUG-842 (c): start dates are the transfer time, never the handler's. Clamped below the
  -- end so a grace row past its expiry still satisfies the start < end CHECKs.
  v_sub_end := (p_fields->>'subscription_end_date')::timestamptz;
  v_trial_end := (p_fields->>'trial_end_date')::timestamptz;

  -- Every column is set explicitly, so an expired row the caller already had keeps no stale dates.
  INSERT INTO public.subscriptions AS s (
    user_id, platform, original_transaction_id, status, tier, interval,
    platform_subscription_id, platform_customer_id, receipt_hash, receipt_data_encrypted,
    environment, price_usd, currency,
    trial_start_date, trial_end_date, subscription_start_date, subscription_end_date,
    grace_period_end, last_payment_date, last_receipt_verified, last_store_event_at,
    payment_failure_count, updated_at
  ) VALUES (
    p_caller_uid, p_platform, p_original_transaction_id,
    p_fields->>'status', COALESCE(p_fields->>'tier', 'standard'), p_fields->>'interval',
    p_fields->>'platform_subscription_id', p_fields->>'platform_customer_id',
    p_fields->>'receipt_hash', p_fields->>'receipt_data_encrypted',
    p_fields->>'environment', (p_fields->>'price_usd')::numeric, COALESCE(p_fields->>'currency', 'USD'),
    CASE WHEN v_trial_end IS NOT NULL THEN LEAST(now(), v_trial_end - interval '1 microsecond') END, v_trial_end,
    CASE WHEN v_sub_end IS NOT NULL THEN LEAST(now(), v_sub_end - interval '1 microsecond') END, v_sub_end,
    (p_fields->>'grace_period_end')::timestamptz, (p_fields->>'last_payment_date')::timestamptz,
    (p_fields->>'last_receipt_verified')::timestamptz, (p_fields->>'last_store_event_at')::timestamptz,
    0, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    platform = EXCLUDED.platform,
    original_transaction_id = EXCLUDED.original_transaction_id,
    status = EXCLUDED.status,
    tier = EXCLUDED.tier,
    interval = EXCLUDED.interval,
    platform_subscription_id = EXCLUDED.platform_subscription_id,
    platform_customer_id = EXCLUDED.platform_customer_id,
    receipt_hash = EXCLUDED.receipt_hash,
    receipt_data_encrypted = EXCLUDED.receipt_data_encrypted,
    environment = EXCLUDED.environment,
    price_usd = EXCLUDED.price_usd,
    currency = EXCLUDED.currency,
    trial_start_date = EXCLUDED.trial_start_date,
    trial_end_date = EXCLUDED.trial_end_date,
    subscription_start_date = EXCLUDED.subscription_start_date,
    subscription_end_date = EXCLUDED.subscription_end_date,
    grace_period_end = EXCLUDED.grace_period_end,
    last_payment_date = EXCLUDED.last_payment_date,
    last_receipt_verified = EXCLUDED.last_receipt_verified,
    last_store_event_at = EXCLUDED.last_store_event_at,
    payment_failure_count = 0,
    updated_at = now()
  RETURNING s.id INTO v_new_id;

  -- In the same transaction, so a transfer never lands without its event.
  PERFORM public.log_subscription_event(
    p_caller_uid, v_new_id, 'subscription_restored',
    jsonb_build_object('platform', p_platform, 'reason', 'transfer')
  );

  RETURN jsonb_build_object('outcome', 'transferred', 'subscription_id', v_new_id);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.transfer_subscription(text, text, uuid, uuid, jsonb, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_subscription(text, text, uuid, uuid, jsonb, text)
  TO service_role;
COMMENT ON FUNCTION public.transfer_subscription(text, text, uuid, uuid, jsonb, text) IS
  'FEAT-833: moves a subscription binding to the caller on verified ownership — CAS on the '
  'expected holder, rate limits, proof-reuse refusal, in-place tombstone, caller upsert and '
  'subscription_restored audit, atomically. Inert until FEAT-714''s handler calls it. service_role only. '
  'DEBUG-842: deletes the old uid''s subscription_events, coarsens the tombstone''s created_at to the '
  'transfer day, and sets the new row''s start dates itself.';
