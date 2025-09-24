/**
 * MBCT Therapeutic Interaction Types
 *
 * Comprehensive type safety for Mindfulness-Based Cognitive Therapy (MBCT)
 * interactions, ensuring therapeutic appropriateness and clinical effectiveness.
 *
 * THERAPEUTIC REQUIREMENTS:
 * - MBCT principle alignment (mindfulness, cognitive awareness, behavioral change)
 * - Therapeutic timing accuracy (breathing exercises, session pacing)
 * - Non-judgmental language validation
 * - Self-compassion integration
 * - Trauma-informed design principles
 */

import { ReactNode } from 'react';
import { ViewStyle, TextStyle, Animated } from 'react-native';

// =============================================================================
// CORE MBCT PRINCIPLES VALIDATION
// =============================================================================

/**
 * MBCT Core Principles Integration
 * Type-enforced therapeutic principle compliance
 */
export interface MBCTCoreCompliance {
  readonly principles: MBCTPrinciplesValidation;
  therapeuticApproach: TherapeuticApproachValidation;
  clinicalIntegration: ClinicalIntegrationValidation;
  mindfulnessIntegration: MindfulnessIntegrationValidation;
  cognitiveTherapyIntegration: CognitiveTherapyIntegration;
  behavioralChangeSupport: BehavioralChangeSupport;
  relapsePreventionIntegration: RelapsePreventionIntegration;
}

export interface MBCTPrinciplesValidation {
  readonly mindfulnessBased: true; // Type-enforced core principle
  readonly cognitiveTherapy: true; // Type-enforced core principle
  readonly integratedApproach: true; // Type-enforced integration requirement
  readonly evidenceBased: true; // Type-enforced evidence requirement
  principleAlignment: MBCTPrincipleAlignment[];
  therapeuticRationale: string;
  clinicalValidation: ClinicalValidationStatus;
  lastReviewed: Date;
  reviewedBy: 'clinician' | 'mbct_specialist' | 'clinical_team';
}

export interface MBCTPrincipleAlignment {
  principle: 'mindfulness' | 'cognitive_awareness' | 'behavioral_change' | 'relapse_prevention' | 'self_compassion' | 'present_moment_awareness';
  integrationLevel: 'core' | 'supporting' | 'contextual' | 'implicit';
  therapeuticJustification: string;
  implementationQuality: 'excellent' | 'good' | 'adequate' | 'needs_improvement';
  userExperienceAlignment: boolean;
  clinicalOutcomeSupport: boolean;
}

export interface TherapeuticApproachValidation {
  approachType: 'mindfulness_based_cognitive_therapy';
  therapeuticAlliance: TherapeuticAllianceSupport;
  collaborativeApproach: CollaborativeApproachIntegration;
  psychoeducationIntegration: PsychoeducationIntegration;
  skillBuildingProgression: SkillBuildingProgression;
  therapeuticHomework: TherapeuticHomeworkIntegration;
  sessionStructure: MBCTSessionStructure;
}

export interface TherapeuticAllianceSupport {
  trustBuilding: boolean;
  empathyDemonstration: boolean;
  genuinenessExpression: boolean;
  unconditionalPositiveRegard: boolean;
  culturalSensitivity: boolean;
  traumaInformedApproach: boolean;
  powerDynamicsAwareness: boolean;
  userAgencyRespect: boolean;
}

export interface CollaborativeApproachIntegration {
  sharedDecisionMaking: boolean;
  userAsExpert: boolean;
  therapeuticGoalSetting: boolean;
  progressReviewCollaboration: boolean;
  feedbackIntegration: boolean;
  adaptationFlexibility: boolean;
  userPaceRespect: boolean;
  autonomySupport: boolean;
}

export interface PsychoeducationIntegration {
  mindfulnessEducation: MindfulnessEducationComponent[];
  cognitiveModelEducation: CognitiveModelEducation;
  depressionEducation: DepressionEducationComponent;
  anxietyEducation: AnxietyEducationComponent;
  stressEducation: StressEducationComponent;
  neuroplasticityEducation: NeuroplasticityEducation;
  mbctRationaleEducation: MBCTRationaleEducation;
}

