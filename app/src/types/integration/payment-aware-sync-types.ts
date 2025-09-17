/**
 * Payment-Aware Sync Integration Type Definitions
 * P0-CLOUD Platform Infrastructure - TypeScript Implementation
 *
 * Comprehensive payment-aware synchronization types for:
 * - Subscription tier enforcement with sync quota management
 * - Payment status integration with sync operations
 * - Crisis payment override with emergency access
 * - Revenue impact validation for sync failures
 * - Grace period management with therapeutic continuity
 */

import { z } from 'zod';
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
  PaymentState,
  PaymentError
} from '../payment';
import type {
  OrchestrationPriority,
  OrchestrationOperation
} from '../orchestration/sync-orchestration-types';
import type {
  PerformanceMetric
} from '../orchestration/performance-monitoring-types';

/**
 * SUBSCRIPTION TIER SYNC ENFORCEMENT
 */

/**
 * Subscription tier sync quota management
 */
export const SyncQuotaManagementSchema = z.object({
  // Quota identification
  quotaId: z.string(),
  subscriptionTier: z.enum(['free', 'premium', 'family', 'enterprise']),
  userId: z.string(),

  // Current quota status
  currentQuota: z.object({
    // Operations quota
    operationsUsed: z.number(),
    operationsLimit: z.number(),
    operationsRemaining: z.number(),

    // Data transfer quota
    dataTransferUsedMB: z.number(),
    dataTransferLimitMB: z.number(),
    dataTransferRemainingMB: z.number(),

    // Time-based quotas
    quotaPeriodStart: z.string(), // ISO timestamp
    quotaPeriodEnd: z.string(),   // ISO timestamp
    quotaPeriodType: z.enum(['hourly', 'daily', 'weekly', 'monthly']),

    // Real-time usage tracking
    lastUsageUpdate: z.string(), // ISO timestamp
    usageRate: z.number(), // operations per hour
    projectedUsage: z.number() // projected operations for period
  }),

  // Quota enforcement configuration
  enforcement: z.object({
    enforceOperationsLimit: z.boolean(),
    enforceDataTransferLimit: z.boolean(),
    enforcementMode: z.enum(['strict', 'warning', 'graceful']),

    // Grace period configuration
    gracePeriod: z.object({
      enabled: z.boolean(),
      durationMinutes: z.number(),
      remainingMinutes: z.number().optional(),
      activatedAt: z.string().optional(), // ISO timestamp
      reasonForActivation: z.string().optional()
    }),

    // Crisis override configuration
    crisisOverride: z.object({
      enabled: z.boolean(),
      allowsCrisisAccess: z.boolean(),
      crisisAccessDurationMinutes: z.number().default(60), // 1 hour default
      activeCrisisOverride: z.boolean(),
      crisisOverrideActivatedAt: z.string().optional() // ISO timestamp
    })
  }),

  // Subscription tier specific features
  tierFeatures: z.object({
    allowedSyncTypes: z.array(z.enum([
      'basic_sync',
      'real_time_sync',
      'cross_device_sync',
      'conflict_resolution',
      'therapeutic_session_sync',
      'crisis_data_sync',
      'family_data_sharing',
      'enterprise_analytics_sync'
    ])),

    // Performance guarantees
    performanceGuarantees: z.object({
      maxSyncLatency: z.number(), // milliseconds
      guaranteedUptime: z.number().min(0).max(100), // percentage
      supportLevel: z.enum(['basic', 'standard', 'priority', 'enterprise']),
      responseTimeSLA: z.number() // milliseconds
    }),

    // Data retention and backup
    dataRetention: z.object({
      retentionPeriodDays: z.number(),
      backupEnabled: z.boolean(),
      versionHistoryEnabled: z.boolean(),
      auditLogsEnabled: z.boolean()
    })
  }),

  // Quota violation tracking
  violations: z.object({
    totalViolations: z.number(),
    violationsThisPeriod: z.number(),
    lastViolation: z.string().optional(), // ISO timestamp

    // Violation details
    violationHistory: z.array(z.object({
      violationType: z.enum(['operations_exceeded', 'data_transfer_exceeded', 'feature_not_allowed']),
      violationTime: z.string(), // ISO timestamp
      violationValue: z.number(),
      limit: z.number(),
      actionTaken: z.enum(['blocked', 'warned', 'grace_period_activated', 'crisis_override_used'])
    }))
  }),

  // Usage analytics and insights
  analytics: z.object({
    // Usage patterns
    usagePattern: z.enum(['consistent', 'bursty', 'peak_heavy', 'off_peak_heavy']),
    averageDailyUsage: z.number(),
    peakUsageHour: z.number(), // 0-23
    lowUsageHour: z.number(), // 0-23

    // Efficiency metrics
    syncEfficiency: z.number().min(0).max(100), // percentage
    dataDeduplicationRate: z.number().min(0).max(100), // percentage
    compressionRatio: z.number(), // compression achieved

    // User behavior insights
    therapeuticUsagePattern: z.object({
      morningUsage: z.number(), // percentage
      middayUsage: z.number(),  // percentage
      eveningUsage: z.number(), // percentage
      crisisUsage: z.number()   // percentage
    })
  })
});

