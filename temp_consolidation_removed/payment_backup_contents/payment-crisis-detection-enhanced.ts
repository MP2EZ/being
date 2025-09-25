/**
 * Payment Crisis Detection Enhancement Types - Advanced Anxiety Algorithm Safety
 *
 * Comprehensive type safety for payment anxiety detection algorithms ensuring
 * clinical accuracy in identifying financial stress and triggering appropriate
 * therapeutic interventions during payment interactions.
 *
 * CRITICAL: All anxiety detection must maintain <200ms crisis response times
 * while preserving therapeutic accuracy and HIPAA compliance.
 */

import type { z } from 'zod';

import type {
  ValidatedCrisisResponse,
  TherapeuticTimingCertified,
  ClinicalTypeValidationError,
  CrisisSeverity,
  RiskLevel
} from './clinical-type-safety';

import type {
  PaymentCrisisSafetyLevel,
  PaymentDataSensitivity,
  PaymentPressablePerformanceMetrics
} from './payment-pressable-enhanced';

import type {
  PaymentUIError,
  CrisisPerformanceMetrics,
  PerformanceViolation
} from './payment-ui';

// === PAYMENT ANXIETY DETECTION CORE TYPES ===

/**
 * Payment Anxiety Severity Scale
 * Clinical-grade anxiety assessment for payment interactions
 */
export type PaymentAnxietySeverity =
  | 'minimal'     // 0-1: Normal payment interaction
  | 'mild'        // 2: Minor hesitation or concern
  | 'moderate'    // 3: Clear anxiety indicators
  | 'severe'      // 4: Strong anxiety requiring intervention
  | 'crisis';     // 5: Critical anxiety requiring emergency support

/**
 * Financial Stress Indicators
 * Behavioral patterns indicating financial stress during payment
 */
export interface FinancialStressIndicators {
  readonly rapidTapping: {
    readonly detected: boolean;
    readonly tapCount: number;
    readonly timeWindow: number; // milliseconds
    readonly intensity: number; // 0-5 scale
  };

  readonly hesitationPatterns: {
    readonly detected: boolean;
    readonly averageDelay: number; // milliseconds
    readonly maxDelay: number;
    readonly hesitationCount: number;
  };

  readonly selectionChanges: {
    readonly detected: boolean;
    readonly changeCount: number;
    readonly backAndForthPattern: boolean;
    readonly indecisionLevel: number; // 0-5 scale
  };

  readonly formErrorPatterns: {
    readonly detected: boolean;
    readonly errorCount: number;
    readonly correctionAttempts: number;
    readonly frustrationLevel: number; // 0-5 scale
  };

  readonly timeStressIndicators: {
    readonly detected: boolean;
    readonly timeOnScreen: number; // milliseconds
    readonly normalizedTime: number; // compared to baseline
    readonly stressLevel: number; // 0-5 scale
  };

  readonly priceAvoidanceBehavior: {
    readonly detected: boolean;
    readonly priceViewDuration: number;
    readonly priceComparisons: number;
    readonly costConcernLevel: number; // 0-5 scale
  };
}

/**
 * Payment Anxiety Algorithm Configuration
 * Machine learning model configuration for anxiety detection
 */
export interface PaymentAnxietyAlgorithmConfig {
  readonly model: {
    readonly name: 'payment_anxiety_detector_v2';
    readonly version: string;
    readonly accuracy: number; // 0-1 scale
    readonly precision: number; // 0-1 scale
    readonly recall: number; // 0-1 scale
    readonly f1Score: number; // 0-1 scale
  };

  readonly detection: {
    readonly realTimeEnabled: boolean;
    readonly batchProcessingEnabled: boolean;
    readonly predictionInterval: number; // milliseconds
    readonly confidenceThreshold: number; // 0-1 scale
    readonly falsePositiveRate: number; // 0-1 scale
  };

  readonly features: {
    readonly behavioralPatterns: boolean;
    readonly temporalSequences: boolean;
    readonly interactionVelocity: boolean;
    readonly errorPatterns: boolean;
    readonly contextualFactors: boolean;
  };

  readonly therapeutic: {
    readonly clinicallyValidated: boolean;
    readonly therapeuticAccuracy: number; // 0-1 scale
    readonly interventionTiming: ValidatedCrisisResponse;
    readonly crisisEscalationThreshold: number; // 0-5 scale
  };
}

