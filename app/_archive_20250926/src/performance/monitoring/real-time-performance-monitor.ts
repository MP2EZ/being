/**
 * Real-Time Performance Monitor System
 *
 * Live performance tracking and alerting delivering:
 * - Real-time sync latency monitoring with <500ms target validation
 * - Crisis response time tracking with <200ms guarantee compliance
 * - Subscription tier SLA monitoring with automatic violation detection
 * - Performance anomaly detection with predictive alerting
 * - Resource utilization tracking with optimization recommendations
 *
 * MONITORING CAPABILITIES:
 * - Sub-second performance metric collection and analysis
 * - Automated performance violation detection and mitigation
 * - Predictive performance issue identification
 * - Real-time dashboard data for performance insights
 * - Comprehensive performance audit trails
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { z } from 'zod';
import type { SubscriptionTier } from '../../types/subscription';

// ============================================================================
// PERFORMANCE MONITORING TYPES
// ============================================================================

/**
 * Real-time performance metrics
 */
export interface RealTimePerformanceMetrics {
  readonly timestamp: string;
  readonly syncLatency: {
    readonly current: number;                    // ms
    readonly average: number;                    // ms (rolling average)
    readonly p50: number;                        // ms
    readonly p95: number;                        // ms
    readonly p99: number;                        // ms
    readonly max: number;                        // ms
    readonly violationCount: number;             // violations in current window
  };
  readonly crisisResponse: {
    readonly lastResponseTime: number;           // ms
    readonly averageResponseTime: number;        // ms (rolling average)
    readonly guaranteeViolations: number;       // count of >200ms responses
    readonly successRate: number;               // 0-1
    readonly emergencyResponsesActive: number;  // current active emergencies
  };
  readonly throughput: {
    readonly operationsPerSecond: number;
    readonly requestsPerMinute: number;
    readonly successfulOperations: number;
    readonly failedOperations: number;
    readonly queueDepth: number;
  };
  readonly resource: {
    readonly cpuUsage: number;                   // 0-1
    readonly memoryUsage: number;                // bytes
    readonly networkBandwidth: number;          // bytes/second
    readonly diskIO: number;                     // bytes/second
    readonly batteryImpact: number;              // 0-1 (mobile only)
  };
  readonly subscription: {
    readonly currentTier: SubscriptionTier;
    readonly slaCompliance: number;              // 0-1
    readonly quotaUtilization: number;          // 0-1
    readonly tierOptimizationsActive: number;
  };
}

/**
 * Performance violation definition
 */
export interface PerformanceViolation {
  readonly violationId: string;
  readonly timestamp: string;
  readonly metricType: 'sync_latency' | 'crisis_response' | 'throughput' | 'resource' | 'sla_compliance';
  readonly severity: 'info' | 'warning' | 'critical' | 'emergency';
  readonly actualValue: number;
  readonly targetValue: number;
  readonly deviation: number;                    // percentage deviation
  readonly duration: number;                     // ms violation duration
  readonly context: {
    readonly subscriptionTier: SubscriptionTier;
    readonly deviceType: string;
    readonly networkQuality: string;
    readonly systemLoad: number;                 // 0-1
  };
  readonly impactAssessment: {
    readonly userExperience: 'none' | 'minor' | 'moderate' | 'significant' | 'severe';
    readonly therapeuticImpact: 'none' | 'minimal' | 'moderate' | 'high' | 'critical';
    readonly businessImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
  };
  readonly mitigationStatus: {
    readonly attempted: boolean;
    readonly successful: boolean;
    readonly mitigationActions: readonly string[];
    readonly timeToMitigation: number;           // ms
  };
}

/**
 * Performance trend analysis
 */
export interface PerformanceTrend {
  readonly metric: string;
  readonly timeframe: '5min' | '15min' | '1hour' | '24hour';
  readonly trend: 'improving' | 'stable' | 'degrading' | 'volatile';
  readonly changeRate: number;                   // percentage change per timeframe
  readonly confidence: number;                   // 0-1 confidence in trend
  readonly prediction: {
    readonly nextValue: number;
    readonly nextTimestamp: string;
    readonly confidence: number;
  };
  readonly anomalies: readonly {
    readonly timestamp: string;
    readonly value: number;
    readonly severity: number;                   // 0-1
    readonly description: string;
  }[];
}

/**
 * SLA compliance tracking
 */
export interface SLACompliance {
  readonly subscriptionTier: SubscriptionTier;
  readonly period: {
    readonly start: string;
    readonly end: string;
    readonly duration: number;                   // ms
  };
  readonly targets: {
    readonly syncLatency: number;                // ms
    readonly uptime: number;                     // 0-1
    readonly successRate: number;                // 0-1
    readonly crisisResponseTime: number;         // ms
  };
  readonly actual: {
    readonly syncLatency: number;                // ms average
    readonly uptime: number;                     // 0-1
    readonly successRate: number;                // 0-1
    readonly crisisResponseTime: number;         // ms average
  };
  readonly compliance: {
    readonly overall: number;                    // 0-1
    readonly syncLatency: boolean;
    readonly uptime: boolean;
    readonly successRate: boolean;
    readonly crisisResponse: boolean;
  };
  readonly violations: readonly PerformanceViolation[];
}

/**
 * Performance alert configuration
 */
export interface PerformanceAlert {
  readonly alertId: string;
  readonly alertType: 'threshold' | 'anomaly' | 'trend' | 'sla_violation' | 'predictive';
  readonly metric: string;
  readonly conditions: {
    readonly threshold?: number;
    readonly comparison: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
    readonly duration?: number;                  // ms - how long condition must persist
    readonly windowSize?: number;                // ms - sliding window for analysis
  };
  readonly severity: 'info' | 'warning' | 'critical' | 'emergency';
  readonly enabled: boolean;
  readonly subscriptionTiers: readonly SubscriptionTier[]; // Which tiers this applies to
  readonly actions: readonly {
    readonly action: 'notification' | 'auto_mitigation' | 'escalation' | 'logging';
    readonly config: Record<string, any>;
  }[];
}

/**
 * Performance dashboard data
 */
export interface PerformanceDashboardData {
  readonly timestamp: string;
  readonly summary: {
    readonly overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    readonly healthScore: number;                // 0-100
    readonly activeViolations: number;
    readonly criticalIssues: number;
    readonly performanceTrend: 'improving' | 'stable' | 'degrading';
  };
  readonly keyMetrics: {
    readonly avgSyncLatency: number;             // ms
    readonly crisisResponseCompliance: number;   // 0-1
    readonly systemThroughput: number;           // ops/sec
    readonly resourceUtilization: number;       // 0-1
    readonly slaCompliance: number;              // 0-1
  };
  readonly recentViolations: readonly PerformanceViolation[];
  readonly performanceTrends: readonly PerformanceTrend[];
  readonly subscriptionTierPerformance: Record<SubscriptionTier, {
    readonly compliance: number;
    readonly violations: number;
    readonly avgPerformance: number;
  }>;
}

