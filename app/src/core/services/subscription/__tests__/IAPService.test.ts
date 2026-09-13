/**
 * IAP SERVICE TESTS
 * Tests for In-App Purchase service integration (react-native-iap Nitro v15)
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
import { appleTransactionIdentityFrom } from '../appleTransactionIdentity';
import * as RNIap from 'react-native-iap';
import type { Purchase, PurchaseError } from 'react-native-iap';

// Mock react-native-iap with an explicit factory. An auto-mock would
// introspect the real module's shape and trigger react-native-nitro-modules'
// native binding load — fatal in the Jest env. Factory mock avoids it.
jest.mock('react-native-iap', () => {
  return {
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
      ServiceError: 'E_SERVICE_ERROR',
    },
  };
});

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

const mockRNIap = RNIap as jest.Mocked<typeof RNIap>;

// Mock the subscription store so we can assert that the async IAP
// listener routes purchases to processVerifiedPurchase. The store is
// loaded via dynamic require inside IAPService.handlePurchaseSuccess to
// avoid a circular dependency at module load — this mock intercepts.
const mockProcessVerifiedPurchase = jest.fn(async () => undefined);
jest.mock('@/core/stores/subscriptionStore', () => ({
  useSubscriptionStore: {
    getState: () => ({
      processVerifiedPurchase: mockProcessVerifiedPurchase,
    }),
  },
}));

// Helper: build a v15-shaped ProductSubscription test fixture (iOS subset).
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

// Helper: build a v15-shaped Purchase test fixture (iOS subset).
function makeIOSPurchase(productId: string, idSuffix: string) {
  return {
    id: `platform-order-${idSuffix}`,
    productId,
    transactionDate: Date.now(),
    purchaseState: 'purchased',
    purchaseToken: `platform-token-${idSuffix}`,
    isAutoRenewing: true,
    quantity: 1,
    platform: 'ios',
    store: 'app-store',
    transactionId: `platform-order-${idSuffix}`,
  } as unknown as Purchase;
}

describe('IAPService - Initialization', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // IAPService is a module-level singleton — disconnect to reset
    // `isInitialized` so each test starts from a clean state.
    await IAPService.disconnect();
    mockRNIap.initConnection.mockResolvedValue(true);
    mockRNIap.endConnection.mockResolvedValue(true);
    mockRNIap.fetchProducts.mockResolvedValue([
      makeIOSSubscription('com.being.subscription.monthly', '$9.99'),
      makeIOSSubscription('com.being.subscription.yearly', '$79.99'),
    ]);
    mockRNIap.getReceiptIOS.mockResolvedValue('mock-ios-receipt-blob');
  });

  it('CRITICAL: Service initializes and loads products', async () => {
    const service = IAPService;

    await service.initialize();

    expect(mockRNIap.initConnection).toHaveBeenCalledTimes(1);
    expect(mockRNIap.purchaseUpdatedListener).toHaveBeenCalledTimes(1);
    expect(mockRNIap.purchaseErrorListener).toHaveBeenCalledTimes(1);
    expect(mockRNIap.fetchProducts).toHaveBeenCalledWith({
      skus: ['com.being.subscription.monthly', 'com.being.subscription.yearly'],
      type: 'subs',
    });

    const products = service.getProducts();
    expect(products).toHaveLength(2);
    expect(products[0]!.id).toBe('com.being.subscription.monthly');
    expect(products[1]!.id).toBe('com.being.subscription.yearly');

    console.log('✅ IAP INITIALIZATION VERIFIED: Products loaded successfully');
  });

  it('CRITICAL: getProduct() returns correct product by interval', async () => {
    const service = IAPService;

    await service.initialize();

    const monthlyProduct = service.getProduct('monthly');
    const yearlyProduct = service.getProduct('yearly');

    expect(monthlyProduct?.id).toBe('com.being.subscription.monthly');
    expect(yearlyProduct?.id).toBe('com.being.subscription.yearly');

    console.log('✅ PRODUCT LOOKUP VERIFIED: Correct products returned by interval');
  });

  it('Service handles initialization failure gracefully', async () => {
    const service = IAPService;

    mockRNIap.initConnection.mockRejectedValue(new Error('Connection failed'));

    await expect(service.initialize()).rejects.toThrow('Connection failed');

    console.log('✅ ERROR HANDLING VERIFIED: Initialization failure handled');
  });

  it('Service tolerates fetchProducts failure (initializes with empty product list)', async () => {
    const service = IAPService;

    mockRNIap.fetchProducts.mockRejectedValueOnce(new Error('Network down'));

    await service.initialize();

    expect(service.getProducts()).toHaveLength(0);
  });
});

describe('IAPService - Purchase Flow', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await IAPService.disconnect();
    mockRNIap.initConnection.mockResolvedValue(true);
    mockRNIap.endConnection.mockResolvedValue(true);
    mockRNIap.fetchProducts.mockResolvedValue([
      makeIOSSubscription('com.being.subscription.monthly', '$9.99'),
    ]);
    mockRNIap.getReceiptIOS.mockResolvedValue('mock-ios-receipt-blob');
  });

  it('CRITICAL: purchaseSubscription() in mock mode resolves synchronously', async () => {
    const service = IAPService;

    await service.initialize();

    // __DEV__ is true in the Jest env → IAPService is in mock mode.
    // Mock mode short-circuits the platform IAP and returns a synthetic
    // Purchase object directly (no purchaseUpdatedListener callback fires).
    const result = await service.purchaseSubscription('monthly');

    expect(mockRNIap.requestPurchase).not.toHaveBeenCalled();
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

    const startTime = performance.now();
    await service.purchaseSubscription('monthly');
    const endTime = performance.now();

    const purchaseTime = endTime - startTime;
    // Mock-mode includes a 1.5s simulated network delay; still well under
    // the <60s acceptance criterion.
    expect(purchaseTime).toBeLessThan(60000);

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
    //
    // Asserted on the captured keys, NOT with toHaveBeenCalledWith. That matcher uses
    // toEqual semantics, under which `{receiptData, transactionId: undefined}` equals
    // `{receiptData}` — so the old form went green exactly when INFRA-467's field was
    // added and did nothing, and red only once it worked. Object.keys can tell the two
    // apart; see the trap-control test at the end of this describe block.
    const [fnName, opts] = mockInvoke.mock.calls[0] as [string, { body: Record<string, unknown> }];
    expect(fnName).toBe('verify-apple-receipt');
    // Empty body when the purchase carries no transaction identity: `receiptData` is no
    // longer sent at all (INFRA-467 slice 4). The server stopped reading it at slice 3,
    // so continuing to send a base64 app receipt on every purchase was pure waste.
    expect(Object.keys(opts.body).sort()).toEqual([]);
    expect('receiptData' in opts.body).toBe(false);

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
          packageName: 'fyi.being.app',
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
    const [fnName, opts] = mockInvoke.mock.calls[0] as [string, { body: Record<string, unknown> }];
    expect(fnName).toBe('verify-apple-receipt');
    expect('receiptData' in opts.body).toBe(false);
  });

  // -------------------------------------------------------------------------
  // INFRA-467 slice 2 — Apple transaction identity travels to the server.
  //
  // Slice 2 shipped this additively, before the server read it. Slice 4 then dropped
  // `receiptData`, which needed no adoption window of its own: nothing server-side ever
  // read it successfully, so there was no traffic to strand.
  // -------------------------------------------------------------------------

  it('sends transactionId and the environment hint when the purchase carries them', async () => {
    const service = IAPService;
    mockInvoke.mockResolvedValue({ data: { valid: true, subscriptionId: 's' }, error: null });

    await service.verifyReceipt('base64-receipt', 'apple', undefined, {
      transactionId: '2000000847061713',
      environment: 'Sandbox',
    });

    const [, opts] = mockInvoke.mock.calls[0] as [string, { body: Record<string, unknown> }];
    expect(Object.keys(opts.body).sort()).toEqual(['environment', 'transactionId']);
    expect(opts.body.transactionId).toBe('2000000847061713');
    expect(opts.body.environment).toBe('Sandbox');
    // The receipt blob is gone from the wire even when identity IS present.
    expect('receiptData' in opts.body).toBe(false);
  });

  it('OMITS the keys entirely when identity is absent — never sends them as undefined', async () => {
    const service = IAPService;
    mockInvoke.mockResolvedValue({ data: { valid: true }, error: null });

    await service.verifyReceipt('base64-receipt', 'apple', undefined, undefined);

    const [, opts] = mockInvoke.mock.calls[0] as [string, { body: Record<string, unknown> }];
    // `in`, not a truthiness check: an explicitly-undefined key is present to `in` and
    // survives JSON round-tripping as an absent key, which is precisely the ambiguity
    // that made the old assertions unable to fail.
    expect('transactionId' in opts.body).toBe(false);
    expect('environment' in opts.body).toBe(false);
  });

  // The extractor is the single place that reads a purchase of unknown shape, so the
  // runtime environment rule lives there and is tested there. `verifyReceipt` does not
  // re-check it: its parameter is typed to the two legal values, so an unrecognized one
  // is unrepresentable rather than filtered twice in two places that can drift apart.
  describe('appleTransactionIdentityFrom', () => {
    it('extracts the id and a recognized environment', () => {
      expect(
        appleTransactionIdentityFrom({ transactionId: '2000000847061713', environmentIOS: 'Sandbox' })
      ).toEqual({ transactionId: '2000000847061713', environment: 'Sandbox' });
    });

    it('omits an unrecognized environment rather than forwarding it', () => {
      // The server fails closed on an unknown environment, so forwarding garbage would
      // turn "no hint supplied" into a hard rejection.
      const identity = appleTransactionIdentityFrom({
        transactionId: '2000000847061713',
        environmentIOS: 'Staging',
      });
      expect(identity).toEqual({ transactionId: '2000000847061713' });
      expect('environment' in (identity as object)).toBe(false);
    });

    it('returns undefined when no usable transaction id is present', () => {
      // purchaseToken is optional AND nullable on PurchaseIOS; transactionId is not,
      // but this crosses a native boundary where the type annotation is not enforced.
      for (const bad of [undefined, null, {}, { transactionId: '' }, { transactionId: 123 }]) {
        expect(appleTransactionIdentityFrom(bad)).toBeUndefined();
      }
    });

    it('is permissive on id FORMAT — the server owns that check', () => {
      // A stricter client rule would silently drop legitimate purchases if Apple's id
      // format widens. The client only asserts "present and a usable string".
      expect(appleTransactionIdentityFrom({ transactionId: '1000000123' })).toEqual({
        transactionId: '1000000123',
      });
    });
  });

  it('TRAP CONTROL — toHaveBeenCalledWith cannot see an undefined-valued key, Object.keys can', () => {
    // This is the defect the assertions above exist to avoid, demonstrated directly.
    // If this first expectation ever starts failing, jest changed its toEqual
    // semantics and the surrounding assertions can be simplified.
    expect({ receiptData: 'x', transactionId: undefined }).toEqual({ receiptData: 'x' });
    expect(Object.keys({ receiptData: 'x', transactionId: undefined }).sort()).toEqual([
      'receiptData',
      'transactionId',
    ]);
  });
});

describe('IAPService - Restore Purchases', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await IAPService.disconnect();
    mockRNIap.initConnection.mockResolvedValue(true);
    mockRNIap.endConnection.mockResolvedValue(true);
    mockRNIap.fetchProducts.mockResolvedValue([]);
    mockRNIap.getReceiptIOS.mockResolvedValue('mock-ios-receipt-blob');
  });

  it('CRITICAL: restorePurchases() retrieves active entitlements', async () => {
    const service = IAPService;

    await service.initialize();

    mockRNIap.getAvailablePurchases.mockResolvedValue([
      makeIOSPurchase('com.being.subscription.yearly', 'restore-1'),
    ]);

    const purchases = await service.restorePurchases();

    expect(mockRNIap.getAvailablePurchases).toHaveBeenCalledTimes(1);
    expect(mockRNIap.getAvailablePurchases).toHaveBeenCalledWith({
      onlyIncludeActiveItemsIOS: true,
    });
    expect(purchases).toHaveLength(1);
    expect(purchases[0]!.productId).toBe('com.being.subscription.yearly');
    // Augmented compat fields populated
    expect(purchases[0]!.orderId).toBe('platform-order-restore-1');
    expect(purchases[0]!.transactionReceipt).toBe('mock-ios-receipt-blob');

    console.log('✅ RESTORE PURCHASES VERIFIED: Entitlements retrieved + augmented');
  });

  it('restorePurchases() returns empty array when no entitlements active', async () => {
    const service = IAPService;

    await service.initialize();

    mockRNIap.getAvailablePurchases.mockResolvedValue([]);

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
 * Async purchase listener — TEST-03 paydown (migrated to v15 split listeners)
 *
 * Real-mode IAP doesn't return the purchase synchronously from
 * purchaseSubscription(); the platform pushes it later via the listener
 * registered by purchaseUpdatedListener. User-cancellation and other
 * errors flow through the separate purchaseErrorListener (v15 split
 * what v14 dispatched on responseCode).
 *
 * These tests:
 *  - Capture both listener callbacks at registration time
 *  - Invoke them with synthetic purchase/error events
 *  - Assert the store's processVerifiedPurchase gets called with the
 *    right augmented purchase + interval (derived from productId)
 *  - Verify USER_CANCELLED + generic errors don't dispatch to the store
 */
