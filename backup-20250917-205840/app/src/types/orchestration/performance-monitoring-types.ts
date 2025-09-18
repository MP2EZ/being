/**
 * Performance Monitoring Type Definitions
 * P0-CLOUD Platform Infrastructure - TypeScript Implementation
 *
 * Comprehensive performance monitoring types for:
 * - <500ms sync propagation validation
 * - <200ms crisis response enforcement
 * - Memory-efficient mobile constraints
 * - Subscription tier performance SLA compliance
 * - Real-time violation detection and alerting
 */

import { z } from 'zod';
import type {
  SyncOperation,
  SyncableData
} from '../sync';
import type {
  SubscriptionTier
} from '../subscription';
import type {
  OrchestrationPriority,
  OrchestrationOperation
} from './sync-orchestration-types';

/**
 * PERFORMANCE METRICS SYSTEM
 */

/**
 * Core performance metric categories
 */
export const PerformanceMetricCategorySchema = z.enum([
  'response_time',           // Operation response times
  'throughput',             // Operations per second/minute
  'resource_usage',         // CPU, memory, network utilization
  'sync_performance',       // Sync propagation times
  'crisis_performance',     // Crisis response times (<200ms)
  'therapeutic_performance', // Therapeutic session performance
  'cross_device_performance', // Cross-device coordination times
  'network_performance',    // Network latency and bandwidth
  'error_rates',           // Error and failure rates
  'user_experience'        // User-facing performance metrics
]);

export type PerformanceMetricCategory = z.infer<typeof PerformanceMetricCategorySchema>;

/**
 * Performance alert severity levels
 */
export const PerformanceAlertLevelSchema = z.enum([
  'info',      // Informational, no action needed
  'warning',   // Performance degradation detected
  'error',     // Performance threshold violated
  'critical'   // Performance critical threshold exceeded, immediate action required
]);

export type PerformanceAlertLevel = z.infer<typeof PerformanceAlertLevelSchema>;

/**
 * Individual performance metric with subscription context
 */
export const PerformanceMetricSchema = z.object({
  // Metric identification
  metricId: z.string(),
  category: PerformanceMetricCategorySchema,
  name: z.string(),
  description: z.string(),

  // Metric value and context
  value: z.number(),
  unit: z.enum(['milliseconds', 'seconds', 'percentage', 'bytes', 'count', 'rate']),
  timestamp: z.string(), // ISO timestamp

  // Performance context
  context: z.object({
    // Operation context
    operationId: z.string().optional(),
    operationType: z.string().optional(),
    priority: z.nativeEnum(OrchestrationPriority).optional(),

    // Subscription context
    subscriptionTier: z.enum(['free', 'premium', 'family', 'enterprise']).optional(),
    userId: z.string().optional(),
    deviceId: z.string().optional(),

    // Therapeutic context
    therapeuticContext: z.object({
      sessionActive: z.boolean(),
      sessionType: z.enum(['morning', 'midday', 'evening', 'crisis', 'assessment']).optional(),
      crisisMode: z.boolean(),
      assessmentInProgress: z.boolean()
    }).optional(),

    // Technical context
    technicalContext: z.object({
      platform: z.enum(['ios', 'android', 'web']).optional(),
      appVersion: z.string().optional(),
      networkType: z.enum(['wifi', 'cellular', 'unknown']).optional(),
      batteryLevel: z.number().min(0).max(100).optional()
    }).optional()
  }),

  // Performance thresholds for this metric
  thresholds: z.object({
    // Warning thresholds
    warning: z.object({
      min: z.number().optional(),
      max: z.number().optional()
    }),

    // Error thresholds
    error: z.object({
      min: z.number().optional(),
      max: z.number().optional()
    }),

    // Critical thresholds (SLA violations)
    critical: z.object({
      min: z.number().optional(),
      max: z.number().optional()
    }),

    // Subscription tier specific thresholds
    tierThresholds: z.record(
      z.enum(['free', 'premium', 'family', 'enterprise']),
      z.object({
        warning: z.number().optional(),
        error: z.number().optional(),
        critical: z.number().optional()
      })
    ).optional()
  }),

  // Violation detection
  violation: z.object({
    isViolation: z.boolean(),
    violationType: PerformanceAlertLevelSchema.optional(),
    violationMessage: z.string().optional(),
    violationSince: z.string().optional(), // ISO timestamp
    continuousViolationDuration: z.number().optional() // milliseconds
  }),

  // Trend analysis
  trend: z.object({
    direction: z.enum(['improving', 'stable', 'degrading', 'volatile']),
    changePercentage: z.number(), // Percentage change from previous measurement
    confidenceScore: z.number().min(0).max(1), // 0-1 confidence in trend analysis
    forecastNext: z.number().optional() // Predicted next value
  })
});

