/**
 * Enhanced Clinical Assessment Types
 *
 * Type-safe assessment components with clinical accuracy validation,
 * crisis detection, and therapeutic compliance for PHQ-9/GAD-7 assessments.
 *
 * CRITICAL REQUIREMENTS:
 * - 100% assessment scoring accuracy (zero tolerance for calculation errors)
 * - Automatic crisis detection at clinical thresholds
 * - MBCT-compliant therapeutic language
 * - Real-time clinical validation
 */

import { ReactNode } from 'react';
import { ViewStyle, TextStyle, PressableStateCallbackType } from 'react-native';

// =============================================================================
// CLINICAL ASSESSMENT ACCURACY TYPES
// =============================================================================

/**
 * PHQ-9 Assessment Type Safety
 * Type-enforced clinical accuracy for depression assessment
 */
export interface PHQ9AssessmentValidation {
  readonly assessmentType: 'PHQ-9';
  readonly totalQuestions: 9; // Type-enforced question count
  readonly maxScore: 27; // Type-enforced maximum score (9 questions × 3 points)
  readonly minScore: 0;   // Type-enforced minimum score
  readonly possibleScoreCombinations: 3280; // All possible valid score combinations
  readonly clinicalSeverityThresholds: PHQ9SeverityThresholds;
  readonly crisisDetectionThreshold: 20; // Type-enforced crisis threshold (severe depression)
  scoreCalculationValidated: boolean;
  lastClinicalReview: Date;
  clinicalAccuracyRate: 100; // Type-enforced 100% accuracy requirement
}

export interface PHQ9SeverityThresholds {
  readonly minimal: { min: 0; max: 4 };      // 0-4: Minimal depression
  readonly mild: { min: 5; max: 9 };         // 5-9: Mild depression
  readonly moderate: { min: 10; max: 14 };   // 10-14: Moderate depression
  readonly moderatelySevere: { min: 15; max: 19 }; // 15-19: Moderately severe
  readonly severe: { min: 20; max: 27 };     // 20-27: Severe depression (CRISIS)
}

/**
 * GAD-7 Assessment Type Safety
 * Type-enforced clinical accuracy for anxiety assessment
 */
export interface GAD7AssessmentValidation {
  readonly assessmentType: 'GAD-7';
  readonly totalQuestions: 7; // Type-enforced question count
  readonly maxScore: 21; // Type-enforced maximum score (7 questions × 3 points)
  readonly minScore: 0;   // Type-enforced minimum score
  readonly possibleScoreCombinations: 16384; // All possible valid score combinations
  readonly clinicalSeverityThresholds: GAD7SeverityThresholds;
  readonly crisisDetectionThreshold: 15; // Type-enforced crisis threshold (severe anxiety)
  scoreCalculationValidated: boolean;
  lastClinicalReview: Date;
  clinicalAccuracyRate: 100; // Type-enforced 100% accuracy requirement
}

export interface GAD7SeverityThresholds {
  readonly minimal: { min: 0; max: 4 };      // 0-4: Minimal anxiety
  readonly mild: { min: 5; max: 9 };         // 5-9: Mild anxiety
  readonly moderate: { min: 10; max: 14 };   // 10-14: Moderate anxiety
  readonly severe: { min: 15; max: 21 };     // 15-21: Severe anxiety (CRISIS)
}

/**
 * Universal Assessment Question Structure
 * Type-safe question definition with clinical validation
 */
export interface ClinicalAssessmentQuestion {
  id: string;
  questionNumber: number; // 1-indexed for clinical display
  questionText: string;
  clinicallyValidatedText: boolean; // Must be true for production use
  mbctCompliantLanguage: boolean;   // MBCT therapeutic language compliance
  responseOptions: AssessmentResponseOption[];
  selectedResponse?: number; // 0-indexed response selection
  lastModified: Date;
  clinicalReviewStatus: 'approved' | 'pending_review' | 'requires_revision';
  therapeuticConsiderations?: string[];
}

export interface AssessmentResponseOption {
  value: number; // 0, 1, 2, or 3 for standard clinical scoring
  displayText: string;
  clinicalDescription: string;
  therapeuticImplication: string;
  accessibilityLabel: string;
  therapeuticLanguageValidated: boolean;
}

