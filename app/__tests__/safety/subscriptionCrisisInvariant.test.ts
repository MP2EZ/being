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
  DEFAULT_SUBSCRIPTION_CONFIG,
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
      productId: DEFAULT_SUBSCRIPTION_CONFIG.products.apple.monthly,
      isTrialPeriod: false,
    });
    await useSubscriptionStore.getState().processVerifiedPurchase(
      { transactionReceipt: 'receipt', orderId: 'order-1' },
      'monthly',
    );
    const minted = useSubscriptionStore.getState().subscription;
    expect(minted).not.toBeNull();
    expect(minted?.crisisAccessEnabled).toBe(true);
  });

  // DEBUG-708: every verifyReceipt outcome, from no record and from an existing one. A
  // purchase that applies (trial or paid) or fails at any stage must leave every crisis
  // feature reachable. Where featureAccess is null only checkFeatureAccess is asserted.
  const { apple } = DEFAULT_SUBSCRIPTION_CONFIG.products;
  const OUTCOMES: Array<[string, Record<string, unknown>]> = [
    ['200 valid', { valid: true, subscriptionId: 's', expiresDate: Date.now() + 86_400_000, productId: apple.monthly, isTrialPeriod: false, httpStatus: 200 }],
    ['200 trial', { valid: true, subscriptionId: 's', expiresDate: Date.now() + 86_400_000, productId: apple.monthly, isTrialPeriod: true, httpStatus: 200 }],
    ['200 unknown product', { valid: true, subscriptionId: 's', productId: 'com.example.not-ours', isTrialPeriod: false, httpStatus: 200 }],
    ['400', { valid: false, failure: 'http', httpStatus: 400, error: 'Subscription is expired or revoked' }],
    ['409', { valid: false, failure: 'http', httpStatus: 409, error: 'Receipt already bound to another account' }],
    ['401', { valid: false, failure: 'http', httpStatus: 401, error: 'Unauthorized' }],
    ['503', { valid: false, failure: 'http', httpStatus: 503, error: 'Unavailable' }],
    ['500', { valid: false, failure: 'http', httpStatus: 500, error: 'Failed to verify transaction with Apple' }],
    ['network', { valid: false, failure: 'network', error: 'Failed to send a request to the Edge Function' }],
    ['client', { valid: false, failure: 'client', error: 'Purchase token required for Google verification' }],
    ['no session', { valid: false, failure: 'unavailable', reason: 'no_session', error: 'Purchase not verified yet (no_session)' }],
  ];
  const STARTS: Array<[string, SubscriptionStatus | null]> = [['no record', null], ['existing expired record', 'expired']];

  it.each(OUTCOMES.flatMap(([label, verification]) => STARTS.map(([start, status]) => [label, start, verification, status] as const)))(
    'DEBUG-708 verify %s from %s: every crisis feature stays reachable',
    async (_label, _start, verification, status) => {
      useSubscriptionStore.setState({
        subscription: status === null ? null : makeStoreBackedSubscription(status),
        featureAccess: status === null ? null : calculateFeatureAccess(status),
      });
      mockIAP.verifyReceipt.mockResolvedValueOnce(verification);
      await useSubscriptionStore
        .getState()
        .processVerifiedPurchase({ transactionReceipt: 'receipt', orderId: 'order-1', productId: apple.monthly }, 'monthly')
        .catch(() => undefined);

      const store = useSubscriptionStore.getState();
      for (const feature of CRISIS_FEATURES) {
        expect([feature, store.checkFeatureAccess(feature)]).toEqual([feature, true]);
        if (store.featureAccess !== null) {
          expect([feature, store.featureAccess[feature]]).toEqual([feature, true]);
        }
      }
      expect(store.getCrisisAccessStatus()).toBe(true);
    },
  );

  it('DEBUG-708 control: a verified trial reaches the write, so the trial rows are not vacuous', async () => {
    mockIAP.verifyReceipt.mockResolvedValueOnce(OUTCOMES[1]![1]);
    await useSubscriptionStore.getState().processVerifiedPurchase({ transactionReceipt: 'r', orderId: 'o', productId: apple.monthly }, 'monthly');
    expect(useSubscriptionStore.getState().subscription?.status).toBe('trial');
    expect(useSubscriptionStore.getState().featureAccess).toEqual(calculateFeatureAccess('trial'));
  });
});
