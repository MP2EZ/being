/**
 * CRISIS INTERVENTION SAFETY TESTING SUITE
 * Week 2 Orchestration Plan - Safety-Critical Validation
 * 
 * CRITICAL SAFETY REQUIREMENTS:
 * - Crisis button accessibility (<3 taps to 988)
 * - Emergency protocols during system failures
 * - Immediate crisis response for suicidal ideation (<100ms)
 * - 988/741741/911 access verification in all scenarios
 * - Crisis detection resilience during app failures
 * 
 * REGULATORY COMPLIANCE:
 * - Crisis intervention audit trails
 * - Emergency contact accessibility standards
 * - Therapeutic safety protocol validation
 * - Clinical accuracy during crisis scenarios
 * - HIPAA compliance during emergency situations
 * 
 * ORCHESTRATION VALIDATION:
 * - Crisis workflows tested across all 48 scoring combinations
 * - Emergency response integrated with assessment flows
 * - Safety protocols validated under stress conditions
 * - Crisis button integration with navigation system
 * - Emergency contact system resilience testing
 */

import { useAssessmentStore } from '../../src/flows/assessment/stores/assessmentStore';
import { 
  AssessmentType, 
  AssessmentResponse, 
  CrisisDetection,
  CRISIS_THRESHOLDS 
} from '../../src/flows/assessment/types/index';
import { Alert, Linking } from 'react-native';
import { performance } from 'react-native-performance';

// Mock React Native for safety testing
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn((title, message, buttons, options) => {
      // Track all emergency alert calls for safety validation
      const emergencyCall = {
        title,
        message,
        buttons: buttons?.map(b => ({ text: b.text, style: b.style })),
        options,
        timestamp: Date.now()
      };
      
      // Store for later validation
      if (!global.emergencyAlertCalls) {
        global.emergencyAlertCalls = [];
      }
      global.emergencyAlertCalls.push(emergencyCall);

      // Auto-trigger first button for testing
      if (buttons && buttons.length > 0 && buttons[0].onPress) {
        setTimeout(() => buttons[0].onPress(), 5);
      }
    }),
  },
  Linking: {
    openURL: jest.fn().mockImplementation((url) => {
      // Track all emergency contact attempts
      if (!global.emergencyLinkingCalls) {
        global.emergencyLinkingCalls = [];
      }
      global.emergencyLinkingCalls.push({
        url,
        timestamp: Date.now()
      });
      return Promise.resolve(true);
    }),
  },
}));

// Mock secure storage with failure simulation capabilities
let storageFailureSimulation = false;
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockImplementation((key, value) => {
    if (storageFailureSimulation) {
      return Promise.reject(new Error('Storage encryption failure'));
    }
    return Promise.resolve();
  }),
  getItemAsync: jest.fn().mockImplementation((key) => {
    if (storageFailureSimulation) {
      return Promise.reject(new Error('Storage decryption failure'));
    }
    return Promise.resolve(null);
  }),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

/**
 * Crisis Safety Performance Monitor
 */
class CrisisSafetyMonitor {
  private criticalTimings: { [key: string]: number[] } = {};
  private emergencyResponses: any[] = [];
  private safetyViolations: string[] = [];

  recordCriticalTiming(operation: string, duration: number): void {
    if (!this.criticalTimings[operation]) {
      this.criticalTimings[operation] = [];
    }
    this.criticalTimings[operation].push(duration);

    // Check for safety violations
    if (operation === 'suicidal_ideation_response' && duration > 100) {
      this.safetyViolations.push(`Suicidal ideation response exceeded 100ms: ${duration}ms`);
    }
    if (operation === 'crisis_detection' && duration > 200) {
      this.safetyViolations.push(`Crisis detection exceeded 200ms: ${duration}ms`);
    }
    if (operation === 'emergency_contact_access' && duration > 3000) {
      this.safetyViolations.push(`Emergency contact access exceeded 3s: ${duration}ms`);
    }
  }

  recordEmergencyResponse(response: any): void {
    this.emergencyResponses.push({
      ...response,
      recordedAt: Date.now()
    });
  }

  getSafetyViolations(): string[] {
    return [...this.safetyViolations];
  }