export type SyncQuotaManagement = z.infer<typeof SyncQuotaManagementSchema>;

/**
 * Payment status integration with sync operations
 */
export const PaymentSyncIntegrationSchema = z.object({
  // Payment context for sync operations
  paymentContext: z.object({
    userId: z.string(),
    subscriptionId: z.string().optional(),
    currentTier: z.enum(['free', 'premium', 'family', 'enterprise']),

    // Payment status
    paymentStatus: z.enum(['active', 'past_due', 'canceled', 'trial', 'grace_period']),
    lastSuccessfulPayment: z.string().optional(), // ISO timestamp
    nextBillingDate: z.string().optional(), // ISO timestamp

    // Payment health
    paymentHealth: z.object({
      paymentMethodValid: z.boolean(),
      autoRenewalEnabled: z.boolean(),
      billingIssues: z.boolean(),
      riskScore: z.number().min(0).max(100) // 0-100 payment risk score
    })
  }),

  // Sync access control based on payment status
  syncAccessControl: z.object({
    // Access levels
    basicSyncAllowed: z.boolean(),
    advancedSyncAllowed: z.boolean(),
    realTimeSyncAllowed: z.boolean(),
    crossDeviceSyncAllowed: z.boolean(),

    // Feature access based on payment
    featureAccess: z.object({
      conflictResolutionEnabled: z.boolean(),
      performanceMonitoringEnabled: z.boolean(),
      prioritySupportEnabled: z.boolean(),
      analyticsEnabled: z.boolean(),
      familySharingEnabled: z.boolean(),
      enterpriseFeaturesEnabled: z.boolean()
    }),

    // Access restrictions
    restrictions: z.object({
      quotasEnforced: z.boolean(),
      featureLimitationsActive: z.boolean(),
      gracePeriodActive: z.boolean(),
      temporarySuspension: z.boolean(),

      // Restriction details
      restrictionReasons: z.array(z.enum([
        'payment_overdue',
        'subscription_canceled',
        'trial_expired',
        'payment_method_failed',
        'billing_dispute',
        'compliance_issue'
      ])),

      // Restoration conditions
      restorationRequirements: z.array(z.enum([
        'payment_update_required',
        'subscription_renewal_required',
        'billing_issue_resolution',
        'account_verification'
      ]))
    })
  }),

  // Payment impact on sync performance
  performanceImpact: z.object({
    // Performance tier based on payment status
    performanceTier: z.enum(['basic', 'standard', 'premium', 'enterprise']),

    // Resource allocation
    resourceAllocation: z.object({
      cpuAllocationPercentage: z.number().min(0).max(100),
      memoryAllocationMB: z.number(),
      networkBandwidthMbps: z.number(),
      priorityQueueAccess: z.boolean()
    }),

    // Performance guarantees
    performanceGuarantees: z.object({
      syncLatencyGuarantee: z.number(), // milliseconds
      uptimeGuarantee: z.number().min(0).max(100), // percentage
      supportResponseTime: z.number(), // hours
      conflictResolutionTime: z.number() // milliseconds
    }),

    // Degradation policies
    degradationPolicies: z.object({
      gracefulDegradation: z.boolean(),
      featureDisabling: z.boolean(),
      performanceThrottling: z.boolean(),
      queuePriorityReduction: z.boolean()
    })
  }),

  // Revenue protection mechanisms
  revenueProtection: z.object({
    // Revenue impact assessment
    revenueImpact: z.object({
      monthlyRevenue: z.number(),
      annualRevenue: z.number(),
      churnRisk: z.number().min(0).max(100), // percentage
      lifetimeValue: z.number()
    }),

    // Retention strategies
    retentionStrategies: z.object({
      offerGracePeriod: z.boolean(),
      enableDowngrade: z.boolean(),
      provideSupportOutreach: z.boolean(),
      offerPaymentPlans: z.boolean(),

      // Win-back campaigns
      winBackCampaigns: z.array(z.object({
        campaignId: z.string(),
        offerType: z.enum(['discount', 'free_trial', 'feature_unlock', 'support']),
        validUntil: z.string(), // ISO timestamp
        applied: z.boolean()
      }))
    }),

    // Churn prevention
    churnPrevention: z.object({
      earlyWarningSignals: z.array(z.enum([
        'payment_failure',
        'usage_decline',
        'support_tickets_increase',
        'feature_dissatisfaction',
        'performance_complaints'
      ])),
      preventionActions: z.array(z.enum([
        'proactive_support',
        'usage_analysis',
        'feature_recommendations',
        'performance_optimization',
        'retention_offer'
      ])),
      preventionEffectiveness: z.number().min(0).max(100) // percentage
    })
  }),

  // Sync operation payment validation
  operationValidation: z.object({
    // Pre-operation validation
    validateBeforeSync: z.boolean(),
    validationTimeout: z.number().default(100), // milliseconds

    // Validation criteria
    criteria: z.object({
      checkPaymentStatus: z.boolean(),
      checkQuotaAvailability: z.boolean(),
      checkFeatureAccess: z.boolean(),
      checkPerformanceTier: z.boolean(),

      // Validation thresholds
      minRemainingQuota: z.number(), // operations
      minDataTransferRemaining: z.number(), // MB
      maxValidationLatency: z.number() // milliseconds
    }),

    // Validation results cache
    validationCache: z.object({
      cacheEnabled: z.boolean(),
      cacheDurationMinutes: z.number().default(5),
      lastCacheUpdate: z.string().optional(), // ISO timestamp
      cacheHitRate: z.number().min(0).max(100) // percentage
    })
  })
});

