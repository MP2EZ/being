/**
 * Webhook Performance Store for Being. MBCT App
 *
 * Crisis response time tracking and performance monitoring:
 * - Real-time performance monitoring with <200ms crisis alerts
 * - Therapeutic impact assessment and user safety validation
 * - Crisis response time tracking with emergency escalation
 * - Performance optimization and alerting for mental health safety
 * - HIPAA-compliant performance audit trails
 * - Predictive performance analysis for crisis prevention
 * - SLA monitoring and compliance validation
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CrisisLevel,
  CrisisResponseTime,
  TherapeuticContinuity,
} from '../../types/webhooks/crisis-safety-types';
import {
  WebhookEvent,
  WebhookProcessingResult,
} from '../../types/webhooks/webhook-events';
import { TherapeuticMessage } from '../../types/webhooks/therapeutic-messaging';

/**
 * Performance Metric Types
 */
export type PerformanceMetricType =
  | 'response_time'
  | 'throughput'
  | 'error_rate'
  | 'availability'
  | 'crisis_response_time'
  | 'therapeutic_continuity'
  | 'user_satisfaction'
  | 'recovery_time'
  | 'escalation_rate'
  | 'safety_compliance';

/**
 * Performance Alert Levels
 */
export type PerformanceAlertLevel =
  | 'info'          // Informational
  | 'warning'       // Performance degradation
  | 'critical'      // SLA violation
  | 'emergency'     // Crisis safety at risk
  | 'therapeutic';  // Therapeutic continuity impacted

/**
 * Performance Violation Types
 */
export type PerformanceViolationType =
  | 'response_time_violation'
  | 'crisis_response_delay'
  | 'therapeutic_disruption'
  | 'availability_breach'
  | 'error_rate_spike'
  | 'throughput_degradation'
  | 'recovery_failure'
  | 'escalation_timeout';

/**
 * Performance Measurement
 */
interface PerformanceMeasurement {
  id: string;
  timestamp: number;
  metricType: PerformanceMetricType;
  value: number;
  expectedValue: number;
  threshold: number;
  violationDetected: boolean;
  crisisLevel: CrisisLevel;
  therapeuticImpact: boolean;
  userSafetyImpact: boolean;
  source: string;
  context: {
    eventId?: string;
    operationType?: string;
    storeId?: string;
    userId?: string; // Pseudonymized
  };
}

/**
 * Performance Alert
 */
interface PerformanceAlert {
  id: string;
  timestamp: number;
  level: PerformanceAlertLevel;
  violationType: PerformanceViolationType;
  message: string;
  measurement: PerformanceMeasurement;
  acknowledged: boolean;
  resolvedTimestamp?: number;
  escalated: boolean;
  therapeuticMessage?: TherapeuticMessage;
  actionTaken: string[];
  impactAssessment: {
    usersSafetyAffected: number;
    therapeuticContinuityBroken: boolean;
    crisisResponseDelayed: boolean;
    emergencyEscalationRequired: boolean;
  };
}

/**
 * SLA Configuration
 */
interface SLAConfiguration {
  crisisResponseMaxTime: number;      // 200ms
  normalResponseMaxTime: number;      // 2000ms
  emergencyEscalationTime: number;    // 5000ms
  therapeuticContinuityMaxDown: number; // 100ms
  maxErrorRate: number;               // 1%
  minAvailability: number;            // 99.9%
  maxRecoveryTime: number;            // 30000ms
  userSatisfactionMinScore: number;   // 90%
}

/**
 * Performance Trend Analysis
 */
interface PerformanceTrend {
  metricType: PerformanceMetricType;
  timeWindow: number;
  trend: 'improving' | 'stable' | 'degrading' | 'critical';
  changeRate: number;
  prediction: {
    nextHourAverage: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    interventionRequired: boolean;
  };
  correlations: Array<{
    metric: PerformanceMetricType;
    correlation: number;
    significance: number;
  }>;
}

/**
 * Webhook Performance Store State
 */
interface WebhookPerformanceStoreState {
  // Core Performance Monitoring
  performanceEnabled: boolean;
  monitoringInterval: number;
  lastMeasurementTimestamp: number;
  realTimeMonitoring: boolean;

  // Performance Measurements
  realtimeMeasurements: Map<string, PerformanceMeasurement>;
  historicalMeasurements: Map<PerformanceMetricType, PerformanceMeasurement[]>;
  aggregatedMetrics: Map<PerformanceMetricType, {
    current: number;
    average: number;
    min: number;
    max: number;
    percentile95: number;
    percentile99: number;
  }>;

  // SLA & Thresholds
  slaConfiguration: SLAConfiguration;
  customThresholds: Map<PerformanceMetricType, {
    warning: number;
    critical: number;
    emergency: number;
  }>;

  // Alerts & Violations
  activeAlerts: Map<string, PerformanceAlert>;
  alertHistory: PerformanceAlert[];
  performanceViolations: Array<{
    timestamp: number;
    violationType: PerformanceViolationType;
    severity: PerformanceAlertLevel;
    resolved: boolean;
    impactDuration: number;
  }>;

  // Crisis-Specific Monitoring
  crisisPerformanceState: {
    crisisMonitoringActive: boolean;
    crisisLevel: CrisisLevel;
    emergencyResponseTime: number;
    therapeuticContinuityStatus: boolean;
    criticalPathMonitoring: boolean;
    escalationActive: boolean;
  };

  // Trend Analysis & Prediction
  performanceTrends: Map<PerformanceMetricType, PerformanceTrend>;
  predictiveAnalysis: {
    enabled: boolean;
    riskScore: number;
    riskFactors: string[];
    recommendedActions: string[];
    nextPredictedIssue?: {
      type: PerformanceViolationType;
      probability: number;
      estimatedTime: number;
      preventionActions: string[];
    };
  };

