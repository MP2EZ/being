/**
 * P0-CLOUD Feature Flag System Types
 * Comprehensive type definitions for feature flag control center
 */

import { z } from 'zod';

/**
 * P0-CLOUD Feature Flags
 * All flags default OFF to preserve offline functionality
 */
export interface P0CloudFeatureFlags {
  // Core Cloud Features
  readonly CLOUD_SYNC_ENABLED: boolean;
  readonly PAYMENT_SYSTEM_ENABLED: boolean;
  readonly THERAPIST_PORTAL_ENABLED: boolean;
  readonly ANALYTICS_ENABLED: boolean;
  readonly PUSH_NOTIFICATIONS_ENABLED: boolean;
  
  // Advanced Features
  readonly CROSS_DEVICE_SYNC_ENABLED: boolean;
  readonly AI_INSIGHTS_ENABLED: boolean;
  readonly FAMILY_SHARING_ENABLED: boolean;
  readonly EMERGENCY_CONTACTS_CLOUD: boolean;
  readonly BACKUP_RESTORE_ENABLED: boolean;
  
  // Development & Testing
  readonly BETA_FEATURES_ENABLED: boolean;
  readonly DEBUG_CLOUD_LOGS: boolean;
  readonly STAGING_ENVIRONMENT: boolean;
}

/**
 * Feature Flag Metadata for Control
 */
export interface FeatureFlagMetadata {
  readonly flagKey: keyof P0CloudFeatureFlags;
  readonly displayName: string;
  readonly description: string;
  readonly category: 'core' | 'premium' | 'experimental' | 'enterprise';
  readonly costImpact: 'none' | 'low' | 'medium' | 'high' | 'variable';
  readonly requiresConsent: boolean;
  readonly hipaaRelevant: boolean;
  readonly canDisableInCrisis: boolean;
  readonly dependencies: readonly (keyof P0CloudFeatureFlags)[];
  readonly minimumPlan: 'free' | 'premium' | 'family' | 'enterprise';
  readonly rolloutStrategy: 'immediate' | 'gradual' | 'controlled' | 'beta_only';
}

/**
 * Feature Flag State with Controls
 */
export interface FeatureFlagState {
  readonly flags: P0CloudFeatureFlags;
  readonly metadata: Record<keyof P0CloudFeatureFlags, FeatureFlagMetadata>;
  readonly userConsents: Record<keyof P0CloudFeatureFlags, boolean>;
  readonly rolloutPercentages: Record<keyof P0CloudFeatureFlags, number>;
  readonly costLimits: Record<keyof P0CloudFeatureFlags, number>;
  readonly emergencyOverrides: Record<keyof P0CloudFeatureFlags, boolean>;
  readonly lastUpdated: string;
  readonly version: string;
}

/**
 * Progressive Rollout Configuration
 */
export interface ProgressiveRolloutConfig {
  readonly strategy: 'percentage' | 'user_segments' | 'geographic' | 'plan_based';
  readonly phases: readonly RolloutPhase[];
  readonly safetyThresholds: RolloutSafetyThresholds;
  readonly emergencyBrake: EmergencyBrakeConfig;
}

export interface RolloutPhase {
  readonly phase: number;
  readonly targetPercentage: number;
  readonly duration: string; // ISO 8601 duration
  readonly criteria: RolloutCriteria;
  readonly successMetrics: readonly string[];
  readonly rollbackTriggers: readonly string[];
}

export interface RolloutCriteria {
  readonly userSegments?: readonly string[];
  readonly minimumAppVersion?: string;
  readonly geographicRegions?: readonly string[];
  readonly planTypes?: readonly string[];
  readonly betaOptIn?: boolean;
  readonly deviceTypes?: readonly ('ios' | 'android')[];
}

export interface RolloutSafetyThresholds {
  readonly maxErrorRate: number; // 0-1
  readonly maxLatencyMs: number;
  readonly minSuccessRate: number; // 0-1
  readonly maxCostPerUser: number; // USD
  readonly crisisResponseTimeMs: number; // Must stay <200ms
}

