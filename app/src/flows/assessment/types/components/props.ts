/**
 * Assessment Component Props - Enhanced Type Safety
 * Comprehensive prop interfaces for all assessment components
 * Crisis detection enabled with PHQ≥20, GAD≥15 constraints
 */

import { ViewStyle, TextStyle } from 'react-native';
import { 
  AssessmentQuestion, 
  AssessmentResponse, 
  AssessmentProgress,
  PHQ9Result,
  GAD7Result,
  CrisisDetection,
  CrisisIntervention,
  AssessmentType 
} from '../index';

// Base Props for All Assessment Components
export interface BaseAssessmentProps {
  /** Accessibility identifier for testing */
  testID?: string;
  /** Custom styling override */
  style?: ViewStyle;
  /** Theme context for time-of-day theming */
  theme?: 'morning' | 'midday' | 'evening' | 'neutral';
  /** Accessibility mode for enhanced support */
  accessibilityMode?: 'standard' | 'enhanced' | 'voice_over';
}

// Question Component Props
export interface AssessmentQuestionProps extends BaseAssessmentProps {
  /** Current question being displayed */
  question: AssessmentQuestion;
  /** Currently selected answer (if any) */
  currentAnswer?: AssessmentResponse;
  /** Callback when user selects an answer */
  onAnswer: (response: AssessmentResponse) => void;
  /** Whether to show progress indicator */
  showProgress?: boolean;
  /** Current question number (1-indexed for display) */
  currentStep: number;
  /** Total number of questions */
  totalSteps: number;
  /** Whether question is required (all assessment questions are) */
  isRequired?: boolean;
  /** Custom question text styling */
  questionTextStyle?: TextStyle;
  /** Whether to animate response selection */
  animateSelection?: boolean;
  /** Callback for question display analytics */
  onQuestionDisplayed?: (questionId: string, timestamp: number) => void;
}

// Response Option Component Props
export interface AssessmentResponseOptionProps extends BaseAssessmentProps {
  /** Response value (0-3) */
  value: AssessmentResponse;
  /** Display label for the response */
  label: string;
  /** Whether this option is currently selected */
  isSelected: boolean;
  /** Callback when option is pressed */
  onPress: (value: AssessmentResponse) => void;
  /** Whether option is disabled */
  disabled?: boolean;
  /** Custom styling for selected state */
  selectedStyle?: ViewStyle;
  /** Custom text styling for selected state */
  selectedTextStyle?: TextStyle;
}

// Progress Component Props
export interface AssessmentProgressProps extends BaseAssessmentProps {
  /** Current assessment progress */
  progress: AssessmentProgress;
  /** Whether to show detailed progress (question x of y) */
  showDetailedProgress?: boolean;
  /** Whether to show time elapsed */
  showTimeElapsed?: boolean;
  /** Custom progress bar color */
  progressColor?: string;
  /** Whether to animate progress changes */
  animated?: boolean;
}

// Results Display Props
export interface AssessmentResultsProps extends BaseAssessmentProps {
  /** Assessment result to display */
  result: PHQ9Result | GAD7Result;
  /** Callback when user completes viewing results */
  onComplete: () => void;
  /** Whether to show crisis intervention if triggered */
  showCrisisIntervention?: boolean;
  /** Whether to show detailed breakdown */
  showDetailedBreakdown?: boolean;
  /** Whether to show MBCT-aligned messaging */
  showTherapeuticGuidance?: boolean;
  /** Callback for result analytics */
  onResultViewed?: (result: PHQ9Result | GAD7Result, viewDuration: number) => void;
}

// Crisis Intervention Component Props
export interface CrisisInterventionProps extends BaseAssessmentProps {
  /** Crisis detection that triggered intervention */
  detection: CrisisDetection;
  /** Current intervention state */
  intervention?: CrisisIntervention;
  /** Callback when user contacts support */
  onContactSupport: () => void;
  /** Callback when user dismisses (with safety checks) */
  onSafetyDismiss?: () => void;
  /** Emergency contact information */
  emergencyContacts?: Array<{
    name: string;
    phone: string;
    type: '988' | 'emergency' | 'personal';
  }>;
  /** Whether to force display (cannot be dismissed) */
  forcedDisplay?: boolean;
  /** Response time requirement (must be <200ms) */
  responseTimeMs: number;
}

// Assessment Start Screen Props
export interface AssessmentStartProps extends BaseAssessmentProps {
  /** Type of assessment to start */
  assessmentType: AssessmentType;
  /** Context in which assessment is being taken */
  context: 'standalone' | 'onboarding' | 'checkin';
  /** Callback to start assessment */
  onStart: () => void;
  /** Callback to cancel/go back */
  onCancel?: () => void;
  /** Whether to show assessment description */
  showDescription?: boolean;
  /** Whether to show time estimate */
  showTimeEstimate?: boolean;
  /** Custom instructions override */
  customInstructions?: string;
}

