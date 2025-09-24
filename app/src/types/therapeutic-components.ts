/**
 * Therapeutic Component Types - Advanced Clinical Type Safety
 *
 * These types provide strict, zero-tolerance typing for all therapeutic
 * components with clinical accuracy requirements, therapeutic timing
 * validation, and MBCT compliance patterns.
 *
 * CRITICAL: All types must maintain 100% clinical accuracy
 */

import type {
  PHQ9Answer,
  GAD7Answer,
  PHQ9Answers,
  GAD7Answers,
  PHQ9Score,
  GAD7Score,
  PHQ9Severity,
  GAD7Severity,
  Assessment,
  AssessmentID,
  ISODateString,
  BreathDuration,
  TherapeuticTiming,
  CrisisResponseTime,
  CLINICAL_CONSTANTS
} from './clinical';

// Branded types for therapeutic data integrity
type Brand<K, T> = K & { __brand: T };

// === THERAPEUTIC TIMING TYPES ===

// Exact timing validation for breathing exercises
export type BreathingPhase = 'inhale' | 'hold' | 'exhale';
export type BreathingStepDuration = 60000; // Exactly 60 seconds in ms
export type TotalBreathingDuration = 180000; // Exactly 3 minutes in ms
export type BreathingCycleMs = 8000; // 8 seconds per breath cycle
export type CyclesPerStep = 7.5; // 7.5 cycles = 60 seconds

export interface TherapeuticBreathingSession {
  readonly duration: TotalBreathingDuration;
  readonly stepDuration: BreathingStepDuration;
  readonly cycleTime: BreathingCycleMs;
  readonly totalSteps: 3;
  readonly currentStep: 1 | 2 | 3;
  readonly phase: BreathingPhase;
  readonly startTime: ISODateString;
  readonly expectedEndTime: ISODateString;
}

// === MOOD TRACKING TYPES ===

// Therapeutic mood scale with anxiety-aware interfaces
export type MoodScale = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type MoodIntensity = 'low' | 'moderate' | 'high' | 'severe';

// Conditional types for anxiety-aware UI adaptations
export type AnxietyAwareInterface<T extends MoodScale> = T extends 1 | 2 | 3
  ? {
      anxietySupport: true;
      largeTargets: true;
      calmingColors: true;
      reducedAnimations: true;
      cleareInstructions: true;
    }
  : {
      anxietySupport: false;
      largeTargets: false;
      calmingColors: false;
      reducedAnimations: false;
      cleareInstructions: false;
    };

export interface MoodEntry {
  readonly scale: MoodScale;
  readonly timestamp: ISODateString;
  readonly intensity: MoodIntensity;
  readonly context: 'morning' | 'midday' | 'evening' | 'crisis';
  readonly notes?: string;
  readonly triggeredBy?: string;
}

// === CHECK-IN TYPES ===

export type CheckInContext = 'morning' | 'midday' | 'evening';
export type CheckInCompletionStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

export interface TherapeuticCheckIn {
  readonly id: `checkin_${CheckInContext}_${number}_${string}`;
  readonly context: CheckInContext;
  readonly startTime: ISODateString;
  readonly completionTime?: ISODateString;
  readonly status: CheckInCompletionStatus;
  readonly mood: MoodEntry;
  readonly breathingCompleted: boolean;
  readonly exercises: readonly ExerciseCompletion[];
  readonly notes?: string;
  readonly validationStatus: 'pending' | 'valid' | 'invalid';
}

// === EXERCISE TYPES ===

export type ExerciseType = 'breathing' | 'mindfulness' | 'grounding' | 'body_scan' | 'loving_kindness';
export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface ExerciseCompletion {
  readonly exerciseId: string;
  readonly type: ExerciseType;
  readonly difficulty: ExerciseDifficulty;
  readonly startTime: ISODateString;
  readonly completionTime?: ISODateString;
  readonly completed: boolean;
  readonly duration: TherapeuticTiming;
  readonly effectiveness: MoodScale;
}

// === ASSESSMENT COMPONENT TYPES ===

