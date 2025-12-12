/**
 * Assessment Zod Schemas - MAINT-115 Input Validation
 * Clinical-grade input validation for PHQ-9 and GAD-7 assessments
 *
 * SAFETY CRITICAL:
 * - PHQ-9: 9 questions, 0-3 response range, 0-27 total score
 * - GAD-7: 7 questions, 0-3 response range, 0-21 total score
 * - Crisis thresholds: PHQ-9 ≥15 (support), ≥20 (intervention), GAD-7 ≥15
 * - 100% accuracy required for clinical validity
 *
 * @see validation.ts for runtime validation utilities
 * @see scoring.ts for clinical scoring configuration
 */

import { z } from 'zod';
import { PHQ9_SCORING_CONFIG, GAD7_SCORING_CONFIG } from './scoring';
import { CRISIS_THRESHOLDS } from './index';

// =============================================================================
// BASE SCHEMAS
// =============================================================================

/**
 * Assessment response value schema
 * Valid responses: 0, 1, 2, 3 (clinically validated scale)
 * - 0: Not at all
 * - 1: Several days
 * - 2: More than half the days
 * - 3: Nearly every day
 */
export const AssessmentResponseSchema = z
  .number()
  .int({ message: 'Response must be an integer' })
  .min(0, { message: 'Response cannot be less than 0' })
  .max(3, { message: 'Response cannot exceed 3' })
  .brand<'AssessmentResponse'>();

/**
 * Assessment type schema
 */
export const AssessmentTypeSchema = z.enum(['phq9', 'gad7'], {
  message: 'Assessment type must be "phq9" or "gad7"',
});

/**
 * Timestamp schema - validates reasonable timestamp range
 */
const TimestampSchema = z
  .number()
  .int({ message: 'Timestamp must be an integer' })
  .positive({ message: 'Timestamp must be positive' })
  .refine(
    (val) => {
      const now = Date.now();
      const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
      const oneHourFromNow = now + 60 * 60 * 1000;
      return val >= oneYearAgo && val <= oneHourFromNow;
    },
    { message: 'Timestamp must be within reasonable range (past year to near future)' }
  );

// =============================================================================
// PHQ-9 SCHEMAS
// =============================================================================

/**
 * PHQ-9 Question ID schema
 * Format: phq9_1 through phq9_9
 */
export const PHQ9QuestionIdSchema = z
  .string()
  .regex(/^phq9_[1-9]$/, {
    message: 'PHQ-9 question ID must be in format "phq9_1" through "phq9_9"',
  })
  .brand<'PHQ9QuestionId'>();

/**
 * PHQ-9 Answer schema
 * Single answer to a PHQ-9 question
 */
export const PHQ9AnswerSchema = z.object({
  questionId: PHQ9QuestionIdSchema,
  response: AssessmentResponseSchema,
  timestamp: TimestampSchema,
});

/**
 * PHQ-9 Answers array schema
 * Must have exactly 9 answers with unique question IDs
 */
export const PHQ9AnswersSchema = z
  .array(PHQ9AnswerSchema)
  .length(PHQ9_SCORING_CONFIG.questionCount, {
    message: `PHQ-9 requires exactly ${PHQ9_SCORING_CONFIG.questionCount} answers`,
  })
  .refine(
    (answers) => {
      const questionIds = answers.map((a) => a.questionId);
      const uniqueIds = new Set(questionIds);
      return uniqueIds.size === PHQ9_SCORING_CONFIG.questionCount;
    },
    { message: 'PHQ-9 answers must have 9 unique question IDs (phq9_1 through phq9_9)' }
  )
  .refine(
    (answers) => {
      // Ensure all 9 questions are represented
      const requiredIds = Array.from({ length: 9 }, (_, i) => `phq9_${i + 1}`);
      const answerIds = new Set(answers.map((a) => a.questionId as string));
      return requiredIds.every((id) => answerIds.has(id));
    },
    { message: 'PHQ-9 must include answers for all questions (phq9_1 through phq9_9)' }
  );

