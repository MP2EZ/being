/**
 * Real-time Performance Monitoring and Alerting System
 *
 * TARGET: Comprehensive performance monitoring with <100ms alert response time
 * FEATURES:
 * - Real-time performance data collection
 * - Intelligent alerting with severity levels
 * - Performance regression detection
 * - Automated optimization triggers
 * - Clinical performance compliance monitoring
 *
 * CLINICAL SAFETY:
 * - Crisis detection performance monitoring
 * - Assessment flow performance validation
 * - Memory pressure alerts for safety continuity
 * - Real-time performance SLA compliance
 */


import { logSecurity, logPerformance, logError, LogCategory } from '../logging';
import { Alert, DeviceEventEmitter, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import our performance optimizers
import { CrisisPerformanceOptimizer } from './CrisisPerformanceOptimizer';
import { AssessmentFlowOptimizer } from './AssessmentFlowOptimizer';
import { MemoryOptimizer } from './MemoryOptimizer';
import { BundleOptimizer } from './BundleOptimizer';
import { RenderingOptimizer } from './RenderingOptimizer';
import { ZustandStoreOptimizer } from './ZustandStoreOptimizer';

interface PerformanceAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  component: string;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: number;
  resolved: boolean;
  resolutionTime?: number;
}

interface PerformanceThresholds {
  crisis_detection: { warning: number; critical: number };
  assessment_flow: { warning: number; critical: number };
  memory_usage: { warning: number; critical: number };
  frame_rate: { warning: number; critical: number };
  bundle_size: { warning: number; critical: number };
  store_operations: { warning: number; critical: number };
}

interface PerformanceReport {
  timestamp: number;
  duration: number; // monitoring period in ms
  summary: {
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
    totalAlerts: number;
    criticalAlerts: number;
    performanceScore: number; // 0-100
  };
  metrics: {
    crisis: any;
    assessment: any;
    memory: any;
    rendering: any;
    bundle: any;
    store: any;
  };
  alerts: PerformanceAlert[];
  recommendations: string[];
}

interface MonitoringConfig {
  enabled: boolean;
  reportingInterval: number; // ms
  alertThrottling: number; // ms between similar alerts
  enableAutoOptimization: boolean;
  enableUserNotifications: boolean;
  performanceTargets: PerformanceThresholds;
}

/**
 * Performance Alert Manager
 */
class PerformanceAlertManager {
  private static alerts: PerformanceAlert[] = [];
  private static alertHistory: PerformanceAlert[] = [];
  private static lastAlertTimes = new Map<string, number>();
  private static alertThrottling = 30000; // 30 seconds

  /**
   * Create new performance alert
   */
  static createAlert(
    component: string,
    metric: string,
    value: number,
    threshold: number,
    severity: PerformanceAlert['severity'],
    customMessage?: string
  ): PerformanceAlert {
    const alertId = `${component}_${metric}_${Date.now()}`;
    const alertKey = `${component}_${metric}`;

    // Check throttling
    const lastAlertTime = this.lastAlertTimes.get(alertKey) || 0;
    if (Date.now() - lastAlertTime < this.alertThrottling) {
      return null; // Throttled
    }

    const alert: PerformanceAlert = {
      id: alertId,
      severity,
      component,
      metric,
      value,
      threshold,
      message: customMessage || this.generateAlertMessage(component, metric, value, threshold, severity),
      timestamp: Date.now(),
      resolved: false
    };

    this.alerts.push(alert);
    this.alertHistory.push(alert);
    this.lastAlertTimes.set(alertKey, alert.timestamp);

    // Keep only last 100 alerts in memory
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }

    // Keep only last 500 in history
    if (this.alertHistory.length > 500) {
      this.alertHistory.shift();
    }

    logPerformance(`🚨 Performance Alert [${severity.toUpperCase()}]: ${alert.message}`);

    // Emit alert event
    DeviceEventEmitter.emit('performance_alert_created', alert);

