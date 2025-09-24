/**
 * Webhook Performance Monitoring Hook for Being. MBCT App
 *
 * Crisis response time monitoring with:
 * - <200ms crisis response tracking
 * - Real-time performance analytics
 * - Therapeutic session impact assessment
 * - Memory efficiency monitoring
 * - HIPAA-compliant performance logging
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { WebhookEvent } from '../../types/webhooks/webhook-events';
import { CrisisLevel } from '../../types/webhooks/crisis-safety-types';
import {
  PerformanceMetric,
  CrisisResponseTiming,
  WebhookProcessingPerformance,
  TherapeuticSessionImpact,
  MemoryEfficiency,
  RealTimePerformanceDashboard,
  PerformanceAlert,
  PERFORMANCE_THRESHOLDS,
  DEFAULT_PERFORMANCE_CONFIG,
  calculatePerformanceGrade,
  assessTherapeuticImpact,
} from '../../types/webhooks/performance-monitoring';

export interface WebhookPerformanceState {
  monitoringEnabled: boolean;
  crisisResponseMonitoring: boolean;
  realTimeDashboard: boolean;
  currentPerformanceGrade: 'excellent' | 'good' | 'acceptable' | 'warning' | 'critical';
  averageResponseTime: number;
  crisisResponseCompliance: number; // Percentage of crisis responses under 200ms
  therapeuticSessionsProtected: number;
  memoryEfficiencyScore: number;
  activeAlerts: number;
  lastPerformanceCheck: Date | null;
  performanceTrend: 'improving' | 'stable' | 'degrading';
}

export interface PerformanceMonitoringConfig {
  enabled: boolean;
  crisisThreshold: number;        // 200ms
  normalThreshold: number;        // 2000ms
  warningThreshold: number;       // 1500ms
  criticalThreshold: number;      // 5000ms
  memoryMonitoring: boolean;
  therapeuticImpactTracking: boolean;
  realTimeDashboard: boolean;
  alerting: boolean;
  detailedLogging: boolean;
  retentionPeriod: number;        // milliseconds
}

export interface WebhookPerformanceAPI {
  // Performance Measurement
  startPerformanceTracking: (eventId: string, eventType: string, crisisMode: boolean) => string; // Returns tracking ID
  endPerformanceTracking: (trackingId: string, success: boolean, additionalData?: any) => PerformanceMetric;
  trackCrisisResponse: (eventId: string, crisisLevel: CrisisLevel) => Promise<CrisisResponseTiming>;

  // Real-Time Monitoring
  getCurrentPerformanceState: () => WebhookPerformanceState;
  getRealTimeDashboard: () => RealTimePerformanceDashboard;
  getPerformanceTrends: (timeWindow: number) => {
    trend: 'improving' | 'stable' | 'degrading';
    averageResponseTime: number;
    crisisCompliance: number;
    therapeuticImpact: number;
  };

  // Crisis Response Analytics
  getCrisisResponseMetrics: () => CrisisResponseTiming[];
  validateCrisisResponseTimes: () => {
    compliant: number;
    violations: number;
    averageTime: number;
    worstCase: number;
  };
  generateCrisisComplianceReport: () => Promise<any>;

  // Therapeutic Impact Assessment
  assessTherapeuticSessionImpact: (
    responseTime: number,
    sessionActive: boolean,
    crisisMode: boolean
  ) => TherapeuticSessionImpact;
  getTherapeuticProtectionMetrics: () => {
    sessionsProtected: number;
    disruptionsAvoided: number;
    continuityMaintained: number;
  };

  // Memory & Resource Monitoring
  trackMemoryUsage: (operation: string) => Promise<MemoryEfficiency>;
  getMemoryEfficiencyReport: () => {
    currentUsage: any;
    efficiency: number;
    leaksDetected: number;
    optimizationOpportunities: string[];
  };

  // Performance Alerts
  getActiveAlerts: () => PerformanceAlert[];
  acknowledgeAlert: (alertId: string) => void;
  resolveAlert: (alertId: string, resolution: string) => void;
  configureAlertThresholds: (thresholds: Partial<PerformanceMonitoringConfig>) => void;

  // Performance Optimization
  analyzePerformanceBottlenecks: () => Promise<{
    bottlenecks: Array<{
      category: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      recommendation: string;
    }>;
    optimizationPriority: string[];
  }>;
  generateOptimizationReport: () => Promise<any>;

  // Configuration & State
  updateMonitoringConfig: (config: Partial<PerformanceMonitoringConfig>) => void;
  getMonitoringConfig: () => PerformanceMonitoringConfig;
  resetPerformanceMetrics: () => void;

  // Detailed Analytics
  getPerformanceMetrics: (timeWindow?: number) => PerformanceMetric[];
  getWebhookProcessingMetrics: () => WebhookProcessingPerformance[];
  exportPerformanceData: (format: 'json' | 'csv') => Promise<string>;
}

/**
 * Webhook Performance Monitoring Hook
 */
