/**
 * Runtime Schema Validation for Clinical Data
 * 
 * Uses Zod for runtime validation to complement TypeScript compile-time checking.
 * Ensures clinical data integrity at runtime and provides detailed error messages.
 */

import { z } from 'zod';

// Clinical Answer Schemas - Exact validation
export const PHQ9AnswerSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

export const GAD7AnswerSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

// Answer Arrays - Exact length validation
export const PHQ9AnswersSchema = z.tuple([
  PHQ9AnswerSchema, // Question 1
  PHQ9AnswerSchema, // Question 2
  PHQ9AnswerSchema, // Question 3
  PHQ9AnswerSchema, // Question 4
  PHQ9AnswerSchema, // Question 5
  PHQ9AnswerSchema, // Question 6
  PHQ9AnswerSchema, // Question 7
  PHQ9AnswerSchema, // Question 8
  PHQ9AnswerSchema, // Question 9 (suicidal ideation)
]);

export const GAD7AnswersSchema = z.tuple([
  GAD7AnswerSchema, // Question 1
  GAD7AnswerSchema, // Question 2
  GAD7AnswerSchema, // Question 3
  GAD7AnswerSchema, // Question 4
  GAD7AnswerSchema, // Question 5
  GAD7AnswerSchema, // Question 6
  GAD7AnswerSchema, // Question 7
]);

// Score Schemas - Exact range validation
export const PHQ9ScoreSchema = z.number()
  .int()
  .min(0)
  .max(27)
  .refine((score) => {
    // Ensure score is within valid calculation range
    return score >= 0 && score <= 27;
  }, {
    message: 'PHQ-9 score must be between 0 and 27',
  });

export const GAD7ScoreSchema = z.number()
  .int()
  .min(0)
  .max(21)
  .refine((score) => {
    // Ensure score is within valid calculation range
    return score >= 0 && score <= 21;
  }, {
    message: 'GAD-7 score must be between 0 and 21',
  });

// Severity Schemas
export const PHQ9SeveritySchema = z.enum([
  'minimal',
  'mild',
  'moderate',
  'moderately severe',
  'severe',
]);

export const GAD7SeveritySchema = z.enum([
  'minimal',
  'mild',
  'moderate',
  'severe',
]);

// ID Schemas with Template Literal Pattern Validation
export const AssessmentIDSchema = z.string()
  .regex(/^assessment_(phq9|gad7)_\d+_[a-z0-9]+$/, {
    message: 'Assessment ID must follow format: assessment_{type}_{timestamp}_{random}',
  });

export const CheckInIDSchema = z.string()
  .regex(/^checkin_(morning|midday|evening)_\d+_[a-z0-9]+$/, {
    message: 'Check-in ID must follow format: checkin_{type}_{timestamp}_{random}',
  });

// ISO Date String Schema
export const ISODateStringSchema = z.string()
  .refine((dateString) => {
    try {
      const date = new Date(dateString);
      return !isNaN(date.getTime()) && date.toISOString() === dateString;
    } catch {
      return false;
    }
  }, {
    message: 'Must be a valid ISO date string',
  });

// Assessment Context Schema
export const AssessmentContextSchema = z.enum([
  'onboarding',
  'standalone',
  'clinical',
]);

// Main Assessment Schemas - Discriminated Union
export const PHQ9AssessmentSchema = z.object({
  type: z.literal('phq9'),
  id: AssessmentIDSchema,
  answers: PHQ9AnswersSchema,
  score: PHQ9ScoreSchema,
  severity: PHQ9SeveritySchema,
  completedAt: ISODateStringSchema,
  context: AssessmentContextSchema,
  requiresCrisisIntervention: z.boolean(),
}).refine((assessment) => {
  // Validate that score matches answers
  const calculatedScore = assessment.answers.reduce((sum, answer) => sum + answer, 0 as number);
  return assessment.score === calculatedScore;
}, {
  message: 'PHQ-9 score must equal sum of answers',
  path: ['score'],
});

