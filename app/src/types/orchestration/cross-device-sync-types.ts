/**
 * Cross-Device Sync Coordination Type Definitions
 * P0-CLOUD Platform Infrastructure - TypeScript Implementation
 *
 * Comprehensive cross-device synchronization types for:
 * - Multi-device coordination with therapeutic session preservation
 * - Session handoff with <2s continuity requirements
 * - Device trust verification and authentication
 * - Offline-online reconciliation with conflict resolution
 * - Subscription tier enforcement across devices
 */

import { z } from 'zod';
import type {
  SyncableData,
  SyncOperation,
  SyncMetadata,
  ConflictResolutionStrategy
} from '../sync';
import type {
  SubscriptionTier
} from '../subscription';
import type {
  OrchestrationPriority,
  OrchestrationOperation
} from './sync-orchestration-types';
import type {
  ConflictDescriptor,
  ConflictResolutionPriority
} from './conflict-resolution-types';

/**
 * DEVICE COORDINATION SYSTEM
 */

/**
 * Device identification and capabilities
 */
export const DeviceCapabilitiesSchema = z.object({
  // Device identification
  deviceId: z.string(),
  deviceName: z.string(),
  deviceType: z.enum(['phone', 'tablet', 'desktop', 'web', 'widget']),
  platform: z.enum(['ios', 'android', 'windows', 'macos', 'web', 'ios_widget']),

  // Device specifications
  specifications: z.object({
    screenSize: z.enum(['small', 'medium', 'large', 'xlarge']), // For UI adaptation
    memoryMB: z.number(),
    processingPower: z.enum(['low', 'medium', 'high', 'premium']),
    networkCapability: z.enum(['wifi', 'cellular', 'both', 'limited']),
    storageAvailableMB: z.number(),

    // Therapeutic capabilities
    hapticFeedback: z.boolean(),
    audioPlayback: z.boolean(),
    cameraAccess: z.boolean(),
    biometricAuth: z.boolean(),
    backgroundProcessing: z.boolean()
  }),

  // Sync capabilities
  syncCapabilities: z.object({
    realtimeSync: z.boolean(),
    backgroundSync: z.boolean(),
    offlineMode: z.boolean(),
    encryptedStorage: z.boolean(),
    crossDeviceHandoff: z.boolean(),

    // Performance capabilities
    maxConcurrentSyncs: z.number(),
    syncBandwidthMbps: z.number(),
    latencyToleranceMs: z.number() // How much latency device can handle
  }),

  // Subscription and access
  subscriptionContext: z.object({
    tier: z.enum(['free', 'premium', 'family', 'enterprise']),
    isPrimaryDevice: z.boolean(),
    familyMemberDevice: z.boolean(),
    deviceQuotaUsed: z.number(), // Against family/enterprise device limits
    lastPaymentVerification: z.string() // ISO timestamp
  }),

  // Device trust and security
  trustLevel: z.object({
    level: z.enum(['untrusted', 'pending', 'verified', 'trusted', 'primary']),
    verificationMethod: z.enum(['biometric', 'password', 'two_factor', 'family_verification']).optional(),
    lastVerification: z.string().optional(), // ISO timestamp
    trustScore: z.number().min(0).max(100), // 0-100 trust score

    // Security features
    encryptionCapable: z.boolean(),
    secureEnclave: z.boolean(),
    certificatePinning: z.boolean(),
    jailbrokenOrRooted: z.boolean()
  }),

  // Device status
  status: z.object({
    isOnline: z.boolean(),
    lastSeen: z.string(), // ISO timestamp
    batteryLevel: z.number().min(0).max(100).optional(),
    networkQuality: z.enum(['excellent', 'good', 'fair', 'poor', 'offline']),

    // App state
    appVersion: z.string(),
    lastAppUpdate: z.string(), // ISO timestamp
    backgroundRefreshEnabled: z.boolean(),
    notificationsEnabled: z.boolean()
  }),

  // Therapeutic context
  therapeuticContext: z.object({
    preferredForSessions: z.boolean(), // User prefers this device for MBCT
    crisisAccessDevice: z.boolean(), // Device has crisis button access
    assessmentCapable: z.boolean(), // Can display PHQ-9/GAD-7
    breathingExerciseOptimized: z.boolean(), // Good for breathing circle

    // Usage patterns
    primaryUsageTime: z.enum(['morning', 'midday', 'evening', 'night', 'variable']),
    therapeuticUsageFrequency: z.enum(['daily', 'frequent', 'occasional', 'rare']),
    lastTherapeuticSession: z.string().optional() // ISO timestamp
  })
});

