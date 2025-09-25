/**
 * Cross-Device Sync Integration Types
 * Multi-device coordination with therapeutic session preservation and subscription awareness
 *
 * CRITICAL CONSTRAINTS:
 * - Therapeutic sessions must be preserved across device transitions
 * - Crisis operations bypass all device coordination delays
 * - Subscription tier enforcement across all connected devices
 * - <200ms crisis response regardless of device coordination complexity
 */

import { z } from 'zod';
import type { 
  SyncPriorityLevel as PriorityLevel,
  CrisisSyncCoordination,
  CrossDeviceSyncConfig,
  DeviceInfo 
} from '../cross-device-sync-canonical';
import type { StrictSubscriptionTier } from '../sync/subscription-tier-types';
import type { CrisisSeverity } from '../sync/crisis-safety-types';

/**
 * Device Type and Capabilities
 */
export const DeviceTypeSchema = z.enum(['mobile', 'tablet', 'desktop', 'widget', 'web_browser', 'smartwatch']);
export type DeviceType = z.infer<typeof DeviceTypeSchema>;

/**
 * Device Sync Capabilities with Subscription Tier Context
 */
export const DeviceSyncCapabilitiesSchema = z.object({
  // Basic device capabilities
  deviceCapabilities: z.object({
    supportsBackgroundSync: z.boolean(),
    supportsRealTimeSync: z.boolean(),
    supportsOfflineMode: z.boolean(),
    supportsCrisisMode: z.boolean(),
    hasStableConnection: z.boolean(),
    batteryOptimized: z.boolean(),
    supportsPushNotifications: z.boolean(),
    supportsEncryption: z.boolean()
  }),

  // Subscription-aware capabilities
  subscriptionCapabilities: z.object({
    currentTier: z.enum(['trial', 'basic', 'premium', 'grace_period']),
    tierSyncLimitations: z.object({
      maxConcurrentSyncs: z.number().int().positive(),
      maxDailySyncOperations: z.number().int().positive(),
      syncFrequencyMs: z.number().positive(),
      canSyncAcrossMultipleDevices: z.boolean(),
      supportsPremiumFeatures: z.boolean()
    }),

    // Grace period considerations
    gracePeriodStatus: z.object({
      isInGracePeriod: z.boolean(),
      gracePeriodExpiresAt: z.string().optional(), // ISO timestamp
      maintainSyncDuringGrace: z.boolean(),
      reducedSyncCapabilities: z.boolean()
    })
  }),

  // Therapeutic session capabilities
  therapeuticCapabilities: z.object({
    canHostTherapeuticSessions: z.boolean(),
    supportsSessionContinuity: z.boolean(),
    canPreserveSessionState: z.boolean(),
    supportsMultiDeviceTherapy: z.boolean(),
    crisisInterventionCapable: z.boolean(),

    // Session types supported
    supportedSessionTypes: z.array(z.enum([
      'morning_checkin',
      'midday_checkin',
      'evening_checkin',
      'breathing_exercise',
      'assessment_phq9',
      'assessment_gad7',
      'crisis_intervention',
      'mindfulness_practice'
    ]))
  }),

  // Performance characteristics
  performanceCharacteristics: z.object({
    averageNetworkLatencyMs: z.number().positive(),
    reliabilityScore: z.number().min(0).max(1), // 0-1 scale
    processingCapacity: z.enum(['low', 'medium', 'high']),
    memoryAvailable: z.number().positive(), // bytes
    storageAvailable: z.number().positive(), // bytes
    batteryLevel: z.number().min(0).max(1) // 0-1 percentage
  })
});

export type DeviceSyncCapabilities = z.infer<typeof DeviceSyncCapabilitiesSchema>;

/**
 * Cross-Device Therapeutic Session Coordination
 * Ensures therapeutic continuity across device transitions
 */
