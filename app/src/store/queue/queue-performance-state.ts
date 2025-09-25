/**
 * Queue Performance State Management for Being. MBCT App
 *
 * Performance monitoring state with comprehensive metrics and optimization:
 * - Real-time performance metrics collection and analysis
 * - SLA compliance monitoring with automatic alerting
 * - Memory usage tracking and optimization recommendations
 * - Throughput analysis with subscription tier awareness
 * - Performance degradation detection and recovery strategies
 *
 * CRITICAL PERFORMANCE REQUIREMENTS:
 * - Metrics collection: <5ms overhead for performance tracking
 * - Memory efficiency: <5MB for comprehensive performance state
 * - Real-time updates: <10ms for performance state changes
 * - Automatic optimization: Background cleanup and optimization
 * - Alert generation: <50ms for critical performance violations
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import type { SubscriptionTier } from '../../types/payment-canonical';
import type { PriorityLevel } from '../../types/sync/sync-priority-queue';

/**
 * Performance Metric Sample
 */
export const PerformanceMetricSampleSchema = z.object({
  timestamp: z.string(), // ISO timestamp
  value: z.number(),
  context: z.record(z.any()).optional(), // Additional context for the metric
});

export type PerformanceMetricSample = z.infer<typeof PerformanceMetricSampleSchema>;

/**
 * Time Series Performance Data
 */
export const TimeSeriesPerformanceDataSchema = z.object({
  metricName: z.string(),
  samples: z.array(PerformanceMetricSampleSchema),
  aggregates: z.object({
    current: z.number(),
    average: z.number(),
    min: z.number(),
    max: z.number(),
    p50: z.number(),
    p90: z.number(),
    p95: z.number(),
    p99: z.number(),
  }),
  lastUpdated: z.string(), // ISO timestamp
  retentionPeriodMs: z.number().positive(), // How long to keep samples
});

export type TimeSeriesPerformanceData = z.infer<typeof TimeSeriesPerformanceDataSchema>;

/**
 * Performance Alert Definition
 */
export const PerformanceAlertSchema = z.object({
  alertId: z.string().uuid(),
  alertType: z.enum(['latency_violation', 'throughput_degradation', 'memory_pressure', 'sla_breach', 'crisis_response_delay', 'queue_backlog']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),

  // Alert details
  metricName: z.string(),
  threshold: z.number(),
  currentValue: z.number(),
  message: z.string(),

  // Timing and status
  triggeredAt: z.string(), // ISO timestamp
  acknowledgedAt: z.string().optional(), // ISO timestamp
  resolvedAt: z.string().optional(), // ISO timestamp

  // Context
  subscriptionTier: z.enum(['trial', 'basic', 'premium', 'grace_period']).optional(),
  operationContext: z.record(z.any()).optional(),

  // Actions taken
  autoRemediation: z.object({
    attempted: z.boolean().default(false),
    successful: z.boolean().default(false),
    actions: z.array(z.string()).default([]),
    remediationTimeMs: z.number().optional(),
  }),
});

export type PerformanceAlert = z.infer<typeof PerformanceAlertSchema>;

/**
 * SLA Definition and Tracking
 */
export const SLADefinitionSchema = z.object({
  slaId: z.string(),
  name: z.string(),
  description: z.string(),

  // SLA targets
  targets: z.object({
    responseTimeMs: z.number().positive().optional(), // Max response time
    throughputPerSecond: z.number().positive().optional(), // Min throughput
    availabilityPercentage: z.number().min(0).max(100).optional(), // Min availability
    errorRate: z.number().min(0).max(1).optional(), // Max error rate
  }),

  // Measurement window
  measurementWindowMs: z.number().positive(),

  // Subscription tier applicability
  applicableToTiers: z.array(z.enum(['trial', 'basic', 'premium', 'grace_period'])),

  // Escalation rules
  escalationRules: z.array(z.object({
    violationThreshold: z.number().positive(), // Number of violations
    timeWindowMs: z.number().positive(), // Time window for violations
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    autoRemediation: z.boolean().default(false),
  })),
});

export type SLADefinition = z.infer<typeof SLADefinitionSchema>;

/**
 * SLA Compliance Tracking
 */
export const SLAComplianceSchema = z.object({
  slaId: z.string(),
  currentPeriodStart: z.string(), // ISO timestamp

  // Compliance metrics
  compliance: z.object({
    responseTimeCompliance: z.number().min(0).max(1),
    throughputCompliance: z.number().min(0).max(1),
    availabilityCompliance: z.number().min(0).max(1),
    errorRateCompliance: z.number().min(0).max(1),
    overallCompliance: z.number().min(0).max(1),
  }),

  // Violation tracking
  violations: z.array(z.object({
    timestamp: z.string(), // ISO timestamp
    violationType: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    value: z.number(),
    threshold: z.number(),
    resolved: z.boolean().default(false),
    resolutionTime: z.string().optional(), // ISO timestamp
  })),

  lastUpdated: z.string(), // ISO timestamp
});

export type SLACompliance = z.infer<typeof SLAComplianceSchema>;

/**
 * Resource Usage Tracking
 */
