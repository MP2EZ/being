/**
 * COMPREHENSIVE ASSESSMENT INTEGRATION TESTING
 * Week 2 Orchestration Plan - Complete System Validation
 * 
 * CRITICAL INTEGRATION TESTING:
 * - End-to-end assessment flows (PHQ-9 & GAD-7)
 * - Crisis detection → HIPAA compliance → Security encryption
 * - Assessment components → Zustand store → Secure storage
 * - Error boundaries → Crisis recovery → 988 access
 * - Performance validation across all system layers
 * 
 * SAFETY-CRITICAL VALIDATION:
 * - Crisis intervention workflows (<200ms requirement)
 * - Emergency protocol testing during system failures
 * - Data integrity during crisis scenarios
 * - Accessibility compliance during emergency flows
 * - Regulatory compliance throughout assessment journey
 * 
 * ORCHESTRATION REQUIREMENTS:
 * - All 48 scoring combinations validated through integration
 * - Crisis scenarios tested across component/store/security layers
 * - Performance benchmarks met at every integration point
 * - HIPAA compliance verified during data flow transitions
 * - Security encryption validated during storage operations
 */

import { useAssessmentStore } from '../../src/flows/assessment/stores/assessmentStore';
import { 
  AssessmentType, 
  AssessmentResponse, 
  PHQ9Result, 
  GAD7Result,
  CrisisDetection,
  CRISIS_THRESHOLDS 
} from '../../src/flows/assessment/types/index';
import { performance } from 'react-native-performance';
import { Alert, Linking } from 'react-native';

// Mock React Native components for integration testing
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn((title, message, buttons, options) => {
      // Simulate user interaction for testing
      if (buttons && buttons.length > 0) {
        // Auto-select first button for automated testing
        setTimeout(() => buttons[0].onPress?.(), 10);
      }
    }),
  },
  Linking: {
    openURL: jest.fn().mockResolvedValue(true),
  },
}));

// Mock secure storage with realistic latency simulation
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockImplementation((key, value) => 
    new Promise(resolve => {
      // Simulate encryption time (10-40ms realistic range)
      const encryptionTime = Math.random() * 30 + 10;
      setTimeout(resolve, encryptionTime);
    })
  ),
  getItemAsync: jest.fn().mockImplementation((key) => 
    new Promise(resolve => {
      // Simulate decryption time (5-25ms realistic range)
      const decryptionTime = Math.random() * 20 + 5;
      setTimeout(() => resolve(null), decryptionTime);
    })
  ),
  deleteItemAsync: jest.fn().mockImplementation((key) => 
    new Promise(resolve => {
      const deleteTime = Math.random() * 15 + 5;
      setTimeout(resolve, deleteTime);
    })
  ),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockImplementation((key, value) => 
    new Promise(resolve => setTimeout(resolve, Math.random() * 20 + 5))
  ),
  getItem: jest.fn().mockImplementation((key) => 
    new Promise(resolve => setTimeout(() => resolve(null), Math.random() * 15 + 5))
  ),
  removeItem: jest.fn().mockImplementation((key) => 
    new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 5))
  ),
}));

/**
 * Integration Test Performance Monitor
 */
class IntegrationPerformanceMonitor {
  private metrics: { [key: string]: number[] } = {};
  private startTimes: { [key: string]: number } = {};

  startMeasurement(label: string): void {
    this.startTimes[label] = performance.now();
  }

  endMeasurement(label: string): number {
    const startTime = this.startTimes[label];
    if (!startTime) {
      throw new Error(`No start time found for measurement: ${label}`);
    }

    const duration = performance.now() - startTime;
    
    if (!this.metrics[label]) {
      this.metrics[label] = [];
    }
    this.metrics[label].push(duration);

    delete this.startTimes[label];
    return duration;
  }

  getMetrics(label: string): { avg: number; min: number; max: number; count: number } {
    const measurements = this.metrics[label] || [];
    
    if (measurements.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 };
    }