  getCriticalTimingStats(operation: string): { avg: number; max: number; violations: number } {
    const timings = this.criticalTimings[operation] || [];
    if (timings.length === 0) {
      return { avg: 0, max: 0, violations: 0 };
    }

    const avg = timings.reduce((sum, val) => sum + val, 0) / timings.length;
    const max = Math.max(...timings);
    
    let violations = 0;
    if (operation === 'suicidal_ideation_response') {
      violations = timings.filter(t => t > 100).length;
    } else if (operation === 'crisis_detection') {
      violations = timings.filter(t => t > 200).length;
    }

    return { avg, max, violations };
  }

  reset(): void {
    this.criticalTimings = {};
    this.emergencyResponses = [];
    this.safetyViolations = [];
    global.emergencyAlertCalls = [];
    global.emergencyLinkingCalls = [];
  }

  generateSafetyReport(): any {
    return {
      criticalTimings: Object.keys(this.criticalTimings).reduce((report, operation) => {
        report[operation] = this.getCriticalTimingStats(operation);
        return report;
      }, {} as any),
      emergencyResponses: this.emergencyResponses,
      safetyViolations: this.safetyViolations,
      emergencyAlertCalls: global.emergencyAlertCalls || [],
      emergencyLinkingCalls: global.emergencyLinkingCalls || []
    };
  }
}

