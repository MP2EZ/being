/**
 * Performance Monitoring API - Real-time Sync Performance Optimization
 *
 * Implements comprehensive performance monitoring and optimization:
 * - Real-time performance metrics collection
 * - Crisis response time monitoring (<200ms guarantee)
 * - Network-aware sync adaptation
 * - Battery optimization protocols
 * - Performance-based sync scheduling
 * - Automatic optimization recommendations
 */

import { EventEmitter } from '../../utils/EventEmitter';
import { z } from 'zod';
import { CLOUD_CONSTANTS } from '../../types/cloud';
import { DataSensitivity } from '../security/EncryptionService';
import { securityControlsService } from '../security/SecurityControlsService';

/**
 * Performance metrics collection schemas
 */
const PerformanceMetricsSchema = z.object({
  timestamp: z.string().datetime(),
  operationType: z.enum(['crisis_sync', 'therapeutic_sync', 'general_sync', 'batch_sync']),
  responseTime: z.number().min(0),
  dataSize: z.number().min(0),
  networkType: z.enum(['wifi', 'cellular', 'offline']),
  batteryLevel: z.number().min(0).max(100),
  success: z.boolean(),
  errorCode: z.string().optional(),
  compressionRatio: z.number().min(0).max(1).optional(),
  retryCount: z.number().min(0),
  queueWaitTime: z.number().min(0).optional()
}).readonly();

const NetworkConditionsSchema = z.object({
  type: z.enum(['wifi', 'cellular', 'offline']),
  strength: z.number().min(0).max(100),
  latency: z.number().min(0),
  bandwidth: z.number().min(0),
  reliability: z.number().min(0).max(1)
}).readonly();

const BatteryStatusSchema = z.object({
  level: z.number().min(0).max(100),
  charging: z.boolean(),
  lowPowerMode: z.boolean()
}).readonly();

type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;
type NetworkConditions = z.infer<typeof NetworkConditionsSchema>;
type BatteryStatus = z.infer<typeof BatteryStatusSchema>;

/**
 * Performance thresholds and targets
 */
interface PerformanceThresholds {
  crisisResponseMaxMs: number;
  therapeuticSyncMaxMs: number;
  generalSyncMaxMs: number;
  successRateMin: number;
  networkLatencyMaxMs: number;
  batteryOptimizationThreshold: number;
}

/**
 * Performance optimization strategy
 */
interface OptimizationStrategy {
  batchSize: number;
  syncFrequency: number;
  compressionEnabled: boolean;
  priorityQueuing: boolean;
  networkAdaptation: boolean;
  batteryOptimization: boolean;
}

/**
 * Performance report interface
 */
interface PerformanceReport {
  timeRange: { start: string; end: string };
  metrics: {
    averageCrisisResponseTime: number;
    averageTherapeuticSyncTime: number;
    averageGeneralSyncTime: number;
    overallSuccessRate: number;
    totalOperations: number;
    crisisViolations: number;
  };
  networkAnalysis: {
    wifiPerformance: number;
    cellularPerformance: number;
    offlineQueue: number;
  };
  batteryImpact: {
    averageBatteryDrain: number;
    lowPowerModeOperations: number;
    chargingOptimizations: number;
  };
  recommendations: string[];
}

/**
 * Real-time performance collector
 */
class PerformanceCollector {
  private metrics: PerformanceMetrics[] = [];
  private maxMetricsHistory = 10000;
  private crisisViolations: number = 0;

  /**
   * Record performance metric
   */
  recordMetric(metric: PerformanceMetrics): void {
    try {
      PerformanceMetricsSchema.parse(metric);

      this.metrics.push(metric);

      // Maintain metrics history limit
      if (this.metrics.length > this.maxMetricsHistory) {
        this.metrics = this.metrics.slice(-this.maxMetricsHistory);
      }

      // Check for crisis response violations
      if (metric.operationType === 'crisis_sync' && metric.responseTime > 200) {
        this.crisisViolations++;
        console.warn(`Crisis sync violation: ${metric.responseTime}ms exceeds 200ms requirement`);
      }

    } catch (error) {
      console.error('Invalid performance metric:', error);
    }
  }

