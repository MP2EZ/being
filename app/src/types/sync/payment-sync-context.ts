/**
 * Payment-Aware Sync Context Type Definitions
 * Comprehensive type system for subscription-aware cloud synchronization
 *
 * CRITICAL CONSTRAINTS:
 * - All crisis operations must have <200ms response type constraints
 * - Subscription tier types must prevent unauthorized feature access
 * - Zero-PII types must exclude all personally identifiable information
 * - Performance types must validate SLA compliance
 */

import { z } from 'zod';
import type { SubscriptionTier, TrialState } from '../subscription';
import type { ClinicalImpactLevel, SyncStatus, SyncEntityType } from '../sync';

/**
 * Core Sync Priority System - 10-level priority queue
 * Level 10 = Crisis Emergency (<200ms guarantee)
 * Level 1 = Background operations
 */
export const SyncPrioritySchema = z.number().int().min(1).max(10);
export type SyncPriority = z.infer<typeof SyncPrioritySchema>;

/**
 * Crisis Safety Response Time Constraints
 * Enforces <200ms response time for emergency operations
 */
export const CrisisResponseTimeConstraintSchema = z.object({
  operationType: z.enum(['crisis_detection', 'emergency_sync', 'crisis_escalation', 'safety_validation']),
  maxResponseTimeMs: z.number().max(200), // Strict <200ms constraint
  guaranteedExecution: z.boolean().default(true),
  bypassSubscriptionLimits: z.boolean().default(true),
  overrideResourceConstraints: z.boolean().default(true)
});

export type CrisisResponseTimeConstraint = z.infer<typeof CrisisResponseTimeConstraintSchema>;

/**
 * Subscription Tier Sync Policies
 * Type-safe enforcement of tier-specific sync capabilities
 */
export const SubscriptionSyncPolicySchema = z.object({
  tier: z.enum(['trial', 'basic', 'premium', 'grace_period']),

  // Sync frequency constraints
  syncFrequencyMs: z.number().positive(),
  maxConcurrentSyncs: z.number().int().positive(),
  maxDailyOperations: z.number().int().positive(),

  // Data volume limits
  maxDataPerSync: z.number().positive(), // bytes
  maxStoragePerUser: z.number().positive(), // bytes

  // Feature access
  enabledSyncTypes: z.array(z.enum([
    'check_in_data',
    'assessment_data',
    'user_preferences',
    'crisis_plan',
    'therapeutic_progress',
    'advanced_analytics',
    'cross_device_state',
    'backup_restoration'
  ])),

  // Performance guarantees
  maxSyncLatencyMs: z.number().positive(),
  priorityBoostEnabled: z.boolean(),

  // Crisis overrides (always enabled regardless of tier)
  crisisOverrides: z.object({
    alwaysEnabled: z.boolean().default(true),
    maxCrisisResponseMs: z.number().max(200),
    unlimitedCrisisOperations: z.boolean().default(true)
  })
});

export type SubscriptionSyncPolicy = z.infer<typeof SubscriptionSyncPolicySchema>;

/**
 * Payment-Aware Sync Context
 * Core context containing subscription state and sync coordination
 */
export const PaymentSyncContextSchema = z.object({
  // Subscription context (ZERO-PII)
  subscriptionTier: z.enum(['trial', 'basic', 'premium', 'grace_period']),
  subscriptionStatus: z.enum(['active', 'past_due', 'canceled', 'incomplete', 'trialing']),

  // Payment status (NO payment details - only sync-relevant flags)
  paymentValid: z.boolean(),
  gracePeriodActive: z.boolean(),
  gracePeriodExpiresAt: z.string().optional(), // ISO timestamp

  // Trial context
  trialState: z.object({
    isActive: z.boolean(),
    daysRemaining: z.number().min(0),
    canExtendForCrisis: z.boolean(),
    extendedForCrisis: z.boolean()
  }).optional(),

  // Sync policy application
  appliedPolicy: SubscriptionSyncPolicySchema,
  policyLastUpdated: z.string(), // ISO timestamp

  // Crisis safety state
  crisisMode: z.object({
    active: z.boolean(),
    activatedAt: z.string().optional(), // ISO timestamp
    crisisLevel: z.enum(['mild', 'moderate', 'severe', 'emergency']).optional(),
    autoEscalated: z.boolean().default(false),
    overriddenLimits: z.array(z.string()).default([])
  }),

  // Performance monitoring
  performanceMetrics: z.object({
    averageResponseTimeMs: z.number(),
    crisisResponseTimes: z.array(z.number()), // Last 10 crisis response times
    subscriptionValidationLatency: z.number(),
    tierPolicyApplicationTime: z.number(),
    lastPerformanceCheck: z.string() // ISO timestamp
  }),

  // Context metadata (ZERO-PII)
  contextId: z.string().uuid(),
  deviceId: z.string(), // Pseudonymized device identifier
  sessionId: z.string().uuid(),
  lastUpdated: z.string(), // ISO timestamp
  version: z.number().int().positive()
});

