/**
 * DEBUG-708 — the subscription record a verified purchase or restore writes.
 *
 * Record-contents principle: no field asserts a payment fact the server did not verify. The
 * verify edge functions return a subscription id, an expiry, a product and a trial flag, and
 * nothing about price, purchase date or payments, so those are null rather than invented.
 * `receiptData` is always null on both platforms (compliance R2): nothing has read it since
 * INFRA-467 slice 4, and persisting it put the iOS base64 receipt in every data export.
 *
 * Only `id`, `userId` and `createdAt` carry over from an existing record. The old spread
 * kept every field the rebuild did not name, so a post-erasure restore could only equal a
 * fresh-install restore by luck (compliance R1). Every key is set explicitly, never left
 * undefined, so the persisted JSON has one shape.
 *
 * Pure: the store passes the clock and the id generators.
 */

import type {
  SubscriptionInterval,
  SubscriptionMetadata,
} from '@/core/types/subscription';

export interface VerifiedSubscriptionInput {
  existing: Pick<SubscriptionMetadata, 'id' | 'userId' | 'createdAt'> | null;
  newId: () => string;
  newUserId: () => string;
  platform: 'apple' | 'google';
  platformSubscriptionId: string;
  /** From the VERIFIED productId, never the client's request. */
  interval: SubscriptionInterval;
  isTrialPeriod: boolean;
  expiresDate: number | undefined;
  now: number;
}

export function buildVerifiedSubscriptionRecord(input: VerifiedSubscriptionInput): SubscriptionMetadata {
  const { existing, now, isTrialPeriod } = input;
  const expiresDate = input.expiresDate ?? null;
  return {
    id: existing ? existing.id : input.newId(),
    userId: existing ? existing.userId : input.newUserId(),
    platform: input.platform,
    platformSubscriptionId: input.platformSubscriptionId,
    status: isTrialPeriod ? 'trial' : 'active',
    tier: 'standard',
    interval: input.interval,
    priceUsd: null,
    currency: null,
    trialStartDate: null,
    trialEndDate: isTrialPeriod ? expiresDate : null,
    subscriptionStartDate: null,
    subscriptionEndDate: expiresDate,
    gracePeriodEnd: null,
    lastReceiptVerified: now,
    receiptData: null,
    lastPaymentDate: null,
    paymentFailureCount: 0,
    crisisAccessEnabled: true,
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
  };
}