  /**
   * Get metrics for time range
   */
  getMetrics(since?: Date, until?: Date): PerformanceMetrics[] {
    let filtered = this.metrics;

    if (since) {
      filtered = filtered.filter(m => new Date(m.timestamp) >= since);
    }

    if (until) {
      filtered = filtered.filter(m => new Date(m.timestamp) <= until);
    }

    return filtered;
  }

  /**
   * Get performance statistics
   */
  getStatistics(timeRangeHours: number = 24): {
    averageResponseTime: number;
    successRate: number;
    operationCount: number;
    crisisViolations: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  } {
    const since = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
    const recentMetrics = this.getMetrics(since);

    if (recentMetrics.length === 0) {
      return {
        averageResponseTime: 0,
        successRate: 1,
        operationCount: 0,
        crisisViolations: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0
      };
    }

    const responseTimes = recentMetrics.map(m => m.responseTime).sort((a, b) => a - b);
    const successfulOps = recentMetrics.filter(m => m.success).length;

    return {
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      successRate: successfulOps / recentMetrics.length,
      operationCount: recentMetrics.length,
      crisisViolations: recentMetrics.filter(m =>
        m.operationType === 'crisis_sync' && m.responseTime > 200
      ).length,
      p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)] || 0,
      p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)] || 0
    };
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(olderThanHours: number = 168): void { // 7 days default
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => new Date(m.timestamp) > cutoff);
  }
}

/**
 * Network adapter for performance optimization
 */
class NetworkAdapter {
  private currentConditions: NetworkConditions = {
    type: 'wifi',
    strength: 100,
    latency: 50,
    bandwidth: 1000,
    reliability: 0.99
  };

  private adaptationRules = {
    wifi: {
      batchSize: 50,
      compressionThreshold: 1024,
      priorityQueuing: false
    },
    cellular: {
      batchSize: 25,
      compressionThreshold: 512,
      priorityQueuing: true
    },
    offline: {
      batchSize: 0,
      compressionThreshold: 0,
      priorityQueuing: true
    }
  };

  /**
   * Update network conditions
   */
  updateConditions(conditions: NetworkConditions): void {
    NetworkConditionsSchema.parse(conditions);
    this.currentConditions = conditions;
  }

  /**
   * Get adapted sync strategy
   */
  getAdaptedStrategy(): {
    batchSize: number;
    compressionEnabled: boolean;
    priorityQueuing: boolean;
    delayNonCritical: boolean;
  } {
    const rules = this.adaptationRules[this.currentConditions.type];

    return {
      batchSize: this.adaptBatchSize(rules.batchSize),
      compressionEnabled: this.currentConditions.bandwidth < 1000, // Enable compression on slow connections
      priorityQueuing: rules.priorityQueuing || this.currentConditions.reliability < 0.9,
      delayNonCritical: this.currentConditions.type === 'cellular' && this.currentConditions.strength < 50
    };
  }

  /**
   * Adapt batch size based on network conditions
   */
  private adaptBatchSize(baseBatchSize: number): number {
    const reliabilityFactor = this.currentConditions.reliability;
    const strengthFactor = this.currentConditions.strength / 100;

    return Math.max(1, Math.floor(baseBatchSize * reliabilityFactor * strengthFactor));
  }

  /**
   * Check if network is suitable for sync operation
   */
  isSuitableForSync(operationType: 'crisis' | 'therapeutic' | 'general'): boolean {
    if (operationType === 'crisis') {
      // Crisis sync always allowed unless completely offline
      return this.currentConditions.type !== 'offline';
    }

    if (operationType === 'therapeutic') {
      // Therapeutic sync requires reasonable network
      return this.currentConditions.type !== 'offline' &&
             this.currentConditions.reliability > 0.8;
    }

    // General sync can be deferred on poor networks
    return this.currentConditions.type === 'wifi' ||
           (this.currentConditions.type === 'cellular' && this.currentConditions.strength > 30);
  }
}

