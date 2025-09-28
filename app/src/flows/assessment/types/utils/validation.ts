/**
 * Assessment Type Validation Utilities
 * Runtime validation for comprehensive type safety
 * Ensures clinical accuracy and crisis safety compliance
 */

import { 
  AssessmentType,
  AssessmentResponse, 
  AssessmentAnswer,
  PHQ9Result,
  GAD7Result,
  CrisisDetection,
  CrisisIntervention 
} from '../index';
import { CRISIS_SAFETY_THRESHOLDS } from '../crisis/safety';
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
 * Assessment Result Validation
 */
export function validatePHQ9Result(result: unknown): ValidationResult {
  const startTime = Date.now();
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  if (!isPHQ9ResultShape(result)) {
    errors.push({
      code: 'INVALID_PHQ9_RESULT_SHAPE',
      message: 'Result does not match PHQ9Result interface',
      severity: 'critical'
    });
    
    return {
      isValid: false,
      errors,
      warnings,
      metadata: {
        validatedAt: Date.now(),
        validationType: 'phq9_result',
        validationDuration: Date.now() - startTime
      }
    };
  }
  
  // Validate score range
  if (result.totalScore < PHQ9_SCORING_CONFIG.minScore || 
      result.totalScore > PHQ9_SCORING_CONFIG.maxScore) {
    errors.push({
      code: 'INVALID_PHQ9_SCORE_RANGE',
      message: `PHQ-9 score must be between ${PHQ9_SCORING_CONFIG.minScore} and ${PHQ9_SCORING_CONFIG.maxScore}`,
      field: 'totalScore',
      value: result.totalScore,
      severity: 'critical'
    });
  }
  
  // Validate severity assignment
  const expectedSeverity = calculatePHQ9Severity(result.totalScore);
  if (result.severity !== expectedSeverity) {
    errors.push({
      code: 'INCORRECT_PHQ9_SEVERITY',
      message: `Severity '${result.severity}' does not match score ${result.totalScore}`,
      field: 'severity',
      value: result.severity,
      severity: 'high'
    });
  }
  
  // Validate crisis threshold
  const expectedCrisis = result.totalScore >= CRISIS_SAFETY_THRESHOLDS.PHQ9_CRISIS_SCORE || result.suicidalIdeation;
  if (result.isCrisis !== expectedCrisis) {
    errors.push({
      code: 'INCORRECT_CRISIS_DETECTION',
      message: 'Crisis flag does not match score and suicidal ideation status',
      field: 'isCrisis',
      value: result.isCrisis,
      severity: 'critical'
    });
  }
  
  // Validate suicidal ideation
  const q9Answer = result.answers.find(a => a.questionId === CRISIS_SAFETY_THRESHOLDS.PHQ9_SUICIDAL_QUESTION_ID);
  const expectedSuicidal = q9Answer ? q9Answer.response > 0 : false;
  if (result.suicidalIdeation !== expectedSuicidal) {
    errors.push({
      code: 'INCORRECT_SUICIDAL_IDEATION',
      message: 'Suicidal ideation flag does not match Question 9 response',
      field: 'suicidalIdeation',
      value: result.suicidalIdeation,
      severity: 'critical'
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metadata: {
      validatedAt: Date.now(),
      validationType: 'phq9_result',
      validationDuration: Date.now() - startTime
    }
  };
}

export function validateGAD7Result(result: unknown): ValidationResult {
  const startTime = Date.now();
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  if (!isGAD7ResultShape(result)) {
    errors.push({
      code: 'INVALID_GAD7_RESULT_SHAPE',
      message: 'Result does not match GAD7Result interface',
      severity: 'critical'
    });
    
    return {
      isValid: false,
      errors,
      warnings,
      metadata: {
        validatedAt: Date.now(),
        validationType: 'gad7_result',
        validationDuration: Date.now() - startTime
      }
    };
  }
  
  // Validate score range
  if (result.totalScore < GAD7_SCORING_CONFIG.minScore || 
      result.totalScore > GAD7_SCORING_CONFIG.maxScore) {
    errors.push({
      code: 'INVALID_GAD7_SCORE_RANGE',
      message: `GAD-7 score must be between ${GAD7_SCORING_CONFIG.minScore} and ${GAD7_SCORING_CONFIG.maxScore}`,
      field: 'totalScore',
      value: result.totalScore,
      severity: 'critical'
    });
  }
  
  // Validate severity assignment
  const expectedSeverity = calculateGAD7Severity(result.totalScore);
  if (result.severity !== expectedSeverity) {
    errors.push({
      code: 'INCORRECT_GAD7_SEVERITY',
      message: `Severity '${result.severity}' does not match score ${result.totalScore}`,
      field: 'severity',
      value: result.severity,
      severity: 'high'
    });
  }
  
  // Validate crisis threshold
  const expectedCrisis = result.totalScore >= CRISIS_SAFETY_THRESHOLDS.GAD7_CRISIS_SCORE;
  if (result.isCrisis !== expectedCrisis) {
    errors.push({
      code: 'INCORRECT_CRISIS_DETECTION',
      message: 'Crisis flag does not match score threshold',
      field: 'isCrisis',
      value: result.isCrisis,
      severity: 'critical'
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metadata: {
      validatedAt: Date.now(),
      validationType: 'gad7_result',
      validationDuration: Date.now() - startTime
    }
  };
}

/**
 * Crisis Detection Validation
 */
export function validateCrisisDetection(detection: unknown): ValidationResult {
  const startTime = Date.now();
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  if (!isCrisisDetectionShape(detection)) {
    errors.push({
      code: 'INVALID_CRISIS_DETECTION_SHAPE',
      message: 'Detection does not match CrisisDetection interface',
      severity: 'critical'
    });
    
    return {
      isValid: false,
      errors,
      warnings,
      metadata: {
        validatedAt: Date.now(),
        validationType: 'crisis_detection',
        validationDuration: Date.now() - startTime
      }
    };
  }
  
  // Validate response time
  if (detection.detectionResponseTimeMs > CRISIS_SAFETY_THRESHOLDS.MAX_CRISIS_RESPONSE_TIME_MS) {
    errors.push({
      code: 'CRISIS_RESPONSE_TIME_EXCEEDED',
      message: `Crisis response time ${detection.detectionResponseTimeMs}ms exceeds maximum ${CRISIS_SAFETY_THRESHOLDS.MAX_CRISIS_RESPONSE_TIME_MS}ms`,
      field: 'detectionResponseTimeMs',
      value: detection.detectionResponseTimeMs,
      severity: 'critical'
    });
  }
  
  // Validate trigger conditions
  if (detection.assessmentType === 'phq9') {
    if (detection.primaryTrigger === 'phq9_severe_score' && 
        detection.triggerValue < CRISIS_SAFETY_THRESHOLDS.PHQ9_CRISIS_SCORE) {
      errors.push({
        code: 'INVALID_PHQ9_CRISIS_TRIGGER',
        message: `PHQ-9 score ${detection.triggerValue} below crisis threshold ${CRISIS_SAFETY_THRESHOLDS.PHQ9_CRISIS_SCORE}`,
        field: 'triggerValue',
        value: detection.triggerValue,
        severity: 'critical'
      });
    }
  } else if (detection.assessmentType === 'gad7') {
    if (detection.primaryTrigger === 'gad7_severe_score' && 
        detection.triggerValue < CRISIS_SAFETY_THRESHOLDS.GAD7_CRISIS_SCORE) {
      errors.push({
        code: 'INVALID_GAD7_CRISIS_TRIGGER',
        message: `GAD-7 score ${detection.triggerValue} below crisis threshold ${CRISIS_SAFETY_THRESHOLDS.GAD7_CRISIS_SCORE}`,
        field: 'triggerValue',
        value: detection.triggerValue,
        severity: 'critical'
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metadata: {
      validatedAt: Date.now(),
      validationType: 'crisis_detection',
      validationDuration: Date.now() - startTime
    }
  };
}

/**
 * Type Guard Functions
 */
function isValidAssessmentAnswer(value: unknown): value is AssessmentAnswer {
  return typeof value === 'object' &&
         value !== null &&
         'questionId' in value &&
         'response' in value &&
         'timestamp' in value &&
         typeof (value as any).questionId === 'string' &&
         validateAssessmentResponse((value as any).response) &&
         typeof (value as any).timestamp === 'number';
}

function isPHQ9ResultShape(value: unknown): value is PHQ9Result {
  return typeof value === 'object' &&
         value !== null &&
         'totalScore' in value &&
         'severity' in value &&
         'isCrisis' in value &&
         'suicidalIdeation' in value &&
         'completedAt' in value &&
         'answers' in value &&
         typeof (value as any).totalScore === 'number' &&
         typeof (value as any).severity === 'string' &&
         typeof (value as any).isCrisis === 'boolean' &&
         typeof (value as any).suicidalIdeation === 'boolean' &&
         typeof (value as any).completedAt === 'number' &&
         Array.isArray((value as any).answers);
}

function isGAD7ResultShape(value: unknown): value is GAD7Result {
  return typeof value === 'object' &&
         value !== null &&
         'totalScore' in value &&
         'severity' in value &&
         'isCrisis' in value &&
         'completedAt' in value &&
         'answers' in value &&
         !('suicidalIdeation' in value) && // GAD-7 should not have this field
         typeof (value as any).totalScore === 'number' &&
         typeof (value as any).severity === 'string' &&
         typeof (value as any).isCrisis === 'boolean' &&
         typeof (value as any).completedAt === 'number' &&
         Array.isArray((value as any).answers);
}

function isCrisisDetectionShape(value: unknown): value is CrisisDetection {
  return typeof value === 'object' &&
         value !== null &&
         'isTriggered' in value &&
         'triggerType' in value &&
         'triggerValue' in value &&
         'timestamp' in value &&
         'assessmentId' in value;
}

function isValidTimestamp(timestamp: number): boolean {
  const now = Date.now();
  const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
  const oneHourFromNow = now + (60 * 60 * 1000);
  
  return timestamp >= oneYearAgo && timestamp <= oneHourFromNow;
}

/**
 * Severity Calculation Functions
 */
function calculatePHQ9Severity(score: number): PHQ9Result['severity'] {
  if (score >= 20) return 'severe';
  if (score >= 15) return 'moderately_severe';
  if (score >= 10) return 'moderate';
  if (score >= 5) return 'mild';
  return 'minimal';
}

function calculateGAD7Severity(score: number): GAD7Result['severity'] {
  if (score >= 15) return 'severe';
  if (score >= 10) return 'moderate';
  if (score >= 5) return 'mild';
  return 'minimal';
}

/**
 * Comprehensive Validation Function
 */
export function validateAssessmentSystemData(data: {
  answers?: unknown;
  result?: unknown;
  crisis?: unknown;
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
  
  // Validate result if provided
  if (data.result) {
    const resultValidation = data.assessmentType === 'phq9' 
      ? validatePHQ9Result(data.result)
      : validateGAD7Result(data.result);
    allErrors.push(...resultValidation.errors);
    allWarnings.push(...resultValidation.warnings);
  }
  
  // Validate crisis detection if provided
  if (data.crisis) {
    const crisisValidation = validateCrisisDetection(data.crisis);
    allErrors.push(...crisisValidation.errors);
    allWarnings.push(...crisisValidation.warnings);
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