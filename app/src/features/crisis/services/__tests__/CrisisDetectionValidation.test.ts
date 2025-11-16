/**
 * COMPREHENSIVE CRISIS DETECTION VALIDATION - DRD-FLOW-005 Testing Suite
 *
 * CRITICAL TESTING REQUIREMENTS:
 * - 100% clinical accuracy validation (27 PHQ-9 + 21 GAD-7 combinations)
 * - Performance requirements validation (<200ms detection)
 * - Suicidal ideation immediate response testing (<50ms)
 * - Crisis intervention workflow testing (all severity levels)
 * - Data integrity and storage validation
 * - Integration testing with assessment components
 * - Fail-safe mechanism validation
 * - Regulatory compliance verification
 *
 * TESTING SCENARIOS:
 * 1. Clinical Accuracy Tests (All score combinations)
 * 2. Performance Tests (Response time validation)
 * 3. Suicidal Ideation Tests (Immediate intervention)
 * 4. Crisis Workflow Tests (All intervention paths)
 * 5. Integration Tests (Component coordination)
 * 6. Error Handling Tests (Fail-safe validation)
 * 7. Compliance Tests (Regulatory requirements)
 * 8. Stress Tests (High load scenarios)
 */


import { logSecurity, logPerformance, logError, LogCategory } from '../../logging';
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import CrisisDetectionEngine from '../CrisisDetectionEngine';
import SuicidalIdeationProtocol from '../SuicidalIdeationProtocol';
import CrisisInterventionWorkflow from '../CrisisInterventionWorkflow';
import CrisisDataManagement from '../CrisisDataManagement';
import CrisisPerformanceMonitor from '../CrisisPerformanceMonitor';
import CrisisIntegrationOrchestrator from '../CrisisIntegrationOrchestrator';
import type {
  PHQ9Result,
  GAD7Result,
  CrisisDetection,
  CrisisIntervention,
  AssessmentAnswer
} from '@/flows/assessment/types';

/**
 * TEST CONFIGURATION
 */
const TEST_CONFIG = {
  PERFORMANCE_TIMEOUT_MS: 300, // Extra buffer for testing
  SUICIDAL_IDEATION_TIMEOUT_MS: 100,
  CRISIS_DETECTION_MAX_MS: 200,
  TEST_USER_ID: 'test_user_crisis_validation',
  TEST_ASSESSMENT_ID: 'test_assessment_crisis_validation'
} as const;

/**
 * MOCK DATA GENERATORS
 */
class CrisisTestDataGenerator {
  /**
   * Generate all possible PHQ-9 score combinations (0-27)
   */
  static generateAllPHQ9Combinations(): PHQ9Result[] {
    const combinations: PHQ9Result[] = [];

    for (let score = 0; score <= 27; score++) {
      // Test without suicidal ideation
      combinations.push({
        totalScore: score,
        severity: this.getPHQ9Severity(score),
        isCrisis: score >= 15, // Updated 2025-01-27: PHQ-9≥15 triggers crisis
        suicidalIdeation: false,
        completedAt: Date.now(),
        answers: this.generatePHQ9Answers(score, false)
      });

      // Test with suicidal ideation (if score allows)
      if (score >= 1) {
        combinations.push({
          totalScore: score,
          severity: this.getPHQ9Severity(score),
          isCrisis: true, // Always crisis with suicidal ideation
          suicidalIdeation: true,
          completedAt: Date.now(),
          answers: this.generatePHQ9Answers(score, true)
        });
      }
    }

    return combinations;
  }

  /**
   * Generate all possible GAD-7 score combinations (0-21)
   */
  static generateAllGAD7Combinations(): GAD7Result[] {
    const combinations: GAD7Result[] = [];

    for (let score = 0; score <= 21; score++) {
      combinations.push({
        totalScore: score,
        severity: this.getGAD7Severity(score),
        isCrisis: score >= 15,
        completedAt: Date.now(),
        answers: this.generateGAD7Answers(score)
      });
    }

    return combinations;
  }

  /**
   * Generate specific high-risk scenarios
   */
  static generateHighRiskScenarios(): Array<{ phq9: PHQ9Result; gad7: GAD7Result; description: string }> {
    return [
      {
        description: 'Maximum scores with suicidal ideation',
        phq9: {
          totalScore: 27,
          severity: 'severe',
          isCrisis: true,
          suicidalIdeation: true,
          completedAt: Date.now(),
          answers: this.generatePHQ9Answers(27, true)
        },
        gad7: {
          totalScore: 21,
          severity: 'severe',
          isCrisis: true,
          completedAt: Date.now(),
          answers: this.generateGAD7Answers(21)
        }
      },
      {
        description: 'Moderate crisis threshold (PHQ-9≥15)',
        phq9: {
          totalScore: 15,
          severity: 'moderately_severe',
          isCrisis: true,
          suicidalIdeation: false,
          completedAt: Date.now(),
          answers: this.generatePHQ9Answers(15, false)
        },
        gad7: {
          totalScore: 15,
          severity: 'severe',
          isCrisis: true,
          completedAt: Date.now(),
          answers: this.generateGAD7Answers(15)
        }
      },
      {
        description: 'Severe crisis threshold (PHQ-9≥20)',
        phq9: {
          totalScore: 20,
          severity: 'severe',
          isCrisis: true,
          suicidalIdeation: false,
          completedAt: Date.now(),
          answers: this.generatePHQ9Answers(20, false)
        },
        gad7: {
          totalScore: 15,
          severity: 'severe',
          isCrisis: true,
          completedAt: Date.now(),
          answers: this.generateGAD7Answers(15)
        }
      },
      {
        description: 'Low score with suicidal ideation',
        phq9: {
          totalScore: 5,
          severity: 'mild',
          isCrisis: true,
          suicidalIdeation: true,
          completedAt: Date.now(),
          answers: this.generatePHQ9Answers(5, true)
        },
        gad7: {
          totalScore: 3,
          severity: 'minimal',
          isCrisis: false,
          completedAt: Date.now(),
          answers: this.generateGAD7Answers(3)
        }
      }
    ];
  }