export type DeviceCapabilities = z.infer<typeof DeviceCapabilitiesSchema>;

/**
 * Device registry with family and enterprise support
 */
export const DeviceRegistrySchema = z.object({
  // Registry metadata
  registryId: z.string(),
  userId: z.string(),
  lastUpdated: z.string(), // ISO timestamp

  // Primary device designation
  primaryDevice: z.object({
    deviceId: z.string(),
    designatedAt: z.string(), // ISO timestamp
    autoFailover: z.boolean(), // Auto-designate new primary if offline
    failoverCandidates: z.array(z.string()) // Ordered list of device IDs
  }),

  // All registered devices
  devices: z.array(DeviceCapabilitiesSchema),

  // Family plan device management (if applicable)
  familyDevices: z.object({
    enabled: z.boolean(),
    familyId: z.string().optional(),
    parentDevice: z.string().optional(), // Device ID of parent/admin
    childDevices: z.array(z.object({
      deviceId: z.string(),
      childUserId: z.string(),
      parentalControls: z.object({
        crisisAccess: z.boolean(),
        assessmentAccess: z.boolean(),
        dataSharing: z.boolean(),
        timeRestrictions: z.array(z.object({
          day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
          startTime: z.string(), // HH:MM format
          endTime: z.string() // HH:MM format
        }))
      })
    }))
  }).optional(),

  // Enterprise device management (if applicable)
  enterpriseDevices: z.object({
    enabled: z.boolean(),
    organizationId: z.string().optional(),
    adminDevices: z.array(z.string()), // Device IDs with admin access
    managedDevices: z.array(z.object({
      deviceId: z.string(),
      employeeId: z.string(),
      department: z.string(),
      complianceLevel: z.enum(['standard', 'high', 'maximum']),
      auditingEnabled: z.boolean()
    }))
  }).optional(),

  // Device coordination policies
  coordinationPolicies: z.object({
    // Sync coordination
    syncCoordination: z.enum([
      'primary_device_leads',    // Primary device initiates all syncs
      'distributed_consensus',   // All devices participate in coordination
      'hub_and_spoke',          // Primary device is hub, others are spokes
      'peer_to_peer'            // Devices coordinate directly with each other
    ]).default('primary_device_leads'),

    // Conflict resolution across devices
    conflictResolution: z.enum([
      'primary_device_wins',     // Primary device always wins conflicts
      'most_recent_wins',        // Most recent change wins
      'user_prompt',            // Prompt user to resolve conflicts
      'intelligent_merge',       // AI-assisted conflict resolution
      'preserve_therapeutic'     // Always preserve therapeutic data integrity
    ]).default('preserve_therapeutic'),

    // Session handoff policies
    sessionHandoff: z.object({
      enabled: z.boolean().default(true),
      automaticHandoff: z.boolean().default(true),
      handoffTimeoutMs: z.number().default(5000), // 5 seconds
      preserveSessionState: z.boolean().default(true),
      requiredTrustLevel: z.enum(['verified', 'trusted']).default('verified')
    }),

    // Offline device handling
    offlineDeviceHandling: z.object({
      maxOfflineTime: z.number().default(604800000), // 1 week in ms
      offlineConflictStrategy: z.enum([
        'preserve_offline_changes',
        'primary_device_wins',
        'prompt_user_on_reconnect',
        'merge_compatible_changes'
      ]).default('preserve_offline_changes'),
      offlineSyncPriority: z.enum(['immediate', 'scheduled', 'user_initiated']).default('immediate')
    })
  }),

  // Performance tracking across devices
  performanceMetrics: z.object({
    averageSyncTime: z.number(), // milliseconds across all devices
    crossDeviceLatency: z.number(), // milliseconds for cross-device communication
    handoffSuccessRate: z.number().min(0).max(100), // percentage
    offlineReconciliationTime: z.number(), // milliseconds

    // Per-device performance
    devicePerformance: z.record(z.string(), z.object({
      averageResponseTime: z.number(), // milliseconds
      syncSuccessRate: z.number().min(0).max(100), // percentage
      lastPerformanceCheck: z.string() // ISO timestamp
    })),

    // Therapeutic session performance
    sessionHandoffPerformance: z.object({
      averageHandoffTime: z.number(), // milliseconds
      sessionContinuityRate: z.number().min(0).max(100), // percentage
      dataIntegrityMaintained: z.number().min(0).max(100) // percentage
    })
  })
});

