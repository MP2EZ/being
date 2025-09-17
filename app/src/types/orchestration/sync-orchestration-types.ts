/**
 * Sync Orchestration Type Definitions
 * P0-CLOUD Platform Infrastructure - TypeScript Implementation
 *
 * Comprehensive orchestration types for:
 * - Multi-tier priority queue management with crisis override
 * - Therapeutic safety-first orchestration patterns
 * - Performance monitoring with <500ms sync propagation
 * - Subscription tier resource allocation
 * - Cross-device session continuity
 */

import { z } from 'zod';
import type {
  SyncOperation,
  SyncableData,
  SyncMetadata,
  SyncStatus,
  ConflictResolutionStrategy
} from '../sync';
import type {
  SubscriptionTier,
  SubscriptionState
} from '../subscription';
import type {
  CrisisPaymentOverride
} from '../payment';

/**
 * ORCHESTRATION PRIORITY SYSTEM
 * Hierarchical priority with therapeutic safety precedence
 */

/**
 * Orchestration priority levels with crisis emergency override
 */
export const OrchestrationPrioritySchema = z.enum([
  'background_maintenance',   // 1 - System maintenance, cleanup
  'background_analytics',     // 2 - Analytics, reporting
  'normal_user_action',       // 3 - Standard user operations
  'normal_data_sync',         // 4 - Regular data synchronization
  'therapeutic_content',      // 5 - MBCT content, breathing exercises
  'therapeutic_session',      // 6 - Active therapeutic sessions
  'assessment_data',          // 7 - PHQ-9/GAD-7 clinical data
  'assessment_scoring',       // 8 - Crisis threshold calculations
  'crisis_intervention',      // 9 - Crisis button, safety plan
  'emergency_override'        // 10 - Life-safety emergency operations
]);

export type OrchestrationPriority = z.infer<typeof OrchestrationPrioritySchema>;

/**
 * Priority to numeric value mapping for queue processing
 */
export const PRIORITY_NUMERIC_VALUES: Record<OrchestrationPriority, number> = {
  'background_maintenance': 1,
  'background_analytics': 2,
  'normal_user_action': 3,
  'normal_data_sync': 4,
  'therapeutic_content': 5,
  'therapeutic_session': 6,
  'assessment_data': 7,
  'assessment_scoring': 8,
  'crisis_intervention': 9,
  'emergency_override': 10
};

/**
 * Orchestration operation metadata with performance constraints
 */
export const OrchestrationOperationSchema = z.object({
  // Core operation identification
  operationId: z.string(),
  operationType: z.enum([
    'data_sync',
    'conflict_resolution',
    'therapeutic_session_sync',
    'crisis_data_sync',
    'assessment_sync',
    'cross_device_coordination',
    'subscription_enforcement',
    'emergency_sync'
  ]),

  // Priority and scheduling
  priority: OrchestrationPrioritySchema,
  priorityNumeric: z.number().min(1).max(10),
  scheduledFor: z.string().optional(), // ISO timestamp
  dependencies: z.array(z.string()).default([]), // operation IDs

  // Performance requirements
  performanceConstraints: z.object({
    maxExecutionTime: z.number(), // milliseconds
    responseTimeTarget: z.number(), // <200ms for crisis, <500ms for therapeutic
    memoryLimit: z.number().optional(), // bytes
    cpuPriorityBoost: z.boolean().default(false)
  }),

  // Subscription context
  subscriptionContext: z.object({
    tier: z.enum(['free', 'premium', 'family', 'enterprise']),
    resourceAllocation: z.enum(['minimal', 'standard', 'enhanced', 'premium']),
    quotaValidationRequired: z.boolean(),
    tierEnforcementActive: z.boolean()
  }),

  // Therapeutic context
  therapeuticContext: z.object({
    clinicallySignificant: z.boolean(),
    assessmentData: z.boolean(),
    crisisMode: z.boolean(),
    therapeuticContinuity: z.boolean(),
    sessionPreservation: z.boolean()
  }),

  // Crisis safety
  crisisContext: z.object({
    isCrisisOperation: z.boolean(),
    crisisLevel: z.enum(['none', 'low', 'moderate', 'high', 'emergency']),
    emergencyBypass: z.boolean(),
    crisisSessionId: z.string().optional(),
    responseTimeStrict: z.boolean() // <200ms enforcement
  }),

  // Cross-device coordination
  deviceContext: z.object({
    requiresCrossDeviceSync: z.boolean(),
    primaryDeviceId: z.string().optional(),
    targetDevices: z.array(z.string()).default([]),
    sessionHandoffRequired: z.boolean(),
    deviceTrustVerification: z.boolean()
  }),

  // Data context
  dataContext: z.object({
    dataSize: z.number(), // bytes
    containsHealthData: z.boolean(),
    requiresEncryption: z.boolean(),
    hipaaCompliant: z.boolean(),
    piiValidationRequired: z.boolean()
  }),

  // Operation metadata
  metadata: z.object({
    createdAt: z.string(), // ISO timestamp
    enqueuedAt: z.string().optional(), // ISO timestamp
    startedAt: z.string().optional(), // ISO timestamp
    completedAt: z.string().optional(), // ISO timestamp
    retryCount: z.number().default(0),
    maxRetries: z.number().default(3),
    lastError: z.string().optional()
  })
});

