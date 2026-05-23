/**
 * SUBSCRIPTION TYPES
 * TypeScript types for Apple/Google IAP subscription management
 *
 * SUBSCRIPTION MODEL:
 * - IAP-only (Apple StoreKit / Google Play Billing)
 * - No Stripe/BAA required
 * - Server-side receipt verification
 * - Crisis features always accessible
 *
 * COMPLIANCE REQUIREMENTS:
 * - PCI DSS: N/A (Apple/Google handle payment data)
 * - Privacy: Subscription metadata stored with encrypted health data
 * - Subscription status correlation with PHI = treat as PHI
 * - No payment data stored locally
 *
 * SECURITY:
 * - Receipt verification via platform APIs
 * - No client-side trust (server validates)
 * - Opaque subscription identifiers only
 * - Crisis features never gated by subscription
 *
 * PERFORMANCE:
 * - Subscription check: <100ms (non-blocking)
 * - Receipt verification: <2s (background)
 * - Crisis feature access: 0ms (hardcoded, no check)
 */

/**
 * Subscription Platform
 */
export type SubscriptionPlatform = 'apple' | 'google' | 'none';

/**
 * Subscription Status
 * Lifecycle states for subscription management
 */
export type SubscriptionStatus =
  | 'trial'           // Free trial period (21-28 days)
  | 'active'          // Paid subscription active
  | 'grace'           // Payment failed, grace period (7 days)
  | 'expired'         // Subscription lapsed, non-crisis features locked
  | 'crisis_only';    // Permanent state for users who never subscribe

/**
 * Subscription Tier
 * Currently single tier, future-proofed for multiple tiers
 */
export type SubscriptionTier = 'standard';

/**
 * Subscription Interval
 */
export type SubscriptionInterval = 'monthly' | 'yearly';

/**
 * Subscription Product IDs (Apple/Google)
 */
export interface SubscriptionProductIds {
  apple: {
    monthly: string;  // e.g., 'com.being.subscription.monthly'
    yearly: string;   // e.g., 'com.being.subscription.yearly'
  };
  google: {
    monthly: string;  // e.g., 'subscription_monthly'
    yearly: string;   // e.g., 'subscription_yearly'
  };
}

/**
 * Subscription Metadata
 * Stored in Supabase alongside encrypted health data
 * Privacy: Treat as PHI due to correlation with mental health data
 */
export interface SubscriptionMetadata {
  // Subscription Identity
  id: string;                          // Unique subscription ID
  userId: string;                      // Supabase user ID (anon auth)

  // Platform Data
  platform: SubscriptionPlatform;      // apple | google | none
  platformSubscriptionId: string;      // Opaque reference to Apple/Google subscription
  platformCustomerId?: string;         // Apple/Google customer ID (if available)

  // Subscription Details
  status: SubscriptionStatus;          // Current subscription state
  tier: SubscriptionTier;              // Subscription tier
  interval: SubscriptionInterval;      // monthly | yearly

  // Pricing (for display only, NOT authoritative)
  priceUsd: number;                    // e.g., 10.00 (monthly), 79.99 (yearly)
  currency: string;                    // e.g., 'USD'

  // Timing
  trialStartDate: number | null;       // Timestamp of trial start
  trialEndDate: number | null;         // Timestamp of trial end
  subscriptionStartDate: number | null; // Timestamp of paid subscription start
  subscriptionEndDate: number | null;  // Timestamp when subscription ends (for billing cycle)
  gracePeriodEnd: number | null;       // Timestamp when grace period ends (7 days after payment failure)

  // Receipt Verification (last known)
  lastReceiptVerified: number | null;  // Timestamp of last successful receipt verification
  receiptData: string | null;          // Encrypted receipt data (for re-verification)

  // Payment History (minimal, for reference only)
  lastPaymentDate: number | null;      // Timestamp of last successful payment
  paymentFailureCount: number;         // Count of consecutive payment failures