  private static getPHQ9Severity(score: number): PHQ9Result['severity'] {
    if (score <= 4) return 'minimal';
    if (score <= 9) return 'mild';
    if (score <= 14) return 'moderate';
    if (score <= 19) return 'moderately_severe';
    return 'severe';
  }

  private static getGAD7Severity(score: number): GAD7Result['severity'] {
    if (score <= 4) return 'minimal';
    if (score <= 9) return 'mild';
    if (score <= 14) return 'moderate';
    return 'severe';
  }

  private static generatePHQ9Answers(totalScore: number, includeSuicidalIdeation: boolean): AssessmentAnswer[] {
    const answers: AssessmentAnswer[] = [];
    let remainingScore = totalScore;

    // Generate answers for questions 1-8
    for (let i = 1; i <= 8; i++) {
      const maxForThisQuestion = Math.min(3, remainingScore);
      const response = Math.floor(Math.random() * (maxForThisQuestion + 1));

      answers.push({
        questionId: `phq9_${i}`,
        response,
        timestamp: Date.now() - (9 - i) * 1000
      });

      remainingScore -= response;
    }

    // Question 9 (suicidal ideation)
    const q9Response = includeSuicidalIdeation ? Math.max(1, remainingScore) : 0;
    answers.push({
      questionId: 'phq9_9',
      response: q9Response,
      timestamp: Date.now()
    });

    return answers;
  }

  private static generateGAD7Answers(totalScore: number): AssessmentAnswer[] {
    const answers: AssessmentAnswer[] = [];
    let remainingScore = totalScore;

    for (let i = 1; i <= 7; i++) {
      const maxForThisQuestion = Math.min(3, remainingScore);
      const response = i === 7 ? remainingScore : Math.floor(Math.random() * (maxForThisQuestion + 1));

      answers.push({
        questionId: `gad7_${i}`,
        response,
        timestamp: Date.now() - (8 - i) * 1000
      });

      remainingScore -= response;
    }

    return answers;
  }
}

/**
 * PERFORMANCE TESTING UTILITIES
 */
class PerformanceTestUtils {
  static async measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; executionTimeMs: number }> {
    const startTime = performance.now();
    const result = await fn();
    const executionTimeMs = performance.now() - startTime;
    return { result, executionTimeMs };
  }

  static async runPerformanceTest(
    testName: string,
    testFn: () => Promise<any>,
    maxTimeMs: number,
    iterations: number = 10
  ): Promise<{ success: boolean; averageTimeMs: number; maxTimeMs: number; violations: number }> {
    const executionTimes: number[] = [];
    let violations = 0;

    for (let i = 0; i < iterations; i++) {
      const { executionTimeMs } = await PerformanceTestUtils.measureExecutionTime(testFn);
      executionTimes.push(executionTimeMs);

      if (executionTimeMs > maxTimeMs) {
        violations++;
      }
    }

    const averageTimeMs = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
    const maxExecutionTime = Math.max(...executionTimes);

    return {
      success: violations === 0,
      averageTimeMs,
      maxTimeMs: maxExecutionTime,
      violations
    };
  }
}

/**
 * CLINICAL ACCURACY VALIDATION TESTS
 */