export type DeviceRegistry = z.infer<typeof DeviceRegistrySchema>;

/**
 * THERAPEUTIC SESSION COORDINATION
 */

/**
 * Cross-device therapeutic session management
 */
export const TherapeuticSessionCoordinationSchema = z.object({
  // Session identification
  sessionId: z.string(),
  sessionType: z.enum(['morning', 'midday', 'evening', 'crisis', 'assessment', 'breathing']),
  userId: z.string(),

  // Session state across devices
  sessionState: z.object({
    // Current session state
    currentStep: z.number(),
    totalSteps: z.number(),
    progress: z.number().min(0).max(100), // percentage
    sessionData: z.record(z.string(), z.unknown()),

    // Timing information (critical for MBCT)
    startTime: z.string(), // ISO timestamp
    lastActivity: z.string(), // ISO timestamp
    totalSessionTime: z.number(), // milliseconds
    pausedDuration: z.number(), // milliseconds

    // Step timing for breathing exercises
    stepTimings: z.array(z.object({
      stepId: z.string(),
      startTime: z.string(), // ISO timestamp
      duration: z.number(), // milliseconds
      completed: z.boolean()
    })),

    // Session quality metrics
    sessionQuality: z.object({
      userEngagement: z.number().min(0).max(100), // percentage
      completionLikelihood: z.number().min(0).max(100), // percentage
      technicalQuality: z.number().min(0).max(100), // network, performance, etc.
      therapeuticValue: z.number().min(0).max(100) // clinical assessment
    })
  }),

  // Device coordination for session
  deviceCoordination: z.object({
    // Primary session device
    primaryDevice: z.string(),
    primaryDeviceCapabilities: z.object({
      hapticFeedback: z.boolean(),
      audioPlayback: z.boolean(),
      screenSize: z.enum(['small', 'medium', 'large']),
      batteryLevel: z.number().min(0).max(100).optional(),
      networkQuality: z.enum(['excellent', 'good', 'fair', 'poor'])
    }),

    // Available handoff devices
    handoffCandidates: z.array(z.object({
      deviceId: z.string(),
      handoffScore: z.number().min(0).max(100), // suitability for this session type
      handoffLatency: z.number(), // estimated milliseconds for handoff
      capabilityMatch: z.number().min(0).max(100), // how well capabilities match session needs
      userPreference: z.number().min(0).max(100) // user's preference for this device
    })),

    // Session preservation configuration
    preservationConfig: z.object({
      preserveOnDeviceSwitch: z.boolean(),
      preserveOnNetworkIssue: z.boolean(),
      preserveOnAppBackground: z.boolean(),
      preserveOnLowBattery: z.boolean(),
      maxPreservationTime: z.number().default(1800000), // 30 minutes in ms

      // What gets preserved
      preservedData: z.object({
        sessionProgress: z.boolean().default(true),
        userInputs: z.boolean().default(true),
        timingData: z.boolean().default(true),
        audioState: z.boolean().default(true),
        hapticPatterns: z.boolean().default(false) // Device-specific
      })
    })
  }),

  // Cross-device synchronization requirements
  syncRequirements: z.object({
    // Real-time requirements
    realtimeSync: z.boolean(), // For breathing exercises, crisis sessions
    maxSyncLatency: z.number(), // milliseconds
    syncFrequency: z.enum(['continuous', 'every_step', 'every_minute', 'on_completion']),

    // Data consistency requirements
    strictConsistency: z.boolean(), // For assessment data
    allowPartialSync: z.boolean(), // For non-critical data
    conflictResolutionStrategy: z.enum([
      'preserve_session_continuity',
      'primary_device_wins',
      'most_recent_wins',
      'merge_compatible',
      'pause_until_resolved'
    ]).default('preserve_session_continuity'),

    // Performance requirements
    handoffMaxTime: z.number().default(2000), // 2 seconds for handoff
    syncOperationMaxTime: z.number().default(500), // 500ms for sync operations
    failoverMaxTime: z.number().default(3000) // 3 seconds for device failover
  }),

  // Session handoff management
  handoffManagement: z.object({
    // Handoff triggers
    automaticHandoffTriggers: z.array(z.enum([
      'low_battery',           // Battery below threshold
      'poor_network',          // Network quality degraded
      'device_backgrounded',   // App backgrounded on current device
      'better_device_available', // User picked up preferred device
      'scheduled_handoff',     // User scheduled device switch
      'crisis_escalation'      // Crisis detected, need better device
    ])),

    // Handoff execution
    handoffExecution: z.object({
      validateTargetDevice: z.boolean().default(true),
      preserveSessionState: z.boolean().default(true),
      testConnectionFirst: z.boolean().default(true),
      requireUserConfirmation: z.boolean().default(false), // For crisis, auto-handoff

      // Handoff steps
      handoffSteps: z.array(z.object({
        step: z.enum([
          'validate_target_device',
          'prepare_session_data',
          'establish_secure_connection',
          'transfer_session_state',
          'verify_data_integrity',
          'activate_target_device',
          'deactivate_source_device',
          'confirm_handoff_success'
        ]),
        maxExecutionTime: z.number(), // milliseconds
        retryable: z.boolean(),
        criticalStep: z.boolean() // If this fails, abort handoff
      }))
    }),

    // Handoff failure handling
    failureHandling: z.object({
      maxRetries: z.number().default(2),
      fallbackToPrimaryDevice: z.boolean().default(true),
      preserveSessionOnFailure: z.boolean().default(true),
      notifyUserOnFailure: z.boolean().default(true),

      // Recovery strategies
      recoveryStrategies: z.array(z.enum([
        'retry_handoff',
        'fallback_to_primary',
        'preserve_and_pause',
        'continue_on_current_device',
        'escalate_to_user_choice'
      ]))
    })
  }),

  // Crisis session special handling
  crisisSessionHandling: z.object({
    isCrisisSession: z.boolean(),
    crisisLevel: z.enum(['low', 'moderate', 'high', 'emergency']).optional(),

    // Crisis-specific coordination
    crisisCoordination: z.object({
      prioritizeStabilityOverOptimization: z.boolean().default(true),
      allowEmergencyHandoff: z.boolean().default(true),
      bypassNormalValidation: z.boolean().default(true),
      preserveAllCrisisData: z.boolean().default(true),

      // Emergency device access
      emergencyDeviceAccess: z.object({
        allowAnyDevice: z.boolean(), // In emergency, any device can access
        bypassTrustValidation: z.boolean(),
        allowPartialData: z.boolean(), // Show partial session if needed
        emergencyFallbacks: z.array(z.string()) // Emergency fallback device IDs
      })
    }),

    // Performance overrides for crisis
    crisisPerformanceOverrides: z.object({
      maxHandoffTime: z.number().default(1000), // 1 second for crisis handoff
      maxSyncLatency: z.number().default(200), // 200ms max for crisis sync
      bypassQueueing: z.boolean().default(true),
      emergencyResourceAllocation: z.boolean().default(true)
    })
  }),

  // Session analytics and monitoring
  sessionAnalytics: z.object({
    // Performance tracking
    performanceMetrics: z.object({
      sessionStartLatency: z.number(), // milliseconds
      averageStepLatency: z.number(), // milliseconds
      handoffCount: z.number(),
      averageHandoffTime: z.number(), // milliseconds
      syncOperationCount: z.number(),
      averageSyncTime: z.number() // milliseconds
    }),

    // Quality metrics
    qualityMetrics: z.object({
      sessionCompletionRate: z.number().min(0).max(100), // percentage
      dataIntegrityScore: z.number().min(0).max(100), // percentage
      userSatisfactionScore: z.number().min(0).max(100).optional(), // if available
      technicalQualityScore: z.number().min(0).max(100) // network, performance, etc.
    }),

    // Device usage analytics
    deviceUsage: z.array(z.object({
      deviceId: z.string(),
      timeUsed: z.number(), // milliseconds
      stepsCompleted: z.number(),
      handoffEvents: z.number(),
      qualityScore: z.number().min(0).max(100)
    }))
  })
});

