/**
 * DEBUG-708 — the record a verified purchase or restore writes holds only what the server
 * verified, plus the record's own identity.
 */
import { buildVerifiedSubscriptionRecord } from '../verifiedSubscriptionRecord';

const NOW = 1_790_000_000_000;
const EXPIRES = NOW + 30 * 24 * 60 * 60 * 1000;

const base = {
  existing: null,
  newId: () => 'fresh-id',
  newUserId: () => 'anonymous_fresh',
  platform: 'apple' as const,
  platformSubscriptionId: 'sub-1',
  interval: 'yearly' as const,
  isTrialPeriod: false,
  expiresDate: EXPIRES as number | undefined,
  now: NOW,
};

const KEYS = [
  'createdAt', 'crisisAccessEnabled', 'currency', 'gracePeriodEnd', 'id', 'interval',
  'lastPaymentDate', 'lastReceiptVerified', 'paymentFailureCount', 'platform',
  'platformSubscriptionId', 'priceUsd', 'receiptData', 'status', 'subscriptionEndDate',
  'subscriptionStartDate', 'tier', 'trialEndDate', 'trialStartDate', 'updatedAt',
];

describe('buildVerifiedSubscriptionRecord', () => {
  it('a paid purchase: exactly the verified facts, every unverified payment fact null', () => {
    expect(buildVerifiedSubscriptionRecord(base)).toStrictEqual({
      id: 'fresh-id',
      userId: 'anonymous_fresh',
      platform: 'apple',
      platformSubscriptionId: 'sub-1',
      status: 'active',
      tier: 'standard',
      interval: 'yearly',
      priceUsd: null,
      currency: null,
      trialStartDate: null,
      trialEndDate: null,
      subscriptionStartDate: null,
      subscriptionEndDate: EXPIRES,
      gracePeriodEnd: null,
      lastReceiptVerified: NOW,
      receiptData: null,
      lastPaymentDate: null,
      paymentFailureCount: 0,
      crisisAccessEnabled: true,
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  it('a verified trial: status trial, trial ends at the verified expiry, start unknown', () => {
    const r = buildVerifiedSubscriptionRecord({ ...base, isTrialPeriod: true });
    expect(r.status).toBe('trial');
    expect(r.trialEndDate).toBe(EXPIRES);
    expect(r.trialStartDate).toBeNull();
    expect(r.subscriptionEndDate).toBe(EXPIRES);
  });

  it('no verified expiry is null, never undefined', () => {
    const r = buildVerifiedSubscriptionRecord({ ...base, isTrialPeriod: true, expiresDate: undefined });
    expect(r.subscriptionEndDate).toBeNull();
    expect(r.trialEndDate).toBeNull();
  });

  it.each(['apple', 'google'] as const)('the key set is fixed and every value is defined (%s)', (platform) => {
    const r = buildVerifiedSubscriptionRecord({ ...base, platform });
    expect(Object.keys(r).sort()).toEqual([...KEYS, 'userId'].sort());
    for (const [key, value] of Object.entries(r)) expect([key, value]).not.toEqual([key, undefined]);
  });

  it('only id, userId and createdAt carry over from an existing record', () => {
    const existing = {
      id: 'old-id', userId: 'anonymous_old', createdAt: NOW - 1000,
      // Fields a spread used to leak into the new record:
      priceUsd: 79.99, currency: 'USD', receiptData: 'base64-old-receipt', lastPaymentDate: NOW - 500,
      subscriptionStartDate: NOW - 900, gracePeriodEnd: NOW + 5, paymentFailureCount: 3,
      platformCustomerId: 'cust-old', status: 'grace', trialStartDate: NOW - 800, legacyField: 'x',
    };
    const r = buildVerifiedSubscriptionRecord({ ...base, existing: existing as never });
    expect(r).toStrictEqual({
      ...buildVerifiedSubscriptionRecord(base),
      id: 'old-id',
      userId: 'anonymous_old',
      createdAt: NOW - 1000,
    });
  });
});