/**
 * PHQ-9 Severity schema
 */
export const PHQ9SeveritySchema = z.enum(
  ['minimal', 'mild', 'moderate', 'moderately_severe', 'severe'],
  {
    message: 'PHQ-9 severity must be one of: minimal, mild, moderate, moderately_severe, severe',
  }
);

/**
 * PHQ-9 Total Score schema
 * Range: 0-27 (9 questions × 0-3 response each)
 */
export const PHQ9TotalScoreSchema = z
  .number()
  .int({ message: 'PHQ-9 score must be an integer' })
  .min(PHQ9_SCORING_CONFIG.minScore, {
    message: `PHQ-9 score cannot be less than ${PHQ9_SCORING_CONFIG.minScore}`,
  })
  .max(PHQ9_SCORING_CONFIG.maxScore, {
    message: `PHQ-9 score cannot exceed ${PHQ9_SCORING_CONFIG.maxScore}`,
  })
  .brand<'PHQ9TotalScore'>();

/**
 * PHQ-9 Result schema
 * Complete result with clinical validation
 */
export const PHQ9ResultSchema = z
  .object({
    totalScore: PHQ9TotalScoreSchema,
    severity: PHQ9SeveritySchema,
    isCrisis: z.boolean(),
    suicidalIdeation: z.boolean(),
    completedAt: TimestampSchema,
    answers: PHQ9AnswersSchema,
  })
  .refine(
    (result) => {
      // Validate severity matches score
      const { totalScore, severity } = result;
      if (totalScore >= 20) return severity === 'severe';
      if (totalScore >= 15) return severity === 'moderately_severe';
      if (totalScore >= 10) return severity === 'moderate';
      if (totalScore >= 5) return severity === 'mild';
      return severity === 'minimal';
    },
    { message: 'PHQ-9 severity does not match score (clinical accuracy violation)' }
  )
  .refine(
    (result) => {
      // Validate suicidal ideation detection
      const q9Answer = result.answers.find((a) => a.questionId === 'phq9_9');
      const expectedSuicidal = q9Answer ? q9Answer.response > 0 : false;
      return result.suicidalIdeation === expectedSuicidal;
    },
    { message: 'Suicidal ideation flag does not match Question 9 response (CRITICAL)' }
  )
  .refine(
    (result) => {
      // Validate crisis detection
      const expectedCrisis =
        result.totalScore >= CRISIS_THRESHOLDS.PHQ9_CRISIS_SCORE || result.suicidalIdeation;
      return result.isCrisis === expectedCrisis;
    },
    { message: 'Crisis flag does not match score threshold or suicidal ideation (CRITICAL)' }
  )
  .refine(
    (result) => {
      // Validate score matches sum of answers
      const calculatedScore = result.answers.reduce((sum, a) => sum + a.response, 0);
      return result.totalScore === calculatedScore;
    },
    { message: 'PHQ-9 total score does not match sum of answers (100% accuracy required)' }
  );

// =============================================================================
// GAD-7 SCHEMAS
// =============================================================================

/**
 * GAD-7 Question ID schema
 * Format: gad7_1 through gad7_7
 */
export const GAD7QuestionIdSchema = z
  .string()
  .regex(/^gad7_[1-7]$/, {
    message: 'GAD-7 question ID must be in format "gad7_1" through "gad7_7"',
  })
  .brand<'GAD7QuestionId'>();

/**
 * GAD-7 Answer schema
 * Single answer to a GAD-7 question
 */
export const GAD7AnswerSchema = z.object({
  questionId: GAD7QuestionIdSchema,
  response: AssessmentResponseSchema,
  timestamp: TimestampSchema,
});

/**
 * GAD-7 Answers array schema
 * Must have exactly 7 answers with unique question IDs
 */
