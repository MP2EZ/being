/**
 * Payment-Aware Sync Context Service Types
 * Day 18 P0-CLOUD Platform Infrastructure Implementation
 *
 * Comprehensive TypeScript type definitions for:
 * - Multi-tier priority queue system with crisis override
 * - Subscription tier sync policies and enforcement
 * - Crisis safety constraints with <200ms response validation
 * - Cross-device coordination with therapeutic session preservation
 * - HIPAA-compliant zero-PII design with compliance validation
 * - Day 18 webhook system integration types
 */

import { z } from 'zod';
import type {
  SyncMetadata,
  SyncableData,
  SyncOperation,
  SyncStatus,
  SyncEntityType,
  OfflinePriority,
  ConflictResolutionStrategy
} from './sync';
import type {
  SubscriptionTier,
  SubscriptionState,
  FeatureAccessResult
} from './subscription';
import type {
  CrisisPaymentOverride
} from './payment';

/**
 * CORE PRIORITY QUEUE SYSTEM TYPES
 * Crisis Emergency = 10, Background = 1
 */

/**
 * Multi-tier priority levels with crisis override capability
 */
export const SyncPriorityLevelSchema = z.enum([
  'background',      // 1 - Low priority background sync
  'normal',          // 3 - Standard user operations
  'therapeutic',     // 5 - Therapeutic content and session data
  'assessment',      // 7 - Clinical assessments and crisis detection
  'crisis_urgent',   // 9 - Crisis-related but not emergency
  'crisis_emergency' // 10 - Life-safety emergency operations
]);

export type SyncPriorityLevel = z.infer<typeof SyncPriorityLevelSchema>;

/**
 * Priority queue entry with subscription tier context
 */
export const SyncPriorityEntrySchema = z.object({
  // Core priority data
  operationId: z.string(),
  priority: z.number().min(1).max(10),
  priorityLevel: SyncPriorityLevelSchema,

  // Subscription context
  subscriptionTier: z.enum(['free', 'premium', 'family', 'enterprise']),
  tierPolicyId: z.string(),

  // Crisis safety context
  crisisMode: z.boolean(),
  crisisOverride: z.boolean(),
  emergencyBypass: z.boolean(),

  // Performance constraints
  maxExecutionTime: z.number(), // milliseconds
  responseTimeTarget: z.number(), // milliseconds for crisis <200ms

  // Queue metadata
  enqueuedAt: z.string(), // ISO timestamp
  scheduledFor: z.string().optional(), // ISO timestamp
  dependencies: z.array(z.string()).default([]),

  // Subscription validation
  requiresSubscriptionValidation: z.boolean(),
  tierEnforcementRequired: z.boolean(),

  // Compliance tracking
  containsHealthData: z.boolean(),
  requiresHipaaCompliance: z.boolean(),
  piiValidationRequired: z.boolean()
});

export type SyncPriorityEntry = z.infer<typeof SyncPriorityEntrySchema>;

/**
 * Priority queue state with performance metrics
 */
export const SyncPriorityQueueStateSchema = z.object({
  // Queue contents by priority level
  emergencyQueue: z.array(SyncPriorityEntrySchema), // Priority 10
  urgentQueue: z.array(SyncPriorityEntrySchema),    // Priority 8-9
  normalQueue: z.array(SyncPriorityEntrySchema),    // Priority 4-7
  backgroundQueue: z.array(SyncPriorityEntrySchema), // Priority 1-3

  // Queue metrics
  totalEntries: z.number(),
  processingRate: z.number(), // operations per second
  averageWaitTime: z.number(), // milliseconds

  // Crisis response metrics
  crisisResponseTimes: z.array(z.number()), // milliseconds
  crisisViolations: z.number(), // Count of >200ms responses
  lastCrisisViolation: z.string().optional(), // ISO timestamp

  // Subscription tier metrics
  tierDistribution: z.record(z.string(), z.number()), // tier -> count
  tierPolicyViolations: z.number(),

  // Performance health
  queueHealth: z.enum(['healthy', 'degraded', 'critical']),
  lastHealthCheck: z.string(), // ISO timestamp

  // Compliance status
  hipaaComplianceValidated: z.boolean(),
  piiDetectionActive: z.boolean(),
  complianceViolations: z.array(z.string())
});

export type SyncPriorityQueueState = z.infer<typeof SyncPriorityQueueStateSchema>;

/**
 * SUBSCRIPTION TIER SYNC POLICIES
 */

/**
 * Subscription tier sync policy configuration
 */