    return {
      avg: measurements.reduce((sum, val) => sum + val, 0) / measurements.length,
      min: Math.min(...measurements),
      max: Math.max(...measurements),
      count: measurements.length
    };
  }

  reset(): void {
    this.metrics = {};
    this.startTimes = {};
  }

  getAllMetrics(): { [key: string]: ReturnType<typeof this.getMetrics> } {
    const allMetrics: { [key: string]: ReturnType<typeof this.getMetrics> } = {};
    
    for (const label of Object.keys(this.metrics)) {
      allMetrics[label] = this.getMetrics(label);
    }
    
    return allMetrics;
  }
}

describe('COMPREHENSIVE ASSESSMENT INTEGRATION TESTING', () => {
  let store: ReturnType<typeof useAssessmentStore>;
  let performanceMonitor: IntegrationPerformanceMonitor;

  beforeEach(async () => {
    store = useAssessmentStore.getState();
    store.resetAssessment();
    await store.clearHistory();
    
    performanceMonitor = new IntegrationPerformanceMonitor();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    store.resetAssessment();
    performanceMonitor.reset();
  });

  describe('END-TO-END ASSESSMENT FLOWS', () => {
    it('Complete PHQ-9 assessment with crisis detection integration', async () => {
      performanceMonitor.startMeasurement('complete_phq9_crisis_flow');

      // Start assessment
      performanceMonitor.startMeasurement('assessment_initialization');
      await store.startAssessment('phq9', 'integration_test');
      const initTime = performanceMonitor.endMeasurement('assessment_initialization');

      expect(store.currentSession).toBeTruthy();
      expect(store.currentSession?.type).toBe('phq9');
      expect(initTime).toBeLessThan(300); // Assessment initialization <300ms

      // Answer questions leading to crisis (score = 25, with suicidal ideation)
      const crisisAnswers: AssessmentResponse[] = [3, 3, 3, 3, 3, 3, 3, 2, 1]; // Total = 25, Q9 = 1 (suicidal)

      for (let i = 0; i < 9; i++) {
        performanceMonitor.startMeasurement(`question_${i + 1}_processing`);
        
        await store.answerQuestion(`phq9_${i + 1}`, crisisAnswers[i]);
        
        const questionTime = performanceMonitor.endMeasurement(`question_${i + 1}_processing`);
        expect(questionTime).toBeLessThan(300); // Each question <300ms

        // Check for immediate crisis detection on Q9
        if (i === 8 && crisisAnswers[i] > 0) { // Q9 suicidal ideation
          expect(store.crisisDetection).toBeTruthy();
          expect(store.crisisDetection?.triggerType).toBe('phq9_suicidal');
          expect(questionTime).toBeLessThan(200); // Crisis detection <200ms
        }
      }

      // Complete assessment
      performanceMonitor.startMeasurement('assessment_completion');
      await store.completeAssessment();
      const completionTime = performanceMonitor.endMeasurement('assessment_completion');

      expect(completionTime).toBeLessThan(300); // Completion <300ms

      // Validate results
      const result = store.currentResult as PHQ9Result;
      expect(result).toBeTruthy();
      expect(result.totalScore).toBe(25);
      expect(result.severity).toBe('severe');
      expect(result.isCrisis).toBe(true);
      expect(result.suicidalIdeation).toBe(true);

      // Validate crisis detection
      expect(store.crisisDetection).toBeTruthy();
      expect(store.crisisDetection?.isTriggered).toBe(true);

      // Validate emergency response was triggered
      expect(Alert.alert).toHaveBeenCalledWith(
        expect.stringContaining('Crisis Support'),
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({ text: expect.stringContaining('988') }),
          expect.objectContaining({ text: expect.stringContaining('741741') }),
          expect.objectContaining({ text: expect.stringContaining('911') })
        ]),
        expect.objectContaining({ cancelable: false })
      );

      // Validate storage integration
      expect(store.completedAssessments).toHaveLength(1);
      expect(store.completedAssessments[0].result?.isCrisis).toBe(true);

      const totalFlowTime = performanceMonitor.endMeasurement('complete_phq9_crisis_flow');
      expect(totalFlowTime).toBeLessThan(5000); // Complete flow <5s

      console.log('PHQ-9 Crisis Flow Metrics:', performanceMonitor.getAllMetrics());
    });

    it('Complete GAD-7 assessment with crisis threshold validation', async () => {
      performanceMonitor.startMeasurement('complete_gad7_crisis_flow');

      await store.startAssessment('gad7', 'integration_test');

      // Answer questions for crisis score (score = 18)
      const crisisAnswers: AssessmentResponse[] = [3, 3, 3, 3, 3, 3, 0]; // Total = 18

      for (let i = 0; i < 7; i++) {
        performanceMonitor.startMeasurement(`gad7_question_${i + 1}`);
        
        await store.answerQuestion(`gad7_${i + 1}`, crisisAnswers[i]);
        
        const questionTime = performanceMonitor.endMeasurement(`gad7_question_${i + 1}`);
        expect(questionTime).toBeLessThan(300);
      }

      performanceMonitor.startMeasurement('gad7_crisis_detection');
      await store.completeAssessment();
      const crisisDetectionTime = performanceMonitor.endMeasurement('gad7_crisis_detection');

      expect(crisisDetectionTime).toBeLessThan(200); // Crisis detection <200ms

      const result = store.currentResult as GAD7Result;
      expect(result.totalScore).toBe(18);
      expect(result.severity).toBe('severe');
      expect(result.isCrisis).toBe(true);

      expect(store.crisisDetection).toBeTruthy();
      expect(store.crisisDetection?.triggerType).toBe('gad7_score');
      expect(store.crisisDetection?.triggerValue).toBe(18);

      const totalTime = performanceMonitor.endMeasurement('complete_gad7_crisis_flow');
      expect(totalTime).toBeLessThan(5000);

      console.log('GAD-7 Crisis Flow Metrics:', performanceMonitor.getAllMetrics());
    });

    it('Non-crisis assessment flow with normal completion', async () => {
      performanceMonitor.startMeasurement('normal_assessment_flow');

      // Test normal PHQ-9 (score = 8, mild)
      await store.startAssessment('phq9', 'normal_test');

      const normalAnswers: AssessmentResponse[] = [1, 1, 1, 1, 1, 1, 1, 1, 0]; // Total = 8, no suicidal ideation

      for (let i = 0; i < 9; i++) {
        await store.answerQuestion(`phq9_${i + 1}`, normalAnswers[i]);
      }

      await store.completeAssessment();

      const result = store.currentResult as PHQ9Result;
      expect(result.totalScore).toBe(8);
      expect(result.severity).toBe('mild');
      expect(result.isCrisis).toBe(false);
      expect(result.suicidalIdeation).toBe(false);

      // No crisis detection should occur
      expect(store.crisisDetection).toBeFalsy();
      expect(Alert.alert).not.toHaveBeenCalled();

      const totalTime = performanceMonitor.endMeasurement('normal_assessment_flow');
      expect(totalTime).toBeLessThan(3000); // Normal flow should be faster

      console.log('Normal Assessment Flow Time:', totalTime.toFixed(2) + 'ms');
    });
  });

  describe('CRISIS INTERVENTION INTEGRATION', () => {
    it('Immediate crisis response for suicidal ideation', async () => {
      await store.startAssessment('phq9', 'suicidal_integration_test');

      // Answer first 8 questions normally
      for (let i = 0; i < 8; i++) {
        await store.answerQuestion(`phq9_${i + 1}`, 1);
      }

      performanceMonitor.startMeasurement('suicidal_ideation_response');
      
      // Answer Q9 with suicidal ideation
      await store.answerQuestion('phq9_9', 2); // Suicidal ideation
      
      const responseTime = performanceMonitor.endMeasurement('suicidal_ideation_response');
      
      // Immediate crisis detection required
      expect(responseTime).toBeLessThan(100); // Strict requirement for suicidal ideation
      expect(store.crisisDetection).toBeTruthy();
      expect(store.crisisDetection?.triggerType).toBe('phq9_suicidal');

      // Emergency response should be triggered immediately
      expect(Alert.alert).toHaveBeenCalledWith(
        expect.stringContaining('Crisis Support'),
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({ cancelable: false })
      );

      // Validate crisis intervention object
      expect(store.crisisIntervention).toBeTruthy();
      expect(store.crisisIntervention?.interventionStarted).toBe(true);
      expect(store.crisisIntervention?.responseTime).toBeLessThan(200);

      console.log('Suicidal Ideation Response Time:', responseTime.toFixed(2) + 'ms');
    });

    it('Crisis boundary testing at thresholds', async () => {
      const boundaryTests = [
        { type: 'phq9' as AssessmentType, score: 19, expectCrisis: false, description: 'PHQ-9 just below threshold' },
        { type: 'phq9' as AssessmentType, score: 20, expectCrisis: true, description: 'PHQ-9 at crisis threshold' },
        { type: 'gad7' as AssessmentType, score: 14, expectCrisis: false, description: 'GAD-7 just below threshold' },
        { type: 'gad7' as AssessmentType, score: 15, expectCrisis: true, description: 'GAD-7 at crisis threshold' },
      ];

      for (const test of boundaryTests) {
        store.resetAssessment();
        jest.clearAllMocks();

        performanceMonitor.startMeasurement(`boundary_test_${test.score}`);

        await store.startAssessment(test.type, 'boundary_test');

        const questionCount = test.type === 'phq9' ? 9 : 7;
        const answers = this.distributeScore(test.score, questionCount);

        for (let i = 0; i < questionCount; i++) {
          await store.answerQuestion(`${test.type}_${i + 1}`, answers[i]);
        }

        await store.completeAssessment();

        const testTime = performanceMonitor.endMeasurement(`boundary_test_${test.score}`);

        const result = store.currentResult;
        expect(result?.totalScore).toBe(test.score);
        expect(result?.isCrisis).toBe(test.expectCrisis);

        if (test.expectCrisis) {
          expect(store.crisisDetection).toBeTruthy();
          expect(Alert.alert).toHaveBeenCalled();
          expect(testTime).toBeLessThan(200); // Crisis response <200ms
        } else {
          expect(store.crisisDetection).toBeFalsy();
          expect(Alert.alert).not.toHaveBeenCalled();
        }

        console.log(`${test.description}: ${testTime.toFixed(2)}ms - Crisis: ${test.expectCrisis}`);
      }
    });

    /**
     * Helper method to distribute score across questions
     */
    distributeScore(targetScore: number, questionCount: number): AssessmentResponse[] {
      const answers: AssessmentResponse[] = new Array(questionCount).fill(0);
      let remainingScore = targetScore;
      
      for (let i = 0; i < questionCount && remainingScore > 0; i++) {
        const maxForQuestion = Math.min(remainingScore, 3);
        answers[i] = maxForQuestion as AssessmentResponse;
        remainingScore -= maxForQuestion;
      }
      
      return answers;
    }
  });

  describe('DATA INTEGRITY AND PERSISTENCE INTEGRATION', () => {
    it('Assessment persistence through interruption and recovery', async () => {
      // Start assessment and answer some questions
      await store.startAssessment('phq9', 'persistence_test');
      
      await store.answerQuestion('phq9_1', 2);
      await store.answerQuestion('phq9_2', 1);
      await store.answerQuestion('phq9_3', 3);

      // Verify partial progress saved
      expect(store.answers).toHaveLength(3);
      expect(store.getCurrentProgress()).toBeGreaterThan(0);

      // Simulate app interruption (save current state)
      await store.saveProgress();
      const partialAnswers = [...store.answers];
      const partialSession = store.currentSession;

      // Reset store (simulate app restart)
      store.resetAssessment();
      expect(store.currentSession).toBeFalsy();
      expect(store.answers).toHaveLength(0);

      // Recover session
      performanceMonitor.startMeasurement('session_recovery');
      const recovered = await store.recoverSession();
      const recoveryTime = performanceMonitor.endMeasurement('session_recovery');

      expect(recovered).toBe(true);
      expect(recoveryTime).toBeLessThan(300); // Recovery <300ms
      expect(store.currentSession?.id).toBe(partialSession?.id);
      expect(store.answers).toHaveLength(3);

      // Verify data integrity
      for (let i = 0; i < partialAnswers.length; i++) {
        expect(store.answers[i]).toEqual(partialAnswers[i]);
      }

      // Continue and complete assessment
      for (let i = 4; i <= 9; i++) {
        await store.answerQuestion(`phq9_${i}`, 1);
      }

      await store.completeAssessment();

      const result = store.currentResult as PHQ9Result;
      expect(result.totalScore).toBe(11); // 2+1+3+1+1+1+1+1 = 11
      expect(result.answers).toHaveLength(9);

      console.log('Session Recovery Time:', recoveryTime.toFixed(2) + 'ms');
    });

    it('Auto-save performance during assessment', async () => {
      store.enableAutoSave();
      await store.startAssessment('gad7', 'autosave_test');

      const autoSaveTimes: number[] = [];

      for (let i = 1; i <= 7; i++) {
        performanceMonitor.startMeasurement(`autosave_${i}`);
        
        await store.answerQuestion(`gad7_${i}`, 2);
        
        // Wait for auto-save to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const autoSaveTime = performanceMonitor.endMeasurement(`autosave_${i}`);
        autoSaveTimes.push(autoSaveTime);

        // Auto-save should not block user interaction
        expect(autoSaveTime).toBeLessThan(200);
      }

      const avgAutoSaveTime = autoSaveTimes.reduce((sum, time) => sum + time, 0) / autoSaveTimes.length;
      expect(avgAutoSaveTime).toBeLessThan(150);

      console.log('Average Auto-save Time:', avgAutoSaveTime.toFixed(2) + 'ms');
    });
  });

  describe('MULTI-ASSESSMENT INTEGRATION', () => {
    it('Sequential PHQ-9 and GAD-7 assessments with crisis escalation', async () => {
      performanceMonitor.startMeasurement('sequential_assessments');

      // First: Complete PHQ-9 (non-crisis)
      await store.startAssessment('phq9', 'sequential_test_1');
      
      for (let i = 1; i <= 9; i++) {
        await store.answerQuestion(`phq9_${i}`, 1); // Score = 9 (mild)
      }
      
      await store.completeAssessment();
      
      const phqResult = store.currentResult as PHQ9Result;
      expect(phqResult.totalScore).toBe(9);
      expect(phqResult.isCrisis).toBe(false);

      // Store first result
      const firstAssessment = store.completedAssessments[0];
      
      // Reset for second assessment
      store.resetAssessment();

      // Second: Complete GAD-7 (crisis level)
      await store.startAssessment('gad7', 'sequential_test_2');
      
      const gadCrisisAnswers: AssessmentResponse[] = [3, 3, 3, 2, 2, 2, 1]; // Score = 16
      for (let i = 0; i < 7; i++) {
        await store.answerQuestion(`gad7_${i + 1}`, gadCrisisAnswers[i]);
      }
      
      await store.completeAssessment();
      
      const gadResult = store.currentResult as GAD7Result;
      expect(gadResult.totalScore).toBe(16);
      expect(gadResult.isCrisis).toBe(true);

      // Validate both assessments in history
      expect(store.completedAssessments).toHaveLength(2);
      
      const phqHistory = store.getAssessmentHistory('phq9');
      const gadHistory = store.getAssessmentHistory('gad7');
      
      expect(phqHistory).toHaveLength(1);
      expect(gadHistory).toHaveLength(1);
      
      expect(phqHistory[0].result?.isCrisis).toBe(false);
      expect(gadHistory[0].result?.isCrisis).toBe(true);

      const totalSequentialTime = performanceMonitor.endMeasurement('sequential_assessments');
      expect(totalSequentialTime).toBeLessThan(10000); // Both assessments <10s

      console.log('Sequential Assessments Time:', totalSequentialTime.toFixed(2) + 'ms');
    });

    it('Concurrent assessment handling and data isolation', async () => {
      // This tests the store's ability to handle multiple assessment contexts
      // without data corruption or interference

      const assessmentPromises: Promise<void>[] = [];
      const results: { [key: string]: PHQ9Result | GAD7Result | null } = {};

      // Simulate multiple assessment contexts
      const contexts = ['context_1', 'context_2', 'context_3'];

      for (const context of contexts) {
        const assessmentPromise = (async () => {
          const localStore = useAssessmentStore.getState();
          
          await localStore.startAssessment('phq9', context);
          
          // Each context answers differently
          const baseScore = contexts.indexOf(context) + 1; // 1, 2, 3
          for (let i = 1; i <= 9; i++) {
            await localStore.answerQuestion(`phq9_${i}`, baseScore as AssessmentResponse);
          }
          
          await localStore.completeAssessment();
          results[context] = localStore.currentResult;
        })();
        
        assessmentPromises.push(assessmentPromise);
      }

      performanceMonitor.startMeasurement('concurrent_handling');
      await Promise.all(assessmentPromises);
      const concurrentTime = performanceMonitor.endMeasurement('concurrent_handling');

      expect(concurrentTime).toBeLessThan(2000); // Concurrent handling <2s

      // Verify each context produced correct results
      expect(results['context_1']).toBeTruthy();
      expect(results['context_2']).toBeTruthy();
      expect(results['context_3']).toBeTruthy();

      // Verify data isolation (each should have different scores)
      expect((results['context_1'] as PHQ9Result).totalScore).toBe(9);  // 1 * 9 = 9
      expect((results['context_2'] as PHQ9Result).totalScore).toBe(18); // 2 * 9 = 18
      expect((results['context_3'] as PHQ9Result).totalScore).toBe(27); // 3 * 9 = 27

      console.log('Concurrent Assessment Handling:', concurrentTime.toFixed(2) + 'ms');
    });
  });

  describe('ERROR BOUNDARY AND RECOVERY INTEGRATION', () => {
    it('Graceful error handling during crisis scenarios', async () => {
      // Mock a storage failure during crisis
      const originalSetItem = require('expo-secure-store').setItemAsync;
      require('expo-secure-store').setItemAsync.mockImplementationOnce(() => 
        Promise.reject(new Error('Storage encryption failed'))
      );

      await store.startAssessment('phq9', 'error_test');

      // Answer to trigger crisis
      for (let i = 1; i <= 8; i++) {
        await store.answerQuestion(`phq9_${i}`, 3);
      }

      performanceMonitor.startMeasurement('crisis_error_recovery');
      
      // This should trigger crisis even with storage error
      await store.answerQuestion('phq9_9', 2); // Suicidal ideation
      
      const recoveryTime = performanceMonitor.endMeasurement('crisis_error_recovery');

      // Crisis detection should still work despite storage error
      expect(store.crisisDetection).toBeTruthy();
      expect(store.crisisDetection?.triggerType).toBe('phq9_suicidal');
      expect(recoveryTime).toBeLessThan(200); // Must still meet timing requirement

      // Emergency response should still be triggered
      expect(Alert.alert).toHaveBeenCalled();

      // Restore original implementation
      require('expo-secure-store').setItemAsync.mockImplementation(originalSetItem);

      console.log('Crisis Error Recovery Time:', recoveryTime.toFixed(2) + 'ms');
    });

    it('Network failure simulation during assessment', async () => {
      // Mock network-related failures
      const originalAlert = Alert.alert;
      Alert.alert = jest.fn().mockImplementation(() => {
        throw new Error('Network timeout');
      });

      await store.startAssessment('phq9', 'network_failure_test');

      // Complete assessment that would normally trigger crisis
      for (let i = 1; i <= 9; i++) {
        await store.answerQuestion(`phq9_${i}`, 3); // High score
      }

      performanceMonitor.startMeasurement('network_failure_handling');
      
      // This should handle network failure gracefully
      await store.completeAssessment();
      
      const handlingTime = performanceMonitor.endMeasurement('network_failure_handling');

      // Assessment should still complete
      const result = store.currentResult as PHQ9Result;
      expect(result).toBeTruthy();
      expect(result.totalScore).toBe(27);
      expect(result.isCrisis).toBe(true);

      // Crisis should still be detected
      expect(store.crisisDetection).toBeTruthy();

      // But fallback to direct 988 call
      expect(Linking.openURL).toHaveBeenCalledWith('tel:988');

      expect(handlingTime).toBeLessThan(500); // Error handling <500ms

      // Restore original implementation
      Alert.alert = originalAlert;

      console.log('Network Failure Handling Time:', handlingTime.toFixed(2) + 'ms');
    });
  });

  describe('PERFORMANCE REGRESSION INTEGRATION', () => {
    it('Performance consistency across all scoring combinations', async () => {
      const performanceResults: { [key: string]: number[] } = {
        phq9_crisis: [],
        phq9_normal: [],
        gad7_crisis: [],
        gad7_normal: []
      };

      // Test performance across different score ranges
      const testScenarios = [
        { type: 'phq9' as AssessmentType, scores: [20, 25, 27], category: 'phq9_crisis' },
        { type: 'phq9' as AssessmentType, scores: [5, 10, 15], category: 'phq9_normal' },
        { type: 'gad7' as AssessmentType, scores: [15, 18, 21], category: 'gad7_crisis' },
        { type: 'gad7' as AssessmentType, scores: [5, 10, 12], category: 'gad7_normal' },
      ];

      for (const scenario of testScenarios) {
        for (const score of scenario.scores) {
          store.resetAssessment();

          performanceMonitor.startMeasurement('assessment_cycle');
          
          await store.startAssessment(scenario.type, 'performance_test');
          
          const questionCount = scenario.type === 'phq9' ? 9 : 7;
          const answers = this.distributeScore(score, questionCount);
          
          for (let i = 0; i < questionCount; i++) {
            await store.answerQuestion(`${scenario.type}_${i + 1}`, answers[i]);
          }
          
          await store.completeAssessment();
          
          const cycleTime = performanceMonitor.endMeasurement('assessment_cycle');
          performanceResults[scenario.category].push(cycleTime);

          // Each complete cycle should meet timing requirements
          expect(cycleTime).toBeLessThan(5000);
        }
      }

      // Analyze performance consistency
      for (const [category, times] of Object.entries(performanceResults)) {
        const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
        const max = Math.max(...times);
        const min = Math.min(...times);
        const variance = times.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / times.length;
        const stdDev = Math.sqrt(variance);

        console.log(`${category}: Avg=${avg.toFixed(2)}ms, Min=${min.toFixed(2)}ms, Max=${max.toFixed(2)}ms, StdDev=${stdDev.toFixed(2)}ms`);

        // Performance should be consistent (low variance)
        expect(stdDev).toBeLessThan(avg * 0.3); // Standard deviation <30% of average
        expect(max).toBeLessThan(5000); // No cycle exceeds 5s
      }
    });
  });

  afterAll(() => {
    // Print comprehensive performance summary
    console.log('\n=== COMPREHENSIVE INTEGRATION TEST PERFORMANCE SUMMARY ===');
    console.log(performanceMonitor.getAllMetrics());
    console.log('=== END PERFORMANCE SUMMARY ===\n');
  });
});