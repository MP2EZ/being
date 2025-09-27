/**
 * P0-CLOUD: Performance Monitoring API
 *
 * Real-time performance tracking and SLA compliance monitoring
 * - Adaptive batching with subscription tier resource allocation
 * - Network-aware optimization with crisis override capabilities
 * - Memory-efficient patterns for mobile device constraints
 * - Real-time performance monitoring with violation detection
 * - Intelligent resource allocation with therapeutic priority
 */

import { z } from 'zod';
import type { SubscriptionTier } from "../../types/payment-canonical";

/**
 * Performance Metrics Schema
 */
export const PerformanceMetricsSchema = z.object({
  metricsId: z.string().uuid(),
  userId: z.string(),
  deviceId: z.string(),
  subscriptionTier: z.enum(['trial', 'basic', 'premium', 'grace_period']),

  // Time window for metrics
  timeWindow: z.object({
    startTime: z.string(),
    endTime: z.string(),
    duration: z.number().positive() // milliseconds
  }),

  // System performance metrics
  systemMetrics: z.object({
    // CPU and processing
    cpuUtilization: z.object({
      average: z.number().min(0).max(1),
      peak: z.number().min(0).max(1),
      therapeutic_operations: z.number().min(0).max(1),
      background_operations: z.number().min(0).max(1)
    }),

    // Memory usage
    memoryUtilization: z.object({
      current: z.number().positive(), // bytes
      peak: z.number().positive(), // bytes
      allocated: z.number().positive(), // bytes
      available: z.number().positive(), // bytes
      therapeutic_data: z.number().positive(), // bytes
      cache_usage: z.number().positive() // bytes
    }),

    // Network performance
    networkMetrics: z.object({
      uploadBandwidth: z.number().min(0), // bytes/sec
      downloadBandwidth: z.number().min(0), // bytes/sec
      latency: z.number().min(0), // milliseconds
      packetLoss: z.number().min(0).max(1),
      networkType: z.enum(['wifi', 'cellular', 'unknown']),
      signalStrength: z.number().min(0).max(1).optional()
    }),

    // Storage performance
    storageMetrics: z.object({
      totalSpace: z.number().positive(), // bytes
      availableSpace: z.number().positive(), // bytes
      usedSpace: z.number().positive(), // bytes
      readSpeed: z.number().min(0), // bytes/sec
      writeSpeed: z.number().min(0), // bytes/sec
      encryptionOverhead: z.number().min(0) // percentage
    })
  }),

  // Orchestration performance
  orchestrationMetrics: z.object({
    // Queue performance
    queueMetrics: z.object({
      averageQueueTime: z.number().min(0), // milliseconds
      maxQueueTime: z.number().min(0), // milliseconds
      queueLength: z.number().min(0),
      processingRate: z.number().min(0), // operations/sec
      throughput: z.number().min(0) // operations/sec
    }),

    // Sync performance
    syncMetrics: z.object({
      syncLatency: z.number().min(0), // milliseconds
      syncThroughput: z.number().min(0), // bytes/sec
      conflictResolutionTime: z.number().min(0), // milliseconds
      crossDeviceLatency: z.number().min(0), // milliseconds
      realTimeSyncDelay: z.number().min(0) // milliseconds
    }),

    // Crisis response metrics
    crisisMetrics: z.object({
      crisisResponseTime: z.number().min(0), // milliseconds
      crisisOverrideTime: z.number().min(0), // milliseconds
      emergencyEscalationTime: z.number().min(0), // milliseconds
      safetyProtocolActivationTime: z.number().min(0) // milliseconds
    })
  }),

  // Therapeutic performance
  therapeuticMetrics: z.object({
    // Session performance
    sessionMetrics: z.object({
      sessionStartTime: z.number().min(0), // milliseconds
      sessionTransitionTime: z.number().min(0), // milliseconds
      therapeuticContinuityMaintained: z.boolean(),
      sessionHandoffTime: z.number().min(0).optional() // milliseconds
    }),

    // Assessment performance
    assessmentMetrics: z.object({
      phq9LoadTime: z.number().min(0), // milliseconds
      gad7LoadTime: z.number().min(0), // milliseconds
      scoringCalculationTime: z.number().min(0), // milliseconds
      resultsSaveTime: z.number().min(0), // milliseconds
      assessmentAccuracyValidation: z.boolean()
    }),

    // User experience metrics
    uxMetrics: z.object({
      appLaunchTime: z.number().min(0), // milliseconds
      screenTransitionTime: z.number().min(0), // milliseconds
      animationFrameRate: z.number().min(0).max(120), // FPS
      touchResponseTime: z.number().min(0), // milliseconds
      crashFrequency: z.number().min(0) // crashes per hour
    })
  }),

  // SLA compliance tracking
  slaCompliance: z.object({
    // Latency compliance
    latencyCompliance: z.object({
      target: z.number().positive(),
      actual: z.number().min(0),
      compliant: z.boolean(),
      violationCount: z.number().min(0),
      compliancePercentage: z.number().min(0).max(1)
    }),

    // Throughput compliance
    throughputCompliance: z.object({
      target: z.number().positive(),
      actual: z.number().min(0),
      compliant: z.boolean(),
      violationCount: z.number().min(0),
      compliancePercentage: z.number().min(0).max(1)
    }),

    // Availability compliance
    availabilityCompliance: z.object({
      target: z.number().min(0).max(1),
      actual: z.number().min(0).max(1),
      compliant: z.boolean(),
      downtime: z.number().min(0), // milliseconds
      uptime: z.number().min(0) // milliseconds
    }),

    // Error rate compliance
    errorRateCompliance: z.object({
      target: z.number().min(0).max(1),
      actual: z.number().min(0).max(1),
      compliant: z.boolean(),
      errorCount: z.number().min(0),
      totalOperations: z.number().min(0)
    })
  }),

  // Performance violations
  violations: z.array(z.object({
    violationId: z.string().uuid(),
    violationType: z.enum([
      'latency_violation',
      'throughput_degradation',
      'memory_leak',
      'cpu_spike',
      'network_timeout',
      'crisis_response_delay',
      'therapeutic_continuity_break',
      'sla_breach'
    ]),
    severity: z.enum(['info', 'warning', 'minor', 'major', 'critical', 'emergency']),
    threshold: z.number(),
    actualValue: z.number(),
    impact: z.enum(['none', 'low', 'medium', 'high', 'critical']),
    therapeuticImpact: z.boolean(),
    crisisSafetyImpact: z.boolean(),
    detectedAt: z.string(),
    resolvedAt: z.string().optional()
  })),

  collectedAt: z.string()
});

