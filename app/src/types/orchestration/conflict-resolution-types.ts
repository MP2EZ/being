/**
 * Comprehensive Conflict Resolution Type Definitions
 * P0-CLOUD Platform Infrastructure - TypeScript Implementation
 *
 * Advanced conflict resolution system with:
 * - Hierarchical therapeutic safety precedence
 * - AI-assisted resolution with confidence scoring
 * - Crisis-safe conflict handling with emergency override
 * - Clinical accuracy preservation patterns
 * - Cross-device coordination with session continuity
 */

import { z } from 'zod';
import type {
  SyncableData,
  SyncOperation,
  SyncMetadata
} from '../sync';
import type {
  SubscriptionTier
} from '../subscription';
import type {
  OrchestrationPriority,
  OrchestrationOperation
} from './sync-orchestration-types';

/**
 * CONFLICT RESOLUTION HIERARCHY
 * Therapeutic safety first, then user intent, then technical consistency
 */

/**
 * Conflict resolution priority hierarchy
 */
export enum ConflictResolutionPriority {
  CRISIS_DATA = 10,                    // Emergency override - highest priority
  ASSESSMENT_INTEGRITY = 9,            // PHQ-9/GAD-7 clinical accuracy
  THERAPEUTIC_SESSION_CONTINUITY = 8,  // Active MBCT session preservation
  USER_SAFETY_PLAN = 7,               // Crisis safety plan data
  USER_RECENT_ACTIONS = 6,            // Recent user intent and actions
  DEVICE_PREFERENCES = 5,             // Device-specific user preferences
  SUBSCRIPTION_CONTEXT = 4,           // Payment status and tier data
  SYSTEM_METADATA = 3,                // Sync metadata and timestamps
  ANALYTICS_DATA = 2,                 // Non-critical analytics
  BACKGROUND_OPTIMIZATION = 1         // Background system optimizations
}

/**
 * Conflict type classification with therapeutic context
 */
export const ConflictTypeSchema = z.enum([
  // Data conflicts
  'data_version_mismatch',      // Same entity, different versions
  'concurrent_modification',    // Simultaneous edits
  'field_level_conflict',       // Specific field differences

  // Therapeutic conflicts (special handling)
  'assessment_score_conflict',  // PHQ-9/GAD-7 score discrepancies
  'therapeutic_session_conflict', // Session state inconsistencies
  'crisis_plan_conflict',       // Safety plan modifications

  // Cross-device conflicts
  'device_state_divergence',    // Cross-device state differences
  'session_handoff_conflict',   // Session transfer issues
  'offline_online_merge',       // Offline-online data reconciliation

  // Subscription conflicts
  'subscription_tier_conflict', // Tier change during operation
  'payment_status_conflict',    // Payment state inconsistencies
  'feature_access_conflict',    // Feature availability discrepancies

  // System conflicts
  'schema_migration_conflict',  // Data structure changes
  'permission_conflict',        // Access control issues
  'encryption_key_conflict',    // Encryption inconsistencies

  // AI/ML conflicts
  'ai_recommendation_conflict', // ML model disagreements
  'personalization_conflict'   // User personalization inconsistencies
]);

export type ConflictType = z.infer<typeof ConflictTypeSchema>;

/**
 * Detailed conflict descriptor with context
 */
