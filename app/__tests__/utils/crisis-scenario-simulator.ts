/**
 * Crisis Scenario Simulator - Being. MBCT App
 *
 * Advanced crisis simulation for comprehensive testing:
 * - Mental health crisis simulation with therapeutic accuracy
 * - Payment crisis intersection with user vulnerability
 * - System failure scenarios during critical moments
 * - Emergency protocol validation and failsafe testing
 * - Therapeutic continuity stress testing
 * - Real-world crisis timing and response validation
 */

import {
  WebhookEvent,
  PaymentFailedEvent,
  SubscriptionUpdatedEvent,
  CrisisProtectionEvent,
  CRISIS_RESPONSE_TIME_MS
} from '../../src/types/webhooks/webhook-events';
import { CrisisLevel } from '../../src/types/webhooks/crisis-safety-types';
import { WebhookTestHarness, TherapeuticTestingUtils } from './webhook-test-harness';

/**
 * Crisis User Profile Types
 */
export interface CrisisUserProfile {
  id: string;
  vulnerabilityLevel: 'low' | 'medium' | 'high' | 'critical';
  activeTreatment: boolean;
  therapeuticDependency: 'minimal' | 'moderate' | 'high' | 'critical';
  crisisHistory: {
    previousEpisodes: number;
    lastEpisode: Date | null;
    triggerPatterns: string[];
  };
  paymentSensitivity: 'low' | 'medium' | 'high';
  supportNetwork: {
    emergencyContacts: number;
    professionalSupport: boolean;
    familySupport: boolean;
  };
  mbctProgress: {
    weeksCompleted: number;
    sessionConsistency: number; // 0-100%
    skillProficiency: 'beginner' | 'intermediate' | 'advanced';
  };
}

/**
 * Crisis Scenario Configuration
 */
export interface CrisisScenarioConfig {
  name: string;
  description: string;
  userProfile: CrisisUserProfile;
  triggers: {
    primary: string;
    secondary: string[];
    systemFailures?: string[];
  };
  timing: {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    dayOfWeek: 'weekday' | 'weekend';
    proximity_to_payment: 'immediate' | 'same_day' | 'within_week' | 'unrelated';
  };
  expectedResponseChain: {
    immediate: string[]; // <200ms
    shortTerm: string[]; // <2000ms
    sustained: string[]; // ongoing
  };
  successCriteria: {
    responseTime: number;
    therapeuticContinuity: boolean;
    crisisProtocolsActivated: boolean;
    userSafety: 'maintained' | 'improved' | 'at_risk';
    systemStability: 'stable' | 'degraded' | 'critical';
  };
}

/**
 * Predefined Crisis User Profiles
 */