    return alert;
  }

  /**
   * Generate alert message
   */
  private static generateAlertMessage(
    component: string,
    metric: string,
    value: number,
    threshold: number,
    severity: string
  ): string {
    const formattedValue = this.formatValue(metric, value);
    const formattedThreshold = this.formatValue(metric, threshold);

    switch (severity) {
      case 'critical':
        return `CRITICAL: ${component} ${metric} is ${formattedValue} (exceeds critical threshold of ${formattedThreshold})`;
      case 'error':
        return `ERROR: ${component} ${metric} is ${formattedValue} (exceeds error threshold of ${formattedThreshold})`;
      case 'warning':
        return `WARNING: ${component} ${metric} is ${formattedValue} (exceeds warning threshold of ${formattedThreshold})`;
      default:
        return `INFO: ${component} ${metric} is ${formattedValue}`;
    }
  }

  /**
   * Format value for display
   */
  private static formatValue(metric: string, value: number): string {
    if (metric.includes('time') || metric.includes('latency')) {
      return `${value.toFixed(2)}ms`;
    } else if (metric.includes('memory') || metric.includes('size')) {
      if (value >= 1024 * 1024) {
        return `${(value / (1024 * 1024)).toFixed(2)}MB`;
      } else if (value >= 1024) {
        return `${(value / 1024).toFixed(2)}KB`;
      }
      return `${value}B`;
    } else if (metric.includes('rate') || metric.includes('fps')) {
      return `${value.toFixed(2)}fps`;
    } else if (metric.includes('percent') || metric.includes('ratio')) {
      return `${value.toFixed(2)}%`;
    }
    return value.toFixed(2);
  }

  /**
   * Resolve alert
   */
  static resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert || alert.resolved) return false;

    alert.resolved = true;
    alert.resolutionTime = Date.now();

    logPerformance(`✅ Performance Alert Resolved: ${alert.message}`);
    DeviceEventEmitter.emit('performance_alert_resolved', alert);

    return true;
  }

  /**
   * Get active alerts
   */
  static getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get alerts by severity
   */
  static getAlertsBySeverity(severity: PerformanceAlert['severity']): PerformanceAlert[] {
    return this.alerts.filter(alert => alert.severity === severity && !alert.resolved);
  }

  /**
   * Get alert statistics
   */
  static getAlertStats(): {
    total: number;
    active: number;
    resolved: number;
    bySeverity: Record<string, number>;
    averageResolutionTime: number;
  } {
    const active = this.getActiveAlerts();
    const resolved = this.alerts.filter(a => a.resolved);

    const bySeverity = {
      critical: this.getAlertsBySeverity('critical').length,
      error: this.getAlertsBySeverity('error').length,
      warning: this.getAlertsBySeverity('warning').length,
      info: this.getAlertsBySeverity('info').length
    };

    const resolvedWithTime = resolved.filter(a => a.resolutionTime);
    const averageResolutionTime = resolvedWithTime.length > 0
      ? resolvedWithTime.reduce((sum, a) => sum + (a.resolutionTime - a.timestamp), 0) / resolvedWithTime.length
      : 0;

    return {
      total: this.alerts.length,
      active: active.length,
      resolved: resolved.length,
      bySeverity,
      averageResolutionTime
    };
  }

  /**
   * Clear resolved alerts
   */
  static clearResolvedAlerts(): void {
    this.alerts = this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Clear all alerts
   */
  static clearAllAlerts(): void {
    this.alerts = [];
    this.lastAlertTimes.clear();
  }
}

/**
 * Performance Regression Detector
 */
class PerformanceRegressionDetector {
  private static baselineMetrics = new Map<string, number>();
  private static recentMetrics = new Map<string, number[]>();
  private static regressionThreshold = 0.2; // 20% degradation

  /**
   * Set baseline metric
   */
  static setBaseline(metric: string, value: number): void {
    this.baselineMetrics.set(metric, value);
    logPerformance(`📊 Baseline set for ${metric}: ${value}`);
  }

  /**
   * Record metric value
   */
  static recordMetric(metric: string, value: number): void {
    // Get or create recent values array
    const recent = this.recentMetrics.get(metric) || [];
    recent.push(value);

    // Keep only last 10 values
    if (recent.length > 10) {
      recent.shift();
    }

    this.recentMetrics.set(metric, recent);

    // Check for regression
    this.checkRegression(metric, value);
  }