export type TherapeuticSessionCoordination = z.infer<typeof TherapeuticSessionCoordinationSchema>;

/**
 * OFFLINE-ONLINE RECONCILIATION
 */

/**
 * Offline device state management
 */
export const OfflineDeviceStateSchema = z.object({
  // Device offline context
  deviceId: z.string(),
  wentOfflineAt: z.string(), // ISO timestamp
  cameOnlineAt: z.string().optional(), // ISO timestamp
  offlineDuration: z.number().optional(), // milliseconds

  // Offline data accumulation
  offlineData: z.object({
    // Local modifications made while offline
    localModifications: z.array(z.object({
      entityId: z.string(),
      entityType: z.enum(['user_profile', 'check_in', 'assessment', 'crisis_plan', 'therapeutic_session']),
      modificationType: z.enum(['create', 'update', 'delete']),
      modifiedAt: z.string(), // ISO timestamp
      dataSnapshot: z.record(z.string(), z.unknown()),

      // Clinical significance
      clinicallySignificant: z.boolean(),
      affectsAssessment: z.boolean(),
      affectsCrisisData: z.boolean(),
      therapeuticSession: z.boolean()
    })),

    // Offline session activities
    offlineSessionActivities: z.array(z.object({
      sessionId: z.string(),
      sessionType: z.enum(['morning', 'midday', 'evening', 'crisis', 'breathing']),
      sessionData: z.record(z.string(), z.unknown()),
      completedOffline: z.boolean(),
      preservationRequired: z.boolean()
    })),

    // Data integrity information
    dataIntegrity: z.object({
      totalModifications: z.number(),
      hashedDataChecksum: z.string(),
      encryptionIntact: z.boolean(),
      lastLocalBackup: z.string() // ISO timestamp
    })
  }),

  // Reconciliation requirements
  reconciliationNeeds: z.object({
    // Immediate reconciliation required (crisis data)
    immediateReconciliation: z.boolean(),
    crisisDataInvolved: z.boolean(),
    assessmentDataInvolved: z.boolean(),
    therapeuticSessionsInvolved: z.boolean(),

    // Expected conflicts
    expectedConflicts: z.array(z.object({
      entityId: z.string(),
      conflictType: z.enum(['version_mismatch', 'concurrent_modification', 'schema_change']),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      resolutionStrategy: z.enum(['auto_merge', 'user_prompt', 'preserve_offline', 'preserve_online'])
    })),

    // Performance requirements for reconciliation
    performanceRequirements: z.object({
      maxReconciliationTime: z.number(), // milliseconds
      priorityOrder: z.array(z.enum(['crisis', 'assessment', 'therapeutic', 'profile', 'preferences'])),
      allowPartialReconciliation: z.boolean(),
      backgroundReconciliation: z.boolean()
    })
  }),

  // Network condition at reconciliation
  networkContext: z.object({
    connectionQuality: z.enum(['excellent', 'good', 'fair', 'poor']),
    bandwidthMbps: z.number().optional(),
    latencyMs: z.number().optional(),
    reliabilityScore: z.number().min(0).max(100) // percentage
  })
});

