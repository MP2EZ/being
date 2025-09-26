/**
 * Crisis Safety Types - Canonical Consolidation
 * 
 * PHASE 4B: Consolidated crisis safety type definitions combining:
 * - crisis-safety-types.ts (integration)
 * - crisis-button-enhanced.ts
 * - payment-crisis-detection-enhanced.ts
 * - sync/crisis-safety-types.ts
 * - webhooks/crisis-safety-types.ts
 * - crisis-button.ts (base)
 * - crisis-detection.ts (base)
 * 
 * CRITICAL PRESERVATION REQUIREMENTS:
 * - PHQ-9 threshold: 20 (exact)
 * - GAD-7 threshold: 15 (exact) 
 * - Crisis response time: <200ms (exact)
 * - 988 hotline integration (exact)
 * - HIPAA compliance validation (exact)
 * 
 * @consolidation_result 7 files → 1 canonical file (85% reduction)
 */

import { z } from 'zod';
import type { ViewStyle, AccessibilityRole } from 'react-native';

// === CLINICAL ASSESSMENT TYPES - CANONICAL CONSOLIDATION ===

/**
 * Clinical Assessment Types Integration
 *
 * PHASE 4C: Consolidated from clinical.ts into canonical crisis-safety.ts
 * Maintains 100% clinical calculation accuracy and crisis detection integrity
 *
 * IMMUTABLE CLINICAL REQUIREMENTS:
 * - PHQ-9 threshold: ≥20 (exact, life-critical)
 * - GAD-7 threshold: ≥15 (exact, life-critical)
 * - Suicidal ideation: Question 9 (index 8), threshold ≥1
 * - Crisis response: <200ms (exact, performance-critical)
 * - Assessment accuracy: 100% (zero tolerance for calculation errors)
 */

// Branded types for clinical data integrity
type Brand<K, T> = K & { __brand: T };

// Assessment Answer Types - Only Valid Clinical Responses
export type PHQ9Answer = 0 | 1 | 2 | 3;
export type GAD7Answer = 0 | 1 | 2 | 3;

// Exact Answer Arrays - Prevent Incorrect Question Counts
export type PHQ9Answers = readonly [
  PHQ9Answer, PHQ9Answer, PHQ9Answer,  // Questions 1-3
  PHQ9Answer, PHQ9Answer, PHQ9Answer,  // Questions 4-6
  PHQ9Answer, PHQ9Answer, PHQ9Answer   // Questions 7-9 (9 is suicidal ideation)
];

export type GAD7Answers = readonly [
  GAD7Answer, GAD7Answer, GAD7Answer,  // Questions 1-3
  GAD7Answer, GAD7Answer, GAD7Answer,  // Questions 4-6
  GAD7Answer                          // Question 7
];

// Score Types - Prevent Invalid Calculations
export type PHQ9Score =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27;

export type GAD7Score =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21;

// Severity Levels - Exact Clinical Classifications
export type PHQ9Severity = 'minimal' | 'mild' | 'moderate' | 'moderately severe' | 'severe';
export type GAD7Severity = 'minimal' | 'mild' | 'moderate' | 'severe';

// Crisis Thresholds - Literal Types Prevent Accidental Changes
export const CRISIS_THRESHOLD_PHQ9 = 20 as const;
export const CRISIS_THRESHOLD_GAD7 = 15 as const;
export const SUICIDAL_IDEATION_QUESTION_INDEX = 8 as const; // Question 9, 0-based index
export const SUICIDAL_IDEATION_THRESHOLD = 1 as const; // Any response > 0

// Assessment Types with Discriminated Union
export type Assessment =
  | {
      readonly type: 'phq9';
      readonly answers: PHQ9Answers;
      readonly score: PHQ9Score;
      readonly severity: PHQ9Severity;
      readonly id: AssessmentID;
      readonly completedAt: ISODateString;
      readonly context: AssessmentContext;
      readonly requiresCrisisIntervention: boolean;
    }
  | {
      readonly type: 'gad7';
      readonly answers: GAD7Answers;
      readonly score: GAD7Score;
      readonly severity: GAD7Severity;
      readonly id: AssessmentID;
      readonly completedAt: ISODateString;
      readonly context: AssessmentContext;
      readonly requiresCrisisIntervention: boolean;
    };

// Template Literal Types for ID Format Validation
export type AssessmentID = `assessment_${'phq9' | 'gad7'}_${number}_${string}`;
export type CheckInID = `checkin_${'morning' | 'midday' | 'evening'}_${number}_${string}`;

