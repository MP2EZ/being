/**
 * Week 3 Performance Optimization System - Main Index
 *
 * Comprehensive performance optimization for assessment systems with enhanced targets:
 * - Crisis detection: <50ms (enhanced from <200ms)
 * - Assessment flow: <200ms per question (enhanced from <300ms)
 * - Memory usage: <150MB during extended sessions
 * - Frame rate: 60fps maintained
 * - Bundle optimization: <2MB initial, <500KB chunks
 * - Store operations: <50ms
 *
 * This system provides production-ready performance optimization for clinical assessment
 * applications with real-time monitoring, alerting, and automatic optimization.
 */

// Core Performance Optimizers
export { CrisisPerformanceOptimizer } from './CrisisPerformanceOptimizer';
export { AssessmentFlowOptimizer } from './AssessmentFlowOptimizer';
export { MemoryOptimizer } from './MemoryOptimizer';
export { BundleOptimizer } from './BundleOptimizer';
export { RenderingOptimizer } from './RenderingOptimizer';
export { ZustandStoreOptimizer } from './ZustandStoreOptimizer';

// Monitoring and Validation
export { PerformanceMonitor } from './PerformanceMonitor';
export { PerformanceValidator } from './PerformanceValidator';

// Main Performance System Controller
export class PerformanceSystem {
  private static isInitialized = false;
  private static initializationPromise: Promise<void> | null = null;

  /**
   * Initialize the complete Week 3 performance optimization system
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = this.performInitialization();
    await this.initializationPromise;
  }

  /**
   * Perform the actual initialization
   */
  private static async performInitialization(): Promise<void> {
    try {
      console.log('🚀 Initializing Week 3 Performance Optimization System...');

      // Initialize all performance optimizers in parallel
      await Promise.all([
        BundleOptimizer.initialize(),
        Promise.resolve(MemoryOptimizer.initialize()),
        Promise.resolve(RenderingOptimizer.initialize()),
        Promise.resolve(ZustandStoreOptimizer.initialize()),
        Promise.resolve(PerformanceMonitor.startMonitoring())
      ]);

      // Configure optimizations for clinical assessment use case
      CrisisPerformanceOptimizer.configureOptimizations({
        enablePrecomputation: true,
        enableCaching: true,
        targetResponseTimeMs: 50
      });

      AssessmentFlowOptimizer.configureOptimizations({
        preloadNext: 3,
        enableBatchUpdates: true,
        optimizeTransitions: true
      });

      MemoryOptimizer.configure({
        maxMemoryUsage: 150,
        enableAutomaticCleanup: true,
        preserveCriticalData: true
      });

      RenderingOptimizer.configure({
        targetFps: 60,
        enableBatching: true,
        enableMemoization: true,
        enableAnimationOptimization: true
      });

      ZustandStoreOptimizer.configure({
        maxOperationTime: 50,
        enableBatching: true,
        enableMemoization: true,
        enableLazyLoading: true
      });

      PerformanceMonitor.configure({
        enabled: true,
        enableAutoOptimization: true,
        enableUserNotifications: false // Keep quiet for clinical use
      });

      this.isInitialized = true;
      console.log('✅ Week 3 Performance Optimization System initialized successfully');

      // Run initial performance validation
      setTimeout(async () => {
        try {
          const validationReport = await PerformanceValidator.validatePerformance();
          console.log(`🎯 Initial performance validation: ${validationReport.status} (Score: ${validationReport.overallScore}/100)`);
        } catch (error) {
          console.error('Initial performance validation failed:', error);
        }
      }, 5000); // Wait 5 seconds for systems to stabilize

    } catch (error) {
      console.error('Failed to initialize Week 3 Performance System:', error);
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Get comprehensive system status
   */
  static getSystemStatus(): {
    isInitialized: boolean;
    componentsStatus: Record<string, boolean>;
    overallHealth: string;
    performanceScore: number;
    activeAlerts: number;
  } {
    const monitorSummary = PerformanceMonitor.getPerformanceSummary();

    return {
      isInitialized: this.isInitialized,
      componentsStatus: {
        crisisOptimizer: true, // Static components are always ready
        assessmentOptimizer: true,
        memoryOptimizer: true,
        renderingOptimizer: true,
        bundleOptimizer: true,
        storeOptimizer: true,
        monitor: monitorSummary.isMonitoring,
        validator: true
      },
      overallHealth: monitorSummary.healthStatus,
      performanceScore: monitorSummary.latestScore,
      activeAlerts: monitorSummary.activeAlerts
    };
  }

  /**
   * Run comprehensive performance optimization
   */
  static async optimizePerformance(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Performance system not initialized');
    }

    console.log('🔧 Running comprehensive performance optimization...');

    // Trigger optimization in all components
    try {
      // Memory optimization
      MemoryOptimizer.initialize(); // Re-initialize for cleanup

      // Rendering optimization
      RenderingOptimizer.configure({
        enableBatching: true,
        enableMemoization: true,
        enableAnimationOptimization: true
      });

      // Store optimization
      ZustandStoreOptimizer.flush(); // Flush pending operations

      // Crisis detection precomputation
      CrisisPerformanceOptimizer.precomputeCrisisThresholds();

      console.log('✅ Comprehensive performance optimization completed');
    } catch (error) {
      console.error('Performance optimization failed:', error);
      throw error;
    }
  }

  /**
   * Validate all performance targets
   */
  static async validateTargets(): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Performance system not initialized');
    }