export type PerformanceMetric = z.infer<typeof PerformanceMetricSchema>;

/**
 * PERFORMANCE MONITORING SESSION
 * Groups related performance metrics for analysis
 */

/**
 * Performance monitoring session for operations
 */
export const PerformanceSessionSchema = z.object({
  // Session identification
  sessionId: z.string(),
  sessionType: z.enum([
    'sync_operation',        // Single sync operation monitoring
    'therapeutic_session',   // Complete therapeutic session monitoring
    'crisis_response',       // Crisis response monitoring (<200ms)
    'cross_device_sync',     // Cross-device synchronization monitoring
    'offline_reconciliation', // Offline-online reconciliation monitoring
    'subscription_enforcement', // Subscription tier enforcement monitoring
    'system_health_check',   // System-wide health monitoring
    'load_test',            // Performance load testing
    'user_journey'          // End-to-end user journey monitoring
  ]),

  // Session metadata
  metadata: z.object({
    startTime: z.string(), // ISO timestamp
    endTime: z.string().optional(), // ISO timestamp
    duration: z.number().optional(), // milliseconds
    userId: z.string().optional(),
    deviceId: z.string().optional(),
    subscriptionTier: z.enum(['free', 'premium', 'family', 'enterprise']).optional(),

    // Session context
    sessionContext: z.record(z.string(), z.unknown()).optional(),
    tags: z.array(z.string()).default([])
  }),

  // Collected metrics during session
  metrics: z.array(PerformanceMetricSchema),

  // Session-wide performance analysis
  analysis: z.object({
    // Overall session performance
    overallPerformance: z.enum(['excellent', 'good', 'acceptable', 'poor', 'unacceptable']),
    performanceScore: z.number().min(0).max(100), // 0-100 overall score

    // Specific performance areas
    responseTimeScore: z.number().min(0).max(100),
    throughputScore: z.number().min(0).max(100),
    resourceUsageScore: z.number().min(0).max(100),
    errorRateScore: z.number().min(0).max(100),

    // SLA compliance
    slaCompliance: z.object({
      responseTimeSLA: z.boolean(), // Met response time SLA
      throughputSLA: z.boolean(),   // Met throughput SLA
      availabilitySLA: z.boolean(), // Met availability SLA
      overallSLACompliance: z.boolean()
    }),

    // Critical performance violations
    criticalViolations: z.array(z.object({
      violationType: z.enum(['response_time', 'crisis_response', 'memory_usage', 'error_rate']),
      violationValue: z.number(),
      threshold: z.number(),
      impact: z.enum(['low', 'medium', 'high', 'critical']),
      mitigationAction: z.string().optional()
    })),

    // Performance insights and recommendations
    insights: z.array(z.object({
      category: z.enum(['optimization', 'scaling', 'resource_allocation', 'user_experience']),
      insight: z.string(),
      recommendedAction: z.string(),
      priority: z.enum(['low', 'medium', 'high']),
      estimatedImpact: z.enum(['minimal', 'moderate', 'significant', 'major'])
    }))
  }),

  // Session outcome
  outcome: z.object({
    success: z.boolean(),
    completionRate: z.number().min(0).max(100), // Percentage of operations completed successfully
    errorCount: z.number(),
    warningCount: z.number(),

    // Performance impact on user experience
    userExperienceImpact: z.enum(['none', 'minimal', 'noticeable', 'significant', 'severe']),
    therapeuticImpact: z.enum(['none', 'minimal', 'moderate', 'significant', 'critical']).optional(),

    // Follow-up actions required
    followUpRequired: z.boolean(),
    escalationRequired: z.boolean(),
    optimizationOpportunity: z.boolean()
  })
});

