/**
 * Payment-Aware Sync Context API
 *
 * Core sync service interface with subscription tier awareness and crisis safety
 * - Multi-tier priority queue system (10-level priority)
 * - Crisis safety override with <200ms guaranteed response
 * - Subscription tier sync policies enforcement
 * - Zero-PII design with encrypted payload support
 */

import { z } from 'zod';
import type {
  SubscriptionTier,
  SubscriptionState,
  SubscriptionError
} from "../../types/payment-canonical";
import type {
  SyncOperation,
  SyncState,
  SyncPriorityLevel
} from '../../types/cross-device-sync-canonical';
import type {
  SyncableData,
  SyncMetadata,
  SyncStatus,
  SyncEntityType,
  ConflictResolutionStrategy
} from '../../types/sync';

/**
 * Sync Priority Levels (1-10)
 */
export const SyncPrioritySchema = z.number().min(1).max(10);
export type SyncPriority = z.infer<typeof SyncPrioritySchema>;

/**
 * Priority level definitions
 */
export const SYNC_PRIORITIES = {
  BACKGROUND: 1,            // Non-urgent background sync
  LOW: 2,                   // User preferences, settings
  NORMAL: 3,                // Standard check-ins, non-clinical data
  ELEVATED: 4,              // Recent session data
  HIGH: 5,                  // Assessment data, clinical responses
  URGENT: 6,                // Recent assessments with elevated scores
  CRITICAL: 7,              // Crisis plan updates, high-risk assessments
  EMERGENCY_LOW: 8,         // Emergency access but low clinical risk
  EMERGENCY_HIGH: 9,        // High clinical risk emergency sync
  CRISIS_EMERGENCY: 10      // 988 hotline, immediate crisis intervention
} as const;

/**
 * Grace Period Status
 */
export const GracePeriodStatusSchema = z.object({
  active: z.boolean(),
  daysRemaining: z.number().min(0),
  originalDuration: z.number().positive(),
  features: z.array(z.string()),
  restrictions: z.array(z.string()),
  expiresAt: z.string(),
  canExtend: z.boolean()
});

export type GracePeriodStatus = z.infer<typeof GracePeriodStatusSchema>;

/**
 * Payment Context for Sync Operations
 */
export const PaymentSyncContextSchema = z.object({
  subscriptionTier: z.enum(['trial', 'basic', 'premium', 'grace_period']),
  subscriptionStatus: z.enum(['active', 'trialing', 'past_due', 'canceled', 'incomplete', 'grace_period']),
  gracePeriod: GracePeriodStatusSchema.optional(),
  tierLimits: z.object({
    maxSyncOperationsPerHour: z.number().positive(),
    maxDataSizePerOperation: z.number().positive(), // bytes
    allowedSyncTypes: z.array(z.string()),
    priorityQueueAccess: z.boolean(),
    crossDeviceSync: z.boolean(),
    realTimeSync: z.boolean()
  }),
  quotaUsage: z.object({
    operationsUsed: z.number().min(0),
    dataTransferredBytes: z.number().min(0),
    resetAt: z.string(),
    quotaExceeded: z.boolean()
  }),
  crisisOverride: z.object({
    active: z.boolean(),
    activatedAt: z.string().optional(),
    reason: z.string().optional(),
    features: z.array(z.string()).default([])
  }),
  lastValidated: z.string(),
  validationLatency: z.number().min(0)
});

export type PaymentSyncContext = z.infer<typeof PaymentSyncContextSchema>;

/**
 * Sync Request with Payment Context
 */