describe('CRISIS INTERVENTION SAFETY TESTING SUITE', () => {
  let store: ReturnType<typeof useAssessmentStore>;
  let safetyMonitor: CrisisSafetyMonitor;

  beforeEach(async () => {
    store = useAssessmentStore.getState();
    store.resetAssessment();
    await store.clearHistory();
    
    safetyMonitor = new CrisisSafetyMonitor();
    storageFailureSimulation = false;
    
    // Clear all mocks and tracking
    jest.clearAllMocks();
    global.emergencyAlertCalls = [];
    global.emergencyLinkingCalls = [];
  });

  afterEach(() => {
    store.resetAssessment();
    safetyMonitor.reset();
  });

  describe('IMMEDIATE CRISIS RESPONSE VALIDATION', () => {
    it('Suicidal ideation: Immediate response within 100ms', async () => {
      await store.startAssessment('phq9', 'suicidal_safety_test');

      // Answer first 8 questions normally
      for (let i = 1; i <= 8; i++) {
        await store.answerQuestion(`phq9_${i}`, 1);
      }

      // Test all suicidal ideation response levels
      const suicidalResponses = [1, 2, 3]; // All positive responses

      for (const response of suicidalResponses) {
        store.resetAssessment();
        await store.startAssessment('phq9', `suicidal_test_${response}`);

        // Answer first 8 questions
        for (let i = 1; i <= 8; i++) {
          await store.answerQuestion(`phq9_${i}`, 1);
        }

        const startTime = performance.now();
        
        // Answer Q9 with suicidal ideation
        await store.answerQuestion('phq9_9', response);
        
        const responseTime = performance.now() - startTime;
        safetyMonitor.recordCriticalTiming('suicidal_ideation_response', responseTime);

        // CRITICAL: Must detect suicidal ideation within 100ms
        expect(responseTime).toBeLessThan(100);
        
        // Crisis must be detected immediately
        expect(store.crisisDetection).toBeTruthy();
        expect(store.crisisDetection?.triggerType).toBe('phq9_suicidal');
        expect(store.crisisDetection?.triggerValue).toBe(response);

        // Emergency response must be triggered
        expect(global.emergencyAlertCalls).toHaveLength(1);
        const alertCall = global.emergencyAlertCalls[0];
        
        expect(alertCall.title).toContain('Crisis Support');
        expect(alertCall.options?.cancelable).toBe(false);
        expect(alertCall.buttons).toHaveLength(3);

        // Verify emergency contact options
        const buttonTexts = alertCall.buttons.map(b => b.text);
        expect(buttonTexts).toEqual(
          expect.arrayContaining([
            expect.stringContaining('988'),
            expect.stringContaining('741741'),
            expect.stringContaining('911')
          ])
        );

        console.log(`Suicidal Response ${response}: ${responseTime.toFixed(2)}ms`);
      }

      // Verify no safety violations
      const violations = safetyMonitor.getSafetyViolations();
      expect(violations.filter(v => v.includes('suicidal_ideation_response'))).toHaveLength(0);
    });

    it('Crisis score thresholds: Response time validation', async () => {
      const crisisTests = [
        { type: 'phq9' as AssessmentType, score: 20, threshold: 'PHQ9_CRISIS_SCORE' },
        { type: 'phq9' as AssessmentType, score: 25, threshold: 'PHQ9_CRISIS_SCORE' },
        { type: 'phq9' as AssessmentType, score: 27, threshold: 'PHQ9_CRISIS_SCORE' },
        { type: 'gad7' as AssessmentType, score: 15, threshold: 'GAD7_CRISIS_SCORE' },
        { type: 'gad7' as AssessmentType, score: 18, threshold: 'GAD7_CRISIS_SCORE' },
        { type: 'gad7' as AssessmentType, score: 21, threshold: 'GAD7_CRISIS_SCORE' },
      ];

      for (const test of crisisTests) {
        store.resetAssessment();
        global.emergencyAlertCalls = [];

        await store.startAssessment(test.type, `crisis_score_test_${test.score}`);

        const questionCount = test.type === 'phq9' ? 9 : 7;
        const answers = this.distributeScore(test.score, questionCount);

        // Answer all questions
        for (let i = 0; i < questionCount; i++) {
          await store.answerQuestion(`${test.type}_${i + 1}`, answers[i]);
        }

        const startTime = performance.now();
        
        await store.completeAssessment();
        
        const detectionTime = performance.now() - startTime;
        safetyMonitor.recordCriticalTiming('crisis_detection', detectionTime);

        // Crisis detection must be <200ms
        expect(detectionTime).toBeLessThan(200);
        
        // Crisis must be detected
        expect(store.crisisDetection).toBeTruthy();
        expect(store.crisisDetection?.isTriggered).toBe(true);

        // Emergency response must be triggered
        expect(global.emergencyAlertCalls).toHaveLength(1);

        console.log(`${test.type.toUpperCase()} Score ${test.score}: ${detectionTime.toFixed(2)}ms`);
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

  describe('EMERGENCY CONTACT SYSTEM VALIDATION', () => {
    it('988 Crisis Lifeline accessibility', async () => {
      await store.startAssessment('phq9', '988_access_test');

      // Trigger crisis
      for (let i = 1; i <= 9; i++) {
        const response = i === 9 ? 2 : 3; // High score + suicidal ideation
        await store.answerQuestion(`phq9_${i}`, response);
      }

      await store.completeAssessment();

      // Verify 988 option is available
      expect(global.emergencyAlertCalls).toHaveLength(1);
      const alertCall = global.emergencyAlertCalls[0];
      
      const crisisLifelineButton = alertCall.buttons.find(b => 
        b.text.includes('988') && b.text.includes('Crisis Lifeline')
      );
      expect(crisisLifelineButton).toBeTruthy();
      expect(crisisLifelineButton.style).toBe('default');

      // Simulate user selecting 988 option
      const startTime = performance.now();
      
      if (crisisLifelineButton?.onPress) {
        crisisLifelineButton.onPress();
      }

      // Wait for Linking.openURL to be called
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const accessTime = performance.now() - startTime;
      safetyMonitor.recordCriticalTiming('emergency_contact_access', accessTime);

      // 988 must be accessible quickly
      expect(accessTime).toBeLessThan(100);
      expect(Linking.openURL).toHaveBeenCalledWith('tel:988');

      console.log('988 Access Time:', accessTime.toFixed(2) + 'ms');
    });

    it('741741 Crisis Text Line accessibility', async () => {
      await store.startAssessment('gad7', 'text_crisis_access_test');

      // Generate crisis-level GAD-7
      const crisisAnswers: AssessmentResponse[] = [3, 3, 3, 3, 3, 0, 0]; // Score = 15
      for (let i = 0; i < 7; i++) {
        await store.answerQuestion(`gad7_${i + 1}`, crisisAnswers[i]);
      }

      await store.completeAssessment();

      const alertCall = global.emergencyAlertCalls[0];
      const textCrisisButton = alertCall.buttons.find(b => 
        b.text.includes('741741') && b.text.includes('Text')
      );
      
      expect(textCrisisButton).toBeTruthy();

      // Simulate user selecting text crisis option
      const startTime = performance.now();
      
      if (textCrisisButton?.onPress) {
        textCrisisButton.onPress();
      }

      await new Promise(resolve => setTimeout(resolve, 10));
      
      const accessTime = performance.now() - startTime;
      safetyMonitor.recordCriticalTiming('emergency_contact_access', accessTime);

      expect(accessTime).toBeLessThan(100);
      expect(Linking.openURL).toHaveBeenCalledWith('sms:741741');

      console.log('741741 Access Time:', accessTime.toFixed(2) + 'ms');
    });

    it('911 Emergency Services accessibility', async () => {
      await store.startAssessment('phq9', '911_access_test');

      // Maximum crisis scenario
      for (let i = 1; i <= 9; i++) {
        await store.answerQuestion(`phq9_${i}`, 3);
      }

      await store.completeAssessment();

      const alertCall = global.emergencyAlertCalls[0];
      const emergencyButton = alertCall.buttons.find(b => 
        b.text.includes('911') && b.text.includes('Emergency')
      );
      
      expect(emergencyButton).toBeTruthy();
      expect(emergencyButton.style).toBe('destructive'); // Highlighted as critical

      // Simulate user selecting 911 option
      const startTime = performance.now();
      
      if (emergencyButton?.onPress) {
        emergencyButton.onPress();
      }

      await new Promise(resolve => setTimeout(resolve, 10));
      
      const accessTime = performance.now() - startTime;
      safetyMonitor.recordCriticalTiming('emergency_contact_access', accessTime);

      expect(accessTime).toBeLessThan(100);
      expect(Linking.openURL).toHaveBeenCalledWith('tel:911');

      console.log('911 Access Time:', accessTime.toFixed(2) + 'ms');
    });
  });

  describe('SYSTEM FAILURE RESILIENCE TESTING', () => {
    it('Crisis detection during storage failure', async () => {
      // Enable storage failure simulation
      storageFailureSimulation = true;

      await store.startAssessment('phq9', 'storage_failure_test');

      const startTime = performance.now();
      
      // Try to answer questions that should trigger crisis
      for (let i = 1; i <= 9; i++) {
        const response = i === 9 ? 2 : 3; // Crisis score + suicidal ideation
        
        try {
          await store.answerQuestion(`phq9_${i}`, response);
        } catch (error) {
          // Storage failures should not prevent crisis detection
          console.log('Expected storage error:', error.message);
        }
      }

      try {
        await store.completeAssessment();
      } catch (error) {
        console.log('Expected completion error:', error.message);
      }

      const responseTime = performance.now() - startTime;
      safetyMonitor.recordCriticalTiming('crisis_detection_with_failure', responseTime);

      // Crisis detection must still work despite storage failures
      expect(store.crisisDetection).toBeTruthy();
      expect(store.crisisDetection?.triggerType).toBe('phq9_suicidal');

      // Emergency response must still be triggered
      expect(global.emergencyAlertCalls.length).toBeGreaterThan(0);

      // Must still meet timing requirements
      expect(responseTime).toBeLessThan(500); // Slightly relaxed for error handling

      console.log('Crisis Detection with Storage Failure:', responseTime.toFixed(2) + 'ms');

      // Disable failure simulation
      storageFailureSimulation = false;
    });

    it('Fallback emergency contact during Alert failure', async () => {
      // Mock Alert.alert to fail
      const originalAlert = Alert.alert;
      Alert.alert = jest.fn().mockImplementation(() => {
        throw new Error('Alert system failure');
      });

      await store.startAssessment('phq9', 'alert_failure_test');

      // Trigger crisis
      for (let i = 1; i <= 9; i++) {
        await store.answerQuestion(`phq9_${i}`, 3);
      }

      const startTime = performance.now();
      
      await store.completeAssessment();
      
      const fallbackTime = performance.now() - startTime;
      safetyMonitor.recordCriticalTiming('fallback_emergency_contact', fallbackTime);

      // Should fallback to direct 988 call
      expect(Linking.openURL).toHaveBeenCalledWith('tel:988');
      expect(fallbackTime).toBeLessThan(300);

      console.log('Fallback Emergency Contact:', fallbackTime.toFixed(2) + 'ms');

      // Restore original Alert
      Alert.alert = originalAlert;
    });

    it('Crisis detection during network failure', async () => {
      // Mock Linking.openURL to fail
      const originalOpenURL = Linking.openURL;
      Linking.openURL = jest.fn().mockRejectedValue(new Error('Network unavailable'));

      await store.startAssessment('gad7', 'network_failure_test');

      // Generate crisis
      for (let i = 1; i <= 7; i++) {
        await store.answerQuestion(`gad7_${i}`, 3);
      }

      const startTime = performance.now();
      
      await store.completeAssessment();
      
      const networkFailureTime = performance.now() - startTime;
      safetyMonitor.recordCriticalTiming('crisis_detection_network_failure', networkFailureTime);

      // Crisis should still be detected
      expect(store.crisisDetection).toBeTruthy();
      expect(store.crisisDetection?.triggerType).toBe('gad7_score');

      // Alert should still be shown (even if phone calls fail)
      expect(global.emergencyAlertCalls.length).toBeGreaterThan(0);

      expect(networkFailureTime).toBeLessThan(200);

      console.log('Crisis Detection with Network Failure:', networkFailureTime.toFixed(2) + 'ms');

      // Restore original Linking
      Linking.openURL = originalOpenURL;
    });
  });

  describe('CRISIS INTERVENTION AUDIT TRAIL', () => {
    it('Complete crisis intervention logging', async () => {
      await store.startAssessment('phq9', 'audit_trail_test');

      const testStartTime = Date.now();

      // Create crisis scenario
      for (let i = 1; i <= 8; i++) {
        await store.answerQuestion(`phq9_${i}`, 3);
      }

      await store.answerQuestion('phq9_9', 2); // Suicidal ideation

      await store.completeAssessment();

      // Verify crisis detection audit trail
      expect(store.crisisDetection).toBeTruthy();
      expect(store.crisisDetection?.timestamp).toBeGreaterThan(testStartTime);
      expect(store.crisisDetection?.assessmentId).toBeTruthy();

      // Verify crisis intervention audit trail
      expect(store.crisisIntervention).toBeTruthy();
      expect(store.crisisIntervention?.detection).toEqual(store.crisisDetection);
      expect(store.crisisIntervention?.interventionStarted).toBe(true);
      expect(store.crisisIntervention?.responseTime).toBeLessThan(200);

      // Verify emergency call audit trail
      expect(global.emergencyAlertCalls).toHaveLength(1);
      const alertCall = global.emergencyAlertCalls[0];
      expect(alertCall.timestamp).toBeGreaterThan(testStartTime);

      console.log('Crisis Intervention Audit Trail Complete');
    });

    it('Crisis acknowledgment and follow-up tracking', async () => {
      await store.startAssessment('gad7', 'acknowledgment_test');

      // Generate crisis
      for (let i = 1; i <= 7; i++) {
        await store.answerQuestion(`gad7_${i}`, 3);
      }

      await store.completeAssessment();

      // Initial crisis intervention state
      expect(store.crisisIntervention?.contactedSupport).toBe(false);

      // Simulate user acknowledging crisis support
      store.acknowledgeCrisis();

      // Verify acknowledgment tracked
      expect(store.crisisIntervention?.contactedSupport).toBe(true);

      console.log('Crisis Acknowledgment Tracking Complete');
    });
  });

  describe('BOUNDARY CONDITION SAFETY TESTING', () => {
    it('Safety at exact crisis thresholds', async () => {
      const boundaryTests = [
        { type: 'phq9' as AssessmentType, score: 19, expectCrisis: false },
        { type: 'phq9' as AssessmentType, score: 20, expectCrisis: true },
        { type: 'gad7' as AssessmentType, score: 14, expectCrisis: false },
        { type: 'gad7' as AssessmentType, score: 15, expectCrisis: true },
      ];

      for (const test of boundaryTests) {
        store.resetAssessment();
        global.emergencyAlertCalls = [];

        await store.startAssessment(test.type, `boundary_safety_${test.score}`);

        const questionCount = test.type === 'phq9' ? 9 : 7;
        const answers = this.distributeScore(test.score, questionCount);

        for (let i = 0; i < questionCount; i++) {
          await store.answerQuestion(`${test.type}_${i + 1}`, answers[i]);
        }

        const startTime = performance.now();
        
        await store.completeAssessment();
        
        const responseTime = performance.now() - startTime;

        if (test.expectCrisis) {
          expect(store.crisisDetection).toBeTruthy();
          expect(global.emergencyAlertCalls).toHaveLength(1);
          expect(responseTime).toBeLessThan(200);
          safetyMonitor.recordCriticalTiming('boundary_crisis_detection', responseTime);
        } else {
          expect(store.crisisDetection).toBeFalsy();
          expect(global.emergencyAlertCalls).toHaveLength(0);
        }

        console.log(`${test.type.toUpperCase()} Score ${test.score} (Crisis: ${test.expectCrisis}): ${responseTime.toFixed(2)}ms`);
      }
    });

    it('Edge case: Zero score with suicidal ideation', async () => {
      await store.startAssessment('phq9', 'zero_score_suicidal_test');

      // Answer all questions with 0 except Q9
      for (let i = 1; i <= 8; i++) {
        await store.answerQuestion(`phq9_${i}`, 0);
      }

      const startTime = performance.now();
      
      // Answer Q9 with suicidal ideation
      await store.answerQuestion('phq9_9', 1);
      
      const responseTime = performance.now() - startTime;
      safetyMonitor.recordCriticalTiming('zero_score_suicidal_response', responseTime);

      // Must trigger crisis despite low total score
      expect(responseTime).toBeLessThan(100);
      expect(store.crisisDetection).toBeTruthy();
      expect(store.crisisDetection?.triggerType).toBe('phq9_suicidal');

      await store.completeAssessment();

      const result = store.currentResult;
      expect(result?.totalScore).toBe(1); // Very low score
      expect(result?.isCrisis).toBe(true); // But still crisis due to suicidal ideation

      expect(global.emergencyAlertCalls).toHaveLength(1);

      console.log('Zero Score + Suicidal Ideation Response:', responseTime.toFixed(2) + 'ms');
    });
  });

  describe('PERFORMANCE SAFETY VALIDATION', () => {
    it('Crisis response performance consistency', async () => {
      const performanceTests = 20; // Run multiple iterations
      const crisisResponseTimes: number[] = [];

      for (let iteration = 0; iteration < performanceTests; iteration++) {
        store.resetAssessment();
        global.emergencyAlertCalls = [];

        await store.startAssessment('phq9', `performance_test_${iteration}`);

        // Answer to create crisis
        for (let i = 1; i <= 8; i++) {
          await store.answerQuestion(`phq9_${i}`, 3);
        }

        const startTime = performance.now();
        
        await store.answerQuestion('phq9_9', 2); // Suicidal ideation
        
        const responseTime = performance.now() - startTime;
        crisisResponseTimes.push(responseTime);

        // Each response must meet safety requirements
        expect(responseTime).toBeLessThan(100);
        expect(store.crisisDetection).toBeTruthy();
        expect(global.emergencyAlertCalls).toHaveLength(1);
      }

      // Analyze performance consistency
      const avgTime = crisisResponseTimes.reduce((sum, time) => sum + time, 0) / crisisResponseTimes.length;
      const maxTime = Math.max(...crisisResponseTimes);
      const minTime = Math.min(...crisisResponseTimes);
      const variance = crisisResponseTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / crisisResponseTimes.length;
      const stdDev = Math.sqrt(variance);

      console.log(`Crisis Response Performance (${performanceTests} tests):`);
      console.log(`  Average: ${avgTime.toFixed(2)}ms`);
      console.log(`  Min: ${minTime.toFixed(2)}ms`);
      console.log(`  Max: ${maxTime.toFixed(2)}ms`);
      console.log(`  Std Dev: ${stdDev.toFixed(2)}ms`);

      // Performance should be consistent
      expect(avgTime).toBeLessThan(50); // Average should be very fast
      expect(maxTime).toBeLessThan(100); // No response should exceed 100ms
      expect(stdDev).toBeLessThan(20); // Low variance for consistency
    });
  });

  afterAll(() => {
    // Generate comprehensive safety report
    const safetyReport = safetyMonitor.generateSafetyReport();
    
    console.log('\n=== CRISIS INTERVENTION SAFETY REPORT ===');
    console.log('Critical Timing Performance:');
    Object.entries(safetyReport.criticalTimings).forEach(([operation, stats]) => {
      console.log(`  ${operation}: Avg=${stats.avg.toFixed(2)}ms, Max=${stats.max.toFixed(2)}ms, Violations=${stats.violations}`);
    });
    
    console.log('\nSafety Violations:');
    if (safetyReport.safetyViolations.length === 0) {
      console.log('  ✅ No safety violations detected');
    } else {
      safetyReport.safetyViolations.forEach(violation => {
        console.log(`  ❌ ${violation}`);
      });
    }
    
    console.log('\nEmergency Response Summary:');
    console.log(`  Emergency Alert Calls: ${safetyReport.emergencyAlertCalls.length}`);
    console.log(`  Emergency Linking Calls: ${safetyReport.emergencyLinkingCalls.length}`);
    
    console.log('=== END SAFETY REPORT ===\n');

    // Ensure no safety violations
    expect(safetyReport.safetyViolations).toHaveLength(0);
  });
});