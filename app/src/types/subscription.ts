/**
 * Subscription Logic and Feature Gate Types
 * Day 17 Phase 4: TypeScript integration for subscription system
 *
 * Comprehensive type definitions for:
 * - Subscription state management with trial logic
 * - Feature gate system with subscription validation
 * - Crisis-safe subscription access guarantees
 * - Performance monitoring types
 * - Error handling with therapeutic messaging
 */

import { z } from 'zod';
import type {
  SubscriptionStatus,
  SubscriptionResult,
  SubscriptionPlan
} from './payment';

/**
 * Subscription Tier Types with Therapeutic Language
 */
export const SubscriptionTierSchema = z.enum([
  'free',        // 'Finding Your Path' - Basic mindfulness tools
  'premium',     // 'Deepening Practice' - Enhanced features
  'family',      // 'Shared Journey' - Family/couple features
  'enterprise'   // 'Guided Together' - Group/organization features
]);

export type SubscriptionTier = z.infer<typeof SubscriptionTierSchema>;

/**
 * Trial State Management Types
 */
export const TrialStateSchema = z.object({
  isActive: z.boolean(),
  daysRemaining: z.number().min(0),
  originalDuration: z.number().positive(),
  startDate: z.string(), // ISO date
  endDate: z.string(),   // ISO date
  extendedForCrisis: z.boolean(),
  crisisExtensionDays: z.number().min(0).default(0),
  gracePeriodActive: z.boolean().default(false),
  gracePeriodEndDate: z.string().optional()
});

export type TrialState = z.infer<typeof TrialStateSchema>;

/**
 * Subscription State with Trial Management
 */
export const SubscriptionStateSchema = z.object({
  // Core subscription data
  tier: SubscriptionTierSchema,
  status: z.enum([
    'active',
    'trialing',
    'past_due',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'unpaid',
    'paused'
  ]),

  // Trial management
  trial: TrialStateSchema.optional(),

  // Subscription details
  subscriptionId: z.string().optional(),
  customerId: z.string().optional(),
  planId: z.string().optional(),

  // Billing cycle
  currentPeriodStart: z.string().optional(), // ISO date
  currentPeriodEnd: z.string().optional(),   // ISO date
  cancelAtPeriodEnd: z.boolean().default(false),

  // Payment status
  lastPaymentDate: z.string().optional(),
  nextPaymentDate: z.string().optional(),
  paymentMethodValid: z.boolean().default(false),

  // Crisis management
  crisisAccessGuaranteed: z.boolean().default(true),
  crisisFeatureOverrides: z.array(z.string()).default([]),

  // Performance tracking
  lastValidated: z.string(), // ISO timestamp
  validationLatency: z.number().default(0) // ms
});

export type SubscriptionState = z.infer<typeof SubscriptionStateSchema>;

/**
 * Feature Gate Configuration Types
 */
export const FeatureGateConfigSchema = z.object({
  featureKey: z.string(),
  displayName: z.string(),
  description: z.string(),
  category: z.enum(['core', 'premium', 'family', 'enterprise', 'beta']),

  // Subscription requirements
  requiredTier: SubscriptionTierSchema,
  requiredStatus: z.array(z.string()).default(['active', 'trialing']),

  // Trial behavior
  availableInTrial: z.boolean().default(true),
  trialLimitationMessage: z.string().optional(),

  // Crisis safety
  crisisSafe: z.boolean(), // Always accessible during crisis
  crisisMessage: z.string().optional(),

  // Performance requirements
  maxValidationLatency: z.number().default(100), // ms

  // Graceful degradation
  fallbackBehavior: z.enum([
    'hide',           // Hide feature completely
    'disable',        // Show as disabled
    'redirect',       // Redirect to upgrade
    'limited',        // Show limited version
    'educational'     // Show what feature would do
  ]).default('redirect'),

  // Messaging
  upgradeMessage: z.string(),
  educationalContent: z.string().optional(),
  therapeuticGuidance: z.string().optional()
});

export type FeatureGateConfig = z.infer<typeof FeatureGateConfigSchema>;

/**
 * Feature Access Result Types
 */