export const SubscriptionSyncPolicySchema = z.object({
  // Tier identification
  tier: z.enum(['free', 'premium', 'family', 'enterprise']),
  policyId: z.string(),
  policyVersion: z.string(),

  // Sync limits and quotas
  maxSyncOperationsPerHour: z.number(),
  maxDataTransferPerDay: z.number(), // bytes
  maxConcurrentOperations: z.number(),

  // Priority allocation
  allowedPriorityLevels: z.array(SyncPriorityLevelSchema),
  defaultPriority: SyncPriorityLevelSchema,
  crisisAccessLevel: z.enum(['full', 'limited', 'emergency_only']),

  // Feature access for sync operations
  enabledSyncFeatures: z.array(z.enum([
    'cross_device_sync',
    'real_time_sync',
    'conflict_resolution',
    'therapeutic_session_preservation',
    'advanced_analytics_sync',
    'family_data_sharing',
    'enterprise_audit_logs'
  ])),

  // Performance requirements
  guaranteedResponseTime: z.number(), // milliseconds
  batchSizeLimit: z.number(),
  retryPolicyId: z.string(),

  // Data access permissions
  dataAccessScope: z.array(z.enum([
    'basic_profile',
    'mood_tracking',
    'assessment_scores',
    'therapeutic_content',
    'crisis_data',
    'family_data',
    'enterprise_analytics'
  ])),

  // Crisis safety guarantees
  crisisAccessGuaranteed: z.boolean(),
  emergencyBypassAllowed: z.boolean(),
  crisisDataRetentionDays: z.number(),

  // Trial and grace period handling
  trialAccess: z.object({
    enabledFeatures: z.array(z.string()),
    limitedQuotas: z.boolean(),
    gracePeriodDays: z.number()
  }).optional(),

  // Compliance requirements
  hipaaRequired: z.boolean(),
  auditLoggingRequired: z.boolean(),
  dataEncryptionLevel: z.enum(['standard', 'enhanced', 'enterprise']),

  // Policy metadata
  effectiveDate: z.string(), // ISO date
  expirationDate: z.string().optional(), // ISO date
  lastUpdated: z.string() // ISO timestamp
});

export type SubscriptionSyncPolicy = z.infer<typeof SubscriptionSyncPolicySchema>;

/**
 * Subscription tier enforcement result
 */
export const SyncTierEnforcementResultSchema = z.object({
  // Enforcement decision
  allowed: z.boolean(),
  enforcedTier: z.enum(['free', 'premium', 'family', 'enterprise']),
  policyApplied: z.string(), // policy ID

  // Quota status
  quotaStatus: z.object({
    operationsUsed: z.number(),
    operationsLimit: z.number(),
    dataTransferUsed: z.number(), // bytes
    dataTransferLimit: z.number(), // bytes
    quotaResetTime: z.string() // ISO timestamp
  }),

  // Feature access validation
  featureAccess: z.record(z.string(), z.boolean()), // feature -> allowed
  priorityAllowed: z.boolean(),

  // Crisis context
  crisisOverrideActive: z.boolean(),
  emergencyBypassGranted: z.boolean(),
  crisisAccessReason: z.string().optional(),

  // Performance impact
  enforcementLatency: z.number(), // milliseconds
  cacheHit: z.boolean(),
  validationTime: z.string(), // ISO timestamp

  // Error details if denied
  denialReason: z.string().optional(),
  upgradeRecommendation: z.string().optional(),
  fallbackOptions: z.array(z.string()).optional(),

  // Compliance validation
  complianceChecks: z.object({
    hipaaValidated: z.boolean(),
    piiDetected: z.boolean(),
    encryptionLevel: z.string(),
    auditRequired: z.boolean()
  })
});

export type SyncTierEnforcementResult = z.infer<typeof SyncTierEnforcementResultSchema>;

/**
 * CRISIS SAFETY CONSTRAINT TYPES
 */

/**
 * Crisis safety constraints with <200ms response validation
 */
export const CrisisSafetyConstraintSchema = z.object({
  // Crisis identification
  crisisSessionId: z.string(),
  crisisLevel: z.enum(['low', 'moderate', 'high', 'emergency']),
  crisisType: z.enum([
    'assessment_triggered', // PHQ-9/GAD-7 thresholds
    'user_reported',        // Manual crisis button
    'behavioral_detected',  // Pattern recognition
    'therapeutic_escalation', // Therapist escalation
    'system_emergency'      // System-wide emergency
  ]),

  // Response time requirements
  maxResponseTime: z.number().max(200), // <200ms for crisis operations
  priorityBoost: z.number().min(1).max(3), // 1-3 priority levels boost
  bypassSubscriptionLimits: z.boolean(),

  // Emergency access grants
  emergencyFeatures: z.array(z.enum([
    'crisis_button',
    'emergency_contacts',
    'breathing_exercises',
    'therapeutic_content',
    'assessment_access',
    'mood_tracking',
    'hotline_integration'
  ])),

  // Data access during crisis
  emergencyDataAccess: z.object({
    allowCrossDeviceAccess: z.boolean(),
    bypassEncryption: z.boolean(), // For emergency responders
    shareWithContacts: z.boolean(),
    auditExemption: z.boolean()
  }),

  // Safety validation
  safetyChecks: z.object({
    validateUserSafety: z.boolean(),
    requireConfirmation: z.boolean(),
    escalationRequired: z.boolean(),
    professionalNotification: z.boolean()
  }),

  // Crisis session metadata
  activatedAt: z.string(), // ISO timestamp
  expiresAt: z.string(),   // ISO timestamp
  extendedBy: z.string().optional(), // User ID who extended
  deactivatedAt: z.string().optional(), // ISO timestamp

  // Performance tracking
  responseTimeViolations: z.array(z.object({
    operationId: z.string(),
    actualTime: z.number(),
    targetTime: z.number(),
    timestamp: z.string()
  })),

  // Audit and compliance
  auditTrail: z.array(z.object({
    action: z.string(),
    timestamp: z.string(),
    userId: z.string().optional(),
    systemTriggered: z.boolean(),
    dataAccessed: z.array(z.string())
  }))
});

