/**
 * Webhook Sync Integration Types
 * Integration layer between Day 18 webhook system and payment-aware sync context
 *
 * CRITICAL CONSTRAINTS:
 * - All webhook-triggered sync operations must respect subscription tiers
 * - Crisis webhooks bypass all subscription limitations
 * - Webhook processing must maintain <200ms crisis response times
 * - Zero-PII enforcement in all webhook sync metadata
 */

import { z } from 'zod';
import type { WebhookEvent, WebhookEventType } from '../webhook';
import type { 
  SyncPriorityLevel as PriorityLevel,
  CrisisSyncCoordination,
  SyncOperation 
} from '../cross-device-sync-canonical';
import type { StrictSubscriptionTier } from '../sync/subscription-tier-types';
import type { CrisisSeverity } from '../sync/crisis-safety-types';

/**
 * Webhook-Triggered Sync Operation
 * Maps webhook events to sync operations with subscription awareness
 */
export const WebhookSyncOperationSchema = z.object({
  // Operation identification
  syncOperationId: z.string().uuid(),
  webhookEventId: z.string().uuid(),
  webhookEventType: z.enum([
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
    'subscription.trial_will_end',
    'customer.created',
    'payment_method.attached'
  ]),

  // Sync operation mapping
  syncOperationMapping: z.object({
    targetSyncOperation: z.enum([
      'subscription_tier_update',
      'payment_status_sync',
      'feature_access_refresh',
      'trial_status_update',
      'grace_period_activation',
      'user_profile_sync',
      'subscription_cache_invalidation',
      'billing_history_sync'
    ]),
    priority: z.number().int().min(1).max(10),
    requiresImmediateExecution: z.boolean(),
    bypassSubscriptionLimits: z.boolean().default(false)
  }),

  // Subscription context from webhook
  subscriptionContext: z.object({
    customerId: z.string(), // Pseudonymized customer ID
    subscriptionId: z.string().optional(),
    previousTier: z.enum(['trial', 'basic', 'premium', 'grace_period']).optional(),
    newTier: z.enum(['trial', 'basic', 'premium', 'grace_period']),
    effectiveDate: z.string(), // ISO timestamp

    // Transition metadata
    transitionType: z.enum([
      'tier_upgrade',
      'tier_downgrade',
      'trial_start',
      'trial_end',
      'grace_period_start',
      'grace_period_end',
      'subscription_activation',
      'subscription_cancellation',
      'payment_success',
      'payment_failure'
    ]),

    // Sync requirements
    requiresDataMigration: z.boolean().default(false),
    requiresFeatureGateRefresh: z.boolean().default(true),
    requiresCacheInvalidation: z.boolean().default(true)
  }),

  // Crisis context (if webhook relates to crisis situation)
  crisisContext: z.object({
    isCrisisRelated: z.boolean().default(false),
    crisisSeverity: z.enum(['none', 'mild', 'moderate', 'severe', 'emergency']).default('none'),
    requiresEmergencySync: z.boolean().default(false),
    preserveTherapeuticAccess: z.boolean().default(false),

    // Crisis-specific sync requirements
    crisisSyncRequirements: z.object({
      maintainEmergencyAccess: z.boolean().default(false),
      extendGracePeriod: z.boolean().default(false),
      unlockCrisisFeatures: z.array(z.string()).default([]),
      maxResponseTimeMs: z.number().positive().optional()
    }).optional()
  }).optional(),

  // Performance requirements
  performanceRequirements: z.object({
    maxProcessingTimeMs: z.number().positive(),
    requiresRealTimeProcessing: z.boolean(),
    toleratesDelay: z.boolean(),
    requiresOrderedProcessing: z.boolean(),

    // Webhook-specific performance
    webhookAcknowledgmentTimeoutMs: z.number().positive().default(30000),
    maxRetryAttempts: z.number().int().min(0).default(3),
    retryBackoffMs: z.number().positive().default(1000)
  }),

  // Data transformation specifications
  dataTransformation: z.object({
    // Source webhook data (ZERO-PII)
    sourceDataKeys: z.array(z.string()),
    targetSyncDataStructure: z.record(z.string(), z.any()),

    // PII filtering
    piiFiltering: z.object({
      enablePIIFilter: z.boolean().default(true),
      allowedDataFields: z.array(z.string()),
      excludedDataFields: z.array(z.string()).default(['email', 'name', 'address', 'phone']),
      pseudonymizationRequired: z.boolean().default(true)
    }),

    // Data validation
    dataValidation: z.object({
      validateSubscriptionData: z.boolean().default(true),
      validateTierTransition: z.boolean().default(true),
      validateEffectiveDate: z.boolean().default(true),
      strictModeEnabled: z.boolean().default(true)
    })
  }),

  // Execution metadata
  executionMetadata: z.object({
    createdAt: z.string(), // ISO timestamp
    scheduledExecutionTime: z.string(), // ISO timestamp
    webhookReceivedAt: z.string(), // ISO timestamp
    processingStartedAt: z.string().optional(), // ISO timestamp
    completedAt: z.string().optional(), // ISO timestamp

    // Processing results
    processingResult: z.enum(['pending', 'success', 'failure', 'partial_success', 'skipped']).optional(),
    syncOperationsTriggered: z.array(z.string().uuid()).default([]),
    errorDetails: z.string().optional(),

    // Performance tracking
    webhookProcessingTimeMs: z.number().optional(),
    syncOperationLatencyMs: z.number().optional(),
    totalOperationTimeMs: z.number().optional()
  })
});