export const ResourceUsageSchema = z.object({
  memory: z.object({
    currentUsageMB: z.number().min(0),
    peakUsageMB: z.number().min(0),
    averageUsageMB: z.number().min(0),
    limitMB: z.number().positive(),
    utilizationPercentage: z.number().min(0).max(1),
    pressureLevel: z.enum(['low', 'moderate', 'high', 'critical']),
  }),

  storage: z.object({
    currentUsageMB: z.number().min(0),
    queueStorageMB: z.number().min(0),
    tempStorageMB: z.number().min(0),
    totalLimitMB: z.number().positive(),
    utilizationPercentage: z.number().min(0).max(1),
  }),

  network: z.object({
    bytesTransferredIn: z.number().int().min(0),
    bytesTransferredOut: z.number().int().min(0),
    currentBandwidthUtilization: z.number().min(0).max(1),
    averageLatencyMs: z.number().min(0),
    packetLossPercentage: z.number().min(0).max(1),
  }),

  cpu: z.object({
    currentUtilizationPercentage: z.number().min(0).max(1),
    averageUtilizationPercentage: z.number().min(0).max(1),
    peakUtilizationPercentage: z.number().min(0).max(1),
    queueProcessingUtilization: z.number().min(0).max(1),
  }),

  lastUpdated: z.string(), // ISO timestamp
});

export type ResourceUsage = z.infer<typeof ResourceUsageSchema>;

/**
 * Performance Optimization Recommendation
 */
export const PerformanceOptimizationSchema = z.object({
  recommendationId: z.string().uuid(),
  category: z.enum(['memory', 'throughput', 'latency', 'resource', 'configuration']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),

  recommendation: z.object({
    title: z.string(),
    description: z.string(),
    expectedImpact: z.string(),
    estimatedEffortHours: z.number().min(0).optional(),
  }),

  // Implementation details
  implementation: z.object({
    autoApplicable: z.boolean(),
    requiresUserConfirmation: z.boolean(),
    configurationChanges: z.record(z.any()).optional(),
    codeChangesRequired: z.boolean(),
  }),

  // Metrics and validation
  validation: z.object({
    successMetrics: z.array(z.string()),
    rollbackProcedure: z.string().optional(),
    testingRequired: z.boolean(),
  }),

  generatedAt: z.string(), // ISO timestamp
  appliedAt: z.string().optional(), // ISO timestamp
  validUntil: z.string().optional(), // ISO timestamp
});

export type PerformanceOptimization = z.infer<typeof PerformanceOptimizationSchema>;

/**
 * Queue Performance State Interface
 */
interface QueuePerformanceState {
  // Time series performance data
  performanceMetrics: Map<string, TimeSeriesPerformanceData>;

  // Current system performance
  currentPerformance: {
    queueThroughputPerSecond: number;
    averageProcessingTimeMs: number;
    averageQueueWaitTimeMs: number;
    crisisResponseTimeMs: number;
    memoryUtilizationPercentage: number;
    errorRate: number;
    lastUpdated: string; // ISO timestamp
  };

  // Resource usage tracking
  resourceUsage: ResourceUsage;

  // SLA management
  slaDefinitions: SLADefinition[];
  slaCompliance: Map<string, SLACompliance>;

  // Alert management
  activeAlerts: PerformanceAlert[];
  alertHistory: PerformanceAlert[];
  alertConfiguration: {
    maxActiveAlerts: number;
    alertHistoryRetentionHours: number;
    autoRemediationEnabled: boolean;
    criticalAlertThresholds: Record<string, number>;
  };

  // Performance optimization
  optimizationRecommendations: PerformanceOptimization[];
  appliedOptimizations: PerformanceOptimization[];

  // Configuration
  performanceConfig: {
    metricRetentionHours: number;
    samplingIntervalMs: number;
    aggregationIntervalMs: number;
    enableRealTimeMonitoring: boolean;
    performanceTargets: Record<SubscriptionTier, {
      maxResponseTimeMs: number;
      minThroughputPerSecond: number;
      maxMemoryUsageMB: number;
    }>;
  };

  lastStateUpdate: string; // ISO timestamp
}

/**
 * Queue Performance Actions
 */
interface QueuePerformanceActions {
  // Metric collection
  recordMetric: (metricName: string, value: number, context?: Record<string, any>) => void;
  recordBatchMetrics: (metrics: Array<{ name: string; value: number; context?: Record<string, any> }>) => void;

  // Performance tracking
  updateCurrentPerformance: (updates: Partial<QueuePerformanceState['currentPerformance']>) => void;
  calculatePerformanceAggregates: (metricName: string) => TimeSeriesPerformanceData['aggregates'] | null;

  // Resource monitoring
  updateResourceUsage: (resourceUpdates: Partial<ResourceUsage>) => void;
  checkResourcePressure: () => 'low' | 'moderate' | 'high' | 'critical';

  // SLA management
  addSLADefinition: (sla: SLADefinition) => boolean;
  updateSLACompliance: (slaId: string, compliance: Partial<SLACompliance>) => boolean;
  checkSLAViolations: () => PerformanceAlert[];

  // Alert management
  generateAlert: (alert: Omit<PerformanceAlert, 'alertId' | 'triggeredAt'>) => string; // Returns alert ID
  acknowledgeAlert: (alertId: string) => boolean;
  resolveAlert: (alertId: string, resolution?: string) => boolean;
  attemptAutoRemediation: (alertId: string) => Promise<boolean>;