// Assessment Navigation Props
export interface AssessmentNavigationProps extends BaseAssessmentProps {
  /** Current question index */
  currentIndex: number;
  /** Total number of questions */
  totalQuestions: number;
  /** Whether previous button is enabled */
  canGoBack: boolean;
  /** Whether next button is enabled */
  canGoNext: boolean;
  /** Callback for previous question */
  onPrevious: () => void;
  /** Callback for next question */
  onNext: () => void;
  /** Callback for assessment completion */
  onComplete?: () => void;
  /** Whether to show completion button on last question */
  showCompletionButton?: boolean;
}

// Severity Indicator Props
export interface SeverityIndicatorProps extends BaseAssessmentProps {
  /** Assessment type for appropriate severity scale */
  assessmentType: AssessmentType;
  /** Severity level to display */
  severity: 'minimal' | 'mild' | 'moderate' | 'moderately_severe' | 'severe';
  /** Whether to show severity description */
  showDescription?: boolean;
  /** Whether to use therapeutic language (MBCT-aligned) */
  useTherapeuticLanguage?: boolean;
  /** Custom color scheme override */
  colorScheme?: {
    minimal: string;
    mild: string;
    moderate: string;
    moderately_severe?: string; // PHQ-9 only
    severe: string;
  };
}

// Assessment Summary Props
export interface AssessmentSummaryProps extends BaseAssessmentProps {
  /** Results to summarize */
  results: Array<PHQ9Result | GAD7Result>;
  /** Date range for results */
  dateRange?: {
    start: Date;
    end: Date;
  };
  /** Whether to show trend analysis */
  showTrends?: boolean;
  /** Whether to show crisis episodes */
  showCrisisEpisodes?: boolean;
  /** Callback for detailed view */
  onViewDetails?: (result: PHQ9Result | GAD7Result) => void;
}

// Accessibility Enhancement Props
export interface AssessmentAccessibilityProps {
  /** Screen reader hints for complex interactions */
  accessibilityHints?: {
    questionNavigation: string;
    responseSelection: string;
    progressUpdate: string;
    crisisAlert: string;
  };
  /** Voice over announcement delays (ms) */
  voiceOverDelays?: {
    questionChange: number;
    responseSelected: number;
    progressUpdate: number;
    crisisTriggered: number;
  };
  /** High contrast mode support */
  highContrastMode?: boolean;
  /** Font scaling support */
  supportsFontScaling?: boolean;
}

/**
 * Type guard functions for component props validation
 */

export function isValidAssessmentResponse(value: unknown): value is AssessmentResponse {
  return typeof value === 'number' && value >= 0 && value <= 3 && Number.isInteger(value);
}

export function isPHQ9Result(result: PHQ9Result | GAD7Result): result is PHQ9Result {
  return 'suicidalIdeation' in result;
}

export function isGAD7Result(result: PHQ9Result | GAD7Result): result is GAD7Result {
  return !('suicidalIdeation' in result);
}

export function isCrisisTriggered(result: PHQ9Result | GAD7Result): boolean {
  return result.isCrisis;
}

/**
 * Crisis Safety Constraint Types
 */

export interface CrisisSafetyConstraints {
  /** PHQ-9 crisis threshold (≥20) - MUST NOT be modified */
  readonly PHQ9_CRISIS_THRESHOLD: 20;
  /** GAD-7 crisis threshold (≥15) - MUST NOT be modified */
  readonly GAD7_CRISIS_THRESHOLD: 15;
  /** Maximum response time for crisis intervention (ms) */
  readonly MAX_CRISIS_RESPONSE_TIME_MS: 200;
  /** PHQ-9 Question 9 ID for suicidal ideation */
  readonly PHQ9_SUICIDAL_QUESTION_ID: 'phq9_9';
}

/**
 * Component Performance Requirements
 */

export interface AssessmentPerformanceConstraints {
  /** Maximum render time for question components (ms) */
  readonly MAX_QUESTION_RENDER_TIME_MS: 100;
  /** Maximum response time for answer selection (ms) */
  readonly MAX_ANSWER_RESPONSE_TIME_MS: 50;
  /** Maximum time to display crisis intervention (ms) */
  readonly MAX_CRISIS_DISPLAY_TIME_MS: 200;
  /** Required frame rate for animations */
  readonly REQUIRED_ANIMATION_FPS: 60;
}