export const ConflictDescriptorSchema = z.object({
  // Core conflict identification
  conflictId: z.string(),
  conflictType: ConflictTypeSchema,
  priority: z.nativeEnum(ConflictResolutionPriority),

  // Entities involved in conflict
  entities: z.array(z.object({
    entityId: z.string(),
    entityType: z.enum([
      'user_profile',
      'check_in',
      'assessment',
      'crisis_plan',
      'therapeutic_session',
      'subscription_data',
      'device_preferences',
      'ai_recommendations'
    ]),
    version: z.string(),
    lastModified: z.string(), // ISO timestamp
    deviceId: z.string().optional(),
    userId: z.string()
  })),

  // Conflict context
  context: z.object({
    // Therapeutic context (highest priority)
    therapeuticContext: z.object({
      involvesClinicalData: z.boolean(),
      affectsAssessmentScoring: z.boolean(),
      impactsTherapeuticSession: z.boolean(),
      crisisDataInvolved: z.boolean(),
      clinicalAccuracyAtRisk: z.boolean()
    }),

    // User context
    userContext: z.object({
      userId: z.string(),
      userTimezone: z.string(),
      lastUserAction: z.string().optional(), // ISO timestamp
      userIntentClear: z.boolean(),
      multipleUsersInvolved: z.boolean() // family plans
    }),

    // Device context
    deviceContext: z.object({
      primaryDevice: z.string(),
      conflictingDevices: z.array(z.string()),
      crossDeviceSession: z.boolean(),
      offlineDeviceInvolved: z.boolean(),
      networkConditions: z.enum(['excellent', 'good', 'poor', 'offline'])
    }),

    // Subscription context
    subscriptionContext: z.object({
      subscriptionTier: z.enum(['free', 'premium', 'family', 'enterprise']),
      paymentStatus: z.enum(['active', 'past_due', 'canceled', 'trial']),
      tierChangeInProgress: z.boolean(),
      featureAccessImpacted: z.boolean()
    }),

    // Temporal context
    temporalContext: z.object({
      detectedAt: z.string(), // ISO timestamp
      conflictAge: z.number(), // milliseconds since detection
      isStaleConflict: z.boolean(),
      requiresImmediateResolution: z.boolean(),
      resolutionDeadline: z.string().optional() // ISO timestamp for crisis
    })
  }),

  // Conflict analysis
  analysis: z.object({
    // Impact assessment
    impact: z.object({
      userExperienceImpact: z.enum(['none', 'minimal', 'moderate', 'severe', 'critical']),
      therapeuticImpact: z.enum(['none', 'minimal', 'moderate', 'severe', 'critical']),
      dataIntegrityRisk: z.enum(['none', 'low', 'medium', 'high', 'critical']),
      crisisSafetyRisk: z.enum(['none', 'low', 'medium', 'high', 'critical'])
    }),

    // Resolution complexity
    complexity: z.object({
      resolutionComplexity: z.enum(['simple', 'moderate', 'complex', 'requires_user', 'manual']),
      automaticResolutionPossible: z.boolean(),
      userInterventionRequired: z.boolean(),
      clinicalReviewRequired: z.boolean(),
      estimatedResolutionTime: z.number() // milliseconds
    }),

    // AI analysis (if available)
    aiAnalysis: z.object({
      confidenceScore: z.number().min(0).max(1), // 0-1 confidence in analysis
      recommendedStrategy: z.string(),
      riskAssessment: z.number().min(0).max(1), // 0-1 risk score
      requiresHumanReview: z.boolean(),
      aiModelVersion: z.string()
    }).optional()
  }),

  // Resolution tracking
  resolution: z.object({
    status: z.enum([
      'pending',           // Conflict detected, awaiting resolution
      'analyzing',         // AI/system analyzing conflict
      'resolving',         // Resolution strategy being applied
      'user_prompt',       // Waiting for user decision
      'escalated',         // Escalated to manual review
      'resolved',          // Conflict successfully resolved
      'failed',            // Resolution failed
      'deferred'           // Resolution deferred to later
    ]),

    strategy: z.enum([
      'last_write_wins',           // Most recent change takes precedence
      'merge_compatible_fields',   // Merge non-conflicting fields
      'preserve_therapeutic_data', // Always preserve clinical data
      'user_preference',           // Respect user's explicit choice
      'device_priority',           // Primary device takes precedence
      'crisis_safety_first',       // Safety data always wins
      'ai_assisted_merge',         // AI-guided resolution
      'manual_review',             // Human intervention required
      'rollback_to_safe_state',    // Revert to last known good state
      'preserve_most_complete'     // Keep most complete dataset
    ]).optional(),

    appliedAt: z.string().optional(), // ISO timestamp
    appliedBy: z.enum(['system', 'ai', 'user', 'admin']).optional(),
    resolutionTime: z.number().optional(), // milliseconds taken
    resolutionDetails: z.string().optional(),
    resolutionValidated: z.boolean().optional()
  })
});