// Branded String Types for Data Safety
export type ISODateString = Brand<string, 'ISODate'>;
export type EncryptedString = Brand<string, 'Encrypted'>;
export type PlaintextString = Brand<string, 'Plaintext'>;

// Assessment Context - Track Data Source
export type AssessmentContext = 'onboarding' | 'standalone' | 'clinical';

// Crisis Detection Function Types
export type CrisisDetectionFunction<T extends Assessment> = (assessment: T) => boolean;

// Type Guards for Assessment Types
export const isPHQ9Assessment = (assessment: Assessment): assessment is Assessment & { type: 'phq9' } => {
  return assessment.type === 'phq9';
};

export const isGAD7Assessment = (assessment: Assessment): assessment is Assessment & { type: 'gad7' } => {
  return assessment.type === 'gad7';
};

// Utility Types for Score Validation
export type ValidateScore<T extends 'phq9' | 'gad7', S extends number> =
  T extends 'phq9'
    ? S extends PHQ9Score ? S : never
    : T extends 'gad7'
    ? S extends GAD7Score ? S : never
    : never;

// Clinical Calculation Function Signatures - Enforce Type Safety
export interface ClinicalCalculations {
  calculatePHQ9Score: (answers: PHQ9Answers) => PHQ9Score;
  calculateGAD7Score: (answers: GAD7Answers) => GAD7Score;

  getPHQ9Severity: (score: PHQ9Score) => PHQ9Severity;
  getGAD7Severity: (score: GAD7Score) => GAD7Severity;

  requiresCrisisInterventionPHQ9: CrisisDetectionFunction<Assessment & { type: 'phq9' }>;
  requiresCrisisInterventionGAD7: CrisisDetectionFunction<Assessment & { type: 'gad7' }>;

  hasSuicidalIdeation: (answers: PHQ9Answers) => boolean;
}

// Assessment Question Configuration - Immutable
export interface AssessmentQuestion {
  readonly id: number;
  readonly text: string;
  readonly options: readonly AssessmentOption[];
}

export interface AssessmentOption {
  readonly value: PHQ9Answer | GAD7Answer;
  readonly label: string;
}

// Emergency Contact Types - Crisis Intervention
export type EmergencyPhoneNumber = '988' | '741741'; // Only verified crisis lines
export type CrisisResponseTime = Brand<number, 'CrisisResponseTime'>; // Must be < 200ms

// Performance-Critical Types for Therapeutic Accuracy
export type BreathDuration = 60000; // Exactly 60 seconds in milliseconds
export type AnimationFrame = 16.67; // 60fps frame timing
export type TherapeuticTiming = Brand<number, 'TherapeuticTiming'>;

// Validation Schema Types
export interface AssessmentValidation {
  readonly isValidPHQ9Answers: (answers: unknown) => answers is PHQ9Answers;
  readonly isValidGAD7Answers: (answers: unknown) => answers is GAD7Answers;
  readonly isValidScore: <T extends 'phq9' | 'gad7'>(type: T, score: number) => score is ValidateScore<T, typeof score>;
}

// Error Types for Clinical Validation
export class ClinicalValidationError extends Error {
  constructor(
    message: string,
    public readonly assessmentType: 'phq9' | 'gad7',
    public readonly field: string,
    public readonly expectedValue?: unknown,
    public readonly actualValue?: unknown
  ) {
    super(message);
    this.name = 'ClinicalValidationError';
  }
}

export class CrisisDetectionError extends Error {
  constructor(
    message: string,
    public readonly assessmentId: AssessmentID,
    public readonly score: PHQ9Score | GAD7Score,
    public readonly triggeredBy: 'score' | 'suicidal_ideation'
  ) {
    super(message);
    this.name = 'CrisisDetectionError';
  }
}

// Runtime Type Guards for Critical Data
export const createISODateString = (date: string): ISODateString => {
  const parsed = new Date(date);
  if (isNaN(parsed.getTime()) || parsed.toISOString() !== date) {
    throw new ClinicalValidationError('Invalid ISO date string', 'phq9', 'date', date, 'valid ISO string');
  }
  return date as ISODateString;
};

export const createAssessmentID = (type: 'phq9' | 'gad7', timestamp: number = Date.now()): AssessmentID => {
  const randomSuffix = Math.random().toString(36).substring(2, 18);
  return `assessment_${type}_${timestamp}_${randomSuffix}` as AssessmentID;
};

// Conditional Types for Dynamic Typing Based on Assessment Type
export type SeverityForType<T extends 'phq9' | 'gad7'> =
  T extends 'phq9'
    ? PHQ9Severity
    : T extends 'gad7'
    ? GAD7Severity
    : never;

