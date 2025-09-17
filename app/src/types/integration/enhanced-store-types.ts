/**
 * Enhanced Store Integration Type Definitions
 * P0-CLOUD Platform Infrastructure - TypeScript Implementation
 *
 * Comprehensive store integration types for:
 * - Orchestration engine integration with Zustand stores
 * - Cross-store coordination with conflict resolution
 * - Subscription tier enforcement at store level
 * - Crisis-safe store operations with emergency fallbacks
 * - Performance monitoring for store operations
 */

import { z } from 'zod';
import type { StateCreator, StoreMutatorIdentifier } from 'zustand';
import type {
  SyncableData,
  SyncOperation,
  SyncMetadata
} from '../sync';
import type {
  SubscriptionTier,
  SubscriptionState
} from '../subscription';
import type {
  OrchestrationEngine,
  OrchestrationOperation,
  OrchestrationPriority
} from '../orchestration/sync-orchestration-types';
import type {
  ConflictResolutionService,
  ConflictDescriptor
} from '../orchestration/conflict-resolution-types';
import type {
  PerformanceMonitorService,
  PerformanceMetric
} from '../orchestration/performance-monitoring-types';

/**
 * ENHANCED STORE BASE TYPES
 */

/**
 * Store identification and metadata
 */
export const StoreMetadataSchema = z.object({
  // Store identification
  storeId: z.string(),
  storeName: z.string(),
  storeVersion: z.string(),

  // Store configuration
  storeConfig: z.object({
    persistEnabled: z.boolean(),
    syncEnabled: z.boolean(),
    conflictResolutionEnabled: z.boolean(),
    performanceMonitoringEnabled: z.boolean(),
    subscriptionEnforcementEnabled: z.boolean(),

    // Store capabilities
    capabilities: z.object({
      supportsCrossDeviceSync: z.boolean(),
      supportsOfflineMode: z.boolean(),
      supportsRealTimeSync: z.boolean(),
      supportsCrisisMode: z.boolean(),
      supportsEncryption: z.boolean()
    }),

    // Performance requirements
    performanceRequirements: z.object({
      maxOperationTime: z.number(), // milliseconds
      crisisOperationMaxTime: z.number().default(200), // milliseconds
      subscriptionValidationTime: z.number().default(50), // milliseconds
      conflictResolutionMaxTime: z.number().default(1000) // milliseconds
    })
  }),

  // Store lifecycle
  lifecycle: z.object({
    createdAt: z.string(), // ISO timestamp
    lastUpdated: z.string(), // ISO timestamp
    version: z.number(),
    migrationVersion: z.number().optional(),
    isInitialized: z.boolean()
  }),

  // Integration status
  integrations: z.object({
    orchestrationEngine: z.boolean(),
    conflictResolution: z.boolean(),
    performanceMonitoring: z.boolean(),
    subscriptionEnforcement: z.boolean(),
    crossStoreCoordination: z.boolean()
  })
});

export type StoreMetadata = z.infer<typeof StoreMetadataSchema>;

/**
 * Store operation context with orchestration integration
 */