export type OrchestrationOperation = z.infer<typeof OrchestrationOperationSchema>;

/**
 * Priority queue with multi-tier architecture
 */
export const OrchestrationQueueSchema = z.object({
  // Queue tiers by priority
  emergencyQueue: z.array(OrchestrationOperationSchema), // Priority 10
  crisisQueue: z.array(OrchestrationOperationSchema),    // Priority 8-9
  therapeuticQueue: z.array(OrchestrationOperationSchema), // Priority 5-7
  normalQueue: z.array(OrchestrationOperationSchema),    // Priority 3-4
  backgroundQueue: z.array(OrchestrationOperationSchema), // Priority 1-2

  // Queue state management
  queueState: z.object({
    totalOperations: z.number(),
    processingActive: z.boolean(),
    currentProcessor: z.string().optional(), // processor ID
    lastProcessedAt: z.string().optional(), // ISO timestamp

    // Performance metrics
    averageProcessingTime: z.number(), // milliseconds
    throughputPerSecond: z.number(),
    queueLatency: z.number(), // milliseconds

    // Crisis performance tracking
    crisisResponseTimes: z.array(z.number()), // milliseconds
    crisisViolations: z.number(), // count of >200ms responses
    lastCrisisViolation: z.string().optional() // ISO timestamp
  }),

  // Subscription tier distribution
  tierDistribution: z.object({
    free: z.number(),
    premium: z.number(),
    family: z.number(),
    enterprise: z.number()
  }),

  // Resource allocation tracking
  resourceAllocation: z.object({
    totalMemoryAllocated: z.number(), // bytes
    totalCpuAllocated: z.number(), // percentage
    processingSlots: z.object({
      total: z.number(),
      available: z.number(),
      reserved: z.object({
        crisis: z.number(),
        therapeutic: z.number(),
        premium: z.number()
      })
    })
  }),

  // Health monitoring
  queueHealth: z.object({
    status: z.enum(['healthy', 'degraded', 'overloaded', 'critical']),
    healthScore: z.number().min(0).max(100), // 0-100
    lastHealthCheck: z.string(), // ISO timestamp

    // Health indicators
    indicators: z.object({
      responseTimeHealth: z.number().min(0).max(100),
      throughputHealth: z.number().min(0).max(100),
      crisisSafetyHealth: z.number().min(0).max(100),
      memoryHealth: z.number().min(0).max(100)
    })
  })
});

export type OrchestrationQueue = z.infer<typeof OrchestrationQueueSchema>;

/**
 * ORCHESTRATION ENGINE INTERFACE
 */

/**
 * Orchestration engine state
 */
