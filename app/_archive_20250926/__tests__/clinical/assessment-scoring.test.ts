/**
 * Clinical Accuracy Tests - Assessment Scoring
 * 
 * CRITICAL: These tests validate 100% accuracy of PHQ-9 and GAD-7 scoring
 * Any failure in these tests indicates potential harm to users
 * 
 * DO NOT MODIFY without clinical oversight
 */

import { useAssessmentStore } from '../../src/store/assessmentStore';
import { requiresCrisisIntervention, CRISIS_THRESHOLDS } from '../../src/utils/validation';
import { Assessment } from '../../src/types';

describe('Clinical Accuracy: Assessment Scoring', () => {
  let store: ReturnType<typeof useAssessmentStore.getState>;

  beforeEach(() => {
    // Get fresh store instance for each test
    store = useAssessmentStore.getState();
    
    // Clear any existing state
    store.clearCurrentAssessment();
  });

  describe('PHQ-9 Scoring Accuracy', () => {
    // Test all possible score boundaries (0-27)
    const phq9TestCases = [
      // Minimal depression (0-4)
      { answers: [0, 0, 0, 0, 0, 0, 0, 0, 0], expectedScore: 0, severity: 'minimal', crisis: false },
      { answers: [1, 1, 1, 1, 0, 0, 0, 0, 0], expectedScore: 4, severity: 'minimal', crisis: false },
      
      // Mild depression (5-9) 
      { answers: [1, 1, 1, 1, 1, 0, 0, 0, 0], expectedScore: 5, severity: 'mild', crisis: false },
      { answers: [1, 1, 1, 1, 1, 1, 1, 1, 0], expectedScore: 8, severity: 'mild', crisis: false },
      
      // Moderate depression (10-14)
      { answers: [2, 1, 1, 1, 1, 1, 1, 1, 0], expectedScore: 9, severity: 'mild', crisis: false },
      { answers: [2, 2, 2, 2, 2, 2, 2, 0, 0], expectedScore: 14, severity: 'moderate', crisis: false },
      
      // Moderately severe depression (15-19)
      { answers: [2, 2, 2, 2, 2, 2, 2, 1, 0], expectedScore: 15, severity: 'moderately severe', crisis: false },
      { answers: [3, 2, 2, 2, 2, 2, 2, 2, 0], expectedScore: 17, severity: 'moderately severe', crisis: false },
      
      // Severe depression (20-27) - CRISIS THRESHOLD
      { answers: [3, 3, 2, 2, 2, 2, 2, 2, 2], expectedScore: 20, severity: 'severe', crisis: true },
      { answers: [3, 3, 3, 3, 3, 3, 3, 3, 3], expectedScore: 27, severity: 'severe', crisis: true },
      
      // Suicidal ideation cases (Question 9 > 0) - IMMEDIATE CRISIS
      { answers: [0, 0, 0, 0, 0, 0, 0, 0, 1], expectedScore: 1, severity: 'minimal', crisis: true },
      { answers: [1, 1, 1, 1, 0, 0, 0, 0, 1], expectedScore: 5, severity: 'mild', crisis: true },
      { answers: [2, 2, 2, 2, 2, 2, 2, 2, 3], expectedScore: 19, severity: 'moderately severe', crisis: true },
    ];

    phq9TestCases.forEach(({ answers, expectedScore, severity, crisis }, index) => {
      test(`PHQ-9 Case ${index + 1}: Answers [${answers.join(',')}] = Score ${expectedScore} (${severity})`, () => {
        // Test scoring accuracy
        const calculatedScore = store.calculateScore('phq9', answers);
        expect(calculatedScore).toMatchPHQ9Score(answers);
        expect(calculatedScore).toBe(expectedScore);
        
        // Test severity classification
        const calculatedSeverity = store.getSeverityLevel('phq9', calculatedScore);
        expect(calculatedSeverity).toBe(severity);
        
        // Test crisis detection
        const assessment: Assessment = {
          id: 'test',
          type: 'phq9',
          answers,
          score: calculatedScore,
          severity: severity as Assessment['severity'],
          completedAt: new Date().toISOString(),
          context: 'standalone'
        };
        
        const needsCrisis = requiresCrisisIntervention(assessment);
        expect(needsCrisis).toBe(crisis);
        
        if (crisis) {
          expect(assessment).toRequireCrisisIntervention();
        }
      });
    });

    // Test edge cases and error conditions
    test('PHQ-9 Invalid Answer Values', () => {
      expect(() => store.calculateScore('phq9', [-1, 0, 0, 0, 0, 0, 0, 0, 0])).toThrow('Invalid PHQ-9 answers');
      expect(() => store.calculateScore('phq9', [4, 0, 0, 0, 0, 0, 0, 0, 0])).toThrow('Invalid PHQ-9 answers');
      expect(() => store.calculateScore('phq9', [0, 0, 0, 0, 0, 0, 0, 0])).toThrow('Invalid PHQ-9 answers');
      expect(() => store.calculateScore('phq9', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0])).toThrow('Invalid PHQ-9 answers');
    });
  });

  describe('GAD-7 Scoring Accuracy', () => {
    const gad7TestCases = [
      // Minimal anxiety (0-4)
      { answers: [0, 0, 0, 0, 0, 0, 0], expectedScore: 0, severity: 'minimal', crisis: false },
      { answers: [1, 1, 1, 1, 0, 0, 0], expectedScore: 4, severity: 'minimal', crisis: false },
      
      // Mild anxiety (5-9)
      { answers: [1, 1, 1, 1, 1, 0, 0], expectedScore: 5, severity: 'mild', crisis: false },
      { answers: [2, 1, 1, 1, 1, 1, 1], expectedScore: 8, severity: 'mild', crisis: false },
      { answers: [2, 2, 1, 1, 1, 1, 1], expectedScore: 9, severity: 'mild', crisis: false },
      
      // Moderate anxiety (10-14)
      { answers: [2, 2, 2, 2, 2, 0, 0], expectedScore: 10, severity: 'moderate', crisis: false },
      { answers: [2, 2, 2, 2, 2, 2, 2], expectedScore: 14, severity: 'moderate', crisis: false },
      
      // Severe anxiety (15-21) - CRISIS THRESHOLD
      { answers: [3, 2, 2, 2, 2, 2, 2], expectedScore: 15, severity: 'severe', crisis: true },
      { answers: [3, 3, 3, 3, 3, 3, 3], expectedScore: 21, severity: 'severe', crisis: true },
    ];

    gad7TestCases.forEach(({ answers, expectedScore, severity, crisis }, index) => {
      test(`GAD-7 Case ${index + 1}: Answers [${answers.join(',')}] = Score ${expectedScore} (${severity})`, () => {
        // Test scoring accuracy
        const calculatedScore = store.calculateScore('gad7', answers);
        expect(calculatedScore).toMatchGAD7Score(answers);
        expect(calculatedScore).toBe(expectedScore);
        
        // Test severity classification
        const calculatedSeverity = store.getSeverityLevel('gad7', calculatedScore);
        expect(calculatedSeverity).toBe(severity);
        
        // Test crisis detection
        const assessment: Assessment = {
          id: 'test',
          type: 'gad7', 
          answers,
          score: calculatedScore,
          severity: severity as Assessment['severity'],
          completedAt: new Date().toISOString(),
          context: 'standalone'
        };
        
        const needsCrisis = requiresCrisisIntervention(assessment);
        expect(needsCrisis).toBe(crisis);
      });
    });

    test('GAD-7 Invalid Answer Values', () => {
      expect(() => store.calculateScore('gad7', [-1, 0, 0, 0, 0, 0, 0])).toThrow('Invalid GAD-7 answers');
      expect(() => store.calculateScore('gad7', [4, 0, 0, 0, 0, 0, 0])).toThrow('Invalid GAD-7 answers');
      expect(() => store.calculateScore('gad7', [0, 0, 0, 0, 0, 0])).toThrow('Invalid GAD-7 answers');
      expect(() => store.calculateScore('gad7', [0, 0, 0, 0, 0, 0, 0, 0])).toThrow('Invalid GAD-7 answers');
    });
  });

  describe('Crisis Threshold Validation', () => {
    test('PHQ-9 Crisis Thresholds are Correct', () => {
      expect(CRISIS_THRESHOLDS.PHQ9_SEVERE).toBe(20);
      expect(CRISIS_THRESHOLDS.PHQ9_SUICIDAL_IDEATION_QUESTION).toBe(8); // 0-indexed question 9
      expect(CRISIS_THRESHOLDS.SUICIDAL_IDEATION_THRESHOLD).toBe(1);
    });

    test('GAD-7 Crisis Thresholds are Correct', () => {
      expect(CRISIS_THRESHOLDS.GAD7_SEVERE).toBe(15);
    });

    test('Suicidal Ideation Detection (PHQ-9 Question 9)', () => {
      // Any response > 0 on question 9 should trigger crisis
      const testCases = [
        { answers: [0, 0, 0, 0, 0, 0, 0, 0, 1], shouldTrigger: true },
        { answers: [0, 0, 0, 0, 0, 0, 0, 0, 2], shouldTrigger: true },
        { answers: [0, 0, 0, 0, 0, 0, 0, 0, 3], shouldTrigger: true },
        { answers: [0, 0, 0, 0, 0, 0, 0, 0, 0], shouldTrigger: false },
        // Low total score but suicidal ideation present
        { answers: [1, 0, 0, 0, 0, 0, 0, 0, 1], shouldTrigger: true },
      ];

      testCases.forEach(({ answers, shouldTrigger }, index) => {
        const score = store.calculateScore('phq9', answers);
        const severity = store.getSeverityLevel('phq9', score);
        
        const assessment: Assessment = {
          id: `suicidal-test-${index}`,
          type: 'phq9',
          answers,
          score,
          severity: severity as Assessment['severity'],
          completedAt: new Date().toISOString(),
          context: 'standalone'
        };

        const needsCrisis = requiresCrisisIntervention(assessment);
        expect(needsCrisis).toBe(shouldTrigger);
      });
    });
  });

  describe('Comprehensive Boundary Testing', () => {
    test('All PHQ-9 Score Boundaries', () => {
      // Test every single possible score (0-27)
      for (let targetScore = 0; targetScore <= 27; targetScore++) {
        // Generate valid answers that sum to target score
        const answers = generateValidPHQ9Answers(targetScore);
        const calculatedScore = store.calculateScore('phq9', answers);
        
        expect(calculatedScore).toBe(targetScore);
        
        // Verify severity is correct for this score
        const expectedSeverity = getPHQ9SeverityForScore(targetScore);
        const actualSeverity = store.getSeverityLevel('phq9', calculatedScore);
        expect(actualSeverity).toBe(expectedSeverity);
      }
    });

    test('All GAD-7 Score Boundaries', () => {
      // Test every single possible score (0-21)
      for (let targetScore = 0; targetScore <= 21; targetScore++) {
        // Generate valid answers that sum to target score
        const answers = generateValidGAD7Answers(targetScore);
        const calculatedScore = store.calculateScore('gad7', answers);
        
        expect(calculatedScore).toBe(targetScore);
        
        // Verify severity is correct for this score
        const expectedSeverity = getGAD7SeverityForScore(targetScore);
        const actualSeverity = store.getSeverityLevel('gad7', calculatedScore);
        expect(actualSeverity).toBe(expectedSeverity);
      }
    });
  });
});

