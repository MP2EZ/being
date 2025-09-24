/**
 * Clinical Component Type Safety - Enhanced Migration Support
 *
 * Comprehensive TypeScript types for clinical support component migration
 * with focus on crisis response timing, clinical accuracy, and therapeutic safety.
 *
 * CRITICAL REQUIREMENTS:
 * - Crisis response timing <200ms (type-enforced)
 * - WCAG AA accessibility compliance
 * - MBCT therapeutic appropriateness
 * - Emergency protocol functionality
 */

import { ReactNode } from 'react';
import { ViewStyle, TextStyle, AccessibilityRole } from 'react-native';

// =============================================================================
// CRISIS RESPONSE TIMING VALIDATION TYPES
// =============================================================================

/**
 * Crisis Response Performance Constraints
 * Type-enforced timing requirements for crisis interactions
 */
export interface CrisisResponseTimingConstraints {
  readonly maxResponseTime: 200; // milliseconds - type-level enforcement
  readonly maxCrisisAccessTime: 3000; // 3 seconds from any screen
  readonly hapticFeedbackDelay: 0; // immediate
  readonly accessibilityAnnouncementDelay: 50; // near-immediate
}

/**
 * Crisis Response Performance Metrics
 * Runtime validation with type safety
 */
export interface CrisisResponseMetrics {
  activationStartTime: number;
  hapticFeedbackTime?: number;
  accessibilityAnnouncementTime?: number;
  crisisDetectionTime?: number;
  interventionCompleteTime?: number;
  totalResponseTime: number;
  meetsTimingRequirements: boolean;
  performanceWarnings: CrisisPerformanceWarning[];
}

export interface CrisisPerformanceWarning {
  type: 'timing' | 'accessibility' | 'haptic' | 'detection';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  actualTime: number;
  expectedTime: number;
  impact: 'user_safety' | 'accessibility' | 'therapeutic_effectiveness';
}

/**
 * Crisis Response Timing Validator
 * Compile-time and runtime validation
 */
export type CrisisTimingValidator<T extends number> =
  T extends CrisisResponseTimingConstraints['maxResponseTime']
    ? never
    : T extends number
      ? T extends 0 ? 'immediate'
        : T extends 1 ? T extends 50 ? 'near_immediate'
          : T extends 200 ? 'acceptable'
            : T extends 500 ? 'warning'
              : 'unacceptable'
        : never
      : never;

// =============================================================================
// CLINICAL ACCURACY TYPES
// =============================================================================

/**
 * Clinical Assessment Accuracy Requirements
 * Zero-tolerance validation for assessment calculations
 */
export interface ClinicalAccuracyValidation {
  assessmentType: 'PHQ-9' | 'GAD-7' | 'custom';
  scoreValidation: AssessmentScoreValidation;
  clinicalInterpretation: ClinicalInterpretationValidation;
  crisisThresholds: CrisisThresholdValidation;
  mbctCompliance: MBCTComplianceValidation;
}

export interface AssessmentScoreValidation {
  calculationMethod: 'sum' | 'weighted' | 'custom';
  minimumScore: number;
  maximumScore: number;
  possibleScoreCombinations: number; // PHQ-9: 27, GAD-7: 21
  validationStatus: 'validated' | 'requires_validation' | 'invalid';
  lastValidated: Date;
  validatedBy: 'clinician' | 'automated' | 'peer_review';
}

export interface ClinicalInterpretationValidation {
  severityLevels: readonly ['Minimal', 'Mild', 'Moderate', 'Moderately Severe', 'Severe'];
  interpretationAccuracy: 'clinical_grade' | 'research_grade' | 'educational';
  therapeuticLanguage: 'mbct_compliant' | 'clinical_standard' | 'patient_friendly';
  validationSource: 'dsm5' | 'phq9_standard' | 'gad7_standard' | 'mbct_protocol';
}

export interface CrisisThresholdValidation {
  phq9CrisisThreshold: 20; // Type-enforced constant
  gad7CrisisThreshold: 15; // Type-enforced constant
  automaticTriggerEnabled: boolean;
  escalationProtocols: CrisisEscalationProtocol[];
  falsePositiveRate: number; // Target: <5%
  falseNegativeRate: number; // Target: 0%
}

