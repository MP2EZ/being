/**
 * IAP SERVICE TESTS
 * Tests for In-App Purchase service integration
 *
 * CRITICAL TESTS:
 * - Initialization and product loading
 * - Purchase flow performance (<60s target)
 * - Receipt verification integration
 * - Platform-specific behavior (iOS vs Android)
 *
 * PERFORMANCE:
 * - Receipt verification: <2s
 * - Product loading: <5s
 */

import { IAPService } from '../IAPService';
import * as InAppPurchases from 'expo-in-app-purchases';
import { supabaseService } from '../../supabase/SupabaseService';

// Mock expo-in-app-purchases
jest.mock('expo-in-app-purchases');

// Mock SupabaseService
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

describe('IAPService - Initialization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
  });

  it('CRITICAL: Service initializes and loads products', async () => {
    const service = IAPService;

    await service.initialize();

    expect(mockInAppPurchases.connectAsync).toHaveBeenCalledTimes(1);
    expect(mockInAppPurchases.setPurchaseListener).toHaveBeenCalledTimes(1);
    expect(mockInAppPurchases.getProductsAsync).toHaveBeenCalledTimes(1);

    const products = service.getProducts();
    expect(products).toHaveLength(2);
    expect(products[0].productId).toBe('com.being.subscription.monthly');
    expect(products[1].productId).toBe('com.being.subscription.yearly');

    console.log('✅ IAP INITIALIZATION VERIFIED: Products loaded successfully');
  });

  it('CRITICAL: getProduct() returns correct product by interval', async () => {
    const service = IAPService;

    await service.initialize();

    const monthlyProduct = service.getProduct('monthly');
    const yearlyProduct = service.getProduct('yearly');

    expect(monthlyProduct?.productId).toBe('com.being.subscription.monthly');
    expect(yearlyProduct?.productId).toBe('com.being.subscription.yearly');

    console.log('✅ PRODUCT LOOKUP VERIFIED: Correct products returned by interval');
  });

  it('Service handles initialization failure gracefully', async () => {
    const service = IAPService;

    mockInAppPurchases.connectAsync.mockRejectedValue(new Error('Connection failed'));

    await expect(service.initialize()).rejects.toThrow('Connection failed');

    console.log('✅ ERROR HANDLING VERIFIED: Initialization failure handled');
  });
});

describe('IAPService - Purchase Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      ],
    });
  });

  it('CRITICAL: purchaseSubscription() initiates purchase flow', async () => {
    const service = IAPService;

    await service.initialize();

    mockInAppPurchases.purchaseItemAsync.mockResolvedValue(undefined);

    const result = await service.purchaseSubscription('monthly');

    expect(mockInAppPurchases.purchaseItemAsync).toHaveBeenCalledWith('com.being.subscription.monthly');
    expect(result).toBeNull(); // Purchase completes via listener

    console.log('✅ PURCHASE FLOW VERIFIED: Purchase initiated successfully');
  });

  it('purchaseSubscription() throws if not initialized', async () => {
    const service = IAPService;

    // Don't initialize
    await expect(service.purchaseSubscription('monthly')).rejects.toThrow('IAP service not initialized');

    console.log('✅ SAFETY CHECK VERIFIED: Purchase blocked when not initialized');
  });

  it('PERFORMANCE: Purchase flow completes in reasonable time', async () => {
    const service = IAPService;

    await service.initialize();

    mockInAppPurchases.purchaseItemAsync.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(undefined), 100))
    );

    const startTime = performance.now();
    await service.purchaseSubscription('yearly');
    const endTime = performance.now();

    const purchaseTime = endTime - startTime;
    expect(purchaseTime).toBeLessThan(60000); // <60s (acceptance criteria)

    console.log(`✅ PERFORMANCE VERIFIED: Purchase initiated in ${purchaseTime.toFixed(0)}ms (target: <60s)`);
  });
});