export const GAD7AnswersSchema = z
  .array(GAD7AnswerSchema)
  .length(GAD7_SCORING_CONFIG.questionCount, {
    message: `GAD-7 requires exactly ${GAD7_SCORING_CONFIG.questionCount} answers`,
  })
  .refine(
    (answers) => {
      const questionIds = answers.map((a) => a.questionId);
      const uniqueIds = new Set(questionIds);
      return uniqueIds.size === GAD7_SCORING_CONFIG.questionCount;
    },
    { message: 'GAD-7 answers must have 7 unique question IDs (gad7_1 through gad7_7)' }
  )
  .refine(
    (answers) => {
      // Ensure all 7 questions are represented
      const requiredIds = Array.from({ length: 7 }, (_, i) => `gad7_${i + 1}`);
      const answerIds = new Set(answers.map((a) => a.questionId as string));
      return requiredIds.every((id) => answerIds.has(id));
    },
    { message: 'GAD-7 must include answers for all questions (gad7_1 through gad7_7)' }
  );

/**
 * GAD-7 Severity schema
 */
export const GAD7SeveritySchema = z.enum(['minimal', 'mild', 'moderate', 'severe'], {
  message: 'GAD-7 severity must be one of: minimal, mild, moderate, severe',
});

/**
 * GAD-7 Total Score schema
 * Range: 0-21 (7 questions × 0-3 response each)
 */
export const GAD7TotalScoreSchema = z
  .number()
  .int({ message: 'GAD-7 score must be an integer' })
  .min(GAD7_SCORING_CONFIG.minScore, {
    message: `GAD-7 score cannot be less than ${GAD7_SCORING_CONFIG.minScore}`,
  })
  .max(GAD7_SCORING_CONFIG.maxScore, {
    message: `GAD-7 score cannot exceed ${GAD7_SCORING_CONFIG.maxScore}`,
  })
  .brand<'GAD7TotalScore'>();

/**
 * GAD-7 Result schema
 * Complete result with clinical validation
 */
export const GAD7ResultSchema = z
  .object({
    totalScore: GAD7TotalScoreSchema,
    severity: GAD7SeveritySchema,
    isCrisis: z.boolean(),
    completedAt: TimestampSchema,
    answers: GAD7AnswersSchema,
  })
  .refine(
    (result) => {
      // Validate severity matches score
      const { totalScore, severity } = result;
      if (totalScore >= 15) return severity === 'severe';
      if (totalScore >= 10) return severity === 'moderate';
      if (totalScore >= 5) return severity === 'mild';
      return severity === 'minimal';
    },
    { message: 'GAD-7 severity does not match score (clinical accuracy violation)' }
  )
  .refine(
    (result) => {
      // Validate crisis detection
      const expectedCrisis = result.totalScore >= CRISIS_THRESHOLDS.GAD7_CRISIS_SCORE;
      return result.isCrisis === expectedCrisis;
    },
    { message: 'Crisis flag does not match score threshold (CRITICAL)' }
  )
  .refine(
    (result) => {
      // Validate score matches sum of answers
      const calculatedScore = result.answers.reduce((sum, a) => sum + a.response, 0);
      return result.totalScore === calculatedScore;
    },
    { message: 'GAD-7 total score does not match sum of answers (100% accuracy required)' }
  );

// =============================================================================
// FORM SUBMISSION SCHEMAS
// =============================================================================

/**
 * PHQ-9 Form Submission schema
 * For validating raw form input before processing
 */
export const PHQ9FormSubmissionSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string(),
        response: z.union([z.number(), z.string()]),
        timestamp: z.number().optional(),
      })
    )
    .length(9, { message: 'PHQ-9 requires exactly 9 answers' })
    .transform((answers) =>
      answers.map((a) => ({
        questionId: a.questionId,
        response: typeof a.response === 'string' ? parseInt(a.response, 10) : a.response,
        timestamp: a.timestamp ?? Date.now(),
      }))
    ),
  context: z.enum(['standalone', 'onboarding', 'checkin']).optional().default('standalone'),
});

/**
 * GAD-7 Form Submission schema
 * For validating raw form input before processing
 */
