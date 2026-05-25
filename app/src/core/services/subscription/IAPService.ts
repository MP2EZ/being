/**
 * IN-APP PURCHASE SERVICE
 * Cross-platform IAP integration using react-native-iap (Nitro v15)
 *
 * FEATURES:
 * - Apple StoreKit 2 integration
 * - Google Play Billing 8 integration
 * - Purchase flow management
 * - Receipt verification
 * - Restore purchases
 *
 * SECURITY:
 * - Server-side receipt verification (via Supabase Edge Function)
 * - No client-side price trust
 * - Product IDs hardcoded server-side
 *
 * COMPLIANCE (MAINT-157):
 * - PCI DSS: N/A — Apple/Google handle payment data.
 * - Auth identity is derived from auth.uid() inside Edge Functions; we never
 *   send userId in the request body.
 * - Persisted subscription metadata (incl. receipt strings) goes to
 *   expo-secure-store with AES-256 backing. Only fields with a verification
 *   need are propagated to the store — see `augmentPurchase` for the
 *   explicit allow-list.
 *
 * PERFORMANCE:
 * - Purchase flow: <60s (target from acceptance criteria)
 * - Receipt verification: <2s
 * - Restore purchases: <5s
 */

import * as RNIap from 'react-native-iap';
import type {
  Purchase,
  ProductSubscription,
  PurchaseError,
  ProductSubscriptionAndroid,
} from 'react-native-iap';
import {
  SubscriptionProductIds,
  SubscriptionInterval,
  DEFAULT_SUBSCRIPTION_CONFIG
} from '@/core/types/subscription';
import { Platform } from 'react-native';
import { supabaseService } from '../supabase/SupabaseService';
import { logSystem, logPerformance } from '@/core/services/logging';

/**
 * IAP Product Configuration
 */
const PRODUCT_IDS: SubscriptionProductIds = DEFAULT_SUBSCRIPTION_CONFIG.products;

/**
 * Android package name. Must match `expo.android.package` in app.json
 * (currently "com.being.app"). Used by the Google Play receipt verification
 * Edge Function to identify which Play Console app the purchase belongs to.
 *
 * Drift detection: if app.json's android.package changes, this must change
 * too. Worth adding a runtime guard test that fails CI on mismatch.
 */
const ANDROID_PACKAGE_NAME = 'com.being.app';

/**
 * Augmented purchase shape forwarded to the subscription store.
 *
 * react-native-iap v15 dropped the legacy `transactionReceipt` field and
 * renamed `orderId` to `id`. The store narrows purchases defensively to
 * `{transactionReceipt, purchaseToken, orderId}` — keeping that contract
 * lets us swap the library without touching consumer code.
 *
 * Per compliance pass (MAINT-157): only the three legacy fields are added.
 * Native-side metadata (obfuscated IDs, developer payload, advanced commerce
 * data, etc.) is intentionally NOT propagated to avoid data-minimization
 * regressions in the SecureStore-persisted blob.
 */
export type AugmentedPurchase = Purchase & {
  transactionReceipt: string;
  orderId: string;
};

/**
 * Map a product ID (from a Purchase) back to its SubscriptionInterval.
 * Used by the async purchase listener (deferred purchases, restore, family
 * approval flows) to determine which subscription tier the user bought.
 */
function intervalFromProductId(productId: string): SubscriptionInterval | null {
  if (productId === PRODUCT_IDS.apple.monthly || productId === PRODUCT_IDS.google.monthly) {
    return 'monthly';
  }
  if (productId === PRODUCT_IDS.apple.yearly || productId === PRODUCT_IDS.google.yearly) {
    return 'yearly';
  }
  return null;
}

/**
 * Get platform-specific product IDs
 */
function getPlatformProductIds(): string[] {
  if (Platform.OS === 'ios') {
    return [
      PRODUCT_IDS.apple.monthly,
      PRODUCT_IDS.apple.yearly
    ];
  } else if (Platform.OS === 'android') {
    return [
      PRODUCT_IDS.google.monthly,
      PRODUCT_IDS.google.yearly
    ];
  }
  return [];
}

