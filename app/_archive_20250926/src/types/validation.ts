/**
 * Validation Types and Utilities - Runtime Type Safety
 *
 * Comprehensive validation system for the Being. MBCT app with
 * strict clinical data validation and crisis intervention safety.
 *
 * CRITICAL: These validators ensure data integrity for clinical operations
 */

import { z } from 'zod';
import type {
  UserID,
  DeviceID,
  SessionID,
  ISODateString,
  EmailAddress,
  PhoneNumber,
  Percentage,
  DurationMs,
  CrisisSeverity,
  RiskLevel,
  ValidationError,
  ValidationResult,
  SafeParse,
  TypeGuard,
  Parser,
  Validator,
} from './core';
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
} from './clinical';

// === CORE VALIDATION SCHEMAS ===

/**
 * User ID validation schema
 */
export const UserIDSchema = z.string().regex(
  /^user_[a-zA-Z0-9_-]+$/,
  'User ID must start with "user_" followed by alphanumeric characters'
);

/**
 * Device ID validation schema
 */
export const DeviceIDSchema = z.string().regex(
  /^device_[a-zA-Z0-9_-]+$/,
  'Device ID must start with "device_" followed by alphanumeric characters'
);

/**
 * Session ID validation schema
 */
export const SessionIDSchema = z.string().regex(
  /^session_[a-zA-Z0-9_-]+$/,
  'Session ID must start with "session_" followed by alphanumeric characters'
);

/**
 * ISO date string validation schema
 */
export const ISODateStringSchema = z.string().refine(
  (val) => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && date.toISOString() === val;
  },
  'Must be a valid ISO 8601 date string'
);

/**
 * Email address validation schema
 */
export const EmailAddressSchema = z.string().email('Must be a valid email address');

/**
 * Phone number validation schema (E.164 format)
 */
export const PhoneNumberSchema = z.string().regex(
  /^\+[1-9]\d{1,14}$/,
  'Must be a valid phone number in E.164 format'
);

/**
 * Percentage validation schema (0-100)
 */
export const PercentageSchema = z.number().min(0).max(100);

/**
 * Duration validation schema (non-negative milliseconds)
 */
export const DurationMsSchema = z.number().min(0);

/**
 * Crisis severity validation schema
 */
export const CrisisSeveritySchema = z.enum([
  'none',
  'low',
  'moderate',
  'high',
  'critical',
  'emergency',
]);

/**
 * Risk level validation schema
 */
export const RiskLevelSchema = z.enum([
  'minimal',
  'low',
  'moderate',
  'high',
  'severe',
  'critical',
]);

// === CLINICAL VALIDATION SCHEMAS ===

/**
 * PHQ-9 answer validation schema
 */
export const PHQ9AnswerSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

/**
 * GAD-7 answer validation schema
 */
export const GAD7AnswerSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

/**
 * PHQ-9 answers array validation schema
 */
export const PHQ9AnswersSchema = z.tuple([
  PHQ9AnswerSchema, PHQ9AnswerSchema, PHQ9AnswerSchema,
  PHQ9AnswerSchema, PHQ9AnswerSchema, PHQ9AnswerSchema,
  PHQ9AnswerSchema, PHQ9AnswerSchema, PHQ9AnswerSchema,
]);

/**
 * GAD-7 answers array validation schema
 */
export const GAD7AnswersSchema = z.tuple([
  GAD7AnswerSchema, GAD7AnswerSchema, GAD7AnswerSchema,
  GAD7AnswerSchema, GAD7AnswerSchema, GAD7AnswerSchema,
  GAD7AnswerSchema,
]);

/**
 * PHQ-9 score validation schema
 */
export const PHQ9ScoreSchema = z.number().min(0).max(27).int();

/**
 * GAD-7 score validation schema
 */
export const GAD7ScoreSchema = z.number().min(0).max(21).int();

/**
 * PHQ-9 severity validation schema
 */
export const PHQ9SeveritySchema = z.enum([
  'minimal',
  'mild',
  'moderate',
  'moderately severe',
  'severe',
]);

/**
 * GAD-7 severity validation schema
 */
export const GAD7SeveritySchema = z.enum([
  'minimal',
  'mild',
  'moderate',
  'severe',
]);