export type PerformanceSession = z.infer<typeof PerformanceSessionSchema>;

/**
 * PERFORMANCE SUMMARY AND AGGREGATION
 */

/**
 * Aggregated performance summary over time periods
 */
export const PerformanceSummarySchema = z.object({
  // Summary identification
  summaryId: z.string(),
  periodType: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
  periodStart: z.string(), // ISO timestamp
  periodEnd: z.string(),   // ISO timestamp

  // Aggregated metrics by category
  aggregatedMetrics: z.record(
    PerformanceMetricCategorySchema,
    z.object({
      // Statistical aggregations
      average: z.number(),
      median: z.number(),
      p95: z.number(), // 95th percentile
      p99: z.number(), // 99th percentile
      minimum: z.number(),
      maximum: z.number(),
      standardDeviation: z.number(),

      // Sample count
      sampleCount: z.number(),
      validSamples: z.number(),
      invalidSamples: z.number(),

      // Trend information
      trendDirection: z.enum(['improving', 'stable', 'degrading']),
      changeFromPrevious: z.number() // Percentage change from previous period
    })
  ),

  // SLA compliance summary
  slaCompliance: z.object({
    // Overall compliance rates
    overallCompliance: z.number().min(0).max(100), // Percentage
    responseTimeCompliance: z.number().min(0).max(100),
    crisisResponseCompliance: z.number().min(0).max(100), // <200ms compliance
    throughputCompliance: z.number().min(0).max(100),
    availabilityCompliance: z.number().min(0).max(100),

    // Subscription tier compliance
    tierCompliance: z.record(
      z.enum(['free', 'premium', 'family', 'enterprise']),
      z.object({
        compliance: z.number().min(0).max(100), // Percentage
        violations: z.number(),
        totalOperations: z.number()
      })
    ),

    // Violation summary
    violations: z.object({
      total: z.number(),
      critical: z.number(),
      error: z.number(),
      warning: z.number(),

      // Most common violation types
      topViolationTypes: z.array(z.object({
        type: z.string(),
        count: z.number(),
        percentage: z.number()
      }))
    })
  }),

  // Performance by user segment
  userSegmentPerformance: z.object({
    // Subscription tier performance
    bySubscriptionTier: z.record(
      z.enum(['free', 'premium', 'family', 'enterprise']),
      z.object({
        averageResponseTime: z.number(), // milliseconds
        throughput: z.number(), // operations per second
        errorRate: z.number().min(0).max(100), // percentage
        userSatisfactionScore: z.number().min(0).max(100).optional()
      })
    ),

    // Platform performance
    byPlatform: z.record(
      z.enum(['ios', 'android', 'web']),
      z.object({
        averageResponseTime: z.number(),
        crashRate: z.number().min(0).max(100),
        memoryUsage: z.number(), // Average MB used
        batteryImpact: z.number().min(0).max(100).optional() // Battery usage score
      })
    ),

    // Geographic performance (if available)
    byRegion: z.record(z.string(), z.object({
      averageLatency: z.number(), // milliseconds
      connectionQuality: z.number().min(0).max(100), // percentage
      errorRate: z.number().min(0).max(100)
    })).optional()
  }),

  // Critical performance insights
  criticalInsights: z.array(z.object({
    insight: z.string(),
    impact: z.enum(['low', 'medium', 'high', 'critical']),
    affectedUsers: z.number(),
    affectedOperations: z.number(),
    recommendedAction: z.string(),
    urgency: z.enum(['low', 'medium', 'high', 'immediate'])
  })),

  // Performance health score
  healthScore: z.object({
    overall: z.number().min(0).max(100),
    responseTime: z.number().min(0).max(100),
    throughput: z.number().min(0).max(100),
    reliability: z.number().min(0).max(100),
    resourceEfficiency: z.number().min(0).max(100),
    userExperience: z.number().min(0).max(100)
  })
});