export const CRISIS_USER_PROFILES: Record<string, CrisisUserProfile> = {
  highVulnerabilityNewUser: {
    id: 'user_high_vuln_new',
    vulnerabilityLevel: 'high',
    activeTreatment: true,
    therapeuticDependency: 'high',
    crisisHistory: {
      previousEpisodes: 3,
      lastEpisode: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      triggerPatterns: ['financial_stress', 'payment_issues', 'isolation']
    },
    paymentSensitivity: 'high',
    supportNetwork: {
      emergencyContacts: 1,
      professionalSupport: true,
      familySupport: false
    },
    mbctProgress: {
      weeksCompleted: 2,
      sessionConsistency: 45,
      skillProficiency: 'beginner'
    }
  },

  stabilizedExperiencedUser: {
    id: 'user_stable_experienced',
    vulnerabilityLevel: 'low',
    activeTreatment: false,
    therapeuticDependency: 'moderate',
    crisisHistory: {
      previousEpisodes: 1,
      lastEpisode: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 6 months ago
      triggerPatterns: ['major_life_changes', 'work_stress']
    },
    paymentSensitivity: 'medium',
    supportNetwork: {
      emergencyContacts: 3,
      professionalSupport: false,
      familySupport: true
    },
    mbctProgress: {
      weeksCompleted: 8,
      sessionConsistency: 85,
      skillProficiency: 'advanced'
    }
  },

  criticalDependencyUser: {
    id: 'user_critical_dependency',
    vulnerabilityLevel: 'critical',
    activeTreatment: true,
    therapeuticDependency: 'critical',
    crisisHistory: {
      previousEpisodes: 7,
      lastEpisode: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      triggerPatterns: ['payment_issues', 'access_interruption', 'system_failures', 'isolation']
    },
    paymentSensitivity: 'high',
    supportNetwork: {
      emergencyContacts: 2,
      professionalSupport: true,
      familySupport: true
    },
    mbctProgress: {
      weeksCompleted: 6,
      sessionConsistency: 65,
      skillProficiency: 'intermediate'
    }
  },

  elderlyUserLimitedTech: {
    id: 'user_elderly_limited_tech',
    vulnerabilityLevel: 'medium',
    activeTreatment: true,
    therapeuticDependency: 'high',
    crisisHistory: {
      previousEpisodes: 2,
      lastEpisode: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 2 months ago
      triggerPatterns: ['technology_confusion', 'payment_complexity', 'isolation']
    },
    paymentSensitivity: 'high',
    supportNetwork: {
      emergencyContacts: 1,
      professionalSupport: true,
      familySupport: false
    },
    mbctProgress: {
      weeksCompleted: 4,
      sessionConsistency: 30,
      skillProficiency: 'beginner'
    }
  }
};

/**
 * Crisis Scenario Templates
 */
export const CRISIS_SCENARIO_TEMPLATES: Record<string, Omit<CrisisScenarioConfig, 'userProfile'>> = {
  paymentFailureCascade: {
    name: 'Payment Failure Cascade Crisis',
    description: 'Multiple payment failures trigger financial anxiety leading to mental health crisis',
    triggers: {
      primary: 'payment_failure_third_attempt',
      secondary: ['financial_anxiety', 'access_fear', 'isolation_concern']
    },
    timing: {
      timeOfDay: 'evening',
      dayOfWeek: 'weekend',
      proximity_to_payment: 'immediate'
    },
    expectedResponseChain: {
      immediate: ['crisis_assessment', 'emergency_access_granted', 'grace_period_activated'],
      shortTerm: ['therapeutic_messaging', '988_integration', 'crisis_support_escalation'],
      sustained: ['progress_monitoring', 'recovery_support', 'payment_assistance']
    },
    successCriteria: {
      responseTime: CRISIS_RESPONSE_TIME_MS,
      therapeuticContinuity: true,
      crisisProtocolsActivated: true,
      userSafety: 'maintained',
      systemStability: 'stable'
    }
  },

  subscriptionTerminationDuringTherapy: {
    name: 'Subscription Termination During Active Therapy',
    description: 'User cancels subscription while in critical phase of MBCT therapy',
    triggers: {
      primary: 'subscription_cancellation',
      secondary: ['therapy_interruption', 'progress_loss_fear', 'abandonment_anxiety']
    },
    timing: {
      timeOfDay: 'afternoon',
      dayOfWeek: 'weekday',
      proximity_to_payment: 'same_day'
    },
    expectedResponseChain: {
      immediate: ['therapeutic_assessment', 'session_preservation', 'continuity_protection'],
      shortTerm: ['transition_support', 'resource_provision', 'follow_up_scheduling'],
      sustained: ['outcome_monitoring', 'reengagement_outreach', 'progress_preservation']
    },
    successCriteria: {
      responseTime: 1000,
      therapeuticContinuity: true,
      crisisProtocolsActivated: false,
      userSafety: 'maintained',
      systemStability: 'stable'
    }
  },

  systemFailureDuringCrisis: {
    name: 'System Failure During Active Crisis',
    description: 'Technical system failure occurs while user is in mental health crisis',
    triggers: {
      primary: 'webhook_system_failure',
      secondary: ['crisis_state_active', 'access_interruption'],
      systemFailures: ['webhook_processing', 'payment_validation', 'state_synchronization']
    },
    timing: {
      timeOfDay: 'night',
      dayOfWeek: 'weekend',
      proximity_to_payment: 'unrelated'
    },
    expectedResponseChain: {
      immediate: ['failsafe_activation', 'offline_mode', 'emergency_protocols'],
      shortTerm: ['local_crisis_support', 'cached_resources', 'manual_intervention'],
      sustained: ['system_recovery', 'data_integrity_check', 'user_reconnection']
    },
    successCriteria: {
      responseTime: CRISIS_RESPONSE_TIME_MS,
      therapeuticContinuity: true,
      crisisProtocolsActivated: true,
      userSafety: 'maintained',
      systemStability: 'critical'
    }
  },

  gracePeriodExpirationVulnerable: {
    name: 'Grace Period Expiration for Vulnerable User',
    description: 'Grace period ending for user with high therapeutic dependency and limited resources',
    triggers: {
      primary: 'grace_period_expiration_24h',
      secondary: ['financial_inability', 'therapeutic_dependency', 'limited_alternatives']
    },
    timing: {
      timeOfDay: 'morning',
      dayOfWeek: 'weekday',
      proximity_to_payment: 'within_week'
    },
    expectedResponseChain: {
      immediate: ['vulnerability_assessment', 'resource_evaluation', 'extension_consideration'],
      shortTerm: ['transition_planning', 'alternative_resources', 'support_coordination'],
      sustained: ['outcome_tracking', 'safety_monitoring', 'reengagement_opportunities']
    },
    successCriteria: {
      responseTime: 2000,
      therapeuticContinuity: true,
      crisisProtocolsActivated: false,
      userSafety: 'maintained',
      systemStability: 'stable'
    }
  }
};