/**
 * Map subscription interval to product ID
 */
function getProductId(interval: SubscriptionInterval): string {
  if (Platform.OS === 'ios') {
    return interval === 'monthly'
      ? PRODUCT_IDS.apple.monthly
      : PRODUCT_IDS.apple.yearly;
  } else if (Platform.OS === 'android') {
    return interval === 'monthly'
      ? PRODUCT_IDS.google.monthly
      : PRODUCT_IDS.google.yearly;
  }
  throw new Error('Unsupported platform for IAP');
}

/**
 * IAP Service
 * Singleton service for managing in-app purchases
 */
class IAPServiceClass {
  private isInitialized = false;
  private products: ProductSubscription[] = [];
  private mockMode = __DEV__; // Enable mock purchases in development

  // v15 listener registration returns an object with `.remove()` — store both
  // refs so disconnect() can detach cleanly.
  private purchaseUpdateSub: { remove: () => void } | null = null;
  private purchaseErrorSub: { remove: () => void } | null = null;

  /**
   * Initialize IAP service
   * Call this on app start
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logSystem('[IAP] Already initialized');
      return;
    }

    try {
      logSystem('[IAP] Initializing...');

      // Connect to store
      await RNIap.initConnection();

      // v15 splits success/error into separate listeners (was a single
      // setPurchaseListener dispatching on responseCode in v14/expo).
      this.purchaseUpdateSub = RNIap.purchaseUpdatedListener((purchase) => {
        void this.handlePurchaseSuccess(purchase);
      });
      this.purchaseErrorSub = RNIap.purchaseErrorListener((error) => {
        this.handlePurchaseError(error);
      });

      // Fetch available products. v15 uses fetchProducts({skus, type}) and
      // throws on failure rather than returning a response code.
      const productIds = getPlatformProductIds();
      try {
        const result = await RNIap.fetchProducts({ skus: productIds, type: 'subs' });
        this.products = (result as ProductSubscription[] | null) ?? [];
        logSystem(`[IAP] Products loaded: ${this.products.length}`);
      } catch (productError) {
        console.error('[IAP] Failed to fetch products:', productError);
        this.products = [];
      }

      this.isInitialized = true;
      logSystem('[IAP] Initialization complete');
    } catch (error) {
      console.error('[IAP] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect from IAP service
   * Call this on app unmount (cleanup)
   */
  async disconnect(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      this.purchaseUpdateSub?.remove();
      this.purchaseErrorSub?.remove();
      this.purchaseUpdateSub = null;
      this.purchaseErrorSub = null;
      await RNIap.endConnection();
      this.isInitialized = false;
      logSystem('[IAP] Disconnected');
    } catch (error) {
      console.error('[IAP] Disconnect failed:', error);
    }
  }

  /**
   * Get available products
   */
  getProducts(): ProductSubscription[] {
    return this.products;
  }

  /**
   * Get product by interval
   */
  getProduct(interval: SubscriptionInterval): ProductSubscription | undefined {
    const productId = getProductId(interval);
    // v15 ProductSubscription uses `.id` as the primary identifier (replaces
    // the v14 `.productId`).
    return this.products.find(p => p.id === productId);
  }

  /**
   * Purchase subscription
   * Initiates platform IAP flow (or mock flow in development)
   */
  async purchaseSubscription(interval: SubscriptionInterval): Promise<AugmentedPurchase | null> {
    if (!this.isInitialized) {
      throw new Error('IAP service not initialized');
    }

    const startTime = performance.now();

    try {
      const productId = getProductId(interval);
      logSystem(`[IAP] Purchasing subscription: interval=${interval} productId=${productId} mockMode=${this.mockMode}`);

      // MOCK MODE: Simulate purchase flow for development.
      // Receipt format `mock_receipt_{interval}_{ts}` is matched server-side
      // by the mock-receipt branch in verifyReceipt — keep verbatim.
      if (this.mockMode) {
        logSystem('[IAP] Mock purchase flow activated');

        // Simulate network delay (1-2 seconds)
        await new Promise(resolve => setTimeout(resolve, 1500));

        const now = Date.now();
        const orderId = `mock_order_${now}`;
        const mockPurchase = {
          id: orderId,
          productId,
          transactionDate: now,
          purchaseState: 'purchased' as const,
          purchaseToken: `mock_token_${now}`,
          isAutoRenewing: true,
          quantity: 1,
          platform: (Platform.OS === 'ios' ? 'ios' : 'android'),
          store: (Platform.OS === 'ios' ? 'app-store' : 'play-store'),
          // Augmented compat fields the store consumes
          transactionReceipt: `mock_receipt_${interval}_${now}`,
          orderId,
        } as unknown as AugmentedPurchase;

        const purchaseTime = performance.now() - startTime;
        logPerformance('iap_mock_purchase', purchaseTime);

        return mockPurchase;
      }

      // REAL MODE: Use actual IAP. v15's unified requestPurchase takes a
      // per-platform request payload; subs flow goes through `type: 'subs'`.
      if (Platform.OS === 'ios') {
        await RNIap.requestPurchase({
          request: { ios: { sku: productId } },
          type: 'subs',
        });
      } else if (Platform.OS === 'android') {
        // Play Billing v6+ requires a subscriptionOffer per requestPurchase
        // call. The offerToken is plucked from the cached product's first
        // offer; richer offer selection (trial vs intro vs base) is out of
        // scope for this migration.
        const sub = this.products.find(p => p.id === productId);
        const androidSub = sub as ProductSubscriptionAndroid | undefined;
        const offerToken = androidSub?.subscriptionOfferDetailsAndroid?.[0]?.offerToken;
        if (!offerToken) {
          throw new Error(`No subscription offer token available for ${productId}`);
        }
        await RNIap.requestPurchase({
          request: {
            android: {
              skus: [productId],
              subscriptionOffers: [{ sku: productId, offerToken }],
            },
          },
          type: 'subs',
        });
      } else {
        throw new Error('Unsupported platform for IAP');
      }

      const purchaseTime = performance.now() - startTime;
      logPerformance('iap_purchase_initiated', purchaseTime);

      // Purchase result will come via the purchaseUpdatedListener.
      return null;
    } catch (error) {
      console.error('[IAP] Purchase failed:', error);
      throw error;
    }
  }

  /**
   * Restore purchases
   * For users who subscribed on different device
   */
  async restorePurchases(): Promise<AugmentedPurchase[]> {
    if (!this.isInitialized) {
      throw new Error('IAP service not initialized');
    }

    try {
      logSystem('[IAP] Restoring purchases...');

      // v15: getAvailablePurchases returns active entitlements (closer to
      // what restore should surface). `onlyIncludeActiveItemsIOS: true`
      // filters out finished iOS transactions.
      const purchases = await RNIap.getAvailablePurchases({
        onlyIncludeActiveItemsIOS: true,
      });

      const augmented = await Promise.all(
        purchases.map(p => this.augmentPurchase(p))
      );

      logSystem(`[IAP] Purchases restored: ${augmented.length}`);
      return augmented;
    } catch (error) {
      console.error('[IAP] Restore purchases failed:', error);
      throw error;
    }
  }

  /**
   * Finish transaction
   * Must be called after successful receipt verification
   */
  async finishTransaction(purchase: AugmentedPurchase): Promise<void> {
    try {
      // Mock mode: bypass the native call — there's no real platform
      // transaction to acknowledge.
      if (this.mockMode && purchase.transactionReceipt?.startsWith('mock_receipt_')) {
        logSystem(`[IAP] Mock finishTransaction: ${purchase.orderId}`);
        return;
      }

      await RNIap.finishTransaction({ purchase, isConsumable: false });
      logSystem(`[IAP] Transaction finished: ${purchase.orderId}`);
    } catch (error) {
      console.error('[IAP] Failed to finish transaction:', error);
      throw error;
    }
  }

  /**
   * Handle a successful purchase from the v15 purchaseUpdatedListener.
   *
   * Fires for async purchase resolutions: parent-approval (Family Sharing),
   * deferred payments resolving later, restore flows, and multi-device
   * subscription propagation. The direct mock-mode purchase flow resolves
   * synchronously and is processed by the store; this listener handles the
   * real platform path.
   *
   * Each purchase is augmented (legacy compat fields added), routed to the
   * store for verify → persist → finish. Failures are caught here so the
   * listener stays fire-and-forget; the platform re-emits on next launch.
   */
  private handlePurchaseSuccess = async (purchase: Purchase): Promise<void> => {
    try {
      logSystem(`[IAP] Purchase event: productId=${purchase.productId} id=${purchase.id}`);

      const interval = intervalFromProductId(purchase.productId);
      if (!interval) {
        console.error('[IAP] Unknown productId from listener:', purchase.productId);
        return;
      }

      const augmented = await this.augmentPurchase(purchase);

      // Lazy require to break the circular dep: subscriptionStore imports
      // IAPService (also lazily) so a top-level import on either side
      // would form a cycle. require() executes synchronously when called
      // here (post-init), which is safe — the store is fully loaded by
      // the time any IAP listener fires. Avoids the `await import()`
      // dynamic-callback path that Jest CJS can't intercept cleanly.
      const { useSubscriptionStore } = require('@/core/stores/subscriptionStore');
      await useSubscriptionStore.getState().processVerifiedPurchase(augmented, interval);
    } catch (err) {
      console.error('[IAP] Async purchase processing failed:', err);
      // Don't rethrow — the listener fires fire-and-forget and a retry
      // happens naturally on the next platform re-emit.
    }
  };

  /**
   * Handle a purchase error from the v15 purchaseErrorListener.
   * User-cancellation is the expected silent path (the v14 USER_CANCELED
   * branch); other codes are logged for diagnostics.
   */
  private handlePurchaseError = (error: PurchaseError): void => {
    // ErrorCode.UserCancelled is the v15 enum value; the raw string
    // 'E_USER_CANCELLED' is the cross-platform code surfaced from native.
    if (
      error.code === RNIap.ErrorCode.UserCancelled ||
      String(error.code) === 'E_USER_CANCELLED'
    ) {
      logSystem('[IAP] Purchase cancelled by user');
      return;
    }
    console.error('[IAP] Purchase error:', { code: error.code, message: error.message });
  };

  /**
   * Augment a v15 Purchase with the legacy fields the subscription store
   * consumes. iOS receipt fetched via getReceiptIOS() so the Apple Edge
   * Function continues to receive the unified base64 receipt blob it
   * already validates (no Edge Function change required by this migration
   * per compliance pass).
   *
   * Android verification uses {productId + purchaseToken + packageName}
   * server-side; `transactionReceipt` is empty for Android and ignored by
   * the Google Edge Function path.
   */
  private async augmentPurchase(purchase: Purchase): Promise<AugmentedPurchase> {
    let transactionReceipt = '';
    if (Platform.OS === 'ios') {
      try {
        transactionReceipt = await RNIap.getReceiptIOS();
      } catch (err) {
        console.error('[IAP] Failed to fetch iOS receipt:', err);
      }
    }
    return {
      ...purchase,
      transactionReceipt,
      orderId: purchase.id,
    } as AugmentedPurchase;
  }

  /**
   * Verify receipt server-side
   * Sends receipt to Supabase Edge Function for verification (or mocks in development)
   */
  async verifyReceipt(receiptData: string, platform: 'apple' | 'google', purchaseToken?: string): Promise<{
    valid: boolean;
    subscriptionId?: string | undefined;
    expiresDate?: number | undefined;
    error?: string | undefined;
  }> {
    try {
      logSystem(`[IAP] Verifying receipt: platform=${platform} mockMode=${this.mockMode}`);

      // MOCK MODE: Accept mock receipts
      if (this.mockMode && receiptData.startsWith('mock_receipt_')) {
        logSystem('[IAP] Mock receipt verification - auto-approving');

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Extract interval from mock receipt (format: mock_receipt_{interval}_{timestamp})
        const parts = receiptData.split('_');
        const interval = parts[2] || 'monthly';

        // Generate expiry date (1 year or 1 month from now)
        const now = Date.now();
        const expiresDate = interval === 'yearly'
          ? now + (365 * 24 * 60 * 60 * 1000) // 1 year
          : now + (30 * 24 * 60 * 60 * 1000);  // 1 month

        logSystem('[IAP] Mock receipt verified successfully');

        return {
          valid: true,
          subscriptionId: `mock_sub_${Date.now()}`,
          expiresDate,
        };
      }

      // Get the Supabase client. We use functions.invoke() so the user's
      // session JWT is auto-attached as the Bearer token; the function then
      // extracts auth.uid() from that JWT instead of trusting a userId from
      // the body. Closes SEC-VERIFY-RECEIPT-ANON.
      const status = supabaseService.getStatus();
      if (!status.userId) {
        throw new Error('User not authenticated');
      }
      const client = supabaseService.getClient();
      if (!client) {
        throw new Error('Supabase client not initialized');
      }

      const startTime = performance.now();

      type VerifyReceiptResponse = {
        valid: boolean;
        subscriptionId?: string;
        expiresDate?: string;
        error?: string;
      };

      // Call appropriate Edge Function based on platform
      if (platform === 'apple') {
        const { data, error } = await client.functions.invoke<VerifyReceiptResponse>(
          'verify-apple-receipt',
          { body: { receiptData } }
        );

        if (error) {
          throw new Error(`Receipt verification failed: ${error.message}`);
        }
        if (!data) {
          throw new Error('Receipt verification returned no data');
        }

        const verifyTime = performance.now() - startTime;
        logPerformance('iap_receipt_verified', verifyTime);

        return {
          valid: data.valid,
          subscriptionId: data.subscriptionId,
          expiresDate: data.expiresDate ? new Date(data.expiresDate).getTime() : undefined,
          error: data.error,
        };
      } else if (platform === 'google') {
        if (!purchaseToken) {
          throw new Error('Purchase token required for Google verification');
        }

        const { data, error } = await client.functions.invoke<VerifyReceiptResponse>(
          'verify-google-receipt',
          {
            body: {
              packageName: ANDROID_PACKAGE_NAME,
              subscriptionId: receiptData, // For Google, this is the product ID
              purchaseToken,
            },
          }
        );

        if (error) {
          throw new Error(`Receipt verification failed: ${error.message}`);
        }
        if (!data) {
          throw new Error('Receipt verification returned no data');
        }

        const verifyTime = performance.now() - startTime;
        logPerformance('iap_receipt_verified', verifyTime);

        return {
          valid: data.valid,
          subscriptionId: data.subscriptionId,
          expiresDate: data.expiresDate ? new Date(data.expiresDate).getTime() : undefined,
          error: data.error,
        };
      } else {
        throw new Error('Unsupported platform');
      }
    } catch (error) {
      console.error('[IAP] Receipt verification failed:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if IAP is available on this platform
   */
  isAvailable(): boolean {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }

  /**
   * Get platform name
   */
  getPlatform(): 'apple' | 'google' | 'none' {
    if (Platform.OS === 'ios') return 'apple';
    if (Platform.OS === 'android') return 'google';
    return 'none';
  }
}

// Export singleton instance
export const IAPService = new IAPServiceClass();

/**
 * React hook for IAP service
 * Ensures service is initialized before use
 */
export function useIAPService() {
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    IAPService.initialize()
      .then(() => setIsReady(true))
      .catch(error => {
        console.error('[IAP] Initialization failed:', error);
      });

    return () => {
      IAPService.disconnect();
    };
  }, []);

  return {
    isReady,
    service: IAPService
  };
}

// Import React for hook
import * as React from 'react';
