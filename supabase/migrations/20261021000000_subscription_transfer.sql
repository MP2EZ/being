-- FEAT-833 (FEAT-714 slice 1a) — subscription transfer: one atomic RPC, a uid-free transfer
-- ledger, a per-uid failed-proof counter, and an hourly prune.
--
-- INERT ON MERGE. Nothing calls transfer_subscription() until FEAT-714's Apple handler does.
-- The founder-run db push may land before that handler deploys, never after it.
--
-- RULINGS THIS ENCODES (founder 2026-10-19/2026-10-21/2026-10-22; compliance 2026-10-22):
--   * On verified ownership the binding moves to the caller; the old row is TOMBSTONED IN PLACE
--     (user_id unchanged, status 'expired', identifying columns NULLed). Never UPDATE user_id —
--     it would re-link subscription_events.subscription_id — and never DELETE (no grant exists).
--   * No persisted record joins the old and new uid. The ledger is keyed by a hash of the
--     transaction, with no uid column; the failed-proof counter is keyed by uid, with no
--     transaction column. Audit goes on the new uid only (subscription_restored, reason
--     'transfer'), metadata exactly {platform, reason}.
--   * The tombstone's updated_at is coarsened to the UTC day, so it cannot match the new row's
--     updated_at to the microsecond (inside one transaction now() is constant). It still CHANGES,
--     so a webhook holding the pre-transfer updated_at loses its conditioned UPDATE and re-reads.
--     update_subscription_timestamp() is amended below so the trigger does not undo that.
--   * The new row's last_store_event_at is the signedDate of the store verification behind this
--     transfer, passed in p_fields — NOT carried from the old row, whose value is the old uid's
--     last webhook time (a seconds-precision join). That signedDate postdates every earlier
--     notification, so DEBUG-751's stale-event guard still drops them.
--   * Ledger rows are kept 31 days (the 30-day rate-limit horizon plus slack for the hourly run);
--     failed-proof rows past their 1-hour window. The proof hash is UNIQUE only while its row
--     lives, so FEAT-714 must refuse proofs older than a 24h freshness window.
--   * No RAISE text interpolates a uid or a row id: Postgres logs keep error text.
--
-- GRANTS. Both tables: RLS on, no policies, REVOKE ALL FROM anon, authenticated. service_role's
-- default TRUNCATE/REFERENCES/TRIGGER are left alone, per maint441 Test 6. The two RPCs are
-- service_role-only (debug440); every SECURITY DEFINER function pins search_path (debug455).
--
-- Pinned by supabase/tests/feat833_subscription_transfer.sql (hand-run) and, for the status
-- set and the tombstone column list, supabase/functions/_tests/subscription-transfer-status.test.ts.

-- =====================================================
-- 1. The updated_at trigger keeps the tombstone's coarsened value
-- =====================================================
-- Structural, not a session flag: the only write that NULLs original_transaction_id is the
-- tombstone, and a GUC escape hatch would let any service_role writer set any updated_at.
CREATE OR REPLACE FUNCTION public.update_subscription_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.original_transaction_id IS NOT NULL AND NEW.original_transaction_id IS NULL THEN
    RETURN NEW;
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =====================================================
-- 2. Transfer ledger (uid-free)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscription_transfer_ledger (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  txn_key        text NOT NULL,
  transferred_at timestamptz NOT NULL DEFAULT now(),
  proof_hash     text UNIQUE
);
CREATE INDEX IF NOT EXISTS subscription_transfer_ledger_key_at_idx
  ON public.subscription_transfer_ledger (txn_key, transferred_at DESC);
ALTER TABLE public.subscription_transfer_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.subscription_transfer_ledger FROM anon, authenticated;
COMMENT ON TABLE public.subscription_transfer_ledger IS
  'FEAT-833: one row per subscription transfer, for rate limits and proof-reuse refusal. '
  'txn_key = hex SHA-256 of convert_to(platform || E''\x1f'' || original_transaction_id, ''UTF8''). '
  'NO uid column, ever: this table must not join the old and new holder. Kept 31 days.';

