/**
 * Performance Monitoring Types for Crisis-Safe Webhook Processing
 *
 * Comprehensive performance tracking ensuring:
 * - <200ms crisis response time monitoring
 * - Real-time performance metrics
 * - Therapeutic session impact assessment
 * - Memory efficiency tracking
 * - HIPAA-compliant performance logging
 */

import { z } from 'zod';
import { CrisisLevel } from './crisis-safety-types';

/**
 * Performance Timing Constraints
 */
export const PERFORMANCE_THRESHOLDS = {
  CRISIS_RESPONSE_MS: 200,
  NORMAL_RESPONSE_MS: 2000,
  WARNING_THRESHOLD_MS: 1500,
  CRITICAL_THRESHOLD_MS: 5000,
  MAXIMUM_TIMEOUT_MS: 30000,
} as const;

/**
 * Performance Metric Categories
 */
export const PerformanceMetricSchema = z.object({
  timestamp: z.number(),
  category: z.enum([
    'webhook_processing',
    'crisis_response',
    'state_update',
    'storage_operation',
    'network_request',
    'ui_rendering',
    'therapeutic_content',
    'security_validation',
    'audit_logging'
  ]),
  operation: z.string(),
  duration: z.number(),
  success: z.boolean(),
  crisisMode: z.boolean(),
  therapeuticImpact: z.boolean(),
});

export type PerformanceMetric = z.infer<typeof PerformanceMetricSchema>;

/**
 * Crisis Response Time Tracking
 */
export const CrisisResponseTimingSchema = z.object({
  eventId: z.string(),
  eventType: z.string(),
  crisisLevel: z.nativeEnum({
    none: 'none',
    watch: 'watch',
    low: 'low',
    medium: 'medium',
    high: 'high',
    critical: 'critical',
    emergency: 'emergency'
  } as const),

  timing: z.object({
    detectionTime: z.number(),        // Time to detect crisis event
    responseInitiation: z.number(),   // Time to initiate response
    emergencyAccess: z.number(),      // Time to grant emergency access
    totalResponseTime: z.number(),    // Total time from event to resolution
    targetResponseTime: z.number(),   // Target response time for this crisis level
    performanceRatio: z.number(),     // Actual / Target (should be ≤ 1.0)
  }),

  constraints: z.object({
    metCrisisConstraint: z.boolean(), // Met <200ms crisis constraint
    metTherapeuticConstraint: z.boolean(), // Maintained therapeutic continuity
    metSecurityConstraint: z.boolean(), // Maintained security requirements
    metAccessibilityConstraint: z.boolean(), // Maintained accessibility
  }),

  impacts: z.object({
    therapeuticSessionDisrupted: z.boolean(),
    userExperienceAffected: z.boolean(),
    emergencyProtocolsTriggered: z.boolean(),
    gracePeriodActivated: z.boolean(),
  }),
});

export type CrisisResponseTiming = z.infer<typeof CrisisResponseTimingSchema>;

/**
 * Webhook Processing Performance
 */
export const WebhookProcessingPerformanceSchema = z.object({
  webhookId: z.string(),
  eventType: z.string(),
  processingPhases: z.object({
    validation: z.object({
      startTime: z.number(),
      duration: z.number(),
      success: z.boolean(),
    }),
    authentication: z.object({
      startTime: z.number(),
      duration: z.number(),
      success: z.boolean(),
    }),
    crisisCheck: z.object({
      startTime: z.number(),
      duration: z.number(),
      crisisDetected: z.boolean(),
    }),
    stateUpdate: z.object({
      startTime: z.number(),
      duration: z.number(),
      optimisticUpdate: z.boolean(),
      rollbackRequired: z.boolean(),
    }),
    notification: z.object({
      startTime: z.number(),
      duration: z.number(),
      therapeuticMessageSent: z.boolean(),
    }),
    audit: z.object({
      startTime: z.number(),
      duration: z.number(),
      complianceLogged: z.boolean(),
    }),
  }),
  totalProcessingTime: z.number(),
  memoryUsage: z.object({
    heapUsed: z.number(),
    heapTotal: z.number(),
    external: z.number(),
    arrayBuffers: z.number(),
  }),
  performanceGrade: z.enum(['excellent', 'good', 'acceptable', 'warning', 'critical']),
});

export type WebhookProcessingPerformance = z.infer<typeof WebhookProcessingPerformanceSchema>;

/**
 * Therapeutic Session Impact Assessment
 */
