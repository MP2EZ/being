/**
 * Map a store product ID back to its SubscriptionInterval (DEBUG-720).
 *
 * Shared by the async purchase listener in IAPService and the store's
 * restorePurchases. Its own module for the same reason as
 * appleTransactionIdentity.ts: it is pure logic with no IAP SDK dependency, so
 * the store can import it statically, and suites that `jest.mock` IAPService do
 * not have to mirror it in their mock factories.
 */
import {
  DEFAULT_SUBSCRIPTION_CONFIG,
  type SubscriptionInterval,
} from '@/core/types/subscription';

const PRODUCT_IDS = DEFAULT_SUBSCRIPTION_CONFIG.products;

/** Returns null for a product this app does not sell — callers skip it. */
export function intervalFromProductId(productId: string): SubscriptionInterval | null {
  if (productId === PRODUCT_IDS.apple.monthly || productId === PRODUCT_IDS.google.monthly) {
    return 'monthly';
  }
  if (productId === PRODUCT_IDS.apple.yearly || productId === PRODUCT_IDS.google.yearly) {
    return 'yearly';
  }
  return null;
}
