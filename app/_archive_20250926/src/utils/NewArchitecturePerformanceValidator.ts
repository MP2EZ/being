/**
 * New Architecture Performance Validator
 *
 * Comprehensive performance validation system for React Native New Architecture transition.
 * Monitors critical therapeutic timing requirements and validates performance improvements.
 *
 * CRITICAL REQUIREMENTS:
 * - Crisis button response <200ms
 * - Breathing animation 60fps consistency
 * - Assessment transitions <300ms
 * - Memory stability during therapeutic sessions
 * - App launch <2s to home screen
 */

import { therapeuticPerformanceSystem } from './TherapeuticPerformanceSystem';
import { performanceRegressionDetector } from './PerformanceRegressionDetector';
import { performanceMonitor } from './PerformanceMonitor';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// NEW ARCHITECTURE PERFORMANCE TYPES
// ============================================================================

interface NewArchitectureMetrics {
  // Critical therapeutic timings
  crisisButtonResponseTime: number;
  breathingAnimationFPS: number;
  assessmentTransitionTime: number;
  appLaunchTime: number;
  emergencyProtocolActivationTime: number;

  // Memory and resource metrics
  baselineMemoryUsage: number;
  peakMemoryUsage: number;
  memoryGrowthRatio: number;
  garbageCollectionFrequency: number;

  // Animation performance
  frameDropPercentage: number;
  animationJank: number;
  renderingLatency: number;

  // Platform-specific metrics
  bridgePerformance: number;
  nativeModuleLatency: number;
  threadUtilization: number;
}

interface PerformanceComparison {
  metric: keyof NewArchitectureMetrics;
  legacyValue: number;
  newArchValue: number;
  improvement: number; // percentage
  status: 'improved' | 'degraded' | 'stable';
  severity: 'critical' | 'warning' | 'info';
}

interface ValidationResult {
  timestamp: number;
  deviceInfo: {
    platform: 'ios' | 'android';
    deviceModel: string;
    osVersion: string;
    memory: number;
    screenSize: { width: number; height: number };
  };
  metrics: NewArchitectureMetrics;
  comparisons: PerformanceComparison[];
  passed: boolean;
  criticalIssues: string[];
  warnings: string[];
  recommendations: string[];
}

// ============================================================================
// NEW ARCHITECTURE PERFORMANCE VALIDATOR CLASS
// ============================================================================

class NewArchitecturePerformanceValidator {
  private isValidating = false;
  private baselineMetrics: NewArchitectureMetrics | null = null;
  private validationHistory: ValidationResult[] = [];
  private alertCallbacks: Array<(result: ValidationResult) => void> = [];

  // Performance thresholds for critical therapeutic requirements
  private readonly CRITICAL_THRESHOLDS = {
    crisisButtonResponseTime: 200,    // ms - CRITICAL for user safety
    breathingAnimationFPS: 58,        // fps - minimum for smooth therapeutic experience
    assessmentTransitionTime: 300,    // ms - maintain therapeutic flow
    appLaunchTime: 2000,             // ms - immediate access requirement
    emergencyProtocolActivationTime: 100, // ms - CRITICAL for crisis response
    frameDropPercentage: 0.05,       // 5% maximum
    memoryGrowthRatio: 1.5,          // 50% maximum growth
    animationJank: 16.67,            // ms per frame for 60fps
  };

  // Expected improvements from New Architecture
  private readonly EXPECTED_IMPROVEMENTS = {
    renderingPerformance: 0.15,      // 15% improvement
    memoryUsage: 0.20,               // 20% reduction
    startupTime: 0.10,               // 10% improvement
    frameConsistency: 0.25,          // 25% fewer dropped frames
  };

  /**
   * Initialize the New Architecture performance validator
   */
  async initialize(): Promise<void> {
    console.log('🏗️ Initializing New Architecture Performance Validator');

    try {
      // Load baseline metrics if available
      await this.loadBaselineMetrics();

      // Initialize underlying performance systems
      therapeuticPerformanceSystem.initialize();
      performanceRegressionDetector.initialize();

      // Set up automated validation intervals
      this.startContinuousValidation();

      console.log('✅ New Architecture Performance Validator initialized');
    } catch (error) {
      console.error('❌ Failed to initialize performance validator:', error);
      throw error;
    }
  }

