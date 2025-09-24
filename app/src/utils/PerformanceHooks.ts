/**
 * Performance Monitoring Hooks - React integration utilities
 *
 * Provides comprehensive React hooks for monitoring and optimizing
 * therapeutic performance across all components and user flows.
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  therapeuticPerformanceSystem,
  TherapeuticPerformanceMetrics,
  PerformanceRegression,
} from './TherapeuticPerformanceSystem';
import {
  performanceRegressionDetector,
  RegressionAnalysis,
  usePerformanceRegressionDetection,
} from './PerformanceRegressionDetector';
import {
  performanceTestSuite,
  PerformanceTestSuiteResult,
  THERAPEUTIC_SCENARIOS,
} from './PerformanceTestSuite';

// ============================================================================
// PERFORMANCE MONITORING HOOKS
// ============================================================================

/**
 * Master performance monitoring hook
 * Provides comprehensive performance monitoring for the entire app
 */
export const usePerformanceMonitoring = (options?: {
  autoStart?: boolean;
  enableRegression?: boolean;
  enableTesting?: boolean;
}) => {
  const {
    autoStart = true,
    enableRegression = true,
    enableTesting = false,
  } = options || {};

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [metrics, setMetrics] = useState<TherapeuticPerformanceMetrics>({
    frameRate: 60,
    memoryUsage: 0,
    jsThreadUsage: 0,
    animationFrameDrops: 0,
    crisisResponseTime: 0,
    assessmentLoadTime: 0,
    navigationTime: 0,
    breathingCycleAccuracy: 0,
    therapySessionStability: 100,
    crisisReadinessScore: 100,
    therapeuticFlowContinuity: 100,
    memoryEfficiencyScore: 100,
    batteryImpactScore: 100,
  });

  const [overallHealth, setOverallHealth] = useState<'excellent' | 'good' | 'fair' | 'poor' | 'critical'>('excellent');
  const [regressions, setRegressions] = useState<PerformanceRegression[]>([]);
  const [lastTestResult, setLastTestResult] = useState<PerformanceTestSuiteResult | null>(null);

  // Regression detection
  const regressionDetection = usePerformanceRegressionDetection();

  // Initialize systems
  useEffect(() => {
    const initialize = async () => {
      console.log('🏥 Initializing comprehensive performance monitoring');

      try {
        // Initialize all systems
        await therapeuticPerformanceSystem.initialize();

        if (enableRegression) {
          await performanceRegressionDetector.initialize();
        }

        if (enableTesting) {
          await performanceTestSuite.initialize();
        }

        if (autoStart) {
          startMonitoring();
        }

        console.log('✅ Performance monitoring initialized');
      } catch (error) {
        console.error('❌ Failed to initialize performance monitoring:', error);
      }
    };

    initialize();
  }, [autoStart, enableRegression, enableTesting]);

  // Update metrics periodically
  useEffect(() => {
    if (!isMonitoring) return;

    const updateMetrics = () => {
      try {
        const status = therapeuticPerformanceSystem.getTherapeuticStatus();
        setMetrics(status.scores);
        setOverallHealth(status.overallHealth);
        setRegressions(status.regressions);
      } catch (error) {
        console.warn('Failed to update performance metrics:', error);
      }
    };

    const interval = setInterval(updateMetrics, 2000);
    return () => clearInterval(interval);
  }, [isMonitoring]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isMonitoring) {
        console.log('📱 App active - resuming performance monitoring');
        therapeuticPerformanceSystem.startRealTimeMonitoring();
      } else if (nextAppState === 'background') {
        console.log('📱 App backgrounded - pausing intensive monitoring');
        // Keep lightweight monitoring in background
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isMonitoring]);

  const startMonitoring = useCallback(() => {
    console.log('🔍 Starting comprehensive performance monitoring');
    therapeuticPerformanceSystem.startRealTimeMonitoring();
    setIsMonitoring(true);
  }, []);

  const stopMonitoring = useCallback(() => {
    console.log('⏹️ Stopping performance monitoring');
    const result = therapeuticPerformanceSystem.stopRealTimeMonitoring();
    setIsMonitoring(false);
    return result;
  }, []);

  const runPerformanceTest = useCallback(async () => {
    if (!enableTesting) {
      console.warn('Performance testing not enabled');
      return null;
    }

    console.log('🧪 Running performance test suite');
    const result = await performanceTestSuite.runFullTestSuite();
    setLastTestResult(result);
    return result;
  }, [enableTesting]);

  const analyzeRegressions = useCallback(async () => {
    if (!enableRegression) return null;

    return await regressionDetection.analyzeRegressions(metrics);
  }, [enableRegression, metrics, regressionDetection]);

  const getRecommendations = useCallback(() => {
    return therapeuticPerformanceSystem.getTherapeuticRecommendations();
  }, []);

  return {
    // State
    isMonitoring,
    metrics,
    overallHealth,
    regressions,
    lastTestResult,

    // Control methods
    startMonitoring,
    stopMonitoring,

    // Testing and analysis
    runPerformanceTest,
    analyzeRegressions,
    getRecommendations,

    // Status helpers
    hasIssues: regressions.length > 0 || overallHealth === 'poor' || overallHealth === 'critical',
    healthScore: regressionDetection.getHealthScore(metrics),
  };
};