/**
 * Battery optimizer for sync operations
 */
class BatteryOptimizer {
  private currentStatus: BatteryStatus = {
    level: 100,
    charging: false,
    lowPowerMode: false
  };

  private optimizationStrategies = {
    critical: { // Battery < 20%
      deferNonCritical: true,
      reduceSyncFrequency: 0.5,
      enableAggressiveCompression: true,
      batchAggressively: true
    },
    low: { // Battery 20-40%
      deferNonCritical: false,
      reduceSyncFrequency: 0.8,
      enableAggressiveCompression: true,
      batchAggressively: true
    },
    normal: { // Battery 40%+
      deferNonCritical: false,
      reduceSyncFrequency: 1.0,
      enableAggressiveCompression: false,
      batchAggressively: false
    }
  };

  /**
   * Update battery status
   */
  updateStatus(status: BatteryStatus): void {
    BatteryStatusSchema.parse(status);
    this.currentStatus = status;
  }

  /**
   * Get battery-optimized sync strategy
   */
  getOptimizedStrategy(): {
    allowNonCritical: boolean;
    syncFrequencyMultiplier: number;
    compressionLevel: 'none' | 'standard' | 'aggressive';
    batchingStrategy: 'immediate' | 'delayed' | 'aggressive';
  } {
    const level = this.getBatteryLevel();
    const strategy = level === 'critical' ? this.optimizationStrategies.critical :
                    level === 'low' ? this.optimizationStrategies.low :
                    this.optimizationStrategies.normal;

    return {
      allowNonCritical: !strategy.deferNonCritical,
      syncFrequencyMultiplier: strategy.reduceSyncFrequency,
      compressionLevel: strategy.enableAggressiveCompression ? 'aggressive' : 'standard',
      batchingStrategy: strategy.batchAggressively ? 'aggressive' : 'immediate'
    };
  }

  /**
   * Check if operation should be deferred for battery conservation
   */
  shouldDefer(operationType: 'crisis' | 'therapeutic' | 'general'): boolean {
    if (operationType === 'crisis') {
      // Never defer crisis operations
      return false;
    }

    if (this.currentStatus.charging) {
      // Don't defer when charging
      return false;
    }

    if (this.currentStatus.lowPowerMode) {
      // Defer non-crisis operations in low power mode
      return operationType !== 'crisis';
    }

    // Defer general operations when battery is critical
    return this.getBatteryLevel() === 'critical' && operationType === 'general';
  }

  /**
   * Get battery level category
   */
  private getBatteryLevel(): 'critical' | 'low' | 'normal' {
    if (this.currentStatus.level < 20) return 'critical';
    if (this.currentStatus.level < 40) return 'low';
    return 'normal';
  }
}

/**
 * Main Performance Monitoring API Implementation
 */
export class PerformanceMonitoringAPI extends EventEmitter {
  private static instance: PerformanceMonitoringAPI;

  private collector = new PerformanceCollector();
  private networkAdapter = new NetworkAdapter();
  private batteryOptimizer = new BatteryOptimizer();

  private thresholds: PerformanceThresholds = {
    crisisResponseMaxMs: 200,
    therapeuticSyncMaxMs: 500,
    generalSyncMaxMs: 2000,
    successRateMin: 0.95,
    networkLatencyMaxMs: 200,
    batteryOptimizationThreshold: 40
  };

