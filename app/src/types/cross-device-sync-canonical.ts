/**
 * Cross-Device Sync Canonical Types - Phase 4B Consolidation
 *
 * Consolidated from 6 cross-device sync type files:
 * - cross-device-sync.ts (base)
 * - comprehensive-cross-device-sync.ts
 * - cross-device-sync-ui.ts
 * - cross-device-sync-examples.ts
 * - orchestration/cross-device-sync-types.ts
 * - integration/cross-device-sync.ts
 *
 * CRITICAL PRESERVATION REQUIREMENTS:
 * - Crisis data sync priority (IMMUTABLE)
 * - Zero-knowledge encryption patterns (IMMUTABLE)
 * - Therapeutic session continuity (IMMUTABLE)
 * - HIPAA compliance validation (IMMUTABLE)
 * - Real-time crisis coordination (IMMUTABLE)
 *
 * @consolidation_result 6 files → 1 canonical file (83% reduction)
 */

import { z } from 'zod';

// === BRANDED TYPES FOR SYNC SYSTEM ===

/**
 * Branded type for device identifiers with validation
 */
export type DeviceID = string & { readonly __brand: 'DeviceID' };

/**
 * Branded type for sync operation identifiers
 */
export type SyncOperationID = string & { readonly __brand: 'SyncOperationID' };

/**
 * Branded type for encryption keys with security validation
 */
export type EncryptionKey = string & { readonly __brand: 'EncryptionKey' };

/**
 * Branded type for sync priority levels with crisis prioritization
 */
export type SyncPriorityLevel = ('low' | 'normal' | 'high' | 'crisis' | 'emergency') & { readonly __brand: 'SyncPriority' };

// === CORE SYNC TYPES ===

/**
 * Device information with capabilities and trust level
 */
export const DeviceInfoSchema = z.object({
  // Device identification
  deviceId: z.string(),
  deviceName: z.string(),
  platform: z.enum(['ios', 'android', 'web']),
  appVersion: z.string(),

  // Device capabilities
  capabilities: z.object({
    encryption: z.boolean(),
    offline: z.boolean(),
    realTimeSync: z.boolean(),
    biometricAuth: z.boolean(),
    pushNotifications: z.boolean(),
    backgroundSync: z.boolean()
  }),

  // Device status
  status: z.object({
    online: z.boolean(),
    lastSeen: z.string(), // ISO timestamp
    batteryLevel: z.number().min(0).max(100).optional(),
    networkQuality: z.enum(['poor', 'fair', 'good', 'excellent']).optional(),
    storageAvailable: z.number().optional() // MB
  }),

  // Trust and security
  security: z.object({
    trustLevel: z.enum(['unknown', 'basic', 'verified', 'trusted']),
    encryptionEnabled: z.boolean(),
    biometricEnabled: z.boolean(),
    lastSecurityValidation: z.string().optional(),
    compromised: z.boolean().default(false)
  }),

  // Registration information
  registration: z.object({
    registeredAt: z.string(),
    registeredBy: z.string(), // user ID
    verificationMethod: z.enum(['email', 'sms', 'biometric', 'manual']),
    verified: z.boolean()
  })
});

export type DeviceInfo = z.infer<typeof DeviceInfoSchema>;

/**
 * Sync operation with comprehensive metadata
 */