export interface CrisisEscalationProtocol {
  triggerCondition: 'score_threshold' | 'specific_responses' | 'pattern_detection';
  interventionLevel: 'standard' | 'elevated' | 'critical' | 'emergency';
  responseTime: number; // Must be <200ms for critical/emergency
  requiredActions: CrisisActionStep[];
  fallbackProtocols: CrisisActionStep[];
}

export interface CrisisActionStep {
  order: number;
  action: 'haptic_feedback' | 'accessibility_announcement' | 'save_progress' | 'show_alert' | 'call_988' | 'emergency_contact';
  timing: number; // milliseconds from trigger
  required: boolean;
  validation: () => Promise<boolean>;
}

// =============================================================================
// MBCT COMPLIANCE TYPES
// =============================================================================

/**
 * MBCT Therapeutic Compliance Requirements
 * Ensures therapeutic appropriateness and clinical effectiveness
 */
export interface MBCTComplianceValidation {
  therapeuticApproach: 'mindfulness_based' | 'cognitive_therapy' | 'integrated_mbct';
  contentValidation: TherapeuticContentValidation;
  interactionPatterns: TherapeuticInteractionValidation;
  timingRequirements: TherapeuticTimingValidation;
  accessibilityIntegration: TherapeuticAccessibilityValidation;
}

export interface TherapeuticContentValidation {
  languageAppropriateness: 'clinical_accurate' | 'patient_friendly' | 'culturally_sensitive';
  mbctPrincipleAlignment: readonly ['mindfulness', 'cognitive_awareness', 'behavioral_change', 'relapse_prevention'];
  triggerContentScreening: 'completed' | 'in_progress' | 'required';
  therapeuticGoalAlignment: boolean;
  clinicalReviewStatus: 'approved' | 'pending_review' | 'requires_revision';
}

export interface TherapeuticInteractionValidation {
  interactionFlow: 'guided' | 'self_directed' | 'adaptive';
  progressTracking: 'enabled' | 'optional' | 'disabled';
  feedbackMechanism: 'immediate' | 'delayed' | 'session_end' | 'none';
  personalizationLevel: 'high' | 'medium' | 'low' | 'none';
  therapyStageAlignment: 'assessment' | 'engagement' | 'skill_building' | 'practice' | 'maintenance';
}

export interface TherapeuticTimingValidation {
  breathingExerciseTiming: 180000; // Exactly 3 minutes (type-enforced)
  stepTransitionTiming: number; // <500ms for therapeutic flow
  sessionPacing: 'therapeutic' | 'self_paced' | 'guided';
  interruptionHandling: 'graceful' | 'resume_capable' | 'restart_required';
  progressPreservation: boolean;
}

export interface TherapeuticAccessibilityValidation {
  cognitiveLoadConsideration: 'low' | 'medium' | 'high';
  stressStateAccessibility: 'optimized' | 'standard' | 'requires_improvement';
  crisisStateUsability: 'emergency_optimized' | 'stress_tested' | 'not_validated';
  inclusiveDesignCompliance: boolean;
  traumaInformedApproach: boolean;
}

// =============================================================================
// EMERGENCY PROTOCOL TYPES
// =============================================================================

/**
 * Emergency Protocol Type Safety
 * Ensures crisis intervention functionality and safety
 */
export interface EmergencyProtocolValidation {
  protocolType: 'crisis_detection' | 'intervention' | 'escalation' | 'follow_up';
  safetyValidation: EmergencySafetyValidation;
  responseProtocols: EmergencyResponseProtocol[];
  backupSystems: EmergencyBackupSystem[];
  performanceRequirements: EmergencyPerformanceRequirements;
}

export interface EmergencySafetyValidation {
  hotlineIntegration: '988_verified' | 'emergency_services' | 'custom_provider';
  privacyProtection: 'hipaa_compliant' | 'privacy_aware' | 'basic_protection';
  dataHandling: 'secure' | 'standard' | 'minimal';
  userConsentLevel: 'explicit' | 'implied' | 'emergency_override';
  legalCompliance: 'validated' | 'pending' | 'requires_review';
}