  private monitoringInterval: NodeJS.Timeout | null = null;
  private optimizationInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.startMonitoring();
  }

  public static getInstance(): PerformanceMonitoringAPI {
    if (!PerformanceMonitoringAPI.instance) {
      PerformanceMonitoringAPI.instance = new PerformanceMonitoringAPI();
    }
    return PerformanceMonitoringAPI.instance;
  }

  /**
   * Record sync operation performance
   */
  recordSyncPerformance(
    operationType: 'crisis_sync' | 'therapeutic_sync' | 'general_sync' | 'batch_sync',
    responseTime: number,
    dataSize: number,
    success: boolean,
    options?: {
      errorCode?: string;
      compressionRatio?: number;
      retryCount?: number;
      queueWaitTime?: number;
    }
  ): void {
    const metric: PerformanceMetrics = {
      timestamp: new Date().toISOString(),
      operationType,
      responseTime,
      dataSize,
      networkType: this.networkAdapter['currentConditions'].type,
      batteryLevel: this.batteryOptimizer['currentStatus'].level,
      success,
      errorCode: options?.errorCode,
      compressionRatio: options?.compressionRatio,
      retryCount: options?.retryCount || 0,
      queueWaitTime: options?.queueWaitTime
    };

    this.collector.recordMetric(metric);

    // Emit performance events
    if (operationType === 'crisis_sync' && responseTime > this.thresholds.crisisResponseMaxMs) {
      this.emit('crisisPerformanceViolation', {
        responseTime,
        threshold: this.thresholds.crisisResponseMaxMs,
        timestamp: metric.timestamp
      });
    }

    // Check for performance degradation
    this.checkPerformanceDegradation();
  }

  /**
   * Update network conditions for adaptation
   */
  updateNetworkConditions(conditions: NetworkConditions): void {
    this.networkAdapter.updateConditions(conditions);
    this.emit('networkConditionsChanged', conditions);

    // Trigger optimization if conditions changed significantly
    this.optimizeForCurrentConditions();
  }

  /**
   * Update battery status for optimization
   */
  updateBatteryStatus(status: BatteryStatus): void {
    this.batteryOptimizer.updateStatus(status);
    this.emit('batteryStatusChanged', status);

    // Trigger optimization if battery level changed significantly
    this.optimizeForCurrentConditions();
  }

  /**
   * Get current sync strategy recommendation
   */
  getCurrentSyncStrategy(): {
    batchSize: number;
    compressionEnabled: boolean;
    priorityQueuing: boolean;
    allowNonCritical: boolean;
    syncFrequency: number;
    networkOptimized: boolean;
    batteryOptimized: boolean;
  } {
    const networkStrategy = this.networkAdapter.getAdaptedStrategy();
    const batteryStrategy = this.batteryOptimizer.getOptimizedStrategy();

    return {
      batchSize: Math.min(networkStrategy.batchSize,
                         batteryStrategy.batchingStrategy === 'aggressive' ? 100 : 50),
      compressionEnabled: networkStrategy.compressionEnabled ||
                         batteryStrategy.compressionLevel !== 'none',
      priorityQueuing: networkStrategy.priorityQueuing,
      allowNonCritical: batteryStrategy.allowNonCritical && !networkStrategy.delayNonCritical,
      syncFrequency: batteryStrategy.syncFrequencyMultiplier,
      networkOptimized: true,
      batteryOptimized: true
    };
  }

  /**
   * Check if sync operation is recommended
   */
  isSyncRecommended(operationType: 'crisis' | 'therapeutic' | 'general'): {
    recommended: boolean;
    reason?: string;
    delay?: number;
  } {
    // Always allow crisis operations
    if (operationType === 'crisis') {
      return { recommended: true };
    }

    // Check network suitability
    if (!this.networkAdapter.isSuitableForSync(operationType)) {
      return {
        recommended: false,
        reason: 'Network conditions not suitable',
        delay: 30000 // 30 seconds
      };
    }

    // Check battery optimization
    if (this.batteryOptimizer.shouldDefer(operationType)) {
      return {
        recommended: false,
        reason: 'Battery optimization - operation deferred',
        delay: 300000 // 5 minutes
      };
    }

    return { recommended: true };
  }

  /**
   * Get performance report
   */
  generatePerformanceReport(timeRangeHours: number = 24): PerformanceReport {
    const since = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
    const until = new Date();
    const metrics = this.collector.getMetrics(since, until);
    const stats = this.collector.getStatistics(timeRangeHours);

    // Analyze metrics by operation type
    const crisisMetrics = metrics.filter(m => m.operationType === 'crisis_sync');
    const therapeuticMetrics = metrics.filter(m => m.operationType === 'therapeutic_sync');
    const generalMetrics = metrics.filter(m => m.operationType === 'general_sync');

    // Calculate averages
    const avgCrisisTime = crisisMetrics.length > 0
      ? crisisMetrics.reduce((sum, m) => sum + m.responseTime, 0) / crisisMetrics.length
      : 0;

    const avgTherapeuticTime = therapeuticMetrics.length > 0
      ? therapeuticMetrics.reduce((sum, m) => sum + m.responseTime, 0) / therapeuticMetrics.length
      : 0;

    const avgGeneralTime = generalMetrics.length > 0
      ? generalMetrics.reduce((sum, m) => sum + m.responseTime, 0) / generalMetrics.length
      : 0;

    // Network analysis
    const wifiMetrics = metrics.filter(m => m.networkType === 'wifi');
    const cellularMetrics = metrics.filter(m => m.networkType === 'cellular');
    const offlineMetrics = metrics.filter(m => m.networkType === 'offline');

    const wifiSuccessRate = wifiMetrics.length > 0
      ? wifiMetrics.filter(m => m.success).length / wifiMetrics.length
      : 1;

    const cellularSuccessRate = cellularMetrics.length > 0
      ? cellularMetrics.filter(m => m.success).length / cellularMetrics.length
      : 1;

    // Battery analysis
    const lowBatteryMetrics = metrics.filter(m => m.batteryLevel < 40);
    const chargingMetrics = metrics.filter(m => m.batteryLevel > 80); // Assume charging when high

    // Generate recommendations
    const recommendations = this.generateRecommendations(stats, metrics);

    return {
      timeRange: {
        start: since.toISOString(),
        end: until.toISOString()
      },
      metrics: {
        averageCrisisResponseTime: avgCrisisTime,
        averageTherapeuticSyncTime: avgTherapeuticTime,
        averageGeneralSyncTime: avgGeneralTime,
        overallSuccessRate: stats.successRate,
        totalOperations: stats.operationCount,
        crisisViolations: stats.crisisViolations
      },
      networkAnalysis: {
        wifiPerformance: wifiSuccessRate,
        cellularPerformance: cellularSuccessRate,
        offlineQueue: offlineMetrics.length
      },
      batteryImpact: {
        averageBatteryDrain: 0, // Would calculate from battery level changes
        lowPowerModeOperations: lowBatteryMetrics.length,
        chargingOptimizations: chargingMetrics.length
      },
      recommendations
    };
  }

  /**
   * Get real-time performance metrics
   */
  getRealTimeMetrics(): {
    currentResponseTime: number;
    recentSuccessRate: number;
    queueSize: number;
    networkStatus: string;
    batteryLevel: number;
    optimizationActive: boolean;
  } {
    const recentStats = this.collector.getStatistics(1); // Last hour

    return {
      currentResponseTime: recentStats.averageResponseTime,
      recentSuccessRate: recentStats.successRate,
      queueSize: 0, // Would get from queue manager
      networkStatus: this.networkAdapter['currentConditions'].type,
      batteryLevel: this.batteryOptimizer['currentStatus'].level,
      optimizationActive: true
    };
  }

  /**
   * Start continuous performance monitoring
   */
  private startMonitoring(): void {
    // Monitor performance every minute
    this.monitoringInterval = setInterval(() => {
      this.performRoutineMonitoring();
    }, 60000);

    // Run optimization every 5 minutes
    this.optimizationInterval = setInterval(() => {
      this.optimizeForCurrentConditions();
    }, 300000);
  }

  /**
   * Perform routine monitoring checks
   */
  private performRoutineMonitoring(): void {
    const stats = this.collector.getStatistics(1); // Last hour

    // Check performance thresholds
    if (stats.successRate < this.thresholds.successRateMin) {
      this.emit('performanceDegradation', {
        type: 'success_rate',
        current: stats.successRate,
        threshold: this.thresholds.successRateMin
      });
    }

    if (stats.p95ResponseTime > this.thresholds.generalSyncMaxMs) {
      this.emit('performanceDegradation', {
        type: 'response_time',
        current: stats.p95ResponseTime,
        threshold: this.thresholds.generalSyncMaxMs
      });
    }

    // Cleanup old metrics
    this.collector.clearOldMetrics();
  }

  /**
   * Check for performance degradation
   */
  private checkPerformanceDegradation(): void {
    const recentStats = this.collector.getStatistics(0.5); // Last 30 minutes

    if (recentStats.operationCount < 10) {
      return; // Not enough data
    }

    if (recentStats.successRate < 0.8) {
      this.emit('performanceAlert', {
        type: 'high_failure_rate',
        severity: 'high',
        value: recentStats.successRate
      });
    }

    if (recentStats.crisisViolations > 0) {
      this.emit('performanceAlert', {
        type: 'crisis_violations',
        severity: 'critical',
        value: recentStats.crisisViolations
      });
    }
  }

  /**
   * Optimize for current network and battery conditions
   */
  private optimizeForCurrentConditions(): void {
    const strategy = this.getCurrentSyncStrategy();

    this.emit('strategyUpdated', strategy);

    // Log optimization event
    this.logOptimizationEvent(strategy);
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    stats: any,
    metrics: PerformanceMetrics[]
  ): string[] {
    const recommendations: string[] = [];

    if (stats.crisisViolations > 0) {
      recommendations.push('Crisis response time violations detected - consider network optimization');
    }

    if (stats.successRate < 0.95) {
      recommendations.push('Low success rate - check network connectivity and retry logic');
    }

    if (stats.p95ResponseTime > 1000) {
      recommendations.push('High response times - enable compression and reduce batch sizes');
    }

    const cellularMetrics = metrics.filter(m => m.networkType === 'cellular');
    if (cellularMetrics.length > metrics.length * 0.5) {
      recommendations.push('High cellular usage - consider WiFi-only sync for non-critical data');
    }

    const lowBatteryMetrics = metrics.filter(m => m.batteryLevel < 20);
    if (lowBatteryMetrics.length > metrics.length * 0.2) {
      recommendations.push('Frequent low battery sync - enable aggressive battery optimization');
    }

    return recommendations;
  }

  /**
   * Log optimization event for audit
   */
  private async logOptimizationEvent(strategy: any): Promise<void> {
    try {
      await securityControlsService.logAuditEntry({
        operation: 'performance_optimization',
        entityType: 'system',
        entityId: 'sync_performance',
        dataSensitivity: DataSensitivity.SYSTEM,
        userId: 'system',
        securityContext: {
          authenticated: true,
          biometricUsed: false,
          deviceTrusted: true,
          networkSecure: true,
          encryptionActive: true
        },
        operationMetadata: {
          success: true,
          duration: 0,
          additionalContext: { strategy }
        },
        complianceMarkers: {
          hipaaRequired: false,
          auditRequired: true,
          retentionDays: 365
        }
      });
    } catch (error) {
      console.warn('Failed to log optimization event:', error);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }

    this.removeAllListeners();
  }
}

// Export singleton instance
export const performanceMonitoringAPI = PerformanceMonitoringAPI.getInstance();