export const SyncRequestSchema = z.object({
  operationId: z.string().uuid(),
  entityType: z.enum(['check_in', 'assessment', 'user_profile', 'crisis_plan', 'session_data']),
  entityId: z.string(),
  operation: z.enum(['create', 'update', 'delete', 'fetch', 'batch']),
  priority: SyncPrioritySchema,

  // Encrypted payload - zero PII
  encryptedPayload: z.string().optional(),
  metadata: z.object({
    checksum: z.string(),
    encryptionVersion: z.string(),
    deviceId: z.string(),
    timestamp: z.string(),
    payloadSize: z.number().positive()
  }),

  // Payment context
  paymentContext: PaymentSyncContextSchema,

  // Crisis context
  crisisContext: z.object({
    isCrisisRelated: z.boolean(),
    crisisLevel: z.enum(['none', 'watch', 'elevated', 'high', 'critical', 'emergency']),
    requiresImmediateSync: z.boolean(),
    emergencyBypass: z.boolean()
  }),

  // Performance requirements
  requirements: z.object({
    maxLatency: z.number().positive(),
    requiresEncryption: z.boolean(),
    requiresAuditTrail: z.boolean(),
    consistencyLevel: z.enum(['eventual', 'strong', 'immediate'])
  }),

  requestedAt: z.string(),
  timeoutMs: z.number().positive().default(30000)
});

export type SyncRequest = z.infer<typeof SyncRequestSchema>;

/**
 * Sync Response with Performance Metrics
 */
export const SyncResponseSchema = z.object({
  operationId: z.string().uuid(),
  status: z.enum(['success', 'failure', 'partial', 'queued', 'rate_limited', 'unauthorized']),

  // Response data
  encryptedPayload: z.string().optional(),
  metadata: z.object({
    checksum: z.string(),
    version: z.number().positive(),
    lastModified: z.string(),
    conflictDetected: z.boolean()
  }).optional(),

  // Performance metrics
  performance: z.object({
    responseTime: z.number().min(0),
    queueWaitTime: z.number().min(0),
    processingTime: z.number().min(0),
    networkLatency: z.number().min(0),
    crisisResponseCompliant: z.boolean() // <200ms for crisis
  }),

  // Payment context validation
  paymentValidation: z.object({
    tierValidated: z.boolean(),
    quotaEnforced: z.boolean(),
    gracePeriodApplied: z.boolean(),
    upgradeRequired: z.boolean(),
    upgradeMessage: z.string().optional()
  }),

  // Queue information
  queueInfo: z.object({
    currentPosition: z.number().min(0),
    estimatedWaitTime: z.number().min(0),
    priorityLevel: SyncPrioritySchema,
    queueLength: z.number().min(0)
  }).optional(),

  // Error details
  error: z.object({
    code: z.string(),
    message: z.string(),
    category: z.enum(['payment', 'quota', 'network', 'validation', 'crisis', 'system']),
    retryable: z.boolean(),
    retryAfter: z.number().optional(),
    therapeuticGuidance: z.string().optional()
  }).optional(),

  respondedAt: z.string()
});

export type SyncResponse = z.infer<typeof SyncResponseSchema>;

/**
 * Batch Sync Request for Multiple Operations
 */
export const BatchSyncRequestSchema = z.object({
  batchId: z.string().uuid(),
  operations: z.array(SyncRequestSchema).min(1).max(100),
  batchPriority: SyncPrioritySchema,
  paymentContext: PaymentSyncContextSchema,
  options: z.object({
    failFast: z.boolean().default(false),
    atomicOperations: z.boolean().default(false),
    maxConcurrency: z.number().min(1).max(10).default(5),
    timeoutMs: z.number().positive().default(60000)
  }),
  requestedAt: z.string()
});

export type BatchSyncRequest = z.infer<typeof BatchSyncRequestSchema>;

/**
 * Batch Sync Response
 */
export const BatchSyncResponseSchema = z.object({
  batchId: z.string().uuid(),
  overallStatus: z.enum(['success', 'partial', 'failure', 'rate_limited']),
  operationResults: z.array(SyncResponseSchema),
  batchMetrics: z.object({
    totalOperations: z.number().min(0),
    successfulOperations: z.number().min(0),
    failedOperations: z.number().min(0),
    averageResponseTime: z.number().min(0),
    totalDataTransferred: z.number().min(0)
  }),
  respondedAt: z.string()
});