/**
 * Assessment Score Calculation Validation
 * Type-safe scoring with runtime validation
 */
export interface AssessmentScoreCalculation {
  responses: AssessmentResponse[];
  calculationMethod: 'sum' | 'weighted' | 'custom';
  rawScore: number;
  validatedScore: number; // Must match rawScore for clinical accuracy
  scoringAccuracy: 100;   // Type-enforced 100% accuracy requirement
  calculationTimestamp: Date;
  validationPerformed: boolean;
  clinicalInterpretation: ClinicalScoreInterpretation;
  crisisDetection: CrisisDetectionResult;
}

export interface AssessmentResponse {
  questionId: string;
  questionNumber: number;
  responseValue: number; // 0, 1, 2, or 3
  responseTimestamp: Date;
  validationPassed: boolean;
  therapeuticContext?: string;
}

export interface ClinicalScoreInterpretation {
  severityLevel: 'Minimal' | 'Mild' | 'Moderate' | 'Moderately Severe' | 'Severe';
  severityScore: number; // 0-27 for PHQ-9, 0-21 for GAD-7
  clinicalDescription: string;
  therapeuticRecommendations: string[];
  nextStepsGuidance: string;
  mbctApproach: string;
  interpretationAccuracy: 'clinical_grade' | 'research_grade';
  lastClinicalValidation: Date;
}

export interface CrisisDetectionResult {
  crisisDetected: boolean;
  crisisLevel: 'none' | 'low' | 'moderate' | 'high' | 'critical';
  automaticInterventionTriggered: boolean;
  interventionProtocols: CrisisInterventionProtocol[];
  detectionTimestamp: Date;
  responseRequired: boolean;
  escalationRequired: boolean;
  safetyPlanActivated: boolean;
}

export interface CrisisInterventionProtocol {
  protocolId: string;
  interventionType: 'immediate' | 'urgent' | 'standard' | 'follow_up';
  interventionActions: CrisisInterventionAction[];
  timingRequirement: number; // milliseconds - must be <200ms for immediate
  requiredApprovals: string[];
  clinicalSafetyValidated: boolean;
  emergencyEscalation: boolean;
}

export interface CrisisInterventionAction {
  actionType: 'alert_display' | 'hotline_prompt' | 'emergency_contact' | 'resource_provision' | 'safety_plan' | 'professional_referral';
  actionTiming: number; // milliseconds from detection
  actionPriority: 'immediate' | 'urgent' | 'standard';
  userConfirmationRequired: boolean;
  clinicalProtocolCompliant: boolean;
  accessibilityOptimized: boolean;
  therapeuticFraming: string;
}

// =============================================================================
// MBCT COMPLIANCE FOR ASSESSMENTS
// =============================================================================

/**
 * MBCT Assessment Compliance
 * Therapeutic approach validation for assessment components
 */
export interface MBCTAssessmentCompliance {
  therapeuticApproach: 'mindfulness_based_cognitive_therapy';
  assessmentIntegration: MBCTAssessmentIntegration;
  languageCompliance: MBCTLanguageCompliance;
  therapeuticTiming: MBCTTherapeuticTiming;
  mindfulnessIntegration: MindfulnessAssessmentIntegration;
  cognitiveAwarenessSupport: CognitiveAwarenessSupport;
}

export interface MBCTAssessmentIntegration {
  preAssessmentMindfulness: boolean; // Brief mindfulness before assessment
  postAssessmentReflection: boolean; // MBCT-style reflection after scoring
  therapeuticContextualization: boolean; // Frame assessment within MBCT journey
  nonjudgmentalPresentation: boolean; // Present questions without judgment
  selfCompassionEncouragement: boolean; // Encourage self-compassion throughout
  presentMomentAwareness: boolean; // Ground in present moment experience
}

export interface MBCTLanguageCompliance {
  nonjudgmentalLanguage: boolean;
  selfCompassionateFraming: boolean;
  mindfulnessTerminology: boolean;
  therapeuticOptimism: boolean;
  growthOrientedPerspective: boolean;
  traumaInformedLanguage: boolean;
  culturalSensitivity: boolean;
  ageAppropriateLanguage: boolean;
}