export const OrchestrationEngineStateSchema = z.object({
  // Engine identification
  engineId: z.string(),
  version: z.string(),
  environment: z.enum(['development', 'staging', 'production']),

  // Primary queue management
  primaryQueue: OrchestrationQueueSchema,

  // Processing state
  processingState: z.object({
    isProcessing: z.boolean(),
    currentBatch: z.array(OrchestrationOperationSchema),
    batchSize: z.number(),
    processingStartedAt: z.string().optional(), // ISO timestamp

    // Concurrent processing
    concurrentProcessors: z.number(),
    maxConcurrency: z.number(),
    processorLoadBalancing: z.boolean()
  }),

  // Performance monitoring
  performanceMetrics: z.object({
    // Response time metrics (critical for crisis operations)
    responseTime: z.object({
      p50: z.number(), // milliseconds
      p95: z.number(), // milliseconds
      p99: z.number(), // milliseconds
      max: z.number()  // milliseconds
    }),

    // Throughput metrics
    throughput: z.object({
      operationsPerSecond: z.number(),
      operationsPerMinute: z.number(),
      totalOperationsProcessed: z.number()
    }),

    // Crisis performance (must be <200ms)
    crisisPerformance: z.object({
      averageResponseTime: z.number(), // milliseconds
      violationCount: z.number(),
      violationRate: z.number(), // percentage
      lastViolation: z.string().optional() // ISO timestamp
    }),

    // Subscription tier performance
    tierPerformance: z.record(
      z.enum(['free', 'premium', 'family', 'enterprise']),
      z.object({
        averageResponseTime: z.number(),
        throughput: z.number(),
        resourceUtilization: z.number() // percentage
      })
    )
  }),

  // Resource management
  resourceState: z.object({
    memoryUsage: z.object({
      allocated: z.number(), // bytes
      maximum: z.number(), // bytes
      utilization: z.number() // percentage
    }),

    cpuUsage: z.object({
      current: z.number(), // percentage
      average: z.number(), // percentage
      peak: z.number() // percentage
    }),

    networkBandwidth: z.object({
      inbound: z.number(), // bytes per second
      outbound: z.number(), // bytes per second
      utilization: z.number() // percentage
    })
  }),

  // Therapeutic continuity state
  therapeuticState: z.object({
    activeSessions: z.array(z.object({
      sessionId: z.string(),
      deviceId: z.string(),
      sessionType: z.enum(['morning', 'midday', 'evening', 'crisis', 'assessment']),
      startedAt: z.string(), // ISO timestamp
      lastSyncAt: z.string(), // ISO timestamp
      continuityRequired: z.boolean()
    })),

    preservedSessions: z.number(),
    sessionHandoffsInProgress: z.number(),
    crossDeviceSync: z.boolean()
  }),

  // Crisis management state
  crisisState: z.object({
    activeCrisis: z.boolean(),
    crisisLevel: z.enum(['none', 'low', 'moderate', 'high', 'emergency']),
    crisisSessionId: z.string().optional(),
    emergencyBypassActive: z.boolean(),

    // Crisis operation tracking
    crisisOperationsInQueue: z.number(),
    crisisOperationsProcessing: z.number(),
    lastCrisisOperation: z.string().optional() // ISO timestamp
  }),

  // Engine health and status
  engineHealth: z.object({
    overall: z.enum(['healthy', 'warning', 'degraded', 'critical', 'failed']),
    healthScore: z.number().min(0).max(100), // 0-100
    lastHealthCheck: z.string(), // ISO timestamp

    // Component health
    components: z.object({
      queueManager: z.enum(['healthy', 'degraded', 'critical']),
      processor: z.enum(['healthy', 'degraded', 'critical']),
      performanceMonitor: z.enum(['healthy', 'degraded', 'critical']),
      resourceManager: z.enum(['healthy', 'degraded', 'critical']),
      crisisManager: z.enum(['healthy', 'degraded', 'critical'])
    }),

    // Alert status
    alerts: z.array(z.object({
      alertId: z.string(),
      severity: z.enum(['info', 'warning', 'error', 'critical']),
      message: z.string(),
      timestamp: z.string(), // ISO timestamp
      acknowledged: z.boolean()
    }))
  })
});

export type OrchestrationEngineState = z.infer<typeof OrchestrationEngineStateSchema>;

/**
 * Orchestration engine actions interface
 */
export interface OrchestrationEngineActions {
  // Queue management
  enqueueOperation: (operation: OrchestrationOperation) => Promise<void>;
  processQueue: () => Promise<void>;
  pauseProcessing: () => Promise<void>;
  resumeProcessing: () => Promise<void>;
  clearQueue: (priority?: OrchestrationPriority) => Promise<void>;

  // Priority management
  boostPriority: (operationId: string, newPriority: OrchestrationPriority) => Promise<void>;
  demotePriority: (operationId: string, newPriority: OrchestrationPriority) => Promise<void>;

  // Crisis management
  activateCrisisMode: (crisisLevel: 'low' | 'moderate' | 'high' | 'emergency') => Promise<void>;
  deactivateCrisisMode: () => Promise<void>;
  enableEmergencyBypass: (reason: string) => Promise<void>;
  processCrisisOperation: (operation: OrchestrationOperation) => Promise<void>;

  // Therapeutic session management
  preserveTherapeuticSession: (sessionId: string, deviceId: string) => Promise<void>;
  coordinateSessionHandoff: (sessionId: string, fromDevice: string, toDevice: string) => Promise<void>;
  restoreTherapeuticSession: (sessionId: string, deviceId: string) => Promise<boolean>;

