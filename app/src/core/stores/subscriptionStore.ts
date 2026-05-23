/**
 * SUBSCRIPTION STORE
 * Zustand store for Apple/Google IAP subscription management
 *
 * SUBSCRIPTION STRATEGY:
 * - IAP-only (no Stripe/BAA required)
 * - Server-side receipt verification via Supabase Edge Functions
 * - Offline-first with local cache
 * - Crisis features ALWAYS accessible (hardcoded, never gated)
 *
 * COMPLIANCE:
 * - PCI DSS: N/A (Apple/Google handle payment data)
 * - Privacy: Subscription metadata stored with encrypted health data
 * - Treat subscription status as PHI (correlation with mental health data)
 * - No payment data stored locally
 *
 * SECURITY:
 * - Receipt verification server-side only
 * - No client-side price/product ID trust
 * - Opaque subscription identifiers
 * - Crisis access guarantee (never disabled)
 *
 * PERFORMANCE:
 * - Subscription check: <100ms (cached)
 * - Receipt verification: <2s (background)
 * - Crisis feature access: 0ms (hardcoded true, no check)
 */

import { create } from 'zustand';
import { generateInternalId } from '@/core/utils/id';
import * as SecureStore from 'expo-secure-store';
import {
  SubscriptionStore,
  SubscriptionMetadata,
  SubscriptionStatus,
  SubscriptionInterval,
  FeatureAccess,
  SubscriptionEventType,
  calculateFeatureAccess,
  DEFAULT_SUBSCRIPTION_CONFIG,
  CRISIS_FEATURES
} from '@/core/types/subscription';
import AuthenticationService from '@/core/services/security/AuthenticationService';

const STORAGE_KEY = 'subscription_metadata_v1';
const SECURE_STORAGE_KEY = 'subscription_secure_v1';

/**
 * Generate unique ID
 */
function generateId(): string {
  return generateInternalId();
}

/**
 * Get current user ID from auth service
 * Falls back to anonymous user if not authenticated
 */
function getCurrentUserId(): string {
  const authUser = AuthenticationService.getCurrentUser();
  if (authUser?.userId) {
    return authUser.userId;
  }
  // Fallback to anonymous user for trials/unauthenticated access
  return `anonymous_${Date.now()}`;
}

/**
 * Calculate days remaining from timestamp
 */