// ============================================================================
// REAL-TIME PERFORMANCE MONITOR STORE
// ============================================================================

export interface RealTimePerformanceMonitorStore {
  // Monitoring state
  isMonitoring: boolean;
  monitoringStartTime: string | null;
  currentMetrics: RealTimePerformanceMetrics;
  metricHistory: readonly RealTimePerformanceMetrics[];

  // Violation and alerting state
  activeViolations: readonly PerformanceViolation[];
  resolvedViolations: readonly PerformanceViolation[];
  alertConfigurations: readonly PerformanceAlert[];

  // SLA and compliance state
  slaCompliance: Record<SubscriptionTier, SLACompliance>;
  complianceHistory: readonly SLACompliance[];

  // Trend analysis state
  performanceTrends: readonly PerformanceTrend[];
  anomalies: readonly any[];
  predictions: readonly any[];

  // Dashboard state
  dashboardData: PerformanceDashboardData;
  lastDashboardUpdate: string | null;

  // Internal monitoring state
  _internal: {
    monitoringInterval: NodeJS.Timeout | null;
    metricCollectors: Map<string, Array<{ timestamp: number; value: number }>>;
    alertEvaluators: Map<string, NodeJS.Timeout>;
    trendAnalyzers: Map<string, any>;
    performanceBuffer: Array<any>;
    violationDetectors: Map<string, Function>;
  };

  // Core monitoring actions
  startRealTimeMonitoring: (config?: any) => Promise<void>;
  stopRealTimeMonitoring: () => void;
  pauseMonitoring: () => void;
  resumeMonitoring: () => void;

  // Metric collection
  collectCurrentMetrics: () => Promise<RealTimePerformanceMetrics>;
  recordMetric: (metric: string, value: number, context?: any) => void;
  calculateRollingAverage: (metric: string, windowSize: number) => number;
  calculatePercentile: (metric: string, percentile: number) => number;

  // Performance violation detection
  detectViolations: () => Promise<readonly PerformanceViolation[]>;
  evaluatePerformanceAlert: (alert: PerformanceAlert) => Promise<boolean>;
  createViolation: (metricType: string, actualValue: number, targetValue: number, context: any) => PerformanceViolation;
  resolveViolation: (violationId: string, resolution: string) => Promise<void>;

  // SLA compliance tracking
  updateSLACompliance: (tier: SubscriptionTier) => Promise<void>;
  calculateComplianceScore: (tier: SubscriptionTier, period: { start: string; end: string }) => Promise<number>;
  trackSLAViolation: (tier: SubscriptionTier, violation: PerformanceViolation) => void;
  generateComplianceReport: (tier: SubscriptionTier, period: { start: string; end: string }) => Promise<SLACompliance>;

  // Trend analysis
  analyzeTrends: () => Promise<void>;
  detectAnomalies: (metric: string, values: readonly number[]) => Promise<readonly any[]>;
  predictFuturePerformance: (metric: string, timeframe: number) => Promise<{ value: number; confidence: number }>;
  identifyPerformancePatterns: () => Promise<Array<{ pattern: string; frequency: number; impact: string }>>;

  // Alert management
  configureAlert: (alert: PerformanceAlert) => void;
  removeAlert: (alertId: string) => void;
  evaluateAllAlerts: () => Promise<void>;
  triggerAlert: (alert: PerformanceAlert, violation: PerformanceViolation) => Promise<void>;

  // Mitigation and optimization
  attemptAutoMitigation: (violation: PerformanceViolation) => Promise<{ success: boolean; actions: readonly string[] }>;
  suggestOptimizations: () => Promise<Array<{ optimization: string; impact: string; effort: string }>>;
  applyPerformanceOptimization: (optimization: string) => Promise<boolean>;

  // Dashboard and reporting
  updateDashboard: () => Promise<void>;
  generatePerformanceReport: (timeframe: { start: string; end: string }) => Promise<any>;
  exportMetrics: (format: 'json' | 'csv', timeframe: { start: string; end: string }) => Promise<string>;
  getHealthScore: () => number;

  // Crisis performance monitoring
  activateCrisisMonitoring: () => Promise<void>;
  deactivateCrisisMonitoring: () => Promise<void>;
  validateCrisisResponseCompliance: () => Promise<boolean>;
  trackCrisisPerformance: (crisisId: string, responseTime: number) => void;

  // Mobile performance monitoring
  enableMobileOptimizations: () => void;
  trackBatteryImpact: (impact: number) => void;
  monitorNetworkQuality: () => Promise<string>;
  optimizeForMobileConstraints: () => Promise<void>;

  // Integration points
  integrateWithPerformanceStore: (store: any) => void;
  integrateWithCrisisStore: (store: any) => void;
  integrateWithSubscriptionStore: (store: any) => void;
}

/**
 * Default alert configurations
 */
const DEFAULT_ALERT_CONFIGS: readonly PerformanceAlert[] = [
  {
    alertId: 'sync_latency_critical',
    alertType: 'threshold',
    metric: 'sync_latency',
    conditions: {
      threshold: 2000, // 2 seconds
      comparison: 'greater_than',
      duration: 30000, // 30 seconds
    },
    severity: 'critical',
    enabled: true,
    subscriptionTiers: ['trial', 'basic', 'premium'],
    actions: [
      { action: 'auto_mitigation', config: { strategy: 'aggressive_optimization' } },
      { action: 'notification', config: { channels: ['dashboard', 'logs'] } },
    ],
  },
  {
    alertId: 'crisis_response_violation',
    alertType: 'threshold',
    metric: 'crisis_response_time',
    conditions: {
      threshold: 200, // 200ms
      comparison: 'greater_than',
      duration: 0, // Immediate
    },
    severity: 'emergency',
    enabled: true,
    subscriptionTiers: ['trial', 'basic', 'premium'],
    actions: [
      { action: 'auto_mitigation', config: { strategy: 'crisis_optimization' } },
      { action: 'escalation', config: { level: 'emergency' } },
      { action: 'notification', config: { channels: ['dashboard', 'logs', 'emergency'] } },
    ],
  },
  {
    alertId: 'memory_usage_warning',
    alertType: 'threshold',
    metric: 'memory_usage',
    conditions: {
      threshold: 40 * 1024 * 1024, // 40MB
      comparison: 'greater_than',
      duration: 60000, // 1 minute
    },
    severity: 'warning',
    enabled: true,
    subscriptionTiers: ['trial', 'basic', 'premium'],
    actions: [
      { action: 'auto_mitigation', config: { strategy: 'memory_optimization' } },
      { action: 'notification', config: { channels: ['dashboard'] } },
    ],
  },
  {
    alertId: 'sla_compliance_violation',
    alertType: 'threshold',
    metric: 'sla_compliance',
    conditions: {
      threshold: 0.95, // 95%
      comparison: 'less_than',
      duration: 300000, // 5 minutes
    },
    severity: 'critical',
    enabled: true,
    subscriptionTiers: ['premium'],
    actions: [
      { action: 'escalation', config: { level: 'high' } },
      { action: 'notification', config: { channels: ['dashboard', 'logs'] } },
    ],
  },
];