export type ConflictDescriptor = z.infer<typeof ConflictDescriptorSchema>;

/**
 * AI-ASSISTED CONFLICT RESOLUTION
 */

/**
 * AI resolution analysis with confidence scoring
 */
export const AIConflictAnalysisSchema = z.object({
  // Analysis metadata
  analysisId: z.string(),
  conflictId: z.string(),
  modelVersion: z.string(),
  analysisTime: z.string(), // ISO timestamp

  // Confidence metrics
  confidence: z.object({
    overallConfidence: z.number().min(0).max(1), // 0-1 overall confidence
    strategyConfidence: z.number().min(0).max(1), // Confidence in recommended strategy
    riskAssessment: z.number().min(0).max(1), // 0-1 risk score
    therapeuticSafetyConfidence: z.number().min(0).max(1), // Therapeutic safety confidence
    dataIntegrityConfidence: z.number().min(0).max(1) // Data integrity confidence
  }),

  // Resolution recommendations
  recommendations: z.array(z.object({
    strategy: z.enum([
      'preserve_clinical_accuracy',
      'merge_user_preferences',
      'apply_temporal_precedence',
      'use_device_hierarchy',
      'escalate_to_user',
      'escalate_to_clinical_review',
      'apply_safety_override'
    ]),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
    expectedOutcome: z.string(),
    risks: z.array(z.string()),
    preconditions: z.array(z.string())
  })),

  // Risk analysis
  risks: z.object({
    dataLossRisk: z.number().min(0).max(1),
    therapeuticDisruptionRisk: z.number().min(0).max(1),
    userExperienceRisk: z.number().min(0).max(1),
    clinicalAccuracyRisk: z.number().min(0).max(1),
    systemStabilityRisk: z.number().min(0).max(1)
  }),

  // Feature analysis (what data the AI can see)
  featureAnalysis: z.object({
    temporalFeatures: z.object({
      timeSinceLastModification: z.number(), // milliseconds
      modificationFrequency: z.number(),
      conflictRecency: z.number() // milliseconds
    }),

    userBehaviorFeatures: z.object({
      userActivityPattern: z.string(),
      deviceUsagePattern: z.string(),
      therapeuticEngagement: z.number().min(0).max(1)
    }),

    dataQualityFeatures: z.object({
      dataCompleteness: z.number().min(0).max(1),
      dataConsistency: z.number().min(0).max(1),
      validationStatus: z.boolean()
    }),

    contextualFeatures: z.object({
      subscriptionTierImplications: z.string(),
      therapeuticSessionActive: z.boolean(),
      crisisModuleInvolved: z.boolean()
    })
  }),

  // Human oversight indicators
  humanOversight: z.object({
    requiresHumanReview: z.boolean(),
    reviewUrgency: z.enum(['low', 'medium', 'high', 'critical']),
    reviewReason: z.string().optional(),
    suggestedReviewer: z.enum(['system_admin', 'clinical_reviewer', 'user']).optional()
  })
});

export type AIConflictAnalysis = z.infer<typeof AIConflictAnalysisSchema>;

/**
 * AI resolution execution result
 */
