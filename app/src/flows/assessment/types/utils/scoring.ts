/**
 * Assessment Scoring Utility Types - 100% Accuracy Required
 * Comprehensive type definitions for scoring calculations
 * Clinical validation with exact PHQ-9 and GAD-7 algorithms
 * Error handling and validation for therapeutic precision
 */

import { 
  AssessmentType, 
  AssessmentResponse, 
  AssessmentAnswer, 
  PHQ9Result, 
  GAD7Result 
} from '../index';
import { CrisisDetection } from '../crisis/safety';

/**
 * Scoring Algorithm Types
 * Exact clinical implementations for PHQ-9 and GAD-7
 */

/**
 * PHQ-9 Scoring Configuration
 * Based on Kroenke et al. (2001) - Patient Health Questionnaire-9
 */
export interface PHQ9ScoringConfig {
  /** Total number of questions (always 9) */
  readonly questionCount: 9;
  /** Minimum possible score */
  readonly minScore: 0;
  /** Maximum possible score */
  readonly maxScore: 27;
  /** Question response range */
  readonly responseRange: [0, 1, 2, 3];
  /** Severity thresholds */
  readonly severityThresholds: {
    readonly minimal: [0, 4];
    readonly mild: [5, 9];
    readonly moderate: [10, 14];
    readonly moderately_severe: [15, 19];
    readonly severe: [20, 27];
  };
  /** Crisis detection threshold */
  readonly crisisThreshold: 20;
  /** Suicidal ideation question ID */
  readonly suicidalIdeationQuestionId: 'phq9_9';
}

/**
 * GAD-7 Scoring Configuration
 * Based on Spitzer et al. (2006) - Generalized Anxiety Disorder 7-item scale
 */
export interface GAD7ScoringConfig {
  /** Total number of questions (always 7) */
  readonly questionCount: 7;
  /** Minimum possible score */
  readonly minScore: 0;
  /** Maximum possible score */
  readonly maxScore: 21;
  /** Question response range */
  readonly responseRange: [0, 1, 2, 3];
  /** Severity thresholds */
  readonly severityThresholds: {
    readonly minimal: [0, 4];
    readonly mild: [5, 9];
    readonly moderate: [10, 14];
    readonly severe: [15, 21];
  };
  /** Crisis detection threshold */
  readonly crisisThreshold: 15;
}

/**
 * Scoring Function Signatures
 */

/**
 * PHQ-9 scoring function type
 * Must implement exact clinical algorithm
 */
export type PHQ9ScoringFunction = (
  answers: AssessmentAnswer[]
) => PHQ9ScoringResult;

/**
 * GAD-7 scoring function type  
 * Must implement exact clinical algorithm
 */
export type GAD7ScoringFunction = (
  answers: AssessmentAnswer[]
) => GAD7ScoringResult;

/**
 * Generic scoring function type
 */
export type AssessmentScoringFunction<T extends AssessmentType> = 
  T extends 'phq9' ? PHQ9ScoringFunction : GAD7ScoringFunction;

/**
 * Scoring Result Types
 */

/**
 * PHQ-9 Scoring Result
 * Complete result with validation and clinical interpretation
 */
export interface PHQ9ScoringResult {
  /** Final calculated score (0-27) */
  totalScore: number;
  /** Individual question scores */
  questionScores: Record<string, AssessmentResponse>;
  /** Clinical severity interpretation */
  severity: 'minimal' | 'mild' | 'moderate' | 'moderately_severe' | 'severe';
  /** Whether score meets crisis threshold (≥20) */
  isCrisis: boolean;
  /** Suicidal ideation detected (Question 9 > 0) */
  suicidalIdeation: boolean;
  /** Suicidal ideation response value */
  suicidalIdeationScore: AssessmentResponse;
  /** Score validation results */
  validation: ScoringValidation;
  /** Clinical recommendations */
  recommendations: ClinicalRecommendation[];
  /** Calculation metadata */
  metadata: ScoringMetadata;
}

/**
 * GAD-7 Scoring Result
 * Complete result with validation and clinical interpretation
 */
export interface GAD7ScoringResult {
  /** Final calculated score (0-21) */
  totalScore: number;
  /** Individual question scores */
  questionScores: Record<string, AssessmentResponse>;
  /** Clinical severity interpretation */
  severity: 'minimal' | 'mild' | 'moderate' | 'severe';
  /** Whether score meets crisis threshold (≥15) */
  isCrisis: boolean;
  /** Score validation results */
  validation: ScoringValidation;
  /** Clinical recommendations */
  recommendations: ClinicalRecommendation[];
  /** Calculation metadata */
  metadata: ScoringMetadata;
}

/**
 * Scoring Validation
 * Comprehensive validation of scoring accuracy
 */