export const StoreOperationContextSchema = z.object({
  // Operation identification
  operationId: z.string(),
  operationType: z.enum([
    'read',
    'write',
    'update',
    'delete',
    'sync',
    'conflict_resolution',
    'subscription_validation',
    'performance_check',
    'crisis_operation'
  ]),

  // Orchestration context
  orchestrationContext: z.object({
    priority: z.nativeEnum(OrchestrationPriority),
    orchestrationId: z.string().optional(),
    requiresOrchestration: z.boolean(),
    bypassQueue: z.boolean(), // For crisis operations

    // Performance requirements
    performanceRequirements: z.object({
      maxExecutionTime: z.number(), // milliseconds
      crisisMode: z.boolean(),
      realTimeRequired: z.boolean(),
      subscriptionValidationRequired: z.boolean()
    })
  }),

  // User and session context
  userContext: z.object({
    userId: z.string().optional(),
    deviceId: z.string().optional(),
    sessionId: z.string().optional(),
    subscriptionTier: z.enum(['free', 'premium', 'family', 'enterprise']).optional(),

    // Therapeutic context
    therapeuticContext: z.object({
      sessionActive: z.boolean(),
      sessionType: z.enum(['morning', 'midday', 'evening', 'crisis', 'assessment']).optional(),
      crisisMode: z.boolean(),
      assessmentInProgress: z.boolean()
    }).optional()
  }),

  // Data context
  dataContext: z.object({
    entityType: z.string(),
    entityIds: z.array(z.string()),
    dataSize: z.number(), // bytes
    containsHealthData: z.boolean(),
    containsCrisisData: z.boolean(),
    requiresEncryption: z.boolean(),

    // Synchronization requirements
    syncRequirements: z.object({
      requiresCrossDeviceSync: z.boolean(),
      requiresConflictResolution: z.boolean(),
      allowsPartialSync: z.boolean(),
      syncPriority: z.nativeEnum(OrchestrationPriority)
    })
  }),

  // Performance tracking
  performanceContext: z.object({
    startTime: z.string(), // ISO timestamp
    expectedDuration: z.number(), // milliseconds
    performanceTracking: z.boolean(),
    performanceSessionId: z.string().optional(),

    // SLA requirements
    slaRequirements: z.object({
      responseTimeSLA: z.number(), // milliseconds
      subscriptionTierSLA: z.boolean(),
      crisisSLA: z.boolean()
    })
  })
});

export type StoreOperationContext = z.infer<typeof StoreOperationContextSchema>;

/**
 * ORCHESTRATION-INTEGRATED STORE INTERFACE
 */

/**
 * Enhanced store state with orchestration integration
 */
export interface OrchestrationIntegratedStoreState {
  // Store metadata
  readonly _storeMetadata: StoreMetadata;

  // Orchestration integration
  readonly _orchestration: {
    readonly engine: OrchestrationEngine | null;
    readonly isIntegrated: boolean;
    readonly pendingOperations: OrchestrationOperation[];
    readonly lastOrchestrationUpdate: string; // ISO timestamp
  };

  // Conflict resolution integration
  readonly _conflictResolution: {
    readonly service: ConflictResolutionService | null;
    readonly isEnabled: boolean;
    readonly activeConflicts: ConflictDescriptor[];
    readonly lastConflictResolution: string | null; // ISO timestamp
  };

  // Performance monitoring integration
  readonly _performanceMonitoring: {
    readonly service: PerformanceMonitorService | null;
    readonly isEnabled: boolean;
    readonly currentMetrics: PerformanceMetric[];
    readonly lastPerformanceCheck: string | null; // ISO timestamp
  };

  // Cross-store coordination
  readonly _crossStoreCoordination: {
    readonly coordinatedStores: string[]; // Store IDs
    readonly coordinationEnabled: boolean;
    readonly lastCoordinationUpdate: string | null; // ISO timestamp
  };

  // Store health and status
  readonly _storeHealth: {
    readonly status: 'healthy' | 'degraded' | 'critical' | 'error';
    readonly healthScore: number; // 0-100
    readonly lastHealthCheck: string; // ISO timestamp
    readonly performanceScore: number; // 0-100
    readonly conflictResolutionScore: number; // 0-100
  };
}

/**
 * Enhanced store actions with orchestration integration
 */
export interface OrchestrationIntegratedStoreActions {
  // Orchestration integration
  _integrateWithOrchestration: (engine: OrchestrationEngine) => Promise<void>;
  _executeOrchestrated: <T>(
    operation: StoreOperationContext,
    executor: () => Promise<T>,
    fallback?: T
  ) => Promise<T>;
  _queueOrchestrationOperation: (operation: OrchestrationOperation) => Promise<void>;

  // Conflict resolution integration
  _integrateConflictResolution: (service: ConflictResolutionService) => Promise<void>;
  _resolveStoreConflict: (conflictId: string) => Promise<void>;
  _detectAndResolveConflicts: (data: SyncableData[]) => Promise<ConflictDescriptor[]>;

  // Performance monitoring integration
  _integratePerformanceMonitoring: (service: PerformanceMonitorService) => Promise<void>;
  _measureStoreOperation: <T>(
    operation: StoreOperationContext,
    executor: () => Promise<T>
  ) => Promise<T>;
  _validatePerformanceSLA: (operation: StoreOperationContext, duration: number) => boolean;

