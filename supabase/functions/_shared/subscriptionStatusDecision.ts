/**
 * Apple subscription status from SIGNED claims — shared by the daily job and the webhook
 * (DEBUG-772).
 *
 * Pure and import-free, with no env reads (the INFRA-442 drift script walks _shared/). Both
 * callers pass claims they have already verified: grace-period-automation from the App Store
 * Server API's signed status items, subscription-webhook from the notification's signed
 * transaction and renewal info. Same claims in, same status out — that is the parity AC1
 * asks for, and _tests/subscription-status-parity.test.ts pins it with one table.
 *
 * THE RULE. Billing retry alone is not access. Past its expiry a subscription is 'grace' only
 * while Apple's signed gracePeriodExpiresDate is in the future, after the expiry, and within
 * Apple's longest grace period of it (28 days, plus clock skew). Every 'grace' carries that
 * end, so `expire_grace_periods()` — which skips a NULL grace_period_end — can always end it.
 * Anything else past expiry, and any revocation, is 'expired'.
 *
 * Inputs are decided only from SIGNED fields: expiresDate, revocationDate,
 * gracePeriodExpiresDate. `isInBillingRetryPeriod` is never a grant. Apple's status-endpoint
 * `status` enum is unsigned and is deliberately not an input.
 */

const DAY_MS = 86_400_000;

/** Apple's longest Billing Grace Period (3, 16 or 28 days are the configurable lengths). */
export const APPLE_MAX_GRACE_MS = 28 * DAY_MS;

/** Allowance for clock skew on the grace-end cap. */
export const GRACE_CAP_SKEW_MS = 5 * 60 * 1000;

export type AppleAccessStatus = 'active' | 'grace' | 'expired';

export interface SignedTransactionClaims {
  expiresDate?: unknown;
  revocationDate?: unknown;
  originalTransactionId?: unknown;
}

export interface SignedRenewalClaims {
  environment?: unknown;
  originalTransactionId?: unknown;
  gracePeriodExpiresDate?: unknown;
  isInBillingRetryPeriod?: unknown;
}

export type PostExpiryDecision =
  | { status: 'grace'; gracePeriodEndMs: number }
  | { status: 'expired' };

export interface AppleStatusDecision {
  status: AppleAccessStatus;
  /** The transaction's expiry; absent on a revocation (the caller keeps the stored end). */
  expiresMs?: number;
  /** Present exactly when status is 'grace'. */
  gracePeriodEndMs?: number;
}

/**
 * A signed millisecond timestamp: a positive finite number, or a string of digits (the
 * webhook's fixtures and some decoders carry them as strings). Anything else is absent.
 */
export function claimMs(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? v : undefined;
  if (typeof v === 'string' && /^[0-9]{1,16}$/.test(v)) {
    const n = Number(v);
    return n > 0 ? n : undefined;
  }
  return undefined;
}

/**
 * Renewal info carries no bundleId, so it cannot be app-scoped on its own. It is trusted only
 * when bound to a transaction that WAS scoped: same environment, same originalTransactionId.
 */
export function renewalBoundToTransaction(
  renewal: SignedRenewalClaims | null | undefined,
  txn: SignedTransactionClaims,
  environment: string,
): boolean {
  if (!renewal || typeof renewal !== 'object') return false;
  return (
    renewal.environment === environment &&
    typeof renewal.originalTransactionId === 'string' &&
    renewal.originalTransactionId === txn.originalTransactionId
  );
}

/** Past `expiresMs`: grace only inside a bounded, signed grace period; otherwise expired. */
export function decidePostExpiryStatus(
  expiresMs: number,
  renewal: SignedRenewalClaims | null | undefined,
  nowMs: number,
): PostExpiryDecision {
  const graceEnd = claimMs(renewal?.gracePeriodExpiresDate);
  if (
    graceEnd !== undefined &&
    graceEnd > nowMs &&
    graceEnd > expiresMs &&
    graceEnd <= expiresMs + APPLE_MAX_GRACE_MS + GRACE_CAP_SKEW_MS
  ) {
    return { status: 'grace', gracePeriodEndMs: graceEnd };
  }
  return { status: 'expired' };
}

/**
 * The status a verified transaction (plus its bound renewal info, when there is any) implies
 * at `nowMs`. Null when the transaction has no usable expiresDate: undecidable, never a
 * status. A trial is not adjudicated here — the daily job keeps its own trial overlay.
 */
export function decideAppleStatus(
  txn: SignedTransactionClaims,
  renewal: SignedRenewalClaims | null | undefined,
  nowMs: number,
): AppleStatusDecision | null {
  if (claimMs(txn.revocationDate) !== undefined) return { status: 'expired' };
  const expiresMs = claimMs(txn.expiresDate);
  if (expiresMs === undefined) return null;
  if (expiresMs > nowMs) return { status: 'active', expiresMs };
  const post = decidePostExpiryStatus(expiresMs, renewal, nowMs);
  return post.status === 'grace'
    ? { status: 'grace', expiresMs, gracePeriodEndMs: post.gracePeriodEndMs }
    : { status: 'expired', expiresMs };
}