/**
 * Assessment ID validation schema
 */
export const AssessmentIDSchema = z.string().regex(
  /^assessment_(phq9|gad7)_\d+_[a-zA-Z0-9]+$/,
  'Assessment ID must follow the pattern: assessment_{type}_{timestamp}_{random}'
);

/**
 * PHQ-9 assessment validation schema
 */
export const PHQ9AssessmentSchema = z.object({
  type: z.literal('phq9'),
  answers: PHQ9AnswersSchema,
  score: PHQ9ScoreSchema,
  severity: PHQ9SeveritySchema,
  id: AssessmentIDSchema,
  completedAt: ISODateStringSchema,
  context: z.enum(['onboarding', 'standalone', 'clinical']),
  requiresCrisisIntervention: z.boolean(),
});

/**
 * GAD-7 assessment validation schema
 */
export const GAD7AssessmentSchema = z.object({
  type: z.literal('gad7'),
  answers: GAD7AnswersSchema,
  score: GAD7ScoreSchema,
  severity: GAD7SeveritySchema,
  id: AssessmentIDSchema,
  completedAt: ISODateStringSchema,
  context: z.enum(['onboarding', 'standalone', 'clinical']),
  requiresCrisisIntervention: z.boolean(),
});

/**
 * Assessment union validation schema
 */
export const AssessmentSchema = z.union([
  PHQ9AssessmentSchema,
  GAD7AssessmentSchema,
]);

// === TYPE GUARD IMPLEMENTATIONS ===

/**
 * Type guard for UserID
 */
export const isUserID: TypeGuard<UserID> = (value): value is UserID => {
  return UserIDSchema.safeParse(value).success;
};

/**
 * Type guard for DeviceID
 */
export const isDeviceID: TypeGuard<DeviceID> = (value): value is DeviceID => {
  return DeviceIDSchema.safeParse(value).success;
};

/**
 * Type guard for SessionID
 */
export const isSessionID: TypeGuard<SessionID> = (value): value is SessionID => {
  return SessionIDSchema.safeParse(value).success;
};

/**
 * Type guard for ISO date string
 */
export const isISODateString: TypeGuard<ISODateString> = (value): value is ISODateString => {
  return ISODateStringSchema.safeParse(value).success;
};

/**
 * Type guard for email address
 */
export const isEmailAddress: TypeGuard<EmailAddress> = (value): value is EmailAddress => {
  return EmailAddressSchema.safeParse(value).success;
};

/**
 * Type guard for phone number
 */
export const isPhoneNumber: TypeGuard<PhoneNumber> = (value): value is PhoneNumber => {
  return PhoneNumberSchema.safeParse(value).success;
};

/**
 * Type guard for percentage
 */
export const isPercentage: TypeGuard<Percentage> = (value): value is Percentage => {
  return PercentageSchema.safeParse(value).success;
};

/**
 * Type guard for duration
 */
export const isDurationMs: TypeGuard<DurationMs> = (value): value is DurationMs => {
  return DurationMsSchema.safeParse(value).success;
};

/**
 * Type guard for crisis severity
 */
export const isCrisisSeverity: TypeGuard<CrisisSeverity> = (value): value is CrisisSeverity => {
  return CrisisSeveritySchema.safeParse(value).success;
};

/**
 * Type guard for risk level
 */
export const isRiskLevel: TypeGuard<RiskLevel> = (value): value is RiskLevel => {
  return RiskLevelSchema.safeParse(value).success;
};

// === CLINICAL TYPE GUARDS ===

/**
 * Type guard for PHQ-9 answer
 */
export const isPHQ9Answer: TypeGuard<PHQ9Answer> = (value): value is PHQ9Answer => {
  return PHQ9AnswerSchema.safeParse(value).success;
};

/**
 * Type guard for GAD-7 answer
 */
export const isGAD7Answer: TypeGuard<GAD7Answer> = (value): value is GAD7Answer => {
  return GAD7AnswerSchema.safeParse(value).success;
};

/**
 * Type guard for PHQ-9 answers array
 */
export const isPHQ9Answers: TypeGuard<PHQ9Answers> = (value): value is PHQ9Answers => {
  return PHQ9AnswersSchema.safeParse(value).success;
};

