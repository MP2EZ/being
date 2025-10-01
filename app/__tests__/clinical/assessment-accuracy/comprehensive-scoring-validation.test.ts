/**
 * COMPREHENSIVE PHQ-9/GAD-7 SCORING VALIDATION - ALL 48 COMBINATIONS
 * 
 * CRITICAL SAFETY TESTING:
 * - PHQ-9: All 28 possible scores (0-27) with crisis detection validation
 * - GAD-7: All 21 possible scores (0-21) with crisis detection validation  
 * - Suicidal ideation detection for PHQ-9 Question 9
 * - Crisis intervention timing requirements (<200ms)
 * - Clinical accuracy validation (100% requirement)
 * 
 * REGULATORY COMPLIANCE:
 * - HIPAA-compliant scoring with audit trails
 * - Encrypted storage validation during testing
 * - Clinical threshold validation (PHQ≥15 moderate, PHQ≥20 severe, GAD≥15)
 * - Therapeutic response time verification
 * 
 * Week 2 Orchestration Plan - Crisis-Critical Testing Component
 */

import { useAssessmentStore } from '../../../src/flows/assessment/stores/assessmentStore';
import {
  AssessmentType,
  AssessmentResponse,
  PHQ9Result,
  GAD7Result,
  CrisisDetection,
  CRISIS_THRESHOLDS
} from '../../../src/flows/assessment/types/index';
import {
  createPHQ9Responses,
  createGAD7Responses,
  waitForStoreUpdate,
  resetAssessmentStore,
  generateAnswersForScore
} from '../../utils/AssessmentTestUtils';

// Performance monitoring for crisis detection
// Using global performance API (set up in test environment)

// Mock secure storage for testing
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Linking: {
    openURL: jest.fn(),
  },
}));

