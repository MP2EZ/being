/**
 * New Architecture Performance Hook
 *
 * React hook for integrating New Architecture performance monitoring
 * into Being. therapeutic components and screens.
 *
 * Provides easy access to performance validation, monitoring,
 * and crisis-specific timing validation.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  newArchitecturePerformanceValidator,
  useNewArchitectureValidation,
  type ValidationResult,
  type NewArchitectureMetrics,
} from '../utils/NewArchitecturePerformanceValidator';
import { therapeuticPerformanceSystem } from '../utils/TherapeuticPerformanceSystem';

interface PerformanceConfig {
  enableAutoValidation?: boolean;
  validationInterval?: number; // ms
  enableCrisisMonitoring?: boolean;
  enableBreathingMonitoring?: boolean;
  alertOnThresholdViolation?: boolean;
}

interface PerformanceState {
  isMonitoring: boolean;
  lastValidation: ValidationResult | null;
  currentMetrics: NewArchitectureMetrics | null;
  hasRegressions: boolean;
  criticalIssues: string[];
  warnings: string[];
}

interface PerformanceActions {
  startMonitoring: () => void;
  stopMonitoring: () => void;
  runQuickValidation: () => Promise<ValidationResult>;
  validateCrisisResponse: () => Promise<{ responseTime: number; passed: boolean }>;
  validateBreathingPerformance: () => Promise<{ avgFPS: number; frameDrops: number; passed: boolean }>;
  getPerformanceReport: () => string;
  reset: () => void;
}

const DEFAULT_CONFIG: PerformanceConfig = {
  enableAutoValidation: false,
  validationInterval: 30000, // 30 seconds
  enableCrisisMonitoring: true,
  enableBreathingMonitoring: true,
  alertOnThresholdViolation: true,
};

/**
 * Primary hook for New Architecture performance monitoring
 */