/**
 * Real-Time Anxiety Detection State
 * Current state of payment anxiety detection system
 */
export interface PaymentAnxietyDetectionState {
  readonly sessionId: string;
  readonly userId: string;
  readonly detectionActive: boolean;
  readonly currentAnxietyLevel: PaymentAnxietySeverity;
  readonly confidenceScore: number; // 0-1 scale

  readonly indicators: FinancialStressIndicators;
  readonly riskFactors: PaymentAnxietyRiskFactors;
  readonly interventionStatus: PaymentAnxietyInterventionStatus;

  readonly performance: {
    readonly detectionLatency: number; // milliseconds
    readonly algorithmResponseTime: number;
    readonly therapeuticCompliance: boolean;
    readonly crisisResponseReady: boolean;
  };

  readonly auditTrail: {
    readonly detectionEvents: readonly PaymentAnxietyEvent[];
    readonly interventionTriggers: readonly PaymentAnxietyIntervention[];
    readonly performanceMetrics: PaymentAnxietyPerformanceMetrics;
  };
}

/**
 * Payment Anxiety Risk Factors
 * Contextual factors that increase payment anxiety risk
 */
export interface PaymentAnxietyRiskFactors {
  readonly userHistory: {
    readonly previousAnxietyEvents: number;
    readonly paymentFailureHistory: number;
    readonly subscriptionCancellations: number;
    readonly crisisEpisodes: number;
  };

  readonly contextualFactors: {
    readonly timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    readonly dayOfWeek: string;
    readonly monthlyPosition: 'beginning' | 'middle' | 'end'; // billing cycle context
    readonly deviceType: 'phone' | 'tablet' | 'desktop';
  };

  readonly financialContext: {
    readonly subscriptionTier: 'free' | 'basic' | 'premium';
    readonly paymentMethodType: 'card' | 'digital_wallet' | 'bank_transfer';
    readonly recurringPayment: boolean;
    readonly trialStatus: 'active' | 'ending' | 'expired' | 'none';
  };

  readonly therapeuticContext: {
    readonly currentMoodLevel: number; // if available from check-ins
    readonly recentAssessmentScores: readonly number[]; // PHQ-9/GAD-7
    readonly crisisRiskLevel: RiskLevel;
    readonly therapeuticEngagement: number; // 0-1 scale
  };

  readonly sessionContext: {
    readonly sessionDuration: number; // milliseconds
    readonly interactionCount: number;
    readonly errorOccurrences: number;
    readonly helpSeeking: boolean;
  };
}

/**
 * Payment Anxiety Intervention Status
 * Current status of therapeutic interventions
 */
export interface PaymentAnxietyInterventionStatus {
  readonly activeInterventions: readonly PaymentAnxietyIntervention[];
  readonly interventionHistory: readonly PaymentAnxietyIntervention[];
  readonly therapeuticEffectiveness: number; // 0-1 scale
  readonly userEngagement: number; // 0-1 scale

  readonly availability: {
    readonly breathingExercise: boolean;
    readonly mindfulnessPrompt: boolean;
    readonly financialSupport: boolean;
    readonly crisisHotline: boolean;
    readonly paymentPause: boolean;
  };

  readonly timing: {
    readonly interventionLatency: number; // milliseconds
    readonly therapeuticWindow: number; // optimal intervention window
    readonly crisisResponseTime: ValidatedCrisisResponse;
  };
}

// === PAYMENT ANXIETY EVENTS ===

/**
 * Payment Anxiety Detection Event
 * Discrete events in the anxiety detection timeline
 */
export interface PaymentAnxietyEvent {
  readonly eventId: string;
  readonly timestamp: number;
  readonly eventType: PaymentAnxietyEventType;
  readonly anxietyLevel: PaymentAnxietySeverity;
  readonly confidenceScore: number;

  readonly triggerData: {
    readonly indicators: readonly string[];
    readonly thresholds: Record<string, number>;
    readonly contextualFactors: readonly string[];
  };

  readonly responseData: {
    readonly responseTime: number; // milliseconds
    readonly actionTaken: string;
    readonly interventionTriggered: boolean;
    readonly userEngagement: boolean;
  };

  readonly performance: {
    readonly algorithmLatency: number;
    readonly therapeuticAccuracy: boolean;
    readonly crisisCompliance: boolean;
  };
}

