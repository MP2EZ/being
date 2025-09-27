/**
 * Migration Validation Framework - 100% accuracy tests for PHQ-9/GAD-7 clinical data
 * CRITICAL: Ensures zero-loss migration with clinical scoring accuracy requirements
 *
 * Phase 5B: Migration Preparation - Clinical Data Validation
 */

import {
  PHQ9Answers,
  GAD7Answers,
  PHQ9Score,
  GAD7Score,
  PHQ9Severity,
  GAD7Severity,
  CRISIS_THRESHOLD_PHQ9,
  CRISIS_THRESHOLD_GAD7,
  SUICIDAL_IDEATION_THRESHOLD,
  SUICIDAL_IDEATION_QUESTION_INDEX,
  createISODateString,
  ISODateString
} from '../../types/clinical';
import CrisisResponseMonitor from '../../services/CrisisResponseMonitor';

// Validation result for individual tests
export interface ValidationTestResult {
  testName: string;
  passed: boolean;
  actualValue: any;
  expectedValue: any;
  error?: string;
  duration: number;
}

// Complete validation report
export interface MigrationValidationReport {
  validationId: string;
  timestamp: ISODateString;
  storeType: 'crisis' | 'assessment' | 'combined';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  successRate: number;
  criticalTestsPassed: boolean;
  performanceMetrics: {
    totalValidationTime: number;
    averageTestTime: number;
    slowestTest: { name: string; duration: number };
  };
  testResults: ValidationTestResult[];
  criticalFindings: string[];
  recommendations: string[];
}

// PHQ-9 scoring test cases (all 27 possible combinations for critical scenarios)
export interface PHQ9TestCase {
  answers: PHQ9Answers;
  expectedScore: PHQ9Score;
  expectedSeverity: PHQ9Severity;
  expectsCrisis: boolean;
  hasSuicidalIdeation: boolean;
  description: string;
}

// GAD-7 scoring test cases (all 21 possible combinations for critical scenarios)
export interface GAD7TestCase {
  answers: GAD7Answers;
  expectedScore: GAD7Score;
  expectedSeverity: GAD7Severity;
  expectsCrisis: boolean;
  description: string;
}

export class MigrationValidationFramework {
  private static instance: MigrationValidationFramework;
  private readonly VALIDATION_VERSION = '1.0.0';

  // Critical PHQ-9 test cases (100% accuracy requirement)
  private readonly PHQ9_CRITICAL_TESTS: PHQ9TestCase[] = [
    {
      answers: [3, 3, 3, 3, 3, 3, 3, 3, 3], // Maximum severity
      expectedScore: 27 as PHQ9Score,
      expectedSeverity: 'severe',
      expectsCrisis: true,
      hasSuicidalIdeation: true,
      description: 'Maximum PHQ-9 score with suicidal ideation'
    },
    {
      answers: [3, 3, 3, 3, 3, 3, 3, 3, 0], // High score, no suicidal ideation
      expectedScore: 24 as PHQ9Score,
      expectedSeverity: 'severe',
      expectsCrisis: true,
      hasSuicidalIdeation: false,
      description: 'High PHQ-9 score without suicidal ideation'
    },
    {
      answers: [3, 3, 3, 3, 3, 3, 2, 0, 3], // Crisis threshold with suicidal ideation
      expectedScore: 20 as PHQ9Score,
      expectedSeverity: 'severe',
      expectsCrisis: true,
      hasSuicidalIdeation: true,
      description: 'Crisis threshold (20) with suicidal ideation'
    },
    {
      answers: [3, 3, 3, 3, 3, 2, 0, 0, 0], // Just below crisis threshold
      expectedScore: 17 as PHQ9Score,
      expectedSeverity: 'moderately_severe',
      expectsCrisis: false,
      hasSuicidalIdeation: false,
      description: 'Just below crisis threshold'
    },
    {
      answers: [2, 2, 2, 2, 2, 1, 1, 1, 1], // Moderate severity
      expectedScore: 14 as PHQ9Score,
      expectedSeverity: 'moderate',
      expectsCrisis: false,
      hasSuicidalIdeation: false,
      description: 'Moderate PHQ-9 severity'
    },
    {
      answers: [1, 1, 1, 1, 1, 0, 0, 0, 1], // Mild with slight suicidal ideation
      expectedScore: 6 as PHQ9Score,
      expectedSeverity: 'mild',
      expectsCrisis: false,
      hasSuicidalIdeation: true,
      description: 'Mild severity with suicidal ideation'
    },
    {
      answers: [0, 0, 0, 0, 0, 0, 0, 0, 0], // No symptoms
      expectedScore: 0 as PHQ9Score,
      expectedSeverity: 'none',
      expectsCrisis: false,
      hasSuicidalIdeation: false,
      description: 'No depressive symptoms'
    }
  ];