export type OfflineDeviceState = z.infer<typeof OfflineDeviceStateSchema>;

/**
 * Online reconciliation process
 */
export const OnlineReconciliationProcessSchema = z.object({
  // Reconciliation session
  reconciliationId: z.string(),
  deviceId: z.string(),
  startedAt: z.string(), // ISO timestamp
  completedAt: z.string().optional(), // ISO timestamp

  // Reconciliation phases
  phases: z.array(z.object({
    phase: z.enum([
      'connection_validation',    // Verify device connection and trust
      'data_discovery',          // Discover what changed offline vs online
      'conflict_detection',      // Detect conflicts between offline and online data
      'conflict_resolution',     // Resolve conflicts using defined strategies
      'data_synchronization',    // Sync resolved data across devices
      'integrity_verification',  // Verify data integrity after sync
      'session_restoration'      // Restore any interrupted therapeutic sessions
    ]),
    startedAt: z.string(), // ISO timestamp
    completedAt: z.string().optional(), // ISO timestamp
    status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
    result: z.string().optional(),
    errorMessage: z.string().optional(),

    // Performance tracking
    executionTime: z.number().optional(), // milliseconds
    dataProcessed: z.number().optional(), // bytes
    conflictsResolved: z.number().optional()
  })),

  // Discovered conflicts and their resolutions
  conflictResolutions: z.array(z.object({
    conflictId: z.string(),
    entityId: z.string(),
    conflictType: z.enum(['data_version', 'concurrent_edit', 'schema_mismatch', 'permission_change']),

    // Resolution details
    resolution: z.object({
      strategy: z.enum(['offline_wins', 'online_wins', 'merge', 'user_choice', 'preserve_both']),
      appliedAt: z.string(), // ISO timestamp
      resolutionTime: z.number(), // milliseconds
      dataIntegrityMaintained: z.boolean(),
      therapeuticContinuityPreserved: z.boolean()
    }),

    // Clinical validation (for therapeutic data)
    clinicalValidation: z.object({
      clinicalDataInvolved: z.boolean(),
      assessmentAccuracyMaintained: z.boolean(),
      crisisDataPreserved: z.boolean(),
      sessionContinuityMaintained: z.boolean(),
      reviewRequired: z.boolean()
    })
  })),

  // Reconciliation outcome
  outcome: z.object({
    success: z.boolean(),
    totalTime: z.number(), // milliseconds
    conflictsResolved: z.number(),
    dataIntegrityMaintained: z.boolean(),
    therapeuticContinuityPreserved: z.boolean(),

    // Post-reconciliation state
    deviceSyncStatus: z.enum(['fully_synced', 'partially_synced', 'sync_failed']),
    remainingConflicts: z.number(),
    requiresUserAttention: z.boolean(),
    requiresClinicalReview: z.boolean(),

    // Performance metrics
    performanceMetrics: z.object({
      reconciliationThroughput: z.number(), // operations per second
      networkUtilization: z.number().min(0).max(100), // percentage
      deviceResourceUsage: z.number().min(0).max(100) // percentage
    })
  })
});