/**
 * Component-level performance monitoring hook
 */
export const useComponentPerformance = (componentName: string) => {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef<number>(0);
  const mountTimeRef = useRef<number>(Date.now());

  // Track render performance
  useEffect(() => {
    const renderStart = performance.now();
    renderCountRef.current += 1;

    const renderTime = performance.now() - renderStart;
    lastRenderTimeRef.current = renderTime;

    // Track slow renders
    if (renderTime > 16) { // >16ms for 60fps
      console.warn(`⚠️ Slow render in ${componentName}: ${renderTime.toFixed(2)}ms`);
    }
  });

  // Track mount/unmount performance
  useEffect(() => {
    const mountTime = Date.now() - mountTimeRef.current;
    console.log(`📱 ${componentName} mounted in ${mountTime}ms`);

    return () => {
      const lifetimeMs = Date.now() - mountTimeRef.current;
      console.log(`📱 ${componentName} unmounted after ${lifetimeMs}ms (${renderCountRef.current} renders)`);
    };
  }, [componentName]);

  const trackAction = useCallback((actionName: string) => {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      console.log(`⚡ ${componentName}.${actionName}: ${duration.toFixed(2)}ms`);
      return duration;
    };
  }, [componentName]);

  return {
    renderCount: renderCountRef.current,
    lastRenderTime: lastRenderTimeRef.current,
    trackAction,
    componentName,
  };
};

/**
 * Crisis button performance hook
 */
export const useCrisisButtonPerformance = () => {
  const [responseTime, setResponseTime] = useState<number>(0);
  const [isOptimal, setIsOptimal] = useState<boolean>(true);

  const trackPress = useCallback(() => {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = therapeuticPerformanceSystem.trackCrisisButtonResponse(startTime, 'crisis_button');

      setResponseTime(duration);
      setIsOptimal(duration <= 200);

      if (duration > 200) {
        console.error(`🚨 Crisis button response too slow: ${duration.toFixed(2)}ms`);
      }

      return duration;
    };
  }, []);

  return {
    responseTime,
    isOptimal,
    trackPress,
    target: 200, // 200ms target
  };
};

/**
 * Breathing animation performance hook
 */
export const useBreathingAnimationPerformance = () => {
  const frameRef = useRef<number | undefined>(undefined);
  const frameCountRef = useRef<number>(0);
  const droppedFramesRef = useRef<number>(0);
  const [frameRate, setFrameRate] = useState<number>(60);
  const [isOptimal, setIsOptimal] = useState<boolean>(true);

  const startTracking = useCallback(() => {
    frameCountRef.current = 0;
    droppedFramesRef.current = 0;

    const trackFrame = () => {
      const frameStartTime = performance.now();

      therapeuticPerformanceSystem.trackBreathingAnimationFrame(frameStartTime);

      frameCountRef.current += 1;

      const frameTime = performance.now() - frameStartTime;
      const currentFps = 1000 / Math.max(frameTime, 16.67);

      setFrameRate(currentFps);
      setIsOptimal(currentFps >= 58);

      if (frameTime > 16.67 * 1.5) { // 50% tolerance
        droppedFramesRef.current += 1;
      }

      frameRef.current = requestAnimationFrame(trackFrame);
    };

    frameRef.current = requestAnimationFrame(trackFrame);
  }, []);

  const stopTracking = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = undefined;
    }

    const totalFrames = frameCountRef.current;
    const dropped = droppedFramesRef.current;
    const dropRate = totalFrames > 0 ? (dropped / totalFrames) * 100 : 0;

    console.log(`🌬️ Breathing animation: ${totalFrames} frames, ${dropped} dropped (${dropRate.toFixed(1)}%)`);

    return {
      totalFrames,
      droppedFrames: dropped,
      dropRate,
    };
  }, []);

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    frameRate,
    isOptimal,
    startTracking,
    stopTracking,
    frameCount: frameCountRef.current,
    droppedFrames: droppedFramesRef.current,
  };
};

