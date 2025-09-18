/**
 * Crisis Safety Integration Type Definitions
 * P0-CLOUD Platform Infrastructure - TypeScript Implementation
 *
 * Comprehensive crisis safety types for:
 * - Emergency escalation with <200ms response validation
 * - Crisis detection with clinical accuracy preservation
 * - Safety protocol enforcement with therapeutic continuity
 * - Emergency data access with privacy protection
 * - Crisis intervention coordination across devices
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
} from '../orchestration/sync-orchestration-types';
import type {
  ConflictDescriptor
} from '../orchestration/conflict-resolution-types';
import type {
  PerformanceMetric
} from '../orchestration/performance-monitoring-types';

/**
 * CRISIS DETECTION AND CLASSIFICATION
 */

/**
 * Crisis severity levels with clinical mapping
 */
export const CrisisSeveritySchema = z.enum([
  'none',        // No crisis detected
  'low',         // Elevated scores, monitoring recommended
  'moderate',    // Concerning scores, intervention recommended
  'high',        // Dangerous scores, immediate intervention required
  'emergency'    // Life-threatening, emergency services may be needed
]);

export type CrisisSeverity = z.infer<typeof CrisisSeveritySchema>;

/**
 * Crisis detection source and triggers
 */
export const CrisisDetectionSourceSchema = z.enum([
  'phq9_assessment',        // PHQ-9 scores ≥20
  'gad7_assessment',        // GAD-7 scores ≥15
  'manual_crisis_button',   // User activated crisis button
  'behavioral_pattern',     // ML detected behavioral crisis indicators
  'check_in_responses',     // Crisis-indicating check-in responses
  'therapeutic_session',    // Crisis detected during session
  'cross_device_alert',     // Crisis alert from another device
  'emergency_contact',      // Emergency contact activation
  'clinical_escalation',    // Healthcare provider escalation
  'system_anomaly'          // System detected anomalous crisis patterns
]);

export type CrisisDetectionSource = z.infer<typeof CrisisDetectionSourceSchema>;

/**
 * Comprehensive crisis event with clinical context
 */