export interface MindfulnessEducationComponent {
  topic: 'mindfulness_definition' | 'present_moment_awareness' | 'non_judgmental_awareness' | 'beginner_mind' | 'acceptance' | 'letting_go';
  educationLevel: 'basic' | 'intermediate' | 'advanced';
  deliveryMethod: 'text' | 'audio' | 'video' | 'interactive' | 'experiential';
  therapeuticFraming: string;
  commonMisconceptionAddressed: string[];
  practicalApplications: string[];
  accessibilityConsiderations: string[];
}

export interface CognitiveModelEducation {
  thoughtEmotionConnection: boolean;
  automaticThoughts: boolean;
  cognitiveDistortions: boolean;
  metacognition: boolean;
  thoughtObservation: boolean;
  cognitiveFlexibility: boolean;
  balancedThinking: boolean;
  thoughtDefusion: boolean;
}

export interface DepressionEducationComponent {
  depressionSymptoms: boolean;
  depressionCycle: boolean;
  mindfulnessAndDepression: boolean;
  rumInationPatterns: boolean;
  behavioralActivation: boolean;
  socialConnection: boolean;
  selfCompassion: boolean;
  hopeCultivation: boolean;
}

export interface AnxietyEducationComponent {
  anxietySymptoms: boolean;
  anxietyCycle: boolean;
  mindfulnessAndAnxiety: boolean;
  worryPatterns: boolean;
  avoidanceBehaviors: boolean;
  exposureTherapyBasics: boolean;
  relaxationTechniques: boolean;
  groundingTechniques: boolean;
}

export interface StressEducationComponent {
  stressResponse: boolean;
  stressAndHealth: boolean;
  mindfulnessAndStress: boolean;
  stressManagement: boolean;
  workLifeBalance: boolean;
  resilience: boolean;
  copingStrategies: boolean;
  socialSupport: boolean;
}

export interface NeuroplasticityEducation {
  brainChangeability: boolean;
  mindfulnessAndBrain: boolean;
  habitFormation: boolean;
  practiceImportance: boolean;
  progressPatterns: boolean;
  setbackNormalization: boolean;
  longTermBenefits: boolean;
  scienceExplanation: boolean;
}

export interface MBCTRationaleEducation {
  mbctOverview: boolean;
  researchEvidence: boolean;
  uniqueFeatures: boolean;
  expectedOutcomes: boolean;
  commitmentRequirements: boolean;
  sessionStructure: boolean;
  homeworkExpectations: boolean;
  relapsePrevention: boolean;
}

// =============================================================================
// MINDFULNESS INTEGRATION TYPES
// =============================================================================

/**
 * Mindfulness Practice Integration
 * Type-safe mindfulness components with therapeutic validation
 */
export interface MindfulnessIntegrationValidation {
  practiceTypes: MindfulnessPracticeType[];
  guidanceQuality: MindfulnessGuidanceQuality;
  progressionStructure: MindfulnessProgressionStructure;
  adaptationCapabilities: MindfulnessAdaptationCapabilities;
  accessibilityIntegration: MindfulnessAccessibilityIntegration;
  therapeuticIntegration: MindfulnessTherapeuticIntegration;
  qualityAssurance: MindfulnessQualityAssurance;
}

export interface MindfulnessPracticeType {
  practiceId: string;
  practiceName: string;
  practiceCategory: 'formal' | 'informal' | 'movement' | 'breathing' | 'body' | 'cognitive' | 'loving_kindness';
  duration: MindfulnessDuration;
  guidanceType: 'self_guided' | 'audio_guided' | 'text_guided' | 'video_guided' | 'interactive';
  therapeuticPurpose: TherapeuticPurpose;
  mbctAlignment: MBCTAlignmentValidation;
  prerequisiteSkills: string[];
  adaptationOptions: AdaptationOption[];
  contraindications: string[];
  clinicalValidation: boolean;
}

export interface MindfulnessDuration {
  minimumDuration: number; // seconds
  maximumDuration: number; // seconds
  optimalDuration: number; // seconds
  flexibilityAllowed: boolean;
  userPacingSupported: boolean;
  pausingAllowed: boolean;
  extendingAllowed: boolean;
  shorteningAllowed: boolean;
}