export type PaymentSyncIntegration = z.infer<typeof PaymentSyncIntegrationSchema>;

/**
 * CRISIS PAYMENT OVERRIDE SYSTEM
 */

/**
 * Crisis payment override with emergency access
 */
export const CrisisPaymentOverrideSchema = z.object({
  // Override identification
  overrideId: z.string(),
  userId: z.string(),
  triggeredBy: z.enum(['automatic_crisis_detection', 'manual_crisis_button', 'clinical_assessment', 'emergency_contact']),

  // Crisis context
  crisisContext: z.object({
    crisisLevel: z.enum(['low', 'moderate', 'high', 'emergency']),
    crisisType: z.enum(['suicidal_ideation', 'panic_attack', 'severe_depression', 'self_harm_risk', 'emergency']),
    detectedAt: z.string(), // ISO timestamp
    crisisSessionId: z.string().optional(),

    // Crisis data
    crisisData: z.object({
      assessmentScores: z.record(z.string(), z.number()).optional(), // assessment -> score
      userReportedSeverity: z.number().min(1).max(10).optional(),
      clinicalIndicators: z.array(z.string()).optional(),
      emergencyContactsNotified: z.boolean()
    })
  }),

  // Override permissions and scope
  overridePermissions: z.object({
    // Sync permissions granted
    syncPermissions: z.object({
      unlimitedSyncOperations: z.boolean(),
      bypassQuotaLimitations: z.boolean(),
      enablePremiumFeatures: z.boolean(),
      crossDeviceSyncEnabled: z.boolean(),
      realTimeSyncEnabled: z.boolean(),
      priorityQueueAccess: z.boolean()
    }),

    // Data access permissions
    dataAccessPermissions: z.object({
      accessAllHistoricalData: z.boolean(),
      accessCrisisPlanData: z.boolean(),
      accessEmergencyContacts: z.boolean(),
      accessTherapeuticContent: z.boolean(),
      shareDataWithEmergencyContacts: z.boolean().default(false) // Privacy protected
    }),

    // Feature override permissions
    featureOverrides: z.object({
      enableAllAssessments: z.boolean(),
      enableAllBreathingExercises: z.boolean(),
      enableAllTherapeuticContent: z.boolean(),
      bypassTimeRestrictions: z.boolean(),
      enableEmergencySupport: z.boolean()
    })
  }),

  // Override duration and expiration
  duration: z.object({
    overrideStartTime: z.string(), // ISO timestamp
    baseDurationMinutes: z.number().default(60), // 1 hour default
    extensionsAllowed: z.boolean(),
    maxTotalDurationMinutes: z.number().default(1440), // 24 hours max

    // Dynamic duration adjustment
    durationAdjustment: z.object({
      adjustBasedOnSeverity: z.boolean(),
      adjustBasedOnUserResponse: z.boolean(),
      adjustBasedOnPaymentStatus: z.boolean(),

      // Adjustment factors
      severityMultiplier: z.number().default(1.0),
      responseMultiplier: z.number().default(1.0),
      paymentStatusMultiplier: z.number().default(1.0)
    }),

    // Automatic expiration
    autoExpiration: z.object({
      enabled: z.boolean(),
      expirationTime: z.string(), // ISO timestamp
      gracePeriodMinutes: z.number().default(15),
      warningBeforeExpiration: z.boolean(),
      allowManualExtension: z.boolean()
    })
  }),

  // Override impact tracking
  impact: z.object({
    // Usage during override
    usageDuringOverride: z.object({
      syncOperationsUsed: z.number(),
      dataTransferredMB: z.number(),
      featuresAccessed: z.array(z.string()),
      timeSpentMinutes: z.number(),

      // Therapeutic engagement during crisis
      therapeuticEngagement: z.object({
        assessmentsCompleted: z.number(),
        breathingExercisesUsed: z.number(),
        crisisPlanAccessed: z.boolean(),
        emergencyContactsUsed: z.boolean(),
        safetyStrategiesEmployed: z.array(z.string())
      })
    }),

    // Revenue impact
    revenueImpact: z.object({
      estimatedCostOfOverride: z.number(),
      potentialRevenueProtected: z.number(), // from preventing churn
      lifetimeValueConsideration: z.number(),
      costBenefitRatio: z.number()
    }),

    // Clinical impact
    clinicalImpact: z.object({
      crisisResolutionTime: z.number().optional(), // minutes
      userStabilized: z.boolean().optional(),
      emergencyServicesContacted: z.boolean(),
      followUpRequired: z.boolean(),
      overrideEffectiveness: z.enum(['highly_effective', 'effective', 'somewhat_effective', 'not_effective']).optional()
    })
  }),

  // Override deactivation
  deactivation: z.object({
    deactivationReason: z.enum([
      'crisis_resolved',
      'time_expired',
      'user_stable',
      'manual_deactivation',
      'payment_restored',
      'emergency_services_engaged',
      'clinical_handoff'
    ]).optional(),

    deactivatedAt: z.string().optional(), // ISO timestamp
    deactivatedBy: z.enum(['automatic', 'user', 'system', 'clinical_staff', 'emergency_contact']).optional(),

    // Post-deactivation actions
    postDeactivationActions: z.array(z.enum([
      'restore_normal_quotas',
      'offer_subscription_upgrade',
      'schedule_follow_up',
      'provide_crisis_resources',
      'update_crisis_plan',
      'notify_clinical_team'
    ])).default([])
  }),

  // Compliance and audit
  compliance: z.object({
    // Audit trail
    auditTrail: z.array(z.object({
      action: z.string(),
      timestamp: z.string(),
      actor: z.enum(['system', 'user', 'clinical_staff', 'emergency_contact']),
      details: z.string(),
      dataAccessed: z.array(z.string()).optional()
    })),

    // Compliance requirements
    complianceRequirements: z.object({
      documentOverrideReason: z.boolean(),
      requireClinicalJustification: z.boolean(),
      auditDataAccess: z.boolean(),
      retainAuditLogs: z.boolean(),
      hipaaCompliant: z.boolean()
    }),

    // Privacy protection
    privacyProtection: z.object({
      minimizeDataSharing: z.boolean(),
      encryptSensitiveData: z.boolean(),
      limitDataRetention: z.boolean(),
      respectUserPrivacyPreferences: z.boolean()
    })
  })
});

