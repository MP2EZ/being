/**
 * Store-backed subscription fixtures (DEBUG-709).
 *
 * The local trial path is gone: a trial now exists only because the App Store or
 * Google Play granted an introductory offer, and DEBUG-708 persists only server-verified
 * facts. Tests that minted a local trial to reach the 'trial' state seed this fixture instead,
 * shaped like that verified record — no trialStartDate (the store does not report one to us),
 * a future trialEndDate, a real platform and a non-empty platformSubscriptionId.
 *
 * Seeding sets `featureAccess` with the record, as the store's own writers do: a test that
 * sets only `subscription` leaves `featureAccess` null, and checkFeatureAccess then answers
 * from its no-subscription fallback rather than from the status under test.
 */

import { useSubscriptionStore } from '@/core/stores/subscriptionStore';
import {
  calculateFeatureAccess,
  type SubscriptionMetadata,
  type SubscriptionStatus,
} from '@/core/types/subscription';

const DAY_MS = 24 * 60 * 60 * 1000;

export function makeStoreBackedSubscription(
  status: SubscriptionStatus,
  overrides: Partial<SubscriptionMetadata> = {},
): SubscriptionMetadata {
  const now = Date.now();
  const isTrial = status === 'trial';
  return {
    id: 'sub-fixture-0001',
    userId: 'user-fixture-0001',
    platform: 'apple',
    platformSubscriptionId: '2000000000000001',
    status,
    tier: 'standard',
    interval: 'monthly',
    priceUsd: isTrial ? 0 : 9.99,
    currency: 'USD',
    trialStartDate: null,
    trialEndDate: isTrial ? now + 30 * DAY_MS : null,
    subscriptionStartDate: isTrial ? null : now - DAY_MS,
    subscriptionEndDate: isTrial ? null : now + 29 * DAY_MS,
    gracePeriodEnd: status === 'grace' ? now + 7 * DAY_MS : null,
    lastReceiptVerified: now,
    receiptData: null,
    lastPaymentDate: null,
    paymentFailureCount: 0,
    crisisAccessEnabled: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/** A store-backed trial, the shape a verified intro-offer purchase produces. */
export function makeStoreBackedTrial(overrides: Partial<SubscriptionMetadata> = {}): SubscriptionMetadata {
  return makeStoreBackedSubscription('trial', overrides);
}

/** Put a record into the store with the feature access its status implies. */
export function seedSubscription(subscription: SubscriptionMetadata | null): void {
  useSubscriptionStore.setState({
    subscription,
    featureAccess: subscription ? calculateFeatureAccess(subscription.status) : null,
  });
}

export function seedStoreBackedTrial(overrides: Partial<SubscriptionMetadata> = {}): SubscriptionMetadata {
  const trial = makeStoreBackedTrial(overrides);
  seedSubscription(trial);
  return trial;
}