export const useNewArchitecturePerformance = (
  config: PerformanceConfig = DEFAULT_CONFIG
): [PerformanceState, PerformanceActions] => {
  const [state, setState] = useState<PerformanceState>({
    isMonitoring: false,
    lastValidation: null,
    currentMetrics: null,
    hasRegressions: false,
    criticalIssues: [],
    warnings: [],
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const {
    isValidating,
    runValidation,
    validateCrisisResponse,
    validateBreathing,
    generateReport,
  } = useNewArchitectureValidation();

  // Auto-validation interval
  useEffect(() => {
    if (state.isMonitoring && config.enableAutoValidation) {
      intervalRef.current = setInterval(async () => {
        try {
          const result = await runValidation();
          updateStateFromValidation(result);
        } catch (error) {
          console.error('Auto-validation failed:', error);
        }
      }, config.validationInterval);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isMonitoring, config.enableAutoValidation, config.validationInterval, runValidation]);

  const updateStateFromValidation = useCallback((result: ValidationResult) => {
    setState(prev => ({
      ...prev,
      lastValidation: result,
      currentMetrics: result.metrics,
      hasRegressions: result.comparisons.some(c => c.status === 'degraded'),
      criticalIssues: result.criticalIssues,
      warnings: result.warnings,
    }));

    // Alert on threshold violations if enabled
    if (config.alertOnThresholdViolation && result.criticalIssues.length > 0) {
      console.warn('🚨 Performance threshold violations detected:', result.criticalIssues);
    }
  }, [config.alertOnThresholdViolation]);

  const actions: PerformanceActions = {
    startMonitoring: useCallback(() => {
      setState(prev => ({ ...prev, isMonitoring: true }));
      therapeuticPerformanceSystem.startRealTimeMonitoring();
    }, []),

    stopMonitoring: useCallback(() => {
      setState(prev => ({ ...prev, isMonitoring: false }));
      const result = therapeuticPerformanceSystem.stopRealTimeMonitoring();
      console.log('Performance monitoring stopped:', result.report);
    }, []),

    runQuickValidation: useCallback(async () => {
      const result = await runValidation();
      updateStateFromValidation(result);
      return result;
    }, [runValidation, updateStateFromValidation]),

    validateCrisisResponse: useCallback(async () => {
      const result = await validateCrisisResponse();

      // Update state with crisis-specific results
      if (!result.passed) {
        setState(prev => ({
          ...prev,
          criticalIssues: [
            ...prev.criticalIssues.filter(issue => !issue.includes('Crisis button')),
            `Crisis button response time exceeded: ${result.responseTime.toFixed(2)}ms > 200ms`
          ],
        }));
      }

      return result;
    }, [validateCrisisResponse]),

    validateBreathingPerformance: useCallback(async () => {
      const result = await validateBreathing();

      // Update state with breathing-specific results
      if (!result.passed) {
        setState(prev => ({
          ...prev,
          criticalIssues: [
            ...prev.criticalIssues.filter(issue => !issue.includes('Breathing animation')),
            `Breathing animation performance insufficient: ${result.avgFPS.toFixed(1)}fps < 58fps`
          ],
        }));
      }

      return result;
    }, [validateBreathing]),

    getPerformanceReport: useCallback(() => {
      return generateReport();
    }, [generateReport]),

    reset: useCallback(() => {
      setState({
        isMonitoring: false,
        lastValidation: null,
        currentMetrics: null,
        hasRegressions: false,
        criticalIssues: [],
        warnings: [],
      });
    }, []),
  };

  return [state, actions];
};

/**
 * Hook specifically for crisis button performance monitoring
 */
export const useCrisisButtonPerformance = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [lastResponseTime, setLastResponseTime] = useState<number | null>(null);
  const [violations, setViolations] = useState<number>(0);

  const trackCrisisButtonPress = useCallback(async () => {
    if (isTracking) return null;

    setIsTracking(true);
    const startTime = performance.now();

    try {
      // Simulate crisis button press and track performance
      const responseTime = therapeuticPerformanceSystem.trackCrisisButtonResponse(
        startTime,
        'new_arch_hook_tracking'
      );

      setLastResponseTime(responseTime);

      if (responseTime > 200) {
        setViolations(prev => prev + 1);
        console.warn(`🚨 Crisis button response violation: ${responseTime.toFixed(2)}ms`);
      }

      return responseTime;
    } finally {
      setIsTracking(false);
    }
  }, [isTracking]);

  const resetTracking = useCallback(() => {
    setViolations(0);
    setLastResponseTime(null);
  }, []);

  return {
    isTracking,
    lastResponseTime,
    violations,
    trackCrisisButtonPress,
    resetTracking,
    isWithinThreshold: lastResponseTime !== null && lastResponseTime < 200,
  };
};

/**
 * Hook for breathing animation performance monitoring
 */
export const useBreathingAnimationPerformance = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [frameData, setFrameData] = useState<{
    averageFPS: number;
    frameDrops: number;
    violations: number;
  }>({
    averageFPS: 60,
    frameDrops: 0,
    violations: 0,
  });

  const startFrameTracking = useCallback(() => {
    if (isTracking) return;

    setIsTracking(true);
    let frameCount = 0;
    let lastFrameTime = performance.now();
    let frameDropCount = 0;

    const trackFrame = () => {
      if (!isTracking) return;

      const currentTime = performance.now();
      const frameDelta = currentTime - lastFrameTime;

      // Track frame with therapeutic performance system
      therapeuticPerformanceSystem.trackBreathingAnimationFrame(lastFrameTime);

      // Count frame drops (frames taking longer than 16.67ms for 60fps)
      if (frameDelta > 16.67 * 1.5) {
        frameDropCount++;
      }

      frameCount++;
      lastFrameTime = currentTime;

      if (frameCount % 60 === 0) { // Update stats every 60 frames (1 second at 60fps)
        const avgFPS = 1000 / (frameDelta || 16.67);
        const dropPercentage = frameDropCount / 60;

        setFrameData(prev => {
          const newViolations = avgFPS < 58 ? prev.violations + 1 : prev.violations;
          return {
            averageFPS: avgFPS,
            frameDrops: dropPercentage,
            violations: newViolations,
          };
        });

        frameDropCount = 0; // Reset for next second
      }

      if (isTracking) {
        requestAnimationFrame(trackFrame);
      }
    };

    requestAnimationFrame(trackFrame);
  }, [isTracking]);

  const stopFrameTracking = useCallback(() => {
    setIsTracking(false);
  }, []);

  const resetTracking = useCallback(() => {
    setFrameData({
      averageFPS: 60,
      frameDrops: 0,
      violations: 0,
    });
  }, []);

  return {
    isTracking,
    frameData,
    startFrameTracking,
    stopFrameTracking,
    resetTracking,
    isPerformant: frameData.averageFPS >= 58 && frameData.frameDrops < 0.05,
  };
};

/**
 * Hook for memory usage monitoring during therapeutic sessions
 */
export const useTherapeuticSessionMemoryMonitoring = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [memoryStats, setMemoryStats] = useState<{
    baseline: number;
    current: number;
    peak: number;
    growthRatio: number;
    violations: number;
  }>({
    baseline: 0,
    current: 0,
    peak: 0,
    growthRatio: 1,
    violations: 0,
  });

  const startMemoryMonitoring = useCallback(() => {
    if (isMonitoring) return;

    setIsMonitoring(true);

    // Get initial baseline
    const baseline = performance.memory?.usedJSHeapSize || 50 * 1024 * 1024; // 50MB fallback
    setMemoryStats(prev => ({ ...prev, baseline, current: baseline, peak: baseline }));

    const monitoringInterval = setInterval(() => {
      if (!isMonitoring) {
        clearInterval(monitoringInterval);
        return;
      }

      const currentMemory = performance.memory?.usedJSHeapSize || baseline;
      const growthRatio = currentMemory / baseline;

      setMemoryStats(prev => {
        const newPeak = Math.max(prev.peak, currentMemory);
        const newViolations = growthRatio > 1.5 ? prev.violations + 1 : prev.violations;

        return {
          ...prev,
          current: currentMemory,
          peak: newPeak,
          growthRatio,
          violations: newViolations,
        };
      });
    }, 5000); // Check every 5 seconds

    return () => clearInterval(monitoringInterval);
  }, [isMonitoring]);

  const stopMemoryMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  const resetMemoryStats = useCallback(() => {
    setMemoryStats({
      baseline: 0,
      current: 0,
      peak: 0,
      growthRatio: 1,
      violations: 0,
    });
  }, []);

  return {
    isMonitoring,
    memoryStats,
    startMemoryMonitoring,
    stopMemoryMonitoring,
    resetMemoryStats,
    isWithinLimits: memoryStats.growthRatio <= 1.5,
    memoryUsageMB: {
      baseline: memoryStats.baseline / (1024 * 1024),
      current: memoryStats.current / (1024 * 1024),
      peak: memoryStats.peak / (1024 * 1024),
    },
  };
};

