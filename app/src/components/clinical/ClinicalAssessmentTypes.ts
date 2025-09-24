/**
 * Clinical Assessment Component Types - Enhanced Type Safety
 *
 * This file provides enhanced TypeScript types for clinical assessment
 * components with 100% accuracy requirements following clinician validation.
 *
 * CRITICAL: These types enforce zero tolerance for clinical calculation errors
 * and crisis detection failures. All assessment components must use these types.
 */

import React from 'react';
import {
  PHQ9Answers,
  GAD7Answers,
  PHQ9Score,
  GAD7Score,
  PHQ9Severity,
  GAD7Severity,
  Assessment,
  AssessmentID,
  ISODateString,
  CLINICAL_CONSTANTS
} from '../../types/clinical';

import {
  ValidatedPHQ9Score,
  ValidatedGAD7Score,
  ValidatedSeverity,
  CrisisDetected,
  SuicidalIdeationDetected,
  ClinicalValidationState,
  ClinicalCalculationCertified,
  ValidatedAssessmentQuestionProps,
  ValidatedScoreDisplayProps,
  ValidatedCrisisAlertProps,
  ClinicalTypeValidationError
} from '../../types/clinical-type-safety';

// === ENHANCED ASSESSMENT QUESTION COMPONENT ===

export interface ClinicalAssessmentQuestionProps<T extends 'phq9' | 'gad7'>
  extends ValidatedAssessmentQuestionProps<T> {
  // Additional clinical safety props
  readonly onValidationError: (error: ClinicalTypeValidationError) => void;
  readonly allowPartialAnswers: false; // Clinical assessments require complete answers
  readonly preventAccidentalSkip: true;
  readonly clinicalMode: true;

  // Accessibility enhancements for clinical use
  readonly screenReaderInstructions: string;
  readonly highContrast: boolean;
  readonly largeTouch: boolean;

  // Audit trail for clinical compliance
  readonly auditAnswerChange: (
    questionIndex: number,
    previousAnswer: T extends 'phq9' ? PHQ9Answer : GAD7Answer,
    newAnswer: T extends 'phq9' ? PHQ9Answer : GAD7Answer,
    timestamp: ISODateString
  ) => void;
}

// === ENHANCED SCORE DISPLAY COMPONENT ===

export interface ClinicalScoreDisplayProps<T extends 'phq9' | 'gad7'>
  extends ValidatedScoreDisplayProps<T> {
  // Crisis visualization enhancements
  readonly showCrisisVisualization: boolean;
  readonly crisisAnimationDuration: 300; // Fast crisis indication
  readonly emergencyContactButton: boolean;

  // Clinical interpretation display
  readonly showSeverityExplanation: boolean;
  readonly showClinicalRange: boolean;
  readonly showTrendComparison: boolean;

  // Professional mode settings
  readonly professionalDisplay: boolean;
  readonly showDSMReference: boolean;
  readonly hideScoreFromPatient: boolean;
}

// === ENHANCED CRISIS ALERT COMPONENT ===

export interface ClinicalCrisisAlertProps extends ValidatedCrisisAlertProps {
  // Enhanced crisis detection info
  readonly crisisScore: ValidatedPHQ9Score | ValidatedGAD7Score;
  readonly severityLevel: ValidatedSeverity<'phq9'> | ValidatedSeverity<'gad7'>;
  readonly riskFactors: readonly string[];

  // Clinical intervention options
  readonly showSafetyPlan: boolean;
  readonly showTherapistContact: boolean;
  readonly showHospitalLocator: boolean;
  readonly enableWarmLine: boolean;

  // Professional oversight
  readonly clinicianAlerted: boolean;
  readonly autoEscalation: boolean;
  readonly followUpScheduled: boolean;

  // Audit and compliance
  readonly logCrisisIntervention: (intervention: CrisisInterventionLog) => void;
  readonly documentResponse: (documentation: CrisisDocumentation) => void;
}

export interface CrisisInterventionLog {
  readonly timestamp: ISODateString;
  readonly assessmentId: AssessmentID;
  readonly triggerType: 'score_threshold' | 'suicidal_ideation' | 'manual';
  readonly score: ValidatedPHQ9Score | ValidatedGAD7Score;
  readonly intervention: 'emergency_call' | 'safety_plan' | 'therapist_contact' | 'hospital_referral';
  readonly responseTime: number; // Milliseconds from crisis detection to intervention
  readonly outcome: 'user_helped' | 'escalated' | 'declined_help' | 'system_error';
}