// Strict typing for assessment question components
export interface AssessmentQuestionProps<T extends 'phq9' | 'gad7'> {
  readonly questionIndex: T extends 'phq9'
    ? 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8  // Exactly 9 questions (0-8)
    : 0 | 1 | 2 | 3 | 4 | 5 | 6;          // Exactly 7 questions (0-6)
  readonly questionText: string;
  readonly currentAnswer: T extends 'phq9' ? PHQ9Answer : GAD7Answer;
  readonly onAnswerChange: (answer: T extends 'phq9' ? PHQ9Answer : GAD7Answer) => void;
  readonly isRequired: true; // All assessment questions are required
  readonly clinicalValidation: ClinicalValidationState;
}

export interface ClinicalValidationState {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly requiresReview: boolean;
}

// Score display with crisis threshold awareness
export interface ScoreDisplayProps<T extends 'phq9' | 'gad7'> {
  readonly score: T extends 'phq9' ? PHQ9Score : GAD7Score;
  readonly severity: T extends 'phq9' ? PHQ9Severity : GAD7Severity;
  readonly assessmentType: T;
  readonly showCrisisAlert: boolean;
  readonly crisisThreshold: T extends 'phq9'
    ? typeof CLINICAL_CONSTANTS.PHQ9.CRISIS_THRESHOLD
    : typeof CLINICAL_CONSTANTS.GAD7.CRISIS_THRESHOLD;
  readonly onCrisisDetected: () => void;
}

// === CRISIS COMPONENT TYPES ===

export interface CrisisAlertProps {
  readonly isVisible: boolean;
  readonly triggerType: 'score_threshold' | 'suicidal_ideation' | 'manual';
  readonly assessmentScore?: PHQ9Score | GAD7Score;
  readonly responseTime: CrisisResponseTime;
  readonly onEmergencyCall: () => void;
  readonly onSafetyPlan: () => void;
  readonly onDismiss?: () => void;
  readonly emergencyNumber: '988' | '741741';
}

// === PROGRESS TRACKING TYPES ===

export interface ProgressIndicatorProps<T extends 'assessment' | 'breathing' | 'checkin'> {
  readonly current: number;
  readonly total: number;
  readonly type: T;
  readonly percentage: number;
  readonly estimatedTimeRemaining: TherapeuticTiming;
  readonly canGoBack: boolean;
  readonly canSkip: T extends 'assessment' ? false : boolean; // Assessments cannot be skipped
}

// === THEME CONTEXT TYPES ===

export type TimeOfDay = 'morning' | 'midday' | 'evening';

export interface ThemeContextProps {
  readonly timeOfDay: TimeOfDay;
  readonly colors: ThemeColors;
  readonly adaptiveColors: AdaptiveThemeColors;
  readonly anxietyMode: boolean;
}

export interface ThemeColors {
  readonly primary: string;
  readonly secondary: string;
  readonly success: string;
  readonly warning: string;
  readonly error: string;
  readonly background: string;
  readonly surface: string;
  readonly text: string;
}

export interface AdaptiveThemeColors extends ThemeColors {
  readonly calming: string;
  readonly energizing: string;
  readonly crisis: string;
  readonly safety: string;
}

// === THERAPEUTIC VALIDATION TYPES ===

// Compile-time validation for therapeutic timing
export type ValidateTherapeuticTiming<T extends number> =
  T extends BreathingStepDuration
    ? T
    : T extends TotalBreathingDuration
    ? T
    : T extends BreathingCycleMs
    ? T
    : never;

// Compile-time validation for clinical scores
export type ValidateScore<
  TType extends 'phq9' | 'gad7',
  TScore extends number
> = TType extends 'phq9'
  ? TScore extends PHQ9Score
    ? TScore
    : never
  : TType extends 'gad7'
  ? TScore extends GAD7Score
    ? TScore
    : never
  : never;

// Crisis threshold validation
export type IsCrisisScore<
  TType extends 'phq9' | 'gad7',
  TScore extends number
> = TType extends 'phq9'
  ? TScore extends PHQ9Score
    ? TScore extends 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27
      ? true
      : false
    : never
  : TType extends 'gad7'
  ? TScore extends GAD7Score
    ? TScore extends 15 | 16 | 17 | 18 | 19 | 20 | 21
      ? true
      : false
    : never
  : never;

// === COMPONENT BASE TYPES ===

// Base props for all therapeutic components
export interface TherapeuticComponentProps {
  readonly testID?: string;
  readonly accessibilityLabel?: string;
  readonly accessibilityRole?: 'button' | 'text' | 'group' | 'timer';
  readonly anxietyAdaptive?: boolean;
  readonly crisisMode?: boolean;
  readonly theme?: TimeOfDay;
}

