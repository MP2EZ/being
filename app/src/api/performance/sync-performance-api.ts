/**
 * Sync Performance Monitoring API
 *
 * Real-time performance monitoring for payment-aware sync operations
 * - Crisis response time tracking (<200ms requirement)
 * - SLA compliance monitoring and alerting
 * - Performance optimization recommendations
 * - Resource usage tracking by subscription tier
 */

import { z } from 'zod';
import type { SubscriptionTier } from "../../types/payment-canonical";
import type { SyncPriority } from '../sync/payment-sync-context-api';

/**
 * Performance Metric Types
 */
export const PerformanceMetricSchema = z.object({
  metricId: z.string().uuid(),
  operationId: z.string().uuid(),
  userId: z.string(),

  // Operation context
  operationContext: z.object({
    type: z.enum(['create', 'update', 'delete', 'fetch', 'batch']),
    entityType: z.string(),
    priority: z.number().min(1).max(10),
    dataSize: z.number().min(0), // bytes
    isCrisisRelated: z.boolean(),
    subscriptionTier: z.enum(['trial', 'basic', 'premium', 'grace_period'])
  }),

  // Timing metrics
  timing: z.object({
    requestTime: z.string(),
    responseTime: z.string(),
    totalDuration: z.number().min(0), // milliseconds
    queueWaitTime: z.number().min(0),
    processingTime: z.number().min(0),
    networkLatency: z.number().min(0),
    serverProcessingTime: z.number().min(0)
  }),

  // Performance indicators
  performance: z.object({
    crisisResponseCompliant: z.boolean(), // <200ms for crisis
    slaCompliant: z.boolean(),
    targetResponseTime: z.number().positive(),
    actualResponseTime: z.number().min(0),
    performanceScore: z.number().min(0).max(1), // 0-1 score
    bottleneckDetected: z.boolean(),
    bottleneckType: z.enum(['network', 'queue', 'processing', 'database', 'encryption']).optional()
  }),

  // Resource usage
  resourceUsage: z.object({
    cpuUsage: z.number().min(0).max(1), // 0-1
    memoryUsage: z.number().min(0), // bytes
    networkBandwidth: z.number().min(0), // bytes/second
    diskIO: z.number().min(0), // bytes/second
    encryptionOverhead: z.number().min(0) // milliseconds
  }),

  // Error tracking
  errors: z.array(z.object({
    errorCode: z.string(),
    errorType: z.enum(['timeout', 'network', 'validation', 'processing', 'authorization']),
    errorMessage: z.string(),
    recoverable: z.boolean(),
    retryAttempts: z.number().min(0)
  })).default([]),

  recordedAt: z.string()
});

export type PerformanceMetric = z.infer<typeof PerformanceMetricSchema>;

/**
 * SLA Compliance Status
 */
export const SLAComplianceStatusSchema = z.object({
  slaId: z.string(),
  monitoringPeriod: z.object({
    startTime: z.string(),
    endTime: z.string(),
    duration: z.number().positive() // milliseconds
  }),

  // Crisis response SLA
  crisisResponseSLA: z.object({
    targetResponseTime: z.number().default(200), // ms
    actualAverageResponseTime: z.number().min(0),
    compliancePercentage: z.number().min(0).max(1),
    violations: z.number().min(0),
    lastViolation: z.string().optional(),
    consececutiveViolations: z.number().min(0)
  }),

  // General sync SLA by tier
  tierSLA: z.record(z.enum(['trial', 'basic', 'premium', 'grace_period']), z.object({
    targetResponseTime: z.number().positive(),
    actualAverageResponseTime: z.number().min(0),
    compliancePercentage: z.number().min(0).max(1),
    throughput: z.number().min(0), // operations per second
    errorRate: z.number().min(0).max(1)
  })),

  // Priority level SLA
  prioritySLA: z.record(z.string(), z.object({
    priorityLevel: z.number().min(1).max(10),
    targetResponseTime: z.number().positive(),
    actualAverageResponseTime: z.number().min(0),
    compliancePercentage: z.number().min(0).max(1)
  })),

  // Overall system health
  systemHealth: z.object({
    overallComplianceScore: z.number().min(0).max(1),
    availabilityPercentage: z.number().min(0).max(1),
    performanceTrend: z.enum(['improving', 'stable', 'degrading']),
    alertLevel: z.enum(['green', 'yellow', 'orange', 'red'])
  }),

  lastUpdated: z.string()
});