export const AIResolutionResultSchema = z.object({
  // Execution metadata
  resolutionId: z.string(),
  conflictId: z.string(),
  analysisId: z.string(),
  executedAt: z.string(), // ISO timestamp

  // Resolution outcome
  outcome: z.object({
    success: z.boolean(),
    strategy: z.string(),
    executionTime: z.number(), // milliseconds
    dataModifications: z.number(), // count of changes made

    // Quality metrics
    qualityMetrics: z.object({
      dataIntegrityPreserved: z.boolean(),
      therapeuticContinuityMaintained: z.boolean(),
      userPreferencesRespected: z.boolean(),
      clinicalAccuracyMaintained: z.boolean(),
      noDataLoss: z.boolean()
    })
  }),

  // Post-resolution validation
  validation: z.object({
    validationPerformed: z.boolean(),
    validationPassed: z.boolean(),
    validationIssues: z.array(z.string()),

    // Therapeutic validation (critical)
    therapeuticValidation: z.object({
      assessmentScoresValid: z.boolean(),
      crisisPlanIntact: z.boolean(),
      sessionDataConsistent: z.boolean(),
      noTherapeuticDisruption: z.boolean()
    }),

    // Technical validation
    technicalValidation: z.object({
      dataFormatValid: z.boolean(),
      referentialIntegrityMaintained: z.boolean(),
      encryptionMaintained: z.boolean(),
      auditTrailComplete: z.boolean()
    })
  }),

  // Resolution artifacts
  artifacts: z.object({
    resolvedData: z.record(z.string(), z.unknown()), // The final resolved data
    conflictingDataPreserved: z.boolean(), // Whether conflicting versions were preserved
    resolutionLog: z.array(z.object({
      step: z.string(),
      timestamp: z.string(),
      action: z.string(),
      result: z.string()
    })),

    // Rollback information
    rollbackData: z.record(z.string(), z.unknown()).optional(),
    rollbackPossible: z.boolean()
  }),

  // Performance metrics
  performance: z.object({
    aiProcessingTime: z.number(), // milliseconds for AI analysis
    resolutionExecutionTime: z.number(), // milliseconds for resolution
    validationTime: z.number(), // milliseconds for validation
    totalResolutionTime: z.number() // milliseconds total
  })
});

export type AIResolutionResult = z.infer<typeof AIResolutionResultSchema>;

/**
 * CRISIS-SAFE CONFLICT HANDLING
 */

/**
 * Crisis-safe conflict handling configuration
 */
export const CrisisSafeConflictHandlingSchema = z.object({
  // Crisis detection and classification
  crisisDetection: z.object({
    automaticDetection: z.boolean(),
    crisisKeywords: z.array(z.string()), // Keywords that indicate crisis data
    assessmentThresholds: z.object({
      phq9CrisisThreshold: z.number().default(20),
      gad7CrisisThreshold: z.number().default(15)
    }),
    crisisDataTypes: z.array(z.enum([
      'assessment_scores',
      'crisis_plan',
      'emergency_contacts',
      'safety_strategies',
      'therapeutic_notes',
      'mood_tracking_crisis'
    ]))
  }),

  // Crisis response protocols
  crisisResponse: z.object({
    // Response time requirements
    maxResponseTime: z.number().default(200), // milliseconds
    priorityEscalation: z.boolean().default(true),
    bypassNormalQueue: z.boolean().default(true),

    // Safety protocols
    safetyProtocols: z.object({
      preserveAllCrisisData: z.boolean().default(true), // Never lose crisis data
      validateClinicalAccuracy: z.boolean().default(true),
      requireEmergencyAccess: z.boolean().default(true),
      notifyEmergencyContacts: z.boolean().default(false), // Only if user consents
      logAllCrisisActions: z.boolean().default(true)
    }),

    // Conflict resolution for crisis data
    crisisResolutionStrategy: z.enum([
      'preserve_all_crisis_data',  // Keep all crisis-related information
      'most_severe_wins',          // Use highest severity assessment
      'most_recent_crisis_plan',   // Use most recent safety plan
      'combine_safety_strategies', // Merge all safety strategies
      'escalate_immediately'       // Always escalate to human review
    ]).default('preserve_all_crisis_data')
  }),

  // Emergency overrides
  emergencyOverrides: z.object({
    enableEmergencyBypass: z.boolean().default(true),
    bypassSubscriptionLimits: z.boolean().default(true),
    bypassDataValidation: z.boolean().default(false), // Still validate for safety
    allowEmergencyDataAccess: z.boolean().default(true),

    // Emergency escalation
    autoEscalateToHuman: z.boolean().default(true),
    escalationTimeoutMs: z.number().default(30000), // 30 seconds
    emergencyContactIntegration: z.boolean().default(true)
  }),

  // Audit and compliance for crisis handling
  auditRequirements: z.object({
    logAllCrisisConflicts: z.boolean().default(true),
    retainCrisisAuditLog: z.boolean().default(true),
    crisisAuditRetentionDays: z.number().default(2555), // 7 years
    hipaaCompliantLogging: z.boolean().default(true),

    // Crisis event tracking
    trackCrisisResolutionTime: z.boolean().default(true),
    trackCrisisDataIntegrity: z.boolean().default(true),
    trackEmergencyOverrides: z.boolean().default(true)
  })
});