export type CrisisSafetyConstraint = z.infer<typeof CrisisSafetyConstraintSchema>;

/**
 * Crisis response performance validator
 */
export const CrisisResponseValidatorSchema = z.object({
  // Validation configuration
  enableValidation: z.boolean(),
  strictMode: z.boolean(), // Fail fast on violations
  responseTimeThreshold: z.number().default(200), // milliseconds

  // Performance metrics
  averageResponseTime: z.number(),
  p95ResponseTime: z.number(),
  p99ResponseTime: z.number(),
  violationCount: z.number(),

  // Validation history
  recentValidations: z.array(z.object({
    operationId: z.string(),
    responseTime: z.number(),
    passed: z.boolean(),
    timestamp: z.string(),
    crisisLevel: z.enum(['low', 'moderate', 'high', 'emergency'])
  })),

  // Alert thresholds
  alertThresholds: z.object({
    responseTimeWarning: z.number().default(150), // milliseconds
    responseTimeCritical: z.number().default(200), // milliseconds
    violationRateWarning: z.number().default(0.05), // 5%
    violationRateCritical: z.number().default(0.1)  // 10%
  }),

  // Escalation configuration
  escalationConfig: z.object({
    enableAutoEscalation: z.boolean(),
    escalationThreshold: z.number(), // violation count
    escalationContacts: z.array(z.string()),
    emergencyFallback: z.boolean()
  })
});

export type CrisisResponseValidator = z.infer<typeof CrisisResponseValidatorSchema>;

/**
 * CROSS-DEVICE COORDINATION TYPES
 */

/**
 * Cross-device sync coordination with therapeutic session preservation
 */
export const CrossDeviceSyncCoordinatorSchema = z.object({
  // Device identification
  primaryDeviceId: z.string(),
  deviceRegistry: z.array(z.object({
    deviceId: z.string(),
    deviceType: z.enum(['phone', 'tablet', 'desktop', 'web']),
    platform: z.enum(['ios', 'android', 'windows', 'macos', 'web']),
    lastActive: z.string(), // ISO timestamp
    syncEnabled: z.boolean(),
    subscriptionTier: z.enum(['free', 'premium', 'family', 'enterprise'])
  })),

  // Active therapeutic sessions
  activeTherapeuticSessions: z.array(z.object({
    sessionId: z.string(),
    sessionType: z.enum(['morning', 'midday', 'evening', 'crisis', 'assessment']),
    deviceId: z.string(),
    startedAt: z.string(), // ISO timestamp
    lastActivityAt: z.string(), // ISO timestamp
    preservationRequired: z.boolean(),

    // Session state preservation
    sessionState: z.object({
      currentStep: z.number(),
      totalSteps: z.number(),
      completedSteps: z.array(z.string()),
      sessionData: z.record(z.string(), z.unknown()),
      preservedAt: z.string() // ISO timestamp
    }),

    // Cross-device resumption
    resumable: z.boolean(),
    resumeOnDevices: z.array(z.string()), // device IDs
    resumeExpiration: z.string(), // ISO timestamp

    // Crisis context
    crisisSession: z.boolean(),
    crisisLevel: z.enum(['none', 'low', 'moderate', 'high', 'emergency']).optional()
  })),

  // Sync conflict resolution for cross-device
  conflictResolution: z.object({
    strategy: z.enum(['last_write_wins', 'merge', 'user_prompt', 'preserve_therapeutic']),
    preserveTherapeuticContinuity: z.boolean(),
    allowCrossDeviceOverrides: z.boolean(),

    // Active conflicts
    activeConflicts: z.array(z.object({
      conflictId: z.string(),
      conflictType: z.string(),
      devices: z.array(z.string()),
      therapeuticImpact: z.enum(['none', 'low', 'moderate', 'high']),
      resolutionRequired: z.boolean(),
      detectdAt: z.string() // ISO timestamp
    }))
  }),

  // Performance coordination
  coordinationMetrics: z.object({
    averageCoordinationTime: z.number(), // milliseconds
    crossDeviceLatency: z.number(), // milliseconds
    sessionTransferSuccess: z.number(), // percentage 0-100
    conflictResolutionTime: z.number(), // milliseconds
    lastMetricsUpdate: z.string() // ISO timestamp
  })
});

export type CrossDeviceSyncCoordinator = z.infer<typeof CrossDeviceSyncCoordinatorSchema>;

/**
 * Therapeutic session preservation context
 */