export type SLAComplianceStatus = z.infer<typeof SLAComplianceStatusSchema>;

/**
 * Performance Optimization Recommendation
 */
export const PerformanceOptimizationSchema = z.object({
  recommendationId: z.string().uuid(),

  // Analysis context
  analysisContext: z.object({
    analyzedPeriod: z.string(),
    operationsAnalyzed: z.number().min(0),
    subscriptionTier: z.enum(['trial', 'basic', 'premium', 'grace_period']).optional(),
    primaryBottleneck: z.enum(['network', 'queue', 'processing', 'database', 'encryption'])
  }),

  // Recommendations
  recommendations: z.array(z.object({
    category: z.enum([
      'queue_optimization',
      'caching_strategy',
      'network_optimization',
      'encryption_optimization',
      'database_optimization',
      'resource_allocation',
      'tier_upgrade'
    ]),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    description: z.string(),
    expectedImprovement: z.object({
      responseTimeReduction: z.number().min(0), // milliseconds
      throughputIncrease: z.number().min(0), // percentage
      errorRateReduction: z.number().min(0), // percentage
      costImpact: z.enum(['none', 'low', 'medium', 'high'])
    }),
    implementationComplexity: z.enum(['simple', 'moderate', 'complex']),
    estimatedImplementationTime: z.number().positive() // hours
  })),

  // Tier-specific recommendations
  tierSpecificRecommendations: z.object({
    upgradeRecommendation: z.object({
      recommended: z.boolean(),
      targetTier: z.enum(['trial', 'basic', 'premium', 'grace_period']).optional(),
      performanceBenefits: z.array(z.string()).default([]),
      costBenefit: z.string().optional()
    }).optional(),

    resourceOptimization: z.object({
      cacheOptimization: z.boolean(),
      batchingOptimization: z.boolean(),
      priorityQueueOptimization: z.boolean(),
      encryptionOptimization: z.boolean()
    })
  }),

  generatedAt: z.string()
});

export type PerformanceOptimization = z.infer<typeof PerformanceOptimizationSchema>;

/**
 * Real-time Performance Dashboard Data
 */
export const PerformanceDashboardSchema = z.object({
  dashboardId: z.string(),
  lastUpdated: z.string(),

  // Real-time metrics
  realTimeMetrics: z.object({
    currentActiveOperations: z.number().min(0),
    operationsPerSecond: z.number().min(0),
    averageResponseTime: z.number().min(0),
    errorRate: z.number().min(0).max(1),
    queueLength: z.number().min(0)
  }),

  // Crisis response monitoring
  crisisResponseMonitoring: z.object({
    crisisOperationsInLast24h: z.number().min(0),
    averageCrisisResponseTime: z.number().min(0),
    crisisResponseCompliance: z.number().min(0).max(1),
    currentCrisisOperations: z.number().min(0),
    lastCrisisResponseTime: z.number().min(0).optional()
  }),

  // Tier performance breakdown
  tierPerformance: z.record(z.enum(['trial', 'basic', 'premium', 'grace_period']), z.object({
    activeUsers: z.number().min(0),
    operationsPerSecond: z.number().min(0),
    averageResponseTime: z.number().min(0),
    errorRate: z.number().min(0).max(1),
    slaCompliance: z.number().min(0).max(1)
  })),

  // System resource utilization
  systemResources: z.object({
    cpuUtilization: z.number().min(0).max(1),
    memoryUtilization: z.number().min(0).max(1),
    networkUtilization: z.number().min(0).max(1),
    diskUtilization: z.number().min(0).max(1),
    queueCapacityUtilization: z.number().min(0).max(1)
  }),

  // Alerts and warnings
  alerts: z.array(z.object({
    alertId: z.string(),
    severity: z.enum(['info', 'warning', 'critical']),
    category: z.enum(['response_time', 'error_rate', 'resource_usage', 'sla_violation', 'crisis_compliance']),
    message: z.string(),
    triggeredAt: z.string(),
    resolved: z.boolean(),
    resolvedAt: z.string().optional()
  })),

  // Trends and predictions
  trends: z.object({
    responseTimeTrend: z.enum(['improving', 'stable', 'degrading']),
    throughputTrend: z.enum(['increasing', 'stable', 'decreasing']),
    errorRateTrend: z.enum(['improving', 'stable', 'worsening']),
    predictedPeakTime: z.string().optional(),
    capacityForecast: z.enum(['sufficient', 'concerning', 'critical'])
  })
});