export const GAD7AssessmentSchema = z.object({
  type: z.literal('gad7'),
  id: AssessmentIDSchema,
  answers: GAD7AnswersSchema,
  score: GAD7ScoreSchema,
  severity: GAD7SeveritySchema,
  completedAt: ISODateStringSchema,
  context: AssessmentContextSchema,
  requiresCrisisIntervention: z.boolean(),
}).refine((assessment) => {
  // Validate that score matches answers
  const calculatedScore = assessment.answers.reduce((sum, answer) => sum + answer, 0 as number);
  return assessment.score === calculatedScore;
}, {
  message: 'GAD-7 score must equal sum of answers',
  path: ['score'],
});

// Combined Assessment Schema
export const AssessmentSchema = z.union([
  PHQ9AssessmentSchema,
  GAD7AssessmentSchema,
]);

// Crisis Detection Schema
export const CrisisDetectionSchema = z.object({
  assessmentId: AssessmentIDSchema,
  assessmentType: z.enum(['phq9', 'gad7']),
  score: z.number().int().min(0),
  hasSuicidalIdeation: z.boolean().optional(),
  triggeredBy: z.enum(['score', 'suicidal_ideation', 'both']),
  timestamp: ISODateStringSchema,
  severity: z.enum(['low', 'moderate', 'high', 'critical']),
});

// Clinical Constants Validation
export const ClinicalConstantsSchema = z.object({
  PHQ9: z.object({
    QUESTION_COUNT: z.literal(9),
    MIN_SCORE: z.literal(0),
    MAX_SCORE: z.literal(27),
    CRISIS_THRESHOLD: z.literal(20),
    SUICIDAL_IDEATION_QUESTION: z.literal(8),
    THRESHOLDS: z.object({
      MINIMAL: z.literal(4),
      MILD: z.literal(9),
      MODERATE: z.literal(14),
      MODERATELY_SEVERE: z.literal(19),
      SEVERE: z.literal(27),
    }),
  }),
  GAD7: z.object({
    QUESTION_COUNT: z.literal(7),
    MIN_SCORE: z.literal(0),
    MAX_SCORE: z.literal(21),
    CRISIS_THRESHOLD: z.literal(15),
    THRESHOLDS: z.object({
      MINIMAL: z.literal(4),
      MILD: z.literal(9),
      MODERATE: z.literal(14),
      SEVERE: z.literal(21),
    }),
  }),
  CRISIS: z.object({
    EMERGENCY_NUMBER: z.literal('988'),
    TEXT_LINE: z.literal('741741'),
    MAX_RESPONSE_TIME_MS: z.literal(200),
  }),
  TIMING: z.object({
    BREATHING_DURATION_MS: z.literal(60000),
    FRAME_TIME_MS: z.literal(16.67),
  }),
});

// Validation Functions with Detailed Error Reporting
export class ClinicalValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: z.ZodError,
    public readonly data: unknown
  ) {
    super(message);
    this.name = 'ClinicalValidationError';
  }
}

export const validatePHQ9Assessment = (data: unknown) => {
  const result = PHQ9AssessmentSchema.safeParse(data);
  if (!result.success) {
    throw new ClinicalValidationError(
      'PHQ-9 assessment validation failed',
      result.error,
      data
    );
  }
  return result.data;
};

export const validateGAD7Assessment = (data: unknown) => {
  const result = GAD7AssessmentSchema.safeParse(data);
  if (!result.success) {
    throw new ClinicalValidationError(
      'GAD-7 assessment validation failed',
      result.error,
      data
    );
  }
  return result.data;
};

export const validateAssessment = (data: unknown) => {
  const result = AssessmentSchema.safeParse(data);
  if (!result.success) {
    throw new ClinicalValidationError(
      'Assessment validation failed',
      result.error,
      data
    );
  }
  return result.data;
};

export const validatePHQ9Answers = (data: unknown) => {
  const result = PHQ9AnswersSchema.safeParse(data);
  if (!result.success) {
    throw new ClinicalValidationError(
      'PHQ-9 answers validation failed',
      result.error,
      data
    );
  }
  return result.data;
};

