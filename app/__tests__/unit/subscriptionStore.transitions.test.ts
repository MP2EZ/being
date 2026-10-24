/**
 * SUBSCRIPTION STORE — TRANSITIONS & FEATURE-ACCESS UNIT TESTS (MAINT-242)
 *
 * Correctness-asserting tests for the subscription Zustand store's real
 * persistence/transition actions, asserting that each status transition
 * wires through calculateFeatureAccess into store.featureAccess.
 *
 * Mocks: expo-secure-store (persistence) and the dynamically-imported
 * IAPService (purchase/verify/finish). MAINT-635 removed the
 * AuthenticationService mock along with the service itself.
 *
 * NOT-YET-IMPLEMENTED STUB: cancelSubscription is asserted at its CURRENT
 * contract — it throws 'not yet implemented' INTERNALLY but the store catches
 * and routes to state.error. Pinned explicitly below with a TODO follow-up
 * note — NOT pretended to work. restorePurchases was implemented under
 * DEBUG-720 and is pinned in its own block.
 * verifyReceipt was removed outright under INFRA-84; its absence is pinned.
 *
 * PLACEMENT: under __tests__/unit/ so it is gated by `npm run test:unit`.
 * INFRA-180 discipline: literal strings asserted; no duplicated timeout flag.
 */