export type CrisisPaymentOverride = z.infer<typeof CrisisPaymentOverrideSchema>;

/**
 * GRACE PERIOD MANAGEMENT
 */

/**
 * Grace period management with therapeutic continuity
 */
export const GracePeriodManagementSchema = z.object({
  // Grace period identification
  gracePeriodId: z.string(),
  userId: z.string(),
  subscriptionId: z.string(),

  // Grace period trigger
  trigger: z.object({
    triggerReason: z.enum([
      'payment_failure',
      'billing_dispute',
      'payment_method_expired',
      'subscription_canceled',
      'billing_retry_exhausted',
      'dunning_process_initiated',
      'churn_prevention',
      'customer_service_request'
    ]),
    triggeredAt: z.string(), // ISO timestamp
    triggerData: z.record(z.string(), z.unknown()).optional()
  }),

  // Grace period configuration
  configuration: z.object({
    // Duration settings
    baseDurationDays: z.number(),
    extensionsAllowed: z.number().default(2), // Max extensions
    maxTotalDurationDays: z.number().default(14), // 2 weeks max

    // Service level during grace period
    serviceLevel: z.object({
      maintainCurrentTier: z.boolean(),
      allowFeatureAccess: z.boolean(),
      quotaRestrictions: z.boolean(),
      performanceThrottling: z.boolean(),

      // Therapeutic continuity protection
      therapeuticContinuity: z.object({
        maintainCrisisAccess: z.boolean().default(true),
        maintainAssessmentAccess: z.boolean().default(true),
        maintainBasicSync: z.boolean().default(true),
        maintainTherapeuticContent: z.boolean().default(true)
      })
    }),

    // User communication
    userCommunication: z.object({
      notifyGracePeriodStart: z.boolean(),
      sendReminderNotifications: z.boolean(),
      reminderFrequencyDays: z.number().default(3),
      finalWarningDays: z.number().default(2),
      communicationChannels: z.array(z.enum(['email', 'sms', 'in_app', 'push_notification']))
    })
  }),

  // Current grace period status
  status: z.object({
    isActive: z.boolean(),
    startDate: z.string(), // ISO timestamp
    endDate: z.string(),   // ISO timestamp
    remainingDays: z.number(),
    extensionsUsed: z.number(),

    // Progress indicators
    progressIndicators: z.object({
      daysPassed: z.number(),
      percentageComplete: z.number().min(0).max(100),
      timeRemaining: z.string(), // Human readable
      urgencyLevel: z.enum(['low', 'medium', 'high', 'critical'])
    })
  }),

  // User engagement during grace period
  engagement: z.object({
    // Activity tracking
    activityDuringGrace: z.object({
      loginCount: z.number(),
      syncOperations: z.number(),
      featuresUsed: z.array(z.string()),
      therapeuticActivitiesCompleted: z.number(),

      // Engagement quality
      engagementScore: z.number().min(0).max(100), // percentage
      retentionLikelihood: z.number().min(0).max(100), // percentage
      churnRisk: z.number().min(0).max(100) // percentage
    }),

    // Payment recovery efforts
    paymentRecoveryEfforts: z.array(z.object({
      effortType: z.enum(['payment_method_update', 'billing_contact', 'support_ticket', 'retention_offer']),
      attemptedAt: z.string(), // ISO timestamp
      outcome: z.enum(['successful', 'failed', 'pending', 'ignored']),
      followUpRequired: z.boolean()
    })),

    // Therapeutic impact during grace period
    therapeuticImpact: z.object({
      continuityMaintained: z.boolean(),
      engagementLevel: z.enum(['high', 'medium', 'low', 'minimal']),
      clinicalRisk: z.enum(['low', 'medium', 'high', 'critical']),
      interventionRequired: z.boolean()
    })
  }),

  // Grace period resolution
  resolution: z.object({
    resolutionOutcome: z.enum([
      'payment_restored',
      'subscription_renewed',
      'downgrade_accepted',
      'expired_to_free_tier',
      'account_suspended',
      'voluntary_cancellation',
      'involuntary_cancellation'
    ]).optional(),

    resolvedAt: z.string().optional(), // ISO timestamp
    resolutionData: z.record(z.string(), z.unknown()).optional(),

    // Post-resolution actions
    postResolutionActions: z.array(z.enum([
      'restore_full_service',
      'apply_tier_changes',
      'send_welcome_back_communication',
      'update_billing_information',
      'schedule_retention_followup',
      'update_churn_risk_score'
    ])).default([])
  }),

  // Analytics and insights
  analytics: z.object({
    // Grace period effectiveness
    effectiveness: z.object({
      recoveryRate: z.number().min(0).max(100), // percentage recovered
      averageRecoveryTime: z.number(), // days
      userSatisfactionScore: z.number().min(0).max(100).optional(),
      therapeuticOutcomes: z.enum(['positive', 'neutral', 'negative']).optional()
    }),

    // Revenue impact
    revenueImpact: z.object({
      revenueAtRisk: z.number(),
      revenueRecovered: z.number().optional(),
      costOfGracePeriod: z.number(),
      netRevenueImpact: z.number().optional()
    }),

    // Learning and optimization
    learnings: z.array(z.object({
      insight: z.string(),
      actionable: z.boolean(),
      implementationPriority: z.enum(['low', 'medium', 'high'])
    })).optional()
  })
});

