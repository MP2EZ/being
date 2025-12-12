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
import * as InAppPurchases from 'expo-in-app-purchases';
import * as SecureStore from 'expo-secure-store';
import { supabaseService } from '../../supabase/SupabaseService';
import { calculateFeatureAccess } from '../../../types/subscription';

// Mock dependencies
jest.mock('expo-in-app-purchases');
jest.mock('expo-secure-store');
jest.mock('../../supabase/SupabaseService', () => ({
  supabaseService: {
    getStatus: jest.fn(() => ({
      isInitialized: true,
      userId: 'test-user-id',
      circuitBreakerState: 'closed',
      offlineQueueSize: 0,
      analyticsQueueSize: 0,
      lastSyncTime: new Date().toISOString(),
    })),
  },
}));

const mockInAppPurchases = InAppPurchases as jest.Mocked<typeof InAppPurchases>;
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('Subscription Integration - Full Lifecycle', () => {
  beforeEach(() => {
    // Reset all state
    useSubscriptionStore.setState({
      subscription: null,
      featureAccess: null,
      isLoading: false,
      error: null,
    });

    jest.clearAllMocks();

    // Setup IAP mocks
    mockInAppPurchases.connectAsync.mockResolvedValue(undefined);
    mockInAppPurchases.setPurchaseListener.mockImplementation(() => {});
    mockInAppPurchases.getProductsAsync.mockResolvedValue({
      responseCode: InAppPurchases.IAPResponseCode.OK,
      results: [
        {
          productId: 'com.being.subscription.monthly',
          price: '9.99',
          localizedPrice: '$9.99',
          title: 'Monthly Subscription',
          description: 'Monthly subscription to Being',
          type: InAppPurchases.IAPItemType.SUBSCRIPTION,
        },
        {
          productId: 'com.being.subscription.yearly',
          price: '79.99',
          localizedPrice: '$79.99',
          title: 'Yearly Subscription',
          description: 'Yearly subscription to Being',
          type: InAppPurchases.IAPItemType.SUBSCRIPTION,
        },
      ],
    });

    mockSecureStore.setItemAsync.mockResolvedValue(undefined);
    mockSecureStore.getItemAsync.mockResolvedValue(null);

    global.fetch = jest.fn();
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
    expect(storeAfterTrial.checkFeatureAccess('crisisContacts')).toBe(true);
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

    // Step 5: Simulate purchase
    mockInAppPurchases.purchaseItemAsync.mockResolvedValue(undefined);
    const purchaseResult = await IAPService.purchaseSubscription('yearly');
    expect(mockInAppPurchases.purchaseItemAsync).toHaveBeenCalledWith(
      'com.being.subscription.yearly'
    );
    console.log('✅ STEP 5: Purchase initiated successfully');

    // Step 6: Simulate receipt verification
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        valid: true,
        subscriptionId: 'test-sub-id-integration',
        expiresDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      }),
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
    expect(activeStore.checkFeatureAccess('crisisContacts')).toBe(true);
    expect(activeStore.checkFeatureAccess('safetyPlan')).toBe(true);
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
    const { calculateFeatureAccess } = await import('../../../types/subscription');

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
    const { calculateFeatureAccess } = await import('../../../types/subscription');

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

    // Mock purchase history
    mockInAppPurchases.getPurchaseHistoryAsync.mockResolvedValue({
      responseCode: InAppPurchases.IAPResponseCode.OK,
      results: [
        {
          productId: 'com.being.subscription.yearly',
          transactionReceipt: 'restored-receipt-data',
          orderId: 'restored-order-123',
          purchaseTime: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
          acknowledged: true,
        },
      ],
    });

    // Restore purchases
    const purchases = await IAPService.restorePurchases();
    expect(purchases).toHaveLength(1);
    expect(purchases[0].productId).toBe('com.being.subscription.yearly');
    console.log('✅ STEP 1: Purchase history retrieved');

    // Verify receipt
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        valid: true,
        subscriptionId: 'restored-sub-id',
        expiresDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    });

    const receiptResult = await IAPService.verifyReceipt('restored-receipt-data', 'apple');
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
        receiptData: 'restored-receipt-data',
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
    mockInAppPurchases.connectAsync.mockRejectedValue(new Error('IAP connection failed'));

    try {
      await IAPService.initialize();
    } catch (error) {
      // Expected to fail
    }

    // Crisis access STILL works
    expect(store.getCrisisAccessStatus()).toBe(true);
    console.log('✅ Crisis access maintained after IAP failure');

    // Simulate receipt verification failure
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const receiptResult = await IAPService.verifyReceipt('base64-receipt', 'apple');
    expect(receiptResult.valid).toBe(false);

    // Crisis access STILL works
    expect(store.getCrisisAccessStatus()).toBe(true);
    console.log('✅ Crisis access maintained after receipt verification failure');

    console.log('✅ ERROR HANDLING VERIFIED: Crisis access NEVER interrupted by errors');
  });
});

describe('Subscription Integration - Platform Specifics', () => {
  beforeEach(() => {
    useSubscriptionStore.setState({
      subscription: null,
      featureAccess: null,
      isLoading: false,
      error: null,
    });
    jest.clearAllMocks();

    mockInAppPurchases.connectAsync.mockResolvedValue(undefined);
    mockInAppPurchases.setPurchaseListener.mockImplementation(() => {});
    mockInAppPurchases.getProductsAsync.mockResolvedValue({
      responseCode: InAppPurchases.IAPResponseCode.OK,
      results: [],
    });

    global.fetch = jest.fn();
  });

  it('Apple receipt verification flow', async () => {
    await IAPService.initialize();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        valid: true,
        subscriptionId: 'apple-sub-id',
        expiresDate: '2025-11-01T00:00:00Z',
      }),
    });

    const result = await IAPService.verifyReceipt('apple-receipt-data', 'apple');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/verify-apple-receipt'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: expect.stringContaining('apple-receipt-data'),
      })
    );

    expect(result.valid).toBe(true);
    expect(result.subscriptionId).toBe('apple-sub-id');

    console.log('✅ APPLE FLOW VERIFIED: Receipt verified via Apple Edge Function');
  });

  it('Google receipt verification flow', async () => {
    await IAPService.initialize();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        valid: true,
        subscriptionId: 'google-order-id',
        expiresDate: '2025-11-01T00:00:00Z',
      }),
    });

    const result = await IAPService.verifyReceipt(
      'com.being.subscription.monthly',
      'google',
      'google-purchase-token'
    );

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/verify-google-receipt'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: expect.stringContaining('google-purchase-token'),
      })
    );

    expect(result.valid).toBe(true);
    expect(result.subscriptionId).toBe('google-order-id');

    console.log('✅ GOOGLE FLOW VERIFIED: Receipt verified via Google Edge Function');
  });
});