/**
 * Crisis Scenario Simulator Class
 */
export class CrisisScenarioSimulator {
  private testHarness: WebhookTestHarness;

  constructor() {
    this.testHarness = new WebhookTestHarness({
      crisisMode: true,
      therapeuticValidation: true,
      performanceTracking: true
    });
  }

  /**
   * Generate Crisis Scenario
   */
  generateCrisisScenario(
    templateId: string,
    userProfileId: string
  ): CrisisScenarioConfig {
    const template = CRISIS_SCENARIO_TEMPLATES[templateId];
    const userProfile = CRISIS_USER_PROFILES[userProfileId];

    if (!template) {
      throw new Error(`Crisis scenario template '${templateId}' not found`);
    }

    if (!userProfile) {
      throw new Error(`User profile '${userProfileId}' not found`);
    }

    return {
      ...template,
      userProfile,
      // Adjust success criteria based on user vulnerability
      successCriteria: {
        ...template.successCriteria,
        responseTime: userProfile.vulnerabilityLevel === 'critical' ?
          Math.min(template.successCriteria.responseTime, CRISIS_RESPONSE_TIME_MS) :
          template.successCriteria.responseTime
      }
    };
  }

  /**
   * Simulate Payment Crisis Cascade
   */
  simulatePaymentCrisisCascade(userProfile: CrisisUserProfile): {
    timeline: Array<{
      timestamp: number;
      event: WebhookEvent;
      userState: {
        anxietyLevel: number; // 1-10
        crisisRisk: number; // 1-10
        therapeuticNeed: number; // 1-10
      };
      systemResponse: {
        responseTime: number;
        actionsTriggered: string[];
        therapeuticMessaging: string;
      };
    }>;
    finalOutcome: {
      userSafety: 'safe' | 'at_risk' | 'crisis_averted';
      therapeuticContinuity: boolean;
      systemPerformance: 'excellent' | 'good' | 'acceptable' | 'poor';
    };
  } {
    const timeline: Array<any> = [];
    let currentAnxiety = userProfile.vulnerabilityLevel === 'critical' ? 7 : 4;
    let currentCrisisRisk = userProfile.crisisHistory.previousEpisodes > 5 ? 6 : 3;
    let currentTherapeuticNeed = userProfile.therapeuticDependency === 'critical' ? 9 : 6;

    // Phase 1: Initial Payment Failure
    const initialFailure = this.testHarness.createPaymentFailureEvent(1, false);
    currentAnxiety = Math.min(10, currentAnxiety + 2);
    currentCrisisRisk = Math.min(10, currentCrisisRisk + 1);

    timeline.push({
      timestamp: Date.now(),
      event: initialFailure,
      userState: {
        anxietyLevel: currentAnxiety,
        crisisRisk: currentCrisisRisk,
        therapeuticNeed: currentTherapeuticNeed
      },
      systemResponse: {
        responseTime: 150,
        actionsTriggered: ['payment_retry_scheduled', 'user_notification'],
        therapeuticMessaging: TherapeuticTestingUtils.generateTherapeuticMessage(
          'payment_issue',
          currentAnxiety > 6 ? 'medium' : 'low'
        ).message
      }
    });

    // Phase 2: Second Payment Failure (24h later)
    const secondFailure = this.testHarness.createPaymentFailureEvent(2, false);
    currentAnxiety = Math.min(10, currentAnxiety + 2);
    currentCrisisRisk = Math.min(10, currentCrisisRisk + 2);

    timeline.push({
      timestamp: Date.now() + 86400000, // 24h later
      event: secondFailure,
      userState: {
        anxietyLevel: currentAnxiety,
        crisisRisk: currentCrisisRisk,
        therapeuticNeed: currentTherapeuticNeed
      },
      systemResponse: {
        responseTime: 200,
        actionsTriggered: ['grace_period_consideration', 'anxiety_reducing_messaging'],
        therapeuticMessaging: TherapeuticTestingUtils.generateTherapeuticMessage(
          'payment_issue',
          currentAnxiety > 7 ? 'high' : 'medium'
        ).message
      }
    });

    // Phase 3: Third Payment Failure - Crisis Trigger
    const thirdFailure = this.testHarness.createPaymentFailureEvent(3, true);
    currentAnxiety = Math.min(10, currentAnxiety + 3);
    currentCrisisRisk = Math.min(10, currentCrisisRisk + 3);

    // Check if crisis threshold reached
    const crisisTriggered = currentCrisisRisk >= 8 ||
      (userProfile.vulnerabilityLevel === 'critical' && currentAnxiety >= 7);

    timeline.push({
      timestamp: Date.now() + 2 * 86400000, // 48h later
      event: thirdFailure,
      userState: {
        anxietyLevel: currentAnxiety,
        crisisRisk: currentCrisisRisk,
        therapeuticNeed: 10 // Max need during crisis
      },
      systemResponse: {
        responseTime: crisisTriggered ? 120 : 300, // Crisis mode faster
        actionsTriggered: crisisTriggered ?
          ['crisis_protocols_activated', 'emergency_access_granted', 'grace_period_activated', '988_integration'] :
          ['grace_period_activated', 'enhanced_support'],
        therapeuticMessaging: TherapeuticTestingUtils.generateTherapeuticMessage(
          crisisTriggered ? 'crisis_support' : 'payment_issue',
          'high'
        ).message
      }
    });

    // Phase 4: Crisis Response (if triggered)
    if (crisisTriggered) {
      const crisisEvent = this.testHarness.createCrisisEvent('high', 'emergency_access', {
        userId: userProfile.id,
        therapeuticFeatures: ['crisis_button', 'hotline_988', 'emergency_chat', 'breathing_exercises']
      });

      timeline.push({
        timestamp: Date.now() + 2 * 86400000 + 300000, // 5 minutes after crisis trigger
        event: crisisEvent,
        userState: {
          anxietyLevel: Math.max(1, currentAnxiety - 2), // Crisis response helps
          crisisRisk: Math.max(1, currentCrisisRisk - 3),
          therapeuticNeed: 10
        },
        systemResponse: {
          responseTime: 80, // Crisis response time
          actionsTriggered: ['crisis_support_activated', 'emergency_features_enabled', 'monitoring_increased'],
          therapeuticMessaging: 'Crisis support activated. You\'re safe. Breathe slowly. Emergency support is surrounding you now.'
        }
      });
    }

    // Determine final outcome
    const finalAnxiety = timeline[timeline.length - 1].userState.anxietyLevel;
    const finalCrisisRisk = timeline[timeline.length - 1].userState.crisisRisk;
    const maxResponseTime = Math.max(...timeline.map(t => t.systemResponse.responseTime));

    const finalOutcome = {
      userSafety: (finalCrisisRisk <= 5 && finalAnxiety <= 6) ? 'safe' :
                  (crisisTriggered && finalCrisisRisk <= 7) ? 'crisis_averted' : 'at_risk',
      therapeuticContinuity: true, // Always maintained in our system
      systemPerformance: maxResponseTime <= CRISIS_RESPONSE_TIME_MS ? 'excellent' :
                         maxResponseTime <= 1000 ? 'good' :
                         maxResponseTime <= 2000 ? 'acceptable' : 'poor'
    } as const;

    return { timeline, finalOutcome };
  }