export const FeatureAccessResultSchema = z.object({
  // Access status
  hasAccess: z.boolean(),
  reason: z.enum([
    'granted',              // Full access granted
    'trial_access',         // Access via trial
    'crisis_override',      // Crisis safety override
    'tier_insufficient',    // Subscription tier too low
    'status_invalid',       // Subscription status invalid
    'trial_expired',        // Trial period ended
    'payment_failed',       // Payment issues
    'grace_period',         // Grace period access
    'feature_disabled',     // Feature temporarily disabled
    'validation_timeout'    // Performance validation failed
  ]),

  // User messaging
  userMessage: z.string(),
  actionLabel: z.string().optional(),
  actionRoute: z.string().optional(),

  // Trial information
  trialInfo: z.object({
    isInTrial: z.boolean(),
    daysRemaining: z.number(),
    canExtend: z.boolean(),
    extensionAvailable: z.boolean()
  }).optional(),

  // Upgrade information
  upgradeInfo: z.object({
    recommendedTier: SubscriptionTierSchema,
    monthlyPrice: z.number(),
    annualPrice: z.number(),
    savings: z.number(),
    features: z.array(z.string())
  }).optional(),

  // Performance metrics
  validationTime: z.number(), // ms
  cacheHit: z.boolean(),

  // Crisis context
  crisisMode: z.boolean(),
  crisisOverrideActive: z.boolean()
});

export type FeatureAccessResult = z.infer<typeof FeatureAccessResultSchema>;

/**
 * Subscription Validation Performance Types
 */
export const SubscriptionPerformanceMetricsSchema = z.object({
  // Timing metrics
  validationLatency: z.object({
    avg: z.number(),
    p50: z.number(),
    p95: z.number(),
    p99: z.number(),
    max: z.number()
  }),

  // Crisis response times
  crisisResponseTime: z.object({
    avg: z.number(),
    max: z.number(),
    violations: z.number(), // Count of >200ms responses
    lastViolation: z.string().optional() // ISO timestamp
  }),

  // Cache performance
  cacheMetrics: z.object({
    hitRate: z.number(), // 0-1
    missRate: z.number(),
    invalidationRate: z.number(),
    averageSize: z.number() // bytes
  }),

  // Error rates
  errorMetrics: z.object({
    validationErrors: z.number(),
    timeoutErrors: z.number(),
    networkErrors: z.number(),
    totalErrors: z.number(),
    errorRate: z.number() // 0-1
  }),

  // Usage patterns
  usageMetrics: z.object({
    totalValidations: z.number(),
    uniqueFeatures: z.number(),
    peakValidationsPerSecond: z.number(),
    averageValidationsPerUser: z.number()
  }),

  // Time period
  periodStart: z.string(), // ISO timestamp
  periodEnd: z.string(),   // ISO timestamp
  sampleCount: z.number()
});

export type SubscriptionPerformanceMetrics = z.infer<typeof SubscriptionPerformanceMetricsSchema>;

/**
 * Feature Gate Wrapper Component Props
 */
export const FeatureGateWrapperPropsSchema = z.object({
  // Feature identification
  featureKey: z.string(),

  // Render behavior
  fallback: z.any().optional(), // ReactNode for fallback UI
  loadingComponent: z.any().optional(), // ReactNode for loading state
  errorComponent: z.any().optional(),   // ReactNode for error state

  // Performance requirements
  maxValidationTime: z.number().default(100), // ms
  cacheValidation: z.boolean().default(true),

  // Crisis behavior
  allowCrisisOverride: z.boolean().default(true),
  crisisComponent: z.any().optional(), // ReactNode for crisis state

  // Analytics
  trackAccess: z.boolean().default(true),
  trackDenial: z.boolean().default(true),

  // Children
  children: z.any() // ReactNode
});

export type FeatureGateWrapperProps = z.infer<typeof FeatureGateWrapperPropsSchema>;

/**
 * Trial Management Types
 */
export const TrialManagementSchema = z.object({
  // Current trial status
  current: TrialStateSchema.optional(),

  // Trial history
  history: z.array(z.object({
    startDate: z.string(),
    endDate: z.string(),
    duration: z.number(),
    tier: SubscriptionTierSchema,
    completedNormally: z.boolean(),
    crisisExtended: z.boolean(),
    conversionOutcome: z.enum(['converted', 'expired', 'canceled', 'extended']).optional()
  })),

  // Eligibility
  eligibility: z.object({
    canStartTrial: z.boolean(),
    reasonIfNot: z.string().optional(),
    availableTrialDays: z.number().default(7),
    maxExtensions: z.number().default(2),
    extensionsUsed: z.number().default(0)
  }),

  // Crisis extensions
  crisisExtensions: z.object({
    available: z.boolean(),
    maxDays: z.number().default(14),
    daysUsed: z.number().default(0),
    lastExtensionDate: z.string().optional(),
    autoExtendInCrisis: z.boolean().default(true)
  }),

  // Conversion tracking
  conversionMetrics: z.object({
    daysToConversion: z.number().optional(),
    featuresUsed: z.array(z.string()),
    engagementScore: z.number().min(0).max(1),
    likelihoodToConvert: z.number().min(0).max(1)
  })
});