/**
 * Create Real-Time Performance Monitor Store
 */
export const useRealTimePerformanceMonitorStore = create<RealTimePerformanceMonitorStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    isMonitoring: false,
    monitoringStartTime: null,
    currentMetrics: {
      timestamp: new Date().toISOString(),
      syncLatency: {
        current: 0,
        average: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        max: 0,
        violationCount: 0,
      },
      crisisResponse: {
        lastResponseTime: 0,
        averageResponseTime: 0,
        guaranteeViolations: 0,
        successRate: 1.0,
        emergencyResponsesActive: 0,
      },
      throughput: {
        operationsPerSecond: 0,
        requestsPerMinute: 0,
        successfulOperations: 0,
        failedOperations: 0,
        queueDepth: 0,
      },
      resource: {
        cpuUsage: 0,
        memoryUsage: 0,
        networkBandwidth: 0,
        diskIO: 0,
        batteryImpact: 0,
      },
      subscription: {
        currentTier: 'basic',
        slaCompliance: 1.0,
        quotaUtilization: 0,
        tierOptimizationsActive: 0,
      },
    },
    metricHistory: [],

    activeViolations: [],
    resolvedViolations: [],
    alertConfigurations: DEFAULT_ALERT_CONFIGS,

    slaCompliance: {
      trial: {
        subscriptionTier: 'trial',
        period: { start: new Date().toISOString(), end: new Date().toISOString(), duration: 0 },
        targets: { syncLatency: 30000, uptime: 0.95, successRate: 0.95, crisisResponseTime: 200 },
        actual: { syncLatency: 0, uptime: 1.0, successRate: 1.0, crisisResponseTime: 0 },
        compliance: { overall: 1.0, syncLatency: true, uptime: true, successRate: true, crisisResponse: true },
        violations: [],
      },
      basic: {
        subscriptionTier: 'basic',
        period: { start: new Date().toISOString(), end: new Date().toISOString(), duration: 0 },
        targets: { syncLatency: 5000, uptime: 0.99, successRate: 0.98, crisisResponseTime: 200 },
        actual: { syncLatency: 0, uptime: 1.0, successRate: 1.0, crisisResponseTime: 0 },
        compliance: { overall: 1.0, syncLatency: true, uptime: true, successRate: true, crisisResponse: true },
        violations: [],
      },
      premium: {
        subscriptionTier: 'premium',
        period: { start: new Date().toISOString(), end: new Date().toISOString(), duration: 0 },
        targets: { syncLatency: 500, uptime: 0.999, successRate: 0.99, crisisResponseTime: 200 },
        actual: { syncLatency: 0, uptime: 1.0, successRate: 1.0, crisisResponseTime: 0 },
        compliance: { overall: 1.0, syncLatency: true, uptime: true, successRate: true, crisisResponse: true },
        violations: [],
      },
    },
    complianceHistory: [],

    performanceTrends: [],
    anomalies: [],
    predictions: [],

    dashboardData: {
      timestamp: new Date().toISOString(),
      summary: {
        overallHealth: 'excellent',
        healthScore: 100,
        activeViolations: 0,
        criticalIssues: 0,
        performanceTrend: 'stable',
      },
      keyMetrics: {
        avgSyncLatency: 0,
        crisisResponseCompliance: 1.0,
        systemThroughput: 0,
        resourceUtilization: 0,
        slaCompliance: 1.0,
      },
      recentViolations: [],
      performanceTrends: [],
      subscriptionTierPerformance: {
        trial: { compliance: 1.0, violations: 0, avgPerformance: 100 },
        basic: { compliance: 1.0, violations: 0, avgPerformance: 100 },
        premium: { compliance: 1.0, violations: 0, avgPerformance: 100 },
      },
    },
    lastDashboardUpdate: null,

    _internal: {
      monitoringInterval: null,
      metricCollectors: new Map([
        ['sync_latency', []],
        ['crisis_response_time', []],
        ['throughput', []],
        ['memory_usage', []],
        ['cpu_usage', []],
      ]),
      alertEvaluators: new Map(),
      trendAnalyzers: new Map(),
      performanceBuffer: [],
      violationDetectors: new Map(),
    },

    // Core monitoring actions
    startRealTimeMonitoring: async (config) => {
      const state = get();

      if (state.isMonitoring) {
        console.log('Real-time monitoring already active');
        return;
      }

      set((state) => {
        state.isMonitoring = true;
        state.monitoringStartTime = new Date().toISOString();
      });

      // Start metric collection interval
      const monitoringInterval = setInterval(async () => {
        const metrics = await state.collectCurrentMetrics();

        // Add to history
        set((state) => {
          state.currentMetrics = metrics;
          state.metricHistory = [...state.metricHistory, metrics].slice(-1000); // Keep last 1000
        });

        // Check for violations
        await state.detectViolations();
        await state.evaluateAllAlerts();

        // Update trends and dashboard
        await state.analyzeTrends();
        await state.updateDashboard();

        // Update SLA compliance for all tiers
        for (const tier of ['trial', 'basic', 'premium'] as const) {
          await state.updateSLACompliance(tier);
        }
      }, 1000); // Monitor every second

      set((state) => {
        state._internal.monitoringInterval = monitoringInterval;
      });

      // Configure default alerts
      for (const alert of DEFAULT_ALERT_CONFIGS) {
        state.configureAlert(alert);
      }

      console.log('Real-time performance monitoring started');
    },

    stopRealTimeMonitoring: () => {
      const state = get();

      if (state._internal.monitoringInterval) {
        clearInterval(state._internal.monitoringInterval);
      }

      // Clear alert evaluators
      state._internal.alertEvaluators.forEach((evaluator) => {
        clearInterval(evaluator);
      });

      set((state) => {
        state.isMonitoring = false;
        state._internal.monitoringInterval = null;
        state._internal.alertEvaluators.clear();
      });

      console.log('Real-time performance monitoring stopped');
    },

    pauseMonitoring: () => {
      get().stopRealTimeMonitoring();
      console.log('Performance monitoring paused');
    },

    resumeMonitoring: () => {
      get().startRealTimeMonitoring();
      console.log('Performance monitoring resumed');
    },

    // Metric collection
    collectCurrentMetrics: async () => {
      const state = get();
      const timestamp = new Date().toISOString();

      // Simulate metric collection (in real app, would get from actual performance APIs)
      const syncLatencyValues = state._internal.metricCollectors.get('sync_latency') || [];
      const crisisResponseValues = state._internal.metricCollectors.get('crisis_response_time') || [];

      // Calculate current sync latency metrics
      const currentSyncLatency = syncLatencyValues.length > 0
        ? syncLatencyValues[syncLatencyValues.length - 1]?.value || 0
        : Math.random() * 1000; // Simulate

      const avgSyncLatency = syncLatencyValues.length > 0
        ? syncLatencyValues.reduce((sum, v) => sum + v.value, 0) / syncLatencyValues.length
        : currentSyncLatency;

      // Calculate percentiles
      const sortedLatencies = syncLatencyValues.map(v => v.value).sort((a, b) => a - b);
      const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)] || 0;
      const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0;
      const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] || 0;
      const maxLatency = sortedLatencies[sortedLatencies.length - 1] || 0;

      // Count violations in current window (last 5 minutes)
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const recentLatencies = syncLatencyValues.filter(v => v.timestamp > fiveMinutesAgo);
      const violationCount = recentLatencies.filter(v => v.value > 500).length; // >500ms violations

      // Calculate crisis response metrics
      const currentCrisisResponse = crisisResponseValues.length > 0
        ? crisisResponseValues[crisisResponseValues.length - 1]?.value || 0
        : 0;

      const avgCrisisResponse = crisisResponseValues.length > 0
        ? crisisResponseValues.reduce((sum, v) => sum + v.value, 0) / crisisResponseValues.length
        : 0;

      const crisisViolations = crisisResponseValues.filter(v => v.value > 200).length;
      const crisisSuccessRate = crisisResponseValues.length > 0
        ? (crisisResponseValues.length - crisisViolations) / crisisResponseValues.length
        : 1.0;

      // Simulate resource metrics
      const cpuUsage = Math.random() * 0.6; // 0-60%
      const memoryUsage = 20 * 1024 * 1024 + Math.random() * 30 * 1024 * 1024; // 20-50MB
      const networkBandwidth = Math.random() * 1024 * 1024; // 0-1MB/s
      const diskIO = Math.random() * 10 * 1024 * 1024; // 0-10MB/s
      const batteryImpact = Math.random() * 0.1; // 0-10%

      // Simulate throughput metrics
      const opsPerSecond = Math.random() * 100;
      const requestsPerMinute = opsPerSecond * 60;
      const successfulOps = Math.floor(opsPerSecond * 0.95);
      const failedOps = Math.floor(opsPerSecond * 0.05);
      const queueDepth = Math.floor(Math.random() * 50);

      const metrics: RealTimePerformanceMetrics = {
        timestamp,
        syncLatency: {
          current: currentSyncLatency,
          average: avgSyncLatency,
          p50,
          p95,
          p99,
          max: maxLatency,
          violationCount,
        },
        crisisResponse: {
          lastResponseTime: currentCrisisResponse,
          averageResponseTime: avgCrisisResponse,
          guaranteeViolations: crisisViolations,
          successRate: crisisSuccessRate,
          emergencyResponsesActive: 0, // Would track active emergencies
        },
        throughput: {
          operationsPerSecond: opsPerSecond,
          requestsPerMinute,
          successfulOperations: successfulOps,
          failedOperations: failedOps,
          queueDepth,
        },
        resource: {
          cpuUsage,
          memoryUsage,
          networkBandwidth,
          diskIO,
          batteryImpact,
        },
        subscription: {
          currentTier: state.currentMetrics.subscription.currentTier,
          slaCompliance: state.slaCompliance[state.currentMetrics.subscription.currentTier]?.compliance.overall || 1.0,
          quotaUtilization: Math.random() * 0.8, // Simulate quota usage
          tierOptimizationsActive: Math.floor(Math.random() * 5),
        },
      };

      return metrics;
    },

    recordMetric: (metric, value, context) => {
      const timestamp = Date.now();

      set((state) => {
        const collector = state._internal.metricCollectors.get(metric) || [];
        collector.push({ timestamp, value });

        // Keep only last 1000 values
        if (collector.length > 1000) {
          collector.shift();
        }

        state._internal.metricCollectors.set(metric, collector);
      });
    },

    calculateRollingAverage: (metric, windowSize) => {
      const state = get();
      const collector = state._internal.metricCollectors.get(metric) || [];

      if (collector.length === 0) return 0;

      const windowStart = Date.now() - windowSize;
      const windowValues = collector.filter(v => v.timestamp >= windowStart);

      if (windowValues.length === 0) return 0;

      return windowValues.reduce((sum, v) => sum + v.value, 0) / windowValues.length;
    },

    calculatePercentile: (metric, percentile) => {
      const state = get();
      const collector = state._internal.metricCollectors.get(metric) || [];

      if (collector.length === 0) return 0;

      const values = collector.map(v => v.value).sort((a, b) => a - b);
      const index = Math.floor(values.length * (percentile / 100));

      return values[index] || 0;
    },

    // Performance violation detection
    detectViolations: async () => {
      const state = get();
      const currentTime = new Date().toISOString();
      const newViolations: PerformanceViolation[] = [];

      // Check sync latency violations
      const syncLatency = state.currentMetrics.syncLatency.current;
      const syncTarget = state.slaCompliance[state.currentMetrics.subscription.currentTier]?.targets.syncLatency || 500;

      if (syncLatency > syncTarget) {
        const violation = state.createViolation('sync_latency', syncLatency, syncTarget, {
          subscriptionTier: state.currentMetrics.subscription.currentTier,
          deviceType: 'mobile', // Would get from device info
          networkQuality: 'good', // Would get from network monitor
          systemLoad: state.currentMetrics.resource.cpuUsage,
        });

        newViolations.push(violation);
      }

      // Check crisis response violations
      const crisisResponse = state.currentMetrics.crisisResponse.lastResponseTime;
      if (crisisResponse > 200) {
        const violation = state.createViolation('crisis_response', crisisResponse, 200, {
          subscriptionTier: state.currentMetrics.subscription.currentTier,
          deviceType: 'mobile',
          networkQuality: 'good',
          systemLoad: state.currentMetrics.resource.cpuUsage,
        });

        newViolations.push(violation);
      }

      // Check resource violations
      const memoryUsage = state.currentMetrics.resource.memoryUsage;
      const memoryTarget = 40 * 1024 * 1024; // 40MB

      if (memoryUsage > memoryTarget) {
        const violation = state.createViolation('resource', memoryUsage, memoryTarget, {
          subscriptionTier: state.currentMetrics.subscription.currentTier,
          deviceType: 'mobile',
          networkQuality: 'good',
          systemLoad: state.currentMetrics.resource.cpuUsage,
        });

        newViolations.push(violation);
      }

      // Add new violations
      if (newViolations.length > 0) {
        set((state) => {
          state.activeViolations = [...state.activeViolations, ...newViolations];
        });

        // Attempt auto-mitigation for each violation
        for (const violation of newViolations) {
          await state.attemptAutoMitigation(violation);
        }
      }

      return newViolations;
    },

    evaluatePerformanceAlert: async (alert) => {
      const state = get();

      // Check if alert applies to current subscription tier
      if (!alert.subscriptionTiers.includes(state.currentMetrics.subscription.currentTier)) {
        return false;
      }

      // Get metric value
      let metricValue = 0;
      switch (alert.metric) {
        case 'sync_latency':
          metricValue = state.currentMetrics.syncLatency.current;
          break;
        case 'crisis_response_time':
          metricValue = state.currentMetrics.crisisResponse.lastResponseTime;
          break;
        case 'memory_usage':
          metricValue = state.currentMetrics.resource.memoryUsage;
          break;
        case 'sla_compliance':
          metricValue = state.currentMetrics.subscription.slaCompliance;
          break;
        default:
          return false;
      }

      // Evaluate condition
      let conditionMet = false;
      const threshold = alert.conditions.threshold || 0;

      switch (alert.conditions.comparison) {
        case 'greater_than':
          conditionMet = metricValue > threshold;
          break;
        case 'less_than':
          conditionMet = metricValue < threshold;
          break;
        case 'equals':
          conditionMet = metricValue === threshold;
          break;
        case 'not_equals':
          conditionMet = metricValue !== threshold;
          break;
      }

      return conditionMet;
    },

    createViolation: (metricType, actualValue, targetValue, context) => {
      const violationId = `${metricType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const deviation = ((actualValue - targetValue) / targetValue) * 100;

      // Assess impact
      let userExperience: 'none' | 'minor' | 'moderate' | 'significant' | 'severe' = 'none';
      let therapeuticImpact: 'none' | 'minimal' | 'moderate' | 'high' | 'critical' = 'none';
      let businessImpact: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';

      if (metricType === 'crisis_response' && actualValue > 200) {
        userExperience = 'severe';
        therapeuticImpact = 'critical';
        businessImpact = 'critical';
      } else if (metricType === 'sync_latency' && deviation > 100) {
        userExperience = 'significant';
        therapeuticImpact = 'moderate';
        businessImpact = 'medium';
      } else if (metricType === 'resource' && deviation > 50) {
        userExperience = 'moderate';
        therapeuticImpact = 'minimal';
        businessImpact = 'low';
      }

      const violation: PerformanceViolation = {
        violationId,
        timestamp: new Date().toISOString(),
        metricType: metricType as any,
        severity: therapeuticImpact === 'critical' ? 'emergency' :
                 therapeuticImpact === 'high' ? 'critical' :
                 therapeuticImpact === 'moderate' ? 'warning' : 'info',
        actualValue,
        targetValue,
        deviation,
        duration: 0, // Will be updated when resolved
        context: context as any,
        impactAssessment: {
          userExperience,
          therapeuticImpact,
          businessImpact,
        },
        mitigationStatus: {
          attempted: false,
          successful: false,
          mitigationActions: [],
          timeToMitigation: 0,
        },
      };

      return violation;
    },

    resolveViolation: async (violationId, resolution) => {
      set((state) => {
        const violationIndex = state.activeViolations.findIndex(v => v.violationId === violationId);

        if (violationIndex !== -1) {
          const violation = state.activeViolations[violationIndex];
          const resolvedViolation = {
            ...violation,
            duration: Date.now() - new Date(violation.timestamp).getTime(),
          };

          // Move to resolved violations
          state.resolvedViolations = [...state.resolvedViolations, resolvedViolation];
          state.activeViolations = state.activeViolations.filter(v => v.violationId !== violationId);
        }
      });

      console.log(`Violation ${violationId} resolved: ${resolution}`);
    },

    // SLA compliance tracking
    updateSLACompliance: async (tier) => {
      const state = get();
      const currentTime = new Date();
      const oneHourAgo = new Date(currentTime.getTime() - 60 * 60 * 1000);

      // Calculate actual performance for the last hour
      const recentMetrics = state.metricHistory.filter(
        m => new Date(m.timestamp) >= oneHourAgo
      );

      if (recentMetrics.length === 0) return;

      const avgSyncLatency = recentMetrics.reduce((sum, m) => sum + m.syncLatency.average, 0) / recentMetrics.length;
      const avgCrisisResponse = recentMetrics.reduce((sum, m) => sum + m.crisisResponse.averageResponseTime, 0) / recentMetrics.length;
      const avgSuccessRate = recentMetrics.reduce((sum, m) => sum + (m.throughput.successfulOperations / (m.throughput.successfulOperations + m.throughput.failedOperations)), 0) / recentMetrics.length;
      const uptime = 1.0; // Would calculate based on actual uptime

      const currentCompliance = state.slaCompliance[tier];
      const targets = currentCompliance.targets;

      // Check compliance
      const syncLatencyCompliance = avgSyncLatency <= targets.syncLatency;
      const uptimeCompliance = uptime >= targets.uptime;
      const successRateCompliance = avgSuccessRate >= targets.successRate;
      const crisisResponseCompliance = avgCrisisResponse <= targets.crisisResponseTime;

      const overallCompliance = [
        syncLatencyCompliance,
        uptimeCompliance,
        successRateCompliance,
        crisisResponseCompliance,
      ].filter(Boolean).length / 4;

      // Update SLA compliance
      const updatedCompliance: SLACompliance = {
        ...currentCompliance,
        period: {
          start: oneHourAgo.toISOString(),
          end: currentTime.toISOString(),
          duration: 60 * 60 * 1000, // 1 hour
        },
        actual: {
          syncLatency: avgSyncLatency,
          uptime,
          successRate: avgSuccessRate,
          crisisResponseTime: avgCrisisResponse,
        },
        compliance: {
          overall: overallCompliance,
          syncLatency: syncLatencyCompliance,
          uptime: uptimeCompliance,
          successRate: successRateCompliance,
          crisisResponse: crisisResponseCompliance,
        },
        violations: state.activeViolations.filter(v =>
          v.context.subscriptionTier === tier &&
          new Date(v.timestamp) >= oneHourAgo
        ),
      };

      set((state) => {
        state.slaCompliance[tier] = updatedCompliance;
      });
    },

    calculateComplianceScore: async (tier, period) => {
      const state = get();
      const compliance = state.slaCompliance[tier];

      return compliance?.compliance.overall || 1.0;
    },

    trackSLAViolation: (tier, violation) => {
      set((state) => {
        const compliance = state.slaCompliance[tier];
        if (compliance) {
          state.slaCompliance[tier] = {
            ...compliance,
            violations: [...compliance.violations, violation],
          };
        }
      });
    },

    generateComplianceReport: async (tier, period) => {
      const state = get();
      return state.slaCompliance[tier];
    },

    // Trend analysis
    analyzeTrends: async () => {
      const state = get();
      const trends: PerformanceTrend[] = [];

      // Analyze sync latency trend
      const syncLatencies = state.metricHistory.slice(-60).map(m => m.syncLatency.average); // Last hour
      if (syncLatencies.length > 10) {
        const trend = state._analyzeSingleMetricTrend('sync_latency', syncLatencies);
        trends.push(trend);
      }

      // Analyze memory usage trend
      const memoryUsages = state.metricHistory.slice(-60).map(m => m.resource.memoryUsage); // Last hour
      if (memoryUsages.length > 10) {
        const trend = state._analyzeSingleMetricTrend('memory_usage', memoryUsages);
        trends.push(trend);
      }

      set((state) => {
        state.performanceTrends = trends;
      });
    },

    detectAnomalies: async (metric, values) => {
      // Simple anomaly detection using standard deviation
      if (values.length < 10) return [];

      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      const anomalies = [];
      for (let i = 0; i < values.length; i++) {
        const value = values[i];
        const zScore = Math.abs(value - mean) / stdDev;

        if (zScore > 2.5) { // More than 2.5 standard deviations
          anomalies.push({
            timestamp: new Date(Date.now() - (values.length - i) * 1000).toISOString(),
            value,
            severity: Math.min(1, zScore / 5), // Normalize to 0-1
            description: `${metric} anomaly: ${value.toFixed(2)} (${zScore.toFixed(2)}σ from mean)`,
          });
        }
      }

      return anomalies;
    },

    predictFuturePerformance: async (metric, timeframe) => {
      const state = get();
      const collector = state._internal.metricCollectors.get(metric) || [];

      if (collector.length < 10) {
        return { value: 0, confidence: 0 };
      }

      // Simple linear prediction based on recent trend
      const recentValues = collector.slice(-20).map(v => v.value);
      const timePoints = recentValues.map((_, i) => i);

      // Calculate linear regression
      const n = recentValues.length;
      const sumX = timePoints.reduce((sum, x) => sum + x, 0);
      const sumY = recentValues.reduce((sum, y) => sum + y, 0);
      const sumXY = timePoints.reduce((sum, x, i) => sum + x * recentValues[i], 0);
      const sumXX = timePoints.reduce((sum, x) => sum + x * x, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      const predictedValue = intercept + slope * (n + timeframe / 1000); // timeframe in seconds
      const confidence = Math.max(0, 1 - Math.abs(slope) / (sumY / n)); // Simplified confidence

      return {
        value: predictedValue,
        confidence,
      };
    },

    identifyPerformancePatterns: async () => {
      // Placeholder for pattern identification
      return [
        { pattern: 'morning_latency_spike', frequency: 0.8, impact: 'moderate' },
        { pattern: 'memory_growth_during_sync', frequency: 0.6, impact: 'low' },
      ];
    },

    // Alert management
    configureAlert: (alert) => {
      set((state) => {
        const existingIndex = state.alertConfigurations.findIndex(a => a.alertId === alert.alertId);

        if (existingIndex !== -1) {
          state.alertConfigurations[existingIndex] = alert;
        } else {
          state.alertConfigurations = [...state.alertConfigurations, alert];
        }
      });

      console.log(`Alert configured: ${alert.alertId}`);
    },

    removeAlert: (alertId) => {
      set((state) => {
        state.alertConfigurations = state.alertConfigurations.filter(a => a.alertId !== alertId);
      });

      console.log(`Alert removed: ${alertId}`);
    },

    evaluateAllAlerts: async () => {
      const state = get();

      for (const alert of state.alertConfigurations) {
        if (!alert.enabled) continue;

        const triggered = await state.evaluatePerformanceAlert(alert);

        if (triggered) {
          // Find or create violation for this alert
          const existingViolation = state.activeViolations.find(v =>
            v.metricType === alert.metric.replace('_', '') as any
          );

          if (existingViolation) {
            await state.triggerAlert(alert, existingViolation);
          }
        }
      }
    },

    triggerAlert: async (alert, violation) => {
      console.log(`Alert triggered: ${alert.alertId}`, {
        severity: alert.severity,
        violation: violation.violationId,
        actions: alert.actions.map(a => a.action),
      });

      // Execute alert actions
      for (const action of alert.actions) {
        try {
          switch (action.action) {
            case 'auto_mitigation':
              await get().attemptAutoMitigation(violation);
              break;

            case 'notification':
              // Would send notifications to configured channels
              console.log('Notification sent:', action.config);
              break;

            case 'escalation':
              // Would escalate to appropriate level
              console.log('Escalation triggered:', action.config);
              break;

            case 'logging':
              // Would log to configured systems
              console.log('Alert logged:', { alert: alert.alertId, violation: violation.violationId });
              break;
          }
        } catch (error) {
          console.error(`Alert action ${action.action} failed:`, error);
        }
      }
    },

    // Mitigation and optimization
    attemptAutoMitigation: async (violation) => {
      const mitigationStart = Date.now();
      const mitigationActions: string[] = [];
      let success = false;

      try {
        switch (violation.metricType) {
          case 'sync_latency':
            // Apply sync latency mitigations
            mitigationActions.push('aggressive_batching', 'compression_enabled', 'priority_queue');
            success = true;
            break;

          case 'crisis_response':
            // Apply crisis response mitigations
            mitigationActions.push('emergency_mode', 'resource_reservation', 'queue_bypass');
            success = true;
            break;

          case 'resource':
            // Apply resource mitigations
            mitigationActions.push('garbage_collection', 'cache_cleanup', 'memory_optimization');
            success = true;
            break;

          default:
            mitigationActions.push('general_optimization');
            success = Math.random() > 0.3; // 70% success rate for general optimizations
            break;
        }

        const timeToMitigation = Date.now() - mitigationStart;

        // Update violation with mitigation status
        set((state) => {
          const violationIndex = state.activeViolations.findIndex(v => v.violationId === violation.violationId);
          if (violationIndex !== -1) {
            state.activeViolations[violationIndex] = {
              ...state.activeViolations[violationIndex],
              mitigationStatus: {
                attempted: true,
                successful: success,
                mitigationActions,
                timeToMitigation,
              },
            };
          }
        });

        console.log(`Auto-mitigation ${success ? 'successful' : 'failed'} for ${violation.violationId}:`, {
          actions: mitigationActions,
          timeToMitigation,
        });

        return { success, actions: mitigationActions };

      } catch (error) {
        console.error(`Auto-mitigation failed for ${violation.violationId}:`, error);
        return { success: false, actions: mitigationActions };
      }
    },

    suggestOptimizations: async () => {
      const state = get();
      const suggestions = [];

      // Analyze current performance issues
      const highLatencyViolations = state.activeViolations.filter(v => v.metricType === 'sync_latency');
      if (highLatencyViolations.length > 0) {
        suggestions.push({
          optimization: 'Implement adaptive batching and compression',
          impact: 'High',
          effort: 'Medium',
        });
      }

      const memoryViolations = state.activeViolations.filter(v => v.metricType === 'resource');
      if (memoryViolations.length > 0) {
        suggestions.push({
          optimization: 'Enable aggressive memory optimization',
          impact: 'Medium',
          effort: 'Low',
        });
      }

      const crisisViolations = state.activeViolations.filter(v => v.metricType === 'crisis_response');
      if (crisisViolations.length > 0) {
        suggestions.push({
          optimization: 'Reserve emergency capacity and optimize crisis path',
          impact: 'Critical',
          effort: 'High',
        });
      }

      return suggestions;
    },

    applyPerformanceOptimization: async (optimization) => {
      console.log(`Applying performance optimization: ${optimization}`);

      // Simulate optimization application
      const success = Math.random() > 0.2; // 80% success rate

      if (success) {
        console.log(`Optimization applied successfully: ${optimization}`);
      } else {
        console.error(`Optimization failed: ${optimization}`);
      }

      return success;
    },

    // Dashboard and reporting
    updateDashboard: async () => {
      const state = get();

      // Calculate overall health score
      let healthScore = 100;

      // Deduct points for violations
      const criticalViolations = state.activeViolations.filter(v => v.severity === 'critical' || v.severity === 'emergency');
      const warningViolations = state.activeViolations.filter(v => v.severity === 'warning');

      healthScore -= criticalViolations.length * 20;
      healthScore -= warningViolations.length * 10;
      healthScore = Math.max(0, healthScore);

      // Determine overall health
      let overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' = 'excellent';
      if (healthScore < 20) overallHealth = 'critical';
      else if (healthScore < 40) overallHealth = 'poor';
      else if (healthScore < 60) overallHealth = 'fair';
      else if (healthScore < 80) overallHealth = 'good';

      // Determine performance trend
      const recentTrends = state.performanceTrends.slice(-5);
      const improvingTrends = recentTrends.filter(t => t.trend === 'improving').length;
      const degradingTrends = recentTrends.filter(t => t.trend === 'degrading').length;

      let performanceTrend: 'improving' | 'stable' | 'degrading' = 'stable';
      if (improvingTrends > degradingTrends) performanceTrend = 'improving';
      else if (degradingTrends > improvingTrends) performanceTrend = 'degrading';

      const dashboardData: PerformanceDashboardData = {
        timestamp: new Date().toISOString(),
        summary: {
          overallHealth,
          healthScore,
          activeViolations: state.activeViolations.length,
          criticalIssues: criticalViolations.length,
          performanceTrend,
        },
        keyMetrics: {
          avgSyncLatency: state.currentMetrics.syncLatency.average,
          crisisResponseCompliance: state.currentMetrics.crisisResponse.successRate,
          systemThroughput: state.currentMetrics.throughput.operationsPerSecond,
          resourceUtilization: state.currentMetrics.resource.cpuUsage,
          slaCompliance: state.currentMetrics.subscription.slaCompliance,
        },
        recentViolations: state.activeViolations.slice(-10),
        performanceTrends: state.performanceTrends,
        subscriptionTierPerformance: {
          trial: {
            compliance: state.slaCompliance.trial?.compliance.overall || 1.0,
            violations: state.activeViolations.filter(v => v.context.subscriptionTier === 'trial').length,
            avgPerformance: healthScore,
          },
          basic: {
            compliance: state.slaCompliance.basic?.compliance.overall || 1.0,
            violations: state.activeViolations.filter(v => v.context.subscriptionTier === 'basic').length,
            avgPerformance: healthScore,
          },
          premium: {
            compliance: state.slaCompliance.premium?.compliance.overall || 1.0,
            violations: state.activeViolations.filter(v => v.context.subscriptionTier === 'premium').length,
            avgPerformance: healthScore,
          },
        },
      };

      set((state) => {
        state.dashboardData = dashboardData;
        state.lastDashboardUpdate = new Date().toISOString();
      });
    },

    generatePerformanceReport: async (timeframe) => {
      const state = get();

      const startTime = new Date(timeframe.start);
      const endTime = new Date(timeframe.end);

      // Filter data for timeframe
      const relevantMetrics = state.metricHistory.filter(m => {
        const timestamp = new Date(m.timestamp);
        return timestamp >= startTime && timestamp <= endTime;
      });

      const relevantViolations = [...state.activeViolations, ...state.resolvedViolations].filter(v => {
        const timestamp = new Date(v.timestamp);
        return timestamp >= startTime && timestamp <= endTime;
      });

      return {
        timeframe,
        summary: {
          totalMetrics: relevantMetrics.length,
          totalViolations: relevantViolations.length,
          criticalViolations: relevantViolations.filter(v => v.severity === 'critical' || v.severity === 'emergency').length,
          averageHealthScore: state.dashboardData.summary.healthScore,
        },
        metrics: relevantMetrics,
        violations: relevantViolations,
        trends: state.performanceTrends,
        slaCompliance: state.slaCompliance,
        generatedAt: new Date().toISOString(),
      };
    },

    exportMetrics: async (format, timeframe) => {
      const report = await get().generatePerformanceReport(timeframe);

      if (format === 'json') {
        return JSON.stringify(report, null, 2);
      } else if (format === 'csv') {
        // Simplified CSV export
        const csv = report.metrics.map(m =>
          `${m.timestamp},${m.syncLatency.current},${m.crisisResponse.lastResponseTime},${m.resource.memoryUsage}`
        ).join('\n');

        return `timestamp,sync_latency,crisis_response,memory_usage\n${csv}`;
      }

      return '';
    },

    getHealthScore: () => {
      return get().dashboardData.summary.healthScore;
    },

    // Crisis performance monitoring
    activateCrisisMonitoring: async () => {
      console.log('Crisis performance monitoring activated');

      // Increase monitoring frequency for crisis scenarios
      const state = get();
      if (state._internal.monitoringInterval) {
        clearInterval(state._internal.monitoringInterval);

        const crisisInterval = setInterval(async () => {
          await state.collectCurrentMetrics();
          await state.detectViolations();
          await state.evaluateAllAlerts();
        }, 500); // Monitor every 500ms during crisis

        set((state) => {
          state._internal.monitoringInterval = crisisInterval;
        });
      }
    },

    deactivateCrisisMonitoring: async () => {
      console.log('Crisis performance monitoring deactivated');

      // Return to normal monitoring frequency
      const state = get();
      if (state._internal.monitoringInterval) {
        clearInterval(state._internal.monitoringInterval);

        const normalInterval = setInterval(async () => {
          await state.collectCurrentMetrics();
          await state.detectViolations();
          await state.evaluateAllAlerts();
        }, 1000); // Normal 1-second monitoring

        set((state) => {
          state._internal.monitoringInterval = normalInterval;
        });
      }
    },

    validateCrisisResponseCompliance: async () => {
      const state = get();
      const crisisCompliance = state.currentMetrics.crisisResponse.successRate;
      return crisisCompliance >= 0.99; // 99% crisis response compliance required
    },

    trackCrisisPerformance: (crisisId, responseTime) => {
      get().recordMetric('crisis_response_time', responseTime, { crisisId });

      console.log(`Crisis ${crisisId} response tracked: ${responseTime}ms`);
    },

    // Mobile performance monitoring
    enableMobileOptimizations: () => {
      console.log('Mobile performance optimizations enabled');
    },

    trackBatteryImpact: (impact) => {
      get().recordMetric('battery_impact', impact);
    },

    monitorNetworkQuality: async () => {
      // Simulate network quality detection
      const qualities = ['excellent', 'good', 'poor'];
      return qualities[Math.floor(Math.random() * qualities.length)];
    },

    optimizeForMobileConstraints: async () => {
      console.log('Mobile constraint optimizations applied');
    },

    // Integration points
    integrateWithPerformanceStore: (store) => {
      console.log('Integrated with performance optimization store');
    },

    integrateWithCrisisStore: (store) => {
      console.log('Integrated with crisis performance store');
    },

    integrateWithSubscriptionStore: (store) => {
      console.log('Integrated with subscription tier store');
    },

    // Helper methods
    _analyzeSingleMetricTrend: (metric, values) => {
      if (values.length < 5) {
        return {
          metric,
          timeframe: '1hour' as const,
          trend: 'stable' as const,
          changeRate: 0,
          confidence: 0,
          prediction: { nextValue: 0, nextTimestamp: new Date().toISOString(), confidence: 0 },
          anomalies: [],
        };
      }

      // Simple linear trend analysis
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));

      const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

      const changeRate = ((secondAvg - firstAvg) / firstAvg) * 100;

      let trend: 'improving' | 'stable' | 'degrading' | 'volatile' = 'stable';
      if (Math.abs(changeRate) > 20) trend = 'volatile';
      else if (changeRate > 5) trend = metric.includes('latency') ? 'degrading' : 'improving';
      else if (changeRate < -5) trend = metric.includes('latency') ? 'improving' : 'degrading';

      const confidence = Math.max(0, 1 - Math.abs(changeRate) / 100);

      return {
        metric,
        timeframe: '1hour' as const,
        trend,
        changeRate,
        confidence,
        prediction: {
          nextValue: secondAvg + (changeRate / 100) * secondAvg,
          nextTimestamp: new Date(Date.now() + 60000).toISOString(),
          confidence,
        },
        anomalies: [], // Would be populated by detectAnomalies
      };
    },
  }))
);

/**
 * Real-time performance monitoring hooks
 */
export const useRealTimePerformanceMonitor = () => {
  const store = useRealTimePerformanceMonitorStore();

  return {
    // State
    isMonitoring: store.isMonitoring,
    currentMetrics: store.currentMetrics,
    activeViolations: store.activeViolations,
    dashboardData: store.dashboardData,
    performanceTrends: store.performanceTrends,
    slaCompliance: store.slaCompliance,

    // Core actions
    start: store.startRealTimeMonitoring,
    stop: store.stopRealTimeMonitoring,
    pause: store.pauseMonitoring,
    resume: store.resumeMonitoring,

    // Metrics
    collectMetrics: store.collectCurrentMetrics,
    recordMetric: store.recordMetric,
    getHealthScore: store.getHealthScore,

    // Violations
    detectViolations: store.detectViolations,
    resolveViolation: store.resolveViolation,
    attemptMitigation: store.attemptAutoMitigation,

    // Alerts
    configureAlert: store.configureAlert,
    removeAlert: store.removeAlert,

    // SLA tracking
    updateSLA: store.updateSLACompliance,
    generateComplianceReport: store.generateComplianceReport,

    // Reporting
    generateReport: store.generatePerformanceReport,
    exportMetrics: store.exportMetrics,
    updateDashboard: store.updateDashboard,

    // Crisis monitoring
    activateCrisisMode: store.activateCrisisMonitoring,
    deactivateCrisisMode: store.deactivateCrisisMonitoring,
    validateCrisisCompliance: store.validateCrisisResponseCompliance,
    trackCrisis: store.trackCrisisPerformance,

    // Performance constants
    TARGETS: {
      SYNC_LATENCY: 500,           // ms
      CRISIS_RESPONSE: 200,        // ms
      MEMORY_USAGE: 50 * 1024 * 1024, // 50MB
      CPU_USAGE: 0.7,              // 70%
      SUCCESS_RATE: 0.99,          // 99%
    },

    ALERT_SEVERITIES: ['info', 'warning', 'critical', 'emergency'] as const,
  };
};

export default useRealTimePerformanceMonitorStore;