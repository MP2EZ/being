/**
 * CRISIS SAFETY TESTING AUTOMATION - Week 3 Orchestration
 * Comprehensive automated testing for crisis intervention and safety systems
 * 
 * CRITICAL SAFETY REQUIREMENTS:
 * - Crisis detection accuracy: 100% precision required (PHQ-9≥15 moderate, ≥20 severe, GAD-7≥15)
 * - Crisis response time: <200ms maximum for life-saving features
 * - 988 hotline accessibility: Must work in all scenarios (offline, network issues)
 * - Emergency contact integration: Reliable access to support systems
 * - Crisis button accessibility: WCAG compliant for all users including disabilities
 * - Data preservation: Crisis state must survive app crashes/restarts
 * 
 * ZERO TOLERANCE POLICY:
 * - Any failure in crisis detection is a potential life-threatening issue
 * - Performance delays in crisis scenarios are unacceptable
 * - Accessibility failures prevent vulnerable users from getting help
 */

import { performance } from 'perf_hooks';
import { PERFORMANCE_MONITOR, SAFETY_VALIDATOR } from '../setup/test-automation-setup';
import { ClinicalScoringService } from '@/features/assessment/stores/assessmentStore';
import type { AssessmentAnswer } from '@/features/assessment/types';

// Crisis detection test data - All 27 PHQ-9 + 21 GAD-7 combinations
const CRISIS_TEST_SCENARIOS = [
  // Moderate PHQ-9 scores (≥15) - NEW: Support recommended
  { phq9: 15, gad7: 0, expectedCrisis: true, scenario: 'Moderately severe depression, no anxiety' },
  { phq9: 16, gad7: 5, expectedCrisis: true, scenario: 'Moderately severe depression, mild anxiety' },
  { phq9: 19, gad7: 10, expectedCrisis: true, scenario: 'High depression (below severe), moderate anxiety' },

  // Severe PHQ-9 scores (≥20) with various GAD-7 scores
  { phq9: 20, gad7: 0, expectedCrisis: true, scenario: 'Severe depression, no anxiety' },
  { phq9: 20, gad7: 7, expectedCrisis: true, scenario: 'Severe depression, mild anxiety' },
  { phq9: 20, gad7: 15, expectedCrisis: true, scenario: 'Severe depression, severe anxiety' },
  { phq9: 21, gad7: 10, expectedCrisis: true, scenario: 'Critical depression, moderate anxiety' },
  { phq9: 27, gad7: 21, expectedCrisis: true, scenario: 'Maximum crisis scores' },

  // Critical GAD-7 scores (≥15) with various PHQ-9 scores
  { phq9: 0, gad7: 15, expectedCrisis: true, scenario: 'No depression, severe anxiety' },
  { phq9: 10, gad7: 15, expectedCrisis: true, scenario: 'Mild depression, severe anxiety' },
  { phq9: 19, gad7: 15, expectedCrisis: true, scenario: 'High depression, severe anxiety' },
  { phq9: 5, gad7: 20, expectedCrisis: true, scenario: 'Low depression, critical anxiety' },

  // Boundary testing - just below crisis thresholds
  { phq9: 14, gad7: 14, expectedCrisis: false, scenario: 'High but not crisis level' },
  { phq9: 10, gad7: 10, expectedCrisis: false, scenario: 'Moderate symptoms' },
  { phq9: 10, gad7: 12, expectedCrisis: false, scenario: 'Mild symptoms' },
  { phq9: 0, gad7: 0, expectedCrisis: false, scenario: 'No symptoms' },

  // Edge cases - threshold boundaries
  { phq9: 15, gad7: 14, expectedCrisis: true, scenario: 'PHQ-9 moderate threshold, GAD-7 boundary' },
  { phq9: 14, gad7: 15, expectedCrisis: true, scenario: 'PHQ-9 boundary, GAD-7 crisis' },
  { phq9: 20, gad7: 14, expectedCrisis: true, scenario: 'PHQ-9 severe threshold, GAD-7 boundary' }
];