export const CrisisEventSchema = z.object({
  // Crisis identification
  crisisId: z.string(),
  userId: z.string(),
  deviceId: z.string(),
  sessionId: z.string().optional(),

  // Crisis detection
  detection: z.object({
    detectedAt: z.string(), // ISO timestamp
    detectionSource: CrisisDetectionSourceSchema,
    detectionMethod: z.enum(['automatic', 'manual', 'clinical', 'emergency']),
    detectionConfidence: z.number().min(0).max(1), // 0-1 confidence score

    // Detection data
    detectionData: z.object({
      // Assessment scores (if applicable)
      phq9Score: z.number().min(0).max(27).optional(),
      gad7Score: z.number().min(0).max(21).optional(),
      customAssessmentScores: z.record(z.string(), z.number()).optional(),

      // User inputs
      userReportedSeverity: z.number().min(1).max(10).optional(),
      userDescriptionText: z.string().optional(),
      crisisButtonPressed: z.boolean(),

      // Behavioral indicators
      behavioralIndicators: z.array(z.enum([
        'sudden_mood_drop',
        'isolation_behavior',
        'sleep_disruption',
        'appetite_changes',
        'anxiety_spike',
        'panic_symptoms',
        'self_harm_indicators',
        'suicidal_ideation'
      ])).optional(),

      // Clinical context
      clinicalContext: z.object({
        priorCrisisHistory: z.boolean(),
        currentMedications: z.array(z.string()).optional(),
        recentLifeEvents: z.array(z.string()).optional(),
        supportSystemAvailability: z.enum(['strong', 'moderate', 'weak', 'none']).optional()
      }).optional()
    })
  }),

  // Crisis classification
  classification: z.object({
    severity: CrisisSeveritySchema,
    crisisType: z.enum([
      'suicidal_ideation',
      'self_harm_risk',
      'severe_depression',
      'panic_disorder',
      'anxiety_crisis',
      'psychotic_symptoms',
      'substance_abuse_crisis',
      'trauma_response',
      'grief_crisis',
      'general_mental_health_emergency'
    ]),

    // Risk assessment
    riskAssessment: z.object({
      immediateSafetyRisk: z.enum(['none', 'low', 'moderate', 'high', 'critical']),
      selfHarmRisk: z.enum(['none', 'low', 'moderate', 'high', 'critical']),
      suicidalRisk: z.enum(['none', 'low', 'moderate', 'high', 'critical']),
      impulsivityRisk: z.enum(['none', 'low', 'moderate', 'high', 'critical']),

      // Risk factors
      riskFactors: z.array(z.enum([
        'previous_attempts',
        'specific_plan',
        'means_available',
        'social_isolation',
        'substance_use',
        'psychotic_symptoms',
        'recent_loss',
        'chronic_illness',
        'financial_stress'
      ])).optional(),

      // Protective factors
      protectiveFactors: z.array(z.enum([
        'strong_social_support',
        'religious_beliefs',
        'responsibility_to_others',
        'future_orientation',
        'problem_solving_skills',
        'help_seeking_behavior',
        'therapeutic_relationship'
      ])).optional()
    }),

    // Clinical urgency
    clinicalUrgency: z.object({
      requiresImmediateIntervention: z.boolean(),
      emergencyServicesRecommended: z.boolean(),
      hospitalAssessmentNeeded: z.boolean(),
      clinicalFollowUpRequired: z.boolean(),
      timeToIntervention: z.number().optional() // minutes
    })
  }),

  // Crisis response
  response: z.object({
    // Response timeline
    responseStarted: z.string(), // ISO timestamp
    responseCompleted: z.string().optional(), // ISO timestamp
    responseTime: z.number().optional(), // milliseconds

    // Response actions taken
    actionsPerformed: z.array(z.enum([
      'crisis_protocol_activated',
      'safety_plan_displayed',
      'emergency_contacts_notified',
      'breathing_exercise_provided',
      'crisis_resources_shown',
      'hotline_integration_activated',
      'emergency_services_contacted',
      'crisis_data_preserved',
      'therapeutic_content_prioritized',
      'subscription_override_activated',
      'cross_device_alert_sent'
    ])),

    // Emergency contacts engaged
    emergencyContactsEngaged: z.array(z.object({
      contactId: z.string(),
      contactType: z.enum(['emergency_contact', 'therapist', 'family', 'friend', 'crisis_line']),
      contactMethod: z.enum(['phone', 'sms', 'email', 'app_notification']),
      contactTime: z.string(), // ISO timestamp
      contactSuccessful: z.boolean(),
      responseReceived: z.boolean()
    })).optional(),

    // Crisis intervention tools used
    interventionTools: z.array(z.object({
      toolType: z.enum([
        'breathing_exercise',
        'grounding_technique',
        'safety_plan_review',
        'coping_strategies',
        'distraction_techniques',
        'mindfulness_exercise',
        'crisis_chat_support',
        'hotline_connection'
      ]),
      toolId: z.string(),
      usedAt: z.string(), // ISO timestamp
      duration: z.number().optional(), // seconds
      effectiveness: z.enum(['very_helpful', 'somewhat_helpful', 'not_helpful', 'unknown']).optional()
    })).optional(),

    // Crisis resources provided
    resourcesProvided: z.array(z.object({
      resourceType: z.enum([
        'crisis_hotline_numbers',
        'emergency_services_info',
        'local_crisis_centers',
        'online_crisis_support',
        'safety_planning_tools',
        'therapeutic_resources',
        'support_group_info'
      ]),
      resourceId: z.string(),
      providedAt: z.string(), // ISO timestamp
      accessed: z.boolean(),
      accessTime: z.string().optional() // ISO timestamp
    })).optional()
  }),

  // Performance validation (critical for crisis)
  performance: z.object({
    // Response time validation
    responseTimeValidation: z.object({
      targetResponseTime: z.number().default(200), // milliseconds
      actualResponseTime: z.number(),
      responseTimeMetric: z.boolean(), // true if within target
      responseTimeViolation: z.boolean(),

      // Performance breakdown
      detectionTime: z.number(), // milliseconds
      classificationTime: z.number(), // milliseconds
      responseInitiationTime: z.number(), // milliseconds
      totalProcessingTime: z.number() // milliseconds
    }),

    // System performance during crisis
    systemPerformance: z.object({
      systemLoadDuringCrisis: z.number().min(0).max(100), // percentage
      memoryUsageDuringCrisis: z.number(), // MB
      networkLatencyDuringCrisis: z.number(), // milliseconds
      anyPerformanceDegradation: z.boolean(),
      fallbacksActivated: z.boolean()
    }),

    // Quality metrics
    qualityMetrics: z.object({
      dataIntegrityMaintained: z.boolean(),
      noDataLossDuringCrisis: z.boolean(),
      therapeuticContinuityPreserved: z.boolean(),
      userExperienceQuality: z.enum(['excellent', 'good', 'acceptable', 'poor']),
      clinicalAccuracyMaintained: z.boolean()
    })
  }),

  // Crisis resolution
  resolution: z.object({
    // Resolution status
    status: z.enum([
      'active',           // Crisis still active
      'stabilizing',      // User stabilizing, monitoring continues
      'resolved',         // Crisis resolved, user safe
      'escalated',        // Escalated to higher level of care
      'transferred',      // Transferred to emergency services
      'deferred'          // Resolution deferred to clinical team
    ]),

    resolvedAt: z.string().optional(), // ISO timestamp
    resolutionDuration: z.number().optional(), // minutes

    // Resolution outcome
    outcome: z.object({
      userStabilized: z.boolean().optional(),
      safetyPlanUpdated: z.boolean().optional(),
      emergencyServicesEngaged: z.boolean().optional(),
      clinicalReferralMade: z.boolean().optional(),
      followUpScheduled: z.boolean().optional(),

      // Resolution effectiveness
      interventionEffectiveness: z.enum([
        'highly_effective',
        'effective',
        'somewhat_effective',
        'not_effective',
        'unknown'
      ]).optional(),

      // User feedback on crisis response
      userFeedback: z.object({
        helpfulnessRating: z.number().min(1).max(5).optional(),
        responseTimeSatisfaction: z.number().min(1).max(5).optional(),
        overallSatisfaction: z.number().min(1).max(5).optional(),
        improvementSuggestions: z.string().optional()
      }).optional()
    }),

    // Post-crisis actions
    postCrisisActions: z.array(z.enum([
      'update_crisis_plan',
      'schedule_clinical_follow_up',
      'notify_support_network',
      'provide_crisis_resources',
      'update_risk_assessment',
      'modify_therapeutic_plan',
      'increase_monitoring_frequency'
    ])).optional()
  }),

  // Privacy and compliance
  privacy: z.object({
    // Data sharing permissions
    dataSharing: z.object({
      emergencyContactDataSharing: z.boolean(),
      clinicalTeamDataSharing: z.boolean(),
      emergencyServicesDataSharing: z.boolean(),
      familyDataSharing: z.boolean(),

      // What data was shared
      sharedDataTypes: z.array(z.enum([
        'crisis_severity',
        'assessment_scores',
        'emergency_contacts',
        'safety_plan',
        'current_medications',
        'crisis_history',
        'intervention_response'
      ])).optional()
    }),

    // Consent and authorization
    consent: z.object({
      emergencyConsentActive: z.boolean(),
      dataSharingConsent: z.boolean(),
      clinicalConsentActive: z.boolean(),
      consentTimestamp: z.string().optional(), // ISO timestamp

      // Consent limitations
      consentLimitations: z.array(z.string()).optional(),
      consentExpirationTime: z.string().optional() // ISO timestamp
    }),

    // Audit and compliance
    audit: z.object({
      auditTrailComplete: z.boolean(),
      hipaaCompliant: z.boolean(),
      dataMinimizationApplied: z.boolean(),
      retentionPolicyApplied: z.boolean(),

      // Audit entries
      auditEntries: z.array(z.object({
        action: z.string(),
        timestamp: z.string(),
        actor: z.enum(['system', 'user', 'emergency_contact', 'clinical_staff']),
        dataAccessed: z.array(z.string()),
        justification: z.string()
      }))
    })
  })
});

