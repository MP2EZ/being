/**
 * Zod Schema Tests - MAINT-115 Input Validation
 * 100% test coverage for PHQ-9 and GAD-7 assessment validation
 *
 * Test Categories:
 * 1. Valid input - happy path scenarios
 * 2. Invalid input - edge cases (null, undefined, out-of-range, non-numeric)
 * 3. Crisis threshold validation
 * 4. Clinical accuracy validation
 * 5. Security - malicious input rejection
 */

import {
  AssessmentResponseSchema,
  AssessmentTypeSchema,
  PHQ9QuestionIdSchema,
  PHQ9AnswerSchema,
  PHQ9AnswersSchema,
  PHQ9ResultSchema,
  PHQ9TotalScoreSchema,
  PHQ9SeveritySchema,
  GAD7QuestionIdSchema,
  GAD7AnswerSchema,
  GAD7AnswersSchema,
  GAD7ResultSchema,
  GAD7TotalScoreSchema,
  GAD7SeveritySchema,
  PHQ9FormSubmissionSchema,
  GAD7FormSubmissionSchema,
  validatePHQ9Answers,
  validateGAD7Answers,
  validatePHQ9ResultWithZod,
  validateGAD7ResultWithZod,
  validateSingleResponse,
  validateFormSubmission,
  formatValidationError,
} from '../schemas';
import { z } from 'zod';

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Generate valid PHQ-9 answers array
 */
function generatePHQ9Answers(responses: number[] = [0, 1, 2, 3, 0, 1, 2, 3, 0]): Array<{
  questionId: string;
  response: number;
  timestamp: number;
}> {
  return responses.map((response, index) => ({
    questionId: `phq9_${index + 1}`,
    response,
    timestamp: Date.now(),
  }));
}

/**
 * Generate valid GAD-7 answers array
 */
function generateGAD7Answers(responses: number[] = [0, 1, 2, 3, 0, 1, 2]): Array<{
  questionId: string;
  response: number;
  timestamp: number;
}> {
  return responses.map((response, index) => ({
    questionId: `gad7_${index + 1}`,
    response,
    timestamp: Date.now(),
  }));
}

/**
 * Calculate severity from PHQ-9 score
 */
function calculatePHQ9Severity(
  score: number
): 'minimal' | 'mild' | 'moderate' | 'moderately_severe' | 'severe' {
  if (score >= 20) return 'severe';
  if (score >= 15) return 'moderately_severe';
  if (score >= 10) return 'moderate';
  if (score >= 5) return 'mild';
  return 'minimal';
}

/**
 * Calculate severity from GAD-7 score
 */
function calculateGAD7Severity(score: number): 'minimal' | 'mild' | 'moderate' | 'severe' {
  if (score >= 15) return 'severe';
  if (score >= 10) return 'moderate';
  if (score >= 5) return 'mild';
  return 'minimal';
}

// =============================================================================
// ASSESSMENT RESPONSE TESTS
// =============================================================================