/**
 * Comprehensive hook that combines all New Architecture performance monitoring
 */
export const useComprehensiveNewArchPerformance = (config?: PerformanceConfig) => {
  const [performanceState, performanceActions] = useNewArchitecturePerformance(config);
  const crisisPerformance = useCrisisButtonPerformance();
  const breathingPerformance = useBreathingAnimationPerformance();
  const memoryMonitoring = useTherapeuticSessionMemoryMonitoring();

  const startComprehensiveMonitoring = useCallback(() => {
    performanceActions.startMonitoring();
    breathingPerformance.startFrameTracking();
    memoryMonitoring.startMemoryMonitoring();
  }, [performanceActions, breathingPerformance, memoryMonitoring]);

  const stopComprehensiveMonitoring = useCallback(() => {
    performanceActions.stopMonitoring();
    breathingPerformance.stopFrameTracking();
    memoryMonitoring.stopMemoryMonitoring();
  }, [performanceActions, breathingPerformance, memoryMonitoring]);

  const resetAllMonitoring = useCallback(() => {
    performanceActions.reset();
    crisisPerformance.resetTracking();
    breathingPerformance.resetTracking();
    memoryMonitoring.resetMemoryStats();
  }, [performanceActions, crisisPerformance, breathingPerformance, memoryMonitoring]);

  const getComprehensiveStatus = useCallback(() => {
    return {
      overall: {
        isMonitoring: performanceState.isMonitoring,
        hasIssues: performanceState.criticalIssues.length > 0 ||
                   crisisPerformance.violations > 0 ||
                   breathingPerformance.frameData.violations > 0 ||
                   memoryMonitoring.memoryStats.violations > 0,
      },
      crisis: {
        lastResponseTime: crisisPerformance.lastResponseTime,
        violations: crisisPerformance.violations,
        isWithinThreshold: crisisPerformance.isWithinThreshold,
      },
      breathing: {
        averageFPS: breathingPerformance.frameData.averageFPS,
        frameDrops: breathingPerformance.frameData.frameDrops,
        violations: breathingPerformance.frameData.violations,
        isPerformant: breathingPerformance.isPerformant,
      },
      memory: {
        growthRatio: memoryMonitoring.memoryStats.growthRatio,
        violations: memoryMonitoring.memoryStats.violations,
        isWithinLimits: memoryMonitoring.isWithinLimits,
        usageMB: memoryMonitoring.memoryUsageMB,
      },
      validation: {
        lastResult: performanceState.lastValidation,
        hasRegressions: performanceState.hasRegressions,
        criticalIssues: performanceState.criticalIssues,
        warnings: performanceState.warnings,
      },
    };
  }, [performanceState, crisisPerformance, breathingPerformance, memoryMonitoring]);

  return {
    // Individual monitoring systems
    performanceState,
    performanceActions,
    crisisPerformance,
    breathingPerformance,
    memoryMonitoring,

    // Comprehensive actions
    startComprehensiveMonitoring,
    stopComprehensiveMonitoring,
    resetAllMonitoring,
    getComprehensiveStatus,

    // Quick validation methods
    validateCrisisResponse: performanceActions.validateCrisisResponse,
    validateBreathingPerformance: performanceActions.validateBreathingPerformance,
    trackCrisisButtonPress: crisisPerformance.trackCrisisButtonPress,
    runQuickValidation: performanceActions.runQuickValidation,
    getPerformanceReport: performanceActions.getPerformanceReport,
  };
};

export default useNewArchitecturePerformance;