export type GracePeriodManagement = z.infer<typeof GracePeriodManagementSchema>;

/**
 * PAYMENT-AWARE SYNC SERVICE INTERFACE
 */

/**
 * Payment-aware sync service state
 */
export interface PaymentAwareSyncState {
  // Subscription and payment tracking
  readonly subscriptionTracking: {
    readonly activeSubscriptions: Map<string, SubscriptionState>;
    readonly paymentStates: Map<string, PaymentState>;
    readonly syncQuotas: Map<string, SyncQuotaManagement>;
  };

  // Crisis override management
  readonly crisisOverrides: {
    readonly activeOverrides: Map<string, CrisisPaymentOverride>;
    readonly overrideHistory: CrisisPaymentOverride[];
    readonly totalOverrideCost: number;
  };

  // Grace period management
  readonly gracePeriods: {
    readonly activeGracePeriods: Map<string, GracePeriodManagement>;
    readonly gracePeriodEffectiveness: number; // percentage recovery rate
  };

  // Revenue protection
  readonly revenueProtection: {
    readonly monthlyRevenue: number;
    readonly revenueAtRisk: number;
    readonly churnPreventionEffectiveness: number; // percentage
  };

  // Service health
  readonly serviceHealth: {
    readonly status: 'healthy' | 'degraded' | 'critical';
    readonly paymentIntegrationHealth: number; // 0-100
    readonly syncQuotaAccuracy: number; // 0-100
  };
}