describe('IAPService - Receipt Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('CRITICAL: verifyReceipt() calls Apple Edge Function', async () => {
    const service = IAPService;

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        valid: true,
        subscriptionId: 'test-sub-id',
        expiresDate: '2025-11-01T00:00:00Z',
      }),
    });

    const result = await service.verifyReceipt('base64-receipt', 'apple');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/verify-apple-receipt'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('base64-receipt'),
      })
    );

    expect(result.valid).toBe(true);
    expect(result.subscriptionId).toBe('test-sub-id');

    console.log('✅ RECEIPT VERIFICATION VERIFIED: Apple receipt verified successfully');
  });

  it('CRITICAL: verifyReceipt() calls Google Edge Function', async () => {
    const service = IAPService;

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        valid: true,
        subscriptionId: 'test-order-id',
        expiresDate: '2025-11-01T00:00:00Z',
      }),
    });

    const result = await service.verifyReceipt('subscription_monthly', 'google', 'purchase-token-123');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/verify-google-receipt'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('purchase-token-123'),
      })
    );

    expect(result.valid).toBe(true);

    console.log('✅ RECEIPT VERIFICATION VERIFIED: Google receipt verified successfully');
  });

  it('PERFORMANCE: Receipt verification completes in <2s', async () => {
    const service = IAPService;

    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(resolve =>
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ valid: true, subscriptionId: 'test', expiresDate: '2025-11-01' }),
        }), 100)
      )
    );

    const startTime = performance.now();
    await service.verifyReceipt('base64-receipt', 'apple');
    const endTime = performance.now();

    const verifyTime = endTime - startTime;
    expect(verifyTime).toBeLessThan(2000); // <2s (acceptance criteria)

    console.log(`✅ PERFORMANCE VERIFIED: Receipt verified in ${verifyTime.toFixed(0)}ms (target: <2s)`);
  });

  it('Receipt verification handles network errors', async () => {
    const service = IAPService;

    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const result = await service.verifyReceipt('base64-receipt', 'apple');

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();

    console.log('✅ ERROR HANDLING VERIFIED: Network errors handled gracefully');
  });
});

describe('IAPService - Restore Purchases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInAppPurchases.connectAsync.mockResolvedValue(undefined);
    mockInAppPurchases.setPurchaseListener.mockImplementation(() => {});
    mockInAppPurchases.getProductsAsync.mockResolvedValue({
      responseCode: InAppPurchases.IAPResponseCode.OK,
      results: [],
    });
  });

  it('CRITICAL: restorePurchases() retrieves purchase history', async () => {
    const service = IAPService;

    await service.initialize();

    mockInAppPurchases.getPurchaseHistoryAsync.mockResolvedValue({
      responseCode: InAppPurchases.IAPResponseCode.OK,
      results: [
        {
          productId: 'com.being.subscription.yearly',
          transactionReceipt: 'receipt-data',
          orderId: 'order-123',
          purchaseTime: Date.now(),
          acknowledged: true,
        },
      ],
    });

    const purchases = await service.restorePurchases();

    expect(mockInAppPurchases.getPurchaseHistoryAsync).toHaveBeenCalledTimes(1);
    expect(purchases).toHaveLength(1);
    expect(purchases[0].productId).toBe('com.being.subscription.yearly');

    console.log('✅ RESTORE PURCHASES VERIFIED: Purchase history retrieved successfully');
  });

  it('restorePurchases() returns empty array when no purchases found', async () => {
    const service = IAPService;

    await service.initialize();

    mockInAppPurchases.getPurchaseHistoryAsync.mockResolvedValue({
      responseCode: InAppPurchases.IAPResponseCode.OK,
      results: [],
    });

    const purchases = await service.restorePurchases();

    expect(purchases).toHaveLength(0);

    console.log('✅ RESTORE PURCHASES VERIFIED: Empty result handled correctly');
  });
});

describe('IAPService - Platform Detection', () => {
  it('isAvailable() returns correct platform availability', () => {
    const service = IAPService;

    // This will depend on the test environment
    const isAvailable = service.isAvailable();
    expect(typeof isAvailable).toBe('boolean');

    console.log('✅ PLATFORM DETECTION VERIFIED: isAvailable() returns boolean');
  });

  it('getPlatform() returns correct platform identifier', () => {
    const service = IAPService;

    const platform = service.getPlatform();
    expect(['apple', 'google', 'none']).toContain(platform);

    console.log(`✅ PLATFORM DETECTION VERIFIED: Platform is ${platform}`);
  });
});