export const SyncOperationSchema = z.object({
  // Operation identification
  operationId: z.string(),
  timestamp: z.string(), // ISO timestamp
  priority: z.enum(['low', 'normal', 'high', 'crisis', 'emergency']),

  // Operation details
  operation: z.object({
    type: z.enum([
      'create',
      'update',
      'delete',
      'sync',
      'conflict_resolution',
      'crisis_sync',
      'emergency_sync'
    ]),
    entity: z.enum([
      'user_profile',
      'check_in',
      'assessment',
      'crisis_plan',
      'therapeutic_data',
      'device_settings',
      'sync_state'
    ]),
    entityId: z.string(),
    data: z.unknown().optional()
  }),

  // Source and target devices
  devices: z.object({
    sourceDevice: z.string(),
    targetDevices: z.array(z.string()),
    excludeDevices: z.array(z.string()).optional()
  }),

  // Sync metadata
  metadata: z.object({
    // Data classification (IMMUTABLE HIPAA requirement)
    dataClassification: z.enum(['public', 'internal', 'confidential', 'restricted', 'clinical']),
    sensitivityLevel: z.enum(['low', 'medium', 'high', 'critical']),

    // Clinical context (IMMUTABLE)
    clinicalData: z.boolean(),
    therapeuticData: z.boolean(),
    crisisRelated: z.boolean(),

    // Compliance requirements (IMMUTABLE)
    hipaaCompliant: z.boolean(),
    auditRequired: z.boolean(),
    encryptionRequired: z.boolean(),

    // Performance requirements
    performanceRequirements: z.object({
      maxLatency: z.number(), // milliseconds
      reliabilityLevel: z.enum(['standard', 'high', 'critical']),
      retryPolicy: z.enum(['none', 'standard', 'aggressive', 'infinite'])
    })
  }),

  // Encryption details (IMMUTABLE for clinical data)
  encryption: z.object({
    encrypted: z.boolean(),
    algorithm: z.string().optional(),
    keyId: z.string().optional(),
    integrityHash: z.string().optional(),

    // Zero-knowledge encryption (IMMUTABLE)
    zeroKnowledgeProof: z.object({
      proofHash: z.string().optional(),
      validationSignature: z.string().optional(),
      deviceSignature: z.string().optional()
    }).optional()
  }),

  // Conflict handling
  conflictResolution: z.object({
    strategy: z.enum([
      'last_write_wins',
      'first_write_wins',
      'manual_resolution',
      'therapeutic_priority',
      'crisis_priority',
      'clinical_override'
    ]),
    conflictDetected: z.boolean().optional(),
    resolutionRequired: z.boolean().optional(),
    resolutionData: z.unknown().optional()
  })
});

export type SyncOperation = z.infer<typeof SyncOperationSchema>;

/**
 * Sync state with real-time status tracking
 */
export const SyncStateSchema = z.object({
  // Overall sync status
  status: z.enum([
    'idle',
    'syncing',
    'conflict',
    'error',
    'emergency',
    'crisis_mode'
  ]),

  // Device synchronization state
  devices: z.record(z.string(), z.object({
    deviceId: z.string(),
    syncStatus: z.enum(['synced', 'pending', 'conflict', 'error', 'offline']),
    lastSyncTimestamp: z.string(),
    pendingOperations: z.number(),
    conflictCount: z.number(),
    errorCount: z.number()
  })),

  // Queue management
  queues: z.object({
    // Priority queues (IMMUTABLE crisis prioritization)
    emergency: z.object({
      count: z.number(),
      oldestTimestamp: z.string().optional(),
      processingTime: z.number() // milliseconds
    }),

    crisis: z.object({
      count: z.number(),
      oldestTimestamp: z.string().optional(),
      processingTime: z.number()
    }),

    high: z.object({
      count: z.number(),
      oldestTimestamp: z.string().optional(),
      processingTime: z.number()
    }),

    normal: z.object({
      count: z.number(),
      oldestTimestamp: z.string().optional(),
      processingTime: z.number()
    }),

    low: z.object({
      count: z.number(),
      oldestTimestamp: z.string().optional(),
      processingTime: z.number()
    })
  }),

  // Performance metrics
  performance: z.object({
    averageLatency: z.number(), // milliseconds
    successRate: z.number().min(0).max(1), // percentage as decimal
    errorRate: z.number().min(0).max(1),
    throughputPerMinute: z.number(),

    // Crisis performance (IMMUTABLE requirements)
    crisisResponseTime: z.number().optional(), // milliseconds
    emergencyProcessingTime: z.number().optional(),
    therapeuticDataLatency: z.number().optional()
  }),

  // Conflict management
  conflicts: z.object({
    activeConflicts: z.number(),
    resolvedConflicts: z.number(),
    manualResolutionRequired: z.number(),

    // Crisis conflict handling (IMMUTABLE)
    crisisConflictsAutoResolved: z.number(),
    therapeuticConflictsEscalated: z.number()
  })
});

