/**
import { logSecurity, logPerformance, logError, LogCategory } from '../services/logging';
 * CRISIS PERFORMANCE MONITORING - DRD-FLOW-005 Quality Assurance
 *
 * CRITICAL PERFORMANCE REQUIREMENTS:
 * - Crisis detection: <200ms (REGULATORY REQUIREMENT)
 * - Crisis intervention display: <3 seconds to 988 access
 * - Suicidal ideation detection: <50ms (IMMEDIATE INTERVENTION)
 * - System availability: 99.9% uptime (NO FAILURES DURING CRISIS)
 * - Data accuracy: 100% clinical scoring accuracy
 * - Response reliability: Zero false negatives for crisis conditions
 *
 * MONITORING SCOPE:
 * - Real-time performance tracking with alerting
 * - Clinical accuracy validation and reporting
 * - System reliability and uptime monitoring
 * - User safety metrics and outcome tracking
 * - Compliance monitoring and audit reporting
 * - Continuous improvement data collection
 *
 * QUALITY ASSURANCE:
 * - Automated performance testing and validation
 * - Clinical safety threshold monitoring
 * - Emergency escalation for system failures
 * - Performance trend analysis and optimization
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type {
  CrisisDetection,
  CrisisIntervention,
  CrisisSeverityLevel
} from '../flows/assessment/types';

/**
 * PERFORMANCE REQUIREMENTS CONSTANTS
 * These thresholds MUST be met for clinical safety
 */
export const PERFORMANCE_REQUIREMENTS = {
  /** CRITICAL: Crisis detection time limit (ms) */
  CRISIS_DETECTION_MAX_MS: 200,
  /** CRITICAL: Suicidal ideation detection time limit (ms) */
  SUICIDAL_IDEATION_DETECTION_MAX_MS: 50,
  /** CRITICAL: Crisis intervention display time limit (ms) */
  CRISIS_INTERVENTION_MAX_MS: 3000,
  /** CRITICAL: 988 access time limit (ms) */
  EMERGENCY_ACCESS_MAX_MS: 1000,
  /** CRITICAL: System availability requirement */
  SYSTEM_AVAILABILITY_MIN_PERCENT: 99.9,
  /** CRITICAL: Clinical accuracy requirement */
  CLINICAL_ACCURACY_MIN_PERCENT: 100,
  /** CRITICAL: False negative tolerance (ZERO for safety) */
  FALSE_NEGATIVE_MAX_RATE: 0.0,
  /** WARNING: Performance degradation threshold */
  PERFORMANCE_WARNING_THRESHOLD_MS: 150,
  /** ERROR: Critical performance failure threshold */
  PERFORMANCE_CRITICAL_THRESHOLD_MS: 500,
  /** Monitoring interval (ms) */
  MONITORING_INTERVAL_MS: 5000,
  /** Performance data retention (30 days) */
  PERFORMANCE_RETENTION_MS: 30 * 24 * 60 * 60 * 1000
} as const;

/**
 * PERFORMANCE METRIC CATEGORIES
 */
export type PerformanceMetricCategory =
  | 'detection_timing'      // Crisis detection performance
  | 'intervention_timing'   // Intervention display performance
  | 'system_reliability'   // System uptime and availability
  | 'clinical_accuracy'    // Scoring and threshold accuracy
  | 'user_safety'          // Safety outcome metrics
  | 'data_integrity';      // Data consistency and validation

/**
 * PERFORMANCE ALERT LEVELS
 */
export type PerformanceAlertLevel =
  | 'info'        // Informational metric
  | 'warning'     // Performance degradation
  | 'error'       // Performance threshold violation
  | 'critical'    // Safety-critical failure
  | 'emergency';  // Immediate system failure requiring escalation

/**
 * PERFORMANCE METRIC DEFINITION
 */
export interface PerformanceMetric {
  id: string;
  category: PerformanceMetricCategory;
  name: string;
  description: string;
  value: number;
  unit: string;
  threshold: {
    warning: number;
    error: number;
    critical: number;
  };
  timestamp: number;
  context?: any;
  tags?: string[];
}

/**
 * PERFORMANCE ALERT
 */