export const TherapeuticSessionCoordinationSchema = z.object({
  // Session identification
  sessionId: z.string().uuid(),
  sessionType: z.enum([
    'morning_checkin',
    'midday_checkin',
    'evening_checkin',
    'breathing_exercise',
    'assessment_phq9',
    'assessment_gad7',
    'crisis_intervention',
    'mindfulness_practice',
    'custom_therapy_session'
  ]),

  // Primary device management
  primaryDevice: z.object({
    deviceId: z.string(),
    deviceType: DeviceTypeSchema,
    sessionStartedAt: z.string(), // ISO timestamp
    expectedSessionDurationMs: z.number().positive(),
    sessionProgress: z.object({
      currentStep: z.number().int().min(0),
      totalSteps: z.number().int().positive(),
      progressPercentage: z.number().min(0).max(1),
      completedSteps: z.array(z.string()),
      sessionData: z.record(z.string(), z.any())
    })
  }),

  // Cross-device coordination
  deviceCoordination: z.object({
    allowDeviceTransition: z.boolean(),
    connectedDevices: z.array(z.object({
      deviceId: z.string(),
      deviceType: DeviceTypeSchema,
      syncStatus: z.enum(['synced', 'syncing', 'out_of_sync', 'error']),
      lastSyncAt: z.string(), // ISO timestamp
      canTakeOverSession: z.boolean(),
      subscriptionTier: z.enum(['trial', 'basic', 'premium', 'grace_period'])
    })),

    // Handoff configuration
    sessionHandoff: z.object({
      handoffEnabled: z.boolean(),
      handoffTimeoutMs: z.number().positive().default(10000),
      requiresUserConfirmation: z.boolean(),
      preserveSessionState: z.boolean().default(true),
      allowPartialHandoff: z.boolean().default(false)
    }),

    // Conflict resolution for simultaneous access
    conflictResolution: z.object({
      simultaneousAccessAllowed: z.boolean().default(false),
      primaryDeviceWins: z.boolean().default(true),
      conflictDetectionMs: z.number().positive().default(1000),
      resolutionStrategy: z.enum(['primary_wins', 'latest_wins', 'merge', 'user_choice'])
    })
  }),

  // Subscription context for session
  subscriptionContext: z.object({
    requiredTier: z.enum(['trial', 'basic', 'premium', 'grace_period']).optional(),
    tierOverride: z.boolean().default(false), // Crisis or special circumstances
    sessionFeatureAccess: z.record(z.string(), z.boolean()),
    gracePeriodAllowed: z.boolean().default(true),
    trialAccessAllowed: z.boolean().default(true)
  }),

  // Crisis safety for therapeutic sessions
  crisisSafety: z.object({
    isCrisisSession: z.boolean().default(false),
    crisisSeverity: z.enum(['none', 'mild', 'moderate', 'severe', 'emergency']).default('none'),
    requiresImmediateSync: z.boolean().default(false),
    bypassDeviceCoordination: z.boolean().default(false),
    preserveEvenOnFailure: z.boolean().default(false),

    // Crisis escalation
    crisisEscalation: z.object({
      escalateOnSessionFailure: z.boolean().default(false),
      notifyEmergencyContacts: z.boolean().default(false),
      activateEmergencyProtocols: z.boolean().default(false),
      fallbackToLocalStorage: z.boolean().default(true)
    })
  }),

  // Performance requirements
  performanceRequirements: z.object({
    maxSyncLatencyMs: z.number().positive(),
    maxHandoffTimeMs: z.number().positive(),
    requiresRealTimeSync: z.boolean(),
    toleratesNetworkDelay: z.boolean(),
    priorityLevel: z.number().int().min(1).max(10)
  }),

  // State preservation
  statePreservation: z.object({
    preserveOnNetworkFailure: z.boolean().default(true),
    preserveOnDeviceSwitch: z.boolean().default(true),
    preserveOnAppCrash: z.boolean().default(true),
    autoSaveIntervalMs: z.number().positive().default(5000),
    encryptPreservedState: z.boolean().default(true),

    // Recovery settings
    recoverySettings: z.object({
      enableAutomaticRecovery: z.boolean().default(true),
      maxRecoveryTimeMs: z.number().positive().default(30000),
      fallbackToLastKnownState: z.boolean().default(true),
      requiresUserConfirmationForRecovery: z.boolean().default(false)
    })
  })
});

export type TherapeuticSessionCoordination = z.infer<typeof TherapeuticSessionCoordinationSchema>;

/**
 * Device Sync Operation with Cross-Device Awareness
 */
