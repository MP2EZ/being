/**
 * Therapeutic Continuity Integration Type Definitions
 * P0-CLOUD Platform Infrastructure - TypeScript Implementation
 *
 * Comprehensive therapeutic continuity types for:
 * - Clinical data preservation with assessment integrity
 * - Session state management with cross-device handoff
 * - MBCT practice continuity with timing accuracy
 * - Progress tracking with therapeutic outcomes
 * - Intervention coordination with safety protocols
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
  CrisisEvent,
  CrisisSeverity
} from './crisis-safety-types';

/**
 * THERAPEUTIC SESSION MANAGEMENT
 */

/**
 * Therapeutic session types with MBCT focus
 */
export const TherapeuticSessionTypeSchema = z.enum([
  'morning_checkin',        // Morning check-in with intention setting
  'midday_checkin',         // Midday mindfulness and reflection
  'evening_checkin',        // Evening review and gratitude
  'breathing_exercise',     // 3-minute breathing space
  'body_scan',             // Mindful body awareness
  'mindful_movement',      // Gentle mindful movement
  'phq9_assessment',       // PHQ-9 depression screening
  'gad7_assessment',       // GAD-7 anxiety screening
  'crisis_intervention',   // Crisis safety planning
  'safety_planning',       // Safety plan creation/review
  'progress_review',       // Therapeutic progress assessment
  'goal_setting',          // Therapeutic goal setting
  'relapse_prevention'     // Relapse prevention planning
]);

export type TherapeuticSessionType = z.infer<typeof TherapeuticSessionTypeSchema>;

/**
 * Therapeutic session state with clinical accuracy
 */
