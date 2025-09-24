/**
 * Subscription Tier Types and Policy Enforcement
 * Type-safe subscription tier management with feature access control
 *
 * CRITICAL CONSTRAINTS:
 * - All subscription checks must enforce tier-specific limits
 * - Crisis operations always bypass subscription restrictions
 * - Grace period policies must maintain therapeutic continuity
 * - Performance types must validate tier-specific SLAs
 */

import { z } from 'zod';
import type { SubscriptionTier } from '../subscription';

/**
 * Subscription Tier Enum with Strict Type Safety
 */
export const SubscriptionTierEnum = z.enum(['trial', 'basic', 'premium', 'grace_period']);
export type StrictSubscriptionTier = z.infer<typeof SubscriptionTierEnum>;

/**
 * Tier-Specific Feature Access Matrix
 * Compile-time enforcement of feature availability per tier
 */
export type TierFeatureAccess<T extends StrictSubscriptionTier> =
  T extends 'trial' ? TrialTierFeatures :
  T extends 'basic' ? BasicTierFeatures :
  T extends 'premium' ? PremiumTierFeatures :
  T extends 'grace_period' ? GracePeriodFeatures :
  never;

/**
 * Trial Tier Features (7-14 days)
 */
export interface TrialTierFeatures {
  // Core therapeutic features (always available)
  check_ins: true;
  assessments: true;
  crisis_support: true;
  breathing_exercises: true;
  mood_tracking: true;

  // Limited premium features for trial
  cloud_sync: 'limited'; // Local device only during trial
  advanced_analytics: 'preview'; // Limited insights
  export_data: 'limited'; // Basic export only

  // Premium features (trial access)
  therapeutic_progress: true;
  personalized_insights: true;
  extended_history: true;

  // Restricted features
  family_sharing: false;
  multi_device_sync: false;
  premium_content: false;
  priority_support: false;
}

/**
 * Basic Tier Features (Post-trial, subscription required)
 */
export interface BasicTierFeatures {
  // Core therapeutic features
  check_ins: true;
  assessments: true;
  crisis_support: true;
  breathing_exercises: true;
  mood_tracking: true;

  // Basic sync and storage
  cloud_sync: true;
  export_data: true;
  therapeutic_progress: true;

  // Limited premium features
  advanced_analytics: 'limited';
  personalized_insights: 'limited';

  // Restricted premium features
  family_sharing: false;
  multi_device_sync: 'limited'; // 2 devices max
  premium_content: false;
  priority_support: false;
  extended_history: 'limited'; // 90 days
}

/**
 * Premium Tier Features (Full access)
 */
export interface PremiumTierFeatures {
  // All core features
  check_ins: true;
  assessments: true;
  crisis_support: true;
  breathing_exercises: true;
  mood_tracking: true;

  // Full sync and storage
  cloud_sync: true;
  export_data: true;
  therapeutic_progress: true;

  // Premium analytics and insights
  advanced_analytics: true;
  personalized_insights: true;
  therapeutic_recommendations: true;

  // Premium features
  family_sharing: 'available'; // Requires family plan upgrade
  multi_device_sync: true; // Unlimited devices
  premium_content: true;
  priority_support: true;
  extended_history: true; // Unlimited history

  // Advanced features
  custom_reminders: true;
  advanced_reporting: true;
  integration_api: true;
}

/**
 * Grace Period Features (Temporary continued access)
 */
export interface GracePeriodFeatures {
  // Essential therapeutic features (maintained during grace)
  check_ins: true;
  assessments: true;
  crisis_support: true;
  breathing_exercises: true;
  mood_tracking: true;

  // Limited sync (read-only during grace)
  cloud_sync: 'read_only';
  export_data: true; // Allow data export during grace
  therapeutic_progress: 'read_only';

  // Restricted features during grace period
  advanced_analytics: false;
  personalized_insights: false;
  family_sharing: false;
  multi_device_sync: false;
  premium_content: false;
  priority_support: false;
  extended_history: 'read_only';
}

/**
 * Tier-Specific Resource Limits
 * Compile-time enforcement of resource constraints
 */
export interface TierResourceLimits<T extends StrictSubscriptionTier> {
  tier: T;