  // Feature Access
  crisisAccessEnabled: true;           // ALWAYS true, hardcoded (never gated)

  // Timestamps
  createdAt: number;
  updatedAt: number;
}

/**
 * Subscription Receipt (Apple)
 * From Apple's verifyReceipt API
 */
export interface AppleReceipt {
  receiptData: string;                 // Base64 encoded receipt
  environment: 'Sandbox' | 'Production';
  status: number;                      // 0 = valid, non-zero = error codes
  latestReceiptInfo?: Array<{
    productId: string;
    transactionId: string;
    originalTransactionId: string;
    purchaseDate: string;
    expiresDate: string;
    cancellationDate?: string;
  }>;
}

/**
 * Subscription Receipt (Google)
 * From Google Play Billing API
 */
export interface GoogleReceipt {
  packageName: string;
  subscriptionId: string;
  purchaseToken: string;
  startTimeMillis: number;
  expiryTimeMillis: number;
  autoRenewing: boolean;
  cancelReason?: number;
  orderId: string;
}

/**
 * Subscription Feature Access
 * Determines what features user can access based on subscription status
 */
export interface FeatureAccess {
  // Crisis Features (ALWAYS accessible, regardless of subscription)
  crisisButton: true;                  // ALWAYS true (hardcoded)
  crisisContacts: true;                // ALWAYS true
  safetyPlan: true;                    // ALWAYS true
  nineEightEightAccess: true;          // ALWAYS true

  // Non-Crisis Features (gated by subscription status)
  checkIns: boolean;                   // Mood check-ins
  breathingExercises: boolean;         // Full breathing library
  therapeuticContent: boolean;         // educational exercises
  progressInsights: boolean;           // Charts, trends, analytics
  assessments: boolean;                // PHQ-9/GAD-7 (initial assessment always free)
}

/**
 * Subscription Event
 * For analytics and audit logging
 */
export interface SubscriptionEvent {
  id: string;
  userId: string;
  eventType: SubscriptionEventType;
  timestamp: number;
  metadata: Record<string, any>;
}

/**
 * Subscription Event Types
 */
export type SubscriptionEventType =
  | 'trial_started'
  | 'trial_ending_soon'             // 3 days before trial ends
  | 'trial_ended'
  | 'subscription_started'
  | 'subscription_renewed'
  | 'subscription_cancelled'
  | 'payment_failed'
  | 'grace_period_started'
  | 'grace_period_ending'           // 2 days before grace ends
  | 'subscription_expired'
  | 'subscription_restored'         // User restored purchases
  | 'receipt_verification_failed';

/**
 * Subscription Store (Zustand)
 * Interface definition for subscription state management
 */
export interface SubscriptionStore {
  // State
  subscription: SubscriptionMetadata | null;
  featureAccess: FeatureAccess | null;
  isLoading: boolean;
  isVerifyingReceipt: boolean;
  error: string | null;

  // Core Actions
  loadSubscription: () => Promise<void>;
  createTrial: () => Promise<void>;
  updateSubscriptionStatus: (status: SubscriptionStatus) => Promise<void>;

  // Purchase Actions
  purchaseSubscription: (interval: SubscriptionInterval) => Promise<void>;
  restorePurchases: () => Promise<void>;
  cancelSubscription: () => Promise<void>;

  // Receipt Verification
  verifyReceipt: () => Promise<boolean>;

  // Feature Access
  checkFeatureAccess: (feature: keyof FeatureAccess) => boolean;
  getCrisisAccessStatus: () => true;  // ALWAYS returns true

  // Grace Period Management
  enterGracePeriod: () => Promise<void>;
  exitGracePeriod: () => Promise<void>;

  // Utility
  getTrialDaysRemaining: () => number | null;
  getGraceDaysRemaining: () => number | null;
  isTrialActive: () => boolean;
  isSubscriptionActive: () => boolean;

  // Analytics
  trackSubscriptionEvent: (eventType: SubscriptionEventType, metadata?: Record<string, any>) => Promise<void>;
}