export type OnlineReconciliationProcess = z.infer<typeof OnlineReconciliationProcessSchema>;

/**
 * CROSS-DEVICE SYNC SERVICE INTERFACE
 */

/**
 * Complete cross-device sync service state
 */
export interface CrossDeviceSyncState {
  // Device management
  readonly deviceRegistry: DeviceRegistry;
  readonly activeDevices: DeviceCapabilities[];
  readonly offlineDevices: OfflineDeviceState[];

  // Session coordination
  readonly activeSessions: TherapeuticSessionCoordination[];
  readonly sessionHandoffs: {
    readonly inProgress: number;
    readonly completed: number;
    readonly failed: number;
    readonly averageHandoffTime: number; // milliseconds
  };

  // Reconciliation tracking
  readonly reconciliation: {
    readonly activeReconciliations: OnlineReconciliationProcess[];
    readonly pendingReconciliations: OfflineDeviceState[];
    readonly completedToday: number;
    readonly averageReconciliationTime: number; // milliseconds
  };

  // Performance monitoring
  readonly performance: {
    readonly crossDeviceLatency: number; // milliseconds
    readonly syncSuccessRate: number; // 0-100 percentage
    readonly handoffSuccessRate: number; // 0-100 percentage
    readonly dataIntegrityScore: number; // 0-100 percentage
    readonly therapeuticContinuityScore: number; // 0-100 percentage
  };