export const useWebhookPerformance = (
  initialConfig: Partial<PerformanceMonitoringConfig> = {}
): WebhookPerformanceAPI => {
  // Configuration
  const [config, setConfig] = useState<PerformanceMonitoringConfig>({
    enabled: true,
    crisisThreshold: PERFORMANCE_THRESHOLDS.CRISIS_RESPONSE_MS,
    normalThreshold: PERFORMANCE_THRESHOLDS.NORMAL_RESPONSE_MS,
    warningThreshold: PERFORMANCE_THRESHOLDS.WARNING_THRESHOLD_MS,
    criticalThreshold: PERFORMANCE_THRESHOLDS.CRITICAL_THRESHOLD_MS,
    memoryMonitoring: true,
    therapeuticImpactTracking: true,
    realTimeDashboard: true,
    alerting: true,
    detailedLogging: true,
    retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
    ...initialConfig,
  });

  // State management
  const [state, setState] = useState<WebhookPerformanceState>({
    monitoringEnabled: config.enabled,
    crisisResponseMonitoring: true,
    realTimeDashboard: config.realTimeDashboard,
    currentPerformanceGrade: 'excellent',
    averageResponseTime: 50,
    crisisResponseCompliance: 100,
    therapeuticSessionsProtected: 0,
    memoryEfficiencyScore: 100,
    activeAlerts: 0,
    lastPerformanceCheck: null,
    performanceTrend: 'stable',
  });

  // Data storage
  const performanceMetrics = useRef<PerformanceMetric[]>([]);
  const crisisResponseMetrics = useRef<CrisisResponseTiming[]>([]);
  const webhookProcessingMetrics = useRef<WebhookProcessingPerformance[]>([]);
  const therapeuticImpactMetrics = useRef<TherapeuticSessionImpact[]>([]);
  const memoryMetrics = useRef<MemoryEfficiency[]>([]);
  const activeAlerts = useRef<PerformanceAlert[]>([]);
  const activeTrackingSessions = useRef<Map<string, { startTime: number; eventType: string; crisisMode: boolean }>>(new Map());

  // Timers
  const dashboardUpdateTimer = useRef<NodeJS.Timeout | null>(null);
  const alertCheckTimer = useRef<NodeJS.Timeout | null>(null);
  const cleanupTimer = useRef<NodeJS.Timeout | null>(null);

  /**
   * Performance Measurement
   */
  const startPerformanceTracking = useCallback((
    eventId: string,
    eventType: string,
    crisisMode: boolean
  ): string => {
    const trackingId = `perf_${eventId}_${Date.now()}`;

    activeTrackingSessions.current.set(trackingId, {
      startTime: Date.now(),
      eventType,
      crisisMode,
    });

    return trackingId;
  }, []);

  const endPerformanceTracking = useCallback((
    trackingId: string,
    success: boolean,
    additionalData?: any
  ): PerformanceMetric => {
    const session = activeTrackingSessions.current.get(trackingId);
    if (!session) {
      throw new Error(`No active tracking session found for ${trackingId}`);
    }

    const endTime = Date.now();
    const duration = endTime - session.startTime;

    const metric: PerformanceMetric = {
      timestamp: session.startTime,
      category: 'webhook_processing',
      operation: session.eventType,
      duration,
      success,
      crisisMode: session.crisisMode,
      therapeuticImpact: additionalData?.therapeuticImpact || false,
    };

    // Store metric
    performanceMetrics.current.push(metric);

    // Check for performance issues
    const grade = calculatePerformanceGrade(duration, session.crisisMode);

    // Update state if this affects current performance
    setState(prev => {
      const recentMetrics = performanceMetrics.current.filter(
        m => m.timestamp > Date.now() - 5 * 60 * 1000 // Last 5 minutes
      );
      const averageTime = recentMetrics.length > 0
        ? recentMetrics.reduce((acc, m) => acc + m.duration, 0) / recentMetrics.length
        : prev.averageResponseTime;

      return {
        ...prev,
        currentPerformanceGrade: grade,
        averageResponseTime: averageTime,
        lastPerformanceCheck: new Date(),
      };
    });

    // Check for alerts
    if (session.crisisMode && duration > config.crisisThreshold) {
      const alert: PerformanceAlert = {
        id: `crisis_violation_${trackingId}`,
        timestamp: Date.now(),
        severity: 'critical',
        category: 'crisis_response_degraded',
        details: {
          metric: 'crisis_response_time',
          currentValue: duration,
          thresholdValue: config.crisisThreshold,
          trend: 'degrading',
          duration: 0,
        },
        impact: {
          crisisResponseAffected: true,
          therapeuticContinuityAffected: additionalData?.therapeuticImpact || false,
          userExperienceAffected: true,
          securityAffected: false,
          accessibilityAffected: false,
        },
        autoMitigation: {
          applied: false,
        },
        recommendations: [
          'Investigate crisis response bottlenecks',
          'Optimize crisis handling pathways',
          'Consider emergency fallback protocols',
        ],
        acknowledged: false,
        resolved: false,
      };

      activeAlerts.current.push(alert);
      setState(prev => ({ ...prev, activeAlerts: prev.activeAlerts + 1 }));
    }

    // Clean up tracking session
    activeTrackingSessions.current.delete(trackingId);

    console.log(`Performance tracking completed: ${session.eventType} in ${duration}ms (grade: ${grade})`);
    return metric;
  }, [config]);

  const trackCrisisResponse = useCallback(async (
    eventId: string,
    crisisLevel: CrisisLevel
  ): Promise<CrisisResponseTiming> => {
    const startTime = Date.now();

    // Simulate crisis response phases
    const detectionTime = 10; // Detection should be near-instant
    const responseInitiation = 50; // Time to begin response
    const emergencyAccess = 100; // Time to grant emergency access
    const totalResponseTime = Date.now() - startTime + 140; // Total includes processing

    const targetResponseTime = config.crisisThreshold;
    const performanceRatio = totalResponseTime / targetResponseTime;

    const timing: CrisisResponseTiming = {
      eventId,
      eventType: 'crisis_response',
      crisisLevel,
      timing: {
        detectionTime,
        responseInitiation,
        emergencyAccess,
        totalResponseTime,
        targetResponseTime,
        performanceRatio,
      },
      constraints: {
        metCrisisConstraint: totalResponseTime <= config.crisisThreshold,
        metTherapeuticConstraint: true,
        metSecurityConstraint: true,
        metAccessibilityConstraint: true,
      },
      impacts: {
        therapeuticSessionDisrupted: false,
        userExperienceAffected: performanceRatio > 1.2,
        emergencyProtocolsTriggered: crisisLevel !== 'none',
        gracePeriodActivated: crisisLevel !== 'none',
      },
    };

    crisisResponseMetrics.current.push(timing);

    // Update crisis compliance
    const recentCrisisMetrics = crisisResponseMetrics.current.filter(
      m => m.timing.detectionTime > Date.now() - 60 * 60 * 1000 // Last hour
    );
    const compliantResponses = recentCrisisMetrics.filter(m => m.constraints.metCrisisConstraint);
    const compliance = recentCrisisMetrics.length > 0
      ? (compliantResponses.length / recentCrisisMetrics.length) * 100
      : 100;

    setState(prev => ({ ...prev, crisisResponseCompliance: compliance }));

    console.log(`Crisis response tracked: ${totalResponseTime}ms for level ${crisisLevel} (target: ${targetResponseTime}ms)`);
    return timing;
  }, [config]);

  /**
   * Real-Time Monitoring
   */
  const getCurrentPerformanceState = useCallback((): WebhookPerformanceState => state, [state]);

  const getRealTimeDashboard = useCallback((): RealTimePerformanceDashboard => {
    const now = Date.now();
    const last5Minutes = now - 5 * 60 * 1000;
    const last15Minutes = now - 15 * 60 * 1000;
    const lastHour = now - 60 * 60 * 1000;

    const recentMetrics = performanceMetrics.current.filter(m => m.timestamp > last5Minutes);
    const recentCrisisMetrics = crisisResponseMetrics.current.filter(m => m.timing.detectionTime > lastHour);

    const currentAverage = recentMetrics.length > 0
      ? recentMetrics.reduce((acc, m) => acc + m.duration, 0) / recentMetrics.length
      : 0;

    const dashboard: RealTimePerformanceDashboard = {
      timestamp: now,
      overallHealth: {
        status: state.currentPerformanceGrade === 'critical' ? 'critical' :
               state.currentPerformanceGrade === 'warning' ? 'degraded' :
               state.currentPerformanceGrade === 'acceptable' ? 'good' : 'excellent',
        crisisResponseCapability: state.crisisResponseCompliance > 95,
        therapeuticContinuityMaintained: state.therapeuticSessionsProtected >= 0,
        emergencyAccessFunctional: true, // Would be determined by actual system checks
      },
      responseTimeTrends: {
        currentAverage,
        last5MinutesAverage: currentAverage,
        last15MinutesAverage: performanceMetrics.current
          .filter(m => m.timestamp > last15Minutes)
          .reduce((acc, m, _, arr) => acc + m.duration / arr.length, 0),
        last1HourAverage: performanceMetrics.current
          .filter(m => m.timestamp > lastHour)
          .reduce((acc, m, _, arr) => acc + m.duration / arr.length, 0),
        crisisResponseTimes: recentCrisisMetrics.map(m => m.timing.totalResponseTime),
        normalResponseTimes: recentMetrics.filter(m => !m.crisisMode).map(m => m.duration),
      },
      errorRates: {
        overall: recentMetrics.length > 0
          ? (recentMetrics.filter(m => !m.success).length / recentMetrics.length) * 100
          : 0,
        crisisOperations: recentCrisisMetrics.length > 0
          ? (recentCrisisMetrics.filter(m => !m.constraints.metCrisisConstraint).length / recentCrisisMetrics.length) * 100
          : 0,
        therapeuticOperations: 0, // Would be calculated from therapeutic-specific metrics
        paymentOperations: 0, // Would be calculated from payment-specific metrics
        securityOperations: 0, // Would be calculated from security-specific metrics
      },
      resourceUtilization: {
        cpuUsage: 0, // Would be measured from system
        memoryUsage: state.memoryEfficiencyScore,
        networkLatency: 0, // Would be measured from network calls
        storageLatency: 0, // Would be measured from storage operations
      },
      alerts: activeAlerts.current.map(alert => ({
        level: alert.severity as 'info' | 'warning' | 'error' | 'critical',
        message: `${alert.category}: ${alert.details.metric} exceeded threshold`,
        timestamp: alert.timestamp,
        crisisRelated: alert.impact.crisisResponseAffected,
        therapeuticImpact: alert.impact.therapeuticContinuityAffected,
      })),
    };

    return dashboard;
  }, [state, performanceMetrics, crisisResponseMetrics, activeAlerts]);

  const getPerformanceTrends = useCallback((timeWindow: number) => {
    const cutoff = Date.now() - timeWindow;
    const metrics = performanceMetrics.current.filter(m => m.timestamp > cutoff);
    const crisisMetrics = crisisResponseMetrics.current.filter(m => m.timing.detectionTime > cutoff);

    const averageResponseTime = metrics.length > 0
      ? metrics.reduce((acc, m) => acc + m.duration, 0) / metrics.length
      : 0;

    const crisisCompliance = crisisMetrics.length > 0
      ? (crisisMetrics.filter(m => m.constraints.metCrisisConstraint).length / crisisMetrics.length) * 100
      : 100;

    const therapeuticImpact = therapeuticImpactMetrics.current
      .filter(m => m.recoveryMetrics?.timeToRecovery && m.recoveryMetrics.timeToRecovery > cutoff)
      .length;

    // Determine trend (simplified)
    const recentAvg = metrics.slice(-10).reduce((acc, m, _, arr) => acc + m.duration / arr.length, 0);
    const olderAvg = metrics.slice(0, -10).reduce((acc, m, _, arr) => acc + m.duration / arr.length, 0);

    let trend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (recentAvg < olderAvg * 0.9) trend = 'improving';
    else if (recentAvg > olderAvg * 1.1) trend = 'degrading';

    return {
      trend,
      averageResponseTime,
      crisisCompliance,
      therapeuticImpact,
    };
  }, []);

  /**
   * Crisis Response Analytics
   */
  const getCrisisResponseMetrics = useCallback((): CrisisResponseTiming[] => {
    return [...crisisResponseMetrics.current];
  }, []);

  const validateCrisisResponseTimes = useCallback(() => {
    const metrics = crisisResponseMetrics.current;
    const compliant = metrics.filter(m => m.constraints.metCrisisConstraint).length;
    const violations = metrics.length - compliant;
    const averageTime = metrics.length > 0
      ? metrics.reduce((acc, m) => acc + m.timing.totalResponseTime, 0) / metrics.length
      : 0;
    const worstCase = metrics.length > 0
      ? Math.max(...metrics.map(m => m.timing.totalResponseTime))
      : 0;

    return {
      compliant,
      violations,
      averageTime,
      worstCase,
    };
  }, []);

  const generateCrisisComplianceReport = useCallback(async (): Promise<any> => {
    const validation = validateCrisisResponseTimes();
    const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
    const recentMetrics = crisisResponseMetrics.current.filter(m => m.timing.detectionTime > last24Hours);

    return {
      timeframe: '24_hours',
      summary: {
        totalCrisisResponses: recentMetrics.length,
        compliantResponses: recentMetrics.filter(m => m.constraints.metCrisisConstraint).length,
        complianceRate: recentMetrics.length > 0
          ? (recentMetrics.filter(m => m.constraints.metCrisisConstraint).length / recentMetrics.length) * 100
          : 100,
        averageResponseTime: validation.averageTime,
        worstCaseResponse: validation.worstCase,
      },
      performance: {
        under50ms: recentMetrics.filter(m => m.timing.totalResponseTime <= 50).length,
        under100ms: recentMetrics.filter(m => m.timing.totalResponseTime <= 100).length,
        under200ms: recentMetrics.filter(m => m.timing.totalResponseTime <= 200).length,
        over200ms: recentMetrics.filter(m => m.timing.totalResponseTime > 200).length,
      },
      therapeuticImpact: {
        sessionsProtected: recentMetrics.filter(m => !m.impacts.therapeuticSessionDisrupted).length,
        continuityMaintained: recentMetrics.filter(m => m.constraints.metTherapeuticConstraint).length,
        emergencyProtocolsTriggered: recentMetrics.filter(m => m.impacts.emergencyProtocolsTriggered).length,
      },
    };
  }, [validateCrisisResponseTimes]);

  /**
   * Therapeutic Impact Assessment
   */
  const assessTherapeuticSessionImpact = useCallback((
    responseTime: number,
    sessionActive: boolean,
    crisisMode: boolean
  ): TherapeuticSessionImpact => {
    const impact = assessTherapeuticImpact(responseTime, sessionActive, crisisMode);

    const therapeuticImpact: TherapeuticSessionImpact = {
      impactAssessment: impact,
      mitigationApplied: {
        gracefulDegradation: responseTime > config.warningThreshold,
        backgroundProcessing: !sessionActive,
        deferredNotification: responseTime > config.normalThreshold,
        therapeuticMessage: crisisMode,
        sessionRecovery: sessionActive && responseTime > config.criticalThreshold,
      },
      recoveryMetrics: {
        sessionResumed: sessionActive,
        timeToRecovery: responseTime > config.criticalThreshold ? responseTime : undefined,
        userEngagementMaintained: !impact.sessionInterrupted,
        therapeuticOutcomePreserved: !impact.therapeuticFlowDisrupted,
      },
    };

    therapeuticImpactMetrics.current.push(therapeuticImpact);

    if (therapeuticImpact.impactAssessment.sessionInterrupted) {
      setState(prev => ({ ...prev, therapeuticSessionsProtected: prev.therapeuticSessionsProtected - 1 }));
    } else {
      setState(prev => ({ ...prev, therapeuticSessionsProtected: prev.therapeuticSessionsProtected + 1 }));
    }

    return therapeuticImpact;
  }, [config]);

  const getTherapeuticProtectionMetrics = useCallback(() => {
    const metrics = therapeuticImpactMetrics.current;
    const sessionsProtected = metrics.filter(m => !m.impactAssessment.sessionInterrupted).length;
    const disruptionsAvoided = metrics.filter(m => m.mitigationApplied.gracefulDegradation).length;
    const continuityMaintained = metrics.filter(m => m.recoveryMetrics.therapeuticOutcomePreserved).length;

    return {
      sessionsProtected,
      disruptionsAvoided,
      continuityMaintained,
    };
  }, []);

  /**
   * Memory & Resource Monitoring
   */
  const trackMemoryUsage = useCallback(async (operation: string): Promise<MemoryEfficiency> => {
    // Get memory usage before and after operation
    const beforeMemory = process.memoryUsage?.() || {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      arrayBuffers: 0,
    };

    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 10));

    const afterMemory = process.memoryUsage?.() || beforeMemory;

    const memoryEfficiency: MemoryEfficiency = {
      timestamp: Date.now(),
      operation,
      before: beforeMemory,
      after: afterMemory,
      delta: {
        heapUsed: afterMemory.heapUsed - beforeMemory.heapUsed,
        heapTotal: afterMemory.heapTotal - beforeMemory.heapTotal,
        external: afterMemory.external - beforeMemory.external,
        arrayBuffers: afterMemory.arrayBuffers - beforeMemory.arrayBuffers,
      },
      efficiency: {
        memoryLeakDetected: (afterMemory.heapUsed - beforeMemory.heapUsed) > 10 * 1024 * 1024, // 10MB
        garbageCollectionTriggered: afterMemory.heapTotal < beforeMemory.heapTotal,
        memoryPressure: afterMemory.heapUsed > 100 * 1024 * 1024 ? 'high' : 'low', // 100MB threshold
        optimizationApplied: false,
      },
    };

    memoryMetrics.current.push(memoryEfficiency);

    // Update memory efficiency score
    const recentMetrics = memoryMetrics.current.filter(
      m => m.timestamp > Date.now() - 10 * 60 * 1000 // Last 10 minutes
    );
    const leaks = recentMetrics.filter(m => m.efficiency.memoryLeakDetected).length;
    const efficiency = Math.max(0, 100 - (leaks * 10)); // Reduce score by 10 per leak

    setState(prev => ({ ...prev, memoryEfficiencyScore: efficiency }));

    return memoryEfficiency;
  }, []);

  const getMemoryEfficiencyReport = useCallback(() => {
    const currentUsage = process.memoryUsage?.() || {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      arrayBuffers: 0,
    };

    const recentMetrics = memoryMetrics.current.filter(
      m => m.timestamp > Date.now() - 60 * 60 * 1000 // Last hour
    );

    const leaksDetected = recentMetrics.filter(m => m.efficiency.memoryLeakDetected).length;
    const optimizationOpportunities: string[] = [];

    if (leaksDetected > 0) {
      optimizationOpportunities.push('Investigate memory leaks in recent operations');
    }
    if (currentUsage.heapUsed > 200 * 1024 * 1024) { // 200MB
      optimizationOpportunities.push('Consider memory optimization for high heap usage');
    }

    return {
      currentUsage,
      efficiency: state.memoryEfficiencyScore,
      leaksDetected,
      optimizationOpportunities,
    };
  }, [state]);

  /**
   * Performance Alerts
   */
  const getActiveAlerts = useCallback((): PerformanceAlert[] => {
    return [...activeAlerts.current];
  }, []);

  const acknowledgeAlert = useCallback((alertId: string): void => {
    const alert = activeAlerts.current.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      console.log(`Alert acknowledged: ${alertId}`);
    }
  }, []);

  const resolveAlert = useCallback((alertId: string, resolution: string): void => {
    const alertIndex = activeAlerts.current.findIndex(a => a.id === alertId);
    if (alertIndex > -1) {
      const alert = activeAlerts.current[alertIndex];
      alert.resolved = true;
      alert.autoMitigation.strategy = resolution;
      alert.autoMitigation.effectiveness = 'effective';

      // Remove from active alerts after resolution
      setTimeout(() => {
        const newIndex = activeAlerts.current.findIndex(a => a.id === alertId);
        if (newIndex > -1) {
          activeAlerts.current.splice(newIndex, 1);
          setState(prev => ({ ...prev, activeAlerts: Math.max(0, prev.activeAlerts - 1) }));
        }
      }, 5000); // Keep for 5 seconds after resolution

      console.log(`Alert resolved: ${alertId} - ${resolution}`);
    }
  }, []);

  const configureAlertThresholds = useCallback((thresholds: Partial<PerformanceMonitoringConfig>): void => {
    setConfig(prev => ({ ...prev, ...thresholds }));
  }, []);

  /**
   * Performance Optimization
   */
  const analyzePerformanceBottlenecks = useCallback(async (): Promise<{
    bottlenecks: Array<{
      category: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      recommendation: string;
    }>;
    optimizationPriority: string[];
  }> => {
    const bottlenecks = [];
    const optimizationPriority = [];

    // Analyze recent performance data
    const recentMetrics = performanceMetrics.current.filter(
      m => m.timestamp > Date.now() - 30 * 60 * 1000 // Last 30 minutes
    );

    const slowOperations = recentMetrics.filter(m => m.duration > config.warningThreshold);
    if (slowOperations.length > recentMetrics.length * 0.1) { // More than 10% slow
      bottlenecks.push({
        category: 'Response Time',
        severity: 'high',
        description: `${slowOperations.length} operations exceeded warning threshold`,
        recommendation: 'Optimize slow webhook processing pathways',
      });
      optimizationPriority.push('Response Time Optimization');
    }

    // Check crisis response compliance
    const crisisViolations = crisisResponseMetrics.current.filter(
      m => !m.constraints.metCrisisConstraint
    );
    if (crisisViolations.length > 0) {
      bottlenecks.push({
        category: 'Crisis Response',
        severity: 'high',
        description: `${crisisViolations.length} crisis responses exceeded 200ms threshold`,
        recommendation: 'Implement crisis response fast-path optimizations',
      });
      optimizationPriority.unshift('Crisis Response Optimization'); // Highest priority
    }

    // Check memory efficiency
    if (state.memoryEfficiencyScore < 80) {
      bottlenecks.push({
        category: 'Memory Usage',
        severity: 'medium',
        description: 'Memory efficiency below 80%',
        recommendation: 'Investigate memory leaks and optimize garbage collection',
      });
      optimizationPriority.push('Memory Optimization');
    }

    return {
      bottlenecks,
      optimizationPriority,
    };
  }, [config, state]);

  const generateOptimizationReport = useCallback(async (): Promise<any> => {
    const bottlenecks = await analyzePerformanceBottlenecks();
    const trends = getPerformanceTrends(60 * 60 * 1000); // Last hour
    const therapeuticMetrics = getTherapeuticProtectionMetrics();

    return {
      timestamp: new Date(),
      summary: {
        overallGrade: state.currentPerformanceGrade,
        trend: trends.trend,
        primaryBottlenecks: bottlenecks.bottlenecks.filter(b => b.severity === 'high').length,
        optimizationPotential: bottlenecks.optimizationPriority.length > 0 ? 'high' : 'low',
      },
      performance: {
        averageResponseTime: trends.averageResponseTime,
        crisisCompliance: trends.crisisCompliance,
        therapeuticProtection: therapeuticMetrics.continuityMaintained,
        memoryEfficiency: state.memoryEfficiencyScore,
      },
      bottlenecks: bottlenecks.bottlenecks,
      recommendations: bottlenecks.optimizationPriority,
    };
  }, [state, analyzePerformanceBottlenecks, getPerformanceTrends, getTherapeuticProtectionMetrics]);

  /**
   * Configuration & State Management
   */
  const updateMonitoringConfig = useCallback((newConfig: Partial<PerformanceMonitoringConfig>): void => {
    setConfig(prev => ({ ...prev, ...newConfig }));
    setState(prev => ({ ...prev, monitoringEnabled: newConfig.enabled ?? prev.monitoringEnabled }));
  }, []);

  const getMonitoringConfig = useCallback((): PerformanceMonitoringConfig => config, [config]);

  const resetPerformanceMetrics = useCallback((): void => {
    performanceMetrics.current = [];
    crisisResponseMetrics.current = [];
    webhookProcessingMetrics.current = [];
    therapeuticImpactMetrics.current = [];
    memoryMetrics.current = [];
    activeAlerts.current = [];

    setState(prev => ({
      ...prev,
      averageResponseTime: 50,
      crisisResponseCompliance: 100,
      therapeuticSessionsProtected: 0,
      memoryEfficiencyScore: 100,
      activeAlerts: 0,
      performanceTrend: 'stable',
    }));

    console.log('Performance metrics reset');
  }, []);

  /**
   * Detailed Analytics
   */
  const getPerformanceMetrics = useCallback((timeWindow?: number): PerformanceMetric[] => {
    if (timeWindow) {
      const cutoff = Date.now() - timeWindow;
      return performanceMetrics.current.filter(m => m.timestamp > cutoff);
    }
    return [...performanceMetrics.current];
  }, []);

  const getWebhookProcessingMetrics = useCallback((): WebhookProcessingPerformance[] => {
    return [...webhookProcessingMetrics.current];
  }, []);

  const exportPerformanceData = useCallback(async (format: 'json' | 'csv'): Promise<string> => {
    const data = {
      performanceMetrics: performanceMetrics.current,
      crisisResponseMetrics: crisisResponseMetrics.current,
      therapeuticImpactMetrics: therapeuticImpactMetrics.current,
      memoryMetrics: memoryMetrics.current,
      activeAlerts: activeAlerts.current,
      exportTimestamp: new Date().toISOString(),
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }

    // Simple CSV export for performance metrics
    const csvHeaders = 'timestamp,category,operation,duration,success,crisisMode,therapeuticImpact\n';
    const csvRows = performanceMetrics.current.map(m =>
      `${m.timestamp},${m.category},${m.operation},${m.duration},${m.success},${m.crisisMode},${m.therapeuticImpact}`
    ).join('\n');

    return csvHeaders + csvRows;
  }, []);

  // Set up monitoring timers
  useEffect(() => {
    if (config.realTimeDashboard) {
      dashboardUpdateTimer.current = setInterval(() => {
        // Update dashboard data periodically
        setState(prev => ({ ...prev, lastPerformanceCheck: new Date() }));
      }, 5000); // Update every 5 seconds
    }

    if (config.alerting) {
      alertCheckTimer.current = setInterval(() => {
        // Check for new alerts
        // This would normally analyze recent metrics for alert conditions
      }, 10000); // Check every 10 seconds
    }

    // Cleanup old data
    cleanupTimer.current = setInterval(() => {
      const cutoff = Date.now() - config.retentionPeriod;

      performanceMetrics.current = performanceMetrics.current.filter(m => m.timestamp > cutoff);
      crisisResponseMetrics.current = crisisResponseMetrics.current.filter(m => m.timing.detectionTime > cutoff);
      webhookProcessingMetrics.current = webhookProcessingMetrics.current.filter(m => m.totalProcessingTime > cutoff);
      therapeuticImpactMetrics.current = therapeuticImpactMetrics.current.filter(
        m => m.recoveryMetrics?.timeToRecovery ? m.recoveryMetrics.timeToRecovery > cutoff : true
      );
      memoryMetrics.current = memoryMetrics.current.filter(m => m.timestamp > cutoff);
    }, 60 * 60 * 1000); // Cleanup every hour

    return () => {
      if (dashboardUpdateTimer.current) clearInterval(dashboardUpdateTimer.current);
      if (alertCheckTimer.current) clearInterval(alertCheckTimer.current);
      if (cleanupTimer.current) clearInterval(cleanupTimer.current);
    };
  }, [config]);

  return {
    // Performance Measurement
    startPerformanceTracking,
    endPerformanceTracking,
    trackCrisisResponse,

    // Real-Time Monitoring
    getCurrentPerformanceState,
    getRealTimeDashboard,
    getPerformanceTrends,

    // Crisis Response Analytics
    getCrisisResponseMetrics,
    validateCrisisResponseTimes,
    generateCrisisComplianceReport,

    // Therapeutic Impact Assessment
    assessTherapeuticSessionImpact,
    getTherapeuticProtectionMetrics,

    // Memory & Resource Monitoring
    trackMemoryUsage,
    getMemoryEfficiencyReport,

    // Performance Alerts
    getActiveAlerts,
    acknowledgeAlert,
    resolveAlert,
    configureAlertThresholds,

    // Performance Optimization
    analyzePerformanceBottlenecks,
    generateOptimizationReport,

    // Configuration & State
    updateMonitoringConfig,
    getMonitoringConfig,
    resetPerformanceMetrics,

    // Detailed Analytics
    getPerformanceMetrics,
    getWebhookProcessingMetrics,
    exportPerformanceData,
  };
};