export interface TherapeuticPurpose {
  primaryPurpose: 'awareness_cultivation' | 'emotion_regulation' | 'stress_reduction' | 'cognitive_flexibility' | 'self_compassion' | 'grounding' | 'concentration';
  secondaryPurposes: string[];
  therapeuticMechanism: string;
  expectedBenefits: string[];
  skillsDeveloped: string[];
  therapeuticStage: 'introduction' | 'skill_building' | 'integration' | 'maintenance' | 'crisis_support';
  clinicalIndications: string[];
}

export interface MBCTAlignmentValidation {
  coreAlignmentScore: number; // 0-100
  principleIntegration: MBCTPrincipleIntegration[];
  therapeuticCoherence: boolean;
  evidenceSupport: string[];
  clinicalRationale: string;
  userExperienceQuality: 'excellent' | 'good' | 'adequate' | 'needs_improvement';
}

export interface MBCTPrincipleIntegration {
  principle: 'mindfulness' | 'cognitive_awareness' | 'behavioral_change' | 'relapse_prevention';
  integrationQuality: 'seamless' | 'well_integrated' | 'adequate' | 'forced' | 'missing';
  implementationExamples: string[];
  userExperienceImpact: 'positive' | 'neutral' | 'negative';
  therapeuticValue: 'high' | 'medium' | 'low';
}

export interface AdaptationOption {
  adaptationType: 'duration' | 'posture' | 'guidance_level' | 'sensory_modality' | 'cognitive_load' | 'physical_ability' | 'trauma_sensitivity';
  adaptationDescription: string;
  accessibilityBenefit: string[];
  therapeuticImpact: 'none' | 'minimal' | 'significant';
  implementationComplexity: 'simple' | 'moderate' | 'complex';
  userControlLevel: 'full' | 'guided' | 'predetermined';
}

export interface MindfulnessGuidanceQuality {
  voiceQuality: VoiceGuidanceQuality;
  instructionClarity: InstructionClarityValidation;
  pacingAppropriate: PacingValidation;
  languageTherapeutic: TherapeuticLanguageValidation;
  inclusivityLevel: InclusivityValidation;
  traumaSensitivity: TraumaSensitivityValidation;
}

export interface VoiceGuidanceQuality {
  voiceTone: 'warm' | 'neutral' | 'calming' | 'energetic';
  voicePace: 'slow' | 'moderate' | 'natural' | 'varied';
  voiceClarity: 'excellent' | 'good' | 'adequate' | 'poor';
  therapeuticPresence: boolean;
  culturalSensitivity: boolean;
  genderInclusive: boolean;
  ageAppropriate: boolean;
  professionalQuality: boolean;
}

export interface InstructionClarityValidation {
  clarityScore: number; // 0-100
  languageSimplicity: 'very_simple' | 'simple' | 'moderate' | 'complex';
  instructionLength: 'concise' | 'appropriate' | 'verbose';
  stepByStepStructure: boolean;
  metaphorQuality: 'helpful' | 'adequate' | 'confusing' | 'absent';
  culturalRelevance: boolean;
  technicalJargonLevel: 'none' | 'minimal' | 'moderate' | 'excessive';
}

export interface PacingValidation {
  overallPacing: 'too_slow' | 'slow' | 'appropriate' | 'fast' | 'too_fast';
  instructionPacing: 'well_spaced' | 'adequate' | 'rushed' | 'dragging';
  silencePeriods: 'appropriate' | 'too_long' | 'too_short' | 'missing';
  transitionSmooth: boolean;
  userPaceAccommodation: boolean;
  flexibilityProvided: boolean;
}

export interface TherapeuticLanguageValidation {
  nonjudgmentalLanguage: boolean;
  selfCompassionateFraming: boolean;
  encouragingTone: boolean;
  validatingLanguage: boolean;
  hopeEngendering: boolean;
  empoweringLanguage: boolean;
  traumaInformedLanguage: boolean;
  culturallySensitive: boolean;
}