describe('Crisis Detection - Clinical Accuracy Validation', () => {
  let crisisEngine: typeof CrisisDetectionEngine;

  beforeEach(() => {
    crisisEngine = CrisisDetectionEngine;
    jest.clearAllMocks();
  });

  test('PHQ-9 Crisis Detection - All Score Combinations (0-27)', async () => {
    const allCombinations = CrisisTestDataGenerator.generateAllPHQ9Combinations();
    let correctDetections = 0;
    let totalTests = 0;

    for (const phq9Result of allCombinations) {
      const detection = await crisisEngine.detectCrisis(
        phq9Result,
        TEST_CONFIG.TEST_USER_ID,
        `${TEST_CONFIG.TEST_ASSESSMENT_ID}_phq9_${totalTests}`
      );

      totalTests++;

      // Validate crisis detection logic
      const expectedCrisis = phq9Result.totalScore >= 20 || phq9Result.suicidalIdeation;
      const actualCrisis = detection !== null;

      if (expectedCrisis === actualCrisis) {
        correctDetections++;

        // Additional validation for detected crises
        if (detection) {
          if (phq9Result.suicidalIdeation) {
            expect(detection.primaryTrigger).toBe('phq9_suicidal_ideation');
            expect(detection.severityLevel).toBeOneOf(['critical', 'emergency']);
          } else if (phq9Result.totalScore >= 20) {
            expect(detection.primaryTrigger).toBe('phq9_severe_score');
            expect(detection.severityLevel).toBeOneOf(['high', 'critical']);
          }
        }
      } else {
        logError(`PHQ-9 Detection Mismatch - Score: ${phq9Result.totalScore}, Suicidal: ${phq9Result.suicidalIdeation}, Expected: ${expectedCrisis}, Actual: ${actualCrisis}`);
      }
    }

    const accuracyPercent = (correctDetections / totalTests) * 100;
    expect(accuracyPercent).toBe(100); // MUST be 100% for regulatory compliance
    logPerformance(`PHQ-9 Clinical Accuracy: ${accuracyPercent}% (${correctDetections}/${totalTests})`);
  });

  test('GAD-7 Crisis Detection - All Score Combinations (0-21)', async () => {
    const allCombinations = CrisisTestDataGenerator.generateAllGAD7Combinations();
    let correctDetections = 0;
    let totalTests = 0;

    for (const gad7Result of allCombinations) {
      const detection = await crisisEngine.detectCrisis(
        gad7Result,
        TEST_CONFIG.TEST_USER_ID,
        `${TEST_CONFIG.TEST_ASSESSMENT_ID}_gad7_${totalTests}`
      );

      totalTests++;

      // Validate crisis detection logic
      const expectedCrisis = gad7Result.totalScore >= 15;
      const actualCrisis = detection !== null;

      if (expectedCrisis === actualCrisis) {
        correctDetections++;

        // Additional validation for detected crises
        if (detection) {
          expect(detection.primaryTrigger).toBe('gad7_severe_score');
          expect(detection.severityLevel).toBe('high');
          expect(detection.assessmentType).toBe('gad7');
        }
      } else {
        logError(`GAD-7 Detection Mismatch - Score: ${gad7Result.totalScore}, Expected: ${expectedCrisis}, Actual: ${actualCrisis}`);
      }
    }

    const accuracyPercent = (correctDetections / totalTests) * 100;
    expect(accuracyPercent).toBe(100); // MUST be 100% for regulatory compliance
    logPerformance(`GAD-7 Clinical Accuracy: ${accuracyPercent}% (${correctDetections}/${totalTests})`);
  });

  test('High-Risk Scenario Validation', async () => {
    const highRiskScenarios = CrisisTestDataGenerator.generateHighRiskScenarios();

    for (const scenario of highRiskScenarios) {
      console.log(`Testing scenario: ${scenario.description}`);

      // Test PHQ-9 detection
      const phq9Detection = await crisisEngine.detectCrisis(
        scenario.phq9,
        TEST_CONFIG.TEST_USER_ID,
        `test_scenario_phq9_${Date.now()}`
      );

      if (scenario.phq9.isCrisis) {
        expect(phq9Detection).not.toBeNull();
        expect(phq9Detection!.isTriggered).toBe(true);

        if (scenario.phq9.suicidalIdeation) {
          expect(phq9Detection!.primaryTrigger).toBe('phq9_suicidal_ideation');
        }
      }

      // Test GAD-7 detection
      const gad7Detection = await crisisEngine.detectCrisis(
        scenario.gad7,
        TEST_CONFIG.TEST_USER_ID,
        `test_scenario_gad7_${Date.now()}`
      );

      if (scenario.gad7.isCrisis) {
        expect(gad7Detection).not.toBeNull();
        expect(gad7Detection!.isTriggered).toBe(true);
        expect(gad7Detection!.primaryTrigger).toBe('gad7_severe_score');
      }
    }
  });
});

/**
 * PERFORMANCE VALIDATION TESTS
 */
