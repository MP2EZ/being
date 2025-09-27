/**
 * Performance Context for Being. MBCT App
 *
 * Real-time performance monitoring with therapeutic timing requirements.
 * Ensures critical therapeutic interactions meet clinical response times.
 * Integrates with TherapeuticPerformanceSystem for comprehensive monitoring.
 */

import React, { ReactNode, useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { createSafeContext } from '../utils/SafeImports';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  therapeuticPerformanceSystem,
  TherapeuticPerformanceMetrics,
  PerformanceRegression,
  useTherapeuticPerformance,
  useBreathingPerformanceMonitor as useBreathingMonitor,
  useCrisisPerformanceMonitor,
  useNavigationPerformanceMonitor,
} from '../utils/TherapeuticPerformanceSystem';

/**
 * Enhanced performance metrics for therapeutic interactions
 * Extends base metrics with therapeutic-specific measurements
 */
export interface PerformanceMetrics extends TherapeuticPerformanceMetrics {
  readonly appStartTime: number; // milliseconds
  readonly renderTime: number; // milliseconds
  readonly batteryImpact: 'low' | 'medium' | 'high';

  // Additional therapeutic metrics from TherapeuticPerformanceSystem:
  // frameRate, memoryUsage, jsThreadUsage, animationFrameDrops
  // crisisResponseTime, assessmentLoadTime, navigationTime
  // breathingCycleAccuracy, therapySessionStability, crisisReadinessScore
  // therapeuticFlowContinuity, memoryEfficiencyScore, batteryImpactScore
}

/**
 * Therapeutic timing requirements
 */
export interface TherapeuticTimingRequirements {
  readonly crisisButtonResponse: number; // max 200ms
  readonly assessmentTransition: number; // max 300ms
  readonly breathingTimerAccuracy: number; // ±50ms
  readonly checkInFlowTransition: number; // max 500ms
  readonly appLaunchTime: number; // max 2000ms
}

/**
 * Performance alert levels
 */
export type PerformanceAlertLevel = 'normal' | 'warning' | 'critical';

export interface PerformanceAlert {
  readonly id: string;
  readonly level: PerformanceAlertLevel;
  readonly metric: keyof PerformanceMetrics;
  readonly threshold: number;
  readonly actual: number;
  readonly timestamp: string;
  readonly therapeuticImpact: string;
}

/**
 * Enhanced Performance Context Interface
 * Integrates with TherapeuticPerformanceSystem for comprehensive monitoring
 */
export interface PerformanceContextValue {
  readonly metrics: PerformanceMetrics;
  readonly alerts: readonly PerformanceAlert[];
  readonly isMonitoring: boolean;
  readonly timingRequirements: TherapeuticTimingRequirements;
  readonly regressions: readonly PerformanceRegression[];
  readonly overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

  // Legacy measurement actions (maintained for compatibility)
  startMeasurement: (key: string) => void;
  endMeasurement: (key: string) => number;
  measureRender: (componentName: string, renderTime: number) => void;
  measureNavigation: (fromScreen: string, toScreen: string, duration: number) => void;

  // Enhanced therapeutic timing
  startBreathingTimer: () => string;
  checkBreathingAccuracy: (timerId: string, expectedDuration: number) => number;
  measureCrisisResponse: () => Promise<number>;

  // New therapeutic performance tracking
  trackCrisisButton: (startTime: number, context?: string) => number;
  trackBreathingFrame: (frameStartTime: number) => void;
  trackBreathingCycle: (actualDuration: number, targetDuration?: number) => void;
  trackCheckInTransition: (startTime: number, fromScreen: string, toScreen: string) => number;
  trackAssessmentLoad: (startTime: number, assessmentType: string) => number;
  trackAppLaunch: (startTime: number) => number;
  trackEmergencyProtocol: (startTime: number, protocolType: string) => number;

  // Performance optimization
  enablePerformanceMode: () => void;
  disablePerformanceMode: () => void;
  optimizeForBattery: () => void;
  optimizeForTherapeuticSession: () => void;
  optimizeForCrisisMode: () => void;

  // Monitoring control
  startRealTimeMonitoring: () => void;
  stopRealTimeMonitoring: () => { report: string; regressions: PerformanceRegression[]; recommendations: string[] };
  getRecommendations: () => string[];