export const TherapeuticSessionStateSchema = z.object({
  // Session identification
  sessionId: z.string(),
  sessionType: TherapeuticSessionTypeSchema,
  userId: z.string(),
  deviceId: z.string(),

  // Session timing and progress
  timing: z.object({
    startedAt: z.string(), // ISO timestamp
    lastActivityAt: z.string(), // ISO timestamp
    expectedDuration: z.number(), // milliseconds
    actualDuration: z.number().optional(), // milliseconds
    pausedDuration: z.number().default(0), // milliseconds

    // Step timing (critical for breathing exercises)
    stepTimings: z.array(z.object({
      stepId: z.string(),
      stepName: z.string(),
      expectedDuration: z.number(), // milliseconds
      actualDuration: z.number().optional(), // milliseconds
      startedAt: z.string().optional(), // ISO timestamp
      completedAt: z.string().optional(), // ISO timestamp
      skipped: z.boolean().default(false),
      skipReason: z.string().optional()
    }))
  }),

  // Session progress and completion
  progress: z.object({
    currentStep: z.number(),
    totalSteps: z.number(),
    completedSteps: z.array(z.string()), // Step IDs
    progressPercentage: z.number().min(0).max(100),

    // Completion tracking
    sessionCompleted: z.boolean(),
    completionRate: z.number().min(0).max(100), // Percentage of session completed
    prematureTermination: z.boolean(),
    terminationReason: z.string().optional(),

    // Quality metrics
    qualityMetrics: z.object({
      userEngagement: z.number().min(0).max(100), // Engagement score
      attentionQuality: z.number().min(0).max(100).optional(), // Attention during session
      completionLikelihood: z.number().min(0).max(100), // Likelihood of completion
      therapeuticValue: z.number().min(0).max(100).optional() // Estimated therapeutic benefit
    })
  }),

  // Session data and responses
  sessionData: z.object({
    // User responses and inputs
    userResponses: z.record(z.string(), z.unknown()), // question_id -> response
    numericResponses: z.record(z.string(), z.number()).optional(), // For assessment scores
    textResponses: z.record(z.string(), z.string()).optional(), // For qualitative responses
    selectedOptions: z.record(z.string(), z.array(z.string())).optional(), // Multi-choice responses

    // Clinical data (if applicable)
    clinicalData: z.object({
      assessmentScores: z.record(z.string(), z.number()).optional(), // Assessment -> score
      riskLevel: z.enum(['minimal', 'low', 'moderate', 'high', 'severe']).optional(),
      crisisIndicators: z.array(z.string()).optional(),
      interventionRequired: z.boolean().optional(),
      clinicalNotes: z.string().optional()
    }).optional(),

    // Therapeutic context
    therapeuticContext: z.object({
      moodBefore: z.number().min(1).max(10).optional(),
      moodAfter: z.number().min(1).max(10).optional(),
      anxietyBefore: z.number().min(1).max(10).optional(),
      anxietyAfter: z.number().min(1).max(10).optional(),
      energyLevel: z.number().min(1).max(10).optional(),
      motivationLevel: z.number().min(1).max(10).optional(),

      // Mindfulness practice data
      mindfulnessData: z.object({
        focusQuality: z.number().min(1).max(10).optional(),
        distractionsCount: z.number().optional(),
        breathingRhythm: z.enum(['regular', 'irregular', 'labored', 'calm']).optional(),
        bodyAwareness: z.number().min(1).max(10).optional(),
        emotionalAwareness: z.number().min(1).max(10).optional()
      }).optional()
    }).optional()
  }),

  // Session context and environment
  context: z.object({
    // Environmental context
    environment: z.object({
      location: z.enum(['home', 'work', 'public', 'healthcare', 'other']).optional(),
      timeOfDay: z.enum(['early_morning', 'morning', 'late_morning', 'afternoon', 'evening', 'night']),
      dayOfWeek: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
      isQuiet: z.boolean().optional(),
      hasPrivacy: z.boolean().optional()
    }),

    // Device context
    deviceContext: z.object({
      platform: z.enum(['ios', 'android', 'web']),
      screenSize: z.enum(['small', 'medium', 'large']),
      hasAudio: z.boolean(),
      hasHaptics: z.boolean(),
      batteryLevel: z.number().min(0).max(100).optional(),
      networkQuality: z.enum(['excellent', 'good', 'poor', 'offline'])
    }),

    // User context
    userContext: z.object({
      isFirstSession: z.boolean(),
      sessionStreak: z.number().default(0), // Consecutive days with sessions
      preferredSessionTime: z.enum(['morning', 'afternoon', 'evening']).optional(),
      lastSessionDays: z.number().optional(), // Days since last session
      therapeuticGoals: z.array(z.string()).optional(),
      currentChallenges: z.array(z.string()).optional()
    })
  }),

  // Cross-device coordination
  crossDeviceCoordination: z.object({
    isPrimarySession: z.boolean(),
    canHandoffToOtherDevices: z.boolean(),
    handoffCandidates: z.array(z.object({
      deviceId: z.string(),
      deviceType: z.enum(['phone', 'tablet', 'desktop']),
      handoffScore: z.number().min(0).max(100), // Suitability for handoff
      capabilityMatch: z.number().min(0).max(100) // How well device matches session needs
    })),

    // Session preservation
    preservationRequired: z.boolean(),
    preservationData: z.record(z.string(), z.unknown()).optional(),
    preservationTimeout: z.number().default(1800000), // 30 minutes default

    // Synchronization requirements
    syncRequirements: z.object({
      realTimeSync: z.boolean(),
      conflictResolution: z.enum(['preserve_session', 'merge', 'user_choice']).default('preserve_session'),
      maxSyncLatency: z.number().default(500) // milliseconds
    })
  }),

  // Therapeutic outcomes and assessment
  outcomes: z.object({
    // Immediate outcomes
    immediateOutcomes: z.object({
      sessionRating: z.number().min(1).max(5).optional(), // User rating of session
      perceivedBenefit: z.number().min(1).max(10).optional(),
      stressReduction: z.number().min(-5).max(5).optional(), // Change in stress
      moodImprovement: z.number().min(-5).max(5).optional(), // Change in mood
      clarityGained: z.number().min(1).max(10).optional(),
      motivationChange: z.number().min(-5).max(5).optional()
    }),

    // Behavioral outcomes
    behavioralOutcomes: z.object({
      willPracticeAgain: z.boolean().optional(),
      intendsToContinue: z.boolean().optional(),
      wouldRecommend: z.boolean().optional(),
      identifiedTriggers: z.array(z.string()).optional(),
      copingStrategiesUsed: z.array(z.string()).optional(),
      insightsGained: z.array(z.string()).optional()
    }),

    // Clinical outcomes (if applicable)
    clinicalOutcomes: z.object({
      riskLevelChange: z.enum(['increased', 'same', 'decreased']).optional(),
      crisisRiskReduced: z.boolean().optional(),
      safetyIncreased: z.boolean().optional(),
      functionalImprovementNoted: z.boolean().optional(),
      symptomReduction: z.boolean().optional(),
      therapeuticAllianceStrength: z.number().min(1).max(10).optional()
    }).optional()
  })
});

export type TherapeuticSessionState = z.infer<typeof TherapeuticSessionStateSchema>;

/**
 * CLINICAL DATA PRESERVATION
 */

/**
 * Clinical data integrity with assessment preservation
 */