  // Sync constraints
  maxSyncOperationsPerHour: T extends 'trial' ? 60 :
                           T extends 'basic' ? 120 :
                           T extends 'premium' ? 300 :
                           T extends 'grace_period' ? 30 : never;

  maxConcurrentSyncs: T extends 'trial' ? 2 :
                     T extends 'basic' ? 3 :
                     T extends 'premium' ? 5 :
                     T extends 'grace_period' ? 1 : never;

  // Storage limits
  maxStorageBytes: T extends 'trial' ? 50_000_000 : // 50MB
                  T extends 'basic' ? 200_000_000 : // 200MB
                  T extends 'premium' ? 1_000_000_000 : // 1GB
                  T extends 'grace_period' ? 50_000_000 : never; // 50MB

  // Data retention
  dataRetentionDays: T extends 'trial' ? 90 :
                    T extends 'basic' ? 365 :
                    T extends 'premium' ? -1 : // Unlimited
                    T extends 'grace_period' ? 30 : never;

  // Device limits
  maxConnectedDevices: T extends 'trial' ? 1 :
                      T extends 'basic' ? 2 :
                      T extends 'premium' ? 10 :
                      T extends 'grace_period' ? 1 : never;

  // Export frequency
  maxExportsPerMonth: T extends 'trial' ? 2 :
                     T extends 'basic' ? 5 :
                     T extends 'premium' ? -1 : // Unlimited
                     T extends 'grace_period' ? 1 : never;
}

/**
 * Subscription Tier Policy Configuration
 * Runtime policy enforcement with compile-time type safety
 */
export const TierPolicyConfigSchema = z.object({
  tier: SubscriptionTierEnum,

  // Feature gates
  featureAccess: z.object({
    cloudSync: z.enum(['enabled', 'limited', 'read_only', 'disabled']),
    advancedAnalytics: z.enum(['enabled', 'limited', 'preview', 'disabled']),
    multiDeviceSync: z.enum(['enabled', 'limited', 'disabled']),
    familySharing: z.enum(['enabled', 'available', 'disabled']),
    premiumContent: z.boolean(),
    prioritySupport: z.boolean(),
    extendedHistory: z.enum(['enabled', 'limited', 'read_only', 'disabled'])
  }),

  // Resource limits
  resourceLimits: z.object({
    maxSyncOperationsPerHour: z.number().int().positive(),
    maxConcurrentSyncs: z.number().int().positive(),
    maxStorageBytes: z.number().int().positive(),
    dataRetentionDays: z.number().int().min(-1), // -1 = unlimited
    maxConnectedDevices: z.number().int().positive(),
    maxExportsPerMonth: z.number().int().min(-1) // -1 = unlimited
  }),

  // Performance guarantees
  performanceGuarantees: z.object({
    maxSyncLatencyMs: z.number().positive(),
    maxValidationLatencyMs: z.number().positive(),
    guaranteedUptime: z.number().min(0).max(1), // 0-1 percentage
    supportResponseTimeHours: z.number().positive()
  }),

  // Crisis overrides (always enabled regardless of tier)
  crisisOverrides: z.object({
    bypassAllLimits: z.boolean().default(true),
    unlimitedCrisisOperations: z.boolean().default(true),
    maxCrisisResponseMs: z.number().max(200),
    maintainDuringGracePeriod: z.boolean().default(true)
  }),

  // Grace period behavior
  gracePeriodPolicy: z.object({
    allowedDays: z.number().int().positive(),
    maintainCoreFeatures: z.boolean().default(true),
    readOnlyAccess: z.boolean().default(true),
    dataExportAllowed: z.boolean().default(true),
    warningSchedule: z.array(z.number().int()) // Days before expiry to warn
  })
});

export type TierPolicyConfig = z.infer<typeof TierPolicyConfigSchema>;

/**
 * Tier Validation Context
 * Runtime context for subscription tier validation
 */