export type CrisisSafeConflictHandling = z.infer<typeof CrisisSafeConflictHandlingSchema>;

/**
 * Crisis conflict resolution result
 */
export const CrisisConflictResolutionSchema = z.object({
  // Resolution metadata
  conflictId: z.string(),
  crisisLevel: z.enum(['low', 'moderate', 'high', 'emergency']),
  resolvedAt: z.string(), // ISO timestamp
  resolutionTime: z.number(), // milliseconds

  // Crisis-specific resolution
  crisisResolution: z.object({
    crisisDataPreserved: z.boolean(),
    assessmentAccuracyMaintained: z.boolean(),
    safetyPlanIntegrity: z.boolean(),
    emergencyContactsAccessible: z.boolean(),

    // Actions taken
    actionsPerformed: z.array(z.enum([
      'preserved_all_crisis_data',
      'merged_safety_strategies',
      'updated_risk_assessment',
      'notified_emergency_contacts',
      'escalated_to_clinical_review',
      'activated_emergency_protocols',
      'bypassed_normal_validation'
    ])),

    // Safety validation
    safetyValidation: z.object({
      clinicalDataIntact: z.boolean(),
      noTherapeuticDisruption: z.boolean(),
      crisisAccessMaintained: z.boolean(),
      emergencyProtocolsActive: z.boolean()
    })
  }),

  // Performance validation (critical for crisis)
  performanceValidation: z.object({
    responseTimeMet: z.boolean(),
    targetResponseTime: z.number(), // milliseconds
    actualResponseTime: z.number(), // milliseconds
    performanceViolation: z.boolean(),

    // Escalation if performance failed
    escalatedDueToPerformance: z.boolean(),
    fallbackProtocolActivated: z.boolean()
  }),

  // Audit trail for crisis resolution
  auditTrail: z.object({
    auditId: z.string(),
    allActionsLogged: z.boolean(),
    hipaaCompliant: z.boolean(),
    retentionGuaranteed: z.boolean(),

    // Detailed audit entries
    auditEntries: z.array(z.object({
      timestamp: z.string(),
      action: z.string(),
      performer: z.enum(['system', 'ai', 'human', 'emergency_protocol']),
      dataAccessed: z.array(z.string()),
      outcome: z.string(),
      safetyImpact: z.enum(['none', 'positive', 'neutral', 'requires_monitoring'])
    }))
  })
});

export type CrisisConflictResolution = z.infer<typeof CrisisConflictResolutionSchema>;

/**
 * CROSS-DEVICE COORDINATION TYPES
 */

/**
 * Cross-device conflict coordination
 */
