/**
 * Mapping from Apple's verified transaction claims to Being's subscription contract
 * (INFRA-467 slice 3).
 *
 * WHY THIS IS NOT INSIDE verify-apple-receipt/index.ts. That module calls `serve()` at
 * top level, so nothing can import it — no `_tests/` file resolves its module graph, which
 * is why an unvendored import there would fail only at deploy and stay green in CI. Pure
 * decision logic living in there is therefore untestable by construction. The trial mapping
 * below is precisely the logic that must not be: omitting or breaking it does not fail
 * loudly, it silently writes every trial subscriber as `active`.
 *
 * Every field here arrives from a payload whose signature has already been verified against
 * the pinned Apple root and asserted in-scope for this app. These functions do no
 * verification of their own and must never be handed unverified claims.
 */

/** The subset of Apple's JWSTransactionDecodedPayload this backend acts on. */
export interface AppleTransactionClaims {
  productId?: string;
  originalTransactionId?: string;
  /** Milliseconds since epoch, per Apple's encoding. */
  expiresDate?: number;
  /** Present only if the transaction was refunded or revoked. */
  revocationDate?: number;
  offerType?: number;
  offerDiscountType?: string;
}

export interface VerificationResult {
  valid: boolean;
  subscriptionId?: string;
  productId?: string;
  expiresDate?: string;
  isTrialPeriod?: boolean;
  environment?: string;
  error?: string;
}

/** Apple's introductory-offer code. Its discount type says whether it is actually free. */
export const OFFER_TYPE_INTRODUCTORY = 1;

/**
 * Is this transaction inside a free trial?
 *
 * THE FIELD THIS REPLACES DOES NOT EXIST ON THIS API. The legacy path read
 * `latest_receipt_info[0].is_trial_period === 'true'`; the App Store Server API has no
 * equivalent, and the analogue is `offerType` / `offerDiscountType`.
 *
 * The ambiguous case is an introductory offer whose `offerDiscountType` is absent (older
 * payload versions omit it). It resolves toward `trial`, because the asymmetry is not even:
 * billing a trial user as active is the failure this mapping exists to prevent, while
 * treating a discounted-but-paid introductory offer as a trial costs nothing the renewal
 * will not correct.
 */
export function isFreeTrial(claims: AppleTransactionClaims): boolean {
  if (claims.offerDiscountType === 'FREE_TRIAL') return true;
  return claims.offerType === OFFER_TYPE_INTRODUCTORY && claims.offerDiscountType === undefined;
}

/**
 * Map verified transaction claims to this backend's response contract.
 *
 * `autoRenewEnabled` is deliberately absent. The legacy path derived it from
 * `pending_renewal_info`, but it was written to no column and read by no client — and the
 * App Store Server API does not carry it on the transaction at all (it lives on the
 * separate subscription-status endpoint). Reinstating it would cost a second Apple
 * round-trip to reproduce a value nothing consumed.
 */
export function parseTransaction(
  claims: AppleTransactionClaims,
  environment: string,
  now: number = Date.now(),
): VerificationResult {
  const expiresMs = typeof claims.expiresDate === 'number' ? claims.expiresDate : 0;
  const isActive = expiresMs > now;
  const isRevoked = typeof claims.revocationDate === 'number';

  return {
    valid: isActive && !isRevoked,
    subscriptionId: claims.originalTransactionId,
    productId: claims.productId,
    expiresDate: expiresMs ? new Date(expiresMs).toISOString() : undefined,
    isTrialPeriod: isFreeTrial(claims),
    environment,
  };
}
