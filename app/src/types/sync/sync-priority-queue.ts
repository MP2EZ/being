/**
 * Sync Priority Queue Type Definitions
 * Multi-tier priority queue system with crisis safety and subscription awareness
 *
 * CRITICAL CONSTRAINTS:
 * - Level 10 operations (Crisis Emergency) must execute in <200ms
 * - Priority levels 1-10 with strict ordering enforcement
 * - Subscription tier restrictions with crisis bypass capability
 * - Cross-device coordination with therapeutic session preservation
 */

import { z } from 'zod';
import type { StrictSubscriptionTier } from './subscription-tier-types';
import type { SyncEntityType, SyncOperationType } from '../sync';

/**
 * Priority Level Enum - 10-level priority system
 */
export const PriorityLevelSchema = z.number().int().min(1).max(10);
export type PriorityLevel = z.infer<typeof PriorityLevelSchema>;

/**
 * Priority Level Mapping with Crisis Safety
 */
export const PRIORITY_LEVELS = {
  CRISIS_EMERGENCY: 10,        // <200ms guarantee, bypasses all limits
  ASSESSMENT_CRITICAL: 9,      // Critical assessment data (crisis thresholds)
  THERAPEUTIC_SESSION: 8,      // Active therapeutic session data
  USER_PROFILE_CRITICAL: 7,    // Critical user profile updates
  CHECKIN_IMMEDIATE: 6,        // Immediate check-in data
  PREFERENCE_SYNC: 5,          // User preference updates
  ANALYTICS_DATA: 4,           // Analytics and insights data
  BACKUP_OPERATION: 3,         // Backup and archive operations
  ARCHIVE_CLEANUP: 2,          // Archive cleanup and maintenance
  BACKGROUND_MAINTENANCE: 1    // Background maintenance tasks
} as const;

/**
 * Queue Operation with Priority and Subscription Context
 */
export const PriorityQueueOperationSchema = z.object({
  // Operation identification
  operationId: z.string().uuid(),
  entityType: z.enum(['check_in', 'assessment', 'user_profile', 'crisis_plan', 'widget_data', 'session_data']),
  entityId: z.string(),
  operationType: z.enum(['create', 'update', 'delete', 'merge', 'restore']),

  // Priority system
  priority: PriorityLevelSchema,
  priorityReason: z.enum([
    'crisis_emergency',
    'assessment_critical',
    'therapeutic_session',
    'user_request',
    'system_requirement',
    'background_maintenance',
    'subscription_requirement'
  ]),

  // Crisis safety attributes
  crisisAttributes: z.object({
    isCrisisOperation: z.boolean(),
    crisisLevel: z.enum(['none', 'mild', 'moderate', 'severe', 'emergency']).default('none'),
    requiresImmediateExecution: z.boolean().default(false),
    maxTolerableDelayMs: z.number().positive(),
    bypassSubscriptionLimits: z.boolean().default(false),
    crisisEscalationTrigger: z.boolean().default(false)
  }),

  // Subscription context
  subscriptionContext: z.object({
    requiredTier: z.enum(['trial', 'basic', 'premium', 'grace_period']).optional(),
    currentTier: z.enum(['trial', 'basic', 'premium', 'grace_period']),
    bypassTierCheck: z.boolean().default(false),
    gracePeriodAllowed: z.boolean().default(false),
    trialAccessAllowed: z.boolean().default(true)
  }),

  // Performance requirements
  performanceRequirements: z.object({
    maxExecutionTimeMs: z.number().positive(),
    guaranteedExecutionTimeMs: z.number().positive().optional(), // For crisis operations
    requiresSLACompliance: z.boolean(),
    toleratesNetworkDelay: z.boolean(),
    canBeDeferred: z.boolean(),
    requiresLowLatency: z.boolean()
  }),

  // Data specifications
  dataSpecification: z.object({
    estimatedSizeBytes: z.number().positive(),
    compressionEnabled: z.boolean(),
    encryptionRequired: z.boolean(),
    auditTrailRequired: z.boolean(),
    containsPII: z.boolean().default(false), // Zero-PII enforcement
    therapeuticData: z.boolean().default(false)
  }),

  // Scheduling and dependencies
  scheduling: z.object({
    scheduledExecutionTime: z.string(), // ISO timestamp
    earliestExecutionTime: z.string().optional(), // ISO timestamp
    latestExecutionTime: z.string().optional(), // ISO timestamp
    preferredExecutionWindow: z.object({
      start: z.string(), // ISO timestamp
      end: z.string()    // ISO timestamp
    }).optional()
  }),

  dependencies: z.array(z.string().uuid()).default([]),
  conflictResolutionStrategy: z.enum(['client_wins', 'server_wins', 'merge', 'manual_resolution', 'crisis_priority']),

  // Cross-device coordination
  crossDeviceCoordination: z.object({
    requiresCoordination: z.boolean(),
    primaryDeviceId: z.string().optional(),
    affectedDevices: z.array(z.string()).default([]),
    therapeuticSessionPreservation: z.boolean().default(false),
    lockRequiredForExecution: z.boolean().default(false)
  }),

  // Execution metadata
  executionMetadata: z.object({
    createdAt: z.string(), // ISO timestamp
    lastAttemptAt: z.string().optional(), // ISO timestamp
    attemptCount: z.number().int().min(0).default(0),
    maxRetries: z.number().int().positive(),
    retryBackoffMs: z.number().positive().default(1000),

    // Execution history
    executionHistory: z.array(z.object({
      attemptNumber: z.number().int().positive(),
      startedAt: z.string(), // ISO timestamp
      completedAt: z.string().optional(), // ISO timestamp
      result: z.enum(['success', 'failure', 'timeout', 'canceled', 'deferred']),
      error: z.string().optional(),
      performanceMetrics: z.object({
        executionTimeMs: z.number(),
        networkLatencyMs: z.number().optional(),
        subscriptionValidationMs: z.number().optional()
      }).optional()
    })).default([])
  }),

  // Current status
  status: z.enum(['queued', 'executing', 'completed', 'failed', 'deferred', 'canceled', 'waiting_for_dependencies']),
  statusUpdatedAt: z.string(), // ISO timestamp
  resultMetadata: z.record(z.any()).optional()
});