/**
 * Type guard for GAD-7 answers array
 */
export const isGAD7Answers: TypeGuard<GAD7Answers> = (value): value is GAD7Answers => {
  return GAD7AnswersSchema.safeParse(value).success;
};

/**
 * Type guard for PHQ-9 score
 */
export const isPHQ9Score: TypeGuard<PHQ9Score> = (value): value is PHQ9Score => {
  return PHQ9ScoreSchema.safeParse(value).success;
};

/**
 * Type guard for GAD-7 score
 */
export const isGAD7Score: TypeGuard<GAD7Score> = (value): value is GAD7Score => {
  return GAD7ScoreSchema.safeParse(value).success;
};

/**
 * Type guard for PHQ-9 severity
 */
export const isPHQ9Severity: TypeGuard<PHQ9Severity> = (value): value is PHQ9Severity => {
  return PHQ9SeveritySchema.safeParse(value).success;
};

/**
 * Type guard for GAD-7 severity
 */
export const isGAD7Severity: TypeGuard<GAD7Severity> = (value): value is GAD7Severity => {
  return GAD7SeveritySchema.safeParse(value).success;
};

/**
 * Type guard for Assessment ID
 */
export const isAssessmentID: TypeGuard<AssessmentID> = (value): value is AssessmentID => {
  return AssessmentIDSchema.safeParse(value).success;
};

/**
 * Type guard for Assessment
 */
export const isAssessment: TypeGuard<Assessment> = (value): value is Assessment => {
  return AssessmentSchema.safeParse(value).success;
};

/**
 * Type guard for PHQ-9 Assessment
 */
export const isPHQ9Assessment: TypeGuard<Assessment & { type: 'phq9' }> = (
  value
): value is Assessment & { type: 'phq9' } => {
  return PHQ9AssessmentSchema.safeParse(value).success;
};

/**
 * Type guard for GAD-7 Assessment
 */
export const isGAD7Assessment: TypeGuard<Assessment & { type: 'gad7' }> = (
  value
): value is Assessment & { type: 'gad7' } => {
  return GAD7AssessmentSchema.safeParse(value).success;
};

// === PARSER IMPLEMENTATIONS ===

/**
 * Safe parser for UserID
 */
export const parseUserID: Parser<UserID> = (value): SafeParse<UserID> => {
  const result = UserIDSchema.safeParse(value);
  if (result.success) {
    return { success: true, data: result.data as UserID };
  }
  return {
    success: false,
    error: result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
      severity: 'error' as const,
    })),
  };
};

/**
 * Safe parser for Assessment
 */
export const parseAssessment: Parser<Assessment> = (value): SafeParse<Assessment> => {
  const result = AssessmentSchema.safeParse(value);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
      severity: 'critical' as const, // Clinical data errors are critical
    })),
  };
};

/**
 * Safe parser for PHQ-9 answers
 */
export const parsePHQ9Answers: Parser<PHQ9Answers> = (value): SafeParse<PHQ9Answers> => {
  const result = PHQ9AnswersSchema.safeParse(value);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
      severity: 'critical' as const,
    })),
  };
};

/**
 * Safe parser for GAD-7 answers
 */
export const parseGAD7Answers: Parser<GAD7Answers> = (value): SafeParse<GAD7Answers> => {
  const result = GAD7AnswersSchema.safeParse(value);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
      severity: 'critical' as const,
    })),
  };
};

// === CLINICAL VALIDATION FUNCTIONS ===

/**
 * Validate PHQ-9 score calculation
 */
export const validatePHQ9ScoreCalculation = (
  answers: PHQ9Answers,
  expectedScore: PHQ9Score
): ValidationResult<PHQ9Score> => {
  const actualScore = answers.reduce((sum, answer) => sum + answer, 0);

  if (actualScore !== expectedScore) {
    return {
      isValid: false,
      errors: [{
        field: 'score',
        message: `PHQ-9 score calculation error. Expected: ${expectedScore}, Actual: ${actualScore}`,
        code: 'SCORE_CALCULATION_ERROR',
        severity: 'critical',
      }],
      warnings: [],
    };
  }

  return {
    isValid: true,
    data: expectedScore,
    errors: [],
    warnings: [],
  };
};