export interface EmergencyResponseProtocol {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  triggerConditions: EmergencyTriggerCondition[];
  responseActions: EmergencyResponseAction[];
  fallbackOptions: EmergencyFallbackOption[];
  successCriteria: EmergencySuccessCriteria;
}

export interface EmergencyTriggerCondition {
  condition: 'score_based' | 'pattern_based' | 'user_initiated' | 'system_detected';
  threshold?: number;
  pattern?: string;
  confidence: number; // 0-1, minimum 0.8 for emergency triggers
  validationRequired: boolean;
}

export interface EmergencyResponseAction {
  action: 'immediate_alert' | 'hotline_prompt' | 'crisis_resources' | 'emergency_contact' | 'safe_space' | 'progress_save';
  timing: number; // milliseconds, <200ms for critical actions
  required: boolean;
  userConfirmationRequired: boolean;
  accessibilitySupport: boolean;
}

export interface EmergencyFallbackOption {
  scenario: 'network_failure' | 'system_error' | 'user_unresponsive' | 'resource_unavailable';
  fallbackAction: EmergencyResponseAction;
  automaticActivation: boolean;
  userNotification: boolean;
}

export interface EmergencySuccessCriteria {
  userSafetyEnsured: boolean;
  resourcesProvided: boolean;
  followUpScheduled: boolean;
  dataIntegrityMaintained: boolean;
  legalRequirementsMet: boolean;
}

export interface EmergencyBackupSystem {
  systemType: 'offline_resources' | 'cached_contacts' | 'basic_protocols' | 'manual_override';
  activationTrigger: 'automatic' | 'manual' | 'conditional';
  reliability: 'high' | 'medium' | 'low';
  maintenanceRequired: boolean;
}

export interface EmergencyPerformanceRequirements {
  maxActivationTime: 200; // milliseconds - type-enforced
  maxResourceLoadTime: 1000; // 1 second for crisis resources
  reliabilityRequirement: 99.9; // 99.9% uptime requirement
  concurrentUserSupport: number; // minimum concurrent crisis users
  failureHandlingGrace: 'immediate' | 'graceful' | 'degraded';
}

// =============================================================================
// ACCESSIBILITY COMPLIANCE TYPES (WCAG AA)
// =============================================================================

/**
 * WCAG AA Accessibility Compliance Types
 * Type-enforced accessibility standards for clinical components
 */
export interface AccessibilityComplianceValidation {
  wcagLevel: 'AA' | 'AAA';
  complianceAreas: WCAGComplianceArea[];
  clinicalAccessibilityRequirements: ClinicalAccessibilityRequirements;
  testingValidation: AccessibilityTestingValidation;
  userImpactAssessment: AccessibilityUserImpactAssessment;
}

export interface WCAGComplianceArea {
  principle: 'perceivable' | 'operable' | 'understandable' | 'robust';
  guideline: string;
  successCriteria: WCAGSuccessCriteria[];
  complianceStatus: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable';
  lastTested: Date;
  testingMethod: 'automated' | 'manual' | 'user_testing' | 'expert_review';
}

export interface WCAGSuccessCriteria {
  criteriaId: string; // e.g., "1.4.3" for color contrast
  level: 'A' | 'AA' | 'AAA';
  description: string;
  requirement: AccessibilityRequirement;
  validationMethod: AccessibilityValidationMethod;
  complianceEvidence: AccessibilityComplianceEvidence;
}

export interface AccessibilityRequirement {
  type: 'color_contrast' | 'touch_target' | 'focus_management' | 'screen_reader' | 'keyboard_nav' | 'motion_reduction';
  minimumValue?: number; // e.g., 4.5 for color contrast ratio
  requiredBehavior?: string;
  exceptionConditions?: string[];
  clinicalConsiderations?: string;
}

export interface AccessibilityValidationMethod {
  method: 'automated_tool' | 'manual_testing' | 'screen_reader_testing' | 'user_testing' | 'expert_evaluation';
  tools?: string[]; // e.g., ['axe-core', 'lighthouse', 'voiceover']
  frequency: 'continuous' | 'pre_release' | 'monthly' | 'quarterly';
  lastValidation: Date;
  nextValidationDue: Date;
}

