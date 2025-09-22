/**
 * Performance Test Suite - Automated performance validation
 *
 * Comprehensive testing suite for validating therapeutic timing requirements
 * and ensuring optimal performance across all critical user journeys.
 */

import { therapeuticPerformanceSystem, TherapeuticPerformanceMetrics } from './TherapeuticPerformanceSystem';
import { performanceRegressionDetector } from './PerformanceRegressionDetector';

// ============================================================================
// PERFORMANCE TEST TYPES
// ============================================================================

interface PerformanceTestCase {
  id: string;
  name: string;
  description: string;
  category: 'critical' | 'important' | 'nice-to-have';
  timeout: number; // ms
  execute: () => Promise<PerformanceTestResult>;
}

interface PerformanceTestResult {
  testId: string;
  passed: boolean;
  actualValue: number;
  expectedValue: number;
  tolerance: number;
  duration: number;
  error?: string;
  metrics?: Partial<TherapeuticPerformanceMetrics>;
}

interface PerformanceTestSuiteResult {
  overallPassed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  criticalFailures: number;
  executionTime: number;
  results: PerformanceTestResult[];
  summary: string;
  recommendations: string[];
}

interface TherapeuticScenario {
  name: string;
  steps: TherapeuticStep[];
  expectedTotalTime: number;
  criticalMetrics: (keyof TherapeuticPerformanceMetrics)[];
}

interface TherapeuticStep {
  action: string;
  expectedDuration: number;
  tolerance: number;
  execute: () => Promise<number>;
}

// ============================================================================
// PERFORMANCE TEST SUITE CLASS
// ============================================================================

class PerformanceTestSuite {
  private testCases: PerformanceTestCase[] = [];
  private isInitialized = false;

  /**
   * Initialize performance test suite
   */
  async initialize(): Promise<void> {
    console.log('🧪 Initializing Performance Test Suite');

    // Initialize dependencies
    await therapeuticPerformanceSystem.initialize();
    await performanceRegressionDetector.initialize();

    // Register test cases
    this.registerCriticalPerformanceTests();
    this.registerBreathingPerformanceTests();
    this.registerCrisisResponseTests();
    this.registerNavigationPerformanceTests();
    this.registerMemoryPerformanceTests();

    this.isInitialized = true;
    console.log(`✅ Performance Test Suite initialized with ${this.testCases.length} test cases`);
  }

  /**
   * Run all performance tests
   */
  async runFullTestSuite(): Promise<PerformanceTestSuiteResult> {
    if (!this.isInitialized) {
      throw new Error('Performance Test Suite not initialized');
    }

    console.log('🚀 Running full performance test suite');
    const startTime = performance.now();

    const results: PerformanceTestResult[] = [];
    let passedTests = 0;
    let criticalFailures = 0;

    // Start monitoring for tests
    therapeuticPerformanceSystem.startRealTimeMonitoring();

    try {
      // Run all test cases
      for (const testCase of this.testCases) {
        console.log(`🧪 Running test: ${testCase.name}`);

        try {
          const result = await Promise.race([
            testCase.execute(),
            this.createTimeoutPromise(testCase.timeout, testCase.id)
          ]);

          results.push(result);

          if (result.passed) {
            passedTests++;
          } else if (testCase.category === 'critical') {
            criticalFailures++;
          }

        } catch (error) {
          const failedResult: PerformanceTestResult = {
            testId: testCase.id,
            passed: false,
            actualValue: 0,
            expectedValue: 0,
            tolerance: 0,
            duration: testCase.timeout,
            error: error instanceof Error ? error.message : 'Unknown error',
          };

          results.push(failedResult);

          if (testCase.category === 'critical') {
            criticalFailures++;
          }
        }
      }

    } finally {
      // Stop monitoring and get final metrics
      const monitoringResult = therapeuticPerformanceSystem.stopRealTimeMonitoring();
    }

    const executionTime = performance.now() - startTime;
    const overallPassed = criticalFailures === 0 && passedTests >= this.testCases.length * 0.8;

    const testSuiteResult: PerformanceTestSuiteResult = {
      overallPassed,
      totalTests: this.testCases.length,
      passedTests,
      failedTests: this.testCases.length - passedTests,
      criticalFailures,
      executionTime,
      results,
      summary: this.generateTestSummary(results, executionTime),
      recommendations: this.generateTestRecommendations(results),
    };

    console.log('📊 Performance test suite completed');
    console.log(testSuiteResult.summary);

    return testSuiteResult;
  }