/**
 * Validate GAD-7 score calculation
 */
export const validateGAD7ScoreCalculation = (
  answers: GAD7Answers,
  expectedScore: GAD7Score
): ValidationResult<GAD7Score> => {
  const actualScore = answers.reduce((sum, answer) => sum + answer, 0);

  if (actualScore !== expectedScore) {
    return {
      isValid: false,
      errors: [{
        field: 'score',
        message: `GAD-7 score calculation error. Expected: ${expectedScore}, Actual: ${actualScore}`,
        code: 'SCORE_CALCULATION_ERROR',
        severity: 'critical',
      }],
      warnings: [],
    };
  }

  return {
    isValid: true,
    data: expectedScore,
    errors: [],
    warnings: [],
  };
};

/**
 * Validate crisis detection for PHQ-9
 */
export const validatePHQ9CrisisDetection = (
  answers: PHQ9Answers,
  score: PHQ9Score
): ValidationResult<boolean> => {
  const errors: ValidationError[] = [];

  // Check score-based crisis threshold
  const scoreBasedCrisis = score >= 20;

  // Check suicidal ideation (question 9, index 8)
  const suicidalIdeation = answers[8] > 0;

  const requiresCrisis = scoreBasedCrisis || suicidalIdeation;

  if (scoreBasedCrisis && !suicidalIdeation && score < 20) {
    errors.push({
      field: 'crisisDetection',
      message: 'Crisis threshold reached but score calculation may be incorrect',
      code: 'CRISIS_DETECTION_INCONSISTENCY',
      severity: 'critical',
    });
  }

  if (suicidalIdeation && score < 10) {
    errors.push({
      field: 'crisisDetection',
      message: 'Suicidal ideation detected but overall score is low - requires clinical review',
      code: 'SUICIDAL_IDEATION_LOW_SCORE',
      severity: 'critical',
    });
  }

  return {
    isValid: errors.length === 0,
    data: requiresCrisis,
    errors,
    warnings: [],
  };
};

/**
 * Validate crisis detection for GAD-7
 */
export const validateGAD7CrisisDetection = (
  score: GAD7Score
): ValidationResult<boolean> => {
  const requiresCrisis = score >= 15;

  return {
    isValid: true,
    data: requiresCrisis,
    errors: [],
    warnings: requiresCrisis ? [{
      field: 'crisisDetection',
      message: 'GAD-7 score indicates severe anxiety - crisis intervention recommended',
      code: 'GAD7_CRISIS_THRESHOLD',
      severity: 'warning',
    }] : [],
  };
};

/**
 * Comprehensive assessment validation
 */
export const validateAssessment: Validator<Assessment> = (assessment): ValidationResult<Assessment> => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Basic structure validation
  const parseResult = parseAssessment(assessment);
  if (!parseResult.success) {
    return {
      isValid: false,
      errors: parseResult.error,
      warnings: [],
    };
  }

  // Type-specific validation
  if (assessment.type === 'phq9') {
    // Validate score calculation
    const scoreValidation = validatePHQ9ScoreCalculation(assessment.answers, assessment.score);
    if (!scoreValidation.isValid) {
      errors.push(...scoreValidation.errors);
    }

    // Validate crisis detection
    const crisisValidation = validatePHQ9CrisisDetection(assessment.answers, assessment.score);
    if (!crisisValidation.isValid) {
      errors.push(...crisisValidation.errors);
    }
    warnings.push(...crisisValidation.warnings);

    // Check consistency between crisis flag and detection
    if (assessment.requiresCrisisIntervention !== crisisValidation.data) {
      errors.push({
        field: 'requiresCrisisIntervention',
        message: 'Crisis intervention flag inconsistent with score and responses',
        code: 'CRISIS_FLAG_INCONSISTENT',
        severity: 'critical',
      });
    }
  } else if (assessment.type === 'gad7') {
    // Validate score calculation
    const scoreValidation = validateGAD7ScoreCalculation(assessment.answers, assessment.score);
    if (!scoreValidation.isValid) {
      errors.push(...scoreValidation.errors);
    }

    // Validate crisis detection
    const crisisValidation = validateGAD7CrisisDetection(assessment.score);
    warnings.push(...crisisValidation.warnings);

    // Check consistency between crisis flag and detection
    if (assessment.requiresCrisisIntervention !== crisisValidation.data) {
      errors.push({
        field: 'requiresCrisisIntervention',
        message: 'Crisis intervention flag inconsistent with score',
        code: 'CRISIS_FLAG_INCONSISTENT',
        severity: 'critical',
      });
    }
  }

  // Temporal validation
  const completedAt = new Date(assessment.completedAt);
  const now = new Date();
  if (completedAt > now) {
    errors.push({
      field: 'completedAt',
      message: 'Assessment completion time cannot be in the future',
      code: 'INVALID_COMPLETION_TIME',
      severity: 'error',
    });
  }

  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  if (completedAt < oneYearAgo) {
    warnings.push({
      field: 'completedAt',
      message: 'Assessment is over one year old - may not reflect current state',
      code: 'OLD_ASSESSMENT',
      severity: 'warning',
    });
  }

  return {
    isValid: errors.length === 0,
    data: assessment,
    errors,
    warnings,
    metadata: {
      validatedAt: new Date().toISOString() as ISODateString,
      validatorVersion: '1.0.0',
      validationDuration: 0 as DurationMs, // Would be measured in real implementation
    },
  };
};