  // Provider status
  readonly isReady: boolean;
  readonly error: string | null;
}

/**
 * Default therapeutic timing requirements
 */
const DEFAULT_TIMING_REQUIREMENTS: TherapeuticTimingRequirements = {
  crisisButtonResponse: 200, // 200ms max for safety
  assessmentTransition: 300, // 300ms max to maintain flow
  breathingTimerAccuracy: 50, // ±50ms for 60-second breathing
  checkInFlowTransition: 500, // 500ms max between check-in steps
  appLaunchTime: 2000, // 2 seconds max from cold start
};

/**
 * Default context value
 */
const defaultContextValue: PerformanceContextValue = {
  metrics: {
    // Legacy metrics
    appStartTime: 0,
    renderTime: 0,
    batteryImpact: 'low',

    // TherapeuticPerformanceMetrics
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
  },
  alerts: [],
  regressions: [],
  isMonitoring: false,
  overallHealth: 'excellent',
  timingRequirements: DEFAULT_TIMING_REQUIREMENTS,
  startMeasurement: () => {
    console.warn('PerformanceContext: startMeasurement called before ready');
  },
  endMeasurement: () => {
    console.warn('PerformanceContext: endMeasurement called before ready');
    return 0;
  },
  measureRender: () => {
    console.warn('PerformanceContext: measureRender called before ready');
  },
  measureNavigation: () => {
    console.warn('PerformanceContext: measureNavigation called before ready');
  },
  startBreathingTimer: () => {
    console.warn('PerformanceContext: startBreathingTimer called before ready');
    return '';
  },
  checkBreathingAccuracy: () => {
    console.warn('PerformanceContext: checkBreathingAccuracy called before ready');
    return 0;
  },
  measureCrisisResponse: async () => {
    console.warn('PerformanceContext: measureCrisisResponse called before ready');
    return 0;
  },
  enablePerformanceMode: () => {
    console.warn('PerformanceContext: enablePerformanceMode called before ready');
  },
  disablePerformanceMode: () => {
    console.warn('PerformanceContext: disablePerformanceMode called before ready');
  },
  optimizeForBattery: () => {
    console.warn('PerformanceContext: optimizeForBattery called before ready');
  },

  // New therapeutic performance tracking
  trackCrisisButton: () => {
    console.warn('PerformanceContext: trackCrisisButton called before ready');
    return 0;
  },
  trackBreathingFrame: () => {
    console.warn('PerformanceContext: trackBreathingFrame called before ready');
  },
  trackBreathingCycle: () => {
    console.warn('PerformanceContext: trackBreathingCycle called before ready');
  },
  trackCheckInTransition: () => {
    console.warn('PerformanceContext: trackCheckInTransition called before ready');
    return 0;
  },
  trackAssessmentLoad: () => {
    console.warn('PerformanceContext: trackAssessmentLoad called before ready');
    return 0;
  },
  trackAppLaunch: () => {
    console.warn('PerformanceContext: trackAppLaunch called before ready');
    return 0;
  },
  trackEmergencyProtocol: () => {
    console.warn('PerformanceContext: trackEmergencyProtocol called before ready');
    return 0;
  },

  // Enhanced optimization methods
  optimizeForTherapeuticSession: () => {
    console.warn('PerformanceContext: optimizeForTherapeuticSession called before ready');
  },
  optimizeForCrisisMode: () => {
    console.warn('PerformanceContext: optimizeForCrisisMode called before ready');
  },

  // Monitoring control
  startRealTimeMonitoring: () => {
    console.warn('PerformanceContext: startRealTimeMonitoring called before ready');
  },
  stopRealTimeMonitoring: () => {
    console.warn('PerformanceContext: stopRealTimeMonitoring called before ready');
    return { report: '', regressions: [], recommendations: [] };
  },
  getRecommendations: () => {
    console.warn('PerformanceContext: getRecommendations called before ready');
    return [];
  },

  isReady: false,
  error: null,
};

/**
 * Create safe context
 */
const {
  Provider: PerformanceContextProvider,
  useContext: usePerformanceContext,
} = createSafeContext(defaultContextValue, 'PerformanceContext');

/**
 * Performance Provider Props
 */
export interface PerformanceProviderProps {
  children: ReactNode;
  enabled?: boolean;
  enableDetailedMetrics?: boolean;
  onPerformanceAlert?: (alert: PerformanceAlert) => void;
  onError?: (error: Error) => void;
}

