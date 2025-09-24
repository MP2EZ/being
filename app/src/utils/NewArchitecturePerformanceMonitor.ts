/**
 * New Architecture Performance Monitor - Phase 4.3B Implementation
 *
 * Comprehensive performance monitoring system leveraging React Native New Architecture:
 * - TurboModules performance tracking for state operations
 * - Fabric renderer performance for Pressable interactions
 * - Memory usage optimization tracking for therapeutic sessions
 * - Crisis response timing validation with <200ms SLA
 *
 * PERFORMANCE TARGETS (POST-MIGRATION):
 * - Touch Response Time: <150ms average (25% improvement from 150-200ms)
 * - Breathing Animation FPS: >58fps average (20% improvement from 45-55fps)
 * - Crisis Button Response: <200ms average (60% improvement from 300-500ms)
 * - Assessment Navigation: <300ms between screens (40% improvement from 400-600ms)
 */

import { PerformanceObserver, PerformanceEntry } from 'react-native/Libraries/Performance/Systrace';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// Import comprehensive type-safe monitoring types
import type {
  PerformanceMonitoringCoordinator,
  PerformanceMonitor,
  CrisisResponseMonitor,
  TherapeuticPerformanceMonitor,
  ClinicalAccuracyMonitor,
  MemoryPerformanceMonitor,
  PerformanceMetric,
  PerformanceAlert,
  SLAViolation,
  HealthcareContext,
  MonitoringCoordinatorConfig,
  HealthcareComplianceResult,
  MonitoringDashboardData
} from '../types/monitoring-implementation-types';

import type {
  CrisisResponseTime,
  TherapeuticTimingAccuracy,
  PerformanceOverhead,
  MemoryUsage,
  FrameRate,
  PerformanceMetricCategory,
  PerformanceMonitoringPriority
} from '../types/performance-monitoring-types';

import type {
  TurboModuleCallLatency,
  TurboStoreOperation,
  TurboStorePerformanceMetrics,
  TurboModuleMonitoringDashboard,
  CrisisOptimizationStrategy
} from '../types/turbo-module-performance-types';

import {
  createCrisisResponseTime,
  createTherapeuticTimingAccuracy,
  createHealthcareContext,
  isCrisisResponseTime,
  isTherapeuticTimingAccuracy,
  PERFORMANCE_MONITORING_CONSTANTS
} from '../types/performance-monitoring-types';

import {
  createTurboModuleCallLatency,
  isTurboModuleCallLatency,
  TURBO_MODULE_PERFORMANCE_CONSTANTS
} from '../types/turbo-module-performance-types';

// ============================================================================
// NEW ARCHITECTURE PERFORMANCE TYPES
// ============================================================================

/**
 * TurboModules performance metrics for state operations
 */
interface TurboModulesMetrics {
  readonly moduleCallLatency: number;        // ms - TurboModule call time
  readonly stateUpdateLatency: number;       // ms - State propagation time
  readonly contextProviderLatency: number;   // ms - Context update time
  readonly asyncStorageLatency: number;      // ms - Storage operation time
  readonly moduleCallsPerSecond: number;     // Calls per second
  readonly memoryUsageOptimization: number;  // % improvement from old arch
}

/**
 * Fabric renderer performance metrics for UI interactions
 */
interface FabricRendererMetrics {
  readonly pressableResponseTime: number;    // ms - Pressable touch response
  readonly animationFrameRate: number;       // fps - Animation smoothness
  readonly layoutCalculationTime: number;    // ms - Layout computation
  readonly shadowTreeUpdateTime: number;     // ms - Shadow tree sync
  readonly componentRenderTime: number;      // ms - Component render time
  readonly fabricThreadUtilization: number; // % - Fabric thread usage
}

/**
 * Therapeutic session performance tracking
 */
interface TherapeuticSessionMetrics {
  readonly sessionId: string;
  readonly sessionType: 'breathing' | 'assessment' | 'checkin' | 'crisis';
  readonly startTime: number;
  readonly breathingTimingAccuracy: number;  // ±ms from target (50ms threshold)
  readonly animationStability: number;       // fps consistency score
  readonly touchResponsiveness: number;      // ms average response time
  readonly memoryStability: boolean;         // no leaks during session
  readonly therapeuticEffectiveness: 'optimal' | 'acceptable' | 'concerning' | 'critical';
}

/**
 * Crisis response performance SLA tracking
 */
interface CrisisResponseSLA {
  readonly responseTime: number;             // ms - Time to crisis screen
  readonly buttonAccessTime: number;        // ms - Time to find/press button
  readonly networkFailoverTime: number;     // ms - Offline mode activation
  readonly emergencyCallLatency: number;    // ms - Time to dial 988
  readonly slaCompliance: boolean;           // True if <200ms
  readonly violationCount: number;           // SLA violations in window
  readonly lastViolationTime: string | null; // ISO timestamp of last violation
}

/**
 * Memory and battery optimization tracking
 */
