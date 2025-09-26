/**
 * Unit Tests - Validation Utilities
 * 
 * Tests all validation functions that protect clinical data integrity
 * These functions are CRITICAL for user safety
 */

import {
  validateAssessment,
  validateCheckInData,
  validateUserProfile,
  requiresCrisisIntervention,
  sanitizeTextInput,
  sanitizeArrayInput,
  ValidationError,
  CRISIS_THRESHOLDS
} from '../../src/utils/validation';

import { Assessment, CheckIn, UserProfile } from '../../src/types';

describe('Unit Tests: Validation Utilities', () => {
  describe('Assessment Validation', () => {
    test('Valid PHQ-9 assessment passes validation', () => {
      const validAssessment: Assessment = {
        id: 'phq9_valid',
        type: 'phq9',
        completedAt: '2024-09-08T10:00:00.000Z',
        answers: [1, 2, 1, 1, 2, 1, 1, 1, 0],
        score: 10,
        severity: 'moderate',
        context: 'standalone'
      };

      expect(() => validateAssessment(validAssessment)).not.toThrow();
    });

    test('Valid GAD-7 assessment passes validation', () => {
      const validAssessment: Assessment = {
        id: 'gad7_valid',
        type: 'gad7',
        completedAt: '2024-09-08T10:00:00.000Z',
        answers: [2, 2, 1, 1, 1, 1, 1],
        score: 9,
        severity: 'mild',
        context: 'standalone'
      };

      expect(() => validateAssessment(validAssessment)).not.toThrow();
    });

    test('Invalid assessment type throws error', () => {
      const invalidAssessment = {
        id: 'invalid',
        type: 'invalid_type',
        completedAt: '2024-09-08T10:00:00.000Z',
        answers: [1, 1, 1, 1, 1, 1, 1],
        score: 7,
        severity: 'mild',
        context: 'standalone'
      };

      expect(() => validateAssessment(invalidAssessment as any)).toThrow(
        new ValidationError('Invalid assessment type', 'type')
      );
    });

    test('Wrong number of PHQ-9 answers throws error', () => {
      const invalidPHQ9 = {
        id: 'phq9_invalid',
        type: 'phq9',
        completedAt: '2024-09-08T10:00:00.000Z',
        answers: [1, 1, 1, 1, 1, 1, 1], // Only 7 answers instead of 9
        score: 7,
        severity: 'mild',
        context: 'standalone'
      };

      expect(() => validateAssessment(invalidPHQ9 as any)).toThrow(
        new ValidationError('PHQ9 requires 9 answers', 'answers')
      );
    });

    test('Wrong number of GAD-7 answers throws error', () => {
      const invalidGAD7 = {
        id: 'gad7_invalid',
        type: 'gad7',
        completedAt: '2024-09-08T10:00:00.000Z',
        answers: [1, 1, 1, 1, 1, 1, 1, 1, 1], // 9 answers instead of 7
        score: 9,
        severity: 'mild',
        context: 'standalone'
      };

      expect(() => validateAssessment(invalidGAD7 as any)).toThrow(
        new ValidationError('GAD7 requires 7 answers', 'answers')
      );
    });

    test('Invalid answer values throw errors', () => {
      const invalidAnswers = [
        [-1, 1, 1, 1, 1, 1, 1, 1, 1], // Negative value
        [4, 1, 1, 1, 1, 1, 1, 1, 1],  // Too high value
        [1.5, 1, 1, 1, 1, 1, 1, 1, 1], // Non-integer
      ];

      invalidAnswers.forEach((answers, index) => {
        const invalidAssessment = {
          id: `invalid_answers_${index}`,
          type: 'phq9',
          completedAt: '2024-09-08T10:00:00.000Z',
          answers,
          score: answers.reduce((sum, a) => sum + a, 0),
          severity: 'mild',
          context: 'standalone'
        };

        expect(() => validateAssessment(invalidAssessment as any)).toThrow(ValidationError);
      });
    });

    test('Score mismatch throws error', () => {
      const mismatchedScore = {
        id: 'mismatched',
        type: 'phq9',
        completedAt: '2024-09-08T10:00:00.000Z',
        answers: [1, 1, 1, 1, 1, 1, 1, 1, 1], // Sum = 9
        score: 15, // Wrong score
        severity: 'mild',
        context: 'standalone'
      };

      expect(() => validateAssessment(mismatchedScore as any)).toThrow(
        new ValidationError('Score does not match calculated total', 'score')
      );
    });

    test('Invalid completion date throws error', () => {
      const invalidDate = {
        id: 'invalid_date',
        type: 'phq9',
        completedAt: 'invalid-date-string',
        answers: [1, 1, 1, 1, 1, 1, 1, 1, 1],
        score: 9,
        severity: 'mild',
        context: 'standalone'
      };

      expect(() => validateAssessment(invalidDate as any)).toThrow(
        new ValidationError('Valid completion date is required', 'completedAt')
      );
    });
  });

  describe('Crisis Intervention Logic', () => {
    test('PHQ-9 severe depression (score ≥20) triggers crisis', () => {
      const crisisAssessments = [
        {
          id: 'crisis_20',
          type: 'phq9' as const,
          answers: [3, 3, 3, 3, 3, 2, 1, 1, 1],
          score: 20,
          severity: 'severe' as const,
          completedAt: '2024-09-08T10:00:00.000Z',
          context: 'standalone' as const
        },
        {
          id: 'crisis_27',
          type: 'phq9' as const,
          answers: [3, 3, 3, 3, 3, 3, 3, 3, 3],
          score: 27,
          severity: 'severe' as const,
          completedAt: '2024-09-08T10:00:00.000Z',
          context: 'standalone' as const
        }
      ];

      crisisAssessments.forEach(assessment => {
        expect(requiresCrisisIntervention(assessment)).toBe(true);
      });
    });

    test('PHQ-9 suicidal ideation (question 9 > 0) triggers crisis regardless of total score', () => {
      const suicidalIdeationCases = [
        // Low total score but suicidal ideation
        {
          id: 'suicidal_low',
          type: 'phq9' as const,
          answers: [0, 0, 0, 0, 0, 0, 0, 0, 1],
          score: 1,
          severity: 'minimal' as const,
          completedAt: '2024-09-08T10:00:00.000Z',
          context: 'standalone' as const
        },
        // Moderate score with suicidal ideation
        {
          id: 'suicidal_moderate',
          type: 'phq9' as const,
          answers: [1, 1, 1, 1, 1, 1, 1, 1, 2],
          score: 10,
          severity: 'moderate' as const,
          completedAt: '2024-09-08T10:00:00.000Z',
          context: 'standalone' as const
        }
      ];

      suicidalIdeationCases.forEach(assessment => {
        expect(requiresCrisisIntervention(assessment)).toBe(true);
      });
    });

    test('PHQ-9 scores below crisis threshold do not trigger crisis', () => {
      const nonCrisisCases = [
        {
          id: 'minimal',
          type: 'phq9' as const,
          answers: [0, 1, 0, 1, 0, 1, 0, 1, 0],
          score: 4,
          severity: 'minimal' as const,
          completedAt: '2024-09-08T10:00:00.000Z',
          context: 'standalone' as const
        },
        {
          id: 'moderate_severe',
          type: 'phq9' as const,
          answers: [2, 2, 2, 2, 2, 2, 2, 2, 1],
          score: 17,
          severity: 'moderately severe' as const,
          completedAt: '2024-09-08T10:00:00.000Z',
          context: 'standalone' as const
        }
      ];

      nonCrisisCases.forEach(assessment => {
        expect(requiresCrisisIntervention(assessment)).toBe(false);
      });
    });

    test('GAD-7 severe anxiety (score ≥15) triggers crisis', () => {
      const gad7CrisisCases = [
        {
          id: 'gad7_15',
          type: 'gad7' as const,
          answers: [3, 3, 2, 2, 2, 2, 1],
          score: 15,
          severity: 'severe' as const,
          completedAt: '2024-09-08T10:00:00.000Z',
          context: 'standalone' as const
        },
        {
          id: 'gad7_21',
          type: 'gad7' as const,
          answers: [3, 3, 3, 3, 3, 3, 3],
          score: 21,
          severity: 'severe' as const,
          completedAt: '2024-09-08T10:00:00.000Z',
          context: 'standalone' as const
        }
      ];

      gad7CrisisCases.forEach(assessment => {
        expect(requiresCrisisIntervention(assessment)).toBe(true);
      });
    });

    test('GAD-7 scores below crisis threshold do not trigger crisis', () => {
      const gad7NonCrisis = {
        id: 'gad7_moderate',
        type: 'gad7' as const,
        answers: [2, 2, 2, 2, 2, 2, 2],
        score: 14,
        severity: 'moderate' as const,
        completedAt: '2024-09-08T10:00:00.000Z',
        context: 'standalone' as const
      };

      expect(requiresCrisisIntervention(gad7NonCrisis)).toBe(false);
    });

    test('Crisis thresholds match clinical specifications', () => {
      expect(CRISIS_THRESHOLDS.PHQ9_SEVERE).toBe(20);
      expect(CRISIS_THRESHOLDS.GAD7_SEVERE).toBe(15);
      expect(CRISIS_THRESHOLDS.PHQ9_SUICIDAL_IDEATION_QUESTION).toBe(8); // 0-indexed question 9
      expect(CRISIS_THRESHOLDS.SUICIDAL_IDEATION_THRESHOLD).toBe(1);
    });
  });

  describe('Check-in Data Validation', () => {
    test('Valid morning check-in passes validation', () => {
      const validCheckIn: CheckIn = {
        id: 'morning_valid',
        type: 'morning',
        startedAt: '2024-09-08T07:00:00.000Z',
        completedAt: '2024-09-08T07:15:00.000Z',
        skipped: false,
        data: {
          sleepQuality: 7,
          energyLevel: 6,
          anxietyLevel: 3,
          bodyAreas: ['shoulders', 'neck'],
          emotions: ['calm', 'hopeful']
        }
      };

      expect(() => validateCheckInData(validCheckIn)).not.toThrow();
    });

    test('Invalid check-in type throws error', () => {
      const invalidCheckIn = {
        id: 'invalid_type',
        type: 'invalid',
        startedAt: '2024-09-08T07:00:00.000Z'
      };

      expect(() => validateCheckInData(invalidCheckIn as any)).toThrow(
        new ValidationError('Invalid check-in type', 'type')
      );
    });

    test('Out-of-range numeric values throw errors', () => {
      const invalidRanges = [
        { sleepQuality: -1 },
        { sleepQuality: 11 },
        { energyLevel: -5 },
        { energyLevel: 15 },
        { anxietyLevel: -1 },
        { anxietyLevel: 11 }
      ];

      invalidRanges.forEach((data, index) => {
        const invalidCheckIn = {
          id: `invalid_range_${index}`,
          type: 'morning',
          startedAt: '2024-09-08T07:00:00.000Z',
          data
        };

        expect(() => validateCheckInData(invalidCheckIn as any)).toThrow(ValidationError);
      });
    });

    test('Invalid array types throw errors', () => {
      const invalidArrayData = [
        { bodyAreas: 'not-an-array' },
        { emotions: 123 },
        { thoughts: ['should-be-string'] }
      ];

      invalidArrayData.forEach((data, index) => {
        const invalidCheckIn = {
          id: `invalid_array_${index}`,
          type: 'morning',
          startedAt: '2024-09-08T07:00:00.000Z',
          data
        };

        expect(() => validateCheckInData(invalidCheckIn as any)).toThrow(ValidationError);
      });
    });
  });

  describe('Input Sanitization', () => {
    test('Text sanitization removes dangerous content', () => {
      const dangerousInputs = [
        { input: '<script>alert("hack")</script>Hello', expected: 'Hello' },
        { input: 'Normal text with > and < symbols', expected: 'Normal text with  and  symbols' },
        { input: '  Whitespace trimmed  ', expected: 'Whitespace trimmed' },
        { input: 'x'.repeat(3000), expected: 'x'.repeat(2000) }, // Length limit
        { input: '', expected: '' },
        { input: null as any, expected: '' },
      ];

      dangerousInputs.forEach(({ input, expected }) => {
        expect(sanitizeTextInput(input)).toBe(expected);
      });
    });

    test('Array sanitization handles mixed inputs', () => {
      const arrayInputs = [
        {
          input: ['valid', 123, 'another-valid', null, '', '<script>'],
          expected: ['valid', 'another-valid']
        },
        {
          input: ['a'.repeat(100), 'b'.repeat(3000)],
          expected: ['a'.repeat(100), 'b'.repeat(2000)]
        },
        {
          input: new Array(30).fill('item'),
          expected: new Array(20).fill('item') // Limited to 20 items
        },
        {
          input: null as any,
          expected: []
        }
      ];

      arrayInputs.forEach(({ input, expected }) => {
        expect(sanitizeArrayInput(input)).toEqual(expected);
      });
    });
  });

  describe('User Profile Validation', () => {
    test('Valid user profile passes validation', () => {
      const validProfile: UserProfile = {
        id: 'user_123',
        createdAt: '2024-09-08T10:00:00.000Z',
        preferences: {
          haptics: true,
          theme: 'light',
          language: 'en'
        },
        notifications: {
          enabled: true,
          morning: '07:00',
          midday: '12:00',
          evening: '20:00'
        },
        onboardingCompleted: true,
        privacyPolicyAccepted: true,
        termsAccepted: true
      };

      expect(() => validateUserProfile(validProfile)).not.toThrow();
    });

    test('Invalid notification times throw errors', () => {
      const invalidTimes = ['25:00', '12:60', 'invalid', '7:00']; // Last one missing leading zero

      invalidTimes.forEach((time, index) => {
        const invalidProfile = {
          id: 'user_test',
          createdAt: '2024-09-08T10:00:00.000Z',
          notifications: {
            enabled: true,
            morning: time,
            midday: '12:00',
            evening: '20:00'
          },
          preferences: { haptics: true, theme: 'light', language: 'en' },
          onboardingCompleted: true,
          privacyPolicyAccepted: true,
          termsAccepted: true
        };

        expect(() => validateUserProfile(invalidProfile as any)).toThrow(
          new ValidationError('Valid morning notification time required', 'notifications.morning')
        );
      });
    });
  });

  describe('Edge Cases & Error Conditions', () => {
    test('ValidationError has correct properties', () => {
      const error = new ValidationError('Test message', 'test-field');
      
      expect(error.message).toBe('Test message');
      expect(error.field).toBe('test-field');
      expect(error.name).toBe('ValidationError');
      expect(error instanceof Error).toBe(true);
    });

    test('Validation handles null and undefined inputs gracefully', () => {
      expect(() => validateAssessment(null as any)).toThrow(ValidationError);
      expect(() => validateAssessment(undefined as any)).toThrow(ValidationError);
      expect(() => validateCheckInData({} as any)).toThrow(ValidationError);
      expect(() => validateUserProfile({} as any)).toThrow(ValidationError);
    });

    test('Date validation rejects malformed dates', () => {
      const invalidDates = [
        '2024-13-08T10:00:00.000Z', // Invalid month
        '2024-09-32T10:00:00.000Z', // Invalid day
        '2024-09-08T25:00:00.000Z', // Invalid hour
        '2024-09-08', // Missing time
        'not-a-date'
      ];

      invalidDates.forEach((date, index) => {
        const assessment = {
          id: `date_test_${index}`,
          type: 'phq9',
          completedAt: date,
          answers: [1, 1, 1, 1, 1, 1, 1, 1, 1],
          score: 9,
          severity: 'mild',
          context: 'standalone'
        };

        expect(() => validateAssessment(assessment as any)).toThrow(ValidationError);
      });
    });
  });
});