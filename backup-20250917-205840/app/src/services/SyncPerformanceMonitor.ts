/**
 * Sync Performance Monitor - Real-time monitoring of sync operations
 * Clinical-grade performance tracking with therapeutic impact assessment
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncOrchestrationService } from './SyncOrchestrationService';
import { networkAwareService } from './NetworkAwareService';
import {
  SyncPerformanceMetrics,
  SyncEntityType,
  SyncStatus,
  ClinicalImpactLevel,
  SYNC_CONSTANTS
} from '../types/sync';
import { NetworkQuality } from '../types/offline';

/**
 * Performance threshold configuration
 */
interface PerformanceThresholds {
  readonly maxOperationTime: number; // milliseconds
  readonly maxBatchSize: number;
  readonly maxMemoryUsage: number; // MB
  readonly maxNetworkLatency: number; // milliseconds
  readonly minBatteryLevel: number; // 0-1
  readonly clinicalDataTimeout: number; // milliseconds
}

/**
 * Performance alert configuration
 */
interface PerformanceAlert {
  readonly id: string;
  readonly type: PerformanceAlertType;
  readonly severity: 'info' | 'warning' | 'error' | 'critical';
  readonly message: string;
  readonly entityType?: SyncEntityType;
  readonly metrics: Partial<SyncPerformanceMetrics>;
  readonly recommendations: readonly string[];
  readonly timestamp: string;
  readonly clinicalImpact: ClinicalImpactLevel;
}

/**
 * Types of performance alerts
 */
enum PerformanceAlertType {
  SLOW_OPERATION = 'slow_operation',
  HIGH_MEMORY_USAGE = 'high_memory_usage',
  NETWORK_DEGRADATION = 'network_degradation',
  BATTERY_LOW = 'battery_low',
  CLINICAL_TIMEOUT = 'clinical_timeout',
  SYNC_QUEUE_OVERFLOW = 'sync_queue_overflow',
  CONFLICT_RESOLUTION_SLOW = 'conflict_resolution_slow'
}

/**
 * Performance monitoring session
 */
interface PerformanceSession {
  readonly id: string;
  readonly startTime: number;
  readonly endTime?: number;
  readonly operationType: string;
  readonly entityType: SyncEntityType;
  readonly metrics: SyncPerformanceMetrics;
  readonly networkQuality: NetworkQuality;
  readonly batteryLevel?: number;
  readonly alerts: readonly PerformanceAlert[];
}

/**
 * Sync performance monitoring service
 */
class SyncPerformanceMonitor {
  private readonly METRICS_KEY = '@fullmind_sync_performance_metrics';
  private readonly ALERTS_KEY = '@fullmind_sync_performance_alerts';
  private readonly SESSION_KEY = '@fullmind_sync_performance_sessions';
  
  // Performance thresholds
  private readonly thresholds: PerformanceThresholds = {
    maxOperationTime: SYNC_CONSTANTS.DEFAULT_TIMEOUT,
    maxBatchSize: SYNC_CONSTANTS.DEFAULT_BATCH_SIZE,
    maxMemoryUsage: SYNC_CONSTANTS.MAX_MEMORY_USAGE_MB,
    maxNetworkLatency: SYNC_CONSTANTS.POOR_LATENCY_MS,
    minBatteryLevel: SYNC_CONSTANTS.MIN_BATTERY_FOR_BACKGROUND_SYNC,
    clinicalDataTimeout: SYNC_CONSTANTS.CRITICAL_TIMEOUT
  };
  
  // Monitoring state
  private isMonitoring = false;
  private activeSessions = new Map<string, PerformanceSession>();
  private alerts: PerformanceAlert[] = [];
  private historicalMetrics: SyncPerformanceMetrics[] = [];
  
  // Event listeners
  private readonly listeners = new Map<string, Set<Function>>();
  
  // Monitoring intervals
  private metricsInterval?: NodeJS.Timeout;
  private alertCheckInterval?: NodeJS.Timeout;

  /**
   * Initialize performance monitoring
   */
  async initialize(): Promise<void> {
    if (this.isMonitoring) return;

    try {
      // Load persisted data
      await this.loadPersistedData();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Start monitoring intervals
      this.startMonitoring();
      
      this.isMonitoring = true;
      this.emit('monitoring_started', { timestamp: new Date().toISOString() });
      
    } catch (error) {
      throw new Error(`Failed to initialize sync performance monitor: ${error.message}`);
    }
  }