export const ClinicalDataIntegritySchema = z.object({
  // Data identification
  dataId: z.string(),
  dataType: z.enum([
    'phq9_assessment',
    'gad7_assessment',
    'mood_tracking',
    'anxiety_tracking',
    'therapeutic_goals',
    'safety_plan',
    'crisis_plan',
    'progress_notes',
    'intervention_outcomes',
    'medication_tracking'
  ]),
  userId: z.string(),

  // Data integrity validation
  integrity: z.object({
    // Checksum validation
    dataChecksum: z.string(),
    checksumAlgorithm: z.enum(['md5', 'sha256', 'sha512']).default('sha256'),
    lastValidation: z.string(), // ISO timestamp
    validationStatus: z.enum(['valid', 'invalid', 'pending', 'error']),

    // Clinical accuracy validation
    clinicalAccuracy: z.object({
      scoreCalculationVerified: z.boolean(),
      rangeValidationPassed: z.boolean(),
      logicalConsistencyChecked: z.boolean(),
      temporalConsistencyVerified: z.boolean(),

      // Assessment-specific validation
      assessmentValidation: z.object({
        allQuestionsAnswered: z.boolean(),
        scoreWithinValidRange: z.boolean(),
        responsesLogicallyConsistent: z.boolean(),
        timeToCompleteReasonable: z.boolean(),
        crisisThresholdsChecked: z.boolean()
      }).optional()
    }),

    // Data completeness
    completeness: z.object({
      requiredFieldsPresent: z.boolean(),
      optionalFieldsPresent: z.number(), // Count of optional fields present
      completenessPercentage: z.number().min(0).max(100),
      missingCriticalData: z.array(z.string()), // List of missing critical fields
      missingOptionalData: z.array(z.string()) // List of missing optional fields
    })
  }),

  // Data preservation history
  preservationHistory: z.object({
    // Creation and modification
    createdAt: z.string(), // ISO timestamp
    lastModifiedAt: z.string(), // ISO timestamp
    modificationCount: z.number(),
    preservationCount: z.number(),

    // Version control
    currentVersion: z.string(),
    versionHistory: z.array(z.object({
      version: z.string(),
      timestamp: z.string(),
      changes: z.array(z.string()),
      preservedBy: z.enum(['system', 'user', 'clinical_team', 'automatic']),
      integrityValidated: z.boolean()
    })),

    // Backup and recovery
    backupHistory: z.array(z.object({
      backupId: z.string(),
      backupTimestamp: z.string(),
      backupMethod: z.enum(['automatic', 'manual', 'crisis_triggered', 'cross_device']),
      backupLocation: z.enum(['local', 'cloud', 'cross_device', 'clinical_system']),
      recoveryTested: z.boolean(),
      integrityVerified: z.boolean()
    }))
  }),

  // Clinical context preservation
  clinicalContext: z.object({
    // Therapeutic context
    therapeuticContext: z.object({
      sessionId: z.string().optional(),
      clinicalPhase: z.enum(['assessment', 'intervention', 'maintenance', 'crisis']).optional(),
      therapeuticGoals: z.array(z.string()).optional(),
      interventionType: z.array(z.string()).optional(),
      clinicalPriority: z.enum(['low', 'medium', 'high', 'critical']).optional()
    }),

    // Crisis context
    crisisContext: z.object({
      crisisRelated: z.boolean(),
      crisisSeverity: z.enum(['none', 'low', 'moderate', 'high', 'critical']).optional(),
      emergencyData: z.boolean(),
      requiresImmediateAttention: z.boolean(),
      clinicalReviewRequired: z.boolean()
    }),

    // Continuity requirements
    continuityRequirements: z.object({
      requiresCrossDeviceAccess: z.boolean(),
      requiresOfflineAccess: z.boolean(),
      requiresRealTimeSync: z.boolean(),
      maxDataAge: z.number().optional(), // milliseconds
      retentionRequired: z.boolean(),
      clinicalAccessRequired: z.boolean()
    })
  }),

  // Data quality metrics
  qualityMetrics: z.object({
    // Accuracy metrics
    accuracy: z.object({
      clinicalAccuracyScore: z.number().min(0).max(100),
      computationalAccuracy: z.boolean(),
      userInputValidationScore: z.number().min(0).max(100),
      logicalConsistencyScore: z.number().min(0).max(100)
    }),

    // Completeness metrics
    completeness: z.object({
      dataCompletenessScore: z.number().min(0).max(100),
      requiredFieldsScore: z.number().min(0).max(100),
      contextualCompletenessScore: z.number().min(0).max(100)
    }),

    // Timeliness metrics
    timeliness: z.object({
      dataFreshnessScore: z.number().min(0).max(100),
      lastUpdateWithinThreshold: z.boolean(),
      syncLatencyAcceptable: z.boolean(),
      temporalValidityScore: z.number().min(0).max(100)
    }),

    // Overall quality
    overallQuality: z.object({
      qualityScore: z.number().min(0).max(100),
      clinicalUsability: z.enum(['excellent', 'good', 'acceptable', 'poor']),
      therapeuticValue: z.enum(['high', 'medium', 'low', 'minimal']),
      preservationQuality: z.enum(['perfect', 'good', 'acceptable', 'degraded'])
    })
  })
});

export type ClinicalDataIntegrity = z.infer<typeof ClinicalDataIntegritySchema>;

/**
 * PROGRESS TRACKING AND OUTCOMES
 */

/**
 * Therapeutic progress tracking with outcome measurement
 */