export interface InclusivityValidation {
  culturalInclusion: boolean;
  religionNeutral: boolean;
  genderInclusive: boolean;
  ageInclusive: boolean;
  abilityInclusive: boolean;
  socioeconomicInclusive: boolean;
  sexualOrientationInclusive: boolean;
  neurodiversityInclusive: boolean;
}

export interface TraumaSensitivityValidation {
  traumaInformedPrinciples: TraumaInformedPrinciple[];
  triggerAwareness: TriggerAwarenessIntegration;
  safetyEmphasis: SafetyEmphasisIntegration;
  choiceAndControl: ChoiceAndControlIntegration;
  groundingSupport: GroundingTechniqueIntegration;
  resourceProvision: TraumaResourceProvision;
}

export interface TraumaInformedPrinciple {
  principle: 'safety' | 'trustworthiness' | 'peer_support' | 'collaboration' | 'empowerment' | 'choice' | 'cultural_humility';
  implementation: string;
  validationLevel: 'excellent' | 'good' | 'adequate' | 'needs_improvement';
  userExperienceImpact: 'very_positive' | 'positive' | 'neutral' | 'concerning';
  clinicalAppropriate: boolean;
}

export interface TriggerAwarenessIntegration {
  commonTriggerIdentification: string[];
  triggerWarnings: boolean;
  triggerAvoidanceOptions: boolean;
  triggerCopingSupport: boolean;
  triggerEducation: boolean;
  personalizedTriggerSupport: boolean;
}

export interface SafetyEmphasisIntegration {
  physicalSafety: boolean;
  emotionalSafety: boolean;
  psychologicalSafety: boolean;
  environmentalSafety: boolean;
  relationshipSafety: boolean;
  culturalSafety: boolean;
  digitalSafety: boolean;
}

export interface ChoiceAndControlIntegration {
  practiceChoices: boolean;
  pacingControl: boolean;
  contentControl: boolean;
  interactionControl: boolean;
  privacyControl: boolean;
  dataControl: boolean;
  exitOptions: boolean;
  pausingControl: boolean;
}

export interface GroundingTechniqueIntegration {
  breathingTechniques: GroundingTechnique[];
  sensoryTechniques: GroundingTechnique[];
  cognitiveGrounding: GroundingTechnique[];
  physicalGrounding: GroundingTechnique[];
  environmentalGrounding: GroundingTechnique[];
  quickAccess: boolean;
  instructionQuality: 'excellent' | 'good' | 'adequate' | 'poor';
}

export interface GroundingTechnique {
  techniqueId: string;
  techniqueName: string;
  techniqueType: 'breathing' | 'sensory' | 'cognitive' | 'physical' | 'environmental';
  duration: number; // seconds
  instructionClarity: 'excellent' | 'good' | 'adequate' | 'poor';
  effectiveness: 'high' | 'medium' | 'low';
  accessibilityLevel: 'universal' | 'high' | 'moderate' | 'limited';
  traumaAppropriate: boolean;
  crisisAppropriate: boolean;
}

export interface TraumaResourceProvision {
  crisisResourcesAvailable: boolean;
  professionalReferralOptions: boolean;
  emergencyProtocolsIntegrated: boolean;
  peerSupportResources: boolean;
  educationalMaterials: boolean;
  selfCareResources: boolean;
  communityResources: boolean;
  culturallyRelevantResources: boolean;
}

// =============================================================================
// THERAPEUTIC INTERACTION TIMING
// =============================================================================

/**
 * Therapeutic Timing Validation
 * Type-enforced timing requirements for MBCT practice effectiveness
 */
export interface TherapeuticTimingValidation {
  breathingExerciseTiming: BreathingExerciseTimingValidation;
  sessionPacing: SessionPacingValidation;
  transitionTiming: TransitionTimingValidation;
  pausingSupport: PausingSupport;
  flexibilityProvision: FlexibilityProvision;
  therapeuticWindowRespect: TherapeuticWindowRespect;
}

export interface BreathingExerciseTimingValidation {
  readonly threeBellBreathing: {
    readonly totalDuration: 180000; // Type-enforced 3 minutes (180 seconds)
    readonly bellOne: 60000;        // Type-enforced 1 minute
    readonly bellTwo: 120000;       // Type-enforced 2 minutes
    readonly bellThree: 180000;     // Type-enforced 3 minutes
  };
  breathingPacingFlexible: boolean;
  userPacingSupported: boolean;
  pausingDuringBreathing: boolean;
  breathingVisualizationTiming: BreathingVisualizationTiming;
  breathingAccessibilityTiming: BreathingAccessibilityTiming;
}