export const TherapeuticSessionImpactSchema = z.object({
  sessionId: z.string().optional(),
  sessionType: z.enum([
    'breathing_exercise',
    'body_scan',
    'mindful_movement',
    'meditation',
    'assessment',
    'check_in',
    'crisis_intervention'
  ]).optional(),

  impactAssessment: z.object({
    sessionInterrupted: z.boolean(),
    userExperienceAffected: z.boolean(),
    therapeuticFlowDisrupted: z.boolean(),
    attentionDiverted: z.boolean(),
    emotionalStateAffected: z.boolean(),
  }),

  mitigationApplied: z.object({
    gracefulDegradation: z.boolean(),
    backgroundProcessing: z.boolean(),
    deferredNotification: z.boolean(),
    therapeuticMessage: z.boolean(),
    sessionRecovery: z.boolean(),
  }),

  recoveryMetrics: z.object({
    sessionResumed: z.boolean(),
    timeToRecovery: z.number().optional(),
    userEngagementMaintained: z.boolean(),
    therapeuticOutcomePreserved: z.boolean(),
  }),
});

export type TherapeuticSessionImpact = z.infer<typeof TherapeuticSessionImpactSchema>;

/**
 * Memory Efficiency Monitoring
 */
export const MemoryEfficiencySchema = z.object({
  timestamp: z.number(),
  operation: z.string(),

  before: z.object({
    heapUsed: z.number(),
    heapTotal: z.number(),
    external: z.number(),
    arrayBuffers: z.number(),
  }),

  after: z.object({
    heapUsed: z.number(),
    heapTotal: z.number(),
    external: z.number(),
    arrayBuffers: z.number(),
  }),

  delta: z.object({
    heapUsed: z.number(),
    heapTotal: z.number(),
    external: z.number(),
    arrayBuffers: z.number(),
  }),

  efficiency: z.object({
    memoryLeakDetected: z.boolean(),
    garbageCollectionTriggered: z.boolean(),
    memoryPressure: z.enum(['low', 'moderate', 'high', 'critical']),
    optimizationApplied: z.boolean(),
  }),
});

export type MemoryEfficiency = z.infer<typeof MemoryEfficiencySchema>;

/**
 * Real-Time Performance Dashboard Data
 */
export const RealTimePerformanceDashboardSchema = z.object({
  timestamp: z.number(),

  overallHealth: z.object({
    status: z.enum(['excellent', 'good', 'degraded', 'critical']),
    crisisResponseCapability: z.boolean(),
    therapeuticContinuityMaintained: z.boolean(),
    emergencyAccessFunctional: z.boolean(),
  }),

  responseTimeTrends: z.object({
    currentAverage: z.number(),
    last5MinutesAverage: z.number(),
    last15MinutesAverage: z.number(),
    last1HourAverage: z.number(),
    crisisResponseTimes: z.array(z.number()),
    normalResponseTimes: z.array(z.number()),
  }),

  errorRates: z.object({
    overall: z.number(),
    crisisOperations: z.number(),
    therapeuticOperations: z.number(),
    paymentOperations: z.number(),
    securityOperations: z.number(),
  }),

  resourceUtilization: z.object({
    cpuUsage: z.number(),
    memoryUsage: z.number(),
    networkLatency: z.number(),
    storageLatency: z.number(),
  }),

  alerts: z.array(z.object({
    level: z.enum(['info', 'warning', 'error', 'critical']),
    message: z.string(),
    timestamp: z.number(),
    crisisRelated: z.boolean(),
    therapeuticImpact: z.boolean(),
  })),
});

export type RealTimePerformanceDashboard = z.infer<typeof RealTimePerformanceDashboardSchema>;

/**
 * Performance Optimization Recommendations
 */
export const PerformanceOptimizationSchema = z.object({
  analysisTimestamp: z.number(),
  analysisTimeframe: z.number(), // milliseconds

  recommendations: z.array(z.object({
    category: z.enum([
      'crisis_response',
      'memory_management',
      'webhook_processing',
      'state_management',
      'network_optimization',
      'therapeutic_continuity',
      'security_performance',
      'accessibility_performance'
    ]),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    recommendation: z.string(),
    expectedImprovement: z.string(),
    implementationComplexity: z.enum(['low', 'medium', 'high']),
    crisisImpact: z.boolean(),
    therapeuticBenefit: z.boolean(),
  })),

  performanceTargets: z.object({
    crisisResponseTime: z.number(),
    normalResponseTime: z.number(),
    memoryEfficiency: z.number(),
    errorRate: z.number(),
    therapeuticContinuity: z.number(),
  }),

  currentPerformance: z.object({
    crisisResponseTime: z.number(),
    normalResponseTime: z.number(),
    memoryEfficiency: z.number(),
    errorRate: z.number(),
    therapeuticContinuity: z.number(),
  }),
});

export type PerformanceOptimization = z.infer<typeof PerformanceOptimizationSchema>;

/**
 * Performance Alert System
 */
