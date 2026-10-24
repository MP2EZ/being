/**
 * DEBUG-827 — the key processVerifiedPurchase coalesces concurrent calls on.
 *
 * A Restore tap can overlap the listener's handling of the same StoreKit or Play
 * transaction. Calls with one key share one verify → persist → finish → event.
 *
 * The identity is chosen BY PLATFORM, never `transactionId ?? purchaseToken`: on iOS
 * the purchaseToken is the JWS, which can differ between the listener's purchase and
 * getAvailablePurchases' copy of the same transaction, while the transactionId does
 * not. No usable identity returns undefined, and the caller then does not coalesce.
 *
 * The erasure generation is part of the key, so a call made after an erasure never
 * joins one made before it (DEBUG-697).
 *
 * Pure module, like appleTransactionIdentity: suites that stub IAPService need not
 * mirror it.
 */

import { appleTransactionIdentityFrom } from './appleTransactionIdentity';

export function purchaseCoalesceKey(
  generation: number,
  platform: 'apple' | 'google' | 'none',
  purchase: unknown
): string | undefined {
  let identity: string | undefined;
  if (platform === 'apple') {
    identity = appleTransactionIdentityFrom(purchase)?.transactionId;
  } else if (platform === 'google') {
    const token = (purchase as { purchaseToken?: unknown } | null | undefined)?.purchaseToken;
    identity = typeof token === 'string' && token.length > 0 ? token : undefined;
  }
  return identity === undefined ? undefined : `${generation}:${platform}:${identity}`;
}