export const TherapeuticSessionPreservationSchema = z.object({
  // Session identification
  sessionId: z.string(),
  userId: z.string(),
  preservationId: z.string(),

  // Preservation metadata
  preservedAt: z.string(), // ISO timestamp
  preservationReason: z.enum([
    'device_switch',
    'app_backgrounded',
    'network_interruption',
    'crisis_escalation',
    'user_request',
    'system_maintenance'
  ]),

  // Session state snapshot
  sessionSnapshot: z.object({
    sessionType: z.enum(['morning', 'midday', 'evening', 'crisis', 'assessment']),
    currentProgress: z.number(), // 0-100 percentage
    criticalData: z.record(z.string(), z.unknown()),
    userInputs: z.array(z.record(z.string(), z.unknown())),
    timingData: z.object({
      sessionDuration: z.number(), // milliseconds
      stepTimings: z.array(z.number()),
      pauseDuration: z.number() // milliseconds
    })
  }),

  // Preservation policy
  preservationPolicy: z.object({
    maxPreservationTime: z.number(), // milliseconds
    autoExpiry: z.boolean(),
    crossDeviceAccess: z.boolean(),
    encryptionRequired: z.boolean(),
    auditRequired: z.boolean()
  }),

  // Therapeutic context
  therapeuticContext: z.object({
    clinicallySignificant: z.boolean(),
    assessmentInProgress: z.boolean(),
    crisisDetected: z.boolean(),
    continuityRequired: z.boolean(),
    therapeuticNote: z.string().optional()
  }),

  // Restoration metadata
  restorationAttempts: z.array(z.object({
    attemptId: z.string(),
    deviceId: z.string(),
    timestamp: z.string(),
    success: z.boolean(),
    restorationTime: z.number(), // milliseconds
    dataIntegrityValidated: z.boolean()
  }))
});

export type TherapeuticSessionPreservation = z.infer<typeof TherapeuticSessionPreservationSchema>;

/**
 * HIPAA-COMPLIANT ZERO-PII DESIGN TYPES
 */

/**
 * Zero-PII validation context
 */
export const ZeroPiiValidationSchema = z.object({
  // Validation configuration
  strictMode: z.boolean(),
  enableRuntimeValidation: z.boolean(),
  piiDetectionEnabled: z.boolean(),

  // PII detection patterns
  piiPatterns: z.array(z.object({
    patternId: z.string(),
    patternType: z.enum([
      'email',
      'phone',
      'ssn',
      'name',
      'address',
      'credit_card',
      'medical_id',
      'device_id',
      'ip_address'
    ]),
    pattern: z.string(), // regex pattern
    severity: z.enum(['warning', 'error', 'critical']),
    action: z.enum(['log', 'block', 'sanitize', 'encrypt'])
  })),

  // Subscription context isolation
  subscriptionContextIsolation: z.object({
    isolationLevel: z.enum(['strict', 'moderate', 'basic']),
    crossTierDataAccess: z.boolean(),
    subscriptionMetadataAllowed: z.array(z.string()),
    billingDataSeparated: z.boolean()
  }),

  // Data sanitization
  sanitizationRules: z.array(z.object({
    ruleId: z.string(),
    dataType: z.string(),
    sanitizationMethod: z.enum(['hash', 'encrypt', 'remove', 'tokenize']),
    preserveStructure: z.boolean(),
    auditRequired: z.boolean()
  })),

  // Validation results
  validationResults: z.object({
    lastValidation: z.string(), // ISO timestamp
    piiDetected: z.boolean(),
    violationCount: z.number(),
    sanitizationApplied: z.boolean(),
    complianceScore: z.number().min(0).max(100), // 0-100

    // Detected violations
    violations: z.array(z.object({
      violationId: z.string(),
      violationType: z.string(),
      severity: z.enum(['warning', 'error', 'critical']),
      detectedAt: z.string(), // ISO timestamp
      sanitized: z.boolean(),
      auditLogged: z.boolean()
    }))
  })
});

export type ZeroPiiValidation = z.infer<typeof ZeroPiiValidationSchema>;

/**
 * HIPAA compliance validation context
 */
export const HipaaComplianceValidationSchema = z.object({
  // Compliance requirements
  complianceLevel: z.enum(['basic', 'standard', 'strict']),
  auditingRequired: z.boolean(),
  encryptionRequired: z.boolean(),
  accessControlsRequired: z.boolean(),

  // Data handling compliance
  dataHandlingCompliance: z.object({
    dataMinimization: z.boolean(),
    purposeLimitation: z.boolean(),
    accessLogging: z.boolean(),
    retentionPolicyApplied: z.boolean(),

    // PHI detection and handling
    phiDetectionEnabled: z.boolean(),
    phiEncryptionLevel: z.enum(['standard', 'enhanced', 'maximum']),
    phiAccessControls: z.array(z.string()),
    phiAuditTrail: z.boolean()
  }),

  // Technical safeguards
  technicalSafeguards: z.object({
    accessControlImplemented: z.boolean(),
    auditControlsImplemented: z.boolean(),
    integrityControlsImplemented: z.boolean(),
    transmissionSecurityImplemented: z.boolean()
  }),

  // Administrative safeguards
  administrativeSafeguards: z.object({
    securityOfficerAssigned: z.boolean(),
    workforceTraining: z.boolean(),
    accessManagement: z.boolean(),
    securityIncidentProcedures: z.boolean()
  }),

  // Physical safeguards
  physicalSafeguards: z.object({
    facilityAccessControls: z.boolean(),
    workstationSecurity: z.boolean(),
    deviceAndMediaControls: z.boolean()
  }),

  // Compliance validation results
  complianceResults: z.object({
    overallCompliance: z.boolean(),
    complianceScore: z.number().min(0).max(100), // 0-100
    lastAssessment: z.string(), // ISO timestamp
    nextAssessment: z.string(), // ISO timestamp

    // Compliance gaps
    complianceGaps: z.array(z.object({
      gapId: z.string(),
      category: z.enum(['administrative', 'physical', 'technical']),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      description: z.string(),
      remediation: z.string(),
      targetDate: z.string() // ISO date
    }))
  })
});