export const PerformanceAlertSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  severity: z.enum(['info', 'warning', 'error', 'critical', 'emergency']),
  category: z.enum([
    'crisis_response_degraded',
    'memory_leak_detected',
    'webhook_processing_slow',
    'therapeutic_session_impacted',
    'emergency_access_compromised',
    'graceful_degradation_triggered',
    'performance_threshold_exceeded'
  ]),

  details: z.object({
    metric: z.string(),
    currentValue: z.number(),
    thresholdValue: z.number(),
    trend: z.enum(['improving', 'stable', 'degrading', 'critical']),
    duration: z.number(), // How long this condition has persisted
  }),

  impact: z.object({
    crisisResponseAffected: z.boolean(),
    therapeuticContinuityAffected: z.boolean(),
    userExperienceAffected: z.boolean(),
    securityAffected: z.boolean(),
    accessibilityAffected: z.boolean(),
  }),

  autoMitigation: z.object({
    applied: z.boolean(),
    strategy: z.string().optional(),
    effectiveness: z.enum(['pending', 'effective', 'partial', 'ineffective']).optional(),
  }),

  recommendations: z.array(z.string()),
  acknowledged: z.boolean().default(false),
  resolved: z.boolean().default(false),
});

export type PerformanceAlert = z.infer<typeof PerformanceAlertSchema>;

/**
 * Performance Monitoring Configuration
 */
export interface PerformanceMonitoringConfig {
  enabled: boolean;
  crisisMonitoring: boolean;
  therapeuticImpactTracking: boolean;
  memoryMonitoring: boolean;
  realTimeDashboard: boolean;
  alerting: boolean;

  thresholds: {
    crisisResponseMs: number;
    normalResponseMs: number;
    warningThresholdMs: number;
    criticalThresholdMs: number;
    memoryPressureMB: number;
    errorRatePercent: number;
  };

  sampling: {
    metricsInterval: number;    // milliseconds
    dashboardRefresh: number;   // milliseconds
    alertCheckInterval: number; // milliseconds
    retentionPeriod: number;    // milliseconds
  };

  reporting: {
    dailySummary: boolean;
    weeklyTrends: boolean;
    monthlyOptimization: boolean;
    crisisAnalysis: boolean;
    therapeuticImpactReport: boolean;
  };
}

/**
 * Default Performance Monitoring Configuration
 */
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceMonitoringConfig = {
  enabled: true,
  crisisMonitoring: true,
  therapeuticImpactTracking: true,
  memoryMonitoring: true,
  realTimeDashboard: true,
  alerting: true,

  thresholds: {
    crisisResponseMs: PERFORMANCE_THRESHOLDS.CRISIS_RESPONSE_MS,
    normalResponseMs: PERFORMANCE_THRESHOLDS.NORMAL_RESPONSE_MS,
    warningThresholdMs: PERFORMANCE_THRESHOLDS.WARNING_THRESHOLD_MS,
    criticalThresholdMs: PERFORMANCE_THRESHOLDS.CRITICAL_THRESHOLD_MS,
    memoryPressureMB: 100,
    errorRatePercent: 5,
  },

  sampling: {
    metricsInterval: 1000,      // 1 second
    dashboardRefresh: 5000,     // 5 seconds
    alertCheckInterval: 2000,   // 2 seconds
    retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
  },

  reporting: {
    dailySummary: true,
    weeklyTrends: true,
    monthlyOptimization: true,
    crisisAnalysis: true,
    therapeuticImpactReport: true,
  },
};

/**
 * Performance Utility Functions
 */
export const calculatePerformanceGrade = (responseTime: number, crisisMode: boolean): 'excellent' | 'good' | 'acceptable' | 'warning' | 'critical' => {
  const threshold = crisisMode ? PERFORMANCE_THRESHOLDS.CRISIS_RESPONSE_MS : PERFORMANCE_THRESHOLDS.NORMAL_RESPONSE_MS;

  if (responseTime <= threshold * 0.5) return 'excellent';
  if (responseTime <= threshold * 0.8) return 'good';
  if (responseTime <= threshold) return 'acceptable';
  if (responseTime <= threshold * 2) return 'warning';
  return 'critical';
};

export const assessTherapeuticImpact = (
  responseTime: number,
  sessionActive: boolean,
  crisisMode: boolean
): TherapeuticSessionImpact['impactAssessment'] => {
  const highImpact = responseTime > PERFORMANCE_THRESHOLDS.WARNING_THRESHOLD_MS;
  const veryHighImpact = responseTime > PERFORMANCE_THRESHOLDS.CRITICAL_THRESHOLD_MS;

  return {
    sessionInterrupted: sessionActive && veryHighImpact,
    userExperienceAffected: highImpact,
    therapeuticFlowDisrupted: sessionActive && highImpact,
    attentionDiverted: sessionActive && responseTime > 500,
    emotionalStateAffected: crisisMode && highImpact,
  };
};