// Helper functions for comprehensive testing

function generateValidPHQ9Answers(targetScore: number): number[] {
  // Generate valid PHQ-9 answers (9 questions, 0-3 each) that sum to targetScore
  const answers = new Array(9).fill(0);
  let remaining = targetScore;
  
  for (let i = 0; i < 9 && remaining > 0; i++) {
    const maxForThisQuestion = Math.min(3, remaining);
    answers[i] = maxForThisQuestion;
    remaining -= maxForThisQuestion;
  }
  
  return answers;
}

function generateValidGAD7Answers(targetScore: number): number[] {
  // Generate valid GAD-7 answers (7 questions, 0-3 each) that sum to targetScore
  const answers = new Array(7).fill(0);
  let remaining = targetScore;
  
  for (let i = 0; i < 7 && remaining > 0; i++) {
    const maxForThisQuestion = Math.min(3, remaining);
    answers[i] = maxForThisQuestion;
    remaining -= maxForThisQuestion;
  }
  
  return answers;
}

function getPHQ9SeverityForScore(score: number): string {
  if (score <= 4) return 'minimal';
  if (score <= 9) return 'mild';
  if (score <= 14) return 'moderate';
  if (score <= 19) return 'moderately severe';
  return 'severe';
}

function getGAD7SeverityForScore(score: number): string {
  if (score <= 4) return 'minimal';
  if (score <= 9) return 'mild';
  if (score <= 14) return 'moderate';
  return 'severe';
}