/**
 * Navigation performance hook
 */
export const useNavigationPerformance = () => {
  const [lastTransitionTime, setLastTransitionTime] = useState<number>(0);
  const [isOptimal, setIsOptimal] = useState<boolean>(true);

  const trackTransition = useCallback((fromScreen: string, toScreen: string) => {
    const startTime = performance.now();

    return () => {
      const duration = therapeuticPerformanceSystem.trackCheckInTransition(startTime, fromScreen, toScreen);

      setLastTransitionTime(duration);
      setIsOptimal(duration <= 500);

      if (duration > 500) {
        console.warn(`⚠️ Slow navigation: ${fromScreen} → ${toScreen} (${duration.toFixed(2)}ms)`);
      }

      return duration;
    };
  }, []);

  const trackAssessmentLoad = useCallback((assessmentType: string) => {
    const startTime = performance.now();

    return () => {
      const duration = therapeuticPerformanceSystem.trackAssessmentLoad(startTime, assessmentType);

      if (duration > 300) {
        console.warn(`⚠️ Slow assessment load: ${assessmentType} (${duration.toFixed(2)}ms)`);
      }

      return duration;
    };
  }, []);

  return {
    lastTransitionTime,
    isOptimal,
    trackTransition,
    trackAssessmentLoad,
    transitionTarget: 500, // 500ms target
    assessmentTarget: 300, // 300ms target
  };
};

/**
 * Memory performance monitoring hook
 */
export const useMemoryPerformance = () => {
  const [memoryUsage, setMemoryUsage] = useState<number>(0);
  const [peakUsage, setPeakUsage] = useState<number>(0);
  const [isOptimal, setIsOptimal] = useState<boolean>(true);

  useEffect(() => {
    const checkMemory = () => {
      // Get memory usage from performance system
      const status = therapeuticPerformanceSystem.getTherapeuticStatus();
      const currentUsage = status.scores.memoryUsage;

      setMemoryUsage(currentUsage);

      if (currentUsage > peakUsage) {
        setPeakUsage(currentUsage);
      }

      const memoryMB = currentUsage / (1024 * 1024);
      setIsOptimal(memoryMB <= 100);

      if (memoryMB > 100) {
        console.warn(`⚠️ High memory usage: ${memoryMB.toFixed(2)}MB`);
      }
    };

    // Check memory every 10 seconds
    const interval = setInterval(checkMemory, 10000);
    checkMemory(); // Initial check

    return () => clearInterval(interval);
  }, [peakUsage]);

  const triggerMemoryCleanup = useCallback(() => {
    console.log('🧹 Triggering memory cleanup');

    // Request garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Force re-render to update memory readings
    setTimeout(() => {
      const status = therapeuticPerformanceSystem.getTherapeuticStatus();
      setMemoryUsage(status.scores.memoryUsage);
    }, 1000);
  }, []);

  return {
    memoryUsage,
    memoryUsageMB: memoryUsage / (1024 * 1024),
    peakUsage,
    peakUsageMB: peakUsage / (1024 * 1024),
    isOptimal,
    triggerMemoryCleanup,
    target: 100, // 100MB target
  };
};

/**
 * Therapeutic session performance hook
 */