  // Performance optimization
  generateOptimizationRecommendations: () => Promise<PerformanceOptimization[]>;
  applyOptimization: (recommendationId: string) => Promise<boolean>;
  rollbackOptimization: (recommendationId: string) => Promise<boolean>;

  // Analysis and reporting
  analyzePerformanceTrends: (metricName: string, windowMs: number) => {
    trend: 'improving' | 'stable' | 'degrading';
    changePercentage: number;
    confidence: number;
  };
  generatePerformanceReport: () => Promise<string>;
  exportMetricsData: (metricNames?: string[], startTime?: string, endTime?: string) => Promise<string>;

  // Maintenance and cleanup
  performMetricCleanup: () => Promise<{ samplesRemoved: number; metricsArchived: number }>;
  optimizePerformanceState: () => Promise<{ memoryFreed: number; optimizationsApplied: number }>;

  // Configuration
  updatePerformanceConfig: (config: Partial<QueuePerformanceState['performanceConfig']>) => void;

  reset: () => void;
}

/**
 * Default Performance Configuration
 */
const getDefaultPerformanceConfig = () => ({
  metricRetentionHours: 24,
  samplingIntervalMs: 1000, // 1 second
  aggregationIntervalMs: 5000, // 5 seconds
  enableRealTimeMonitoring: true,
  performanceTargets: {
    trial: {
      maxResponseTimeMs: 5000,
      minThroughputPerSecond: 0.5,
      maxMemoryUsageMB: 50,
    },
    basic: {
      maxResponseTimeMs: 3000,
      minThroughputPerSecond: 1.0,
      maxMemoryUsageMB: 75,
    },
    premium: {
      maxResponseTimeMs: 1000,
      minThroughputPerSecond: 2.0,
      maxMemoryUsageMB: 150,
    },
    grace_period: {
      maxResponseTimeMs: 10000,
      minThroughputPerSecond: 0.2,
      maxMemoryUsageMB: 25,
    },
  } as Record<SubscriptionTier, { maxResponseTimeMs: number; minThroughputPerSecond: number; maxMemoryUsageMB: number }>,
});

/**
 * Default Resource Usage
 */
const getDefaultResourceUsage = (): ResourceUsage => ({
  memory: {
    currentUsageMB: 0,
    peakUsageMB: 0,
    averageUsageMB: 0,
    limitMB: 100,
    utilizationPercentage: 0,
    pressureLevel: 'low',
  },
  storage: {
    currentUsageMB: 0,
    queueStorageMB: 0,
    tempStorageMB: 0,
    totalLimitMB: 1000,
    utilizationPercentage: 0,
  },
  network: {
    bytesTransferredIn: 0,
    bytesTransferredOut: 0,
    currentBandwidthUtilization: 0,
    averageLatencyMs: 0,
    packetLossPercentage: 0,
  },
  cpu: {
    currentUtilizationPercentage: 0,
    averageUtilizationPercentage: 0,
    peakUtilizationPercentage: 0,
    queueProcessingUtilization: 0,
  },
  lastUpdated: new Date().toISOString(),
});

/**
 * Queue Performance Store Implementation
 */