/**
 * Performance Provider Component
 */
export const PerformanceProvider: React.FC<PerformanceProviderProps> = ({
  children,
  enabled = true,
  enableDetailedMetrics = false,
  onPerformanceAlert,
  onError,
}) => {
  const [providerState, setProviderState] = useState({
    metrics: defaultContextValue.metrics,
    alerts: [] as PerformanceAlert[],
    regressions: [] as PerformanceRegression[],
    isMonitoring: false,
    overallHealth: 'excellent' as 'excellent' | 'good' | 'fair' | 'poor' | 'critical',
    isReady: false,
    error: null as string | null,
  });

  // Measurement storage (legacy support)
  const measurementsRef = useRef<Map<string, number>>(new Map());
  const breathingTimersRef = useRef<Map<string, number>>(new Map());

  // Integration with TherapeuticPerformanceSystem
  const therapeuticPerformance = useTherapeuticPerformance();
  const appLaunchTimeRef = useRef<number>(Date.now());

  /**
   * Generate unique ID for measurements
   */
  const generateId = useCallback((): string => {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  /**
   * Create performance alert
   */
  const createAlert = useCallback((
    level: PerformanceAlertLevel,
    metric: keyof PerformanceMetrics,
    threshold: number,
    actual: number,
    therapeuticImpact: string
  ): PerformanceAlert => {
    return {
      id: generateId(),
      level,
      metric,
      threshold,
      actual,
      timestamp: new Date().toISOString(),
      therapeuticImpact,
    };
  }, [generateId]);

  /**
   * Check performance thresholds
   */
  const checkThresholds = useCallback((metric: keyof PerformanceMetrics, value: number) => {
    const { timingRequirements } = defaultContextValue;
    let threshold: number | null = null;
    let therapeuticImpact = '';

    switch (metric) {
      case 'crisisResponseTime':
        threshold = timingRequirements.crisisButtonResponse;
        therapeuticImpact = 'Delayed crisis response may compromise user safety';
        break;
      case 'assessmentLoadTime':
        threshold = timingRequirements.assessmentTransition;
        therapeuticImpact = 'Slow assessment loading disrupts therapeutic flow';
        break;
      case 'navigationTime':
        threshold = timingRequirements.checkInFlowTransition;
        therapeuticImpact = 'Slow navigation affects user engagement';
        break;
      case 'appStartTime':
        threshold = timingRequirements.appLaunchTime;
        therapeuticImpact = 'Slow app start delays access to therapeutic tools';
        break;
    }

    if (threshold && value > threshold) {
      const level: PerformanceAlertLevel = value > threshold * 2 ? 'critical' : 'warning';
      const alert = createAlert(level, metric, threshold, value, therapeuticImpact);

      setProviderState(prev => ({
        ...prev,
        alerts: [...prev.alerts.slice(-19), alert], // Keep last 20 alerts
      }));

      onPerformanceAlert?.(alert);
    }
  }, [createAlert, onPerformanceAlert]);

  /**
   * Initialize performance monitoring and sync with therapeutic system
   */
  useEffect(() => {
    if (!enabled) {
      setProviderState(prev => ({ ...prev, isReady: true }));
      return;
    }

    const initialize = async () => {
      try {
        console.log('🏥 Initializing integrated performance monitoring');

        // Initialize therapeutic performance system
        therapeuticPerformanceSystem.initialize();

        // Start monitoring if enabled
        if (enableDetailedMetrics) {
          therapeuticPerformance.startMonitoring();
        }

        // Load saved performance data
        const savedMetrics = await AsyncStorage.getItem('being_performance_metrics');
        const legacyMetrics = savedMetrics ? JSON.parse(savedMetrics) : {};

        // Merge with therapeutic metrics
        const integratedMetrics = {
          ...defaultContextValue.metrics,
          ...legacyMetrics,
          ...therapeuticPerformance.performanceStatus.scores,
        };

        setProviderState(prev => ({
          ...prev,
          metrics: integratedMetrics,
          overallHealth: therapeuticPerformance.performanceStatus.overallHealth,
          regressions: therapeuticPerformance.performanceStatus.regressions,
          isMonitoring: true,
          isReady: true,
        }));

        // Track app launch time
        const launchTime = Date.now() - appLaunchTimeRef.current;
        therapeuticPerformance.trackAppLaunch(appLaunchTimeRef.current);

        console.log('✅ Integrated performance monitoring initialized');

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Performance initialization failed';
        setProviderState(prev => ({
          ...prev,
          error: errorMessage,
          isReady: false,
        }));
        onError?.(new Error(errorMessage));
      }
    };

    initialize();
  }, [enabled, enableDetailedMetrics, onError]);

  /**
   * Sync with therapeutic performance system
   */
  useEffect(() => {
    if (!enabled || !providerState.isReady) {
      return;
    }

    const syncWithTherapeuticSystem = () => {
      try {
        const status = therapeuticPerformance.performanceStatus;

        setProviderState(prev => ({
          ...prev,
          metrics: {
            ...prev.metrics,
            ...status.scores,
          },
          overallHealth: status.overallHealth,
          regressions: status.regressions,
        }));
      } catch (error) {
        console.warn('Failed to sync with therapeutic performance system:', error);
      }
    };

    // Sync every 2 seconds when monitoring
    const syncInterval = setInterval(syncWithTherapeuticSystem, 2000);

    return () => clearInterval(syncInterval);
  }, [enabled, providerState.isReady, therapeuticPerformance]);

  /**
   * Handle app state changes for performance optimization
   */
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('📱 App became active - resuming performance monitoring');
        if (enableDetailedMetrics && !therapeuticPerformance.isMonitoring) {
          therapeuticPerformance.startMonitoring();
        }
      } else if (nextAppState === 'background') {
        console.log('📱 App backgrounded - optimizing performance monitoring');
        // Reduce monitoring intensity in background
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [enableDetailedMetrics, therapeuticPerformance]);

  /**
   * Periodic metrics collection
   */
  useEffect(() => {
    if (!enabled || !providerState.isMonitoring) {
      return;
    }

    const collectMetrics = () => {
      try {
        // Collect memory usage (simplified)
        const memoryUsage = (performance as any)?.memory?.usedJSHeapSize / (1024 * 1024) || 0;

        setProviderState(prev => ({
          ...prev,
          metrics: {
            ...prev.metrics,
            memoryUsage,
          },
        }));

      } catch (error) {
        console.warn('Failed to collect performance metrics:', error);
      }
    };

    // Collect metrics every 30 seconds
    const interval = setInterval(collectMetrics, 30000);

    return () => clearInterval(interval);
  }, [enabled, providerState.isMonitoring]);

  /**
   * Enhanced context value implementation with therapeutic performance integration
   */
  const contextValue: PerformanceContextValue = {
    metrics: providerState.metrics,
    alerts: providerState.alerts,
    regressions: providerState.regressions,
    isMonitoring: providerState.isMonitoring,
    overallHealth: providerState.overallHealth,
    timingRequirements: DEFAULT_TIMING_REQUIREMENTS,

    startMeasurement: (key: string): void => {
      if (!enabled || !providerState.isReady) {
        return;
      }

      measurementsRef.current.set(key, performance.now());
    },

    endMeasurement: (key: string): number => {
      if (!enabled || !providerState.isReady) {
        return 0;
      }

      const startTime = measurementsRef.current.get(key);
      if (!startTime) {
        console.warn(`No measurement started for key: ${key}`);
        return 0;
      }

      const duration = performance.now() - startTime;
      measurementsRef.current.delete(key);

      // Check thresholds for specific measurements
      if (key.includes('crisis')) {
        checkThresholds('crisisResponseTime', duration);
      } else if (key.includes('assessment')) {
        checkThresholds('assessmentLoadTime', duration);
      } else if (key.includes('navigation')) {
        checkThresholds('navigationTime', duration);
      }

      return duration;
    },

    measureRender: (componentName: string, renderTime: number): void => {
      if (!enabled || !providerState.isReady) {
        return;
      }

      // Update render metrics
      setProviderState(prev => ({
        ...prev,
        metrics: {
          ...prev.metrics,
          renderTime: Math.max(prev.metrics.renderTime, renderTime),
        },
      }));

      // Check for slow renders
      if (renderTime > 100) { // 100ms threshold for renders
        const alert = createAlert(
          'warning',
          'renderTime',
          100,
          renderTime,
          `Slow render of ${componentName} may affect user experience`
        );

        setProviderState(prev => ({
          ...prev,
          alerts: [...prev.alerts.slice(-19), alert],
        }));
      }
    },

    measureNavigation: (fromScreen: string, toScreen: string, duration: number): void => {
      if (!enabled || !providerState.isReady) {
        return;
      }

      setProviderState(prev => ({
        ...prev,
        metrics: {
          ...prev.metrics,
          navigationTime: Math.max(prev.metrics.navigationTime, duration),
        },
      }));

      checkThresholds('navigationTime', duration);
    },

    startBreathingTimer: (): string => {
      if (!enabled || !providerState.isReady) {
        return '';
      }

      const timerId = generateId();
      breathingTimersRef.current.set(timerId, performance.now());
      return timerId;
    },

    checkBreathingAccuracy: (timerId: string, expectedDuration: number): number => {
      if (!enabled || !providerState.isReady) {
        return 0;
      }

      const startTime = breathingTimersRef.current.get(timerId);
      if (!startTime) {
        console.warn(`No breathing timer found for ID: ${timerId}`);
        return 0;
      }

      const actualDuration = performance.now() - startTime;
      const accuracy = Math.abs(actualDuration - expectedDuration);
      const accuracyPercentage = Math.max(0, 100 - (accuracy / expectedDuration) * 100);

      breathingTimersRef.current.delete(timerId);

      // Update breathing accuracy metrics
      setProviderState(prev => ({
        ...prev,
        metrics: {
          ...prev.metrics,
          breathingAccuracy: Math.min(prev.metrics.breathingAccuracy, accuracyPercentage),
        },
      }));

      // Alert for poor breathing timer accuracy
      if (accuracy > DEFAULT_TIMING_REQUIREMENTS.breathingTimerAccuracy) {
        const alert = createAlert(
          'warning',
          'breathingAccuracy',
          DEFAULT_TIMING_REQUIREMENTS.breathingTimerAccuracy,
          accuracy,
          'Breathing timer inaccuracy may affect therapeutic effectiveness'
        );

        setProviderState(prev => ({
          ...prev,
          alerts: [...prev.alerts.slice(-19), alert],
        }));
      }

      return accuracyPercentage;
    },

    measureCrisisResponse: async (): Promise<number> => {
      if (!enabled || !providerState.isReady) {
        return 0;
      }

      const startTime = performance.now();

      // Simulate crisis button response measurement
      await new Promise(resolve => setTimeout(resolve, 0));

      const responseTime = performance.now() - startTime;

      setProviderState(prev => ({
        ...prev,
        metrics: {
          ...prev.metrics,
          crisisResponseTime: Math.max(prev.metrics.crisisResponseTime, responseTime),
        },
      }));

      checkThresholds('crisisResponseTime', responseTime);

      return responseTime;
    },

    enablePerformanceMode: (): void => {
      setProviderState(prev => ({
        ...prev,
        isMonitoring: true,
      }));
    },

    disablePerformanceMode: (): void => {
      setProviderState(prev => ({
        ...prev,
        isMonitoring: false,
      }));
    },

    optimizeForBattery: (): void => {
      setProviderState(prev => ({
        ...prev,
        metrics: {
          ...prev.metrics,
          batteryImpact: 'low',
        },
        isMonitoring: false, // Reduce monitoring for battery optimization
      }));
    },

    // New therapeutic performance tracking methods
    trackCrisisButton: (startTime: number, context?: string): number => {
      if (!enabled || !providerState.isReady) return 0;
      return therapeuticPerformance.trackCrisisButton(startTime, context);
    },

    trackBreathingFrame: (frameStartTime: number): void => {
      if (!enabled || !providerState.isReady) return;
      therapeuticPerformance.trackBreathingFrame(frameStartTime);
    },

    trackBreathingCycle: (actualDuration: number, targetDuration?: number): void => {
      if (!enabled || !providerState.isReady) return;
      therapeuticPerformance.trackBreathingCycle(actualDuration, targetDuration);
    },

    trackCheckInTransition: (startTime: number, fromScreen: string, toScreen: string): number => {
      if (!enabled || !providerState.isReady) return 0;
      return therapeuticPerformance.trackCheckInTransition(startTime, fromScreen, toScreen);
    },

    trackAssessmentLoad: (startTime: number, assessmentType: string): number => {
      if (!enabled || !providerState.isReady) return 0;
      return therapeuticPerformance.trackAssessmentLoad(startTime, assessmentType);
    },

    trackAppLaunch: (startTime: number): number => {
      if (!enabled || !providerState.isReady) return 0;
      return therapeuticPerformance.trackAppLaunch(startTime);
    },

    trackEmergencyProtocol: (startTime: number, protocolType: string): number => {
      if (!enabled || !providerState.isReady) return 0;
      return therapeuticPerformance.trackEmergencyProtocol(startTime, protocolType);
    },

    // Enhanced optimization methods
    optimizeForTherapeuticSession: (): void => {
      if (!enabled || !providerState.isReady) return;
      therapeuticPerformance.optimizeForTherapeuticSession();
    },

    optimizeForCrisisMode: (): void => {
      if (!enabled || !providerState.isReady) return;
      therapeuticPerformance.optimizeForCrisisMode();
    },

    // Monitoring control
    startRealTimeMonitoring: (): void => {
      if (!enabled || !providerState.isReady) return;
      therapeuticPerformance.startMonitoring();
      setProviderState(prev => ({ ...prev, isMonitoring: true }));
    },

    stopRealTimeMonitoring: () => {
      if (!enabled || !providerState.isReady) {
        return { report: '', regressions: [], recommendations: [] };
      }
      const result = therapeuticPerformance.stopMonitoring();
      setProviderState(prev => ({ ...prev, isMonitoring: false }));
      return result;
    },

    getRecommendations: (): string[] => {
      if (!enabled || !providerState.isReady) return [];
      return therapeuticPerformance.getRecommendations();
    },

    isReady: enabled && providerState.isReady,
    error: providerState.error,
  };

  return (
    <PerformanceContextProvider value={contextValue}>
      {children}
    </PerformanceContextProvider>
  );
};

/**
 * Hook to use Performance Context
 */
export const usePerformance = () => {
  const context = usePerformanceContext();

  if (!context) {
    console.warn('usePerformance called outside PerformanceProvider');
    return defaultContextValue;
  }

  return context;
};

/**
 * Hook for therapeutic timing measurement
 */
export const useTherapeuticTiming = () => {
  const {
    startMeasurement,
    endMeasurement,
    startBreathingTimer,
    checkBreathingAccuracy,
    measureCrisisResponse,
    timingRequirements,
  } = usePerformance();

  return {
    measureTherapeuticAction: (actionName: string) => {
      const key = `therapeutic_${actionName}`;
      startMeasurement(key);
      return () => endMeasurement(key);
    },
    measureBreathing: (expectedDuration: number) => {
      const timerId = startBreathingTimer();
      return () => checkBreathingAccuracy(timerId, expectedDuration);
    },
    measureCrisisResponse,
    timingRequirements,
  };
};

/**
 * Hook for performance optimization
 */
export const usePerformanceOptimization = () => {
  const {
    metrics,
    alerts,
    regressions,
    overallHealth,
    enablePerformanceMode,
    disablePerformanceMode,
    optimizeForBattery,
    optimizeForTherapeuticSession,
    optimizeForCrisisMode,
    getRecommendations,
  } = usePerformance();

  const hasWarnings = alerts.some(alert => alert.level === 'warning');
  const hasCriticalIssues = alerts.some(alert => alert.level === 'critical');
  const hasRegressions = regressions.length > 0;

  return {
    metrics,
    alerts,
    regressions,
    overallHealth,
    hasWarnings,
    hasCriticalIssues,
    hasRegressions,
    enablePerformanceMode,
    disablePerformanceMode,
    optimizeForBattery,
    optimizeForTherapeuticSession,
    optimizeForCrisisMode,
    getRecommendations,
  };
};

/**
 * Hook for therapeutic breathing performance monitoring
 */
export const useBreathingPerformanceContext = () => {
  const { trackBreathingFrame, trackBreathingCycle, metrics } = usePerformance();
  const frameRef = useRef<number>();
  const cycleStartRef = useRef<number>();

  const startBreathingSession = useCallback(() => {
    cycleStartRef.current = Date.now();

    const trackFrame = () => {
      const frameStart = performance.now();
      trackBreathingFrame(frameStart);
      frameRef.current = requestAnimationFrame(trackFrame);
    };

    frameRef.current = requestAnimationFrame(trackFrame);
  }, [trackBreathingFrame]);

  const endBreathingSession = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = undefined;
    }

    if (cycleStartRef.current) {
      const cycleDuration = Date.now() - cycleStartRef.current;
      trackBreathingCycle(cycleDuration);
      cycleStartRef.current = undefined;
    }
  }, [trackBreathingCycle]);

  useEffect(() => {
    return () => {
      endBreathingSession();
    };
  }, [endBreathingSession]);

  return {
    startBreathingSession,
    endBreathingSession,
    frameRate: metrics.frameRate,
    breathingAccuracy: metrics.breathingCycleAccuracy,
    sessionStability: metrics.therapySessionStability,
    isBreathingOptimal: metrics.frameRate >= 58 && metrics.therapySessionStability > 80,
  };
};