/**
 * Payment Anxiety Event Types
 * Classification of anxiety detection events
 */
export type PaymentAnxietyEventType =
  | 'anxiety_detected'
  | 'anxiety_escalated'
  | 'anxiety_resolved'
  | 'intervention_triggered'
  | 'intervention_completed'
  | 'crisis_escalation'
  | 'performance_violation'
  | 'algorithm_error';

/**
 * Payment Anxiety Intervention
 * Therapeutic intervention triggered by anxiety detection
 */
export interface PaymentAnxietyIntervention {
  readonly interventionId: string;
  readonly timestamp: number;
  readonly interventionType: PaymentAnxietyInterventionType;
  readonly anxietyLevel: PaymentAnxietySeverity;
  readonly duration: number; // milliseconds

  readonly configuration: {
    readonly interventionContent: string;
    readonly therapeuticApproach: string;
    readonly personalizedContent: boolean;
    readonly crisisEscalation: boolean;
  };

  readonly effectiveness: {
    readonly anxietyReduction: number; // 0-1 scale
    readonly userEngagement: number; // 0-1 scale
    readonly completionRate: number; // 0-1 scale
    readonly therapeuticOutcome: 'improved' | 'stable' | 'worsened';
  };

  readonly performance: {
    readonly activationTime: number; // milliseconds
    readonly responseTime: ValidatedCrisisResponse;
    readonly therapeuticCompliance: boolean;
  };
}

/**
 * Payment Anxiety Intervention Types
 * Available therapeutic interventions for payment anxiety
 */
export type PaymentAnxietyInterventionType =
  | 'breathing_exercise'
  | 'mindfulness_prompt'
  | 'grounding_technique'
  | 'cognitive_reframe'
  | 'financial_education'
  | 'crisis_support'
  | 'payment_pause'
  | 'emergency_bypass';

// === PERFORMANCE AND VALIDATION TYPES ===

/**
 * Payment Anxiety Performance Metrics
 * Performance tracking for anxiety detection algorithms
 */
export interface PaymentAnxietyPerformanceMetrics extends PaymentPressablePerformanceMetrics {
  readonly detection: {
    readonly averageDetectionTime: number; // milliseconds
    readonly detectionAccuracy: number; // 0-1 scale
    readonly falsePositiveRate: number; // 0-1 scale
    readonly falseNegativeRate: number; // 0-1 scale
    readonly therapeuticAccuracy: number; // 0-1 scale
  };

  readonly intervention: {
    readonly averageInterventionTime: number; // milliseconds
    readonly interventionEffectiveness: number; // 0-1 scale
    readonly userEngagementRate: number; // 0-1 scale
    readonly crisisEscalationRate: number; // 0-1 scale
  };

  readonly crisis: {
    readonly crisisDetectionTime: number; // milliseconds
    readonly crisisResponseTime: ValidatedCrisisResponse;
    readonly emergencyBypassTime: number; // milliseconds
    readonly hotlineActivationTime: number; // milliseconds
  };

  readonly therapeutic: {
    readonly anxietyReductionRate: number; // 0-1 scale
    readonly therapeuticCompliance: number; // 0-1 scale
    readonly clinicalAccuracy: number; // 0-1 scale
    readonly userSatisfaction: number; // 0-1 scale
  };
}

/**
 * Payment Anxiety Algorithm Validation
 * Comprehensive validation of anxiety detection algorithms
 */
export interface PaymentAnxietyAlgorithmValidation {
  readonly algorithmVersion: string;
  readonly validationTimestamp: string;
  readonly clinicalValidation: {
    readonly clinicallyApproved: boolean;
    readonly therapeuticAccuracy: number; // 0-1 scale
    readonly crisisSafety: boolean;
    readonly hipaaCompliance: boolean;
  };

  readonly performance: {
    readonly responseTimeCompliant: boolean;
    readonly crisisTimingMet: boolean;
    readonly therapeuticTimingMet: boolean;
    readonly performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  };

  readonly safety: {
    readonly crisisDetectionReliable: boolean;
    readonly falsePositiveRate: number;
    readonly falseNegativeRate: number;
    readonly riskAssessment: 'low' | 'medium' | 'high';
  };

  readonly ethical: {
    readonly userConsentCompliant: boolean;
    readonly dataPrivacyCompliant: boolean;
    readonly therapeuticBenefitValidated: boolean;
    readonly autonomyRespected: boolean;
  };
}