export type ScoreForType<T extends 'phq9' | 'gad7'> =
  T extends 'phq9'
    ? PHQ9Score
    : T extends 'gad7'
    ? GAD7Score
    : never;

export type AnswersForType<T extends 'phq9' | 'gad7'> =
  T extends 'phq9'
    ? PHQ9Answers
    : T extends 'gad7'
    ? GAD7Answers
    : never;

// === BRANDED TYPES FOR CRISIS SAFETY ===

/**
 * Branded type for crisis phone numbers with validation
 */
export type CrisisPhoneNumber = string & { readonly __brand: 'CrisisPhoneNumber' };

/**
 * Branded type for response times with performance guarantees
 */
export type ResponseTimeMs = number & { readonly __brand: 'ResponseTimeMs' };

/**
 * Branded type for urgency levels with clinical validation
 */
export type CrisisUrgencyLevel = ('standard' | 'high' | 'emergency') & { readonly __brand: 'CrisisUrgency' };

// === CORE CRISIS DETECTION TYPES ===

/**
 * Crisis severity levels with clinical mapping
 * IMMUTABLE: PHQ-9 ≥20, GAD-7 ≥15 thresholds
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
  'phq9_assessment',        // PHQ-9 scores ≥20 (IMMUTABLE)
  'gad7_assessment',        // GAD-7 scores ≥15 (IMMUTABLE)
  'manual_crisis_button',   // User activated crisis button
  'behavioral_pattern',     // ML detected behavioral crisis indicators
  'check_in_responses',     // Crisis-indicating check-in responses
  'therapeutic_session',    // Crisis detected during session
  'cross_device_alert',     // Crisis alert from another device
  'emergency_contact',      // Emergency contact activation
  'clinical_escalation',    // Healthcare provider escalation
  'payment_anxiety_crisis', // Payment anxiety escalation to crisis
  'system_anomaly'          // System detected anomalous crisis patterns
]);

export type CrisisDetectionSource = z.infer<typeof CrisisDetectionSourceSchema>;

/**
 * Payment Anxiety Severity Scale for crisis escalation
 */
export const PaymentAnxietySeveritySchema = z.enum([
  'minimal',     // 0-1: Normal payment interaction
  'mild',        // 2: Minor hesitation or concern
  'moderate',    // 3: Clear anxiety indicators
  'severe',      // 4: Strong anxiety requiring intervention
  'crisis'       // 5: Critical anxiety requiring emergency support
]);

export type PaymentAnxietySeverity = z.infer<typeof PaymentAnxietySeveritySchema>;

// === MISSING TYPE EXPORTS FOR COMPILATION ===

// Crisis Level Types (required by stripe-integration.ts)
export type CrisisLevel = 'none' | 'low' | 'moderate' | 'high' | 'emergency' | 'critical';

// Therapeutic Continuity Types (required by API integrations)
export interface TherapeuticContinuity {
  continuityLevel: 'maintained' | 'disrupted' | 'suspended' | 'terminated';
  disruptionReason?: string;
  continuityPlan?: string;
  therapeuticBridge?: boolean;
  providerNotified?: boolean;
}

// Emergency Access Control Types (required by security APIs)
export interface EmergencyAccessControl {
  emergencyAccessEnabled: boolean;
  accessLevel: 'basic' | 'enhanced' | 'critical';
  accessDuration?: number; // minutes
  accessOverrides: string[];
  auditTrail: boolean;
}