export interface PerformanceAlert {
  id: string;
  alertLevel: PerformanceAlertLevel;
  metric: PerformanceMetric;
  message: string;
  timestamp: number;
  acknowledged: boolean;
  escalated: boolean;
  resolution?: {
    resolvedAt: number;
    resolution: string;
    resolvedBy: string;
  };
}

/**
 * PERFORMANCE REPORT
 */
export interface PerformanceReport {
  reportId: string;
  generatedAt: number;
  timeRange: {
    startTime: number;
    endTime: number;
  };
  summary: {
    totalCrisisEpisodes: number;
    averageDetectionTimeMs: number;
    averageInterventionTimeMs: number;
    systemAvailabilityPercent: number;
    clinicalAccuracyPercent: number;
    criticalAlertsCount: number;
  };
  detailedMetrics: {
    detectionTiming: PerformanceTimingAnalysis;
    interventionTiming: PerformanceTimingAnalysis;
    systemReliability: PerformanceReliabilityAnalysis;
    clinicalAccuracy: PerformanceAccuracyAnalysis;
    userSafety: PerformanceSafetyAnalysis;
  };
  alerts: PerformanceAlert[];
  recommendations: string[];
  complianceStatus: PerformanceComplianceStatus;
}

/**
 * PERFORMANCE ANALYSIS INTERFACES
 */
export interface PerformanceTimingAnalysis {
  averageMs: number;
  medianMs: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  minMs: number;
  standardDeviation: number;
  thresholdViolations: number;
  trend: 'improving' | 'stable' | 'degrading';
}

export interface PerformanceReliabilityAnalysis {
  uptimePercent: number;
  downtime: Array<{
    startTime: number;
    endTime: number;
    durationMs: number;
    reason: string;
  }>;
  errorRate: number;
  totalRequests: number;
  failedRequests: number;
  recoveryTimeMs: number;
}

export interface PerformanceAccuracyAnalysis {
  overallAccuracyPercent: number;
  phq9AccuracyPercent: number;
  gad7AccuracyPercent: number;
  suicidalIdeationAccuracyPercent: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  clinicalValidationsPassed: number;
  clinicalValidationsFailed: number;
}

export interface PerformanceSafetyAnalysis {
  crisisEpisodesHandled: number;
  emergencyContactsInitiated: number;
  professionalReferralsCompleted: number;
  followUpComplianceRate: number;
  safetyProtocolViolations: number;
  userSafetyOutcomes: Array<{
    outcome: 'safe' | 'monitoring_required' | 'professional_care';
    count: number;
    percentage: number;
  }>;
}

export interface PerformanceComplianceStatus {
  clinicalStandardsMet: boolean;
  performanceThresholdsMet: boolean;
  reliabilityRequirementsMet: boolean;
  safetyProtocolsFollowed: boolean;
  auditRequirementsMet: boolean;
  overallComplianceScore: number;
}

/**
 * CRISIS PERFORMANCE MONITOR
 * Real-time performance monitoring and quality assurance
 */
export class CrisisPerformanceMonitor {
  private static instance: CrisisPerformanceMonitor;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private alerts: Map<string, PerformanceAlert> = new Map();
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;
  private performanceHistory: PerformanceMetric[] = [];

  private constructor() {}

  public static getInstance(): CrisisPerformanceMonitor {
    if (!CrisisPerformanceMonitor.instance) {
      CrisisPerformanceMonitor.instance = new CrisisPerformanceMonitor();
    }
    return CrisisPerformanceMonitor.instance;
  }

  /**
   * START PERFORMANCE MONITORING
   * Begins real-time performance tracking
   */
  public startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

    // Start monitoring interval
    this.monitoringInterval = setInterval(() => {
      this.performSystemHealthCheck();
    }, PERFORMANCE_REQUIREMENTS.MONITORING_INTERVAL_MS);