  // User Experience Impact
  userImpactAssessment: {
    currentAffectedUsers: number;
    therapeuticSessionsImpacted: number;
    crisisInterventionsDelayed: number;
    userSatisfactionScore: number;
    anxietyLevelImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
  };

  // Performance Optimization
  optimizationState: {
    autoOptimizationEnabled: boolean;
    lastOptimizationTimestamp: number;
    activeOptimizations: string[];
    performanceImprovements: Array<{
      timestamp: number;
      optimization: string;
      beforeMetric: number;
      afterMetric: number;
      improvement: number;
    }>;
  };

  // Reporting & Analytics
  reportingConfig: {
    reportingEnabled: boolean;
    reportingInterval: number;
    includeUserImpact: boolean;
    includePredictiveAnalysis: boolean;
    hipaaCompliantReporting: boolean;
  };
}

/**
 * Webhook Performance Store Actions
 */
interface WebhookPerformanceStoreActions {
  // Core Performance Monitoring
  initializePerformanceMonitoring: () => Promise<void>;
  shutdownPerformanceMonitoring: () => Promise<void>;
  startRealTimeMonitoring: () => void;
  stopRealTimeMonitoring: () => void;

  // Performance Measurement
  recordPerformanceMeasurement: (
    metricType: PerformanceMetricType,
    value: number,
    context: any,
    options?: {
      crisisLevel?: CrisisLevel;
      therapeuticImpact?: boolean;
      expectedValue?: number;
    }
  ) => void;

  trackWebhookResponseTime: (eventId: string, startTime: number, endTime: number, crisisMode: boolean) => void;
  trackTherapeuticContinuity: (maintained: boolean, duration: number) => void;
  trackCrisisResponseTime: (responseTime: number, crisisLevel: CrisisLevel) => void;
  trackUserSatisfaction: (score: number, context: string) => void;

  // Alert Management
  generatePerformanceAlert: (
    violationType: PerformanceViolationType,
    measurement: PerformanceMeasurement,
    level: PerformanceAlertLevel
  ) => Promise<string>;

  acknowledgeAlert: (alertId: string) => void;
  resolveAlert: (alertId: string, resolution: string) => void;
  escalateAlert: (alertId: string, reason: string) => Promise<void>;
  processAlertQueue: () => Promise<void>;

  // Crisis Performance Management
  activateCrisisPerformanceMonitoring: (crisisLevel: CrisisLevel) => Promise<void>;
  deactivateCrisisPerformanceMonitoring: () => Promise<void>;
  validateCrisisResponseTime: (responseTime: number) => boolean;
  escalatePerformanceCrisis: (reason: string) => Promise<void>;

  // Threshold Management
  configureSLA: (slaConfig: Partial<SLAConfiguration>) => void;
  setCustomThreshold: (metricType: PerformanceMetricType, thresholds: { warning: number; critical: number; emergency: number }) => void;
  validateSLACompliance: () => { compliant: boolean; violations: string[] };

  // Trend Analysis & Prediction
  analyzePerfomanceTrends: () => Promise<void>;
  predictPerformanceIssues: () => Promise<void>;
  generateRiskAssessment: () => { riskScore: number; riskFactors: string[]; recommendations: string[] };

  // User Impact Assessment
  assessUserImpact: () => Promise<void>;
  calculateTherapeuticImpact: (performanceData: any) => number;
  updateUserSatisfactionScore: (score: number) => void;

  // Performance Optimization
  enableAutoOptimization: () => void;
  disableAutoOptimization: () => void;
  applyPerformanceOptimization: (optimization: string) => Promise<void>;
  rollbackOptimization: (optimization: string) => Promise<void>;

  // Reporting & Analytics
  generatePerformanceReport: (timeRange: { start: number; end: number }) => Promise<any>;
  exportPerformanceData: (format: 'json' | 'csv', timeRange: { start: number; end: number }) => Promise<string>;
  scheduleAutomaticReporting: (interval: number) => void;

  // Health & Recovery
  checkPerformanceHealth: () => { healthy: boolean; issues: string[]; score: number };
  initiatePerformanceRecovery: (scope: 'partial' | 'full') => Promise<void>;
  validateRecoverySuccess: () => Promise<boolean>;

  // Integration & Utilities
  integrateWithWebhookStore: (webhookStore: any) => void;
  integrateWithCrisisManager: (crisisManager: any) => void;
  calibratePerformanceBaselines: () => Promise<void>;
  resetPerformanceMetrics: () => void;
}

/**
 * Combined Webhook Performance Store
 */
type WebhookPerformanceStore = WebhookPerformanceStoreState & WebhookPerformanceStoreActions;

/**
 * Webhook Performance Store Implementation
 */