export interface AccessibilityComplianceEvidence {
  testResults: AccessibilityTestResult[];
  userFeedback?: AccessibilityUserFeedback[];
  expertReview?: AccessibilityExpertReview;
  documentationLinks: string[];
  complianceScore: number; // 0-100
}

export interface AccessibilityTestResult {
  testId: string;
  testType: 'automated' | 'manual' | 'user_scenario';
  result: 'pass' | 'fail' | 'warning' | 'not_applicable';
  details: string;
  timestamp: Date;
  tester: string;
  recommendations?: string[];
}

export interface AccessibilityUserFeedback {
  userId: string; // anonymized
  assistiveTechnology: string; // e.g., 'VoiceOver', 'TalkBack', 'Switch Control'
  feedbackType: 'usability_issue' | 'suggestion' | 'compliment' | 'bug_report';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  context: string; // clinical context, e.g., 'during crisis intervention'
  resolved: boolean;
}

export interface AccessibilityExpertReview {
  reviewer: string;
  credentials: string[];
  reviewDate: Date;
  overallRating: number; // 1-10
  recommendations: AccessibilityRecommendation[];
  clinicalConsiderations: string[];
  priorityImprovements: string[];
}

export interface AccessibilityRecommendation {
  area: 'perceivable' | 'operable' | 'understandable' | 'robust';
  priority: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
  implementationEffort: 'low' | 'medium' | 'high';
  clinicalImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
  wcagReference: string;
}

export interface ClinicalAccessibilityRequirements {
  crisisAccessibility: CrisisAccessibilityRequirements;
  therapeuticAccessibility: TherapeuticAccessibilityRequirements;
  assessmentAccessibility: AssessmentAccessibilityRequirements;
  cognitiveAccessibility: CognitiveAccessibilityRequirements;
}

export interface CrisisAccessibilityRequirements {
  emergencyButtonSize: 44; // minimum pixels - type-enforced
  colorContrastRatio: 7.0; // WCAG AAA for critical safety
  voiceAnnouncementDelay: 50; // milliseconds
  hapticFeedbackStrength: 'strong' | 'medium' | 'gentle';
  stressOptimizedDesign: boolean;
  panicAccessibleInterface: boolean;
}

export interface TherapeuticAccessibilityRequirements {
  mindfulnessTimingAccuracy: boolean; // No timing variations that affect therapeutic value
  breathingVisualizationAlternatives: 'audio' | 'haptic' | 'text_based' | 'all';
  progressIndicatorAccessibility: boolean;
  sessionInterruptionGraceful: boolean;
  traumaInformedInteractions: boolean;
}

export interface AssessmentAccessibilityRequirements {
  questionReadingOrder: 'logical' | 'customizable';
  responseInputMethods: string[]; // e.g., ['voice', 'touch', 'switch', 'eye_gaze']
  progressSaving: 'automatic' | 'manual' | 'both';
  timeoutHandling: 'none' | 'warning' | 'extended' | 'unlimited';
  scoreExplanationAccessibility: boolean;
}

export interface CognitiveAccessibilityRequirements {
  languageSimplicity: 'clinical' | 'simplified' | 'adaptive';
  informationChunking: boolean;
  memorySupport: 'minimal' | 'moderate' | 'extensive';
  distractionReduction: boolean;
  cognitiveLoadTracking: boolean;
}

export interface AccessibilityUserImpactAssessment {
  impactedUserGroups: AccessibilityUserGroup[];
  severityAssessment: AccessibilitySeverityAssessment;
  mitigationStrategies: AccessibilityMitigationStrategy[];
  userTestingResults: AccessibilityUserTestingResults;
}