export type PerformanceSummary = z.infer<typeof PerformanceSummarySchema>;

/**
 * REAL-TIME PERFORMANCE ALERTS
 */

/**
 * Performance alert with escalation logic
 */
export const PerformanceAlertSchema = z.object({
  // Alert identification
  alertId: z.string(),
  alertType: z.enum([
    'response_time_violation',
    'crisis_response_violation',
    'throughput_degradation',
    'memory_exhaustion',
    'error_rate_spike',
    'sla_violation',
    'resource_saturation',
    'user_experience_impact'
  ]),

  // Alert severity and status
  severity: PerformanceAlertLevelSchema,
  status: z.enum(['active', 'acknowledged', 'resolved', 'suppressed']),

  // Alert details
  details: z.object({
    title: z.string(),
    description: z.string(),
    triggeredAt: z.string(), // ISO timestamp
    resolvedAt: z.string().optional(), // ISO timestamp
    duration: z.number().optional(), // milliseconds

    // Performance values that triggered alert
    triggerValue: z.number(),
    threshold: z.number(),
    unit: z.string(),

    // Context of the alert
    context: z.object({
      operationId: z.string().optional(),
      userId: z.string().optional(),
      deviceId: z.string().optional(),
      subscriptionTier: z.enum(['free', 'premium', 'family', 'enterprise']).optional(),
      sessionId: z.string().optional(),

      // Therapeutic context (for crisis alerts)
      therapeuticContext: z.object({
        crisisMode: z.boolean(),
        sessionType: z.enum(['morning', 'midday', 'evening', 'crisis', 'assessment']).optional(),
        assessmentInProgress: z.boolean()
      }).optional()
    })
  }),

  // Impact assessment
  impact: z.object({
    // User impact
    affectedUsers: z.number(),
    affectedOperations: z.number(),
    userExperienceImpact: z.enum(['minimal', 'moderate', 'significant', 'severe']),

    // Therapeutic impact (critical for mental health app)
    therapeuticImpact: z.enum(['none', 'minimal', 'moderate', 'significant', 'critical']),
    crisisResponseImpact: z.boolean(), // If crisis response is affected

    // Business impact
    slaImpact: z.boolean(),
    revenueImpact: z.enum(['none', 'minimal', 'moderate', 'significant']),
    reputationImpact: z.enum(['none', 'minimal', 'moderate', 'significant'])
  }),

  // Escalation and response
  escalation: z.object({
    autoEscalate: z.boolean(),
    escalationLevel: z.enum(['none', 'team', 'manager', 'executive', 'emergency']),
    escalatedAt: z.string().optional(), // ISO timestamp
    escalatedTo: z.array(z.string()).optional(), // Contact IDs

    // Response requirements
    responseTimeTarget: z.number(), // milliseconds
    resolutionTimeTarget: z.number(), // milliseconds
    requiresImmediateAction: z.boolean()
  }),

  // Mitigation and resolution
  mitigation: z.object({
    // Automatic mitigation attempted
    automaticMitigation: z.object({
      attempted: z.boolean(),
      actions: z.array(z.enum([
        'scale_resources',
        'activate_fallback',
        'reduce_load',
        'prioritize_critical_operations',
        'enable_crisis_mode',
        'notify_users'
      ])),
      success: z.boolean(),
      mitigationTime: z.number().optional() // milliseconds
    }),

    // Manual resolution
    resolution: z.object({
      resolvedBy: z.enum(['automatic', 'manual', 'escalation']).optional(),
      resolutionActions: z.array(z.string()).optional(),
      resolutionTime: z.number().optional(), // milliseconds
      rootCause: z.string().optional(),
      preventionMeasures: z.array(z.string()).optional()
    })
  }),

  // Alert metadata
  metadata: z.object({
    createdAt: z.string(), // ISO timestamp
    updatedAt: z.string(), // ISO timestamp
    acknowledgedBy: z.string().optional(), // User ID
    acknowledgedAt: z.string().optional(), // ISO timestamp
    tags: z.array(z.string()).default([]),
    relatedAlerts: z.array(z.string()).default([]) // Related alert IDs
  })
});