export const validateGAD7Answers = (data: unknown) => {
  const result = GAD7AnswersSchema.safeParse(data);
  if (!result.success) {
    throw new ClinicalValidationError(
      'GAD-7 answers validation failed',
      result.error,
      data
    );
  }
  return result.data;
};

// Crisis Validation Functions
export const validateCrisisDetection = (data: unknown) => {
  const result = CrisisDetectionSchema.safeParse(data);
  if (!result.success) {
    throw new ClinicalValidationError(
      'Crisis detection validation failed',
      result.error,
      data
    );
  }
  return result.data;
};

// Clinical Score Validation with Business Rules
export const validateScoreConsistency = (
  type: 'phq9' | 'gad7',
  answers: number[],
  score: number,
  severity: string
) => {
  // Validate answers format
  const answersSchema = type === 'phq9' ? PHQ9AnswersSchema : GAD7AnswersSchema;
  const validatedAnswers = answersSchema.parse(answers);
  
  // Validate score matches answers
  const calculatedScore = validatedAnswers.reduce((sum, answer) => sum + answer, 0 as number);
  if (score !== calculatedScore) {
    throw new ClinicalValidationError(
      `Score inconsistency: calculated ${calculatedScore}, provided ${score}`,
      new z.ZodError([{
        code: 'custom',
        message: `Score ${score} does not match calculated score ${calculatedScore}`,
        path: ['score'],
      }]),
      { type, answers, score, calculatedScore }
    );
  }
  
  // Validate severity matches score
  const severitySchema = type === 'phq9' ? PHQ9SeveritySchema : GAD7SeveritySchema;
  const validatedSeverity = severitySchema.parse(severity);
  
  let expectedSeverity: string;
  if (type === 'phq9') {
    if (score <= 4) expectedSeverity = 'minimal';
    else if (score <= 9) expectedSeverity = 'mild';
    else if (score <= 14) expectedSeverity = 'moderate';
    else if (score <= 19) expectedSeverity = 'moderately severe';
    else expectedSeverity = 'severe';
  } else {
    if (score <= 4) expectedSeverity = 'minimal';
    else if (score <= 9) expectedSeverity = 'mild';
    else if (score <= 14) expectedSeverity = 'moderate';
    else expectedSeverity = 'severe';
  }
  
  if (validatedSeverity !== expectedSeverity) {
    throw new ClinicalValidationError(
      `Severity inconsistency: expected ${expectedSeverity} for score ${score}, got ${validatedSeverity}`,
      new z.ZodError([{
        code: 'custom',
        message: `Severity ${validatedSeverity} does not match expected severity ${expectedSeverity} for score ${score}`,
        path: ['severity'],
      }]),
      { type, score, severity: validatedSeverity, expectedSeverity }
    );
  }
  
  return {
    answers: validatedAnswers,
    score,
    severity: validatedSeverity,
  };
};

// Utility function to format validation errors for clinical review
export const formatClinicalValidationError = (error: ClinicalValidationError): string => {
  const issues = error.validationErrors.issues.map(issue => {
    const path = issue.path.join('.');
    return `${path}: ${issue.message}`;
  }).join('\n  ');
  
  return `Clinical Validation Failed:\n  ${issues}\n\nData: ${JSON.stringify(error.data, null, 2)}`;
};

// Export types inferred from schemas
export type PHQ9Assessment = z.infer<typeof PHQ9AssessmentSchema>;
export type GAD7Assessment = z.infer<typeof GAD7AssessmentSchema>;
export type Assessment = z.infer<typeof AssessmentSchema>;
export type PHQ9Answers = z.infer<typeof PHQ9AnswersSchema>;
export type GAD7Answers = z.infer<typeof GAD7AnswersSchema>;
export type PHQ9Score = z.infer<typeof PHQ9ScoreSchema>;
export type GAD7Score = z.infer<typeof GAD7ScoreSchema>;
export type AssessmentID = z.infer<typeof AssessmentIDSchema>;
export type CheckInID = z.infer<typeof CheckInIDSchema>;
export type CrisisDetection = z.infer<typeof CrisisDetectionSchema>;