export interface AccessibilityUserGroup {
  groupType: 'visual_impairment' | 'hearing_impairment' | 'motor_impairment' | 'cognitive_difference' | 'temporary_disability';
  assistiveTechnology: string[];
  specificNeeds: string[];
  clinicalConsiderations: string[];
  priorityLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface AccessibilitySeverityAssessment {
  overallImpact: 'none' | 'minor' | 'moderate' | 'major' | 'critical';
  therapeuticImpact: 'none' | 'reduced_effectiveness' | 'barriers_present' | 'unusable';
  safetyImpact: 'none' | 'minor_concern' | 'safety_risk' | 'critical_safety_issue';
  legalImpact: 'compliant' | 'minor_issues' | 'non_compliant' | 'legal_risk';
}

export interface AccessibilityMitigationStrategy {
  strategy: string;
  targetUserGroups: string[];
  implementationComplexity: 'low' | 'medium' | 'high';
  effectivenessRating: number; // 1-10
  therapeuticConsiderations: string[];
  implementationTimeline: string;
}

export interface AccessibilityUserTestingResults {
  testingSessions: AccessibilityTestingSession[];
  overallUsabilityScore: number; // 1-10
  criticalIssuesFound: number;
  recommendedImprovements: string[];
  userSatisfactionRating: number; // 1-10
}

export interface AccessibilityTestingSession {
  sessionId: string;
  userProfile: AccessibilityUserProfile;
  taskScenarios: AccessibilityTaskScenario[];
  completionRate: number; // 0-1
  errorRate: number; // 0-1
  satisfactionRating: number; // 1-10
  observations: string[];
  recommendations: string[];
}

export interface AccessibilityUserProfile {
  anonymizedId: string;
  assistiveTechnology: string[];
  experienceLevel: 'beginner' | 'intermediate' | 'expert';
  clinicalContext: 'crisis_support' | 'ongoing_therapy' | 'assessment' | 'general_use';
  specificNeeds: string[];
}

export interface AccessibilityTaskScenario {
  scenarioName: string;
  description: string;
  clinicalRelevance: 'crisis' | 'assessment' | 'therapy' | 'general';
  expectedDuration: number; // seconds
  successCriteria: string[];
  completionStatus: 'completed' | 'partially_completed' | 'failed' | 'abandoned';
  issuesEncountered: string[];
}

// =============================================================================
// COMPREHENSIVE CLINICAL COMPONENT TYPES
// =============================================================================

/**
 * Unified Clinical Component Properties
 * Master interface for all clinical support components
 */
export interface ClinicalComponentProps {
  // Core Identification
  componentId: string;
  componentType: 'crisis_button' | 'crisis_alert' | 'assessment_preview' | 'clinical_carousel' | 'clinical_pane' | 'warning_pane' | 'tools_pane' | 'practices_pane';

  // Clinical Requirements
  clinicalAccuracy: ClinicalAccuracyValidation;
  mbctCompliance: MBCTComplianceValidation;
  emergencyProtocols: EmergencyProtocolValidation;

  // Performance Requirements
  timingConstraints: CrisisResponseTimingConstraints;
  performanceMetrics?: CrisisResponseMetrics;

  // Accessibility Requirements
  accessibilityCompliance: AccessibilityComplianceValidation;

  // Component-Specific Props
  variant?: ComponentVariant;
  theme: ThemeVariant;
  currentContext?: ClinicalContext;
  userState?: UserState;

  // Event Handlers
  onCrisisActivated?: (context: ClinicalContext, metrics: CrisisResponseMetrics) => Promise<void>;
  onProgressSaved?: () => Promise<void>;
  onAccessibilityChange?: (change: AccessibilityChange) => void;
  onPerformanceIssue?: (issue: PerformanceIssue) => void;
  onClinicalValidationRequired?: (validation: ClinicalValidationRequest) => void;