/**
 * Payment-aware sync service actions
 */
export interface PaymentAwareSyncActions {
  // Subscription and quota management
  updateSubscriptionTier: (userId: string, oldTier: SubscriptionTier, newTier: SubscriptionTier) => Promise<void>;
  enforceQuotaLimits: (userId: string, operation: SyncOperation) => Promise<boolean>;
  checkFeatureAccess: (userId: string, feature: string) => Promise<boolean>;

  // Crisis override management
  activateCrisisOverride: (userId: string, crisisContext: CrisisPaymentOverride['crisisContext']) => Promise<string>;
  extendCrisisOverride: (overrideId: string, additionalMinutes: number) => Promise<void>;
  deactivateCrisisOverride: (overrideId: string, reason: string) => Promise<void>;

  // Grace period management
  initiateGracePeriod: (userId: string, trigger: GracePeriodManagement['trigger']) => Promise<string>;
  extendGracePeriod: (gracePeriodId: string, additionalDays: number) => Promise<void>;
  resolveGracePeriod: (gracePeriodId: string, outcome: string) => Promise<void>;

  // Payment status integration
  handlePaymentStatusChange: (userId: string, oldStatus: string, newStatus: string) => Promise<void>;
  handleSubscriptionWebhook: (webhookData: unknown) => Promise<void>;
  validatePaymentForSync: (userId: string, operation: SyncOperation) => Promise<boolean>;