export const TherapeuticProgressSchema = z.object({
  // Progress identification
  progressId: z.string(),
  userId: z.string(),
  trackingPeriod: z.object({
    startDate: z.string(), // ISO date
    endDate: z.string().optional(), // ISO date
    periodType: z.enum(['daily', 'weekly', 'monthly', 'phase', 'custom']),
    currentDay: z.number().optional(),
    totalDays: z.number().optional()
  }),

  // Therapeutic goals and targets
  therapeuticGoals: z.array(z.object({
    goalId: z.string(),
    goalDescription: z.string(),
    goalType: z.enum([
      'mood_improvement',
      'anxiety_reduction',
      'stress_management',
      'mindfulness_practice',
      'behavioral_change',
      'cognitive_restructuring',
      'crisis_prevention',
      'functional_improvement',
      'quality_of_life',
      'medication_adherence'
    ]),

    // Goal measurement
    measurement: z.object({
      measurementType: z.enum(['binary', 'scale', 'frequency', 'duration', 'percentage']),
      targetValue: z.number(),
      currentValue: z.number(),
      progressPercentage: z.number().min(0).max(100),

      // Measurement history
      measurementHistory: z.array(z.object({
        date: z.string(), // ISO date
        value: z.number(),
        context: z.string().optional(),
        confidence: z.number().min(0).max(100).optional()
      }))
    }),

    // Goal status
    status: z.enum(['not_started', 'in_progress', 'achieved', 'modified', 'discontinued']),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    targetDate: z.string().optional(), // ISO date
    achievedDate: z.string().optional(), // ISO date

    // Clinical relevance
    clinicalRelevance: z.object({
      evidenceBased: z.boolean(),
      measurable: z.boolean(),
      realistic: z.boolean(),
      timebound: z.boolean(),
      therapeuticallySignificant: z.boolean()
    })
  })),

  // Clinical outcome measures
  outcomeMetrics: z.object({
    // Primary outcome measures
    primaryOutcomes: z.array(z.object({
      measureId: z.string(),
      measureName: z.string(),
      measureType: z.enum(['phq9', 'gad7', 'dass21', 'custom_scale', 'behavioral_frequency']),

      // Baseline and current values
      baseline: z.object({
        value: z.number(),
        date: z.string(), // ISO date
        confidence: z.number().min(0).max(100).optional()
      }),

      current: z.object({
        value: z.number(),
        date: z.string(), // ISO date
        confidence: z.number().min(0).max(100).optional()
      }),

      // Change metrics
      changeMetrics: z.object({
        absoluteChange: z.number(),
        percentageChange: z.number(),
        clinicallySignificantChange: z.boolean(),
        reliableChangeIndex: z.number().optional(),
        effectSize: z.number().optional()
      }),

      // Trend analysis
      trend: z.object({
        trendDirection: z.enum(['improving', 'stable', 'declining', 'fluctuating']),
        trendStrength: z.enum(['strong', 'moderate', 'weak', 'none']),
        trendReliability: z.number().min(0).max(100),
        projectedOutcome: z.number().optional()
      })
    })),

    // Secondary outcome measures
    secondaryOutcomes: z.array(z.object({
      measureId: z.string(),
      measureName: z.string(),
      currentValue: z.number(),
      changeFromBaseline: z.number(),
      clinicalRelevance: z.enum(['high', 'medium', 'low', 'unclear'])
    })),

    // Functional outcomes
    functionalOutcomes: z.object({
      dailyFunctioning: z.number().min(0).max(100).optional(),
      socialFunctioning: z.number().min(0).max(100).optional(),
      workProductivity: z.number().min(0).max(100).optional(),
      sleepQuality: z.number().min(0).max(100).optional(),
      physicalHealth: z.number().min(0).max(100).optional(),
      relationshipQuality: z.number().min(0).max(100).optional()
    })
  }),

  // Behavioral tracking
  behavioralTracking: z.object({
    // Practice engagement
    practiceEngagement: z.object({
      sessionsCompleted: z.number(),
      sessionsPlaneprogress: z.number(),
      completionRate: z.number().min(0).max(100),
      averageSessionRating: z.number().min(1).max(5).optional(),

      // Engagement patterns
      engagementPatterns: z.object({
        preferredTimeOfDay: z.enum(['morning', 'afternoon', 'evening']).optional(),
        averageSessionDuration: z.number(), // minutes
        mostEngagingSessionType: TherapeuticSessionTypeSchema.optional(),
        leastEngagingSessionType: TherapeuticSessionTypeSchema.optional(),
        streakLength: z.number(), // consecutive days
        longestStreak: z.number() // best streak achieved
      })
    }),

    // Mindfulness practice
    mindfulnessPractice: z.object({
      formalPracticeMinutes: z.number(),
      informalPracticeFrequency: z.number(),
      mindfulnessSkillLevel: z.number().min(1).max(10),
      awarenessQuality: z.number().min(1).max(10).optional(),
      presentMomentAwareness: z.number().min(1).max(10).optional(),
      nonjudgmentalAttitude: z.number().min(1).max(10).optional()
    }),

    // Behavioral changes
    behavioralChanges: z.array(z.object({
      behaviorId: z.string(),
      behaviorDescription: z.string(),
      changeType: z.enum(['increase', 'decrease', 'modify', 'replace']),
      targetBehavior: z.string(),
      currentFrequency: z.number(),
      targetFrequency: z.number(),
      progressPercentage: z.number().min(0).max(100)
    }))
  }),

  // Risk assessment and safety
  riskAssessment: z.object({
    // Current risk levels
    currentRisk: z.object({
      suicidalRisk: z.enum(['none', 'low', 'moderate', 'high', 'severe']),
      selfHarmRisk: z.enum(['none', 'low', 'moderate', 'high', 'severe']),
      functionalRisk: z.enum(['none', 'low', 'moderate', 'high', 'severe']),
      crisisRisk: z.enum(['none', 'low', 'moderate', 'high', 'severe'])
    }),

    // Risk factor monitoring
    riskFactors: z.array(z.object({
      factorId: z.string(),
      factorName: z.string(),
      factorType: z.enum(['clinical', 'social', 'environmental', 'behavioral']),
      riskLevel: z.enum(['none', 'low', 'moderate', 'high', 'critical']),
      changeOverTime: z.enum(['improving', 'stable', 'worsening']),
      interventionRequired: z.boolean()
    })),

    // Protective factors
    protectiveFactors: z.array(z.object({
      factorId: z.string(),
      factorName: z.string(),
      strengthLevel: z.enum(['minimal', 'low', 'moderate', 'high', 'excellent']),
      changeOverTime: z.enum(['strengthening', 'stable', 'weakening']),
      therapeuticTarget: z.boolean()
    })),

    // Safety planning
    safetyPlanning: z.object({
      safetyPlanActive: z.boolean(),
      safetyPlanUpdated: z.string().optional(), // ISO timestamp
      copingStrategiesCount: z.number(),
      supportContactsCount: z.number(),
      environmentalModifications: z.number(),
      safetyPlanEffectiveness: z.number().min(1).max(10).optional()
    })
  }),

  // Progress insights and recommendations
  insights: z.object({
    // Progress insights
    progressInsights: z.array(z.object({
      insightType: z.enum(['strength', 'challenge', 'opportunity', 'risk', 'recommendation']),
      insight: z.string(),
      evidenceLevel: z.enum(['strong', 'moderate', 'weak', 'observational']),
      actionable: z.boolean(),
      priority: z.enum(['high', 'medium', 'low'])
    })),

    // Recommendations
    recommendations: z.array(z.object({
      recommendationId: z.string(),
      recommendationType: z.enum([
        'increase_practice_frequency',
        'modify_session_type',
        'focus_on_specific_skill',
        'address_barrier',
        'enhance_motivation',
        'clinical_consultation',
        'crisis_planning_update',
        'goal_modification'
      ]),
      recommendation: z.string(),
      rationale: z.string(),
      priority: z.enum(['high', 'medium', 'low']),
      timeframe: z.enum(['immediate', 'short_term', 'medium_term', 'long_term']),
      expectedBenefit: z.enum(['high', 'medium', 'low', 'unclear'])
    })),

    // Therapeutic adjustments
    therapeuticAdjustments: z.array(z.object({
      adjustmentType: z.enum(['session_frequency', 'session_duration', 'content_focus', 'difficulty_level', 'support_level']),
      currentSetting: z.string(),
      recommendedSetting: z.string(),
      justification: z.string(),
      expectedOutcome: z.string()
    }))
  })
});