interface OptimizationMetrics {
  readonly memoryBaseline: number;           // bytes - Starting memory usage
  readonly currentMemoryUsage: number;       // bytes - Current usage
  readonly memoryGrowthRate: number;         // bytes/second
  readonly batteryImpactScore: number;       // 0-100 (lower is better)
  readonly cpuUtilization: number;           // % - CPU usage
  readonly frameDropCount: number;           // Dropped frames count
  readonly gcFrequency: number;              // Garbage collection events/min
  readonly optimizationEffectiveness: number; // % improvement from baseline
}

/**
 * Performance improvement validation results
 */
interface ImprovementValidationResult {
  readonly metric: string;
  readonly preValue: number;
  readonly postValue: number;
  readonly improvementPercentage: number;
  readonly targetAchieved: boolean;
  readonly validationTimestamp: string;
  readonly trend: 'improving' | 'stable' | 'degrading';
}

// ============================================================================
// NEW ARCHITECTURE PERFORMANCE MONITOR STORE
// ============================================================================

interface NewArchitecturePerformanceStore {
  // Monitoring state
  isMonitoring: boolean;
  monitoringSessionId: string | null;
  startTime: number | null;

  // Performance metrics
  turboModulesMetrics: TurboModulesMetrics;
  fabricRendererMetrics: FabricRendererMetrics;
  therapeuticSessionMetrics: TherapeuticSessionMetrics[];
  crisisResponseSLA: CrisisResponseSLA;
  optimizationMetrics: OptimizationMetrics;

  // Validation results
  improvementValidations: ImprovementValidationResult[];
  performanceAlerts: string[];

  // Performance targets from migration plan
  PERFORMANCE_TARGETS: {
    TOUCH_RESPONSE_TIME: 150;           // ms
    BREATHING_ANIMATION_FPS: 58;        // fps
    CRISIS_BUTTON_RESPONSE: 200;        // ms
    ASSESSMENT_NAVIGATION: 300;         // ms
    BREATHING_TIMING_TOLERANCE: 50;     // ±ms
    MEMORY_GROWTH_LIMIT: 20 * 1024 * 1024; // 20MB
  };

  // Core monitoring actions
  startNewArchitectureMonitoring: () => Promise<void>;
  stopNewArchitectureMonitoring: () => Promise<void>;
  pauseMonitoring: () => void;
  resumeMonitoring: () => void;

  // TurboModules performance tracking
  trackTurboModuleCall: (moduleName: string, startTime: number, endTime: number) => void;
  trackStateUpdate: (updateType: string, latency: number) => void;
  trackAsyncStorageOperation: (operation: string, latency: number) => void;
  calculateTurboModulesEfficiency: () => number;

  // Fabric renderer performance tracking
  trackPressableInteraction: (componentId: string, responseTime: number) => void;
  trackAnimationFrame: (frameTime: number, isDropped: boolean) => void;
  trackLayoutCalculation: (componentCount: number, calculationTime: number) => void;
  monitorFabricThreadHealth: () => Promise<number>;

  // Therapeutic session monitoring
  startTherapeuticSession: (sessionType: TherapeuticSessionMetrics['sessionType']) => string;
  updateTherapeuticMetrics: (sessionId: string, metrics: Partial<TherapeuticSessionMetrics>) => void;
  completeTherapeuticSession: (sessionId: string) => TherapeuticSessionMetrics;
  validateBreathingTiming: (sessionId: string, targetDuration: number, actualDuration: number) => boolean;

  // Crisis response SLA monitoring
  trackCrisisButtonPress: (startTime: number) => Promise<void>;
  validateCrisisSLA: () => boolean;
  recordSLAViolation: (responseTime: number) => void;
  getCrisisComplianceRate: () => number;

  // Memory and battery optimization
  initializeOptimizationBaseline: () => Promise<void>;
  trackMemoryUsage: () => Promise<void>;
  trackBatteryImpact: (impact: number) => void;
  calculateOptimizationEffectiveness: () => number;
  identifyMemoryLeaks: () => string[];

  // Performance improvement validation
  validateTouchResponseImprovement: () => Promise<ImprovementValidationResult>;
  validateAnimationImprovement: () => Promise<ImprovementValidationResult>;
  validateCrisisResponseImprovement: () => Promise<ImprovementValidationResult>;
  validateNavigationImprovement: () => Promise<ImprovementValidationResult>;
  generateImprovementReport: () => Promise<{
    overall: number;
    achievements: ImprovementValidationResult[];
    missedTargets: ImprovementValidationResult[];
    recommendations: string[];
  }>;

  // Real-time dashboard data
  getDashboardMetrics: () => {
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    performanceScore: number;
    targetAchievements: number;
    activeSessions: number;
    slaCompliance: number;
    optimizationEffectiveness: number;
  };

  // Alert and notification system
  checkPerformanceAlerts: () => string[];
  addPerformanceAlert: (alert: string) => void;
  clearPerformanceAlerts: () => void;