export const CrossDeviceConflictCoordinationSchema = z.object({
  // Device registry and state
  deviceRegistry: z.array(z.object({
    deviceId: z.string(),
    deviceType: z.enum(['phone', 'tablet', 'desktop', 'web']),
    platform: z.enum(['ios', 'android', 'windows', 'macos', 'web']),
    isOnline: z.boolean(),
    lastSyncAt: z.string(), // ISO timestamp
    syncVersion: z.string(),

    // Device priority for conflict resolution
    devicePriority: z.enum(['primary', 'secondary', 'backup']),
    trustLevel: z.enum(['trusted', 'verified', 'unverified']),
    subscriptionTier: z.enum(['free', 'premium', 'family', 'enterprise'])
  })),

  // Active therapeutic sessions requiring coordination
  activeTherapeuticSessions: z.array(z.object({
    sessionId: z.string(),
    sessionType: z.enum(['morning', 'midday', 'evening', 'crisis', 'assessment']),
    primaryDevice: z.string(),
    sessionStarted: z.string(), // ISO timestamp
    lastActivity: z.string(), // ISO timestamp

    // Session preservation requirements
    preservationRequired: z.boolean(),
    continuityRequired: z.boolean(),
    crossDeviceHandoffAllowed: z.boolean(),

    // Conflict implications
    conflictsWillDisruptSession: z.boolean(),
    sessionDataInvolvedInConflict: z.boolean(),
    resolutionMustPreserveSession: z.boolean()
  })),

  // Cross-device conflict resolution strategies
  coordinationStrategies: z.object({
    // Default strategies by device relationship
    primaryDeviceStrategy: z.enum([
      'primary_device_wins',        // Primary device always takes precedence
      'most_recent_wins',          // Most recent modification wins
      'merge_when_compatible',     // Merge compatible changes
      'preserve_therapeutic_state' // Always preserve therapeutic sessions
    ]).default('preserve_therapeutic_state'),

    // Offline device handling
    offlineDeviceStrategy: z.enum([
      'defer_until_online',        // Wait for device to come online
      'resolve_without_offline',   // Resolve using online devices only
      'preserve_offline_changes',  // Always preserve offline modifications
      'prompt_user_when_online'    // Ask user when offline device reconnects
    ]).default('preserve_offline_changes'),

    // Session handoff during conflicts
    sessionHandoffStrategy: z.enum([
      'preserve_active_session',   // Never disrupt active sessions
      'migrate_to_primary',        // Move sessions to primary device
      'pause_until_resolved',      // Pause sessions until conflict resolved
      'duplicate_session_state'    // Duplicate session state across devices
    ]).default('preserve_active_session')
  }),

  // Coordination performance requirements
  coordinationPerformance: z.object({
    maxCoordinationTime: z.number().default(2000), // 2 seconds for cross-device
    sessionHandoffMaxTime: z.number().default(5000), // 5 seconds for session handoff
    conflictResolutionTimeout: z.number().default(30000), // 30 seconds total

    // Performance tracking
    averageCoordinationTime: z.number(),
    sessionHandoffSuccessRate: z.number(), // 0-100 percentage
    crossDeviceConflictRate: z.number(), // conflicts per hour
    coordinationFailureRate: z.number() // 0-100 percentage
  })
});

export type CrossDeviceConflictCoordination = z.infer<typeof CrossDeviceConflictCoordinationSchema>;

/**
 * CONFLICT RESOLUTION SERVICE INTERFACE
 */

/**
 * Complete conflict resolution service state
 */
export interface ConflictResolutionState {
  // Active conflicts
  readonly activeConflicts: ConflictDescriptor[];
  readonly conflictQueue: ConflictDescriptor[];
  readonly conflictsBeingResolved: ConflictDescriptor[];

  // AI assistance
  readonly aiAssistance: {
    readonly available: boolean;
    readonly modelVersion: string;
    readonly confidenceThreshold: number;
    readonly recentAnalyses: AIConflictAnalysis[];
  };

  // Crisis handling
  readonly crisisHandling: {
    readonly config: CrisisSafeConflictHandling;
    readonly activeCrisisConflicts: ConflictDescriptor[];
    readonly crisisResolutionHistory: CrisisConflictResolution[];
  };

  // Cross-device coordination
  readonly crossDeviceCoordination: CrossDeviceConflictCoordination;

  // Performance metrics
  readonly performance: {
    readonly averageResolutionTime: number; // milliseconds
    readonly crisisResolutionTime: number; // milliseconds (must be <200ms)
    readonly resolutionSuccessRate: number; // 0-100 percentage
    readonly aiAssistanceSuccessRate: number; // 0-100 percentage
    readonly conflictRecurrenceRate: number; // 0-100 percentage
  };

  // System health
  readonly systemHealth: {
    readonly status: 'healthy' | 'degraded' | 'critical';
    readonly conflictBacklog: number;
    readonly processingCapacity: number; // conflicts per minute
    readonly lastHealthCheck: string; // ISO timestamp
  };
}

/**
 * Conflict resolution service actions
 */