export type HipaaComplianceValidation = z.infer<typeof HipaaComplianceValidationSchema>;

/**
 * DAY 18 WEBHOOK SYSTEM INTEGRATION TYPES
 */

/**
 * Webhook integration with sync context
 */
export const WebhookSyncIntegrationSchema = z.object({
  // Webhook identification
  webhookId: z.string(),
  webhookType: z.enum([
    'subscription_updated',
    'payment_succeeded',
    'payment_failed',
    'trial_ending',
    'account_suspended',
    'crisis_escalation',
    'sync_conflict_resolved'
  ]),

  // Sync context impact
  syncImpact: z.object({
    affectsPriorityQueue: z.boolean(),
    changesSubscriptionPolicy: z.boolean(),
    triggersEmergencySync: z.boolean(),
    requiresCrossDeviceUpdate: z.boolean(),

    // Immediate actions required
    immediateActions: z.array(z.enum([
      'update_tier_policies',
      'activate_crisis_mode',
      'suspend_sync_operations',
      'clear_sync_cache',
      'notify_all_devices',
      'preserve_therapeutic_sessions',
      'escalate_to_emergency'
    ]))
  }),

  // Subscription tier changes
  subscriptionChanges: z.object({
    previousTier: z.enum(['free', 'premium', 'family', 'enterprise']).optional(),
    newTier: z.enum(['free', 'premium', 'family', 'enterprise']).optional(),
    policyChanges: z.array(z.string()),
    effectiveImmediately: z.boolean(),
    gracePeriodApplied: z.boolean()
  }).optional(),

  // Crisis escalation context
  crisisEscalation: z.object({
    crisisLevel: z.enum(['low', 'moderate', 'high', 'emergency']),
    emergencyBypassRequired: z.boolean(),
    notificationsSent: z.array(z.string()),
    responseTimeTarget: z.number() // milliseconds
  }).optional(),

  // Processing metadata
  processingMetadata: z.object({
    receivedAt: z.string(), // ISO timestamp
    processedAt: z.string().optional(), // ISO timestamp
    processingTime: z.number().optional(), // milliseconds
    success: z.boolean(),
    errorMessage: z.string().optional(),

    // Retry information
    retryCount: z.number().default(0),
    maxRetries: z.number().default(3),
    nextRetryAt: z.string().optional() // ISO timestamp
  })
});

export type WebhookSyncIntegration = z.infer<typeof WebhookSyncIntegrationSchema>;

/**
 * Store coordination integration types
 */
export const StoreCoordinationIntegrationSchema = z.object({
  // Coordinated stores
  coordinatedStores: z.array(z.enum([
    'userStore',
    'assessmentStore',
    'checkInStore',
    'subscriptionStore',
    'paymentStore',
    'crisisStore'
  ])),

  // Coordination policies
  coordinationPolicies: z.array(z.object({
    policyId: z.string(),
    triggerStore: z.string(),
    targetStores: z.array(z.string()),
    coordinationType: z.enum([
      'immediate_sync',
      'eventual_consistency',
      'transactional_update',
      'crisis_coordination'
    ]),

    // Subscription tier impact
    tierRequirements: z.array(z.enum(['free', 'premium', 'family', 'enterprise'])),
    subscriptionValidationRequired: z.boolean(),

    // Performance requirements
    maxCoordinationTime: z.number(), // milliseconds
    priorityLevel: SyncPriorityLevelSchema,

    // Crisis handling
    crisisModeOverride: z.boolean(),
    emergencyCoordination: z.boolean()
  })),

  // Coordination state
  coordinationState: z.object({
    activeCoordinations: z.array(z.object({
      coordinationId: z.string(),
      policyId: z.string(),
      startedAt: z.string(), // ISO timestamp
      status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
      storesInvolved: z.array(z.string()),
      priority: SyncPriorityLevelSchema
    })),

    // Performance metrics
    coordinationMetrics: z.object({
      averageCoordinationTime: z.number(), // milliseconds
      successRate: z.number(), // 0-100 percentage
      crisisCoordinationTime: z.number(), // milliseconds
      lastMetricsUpdate: z.string() // ISO timestamp
    })
  })
});

export type StoreCoordinationIntegration = z.infer<typeof StoreCoordinationIntegrationSchema>;

/**
 * CORE SYNC CONTEXT SERVICE INTERFACE
 */

/**
 * Complete sync context state
 */
export interface SyncContextState {
  // Priority queue management
  readonly priorityQueue: SyncPriorityQueueState;
  readonly queueProcessor: {
    readonly isProcessing: boolean;
    readonly currentOperation: SyncPriorityEntry | null;
    readonly processingStartTime: string | null;
    readonly queueHealth: 'healthy' | 'degraded' | 'critical';
  };