export type PerformanceAlert = z.infer<typeof PerformanceAlertSchema>;

/**
 * PERFORMANCE MONITOR CONFIGURATION
 */

/**
 * Performance monitoring configuration
 */
export const PerformanceMonitorConfigSchema = z.object({
  // Monitor identification
  monitorId: z.string(),
  name: z.string(),
  description: z.string(),

  // Monitoring scope
  scope: z.object({
    // What to monitor
    categories: z.array(PerformanceMetricCategorySchema),
    subscriptionTiers: z.array(z.enum(['free', 'premium', 'family', 'enterprise'])),
    platforms: z.array(z.enum(['ios', 'android', 'web'])),

    // Monitoring depth
    monitoringLevel: z.enum(['basic', 'detailed', 'comprehensive']),
    samplingRate: z.number().min(0).max(1), // 0-1, percentage of operations to monitor
    enableRealTimeMonitoring: z.boolean()
  }),

  // Performance thresholds (critical for SLA compliance)
  thresholds: z.object({
    // Universal thresholds (non-negotiable)
    universal: z.object({
      crisisResponseMaxTime: z.number().default(200), // milliseconds
      syncPropagationMaxTime: z.number().default(500), // milliseconds
      therapeuticSessionMaxLatency: z.number().default(1000), // milliseconds
      maxMemoryUsageMB: z.number().default(256), // MB for mobile
      maxErrorRate: z.number().default(1), // percentage
    }),

    // Subscription tier specific thresholds
    tierThresholds: z.object({
      free: z.object({
        maxResponseTime: z.number().default(2000), // milliseconds
        maxThroughput: z.number().default(10), // ops/second
        maxConcurrentOperations: z.number().default(2)
      }),
      premium: z.object({
        maxResponseTime: z.number().default(1000), // milliseconds
        maxThroughput: z.number().default(50), // ops/second
        maxConcurrentOperations: z.number().default(5)
      }),
      family: z.object({
        maxResponseTime: z.number().default(800), // milliseconds
        maxThroughput: z.number().default(100), // ops/second
        maxConcurrentOperations: z.number().default(10)
      }),
      enterprise: z.object({
        maxResponseTime: z.number().default(500), // milliseconds
        maxThroughput: z.number().default(200), // ops/second
        maxConcurrentOperations: z.number().default(20)
      })
    }),

    // Alert thresholds
    alertThresholds: z.object({
      warning: z.object({
        responseTimeMultiplier: z.number().default(0.8), // 80% of max
        errorRateThreshold: z.number().default(0.5), // 0.5%
        memoryUsageThreshold: z.number().default(80) // 80%
      }),
      error: z.object({
        responseTimeMultiplier: z.number().default(0.9), // 90% of max
        errorRateThreshold: z.number().default(1.0), // 1%
        memoryUsageThreshold: z.number().default(90) // 90%
      }),
      critical: z.object({
        responseTimeMultiplier: z.number().default(1.0), // 100% of max
        errorRateThreshold: z.number().default(2.0), // 2%
        memoryUsageThreshold: z.number().default(95) // 95%
      })
    })
  }),

  // Monitoring intervals and retention
  intervals: z.object({
    metricCollectionInterval: z.number().default(5000), // 5 seconds
    healthCheckInterval: z.number().default(30000), // 30 seconds
    alertEvaluationInterval: z.number().default(1000), // 1 second
    summaryGenerationInterval: z.number().default(3600000), // 1 hour

    // Data retention
    rawMetricsRetentionDays: z.number().default(7),
    aggregatedMetricsRetentionDays: z.number().default(90),
    alertHistoryRetentionDays: z.number().default(365)
  }),

  // Crisis monitoring (special configuration)
  crisisMonitoring: z.object({
    enabled: z.boolean().default(true),
    strictModeEnabled: z.boolean().default(true), // Fail-fast on violations
    crisisAlertEscalation: z.boolean().default(true),
    emergencyNotificationEnabled: z.boolean().default(true),

    // Crisis-specific thresholds (more stringent)
    crisisResponseTime: z.number().default(200), // milliseconds
    crisisErrorTolerance: z.number().default(0.1), // 0.1%
    crisisMemoryLimit: z.number().default(128) // MB
  }),

  // Integration settings
  integrations: z.object({
    enableAlertNotifications: z.boolean().default(true),
    enableMetricsExport: z.boolean().default(true),
    enableAutomaticMitigation: z.boolean().default(true),

    // External integrations
    externalMonitoring: z.object({
      enabled: z.boolean().default(false),
      apiEndpoint: z.string().optional(),
      apiKey: z.string().optional()
    })
  })
});