export type TherapeuticProgress = z.infer<typeof TherapeuticProgressSchema>;

/**
 * INTERVENTION COORDINATION
 */

/**
 * Coordinated therapeutic intervention with safety integration
 */
export const InterventionCoordinationSchema = z.object({
  // Intervention identification
  interventionId: z.string(),
  userId: z.string(),
  coordinatedBy: z.enum(['system', 'clinician', 'user', 'crisis_protocol']),
  initiatedAt: z.string(), // ISO timestamp

  // Intervention context
  context: z.object({
    // Triggering factors
    triggeringFactors: z.array(z.enum([
      'crisis_detection',
      'declining_progress',
      'goal_not_met',
      'user_request',
      'clinical_recommendation',
      'safety_concern',
      'behavioral_change_needed',
      'medication_adjustment',
      'environmental_change',
      'social_support_needed'
    ])),

    // Clinical context
    clinicalContext: z.object({
      currentPhase: z.enum(['assessment', 'intervention', 'maintenance', 'crisis', 'transition']),
      treatmentModality: z.array(z.enum(['mbct', 'cbt', 'mindfulness', 'medication', 'psychoeducation', 'crisis_intervention'])),
      clinicalPriority: z.enum(['routine', 'elevated', 'urgent', 'crisis']),
      riskLevel: z.enum(['minimal', 'low', 'moderate', 'high', 'critical'])
    }),

    // User context
    userContext: z.object({
      readinessToChange: z.number().min(1).max(10),
      motivationLevel: z.number().min(1).max(10),
      supportSystemStrength: z.enum(['minimal', 'weak', 'moderate', 'strong', 'excellent']),
      currentStressLevel: z.number().min(1).max(10),
      availableTime: z.enum(['limited', 'moderate', 'flexible', 'abundant'])
    })
  }),

  // Coordinated interventions
  interventions: z.array(z.object({
    interventionType: z.enum([
      'immediate_safety',
      'crisis_stabilization',
      'mindfulness_practice',
      'cognitive_restructuring',
      'behavioral_activation',
      'exposure_therapy',
      'relapse_prevention',
      'medication_adjustment',
      'social_support_mobilization',
      'environmental_modification'
    ]),

    // Intervention details
    details: z.object({
      name: z.string(),
      description: z.string(),
      rationale: z.string(),
      evidenceBase: z.string().optional(),
      expectedOutcome: z.string(),
      timeframe: z.string(),

      // Implementation specifics
      implementation: z.object({
        deliveryMethod: z.enum(['app_based', 'self_directed', 'clinician_guided', 'peer_supported', 'automated']),
        frequency: z.string(),
        duration: z.string(),
        intensity: z.enum(['minimal', 'low', 'moderate', 'high', 'intensive']),
        sessionFormat: z.enum(['individual', 'group', 'mixed', 'self_paced'])
      })
    }),

    // Intervention tracking
    tracking: z.object({
      status: z.enum(['planned', 'active', 'paused', 'completed', 'discontinued', 'modified']),
      startDate: z.string(), // ISO date
      endDate: z.string().optional(), // ISO date
      completionPercentage: z.number().min(0).max(100),

      // Outcome tracking
      outcomes: z.object({
        immediateOutcome: z.enum(['positive', 'neutral', 'negative', 'mixed', 'unknown']).optional(),
        shortTermOutcome: z.enum(['improved', 'stable', 'declined', 'mixed', 'unknown']).optional(),
        adherence: z.number().min(0).max(100).optional(), // percentage
        userSatisfaction: z.number().min(1).max(5).optional(),
        therapeuticAlliance: z.number().min(1).max(10).optional()
      }),

      // Progress indicators
      progressIndicators: z.array(z.object({
        indicatorName: z.string(),
        currentValue: z.number(),
        targetValue: z.number(),
        changeFromBaseline: z.number(),
        clinicallySignificant: z.boolean()
      }))
    })
  })),

  // Coordination mechanisms
  coordination: z.object({
    // Inter-intervention coordination
    interInterventionCoordination: z.object({
      conflictsIdentified: z.boolean(),
      conflictResolution: z.array(z.string()).optional(),
      synergyOpportunities: z.array(z.string()).optional(),
      sequencingRequired: z.boolean(),
      timingCoordination: z.boolean()
    }),

    // System coordination
    systemCoordination: z.object({
      automatedCoordination: z.boolean(),
      manualOversightRequired: z.boolean(),
      clinicalSupervisionNeeded: z.boolean(),
      userInvolvementLevel: z.enum(['minimal', 'collaborative', 'user_directed']),

      // Coordination protocols
      coordinationProtocols: z.array(z.object({
        protocolName: z.string(),
        triggerConditions: z.array(z.string()),
        coordinationActions: z.array(z.string()),
        responsibleParty: z.enum(['system', 'clinician', 'user', 'emergency_contact'])
      }))
    }),

    // Performance coordination
    performanceCoordination: z.object({
      responseTimeTargets: z.record(z.string(), z.number()), // intervention -> max milliseconds
      prioritizationRules: z.array(z.string()),
      resourceAllocation: z.record(z.string(), z.number()), // resource -> percentage
      loadBalancing: z.boolean(),
      failoverProcedures: z.boolean()
    })
  }),

  // Safety integration
  safetyIntegration: z.object({
    // Safety monitoring
    safetyMonitoring: z.object({
      continuousMonitoring: z.boolean(),
      riskAssessmentFrequency: z.enum(['continuous', 'daily', 'weekly', 'as_needed']),
      safetyThresholds: z.record(z.string(), z.number()), // metric -> threshold
      escalationTriggers: z.array(z.string())
    }),

    // Crisis integration
    crisisIntegration: z.object({
      crisisProtocolsActive: z.boolean(),
      crisisDetectionEnabled: z.boolean(),
      emergencyContactsIntegrated: z.boolean(),
      safetyPlanIntegrated: z.boolean(),

      // Crisis response coordination
      crisisResponseCoordination: z.object({
        immediateResponseProtocol: z.string(),
        escalationProcedure: z.string(),
        resourceMobilization: z.array(z.string()),
        continuityPlanning: z.string()
      })
    }),

    // Therapeutic safety
    therapeuticSafety: z.object({
      contraindicationsChecked: z.boolean(),
      adverseEffectsMonitored: z.boolean(),
      therapeuticBoundaries: z.boolean(),
      professionalOversight: z.boolean(),
      userConsentMaintained: z.boolean()
    })
  }),

  // Coordination outcomes
  coordinationOutcomes: z.object({
    // Effectiveness measures
    effectiveness: z.object({
      coordinationSuccess: z.boolean(),
      interventionSynergy: z.number().min(0).max(100), // percentage
      resourceEfficiency: z.number().min(0).max(100), // percentage
      userExperienceQuality: z.enum(['excellent', 'good', 'acceptable', 'poor']),
      clinicalOutcomeQuality: z.enum(['excellent', 'good', 'acceptable', 'poor'])
    }),

    // Performance metrics
    performance: z.object({
      coordinationLatency: z.number(), // milliseconds
      interventionDeliveryTime: z.number(), // milliseconds
      resourceUtilization: z.number().min(0).max(100), // percentage
      systemLoadDuringCoordination: z.number().min(0).max(100), // percentage
      userWaitTime: z.number() // milliseconds
    }),

    // Quality measures
    quality: z.object({
      therapeuticContinuityMaintained: z.boolean(),
      clinicalAccuracyPreserved: z.boolean(),
      safetyStandardsMet: z.boolean(),
      userSatisfactionAchieved: z.boolean(),
      professionalStandardsMet: z.boolean()
    })
  })
});