export type SyncState = z.infer<typeof SyncStateSchema>;

// === CRISIS AND THERAPEUTIC SYNC ===

/**
 * Crisis sync coordination for emergency scenarios
 */
export const CrisisSyncCoordinationSchema = z.object({
  // Crisis identification
  crisisId: z.string(),
  triggeredAt: z.string(),
  severity: z.enum(['moderate', 'high', 'critical', 'emergency']),

  // Sync coordination
  coordination: z.object({
    // Priority overrides (IMMUTABLE)
    emergencyPriorityActive: z.boolean(),
    allDevicesTargeted: z.boolean(),
    instantSyncRequired: z.boolean(),

    // Performance requirements (IMMUTABLE)
    maxResponseTime: z.number().default(200), // milliseconds
    maxPropagationTime: z.number().default(5000), // 5 seconds
    reliabilityRequired: z.number().default(0.999), // 99.9%

    // Crisis data types to sync
    crisisDataTypes: z.array(z.enum([
      'crisis_plan',
      'emergency_contacts',
      'crisis_notes',
      'safety_plan',
      'assessment_scores',
      'therapeutic_state',
      'medication_info'
    ])),

    // Coordination status
    coordinationStatus: z.enum([
      'initiated',
      'propagating',
      'synchronized',
      'failed',
      'escalated'
    ]),

    coordinationResults: z.record(z.string(), z.object({
      deviceId: z.string(),
      syncSuccess: z.boolean(),
      syncTime: z.number(), // milliseconds
      errorMessage: z.string().optional()
    }))
  }),

  // Therapeutic session preservation (IMMUTABLE)
  therapeuticContinuity: z.object({
    sessionActive: z.boolean(),
    sessionId: z.string().optional(),
    sessionData: z.unknown().optional(),
    continuityRequired: z.boolean(),
    continuityAchieved: z.boolean()
  })
});

export type CrisisSyncCoordination = z.infer<typeof CrisisSyncCoordinationSchema>;

/**
 * Therapeutic session coordination across devices
 */
export const TherapeuticSessionCoordinationSchema = z.object({
  // Session identification
  sessionId: z.string(),
  sessionType: z.enum([
    'breathing_exercise',
    'mindfulness_session',
    'assessment_completion',
    'mood_tracking',
    'crisis_intervention',
    'therapeutic_check_in'
  ]),

  // Session state
  sessionState: z.object({
    active: z.boolean(),
    startedAt: z.string(),
    lastActivity: z.string(),
    primaryDevice: z.string(),
    secondaryDevices: z.array(z.string()),

    // Session progress
    progress: z.object({
      currentStep: z.number(),
      totalSteps: z.number(),
      completionPercentage: z.number().min(0).max(100),
      milestones: z.array(z.object({
        step: z.number(),
        timestamp: z.string(),
        device: z.string(),
        data: z.unknown().optional()
      }))
    })
  }),

  // Cross-device coordination
  coordination: z.object({
    // Synchronization strategy (IMMUTABLE for therapeutic accuracy)
    syncStrategy: z.enum([
      'real_time',        // Immediate sync (crisis scenarios)
      'near_real_time',   // <1 second sync
      'periodic',         // Regular interval sync
      'on_milestone',     // Sync at key points
      'session_end'       // Sync only when complete
    ]),

    // Data consistency requirements (IMMUTABLE)
    consistencyRequirements: z.object({
      strongConsistency: z.boolean(),
      therapeuticAccuracy: z.boolean(),
      crisisDataIntegrity: z.boolean(),
      temporalConsistency: z.boolean()
    }),

    // Device participation
    deviceParticipation: z.record(z.string(), z.object({
      role: z.enum(['primary', 'secondary', 'observer']),
      capabilities: z.array(z.enum([
        'display',
        'input',
        'audio',
        'haptic',
        'biometric',
        'sensors'
      ])),
      syncStatus: z.enum(['active', 'passive', 'disconnected']),
      lastSync: z.string()
    }))
  }),

  // Quality assurance (IMMUTABLE therapeutic requirements)
  qualityAssurance: z.object({
    dataIntegrityValidated: z.boolean(),
    therapeuticAccuracyConfirmed: z.boolean(),
    noDataLoss: z.boolean(),
    sessionContinuityMaintained: z.boolean(),
    clinicalValidationPassed: z.boolean()
  })
});