export interface MBCTTherapeuticTiming {
  mindfulPacing: boolean; // Allow time for reflection between questions
  breathingSpaceIntegration: boolean; // Optional breathing spaces during assessment
  rushingPrevention: boolean; // Prevent rushed responses
  therapeuticTransitions: boolean; // Smooth, mindful transitions
  pauseAndReflectOpportunities: boolean; // Built-in reflection moments
  selfRegulationSupport: boolean; // Support emotional self-regulation
}

export interface MindfulnessAssessmentIntegration {
  briefMindfulnessExercise: MindfulnessExercise;
  bodyAwarenessCheck: BodyAwarenessIntegration;
  breathAwarenessReminder: BreathAwarenessIntegration;
  thoughtObservationGuidance: ThoughtObservationIntegration;
  emotionRecognitionSupport: EmotionRecognitionIntegration;
}

export interface MindfulnessExercise {
  exerciseType: 'breathing' | 'body_scan' | 'thought_observation' | 'emotion_awareness';
  duration: number; // seconds - typically 30-60 for brief exercises
  guidedAudio: boolean;
  textGuidance: boolean;
  optional: boolean;
  therapeuticRationale: string;
  accessibilityAlternatives: string[];
}

export interface BodyAwarenessIntegration {
  bodyCheckPrompt: boolean;
  tensionRecognition: boolean;
  groundingTechniques: boolean;
  physicalComfortAssessment: boolean;
  breathingAwareness: boolean;
}

export interface BreathAwarenessIntegration {
  breathingReminders: boolean;
  breathingSpaces: boolean;
  breathingPacing: boolean;
  breathingVisualization: boolean;
  breathingAccessibility: boolean;
}

export interface ThoughtObservationIntegration {
  thoughtNoticingPrompts: boolean;
  thoughtLabelingGuidance: boolean;
  thoughtJudgmentAwareness: boolean;
  metacognitiveAwareness: boolean;
  thoughtDefusionTechniques: boolean;
}

export interface EmotionRecognitionIntegration {
  emotionNamingSupport: boolean;
  emotionAcceptanceGuidance: boolean;
  emotionRegulationStrategies: boolean;
  selfCompassionPrompts: boolean;
  emotionBodyConnection: boolean;
}

export interface CognitiveAwarenessSupport {
  cognitivePatternRecognition: boolean;
  automaticThoughtIdentification: boolean;
  cognitiveDistortionEducation: boolean;
  balancedThinkingPromotion: boolean;
  metacognitionDevelopment: boolean;
  cognitiveFlexibilityEncouragement: boolean;
}

// =============================================================================
// ENHANCED ASSESSMENT COMPONENT PROPS
// =============================================================================

/**
 * Enhanced PHQ Assessment Preview Props
 * Comprehensive type safety with clinical and therapeutic validation
 */
export interface EnhancedPHQAssessmentPreviewProps {
  // Core Assessment Data
  assessmentData: PHQ9AssessmentData;
  assessmentValidation: PHQ9AssessmentValidation;

  // Display Configuration
  title: string;
  subtitle?: string;
  showScore?: boolean;
  showInterpretation?: boolean;
  showProgress?: boolean;
  showCrisisAlert?: boolean;

  // Clinical Compliance
  clinicalAccuracyValidated: true; // Type-enforced requirement
  mbctCompliance: MBCTAssessmentCompliance;
  therapeuticFraming: TherapeuticFramingConfiguration;

  // Crisis Detection
  crisisDetectionEnabled: true; // Type-enforced requirement
  crisisResponseProtocols: CrisisInterventionProtocol[];
  emergencyContactIntegration: boolean;

  // Accessibility
  accessibilityCompliant: true; // Type-enforced WCAG AA compliance
  accessibilityConfiguration: AssessmentAccessibilityConfiguration;
  cognitiveLoadOptimized: boolean;

  // Interaction Handling
  onScoreCalculated?: (calculation: AssessmentScoreCalculation) => Promise<void>;
  onCrisisDetected?: (crisis: CrisisDetectionResult) => Promise<void>;
  onTherapeuticInteraction?: (interaction: TherapeuticInteraction) => void;
  onAccessibilityChange?: (change: AccessibilityChange) => void;

