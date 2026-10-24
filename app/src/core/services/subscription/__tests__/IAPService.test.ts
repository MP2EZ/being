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
import { Platform } from 'react-native';

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
    isEligibleForIntroOfferIOS: jest.fn(),
    ErrorCode: {
      UserCancelled: 'E_USER_CANCELLED',
      Unknown: 'E_UNKNOWN',
      ServiceError: 'E_SERVICE_ERROR',
    },
  };
});

// FEAT-822: APPLE_SUBSCRIPTION_GROUP_ID ships unset (null). Tests set it on the module's
// exports object, which IAPService reads at call time. (A getter in a jest.mock factory does
// not work here: jest snapshots the factory's object into plain data properties.)
const subscriptionTypes = require('@/core/types/subscription') as { APPLE_SUBSCRIPTION_GROUP_ID: unknown };
const setGroupId = (v: string | null | undefined) => { subscriptionTypes.APPLE_SUBSCRIPTION_GROUP_ID = v; };

// Mock SupabaseService. getAuthenticatedClient() (DEBUG-715) hands back a stub client
// whose functions.invoke is a jest.fn — tests assert against that.
const mockInvoke = jest.fn();
jest.mock('../../supabase/SupabaseService', () => ({
  supabaseService: {
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

    // DEBUG-713: the product id is its own argument; receiptData is '' on Android.
    const result = await service.verifyReceipt('', 'google', 'purchase-token-123', undefined, 'subscription_monthly');

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

  // DEBUG-715: the real path acquires its own session instead of reading getStatus() /
  // getClient(), which are null for every user who never had a crisis flush or opened
  // Cloud Backup.
  it.each(['no_session', 'client_unavailable'] as const)(
    'Receipt verification acquires a session with mint:true; %s is valid:false with that reason, no invoke, no throw',
    async (reason) => {
      const { supabaseService } = jest.requireMock('../../supabase/SupabaseService') as {
        supabaseService: Record<string, jest.Mock>;
      };
      supabaseService['getAuthenticatedClient']!.mockResolvedValueOnce({ ok: false, reason });

      const result = await IAPService.verifyReceipt('base64-receipt', 'apple', undefined, {
        transactionId: '2000000847061713',
      });

      expect(supabaseService['getAuthenticatedClient']).toHaveBeenCalledTimes(1);
      expect(supabaseService['getAuthenticatedClient']).toHaveBeenCalledWith({ mint: true });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe(reason);
      expect(result.error).toEqual(expect.any(String));
      expect(result.error).not.toMatch(/payment/i);
      expect(mockInvoke).not.toHaveBeenCalled();
      expect(supabaseService['getStatus']).not.toHaveBeenCalled();
      expect(supabaseService['getClient']).not.toHaveBeenCalled();
    }
  );

  it('Receipt verification invokes on the client the acquisition returned', async () => {
    const { supabaseService } = jest.requireMock('../../supabase/SupabaseService') as {
      supabaseService: Record<string, jest.Mock>;
    };
    const acquiredInvoke = jest.fn().mockResolvedValue({ data: { valid: true }, error: null });
    supabaseService['getAuthenticatedClient']!.mockResolvedValueOnce({
      ok: true,
      client: { functions: { invoke: acquiredInvoke } },
      userId: 'acquired-uid',
    });

    const result = await IAPService.verifyReceipt('base64-receipt', 'apple');

    expect(result.valid).toBe(true);
    expect(acquiredInvoke).toHaveBeenCalledWith('verify-apple-receipt', expect.anything());
  });

  it('a mock receipt never acquires a session', async () => {
    const { supabaseService } = jest.requireMock('../../supabase/SupabaseService') as {
      supabaseService: Record<string, jest.Mock>;
    };

    const result = await IAPService.verifyReceipt('mock_receipt_monthly_1', 'apple');

    expect(result.valid).toBe(true);
    expect(supabaseService['getAuthenticatedClient']).not.toHaveBeenCalled();
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
    // DEBUG-715: neither init, product listing nor a zero-purchase restore acquires a session.
    const { supabaseService } = jest.requireMock('../../supabase/SupabaseService') as {
      supabaseService: Record<string, jest.Mock>;
    };
    expect(supabaseService['getAuthenticatedClient']).not.toHaveBeenCalled();

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

/**
 * FEAT-822 (intro-offer A): the store's free-trial eligibility, and the offer a purchase
 * applies. Real mode only — mock mode (__DEV__, so every jest run) returns before any store
 * call, so these flip the private flag and restore it.
 */
describe('IAPService - FEAT-822 store trial offer', () => {
  const GROUP = '21480000';
  const IOS_MONTHLY = 'com.being.subscription.monthly';
  const GOOGLE_MONTHLY = 'subscription_monthly';

  // Shaped like the real bridge output: subscriptionInfoIOS is undefined (type-bridge.ts:244)
  // and the offer arrives only in subscriptionOffers.
  const iosProduct = (offers: unknown[] | null) => ({
    ...makeIOSSubscription(IOS_MONTHLY, '$9.99'),
    subscriptionInfoIOS: undefined,
    subscriptionOffers: offers,
  }) as unknown as RNIap.ProductSubscription;
  const IOS_TRIAL = {
    id: 'intro', type: 'introductory', paymentMode: 'free-trial', displayPrice: '$0.00', price: 0,
    period: { unit: 'month', value: 1 }, periodCount: 1,
  };

  const phase = (micros: string, billingPeriod: string, recurrenceMode: number, formattedPrice: string) =>
    ({ priceAmountMicros: micros, billingPeriod, recurrenceMode, formattedPrice, billingCycleCount: 1, priceCurrencyCode: 'USD' });
  const BASE = { basePlanId: 'monthly', offerId: null, offerTags: [], offerToken: 'tok-base',
    pricingPhases: { pricingPhaseList: [phase('9990000', 'P1M', 1, '$9.99')] } };
  const TRIAL = { basePlanId: 'monthly', offerId: 'free-trial', offerTags: [], offerToken: 'tok-trial',
    pricingPhases: { pricingPhaseList: [phase('0', 'P1M', 2, 'Free'), phase('9990000', 'P1M', 1, '$9.99')] } };
  const androidProduct = (details: unknown[] | undefined) => ({
    id: GOOGLE_MONTHLY, type: 'subs', platform: 'android', displayPrice: '$9.99',
    subscriptionOfferDetailsAndroid: details, subscriptionOffers: [],
  }) as unknown as RNIap.ProductSubscription;

  const asPlatform = (os: 'ios' | 'android') => jest.replaceProperty(Platform, 'OS', os);

  beforeEach(async () => {
    jest.clearAllMocks();
    await IAPService.disconnect();
    setGroupId(GROUP);
    mockRNIap.initConnection.mockResolvedValue(true);
    mockRNIap.endConnection.mockResolvedValue(true);
    mockRNIap.requestPurchase.mockResolvedValue(undefined as never);
    (IAPService as unknown as { mockMode: boolean }).mockMode = false;
  });

  afterEach(() => {
    (IAPService as unknown as { mockMode: boolean }).mockMode = true;
    setGroupId(null);
    jest.restoreAllMocks();
  });

  async function initWith(os: 'ios' | 'android', product: RNIap.ProductSubscription) {
    asPlatform(os);
    mockRNIap.fetchProducts.mockResolvedValue([product] as never);
    await IAPService.initialize();
  }

  describe('getTrialOffer: 3 states x 2 platforms', () => {
    it.each([
      ['ios', 'eligible', () => iosProduct([IOS_TRIAL]), true,
        { state: 'eligible', durationLabel: '1 month', renewalPriceLabel: '$9.99' }],
      ['ios', 'ineligible (StoreKit says no)', () => iosProduct([IOS_TRIAL]), false, { state: 'ineligible' }],
      ['ios', 'ineligible (no intro offer configured)', () => iosProduct(null), true, { state: 'ineligible' }],
      ['android', 'eligible', () => androidProduct([TRIAL, BASE]), undefined,
        { state: 'eligible', durationLabel: '1 month', renewalPriceLabel: '$9.99', offerToken: 'tok-trial' }],
      ['android', 'ineligible (Play returned no trial offer)', () => androidProduct([BASE]), undefined, { state: 'ineligible' }],
      ['android', 'unknown (no single base plan)', () => androidProduct([TRIAL]), undefined, { state: 'unknown' }],
    ] as const)('%s: %s', async (os, _label, product, iosEligible, expected) => {
      await initWith(os, product());
      if (iosEligible !== undefined) mockRNIap.isEligibleForIntroOfferIOS.mockResolvedValue(iosEligible);
      await expect(IAPService.getTrialOffer('monthly')).resolves.toEqual(expected);
    });

    it('ios: unknown when the store throws', async () => {
      await initWith('ios', iosProduct([IOS_TRIAL]));
      mockRNIap.isEligibleForIntroOfferIOS.mockRejectedValue(new Error('StoreKit unavailable'));
      await expect(IAPService.getTrialOffer('monthly')).resolves.toEqual({ state: 'unknown' });
    });

    it.each([[null], [undefined], ['']])('ios: an unset group id (%j) is unknown and never reaches StoreKit', async (unset) => {
      await initWith('ios', iosProduct([IOS_TRIAL]));
      setGroupId(unset as string | null | undefined);
      await expect(IAPService.getTrialOffer('monthly')).resolves.toEqual({ state: 'unknown' });
      expect(mockRNIap.isEligibleForIntroOfferIOS).not.toHaveBeenCalled();
    });

    it.each(['ios', 'android'] as const)('%s: products not loaded is unknown', async (os) => {
      asPlatform(os);
      mockRNIap.fetchProducts.mockResolvedValue([] as never);
      await IAPService.initialize();
      await expect(IAPService.getTrialOffer('monthly')).resolves.toEqual({ state: 'unknown' });
    });

    it('android: a failed re-read is unknown, not the stale cached answer', async () => {
      await initWith('android', androidProduct([TRIAL, BASE]));
      mockRNIap.fetchProducts.mockRejectedValueOnce(new Error('Play down'));
      await expect(IAPService.getTrialOffer('monthly')).resolves.toEqual({ state: 'unknown' });
    });

    it('android: a trial offer whose labels cannot be built is unknown', async () => {
      const unlabelled = { ...TRIAL, pricingPhases: { pricingPhaseList: [phase('0', 'P1M', 2, 'Free')] } };
      await initWith('android', androidProduct([unlabelled, BASE]));
      await expect(IAPService.getTrialOffer('monthly')).resolves.toEqual({ state: 'unknown' });
    });

    it('not initialized, or in mock mode, is unknown with no store call', async () => {
      await expect(IAPService.getTrialOffer('monthly')).resolves.toEqual({ state: 'unknown' });
      await initWith('ios', iosProduct([IOS_TRIAL]));
      mockRNIap.fetchProducts.mockClear();
      (IAPService as unknown as { mockMode: boolean }).mockMode = true;
      await expect(IAPService.getTrialOffer('monthly')).resolves.toEqual({ state: 'unknown' });
      expect(mockRNIap.fetchProducts).not.toHaveBeenCalled();
      expect(mockRNIap.isEligibleForIntroOfferIOS).not.toHaveBeenCalled();
    });

    it.each(['ios', 'android'] as const)('%s: every call re-reads the store (no cached eligibility)', async (os) => {
      await initWith(os, os === 'ios' ? iosProduct([IOS_TRIAL]) : androidProduct([TRIAL, BASE]));
      mockRNIap.isEligibleForIntroOfferIOS.mockResolvedValue(true);
      mockRNIap.fetchProducts.mockClear();
      await IAPService.getTrialOffer('monthly');
      await IAPService.getTrialOffer('monthly');
      expect(mockRNIap.fetchProducts).toHaveBeenCalledTimes(2);
      if (os === 'ios') expect(mockRNIap.isEligibleForIntroOfferIOS).toHaveBeenCalledWith(GROUP);
      if (os === 'ios') expect(mockRNIap.isEligibleForIntroOfferIOS).toHaveBeenCalledTimes(2);
    });
  });

  describe('purchaseSubscription: the exact requestPurchase payload', () => {
    const androidPayload = (token: string) => ({
      request: { android: { skus: [GOOGLE_MONTHLY], subscriptionOffers: [{ sku: GOOGLE_MONTHLY, offerToken: token }] } },
      type: 'subs',
    });

    it('android, trial offered: the free-trial offer token', async () => {
      await initWith('android', androidProduct([BASE, TRIAL]));
      await IAPService.purchaseSubscription('monthly');
      expect(mockRNIap.requestPurchase).toHaveBeenCalledWith(androidPayload('tok-trial'));
    });

    it('android, trial offered but its labels cannot be built: still the trial token (founder 2026-10-22)', async () => {
      const unlabelled = { ...TRIAL, pricingPhases: { pricingPhaseList: [phase('0', 'P1M', 2, 'Free')] } };
      await initWith('android', androidProduct([unlabelled, BASE]));
      await expect(IAPService.getTrialOffer('monthly')).resolves.toEqual({ state: 'unknown' });
      await IAPService.purchaseSubscription('monthly');
      expect(mockRNIap.requestPurchase).toHaveBeenCalledWith(androidPayload('tok-trial'));
    });

    it('android, no trial offer: the base-plan token, never the first array entry', async () => {
      const otherPlanTrial = { ...TRIAL, basePlanId: 'yearly', offerToken: 'tok-other' };
      await initWith('android', androidProduct([otherPlanTrial, BASE]));
      await IAPService.purchaseSubscription('monthly');
      expect(mockRNIap.requestPurchase).toHaveBeenCalledWith(androidPayload('tok-base'));
    });

    it('android, no base plan: throws and requests nothing', async () => {
      await initWith('android', androidProduct([TRIAL]));
      await expect(IAPService.purchaseSubscription('monthly')).rejects.toThrow('No base plan offer for subscription_monthly');
      expect(mockRNIap.requestPurchase).not.toHaveBeenCalled();
    });

    it('ios: { ios: { sku } } — StoreKit applies an eligible introductory offer itself', async () => {
      await initWith('ios', iosProduct([IOS_TRIAL]));
      await IAPService.purchaseSubscription('monthly');
      expect(mockRNIap.requestPurchase).toHaveBeenCalledWith({ request: { ios: { sku: IOS_MONTHLY } }, type: 'subs' });
    });
  });
});

// ---------------------------------------------------------------------------
// DEBUG-708 — verifyReceipt reports what the server said, and nothing it did not.
//
// The edge functions already return productId and isTrialPeriod on success; the client
// used to drop both. A failure now carries the HTTP status (FunctionsHttpError's
// context.status, with the JSON body's error) or a failure kind, and never a product,
// trial flag or date from a rejected body. toStrictEqual, so an undefined key is a failure:
// absent must mean absent.
// ---------------------------------------------------------------------------
describe('IAPService - DEBUG-708 verifyReceipt outcome table', () => {
  // The supabase-js error shapes, by name: the classifier dispatches on err.name, never
  // instanceof, because the class identity differs across bundles.
  const httpError = (status: number, body: unknown) =>
    Object.assign(new Error('Edge Function returned a non-2xx status code'), {
      name: 'FunctionsHttpError',
      context: { status, json: async () => body },
    });
  const fetchError = () =>
    Object.assign(new Error('Failed to send a request to the Edge Function'), {
      name: 'FunctionsFetchError',
      context: new TypeError('Network request failed'),
    });
  const relayError = () =>
    Object.assign(new Error('Relay Error invoking the Edge Function'), {
      name: 'FunctionsRelayError',
      context: { status: 502 },
    });

  const { products } = jest.requireActual('@/core/types/subscription').DEFAULT_SUBSCRIPTION_CONFIG as {
    products: { apple: { monthly: string; yearly: string }; google: { monthly: string; yearly: string } };
  };
  const EXPIRES_ISO = '2026-11-01T00:00:00Z';
  const EXPIRES_MS = new Date(EXPIRES_ISO).getTime();

  const call = (platform: 'apple' | 'google') =>
    platform === 'apple'
      ? IAPService.verifyReceipt('base64-receipt', 'apple', undefined, { transactionId: '2000000847061713' })
      : IAPService.verifyReceipt('', 'google', 'purchase-token-123', undefined, products.google.monthly);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    (console.error as jest.Mock).mockRestore?.();
  });

  type Row = [string, 'apple' | 'google', { data: unknown; error: unknown }, Record<string, unknown>];
  const rows = (platform: 'apple' | 'google'): Row[] => {
    const productId = products[platform].yearly;
    return [
      ['200 valid', platform,
        { data: { valid: true, subscriptionId: 'sub-1', expiresDate: EXPIRES_ISO, productId, isTrialPeriod: false }, error: null },
        { valid: true, subscriptionId: 'sub-1', expiresDate: EXPIRES_MS, productId, isTrialPeriod: false, httpStatus: 200 }],
      ['200 trial', platform,
        { data: { valid: true, subscriptionId: 'sub-1', expiresDate: EXPIRES_ISO, productId, isTrialPeriod: true }, error: null },
        { valid: true, subscriptionId: 'sub-1', expiresDate: EXPIRES_MS, productId, isTrialPeriod: true, httpStatus: 200 }],
      // A rejected body can carry the verification (400 spreads it); none of it surfaces.
      ['400 expired', platform,
        { data: null, error: httpError(400, { valid: false, productId, isTrialPeriod: true, expiresDate: EXPIRES_ISO, error: 'Subscription is expired or revoked' }) },
        { valid: false, failure: 'http', httpStatus: 400, error: 'Subscription is expired or revoked' }],
      ['409 bound elsewhere', platform,
        { data: null, error: httpError(409, { valid: false, error: 'Receipt already bound to another account' }) },
        { valid: false, failure: 'http', httpStatus: 409, error: 'Receipt already bound to another account' }],
      ['401 unauthorized', platform,
        { data: null, error: httpError(401, { error: 'Unauthorized' }) },
        { valid: false, failure: 'http', httpStatus: 401, error: 'Unauthorized' }],
      ['503 unavailable', platform,
        { data: null, error: httpError(503, { valid: false, error: 'Receipt verification is temporarily unavailable' }) },
        { valid: false, failure: 'http', httpStatus: 503, error: 'Receipt verification is temporarily unavailable' }],
      ['500 unparseable body', platform,
        { data: null, error: Object.assign(httpError(500, null), { context: { status: 500, json: async () => { throw new SyntaxError('bad json'); } } }) },
        { valid: false, failure: 'http', httpStatus: 500, error: 'Edge Function returned a non-2xx status code' }],
      ['network (fetch)', platform,
        { data: null, error: fetchError() },
        { valid: false, failure: 'network', error: 'Failed to send a request to the Edge Function' }],
      ['network (relay)', platform,
        { data: null, error: relayError() },
        { valid: false, failure: 'network', error: 'Relay Error invoking the Edge Function' }],
    ];
  };

  it.each([...rows('apple'), ...rows('google')])('%s (%s)', async (_label, platform, invokeResult, expected) => {
    mockInvoke.mockResolvedValueOnce(invokeResult);
    await expect(call(platform)).resolves.toStrictEqual(expected);
  });

  it.each([
    ['no purchase token', () => IAPService.verifyReceipt('', 'google', undefined, undefined, 'subscription_monthly'),
      'Purchase token required for Google verification'],
    ['no product id', () => IAPService.verifyReceipt('', 'google', 'purchase-token-123', undefined, undefined),
      'Product id required for Google verification'],
  ] as const)('client precondition: %s → failure client, no invoke', async (_label, run, message) => {
    await expect(run()).resolves.toStrictEqual({ valid: false, failure: 'client', error: message });
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it.each(['no_session', 'client_unavailable'] as const)('no session (%s) keeps its reason and adds failure unavailable', async (reason) => {
    const { supabaseService } = jest.requireMock('../../supabase/SupabaseService') as {
      supabaseService: Record<string, jest.Mock>;
    };
    supabaseService['getAuthenticatedClient']!.mockResolvedValueOnce({ ok: false, reason });
    await expect(call('apple')).resolves.toStrictEqual({
      valid: false,
      reason,
      failure: 'unavailable',
      error: `Purchase not verified yet (${reason})`,
    });
  });

  it('a 200 judged invalid surfaces only its status and error', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { valid: false, error: 'INVALID_RECEIPT', productId: products.apple.monthly }, error: null });
    await expect(call('apple')).resolves.toStrictEqual({ valid: false, httpStatus: 200, error: 'INVALID_RECEIPT' });
  });

  it('the mock receipt branch reports the product and no trial', async () => {
    const result = await IAPService.verifyReceipt('mock_receipt_yearly_1', 'apple', undefined, undefined, products.apple.yearly);
    expect(result).toStrictEqual({
      valid: true,
      subscriptionId: expect.stringMatching(/^mock_sub_/),
      expiresDate: expect.any(Number),
      productId: products.apple.yearly,
      isTrialPeriod: false,
    });
  });
});