export interface ConflictResolutionActions {
  // Conflict detection and classification
  detectConflict: (entities: SyncableData[], context: Record<string, unknown>) => Promise<ConflictDescriptor | null>;
  classifyConflict: (conflict: ConflictDescriptor) => Promise<ConflictDescriptor>;
  prioritizeConflict: (conflict: ConflictDescriptor) => ConflictResolutionPriority;

  // Resolution strategies
  resolveConflict: (conflictId: string, strategy?: string) => Promise<AIResolutionResult>;
  resolveWithAI: (conflictId: string) => Promise<AIResolutionResult>;
  resolveWithUserInput: (conflictId: string, userChoice: Record<string, unknown>) => Promise<AIResolutionResult>;

  // Crisis-specific resolution
  resolveCrisisConflict: (conflictId: string) => Promise<CrisisConflictResolution>;
  activateEmergencyProtocol: (conflictId: string, reason: string) => Promise<void>;
  escalateToClinicalReview: (conflictId: string) => Promise<void>;

  // Cross-device coordination
  coordinateAcrossDevices: (sessionId: string) => Promise<void>;
  handleDeviceHandoff: (sessionId: string, fromDevice: string, toDevice: string) => Promise<boolean>;
  resolveOfflineOnlineConflict: (conflictId: string) => Promise<AIResolutionResult>;

  // Performance and monitoring
  validateResolutionPerformance: (resolutionId: string, targetTime: number) => boolean;
  getPerformanceMetrics: () => Promise<ConflictResolutionState['performance']>;
  checkSystemHealth: () => Promise<ConflictResolutionState['systemHealth']>;

  // Configuration and management
  updateAIConfidenceThreshold: (threshold: number) => Promise<void>;
  updateCrisisHandlingConfig: (config: Partial<CrisisSafeConflictHandling>) => Promise<void>;
  exportConflictHistory: (startDate: string, endDate: string) => Promise<ConflictDescriptor[]>;
}

/**
 * Complete conflict resolution service interface
 */
export interface ConflictResolutionService extends ConflictResolutionState, ConflictResolutionActions {
  // Service lifecycle
  initialize: (config: ConflictResolutionConfig) => Promise<void>;
  shutdown: () => Promise<void>;

  // Type-safe resolution execution
  executeResolution: <T>(
    conflict: ConflictDescriptor,
    resolver: () => Promise<T>,
    fallback?: T
  ) => Promise<T>;

  // Crisis-safe resolution wrapper
  executeCrisisSafeResolution: <T>(
    conflict: ConflictDescriptor,
    resolver: () => Promise<T>,
    emergencyFallback: T
  ) => Promise<T>;
}

/**
 * CONFLICT RESOLUTION CONFIGURATION
 */

/**
 * Service configuration schema
 */
export const ConflictResolutionConfigSchema = z.object({
  // Service identification
  serviceId: z.string(),
  version: z.string(),
  environment: z.enum(['development', 'staging', 'production']),

  // Resolution engine configuration
  resolutionEngine: z.object({
    maxConcurrentResolutions: z.number().default(5),
    resolutionTimeoutMs: z.number().default(30000), // 30 seconds
    enableParallelProcessing: z.boolean().default(true),

    // Performance requirements
    crisisResolutionMaxTimeMs: z.number().default(200),
    therapeuticResolutionMaxTimeMs: z.number().default(1000),
    normalResolutionMaxTimeMs: z.number().default(5000)
  }),

  // AI assistance configuration
  aiAssistance: z.object({
    enabled: z.boolean().default(true),
    modelVersion: z.string().default('conflict-resolution-v1'),
    confidenceThreshold: z.number().min(0).max(1).default(0.7),
    maxAnalysisTimeMs: z.number().default(5000),

    // AI safety limits
    requireHumanReviewThreshold: z.number().min(0).max(1).default(0.3),
    therapeuticDataReviewRequired: z.boolean().default(true),
    crisisDataAutoResolutionAllowed: z.boolean().default(false)
  }),

  // Crisis handling configuration
  crisisHandling: CrisisSafeConflictHandlingSchema,

  // Cross-device coordination
  crossDevice: z.object({
    enabled: z.boolean().default(true),
    maxCoordinationTimeMs: z.number().default(10000),
    sessionHandoffTimeoutMs: z.number().default(30000),
    trustVerificationRequired: z.boolean().default(true)
  }),

  // Performance monitoring
  monitoring: z.object({
    enablePerformanceTracking: z.boolean().default(true),
    metricsRetentionDays: z.number().default(90),
    healthCheckIntervalMs: z.number().default(60000), // 1 minute

    // Alert thresholds
    alertThresholds: z.object({
      conflictBacklogWarning: z.number().default(50),
      conflictBacklogCritical: z.number().default(100),
      resolutionTimeWarningMs: z.number().default(10000),
      resolutionTimeCriticalMs: z.number().default(30000)
    })
  }),

  // Data retention and compliance
  compliance: z.object({
    retainConflictHistory: z.boolean().default(true),
    conflictHistoryRetentionDays: z.number().default(2555), // 7 years
    auditAllResolutions: z.boolean().default(true),
    hipaaCompliantLogging: z.boolean().default(true),
    encryptSensitiveConflictData: z.boolean().default(true)
  })
});

