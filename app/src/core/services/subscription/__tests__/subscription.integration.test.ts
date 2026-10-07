/**
 * SUBSCRIPTION INTEGRATION TESTS
 * End-to-end validation of subscription flow
 *
 * CRITICAL FLOWS:
 * - Full subscription lifecycle (trial → active → grace → expired)
 * - IAP service → Store → Component integration
 * - Crisis access guarantee throughout all states
 * - Receipt verification and state synchronization
 *
 * PERFORMANCE:
 * - Full flow completion: <5s
 * - State synchronization: <100ms
 * - Crisis access check: instant (0 lookups)
 */

import { useSubscriptionStore } from '../../../stores/subscriptionStore';
import { IAPService } from '../IAPService';
import * as RNIap from 'react-native-iap';
import * as SecureStore from 'expo-secure-store';
import { calculateFeatureAccess } from '../../../types/subscription';

// Mock react-native-iap with an explicit factory. An auto-mock would
// introspect the real module's shape and trigger react-native-nitro-modules'
// native binding load — fatal in the Jest env. Factory mock avoids it.
jest.mock('react-native-iap', () => ({
  __esModule: true,
  initConnection: jest.fn(),
  endConnection: jest.fn(),
  purchaseUpdatedListener: jest.fn(() => ({ remove: jest.fn() })),
  purchaseErrorListener: jest.fn(() => ({ remove: jest.fn() })),
  fetchProducts: jest.fn(),
  requestPurchase: jest.fn(),
  getAvailablePurchases: jest.fn(),
  finishTransaction: jest.fn(),
  getReceiptIOS: jest.fn(),
  ErrorCode: {
    UserCancelled: 'E_USER_CANCELLED',
    Unknown: 'E_UNKNOWN',
  },
}));

jest.mock('expo-secure-store');

const mockInvoke = jest.fn();
jest.mock('../../supabase/SupabaseService', () => ({
  supabaseService: {
    // DEBUG-715: receipt verification acquires its client here.
    getAuthenticatedClient: jest.fn(async () => ({
      ok: true,
      client: { functions: { invoke: mockInvoke } },
      userId: 'test-user-id',
    })),
    getStatus: jest.fn(() => ({
      isInitialized: true,
      userId: 'test-user-id',
      circuitBreakerState: 'closed',
      offlineQueueSize: 0,
      analyticsQueueSize: 0,
      lastSyncTime: new Date().toISOString(),
    })),
    getClient: jest.fn(() => ({
      functions: { invoke: mockInvoke },
    })),
  },
}));

const mockRNIap = RNIap as jest.Mocked<typeof RNIap>;
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

// Helper: v15 ProductSubscription fixture (iOS subset).
function makeIOSSubscription(productId: string, displayPrice: string) {
  return {
    id: productId,
    type: 'subs' as const,
    platform: 'ios' as const,
    title: `Sub ${productId}`,
    description: `Sub description ${productId}`,
    displayPrice,
    currency: 'USD',
    price: parseFloat(displayPrice.replace(/[^0-9.]/g, '')),
  } as unknown as RNIap.ProductSubscription;
}

// MAINT-166 PR 2: synchronous cleanup of IAPService listener subscriptions
// between tests. The original quarantine reason was "Cannot log after
// tests are done" — purchaseUpdatedListener / purchaseErrorListener
// survived test boundaries and fired callbacks against a torn-down test
// runner.
//
// First attempt used `await IAPService.disconnect()`, which hung in CI
// (--coverage + --ci environment, the mocked RNIap.endConnection
// occasionally lost its resolved value between tests). The robust fix
// is to clear the listener refs directly via the singleton's private
// state — no async, no RNIap mock dependency.
//
// `IAPService` is the singleton instance exported as `IAPService = new
// IAPServiceClass()`. Accessing private fields through `as any` is a
// deliberate test-only escape hatch; reaching into the class avoids the
// mock-resolution edge case while keeping the listeners from leaking.
//
// Applies to BOTH describe blocks below so we don't have to duplicate.
afterEach(() => {
  const iap = IAPService as any;
  iap.purchaseUpdateSub?.remove?.();
  iap.purchaseErrorSub?.remove?.();
  iap.purchaseUpdateSub = null;
  iap.purchaseErrorSub = null;
  iap.isInitialized = false;
});