export type BatchSyncResponse = z.infer<typeof BatchSyncResponseSchema>;

/**
 * Payment-Aware Sync Context API Class
 */
export class PaymentSyncContextAPI {
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
    this.defaultTimeout = config.defaultTimeout || 30000;
  }

  /**
   * Execute single sync operation with payment context validation
   */
  async syncOperation(request: SyncRequest): Promise<SyncResponse> {
    const startTime = Date.now();

    try {
      // Validate request
      const validatedRequest = SyncRequestSchema.parse(request);

      // Crisis priority override
      if (validatedRequest.crisisContext.requiresImmediateSync) {
        validatedRequest.priority = Math.max(validatedRequest.priority, SYNC_PRIORITIES.EMERGENCY_HIGH);
      }

      // Make API call
      const response = await this.makeRequest('POST', '/sync/operation', validatedRequest);

      const syncResponse = SyncResponseSchema.parse(response);

      // Validate crisis response time
      if (validatedRequest.crisisContext.isCrisisRelated) {
        const responseTime = Date.now() - startTime;
        if (responseTime > 200) {
          console.warn(`Crisis sync response time violation: ${responseTime}ms > 200ms`);
        }
      }

      return syncResponse;

    } catch (error) {
      return this.createErrorResponse(request.operationId, error, Date.now() - startTime);
    }
  }

  /**
   * Execute batch sync operations
   */
  async batchSync(request: BatchSyncRequest): Promise<BatchSyncResponse> {
    try {
      const validatedRequest = BatchSyncRequestSchema.parse(request);
      const response = await this.makeRequest('POST', '/sync/batch', validatedRequest);
      return BatchSyncResponseSchema.parse(response);
    } catch (error) {
      throw new Error(`Batch sync failed: ${error}`);
    }
  }

  /**
   * Validate payment context for sync operations
   */
  async validatePaymentContext(
    subscriptionTier: SubscriptionTier,
    operationType: string,
    dataSize: number
  ): Promise<PaymentSyncContext> {
    try {
      const response = await this.makeRequest('POST', '/sync/validate-payment', {
        subscriptionTier,
        operationType,
        dataSize,
        timestamp: new Date().toISOString()
      });

      return PaymentSyncContextSchema.parse(response);
    } catch (error) {
      throw new Error(`Payment context validation failed: ${error}`);
    }
  }

  /**
   * Get sync queue status and position
   */
  async getQueueStatus(operationId: string): Promise<{
    position: number;
    estimatedWaitTime: number;
    priority: SyncPriority;
    queueLength: number;
  }> {
    try {
      const response = await this.makeRequest('GET', `/sync/queue/${operationId}`);
      return response;
    } catch (error) {
      throw new Error(`Queue status query failed: ${error}`);
    }
  }

  /**
   * Activate crisis override for emergency sync operations
   */
  async activateCrisisOverride(
    userId: string,
    reason: string,
    features: string[]
  ): Promise<{
    activated: boolean;
    expiresAt: string;
    features: string[];
  }> {
    try {
      const response = await this.makeRequest('POST', '/sync/crisis-override', {
        userId,
        reason,
        features,
        activatedAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Crisis override activation failed: ${error}`);
    }
  }

  /**
   * Get subscription tier limits and quotas
   */
  async getTierLimits(subscriptionTier: SubscriptionTier): Promise<{
    maxSyncOperationsPerHour: number;
    maxDataSizePerOperation: number;
    allowedSyncTypes: string[];
    priorityQueueAccess: boolean;
    quotaUsage: {
      operationsUsed: number;
      dataTransferredBytes: number;
      resetAt: string;
    };
  }> {
    try {
      const response = await this.makeRequest('GET', `/sync/tier-limits/${subscriptionTier}`);
      return response;
    } catch (error) {
      throw new Error(`Tier limits query failed: ${error}`);
    }
  }

  /**
   * Request grace period activation
   */
  async requestGracePeriod(
    userId: string,
    reason: string,
    requestedDays: number
  ): Promise<GracePeriodStatus> {
    try {
      const response = await this.makeRequest('POST', '/sync/grace-period', {
        userId,
        reason,
        requestedDays,
        requestedAt: new Date().toISOString()
      });

      return GracePeriodStatusSchema.parse(response);
    } catch (error) {
      throw new Error(`Grace period request failed: ${error}`);
    }
  }

  /**
   * Cancel sync operation
   */
  async cancelOperation(operationId: string, reason?: string): Promise<{
    canceled: boolean;
    wasProcessing: boolean;
    refundQuota: boolean;
  }> {
    try {
      const response = await this.makeRequest('DELETE', `/sync/operation/${operationId}`, {
        reason,
        canceledAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Operation cancellation failed: ${error}`);
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
      'X-Request-ID': crypto.randomUUID()
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

  private createErrorResponse(
    operationId: string,
    error: any,
    responseTime: number
  ): SyncResponse {
    return {
      operationId,
      status: 'failure',
      performance: {
        responseTime,
        queueWaitTime: 0,
        processingTime: 0,
        networkLatency: responseTime,
        crisisResponseCompliant: false
      },
      paymentValidation: {
        tierValidated: false,
        quotaEnforced: false,
        gracePeriodApplied: false,
        upgradeRequired: false
      },
      error: {
        code: 'SYNC_ERROR',
        message: error.message || 'Unknown sync error',
        category: 'system',
        retryable: true,
        therapeuticGuidance: 'Your data sync encountered an issue. Please try again, and your therapeutic progress will be preserved.'
      },
      respondedAt: new Date().toISOString()
    };
  }
}

/**
 * Default tier configurations
 */
export const DEFAULT_TIER_LIMITS = {
  trial: {
    maxSyncOperationsPerHour: 100,
    maxDataSizePerOperation: 1024 * 1024, // 1MB
    allowedSyncTypes: ['check_in', 'assessment', 'crisis_plan'],
    priorityQueueAccess: false,
    crossDeviceSync: false,
    realTimeSync: false
  },
  basic: {
    maxSyncOperationsPerHour: 500,
    maxDataSizePerOperation: 5 * 1024 * 1024, // 5MB
    allowedSyncTypes: ['check_in', 'assessment', 'user_profile', 'crisis_plan'],
    priorityQueueAccess: true,
    crossDeviceSync: true,
    realTimeSync: false
  },
  premium: {
    maxSyncOperationsPerHour: 2000,
    maxDataSizePerOperation: 20 * 1024 * 1024, // 20MB
    allowedSyncTypes: ['check_in', 'assessment', 'user_profile', 'crisis_plan', 'session_data'],
    priorityQueueAccess: true,
    crossDeviceSync: true,
    realTimeSync: true
  },
  grace_period: {
    maxSyncOperationsPerHour: 50,
    maxDataSizePerOperation: 512 * 1024, // 512KB
    allowedSyncTypes: ['assessment', 'crisis_plan'],
    priorityQueueAccess: false,
    crossDeviceSync: false,
    realTimeSync: false
  }
} as const;

/**
 * Crisis feature mapping
 */
export const CRISIS_SYNC_FEATURES = {
  crisis_button: SYNC_PRIORITIES.CRISIS_EMERGENCY,
  emergency_contacts: SYNC_PRIORITIES.EMERGENCY_HIGH,
  crisis_plan: SYNC_PRIORITIES.CRITICAL,
  assessment_crisis: SYNC_PRIORITIES.URGENT,
  hotline_data: SYNC_PRIORITIES.CRISIS_EMERGENCY,
  safety_plan: SYNC_PRIORITIES.CRITICAL
} as const;

export default PaymentSyncContextAPI;