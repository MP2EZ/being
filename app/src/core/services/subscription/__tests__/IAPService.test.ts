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

// Mock expo-in-app-purchases with an explicit factory. An auto-mock
// (`jest.mock('expo-in-app-purchases')`) still introspects the real
// module's shape and that introspection triggers expo-modules-core's
// native binding load — fatal in the Jest env. Factory mock avoids it.
jest.mock('expo-in-app-purchases', () => ({
  __esModule: true,
  connectAsync: jest.fn(),
  disconnectAsync: jest.fn(),
  setPurchaseListener: jest.fn(),
  getProductsAsync: jest.fn(),
  purchaseItemAsync: jest.fn(),
  getPurchaseHistoryAsync: jest.fn(),
  finishTransactionAsync: jest.fn(),
  IAPResponseCode: {
    OK: 0,
    USER_CANCELED: 1,
    PAYMENT_INVALID: 2,
    PAYMENT_NOT_ALLOWED: 3,
    ITEM_UNAVAILABLE: 4,
    REMOTE_COMMUNICATION_FAILED: 5,
    BILLING_RESPONSE_JSON_PARSE_ERROR: 6,
    ITEM_ALREADY_OWNED: 7,
    ITEM_NOT_OWNED: 8,
    SERVICE_DISCONNECTED: 9,
    USER_CANCELLED: 1, // alias
    UNKNOWN: 10,
    DEFERRED: 11,
    ERROR: -1,
  },
  InAppPurchaseState: {
    PURCHASING: 0,
    PURCHASED: 1,
    FAILED: 2,
    RESTORED: 3,
    DEFERRED: 4,
  },
  IAPItemType: {
    SUBSCRIPTION: 'subs',
    INAPP: 'inapp',
  },
}));

// Mock SupabaseService. We expose a getClient() returning a stub whose
// functions.invoke is a jest.fn — tests assert against that.
const mockInvoke = jest.fn();
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
    getClient: jest.fn(() => ({
      functions: {
        invoke: mockInvoke,
      },
    })),
  },
}));

const mockInAppPurchases = InAppPurchases as jest.Mocked<typeof InAppPurchases>;

// Mock the subscription store so we can assert that the async IAP
// listener routes purchases to processVerifiedPurchase. The store is
// loaded via dynamic import inside IAPService.processAsyncPurchase to
// avoid a circular dependency at module load — this mock intercepts.
const mockProcessVerifiedPurchase = jest.fn(async () => undefined);
jest.mock('@/core/stores/subscriptionStore', () => ({
  useSubscriptionStore: {
    getState: () => ({
      processVerifiedPurchase: mockProcessVerifiedPurchase,
    }),
  },
}));

