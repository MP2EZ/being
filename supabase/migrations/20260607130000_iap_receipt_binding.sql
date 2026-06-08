-- =====================================================
-- INFRA-260 PR2 — IAP receipt: replay binding + encryption-at-rest columns
-- =====================================================
--
-- Binds an IAP transaction to exactly one auth.uid() so a receipt cannot be
-- replayed across identities, and adds the columns the edge functions use to
-- store the receipt encrypted (AES-256-GCM) plus a hash for dedup.
--
-- WHY A DB CONSTRAINT (not RLS): verify-apple-receipt / verify-google-receipt run
-- with the SERVICE-ROLE key, which BYPASSES RLS — so the replay guard cannot be an
-- RLS WITH CHECK. It is (a) an explicit ownership SELECT-and-reject in the function
-- body, backed by (b) this partial UNIQUE index as the TOCTOU race backstop: two
-- uids racing to bind the same txn → exactly one wins, the other hits the
-- constraint and the function returns 409.
--
-- original_transaction_id holds the platform's stable, replay-relevant identifier:
-- Apple `original_transaction_id`, Google `purchaseToken`. Scoped by `platform` in
-- the index so the two namespaces never collide.

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS original_transaction_id TEXT;
-- SHA-256 of the raw receipt/token — lets the edge function detect an identical
-- resubmission (idempotent re-verify) without decrypting, and is non-reversible.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS receipt_hash TEXT;

-- One transaction binds to exactly one row (hence one user) per platform.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_txn_per_platform
  ON subscriptions (platform, original_transaction_id)
  WHERE original_transaction_id IS NOT NULL;

COMMENT ON COLUMN subscriptions.original_transaction_id IS
  'Platform stable txn id (Apple original_transaction_id / Google purchaseToken). UNIQUE per platform — binds an entitlement to one auth.uid(), blocking cross-identity replay (INFRA-260 PR2).';
COMMENT ON COLUMN subscriptions.receipt_hash IS
  'SHA-256 of the raw receipt/token for idempotent re-verification + dedup. Non-reversible (the re-verifiable blob is receipt_data_encrypted).';
COMMENT ON COLUMN subscriptions.receipt_data_encrypted IS
  'AES-256-GCM-encrypted receipt for server-side re-verification (version∥iv∥ciphertext∥tag, base64). Key: RECEIPT_ENCRYPTION_KEY function secret, never the service-role key. (INFRA-260 PR2)';

-- =====================================================
-- ROLLBACK (manual; non-destructive at zero rows):
-- DROP INDEX IF EXISTS uniq_txn_per_platform;
-- ALTER TABLE subscriptions DROP COLUMN IF EXISTS receipt_hash;
-- ALTER TABLE subscriptions DROP COLUMN IF EXISTS original_transaction_id;