/**
 * Hook for crisis performance monitoring in the context
 */
export const useCrisisPerformanceContext = () => {
  const { trackCrisisButton, trackEmergencyProtocol, metrics, optimizeForCrisisMode } = usePerformance();

  const trackCrisisButtonPress = useCallback(() => {
    const startTime = performance.now();
    return () => trackCrisisButton(startTime, 'button_press');
  }, [trackCrisisButton]);

  const trackCrisisProtocol = useCallback((protocolType: string) => {
    const startTime = performance.now();
    return () => trackEmergencyProtocol(startTime, protocolType);
  }, [trackEmergencyProtocol]);

  const enableCrisisMode = useCallback(() => {
    optimizeForCrisisMode();
  }, [optimizeForCrisisMode]);

  return {
    trackCrisisButtonPress,
    trackCrisisProtocol,
    enableCrisisMode,
    crisisReadiness: metrics.crisisReadinessScore,
    isCrisisReady: metrics.crisisReadinessScore > 80,
    responseTime: metrics.crisisResponseTime,
    isResponseTimeOptimal: metrics.crisisResponseTime > 0 && metrics.crisisResponseTime < 200,
  };
};

/**
 * Hook for navigation performance monitoring in the context
 */
export const useNavigationPerformanceContext = () => {
  const { trackCheckInTransition, trackAssessmentLoad, metrics } = usePerformance();

  const trackScreenTransition = useCallback((fromScreen: string, toScreen: string) => {
    const startTime = performance.now();
    return () => trackCheckInTransition(startTime, fromScreen, toScreen);
  }, [trackCheckInTransition]);

  const trackAssessmentScreen = useCallback((assessmentType: string) => {
    const startTime = performance.now();
    return () => trackAssessmentLoad(startTime, assessmentType);
  }, [trackAssessmentLoad]);

  return {
    trackScreenTransition,
    trackAssessmentScreen,
    navigationTime: metrics.navigationTime,
    assessmentLoadTime: metrics.assessmentLoadTime,
    flowContinuity: metrics.therapeuticFlowContinuity,
    isNavigationOptimal: metrics.navigationTime > 0 && metrics.navigationTime < 500,
    isAssessmentOptimal: metrics.assessmentLoadTime > 0 && metrics.assessmentLoadTime < 300,
  };
};

/**
 * Hook for real-time performance monitoring controls
 */
export const usePerformanceMonitoringControl = () => {
  const {
    isMonitoring,
    startRealTimeMonitoring,
    stopRealTimeMonitoring,
    getRecommendations,
    overallHealth,
    regressions,
  } = usePerformance();

  const generatePerformanceReport = useCallback(() => {
    const recommendations = getRecommendations();
    const currentHealth = overallHealth;
    const currentRegressions = regressions;

    return {
      overallHealth: currentHealth,
      recommendations,
      regressions: currentRegressions,
      timestamp: new Date().toISOString(),
      summary: `Performance health: ${currentHealth}. ${recommendations.length} recommendations, ${currentRegressions.length} regressions detected.`,
    };
  }, [getRecommendations, overallHealth, regressions]);

  return {
    isMonitoring,
    startMonitoring: startRealTimeMonitoring,
    stopMonitoring: stopRealTimeMonitoring,
    generatePerformanceReport,
    overallHealth,
    hasIssues: regressions.length > 0 || overallHealth === 'poor' || overallHealth === 'critical',
  };
};

export default PerformanceProvider;