export type PaymentSyncContext = z.infer<typeof PaymentSyncContextSchema>;

/**
 * Multi-Tier Priority Queue Operation
 * Type-safe operation with tier-specific constraints
 */
export const SyncQueueOperationSchema = z.object({
  // Operation identification
  operationId: z.string().uuid(),
  entityType: z.enum(['check_in', 'assessment', 'user_profile', 'crisis_plan', 'widget_data', 'session_data']),
  entityId: z.string(),

  // Priority and scheduling
  priority: SyncPrioritySchema,
  estimatedExecutionTimeMs: z.number().positive(),
  scheduledExecutionTime: z.string(), // ISO timestamp

  // Subscription context
  subscriptionContext: z.object({
    requiredTier: z.enum(['trial', 'basic', 'premium', 'grace_period']),
    bypassTierCheck: z.boolean().default(false), // For crisis operations
    gracePeriodAllowed: z.boolean().default(false)
  }),

  // Crisis safety flags
  crisisSafety: z.object({
    isCrisisOperation: z.boolean(),
    requiresImmediateExecution: z.boolean(),
    maxTolerableDelayMs: z.number().positive(),
    crisisEscalationTrigger: z.boolean().default(false)
  }),

  // Performance constraints
  performanceRequirements: z.object({
    maxExecutionTimeMs: z.number().positive(),
    requiresSLACompliance: z.boolean(),
    toleratesNetworkDelay: z.boolean(),
    canBeDeferred: z.boolean()
  }),

  // Data specifications (ZERO-PII)
  dataSpecification: z.object({
    estimatedSizeBytes: z.number().positive(),
    compressionEnabled: z.boolean(),
    encryptionRequired: z.boolean(),
    auditTrailRequired: z.boolean()
  }),

  // Dependencies and constraints
  dependencies: z.array(z.string().uuid()).default([]),
  conflictResolutionStrategy: z.enum(['client_wins', 'server_wins', 'merge', 'manual_resolution']),

  // Execution metadata
  createdAt: z.string(), // ISO timestamp
  lastAttemptAt: z.string().optional(), // ISO timestamp
  attemptCount: z.number().int().min(0).default(0),
  maxRetries: z.number().int().positive(),

  // Result tracking
  status: z.enum(['queued', 'executing', 'completed', 'failed', 'deferred', 'canceled']),
  resultMetadata: z.record(z.any()).optional()
});

export type SyncQueueOperation = z.infer<typeof SyncQueueOperationSchema>;

/**
 * Cross-Device Sync Coordination
 * Type-safe multi-device state management with therapeutic session preservation
 */
