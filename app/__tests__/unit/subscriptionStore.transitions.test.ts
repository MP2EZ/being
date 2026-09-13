/**
 * SUBSCRIPTION STORE — TRANSITIONS & FEATURE-ACCESS UNIT TESTS (MAINT-242)
 *
 * Correctness-asserting tests for the subscription Zustand store's real
 * persistence/transition actions, asserting that each status transition
 * wires through calculateFeatureAccess into store.featureAccess.
 *
 * Mocks: expo-secure-store (persistence), the dynamically-imported
 * IAPService (purchase/verify/finish), and AuthenticationService
 * (getCurrentUser).
 *
 * NOT-YET-IMPLEMENTED STUBS: restorePurchases / cancelSubscription /
 * verifyReceipt are asserted at their CURRENT contract. restorePurchases
 * and cancelSubscription throw 'not yet implemented' INTERNALLY but the
 * store catches and routes to state.error; verifyReceipt is currently a
 * mock that returns true. These are pinned explicitly below with TODO
 * follow-up notes — NOT pretended to work.
 *
 * PLACEMENT: under __tests__/unit/ so it is gated by `npm run test:unit`.
 * INFRA-180 discipline: literal strings asserted; no duplicated timeout flag.
 */

import { useSubscriptionStore } from '@/core/stores/subscriptionStore';
import * as SecureStore from 'expo-secure-store';
import {
  calculateFeatureAccess,
  type SubscriptionMetadata,
} from '@/core/types/subscription';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// AuthenticationService default export is a singleton instance.
jest.mock('@/core/services/security/AuthenticationService', () => ({
  __esModule: true,
  default: {
    getCurrentUser: jest.fn(() => ({ userId: 'test-user-123' })),
  },
}));

// IAPService is dynamically imported by the store; mock the module.
const mockIAP = {
  getPlatform: jest.fn(() => 'apple' as 'apple' | 'google' | 'none'),
  purchaseSubscription: jest.fn(),
  verifyReceipt: jest.fn(),
  finishTransaction: jest.fn(() => Promise.resolve()),
};
jest.mock('@/core/services/subscription/IAPService', () => ({
  __esModule: true,
  IAPService: mockIAP,
}));

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

const resetStore = () =>
  useSubscriptionStore.setState({
    subscription: null,
    featureAccess: null,
    isLoading: false,
    isVerifyingReceipt: false,
    error: null,
  });

