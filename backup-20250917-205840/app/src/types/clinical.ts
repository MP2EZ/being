/**
 * Clinical Assessment Types - Zero Tolerance for Type Errors
 * 
 * These types ensure compile-time safety for all clinical calculations
 * and crisis detection logic. Any modification requires clinical approval.
 * 
 * CRITICAL: Type errors in these definitions can be life-threatening
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

// Export Constants for Clinical Reference
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