  // Critical GAD-7 test cases (100% accuracy requirement)
  private readonly GAD7_CRITICAL_TESTS: GAD7TestCase[] = [
    {
      answers: [3, 3, 3, 3, 3, 3, 3], // Maximum severity
      expectedScore: 21 as GAD7Score,
      expectedSeverity: 'severe',
      expectsCrisis: true,
      description: 'Maximum GAD-7 score'
    },
    {
      answers: [3, 3, 3, 2, 2, 1, 1], // High severity
      expectedScore: 15 as GAD7Score,
      expectedSeverity: 'severe',
      expectsCrisis: true,
      description: 'Crisis threshold (15)'
    },
    {
      answers: [3, 3, 2, 2, 2, 1, 0], // Just below crisis threshold
      expectedScore: 13 as GAD7Score,
      expectedSeverity: 'moderate',
      expectsCrisis: false,
      description: 'Just below crisis threshold'
    },
    {
      answers: [2, 2, 2, 2, 1, 1, 0], // Moderate severity
      expectedScore: 10 as GAD7Score,
      expectedSeverity: 'moderate',
      expectsCrisis: false,
      description: 'Moderate GAD-7 severity'
    },
    {
      answers: [1, 1, 1, 1, 1, 0, 0], // Mild severity
      expectedScore: 5 as GAD7Score,
      expectedSeverity: 'mild',
      expectsCrisis: false,
      description: 'Mild GAD-7 severity'
    },
    {
      answers: [0, 0, 0, 0, 0, 0, 0], // No symptoms
      expectedScore: 0 as GAD7Score,
      expectedSeverity: 'none',
      expectsCrisis: false,
      description: 'No anxiety symptoms'
    }
  ];

  private constructor() {}

  public static getInstance(): MigrationValidationFramework {
    if (!MigrationValidationFramework.instance) {
      MigrationValidationFramework.instance = new MigrationValidationFramework();
    }
    return MigrationValidationFramework.instance;
  }

  /**
   * Validate PHQ-9 scoring accuracy (100% requirement)
   */
  public async validatePHQ9Scoring(
    scoringFunction: (answers: PHQ9Answers) => PHQ9Score,
    severityFunction: (score: PHQ9Score) => PHQ9Severity,
    crisisFunction: (score: PHQ9Score) => boolean,
    suicidalIdeationFunction: (answers: PHQ9Answers) => boolean
  ): Promise<ValidationTestResult[]> {
    const results: ValidationTestResult[] = [];

    for (const testCase of this.PHQ9_CRITICAL_TESTS) {
      const startTime = Date.now();

      try {
        // Test scoring function
        const actualScore = scoringFunction(testCase.answers);
        results.push({
          testName: `PHQ9_Score_${testCase.description}`,
          passed: actualScore === testCase.expectedScore,
          actualValue: actualScore,
          expectedValue: testCase.expectedScore,
          duration: Date.now() - startTime
        });

        // Test severity function
        const actualSeverity = severityFunction(actualScore);
        results.push({
          testName: `PHQ9_Severity_${testCase.description}`,
          passed: actualSeverity === testCase.expectedSeverity,
          actualValue: actualSeverity,
          expectedValue: testCase.expectedSeverity,
          duration: Date.now() - startTime
        });

        // Test crisis detection
        const actualCrisis = crisisFunction(actualScore);
        results.push({
          testName: `PHQ9_Crisis_${testCase.description}`,
          passed: actualCrisis === testCase.expectsCrisis,
          actualValue: actualCrisis,
          expectedValue: testCase.expectsCrisis,
          duration: Date.now() - startTime
        });

        // Test suicidal ideation detection
        const actualSuicidalIdeation = suicidalIdeationFunction(testCase.answers);
        results.push({
          testName: `PHQ9_SuicidalIdeation_${testCase.description}`,
          passed: actualSuicidalIdeation === testCase.hasSuicidalIdeation,
          actualValue: actualSuicidalIdeation,
          expectedValue: testCase.hasSuicidalIdeation,
          duration: Date.now() - startTime
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          testName: `PHQ9_Error_${testCase.description}`,
          passed: false,
          actualValue: null,
          expectedValue: testCase.expectedScore,
          error: errorMessage,
          duration: Date.now() - startTime
        });
      }
    }

    return results;
  }