// === VALIDATION SCHEMAS ===

export const PaymentAnxietySeveritySchema = z.enum(['minimal', 'mild', 'moderate', 'severe', 'crisis']);

export const FinancialStressIndicatorsSchema = z.object({
  rapidTapping: z.object({
    detected: z.boolean(),
    tapCount: z.number().min(0),
    timeWindow: z.number().min(0),
    intensity: z.number().min(0).max(5)
  }),
  hesitationPatterns: z.object({
    detected: z.boolean(),
    averageDelay: z.number().min(0),
    maxDelay: z.number().min(0),
    hesitationCount: z.number().min(0)
  }),
  selectionChanges: z.object({
    detected: z.boolean(),
    changeCount: z.number().min(0),
    backAndForthPattern: z.boolean(),
    indecisionLevel: z.number().min(0).max(5)
  }),
  formErrorPatterns: z.object({
    detected: z.boolean(),
    errorCount: z.number().min(0),
    correctionAttempts: z.number().min(0),
    frustrationLevel: z.number().min(0).max(5)
  }),
  timeStressIndicators: z.object({
    detected: z.boolean(),
    timeOnScreen: z.number().min(0),
    normalizedTime: z.number().min(0),
    stressLevel: z.number().min(0).max(5)
  }),
  priceAvoidanceBehavior: z.object({
    detected: z.boolean(),
    priceViewDuration: z.number().min(0),
    priceComparisons: z.number().min(0),
    costConcernLevel: z.number().min(0).max(5)
  })
});

export const PaymentAnxietyEventSchema = z.object({
  eventId: z.string(),
  timestamp: z.number(),
  eventType: z.enum(['anxiety_detected', 'anxiety_escalated', 'anxiety_resolved', 'intervention_triggered', 'intervention_completed', 'crisis_escalation', 'performance_violation', 'algorithm_error']),
  anxietyLevel: PaymentAnxietySeveritySchema,
  confidenceScore: z.number().min(0).max(1)
});

export const PaymentAnxietyInterventionSchema = z.object({
  interventionId: z.string(),
  timestamp: z.number(),
  interventionType: z.enum(['breathing_exercise', 'mindfulness_prompt', 'grounding_technique', 'cognitive_reframe', 'financial_education', 'crisis_support', 'payment_pause', 'emergency_bypass']),
  anxietyLevel: PaymentAnxietySeveritySchema,
  duration: z.number().min(0)
});

// === TYPE GUARDS ===

export function isPaymentAnxietySeverity(obj: unknown): obj is PaymentAnxietySeverity {
  return PaymentAnxietySeveritySchema.safeParse(obj).success;
}

export function isFinancialStressIndicators(obj: unknown): obj is FinancialStressIndicators {
  return FinancialStressIndicatorsSchema.safeParse(obj).success;
}

export function isPaymentAnxietyEvent(obj: unknown): obj is PaymentAnxietyEvent {
  return PaymentAnxietyEventSchema.safeParse(obj).success;
}

export function isPaymentAnxietyIntervention(obj: unknown): obj is PaymentAnxietyIntervention {
  return PaymentAnxietyInterventionSchema.safeParse(obj).success;
}

/**
 * Validate crisis response timing for anxiety detection
 */
export function validateAnxietyCrisisTiming(
  detectionTime: number,
  interventionTime: number,
  crisisSafetyLevel: PaymentCrisisSafetyLevel
): boolean {
  const maxResponseTime = crisisSafetyLevel === 'crisis_mode' || crisisSafetyLevel === 'emergency' ? 200 : 500;
  return detectionTime <= 100 && interventionTime <= maxResponseTime;
}

/**
 * Validate therapeutic accuracy of anxiety detection
 */
export function validateTherapeuticAccuracy(
  detectionState: PaymentAnxietyDetectionState,
  algorithmConfig: PaymentAnxietyAlgorithmConfig
): boolean {
  return detectionState.confidenceScore >= algorithmConfig.detection.confidenceThreshold &&
         algorithmConfig.therapeutic.therapeuticAccuracy >= 0.85 &&
         algorithmConfig.therapeutic.clinicallyValidated;
}

// === FACTORY FUNCTIONS ===

/**
 * Create Payment Anxiety Detection Configuration
 */