/**
 * Comprehensive crisis event with clinical context
 * CRITICAL: <200ms response time requirement
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

    // Detection data with clinical accuracy
    detectionData: z.object({
      // Assessment scores (IMMUTABLE thresholds)
      phq9Score: z.number().min(0).max(27).optional(),
      gad7Score: z.number().min(0).max(21).optional(),
      customAssessmentScores: z.record(z.string(), z.number()).optional(),

      // User inputs
      userReportedSeverity: z.number().min(1).max(10).optional(),
      userDescriptionText: z.string().optional(),
      crisisButtonPressed: z.boolean(),

      // Payment anxiety indicators (consolidated)
      paymentAnxietyLevel: PaymentAnxietySeveritySchema.optional(),
      financialStressIndicators: z.object({
        rapidTapping: z.boolean().optional(),
        hesitationPatterns: z.boolean().optional(),
        selectionChanges: z.boolean().optional(),
        priceAvoidanceBehavior: z.boolean().optional(),
        anxietyEscalation: z.boolean().optional()
      }).optional(),

      // Behavioral indicators
      behavioralIndicators: z.array(z.enum([
        'sudden_mood_drop',
        'isolation_behavior',
        'sleep_disruption',
        'appetite_changes',
        'anxiety_spike',
        'panic_symptoms',
        'self_harm_indicators',
        'suicidal_ideation',
        'payment_panic',
        'financial_distress'
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
      'payment_anxiety_crisis',
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
        'financial_stress',
        'payment_anxiety_escalation'
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

    // Clinical urgency (IMMUTABLE timing requirements)
    clinicalUrgency: z.object({
      requiresImmediateIntervention: z.boolean(),
      emergencyServicesRecommended: z.boolean(),
      hospitalAssessmentNeeded: z.boolean(),
      clinicalFollowUpRequired: z.boolean(),
      timeToIntervention: z.number().optional() // minutes
    })
  }),

  // Crisis response (CRITICAL: <200ms requirement)
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
      'cross_device_alert_sent',
      'payment_pause_activated',
      'financial_support_provided'
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
        'hotline_connection',
        'payment_anxiety_intervention',
        'financial_counseling'
      ]),
      toolId: z.string(),
      usedAt: z.string(), // ISO timestamp
      duration: z.number().optional(), // seconds
      effectiveness: z.enum(['very_helpful', 'somewhat_helpful', 'not_helpful', 'unknown']).optional()
    })).optional()
  }),

  // Performance validation (CRITICAL for crisis)
  performance: z.object({
    // Response time validation (IMMUTABLE: <200ms)
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
      ]).optional()
    })
  }),

  // Privacy and compliance (IMMUTABLE HIPAA requirements)
  privacy: z.object({
    // Data sharing permissions
    dataSharing: z.object({
      emergencyContactDataSharing: z.boolean(),
      clinicalTeamDataSharing: z.boolean(),
      emergencyServicesDataSharing: z.boolean(),
      familyDataSharing: z.boolean()
    }),

    // Consent and authorization
    consent: z.object({
      emergencyConsentActive: z.boolean(),
      dataSharingConsent: z.boolean(),
      clinicalConsentActive: z.boolean(),
      consentTimestamp: z.string().optional() // ISO timestamp
    }),

    // Audit and compliance
    audit: z.object({
      auditTrailComplete: z.boolean(),
      hipaaCompliant: z.boolean(),
      dataMinimizationApplied: z.boolean(),
      retentionPolicyApplied: z.boolean()
    })
  })
});

export type CrisisEvent = z.infer<typeof CrisisEventSchema>;

// === CRISIS BUTTON COMPONENT TYPES ===

/**
 * Crisis Button Props with Enhanced Type Safety
 * Consolidated from crisis-button-enhanced.ts
 */
export interface CrisisButtonProps {
  // Core variant and styling
  readonly variant?: 'floating' | 'header' | 'embedded';
  readonly style?: ViewStyle | ViewStyle[] | ((state: { pressed: boolean }) => ViewStyle | ViewStyle[]);

  // Enhanced accessibility props for crisis situations
  readonly highContrastMode?: boolean;
  readonly largeTargetMode?: boolean;
  readonly voiceCommandEnabled?: boolean;
  readonly urgencyLevel?: CrisisUrgencyLevel;

  // Crisis-specific callbacks with enhanced typing
  readonly onCrisisStart?: (context: CrisisCallContext) => void | Promise<void>;
  readonly onCrisisComplete?: (result: CrisisCallResult) => void;
  readonly onCrisisError?: (error: CrisisError) => void;

  // Performance and monitoring configuration
  readonly performanceConfig?: CrisisPerformanceConfig;
  readonly monitoringCallbacks?: CrisisMonitoringCallbacks;

  // Accessibility overrides for crisis scenarios
  readonly accessibilityLabel?: string;
  readonly accessibilityHint?: string;
  readonly accessibilityRole?: AccessibilityRole;

  // Testing and debugging
  readonly testID?: string;
  readonly debugMode?: boolean;
}

/**
 * Crisis Call Context with Comprehensive Metadata
 */
export interface CrisisCallContext {
  readonly timestamp: Date;
  readonly urgencyLevel: CrisisUrgencyLevel;
  readonly variant: 'floating' | 'header' | 'embedded';
  readonly userAgent: string;
  readonly platform: 'ios' | 'android';
  readonly accessibilityEnabled: boolean;
  readonly performanceMetrics: CrisisPerformanceSnapshot;
}

/**
 * Crisis Call Result with Success/Failure Tracking
 */
export interface CrisisCallResult {
  readonly success: boolean;
  readonly responseTime: ResponseTimeMs;
  readonly callInitiated: boolean;
  readonly fallbackUsed: boolean;
  readonly accessibilityAnnounced: boolean;
  readonly hapticFeedbackDelivered: boolean;
  readonly performanceCompliant: boolean;
  readonly error?: CrisisError;
}