describe('Subscription Integration - Full Lifecycle', () => {
  beforeEach(async () => {
    // Reset all state
    useSubscriptionStore.setState({
      subscription: null,
      featureAccess: null,
      isLoading: false,
      error: null,
    });

    jest.clearAllMocks();
    await IAPService.disconnect();

    // Setup IAP mocks
    mockRNIap.initConnection.mockResolvedValue(true);
    mockRNIap.endConnection.mockResolvedValue(true);
    mockRNIap.fetchProducts.mockResolvedValue([
      makeIOSSubscription('com.being.subscription.monthly', '$9.99'),
      makeIOSSubscription('com.being.subscription.yearly', '$79.99'),
    ]);
    mockRNIap.getReceiptIOS.mockResolvedValue('mock-ios-receipt-blob');

    mockSecureStore.setItemAsync.mockResolvedValue(undefined);
    mockSecureStore.getItemAsync.mockResolvedValue(null);

    mockInvoke.mockReset();
  });

  it('CRITICAL: Full trial → subscription → verification flow', async () => {
    const startTime = performance.now();

    // Step 1: Initialize IAP service
    await IAPService.initialize();
    const products = IAPService.getProducts();
    expect(products).toHaveLength(2);
    console.log('✅ STEP 1: IAP service initialized, products loaded');

    // Step 2: Create trial subscription
    const store = useSubscriptionStore.getState();
    await store.createTrial();
    await new Promise(resolve => setTimeout(resolve, 10)); // Zustand sync

    const storeAfterTrial = useSubscriptionStore.getState();
    expect(storeAfterTrial.subscription?.status).toBe('trial');
    expect(storeAfterTrial.isTrialActive()).toBe(true);
    console.log('✅ STEP 2: Trial created, status is trial');

    // Step 3: Verify crisis access during trial
    expect(storeAfterTrial.checkFeatureAccess('crisisButton')).toBe(true);
    expect(storeAfterTrial.checkFeatureAccess('nineEightEightAccess')).toBe(true);
    expect(storeAfterTrial.getCrisisAccessStatus()).toBe(true);
    console.log('✅ STEP 3: Crisis access verified during trial');

    // Step 4: Verify non-crisis feature access during trial
    const trialFeatureAccess = calculateFeatureAccess('trial');
    useSubscriptionStore.setState({ featureAccess: trialFeatureAccess });
    await new Promise(resolve => setTimeout(resolve, 10));

    const storeWithFeatures = useSubscriptionStore.getState();
    expect(storeWithFeatures.checkFeatureAccess('checkIns')).toBe(true);
    expect(storeWithFeatures.checkFeatureAccess('breathingExercises')).toBe(true);
    expect(storeWithFeatures.checkFeatureAccess('therapeuticContent')).toBe(true);
    console.log('✅ STEP 4: Non-crisis features accessible during trial');

    // Step 5: Simulate purchase (mock-mode short-circuits the platform call;
    // result is a synthetic Purchase object — assert on its shape, not on
    // the native requestPurchase call which is skipped in __DEV__).
    const purchaseResult = await IAPService.purchaseSubscription('yearly');
    expect(purchaseResult).not.toBeNull();
    expect(purchaseResult!.productId).toBe('com.being.subscription.yearly');
    expect(purchaseResult!.transactionReceipt).toMatch(/^mock_receipt_yearly_/);
    console.log('✅ STEP 5: Purchase initiated successfully (mock mode)');

    // Step 6: Simulate receipt verification
    mockInvoke.mockResolvedValue({
      data: {
        valid: true,
        subscriptionId: 'test-sub-id-integration',
        expiresDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      },
      error: null,
    });

    const receiptResult = await IAPService.verifyReceipt('base64-receipt', 'apple');
    expect(receiptResult.valid).toBe(true);
    expect(receiptResult.subscriptionId).toBe('test-sub-id-integration');
    console.log('✅ STEP 6: Receipt verified successfully');

    // Step 7: Update store to active subscription
    useSubscriptionStore.setState({
      subscription: {
        id: receiptResult.subscriptionId!,
        userId: 'test-user-id',
        platform: 'apple',
        platformSubscriptionId: 'test-platform-sub',
        status: 'active',
        tier: 'standard',
        interval: 'yearly',
        priceUsd: 79.99,
        currency: 'USD',
        trialStartDate: null,
        trialEndDate: null,
        subscriptionStartDate: Date.now(),
        subscriptionEndDate: Date.now() + 365 * 24 * 60 * 60 * 1000,
        gracePeriodEnd: null,
        lastReceiptVerified: Date.now(),
        receiptData: 'base64-receipt',
        lastPaymentDate: Date.now(),
        paymentFailureCount: 0,
        crisisAccessEnabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    });

    const activeFeatureAccess = calculateFeatureAccess('active');
    useSubscriptionStore.setState({ featureAccess: activeFeatureAccess });
    await new Promise(resolve => setTimeout(resolve, 10));

    const activeStore = useSubscriptionStore.getState();
    expect(activeStore.subscription?.status).toBe('active');
    expect(activeStore.isSubscriptionActive()).toBe(true);
    expect(activeStore.checkFeatureAccess('checkIns')).toBe(true);
    console.log('✅ STEP 7: Store updated to active subscription');

    // Step 8: Verify crisis access still guaranteed with active subscription
    expect(activeStore.checkFeatureAccess('crisisButton')).toBe(true);
    expect(activeStore.checkFeatureAccess('nineEightEightAccess')).toBe(true);
    expect(activeStore.getCrisisAccessStatus()).toBe(true);
    console.log('✅ STEP 8: Crisis access guaranteed with active subscription');

    const endTime = performance.now();
    const flowTime = endTime - startTime;

    expect(flowTime).toBeLessThan(5000); // <5s for full flow
    console.log(`✅ INTEGRATION VERIFIED: Full flow completed in ${flowTime.toFixed(0)}ms (target: <5s)`);
  });

  it('CRITICAL: Crisis access NEVER interrupted during state transitions', async () => {
    const store = useSubscriptionStore.getState();

    // No subscription
    expect(store.getCrisisAccessStatus()).toBe(true);
    console.log('✅ Crisis access: NO SUBSCRIPTION → true');

    // Trial
    await store.createTrial();
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(useSubscriptionStore.getState().getCrisisAccessStatus()).toBe(true);
    console.log('✅ Crisis access: TRIAL → true');

    // Active
    useSubscriptionStore.setState({
      subscription: {
        ...useSubscriptionStore.getState().subscription!,
        status: 'active',
      },
    });
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(useSubscriptionStore.getState().getCrisisAccessStatus()).toBe(true);
    console.log('✅ Crisis access: ACTIVE → true');

    // Grace
    useSubscriptionStore.setState({
      subscription: {
        ...useSubscriptionStore.getState().subscription!,
        status: 'grace',
        gracePeriodEnd: Date.now() + 7 * 24 * 60 * 60 * 1000,
      },
    });
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(useSubscriptionStore.getState().getCrisisAccessStatus()).toBe(true);
    console.log('✅ Crisis access: GRACE → true');

    // Expired
    useSubscriptionStore.setState({
      subscription: {
        ...useSubscriptionStore.getState().subscription!,
        status: 'expired',
        subscriptionEndDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
      },
    });
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(useSubscriptionStore.getState().getCrisisAccessStatus()).toBe(true);
    console.log('✅ Crisis access: EXPIRED → true');

    // Back to null
    useSubscriptionStore.setState({ subscription: null });
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(useSubscriptionStore.getState().getCrisisAccessStatus()).toBe(true);
    console.log('✅ Crisis access: NULL → true');

    console.log('✅ LEGAL COMPLIANCE VERIFIED: Crisis access NEVER interrupted during state transitions');
  });

  it('CRITICAL: Feature gating works correctly across subscription states', async () => {
    const store = useSubscriptionStore.getState();
    // calculateFeatureAccess imported at top of file (dynamic import required --experimental-vm-modules).

    // No subscription - only crisis features accessible
    expect(store.checkFeatureAccess('crisisButton')).toBe(true);
    expect(store.checkFeatureAccess('checkIns')).toBe(false);
    console.log('✅ No subscription: Crisis=true, Non-crisis=false');

    // Trial - all features accessible
    await store.createTrial();
    const trialFeatureAccess = calculateFeatureAccess('trial');
    useSubscriptionStore.setState({ featureAccess: trialFeatureAccess });
    await new Promise(resolve => setTimeout(resolve, 10));

    const trialStore = useSubscriptionStore.getState();
    expect(trialStore.checkFeatureAccess('crisisButton')).toBe(true);
    expect(trialStore.checkFeatureAccess('checkIns')).toBe(true);
    expect(trialStore.checkFeatureAccess('breathingExercises')).toBe(true);
    console.log('✅ Trial: All features accessible');

    // Active - all features accessible
    const activeFeatureAccess = calculateFeatureAccess('active');
    useSubscriptionStore.setState({
      subscription: {
        ...trialStore.subscription!,
        status: 'active',
      },
      featureAccess: activeFeatureAccess,
    });
    await new Promise(resolve => setTimeout(resolve, 10));

    const activeStore = useSubscriptionStore.getState();
    expect(activeStore.checkFeatureAccess('crisisButton')).toBe(true);
    expect(activeStore.checkFeatureAccess('checkIns')).toBe(true);
    console.log('✅ Active: All features accessible');

    // Expired - only crisis features accessible
    const expiredFeatureAccess = calculateFeatureAccess('expired');
    useSubscriptionStore.setState({
      subscription: {
        ...activeStore.subscription!,
        status: 'expired',
        subscriptionEndDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
      },
      featureAccess: expiredFeatureAccess,
    });
    await new Promise(resolve => setTimeout(resolve, 10));

    const expiredStore = useSubscriptionStore.getState();
    expect(expiredStore.checkFeatureAccess('crisisButton')).toBe(true);
    expect(expiredStore.checkFeatureAccess('nineEightEightAccess')).toBe(true);
    expect(expiredStore.checkFeatureAccess('checkIns')).toBe(false);
    console.log('✅ Expired: Crisis=true, Non-crisis=false');

    console.log('✅ FEATURE GATING VERIFIED: Correct access control across all states');
  });

  it('PERFORMANCE: State synchronization completes quickly', async () => {
    const store = useSubscriptionStore.getState();

    // Measure trial creation
    const trialStart = performance.now();
    await store.createTrial();
    await new Promise(resolve => setTimeout(resolve, 10));
    const trialEnd = performance.now();
    const trialTime = trialEnd - trialStart;

    expect(trialTime).toBeLessThan(100);
    console.log(`✅ Trial creation: ${trialTime.toFixed(2)}ms (target: <100ms)`);

    // Measure feature access calculation
    // calculateFeatureAccess imported at top of file (dynamic import required --experimental-vm-modules).

    const calcStart = performance.now();
    const featureAccess = calculateFeatureAccess('active');
    const calcEnd = performance.now();
    const calcTime = calcEnd - calcStart;

    expect(calcTime).toBeLessThan(10);
    console.log(`✅ Feature access calculation: ${calcTime.toFixed(2)}ms (target: <10ms)`);

    // Measure state update
    const updateStart = performance.now();
    useSubscriptionStore.setState({ featureAccess });
    await new Promise(resolve => setTimeout(resolve, 10));
    const updateEnd = performance.now();
    const updateTime = updateEnd - updateStart;

    expect(updateTime).toBeLessThan(100);
    console.log(`✅ State update: ${updateTime.toFixed(2)}ms (target: <100ms)`);

    console.log('✅ PERFORMANCE VERIFIED: State synchronization is fast');
  });

  it('CRITICAL: Restore purchases flow works correctly', async () => {
    await IAPService.initialize();

    // v15: getAvailablePurchases returns active entitlements (replaces v14
    // getPurchaseHistoryAsync which returned the full history).
    mockRNIap.getAvailablePurchases.mockResolvedValue([
      {
        id: 'restored-order-123',
        productId: 'com.being.subscription.yearly',
        transactionDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
        purchaseState: 'purchased',
        purchaseToken: 'restored-purchase-token',
        isAutoRenewing: true,
        quantity: 1,
        platform: 'ios',
        store: 'app-store',
        transactionId: 'restored-order-123',
      } as unknown as RNIap.Purchase,
    ]);

    // Restore purchases
    const purchases = await IAPService.restorePurchases();
    expect(purchases).toHaveLength(1);
    expect(purchases[0]!.productId).toBe('com.being.subscription.yearly');
    expect(purchases[0]!.orderId).toBe('restored-order-123');
    // iOS receipt blob is fetched via getReceiptIOS during augmentation
    expect(purchases[0]!.transactionReceipt).toBe('mock-ios-receipt-blob');
    console.log('✅ STEP 1: Active entitlements retrieved');

    // Verify receipt (server-side)
    mockInvoke.mockResolvedValue({
      data: {
        valid: true,
        subscriptionId: 'restored-sub-id',
        expiresDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000).toISOString(),
      },
      error: null,
    });

    const receiptResult = await IAPService.verifyReceipt('mock-ios-receipt-blob', 'apple');
    expect(receiptResult.valid).toBe(true);
    console.log('✅ STEP 2: Receipt verified');

    // Update store with restored subscription
    const activeFeatureAccess = calculateFeatureAccess('active');

    useSubscriptionStore.setState({
      subscription: {
        id: receiptResult.subscriptionId!,
        userId: 'test-user-id',
        platform: 'apple',
        platformSubscriptionId: 'restored-platform-sub',
        status: 'active',
        tier: 'standard',
        interval: 'yearly',
        priceUsd: 79.99,
        currency: 'USD',
        trialStartDate: null,
        trialEndDate: null,
        subscriptionStartDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
        subscriptionEndDate: Date.now() + 335 * 24 * 60 * 60 * 1000,
        gracePeriodEnd: null,
        lastReceiptVerified: Date.now(),
        receiptData: 'mock-ios-receipt-blob',
        lastPaymentDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
        paymentFailureCount: 0,
        crisisAccessEnabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      featureAccess: activeFeatureAccess,
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    const store = useSubscriptionStore.getState();
    expect(store.isSubscriptionActive()).toBe(true);
    expect(store.checkFeatureAccess('checkIns')).toBe(true);
    expect(store.checkFeatureAccess('crisisButton')).toBe(true);
    console.log('✅ STEP 3: Store updated with restored subscription');

    console.log('✅ RESTORE FLOW VERIFIED: Purchase restoration works correctly');
  });

  it('CRITICAL: Error handling preserves crisis access', async () => {
    const store = useSubscriptionStore.getState();

    // Crisis access works with no subscription
    expect(store.getCrisisAccessStatus()).toBe(true);

    // Simulate IAP initialization failure
    mockRNIap.initConnection.mockRejectedValue(new Error('IAP connection failed'));

    try {
      await IAPService.initialize();
    } catch (error) {
      // Expected to fail
    }

    // Crisis access STILL works
    expect(store.getCrisisAccessStatus()).toBe(true);
    console.log('✅ Crisis access maintained after IAP failure');

    // Simulate receipt verification failure (invoke returns an error)
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'Network error' } });

    const receiptResult = await IAPService.verifyReceipt('base64-receipt', 'apple');
    expect(receiptResult.valid).toBe(false);

    // Crisis access STILL works
    expect(store.getCrisisAccessStatus()).toBe(true);
    console.log('✅ Crisis access maintained after receipt verification failure');

    console.log('✅ ERROR HANDLING VERIFIED: Crisis access NEVER interrupted by errors');
  });
});