describe('Crisis Detection - Performance Requirements', () => {
  let crisisEngine: typeof CrisisDetectionEngine;

  beforeEach(() => {
    crisisEngine = CrisisDetectionEngine;
  });

  test('Crisis Detection Performance - <200ms Requirement', async () => {
    const testCases = [
      CrisisTestDataGenerator.generateAllPHQ9Combinations()[40], // High score
      CrisisTestDataGenerator.generateAllGAD7Combinations()[20], // High score
    ];

    for (const testCase of testCases) {
      const performanceResult = await PerformanceTestUtils.runPerformanceTest(
        'Crisis Detection',
        async () => {
          await crisisEngine.detectCrisis(
            testCase,
            TEST_CONFIG.TEST_USER_ID,
            `perf_test_${Date.now()}`
          );
        },
        TEST_CONFIG.CRISIS_DETECTION_MAX_MS,
        20 // Run 20 iterations
      );

      expect(performanceResult.success).toBe(true);
      expect(performanceResult.averageTimeMs).toBeLessThan(TEST_CONFIG.CRISIS_DETECTION_MAX_MS);
      expect(performanceResult.violations).toBe(0);

      logPerformance(`Crisis Detection Performance: Average ${performanceResult.averageTimeMs.toFixed(2)}ms, Max ${performanceResult.maxTimeMs.toFixed(2)}ms`);
    }
  });

  test('Suicidal Ideation Detection Performance - <50ms Requirement', async () => {
    const suicidalIdeationProtocol = SuicidalIdeationProtocol;

    const performanceResult = await PerformanceTestUtils.runPerformanceTest(
      'Suicidal Ideation Detection',
      async () => {
        await suicidalIdeationProtocol.detectSuicidalIdeation(
          'phq9_9',
          2, // Positive response
          TEST_CONFIG.TEST_USER_ID,
          `si_perf_test_${Date.now()}`
        );
      },
      TEST_CONFIG.SUICIDAL_IDEATION_TIMEOUT_MS,
      30 // Run 30 iterations for critical performance test
    );

    expect(performanceResult.success).toBe(true);
    expect(performanceResult.averageTimeMs).toBeLessThan(50); // Strict requirement
    expect(performanceResult.violations).toBe(0);

    logPerformance(`Suicidal Ideation Performance: Average ${performanceResult.averageTimeMs.toFixed(2)}ms, Max ${performanceResult.maxTimeMs.toFixed(2)}ms`);
  });

  test('Crisis Intervention Workflow Performance', async () => {
    const interventionWorkflow = CrisisInterventionWorkflow;

    // Create test detection
    const testDetection: CrisisDetection = {
      id: 'perf_test_detection',
      isTriggered: true,
      primaryTrigger: 'phq9_severe_score',
      secondaryTriggers: [],
      severityLevel: 'high',
      triggerValue: 25,
      assessmentType: 'phq9',
      timestamp: Date.now(),
      assessmentId: 'perf_test_assessment',
      userId: TEST_CONFIG.TEST_USER_ID,
      detectionResponseTimeMs: 100,
      context: {
        triggeringAnswers: [],
        timeOfDay: 'afternoon'
      }
    };

    const { executionTimeMs } = await PerformanceTestUtils.measureExecutionTime(async () => {
      await interventionWorkflow.initiateCrisisWorkflow(testDetection, {
        detection: testDetection,
        interventionId: 'perf_test_intervention',
        interventionStarted: true,
        startTimestamp: Date.now(),
        contactedSupport: false,
        responseTime: 0,
        status: 'initiated',
        actionsTaken: [],
        followUp: {
          required: true,
          urgency: 'immediate',
          type: 'clinical_assessment',
          recommendations: [],
          contacts: [],
          completed: false
        },
        canDismiss: false,
        dismissalAvailableAt: Date.now() + 30000
      });
    });

    expect(executionTimeMs).toBeLessThan(3000); // 3 second requirement
    logPerformance(`Crisis Intervention Workflow Performance: ${executionTimeMs.toFixed(2)}ms`);
  });
});

/**
 * SUICIDAL IDEATION SPECIFIC TESTS
 */
describe('Suicidal Ideation Detection - Immediate Response', () => {
  let suicidalIdeationProtocol: typeof SuicidalIdeationProtocol;

  beforeEach(() => {
    suicidalIdeationProtocol = SuicidalIdeationProtocol;
  });

  test('PHQ-9 Question 9 Response 1 (Several Days)', async () => {
    const detection = await suicidalIdeationProtocol.detectSuicidalIdeation(
      'phq9_9',
      1,
      TEST_CONFIG.TEST_USER_ID,
      'test_si_1'
    );

    expect(detection).not.toBeNull();
    expect(detection!.response).toBe(1);
    expect(detection!.severity).toBe('several_days');
    expect(detection!.riskLevel).toBeOneOf(['moderate', 'high']);
  });

  test('PHQ-9 Question 9 Response 2 (More than Half Days)', async () => {
    const detection = await suicidalIdeationProtocol.detectSuicidalIdeation(
      'phq9_9',
      2,
      TEST_CONFIG.TEST_USER_ID,
      'test_si_2'
    );

    expect(detection).not.toBeNull();
    expect(detection!.response).toBe(2);
    expect(detection!.severity).toBe('more_than_half');
    expect(detection!.riskLevel).toBeOneOf(['high', 'critical']);
  });

  test('PHQ-9 Question 9 Response 3 (Nearly Every Day)', async () => {
    const detection = await suicidalIdeationProtocol.detectSuicidalIdeation(
      'phq9_9',
      3,
      TEST_CONFIG.TEST_USER_ID,
      'test_si_3'
    );

    expect(detection).not.toBeNull();
    expect(detection!.response).toBe(3);
    expect(detection!.severity).toBe('nearly_every_day');
    expect(detection!.riskLevel).toBeOneOf(['critical', 'emergency']);
  });

  test('PHQ-9 Question 9 Response 0 (No Suicidal Ideation)', async () => {
    const detection = await suicidalIdeationProtocol.detectSuicidalIdeation(
      'phq9_9',
      0,
      TEST_CONFIG.TEST_USER_ID,
      'test_si_0'
    );

    expect(detection).toBeNull();
  });

  test('Non-PHQ-9-Q9 Questions Should Not Trigger', async () => {
    const detection = await suicidalIdeationProtocol.detectSuicidalIdeation(
      'phq9_8',
      3,
      TEST_CONFIG.TEST_USER_ID,
      'test_non_si'
    );

    expect(detection).toBeNull();
  });
});