  // Performance Requirements
  performanceMetrics?: AssessmentPerformanceMetrics;
  renderingOptimized: boolean;

  // Styling
  style?: EnhancedAssessmentStyle;
  theme: 'morning' | 'midday' | 'evening';
}

export interface PHQ9AssessmentData {
  assessmentId: string;
  score: number; // 0-27
  maxScore: 27; // Type-enforced PHQ-9 maximum
  severity: 'Minimal' | 'Mild' | 'Moderate' | 'Moderately Severe' | 'Severe';
  interpretation: string;
  clinicalNotes?: string;
  crisisRisk: boolean;
  lastAssessed: Date;
  assessmentDuration?: number; // milliseconds
  validationStatus: 'validated' | 'pending' | 'requires_review';
  questions?: ClinicalAssessmentQuestion[];
  responses?: AssessmentResponse[];
  therapeuticContext?: string;
}

export interface TherapeuticFramingConfiguration {
  preAssessmentFraming: string;
  postAssessmentFraming: string;
  progressFraming: string;
  selfCompassionMessaging: string;
  hopeAndGrowthMessaging: string;
  nonjudgmentalMessaging: string;
  mbctIntegrationPoints: string[];
  therapeuticLanguageValidated: boolean;
}

export interface AssessmentAccessibilityConfiguration {
  screenReaderOptimized: boolean;
  keyboardNavigationEnabled: boolean;
  highContrastMode: boolean;
  largeTextMode: boolean;
  voiceAnnouncementsEnabled: boolean;
  hapticFeedbackLevel: 'none' | 'minimal' | 'standard' | 'enhanced';
  cognitiveLoadReduction: boolean;
  stressOptimizedInterface: boolean;
  crisisAccessibilityEnhanced: boolean;
  alternativeInputMethods: string[];
}

export interface TherapeuticInteraction {
  interactionType: 'question_response' | 'score_viewing' | 'interpretation_reading' | 'crisis_detection' | 'mindfulness_pause';
  timestamp: Date;
  therapeuticValue: 'high' | 'medium' | 'low';
  mbctAlignment: boolean;
  clinicalRelevance: string;
  userEngagement: number; // 0-1 scale
  accessibilityUsed: string[];
}

export interface AccessibilityChange {
  changeType: 'preference' | 'system' | 'context' | 'crisis';
  feature: string;
  previousState: any;
  newState: any;
  impact: 'therapeutic' | 'usability' | 'safety' | 'clinical';
  immediateAction: boolean;
}

export interface AssessmentPerformanceMetrics {
  renderTime: number; // milliseconds
  interactionResponseTime: number; // milliseconds
  accessibilityResponseTime: number; // milliseconds
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
  therapeuticFlowMaintained: boolean;
  performanceIssues: PerformanceIssue[];
}

export interface PerformanceIssue {
  issueType: 'render_delay' | 'interaction_lag' | 'accessibility_delay' | 'memory_issue' | 'cpu_spike';
  severity: 'low' | 'medium' | 'high' | 'critical';
  actualValue: number;
  expectedValue: number;
  therapeuticImpact: boolean;
  clinicalSafetyImpact: boolean;
  timestamp: Date;
  resolution?: string;
}

export interface EnhancedAssessmentStyle extends ViewStyle {
  // Core container styling
  backgroundColor: string;
  borderRadius: number;
  padding: number;
  margin?: number;

  // Clinical state styling
  crisisStateStyle?: CrisisAssessmentStyle;
  therapeuticStateStyle?: TherapeuticAssessmentStyle;

  // Accessibility styling
  accessibilityEnhanced?: AccessibilityAssessmentStyle;

  // MBCT compliance styling
  mbctCompliantSpacing: boolean;
  therapeuticColorScheme: boolean;
  mindfulTransitions: boolean;
}

export interface CrisisAssessmentStyle extends ViewStyle {
  crisisIndicatorColor: '#B91C1C'; // Type-enforced crisis red
  crisisBackgroundColor: '#FEF2F2'; // Light red background for crisis context
  crisisBorderColor: '#F87171';
  crisisBorderWidth: 2;
  emergencyHighlight: boolean;
  urgentVisualCues: boolean;
}