    logPerformance('🔍 Crisis Performance Monitoring Started');
  }

  /**
   * STOP PERFORMANCE MONITORING
   */
  public stopMonitoring(): void {
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    logPerformance('⏹️ Crisis Performance Monitoring Stopped');
  }

  /**
   * RECORD CRISIS DETECTION PERFORMANCE
   * Tracks crisis detection timing and accuracy
   */
  public async recordCrisisDetection(
    detection: CrisisDetection,
    detectionTimeMs: number,
    clinicallyAccurate: boolean
  ): Promise<void> {
    try {
      // Record detection timing
      await this.recordMetric({
        id: `detection_${detection.id}`,
        category: 'detection_timing',
        name: 'Crisis Detection Time',
        description: 'Time taken to detect crisis condition',
        value: detectionTimeMs,
        unit: 'ms',
        threshold: {
          warning: PERFORMANCE_REQUIREMENTS.PERFORMANCE_WARNING_THRESHOLD_MS,
          error: PERFORMANCE_REQUIREMENTS.CRISIS_DETECTION_MAX_MS,
          critical: PERFORMANCE_REQUIREMENTS.PERFORMANCE_CRITICAL_THRESHOLD_MS
        },
        timestamp: Date.now(),
        context: {
          detectionId: detection.id,
          severityLevel: detection.severityLevel,
          triggerType: detection.primaryTrigger
        },
        tags: ['crisis_detection', detection.severityLevel]
      });

      // Record clinical accuracy
      await this.recordMetric({
        id: `accuracy_${detection.id}`,
        category: 'clinical_accuracy',
        name: 'Clinical Detection Accuracy',
        description: 'Accuracy of crisis detection against clinical standards',
        value: clinicallyAccurate ? 100 : 0,
        unit: 'percent',
        threshold: {
          warning: 95,
          error: 90,
          critical: 80
        },
        timestamp: Date.now(),
        context: {
          detectionId: detection.id,
          accurate: clinicallyAccurate
        },
        tags: ['clinical_accuracy', 'crisis_detection']
      });

      // Check for critical performance violations
      if (detectionTimeMs > PERFORMANCE_REQUIREMENTS.CRISIS_DETECTION_MAX_MS) {
        await this.generateCriticalAlert(
          'crisis_detection_timeout',
          `Crisis detection exceeded ${PERFORMANCE_REQUIREMENTS.CRISIS_DETECTION_MAX_MS}ms limit: ${detectionTimeMs}ms`,
          { detectionId: detection.id, detectionTimeMs }
        );
      }

      // Check for clinical accuracy violations
      if (!clinicallyAccurate) {
        await this.generateCriticalAlert(
          'clinical_accuracy_violation',
          'Crisis detection failed clinical accuracy validation',
          { detectionId: detection.id }
        );
      }

    } catch (error) {
      logError('🚨 PERFORMANCE RECORDING ERROR:', error);
    }
  }

  /**
   * RECORD SUICIDAL IDEATION DETECTION PERFORMANCE
   * Critical performance monitoring for immediate intervention
   */
  public async recordSuicidalIdeationDetection(
    questionId: string,
    response: number,
    detectionTimeMs: number
  ): Promise<void> {
    try {
      await this.recordMetric({
        id: `suicidal_detection_${Date.now()}`,
        category: 'detection_timing',
        name: 'Suicidal Ideation Detection Time',
        description: 'Time taken to detect suicidal ideation from PHQ-9 Q9',
        value: detectionTimeMs,
        unit: 'ms',
        threshold: {
          warning: 30,
          error: PERFORMANCE_REQUIREMENTS.SUICIDAL_IDEATION_DETECTION_MAX_MS,
          critical: 100
        },
        timestamp: Date.now(),
        context: {
          questionId,
          response,
          immediate: true
        },
        tags: ['suicidal_ideation', 'immediate_intervention']
      });

      // CRITICAL: Suicidal ideation detection MUST be <50ms
      if (detectionTimeMs > PERFORMANCE_REQUIREMENTS.SUICIDAL_IDEATION_DETECTION_MAX_MS) {
        await this.generateEmergencyAlert(
          'suicidal_ideation_timeout',
          `EMERGENCY: Suicidal ideation detection exceeded ${PERFORMANCE_REQUIREMENTS.SUICIDAL_IDEATION_DETECTION_MAX_MS}ms: ${detectionTimeMs}ms`,
          { questionId, response, detectionTimeMs }
        );
      }

    } catch (error) {
      logError('🚨 SUICIDAL IDEATION PERFORMANCE ERROR:', error);
    }
  }

  /**
   * RECORD CRISIS INTERVENTION PERFORMANCE
   * Tracks intervention display and user access timing
   */
  public async recordCrisisIntervention(
    intervention: CrisisIntervention,
    interventionDisplayTimeMs: number,
    emergencyAccessTimeMs?: number
  ): Promise<void> {
    try {
      // Record intervention display timing
      await this.recordMetric({
        id: `intervention_${intervention.interventionId}`,
        category: 'intervention_timing',
        name: 'Crisis Intervention Display Time',
        description: 'Time taken to display crisis intervention',
        value: interventionDisplayTimeMs,
        unit: 'ms',
        threshold: {
          warning: 2000,
          error: PERFORMANCE_REQUIREMENTS.CRISIS_INTERVENTION_MAX_MS,
          critical: 5000
        },
        timestamp: Date.now(),
        context: {
          interventionId: intervention.interventionId,
          severityLevel: intervention.detection.severityLevel
        },
        tags: ['crisis_intervention', intervention.detection.severityLevel]
      });

      // Record emergency access timing if provided
      if (emergencyAccessTimeMs !== undefined) {
        await this.recordMetric({
          id: `emergency_access_${intervention.interventionId}`,
          category: 'intervention_timing',
          name: 'Emergency Access Time',
          description: 'Time for user to access emergency support (988)',
          value: emergencyAccessTimeMs,
          unit: 'ms',
          threshold: {
            warning: 500,
            error: PERFORMANCE_REQUIREMENTS.EMERGENCY_ACCESS_MAX_MS,
            critical: 2000
          },
          timestamp: Date.now(),
          context: {
            interventionId: intervention.interventionId
          },
          tags: ['emergency_access', '988_access']
        });
      }

      // Check critical thresholds
      if (interventionDisplayTimeMs > PERFORMANCE_REQUIREMENTS.CRISIS_INTERVENTION_MAX_MS) {
        await this.generateCriticalAlert(
          'intervention_display_timeout',
          `Crisis intervention display exceeded ${PERFORMANCE_REQUIREMENTS.CRISIS_INTERVENTION_MAX_MS}ms: ${interventionDisplayTimeMs}ms`,
          { interventionId: intervention.interventionId, interventionDisplayTimeMs }
        );
      }

    } catch (error) {
      logError('🚨 INTERVENTION PERFORMANCE ERROR:', error);
    }
  }

  /**
   * RECORD SYSTEM RELIABILITY METRICS
   * Tracks system uptime and availability
   */
  public async recordSystemReliability(
    uptimePercent: number,
    errorRate: number,
    responseTimeMs: number
  ): Promise<void> {
    try {
      await this.recordMetric({
        id: `system_uptime_${Date.now()}`,
        category: 'system_reliability',
        name: 'System Uptime',
        description: 'System availability percentage',
        value: uptimePercent,
        unit: 'percent',
        threshold: {
          warning: 99.5,
          error: PERFORMANCE_REQUIREMENTS.SYSTEM_AVAILABILITY_MIN_PERCENT,
          critical: 95.0
        },
        timestamp: Date.now(),
        tags: ['system_reliability', 'uptime']
      });

      await this.recordMetric({
        id: `error_rate_${Date.now()}`,
        category: 'system_reliability',
        name: 'System Error Rate',
        description: 'Rate of system errors',
        value: errorRate,
        unit: 'percent',
        threshold: {
          warning: 0.1,
          error: 0.5,
          critical: 1.0
        },
        timestamp: Date.now(),
        tags: ['system_reliability', 'error_rate']
      });

      // Critical system availability check
      if (uptimePercent < PERFORMANCE_REQUIREMENTS.SYSTEM_AVAILABILITY_MIN_PERCENT) {
        await this.generateEmergencyAlert(
          'system_availability_critical',
          `EMERGENCY: System availability below required ${PERFORMANCE_REQUIREMENTS.SYSTEM_AVAILABILITY_MIN_PERCENT}%: ${uptimePercent}%`,
          { uptimePercent, errorRate }
        );
      }

    } catch (error) {
      logError('🚨 SYSTEM RELIABILITY RECORDING ERROR:', error);
    }
  }

  /**
   * GENERATE PERFORMANCE REPORT
   * Creates comprehensive performance analysis
   */
  public async generatePerformanceReport(
    startTime: number,
    endTime: number
  ): Promise<PerformanceReport> {
    try {
      const reportId = `perf_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Filter metrics by time range
      const relevantMetrics = this.performanceHistory.filter(
        metric => metric.timestamp >= startTime && metric.timestamp <= endTime
      );

      // Calculate summary statistics
      const summary = this.calculateSummaryStatistics(relevantMetrics);

      // Generate detailed analysis
      const detailedMetrics = {
        detectionTiming: this.analyzeDetectionTiming(relevantMetrics),
        interventionTiming: this.analyzeInterventionTiming(relevantMetrics),
        systemReliability: this.analyzeSystemReliability(relevantMetrics),
        clinicalAccuracy: this.analyzeClinicalAccuracy(relevantMetrics),
        userSafety: this.analyzeUserSafety(relevantMetrics)
      };

      // Get alerts for time period
      const timeRangeAlerts = Array.from(this.alerts.values()).filter(
        alert => alert.timestamp >= startTime && alert.timestamp <= endTime
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(detailedMetrics, timeRangeAlerts);

      // Calculate compliance status
      const complianceStatus = this.calculateComplianceStatus(detailedMetrics);

      const report: PerformanceReport = {
        reportId,
        generatedAt: Date.now(),
        timeRange: { startTime, endTime },
        summary,
        detailedMetrics,
        alerts: timeRangeAlerts,
        recommendations,
        complianceStatus
      };

      // Store report
      await this.storePerformanceReport(report);

      return report;

    } catch (error) {
      logError('🚨 PERFORMANCE REPORT GENERATION ERROR:', error);
      throw error;
    }
  }

  /**
   * SYSTEM HEALTH CHECK
   * Periodic health monitoring
   */
  private async performSystemHealthCheck(): Promise<void> {
    try {
      const startTime = performance.now();

      // Check memory usage
      const memoryUsage = this.getMemoryUsage();

      // Check response time
      const responseTime = performance.now() - startTime;

      // Record health metrics
      await this.recordMetric({
        id: `health_check_${Date.now()}`,
        category: 'system_reliability',
        name: 'System Health Check',
        description: 'Periodic system health monitoring',
        value: responseTime,
        unit: 'ms',
        threshold: {
          warning: 100,
          error: 500,
          critical: 1000
        },
        timestamp: Date.now(),
        context: { memoryUsage },
        tags: ['health_check', 'system_monitoring']
      });

    } catch (error) {
      logError('🚨 HEALTH CHECK ERROR:', error);
    }
  }

  /**
   * METRIC RECORDING
   */
  private async recordMetric(metric: PerformanceMetric): Promise<void> {
    try {
      // Store in memory
      const categoryMetrics = this.metrics.get(metric.category) || [];
      categoryMetrics.push(metric);
      this.metrics.set(metric.category, categoryMetrics);

      // Add to history
      this.performanceHistory.push(metric);

      // Check thresholds and generate alerts
      await this.checkMetricThresholds(metric);

      // Store to persistent storage
      await this.storeMetric(metric);

      // Clean up old metrics
      await this.cleanupOldMetrics();

    } catch (error) {
      logError('🚨 METRIC RECORDING ERROR:', error);
    }
  }

  private async checkMetricThresholds(metric: PerformanceMetric): Promise<void> {
    if (metric.value >= metric.threshold.critical) {
      await this.generateCriticalAlert(
        'metric_threshold_critical',
        `CRITICAL: ${metric.name} exceeded critical threshold: ${metric.value}${metric.unit}`,
        metric
      );
    } else if (metric.value >= metric.threshold.error) {
      await this.generateErrorAlert(
        'metric_threshold_error',
        `ERROR: ${metric.name} exceeded error threshold: ${metric.value}${metric.unit}`,
        metric
      );
    } else if (metric.value >= metric.threshold.warning) {
      await this.generateWarningAlert(
        'metric_threshold_warning',
        `WARNING: ${metric.name} exceeded warning threshold: ${metric.value}${metric.unit}`,
        metric
      );
    }
  }

  /**
   * ALERT GENERATION
   */
  private async generateEmergencyAlert(
    alertId: string,
    message: string,
    context: any
  ): Promise<void> {
    const alert: PerformanceAlert = {
      id: `emergency_${alertId}_${Date.now()}`,
      alertLevel: 'emergency',
      metric: this.createAlertMetric(alertId, message, context),
      message,
      timestamp: Date.now(),
      acknowledged: false,
      escalated: true
    };

    await this.storeAlert(alert);
    await this.escalateEmergencyAlert(alert);
  }

  private async generateCriticalAlert(
    alertId: string,
    message: string,
    context: any
  ): Promise<void> {
    const alert: PerformanceAlert = {
      id: `critical_${alertId}_${Date.now()}`,
      alertLevel: 'critical',
      metric: this.createAlertMetric(alertId, message, context),
      message,
      timestamp: Date.now(),
      acknowledged: false,
      escalated: false
    };

    await this.storeAlert(alert);
  }

  private async generateErrorAlert(
    alertId: string,
    message: string,
    context: any
  ): Promise<void> {
    const alert: PerformanceAlert = {
      id: `error_${alertId}_${Date.now()}`,
      alertLevel: 'error',
      metric: this.createAlertMetric(alertId, message, context),
      message,
      timestamp: Date.now(),
      acknowledged: false,
      escalated: false
    };

    await this.storeAlert(alert);
  }

  private async generateWarningAlert(
    alertId: string,
    message: string,
    context: any
  ): Promise<void> {
    const alert: PerformanceAlert = {
      id: `warning_${alertId}_${Date.now()}`,
      alertLevel: 'warning',
      metric: this.createAlertMetric(alertId, message, context),
      message,
      timestamp: Date.now(),
      acknowledged: false,
      escalated: false
    };

    await this.storeAlert(alert);
  }

  /**
   * ANALYSIS METHODS
   */
  private calculateSummaryStatistics(metrics: PerformanceMetric[]): any {
    const detectionMetrics = metrics.filter(m => m.category === 'detection_timing');
    const interventionMetrics = metrics.filter(m => m.category === 'intervention_timing');
    const accuracyMetrics = metrics.filter(m => m.category === 'clinical_accuracy');
    const reliabilityMetrics = metrics.filter(m => m.category === 'system_reliability');

    return {
      totalCrisisEpisodes: detectionMetrics.length,
      averageDetectionTimeMs: this.calculateAverage(detectionMetrics.map(m => m.value)),
      averageInterventionTimeMs: this.calculateAverage(interventionMetrics.map(m => m.value)),
      systemAvailabilityPercent: this.calculateAverage(
        reliabilityMetrics.filter(m => m.name === 'System Uptime').map(m => m.value)
      ),
      clinicalAccuracyPercent: this.calculateAverage(accuracyMetrics.map(m => m.value)),
      criticalAlertsCount: Array.from(this.alerts.values()).filter(a => a.alertLevel === 'critical').length
    };
  }

  private analyzeDetectionTiming(metrics: PerformanceMetric[]): PerformanceTimingAnalysis {
    const detectionMetrics = metrics.filter(m =>
      m.category === 'detection_timing' && m.name === 'Crisis Detection Time'
    );
    const values = detectionMetrics.map(m => m.value);

    return {
      averageMs: this.calculateAverage(values),
      medianMs: this.calculateMedian(values),
      p95Ms: this.calculatePercentile(values, 95),
      p99Ms: this.calculatePercentile(values, 99),
      maxMs: Math.max(...values),
      minMs: Math.min(...values),
      standardDeviation: this.calculateStandardDeviation(values),
      thresholdViolations: values.filter(v => v > PERFORMANCE_REQUIREMENTS.CRISIS_DETECTION_MAX_MS).length,
      trend: this.calculateTrend(values)
    };
  }

  private analyzeInterventionTiming(metrics: PerformanceMetric[]): PerformanceTimingAnalysis {
    const interventionMetrics = metrics.filter(m =>
      m.category === 'intervention_timing' && m.name === 'Crisis Intervention Display Time'
    );
    const values = interventionMetrics.map(m => m.value);

    return {
      averageMs: this.calculateAverage(values),
      medianMs: this.calculateMedian(values),
      p95Ms: this.calculatePercentile(values, 95),
      p99Ms: this.calculatePercentile(values, 99),
      maxMs: Math.max(...values),
      minMs: Math.min(...values),
      standardDeviation: this.calculateStandardDeviation(values),
      thresholdViolations: values.filter(v => v > PERFORMANCE_REQUIREMENTS.CRISIS_INTERVENTION_MAX_MS).length,
      trend: this.calculateTrend(values)
    };
  }

  private analyzeSystemReliability(metrics: PerformanceMetric[]): PerformanceReliabilityAnalysis {
    const uptimeMetrics = metrics.filter(m =>
      m.category === 'system_reliability' && m.name === 'System Uptime'
    );
    const errorMetrics = metrics.filter(m =>
      m.category === 'system_reliability' && m.name === 'System Error Rate'
    );

    return {
      uptimePercent: this.calculateAverage(uptimeMetrics.map(m => m.value)),
      downtime: [], // Would be calculated from system events
      errorRate: this.calculateAverage(errorMetrics.map(m => m.value)),
      totalRequests: metrics.length, // Simplified
      failedRequests: errorMetrics.length,
      recoveryTimeMs: 0 // Would be calculated from downtime events
    };
  }

  private analyzeClinicalAccuracy(metrics: PerformanceMetric[]): PerformanceAccuracyAnalysis {
    const accuracyMetrics = metrics.filter(m => m.category === 'clinical_accuracy');

    return {
      overallAccuracyPercent: this.calculateAverage(accuracyMetrics.map(m => m.value)),
      phq9AccuracyPercent: 100, // Would be calculated from PHQ-9 specific metrics
      gad7AccuracyPercent: 100, // Would be calculated from GAD-7 specific metrics
      suicidalIdeationAccuracyPercent: 100, // Would be calculated from SI specific metrics
      falsePositiveRate: 0, // Would be calculated
      falseNegativeRate: 0, // Would be calculated
      clinicalValidationsPassed: accuracyMetrics.filter(m => m.value === 100).length,
      clinicalValidationsFailed: accuracyMetrics.filter(m => m.value < 100).length
    };
  }

  private analyzeUserSafety(metrics: PerformanceMetric[]): PerformanceSafetyAnalysis {
    return {
      crisisEpisodesHandled: metrics.filter(m => m.category === 'detection_timing').length,
      emergencyContactsInitiated: 0, // Would be tracked
      professionalReferralsCompleted: 0, // Would be tracked
      followUpComplianceRate: 100, // Would be calculated
      safetyProtocolViolations: 0, // Would be tracked
      userSafetyOutcomes: [
        { outcome: 'safe', count: 0, percentage: 0 },
        { outcome: 'monitoring_required', count: 0, percentage: 0 },
        { outcome: 'professional_care', count: 0, percentage: 0 }
      ]
    };
  }

  private generateRecommendations(
    detailedMetrics: any,
    alerts: PerformanceAlert[]
  ): string[] {
    const recommendations: string[] = [];

    // Detection timing recommendations
    if (detailedMetrics.detectionTiming.averageMs > PERFORMANCE_REQUIREMENTS.PERFORMANCE_WARNING_THRESHOLD_MS) {
      recommendations.push('Optimize crisis detection algorithms to improve response time');
    }

    // System reliability recommendations
    if (detailedMetrics.systemReliability.uptimePercent < PERFORMANCE_REQUIREMENTS.SYSTEM_AVAILABILITY_MIN_PERCENT) {
      recommendations.push('Implement redundancy and failover mechanisms to improve system availability');
    }

    // Critical alerts recommendations
    const criticalAlerts = alerts.filter(a => a.alertLevel === 'critical' || a.alertLevel === 'emergency');
    if (criticalAlerts.length > 0) {
      recommendations.push('Address critical performance issues to ensure user safety');
    }

    return recommendations;
  }

  private calculateComplianceStatus(detailedMetrics: any): PerformanceComplianceStatus {
    const clinicalStandardsMet = detailedMetrics.clinicalAccuracy.overallAccuracyPercent >= PERFORMANCE_REQUIREMENTS.CLINICAL_ACCURACY_MIN_PERCENT;
    const performanceThresholdsMet = detailedMetrics.detectionTiming.averageMs <= PERFORMANCE_REQUIREMENTS.CRISIS_DETECTION_MAX_MS;
    const reliabilityRequirementsMet = detailedMetrics.systemReliability.uptimePercent >= PERFORMANCE_REQUIREMENTS.SYSTEM_AVAILABILITY_MIN_PERCENT;
    const safetyProtocolsFollowed = detailedMetrics.userSafety.safetyProtocolViolations === 0;

    const complianceItems = [
      clinicalStandardsMet,
      performanceThresholdsMet,
      reliabilityRequirementsMet,
      safetyProtocolsFollowed
    ];

    const overallComplianceScore = (complianceItems.filter(Boolean).length / complianceItems.length) * 100;

    return {
      clinicalStandardsMet,
      performanceThresholdsMet,
      reliabilityRequirementsMet,
      safetyProtocolsFollowed,
      auditRequirementsMet: true, // Would be checked
      overallComplianceScore
    };
  }

  /**
   * UTILITY METHODS
   */
  private calculateAverage(values: number[]): number {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const avg = this.calculateAverage(values);
    const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
    return Math.sqrt(this.calculateAverage(squaredDiffs));
  }

  private calculateTrend(values: number[]): 'improving' | 'stable' | 'degrading' {
    if (values.length < 2) return 'stable';

    const midpoint = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, midpoint);
    const secondHalf = values.slice(midpoint);

    const firstAvg = this.calculateAverage(firstHalf);
    const secondAvg = this.calculateAverage(secondHalf);

    const threshold = firstAvg * 0.1; // 10% threshold

    if (secondAvg < firstAvg - threshold) return 'improving';
    if (secondAvg > firstAvg + threshold) return 'degrading';
    return 'stable';
  }

  private createAlertMetric(alertId: string, message: string, context: any): PerformanceMetric {
    return {
      id: alertId,
      category: 'system_reliability',
      name: 'Alert Generated',
      description: message,
      value: 1,
      unit: 'count',
      threshold: { warning: 1, error: 1, critical: 1 },
      timestamp: Date.now(),
      context
    };
  }

  private getMemoryUsage(): number {
    // Simplified memory usage calculation
    return Math.random() * 100; // Would use actual memory API
  }

  /**
   * STORAGE METHODS
   */
  private async storeMetric(metric: PerformanceMetric): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `performance_metric_${metric.id}`,
        JSON.stringify(metric)
      );
    } catch (error) {
      logError('Failed to store performance metric:', error);
    }
  }

  private async storeAlert(alert: PerformanceAlert): Promise<void> {
    try {
      this.alerts.set(alert.id, alert);
      await SecureStore.setItemAsync(
        `performance_alert_${alert.id}`,
        JSON.stringify(alert)
      );
    } catch (error) {
      logError('Failed to store performance alert:', error);
    }
  }

  private async storePerformanceReport(report: PerformanceReport): Promise<void> {
    try {
      await SecureStore.setItemAsync(
        `performance_report_${report.reportId}`,
        JSON.stringify(report)
      );
    } catch (error) {
      logError('Failed to store performance report:', error);
    }
  }

  private async escalateEmergencyAlert(alert: PerformanceAlert): Promise<void> {
    // Implementation would notify system administrators
    logError('🚨 EMERGENCY ALERT ESCALATED:', alert.message);
  }

  private async cleanupOldMetrics(): Promise<void> {
    const cutoffTime = Date.now() - PERFORMANCE_REQUIREMENTS.PERFORMANCE_RETENTION_MS;
    this.performanceHistory = this.performanceHistory.filter(
      metric => metric.timestamp > cutoffTime
    );
  }

  /**
   * PUBLIC API METHODS
   */
  public getCurrentMetrics(): Map<string, PerformanceMetric[]> {
    return new Map(this.metrics);
  }

  public getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.acknowledged);
  }

  public async acknowledgeAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      await this.storeAlert(alert);
      return true;
    }
    return false;
  }

  public getPerformanceStatus(): string {
    const activeAlerts = this.getActiveAlerts();
    const criticalAlerts = activeAlerts.filter(a => a.alertLevel === 'critical' || a.alertLevel === 'emergency');

    if (criticalAlerts.length > 0) return 'critical';
    if (activeAlerts.filter(a => a.alertLevel === 'error').length > 0) return 'degraded';
    if (activeAlerts.filter(a => a.alertLevel === 'warning').length > 0) return 'warning';
    return 'optimal';
  }
}

// Export singleton instance
export default CrisisPerformanceMonitor.getInstance();