export const TierValidationContextSchema = z.object({
  // Current subscription state
  currentTier: SubscriptionTierEnum,
  subscriptionStatus: z.enum(['active', 'past_due', 'canceled', 'incomplete', 'trialing']),
  subscriptionValidUntil: z.string().optional(), // ISO timestamp

  // Trial state
  trialActive: z.boolean(),
  trialDaysRemaining: z.number().min(0).optional(),
  trialCanExtend: z.boolean().default(false),

  // Grace period state
  gracePeriodActive: z.boolean(),
  gracePeriodDaysRemaining: z.number().min(0).optional(),
  gracePeriodType: z.enum(['payment_failed', 'cancellation', 'downgrade']).optional(),

  // Crisis state (always overrides tier restrictions)
  crisisMode: z.boolean(),
  crisisModeActivatedAt: z.string().optional(), // ISO timestamp
  crisisAutoExtendEnabled: z.boolean().default(true),

  // Validation metadata
  validatedAt: z.string(), // ISO timestamp
  validationLatencyMs: z.number(),
  cacheHit: z.boolean(),
  validationSource: z.enum(['cache', 'local_storage', 'api', 'fallback'])
});

export type TierValidationContext = z.infer<typeof TierValidationContextSchema>;

/**
 * Feature Access Request with Tier Enforcement
 */
export const FeatureAccessRequestSchema = z.object({
  featureKey: z.string(),
  requestedBy: z.enum(['user_action', 'system_operation', 'crisis_trigger', 'background_sync']),

  // Subscription context
  subscriptionContext: TierValidationContextSchema,

  // Request metadata
  requestId: z.string().uuid(),
  requestedAt: z.string(), // ISO timestamp
  maxValidationTimeMs: z.number().default(100),

  // Crisis safety
  crisisSafetyRequired: z.boolean(),
  bypassTierRestrictions: z.boolean().default(false),
  therapeuticContinuityRequired: z.boolean().default(false),

  // Performance requirements
  requiresLowLatency: z.boolean(),
  cacheable: z.boolean().default(true),
  backgroundProcessingAllowed: z.boolean().default(true)
});

export type FeatureAccessRequest = z.infer<typeof FeatureAccessRequestSchema>;

/**
 * Feature Access Response with Tier Justification
 */
export const FeatureAccessResponseSchema = z.object({
  // Access decision
  accessGranted: z.boolean(),
  accessReason: z.enum([
    'tier_sufficient',
    'trial_access',
    'grace_period_access',
    'crisis_override',
    'tier_insufficient',
    'subscription_expired',
    'feature_disabled',
    'validation_timeout'
  ]),

  // Tier context
  tierJustification: z.object({
    requiredTier: SubscriptionTierEnum,
    currentTier: SubscriptionTierEnum,
    upgradeRequired: z.boolean(),
    trialEligible: z.boolean(),
    gracePeriodAllowed: z.boolean()
  }),

  // Alternative access options
  alternativeAccess: z.object({
    trialAvailable: z.boolean(),
    limitedModeAvailable: z.boolean(),
    upgradeOptions: z.array(SubscriptionTierEnum),
    temporaryAccessDuration: z.number().optional() // minutes
  }),

  // Performance metrics
  validationMetrics: z.object({
    validationTimeMs: z.number(),
    tierCheckTimeMs: z.number(),
    cacheHit: z.boolean(),
    fallbackUsed: z.boolean()
  }),

  // User guidance
  userGuidance: z.object({
    message: z.string(),
    actionRequired: z.boolean(),
    suggestedAction: z.enum([
      'upgrade_subscription',
      'start_trial',
      'wait_for_renewal',
      'contact_support',
      'use_alternative_feature',
      'continue_with_limitations'
    ]).optional(),
    therapeuticAlternative: z.string().optional()
  }),

  // Audit trail
  auditTrail: z.object({
    requestId: z.string().uuid(),
    respondedAt: z.string(), // ISO timestamp
    decisionFactors: z.array(z.string()),
    overridesApplied: z.array(z.string())
  })
});

export type FeatureAccessResponse = z.infer<typeof FeatureAccessResponseSchema>;

/**
 * Tier Upgrade Recommendation Engine
 */