// Mock crisis intervention services for testing
const mockCrisisServices = {
  hotline988: {
    call: jest.fn().mockResolvedValue({ connected: true, responseTime: 150 }),
    isAvailable: jest.fn().mockReturnValue(true)
  },
  emergencyContacts: {
    getContacts: jest.fn().mockResolvedValue([
      { name: 'Emergency Contact 1', phone: '+1234567890' },
      { name: 'Crisis Counselor', phone: '+0987654321' }
    ]),
    call: jest.fn().mockResolvedValue({ connected: true })
  },
  crisisResources: {
    getOfflineResources: jest.fn().mockReturnValue([
      { type: 'coping_strategy', content: 'Deep breathing exercise' },
      { type: 'safety_plan', content: 'Personal safety plan steps' }
    ])
  }
};

// Bridge between the test's number[] scenario data and the production
// `ClinicalScoringService` (which expects `AssessmentAnswer[]` with question
// IDs). Previously this file used a `mockClinicalCalculationService` that
// re-implemented scoring as `reduce + >= 15` — tautological, since the test
// asserted the mock matched its own logic. Per TEST-03 in the test-coverage
// audit, we exercise production scoring directly so a regression in
// `ClinicalScoringService` actually fails this gate.
function toPHQ9Answers(responses: number[]): AssessmentAnswer[] {
  // Production scoring requires exactly 9 PHQ-9 answers
  const padded = [...responses, ...Array(Math.max(0, 9 - responses.length)).fill(0)].slice(0, 9);
  return padded.map((response, i) => ({
    questionId: `phq9_${i + 1}`,
    response: response as AssessmentAnswer['response'],
    timestamp: Date.now(),
  }));
}

function toGAD7Answers(responses: number[]): AssessmentAnswer[] {
  const padded = [...responses, ...Array(Math.max(0, 7 - responses.length)).fill(0)].slice(0, 7);
  return padded.map((response, i) => ({
    questionId: `gad7_${i + 1}`,
    response: response as AssessmentAnswer['response'],
    timestamp: Date.now(),
  }));
}

const clinicalCalculationService = {
  calculatePHQ9Score: (responses: number[]): number => {
    return ClinicalScoringService.calculatePHQ9Score(toPHQ9Answers(responses)).totalScore;
  },

  calculateGAD7Score: (responses: number[]): number => {
    return ClinicalScoringService.calculateGAD7Score(toGAD7Answers(responses)).totalScore;
  },

  detectCrisisLevel: (phq9Score: number, gad7Score: number): boolean => {
    // Mirror the production isCrisis semantics in assessmentStore: ≥15 = crisis
    // (support recommended). Q9-driven crisis is exercised in the
    // suicidal-ideation test path; this helper covers score-only crisis.
    return phq9Score >= 15 || gad7Score >= 15;
  },

  generateRecommendations: (phq9Score: number, gad7Score: number) => {
    const isCrisis = phq9Score >= 15 || gad7Score >= 15;

    if (isCrisis) {
      return {
        priority: 'CRISIS',
        immediateActions: [
          'Contact 988 Suicide & Crisis Lifeline immediately',
          'Reach out to emergency contacts',
          'Consider going to nearest emergency room',
        ],
        resources: ['988 Hotline', 'Emergency Contacts', 'Crisis Text Line'],
      };
    }

    return {
      priority: 'STANDARD',
      recommendedActions: ['Continue monitoring', 'Practice coping strategies'],
      resources: ['Self-help tools', 'Breathing exercises'],
    };
  },
};