function daysRemaining(endTimestamp: number | null): number | null {
  if (!endTimestamp) return null;
  const now = Date.now();
  const diff = endTimestamp - now;
  if (diff <= 0) return 0;
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

/**
 * Create default subscription metadata (trial state)
 */
function createTrialSubscription(userId: string): SubscriptionMetadata {
  const now = Date.now();
  const trialDurationMs = DEFAULT_SUBSCRIPTION_CONFIG.trialDurationDays * 24 * 60 * 60 * 1000;

  return {
    id: generateId(),
    userId,
    platform: 'none',
    platformSubscriptionId: '',
    status: 'trial',
    tier: 'standard',
    interval: 'monthly',
    priceUsd: 0,
    currency: 'USD',
    trialStartDate: now,
    trialEndDate: now + trialDurationMs,
    subscriptionStartDate: null,
    subscriptionEndDate: null,
    gracePeriodEnd: null,
    lastReceiptVerified: null,
    receiptData: null,
    lastPaymentDate: null,
    paymentFailureCount: 0,
    crisisAccessEnabled: true, // ALWAYS true
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Simple logger (placeholder for future logging service)
 */
const logger = {
  info: (message: string, meta?: any) => {
    if (__DEV__) {
      console.log(`[Subscription] ${message}`, meta);
    }
  },
  error: (message: string, meta?: any) => {
    console.error(`[Subscription Error] ${message}`, meta);
  },
  performance: (message: string, timeMs: number) => {
    if (__DEV__) {
      console.log(`[Subscription Performance] ${message}: ${timeMs}ms`);
    }
  }
};

/**
 * Subscription Zustand Store
 */
export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  subscription: null,
  featureAccess: null,
  isLoading: false,
  isVerifyingReceipt: false,
  error: null,

  /**
   * Load subscription from secure storage
   */
  loadSubscription: async () => {
    const startTime = performance.now();
    set({ isLoading: true, error: null });

    try {
      // Try to load from secure storage
      const secureData = await SecureStore.getItemAsync(SECURE_STORAGE_KEY);

      if (secureData) {
        const subscription = JSON.parse(secureData) as SubscriptionMetadata;
        const featureAccess = calculateFeatureAccess(subscription.status);

        set({
          subscription,
          featureAccess,
          isLoading: false
        });

        const loadTime = performance.now() - startTime;
        logger.performance('Subscription loaded', loadTime);

        return;
      }

      // No subscription exists yet
      set({ subscription: null, featureAccess: null, isLoading: false });
    } catch (error) {
      logger.error('Failed to load subscription', { error });
      set({ error: 'Failed to load subscription', isLoading: false });
    }
  },

  /**
   * Create trial subscription
   */
  createTrial: async () => {
    set({ isLoading: true, error: null });

    try {
      // Get current user ID from auth service
      const userId = getCurrentUserId();

      const subscription = createTrialSubscription(userId);
      const featureAccess = calculateFeatureAccess(subscription.status);

      // Save to secure storage
      await SecureStore.setItemAsync(SECURE_STORAGE_KEY, JSON.stringify(subscription));

      set({
        subscription,
        featureAccess,
        isLoading: false
      });

      // Track event
      await get().trackSubscriptionEvent('trial_started');

      logger.info('Trial subscription created', { subscriptionId: subscription.id });
    } catch (error) {
      logger.error('Failed to create trial', { error });
      set({ error: 'Failed to create trial', isLoading: false });
    }
  },

  /**
   * Update subscription status
   */
  updateSubscriptionStatus: async (status: SubscriptionStatus) => {
    const { subscription } = get();
    if (!subscription) {
      set({ error: 'No subscription to update' });
      return;
    }

    try {
      const updatedSubscription: SubscriptionMetadata = {
        ...subscription,
        status,
        updatedAt: Date.now()
      };

      const featureAccess = calculateFeatureAccess(status);

      // Save to secure storage
      await SecureStore.setItemAsync(SECURE_STORAGE_KEY, JSON.stringify(updatedSubscription));

      set({
        subscription: updatedSubscription,
        featureAccess
      });

      logger.info('Subscription status updated', { status });
    } catch (error) {
      logger.error('Failed to update subscription status', { error });
      set({ error: 'Failed to update subscription status' });
    }
  },

  /**
   * Purchase subscription
   * Initiates IAP flow (Apple/Google)
   */
  purchaseSubscription: async (interval: SubscriptionInterval) => {
    set({ isLoading: true, error: null });

    try {
      logger.info('Initiating purchase flow', { interval });

      // Import IAPService dynamically to avoid circular dependency
      const { IAPService } = await import('@/core/services/subscription/IAPService');

      // 1. Initiate platform IAP purchase
      const purchase = await IAPService.purchaseSubscription(interval);

      if (!purchase) {
        throw new Error('Purchase was cancelled or failed');
      }

      // 2. Verify receipt server-side
      const platform = IAPService.getPlatform();

      if (platform === 'none') {
        throw new Error('IAP not available on this platform');
      }

      const receiptData = purchase.transactionReceipt || '';
      const purchaseToken = purchase.purchaseToken;

      logger.info('Verifying receipt', { platform, hasReceipt: !!receiptData });

      const verification = await IAPService.verifyReceipt(
        receiptData,
        platform,
        purchaseToken
      );

      if (!verification.valid) {
        throw new Error(verification.error || 'Receipt verification failed');
      }

      // 3. Update subscription metadata
      const { subscription } = get();
      const now = Date.now();

      const updatedSubscription: SubscriptionMetadata = {
        ...(subscription || {
          id: generateId(),
          userId: getCurrentUserId(),
          crisisAccessEnabled: true,
          createdAt: now,
        }),
        platform,
        platformSubscriptionId: verification.subscriptionId || purchase.orderId,
        status: 'active',
        tier: 'standard',
        interval,
        priceUsd: interval === 'yearly' ? 79.99 : 7.99, // Default prices, should come from product
        currency: 'USD',
        trialStartDate: null,
        trialEndDate: null,
        subscriptionStartDate: now,
        subscriptionEndDate: verification.expiresDate || null,
        gracePeriodEnd: null,
        lastReceiptVerified: now,
        receiptData,
        lastPaymentDate: now,
        paymentFailureCount: 0,
        updatedAt: now,
      } as SubscriptionMetadata;

      const featureAccess = calculateFeatureAccess('active');

      // Save to secure storage
      await SecureStore.setItemAsync(SECURE_STORAGE_KEY, JSON.stringify(updatedSubscription));

      set({
        subscription: updatedSubscription,
        featureAccess,
        isLoading: false
      });

      // 4. Finish transaction (acknowledge with platform)
      await IAPService.finishTransaction(purchase);

      // 5. Track event
      await get().trackSubscriptionEvent('subscription_started', {
        interval,
        platform,
        subscriptionId: verification.subscriptionId
      });

      logger.info('Purchase completed successfully', { subscriptionId: verification.subscriptionId });
    } catch (error) {
      logger.error('Purchase failed', { error });
      set({ error: 'Purchase failed', isLoading: false });
      throw error; // Re-throw so UI can handle it
    }
  },

  /**
   * Restore purchases
   * For users who subscribed on different device
   */
  restorePurchases: async () => {
    set({ isLoading: true, error: null });

    try {
      logger.info('Restoring purchases');

      // TODO: Implement restore purchases
      // 1. Call platform IAP restore API
      // 2. Get all active subscriptions
      // 3. Verify receipts server-side
      // 4. Update subscription metadata

      throw new Error('Restore purchases not yet implemented');
    } catch (error) {
      logger.error('Restore purchases failed', { error });
      set({ error: 'Failed to restore purchases', isLoading: false });
    }
  },

  /**
   * Cancel subscription
   * Redirects to platform subscription management
   */
  cancelSubscription: async () => {
    try {
      logger.info('Cancellation requested');

      // TODO: Implement cancellation
      // For iOS/Android: Open system subscription management
      // User cancels through App Store/Play Store settings

      throw new Error('Cancellation not yet implemented');
    } catch (error) {
      logger.error('Cancellation failed', { error });
      set({ error: 'Failed to cancel subscription' });
    }
  },

  /**
   * Verify receipt with platform API
   * Called periodically (every 24 hours) to check subscription status
   */
  verifyReceipt: async (): Promise<boolean> => {
    const { subscription } = get();
    if (!subscription || !subscription.receiptData) {
      return false;
    }

    set({ isVerifyingReceipt: true });

    try {
      logger.info('Verifying receipt');

      // TODO: Implement receipt verification
      // 1. Send receipt to Supabase Edge Function
      // 2. Edge Function calls Apple/Google verification API
      // 3. Parse response
      // 4. Update subscription metadata

      // For now, mock success
      set({ isVerifyingReceipt: false });
      return true;
    } catch (error) {
      logger.error('Receipt verification failed', { error });
      set({ isVerifyingReceipt: false });
      return false;
    }
  },

  /**
   * Check feature access
   * CRITICAL: Crisis features ALWAYS return true (hardcoded)
   */
  checkFeatureAccess: (feature: keyof FeatureAccess): boolean => {
    // CRISIS ACCESS GUARANTEE: Hardcoded to always return true
    if (CRISIS_FEATURES.includes(feature as any)) {
      return true;
    }

    const { featureAccess } = get();
    if (!featureAccess) {
      // No subscription loaded: Allow crisis features, block others
      return CRISIS_FEATURES.includes(feature as any);
    }

    return featureAccess[feature];
  },

  /**
   * Get crisis access status
   * CRITICAL: ALWAYS returns true (crisis access guarantee)
   */
  getCrisisAccessStatus: (): true => {
    // Hardcoded: Crisis features are NEVER gated
    return true;
  },

  /**
   * Enter grace period
   * Called when payment fails
   */
  enterGracePeriod: async () => {
    const { subscription } = get();
    if (!subscription) return;

    try {
      const now = Date.now();
      const gracePeriodMs = DEFAULT_SUBSCRIPTION_CONFIG.gracePeriodDays * 24 * 60 * 60 * 1000;

      const updatedSubscription: SubscriptionMetadata = {
        ...subscription,
        status: 'grace',
        gracePeriodEnd: now + gracePeriodMs,
        paymentFailureCount: subscription.paymentFailureCount + 1,
        updatedAt: now
      };

      const featureAccess = calculateFeatureAccess('grace');

      await SecureStore.setItemAsync(SECURE_STORAGE_KEY, JSON.stringify(updatedSubscription));

      set({
        subscription: updatedSubscription,
        featureAccess
      });

      // Track event
      await get().trackSubscriptionEvent('grace_period_started');

      logger.info('Grace period started', { gracePeriodEnd: updatedSubscription.gracePeriodEnd });
    } catch (error) {
      logger.error('Failed to enter grace period', { error });
      set({ error: 'Failed to enter grace period' });
    }
  },

  /**
   * Exit grace period
   * Called when payment succeeds or grace period expires
   */
  exitGracePeriod: async () => {
    const { subscription } = get();
    if (!subscription) return;

    try {
      const updatedSubscription: SubscriptionMetadata = {
        ...subscription,
        status: 'active',
        gracePeriodEnd: null,
        paymentFailureCount: 0,
        lastPaymentDate: Date.now(),
        updatedAt: Date.now()
      };

      const featureAccess = calculateFeatureAccess('active');

      await SecureStore.setItemAsync(SECURE_STORAGE_KEY, JSON.stringify(updatedSubscription));

      set({
        subscription: updatedSubscription,
        featureAccess
      });

      logger.info('Grace period exited', { status: 'active' });
    } catch (error) {
      logger.error('Failed to exit grace period', { error });
      set({ error: 'Failed to exit grace period' });
    }
  },

  /**
   * Get trial days remaining
   */
  getTrialDaysRemaining: (): number | null => {
    const { subscription } = get();
    if (!subscription || subscription.status !== 'trial') return null;
    return daysRemaining(subscription.trialEndDate);
  },

  /**
   * Get grace period days remaining
   */
  getGraceDaysRemaining: (): number | null => {
    const { subscription } = get();
    if (!subscription || subscription.status !== 'grace') return null;
    return daysRemaining(subscription.gracePeriodEnd);
  },

  /**
   * Check if trial is active
   */
  isTrialActive: (): boolean => {
    const { subscription } = get();
    return subscription?.status === 'trial';
  },

  /**
   * Check if subscription is active
   */
  isSubscriptionActive: (): boolean => {
    const { subscription } = get();
    return subscription?.status === 'active' || subscription?.status === 'grace';
  },

  /**
   * Track subscription event
   * For analytics and audit logging
   */
  trackSubscriptionEvent: async (eventType: SubscriptionEventType, metadata?: Record<string, any>) => {
    const { subscription } = get();

    try {
      const event = {
        id: generateId(),
        userId: subscription?.userId || 'unknown',
        eventType,
        timestamp: Date.now(),
        metadata: metadata || {}
      };

      // TODO: Send to analytics service
      logger.info('Subscription event tracked', { eventType });
    } catch (error) {
      logger.error('Failed to track event', { error, eventType });
    }
  }
}));

/**
 * Subscription Store Hooks (convenience)
 */
export const useSubscription = () => useSubscriptionStore((state) => state.subscription);
export const useFeatureAccess = () => useSubscriptionStore((state) => state.featureAccess);
export const useSubscriptionStatus = () => useSubscriptionStore((state) => state.subscription?.status);
export const useIsTrialActive = () => useSubscriptionStore((state) => state.isTrialActive());
export const useIsSubscriptionActive = () => useSubscriptionStore((state) => state.isSubscriptionActive());
export const useCrisisAccessStatus = () => useSubscriptionStore((state) => state.getCrisisAccessStatus());