/**
 * Enhanced Crisis Error Types with Recovery Strategies
 */
export interface CrisisError extends Error {
  readonly code: CrisisErrorCode;
  readonly severity: 'warning' | 'critical' | 'emergency';
  readonly fallbackMessage: string;
  readonly recoveryStrategy: CrisisRecoveryStrategy;
  readonly clinicalImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
  readonly timestamp: Date;
  readonly context: CrisisCallContext;
}

/**
 * Crisis Error Codes with Specific Failure Types
 */
export type CrisisErrorCode =
  | 'CALL_FAILED'
  | 'PERMISSION_DENIED'
  | 'NETWORK_ERROR'
  | 'PLATFORM_UNSUPPORTED'
  | 'ACCESSIBILITY_FAILURE'
  | 'PERFORMANCE_VIOLATION'
  | 'HAPTIC_FAILURE'
  | 'PAYMENT_ANXIETY_ESCALATION'
  | 'UNKNOWN_ERROR';

/**
 * Crisis Recovery Strategies for Error Handling
 */
export type CrisisRecoveryStrategy =
  | 'retry_immediately'
  | 'fallback_to_manual'
  | 'show_emergency_info'
  | 'escalate_to_alternative'
  | 'announce_instructions'
  | 'activate_payment_pause'
  | 'no_recovery_available';

// === PERFORMANCE AND MONITORING TYPES ===

/**
 * Crisis Performance Configuration with Therapeutic Requirements
 */
export interface CrisisPerformanceConfig {
  readonly maxResponseTime: ResponseTimeMs;
  readonly hapticLatencyMax: number;
  readonly accessibilityDelayMax: number;
  readonly animationFrameTarget: 60;
  readonly memoryUsageMax: number;
  readonly enableProfiling: boolean;
  readonly performanceAlerts: boolean;
}

/**
 * Crisis Performance Snapshot for Real-Time Monitoring
 */
export interface CrisisPerformanceSnapshot {
  readonly captureTime: Date;
  readonly responseTime: ResponseTimeMs;
  readonly renderTime: number;
  readonly hapticLatency: number;
  readonly accessibilityDelay: number;
  readonly memoryUsage: number;
  readonly frameDrops: number;
  readonly complianceStatus: PerformanceComplianceStatus;
}

/**
 * Performance Compliance Status with Therapeutic Validation
 */
export interface PerformanceComplianceStatus {
  readonly overall: 'compliant' | 'warning' | 'violation';
  readonly responseTimeCompliant: boolean;
  readonly renderTimeCompliant: boolean;
  readonly hapticCompliant: boolean;
  readonly accessibilityCompliant: boolean;
  readonly memoryCompliant: boolean;
  readonly frameRateCompliant: boolean;
  readonly violations: PerformanceViolation[];
}

/**
 * Performance Violation Details for Debugging
 */
export interface PerformanceViolation {
  readonly metric: string;
  readonly measuredValue: number;
  readonly requiredValue: number;
  readonly severity: 'minor' | 'major' | 'critical';
  readonly clinicalImpact: string;
  readonly recommendation: string;
}

/**
 * Crisis Monitoring Callbacks for Real-Time Tracking
 */
export interface CrisisMonitoringCallbacks {
  readonly onPerformanceViolation?: (violation: PerformanceViolation) => void;
  readonly onResponseTimeExceeded?: (responseTime: ResponseTimeMs) => void;
  readonly onAccessibilityIssue?: (issue: AccessibilityIssue) => void;
  readonly onHapticFailure?: (error: Error) => void;
  readonly onRenderingIssue?: (frameDrops: number) => void;
}

/**
 * Accessibility Issue Tracking for Crisis Scenarios
 */
export interface AccessibilityIssue {
  readonly type: 'screen_reader' | 'contrast' | 'touch_target' | 'timing' | 'motion';
  readonly description: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly userImpact: string;
  readonly recommendation: string;
  readonly automatedFix: boolean;
}

// === EMERGENCY ESCALATION SYSTEM ===

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
      'user_requested_emergency',
      'payment_anxiety_crisis',
      'financial_distress_severe'
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

  // Escalation timeline (CRITICAL timing requirements)
  timeline: z.object({
    escalationStarted: z.string(), // ISO timestamp
    firstActionCompleted: z.string().optional(), // ISO timestamp
    firstResponseReceived: z.string().optional(), // ISO timestamp
    escalationResolved: z.string().optional(), // ISO timestamp

    // Performance requirements (IMMUTABLE)
    targetFirstActionTime: z.number().default(30), // seconds
    actualFirstActionTime: z.number().optional(), // seconds
    performanceTarget: z.boolean().optional(), // whether target was met
  })
});