export type PerformanceDashboard = z.infer<typeof PerformanceDashboardSchema>;

/**
 * Sync Performance API Class
 */
export class SyncPerformanceAPI {
  private baseUrl: string;
  private apiKey: string;
  private defaultTimeout: number;

  constructor(config: {
    baseUrl: string;
    apiKey: string;
    defaultTimeout?: number;
  }) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.defaultTimeout = config.defaultTimeout || 5000;
  }

  /**
   * Record performance metric for sync operation
   */
  async recordPerformanceMetric(metric: PerformanceMetric): Promise<{
    recorded: boolean;
    metricId: string;
    slaCompliant: boolean;
    performanceScore: number;
    alertsTriggered: string[];
  }> {
    try {
      const validatedMetric = PerformanceMetricSchema.parse(metric);

      const response = await this.makeRequest('POST', '/performance/metrics', validatedMetric);
      return response;
    } catch (error) {
      throw new Error(`Performance metric recording failed: ${error}`);
    }
  }

  /**
   * Get real-time performance dashboard
   */
  async getPerformanceDashboard(): Promise<PerformanceDashboard> {
    try {
      const response = await this.makeRequest('GET', '/performance/dashboard');
      return PerformanceDashboardSchema.parse(response);
    } catch (error) {
      throw new Error(`Performance dashboard query failed: ${error}`);
    }
  }

  /**
   * Get SLA compliance status
   */
  async getSLAComplianceStatus(
    timeframe: '1h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<SLAComplianceStatus> {
    try {
      const response = await this.makeRequest('GET', '/performance/sla-compliance', {
        params: { timeframe }
      });
      return SLAComplianceStatusSchema.parse(response);
    } catch (error) {
      throw new Error(`SLA compliance status query failed: ${error}`);
    }
  }

  /**
   * Get performance optimization recommendations
   */
  async getPerformanceOptimizations(
    subscriptionTier?: SubscriptionTier,
    analysisDepth: 'basic' | 'detailed' | 'comprehensive' = 'detailed'
  ): Promise<PerformanceOptimization> {
    try {
      const response = await this.makeRequest('POST', '/performance/optimizations', {
        subscriptionTier,
        analysisDepth,
        requestedAt: new Date().toISOString()
      });
      return PerformanceOptimizationSchema.parse(response);
    } catch (error) {
      throw new Error(`Performance optimization query failed: ${error}`);
    }
  }

  /**
   * Get crisis response time analytics
   */
  async getCrisisResponseAnalytics(
    timeframe: '1h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<{
    totalCrisisOperations: number;
    averageResponseTime: number;
    compliancePercentage: number;
    violations: Array<{
      operationId: string;
      responseTime: number;
      timestamp: string;
      crisisLevel: string;
    }>;
    responseTimeDistribution: {
      under50ms: number;
      under100ms: number;
      under200ms: number;
      over200ms: number;
    };
    trends: {
      improving: boolean;
      weekOverWeekChange: number;
      monthOverMonthChange: number;
    };
  }> {
    try {
      const response = await this.makeRequest('GET', '/performance/crisis-analytics', {
        params: { timeframe }
      });
      return response;
    } catch (error) {
      throw new Error(`Crisis response analytics query failed: ${error}`);
    }
  }

  /**
   * Get tier-specific performance metrics
   */
  async getTierPerformanceMetrics(
    tier: SubscriptionTier,
    timeframe: '1h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<{
    tier: SubscriptionTier;
    metrics: {
      totalOperations: number;
      averageResponseTime: number;
      p95ResponseTime: number;
      p99ResponseTime: number;
      throughput: number;
      errorRate: number;
      slaCompliance: number;
    };
    comparison: {
      comparedToAverage: {
        responseTime: number; // percentage difference
        throughput: number;
        errorRate: number;
      };
      tierRanking: number; // 1-4 ranking among tiers
    };
    recommendations: string[];
  }> {
    try {
      const response = await this.makeRequest('GET', `/performance/tiers/${tier}`, {
        params: { timeframe }
      });
      return response;
    } catch (error) {
      throw new Error(`Tier performance metrics query failed: ${error}`);
    }
  }

  /**
   * Monitor performance in real-time
   */
  async subscribeToPerformanceUpdates(
    callback: (update: PerformanceDashboard) => void,
    updateInterval: number = 5000 // milliseconds
  ): Promise<() => void> {
    try {
      const eventSource = new EventSource(
        `${this.baseUrl}/performance/real-time?interval=${updateInterval}`
      );

      eventSource.onmessage = (event) => {
        try {
          const dashboard = PerformanceDashboardSchema.parse(JSON.parse(event.data));
          callback(dashboard);
        } catch (error) {
          console.error('Performance update parsing failed:', error);
        }
      };

      // Return cleanup function
      return () => {
        eventSource.close();
      };
    } catch (error) {
      throw new Error(`Performance monitoring subscription failed: ${error}`);
    }
  }

  /**
   * Create performance alert
   */
  async createPerformanceAlert(
    alertConfig: {
      name: string;
      metric: 'response_time' | 'error_rate' | 'throughput' | 'crisis_compliance';
      threshold: number;
      condition: 'above' | 'below';
      tier?: SubscriptionTier;
      priority?: SyncPriority;
      notificationMethod: 'email' | 'webhook' | 'both';
    }
  ): Promise<{
    alertId: string;
    created: boolean;
    validated: boolean;
    activeMonitoring: boolean;
  }> {
    try {
      const response = await this.makeRequest('POST', '/performance/alerts', {
        ...alertConfig,
        createdAt: new Date().toISOString()
      });
      return response;
    } catch (error) {
      throw new Error(`Performance alert creation failed: ${error}`);
    }
  }

  /**
   * Get performance report
   */
  async generatePerformanceReport(
    reportConfig: {
      timeframe: '24h' | '7d' | '30d' | '90d';
      includeRecommendations: boolean;
      includeTierBreakdown: boolean;
      includeCrisisAnalysis: boolean;
      format: 'json' | 'pdf' | 'csv';
    }
  ): Promise<{
    reportId: string;
    generated: boolean;
    downloadUrl: string;
    expiresAt: string;
    reportSize: number;
  }> {
    try {
      const response = await this.makeRequest('POST', '/performance/reports', {
        ...reportConfig,
        requestedAt: new Date().toISOString()
      });
      return response;
    } catch (error) {
      throw new Error(`Performance report generation failed: ${error}`);
    }
  }

  /**
   * Validate crisis response time compliance
   */
  async validateCrisisCompliance(
    operationId: string,
    actualResponseTime: number,
    crisisLevel: string
  ): Promise<{
    compliant: boolean;
    targetResponseTime: number;
    actualResponseTime: number;
    violationSeverity: 'none' | 'minor' | 'major' | 'critical';
    escalationRequired: boolean;
    recommendedActions: string[];
  }> {
    try {
      const response = await this.makeRequest('POST', '/performance/crisis-compliance', {
        operationId,
        actualResponseTime,
        crisisLevel,
        validatedAt: new Date().toISOString()
      });
      return response;
    } catch (error) {
      throw new Error(`Crisis compliance validation failed: ${error}`);
    }
  }

  /**
   * Private helper methods
   */
  private async makeRequest(method: string, endpoint: string, data?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'X-Client-Version': '1.0.0',
      'X-Request-ID': crypto.randomUUID(),
      'X-Performance-Monitoring': 'true'
    };

    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : null,
      signal: AbortSignal.timeout(this.defaultTimeout)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