export type CrisisEvent = z.infer<typeof CrisisEventSchema>;

/**
 * EMERGENCY ESCALATION SYSTEM
 */

/**
 * Emergency escalation with response protocol
 */
export const EmergencyEscalationSchema = z.object({
  // Escalation identification
  escalationId: z.string(),
  crisisId: z.string(),
  userId: z.string(),
  triggeredAt: z.string(), // ISO timestamp

  // Escalation trigger
  trigger: z.object({
    triggerReason: z.enum([
      'crisis_severity_critical',
      'user_unresponsive',
      'self_harm_imminent',
      'suicidal_plan_active',
      'emergency_contact_request',
      'clinical_team_escalation',
      'system_alert_critical',
      'user_requested_emergency'
    ]),

    triggerData: z.object({
      crisisSeverity: CrisisSeveritySchema,
      riskLevel: z.enum(['none', 'low', 'moderate', 'high', 'critical']),
      userResponseStatus: z.enum(['responsive', 'partially_responsive', 'unresponsive']),
      timeToResponse: z.number(), // milliseconds since crisis detection
      automaticEscalation: z.boolean(),
      manualEscalationRequested: z.boolean()
    })
  }),

  // Escalation actions
  actions: z.object({
    // Immediate actions
    immediateActions: z.array(z.enum([
      'activate_emergency_protocols',
      'notify_emergency_contacts',
      'display_crisis_hotlines',
      'provide_immediate_resources',
      'preserve_all_crisis_data',
      'enable_emergency_data_access',
      'activate_location_sharing',
      'initiate_emergency_communication'
    ])),

    // Communication actions
    communicationActions: z.array(z.object({
      actionType: z.enum([
        'emergency_contact_notification',
        'crisis_hotline_connection',
        'emergency_services_notification',
        'clinical_team_notification',
        'family_notification',
        'support_network_alert'
      ]),
      recipientType: z.enum(['emergency_contact', 'crisis_hotline', 'emergency_services', 'clinical_team', 'family']),
      communicationMethod: z.enum(['phone_call', 'sms', 'email', 'push_notification', 'automated_call']),

      // Communication details
      initiated: z.boolean(),
      initiatedAt: z.string().optional(), // ISO timestamp
      successful: z.boolean().optional(),
      responseReceived: z.boolean().optional(),
      responseTime: z.number().optional(), // seconds
      followUpRequired: z.boolean()
    })),

    // Data and resource actions
    dataActions: z.array(z.enum([
      'preserve_crisis_session_data',
      'backup_crisis_plan',
      'share_location_data',
      'provide_medical_information',
      'share_emergency_contacts',
      'provide_crisis_history',
      'enable_remote_access'
    ])),

    // System actions
    systemActions: z.array(z.enum([
      'prioritize_crisis_operations',
      'allocate_emergency_resources',
      'bypass_normal_quotas',
      'activate_crisis_mode_globally',
      'enable_emergency_overrides',
      'escalate_system_monitoring'
    ]))
  }),

  // Escalation timeline
  timeline: z.object({
    escalationStarted: z.string(), // ISO timestamp
    firstActionCompleted: z.string().optional(), // ISO timestamp
    firstResponseReceived: z.string().optional(), // ISO timestamp
    escalationResolved: z.string().optional(), // ISO timestamp

    // Performance requirements
    targetFirstActionTime: z.number().default(30), // seconds
    actualFirstActionTime: z.number().optional(), // seconds
    performanceTarget: z.boolean().optional(), // whether target was met

    // Timeline milestones
    milestones: z.array(z.object({
      milestone: z.string(),
      targetTime: z.number(), // seconds from escalation start
      actualTime: z.number().optional(), // seconds from escalation start
      completed: z.boolean(),
      notes: z.string().optional()
    }))
  }),

  // Emergency resources coordinated
  resourcesCoordinated: z.object({
    // Emergency contacts
    emergencyContacts: z.array(z.object({
      contactId: z.string(),
      contactType: z.enum(['primary', 'secondary', 'professional', 'family']),
      contacted: z.boolean(),
      contactMethod: z.string(),
      responseStatus: z.enum(['no_response', 'acknowledged', 'en_route', 'arrived']),
      estimatedArrival: z.string().optional() // ISO timestamp
    })),

    // Professional resources
    professionalResources: z.array(z.object({
      resourceType: z.enum(['crisis_hotline', 'emergency_services', 'mental_health_professional', 'hospital', 'crisis_center']),
      resourceId: z.string(),
      contacted: z.boolean(),
      responseTime: z.number().optional(), // seconds
      availability: z.enum(['available', 'busy', 'unavailable', 'en_route'])
    })),

    // Digital resources
    digitalResources: z.array(z.object({
      resourceType: z.enum(['crisis_chat', 'video_call', 'text_support', 'app_intervention', 'online_resources']),
      resourceId: z.string(),
      activated: z.boolean(),
      userEngagement: z.enum(['high', 'medium', 'low', 'none']).optional()
    }))
  }),

  // Escalation outcome
  outcome: z.object({
    status: z.enum([
      'in_progress',           // Escalation ongoing
      'resources_mobilized',   // Help is on the way
      'intervention_active',   // Active intervention in progress
      'crisis_stabilized',     // Crisis resolved through escalation
      'transferred_to_care',   // User transferred to professional care
      'false_alarm',          // Escalation was not needed
      'user_declined_help'    // User refused emergency assistance
    ]),

    // Outcome details
    outcomeDetails: z.object({
      userSafety: z.enum(['safe', 'safety_plan_active', 'professional_care', 'hospitalized', 'unknown']),
      interventionEffectiveness: z.enum(['highly_effective', 'effective', 'somewhat_effective', 'not_effective']).optional(),
      emergencyServicesEngaged: z.boolean(),
      professionalCareTransfer: z.boolean(),
      followUpPlanEstablished: z.boolean()
    }),

    // Performance assessment
    performanceAssessment: z.object({
      escalationTimeliness: z.enum(['excellent', 'good', 'acceptable', 'poor']),
      communicationEffectiveness: z.enum(['excellent', 'good', 'acceptable', 'poor']),
      resourceCoordination: z.enum(['excellent', 'good', 'acceptable', 'poor']),
      overallEffectiveness: z.enum(['excellent', 'good', 'acceptable', 'poor']),

      // Lessons learned
      lessonsLearned: z.array(z.string()).optional(),
      improvementOpportunities: z.array(z.string()).optional()
    })
  })
});