export type TrialManagement = z.infer<typeof TrialManagementSchema>;

/**
 * Subscription Error Types with Therapeutic Messaging
 */
export const SubscriptionErrorSchema = z.object({
  code: z.enum([
    'SUBSCRIPTION_EXPIRED',
    'PAYMENT_FAILED',
    'TIER_INSUFFICIENT',
    'TRIAL_EXPIRED',
    'VALIDATION_TIMEOUT',
    'NETWORK_ERROR',
    'CRISIS_OVERRIDE_NEEDED',
    'FEATURE_DISABLED',
    'UPGRADE_REQUIRED',
    'GRACE_PERIOD_ENDED'
  ]),

  // User-facing messages
  title: z.string(),
  message: z.string(),
  therapeuticGuidance: z.string().optional(),

  // Action options
  primaryAction: z.object({
    label: z.string(),
    action: z.enum([
      'upgrade',
      'retry_payment',
      'extend_trial',
      'contact_support',
      'continue_free',
      'crisis_override',
      'try_again'
    ]),
    route: z.string().optional(),
    parameters: z.record(z.any()).optional()
  }),

  secondaryAction: z.object({
    label: z.string(),
    action: z.enum([
      'continue_free',
      'learn_more',
      'contact_support',
      'dismiss',
      'crisis_mode'
    ]),
    route: z.string().optional()
  }).optional(),

  // Error context
  errorContext: z.object({
    featureKey: z.string().optional(),
    subscriptionId: z.string().optional(),
    userId: z.string().optional(),
    timestamp: z.string(),
    crisisMode: z.boolean(),
    retryable: z.boolean(),
    urgency: z.enum(['low', 'medium', 'high', 'critical'])
  }),

  // Recovery information
  recovery: z.object({
    canRecover: z.boolean(),
    estimatedRecoveryTime: z.number().optional(), // minutes
    automaticRetry: z.boolean(),
    maxRetries: z.number(),
    currentRetries: z.number()
  })
});

export type SubscriptionError = z.infer<typeof SubscriptionErrorSchema>;

/**
 * Subscription Store Actions
 */
export interface SubscriptionStoreActions {
  // Core subscription management
  initializeSubscription: () => Promise<void>;
  validateSubscription: (forceRefresh?: boolean) => Promise<SubscriptionState>;
  updateSubscriptionState: (updates: Partial<SubscriptionState>) => void;

  // Feature gate validation
  validateFeatureAccess: (featureKey: string) => Promise<FeatureAccessResult>;
  checkMultipleFeatures: (featureKeys: string[]) => Promise<Record<string, FeatureAccessResult>>;

  // Trial management
  startTrial: (tier: SubscriptionTier, days?: number) => Promise<TrialState>;
  extendTrial: (additionalDays: number, reason?: string) => Promise<TrialState>;
  cancelTrial: () => Promise<void>;

  // Crisis management
  activateCrisisOverride: (featureKeys: string[]) => Promise<void>;
  deactivateCrisisOverride: () => Promise<void>;
  checkCrisisAccess: () => Promise<boolean>;

  // Performance monitoring
  recordValidationMetric: (featureKey: string, latency: number, success: boolean) => void;
  getPerformanceMetrics: () => SubscriptionPerformanceMetrics;
  validatePerformanceRequirements: () => Promise<boolean>;

  // Error handling
  handleSubscriptionError: (error: SubscriptionError) => Promise<void>;
  retryFailedValidation: (featureKey: string) => Promise<FeatureAccessResult>;

  // Cache management
  clearValidationCache: () => void;
  warmupCache: (featureKeys: string[]) => Promise<void>;

  // Analytics
  trackFeatureAccess: (featureKey: string, granted: boolean, reason: string) => void;
  trackTrialEvent: (event: string, metadata?: Record<string, any>) => void;
  trackConversion: (fromTier: SubscriptionTier, toTier: SubscriptionTier) => void;
}

/**
 * Subscription Store State
 */
export interface SubscriptionStoreState {
  // Core state
  subscription: SubscriptionState;
  featureGates: Record<string, FeatureGateConfig>;

  // Trial management
  trial: TrialManagement;

  // Cache
  validationCache: Record<string, {
    result: FeatureAccessResult;
    timestamp: number;
    expiry: number;
  }>;

  // Performance
  performanceMetrics: SubscriptionPerformanceMetrics;