  // Subscription tier management
  enforceSubscriptionLimits: (operation: OrchestrationOperation) => Promise<boolean>;
  updateResourceAllocation: (tier: SubscriptionTier, allocation: 'minimal' | 'standard' | 'enhanced' | 'premium') => Promise<void>;

  // Performance monitoring
  measureOperationPerformance: (operationId: string, startTime: number, endTime: number) => void;
  validateCrisisResponse: (operationId: string, responseTime: number) => boolean;
  getPerformanceMetrics: () => Promise<OrchestrationEngineState['performanceMetrics']>;

  // Health monitoring
  checkEngineHealth: () => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  getHealthReport: () => Promise<OrchestrationEngineState['engineHealth']>;

  // Resource management
  allocateResources: (operation: OrchestrationOperation) => Promise<boolean>;
  releaseResources: (operationId: string) => Promise<void>;
  optimizeResourceUsage: () => Promise<void>;
}

/**
 * Complete orchestration engine interface
 */
export interface OrchestrationEngine extends OrchestrationEngineState, OrchestrationEngineActions {
  // Engine lifecycle
  initialize: (config: OrchestrationEngineConfig) => Promise<void>;
  shutdown: (graceful?: boolean) => Promise<void>;
  restart: () => Promise<void>;

  // Type-safe operation execution
  executeOperation: <T>(
    operation: OrchestrationOperation,
    executor: () => Promise<T>,
    fallback?: T
  ) => Promise<T>;

  // Crisis-safe operation wrapper
  executeCrisisSafeOperation: <T>(
    operation: OrchestrationOperation,
    executor: () => Promise<T>,
    emergencyFallback: T
  ) => Promise<T>;

  // Batch processing
  executeBatch: (operations: OrchestrationOperation[]) => Promise<void>;

  // Subscription-aware processing
  executeWithSubscriptionValidation: <T>(
    operation: OrchestrationOperation,
    executor: () => Promise<T>
  ) => Promise<T>;
}

/**
 * ORCHESTRATION ENGINE CONFIGURATION
 */

/**
 * Engine configuration schema
 */
export const OrchestrationEngineConfigSchema = z.object({
  // Engine identification
  engineId: z.string(),
  version: z.string(),
  environment: z.enum(['development', 'staging', 'production']),

  // Processing configuration
  processing: z.object({
    maxConcurrentOperations: z.number().default(10),
    batchSize: z.number().default(5),
    processingIntervalMs: z.number().default(100), // milliseconds
    enableLoadBalancing: z.boolean().default(true)
  }),

  // Performance constraints
  performance: z.object({
    // Crisis response time (non-negotiable)
    crisisMaxResponseTime: z.number().default(200), // milliseconds
    therapeuticMaxResponseTime: z.number().default(500), // milliseconds
    normalMaxResponseTime: z.number().default(1000), // milliseconds

    // Queue size limits
    maxQueueSize: z.number().default(1000),
    queueSizeWarningThreshold: z.number().default(750),
    queueSizeCriticalThreshold: z.number().default(900),

    // Throughput requirements
    minThroughputOperationsPerSecond: z.number().default(10)
  }),

  // Resource limits
  resources: z.object({
    maxMemoryMB: z.number().default(512),
    maxCpuPercentage: z.number().default(80),
    maxNetworkBandwidthMbps: z.number().default(100),

    // Resource allocation per tier
    tierResourceAllocation: z.object({
      free: z.object({
        memoryMB: z.number().default(64),
        cpuPercentage: z.number().default(10),
        concurrentOperations: z.number().default(2)
      }),
      premium: z.object({
        memoryMB: z.number().default(128),
        cpuPercentage: z.number().default(25),
        concurrentOperations: z.number().default(5)
      }),
      family: z.object({
        memoryMB: z.number().default(256),
        cpuPercentage: z.number().default(40),
        concurrentOperations: z.number().default(8)
      }),
      enterprise: z.object({
        memoryMB: z.number().default(512),
        cpuPercentage: z.number().default(80),
        concurrentOperations: z.number().default(15)
      })
    })
  }),

  // Crisis management configuration
  crisis: z.object({
    enableCrisisMode: z.boolean().default(true),
    strictResponseValidation: z.boolean().default(true),
    emergencyBypassAllowed: z.boolean().default(true),
    crisisEscalationThreshold: z.number().default(3), // violation count
    maxCrisisOperationsPerMinute: z.number().default(60)
  }),

  // Therapeutic session configuration
  therapeutic: z.object({
    enableSessionPreservation: z.boolean().default(true),
    sessionPreservationTimeoutMs: z.number().default(3600000), // 1 hour
    maxPreservedSessions: z.number().default(100),
    crossDeviceHandoffEnabled: z.boolean().default(true)
  }),

  // Health monitoring configuration
  monitoring: z.object({
    healthCheckIntervalMs: z.number().default(30000), // 30 seconds
    metricsRetentionHours: z.number().default(24),
    alertThresholds: z.object({
      responseTimeWarningMs: z.number().default(150),
      responseTimeCriticalMs: z.number().default(200),
      queueSizeWarning: z.number().default(750),
      queueSizeCritical: z.number().default(900),
      memoryUtilizationWarning: z.number().default(80), // percentage
      memoryUtilizationCritical: z.number().default(95) // percentage
    })
  }),

  // Subscription tier policies
  subscriptionPolicies: z.object({
    enforceQuotas: z.boolean().default(true),
    gracePeriodMs: z.number().default(300000), // 5 minutes
    quotaResetIntervalMs: z.number().default(3600000), // 1 hour

    // Tier-specific quotas
    tierQuotas: z.object({
      free: z.object({
        operationsPerHour: z.number().default(100),
        maxDataTransferMB: z.number().default(10)
      }),
      premium: z.object({
        operationsPerHour: z.number().default(1000),
        maxDataTransferMB: z.number().default(100)
      }),
      family: z.object({
        operationsPerHour: z.number().default(2000),
        maxDataTransferMB: z.number().default(500)
      }),
      enterprise: z.object({
        operationsPerHour: z.number().default(10000),
        maxDataTransferMB: z.number().default(1000)
      })
    })
  })
});