/**
 * Performance SLA Targets by Priority
 */
export const PERFORMANCE_SLA_TARGETS: Record<SyncPriority, number> = {
  10: 200,   // Crisis Emergency - 200ms
  9: 300,    // Emergency High - 300ms
  8: 500,    // Emergency Low - 500ms
  7: 1000,   // Critical - 1s
  6: 2000,   // Urgent - 2s
  5: 3000,   // High - 3s
  4: 5000,   // Elevated - 5s
  3: 10000,  // Normal - 10s
  2: 15000,  // Low - 15s
  1: 30000   // Background - 30s
};

/**
 * Performance Tier Expectations
 */
export const TIER_PERFORMANCE_EXPECTATIONS = {
  trial: {
    averageResponseTime: 5000, // ms
    maxConcurrentOperations: 2,
    priorityQueueAccess: false
  },
  basic: {
    averageResponseTime: 2000, // ms
    maxConcurrentOperations: 5,
    priorityQueueAccess: true
  },
  premium: {
    averageResponseTime: 1000, // ms
    maxConcurrentOperations: 10,
    priorityQueueAccess: true
  },
  grace_period: {
    averageResponseTime: 10000, // ms
    maxConcurrentOperations: 1,
    priorityQueueAccess: false
  }
} as const;

export default SyncPerformanceAPI;