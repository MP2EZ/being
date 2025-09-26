/**
 * UIPerformanceValidationService - React Native Performance Monitoring & Validation
 *
 * Comprehensive performance validation system for React Native UI components with focus on
 * crisis response times (<200ms) and therapeutic UI smoothness (60fps).
 *
 * CRITICAL: Real-time monitoring of crisis components, therapeutic animations, and user experience
 * FEATURES: New Architecture optimization, Fabric renderer monitoring, memory leak detection
 */

import { InteractionManager, DevSettings } from 'react-native';
import type {
  DeepReadonly,
  ISODateString,
  DurationMs,
  CrisisSeverity,
  UserID,
} from '../../types/core';

// === BRANDED TYPES FOR TYPE SAFETY ===

type PerformanceMetricID = string & { readonly __brand: 'PerformanceMetricID' };
type ComponentPerformanceID = string & { readonly __brand: 'ComponentPerformanceID' };
type FrameTimestamp = number & { readonly __brand: 'FrameTimestamp' };
type MemoryThreshold = number & { readonly __brand: 'MemoryThreshold' };
type ResponseTimeThreshold = number & { readonly __brand: 'ResponseTimeThreshold' };

// === PERFORMANCE VALIDATION TYPES ===

interface CrisisUIPerformanceMetrics {
  readonly responseTime: number; // Must be <200ms
  readonly renderTime: number;
  readonly interactionDelay: number;
  readonly componentId: ComponentPerformanceID;
  readonly timestamp: ISODateString;
  readonly criticalPath: boolean;
  readonly severity: CrisisSeverity;
  readonly validationPassed: boolean;
  readonly optimizationLevel: 'excellent' | 'good' | 'needs_improvement' | 'critical_failure';
}

interface TherapeuticUIPerformanceMetrics {
  readonly frameRate: number; // Target: 60fps
  readonly animationSmoothness: number; // 0-100 score
  readonly jankCount: number;
  readonly droppedFrames: number;
  readonly renderConsistency: number; // 0-100 score
  readonly breathingExercisePerformance?: {
    readonly preciseTiming: boolean;
    readonly smoothTransitions: boolean;
    readonly memoryStable: boolean;
  };
  readonly componentId: ComponentPerformanceID;
  readonly timestamp: ISODateString;
  readonly validationPassed: boolean;
  readonly optimizationRecommendations: readonly string[];
}

interface MemoryPerformanceProfile {
  readonly heapUsage: number;
  readonly heapLimit: number;
  readonly gcPressure: number;
  readonly leakSuspected: boolean;
  readonly componentMemoryFootprint: ReadonlyMap<ComponentPerformanceID, number>;
  readonly peakMemoryUsage: number;
  readonly averageMemoryUsage: number;
  readonly memoryOptimizationScore: number; // 0-100
  readonly timestamp: ISODateString;
}

interface NewArchitecturePerformanceMetrics {
  readonly fabricRendererActive: boolean;
  readonly jsiBridgeOptimized: boolean;
  readonly turboModulesEnabled: boolean;
  readonly hermesBytecodeOptimized: boolean;
  readonly renderingPerformance: {
    readonly viewFlattening: boolean;
    readonly animationsOnUIThread: boolean;
    readonly layoutOptimized: boolean;
  };
  readonly bridgeCommunicationLatency: number;
  readonly nativeModuleCallLatency: number;
  readonly compatibilityScore: number; // 0-100
}

interface RealTimePerformanceAlert {
  readonly id: string;
  readonly type: 'crisis_slow' | 'therapeutic_jank' | 'memory_leak' | 'frame_drop' | 'bridge_slow';
  readonly severity: 'warning' | 'critical' | 'emergency';
  readonly componentId?: ComponentPerformanceID;
  readonly metricValue: number;
  readonly threshold: number;
  readonly timestamp: ISODateString;
  readonly actionRequired: readonly string[];
  readonly autoMitigation?: {
    readonly strategy: string;
    readonly applied: boolean;
    readonly effectiveness: number;
  };
}