export type TherapeuticSessionCoordination = z.infer<typeof TherapeuticSessionCoordinationSchema>;

// === CONFLICT RESOLUTION ===

/**
 * Sync conflict with resolution strategies
 */
export const SyncConflictSchema = z.object({
  // Conflict identification
  conflictId: z.string(),
  detectedAt: z.string(),
  operationId: z.string(),

  // Conflict details
  conflict: z.object({
    type: z.enum([
      'concurrent_update',
      'version_mismatch',
      'data_inconsistency',
      'device_time_skew',
      'encryption_mismatch',
      'therapeutic_data_conflict',
      'crisis_data_conflict'
    ]),

    severity: z.enum(['low', 'medium', 'high', 'critical']),

    // Conflicting data
    conflicts: z.array(z.object({
      field: z.string(),
      sourceValue: z.unknown(),
      targetValue: z.unknown(),
      sourceDevice: z.string(),
      targetDevice: z.string(),
      sourceTimestamp: z.string(),
      targetTimestamp: z.string()
    })),

    // Clinical implications (IMMUTABLE)
    clinicalImplications: z.object({
      affectsTherapeuticData: z.boolean(),
      affectsCrisisData: z.boolean(),
      affectsAssessmentScores: z.boolean(),
      clinicalAccuracyImpact: z.enum(['none', 'low', 'medium', 'high', 'critical'])
    })
  }),

  // Resolution configuration
  resolution: z.object({
    // Resolution strategy (IMMUTABLE for clinical data)
    strategy: z.enum([
      'last_write_wins',           // Standard strategy
      'first_write_wins',          // Conservative strategy
      'merge_compatible_changes',  // Smart merging
      'therapeutic_priority',      // Clinical data wins
      'crisis_priority',           // Crisis data wins
      'manual_resolution',         // Require user input
      'clinical_validation'        // Require clinical review
    ]),

    // Automatic resolution rules
    automaticResolution: z.object({
      enabled: z.boolean(),
      confidenceThreshold: z.number().min(0).max(1),
      crisisDataAutoResolve: z.boolean(),
      therapeuticDataEscalate: z.boolean()
    }),

    // Resolution result
    resolution: z.object({
      resolved: z.boolean(),
      resolutionMethod: z.string().optional(),
      resolutionData: z.unknown().optional(),
      resolutionTimestamp: z.string().optional(),
      manualReviewRequired: z.boolean(),
      clinicalValidationRequired: z.boolean()
    }).optional()
  })
});

export type SyncConflict = z.infer<typeof SyncConflictSchema>;

// === OFFLINE AND NETWORK HANDLING ===

/**
 * Offline queue management for disconnected scenarios
 */