  /**
   * Check for performance regression
   */
  private static checkRegression(metric: string, currentValue: number): void {
    const baseline = this.baselineMetrics.get(metric);
    if (!baseline) return;

    const regressionRatio = currentValue / baseline;
    const isRegression =
      (metric.includes('time') || metric.includes('latency')) ? // Higher is worse
        regressionRatio > (1 + this.regressionThreshold) :
        regressionRatio < (1 - this.regressionThreshold); // Lower is worse for rates/fps

    if (isRegression) {
      const severity = regressionRatio > 1.5 || regressionRatio < 0.5 ? 'critical' : 'warning';

      PerformanceAlertManager.createAlert(
        'regression_detector',
        metric,
        currentValue,
        baseline,
        severity,
        `Performance regression detected: ${metric} degraded from ${baseline} to ${currentValue}`
      );

      DeviceEventEmitter.emit('performance_regression_detected', {
        metric,
        baseline,
        currentValue,
        regressionRatio,
        severity
      });
    }
  }

  /**
   * Get regression report
   */
  static getRegressionReport(): {
    regressions: Array<{
      metric: string;
      baseline: number;
      current: number;
      regression: number;
    }>;
    improvements: Array<{
      metric: string;
      baseline: number;
      current: number;
      improvement: number;
    }>;
  } {
    const regressions = [];
    const improvements = [];

    for (const [metric, recent] of this.recentMetrics.entries()) {
      const baseline = this.baselineMetrics.get(metric);
      if (!baseline || recent.length === 0) continue;

      const current = recent[recent.length - 1];
      const ratio = current / baseline;

      if (Math.abs(ratio - 1) > 0.1) { // 10% change threshold
        const isImprovement =
          (metric.includes('time') || metric.includes('latency')) ?
            ratio < 0.9 : // Lower time is better
            ratio > 1.1;   // Higher rate is better

        if (isImprovement) {
          improvements.push({
            metric,
            baseline,
            current,
            improvement: Math.abs(ratio - 1) * 100
          });
        } else {
          regressions.push({
            metric,
            baseline,
            current,
            regression: Math.abs(ratio - 1) * 100
          });
        }
      }
    }

    return { regressions, improvements };
  }
}

/**
 * Main Performance Monitor
 */
export class PerformanceMonitor {
  private static config: MonitoringConfig = {
    enabled: true,
    reportingInterval: 60000, // 1 minute
    alertThrottling: 30000, // 30 seconds
    enableAutoOptimization: true,
    enableUserNotifications: false,
    performanceTargets: {
      crisis_detection: { warning: 40, critical: 50 },
      assessment_flow: { warning: 150, critical: 200 },
      memory_usage: { warning: 120, critical: 150 }, // MB
      frame_rate: { warning: 55, critical: 45 }, // fps
      bundle_size: { warning: 1.8, critical: 2.0 }, // MB
      store_operations: { warning: 40, critical: 50 } // ms
    }
  };

  private static isMonitoring = false;
  private static monitoringTimer: NodeJS.Timeout | null = null;
  private static startTime = Date.now();
  private static reportHistory: PerformanceReport[] = [];

  /**
   * Start performance monitoring
   */
  static async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;

    logPerformance('📊 Starting comprehensive performance monitoring...');

    // Initialize all performance optimizers
    await this.initializeOptimizers();

    // Setup event listeners
    this.setupEventListeners();

    // Start monitoring loop
    this.startMonitoringLoop();

    // Setup app state monitoring
    this.setupAppStateMonitoring();

    this.isMonitoring = true;
    this.startTime = Date.now();