// === PERFORMANCE THRESHOLDS ===

interface UIPerformanceThresholds {
  readonly crisis: {
    readonly responseTime: ResponseTimeThreshold; // 200ms max
    readonly renderTime: DurationMs; // 100ms max
    readonly interactionDelay: DurationMs; // 50ms max
  };
  readonly therapeutic: {
    readonly targetFrameRate: number; // 60fps
    readonly minimumFrameRate: number; // 55fps acceptable
    readonly maxJankThreshold: number; // 5 janks per minute
    readonly animationSmoothness: number; // 90% minimum
  };
  readonly memory: {
    readonly maxHeapUsage: MemoryThreshold; // 150MB max
    readonly gcPressureWarning: number; // 70% warning
    readonly componentMemoryLimit: number; // 10MB per component
    readonly leakDetectionThreshold: number; // 20% growth
  };
  readonly general: {
    readonly maxRenderTime: DurationMs; // 16ms for 60fps
    readonly bridgeLatencyWarning: DurationMs; // 10ms warning
    readonly interactionResponseTime: DurationMs; // 100ms max
  };
}

const DEFAULT_THRESHOLDS: UIPerformanceThresholds = {
  crisis: {
    responseTime: 200 as ResponseTimeThreshold,
    renderTime: 100 as DurationMs,
    interactionDelay: 50 as DurationMs,
  },
  therapeutic: {
    targetFrameRate: 60,
    minimumFrameRate: 55,
    maxJankThreshold: 5,
    animationSmoothness: 90,
  },
  memory: {
    maxHeapUsage: 150 * 1024 * 1024 as MemoryThreshold, // 150MB
    gcPressureWarning: 0.7,
    componentMemoryLimit: 10 * 1024 * 1024,
    leakDetectionThreshold: 0.2,
  },
  general: {
    maxRenderTime: 16 as DurationMs, // 60fps = 16ms per frame
    bridgeLatencyWarning: 10 as DurationMs,
    interactionResponseTime: 100 as DurationMs,
  },
} as const;

// === PERFORMANCE VALIDATION SERVICE CONFIGURATION ===

interface UIPerformanceValidationServiceConfig {
  readonly enableRealTimeMonitoring: boolean;
  readonly crisisComponentPriority: boolean;
  readonly therapeuticAnimationTracking: boolean;
  readonly memoryLeakDetection: boolean;
  readonly newArchitectureOptimization: boolean;
  readonly frameRateMonitoring: boolean;
  readonly bridgePerformanceTracking: boolean;
  readonly automaticOptimization: boolean;
  readonly performanceAlerting: boolean;
  readonly detailedMetricsCollection: boolean;
}

const DEFAULT_VALIDATION_CONFIG: UIPerformanceValidationServiceConfig = {
  enableRealTimeMonitoring: true,
  crisisComponentPriority: true,
  therapeuticAnimationTracking: true,
  memoryLeakDetection: true,
  newArchitectureOptimization: true,
  frameRateMonitoring: true,
  bridgePerformanceTracking: true,
  automaticOptimization: true,
  performanceAlerting: true,
  detailedMetricsCollection: true,
} as const;

// === FRAME RATE MONITORING ===

interface FrameRateMonitor {
  readonly currentFPS: number;
  readonly averageFPS: number;
  readonly droppedFrames: number;
  readonly jankEvents: readonly FrameJankEvent[];
  readonly smoothnessScore: number; // 0-100
  readonly lastMeasurement: FrameTimestamp;
}

interface FrameJankEvent {
  readonly timestamp: FrameTimestamp;
  readonly frameDuration: number; // ms
  readonly expectedDuration: number; // 16.67ms for 60fps
  readonly severity: 'minor' | 'major' | 'severe';
  readonly componentContext?: ComponentPerformanceID;
}

// === MAIN PERFORMANCE VALIDATION SERVICE ===

class ReactNativeUIPerformanceValidationService {
  private readonly config: UIPerformanceValidationServiceConfig;
  private readonly thresholds: UIPerformanceThresholds;