export interface CrisisDocumentation {
  readonly timestamp: ISODateString;
  readonly assessmentId: AssessmentID;
  readonly userConsent: boolean;
  readonly interventionNotes: string;
  readonly followUpRequired: boolean;
  readonly nextAssessmentScheduled?: ISODateString;
  readonly clinicianNotified: boolean;
}

// === ASSESSMENT FLOW COMPONENT ===

export interface ClinicalAssessmentFlowProps<T extends 'phq9' | 'gad7'> {
  readonly assessmentType: T;
  readonly onComplete: (result: ClinicalAssessmentResult<T>) => void;
  readonly onCrisisDetected: (crisis: CrisisAssessmentResult<T>) => void;
  readonly onValidationError: (error: ClinicalTypeValidationError) => void;

  // Clinical validation requirements
  readonly requireClinicalValidation: true;
  readonly clinicalCalculator: ClinicalCalculationCertified;
  readonly validationState: ClinicalValidationState;

  // Timing and performance requirements
  readonly maxCompletionTime: 300000; // 5 minutes maximum
  readonly trackResponseTimes: boolean;
  readonly preventRapidChanges: boolean; // Prevent accidental rapid clicking

  // Accessibility and user experience
  readonly anxietyAwareDesign: boolean;
  readonly highContrastMode: boolean;
  readonly screenReaderOptimized: boolean;
  readonly supportiveMessaging: boolean;

  // Professional features
  readonly allowClinicalOverride: boolean;
  readonly showDSMCriteria: boolean;
  readonly enableSupervisoryReview: boolean;
}

// === ASSESSMENT RESULT TYPES ===

export interface ClinicalAssessmentResult<T extends 'phq9' | 'gad7'> {
  readonly assessmentType: T;
  readonly assessmentId: AssessmentID;
  readonly completedAt: ISODateString;

  // Validated clinical data
  readonly answers: T extends 'phq9' ? PHQ9Answers : GAD7Answers;
  readonly score: T extends 'phq9' ? ValidatedPHQ9Score : ValidatedGAD7Score;
  readonly severity: ValidatedSeverity<T>;

  // Crisis detection results
  readonly crisisDetected: CrisisDetected | false;
  readonly suicidalIdeation: T extends 'phq9' ? SuicidalIdeationDetected | false : never;
  readonly riskLevel: 'low' | 'moderate' | 'high' | 'severe';

  // Clinical validation
  readonly validationState: ClinicalValidationState;
  readonly calculationAudit: CalculationAuditTrail;

  // Performance metrics
  readonly completionTime: number; // Milliseconds
  readonly responsePattern: ResponsePatternAnalysis;
  readonly qualityMetrics: AssessmentQualityMetrics;
}

export interface CrisisAssessmentResult<T extends 'phq9' | 'gad7'>
  extends ClinicalAssessmentResult<T> {
  readonly crisisDetected: CrisisDetected;
  readonly immediateIntervention: boolean;
  readonly emergencyContactsAvailable: boolean;
  readonly safetyPlanAccessible: boolean;
  readonly professionalHelpRecommended: boolean;
  readonly followUpRequired: boolean;
}

// === CALCULATION AUDIT TRAIL ===

export interface CalculationAuditTrail {
  readonly timestamp: ISODateString;
  readonly assessmentId: AssessmentID;
  readonly inputAnswers: readonly number[];
  readonly calculatedScore: number;
  readonly validatedScore: ValidatedPHQ9Score | ValidatedGAD7Score;
  readonly severityDetermined: ValidatedSeverity<'phq9'> | ValidatedSeverity<'gad7'>;
  readonly crisisThresholdEvaluated: boolean;
  readonly suicidalIdeationChecked: boolean;
  readonly calculationMethod: 'standard_sum' | 'clinical_validated';
  readonly verificationPassed: boolean;
}

// === RESPONSE PATTERN ANALYSIS ===