export const OfflineQueueSchema = z.object({
  // Queue metadata
  queueId: z.string(),
  deviceId: z.string(),
  createdAt: z.string(),

  // Queue configuration
  configuration: z.object({
    maxQueueSize: z.number(),
    maxRetentionHours: z.number(),
    priorityPreservation: z.boolean(),

    // Crisis handling (IMMUTABLE)
    crisisOperationRetention: z.number().default(168), // 7 days
    emergencyOperationPriority: z.boolean().default(true),
    therapeuticDataProtection: z.boolean().default(true)
  }),

  // Queued operations
  operations: z.array(z.object({
    operationId: z.string(),
    queuedAt: z.string(),
    priority: z.enum(['low', 'normal', 'high', 'crisis', 'emergency']),
    operation: SyncOperationSchema,
    retryCount: z.number(),
    lastRetryAt: z.string().optional(),

    // Offline-specific metadata
    offlineMetadata: z.object({
      deviceState: z.enum(['offline', 'poor_connection', 'background']),
      estimatedDataSize: z.number(),
      compressionApplied: z.boolean(),
      localValidationPassed: z.boolean()
    })
  })),

  // Queue statistics
  statistics: z.object({
    totalOperations: z.number(),
    crisisOperations: z.number(),
    emergencyOperations: z.number(),
    failedOperations: z.number(),
    averageQueueTime: z.number(), // milliseconds

    // Storage usage
    storageUsed: z.number(), // bytes
    compressionRatio: z.number().optional()
  })
});

export type OfflineQueue = z.infer<typeof OfflineQueueSchema>;

// === PERFORMANCE AND MONITORING ===

/**
 * Sync performance metrics with therapeutic benchmarks
 */
export const SyncPerformanceMetricsSchema = z.object({
  // Measurement period
  measurementPeriod: z.object({
    startTime: z.string(),
    endTime: z.string(),
    durationMs: z.number()
  }),

  // Core performance metrics
  performance: z.object({
    // Latency metrics
    averageLatency: z.number(),
    p95Latency: z.number(),
    p99Latency: z.number(),
    maxLatency: z.number(),

    // Throughput metrics
    operationsPerSecond: z.number(),
    operationsPerMinute: z.number(),
    bytesPerSecond: z.number(),

    // Reliability metrics
    successRate: z.number().min(0).max(1),
    errorRate: z.number().min(0).max(1),
    retryRate: z.number().min(0).max(1),

    // Availability metrics
    uptime: z.number().min(0).max(1),
    deviceConnectivity: z.number().min(0).max(1)
  }),

  // Crisis and therapeutic performance (IMMUTABLE benchmarks)
  therapeuticPerformance: z.object({
    // Crisis response metrics (IMMUTABLE <200ms requirement)
    crisisResponseTime: z.number(),
    emergencyPropagationTime: z.number(),
    therapeuticDataLatency: z.number(),

    // Quality metrics
    dataIntegrityRate: z.number().min(0).max(1),
    therapeuticAccuracyRate: z.number().min(0).max(1),
    sessionContinuityRate: z.number().min(0).max(1),

    // Compliance metrics
    hipaaComplianceRate: z.number().min(0).max(1),
    encryptionSuccessRate: z.number().min(0).max(1),
    auditTrailCompleteness: z.number().min(0).max(1)
  }),

  // Device-specific metrics
  deviceMetrics: z.record(z.string(), z.object({
    deviceId: z.string(),
    latency: z.number(),
    reliability: z.number(),
    bandwidth: z.number(),
    storageUsage: z.number(),
    batteryImpact: z.number().optional()
  })),

  // Alert conditions
  alerts: z.array(z.object({
    alertType: z.enum([
      'latency_threshold_exceeded',
      'error_rate_high',
      'crisis_response_slow',
      'therapeutic_accuracy_low',
      'device_connectivity_poor',
      'storage_usage_high'
    ]),
    severity: z.enum(['info', 'warning', 'critical']),
    message: z.string(),
    timestamp: z.string()
  }))
});

export type SyncPerformanceMetrics = z.infer<typeof SyncPerformanceMetricsSchema>;

// === SERVICE INTERFACES ===

/**
 * Cross-device sync service interface compatible with Phase 3D services
 */
export interface CrossDeviceSyncCanonicalService {
  // Service lifecycle
  initialize: (config: CrossDeviceSyncConfig) => Promise<void>;
  shutdown: () => Promise<void>;