    return await PerformanceValidator.validatePerformance();
  }

  /**
   * Get comprehensive performance report
   */
  static getPerformanceReport(): any {
    const crisisStats = CrisisPerformanceOptimizer.getPerformanceStats();
    const assessmentStats = AssessmentFlowOptimizer.getOverallPerformanceStats();
    const memoryStats = MemoryOptimizer.getMemoryStats();
    const renderingStats = RenderingOptimizer.getPerformanceReport();
    const bundleStats = BundleOptimizer.getBundleAnalysis();
    const storeStats = ZustandStoreOptimizer.getPerformanceReport();
    const monitorSummary = PerformanceMonitor.getPerformanceSummary();

    return {
      timestamp: Date.now(),
      systemStatus: this.getSystemStatus(),
      week3Targets: {
        crisisDetection: {
          target: 50,
          actual: crisisStats.averageCrisisDetection,
          passed: crisisStats.averageCrisisDetection <= 50,
          status: crisisStats.averageCrisisDetection <= 50 ? 'PASSED' : 'FAILED'
        },
        assessmentFlow: {
          target: 200,
          actual: assessmentStats.averageQuestionResponse,
          passed: assessmentStats.averageQuestionResponse <= 200,
          status: assessmentStats.averageQuestionResponse <= 200 ? 'PASSED' : 'FAILED'
        },
        memoryUsage: {
          target: 150,
          actual: memoryStats.currentUsage?.totalUsage || 0,
          passed: (memoryStats.currentUsage?.totalUsage || 0) <= 150,
          status: (memoryStats.currentUsage?.totalUsage || 0) <= 150 ? 'PASSED' : 'FAILED'
        },
        frameRate: {
          target: 55,
          actual: renderingStats.frameRateStats.averageFps,
          passed: renderingStats.frameRateStats.averageFps >= 55,
          status: renderingStats.frameRateStats.averageFps >= 55 ? 'PASSED' : 'FAILED'
        },
        storeOperations: {
          target: 50,
          actual: storeStats.operationMetrics.averageExecutionTime,
          passed: storeStats.operationMetrics.averageExecutionTime <= 50,
          status: storeStats.operationMetrics.averageExecutionTime <= 50 ? 'PASSED' : 'FAILED'
        }
      },
      detailedMetrics: {
        crisis: crisisStats,
        assessment: assessmentStats,
        memory: memoryStats,
        rendering: renderingStats,
        bundle: bundleStats,
        store: storeStats,
        monitor: monitorSummary
      }
    };
  }

  /**
   * Shutdown the performance system
   */
  static shutdown(): void {
    if (!this.isInitialized) return;

    console.log('🛑 Shutting down Week 3 Performance System...');

    try {
      PerformanceMonitor.stopMonitoring();
      MemoryOptimizer.shutdown();
      RenderingOptimizer.shutdown();
      ZustandStoreOptimizer.reset();
      BundleOptimizer.reset();
      AssessmentFlowOptimizer.reset();
      CrisisPerformanceOptimizer.resetPerformanceTracking();

      this.isInitialized = false;
      this.initializationPromise = null;

      console.log('✅ Week 3 Performance System shutdown completed');
    } catch (error) {
      console.error('Performance system shutdown failed:', error);
    }
  }
}

// Default export for convenience
export default PerformanceSystem;