  // Cross-store coordination
  _coordinateWithStores: (storeIds: string[], operation: StoreOperationContext) => Promise<void>;
  _notifyStoreUpdate: (updateType: string, data: unknown) => Promise<void>;
  _handleCrossStoreConflict: (conflictId: string, stores: string[]) => Promise<void>;

  // Crisis-safe operations
  _executeCrisisSafe: <T>(
    operation: StoreOperationContext,
    executor: () => Promise<T>,
    emergencyFallback: T
  ) => Promise<T>;
  _activateCrisisMode: () => Promise<void>;
  _deactivateCrisisMode: () => Promise<void>;

  // Subscription enforcement
  _validateSubscriptionAccess: (
    operation: StoreOperationContext,
    subscriptionTier: SubscriptionTier
  ) => Promise<boolean>;
  _enforceSubscriptionLimits: (operation: StoreOperationContext) => Promise<boolean>;

  // Health and monitoring
  _checkStoreHealth: () => Promise<void>;
  _getStoreMetrics: () => Promise<PerformanceMetric[]>;
  _exportStoreAuditLog: (startDate: string, endDate: string) => Promise<unknown[]>;
}

/**
 * Complete orchestration-integrated store interface
 */
export interface OrchestrationIntegratedStore extends OrchestrationIntegratedStoreState, OrchestrationIntegratedStoreActions {
  // Store initialization
  _initializeStore: (config: Partial<StoreMetadata>) => Promise<void>;
  _destroyStore: () => Promise<void>;

  // Type-safe operation execution
  _executeStoreOperation: <T>(
    operation: StoreOperationContext,
    executor: () => Promise<T>,
    options?: {
      fallback?: T;
      crisisMode?: boolean;
      performanceTracking?: boolean;
      conflictResolution?: boolean;
    }
  ) => Promise<T>;
}

/**
 * SPECIFIC STORE INTEGRATIONS
 */

/**
 * User store integration with orchestration
 */
export interface UserStoreOrchestrationIntegration extends OrchestrationIntegratedStore {
  // User-specific orchestrated operations
  updateUserProfileOrchestrated: (
    updates: Partial<unknown>,
    context: StoreOperationContext
  ) => Promise<void>;

  syncUserPreferencesOrchestrated: (
    preferences: unknown,
    context: StoreOperationContext
  ) => Promise<void>;

  validateUserSubscriptionOrchestrated: (
    userId: string,
    context: StoreOperationContext
  ) => Promise<SubscriptionState>;

  // Crisis-specific user operations
  updateCrisisPlanCrisisSafe: (
    crisisPlan: unknown,
    context: StoreOperationContext
  ) => Promise<void>;

  emergencyUserDataAccessCrisisSafe: (
    userId: string,
    context: StoreOperationContext
  ) => Promise<unknown>;
}

/**
 * Assessment store integration with clinical data protection
 */
export interface AssessmentStoreOrchestrationIntegration extends OrchestrationIntegratedStore {
  // Assessment-specific orchestrated operations
  storeAssessmentResultOrchestrated: (
    assessment: unknown,
    context: StoreOperationContext
  ) => Promise<void>;

  calculateScoreWithOrchestration: (
    assessmentId: string,
    context: StoreOperationContext
  ) => Promise<number>;

  detectCrisisFromAssessmentOrchestrated: (
    assessment: unknown,
    context: StoreOperationContext
  ) => Promise<boolean>;

  // Clinical accuracy preservation
  preserveClinicalAccuracy: (
    assessmentData: unknown,
    context: StoreOperationContext
  ) => Promise<void>;

  // Crisis threshold validation
  validateCrisisThresholdsOrchestrated: (
    scores: number[],
    context: StoreOperationContext
  ) => Promise<{ crisisDetected: boolean; crisisLevel: string }>;
}

/**
 * Check-in store integration with therapeutic session coordination
 */
export interface CheckInStoreOrchestrationIntegration extends OrchestrationIntegratedStore {
  // Check-in specific orchestrated operations
  storeCheckInOrchestrated: (
    checkIn: unknown,
    context: StoreOperationContext
  ) => Promise<void>;

