/**
 * Crisis Safety Type Definitions for Sync Operations
 * Comprehensive type system for emergency operation constraints and safety guarantees
 *
 * CRITICAL CONSTRAINTS:
 * - All crisis operations MUST complete within 200ms
 * - Crisis safety types prevent blocking regardless of subscription
 * - Emergency access types preserve therapeutic continuity
 * - Crisis escalation types trigger immediate sync coordination
 */

import { z } from 'zod';
import type { StrictSubscriptionTier } from './subscription-tier-types';
import type { SyncPriorityLevel as PriorityLevel } from '../cross-device-sync-canonical';

/**
 * Crisis Severity Levels with Response Time Constraints
 */
export const CrisisSeveritySchema = z.enum(['none', 'mild', 'moderate', 'severe', 'emergency']);
export type CrisisSeverity = z.infer<typeof CrisisSeveritySchema>;

/**
 * Crisis Response Time Requirements by Severity
 * Enforces strict time constraints for each crisis level
 */
export const CrisisResponseTimeRequirementsSchema = z.object({
  severity: CrisisSeveritySchema,

  // Maximum response times (strict enforcement)
  maxResponseTimeMs: z.number().positive(),
  guaranteedResponseTimeMs: z.number().positive(),
  timeoutThresholdMs: z.number().positive(),

  // Performance guarantees
  bypassAllQueues: z.boolean(),
  bypassSubscriptionLimits: z.boolean(),
  bypassNetworkOptimization: z.boolean(),
  requiresImmediateExecution: z.boolean(),

  // Escalation triggers
  escalateOnTimeout: z.boolean(),
  escalationDelayMs: z.number().positive(),
  maxEscalationAttempts: z.number().int().positive(),

  // Resource allocation
  reservedProcessingCapacity: z.number().min(0).max(1), // 0-1 percentage
  unlimitedRetries: z.boolean(),
  priorityBoost: z.number().int().min(0).max(10)
});

export type CrisisResponseTimeRequirements = z.infer<typeof CrisisResponseTimeRequirementsSchema>;

/**
 * Crisis Safety Operation Type
 * Type-safe crisis operation with guaranteed execution constraints
 */
