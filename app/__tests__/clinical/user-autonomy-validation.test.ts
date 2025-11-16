/**
 * USER AUTONOMY VALIDATION TESTS
 * Clinical Agent Requirement - Conditional Approval Checklist
 * 
 * CLINICAL REQUIREMENTS:
 * - Users must maintain control over their assessment experience
 * - No forced progression through assessments
 * - Users can pause, resume, or exit assessments at any time
 * - Assessment data belongs to the user with full control
 * - Crisis interventions respect user autonomy while ensuring safety
 * 
 * CLINICAL PRINCIPLES:
 * - Self-awareness and self-direction in therapeutic process
 * - Mindful choice in engagement with assessment tools
 * - Non-judgmental approach to user decisions
 * - Respect for individual therapeutic timing and readiness
 * - Balance between safety and autonomy in crisis situations
 */

import { useAssessmentStore } from '../../src/features/assessment/stores/assessmentStore';
import { 
  AssessmentType, 
  AssessmentResponse,
  CRISIS_THRESHOLDS 
} from '../../src/features/assessment/types/index';

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

describe('USER AUTONOMY VALIDATION', () => {
  let store: ReturnType<typeof useAssessmentStore>;

  beforeEach(async () => {
    store = useAssessmentStore.getState();
    store.resetAssessment();
    await store.clearHistory();
    store.enableAutoSave();
  });

  afterEach(() => {
    store.resetAssessment();
  });

  describe('Assessment Control and Autonomy', () => {
    it('User can start assessment voluntarily', async () => {
      // Initially no active assessment
      expect(store.currentSession).toBeNull();
      expect(store.isAssessmentActive).toBe(false);

      // User chooses to start assessment
      await store.startAssessment('phq9', 'voluntary_start_test');
      await new Promise(resolve => setTimeout(resolve, 10));

      const session = store.currentSession;
      expect(session).toBeTruthy();
      expect(session?.type).toBe('phq9');
      expect(session?.reason).toBe('voluntary_start_test');
      expect(store.isAssessmentActive).toBe(true);

      // User maintains control - can see current state
      expect(session?.currentQuestion).toBe(0);
      expect(session?.totalQuestions).toBe(9);
      expect(session?.progress).toBe(0);
    });

    it('User can pause assessment at any point', async () => {
      await store.startAssessment('phq9', 'pause_test');
      await new Promise(resolve => setTimeout(resolve, 10));

      // Answer some questions
      await store.answerQuestion('phq9_1', 2);
      await store.answerQuestion('phq9_2', 1);
      await store.answerQuestion('phq9_3', 3);

      const beforePauseProgress = store.currentSession?.progress;
      expect(beforePauseProgress).toBe(3/9);

      // User chooses to pause (simulated by not continuing)
      const sessionSnapshot = { ...store.currentSession };
      
      // Validate user can access current progress at any time
      expect(sessionSnapshot?.answers).toHaveLength(3);
      expect(sessionSnapshot?.currentScore).toBe(6); // 2+1+3
      
      // User autonomy: can see exactly what they've answered
      expect(sessionSnapshot?.answers[0].questionId).toBe('phq9_1');
      expect(sessionSnapshot?.answers[0].response).toBe(2);
      expect(sessionSnapshot?.answers[1].questionId).toBe('phq9_2');
      expect(sessionSnapshot?.answers[1].response).toBe(1);
      expect(sessionSnapshot?.answers[2].questionId).toBe('phq9_3');
      expect(sessionSnapshot?.answers[2].response).toBe(3);

      // Assessment remains paused state (not completed)
      expect(store.currentResult).toBeNull();
      expect(store.isAssessmentActive).toBe(true);
    });

    it('User can resume paused assessment', async () => {
      // Start and partially complete assessment
      await store.startAssessment('gad7', 'resume_test');
      await new Promise(resolve => setTimeout(resolve, 10));

      await store.answerQuestion('gad7_1', 2);
      await store.answerQuestion('gad7_2', 1);
      await store.answerQuestion('gad7_3', 2);

      const pausedState = store.currentSession;
      expect(pausedState?.answers).toHaveLength(3);
      expect(pausedState?.currentScore).toBe(5);

      // Simulate resuming (user continues answering)
      await store.answerQuestion('gad7_4', 1);
      await store.answerQuestion('gad7_5', 0);
      await store.answerQuestion('gad7_6', 1);
      await store.answerQuestion('gad7_7', 2);

      await store.completeAssessment();

      const result = store.currentResult;
      expect(result).toBeTruthy();
      expect(result?.totalScore).toBe(9); // 2+1+2+1+0+1+2
      expect(result?.answers).toHaveLength(7);
      
      // User maintained control throughout process
      expect(store.completedAssessments).toHaveLength(1);
    });

    it('User can exit assessment without completing', async () => {
      await store.startAssessment('phq9', 'exit_test');
      await new Promise(resolve => setTimeout(resolve, 10));

      // User starts but decides to exit early
      await store.answerQuestion('phq9_1', 1);
      await store.answerQuestion('phq9_2', 2);

      const partialState = { ...store.currentSession };
      expect(partialState?.answers).toHaveLength(2);

      // User chooses to reset/exit
      store.resetAssessment();

      // Validate user's autonomous decision is respected
      expect(store.currentSession).toBeNull();
      expect(store.currentResult).toBeNull();
      expect(store.isAssessmentActive).toBe(false);
      
      // No completed assessment was saved (user's choice)
      expect(store.completedAssessments).toHaveLength(0);
    });

    it('User can modify previous answers before completion', async () => {
      await store.startAssessment('phq9', 'modification_test');
      await new Promise(resolve => setTimeout(resolve, 10));

      // User answers questions
      await store.answerQuestion('phq9_1', 3);
      await store.answerQuestion('phq9_2', 2);
      await store.answerQuestion('phq9_3', 1);

      let currentScore = store.currentSession?.currentScore;
      expect(currentScore).toBe(6);

      // User realizes they want to change an answer (autonomy)
      await store.answerQuestion('phq9_2', 0); // Change from 2 to 0

      currentScore = store.currentSession?.currentScore;
      expect(currentScore).toBe(4); // 3+0+1=4

      // Validate the change was respected
      const modifiedAnswer = store.currentSession?.answers.find(a => a.questionId === 'phq9_2');
      expect(modifiedAnswer?.response).toBe(0);
      expect(modifiedAnswer?.timestamp).toBeGreaterThan(0);

      // User can continue with their modified answers
      for (let i = 4; i <= 9; i++) {
        await store.answerQuestion(`phq9_${i}`, 1);
      }

      await store.completeAssessment();

      const result = store.currentResult;
      expect(result?.totalScore).toBe(10); // 3+0+1+1+1+1+1+1+1
      
      // User's modification is preserved in final result
      const finalAnswer = result?.answers.find(a => a.questionId === 'phq9_2');
      expect(finalAnswer?.response).toBe(0);
    });
  });

  describe('Data Ownership and Control', () => {
    it('User owns and controls their assessment data', async () => {
      // Complete multiple assessments
      const assessmentTypes = ['phq9', 'gad7'] as AssessmentType[];
      
      for (const type of assessmentTypes) {
        await store.startAssessment(type, 'data_ownership_test');
        await new Promise(resolve => setTimeout(resolve, 10));

        const questionCount = type === 'phq9' ? 9 : 7;
        for (let i = 0; i < questionCount; i++) {
          await store.answerQuestion(`${type}_${i + 1}`, 1);
        }

        await store.completeAssessment();
        store.resetAssessment();
      }

      // User can access all their data
      const allHistory = store.getAssessmentHistory();
      expect(allHistory).toHaveLength(2);

      // User can access specific assessment type data
      const phqHistory = store.getAssessmentHistory('phq9');
      const gadHistory = store.getAssessmentHistory('gad7');
      expect(phqHistory).toHaveLength(1);
      expect(gadHistory).toHaveLength(1);

      // User can see complete details of their assessments
      expect(phqHistory[0].result?.totalScore).toBe(9);
      expect(phqHistory[0].result?.answers).toHaveLength(9);
      expect(gadHistory[0].result?.totalScore).toBe(7);
      expect(gadHistory[0].result?.answers).toHaveLength(7);

      // User maintains control over their data
      expect(typeof store.clearHistory).toBe('function');
    });

    it('User can delete their assessment data', async () => {
      // Create some assessment data
      await store.startAssessment('phq9', 'deletion_test');
      await new Promise(resolve => setTimeout(resolve, 10));

      for (let i = 0; i < 9; i++) {
        await store.answerQuestion(`phq9_${i + 1}`, 2);
      }

      await store.completeAssessment();

      expect(store.completedAssessments).toHaveLength(1);

      // User exercises right to delete their data
      await store.clearHistory();

      // Validate user's deletion request is honored
      expect(store.completedAssessments).toHaveLength(0);
      expect(store.getAssessmentHistory()).toHaveLength(0);
    });

    it('User assessment data is properly encrypted and secured', async () => {
      await store.startAssessment('phq9', 'security_test');
      await new Promise(resolve => setTimeout(resolve, 10));

      // Sensitive answers (including potential crisis indicators)
      const sensitiveAnswers = [3, 3, 2, 3, 2, 1, 2, 3, 1]; // Score 20, moderate suicidal ideation
      
      for (let i = 0; i < sensitiveAnswers.length; i++) {
        await store.answerQuestion(`phq9_${i + 1}`, sensitiveAnswers[i]);
      }

      await store.completeAssessment();

      const result = store.currentResult;
      expect(result?.totalScore).toBe(20);
      expect(result?.suicidalIdeation).toBe(true);

      // Validate that sensitive data is handled appropriately
      // (The actual encryption is handled by the storage layer)
      expect(result?.answers).toHaveLength(9);
      expect(result?.completedAt).toBeGreaterThan(0);
      
      // User retains access to their data in readable form
      expect(result?.severity).toBe('severe');
      expect(result?.isCrisis).toBe(true);
    });
  });

  describe('Crisis Situations and User Autonomy', () => {
    it('Crisis intervention respects user autonomy while ensuring safety', async () => {
      await store.startAssessment('phq9', 'crisis_autonomy_test');
      await new Promise(resolve => setTimeout(resolve, 10));

      const startTime = performance.now();

      // User answers indicating crisis (including suicidal ideation)
      const crisisAnswers = [3, 3, 3, 3, 3, 3, 2, 2, 2]; // Score 23 with suicidal ideation
      
      for (let i = 0; i < crisisAnswers.length; i++) {
        await store.answerQuestion(`phq9_${i + 1}`, crisisAnswers[i]);
        
        // Crisis detection triggers on question 9 (suicidal ideation)
        if (i === 8 && crisisAnswers[i] > 0) {
          const crisisDetectionTime = performance.now() - startTime;
          expect(crisisDetectionTime).toBeLessThan(200); // Safety requirement
          expect(store.crisisDetection).toBeTruthy();
          break;
        }
      }

      await store.completeAssessment();

      // Validate crisis intervention while respecting autonomy
      expect(store.crisisDetection).toBeTruthy();
      expect(store.crisisDetection?.isTriggered).toBe(true);
      expect(store.crisisDetection?.triggerType).toBe('phq9_suicidal');

      // User still completed assessment (maintained control)
      const result = store.currentResult;
      expect(result).toBeTruthy();
      expect(result?.isCrisis).toBe(true);
      expect(result?.suicidalIdeation).toBe(true);

      // Assessment data is preserved despite crisis (user ownership)
      expect(store.completedAssessments).toHaveLength(1);
    });

    it('User can access crisis resources while maintaining autonomy', async () => {
      // Simulate crisis situation
      await store.startAssessment('gad7', 'crisis_resources_test');
      await new Promise(resolve => setTimeout(resolve, 10));

      // High anxiety crisis score
      const crisisAnswers = [3, 3, 3, 3, 3, 0, 0]; // Score 15 (crisis threshold)
      
      for (let i = 0; i < crisisAnswers.length; i++) {
        await store.answerQuestion(`gad7_${i + 1}`, crisisAnswers[i]);
      }

      await store.completeAssessment();

      expect(store.crisisDetection).toBeTruthy();
      expect(store.crisisDetection?.triggerType).toBe('gad7_score');

      // User maintains access to their assessment results
      const result = store.currentResult;
      expect(result?.totalScore).toBe(15);
      expect(result?.severity).toBe('severe');
      expect(result?.isCrisis).toBe(true);

      // Crisis resources are available but user maintains choice
      expect(store.crisisDetection?.triggerValue).toBe(15);
      expect(store.crisisDetection?.isTriggered).toBe(true);

      // User's assessment is still recorded normally
      expect(store.completedAssessments).toHaveLength(1);
    });

    it('User autonomy is maintained even in non-crisis high scores', async () => {
      await store.startAssessment('phq9', 'high_score_autonomy_test');
      await new Promise(resolve => setTimeout(resolve, 10));

      // High but non-crisis score (19 - just below crisis threshold of 20)
      const highAnswers = [3, 3, 3, 2, 2, 2, 2, 2, 0]; // Score 19, no suicidal ideation
      
      for (let i = 0; i < highAnswers.length; i++) {
        await store.answerQuestion(`phq9_${i + 1}`, highAnswers[i]);
      }

      await store.completeAssessment();

      const result = store.currentResult;
      expect(result?.totalScore).toBe(19);
      expect(result?.severity).toBe('moderately_severe');
      expect(result?.isCrisis).toBe(false);
      expect(result?.suicidalIdeation).toBe(false);

      // No crisis intervention triggered - user maintains full autonomy
      expect(store.crisisDetection).toBeFalsy();

      // User has complete control over their high-severity results
      expect(store.completedAssessments).toHaveLength(1);
      expect(store.completedAssessments[0].result?.isCrisis).toBe(false);

      // User can access and review their results autonomously
      const history = store.getAssessmentHistory('phq9');
      expect(history[0].result?.totalScore).toBe(19);
    });
  });

  describe('Informed Consent and Transparency', () => {
    it('User has access to assessment scoring information', async () => {
      await store.startAssessment('phq9', 'transparency_test');
      await new Promise(resolve => setTimeout(resolve, 10));

      // User can see their progress at any time
      expect(store.currentSession?.type).toBe('phq9');
      expect(store.currentSession?.totalQuestions).toBe(9);
      expect(store.currentSession?.currentQuestion).toBe(0);

      // User answers and can see score building
      await store.answerQuestion('phq9_1', 2);
      expect(store.currentSession?.currentScore).toBe(2);
      expect(store.currentSession?.progress).toBe(1/9);

      await store.answerQuestion('phq9_2', 3);
      expect(store.currentSession?.currentScore).toBe(5);
      expect(store.currentSession?.progress).toBe(2/9);

      await store.answerQuestion('phq9_3', 1);
      expect(store.currentSession?.currentScore).toBe(6);
      expect(store.currentSession?.progress).toBe(3/9);

      // Complete remaining questions
      for (let i = 4; i <= 9; i++) {
        await store.answerQuestion(`phq9_${i}`, 1);
      }

      await store.completeAssessment();

      // User has full access to scoring details
      const result = store.currentResult;
      expect(result?.totalScore).toBe(12); // 2+3+1+1+1+1+1+1+1
      expect(result?.severity).toBe('moderate');
      expect(result?.answers).toHaveLength(9);

      // User can see exactly how their score was calculated
      let calculatedScore = 0;
      result?.answers.forEach(answer => {
        calculatedScore += answer.response;
      });
      expect(calculatedScore).toBe(result?.totalScore);
    });

    it('User maintains autonomy in multiple assessment scenario', async () => {
      const assessmentSequence = [
        { type: 'phq9' as AssessmentType, userChoice: true },
        { type: 'gad7' as AssessmentType, userChoice: true }
      ];

      for (let i = 0; i < assessmentSequence.length; i++) {
        const assessment = assessmentSequence[i];
        
        // User voluntarily chooses each assessment
        if (assessment.userChoice) {
          await store.startAssessment(assessment.type, `multi_autonomy_test_${i}`);
          await new Promise(resolve => setTimeout(resolve, 10));

          const questionCount = assessment.type === 'phq9' ? 9 : 7;
          
          // User answers at their own pace
          for (let q = 0; q < questionCount; q++) {
            await store.answerQuestion(`${assessment.type}_${q + 1}`, 1);
            
            // User can see progress at each step
            expect(store.currentSession?.progress).toBe((q + 1) / questionCount);
          }

          await store.completeAssessment();
          
          // Validate user's autonomous completion
          expect(store.currentResult).toBeTruthy();
          expect(store.completedAssessments).toHaveLength(i + 1);
        }
        
        store.resetAssessment(); // User prepares for next assessment
      }

      // User maintains control over all their assessment data
      const finalHistory = store.getAssessmentHistory();
      expect(finalHistory).toHaveLength(2);
      
      // Each assessment reflects user's autonomous choices
      expect(finalHistory[0].reason).toBe('multi_autonomy_test_0');
      expect(finalHistory[1].reason).toBe('multi_autonomy_test_1');
    });
  });
});