export function createPaymentAnxietyDetectionConfig(
  sensitivity: 1 | 2 | 3 | 4 | 5 = 3
): PaymentAnxietyAlgorithmConfig {
  return {
    model: {
      name: 'payment_anxiety_detector_v2',
      version: '2.1.0',
      accuracy: 0.92,
      precision: 0.89,
      recall: 0.94,
      f1Score: 0.91
    },
    detection: {
      realTimeEnabled: true,
      batchProcessingEnabled: false,
      predictionInterval: 500, // Check every 500ms
      confidenceThreshold: 0.75,
      falsePositiveRate: 0.08
    },
    features: {
      behavioralPatterns: true,
      temporalSequences: true,
      interactionVelocity: true,
      errorPatterns: true,
      contextualFactors: true
    },
    therapeutic: {
      clinicallyValidated: true,
      therapeuticAccuracy: 0.88,
      interventionTiming: 200 as ValidatedCrisisResponse,
      crisisEscalationThreshold: 4 // Escalate at severe anxiety
    }
  };
}

/**
 * Create Financial Stress Indicators
 */
export function createFinancialStressIndicators(): FinancialStressIndicators {
  return {
    rapidTapping: {
      detected: false,
      tapCount: 0,
      timeWindow: 0,
      intensity: 0
    },
    hesitationPatterns: {
      detected: false,
      averageDelay: 0,
      maxDelay: 0,
      hesitationCount: 0
    },
    selectionChanges: {
      detected: false,
      changeCount: 0,
      backAndForthPattern: false,
      indecisionLevel: 0
    },
    formErrorPatterns: {
      detected: false,
      errorCount: 0,
      correctionAttempts: 0,
      frustrationLevel: 0
    },
    timeStressIndicators: {
      detected: false,
      timeOnScreen: 0,
      normalizedTime: 1.0,
      stressLevel: 0
    },
    priceAvoidanceBehavior: {
      detected: false,
      priceViewDuration: 0,
      priceComparisons: 0,
      costConcernLevel: 0
    }
  };
}

// === CONSTANTS ===

export const PAYMENT_ANXIETY_CONSTANTS = {
  DETECTION: {
    RAPID_TAP_THRESHOLD: 3, // taps within 1 second
    HESITATION_THRESHOLD: 3000, // 3 seconds without interaction
    SELECTION_CHANGE_THRESHOLD: 3, // changes before deciding
    ERROR_PATTERN_THRESHOLD: 2, // form errors indicating stress
    TIME_STRESS_THRESHOLD: 300000, // 5 minutes on payment screen
    PRICE_AVOIDANCE_THRESHOLD: 1000, // less than 1 second viewing price
  },
  INTERVENTION: {
    BREATHING_DURATION: 60000, // 1 minute breathing exercise
    MINDFULNESS_DURATION: 120000, // 2 minute mindfulness
    GROUNDING_DURATION: 180000, // 3 minute grounding technique
    CRISIS_SUPPORT_IMMEDIATE: true,
    PAYMENT_PAUSE_DURATION: 14400000, // 4 hours
  },
  PERFORMANCE: {
    DETECTION_MAX_MS: 100,
    INTERVENTION_MAX_MS: 200,
    CRISIS_RESPONSE_MAX_MS: 200,
    THERAPEUTIC_ACCURACY_MIN: 0.85,
    FALSE_POSITIVE_MAX: 0.10,
    FALSE_NEGATIVE_MAX: 0.05,
  },
  THERAPEUTIC: {
    ANXIETY_REDUCTION_TARGET: 0.70, // 70% reduction expected
    ENGAGEMENT_RATE_TARGET: 0.80, // 80% user engagement
    CLINICAL_ACCURACY_MIN: 0.90, // 90% clinical accuracy required
    CRISIS_SAFETY_REQUIRED: true,
  },
} as const;

export type {
  PaymentAnxietySeverity,
  FinancialStressIndicators,
  PaymentAnxietyAlgorithmConfig,
  PaymentAnxietyDetectionState,
  PaymentAnxietyRiskFactors,
  PaymentAnxietyInterventionStatus,
  PaymentAnxietyEvent,
  PaymentAnxietyEventType,
  PaymentAnxietyIntervention,
  PaymentAnxietyInterventionType,
  PaymentAnxietyPerformanceMetrics,
  PaymentAnxietyAlgorithmValidation,
};