export type InterventionCoordination = z.infer<typeof InterventionCoordinationSchema>;

/**
 * THERAPEUTIC CONTINUITY SERVICE INTERFACE
 */

/**
 * Therapeutic continuity service state
 */
export interface TherapeuticContinuityState {
  // Active sessions
  readonly activeSessions: Map<string, TherapeuticSessionState>;
  readonly preservedSessions: Map<string, TherapeuticSessionState>;

  // Clinical data integrity
  readonly clinicalDataRegistry: Map<string, ClinicalDataIntegrity>;
  readonly integrityViolations: ClinicalDataIntegrity[];

  // Progress tracking
  readonly activeProgressTracking: Map<string, TherapeuticProgress>;
  readonly outcomeMetrics: Map<string, unknown>;

  // Intervention coordination
  readonly activeInterventions: Map<string, InterventionCoordination>;
  readonly coordinationQueue: InterventionCoordination[];

  // System health
  readonly systemHealth: {
    readonly continuityScore: number; // 0-100
    readonly dataIntegrityScore: number; // 0-100
    readonly sessionPreservationRate: number; // 0-100 percentage
    readonly therapeuticOutcomeQuality: 'excellent' | 'good' | 'acceptable' | 'poor';
  };
}

/**
 * Therapeutic continuity service actions
 */