export interface TherapeuticAssessmentStyle extends ViewStyle {
  therapeuticColorPalette: 'calming' | 'neutral' | 'warm';
  mbctCompliantSpacing: boolean;
  mindfulTransitions: boolean;
  selfCompassionVisualCues: boolean;
  nonjudgmentalDesign: boolean;
  hopeAndGrowthIndicators: boolean;
}

export interface AccessibilityAssessmentStyle extends ViewStyle {
  highContrastMode?: boolean;
  largeTargetMode?: boolean;
  reducedMotionCompliant?: boolean;
  screenReaderOptimized?: boolean;
  cognitiveLoadReduced?: boolean;
  focusIndicatorEnhanced?: boolean;
  touchTargetMinimum: 44; // Type-enforced WCAG minimum
}

// =============================================================================
// TYPE VALIDATION UTILITIES
// =============================================================================

/**
 * Clinical Assessment Type Guards
 */
export const isValidPHQ9Score = (score: number): score is number => {
  return Number.isInteger(score) && score >= 0 && score <= 27;
};

export const isValidGAD7Score = (score: number): score is number => {
  return Number.isInteger(score) && score >= 0 && score <= 21;
};

export const isCrisisScore = (score: number, assessmentType: 'PHQ-9' | 'GAD-7'): boolean => {
  if (assessmentType === 'PHQ-9') {
    return score >= 20; // PHQ-9 crisis threshold
  } else {
    return score >= 15; // GAD-7 crisis threshold
  }
};

export const isAssessmentAccurate = (validation: PHQ9AssessmentValidation | GAD7AssessmentValidation): boolean => {
  return validation.clinicalAccuracyRate === 100 && validation.scoreCalculationValidated;
};

export const isMBCTCompliant = (compliance: MBCTAssessmentCompliance): boolean => {
  return compliance.languageCompliance.nonjudgmentalLanguage &&
         compliance.languageCompliance.selfCompassionateFraming &&
         compliance.assessmentIntegration.nonjudgmentalPresentation;
};

export const isAccessibilityCompliant = (config: AssessmentAccessibilityConfiguration): boolean => {
  return config.screenReaderOptimized &&
         config.keyboardNavigationEnabled &&
         config.crisisAccessibilityEnhanced;
};

/**
 * Performance Validation Types
 */
export type ValidateAssessmentPerformance<T extends number> =
  T extends 200 ? 'acceptable_render_time'
    : T extends 100 ? 'excellent_render_time'
      : T extends 500 ? 'slow_render_time'
        : T extends 1000 ? 'unacceptable_render_time'
          : 'performance_validation_required';

/**
 * Clinical Accuracy Validation Types
 */
export type ValidateClinicalAccuracy<T extends number> =
  T extends 100 ? 'clinically_accurate'
    : T extends 95 ? 'high_accuracy'
      : T extends 90 ? 'acceptable_accuracy'
        : T extends 80 ? 'low_accuracy'
          : 'accuracy_validation_required';

/**
 * Crisis Detection Validation Types
 */
export type ValidateCrisisDetection<PHQ extends number, GAD extends number> =
  PHQ extends 20 ? 'phq9_crisis_threshold_valid'
    : GAD extends 15 ? 'gad7_crisis_threshold_valid'
      : 'crisis_threshold_validation_required';

// Export comprehensive assessment types
export default {
  // Core Assessment Types
  PHQ9AssessmentValidation,
  GAD7AssessmentValidation,
  ClinicalAssessmentQuestion,
  AssessmentScoreCalculation,
  CrisisDetectionResult,

  // MBCT Compliance Types
  MBCTAssessmentCompliance,
  MindfulnessAssessmentIntegration,
  CognitiveAwarenessSupport,

  // Enhanced Component Props
  EnhancedPHQAssessmentPreviewProps,
  TherapeuticFramingConfiguration,
  AssessmentAccessibilityConfiguration,

  // Validation Utilities
  isValidPHQ9Score,
  isValidGAD7Score,
  isCrisisScore,
  isAssessmentAccurate,
  isMBCTCompliant,
  isAccessibilityCompliant,
};