export const CrisisSafetyOperationSchema = z.object({
  // Operation identification
  operationId: z.string().uuid(),
  crisisId: z.string().uuid(),
  operationType: z.enum([
    'crisis_detection',
    'emergency_contact_sync',
    'crisis_plan_access',
    'assessment_emergency_save',
    'therapeutic_session_preservation',
    'crisis_escalation',
    'safety_validation',
    'emergency_data_backup'
  ]),

  // Crisis context
  crisisContext: z.object({
    severity: CrisisSeveritySchema,
    detectedAt: z.string(), // ISO timestamp
    triggeredBy: z.enum(['user_action', 'assessment_score', 'system_detection', 'external_trigger']),
    crisisType: z.enum(['suicidal_ideation', 'panic_attack', 'severe_depression', 'anxiety_crisis', 'other_emergency']),

    // Crisis metadata (ZERO-PII)
    crisisMetadata: z.object({
      assessmentScore: z.number().optional(),
      riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      previousCrisisEvents: z.number().int().min(0).default(0),
      timeSinceLastCrisis: z.number().optional(), // milliseconds
      therapeuticSessionActive: z.boolean().default(false)
    })
  }),

  // Safety constraints (STRICT ENFORCEMENT)
  safetyConstraints: z.object({
    maxExecutionTimeMs: z.number().max(200), // MUST be ≤200ms
    guaranteedExecution: z.boolean().default(true),
    bypassAllLimits: z.boolean().default(true),
    requiresAtomic: z.boolean().default(true), // All-or-nothing execution

    // Failure handling
    failureEscalation: z.boolean().default(true),
    fallbackBehavior: z.enum(['retry_immediate', 'escalate_to_local', 'trigger_emergency_protocol']),
    maxFailureToleranceMs: z.number().max(50), // Very low failure tolerance

    // Data integrity
    requiresDataIntegrity: z.boolean().default(true),
    requiresAuditTrail: z.boolean().default(true),
    encryptionRequired: z.boolean().default(true)
  }),

  // Emergency access preservation
  emergencyAccess: z.object({
    preserveTherapeuticSession: z.boolean().default(true),
    maintainCrisisButtonAccess: z.boolean().default(true),
    enableEmergencyContacts: z.boolean().default(true),
    unlockCriticalFeatures: z.array(z.string()).default([
      'crisis_button',
      'emergency_contacts',
      'breathing_exercises',
      'crisis_plan',
      'safety_resources'
    ]),

    // Subscription bypass
    bypassSubscriptionRestrictions: z.boolean().default(true),
    gracePeriodExtension: z.boolean().default(true),
    unlimitedAccessDurationMs: z.number().positive().default(3600000) // 1 hour default
  }),

  // Crisis escalation configuration
  escalation: z.object({
    autoEscalateOnFailure: z.boolean().default(true),
    escalationChain: z.array(z.enum([
      'local_retry',
      'alternative_sync_path',
      'emergency_cache_activation',
      'offline_mode_activation',
      'external_crisis_service',
      'emergency_contact_notification'
    ])),
    escalationTimeoutMs: z.number().positive().default(100),
    maxEscalationLevels: z.number().int().positive().default(5)
  }),

  // Performance monitoring
  performanceMonitoring: z.object({
    trackExecutionTime: z.boolean().default(true),
    trackNetworkLatency: z.boolean().default(true),
    trackResourceUsage: z.boolean().default(true),
    alertOnPerformanceViolation: z.boolean().default(true),

    // Violation handling
    performanceViolationHandling: z.enum(['log_only', 'alert', 'escalate', 'trigger_fallback']).default('escalate'),
    continuousMonitoring: z.boolean().default(true)
  }),

  // Execution metadata
  executionMetadata: z.object({
    createdAt: z.string(), // ISO timestamp
    scheduledExecutionTime: z.string(), // ISO timestamp (immediate for crisis)
    maxDeferralTimeMs: z.number().max(0).default(0), // Crisis operations cannot be deferred

    // Execution tracking
    executionAttempts: z.array(z.object({
      attemptNumber: z.number().int().positive(),
      startedAt: z.string(), // ISO timestamp
      completedAt: z.string().optional(), // ISO timestamp
      executionTimeMs: z.number().optional(),
      result: z.enum(['success', 'failure', 'timeout', 'escalated']),
      error: z.string().optional(),
      escalationTriggered: z.boolean().default(false)
    })).default([]),

    // Status tracking
    currentStatus: z.enum(['queued', 'executing', 'completed', 'failed', 'escalated', 'timed_out']),
    lastStatusUpdate: z.string(), // ISO timestamp
    completedAt: z.string().optional() // ISO timestamp
  })
});

export type CrisisSafetyOperation = z.infer<typeof CrisisSafetyOperationSchema>;

/**
 * Crisis Detection and Response Configuration
 */