  // System health
  readonly systemHealth: {
    readonly status: 'healthy' | 'degraded' | 'critical';
    readonly deviceConnectivity: number; // percentage of devices online
    readonly lastHealthCheck: string; // ISO timestamp
  };
}

/**
 * Cross-device sync service actions
 */
export interface CrossDeviceSyncActions {
  // Device management
  registerDevice: (device: DeviceCapabilities) => Promise<void>;
  updateDeviceCapabilities: (deviceId: string, capabilities: Partial<DeviceCapabilities>) => Promise<void>;
  setDeviceTrustLevel: (deviceId: string, trustLevel: DeviceCapabilities['trustLevel']['level']) => Promise<void>;
  designatePrimaryDevice: (deviceId: string) => Promise<void>;

  // Session coordination
  initiateTherapeuticSession: (sessionType: TherapeuticSessionCoordination['sessionType'], primaryDevice: string) => Promise<TherapeuticSessionCoordination>;
  coordinateSessionHandoff: (sessionId: string, fromDevice: string, toDevice: string) => Promise<boolean>;
  preserveSessionState: (sessionId: string) => Promise<void>;
  restoreSessionState: (sessionId: string, targetDevice: string) => Promise<boolean>;

  // Offline-online reconciliation
  handleDeviceReconnection: (deviceId: string) => Promise<OnlineReconciliationProcess>;
  reconcileOfflineData: (deviceId: string, offlineState: OfflineDeviceState) => Promise<OnlineReconciliationProcess>;
  resolveDataConflicts: (reconciliationId: string, conflictResolutions: Record<string, string>) => Promise<void>;

  // Cross-device synchronization
  syncDataAcrossDevices: (data: SyncableData[], targetDevices?: string[]) => Promise<void>;
  broadcastToAllDevices: (operation: SyncOperation) => Promise<void>;
  syncToSpecificDevice: (deviceId: string, data: SyncableData[]) => Promise<void>;

  // Performance and monitoring
  measureCrossDeviceLatency: () => Promise<number>;
  validateDataIntegrity: (deviceId: string) => Promise<boolean>;
  checkTherapeuticContinuity: (sessionId: string) => Promise<boolean>;
  getPerformanceMetrics: () => Promise<CrossDeviceSyncState['performance']>;

  // Crisis handling across devices
  handleCrisisAcrossDevices: (crisisLevel: 'low' | 'moderate' | 'high' | 'emergency') => Promise<void>;
  enableEmergencyDeviceAccess: (deviceId: string) => Promise<void>;
  broadcastCrisisState: (crisisData: SyncableData) => Promise<void>;
}

/**
 * Complete cross-device sync service interface
 */
export interface CrossDeviceSyncService extends CrossDeviceSyncState, CrossDeviceSyncActions {
  // Service lifecycle
  initialize: (config: CrossDeviceSyncConfig) => Promise<void>;
  shutdown: () => Promise<void>;

  // Type-safe cross-device operations
  executeCrossDeviceOperation: <T>(
    operation: SyncOperation,
    targetDevices: string[],
    executor: (deviceId: string) => Promise<T>,
    fallback?: T
  ) => Promise<Record<string, T>>;

  // Therapeutic session wrapper
  executeTherapeuticOperation: <T>(
    sessionId: string,
    executor: () => Promise<T>,
    preserveOnFailure?: boolean
  ) => Promise<T>;
}

/**
 * CONFIGURATION AND CONSTANTS
 */

/**
 * Cross-device sync configuration
 */