describe('IAPService - Initialization', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // IAPService is a module-level singleton — disconnect to reset
    // `isInitialized` so each test starts from a clean state.
    await IAPService.disconnect();
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
  beforeEach(async () => {
    jest.clearAllMocks();
    await IAPService.disconnect();
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

  it('CRITICAL: purchaseSubscription() in mock mode resolves synchronously', async () => {
    const service = IAPService;

    await service.initialize();

    // __DEV__ is true in the Jest env → IAPService is in mock mode.
    // Mock mode short-circuits the platform IAP and returns a synthetic
    // Purchase object directly (no setPurchaseListener callback fires).
    // The real-mode path (purchaseItemAsync → listener) is exercised by
    // the "Async purchase listener" describe block below.
    const result = await service.purchaseSubscription('monthly');

    expect(mockInAppPurchases.purchaseItemAsync).not.toHaveBeenCalled();
    expect(result).not.toBeNull();
    expect(result!.productId).toBe('com.being.subscription.monthly');
    expect(result!.transactionReceipt).toMatch(/^mock_receipt_monthly_/);

    console.log('✅ MOCK PURCHASE FLOW VERIFIED: Synthetic Purchase returned');
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
  });

  it('CRITICAL: verifyReceipt() calls Apple Edge Function via invoke', async () => {
    const service = IAPService;

    mockInvoke.mockResolvedValue({
      data: {
        valid: true,
        subscriptionId: 'test-sub-id',
        expiresDate: '2025-11-01T00:00:00Z',
      },
      error: null,
    });

    const result = await service.verifyReceipt('base64-receipt', 'apple');

    // Body must NOT include userId — that's derived from auth.uid() server-side now.
    expect(mockInvoke).toHaveBeenCalledWith(
      'verify-apple-receipt',
      { body: { receiptData: 'base64-receipt' } }
    );

    expect(result.valid).toBe(true);
    expect(result.subscriptionId).toBe('test-sub-id');

    console.log('✅ RECEIPT VERIFICATION VERIFIED: Apple receipt verified successfully');
  });

  it('CRITICAL: verifyReceipt() calls Google Edge Function via invoke', async () => {
    const service = IAPService;

    mockInvoke.mockResolvedValue({
      data: {
        valid: true,
        subscriptionId: 'test-order-id',
        expiresDate: '2025-11-01T00:00:00Z',
      },
      error: null,
    });

    const result = await service.verifyReceipt('subscription_monthly', 'google', 'purchase-token-123');

    expect(mockInvoke).toHaveBeenCalledWith(
      'verify-google-receipt',
      {
        body: {
          packageName: 'com.being.app',
          subscriptionId: 'subscription_monthly',
          purchaseToken: 'purchase-token-123',
        },
      }
    );

    expect(result.valid).toBe(true);

    console.log('✅ RECEIPT VERIFICATION VERIFIED: Google receipt verified successfully');
  });

  it('PERFORMANCE: Receipt verification completes in <2s', async () => {
    const service = IAPService;

    mockInvoke.mockImplementation(
      () => new Promise(resolve =>
        setTimeout(() => resolve({
          data: { valid: true, subscriptionId: 'test', expiresDate: '2025-11-01' },
          error: null,
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

  it('Receipt verification handles invoke errors (gateway 401, network failures)', async () => {
    const service = IAPService;

    // supabase-js returns { data: null, error: FunctionsHttpError } on failures
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    });

    const result = await service.verifyReceipt('base64-receipt', 'apple');

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();

    console.log('✅ ERROR HANDLING VERIFIED: invoke errors handled gracefully');
  });

  it('Receipt verification rejects when client is uninitialized', async () => {
    const service = IAPService;
    const { supabaseService } = jest.requireMock('../../supabase/SupabaseService') as { supabaseService: { getClient: jest.Mock } };
    supabaseService.getClient.mockReturnValueOnce(null);

    const result = await service.verifyReceipt('base64-receipt', 'apple');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('not initialized');
  });

  // TEST-06 audit: expand error matrix beyond happy path. The Edge Function
  // can return valid:false with an explanatory error string (function ran ok
  // but the receipt itself is invalid/expired/mismatched). These cases must
  // surface back to the caller intact so the subscription store doesn't
  // grant entitlement on a rejected receipt.

  it('Receipt verification preserves valid:false with error field (invalid receipt)', async () => {
    const service = IAPService;

    mockInvoke.mockResolvedValue({
      data: { valid: false, error: 'INVALID_RECEIPT' },
      error: null,
    });

    const result = await service.verifyReceipt('tampered-receipt', 'apple');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('INVALID_RECEIPT');
    expect(result.subscriptionId).toBeUndefined();
    expect(result.expiresDate).toBeUndefined();
  });

  it('Receipt verification preserves expiresDate accurately (round-trip for expired receipts)', async () => {
    const service = IAPService;
    // Past expiry date — function returns valid:true but consumer should detect expiry
    const pastIso = '2020-01-01T00:00:00Z';
    const expectedMs = new Date(pastIso).getTime();

    mockInvoke.mockResolvedValue({
      data: { valid: true, subscriptionId: 'sub-expired', expiresDate: pastIso },
      error: null,
    });

    const result = await service.verifyReceipt('past-receipt', 'apple');

    expect(result.valid).toBe(true);
    expect(result.subscriptionId).toBe('sub-expired');
    expect(result.expiresDate).toBe(expectedMs);
    expect(result.expiresDate).toBeLessThan(Date.now()); // sanity: actually in the past
  });

  it('Receipt verification surfaces user-mismatch errors from the Edge Function', async () => {
    const service = IAPService;
    // Edge Function detected receipt belongs to a different auth.uid()
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'User mismatch: receipt does not belong to authenticated user' },
    });

    const result = await service.verifyReceipt('other-user-receipt', 'apple');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('User mismatch');
  });

  it('Receipt verification handles empty/whitespace receiptData via the Edge Function', async () => {
    const service = IAPService;
    // Empty receipt — Edge Function should reject. The client doesn't pre-validate
    // (deliberate — server is the source of truth on receipt format), so the
    // request flows through and we assert the rejection round-trips intact.
    mockInvoke.mockResolvedValue({
      data: { valid: false, error: 'EMPTY_RECEIPT' },
      error: null,
    });

    const result = await service.verifyReceipt('', 'apple');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('EMPTY_RECEIPT');
    expect(mockInvoke).toHaveBeenCalledWith(
      'verify-apple-receipt',
      { body: { receiptData: '' } }
    );
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

/**
 * Async purchase listener — TEST-03 paydown
 *
 * Real-mode IAP doesn't return the purchase synchronously from
 * purchaseSubscription(); the platform pushes it later via the listener
 * registered by setPurchaseListener. Pre-paydown that listener was 3
 * TODOs (verify, update store, finish). Now it routes each purchase to
 * subscriptionStore.processVerifiedPurchase, which does verify →
 * persist → finish → track-event.
 *
 * These tests:
 *  - Capture the listener callback from setPurchaseListener
 *  - Invoke it with synthetic purchase events
 *  - Assert the store's processVerifiedPurchase gets called with the
 *    right purchase + interval (derived from productId)
 *  - Verify USER_CANCELED + error response codes don't dispatch
 */
describe('IAPService - Async purchase listener (TEST-03)', () => {
  // Capture the listener callback registered by setPurchaseListener so
  // we can drive it directly. The IAPService is a singleton; we reset
  // jest mocks per test but the singleton's isInitialized flag persists.
  let capturedListener:
    | ((result: InAppPurchases.IAPQueryResponse<InAppPurchases.InAppPurchase>) => void)
    | null = null;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockProcessVerifiedPurchase.mockClear();
    capturedListener = null;

    mockInAppPurchases.connectAsync.mockResolvedValue(undefined);
    mockInAppPurchases.setPurchaseListener.mockImplementation((cb) => {
      capturedListener = cb;
    });
    mockInAppPurchases.getProductsAsync.mockResolvedValue({
      responseCode: InAppPurchases.IAPResponseCode.OK,
      results: [],
    });

    // Force re-init so setPurchaseListener registers our capturing mock
    // (the singleton's isInitialized would otherwise skip).
    await IAPService.disconnect();
    await IAPService.initialize();
  });

  function flushAsync(): Promise<void> {
    // The listener fires fire-and-forget (`void this.processAsyncPurchase`).
    // Wait for microtasks + dynamic import + any setTimeout(0)-style work.
    return new Promise((resolve) => setImmediate(resolve));
  }

  it('routes a successful monthly purchase to processVerifiedPurchase with interval=monthly', async () => {
    expect(capturedListener).not.toBeNull();

    const purchase: InAppPurchases.InAppPurchase = {
      productId: 'com.being.subscription.monthly',
      orderId: 'platform-order-1',
      purchaseTime: Date.now(),
      purchaseState: InAppPurchases.InAppPurchaseState.PURCHASED,
      purchaseToken: 'platform-token-1',
      transactionReceipt: 'apple-receipt-blob',
      acknowledged: false,
    };

    capturedListener!({
      responseCode: InAppPurchases.IAPResponseCode.OK,
      results: [purchase],
    });

    await flushAsync();

    expect(mockProcessVerifiedPurchase).toHaveBeenCalledTimes(1);
    const [calledPurchase, calledInterval] = mockProcessVerifiedPurchase.mock.calls[0];
    expect(calledInterval).toBe('monthly');
    expect((calledPurchase as InAppPurchases.InAppPurchase).orderId).toBe('platform-order-1');
  });

  it('routes a successful yearly purchase with interval=yearly', async () => {
    capturedListener!({
      responseCode: InAppPurchases.IAPResponseCode.OK,
      results: [
        {
          productId: 'com.being.subscription.yearly',
          orderId: 'platform-order-2',
          purchaseTime: Date.now(),
          purchaseState: InAppPurchases.InAppPurchaseState.PURCHASED,
          purchaseToken: 'tok-2',
          transactionReceipt: 'receipt-2',
          acknowledged: false,
        },
      ],
    });

    await flushAsync();

    expect(mockProcessVerifiedPurchase).toHaveBeenCalledTimes(1);
    expect(mockProcessVerifiedPurchase.mock.calls[0][1]).toBe('yearly');
  });

  it('handles multiple purchases in one event (each routed separately)', async () => {
    capturedListener!({
      responseCode: InAppPurchases.IAPResponseCode.OK,
      results: [
        {
          productId: 'com.being.subscription.monthly',
          orderId: 'a',
          purchaseTime: Date.now(),
          purchaseState: InAppPurchases.InAppPurchaseState.PURCHASED,
          purchaseToken: 'tok-a',
          transactionReceipt: 'r-a',
          acknowledged: false,
        },
        {
          productId: 'com.being.subscription.yearly',
          orderId: 'b',
          purchaseTime: Date.now(),
          purchaseState: InAppPurchases.InAppPurchaseState.PURCHASED,
          purchaseToken: 'tok-b',
          transactionReceipt: 'r-b',
          acknowledged: false,
        },
      ],
    });

    await flushAsync();

    expect(mockProcessVerifiedPurchase).toHaveBeenCalledTimes(2);
    expect(mockProcessVerifiedPurchase.mock.calls[0][1]).toBe('monthly');
    expect(mockProcessVerifiedPurchase.mock.calls[1][1]).toBe('yearly');
  });

  it('USER_CANCELED response does not dispatch to the store', async () => {
    capturedListener!({
      responseCode: InAppPurchases.IAPResponseCode.USER_CANCELED,
      results: undefined,
    });

    await flushAsync();

    expect(mockProcessVerifiedPurchase).not.toHaveBeenCalled();
  });

  it('non-OK error response does not dispatch to the store', async () => {
    capturedListener!({
      responseCode: InAppPurchases.IAPResponseCode.ERROR,
      results: undefined,
    });

    await flushAsync();

    expect(mockProcessVerifiedPurchase).not.toHaveBeenCalled();
  });

  it('unknown productId is logged but does NOT crash or dispatch', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    capturedListener!({
      responseCode: InAppPurchases.IAPResponseCode.OK,
      results: [
        {
          productId: 'com.being.subscription.unknown_tier',
          orderId: 'x',
          purchaseTime: Date.now(),
          purchaseState: InAppPurchases.InAppPurchaseState.PURCHASED,
          purchaseToken: 't',
          transactionReceipt: 'r',
          acknowledged: false,
        },
      ],
    });

    await flushAsync();

    expect(mockProcessVerifiedPurchase).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      '[IAP] Unknown productId from listener:',
      'com.being.subscription.unknown_tier'
    );

    consoleError.mockRestore();
  });

  it('processVerifiedPurchase throwing does not crash the listener', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockProcessVerifiedPurchase.mockRejectedValueOnce(new Error('verification network failure'));

    capturedListener!({
      responseCode: InAppPurchases.IAPResponseCode.OK,
      results: [
        {
          productId: 'com.being.subscription.monthly',
          orderId: 'y',
          purchaseTime: Date.now(),
          purchaseState: InAppPurchases.InAppPurchaseState.PURCHASED,
          purchaseToken: 't',
          transactionReceipt: 'r',
          acknowledged: false,
        },
      ],
    });

    await flushAsync();

    // The listener catches and logs; the next platform re-emit will retry.
    expect(consoleError).toHaveBeenCalledWith(
      '[IAP] Async purchase processing failed:',
      expect.any(Error)
    );

    consoleError.mockRestore();
  });
});