export type PerformanceMonitorConfig = z.infer<typeof PerformanceMonitorConfigSchema>;

/**
 * PERFORMANCE MONITORING SERVICE INTERFACE
 */

/**
 * Performance monitoring service state
 */
export interface PerformanceMonitorState {
  // Current monitoring status
  readonly isMonitoring: boolean;
  readonly monitoringStarted: string; // ISO timestamp
  readonly configuration: PerformanceMonitorConfig;

  // Real-time metrics
  readonly currentMetrics: PerformanceMetric[];
  readonly activeAlerts: PerformanceAlert[];
  readonly recentSessions: PerformanceSession[];

  // System health
  readonly systemHealth: {
    readonly overall: 'healthy' | 'degraded' | 'critical';
    readonly responseTimeHealth: number; // 0-100 score
    readonly throughputHealth: number; // 0-100 score
    readonly resourceHealth: number; // 0-100 score
    readonly errorRateHealth: number; // 0-100 score
  };

  // Performance summary
  readonly currentSummary: {
    readonly averageResponseTime: number; // milliseconds
    readonly crisisResponseCompliance: number; // percentage
    readonly syncPropagationCompliance: number; // percentage
    readonly overallSLACompliance: number; // percentage
  };
}

/**
 * Performance monitoring service actions
 */
export interface PerformanceMonitorActions {
  // Monitoring control
  startMonitoring: (config?: Partial<PerformanceMonitorConfig>) => Promise<void>;
  stopMonitoring: () => Promise<void>;
  pauseMonitoring: () => Promise<void>;
  resumeMonitoring: () => Promise<void>;

  // Metric collection
  collectMetric: (metric: PerformanceMetric) => Promise<void>;
  startPerformanceSession: (sessionType: PerformanceSession['sessionType']) => Promise<string>;
  endPerformanceSession: (sessionId: string) => Promise<PerformanceSession>;

  // Alert management
  createAlert: (alert: Omit<PerformanceAlert, 'alertId' | 'metadata'>) => Promise<string>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  resolveAlert: (alertId: string, resolution: string) => Promise<void>;
  suppressAlert: (alertId: string, duration: number) => Promise<void>;

  // Performance validation
  validateCrisisPerformance: (operationId: string, responseTime: number) => Promise<boolean>;
  validateSyncPerformance: (syncTime: number) => Promise<boolean>;
  validateSubscriptionSLA: (operation: SyncOperation, tier: SubscriptionTier, responseTime: number) => Promise<boolean>;