export interface BreathingVisualizationTiming {
  inhaleVisualizationDuration: number; // milliseconds
  exhaleVisualizationDuration: number; // milliseconds
  pauseVisualizationDuration: number;  // milliseconds
  transitionSmoothness: boolean;
  visualCuesTiming: boolean;
  animationFrameRate: number; // target 60fps for smooth experience
  performanceOptimized: boolean;
}

export interface BreathingAccessibilityTiming {
  screenReaderAnnouncementTiming: number; // milliseconds
  hapticFeedbackTiming: number; // milliseconds
  audioGueCueTiming: number; // milliseconds
  visualIndicatorTiming: number; // milliseconds
  cognitiveLoadConsideration: boolean;
  timingFlexibilityForDisabilities: boolean;
}

export interface SessionPacingValidation {
  sessionIntroductionTiming: number; // seconds
  practiceTransitionTiming: number;  // seconds
  reflectionPeriodTiming: number;    // seconds
  sessionClosingTiming: number;      // seconds
  overallSessionPacing: 'relaxed' | 'comfortable' | 'brisk' | 'rushed';
  userPacingControl: boolean;
  therapeuticPauseIntegration: boolean;
}

export interface TransitionTimingValidation {
  betweenPracticeTransitions: number; // milliseconds
  screenTransitionTiming: number;     // milliseconds <500ms for therapeutic flow
  audioFadeTransitions: number;       // milliseconds
  visualTransitionTiming: number;     // milliseconds
  therapeuticallySupportive: boolean;
  jarringTransitionsPrevented: boolean;
  mindfulTransitionPromotion: boolean;
}

export interface PausingSupport {
  pausingAvailable: boolean;
  pausingEaseOfAccess: 'immediate' | 'quick' | 'moderate' | 'difficult';
  resumingSupport: 'seamless' | 'good' | 'adequate' | 'poor';
  pauseReasonRecognition: PauseReasonSupport[];
  therapeuticPausingGuidance: boolean;
  mindfulPausingEncouragement: boolean;
}

export interface PauseReasonSupport {
  reason: 'overwhelm' | 'distraction' | 'physical_discomfort' | 'emotional_intensity' | 'time_constraint' | 'technical_issue' | 'preference';
  supportProvided: string;
  guidanceOffered: boolean;
  compassionateFraming: boolean;
  returnEncouragement: boolean;
  alternativeOptions: string[];
}

export interface FlexibilityProvision {
  durationFlexibility: boolean;
  pacingFlexibility: boolean;
  contentFlexibility: boolean;
  modalityFlexibility: boolean;
  interactionFlexibility: boolean;
  accessibilityFlexibility: boolean;
  therapeuticFlexibilityMaintained: boolean;
}

export interface TherapeuticWindowRespect {
  optimimalPracticeTimeRespected: boolean;
  attentionSpanConsideration: boolean;
  cognitiveLoadManagement: boolean;
  energyLevelConsideration: boolean;
  emotionalCapacityRespect: boolean;
  motivationLevelSupport: boolean;
  therapeuticDoseOptimization: boolean;
}

// =============================================================================
// COGNITIVE THERAPY INTEGRATION
// =============================================================================

/**
 * Cognitive Therapy Integration Validation
 * MBCT-specific cognitive therapy component validation
 */
export interface CognitiveTherapyIntegration {
  cognitiveAwarenessTraining: CognitiveAwarenessTraining;
  thoughtObservationSkills: ThoughtObservationSkills;
  metacognitiveDevelopment: MetacognitiveDevelopment;
  cognitiveFlexibilityTraining: CognitiveFlexibilityTraining;
  automaticThoughtRecognition: AutomaticThoughtRecognition;
  cognitiveDistortionEducation: CognitiveDistortionEducation;
  balancedThinkingPromotion: BalancedThinkingPromotion;
  rumitaionInterruptionSkills: RumitaionInterruptionSkills;
}