  // Subscription tier enforcement
  readonly tierEnforcement: {
    readonly currentPolicy: SubscriptionSyncPolicy | null;
    readonly enforcementEnabled: boolean;
    readonly lastEnforcement: SyncTierEnforcementResult | null;
    readonly quotaStatus: Record<string, number>; // tier -> usage count
  };

  // Crisis safety management
  readonly crisisSafety: {
    readonly activeCrisis: CrisisSafetyConstraint | null;
    readonly responseValidator: CrisisResponseValidator;
    readonly emergencyBypassActive: boolean;
    readonly violationCount: number;
  };

  // Cross-device coordination
  readonly crossDeviceCoordination: {
    readonly coordinator: CrossDeviceSyncCoordinator;
    readonly preservedSessions: TherapeuticSessionPreservation[];
    readonly activeConflicts: number;
  };

  // HIPAA compliance and zero-PII
  readonly compliance: {
    readonly zeroPiiValidation: ZeroPiiValidation;
    readonly hipaaValidation: HipaaComplianceValidation;
    readonly complianceScore: number; // 0-100
    readonly lastAudit: string; // ISO timestamp
  };

  // Webhook integration
  readonly webhookIntegration: {
    readonly pendingWebhooks: WebhookSyncIntegration[];
    readonly storeCoordination: StoreCoordinationIntegration;
    readonly lastWebhookProcessed: string | null; // ISO timestamp
  };

  // Overall sync context health
  readonly contextHealth: {
    readonly overall: 'healthy' | 'warning' | 'critical';
    readonly performanceScore: number; // 0-100
    readonly complianceScore: number; // 0-100
    readonly crisisSafetyScore: number; // 0-100
    readonly lastHealthCheck: string; // ISO timestamp
  };
}

/**
 * Sync context service actions
 */
export interface SyncContextActions {
  // Priority queue management
  enqueueOperation: (operation: SyncOperation, priority?: SyncPriorityLevel) => Promise<void>;
  processQueue: () => Promise<void>;
  clearQueue: (priorityLevel?: SyncPriorityLevel) => Promise<void>;
  getQueueStatus: () => SyncPriorityQueueState;

  // Subscription tier enforcement
  enforceSubscriptionTier: (operation: SyncOperation) => Promise<SyncTierEnforcementResult>;
  updateTierPolicy: (tier: SubscriptionTier, policy: SubscriptionSyncPolicy) => Promise<void>;
  validateTierAccess: (operation: SyncOperation) => Promise<boolean>;

  // Crisis safety management
  activateCrisisMode: (crisisLevel: 'low' | 'moderate' | 'high' | 'emergency') => Promise<void>;
  deactivateCrisisMode: () => Promise<void>;
  validateCrisisResponse: (operationId: string, responseTime: number) => boolean;
  enableEmergencyBypass: (reason: string) => Promise<void>;

  // Cross-device coordination
  coordinateDevices: (sessionId: string) => Promise<void>;
  preserveTherapeuticSession: (sessionId: string) => Promise<TherapeuticSessionPreservation>;
  restoreSession: (preservationId: string, deviceId: string) => Promise<boolean>;
  resolveConflict: (conflictId: string, strategy: ConflictResolutionStrategy) => Promise<void>;

  // HIPAA compliance and zero-PII
  validateZeroPii: (data: SyncableData) => Promise<boolean>;
  runHipaaCompliance: () => Promise<HipaaComplianceValidation>;
  sanitizeData: (data: SyncableData) => Promise<SyncableData>;
  auditDataAccess: (operation: SyncOperation) => Promise<void>;

  // Webhook integration
  processWebhook: (webhook: WebhookSyncIntegration) => Promise<void>;
  coordinateStoreUpdate: (storeUpdates: Record<string, unknown>) => Promise<void>;
  handleSubscriptionChange: (oldTier: SubscriptionTier, newTier: SubscriptionTier) => Promise<void>;

  // Performance and health monitoring
  checkSystemHealth: () => Promise<void>;
  getPerformanceMetrics: () => Record<string, number>;
  resetMetrics: () => void;

  // Emergency protocols
  activateEmergencyProtocol: (reason: string) => Promise<void>;
  performEmergencySync: (criticalData: SyncableData[]) => Promise<void>;
  validateEmergencyAccess: () => Promise<boolean>;
}

/**
 * Complete sync context service interface
 */
export interface SyncContextService extends SyncContextState, SyncContextActions {
  // Service lifecycle
  initialize: (config: SyncContextConfig) => Promise<void>;
  destroy: () => Promise<void>;

  // Type-safe operation execution
  executeSyncOperation: <T>(
    operation: SyncOperation,
    executor: () => Promise<T>,
    fallback?: T
  ) => Promise<T>;

  // Crisis-safe operation wrapper
  executeCrisisSafeOperation: <T>(
    operation: SyncOperation,
    executor: () => Promise<T>,
    emergencyFallback: T
  ) => Promise<T>;
}

/**
 * Sync context service configuration
 */