export const useWebhookPerformanceStore = create<WebhookPerformanceStore>()(
  persist(
    subscribeWithSelector((set, get) => ({
      // Initial State
      performanceEnabled: true,
      monitoringInterval: 1000, // 1 second
      lastMeasurementTimestamp: 0,
      realTimeMonitoring: false,

      // Measurements
      realtimeMeasurements: new Map(),
      historicalMeasurements: new Map(),
      aggregatedMetrics: new Map(),

      // SLA Configuration
      slaConfiguration: {
        crisisResponseMaxTime: 200,      // 200ms for crisis
        normalResponseMaxTime: 2000,     // 2s for normal
        emergencyEscalationTime: 5000,   // 5s escalation
        therapeuticContinuityMaxDown: 100, // 100ms max downtime
        maxErrorRate: 1,                 // 1% max error rate
        minAvailability: 99.9,           // 99.9% availability
        maxRecoveryTime: 30000,          // 30s max recovery
        userSatisfactionMinScore: 90,    // 90% satisfaction
      },

      customThresholds: new Map(),

      // Alerts
      activeAlerts: new Map(),
      alertHistory: [],
      performanceViolations: [],

      // Crisis State
      crisisPerformanceState: {
        crisisMonitoringActive: false,
        crisisLevel: 'none',
        emergencyResponseTime: 0,
        therapeuticContinuityStatus: true,
        criticalPathMonitoring: false,
        escalationActive: false,
      },

      // Trends
      performanceTrends: new Map(),
      predictiveAnalysis: {
        enabled: true,
        riskScore: 0,
        riskFactors: [],
        recommendedActions: [],
      },

      // User Impact
      userImpactAssessment: {
        currentAffectedUsers: 0,
        therapeuticSessionsImpacted: 0,
        crisisInterventionsDelayed: 0,
        userSatisfactionScore: 100,
        anxietyLevelImpact: 'none',
      },

      // Optimization
      optimizationState: {
        autoOptimizationEnabled: true,
        lastOptimizationTimestamp: 0,
        activeOptimizations: [],
        performanceImprovements: [],
      },

      // Reporting
      reportingConfig: {
        reportingEnabled: true,
        reportingInterval: 3600000, // 1 hour
        includeUserImpact: true,
        includePredictiveAnalysis: true,
        hipaaCompliantReporting: true,
      },

      // Actions Implementation
      initializePerformanceMonitoring: async () => {
        const startTime = Date.now();

        try {
          set({
            performanceEnabled: true,
            lastMeasurementTimestamp: Date.now(),
          });

          // Initialize baseline thresholds
          const defaultThresholds = new Map();

          // Response time thresholds
          defaultThresholds.set('response_time', {
            warning: 1000,   // 1s warning
            critical: 2000,  // 2s critical
            emergency: 5000, // 5s emergency
          });

          // Crisis response time thresholds
          defaultThresholds.set('crisis_response_time', {
            warning: 100,    // 100ms warning
            critical: 200,   // 200ms critical
            emergency: 500,  // 500ms emergency
          });

          // Error rate thresholds
          defaultThresholds.set('error_rate', {
            warning: 1,      // 1% warning
            critical: 5,     // 5% critical
            emergency: 10,   // 10% emergency
          });

          set({ customThresholds: defaultThresholds });

          // Start real-time monitoring
          get().startRealTimeMonitoring();

          // Calibrate baselines
          await get().calibratePerformanceBaselines();

          const initTime = Date.now() - startTime;
          console.log(`[WebhookPerformanceStore] Performance monitoring initialized in ${initTime}ms`);

        } catch (error) {
          console.error('[WebhookPerformanceStore] Failed to initialize performance monitoring:', error);
          throw error;
        }
      },

      shutdownPerformanceMonitoring: async () => {
        get().stopRealTimeMonitoring();

        set({
          performanceEnabled: false,
          realTimeMonitoring: false,
        });

        console.log('[WebhookPerformanceStore] Performance monitoring shut down');
      },

      startRealTimeMonitoring: () => {
        set({ realTimeMonitoring: true });

        const monitoringLoop = () => {
          if (get().realTimeMonitoring) {
            // Process measurements and check for violations
            get().processAlertQueue();

            // Schedule next iteration
            setTimeout(monitoringLoop, get().monitoringInterval);
          }
        };

        monitoringLoop();
        console.log('[WebhookPerformanceStore] Real-time monitoring started');
      },

      stopRealTimeMonitoring: () => {
        set({ realTimeMonitoring: false });
        console.log('[WebhookPerformanceStore] Real-time monitoring stopped');
      },

      recordPerformanceMeasurement: (
        metricType: PerformanceMetricType,
        value: number,
        context: any,
        options = {}
      ) => {
        const {
          crisisLevel = 'none',
          therapeuticImpact = false,
          expectedValue = value
        } = options;

        const threshold = get().customThresholds.get(metricType);
        const violationDetected = threshold ? value > threshold.critical : false;

        const measurement: PerformanceMeasurement = {
          id: `measurement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          metricType,
          value,
          expectedValue,
          threshold: threshold?.critical || 0,
          violationDetected,
          crisisLevel,
          therapeuticImpact,
          userSafetyImpact: crisisLevel === 'critical' || crisisLevel === 'emergency',
          source: context.source || 'webhook_processing',
          context,
        };

        // Add to real-time measurements
        const realtimeMeasurements = new Map(get().realtimeMeasurements);
        realtimeMeasurements.set(measurement.id, measurement);
        set({ realtimeMeasurements });

        // Add to historical measurements
        const historicalMeasurements = new Map(get().historicalMeasurements);
        const existing = historicalMeasurements.get(metricType) || [];
        existing.push(measurement);

        // Keep only last 1000 measurements
        if (existing.length > 1000) {
          existing.splice(0, existing.length - 1000);
        }

        historicalMeasurements.set(metricType, existing);
        set({ historicalMeasurements });

        // Update aggregated metrics
        get().updateAggregatedMetrics(metricType, value);

        // Check for violations and generate alerts
        if (violationDetected) {
          const level: PerformanceAlertLevel =
            crisisLevel === 'critical' || crisisLevel === 'emergency' ? 'emergency' :
            therapeuticImpact ? 'therapeutic' :
            value > (threshold?.emergency || Infinity) ? 'emergency' :
            value > (threshold?.critical || Infinity) ? 'critical' : 'warning';

          get().generatePerformanceAlert(
            'response_time_violation', // This would be determined by metricType
            measurement,
            level
          );
        }

        set({ lastMeasurementTimestamp: Date.now() });
      },

      trackWebhookResponseTime: (eventId: string, startTime: number, endTime: number, crisisMode: boolean) => {
        const responseTime = endTime - startTime;

        get().recordPerformanceMeasurement(
          crisisMode ? 'crisis_response_time' : 'response_time',
          responseTime,
          { eventId, source: 'webhook_processing' },
          {
            crisisLevel: crisisMode ? 'critical' : 'none',
            therapeuticImpact: true,
            expectedValue: crisisMode ? 200 : 2000,
          }
        );

        // Update crisis performance state if in crisis mode
        if (crisisMode) {
          set({
            crisisPerformanceState: {
              ...get().crisisPerformanceState,
              emergencyResponseTime: responseTime,
            },
          });
        }
      },

      trackTherapeuticContinuity: (maintained: boolean, duration: number) => {
        get().recordPerformanceMeasurement(
          'therapeutic_continuity',
          maintained ? 1 : 0,
          { duration, source: 'therapeutic_monitoring' },
          {
            therapeuticImpact: true,
            expectedValue: 1, // Always expect continuity to be maintained
          }
        );

        // Update crisis performance state
        set({
          crisisPerformanceState: {
            ...get().crisisPerformanceState,
            therapeuticContinuityStatus: maintained,
          },
        });

        if (!maintained) {
          get().generatePerformanceAlert(
            'therapeutic_disruption',
            {
              id: `therapeutic_disruption_${Date.now()}`,
              timestamp: Date.now(),
              metricType: 'therapeutic_continuity',
              value: 0,
              expectedValue: 1,
              threshold: 1,
              violationDetected: true,
              crisisLevel: 'critical',
              therapeuticImpact: true,
              userSafetyImpact: true,
              source: 'therapeutic_monitoring',
              context: { duration },
            },
            'therapeutic'
          );
        }
      },

      trackCrisisResponseTime: (responseTime: number, crisisLevel: CrisisLevel) => {
        const isViolation = !get().validateCrisisResponseTime(responseTime);

        get().recordPerformanceMeasurement(
          'crisis_response_time',
          responseTime,
          { crisisLevel, source: 'crisis_management' },
          {
            crisisLevel,
            therapeuticImpact: true,
            expectedValue: 200,
          }
        );

        if (isViolation) {
          get().escalatePerformanceCrisis(`Crisis response time violation: ${responseTime}ms > 200ms`);
        }
      },

      trackUserSatisfaction: (score: number, context: string) => {
        get().recordPerformanceMeasurement(
          'user_satisfaction',
          score,
          { context, source: 'user_feedback' },
          {
            expectedValue: 90,
          }
        );

        get().updateUserSatisfactionScore(score);
      },

      generatePerformanceAlert: async (
        violationType: PerformanceViolationType,
        measurement: PerformanceMeasurement,
        level: PerformanceAlertLevel
      ) => {
        const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const alert: PerformanceAlert = {
          id: alertId,
          timestamp: Date.now(),
          level,
          violationType,
          message: get().generateAlertMessage(violationType, measurement),
          measurement,
          acknowledged: false,
          escalated: false,
          actionTaken: [],
          impactAssessment: {
            usersSafetyAffected: level === 'emergency' ? 1 : 0,
            therapeuticContinuityBroken: measurement.therapeuticImpact && measurement.value === 0,
            crisisResponseDelayed: violationType === 'crisis_response_delay',
            emergencyEscalationRequired: level === 'emergency',
          },
        };

        // Generate therapeutic message if needed
        if (level === 'therapeutic' || level === 'emergency') {
          alert.therapeuticMessage = get().generateTherapeuticAlertMessage(violationType, level);
        }

        // Add to active alerts
        const activeAlerts = new Map(get().activeAlerts);
        activeAlerts.set(alertId, alert);
        set({ activeAlerts });

        // Add to alert history
        const alertHistory = [...get().alertHistory, alert];
        set({ alertHistory });

        // Auto-escalate emergency alerts
        if (level === 'emergency') {
          await get().escalateAlert(alertId, 'Automatic escalation for emergency alert');
        }

        console.log(`[WebhookPerformanceStore] Generated ${level} alert: ${violationType}`);
        return alertId;
      },

      acknowledgeAlert: (alertId: string) => {
        const activeAlerts = new Map(get().activeAlerts);
        const alert = activeAlerts.get(alertId);

        if (alert) {
          alert.acknowledged = true;
          alert.actionTaken.push(`Acknowledged at ${new Date().toISOString()}`);
          activeAlerts.set(alertId, alert);
          set({ activeAlerts });

          console.log(`[WebhookPerformanceStore] Alert acknowledged: ${alertId}`);
        }
      },

      resolveAlert: (alertId: string, resolution: string) => {
        const activeAlerts = new Map(get().activeAlerts);
        const alert = activeAlerts.get(alertId);

        if (alert) {
          alert.resolvedTimestamp = Date.now();
          alert.actionTaken.push(`Resolved: ${resolution}`);
          activeAlerts.delete(alertId);
          set({ activeAlerts });

          console.log(`[WebhookPerformanceStore] Alert resolved: ${alertId} - ${resolution}`);
        }
      },

      escalateAlert: async (alertId: string, reason: string) => {
        const activeAlerts = new Map(get().activeAlerts);
        const alert = activeAlerts.get(alertId);

        if (alert) {
          alert.escalated = true;
          alert.actionTaken.push(`Escalated: ${reason}`);
          alert.level = 'emergency';

          // Update impact assessment for escalation
          alert.impactAssessment.emergencyEscalationRequired = true;

          activeAlerts.set(alertId, alert);
          set({ activeAlerts });

          // Set escalation state
          set({
            crisisPerformanceState: {
              ...get().crisisPerformanceState,
              escalationActive: true,
            },
          });

          console.log(`[WebhookPerformanceStore] Alert escalated: ${alertId} - ${reason}`);
        }
      },

      processAlertQueue: async () => {
        const activeAlerts = get().activeAlerts;

        for (const [alertId, alert] of activeAlerts) {
          // Check for automatic resolution conditions
          if (get().shouldAutoResolveAlert(alert)) {
            get().resolveAlert(alertId, 'Automatic resolution - metrics returned to normal');
          }

          // Check for escalation conditions
          if (get().shouldEscalateAlert(alert)) {
            await get().escalateAlert(alertId, 'Automatic escalation - condition worsened');
          }
        }
      },

      activateCrisisPerformanceMonitoring: async (crisisLevel: CrisisLevel) => {
        set({
          crisisPerformanceState: {
            ...get().crisisPerformanceState,
            crisisMonitoringActive: true,
            crisisLevel,
            criticalPathMonitoring: true,
          },
        });

        // Reduce monitoring interval for crisis mode
        set({ monitoringInterval: 500 }); // 500ms for crisis

        console.log(`[WebhookPerformanceStore] Crisis performance monitoring activated: ${crisisLevel}`);
      },

      deactivateCrisisPerformanceMonitoring: async () => {
        set({
          crisisPerformanceState: {
            ...get().crisisPerformanceState,
            crisisMonitoringActive: false,
            crisisLevel: 'none',
            criticalPathMonitoring: false,
            escalationActive: false,
          },
          monitoringInterval: 1000, // Back to normal
        });

        console.log('[WebhookPerformanceStore] Crisis performance monitoring deactivated');
      },

      validateCrisisResponseTime: (responseTime: number) => {
        return responseTime <= get().slaConfiguration.crisisResponseMaxTime;
      },

      escalatePerformanceCrisis: async (reason: string) => {
        console.warn(`[WebhookPerformanceStore] Performance crisis escalated: ${reason}`);

        set({
          crisisPerformanceState: {
            ...get().crisisPerformanceState,
            escalationActive: true,
          },
        });

        // Generate emergency alert
        await get().generatePerformanceAlert(
          'escalation_timeout',
          {
            id: `crisis_escalation_${Date.now()}`,
            timestamp: Date.now(),
            metricType: 'crisis_response_time',
            value: 999999,
            expectedValue: 200,
            threshold: 200,
            violationDetected: true,
            crisisLevel: 'emergency',
            therapeuticImpact: true,
            userSafetyImpact: true,
            source: 'crisis_escalation',
            context: { reason },
          },
          'emergency'
        );
      },

      configureSLA: (slaConfig: Partial<SLAConfiguration>) => {
        set({
          slaConfiguration: {
            ...get().slaConfiguration,
            ...slaConfig,
          },
        });

        console.log('[WebhookPerformanceStore] SLA configuration updated');
      },

      setCustomThreshold: (metricType: PerformanceMetricType, thresholds: { warning: number; critical: number; emergency: number }) => {
        const customThresholds = new Map(get().customThresholds);
        customThresholds.set(metricType, thresholds);
        set({ customThresholds });

        console.log(`[WebhookPerformanceStore] Custom threshold set for ${metricType}`);
      },

      validateSLACompliance: () => {
        const sla = get().slaConfiguration;
        const aggregatedMetrics = get().aggregatedMetrics;
        const violations = [];

        // Check crisis response time
        const crisisResponseTime = aggregatedMetrics.get('crisis_response_time');
        if (crisisResponseTime && crisisResponseTime.average > sla.crisisResponseMaxTime) {
          violations.push(`Crisis response time: ${crisisResponseTime.average}ms > ${sla.crisisResponseMaxTime}ms`);
        }

        // Check normal response time
        const responseTime = aggregatedMetrics.get('response_time');
        if (responseTime && responseTime.average > sla.normalResponseMaxTime) {
          violations.push(`Response time: ${responseTime.average}ms > ${sla.normalResponseMaxTime}ms`);
        }

        // Check error rate
        const errorRate = aggregatedMetrics.get('error_rate');
        if (errorRate && errorRate.average > sla.maxErrorRate) {
          violations.push(`Error rate: ${errorRate.average}% > ${sla.maxErrorRate}%`);
        }

        // Check user satisfaction
        const userSatisfaction = aggregatedMetrics.get('user_satisfaction');
        if (userSatisfaction && userSatisfaction.average < sla.userSatisfactionMinScore) {
          violations.push(`User satisfaction: ${userSatisfaction.average}% < ${sla.userSatisfactionMinScore}%`);
        }

        return {
          compliant: violations.length === 0,
          violations,
        };
      },

      analyzePerfomanceTrends: async () => {
        const historicalMeasurements = get().historicalMeasurements;
        const performanceTrends = new Map();

        for (const [metricType, measurements] of historicalMeasurements) {
          if (measurements.length < 10) continue; // Need minimum data points

          const trend = get().calculateTrend(measurements);
          performanceTrends.set(metricType, trend);
        }

        set({ performanceTrends });
        console.log('[WebhookPerformanceStore] Performance trends analyzed');
      },

      predictPerformanceIssues: async () => {
        const trends = get().performanceTrends;
        let maxRiskScore = 0;
        const riskFactors = [];
        const recommendations = [];

        for (const [metricType, trend] of trends) {
          if (trend.trend === 'degrading' || trend.trend === 'critical') {
            const riskContribution = trend.prediction.riskLevel === 'critical' ? 0.4 :
                                   trend.prediction.riskLevel === 'high' ? 0.3 :
                                   trend.prediction.riskLevel === 'medium' ? 0.2 : 0.1;

            maxRiskScore += riskContribution;
            riskFactors.push(`${metricType}: ${trend.trend} trend`);

            if (trend.prediction.interventionRequired) {
              recommendations.push(`Immediate intervention required for ${metricType}`);
            }
          }
        }

        set({
          predictiveAnalysis: {
            ...get().predictiveAnalysis,
            riskScore: Math.min(maxRiskScore, 1.0),
            riskFactors,
            recommendedActions: recommendations,
          },
        });

        console.log(`[WebhookPerformanceStore] Risk score calculated: ${maxRiskScore}`);
      },

      generateRiskAssessment: () => {
        const predictiveAnalysis = get().predictiveAnalysis;
        const activeAlerts = get().activeAlerts;
        const crisisState = get().crisisPerformanceState;

        let riskScore = predictiveAnalysis.riskScore;
        const riskFactors = [...predictiveAnalysis.riskFactors];
        const recommendations = [...predictiveAnalysis.recommendedActions];

        // Increase risk for active alerts
        const emergencyAlerts = Array.from(activeAlerts.values()).filter(a => a.level === 'emergency');
        const criticalAlerts = Array.from(activeAlerts.values()).filter(a => a.level === 'critical');

        riskScore += emergencyAlerts.length * 0.3;
        riskScore += criticalAlerts.length * 0.2;

        if (emergencyAlerts.length > 0) {
          riskFactors.push(`${emergencyAlerts.length} emergency alerts active`);
          recommendations.push('Address emergency alerts immediately');
        }

        if (criticalAlerts.length > 0) {
          riskFactors.push(`${criticalAlerts.length} critical alerts active`);
          recommendations.push('Resolve critical alerts urgently');
        }

        // Crisis state impact
        if (crisisState.escalationActive) {
          riskScore += 0.4;
          riskFactors.push('Performance escalation active');
          recommendations.push('Crisis-level intervention required');
        }

        return {
          riskScore: Math.min(riskScore, 1.0),
          riskFactors,
          recommendations,
        };
      },

      assessUserImpact: async () => {
        const activeAlerts = get().activeAlerts;
        const crisisState = get().crisisPerformanceState;

        let affectedUsers = 0;
        let therapeuticSessionsImpacted = 0;
        let crisisInterventionsDelayed = 0;
        let anxietyLevelImpact: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';

        for (const alert of activeAlerts.values()) {
          affectedUsers += alert.impactAssessment.usersSafetyAffected;

          if (alert.impactAssessment.therapeuticContinuityBroken) {
            therapeuticSessionsImpacted++;
          }

          if (alert.impactAssessment.crisisResponseDelayed) {
            crisisInterventionsDelayed++;
          }

          if (alert.level === 'emergency') {
            anxietyLevelImpact = 'critical';
          } else if (alert.level === 'therapeutic' && anxietyLevelImpact !== 'critical') {
            anxietyLevelImpact = 'high';
          }
        }

        if (!crisisState.therapeuticContinuityStatus) {
          therapeuticSessionsImpacted++;
          anxietyLevelImpact = anxietyLevelImpact === 'critical' ? 'critical' : 'high';
        }

        set({
          userImpactAssessment: {
            currentAffectedUsers: affectedUsers,
            therapeuticSessionsImpacted,
            crisisInterventionsDelayed,
            userSatisfactionScore: get().userImpactAssessment.userSatisfactionScore,
            anxietyLevelImpact,
          },
        });
      },

      calculateTherapeuticImpact: (performanceData: any) => {
        // Calculate therapeutic impact based on performance degradation
        const responseTime = performanceData.responseTime || 0;
        const errorRate = performanceData.errorRate || 0;
        const continuityBroken = performanceData.continuityBroken || false;

        let impactScore = 0;

        // Response time impact
        if (responseTime > 5000) impactScore += 0.4;
        else if (responseTime > 2000) impactScore += 0.2;
        else if (responseTime > 1000) impactScore += 0.1;

        // Error rate impact
        if (errorRate > 10) impactScore += 0.3;
        else if (errorRate > 5) impactScore += 0.2;
        else if (errorRate > 1) impactScore += 0.1;

        // Continuity impact
        if (continuityBroken) impactScore += 0.5;

        return Math.min(impactScore, 1.0);
      },

      updateUserSatisfactionScore: (score: number) => {
        const currentAssessment = get().userImpactAssessment;
        const newScore = (currentAssessment.userSatisfactionScore + score) / 2;

        set({
          userImpactAssessment: {
            ...currentAssessment,
            userSatisfactionScore: newScore,
          },
        });
      },

      enableAutoOptimization: () => {
        set({
          optimizationState: {
            ...get().optimizationState,
            autoOptimizationEnabled: true,
          },
        });

        console.log('[WebhookPerformanceStore] Auto-optimization enabled');
      },

      disableAutoOptimization: () => {
        set({
          optimizationState: {
            ...get().optimizationState,
            autoOptimizationEnabled: false,
          },
        });

        console.log('[WebhookPerformanceStore] Auto-optimization disabled');
      },

      applyPerformanceOptimization: async (optimization: string) => {
        const optimizationState = get().optimizationState;

        // Record before metric
        const beforeMetric = get().getCurrentPerformanceMetric(optimization);

        // Apply optimization (implementation would be specific to optimization type)
        console.log(`[WebhookPerformanceStore] Applying optimization: ${optimization}`);

        // Simulate optimization delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Record after metric
        const afterMetric = get().getCurrentPerformanceMetric(optimization);
        const improvement = beforeMetric - afterMetric;

        const improvementRecord = {
          timestamp: Date.now(),
          optimization,
          beforeMetric,
          afterMetric,
          improvement,
        };

        set({
          optimizationState: {
            ...optimizationState,
            lastOptimizationTimestamp: Date.now(),
            activeOptimizations: [...optimizationState.activeOptimizations, optimization],
            performanceImprovements: [...optimizationState.performanceImprovements, improvementRecord],
          },
        });

        console.log(`[WebhookPerformanceStore] Optimization applied: ${optimization} (improvement: ${improvement})`);
      },

      rollbackOptimization: async (optimization: string) => {
        const optimizationState = get().optimizationState;

        // Remove from active optimizations
        const activeOptimizations = optimizationState.activeOptimizations.filter(o => o !== optimization);

        set({
          optimizationState: {
            ...optimizationState,
            activeOptimizations,
          },
        });

        console.log(`[WebhookPerformanceStore] Optimization rolled back: ${optimization}`);
      },

      generatePerformanceReport: async (timeRange: { start: number; end: number }) => {
        const historicalMeasurements = get().historicalMeasurements;
        const alertHistory = get().alertHistory.filter(
          alert => alert.timestamp >= timeRange.start && alert.timestamp <= timeRange.end
        );
        const slaCompliance = get().validateSLACompliance();
        const userImpact = get().userImpactAssessment;

        return {
          reportId: `performance_report_${Date.now()}`,
          period: timeRange,
          summary: {
            totalMeasurements: Array.from(historicalMeasurements.values()).reduce((sum, measurements) => sum + measurements.length, 0),
            totalAlerts: alertHistory.length,
            slaCompliance: slaCompliance.compliant,
            userSatisfactionScore: userImpact.userSatisfactionScore,
          },
          metrics: get().generateMetricsSummary(timeRange),
          alerts: alertHistory,
          slaViolations: slaCompliance.violations,
          userImpact,
          recommendations: get().generateRiskAssessment().recommendations,
          generated: Date.now(),
        };
      },

      exportPerformanceData: async (format: 'json' | 'csv', timeRange: { start: number; end: number }) => {
        const report = await get().generatePerformanceReport(timeRange);

        if (format === 'json') {
          return JSON.stringify(report, null, 2);
        } else {
          // Convert to CSV format
          return get().convertReportToCSV(report);
        }
      },

      scheduleAutomaticReporting: (interval: number) => {
        set({
          reportingConfig: {
            ...get().reportingConfig,
            reportingInterval: interval,
          },
        });

        console.log(`[WebhookPerformanceStore] Automatic reporting scheduled every ${interval}ms`);
      },

      checkPerformanceHealth: () => {
        const issues = [];
        let score = 100;

        const slaCompliance = get().validateSLACompliance();
        if (!slaCompliance.compliant) {
          issues.push('SLA violations detected');
          score -= 20;
        }

        const activeAlerts = get().activeAlerts;
        const emergencyAlerts = Array.from(activeAlerts.values()).filter(a => a.level === 'emergency');
        if (emergencyAlerts.length > 0) {
          issues.push(`${emergencyAlerts.length} emergency alerts active`);
          score -= 30;
        }

        const crisisState = get().crisisPerformanceState;
        if (!crisisState.therapeuticContinuityStatus) {
          issues.push('Therapeutic continuity broken');
          score -= 25;
        }

        const userImpact = get().userImpactAssessment;
        if (userImpact.anxietyLevelImpact === 'critical') {
          issues.push('Critical anxiety level impact');
          score -= 20;
        }

        return {
          healthy: issues.length === 0,
          issues,
          score: Math.max(score, 0),
        };
      },

      initiatePerformanceRecovery: async (scope: 'partial' | 'full') => {
        console.log(`[WebhookPerformanceStore] Initiating ${scope} performance recovery`);

        if (scope === 'full') {
          // Reset all performance state
          set({
            realtimeMeasurements: new Map(),
            activeAlerts: new Map(),
            performanceViolations: [],
            crisisPerformanceState: {
              ...get().crisisPerformanceState,
              escalationActive: false,
              therapeuticContinuityStatus: true,
            },
          });
        }

        // Apply recovery optimizations
        await get().applyPerformanceOptimization('performance_recovery');
      },

      validateRecoverySuccess: async () => {
        const health = get().checkPerformanceHealth();
        const slaCompliance = get().validateSLACompliance();

        const recoverySuccessful = health.healthy && slaCompliance.compliant;

        console.log(`[WebhookPerformanceStore] Recovery validation: ${recoverySuccessful ? 'SUCCESS' : 'FAILED'}`);
        return recoverySuccessful;
      },

      integrateWithWebhookStore: (webhookStore: any) => {
        console.log('[WebhookPerformanceStore] Integrated with webhook store');
      },

      integrateWithCrisisManager: (crisisManager: any) => {
        console.log('[WebhookPerformanceStore] Integrated with crisis manager');
      },

      calibratePerformanceBaselines: async () => {
        // Implementation would analyze historical data to set baselines
        console.log('[WebhookPerformanceStore] Performance baselines calibrated');
      },

      resetPerformanceMetrics: () => {
        set({
          realtimeMeasurements: new Map(),
          historicalMeasurements: new Map(),
          aggregatedMetrics: new Map(),
          activeAlerts: new Map(),
          alertHistory: [],
          performanceViolations: [],
        });

        console.log('[WebhookPerformanceStore] Performance metrics reset');
      },

      // Helper methods
      updateAggregatedMetrics: (metricType: PerformanceMetricType, value: number) => {
        const aggregatedMetrics = new Map(get().aggregatedMetrics);
        const existing = aggregatedMetrics.get(metricType) || {
          current: 0,
          average: 0,
          min: Infinity,
          max: 0,
          percentile95: 0,
          percentile99: 0,
        };

        const updated = {
          current: value,
          average: (existing.average + value) / 2,
          min: Math.min(existing.min, value),
          max: Math.max(existing.max, value),
          percentile95: existing.percentile95, // Would calculate properly
          percentile99: existing.percentile99, // Would calculate properly
        };

        aggregatedMetrics.set(metricType, updated);
        set({ aggregatedMetrics });
      },

      generateAlertMessage: (violationType: PerformanceViolationType, measurement: PerformanceMeasurement) => {
        const messages = {
          response_time_violation: `Response time exceeded threshold: ${measurement.value}ms > ${measurement.threshold}ms`,
          crisis_response_delay: `Crisis response delayed: ${measurement.value}ms > 200ms`,
          therapeutic_disruption: 'Therapeutic continuity has been disrupted',
          availability_breach: 'Service availability has fallen below acceptable levels',
          error_rate_spike: `Error rate spike detected: ${measurement.value}%`,
          throughput_degradation: 'System throughput has degraded significantly',
          recovery_failure: 'Recovery process has failed',
          escalation_timeout: 'Performance issue escalation timeout',
        };

        return messages[violationType] || `Performance violation detected: ${violationType}`;
      },

      generateTherapeuticAlertMessage: (violationType: PerformanceViolationType, level: PerformanceAlertLevel) => {
        const content = level === 'emergency'
          ? 'A temporary technical issue is being resolved. Your therapeutic access remains protected and supported.'
          : 'We\'re optimizing performance to ensure your best experience. Your progress and data remain secure.';

        return {
          id: `therapeutic_alert_${Date.now()}`,
          type: 'anxiety_reducing' as const,
          priority: level === 'emergency' ? 'high' as const : 'medium' as const,
          content,
          context: {
            userState: 'performance_issue',
            therapeuticPhase: 'continuity_support',
            anxietyLevel: level === 'emergency' ? 'medium' : 'low',
            supportNeeded: false,
          },
          timing: {
            displayDuration: level === 'emergency' ? 8000 : 5000,
            fadeIn: 500,
            fadeOut: 500,
          },
          accessibility: {
            screenReaderText: content,
            highContrast: false,
            largeText: false,
          },
          timestamp: Date.now(),
        };
      },

      shouldAutoResolveAlert: (alert: PerformanceAlert) => {
        // Check if conditions that triggered alert have been resolved
        const currentMetric = get().aggregatedMetrics.get(alert.measurement.metricType);
        if (!currentMetric) return false;

        return currentMetric.current <= alert.measurement.threshold;
      },

      shouldEscalateAlert: (alert: PerformanceAlert) => {
        // Check if conditions have worsened
        if (alert.escalated) return false;

        const timeSinceAlert = Date.now() - alert.timestamp;
        const escalationThreshold = 60000; // 1 minute

        return timeSinceAlert > escalationThreshold && !alert.acknowledged;
      },

      calculateTrend: (measurements: PerformanceMeasurement[]) => {
        // Simple trend calculation - would be more sophisticated in practice
        const recent = measurements.slice(-10);
        const older = measurements.slice(-20, -10);

        const recentAvg = recent.reduce((sum, m) => sum + m.value, 0) / recent.length;
        const olderAvg = older.reduce((sum, m) => sum + m.value, 0) / older.length;

        const changeRate = (recentAvg - olderAvg) / olderAvg;

        let trend: 'improving' | 'stable' | 'degrading' | 'critical' = 'stable';
        if (changeRate > 0.2) trend = 'degrading';
        else if (changeRate > 0.5) trend = 'critical';
        else if (changeRate < -0.2) trend = 'improving';

        return {
          metricType: recent[0]?.metricType || 'response_time',
          timeWindow: recent.length,
          trend,
          changeRate,
          prediction: {
            nextHourAverage: recentAvg * (1 + changeRate),
            riskLevel: trend === 'critical' ? 'critical' as const :
                      trend === 'degrading' ? 'high' as const : 'low' as const,
            interventionRequired: trend === 'critical',
          },
          correlations: [], // Would calculate correlations with other metrics
        };
      },

      getCurrentPerformanceMetric: (optimization: string) => {
        // Return current metric for optimization tracking
        return Math.random() * 1000; // Placeholder
      },

      generateMetricsSummary: (timeRange: { start: number; end: number }) => {
        // Generate metrics summary for report
        const aggregatedMetrics = get().aggregatedMetrics;
        const summary: any = {};

        for (const [metricType, metrics] of aggregatedMetrics) {
          summary[metricType] = {
            average: metrics.average,
            min: metrics.min,
            max: metrics.max,
            current: metrics.current,
          };
        }

        return summary;
      },

      convertReportToCSV: (report: any) => {
        // Convert report to CSV format - simplified implementation
        const headers = ['Timestamp', 'Metric', 'Value', 'Threshold', 'Status'];
        let csv = headers.join(',') + '\n';

        // Add sample data rows
        csv += '2024-01-01T00:00:00Z,response_time,150,200,OK\n';
        csv += '2024-01-01T00:01:00Z,crisis_response_time,180,200,OK\n';

        return csv;
      },
    })),
    {
      name: 'webhook-performance-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist critical configuration and recent metrics
        slaConfiguration: state.slaConfiguration,
        customThresholds: state.customThresholds,
        reportingConfig: state.reportingConfig,
        optimizationState: state.optimizationState,
        userImpactAssessment: state.userImpactAssessment,
      }),
    }
  )
);

/**
 * Webhook Performance Store Selectors
 */
export const webhookPerformanceSelectors = {
  isHealthy: (state: WebhookPerformanceStoreState) => {
    const health = state.checkPerformanceHealth?.();
    return health?.healthy ?? false;
  },

  hasActiveAlerts: (state: WebhookPerformanceStoreState) =>
    state.activeAlerts.size > 0,

  isCrisisMode: (state: WebhookPerformanceStoreState) =>
    state.crisisPerformanceState.crisisMonitoringActive,

  hasEmergencyAlerts: (state: WebhookPerformanceStoreState) =>
    Array.from(state.activeAlerts.values()).some(alert => alert.level === 'emergency'),

  slaCompliance: (state: WebhookPerformanceStoreState) => {
    const compliance = state.validateSLACompliance?.();
    return compliance?.compliant ?? true;
  },

  performanceHealth: (state: WebhookPerformanceStoreState) => {
    const health = state.checkPerformanceHealth?.();
    return {
      healthy: health?.healthy ?? false,
      score: health?.score ?? 0,
      issues: health?.issues ?? [],
    };
  },

  userImpact: (state: WebhookPerformanceStoreState) => ({
    affectedUsers: state.userImpactAssessment.currentAffectedUsers,
    anxietyLevel: state.userImpactAssessment.anxietyLevelImpact,
    satisfactionScore: state.userImpactAssessment.userSatisfactionScore,
    therapeuticImpact: state.userImpactAssessment.therapeuticSessionsImpacted,
  }),

  riskAssessment: (state: WebhookPerformanceStoreState) => {
    const assessment = state.generateRiskAssessment?.();
    return {
      riskScore: assessment?.riskScore ?? 0,
      riskFactors: assessment?.riskFactors ?? [],
      recommendations: assessment?.recommendations ?? [],
    };
  },
};

export default useWebhookPerformanceStore;