export const CrossDeviceSyncOperationSchema = z.object({
  // Operation identification
  operationId: z.string().uuid(),
  operationType: z.enum([
    'device_registration',
    'device_deregistration',
    'session_handoff',
    'state_synchronization',
    'conflict_resolution',
    'emergency_coordination',
    'subscription_tier_sync',
    'feature_access_sync'
  ]),

  // Device context
  deviceContext: z.object({
    initiatingDevice: z.object({
      deviceId: z.string(),
      deviceType: DeviceTypeSchema,
      capabilities: DeviceSyncCapabilitiesSchema
    }),

    targetDevices: z.array(z.object({
      deviceId: z.string(),
      deviceType: DeviceTypeSchema,
      syncRequired: z.boolean(),
      expectedSyncTimeMs: z.number().positive()
    })),

    // Cross-device dependencies
    deviceDependencies: z.array(z.object({
      dependentDeviceId: z.string(),
      dependencyType: z.enum(['session_state', 'user_preferences', 'subscription_status', 'feature_access']),
      criticalDependency: z.boolean(),
      timeoutMs: z.number().positive()
    }))
  }),

  // Subscription coordination across devices
  subscriptionCoordination: z.object({
    enforceConsistentTier: z.boolean().default(true),
    allowTierMismatch: z.boolean().default(false),
    tierConflictResolution: z.enum(['highest_tier', 'lowest_tier', 'primary_device_tier', 'manual_resolution']),

    // Device-specific subscription context
    deviceSubscriptionStates: z.array(z.object({
      deviceId: z.string(),
      currentTier: z.enum(['trial', 'basic', 'premium', 'grace_period']),
      lastTierSync: z.string(), // ISO timestamp
      tierSyncRequired: z.boolean(),
      gracePeriodActive: z.boolean()
    }))
  }),

  // Performance coordination
  performanceCoordination: z.object({
    loadBalancing: z.object({
      enableLoadBalancing: z.boolean().default(true),
      distributionStrategy: z.enum(['round_robin', 'least_loaded', 'capability_based', 'subscription_aware']),
      considerDeviceCapabilities: z.boolean().default(true),
      considerNetworkQuality: z.boolean().default(true),
      considerBatteryLevel: z.boolean().default(true)
    }),

    // Resource allocation
    resourceAllocation: z.object({
      maxConcurrentOperationsPerDevice: z.number().int().positive(),
      totalOperationTimeout: z.number().positive(),
      emergencyResourceReservation: z.number().min(0).max(1), // 0-1 percentage
      adaptiveResourceAllocation: z.boolean().default(true)
    }),

    // Failure handling
    failureHandling: z.object({
      allowPartialSync: z.boolean().default(true),
      failoverEnabled: z.boolean().default(true),
      maxFailureRetries: z.number().int().min(0),
      isolateFailedDevices: z.boolean().default(true)
    })
  }),

  // Crisis coordination
  crisisCoordination: z.object({
    isCrisisOperation: z.boolean().default(false),
    crisisPriority: z.boolean().default(false),
    bypassNormalCoordination: z.boolean().default(false),
    emergencyModeEnabled: z.boolean().default(false),

    // Crisis-specific handling
    crisisHandling: z.object({
      prioritizeStabilityOverSpeed: z.boolean().default(true),
      maintainSessionContinuity: z.boolean().default(true),
      preserveTherapeuticState: z.boolean().default(true),
      activateEmergencyProtocols: z.boolean().default(false)
    })
  }),

  // Execution metadata
  executionMetadata: z.object({
    scheduledExecutionTime: z.string(), // ISO timestamp
    actualExecutionStartTime: z.string().optional(), // ISO timestamp
    executionCompletionTime: z.string().optional(), // ISO timestamp

    // Device execution tracking
    deviceExecutionStatus: z.array(z.object({
      deviceId: z.string(),
      executionStatus: z.enum(['pending', 'executing', 'completed', 'failed', 'timeout']),
      executionTimeMs: z.number().optional(),
      errorDetails: z.string().optional()
    })),

    // Overall operation results
    operationResults: z.object({
      overallSuccess: z.boolean(),
      successfulDevices: z.array(z.string()),
      failedDevices: z.array(z.string()),
      partialSuccessDevices: z.array(z.string()),
      totalExecutionTimeMs: z.number().optional()
    })
  })
});

export type CrossDeviceSyncOperation = z.infer<typeof CrossDeviceSyncOperationSchema>;

/**
 * Device Sync Conflict Resolution
 * Handles conflicts between devices during sync operations
 */
