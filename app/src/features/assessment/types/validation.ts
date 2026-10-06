/**
 * Assessment Type Validation Utilities
 * Runtime validation of assessment answer shape.
 *
 * MAINT-712: the result and crisis validators that lived here were dead
 * re-implementations of the crisis thresholds (no production caller) and were
 * deleted. Crisis classification has one source: detectCrisis() in
 * features/crisis/types/safety.ts.
 */

import type {
  AssessmentType,
  AssessmentResponse,
  AssessmentAnswer
} from './index';
import { PHQ9_SCORING_CONFIG, GAD7_SCORING_CONFIG } from './scoring';

/**
 * Validation Result Interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: {
    validatedAt: number;
    validationType: string;
    validationDuration: number;
  };
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  value?: unknown;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
  recommendation: string;
}

/**
 * Assessment Response Validation
 */
export function validateAssessmentResponse(response: unknown): response is AssessmentResponse {
  return typeof response === 'number' && 
         Number.isInteger(response) && 
         response >= 0 && 
         response <= 3;
}

export function validateAssessmentAnswers(
  answers: unknown, 
  assessmentType: AssessmentType
): ValidationResult {
  const startTime = Date.now();
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // Type guard
  if (!Array.isArray(answers)) {
    errors.push({
      code: 'INVALID_ANSWERS_TYPE',
      message: 'Assessment answers must be an array',
      field: 'answers',
      value: typeof answers,
      severity: 'critical'
    });
    
    return {
      isValid: false,
      errors,
      warnings,
      metadata: {
        validatedAt: Date.now(),
        validationType: 'assessment_answers',
        validationDuration: Date.now() - startTime
      }
    };
  }
  
  const expectedQuestionCount = assessmentType === 'phq9' ? 
    PHQ9_SCORING_CONFIG.questionCount : 
    GAD7_SCORING_CONFIG.questionCount;
  
  // Check question count
  if (answers.length !== expectedQuestionCount) {
    errors.push({
      code: 'INCORRECT_QUESTION_COUNT',
      message: `Expected ${expectedQuestionCount} questions, got ${answers.length}`,
      field: 'answers.length',
      value: answers.length,
      severity: 'critical'
    });
  }
  
  // Validate each answer
  answers.forEach((answer, index) => {
    if (!isValidAssessmentAnswer(answer)) {
      errors.push({
        code: 'INVALID_ANSWER_STRUCTURE',
        message: `Answer at index ${index} has invalid structure`,
        field: `answers[${index}]`,
        value: answer,
        severity: 'high'
      });
      return;
    }
    
    // Validate response value
    if (!validateAssessmentResponse(answer.response)) {
      errors.push({
        code: 'INVALID_RESPONSE_VALUE',
        message: `Response value must be 0, 1, 2, or 3`,
        field: `answers[${index}].response`,
        value: answer.response,
        severity: 'critical'
      });
    }
    
    // Validate question ID format
    const expectedPrefix = assessmentType === 'phq9' ? 'phq9_' : 'gad7_';
    if (!answer.questionId.startsWith(expectedPrefix)) {
      errors.push({
        code: 'INVALID_QUESTION_ID',
        message: `Question ID must start with '${expectedPrefix}'`,
        field: `answers[${index}].questionId`,
        value: answer.questionId,
        severity: 'high'
      });
    }
    
    // Validate timestamp
    if (!isValidTimestamp(answer.timestamp)) {
      warnings.push({
        code: 'INVALID_TIMESTAMP',
        message: 'Answer timestamp appears invalid',
        field: `answers[${index}].timestamp`,
        recommendation: 'Ensure timestamps are in milliseconds since epoch'
      });
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metadata: {
      validatedAt: Date.now(),
      validationType: 'assessment_answers',
      validationDuration: Date.now() - startTime
    }
  };
}

/**
 * Type Guard Functions
 */
function isValidAssessmentAnswer(value: unknown): value is AssessmentAnswer {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return 'questionId' in v &&
         'response' in v &&
         'timestamp' in v &&
         typeof v['questionId'] === 'string' &&
         validateAssessmentResponse(v['response']) &&
         typeof v['timestamp'] === 'number';
}

function isValidTimestamp(timestamp: number): boolean {
  const now = Date.now();
  const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
  const oneHourFromNow = now + (60 * 60 * 1000);
  
  return timestamp >= oneYearAgo && timestamp <= oneHourFromNow;
}

/**
 * Comprehensive Validation Function
 */
export function validateAssessmentSystemData(data: {
  answers?: unknown;
  assessmentType: AssessmentType;
}): ValidationResult {
  const startTime = Date.now();
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationWarning[] = [];
  
  // Validate answers if provided
  if (data.answers) {
    const answersValidation = validateAssessmentAnswers(data.answers, data.assessmentType);
    allErrors.push(...answersValidation.errors);
    allWarnings.push(...answersValidation.warnings);
  }
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    metadata: {
      validatedAt: Date.now(),
      validationType: 'comprehensive_assessment_data',
      validationDuration: Date.now() - startTime
    }
  };
}