export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;

/**
 * Adaptive Batching Configuration Schema
 */
export const AdaptiveBatchingConfigSchema = z.object({
  configId: z.string().uuid(),
  subscriptionTier: z.enum(['trial', 'basic', 'premium', 'grace_period']),

  // Batching parameters
  batchingConfig: z.object({
    // Batch size configuration
    minBatchSize: z.number().positive(),
    maxBatchSize: z.number().positive(),
    optimalBatchSize: z.number().positive(),
    adaptiveSizeAdjustment: z.boolean(),

    // Timing configuration
    maxBatchWaitTime: z.number().positive(), // milliseconds
    flushInterval: z.number().positive(), // milliseconds
    priorityFlushTime: z.number().positive(), // milliseconds for high priority

    // Resource allocation
    resourceAllocation: z.object({
      cpuQuota: z.number().min(0).max(1),
      memoryQuota: z.number().positive(), // bytes
      networkBandwidth: z.number().positive(), // bytes/sec
      storageIOQuota: z.number().positive() // IOPS
    })
  }),

  // Crisis override settings
  crisisOverride: z.object({
    enableCrisisOverride: z.boolean(),
    crisisFlushTime: z.number().max(200), // <200ms guarantee
    bypassBatching: z.boolean(),
    dedicatedResources: z.boolean(),
    emergencyResourceAllocation: z.number().min(0).max(1)
  }),

  // Network awareness
  networkAwareness: z.object({
    enableNetworkAdaptation: z.boolean(),
    wifiOptimization: z.object({
      batchSizeMultiplier: z.number().positive(),
      flushIntervalMultiplier: z.number().positive()
    }),
    cellularOptimization: z.object({
      batchSizeMultiplier: z.number().positive(),
      flushIntervalMultiplier: z.number().positive(),
      compressionEnabled: z.boolean()
    }),
    lowBandwidthMode: z.object({
      enabled: z.boolean(),
      threshold: z.number().positive(), // bytes/sec
      maxBatchSize: z.number().positive(),
      compressionRequired: z.boolean()
    })
  }),

  // Therapeutic priority handling
  therapeuticPriority: z.object({
    enableTherapeuticPriority: z.boolean(),
    sessionDataPriority: z.number().min(1).max(10),
    assessmentDataPriority: z.number().min(1).max(10),
    crisisDataPriority: z.number().min(1).max(10),
    progressDataPriority: z.number().min(1).max(10)
  }),

  updatedAt: z.string()
});

