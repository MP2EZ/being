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
 *
 * UPDATE (MAINT-192, 2026-05-30) — the 4 inherited skips were audited:
 *   - FIXED + un-skipped (1): 'Crisis boundary testing at thresholds'. Sound
 *     clinical coverage (PHQ-9/GAD-7 isCrisis flip at 14→15); only its
 *     mismeasured `<200ms` jest perf assertion was removed (Maestro owns that
 *     budget). Cleared by a `crisis` specialist-agent planning pass.
 *   - KEPT SKIPPED w/ linked ticket (1): 'Assessment persistence through
 *     interruption and recovery' → two-layer mock round-trip blocker
 *     (AsyncStorage no-op + EncryptionService master-key), tracked by MAINT-204.
 *   - DELETED (2): 'Concurrent assessment handling and data isolation'
 *     (asserts isolation a singleton store can't provide; sequential case is
 *     covered) and 'Performance consistency across all scoring combinations'
 *     (asserts low variance against deliberately-random mock latency). See
 *     per-site comments.
 *   - Net: 9 passing, 1 skipped (MAINT-204).
 */

import { useAssessmentStore } from '../../src/features/assessment/stores/assessmentStore';
import {
  AssessmentType,
  AssessmentResponse,
  PHQ9Result,
  GAD7Result,
  CrisisDetection,
  CRISIS_THRESHOLDS
} from '../../src/features/assessment/types/index';
import { EncryptionService } from '../../src/core/services/security/EncryptionService';
import { resetEncryptionMocks } from '../helpers/mockEncryption';
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