export type EmergencyEscalation = z.infer<typeof EmergencyEscalationSchema>;

/**
 * SAFETY PROTOCOL ENFORCEMENT
 */

/**
 * Safety protocol with therapeutic continuity
 */
export const SafetyProtocolSchema = z.object({
  // Protocol identification
  protocolId: z.string(),
  protocolName: z.string(),
  protocolVersion: z.string(),

  // Protocol activation
  activation: z.object({
    activatedBy: z.enum(['automatic_detection', 'manual_trigger', 'clinical_team', 'emergency_contact']),
    activatedAt: z.string(), // ISO timestamp
    activationReason: z.string(),
    crisisSeverity: CrisisSeveritySchema,

    // Activation context
    activationContext: z.object({
      userId: z.string(),
      deviceId: z.string(),
      sessionId: z.string().optional(),
      locationContext: z.string().optional(), // General location context, not specific location
      timeOfDay: z.enum(['morning', 'afternoon', 'evening', 'night']),
      dayOfWeek: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    })
  }),

  // Protocol steps and procedures
  procedures: z.object({
    // Immediate safety procedures (0-5 minutes)
    immediateProcedures: z.array(z.object({
      procedureId: z.string(),
      description: z.string(),
      timeframe: z.string(), // e.g., "immediate", "within 1 minute"
      required: z.boolean(),
      automated: z.boolean(),

      // Execution tracking
      execution: z.object({
        started: z.boolean(),
        startedAt: z.string().optional(), // ISO timestamp
        completed: z.boolean(),
        completedAt: z.string().optional(), // ISO timestamp
        executionTime: z.number().optional(), // milliseconds
        successful: z.boolean().optional(),
        notes: z.string().optional()
      })
    })),

    // Short-term procedures (5-30 minutes)
    shortTermProcedures: z.array(z.object({
      procedureId: z.string(),
      description: z.string(),
      timeframe: z.string(),
      dependsOn: z.array(z.string()).optional(), // Dependent procedure IDs

      // Execution tracking
      execution: z.object({
        started: z.boolean(),
        startedAt: z.string().optional(),
        completed: z.boolean(),
        completedAt: z.string().optional(),
        successful: z.boolean().optional(),
        skippedReason: z.string().optional()
      })
    })),

    // Follow-up procedures (30+ minutes)
    followUpProcedures: z.array(z.object({
      procedureId: z.string(),
      description: z.string(),
      timeframe: z.string(),
      responsibleParty: z.enum(['system', 'user', 'emergency_contact', 'clinical_team']),

      // Scheduling and execution
      execution: z.object({
        scheduledFor: z.string().optional(), // ISO timestamp
        started: z.boolean(),
        completed: z.boolean(),
        dueDate: z.string().optional(), // ISO timestamp
        overdue: z.boolean()
      })
    }))
  }),

  // Therapeutic continuity protection
  therapeuticContinuity: z.object({
    // Session preservation
    sessionPreservation: z.object({
      preserveActiveSession: z.boolean(),
      sessionId: z.string().optional(),
      sessionData: z.record(z.string(), z.unknown()).optional(),
      preservationMethod: z.enum(['memory_cache', 'secure_storage', 'encrypted_backup']).optional()
    }),

    // Data protection
    dataProtection: z.object({
      protectCrisisData: z.boolean(),
      protectAssessmentData: z.boolean(),
      protectTherapeuticProgress: z.boolean(),
      protectPersonalPreferences: z.boolean(),

      // Protection methods
      protectionMethods: z.array(z.enum([
        'automatic_backup',
        'cross_device_sync',
        'secure_encryption',
        'redundant_storage',
        'emergency_access_codes'
      ]))
    }),

    // Service continuity
    serviceContinuity: z.object({
      maintainCrisisAccess: z.boolean(),
      maintainAssessmentAccess: z.boolean(),
      maintainTherapeuticContent: z.boolean(),
      maintainEmergencyFeatures: z.boolean(),

      // Continuity measures
      continuityMeasures: z.array(z.enum([
        'bypass_subscription_limits',
        'priority_resource_allocation',
        'emergency_feature_unlock',
        'cross_platform_access',
        'offline_mode_enhancement'
      ]))
    })
  }),

  // Protocol effectiveness tracking
  effectiveness: z.object({
    // Immediate effectiveness (0-5 minutes)
    immediateEffectiveness: z.object({
      userResponseImproved: z.boolean().optional(),
      crisisSeverityReduced: z.boolean().optional(),
      safetyIncreased: z.boolean().optional(),
      userEngagement: z.enum(['high', 'medium', 'low', 'none']).optional()
    }),

    // Short-term effectiveness (5-60 minutes)
    shortTermEffectiveness: z.object({
      stabilizationAchieved: z.boolean().optional(),
      riskReduction: z.enum(['significant', 'moderate', 'minimal', 'none']).optional(),
      supportSystemActivated: z.boolean().optional(),
      professionalResourcesEngaged: z.boolean().optional()
    }),

    // Follow-up effectiveness (1+ hours)
    followUpEffectiveness: z.object({
      sustainedImprovement: z.boolean().optional(),
      crisisResolution: z.boolean().optional(),
      safetyPlanUpdated: z.boolean().optional(),
      therapeuticContinuity: z.boolean().optional()
    }),

    // Overall protocol assessment
    overallAssessment: z.object({
      protocolSuccess: z.enum(['highly_successful', 'successful', 'partially_successful', 'unsuccessful']).optional(),
      userSatisfaction: z.number().min(1).max(5).optional(),
      clinicalOutcome: z.enum(['excellent', 'good', 'acceptable', 'poor']).optional(),
      wouldRecommend: z.boolean().optional()
    })
  }),

  // Protocol completion
  completion: z.object({
    status: z.enum(['active', 'completed', 'transferred', 'escalated', 'discontinued']),
    completedAt: z.string().optional(), // ISO timestamp
    completionReason: z.string().optional(),

    // Completion summary
    summary: z.object({
      totalDuration: z.number().optional(), // minutes
      proceduresCompleted: z.number(),
      proceduresSkipped: z.number(),
      emergencyServicesEngaged: z.boolean(),
      professionalReferralMade: z.boolean(),
      followUpScheduled: z.boolean()
    }),

    // Post-protocol actions
    postProtocolActions: z.array(z.enum([
      'update_crisis_plan',
      'schedule_clinical_review',
      'modify_safety_protocols',
      'update_emergency_contacts',
      'provide_additional_resources',
      'increase_monitoring_frequency',
      'adjust_therapeutic_plan'
    ])).optional()
  })
});