export type WebhookSyncOperation = z.infer<typeof WebhookSyncOperationSchema>;

/**
 * Webhook-to-Sync Mapping Configuration
 * Defines how webhook events map to sync operations
 */
export const WebhookSyncMappingSchema = z.object({
  // Mapping identification
  mappingId: z.string().uuid(),
  webhookEventType: z.string(),
  description: z.string(),

  // Sync operation specifications
  syncOperationSpecs: z.array(z.object({
    operationType: z.string(),
    priority: z.number().int().min(1).max(10),
    subscriptionTierRequirements: z.array(z.enum(['trial', 'basic', 'premium', 'grace_period'])).optional(),

    // Conditional execution
    conditionalExecution: z.object({
      executeIf: z.array(z.object({
        condition: z.enum([
          'tier_change',
          'payment_status_change',
          'trial_status_change',
          'grace_period_activation',
          'crisis_mode_active',
          'feature_access_change'
        ]),
        value: z.any(),
        operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'not_contains'])
      })),
      skipIf: z.array(z.object({
        condition: z.string(),
        value: z.any()
      })).default([])
    }).optional(),

    // Data mapping
    dataMapping: z.object({
      sourceFields: z.record(z.string(), z.string()), // webhook_field -> sync_field
      transformations: z.array(z.object({
        field: z.string(),
        transformation: z.enum(['pseudonymize', 'encrypt', 'hash', 'truncate', 'normalize']),
        parameters: z.record(z.string(), z.any()).optional()
      })).default([]),
      defaultValues: z.record(z.string(), z.any()).default({})
    })
  })),

  // Performance configuration
  performanceConfig: z.object({
    batchProcessing: z.boolean().default(false),
    maxBatchSize: z.number().int().positive().default(1),
    processingTimeoutMs: z.number().positive().default(30000),
    enableCaching: z.boolean().default(true),
    cacheExpirationMs: z.number().positive().default(300000) // 5 minutes
  }),

  // Error handling
  errorHandling: z.object({
    retryPolicy: z.object({
      enableRetry: z.boolean().default(true),
      maxRetries: z.number().int().min(0).default(3),
      retryDelayMs: z.number().positive().default(1000),
      exponentialBackoff: z.boolean().default(true)
    }),

    failureHandling: z.object({
      onFailure: z.enum(['skip', 'retry', 'escalate', 'fallback', 'manual_intervention']),
      fallbackSyncOperation: z.string().optional(),
      notifyOnFailure: z.boolean().default(true),
      preserveWebhookData: z.boolean().default(true)
    }),

    deadLetterQueue: z.object({
      enableDLQ: z.boolean().default(true),
      maxDLQSize: z.number().int().positive().default(1000),
      dlqRetentionDays: z.number().int().positive().default(7)
    })
  })
});

export type WebhookSyncMapping = z.infer<typeof WebhookSyncMappingSchema>;

/**
 * Subscription State Sync from Webhooks
 * Manages subscription state updates triggered by webhook events
 */