export interface ScoringValidation {
  /** Whether scoring is valid */
  isValid: boolean;
  /** Validation errors if any */
  errors: ScoringValidationError[];
  /** Warnings (non-blocking issues) */
  warnings: ScoringValidationWarning[];
  /** Data completeness check */
  completeness: {
    /** All required questions answered */
    allQuestionsAnswered: boolean;
    /** Missing question IDs */
    missingQuestions: string[];
    /** Invalid responses */
    invalidResponses: Array<{
      questionId: string;
      response: unknown;
      expectedRange: [number, number];
    }>;
  };
  /** Clinical accuracy verification */
  clinicalAccuracy: {
    /** Algorithm implementation verified */
    algorithmVerified: boolean;
    /** Score calculation verified */
    calculationVerified: boolean;
    /** Threshold application verified */
    thresholdVerified: boolean;
  };
}

/**
 * Scoring Validation Error Types
 */
export type ScoringValidationError = 
  | {
      type: 'MISSING_QUESTIONS';
      message: string;
      questionIds: string[];
    }
  | {
      type: 'INVALID_RESPONSE';
      message: string;
      questionId: string;
      response: unknown;
      validRange: [number, number];
    }
  | {
      type: 'CALCULATION_ERROR';
      message: string;
      expectedScore?: number;
      actualScore?: number;
    }
  | {
      type: 'THRESHOLD_ERROR';
      message: string;
      score: number;
      thresholdType: 'severity' | 'crisis';
    }
  | {
      type: 'ALGORITHM_ERROR';
      message: string;
      algorithmStep: string;
    };

/**
 * Scoring Validation Warning Types
 */
export type ScoringValidationWarning = 
  | {
      type: 'UNUSUAL_PATTERN';
      message: string;
      pattern: string;
    }
  | {
      type: 'RAPID_CHANGE';
      message: string;
      previousScore?: number;
      currentScore: number;
    }
  | {
      type: 'THRESHOLD_PROXIMITY';
      message: string;
      score: number;
      threshold: number;
    };

/**
 * Clinical Recommendations
 */
export interface ClinicalRecommendation {
  /** Recommendation type */
  type: ClinicalRecommendationType;
  /** Priority level */
  priority: 'low' | 'moderate' | 'high' | 'urgent';
  /** Recommendation message */
  message: string;
  /** Specific actions recommended */
  actions: string[];
  /** Whether immediate action required */
  immediate: boolean;
  /** Follow-up timeline */
  followUp?: {
    timeframe: string;
    type: 'self_assessment' | 'clinical_check' | 'therapy_session';
  };
}

export type ClinicalRecommendationType = 
  | 'CRISIS_INTERVENTION'
  | 'PROFESSIONAL_REFERRAL'
  | 'THERAPY_RECOMMENDATION'
  | 'SELF_CARE_STRATEGY'
  | 'MEDICATION_REVIEW'
  | 'FOLLOW_UP_ASSESSMENT'
  | 'SAFETY_PLANNING'
  | 'EMERGENCY_SERVICES';

/**
 * Scoring Metadata
 */
export interface ScoringMetadata {
  /** When scoring was calculated */
  calculatedAt: number;
  /** Algorithm version used */
  algorithmVersion: string;
  /** Calculation duration (ms) */
  calculationTimeMs: number;
  /** Assessment type */
  assessmentType: AssessmentType;
  /** Number of questions scored */
  questionsScored: number;
  /** Expected number of questions */
  expectedQuestions: number;
  /** Calculation method verification */
  calculationMethod: 'standard' | 'validated' | 'clinical_verified';
  /** Data source validation */
  dataSourceVerified: boolean;
}

/**
 * Scoring Engine Interface
 */
export interface AssessmentScoringEngine {
  /** Score PHQ-9 assessment */
  scorePHQ9: PHQ9ScoringFunction;
  /** Score GAD-7 assessment */
  scoreGAD7: GAD7ScoringFunction;
  /** Validate scoring input */
  validateScoringInput: (
    answers: AssessmentAnswer[], 
    type: AssessmentType
  ) => ScoringValidation;
  /** Calculate severity from score */
  calculateSeverity: (
    score: number, 
    type: AssessmentType
  ) => string;
  /** Check crisis thresholds */
  checkCrisisThresholds: (
    score: number, 
    type: AssessmentType, 
    answers?: AssessmentAnswer[]
  ) => CrisisDetection | null;
  /** Generate clinical recommendations */
  generateRecommendations: (
    result: PHQ9ScoringResult | GAD7ScoringResult
  ) => ClinicalRecommendation[];
  /** Verify calculation accuracy */
  verifyCalculation: (
    answers: AssessmentAnswer[], 
    result: PHQ9ScoringResult | GAD7ScoringResult
  ) => boolean;
}

/**
 * Score Comparison Utilities
 */