export interface TherapeuticContinuityActions {
  // Session management
  startTherapeuticSession: (userId: string, sessionType: TherapeuticSessionType) => Promise<TherapeuticSessionState>;
  preserveSession: (sessionId: string) => Promise<void>;
  restoreSession: (sessionId: string, deviceId: string) => Promise<TherapeuticSessionState>;
  completeSession: (sessionId: string, outcomes: unknown) => Promise<void>;

  // Clinical data preservation
  preserveClinicalData: (dataId: string, priority: 'high' | 'medium' | 'low') => Promise<void>;
  validateDataIntegrity: (dataId: string) => Promise<boolean>;
  restoreClinicalData: (dataId: string, version?: string) => Promise<ClinicalDataIntegrity>;

  // Progress tracking
  updateProgress: (userId: string, progressUpdate: unknown) => Promise<void>;
  generateProgressReport: (userId: string, period: string) => Promise<TherapeuticProgress>;
  assessOutcomes: (userId: string) => Promise<unknown>;

  // Intervention coordination
  coordinateIntervention: (userId: string, interventionType: string, context: unknown) => Promise<InterventionCoordination>;
  updateInterventionStatus: (interventionId: string, status: string) => Promise<void>;
  monitorInterventionOutcomes: (interventionId: string) => Promise<unknown>;

  // Cross-device coordination
  coordinateAcrossDevices: (sessionId: string, targetDevices: string[]) => Promise<void>;
  syncTherapeuticData: (userId: string, targetDevices?: string[]) => Promise<void>;
  resolveTherapeuticConflicts: (conflictId: string) => Promise<void>;

  // Safety integration
  integrateWithCrisisProtocols: (sessionId: string, crisisEvent: CrisisEvent) => Promise<void>;
  ensureTherapeuticSafety: (operationId: string) => Promise<boolean>;
  validateClinicalAccuracy: (dataId: string) => Promise<boolean>;
}

/**
 * Complete therapeutic continuity service interface
 */
export interface TherapeuticContinuityService extends TherapeuticContinuityState, TherapeuticContinuityActions {
  // Service lifecycle
  initialize: (config: TherapeuticContinuityConfig) => Promise<void>;
  shutdown: () => Promise<void>;

  // Continuity-aware operation execution
  executeWithContinuity: <T>(
    operation: SyncOperation,
    executor: () => Promise<T>,
    continuityRequirements?: {
      preserveSession?: boolean;
      maintainIntegrity?: boolean;
      ensureOutcomes?: boolean;
    }
  ) => Promise<T>;
}