  /**
   * Start a performance monitoring session
   */
  startSession(operationType: string, entityType: SyncEntityType): string {
    const sessionId = `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: PerformanceSession = {
      id: sessionId,
      startTime: Date.now(),
      operationType,
      entityType,
      metrics: this.getCurrentMetrics(),
      networkQuality: networkAwareService.getNetworkState().quality,
      alerts: []
    };
    
    this.activeSessions.set(sessionId, session);
    
    // Set timeout for clinical data operations
    if (this.isClinicalEntityType(entityType)) {
      setTimeout(() => {
        this.checkClinicalTimeout(sessionId);
      }, this.thresholds.clinicalDataTimeout);
    }
    
    return sessionId;
  }

  /**
   * End a performance monitoring session
   */
  endSession(sessionId: string, success: boolean = true): PerformanceSession | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;
    
    const endTime = Date.now();
    const duration = endTime - session.startTime;
    
    const completedSession: PerformanceSession = {
      ...session,
      endTime,
      metrics: {
        ...this.getCurrentMetrics(),
        averageOperationTime: duration
      }
    };
    
    // Check for performance issues
    this.analyzeSessionPerformance(completedSession, success);
    
    // Remove from active sessions
    this.activeSessions.delete(sessionId);
    
    // Persist session data
    this.persistSessionData(completedSession);
    
    return completedSession;
  }

  /**
   * Record performance metrics
   */
  recordMetrics(metrics: Partial<SyncPerformanceMetrics>): void {
    const currentMetrics = this.getCurrentMetrics();
    const updatedMetrics: SyncPerformanceMetrics = {
      ...currentMetrics,
      ...metrics,
      lastMeasurement: new Date().toISOString()
    };
    
    this.historicalMetrics.push(updatedMetrics);
    
    // Keep only last 100 measurements
    if (this.historicalMetrics.length > 100) {
      this.historicalMetrics = this.historicalMetrics.slice(-100);
    }
    
    // Check for threshold violations
    this.checkThresholds(updatedMetrics);
    
    this.emit('metrics_updated', { metrics: updatedMetrics });
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): SyncPerformanceMetrics {
    const networkState = networkAwareService.getNetworkState();
    
    return {
      operationsPerSecond: this.calculateOperationsPerSecond(),
      averageOperationTime: this.calculateAverageOperationTime(),
      networkLatency: networkState.latency || 0,
      dataTransferRate: this.calculateDataTransferRate(),
      conflictResolutionTime: this.calculateConflictResolutionTime(),
      clinicalValidationTime: this.calculateClinicalValidationTime(),
      memoryUsage: this.estimateMemoryUsage(),
      batteryImpact: this.calculateBatteryImpact(),
      lastMeasurement: new Date().toISOString()
    };
  }

  /**
   * Get performance alerts
   */
  getAlerts(entityType?: SyncEntityType): PerformanceAlert[] {
    if (entityType) {
      return this.alerts.filter(alert => alert.entityType === entityType);
    }
    return [...this.alerts];
  }

  /**
   * Clear performance alerts
   */
  clearAlerts(alertType?: PerformanceAlertType): void {
    if (alertType) {
      this.alerts = this.alerts.filter(alert => alert.type !== alertType);
    } else {
      this.alerts = [];
    }
    
    this.persistAlerts();
    this.emit('alerts_cleared', { alertType });
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
    criticalAlerts: number;
    averageOperationTime: number;
    networkQuality: NetworkQuality;
    recommendations: string[];
  } {
    const criticalAlerts = this.alerts.filter(alert => alert.severity === 'critical').length;
    const currentMetrics = this.getCurrentMetrics();
    const networkQuality = networkAwareService.getNetworkState().quality;
    
    let overallHealth: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
    const recommendations: string[] = [];
    
    // Assess health based on metrics and alerts
    if (criticalAlerts > 0) {
      overallHealth = 'poor';
      recommendations.push('Address critical performance issues immediately');
    } else if (currentMetrics.averageOperationTime > this.thresholds.maxOperationTime) {
      overallHealth = 'fair';
      recommendations.push('Optimize sync operations for better performance');
    } else if (networkQuality === NetworkQuality.POOR) {
      overallHealth = 'good';
      recommendations.push('Network quality may affect sync performance');
    }
    
    if (currentMetrics.memoryUsage > this.thresholds.maxMemoryUsage * 0.8) {
      recommendations.push('Monitor memory usage during sync operations');
    }
    
    return {
      overallHealth,
      criticalAlerts,
      averageOperationTime: currentMetrics.averageOperationTime,
      networkQuality,
      recommendations
    };
  }

  /**
   * Setup event listeners for sync events
   */
  private setupEventListeners(): void {
    // Listen to sync orchestration events
    syncOrchestrationService.addEventListener('sync_status_changed', this.handleSyncStatusChanged.bind(this));
    syncOrchestrationService.addEventListener('sync_progress_updated', this.handleSyncProgress.bind(this));
    
    // Listen to network events
    networkAwareService.addEventListener('network_state_changed', this.handleNetworkChange.bind(this));
  }

  /**
   * Start monitoring intervals
   */
  private startMonitoring(): void {
    // Record metrics every 10 seconds
    this.metricsInterval = setInterval(() => {
      this.recordMetrics({});
    }, 10000);
    
    // Check for alerts every 30 seconds
    this.alertCheckInterval = setInterval(() => {
      this.checkForAlerts();
    }, 30000);
  }

  /**
   * Handle sync status changes
   */
  private handleSyncStatusChanged(event: any): void {
    const { status, timestamp } = event;
    
    if (status === SyncStatus.SYNCING) {
      // Start tracking operation time
      this.recordMetrics({
        lastMeasurement: timestamp
      });
    }
  }

  /**
   * Handle sync progress updates
   */
  private handleSyncProgress(event: any): void {
    const { progress } = event;
    
    if (progress) {
      this.recordMetrics({
        operationsPerSecond: progress.completed / ((Date.now() - new Date(progress.startedAt).getTime()) / 1000)
      });
    }
  }

  /**
   * Handle network state changes
   */
  private handleNetworkChange(event: any): void {
    const { networkState } = event;
    
    this.recordMetrics({
      networkLatency: networkState.latency || 0
    });
    
    // Alert on significant network degradation
    if (networkState.quality === NetworkQuality.POOR) {
      this.createAlert({
        type: PerformanceAlertType.NETWORK_DEGRADATION,
        severity: 'warning',
        message: 'Network quality degraded, sync performance may be affected',
        recommendations: [
          'Consider deferring non-critical sync operations',
          'Ensure critical data is prioritized for sync'
        ],
        clinicalImpact: ClinicalImpactLevel.LOW
      });
    }
  }

  /**
   * Analyze session performance and create alerts if needed
   */
  private analyzeSessionPerformance(session: PerformanceSession, success: boolean): void {
    const duration = (session.endTime || Date.now()) - session.startTime;
    
    // Check operation timeout
    const timeoutThreshold = this.isClinicalEntityType(session.entityType) 
      ? this.thresholds.clinicalDataTimeout 
      : this.thresholds.maxOperationTime;
    
    if (duration > timeoutThreshold) {
      this.createAlert({
        type: this.isClinicalEntityType(session.entityType) 
          ? PerformanceAlertType.CLINICAL_TIMEOUT 
          : PerformanceAlertType.SLOW_OPERATION,
        severity: this.isClinicalEntityType(session.entityType) ? 'critical' : 'warning',
        message: `${session.operationType} operation took ${duration}ms (threshold: ${timeoutThreshold}ms)`,
        entityType: session.entityType,
        recommendations: [
          'Consider optimizing operation performance',
          'Check network connectivity',
          'Review data size and complexity'
        ],
        clinicalImpact: this.isClinicalEntityType(session.entityType) 
          ? ClinicalImpactLevel.HIGH 
          : ClinicalImpactLevel.LOW
      });
    }
    
    // Check for operation failure
    if (!success) {
      this.createAlert({
        type: PerformanceAlertType.SLOW_OPERATION,
        severity: 'error',
        message: `${session.operationType} operation failed after ${duration}ms`,
        entityType: session.entityType,
        recommendations: [
          'Check error logs for details',
          'Verify data integrity',
          'Consider manual retry'
        ],
        clinicalImpact: this.isClinicalEntityType(session.entityType) 
          ? ClinicalImpactLevel.HIGH 
          : ClinicalImpactLevel.MODERATE
      });
    }
  }

  /**
   * Check for clinical data operation timeout
   */
  private checkClinicalTimeout(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;
    
    const duration = Date.now() - session.startTime;
    
    if (duration >= this.thresholds.clinicalDataTimeout) {
      this.createAlert({
        type: PerformanceAlertType.CLINICAL_TIMEOUT,
        severity: 'critical',
        message: `Clinical data operation exceeded timeout (${duration}ms)`,
        entityType: session.entityType,
        recommendations: [
          'Investigate immediate clinical data sync issues',
          'Consider emergency sync protocols',
          'Verify data integrity post-timeout'
        ],
        clinicalImpact: ClinicalImpactLevel.CRITICAL
      });
    }
  }

  /**
   * Check performance thresholds
   */
  private checkThresholds(metrics: SyncPerformanceMetrics): void {
    // Memory usage check
    if (metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      this.createAlert({
        type: PerformanceAlertType.HIGH_MEMORY_USAGE,
        severity: 'warning',
        message: `Memory usage (${metrics.memoryUsage}MB) exceeds threshold (${this.thresholds.maxMemoryUsage}MB)`,
        recommendations: [
          'Reduce batch sizes for sync operations',
          'Clear cached data if possible',
          'Monitor for memory leaks'
        ],
        clinicalImpact: ClinicalImpactLevel.LOW
      });
    }
    
    // Network latency check
    if (metrics.networkLatency > this.thresholds.maxNetworkLatency) {
      this.createAlert({
        type: PerformanceAlertType.NETWORK_DEGRADATION,
        severity: 'warning',
        message: `Network latency (${metrics.networkLatency}ms) exceeds threshold (${this.thresholds.maxNetworkLatency}ms)`,
        recommendations: [
          'Check network connection quality',
          'Consider reducing sync frequency',
          'Prioritize critical data sync'
        ],
        clinicalImpact: ClinicalImpactLevel.LOW
      });
    }
  }

  /**
   * Check for performance alerts
   */
  private checkForAlerts(): void {
    const currentMetrics = this.getCurrentMetrics();
    this.checkThresholds(currentMetrics);
    
    // Check battery level if available
    // Note: React Native doesn't have built-in battery API, would need native module
    
    // Check active sessions for long-running operations
    for (const [sessionId, session] of this.activeSessions.entries()) {
      const duration = Date.now() - session.startTime;
      const threshold = this.isClinicalEntityType(session.entityType) 
        ? this.thresholds.clinicalDataTimeout 
        : this.thresholds.maxOperationTime;
      
      if (duration > threshold * 0.8) { // Alert at 80% of threshold
        this.createAlert({
          type: PerformanceAlertType.SLOW_OPERATION,
          severity: 'info',
          message: `Long-running operation detected: ${session.operationType} (${duration}ms)`,
          entityType: session.entityType,
          recommendations: [
            'Monitor operation progress',
            'Consider timeout if operation hangs'
          ],
          clinicalImpact: this.isClinicalEntityType(session.entityType) 
            ? ClinicalImpactLevel.MODERATE 
            : ClinicalImpactLevel.LOW
        });
      }
    }
  }

  /**
   * Create performance alert
   */
  private createAlert(alertData: Omit<PerformanceAlert, 'id' | 'timestamp' | 'metrics'>): void {
    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      metrics: this.getCurrentMetrics(),
      ...alertData
    };
    
    this.alerts.push(alert);
    
    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }
    
    this.persistAlerts();
    this.emit('alert_created', { alert });
  }

  /**
   * Calculate operations per second
   */
  private calculateOperationsPerSecond(): number {
    // This would need to track actual operations
    // For now, return estimated value
    return this.activeSessions.size * 2;
  }

  /**
   * Calculate average operation time
   */
  private calculateAverageOperationTime(): number {
    if (this.historicalMetrics.length === 0) return 0;
    
    const recentMetrics = this.historicalMetrics.slice(-10);
    const sum = recentMetrics.reduce((acc, metric) => acc + metric.averageOperationTime, 0);
    return sum / recentMetrics.length;
  }

  /**
   * Calculate data transfer rate
   */
  private calculateDataTransferRate(): number {
    // This would need to track actual data transfer
    // For now, return estimated value based on network quality
    const networkState = networkAwareService.getNetworkState();
    
    switch (networkState.quality) {
      case NetworkQuality.EXCELLENT:
        return 1000000; // 1MB/s
      case NetworkQuality.GOOD:
        return 500000; // 500KB/s
      case NetworkQuality.POOR:
        return 100000; // 100KB/s
      default:
        return 0;
    }
  }

  /**
   * Calculate conflict resolution time
   */
  private calculateConflictResolutionTime(): number {
    // This would track actual conflict resolution times
    return 2000; // Estimated 2 seconds
  }

  /**
   * Calculate clinical validation time
   */
  private calculateClinicalValidationTime(): number {
    // This would track actual validation times
    return 500; // Estimated 500ms
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    // This would need native memory tracking
    // For now, estimate based on active sessions and data size
    const baseUsage = 10; // 10MB base
    const sessionUsage = this.activeSessions.size * 2; // 2MB per session
    const historyUsage = this.historicalMetrics.length * 0.01; // 10KB per metric
    
    return baseUsage + sessionUsage + historyUsage;
  }

  /**
   * Calculate battery impact
   */
  private calculateBatteryImpact(): number {
    // This would need native battery monitoring
    // For now, estimate based on sync activity
    const networkUsage = networkAwareService.getNetworkState().quality === NetworkQuality.POOR ? 0.3 : 0.1;
    const syncActivity = this.activeSessions.size > 0 ? 0.2 : 0.05;
    
    return Math.min(1.0, networkUsage + syncActivity);
  }

  /**
   * Check if entity type is clinical
   */
  private isClinicalEntityType(entityType: SyncEntityType): boolean {
    return [
      SyncEntityType.ASSESSMENT,
      SyncEntityType.CRISIS_PLAN,
      SyncEntityType.CHECK_IN
    ].includes(entityType);
  }

  /**
   * Load persisted monitoring data
   */
  private async loadPersistedData(): Promise<void> {
    try {
      const alertsData = await AsyncStorage.getItem(this.ALERTS_KEY);
      if (alertsData) {
        this.alerts = JSON.parse(alertsData);
      }
      
      const metricsData = await AsyncStorage.getItem(this.METRICS_KEY);
      if (metricsData) {
        this.historicalMetrics = JSON.parse(metricsData);
      }
    } catch (error) {
      console.warn('Failed to load persisted performance data:', error);
    }
  }

  /**
   * Persist alert data
   */
  private async persistAlerts(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.ALERTS_KEY, JSON.stringify(this.alerts));
    } catch (error) {
      console.warn('Failed to persist alerts:', error);
    }
  }

  /**
   * Persist session data
   */
  private async persistSessionData(session: PerformanceSession): Promise<void> {
    try {
      const sessionsData = await AsyncStorage.getItem(this.SESSION_KEY);
      const sessions = sessionsData ? JSON.parse(sessionsData) : [];
      
      sessions.push(session);
      
      // Keep only last 100 sessions
      const trimmedSessions = sessions.slice(-100);
      
      await AsyncStorage.setItem(this.SESSION_KEY, JSON.stringify(trimmedSessions));
    } catch (error) {
      console.warn('Failed to persist session data:', error);
    }
  }

  /**
   * Event system
   */
  addEventListener(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  removeEventListener(event: string, listener: Function): void {
    this.listeners.get(event)?.delete(listener);
  }

  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.warn(`Error in performance monitor event listener for ${event}:`, error);
      }
    });
  }

  /**
   * Shutdown monitoring
   */
  async shutdown(): Promise<void> {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
    }
    
    // Persist final state
    await this.persistAlerts();
    await AsyncStorage.setItem(this.METRICS_KEY, JSON.stringify(this.historicalMetrics));
    
    this.isMonitoring = false;
  }
}

// Export singleton instance
export const syncPerformanceMonitor = new SyncPerformanceMonitor();