export type SafetyProtocol = z.infer<typeof SafetyProtocolSchema>;

/**
 * EMERGENCY DATA ACCESS SYSTEM
 */

/**
 * Emergency data access with privacy protection
 */
export const EmergencyDataAccessSchema = z.object({
  // Access request identification
  accessRequestId: z.string(),
  crisisId: z.string(),
  userId: z.string(),
  requestedBy: z.enum(['emergency_contact', 'clinical_team', 'emergency_services', 'system_automatic']),

  // Access authorization
  authorization: z.object({
    authorizedAt: z.string(), // ISO timestamp
    authorizationMethod: z.enum(['user_consent', 'emergency_override', 'clinical_authorization', 'legal_authorization']),
    authorizingParty: z.string(), // ID of authorizing entity

    // Authorization scope
    scope: z.object({
      dataTypesAuthorized: z.array(z.enum([
        'crisis_assessment_scores',
        'crisis_plan_data',
        'emergency_contact_information',
        'current_mood_state',
        'recent_check_ins',
        'therapeutic_progress',
        'medication_information',
        'support_system_data',
        'crisis_history',
        'location_information'
      ])),

      // Temporal scope
      timeScope: z.object({
        accessStartTime: z.string(), // ISO timestamp
        accessEndTime: z.string(), // ISO timestamp
        maxAccessDuration: z.number(), // minutes
        extensionsAllowed: z.boolean()
      }),

      // Purpose limitation
      purposeLimitation: z.array(z.enum([
        'immediate_crisis_response',
        'safety_assessment',
        'resource_coordination',
        'clinical_consultation',
        'emergency_services_coordination',
        'family_notification',
        'therapeutic_planning'
      ]))
    }),

    // Access restrictions
    restrictions: z.object({
      dataMinimization: z.boolean(), // Only provide necessary data
      purposeLimitation: z.boolean(), // Only for stated purposes
      timeboxed: z.boolean(), // Limited time access
      auditRequired: z.boolean(), // All access must be audited

      // Specific restrictions
      specificRestrictions: z.array(z.string()).optional(),
      prohibitedUses: z.array(z.string()).optional()
    })
  }),

  // Data access details
  dataAccess: z.object({
    // Data accessed
    dataAccessed: z.array(z.object({
      dataType: z.string(),
      dataId: z.string(),
      accessedAt: z.string(), // ISO timestamp
      accessedBy: z.string(), // User/system ID
      accessMethod: z.enum(['api_call', 'direct_access', 'export', 'view_only']),
      accessPurpose: z.string(),

      // Data content (high-level, not actual data)
      dataDescription: z.string(),
      dataSensitivity: z.enum(['public', 'internal', 'confidential', 'restricted']),
      privacyImpact: z.enum(['none', 'low', 'medium', 'high', 'critical'])
    })),

    // Access patterns
    accessPatterns: z.object({
      totalDataAccessed: z.number(), // Number of data points
      accessFrequency: z.number(), // Accesses per hour
      peakAccessTime: z.string().optional(), // ISO timestamp
      mostAccessedDataType: z.string().optional(),

      // Unusual access patterns
      unusualPatterns: z.array(z.string()).optional(),
      potentialPrivacyConcerns: z.array(z.string()).optional()
    })
  }),

  // Privacy protection measures
  privacyProtection: z.object({
    // Data minimization
    dataMinimization: z.object({
      applied: z.boolean(),
      originalDataSize: z.number(), // bytes
      minimizedDataSize: z.number(), // bytes
      reductionPercentage: z.number(), // percentage
      minimizationMethods: z.array(z.enum([
        'field_filtering',
        'aggregation',
        'pseudonymization',
        'generalization',
        'suppression'
      ]))
    }),

    // Encryption and security
    security: z.object({
      dataEncrypted: z.boolean(),
      encryptionMethod: z.string().optional(),
      accessLogEncrypted: z.boolean(),
      secureTransmission: z.boolean(),

      // Access controls
      accessControls: z.array(z.enum([
        'multi_factor_authentication',
        'role_based_access',
        'time_based_access',
        'location_verification',
        'device_verification'
      ]))
    }),

    // Consent and notification
    consentAndNotification: z.object({
      userNotified: z.boolean(),
      notificationMethod: z.array(z.enum(['sms', 'email', 'app_notification', 'phone_call'])).optional(),
      notificationTime: z.string().optional(), // ISO timestamp

      // Consent status
      consentStatus: z.enum(['explicit_consent', 'implied_consent', 'emergency_override', 'legal_basis']),
      consentTimestamp: z.string().optional(), // ISO timestamp
      consentLimitations: z.array(z.string()).optional()
    })
  }),

  // Access audit trail
  auditTrail: z.object({
    // Comprehensive audit log
    auditEntries: z.array(z.object({
      entryId: z.string(),
      timestamp: z.string(),
      actor: z.string(), // Who accessed
      action: z.string(), // What was done
      resource: z.string(), // What was accessed
      outcome: z.enum(['success', 'failure', 'partial']),

      // Context information
      context: z.object({
        accessReason: z.string(),
        emergencyJustification: z.string().optional(),
        clinicalNecessity: z.string().optional(),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
        deviceId: z.string().optional()
      }),

      // Privacy impact
      privacyImpact: z.object({
        sensitiveDataAccessed: z.boolean(),
        dataShared: z.boolean(),
        thirdPartyAccess: z.boolean(),
        retentionImplications: z.boolean()
      })
    })),

    // Audit summary
    auditSummary: z.object({
      totalAuditEntries: z.number(),
      accessorsCount: z.number(),
      dataTypesAccessedCount: z.number(),
      timeSpanMinutes: z.number(),

      // Compliance assessment
      complianceAssessment: z.object({
        hipaaCompliant: z.boolean(),
        gdprCompliant: z.boolean(),
        purposeLimitationRespected: z.boolean(),
        dataMinimizationApplied: z.boolean(),
        auditTrailComplete: z.boolean()
      })
    })
  }),

  // Access termination
  termination: z.object({
    terminatedAt: z.string().optional(), // ISO timestamp
    terminationReason: z.enum([
      'crisis_resolved',
      'time_expired',
      'access_no_longer_needed',
      'user_revoked_consent',
      'clinical_determination',
      'privacy_concern',
      'system_error'
    ]).optional(),

    // Termination actions
    terminationActions: z.array(z.enum([
      'revoke_access_tokens',
      'purge_cached_data',
      'notify_all_accessors',
      'update_audit_logs',
      'notify_user',
      'generate_access_report'
    ])).optional(),

    // Post-termination requirements
    postTerminationRequirements: z.object({
      dataRetentionRequired: z.boolean(),
      auditLogRetention: z.boolean(),
      reportGeneration: z.boolean(),
      userNotification: z.boolean(),
      complianceReview: z.boolean()
    })
  })
});