// MAINT-166 PR 4: use the shared encryption-mock helper. The previous
// inline mock returned null on every `getItemAsync` call, which meant
// EncryptionService never found the master key it had just written —
// "Master key not found" errors cascaded through every test that
// touched encrypted storage (10/12 of these tests).
jest.mock('expo-secure-store', () => {
  const { createExpoSecureStoreMock } = require('../helpers/mockEncryption');
  return createExpoSecureStoreMock();
});
jest.mock('react-native-aes-crypto', () => {
  const { createAesCryptoMock } = require('../helpers/mockEncryption');
  return createAesCryptoMock();
});
jest.mock('expo-crypto', () => {
  const { createExpoCryptoMock } = require('../helpers/mockEncryption');
  return createExpoCryptoMock();
});

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

  // MAINT-166 PR 4: `store` captured via getState() is a SNAPSHOT, not a
  // live binding — Zustand returns immutable state objects, so reads
  // like `state().currentSession` after an `await store.startAssessment()`
  // see the OLD value. Actions on `store` still work (they're stable
  // refs that internally call get()/set() against the live store).
  // Use `state()` for all state reads after a mutation.
  const state = () => useAssessmentStore.getState();

  beforeEach(async () => {
    // Reset the in-memory secure-store map so storage starts clean
    // per test. Skipping EncryptionService.destroy() here because it
    // hangs on CI under --coverage --ci (same INFRA-180 flake family).
    // The cached EncryptionService singleton + cleared mock-store is
    // sufficient for test isolation in practice.
    resetEncryptionMocks();

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

      expect(state().currentSession).toBeTruthy();
      expect(state().currentSession?.type).toBe('phq9');
      expect(initTime).toBeLessThan(300); // Assessment initialization <300ms

      // Answer questions leading to crisis (score = 24, with suicidal ideation)
      // Sum: 3+3+3+3+3+3+3+2+1 = 24. Q9 = 1 triggers suicidal-ideation crisis.
      const crisisAnswers: AssessmentResponse[] = [3, 3, 3, 3, 3, 3, 3, 2, 1];

      for (let i = 0; i < 9; i++) {
        performanceMonitor.startMeasurement(`question_${i + 1}_processing`);
        
        await store.answerQuestion(`phq9_${i + 1}`, crisisAnswers[i]);
        
        const questionTime = performanceMonitor.endMeasurement(`question_${i + 1}_processing`);
        expect(questionTime).toBeLessThan(300); // Each question <300ms

        // Check for immediate crisis detection on Q9
        if (i === 8 && crisisAnswers[i] > 0) { // Q9 suicidal ideation
          expect(state().crisisDetection).toBeTruthy();
          expect(state().crisisDetection?.primaryTrigger).toBe('phq9_suicidal_ideation');
          expect(questionTime).toBeLessThan(200); // Crisis detection <200ms
        }
      }

      // Complete assessment
      performanceMonitor.startMeasurement('assessment_completion');
      await store.completeAssessment();
      const completionTime = performanceMonitor.endMeasurement('assessment_completion');

      expect(completionTime).toBeLessThan(300); // Completion <300ms

      // Validate results
      const result = state().currentResult as PHQ9Result;
      expect(result).toBeTruthy();
      expect(result.totalScore).toBe(24);
      expect(result.severity).toBe('severe');
      expect(result.isCrisis).toBe(true);
      expect(result.suicidalIdeation).toBe(true);

      // Validate crisis detection
      expect(state().crisisDetection).toBeTruthy();
      expect(state().crisisDetection?.isTriggered).toBe(true);

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
      expect(state().completedAssessments).toHaveLength(1);
      expect(state().completedAssessments[0].result?.isCrisis).toBe(true);

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

      const result = state().currentResult as GAD7Result;
      expect(result.totalScore).toBe(18);
      expect(result.severity).toBe('severe');
      expect(result.isCrisis).toBe(true);

      expect(state().crisisDetection).toBeTruthy();
      expect(state().crisisDetection?.primaryTrigger).toBe('gad7_severe_score');
      expect(state().crisisDetection?.triggerValue).toBe(18);

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

      const result = state().currentResult as PHQ9Result;
      expect(result.totalScore).toBe(8);
      expect(result.severity).toBe('mild');
      expect(result.isCrisis).toBe(false);
      expect(result.suicidalIdeation).toBe(false);

      // No crisis detection should occur
      expect(state().crisisDetection).toBeFalsy();
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
      expect(state().crisisDetection).toBeTruthy();
      expect(state().crisisDetection?.primaryTrigger).toBe('phq9_suicidal_ideation');

      // Emergency response should be triggered immediately
      expect(Alert.alert).toHaveBeenCalledWith(
        expect.stringContaining('Crisis Support'),
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({ cancelable: false })
      );

      // Validate crisis intervention object
      expect(state().crisisIntervention).toBeTruthy();
      expect(state().crisisIntervention?.interventionStarted).toBe(true);
      expect(state().crisisIntervention?.responseTime).toBeLessThan(200);

      console.log('Suicidal Ideation Response Time:', responseTime.toFixed(2) + 'ms');
    });

    // MAINT-192: un-skipped after a `crisis` specialist-agent planning pass
    // (GO). The boundary assertions (totalScore + isCrisis flip at 14→15 for
    // PHQ-9 AND GAD-7) are correct clinical coverage that matches the
    // production CRISIS_THRESHOLDS (PHQ9/GAD7 support floor = 15). The only
    // defect was the `expect(testTime).toBeLessThan(200)` line, which measured
    // the FULL assessment cycle (~11 awaited ops), not crisis-detection time —
    // a mismeasurement. Per CLAUDE.md, the <200ms budget is enforced on-device
    // via Maestro, not jest, so that one line was removed; the clinical
    // boundary coverage is now active. Boundary values are NOT changed.
    it('Crisis boundary testing at thresholds', async () => {
      // Tests the ≥15 / ≥15 support-floor thresholds (PHQ-9 + GAD-7).
      // Note: PHQ-9 has a dual-threshold (≥15 = support, ≥20 = active
      // intervention). `result.isCrisis` flips at the lower bound (≥15)
      // per the assessment-types CRISIS_THRESHOLDS constant.
      const boundaryTests = [
        { type: 'phq9' as AssessmentType, score: 14, expectCrisis: false, description: 'PHQ-9 just below threshold' },
        { type: 'phq9' as AssessmentType, score: 15, expectCrisis: true, description: 'PHQ-9 at crisis threshold' },
        { type: 'gad7' as AssessmentType, score: 14, expectCrisis: false, description: 'GAD-7 just below threshold' },
        { type: 'gad7' as AssessmentType, score: 15, expectCrisis: true, description: 'GAD-7 at crisis threshold' },
      ];

      for (const test of boundaryTests) {
        store.resetAssessment();
        jest.clearAllMocks();

        performanceMonitor.startMeasurement(`boundary_test_${test.score}`);

        await store.startAssessment(test.type, 'boundary_test');

        const questionCount = test.type === 'phq9' ? 9 : 7;
        const answers = distributeScore(test.score, questionCount);

        for (let i = 0; i < questionCount; i++) {
          await store.answerQuestion(`${test.type}_${i + 1}`, answers[i]);
        }

        await store.completeAssessment();

        const testTime = performanceMonitor.endMeasurement(`boundary_test_${test.score}`);

        const result = state().currentResult;
        expect(result?.totalScore).toBe(test.score);
        expect(result?.isCrisis).toBe(test.expectCrisis);

        if (test.expectCrisis) {
          expect(state().crisisDetection).toBeTruthy();
          expect(Alert.alert).toHaveBeenCalled();
          // MAINT-192: removed `expect(testTime).toBeLessThan(200)` — it timed
          // the full assessment cycle, not crisis detection. The <200ms budget
          // is enforced on-device via Maestro (CLAUDE.md Performance Budgets).
        } else {
          expect(state().crisisDetection).toBeFalsy();
          expect(Alert.alert).not.toHaveBeenCalled();
        }

        console.log(`${test.description}: ${testTime.toFixed(2)}ms - Crisis: ${test.expectCrisis}`);
      }
    });

  });

  // Helper to distribute a target score across N questions (each question
  // capped at 3, the max for PHQ-9/GAD-7 per-item severity).
  function distributeScore(targetScore: number, questionCount: number): AssessmentResponse[] {
    const answers: AssessmentResponse[] = new Array(questionCount).fill(0);
    let remainingScore = targetScore;

    for (let i = 0; i < questionCount && remainingScore > 0; i++) {
      const maxForQuestion = Math.min(remainingScore, 3);
      answers[i] = maxForQuestion as AssessmentResponse;
      remainingScore -= maxForQuestion;
    }

    return answers;
  }

  describe('DATA INTEGRITY AND PERSISTENCE INTEGRATION', () => {
    // MAINT-192: kept SKIPPED → tracked by MAINT-204. The MAINT-188 note
    // guessed at a serialization / isPersistedAssessmentState drift; MAINT-192
    // found the real, two-layer root cause: (1) the AsyncStorage mock above is
    // a no-op (drops writes, returns null), so the hybrid SecureStorageService
    // blob never round-trips and recoverSession() returns false — fixable with
    // an in-memory mock; but that exposes (2) EncryptionService can't find the
    // master key at decrypt ('Master key not found', EncryptionService.ts:655)
    // under the save→reset→recover sequence. Layer (2) is encryption-mock-infra
    // work touching the shared mockEncryption helper (4 files) — out of
    // MAINT-192's scope. Un-skip when MAINT-204 lands (and drop the jest perf
    // assertion then — perf is Maestro's, not jest's).
    it.skip('Assessment persistence through interruption and recovery', async () => {
      // Start assessment and answer some questions
      await store.startAssessment('phq9', 'persistence_test');
      
      await store.answerQuestion('phq9_1', 2);
      await store.answerQuestion('phq9_2', 1);
      await store.answerQuestion('phq9_3', 3);

      // Verify partial progress saved
      expect(state().answers).toHaveLength(3);
      expect(store.getCurrentProgress()).toBeGreaterThan(0);

      // Simulate app interruption (save current state)
      await store.saveProgress();
      const partialAnswers = [...state().answers];
      const partialSession = state().currentSession;

      // Reset store (simulate app restart)
      store.resetAssessment();
      expect(state().currentSession).toBeFalsy();
      expect(state().answers).toHaveLength(0);

      // Recover session
      performanceMonitor.startMeasurement('session_recovery');
      const recovered = await store.recoverSession();
      const recoveryTime = performanceMonitor.endMeasurement('session_recovery');

      expect(recovered).toBe(true);
      expect(recoveryTime).toBeLessThan(300); // Recovery <300ms
      expect(state().currentSession?.id).toBe(partialSession?.id);
      expect(state().answers).toHaveLength(3);

      // Verify data integrity
      for (let i = 0; i < partialAnswers.length; i++) {
        expect(state().answers[i]).toEqual(partialAnswers[i]);
      }

      // Continue and complete assessment
      for (let i = 4; i <= 9; i++) {
        await store.answerQuestion(`phq9_${i}`, 1);
      }

      await store.completeAssessment();

      const result = state().currentResult as PHQ9Result;
      expect(result.totalScore).toBe(11); // 2+1+3+1+1+1+1+1 = 11
      expect(result.answers).toHaveLength(9);

      console.log('Session Recovery Time:', recoveryTime.toFixed(2) + 'ms');
    });

    // MAINT-192: this test previously asserted ONLY jest perf budgets
    // (autoSaveTime < 200ms, avg < 150ms) measured around a fixed 100ms sleep
    // — an environment-dependent anti-pattern that verified no real behavior
    // and flaked on CI's slower runner. Rewritten to assert the contract that
    // actually matters: with auto-save enabled, every answered question is
    // recorded and the flow progresses without dropping or blocking input.
    // Perf budgets are enforced on-device via Maestro (CLAUDE.md), not jest;
    // storage-persistence verification is tracked separately by MAINT-204.
    it('Auto-save records answers without blocking the assessment flow', async () => {
      store.enableAutoSave();
      await store.startAssessment('gad7', 'autosave_test');

      for (let i = 1; i <= 7; i++) {
        await store.answerQuestion(`gad7_${i}`, 2);
      }

      // Every answer was captured (auto-save did not drop or block input).
      expect(state().answers).toHaveLength(7);
      expect(store.getCurrentProgress()).toBeGreaterThan(0);
    });
  });

  describe('MULTI-ASSESSMENT INTEGRATION', () => {
    it('Sequential PHQ-9 and GAD-7 assessments with crisis escalation', async () => {
      performanceMonitor.startMeasurement('sequential_assessments');

      // First: Complete PHQ-9 (non-crisis). Q9 MUST be 0 to avoid the
      // suicidal-ideation crisis flag (any Q9 > 0 triggers crisis
      // regardless of total score — pinned by MAINT-166 PR 1's wiring).
      await store.startAssessment('phq9', 'sequential_test_1');

      for (let i = 1; i <= 9; i++) {
        const answer = (i === 9 ? 0 : 1) as AssessmentResponse;
        await store.answerQuestion(`phq9_${i}`, answer);
      }

      await store.completeAssessment();

      const phqResult = state().currentResult as PHQ9Result;
      expect(phqResult.totalScore).toBe(8); // 1*8 + 0 = 8 (mild)
      expect(phqResult.isCrisis).toBe(false);

      // Store first result
      const firstAssessment = state().completedAssessments[0];
      
      // Reset for second assessment
      store.resetAssessment();

      // Second: Complete GAD-7 (crisis level)
      await store.startAssessment('gad7', 'sequential_test_2');
      
      const gadCrisisAnswers: AssessmentResponse[] = [3, 3, 3, 2, 2, 2, 1]; // Score = 16
      for (let i = 0; i < 7; i++) {
        await store.answerQuestion(`gad7_${i + 1}`, gadCrisisAnswers[i]);
      }
      
      await store.completeAssessment();
      
      const gadResult = state().currentResult as GAD7Result;
      expect(gadResult.totalScore).toBe(16);
      expect(gadResult.isCrisis).toBe(true);

      // Validate both assessments in history
      expect(state().completedAssessments).toHaveLength(2);
      
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

    // MAINT-192: the former `it.skip('Concurrent assessment handling and data
    // isolation')` was DELETED. It ran three assessments via Promise.all and
    // asserted each `context_N` produced an isolated result (scores 9/18/27),
    // but the assessment store is a SINGLETON with one `currentSession` — the
    // three contexts necessarily clobber each other, so the isolation the test
    // asserts is architecturally impossible without context-scoped sessions (a
    // production redesign, explicitly out of scope). The legitimate
    // multiple-assessments-in-turn case is already covered by 'Sequential
    // PHQ-9 and GAD-7 assessments with crisis escalation' (above). Deleted
    // rather than kept as a skip for a contract the architecture can't satisfy.
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
      expect(state().crisisDetection).toBeTruthy();
      expect(state().crisisDetection?.primaryTrigger).toBe('phq9_suicidal_ideation');
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
      const result = state().currentResult as PHQ9Result;
      expect(result).toBeTruthy();
      expect(result.totalScore).toBe(27);
      expect(result.isCrisis).toBe(true);

      // Crisis should still be detected
      expect(state().crisisDetection).toBeTruthy();

      // But fallback to direct 988 call
      expect(Linking.openURL).toHaveBeenCalledWith('tel:988');

      expect(handlingTime).toBeLessThan(500); // Error handling <500ms

      // Restore original implementation
      Alert.alert = originalAlert;

      console.log('Network Failure Handling Time:', handlingTime.toFixed(2) + 'ms');
    });
  });

  // MAINT-192: the 'PERFORMANCE REGRESSION INTEGRATION' describe block (1 test,
  // 'Performance consistency across all scoring combinations') was DELETED. It
  // asserted `stdDev < avg * 0.3` across 12 assessment cycles, but the
  // encryption mocks inject `Math.random()` latency BY DESIGN (10-40ms × ~11
  // calls/cycle), so >30% variance is guaranteed — the test could only pass by
  // luck. Per CLAUDE.md, perf-regression detection belongs on-device (Maestro)
  // and in CI with realistic workloads, not jest mocks; the jest-side perf:*
  // scripts were already removed in MAINT-166 PR 7 for the same reason. Deleted
  // rather than kept as a skip for an assertion that contradicts its own mocks.

  afterAll(() => {
    // Print comprehensive performance summary
    console.log('\n=== COMPREHENSIVE INTEGRATION TEST PERFORMANCE SUMMARY ===');
    console.log(performanceMonitor.getAllMetrics());
    console.log('=== END PERFORMANCE SUMMARY ===\n');
  });
});