export const CrisisDetectionConfigSchema = z.object({
  // Detection triggers
  detectionTriggers: z.object({
    // Assessment-based triggers
    assessmentTriggers: z.object({
      phq9CrisisThreshold: z.number().int().min(0).default(20), // PHQ-9 ≥20
      gad7CrisisThreshold: z.number().int().min(0).default(15), // GAD-7 ≥15
      customThresholds: z.record(z.string(), z.number()),
      enableRapidDetection: z.boolean().default(true)
    }),

    // Behavioral triggers
    behavioralTriggers: z.object({
      rapidMoodDeteriorating: z.boolean().default(true),
      missedConsecutiveCheckIns: z.number().int().positive().default(3),
      unusualUsagePatterns: z.boolean().default(true),
      panicButtonActivation: z.boolean().default(true)
    }),

    // External triggers
    externalTriggers: z.object({
      familyMemberAlert: z.boolean().default(false), // Family plan feature
      therapistIntervention: z.boolean().default(false), // Professional integration
      emergencyContactActivation: z.boolean().default(true)
    })
  }),

  // Response configuration
  responseConfiguration: z.object({
    // Immediate response
    immediateResponse: z.object({
      activateCrisisMode: z.boolean().default(true),
      displayCrisisResources: z.boolean().default(true),
      enableEmergencyContacts: z.boolean().default(true),
      bypassSubscriptionLimits: z.boolean().default(true),
      preserveAllUserData: z.boolean().default(true)
    }),

    // Sync behavior during crisis
    crisisSyncBehavior: z.object({
      prioritizeAllOperations: z.boolean().default(true),
      bypassQueueLimits: z.boolean().default(true),
      useAlternativeSyncPaths: z.boolean().default(true),
      maintainOfflineCapability: z.boolean().default(true),
      continuousDataBackup: z.boolean().default(true)
    }),

    // Recovery and follow-up
    recoveryConfiguration: z.object({
      automaticFollowUp: z.boolean().default(true),
      followUpIntervalMs: z.number().positive().default(3600000), // 1 hour
      crisisDataRetention: z.boolean().default(true),
      therapeuticContinuityPlan: z.boolean().default(true)
    })
  }),

  // Performance requirements
  performanceRequirements: z.object({
    maxDetectionLatencyMs: z.number().max(100).default(50), // ≤100ms detection
    maxResponseActivationMs: z.number().max(200).default(100), // ≤200ms activation
    continuousMonitoring: z.boolean().default(true),
    realTimeAlerts: z.boolean().default(true)
  })
});

export type CrisisDetectionConfig = z.infer<typeof CrisisDetectionConfigSchema>;

/**
 * Emergency Sync Protocol Types
 */
export const EmergencySyncProtocolSchema = z.object({
  // Protocol identification
  protocolId: z.string().uuid(),
  protocolName: z.string(),
  activationTrigger: z.enum([
    'crisis_detected',
    'system_failure',
    'network_emergency',
    'data_corruption',
    'subscription_emergency',
    'therapeutic_emergency'
  ]),

  // Emergency sync paths
  emergencySyncPaths: z.array(z.object({
    pathId: z.string(),
    pathType: z.enum(['primary', 'fallback', 'emergency_only', 'local_only']),
    priority: z.number().int().min(1).max(10),

    // Path configuration
    configuration: z.object({
      bypassNormalQueues: z.boolean().default(true),
      useDirectConnection: z.boolean().default(true),
      enableCompressionOverride: z.boolean().default(true),
      maxLatencyMs: z.number().positive(),
      timeoutMs: z.number().positive(),
      retryCount: z.number().int().min(0)
    }),

    // Path capabilities
    capabilities: z.object({
      supportsCrisisOperations: z.boolean(),
      supportsLargeDataTransfer: z.boolean(),
      requiresAuthentication: z.boolean(),
      offlineCapable: z.boolean(),
      encryptionLevel: z.enum(['basic', 'standard', 'high', 'maximum'])
    })
  })),

  // Data prioritization during emergency
  dataPrioritization: z.object({
    // Critical data (highest priority)
    criticalData: z.array(z.enum([
      'crisis_plan',
      'emergency_contacts',
      'current_assessment_data',
      'active_therapeutic_session',
      'user_safety_status'
    ])),

    // Important data (medium priority)
    importantData: z.array(z.enum([
      'recent_check_ins',
      'mood_tracking_data',
      'user_preferences',
      'notification_settings'
    ])),

    // Optional data (low priority)
    optionalData: z.array(z.enum([
      'historical_analytics',
      'export_archives',
      'cached_content',
      'usage_statistics'
    ])),

    // Emergency data limits
    maxCriticalDataSize: z.number().positive(),
    maxTotalEmergencyDataSize: z.number().positive(),
    compressionRequired: z.boolean().default(true)
  }),

  // Activation conditions
  activationConditions: z.object({
    // Automatic activation triggers
    automaticTriggers: z.object({
      crisisSeverityThreshold: CrisisSeveritySchema.default('moderate'),
      consecutiveFailures: z.number().int().positive().default(3),
      responseTimeViolations: z.number().int().positive().default(2),
      networkQualityThreshold: z.number().min(0).max(1).default(0.3) // 30%
    }),

    // Manual activation
    manualActivation: z.object({
      allowUserActivation: z.boolean().default(true),
      allowSystemActivation: z.boolean().default(true),
      requiresConfirmation: z.boolean().default(false), // No confirmation during crisis
      activationTimeoutMs: z.number().positive().default(30000)
    }),

    // Deactivation conditions
    deactivationConditions: z.object({
      automaticDeactivation: z.boolean().default(true),
      crisisResolutionRequired: z.boolean().default(true),
      stabilityPeriodMs: z.number().positive().default(300000), // 5 minutes
      manualDeactivationAllowed: z.boolean().default(true)
    })
  })
});