export type PriorityQueueOperation = z.infer<typeof PriorityQueueOperationSchema>;

/**
 * Queue Configuration with Tier-Specific Limits
 */
export const QueueConfigurationSchema = z.object({
  // Queue capacity limits per subscription tier
  tierLimits: z.object({
    trial: z.object({
      maxQueuedOperations: z.number().int().positive().default(50),
      maxConcurrentExecutions: z.number().int().positive().default(2),
      maxOperationsPerHour: z.number().int().positive().default(60)
    }),
    basic: z.object({
      maxQueuedOperations: z.number().int().positive().default(100),
      maxConcurrentExecutions: z.number().int().positive().default(3),
      maxOperationsPerHour: z.number().int().positive().default(120)
    }),
    premium: z.object({
      maxQueuedOperations: z.number().int().positive().default(500),
      maxConcurrentExecutions: z.number().int().positive().default(5),
      maxOperationsPerHour: z.number().int().positive().default(300)
    }),
    grace_period: z.object({
      maxQueuedOperations: z.number().int().positive().default(25),
      maxConcurrentExecutions: z.number().int().positive().default(1),
      maxOperationsPerHour: z.number().int().positive().default(30)
    })
  }),

  // Priority-based execution settings
  priorityExecution: z.object({
    // Crisis operations (Priority 10) - bypasses all limits
    crisisOperations: z.object({
      maxExecutionTimeMs: z.number().default(200),
      guaranteedExecution: z.boolean().default(true),
      bypassAllLimits: z.boolean().default(true),
      immediateExecution: z.boolean().default(true)
    }),

    // High priority operations (Priority 7-9)
    highPriority: z.object({
      maxExecutionTimeMs: z.number().default(1000),
      maxConcurrentExecutions: z.number().int().positive().default(3),
      preemptLowerPriority: z.boolean().default(true)
    }),

    // Medium priority operations (Priority 4-6)
    mediumPriority: z.object({
      maxExecutionTimeMs: z.number().default(5000),
      maxConcurrentExecutions: z.number().int().positive().default(2),
      deferrable: z.boolean().default(true)
    }),

    // Low priority operations (Priority 1-3)
    lowPriority: z.object({
      maxExecutionTimeMs: z.number().default(30000),
      maxConcurrentExecutions: z.number().int().positive().default(1),
      deferrable: z.boolean().default(true),
      backgroundOnly: z.boolean().default(true)
    })
  }),

  // Retry and timeout policies
  retryPolicies: z.object({
    defaultMaxRetries: z.number().int().min(0).default(3),
    crisisMaxRetries: z.number().int().min(0).default(10),
    retryBackoffStrategy: z.enum(['linear', 'exponential', 'fixed']).default('exponential'),
    maxRetryBackoffMs: z.number().positive().default(30000)
  }),

  // Network and performance settings
  networkSettings: z.object({
    maxConcurrentNetworkOperations: z.number().int().positive().default(5),
    networkTimeoutMs: z.number().positive().default(15000),
    crisisNetworkTimeoutMs: z.number().positive().default(5000),
    adaptToNetworkQuality: z.boolean().default(true)
  }),

  // Health monitoring
  healthMonitoring: z.object({
    maxQueueAge: z.number().positive().default(300000), // 5 minutes
    performanceThresholds: z.object({
      maxAverageExecutionTimeMs: z.number().positive().default(2000),
      maxFailureRate: z.number().min(0).max(1).default(0.1), // 10%
      maxCrisisResponseTimeMs: z.number().positive().default(200)
    }),
    alertThresholds: z.object({
      queueBacklogSize: z.number().int().positive().default(100),
      consecutiveFailures: z.number().int().positive().default(5),
      crisisResponseViolations: z.number().int().min(0).default(0) // Zero tolerance
    })
  })
});