export const GAD7FormSubmissionSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string(),
        response: z.union([z.number(), z.string()]),
        timestamp: z.number().optional(),
      })
    )
    .length(7, { message: 'GAD-7 requires exactly 7 answers' })
    .transform((answers) =>
      answers.map((a) => ({
        questionId: a.questionId,
        response: typeof a.response === 'string' ? parseInt(a.response, 10) : a.response,
        timestamp: a.timestamp ?? Date.now(),
      }))
    ),
  context: z.enum(['standalone', 'onboarding', 'checkin']).optional().default('standalone'),
});

// =============================================================================
// VALIDATION UTILITY FUNCTIONS
// =============================================================================

/**
 * User-friendly error message formatter
 */
export function formatValidationError(error: z.ZodError): string {
  const messages = error.issues.map((e) => {
    const path = e.path.length > 0 ? `${e.path.join('.')}: ` : '';
    return `${path}${e.message}`;
  });
  return messages.join('; ');
}

/**
 * Validate PHQ-9 answers with user-friendly error
 */
export function validatePHQ9Answers(
  answers: unknown
): { success: true; data: z.infer<typeof PHQ9AnswersSchema> } | { success: false; error: string } {
  const result = PHQ9AnswersSchema.safeParse(answers);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: formatValidationError(result.error) };
}

/**
 * Validate GAD-7 answers with user-friendly error
 */
export function validateGAD7Answers(
  answers: unknown
): { success: true; data: z.infer<typeof GAD7AnswersSchema> } | { success: false; error: string } {
  const result = GAD7AnswersSchema.safeParse(answers);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: formatValidationError(result.error) };
}

/**
 * Validate PHQ-9 result with user-friendly error
 */
export function validatePHQ9ResultWithZod(
  result: unknown
): { success: true; data: z.infer<typeof PHQ9ResultSchema> } | { success: false; error: string } {
  const parseResult = PHQ9ResultSchema.safeParse(result);
  if (parseResult.success) {
    return { success: true, data: parseResult.data };
  }
  return { success: false, error: formatValidationError(parseResult.error) };
}

/**
 * Validate GAD-7 result with user-friendly error
 */
export function validateGAD7ResultWithZod(
  result: unknown
): { success: true; data: z.infer<typeof GAD7ResultSchema> } | { success: false; error: string } {
  const parseResult = GAD7ResultSchema.safeParse(result);
  if (parseResult.success) {
    return { success: true, data: parseResult.data };
  }
  return { success: false, error: formatValidationError(parseResult.error) };
}

/**
 * Validate single assessment response
 */
export function validateSingleResponse(
  response: unknown
): { success: true; data: number } | { success: false; error: string } {
  const result = AssessmentResponseSchema.safeParse(response);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: formatValidationError(result.error) };
}

/**
 * Validate form submission before processing
 */
export function validateFormSubmission(
  submission: unknown,
  assessmentType: 'phq9' | 'gad7'
): { success: true; data: { answers: Array<{ questionId: string; response: number; timestamp: number }>; context: string } } | { success: false; error: string } {
  const schema = assessmentType === 'phq9' ? PHQ9FormSubmissionSchema : GAD7FormSubmissionSchema;
  const result = schema.safeParse(submission);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: formatValidationError(result.error) };
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type PHQ9Answer = z.infer<typeof PHQ9AnswerSchema>;
export type PHQ9Answers = z.infer<typeof PHQ9AnswersSchema>;
export type PHQ9Result = z.infer<typeof PHQ9ResultSchema>;
export type GAD7Answer = z.infer<typeof GAD7AnswerSchema>;
export type GAD7Answers = z.infer<typeof GAD7AnswersSchema>;
export type GAD7Result = z.infer<typeof GAD7ResultSchema>;
export type AssessmentResponseValue = z.infer<typeof AssessmentResponseSchema>;
export type PHQ9FormSubmission = z.infer<typeof PHQ9FormSubmissionSchema>;
export type GAD7FormSubmission = z.infer<typeof GAD7FormSubmissionSchema>;