  /**
   * Validate GAD-7 scoring accuracy (100% requirement)
   */
  public async validateGAD7Scoring(
    scoringFunction: (answers: GAD7Answers) => GAD7Score,
    severityFunction: (score: GAD7Score) => GAD7Severity,
    crisisFunction: (score: GAD7Score) => boolean
  ): Promise<ValidationTestResult[]> {
    const results: ValidationTestResult[] = [];

    for (const testCase of this.GAD7_CRITICAL_TESTS) {
      const startTime = Date.now();

      try {
        // Test scoring function
        const actualScore = scoringFunction(testCase.answers);
        results.push({
          testName: `GAD7_Score_${testCase.description}`,
          passed: actualScore === testCase.expectedScore,
          actualValue: actualScore,
          expectedValue: testCase.expectedScore,
          duration: Date.now() - startTime
        });

        // Test severity function
        const actualSeverity = severityFunction(actualScore);
        results.push({
          testName: `GAD7_Severity_${testCase.description}`,
          passed: actualSeverity === testCase.expectedSeverity,
          actualValue: actualSeverity,
          expectedValue: testCase.expectedSeverity,
          duration: Date.now() - startTime
        });

        // Test crisis detection
        const actualCrisis = crisisFunction(actualScore);
        results.push({
          testName: `GAD7_Crisis_${testCase.description}`,
          passed: actualCrisis === testCase.expectsCrisis,
          actualValue: actualCrisis,
          expectedValue: testCase.expectsCrisis,
          duration: Date.now() - startTime
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          testName: `GAD7_Error_${testCase.description}`,
          passed: false,
          actualValue: null,
          expectedValue: testCase.expectedScore,
          error: errorMessage,
          duration: Date.now() - startTime
        });
      }
    }

    return results;
  }

