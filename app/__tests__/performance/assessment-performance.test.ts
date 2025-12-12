/**
 * ASSESSMENT PERFORMANCE TESTING SUITE
 * 
 * CRITICAL TIMING REQUIREMENTS:
 * - Crisis detection: <200ms (regulatory requirement)
 * - Assessment flow: <300ms per question
 * - Data encryption: <50ms per operation
 * - Component renders: <100ms
 * - Launch time: <2s total
 * 
 * PERFORMANCE BENCHMARKS:
 * - Memory usage monitoring
 * - CPU utilization tracking
 * - Storage I/O performance
 * - Network request optimization
 * - Battery impact assessment
 * 
 * Week 2 Orchestration Plan - Performance Critical Validation
 */

import { useAssessmentStore } from '../../src/features/assessment/stores/assessmentStore';
import { AssessmentType, AssessmentResponse } from '../../src/features/assessment/types/index';
import { performance } from 'react-native-performance';

// Mock performance monitoring
const mockPerformanceObserver = {
  observe: jest.fn(),
  disconnect: jest.fn(),
};

// Mock React Native Performance
jest.mock('react-native-performance', () => ({
  performance: {
    now: () => Date.now(),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
  },
  PerformanceObserver: jest.fn(() => mockPerformanceObserver),
}));

// Mock storage with timing simulation
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockImplementation(() => 
    new Promise(resolve => setTimeout(resolve, Math.random() * 30)) // 0-30ms
  ),
  getItemAsync: jest.fn().mockImplementation(() => 
    new Promise(resolve => setTimeout(resolve, Math.random() * 20)) // 0-20ms
  ),
  deleteItemAsync: jest.fn().mockImplementation(() => 
    new Promise(resolve => setTimeout(resolve, Math.random() * 10)) // 0-10ms
  ),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockImplementation(() => 
    new Promise(resolve => setTimeout(resolve, Math.random() * 15)) // 0-15ms
  ),
  getItem: jest.fn().mockImplementation(() => 
    new Promise(resolve => setTimeout(resolve, Math.random() * 10)) // 0-10ms
  ),
  removeItem: jest.fn().mockImplementation(() => 
    new Promise(resolve => setTimeout(resolve, Math.random() * 5)) // 0-5ms
  ),
}));

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Linking: { openURL: jest.fn() },
}));

/**
 * Performance measurement utilities
 */
class PerformanceMeasurement {
  private startTime: number = 0;
  private measurements: { [key: string]: number[] } = {};

  start(): void {
    this.startTime = performance.now();
  }

  measure(operation: string): number {
    const duration = performance.now() - this.startTime;
    
    if (!this.measurements[operation]) {
      this.measurements[operation] = [];
    }
    this.measurements[operation].push(duration);
    
    return duration;
  }

  getStats(operation: string): { avg: number; min: number; max: number; count: number } {
    const measurements = this.measurements[operation] || [];
    
    if (measurements.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 };
    }

    const avg = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);
    
    return { avg, min, max, count: measurements.length };
  }

  reset(): void {
    this.measurements = {};
    this.startTime = 0;
  }
}