/**
 * Subscription Service Configuration
 */
export interface SubscriptionServiceConfig {
  // Product IDs
  products: SubscriptionProductIds;

  // Trial Configuration
  trialDurationDays: number;           // Default: 28 days
  trialReminderDays: number;           // Default: 3 days before end

  // Grace Period Configuration
  gracePeriodDays: number;             // Default: 7 days
  graceReminderDays: number;           // Default: 2 days before end

  // Receipt Verification
  receiptVerificationIntervalMs: number;  // Default: 24 hours
  receiptVerificationRetries: number;     // Default: 3

  // Performance Constraints
  maxSubscriptionCheckMs: number;      // Default: 100ms
  maxReceiptVerificationMs: number;    // Default: 2000ms

  // Feature Flags
  enableTrialExtension: boolean;       // Allow extending trial (customer support)
  enableGracePeriod: boolean;          // Enable 7-day grace period
  enableOfflineMode: boolean;          // Cache subscription status for offline access
}

/**
 * Default Subscription Configuration
 */
export const DEFAULT_SUBSCRIPTION_CONFIG: SubscriptionServiceConfig = {
  products: {
    apple: {
      monthly: 'com.being.subscription.monthly',
      yearly: 'com.being.subscription.yearly'
    },
    google: {
      monthly: 'subscription_monthly',
      yearly: 'subscription_yearly'
    }
  },
  trialDurationDays: 28,
  trialReminderDays: 3,
  gracePeriodDays: 7,
  graceReminderDays: 2,
  receiptVerificationIntervalMs: 24 * 60 * 60 * 1000, // 24 hours
  receiptVerificationRetries: 3,
  maxSubscriptionCheckMs: 100,
  maxReceiptVerificationMs: 2000,
  enableTrialExtension: false,
  enableGracePeriod: true,
  enableOfflineMode: true
};

/**
 * Subscription Pricing
 */
export const SUBSCRIPTION_PRICING = {
  monthly: {
    usd: 10.00,
    label: '$10/month'
  },
  yearly: {
    usd: 79.99,
    label: '$79.99/year',
    savingsLabel: 'Save 33%'
  }
} as const;

/**
 * Crisis Feature List (ALWAYS accessible)
 */
export const CRISIS_FEATURES = [
  'crisisButton',
  'crisisContacts',
  'safetyPlan',
  'nineEightEightAccess'
] as const;

/**
 * Feature Access Helper
 * Determines feature access based on subscription status
 */
export function calculateFeatureAccess(status: SubscriptionStatus): FeatureAccess {
  // Crisis features: ALWAYS accessible (hardcoded true)
  const crisisAccess = {
    crisisButton: true as const,
    crisisContacts: true as const,
    safetyPlan: true as const,
    nineEightEightAccess: true as const
  };

  // Non-crisis features: Depend on subscription status
  const hasAccess = status === 'trial' || status === 'active' || status === 'grace';

  return {
    ...crisisAccess,
    checkIns: hasAccess,
    breathingExercises: hasAccess,
    therapeuticContent: hasAccess,
    progressInsights: hasAccess,
    assessments: hasAccess
  };
}

/**
 * Subscription Status Display
 * User-friendly labels for subscription states
 */
export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trial: 'Free Trial',
  active: 'Active Subscription',
  grace: 'Payment Issue',
  expired: 'Subscription Ended',
  crisis_only: 'Crisis Support Available'
};

/**
 * Subscription Type Validators
 */
export function isValidSubscriptionStatus(status: any): status is SubscriptionStatus {
  return ['trial', 'active', 'grace', 'expired', 'crisis_only'].includes(status);
}

export function isValidSubscriptionInterval(interval: any): interval is SubscriptionInterval {
  return ['monthly', 'yearly'].includes(interval);
}

export function isValidSubscriptionPlatform(platform: any): platform is SubscriptionPlatform {
  return ['apple', 'google', 'none'].includes(platform);
}
