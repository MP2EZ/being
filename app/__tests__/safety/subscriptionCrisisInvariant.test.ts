/**
 * The canonical crisis-access invariant across every subscription state (DEBUG-709).
 *
 * Crisis features are never gated by a subscription. This file is the one table that pins
 * it, over all five statuses and the no-subscription state. DEBUG-708 and FEAT-823 add rows
 * here rather than building their own tables.
 *
 * Built to the crisis ruling (2026-10-22), because checkFeatureAccess returns early for a
 * crisis feature before it reads any state (subscriptionStore CRISIS_FEATURE_SET), so a row
 * that only called it would pass whatever status was seeded. Each row therefore also:
 *   - asserts calculateFeatureAccess(status) itself grants every crisis feature;
 *   - seeds the store with that record AND its featureAccess, the way the store's writers do;
 *   - asserts getCrisisAccessStatus().
 * The no-subscription row seeds null/null, exercising checkFeatureAccess's fallback.
 */

import { useSubscriptionStore } from '@/core/stores/subscriptionStore';
import {
  calculateFeatureAccess,
  CRISIS_FEATURES,
  type FeatureAccess,
  type SubscriptionStatus,
} from '@/core/types/subscription';
import { makeStoreBackedSubscription } from '@tests/helpers/subscriptionFixtures';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const mockIAP = {
  getPlatform: jest.fn(() => 'apple' as const),
  verifyReceipt: jest.fn(),
  finishTransaction: jest.fn(() => Promise.resolve()),
};
jest.mock('@/core/services/subscription/IAPService', () => ({ __esModule: true, IAPService: mockIAP }));

const STATUSES: Array<SubscriptionStatus | null> = ['trial', 'active', 'grace', 'expired', 'crisis_only', null];

describe('DEBUG-709: crisis access holds for every subscription state', () => {
  beforeEach(() => {
    useSubscriptionStore.setState({ subscription: null, featureAccess: null, isLoading: false, error: null });
  });

  it('the crisis feature list still names both crisis features (an empty list would make every row vacuous)', () => {
    expect(CRISIS_FEATURES).toEqual(expect.arrayContaining(['crisisButton', 'nineEightEightAccess']));
  });

  it.each(STATUSES.flatMap((status) => CRISIS_FEATURES.map((feature) => [String(status), status, feature] as const)))(
    '%s: %s',
    (_label, status, feature) => {
      if (status !== null) {
        expect(calculateFeatureAccess(status)[feature]).toBe(true);
      }
      useSubscriptionStore.setState({
        subscription: status === null ? null : makeStoreBackedSubscription(status),
        featureAccess: status === null ? null : calculateFeatureAccess(status),
      });
      const store = useSubscriptionStore.getState();
      expect(store.checkFeatureAccess(feature)).toBe(true);
      expect(store.getCrisisAccessStatus()).toBe(true);
    },
  );

  it('control: the table discriminates — a non-crisis feature IS gated for expired and no subscription', () => {
    for (const status of ['expired', null] as const) {
      useSubscriptionStore.setState({
        subscription: status === null ? null : makeStoreBackedSubscription(status),
        featureAccess: status === null ? null : calculateFeatureAccess(status),
      });
      expect(useSubscriptionStore.getState().checkFeatureAccess('assessments')).toBe(false);
    }
  });

  it('a crisis feature stays reachable even if featureAccess were ever written false for it', () => {
    const broken = { ...calculateFeatureAccess('expired'), crisisButton: false } as unknown as FeatureAccess;
    useSubscriptionStore.setState({ subscription: makeStoreBackedSubscription('expired'), featureAccess: broken });
    expect(useSubscriptionStore.getState().checkFeatureAccess('crisisButton')).toBe(true);
  });

  it('a record the store mints from a verified purchase carries crisisAccessEnabled === true', async () => {
    mockIAP.verifyReceipt.mockResolvedValue({
      valid: true,
      subscriptionId: 'verified-sub-1',
      expiresDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });
    await useSubscriptionStore.getState().processVerifiedPurchase(
      { transactionReceipt: 'receipt', orderId: 'order-1' },
      'monthly',
    );
    const minted = useSubscriptionStore.getState().subscription;
    expect(minted).not.toBeNull();
    expect(minted?.crisisAccessEnabled).toBe(true);
  });
});