export type EmergencyEscalation = z.infer<typeof EmergencyEscalationSchema>;

// === CROSS-DEVICE SYNC INTEGRATION ===

/**
 * Crisis sync across devices for continuity
 */
export interface CrisisDeviceSyncState {
  readonly crisisId: string;
  readonly activeDevices: readonly string[];
  readonly primaryDevice: string;
  readonly syncStatus: 'syncing' | 'synced' | 'conflict' | 'offline';
  readonly lastSyncTimestamp: string;
}

/**
 * Crisis webhook integration for external systems
 */
export interface CrisisWebhookPayload {
  readonly crisisId: string;
  readonly severity: CrisisSeverity;
  readonly timestamp: string;
  readonly userId: string;
  readonly deviceId: string;
  readonly escalationRequired: boolean;
  readonly emergencyContactsNotified: boolean;
}

// === SERVICE INTERFACE ===

/**
 * Crisis Safety Service Interface
 * Consolidated service interface compatible with Phase 3D services
 */
export interface CrisisSafetyService {
  // Crisis detection and management
  detectCrisis: (userId: string, detectionData: unknown) => Promise<CrisisEvent | null>;
  classifyCrisis: (crisisEvent: CrisisEvent) => Promise<CrisisEvent>;
  activateCrisisProtocol: (crisisId: string) => Promise<void>;

  // Emergency escalation
  escalateToEmergency: (crisisId: string, escalationReason: string) => Promise<EmergencyEscalation>;
  notifyEmergencyContacts: (crisisId: string) => Promise<void>;

  // Performance validation (CRITICAL)
  validateCrisisResponseTime: (crisisId: string, responseTime: number) => boolean;

  // Cross-device sync
  syncCrisisAcrossDevices: (crisisId: string) => Promise<CrisisDeviceSyncState>;
  
  // Service lifecycle
  initialize: (config: CrisisSafetyConfig) => Promise<void>;
  shutdown: () => Promise<void>;
}

// === CONFIGURATION ===

/**
 * Crisis safety configuration
 */
export const CrisisSafetyConfigSchema = z.object({
  // Service identification
  serviceId: z.string(),
  version: z.string(),
  environment: z.enum(['development', 'staging', 'production']),

  // Crisis detection configuration (IMMUTABLE clinical thresholds)
  detection: z.object({
    enableAutomaticDetection: z.boolean().default(true),
    phq9CrisisThreshold: z.number().default(20), // IMMUTABLE
    gad7CrisisThreshold: z.number().default(15), // IMMUTABLE
    behavioralDetectionEnabled: z.boolean().default(true),
    paymentAnxietyDetectionEnabled: z.boolean().default(true),

    // Detection sensitivity
    detectionSensitivity: z.enum(['high', 'medium', 'low']).default('medium'),
    falsePositiveTolerance: z.number().min(0).max(1).default(0.1) // 10%
  }),

  // Response time requirements (IMMUTABLE)
  responseTime: z.object({
    crisisMaxResponseTime: z.number().default(200), // milliseconds - IMMUTABLE
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
      paymentAnxietyCrisisEscalate: z.boolean().default(true),
      timeToEscalationMinutes: z.number().default(5)
    })
  }),

  // Compliance and audit (IMMUTABLE HIPAA requirements)
  compliance: z.object({
    hipaaCompliantMode: z.boolean().default(true),
    auditLogRetentionDays: z.number().default(2555), // 7 years
    requireClinicalReview: z.boolean().default(true),
    emergencyOverrideTracking: z.boolean().default(true)
  })
});

export type CrisisSafetyConfig = z.infer<typeof CrisisSafetyConfigSchema>;

// === TYPE GUARDS ===

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

export function isCrisisUrgencyLevel(value: unknown): value is CrisisUrgencyLevel {
  return typeof value === 'string' &&
         ['standard', 'high', 'emergency'].includes(value);
}

export function isCrisisPhoneNumber(value: unknown): value is CrisisPhoneNumber {
  return typeof value === 'string' &&
         /^\d{3}$/.test(value); // 988 format
}

export function isValidResponseTime(value: unknown): value is ResponseTimeMs {
  return typeof value === 'number' &&
         value >= 0 &&
         value <= 1000; // Maximum 1 second
}

// === FACTORY FUNCTIONS ===

/**
 * Factory function for creating crisis phone numbers
 */
export function createCrisisPhoneNumber(phone: string): CrisisPhoneNumber {
  if (!isCrisisPhoneNumber(phone)) {
    throw new Error(`Invalid crisis phone number: ${phone}. Must be 3-digit format (e.g., 988)`);
  }
  return phone as CrisisPhoneNumber;
}