describe('AssessmentResponseSchema', () => {
  describe('valid inputs', () => {
    it.each([0, 1, 2, 3])('should accept valid response %d', (response) => {
      const result = AssessmentResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(response);
      }
    });
  });

  describe('invalid inputs - out of range', () => {
    it.each([-1, -100, 4, 5, 10, 100, 999])('should reject out-of-range value %d', (response) => {
      const result = AssessmentResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });
  });

  describe('invalid inputs - non-numeric', () => {
    it('should reject null', () => {
      const result = AssessmentResponseSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it('should reject undefined', () => {
      const result = AssessmentResponseSchema.safeParse(undefined);
      expect(result.success).toBe(false);
    });

    it('should reject string numbers', () => {
      const result = AssessmentResponseSchema.safeParse('1');
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = AssessmentResponseSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should reject boolean', () => {
      const result = AssessmentResponseSchema.safeParse(true);
      expect(result.success).toBe(false);
    });

    it('should reject object', () => {
      const result = AssessmentResponseSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject array', () => {
      const result = AssessmentResponseSchema.safeParse([1]);
      expect(result.success).toBe(false);
    });

    it('should reject NaN', () => {
      const result = AssessmentResponseSchema.safeParse(NaN);
      expect(result.success).toBe(false);
    });

    it('should reject Infinity', () => {
      const result = AssessmentResponseSchema.safeParse(Infinity);
      expect(result.success).toBe(false);
    });

    it('should reject float values', () => {
      const result = AssessmentResponseSchema.safeParse(1.5);
      expect(result.success).toBe(false);
    });
  });

  describe('security - malicious input', () => {
    it('should reject SQL injection attempt', () => {
      const result = AssessmentResponseSchema.safeParse("1; DROP TABLE users;");
      expect(result.success).toBe(false);
    });

    it('should reject script injection', () => {
      const result = AssessmentResponseSchema.safeParse('<script>alert("xss")</script>');
      expect(result.success).toBe(false);
    });

    it('should reject object prototype pollution attempt', () => {
      const result = AssessmentResponseSchema.safeParse({ __proto__: { admin: true } });
      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// ASSESSMENT TYPE TESTS
// =============================================================================

describe('AssessmentTypeSchema', () => {
  it('should accept "phq9"', () => {
    const result = AssessmentTypeSchema.safeParse('phq9');
    expect(result.success).toBe(true);
  });

  it('should accept "gad7"', () => {
    const result = AssessmentTypeSchema.safeParse('gad7');
    expect(result.success).toBe(true);
  });

  it.each(['PHQ9', 'GAD7', 'phq-9', 'gad-7', 'invalid', '', null, undefined, 1])(
    'should reject invalid type: %s',
    (type) => {
      const result = AssessmentTypeSchema.safeParse(type);
      expect(result.success).toBe(false);
    }
  );
});

// =============================================================================
// PHQ-9 QUESTION ID TESTS
// =============================================================================

describe('PHQ9QuestionIdSchema', () => {
  describe('valid IDs', () => {
    it.each(['phq9_1', 'phq9_2', 'phq9_3', 'phq9_4', 'phq9_5', 'phq9_6', 'phq9_7', 'phq9_8', 'phq9_9'])(
      'should accept valid ID: %s',
      (id) => {
        const result = PHQ9QuestionIdSchema.safeParse(id);
        expect(result.success).toBe(true);
      }
    );
  });

  describe('invalid IDs', () => {
    it.each([
      'phq9_0', // 0 is not valid
      'phq9_10', // 10 is not valid
      'phq9_', // missing number
      'phq9', // missing underscore and number
      'PHQ9_1', // wrong case
      'gad7_1', // wrong assessment type
      'phq9_1a', // extra characters
      '', // empty
      null,
      undefined,
    ])('should reject invalid ID: %s', (id) => {
      const result = PHQ9QuestionIdSchema.safeParse(id);
      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// PHQ-9 ANSWERS ARRAY TESTS
// =============================================================================

describe('PHQ9AnswersSchema', () => {
  describe('valid answers', () => {
    it('should accept valid 9-answer array with all zeros', () => {
      const answers = generatePHQ9Answers([0, 0, 0, 0, 0, 0, 0, 0, 0]);
      const result = PHQ9AnswersSchema.safeParse(answers);
      expect(result.success).toBe(true);
    });

    it('should accept valid 9-answer array with all threes', () => {
      const answers = generatePHQ9Answers([3, 3, 3, 3, 3, 3, 3, 3, 3]);
      const result = PHQ9AnswersSchema.safeParse(answers);
      expect(result.success).toBe(true);
    });

    it('should accept valid mixed responses', () => {
      const answers = generatePHQ9Answers([0, 1, 2, 3, 0, 1, 2, 3, 0]);
      const result = PHQ9AnswersSchema.safeParse(answers);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid answers - wrong count', () => {
    it('should reject 8 answers (too few)', () => {
      const answers = generatePHQ9Answers([0, 1, 2, 3, 0, 1, 2, 3]).slice(0, 8);
      const result = PHQ9AnswersSchema.safeParse(answers);
      expect(result.success).toBe(false);
    });

    it('should reject 10 answers (too many)', () => {
      const answers = [...generatePHQ9Answers(), { questionId: 'phq9_10', response: 0, timestamp: Date.now() }];
      const result = PHQ9AnswersSchema.safeParse(answers);
      expect(result.success).toBe(false);
    });

    it('should reject empty array', () => {
      const result = PHQ9AnswersSchema.safeParse([]);
      expect(result.success).toBe(false);
    });
  });

  describe('invalid answers - duplicate question IDs', () => {
    it('should reject duplicate question IDs', () => {
      const answers = [
        { questionId: 'phq9_1', response: 0, timestamp: Date.now() },
        { questionId: 'phq9_1', response: 1, timestamp: Date.now() }, // duplicate
        { questionId: 'phq9_3', response: 2, timestamp: Date.now() },
        { questionId: 'phq9_4', response: 3, timestamp: Date.now() },
        { questionId: 'phq9_5', response: 0, timestamp: Date.now() },
        { questionId: 'phq9_6', response: 1, timestamp: Date.now() },
        { questionId: 'phq9_7', response: 2, timestamp: Date.now() },
        { questionId: 'phq9_8', response: 3, timestamp: Date.now() },
        { questionId: 'phq9_9', response: 0, timestamp: Date.now() },
      ];
      const result = PHQ9AnswersSchema.safeParse(answers);
      expect(result.success).toBe(false);
    });
  });

  describe('invalid answers - missing questions', () => {
    it('should reject if question phq9_5 is missing', () => {
      const answers = [
        { questionId: 'phq9_1', response: 0, timestamp: Date.now() },
        { questionId: 'phq9_2', response: 1, timestamp: Date.now() },
        { questionId: 'phq9_3', response: 2, timestamp: Date.now() },
        { questionId: 'phq9_4', response: 3, timestamp: Date.now() },
        { questionId: 'phq9_10', response: 0, timestamp: Date.now() }, // invalid - should be phq9_5
        { questionId: 'phq9_6', response: 1, timestamp: Date.now() },
        { questionId: 'phq9_7', response: 2, timestamp: Date.now() },
        { questionId: 'phq9_8', response: 3, timestamp: Date.now() },
        { questionId: 'phq9_9', response: 0, timestamp: Date.now() },
      ];
      const result = PHQ9AnswersSchema.safeParse(answers);
      expect(result.success).toBe(false);
    });
  });

  describe('invalid answers - wrong response values', () => {
    it('should reject response value of 4', () => {
      const answers = generatePHQ9Answers([0, 1, 2, 4, 0, 1, 2, 3, 0]); // 4 is invalid
      const result = PHQ9AnswersSchema.safeParse(answers);
      expect(result.success).toBe(false);
    });

    it('should reject negative response value', () => {
      const answers = generatePHQ9Answers([0, 1, -1, 3, 0, 1, 2, 3, 0]); // -1 is invalid
      const result = PHQ9AnswersSchema.safeParse(answers);
      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// PHQ-9 RESULT TESTS
// =============================================================================

describe('PHQ9ResultSchema', () => {
  describe('valid results', () => {
    it('should accept minimal severity result (score 0-4)', () => {
      const answers = generatePHQ9Answers([0, 0, 0, 0, 0, 0, 0, 0, 0]);
      const result = {
        totalScore: 0,
        severity: 'minimal',
        isCrisis: false,
        suicidalIdeation: false,
        completedAt: Date.now(),
        answers,
      };
      const parseResult = PHQ9ResultSchema.safeParse(result);
      expect(parseResult.success).toBe(true);
    });

    it('should accept mild severity result (score 5-9)', () => {
      const answers = generatePHQ9Answers([1, 1, 1, 1, 1, 0, 0, 0, 0]);
      const result = {
        totalScore: 5,
        severity: 'mild',
        isCrisis: false,
        suicidalIdeation: false,
        completedAt: Date.now(),
        answers,
      };
      const parseResult = PHQ9ResultSchema.safeParse(result);
      expect(parseResult.success).toBe(true);
    });

    it('should accept moderate severity result (score 10-14)', () => {
      // Sum: 2+2+2+2+2+0+0+0+0 = 10, Q9=0 no suicidal ideation
      const answers = generatePHQ9Answers([2, 2, 2, 2, 2, 0, 0, 0, 0]);
      const result = {
        totalScore: 10,
        severity: 'moderate',
        isCrisis: false, // Score < 15 and no suicidal ideation
        suicidalIdeation: false, // Q9 = 0
        completedAt: Date.now(),
        answers,
      };
      const parseResult = PHQ9ResultSchema.safeParse(result);
      expect(parseResult.success).toBe(true);
    });

    it('should accept moderately_severe result (score 15-19) with crisis flag', () => {
      // Sum: 2+2+2+2+2+2+1+1+1 = 15, Q9=1 triggers suicidal ideation
      const answers = generatePHQ9Answers([2, 2, 2, 2, 2, 2, 1, 1, 1]);
      const result = {
        totalScore: 15,
        severity: 'moderately_severe',
        isCrisis: true, // PHQ >= 15 triggers crisis (also Q9>0)
        suicidalIdeation: true, // Q9 = 1 > 0
        completedAt: Date.now(),
        answers,
      };
      const parseResult = PHQ9ResultSchema.safeParse(result);
      expect(parseResult.success).toBe(true);
    });

    it('should accept severe result (score 20-27) with crisis flag', () => {
      // Sum: 3+3+3+3+3+3+2+0+0 = 20, Q9=0 no suicidal ideation
      const answers = generatePHQ9Answers([3, 3, 3, 3, 3, 3, 2, 0, 0]);
      const result = {
        totalScore: 20,
        severity: 'severe',
        isCrisis: true, // PHQ >= 20 triggers crisis
        suicidalIdeation: false, // Q9 = 0
        completedAt: Date.now(),
        answers,
      };
      const parseResult = PHQ9ResultSchema.safeParse(result);
      expect(parseResult.success).toBe(true);
    });
  });

  describe('crisis threshold validation', () => {
    it('should require crisis flag true when score >= 15', () => {
      const answers = generatePHQ9Answers([2, 2, 2, 2, 2, 2, 1, 1, 0]);
      const result = {
        totalScore: 15,
        severity: 'moderately_severe',
        isCrisis: false, // WRONG - should be true
        suicidalIdeation: false,
        completedAt: Date.now(),
        answers,
      };
      const parseResult = PHQ9ResultSchema.safeParse(result);
      expect(parseResult.success).toBe(false);
      if (!parseResult.success) {
        expect(parseResult.error.message).toContain('Crisis flag');
      }
    });

    it('should require crisis flag true when score >= 20', () => {
      const answers = generatePHQ9Answers([3, 3, 3, 3, 3, 2, 2, 1, 0]);
      const result = {
        totalScore: 20,
        severity: 'severe',
        isCrisis: false, // WRONG - should be true
        suicidalIdeation: false,
        completedAt: Date.now(),
        answers,
      };
      const parseResult = PHQ9ResultSchema.safeParse(result);
      expect(parseResult.success).toBe(false);
    });

    it('should require crisis flag false when score < 15 and no suicidal ideation', () => {
      const answers = generatePHQ9Answers([1, 1, 1, 1, 1, 0, 0, 0, 0]);
      const result = {
        totalScore: 5,
        severity: 'mild',
        isCrisis: true, // WRONG - should be false
        suicidalIdeation: false,
        completedAt: Date.now(),
        answers,
      };
      const parseResult = PHQ9ResultSchema.safeParse(result);
      expect(parseResult.success).toBe(false);
    });
  });

  describe('suicidal ideation validation (Question 9 - CRITICAL)', () => {
    it('should require suicidalIdeation true when Q9 response > 0', () => {
      const answers = generatePHQ9Answers([0, 0, 0, 0, 0, 0, 0, 0, 1]); // Q9 = 1
      const result = {
        totalScore: 1,
        severity: 'minimal',
        isCrisis: true, // Must be true when suicidalIdeation is true
        suicidalIdeation: false, // WRONG - should be true
        completedAt: Date.now(),
        answers,
      };
      const parseResult = PHQ9ResultSchema.safeParse(result);
      expect(parseResult.success).toBe(false);
      if (!parseResult.success) {
        expect(parseResult.error.message).toContain('Question 9');
      }
    });

    it('should require crisis flag true when suicidalIdeation is true (regardless of score)', () => {
      const answers = generatePHQ9Answers([0, 0, 0, 0, 0, 0, 0, 0, 1]); // Q9 = 1, total = 1
      const result = {
        totalScore: 1,
        severity: 'minimal',
        isCrisis: false, // WRONG - suicidalIdeation triggers crisis
        suicidalIdeation: true,
        completedAt: Date.now(),
        answers,
      };
      const parseResult = PHQ9ResultSchema.safeParse(result);
      expect(parseResult.success).toBe(false);
    });

    it('should accept crisis flag true when suicidalIdeation is true with low score', () => {
      const answers = generatePHQ9Answers([0, 0, 0, 0, 0, 0, 0, 0, 1]); // Q9 = 1, total = 1
      const result = {
        totalScore: 1,
        severity: 'minimal',
        isCrisis: true, // Correct - suicidalIdeation triggers crisis
        suicidalIdeation: true,
        completedAt: Date.now(),
        answers,
      };
      const parseResult = PHQ9ResultSchema.safeParse(result);
      expect(parseResult.success).toBe(true);
    });
  });

  describe('severity validation', () => {
    it('should reject mismatched severity (score 5 with minimal)', () => {
      const answers = generatePHQ9Answers([1, 1, 1, 1, 1, 0, 0, 0, 0]);
      const result = {
        totalScore: 5,
        severity: 'minimal', // WRONG - should be mild
        isCrisis: false,
        suicidalIdeation: false,
        completedAt: Date.now(),
        answers,
      };
      const parseResult = PHQ9ResultSchema.safeParse(result);
      expect(parseResult.success).toBe(false);
      if (!parseResult.success) {
        expect(parseResult.error.message).toContain('severity');
      }
    });
  });

  describe('score calculation validation', () => {
    it('should reject if totalScore does not match sum of answers', () => {
      const answers = generatePHQ9Answers([0, 0, 0, 0, 0, 0, 0, 0, 0]); // sum = 0
      const result = {
        totalScore: 5, // WRONG - should be 0
        severity: 'minimal',
        isCrisis: false,
        suicidalIdeation: false,
        completedAt: Date.now(),
        answers,
      };
      const parseResult = PHQ9ResultSchema.safeParse(result);
      expect(parseResult.success).toBe(false);
      if (!parseResult.success) {
        expect(parseResult.error.message).toContain('sum of answers');
      }
    });
  });
});

// =============================================================================
// PHQ-9 SCORE TESTS (ALL 27 COMBINATIONS)
// =============================================================================

describe('PHQ-9 Score Range Validation (0-27)', () => {
  // Test boundary scores for each severity level
  const scoreSeverityPairs: Array<[number, string, boolean]> = [
    // [score, expectedSeverity, expectedCrisis]
    [0, 'minimal', false],
    [4, 'minimal', false],
    [5, 'mild', false],
    [9, 'mild', false],
    [10, 'moderate', false],
    [14, 'moderate', false],
    [15, 'moderately_severe', true], // Crisis threshold
    [19, 'moderately_severe', true],
    [20, 'severe', true],
    [27, 'severe', true],
  ];

  it.each(scoreSeverityPairs)(
    'score %d should have severity %s and crisis=%s',
    (score, expectedSeverity, expectedCrisis) => {
      // Generate answers that sum to target score
      // IMPORTANT: Distribute score to avoid Q9 triggering suicidal ideation unless necessary
      const responses: number[] = new Array(9).fill(0);
      let remaining = score;

      // Fill questions 1-8 first (indices 0-7) to avoid triggering Q9 suicidal ideation
      for (let i = 0; i < 8 && remaining > 0; i++) {
        const val = Math.min(3, remaining);
        responses[i] = val;
        remaining -= val;
      }
      // If there's still remaining score, it must go to Q9
      if (remaining > 0) {
        responses[8] = remaining;
      }

      const answers = generatePHQ9Answers(responses);

      // Check if Q9 response triggers suicidal ideation
      const q9Response = responses[8];
      const suicidalIdeation = q9Response > 0;

      // Crisis is triggered by score >= 15 OR suicidal ideation
      const actualCrisis = score >= 15 || suicidalIdeation;

      const result = {
        totalScore: score,
        severity: expectedSeverity,
        isCrisis: actualCrisis,
        suicidalIdeation,
        completedAt: Date.now(),
        answers,
      };

      const parseResult = PHQ9ResultSchema.safeParse(result);
      expect(parseResult.success).toBe(true);
    }
  );

  it('should reject score below minimum (negative)', () => {
    const result = PHQ9TotalScoreSchema.safeParse(-1);
    expect(result.success).toBe(false);
  });

  it('should reject score above maximum (28)', () => {
    const result = PHQ9TotalScoreSchema.safeParse(28);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// GAD-7 QUESTION ID TESTS
// =============================================================================

describe('GAD7QuestionIdSchema', () => {
  describe('valid IDs', () => {
    it.each(['gad7_1', 'gad7_2', 'gad7_3', 'gad7_4', 'gad7_5', 'gad7_6', 'gad7_7'])(
      'should accept valid ID: %s',
      (id) => {
        const result = GAD7QuestionIdSchema.safeParse(id);
        expect(result.success).toBe(true);
      }
    );
  });

  describe('invalid IDs', () => {
    it.each([
      'gad7_0', // 0 is not valid
      'gad7_8', // 8 is not valid (only 7 questions)
      'gad7_', // missing number
      'gad7', // missing underscore and number
      'GAD7_1', // wrong case
      'phq9_1', // wrong assessment type
    ])('should reject invalid ID: %s', (id) => {
      const result = GAD7QuestionIdSchema.safeParse(id);
      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// GAD-7 ANSWERS ARRAY TESTS
// =============================================================================

describe('GAD7AnswersSchema', () => {
  describe('valid answers', () => {
    it('should accept valid 7-answer array with all zeros', () => {
      const answers = generateGAD7Answers([0, 0, 0, 0, 0, 0, 0]);
      const result = GAD7AnswersSchema.safeParse(answers);
      expect(result.success).toBe(true);
    });

    it('should accept valid 7-answer array with all threes', () => {
      const answers = generateGAD7Answers([3, 3, 3, 3, 3, 3, 3]);
      const result = GAD7AnswersSchema.safeParse(answers);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid answers', () => {
    it('should reject 6 answers (too few)', () => {
      const answers = generateGAD7Answers([0, 1, 2, 3, 0, 1]).slice(0, 6);
      const result = GAD7AnswersSchema.safeParse(answers);
      expect(result.success).toBe(false);
    });

    it('should reject 8 answers (too many)', () => {
      const answers = [...generateGAD7Answers(), { questionId: 'gad7_8', response: 0, timestamp: Date.now() }];
      const result = GAD7AnswersSchema.safeParse(answers);
      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// GAD-7 RESULT TESTS
// =============================================================================

describe('GAD7ResultSchema', () => {
  describe('valid results', () => {
    it('should accept minimal severity result (score 0-4)', () => {
      const answers = generateGAD7Answers([0, 0, 0, 0, 0, 0, 0]);
      const result = {
        totalScore: 0,
        severity: 'minimal',
        isCrisis: false,
        completedAt: Date.now(),
        answers,
      };
      const parseResult = GAD7ResultSchema.safeParse(result);
      expect(parseResult.success).toBe(true);
    });

    it('should accept severe result (score >= 15) with crisis flag', () => {
      const answers = generateGAD7Answers([3, 3, 3, 3, 3, 0, 0]);
      const result = {
        totalScore: 15,
        severity: 'severe',
        isCrisis: true, // GAD >= 15 triggers crisis
        completedAt: Date.now(),
        answers,
      };
      const parseResult = GAD7ResultSchema.safeParse(result);
      expect(parseResult.success).toBe(true);
    });
  });

  describe('crisis threshold validation', () => {
    it('should require crisis flag true when score >= 15', () => {
      const answers = generateGAD7Answers([3, 3, 3, 3, 3, 0, 0]);
      const result = {
        totalScore: 15,
        severity: 'severe',
        isCrisis: false, // WRONG - should be true
        completedAt: Date.now(),
        answers,
      };
      const parseResult = GAD7ResultSchema.safeParse(result);
      expect(parseResult.success).toBe(false);
    });

    it('should require crisis flag false when score < 15', () => {
      const answers = generateGAD7Answers([2, 2, 2, 2, 2, 2, 2]);
      const result = {
        totalScore: 14,
        severity: 'moderate',
        isCrisis: true, // WRONG - should be false
        completedAt: Date.now(),
        answers,
      };
      const parseResult = GAD7ResultSchema.safeParse(result);
      expect(parseResult.success).toBe(false);
    });
  });
});

// =============================================================================
// GAD-7 SCORE TESTS (ALL 21 COMBINATIONS)
// =============================================================================

describe('GAD-7 Score Range Validation (0-21)', () => {
  const scoreSeverityPairs: Array<[number, string, boolean]> = [
    [0, 'minimal', false],
    [4, 'minimal', false],
    [5, 'mild', false],
    [9, 'mild', false],
    [10, 'moderate', false],
    [14, 'moderate', false],
    [15, 'severe', true], // Crisis threshold
    [21, 'severe', true],
  ];

  it.each(scoreSeverityPairs)(
    'score %d should have severity %s and crisis=%s',
    (score, expectedSeverity, expectedCrisis) => {
      // Generate answers that sum to target score
      const responses: number[] = [];
      let remaining = score;
      for (let i = 0; i < 7; i++) {
        const val = Math.min(3, remaining);
        responses.push(val);
        remaining -= val;
      }

      const answers = generateGAD7Answers(responses);
      const result = {
        totalScore: score,
        severity: expectedSeverity,
        isCrisis: expectedCrisis,
        completedAt: Date.now(),
        answers,
      };

      const parseResult = GAD7ResultSchema.safeParse(result);
      expect(parseResult.success).toBe(true);
    }
  );

  it('should reject score above maximum (22)', () => {
    const result = GAD7TotalScoreSchema.safeParse(22);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// FORM SUBMISSION TESTS
// =============================================================================

describe('PHQ9FormSubmissionSchema', () => {
  it('should accept valid submission with number responses', () => {
    const submission = {
      answers: Array.from({ length: 9 }, (_, i) => ({
        questionId: `phq9_${i + 1}`,
        response: 1,
      })),
      context: 'standalone',
    };
    const result = PHQ9FormSubmissionSchema.safeParse(submission);
    expect(result.success).toBe(true);
  });

  it('should transform string responses to numbers', () => {
    const submission = {
      answers: Array.from({ length: 9 }, (_, i) => ({
        questionId: `phq9_${i + 1}`,
        response: '2', // String that should be converted
      })),
    };
    const result = PHQ9FormSubmissionSchema.safeParse(submission);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.answers[0].response).toBe(2);
      expect(typeof result.data.answers[0].response).toBe('number');
    }
  });

  it('should add default timestamp if missing', () => {
    const submission = {
      answers: Array.from({ length: 9 }, (_, i) => ({
        questionId: `phq9_${i + 1}`,
        response: 1,
        // No timestamp
      })),
    };
    const result = PHQ9FormSubmissionSchema.safeParse(submission);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data.answers[0].timestamp).toBe('number');
    }
  });

  it('should default context to standalone', () => {
    const submission = {
      answers: Array.from({ length: 9 }, (_, i) => ({
        questionId: `phq9_${i + 1}`,
        response: 1,
      })),
    };
    const result = PHQ9FormSubmissionSchema.safeParse(submission);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.context).toBe('standalone');
    }
  });
});

describe('GAD7FormSubmissionSchema', () => {
  it('should accept valid submission', () => {
    const submission = {
      answers: Array.from({ length: 7 }, (_, i) => ({
        questionId: `gad7_${i + 1}`,
        response: 1,
      })),
      context: 'checkin',
    };
    const result = GAD7FormSubmissionSchema.safeParse(submission);
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// UTILITY FUNCTION TESTS
// =============================================================================

describe('validatePHQ9Answers', () => {
  it('should return success with valid data', () => {
    const answers = generatePHQ9Answers();
    const result = validatePHQ9Answers(answers);
    expect(result.success).toBe(true);
  });

  it('should return user-friendly error message', () => {
    const result = validatePHQ9Answers([]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    }
  });
});

describe('validateGAD7Answers', () => {
  it('should return success with valid data', () => {
    const answers = generateGAD7Answers();
    const result = validateGAD7Answers(answers);
    expect(result.success).toBe(true);
  });

  it('should return user-friendly error message', () => {
    const result = validateGAD7Answers([]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.error).toBe('string');
    }
  });
});

describe('validateSingleResponse', () => {
  it.each([0, 1, 2, 3])('should accept valid response %d', (response) => {
    const result = validateSingleResponse(response);
    expect(result.success).toBe(true);
  });

  it('should reject invalid response with user-friendly error', () => {
    const result = validateSingleResponse(5);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('3');
    }
  });
});

describe('validateFormSubmission', () => {
  it('should validate PHQ-9 form submission', () => {
    const submission = {
      answers: Array.from({ length: 9 }, (_, i) => ({
        questionId: `phq9_${i + 1}`,
        response: 1,
      })),
    };
    const result = validateFormSubmission(submission, 'phq9');
    expect(result.success).toBe(true);
  });

  it('should validate GAD-7 form submission', () => {
    const submission = {
      answers: Array.from({ length: 7 }, (_, i) => ({
        questionId: `gad7_${i + 1}`,
        response: 1,
      })),
    };
    const result = validateFormSubmission(submission, 'gad7');
    expect(result.success).toBe(true);
  });
});

describe('formatValidationError', () => {
  it('should format single error', () => {
    const schema = z.object({ value: z.number() });
    const result = schema.safeParse({ value: 'not a number' });
    if (!result.success) {
      const message = formatValidationError(result.error);
      expect(message).toContain('value');
    }
  });

  it('should format multiple errors', () => {
    const schema = z.object({
      a: z.number(),
      b: z.number(),
    });
    const result = schema.safeParse({ a: 'x', b: 'y' });
    if (!result.success) {
      const message = formatValidationError(result.error);
      expect(message).toContain(';');
    }
  });
});

// =============================================================================
// SECURITY TESTS
// =============================================================================

describe('Security - Malicious Input Rejection', () => {
  describe('PHQ-9 malicious input', () => {
    it('should reject answers with SQL injection in questionId', () => {
      const answers = generatePHQ9Answers();
      answers[0].questionId = "phq9_1; DROP TABLE users;--" as any;
      const result = PHQ9AnswersSchema.safeParse(answers);
      expect(result.success).toBe(false);
    });

    it('should reject answers with script injection in questionId', () => {
      const answers = generatePHQ9Answers();
      answers[0].questionId = '<script>alert("xss")</script>' as any;
      const result = PHQ9AnswersSchema.safeParse(answers);
      expect(result.success).toBe(false);
    });

    it('should reject oversized answer arrays (DoS prevention)', () => {
      const hugeArray = Array(10000).fill({
        questionId: 'phq9_1',
        response: 1,
        timestamp: Date.now(),
      });
      const result = PHQ9AnswersSchema.safeParse(hugeArray);
      expect(result.success).toBe(false);
    });

    it('should reject null prototype injection', () => {
      const malicious = Object.create(null);
      malicious.__proto__ = { isAdmin: true };
      const result = AssessmentResponseSchema.safeParse(malicious);
      expect(result.success).toBe(false);
    });
  });

  describe('GAD-7 malicious input', () => {
    it('should reject answers with invalid characters', () => {
      const answers = generateGAD7Answers();
      answers[0].questionId = 'gad7_1\u0000' as any; // null byte
      const result = GAD7AnswersSchema.safeParse(answers);
      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe('Edge Cases', () => {
  describe('timestamp edge cases', () => {
    it('should reject timestamp in far future', () => {
      const answers = generatePHQ9Answers();
      answers[0].timestamp = Date.now() + 24 * 60 * 60 * 1000; // 1 day in future
      const result = PHQ9AnswersSchema.safeParse(answers);
      expect(result.success).toBe(false);
    });

    it('should reject timestamp from far past', () => {
      const answers = generatePHQ9Answers();
      answers[0].timestamp = Date.now() - 2 * 365 * 24 * 60 * 60 * 1000; // 2 years ago
      const result = PHQ9AnswersSchema.safeParse(answers);
      expect(result.success).toBe(false);
    });
  });

  describe('boundary value edge cases', () => {
    it('should accept PHQ-9 score exactly at minimal/mild boundary (4/5)', () => {
      // Score 4 = minimal
      const answers4 = generatePHQ9Answers([1, 1, 1, 1, 0, 0, 0, 0, 0]);
      const result4 = {
        totalScore: 4,
        severity: 'minimal',
        isCrisis: false,
        suicidalIdeation: false,
        completedAt: Date.now(),
        answers: answers4,
      };
      expect(PHQ9ResultSchema.safeParse(result4).success).toBe(true);

      // Score 5 = mild
      const answers5 = generatePHQ9Answers([1, 1, 1, 1, 1, 0, 0, 0, 0]);
      const result5 = {
        totalScore: 5,
        severity: 'mild',
        isCrisis: false,
        suicidalIdeation: false,
        completedAt: Date.now(),
        answers: answers5,
      };
      expect(PHQ9ResultSchema.safeParse(result5).success).toBe(true);
    });

    it('should accept GAD-7 score exactly at moderate/severe boundary (14/15)', () => {
      // Score 14 = moderate (no crisis)
      const answers14 = generateGAD7Answers([2, 2, 2, 2, 2, 2, 2]);
      const result14 = {
        totalScore: 14,
        severity: 'moderate',
        isCrisis: false,
        completedAt: Date.now(),
        answers: answers14,
      };
      expect(GAD7ResultSchema.safeParse(result14).success).toBe(true);

      // Score 15 = severe (crisis!)
      const answers15 = generateGAD7Answers([3, 3, 3, 3, 3, 0, 0]);
      const result15 = {
        totalScore: 15,
        severity: 'severe',
        isCrisis: true,
        completedAt: Date.now(),
        answers: answers15,
      };
      expect(GAD7ResultSchema.safeParse(result15).success).toBe(true);
    });
  });
});