export const SubscriptionStateSyncSchema = z.object({
  // Sync identification
  syncId: z.string().uuid(),
  triggeredByWebhook: z.string().uuid(),
  subscriptionId: z.string(),

  // State changes
  stateChanges: z.object({
    previousState: z.object({
      tier: z.enum(['trial', 'basic', 'premium', 'grace_period']).optional(),
      status: z.string().optional(),
      trialActive: z.boolean().optional(),
      gracePeriodActive: z.boolean().optional()
    }),

    newState: z.object({
      tier: z.enum(['trial', 'basic', 'premium', 'grace_period']),
      status: z.string(),
      trialActive: z.boolean(),
      trialDaysRemaining: z.number().int().min(0).optional(),
      gracePeriodActive: z.boolean(),
      gracePeriodDaysRemaining: z.number().int().min(0).optional(),
      effectiveDate: z.string() // ISO timestamp
    }),

    // Impact assessment
    impactAssessment: z.object({
      affectedFeatures: z.array(z.string()),
      featureAccessChanges: z.record(z.string(), z.boolean()),
      syncPolicyChanges: z.boolean(),
      requiresUserNotification: z.boolean(),
      requiresUIRefresh: z.boolean()
    })
  }),

  // Sync execution plan
  syncExecutionPlan: z.object({
    plannedOperations: z.array(z.object({
      operationType: z.string(),
      priority: z.number().int().min(1).max(10),
      estimatedExecutionTimeMs: z.number().positive(),
      dependencies: z.array(z.string().uuid()).default([])
    })),

    executionOrder: z.array(z.string().uuid()),
    totalEstimatedTimeMs: z.number().positive(),
    requiresAtomicExecution: z.boolean().default(false)
  }),

  // Crisis considerations
  crisisConsiderations: z.object({
    maintainCrisisAccess: z.boolean().default(true),
    extendGracePeriodIfCrisis: z.boolean().default(true),
    preserveEmergencyFeatures: z.boolean().default(true),
    notifyEmergencyContactsOfChanges: z.boolean().default(false)
  }),

  // Rollback plan
  rollbackPlan: z.object({
    rollbackSupported: z.boolean(),
    rollbackOperations: z.array(z.object({
      operationType: z.string(),
      rollbackData: z.record(z.string(), z.any())
    })).default([]),
    rollbackTimeoutMs: z.number().positive().default(30000)
  })
});

export type SubscriptionStateSync = z.infer<typeof SubscriptionStateSyncSchema>;

/**
 * Real-Time Sync Coordination
 * Coordinates real-time sync operations triggered by webhooks
 */
export const RealTimeSyncCoordinationSchema = z.object({
  // Coordination session
  coordinationSessionId: z.string().uuid(),
  webhookEventId: z.string().uuid(),
  customerId: z.string(), // Pseudonymized

  // Active sync operations
  activeSyncOperations: z.array(z.object({
    operationId: z.string().uuid(),
    operationType: z.string(),
    priority: z.number().int().min(1).max(10),
    startedAt: z.string(), // ISO timestamp
    estimatedCompletionAt: z.string(), // ISO timestamp
    currentStatus: z.enum(['queued', 'executing', 'completed', 'failed', 'deferred']),

    // Cross-device coordination
    affectedDevices: z.array(z.string()),
    requiresDeviceCoordination: z.boolean(),
    preserveActiveSessionsOnDevices: z.boolean()
  })),

  // Subscription context coordination
  subscriptionContextCoordination: z.object({
    currentTierAcrossDevices: z.record(z.string(), z.string()), // deviceId -> tier
    targetTierForAllDevices: z.enum(['trial', 'basic', 'premium', 'grace_period']),
    coordinatedTransitionTime: z.string(), // ISO timestamp

    // Sync synchronization
    waitForAllDevicesSync: z.boolean().default(false),
    maxWaitTimeMs: z.number().positive().default(30000),
    gracefulDegradationAllowed: z.boolean().default(true)
  }),

  // Performance coordination
  performanceCoordination: z.object({
    distributedProcessing: z.boolean().default(false),
    loadBalancing: z.boolean().default(true),
    prioritizeActiveDevices: z.boolean().default(true),
    emergencyModeCoordination: z.boolean().default(true),

    // Resource allocation
    resourceAllocation: z.object({
      maxConcurrentOperationsPerDevice: z.number().int().positive().default(3),
      totalResourceBudgetPercent: z.number().min(0).max(1).default(0.8),
      crisisResourceReservation: z.number().min(0).max(1).default(0.2)
    })
  }),

  // Conflict resolution
  conflictResolution: z.object({
    conflictDetection: z.boolean().default(true),
    automaticResolution: z.boolean().default(true),
    userInterventionRequired: z.boolean().default(false),

    // Resolution strategies
    resolutionStrategies: z.array(z.enum([
      'webhook_data_wins',
      'local_data_wins',
      'merge_with_webhook_priority',
      'manual_resolution',
      'therapeutic_continuity_priority'
    ])),

    conflictTimeoutMs: z.number().positive().default(10000)
  })
});