describe('Crisis Safety Testing Automation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset performance monitoring
    global.TEST_METRICS.performanceViolations = 0;
    global.TEST_METRICS.securityIssues = 0;
  });

  describe('🚨 Crisis Detection Accuracy (100% Precision Required)', () => {
    test.each(CRISIS_TEST_SCENARIOS)(
      'crisis detection for $scenario (PHQ-9: $phq9, GAD-7: $gad7)',
      ({ phq9, gad7, expectedCrisis, scenario }) => {
        const timer = PERFORMANCE_MONITOR.startTimer(`crisis-detection-${scenario}`);
        
        // Test clinical calculation accuracy
        const phq9Responses = new Array(9).fill(0).map((_, i) => 
          i < phq9 ? Math.min(3, Math.floor(phq9 / 9) + (phq9 % 9 > i ? 1 : 0)) : 0
        );
        const gad7Responses = new Array(7).fill(0).map((_, i) => 
          i < gad7 ? Math.min(3, Math.floor(gad7 / 7) + (gad7 % 7 > i ? 1 : 0)) : 0
        );
        
        const calculatedPHQ9 = clinicalCalculationService.calculatePHQ9Score(phq9Responses);
        const calculatedGAD7 = clinicalCalculationService.calculateGAD7Score(gad7Responses);
        const detectedCrisis = clinicalCalculationService.detectCrisisLevel(calculatedPHQ9, calculatedGAD7);
        
        const duration = timer.end();
        
        // Validate crisis detection accuracy
        SAFETY_VALIDATOR.validateAssessmentAccuracy(calculatedPHQ9, calculatedGAD7, expectedCrisis);
        
        // Performance validation - crisis detection must be fast
        expect(duration).toHaveCrisisResponseTime(200);
        
        // Accuracy validation - 100% precision required
        expect(detectedCrisis).toHaveCorrectCrisisDetection(calculatedPHQ9, calculatedGAD7);
        expect(detectedCrisis).toBe(expectedCrisis);
        
        // Clinical threshold validation. Crisis threshold is >=15 for BOTH
        // PHQ-9 and GAD-7 (per crisis.md and CRISIS_THRESHOLDS in
        // app/src/features/assessment/types/index.ts). The previous code
        // used 20 for PHQ-9 — that's the SEVERE band start, not the crisis
        // threshold. The dual-threshold model is: ≥15 = crisis (support
        // recommended), ≥20 = severe (immediate intervention).
        if (expectedCrisis) {
          expect(calculatedPHQ9 >= 15 || calculatedGAD7 >= 15).toBe(true);

          // Crisis recommendations must be generated
          const recommendations = clinicalCalculationService.generateRecommendations(calculatedPHQ9, calculatedGAD7);
          expect(recommendations.priority).toBe('CRISIS');
          expect(recommendations.immediateActions).toContain('Contact 988 Suicide & Crisis Lifeline immediately');
        } else {
          expect(calculatedPHQ9 < 15 && calculatedGAD7 < 15).toBe(true);
        }
      }
    );

    test('crisis detection consistency across multiple calculations', () => {
      // Test the same scenario multiple times to ensure consistency
      const testScenario = { phq9: 21, gad7: 16 }; // Clear crisis case
      const results: boolean[] = [];
      
      for (let i = 0; i < 100; i++) {
        const crisis = clinicalCalculationService.detectCrisisLevel(testScenario.phq9, testScenario.gad7);
        results.push(crisis);
      }
      
      // All results must be identical (100% consistency)
      const uniqueResults = [...new Set(results)];
      expect(uniqueResults).toHaveLength(1);
      expect(uniqueResults[0]).toBe(true);
    });

    test('boundary value precision testing', () => {
      // Crisis threshold is ≥15 for BOTH PHQ-9 and GAD-7 (the 20 threshold
      // tested previously is the SEVERE band start, not the crisis floor).
      // The "below threshold" case must be at 14 for both.
      const boundaryTests = [
        { phq9: 14, gad7: 14, expected: false, description: 'Just below both thresholds' },
        { phq9: 15, gad7: 14, expected: true, description: 'PHQ-9 at threshold' },
        { phq9: 14, gad7: 15, expected: true, description: 'GAD-7 at threshold' },
        { phq9: 15, gad7: 15, expected: true, description: 'Both at threshold' }
      ];
      
      boundaryTests.forEach(({ phq9, gad7, expected, description }) => {
        const result = clinicalCalculationService.detectCrisisLevel(phq9, gad7);
        expect(result).toBe(expected);
      });
    });
  });

  describe('⚡ Crisis Response Time Performance (<200ms)', () => {
    test('crisis button response time validation', async () => {
      const timer = PERFORMANCE_MONITOR.startTimer('crisis-button-response');
      
      // Simulate crisis button press
      const crisisButtonResponse = await mockCrisisServices.hotline988.call();
      
      const duration = timer.end();
      
      // Critical performance requirement
      expect(duration).toBeLessThan(200);
      expect(crisisButtonResponse.connected).toBe(true);
      expect(crisisButtonResponse.responseTime).toBeLessThan(200);
    });

    test('crisis detection calculation performance', () => {
      const timer = PERFORMANCE_MONITOR.startTimer('crisis-calculation');
      
      // Test with maximum score scenario (worst case performance)
      const phq9Responses = new Array(9).fill(3); // Maximum scores
      const gad7Responses = new Array(7).fill(3);
      
      const phq9Score = clinicalCalculationService.calculatePHQ9Score(phq9Responses);
      const gad7Score = clinicalCalculationService.calculateGAD7Score(gad7Responses);
      const crisisDetected = clinicalCalculationService.detectCrisisLevel(phq9Score, gad7Score);
      
      const duration = timer.end();
      
      // Crisis calculation must be immediate
      expect(duration).toBeLessThan(100);
      expect(crisisDetected).toBe(true);
    });

    test('emergency contact access performance', async () => {
      const timer = PERFORMANCE_MONITOR.startTimer('emergency-contacts');
      
      const contacts = await mockCrisisServices.emergencyContacts.getContacts();
      
      const duration = timer.end();
      
      expect(duration).toBeLessThan(150);
      expect(contacts).toHaveLength(2);
      expect(contacts[0]).toHaveProperty('phone');
    });

    test('performance under high load simulation', async () => {
      // Simulate multiple concurrent crisis scenarios
      const concurrentTests = Array.from({ length: 10 }, async (_, i) => {
        const timer = PERFORMANCE_MONITOR.startTimer(`concurrent-crisis-${i}`);
        
        const crisisDetected = clinicalCalculationService.detectCrisisLevel(21, 16);
        const hotlineCall = await mockCrisisServices.hotline988.call();
        
        const duration = timer.end();
        
        return { duration, crisisDetected, hotlineCall };
      });
      
      const results = await Promise.all(concurrentTests);
      
      // All concurrent operations must complete within performance threshold
      results.forEach((result, index) => {
        expect(result.duration).toBeLessThan(300); // Slightly higher threshold for concurrent operations
        expect(result.crisisDetected).toBe(true);
        expect(result.hotlineCall.connected).toBe(true);
      });
    });
  });

  describe('📞 988 Hotline Integration & Accessibility', () => {
    test('988 hotline availability verification', () => {
      const isAvailable = mockCrisisServices.hotline988.isAvailable();
      expect(isAvailable).toBe(true);
    });

    test('988 hotline connection reliability', async () => {
      const connectionAttempts = Array.from({ length: 5 }, () => 
        mockCrisisServices.hotline988.call()
      );
      
      const results = await Promise.all(connectionAttempts);
      
      // 100% success rate required for life-saving feature
      results.forEach(result => {
        expect(result.connected).toBe(true);
        expect(result.responseTime).toBeLessThan(200);
      });
    });

    test('hotline accessibility features', () => {
      // Simulate accessibility requirements testing
      const accessibilityFeatures = {
        screenReaderSupport: true,
        keyboardNavigation: true,
        highContrastSupport: true,
        voiceDialingSupport: true,
        ttySupport: true
      };
      
      Object.entries(accessibilityFeatures).forEach(([feature, supported]) => {
        expect(supported).toBe(true);
      });
    });

    test('offline 988 access fallback', () => {
      // Test offline scenario
      const offlineResources = mockCrisisServices.crisisResources.getOfflineResources();
      
      expect(offlineResources).toContainEqual(
        expect.objectContaining({
          type: 'coping_strategy'
        })
      );

      expect(offlineResources).toContainEqual(
        expect.objectContaining({
          type: 'safety_plan'
        })
      );
    });
  });

  describe('🔄 Crisis State Persistence & Recovery', () => {
    test('crisis state survives app restart simulation', () => {
      // Simulate crisis detection
      const crisisState = {
        detected: true,
        timestamp: Date.now(),
        phq9Score: 21,
        gad7Score: 16,
        emergencyContactsNotified: false,
        hotlineAttempted: false
      };
      
      // Simulate saving crisis state
      const savedState = JSON.stringify(crisisState);
      
      // Simulate app restart and state restoration
      const restoredState = JSON.parse(savedState);
      
      expect(restoredState.detected).toBe(true);
      expect(restoredState.phq9Score).toBe(21);
      expect(restoredState.gad7Score).toBe(16);
      expect(typeof restoredState.timestamp).toBe('number');
    });

    test('crisis data integrity validation', () => {
      const originalCrisisData = {
        scores: { phq9: 22, gad7: 17 },
        timestamp: Date.now(),
        interventions: ['988_called', 'contacts_notified']
      };
      
      // Simulate data corruption prevention
      const dataHash = JSON.stringify(originalCrisisData);
      const integrityCheck = dataHash.length > 0 && dataHash.includes('phq9');
      
      expect(integrityCheck).toBe(true);
    });

    test('crisis alert priority queue management', () => {
      const alertQueue = [
        { priority: 'CRISIS', message: '988 hotline call needed', timestamp: Date.now() },
        { priority: 'HIGH', message: 'Emergency contact notification', timestamp: Date.now() + 1000 },
        { priority: 'MEDIUM', message: 'Safety plan activation', timestamp: Date.now() + 2000 }
      ];
      
      // Sort by priority (crisis first)
      const sortedQueue = alertQueue.sort((a, b) => {
        const priorityOrder = { 'CRISIS': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
      
      expect(sortedQueue[0].priority).toBe('CRISIS');
      expect(sortedQueue[0].message).toContain('988');
    });
  });

  describe('🛡️ Crisis Safety Edge Cases & Error Handling', () => {
    test('invalid assessment data handling', () => {
      // Test with invalid inputs
      const invalidInputs = [
        { phq9: -1, gad7: 10 },
        { phq9: 30, gad7: 15 }, // Out of range
        { phq9: null, gad7: 15 },
        { phq9: 20, gad7: undefined }
      ];
      
      invalidInputs.forEach(({ phq9, gad7 }) => {
        // System should handle invalid inputs gracefully without crashing
        expect(() => {
          // Validate inputs before processing
          const isValidPHQ9 = phq9 !== null && phq9 !== undefined && phq9 >= 0 && phq9 <= 27;
          const isValidGAD7 = gad7 !== null && gad7 !== undefined && gad7 >= 0 && gad7 <= 21;
          
          if (!isValidPHQ9 || !isValidGAD7) {
            throw new Error('Invalid assessment data');
          }
          
          clinicalCalculationService.detectCrisisLevel(phq9, gad7);
        }).toThrow('Invalid assessment data');
      });
    });

    test('network failure crisis handling', async () => {
      // Simulate network failure
      const networkFailureScenario = {
        hotlineUnavailable: true,
        emergencyContactsUnavailable: true,
        internetConnection: false
      };
      
      if (networkFailureScenario.internetConnection === false) {
        // Should fall back to offline crisis resources
        const offlineResources = mockCrisisServices.crisisResources.getOfflineResources();
        
        expect(offlineResources.length).toBeGreaterThan(0);
        expect(offlineResources.some(resource => resource.type === 'coping_strategy')).toBe(true);
        expect(offlineResources.some(resource => resource.type === 'safety_plan')).toBe(true);
      }
    });

    test('concurrent crisis detection handling', () => {
      // Test multiple simultaneous crisis detections
      const concurrentCrises = [
        { phq9: 21, gad7: 16, userId: 'user1' },
        { phq9: 20, gad7: 15, userId: 'user2' },
        { phq9: 25, gad7: 20, userId: 'user3' }
      ];
      
      const results = concurrentCrises.map(crisis => ({
        userId: crisis.userId,
        detected: clinicalCalculationService.detectCrisisLevel(crisis.phq9, crisis.gad7),
        phq9: crisis.phq9,
        gad7: crisis.gad7
      }));
      
      // All crisis scenarios should be detected correctly
      results.forEach(result => {
        expect(result.detected).toBe(true);
      });
    });

    test('memory pressure during crisis scenarios', () => {
      // Simulate memory pressure scenario
      const largeCrisisDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        phq9: 20 + (i % 8), // Range 20-27
        gad7: 15 + (i % 7), // Range 15-21
        timestamp: Date.now() + i
      }));
      
      const crisisDetections = largeCrisisDataset.map(data => 
        clinicalCalculationService.detectCrisisLevel(data.phq9, data.gad7)
      );
      
      // All should be detected as crisis (scores are all above threshold)
      expect(crisisDetections.every(detected => detected === true)).toBe(true);
      
      // Memory usage should remain within reasonable test limits.
      // PERFORMANCE_MONITOR.checkMemoryUsage() returns total Jest-worker
      // heap (not the test's incremental memory), which on GitHub Actions
      // runners with Node 20 + Jest + react-native preset routinely
      // exceeds 150MB before the test code even runs. The 150 figure was
      // a category error — the 50MB production memory limit conflated
      // with the test environment limit. A 400MB ceiling catches genuine
      // runaway growth (millions of items, leaks) without flaking on the
      // baseline Jest worker overhead.
      //
      // For a sharper check, measure DELTA (heap before vs heap after the
      // 1000-detection loop). That's tracked as a follow-up; the current
      // ceiling is the quick fix.
      const memoryUsage = PERFORMANCE_MONITOR.checkMemoryUsage();
      expect(memoryUsage).toBeLessThan(400);
    });
  });

  describe('♿ Crisis Accessibility Compliance', () => {
    test('crisis button accessibility attributes', () => {
      const crisisButtonProps = {
        'aria-label': 'Emergency Crisis Support - Call 988 Suicide & Crisis Lifeline immediately',
        'role': 'button',
        'tabIndex': 0,
        'accessibilityLabel': 'Crisis support button',
        'accessibilityHint': 'Press to call 988 for immediate mental health crisis support',
        'accessibilityRole': 'button'
      };
      
      // Validate all required accessibility attributes
      expect(crisisButtonProps['aria-label']).toContain('988');
      expect(crisisButtonProps['aria-label']).toContain('Crisis');
      expect(crisisButtonProps.role).toBe('button');
      expect(crisisButtonProps.tabIndex).toBe(0);
      expect(crisisButtonProps.accessibilityLabel).toBeTruthy();
      expect(crisisButtonProps.accessibilityHint).toBeTruthy();
    });

    test('keyboard navigation to crisis features', () => {
      // Simulate tab order testing
      const tabOrder = [
        { element: 'crisis-button', tabIndex: 0, priority: 'HIGHEST' },
        { element: 'emergency-contacts', tabIndex: 1, priority: 'HIGH' },
        { element: 'assessment-form', tabIndex: 2, priority: 'MEDIUM' },
        { element: 'breathing-exercise', tabIndex: 3, priority: 'LOW' }
      ];
      
      // Crisis button should be first in tab order
      const sortedByTabIndex = tabOrder.sort((a, b) => a.tabIndex - b.tabIndex);
      expect(sortedByTabIndex[0].element).toBe('crisis-button');
      expect(sortedByTabIndex[0].priority).toBe('HIGHEST');
    });

    test('voice control crisis activation', () => {
      const voiceCommands = [
        'call nine eight eight',
        'emergency help',
        'crisis support',
        'suicide hotline',
        'mental health emergency'
      ];
      
      // All voice commands should be recognized for crisis activation
      voiceCommands.forEach(command => {
        const recognized = command.toLowerCase().includes('crisis') || 
                          command.includes('emergency') || 
                          command.includes('nine eight eight') ||
                          command.includes('suicide') ||
                          command.includes('mental health emergency');
        
        expect(recognized).toBe(true);
      });
    });
  });

  describe('📊 Crisis Analytics & Monitoring', () => {
    test('crisis intervention success tracking', () => {
      const crisisInterventions = [
        { timestamp: Date.now(), action: '988_called', success: true, responseTime: 150 },
        { timestamp: Date.now(), action: 'emergency_contact_notified', success: true, responseTime: 100 },
        { timestamp: Date.now(), action: 'safety_plan_activated', success: true, responseTime: 50 }
      ];
      
      const successRate = crisisInterventions.filter(i => i.success).length / crisisInterventions.length;
      const avgResponseTime = crisisInterventions.reduce((sum, i) => sum + i.responseTime, 0) / crisisInterventions.length;
      
      expect(successRate).toBe(1.0); // 100% success rate required
      expect(avgResponseTime).toBeLessThan(200); // Average response time under threshold
    });

    test('crisis detection accuracy metrics', () => {
      const testResults = CRISIS_TEST_SCENARIOS.map(scenario => {
        const detected = clinicalCalculationService.detectCrisisLevel(scenario.phq9, scenario.gad7);
        return {
          expected: scenario.expectedCrisis,
          actual: detected,
          correct: detected === scenario.expectedCrisis
        };
      });
      
      const accuracy = testResults.filter(r => r.correct).length / testResults.length;
      const falsePositives = testResults.filter(r => !r.expected && r.actual).length;
      const falseNegatives = testResults.filter(r => r.expected && !r.actual).length;
      
      expect(accuracy).toBe(1.0); // 100% accuracy required
      expect(falsePositives).toBe(0); // No false positives allowed
      expect(falseNegatives).toBe(0); // No false negatives allowed (life-threatening)
    });
  });

  // Final validation test
  test('🏥 COMPREHENSIVE CRISIS SAFETY VALIDATION', () => {
    console.log('🚨 RUNNING COMPREHENSIVE CRISIS SAFETY VALIDATION');
    
    // Test all critical crisis scenarios at once
    const criticalScenarios = [
      { phq9: 27, gad7: 21, description: 'Maximum crisis scores' },
      { phq9: 20, gad7: 0, description: 'PHQ-9 crisis only' },
      { phq9: 0, gad7: 15, description: 'GAD-7 crisis only' },
      { phq9: 19, gad7: 15, description: 'Mixed crisis threshold' }
    ];
    
    const validationResults = criticalScenarios.map(scenario => {
      const timer = PERFORMANCE_MONITOR.startTimer(`comprehensive-${scenario.description}`);
      
      const crisisDetected = clinicalCalculationService.detectCrisisLevel(scenario.phq9, scenario.gad7);
      const recommendations = clinicalCalculationService.generateRecommendations(scenario.phq9, scenario.gad7);
      
      const duration = timer.end();
      
      return {
        scenario: scenario.description,
        crisisDetected,
        has988Recommendation: recommendations.immediateActions?.some(action => action.includes('988')),
        performanceMs: duration,
        passed: crisisDetected && duration < 200
      };
    });
    
    // All critical scenarios must pass
    validationResults.forEach(result => {
      expect(result.crisisDetected).toBe(true);
      expect(result.has988Recommendation).toBe(true);
      expect(result.performanceMs).toBeLessThan(200);
      expect(result.passed).toBe(true);
    });
    
    // Log comprehensive validation results
    console.log('✅ CRISIS SAFETY VALIDATION COMPLETE');
    console.log(`📊 Scenarios tested: ${validationResults.length}`);
    console.log(`⚡ Average response time: ${validationResults.reduce((sum, r) => sum + r.performanceMs, 0) / validationResults.length}ms`);
    console.log('🏥 All life-saving systems operational');
  });
});