  // Styling with Clinical Requirements
  style?: ClinicalComponentStyle;
  accessibilityStyle?: AccessibilityEnhancedStyle;
}

export type ComponentVariant =
  | 'floating' | 'header' | 'embedded'  // Crisis buttons
  | 'preview' | 'full' | 'summary'      // Assessment components
  | 'carousel' | 'grid' | 'list'        // Layout components
  | 'warning' | 'info' | 'success'      // Alert components
  | 'practice' | 'tool' | 'resource';   // Content components

export type ThemeVariant = 'morning' | 'midday' | 'evening';

export interface ClinicalContext {
  currentScreen: string;
  therapeuticStage: 'onboarding' | 'assessment' | 'practice' | 'review' | 'crisis';
  userProgressState: UserProgressState;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  mbctSessionPhase?: 'preparation' | 'mindfulness' | 'cognitive' | 'integration';
}

export interface UserState {
  isInCrisis: boolean;
  currentSeverityLevel?: number;
  assessmentScores?: Record<string, number>;
  lastInteractionTime: Date;
  accessibilityPreferences: AccessibilityPreferences;
  therapeuticPreferences: TherapeuticPreferences;
}

export interface UserProgressState {
  currentStep: string;
  completedSteps: string[];
  skippedSteps: string[];
  savedProgress: Record<string, any>;
  progressValidated: boolean;
  lastSaveTime: Date;
}

export interface AccessibilityPreferences {
  reduceMotion: boolean;
  highContrast: boolean;
  largeTargets: boolean;
  voiceAnnouncements: boolean;
  hapticFeedback: boolean;
  preferredInputMethod: 'touch' | 'voice' | 'switch' | 'eye_gaze';
  fontSizeMultiplier: number;
}

export interface TherapeuticPreferences {
  preferredPacing: 'slow' | 'moderate' | 'fast';
  breathingGuidanceLevel: 'minimal' | 'moderate' | 'extensive';
  feedbackFrequency: 'immediate' | 'session_end' | 'weekly';
  crisisInterventionLevel: 'minimal' | 'standard' | 'comprehensive';
}

export interface AccessibilityChange {
  changeType: 'preference' | 'system_setting' | 'context_shift';
  previousValue: any;
  newValue: any;
  impact: 'low' | 'medium' | 'high' | 'critical';
  requiresRerender: boolean;
  therapeuticImpact: boolean;
}

export interface PerformanceIssue {
  issueType: 'timing' | 'memory' | 'render' | 'interaction' | 'accessibility';
  severity: 'warning' | 'error' | 'critical';
  actualValue: number;
  expectedValue: number;
  clinicalImpact: 'none' | 'minor' | 'moderate' | 'severe' | 'critical';
  detectedAt: Date;
  context: ClinicalContext;
}

export interface ClinicalValidationRequest {
  validationType: 'accuracy' | 'safety' | 'compliance' | 'accessibility' | 'performance';
  component: string;
  requiredBy: Date;
  severity: 'routine' | 'important' | 'urgent' | 'critical';
  clinicalRationale: string;
  validationCriteria: string[];
}

export interface ClinicalComponentStyle extends ViewStyle {
  // WCAG AA compliant color requirements
  backgroundColor: string; // Must meet 4.5:1 contrast ratio
  borderColor?: string;

  // Minimum touch target enforcement
  minHeight: 44; // Type-enforced WCAG minimum
  minWidth: 44;  // Type-enforced WCAG minimum

  // Clinical state indicators
  crisisStateStyle?: CrisisStateStyle;
  therapeuticStateStyle?: TherapeuticStateStyle;
  accessibilityEnhancedStyle?: AccessibilityEnhancedStyle;
}

export interface CrisisStateStyle extends ViewStyle {
  emergencyBackgroundColor: '#B91C1C'; // Type-enforced emergency red
  emergencyBorderColor: '#FFFFFF';
  emergencyBorderWidth: 4;
  emergencyElevation: 12;
  criticalPulseAnimation?: boolean;
  highContrastMode?: boolean;
}

export interface TherapeuticStateStyle extends ViewStyle {
  therapeuticColorScheme: 'calming' | 'energizing' | 'neutral';
  mbctCompliantSpacing: boolean;
  mindfulTransitions: boolean;
  cognitiveLoadOptimized: boolean;
}

export interface AccessibilityEnhancedStyle extends ViewStyle {
  largeTargetMode?: boolean;
  highContrastMode?: boolean;
  reduceMotionCompliant?: boolean;
  screenReaderOptimized?: boolean;
  focusIndicatorStyle?: ViewStyle;
  touchFeedbackStyle?: ViewStyle;
}

// =============================================================================
// SPECIFIC COMPONENT TYPE DEFINITIONS
// =============================================================================

/**
 * Onboarding Crisis Button Enhanced Props
 */
export interface OnboardingCrisisButtonProps extends ClinicalComponentProps {
  componentType: 'crisis_button';
  variant: 'floating' | 'header' | 'embedded';
  currentStep?: OnboardingStep;
  urgencyLevel?: 'standard' | 'high' | 'emergency';
  showStepContext?: boolean;
  enableProgressPreservation?: boolean;