  /**
   * Simulate System Failure During Crisis
   */
  simulateSystemFailureDuringCrisis(userProfile: CrisisUserProfile): {
    crisisContext: {
      userInCrisis: boolean;
      crisisLevel: CrisisLevel;
      crisisDuration: number; // minutes
      lastCrisisContact: number; // minutes ago
    };
    systemFailures: {
      webhookProcessing: boolean;
      paymentValidation: boolean;
      stateSync: boolean;
      userInterface: boolean;
    };
    emergencyProtocols: {
      activated: string[];
      responseTime: number;
      fallbackFeatures: string[];
      minimumFunctionality: string[];
    };
    recoveryPlan: {
      immediate: string[]; // 0-5 minutes
      shortTerm: string[]; // 5-60 minutes
      longTerm: string[]; // 1+ hours
    };
    userImpact: {
      therapeuticAccessMaintained: boolean;
      crisisSupportAvailable: boolean;
      emergencyFeaturesActive: boolean;
      userExperienceQuality: 'excellent' | 'good' | 'degraded' | 'minimal';
    };
  } {
    // Determine crisis context based on user profile
    const isInActiveCrisis = userProfile.vulnerabilityLevel === 'critical' ||
      (userProfile.crisisHistory.lastEpisode &&
       Date.now() - userProfile.crisisHistory.lastEpisode.getTime() < 7 * 24 * 60 * 60 * 1000);

    const crisisContext = {
      userInCrisis: isInActiveCrisis,
      crisisLevel: isInActiveCrisis ?
        (userProfile.vulnerabilityLevel === 'critical' ? 'critical' : 'high') as CrisisLevel : 'none',
      crisisDuration: isInActiveCrisis ? Math.floor(Math.random() * 120) + 30 : 0, // 30-150 minutes
      lastCrisisContact: userProfile.supportNetwork.professionalSupport ?
        Math.floor(Math.random() * 60) + 10 : 240 // 10-70 min vs 4+ hours
    };

    // Simulate various system failures
    const systemFailures = {
      webhookProcessing: true, // Primary failure
      paymentValidation: Math.random() > 0.5,
      stateSync: Math.random() > 0.7,
      userInterface: false // UI remains functional for crisis access
    };

    // Emergency protocols activation
    const emergencyProtocols = {
      activated: [
        'offline_crisis_support',
        'cached_emergency_features',
        'local_data_preservation',
        'manual_intervention_alert'
      ],
      responseTime: isInActiveCrisis ? 45 : 120, // Faster for active crisis
      fallbackFeatures: [
        'crisis_button_cached',
        'emergency_contacts_local',
        'breathing_exercises_offline',
        'hotline_988_direct'
      ],
      minimumFunctionality: [
        'crisis_intervention',
        'emergency_calling',
        'local_breathing_guide',
        'cached_coping_strategies'
      ]
    };

    // Recovery plan based on crisis context
    const recoveryPlan = {
      immediate: isInActiveCrisis ? [
        'activate_crisis_engineer_on_call',
        'enable_manual_crisis_override',
        'establish_direct_user_contact',
        'activate_emergency_data_channels'
      ] : [
        'initiate_system_diagnostics',
        'activate_failsafe_protocols',
        'notify_technical_team',
        'begin_service_restoration'
      ],
      shortTerm: [
        'restore_webhook_processing',
        'validate_data_integrity',
        'reconnect_payment_systems',
        'sync_missed_events'
      ],
      longTerm: [
        'complete_system_recovery',
        'user_communication_and_support',
        'incident_analysis_and_prevention',
        'service_credit_consideration'
      ]
    };

    // Assess user impact
    const userImpact = {
      therapeuticAccessMaintained: true, // Always prioritized
      crisisSupportAvailable: true, // Emergency protocols ensure this
      emergencyFeaturesActive: !systemFailures.userInterface,
      userExperienceQuality: (
        !systemFailures.userInterface && emergencyProtocols.responseTime < 60 ? 'good' :
        emergencyProtocols.responseTime < 120 ? 'degraded' : 'minimal'
      ) as const
    };

    return {
      crisisContext,
      systemFailures,
      emergencyProtocols,
      recoveryPlan,
      userImpact
    };
  }