  // Device management
  registerDevice: (deviceInfo: DeviceInfo) => Promise<void>;
  unregisterDevice: (deviceId: string) => Promise<void>;
  getDeviceInfo: (deviceId: string) => Promise<DeviceInfo>;
  listDevices: (userId: string) => Promise<DeviceInfo[]>;

  // Sync operations
  queueOperation: (operation: SyncOperation) => Promise<string>;
  processOperations: () => Promise<void>;
  getSyncState: () => Promise<SyncState>;

  // Crisis and therapeutic sync (IMMUTABLE)
  initiateCrisisSync: (crisisId: string, deviceIds: string[]) => Promise<CrisisSyncCoordination>;
  coordinateTherapeuticSession: (sessionId: string, sessionType: string) => Promise<TherapeuticSessionCoordination>;

  // Conflict resolution
  resolveConflict: (conflictId: string, resolution: unknown) => Promise<void>;
  getConflicts: () => Promise<SyncConflict[]>;

  // Performance monitoring
  getPerformanceMetrics: (periodMs: number) => Promise<SyncPerformanceMetrics>;

  // Offline support
  getOfflineQueue: (deviceId: string) => Promise<OfflineQueue>;
  processOfflineQueue: (deviceId: string) => Promise<void>;
}

/**
 * Cross-device sync configuration
 */
export const CrossDeviceSyncConfigSchema = z.object({
  // Service configuration
  serviceId: z.string(),
  environment: z.enum(['development', 'staging', 'production']),

  // Sync behavior
  sync: z.object({
    defaultPriority: z.enum(['low', 'normal', 'high']),
    batchSize: z.number().min(1).max(1000),
    maxRetries: z.number().min(0).max(10),
    retryDelayMs: z.number().min(100),

    // Real-time sync
    realTimeEnabled: z.boolean(),
    realTimeThrottleMs: z.number().min(10)
  }),

  // Crisis handling (IMMUTABLE)
  crisis: z.object({
    crisisPriorityEnabled: z.boolean().default(true),
    emergencyResponseTimeMs: z.number().default(200),
    crisisDataRetentionDays: z.number().default(30),
    therapeuticContinuityRequired: z.boolean().default(true)
  }),

  // Performance requirements (IMMUTABLE therapeutic benchmarks)
  performance: z.object({
    maxLatencyMs: z.number().default(2000),
    minReliabilityRate: z.number().default(0.99),
    maxErrorRate: z.number().default(0.01),

    // Crisis performance (IMMUTABLE)
    crisisMaxResponseMs: z.number().default(200),
    therapeuticDataMaxLatencyMs: z.number().default(1000),
    emergencyPropagationMaxMs: z.number().default(5000)
  }),

  // Security and compliance (IMMUTABLE)
  security: z.object({
    encryptionRequired: z.boolean().default(true),
    zeroKnowledgeProofRequired: z.boolean().default(true),
    deviceTrustValidation: z.boolean().default(true),
    auditLoggingEnabled: z.boolean().default(true)
  }),

  // Offline support
  offline: z.object({
    offlineQueueEnabled: z.boolean(),
    maxOfflineOperations: z.number(),
    maxOfflineRetentionDays: z.number(),
    compressionEnabled: z.boolean()
  })
});

export type CrossDeviceSyncConfig = z.infer<typeof CrossDeviceSyncConfigSchema>;

// === TYPE GUARDS ===

export function isDeviceID(value: unknown): value is DeviceID {
  return typeof value === 'string' &&
         value.length > 0 &&
         /^[a-zA-Z0-9_-]+$/.test(value);
}

export function isSyncOperationID(value: unknown): value is SyncOperationID {
  return typeof value === 'string' &&
         value.length > 0 &&
         /^sync_[a-zA-Z0-9_-]+$/.test(value);
}