  // Error state
  lastError: SubscriptionError | null;
  retryQueue: string[];

  // Loading states
  isValidating: boolean;
  isUpdating: boolean;
  isInitialized: boolean;

  // Crisis state
  crisisMode: boolean;
  crisisOverrides: string[];
}

/**
 * Subscription Store Type
 */
export interface SubscriptionStore extends SubscriptionStoreState, SubscriptionStoreActions {}

/**
 * Integration with User Store Types
 */
export interface UserStoreSubscriptionIntegration {
  // Subscription reference in user profile
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: string;
  trialActive: boolean;
  trialDaysRemaining: number;

  // Feature access cache
  featureAccess: Record<string, boolean>;
  lastFeatureValidation: string; // ISO timestamp

  // Crisis integration
  crisisSubscriptionOverride: boolean;
  crisisAccessFeatures: string[];
}

/**
 * Navigation Integration Types
 */
export interface SubscriptionNavigationParams {
  SubscriptionScreen: {
    initialTab?: 'plans' | 'current' | 'billing';
    highlightFeature?: string;
    crisisMode?: boolean;
  };
  TrialScreen: {
    tier: SubscriptionTier;
    daysRemaining: number;
    canExtend: boolean;
  };
  UpgradeScreen: {
    fromFeature?: string;
    recommendedTier: SubscriptionTier;
    currentTier: SubscriptionTier;
  };
  FeatureLockedScreen: {
    featureKey: string;
    featureName: string;
    requiredTier: SubscriptionTier;
    canUpgrade: boolean;
  };
}

/**
 * Hook Return Types
 */
export interface UseSubscriptionReturn {
  // State
  subscription: SubscriptionState;
  trial: TrialState | null;
  isLoading: boolean;
  error: SubscriptionError | null;

  // Feature access
  hasFeature: (featureKey: string) => boolean;
  validateFeature: (featureKey: string) => Promise<FeatureAccessResult>;

  // Trial management
  startTrial: (tier: SubscriptionTier) => Promise<void>;
  extendTrial: (days: number) => Promise<void>;

  // Actions
  upgrade: (tier: SubscriptionTier) => Promise<void>;
  cancelSubscription: () => Promise<void>;

  // Performance
  performanceMetrics: SubscriptionPerformanceMetrics;
}

export interface UseFeatureGateReturn {
  // Access result
  access: FeatureAccessResult;
  isLoading: boolean;
  error: SubscriptionError | null;

  // Utilities
  hasAccess: boolean;
  canUpgrade: boolean;
  inTrial: boolean;
  crisisOverride: boolean;

  // Actions
  requestAccess: () => Promise<void>;
  upgrade: () => Promise<void>;

  // Performance
  validationTime: number;
  cacheHit: boolean;
}

/**
 * Type Guards
 */