  syncTherapeuticSessionOrchestrated: (
    sessionId: string,
    sessionData: unknown,
    context: StoreOperationContext
  ) => Promise<void>;

  preserveSessionContinuityOrchestrated: (
    sessionId: string,
    context: StoreOperationContext
  ) => Promise<void>;

  // Mood tracking with conflict resolution
  updateMoodDataWithConflictResolution: (
    moodData: unknown,
    context: StoreOperationContext
  ) => Promise<void>;

  // Cross-device session coordination
  coordinateSessionAcrossDevices: (
    sessionId: string,
    deviceIds: string[],
    context: StoreOperationContext
  ) => Promise<void>;
}

/**
 * Subscription store integration with payment orchestration
 */
export interface SubscriptionStoreOrchestrationIntegration extends OrchestrationIntegratedStore {
  // Subscription-specific orchestrated operations
  updateSubscriptionStatusOrchestrated: (
    subscriptionData: unknown,
    context: StoreOperationContext
  ) => Promise<void>;

  validateFeatureAccessOrchestrated: (
    featureId: string,
    userId: string,
    context: StoreOperationContext
  ) => Promise<boolean>;

  handleSubscriptionChangeOrchestrated: (
    oldTier: SubscriptionTier,
    newTier: SubscriptionTier,
    context: StoreOperationContext
  ) => Promise<void>;

  // Payment integration
  processPaymentWebhookOrchestrated: (
    webhookData: unknown,
    context: StoreOperationContext
  ) => Promise<void>;

  // Crisis access override
  enableCrisisAccessOverride: (
    userId: string,
    reason: string,
    context: StoreOperationContext
  ) => Promise<void>;
}

/**
 * Payment store integration with crisis safety
 */
export interface PaymentStoreOrchestrationIntegration extends OrchestrationIntegratedStore {
  // Payment-specific orchestrated operations
  processPaymentOrchestrated: (
    paymentData: unknown,
    context: StoreOperationContext
  ) => Promise<{ success: boolean; paymentId: string }>;

  handlePaymentFailureOrchestrated: (
    failureData: unknown,
    context: StoreOperationContext
  ) => Promise<void>;

  syncPaymentStatusOrchestrated: (
    paymentId: string,
    context: StoreOperationContext
  ) => Promise<void>;

  // Crisis payment handling
  processCrisisPaymentOverride: (
    userId: string,
    reason: string,
    context: StoreOperationContext
  ) => Promise<void>;

  // Subscription billing integration
  handleBillingWebhookOrchestrated: (
    webhookData: unknown,
    context: StoreOperationContext
  ) => Promise<void>;
}

/**
 * CROSS-STORE COORDINATION TYPES
 */

/**
 * Cross-store coordination event
 */
export const CrossStoreCoordinationEventSchema = z.object({
  // Event identification
  eventId: z.string(),
  eventType: z.enum([
    'store_update',
    'conflict_detected',
    'subscription_change',
    'crisis_activated',
    'performance_violation',
    'sync_required',
    'health_check',
    'coordination_failure'
  ]),

  // Source store information
  sourceStore: z.object({
    storeId: z.string(),
    storeName: z.string(),
    operation: z.string(),
    operationId: z.string()
  }),

  // Target stores
  targetStores: z.array(z.string()), // Store IDs

  // Event data
  eventData: z.record(z.string(), z.unknown()),

  // Coordination requirements
  coordination: z.object({
    requiresImmediateCoordination: z.boolean(),
    coordinationTimeout: z.number(), // milliseconds
    allowPartialCoordination: z.boolean(),
    coordinationPriority: z.nativeEnum(OrchestrationPriority),

    // Performance requirements
    maxCoordinationTime: z.number().default(5000), // milliseconds
    crisisCoordination: z.boolean(),
    subscriptionValidationRequired: z.boolean()
  }),

  // Event metadata
  metadata: z.object({
    timestamp: z.string(), // ISO timestamp
    userId: z.string().optional(),
    deviceId: z.string().optional(),
    sessionId: z.string().optional(),
    subscriptionTier: z.enum(['free', 'premium', 'family', 'enterprise']).optional(),

    // Performance tracking
    expectedCoordinationTime: z.number().optional(), // milliseconds
    performanceSessionId: z.string().optional()
  })
});