export interface EmergencyBrakeConfig {
  readonly enabled: boolean;
  readonly triggers: readonly ('error_rate' | 'latency' | 'cost' | 'compliance' | 'manual')[];
  readonly autoRollback: boolean;
  readonly notificationChannels: readonly string[];
  readonly escalationTimeoutMs: number;
}

/**
 * Cost Management for Feature Flags
 */
export interface FeatureCostManager {
  readonly budgetControls: BudgetControls;
  readonly usageTracking: UsageTracking;
  readonly costOptimization: CostOptimization;
  readonly alerting: CostAlerting;
}

export interface BudgetControls {
  readonly dailyBudget: number; // USD
  readonly weeklyBudget: number; // USD
  readonly monthlyBudget: number; // USD
  readonly perUserBudget: number; // USD
  readonly featureBudgets: Record<keyof P0CloudFeatureFlags, number>;
  readonly emergencyLimits: EmergencyBudgetLimits;
}

export interface EmergencyBudgetLimits {
  readonly hardStopPercentage: number; // 100% = disable all non-critical
  readonly warnPercentage: number; // 75% = start warnings
  readonly limitPercentage: number; // 85% = limit expensive features
  readonly criticalFeatures: readonly (keyof P0CloudFeatureFlags)[]; // Never disabled
}

export interface UsageTracking {
  readonly realTimeMonitoring: boolean;
  readonly aggregationIntervalMs: number;
  readonly costPerOperation: Record<string, number>;
  readonly projectedCosts: ProjectedCosts;
}

export interface ProjectedCosts {
  readonly daily: number;
  readonly weekly: number;
  readonly monthly: number;
  readonly confidence: number; // 0-1
  readonly basedOnUsers: number;
  readonly breakEvenUsers: number; // 50-100 per plan
}

export interface CostOptimization {
  readonly recommendations: readonly CostRecommendation[];
  readonly autoOptimizations: readonly AutoOptimization[];
  readonly savingsOpportunities: readonly SavingsOpportunity[];
}

export interface CostRecommendation {
  readonly id: string;
  readonly feature: keyof P0CloudFeatureFlags;
  readonly type: 'disable' | 'limit' | 'optimize' | 'alternative';
  readonly potentialSavings: number; // USD per month
  readonly impact: 'none' | 'low' | 'medium' | 'high';
  readonly description: string;
  readonly actionRequired: boolean;
}

export interface AutoOptimization {
  readonly id: string;
  readonly feature: keyof P0CloudFeatureFlags;
  readonly optimization: string;
  readonly enabled: boolean;
  readonly monthlySavings: number;
  readonly userImpact: 'none' | 'minimal' | 'moderate';
}

export interface SavingsOpportunity {
  readonly id: string;
  readonly description: string;
  readonly potentialSavings: number;
  readonly implementationCost: number;
  readonly timeToBreakEven: number; // days
  readonly confidence: number; // 0-1
}

export interface CostAlerting {
  readonly thresholds: readonly CostThreshold[];
  readonly notifications: readonly CostNotification[];
  readonly escalation: CostEscalation;
}

export interface CostThreshold {
  readonly percentage: number; // of budget
  readonly action: 'notify' | 'warn' | 'limit' | 'disable';
  readonly features: readonly (keyof P0CloudFeatureFlags)[];
  readonly notificationDelay: number; // ms
}