export type QueueConfiguration = z.infer<typeof QueueConfigurationSchema>;

/**
 * Queue State and Metrics
 */
export const QueueStateSchema = z.object({
  // Current queue state
  queueStatistics: z.object({
    totalOperations: z.number().int().min(0),
    operationsByPriority: z.record(z.string(), z.number().int().min(0)), // Priority level -> count
    operationsByTier: z.record(z.string(), z.number().int().min(0)), // Subscription tier -> count
    operationsByStatus: z.record(z.string(), z.number().int().min(0)), // Status -> count

    // Current execution state
    currentlyExecuting: z.number().int().min(0),
    completedInLastHour: z.number().int().min(0),
    failedInLastHour: z.number().int().min(0),
    averageExecutionTimeMs: z.number().min(0),

    // Crisis operation tracking
    crisisOperationsInQueue: z.number().int().min(0),
    crisisOperationsCompleted: z.number().int().min(0),
    averageCrisisResponseTimeMs: z.number().min(0),
    crisisResponseTimeViolations: z.number().int().min(0)
  }),

  // Performance metrics
  performanceMetrics: z.object({
    throughputOperationsPerSecond: z.number().min(0),
    latencyPercentiles: z.object({
      p50: z.number().min(0),
      p90: z.number().min(0),
      p95: z.number().min(0),
      p99: z.number().min(0)
    }),

    // Tier-specific performance
    tierPerformance: z.record(z.string(), z.object({
      averageExecutionTimeMs: z.number().min(0),
      failureRate: z.number().min(0).max(1),
      operationsPerHour: z.number().int().min(0)
    })),

    // Crisis performance tracking
    crisisPerformance: z.object({
      averageResponseTimeMs: z.number().min(0),
      maxResponseTimeMs: z.number().min(0),
      violationsCount: z.number().int().min(0),
      lastViolationAt: z.string().optional() // ISO timestamp
    })
  }),

  // Health status
  healthStatus: z.object({
    overall: z.enum(['healthy', 'warning', 'critical']),
    queueHealth: z.enum(['healthy', 'warning', 'critical']),
    performanceHealth: z.enum(['healthy', 'warning', 'critical']),
    crisisResponseHealth: z.enum(['healthy', 'warning', 'critical']),

    // Active alerts
    activeAlerts: z.array(z.object({
      alertType: z.enum(['queue_backlog', 'performance_degradation', 'crisis_response_violation', 'tier_limit_exceeded']),
      severity: z.enum(['info', 'warning', 'error', 'critical']),
      message: z.string(),
      triggeredAt: z.string(), // ISO timestamp
      metadata: z.record(z.any()).optional()
    })),

    lastHealthCheckAt: z.string() // ISO timestamp
  }),

  // Subscription tier usage
  tierUsage: z.record(z.string(), z.object({
    currentOperations: z.number().int().min(0),
    hourlyLimit: z.number().int().positive(),
    utilizationPercentage: z.number().min(0).max(1),
    nearingLimit: z.boolean(),
    gracePeriodActive: z.boolean()
  }))
});