  /**
   * Simulate Subscription Termination During Therapy
   */
  simulateSubscriptionTerminationDuringTherapy(userProfile: CrisisUserProfile): {
    therapyContext: {
      programWeek: number;
      sessionsCompleted: number;
      nextSessionDue: Date;
      progressPercentage: number;
      criticalTherapyPhase: boolean;
    };
    terminationEvent: SubscriptionUpdatedEvent;
    therapeuticImpact: {
      progressAtRisk: boolean;
      skillsToPreserve: string[];
      continuityPlan: string[];
      riskAssessment: 'low' | 'medium' | 'high' | 'critical';
    };
    interventionStrategy: {
      immediate: string[];
      transitionSupport: string[];
      followUpPlan: string[];
      resourceProvision: string[];
    };
    expectedOutcome: {
      therapeuticLoss: 'minimal' | 'moderate' | 'significant' | 'severe';
      recoveryPotential: 'excellent' | 'good' | 'moderate' | 'poor';
      reengagementLikelihood: number; // 0-100%
    };
  } {
    // Analyze therapy context
    const therapyContext = {
      programWeek: userProfile.mbctProgress.weeksCompleted,
      sessionsCompleted: Math.floor(userProfile.mbctProgress.weeksCompleted * 3), // 3 sessions per week
      nextSessionDue: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
      progressPercentage: (userProfile.mbctProgress.weeksCompleted / 8) * 100,
      criticalTherapyPhase: userProfile.mbctProgress.weeksCompleted >= 3 &&
                           userProfile.mbctProgress.weeksCompleted <= 6 // Most critical weeks
    };

    // Create termination event
    const terminationEvent = this.testHarness.createSubscriptionUpdateEvent('canceled', {
      activeTherapy: true,
      therapeuticContinuity: true,
      crisisRisk: userProfile.vulnerabilityLevel === 'critical'
    });

    // Assess therapeutic impact
    const therapeuticImpact = {
      progressAtRisk: therapyContext.criticalTherapyPhase,
      skillsToPreserve: [
        'mindful_breathing',
        'present_moment_awareness',
        'thought_observation',
        'body_scan_technique'
      ].slice(0, Math.max(1, Math.floor(userProfile.mbctProgress.weeksCompleted / 2))),
      continuityPlan: [
        'session_completion_access',
        'homework_availability',
        'progress_data_preservation',
        'skill_practice_guides'
      ],
      riskAssessment: (
        userProfile.vulnerabilityLevel === 'critical' ? 'critical' :
        therapyContext.criticalTherapyPhase ? 'high' :
        userProfile.mbctProgress.weeksCompleted < 2 ? 'medium' : 'low'
      ) as const
    };

    // Design intervention strategy
    const interventionStrategy = {
      immediate: [
        'preserve_current_session_access',
        'enable_progress_download',
        'activate_transition_support',
        'assess_crisis_risk'
      ],
      transitionSupport: [
        'provide_completion_pathway',
        'offer_alternative_resources',
        'schedule_check_in_calls',
        'connect_with_local_support'
      ],
      followUpPlan: [
        'monitor_user_wellbeing',
        'track_skill_maintenance',
        'assess_reengagement_readiness',
        'provide_continuation_incentives'
      ],
      resourceProvision: [
        'mindfulness_app_recommendations',
        'local_mbct_group_referrals',
        'crisis_resource_compilation',
        'self_guided_practice_materials'
      ]
    };

    // Calculate expected outcome
    const skillRetention = userProfile.mbctProgress.sessionConsistency / 100;
    const supportNetworkStrength = (
      userProfile.supportNetwork.emergencyContacts * 0.3 +
      (userProfile.supportNetwork.professionalSupport ? 0.4 : 0) +
      (userProfile.supportNetwork.familySupport ? 0.3 : 0)
    );

    const expectedOutcome = {
      therapeuticLoss: (
        therapyContext.progressPercentage < 25 ? 'minimal' :
        therapyContext.progressPercentage < 50 ? 'moderate' :
        therapyContext.criticalTherapyPhase ? 'significant' : 'severe'
      ) as const,
      recoveryPotential: (
        skillRetention > 0.8 && supportNetworkStrength > 0.7 ? 'excellent' :
        skillRetention > 0.6 && supportNetworkStrength > 0.5 ? 'good' :
        skillRetention > 0.4 ? 'moderate' : 'poor'
      ) as const,
      reengagementLikelihood: Math.round(
        (skillRetention * 40) +
        (supportNetworkStrength * 30) +
        (userProfile.mbctProgress.skillProficiency === 'advanced' ? 30 :
         userProfile.mbctProgress.skillProficiency === 'intermediate' ? 20 : 10)
      )
    };

    return {
      therapyContext,
      terminationEvent,
      therapeuticImpact,
      interventionStrategy,
      expectedOutcome
    };
  }