  // Revenue protection
  assessChurnRisk: (userId: string) => Promise<number>;
  applyRetentionStrategies: (userId: string) => Promise<void>;
  calculateRevenueImpact: (scenario: string) => Promise<number>;

  // Analytics and reporting
  generateRevenueReport: (startDate: string, endDate: string) => Promise<unknown>;
  getQuotaUtilizationReport: (userId?: string) => Promise<unknown>;
  getCrisisOverrideReport: (startDate: string, endDate: string) => Promise<unknown>;
}

/**
 * Complete payment-aware sync service interface
 */
export interface PaymentAwareSyncService extends PaymentAwareSyncState, PaymentAwareSyncActions {
  // Service lifecycle
  initialize: (config: PaymentAwareSyncConfig) => Promise<void>;
  shutdown: () => Promise<void>;

  // Payment-aware sync execution
  executeSyncWithPaymentValidation: <T>(
    operation: SyncOperation,
    executor: () => Promise<T>,
    fallback?: T
  ) => Promise<T>;

  // Crisis-aware sync execution
  executeCrisisSync: <T>(
    operation: SyncOperation,
    executor: () => Promise<T>
  ) => Promise<T>;
}

/**
 * CONFIGURATION AND CONSTANTS
 */

/**
 * Payment-aware sync configuration
 */
export const PaymentAwareSyncConfigSchema = z.object({
  // Service identification
  serviceId: z.string(),
  version: z.string(),
  environment: z.enum(['development', 'staging', 'production']),

  // Quota enforcement configuration
  quotaEnforcement: z.object({
    enableQuotaEnforcement: z.boolean().default(true),
    quotaCheckTimeout: z.number().default(100), // milliseconds
    quotaViolationHandling: z.enum(['block', 'warn', 'throttle']).default('block'),

    // Grace period for quota violations
    quotaGracePeriod: z.object({
      enabled: z.boolean().default(true),
      durationMinutes: z.number().default(5),
      allowedViolations: z.number().default(3)
    })
  }),

  // Crisis override configuration
  crisisOverride: z.object({
    enableCrisisOverride: z.boolean().default(true),
    automaticActivation: z.boolean().default(true),
    defaultDurationMinutes: z.number().default(60),
    maxDurationHours: z.number().default(24),

    // Crisis detection thresholds
    crisisThresholds: z.object({
      phq9Threshold: z.number().default(20),
      gad7Threshold: z.number().default(15),
      manualTriggerEnabled: z.boolean().default(true)
    })
  }),

  // Grace period configuration
  gracePeriod: z.object({
    enableGracePeriods: z.boolean().default(true),
    defaultDurationDays: z.number().default(7),
    maxExtensions: z.number().default(2),
    therapeuticContinuityProtection: z.boolean().default(true)
  }),

  // Revenue protection configuration
  revenueProtection: z.object({
    enableChurnPrevention: z.boolean().default(true),
    retentionOfferEnabled: z.boolean().default(true),
    revenueTrackingEnabled: z.boolean().default(true),

    // Churn risk thresholds
    churnRiskThresholds: z.object({
      lowRisk: z.number().default(25),    // 25%
      mediumRisk: z.number().default(50), // 50%
      highRisk: z.number().default(75)    // 75%
    })
  }),

  // Performance configuration
  performance: z.object({
    quotaValidationMaxTime: z.number().default(50), // milliseconds
    paymentValidationMaxTime: z.number().default(100), // milliseconds
    crisisOverrideActivationMaxTime: z.number().default(200), // milliseconds
    gracePeriodActivationMaxTime: z.number().default(500) // milliseconds
  })
});

