/**
 * IN-APP PURCHASE SERVICE
 * Cross-platform IAP integration using expo-in-app-purchases
 *
 * FEATURES:
 * - Apple StoreKit 2 integration
 * - Google Play Billing integration
 * - Purchase flow management
 * - Receipt verification
 * - Restore purchases
 *
 * SECURITY:
 * - Server-side receipt verification (via Supabase Edge Function)
 * - No client-side price trust
 * - Product IDs hardcoded server-side
 * - Receipt data encrypted before storage
 *
 * PERFORMANCE:
 * - Purchase flow: <60s (target from acceptance criteria)
 * - Receipt verification: <2s
 * - Restore purchases: <5s
 */

import * as InAppPurchases from 'expo-in-app-purchases';
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
  private products: InAppPurchases.IAPItemDetails[] = [];
  private mockMode = __DEV__; // Enable mock purchases in development

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
      await InAppPurchases.connectAsync();

      // Set purchase listener
      InAppPurchases.setPurchaseListener((result) => this.handlePurchase(result));

      // Fetch available products
      const productIds = getPlatformProductIds();
      const { results, responseCode } = await InAppPurchases.getProductsAsync(productIds);

      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        this.products = results || [];
        logSystem(`[IAP] Products loaded: ${this.products.length}`);
      } else {
        console.error('[IAP] Failed to fetch products:', responseCode);
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
      await InAppPurchases.disconnectAsync();
      this.isInitialized = false;
      logSystem('[IAP] Disconnected');
    } catch (error) {
      console.error('[IAP] Disconnect failed:', error);
    }
  }

  /**
   * Get available products
   */
  getProducts(): InAppPurchases.IAPItemDetails[] {
    return this.products;
  }

  /**
   * Get product by interval
   */
  getProduct(interval: SubscriptionInterval): InAppPurchases.IAPItemDetails | undefined {
    const productId = getProductId(interval);
    return this.products.find(p => p.productId === productId);
  }

  /**
   * Purchase subscription
   * Initiates platform IAP flow (or mock flow in development)
   */
  async purchaseSubscription(interval: SubscriptionInterval): Promise<InAppPurchases.InAppPurchase | null> {
    if (!this.isInitialized) {
      throw new Error('IAP service not initialized');
    }

    const startTime = performance.now();

    try {
      const productId = getProductId(interval);
      logSystem(`[IAP] Purchasing subscription: interval=${interval} productId=${productId} mockMode=${this.mockMode}`);

      // MOCK MODE: Simulate purchase flow for development
      if (this.mockMode) {
        logSystem('[IAP] Mock purchase flow activated');

        // Simulate network delay (1-2 seconds)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Generate mock purchase result
        const mockPurchase: InAppPurchases.InAppPurchase = {
          acknowledged: false,
          orderId: `mock_order_${Date.now()}`,
          productId: productId,
          purchaseTime: Date.now(),
          purchaseState: InAppPurchases.InAppPurchaseState.PURCHASED,
          purchaseToken: `mock_token_${Date.now()}`,
          transactionReceipt: `mock_receipt_${interval}_${Date.now()}`, // This will be verified server-side
        };

        const purchaseTime = performance.now() - startTime;
        logPerformance('iap_mock_purchase', purchaseTime);

        return mockPurchase;
      }

      // REAL MODE: Use actual IAP
      await InAppPurchases.purchaseItemAsync(productId);

      const purchaseTime = performance.now() - startTime;
      logPerformance('iap_purchase_initiated', purchaseTime);

      // Purchase result will come via handlePurchase listener
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
  async restorePurchases(): Promise<InAppPurchases.InAppPurchase[]> {
    if (!this.isInitialized) {
      throw new Error('IAP service not initialized');
    }

    try {
      logSystem('[IAP] Restoring purchases...');

      const { results } = await InAppPurchases.getPurchaseHistoryAsync();

      logSystem(`[IAP] Purchases restored: ${results?.length || 0}`);

      return results || [];
    } catch (error) {
      console.error('[IAP] Restore purchases failed:', error);
      throw error;
    }
  }

  /**
   * Finish transaction
   * Must be called after successful receipt verification
   */
  async finishTransaction(purchase: InAppPurchases.InAppPurchase): Promise<void> {
    try {
      await InAppPurchases.finishTransactionAsync(purchase, true);
      logSystem(`[IAP] Transaction finished: ${purchase.orderId}`);
    } catch (error) {
      console.error('[IAP] Failed to finish transaction:', error);
      throw error;
    }
  }

  /**
   * Handle purchase event
   *
   * Fires for async purchase resolutions that bypass the direct
   * purchaseSubscription() call path: parent-approval (Family Sharing),
   * deferred payments resolving later, restore flows, and multi-device
   * subscription propagation. The direct mock-mode purchase flow
   * resolves synchronously and is processed by the store; this listener
   * handles everything else.
   *
   * Each purchase is verified, persisted to the subscription store, and
   * the platform transaction is acknowledged. Failures are logged but
   * don't throw — the listener fires fire-and-forget, and a re-emit on
   * next app start will retry.
   */
  private handlePurchase = (result: InAppPurchases.IAPQueryResponse<InAppPurchases.InAppPurchase>) => {
    logSystem(`[IAP] Purchase event: responseCode=${result.responseCode}`);

    if (result.responseCode === InAppPurchases.IAPResponseCode.OK) {
      result.results?.forEach((purchase: InAppPurchases.InAppPurchase) => {
        void this.processAsyncPurchase(purchase);
      });
    } else if (result.responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
      logSystem('[IAP] Purchase cancelled by user');
    } else {
      console.error('[IAP] Purchase error:', { responseCode: result.responseCode });
    }
  };

  /**
   * Process a single purchase from the async listener: verify receipt,
   * update the subscription store, and finish the platform transaction.
   * Dynamically imports the store to avoid a circular module dependency.
   */
  private async processAsyncPurchase(purchase: InAppPurchases.InAppPurchase): Promise<void> {
    try {
      logSystem(`[IAP] Processing async purchase: productId=${purchase.productId} orderId=${purchase.orderId}`);

      const interval = intervalFromProductId(purchase.productId);
      if (!interval) {
        console.error('[IAP] Unknown productId from listener:', purchase.productId);
        return;
      }

      // Lazy require to break the circular dep: subscriptionStore imports
      // IAPService (also lazily) so a top-level import on either side
      // would form a cycle. require() executes synchronously when called
      // here (post-init), which is safe — the store is fully loaded by
      // the time any IAP listener fires. Avoids the `await import()`
      // dynamic-callback path that Jest CJS can't intercept cleanly.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { useSubscriptionStore } = require('@/core/stores/subscriptionStore');
      await useSubscriptionStore.getState().processVerifiedPurchase(purchase, interval);
    } catch (err) {
      console.error('[IAP] Async purchase processing failed:', err);
      // Don't rethrow — the listener fires fire-and-forget and a retry
      // happens naturally on the next platform re-emit.
    }
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
