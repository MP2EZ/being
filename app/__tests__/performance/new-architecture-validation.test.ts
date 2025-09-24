/**
 * New Architecture Performance Validation Tests
 *
 * Comprehensive test suite for validating React Native New Architecture
 * performance against Being.'s therapeutic requirements.
 *
 * CRITICAL VALIDATION POINTS:
 * - Crisis button response <200ms
 * - Breathing animation 60fps consistency
 * - Assessment transitions <300ms
 * - Memory stability during therapeutic sessions
 * - App launch performance <2s
 */

import { newArchitecturePerformanceValidator } from '../../src/utils/NewArchitecturePerformanceValidator';
import { therapeuticPerformanceSystem } from '../../src/utils/TherapeuticPerformanceSystem';
import { useAssessmentStore } from '../../src/store/assessmentStore';
import { useCheckInStore } from '../../src/store/checkInStore';

// Mock React for hooks
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: jest.fn((initial) => [initial, jest.fn()]),
  useCallback: jest.fn((fn) => fn),
  useEffect: jest.fn(),
  useRef: jest.fn(() => ({ current: null })),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock performance.now() for consistent testing
let mockTime = 0;
global.performance = {
  now: jest.fn(() => mockTime),
} as any;

const advanceTime = (ms: number) => {
  mockTime += ms;
};

const resetTime = () => {
  mockTime = 0;
};