/**
 * CONFIGURATION AND CONSTANTS
 */

/**
 * Therapeutic continuity configuration
 */
export const TherapeuticContinuityConfigSchema = z.object({
  // Service identification
  serviceId: z.string(),
  version: z.string(),
  environment: z.enum(['development', 'staging', 'production']),

  // Session management
  sessionManagement: z.object({
    maxConcurrentSessions: z.number().default(1),
    sessionPreservationTimeout: z.number().default(1800000), // 30 minutes
    crossDeviceHandoffEnabled: z.boolean().default(true),
    sessionBackupFrequency: z.number().default(30000) // 30 seconds
  }),

  // Clinical data preservation
  dataPreservation: z.object({
    enableDataIntegrityValidation: z.boolean().default(true),
    backupFrequency: z.number().default(300000), // 5 minutes
    maxBackupVersions: z.number().default(10),
    integrityCheckInterval: z.number().default(3600000) // 1 hour
  }),

  // Progress tracking
  progressTracking: z.object({
    enableOutcomeTracking: z.boolean().default(true),
    progressUpdateFrequency: z.number().default(86400000), // 24 hours
    outcomeAssessmentFrequency: z.number().default(604800000), // 1 week
    trendAnalysisEnabled: z.boolean().default(true)
  }),

  // Intervention coordination
  interventionCoordination: z.object({
    enableAutomaticCoordination: z.boolean().default(true),
    maxConcurrentInterventions: z.number().default(3),
    coordinationTimeout: z.number().default(30000), // 30 seconds
    safetyIntegrationRequired: z.boolean().default(true)
  }),

  // Performance requirements
  performance: z.object({
    sessionHandoffMaxTime: z.number().default(2000), // 2 seconds
    dataPreservationMaxTime: z.number().default(1000), // 1 second
    integrityValidationMaxTime: z.number().default(500), // 500ms
    progressUpdateMaxTime: z.number().default(2000) // 2 seconds
  })
});

export type TherapeuticContinuityConfig = z.infer<typeof TherapeuticContinuityConfigSchema>;

/**
 * Constants and therapeutic standards
 */
export const THERAPEUTIC_CONTINUITY_CONSTANTS = {
  // Session timing requirements
  BREATHING_EXERCISE_DURATION: 180000, // 3 minutes in milliseconds
  BREATHING_STEP_DURATION: 60000, // 1 minute per step
  SESSION_HANDOFF_MAX_TIME: 2000, // 2 seconds

  // Clinical accuracy requirements
  ASSESSMENT_SCORE_PRECISION: 100, // Percentage precision required
  DATA_INTEGRITY_THRESHOLD: 99.9, // Percentage integrity required
  CLINICAL_ACCURACY_THRESHOLD: 100, // Percentage accuracy required

  // Progress tracking intervals
  DAILY_PROGRESS_UPDATE: 86400000, // 24 hours
  WEEKLY_OUTCOME_ASSESSMENT: 604800000, // 1 week
  MONTHLY_PROGRESS_REVIEW: 2592000000, // 30 days

  // Therapeutic session standards
  MIN_SESSION_DURATION: 60000, // 1 minute
  MAX_SESSION_DURATION: 3600000, // 1 hour
  SESSION_QUALITY_THRESHOLD: 70, // Minimum quality score

  // Data preservation standards
  CLINICAL_DATA_BACKUP_INTERVAL: 300000, // 5 minutes
  MAX_DATA_AGE_FOR_INTEGRITY: 86400000, // 24 hours
  BACKUP_RETENTION_DAYS: 90,

  // Cross-device coordination
  MAX_DEVICE_HANDOFF_TIME: 2000, // milliseconds
  SESSION_SYNC_TIMEOUT: 5000, // milliseconds
  CONFLICT_RESOLUTION_TIMEOUT: 10000 // milliseconds
} as const;

/**
 * Type guards for therapeutic continuity types
 */
export const isTherapeuticSessionState = (value: unknown): value is TherapeuticSessionState => {
  try {
    TherapeuticSessionStateSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isClinicalDataIntegrity = (value: unknown): value is ClinicalDataIntegrity => {
  try {
    ClinicalDataIntegritySchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isTherapeuticProgress = (value: unknown): value is TherapeuticProgress => {
  try {
    TherapeuticProgressSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Export schemas for runtime validation
 */
export default {
  TherapeuticSessionTypeSchema,
  TherapeuticSessionStateSchema,
  ClinicalDataIntegritySchema,
  TherapeuticProgressSchema,
  InterventionCoordinationSchema,
  TherapeuticContinuityConfigSchema,

  // Type guards
  isTherapeuticSessionState,
  isClinicalDataIntegrity,
  isTherapeuticProgress,

  // Constants
  THERAPEUTIC_CONTINUITY_CONSTANTS
};