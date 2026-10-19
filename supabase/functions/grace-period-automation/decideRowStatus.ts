/**
 * INFRA-741 — the daily job's row decision, extracted from handler.ts so it can be tested.
 *
 * The store-state decision itself is NOT here: it is `decideAppleStatus` in
 * `_shared/subscriptionStatusDecision.ts` (DEBUG-772), shared with the webhook so the two never
 * disagree, and pinned by `_tests/subscription-status-parity.test.ts`. What stays local is the
 * cron's own overlay — the trial carry-over and the ISO formatting of the write.
 */

import { decideAppleStatus } from '../_shared/subscriptionStatusDecision.ts';

export interface RowDecision {
  status: string;
  expiresDateIso?: string;
  gracePeriodEndIso?: string;
}

/**
 * Decide the row's new state from CLAIMS THAT HAVE BEEN VERIFIED, with the decision the
 * webhook uses so the two never disagree on the same store state. Never called with anything
 * unverified.
 *
 * A downgrade requires POSITIVE signed evidence: a revocation, or an elapsed expiry outside a
 * signed grace period. DEBUG-772 corrected the second half: billing retry ALONE used to keep a
 * row in 'grace' with no end date for as long as Apple retried (up to 60 days), and an unbounded
 * grace row is one `expire_grace_periods()` never ends. With Billing Grace Period off, Apple has
 * already ended the entitlement; recovery (DID_RENEW, BILLING_RECOVERY) restores it through the
 * webhook or a client re-verification.
 *
 * The trial overlay stays here: a trial still inside its period stays a trial — this cron does
 * not adjudicate trial-vs-active; `parseTransaction` owns that at verification time.
 *
 * Returns null for a malformed payload; the caller counts it `payload_malformed`.
 */
export function decideRowStatus(
  txn: Record<string, unknown>,
  renewal: Record<string, unknown>,
  currentStatus: string,
  now: number,
): RowDecision | null {
  const decided = decideAppleStatus(txn, renewal, now);
  if (!decided) return null;
  return {
    status: decided.status === 'active' && currentStatus === 'trial' ? 'trial' : decided.status,
    ...(decided.expiresMs !== undefined ? { expiresDateIso: new Date(decided.expiresMs).toISOString() } : {}),
    ...(decided.gracePeriodEndMs !== undefined
      ? { gracePeriodEndIso: new Date(decided.gracePeriodEndMs).toISOString() }
      : {}),
  };
}