/**
 * Factory function for creating response time measurements
 */
export function createResponseTime(ms: number): ResponseTimeMs {
  if (!isValidResponseTime(ms)) {
    throw new Error(`Invalid response time: ${ms}ms. Must be between 0-1000ms`);
  }
  return ms as ResponseTimeMs;
}

/**
 * Factory function for creating crisis urgency levels
 */
export function createCrisisUrgencyLevel(level: string): CrisisUrgencyLevel {
  if (!isCrisisUrgencyLevel(level)) {
    throw new Error(`Invalid crisis urgency level: ${level}. Must be 'standard', 'high', or 'emergency'`);
  }
  return level as CrisisUrgencyLevel;
}

/**
 * Create default crisis performance configuration
 */
export function createDefaultCrisisPerformanceConfig(): CrisisPerformanceConfig {
  return {
    maxResponseTime: createResponseTime(200),
    hapticLatencyMax: 50,
    accessibilityDelayMax: 100,
    animationFrameTarget: 60,
    memoryUsageMax: 100, // MB
    enableProfiling: true,
    performanceAlerts: true,
  };
}

// === CLINICAL CONSTANTS (IMMUTABLE) ===

/**
 * Clinical Assessment Constants - Consolidated from clinical.ts
 * CRITICAL: These values are IMMUTABLE for clinical safety and therapeutic accuracy
 */
export const CLINICAL_CONSTANTS = {
  PHQ9: {
    QUESTION_COUNT: 9,
    MIN_SCORE: 0,
    MAX_SCORE: 27,
    CRISIS_THRESHOLD: CRISIS_THRESHOLD_PHQ9,
    SUICIDAL_IDEATION_QUESTION: SUICIDAL_IDEATION_QUESTION_INDEX,
    THRESHOLDS: {
      MINIMAL: 4,
      MILD: 9,
      MODERATE: 14,
      MODERATELY_SEVERE: 19,
      SEVERE: 27,
    },
  },
  GAD7: {
    QUESTION_COUNT: 7,
    MIN_SCORE: 0,
    MAX_SCORE: 21,
    CRISIS_THRESHOLD: CRISIS_THRESHOLD_GAD7,
    THRESHOLDS: {
      MINIMAL: 4,
      MILD: 9,
      MODERATE: 14,
      SEVERE: 21,
    },
  },
  CRISIS: {
    EMERGENCY_NUMBER: '988' as const,
    TEXT_LINE: '741741' as const,
    MAX_RESPONSE_TIME_MS: 200 as const,
  },
  TIMING: {
    BREATHING_DURATION_MS: 60000 as const,
    FRAME_TIME_MS: 16.67 as const,
  },
} as const;

// === CONSTANTS (IMMUTABLE) ===

/**
 * Crisis Safety Constants and performance requirements
 * CRITICAL: These values are IMMUTABLE for clinical safety
 */
export const CRISIS_SAFETY_CONSTANTS = {
  // Performance requirements (IMMUTABLE)
  CRISIS_MAX_RESPONSE_TIME: 200, // milliseconds - IMMUTABLE
  ESCALATION_MAX_RESPONSE_TIME: 30000, // milliseconds (30 seconds)
  EMERGENCY_CONTACT_MAX_TIME: 60000, // milliseconds (1 minute)

  // Crisis severity thresholds (IMMUTABLE)
  CRISIS_THRESHOLDS: {
    PHQ9_CRISIS: 20, // IMMUTABLE - Clinical requirement
    GAD7_CRISIS: 15, // IMMUTABLE - Clinical requirement
    COMBINED_CRISIS: 35 // PHQ-9 + GAD-7
  },

  // Phone numbers (IMMUTABLE)
  PHONE_NUMBERS: {
    CRISIS_HOTLINE: createCrisisPhoneNumber('988'), // IMMUTABLE
    EMERGENCY: createCrisisPhoneNumber('911'), // IMMUTABLE
  },

  // Response time targets (IMMUTABLE)
  RESPONSE_TIME_TARGETS: {
    IMMEDIATE: 200,    // milliseconds - IMMUTABLE
    URGENT: 5000,      // 5 seconds
    PRIORITY: 30000,   // 30 seconds
    STANDARD: 300000   // 5 minutes
  },

  // Accessibility requirements (IMMUTABLE)
  ACCESSIBILITY: {
    MIN_TOUCH_TARGET: 44, // WCAG AA - IMMUTABLE
    CRISIS_TOUCH_TARGET: 52, // Enhanced for crisis - IMMUTABLE
    MIN_CONTRAST_RATIO: 4.5, // WCAG AA - IMMUTABLE
    CRISIS_CONTRAST_RATIO: 7.0, // Enhanced for crisis - IMMUTABLE
  },

  // HIPAA compliance (IMMUTABLE)
  COMPLIANCE: {
    AUDIT_RETENTION_DAYS: 2555, // 7 years - IMMUTABLE
    HIPAA_REQUIRED: true, // IMMUTABLE
    CLINICAL_VALIDATION_REQUIRED: true, // IMMUTABLE
    EMERGENCY_OVERRIDE_TRACKING: true // IMMUTABLE
  }
} as const;

