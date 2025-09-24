/**
 * P0-CLOUD: Sync Orchestration API
 *
 * Central orchestration service for multi-tier priority queue and crisis override
 * - Multi-tier priority queue management with crisis override
 * - Real-time sync coordination with <500ms propagation
 * - Subscription tier-aware resource allocation
 * - Cross-device synchronization with session preservation
 * - Performance monitoring with SLA compliance tracking
 */

import { z } from 'zod';
import type { SubscriptionTier } from '../../types/subscription';
import type { SyncPriority } from '../sync/payment-sync-context-api';
import type { ConflictType, TherapeuticImpact } from '../../store/sync/conflict-resolution-store';

/**
 * Priority Queue Configuration Schema
 */
export const PriorityQueueConfigSchema = z.object({
  queueId: z.string().uuid(),
  name: z.string(),
  tierLevel: z.number().min(1).max(10),

  // Priority handling
  priority: z.object({
    basePriority: z.number().min(1).max(10),
    crisisOverride: z.boolean().default(true),
    therapeuticWeight: z.number().min(0).max(5).default(1),
    subscriptionWeight: z.number().min(0).max(3).default(1),
    latencyWeight: z.number().min(0).max(2).default(1)
  }),

  // Resource allocation
  resources: z.object({
    maxConcurrentOperations: z.number().positive(),
    bandwidthAllocation: z.number().positive(), // bytes/sec
    storageQuota: z.number().positive(), // bytes
    cpuTimeSlice: z.number().positive(), // milliseconds
    networkTimeout: z.number().positive() // milliseconds
  }),

  // Crisis handling
  crisisConfig: z.object({
    enableCrisisOverride: z.boolean().default(true),
    crisisResponseTime: z.number().max(200), // <200ms guarantee
    crisisEscalationDelay: z.number().max(5000), // 5 second max
    preserveTherapeuticContinuity: z.boolean().default(true)
  }),

  // Performance SLA
  sla: z.object({
    maxLatency: z.number().positive(),
    minThroughput: z.number().positive(),
    maxErrorRate: z.number().min(0).max(1),
    availabilityTarget: z.number().min(0.95).max(1)
  }),

  createdAt: z.string(),
  updatedAt: z.string()
});

export type PriorityQueueConfig = z.infer<typeof PriorityQueueConfigSchema>;

/**
 * Orchestration Operation Schema
 */
export const OrchestrationOperationSchema = z.object({
  operationId: z.string().uuid(),
  userId: z.string(),
  deviceId: z.string(),
  sessionId: z.string().optional(),

  // Operation context
  operationType: z.enum([
    'crisis_sync',
    'therapeutic_session_sync',
    'assessment_sync',
    'cross_device_sync',
    'profile_sync',
    'preference_sync',
    'analytics_sync',
    'background_sync'
  ]),

  // Priority configuration
  priority: z.object({
    level: z.number().min(1).max(10),
    isCrisis: z.boolean(),
    therapeuticImpact: z.enum(['none', 'low', 'medium', 'high', 'critical']),
    userFacing: z.boolean(),
    timeouts: z.object({
      maxWaitTime: z.number().positive(),
      executionTimeout: z.number().positive(),
      retryTimeout: z.number().positive()
    })
  }),

  // Subscription context
  subscriptionContext: z.object({
    tier: z.enum(['trial', 'basic', 'premium', 'grace_period']),
    tierSupportsOperation: z.boolean(),
    quotaAvailable: z.boolean(),
    resourceAllocation: z.object({
      cpu: z.number().min(0).max(1),
      memory: z.number().positive(),
      network: z.number().positive(),
      storage: z.number().positive()
    })
  }),

  // Therapeutic context
  therapeuticContext: z.object({
    sessionActive: z.boolean(),
    sessionType: z.enum(['morning', 'midday', 'evening', 'assessment', 'crisis']).optional(),
    preserveContinuity: z.boolean(),
    clinicalDataInvolved: z.boolean(),
    requiresTherapeuticValidation: z.boolean()
  }),

  // Cross-device coordination
  crossDeviceContext: z.object({
    multiDeviceOperation: z.boolean(),
    targetDevices: z.array(z.string()),
    requiresSessionHandoff: z.boolean(),
    coordinationRequired: z.boolean()
  }).optional(),

  // Operation payload
  payload: z.object({
    dataType: z.string(),
    dataSize: z.number().min(0),
    encryptionRequired: z.boolean(),
    compressionEnabled: z.boolean(),
    checksumValidation: z.boolean()
  }),

  // Status tracking
  status: z.enum(['queued', 'processing', 'completed', 'failed', 'canceled', 'crisis_escalated']),
  metrics: z.object({
    queuedAt: z.string(),
    startedAt: z.string().optional(),
    completedAt: z.string().optional(),
    processingTime: z.number().min(0).optional(),
    retryCount: z.number().min(0),
    errorCount: z.number().min(0)
  }),

  // Performance tracking
  performance: z.object({
    latency: z.number().min(0).optional(),
    throughput: z.number().min(0).optional(),
    resourceUsage: z.object({
      cpu: z.number().min(0).max(1),
      memory: z.number().min(0),
      network: z.number().min(0)
    }).optional()
  }),

  createdAt: z.string(),
  updatedAt: z.string()
});