describe('Subscription Integration - Platform Specifics', () => {
  beforeEach(async () => {
    useSubscriptionStore.setState({
      subscription: null,
      featureAccess: null,
      isLoading: false,
      error: null,
    });
    jest.clearAllMocks();
    await IAPService.disconnect();

    mockRNIap.initConnection.mockResolvedValue(true);
    mockRNIap.endConnection.mockResolvedValue(true);
    mockRNIap.fetchProducts.mockResolvedValue([]);
    mockRNIap.getReceiptIOS.mockResolvedValue('mock-ios-receipt-blob');

    mockInvoke.mockReset();
  });

  it('Apple receipt verification flow', async () => {
    await IAPService.initialize();

    mockInvoke.mockResolvedValue({
      data: {
        valid: true,
        subscriptionId: 'apple-sub-id',
        expiresDate: '2025-11-01T00:00:00Z',
      },
      error: null,
    });

    const result = await IAPService.verifyReceipt('apple-receipt-data', 'apple', undefined, {
      transactionId: '2000000847061713',
      environment: 'Production',
    });

    // INFRA-467: Apple verification is keyed on a transactionId, and `receiptData` is no
    // longer sent at all. Asserted on captured keys rather than toHaveBeenCalledWith,
    // whose toEqual semantics cannot distinguish an absent key from an undefined one.
    const [fnName, opts] = mockInvoke.mock.calls[0] as [string, { body: Record<string, unknown> }];
    expect(fnName).toBe('verify-apple-receipt');
    expect(Object.keys(opts.body).sort()).toEqual(['environment', 'transactionId']);
    expect('receiptData' in opts.body).toBe(false);

    expect(result.valid).toBe(true);
    expect(result.subscriptionId).toBe('apple-sub-id');

    console.log('✅ APPLE FLOW VERIFIED: Receipt verified via Apple Edge Function');
  });

  it('Google receipt verification flow', async () => {
    await IAPService.initialize();

    mockInvoke.mockResolvedValue({
      data: {
        valid: true,
        subscriptionId: 'google-order-id',
        expiresDate: '2025-11-01T00:00:00Z',
      },
      error: null,
    });

    // DEBUG-713: the Play product id travels in its own argument. receiptData is ''
    // on Android, so it can never carry it.
    const result = await IAPService.verifyReceipt(
      '',
      'google',
      'google-purchase-token',
      undefined,
      'subscription_monthly'
    );

    expect(mockInvoke).toHaveBeenCalledWith(
      'verify-google-receipt',
      {
        body: {
          packageName: 'fyi.being.app',
          subscriptionId: 'subscription_monthly',
          purchaseToken: 'google-purchase-token',
        },
      }
    );

    expect(result.valid).toBe(true);
    expect(result.subscriptionId).toBe('google-order-id');

    console.log('✅ GOOGLE FLOW VERIFIED: Receipt verified via Google Edge Function');
  });

  it('Google verification without a product id is refused before the network', async () => {
    await IAPService.initialize();

    const result = await IAPService.verifyReceipt('', 'google', 'google-purchase-token');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Product id required for Google verification');
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});

/**
 * DEBUG-713: Android verification identifiers, pinned at the CALLER boundary.
 *
 * The direct verifyReceipt tests above hand the function a product id, which is
 * exactly how the bug hid: augmentPurchase sets transactionReceipt to '' on
 * Android, processVerifiedPurchase forwarded that as receiptData, and the Google
 * branch sent it as subscriptionId, so verify-google-receipt answered 400. These
 * drive the real listener and the real store restore with a real-shaped Android
 * Purchase and assert on the request the Edge Function receives.
 *
 * Mock mode cannot hide it: mockMode is on under jest (__DEV__), but its
 * short-circuit keys on a `mock_receipt_` receipt, and an augmented Android
 * purchase carries ''.
 */
describe('Subscription Integration - Google identifiers at the caller boundary (DEBUG-713)', () => {
  const RN = require('react-native');

  const androidPurchase = {
    id: 'GPA.3312-4512-9934-21117',
    productId: 'subscription_monthly',
    purchaseToken: 'opaque-play-token-7f3a9c',
    platform: 'android',
    transactionDate: 1759600000000,
    purchaseState: 'purchased',
    isAutoRenewing: true,
  };

  /** The listener processes fire-and-forget; wait for it to reach the network. */
  async function settle(predicate: () => boolean): Promise<void> {
    for (let i = 0; i < 50 && !predicate(); i++) {
      await new Promise(resolve => setImmediate(resolve));
    }
  }

  function invokeCall(fnName: string): { body: Record<string, unknown> } | undefined {
    const call = mockInvoke.mock.calls.find(([name]) => name === fnName);
    return call?.[1] as { body: Record<string, unknown> } | undefined;
  }

  beforeEach(async () => {
    useSubscriptionStore.setState({
      subscription: null,
      featureAccess: null,
      isLoading: false,
      error: null,
    });
    jest.clearAllMocks();
    await IAPService.disconnect();

    mockRNIap.initConnection.mockResolvedValue(true);
    mockRNIap.endConnection.mockResolvedValue(true);
    mockRNIap.fetchProducts.mockResolvedValue([]);
    mockRNIap.getReceiptIOS.mockResolvedValue('mock-ios-receipt-blob');
    mockRNIap.finishTransaction.mockResolvedValue(true as never);
    mockSecureStore.setItemAsync.mockResolvedValue(undefined);
    mockSecureStore.getItemAsync.mockResolvedValue(null);

    mockInvoke.mockReset();
    mockInvoke.mockResolvedValue({
      data: { valid: true, subscriptionId: 'GPA.3312-4512-9934-21117', expiresDate: '2026-11-04T00:00:00Z' },
      error: null,
    });
  });

  afterEach(() => {
    RN.Platform.OS = 'ios';
  });

  it('purchase: the listener sends the Play product id and the purchase token', async () => {
    RN.Platform.OS = 'android';
    await IAPService.initialize();
    const onPurchase = mockRNIap.purchaseUpdatedListener.mock.calls[0][0] as (p: unknown) => void;

    onPurchase(androidPurchase);
    await settle(() => mockInvoke.mock.calls.length > 0);

    const opts = invokeCall('verify-google-receipt');
    expect(opts).toBeDefined();
    expect(Object.keys(opts!.body).sort()).toEqual(['packageName', 'purchaseToken', 'subscriptionId']);
    expect(opts!.body.subscriptionId).toBe(androidPurchase.productId);
    expect(opts!.body.purchaseToken).toBe(androidPurchase.purchaseToken);
    expect(opts!.body.packageName).toBe('fyi.being.app');
  });

  it('restore: the store sends the same identifiers and applies the entitlement', async () => {
    RN.Platform.OS = 'android';
    await IAPService.initialize();
    mockRNIap.getAvailablePurchases.mockResolvedValue([androidPurchase] as never);

    const result = await useSubscriptionStore.getState().restorePurchases();

    const opts = invokeCall('verify-google-receipt');
    expect(opts).toBeDefined();
    expect(Object.keys(opts!.body).sort()).toEqual(['packageName', 'purchaseToken', 'subscriptionId']);
    expect(opts!.body.subscriptionId).toBe(androidPurchase.productId);
    expect(opts!.body.purchaseToken).toBe(androidPurchase.purchaseToken);
    expect(result).toEqual({ found: 1, restored: 1 });
  });

  it('iOS: the Apple request is unchanged and the Google function is never called', async () => {
    RN.Platform.OS = 'ios';
    await IAPService.initialize();
    const onPurchase = mockRNIap.purchaseUpdatedListener.mock.calls[0][0] as (p: unknown) => void;

    onPurchase({
      id: '2000000847061713',
      transactionId: '2000000847061713',
      environmentIOS: 'Sandbox',
      productId: 'com.being.subscription.monthly',
      platform: 'ios',
      transactionDate: 1759600000000,
    });
    await settle(() => mockInvoke.mock.calls.length > 0);

    const opts = invokeCall('verify-apple-receipt');
    expect(opts).toBeDefined();
    expect(Object.keys(opts!.body).sort()).toEqual(['environment', 'transactionId']);
    expect(opts!.body.transactionId).toBe('2000000847061713');
    expect('receiptData' in opts!.body).toBe(false);
    expect(invokeCall('verify-google-receipt')).toBeUndefined();
  });
});