    logPerformance('✅ Performance monitoring active');
  }

  /**
   * Initialize performance optimizers
   */
  private static async initializeOptimizers(): Promise<void> {
    try {
      // Initialize optimizers in parallel
      await Promise.all([
        BundleOptimizer.initialize(),
        Promise.resolve(MemoryOptimizer.initialize()),
        Promise.resolve(RenderingOptimizer.initialize()),
        Promise.resolve(ZustandStoreOptimizer.initialize())
      ]);

      logPerformance('✅ All performance optimizers initialized');
    } catch (error) {
      logError('Failed to initialize performance optimizers:', error);
    }
  }

  /**
   * Setup event listeners for performance events
   */
  private static setupEventListeners(): void {
    // Crisis detection performance
    DeviceEventEmitter.addListener('performance_alert', (data) => {
      this.handlePerformanceAlert(data);
    });

    // Memory pressure events
    DeviceEventEmitter.addListener('memory_pressure_detected', (data) => {
      this.handleMemoryPressure(data);
    });

    // Frame rate degradation
    DeviceEventEmitter.addListener('performance_degradation', (data) => {
      this.handlePerformanceDegradation(data);
    });

    // Bundle size alerts
    DeviceEventEmitter.addListener('bundle_size_exceeded', (data) => {
      this.handleBundleSizeAlert(data);
    });

    // Store operation alerts
    DeviceEventEmitter.addListener('store_operation_recorded', (data) => {
      this.handleStoreOperation(data);
    });
  }

  /**
   * Start monitoring loop
   */
  private static startMonitoringLoop(): void {
    this.monitoringTimer = setInterval(() => {
      this.collectPerformanceReport();
    }, this.config.reportingInterval);
  }

  /**
   * Collect comprehensive performance report
   */
  private static async collectPerformanceReport(): Promise<PerformanceReport> {
    const startTime = Date.now();

    try {
      // Collect metrics from all optimizers
      const [
        crisisStats,
        assessmentStats,
        memoryStats,
        renderingStats,
        bundleStats,
        storeStats
      ] = await Promise.all([
        Promise.resolve(CrisisPerformanceOptimizer.getPerformanceStats()),
        Promise.resolve(AssessmentFlowOptimizer.getOverallPerformanceStats()),
        Promise.resolve(MemoryOptimizer.getMemoryStats()),
        Promise.resolve(RenderingOptimizer.getPerformanceReport()),
        Promise.resolve(BundleOptimizer.getBundleAnalysis()),
        Promise.resolve(ZustandStoreOptimizer.getPerformanceReport())
      ]);

      // Calculate overall performance score
      const performanceScore = this.calculatePerformanceScore({
        crisis: crisisStats,
        assessment: assessmentStats,
        memory: memoryStats,
        rendering: renderingStats,
        bundle: bundleStats,
        store: storeStats
      });

      // Get current alerts
      const alerts = PerformanceAlertManager.getActiveAlerts();
      const alertStats = PerformanceAlertManager.getAlertStats();

      // Generate recommendations
      const recommendations = this.generateRecommendations({
        crisis: crisisStats,
        assessment: assessmentStats,
        memory: memoryStats,
        rendering: renderingStats,
        bundle: bundleStats,
        store: storeStats
      });

      const report: PerformanceReport = {
        timestamp: Date.now(),
        duration: Date.now() - this.startTime,
        summary: {
          overallHealth: this.getHealthStatus(performanceScore),
          totalAlerts: alertStats.total,
          criticalAlerts: alertStats.bySeverity.critical,
          performanceScore
        },
        metrics: {
          crisis: crisisStats,
          assessment: assessmentStats,
          memory: memoryStats,
          rendering: renderingStats,
          bundle: bundleStats,
          store: storeStats
        },
        alerts,
        recommendations
      };

      // Store report
      this.reportHistory.push(report);
      if (this.reportHistory.length > 100) {
        this.reportHistory.shift();
      }

      // Persist report
      await this.persistReport(report);

      // Emit report event
      DeviceEventEmitter.emit('performance_report_generated', report);

      logPerformance(`📊 Performance Report Generated (Score: ${performanceScore}/100)`);

      return report;

    } catch (error) {
      logError('Failed to collect performance report:', error);
      throw error;
    }
  }

  /**
   * Calculate overall performance score (0-100)
   */
  private static calculatePerformanceScore(metrics: any): number {
    let score = 100;

    // Crisis detection performance (25% weight)
    const crisisScore = metrics.crisis.averageCrisisDetection <= 50 ? 25 :
                       Math.max(0, 25 - ((metrics.crisis.averageCrisisDetection - 50) / 10) * 5);

    // Assessment flow performance (20% weight)
    const assessmentScore = metrics.assessment.averageQuestionResponse <= 200 ? 20 :
                           Math.max(0, 20 - ((metrics.assessment.averageQuestionResponse - 200) / 50) * 5);

    // Memory usage (15% weight)
    const memoryScore = metrics.memory.currentUsage?.totalUsage <= 150 ? 15 :
                       Math.max(0, 15 - ((metrics.memory.currentUsage.totalUsage - 150) / 20) * 3);

    // Rendering performance (20% weight)
    const renderingScore = metrics.rendering.frameRateStats.averageFps >= 55 ? 20 :
                          Math.max(0, 20 - ((55 - metrics.rendering.frameRateStats.averageFps) / 5) * 4);

    // Bundle optimization (10% weight)
    const bundleScore = metrics.bundle.currentMetrics?.totalSize <= 2000000 ? 10 :
                       Math.max(0, 10 - ((metrics.bundle.currentMetrics.totalSize - 2000000) / 200000) * 2);

    // Store performance (10% weight)
    const storeScore = metrics.store.operationMetrics.averageExecutionTime <= 50 ? 10 :
                      Math.max(0, 10 - ((metrics.store.operationMetrics.averageExecutionTime - 50) / 10) * 2);

    return Math.round(crisisScore + assessmentScore + memoryScore + renderingScore + bundleScore + storeScore);
  }

  /**
   * Get health status based on performance score
   */
  private static getHealthStatus(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    return 'poor';
  }

  /**
   * Generate optimization recommendations
   */
  private static generateRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];

    // Crisis detection recommendations
    if (metrics.crisis.averageCrisisDetection > 40) {
      recommendations.push('Optimize crisis detection algorithms for faster response times');
    }

    // Assessment flow recommendations
    if (metrics.assessment.averageQuestionResponse > 150) {
      recommendations.push('Enable assessment flow batching and preloading');
    }

    // Memory recommendations
    if (metrics.memory.currentUsage?.totalUsage > 120) {
      recommendations.push('Implement aggressive memory cleanup and cache optimization');
    }

    // Rendering recommendations
    if (metrics.rendering.frameRateStats.averageFps < 55) {
      recommendations.push('Optimize component rendering and enable animation native drivers');
    }

    // Bundle recommendations
    if (metrics.bundle.currentMetrics?.totalSize > 1800000) {
      recommendations.push('Implement code splitting and lazy loading for non-critical components');
    }

    // Store recommendations
    if (metrics.store.operationMetrics.averageExecutionTime > 40) {
      recommendations.push('Enable store operation batching and selector memoization');
    }

    return recommendations;
  }

  /**
   * Handle performance alert
   */
  private static handlePerformanceAlert(data: any): void {
    const severity = data.duration > this.config.performanceTargets.crisis_detection.critical ? 'critical' : 'warning';

    PerformanceAlertManager.createAlert(
      'crisis_detection',
      'response_time',
      data.duration,
      this.config.performanceTargets.crisis_detection.warning,
      severity
    );

    if (this.config.enableAutoOptimization && severity === 'critical') {
      this.triggerAutoOptimization('crisis');
    }
  }

  /**
   * Handle memory pressure
   */
  private static handleMemoryPressure(data: any): void {
    const severity = data.level === 'critical' ? 'critical' : 'warning';

    PerformanceAlertManager.createAlert(
      'memory',
      'usage',
      data.metrics.totalUsage,
      this.config.performanceTargets.memory_usage.warning,
      severity
    );

    if (this.config.enableAutoOptimization) {
      this.triggerAutoOptimization('memory');
    }
  }

  /**
   * Handle performance degradation
   */
  private static handlePerformanceDegradation(data: any): void {
    const severity = data.type === 'low_fps' && data.value < 45 ? 'critical' : 'warning';

    PerformanceAlertManager.createAlert(
      'rendering',
      data.type,
      data.value,
      data.threshold,
      severity
    );
  }

  /**
   * Handle bundle size alert
   */
  private static handleBundleSizeAlert(data: any): void {
    const severity = data.current > this.config.performanceTargets.bundle_size.critical * 1024 * 1024 ? 'critical' : 'warning';

    PerformanceAlertManager.createAlert(
      'bundle',
      'size',
      data.current,
      data.limit,
      severity
    );
  }

  /**
   * Handle store operation
   */
  private static handleStoreOperation(data: any): void {
    if (data.executionTime > this.config.performanceTargets.store_operations.warning) {
      const severity = data.executionTime > this.config.performanceTargets.store_operations.critical ? 'critical' : 'warning';

      PerformanceAlertManager.createAlert(
        'store',
        'operation_time',
        data.executionTime,
        this.config.performanceTargets.store_operations.warning,
        severity
      );
    }
  }

  /**
   * Trigger automatic optimization
   */
  private static triggerAutoOptimization(type: 'crisis' | 'memory' | 'rendering' | 'bundle' | 'store'): void {
    logPerformance(`🔧 Triggering auto-optimization for: ${type}`);

    switch (type) {
      case 'crisis':
        // Optimize crisis detection
        break;
      case 'memory':
        MemoryOptimizer.initialize(); // Re-initialize for cleanup
        break;
      case 'rendering':
        RenderingOptimizer.configure({ enableBatching: true, enableMemoization: true });
        break;
      case 'bundle':
        // Trigger bundle optimization
        break;
      case 'store':
        ZustandStoreOptimizer.configure({ enableBatching: true, enableMemoization: true });
        break;
    }

    DeviceEventEmitter.emit('auto_optimization_triggered', { type, timestamp: Date.now() });
  }

  /**
   * Setup app state monitoring
   */
  private static setupAppStateMonitoring(): void {
    AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        logPerformance('📱 App backgrounded - generating final report');
        this.collectPerformanceReport();
      } else if (nextAppState === 'active') {
        logPerformance('📱 App active - resuming monitoring');
        this.startTime = Date.now();
      }
    });
  }

  /**
   * Persist performance report
   */
  private static async persistReport(report: PerformanceReport): Promise<void> {
    try {
      const key = `performance_report_${report.timestamp}`;
      await AsyncStorage.setItem(key, JSON.stringify(report));

      // Keep only last 50 reports in storage
      const keys = await AsyncStorage.getAllKeys();
      const reportKeys = keys.filter(key => key.startsWith('performance_report_'))
                             .sort()
                             .reverse();

      if (reportKeys.length > 50) {
        const keysToDelete = reportKeys.slice(50);
        await AsyncStorage.multiRemove(keysToDelete);
      }
    } catch (error) {
      logError('Failed to persist performance report:', error);
    }
  }

  /**
   * Get latest performance report
   */
  static getLatestReport(): PerformanceReport | null {
    return this.reportHistory.length > 0
      ? this.reportHistory[this.reportHistory.length - 1]
      : null;
  }

  /**
   * Get performance summary
   */
  static getPerformanceSummary(): {
    isMonitoring: boolean;
    uptime: number;
    totalReports: number;
    activeAlerts: number;
    criticalAlerts: number;
    latestScore: number;
    healthStatus: string;
  } {
    const latest = this.getLatestReport();
    const alertStats = PerformanceAlertManager.getAlertStats();

    return {
      isMonitoring: this.isMonitoring,
      uptime: Date.now() - this.startTime,
      totalReports: this.reportHistory.length,
      activeAlerts: alertStats.active,
      criticalAlerts: alertStats.bySeverity.critical,
      latestScore: latest?.summary.performanceScore || 0,
      healthStatus: latest?.summary.overallHealth || 'unknown'
    };
  }

  /**
   * Configure monitoring
   */
  static configure(config: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...config };
    logPerformance('Performance monitor configured:', this.config);
  }

  /**
   * Stop monitoring
   */
  static stopMonitoring(): void {
    this.isMonitoring = false;

    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }

    logPerformance('📊 Performance monitoring stopped');
  }
}

export default PerformanceMonitor;