export type OrchestrationOperation = z.infer<typeof OrchestrationOperationSchema>;

/**
 * SLA Monitoring Schema
 */
export const SLAMonitoringSchema = z.object({
  monitoringId: z.string().uuid(),
  subscriptionTier: z.enum(['trial', 'basic', 'premium', 'grace_period']),
  timeWindow: z.string(), // ISO duration

  // Performance metrics
  metrics: z.object({
    totalOperations: z.number().min(0),
    successfulOperations: z.number().min(0),
    failedOperations: z.number().min(0),
    crisisOperations: z.number().min(0),

    // Latency metrics
    averageLatency: z.number().min(0),
    p50Latency: z.number().min(0),
    p95Latency: z.number().min(0),
    p99Latency: z.number().min(0),
    maxLatency: z.number().min(0),

    // Throughput metrics
    operationsPerSecond: z.number().min(0),
    dataTransferRate: z.number().min(0),
    concurrentOperations: z.number().min(0),

    // Error metrics
    errorRate: z.number().min(0).max(1),
    timeoutRate: z.number().min(0).max(1),
    retryRate: z.number().min(0).max(1)
  }),

  // SLA compliance
  slaCompliance: z.object({
    latencyCompliant: z.boolean(),
    throughputCompliant: z.boolean(),
    availabilityCompliant: z.boolean(),
    errorRateCompliant: z.boolean(),
    overallCompliant: z.boolean(),
    complianceScore: z.number().min(0).max(1)
  }),

  // Crisis performance
  crisisMetrics: z.object({
    crisisResponseTime: z.number().min(0),
    crisisSuccessRate: z.number().min(0).max(1),
    crisisEscalations: z.number().min(0),
    emergencyOverrides: z.number().min(0)
  }),

  // Violations and alerts
  violations: z.array(z.object({
    violationType: z.enum(['latency', 'throughput', 'error_rate', 'availability', 'crisis_response']),
    threshold: z.number(),
    actualValue: z.number(),
    severity: z.enum(['warning', 'minor', 'major', 'critical']),
    detectedAt: z.string()
  })),

  generatedAt: z.string()
});

export type SLAMonitoring = z.infer<typeof SLAMonitoringSchema>;

/**
 * Sync Orchestration API Class
 */
export class SyncOrchestrationAPI {
  private baseUrl: string;
  private apiKey: string;
  private defaultTimeout: number;

  // Performance tracking
  private performanceTracker: Map<string, {
    startTime: number;
    operationType: string;
    subscriptionTier: string;
  }> = new Map();