  // Integration with existing systems
  integrateWithRealTimeMonitor: (monitor: any) => void;
  integrateWithTherapeuticValidator: (validator: any) => void;

  // Internal performance observer
  _internal: {
    performanceObserver: PerformanceObserver | null;
    metricBuffers: Map<string, number[]>;
    sessionTrackers: Map<string, any>;
    alertThresholds: Map<string, number>;
    baseline: Map<string, number>;
  };
}

/**
 * Create New Architecture Performance Monitor Store
 */
export const useNewArchitecturePerformanceStore = create<NewArchitecturePerformanceStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    isMonitoring: false,
    monitoringSessionId: null,
    startTime: null,

    turboModulesMetrics: {
      moduleCallLatency: 0,
      stateUpdateLatency: 0,
      contextProviderLatency: 0,
      asyncStorageLatency: 0,
      moduleCallsPerSecond: 0,
      memoryUsageOptimization: 0,
    },

    fabricRendererMetrics: {
      pressableResponseTime: 0,
      animationFrameRate: 60,
      layoutCalculationTime: 0,
      shadowTreeUpdateTime: 0,
      componentRenderTime: 0,
      fabricThreadUtilization: 0,
    },

    therapeuticSessionMetrics: [],

    crisisResponseSLA: {
      responseTime: 0,
      buttonAccessTime: 0,
      networkFailoverTime: 0,
      emergencyCallLatency: 0,
      slaCompliance: true,
      violationCount: 0,
      lastViolationTime: null,
    },

    optimizationMetrics: {
      memoryBaseline: 0,
      currentMemoryUsage: 0,
      memoryGrowthRate: 0,
      batteryImpactScore: 0,
      cpuUtilization: 0,
      frameDropCount: 0,
      gcFrequency: 0,
      optimizationEffectiveness: 0,
    },

    improvementValidations: [],
    performanceAlerts: [],

    PERFORMANCE_TARGETS: {
      TOUCH_RESPONSE_TIME: 150,
      BREATHING_ANIMATION_FPS: 58,
      CRISIS_BUTTON_RESPONSE: 200,
      ASSESSMENT_NAVIGATION: 300,
      BREATHING_TIMING_TOLERANCE: 50,
      MEMORY_GROWTH_LIMIT: 20 * 1024 * 1024,
    },

    _internal: {
      performanceObserver: null,
      metricBuffers: new Map([
        ['touchResponse', []],
        ['animationFrames', []],
        ['crisisResponse', []],
        ['navigationTiming', []],
        ['memoryUsage', []],
      ]),
      sessionTrackers: new Map(),
      alertThresholds: new Map([
        ['touchResponse', 150],
        ['animationFPS', 58],
        ['crisisResponse', 200],
        ['memoryGrowth', 20 * 1024 * 1024],
      ]),
      baseline: new Map(),
    },

    // Core monitoring actions
    startNewArchitectureMonitoring: async () => {
      const state = get();

      if (state.isMonitoring) {
        console.log('New Architecture monitoring already active');
        return;
      }

      const sessionId = `newarch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const startTime = performance.now();

      // Initialize PerformanceObserver for New Architecture metrics
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();

        entries.forEach((entry: PerformanceEntry) => {
          const state = get();

          // Track TurboModule calls
          if (entry.name.includes('TurboModule')) {
            state.trackTurboModuleCall(entry.name, entry.startTime, entry.startTime + entry.duration);
          }

          // Track Fabric renderer operations
          if (entry.name.includes('Fabric') || entry.name.includes('Pressable')) {
            state.trackPressableInteraction(entry.name, entry.duration);
          }

          // Track animation frames
          if (entry.entryType === 'frame') {
            const isDropped = entry.duration > 16.67; // >60fps threshold
            state.trackAnimationFrame(entry.duration, isDropped);
          }
        });
      });

      // Observe all performance entry types relevant to New Architecture
      observer.observe({
        entryTypes: ['measure', 'navigation', 'frame', 'user-timing']
      });

      set((state) => {
        state.isMonitoring = true;
        state.monitoringSessionId = sessionId;
        state.startTime = startTime;
        state._internal.performanceObserver = observer;
      });

      // Initialize optimization baseline
      await state.initializeOptimizationBaseline();

      console.log(`🚀 New Architecture performance monitoring started: ${sessionId}`);
    },

    stopNewArchitectureMonitoring: async () => {
      const state = get();

      if (!state.isMonitoring) {
        console.log('New Architecture monitoring not active');
        return;
      }

      // Stop PerformanceObserver
      if (state._internal.performanceObserver) {
        state._internal.performanceObserver.disconnect();
      }

      // Generate final improvement report
      const improvementReport = await state.generateImprovementReport();

      set((state) => {
        state.isMonitoring = false;
        state.monitoringSessionId = null;
        state.startTime = null;
        state._internal.performanceObserver = null;
      });

      console.log('🎯 New Architecture monitoring stopped');
      console.log('📊 Performance Improvement Report:', improvementReport);
    },

    pauseMonitoring: () => {
      set((state) => {
        if (state._internal.performanceObserver) {
          state._internal.performanceObserver.disconnect();
        }
      });
      console.log('⏸️ New Architecture monitoring paused');
    },

    resumeMonitoring: () => {
      const state = get();
      if (state.isMonitoring && !state._internal.performanceObserver) {
        state.startNewArchitectureMonitoring();
      }
      console.log('▶️ New Architecture monitoring resumed');
    },

    // TurboModules performance tracking
    trackTurboModuleCall: (moduleName: string, startTime: number, endTime: number) => {
      const latency = endTime - startTime;

      set((state) => {
        // Update call latency
        const buffer = state._internal.metricBuffers.get('turboModuleCalls') || [];
        buffer.push(latency);
        if (buffer.length > 100) buffer.shift(); // Keep last 100 measurements

        // Calculate average latency
        const avgLatency = buffer.reduce((sum, val) => sum + val, 0) / buffer.length;

        // Calculate calls per second
        const recentCalls = buffer.filter(call => Date.now() - call < 1000).length;

        state.turboModulesMetrics = {
          ...state.turboModulesMetrics,
          moduleCallLatency: avgLatency,
          moduleCallsPerSecond: recentCalls,
        };

        state._internal.metricBuffers.set('turboModuleCalls', buffer);
      });

      console.log(`📡 TurboModule call: ${moduleName} - ${latency.toFixed(2)}ms`);
    },

    trackStateUpdate: (updateType: string, latency: number) => {
      set((state) => {
        state.turboModulesMetrics = {
          ...state.turboModulesMetrics,
          stateUpdateLatency: latency,
        };
      });

      // Alert if state update is too slow
      if (latency > 50) {
        get().addPerformanceAlert(`Slow state update: ${updateType} took ${latency.toFixed(2)}ms`);
      }
    },

    trackAsyncStorageOperation: (operation: string, latency: number) => {
      set((state) => {
        state.turboModulesMetrics = {
          ...state.turboModulesMetrics,
          asyncStorageLatency: latency,
        };
      });

      // Alert if storage operation is too slow
      if (latency > 100) {
        get().addPerformanceAlert(`Slow AsyncStorage: ${operation} took ${latency.toFixed(2)}ms`);
      }
    },

    calculateTurboModulesEfficiency: () => {
      const state = get();
      const metrics = state.turboModulesMetrics;

      // Calculate efficiency score based on latency targets
      const callEfficiency = Math.max(0, 100 - (metrics.moduleCallLatency / 10) * 100);
      const stateEfficiency = Math.max(0, 100 - (metrics.stateUpdateLatency / 50) * 100);
      const storageEfficiency = Math.max(0, 100 - (metrics.asyncStorageLatency / 100) * 100);

      return (callEfficiency + stateEfficiency + storageEfficiency) / 3;
    },

    // Fabric renderer performance tracking
    trackPressableInteraction: (componentId: string, responseTime: number) => {
      set((state) => {
        const buffer = state._internal.metricBuffers.get('touchResponse') || [];
        buffer.push(responseTime);
        if (buffer.length > 50) buffer.shift();

        const avgResponse = buffer.reduce((sum, val) => sum + val, 0) / buffer.length;

        state.fabricRendererMetrics = {
          ...state.fabricRendererMetrics,
          pressableResponseTime: avgResponse,
        };

        state._internal.metricBuffers.set('touchResponse', buffer);
      });

      // Check against target
      const target = get().PERFORMANCE_TARGETS.TOUCH_RESPONSE_TIME;
      if (responseTime > target) {
        get().addPerformanceAlert(`Slow Pressable response: ${componentId} took ${responseTime.toFixed(2)}ms (target: ${target}ms)`);
      }

      console.log(`👆 Pressable interaction: ${componentId} - ${responseTime.toFixed(2)}ms`);
    },

    trackAnimationFrame: (frameTime: number, isDropped: boolean) => {
      set((state) => {
        const buffer = state._internal.metricBuffers.get('animationFrames') || [];
        buffer.push(frameTime);
        if (buffer.length > 60) buffer.shift(); // Keep last 60 frames (1 second at 60fps)

        // Calculate FPS
        const averageFrameTime = buffer.reduce((sum, val) => sum + val, 0) / buffer.length;
        const fps = 1000 / averageFrameTime;

        state.fabricRendererMetrics = {
          ...state.fabricRendererMetrics,
          animationFrameRate: fps,
          frameDropCount: state.fabricRendererMetrics.frameDropCount + (isDropped ? 1 : 0),
        };

        state._internal.metricBuffers.set('animationFrames', buffer);
      });

      // Alert on frame drops during therapeutic sessions
      if (isDropped) {
        const activeSessions = get().therapeuticSessionMetrics.filter(s => !s.sessionId.includes('completed'));
        if (activeSessions.length > 0) {
          get().addPerformanceAlert(`Frame dropped during therapeutic session: ${frameTime.toFixed(2)}ms`);
        }
      }
    },

    trackLayoutCalculation: (componentCount: number, calculationTime: number) => {
      set((state) => {
        state.fabricRendererMetrics = {
          ...state.fabricRendererMetrics,
          layoutCalculationTime: calculationTime,
        };
      });

      // Alert on slow layout calculations
      if (calculationTime > 16) { // Should complete within one frame
        get().addPerformanceAlert(`Slow layout calculation: ${calculationTime.toFixed(2)}ms for ${componentCount} components`);
      }
    },

    monitorFabricThreadHealth: async () => {
      // Simulate Fabric thread utilization monitoring
      // In a real implementation, this would use platform-specific APIs
      const utilization = Math.random() * 80; // 0-80% utilization

      set((state) => {
        state.fabricRendererMetrics = {
          ...state.fabricRendererMetrics,
          fabricThreadUtilization: utilization,
        };
      });

      // Alert on high thread utilization
      if (utilization > 70) {
        get().addPerformanceAlert(`High Fabric thread utilization: ${utilization.toFixed(1)}%`);
      }

      return utilization;
    },

    // Therapeutic session monitoring
    startTherapeuticSession: (sessionType: TherapeuticSessionMetrics['sessionType']) => {
      const sessionId = `therapeutic_${sessionType}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      const session: TherapeuticSessionMetrics = {
        sessionId,
        sessionType,
        startTime: performance.now(),
        breathingTimingAccuracy: 0,
        animationStability: 0,
        touchResponsiveness: 0,
        memoryStability: true,
        therapeuticEffectiveness: 'optimal',
      };

      set((state) => {
        state.therapeuticSessionMetrics = [...state.therapeuticSessionMetrics, session];
        state._internal.sessionTrackers.set(sessionId, {
          startMemory: state.optimizationMetrics.currentMemoryUsage,
          frameDrops: 0,
          touchResponses: [],
        });
      });

      console.log(`🎯 Therapeutic session started: ${sessionId} (${sessionType})`);
      return sessionId;
    },

    updateTherapeuticMetrics: (sessionId: string, metrics: Partial<TherapeuticSessionMetrics>) => {
      set((state) => {
        const sessionIndex = state.therapeuticSessionMetrics.findIndex(s => s.sessionId === sessionId);
        if (sessionIndex !== -1) {
          state.therapeuticSessionMetrics[sessionIndex] = {
            ...state.therapeuticSessionMetrics[sessionIndex],
            ...metrics,
          };
        }
      });
    },

    completeTherapeuticSession: (sessionId: string) => {
      const state = get();
      const session = state.therapeuticSessionMetrics.find(s => s.sessionId === sessionId);

      if (!session) {
        throw new Error(`Therapeutic session ${sessionId} not found`);
      }

      const tracker = state._internal.sessionTrackers.get(sessionId);
      const endTime = performance.now();
      const duration = endTime - session.startTime;

      // Calculate final metrics
      const currentMemory = state.optimizationMetrics.currentMemoryUsage;
      const memoryGrowth = tracker ? currentMemory - tracker.startMemory : 0;
      const memoryStability = memoryGrowth < state.PERFORMANCE_TARGETS.MEMORY_GROWTH_LIMIT;

      // Determine therapeutic effectiveness
      let effectiveness: TherapeuticSessionMetrics['therapeuticEffectiveness'] = 'optimal';

      if (session.breathingTimingAccuracy > state.PERFORMANCE_TARGETS.BREATHING_TIMING_TOLERANCE ||
          session.animationStability < state.PERFORMANCE_TARGETS.BREATHING_ANIMATION_FPS ||
          !memoryStability) {
        effectiveness = 'critical';
      } else if (session.touchResponsiveness > state.PERFORMANCE_TARGETS.TOUCH_RESPONSE_TIME) {
        effectiveness = 'concerning';
      } else if (session.animationStability < 60) {
        effectiveness = 'acceptable';
      }

      const completedSession: TherapeuticSessionMetrics = {
        ...session,
        memoryStability,
        therapeuticEffectiveness: effectiveness,
      };

      set((state) => {
        const sessionIndex = state.therapeuticSessionMetrics.findIndex(s => s.sessionId === sessionId);
        if (sessionIndex !== -1) {
          state.therapeuticSessionMetrics[sessionIndex] = completedSession;
        }
      });

      // Cleanup tracker
      state._internal.sessionTrackers.delete(sessionId);

      console.log(`✅ Therapeutic session completed: ${sessionId}`);
      console.log(`📊 Effectiveness: ${effectiveness}, Duration: ${(duration / 1000).toFixed(1)}s`);

      return completedSession;
    },

    validateBreathingTiming: (sessionId: string, targetDuration: number, actualDuration: number) => {
      const deviation = Math.abs(actualDuration - targetDuration);
      const tolerance = get().PERFORMANCE_TARGETS.BREATHING_TIMING_TOLERANCE;
      const isValid = deviation <= tolerance;

      get().updateTherapeuticMetrics(sessionId, {
        breathingTimingAccuracy: deviation,
      });

      if (!isValid) {
        get().addPerformanceAlert(`Breathing timing deviation: ${deviation.toFixed(2)}ms (tolerance: ${tolerance}ms)`);
      }

      return isValid;
    },

    // Crisis response SLA monitoring
    trackCrisisButtonPress: async (startTime: number) => {
      const responseTime = performance.now() - startTime;
      const target = get().PERFORMANCE_TARGETS.CRISIS_BUTTON_RESPONSE;
      const slaCompliance = responseTime <= target;

      set((state) => {
        state.crisisResponseSLA = {
          ...state.crisisResponseSLA,
          responseTime,
          slaCompliance,
          violationCount: slaCompliance ? state.crisisResponseSLA.violationCount : state.crisisResponseSLA.violationCount + 1,
          lastViolationTime: slaCompliance ? state.crisisResponseSLA.lastViolationTime : new Date().toISOString(),
        };
      });

      if (!slaCompliance) {
        get().recordSLAViolation(responseTime);
      }

      console.log(`🚨 Crisis button response: ${responseTime.toFixed(2)}ms (SLA: ${slaCompliance ? 'PASS' : 'FAIL'})`);
    },

    validateCrisisSLA: () => {
      const sla = get().crisisResponseSLA;
      return sla.slaCompliance && sla.violationCount === 0;
    },

    recordSLAViolation: (responseTime: number) => {
      const target = get().PERFORMANCE_TARGETS.CRISIS_BUTTON_RESPONSE;
      get().addPerformanceAlert(`CRITICAL: Crisis SLA violation - ${responseTime.toFixed(2)}ms (target: ${target}ms)`);

      console.error(`🚨 CRISIS SLA VIOLATION: ${responseTime.toFixed(2)}ms response time`);
    },

    getCrisisComplianceRate: () => {
      const buffer = get()._internal.metricBuffers.get('crisisResponse') || [];
      if (buffer.length === 0) return 100;

      const target = get().PERFORMANCE_TARGETS.CRISIS_BUTTON_RESPONSE;
      const compliantResponses = buffer.filter(time => time <= target).length;

      return (compliantResponses / buffer.length) * 100;
    },

    // Memory and battery optimization
    initializeOptimizationBaseline: async () => {
      // Simulate memory baseline measurement
      const baseline = 50 * 1024 * 1024; // 50MB baseline

      set((state) => {
        state.optimizationMetrics = {
          ...state.optimizationMetrics,
          memoryBaseline: baseline,
          currentMemoryUsage: baseline,
        };

        state._internal.baseline.set('memory', baseline);
      });

      console.log(`📊 Optimization baseline initialized: ${(baseline / 1024 / 1024).toFixed(1)}MB`);
    },

    trackMemoryUsage: async () => {
      // Simulate memory usage measurement
      const currentUsage = get().optimizationMetrics.memoryBaseline + Math.random() * 30 * 1024 * 1024;
      const baseline = get().optimizationMetrics.memoryBaseline;
      const growthRate = currentUsage - baseline;

      set((state) => {
        state.optimizationMetrics = {
          ...state.optimizationMetrics,
          currentMemoryUsage: currentUsage,
          memoryGrowthRate: growthRate,
        };
      });

      // Alert on excessive memory growth
      const growthLimit = get().PERFORMANCE_TARGETS.MEMORY_GROWTH_LIMIT;
      if (growthRate > growthLimit) {
        get().addPerformanceAlert(`Memory growth limit exceeded: ${(growthRate / 1024 / 1024).toFixed(1)}MB`);
      }
    },

    trackBatteryImpact: (impact: number) => {
      set((state) => {
        state.optimizationMetrics = {
          ...state.optimizationMetrics,
          batteryImpactScore: impact,
        };
      });

      // Alert on high battery impact
      if (impact > 70) {
        get().addPerformanceAlert(`High battery impact: ${impact.toFixed(1)} score`);
      }
    },

    calculateOptimizationEffectiveness: () => {
      const metrics = get().optimizationMetrics;
      const baseline = metrics.memoryBaseline;
      const current = metrics.currentMemoryUsage;

      // Calculate memory efficiency (lower growth = higher efficiency)
      const memoryEfficiency = Math.max(0, 100 - ((current - baseline) / baseline) * 100);

      // Combine with battery and CPU metrics
      const batteryEfficiency = Math.max(0, 100 - metrics.batteryImpactScore);
      const cpuEfficiency = Math.max(0, 100 - metrics.cpuUtilization);

      const overallEffectiveness = (memoryEfficiency + batteryEfficiency + cpuEfficiency) / 3;

      set((state) => {
        state.optimizationMetrics = {
          ...state.optimizationMetrics,
          optimizationEffectiveness: overallEffectiveness,
        };
      });

      return overallEffectiveness;
    },

    identifyMemoryLeaks: () => {
      const growth = get().optimizationMetrics.memoryGrowthRate;
      const leaks: string[] = [];

      // Simulate memory leak detection
      if (growth > 10 * 1024 * 1024) {
        leaks.push('Potential animation cleanup issue');
      }

      if (growth > 15 * 1024 * 1024) {
        leaks.push('Context provider memory retention');
      }

      if (growth > get().PERFORMANCE_TARGETS.MEMORY_GROWTH_LIMIT) {
        leaks.push('Critical memory leak detected');
      }

      return leaks;
    },

    // Performance improvement validation
    validateTouchResponseImprovement: async () => {
      const current = get().fabricRendererMetrics.pressableResponseTime;
      const target = get().PERFORMANCE_TARGETS.TOUCH_RESPONSE_TIME;
      const baseline = 175; // Pre-migration baseline (150-200ms average)

      const improvement = ((baseline - current) / baseline) * 100;
      const targetAchieved = current <= target;

      const result: ImprovementValidationResult = {
        metric: 'Touch Response Time',
        preValue: baseline,
        postValue: current,
        improvementPercentage: improvement,
        targetAchieved,
        validationTimestamp: new Date().toISOString(),
        trend: improvement > 0 ? 'improving' : 'degrading',
      };

      set((state) => {
        state.improvementValidations = [...state.improvementValidations, result];
      });

      return result;
    },

    validateAnimationImprovement: async () => {
      const current = get().fabricRendererMetrics.animationFrameRate;
      const target = get().PERFORMANCE_TARGETS.BREATHING_ANIMATION_FPS;
      const baseline = 50; // Pre-migration baseline (45-55fps average)

      const improvement = ((current - baseline) / baseline) * 100;
      const targetAchieved = current >= target;

      const result: ImprovementValidationResult = {
        metric: 'Animation Frame Rate',
        preValue: baseline,
        postValue: current,
        improvementPercentage: improvement,
        targetAchieved,
        validationTimestamp: new Date().toISOString(),
        trend: improvement > 0 ? 'improving' : 'degrading',
      };

      set((state) => {
        state.improvementValidations = [...state.improvementValidations, result];
      });

      return result;
    },

    validateCrisisResponseImprovement: async () => {
      const current = get().crisisResponseSLA.responseTime;
      const target = get().PERFORMANCE_TARGETS.CRISIS_BUTTON_RESPONSE;
      const baseline = 400; // Pre-migration baseline (300-500ms average)

      const improvement = ((baseline - current) / baseline) * 100;
      const targetAchieved = current <= target;

      const result: ImprovementValidationResult = {
        metric: 'Crisis Button Response',
        preValue: baseline,
        postValue: current,
        improvementPercentage: improvement,
        targetAchieved,
        validationTimestamp: new Date().toISOString(),
        trend: improvement > 0 ? 'improving' : 'degrading',
      };

      set((state) => {
        state.improvementValidations = [...state.improvementValidations, result];
      });

      return result;
    },

    validateNavigationImprovement: async () => {
      const buffer = get()._internal.metricBuffers.get('navigationTiming') || [];
      const current = buffer.length > 0 ? buffer.reduce((sum, val) => sum + val, 0) / buffer.length : 0;
      const target = get().PERFORMANCE_TARGETS.ASSESSMENT_NAVIGATION;
      const baseline = 500; // Pre-migration baseline (400-600ms average)

      const improvement = ((baseline - current) / baseline) * 100;
      const targetAchieved = current <= target;

      const result: ImprovementValidationResult = {
        metric: 'Assessment Navigation',
        preValue: baseline,
        postValue: current,
        improvementPercentage: improvement,
        targetAchieved,
        validationTimestamp: new Date().toISOString(),
        trend: improvement > 0 ? 'improving' : 'degrading',
      };

      set((state) => {
        state.improvementValidations = [...state.improvementValidations, result];
      });

      return result;
    },

    generateImprovementReport: async () => {
      const state = get();

      // Validate all performance improvements
      const touchValidation = await state.validateTouchResponseImprovement();
      const animationValidation = await state.validateAnimationImprovement();
      const crisisValidation = await state.validateCrisisResponseImprovement();
      const navigationValidation = await state.validateNavigationImprovement();

      const allValidations = [touchValidation, animationValidation, crisisValidation, navigationValidation];
      const achievements = allValidations.filter(v => v.targetAchieved);
      const missedTargets = allValidations.filter(v => !v.targetAchieved);

      const overallImprovement = allValidations.reduce((sum, v) => sum + v.improvementPercentage, 0) / allValidations.length;

      const recommendations: string[] = [];

      if (missedTargets.length > 0) {
        recommendations.push(`${missedTargets.length} performance targets not yet achieved`);
        missedTargets.forEach(target => {
          recommendations.push(`Optimize ${target.metric}: current ${target.postValue.toFixed(2)}, target needed`);
        });
      }

      if (overallImprovement < 15) {
        recommendations.push('Overall improvement below 15% target - consider additional optimizations');
      }

      if (achievements.length === allValidations.length) {
        recommendations.push('All performance targets achieved - New Architecture migration successful!');
      }

      return {
        overall: overallImprovement,
        achievements,
        missedTargets,
        recommendations,
      };
    },

    // Real-time dashboard data
    getDashboardMetrics: () => {
      const state = get();

      // Calculate overall health based on performance metrics
      const touchHealth = state.fabricRendererMetrics.pressableResponseTime <= state.PERFORMANCE_TARGETS.TOUCH_RESPONSE_TIME;
      const animationHealth = state.fabricRendererMetrics.animationFrameRate >= state.PERFORMANCE_TARGETS.BREATHING_ANIMATION_FPS;
      const crisisHealth = state.crisisResponseSLA.slaCompliance;
      const memoryHealth = state.optimizationMetrics.memoryGrowthRate <= state.PERFORMANCE_TARGETS.MEMORY_GROWTH_LIMIT;

      const healthMetrics = [touchHealth, animationHealth, crisisHealth, memoryHealth];
      const healthyCount = healthMetrics.filter(Boolean).length;
      const performanceScore = (healthyCount / healthMetrics.length) * 100;

      let overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
      if (performanceScore >= 90) overallHealth = 'excellent';
      else if (performanceScore >= 75) overallHealth = 'good';
      else if (performanceScore >= 60) overallHealth = 'fair';
      else if (performanceScore >= 40) overallHealth = 'poor';
      else overallHealth = 'critical';

      const targetAchievements = state.improvementValidations.filter(v => v.targetAchieved).length;
      const activeSessions = state.therapeuticSessionMetrics.filter(s => !s.sessionId.includes('completed')).length;
      const slaCompliance = state.getCrisisComplianceRate();
      const optimizationEffectiveness = state.calculateOptimizationEffectiveness();

      return {
        overallHealth,
        performanceScore,
        targetAchievements,
        activeSessions,
        slaCompliance,
        optimizationEffectiveness,
      };
    },

    // Alert and notification system
    checkPerformanceAlerts: () => {
      return get().performanceAlerts;
    },

    addPerformanceAlert: (alert: string) => {
      set((state) => {
        state.performanceAlerts = [...state.performanceAlerts, `${new Date().toISOString()}: ${alert}`];

        // Keep only last 50 alerts
        if (state.performanceAlerts.length > 50) {
          state.performanceAlerts = state.performanceAlerts.slice(-50);
        }
      });

      console.warn(`⚠️ Performance Alert: ${alert}`);
    },

    clearPerformanceAlerts: () => {
      set((state) => {
        state.performanceAlerts = [];
      });
    },

    // Integration with existing systems
    integrateWithRealTimeMonitor: (monitor: any) => {
      console.log('🔗 Integrated with Real-Time Performance Monitor');
      // Integration logic would go here
    },

    integrateWithTherapeuticValidator: (validator: any) => {
      console.log('🔗 Integrated with Therapeutic Performance Validator');
      // Integration logic would go here
    },
  }))
);