export const CrossDeviceSyncCoordinationSchema = z.object({
  // Coordination session
  coordinationSessionId: z.string().uuid(),
  activeDevices: z.array(z.object({
    deviceId: z.string(), // Pseudonymized
    deviceType: z.enum(['mobile', 'tablet', 'desktop', 'widget']),
    lastSeen: z.string(), // ISO timestamp
    syncCapabilities: z.array(z.string()),
    subscriptionTier: z.enum(['trial', 'basic', 'premium', 'grace_period']),
    isTherapeuticSessionActive: z.boolean(),
    crisisModeActive: z.boolean()
  })),

  // Therapeutic session preservation
  therapeuticSessions: z.array(z.object({
    sessionId: z.string().uuid(),
    sessionType: z.enum(['check_in', 'assessment', 'breathing', 'crisis_intervention']),
    deviceId: z.string(), // Primary device for session
    startedAt: z.string(), // ISO timestamp
    expectedDurationMs: z.number().positive(),
    preservationPriority: SyncPrioritySchema,
    requiresContinuity: z.boolean(),
    crisisSafetyRequired: z.boolean(),
    crossDeviceResumable: z.boolean()
  })),

  // Conflict resolution
  conflictResolution: z.object({
    activeConflicts: z.array(z.object({
      conflictId: z.string().uuid(),
      entityType: z.string(),
      entityId: z.string(),
      conflictingDevices: z.array(z.string()),
      resolutionStrategy: z.enum(['automatic', 'user_choice', 'therapeutic_priority', 'crisis_override']),
      therapeuticImpact: z.enum(['none', 'low', 'moderate', 'high', 'critical']),
      requiresImmediateResolution: z.boolean()
    })),
    automaticResolutionRules: z.record(z.string(), z.any())
  }),

  // Subscription coordination
  subscriptionCoordination: z.object({
    enforceTierLimits: z.boolean(),
    allowGracePeriodSync: z.boolean(),
    crisisOverrideActive: z.boolean(),
    tierMismatchHandling: z.enum(['restrict_to_lowest', 'allow_highest', 'device_specific'])
  }),

  // Performance optimization
  performanceOptimization: z.object({
    adaptiveBatchSizing: z.boolean(),
    networkQualityAware: z.boolean(),
    deviceCapabilityAware: z.boolean(),
    subscriptionTierOptimized: z.boolean()
  })
});

export type CrossDeviceSyncCoordination = z.infer<typeof CrossDeviceSyncCoordinationSchema>;

/**
 * Grace Period Management Types
 * Handles subscription grace period with continued sync access
 */
export const GracePeriodSyncManagementSchema = z.object({
  // Grace period state
  gracePeriodActive: z.boolean(),
  gracePeriodType: z.enum(['payment_failed', 'cancellation', 'downgrade', 'trial_expired']),
  gracePeriodStarted: z.string(), // ISO timestamp
  gracePeriodExpires: z.string(), // ISO timestamp
  gracePeriodDaysRemaining: z.number().min(0),

  // Sync policy during grace period
  gracePeriodPolicy: z.object({
    allowedSyncTypes: z.array(z.string()),
    reducedFrequency: z.boolean(),
    limitedDataVolume: z.boolean(),
    maintainCrisisAccess: z.boolean().default(true),
    preserveTherapeuticSessions: z.boolean().default(true)
  }),

  // Data retention policy
  dataRetention: z.object({
    retainCriticalData: z.boolean().default(true),
    criticalDataTypes: z.array(z.string()).default(['crisis_plan', 'assessment_data']),
    scheduledDeletionDate: z.string().optional(), // ISO timestamp
    warningIssued: z.boolean().default(false),
    finalWarningDate: z.string().optional() // ISO timestamp
  }),

  // Recovery options
  recoveryOptions: z.object({
    canReactivate: z.boolean(),
    reactivationDeadline: z.string().optional(), // ISO timestamp
    dataRecoveryAvailable: z.boolean(),
    requiresPaymentUpdate: z.boolean(),
    allowsTrialRestart: z.boolean()
  }),

  // User communication
  notificationSchedule: z.array(z.object({
    notificationType: z.enum(['warning', 'reminder', 'final_notice', 'data_deletion_notice']),
    scheduledFor: z.string(), // ISO timestamp
    sent: z.boolean().default(false),
    therapeuticTone: z.boolean().default(true)
  }))
});

export type GracePeriodSyncManagement = z.infer<typeof GracePeriodSyncManagementSchema>;

/**
 * Sync Context Performance Validation
 * Type-safe performance monitoring with SLA enforcement
 */