export interface CognitiveAwarenessTraining {
  thoughtNoticingSkills: ThoughtNoticingSkillTraining[];
  thoughtLabelingSkills: ThoughtLabelingSkillTraining[];
  thoughtCategoryRecognition: ThoughtCategoryRecognition[];
  mindThoughtRelationship: MindThoughtRelationship;
  presentMomentThoughtAwareness: PresentMomentThoughtAwareness;
  nonjudgmentalThoughtObservation: NonjudgmentalThoughtObservation;
}

export interface ThoughtNoticingSkillTraining {
  skillName: string;
  skillDescription: string;
  trainingExercises: ThoughtNoticingExercise[];
  progressionStages: SkillProgressionStage[];
  practiceFrequency: 'daily' | 'multiple_daily' | 'weekly' | 'as_needed';
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  therapeuticBenefit: string;
  mbctAlignment: boolean;
}

export interface ThoughtNoticingExercise {
  exerciseId: string;
  exerciseName: string;
  exerciseDescription: string;
  exerciseDuration: number; // minutes
  guidanceType: 'self_guided' | 'audio_guided' | 'text_prompts' | 'interactive';
  therapeuticFocus: string;
  accessibilitySupport: string[];
  adaptationOptions: string[];
}

export interface SkillProgressionStage {
  stageName: string;
  stageDescription: string;
  successCriteria: string[];
  timeframeEstimate: string;
  supportResources: string[];
  challengesCommon: string[];
  encouragementStrategies: string[];
}

export interface ThoughtLabelingSkillTraining {
  labelingCategories: ThoughtLabelingCategory[];
  labelingPrecision: 'general' | 'specific' | 'nuanced' | 'detailed';
  therapeuticValue: 'high' | 'medium' | 'low';
  userFriendliness: 'excellent' | 'good' | 'adequate' | 'complex';
  culturalSensitivity: boolean;
  traumaInformedApproach: boolean;
}

export interface ThoughtLabelingCategory {
  categoryName: string;
  categoryDescription: string;
  exampleThoughts: string[];
  therapeuticRelevance: string;
  commonPatterns: string[];
  interventionSuggestions: string[];
  mbctFraming: string;
}

export interface ThoughtCategoryRecognition {
  category: 'helpful' | 'unhelpful' | 'neutral' | 'self_compassionate' | 'self_critical' | 'ruminative' | 'worry' | 'planning' | 'memory';
  recognitionTraining: RecognitionTrainingComponent;
  therapeuticResponse: TherapeuticResponseGuidance;
  mindfulnessIntegration: boolean;
  skillBuildingProgression: boolean;
}

export interface RecognitionTrainingComponent {
  trainingMethod: 'guided_examples' | 'practice_exercises' | 'real_time_coaching' | 'reflective_journaling';
  feedbackProvision: 'immediate' | 'delayed' | 'summary' | 'none';
  accuracyTracking: boolean;
  progressVisualization: boolean;
  encouragementIntegrated: boolean;
}

export interface TherapeuticResponseGuidance {
  responseType: 'acceptance' | 'gentle_redirection' | 'cognitive_reframing' | 'mindful_observation' | 'self_compassion' | 'behavioral_experiment';
  guidanceQuality: 'excellent' | 'good' | 'adequate' | 'needs_improvement';
  practicalityLevel: 'very_practical' | 'practical' | 'theoretical' | 'abstract';
  personalizationLevel: 'high' | 'medium' | 'low' | 'none';
  motivationalFraming: boolean;
}

// =============================================================================
// COMPONENT INTEGRATION TYPES
// =============================================================================

/**
 * MBCT Component Integration Props
 * Unified interface for therapeutic component integration
 */
export interface MBCTTherapeuticComponentProps {
  // Core MBCT Compliance
  mbctCompliance: MBCTCoreCompliance;
  therapeuticValidation: TherapeuticValidationStatus;

  // Mindfulness Integration
  mindfulnessIntegration: MindfulnessIntegrationValidation;
  practiceIntegration: PracticeIntegrationConfiguration;