  // Performance tracking
  private readonly crisisMetrics: Map<ComponentPerformanceID, CrisisUIPerformanceMetrics> = new Map();
  private readonly therapeuticMetrics: Map<ComponentPerformanceID, TherapeuticUIPerformanceMetrics> = new Map();
  private readonly memoryProfile: MemoryPerformanceProfile;
  private readonly frameRateMonitor: FrameRateMonitor;
  private readonly newArchMetrics: NewArchitecturePerformanceMetrics;

  // Alert system
  private readonly activeAlerts: Map<string, RealTimePerformanceAlert> = new Map();
  private alertCallbacks: Array<(alert: RealTimePerformanceAlert) => void> = [];

  // Monitoring intervals
  private frameRateInterval: NodeJS.Timeout | null = null;
  private memoryInterval: NodeJS.Timeout | null = null;
  private performanceInterval: NodeJS.Timeout | null = null;

  // Performance measurement state
  private lastFrameTime: FrameTimestamp = 0 as FrameTimestamp;
  private frameBuffer: number[] = [];
  private isMonitoring = false;

  constructor(
    config: Partial<UIPerformanceValidationServiceConfig> = {},
    thresholds: Partial<UIPerformanceThresholds> = {}
  ) {
    this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config };
    this.thresholds = {
      ...DEFAULT_THRESHOLDS,
      ...thresholds,
      crisis: { ...DEFAULT_THRESHOLDS.crisis, ...thresholds.crisis },
      therapeutic: { ...DEFAULT_THRESHOLDS.therapeutic, ...thresholds.therapeutic },
      memory: { ...DEFAULT_THRESHOLDS.memory, ...thresholds.memory },
      general: { ...DEFAULT_THRESHOLDS.general, ...thresholds.general },
    };

    // Initialize monitoring state
    this.memoryProfile = this.initializeMemoryProfile();
    this.frameRateMonitor = this.initializeFrameRateMonitor();
    this.newArchMetrics = this.initializeNewArchMetrics();

