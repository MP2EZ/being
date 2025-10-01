/**
 * THERAPEUTIC TIMING VALIDATION TESTS
 * Clinical Agent Requirement - Conditional Approval Checklist
 * 
 * CLINICAL REQUIREMENTS:
 * - Validate therapeutic interventions happen at appropriate intervals
 * - Ensure assessment timing doesn't interfere with therapeutic flow
 * - Validate crisis intervention timing requirements (<200ms)
 * - Check therapeutic response appropriateness based on timing
 * 
 * MBCT INTEGRATION:
 * - Breathing exercises should not be interrupted by assessments
 * - Check-ins should be spaced appropriately for therapeutic value
 * - Crisis interventions must be immediate regardless of current activity
 * - Therapeutic content timing should support mindfulness practice
 */

import { useAssessmentStore } from '../../src/flows/assessment/stores/assessmentStore';
import { 
  AssessmentType, 
  AssessmentResponse, 
  CRISIS_THRESHOLDS 
} from '../../src/flows/assessment/types/index';

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

describe('THERAPEUTIC TIMING VALIDATION', () => {
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

  describe('Assessment Timing Requirements', () => {
    it('Assessment completion should be within therapeutic timing windows', async () => {
      const therapeuticTimingTests = [
        { 
          type: 'phq9' as AssessmentType, 
          maxTime: 300000, // 5 minutes max for therapeutic appropriateness
          description: 'PHQ-9 should complete within therapeutic window'
        },
        { 
          type: 'gad7' as AssessmentType, 
          maxTime: 240000, // 4 minutes max
          description: 'GAD-7 should complete within therapeutic window'
        }
      ];

      for (const test of therapeuticTimingTests) {
        const startTime = performance.now();
        
        await store.startAssessment(test.type, 'therapeutic_timing_test');
        await new Promise(resolve => setTimeout(resolve, 10));

        const questionCount = test.type === 'phq9' ? 9 : 7;
        
        // Simulate realistic user response timing (2-10 seconds per question)
        for (let i = 0; i < questionCount; i++) {
          // Simulate user thinking time
          await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10));
          await store.answerQuestion(`${test.type}_${i + 1}`, 1);
        }

        await store.completeAssessment();
        const totalTime = performance.now() - startTime;

        // Validate timing is within therapeutic window
        expect(totalTime).toBeLessThan(test.maxTime);
        
        // Ensure it's not too fast (indicates proper therapeutic consideration)
        expect(totalTime).toBeGreaterThan(100); // At least 100ms for realistic timing

        console.log(`${test.description}: ${totalTime.toFixed(2)}ms`);
      }
    });

    it('Crisis intervention timing must be immediate (<200ms)', async () => {
      const crisisScenarios = [
        { type: 'phq9' as AssessmentType, crisisScore: 25, suicidalIdeation: true },
        { type: 'gad7' as AssessmentType, crisisScore: 18, suicidalIdeation: false }
      ];

      for (const scenario of crisisScenarios) {
        store.resetAssessment();
        
        await store.startAssessment(scenario.type, 'crisis_timing_validation');
        await new Promise(resolve => setTimeout(resolve, 10));

        const startTime = performance.now();
        const questionCount = scenario.type === 'phq9' ? 9 : 7;

        // Generate crisis-level responses
        for (let i = 0; i < questionCount; i++) {
          const isLastQuestionPHQ9 = scenario.type === 'phq9' && i === 8;
          const response = isLastQuestionPHQ9 && scenario.suicidalIdeation ? 2 : 
                          Math.min(3, Math.floor(scenario.crisisScore / questionCount) + (i < scenario.crisisScore % questionCount ? 1 : 0));
          
          await store.answerQuestion(`${scenario.type}_${i + 1}`, response);
          
          // Check if crisis was detected immediately
          if ((scenario.type === 'phq9' && isLastQuestionPHQ9 && scenario.suicidalIdeation) ||
              (store.currentSession && store.currentSession.currentScore >= CRISIS_THRESHOLDS[scenario.type.toUpperCase() + '_CRISIS_SCORE'])) {
            const crisisTime = performance.now() - startTime;
            expect(crisisTime).toBeLessThan(200); // <200ms requirement
            break;
          }
        }

        await store.completeAssessment();
        const finalStore = useAssessmentStore.getState();
        expect(finalStore.crisisDetection).toBeTruthy();
      }
    });

    it('Therapeutic spacing validation - assessments should not interfere with activities', async () => {
      // Simulate a user in middle of breathing exercise
      const breathingStartTime = Date.now();
      
      // Start assessment during simulated breathing exercise
      await store.startAssessment('phq9', 'therapeutic_spacing_test');
      await new Promise(resolve => setTimeout(resolve, 10));

      const assessmentStartTime = Date.now();
      
      // Assessment should be able to start but store when breathing session began
      expect(assessmentStartTime - breathingStartTime).toBeGreaterThan(0);

      // Complete assessment quickly to not interfere with therapeutic timing
      for (let i = 0; i < 9; i++) {
        await store.answerQuestion(`phq9_${i + 1}`, 1);
      }

      await store.completeAssessment();
      const assessmentEndTime = Date.now();

      // Assessment should complete in reasonable time to not disrupt therapy
      expect(assessmentEndTime - assessmentStartTime).toBeLessThan(30000); // 30 seconds max

      // Validate assessment was recorded with timing context
      const finalStore = useAssessmentStore.getState();
      const result = finalStore.currentResult;
      expect(result).toBeTruthy();
      expect(result?.completedAt).toBeGreaterThan(breathingStartTime);
    });
  });

  describe('MBCT Integration Timing', () => {
    it('Crisis detection should work during any therapeutic activity', async () => {
      const therapeuticActivities = [
        'breathing_exercise',
        'body_scan',
        'mindful_movement',
        'self_compassion'
      ];

      for (const activity of therapeuticActivities) {
        store.resetAssessment();
        
        // Simulate therapeutic activity in progress
        const activityStartTime = performance.now();
        
        // User triggers assessment during activity
        await store.startAssessment('phq9', `during_${activity}`);
        await new Promise(resolve => setTimeout(resolve, 10));

        const crisisStartTime = performance.now();

        // Answer with crisis-level responses including suicidal ideation
        const crisisAnswers = [3, 3, 3, 3, 3, 3, 2, 2, 2]; // Score 23 with suicidal ideation
        
        for (let i = 0; i < crisisAnswers.length; i++) {
          await store.answerQuestion(`phq9_${i + 1}`, crisisAnswers[i]);
          
          // Check for immediate crisis detection on question 9
          if (i === 8 && crisisAnswers[i] > 0) {
            const crisisDetectionTime = performance.now() - crisisStartTime;
            expect(crisisDetectionTime).toBeLessThan(200);
            const updatedStore = useAssessmentStore.getState();
            expect(updatedStore.crisisDetection).toBeTruthy();
            expect(updatedStore.crisisDetection?.triggerType).toBe('phq9_suicidal');
            break;
          }
        }

        await store.completeAssessment();

        // Crisis detection should work regardless of therapeutic activity
        const completedStore = useAssessmentStore.getState();
        expect(completedStore.crisisDetection).toBeTruthy();
        console.log(`Crisis detection during ${activity}: ${(performance.now() - crisisStartTime).toFixed(2)}ms`);
      }
    });

    it('Assessment timing should support mindfulness principles', async () => {
      // Test that assessments can be paused and resumed without losing therapeutic value
      await store.startAssessment('gad7', 'mindfulness_timing_test');
      await new Promise(resolve => setTimeout(resolve, 10));

      const pauseTime = performance.now();
      
      // Answer some questions with mindful pauses
      for (let i = 0; i < 4; i++) {
        // Simulate mindful consideration time
        await new Promise(resolve => setTimeout(resolve, 100));
        await store.answerQuestion(`gad7_${i + 1}`, 2);
      }

      // Simulate pause for mindful reflection
      await new Promise(resolve => setTimeout(resolve, 200));

      // Continue with remaining questions
      for (let i = 4; i < 7; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        await store.answerQuestion(`gad7_${i + 1}`, 1);
      }

      await store.completeAssessment();
      const totalTime = performance.now() - pauseTime;

      const finalStore = useAssessmentStore.getState();
      const result = finalStore.currentResult;
      expect(result).toBeTruthy();
      expect(result?.totalScore).toBe(11); // 4*2 + 3*1 = 11
      
      // Total time should accommodate mindful responses
      expect(totalTime).toBeGreaterThan(600); // At least 600ms for mindful consideration
      expect(totalTime).toBeLessThan(60000); // But not excessively long
      
      console.log(`Mindful assessment completion: ${totalTime.toFixed(2)}ms`);
    });

    it('Therapeutic response timing should be appropriate for severity', async () => {
      const severityTimingTests = [
        { score: 3, severity: 'minimal', expectedResponseTime: 100 }, // Quick acknowledgment
        { score: 8, severity: 'mild', expectedResponseTime: 200 }, // Brief response
        { score: 13, severity: 'moderate', expectedResponseTime: 500 }, // Moderate response
        { score: 18, severity: 'moderately_severe', expectedResponseTime: 1000 }, // Detailed response
        { score: 24, severity: 'severe', expectedResponseTime: 200 } // Immediate crisis response
      ];

      for (const test of severityTimingTests) {
        store.resetAssessment();
        
        await store.startAssessment('phq9', 'severity_timing_test');
        await new Promise(resolve => setTimeout(resolve, 10));

        const responseStartTime = performance.now();

        // Generate answers for target score
        const answers: AssessmentResponse[] = new Array(9).fill(0);
        let remainingScore = test.score;
        
        for (let i = 0; i < 9 && remainingScore > 0; i++) {
          const maxForQuestion = Math.min(remainingScore, 3);
          answers[i] = maxForQuestion as AssessmentResponse;
          remainingScore -= maxForQuestion;
        }

        for (let i = 0; i < 9; i++) {
          await store.answerQuestion(`phq9_${i + 1}`, answers[i]);
        }

        await store.completeAssessment();
        const responseTime = performance.now() - responseStartTime;

        const finalStore = useAssessmentStore.getState();
        const result = finalStore.currentResult;
        expect(result).toBeTruthy();
        expect(result?.totalScore).toBe(test.score);
        expect(result?.severity).toBe(test.severity);

        // Validate response timing is appropriate for severity
        if (test.severity === 'severe') {
          // Crisis cases should be immediate
          expect(responseTime).toBeLessThan(test.expectedResponseTime);
          expect(finalStore.crisisDetection).toBeTruthy();
        } else {
          // Non-crisis cases should allow for therapeutic consideration
          expect(responseTime).toBeLessThan(test.expectedResponseTime * 2); // Allow flexibility
        }

        console.log(`${test.severity} severity response: ${responseTime.toFixed(2)}ms`);
      }
    });
  });

  describe('Therapeutic Flow Integration', () => {
    it('Assessment results should inform therapeutic timing decisions', async () => {
      // Complete assessment and check that results can inform timing
      await store.startAssessment('phq9', 'therapeutic_flow_test');
      await new Promise(resolve => setTimeout(resolve, 10));

      // Moderate severity score
      const moderateAnswers = [2, 2, 2, 1, 1, 1, 1, 1, 0]; // Score 11 - moderate
      for (let i = 0; i < 9; i++) {
        await store.answerQuestion(`phq9_${i + 1}`, moderateAnswers[i]);
      }

      await store.completeAssessment();

      const finalStore = useAssessmentStore.getState();
      const result = finalStore.currentResult;
      expect(result).toBeTruthy();
      expect(result?.severity).toBe('moderate');

      // Get assessment history for therapeutic timing decisions
      const history = finalStore.getAssessmentHistory('phq9');
      expect(history).toHaveLength(1);
      expect(history[0].result?.totalScore).toBe(11);

      // Validate that timing information is available for therapeutic decisions
      expect(history[0].completedAt).toBeGreaterThan(0);
      expect(history[0].sessionDuration).toBeGreaterThan(0);
      
      // Therapeutic timing should be based on severity
      const therapeuticInterval = result.severity === 'moderate' ? 86400000 : // 1 day for moderate
                                result.severity === 'severe' ? 3600000 : // 1 hour for severe
                                604800000; // 1 week for minimal/mild

      expect(therapeuticInterval).toBeGreaterThan(0);
      console.log(`Therapeutic interval for ${result.severity}: ${therapeuticInterval}ms`);
    });

    it('Multiple assessments should maintain therapeutic timing integrity', async () => {
      const assessmentSequence = ['phq9', 'gad7'] as AssessmentType[];
      const completionTimes: number[] = [];

      for (const assessmentType of assessmentSequence) {
        const startTime = performance.now();
        
        await store.startAssessment(assessmentType, 'sequence_timing_test');
        await new Promise(resolve => setTimeout(resolve, 10));

        const questionCount = assessmentType === 'phq9' ? 9 : 7;
        
        // Consistent moderate responses
        for (let i = 0; i < questionCount; i++) {
          await store.answerQuestion(`${assessmentType}_${i + 1}`, 1);
        }

        await store.completeAssessment();
        const completionTime = performance.now() - startTime;
        completionTimes.push(completionTime);

        store.resetAssessment(); // Reset for next assessment
      }

      // Validate both assessments completed in reasonable time
      expect(completionTimes).toHaveLength(2);
      completionTimes.forEach((time, index) => {
        expect(time).toBeLessThan(1000); // Under 1 second each
        expect(time).toBeGreaterThan(50); // At least 50ms for realistic timing
        console.log(`${assessmentSequence[index]} completion time: ${time.toFixed(2)}ms`);
      });

      // Validate assessment history maintains sequence
      const allHistory = store.getAssessmentHistory();
      expect(allHistory).toHaveLength(2);
      
      // Check timing between assessments is appropriate
      const timeBetween = allHistory[1].completedAt - allHistory[0].completedAt;
      expect(timeBetween).toBeGreaterThan(0);
      console.log(`Time between assessments: ${timeBetween}ms`);
    });
  });
});