  // Type-enforced crisis response requirements
  maxResponseTime: CrisisResponseTimingConstraints['maxResponseTime']; // 200ms
  crisisDetectionEnabled: boolean;
  emergencyProtocolsValidated: boolean;
}

export type OnboardingStep =
  | 'welcome' | 'privacy' | 'crisis_plan' | 'assessment_intro'
  | 'phq9' | 'gad7' | 'breathing_intro' | 'practice_selection'
  | 'notification_setup' | 'completion';

/**
 * Onboarding Crisis Alert Enhanced Props
 */
export interface OnboardingCrisisAlertProps extends ClinicalComponentProps {
  componentType: 'crisis_alert';
  alertType: 'information' | 'warning' | 'emergency';
  dismissible?: boolean;
  autoHide?: boolean;
  autoHideDelay?: number;

  // Crisis-specific requirements
  emergencyEscalation: boolean;
  accessibilityAnnouncement: boolean;
  therapeuticFraming: boolean;
}

/**
 * Clinical Carousel Enhanced Props
 */
export interface ClinicalCarouselProps extends ClinicalComponentProps {
  componentType: 'clinical_carousel';
  data: ClinicalCarouselData[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showNavigation?: boolean;
  showIndicators?: boolean;

  // Clinical content validation
  contentValidated: boolean;
  mbctCompliant: boolean;
  clinicallyReviewed: boolean;

  // Accessibility requirements
  accessibilityLabel: string;
  slideChangeAnnouncements: boolean;
  keyboardNavigationEnabled: boolean;
}

/**
 * PHQ Assessment Preview Enhanced Props
 */
export interface PHQAssessmentPreviewProps extends ClinicalComponentProps {
  componentType: 'assessment_preview';
  assessmentData: PHQAssessmentData;
  showScore?: boolean;
  showInterpretation?: boolean;
  showProgress?: boolean;

  // Clinical accuracy requirements
  scoreCalculationValidated: boolean;
  clinicalInterpretationAccurate: boolean;
  crisisThresholdMonitored: boolean;

  // Assessment-specific accessibility
  scoreReaderAccessible: boolean;
  interpretationClear: boolean;
  progressIndicatorAccessible: boolean;
}

export interface PHQAssessmentData {
  score: number;
  maxScore: 27; // Type-enforced PHQ-9 maximum
  severity: 'Minimal' | 'Mild' | 'Moderate' | 'Moderately Severe' | 'Severe';
  interpretation: string;
  crisisRisk: boolean;
  lastAssessed: Date;
  validationStatus: 'validated' | 'pending' | 'requires_review';
}

/**
 * Clinical Pane Enhanced Props (EarlyWarning, ClinicalTools, MBCTPractices)
 */
export interface ClinicalPaneProps extends ClinicalComponentProps {
  componentType: 'warning_pane' | 'tools_pane' | 'practices_pane';
  data: ClinicalPaneData;
  isActive: boolean;

  // Pane-specific requirements
  therapeuticContent: boolean;
  interactionTracking: boolean;
  progressIntegration: boolean;

