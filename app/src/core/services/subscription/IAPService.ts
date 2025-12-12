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

/**
 * IAP Product Configuration
 */
const PRODUCT_IDS: SubscriptionProductIds = DEFAULT_SUBSCRIPTION_CONFIG.products;

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
      console.log('[IAP] Already initialized');
      return;
    }

    try {
      console.log('[IAP] Initializing...');

      // Connect to store
      await InAppPurchases.connectAsync();

      // Set purchase listener
      InAppPurchases.setPurchaseListener((result) => this.handlePurchase(result));

      // Fetch available products
      const productIds = getPlatformProductIds();
      const { results, responseCode } = await InAppPurchases.getProductsAsync(productIds);

      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        this.products = results || [];
        console.log('[IAP] Products loaded:', this.products.length);
      } else {
        console.error('[IAP] Failed to fetch products:', responseCode);
      }

      this.isInitialized = true;
      console.log('[IAP] Initialization complete');
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
      console.log('[IAP] Disconnected');
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
      console.log('[IAP] Purchasing subscription:', { interval, productId, mockMode: this.mockMode });

      // MOCK MODE: Simulate purchase flow for development
      if (this.mockMode) {
        console.log('[IAP] Mock purchase flow activated');

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
        console.log(`[IAP] Mock purchase completed in ${purchaseTime}ms`);

        return mockPurchase;
      }

      // REAL MODE: Use actual IAP
      await InAppPurchases.purchaseItemAsync(productId);

      const purchaseTime = performance.now() - startTime;
      console.log(`[IAP] Purchase completed in ${purchaseTime}ms`);

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
      console.log('[IAP] Restoring purchases...');

      const { results } = await InAppPurchases.getPurchaseHistoryAsync();

      console.log('[IAP] Purchases restored:', results?.length || 0);

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
      console.log('[IAP] Transaction finished:', purchase.orderId);
    } catch (error) {
      console.error('[IAP] Failed to finish transaction:', error);
      throw error;
    }
  }

  /**
   * Handle purchase event
   * Called automatically when purchase completes
   */
  private handlePurchase = (result: InAppPurchases.IAPQueryResponse<InAppPurchases.InAppPurchase>) => {
    console.log('[IAP] Purchase event:', { responseCode: result.responseCode });

    if (result.responseCode === InAppPurchases.IAPResponseCode.OK) {
      result.results?.forEach((purchase: InAppPurchases.InAppPurchase) => {
        console.log('[IAP] Purchase received:', {
          productId: purchase.productId,
          orderId: purchase.orderId
        });

        // TODO: Verify receipt server-side
        // TODO: Update subscription store
        // TODO: Finish transaction after verification
      });
    } else if (result.responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
      console.log('[IAP] Purchase cancelled by user');
    } else {
      console.error('[IAP] Purchase error:', { responseCode: result.responseCode });
    }
  };

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
      console.log('[IAP] Verifying receipt...', { platform, mockMode: this.mockMode });

      // MOCK MODE: Accept mock receipts
      if (this.mockMode && receiptData.startsWith('mock_receipt_')) {
        console.log('[IAP] Mock receipt verification - auto-approving');

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

        console.log('[IAP] Mock receipt verified successfully');

        return {
          valid: true,
          subscriptionId: `mock_sub_${Date.now()}`,
          expiresDate,
        };
      }

      // Get user ID from Supabase service
      const status = supabaseService.getStatus();
      if (!status.userId) {
        throw new Error('User not authenticated');
      }

      const startTime = performance.now();

      // Call appropriate Edge Function based on platform
      if (platform === 'apple') {
        const response = await fetch(
          `${process.env['EXPO_PUBLIC_SUPABASE_URL']}/functions/v1/verify-apple-receipt`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY']}`,
            },
            body: JSON.stringify({
              receiptData,
              userId: status.userId,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Receipt verification failed: ${response.status}`);
        }

        const result = await response.json();
        const verifyTime = performance.now() - startTime;
        console.log(`[IAP] Receipt verified in ${verifyTime}ms`);

        return {
          valid: result.valid,
          subscriptionId: result.subscriptionId,
          expiresDate: result.expiresDate ? new Date(result.expiresDate).getTime() : undefined,
          error: result.error,
        };
      } else if (platform === 'google') {
        if (!purchaseToken) {
          throw new Error('Purchase token required for Google verification');
        }

        const response = await fetch(
          `${process.env['EXPO_PUBLIC_SUPABASE_URL']}/functions/v1/verify-google-receipt`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY']}`,
            },
            body: JSON.stringify({
              packageName: 'com.being.app', // TODO: Make configurable
              subscriptionId: receiptData, // For Google, this is the product ID
              purchaseToken,
              userId: status.userId,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Receipt verification failed: ${response.status}`);
        }

        const result = await response.json();
        const verifyTime = performance.now() - startTime;
        console.log(`[IAP] Receipt verified in ${verifyTime}ms`);

        return {
          valid: result.valid,
          subscriptionId: result.subscriptionId,
          expiresDate: result.expiresDate ? new Date(result.expiresDate).getTime() : undefined,
          error: result.error,
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