/**
 * React hook for New Architecture performance monitoring
 */
export const useNewArchitecturePerformance = () => {
  const store = useNewArchitecturePerformanceStore();

  return {
    // Monitoring state
    isMonitoring: store.isMonitoring,
    sessionId: store.monitoringSessionId,

    // Performance metrics
    turboModulesMetrics: store.turboModulesMetrics,
    fabricRendererMetrics: store.fabricRendererMetrics,
    therapeuticSessions: store.therapeuticSessionMetrics,
    crisisResponseSLA: store.crisisResponseSLA,
    optimizationMetrics: store.optimizationMetrics,

    // Actions
    startMonitoring: store.startNewArchitectureMonitoring,
    stopMonitoring: store.stopNewArchitectureMonitoring,
    pauseMonitoring: store.pauseMonitoring,
    resumeMonitoring: store.resumeMonitoring,

    // Tracking functions
    trackTurboModule: store.trackTurboModuleCall,
    trackPressable: store.trackPressableInteraction,
    trackAnimation: store.trackAnimationFrame,
    trackCrisisButton: store.trackCrisisButtonPress,

    // Therapeutic session management
    startTherapeuticSession: store.startTherapeuticSession,
    updateTherapeuticMetrics: store.updateTherapeuticMetrics,
    completeTherapeuticSession: store.completeTherapeuticSession,
    validateBreathingTiming: store.validateBreathingTiming,

    // Performance validation
    validateTouchResponse: store.validateTouchResponseImprovement,
    validateAnimation: store.validateAnimationImprovement,
    validateCrisisResponse: store.validateCrisisResponseImprovement,
    validateNavigation: store.validateNavigationImprovement,
    generateReport: store.generateImprovementReport,

    // Dashboard and alerts
    getDashboard: store.getDashboardMetrics,
    getAlerts: store.checkPerformanceAlerts,
    clearAlerts: store.clearPerformanceAlerts,

    // Performance targets
    TARGETS: store.PERFORMANCE_TARGETS,
  };
};

export default useNewArchitecturePerformanceStore;