export type EmergencySyncProtocol = z.infer<typeof EmergencySyncProtocolSchema>;

/**
 * Crisis Performance Monitoring Types
 */
export const CrisisPerformanceMonitoringSchema = z.object({
  // Real-time monitoring
  realTimeMonitoring: z.object({
    enabledDuringCrisis: z.boolean().default(true),
    monitoringIntervalMs: z.number().positive().default(100), // 100ms intervals
    alertThresholdMs: z.number().max(200).default(150), // Alert if >150ms

    // Metrics tracking
    trackExecutionTimes: z.boolean().default(true),
    trackNetworkLatency: z.boolean().default(true),
    trackResourceUsage: z.boolean().default(true),
    trackDataIntegrity: z.boolean().default(true)
  }),

  // Performance thresholds
  performanceThresholds: z.object({
    // Crisis response thresholds (STRICT)
    maxCrisisResponseTimeMs: z.number().max(200).default(200),
    maxCrisisDetectionTimeMs: z.number().max(100).default(100),
    maxEmergencyActivationTimeMs: z.number().max(50).default(50),

    // Acceptable failure rates (very low)
    maxFailureRate: z.number().min(0).max(0.01).default(0.005), // 0.5%
    maxTimeoutRate: z.number().min(0).max(0.01).default(0.001), // 0.1%

    // Resource usage limits
    maxCpuUsagePercent: z.number().min(0).max(100).default(80),
    maxMemoryUsageMB: z.number().positive().default(100),
    maxNetworkBandwidthUsage: z.number().positive().default(1048576) // 1MB/s
  }),

  // Violation handling
  violationHandling: z.object({
    // Immediate actions
    immediateActions: z.array(z.enum([
      'trigger_escalation',
      'activate_fallback_protocol',
      'send_performance_alert',
      'log_violation_details',
      'adjust_resource_allocation',
      'enable_emergency_mode'
    ])),

    // Escalation procedures
    escalationProcedures: z.object({
      escalateOnFirstViolation: z.boolean().default(true),
      escalationDelayMs: z.number().positive().default(0), // Immediate escalation
      maxEscalationLevels: z.number().int().positive().default(3),
      notifyEmergencyContacts: z.boolean().default(false) // Only for critical violations
    }),

    // Recovery procedures
    recoveryProcedures: z.object({
      automaticRecovery: z.boolean().default(true),
      recoveryTimeoutMs: z.number().positive().default(5000),
      fallbackToOfflineMode: z.boolean().default(true),
      preserveDataDuringRecovery: z.boolean().default(true)
    })
  }),

  // Audit and compliance
  auditCompliance: z.object({
    logAllCrisisOperations: z.boolean().default(true),
    detailedPerformanceLogs: z.boolean().default(true),
    retainCrisisLogs: z.boolean().default(true),
    encryptCrisisLogs: z.boolean().default(true),
    logRetentionPeriodDays: z.number().int().positive().default(365) // 1 year
  })
});

export type CrisisPerformanceMonitoring = z.infer<typeof CrisisPerformanceMonitoringSchema>;

/**
 * Default Crisis Response Time Requirements
 */