  // Cognitive Therapy Integration
  cognitiveTherapyIntegration: CognitiveTherapyIntegration;
  thoughtWorkIntegration: ThoughtWorkIntegrationConfiguration;

  // Therapeutic Timing
  therapeuticTiming: TherapeuticTimingValidation;
  userPacingSupport: UserPacingSupportConfiguration;

  // Clinical Validation
  clinicallyValidated: true; // Type-enforced requirement
  clinicalReviewStatus: 'approved' | 'pending' | 'requires_revision';
  therapeuticEffectivenessValidated: boolean;

  // User Experience
  therapeuticUserExperience: TherapeuticUserExperienceConfiguration;
  accessibilityIntegration: TherapeuticAccessibilityIntegration;

  // Event Handlers
  onTherapeuticInteraction?: (interaction: TherapeuticInteractionEvent) => void;
  onMindfulnessEngagement?: (engagement: MindfulnessEngagementEvent) => void;
  onCognitiveAwarenessShift?: (shift: CognitiveAwarenessEvent) => void;
  onTherapeuticProgress?: (progress: TherapeuticProgressEvent) => void;
  onUserWellbeingChange?: (change: UserWellbeingChangeEvent) => void;

  // Styling
  therapeuticStyling?: TherapeuticStylingConfiguration;
  mbctDesignPrinciples?: MBCTDesignPrinciplesConfiguration;
}

export interface TherapeuticValidationStatus {
  validationLevel: 'clinical_grade' | 'research_grade' | 'educational_grade' | 'prototype';
  validatedBy: string[];
  validationDate: Date;
  validationCriteria: string[];
  validationResults: ValidationResult[];
  revalidationRequired: boolean;
  revalidationDate?: Date;
}

export interface ValidationResult {
  criteriaId: string;
  criteriaDescription: string;
  validationScore: number; // 0-100
  validationStatus: 'passed' | 'failed' | 'needs_improvement' | 'not_applicable';
  validatorComments: string;
  recommendedImprovements: string[];
  therapeuticImportance: 'critical' | 'important' | 'helpful' | 'optional';
}

export interface PracticeIntegrationConfiguration {
  practiceDifficultyProgression: boolean;
  practicePersonalization: boolean;
  practiceAdaptation: boolean;
  practiceMotivationSupport: boolean;
  practiceReflectionIntegration: boolean;
  practiceTransferSupport: boolean;
  practiceCommunitiyIntegration: boolean;
}

export interface ThoughtWorkIntegrationConfiguration {
  thoughtNoticingSupport: boolean;
  thoughtLabelingSupport: boolean;
  thoughtExplorationSupport: boolean;
  thoughtReframingSupport: boolean;
  thoughtAcceptanceSupport: boolean;
  thoughtDefusionSupport: boolean;
  metacognitiveDevelopment: boolean;
}

export interface UserPacingSupportConfiguration {
  selfPacingEnabled: boolean;
  pausingSupported: boolean;
  speedAdjustmentAvailable: boolean;
  skipOptionsProvided: boolean;
  repeatOptionsProvided: boolean;
  progressSavingEnabled: boolean;
  flexibilityEncouraged: boolean;
}

export interface TherapeuticUserExperienceConfiguration {
  therapeuticPresence: boolean;
  empathicDesign: boolean;
  motivationalDesign: boolean;
  hopeEngendering: boolean;
  strenghthsBased: boolean;
  resilienceBuilding: boolean;
  selfEfficacySupport: boolean;
  autonomySupport: boolean;
}

export interface TherapeuticAccessibilityIntegration {
  cognitiveAccessibility: boolean;
  emotionalAccessibility: boolean;
  sensoryAccessibility: boolean;
  motorAccessibility: boolean;
  linguisticAccessibility: boolean;
  culturalAccessibility: boolean;
  socioeconomicAccessibility: boolean;
  traumaAccessibility: boolean;
}

// Event Types for Therapeutic Interactions
export interface TherapeuticInteractionEvent {
  interactionType: 'mindfulness_practice' | 'cognitive_exercise' | 'reflection' | 'skill_practice' | 'progress_review';
  timestamp: Date;
  duration: number; // milliseconds
  engagementLevel: 'high' | 'medium' | 'low';
  therapeuticValue: 'high' | 'medium' | 'low';
  userFeedback?: string;
  technicalQuality: 'excellent' | 'good' | 'adequate' | 'poor';
}