export interface ResponsePatternAnalysis {
  readonly averageResponseTime: number; // Milliseconds per question
  readonly responseVariability: number; // Standard deviation of response times
  readonly hasRapidResponses: boolean; // Responses < 500ms
  readonly hasVerySlowResponses: boolean; // Responses > 30s
  readonly changedAnswers: number; // Number of times user changed answers
  readonly suspiciousPattern: boolean; // All same answers or unusual patterns
  readonly engagementLevel: 'low' | 'moderate' | 'high';
}

// === ASSESSMENT QUALITY METRICS ===

export interface AssessmentQualityMetrics {
  readonly completionRate: 1.0; // Clinical assessments must be 100% complete
  readonly responseConsistency: number; // 0-1 scale
  readonly timeAppropriate: boolean; // Reasonable time spent
  readonly answersRealistic: boolean; // Answers seem genuine
  readonly noTechnicalIssues: boolean; // No app crashes or errors
  readonly accessibilityCompliant: boolean; // Met accessibility standards
  readonly clinicalStandardsMet: boolean; // Met all clinical requirements
  readonly qualityScore: number; // Overall quality 0-100
}

// === COMPONENT STATE MANAGEMENT ===

export interface ClinicalAssessmentState<T extends 'phq9' | 'gad7'> {
  readonly assessmentType: T;
  readonly currentQuestion: number;
  readonly answers: Partial<T extends 'phq9' ? PHQ9Answers : GAD7Answers>;
  readonly isComplete: boolean;
  readonly isValid: boolean;

  // Clinical validation state
  readonly clinicalValidation: ClinicalValidationState;
  readonly lastValidated: ISODateString;
  readonly validationErrors: readonly string[];

  // Performance tracking
  readonly startTime: ISODateString;
  readonly questionStartTimes: readonly number[];
  readonly responseMetrics: Partial<ResponsePatternAnalysis>;

  // Crisis detection state
  readonly crisisRiskDetected: boolean;
  readonly suicidalIdeationPresent: boolean;
  readonly interventionRequired: boolean;
  readonly emergencyMode: boolean;
}

// === THERAPEUTIC COMPONENT INTEGRATION ===

export interface ClinicalTherapeuticIntegration {
  // Assessment to therapeutic flow
  readonly triggerTherapeuticContent: (
    result: ClinicalAssessmentResult<'phq9' | 'gad7'>
  ) => Promise<void>;

  // Crisis to safety integration
  readonly activateCrisisProtocol: (
    crisis: CrisisAssessmentResult<'phq9' | 'gad7'>
  ) => Promise<void>;

  // Progress tracking integration
  readonly updateTherapeuticProgress: (
    assessment: ClinicalAssessmentResult<'phq9' | 'gad7'>
  ) => Promise<void>;

  // Clinical data sync
  readonly syncClinicalData: (
    data: ClinicalAssessmentResult<'phq9' | 'gad7'>
  ) => Promise<void>;
}

// === ERROR HANDLING FOR CLINICAL COMPONENTS ===

export class ClinicalComponentError extends Error {
  constructor(
    message: string,
    public readonly component: string,
    public readonly assessmentId: AssessmentID | null,
    public readonly clinicalImpact: 'low' | 'medium' | 'high' | 'critical',
    public readonly userAction: string | null = null
  ) {
    super(message);
    this.name = 'ClinicalComponentError';
  }
}

export class CrisisDetectionComponentError extends ClinicalComponentError {
  constructor(
    message: string,
    public readonly failedTrigger: 'score_calculation' | 'suicidal_ideation' | 'system_error',
    public readonly assessmentData: Partial<Assessment>
  ) {
    super(message, 'CrisisDetection', assessmentData.id || null, 'critical', 'immediate_clinical_review');
    this.name = 'CrisisDetectionComponentError';
  }
}

// === EXPORT ALL CLINICAL ASSESSMENT TYPES ===

export type {
  ClinicalAssessmentQuestionProps,
  ClinicalScoreDisplayProps,
  ClinicalCrisisAlertProps,
  ClinicalAssessmentFlowProps,
  ClinicalAssessmentResult,
  CrisisAssessmentResult,
  CalculationAuditTrail,
  ResponsePatternAnalysis,
  AssessmentQualityMetrics,
  ClinicalAssessmentState,
  ClinicalTherapeuticIntegration,
  CrisisInterventionLog,
  CrisisDocumentation
};

export {
  ClinicalComponentError,
  CrisisDetectionComponentError
};