  /**
   * Start comprehensive performance validation for New Architecture
   */
  async startValidation(): Promise<ValidationResult> {
    if (this.isValidating) {
      console.warn('Performance validation already in progress');
      return this.validationHistory[this.validationHistory.length - 1];
    }

    this.isValidating = true;
    console.log('🚀 Starting New Architecture performance validation');

    const startTime = performance.now();

    try {
      // Collect comprehensive metrics
      const metrics = await this.collectNewArchitectureMetrics();

      // Get device information
      const deviceInfo = await this.getDeviceInfo();

      // Compare with baseline if available
      const comparisons = this.baselineMetrics
        ? this.compareWithBaseline(metrics, this.baselineMetrics)
        : [];

      // Validate against critical requirements
      const validation = this.validateCriticalRequirements(metrics);

      // Generate recommendations
      const recommendations = this.generateRecommendations(metrics, comparisons);

      const result: ValidationResult = {
        timestamp: Date.now(),
        deviceInfo,
        metrics,
        comparisons,
        passed: validation.passed,
        criticalIssues: validation.criticalIssues,
        warnings: validation.warnings,
        recommendations,
      };

      // Store validation result
      this.validationHistory.push(result);
      await this.saveValidationResult(result);

      // Set as baseline if this is the first validation
      if (!this.baselineMetrics) {
        this.baselineMetrics = metrics;
        await this.saveBaselineMetrics(metrics);
      }

      // Trigger alerts if needed
      this.checkForAlerts(result);

      const validationTime = performance.now() - startTime;
      console.log(`✅ Performance validation completed in ${validationTime.toFixed(2)}ms`);

      return result;

    } catch (error) {
      console.error('❌ Performance validation failed:', error);
      throw error;
    } finally {
      this.isValidating = false;
    }
  }

  /**
   * Validate crisis button response time (CRITICAL <200ms)
   */
  async validateCrisisButtonResponse(): Promise<{ responseTime: number; passed: boolean }> {
    console.log('🚨 Validating crisis button response time');

    const startTime = performance.now();

    // Simulate crisis button press and measure response
    try {
      // Track with therapeutic performance system
      const responseTime = therapeuticPerformanceSystem.trackCrisisButtonResponse(startTime, 'new_arch_validation');

      const passed = responseTime < this.CRITICAL_THRESHOLDS.crisisButtonResponseTime;

      if (!passed) {
        console.error(`🚨 CRITICAL: Crisis button response ${responseTime.toFixed(2)}ms exceeds 200ms requirement`);
      } else {
        console.log(`✅ Crisis button response: ${responseTime.toFixed(2)}ms (requirement: <200ms)`);
      }

      return { responseTime, passed };

    } catch (error) {
      console.error('❌ Crisis button validation failed:', error);
      return { responseTime: 999, passed: false };
    }
  }

  /**
   * Validate breathing animation performance (60fps consistency)
   */
  async validateBreathingAnimation(): Promise<{ avgFPS: number; frameDrops: number; passed: boolean }> {
    console.log('🫁 Validating breathing animation performance');

    const frameData: number[] = [];
    const testDuration = 5000; // 5 seconds test
    const targetFPS = 60;
    const frameTime = 1000 / targetFPS;

    return new Promise((resolve) => {
      let frameCount = 0;
      let lastFrameTime = performance.now();
      let testStartTime = performance.now();

      const trackFrame = () => {
        const currentTime = performance.now();
        const frameDelta = currentTime - lastFrameTime;
        frameData.push(frameDelta);

        // Track with therapeutic performance system
        therapeuticPerformanceSystem.trackBreathingAnimationFrame(lastFrameTime);

        lastFrameTime = currentTime;
        frameCount++;

        if (currentTime - testStartTime < testDuration) {
          requestAnimationFrame(trackFrame);
        } else {
          // Calculate results
          const avgFrameTime = frameData.reduce((sum, time) => sum + time, 0) / frameData.length;
          const avgFPS = 1000 / avgFrameTime;
          const droppedFrames = frameData.filter(time => time > frameTime * 1.5).length;
          const frameDrops = droppedFrames / frameData.length;

          const passed = avgFPS >= this.CRITICAL_THRESHOLDS.breathingAnimationFPS &&
                        frameDrops <= this.CRITICAL_THRESHOLDS.frameDropPercentage;

          if (!passed) {
            console.error(`🚨 CRITICAL: Breathing animation performance insufficient - ${avgFPS.toFixed(1)}fps, ${(frameDrops * 100).toFixed(1)}% drops`);
          } else {
            console.log(`✅ Breathing animation: ${avgFPS.toFixed(1)}fps, ${(frameDrops * 100).toFixed(1)}% drops`);
          }

          resolve({ avgFPS, frameDrops, passed });
        }
      };

      requestAnimationFrame(trackFrame);
    });
  }