export type EmergencyDataAccess = z.infer<typeof EmergencyDataAccessSchema>;

/**
 * CRISIS SAFETY SERVICE INTERFACE
 */

/**
 * Crisis safety service state
 */
export interface CrisisSafetyState {
  // Active crisis management
  readonly activeCrises: Map<string, CrisisEvent>;
  readonly activeEscalations: Map<string, EmergencyEscalation>;
  readonly activeSafetyProtocols: Map<string, SafetyProtocol>;
  readonly activeDataAccess: Map<string, EmergencyDataAccess>;

  // System status
  readonly systemStatus: {
    readonly crisisModeActive: boolean;
    readonly emergencyProtocolsEnabled: boolean;
    readonly averageResponseTime: number; // milliseconds
    readonly crisisDetectionAccuracy: number; // 0-100 percentage
  };

  // Performance metrics
  readonly performance: {
    readonly crisisResponseTimes: number[]; // Recent response times in milliseconds
    readonly responseTimeViolations: number; // Count of >200ms responses
    readonly crisisResolutionRate: number; // 0-100 percentage
    readonly emergencyEscalationRate: number; // 0-100 percentage
  };
}

/**
 * Crisis safety service actions
 */
export interface CrisisSafetyActions {
  // Crisis detection and management
  detectCrisis: (userId: string, detectionData: unknown) => Promise<CrisisEvent | null>;
  classifyCrisis: (crisisEvent: CrisisEvent) => Promise<CrisisEvent>;
  activateCrisisProtocol: (crisisId: string) => Promise<SafetyProtocol>;