export interface CostNotification {
  readonly id: string;
  readonly type: 'email' | 'push' | 'in_app' | 'webhook';
  readonly recipients: readonly string[];
  readonly template: string;
  readonly urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface CostEscalation {
  readonly levels: readonly EscalationLevel[];
  readonly autoEscalate: boolean;
  readonly escalationDelay: number; // ms
}

export interface EscalationLevel {
  readonly level: number;
  readonly threshold: number; // percentage of budget
  readonly recipients: readonly string[];
  readonly actions: readonly string[];
  readonly timeoutMs: number;
}

/**
 * Safety Guardian for Feature Flags
 */
export interface FeatureSafetyGuardian {
  readonly crisisProtection: CrisisProtection;
  readonly hipaaCompliance: HIPAACompliance;
  readonly offlineFallback: OfflineFallback;
  readonly dataIntegrity: DataIntegrity;
}

export interface CrisisProtection {
  readonly protectedFeatures: readonly string[]; // Crisis button, 988 access, etc.
  readonly maxLatencyMs: 200; // Crisis response must stay <200ms
  readonly offlineMode: boolean; // Crisis works offline always
  readonly emergencyOverride: boolean; // Can override any flag in crisis
  readonly validationRules: readonly CrisisValidationRule[];
}

export interface CrisisValidationRule {
  readonly name: string;
  readonly condition: string; // JavaScript expression
  readonly action: 'disable_feature' | 'enable_offline' | 'alert' | 'escalate';
  readonly priority: 'critical' | 'high' | 'medium';
}

export interface HIPAACompliance {
  readonly encryptionRequired: boolean; // Always true
  readonly auditLogging: boolean; // All flag changes logged
  readonly accessControls: boolean; // User-based access
  readonly dataMinimization: boolean; // Only necessary data
  readonly consentTracking: boolean; // Explicit consent per feature
  readonly breachPrevention: BreachPrevention;
}

export interface BreachPrevention {
  readonly dataValidation: boolean;
  readonly encryptionValidation: boolean;
  readonly accessLogging: boolean;
  readonly anomalyDetection: boolean;
  readonly automaticDisable: boolean; // Disable on breach detection
}

export interface OfflineFallback {
  readonly enabled: boolean;
  readonly fallbackFeatures: readonly (keyof P0CloudFeatureFlags)[];
  readonly gracefulDegradation: boolean;
  readonly offlineNotification: boolean;
}

export interface DataIntegrity {
  readonly validationEnabled: boolean;
  readonly checksumValidation: boolean;
  readonly encryptionValidation: boolean;
  readonly corruptionDetection: boolean;
  readonly autoRepair: boolean;
}

/**
 * User Eligibility and Consent
 */
export interface UserEligibility {
  readonly userId: string;
  readonly planType: 'free' | 'premium' | 'family' | 'enterprise';
  readonly rolloutSegment: string;
  readonly betaOptIn: boolean;
  readonly geographicRegion: string;
  readonly appVersion: string;
  readonly deviceType: 'ios' | 'android';
  readonly eligibleFeatures: readonly (keyof P0CloudFeatureFlags)[];
  readonly waitlistFeatures: readonly (keyof P0CloudFeatureFlags)[];
}

export interface ConsentManagerUI {
  readonly consentFlows: ConsentFlow[];
  readonly privacyControls: PrivacyControl[];
  readonly dataTransparency: DataTransparency;
  readonly revocationProcess: RevocationProcess;
}

export interface ConsentFlow {
  readonly featureFlag: keyof P0CloudFeatureFlags;
  readonly steps: readonly ConsentStep[];
  readonly requiredConsents: readonly string[];
  readonly optionalConsents: readonly string[];
  readonly dataUsageDescription: string;
  readonly benefitsExplanation: string;
  readonly risksExplanation: string;
  readonly revocationInstructions: string;
}

export interface ConsentStep {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly consentType: 'required' | 'optional';
  readonly dataCategories: readonly string[];
  readonly thirdParties: readonly string[];
  readonly validationRules: readonly string[];
}

export interface PrivacyControl {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly userControllable: boolean;
  readonly affectedFeatures: readonly (keyof P0CloudFeatureFlags)[];
}

export interface DataTransparency {
  readonly dataCategories: readonly DataCategory[];
  readonly thirdPartySharing: readonly ThirdPartySharing[];
  readonly retentionPolicies: readonly RetentionPolicy[];
  readonly userRights: readonly UserRight[];
}

export interface DataCategory {
  readonly category: string;
  readonly description: string;
  readonly sensitive: boolean;
  readonly requiredFor: readonly (keyof P0CloudFeatureFlags)[];
  readonly retention: string;
}

export interface ThirdPartySharing {
  readonly partner: string;
  readonly purpose: string;
  readonly dataCategories: readonly string[];
  readonly userControl: boolean;
  readonly features: readonly (keyof P0CloudFeatureFlags)[];
}

export interface RetentionPolicy {
  readonly dataType: string;
  readonly retentionPeriod: string;
  readonly deletionProcess: string;
  readonly userControl: boolean;
}

export interface UserRight {
  readonly right: string;
  readonly description: string;
  readonly process: string;
  readonly timeframe: string;
}

export interface RevocationProcess {
  readonly steps: readonly string[];
  readonly immediate: boolean;
  readonly gracePeriod: string;
  readonly dataHandling: string;
  readonly confirmation: boolean;
}

/**
 * Zod Schemas for Runtime Validation
 */
export const P0CloudFeatureFlagsSchema = z.object({
  CLOUD_SYNC_ENABLED: z.boolean(),
  PAYMENT_SYSTEM_ENABLED: z.boolean(),
  THERAPIST_PORTAL_ENABLED: z.boolean(),
  ANALYTICS_ENABLED: z.boolean(),
  PUSH_NOTIFICATIONS_ENABLED: z.boolean(),
  CROSS_DEVICE_SYNC_ENABLED: z.boolean(),
  AI_INSIGHTS_ENABLED: z.boolean(),
  FAMILY_SHARING_ENABLED: z.boolean(),
  EMERGENCY_CONTACTS_CLOUD: z.boolean(),
  BACKUP_RESTORE_ENABLED: z.boolean(),
  BETA_FEATURES_ENABLED: z.boolean(),
  DEBUG_CLOUD_LOGS: z.boolean(),
  STAGING_ENVIRONMENT: z.boolean()
}).readonly();

export const FeatureFlagMetadataSchema = z.object({
  flagKey: z.string(),
  displayName: z.string(),
  description: z.string(),
  category: z.enum(['core', 'premium', 'experimental', 'enterprise']),
  costImpact: z.enum(['none', 'low', 'medium', 'high', 'variable']),
  requiresConsent: z.boolean(),
  hipaaRelevant: z.boolean(),
  canDisableInCrisis: z.boolean(),
  dependencies: z.array(z.string()),
  minimumPlan: z.enum(['free', 'premium', 'family', 'enterprise']),
  rolloutStrategy: z.enum(['immediate', 'gradual', 'controlled', 'beta_only'])
}).readonly();

/**
 * Default Feature Flag Configuration
 */
export const DEFAULT_FEATURE_FLAGS: P0CloudFeatureFlags = {
  // All default OFF to preserve offline functionality
  CLOUD_SYNC_ENABLED: false,
  PAYMENT_SYSTEM_ENABLED: false,
  THERAPIST_PORTAL_ENABLED: false,
  ANALYTICS_ENABLED: false,
  PUSH_NOTIFICATIONS_ENABLED: false,
  CROSS_DEVICE_SYNC_ENABLED: false,
  AI_INSIGHTS_ENABLED: false,
  FAMILY_SHARING_ENABLED: false,
  EMERGENCY_CONTACTS_CLOUD: false,
  BACKUP_RESTORE_ENABLED: false,
  BETA_FEATURES_ENABLED: false,
  DEBUG_CLOUD_LOGS: false,
  STAGING_ENVIRONMENT: false
};

/**
 * Feature Flag Metadata Configuration
 */
export const FEATURE_FLAG_METADATA: Record<keyof P0CloudFeatureFlags, FeatureFlagMetadata> = {
  CLOUD_SYNC_ENABLED: {
    flagKey: 'CLOUD_SYNC_ENABLED',
    displayName: 'Cloud Sync',
    description: 'Sync your data across devices securely',
    category: 'core',
    costImpact: 'medium',
    requiresConsent: true,
    hipaaRelevant: true,
    canDisableInCrisis: false,
    dependencies: [],
    minimumPlan: 'premium',
    rolloutStrategy: 'gradual'
  },
  PAYMENT_SYSTEM_ENABLED: {
    flagKey: 'PAYMENT_SYSTEM_ENABLED',
    displayName: 'Premium Features',
    description: 'Access premium features and subscriptions',
    category: 'core',
    costImpact: 'high',
    requiresConsent: false,
    hipaaRelevant: false,
    canDisableInCrisis: true,
    dependencies: [],
    minimumPlan: 'free',
    rolloutStrategy: 'controlled'
  },
  THERAPIST_PORTAL_ENABLED: {
    flagKey: 'THERAPIST_PORTAL_ENABLED',
    displayName: 'Therapist Portal',
    description: 'Connect with your therapist securely',
    category: 'premium',
    costImpact: 'medium',
    requiresConsent: true,
    hipaaRelevant: true,
    canDisableInCrisis: false,
    dependencies: ['CLOUD_SYNC_ENABLED'],
    minimumPlan: 'premium',
    rolloutStrategy: 'controlled'
  },
  ANALYTICS_ENABLED: {
    flagKey: 'ANALYTICS_ENABLED',
    displayName: 'Usage Analytics',
    description: 'Help improve the app with anonymous usage data',
    category: 'core',
    costImpact: 'low',
    requiresConsent: true,
    hipaaRelevant: false,
    canDisableInCrisis: true,
    dependencies: [],
    minimumPlan: 'free',
    rolloutStrategy: 'gradual'
  },
  PUSH_NOTIFICATIONS_ENABLED: {
    flagKey: 'PUSH_NOTIFICATIONS_ENABLED',
    displayName: 'Push Notifications',
    description: 'Receive reminders and updates',
    category: 'core',
    costImpact: 'low',
    requiresConsent: true,
    hipaaRelevant: false,
    canDisableInCrisis: false,
    dependencies: [],
    minimumPlan: 'free',
    rolloutStrategy: 'immediate'
  },
  CROSS_DEVICE_SYNC_ENABLED: {
    flagKey: 'CROSS_DEVICE_SYNC_ENABLED',
    displayName: 'Cross-Device Sync',
    description: 'Sync data across multiple devices',
    category: 'premium',
    costImpact: 'high',
    requiresConsent: true,
    hipaaRelevant: true,
    canDisableInCrisis: false,
    dependencies: ['CLOUD_SYNC_ENABLED'],
    minimumPlan: 'family',
    rolloutStrategy: 'controlled'
  },
  AI_INSIGHTS_ENABLED: {
    flagKey: 'AI_INSIGHTS_ENABLED',
    displayName: 'AI Insights',
    description: 'Get personalized insights from AI',
    category: 'experimental',
    costImpact: 'variable',
    requiresConsent: true,
    hipaaRelevant: true,
    canDisableInCrisis: true,
    dependencies: ['CLOUD_SYNC_ENABLED', 'ANALYTICS_ENABLED'],
    minimumPlan: 'premium',
    rolloutStrategy: 'beta_only'
  },
  FAMILY_SHARING_ENABLED: {
    flagKey: 'FAMILY_SHARING_ENABLED',
    displayName: 'Family Sharing',
    description: 'Share appropriate data with family members',
    category: 'premium',
    costImpact: 'medium',
    requiresConsent: true,
    hipaaRelevant: true,
    canDisableInCrisis: false,
    dependencies: ['CLOUD_SYNC_ENABLED'],
    minimumPlan: 'family',
    rolloutStrategy: 'controlled'
  },
  EMERGENCY_CONTACTS_CLOUD: {
    flagKey: 'EMERGENCY_CONTACTS_CLOUD',
    displayName: 'Emergency Contacts Sync',
    description: 'Sync emergency contacts to cloud for crisis situations',
    category: 'core',
    costImpact: 'low',
    requiresConsent: true,
    hipaaRelevant: true,
    canDisableInCrisis: false,
    dependencies: ['CLOUD_SYNC_ENABLED'],
    minimumPlan: 'free',
    rolloutStrategy: 'gradual'
  },
  BACKUP_RESTORE_ENABLED: {
    flagKey: 'BACKUP_RESTORE_ENABLED',
    displayName: 'Backup & Restore',
    description: 'Backup and restore your data',
    category: 'premium',
    costImpact: 'medium',
    requiresConsent: true,
    hipaaRelevant: true,
    canDisableInCrisis: true,
    dependencies: ['CLOUD_SYNC_ENABLED'],
    minimumPlan: 'premium',
    rolloutStrategy: 'gradual'
  },
  BETA_FEATURES_ENABLED: {
    flagKey: 'BETA_FEATURES_ENABLED',
    displayName: 'Beta Features',
    description: 'Access experimental features (may be unstable)',
    category: 'experimental',
    costImpact: 'variable',
    requiresConsent: true,
    hipaaRelevant: false,
    canDisableInCrisis: true,
    dependencies: [],
    minimumPlan: 'free',
    rolloutStrategy: 'beta_only'
  },
  DEBUG_CLOUD_LOGS: {
    flagKey: 'DEBUG_CLOUD_LOGS',
    displayName: 'Debug Logging',
    description: 'Enable debug logging for troubleshooting',
    category: 'experimental',
    costImpact: 'low',
    requiresConsent: false,
    hipaaRelevant: false,
    canDisableInCrisis: true,
    dependencies: [],
    minimumPlan: 'free',
    rolloutStrategy: 'controlled'
  },
  STAGING_ENVIRONMENT: {
    flagKey: 'STAGING_ENVIRONMENT',
    displayName: 'Staging Environment',
    description: 'Use staging environment for testing',
    category: 'experimental',
    costImpact: 'none',
    requiresConsent: false,
    hipaaRelevant: false,
    canDisableInCrisis: true,
    dependencies: [],
    minimumPlan: 'free',
    rolloutStrategy: 'controlled'
  }
};

/**
 * Type guards for feature flag validation
 */
export const isP0CloudFeatureFlags = (flags: unknown): flags is P0CloudFeatureFlags => {
  try {
    P0CloudFeatureFlagsSchema.parse(flags);
    return true;
  } catch {
    return false;
  }
};

export const isFeatureFlagKey = (key: string): key is keyof P0CloudFeatureFlags => {
  return key in DEFAULT_FEATURE_FLAGS;
};

/**
 * Constants for feature flag system
 */
export const FEATURE_FLAG_CONSTANTS = {
  // Default values
  DEFAULT_ROLLOUT_PERCENTAGE: 0,
  DEFAULT_COST_LIMIT: 10, // USD per month
  DEFAULT_CONSENT: false,
  
  // Safety thresholds
  CRISIS_RESPONSE_MAX_MS: 200,
  MAX_ERROR_RATE: 0.05, // 5%
  MAX_LATENCY_MS: 1000,
  MIN_SUCCESS_RATE: 0.95, // 95%
  
  // Cost controls
  BUDGET_WARNING_THRESHOLD: 0.75, // 75%
  BUDGET_LIMIT_THRESHOLD: 0.85, // 85%
  BUDGET_HARD_STOP: 1.0, // 100%
  
  // Rollout phases
  ROLLOUT_PHASE_DURATION: 'P7D', // 7 days ISO 8601
  MAX_ROLLOUT_PHASES: 5,
  INITIAL_ROLLOUT_PERCENTAGE: 5,
  
  // Emergency controls
  EMERGENCY_ESCALATION_TIMEOUT: 300000, // 5 minutes
  AUTO_ROLLBACK_ENABLED: true,
  EMERGENCY_NOTIFICATION_DELAY: 60000, // 1 minute
  
  // Storage keys
  STORAGE_KEY_PREFIX: 'fullmind_feature_flags',
  METADATA_STORAGE_KEY: 'fullmind_feature_flags_metadata',
  CONSENT_STORAGE_KEY: 'fullmind_feature_flags_consent'
} as const;