export type PaymentAwareSyncConfig = z.infer<typeof PaymentAwareSyncConfigSchema>;

/**
 * Constants and performance requirements
 */
export const PAYMENT_SYNC_CONSTANTS = {
  // Performance requirements
  QUOTA_VALIDATION_MAX_TIME: 50, // milliseconds
  PAYMENT_VALIDATION_MAX_TIME: 100, // milliseconds
  CRISIS_OVERRIDE_ACTIVATION_MAX_TIME: 200, // milliseconds

  // Default quotas by tier
  DEFAULT_QUOTAS: {
    free: {
      operationsPerHour: 100,
      dataTransferMB: 10,
      features: ['basic_sync', 'crisis_data_sync']
    },
    premium: {
      operationsPerHour: 1000,
      dataTransferMB: 100,
      features: ['basic_sync', 'real_time_sync', 'cross_device_sync', 'crisis_data_sync']
    },
    family: {
      operationsPerHour: 2000,
      dataTransferMB: 500,
      features: ['basic_sync', 'real_time_sync', 'cross_device_sync', 'crisis_data_sync', 'family_data_sharing']
    },
    enterprise: {
      operationsPerHour: 10000,
      dataTransferMB: 1000,
      features: ['basic_sync', 'real_time_sync', 'cross_device_sync', 'crisis_data_sync', 'family_data_sharing', 'enterprise_analytics_sync']
    }
  },

  // Crisis override limits
  CRISIS_OVERRIDE: {
    DEFAULT_DURATION_MINUTES: 60,
    MAX_DURATION_HOURS: 24,
    MAX_EXTENSIONS: 3,
    ACTIVATION_DELAY_MAX: 200 // milliseconds
  },

  // Grace period defaults
  GRACE_PERIOD: {
    DEFAULT_DURATION_DAYS: 7,
    MAX_EXTENSIONS: 2,
    MAX_TOTAL_DAYS: 14,
    THERAPEUTIC_ACCESS_MAINTAINED: true
  },

  // Revenue thresholds
  REVENUE_THRESHOLDS: {
    CHURN_RISK_LOW: 25,    // percentage
    CHURN_RISK_MEDIUM: 50, // percentage
    CHURN_RISK_HIGH: 75,   // percentage
    LIFETIME_VALUE_THRESHOLD: 1000 // dollars
  }
} as const;

/**
 * Type guards for payment-aware sync types
 */
export const isSyncQuotaManagement = (value: unknown): value is SyncQuotaManagement => {
  try {
    SyncQuotaManagementSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isCrisisPaymentOverride = (value: unknown): value is CrisisPaymentOverride => {
  try {
    CrisisPaymentOverrideSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isGracePeriodManagement = (value: unknown): value is GracePeriodManagement => {
  try {
    GracePeriodManagementSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Export schemas for runtime validation
 */
export default {
  SyncQuotaManagementSchema,
  PaymentSyncIntegrationSchema,
  CrisisPaymentOverrideSchema,
  GracePeriodManagementSchema,
  PaymentAwareSyncConfigSchema,

  // Type guards
  isSyncQuotaManagement,
  isCrisisPaymentOverride,
  isGracePeriodManagement,

  // Constants
  PAYMENT_SYNC_CONSTANTS
};