export type AdaptiveBatchingConfig = z.infer<typeof AdaptiveBatchingConfigSchema>;

/**
 * Resource Allocation Schema
 */
export const ResourceAllocationSchema = z.object({
  allocationId: z.string().uuid(),
  userId: z.string(),
  deviceId: z.string(),
  subscriptionTier: z.enum(['trial', 'basic', 'premium', 'grace_period']),

  // Current allocation
  currentAllocation: z.object({
    cpu: z.object({
      allocated: z.number().min(0).max(1), // percentage
      used: z.number().min(0).max(1), // percentage
      available: z.number().min(0).max(1), // percentage
      therapeutic_reserved: z.number().min(0).max(1) // percentage
    }),
    memory: z.object({
      allocated: z.number().positive(), // bytes
      used: z.number().positive(), // bytes
      available: z.number().positive(), // bytes
      therapeutic_reserved: z.number().positive() // bytes
    }),
    network: z.object({
      allocated: z.number().positive(), // bytes/sec
      used: z.number().positive(), // bytes/sec
      available: z.number().positive(), // bytes/sec
      therapeutic_reserved: z.number().positive() // bytes/sec
    }),
    storage: z.object({
      allocated: z.number().positive(), // bytes
      used: z.number().positive(), // bytes
      available: z.number().positive(), // bytes
      therapeutic_reserved: z.number().positive() // bytes
    })
  }),

  // Tier-based limits
  tierLimits: z.object({
    maxConcurrentOperations: z.number().positive(),
    maxMemoryUsage: z.number().positive(), // bytes
    maxNetworkBandwidth: z.number().positive(), // bytes/sec
    maxStorageUsage: z.number().positive(), // bytes
    maxCPUTime: z.number().positive(), // milliseconds per operation
    crisisResourceOverride: z.boolean()
  }),

  // Intelligent allocation
  intelligentAllocation: z.object({
    enabled: z.boolean(),
    adaptiveScaling: z.boolean(),
    therapeuticPriorityWeight: z.number().min(0).max(1),
    performanceOptimization: z.boolean(),
    predictiveAllocation: z.boolean()
  }),

  // Therapeutic priority allocation
  therapeuticAllocation: z.object({
    sessionOperations: z.object({
      cpuPriority: z.number().min(1).max(10),
      memoryReservation: z.number().positive(), // bytes
      networkPriority: z.number().min(1).max(10)
    }),
    assessmentOperations: z.object({
      cpuPriority: z.number().min(1).max(10),
      memoryReservation: z.number().positive(), // bytes
      networkPriority: z.number().min(1).max(10)
    }),
    crisisOperations: z.object({
      cpuPriority: z.number().min(1).max(10),
      memoryReservation: z.number().positive(), // bytes
      networkPriority: z.number().min(1).max(10),
      emergencyOverride: z.boolean()
    })
  }),

  allocatedAt: z.string(),
  updatedAt: z.string()
});

export type ResourceAllocation = z.infer<typeof ResourceAllocationSchema>;

/**
 * Performance Monitoring API Class
 */
export class PerformanceMonitoringAPI {
  private baseUrl: string;
  private apiKey: string;
  private defaultTimeout: number;