describe('IAPService - Async purchase listener (v15 split listeners)', () => {
  let capturedSuccessListener: ((purchase: Purchase) => void) | null = null;
  let capturedErrorListener: ((error: PurchaseError) => void) | null = null;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockProcessVerifiedPurchase.mockClear();
    capturedSuccessListener = null;
    capturedErrorListener = null;

    mockRNIap.initConnection.mockResolvedValue(true);
    mockRNIap.endConnection.mockResolvedValue(true);
    mockRNIap.fetchProducts.mockResolvedValue([]);
    mockRNIap.getReceiptIOS.mockResolvedValue('async-receipt-blob');

    (mockRNIap.purchaseUpdatedListener as jest.Mock).mockImplementation((cb) => {
      capturedSuccessListener = cb;
      return { remove: jest.fn() };
    });
    (mockRNIap.purchaseErrorListener as jest.Mock).mockImplementation((cb) => {
      capturedErrorListener = cb;
      return { remove: jest.fn() };
    });

    // Force re-init so listeners register our capturing mocks (the
    // singleton's isInitialized would otherwise skip).
    await IAPService.disconnect();
    await IAPService.initialize();
  });

  function flushAsync(): Promise<void> {
    // The listener fires fire-and-forget (`void this.handlePurchaseSuccess`).
    // Wait for microtasks + augmentPurchase (async) + setImmediate.
    return new Promise((resolve) => setImmediate(resolve));
  }

  it('routes a successful monthly purchase to processVerifiedPurchase with interval=monthly', async () => {
    expect(capturedSuccessListener).not.toBeNull();

    capturedSuccessListener!(makeIOSPurchase('com.being.subscription.monthly', '1'));

    await flushAsync();

    expect(mockProcessVerifiedPurchase).toHaveBeenCalledTimes(1);
    const [calledPurchase, calledInterval] = mockProcessVerifiedPurchase.mock.calls[0]!;
    expect(calledInterval).toBe('monthly');
    expect((calledPurchase as { orderId: string }).orderId).toBe('platform-order-1');
    expect((calledPurchase as { transactionReceipt: string }).transactionReceipt).toBe('async-receipt-blob');
  });

  it('routes a successful yearly purchase with interval=yearly', async () => {
    capturedSuccessListener!(makeIOSPurchase('com.being.subscription.yearly', '2'));

    await flushAsync();

    expect(mockProcessVerifiedPurchase).toHaveBeenCalledTimes(1);
    expect(mockProcessVerifiedPurchase.mock.calls[0]![1]).toBe('yearly');
  });

  it('handles multiple sequential purchases (each routed separately)', async () => {
    // v15 emits one purchase per listener invocation (no batched results
    // array like v14's IAPQueryResponse). Drive the listener twice.
    capturedSuccessListener!(makeIOSPurchase('com.being.subscription.monthly', 'a'));
    capturedSuccessListener!(makeIOSPurchase('com.being.subscription.yearly', 'b'));

    await flushAsync();

    expect(mockProcessVerifiedPurchase).toHaveBeenCalledTimes(2);
    expect(mockProcessVerifiedPurchase.mock.calls[0]![1]).toBe('monthly');
    expect(mockProcessVerifiedPurchase.mock.calls[1]![1]).toBe('yearly');
  });

  it('USER_CANCELLED error does not dispatch to the store', async () => {
    expect(capturedErrorListener).not.toBeNull();

    capturedErrorListener!({
      code: RNIap.ErrorCode.UserCancelled,
      message: 'User cancelled',
    } as PurchaseError);

    await flushAsync();

    expect(mockProcessVerifiedPurchase).not.toHaveBeenCalled();
  });

  it('Generic error does not dispatch to the store', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    capturedErrorListener!({
      code: 'E_UNKNOWN' as RNIap.ErrorCode,
      message: 'Billing failure',
    } as PurchaseError);

    await flushAsync();

    expect(mockProcessVerifiedPurchase).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      '[IAP] Purchase error:',
      expect.objectContaining({ code: 'E_UNKNOWN', message: 'Billing failure' })
    );

    consoleError.mockRestore();
  });

  it('unknown productId is logged but does NOT crash or dispatch', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    capturedSuccessListener!(makeIOSPurchase('com.being.subscription.unknown_tier', 'x'));

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

    capturedSuccessListener!(makeIOSPurchase('com.being.subscription.monthly', 'y'));

    await flushAsync();

    // The listener catches and logs; the next platform re-emit will retry.
    expect(consoleError).toHaveBeenCalledWith(
      '[IAP] Async purchase processing failed:',
      expect.any(Error)
    );

    consoleError.mockRestore();
  });
});