export type QueueState = z.infer<typeof QueueStateSchema>;

/**
 * Cross-Device Queue Coordination
 */
export const CrossDeviceQueueCoordinationSchema = z.object({
  // Coordination session
  coordinationSessionId: z.string().uuid(),
  primaryDeviceId: z.string(),

  // Active devices in coordination
  activeDevices: z.array(z.object({
    deviceId: z.string(),
    deviceType: z.enum(['mobile', 'tablet', 'desktop', 'widget']),
    subscriptionTier: z.enum(['trial', 'basic', 'premium', 'grace_period']),
    queueCapacity: z.number().int().positive(),
    currentQueueSize: z.number().int().min(0),
    lastSyncAt: z.string(), // ISO timestamp

    // Device-specific capabilities
    capabilities: z.object({
      supportsBackgroundSync: z.boolean(),
      hasStableConnection: z.boolean(),
      batteryOptimized: z.boolean(),
      crisisCapable: z.boolean()
    }),

    // Active therapeutic sessions
    activeTherapeuticSessions: z.array(z.object({
      sessionId: z.string().uuid(),
      sessionType: z.enum(['check_in', 'assessment', 'breathing', 'crisis_intervention']),
      priority: PriorityLevelSchema,
      preservationRequired: z.boolean()
    }))
  })),

  // Load balancing strategy
  loadBalancing: z.object({
    strategy: z.enum(['round_robin', 'least_loaded', 'subscription_tier_optimized', 'therapeutic_priority']),
    considerSubscriptionTiers: z.boolean().default(true),
    prioritizeTherapeuticSessions: z.boolean().default(true),
    crisisOperationsAlwaysLocal: z.boolean().default(true)
  }),

  // Conflict resolution for cross-device operations
  conflictResolution: z.object({
    conflictDetectionEnabled: z.boolean().default(true),
    automaticResolution: z.boolean().default(true),
    therapeuticSessionPriority: z.boolean().default(true),
    userChoiceRequired: z.array(z.string()).default([]) // Entity types requiring user choice
  }),

  // Performance coordination
  performanceCoordination: z.object({
    syncLatencyTargetMs: z.number().positive().default(1000),
    crisisOperationLatencyMs: z.number().positive().default(200),
    loadBalanceThresholdPercent: z.number().min(0).max(1).default(0.8),
    failoverEnabled: z.boolean().default(true)
  })
});

export type CrossDeviceQueueCoordination = z.infer<typeof CrossDeviceQueueCoordinationSchema>;

/**
 * Queue Operation Builder with Type Safety
 */
export class QueueOperationBuilder {
  private operation: Partial<PriorityQueueOperation> = {};

  constructor(entityType: string, entityId: string, operationType: string) {
    this.operation = {
      operationId: crypto.randomUUID(),
      entityType: entityType as any,
      entityId,
      operationType: operationType as any,
      createdAt: new Date().toISOString(),
      status: 'queued',
      statusUpdatedAt: new Date().toISOString()
    };
  }

  withPriority(priority: PriorityLevel, reason: string): this {
    this.operation.priority = priority;
    this.operation.priorityReason = reason as any;
    return this;
  }

  withCrisisAttributes(attributes: Partial<PriorityQueueOperation['crisisAttributes']>): this {
    this.operation.crisisAttributes = {
      isCrisisOperation: false,
      crisisLevel: 'none',
      requiresImmediateExecution: false,
      maxTolerableDelayMs: 30000,
      bypassSubscriptionLimits: false,
      crisisEscalationTrigger: false,
      ...attributes
    };
    return this;
  }

  withSubscriptionContext(context: Partial<PriorityQueueOperation['subscriptionContext']>): this {
    this.operation.subscriptionContext = {
      currentTier: 'basic', // Default
      bypassTierCheck: false,
      gracePeriodAllowed: false,
      trialAccessAllowed: true,
      ...context
    };
    return this;
  }

  withPerformanceRequirements(requirements: Partial<PriorityQueueOperation['performanceRequirements']>): this {
    this.operation.performanceRequirements = {
      maxExecutionTimeMs: 30000,
      requiresSLACompliance: false,
      toleratesNetworkDelay: true,
      canBeDeferred: true,
      requiresLowLatency: false,
      ...requirements
    };
    return this;
  }