export const DEFAULT_CRISIS_RESPONSE_REQUIREMENTS: Record<CrisisSeverity, CrisisResponseTimeRequirements> = {
  none: {
    severity: 'none',
    maxResponseTimeMs: 5000,
    guaranteedResponseTimeMs: 3000,
    timeoutThresholdMs: 10000,
    bypassAllQueues: false,
    bypassSubscriptionLimits: false,
    bypassNetworkOptimization: false,
    requiresImmediateExecution: false,
    escalateOnTimeout: false,
    escalationDelayMs: 30000,
    maxEscalationAttempts: 1,
    reservedProcessingCapacity: 0,
    unlimitedRetries: false,
    priorityBoost: 0
  },

  mild: {
    severity: 'mild',
    maxResponseTimeMs: 2000,
    guaranteedResponseTimeMs: 1000,
    timeoutThresholdMs: 5000,
    bypassAllQueues: false,
    bypassSubscriptionLimits: false,
    bypassNetworkOptimization: false,
    requiresImmediateExecution: false,
    escalateOnTimeout: true,
    escalationDelayMs: 10000,
    maxEscalationAttempts: 2,
    reservedProcessingCapacity: 0.1,
    unlimitedRetries: false,
    priorityBoost: 2
  },

  moderate: {
    severity: 'moderate',
    maxResponseTimeMs: 1000,
    guaranteedResponseTimeMs: 500,
    timeoutThresholdMs: 2000,
    bypassAllQueues: true,
    bypassSubscriptionLimits: true,
    bypassNetworkOptimization: false,
    requiresImmediateExecution: true,
    escalateOnTimeout: true,
    escalationDelayMs: 2000,
    maxEscalationAttempts: 3,
    reservedProcessingCapacity: 0.3,
    unlimitedRetries: false,
    priorityBoost: 5
  },

  severe: {
    severity: 'severe',
    maxResponseTimeMs: 500,
    guaranteedResponseTimeMs: 200,
    timeoutThresholdMs: 1000,
    bypassAllQueues: true,
    bypassSubscriptionLimits: true,
    bypassNetworkOptimization: true,
    requiresImmediateExecution: true,
    escalateOnTimeout: true,
    escalationDelayMs: 500,
    maxEscalationAttempts: 5,
    reservedProcessingCapacity: 0.5,
    unlimitedRetries: true,
    priorityBoost: 8
  },

  emergency: {
    severity: 'emergency',
    maxResponseTimeMs: 200,
    guaranteedResponseTimeMs: 100,
    timeoutThresholdMs: 500,
    bypassAllQueues: true,
    bypassSubscriptionLimits: true,
    bypassNetworkOptimization: true,
    requiresImmediateExecution: true,
    escalateOnTimeout: true,
    escalationDelayMs: 100,
    maxEscalationAttempts: 10,
    reservedProcessingCapacity: 1.0,
    unlimitedRetries: true,
    priorityBoost: 10
  }
} as const;

/**
 * Type Guards
 */
export const isCrisisSafetyOperation = (value: unknown): value is CrisisSafetyOperation => {
  try {
    CrisisSafetyOperationSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isCrisisDetectionConfig = (value: unknown): value is CrisisDetectionConfig => {
  try {
    CrisisDetectionConfigSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isEmergencySyncProtocol = (value: unknown): value is EmergencySyncProtocol => {
  try {
    EmergencySyncProtocolSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Crisis Safety Constants
 */
export const CRISIS_SAFETY_CONSTANTS = {
  // Absolute response time limits
  EMERGENCY_MAX_RESPONSE_MS: 200,
  SEVERE_MAX_RESPONSE_MS: 500,
  MODERATE_MAX_RESPONSE_MS: 1000,

  // Crisis detection thresholds
  PHQ9_CRISIS_THRESHOLD: 20,
  GAD7_CRISIS_THRESHOLD: 15,
  RAPID_DETECTION_INTERVAL_MS: 100,

  // Emergency protocol activation
  CONSECUTIVE_FAILURES_THRESHOLD: 3,
  RESPONSE_TIME_VIOLATIONS_THRESHOLD: 2,
  NETWORK_QUALITY_EMERGENCY_THRESHOLD: 0.3,

  // Resource allocation during crisis
  CRISIS_RESERVED_CPU_PERCENT: 50,
  CRISIS_RESERVED_MEMORY_MB: 100,
  CRISIS_UNLIMITED_OPERATIONS: true,

  // Audit and compliance
  CRISIS_LOG_RETENTION_DAYS: 365,
  DETAILED_CRISIS_LOGGING: true,
  ENCRYPT_ALL_CRISIS_DATA: true
} as const;