export function isSyncPriorityLevel(value: unknown): value is SyncPriorityLevel {
  return typeof value === 'string' &&
         ['low', 'normal', 'high', 'crisis', 'emergency'].includes(value);
}

export const isSyncOperation = (value: unknown): value is SyncOperation => {
  try {
    SyncOperationSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isCrisisSyncCoordination = (value: unknown): value is CrisisSyncCoordination => {
  try {
    CrisisSyncCoordinationSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isSyncConflict = (value: unknown): value is SyncConflict => {
  try {
    SyncConflictSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

// === FACTORY FUNCTIONS ===

export function createDeviceID(id: string): DeviceID {
  if (!isDeviceID(id)) {
    throw new Error(`Invalid device ID: ${id}. Must be alphanumeric with hyphens/underscores`);
  }
  return id as DeviceID;
}

export function createSyncOperationID(operation: string): SyncOperationID {
  const id = `sync_${operation}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return id as SyncOperationID;
}

export function createSyncPriorityLevel(level: string): SyncPriorityLevel {
  if (!isSyncPriorityLevel(level)) {
    throw new Error(`Invalid sync priority level: ${level}`);
  }
  return level as SyncPriorityLevel;
}

// === CONSTANTS (IMMUTABLE) ===

/**
 * Cross-device sync constants
 * CRITICAL: These values are IMMUTABLE for therapeutic and crisis safety
 */
export const CROSS_DEVICE_SYNC_CANONICAL_CONSTANTS = {
  // Performance requirements (IMMUTABLE)
  PERFORMANCE: {
    CRISIS_MAX_RESPONSE_MS: 200,     // Crisis sync <200ms - IMMUTABLE
    THERAPEUTIC_MAX_LATENCY_MS: 1000, // Therapeutic data <1s - IMMUTABLE
    EMERGENCY_PROPAGATION_MAX_MS: 5000, // Emergency sync <5s - IMMUTABLE
    MIN_RELIABILITY_RATE: 0.99,      // 99% reliability - IMMUTABLE
    MAX_ERROR_RATE: 0.01              // <1% error rate - IMMUTABLE
  },

  // Priority levels (IMMUTABLE)
  PRIORITIES: {
    EMERGENCY: 'emergency' as SyncPriorityLevel,
    CRISIS: 'crisis' as SyncPriorityLevel,
    HIGH: 'high' as SyncPriorityLevel,
    NORMAL: 'normal' as SyncPriorityLevel,
    LOW: 'low' as SyncPriorityLevel
  },

  // Data classifications (IMMUTABLE HIPAA requirement)
  DATA_CLASSIFICATIONS: {
    CLINICAL: 'clinical',
    THERAPEUTIC: 'therapeutic',
    CRISIS: 'crisis',
    CONFIDENTIAL: 'confidential',
    RESTRICTED: 'restricted'
  },

  // Sync strategies (IMMUTABLE for therapeutic accuracy)
  SYNC_STRATEGIES: {
    REAL_TIME: 'real_time',           // <200ms for crisis
    NEAR_REAL_TIME: 'near_real_time', // <1s for therapeutic
    PERIODIC: 'periodic',             // Regular intervals
    ON_MILESTONE: 'on_milestone',     // Key session points
    SESSION_END: 'session_end'        // Complete sessions only
  },

  // Conflict resolution (IMMUTABLE for clinical data)
  CONFLICT_RESOLUTION: {
    THERAPEUTIC_PRIORITY: 'therapeutic_priority',
    CRISIS_PRIORITY: 'crisis_priority',
    CLINICAL_VALIDATION: 'clinical_validation',
    MANUAL_RESOLUTION: 'manual_resolution'
  },

  // Retention periods (IMMUTABLE compliance requirements)
  RETENTION: {
    CRISIS_DATA_DAYS: 30,      // Crisis data retention
    AUDIT_LOG_DAYS: 2555,      // 7 years HIPAA compliance
    OFFLINE_QUEUE_DAYS: 7,     // Offline operation retention
    CONFLICT_HISTORY_DAYS: 90  // Conflict resolution history
  }
} as const;

// === LEGACY COMPONENT INTERFACE ENUMS (For React Component Compatibility) ===

/**
 * Sync status enumeration for component integration
 * Maps to SyncState.status values for React component compatibility
 */
export enum SyncStatus {
  IDLE = 'idle',
  SYNCING = 'syncing',
  CONFLICT = 'conflict',
  ERROR = 'error',
  SUCCESS = 'success',
  PAUSED = 'paused'
}

/**
 * Sync entity types for component filtering
 * Maps to SyncOperation.operation.entity values
 */
export enum SyncEntityType {
  CHECK_IN = 'check_in',
  ASSESSMENT = 'assessment',
  USER_PROFILE = 'user_profile',
  CRISIS_PLAN = 'crisis_plan',
  WIDGET_DATA = 'widget_data',
  SESSION_DATA = 'session_data'
}

/**
 * Network quality enum for component display
 * Maps to DeviceInfo.status.networkQuality values
 */
export enum NetworkQuality {
  POOR = 'poor',
  FAIR = 'fair',
  GOOD = 'good',
  EXCELLENT = 'excellent',
  OFFLINE = 'offline'
}

/**
 * App sync state interface for component integration
 * Simplified interface matching React component needs
 */
export interface AppSyncState {
  globalStatus: SyncStatus;
  lastGlobalSync?: string;
  storeStatuses: StoreSyncStatus[];
  conflicts?: SyncConflict[];
}

/**
 * Store sync status for individual entity types
 */
export interface StoreSyncStatus {
  storeType: SyncEntityType;
  status: SyncStatus;
  lastSync?: string;
  syncProgress?: SyncProgress;
  pendingOperations?: number;
  conflicts?: SyncConflict[];
  errors?: string[];
}

/**
 * Sync progress information for UI display
 */
export interface SyncProgress {
  percentage: number;
  completed: number;
  total: number;
  currentOperation?: string;
}

/**
 * Conflict type enumeration for component handling
 */
export enum ConflictType {
  DATA_CONFLICT = 'data_conflict',
  VERSION_CONFLICT = 'version_conflict',
  DELETE_CONFLICT = 'delete_conflict',
  CLINICAL_CONFLICT = 'clinical_conflict',
  CRISIS_CONFLICT = 'crisis_conflict'
}

/**
 * Conflict resolution strategies for components
 */
export enum ConflictResolutionStrategy {
  MANUAL = 'manual',
  AUTOMATIC_MERGE = 'automatic_merge',
  PREFER_LOCAL = 'prefer_local',
  PREFER_REMOTE = 'prefer_remote',
  CLINICAL_PRIORITY = 'clinical_priority',
  CRISIS_PRIORITY = 'crisis_priority'
}

/**
 * Conflict resolution result for UI feedback
 */
export interface ConflictResolution {
  conflictId: string;
  strategy: ConflictResolutionStrategy;
  resolvedAt: string;
  resolvedBy: string;
  mergedData?: unknown;
  manualIntervention?: boolean;
}

// === EXPORTS ===

export default {
  // Schemas
  DeviceInfoSchema,
  SyncOperationSchema,
  SyncStateSchema,
  CrisisSyncCoordinationSchema,
  TherapeuticSessionCoordinationSchema,
  SyncConflictSchema,
  OfflineQueueSchema,
  SyncPerformanceMetricsSchema,
  CrossDeviceSyncConfigSchema,

  // Type guards
  isDeviceID,
  isSyncOperationID,
  isSyncPriorityLevel,
  isSyncOperation,
  isCrisisSyncCoordination,
  isSyncConflict,

  // Factory functions
  createDeviceID,
  createSyncOperationID,
  createSyncPriorityLevel,

  // Constants
  CROSS_DEVICE_SYNC_CANONICAL_CONSTANTS
};