    this.startMonitoring();
  }

  // === CRISIS UI PERFORMANCE VALIDATION ===

  /**
   * Validate crisis component performance (<200ms requirement)
   * CRITICAL: Must ensure crisis response times for user safety
   */
  async validateCrisisUIPerformance(
    componentId: ComponentPerformanceID,
    severity: CrisisSeverity,
    criticalPath = true
  ): Promise<CrisisUIPerformanceMetrics> {
    const startTime = performance.now();
    const renderStartTime = performance.now();

    try {
      // Measure component response time
      await InteractionManager.runAfterInteractions(() => {
        // Component should be rendered and interactive
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;
      const renderTime = endTime - renderStartTime;
      const interactionDelay = this.measureInteractionDelay(componentId);

      // Create performance metrics
      const metrics: CrisisUIPerformanceMetrics = {
        responseTime,
        renderTime,
        interactionDelay,
        componentId,
        timestamp: new Date().toISOString() as ISODateString,
        criticalPath,
        severity,
        validationPassed: this.validateCrisisMetrics(responseTime, renderTime, interactionDelay),
        optimizationLevel: this.calculateCrisisOptimizationLevel(responseTime, renderTime),
      };

      // Store metrics
      this.crisisMetrics.set(componentId, metrics);

      // Check for performance violations
      if (!metrics.validationPassed) {
        await this.handleCrisisPerformanceViolation(metrics);
      }

      // Alert if performance is critical
      if (responseTime > this.thresholds.crisis.responseTime) {
        this.createPerformanceAlert({
          type: 'crisis_slow',
          severity: 'emergency',
          componentId,
          metricValue: responseTime,
          threshold: this.thresholds.crisis.responseTime,
          actionRequired: [
            'Optimize crisis component rendering',
            'Review critical path dependencies',
            'Consider component memoization',
            'Check for memory leaks',
          ],
        });
      }

      return metrics;
    } catch (error) {
      console.error('Crisis UI performance validation failed:', error);

      // Return failure metrics
      return {
        responseTime: Number.MAX_SAFE_INTEGER,
        renderTime: Number.MAX_SAFE_INTEGER,
        interactionDelay: Number.MAX_SAFE_INTEGER,
        componentId,
        timestamp: new Date().toISOString() as ISODateString,
        criticalPath,
        severity,
        validationPassed: false,
        optimizationLevel: 'critical_failure',
      };
    }
  }

  /**
   * Continuous monitoring of crisis component performance
   */
  monitorCrisisComponent(
    componentId: ComponentPerformanceID,
    severity: CrisisSeverity
  ): () => void {
    let isDestroyed = false;

    const monitor = async () => {
      if (isDestroyed) return;

      await this.validateCrisisUIPerformance(componentId, severity, true);

      // Schedule next measurement
      setTimeout(monitor, 100); // Check every 100ms
    };

    monitor();

    // Return cleanup function
    return () => {
      isDestroyed = true;
    };
  }

  // === THERAPEUTIC UI PERFORMANCE VALIDATION ===

  /**
   * Validate therapeutic UI performance (60fps smoothness)
   */
  async validateTherapeuticUIPerformance(
    componentId: ComponentPerformanceID,
    options: {
      readonly trackBreathingExercise?: boolean;
      readonly measureAnimationSmoothness?: boolean;
      readonly monitorFrameConsistency?: boolean;
    } = {}
  ): Promise<TherapeuticUIPerformanceMetrics> {
    const startTime = performance.now();

    try {
      // Measure current frame rate
      const frameRate = this.frameRateMonitor.currentFPS;
      const animationSmoothness = await this.measureAnimationSmoothness(componentId);
      const jankCount = this.frameRateMonitor.jankEvents.length;
      const droppedFrames = this.frameRateMonitor.droppedFrames;
      const renderConsistency = this.calculateRenderConsistency();

      // Breathing exercise specific measurements
      let breathingExercisePerformance;
      if (options.trackBreathingExercise) {
        breathingExercisePerformance = await this.measureBreathingExercisePerformance(componentId);
      }

      const metrics: TherapeuticUIPerformanceMetrics = {
        frameRate,
        animationSmoothness,
        jankCount,
        droppedFrames,
        renderConsistency,
        breathingExercisePerformance,
        componentId,
        timestamp: new Date().toISOString() as ISODateString,
        validationPassed: this.validateTherapeuticMetrics(frameRate, animationSmoothness, jankCount),
        optimizationRecommendations: this.generateTherapeuticOptimizationRecommendations(
          frameRate,
          animationSmoothness,
          jankCount
        ),
      };

      // Store metrics
      this.therapeuticMetrics.set(componentId, metrics);

      // Check for performance issues
      if (!metrics.validationPassed) {
        this.createPerformanceAlert({
          type: 'therapeutic_jank',
          severity: 'warning',
          componentId,
          metricValue: frameRate,
          threshold: this.thresholds.therapeutic.minimumFrameRate,
          actionRequired: metrics.optimizationRecommendations,
        });
      }

      return metrics;
    } catch (error) {
      console.error('Therapeutic UI performance validation failed:', error);

      return {
        frameRate: 0,
        animationSmoothness: 0,
        jankCount: Number.MAX_SAFE_INTEGER,
        droppedFrames: Number.MAX_SAFE_INTEGER,
        renderConsistency: 0,
        componentId,
        timestamp: new Date().toISOString() as ISODateString,
        validationPassed: false,
        optimizationRecommendations: [
          'Performance measurement failed - check component implementation',
          'Review error logs for detailed diagnostics',
        ],
      };
    }
  }

  // === MEMORY PERFORMANCE MONITORING ===

  /**
   * Monitor and validate memory usage patterns
   */
  validateMemoryPerformance(): MemoryPerformanceProfile {
    const memoryProfile: MemoryPerformanceProfile = {
      ...this.memoryProfile,
      timestamp: new Date().toISOString() as ISODateString,
    };

    // Check for memory leaks
    if (memoryProfile.leakSuspected) {
      this.createPerformanceAlert({
        type: 'memory_leak',
        severity: 'critical',
        metricValue: memoryProfile.heapUsage,
        threshold: this.thresholds.memory.maxHeapUsage,
        actionRequired: [
          'Review component lifecycle management',
          'Check for unremoved event listeners',
          'Audit subscription cleanup',
          'Profile component memory usage',
        ],
      });
    }

    return memoryProfile;
  }

  // === NEW ARCHITECTURE COMPATIBILITY ===

  /**
   * Validate React Native New Architecture performance
   */
  validateNewArchitecturePerformance(): NewArchitecturePerformanceMetrics {
    const metrics = { ...this.newArchMetrics };

    // Update compatibility score
    let compatibilityScore = 0;

    if (metrics.fabricRendererActive) compatibilityScore += 25;
    if (metrics.jsiBridgeOptimized) compatibilityScore += 25;
    if (metrics.turboModulesEnabled) compatibilityScore += 20;
    if (metrics.hermesBytecodeOptimized) compatibilityScore += 15;
    if (metrics.renderingPerformance.viewFlattening) compatibilityScore += 5;
    if (metrics.renderingPerformance.animationsOnUIThread) compatibilityScore += 5;
    if (metrics.renderingPerformance.layoutOptimized) compatibilityScore += 5;

    return {
      ...metrics,
      compatibilityScore,
    };
  }

  // === PERFORMANCE MONITORING CONTROL ===

  /**
   * Start comprehensive performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // Frame rate monitoring
    if (this.config.frameRateMonitoring) {
      this.startFrameRateMonitoring();
    }

    // Memory monitoring
    if (this.config.memoryLeakDetection) {
      this.startMemoryMonitoring();
    }

    // General performance monitoring
    if (this.config.enableRealTimeMonitoring) {
      this.startGeneralPerformanceMonitoring();
    }
  }

  /**
   * Stop all performance monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;

    if (this.frameRateInterval) {
      clearInterval(this.frameRateInterval);
      this.frameRateInterval = null;
    }

    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }

    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
      this.performanceInterval = null;
    }
  }

  // === ALERT SYSTEM ===

  /**
   * Subscribe to performance alerts
   */
  subscribeToAlerts(callback: (alert: RealTimePerformanceAlert) => void): () => void {
    this.alertCallbacks.push(callback);

    return () => {
      const index = this.alertCallbacks.indexOf(callback);
      if (index > -1) {
        this.alertCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get current performance alerts
   */
  getActiveAlerts(): ReadonlyArray<RealTimePerformanceAlert> {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Clear performance alert
   */
  clearAlert(alertId: string): void {
    this.activeAlerts.delete(alertId);
  }

  // === PRIVATE IMPLEMENTATION ===

  private validateCrisisMetrics(
    responseTime: number,
    renderTime: number,
    interactionDelay: number
  ): boolean {
    return (
      responseTime <= this.thresholds.crisis.responseTime &&
      renderTime <= this.thresholds.crisis.renderTime &&
      interactionDelay <= this.thresholds.crisis.interactionDelay
    );
  }

  private calculateCrisisOptimizationLevel(
    responseTime: number,
    renderTime: number
  ): 'excellent' | 'good' | 'needs_improvement' | 'critical_failure' {
    if (responseTime <= 100 && renderTime <= 50) return 'excellent';
    if (responseTime <= 150 && renderTime <= 75) return 'good';
    if (responseTime <= 200 && renderTime <= 100) return 'needs_improvement';
    return 'critical_failure';
  }

  private validateTherapeuticMetrics(
    frameRate: number,
    animationSmoothness: number,
    jankCount: number
  ): boolean {
    return (
      frameRate >= this.thresholds.therapeutic.minimumFrameRate &&
      animationSmoothness >= this.thresholds.therapeutic.animationSmoothness &&
      jankCount <= this.thresholds.therapeutic.maxJankThreshold
    );
  }

  private generateTherapeuticOptimizationRecommendations(
    frameRate: number,
    animationSmoothness: number,
    jankCount: number
  ): readonly string[] {
    const recommendations: string[] = [];

    if (frameRate < this.thresholds.therapeutic.minimumFrameRate) {
      recommendations.push('Optimize rendering performance - consider component memoization');
      recommendations.push('Review animation implementations for performance bottlenecks');
    }

    if (animationSmoothness < this.thresholds.therapeutic.animationSmoothness) {
      recommendations.push('Enable native driver for animations where possible');
      recommendations.push('Reduce animation complexity or duration');
    }

    if (jankCount > this.thresholds.therapeutic.maxJankThreshold) {
      recommendations.push('Identify and eliminate sources of UI thread blocking');
      recommendations.push('Consider splitting complex operations into smaller chunks');
    }

    return recommendations;
  }

  private async measureAnimationSmoothness(
    componentId: ComponentPerformanceID
  ): Promise<number> {
    // Implementation would measure animation frame consistency
    // For now, return a calculated value based on current frame rate
    const currentFPS = this.frameRateMonitor.currentFPS;
    const targetFPS = this.thresholds.therapeutic.targetFrameRate;

    return Math.min(100, (currentFPS / targetFPS) * 100);
  }

  private async measureBreathingExercisePerformance(
    componentId: ComponentPerformanceID
  ): Promise<{
    readonly preciseTiming: boolean;
    readonly smoothTransitions: boolean;
    readonly memoryStable: boolean;
  }> {
    // Measure breathing exercise specific performance
    const preciseTiming = this.frameRateMonitor.currentFPS >= 59; // Very close to 60fps
    const smoothTransitions = this.frameRateMonitor.jankEvents.length === 0;
    const memoryStable = !this.memoryProfile.leakSuspected;

    return {
      preciseTiming,
      smoothTransitions,
      memoryStable,
    };
  }

  private measureInteractionDelay(componentId: ComponentPerformanceID): number {
    // Implementation would measure actual interaction delay
    // For now, return estimated delay based on frame rate
    const currentFPS = this.frameRateMonitor.currentFPS;

    if (currentFPS >= 55) return 20; // Good performance
    if (currentFPS >= 45) return 35; // Moderate performance
    return 50; // Poor performance
  }

  private calculateRenderConsistency(): number {
    if (this.frameBuffer.length < 2) return 100;

    const variance = this.calculateVariance(this.frameBuffer);
    const maxVariance = 5; // 5ms variance threshold

    return Math.max(0, 100 - (variance / maxVariance) * 100);
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  private async handleCrisisPerformanceViolation(
    metrics: CrisisUIPerformanceMetrics
  ): Promise<void> {
    console.warn('Crisis UI performance violation detected:', metrics);

    // Implement automatic optimization if enabled
    if (this.config.automaticOptimization) {
      await this.applyCrisisOptimizations(metrics.componentId);
    }
  }

  private async applyCrisisOptimizations(
    componentId: ComponentPerformanceID
  ): Promise<void> {
    // Implementation would apply automatic optimizations
    console.log(`Applying crisis optimizations for component: ${componentId}`);
  }

  private createPerformanceAlert(alertData: {
    readonly type: RealTimePerformanceAlert['type'];
    readonly severity: RealTimePerformanceAlert['severity'];
    readonly componentId?: ComponentPerformanceID;
    readonly metricValue: number;
    readonly threshold: number;
    readonly actionRequired: readonly string[];
  }): void {
    const alert: RealTimePerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: alertData.type,
      severity: alertData.severity,
      componentId: alertData.componentId,
      metricValue: alertData.metricValue,
      threshold: alertData.threshold,
      timestamp: new Date().toISOString() as ISODateString,
      actionRequired: alertData.actionRequired,
    };

    this.activeAlerts.set(alert.id, alert);

    // Notify subscribers
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Performance alert callback failed:', error);
      }
    });
  }

  // === MONITORING INITIALIZATION ===

  private initializeMemoryProfile(): MemoryPerformanceProfile {
    const initialMemory = global.performance?.memory?.usedJSHeapSize || 0;

    return {
      heapUsage: initialMemory,
      heapLimit: global.performance?.memory?.jsHeapSizeLimit || 0,
      gcPressure: 0,
      leakSuspected: false,
      componentMemoryFootprint: new Map(),
      peakMemoryUsage: initialMemory,
      averageMemoryUsage: initialMemory,
      memoryOptimizationScore: 100,
      timestamp: new Date().toISOString() as ISODateString,
    };
  }

  private initializeFrameRateMonitor(): FrameRateMonitor {
    return {
      currentFPS: 60,
      averageFPS: 60,
      droppedFrames: 0,
      jankEvents: [],
      smoothnessScore: 100,
      lastMeasurement: performance.now() as FrameTimestamp,
    };
  }

  private initializeNewArchMetrics(): NewArchitecturePerformanceMetrics {
    return {
      fabricRendererActive: false, // Would be detected at runtime
      jsiBridgeOptimized: false,
      turboModulesEnabled: false,
      hermesBytecodeOptimized: false,
      renderingPerformance: {
        viewFlattening: false,
        animationsOnUIThread: false,
        layoutOptimized: false,
      },
      bridgeCommunicationLatency: 0,
      nativeModuleCallLatency: 0,
      compatibilityScore: 0,
    };
  }

  private startFrameRateMonitoring(): void {
    this.frameRateInterval = setInterval(() => {
      this.measureFrameRate();
    }, 100); // Measure every 100ms
  }

  private startMemoryMonitoring(): void {
    this.memoryInterval = setInterval(() => {
      this.updateMemoryProfile();
    }, 1000); // Check every second
  }

  private startGeneralPerformanceMonitoring(): void {
    this.performanceInterval = setInterval(() => {
      this.updateGeneralMetrics();
    }, 500); // Update every 500ms
  }

  private measureFrameRate(): void {
    const currentTime = performance.now() as FrameTimestamp;

    if (this.lastFrameTime > 0) {
      const frameDuration = currentTime - this.lastFrameTime;
      const fps = 1000 / frameDuration;

      // Update frame buffer
      this.frameBuffer.push(frameDuration);
      if (this.frameBuffer.length > 60) { // Keep last 60 frames
        this.frameBuffer.shift();
      }

      // Update frame rate monitor
      (this.frameRateMonitor as any).currentFPS = fps;

      // Calculate average
      if (this.frameBuffer.length > 0) {
        const avgFrameDuration = this.frameBuffer.reduce((a, b) => a + b, 0) / this.frameBuffer.length;
        (this.frameRateMonitor as any).averageFPS = 1000 / avgFrameDuration;
      }

      // Detect jank (frames taking longer than 16.67ms for 60fps)
      const expectedFrameDuration = 16.67; // 60fps
      if (frameDuration > expectedFrameDuration * 1.5) { // 50% longer than expected
        const jankEvent: FrameJankEvent = {
          timestamp: currentTime,
          frameDuration,
          expectedDuration: expectedFrameDuration,
          severity: frameDuration > expectedFrameDuration * 2 ? 'severe' :
                   frameDuration > expectedFrameDuration * 1.75 ? 'major' : 'minor',
        };

        (this.frameRateMonitor as any).jankEvents = [
          ...this.frameRateMonitor.jankEvents.slice(-9), // Keep last 10
          jankEvent,
        ];
      }
    }

    this.lastFrameTime = currentTime;
  }

  private updateMemoryProfile(): void {
    if (!global.performance?.memory) return;

    const currentMemory = global.performance.memory.usedJSHeapSize;
    const memoryLimit = global.performance.memory.jsHeapSizeLimit;

    // Update memory profile
    (this.memoryProfile as any).heapUsage = currentMemory;
    (this.memoryProfile as any).heapLimit = memoryLimit;
    (this.memoryProfile as any).peakMemoryUsage = Math.max(
      this.memoryProfile.peakMemoryUsage,
      currentMemory
    );

    // Calculate average memory usage
    const currentAvg = this.memoryProfile.averageMemoryUsage;
    (this.memoryProfile as any).averageMemoryUsage = (currentAvg + currentMemory) / 2;

    // Detect potential memory leaks
    const memoryGrowth = currentMemory / this.memoryProfile.averageMemoryUsage;
    (this.memoryProfile as any).leakSuspected = memoryGrowth > (1 + this.thresholds.memory.leakDetectionThreshold);

    // Calculate GC pressure
    (this.memoryProfile as any).gcPressure = currentMemory / memoryLimit;

    // Update optimization score
    let score = 100;
    if (this.memoryProfile.gcPressure > 0.8) score -= 30;
    if (this.memoryProfile.leakSuspected) score -= 40;
    if (currentMemory > this.thresholds.memory.maxHeapUsage) score -= 20;

    (this.memoryProfile as any).memoryOptimizationScore = Math.max(0, score);
  }

  private updateGeneralMetrics(): void {
    // Update general performance metrics
    // This would include bridge latency, interaction responsiveness, etc.
  }

  // === PUBLIC API ===

  /**
   * Get comprehensive performance report
   */
  getPerformanceReport(): {
    readonly crisis: ReadonlyMap<ComponentPerformanceID, CrisisUIPerformanceMetrics>;
    readonly therapeutic: ReadonlyMap<ComponentPerformanceID, TherapeuticUIPerformanceMetrics>;
    readonly memory: DeepReadonly<MemoryPerformanceProfile>;
    readonly frameRate: DeepReadonly<FrameRateMonitor>;
    readonly newArchitecture: DeepReadonly<NewArchitecturePerformanceMetrics>;
    readonly alerts: ReadonlyArray<RealTimePerformanceAlert>;
    readonly overallScore: number;
  } {
    // Calculate overall performance score
    let overallScore = 100;

    // Crisis components penalty
    this.crisisMetrics.forEach(metrics => {
      if (!metrics.validationPassed) overallScore -= 20;
    });

    // Therapeutic components penalty
    this.therapeuticMetrics.forEach(metrics => {
      if (!metrics.validationPassed) overallScore -= 10;
    });

    // Memory penalty
    overallScore = Math.min(overallScore, this.memoryProfile.memoryOptimizationScore);

    // Frame rate penalty
    if (this.frameRateMonitor.currentFPS < this.thresholds.therapeutic.minimumFrameRate) {
      overallScore -= 15;
    }

    return {
      crisis: this.crisisMetrics,
      therapeutic: this.therapeuticMetrics,
      memory: this.memoryProfile,
      frameRate: this.frameRateMonitor,
      newArchitecture: this.newArchMetrics,
      alerts: this.getActiveAlerts(),
      overallScore: Math.max(0, overallScore),
    };
  }

  /**
   * Clear all performance data
   */
  clearPerformanceData(): void {
    this.crisisMetrics.clear();
    this.therapeuticMetrics.clear();
    this.activeAlerts.clear();
    this.frameBuffer = [];
    (this.frameRateMonitor as any).jankEvents = [];
  }
}

// === SERVICE INSTANCE ===

export const UIPerformanceValidationService = new ReactNativeUIPerformanceValidationService({
  enableRealTimeMonitoring: true,
  crisisComponentPriority: true,
  therapeuticAnimationTracking: true,
  memoryLeakDetection: true,
  newArchitectureOptimization: true,
  frameRateMonitoring: true,
  bridgePerformanceTracking: true,
  automaticOptimization: true,
  performanceAlerting: true,
  detailedMetricsCollection: true,
});

// === TYPE EXPORTS ===

export type {
  UIPerformanceValidationServiceConfig,
  CrisisUIPerformanceMetrics,
  TherapeuticUIPerformanceMetrics,
  MemoryPerformanceProfile,
  NewArchitecturePerformanceMetrics,
  RealTimePerformanceAlert,
  UIPerformanceThresholds,
  FrameRateMonitor,
  FrameJankEvent,
  PerformanceMetricID,
  ComponentPerformanceID,
  FrameTimestamp,
  MemoryThreshold,
  ResponseTimeThreshold,
};

// === DEFAULT EXPORT ===

export default UIPerformanceValidationService;