  // Emergency escalation
  escalateToEmergency: (crisisId: string, escalationReason: string) => Promise<EmergencyEscalation>;
  notifyEmergencyContacts: (crisisId: string) => Promise<void>;
  coordinateEmergencyResources: (escalationId: string) => Promise<void>;

  // Data access management
  authorizeEmergencyDataAccess: (crisisId: string, requester: string, scope: string[]) => Promise<EmergencyDataAccess>;
  revokeEmergencyDataAccess: (accessId: string, reason: string) => Promise<void>;
  auditDataAccess: (accessId: string) => Promise<unknown>;

  // Performance validation
  validateCrisisResponseTime: (crisisId: string, responseTime: number) => boolean;
  measureSystemPerformance: () => Promise<PerformanceMetric[]>;
  generateCrisisReport: (startDate: string, endDate: string) => Promise<unknown>;
}

/**
 * Complete crisis safety service interface
 */
export interface CrisisSafetyService extends CrisisSafetyState, CrisisSafetyActions {
  // Service lifecycle
  initialize: (config: CrisisSafetyConfig) => Promise<void>;
  shutdown: () => Promise<void>;

  // Crisis-safe operation execution
  executeCrisisSafeOperation: <T>(
    operation: SyncOperation,
    executor: () => Promise<T>,
    emergencyFallback: T
  ) => Promise<T>;
}

/**
 * CONFIGURATION AND CONSTANTS
 */

/**
 * Crisis safety configuration
 */