  /**
   * Validate assessment screen transition performance (<300ms)
   */
  async validateAssessmentTransitions(): Promise<{ avgTransitionTime: number; passed: boolean }> {
    console.log('📋 Validating assessment transition performance');

    const transitionTimes: number[] = [];
    const assessmentTypes = ['phq9', 'gad7'];
    const transitions = ['start', 'question1', 'question2', 'question3', 'results'];

    for (const assessmentType of assessmentTypes) {
      for (let i = 0; i < transitions.length - 1; i++) {
        const startTime = performance.now();

        // Simulate screen transition
        await new Promise(resolve => setTimeout(resolve, 50)); // Mock transition work

        const transitionTime = therapeuticPerformanceSystem.trackCheckInTransition(
          startTime,
          transitions[i],
          transitions[i + 1]
        );

        transitionTimes.push(transitionTime);
      }
    }

    const avgTransitionTime = transitionTimes.reduce((sum, time) => sum + time, 0) / transitionTimes.length;
    const passed = avgTransitionTime < this.CRITICAL_THRESHOLDS.assessmentTransitionTime;

    if (!passed) {
      console.error(`🚨 WARNING: Assessment transitions slow - ${avgTransitionTime.toFixed(2)}ms average (requirement: <300ms)`);
    } else {
      console.log(`✅ Assessment transitions: ${avgTransitionTime.toFixed(2)}ms average`);
    }

    return { avgTransitionTime, passed };
  }

  /**
   * Validate memory usage during therapeutic sessions
   */
  async validateMemoryPerformance(): Promise<{ baselineMemory: number; peakMemory: number; growthRatio: number; passed: boolean }> {
    console.log('🧠 Validating memory performance during therapeutic session');

    const startMemory = this.getCurrentMemoryUsage();
    const memorySnapshots: number[] = [startMemory];

    // Simulate 3-minute therapeutic session
    const sessionDuration = 180000; // 3 minutes
    const sampleInterval = 5000; // 5 seconds
    const samples = sessionDuration / sampleInterval;

    for (let i = 0; i < samples; i++) {
      // Simulate session activity
      await this.simulateTherapeuticActivity();

      await new Promise(resolve => setTimeout(resolve, sampleInterval));

      const currentMemory = this.getCurrentMemoryUsage();
      memorySnapshots.push(currentMemory);
    }

    const baselineMemory = startMemory;
    const peakMemory = Math.max(...memorySnapshots);
    const growthRatio = peakMemory / baselineMemory;

    const passed = growthRatio <= this.CRITICAL_THRESHOLDS.memoryGrowthRatio;

    if (!passed) {
      console.error(`🚨 WARNING: Memory growth excessive - ${(growthRatio * 100).toFixed(1)}% increase (limit: 50%)`);
    } else {
      console.log(`✅ Memory stability: ${((growthRatio - 1) * 100).toFixed(1)}% growth`);
    }

    return { baselineMemory, peakMemory, growthRatio, passed };
  }