export const SyncContextConfigSchema = z.object({
  // Service identification
  serviceId: z.string(),
  version: z.string(),
  environment: z.enum(['development', 'staging', 'production']),

  // Performance configuration
  performance: z.object({
    maxQueueSize: z.number().default(1000),
    processingBatchSize: z.number().default(10),
    crisisResponseThreshold: z.number().default(200), // milliseconds
    healthCheckInterval: z.number().default(30000), // milliseconds
  }),

  // Subscription tier policies
  tierPolicies: z.record(z.string(), SubscriptionSyncPolicySchema), // tier -> policy

  // Crisis safety configuration
  crisisSafety: z.object({
    enableCrisisMode: z.boolean().default(true),
    strictResponseValidation: z.boolean().default(true),
    emergencyBypassAllowed: z.boolean().default(true),
    crisisEscalationThreshold: z.number().default(3) // violation count
  }),

  // Compliance configuration
  compliance: z.object({
    enableHipaaValidation: z.boolean().default(true),
    strictZeroPii: z.boolean().default(true),
    auditAllOperations: z.boolean().default(true),
    retentionPeriodDays: z.number().default(2555) // 7 years
  }),

  // Cross-device coordination
  crossDevice: z.object({
    enableCoordination: z.boolean().default(true),
    sessionPreservationTime: z.number().default(3600000), // 1 hour in ms
    maxActiveDevices: z.number().default(5),
    conflictResolutionTimeout: z.number().default(30000) // milliseconds
  }),

  // Webhook integration
  webhooks: z.object({
    enableProcessing: z.boolean().default(true),
    processingTimeout: z.number().default(10000), // milliseconds
    maxRetries: z.number().default(3),
    retryDelay: z.number().default(1000) // milliseconds
  })
});

export type SyncContextConfig = z.infer<typeof SyncContextConfigSchema>;

/**
 * EXPORTED TYPE GUARDS AND VALIDATORS
 */