  // Reporting and analysis
  generatePerformanceSummary: (periodType: PerformanceSummary['periodType'], startDate: string, endDate: string) => Promise<PerformanceSummary>;
  exportPerformanceMetrics: (startDate: string, endDate: string) => Promise<PerformanceMetric[]>;
  getPerformanceInsights: (category?: PerformanceMetricCategory) => Promise<string[]>;

  // Configuration management
  updateConfiguration: (config: Partial<PerformanceMonitorConfig>) => Promise<void>;
  updateThresholds: (thresholds: Partial<PerformanceMonitorConfig['thresholds']>) => Promise<void>;
}

/**
 * Complete performance monitoring service interface
 */
export interface PerformanceMonitorService extends PerformanceMonitorState, PerformanceMonitorActions {
  // Service lifecycle
  initialize: (config: PerformanceMonitorConfig) => Promise<void>;
  shutdown: () => Promise<void>;

  // Performance-aware operation execution
  monitorOperation: <T>(
    operation: SyncOperation,
    executor: () => Promise<T>,
    performanceRequirements?: {
      maxTime?: number;
      crisisMode?: boolean;
      subscriptionTier?: SubscriptionTier;
    }
  ) => Promise<T>;

  // Crisis performance monitoring
  monitorCrisisOperation: <T>(
    operation: SyncOperation,
    executor: () => Promise<T>
  ) => Promise<T>;
}

/**
 * CONSTANTS AND VALIDATION
 */
export const PERFORMANCE_CONSTANTS = {
  // Non-negotiable performance requirements
  CRISIS_MAX_RESPONSE_TIME: 200, // milliseconds
  SYNC_MAX_PROPAGATION_TIME: 500, // milliseconds
  THERAPEUTIC_MAX_LATENCY: 1000, // milliseconds

  // Mobile resource constraints
  MAX_MOBILE_MEMORY_MB: 256,
  MAX_BACKGROUND_CPU_PERCENT: 10,
  MAX_FOREGROUND_CPU_PERCENT: 50,

  // SLA compliance thresholds
  MIN_SLA_COMPLIANCE: 95, // percentage
  MIN_CRISIS_COMPLIANCE: 98, // percentage for crisis operations
  MAX_ERROR_RATE: 1, // percentage

  // Subscription tier performance guarantees
  TIER_RESPONSE_TIME_SLA: {
    free: 2000,      // 2 seconds
    premium: 1000,   // 1 second
    family: 800,     // 800ms
    enterprise: 500  // 500ms
  },

  // Alert escalation timeframes
  ALERT_RESPONSE_TIME: {
    info: 3600000,     // 1 hour
    warning: 900000,   // 15 minutes
    error: 300000,     // 5 minutes
    critical: 60000    // 1 minute
  },

  // Health score thresholds
  HEALTHY_SCORE: 80,
  DEGRADED_SCORE: 60,
  CRITICAL_SCORE: 40
} as const;

/**
 * Type guards for performance monitoring types
 */
export const isPerformanceMetric = (value: unknown): value is PerformanceMetric => {
  try {
    PerformanceMetricSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isPerformanceSession = (value: unknown): value is PerformanceSession => {
  try {
    PerformanceSessionSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isPerformanceAlert = (value: unknown): value is PerformanceAlert => {
  try {
    PerformanceAlertSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Export schemas for runtime validation
 */
export default {
  PerformanceMetricCategorySchema,
  PerformanceAlertLevelSchema,
  PerformanceMetricSchema,
  PerformanceSessionSchema,
  PerformanceSummarySchema,
  PerformanceAlertSchema,
  PerformanceMonitorConfigSchema,

  // Type guards
  isPerformanceMetric,
  isPerformanceSession,
  isPerformanceAlert,

  // Constants
  PERFORMANCE_CONSTANTS
};