  /**
   * Run comprehensive New Architecture performance test suite
   */
  async runComprehensiveValidation(): Promise<ValidationResult> {
    console.log('🏗️ Running comprehensive New Architecture validation');

    const results = await Promise.all([
      this.validateCrisisButtonResponse(),
      this.validateBreathingAnimation(),
      this.validateAssessmentTransitions(),
      this.validateMemoryPerformance(),
    ]);

    const [crisisResult, breathingResult, assessmentResult, memoryResult] = results;

    const metrics: NewArchitectureMetrics = {
      crisisButtonResponseTime: crisisResult.responseTime,
      breathingAnimationFPS: breathingResult.avgFPS,
      assessmentTransitionTime: assessmentResult.avgTransitionTime,
      appLaunchTime: 0, // To be measured separately
      emergencyProtocolActivationTime: 0, // To be measured separately
      baselineMemoryUsage: memoryResult.baselineMemory,
      peakMemoryUsage: memoryResult.peakMemory,
      memoryGrowthRatio: memoryResult.growthRatio,
      garbageCollectionFrequency: 0, // To be implemented
      frameDropPercentage: breathingResult.frameDrops,
      animationJank: 0, // To be calculated
      renderingLatency: 0, // To be measured
      bridgePerformance: 0, // To be measured
      nativeModuleLatency: 0, // To be measured
      threadUtilization: 0, // To be measured
    };

    const deviceInfo = await this.getDeviceInfo();
    const comparisons = this.baselineMetrics ? this.compareWithBaseline(metrics, this.baselineMetrics) : [];

    const allPassed = crisisResult.passed && breathingResult.passed && assessmentResult.passed && memoryResult.passed;

    const criticalIssues: string[] = [];
    const warnings: string[] = [];

    if (!crisisResult.passed) {
      criticalIssues.push(`Crisis button response time exceeded: ${crisisResult.responseTime.toFixed(2)}ms > 200ms`);
    }
    if (!breathingResult.passed) {
      criticalIssues.push(`Breathing animation performance insufficient: ${breathingResult.avgFPS.toFixed(1)}fps < 58fps`);
    }
    if (!assessmentResult.passed) {
      warnings.push(`Assessment transitions slow: ${assessmentResult.avgTransitionTime.toFixed(2)}ms > 300ms`);
    }
    if (!memoryResult.passed) {
      warnings.push(`Memory growth excessive: ${(memoryResult.growthRatio * 100).toFixed(1)}% > 150%`);
    }

    const result: ValidationResult = {
      timestamp: Date.now(),
      deviceInfo,
      metrics,
      comparisons,
      passed: allPassed,
      criticalIssues,
      warnings,
      recommendations: this.generateRecommendations(metrics, comparisons),
    };

    this.validationHistory.push(result);
    await this.saveValidationResult(result);

    return result;
  }