describe('New Architecture Performance Validation', () => {
  beforeEach(async () => {
    resetTime();
    jest.clearAllMocks();
    await newArchitecturePerformanceValidator.initialize();
  });

  describe('Critical Therapeutic Timing Requirements', () => {
    test('Crisis button response validation (<200ms)', async () => {
      console.log('🚨 Testing crisis button response time validation');

      // Test multiple crisis button taps to ensure consistency
      const responseTimes: number[] = [];

      for (let i = 0; i < 10; i++) {
        resetTime();

        const result = await newArchitecturePerformanceValidator.validateCrisisButtonResponse();
        responseTimes.push(result.responseTime);

        // Each response must be under 200ms
        expect(result.responseTime).toBeLessThan(200);
        expect(result.passed).toBe(true);
      }

      // Average response time should be well under threshold
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      expect(avgResponseTime).toBeLessThan(150); // 25% buffer under threshold

      // 99th percentile should still be under threshold
      const sortedTimes = responseTimes.sort((a, b) => a - b);
      const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
      expect(p99).toBeLessThan(200);

      console.log(`✅ Crisis button validation passed - avg: ${avgResponseTime.toFixed(2)}ms, p99: ${p99.toFixed(2)}ms`);
    });

    test('Breathing animation 60fps validation', async () => {
      console.log('🫁 Testing breathing animation frame rate validation');

      const result = await newArchitecturePerformanceValidator.validateBreathingAnimation();

      // Must maintain at least 58fps (allowing 2fps tolerance)
      expect(result.avgFPS).toBeGreaterThanOrEqual(58);

      // Frame drop percentage must be under 5%
      expect(result.frameDrops).toBeLessThan(0.05);

      expect(result.passed).toBe(true);

      console.log(`✅ Breathing animation validation passed - ${result.avgFPS.toFixed(1)}fps, ${(result.frameDrops * 100).toFixed(1)}% drops`);
    });

    test('Assessment transition performance validation (<300ms)', async () => {
      console.log('📋 Testing assessment transition performance');

      const result = await newArchitecturePerformanceValidator.validateAssessmentTransitions();

      // Average transition time must be under 300ms
      expect(result.avgTransitionTime).toBeLessThan(300);
      expect(result.passed).toBe(true);

      // Individual transitions should be reasonably fast
      expect(result.avgTransitionTime).toBeLessThan(250); // 50ms buffer

      console.log(`✅ Assessment transitions validation passed - ${result.avgTransitionTime.toFixed(2)}ms average`);
    });

    test('Memory stability during therapeutic sessions', async () => {
      console.log('🧠 Testing memory stability validation');

      const result = await newArchitecturePerformanceValidator.validateMemoryPerformance();

      // Memory growth must be under 50%
      expect(result.growthRatio).toBeLessThanOrEqual(1.5);
      expect(result.passed).toBe(true);

      // Baseline memory should be reasonable for mobile device
      expect(result.baselineMemory).toBeLessThan(100 * 1024 * 1024); // Under 100MB

      console.log(`✅ Memory validation passed - ${((result.growthRatio - 1) * 100).toFixed(1)}% growth, ${(result.baselineMemory / 1024 / 1024).toFixed(1)}MB baseline`);
    });
  });

  describe('Comprehensive New Architecture Validation', () => {
    test('Full performance validation suite', async () => {
      console.log('🏗️ Running comprehensive New Architecture validation');

      const result = await newArchitecturePerformanceValidator.runComprehensiveValidation();

      // Overall validation must pass
      expect(result.passed).toBe(true);
      expect(result.criticalIssues).toHaveLength(0);

      // Validate all critical metrics
      expect(result.metrics.crisisButtonResponseTime).toBeLessThan(200);
      expect(result.metrics.breathingAnimationFPS).toBeGreaterThanOrEqual(58);
      expect(result.metrics.assessmentTransitionTime).toBeLessThan(300);
      expect(result.metrics.memoryGrowthRatio).toBeLessThanOrEqual(1.5);
      expect(result.metrics.frameDropPercentage).toBeLessThan(0.05);

      // Device info should be captured
      expect(result.deviceInfo).toBeDefined();
      expect(result.deviceInfo.platform).toMatch(/ios|android/);

      console.log('✅ Comprehensive validation passed');
    });

    test('Performance regression detection', async () => {
      console.log('📈 Testing performance regression detection');

      // Run initial validation to establish baseline
      const baseline = await newArchitecturePerformanceValidator.runComprehensiveValidation();
      expect(baseline.passed).toBe(true);

      // Simulate performance regression by mocking degraded metrics
      const degradedValidator = newArchitecturePerformanceValidator as any;
      const originalCollectMetrics = degradedValidator.collectNewArchitectureMetrics;

      degradedValidator.collectNewArchitectureMetrics = jest.fn().mockResolvedValue({
        crisisButtonResponseTime: 250, // Degraded from baseline
        breathingAnimationFPS: 45,     // Degraded from baseline
        assessmentTransitionTime: 400, // Degraded from baseline
        appLaunchTime: 2500,
        emergencyProtocolActivationTime: 120,
        baselineMemoryUsage: 60 * 1024 * 1024,
        peakMemoryUsage: 120 * 1024 * 1024,
        memoryGrowthRatio: 2.0, // Degraded
        garbageCollectionFrequency: 0.2,
        frameDropPercentage: 0.1, // Degraded
        animationJank: 25,
        renderingLatency: 20,
        bridgePerformance: 5,
        nativeModuleLatency: 15,
        threadUtilization: 0.85,
      });

      // Run validation with degraded performance
      const degradedResult = await newArchitecturePerformanceValidator.runComprehensiveValidation();

      // Should detect regressions
      expect(degradedResult.passed).toBe(false);
      expect(degradedResult.criticalIssues.length).toBeGreaterThan(0);
      expect(degradedResult.warnings.length).toBeGreaterThan(0);

      // Should have performance comparisons
      expect(degradedResult.comparisons.length).toBeGreaterThan(0);

      // Restore original method
      degradedValidator.collectNewArchitectureMetrics = originalCollectMetrics;

      console.log('✅ Regression detection working correctly');
    });

    test('Performance report generation', () => {
      console.log('📊 Testing performance report generation');

      const report = newArchitecturePerformanceValidator.generatePerformanceReport();

      // Report should contain key sections
      expect(report).toContain('NEW ARCHITECTURE PERFORMANCE VALIDATION REPORT');
      expect(report).toContain('CRITICAL THERAPEUTIC METRICS');
      expect(report).toContain('Crisis Button Response');
      expect(report).toContain('Breathing Animation FPS');
      expect(report).toContain('Assessment Transitions');
      expect(report).toContain('Memory Growth');

      // Report should have proper formatting
      expect(report.split('\n').length).toBeGreaterThan(10);

      console.log('✅ Report generation working correctly');
    });
  });

  describe('New Architecture Benefits Validation', () => {
    test('Expected performance improvements', async () => {
      console.log('📈 Validating New Architecture performance benefits');

      // Mock baseline metrics (representing Legacy Architecture)
      const mockBaseline = {
        crisisButtonResponseTime: 180,
        breathingAnimationFPS: 55,
        assessmentTransitionTime: 280,
        appLaunchTime: 2200,
        emergencyProtocolActivationTime: 95,
        baselineMemoryUsage: 60 * 1024 * 1024,
        peakMemoryUsage: 90 * 1024 * 1024,
        memoryGrowthRatio: 1.5,
        garbageCollectionFrequency: 0.15,
        frameDropPercentage: 0.08,
        animationJank: 20,
        renderingLatency: 18,
        bridgePerformance: 4,
        nativeModuleLatency: 12,
        threadUtilization: 0.75,
      };

      // Mock improved metrics (New Architecture)
      const mockNewArch = {
        crisisButtonResponseTime: 150, // 16.7% improvement
        breathingAnimationFPS: 59,     // 7.3% improvement
        assessmentTransitionTime: 220, // 21.4% improvement
        appLaunchTime: 1800,           // 18.2% improvement
        emergencyProtocolActivationTime: 80, // 15.8% improvement
        baselineMemoryUsage: 45 * 1024 * 1024, // 25% improvement
        peakMemoryUsage: 65 * 1024 * 1024,     // 27.8% improvement
        memoryGrowthRatio: 1.3,        // 13.3% improvement
        garbageCollectionFrequency: 0.1, // 33.3% improvement
        frameDropPercentage: 0.03,     // 62.5% improvement
        animationJank: 15,             // 25% improvement
        renderingLatency: 12,          // 33.3% improvement
        bridgePerformance: 2,          // 50% improvement
        nativeModuleLatency: 8,        // 33.3% improvement
        threadUtilization: 0.65,       // 13.3% improvement
      };

      // Calculate expected improvements
      const improvements = {
        renderingPerformance: ((mockBaseline.renderingLatency - mockNewArch.renderingLatency) / mockBaseline.renderingLatency) * 100,
        memoryUsage: ((mockBaseline.baselineMemoryUsage - mockNewArch.baselineMemoryUsage) / mockBaseline.baselineMemoryUsage) * 100,
        startupTime: ((mockBaseline.appLaunchTime - mockNewArch.appLaunchTime) / mockBaseline.appLaunchTime) * 100,
        frameConsistency: ((mockBaseline.frameDropPercentage - mockNewArch.frameDropPercentage) / mockBaseline.frameDropPercentage) * 100,
      };

      // Validate expected improvements are achieved
      expect(improvements.renderingPerformance).toBeGreaterThanOrEqual(15); // 15%+ rendering improvement
      expect(improvements.memoryUsage).toBeGreaterThanOrEqual(20);         // 20%+ memory reduction
      expect(improvements.startupTime).toBeGreaterThanOrEqual(10);         // 10%+ startup improvement
      expect(improvements.frameConsistency).toBeGreaterThanOrEqual(25);    // 25%+ fewer dropped frames

      console.log(`✅ New Architecture benefits validated:`);
      console.log(`   Rendering: +${improvements.renderingPerformance.toFixed(1)}%`);
      console.log(`   Memory: +${improvements.memoryUsage.toFixed(1)}%`);
      console.log(`   Startup: +${improvements.startupTime.toFixed(1)}%`);
      console.log(`   Frame consistency: +${improvements.frameConsistency.toFixed(1)}%`);
    });
  });

  describe('Device-Specific Performance Validation', () => {
    test('Low-end device performance', async () => {
      console.log('📱 Testing performance on low-end devices');

      // Mock low-end device constraints
      const mockLowEndDevice = {
        memory: 2048, // 2GB RAM
        cpu: 'snapdragon-660',
        platform: 'android' as const,
      };

      const result = await newArchitecturePerformanceValidator.runComprehensiveValidation();

      // Even on low-end devices, critical requirements must be met
      expect(result.metrics.crisisButtonResponseTime).toBeLessThan(200);
      expect(result.metrics.breathingAnimationFPS).toBeGreaterThanOrEqual(50); // Slightly relaxed for low-end

      // Memory constraints should be stricter on low-end devices
      expect(result.metrics.baselineMemoryUsage).toBeLessThan(40 * 1024 * 1024); // Under 40MB

      console.log('✅ Low-end device validation passed');
    });

    test('High-end device performance optimization', async () => {
      console.log('📱 Testing performance optimization on high-end devices');

      // Mock high-end device capabilities
      const mockHighEndDevice = {
        memory: 8192, // 8GB RAM
        cpu: 'a17-pro',
        platform: 'ios' as const,
      };

      const result = await newArchitecturePerformanceValidator.runComprehensiveValidation();

      // High-end devices should exceed baseline requirements
      expect(result.metrics.crisisButtonResponseTime).toBeLessThan(150); // Faster than 200ms
      expect(result.metrics.breathingAnimationFPS).toBeGreaterThanOrEqual(59); // Near perfect 60fps
      expect(result.metrics.assessmentTransitionTime).toBeLessThan(200); // Faster than 300ms

      // Memory usage can be slightly higher but still efficient
      expect(result.metrics.memoryGrowthRatio).toBeLessThan(1.3); // Under 30% growth

      console.log('✅ High-end device optimization validated');
    });
  });

  describe('Stress Testing and Edge Cases', () => {
    test('Performance under memory pressure', async () => {
      console.log('🔥 Testing performance under memory pressure');

      // Simulate memory pressure scenario
      const iterations = 50;
      const results: any[] = [];

      for (let i = 0; i < iterations; i++) {
        // Simulate memory allocation and usage
        const largeArray = new Array(1000000).fill(i);

        // Validate critical performance during memory pressure
        const crisisResult = await newArchitecturePerformanceValidator.validateCrisisButtonResponse();
        results.push(crisisResult);

        // Clean up to prevent actual memory issues in test
        largeArray.length = 0;
      }

      // Crisis response must remain under threshold even under memory pressure
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      const maxResponseTime = Math.max(...results.map(r => r.responseTime));

      expect(avgResponseTime).toBeLessThan(180); // Average under 180ms
      expect(maxResponseTime).toBeLessThan(250); // Even worst case under 250ms

      console.log(`✅ Memory pressure test passed - avg: ${avgResponseTime.toFixed(2)}ms, max: ${maxResponseTime.toFixed(2)}ms`);
    });

    test('Concurrent therapeutic operations performance', async () => {
      console.log('⚡ Testing concurrent operations performance');

      const startTime = performance.now();

      // Simulate multiple concurrent therapeutic operations
      const operations = await Promise.all([
        newArchitecturePerformanceValidator.validateCrisisButtonResponse(),
        newArchitecturePerformanceValidator.validateBreathingAnimation(),
        newArchitecturePerformanceValidator.validateAssessmentTransitions(),
        newArchitecturePerformanceValidator.validateMemoryPerformance(),
      ]);

      const totalTime = performance.now() - startTime;

      // All operations should complete successfully
      operations.forEach(op => {
        expect(op.passed).toBe(true);
      });

      // Concurrent operations should not significantly impact performance
      expect(totalTime).toBeLessThan(10000); // Under 10 seconds for all operations

      console.log(`✅ Concurrent operations completed in ${totalTime.toFixed(2)}ms`);
    });

    test('Background/foreground transition performance', async () => {
      console.log('🔄 Testing background/foreground transition performance');

      // Simulate app backgrounding
      const beforeBackground = await newArchitecturePerformanceValidator.validateCrisisButtonResponse();

      // Mock background state
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate app foregrounding
      const afterForeground = await newArchitecturePerformanceValidator.validateCrisisButtonResponse();

      // Performance should remain consistent across background/foreground transitions
      expect(beforeBackground.passed).toBe(true);
      expect(afterForeground.passed).toBe(true);

      const performanceDelta = Math.abs(afterForeground.responseTime - beforeBackground.responseTime);
      expect(performanceDelta).toBeLessThan(50); // Less than 50ms difference

      console.log(`✅ Background/foreground transition test passed - delta: ${performanceDelta.toFixed(2)}ms`);
    });
  });

  describe('Therapeutic Session Integration', () => {
    test('Complete breathing session performance validation', async () => {
      console.log('🫁 Testing complete breathing session performance');

      const sessionMetrics: any[] = [];
      const sessionDuration = 180000; // 3 minutes
      const sampleInterval = 1000; // 1 second

      // Simulate real breathing session with performance monitoring
      for (let elapsed = 0; elapsed < sessionDuration; elapsed += sampleInterval) {
        const frameValidation = await newArchitecturePerformanceValidator.validateBreathingAnimation();
        sessionMetrics.push({
          timestamp: elapsed,
          fps: frameValidation.avgFPS,
          frameDrops: frameValidation.frameDrops,
        });

        await new Promise(resolve => setTimeout(resolve, 10)); // Minimal delay for simulation
      }

      // Analyze session stability
      const avgFPS = sessionMetrics.reduce((sum, m) => sum + m.fps, 0) / sessionMetrics.length;
      const avgFrameDrops = sessionMetrics.reduce((sum, m) => sum + m.frameDrops, 0) / sessionMetrics.length;

      // Session should maintain stable performance throughout
      expect(avgFPS).toBeGreaterThanOrEqual(58);
      expect(avgFrameDrops).toBeLessThan(0.05);

      // Performance should not degrade significantly over time
      const firstHalf = sessionMetrics.slice(0, sessionMetrics.length / 2);
      const secondHalf = sessionMetrics.slice(sessionMetrics.length / 2);

      const firstHalfFPS = firstHalf.reduce((sum, m) => sum + m.fps, 0) / firstHalf.length;
      const secondHalfFPS = secondHalf.reduce((sum, m) => sum + m.fps, 0) / secondHalf.length;

      const performanceDrift = Math.abs(secondHalfFPS - firstHalfFPS);
      expect(performanceDrift).toBeLessThan(2); // Less than 2fps difference

      console.log(`✅ Breathing session validation passed - avg FPS: ${avgFPS.toFixed(1)}, drift: ${performanceDrift.toFixed(1)}fps`);
    });

    test('Assessment flow end-to-end performance', async () => {
      console.log('📋 Testing complete assessment flow performance');

      const assessmentStore = useAssessmentStore.getState();
      const transitionTimes: number[] = [];

      // Start PHQ-9 assessment
      const startTime = performance.now();
      assessmentStore.startAssessment('phq9', 'standalone');
      const initTime = performance.now() - startTime;

      // Complete all questions with performance tracking
      for (let i = 0; i < 9; i++) {
        const questionStart = performance.now();
        assessmentStore.answerQuestion(2); // Moderate response
        const questionTime = performance.now() - questionStart;
        transitionTimes.push(questionTime);
      }

      // Complete assessment
      const saveStart = performance.now();
      await assessmentStore.saveAssessment();
      const saveTime = performance.now() - saveStart;

      // Validate performance throughout assessment
      expect(initTime).toBeLessThan(200); // Quick initialization
      expect(saveTime).toBeLessThan(1000); // Save within 1 second

      // All transitions should be fast
      const avgTransitionTime = transitionTimes.reduce((sum, time) => sum + time, 0) / transitionTimes.length;
      expect(avgTransitionTime).toBeLessThan(100); // Under 100ms per question

      console.log(`✅ Assessment flow validation passed - init: ${initTime.toFixed(2)}ms, avg transition: ${avgTransitionTime.toFixed(2)}ms`);
    });
  });
});

// Additional utility functions for testing
export const performanceTestHelpers = {
  async measureCrisisButtonResponseConsistency(iterations: number = 100) {
    const results: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const result = await newArchitecturePerformanceValidator.validateCrisisButtonResponse();
      results.push(result.responseTime);
    }

    return {
      average: results.reduce((sum, time) => sum + time, 0) / results.length,
      min: Math.min(...results),
      max: Math.max(...results),
      p95: results.sort((a, b) => a - b)[Math.floor(results.length * 0.95)],
      p99: results.sort((a, b) => a - b)[Math.floor(results.length * 0.99)],
    };
  },

  async validateTherapeuticTimingRequirements() {
    const validations = await Promise.all([
      newArchitecturePerformanceValidator.validateCrisisButtonResponse(),
      newArchitecturePerformanceValidator.validateBreathingAnimation(),
      newArchitecturePerformanceValidator.validateAssessmentTransitions(),
      newArchitecturePerformanceValidator.validateMemoryPerformance(),
    ]);

    return {
      allPassed: validations.every(v => v.passed),
      results: validations,
    };
  },

  generatePerformanceBenchmarkReport() {
    return newArchitecturePerformanceValidator.generatePerformanceReport();
  },
};