export const useQueuePerformanceStore = create<QueuePerformanceState & QueuePerformanceActions>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        // Initial state
        performanceMetrics: new Map(),
        currentPerformance: {
          queueThroughputPerSecond: 0,
          averageProcessingTimeMs: 0,
          averageQueueWaitTimeMs: 0,
          crisisResponseTimeMs: 0,
          memoryUtilizationPercentage: 0,
          errorRate: 0,
          lastUpdated: new Date().toISOString(),
        },
        resourceUsage: getDefaultResourceUsage(),
        slaDefinitions: [],
        slaCompliance: new Map(),
        activeAlerts: [],
        alertHistory: [],
        alertConfiguration: {
          maxActiveAlerts: 50,
          alertHistoryRetentionHours: 72,
          autoRemediationEnabled: true,
          criticalAlertThresholds: {
            crisisResponseTimeMs: 200,
            memoryUtilizationPercentage: 0.9,
            errorRate: 0.1,
          },
        },
        optimizationRecommendations: [],
        appliedOptimizations: [],
        performanceConfig: getDefaultPerformanceConfig(),
        lastStateUpdate: new Date().toISOString(),

        // Metric collection
        recordMetric: (metricName: string, value: number, context?: Record<string, any>): void => {
          const recordingStart = performance.now();

          set((state) => {
            const now = new Date().toISOString();

            // Get or create metric data
            let metricData = state.performanceMetrics.get(metricName);
            if (!metricData) {
              metricData = {
                metricName,
                samples: [],
                aggregates: {
                  current: value,
                  average: value,
                  min: value,
                  max: value,
                  p50: value,
                  p90: value,
                  p95: value,
                  p99: value,
                },
                lastUpdated: now,
                retentionPeriodMs: state.performanceConfig.metricRetentionHours * 60 * 60 * 1000,
              };
            }

            // Add sample
            const sample: PerformanceMetricSample = {
              timestamp: now,
              value,
              context,
            };

            metricData.samples.push(sample);

            // Limit samples to retention period
            const retentionCutoff = Date.now() - metricData.retentionPeriodMs;
            metricData.samples = metricData.samples.filter(
              s => new Date(s.timestamp).getTime() > retentionCutoff
            );

            // Update aggregates
            if (metricData.samples.length > 0) {
              const values = metricData.samples.map(s => s.value).sort((a, b) => a - b);
              const sum = values.reduce((a, b) => a + b, 0);

              metricData.aggregates = {
                current: value,
                average: sum / values.length,
                min: values[0],
                max: values[values.length - 1],
                p50: values[Math.floor(values.length * 0.5)],
                p90: values[Math.floor(values.length * 0.9)],
                p95: values[Math.floor(values.length * 0.95)],
                p99: values[Math.floor(values.length * 0.99)],
              };
            }

            metricData.lastUpdated = now;
            state.performanceMetrics.set(metricName, metricData);
            state.lastStateUpdate = now;
          });

          // Performance check for metric recording
          const recordingTime = performance.now() - recordingStart;
          if (recordingTime > 5) {
            console.warn(`Metric recording exceeded 5ms threshold: ${recordingTime}ms for ${metricName}`);
          }
        },

        recordBatchMetrics: (metrics: Array<{ name: string; value: number; context?: Record<string, any> }>): void => {
          metrics.forEach(metric => {
            get().recordMetric(metric.name, metric.value, metric.context);
          });
        },

        // Performance tracking
        updateCurrentPerformance: (updates: Partial<QueuePerformanceState['currentPerformance']>): void => {
          set((state) => {
            state.currentPerformance = {
              ...state.currentPerformance,
              ...updates,
              lastUpdated: new Date().toISOString(),
            };
            state.lastStateUpdate = new Date().toISOString();
          });
        },

        calculatePerformanceAggregates: (metricName: string): TimeSeriesPerformanceData['aggregates'] | null => {
          const state = get();
          const metricData = state.performanceMetrics.get(metricName);
          return metricData?.aggregates || null;
        },

        // Resource monitoring
        updateResourceUsage: (resourceUpdates: Partial<ResourceUsage>): void => {
          set((state) => {
            state.resourceUsage = {
              ...state.resourceUsage,
              ...resourceUpdates,
              lastUpdated: new Date().toISOString(),
            };

            // Update memory pressure level based on utilization
            const memoryUtilization = state.resourceUsage.memory.utilizationPercentage;
            if (memoryUtilization > 0.9) {
              state.resourceUsage.memory.pressureLevel = 'critical';
            } else if (memoryUtilization > 0.75) {
              state.resourceUsage.memory.pressureLevel = 'high';
            } else if (memoryUtilization > 0.5) {
              state.resourceUsage.memory.pressureLevel = 'moderate';
            } else {
              state.resourceUsage.memory.pressureLevel = 'low';
            }

            state.lastStateUpdate = new Date().toISOString();
          });
        },

        checkResourcePressure: (): 'low' | 'moderate' | 'high' | 'critical' => {
          const state = get();
          const usage = state.resourceUsage;

          // Check all resource types and return highest pressure level
          const pressureLevels = [
            usage.memory.pressureLevel,
            usage.cpu.currentUtilizationPercentage > 0.9 ? 'critical' :
            usage.cpu.currentUtilizationPercentage > 0.75 ? 'high' :
            usage.cpu.currentUtilizationPercentage > 0.5 ? 'moderate' : 'low',
            usage.storage.utilizationPercentage > 0.9 ? 'critical' :
            usage.storage.utilizationPercentage > 0.75 ? 'high' :
            usage.storage.utilizationPercentage > 0.5 ? 'moderate' : 'low',
          ];

          if (pressureLevels.includes('critical')) return 'critical';
          if (pressureLevels.includes('high')) return 'high';
          if (pressureLevels.includes('moderate')) return 'moderate';
          return 'low';
        },

        // SLA management
        addSLADefinition: (sla: SLADefinition): boolean => {
          try {
            set((state) => {
              const existingIndex = state.slaDefinitions.findIndex(s => s.slaId === sla.slaId);

              if (existingIndex !== -1) {
                state.slaDefinitions[existingIndex] = sla;
              } else {
                state.slaDefinitions.push(sla);
              }

              // Initialize compliance tracking
              const compliance: SLACompliance = {
                slaId: sla.slaId,
                currentPeriodStart: new Date().toISOString(),
                compliance: {
                  responseTimeCompliance: 1,
                  throughputCompliance: 1,
                  availabilityCompliance: 1,
                  errorRateCompliance: 1,
                  overallCompliance: 1,
                },
                violations: [],
                lastUpdated: new Date().toISOString(),
              };

              state.slaCompliance.set(sla.slaId, compliance);
              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to add SLA definition:', error);
            return false;
          }
        },

        updateSLACompliance: (slaId: string, complianceUpdates: Partial<SLACompliance>): boolean => {
          try {
            set((state) => {
              const existingCompliance = state.slaCompliance.get(slaId);
              if (!existingCompliance) return;

              const updatedCompliance = {
                ...existingCompliance,
                ...complianceUpdates,
                lastUpdated: new Date().toISOString(),
              };

              state.slaCompliance.set(slaId, updatedCompliance);
              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to update SLA compliance:', error);
            return false;
          }
        },

        checkSLAViolations: (): PerformanceAlert[] => {
          const state = get();
          const violations: PerformanceAlert[] = [];

          for (const sla of state.slaDefinitions) {
            const compliance = state.slaCompliance.get(sla.slaId);
            if (!compliance) continue;

            // Check response time SLA
            if (sla.targets.responseTimeMs && state.currentPerformance.averageProcessingTimeMs > sla.targets.responseTimeMs) {
              violations.push({
                alertId: crypto.randomUUID(),
                alertType: 'sla_breach',
                severity: 'high',
                metricName: 'response_time',
                threshold: sla.targets.responseTimeMs,
                currentValue: state.currentPerformance.averageProcessingTimeMs,
                message: `Response time SLA violation: ${state.currentPerformance.averageProcessingTimeMs}ms > ${sla.targets.responseTimeMs}ms`,
                triggeredAt: new Date().toISOString(),
                autoRemediation: {
                  attempted: false,
                  successful: false,
                  actions: [],
                },
              });
            }

            // Check throughput SLA
            if (sla.targets.throughputPerSecond && state.currentPerformance.queueThroughputPerSecond < sla.targets.throughputPerSecond) {
              violations.push({
                alertId: crypto.randomUUID(),
                alertType: 'throughput_degradation',
                severity: 'medium',
                metricName: 'throughput',
                threshold: sla.targets.throughputPerSecond,
                currentValue: state.currentPerformance.queueThroughputPerSecond,
                message: `Throughput SLA violation: ${state.currentPerformance.queueThroughputPerSecond}/s < ${sla.targets.throughputPerSecond}/s`,
                triggeredAt: new Date().toISOString(),
                autoRemediation: {
                  attempted: false,
                  successful: false,
                  actions: [],
                },
              });
            }

            // Check error rate SLA
            if (sla.targets.errorRate && state.currentPerformance.errorRate > sla.targets.errorRate) {
              violations.push({
                alertId: crypto.randomUUID(),
                alertType: 'sla_breach',
                severity: 'high',
                metricName: 'error_rate',
                threshold: sla.targets.errorRate,
                currentValue: state.currentPerformance.errorRate,
                message: `Error rate SLA violation: ${(state.currentPerformance.errorRate * 100).toFixed(2)}% > ${(sla.targets.errorRate * 100).toFixed(2)}%`,
                triggeredAt: new Date().toISOString(),
                autoRemediation: {
                  attempted: false,
                  successful: false,
                  actions: [],
                },
              });
            }
          }

          return violations;
        },

        // Alert management
        generateAlert: (alert: Omit<PerformanceAlert, 'alertId' | 'triggeredAt'>): string => {
          const alertId = crypto.randomUUID();
          const now = new Date().toISOString();

          set((state) => {
            const newAlert: PerformanceAlert = {
              ...alert,
              alertId,
              triggeredAt: now,
            };

            state.activeAlerts.push(newAlert);

            // Limit active alerts to prevent memory issues
            if (state.activeAlerts.length > state.alertConfiguration.maxActiveAlerts) {
              const removedAlerts = state.activeAlerts.splice(0, state.activeAlerts.length - state.alertConfiguration.maxActiveAlerts);
              state.alertHistory.push(...removedAlerts);
            }

            state.lastStateUpdate = now;
          });

          return alertId;
        },

        acknowledgeAlert: (alertId: string): boolean => {
          try {
            set((state) => {
              const alert = state.activeAlerts.find(a => a.alertId === alertId);
              if (alert) {
                alert.acknowledgedAt = new Date().toISOString();
              }
              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to acknowledge alert:', error);
            return false;
          }
        },

        resolveAlert: (alertId: string, resolution?: string): boolean => {
          try {
            set((state) => {
              const alertIndex = state.activeAlerts.findIndex(a => a.alertId === alertId);
              if (alertIndex !== -1) {
                const alert = state.activeAlerts[alertIndex];
                alert.resolvedAt = new Date().toISOString();

                // Move to history
                state.alertHistory.push(alert);
                state.activeAlerts.splice(alertIndex, 1);
              }
              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to resolve alert:', error);
            return false;
          }
        },

        attemptAutoRemediation: async (alertId: string): Promise<boolean> => {
          const state = get();
          const alert = state.activeAlerts.find(a => a.alertId === alertId);

          if (!alert || !state.alertConfiguration.autoRemediationEnabled) {
            return false;
          }

          try {
            // Simulate auto-remediation based on alert type
            let actions: string[] = [];
            let successful = false;

            switch (alert.alertType) {
              case 'memory_pressure':
                actions = ['memory_cleanup', 'cache_eviction'];
                // Simulate memory cleanup
                await get().performMetricCleanup();
                successful = true;
                break;

              case 'queue_backlog':
                actions = ['queue_optimization', 'priority_adjustment'];
                successful = true;
                break;

              case 'throughput_degradation':
                actions = ['performance_optimization', 'resource_scaling'];
                successful = true;
                break;

              default:
                actions = ['monitoring_increase'];
                successful = false;
            }

            // Update alert with remediation results
            set((storeState) => {
              const alertToUpdate = storeState.activeAlerts.find(a => a.alertId === alertId);
              if (alertToUpdate) {
                alertToUpdate.autoRemediation = {
                  attempted: true,
                  successful,
                  actions,
                  remediationTimeMs: 1000, // Simulated
                };
              }
              storeState.lastStateUpdate = new Date().toISOString();
            });

            return successful;
          } catch (error) {
            console.error('Auto-remediation failed:', error);
            return false;
          }
        },

        // Performance optimization
        generateOptimizationRecommendations: async (): Promise<PerformanceOptimization[]> => {
          const state = get();
          const recommendations: PerformanceOptimization[] = [];
          const now = new Date().toISOString();

          // Memory optimization recommendations
          if (state.resourceUsage.memory.utilizationPercentage > 0.8) {
            recommendations.push({
              recommendationId: crypto.randomUUID(),
              category: 'memory',
              priority: 'high',
              recommendation: {
                title: 'Memory Usage Optimization',
                description: 'Current memory usage is high. Consider implementing memory cleanup strategies.',
                expectedImpact: 'Reduce memory usage by 20-30%',
                estimatedEffortHours: 2,
              },
              implementation: {
                autoApplicable: true,
                requiresUserConfirmation: false,
                configurationChanges: {
                  metricRetentionHours: Math.max(12, state.performanceConfig.metricRetentionHours - 6),
                },
                codeChangesRequired: false,
              },
              validation: {
                successMetrics: ['memory_utilization_below_70_percent'],
                rollbackProcedure: 'Restore previous metric retention settings',
                testingRequired: false,
              },
              generatedAt: now,
            });
          }

          // Throughput optimization recommendations
          if (state.currentPerformance.queueThroughputPerSecond < 1.0) {
            recommendations.push({
              recommendationId: crypto.randomUUID(),
              category: 'throughput',
              priority: 'medium',
              recommendation: {
                title: 'Queue Processing Optimization',
                description: 'Queue throughput is below optimal levels. Consider batch processing optimizations.',
                expectedImpact: 'Increase throughput by 50-100%',
                estimatedEffortHours: 4,
              },
              implementation: {
                autoApplicable: false,
                requiresUserConfirmation: true,
                configurationChanges: {
                  batchProcessingEnabled: true,
                  batchSize: 10,
                },
                codeChangesRequired: true,
              },
              validation: {
                successMetrics: ['throughput_above_2_per_second', 'latency_maintained'],
                rollbackProcedure: 'Disable batch processing',
                testingRequired: true,
              },
              generatedAt: now,
            });
          }

          return recommendations;
        },

        applyOptimization: async (recommendationId: string): Promise<boolean> => {
          const state = get();
          const recommendation = state.optimizationRecommendations.find(r => r.recommendationId === recommendationId);

          if (!recommendation) {
            return false;
          }

          try {
            if (recommendation.implementation.autoApplicable) {
              // Apply configuration changes
              if (recommendation.implementation.configurationChanges) {
                const configUpdates = recommendation.implementation.configurationChanges;

                // Apply memory optimization if applicable
                if ('metricRetentionHours' in configUpdates) {
                  get().updatePerformanceConfig({
                    metricRetentionHours: configUpdates.metricRetentionHours as number,
                  });
                }
              }

              // Mark as applied
              set((storeState) => {
                const appliedRecommendation = { ...recommendation, appliedAt: new Date().toISOString() };
                storeState.appliedOptimizations.push(appliedRecommendation);

                // Remove from recommendations
                storeState.optimizationRecommendations = storeState.optimizationRecommendations.filter(
                  r => r.recommendationId !== recommendationId
                );

                storeState.lastStateUpdate = new Date().toISOString();
              });

              return true;
            }

            return false;
          } catch (error) {
            console.error('Failed to apply optimization:', error);
            return false;
          }
        },

        rollbackOptimization: async (recommendationId: string): Promise<boolean> => {
          try {
            set((state) => {
              const appliedIndex = state.appliedOptimizations.findIndex(o => o.recommendationId === recommendationId);
              if (appliedIndex !== -1) {
                const optimization = state.appliedOptimizations[appliedIndex];

                // Rollback configuration changes (simplified)
                if (optimization.implementation.configurationChanges?.metricRetentionHours) {
                  state.performanceConfig.metricRetentionHours = 24; // Default
                }

                // Remove from applied optimizations
                state.appliedOptimizations.splice(appliedIndex, 1);
                state.lastStateUpdate = new Date().toISOString();
              }
            });

            return true;
          } catch (error) {
            console.error('Failed to rollback optimization:', error);
            return false;
          }
        },

        // Analysis and reporting
        analyzePerformanceTrends: (metricName: string, windowMs: number) => {
          const state = get();
          const metricData = state.performanceMetrics.get(metricName);

          if (!metricData || metricData.samples.length < 2) {
            return { trend: 'stable' as const, changePercentage: 0, confidence: 0 };
          }

          const cutoffTime = Date.now() - windowMs;
          const recentSamples = metricData.samples.filter(
            sample => new Date(sample.timestamp).getTime() > cutoffTime
          );

          if (recentSamples.length < 2) {
            return { trend: 'stable' as const, changePercentage: 0, confidence: 0 };
          }

          // Simple trend analysis using linear regression
          const values = recentSamples.map(s => s.value);
          const firstHalf = values.slice(0, Math.floor(values.length / 2));
          const secondHalf = values.slice(Math.floor(values.length / 2));

          const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
          const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

          const changePercentage = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
          const confidence = Math.min(recentSamples.length / 10, 1); // Confidence based on sample size

          let trend: 'improving' | 'stable' | 'degrading';
          if (Math.abs(changePercentage) < 5) {
            trend = 'stable';
          } else if (changePercentage > 0) {
            // For performance metrics, higher might be worse (e.g., response time)
            trend = metricName.includes('time') || metricName.includes('latency') ? 'degrading' : 'improving';
          } else {
            trend = metricName.includes('time') || metricName.includes('latency') ? 'improving' : 'degrading';
          }

          return { trend, changePercentage: Math.abs(changePercentage), confidence };
        },

        generatePerformanceReport: async (): Promise<string> => {
          const state = get();
          const now = new Date().toISOString();

          // Analyze trends for key metrics
          const trends = {
            responseTime: get().analyzePerformanceTrends('response_time', 3600000), // 1 hour
            throughput: get().analyzePerformanceTrends('throughput', 3600000),
            memoryUsage: get().analyzePerformanceTrends('memory_usage', 3600000),
          };

          const report = {
            generatedAt: now,
            summary: {
              currentPerformance: state.currentPerformance,
              resourceUsage: state.resourceUsage,
              activeAlerts: state.activeAlerts.length,
              slaCompliance: Array.from(state.slaCompliance.values()).map(compliance => compliance.compliance.overallCompliance),
            },
            trends,
            recommendations: {
              total: state.optimizationRecommendations.length,
              highPriority: state.optimizationRecommendations.filter(r => r.priority === 'high').length,
              autoApplicable: state.optimizationRecommendations.filter(r => r.implementation.autoApplicable).length,
            },
            alerts: {
              active: state.activeAlerts.length,
              critical: state.activeAlerts.filter(a => a.severity === 'critical').length,
              unacknowledged: state.activeAlerts.filter(a => !a.acknowledgedAt).length,
            },
            historicalMetrics: Object.fromEntries(
              Array.from(state.performanceMetrics.entries()).map(([name, data]) => [
                name,
                {
                  current: data.aggregates.current,
                  average: data.aggregates.average,
                  p95: data.aggregates.p95,
                  sampleCount: data.samples.length,
                }
              ])
            ),
          };

          return JSON.stringify(report, null, 2);
        },

        exportMetricsData: async (metricNames?: string[], startTime?: string, endTime?: string): Promise<string> => {
          const state = get();
          const exportData: any = {
            exportedAt: new Date().toISOString(),
            timeRange: {
              start: startTime || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
              end: endTime || new Date().toISOString(),
            },
            metrics: {},
          };

          const metricsToExport = metricNames || Array.from(state.performanceMetrics.keys());
          const startMs = startTime ? new Date(startTime).getTime() : Date.now() - 24 * 60 * 60 * 1000;
          const endMs = endTime ? new Date(endTime).getTime() : Date.now();

          for (const metricName of metricsToExport) {
            const metricData = state.performanceMetrics.get(metricName);
            if (metricData) {
              const filteredSamples = metricData.samples.filter(sample => {
                const sampleTime = new Date(sample.timestamp).getTime();
                return sampleTime >= startMs && sampleTime <= endMs;
              });

              exportData.metrics[metricName] = {
                samples: filteredSamples,
                aggregates: metricData.aggregates,
                sampleCount: filteredSamples.length,
              };
            }
          }

          return JSON.stringify(exportData, null, 2);
        },

        // Maintenance and cleanup
        performMetricCleanup: async (): Promise<{ samplesRemoved: number; metricsArchived: number }> => {
          let totalSamplesRemoved = 0;
          let metricsArchived = 0;

          set((state) => {
            const now = Date.now();

            for (const [metricName, metricData] of state.performanceMetrics) {
              const retentionCutoff = now - metricData.retentionPeriodMs;
              const initialSampleCount = metricData.samples.length;

              // Remove old samples
              metricData.samples = metricData.samples.filter(
                sample => new Date(sample.timestamp).getTime() > retentionCutoff
              );

              const samplesRemoved = initialSampleCount - metricData.samples.length;
              totalSamplesRemoved += samplesRemoved;

              // Archive metrics with no recent samples
              if (metricData.samples.length === 0) {
                state.performanceMetrics.delete(metricName);
                metricsArchived++;
              } else {
                // Recalculate aggregates after cleanup
                if (metricData.samples.length > 0) {
                  const values = metricData.samples.map(s => s.value).sort((a, b) => a - b);
                  const sum = values.reduce((a, b) => a + b, 0);

                  metricData.aggregates = {
                    current: values[values.length - 1],
                    average: sum / values.length,
                    min: values[0],
                    max: values[values.length - 1],
                    p50: values[Math.floor(values.length * 0.5)],
                    p90: values[Math.floor(values.length * 0.9)],
                    p95: values[Math.floor(values.length * 0.95)],
                    p99: values[Math.floor(values.length * 0.99)],
                  };
                }

                state.performanceMetrics.set(metricName, metricData);
              }
            }

            // Clean up old alerts
            const alertRetentionMs = state.alertConfiguration.alertHistoryRetentionHours * 60 * 60 * 1000;
            state.alertHistory = state.alertHistory.filter(
              alert => now - new Date(alert.triggeredAt).getTime() < alertRetentionMs
            );

            state.lastStateUpdate = new Date().toISOString();
          });

          return { samplesRemoved: totalSamplesRemoved, metricsArchived };
        },

        optimizePerformanceState: async (): Promise<{ memoryFreed: number; optimizationsApplied: number }> => {
          let memoryFreed = 0;
          let optimizationsApplied = 0;

          // Generate and auto-apply optimizations
          const recommendations = await get().generateOptimizationRecommendations();

          for (const recommendation of recommendations) {
            if (recommendation.implementation.autoApplicable && !recommendation.implementation.requiresUserConfirmation) {
              const applied = await get().applyOptimization(recommendation.recommendationId);
              if (applied) {
                optimizationsApplied++;
                // Estimate memory freed based on optimization type
                if (recommendation.category === 'memory') {
                  memoryFreed += 10; // MB estimate
                }
              }
            }
          }

          // Perform metric cleanup
          const cleanupResult = await get().performMetricCleanup();
          memoryFreed += cleanupResult.samplesRemoved * 0.001; // Estimate 1KB per sample

          return { memoryFreed, optimizationsApplied };
        },

        // Configuration
        updatePerformanceConfig: (config: Partial<QueuePerformanceState['performanceConfig']>): void => {
          set((state) => {
            state.performanceConfig = {
              ...state.performanceConfig,
              ...config,
            };
            state.lastStateUpdate = new Date().toISOString();
          });
        },

        reset: () => {
          set(() => ({
            performanceMetrics: new Map(),
            currentPerformance: {
              queueThroughputPerSecond: 0,
              averageProcessingTimeMs: 0,
              averageQueueWaitTimeMs: 0,
              crisisResponseTimeMs: 0,
              memoryUtilizationPercentage: 0,
              errorRate: 0,
              lastUpdated: new Date().toISOString(),
            },
            resourceUsage: getDefaultResourceUsage(),
            slaDefinitions: [],
            slaCompliance: new Map(),
            activeAlerts: [],
            alertHistory: [],
            alertConfiguration: {
              maxActiveAlerts: 50,
              alertHistoryRetentionHours: 72,
              autoRemediationEnabled: true,
              criticalAlertThresholds: {
                crisisResponseTimeMs: 200,
                memoryUtilizationPercentage: 0.9,
                errorRate: 0.1,
              },
            },
            optimizationRecommendations: [],
            appliedOptimizations: [],
            performanceConfig: getDefaultPerformanceConfig(),
            lastStateUpdate: new Date().toISOString(),
          }));
        },
      })),
      {
        name: 'being-queue-performance',
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          // Convert Maps to objects for serialization
          performanceMetrics: Object.fromEntries(state.performanceMetrics),
          slaCompliance: Object.fromEntries(state.slaCompliance),
          currentPerformance: state.currentPerformance,
          resourceUsage: state.resourceUsage,
          slaDefinitions: state.slaDefinitions,
          activeAlerts: state.activeAlerts,
          alertHistory: state.alertHistory.slice(-100), // Keep only last 100 alerts
          alertConfiguration: state.alertConfiguration,
          optimizationRecommendations: state.optimizationRecommendations,
          appliedOptimizations: state.appliedOptimizations,
          performanceConfig: state.performanceConfig,
        }),
        // Convert objects back to Maps after deserialization
        onRehydrateStorage: () => (state) => {
          if (state) {
            if (state.performanceMetrics) {
              const metricsMap = new Map();
              Object.entries(state.performanceMetrics as any).forEach(([key, value]) => {
                metricsMap.set(key, value);
              });
              state.performanceMetrics = metricsMap;
            }

            if (state.slaCompliance) {
              const complianceMap = new Map();
              Object.entries(state.slaCompliance as any).forEach(([key, value]) => {
                complianceMap.set(key, value);
              });
              state.slaCompliance = complianceMap;
            }
          }
        },
      }
    )
  )
);