export interface ScoreComparison {
  /** Previous score for comparison */
  previousScore?: number;
  /** Current score */
  currentScore: number;
  /** Score change */
  change: number;
  /** Change direction */
  direction: 'improved' | 'worsened' | 'stable';
  /** Significance of change */
  significance: 'minimal' | 'moderate' | 'significant' | 'substantial';
  /** Clinical significance */
  clinicallySignificant: boolean;
  /** Change interpretation */
  interpretation: string;
}

/**
 * Trend Analysis Types
 */
export interface ScoreTrend {
  /** Assessment type */
  assessmentType: AssessmentType;
  /** Score history */
  scores: Array<{
    score: number;
    timestamp: number;
    severity: string;
  }>;
  /** Trend direction */
  trend: 'improving' | 'declining' | 'stable' | 'fluctuating';
  /** Trend strength */
  strength: 'weak' | 'moderate' | 'strong';
  /** Average change per assessment */
  averageChange: number;
  /** Volatility measure */
  volatility: number;
  /** Clinical interpretation */
  clinicalInterpretation: string;
}

/**
 * Performance Requirements for Scoring
 */
export interface ScoringPerformanceRequirements {
  /** Maximum calculation time (ms) */
  readonly maxCalculationTimeMs: 50;
  /** Maximum validation time (ms) */
  readonly maxValidationTimeMs: 25;
  /** Required accuracy percentage */
  readonly requiredAccuracy: 100;
  /** Maximum memory usage for calculation */
  readonly maxMemoryUsageMB: 1;
}

/**
 * Type Guards for Scoring Results
 */
export function isPHQ9ScoringResult(
  result: PHQ9ScoringResult | GAD7ScoringResult
): result is PHQ9ScoringResult {
  return 'suicidalIdeation' in result;
}

export function isGAD7ScoringResult(
  result: PHQ9ScoringResult | GAD7ScoringResult
): result is GAD7ScoringResult {
  return !('suicidalIdeation' in result);
}

export function isCrisisScore(
  score: number,
  type: AssessmentType
): boolean {
  return type === 'phq9' ? score >= 15 : score >= 15;
}

export function isValidAssessmentScore(
  score: number, 
  type: AssessmentType
): boolean {
  const maxScore = type === 'phq9' ? 27 : 21;
  return Number.isInteger(score) && score >= 0 && score <= maxScore;
}

/**
 * Scoring Configuration Constants
 */
export const PHQ9_SCORING_CONFIG: PHQ9ScoringConfig = {
  questionCount: 9,
  minScore: 0,
  maxScore: 27,
  responseRange: [0, 1, 2, 3],
  severityThresholds: {
    minimal: [0, 4],
    mild: [5, 9],
    moderate: [10, 14],
    moderately_severe: [15, 19],
    severe: [20, 27]
  },
  crisisThreshold: 15, // Updated 2025-01-27: Moderately severe depression (≥15) triggers crisis support
  suicidalIdeationQuestionId: 'phq9_9'
} as const;

export const GAD7_SCORING_CONFIG: GAD7ScoringConfig = {
  questionCount: 7,
  minScore: 0,
  maxScore: 21,
  responseRange: [0, 1, 2, 3],
  severityThresholds: {
    minimal: [0, 4],
    mild: [5, 9],
    moderate: [10, 14],
    severe: [15, 21]
  },
  crisisThreshold: 15
} as const;

/**
 * Utility Type for Scoring Function Return Types
 */
export type ScoringResult<T extends AssessmentType> = 
  T extends 'phq9' ? PHQ9ScoringResult : GAD7ScoringResult;

/**
 * Clinical Accuracy Validation Functions
 */
export interface ClinicalAccuracyValidator {
  /** Validate PHQ-9 algorithm implementation */
  validatePHQ9Algorithm: (
    implementation: PHQ9ScoringFunction
  ) => Promise<boolean>;
  /** Validate GAD-7 algorithm implementation */
  validateGAD7Algorithm: (
    implementation: GAD7ScoringFunction
  ) => Promise<boolean>;
  /** Run comprehensive scoring tests */
  runScoringTests: (
    engine: AssessmentScoringEngine
  ) => Promise<ScoringTestResults>;
}

export interface ScoringTestResults {
  /** Overall test success */
  success: boolean;
  /** Test completion timestamp */
  timestamp: number;
  /** PHQ-9 test results */
  phq9Tests: {
    passed: number;
    failed: number;
    accuracy: number;
    errors: string[];
  };
  /** GAD-7 test results */
  gad7Tests: {
    passed: number;
    failed: number;
    accuracy: number;
    errors: string[];
  };
  /** Performance metrics */
  performance: {
    averageCalculationTime: number;
    maxCalculationTime: number;
    memoryUsage: number;
  };
}