export interface MindfulnessEngagementEvent {
  practiceType: string;
  engagementDuration: number; // milliseconds
  completionRate: number; // 0-1
  mindfulnessQuality: 'deep' | 'moderate' | 'surface' | 'distracted';
  userExperience: 'very_positive' | 'positive' | 'neutral' | 'challenging' | 'difficult';
  skillsDemonstrated: string[];
  areasForGrowth: string[];
}

export interface CognitiveAwarenessEvent {
  awarenessType: 'thought_noticing' | 'thought_labeling' | 'pattern_recognition' | 'metacognitive_shift';
  awarenessQuality: 'clear' | 'emerging' | 'vague' | 'unclear';
  therapeuticRelevance: 'high' | 'medium' | 'low';
  insightGenerated: boolean;
  applicationPotential: 'high' | 'medium' | 'low';
  userReflection?: string;
}

export interface TherapeuticProgressEvent {
  progressType: 'skill_development' | 'symptom_improvement' | 'wellbeing_increase' | 'resilience_building' | 'insight_development';
  progressMeasure: string;
  progressValue: number;
  progressTrend: 'improving' | 'stable' | 'declining' | 'fluctuating';
  significanceLevel: 'clinically_significant' | 'meaningful' | 'modest' | 'minimal';
  userAwareness: boolean;
  celebrationAppropriate: boolean;
}

export interface UserWellbeingChangeEvent {
  wellbeingDomain: 'emotional' | 'cognitive' | 'behavioral' | 'social' | 'physical' | 'spiritual' | 'overall';
  changeDirection: 'improvement' | 'deterioration' | 'stability' | 'fluctuation';
  changeMagnitude: 'large' | 'moderate' | 'small' | 'negligible';
  changeDuration: 'acute' | 'short_term' | 'medium_term' | 'long_term' | 'permanent';
  factorsInfluencing: string[];
  interventionNeeded: boolean;
}

export interface TherapeuticStylingConfiguration extends ViewStyle {
  // Therapeutic Color Psychology
  therapeuticColorPalette: 'calming' | 'energizing' | 'neutral' | 'warm' | 'cool';
  moodSupportiveColors: boolean;
  traumaSensitiveColors: boolean;
  culturallySensitiveColors: boolean;

  // Spacing and Layout for Therapy
  therapeuticSpacing: boolean;
  mindfulTransitions: boolean;
  breathingRoomProvided: boolean;
  cognitiveLoadOptimized: boolean;

  // Typography for Therapy
  therapeuticTypography: boolean;
  readabilityOptimized: boolean;
  accessibilityCompliant: boolean;
  emotionallyNeutralFonts: boolean;
}

export interface MBCTDesignPrinciplesConfiguration {
  mindfulnessPromoting: boolean;
  simplicityEmphasized: boolean;
  presentMomentOriented: boolean;
  nonjudgmentalDesign: boolean;
  selfCompassionEncouraging: boolean;
  acceptancePromoting: boolean;
  awarenessEnhancing: boolean;
  balanceSupporting: boolean;
}

// Export comprehensive MBCT types
export default {
  // Core MBCT Types
  MBCTCoreCompliance,
  MBCTPrinciplesValidation,
  TherapeuticApproachValidation,

  // Mindfulness Integration
  MindfulnessIntegrationValidation,
  MindfulnessPracticeType,
  MindfulnessGuidanceQuality,

  // Therapeutic Timing
  TherapeuticTimingValidation,
  BreathingExerciseTimingValidation,
  SessionPacingValidation,

  // Cognitive Therapy Integration
  CognitiveTherapyIntegration,
  CognitiveAwarenessTraining,
  ThoughtObservationSkills,

  // Component Integration
  MBCTTherapeuticComponentProps,
  TherapeuticValidationStatus,
  TherapeuticUserExperienceConfiguration,

  // Event Types
  TherapeuticInteractionEvent,
  MindfulnessEngagementEvent,
  CognitiveAwarenessEvent,
  TherapeuticProgressEvent,
};