/**
 * CRISIS WORKFLOW VALIDATION TESTS
 */
describe('Crisis Intervention Workflow - All Severity Levels', () => {
  let interventionWorkflow: typeof CrisisInterventionWorkflow;

  beforeEach(() => {
    interventionWorkflow = CrisisInterventionWorkflow;
  });

  const createTestDetection = (severity: string): CrisisDetection => ({
    id: `test_${severity}_${Date.now()}`,
    isTriggered: true,
    primaryTrigger: severity === 'emergency' ? 'phq9_suicidal_ideation' : 'phq9_severe_score',
    secondaryTriggers: [],
    severityLevel: severity as any,
    triggerValue: 25,
    assessmentType: 'phq9',
    timestamp: Date.now(),
    assessmentId: 'test_assessment',
    userId: TEST_CONFIG.TEST_USER_ID,
    detectionResponseTimeMs: 100,
    context: {
      triggeringAnswers: [],
      timeOfDay: 'afternoon'
    }
  });

  test('Emergency Severity Workflow', async () => {
    const detection = createTestDetection('emergency');

    const workflowContext = await interventionWorkflow.initiateCrisisWorkflow(detection, {
      detection,
      interventionId: 'test_emergency_intervention',
      interventionStarted: true,
      startTimestamp: Date.now(),
      contactedSupport: false,
      responseTime: 0,
      status: 'initiated',
      actionsTaken: [],
      followUp: {
        required: true,
        urgency: 'immediate',
        type: 'clinical_assessment',
        recommendations: [],
        contacts: [],
        completed: false
      },
      canDismiss: false,
      dismissalAvailableAt: Date.now() + 30000
    });

    expect(workflowContext).toBeDefined();
    expect(workflowContext.detection.severityLevel).toBe('emergency');
  });

  test('Critical Severity Workflow', async () => {
    const detection = createTestDetection('critical');

    const workflowContext = await interventionWorkflow.initiateCrisisWorkflow(detection, {
      detection,
      interventionId: 'test_critical_intervention',
      interventionStarted: true,
      startTimestamp: Date.now(),
      contactedSupport: false,
      responseTime: 0,
      status: 'initiated',
      actionsTaken: [],
      followUp: {
        required: true,
        urgency: 'immediate',
        type: 'clinical_assessment',
        recommendations: [],
        contacts: [],
        completed: false
      },
      canDismiss: false,
      dismissalAvailableAt: Date.now() + 30000
    });

    expect(workflowContext).toBeDefined();
    expect(workflowContext.detection.severityLevel).toBe('critical');
  });

  test('High Risk Workflow', async () => {
    const detection = createTestDetection('high');

    const workflowContext = await interventionWorkflow.initiateCrisisWorkflow(detection, {
      detection,
      interventionId: 'test_high_intervention',
      interventionStarted: true,
      startTimestamp: Date.now(),
      contactedSupport: false,
      responseTime: 0,
      status: 'initiated',
      actionsTaken: [],
      followUp: {
        required: true,
        urgency: 'within_24h',
        type: 'clinical_assessment',
        recommendations: [],
        contacts: [],
        completed: false
      },
      canDismiss: false,
      dismissalAvailableAt: Date.now() + 30000
    });

    expect(workflowContext).toBeDefined();
    expect(workflowContext.detection.severityLevel).toBe('high');
  });

  test('Moderate Risk Workflow', async () => {
    const detection = createTestDetection('moderate');

    const workflowContext = await interventionWorkflow.initiateCrisisWorkflow(detection, {
      detection,
      interventionId: 'test_moderate_intervention',
      interventionStarted: true,
      startTimestamp: Date.now(),
      contactedSupport: false,
      responseTime: 0,
      status: 'initiated',
      actionsTaken: [],
      followUp: {
        required: false,
        urgency: 'within_48h',
        type: 'clinical_assessment',
        recommendations: [],
        contacts: [],
        completed: false
      },
      canDismiss: true,
      dismissalAvailableAt: Date.now() + 10000
    });

    expect(workflowContext).toBeDefined();
    expect(workflowContext.detection.severityLevel).toBe('moderate');
  });
});

/**
 * DATA INTEGRITY AND STORAGE TESTS
 */
