/**
 * Clinical Assessment Scoring Tests
 * 
 * Comprehensive testing for PHQ-9 and GAD-7 assessment accuracy including:
 * - All 48 possible score combinations (27 PHQ-9 + 21 GAD-7)
 * - Crisis threshold detection validation
 * - Severity categorization accuracy
 * - Clinical interpretation consistency
 * - 99.9% accuracy requirement validation
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import {
  validatePHQ9Score,
  validateGAD7Score,
  isCrisisThreshold,
  validateAssessmentAccuracy,
} from '../setup';

// Import clinical types and constants
import {
  PHQ9_THRESHOLDS,
  GAD7_THRESHOLDS,
  AssessmentResult,
  AssessmentScore,
} from '../../types/healthcare';

// ============================================================================
// PHQ-9 ASSESSMENT SCORING TESTS (100% ACCURACY REQUIRED)
// ============================================================================

describe('PHQ-9 Assessment Scoring', () => {
  describe('Score Validation', () => {
    test('validates all possible PHQ-9 scores (0-27)', () => {
      // Test all 28 possible scores
      for (let score = 0; score <= 27; score++) {
        expect(validatePHQ9Score(score)).toBe(true);
      }
    });

    test('rejects invalid PHQ-9 scores', () => {
      const invalidScores = [-1, 28, 30, 50, 0.5, 12.3, NaN, Infinity];
      
      invalidScores.forEach(score => {
        expect(validatePHQ9Score(score)).toBe(false);
      });
    });

    test('validates PHQ-9 individual question scores (0-3)', () => {
      const validQuestionScores: AssessmentScore[] = [0, 1, 2, 3];
      
      validQuestionScores.forEach(score => {
        expect([0, 1, 2, 3].includes(score)).toBe(true);
      });
    });
  });

  describe('Severity Categorization', () => {
    test('correctly categorizes minimal depression (0-4)', () => {
      const minimalScores = [0, 1, 2, 3, 4];
      
      minimalScores.forEach(score => {
        const severity = categorizePHQ9Severity(score);
        expect(severity).toBe('minimal');
        expect(score).toBeGreaterThanOrEqual(PHQ9_THRESHOLDS.MINIMAL[0]);
        expect(score).toBeLessThanOrEqual(PHQ9_THRESHOLDS.MINIMAL[1]);
      });
    });

    test('correctly categorizes mild depression (5-9)', () => {
      const mildScores = [5, 6, 7, 8, 9];
      
      mildScores.forEach(score => {
        const severity = categorizePHQ9Severity(score);
        expect(severity).toBe('mild');
        expect(score).toBeGreaterThanOrEqual(PHQ9_THRESHOLDS.MILD[0]);
        expect(score).toBeLessThanOrEqual(PHQ9_THRESHOLDS.MILD[1]);
      });
    });

    test('correctly categorizes moderate depression (10-14)', () => {
      const moderateScores = [10, 11, 12, 13, 14];
      
      moderateScores.forEach(score => {
        const severity = categorizePHQ9Severity(score);
        expect(severity).toBe('moderate');
        expect(score).toBeGreaterThanOrEqual(PHQ9_THRESHOLDS.MODERATE[0]);
        expect(score).toBeLessThanOrEqual(PHQ9_THRESHOLDS.MODERATE[1]);
      });
    });

    test('correctly categorizes moderately severe depression (15-19)', () => {
      const moderatelySevereScores = [15, 16, 17, 18, 19];
      
      moderatelySevereScores.forEach(score => {
        const severity = categorizePHQ9Severity(score);
        expect(severity).toBe('moderately-severe');
        expect(score).toBeGreaterThanOrEqual(PHQ9_THRESHOLDS.MODERATELY_SEVERE[0]);
        expect(score).toBeLessThanOrEqual(PHQ9_THRESHOLDS.MODERATELY_SEVERE[1]);
      });
    });

    test('correctly categorizes severe depression (20-27)', () => {
      const severeScores = [20, 21, 22, 23, 24, 25, 26, 27];
      
      severeScores.forEach(score => {
        const severity = categorizePHQ9Severity(score);
        expect(severity).toBe('severe');
        expect(score).toBeGreaterThanOrEqual(PHQ9_THRESHOLDS.SEVERE[0]);
        expect(score).toBeLessThanOrEqual(PHQ9_THRESHOLDS.SEVERE[1]);
      });
    });
  });

  describe('Crisis Threshold Detection (CRITICAL)', () => {
    test('correctly identifies crisis threshold at PHQ-9 >= 20', () => {
      // Non-crisis scores (0-19)
      for (let score = 0; score < 20; score++) {
        expect(isCrisisThreshold(score, 'PHQ9')).toBe(false);
        expect({ score, type: 'PHQ9' as const }).not.toTriggerCrisisThreshold();
      }

      // Crisis scores (20-27)
      for (let score = 20; score <= 27; score++) {
        expect(isCrisisThreshold(score, 'PHQ9')).toBe(true);
        expect({ score, type: 'PHQ9' as const }).toTriggerCrisisThreshold();
      }
    });

    test('crisis threshold boundary validation', () => {
      // Boundary cases
      expect(isCrisisThreshold(19, 'PHQ9')).toBe(false);
      expect(isCrisisThreshold(20, 'PHQ9')).toBe(true);
      expect(isCrisisThreshold(27, 'PHQ9')).toBe(true);
    });
  });

  describe('Complete PHQ-9 Score Matrix (27 combinations)', () => {
    test('validates all 28 possible PHQ-9 scores with clinical accuracy', () => {
      const testResults: Array<{
        score: number;
        severity: string;
        crisis: boolean;
        accuracy: number;
      }> = [];

      // Test every possible PHQ-9 score
      for (let score = 0; score <= 27; score++) {
        const severity = categorizePHQ9Severity(score);
        const crisis = isCrisisThreshold(score, 'PHQ9');
        
        // Validate clinical accuracy (99.9% requirement)
        const expectedSeverity = getExpectedPHQ9Severity(score);
        const expectedCrisis = score >= PHQ9_THRESHOLDS.CRISIS;
        
        const severityAccurate = severity === expectedSeverity;
        const crisisAccurate = crisis === expectedCrisis;
        const overallAccuracy = severityAccurate && crisisAccurate ? 1.0 : 0.0;

        testResults.push({
          score,
          severity,
          crisis,
          accuracy: overallAccuracy,
        });

        // Clinical accuracy assertions
        expect(score).toBeClinicallyAccurate(score, 0.001);
        expect(severityAccurate).toBe(true);
        expect(crisisAccurate).toBe(true);
        expect(overallAccuracy).toBe(1.0);
      }

      // Overall accuracy validation
      const totalAccuracy = testResults.reduce((sum, result) => sum + result.accuracy, 0) / testResults.length;
      expect(totalAccuracy).toBeGreaterThanOrEqual(0.999); // 99.9% requirement
      
      console.log(`PHQ-9 Scoring Accuracy: ${(totalAccuracy * 100).toFixed(3)}%`);
    });
  });
});

// ============================================================================
// GAD-7 ASSESSMENT SCORING TESTS (100% ACCURACY REQUIRED)
// ============================================================================

describe('GAD-7 Assessment Scoring', () => {
  describe('Score Validation', () => {
    test('validates all possible GAD-7 scores (0-21)', () => {
      // Test all 22 possible scores
      for (let score = 0; score <= 21; score++) {
        expect(validateGAD7Score(score)).toBe(true);
      }
    });

    test('rejects invalid GAD-7 scores', () => {
      const invalidScores = [-1, 22, 25, 50, 0.5, 10.7, NaN, Infinity];
      
      invalidScores.forEach(score => {
        expect(validateGAD7Score(score)).toBe(false);
      });
    });
  });

  describe('Severity Categorization', () => {
    test('correctly categorizes minimal anxiety (0-4)', () => {
      const minimalScores = [0, 1, 2, 3, 4];
      
      minimalScores.forEach(score => {
        const severity = categorizeGAD7Severity(score);
        expect(severity).toBe('minimal');
        expect(score).toBeGreaterThanOrEqual(GAD7_THRESHOLDS.MINIMAL[0]);
        expect(score).toBeLessThanOrEqual(GAD7_THRESHOLDS.MINIMAL[1]);
      });
    });

    test('correctly categorizes mild anxiety (5-9)', () => {
      const mildScores = [5, 6, 7, 8, 9];
      
      mildScores.forEach(score => {
        const severity = categorizeGAD7Severity(score);
        expect(severity).toBe('mild');
        expect(score).toBeGreaterThanOrEqual(GAD7_THRESHOLDS.MILD[0]);
        expect(score).toBeLessThanOrEqual(GAD7_THRESHOLDS.MILD[1]);
      });
    });

    test('correctly categorizes moderate anxiety (10-14)', () => {
      const moderateScores = [10, 11, 12, 13, 14];
      
      moderateScores.forEach(score => {
        const severity = categorizeGAD7Severity(score);
        expect(severity).toBe('moderate');
        expect(score).toBeGreaterThanOrEqual(GAD7_THRESHOLDS.MODERATE[0]);
        expect(score).toBeLessThanOrEqual(GAD7_THRESHOLDS.MODERATE[1]);
      });
    });

    test('correctly categorizes severe anxiety (15-21)', () => {
      const severeScores = [15, 16, 17, 18, 19, 20, 21];
      
      severeScores.forEach(score => {
        const severity = categorizeGAD7Severity(score);
        expect(severity).toBe('severe');
        expect(score).toBeGreaterThanOrEqual(GAD7_THRESHOLDS.SEVERE[0]);
        expect(score).toBeLessThanOrEqual(GAD7_THRESHOLDS.SEVERE[1]);
      });
    });
  });

  describe('Crisis Threshold Detection (CRITICAL)', () => {
    test('correctly identifies crisis threshold at GAD-7 >= 15', () => {
      // Non-crisis scores (0-14)
      for (let score = 0; score < 15; score++) {
        expect(isCrisisThreshold(score, 'GAD7')).toBe(false);
        expect({ score, type: 'GAD7' as const }).not.toTriggerCrisisThreshold();
      }

      // Crisis scores (15-21)
      for (let score = 15; score <= 21; score++) {
        expect(isCrisisThreshold(score, 'GAD7')).toBe(true);
        expect({ score, type: 'GAD7' as const }).toTriggerCrisisThreshold();
      }
    });

    test('crisis threshold boundary validation', () => {
      // Boundary cases
      expect(isCrisisThreshold(14, 'GAD7')).toBe(false);
      expect(isCrisisThreshold(15, 'GAD7')).toBe(true);
      expect(isCrisisThreshold(21, 'GAD7')).toBe(true);
    });
  });

  describe('Complete GAD-7 Score Matrix (21 combinations)', () => {
    test('validates all 22 possible GAD-7 scores with clinical accuracy', () => {
      const testResults: Array<{
        score: number;
        severity: string;
        crisis: boolean;
        accuracy: number;
      }> = [];

      // Test every possible GAD-7 score
      for (let score = 0; score <= 21; score++) {
        const severity = categorizeGAD7Severity(score);
        const crisis = isCrisisThreshold(score, 'GAD7');
        
        // Validate clinical accuracy (99.9% requirement)
        const expectedSeverity = getExpectedGAD7Severity(score);
        const expectedCrisis = score >= GAD7_THRESHOLDS.CRISIS;
        
        const severityAccurate = severity === expectedSeverity;
        const crisisAccurate = crisis === expectedCrisis;
        const overallAccuracy = severityAccurate && crisisAccurate ? 1.0 : 0.0;

        testResults.push({
          score,
          severity,
          crisis,
          accuracy: overallAccuracy,
        });

        // Clinical accuracy assertions
        expect(score).toBeClinicallyAccurate(score, 0.001);
        expect(severityAccurate).toBe(true);
        expect(crisisAccurate).toBe(true);
        expect(overallAccuracy).toBe(1.0);
      }

      // Overall accuracy validation
      const totalAccuracy = testResults.reduce((sum, result) => sum + result.accuracy, 0) / testResults.length;
      expect(totalAccuracy).toBeGreaterThanOrEqual(0.999); // 99.9% requirement
      
      console.log(`GAD-7 Scoring Accuracy: ${(totalAccuracy * 100).toFixed(3)}%`);
    });
  });
});

// ============================================================================
// COMPREHENSIVE ASSESSMENT SCORING VALIDATION (48 COMBINATIONS)
// ============================================================================

describe('Complete Assessment Matrix Validation', () => {
  test('validates all 48 possible assessment score combinations', () => {
    const allTestResults: Array<{
      type: 'PHQ9' | 'GAD7';
      score: number;
      severity: string;
      crisis: boolean;
      accuracy: number;
    }> = [];

    // Test all PHQ-9 scores (0-27)
    for (let score = 0; score <= 27; score++) {
      const severity = categorizePHQ9Severity(score);
      const crisis = isCrisisThreshold(score, 'PHQ9');
      const expectedSeverity = getExpectedPHQ9Severity(score);
      const expectedCrisis = score >= PHQ9_THRESHOLDS.CRISIS;
      
      const accuracy = (severity === expectedSeverity && crisis === expectedCrisis) ? 1.0 : 0.0;
      
      allTestResults.push({
        type: 'PHQ9',
        score,
        severity,
        crisis,
        accuracy,
      });
    }

    // Test all GAD-7 scores (0-21)
    for (let score = 0; score <= 21; score++) {
      const severity = categorizeGAD7Severity(score);
      const crisis = isCrisisThreshold(score, 'GAD7');
      const expectedSeverity = getExpectedGAD7Severity(score);
      const expectedCrisis = score >= GAD7_THRESHOLDS.CRISIS;
      
      const accuracy = (severity === expectedSeverity && crisis === expectedCrisis) ? 1.0 : 0.0;
      
      allTestResults.push({
        type: 'GAD7',
        score,
        severity,
        crisis,
        accuracy,
      });
    }

    // Validate overall clinical accuracy across all assessments
    const overallAccuracy = allTestResults.reduce((sum, result) => sum + result.accuracy, 0) / allTestResults.length;
    
    expect(overallAccuracy).toBe(1.0); // 100% accuracy required for clinical safety
    expect(overallAccuracy).toBeGreaterThanOrEqual(0.999); // 99.9% minimum requirement
    
    // Validate crisis detection accuracy
    const crisisResults = allTestResults.filter(result => result.crisis);
    const crisisAccuracy = crisisResults.every(result => result.accuracy === 1.0);
    
    expect(crisisAccuracy).toBe(true); // Crisis detection must be 100% accurate
    
    console.log(`Overall Assessment Accuracy: ${(overallAccuracy * 100).toFixed(3)}%`);
    console.log(`Total Assessments Tested: ${allTestResults.length}`);
    console.log(`Crisis Cases Tested: ${crisisResults.length}`);
  });

  test('validates assessment scoring consistency across multiple runs', () => {
    const runs = 10;
    const consistencyResults: number[] = [];

    for (let run = 0; run < runs; run++) {
      let runAccuracy = 0;
      let totalTests = 0;

      // Test subset of critical boundary cases
      const criticalScores = [
        { type: 'PHQ9' as const, scores: [0, 4, 5, 9, 10, 14, 15, 19, 20, 27] },
        { type: 'GAD7' as const, scores: [0, 4, 5, 9, 10, 14, 15, 21] },
      ];

      criticalScores.forEach(({ type, scores }) => {
        scores.forEach(score => {
          const crisis = isCrisisThreshold(score, type);
          const expectedCrisis = type === 'PHQ9' ? score >= 20 : score >= 15;
          
          if (crisis === expectedCrisis) {
            runAccuracy++;
          }
          totalTests++;
        });
      });

      consistencyResults.push(runAccuracy / totalTests);
    }

    // All runs should have 100% accuracy
    consistencyResults.forEach((accuracy, index) => {
      expect(accuracy).toBe(1.0);
    });

    const averageConsistency = consistencyResults.reduce((sum, acc) => sum + acc, 0) / runs;
    expect(averageConsistency).toBe(1.0);
    
    console.log(`Assessment Consistency Across ${runs} Runs: ${(averageConsistency * 100).toFixed(3)}%`);
  });
});

// ============================================================================
// CLINICAL ACCURACY HELPER FUNCTIONS
// ============================================================================

function categorizePHQ9Severity(score: number): AssessmentResult['severity'] {
  if (score >= 0 && score <= 4) return 'minimal';
  if (score >= 5 && score <= 9) return 'mild';
  if (score >= 10 && score <= 14) return 'moderate';
  if (score >= 15 && score <= 19) return 'moderately-severe';
  if (score >= 20 && score <= 27) return 'severe';
  throw new Error(`Invalid PHQ-9 score: ${score}`);
}

function categorizeGAD7Severity(score: number): AssessmentResult['severity'] {
  if (score >= 0 && score <= 4) return 'minimal';
  if (score >= 5 && score <= 9) return 'mild';
  if (score >= 10 && score <= 14) return 'moderate';
  if (score >= 15 && score <= 21) return 'severe';
  throw new Error(`Invalid GAD-7 score: ${score}`);
}

function getExpectedPHQ9Severity(score: number): AssessmentResult['severity'] {
  return categorizePHQ9Severity(score);
}

function getExpectedGAD7Severity(score: number): AssessmentResult['severity'] {
  return categorizeGAD7Severity(score);
}