/**
 * Subscription transfer (FEAT-833, FEAT-714 slice 1a): the closed set of responses a
 * transfer request can get, the outcomes `transfer_subscription()` returns, and the columns
 * its tombstone NULLs.
 *
 * Pure and import-free, with no env reads (the INFRA-442 drift script walks _shared/).
 * Nothing calls the RPC yet; FEAT-714's Apple handler maps TRANSFER_RPC_OUTCOMES onto
 * TRANSFER_STATUSES. _tests/subscription-transfer-status.test.ts pins both sets exactly, and
 * pins TOMBSTONE_NULLED_COLUMNS against the migration's own UPDATE so the two cannot drift.
 *
 * SCOPE. Every response to a parsed request that carries `intent: 'transfer'`. The pre-parse
 * 401 and 405 are unchanged, and so is the 409 for a request without the intent.
 */

export interface TransferStatusMeaning {
  http: number;
  meaning: string;
}

export const TRANSFER_STATUSES = {
  transferred: {
    http: 200,
    meaning: 'The caller holds the binding when the request ends: after a transfer, as the ' +
      'same holder, or on a normal verify of an unbound transaction.',
  },
  transfer_request_invalid: {
    http: 400,
    meaning: "intent present but not exactly 'transfer'; a mock id with intent 'transfer'; a " +
      'missing transaction id or token; or, for a transaction bound elsewhere, a missing or ' +
      'malformed ownership proof.',
  },
  transfer_proof_rejected: {
    http: 403,
    meaning: 'An ownership-proof check failed, or the proof was already used (proof_reused). ' +
      'The only status counted as a failed proof.',
  },
  bound_elsewhere: {
    http: 409,
    meaning: 'Lost a compare-and-swap race to another uid (cas_miss).',
  },
  transfer_not_eligible: {
    http: 422,
    meaning: 'FAMILY_SHARED; not active or grace; revoked or expired; the store has no such ' +
      'transaction; or the caller already holds a different live subscription.',
  },
  transfer_rate_limited: {
    http: 429,
    meaning: 'A transaction-keyed transfer limit, or the per-uid failed-proof limit.',
  },
  store_unavailable: {
    http: 503,
    meaning: 'The store is unreachable. Fails closed, no state change.',
  },
  transfer_internal: {
    http: 500,
    meaning: 'Misconfiguration or an RPC error. No state change.',
  },
} as const satisfies Record<string, TransferStatusMeaning>;

export type TransferStatus = keyof typeof TRANSFER_STATUSES;

/** What `transfer_subscription()` returns in `outcome`. */
export const TRANSFER_RPC_OUTCOMES = [
  'transferred',
  'not_found',
  'same_holder',
  'cas_miss',
  'caller_has_live_row',
  'rate_limited',
  'proof_reused',
] as const;

export type TransferRpcOutcome = typeof TRANSFER_RPC_OUTCOMES[number];

/**
 * The columns the tombstone NULLs, in the migration's order. Its row keeps user_id,
 * platform, environment, interval, tier and the non-identifying columns; status becomes
 * 'expired' and updated_at the UTC day.
 */
export const TOMBSTONE_NULLED_COLUMNS = [
  'original_transaction_id',
  'platform_subscription_id',
  'platform_customer_id',
  'receipt_hash',
  'receipt_data_encrypted',
  'trial_start_date',
  'trial_end_date',
  'subscription_start_date',
  'subscription_end_date',
  'grace_period_end',
  'last_payment_date',
  'last_receipt_verified',
  'last_store_event_at',
] as const;