export const DeviceSyncConflictResolutionSchema = z.object({
  // Conflict identification
  conflictId: z.string().uuid(),
  conflictType: z.enum([
    'data_version_mismatch',
    'concurrent_session_modification',
    'subscription_tier_inconsistency',
    'therapeutic_session_conflict',
    'device_capability_mismatch',
    'network_partition_recovery',
    'timestamp_synchronization_error'
  ]),

  // Conflicting devices
  conflictingDevices: z.array(z.object({
    deviceId: z.string(),
    deviceType: DeviceTypeSchema,
    conflictingData: z.record(z.string(), z.any()),
    lastKnownGoodState: z.record(z.string(), z.any()).optional(),
    conflictTimestamp: z.string(), // ISO timestamp
    deviceSyncCapabilities: DeviceSyncCapabilitiesSchema
  })),

  // Conflict context
  conflictContext: z.object({
    affectedDataTypes: z.array(z.enum([
      'user_profile',
      'therapeutic_session',
      'assessment_data',
      'subscription_state',
      'feature_access',
      'device_preferences',
      'sync_metadata'
    ])),

    impactAssessment: z.object({
      therapeuticImpact: z.enum(['none', 'low', 'medium', 'high', 'critical']),
      subscriptionImpact: z.enum(['none', 'low', 'medium', 'high', 'critical']),
      userExperienceImpact: z.enum(['none', 'low', 'medium', 'high', 'critical']),
      dataSafetyImpact: z.enum(['none', 'low', 'medium', 'high', 'critical'])
    }),

    crisisContext: z.object({
      conflictDuringCrisis: z.boolean(),
      requiresImmediateResolution: z.boolean(),
      crisisDataAtRisk: z.boolean(),
      emergencyProtocolsRequired: z.boolean()
    })
  }),

  // Resolution strategy
  resolutionStrategy: z.object({
    selectedStrategy: z.enum([
      'automatic_merge',
      'timestamp_based_resolution',
      'device_priority_based',
      'subscription_tier_based',
      'therapeutic_priority_based',
      'user_choice_required',
      'fallback_to_server',
      'preserve_all_versions'
    ]),

    strategyParameters: z.record(z.string(), z.any()),

    // Resolution criteria
    resolutionCriteria: z.object({
      prioritizeTherapeuticContinuity: z.boolean().default(true),
      prioritizeDataSafety: z.boolean().default(true),
      prioritizeUserExperience: z.boolean().default(true),
      allowDataLoss: z.boolean().default(false),
      requireUserConfirmation: z.boolean().default(false)
    }),

    // Automatic resolution rules
    automaticResolutionRules: z.array(z.object({
      condition: z.string(),
      action: z.string(),
      priority: z.number().int().positive()
    }))
  }),

  // Resolution execution
  resolutionExecution: z.object({
    resolutionStartTime: z.string(), // ISO timestamp
    resolutionEndTime: z.string().optional(), // ISO timestamp
    resolutionTimeoutMs: z.number().positive(),

    // Resolution steps
    resolutionSteps: z.array(z.object({
      stepNumber: z.number().int().positive(),
      stepDescription: z.string(),
      targetDevices: z.array(z.string()),
      stepStatus: z.enum(['pending', 'executing', 'completed', 'failed']),
      stepExecutionTimeMs: z.number().optional(),
      stepResult: z.record(z.string(), z.any()).optional()
    })),

    // Resolution results
    resolutionResults: z.object({
      resolutionSuccessful: z.boolean(),
      conflictResolved: z.boolean(),
      dataIntegrityMaintained: z.boolean(),
      therapeuticContinuityPreserved: z.boolean(),
      allDevicesSynchronized: z.boolean(),

      // Post-resolution state
      finalDeviceStates: z.array(z.object({
        deviceId: z.string(),
        finalState: z.record(z.string(), z.any()),
        syncStatus: z.enum(['synced', 'partially_synced', 'failed', 'requires_manual_intervention'])
      })),

      // Conflict prevention measures
      preventionMeasures: z.array(z.object({
        measure: z.string(),
        implementation: z.string(),
        effectiveDate: z.string() // ISO timestamp
      }))
    })
  })
});

export type DeviceSyncConflictResolution = z.infer<typeof DeviceSyncConflictResolutionSchema>;

/**
 * Cross-Device Performance Monitoring
 */