export const useTherapeuticSessionPerformance = () => {
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [sessionMetrics, setSessionMetrics] = useState<Partial<TherapeuticPerformanceMetrics>>({});
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);

  const startSession = useCallback((sessionType: 'breathing' | 'assessment' | 'checkin') => {
    console.log(`🧘 Starting ${sessionType} session performance tracking`);

    const startTime = Date.now();
    setSessionStartTime(startTime);
    setIsSessionActive(true);

    // Start intensive monitoring for session
    therapeuticPerformanceSystem.startRealTimeMonitoring();
  }, []);

  const endSession = useCallback(() => {
    if (!isSessionActive) return null;

    console.log('🧘 Ending therapeutic session');

    const sessionDuration = Date.now() - sessionStartTime;
    const finalStatus = therapeuticPerformanceSystem.getTherapeuticStatus();

    setSessionMetrics(finalStatus.scores);
    setIsSessionActive(false);

    // Generate session report
    const report = {
      duration: sessionDuration,
      metrics: finalStatus.scores,
      overallHealth: finalStatus.overallHealth,
      regressions: finalStatus.regressions,
      recommendations: therapeuticPerformanceSystem.getTherapeuticRecommendations(),
    };

    console.log(`🧘 Session completed in ${sessionDuration}ms`, report);

    return report;
  }, [isSessionActive, sessionStartTime]);

  return {
    isSessionActive,
    sessionDuration: isSessionActive ? Date.now() - sessionStartTime : 0,
    sessionMetrics,
    startSession,
    endSession,
  };
};

/**
 * Performance regression monitoring hook
 */
export const usePerformanceRegressions = () => {
  const [regressions, setRegressions] = useState<PerformanceRegression[]>([]);
  const [lastAnalysis, setLastAnalysis] = useState<RegressionAnalysis | null>(null);

  const analyzeRegressions = useCallback(async (metrics: TherapeuticPerformanceMetrics) => {
    try {
      const analysis = await performanceRegressionDetector.detectRegressions(metrics);
      setLastAnalysis(analysis);
      setRegressions(analysis.detected);
      return analysis;
    } catch (error) {
      console.error('Failed to analyze performance regressions:', error);
      return null;
    }
  }, []);

  const recordBaseline = useCallback(async (metrics: TherapeuticPerformanceMetrics, version: string) => {
    try {
      await performanceRegressionDetector.recordBaseline(metrics, version);
      console.log(`📊 Performance baseline recorded for version ${version}`);
    } catch (error) {
      console.error('Failed to record performance baseline:', error);
    }
  }, []);

  return {
    regressions,
    lastAnalysis,
    analyzeRegressions,
    recordBaseline,
    hasRegressions: regressions.length > 0,
    criticalRegressions: regressions.filter(r => r.impact === 'critical'),
  };
};

/**
 * Performance testing hook
 */
export const usePerformanceTesting = () => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<PerformanceTestSuiteResult | null>(null);

  const runTests = useCallback(async (category?: 'critical' | 'important' | 'nice-to-have') => {
    setIsRunning(true);

    try {
      console.log(`🧪 Running ${category || 'all'} performance tests`);

      const result = category
        ? await performanceTestSuite.runTestCategory(category)
        : await performanceTestSuite.runFullTestSuite();

      setLastResult(result);

      if (!result.overallPassed) {
        console.warn('⚠️ Performance tests failed:', result.summary);
      } else {
        console.log('✅ All performance tests passed');
      }

      return result;
    } catch (error) {
      console.error('❌ Performance testing failed:', error);
      return null;
    } finally {
      setIsRunning(false);
    }
  }, []);

  const runTherapeuticScenario = useCallback(async (scenarioName: string) => {
    const scenario = THERAPEUTIC_SCENARIOS.find(s => s.name === scenarioName);

    if (!scenario) {
      console.error(`Scenario not found: ${scenarioName}`);
      return null;
    }

    setIsRunning(true);

    try {
      const result = await performanceTestSuite.runTherapeuticScenario(scenario);
      console.log(`🧘 Therapeutic scenario result:`, result);
      return result;
    } catch (error) {
      console.error('❌ Therapeutic scenario testing failed:', error);
      return null;
    } finally {
      setIsRunning(false);
    }
  }, []);

  return {
    isRunning,
    lastResult,
    runTests,
    runTherapeuticScenario,
    hasFailures: lastResult && !lastResult.overallPassed,
    criticalFailures: lastResult?.criticalFailures || 0,
  };
};

// Export all hooks
export default {
  usePerformanceMonitoring,
  useComponentPerformance,
  useCrisisButtonPerformance,
  useBreathingAnimationPerformance,
  useNavigationPerformance,
  useMemoryPerformance,
  useTherapeuticSessionPerformance,
  usePerformanceRegressions,
  usePerformanceTesting,
};