export type CrossStoreCoordinationEvent = z.infer<typeof CrossStoreCoordinationEventSchema>;

/**
 * Cross-store coordination result
 */
export const CrossStoreCoordinationResultSchema = z.object({
  // Result identification
  resultId: z.string(),
  eventId: z.string(),
  coordinationStarted: z.string(), // ISO timestamp
  coordinationCompleted: z.string(), // ISO timestamp
  coordinationDuration: z.number(), // milliseconds

  // Coordination outcome
  success: z.boolean(),
  partialSuccess: z.boolean(),
  coordinatedStores: z.array(z.string()), // Successfully coordinated store IDs
  failedStores: z.array(z.object({
    storeId: z.string(),
    errorMessage: z.string(),
    retryable: z.boolean()
  })),

  // Performance metrics
  performance: z.object({
    totalCoordinationTime: z.number(), // milliseconds
    averageStoreResponseTime: z.number(), // milliseconds
    slowestStoreTime: z.number(), // milliseconds
    fastestStoreTime: z.number(), // milliseconds
    performanceSLAMet: z.boolean()
  }),

  // Conflict resolution (if applicable)
  conflictResolution: z.object({
    conflictsDetected: z.number(),
    conflictsResolved: z.number(),
    conflictsRequiringAttention: z.number(),
    resolutionTime: z.number() // milliseconds
  }).optional(),

  // Quality metrics
  quality: z.object({
    dataConsistencyAchieved: z.boolean(),
    noDataLoss: z.boolean(),
    therapeuticContinuityPreserved: z.boolean(),
    clinicalAccuracyMaintained: z.boolean(),
    subscriptionEnforcementMaintained: z.boolean()
  })
});

export type CrossStoreCoordinationResult = z.infer<typeof CrossStoreCoordinationResultSchema>;

/**
 * STORE INTEGRATION CONFIGURATION
 */

/**
 * Enhanced store configuration with orchestration integration
 */
export const EnhancedStoreConfigSchema = z.object({
  // Basic store configuration
  storeId: z.string(),
  storeName: z.string(),
  storeType: z.enum(['user', 'assessment', 'checkin', 'subscription', 'payment', 'crisis']),

  // Orchestration integration configuration
  orchestrationIntegration: z.object({
    enabled: z.boolean().default(true),
    priority: z.nativeEnum(OrchestrationPriority).default(OrchestrationPriority.normal_data_sync),
    queueOperations: z.boolean().default(true),
    allowBypass: z.boolean().default(false), // Only for crisis operations

    // Performance requirements
    maxOperationTime: z.number().default(1000), // milliseconds
    crisisOperationMaxTime: z.number().default(200), // milliseconds
    batchOperations: z.boolean().default(true)
  }),

  // Conflict resolution configuration
  conflictResolution: z.object({
    enabled: z.boolean().default(true),
    autoResolve: z.boolean().default(true),
    preserveTherapeuticData: z.boolean().default(true),
    preserveClinicalAccuracy: z.boolean().default(true),

    // Resolution strategies
    defaultStrategy: z.enum([
      'last_write_wins',
      'preserve_therapeutic',
      'user_prompt',
      'ai_assisted',
      'preserve_clinical_accuracy'
    ]).default('preserve_therapeutic'),

    // Timeout configuration
    resolutionTimeout: z.number().default(10000) // milliseconds
  }),

  // Performance monitoring configuration
  performanceMonitoring: z.object({
    enabled: z.boolean().default(true),
    trackAllOperations: z.boolean().default(false),
    trackCrisisOperations: z.boolean().default(true),
    trackSubscriptionOperations: z.boolean().default(true),

    // Alert thresholds
    responseTimeThreshold: z.number().default(1000), // milliseconds
    errorRateThreshold: z.number().default(1), // percentage
    memoryUsageThreshold: z.number().default(80) // percentage
  }),

  // Cross-store coordination configuration
  crossStoreCoordination: z.object({
    enabled: z.boolean().default(true),
    coordinatedStores: z.array(z.string()).default([]), // Store IDs to coordinate with
    coordinationTimeout: z.number().default(5000), // milliseconds
    requiresConsensus: z.boolean().default(false),

    // Coordination triggers
    coordinationTriggers: z.array(z.enum([
      'data_update',
      'subscription_change',
      'crisis_activation',
      'conflict_detected',
      'performance_violation'
    ])).default(['data_update', 'subscription_change', 'crisis_activation'])
  }),

  // Subscription enforcement configuration
  subscriptionEnforcement: z.object({
    enabled: z.boolean().default(true),
    enforceQuotas: z.boolean().default(true),
    allowGracePeriod: z.boolean().default(true),
    gracePeriodDuration: z.number().default(300000), // 5 minutes

    // Crisis override
    allowCrisisOverride: z.boolean().default(true),
    crisisOverrideDuration: z.number().default(3600000) // 1 hour
  }),

  // Crisis handling configuration
  crisisHandling: z.object({
    enabled: z.boolean().default(true),
    strictResponseTime: z.boolean().default(true),
    emergencyFallbacks: z.boolean().default(true),
    bypassNormalValidation: z.boolean().default(true),

    // Crisis data protection
    preserveAllCrisisData: z.boolean().default(true),
    allowEmergencyAccess: z.boolean().default(true),
    auditCrisisOperations: z.boolean().default(true)
  }),

  // Data protection and compliance
  dataProtection: z.object({
    encryptSensitiveData: z.boolean().default(true),
    auditDataAccess: z.boolean().default(true),
    hipaaCompliant: z.boolean().default(true),
    retentionPolicyEnabled: z.boolean().default(true),

    // Data classification
    dataClassification: z.enum(['public', 'internal', 'confidential', 'restricted']).default('confidential'),
    requiresEncryption: z.boolean().default(true),
    requiresAuditTrail: z.boolean().default(true)
  })
});