export const CrossDevicePerformanceMonitoringSchema = z.object({
  // Device performance metrics
  deviceMetrics: z.array(z.object({
    deviceId: z.string(),
    deviceType: DeviceTypeSchema,

    // Sync performance
    syncPerformance: z.object({
      averageSyncTimeMs: z.number().min(0),
      syncSuccessRate: z.number().min(0).max(1),
      lastSyncLatencyMs: z.number().min(0),
      syncOperationsPerHour: z.number().min(0)
    }),

    // Therapeutic session performance
    therapeuticPerformance: z.object({
      sessionHandoffSuccessRate: z.number().min(0).max(1),
      averageHandoffTimeMs: z.number().min(0),
      sessionContinuityRate: z.number().min(0).max(1),
      therapeuticDataIntegrityScore: z.number().min(0).max(1)
    }),

    // Crisis response performance
    crisisPerformance: z.object({
      crisisResponseTimeMs: z.number().min(0),
      crisisOperationSuccessRate: z.number().min(0).max(1),
      emergencyCoordinationLatencyMs: z.number().min(0)
    }),

    // Resource utilization
    resourceUtilization: z.object({
      cpuUsagePercent: z.number().min(0).max(100),
      memoryUsageMB: z.number().min(0),
      networkBandwidthUsageMBps: z.number().min(0),
      batteryImpactScore: z.number().min(0).max(1)
    })
  })),

  // Cross-device coordination metrics
  coordinationMetrics: z.object({
    averageCoordinationTimeMs: z.number().min(0),
    coordinationSuccessRate: z.number().min(0).max(1),
    conflictResolutionRate: z.number().min(0).max(1),
    averageConflictResolutionTimeMs: z.number().min(0),

    // Multi-device sync performance
    multiDeviceSyncPerformance: z.object({
      syncConsistencyRate: z.number().min(0).max(1),
      dataSynchronizationLatencyMs: z.number().min(0),
      partialSyncRate: z.number().min(0).max(1),
      completeFailureRate: z.number().min(0).max(1)
    }),

    // Subscription tier coordination
    subscriptionCoordinationMetrics: z.object({
      tierConsistencyAcrossDevices: z.number().min(0).max(1),
      tierUpdatePropagationTimeMs: z.number().min(0),
      featureAccessConsistencyRate: z.number().min(0).max(1)
    })
  }),

  // Performance anomaly detection
  anomalyDetection: z.object({
    detectedAnomalies: z.array(z.object({
      anomalyType: z.enum([
        'sync_latency_spike',
        'coordination_failure_cluster',
        'device_performance_degradation',
        'therapeutic_session_interruption',
        'subscription_inconsistency',
        'crisis_response_delay'
      ]),
      affectedDevices: z.array(z.string()),
      detectedAt: z.string(), // ISO timestamp
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      impactAssessment: z.string(),
      recommendedActions: z.array(z.string())
    })),

    // Anomaly response
    anomalyResponse: z.object({
      automaticResponseEnabled: z.boolean().default(true),
      escalationThresholds: z.object({
        criticalAnomalyEscalation: z.boolean().default(true),
        therapeuticImpactEscalation: z.boolean().default(true),
        crisisRelatedEscalation: z.boolean().default(true)
      })
    })
  })
});

export type CrossDevicePerformanceMonitoring = z.infer<typeof CrossDevicePerformanceMonitoringSchema>;

/**
 * Type Guards
 */
export const isTherapeuticSessionCoordination = (value: unknown): value is TherapeuticSessionCoordination => {
  try {
    TherapeuticSessionCoordinationSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isCrossDeviceSyncOperation = (value: unknown): value is CrossDeviceSyncOperation => {
  try {
    CrossDeviceSyncOperationSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isDeviceSyncConflictResolution = (value: unknown): value is DeviceSyncConflictResolution => {
  try {
    DeviceSyncConflictResolutionSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Cross-Device Sync Constants
 */
export const CROSS_DEVICE_SYNC_CONSTANTS = {
  // Performance thresholds
  MAX_DEVICE_COORDINATION_TIME_MS: 5000,
  MAX_SESSION_HANDOFF_TIME_MS: 3000,
  MAX_THERAPEUTIC_SESSION_INTERRUPTION_MS: 1000,

  // Crisis response requirements
  CRISIS_BYPASS_COORDINATION_DELAY: true,
  CRISIS_MAX_DEVICE_RESPONSE_MS: 200,
  CRISIS_PRESERVE_SESSIONS_PRIORITY: true,

  // Device limits per subscription tier
  DEVICE_LIMITS: {
    trial: 1,
    basic: 2,
    premium: 10,
    grace_period: 1
  } as const,

  // Conflict resolution timeouts
  CONFLICT_RESOLUTION_TIMEOUT_MS: 10000,
  AUTOMATIC_RESOLUTION_TIMEOUT_MS: 5000,
  USER_CHOICE_TIMEOUT_MS: 30000,

  // Performance monitoring
  PERFORMANCE_MONITORING_INTERVAL_MS: 30000, // 30 seconds
  ANOMALY_DETECTION_SENSITIVITY: 0.8, // 0-1 scale
  THERAPEUTIC_CONTINUITY_THRESHOLD: 0.95 // 95% success rate required
} as const;