  constructor(config: {
    baseUrl: string;
    apiKey: string;
    defaultTimeout?: number;
  }) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.defaultTimeout = config.defaultTimeout || 10000;
  }

  /**
   * Configure priority queue for subscription tier
   */
  async configurePriorityQueue(
    subscriptionTier: SubscriptionTier,
    config: Partial<PriorityQueueConfig>
  ): Promise<{
    configured: boolean;
    queueId: string;
    tierConfiguration: PriorityQueueConfig;
    resourceAllocation: {
      concurrentOps: number;
      bandwidth: number;
      storage: number;
      cpuTime: number;
    };
    crisisOverrideEnabled: boolean;
  }> {
    try {
      const response = await this.makeRequest('POST', '/orchestration/queue/configure', {
        subscriptionTier,
        configuration: config,
        configuredAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Priority queue configuration failed: ${error}`);
    }
  }

  /**
   * Queue orchestration operation with priority management
   */
  async queueOperation(
    operation: OrchestrationOperation
  ): Promise<{
    queued: boolean;
    operationId: string;
    queuePosition: number;
    estimatedProcessingTime: number;
    crisisOverrideApplied: boolean;
    resourcesAllocated: boolean;
    therapeuticValidationRequired: boolean;
  }> {
    try {
      const validatedOperation = OrchestrationOperationSchema.parse(operation);

      // Track operation start time
      this.performanceTracker.set(operation.operationId, {
        startTime: Date.now(),
        operationType: operation.operationType,
        subscriptionTier: operation.subscriptionContext.tier
      });

      const response = await this.makeRequest('POST', '/orchestration/queue', validatedOperation);
      return response;
    } catch (error) {
      throw new Error(`Operation queuing failed: ${error}`);
    }
  }

  /**
   * Execute crisis override for emergency operations
   */
  async executeCrisisOverride(
    operationId: string,
    crisisLevel: 'emergency' | 'crisis' | 'urgent',
    justification: string
  ): Promise<{
    overrideExecuted: boolean;
    newQueuePosition: number;
    resourcesReallocated: boolean;
    crisisResponseTime: number;
    therapeuticContinuityMaintained: boolean;
    escalationRequired: boolean;
  }> {
    try {
      const response = await this.makeRequest('POST', `/orchestration/crisis-override/${operationId}`, {
        crisisLevel,
        justification,
        overrideAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Crisis override execution failed: ${error}`);
    }
  }

  /**
   * Coordinate real-time sync with <500ms propagation guarantee
   */
  async coordinateRealTimeSync(
    userId: string,
    syncOperations: Array<{
      operationType: string;
      targetDevices: string[];
      payload: any;
      priority: number;
    }>
  ): Promise<{
    coordinated: boolean;
    syncSessionId: string;
    propagationTime: number;
    devicesReached: number;
    conflictsDetected: number;
    therapeuticContinuityMaintained: boolean;
    realTimeGuaranteeMet: boolean; // <500ms
  }> {
    const startTime = Date.now();

    try {
      const response = await this.makeRequest('POST', '/orchestration/real-time-sync', {
        userId,
        syncOperations,
        coordinatedAt: new Date().toISOString(),
        propagationDeadline: 500 // 500ms guarantee
      });

      // Verify propagation time
      const propagationTime = Date.now() - startTime;
      response.propagationTime = propagationTime;
      response.realTimeGuaranteeMet = propagationTime <= 500;

      return response;
    } catch (error) {
      throw new Error(`Real-time sync coordination failed: ${error}`);
    }
  }

  /**
   * Monitor and allocate subscription tier-aware resources
   */
  async allocateSubscriptionResources(
    userId: string,
    subscriptionTier: SubscriptionTier,
    resourceRequirements: {
      cpu: number;
      memory: number;
      network: number;
      storage: number;
      concurrentOps: number;
    }
  ): Promise<{
    allocated: boolean;
    resourcesGranted: typeof resourceRequirements;
    quotaAvailable: boolean;
    tierLimitsRespected: boolean;
    crisisExemptionAvailable: boolean;
    resourceOptimizationApplied: boolean;
  }> {
    try {
      const response = await this.makeRequest('POST', '/orchestration/resources/allocate', {
        userId,
        subscriptionTier,
        resourceRequirements,
        allocatedAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Resource allocation failed: ${error}`);
    }
  }

  /**
   * Manage cross-device synchronization with session preservation
   */
  async manageSessionPreservation(
    sessionId: string,
    fromDeviceId: string,
    toDeviceId: string,
    preservationContext: {
      sessionType: string;
      currentState: any;
      therapeuticData: boolean;
      criticalContinuity: boolean;
    }
  ): Promise<{
    preserved: boolean;
    handoffTime: number; // <2s guarantee
    sessionIntegrityMaintained: boolean;
    therapeuticContinuityPreserved: boolean;
    crossDeviceSyncCompleted: boolean;
    handoffGuaranteeMet: boolean; // <2s
  }> {
    const startTime = Date.now();

    try {
      const response = await this.makeRequest('POST', '/orchestration/session-preservation', {
        sessionId,
        fromDeviceId,
        toDeviceId,
        preservationContext,
        preservedAt: new Date().toISOString(),
        handoffDeadline: 2000 // 2 second guarantee
      });

      // Verify handoff time
      const handoffTime = Date.now() - startTime;
      response.handoffTime = handoffTime;
      response.handoffGuaranteeMet = handoffTime <= 2000;

      return response;
    } catch (error) {
      throw new Error(`Session preservation failed: ${error}`);
    }
  }

  /**
   * Track and monitor SLA compliance
   */
  async monitorSLACompliance(
    subscriptionTier: SubscriptionTier,
    timeWindow: string = 'PT1H' // 1 hour window
  ): Promise<SLAMonitoring> {
    try {
      const response = await this.makeRequest('GET', `/orchestration/sla/monitor/${subscriptionTier}`, {
        params: { timeWindow }
      });

      return SLAMonitoringSchema.parse(response);
    } catch (error) {
      throw new Error(`SLA monitoring failed: ${error}`);
    }
  }

  /**
   * Get operation status with performance metrics
   */
  async getOperationStatus(operationId: string): Promise<{
    operation: OrchestrationOperation;
    currentStatus: string;
    queuePosition: number;
    processingMetrics: {
      startTime?: string;
      processingTime?: number;
      completionTime?: string;
      latency?: number;
      throughput?: number;
    };
    resourceUsage: {
      cpu: number;
      memory: number;
      network: number;
    };
    slaCompliance: {
      latencyCompliant: boolean;
      throughputCompliant: boolean;
      withinSLA: boolean;
    };
    crisisMetrics?: {
      responseTime: number;
      escalationRequired: boolean;
    };
  }> {
    try {
      const response = await this.makeRequest('GET', `/orchestration/operation/${operationId}/status`);

      // Add client-side performance tracking
      const trackedOperation = this.performanceTracker.get(operationId);
      if (trackedOperation) {
        response.processingMetrics = {
          ...response.processingMetrics,
          clientLatency: Date.now() - trackedOperation.startTime
        };
      }

      return response;
    } catch (error) {
      throw new Error(`Operation status query failed: ${error}`);
    }
  }

  /**
   * Cancel operation with resource cleanup
   */
  async cancelOperation(
    operationId: string,
    reason: string,
    preservePartialWork: boolean = true
  ): Promise<{
    canceled: boolean;
    resourcesReleased: boolean;
    partialWorkPreserved: boolean;
    therapeuticContinuityMaintained: boolean;
    queuePositionUpdated: boolean;
  }> {
    try {
      const response = await this.makeRequest('DELETE', `/orchestration/operation/${operationId}`, {
        reason,
        preservePartialWork,
        canceledAt: new Date().toISOString()
      });

      // Clean up performance tracking
      this.performanceTracker.delete(operationId);

      return response;
    } catch (error) {
      throw new Error(`Operation cancellation failed: ${error}`);
    }
  }

  /**
   * Get orchestration analytics and insights
   */
  async getOrchestrationAnalytics(
    userId: string,
    timeframe: '1h' | '24h' | '7d' | '30d'
  ): Promise<{
    totalOperations: number;
    successRate: number;
    averageLatency: number;
    crisisOperations: number;
    subscriptionTierMetrics: {
      tier: string;
      operationCount: number;
      resourceUtilization: number;
      slaCompliance: number;
    };
    crossDeviceSessions: number;
    therapeuticSessionsPreserved: number;
    performanceInsights: {
      bottlenecks: string[];
      optimizationSuggestions: string[];
      resourceUsagePatterns: any[];
    };
  }> {
    try {
      const response = await this.makeRequest('GET', `/orchestration/analytics/${userId}`, {
        params: { timeframe }
      });

      return response;
    } catch (error) {
      throw new Error(`Orchestration analytics query failed: ${error}`);
    }
  }

  /**
   * Optimize orchestration performance
   */
  async optimizePerformance(
    userId: string,
    optimizationTargets: {
      prioritizeLatency: boolean;
      prioritizeThroughput: boolean;
      optimizeResourceUsage: boolean;
      maintainTherapeuticContinuity: boolean;
    }
  ): Promise<{
    optimized: boolean;
    recommendedConfiguration: PriorityQueueConfig;
    expectedPerformanceGains: {
      latencyImprovement: number;
      throughputImprovement: number;
      resourceEfficiency: number;
    };
    implementationRequired: boolean;
  }> {
    try {
      const response = await this.makeRequest('POST', '/orchestration/optimize', {
        userId,
        optimizationTargets,
        optimizedAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Performance optimization failed: ${error}`);
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
      'X-Orchestration': 'true',
      'X-Performance-Track': 'enabled'
    };

    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(this.defaultTimeout)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

/**
 * Subscription Tier Resource Limits
 */
export const ORCHESTRATION_TIER_LIMITS: Record<SubscriptionTier, {
  maxConcurrentOperations: number;
  maxQueueSize: number;
  bandwidthAllocation: number; // bytes/sec
  storageQuota: number; // bytes
  cpuTimeSlice: number; // milliseconds
  networkTimeout: number; // milliseconds
  crisisOverrideAvailable: boolean;
  realTimeSyncEnabled: boolean;
  crossDeviceEnabled: boolean;
  slaGuarantees: {
    maxLatency: number;
    minThroughput: number;
    maxErrorRate: number;
    availability: number;
  };
}> = {
  trial: {
    maxConcurrentOperations: 2,
    maxQueueSize: 10,
    bandwidthAllocation: 100 * 1024, // 100KB/s
    storageQuota: 50 * 1024 * 1024, // 50MB
    cpuTimeSlice: 100, // 100ms
    networkTimeout: 10000, // 10s
    crisisOverrideAvailable: true, // Always available for safety
    realTimeSyncEnabled: false,
    crossDeviceEnabled: false,
    slaGuarantees: {
      maxLatency: 2000, // 2s
      minThroughput: 50,
      maxErrorRate: 0.05, // 5%
      availability: 0.95 // 95%
    }
  },
  basic: {
    maxConcurrentOperations: 5,
    maxQueueSize: 50,
    bandwidthAllocation: 500 * 1024, // 500KB/s
    storageQuota: 200 * 1024 * 1024, // 200MB
    cpuTimeSlice: 500, // 500ms
    networkTimeout: 8000, // 8s
    crisisOverrideAvailable: true,
    realTimeSyncEnabled: true,
    crossDeviceEnabled: true,
    slaGuarantees: {
      maxLatency: 1000, // 1s
      minThroughput: 100,
      maxErrorRate: 0.03, // 3%
      availability: 0.98 // 98%
    }
  },
  premium: {
    maxConcurrentOperations: 15,
    maxQueueSize: 200,
    bandwidthAllocation: 2 * 1024 * 1024, // 2MB/s
    storageQuota: 1024 * 1024 * 1024, // 1GB
    cpuTimeSlice: 2000, // 2s
    networkTimeout: 5000, // 5s
    crisisOverrideAvailable: true,
    realTimeSyncEnabled: true,
    crossDeviceEnabled: true,
    slaGuarantees: {
      maxLatency: 500, // 500ms
      minThroughput: 200,
      maxErrorRate: 0.01, // 1%
      availability: 0.99 // 99%
    }
  },
  grace_period: {
    maxConcurrentOperations: 1,
    maxQueueSize: 5,
    bandwidthAllocation: 50 * 1024, // 50KB/s
    storageQuota: 25 * 1024 * 1024, // 25MB
    cpuTimeSlice: 50, // 50ms
    networkTimeout: 15000, // 15s
    crisisOverrideAvailable: true, // Always available for safety
    realTimeSyncEnabled: false,
    crossDeviceEnabled: false,
    slaGuarantees: {
      maxLatency: 5000, // 5s
      minThroughput: 25,
      maxErrorRate: 0.10, // 10%
      availability: 0.90 // 90%
    }
  }
};

/**
 * Crisis Response Priority Mapping
 */
export const CRISIS_PRIORITY_MAPPING: Record<string, {
  priority: number;
  maxResponseTime: number; // milliseconds
  resourceAllocation: number; // 0-1 scale
  escalationDelay: number; // milliseconds
  bypassSubscriptionLimits: boolean;
}> = {
  emergency: {
    priority: 10,
    maxResponseTime: 50, // <50ms for true emergencies
    resourceAllocation: 1.0, // Full resources
    escalationDelay: 0, // Immediate
    bypassSubscriptionLimits: true
  },
  crisis: {
    priority: 9,
    maxResponseTime: 200, // <200ms guarantee
    resourceAllocation: 0.8,
    escalationDelay: 1000, // 1s
    bypassSubscriptionLimits: true
  },
  urgent: {
    priority: 7,
    maxResponseTime: 500, // <500ms
    resourceAllocation: 0.6,
    escalationDelay: 3000, // 3s
    bypassSubscriptionLimits: true
  }
};

export default SyncOrchestrationAPI;