// Enhanced props for clinical components (zero error tolerance)
export interface ClinicalComponentProps extends TherapeuticComponentProps {
  readonly clinicalValidation: ClinicalValidationState;
  readonly auditTrail: readonly AuditEvent[];
  readonly errorReporting: ClinicalErrorHandler;
}

export interface AuditEvent {
  readonly timestamp: ISODateString;
  readonly action: string;
  readonly component: string;
  readonly userId?: string;
  readonly data?: unknown;
}

export interface ClinicalErrorHandler {
  readonly onValidationError: (error: ClinicalValidationError) => void;
  readonly onCalculationError: (error: ClinicalCalculationError) => void;
  readonly onTimingError: (error: TherapeuticTimingError) => void;
}

// === ERROR TYPES ===

export class ClinicalValidationError extends Error {
  constructor(
    message: string,
    public readonly component: string,
    public readonly field: string,
    public readonly expectedValue?: unknown,
    public readonly actualValue?: unknown
  ) {
    super(message);
    this.name = 'ClinicalValidationError';
  }
}

export class ClinicalCalculationError extends Error {
  constructor(
    message: string,
    public readonly component: string,
    public readonly calculation: string,
    public readonly inputs: unknown,
    public readonly expectedOutput?: unknown
  ) {
    super(message);
    this.name = 'ClinicalCalculationError';
  }
}

export class TherapeuticTimingError extends Error {
  constructor(
    message: string,
    public readonly component: string,
    public readonly expectedTiming: number,
    public readonly actualTiming: number,
    public readonly tolerance: number = 100 // 100ms tolerance
  ) {
    super(message);
    this.name = 'TherapeuticTimingError';
  }
}

// === UTILITY TYPES ===

// Extract component prop types
export type ExtractComponentProps<T> = T extends React.ComponentType<infer P> ? P : never;

// Therapeutic timing validation utility
export const validateTherapeuticTiming = <T extends number>(
  timing: T,
  expected: number,
  tolerance: number = 100
): timing is ValidateTherapeuticTiming<T> => {
  return Math.abs(timing - expected) <= tolerance;
};

// Crisis score detection utility
export const isCrisisScore = <TType extends 'phq9' | 'gad7'>(
  type: TType,
  score: number
): score is Extract<
  TType extends 'phq9' ? PHQ9Score : GAD7Score,
  number
> & { __crisis: true } => {
  if (type === 'phq9') {
    return score >= CLINICAL_CONSTANTS.PHQ9.CRISIS_THRESHOLD;
  }
  if (type === 'gad7') {
    return score >= CLINICAL_CONSTANTS.GAD7.CRISIS_THRESHOLD;
  }
  return false;
};

// Suicidal ideation detection utility
export const hasSuicidalIdeation = (answers: PHQ9Answers): boolean => {
  const suicidalIdeationAnswer = answers[CLINICAL_CONSTANTS.PHQ9.SUICIDAL_IDEATION_QUESTION];
  return suicidalIdeationAnswer > 0;
};

// Export all types for component enhancement
export type {
  TherapeuticBreathingSession,
  MoodEntry,
  TherapeuticCheckIn,
  ExerciseCompletion,
  AssessmentQuestionProps,
  ScoreDisplayProps,
  CrisisAlertProps,
  ProgressIndicatorProps,
  ThemeContextProps,
  TherapeuticComponentProps,
  ClinicalComponentProps
};

// Constants for component validation
export const THERAPEUTIC_CONSTANTS = {
  TIMING: {
    BREATHING_STEP_MS: 60000 as BreathingStepDuration,
    TOTAL_BREATHING_MS: 180000 as TotalBreathingDuration,
    BREATH_CYCLE_MS: 8000 as BreathingCycleMs,
    CYCLES_PER_STEP: 7.5 as CyclesPerStep,
  },
  MOOD: {
    MIN_SCALE: 1 as const,
    MAX_SCALE: 10 as const,
    ANXIETY_THRESHOLD: 3 as const,
  },
  CRISIS: {
    RESPONSE_TIME_MS: 200 as CrisisResponseTime,
    EMERGENCY_NUMBERS: ['988', '741741'] as const,
  },
  VALIDATION: {
    TIMING_TOLERANCE_MS: 100,
    REQUIRED_FIELDS: ['mood', 'timestamp', 'context'] as const,
  },
} as const;