export type ConflictResolutionConfig = z.infer<typeof ConflictResolutionConfigSchema>;

/**
 * CONSTANTS AND VALIDATION
 */
export const CONFLICT_RESOLUTION_CONSTANTS = {
  // Performance requirements (non-negotiable)
  CRISIS_MAX_RESOLUTION_TIME: 200, // milliseconds
  THERAPEUTIC_MAX_RESOLUTION_TIME: 1000, // milliseconds
  CROSS_DEVICE_MAX_COORDINATION_TIME: 2000, // milliseconds

  // Priority hierarchy
  PRIORITY_HIERARCHY: ConflictResolutionPriority,

  // AI confidence thresholds
  AI_HIGH_CONFIDENCE: 0.8,
  AI_MEDIUM_CONFIDENCE: 0.6,
  AI_LOW_CONFIDENCE: 0.4,
  AI_REQUIRE_HUMAN_REVIEW: 0.3,

  // Crisis data types (special handling)
  CRISIS_DATA_TYPES: [
    'assessment_scores',
    'crisis_plan',
    'emergency_contacts',
    'safety_strategies'
  ],

  // Therapeutic data types (clinical accuracy required)
  THERAPEUTIC_DATA_TYPES: [
    'phq9_scores',
    'gad7_scores',
    'therapeutic_sessions',
    'clinical_notes'
  ],

  // Default resolution strategies
  DEFAULT_STRATEGIES: {
    crisis_data: 'preserve_all_crisis_data',
    assessment_data: 'preserve_clinical_accuracy',
    therapeutic_session: 'preserve_therapeutic_continuity',
    user_preferences: 'most_recent_wins',
    device_settings: 'primary_device_wins',
    system_metadata: 'last_write_wins'
  }
} as const;

/**
 * Type guards for conflict resolution types
 */
export const isConflictDescriptor = (value: unknown): value is ConflictDescriptor => {
  try {
    ConflictDescriptorSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isAIConflictAnalysis = (value: unknown): value is AIConflictAnalysis => {
  try {
    AIConflictAnalysisSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isCrisisConflictResolution = (value: unknown): value is CrisisConflictResolution => {
  try {
    CrisisConflictResolutionSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Export schemas for runtime validation
 */
export default {
  ConflictTypeSchema,
  ConflictDescriptorSchema,
  AIConflictAnalysisSchema,
  AIResolutionResultSchema,
  CrisisSafeConflictHandlingSchema,
  CrisisConflictResolutionSchema,
  CrossDeviceConflictCoordinationSchema,
  ConflictResolutionConfigSchema,

  // Type guards
  isConflictDescriptor,
  isAIConflictAnalysis,
  isCrisisConflictResolution,

  // Constants and enums
  ConflictResolutionPriority,
  CONFLICT_RESOLUTION_CONSTANTS
};