-- =====================================================
-- 3. Failed-proof counter (no transaction column)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscription_transfer_proof_failures (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  failed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscription_transfer_proof_failures_user_at_idx
  ON public.subscription_transfer_proof_failures (user_id, failed_at DESC);
ALTER TABLE public.subscription_transfer_proof_failures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.subscription_transfer_proof_failures FROM anon, authenticated;
COMMENT ON TABLE public.subscription_transfer_proof_failures IS
  'FEAT-833: one row per rejected transfer ownership proof (5 per uid per hour). NO transaction '
  'column, ever. Pruned once its 1-hour window lapses; cascades on account deletion.';

-- =====================================================
-- 4. transfer_subscription
-- =====================================================
-- Returns {outcome, subscription_id}. subscription_id is the caller's row only on 'transferred'.
-- Outcomes: transferred | not_found | same_holder | cas_miss | caller_has_live_row |
-- rate_limited | proof_reused (TRANSFER_RPC_OUTCOMES in _shared/subscriptionTransfer.ts).
-- Invalid arguments RAISE; the handler maps that to 500 transfer_internal.
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
    'trial_start_date', 'trial_end_date', 'subscription_start_date', 'subscription_end_date',
    'grace_period_end', 'last_payment_date', 'last_receipt_verified', 'last_store_event_at'
  ];
  v_old        public.subscriptions%ROWTYPE;
  v_mine       public.subscriptions%ROWTYPE;
  v_key        text;
  v_ledger_id  bigint;
  v_day        timestamptz;
  v_new_id     uuid;
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
    updated_at = v_day
  WHERE id = v_old.id;

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
    (p_fields->>'trial_start_date')::timestamptz, (p_fields->>'trial_end_date')::timestamptz,
    (p_fields->>'subscription_start_date')::timestamptz, (p_fields->>'subscription_end_date')::timestamptz,
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
  'subscription_restored audit, atomically. Inert until FEAT-714''s handler calls it. service_role only.';

-- =====================================================
-- 5. record_subscription_transfer_proof_failure
-- =====================================================
-- The handler checks the ownership proof before calling transfer_subscription, so a rejected
-- proof (403 transfer_proof_rejected) is recorded here. Returns the uid's failures in the last hour.
CREATE OR REPLACE FUNCTION public.record_subscription_transfer_proof_failure(p_caller_uid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_caller_uid IS NULL THEN
    RAISE EXCEPTION 'record_subscription_transfer_proof_failure: missing principal';
  END IF;
  INSERT INTO public.subscription_transfer_proof_failures (user_id) VALUES (p_caller_uid);
  RETURN (SELECT count(*)::integer FROM public.subscription_transfer_proof_failures
           WHERE user_id = p_caller_uid AND failed_at > now() - interval '1 hour');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.record_subscription_transfer_proof_failure(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_subscription_transfer_proof_failure(uuid) TO service_role;

-- =====================================================
-- 6. Hourly prune, with a retention_prune_runs heartbeat (MAINT-347 pattern)
-- =====================================================
CREATE OR REPLACE FUNCTION public.run_subscription_transfer_prune()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  started_at timestamptz := clock_timestamp();
  n_failures integer;
  n_ledger   integer;
BEGIN
  DELETE FROM public.subscription_transfer_proof_failures WHERE failed_at < now() - interval '1 hour';
  GET DIAGNOSTICS n_failures = ROW_COUNT;
  DELETE FROM public.subscription_transfer_ledger WHERE transferred_at < now() - interval '31 days';
  GET DIAGNOSTICS n_ledger = ROW_COUNT;
  INSERT INTO public.retention_prune_runs (job_name, status, rows_deleted, duration_ms)
  VALUES (
    'subscription-transfer-prune', 'ok', n_failures + n_ledger,
    (EXTRACT(EPOCH FROM (clock_timestamp() - started_at)) * 1000)::integer
  );
EXCEPTION WHEN OTHERS THEN
  -- ⚠️ No RAISE here: re-raising would roll back this heartbeat row too (see 20260808000000).
  INSERT INTO public.retention_prune_runs (job_name, status, duration_ms, sqlstate, detail)
  VALUES (
    'subscription-transfer-prune', 'error',
    (EXTRACT(EPOCH FROM (clock_timestamp() - started_at)) * 1000)::integer,
    SQLSTATE, SQLERRM
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.run_subscription_transfer_prune() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.unschedule('subscription-transfer-prune')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'subscription-transfer-prune');
SELECT cron.schedule(
  'subscription-transfer-prune',
  '5 * * * *',
  $cron$ SELECT public.run_subscription_transfer_prune(); $cron$
);

-- =====================================================
-- ROLLBACK (manual). Drop in this order; restore the trigger body from 20260523000000.
-- =====================================================
-- SELECT cron.unschedule('subscription-transfer-prune');
-- DROP FUNCTION IF EXISTS public.run_subscription_transfer_prune();
-- DROP FUNCTION IF EXISTS public.record_subscription_transfer_proof_failure(uuid);
-- DROP FUNCTION IF EXISTS public.transfer_subscription(text, text, uuid, uuid, jsonb, text);
-- DROP TABLE IF EXISTS public.subscription_transfer_proof_failures;
-- DROP TABLE IF EXISTS public.subscription_transfer_ledger;
-- CREATE OR REPLACE FUNCTION public.update_subscription_timestamp() RETURNS TRIGGER
--   LANGUAGE plpgsql SET search_path = public, pg_temp
--   AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;