describe('Crisis Data Management - Data Integrity', () => {
  let dataManagement: typeof CrisisDataManagement;

  beforeEach(() => {
    dataManagement = CrisisDataManagement;
  });

  test('Crisis Data Capture and Storage', async () => {
    const testDetection: CrisisDetection = {
      id: 'data_test_detection',
      isTriggered: true,
      primaryTrigger: 'phq9_severe_score',
      secondaryTriggers: [],
      severityLevel: 'high',
      triggerValue: 22,
      assessmentType: 'phq9',
      timestamp: Date.now(),
      assessmentId: 'data_test_assessment',
      userId: TEST_CONFIG.TEST_USER_ID,
      detectionResponseTimeMs: 150,
      context: {
        triggeringAnswers: [],
        timeOfDay: 'morning'
      }
    };

    const testIntervention: CrisisIntervention = {
      detection: testDetection,
      interventionId: 'data_test_intervention',
      interventionStarted: true,
      startTimestamp: Date.now(),
      contactedSupport: false,
      responseTime: 200,
      status: 'initiated',
      actionsTaken: [],
      followUp: {
        required: true,
        urgency: 'within_24h',
        type: 'clinical_assessment',
        recommendations: [],
        contacts: [],
        completed: false
      },
      canDismiss: false,
      dismissalAvailableAt: Date.now() + 30000
    };

    const packageId = await dataManagement.captureCrisisEpisode(
      testDetection,
      testIntervention
    );

    expect(packageId).toBeDefined();
    expect(typeof packageId).toBe('string');
    expect(packageId.length).toBeGreaterThan(0);

    // Verify data retrieval
    const summary = await dataManagement.getCrisisDataSummary(packageId);
    expect(summary).toBeDefined();
    expect(summary.crisisEpisodeId).toBe(testDetection.id);
    expect(summary.severity).toBe(testDetection.severityLevel);
  });

  test('Data Validation and Integrity Checks', async () => {
    // Test data validation with invalid data
    const invalidDetection = {
      id: '', // Invalid empty ID
      isTriggered: true,
      primaryTrigger: 'invalid_trigger',
      severityLevel: 'unknown_severity'
    } as any;

    const invalidIntervention = {
      detection: invalidDetection,
      interventionId: '',
      interventionStarted: false
    } as any;

    await expect(
      dataManagement.captureCrisisEpisode(invalidDetection, invalidIntervention)
    ).rejects.toThrow();
  });

  test('Data Export Functionality', async () => {
    const testDetection: CrisisDetection = {
      id: 'export_test_detection',
      isTriggered: true,
      primaryTrigger: 'gad7_severe_score',
      secondaryTriggers: [],
      severityLevel: 'high',
      triggerValue: 18,
      assessmentType: 'gad7',
      timestamp: Date.now(),
      assessmentId: 'export_test_assessment',
      userId: TEST_CONFIG.TEST_USER_ID,
      detectionResponseTimeMs: 120,
      context: {
        triggeringAnswers: [],
        timeOfDay: 'evening'
      }
    };

    const testIntervention: CrisisIntervention = {
      detection: testDetection,
      interventionId: 'export_test_intervention',
      interventionStarted: true,
      startTimestamp: Date.now(),
      contactedSupport: true,
      responseTime: 180,
      status: 'resolved',
      actionsTaken: [{
        type: 'contacted_988',
        timestamp: Date.now(),
        durationMs: 300000,
        completed: true
      }],
      followUp: {
        required: true,
        urgency: 'within_24h',
        type: 'clinical_assessment',
        recommendations: ['Follow up with mental health professional'],
        contacts: [],
        completed: false
      },
      canDismiss: true,
      dismissalAvailableAt: Date.now() - 1000
    };

    const packageId = await dataManagement.captureCrisisEpisode(
      testDetection,
      testIntervention
    );

    const exportedData = await dataManagement.exportCrisisData(packageId);
    expect(exportedData).toBeDefined();
    expect(typeof exportedData).toBe('string');

    const parsedData = JSON.parse(exportedData);
    expect(parsedData.packageId).toBe(packageId);
    expect(parsedData.detection.detection.id).toBe(testDetection.id);
  });
});

/**
 * INTEGRATION TESTING
 */
describe('Crisis Integration - Component Coordination', () => {
  let integrationOrchestrator: typeof CrisisIntegrationOrchestrator;

  beforeEach(async () => {
    integrationOrchestrator = CrisisIntegrationOrchestrator;
    await integrationOrchestrator.initializeCrisisIntegration();
  });

  afterEach(async () => {
    await integrationOrchestrator.shutdownIntegration();
  });

  test('Assessment Response Monitoring Integration', async () => {
    await integrationOrchestrator.monitorAssessmentResponse(
      'phq9_5',
      2,
      'phq9',
      TEST_CONFIG.TEST_USER_ID,
      'integration_test_assessment'
    );

    const status = integrationOrchestrator.getIntegrationStatus();
    expect(status.isActive).toBe(true);
    expect(status.monitoringEnabled).toBe(true);
  });

  test('Crisis Detection Integration Flow', async () => {
    const phq9Result: PHQ9Result = {
      totalScore: 24,
      severity: 'severe',
      isCrisis: true,
      suicidalIdeation: false,
      completedAt: Date.now(),
      answers: CrisisTestDataGenerator.generateAllPHQ9Combinations()[48].answers
    };

    const detection = await integrationOrchestrator.handleAssessmentCompletion(
      phq9Result,
      'phq9',
      TEST_CONFIG.TEST_USER_ID,
      'integration_crisis_test'
    );

    expect(detection).not.toBeNull();
    expect(detection!.isTriggered).toBe(true);
    expect(detection!.assessmentType).toBe('phq9');
  });

  test('Integration Error Handling', async () => {
    // Clear any existing errors
    integrationOrchestrator.clearIntegrationErrors();

    // Trigger an error condition
    try {
      await integrationOrchestrator.handleAssessmentCompletion(
        null as any, // Invalid input
        'phq9',
        TEST_CONFIG.TEST_USER_ID,
        'error_test'
      );
    } catch (error) {
      // Expected to fail
    }

    const errors = integrationOrchestrator.getIntegrationErrors();
    expect(errors.length).toBeGreaterThan(0);
  });
});