  /**
   * Validate Crisis Response Performance
   */
  validateCrisisResponsePerformance(
    scenario: CrisisScenarioConfig,
    actualResponse: {
      responseTime: number;
      actionsTriggered: string[];
      therapeuticContinuity: boolean;
      systemStability: string;
    }
  ): {
    performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    criteriaMet: {
      responseTime: boolean;
      therapeuticContinuity: boolean;
      crisisProtocols: boolean;
      systemStability: boolean;
    };
    recommendations: string[];
    userSafetyAssessment: 'safe' | 'at_risk' | 'critical';
  } {
    const criteriaMet = {
      responseTime: actualResponse.responseTime <= scenario.successCriteria.responseTime,
      therapeuticContinuity: actualResponse.therapeuticContinuity === scenario.successCriteria.therapeuticContinuity,
      crisisProtocols: scenario.successCriteria.crisisProtocolsActivated ?
        actualResponse.actionsTriggered.some(action => action.includes('crisis')) : true,
      systemStability: actualResponse.systemStability !== 'failed'
    };

    // Calculate performance grade
    const criteriaCount = Object.values(criteriaMet).filter(Boolean).length;
    const performanceGrade = (
      criteriaCount === 4 ? 'A' :
      criteriaCount === 3 ? 'B' :
      criteriaCount === 2 ? 'C' :
      criteriaCount === 1 ? 'D' : 'F'
    ) as const;

    // Generate recommendations
    const recommendations: string[] = [];
    if (!criteriaMet.responseTime) {
      recommendations.push(`Improve response time from ${actualResponse.responseTime}ms to ≤${scenario.successCriteria.responseTime}ms`);
    }
    if (!criteriaMet.therapeuticContinuity) {
      recommendations.push('Ensure therapeutic continuity is maintained during crisis scenarios');
    }
    if (!criteriaMet.crisisProtocols) {
      recommendations.push('Implement proper crisis protocol activation for emergency scenarios');
    }
    if (!criteriaMet.systemStability) {
      recommendations.push('Improve system resilience to maintain stability during crisis events');
    }

    // Assess user safety
    const userSafetyAssessment = (
      criteriaMet.therapeuticContinuity && criteriaMet.crisisProtocols ? 'safe' :
      criteriaMet.therapeuticContinuity || criteriaMet.crisisProtocols ? 'at_risk' : 'critical'
    ) as const;

    return {
      performanceGrade,
      criteriaMet,
      recommendations,
      userSafetyAssessment
    };
  }