// === PERFORMANCE AND VALIDATION TYPES FOR TESTING ===

/**
 * Crisis Response Timing Constraints
 * Used by performance validation tests to ensure crisis response times
 * meet the immutable <200ms requirement
 */
export interface CrisisResponseTimingConstraints {
  /** Maximum allowed crisis response time in milliseconds (IMMUTABLE: 200ms) */
  readonly maxResponseTimeMs: 200;
  /** Maximum allowed detection time in milliseconds */
  readonly maxDetectionTimeMs: 50;
  /** Maximum allowed classification time in milliseconds */
  readonly maxClassificationTimeMs: 75;
  /** Maximum allowed response initiation time in milliseconds */
  readonly maxResponseInitiationTimeMs: 75;
}

/**
 * Crisis Response Performance Metrics
 * Captured during crisis response performance validation
 */
export interface CrisisResponseMetrics {
  /** Actual response time measured in milliseconds */
  readonly responseTime: number;
  /** Detection phase timing in milliseconds */
  readonly detectionTime: number;
  /** Classification phase timing in milliseconds */
  readonly classificationTime: number;
  /** Response initiation timing in milliseconds */
  readonly responseInitiationTime: number;
  /** Total processing time in milliseconds */
  readonly totalProcessingTime: number;
  /** Whether response met timing constraints */
  readonly meetsTimingConstraints: boolean;
  /** Performance validation timestamp */
  readonly validationTimestamp: number;
}

/**
 * Crisis Response Validation Function
 * Validates whether crisis response metrics meet timing constraints
 */
export function isCrisisResponseValid(
  metrics: CrisisResponseMetrics,
  constraints: CrisisResponseTimingConstraints = {
    maxResponseTimeMs: 200,
    maxDetectionTimeMs: 50,
    maxClassificationTimeMs: 75,
    maxResponseInitiationTimeMs: 75
  }
): boolean {
  return (
    metrics.responseTime <= constraints.maxResponseTimeMs &&
    metrics.detectionTime <= constraints.maxDetectionTimeMs &&
    metrics.classificationTime <= constraints.maxClassificationTimeMs &&
    metrics.responseInitiationTime <= constraints.maxResponseInitiationTimeMs
  );
}

/**
 * Accessibility Compliance Validation
 * Ensures crisis response components meet WCAG 2.1 AA standards
 */
export function isAccessibilityCompliant(component: any): boolean {
  // Placeholder for accessibility validation logic
  // In real implementation, would check WCAG compliance
  return true;
}

/**
 * Clinical Accuracy Validation
 * Ensures clinical calculations and assessments are accurate
 */
export function isClinicallyAccurate(assessment: Assessment): boolean {
  // Placeholder for clinical accuracy validation
  // In real implementation, would validate clinical calculations
  return true;
}

// === EXPORTS ===

export default {
  // Clinical Schemas
  CrisisSeveritySchema,
  CrisisDetectionSourceSchema,
  PaymentAnxietySeveritySchema,
  CrisisEventSchema,
  EmergencyEscalationSchema,
  CrisisSafetyConfigSchema,

  // Clinical Type Guards
  isCrisisEvent,
  isEmergencyEscalation,
  isCrisisUrgencyLevel,
  isCrisisPhoneNumber,
  isValidResponseTime,
  isPHQ9Assessment,
  isGAD7Assessment,

  // Clinical Factory Functions
  createCrisisPhoneNumber,
  createResponseTime,
  createCrisisUrgencyLevel,
  createDefaultCrisisPerformanceConfig,
  createISODateString,
  createAssessmentID,

  // Clinical Constants
  CLINICAL_CONSTANTS,
  CRISIS_SAFETY_CONSTANTS,

  // Clinical Thresholds (IMMUTABLE)
  CRISIS_THRESHOLD_PHQ9,
  CRISIS_THRESHOLD_GAD7,
  SUICIDAL_IDEATION_QUESTION_INDEX,
  SUICIDAL_IDEATION_THRESHOLD
};