export type OrchestrationEngineConfig = z.infer<typeof OrchestrationEngineConfigSchema>;

/**
 * PERFORMANCE CONSTANTS AND VALIDATION
 */
export const ORCHESTRATION_CONSTANTS = {
  // Performance requirements (non-negotiable)
  CRISIS_MAX_RESPONSE_TIME: 200, // milliseconds
  THERAPEUTIC_MAX_RESPONSE_TIME: 500, // milliseconds
  SYNC_PROPAGATION_MAX_TIME: 500, // milliseconds

  // Priority numeric values
  PRIORITY_VALUES: PRIORITY_NUMERIC_VALUES,

  // Queue limits
  MAX_QUEUE_SIZE: 1000,
  QUEUE_WARNING_THRESHOLD: 750,
  QUEUE_CRITICAL_THRESHOLD: 900,

  // Resource allocation
  MIN_FREE_TIER_ALLOCATION: {
    memory: 64, // MB
    cpu: 10,    // percentage
    operations: 2 // concurrent
  },

  MAX_ENTERPRISE_ALLOCATION: {
    memory: 512, // MB
    cpu: 80,     // percentage
    operations: 15 // concurrent
  },

  // Health thresholds
  HEALTHY_RESPONSE_TIME: 100, // milliseconds
  WARNING_RESPONSE_TIME: 150, // milliseconds
  CRITICAL_RESPONSE_TIME: 200, // milliseconds

  // Crisis safety
  CRISIS_VIOLATION_THRESHOLD: 3,
  EMERGENCY_BYPASS_DURATION: 3600000, // 1 hour in milliseconds

  // Session preservation
  MAX_SESSION_PRESERVATION_TIME: 3600000, // 1 hour in milliseconds
  MAX_PRESERVED_SESSIONS: 100
} as const;

/**
 * Type guards for orchestration types
 */
export const isOrchestrationOperation = (value: unknown): value is OrchestrationOperation => {
  try {
    OrchestrationOperationSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isOrchestrationQueue = (value: unknown): value is OrchestrationQueue => {
  try {
    OrchestrationQueueSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isOrchestrationEngineState = (value: unknown): value is OrchestrationEngineState => {
  try {
    OrchestrationEngineStateSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Export schemas for runtime validation
 */
export default {
  OrchestrationPrioritySchema,
  OrchestrationOperationSchema,
  OrchestrationQueueSchema,
  OrchestrationEngineStateSchema,
  OrchestrationEngineConfigSchema,

  // Type guards
  isOrchestrationOperation,
  isOrchestrationQueue,
  isOrchestrationEngineState,

  // Constants
  ORCHESTRATION_CONSTANTS,
  PRIORITY_NUMERIC_VALUES
};