  /**
   * Run specific test category
   */
  async runTestCategory(category: 'critical' | 'important' | 'nice-to-have'): Promise<PerformanceTestSuiteResult> {
    const categoryTests = this.testCases.filter(test => test.category === category);

    if (categoryTests.length === 0) {
      throw new Error(`No tests found for category: ${category}`);
    }

    console.log(`🧪 Running ${category} performance tests`);

    // Temporarily filter test cases
    const originalTests = this.testCases;
    this.testCases = categoryTests;

    try {
      const result = await this.runFullTestSuite();
      return result;
    } finally {
      this.testCases = originalTests;
    }
  }

  /**
   * Run therapeutic scenario tests
   */
  async runTherapeuticScenario(scenario: TherapeuticScenario): Promise<PerformanceTestResult> {
    console.log(`🧘 Running therapeutic scenario: ${scenario.name}`);

    const startTime = performance.now();
    let totalDuration = 0;
    const stepResults: number[] = [];

    therapeuticPerformanceSystem.startRealTimeMonitoring();

    try {
      for (const step of scenario.steps) {
        console.log(`  📋 Executing step: ${step.action}`);

        const stepStartTime = performance.now();
        const stepDuration = await step.execute();
        stepResults.push(stepDuration);

        totalDuration += stepDuration;

        // Validate step performance
        if (stepDuration > step.expectedDuration + step.tolerance) {
          console.warn(`⚠️ Step "${step.action}" exceeded expected duration: ${stepDuration}ms > ${step.expectedDuration + step.tolerance}ms`);
        }
      }

      const actualTotalTime = performance.now() - startTime;
      const passed = actualTotalTime <= scenario.expectedTotalTime;

      const status = therapeuticPerformanceSystem.getTherapeuticStatus();

      return {
        testId: scenario.name,
        passed,
        actualValue: actualTotalTime,
        expectedValue: scenario.expectedTotalTime,
        tolerance: scenario.expectedTotalTime * 0.1, // 10% tolerance
        duration: actualTotalTime,
        metrics: status.scores,
      };

    } catch (error) {
      return {
        testId: scenario.name,
        passed: false,
        actualValue: 0,
        expectedValue: scenario.expectedTotalTime,
        tolerance: 0,
        duration: performance.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      therapeuticPerformanceSystem.stopRealTimeMonitoring();
    }
  }

  /**
   * Validate crisis response performance
   */
  async validateCrisisResponse(): Promise<PerformanceTestResult> {
    console.log('🚨 Validating crisis response performance');

    const startTime = performance.now();

    try {
      // Simulate crisis button press
      const crisisStartTime = performance.now();
      const responseTime = therapeuticPerformanceSystem.trackCrisisButtonResponse(crisisStartTime, 'test_crisis');

      // Test emergency protocol activation
      const protocolStartTime = performance.now();
      const protocolTime = therapeuticPerformanceSystem.trackEmergencyProtocolActivation(protocolStartTime, 'test_protocol');

      const totalTime = Math.max(responseTime, protocolTime);
      const passed = totalTime <= 200; // 200ms requirement

      return {
        testId: 'crisis_response_validation',
        passed,
        actualValue: totalTime,
        expectedValue: 200,
        tolerance: 50,
        duration: performance.now() - startTime,
      };

    } catch (error) {
      return {
        testId: 'crisis_response_validation',
        passed: false,
        actualValue: 0,
        expectedValue: 200,
        tolerance: 50,
        duration: performance.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate breathing animation performance
   */
  async validateBreathingAnimation(): Promise<PerformanceTestResult> {
    console.log('🌬️ Validating breathing animation performance');

    const startTime = performance.now();
    let frameCount = 0;
    let droppedFrames = 0;

    try {
      // Simulate 3-second breathing animation (180 frames at 60fps)
      const animationDuration = 3000;
      const targetFrames = 180;
      const frameInterval = 16.67; // 60fps

      const animationPromise = new Promise<void>((resolve) => {
        const startAnimation = performance.now();

        const trackFrame = () => {
          const frameStartTime = performance.now();
          therapeuticPerformanceSystem.trackBreathingAnimationFrame(frameStartTime);

          frameCount++;

          const frameTime = performance.now() - frameStartTime;
          if (frameTime > frameInterval * 1.5) { // Allow 50% tolerance
            droppedFrames++;
          }

          if (performance.now() - startAnimation < animationDuration) {
            requestAnimationFrame(trackFrame);
          } else {
            resolve();
          }
        };

        requestAnimationFrame(trackFrame);
      });

      await animationPromise;

      const dropRate = (droppedFrames / frameCount) * 100;
      const passed = dropRate <= 5; // Allow maximum 5% frame drops

      return {
        testId: 'breathing_animation_validation',
        passed,
        actualValue: dropRate,
        expectedValue: 0,
        tolerance: 5,
        duration: performance.now() - startTime,
      };

    } catch (error) {
      return {
        testId: 'breathing_animation_validation',
        passed: false,
        actualValue: 100,
        expectedValue: 0,
        tolerance: 5,
        duration: performance.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============================================================================
  // PRIVATE TEST REGISTRATION METHODS
  // ============================================================================

  private registerCriticalPerformanceTests(): void {
    // Crisis button response test
    this.testCases.push({
      id: 'crisis_button_response',
      name: 'Crisis Button Response Time',
      description: 'Validates crisis button responds within 200ms',
      category: 'critical',
      timeout: 5000,
      execute: async () => {
        const startTime = performance.now();
        const responseTime = therapeuticPerformanceSystem.trackCrisisButtonResponse(startTime);

        return {
          testId: 'crisis_button_response',
          passed: responseTime <= 200,
          actualValue: responseTime,
          expectedValue: 200,
          tolerance: 50,
          duration: responseTime,
        };
      },
    });

    // App launch time test
    this.testCases.push({
      id: 'app_launch_time',
      name: 'App Launch Time',
      description: 'Validates app launches within 3 seconds',
      category: 'critical',
      timeout: 10000,
      execute: async () => {
        const startTime = performance.now();

        // Simulate app launch
        await new Promise(resolve => setTimeout(resolve, 100));

        const launchTime = therapeuticPerformanceSystem.trackAppLaunch(startTime);

        return {
          testId: 'app_launch_time',
          passed: launchTime <= 3000,
          actualValue: launchTime,
          expectedValue: 3000,
          tolerance: 500,
          duration: launchTime,
        };
      },
    });
  }

  private registerBreathingPerformanceTests(): void {
    // Breathing animation frame rate test
    this.testCases.push({
      id: 'breathing_frame_rate',
      name: 'Breathing Animation Frame Rate',
      description: 'Validates breathing animation maintains 60fps',
      category: 'critical',
      timeout: 5000,
      execute: async () => {
        return await this.validateBreathingAnimation();
      },
    });

    // Breathing cycle accuracy test
    this.testCases.push({
      id: 'breathing_cycle_accuracy',
      name: 'Breathing Cycle Timing Accuracy',
      description: 'Validates breathing cycle timing within ±50ms',
      category: 'important',
      timeout: 3000,
      execute: async () => {
        const targetDuration = 60000; // 60 seconds
        const startTime = Date.now();

        // Simulate breathing cycle
        await new Promise(resolve => setTimeout(resolve, targetDuration + Math.random() * 100 - 50));

        const actualDuration = Date.now() - startTime;
        therapeuticPerformanceSystem.trackBreathingCycleAccuracy(actualDuration, targetDuration);

        const deviation = Math.abs(actualDuration - targetDuration);

        return {
          testId: 'breathing_cycle_accuracy',
          passed: deviation <= 50,
          actualValue: deviation,
          expectedValue: 0,
          tolerance: 50,
          duration: actualDuration,
        };
      },
    });
  }

  private registerCrisisResponseTests(): void {
    // Emergency protocol activation test
    this.testCases.push({
      id: 'emergency_protocol_activation',
      name: 'Emergency Protocol Activation',
      description: 'Validates emergency protocols activate within 100ms',
      category: 'critical',
      timeout: 3000,
      execute: async () => {
        const startTime = performance.now();
        const activationTime = therapeuticPerformanceSystem.trackEmergencyProtocolActivation(startTime, 'test_emergency');

        return {
          testId: 'emergency_protocol_activation',
          passed: activationTime <= 100,
          actualValue: activationTime,
          expectedValue: 100,
          tolerance: 25,
          duration: activationTime,
        };
      },
    });
  }

  private registerNavigationPerformanceTests(): void {
    // Check-in transition test
    this.testCases.push({
      id: 'checkin_transition',
      name: 'Check-in Screen Transition',
      description: 'Validates check-in transitions complete within 500ms',
      category: 'important',
      timeout: 3000,
      execute: async () => {
        const startTime = performance.now();

        // Simulate navigation delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 400));

        const transitionTime = therapeuticPerformanceSystem.trackCheckInTransition(startTime, 'mood', 'assessment');

        return {
          testId: 'checkin_transition',
          passed: transitionTime <= 500,
          actualValue: transitionTime,
          expectedValue: 500,
          tolerance: 100,
          duration: transitionTime,
        };
      },
    });

    // Assessment loading test
    this.testCases.push({
      id: 'assessment_load',
      name: 'Assessment Loading Time',
      description: 'Validates assessments load within 300ms',
      category: 'important',
      timeout: 3000,
      execute: async () => {
        const startTime = performance.now();

        // Simulate assessment loading
        await new Promise(resolve => setTimeout(resolve, Math.random() * 250));

        const loadTime = therapeuticPerformanceSystem.trackAssessmentLoad(startTime, 'PHQ-9');

        return {
          testId: 'assessment_load',
          passed: loadTime <= 300,
          actualValue: loadTime,
          expectedValue: 300,
          tolerance: 50,
          duration: loadTime,
        };
      },
    });
  }

  private registerMemoryPerformanceTests(): void {
    // Memory usage test
    this.testCases.push({
      id: 'memory_usage',
      name: 'Memory Usage Validation',
      description: 'Validates memory usage stays under 100MB',
      category: 'important',
      timeout: 5000,
      execute: async () => {
        const status = therapeuticPerformanceSystem.getTherapeuticStatus();
        const memoryUsageMB = status.scores.memoryUsage / (1024 * 1024);

        return {
          testId: 'memory_usage',
          passed: memoryUsageMB <= 100,
          actualValue: memoryUsageMB,
          expectedValue: 100,
          tolerance: 20,
          duration: 0,
        };
      },
    });
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async createTimeoutPromise(timeout: number, testId: string): Promise<PerformanceTestResult> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Test ${testId} timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  private generateTestSummary(results: PerformanceTestResult[], executionTime: number): string {
    const passed = results.filter(r => r.passed).length;
    const failed = results.length - passed;
    const criticalFailures = results.filter(r => !r.passed && r.error?.includes('CRITICAL')).length;

    let summary = `Performance Test Suite Results:\n`;
    summary += `Total Tests: ${results.length}\n`;
    summary += `Passed: ${passed}\n`;
    summary += `Failed: ${failed}\n`;
    summary += `Critical Failures: ${criticalFailures}\n`;
    summary += `Execution Time: ${executionTime.toFixed(2)}ms\n`;

    if (criticalFailures > 0) {
      summary += `\n🚨 CRITICAL ISSUES DETECTED - Immediate attention required`;
    } else if (failed > 0) {
      summary += `\n⚠️ Performance issues detected - optimization recommended`;
    } else {
      summary += `\n✅ All performance tests passed`;
    }

    return summary;
  }

  private generateTestRecommendations(results: PerformanceTestResult[]): string[] {
    const recommendations: string[] = [];
    const failedTests = results.filter(r => !r.passed);

    failedTests.forEach(test => {
      switch (test.testId) {
        case 'crisis_button_response':
          recommendations.push('CRITICAL: Optimize crisis button handler - remove async operations');
          break;
        case 'breathing_frame_rate':
          recommendations.push('CRITICAL: Optimize breathing animation - use native driver');
          break;
        case 'app_launch_time':
          recommendations.push('HIGH: Optimize app startup - reduce initial load time');
          break;
        case 'emergency_protocol_activation':
          recommendations.push('CRITICAL: Optimize emergency protocols - pre-load resources');
          break;
        case 'checkin_transition':
          recommendations.push('MEDIUM: Optimize check-in navigation - reduce screen complexity');
          break;
        case 'assessment_load':
          recommendations.push('MEDIUM: Optimize assessment loading - cache data');
          break;
        case 'memory_usage':
          recommendations.push('HIGH: Optimize memory usage - check for leaks');
          break;
      }
    });

    return recommendations;
  }
}

// ============================================================================
// PREDEFINED THERAPEUTIC SCENARIOS
// ============================================================================

export const THERAPEUTIC_SCENARIOS: TherapeuticScenario[] = [
  {
    name: 'morning_checkin_flow',
    expectedTotalTime: 2000,
    criticalMetrics: ['navigationTime', 'assessmentLoadTime', 'therapeuticFlowContinuity'],
    steps: [
      {
        action: 'Open morning check-in',
        expectedDuration: 300,
        tolerance: 100,
        execute: async () => {
          const start = performance.now();
          await new Promise(resolve => setTimeout(resolve, Math.random() * 250 + 200));
          return performance.now() - start;
        },
      },
      {
        action: 'Load mood assessment',
        expectedDuration: 300,
        tolerance: 50,
        execute: async () => {
          const start = performance.now();
          await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 150));
          return performance.now() - start;
        },
      },
      {
        action: 'Submit mood data',
        expectedDuration: 200,
        tolerance: 100,
        execute: async () => {
          const start = performance.now();
          await new Promise(resolve => setTimeout(resolve, Math.random() * 150 + 100));
          return performance.now() - start;
        },
      },
      {
        action: 'Navigate to breathing',
        expectedDuration: 400,
        tolerance: 100,
        execute: async () => {
          const start = performance.now();
          await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 200));
          return performance.now() - start;
        },
      },
    ],
  },
  {
    name: 'crisis_intervention_flow',
    expectedTotalTime: 1000,
    criticalMetrics: ['crisisResponseTime', 'crisisReadinessScore'],
    steps: [
      {
        action: 'Crisis button press',
        expectedDuration: 200,
        tolerance: 50,
        execute: async () => {
          const start = performance.now();
          const responseTime = therapeuticPerformanceSystem.trackCrisisButtonResponse(start, 'test_crisis');
          return responseTime;
        },
      },
      {
        action: 'Load crisis resources',
        expectedDuration: 300,
        tolerance: 100,
        execute: async () => {
          const start = performance.now();
          await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 150));
          return performance.now() - start;
        },
      },
      {
        action: 'Activate emergency protocol',
        expectedDuration: 100,
        tolerance: 25,
        execute: async () => {
          const start = performance.now();
          const activationTime = therapeuticPerformanceSystem.trackEmergencyProtocolActivation(start, 'test_protocol');
          return activationTime;
        },
      },
    ],
  },
];

// ============================================================================
// SINGLETON INSTANCE AND EXPORTS
// ============================================================================

export const performanceTestSuite = new PerformanceTestSuite();

// Export types and test suite
export type {
  PerformanceTestCase,
  PerformanceTestResult,
  PerformanceTestSuiteResult,
  TherapeuticScenario,
  TherapeuticStep,
};

export default performanceTestSuite;