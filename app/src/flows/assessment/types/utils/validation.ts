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
  const expectedSeverity = calculatePHQ9Severity(result.totalScore);\n  if (result.severity !== expectedSeverity) {\n    errors.push({\n      code: 'INCORRECT_PHQ9_SEVERITY',\n      message: `Severity '${result.severity}' does not match score ${result.totalScore}`,\n      field: 'severity',\n      value: result.severity,\n      severity: 'high'\n    });\n  }\n  \n  // Validate crisis threshold\n  const expectedCrisis = result.totalScore >= CRISIS_SAFETY_THRESHOLDS.PHQ9_CRISIS_SCORE || result.suicidalIdeation;\n  if (result.isCrisis !== expectedCrisis) {\n    errors.push({\n      code: 'INCORRECT_CRISIS_DETECTION',\n      message: 'Crisis flag does not match score and suicidal ideation status',\n      field: 'isCrisis',\n      value: result.isCrisis,\n      severity: 'critical'\n    });\n  }\n  \n  // Validate suicidal ideation\n  const q9Answer = result.answers.find(a => a.questionId === CRISIS_SAFETY_THRESHOLDS.PHQ9_SUICIDAL_QUESTION_ID);\n  const expectedSuicidal = q9Answer ? q9Answer.response > 0 : false;\n  if (result.suicidalIdeation !== expectedSuicidal) {\n    errors.push({\n      code: 'INCORRECT_SUICIDAL_IDEATION',\n      message: 'Suicidal ideation flag does not match Question 9 response',\n      field: 'suicidalIdeation',\n      value: result.suicidalIdeation,\n      severity: 'critical'\n    });\n  }\n  \n  return {\n    isValid: errors.length === 0,\n    errors,\n    warnings,\n    metadata: {\n      validatedAt: Date.now(),\n      validationType: 'phq9_result',\n      validationDuration: Date.now() - startTime\n    }\n  };\n}\n\nexport function validateGAD7Result(result: unknown): ValidationResult {\n  const startTime = Date.now();\n  const errors: ValidationError[] = [];\n  const warnings: ValidationWarning[] = [];\n  \n  if (!isGAD7ResultShape(result)) {\n    errors.push({\n      code: 'INVALID_GAD7_RESULT_SHAPE',\n      message: 'Result does not match GAD7Result interface',\n      severity: 'critical'\n    });\n    \n    return {\n      isValid: false,\n      errors,\n      warnings,\n      metadata: {\n        validatedAt: Date.now(),\n        validationType: 'gad7_result',\n        validationDuration: Date.now() - startTime\n      }\n    };\n  }\n  \n  // Validate score range\n  if (result.totalScore < GAD7_SCORING_CONFIG.minScore || \n      result.totalScore > GAD7_SCORING_CONFIG.maxScore) {\n    errors.push({\n      code: 'INVALID_GAD7_SCORE_RANGE',\n      message: `GAD-7 score must be between ${GAD7_SCORING_CONFIG.minScore} and ${GAD7_SCORING_CONFIG.maxScore}`,\n      field: 'totalScore',\n      value: result.totalScore,\n      severity: 'critical'\n    });\n  }\n  \n  // Validate severity assignment\n  const expectedSeverity = calculateGAD7Severity(result.totalScore);\n  if (result.severity !== expectedSeverity) {\n    errors.push({\n      code: 'INCORRECT_GAD7_SEVERITY',\n      message: `Severity '${result.severity}' does not match score ${result.totalScore}`,\n      field: 'severity',\n      value: result.severity,\n      severity: 'high'\n    });\n  }\n  \n  // Validate crisis threshold\n  const expectedCrisis = result.totalScore >= CRISIS_SAFETY_THRESHOLDS.GAD7_CRISIS_SCORE;\n  if (result.isCrisis !== expectedCrisis) {\n    errors.push({\n      code: 'INCORRECT_CRISIS_DETECTION',\n      message: 'Crisis flag does not match score threshold',\n      field: 'isCrisis',\n      value: result.isCrisis,\n      severity: 'critical'\n    });\n  }\n  \n  return {\n    isValid: errors.length === 0,\n    errors,\n    warnings,\n    metadata: {\n      validatedAt: Date.now(),\n      validationType: 'gad7_result',\n      validationDuration: Date.now() - startTime\n    }\n  };\n}\n\n/**\n * Crisis Detection Validation\n */\nexport function validateCrisisDetection(detection: unknown): ValidationResult {\n  const startTime = Date.now();\n  const errors: ValidationError[] = [];\n  const warnings: ValidationWarning[] = [];\n  \n  if (!isCrisisDetectionShape(detection)) {\n    errors.push({\n      code: 'INVALID_CRISIS_DETECTION_SHAPE',\n      message: 'Detection does not match CrisisDetection interface',\n      severity: 'critical'\n    });\n    \n    return {\n      isValid: false,\n      errors,\n      warnings,\n      metadata: {\n        validatedAt: Date.now(),\n        validationType: 'crisis_detection',\n        validationDuration: Date.now() - startTime\n      }\n    };\n  }\n  \n  // Validate response time\n  if (detection.detectionResponseTimeMs > CRISIS_SAFETY_THRESHOLDS.MAX_CRISIS_RESPONSE_TIME_MS) {\n    errors.push({\n      code: 'CRISIS_RESPONSE_TIME_EXCEEDED',\n      message: `Crisis response time ${detection.detectionResponseTimeMs}ms exceeds maximum ${CRISIS_SAFETY_THRESHOLDS.MAX_CRISIS_RESPONSE_TIME_MS}ms`,\n      field: 'detectionResponseTimeMs',\n      value: detection.detectionResponseTimeMs,\n      severity: 'critical'\n    });\n  }\n  \n  // Validate trigger conditions\n  if (detection.assessmentType === 'phq9') {\n    if (detection.primaryTrigger === 'phq9_severe_score' && \n        detection.triggerValue < CRISIS_SAFETY_THRESHOLDS.PHQ9_CRISIS_SCORE) {\n      errors.push({\n        code: 'INVALID_PHQ9_CRISIS_TRIGGER',\n        message: `PHQ-9 score ${detection.triggerValue} below crisis threshold ${CRISIS_SAFETY_THRESHOLDS.PHQ9_CRISIS_SCORE}`,\n        field: 'triggerValue',\n        value: detection.triggerValue,\n        severity: 'critical'\n      });\n    }\n  } else if (detection.assessmentType === 'gad7') {\n    if (detection.primaryTrigger === 'gad7_severe_score' && \n        detection.triggerValue < CRISIS_SAFETY_THRESHOLDS.GAD7_CRISIS_SCORE) {\n      errors.push({\n        code: 'INVALID_GAD7_CRISIS_TRIGGER',\n        message: `GAD-7 score ${detection.triggerValue} below crisis threshold ${CRISIS_SAFETY_THRESHOLDS.GAD7_CRISIS_SCORE}`,\n        field: 'triggerValue',\n        value: detection.triggerValue,\n        severity: 'critical'\n      });\n    }\n  }\n  \n  return {\n    isValid: errors.length === 0,\n    errors,\n    warnings,\n    metadata: {\n      validatedAt: Date.now(),\n      validationType: 'crisis_detection',\n      validationDuration: Date.now() - startTime\n    }\n  };\n}\n\n/**\n * Type Guard Functions\n */\nfunction isValidAssessmentAnswer(value: unknown): value is AssessmentAnswer {\n  return typeof value === 'object' &&\n         value !== null &&\n         'questionId' in value &&\n         'response' in value &&\n         'timestamp' in value &&\n         typeof (value as any).questionId === 'string' &&\n         validateAssessmentResponse((value as any).response) &&\n         typeof (value as any).timestamp === 'number';\n}\n\nfunction isPHQ9ResultShape(value: unknown): value is PHQ9Result {\n  return typeof value === 'object' &&\n         value !== null &&\n         'totalScore' in value &&\n         'severity' in value &&\n         'isCrisis' in value &&\n         'suicidalIdeation' in value &&\n         'completedAt' in value &&\n         'answers' in value &&\n         typeof (value as any).totalScore === 'number' &&\n         typeof (value as any).severity === 'string' &&\n         typeof (value as any).isCrisis === 'boolean' &&\n         typeof (value as any).suicidalIdeation === 'boolean' &&\n         typeof (value as any).completedAt === 'number' &&\n         Array.isArray((value as any).answers);\n}\n\nfunction isGAD7ResultShape(value: unknown): value is GAD7Result {\n  return typeof value === 'object' &&\n         value !== null &&\n         'totalScore' in value &&\n         'severity' in value &&\n         'isCrisis' in value &&\n         'completedAt' in value &&\n         'answers' in value &&\n         !('suicidalIdeation' in value) && // GAD-7 should not have this field\n         typeof (value as any).totalScore === 'number' &&\n         typeof (value as any).severity === 'string' &&\n         typeof (value as any).isCrisis === 'boolean' &&\n         typeof (value as any).completedAt === 'number' &&\n         Array.isArray((value as any).answers);\n}\n\nfunction isCrisisDetectionShape(value: unknown): value is CrisisDetection {\n  return typeof value === 'object' &&\n         value !== null &&\n         'isTriggered' in value &&\n         'triggerType' in value &&\n         'triggerValue' in value &&\n         'timestamp' in value &&\n         'assessmentId' in value;\n}\n\nfunction isValidTimestamp(timestamp: number): boolean {\n  const now = Date.now();\n  const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);\n  const oneHourFromNow = now + (60 * 60 * 1000);\n  \n  return timestamp >= oneYearAgo && timestamp <= oneHourFromNow;\n}\n\n/**\n * Severity Calculation Functions\n */\nfunction calculatePHQ9Severity(score: number): PHQ9Result['severity'] {\n  if (score >= 20) return 'severe';\n  if (score >= 15) return 'moderately_severe';\n  if (score >= 10) return 'moderate';\n  if (score >= 5) return 'mild';\n  return 'minimal';\n}\n\nfunction calculateGAD7Severity(score: number): GAD7Result['severity'] {\n  if (score >= 15) return 'severe';\n  if (score >= 10) return 'moderate';\n  if (score >= 5) return 'mild';\n  return 'minimal';\n}\n\n/**\n * Comprehensive Validation Function\n */\nexport function validateAssessmentSystemData(data: {\n  answers?: unknown;\n  result?: unknown;\n  crisis?: unknown;\n  assessmentType: AssessmentType;\n}): ValidationResult {\n  const startTime = Date.now();\n  const allErrors: ValidationError[] = [];\n  const allWarnings: ValidationWarning[] = [];\n  \n  // Validate answers if provided\n  if (data.answers) {\n    const answersValidation = validateAssessmentAnswers(data.answers, data.assessmentType);\n    allErrors.push(...answersValidation.errors);\n    allWarnings.push(...answersValidation.warnings);\n  }\n  \n  // Validate result if provided\n  if (data.result) {\n    const resultValidation = data.assessmentType === 'phq9' \n      ? validatePHQ9Result(data.result)\n      : validateGAD7Result(data.result);\n    allErrors.push(...resultValidation.errors);\n    allWarnings.push(...resultValidation.warnings);\n  }\n  \n  // Validate crisis detection if provided\n  if (data.crisis) {\n    const crisisValidation = validateCrisisDetection(data.crisis);\n    allErrors.push(...crisisValidation.errors);\n    allWarnings.push(...crisisValidation.warnings);\n  }\n  \n  return {\n    isValid: allErrors.length === 0,\n    errors: allErrors,\n    warnings: allWarnings,\n    metadata: {\n      validatedAt: Date.now(),\n      validationType: 'comprehensive_assessment_data',\n      validationDuration: Date.now() - startTime\n    }\n  };\n}