export const SyncPerformanceValidationSchema = z.object({
  // Performance metrics
  metrics: z.object({
    subscriptionValidationLatency: z.number(),
    tierPolicyApplicationTime: z.number(),
    queueOperationLatency: z.number(),
    crossDeviceCoordinationTime: z.number(),
    crisisResponseTime: z.number().max(200), // Enforced <200ms
    gracePeriodCheckTime: z.number()
  }),

  // SLA compliance
  slaCompliance: z.object({
    overallCompliance: z.number().min(0).max(1), // 0-1 score
    crisisResponseCompliance: z.number().min(0).max(1),
    subscriptionTierCompliance: z.number().min(0).max(1),
    crossDeviceCoordinationCompliance: z.number().min(0).max(1),

    // Violation tracking
    violations: z.array(z.object({
      violationType: z.enum(['crisis_response_timeout', 'tier_policy_delay', 'sync_latency_exceeded']),
      occurredAt: z.string(), // ISO timestamp
      impactLevel: z.enum(['low', 'medium', 'high', 'critical']),
      resolutionTime: z.number().optional(),
      therapeuticImpact: z.boolean()
    }))
  }),

  // Resource utilization
  resourceUtilization: z.object({
    memoryUsageBytes: z.number(),
    cpuUsagePercent: z.number().min(0).max(100),
    networkBandwidthUsed: z.number(),
    batteryImpactScore: z.number().min(0).max(1),
    subscriptionTierOptimized: z.boolean()
  }),

  // Performance optimization suggestions
  optimizationSuggestions: z.array(z.object({
    suggestionType: z.enum(['batch_optimization', 'priority_adjustment', 'tier_upgrade', 'device_coordination']),
    description: z.string(),
    estimatedImprovement: z.number().min(0).max(1),
    implementationComplexity: z.enum(['low', 'medium', 'high']),
    affectsTherapeuticExperience: z.boolean()
  }))
});

export type SyncPerformanceValidation = z.infer<typeof SyncPerformanceValidationSchema>;

/**
 * Type Guards for Runtime Validation
 */
export const isPaymentSyncContext = (value: unknown): value is PaymentSyncContext => {
  try {
    PaymentSyncContextSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isSyncQueueOperation = (value: unknown): value is SyncQueueOperation => {
  try {
    SyncQueueOperationSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isCrossDeviceSyncCoordination = (value: unknown): value is CrossDeviceSyncCoordination => {
  try {
    CrossDeviceSyncCoordinationSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isGracePeriodSyncManagement = (value: unknown): value is GracePeriodSyncManagement => {
  try {
    GracePeriodSyncManagementSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Constants for Payment-Aware Sync Context
 */
export const PAYMENT_SYNC_CONSTANTS = {
  // Crisis Response Time Guarantees
  MAX_CRISIS_RESPONSE_MS: 200,
  CRISIS_PRIORITY_LEVEL: 10,
  EMERGENCY_SYNC_TIMEOUT_MS: 5000,

  // Subscription Tier Sync Frequencies
  TIER_SYNC_FREQUENCIES: {
    trial: 30000,      // 30 seconds
    basic: 60000,      // 1 minute
    premium: 15000,    // 15 seconds
    grace_period: 120000 // 2 minutes
  } as const,

  // Performance SLA Thresholds
  SLA_THRESHOLDS: {
    subscription_validation_ms: 100,
    tier_policy_application_ms: 50,
    cross_device_coordination_ms: 300,
    crisis_response_ms: 200
  } as const,

  // Queue Priority Mappings
  PRIORITY_MAPPINGS: {
    crisis_emergency: 10,
    assessment_critical: 9,
    therapeutic_session: 8,
    user_profile_update: 7,
    check_in_data: 6,
    preference_sync: 5,
    analytics_data: 4,
    backup_operation: 3,
    archive_cleanup: 2,
    background_maintenance: 1
  } as const,

  // Grace Period Defaults
  GRACE_PERIOD: {
    default_days: 7,
    warning_days_before_expiry: 3,
    final_warning_days: 1,
    data_retention_days_after_expiry: 30
  } as const
} as const;