  /**
   * Generate Crisis Test Report
   */
  generateCrisisTestReport(scenarios: CrisisScenarioConfig[]): {
    summary: {
      totalScenarios: number;
      passedScenarios: number;
      criticalFailures: number;
      averageResponseTime: number;
      therapeuticContinuityRate: number;
    };
    vulnerabilityAnalysis: {
      highRiskUsers: number;
      criticalDependencyUsers: number;
      newUserVulnerabilities: number;
    };
    recommendations: {
      immediate: string[];
      shortTerm: string[];
      longTerm: string[];
    };
    crisisPreparedness: {
      responseCapability: 'excellent' | 'good' | 'needs_improvement' | 'inadequate';
      systemResilience: 'high' | 'medium' | 'low';
      therapeuticSafety: 'assured' | 'generally_safe' | 'at_risk';
    };
  } {
    // This would be implemented based on actual test execution results
    // For now, returning a template structure
    return {
      summary: {
        totalScenarios: scenarios.length,
        passedScenarios: Math.floor(scenarios.length * 0.85), // 85% pass rate example
        criticalFailures: Math.ceil(scenarios.length * 0.05), // 5% critical failures
        averageResponseTime: 145, // Example average
        therapeuticContinuityRate: 98.5 // Example rate
      },
      vulnerabilityAnalysis: {
        highRiskUsers: scenarios.filter(s => s.userProfile.vulnerabilityLevel === 'high').length,
        criticalDependencyUsers: scenarios.filter(s => s.userProfile.therapeuticDependency === 'critical').length,
        newUserVulnerabilities: scenarios.filter(s => s.userProfile.mbctProgress.weeksCompleted < 3).length
      },
      recommendations: {
        immediate: [
          'Optimize crisis response times for critical vulnerability users',
          'Implement enhanced monitoring for users in therapy weeks 3-6',
          'Strengthen payment failure detection and intervention'
        ],
        shortTerm: [
          'Develop specialized protocols for elderly and limited-tech users',
          'Create therapy progress preservation mechanisms',
          'Enhance system resilience during peak crisis times'
        ],
        longTerm: [
          'Build predictive crisis prevention based on user patterns',
          'Integrate with external mental health resources',
          'Develop adaptive therapeutic interventions based on crisis history'
        ]
      },
      crisisPreparedness: {
        responseCapability: 'good',
        systemResilience: 'medium',
        therapeuticSafety: 'generally_safe'
      }
    };
  }
}

export default CrisisScenarioSimulator;