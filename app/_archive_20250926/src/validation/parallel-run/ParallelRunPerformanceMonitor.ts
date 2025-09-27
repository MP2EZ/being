/**
 * Parallel Run Performance Monitor - Phase 5E: Real-Time Performance Validation
 * 
 * MISSION: Monitor <200ms crisis, <500ms assessment, data integrity preservation
 * CRITICAL: Real-time performance tracking with automated alerting
 */

import { ISODateString, createISODateString } from '../../types/clinical';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Performance Thresholds (IMMUTABLE)
const PERFORMANCE_THRESHOLDS = {
  CRISIS_RESPONSE: 200,     // <200ms crisis response
  ASSESSMENT_LOAD: 500,     // <500ms assessment loading
  USER_INTERACTION: 1000,   // <1s user interactions
  SETTINGS_UPDATE: 800,     // <800ms settings updates
  DATA_SYNC: 2000          // <2s data synchronization
} as const;

// Performance Metrics
interface PerformanceMetric {
  timestamp: ISODateString;
  operation: string;
  store: 'USER' | 'ASSESSMENT' | 'CRISIS' | 'SETTINGS';
  responseTime: number;
  threshold: number;
  passed: boolean;
  metadata: {
    oldStoreTime?: number;
    clinicalStoreTime?: number;
    validationTime?: number;
    dataSize?: number;
  };
}

interface PerformanceSample {
  store: string;
  operation: string;
  samples: number[];
  average: number;
  percentile95: number;
  percentile99: number;
  violationRate: number; // Percentage of operations exceeding threshold
}

interface PerformanceAlert {
  id: string;
  timestamp: ISODateString;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  type: 'THRESHOLD_VIOLATION' | 'PERFORMANCE_DEGRADATION' | 'STORE_COMPARISON' | 'TREND_ANOMALY';
  store: string;
  description: string;
  metrics: {
    current: number;
    threshold: number;
    deviation: number;
  };
  autoResolved: boolean;
}

interface PerformanceReport {
  startTime: ISODateString;
  endTime: ISODateString;
  totalOperations: number;
  storePerformance: Map<string, PerformanceSample>;
  alerts: PerformanceAlert[];
  complianceRate: number; // Percentage of operations meeting thresholds
  healthScore: number; // 0-100 overall performance health
}

class ParallelRunPerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private performanceSamples: Map<string, number[]> = new Map();

  constructor() {
    this.initializePerformanceSamples();
  }

  /**
   * Initialize performance sample tracking
   */
  private initializePerformanceSamples(): void {
    const stores = ['USER', 'ASSESSMENT', 'CRISIS', 'SETTINGS'];
    const operations = ['READ', 'write', 'update', 'delete', 'calculate', 'validate'];

    stores.forEach(store => {
      operations.forEach(operation => {
        const key = `${store}_${operation}`;
        this.performanceSamples.set(key, []);
      });
    });
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.warn('Performance monitoring already active');
      return;
    }

    console.log('📊 Starting parallel run performance monitoring');
    this.isMonitoring = true;

    // Monitor every 10 seconds
    this.monitoringInterval = setInterval(() => {
      this.performPerformanceAnalysis();
    }, 10000);

    // Store monitoring start
    AsyncStorage.setItem('PERFORMANCE_MONITORING_STATUS', JSON.stringify({
      active: true,
      startTime: createISODateString()
    }));
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    console.log('📊 Stopping parallel run performance monitoring');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    AsyncStorage.setItem('PERFORMANCE_MONITORING_STATUS', JSON.stringify({
      active: false,
      stopTime: createISODateString()
    }));
  }

  /**
   * Record performance metric
   */
  recordMetric(
    operation: string,
    store: 'USER' | 'ASSESSMENT' | 'CRISIS' | 'SETTINGS',
    responseTime: number,
    metadata: PerformanceMetric['metadata'] = {}
  ): void {
    const threshold = this.getThreshold(store, operation);
    const passed = responseTime <= threshold;

    const metric: PerformanceMetric = {
      timestamp: createISODateString(),
      operation,
      store,
      responseTime,
      threshold,
      passed,
      metadata
    };

    this.metrics.push(metric);
    
    // Update samples
    const key = `${store}_${operation}`;
    if (!this.performanceSamples.has(key)) {
      this.performanceSamples.set(key, []);
    }
    
    const samples = this.performanceSamples.get(key)!;
    samples.push(responseTime);
    
    // Keep only last 1000 samples per operation
    if (samples.length > 1000) {
      samples.shift();
    }

    // Check for immediate violations
    if (!passed) {
      this.handlePerformanceViolation(metric);
    }

    // Log critical violations immediately
    if (store === 'CRISIS' && responseTime > PERFORMANCE_THRESHOLDS.CRISIS_RESPONSE) {
      console.error('🚨 CRITICAL: Crisis response time violation:', responseTime, 'ms');
    }

    // Persist metric (async, don't block)
    this.persistMetric(metric);
  }

  /**
   * Get performance threshold for operation
   */
  private getThreshold(store: string, operation: string): number {
    switch (store) {
      case 'CRISIS':
        return PERFORMANCE_THRESHOLDS.CRISIS_RESPONSE;
      case 'ASSESSMENT':
        return PERFORMANCE_THRESHOLDS.ASSESSMENT_LOAD;
      case 'USER':
        return PERFORMANCE_THRESHOLDS.USER_INTERACTION;
      case 'SETTINGS':
        return PERFORMANCE_THRESHOLDS.SETTINGS_UPDATE;
      default:
        return 1000;
    }
  }

  /**
   * Handle performance violation
   */
  private async handlePerformanceViolation(metric: PerformanceMetric): Promise<void> {
    const severity = this.assessViolationSeverity(metric);
    
    const alert: PerformanceAlert = {
      id: `PERF_${Date.now()}`,
      timestamp: createISODateString(),
      severity,
      type: 'THRESHOLD_VIOLATION',
      store: metric.store,
      description: `${metric.operation} operation exceeded ${metric.threshold}ms threshold`,
      metrics: {
        current: metric.responseTime,
        threshold: metric.threshold,
        deviation: ((metric.responseTime - metric.threshold) / metric.threshold) * 100
      },
      autoResolved: false
    };

    this.alerts.push(alert);
    await this.persistAlert(alert);

    console.warn('⚠️ Performance violation:', alert);
  }

  /**
   * Assess violation severity
   */
  private assessViolationSeverity(metric: PerformanceMetric): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
    const deviation = metric.responseTime / metric.threshold;

    // Crisis operations are always critical if they exceed threshold
    if (metric.store === 'CRISIS') {
      return 'CRITICAL';
    }

    // Assessment operations with significant deviations
    if (metric.store === 'ASSESSMENT' && deviation > 2) {
      return 'HIGH';
    }

    // Moderate deviations
    if (deviation > 3) {
      return 'HIGH';
    } else if (deviation > 2) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  /**
   * Perform periodic performance analysis
   */
  private async performPerformanceAnalysis(): Promise<void> {
    if (!this.isMonitoring) return;

    // Analyze recent performance trends
    const recentMetrics = this.getRecentMetrics(60000); // Last minute
    
    // Check for performance degradation
    await this.detectPerformanceDegradation(recentMetrics);
    
    // Check store comparison anomalies
    await this.detectStoreComparisonAnomalies(recentMetrics);
    
    // Update performance samples
    this.updatePerformanceSamples();
    
    // Log analysis summary
    console.log('📊 Performance analysis completed:', {
      recentOperations: recentMetrics.length,
      activeAlerts: this.alerts.filter(a => !a.autoResolved).length,
      healthScore: this.calculateHealthScore()
    });
  }

  /**
   * Get recent metrics within timeframe
   */
  private getRecentMetrics(timeframeMs: number): PerformanceMetric[] {
    const cutoffTime = Date.now() - timeframeMs;
    return this.metrics.filter(metric => 
      new Date(metric.timestamp).getTime() >= cutoffTime
    );
  }

  /**
   * Detect performance degradation trends
   */
  private async detectPerformanceDegradation(recentMetrics: PerformanceMetric[]): Promise<void> {
    const storeGroups = this.groupMetricsByStore(recentMetrics);

    for (const [store, metrics] of storeGroups.entries()) {
      if (metrics.length < 10) continue; // Need sufficient data

      const responseTimes = metrics.map(m => m.responseTime);
      const trend = this.calculateTrend(responseTimes);

      // Detect upward trend in response times (degradation)
      if (trend.slope > 5 && trend.correlation > 0.7) { // >5ms increase per operation, strong correlation
        const alert: PerformanceAlert = {
          id: `DEGRADATION_${store}_${Date.now()}`,
          timestamp: createISODateString(),
          severity: store === 'CRISIS' ? 'CRITICAL' : 'HIGH',
          type: 'PERFORMANCE_DEGRADATION',
          store,
          description: `Performance degradation detected: ${trend.slope.toFixed(1)}ms increase per operation`,
          metrics: {
            current: responseTimes[responseTimes.length - 1],
            threshold: this.getThreshold(store, 'average'),
            deviation: trend.slope
          },
          autoResolved: false
        };

        this.alerts.push(alert);
        await this.persistAlert(alert);
      }
    }
  }

  /**
   * Detect store comparison anomalies
   */
  private async detectStoreComparisonAnomalies(recentMetrics: PerformanceMetric[]): Promise<void> {
    const metricsWithComparison = recentMetrics.filter(m => 
      m.metadata.oldStoreTime && m.metadata.clinicalStoreTime
    );

    for (const metric of metricsWithComparison) {
      const oldTime = metric.metadata.oldStoreTime!;
      const clinicalTime = metric.metadata.clinicalStoreTime!;
      const difference = Math.abs(clinicalTime - oldTime);
      const percentageDiff = (difference / oldTime) * 100;

      // Alert if clinical store is significantly slower than old store
      if (clinicalTime > oldTime && percentageDiff > 50) { // >50% slower
        const alert: PerformanceAlert = {
          id: `COMPARISON_${metric.store}_${Date.now()}`,
          timestamp: createISODateString(),
          severity: percentageDiff > 100 ? 'HIGH' : 'MEDIUM',
          type: 'STORE_COMPARISON',
          store: metric.store,
          description: `Clinical pattern store ${percentageDiff.toFixed(1)}% slower than old store`,
          metrics: {
            current: clinicalTime,
            threshold: oldTime,
            deviation: percentageDiff
          },
          autoResolved: false
        };

        this.alerts.push(alert);
        await this.persistAlert(alert);
      }
    }
  }

  /**
   * Group metrics by store
   */
  private groupMetricsByStore(metrics: PerformanceMetric[]): Map<string, PerformanceMetric[]> {
    const groups = new Map<string, PerformanceMetric[]>();

    for (const metric of metrics) {
      if (!groups.has(metric.store)) {
        groups.set(metric.store, []);
      }
      groups.get(metric.store)!.push(metric);
    }

    return groups;
  }

  /**
   * Calculate trend (linear regression)
   */
  private calculateTrend(values: number[]): { slope: number; correlation: number } {
    if (values.length < 2) return { slope: 0, correlation: 0 };

    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Calculate correlation coefficient
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    const correlation = denominator === 0 ? 0 : numerator / denominator;

    return { slope, correlation };
  }

  /**
   * Update performance samples for reporting
   */
  private updatePerformanceSamples(): void {
    // Calculate statistics for each operation type
    for (const [key, samples] of this.performanceSamples.entries()) {
      if (samples.length === 0) continue;

      const sorted = [...samples].sort((a, b) => a - b);
      const average = samples.reduce((a, b) => a + b, 0) / samples.length;
      const percentile95 = sorted[Math.floor(sorted.length * 0.95)];
      const percentile99 = sorted[Math.floor(sorted.length * 0.99)];

      // Update sample statistics (stored in memory for quick access)
    }
  }

  /**
   * Calculate overall health score (0-100)
   */
  calculateHealthScore(): number {
    if (this.metrics.length === 0) return 100;

    const recentMetrics = this.getRecentMetrics(300000); // Last 5 minutes
    if (recentMetrics.length === 0) return 100;

    const passedMetrics = recentMetrics.filter(m => m.passed).length;
    const complianceRate = passedMetrics / recentMetrics.length;

    let score = complianceRate * 100;

    // Penalty for critical store violations
    const crisisViolations = recentMetrics.filter(m => 
      m.store === 'CRISIS' && !m.passed
    ).length;
    score -= crisisViolations * 20; // -20 points per crisis violation

    // Penalty for active alerts
    const activeAlerts = this.alerts.filter(a => !a.autoResolved).length;
    score -= activeAlerts * 5; // -5 points per active alert

    return Math.max(0, Math.round(score));
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(durationHours: number = 24): PerformanceReport {
    const endTime = createISODateString();
    const startTime = createISODateString(new Date(Date.now() - durationHours * 60 * 60 * 1000));
    
    const relevantMetrics = this.metrics.filter(m => {
      const metricTime = new Date(m.timestamp).getTime();
      const startTimeMs = new Date(startTime).getTime();
      return metricTime >= startTimeMs;
    });

    const storePerformance = new Map<string, PerformanceSample>();
    
    // Calculate performance samples for each store
    const storeGroups = this.groupMetricsByStore(relevantMetrics);
    for (const [store, metrics] of storeGroups.entries()) {
      const responseTimes = metrics.map(m => m.responseTime);
      const sorted = [...responseTimes].sort((a, b) => a - b);
      
      const average = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const percentile95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
      const percentile99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
      
      const violations = metrics.filter(m => !m.passed).length;
      const violationRate = (violations / metrics.length) * 100;

      storePerformance.set(store, {
        store,
        operation: 'all',
        samples: responseTimes,
        average: Math.round(average),
        percentile95: Math.round(percentile95),
        percentile99: Math.round(percentile99),
        violationRate: Math.round(violationRate * 100) / 100
      });
    }

    const totalPassed = relevantMetrics.filter(m => m.passed).length;
    const complianceRate = relevantMetrics.length > 0 ? 
      (totalPassed / relevantMetrics.length) * 100 : 100;

    return {
      startTime,
      endTime,
      totalOperations: relevantMetrics.length,
      storePerformance,
      alerts: this.alerts,
      complianceRate: Math.round(complianceRate * 100) / 100,
      healthScore: this.calculateHealthScore()
    };
  }

  /**
   * Persist performance metric
   */
  private async persistMetric(metric: PerformanceMetric): Promise<void> {
    try {
      const existingMetrics = await AsyncStorage.getItem('PERFORMANCE_METRICS');
      const metrics = existingMetrics ? JSON.parse(existingMetrics) : [];
      
      metrics.push(metric);
      
      // Keep only last 10000 metrics
      if (metrics.length > 10000) {
        metrics.splice(0, metrics.length - 10000);
      }
      
      await AsyncStorage.setItem('PERFORMANCE_METRICS', JSON.stringify(metrics));
    } catch (error) {
      console.warn('Failed to persist performance metric:', error);
    }
  }

  /**
   * Persist performance alert
   */
  private async persistAlert(alert: PerformanceAlert): Promise<void> {
    try {
      const existingAlerts = await AsyncStorage.getItem('PERFORMANCE_ALERTS');
      const alerts = existingAlerts ? JSON.parse(existingAlerts) : [];
      
      alerts.push(alert);
      
      // Keep only last 1000 alerts
      if (alerts.length > 1000) {
        alerts.splice(0, alerts.length - 1000);
      }
      
      await AsyncStorage.setItem('PERFORMANCE_ALERTS', JSON.stringify(alerts));
    } catch (error) {
      console.warn('Failed to persist performance alert:', error);
    }
  }

  /**
   * Get current monitoring status
   */
  getMonitoringStatus() {
    return {
      isMonitoring: this.isMonitoring,
      totalMetrics: this.metrics.length,
      totalAlerts: this.alerts.length,
      activeAlerts: this.alerts.filter(a => !a.autoResolved).length,
      healthScore: this.calculateHealthScore(),
      recentViolations: this.getRecentMetrics(60000).filter(m => !m.passed).length
    };
  }

  /**
   * Clear all performance data
   */
  async clearPerformanceData(): Promise<void> {
    this.metrics = [];
    this.alerts = [];
    this.performanceSamples.clear();
    this.initializePerformanceSamples();
    
    await AsyncStorage.multiRemove([
      'PERFORMANCE_METRICS',
      'PERFORMANCE_ALERTS',
      'PERFORMANCE_MONITORING_STATUS'
    ]);

    console.log('✅ Performance data cleared');
  }
}

export default ParallelRunPerformanceMonitor;
export type { 
  PerformanceMetric, 
  PerformanceSample, 
  PerformanceAlert, 
  PerformanceReport 
};
export { PERFORMANCE_THRESHOLDS };