  asCrisisOperation(crisisLevel: 'mild' | 'moderate' | 'severe' | 'emergency' = 'emergency'): this {
    return this
      .withPriority(PRIORITY_LEVELS.CRISIS_EMERGENCY, 'crisis_emergency')
      .withCrisisAttributes({
        isCrisisOperation: true,
        crisisLevel,
        requiresImmediateExecution: true,
        maxTolerableDelayMs: 200,
        bypassSubscriptionLimits: true,
        crisisEscalationTrigger: true
      })
      .withPerformanceRequirements({
        maxExecutionTimeMs: 200,
        guaranteedExecutionTimeMs: 200,
        requiresSLACompliance: true,
        toleratesNetworkDelay: false,
        canBeDeferred: false,
        requiresLowLatency: true
      });
  }

  build(): PriorityQueueOperation {
    // Set defaults for required fields
    const defaults: Partial<PriorityQueueOperation> = {
      priority: 5, // Medium priority
      priorityReason: 'user_request',
      crisisAttributes: {
        isCrisisOperation: false,
        crisisLevel: 'none',
        requiresImmediateExecution: false,
        maxTolerableDelayMs: 30000,
        bypassSubscriptionLimits: false,
        crisisEscalationTrigger: false
      },
      subscriptionContext: {
        currentTier: 'basic',
        bypassTierCheck: false,
        gracePeriodAllowed: false,
        trialAccessAllowed: true
      },
      performanceRequirements: {
        maxExecutionTimeMs: 30000,
        requiresSLACompliance: false,
        toleratesNetworkDelay: true,
        canBeDeferred: true,
        requiresLowLatency: false
      },
      dataSpecification: {
        estimatedSizeBytes: 1024,
        compressionEnabled: true,
        encryptionRequired: true,
        auditTrailRequired: true,
        containsPII: false,
        therapeuticData: false
      },
      scheduling: {
        scheduledExecutionTime: new Date().toISOString()
      },
      dependencies: [],
      conflictResolutionStrategy: 'merge',
      crossDeviceCoordination: {
        requiresCoordination: false,
        affectedDevices: [],
        therapeuticSessionPreservation: false,
        lockRequiredForExecution: false
      },
      executionMetadata: {
        createdAt: new Date().toISOString(),
        attemptCount: 0,
        maxRetries: 3,
        retryBackoffMs: 1000,
        executionHistory: []
      }
    };

    const merged = { ...defaults, ...this.operation } as PriorityQueueOperation;

    try {
      return PriorityQueueOperationSchema.parse(merged);
    } catch (error) {
      throw new Error(`Invalid queue operation: ${error}`);
    }
  }
}

/**
 * Type Guards
 */
export const isPriorityQueueOperation = (value: unknown): value is PriorityQueueOperation => {
  try {
    PriorityQueueOperationSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isQueueConfiguration = (value: unknown): value is QueueConfiguration => {
  try {
    QueueConfigurationSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isQueueState = (value: unknown): value is QueueState => {
  try {
    QueueStateSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Priority Queue Constants
 */
export const PRIORITY_QUEUE_CONSTANTS = {
  // Crisis response guarantees
  CRISIS_MAX_RESPONSE_MS: 200,
  CRISIS_BYPASS_ALL_LIMITS: true,
  CRISIS_UNLIMITED_RETRIES: 10,

  // Default queue sizes per tier
  DEFAULT_QUEUE_SIZES: {
    trial: 50,
    basic: 100,
    premium: 500,
    grace_period: 25
  } as const,

  // Execution limits per tier
  EXECUTION_LIMITS: {
    trial: { concurrent: 2, hourly: 60 },
    basic: { concurrent: 3, hourly: 120 },
    premium: { concurrent: 5, hourly: 300 },
    grace_period: { concurrent: 1, hourly: 30 }
  } as const,

  // Health monitoring thresholds
  HEALTH_THRESHOLDS: {
    queue_backlog_warning: 50,
    queue_backlog_critical: 100,
    failure_rate_warning: 0.05, // 5%
    failure_rate_critical: 0.1, // 10%
    crisis_violation_critical: 1 // Any crisis violation is critical
  } as const
} as const;