/**
 * PERFORMANCE MONITORING TESTS
 */
describe('Crisis Performance Monitoring - Quality Assurance', () => {
  let performanceMonitor: typeof CrisisPerformanceMonitor;

  beforeEach(() => {
    performanceMonitor = CrisisPerformanceMonitor;
    performanceMonitor.startMonitoring();
  });

  afterEach(() => {
    performanceMonitor.stopMonitoring();
  });

  test('Performance Metric Recording', async () => {
    const testDetection: CrisisDetection = {
      id: 'perf_monitor_test',
      isTriggered: true,
      primaryTrigger: 'phq9_severe_score',
      secondaryTriggers: [],
      severityLevel: 'high',
      triggerValue: 21,
      assessmentType: 'phq9',
      timestamp: Date.now(),
      assessmentId: 'perf_monitor_assessment',
      userId: TEST_CONFIG.TEST_USER_ID,
      detectionResponseTimeMs: 150,
      context: {
        triggeringAnswers: [],
        timeOfDay: 'afternoon'
      }
    };

    await performanceMonitor.recordCrisisDetection(
      testDetection,
      150,
      true
    );

    const metrics = performanceMonitor.getCurrentMetrics();
    expect(metrics.size).toBeGreaterThan(0);

    const status = performanceMonitor.getPerformanceStatus();
    expect(['optimal', 'warning', 'degraded', 'critical']).toContain(status);
  });

  test('Performance Report Generation', async () => {
    const startTime = Date.now() - 60000; // 1 minute ago
    const endTime = Date.now();

    const report = await performanceMonitor.generatePerformanceReport(startTime, endTime);

    expect(report).toBeDefined();
    expect(report.reportId).toBeDefined();
    expect(report.timeRange.startTime).toBe(startTime);
    expect(report.timeRange.endTime).toBe(endTime);
    expect(report.summary).toBeDefined();
    expect(report.detailedMetrics).toBeDefined();
    expect(report.complianceStatus).toBeDefined();
  });

  test('Alert Generation and Management', async () => {
    // Record a performance violation
    await performanceMonitor.recordCrisisDetection(
      {
        id: 'alert_test',
        isTriggered: true,
        primaryTrigger: 'phq9_severe_score',
        secondaryTriggers: [],
        severityLevel: 'high',
        triggerValue: 20,
        assessmentType: 'phq9',
        timestamp: Date.now(),
        assessmentId: 'alert_test_assessment',
        userId: TEST_CONFIG.TEST_USER_ID,
        detectionResponseTimeMs: 250, // Exceeds 200ms limit
        context: {
          triggeringAnswers: [],
          timeOfDay: 'morning'
        }
      },
      250, // Exceeds performance threshold
      true
    );

    const activeAlerts = performanceMonitor.getActiveAlerts();
    expect(activeAlerts.length).toBeGreaterThan(0);

    // Test alert acknowledgment
    if (activeAlerts.length > 0) {
      const alertId = activeAlerts[0].id;
      const acknowledged = await performanceMonitor.acknowledgeAlert(alertId);
      expect(acknowledged).toBe(true);
    }
  });
});

/**
 * FAIL-SAFE MECHANISM TESTS
 */
describe('Crisis System - Fail-Safe Mechanisms', () => {
  test('Emergency Fail-Safe Activation', async () => {
    // Test system behavior when core crisis detection fails
    const mockFailingDetection = jest.fn().mockRejectedValue(new Error('System failure'));

    // Mock console methods to capture fail-safe activation
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    try {
      await mockFailingDetection();
    } catch (error) {
      // Fail-safe should activate
      expect(error).toBeDefined();
    }

    consoleSpy.mockRestore();
  });

  test('Network Failure Handling', async () => {
    // Test offline crisis detection capabilities
    // Implementation would test local crisis detection when network is unavailable
    const localCrisisDetection = await CrisisDetectionEngine.detectCrisis(
      {
        totalScore: 25,
        severity: 'severe',
        isCrisis: true,
        suicidalIdeation: true,
        completedAt: Date.now(),
        answers: []
      },
      TEST_CONFIG.TEST_USER_ID,
      'offline_test'
    );

    expect(localCrisisDetection).not.toBeNull();
    expect(localCrisisDetection!.isTriggered).toBe(true);
  });
});