export type RealTimeSyncCoordination = z.infer<typeof RealTimeSyncCoordinationSchema>;

/**
 * Webhook Sync Performance Monitoring
 */
export const WebhookSyncPerformanceSchema = z.object({
  // Performance metrics
  performanceMetrics: z.object({
    // Webhook processing performance
    webhookProcessing: z.object({
      averageProcessingTimeMs: z.number().min(0),
      webhookToSyncLatencyMs: z.number().min(0),
      webhookAcknowledgmentTimeMs: z.number().min(0),
      processingThroughputPerSecond: z.number().min(0)
    }),

    // Sync operation performance
    syncOperationPerformance: z.object({
      averageSyncExecutionTimeMs: z.number().min(0),
      subscriptionTierUpdateLatencyMs: z.number().min(0),
      featureGateRefreshTimeMs: z.number().min(0),
      crossDeviceCoordinationTimeMs: z.number().min(0)
    }),

    // End-to-end performance
    endToEndMetrics: z.object({
      webhookToUserImpactTimeMs: z.number().min(0),
      subscriptionChangeReflectionTimeMs: z.number().min(0),
      featureAccessUpdateTimeMs: z.number().min(0)
    })
  }),

  // Performance compliance
  performanceCompliance: z.object({
    // SLA compliance tracking
    slaCompliance: z.object({
      overallComplianceRate: z.number().min(0).max(1),
      webhookProcessingCompliance: z.number().min(0).max(1),
      syncOperationCompliance: z.number().min(0).max(1),
      crisisResponseCompliance: z.number().min(0).max(1)
    }),

    // Violation tracking
    performanceViolations: z.array(z.object({
      violationType: z.enum([
        'webhook_processing_timeout',
        'sync_operation_timeout',
        'cross_device_coordination_delay',
        'subscription_tier_update_delay',
        'crisis_response_violation'
      ]),
      occurredAt: z.string(), // ISO timestamp
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      impactAssessment: z.string(),
      resolutionTime: z.number().optional()
    }))
  }),

  // Resource utilization
  resourceUtilization: z.object({
    processingResourceUsage: z.number().min(0).max(1), // 0-1 percentage
    memoryUsage: z.number().min(0), // bytes
    networkBandwidthUsage: z.number().min(0), // bytes per second
    subscriptionTierOptimization: z.number().min(0).max(1) // optimization score
  })
});

export type WebhookSyncPerformance = z.infer<typeof WebhookSyncPerformanceSchema>;

/**
 * Default Webhook-to-Sync Mappings
 */