export const CrossDeviceSyncConfigSchema = z.object({
  // Service identification
  serviceId: z.string(),
  version: z.string(),
  environment: z.enum(['development', 'staging', 'production']),

  // Device management
  deviceManagement: z.object({
    maxDevicesPerUser: z.number().default(5),
    deviceTrustTimeout: z.number().default(7776000000), // 90 days in ms
    primaryDeviceFailoverTimeout: z.number().default(300000), // 5 minutes in ms
    offlineDeviceTimeout: z.number().default(604800000) // 1 week in ms
  }),

  // Session coordination
  sessionCoordination: z.object({
    maxConcurrentSessions: z.number().default(1), // One therapeutic session at a time
    sessionHandoffTimeout: z.number().default(5000), // 5 seconds
    sessionPreservationTimeout: z.number().default(1800000), // 30 minutes
    allowCrossDeviceHandoff: z.boolean().default(true)
  }),

  // Performance requirements
  performance: z.object({
    maxCrossDeviceLatency: z.number().default(2000), // 2 seconds
    maxHandoffTime: z.number().default(2000), // 2 seconds
    maxReconciliationTime: z.number().default(30000), // 30 seconds
    minSyncSuccessRate: z.number().default(95) // 95%
  }),

  // Reconciliation settings
  reconciliation: z.object({
    automaticReconciliation: z.boolean().default(true),
    maxReconciliationBacklog: z.number().default(10),
    conflictResolutionTimeout: z.number().default(30000), // 30 seconds
    preserveOfflineChanges: z.boolean().default(true)
  }),

  // Crisis handling
  crisisHandling: z.object({
    enableCrossDeviceCrisisSync: z.boolean().default(true),
    crisisDataBroadcastTimeout: z.number().default(1000), // 1 second
    allowEmergencyDeviceAccess: z.boolean().default(true),
    crisisDeviceFailoverTime: z.number().default(3000) // 3 seconds
  })
});

export type CrossDeviceSyncConfig = z.infer<typeof CrossDeviceSyncConfigSchema>;

/**
 * Constants and performance requirements
 */
export const CROSS_DEVICE_CONSTANTS = {
  // Performance requirements (non-negotiable)
  MAX_HANDOFF_TIME: 2000, // milliseconds
  MAX_CROSS_DEVICE_LATENCY: 2000, // milliseconds
  MAX_RECONCILIATION_TIME: 30000, // milliseconds
  CRISIS_SYNC_MAX_TIME: 1000, // milliseconds

  // Device limits
  MAX_DEVICES_FREE: 2,
  MAX_DEVICES_PREMIUM: 3,
  MAX_DEVICES_FAMILY: 8,
  MAX_DEVICES_ENTERPRISE: 50,

  // Session limits
  MAX_CONCURRENT_SESSIONS: 1, // Only one therapeutic session at a time
  MAX_PRESERVED_SESSIONS: 5,
  SESSION_PRESERVATION_TIME: 1800000, // 30 minutes

  // Trust levels and timeouts
  DEVICE_TRUST_LEVELS: ['untrusted', 'pending', 'verified', 'trusted', 'primary'],
  TRUST_VERIFICATION_TIMEOUT: 7776000000, // 90 days
  OFFLINE_DEVICE_TIMEOUT: 604800000, // 1 week

  // Performance thresholds
  HEALTHY_LATENCY: 500, // milliseconds
  WARNING_LATENCY: 1000, // milliseconds
  CRITICAL_LATENCY: 2000, // milliseconds

  // Success rate thresholds
  MIN_SYNC_SUCCESS_RATE: 95, // percentage
  MIN_HANDOFF_SUCCESS_RATE: 90, // percentage
  MIN_DATA_INTEGRITY_SCORE: 98 // percentage
} as const;

/**
 * Type guards for cross-device types
 */
export const isDeviceCapabilities = (value: unknown): value is DeviceCapabilities => {
  try {
    DeviceCapabilitiesSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isTherapeuticSessionCoordination = (value: unknown): value is TherapeuticSessionCoordination => {
  try {
    TherapeuticSessionCoordinationSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isOfflineDeviceState = (value: unknown): value is OfflineDeviceState => {
  try {
    OfflineDeviceStateSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Export schemas for runtime validation
 */
export default {
  DeviceCapabilitiesSchema,
  DeviceRegistrySchema,
  TherapeuticSessionCoordinationSchema,
  OfflineDeviceStateSchema,
  OnlineReconciliationProcessSchema,
  CrossDeviceSyncConfigSchema,

  // Type guards
  isDeviceCapabilities,
  isTherapeuticSessionCoordination,
  isOfflineDeviceState,

  // Constants
  CROSS_DEVICE_CONSTANTS
};