export const CrisisSafetyConfigSchema = z.object({
  // Service identification
  serviceId: z.string(),
  version: z.string(),
  environment: z.enum(['development', 'staging', 'production']),

  // Crisis detection configuration
  detection: z.object({
    enableAutomaticDetection: z.boolean().default(true),
    phq9CrisisThreshold: z.number().default(20),
    gad7CrisisThreshold: z.number().default(15),
    behavioralDetectionEnabled: z.boolean().default(true),

    // Detection sensitivity
    detectionSensitivity: z.enum(['high', 'medium', 'low']).default('medium'),
    falsePositiveTolerance: z.number().min(0).max(1).default(0.1) // 10%
  }),

  // Response time requirements
  responseTime: z.object({
    crisisMaxResponseTime: z.number().default(200), // milliseconds
    escalationMaxResponseTime: z.number().default(30000), // 30 seconds
    emergencyContactMaxTime: z.number().default(60000), // 1 minute
    dataAccessMaxTime: z.number().default(5000) // 5 seconds
  }),

  // Emergency escalation configuration
  escalation: z.object({
    enableAutomaticEscalation: z.boolean().default(true),
    escalationThresholds: z.object({
      criticalSeverityAutoEscalate: z.boolean().default(true),
      unresponsiveUserEscalate: z.boolean().default(true),
      timeToEscalationMinutes: z.number().default(5)
    }),

    // Emergency contacts
    emergencyContactConfig: z.object({
      maxEmergencyContacts: z.number().default(5),
      requirePrimaryContact: z.boolean().default(true),
      allowProfessionalContacts: z.boolean().default(true),
      notificationMethods: z.array(z.enum(['sms', 'phone', 'email', 'app'])).default(['sms', 'phone'])
    })
  }),

  // Data access and privacy
  dataAccess: z.object({
    enableEmergencyDataAccess: z.boolean().default(true),
    dataMinimizationRequired: z.boolean().default(true),
    maxAccessDurationMinutes: z.number().default(60),
    auditAllAccess: z.boolean().default(true),

    // Privacy protection
    privacyProtection: z.object({
      encryptEmergencyData: z.boolean().default(true),
      minimizeDataSharing: z.boolean().default(true),
      respectUserPreferences: z.boolean().default(true),
      notifyUserOfAccess: z.boolean().default(true)
    })
  }),

  // Compliance and audit
  compliance: z.object({
    hipaaCompliantMode: z.boolean().default(true),
    auditLogRetentionDays: z.number().default(2555), // 7 years
    requireClinicalReview: z.boolean().default(true),
    emergencyOverrideTracking: z.boolean().default(true)
  })
});

export type CrisisSafetyConfig = z.infer<typeof CrisisSafetyConfigSchema>;

/**
 * Constants and performance requirements
 */
export const CRISIS_SAFETY_CONSTANTS = {
  // Performance requirements (non-negotiable)
  CRISIS_MAX_RESPONSE_TIME: 200, // milliseconds
  ESCALATION_MAX_RESPONSE_TIME: 30000, // milliseconds (30 seconds)
  EMERGENCY_CONTACT_MAX_TIME: 60000, // milliseconds (1 minute)

  // Crisis severity thresholds
  CRISIS_THRESHOLDS: {
    PHQ9_CRISIS: 20,
    GAD7_CRISIS: 15,
    COMBINED_CRISIS: 35 // PHQ-9 + GAD-7
  },

  // Response time targets
  RESPONSE_TIME_TARGETS: {
    IMMEDIATE: 200,    // milliseconds
    URGENT: 5000,      // 5 seconds
    PRIORITY: 30000,   // 30 seconds
    STANDARD: 300000   // 5 minutes
  },

  // Data access limits
  DATA_ACCESS: {
    MAX_EMERGENCY_CONTACTS: 5,
    MAX_ACCESS_DURATION_MINUTES: 60,
    MAX_DATA_TYPES_PER_REQUEST: 10,
    AUDIT_RETENTION_DAYS: 2555 // 7 years
  },

  // Privacy protection
  PRIVACY_PROTECTION: {
    MINIMUM_ENCRYPTION_STRENGTH: 256, // AES-256
    DATA_MINIMIZATION_REQUIRED: true,
    USER_NOTIFICATION_REQUIRED: true,
    PURPOSE_LIMITATION_ENFORCED: true
  }
} as const;

/**
 * Type guards for crisis safety types
 */
export const isCrisisEvent = (value: unknown): value is CrisisEvent => {
  try {
    CrisisEventSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isEmergencyEscalation = (value: unknown): value is EmergencyEscalation => {
  try {
    EmergencyEscalationSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isSafetyProtocol = (value: unknown): value is SafetyProtocol => {
  try {
    SafetyProtocolSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Export schemas for runtime validation
 */
export default {
  CrisisSeveritySchema,
  CrisisDetectionSourceSchema,
  CrisisEventSchema,
  EmergencyEscalationSchema,
  SafetyProtocolSchema,
  EmergencyDataAccessSchema,
  CrisisSafetyConfigSchema,

  // Type guards
  isCrisisEvent,
  isEmergencyEscalation,
  isSafetyProtocol,

  // Constants
  CRISIS_SAFETY_CONSTANTS
};