  // Real-time monitoring
  private metricsCollectionInterval: NodeJS.Timeout | null = null;
  private performanceObserver: PerformanceObserver | null = null;

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
   * Start real-time performance monitoring
   */
  async startPerformanceMonitoring(
    userId: string,
    deviceId: string,
    subscriptionTier: SubscriptionTier,
    monitoringConfig: {
      collectionInterval: number; // milliseconds
      enableRealTimeAlerts: boolean;
      alertThresholds: {
        latency: number;
        throughput: number;
        errorRate: number;
        memoryUsage: number;
      };
      therapeuticMonitoring: boolean;
      crisisMonitoring: boolean;
    }
  ): Promise<{
    monitoringStarted: boolean;
    monitoringId: string;
    realTimeAlertsEnabled: boolean;
    collectionInterval: number;
    metricsEndpoints: string[];
    performanceBaseline: PerformanceMetrics;
  }> {
    try {
      const response = await this.makeRequest('POST', '/performance/monitoring/start', {
        userId,
        deviceId,
        subscriptionTier,
        monitoringConfig,
        startedAt: new Date().toISOString()
      });

      // Start client-side monitoring
      this.startClientSideMonitoring(monitoringConfig.collectionInterval);

      return response;
    } catch (error) {
      throw new Error(`Performance monitoring start failed: ${error}`);
    }
  }