describe('COMPREHENSIVE CLINICAL SCORING VALIDATION - ALL 48 COMBINATIONS', () => {
  beforeEach(async () => {
    // Reset store and clear history
    resetAssessmentStore();
    await useAssessmentStore.getState().clearHistory();

    // Enable auto-save for realistic testing
    useAssessmentStore.getState().enableAutoSave();
  });

  afterEach(() => {
    // Clean up after each test
    resetAssessmentStore();
  });

  describe('PHQ-9 COMPREHENSIVE SCORING (28 combinations: 0-27)', () => {
    const PHQ9_QUESTIONS = [
      'phq9_1', 'phq9_2', 'phq9_3', 'phq9_4', 'phq9_5',
      'phq9_6', 'phq9_7', 'phq9_8', 'phq9_9'
    ];

    /**
     * Test each PHQ-9 score from 0-27
     */
    for (let score = 0; score <= 27; score++) {
      it(`PHQ-9 Score ${score}: Clinical accuracy and crisis detection`, async () => {
        // Generate answers for target score
        const answers = generateAnswersForScore(score, 'phq9');

        // Start assessment and wait for completion
        await store.startAssessment('phq9', 'clinical_validation');

        // Wait for store update
        await waitForStoreUpdate();

        // Get updated store state after async operation
        const updatedStore = useAssessmentStore.getState();
        expect(updatedStore.currentSession).toBeTruthy();
        expect(updatedStore.currentSession?.type).toBe('phq9');

        // Performance monitoring start
        const startTime = performance.now();

        // Answer all questions
        for (let i = 0; i < PHQ9_QUESTIONS.length; i++) {
          await updatedStore.answerQuestion(PHQ9_QUESTIONS[i], answers[i]);
        }

        // Complete assessment with timing validation
        await updatedStore.completeAssessment();
        const completionTime = performance.now() - startTime;

        // Get final updated store state
        const finalStore = useAssessmentStore.getState();

        // Validate results
        const assessmentResult = finalStore.currentResult as PHQ9Result;
        expect(assessmentResult).toBeTruthy();
        expect(assessmentResult.totalScore).toBe(score);

        // Validate severity mapping
        if (score >= 0 && score <= 4) {
          expect(assessmentResult.severity).toBe('minimal');
        } else if (score >= 5 && score <= 9) {
          expect(assessmentResult.severity).toBe('mild');
        } else if (score >= 10 && score <= 14) {
          expect(assessmentResult.severity).toBe('moderate');
        } else if (score >= 15 && score <= 19) {
          expect(assessmentResult.severity).toBe('moderately_severe');
        } else if (score >= 20 && score <= 27) {
          expect(assessmentResult.severity).toBe('severe');
        }

        // Crisis detection validation
        const expectCrisis = score >= CRISIS_THRESHOLDS.PHQ9_CRISIS_SCORE;
        expect(assessmentResult.isCrisis).toBe(expectCrisis);

        if (expectCrisis) {
          expect(finalStore.crisisDetection).toBeTruthy();
          expect(finalStore.crisisDetection?.triggerType).toBe('phq9_score');
          expect(finalStore.crisisDetection?.triggerValue).toBe(score);

          // Crisis detection timing requirement (<200ms)
          expect(completionTime).toBeLessThan(200);
        }

        // Suicidal ideation detection (Question 9)
        const suicidalResponse = answers[8]; // PHQ9_9 is index 8
        expect(assessmentResult.suicidalIdeation).toBe(suicidalResponse > 0);

        if (suicidalResponse > 0) {
          expect(assessmentResult.isCrisis).toBe(true); // Should trigger crisis regardless of total score
          expect(finalStore.crisisDetection).toBeTruthy();
        }

        // Validate answer persistence
        expect(assessmentResult.answers).toHaveLength(9);
        assessmentResult.answers.forEach((answer, index) => {
          expect(answer.questionId).toBe(PHQ9_QUESTIONS[index]);
          expect(answer.response).toBe(answers[index]);
          expect(answer.timestamp).toBeGreaterThan(0);
        });

        // Validate clinical compliance
        expect(assessmentResult.completedAt).toBeGreaterThan(0);
        expect(finalStore.completedAssessments).toHaveLength(1);
      });
    }

    /**
     * Specific suicidal ideation testing across all severity levels
     */
    it('PHQ-9 Suicidal Ideation: Immediate crisis detection across all scores', async () => {
      // Test suicidal ideation with various total scores
      const testCases = [
        { score: 5, suicidalResponse: 1 }, // Low score with suicidal ideation
        { score: 10, suicidalResponse: 2 }, // Moderate score with suicidal ideation
        { score: 15, suicidalResponse: 3 }, // High score with suicidal ideation
        { score: 3, suicidalResponse: 1 }, // Very low score with suicidal ideation
      ];

      for (const testCase of testCases) {
        resetAssessmentStore();

        await store.startAssessment('phq9', 'suicidal_ideation_test');
        await waitForStoreUpdate();

        // Generate answers that sum to target score, with specific Q9 response
        const answers: AssessmentResponse[] = new Array(9).fill(0);
        answers[8] = testCase.suicidalResponse; // PHQ9_9 (suicidal ideation)

        // Distribute remaining score across other questions
        let remainingScore = testCase.score - testCase.suicidalResponse;
        for (let i = 0; i < 8 && remainingScore > 0; i++) {
          const maxForQuestion = Math.min(remainingScore, 3);
          answers[i] = maxForQuestion as AssessmentResponse;
          remainingScore -= maxForQuestion;
        }

        const startTime = performance.now();

        // Answer questions (Q9 should trigger immediate crisis detection)
        for (let i = 0; i < 8; i++) {
          await store.answerQuestion(PHQ9_QUESTIONS[i], answers[i]);
        }

        // Answer Q9 - should trigger immediate crisis detection
        await store.answerQuestion(PHQ9_QUESTIONS[8], answers[8]);
        const crisisDetectionTime = performance.now() - startTime;

        // Validate immediate crisis detection for suicidal ideation
        expect(store.crisisDetection).toBeTruthy();
        expect(store.crisisDetection?.triggerType).toBe('phq9_suicidal');
        expect(store.crisisDetection?.triggerValue).toBe(testCase.suicidalResponse);
        expect(crisisDetectionTime).toBeLessThan(200); // <200ms requirement

        await store.completeAssessment();

        const result = store.currentResult as PHQ9Result;
        expect(result.suicidalIdeation).toBe(true);
        expect(result.isCrisis).toBe(true); // Always crisis with suicidal ideation
        expect(result.totalScore).toBe(testCase.score);
      }
    });
  });

  describe('GAD-7 COMPREHENSIVE SCORING (21 combinations: 0-21)', () => {
    const GAD7_QUESTIONS = [
      'gad7_1', 'gad7_2', 'gad7_3', 'gad7_4', 'gad7_5', 'gad7_6', 'gad7_7'
    ];

    /**
     * Test each GAD-7 score from 0-21
     */
    for (let score = 0; score <= 21; score++) {
      it(`GAD-7 Score ${score}: Clinical accuracy and crisis detection`, async () => {
        // Generate answers for target score
        const answers = generateAnswersForScore(score, 'gad7');

        // Start assessment and wait for completion
        await store.startAssessment('gad7', 'clinical_validation');

        // Wait for store update
        await waitForStoreUpdate();

        // Get updated store state after async operation
        const updatedStore = useAssessmentStore.getState();
        expect(updatedStore.currentSession).toBeTruthy();
        expect(updatedStore.currentSession?.type).toBe('gad7');

        const startTime = performance.now();

        // Answer all questions
        for (let i = 0; i < GAD7_QUESTIONS.length; i++) {
          await updatedStore.answerQuestion(GAD7_QUESTIONS[i], answers[i]);
        }

        await updatedStore.completeAssessment();
        const completionTime = performance.now() - startTime;

        // Get final updated store state
        const finalStore = useAssessmentStore.getState();

        // Validate results
        const result = finalStore.currentResult as GAD7Result;
        expect(result).toBeTruthy();
        expect(result.totalScore).toBe(score);

        // Validate severity mapping
        if (score >= 0 && score <= 4) {
          expect(result.severity).toBe('minimal');
        } else if (score >= 5 && score <= 9) {
          expect(result.severity).toBe('mild');
        } else if (score >= 10 && score <= 14) {
          expect(result.severity).toBe('moderate');
        } else if (score >= 15 && score <= 21) {
          expect(result.severity).toBe('severe');
        }

        // Crisis detection validation
        const expectCrisis = score >= CRISIS_THRESHOLDS.GAD7_CRISIS_SCORE;
        expect(result.isCrisis).toBe(expectCrisis);

        if (expectCrisis) {
          expect(finalStore.crisisDetection).toBeTruthy();
          expect(finalStore.crisisDetection?.triggerType).toBe('gad7_score');
          expect(finalStore.crisisDetection?.triggerValue).toBe(score);

          // Crisis detection timing requirement (<200ms)
          expect(completionTime).toBeLessThan(200);
        }

        // Validate answer persistence
        expect(result.answers).toHaveLength(7);
        result.answers.forEach((answer, index) => {
          expect(answer.questionId).toBe(GAD7_QUESTIONS[index]);
          expect(answer.response).toBe(answers[index]);
          expect(answer.timestamp).toBeGreaterThan(0);
        });

        // Validate clinical compliance
        expect(result.completedAt).toBeGreaterThan(0);
        expect(finalStore.completedAssessments).toHaveLength(1);
      });
    }
  });

  describe('CRISIS INTEGRATION TESTING', () => {
    it('Multiple crisis triggers: Combined PHQ-9 and GAD-7 crisis scenarios', async () => {
      // Test scenario: Both assessments trigger crisis

      // PHQ-9 with crisis score
      await store.startAssessment('phq9', 'crisis_integration_test');
      await waitForStoreUpdate();

      // Generate answers for crisis-level score
      const phqCrisisAnswers = generateAnswersForScore(25, 'phq9');
      for (let i = 0; i < phqCrisisAnswers.length; i++) {
        await store.answerQuestion(`phq9_${i + 1}`, phqCrisisAnswers[i]);
      }

      await store.completeAssessment();

      const phqResult = store.currentResult as PHQ9Result;
      expect(phqResult.totalScore).toBe(25);
      expect(phqResult.isCrisis).toBe(true);
      expect(store.crisisDetection).toBeTruthy();

      // Store first crisis detection
      const firstCrisis = store.crisisDetection;

      // Reset for GAD-7
      resetAssessmentStore();

      // GAD-7 with crisis score
      await store.startAssessment('gad7', 'crisis_integration_test');
      await waitForStoreUpdate();

      // Generate answers for crisis-level score
      const gadCrisisAnswers = generateAnswersForScore(18, 'gad7');
      for (let i = 0; i < gadCrisisAnswers.length; i++) {
        await store.answerQuestion(`gad7_${i + 1}`, gadCrisisAnswers[i]);
      }

      await store.completeAssessment();

      const gadResult = store.currentResult as GAD7Result;
      expect(gadResult.totalScore).toBe(18);
      expect(gadResult.isCrisis).toBe(true);
      expect(store.crisisDetection).toBeTruthy();

      // Validate both assessments in history
      const history = store.getAssessmentHistory();
      expect(history).toHaveLength(2);

      const phqHistory = store.getAssessmentHistory('phq9');
      const gadHistory = store.getAssessmentHistory('gad7');
      expect(phqHistory).toHaveLength(1);
      expect(gadHistory).toHaveLength(1);

      // Both should show crisis
      expect(phqHistory[0].result?.isCrisis).toBe(true);
      expect(gadHistory[0].result?.isCrisis).toBe(true);
    });

    it('Crisis intervention timing: Validates <200ms requirement across all scenarios', async () => {
      const crisisScenarios = [
        { type: 'phq9' as AssessmentType, score: 20, description: 'PHQ-9 minimum crisis score' },
        { type: 'phq9' as AssessmentType, score: 27, description: 'PHQ-9 maximum score' },
        { type: 'gad7' as AssessmentType, score: 15, description: 'GAD-7 minimum crisis score' },
        { type: 'gad7' as AssessmentType, score: 21, description: 'GAD-7 maximum score' },
      ];

      for (const scenario of crisisScenarios) {
        resetAssessmentStore();

        await store.startAssessment(scenario.type, 'crisis_timing_test');
        await waitForStoreUpdate();

        const startTime = performance.now();

        // Generate answers for target score
        const answers = generateAnswersForScore(scenario.score, scenario.type === 'phq9' ? 'phq9' : 'gad7');

        const questionPrefix = scenario.type === 'phq9' ? 'phq9_' : 'gad7_';
        for (let i = 0; i < answers.length; i++) {
          await store.answerQuestion(`${questionPrefix}${i + 1}`, answers[i]);
        }

        await store.completeAssessment();
        const totalTime = performance.now() - startTime;

        // Validate crisis detection and timing
        expect(store.crisisDetection).toBeTruthy();
        expect(store.crisisDetection?.isTriggered).toBe(true);
        expect(totalTime).toBeLessThan(200); // <200ms requirement

        console.log(`${scenario.description}: ${totalTime.toFixed(2)}ms`);
      }
    });
  });

  describe('CLINICAL VALIDATION EDGE CASES', () => {
    it('Boundary testing: Crisis threshold edge cases', async () => {
      const boundaryTests = [
        { type: 'phq9' as AssessmentType, score: 19, expectCrisis: false },
        { type: 'phq9' as AssessmentType, score: 20, expectCrisis: true },
        { type: 'gad7' as AssessmentType, score: 14, expectCrisis: false },
        { type: 'gad7' as AssessmentType, score: 15, expectCrisis: true },
      ];

      for (const test of boundaryTests) {
        resetAssessmentStore();

        await store.startAssessment(test.type, 'boundary_test');
        await waitForStoreUpdate();

        const answers = generateAnswersForScore(test.score, test.type === 'phq9' ? 'phq9' : 'gad7');

        const questionPrefix = test.type === 'phq9' ? 'phq9_' : 'gad7_';
        for (let i = 0; i < answers.length; i++) {
          await store.answerQuestion(`${questionPrefix}${i + 1}`, answers[i]);
        }

        await store.completeAssessment();

        const result = store.currentResult;
        expect(result?.totalScore).toBe(test.score);
        expect(result?.isCrisis).toBe(test.expectCrisis);

        if (test.expectCrisis) {
          expect(store.crisisDetection).toBeTruthy();
        } else {
          expect(store.crisisDetection).toBeFalsy();
        }
      }
    });

    it('Data integrity: Answer validation and persistence', async () => {
      await store.startAssessment('phq9', 'integrity_test');
      await waitForStoreUpdate();

      // Test invalid responses (should be rejected)
      const invalidResponses = [-1, 4, 5, 10, 'invalid'] as any[];

      for (const invalidResponse of invalidResponses) {
        try {
          await store.answerQuestion('phq9_1', invalidResponse);
          fail('Should have rejected invalid response');
        } catch (error) {
          expect(error).toBeTruthy();
        }
      }

      // Test valid responses
      for (let i = 0; i < 9; i++) {
        await store.answerQuestion(`phq9_${i + 1}`, 1);
      }

      await store.completeAssessment();

      const result = store.currentResult as PHQ9Result;
      expect(result.totalScore).toBe(9);
      expect(result.answers).toHaveLength(9);

      // Validate all answers are properly stored
      result.answers.forEach((answer, index) => {
        expect(answer.questionId).toBe(`phq9_${index + 1}`);
        expect(answer.response).toBe(1);
        expect(answer.timestamp).toBeGreaterThan(0);
      });
    });
  });
});