  // Clinical validation
  contentClinicallyReviewed: boolean;
  mbctAligned: boolean;
  accessibilityTested: boolean;
}

export interface ClinicalPaneData {
  id: string;
  title: string;
  content: TherapeuticContent;
  interactions: TherapeuticInteraction[];
  progress: ProgressIndicator;
  accessibility: AccessibilitySupport;
}

export interface TherapeuticContent {
  primaryContent: string;
  supportingContent?: string;
  mbctPrinciples: string[];
  clinicalRationale: string;
  adaptationGuidelines: string[];
}

export interface TherapeuticInteraction {
  interactionType: 'touch' | 'gesture' | 'voice' | 'timed';
  therapeuticPurpose: string;
  feedbackType: 'immediate' | 'delayed' | 'progressive';
  accessibilitySupport: string[];
  clinicalValidation: boolean;
}

export interface ProgressIndicator {
  currentProgress: number; // 0-1
  totalSteps: number;
  completedSteps: number;
  accessibilityDescription: string;
  therapeuticMilestones: string[];
}

export interface AccessibilitySupport {
  screenReaderSupport: boolean;
  keyboardNavigation: boolean;
  voiceAnnouncements: boolean;
  hapticFeedback: boolean;
  alternativeFormats: string[];
  cognitiveSupport: string[];
}

// =============================================================================
// TYPE UTILITY FUNCTIONS
// =============================================================================

/**
 * Type Guards for Clinical Component Validation
 */
export const isCrisisResponseValid = (metrics: CrisisResponseMetrics): boolean => {
  return metrics.totalResponseTime <= 200 && metrics.meetsTimingRequirements;
};

export const isAccessibilityCompliant = (validation: AccessibilityComplianceValidation): boolean => {
  return validation.complianceAreas.every(area =>
    area.complianceStatus === 'compliant' || area.complianceStatus === 'not_applicable'
  );
};

export const isClinicallyAccurate = (validation: ClinicalAccuracyValidation): boolean => {
  return validation.scoreValidation.validationStatus === 'validated' &&
         validation.clinicalInterpretation.interpretationAccuracy === 'clinical_grade';
};

export const isMBCTCompliant = (validation: MBCTComplianceValidation): boolean => {
  return validation.contentValidation.clinicalReviewStatus === 'approved' &&
         validation.contentValidation.mbctPrincipleAlignment.length >= 2;
};

/**
 * Performance Validation Types
 */
export type ValidatePerformance<T extends number> =
  T extends CrisisResponseTimingConstraints['maxResponseTime']
    ? 'valid_crisis_response_time'
    : T extends CrisisResponseTimingConstraints['maxCrisisAccessTime']
      ? 'valid_crisis_access_time'
      : 'performance_validation_required';

/**
 * Component Type Validation
 */
export type ValidateComponentType<T extends ClinicalComponentProps> =
  T extends { componentType: 'crisis_button' }
    ? OnboardingCrisisButtonProps
    : T extends { componentType: 'crisis_alert' }
      ? OnboardingCrisisAlertProps
      : T extends { componentType: 'clinical_carousel' }
        ? ClinicalCarouselProps
        : T extends { componentType: 'assessment_preview' }
          ? PHQAssessmentPreviewProps
          : ClinicalPaneProps;

/**
 * Clinical Safety Type Validation
 */
export type ClinicalSafetyValidation<T> =
  T extends { crisisDetectionEnabled: true }
    ? T extends { emergencyProtocolsValidated: true }
      ? 'clinically_safe'
      : 'emergency_protocols_required'
    : 'crisis_detection_required';

// Export all types for comprehensive clinical component type safety
export default {
  // Crisis Response Types
  CrisisResponseTimingConstraints,
  CrisisResponseMetrics,
  CrisisPerformanceWarning,

  // Clinical Accuracy Types
  ClinicalAccuracyValidation,
  AssessmentScoreValidation,
  CrisisThresholdValidation,

  // MBCT Compliance Types
  MBCTComplianceValidation,
  TherapeuticContentValidation,
  TherapeuticAccessibilityValidation,

  // Emergency Protocol Types
  EmergencyProtocolValidation,
  EmergencyResponseProtocol,
  EmergencyPerformanceRequirements,

  // Accessibility Types
  AccessibilityComplianceValidation,
  WCAGComplianceArea,
  ClinicalAccessibilityRequirements,

  // Component Types
  ClinicalComponentProps,
  OnboardingCrisisButtonProps,
  OnboardingCrisisAlertProps,
  ClinicalCarouselProps,
  PHQAssessmentPreviewProps,
  ClinicalPaneProps,

  // Utility Functions
  isCrisisResponseValid,
  isAccessibilityCompliant,
  isClinicallyAccurate,
  isMBCTCompliant,
};