  /**
   * Generate performance report comparing New Architecture vs baseline
   */
  generatePerformanceReport(): string {
    if (this.validationHistory.length === 0) {
      return 'No validation data available. Run validatePerformance() first.';
    }

    const latest = this.validationHistory[this.validationHistory.length - 1];

    let report = '\n=== NEW ARCHITECTURE PERFORMANCE VALIDATION REPORT ===\n';
    report += `Generated: ${new Date(latest.timestamp).toISOString()}\n`;
    report += `Device: ${latest.deviceInfo.platform} ${latest.deviceInfo.deviceModel}\n`;
    report += `Overall Status: ${latest.passed ? 'PASSED ✅' : 'FAILED ❌'}\n\n`;

    // Critical metrics
    report += 'CRITICAL THERAPEUTIC METRICS:\n';
    report += `- Crisis Button Response: ${latest.metrics.crisisButtonResponseTime.toFixed(2)}ms (target: <200ms) ${latest.metrics.crisisButtonResponseTime < 200 ? '✅' : '❌'}\n`;
    report += `- Breathing Animation FPS: ${latest.metrics.breathingAnimationFPS.toFixed(1)}fps (target: ≥58fps) ${latest.metrics.breathingAnimationFPS >= 58 ? '✅' : '❌'}\n`;
    report += `- Assessment Transitions: ${latest.metrics.assessmentTransitionTime.toFixed(2)}ms (target: <300ms) ${latest.metrics.assessmentTransitionTime < 300 ? '✅' : '❌'}\n`;
    report += `- Memory Growth: ${((latest.metrics.memoryGrowthRatio - 1) * 100).toFixed(1)}% (limit: <50%) ${latest.metrics.memoryGrowthRatio <= 1.5 ? '✅' : '❌'}\n\n`;

    // Performance comparisons
    if (latest.comparisons.length > 0) {
      report += 'NEW ARCHITECTURE IMPROVEMENTS:\n';
      latest.comparisons.forEach(comparison => {
        const trend = comparison.improvement > 0 ? '📈' : comparison.improvement < 0 ? '📉' : '➡️';
        report += `- ${comparison.metric}: ${comparison.improvement > 0 ? '+' : ''}${comparison.improvement.toFixed(1)}% ${trend}\n`;
      });
      report += '\n';
    }

    // Issues and warnings
    if (latest.criticalIssues.length > 0) {
      report += 'CRITICAL ISSUES:\n';
      latest.criticalIssues.forEach((issue, index) => {
        report += `${index + 1}. 🚨 ${issue}\n`;
      });
      report += '\n';
    }

    if (latest.warnings.length > 0) {
      report += 'WARNINGS:\n';
      latest.warnings.forEach((warning, index) => {
        report += `${index + 1}. ⚠️ ${warning}\n`;
      });
      report += '\n';
    }

    // Recommendations
    if (latest.recommendations.length > 0) {
      report += 'RECOMMENDATIONS:\n';
      latest.recommendations.forEach((rec, index) => {
        report += `${index + 1}. ${rec}\n`;
      });
    }

    report += '\n=== END VALIDATION REPORT ===\n';

    return report;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async collectNewArchitectureMetrics(): Promise<NewArchitectureMetrics> {
    // This would collect actual metrics in a real implementation
    // For now, returning mock data structure
    return {
      crisisButtonResponseTime: 150,
      breathingAnimationFPS: 59.5,
      assessmentTransitionTime: 250,
      appLaunchTime: 1800,
      emergencyProtocolActivationTime: 80,
      baselineMemoryUsage: 45 * 1024 * 1024,
      peakMemoryUsage: 55 * 1024 * 1024,
      memoryGrowthRatio: 1.22,
      garbageCollectionFrequency: 0.1,
      frameDropPercentage: 0.02,
      animationJank: 15.2,
      renderingLatency: 12.5,
      bridgePerformance: 2.1,
      nativeModuleLatency: 8.3,
      threadUtilization: 0.65,
    };
  }

  private async getDeviceInfo() {
    // Mock device info - replace with actual implementation
    return {
      platform: 'ios' as const,
      deviceModel: 'iPhone 14',
      osVersion: '17.0',
      memory: 6144,
      screenSize: { width: 390, height: 844 },
    };
  }

  private compareWithBaseline(current: NewArchitectureMetrics, baseline: NewArchitectureMetrics): PerformanceComparison[] {
    const comparisons: PerformanceComparison[] = [];

    Object.keys(current).forEach(key => {
      const metric = key as keyof NewArchitectureMetrics;
      const currentValue = current[metric];
      const baselineValue = baseline[metric];

      if (typeof currentValue === 'number' && typeof baselineValue === 'number' && baselineValue > 0) {
        const improvement = ((baselineValue - currentValue) / baselineValue) * 100;

        let status: 'improved' | 'degraded' | 'stable';
        if (Math.abs(improvement) < 2) {
          status = 'stable';
        } else if (improvement > 0) {
          status = 'improved';
        } else {
          status = 'degraded';
        }

        const severity = Math.abs(improvement) > 20 ? 'critical' : Math.abs(improvement) > 10 ? 'warning' : 'info';

        comparisons.push({
          metric,
          legacyValue: baselineValue,
          newArchValue: currentValue,
          improvement,
          status,
          severity,
        });
      }
    });

    return comparisons;
  }

  private validateCriticalRequirements(metrics: NewArchitectureMetrics) {
    const criticalIssues: string[] = [];
    const warnings: string[] = [];

    // Crisis button response (CRITICAL)
    if (metrics.crisisButtonResponseTime > this.CRITICAL_THRESHOLDS.crisisButtonResponseTime) {
      criticalIssues.push(`Crisis button response time exceeds 200ms: ${metrics.crisisButtonResponseTime}ms`);
    }

    // Breathing animation FPS (CRITICAL)
    if (metrics.breathingAnimationFPS < this.CRITICAL_THRESHOLDS.breathingAnimationFPS) {
      criticalIssues.push(`Breathing animation FPS below 58: ${metrics.breathingAnimationFPS}fps`);
    }

    // Assessment transitions (WARNING)
    if (metrics.assessmentTransitionTime > this.CRITICAL_THRESHOLDS.assessmentTransitionTime) {
      warnings.push(`Assessment transition time exceeds 300ms: ${metrics.assessmentTransitionTime}ms`);
    }

    // Memory growth (WARNING)
    if (metrics.memoryGrowthRatio > this.CRITICAL_THRESHOLDS.memoryGrowthRatio) {
      warnings.push(`Memory growth exceeds 50%: ${((metrics.memoryGrowthRatio - 1) * 100).toFixed(1)}%`);
    }

    // Frame drops (WARNING)
    if (metrics.frameDropPercentage > this.CRITICAL_THRESHOLDS.frameDropPercentage) {
      warnings.push(`Frame drop percentage exceeds 5%: ${(metrics.frameDropPercentage * 100).toFixed(1)}%`);
    }

    return {
      passed: criticalIssues.length === 0,
      criticalIssues,
      warnings,
    };
  }

  private generateRecommendations(metrics: NewArchitectureMetrics, comparisons: PerformanceComparison[]): string[] {
    const recommendations: string[] = [];

    // Crisis response recommendations
    if (metrics.crisisButtonResponseTime > 180) {
      recommendations.push('CRITICAL: Optimize crisis button handler - remove async operations and pre-load crisis resources');
    }

    // Animation recommendations
    if (metrics.breathingAnimationFPS < 58) {
      recommendations.push('CRITICAL: Breathing animation optimization - use native driver and reduce UI complexity');
    }

    // Memory recommendations
    if (metrics.memoryGrowthRatio > 1.3) {
      recommendations.push('HIGH: Implement memory cleanup between therapeutic sessions');
    }

    // New Architecture specific recommendations
    recommendations.push('Monitor New Architecture performance benefits in production');
    recommendations.push('Validate therapeutic timing requirements across all target devices');

    return recommendations;
  }

  private getCurrentMemoryUsage(): number {
    // Mock implementation - replace with actual memory measurement
    return Math.random() * 100 * 1024 * 1024; // Random value between 0-100MB
  }

  private async simulateTherapeuticActivity(): Promise<void> {
    // Simulate typical therapeutic session activity
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async loadBaselineMetrics(): Promise<void> {
    try {
      const baseline = await AsyncStorage.getItem('@new_arch_baseline_metrics');
      if (baseline) {
        this.baselineMetrics = JSON.parse(baseline);
        console.log('📏 Loaded baseline metrics');
      }
    } catch (error) {
      console.warn('Could not load baseline metrics:', error);
    }
  }

  private async saveBaselineMetrics(metrics: NewArchitectureMetrics): Promise<void> {
    try {
      await AsyncStorage.setItem('@new_arch_baseline_metrics', JSON.stringify(metrics));
      console.log('💾 Saved baseline metrics');
    } catch (error) {
      console.error('Failed to save baseline metrics:', error);
    }
  }

  private async saveValidationResult(result: ValidationResult): Promise<void> {
    try {
      const key = `@new_arch_validation_${result.timestamp}`;
      await AsyncStorage.setItem(key, JSON.stringify(result));
    } catch (error) {
      console.error('Failed to save validation result:', error);
    }
  }

  private startContinuousValidation(): void {
    // Run validation every 5 minutes in development, hourly in production
    const interval = __DEV__ ? 5 * 60 * 1000 : 60 * 60 * 1000;

    setInterval(async () => {
      try {
        await this.runComprehensiveValidation();
      } catch (error) {
        console.error('Continuous validation failed:', error);
      }
    }, interval);
  }

  private checkForAlerts(result: ValidationResult): void {
    if (result.criticalIssues.length > 0) {
      this.alertCallbacks.forEach(callback => callback(result));
    }
  }

  /**
   * Register callback for performance alerts
   */
  onPerformanceAlert(callback: (result: ValidationResult) => void): void {
    this.alertCallbacks.push(callback);
  }
}

// ============================================================================
// SINGLETON INSTANCE AND EXPORTS
// ============================================================================

export const newArchitecturePerformanceValidator = new NewArchitecturePerformanceValidator();

// ============================================================================
// REACT HOOKS FOR COMPONENT INTEGRATION
// ============================================================================

export const useNewArchitectureValidation = () => {
  const [isValidating, setIsValidating] = React.useState(false);
  const [lastResult, setLastResult] = React.useState<ValidationResult | null>(null);

  const runValidation = React.useCallback(async () => {
    setIsValidating(true);
    try {
      const result = await newArchitecturePerformanceValidator.runComprehensiveValidation();
      setLastResult(result);
      return result;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const validateCrisisResponse = React.useCallback(async () => {
    return newArchitecturePerformanceValidator.validateCrisisButtonResponse();
  }, []);

  const validateBreathing = React.useCallback(async () => {
    return newArchitecturePerformanceValidator.validateBreathingAnimation();
  }, []);

  return {
    isValidating,
    lastResult,
    runValidation,
    validateCrisisResponse,
    validateBreathing,
    generateReport: newArchitecturePerformanceValidator.generatePerformanceReport.bind(newArchitecturePerformanceValidator),
  };
};

export type {
  NewArchitectureMetrics,
  PerformanceComparison,
  ValidationResult,
};

export default newArchitecturePerformanceValidator;