// === VALIDATION CONSTANTS ===

/**
 * Validation configuration constants
 */
export const VALIDATION_CONSTANTS = {
  // Clinical validation
  CLINICAL: {
    PHQ9_MIN_SCORE: 0,
    PHQ9_MAX_SCORE: 27,
    PHQ9_CRISIS_THRESHOLD: 20,
    GAD7_MIN_SCORE: 0,
    GAD7_MAX_SCORE: 21,
    GAD7_CRISIS_THRESHOLD: 15,
    SUICIDAL_IDEATION_INDEX: 8,
    SUICIDAL_IDEATION_THRESHOLD: 1,
  },

  // Data validation
  DATA: {
    MAX_STRING_LENGTH: 10000,
    MAX_ARRAY_LENGTH: 1000,
    MAX_OBJECT_DEPTH: 10,
    ASSESSMENT_AGE_WARNING_DAYS: 365,
    ASSESSMENT_AGE_ERROR_DAYS: 1095, // 3 years
  },

  // Performance validation
  PERFORMANCE: {
    MAX_VALIDATION_TIME_MS: 1000,
    CRISIS_VALIDATION_TIME_MS: 100,
    BATCH_VALIDATION_SIZE: 100,
  },

  // Error codes
  ERROR_CODES: {
    SCORE_CALCULATION_ERROR: 'SCORE_CALCULATION_ERROR',
    CRISIS_DETECTION_INCONSISTENCY: 'CRISIS_DETECTION_INCONSISTENCY',
    SUICIDAL_IDEATION_LOW_SCORE: 'SUICIDAL_IDEATION_LOW_SCORE',
    GAD7_CRISIS_THRESHOLD: 'GAD7_CRISIS_THRESHOLD',
    CRISIS_FLAG_INCONSISTENT: 'CRISIS_FLAG_INCONSISTENT',
    INVALID_COMPLETION_TIME: 'INVALID_COMPLETION_TIME',
    OLD_ASSESSMENT: 'OLD_ASSESSMENT',
  },
} as const;

// === EXPORTS ===

export {
  // Schemas
  UserIDSchema,
  DeviceIDSchema,
  SessionIDSchema,
  ISODateStringSchema,
  EmailAddressSchema,
  PhoneNumberSchema,
  PercentageSchema,
  DurationMsSchema,
  CrisisSeveritySchema,
  RiskLevelSchema,
  PHQ9AnswerSchema,
  GAD7AnswerSchema,
  PHQ9AnswersSchema,
  GAD7AnswersSchema,
  PHQ9ScoreSchema,
  GAD7ScoreSchema,
  PHQ9SeveritySchema,
  GAD7SeveritySchema,
  AssessmentIDSchema,
  PHQ9AssessmentSchema,
  GAD7AssessmentSchema,
  AssessmentSchema,
};