/**
 * Queue Performance Selectors for Efficient Access
 */
export const queuePerformanceSelectors = {
  getCurrentPerformance: (state: QueuePerformanceState) => state.currentPerformance,
  getResourceUsage: (state: QueuePerformanceState) => state.resourceUsage,
  getActiveAlerts: (state: QueuePerformanceState) => state.activeAlerts,
  getCriticalAlerts: (state: QueuePerformanceState) =>
    state.activeAlerts.filter(alert => alert.severity === 'critical'),
  getMetricData: (state: QueuePerformanceState, metricName: string) =>
    state.performanceMetrics.get(metricName),
  getResourcePressureLevel: (state: QueuePerformanceState) => state.resourceUsage.memory.pressureLevel,
  getSLACompliance: (state: QueuePerformanceState) =>
    Array.from(state.slaCompliance.values()).map(c => c.compliance.overallCompliance),
  getOptimizationRecommendations: (state: QueuePerformanceState) =>
    state.optimizationRecommendations,
  getAutoApplicableOptimizations: (state: QueuePerformanceState) =>
    state.optimizationRecommendations.filter(r => r.implementation.autoApplicable),
};

/**
 * Queue Performance Hook with Selectors
 */
export const useQueuePerformance = () => {
  const store = useQueuePerformanceStore();
  return {
    ...store,
    selectors: queuePerformanceSelectors,
  };
};