  /**
   * Collect and report performance metrics
   */
  async reportPerformanceMetrics(
    userId: string,
    deviceId: string,
    metrics: PerformanceMetrics
  ): Promise<{
    metricsRecorded: boolean;
    violationsDetected: number;
    slaCompliant: boolean;
    alertsTriggered: string[];
    recommendedOptimizations: string[];
    performanceScore: number;
  }> {
    try {
      const validatedMetrics = PerformanceMetricsSchema.parse(metrics);

      const response = await this.makeRequest('POST', '/performance/metrics/report', {
        userId,
        deviceId,
        metrics: validatedMetrics,
        reportedAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Performance metrics reporting failed: ${error}`);
    }
  }

  /**
   * Configure adaptive batching with tier-aware optimization
   */
  async configureAdaptiveBatching(
    subscriptionTier: SubscriptionTier,
    config: Partial<AdaptiveBatchingConfig>
  ): Promise<{
    configured: boolean;
    configId: string;
    batchingOptimized: boolean;
    resourceAllocationUpdated: boolean;
    crisisOverrideConfigured: boolean;
    networkOptimizationEnabled: boolean;
    therapeuticPriorityConfigured: boolean;
  }> {
    try {
      const response = await this.makeRequest('POST', '/performance/batching/configure', {
        subscriptionTier,
        configuration: config,
        configuredAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Adaptive batching configuration failed: ${error}`);
    }
  }

  /**
   * Enable network-aware optimization with crisis override
   */
  async enableNetworkOptimization(
    deviceId: string,
    networkContext: {
      networkType: 'wifi' | 'cellular' | 'unknown';
      bandwidth: number; // bytes/sec
      latency: number; // milliseconds
      signalStrength?: number; // 0-1
      dataLimited: boolean;
    },
    crisisOverrideEnabled: boolean = true
  ): Promise<{
    optimizationEnabled: boolean;
    networkProfileApplied: string;
    batchingConfigUpdated: boolean;
    compressionEnabled: boolean;
    crisisOverrideConfigured: boolean;
    estimatedPerformanceImprovement: number;
  }> {
    try {
      const response = await this.makeRequest('POST', '/performance/network/optimize', {
        deviceId,
        networkContext,
        crisisOverrideEnabled,
        optimizedAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Network optimization failed: ${error}`);
    }
  }

  /**
   * Monitor memory efficiency for mobile constraints
   */
  async monitorMemoryEfficiency(
    deviceId: string,
    memoryConstraints: {
      totalMemory: number; // bytes
      availableMemory: number; // bytes
      lowMemoryThreshold: number; // bytes
      criticalMemoryThreshold: number; // bytes
    }
  ): Promise<{
    memoryMonitoringActive: boolean;
    currentMemoryUsage: number;
    memoryPressureLevel: 'normal' | 'moderate' | 'high' | 'critical';
    recommendedActions: string[];
    memoryOptimizationsApplied: string[];
    therapeuticDataProtected: boolean;
  }> {
    try {
      const response = await this.makeRequest('POST', '/performance/memory/monitor', {
        deviceId,
        memoryConstraints,
        monitoredAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Memory efficiency monitoring failed: ${error}`);
    }
  }

  /**
   * Implement intelligent resource allocation with therapeutic priority
   */
  async allocateIntelligentResources(
    userId: string,
    deviceId: string,
    subscriptionTier: SubscriptionTier,
    allocationRequest: {
      operationType: 'crisis' | 'therapeutic' | 'assessment' | 'background';
      resourceRequirements: {
        cpu: number;
        memory: number;
        network: number;
        storage: number;
      };
      priority: number; // 1-10
      maxWaitTime: number; // milliseconds
      therapeuticCritical: boolean;
    }
  ): Promise<{
    resourcesAllocated: boolean;
    allocation: ResourceAllocation;
    waitTime: number;
    therapeuticPriorityApplied: boolean;
    crisisOverrideUsed: boolean;
    estimatedCompletionTime: number;
    resourceOptimizationsApplied: string[];
  }> {
    try {
      const response = await this.makeRequest('POST', '/performance/resources/allocate', {
        userId,
        deviceId,
        subscriptionTier,
        allocationRequest,
        allocatedAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Intelligent resource allocation failed: ${error}`);
    }
  }

  /**
   * Detect and handle performance violations in real-time
   */
  async detectPerformanceViolations(
    userId: string,
    deviceId: string,
    realTimeMetrics: {
      currentLatency: number;
      currentThroughput: number;
      currentErrorRate: number;
      currentMemoryUsage: number;
      crisisOperationActive: boolean;
    }
  ): Promise<{
    violationsDetected: number;
    violations: Array<{
      type: string;
      severity: string;
      threshold: number;
      actual: number;
      therapeuticImpact: boolean;
      recommendedAction: string;
    }>;
    immediateActionRequired: boolean;
    crisisEscalationRequired: boolean;
    automaticOptimizationsApplied: string[];
  }> {
    try {
      const response = await this.makeRequest('POST', '/performance/violations/detect', {
        userId,
        deviceId,
        realTimeMetrics,
        detectedAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Performance violation detection failed: ${error}`);
    }
  }

  /**
   * Get comprehensive performance analytics
   */
  async getPerformanceAnalytics(
    userId: string,
    timeframe: '1h' | '24h' | '7d' | '30d',
    includeComparisons: boolean = true
  ): Promise<{
    overallPerformanceScore: number;
    performanceTrends: {
      latencyTrend: number[];
      throughputTrend: number[];
      errorRateTrend: number[];
      slaComplianceTrend: number[];
    };
    subscriptionTierPerformance: {
      tierOptimal: boolean;
      resourceUtilization: number;
      upgradeRecommended: boolean;
      costEfficiency: number;
    };
    therapeuticPerformance: {
      sessionContinuityRate: number;
      assessmentAccuracyRate: number;
      crisisResponseTimes: number[];
      therapeuticDataIntegrity: number;
    };
    devicePerformance: Array<{
      deviceId: string;
      performanceScore: number;
      primaryBottlenecks: string[];
      optimizationOpportunities: string[];
    }>;
    recommendedOptimizations: Array<{
      optimization: string;
      expectedImprovement: number;
      implementationComplexity: string;
      therapeuticImpact: string;
    }>;
  }> {
    try {
      const response = await this.makeRequest('GET', `/performance/analytics/${userId}`, {
        params: { timeframe, includeComparisons }
      });

      return response;
    } catch (error) {
      throw new Error(`Performance analytics query failed: ${error}`);
    }
  }

  /**
   * Optimize performance automatically
   */
  async optimizePerformanceAutomatically(
    userId: string,
    deviceId: string,
    optimizationTargets: {
      prioritizeLatency: boolean;
      prioritizeThroughput: boolean;
      prioritizeMemoryEfficiency: boolean;
      maintainTherapeuticContinuity: boolean;
      respectSubscriptionLimits: boolean;
    }
  ): Promise<{
    optimizationApplied: boolean;
    optimizationsImplemented: string[];
    expectedPerformanceGains: {
      latencyImprovement: number;
      throughputImprovement: number;
      memoryEfficiencyGain: number;
      resourceUtilizationImprovement: number;
    };
    therapeuticContinuityMaintained: boolean;
    subscriptionLimitsRespected: boolean;
    rollbackPossible: boolean;
  }> {
    try {
      const response = await this.makeRequest('POST', '/performance/optimize/automatic', {
        userId,
        deviceId,
        optimizationTargets,
        optimizedAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Automatic performance optimization failed: ${error}`);
    }
  }

  /**
   * Stop performance monitoring
   */
  async stopPerformanceMonitoring(
    monitoringId: string,
    generateReport: boolean = true
  ): Promise<{
    monitoringStopped: boolean;
    finalReport?: PerformanceMetrics;
    monitoringDuration: number;
    totalMetricsCollected: number;
    violationsDetected: number;
    optimizationsApplied: number;
  }> {
    try {
      const response = await this.makeRequest('DELETE', `/performance/monitoring/${monitoringId}`, {
        generateReport,
        stoppedAt: new Date().toISOString()
      });

      // Clean up client-side monitoring
      this.stopClientSideMonitoring();

      return response;
    } catch (error) {
      throw new Error(`Performance monitoring stop failed: ${error}`);
    }
  }

  /**
   * Private helper methods
   */
  private startClientSideMonitoring(interval: number): void {
    // Clean up existing monitoring
    this.stopClientSideMonitoring();

    // Start metrics collection
    this.metricsCollectionInterval = setInterval(() => {
      this.collectClientMetrics();
    }, interval);

    // Start performance observer if available
    if (typeof PerformanceObserver !== 'undefined') {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        this.processPerformanceEntries(entries);
      });

      this.performanceObserver.observe({
        entryTypes: ['measure', 'navigation', 'resource', 'longtask']
      });
    }
  }

  private stopClientSideMonitoring(): void {
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
      this.metricsCollectionInterval = null;
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
  }

  private collectClientMetrics(): void {
    // Collect basic client-side metrics
    if (typeof performance !== 'undefined') {
      const memory = (performance as any).memory;
      if (memory) {
        const memoryMetrics = {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit
        };
        // Send to server if needed
      }
    }
  }

  private processPerformanceEntries(entries: PerformanceEntry[]): void {
    entries.forEach(entry => {
      // Process performance entries for real-time monitoring
      if (entry.entryType === 'longtask' && entry.duration > 50) {
        // Report long tasks that might impact therapeutic UX
        console.warn(`Long task detected: ${entry.duration}ms`);
      }
    });
  }

  private async makeRequest(method: string, endpoint: string, data?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'X-Client-Version': '1.0.0',
      'X-Request-ID': crypto.randomUUID(),
      'X-Performance-Monitor': 'true',
      'X-Therapeutic-Priority': 'enabled'
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
 * Subscription Tier Performance SLA
 */
export const PERFORMANCE_SLA_TARGETS: Record<SubscriptionTier, {
  maxLatency: number; // milliseconds
  minThroughput: number; // operations/sec
  maxErrorRate: number; // percentage (0-1)
  minAvailability: number; // percentage (0-1)
  maxMemoryUsage: number; // bytes
  crisisResponseTime: number; // milliseconds
  therapeuticContinuityTarget: number; // percentage (0-1)
}> = {
  trial: {
    maxLatency: 2000,
    minThroughput: 10,
    maxErrorRate: 0.05,
    minAvailability: 0.95,
    maxMemoryUsage: 100 * 1024 * 1024, // 100MB
    crisisResponseTime: 500, // Relaxed for trial but still responsive
    therapeuticContinuityTarget: 0.90
  },
  basic: {
    maxLatency: 1000,
    minThroughput: 25,
    maxErrorRate: 0.03,
    minAvailability: 0.98,
    maxMemoryUsage: 200 * 1024 * 1024, // 200MB
    crisisResponseTime: 200, // Full crisis guarantee
    therapeuticContinuityTarget: 0.95
  },
  premium: {
    maxLatency: 500,
    minThroughput: 50,
    maxErrorRate: 0.01,
    minAvailability: 0.99,
    maxMemoryUsage: 500 * 1024 * 1024, // 500MB
    crisisResponseTime: 200, // Full crisis guarantee
    therapeuticContinuityTarget: 0.99
  },
  grace_period: {
    maxLatency: 5000,
    minThroughput: 5,
    maxErrorRate: 0.10,
    minAvailability: 0.90,
    maxMemoryUsage: 50 * 1024 * 1024, // 50MB
    crisisResponseTime: 200, // Crisis always guaranteed
    therapeuticContinuityTarget: 0.85
  }
};

export default PerformanceMonitoringAPI;