export const TierUpgradeRecommendationSchema = z.object({
  // Current context
  currentTier: SubscriptionTierEnum,
  usagePattern: z.object({
    dailyActiveFeatures: z.array(z.string()),
    weeklyEngagementScore: z.number().min(0).max(1),
    featuresBlockedByTier: z.array(z.string()),
    averageSessionDurationMinutes: z.number().positive(),
    therapeuticProgressMetrics: z.number().min(0).max(1)
  }),

  // Recommendation
  recommendedTier: SubscriptionTierEnum,
  recommendationConfidence: z.number().min(0).max(1),
  recommendationReasons: z.array(z.enum([
    'feature_usage_pattern',
    'storage_limitations',
    'sync_frequency_needs',
    'multi_device_usage',
    'therapeutic_progress_tracking',
    'crisis_support_enhancement',
    'family_sharing_request'
  ])),

  // Value proposition
  valueProposition: z.object({
    unlockedFeatures: z.array(z.string()),
    improvedPerformance: z.array(z.string()),
    enhancedTherapeuticValue: z.array(z.string()),
    estimatedROI: z.number().min(0).max(1), // Therapeutic value score
    costBenefitAnalysis: z.string()
  }),

  // Timing and urgency
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  optimalUpgradeWindow: z.object({
    startDate: z.string(), // ISO date
    endDate: z.string(), // ISO date
    seasonalFactors: z.array(z.string()),
    therapeuticCycleAlignment: z.boolean()
  }),

  // Trial considerations
  trialRecommendation: z.object({
    offerTrial: z.boolean(),
    trialDuration: z.number().int().positive().optional(),
    focusFeatures: z.array(z.string()),
    successCriteria: z.array(z.string())
  })
});

export type TierUpgradeRecommendation = z.infer<typeof TierUpgradeRecommendationSchema>;

/**
 * Default Tier Policies
 * Compile-time tier policy configurations
 */
export const DEFAULT_TIER_POLICIES: Record<StrictSubscriptionTier, TierPolicyConfig> = {
  trial: {
    tier: 'trial',
    featureAccess: {
      cloudSync: 'limited',
      advancedAnalytics: 'preview',
      multiDeviceSync: 'disabled',
      familySharing: 'disabled',
      premiumContent: false,
      prioritySupport: false,
      extendedHistory: 'limited'
    },
    resourceLimits: {
      maxSyncOperationsPerHour: 60,
      maxConcurrentSyncs: 2,
      maxStorageBytes: 50_000_000, // 50MB
      dataRetentionDays: 90,
      maxConnectedDevices: 1,
      maxExportsPerMonth: 2
    },
    performanceGuarantees: {
      maxSyncLatencyMs: 5000,
      maxValidationLatencyMs: 200,
      guaranteedUptime: 0.95,
      supportResponseTimeHours: 48
    },
    crisisOverrides: {
      bypassAllLimits: true,
      unlimitedCrisisOperations: true,
      maxCrisisResponseMs: 200,
      maintainDuringGracePeriod: true
    },
    gracePeriodPolicy: {
      allowedDays: 7,
      maintainCoreFeatures: true,
      readOnlyAccess: false, // Full access during trial
      dataExportAllowed: true,
      warningSchedule: [3, 1] // Warn 3 days and 1 day before expiry
    }
  },

  basic: {
    tier: 'basic',
    featureAccess: {
      cloudSync: 'enabled',
      advancedAnalytics: 'limited',
      multiDeviceSync: 'limited',
      familySharing: 'disabled',
      premiumContent: false,
      prioritySupport: false,
      extendedHistory: 'limited'
    },
    resourceLimits: {
      maxSyncOperationsPerHour: 120,
      maxConcurrentSyncs: 3,
      maxStorageBytes: 200_000_000, // 200MB
      dataRetentionDays: 365,
      maxConnectedDevices: 2,
      maxExportsPerMonth: 5
    },
    performanceGuarantees: {
      maxSyncLatencyMs: 3000,
      maxValidationLatencyMs: 150,
      guaranteedUptime: 0.98,
      supportResponseTimeHours: 24
    },
    crisisOverrides: {
      bypassAllLimits: true,
      unlimitedCrisisOperations: true,
      maxCrisisResponseMs: 200,
      maintainDuringGracePeriod: true
    },
    gracePeriodPolicy: {
      allowedDays: 7,
      maintainCoreFeatures: true,
      readOnlyAccess: true,
      dataExportAllowed: true,
      warningSchedule: [7, 3, 1]
    }
  },

  premium: {
    tier: 'premium',
    featureAccess: {
      cloudSync: 'enabled',
      advancedAnalytics: 'enabled',
      multiDeviceSync: 'enabled',
      familySharing: 'available',
      premiumContent: true,
      prioritySupport: true,
      extendedHistory: 'enabled'
    },
    resourceLimits: {
      maxSyncOperationsPerHour: 300,
      maxConcurrentSyncs: 5,
      maxStorageBytes: 1_000_000_000, // 1GB
      dataRetentionDays: -1, // Unlimited
      maxConnectedDevices: 10,
      maxExportsPerMonth: -1 // Unlimited
    },
    performanceGuarantees: {
      maxSyncLatencyMs: 1000,
      maxValidationLatencyMs: 100,
      guaranteedUptime: 0.99,
      supportResponseTimeHours: 4
    },
    crisisOverrides: {
      bypassAllLimits: true,
      unlimitedCrisisOperations: true,
      maxCrisisResponseMs: 200,
      maintainDuringGracePeriod: true
    },
    gracePeriodPolicy: {
      allowedDays: 14,
      maintainCoreFeatures: true,
      readOnlyAccess: true,
      dataExportAllowed: true,
      warningSchedule: [14, 7, 3, 1]
    }
  },

  grace_period: {
    tier: 'grace_period',
    featureAccess: {
      cloudSync: 'read_only',
      advancedAnalytics: 'disabled',
      multiDeviceSync: 'disabled',
      familySharing: 'disabled',
      premiumContent: false,
      prioritySupport: false,
      extendedHistory: 'read_only'
    },
    resourceLimits: {
      maxSyncOperationsPerHour: 30,
      maxConcurrentSyncs: 1,
      maxStorageBytes: 50_000_000, // 50MB
      dataRetentionDays: 30,
      maxConnectedDevices: 1,
      maxExportsPerMonth: 1
    },
    performanceGuarantees: {
      maxSyncLatencyMs: 10000,
      maxValidationLatencyMs: 300,
      guaranteedUptime: 0.90,
      supportResponseTimeHours: 72
    },
    crisisOverrides: {
      bypassAllLimits: true,
      unlimitedCrisisOperations: true,
      maxCrisisResponseMs: 200,
      maintainDuringGracePeriod: true
    },
    gracePeriodPolicy: {
      allowedDays: 7, // Maximum grace period
      maintainCoreFeatures: true,
      readOnlyAccess: true,
      dataExportAllowed: true,
      warningSchedule: [7, 3, 1]
    }
  }
} as const;