export const DEFAULT_WEBHOOK_SYNC_MAPPINGS: Record<string, WebhookSyncMapping> = {
  'customer.subscription.created': {
    mappingId: 'map_subscription_created',
    webhookEventType: 'customer.subscription.created',
    description: 'Map subscription creation to tier activation and feature access setup',
    syncOperationSpecs: [
      {
        operationType: 'subscription_tier_update',
        priority: 8,
        dataMapping: {
          sourceFields: {
            'data.object.items.data.0.price.lookup_key': 'tier',
            'data.object.status': 'status',
            'data.object.trial_end': 'trial_end_date'
          },
          transformations: [
            {
              field: 'tier',
              transformation: 'normalize'
            }
          ],
          defaultValues: {
            'grace_period_active': false,
            'crisis_access_maintained': true
          }
        }
      },
      {
        operationType: 'feature_access_refresh',
        priority: 7,
        dataMapping: {
          sourceFields: {},
          transformations: [],
          defaultValues: {
            'refresh_all_feature_gates': true
          }
        }
      }
    ],
    performanceConfig: {
      batchProcessing: false,
      maxBatchSize: 1,
      processingTimeoutMs: 15000,
      enableCaching: true,
      cacheExpirationMs: 300000
    },
    errorHandling: {
      retryPolicy: {
        enableRetry: true,
        maxRetries: 3,
        retryDelayMs: 2000,
        exponentialBackoff: true
      },
      failureHandling: {
        onFailure: 'retry',
        notifyOnFailure: true,
        preserveWebhookData: true
      },
      deadLetterQueue: {
        enableDLQ: true,
        maxDLQSize: 1000,
        dlqRetentionDays: 7
      }
    }
  },

  'customer.subscription.updated': {
    mappingId: 'map_subscription_updated',
    webhookEventType: 'customer.subscription.updated',
    description: 'Map subscription updates to tier changes and feature access modifications',
    syncOperationSpecs: [
      {
        operationType: 'subscription_tier_update',
        priority: 9,
        dataMapping: {
          sourceFields: {
            'data.object.items.data.0.price.lookup_key': 'new_tier',
            'data.previous_attributes.items.data.0.price.lookup_key': 'previous_tier',
            'data.object.status': 'status'
          },
          transformations: [
            {
              field: 'new_tier',
              transformation: 'normalize'
            },
            {
              field: 'previous_tier',
              transformation: 'normalize'
            }
          ],
          defaultValues: {}
        }
      }
    ],
    performanceConfig: {
      batchProcessing: false,
      maxBatchSize: 1,
      processingTimeoutMs: 10000,
      enableCaching: true,
      cacheExpirationMs: 300000
    },
    errorHandling: {
      retryPolicy: {
        enableRetry: true,
        maxRetries: 5,
        retryDelayMs: 1000,
        exponentialBackoff: true
      },
      failureHandling: {
        onFailure: 'escalate',
        notifyOnFailure: true,
        preserveWebhookData: true
      },
      deadLetterQueue: {
        enableDLQ: true,
        maxDLQSize: 1000,
        dlqRetentionDays: 7
      }
    }
  },

  'invoice.payment_failed': {
    mappingId: 'map_payment_failed',
    webhookEventType: 'invoice.payment_failed',
    description: 'Map payment failures to grace period activation',
    syncOperationSpecs: [
      {
        operationType: 'grace_period_activation',
        priority: 8,
        dataMapping: {
          sourceFields: {
            'data.object.subscription': 'subscription_id',
            'data.object.attempt_count': 'payment_attempt_count'
          },
          transformations: [],
          defaultValues: {
            'grace_period_days': 7,
            'maintain_crisis_access': true,
            'notify_user': true
          }
        }
      }
    ],
    performanceConfig: {
      batchProcessing: false,
      maxBatchSize: 1,
      processingTimeoutMs: 5000,
      enableCaching: false,
      cacheExpirationMs: 0
    },
    errorHandling: {
      retryPolicy: {
        enableRetry: true,
        maxRetries: 3,
        retryDelayMs: 1000,
        exponentialBackoff: false
      },
      failureHandling: {
        onFailure: 'escalate',
        fallbackSyncOperation: 'maintain_current_access',
        notifyOnFailure: true,
        preserveWebhookData: true
      },
      deadLetterQueue: {
        enableDLQ: true,
        maxDLQSize: 500,
        dlqRetentionDays: 14
      }
    }
  }
} as const;

/**
 * Type Guards
 */
export const isWebhookSyncOperation = (value: unknown): value is WebhookSyncOperation => {
  try {
    WebhookSyncOperationSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isSubscriptionStateSync = (value: unknown): value is SubscriptionStateSync => {
  try {
    SubscriptionStateSyncSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isRealTimeSyncCoordination = (value: unknown): value is RealTimeSyncCoordination => {
  try {
    RealTimeSyncCoordinationSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Webhook Sync Integration Constants
 */
export const WEBHOOK_SYNC_CONSTANTS = {
  // Performance thresholds
  MAX_WEBHOOK_PROCESSING_TIME_MS: 30000,
  MAX_SYNC_OPERATION_TIME_MS: 15000,
  MAX_SUBSCRIPTION_UPDATE_TIME_MS: 5000,

  // Retry configurations
  DEFAULT_RETRY_ATTEMPTS: 3,
  PAYMENT_FAILURE_RETRY_ATTEMPTS: 5,
  CRISIS_RELATED_RETRY_ATTEMPTS: 10,

  // Cache configurations
  WEBHOOK_SYNC_CACHE_TTL_MS: 300000, // 5 minutes
  SUBSCRIPTION_STATE_CACHE_TTL_MS: 600000, // 10 minutes

  // Priority mappings
  WEBHOOK_PRIORITY_MAPPING: {
    'customer.subscription.created': 8,
    'customer.subscription.updated': 9,
    'customer.subscription.deleted': 7,
    'invoice.payment_succeeded': 6,
    'invoice.payment_failed': 8,
    'subscription.trial_will_end': 7
  } as const,

  // Dead letter queue settings
  DLQ_MAX_SIZE: 1000,
  DLQ_RETENTION_DAYS: 7,
  DLQ_PROCESSING_INTERVAL_MS: 300000 // 5 minutes
} as const;