export type EnhancedStoreConfig = z.infer<typeof EnhancedStoreConfigSchema>;

/**
 * CONSTANTS AND TYPE GUARDS
 */
export const ENHANCED_STORE_CONSTANTS = {
  // Performance requirements
  MAX_STORE_OPERATION_TIME: 1000, // milliseconds
  CRISIS_STORE_OPERATION_MAX_TIME: 200, // milliseconds
  CROSS_STORE_COORDINATION_MAX_TIME: 5000, // milliseconds

  // Health thresholds
  HEALTHY_STORE_SCORE: 80,
  DEGRADED_STORE_SCORE: 60,
  CRITICAL_STORE_SCORE: 40,

  // Subscription enforcement
  SUBSCRIPTION_VALIDATION_MAX_TIME: 50, // milliseconds
  GRACE_PERIOD_DEFAULT: 300000, // 5 minutes
  CRISIS_OVERRIDE_DURATION: 3600000, // 1 hour

  // Conflict resolution
  MAX_CONFLICT_RESOLUTION_TIME: 10000, // milliseconds
  AUTO_RESOLUTION_CONFIDENCE_THRESHOLD: 0.8,

  // Cross-store coordination
  MAX_COORDINATED_STORES: 10,
  COORDINATION_RETRY_COUNT: 2,
  COORDINATION_BATCH_SIZE: 5
} as const;

/**
 * Type guards for enhanced store types
 */
export const isStoreMetadata = (value: unknown): value is StoreMetadata => {
  try {
    StoreMetadataSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isStoreOperationContext = (value: unknown): value is StoreOperationContext => {
  try {
    StoreOperationContextSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isCrossStoreCoordinationEvent = (value: unknown): value is CrossStoreCoordinationEvent => {
  try {
    CrossStoreCoordinationEventSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Export schemas for runtime validation
 */
export default {
  StoreMetadataSchema,
  StoreOperationContextSchema,
  CrossStoreCoordinationEventSchema,
  CrossStoreCoordinationResultSchema,
  EnhancedStoreConfigSchema,

  // Type guards
  isStoreMetadata,
  isStoreOperationContext,
  isCrossStoreCoordinationEvent,

  // Constants
  ENHANCED_STORE_CONSTANTS
};