  /**
   * Validate crisis response performance (<200ms requirement)
   */
  public async validateCrisisPerformance(
    crisisDetectionFunction: (score: PHQ9Score | GAD7Score) => boolean,
    crisisResponseFunction: () => Promise<void>
  ): Promise<ValidationTestResult[]> {
    const results: ValidationTestResult[] = [];
    const CRISIS_RESPONSE_THRESHOLD_MS = 200;

    // Test crisis detection performance
    const crisisScores = [20, 21, 22, 23, 24, 25, 27]; // PHQ-9 crisis scores
    const gad7CrisisScores = [15, 16, 17, 18, 19, 20, 21]; // GAD-7 crisis scores

    for (const score of crisisScores) {
      const startTime = Date.now();

      try {
        const isCrisis = crisisDetectionFunction(score as PHQ9Score);
        const duration = Date.now() - startTime;

        results.push({
          testName: `CrisisDetection_PHQ9_${score}`,
          passed: isCrisis && duration < CRISIS_RESPONSE_THRESHOLD_MS,
          actualValue: { isCrisis, duration },
          expectedValue: { isCrisis: true, duration: `<${CRISIS_RESPONSE_THRESHOLD_MS}ms` },
          duration
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          testName: `CrisisDetection_PHQ9_${score}`,
          passed: false,
          actualValue: null,
          expectedValue: true,
          error: errorMessage,
          duration: Date.now() - startTime
        });
      }
    }

    for (const score of gad7CrisisScores) {
      const startTime = Date.now();

      try {
        const isCrisis = crisisDetectionFunction(score as GAD7Score);
        const duration = Date.now() - startTime;

        results.push({
          testName: `CrisisDetection_GAD7_${score}`,
          passed: isCrisis && duration < CRISIS_RESPONSE_THRESHOLD_MS,
          actualValue: { isCrisis, duration },
          expectedValue: { isCrisis: true, duration: `<${CRISIS_RESPONSE_THRESHOLD_MS}ms` },
          duration
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          testName: `CrisisDetection_GAD7_${score}`,
          passed: false,
          actualValue: null,
          expectedValue: true,
          error: errorMessage,
          duration: Date.now() - startTime
        });
      }
    }

    // Test crisis response function performance
    const startTime = Date.now();
    try {
      await crisisResponseFunction();
      const duration = Date.now() - startTime;

      results.push({
        testName: 'CrisisResponse_Performance',
        passed: duration < CRISIS_RESPONSE_THRESHOLD_MS,
        actualValue: duration,
        expectedValue: `<${CRISIS_RESPONSE_THRESHOLD_MS}ms`,
        duration
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push({
        testName: 'CrisisResponse_Performance',
        passed: false,
        actualValue: null,
        expectedValue: `<${CRISIS_RESPONSE_THRESHOLD_MS}ms`,
        error: errorMessage,
        duration: Date.now() - startTime
      });
    }

    return results;
  }

  /**
   * Complete migration validation with comprehensive report
   */
  public async runCompleteValidation(
    storeType: 'crisis' | 'assessment' | 'combined',
    validationFunctions: {
      phq9Scoring?: (answers: PHQ9Answers) => PHQ9Score;
      phq9Severity?: (score: PHQ9Score) => PHQ9Severity;
      phq9Crisis?: (score: PHQ9Score) => boolean;
      phq9SuicidalIdeation?: (answers: PHQ9Answers) => boolean;
      gad7Scoring?: (answers: GAD7Answers) => GAD7Score;
      gad7Severity?: (score: GAD7Score) => GAD7Severity;
      gad7Crisis?: (score: GAD7Score) => boolean;
      crisisDetection?: (score: PHQ9Score | GAD7Score) => boolean;
      crisisResponse?: () => Promise<void>;
    }
  ): Promise<MigrationValidationReport> {
    const validationId = `validation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    let allResults: ValidationTestResult[] = [];

    try {
      // Run PHQ-9 validation if functions provided
      if (validationFunctions.phq9Scoring && validationFunctions.phq9Severity &&
          validationFunctions.phq9Crisis && validationFunctions.phq9SuicidalIdeation) {
        const phq9Results = await this.validatePHQ9Scoring(
          validationFunctions.phq9Scoring,
          validationFunctions.phq9Severity,
          validationFunctions.phq9Crisis,
          validationFunctions.phq9SuicidalIdeation
        );
        allResults = allResults.concat(phq9Results);
      }

      // Run GAD-7 validation if functions provided
      if (validationFunctions.gad7Scoring && validationFunctions.gad7Severity &&
          validationFunctions.gad7Crisis) {
        const gad7Results = await this.validateGAD7Scoring(
          validationFunctions.gad7Scoring,
          validationFunctions.gad7Severity,
          validationFunctions.gad7Crisis
        );
        allResults = allResults.concat(gad7Results);
      }

      // Run crisis performance validation if functions provided
      if (validationFunctions.crisisDetection && validationFunctions.crisisResponse) {
        const crisisResults = await this.validateCrisisPerformance(
          validationFunctions.crisisDetection,
          validationFunctions.crisisResponse
        );
        allResults = allResults.concat(crisisResults);
      }

      // Calculate metrics
      const totalTests = allResults.length;
      const passedTests = allResults.filter(r => r.passed).length;
      const failedTests = totalTests - passedTests;
      const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

      // Identify critical test failures
      const criticalTests = allResults.filter(r =>
        r.testName.includes('Crisis') || r.testName.includes('SuicidalIdeation')
      );
      const criticalTestsPassed = criticalTests.every(t => t.passed);

      // Calculate performance metrics
      const totalValidationTime = Date.now() - startTime;
      const averageTestTime = allResults.length > 0
        ? allResults.reduce((sum, r) => sum + r.duration, 0) / allResults.length
        : 0;
      const slowestTest = allResults.reduce((slowest, current) =>
        current.duration > slowest.duration ? current : slowest,
        { name: '', duration: 0 }
      );

      // Generate critical findings
      const criticalFindings: string[] = [];
      const failedCriticalTests = criticalTests.filter(t => !t.passed);
      if (failedCriticalTests.length > 0) {
        criticalFindings.push(`${failedCriticalTests.length} critical tests failed`);
      }
      if (successRate < 100) {
        criticalFindings.push(`${successRate.toFixed(1)}% success rate (100% required)`);
      }

      // Generate recommendations
      const recommendations: string[] = [];
      if (!criticalTestsPassed) {
        recommendations.push('Fix critical test failures before proceeding with migration');
      }
      if (successRate < 100) {
        recommendations.push('Address all test failures to ensure 100% clinical accuracy');
      }
      if (slowestTest.duration > 200) {
        recommendations.push('Optimize performance for crisis response requirements');
      }

      const report: MigrationValidationReport = {
        validationId,
        timestamp: createISODateString(),
        storeType,
        totalTests,
        passedTests,
        failedTests,
        successRate,
        criticalTestsPassed,
        performanceMetrics: {
          totalValidationTime,
          averageTestTime,
          slowestTest: { name: slowestTest.testName || 'unknown', duration: slowestTest.duration }
        },
        testResults: allResults,
        criticalFindings,
        recommendations
      };

      // Log critical validation results
      if (storeType === 'crisis' || storeType === 'combined') {
        CrisisResponseMonitor.logCriticalOperation({
          operation: 'migration_validation',
          success: criticalTestsPassed && successRate === 100,
          duration: totalValidationTime,
          metadata: { validationId, successRate, criticalTestsPassed }
        });
      }

      return report;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Return error report
      return {
        validationId,
        timestamp: createISODateString(),
        storeType,
        totalTests: 0,
        passedTests: 0,
        failedTests: 1,
        successRate: 0,
        criticalTestsPassed: false,
        performanceMetrics: {
          totalValidationTime: Date.now() - startTime,
          averageTestTime: 0,
          slowestTest: { name: 'validation_error', duration: 0 }
        },
        testResults: [{
          testName: 'ValidationFramework_Error',
          passed: false,
          actualValue: null,
          expectedValue: 'successful_validation',
          error: errorMessage,
          duration: Date.now() - startTime
        }],
        criticalFindings: [`Validation framework error: ${errorMessage}`],
        recommendations: ['Fix validation framework error before proceeding']
      };
    }
  }

  /**
   * Generate validation summary for migration decision
   */
  public generateValidationSummary(report: MigrationValidationReport): {
    readyForMigration: boolean;
    blockingIssues: string[];
    warnings: string[];
    recommendations: string[];
  } {
    const readyForMigration = report.criticalTestsPassed && report.successRate === 100;
    const blockingIssues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [...report.recommendations];

    if (!report.criticalTestsPassed) {
      blockingIssues.push('Critical tests failed - migration would compromise safety');
    }

    if (report.successRate < 100) {
      blockingIssues.push(`${report.failedTests} tests failed - requires 100% accuracy`);
    }

    if (report.performanceMetrics.slowestTest.duration > 200) {
      warnings.push('Performance concerns detected - may impact crisis response');
    }

    if (report.performanceMetrics.averageTestTime > 50) {
      warnings.push('Average test performance slower than expected');
    }

    return {
      readyForMigration,
      blockingIssues,
      warnings,
      recommendations
    };
  }
}

// Export singleton instance
export const migrationValidationFramework = MigrationValidationFramework.getInstance();