export const isSyncPriorityEntry = (value: unknown): value is SyncPriorityEntry => {
  try {
    SyncPriorityEntrySchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isCrisisSafetyConstraint = (value: unknown): value is CrisisSafetyConstraint => {
  try {
    CrisisSafetyConstraintSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isSubscriptionSyncPolicy = (value: unknown): value is SubscriptionSyncPolicy => {
  try {
    SubscriptionSyncPolicySchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isZeroPiiValidation = (value: unknown): value is ZeroPiiValidation => {
  try {
    ZeroPiiValidationSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * PERFORMANCE AND COMPLIANCE CONSTANTS
 */
export const SYNC_CONTEXT_CONSTANTS = {
  // Crisis response requirements
  CRISIS_RESPONSE_MAX_TIME: 200, // milliseconds
  EMERGENCY_PRIORITY_LEVEL: 10,
  CRISIS_VIOLATION_THRESHOLD: 3,

  // Subscription tier quotas (per hour)
  TIER_QUOTAS: {
    free: 100,
    premium: 1000,
    family: 2000,
    enterprise: 10000
  },

  // Queue processing
  MAX_QUEUE_SIZE: 1000,
  PROCESSING_BATCH_SIZE: 10,
  QUEUE_HEALTH_CHECK_INTERVAL: 30000, // milliseconds

  // Cross-device coordination
  SESSION_PRESERVATION_TIME: 3600000, // 1 hour in milliseconds
  MAX_ACTIVE_DEVICES: 5,
  CONFLICT_RESOLUTION_TIMEOUT: 30000, // milliseconds

  // Compliance and audit
  HIPAA_AUDIT_RETENTION_DAYS: 2555, // 7 years
  PII_DETECTION_PATTERNS: 50,
  COMPLIANCE_CHECK_INTERVAL: 86400000, // 24 hours in milliseconds

  // Performance thresholds
  PERFORMANCE_WARNING_THRESHOLD: 150, // milliseconds
  PERFORMANCE_CRITICAL_THRESHOLD: 200, // milliseconds
  QUEUE_SIZE_WARNING: 750,
  QUEUE_SIZE_CRITICAL: 900,

  // Emergency protocols
  EMERGENCY_BYPASS_DURATION: 86400000, // 24 hours in milliseconds
  EMERGENCY_ESCALATION_THRESHOLD: 5, // violation count
  EMERGENCY_SYNC_TIMEOUT: 5000 // milliseconds
} as const;

/**
 * DEFAULT TIER POLICIES
 */
export const DEFAULT_SUBSCRIPTION_SYNC_POLICIES: Record<SubscriptionTier, SubscriptionSyncPolicy> = {
  free: {
    tier: 'free',
    policyId: 'policy_free_v1',
    policyVersion: '1.0',
    maxSyncOperationsPerHour: 100,
    maxDataTransferPerDay: 10485760, // 10MB
    maxConcurrentOperations: 2,
    allowedPriorityLevels: ['background', 'normal', 'crisis_urgent', 'crisis_emergency'],
    defaultPriority: 'normal',
    crisisAccessLevel: 'emergency_only',
    enabledSyncFeatures: ['cross_device_sync', 'conflict_resolution', 'therapeutic_session_preservation'],
    guaranteedResponseTime: 1000,
    batchSizeLimit: 10,
    retryPolicyId: 'retry_standard',
    dataAccessScope: ['basic_profile', 'mood_tracking', 'crisis_data'],
    crisisAccessGuaranteed: true,
    emergencyBypassAllowed: true,
    crisisDataRetentionDays: 90,
    hipaaRequired: true,
    auditLoggingRequired: true,
    dataEncryptionLevel: 'standard',
    effectiveDate: '2024-01-01',
    lastUpdated: new Date().toISOString()
  },

  premium: {
    tier: 'premium',
    policyId: 'policy_premium_v1',
    policyVersion: '1.0',
    maxSyncOperationsPerHour: 1000,
    maxDataTransferPerDay: 104857600, // 100MB
    maxConcurrentOperations: 5,
    allowedPriorityLevels: ['background', 'normal', 'therapeutic', 'assessment', 'crisis_urgent', 'crisis_emergency'],
    defaultPriority: 'therapeutic',
    crisisAccessLevel: 'full',
    enabledSyncFeatures: [
      'cross_device_sync',
      'real_time_sync',
      'conflict_resolution',
      'therapeutic_session_preservation',
      'advanced_analytics_sync'
    ],
    guaranteedResponseTime: 500,
    batchSizeLimit: 50,
    retryPolicyId: 'retry_premium',
    dataAccessScope: ['basic_profile', 'mood_tracking', 'assessment_scores', 'therapeutic_content', 'crisis_data'],
    crisisAccessGuaranteed: true,
    emergencyBypassAllowed: true,
    crisisDataRetentionDays: 365,
    hipaaRequired: true,
    auditLoggingRequired: true,
    dataEncryptionLevel: 'enhanced',
    effectiveDate: '2024-01-01',
    lastUpdated: new Date().toISOString()
  },

  family: {
    tier: 'family',
    policyId: 'policy_family_v1',
    policyVersion: '1.0',
    maxSyncOperationsPerHour: 2000,
    maxDataTransferPerDay: 524288000, // 500MB
    maxConcurrentOperations: 10,
    allowedPriorityLevels: ['background', 'normal', 'therapeutic', 'assessment', 'crisis_urgent', 'crisis_emergency'],
    defaultPriority: 'therapeutic',
    crisisAccessLevel: 'full',
    enabledSyncFeatures: [
      'cross_device_sync',
      'real_time_sync',
      'conflict_resolution',
      'therapeutic_session_preservation',
      'advanced_analytics_sync',
      'family_data_sharing'
    ],
    guaranteedResponseTime: 300,
    batchSizeLimit: 100,
    retryPolicyId: 'retry_family',
    dataAccessScope: [
      'basic_profile',
      'mood_tracking',
      'assessment_scores',
      'therapeutic_content',
      'crisis_data',
      'family_data'
    ],
    crisisAccessGuaranteed: true,
    emergencyBypassAllowed: true,
    crisisDataRetentionDays: 730,
    hipaaRequired: true,
    auditLoggingRequired: true,
    dataEncryptionLevel: 'enhanced',
    effectiveDate: '2024-01-01',
    lastUpdated: new Date().toISOString()
  },

  enterprise: {
    tier: 'enterprise',
    policyId: 'policy_enterprise_v1',
    policyVersion: '1.0',
    maxSyncOperationsPerHour: 10000,
    maxDataTransferPerDay: 1073741824, // 1GB
    maxConcurrentOperations: 20,
    allowedPriorityLevels: ['background', 'normal', 'therapeutic', 'assessment', 'crisis_urgent', 'crisis_emergency'],
    defaultPriority: 'therapeutic',
    crisisAccessLevel: 'full',
    enabledSyncFeatures: [
      'cross_device_sync',
      'real_time_sync',
      'conflict_resolution',
      'therapeutic_session_preservation',
      'advanced_analytics_sync',
      'family_data_sharing',
      'enterprise_audit_logs'
    ],
    guaranteedResponseTime: 200,
    batchSizeLimit: 200,
    retryPolicyId: 'retry_enterprise',
    dataAccessScope: [
      'basic_profile',
      'mood_tracking',
      'assessment_scores',
      'therapeutic_content',
      'crisis_data',
      'family_data',
      'enterprise_analytics'
    ],
    crisisAccessGuaranteed: true,
    emergencyBypassAllowed: true,
    crisisDataRetentionDays: 2555, // 7 years
    hipaaRequired: true,
    auditLoggingRequired: true,
    dataEncryptionLevel: 'enterprise',
    effectiveDate: '2024-01-01',
    lastUpdated: new Date().toISOString()
  }
};

export default {
  // Core schemas
  SyncPriorityLevelSchema,
  SyncPriorityEntrySchema,
  SyncPriorityQueueStateSchema,
  SubscriptionSyncPolicySchema,
  SyncTierEnforcementResultSchema,
  CrisisSafetyConstraintSchema,
  CrisisResponseValidatorSchema,
  CrossDeviceSyncCoordinatorSchema,
  TherapeuticSessionPreservationSchema,
  ZeroPiiValidationSchema,
  HipaaComplianceValidationSchema,
  WebhookSyncIntegrationSchema,
  StoreCoordinationIntegrationSchema,
  SyncContextConfigSchema,

  // Type guards
  isSyncPriorityEntry,
  isCrisisSafetyConstraint,
  isSubscriptionSyncPolicy,
  isZeroPiiValidation,

  // Constants and defaults
  SYNC_CONTEXT_CONSTANTS,
  DEFAULT_SUBSCRIPTION_SYNC_POLICIES
};