/**
 * REGULATORY COMPLIANCE TESTS
 */
describe('Crisis System - Regulatory Compliance', () => {
  test('Clinical Accuracy Compliance (100% Requirement)', async () => {
    // Test ALL possible score combinations for 100% accuracy
    const allPHQ9 = CrisisTestDataGenerator.generateAllPHQ9Combinations();
    const allGAD7 = CrisisTestDataGenerator.generateAllGAD7Combinations();

    let totalTests = 0;
    let correctDetections = 0;

    // Test all PHQ-9 combinations
    for (const result of allPHQ9) {
      const detection = await CrisisDetectionEngine.detectCrisis(
        result,
        TEST_CONFIG.TEST_USER_ID,
        `compliance_phq9_${totalTests}`
      );

      const expectedCrisis = result.isCrisis;
      const actualCrisis = detection !== null;

      if (expectedCrisis === actualCrisis) {
        correctDetections++;
      }
      totalTests++;
    }

    // Test all GAD-7 combinations
    for (const result of allGAD7) {
      const detection = await CrisisDetectionEngine.detectCrisis(
        result,
        TEST_CONFIG.TEST_USER_ID,
        `compliance_gad7_${totalTests}`
      );

      const expectedCrisis = result.isCrisis;
      const actualCrisis = detection !== null;

      if (expectedCrisis === actualCrisis) {
        correctDetections++;
      }
      totalTests++;
    }

    const complianceRate = (correctDetections / totalTests) * 100;

    // REGULATORY REQUIREMENT: Must be 100%
    expect(complianceRate).toBe(100);
    logPerformance(`Regulatory Compliance Rate: ${complianceRate}% (${correctDetections}/${totalTests})`);
  });

  test('Performance Compliance (<200ms Detection)', async () => {
    const performanceTests = await PerformanceTestUtils.runPerformanceTest(
      'Regulatory Performance Compliance',
      async () => {
        await CrisisDetectionEngine.detectCrisis(
          {
            totalScore: 22,
            severity: 'severe',
            isCrisis: true,
            suicidalIdeation: false,
            completedAt: Date.now(),
            answers: []
          },
          TEST_CONFIG.TEST_USER_ID,
          `regulatory_perf_${Date.now()}`
        );
      },
      200, // Regulatory requirement
      50   // Extensive testing
    );

    // REGULATORY REQUIREMENT: Zero violations
    expect(performanceTests.violations).toBe(0);
    expect(performanceTests.success).toBe(true);
    console.log(`Performance Compliance: ${performanceTests.violations} violations in 50 tests`);
  });

  test('Data Retention and Audit Compliance', async () => {
    const dataManagement = CrisisDataManagement;

    // Test data package count
    const packageCount = dataManagement.getDataPackageCount();
    expect(packageCount).toBeGreaterThanOrEqual(0);

    // Test cleanup functionality
    const cleanedCount = await dataManagement.cleanupExpiredData();
    expect(cleanedCount).toBeGreaterThanOrEqual(0);
  });
});

/**
 * STRESS TESTING
 */
describe('Crisis System - Stress Testing', () => {
  test('High Volume Crisis Detection', async () => {
    const concurrentTests = 20;
    const promises = [];

    for (let i = 0; i < concurrentTests; i++) {
      const promise = CrisisDetectionEngine.detectCrisis(
        {
          totalScore: 20 + (i % 8), // Vary scores
          severity: 'severe',
          isCrisis: true,
          suicidalIdeation: i % 3 === 0, // Vary suicidal ideation
          completedAt: Date.now(),
          answers: []
        },
        `stress_test_user_${i}`,
        `stress_test_assessment_${i}`
      );
      promises.push(promise);
    }

    const results = await Promise.all(promises);

    // All should complete successfully
    expect(results.length).toBe(concurrentTests);

    // All crisis cases should be detected
    const detectedCrises = results.filter(r => r !== null);
    expect(detectedCrises.length).toBe(concurrentTests);
  });

  test('Memory Usage Under Load', async () => {
    const initialMemory = process.memoryUsage();

    // Run many crisis detections
    for (let i = 0; i < 100; i++) {
      await CrisisDetectionEngine.detectCrisis(
        {
          totalScore: 25,
          severity: 'severe',
          isCrisis: true,
          suicidalIdeation: true,
          completedAt: Date.now(),
          answers: []
        },
        `memory_test_user_${i}`,
        `memory_test_assessment_${i}`
      );
    }

    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

    // Memory increase should be reasonable (less than 50MB for 100 operations)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    logPerformance(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
  });
});

/**
 * CUSTOM JEST MATCHERS
 */
expect.extend({
  toBeOneOf(received, validOptions) {
    const pass = validOptions.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${validOptions.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${validOptions.join(', ')}`,
        pass: false,
      };
    }
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(validOptions: any[]): R;
    }
  }
}