/**
 * Type Guards for Runtime Validation
 */
export const isTierValidationContext = (value: unknown): value is TierValidationContext => {
  try {
    TierValidationContextSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isFeatureAccessRequest = (value: unknown): value is FeatureAccessRequest => {
  try {
    FeatureAccessRequestSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isFeatureAccessResponse = (value: unknown): value is FeatureAccessResponse => {
  try {
    FeatureAccessResponseSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Utility type for tier-specific feature checking
 */
export type RequiresTier<T extends keyof TrialTierFeatures, MinTier extends StrictSubscriptionTier> =
  TrialTierFeatures[T] extends false ? MinTier : 'trial';

/**
 * Crisis Override Type - Always bypasses tier restrictions
 */
export type CrisisOverride = {
  readonly overrideActive: true;
  readonly bypassAllTierRestrictions: true;
  readonly unlimitedOperations: true;
  readonly maxResponseTimeMs: 200;
  readonly preserveTherapeuticContinuity: true;
};

export const SUBSCRIPTION_TIER_CONSTANTS = {
  // Tier validation timeouts
  MAX_TIER_VALIDATION_MS: 100,
  TIER_CACHE_TTL_MS: 300000, // 5 minutes

  // Crisis response guarantees
  CRISIS_BYPASS_ALL_LIMITS: true,
  CRISIS_MAX_RESPONSE_MS: 200,

  // Grace period defaults
  DEFAULT_GRACE_PERIOD_DAYS: 7,
  GRACE_PERIOD_WARNING_DAYS: [7, 3, 1],

  // Trial defaults
  DEFAULT_TRIAL_DAYS: 7,
  TRIAL_EXTENSION_DAYS: 7,
  MAX_TRIAL_EXTENSIONS: 2
} as const;