/** Minimal valid metadata for seeding the store. */
const seedSubscription = (overrides: Partial<SubscriptionMetadata> = {}): SubscriptionMetadata => {
  const now = Date.now();
  const sub: SubscriptionMetadata = {
    id: 'sub-1',
    userId: 'test-user-123',
    platform: 'apple',
    platformSubscriptionId: 'plat-1',
    status: 'active',
    tier: 'standard',
    interval: 'monthly',
    priceUsd: 7.99,
    currency: 'USD',
    trialStartDate: null,
    trialEndDate: null,
    subscriptionStartDate: now,
    subscriptionEndDate: null,
    gracePeriodEnd: null,
    lastReceiptVerified: now,
    receiptData: 'receipt-data',
    lastPaymentDate: now,
    paymentFailureCount: 0,
    crisisAccessEnabled: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  return sub;
};

describe('SubscriptionStore — transitions & feature access (MAINT-242)', () => {
  beforeEach(() => {
    resetStore();
    jest.clearAllMocks();
    (mockSecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    (mockSecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (mockSecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
    mockIAP.getPlatform.mockReturnValue('apple');
  });

  // ──────────────────────────────────────────────────────────────────
  // createTrial
  // ──────────────────────────────────────────────────────────────────
  describe('createTrial', () => {
    it('persists a trial subscription and wires trial feature access', async () => {
      await useSubscriptionStore.getState().createTrial();

      const state = useSubscriptionStore.getState();
      expect(state.subscription?.status).toBe('trial');
      expect(state.subscription?.userId).toBe('test-user-123');
      expect(state.subscription?.crisisAccessEnabled).toBe(true);
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledTimes(1);

      // featureAccess must equal calculateFeatureAccess('trial').
      expect(state.featureAccess).toEqual(calculateFeatureAccess('trial'));
      expect(state.featureAccess?.checkIns).toBe(true);
      expect(state.isLoading).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // loadSubscription
  // ──────────────────────────────────────────────────────────────────
  describe('loadSubscription', () => {
    it('loads persisted metadata and recomputes feature access from its status', async () => {
      const persisted = seedSubscription({ status: 'expired' });
      (mockSecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(persisted));

      await useSubscriptionStore.getState().loadSubscription();

      const state = useSubscriptionStore.getState();
      expect(state.subscription?.status).toBe('expired');
      expect(state.featureAccess).toEqual(calculateFeatureAccess('expired'));
      // Expired locks non-crisis features but keeps crisis features.
      expect(state.featureAccess?.checkIns).toBe(false);
      expect(state.featureAccess?.crisisButton).toBe(true);
    });

    it('leaves null subscription when nothing is persisted', async () => {
      (mockSecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      await useSubscriptionStore.getState().loadSubscription();
      const state = useSubscriptionStore.getState();
      expect(state.subscription).toBeNull();
      expect(state.featureAccess).toBeNull();
    });

    it('sets a sanitized error string when secure storage throws', async () => {
      (mockSecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('boom'));
      await useSubscriptionStore.getState().loadSubscription();
      expect(useSubscriptionStore.getState().error).toBe('Failed to load subscription');
      expect(useSubscriptionStore.getState().isLoading).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // updateSubscriptionStatus — the core transition action
  // ──────────────────────────────────────────────────────────────────
  describe('updateSubscriptionStatus', () => {
    it.each(['trial', 'active', 'grace', 'expired', 'crisis_only'] as const)(
      'transition to %s persists and wires featureAccess = calculateFeatureAccess(status)',
      async (status) => {
        useSubscriptionStore.setState({ subscription: seedSubscription({ status: 'active' }) });

        await useSubscriptionStore.getState().updateSubscriptionStatus(status);

        const state = useSubscriptionStore.getState();
        expect(state.subscription?.status).toBe(status);
        expect(state.featureAccess).toEqual(calculateFeatureAccess(status));
        expect(mockSecureStore.setItemAsync).toHaveBeenCalledTimes(1);
      }
    );

    it('errors (without persisting) when there is no subscription to update', async () => {
      resetStore();
      await useSubscriptionStore.getState().updateSubscriptionStatus('active');
      expect(useSubscriptionStore.getState().error).toBe('No subscription to update');
      expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // grace period transitions
  // ──────────────────────────────────────────────────────────────────
  describe('grace period', () => {
    it('enterGracePeriod moves to grace, increments failure count, wires grace access', async () => {
      useSubscriptionStore.setState({
        subscription: seedSubscription({ status: 'active', paymentFailureCount: 0 }),
      });

      await useSubscriptionStore.getState().enterGracePeriod();

      const state = useSubscriptionStore.getState();
      expect(state.subscription?.status).toBe('grace');
      expect(state.subscription?.paymentFailureCount).toBe(1);
      expect(state.subscription?.gracePeriodEnd).toBeGreaterThan(Date.now());
      expect(state.featureAccess).toEqual(calculateFeatureAccess('grace'));
      // Grace still grants non-crisis access.
      expect(state.featureAccess?.checkIns).toBe(true);
    });

    it('exitGracePeriod restores active, clears grace end + failure count', async () => {
      useSubscriptionStore.setState({
        subscription: seedSubscription({
          status: 'grace',
          paymentFailureCount: 2,
          gracePeriodEnd: Date.now() + 1000,
        }),
      });

      await useSubscriptionStore.getState().exitGracePeriod();

      const state = useSubscriptionStore.getState();
      expect(state.subscription?.status).toBe('active');
      expect(state.subscription?.gracePeriodEnd).toBeNull();
      expect(state.subscription?.paymentFailureCount).toBe(0);
      expect(state.featureAccess).toEqual(calculateFeatureAccess('active'));
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // purchase flow (mock-mode synchronous path)
  // ──────────────────────────────────────────────────────────────────
  describe('purchaseSubscription / processVerifiedPurchase', () => {
    it('processes a synchronous mock purchase into an active subscription', async () => {
      mockIAP.purchaseSubscription.mockResolvedValue({
        transactionReceipt: 'receipt-xyz',
        orderId: 'order-1',
        // INFRA-467: the store forwards Apple transaction identity as a 4th argument.
        // Present on the fixture so this asserts the value is threaded through, rather
        // than only that an extra `undefined` appeared in the call.
        transactionId: '2000000847061713',
        environmentIOS: 'Sandbox',
      });
      mockIAP.verifyReceipt.mockResolvedValue({
        valid: true,
        subscriptionId: 'verified-sub-1',
        expiresDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });

      await useSubscriptionStore.getState().purchaseSubscription('yearly');

      const state = useSubscriptionStore.getState();
      expect(mockIAP.verifyReceipt).toHaveBeenCalledWith('receipt-xyz', 'apple', undefined, {
        transactionId: '2000000847061713',
        environment: 'Sandbox',
      });
      expect(mockIAP.finishTransaction).toHaveBeenCalledTimes(1);
      expect(state.subscription?.status).toBe('active');
      expect(state.subscription?.interval).toBe('yearly');
      expect(state.subscription?.priceUsd).toBe(79.99);
      expect(state.featureAccess).toEqual(calculateFeatureAccess('active'));
      expect(state.isLoading).toBe(false);
      expect(state.isVerifyingReceipt).toBe(false);
    });

    it('clears loading without transition when the platform defers (purchase is null)', async () => {
      mockIAP.purchaseSubscription.mockResolvedValue(null);

      await useSubscriptionStore.getState().purchaseSubscription('monthly');

      const state = useSubscriptionStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.subscription).toBeNull();
      expect(mockIAP.verifyReceipt).not.toHaveBeenCalled();
    });

    it('processVerifiedPurchase throws the literal verification error when receipt is invalid', async () => {
      mockIAP.verifyReceipt.mockResolvedValue({ valid: false, error: 'bad receipt' });

      await expect(
        useSubscriptionStore.getState().processVerifiedPurchase(
          { transactionReceipt: 'r', orderId: 'o' },
          'monthly'
        )
      ).rejects.toThrow('bad receipt');
      // The finally block must clear the verifying flag.
      expect(useSubscriptionStore.getState().isVerifyingReceipt).toBe(false);
    });

    it('processVerifiedPurchase throws the literal platform error when IAP is unavailable', async () => {
      mockIAP.getPlatform.mockReturnValue('none');

      await expect(
        useSubscriptionStore.getState().processVerifiedPurchase(
          { transactionReceipt: 'r', orderId: 'o' },
          'monthly'
        )
      ).rejects.toThrow('IAP not available on this platform');
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // crisis-access guarantee + feature checks
  // ──────────────────────────────────────────────────────────────────
  describe('checkFeatureAccess', () => {
    it('crisis features ALWAYS return true regardless of (or absent) subscription', () => {
      resetStore();
      const store = useSubscriptionStore.getState();
      expect(store.checkFeatureAccess('crisisButton')).toBe(true);
      expect(store.checkFeatureAccess('nineEightEightAccess')).toBe(true);
      expect(store.getCrisisAccessStatus()).toBe(true);
    });

    it('gates non-crisis features when no subscription is loaded', () => {
      resetStore();
      expect(useSubscriptionStore.getState().checkFeatureAccess('checkIns')).toBe(false);
    });

    it('reflects loaded featureAccess for non-crisis features', async () => {
      useSubscriptionStore.setState({
        subscription: seedSubscription({ status: 'expired' }),
        featureAccess: calculateFeatureAccess('expired'),
      });
      const store = useSubscriptionStore.getState();
      expect(store.checkFeatureAccess('checkIns')).toBe(false);
      expect(store.checkFeatureAccess('crisisButton')).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // utility selectors
  // ──────────────────────────────────────────────────────────────────
  describe('utility selectors', () => {
    it('getTrialDaysRemaining returns ceil days only while in trial', () => {
      useSubscriptionStore.setState({
        subscription: seedSubscription({
          status: 'trial',
          trialEndDate: Date.now() + 5 * 24 * 60 * 60 * 1000 + 1000,
        }),
      });
      expect(useSubscriptionStore.getState().getTrialDaysRemaining()).toBe(6);

      useSubscriptionStore.setState({ subscription: seedSubscription({ status: 'active' }) });
      expect(useSubscriptionStore.getState().getTrialDaysRemaining()).toBeNull();
    });

    it('isSubscriptionActive is true for active and grace, false otherwise', () => {
      useSubscriptionStore.setState({ subscription: seedSubscription({ status: 'active' }) });
      expect(useSubscriptionStore.getState().isSubscriptionActive()).toBe(true);
      useSubscriptionStore.setState({ subscription: seedSubscription({ status: 'grace' }) });
      expect(useSubscriptionStore.getState().isSubscriptionActive()).toBe(true);
      useSubscriptionStore.setState({ subscription: seedSubscription({ status: 'expired' }) });
      expect(useSubscriptionStore.getState().isSubscriptionActive()).toBe(false);
    });

    it('isTrialActive reflects only the trial status', () => {
      useSubscriptionStore.setState({ subscription: seedSubscription({ status: 'trial' }) });
      expect(useSubscriptionStore.getState().isTrialActive()).toBe(true);
      useSubscriptionStore.setState({ subscription: seedSubscription({ status: 'active' }) });
      expect(useSubscriptionStore.getState().isTrialActive()).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // NOT-YET-IMPLEMENTED STUBS — pin the CURRENT contract explicitly.
  // ──────────────────────────────────────────────────────────────────
  describe('not-yet-implemented stubs (current contract)', () => {
    // TODO(MAINT-242 follow-up): implement restorePurchases. The action
    // currently throws 'Restore purchases not yet implemented' internally,
    // catches it, and routes to state.error. Pin that exact behavior.
    it('restorePurchases routes the not-implemented failure to state.error', async () => {
      await useSubscriptionStore.getState().restorePurchases();
      expect(useSubscriptionStore.getState().error).toBe('Failed to restore purchases');
    });

    // TODO(MAINT-242 follow-up): implement cancelSubscription. Currently
    // throws 'Cancellation not yet implemented' internally → state.error.
    it('cancelSubscription routes the not-implemented failure to state.error', async () => {
      useSubscriptionStore.setState({ subscription: seedSubscription() });
      await useSubscriptionStore.getState().cancelSubscription();
      expect(useSubscriptionStore.getState().error).toBe('Failed to cancel subscription');
    });

    // TODO(MAINT-242 follow-up): implement real server-side receipt
    // verification. verifyReceipt() is currently a mock that returns true
    // when a receipt exists, and false when no receipt/subscription is
    // present. Pin both current branches.
    it('verifyReceipt returns false when there is no receipt to verify', async () => {
      resetStore();
      await expect(useSubscriptionStore.getState().verifyReceipt()).resolves.toBe(false);
    });

    it('verifyReceipt currently returns true (mock) when a receipt exists', async () => {
      useSubscriptionStore.setState({ subscription: seedSubscription({ receiptData: 'r' }) });
      await expect(useSubscriptionStore.getState().verifyReceipt()).resolves.toBe(true);
      expect(useSubscriptionStore.getState().isVerifyingReceipt).toBe(false);
    });
  });
});