describe('ASSESSMENT PERFORMANCE TESTING SUITE', () => {
  let store: ReturnType<typeof useAssessmentStore>;
  let perf: PerformanceMeasurement;

  beforeEach(() => {
    store = useAssessmentStore.getState();
    store.resetAssessment();
    perf = new PerformanceMeasurement();
  });

  afterEach(() => {
    store.resetAssessment();
    perf.reset();
  });

  describe('CRISIS DETECTION PERFORMANCE (<200ms requirement)', () => {
    it('PHQ-9 crisis detection timing validation', async () => {
      const crisisScores = [20, 21, 25, 27]; // All crisis-level scores
      const timings: number[] = [];

      for (const targetScore of crisisScores) {
        store.resetAssessment();
        await store.startAssessment('phq9', 'crisis_performance_test');

        perf.start();

        // Generate answers for target score
        const answers = generateAnswersForScore(targetScore, 9);
        
        // Answer all questions
        for (let i = 0; i < 9; i++) {
          await store.answerQuestion(`phq9_${i + 1}`, answers[i]);
        }

        // Complete assessment and measure crisis detection time
        await store.completeAssessment();
        const detectionTime = perf.measure('crisis_detection');
        timings.push(detectionTime);

        // Validate crisis was detected
        expect(store.crisisDetection).toBeTruthy();
        expect(store.crisisDetection?.isTriggered).toBe(true);
        
        // Critical requirement: <200ms
        expect(detectionTime).toBeLessThan(200);
        
        console.log(`PHQ-9 Score ${targetScore}: Crisis detected in ${detectionTime.toFixed(2)}ms`);
      }

      // Calculate overall statistics
      const avgTime = timings.reduce((sum, time) => sum + time, 0) / timings.length;
      const maxTime = Math.max(...timings);
      
      expect(avgTime).toBeLessThan(150); // Average should be well under 200ms
      expect(maxTime).toBeLessThan(200); // Maximum never exceeds 200ms
      
      console.log(`PHQ-9 Crisis Detection - Avg: ${avgTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);
    });

    it('GAD-7 crisis detection timing validation', async () => {
      const crisisScores = [15, 16, 18, 21]; // All crisis-level scores
      const timings: number[] = [];

      for (const targetScore of crisisScores) {
        store.resetAssessment();
        await store.startAssessment('gad7', 'crisis_performance_test');

        perf.start();

        // Generate answers for target score
        const answers = generateAnswersForScore(targetScore, 7);
        
        // Answer all questions
        for (let i = 0; i < 7; i++) {
          await store.answerQuestion(`gad7_${i + 1}`, answers[i]);
        }

        await store.completeAssessment();
        const detectionTime = perf.measure('crisis_detection');
        timings.push(detectionTime);

        // Validate crisis was detected
        expect(store.crisisDetection).toBeTruthy();
        expect(store.crisisDetection?.isTriggered).toBe(true);
        
        // Critical requirement: <200ms
        expect(detectionTime).toBeLessThan(200);
        
        console.log(`GAD-7 Score ${targetScore}: Crisis detected in ${detectionTime.toFixed(2)}ms`);
      }

      const avgTime = timings.reduce((sum, time) => sum + time, 0) / timings.length;
      const maxTime = Math.max(...timings);
      
      expect(avgTime).toBeLessThan(150);
      expect(maxTime).toBeLessThan(200);
      
      console.log(`GAD-7 Crisis Detection - Avg: ${avgTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);
    });

    it('Suicidal ideation immediate detection (<200ms)', async () => {
      const suicidalResponses = [1, 2, 3]; // All positive responses to Q9
      const timings: number[] = [];

      for (const suicidalResponse of suicidalResponses) {
        store.resetAssessment();
        await store.startAssessment('phq9', 'suicidal_performance_test');

        // Answer first 8 questions normally
        for (let i = 0; i < 8; i++) {
          await store.answerQuestion(`phq9_${i + 1}`, 1);
        }

        perf.start();
        
        // Answer Q9 with suicidal ideation - should trigger immediate crisis
        await store.answerQuestion('phq9_9', suicidalResponse);
        const immediateDetectionTime = perf.measure('suicidal_detection');
        timings.push(immediateDetectionTime);

        // Should trigger crisis immediately, not wait for completion
        expect(store.crisisDetection).toBeTruthy();
        expect(store.crisisDetection?.triggerType).toBe('phq9_suicidal');
        
        // Critical: Suicidal ideation must be detected immediately
        expect(immediateDetectionTime).toBeLessThan(100); // Even stricter than general crisis
        
        console.log(`Suicidal Response ${suicidalResponse}: Detected in ${immediateDetectionTime.toFixed(2)}ms`);
      }

      const avgTime = timings.reduce((sum, time) => sum + time, 0) / timings.length;
      expect(avgTime).toBeLessThan(50); // Should be very fast
    });
  });

  describe('ASSESSMENT FLOW PERFORMANCE (<300ms per question)', () => {
    it('Question answering performance validation', async () => {
      const assessmentTypes: AssessmentType[] = ['phq9', 'gad7'];
      
      for (const type of assessmentTypes) {
        store.resetAssessment();
        await store.startAssessment(type, 'flow_performance_test');

        const questionCount = type === 'phq9' ? 9 : 7;
        const answerTimings: number[] = [];

        for (let i = 0; i < questionCount; i++) {
          perf.start();
          
          await store.answerQuestion(`${type}_${i + 1}`, 2);
          const answerTime = perf.measure('answer_question');
          answerTimings.push(answerTime);

          // Each question should be answered in <300ms
          expect(answerTime).toBeLessThan(300);
        }

        const avgAnswerTime = answerTimings.reduce((sum, time) => sum + time, 0) / answerTimings.length;
        const maxAnswerTime = Math.max(...answerTimings);

        expect(avgAnswerTime).toBeLessThan(200); // Average well under limit
        expect(maxAnswerTime).toBeLessThan(300); // Maximum never exceeds limit

        console.log(`${type.toUpperCase()} Answer Performance - Avg: ${avgAnswerTime.toFixed(2)}ms, Max: ${maxAnswerTime.toFixed(2)}ms`);
      }
    });

    it('Assessment completion performance', async () => {
      const types: AssessmentType[] = ['phq9', 'gad7'];
      
      for (const type of types) {
        store.resetAssessment();
        await store.startAssessment(type, 'completion_performance_test');

        const questionCount = type === 'phq9' ? 9 : 7;
        
        // Answer all questions
        for (let i = 0; i < questionCount; i++) {
          await store.answerQuestion(`${type}_${i + 1}`, 1);
        }

        perf.start();
        
        await store.completeAssessment();
        const completionTime = perf.measure('assessment_completion');

        // Assessment completion should be fast
        expect(completionTime).toBeLessThan(300);
        expect(store.currentResult).toBeTruthy();
        
        console.log(`${type.toUpperCase()} Completion: ${completionTime.toFixed(2)}ms`);
      }
    });
  });

  describe('DATA ENCRYPTION PERFORMANCE (<50ms requirement)', () => {
    it('Secure storage encryption timing', async () => {
      const encryptionTimings: number[] = [];
      const testData = {
        assessment: 'phq9',
        answers: Array(9).fill({ questionId: 'test', response: 1, timestamp: Date.now() }),
        score: 15,
        timestamp: Date.now()
      };

      // Test multiple encryption operations
      for (let i = 0; i < 10; i++) {
        perf.start();
        
        // Simulate encryption during save
        await store.saveProgress();
        const encryptionTime = perf.measure('encryption');
        encryptionTimings.push(encryptionTime);

        // Critical requirement: <50ms for encryption
        expect(encryptionTime).toBeLessThan(50);
      }

      const avgEncryption = encryptionTimings.reduce((sum, time) => sum + time, 0) / encryptionTimings.length;
      const maxEncryption = Math.max(...encryptionTimings);

      expect(avgEncryption).toBeLessThan(30); // Average well under limit
      expect(maxEncryption).toBeLessThan(50); // Maximum never exceeds limit

      console.log(`Encryption Performance - Avg: ${avgEncryption.toFixed(2)}ms, Max: ${maxEncryption.toFixed(2)}ms`);
    });

    it('Data decryption and loading performance', async () => {
      // First save some data
      await store.startAssessment('phq9', 'decryption_test');
      for (let i = 0; i < 9; i++) {
        await store.answerQuestion(`phq9_${i + 1}`, 2);
      }
      await store.completeAssessment();
      await store.saveProgress();

      const decryptionTimings: number[] = [];

      // Test multiple decryption operations
      for (let i = 0; i < 10; i++) {
        store.resetAssessment();
        
        perf.start();
        
        const recovered = await store.recoverSession();
        const decryptionTime = perf.measure('decryption');
        decryptionTimings.push(decryptionTime);

        // Should be able to recover data quickly
        expect(decryptionTime).toBeLessThan(50);
      }

      const avgDecryption = decryptionTimings.reduce((sum, time) => sum + time, 0) / decryptionTimings.length;
      expect(avgDecryption).toBeLessThan(30);

      console.log(`Decryption Performance - Avg: ${avgDecryption.toFixed(2)}ms`);
    });
  });

  describe('AUTO-SAVE PERFORMANCE', () => {
    it('Auto-save timing validation', async () => {
      store.enableAutoSave();
      await store.startAssessment('phq9', 'autosave_test');

      const autoSaveTimings: number[] = [];

      // Answer questions with auto-save monitoring
      for (let i = 0; i < 9; i++) {
        perf.start();
        
        await store.answerQuestion(`phq9_${i + 1}`, 2);
        
        // Auto-save should occur within reasonable time
        await new Promise(resolve => setTimeout(resolve, 50)); // Wait for auto-save
        const saveTime = perf.measure('auto_save');
        autoSaveTimings.push(saveTime);

        // Auto-save shouldn't block user interaction
        expect(saveTime).toBeLessThan(100);
      }

      const avgAutoSave = autoSaveTimings.reduce((sum, time) => sum + time, 0) / autoSaveTimings.length;
      expect(avgAutoSave).toBeLessThan(75);

      console.log(`Auto-save Performance - Avg: ${avgAutoSave.toFixed(2)}ms`);
    });
  });

  describe('MEMORY USAGE MONITORING', () => {
    it('Assessment store memory efficiency', async () => {
      const initialMemory = process.memoryUsage();
      
      // Run multiple assessment cycles
      for (let cycle = 0; cycle < 5; cycle++) {
        for (const type of ['phq9', 'gad7'] as AssessmentType[]) {
          await store.startAssessment(type, 'memory_test');
          
          const questionCount = type === 'phq9' ? 9 : 7;
          for (let i = 0; i < questionCount; i++) {
            await store.answerQuestion(`${type}_${i + 1}`, Math.floor(Math.random() * 4) as AssessmentResponse);
          }
          
          await store.completeAssessment();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 10MB for testing)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      
      console.log(`Memory Usage - Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB, Final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB, Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('CONCURRENT OPERATION PERFORMANCE', () => {
    it('Multiple simultaneous assessments handling', async () => {
      const concurrentAssessments = 3;
      const assessmentPromises: Promise<void>[] = [];

      for (let i = 0; i < concurrentAssessments; i++) {
        const assessmentPromise = (async () => {
          const localStore = useAssessmentStore.getState();
          await localStore.startAssessment('phq9', `concurrent_test_${i}`);
          
          for (let j = 0; j < 9; j++) {
            await localStore.answerQuestion(`phq9_${j + 1}`, 1);
          }
          
          await localStore.completeAssessment();
        })();
        
        assessmentPromises.push(assessmentPromise);
      }

      perf.start();
      
      await Promise.all(assessmentPromises);
      const concurrentTime = perf.measure('concurrent_assessments');

      // Concurrent operations should complete in reasonable time
      expect(concurrentTime).toBeLessThan(1000); // 1 second for all concurrent operations

      console.log(`Concurrent Assessment Performance: ${concurrentTime.toFixed(2)}ms for ${concurrentAssessments} assessments`);
    });
  });
});

/**
 * Helper function to generate answers that sum to target score
 */
function generateAnswersForScore(targetScore: number, questionCount: number): AssessmentResponse[] {
  const answers: AssessmentResponse[] = new Array(questionCount).fill(0);
  let remainingScore = targetScore;
  
  for (let i = 0; i < questionCount && remainingScore > 0; i++) {
    const maxForQuestion = Math.min(remainingScore, 3);
    answers[i] = maxForQuestion as AssessmentResponse;
    remainingScore -= maxForQuestion;
  }
  
  return answers;
}