export const isSubscriptionState = (value: unknown): value is SubscriptionState => {
  try {
    SubscriptionStateSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isFeatureAccessResult = (value: unknown): value is FeatureAccessResult => {
  try {
    FeatureAccessResultSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isTrialState = (value: unknown): value is TrialState => {
  try {
    TrialStateSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isSubscriptionError = (value: unknown): value is SubscriptionError => {
  try {
    SubscriptionErrorSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Utility Types
 */
export type SubscriptionTierFeatures = {
  [K in SubscriptionTier]: {
    features: string[];
    limits: Record<string, number>;
    description: string;
    monthlyPrice: number;
    annualPrice: number;
    savings: number;
    popular?: boolean;
    therapeutic_description: string;
  };
};

export type FeatureValidationContext = {
  userId: string;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: string;
  trialActive: boolean;
  trialDaysRemaining: number;
  crisisMode: boolean;
  timestamp: number;
};

export type CrisisFeatureOverride = {
  featureKey: string;
  reason: string;
  activatedAt: string; // ISO timestamp
  expiresAt: string;   // ISO timestamp
  automatic: boolean;
};

/**
 * Constants
 */
export const SUBSCRIPTION_CONSTANTS = {
  // Performance requirements
  MAX_VALIDATION_LATENCY: 100, // ms
  CRISIS_RESPONSE_MAX_LATENCY: 200, // ms
  CACHE_TTL: 300000, // 5 minutes

  // Trial defaults
  DEFAULT_TRIAL_DAYS: 7,
  MAX_TRIAL_EXTENSIONS: 2,
  CRISIS_EXTENSION_DAYS: 14,
  GRACE_PERIOD_DAYS: 3,

  // Error retry
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_BASE: 1000, // ms
  RETRY_DELAY_MULTIPLIER: 2,

  // Cache settings
  VALIDATION_CACHE_SIZE: 100,
  PERFORMANCE_METRICS_RETENTION: 604800000, // 7 days in ms

  // Crisis overrides
  CRISIS_OVERRIDE_TTL: 86400000, // 24 hours in ms
  AUTO_CRISIS_FEATURES: [
    'crisis_button',
    'emergency_contacts',
    'breathing_exercises',
    'mood_tracking_basic'
  ],

  // Storage keys
  STORAGE_KEYS: {
    SUBSCRIPTION_STATE: 'being_subscription_state',
    TRIAL_STATE: 'being_trial_state',
    FEATURE_CACHE: 'being_feature_cache',
    PERFORMANCE_METRICS: 'being_subscription_performance',
    CRISIS_OVERRIDES: 'being_crisis_overrides'
  }
} as const;

/**
 * Default Feature Gate Configurations
 */
export const DEFAULT_FEATURE_GATES: Record<string, FeatureGateConfig> = {
  cloud_sync: {
    featureKey: 'cloud_sync',
    displayName: 'Cloud Sync',
    description: 'Sync your progress across all your devices',
    category: 'premium',
    requiredTier: 'premium',
    requiredStatus: ['active', 'trialing'],
    availableInTrial: true,
    crisisSafe: false,
    maxValidationLatency: 100,
    fallbackBehavior: 'redirect',
    upgradeMessage: 'Keep your mindfulness journey connected across all devices with Premium',
    therapeuticGuidance: 'Maintaining consistency in your practice across devices can deepen your mindfulness journey.'
  },

  advanced_analytics: {
    featureKey: 'advanced_analytics',
    displayName: 'Advanced Insights',
    description: 'Deeper insights into your mindfulness progress',
    category: 'premium',
    requiredTier: 'premium',
    requiredStatus: ['active', 'trialing'],
    availableInTrial: true,
    crisisSafe: false,
    maxValidationLatency: 100,
    fallbackBehavior: 'educational',
    upgradeMessage: 'Unlock deeper insights into your mental wellness journey',
    therapeuticGuidance: 'Understanding patterns in your practice can help you grow in self-awareness.',
    educationalContent: 'Advanced analytics would show you trends in mood, practice consistency, and progress markers.'
  },

  family_sharing: {
    featureKey: 'family_sharing',
    displayName: 'Family Sharing',
    description: 'Share appropriate insights with loved ones',
    category: 'family',
    requiredTier: 'family',
    requiredStatus: ['active', 'trialing'],
    availableInTrial: true,
    crisisSafe: true, // Family support during crisis
    crisisMessage: 'Family support is available during difficult times',
    maxValidationLatency: 100,
    fallbackBehavior: 'redirect',
    upgradeMessage: 'Build mindfulness together with Family Sharing',
    therapeuticGuidance: 'Sharing your journey with trusted family members can provide support and accountability.'
  },

  crisis_button: {
    featureKey: 'crisis_button',
    displayName: 'Crisis Support',
    description: 'Immediate access to crisis resources',
    category: 'core',
    requiredTier: 'free',
    requiredStatus: ['active', 'trialing', 'past_due', 'canceled'],
    availableInTrial: true,
    crisisSafe: true,
    maxValidationLatency: 50, // Extra fast for crisis
    fallbackBehavior: 'hide', // Should never be hidden
    upgradeMessage: '', // Not applicable for crisis features
    therapeuticGuidance: 'Crisis support is always available when you need immediate help.'
  },

  breathing_exercises: {
    featureKey: 'breathing_exercises',
    displayName: 'Guided Breathing',
    description: 'Calming breathing exercises for any moment',
    category: 'core',
    requiredTier: 'free',
    requiredStatus: ['active', 'trialing', 'past_due'],
    availableInTrial: true,
    crisisSafe: true,
    maxValidationLatency: 100,
    fallbackBehavior: 'limited',
    upgradeMessage: 'Access unlimited breathing exercises with Premium',
    therapeuticGuidance: 'Regular breathing practice can help regulate your nervous system and reduce anxiety.'
  }
};

export default {
  SubscriptionTierSchema,
  TrialStateSchema,
  SubscriptionStateSchema,
  FeatureGateConfigSchema,
  FeatureAccessResultSchema,
  SubscriptionPerformanceMetricsSchema,
  SubscriptionErrorSchema,
  isSubscriptionState,
  isFeatureAccessResult,
  isTrialState,
  isSubscriptionError,
  SUBSCRIPTION_CONSTANTS,
  DEFAULT_FEATURE_GATES
};