import { useSubscriptionStore } from '@/core/stores/subscriptionStore';
import { ReceiptVerificationUnavailableError } from '@/core/services/subscription/receiptVerificationUnavailable';
import * as SecureStore from 'expo-secure-store';
import {
  calculateFeatureAccess,
  DEFAULT_SUBSCRIPTION_CONFIG,
  type SubscriptionMetadata,
} from '@/core/types/subscription';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// IAPService is dynamically imported by the store; mock the module.
const mockIAP = {
  getPlatform: jest.fn(() => 'apple' as 'apple' | 'google' | 'none'),
  purchaseSubscription: jest.fn(),
  verifyReceipt: jest.fn(),
  finishTransaction: jest.fn(() => Promise.resolve()),
  restorePurchases: jest.fn(),
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
      // DEBUG-708: no verified payment, so no payment date is invented.
      expect(state.subscription?.lastPaymentDate).toBeNull();
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
        // DEBUG-708: the plan comes from the verified product.
        productId: DEFAULT_SUBSCRIPTION_CONFIG.products.apple.yearly,
        isTrialPeriod: false,
      });

      await useSubscriptionStore.getState().purchaseSubscription('yearly');

      const state = useSubscriptionStore.getState();
      // 5th argument is the product id (DEBUG-713); this mock purchase carries none.
      expect(mockIAP.verifyReceipt).toHaveBeenCalledWith(
        'receipt-xyz',
        'apple',
        undefined,
        { transactionId: '2000000847061713', environment: 'Sandbox' },
        undefined
      );
      expect(mockIAP.finishTransaction).toHaveBeenCalledTimes(1);
      expect(state.subscription?.status).toBe('active');
      expect(state.subscription?.interval).toBe('yearly');
      // DEBUG-708: the server verifies no price, so none is recorded.
      expect(state.subscription?.priceUsd).toBeNull();
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

    // DEBUG-715: "could not verify yet" must stay distinguishable from "receipt invalid" in
    // the logs, must leave the transaction unfinished so the platform re-emits it, and its
    // message must never claim the payment failed — the payment did not fail.
    it.each(['no_session', 'client_unavailable'] as const)(
      'processVerifiedPurchase throws ReceiptVerificationUnavailableError for %s and leaves the transaction unfinished',
      async (reason) => {
        mockIAP.verifyReceipt.mockResolvedValue({ valid: false, reason, error: `could not verify: ${reason}` });

        const thrown = await useSubscriptionStore
          .getState()
          .processVerifiedPurchase({ transactionReceipt: 'r', orderId: 'o' }, 'monthly')
          .then(() => null, (e: unknown) => e);

        expect(thrown).toBeInstanceOf(ReceiptVerificationUnavailableError);
        expect((thrown as ReceiptVerificationUnavailableError).reason).toBe(reason);
        expect((thrown as Error).message).not.toMatch(/payment/i);
        expect(mockIAP.finishTransaction).not.toHaveBeenCalled();
        expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
        expect(useSubscriptionStore.getState().subscription).toBeNull();
        expect(useSubscriptionStore.getState().isVerifyingReceipt).toBe(false);
      }
    );

    it('an invalid receipt is NOT the unavailable error', async () => {
      mockIAP.verifyReceipt.mockResolvedValue({ valid: false, error: 'bad receipt' });

      const attempt = useSubscriptionStore
        .getState()
        .processVerifiedPurchase({ transactionReceipt: 'r', orderId: 'o' }, 'monthly');

      await expect(attempt).rejects.toThrow('bad receipt');
      await expect(attempt).rejects.not.toBeInstanceOf(ReceiptVerificationUnavailableError);
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
      expect(store.checkFeatureAccess('nineEightEightAccess')).toBe(true);
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
      // DEBUG-709: a trial is not an active subscription — trial-inclusive checks use
      // isTrialActive() || isSubscriptionActive().
      expect(useSubscriptionStore.getState().isSubscriptionActive()).toBe(false);
      useSubscriptionStore.setState({ subscription: seedSubscription({ status: 'active' }) });
      expect(useSubscriptionStore.getState().isTrialActive()).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // restorePurchases (DEBUG-720)
  //
  // The screen used to call updateSubscriptionStatus('active'), which no-ops
  // on a null subscription, then acknowledged the purchase and showed success
  // anyway. A restore now goes through processVerifiedPurchase, so the record
  // is built from the verification and acknowledged only after it persists.
  // ──────────────────────────────────────────────────────────────────
  describe('restorePurchases (DEBUG-720)', () => {
    const { apple } = DEFAULT_SUBSCRIPTION_CONFIG.products;
    const restored = (productId: string, n = 1) => ({
      productId,
      transactionReceipt: `receipt-restore-${n}`,
      orderId: `order-restore-${n}`,
    });
    // DEBUG-708: a valid verification carries the verified product; the plan comes from it.
    const validVerification = (productId: string = apple.yearly) => ({
      valid: true,
      subscriptionId: 'verified-restore-1',
      expiresDate: Date.now() + 365 * 24 * 60 * 60 * 1000,
      productId,
      isTrialPeriod: false,
    });

    it('from subscription: null, a valid restore persists and holds an active subscription', async () => {
      mockIAP.restorePurchases.mockResolvedValue([restored(apple.yearly)]);
      mockIAP.verifyReceipt.mockResolvedValue(validVerification());

      const result = await useSubscriptionStore.getState().restorePurchases();

      expect(result).toEqual({ found: 1, restored: 1 });
      const state = useSubscriptionStore.getState();
      expect(state.subscription?.status).toBe('active');
      expect(state.subscription?.interval).toBe('yearly');
      expect(state.featureAccess).toEqual(calculateFeatureAccess('active'));
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledTimes(1);
      const [key, json] = (mockSecureStore.setItemAsync as jest.Mock).mock.calls[0];
      expect(key).toBe('subscription_secure_v1');
      expect(JSON.parse(json)).toMatchObject({ status: 'active', interval: 'yearly' });
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('acknowledges the purchase only after the record is persisted', async () => {
      mockIAP.restorePurchases.mockResolvedValue([restored(apple.monthly)]);
      mockIAP.verifyReceipt.mockResolvedValue(validVerification(apple.monthly));

      await useSubscriptionStore.getState().restorePurchases();

      expect(mockIAP.finishTransaction).toHaveBeenCalledTimes(1);
      const persistedAt = (mockSecureStore.setItemAsync as jest.Mock).mock.invocationCallOrder[0];
      const acknowledgedAt = mockIAP.finishTransaction.mock.invocationCallOrder[0];
      expect(persistedAt).toBeLessThan(acknowledgedAt);
    });

    it('passes the purchase token through, so the Google path can verify at all', async () => {
      mockIAP.getPlatform.mockReturnValue('google');
      mockIAP.restorePurchases.mockResolvedValue([
        { ...restored(DEFAULT_SUBSCRIPTION_CONFIG.products.google.yearly), purchaseToken: 'token-1' },
      ]);
      mockIAP.verifyReceipt.mockResolvedValue(validVerification(DEFAULT_SUBSCRIPTION_CONFIG.products.google.yearly));

      await useSubscriptionStore.getState().restorePurchases();

      // DEBUG-713: the Play product id is forwarded too — the server cannot look the
      // purchase up without it, and receiptData is '' on a real Android purchase.
      expect(mockIAP.verifyReceipt).toHaveBeenCalledWith(
        'receipt-restore-1',
        'google',
        'token-1',
        undefined,
        DEFAULT_SUBSCRIPTION_CONFIG.products.google.yearly
      );
    });

    it('an invalid verification restores nothing and acknowledges nothing', async () => {
      mockIAP.restorePurchases.mockResolvedValue([restored(apple.yearly)]);
      mockIAP.verifyReceipt.mockResolvedValue({ valid: false, error: 'Receipt verification failed' });

      const result = await useSubscriptionStore.getState().restorePurchases();

      expect(result).toEqual({ found: 1, restored: 0 });
      expect(useSubscriptionStore.getState().subscription).toBeNull();
      expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
      expect(mockIAP.finishTransaction).not.toHaveBeenCalled();
    });

    it('a write that fails is not counted and not acknowledged', async () => {
      mockIAP.restorePurchases.mockResolvedValue([restored(apple.yearly)]);
      mockIAP.verifyReceipt.mockResolvedValue(validVerification());
      (mockSecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(new Error('keychain locked'));

      const result = await useSubscriptionStore.getState().restorePurchases();

      expect(result).toEqual({ found: 1, restored: 0 });
      expect(useSubscriptionStore.getState().subscription).toBeNull();
      expect(mockIAP.finishTransaction).not.toHaveBeenCalled();
    });

    it('skips an unknown product without verifying or acknowledging it', async () => {
      mockIAP.restorePurchases.mockResolvedValue([restored('com.example.unknown')]);

      const result = await useSubscriptionStore.getState().restorePurchases();

      expect(result).toEqual({ found: 1, restored: 0 });
      expect(mockIAP.verifyReceipt).not.toHaveBeenCalled();
      expect(mockIAP.finishTransaction).not.toHaveBeenCalled();
    });

    it('one bad entitlement does not stop the rest from restoring', async () => {
      mockIAP.restorePurchases.mockResolvedValue([restored(apple.monthly, 1), restored(apple.yearly, 2)]);
      mockIAP.verifyReceipt
        .mockResolvedValueOnce({ valid: false, error: 'expired' })
        .mockResolvedValueOnce(validVerification());

      const result = await useSubscriptionStore.getState().restorePurchases();

      expect(result).toEqual({ found: 2, restored: 1 });
      expect(useSubscriptionStore.getState().subscription?.interval).toBe('yearly');
      expect(mockIAP.finishTransaction).toHaveBeenCalledTimes(1);
    });

    it('returns found: 0 when there is nothing to restore', async () => {
      mockIAP.restorePurchases.mockResolvedValue([]);

      await expect(useSubscriptionStore.getState().restorePurchases()).resolves.toEqual({
        found: 0,
        restored: 0,
      });
      expect(mockIAP.verifyReceipt).not.toHaveBeenCalled();
    });

    it('routes a failed lookup to state.error and rethrows', async () => {
      mockIAP.restorePurchases.mockRejectedValue(new Error('store unavailable'));

      await expect(useSubscriptionStore.getState().restorePurchases()).rejects.toThrow('store unavailable');
      expect(useSubscriptionStore.getState().error).toBe('Failed to restore purchases');
      expect(useSubscriptionStore.getState().isLoading).toBe(false);
    });

    it('throws the literal platform error when IAP is unavailable', async () => {
      mockIAP.getPlatform.mockReturnValue('none');

      await expect(useSubscriptionStore.getState().restorePurchases()).rejects.toThrow(
        'IAP not available on this platform'
      );
      expect(mockIAP.restorePurchases).not.toHaveBeenCalled();
    });

    it('processVerifiedPurchase reports true once the purchase is applied', async () => {
      mockIAP.verifyReceipt.mockResolvedValue(validVerification());

      await expect(
        useSubscriptionStore.getState().processVerifiedPurchase(restored(apple.yearly), 'yearly')
      ).resolves.toBe(true);
    });
  });


  // ──────────────────────────────────────────────────────────────────
  // DEBUG-708 — purchase and restore persist only server-verified facts.
  // ──────────────────────────────────────────────────────────────────
  describe('verified facts only (DEBUG-708)', () => {
    const { apple, google } = DEFAULT_SUBSCRIPTION_CONFIG.products;
    const EXPIRES = Date.now() + 14 * 24 * 60 * 60 * 1000;
    const purchase = (productId: string = apple.yearly) => ({
      productId,
      transactionReceipt: 'receipt-708',
      orderId: 'order-708',
      transactionId: '2000000708000001',
    });
    const verified = (overrides: Record<string, unknown> = {}) => ({
      valid: true,
      subscriptionId: 'verified-708',
      expiresDate: EXPIRES,
      productId: apple.yearly,
      isTrialPeriod: false,
      httpStatus: 200,
      ...overrides,
    });
    const persisted = () => {
      const calls = (mockSecureStore.setItemAsync as jest.Mock).mock.calls;
      return JSON.parse(calls[calls.length - 1][1]) as Record<string, unknown>;
    };
    /** The persisted JSON, read back through the store's own load path. */
    const reloaded = async () => {
      const json = (mockSecureStore.setItemAsync as jest.Mock).mock.calls.at(-1)![1];
      resetStore();
      (mockSecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(json);
      await useSubscriptionStore.getState().loadSubscription();
      return useSubscriptionStore.getState().subscription;
    };
    const withTrackedEvents = async (run: () => Promise<unknown>) => {
      const original = useSubscriptionStore.getState().trackSubscriptionEvent;
      const track = jest.fn(async () => {});
      useSubscriptionStore.setState({ trackSubscriptionEvent: track });
      try {
        await run();
      } finally {
        useSubscriptionStore.setState({ trackSubscriptionEvent: original });
      }
      return track.mock.calls.map(c => c[0]);
    };

    it('a verified trial persists status trial, trial access, and the trial ending at the verified expiry', async () => {
      mockIAP.verifyReceipt.mockResolvedValue(verified({ isTrialPeriod: true }));

      await expect(useSubscriptionStore.getState().processVerifiedPurchase(purchase(), 'yearly')).resolves.toBe(true);

      const state = useSubscriptionStore.getState();
      expect(state.subscription?.status).toBe('trial');
      expect(state.featureAccess).toEqual(calculateFeatureAccess('trial'));
      expect(persisted()).toMatchObject({ status: 'trial', trialEndDate: EXPIRES, trialStartDate: null, subscriptionEndDate: EXPIRES });
      const back = await reloaded();
      expect(back?.status).toBe('trial');
      expect(useSubscriptionStore.getState().featureAccess).toEqual(calculateFeatureAccess('trial'));
    });

    it('the plan is the verified product\'s, not the client\'s', async () => {
      mockIAP.verifyReceipt.mockResolvedValue(verified({ productId: apple.yearly }));

      await useSubscriptionStore.getState().processVerifiedPurchase(purchase(apple.monthly), 'monthly');

      expect(useSubscriptionStore.getState().subscription?.interval).toBe('yearly');
    });

    it.each([
      ['absent', undefined],
      ['unknown', 'com.example.not-ours'],
    ])('a %s verified product persists nothing, acknowledges nothing, and throws', async (_label, productId) => {
      mockIAP.verifyReceipt.mockResolvedValue(verified({ productId }));

      await expect(useSubscriptionStore.getState().processVerifiedPurchase(purchase(), 'yearly')).rejects.toThrow(
        'Receipt verified a product this app does not sell'
      );
      expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
      expect(mockIAP.finishTransaction).not.toHaveBeenCalled();
      expect(useSubscriptionStore.getState().subscription).toBeNull();
      expect(useSubscriptionStore.getState().isVerifyingReceipt).toBe(false);
    });

    it.each(['apple', 'google'] as const)('the persisted record asserts no unverified payment fact (%s purchase)', async (platform) => {
      mockIAP.getPlatform.mockReturnValue(platform);
      const productId = platform === 'apple' ? apple.monthly : google.monthly;
      mockIAP.verifyReceipt.mockResolvedValue(verified({ productId }));

      await useSubscriptionStore.getState().processVerifiedPurchase({ ...purchase(productId), purchaseToken: 'token-708' }, 'monthly');

      const record = persisted();
      for (const field of ['priceUsd', 'currency', 'subscriptionStartDate', 'lastPaymentDate', 'trialStartDate', 'trialEndDate', 'receiptData']) {
        expect(record).toHaveProperty(field, null);
      }
      expect(record).toMatchObject({ status: 'active', interval: 'monthly', subscriptionEndDate: EXPIRES, platform });
      expect(await reloaded()).toStrictEqual(record);
    });

    it('only id, userId and createdAt survive from an existing record', async () => {
      const existing = seedSubscription({ status: 'grace', gracePeriodEnd: Date.now() + 1000, paymentFailureCount: 2, platformCustomerId: 'cust-1' });
      useSubscriptionStore.setState({ subscription: existing });
      mockIAP.verifyReceipt.mockResolvedValue(verified());

      await useSubscriptionStore.getState().processVerifiedPurchase(purchase(), 'yearly');

      const record = persisted();
      expect(record).toMatchObject({ id: existing.id, userId: existing.userId, createdAt: existing.createdAt });
      expect(record).toMatchObject({ priceUsd: null, receiptData: null, lastPaymentDate: null, gracePeriodEnd: null, paymentFailureCount: 0, status: 'active' });
      expect(record).not.toHaveProperty('platformCustomerId');
    });

    it('a purchase records subscription_started; a restore records subscription_restored', async () => {
      mockIAP.verifyReceipt.mockResolvedValue(verified());
      const onPurchase = await withTrackedEvents(() =>
        useSubscriptionStore.getState().processVerifiedPurchase(purchase(), 'yearly')
      );
      expect(onPurchase).toEqual(['subscription_started']);

      resetStore();
      mockIAP.restorePurchases.mockResolvedValue([purchase()]);
      const onRestore = await withTrackedEvents(() => useSubscriptionStore.getState().restorePurchases());
      expect(onRestore).toEqual(['subscription_restored']);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // NOT-YET-IMPLEMENTED STUBS — pin the CURRENT contract explicitly.
  // ──────────────────────────────────────────────────────────────────
  describe('concurrent calls for one transaction coalesce (DEBUG-827)', () => {
    const { apple, google } = DEFAULT_SUBSCRIPTION_CONFIG.products;
    // The listener's and restore's copies of one StoreKit transaction: the JWS
    // purchaseToken may differ, the transactionId does not.
    const listenerCopy = (transactionId = '2000000827000001') => ({
      productId: apple.monthly,
      transactionReceipt: 'receipt-827',
      orderId: 'order-827',
      transactionId,
      purchaseToken: 'eyJ.jws-from-listener',
    });
    const restoreCopy = (transactionId = '2000000827000001') => ({
      ...listenerCopy(transactionId),
      purchaseToken: 'eyJ.jws-from-getAvailablePurchases',
    });
    const verified = {
      valid: true,
      subscriptionId: 'verified-827',
      expiresDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
      productId: apple.monthly,
      isTrialPeriod: false,
      httpStatus: 200,
    };

    /** A verifyReceipt the test releases by hand, so two calls overlap. */
    const holdVerification = () => {
      let release!: (value: unknown) => void;
      let fail!: (error: unknown) => void;
      mockIAP.verifyReceipt.mockImplementationOnce(
        () =>
          new Promise((resolve, reject) => {
            release = resolve;
            fail = reject;
          })
      );
      return { release: (v: unknown = verified) => release(v), fail: (e: unknown) => fail(e) };
    };
    const verifyStarted = async (n = 1) => {
      for (let i = 0; i < 50 && mockIAP.verifyReceipt.mock.calls.length < n; i++) {
        await new Promise(resolve => setImmediate(resolve));
      }
      expect(mockIAP.verifyReceipt).toHaveBeenCalledTimes(n);
    };
    const tracked = () => {
      const track = jest.fn(async () => {});
      useSubscriptionStore.setState({ trackSubscriptionEvent: track });
      return track;
    };
    let originalTrack: ReturnType<typeof useSubscriptionStore.getState>['trackSubscriptionEvent'];
    beforeEach(() => {
      originalTrack = useSubscriptionStore.getState().trackSubscriptionEvent;
    });
    afterEach(() => {
      useSubscriptionStore.setState({ trackSubscriptionEvent: originalTrack });
    });

    it('a restore overlapping the listener for the same transaction does everything once', async () => {
      const track = tracked();
      const held = holdVerification();
      mockIAP.restorePurchases.mockResolvedValue([restoreCopy()]);

      const listener = useSubscriptionStore.getState().processVerifiedPurchase(listenerCopy(), 'monthly');
      await verifyStarted();
      const restore = useSubscriptionStore.getState().restorePurchases();
      for (let i = 0; i < 10; i++) await new Promise(resolve => setImmediate(resolve));
      held.release();

      await expect(listener).resolves.toBe(true);
      await expect(restore).resolves.toEqual({ found: 1, restored: 1 });
      expect(mockIAP.verifyReceipt).toHaveBeenCalledTimes(1);
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledTimes(1);
      expect(mockIAP.finishTransaction).toHaveBeenCalledTimes(1);
      expect(track).toHaveBeenCalledTimes(1);
    });

    it('distinct transactions are not coalesced', async () => {
      tracked();
      const first = holdVerification();
      const second = holdVerification();

      const a = useSubscriptionStore.getState().processVerifiedPurchase(listenerCopy('2000000827000001'), 'monthly');
      const b = useSubscriptionStore.getState().processVerifiedPurchase(listenerCopy('2000000827000002'), 'monthly');
      await verifyStarted(2);
      first.release();
      second.release();

      await expect(Promise.all([a, b])).resolves.toEqual([true, true]);
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledTimes(2);
      expect(mockIAP.finishTransaction).toHaveBeenCalledTimes(2);
    });

    it('Google: the same purchaseToken coalesces', async () => {
      mockIAP.getPlatform.mockReturnValue('google');
      const track = tracked();
      const held = holdVerification();
      const play = { productId: google.monthly, transactionReceipt: '', orderId: 'GPA.827', purchaseToken: 'opaque-827' };

      const a = useSubscriptionStore.getState().processVerifiedPurchase(play, 'monthly');
      await verifyStarted();
      const b = useSubscriptionStore.getState().processVerifiedPurchase({ ...play }, 'monthly', { source: 'restore' });
      held.release({ ...verified, productId: google.monthly });

      await expect(Promise.all([a, b])).resolves.toEqual([true, true]);
      expect(mockIAP.verifyReceipt).toHaveBeenCalledTimes(1);
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledTimes(1);
      expect(mockIAP.finishTransaction).toHaveBeenCalledTimes(1);
      expect(track).toHaveBeenCalledTimes(1);
    });

    it('a rejected first call rejects the joiner too, and restore counts nothing', async () => {
      tracked();
      const held = holdVerification();
      mockIAP.restorePurchases.mockResolvedValue([restoreCopy()]);

      const listener = useSubscriptionStore.getState().processVerifiedPurchase(listenerCopy(), 'monthly');
      await verifyStarted();
      const restore = useSubscriptionStore.getState().restorePurchases();
      for (let i = 0; i < 10; i++) await new Promise(resolve => setImmediate(resolve));
      held.fail(new Error('network down'));

      await expect(listener).rejects.toThrow('network down');
      await expect(restore).resolves.toEqual({ found: 1, restored: 0 });
      expect(mockIAP.verifyReceipt).toHaveBeenCalledTimes(1);
      expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
      expect(mockIAP.finishTransaction).not.toHaveBeenCalled();
    });

    it('coalescing is in-flight only: a call after the first settles runs again', async () => {
      tracked();
      mockIAP.verifyReceipt.mockResolvedValue(verified);

      await expect(useSubscriptionStore.getState().processVerifiedPurchase(listenerCopy(), 'monthly')).resolves.toBe(true);
      await expect(useSubscriptionStore.getState().processVerifiedPurchase(restoreCopy(), 'monthly')).resolves.toBe(true);

      expect(mockIAP.verifyReceipt).toHaveBeenCalledTimes(2);
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledTimes(2);
    });

    it('the joining call leaves isVerifyingReceipt to the call that owns it', async () => {
      tracked();
      const held = holdVerification();

      const a = useSubscriptionStore.getState().processVerifiedPurchase(listenerCopy(), 'monthly');
      await verifyStarted();
      expect(useSubscriptionStore.getState().isVerifyingReceipt).toBe(true);
      const b = useSubscriptionStore.getState().processVerifiedPurchase(restoreCopy(), 'monthly', { source: 'restore' });
      for (let i = 0; i < 10; i++) await new Promise(resolve => setImmediate(resolve));
      expect(useSubscriptionStore.getState().isVerifyingReceipt).toBe(true);
      held.release();

      await Promise.all([a, b]);
      expect(useSubscriptionStore.getState().isVerifyingReceipt).toBe(false);
    });

    it.each([
      ['listener first', undefined, { source: 'restore' as const }, 'subscription_started'],
      ['restore first', { source: 'restore' as const }, undefined, 'subscription_restored'],
    ])('the first in-flight caller decides the event (%s)', async (_label, firstContext, secondContext, event) => {
      const track = tracked();
      const held = holdVerification();

      const a = useSubscriptionStore.getState().processVerifiedPurchase(listenerCopy(), 'monthly', firstContext);
      await verifyStarted();
      const b = useSubscriptionStore.getState().processVerifiedPurchase(restoreCopy(), 'monthly', secondContext);
      held.release();

      await Promise.all([a, b]);
      expect(track.mock.calls.map(c => c[0])).toEqual([event]);
    });
  });

  describe('not-yet-implemented stubs (current contract)', () => {
    // TODO(MAINT-242 follow-up): implement cancelSubscription. Currently
    // throws 'Cancellation not yet implemented' internally → state.error.
    it('cancelSubscription routes the not-implemented failure to state.error', async () => {
      useSubscriptionStore.setState({ subscription: seedSubscription() });
      await useSubscriptionStore.getState().cancelSubscription();
      expect(useSubscriptionStore.getState().error).toBe('Failed to cancel subscription');
    });

    // INFRA-84: the store's own verifyReceipt() was DELETED, not neutered.
    // On a payment trust boundary neither stub value is safe: `true` grants
    // unverified premium access, `false` would strip a paying user's access
    // the moment anything called it. It had no callers, while its doc comment
    // claimed a 24-hour cadence — so the invitation to wire up an always-true
    // verifier was sitting in this suite. Real verification is
    // IAPService.verifyReceipt(), asserted above, which reaches the Supabase
    // edge function.
    it('the store exposes no verifyReceipt action', () => {
      expect('verifyReceipt' in useSubscriptionStore.getState()).toBe(false);
    });

    // Positive control (DEBUG-390 lesson): an absence assertion passes
    // vacuously if the lookup itself is wrong. Prove this exact lookup still
    // finds a sibling action that IS present.
    it('positive control: the same lookup finds a sibling action', () => {
      expect('cancelSubscription' in useSubscriptionStore.getState()).toBe(true);
    });
  });
});
