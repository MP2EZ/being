/**
 * Subscription-Tier Sync Policy API
 *
 * Enforces subscription tier-based sync policies with therapeutic continuity guarantees
 * - Trial: Basic sync, limited features, crisis always accessible
 * - Basic: Enhanced sync, cross-device support, priority queue access
 * - Premium: Full sync, real-time updates, advanced features
 * - Grace Period: Emergency-only sync, therapeutic continuity maintained
 */

import { z } from 'zod';
import type { SubscriptionTier, SubscriptionState } from "../../types/payment-canonical";
import type { SyncPriorityLevel as SyncPriority } from '../../types/cross-device-sync-canonical';

/**
 * Tier-Based Sync Policy Configuration
 */
export const TierSyncPolicySchema = z.object({
  tier: z.enum(['trial', 'basic', 'premium', 'grace_period']),

  // Sync capabilities
  capabilities: z.object({
    realTimeSync: z.boolean(),
    crossDeviceSync: z.boolean(),
    priorityQueueAccess: z.boolean(),
    batchOperations: z.boolean(),
    conflictResolution: z.boolean(),
    auditTrail: z.boolean()
  }),

  // Resource limits
  limits: z.object({
    maxOperationsPerHour: z.number().positive(),
    maxDataSizePerOperation: z.number().positive(), // bytes
    maxConcurrentOperations: z.number().positive(),
    maxDevices: z.number().positive(),
    maxRetentionDays: z.number().positive()
  }),

  // Allowed sync types
  allowedSyncTypes: z.array(z.enum([
    'check_in',
    'assessment',
    'user_profile',
    'crisis_plan',
    'session_data',
    'analytics',
    'preferences',
    'therapeutic_content'
  ])),

  // Priority access levels
  priorityAccess: z.object({
    canUseHighPriority: z.boolean(),
    canUseCriticalPriority: z.boolean(),
    canRequestEscalation: z.boolean(),
    queueJumpAllowed: z.boolean()
  }),

  // Crisis guarantees (always true for safety)
  crisisGuarantees: z.object({
    crisisDataAlwaysSync: z.boolean().default(true),
    emergencyBypassEnabled: z.boolean().default(true),
    crisisResponseTimeGuarantee: z.number().default(200), // ms
    hotlineDataPriority: z.boolean().default(true)
  }),

  // Grace period handling
  gracePeriodBehavior: z.object({
    allowedDuringGrace: z.array(z.string()),
    emergencyOnlyMode: z.boolean(),
    therapeuticContinuity: z.boolean().default(true),
    maxGraceDays: z.number().positive()
  }),

  lastUpdated: z.string()
});

export type TierSyncPolicy = z.infer<typeof TierSyncPolicySchema>;

/**
 * Sync Operation Authorization Request
 */
export const SyncAuthorizationRequestSchema = z.object({
  operationId: z.string().uuid(),
  userId: z.string(),
  subscriptionTier: z.enum(['trial', 'basic', 'premium', 'grace_period']),
  subscriptionStatus: z.enum(['active', 'trialing', 'past_due', 'canceled', 'incomplete', 'grace_period']),

  // Operation details
  operation: z.object({
    type: z.enum(['create', 'update', 'delete', 'fetch', 'batch']),
    entityType: z.string(),
    entityId: z.string(),
    priority: z.number().min(1).max(10),
    dataSize: z.number().min(0),
    estimatedProcessingTime: z.number().positive()
  }),

  // Context
  context: z.object({
    isCrisisRelated: z.boolean(),
    requiresRealTime: z.boolean(),
    requiresCrossDevice: z.boolean(),
    isTherapeuticData: z.boolean(),
    currentQuotaUsage: z.number().min(0)
  }),

  requestedAt: z.string()
});

export type SyncAuthorizationRequest = z.infer<typeof SyncAuthorizationRequestSchema>;

/**
 * Sync Authorization Response
 */
export const SyncAuthorizationResponseSchema = z.object({
  operationId: z.string().uuid(),
  authorized: z.boolean(),

  // Authorization details
  authorization: z.object({
    tierValidated: z.boolean(),
    quotaAvailable: z.boolean(),
    priorityApproved: z.boolean(),
    crisisOverride: z.boolean(),
    gracePeriodApplied: z.boolean()
  }),

  // Applied policy
  appliedPolicy: z.object({
    tier: z.string(),
    maxDataSize: z.number(),
    allowedPriority: z.number().min(1).max(10),
    realTimeEnabled: z.boolean(),
    auditRequired: z.boolean()
  }),

  // Resource allocation
  resourceAllocation: z.object({
    quotaReserved: z.number().min(0),
    estimatedCost: z.number().min(0),
    concurrencySlot: z.number().optional(),
    timeoutMs: z.number().positive()
  }),

  // Upgrade recommendations
  upgradeRecommendation: z.object({
    recommended: z.boolean(),
    targetTier: z.string().optional(),
    benefits: z.array(z.string()).default([]),
    therapeuticReason: z.string().optional()
  }).optional(),

  // Error information
  error: z.object({
    code: z.string(),
    message: z.string(),
    category: z.enum(['tier_limit', 'quota_exceeded', 'policy_violation', 'system_error']),
    upgradeRequired: z.boolean(),
    retryAfter: z.number().optional()
  }).optional(),

  authorizedAt: z.string()
});

export type SyncAuthorizationResponse = z.infer<typeof SyncAuthorizationResponseSchema>;

/**
 * Quota Usage Tracking
 */
export const QuotaUsageSchema = z.object({
  userId: z.string(),
  subscriptionTier: z.enum(['trial', 'basic', 'premium', 'grace_period']),

  // Current period usage
  currentPeriod: z.object({
    startDate: z.string(),
    endDate: z.string(),
    operationsUsed: z.number().min(0),
    dataTransferredBytes: z.number().min(0),
    priorityOperationsUsed: z.number().min(0)
  }),

  // Tier limits
  tierLimits: z.object({
    maxOperations: z.number().positive(),
    maxDataTransfer: z.number().positive(),
    maxPriorityOperations: z.number().positive()
  }),

  // Usage patterns
  usagePattern: z.object({
    dailyAverage: z.number().min(0),
    peakUsageHour: z.number().min(0).max(23),
    therapeuticDataPercentage: z.number().min(0).max(1),
    crisisOperationsToday: z.number().min(0)
  }),

  // Recommendations
  recommendations: z.object({
    upgradeRecommended: z.boolean(),
    usageOptimization: z.array(z.string()).default([]),
    nextResetDate: z.string(),
    projectedUsage: z.number().min(0)
  }),

  lastUpdated: z.string()
});

export type QuotaUsage = z.infer<typeof QuotaUsageSchema>;

/**
 * Subscription Sync API Class
 */
export class SubscriptionSyncAPI {
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
   * Get sync policy for subscription tier
   */
  async getTierSyncPolicy(tier: SubscriptionTier): Promise<TierSyncPolicy> {
    try {
      const response = await this.makeRequest('GET', `/subscription-sync/policy/${tier}`);
      return TierSyncPolicySchema.parse(response);
    } catch (error) {
      throw new Error(`Tier policy query failed: ${error}`);
    }
  }

  /**
   * Authorize sync operation based on subscription tier
   */
  async authorizeSyncOperation(
    request: SyncAuthorizationRequest
  ): Promise<SyncAuthorizationResponse> {
    try {
      const validatedRequest = SyncAuthorizationRequestSchema.parse(request);

      // Apply crisis override logic
      if (validatedRequest.context.isCrisisRelated) {
        return this.applyCrisisAuthorization(validatedRequest);
      }

      const response = await this.makeRequest('POST', '/subscription-sync/authorize', validatedRequest);
      return SyncAuthorizationResponseSchema.parse(response);
    } catch (error) {
      throw new Error(`Sync authorization failed: ${error}`);
    }
  }

  /**
   * Get current quota usage for user
   */
  async getQuotaUsage(userId: string): Promise<QuotaUsage> {
    try {
      const response = await this.makeRequest('GET', `/subscription-sync/quota/${userId}`);
      return QuotaUsageSchema.parse(response);
    } catch (error) {
      throw new Error(`Quota usage query failed: ${error}`);
    }
  }

  /**
   * Update subscription tier and sync policies
   */
  async updateSubscriptionTier(
    userId: string,
    newTier: SubscriptionTier,
    effectiveDate?: string
  ): Promise<{
    updated: boolean;
    newPolicy: TierSyncPolicy;
    quotaReset: boolean;
    migrationRequired: boolean;
  }> {
    try {
      const response = await this.makeRequest('PUT', `/subscription-sync/tier/${userId}`, {
        newTier,
        effectiveDate: effectiveDate || new Date().toISOString(),
        migrationRequested: true
      });

      return response;
    } catch (error) {
      throw new Error(`Tier update failed: ${error}`);
    }
  }

  /**
   * Request emergency subscription override for crisis situations
   */
  async requestEmergencyOverride(
    userId: string,
    justification: string,
    requestedFeatures: string[]
  ): Promise<{
    approved: boolean;
    overrideCode: string;
    expiresAt: string;
    features: string[];
    reason?: string;
  }> {
    try {
      const response = await this.makeRequest('POST', '/subscription-sync/emergency-override', {
        userId,
        justification,
        requestedFeatures,
        requestedAt: new Date().toISOString(),
        emergencyCode: `EMG-${Date.now()}`
      });

      return response;
    } catch (error) {
      throw new Error(`Emergency override request failed: ${error}`);
    }
  }

  /**
   * Activate grace period for subscription
   */
  async activateGracePeriod(
    userId: string,
    reason: string,
    requestedDays: number
  ): Promise<{
    activated: boolean;
    gracePeriodEnd: string;
    allowedFeatures: string[];
    restrictions: string[];
  }> {
    try {
      const response = await this.makeRequest('POST', '/subscription-sync/grace-period', {
        userId,
        reason,
        requestedDays,
        activatedAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Grace period activation failed: ${error}`);
    }
  }

  /**
   * Get tier comparison and upgrade recommendations
   */
  async getTierComparison(
    currentTier: SubscriptionTier,
    usagePattern: any
  ): Promise<{
    currentTier: TierSyncPolicy;
    recommendations: Array<{
      tier: SubscriptionTier;
      benefits: string[];
      monthlyPrice: number;
      syncImprovements: string[];
      therapeuticValue: string;
    }>;
    costBenefit: {
      timeSeved: number; // minutes per month
      featuresUnlocked: number;
      therapeuticValue: string;
    };
  }> {
    try {
      const response = await this.makeRequest('POST', '/subscription-sync/tier-comparison', {
        currentTier,
        usagePattern,
        analysisDate: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Tier comparison failed: ${error}`);
    }
  }

  /**
   * Validate cross-device sync eligibility
   */
  async validateCrossDeviceSync(
    userId: string,
    deviceId: string,
    targetDeviceId: string
  ): Promise<{
    eligible: boolean;
    tierSupported: boolean;
    devicesInLimit: boolean;
    conflictsDetected: boolean;
    encryptionValid: boolean;
    reason?: string;
  }> {
    try {
      const response = await this.makeRequest('POST', '/subscription-sync/cross-device-validate', {
        userId,
        deviceId,
        targetDeviceId,
        validatedAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Cross-device validation failed: ${error}`);
    }
  }

  /**
   * Get sync performance metrics by tier
   */
  async getTierPerformanceMetrics(tier: SubscriptionTier): Promise<{
    averageResponseTime: number;
    successRate: number;
    queueWaitTime: number;
    throughput: number;
    userSatisfaction: number;
    crisisResponseCompliance: number; // percentage of <200ms responses
  }> {
    try {
      const response = await this.makeRequest('GET', `/subscription-sync/performance/${tier}`);
      return response;
    } catch (error) {
      throw new Error(`Performance metrics query failed: ${error}`);
    }
  }

  /**
   * Private method for crisis authorization override
   */
  private async applyCrisisAuthorization(
    request: SyncAuthorizationRequest
  ): Promise<SyncAuthorizationResponse> {
    // Crisis operations are always authorized regardless of tier
    return {
      operationId: request.operationId,
      authorized: true,
      authorization: {
        tierValidated: true,
        quotaAvailable: true,
        priorityApproved: true,
        crisisOverride: true,
        gracePeriodApplied: false
      },
      appliedPolicy: {
        tier: 'crisis_override',
        maxDataSize: Number.MAX_SAFE_INTEGER,
        allowedPriority: 10, // Maximum priority
        realTimeEnabled: true,
        auditRequired: true
      },
      resourceAllocation: {
        quotaReserved: 0, // No quota used for crisis
        estimatedCost: 0,
        timeoutMs: 5000 // Shorter timeout for crisis
      },
      authorizedAt: new Date().toISOString()
    };
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
}

/**
 * Default tier policies
 */
export const DEFAULT_TIER_POLICIES: Record<SubscriptionTier, TierSyncPolicy> = {
  trial: {
    tier: 'trial',
    capabilities: {
      realTimeSync: false,
      crossDeviceSync: false,
      priorityQueueAccess: false,
      batchOperations: false,
      conflictResolution: true,
      auditTrail: false
    },
    limits: {
      maxOperationsPerHour: 100,
      maxDataSizePerOperation: 1024 * 1024, // 1MB
      maxConcurrentOperations: 2,
      maxDevices: 1,
      maxRetentionDays: 30
    },
    allowedSyncTypes: ['check_in', 'assessment', 'crisis_plan'],
    priorityAccess: {
      canUseHighPriority: false,
      canUseCriticalPriority: false,
      canRequestEscalation: false,
      queueJumpAllowed: false
    },
    crisisGuarantees: {
      crisisDataAlwaysSync: true,
      emergencyBypassEnabled: true,
      crisisResponseTimeGuarantee: 200,
      hotlineDataPriority: true
    },
    gracePeriodBehavior: {
      allowedDuringGrace: ['crisis_plan', 'assessment'],
      emergencyOnlyMode: true,
      therapeuticContinuity: true,
      maxGraceDays: 7
    },
    lastUpdated: new Date().toISOString()
  },

  basic: {
    tier: 'basic',
    capabilities: {
      realTimeSync: false,
      crossDeviceSync: true,
      priorityQueueAccess: true,
      batchOperations: true,
      conflictResolution: true,
      auditTrail: true
    },
    limits: {
      maxOperationsPerHour: 500,
      maxDataSizePerOperation: 5 * 1024 * 1024, // 5MB
      maxConcurrentOperations: 5,
      maxDevices: 3,
      maxRetentionDays: 90
    },
    allowedSyncTypes: ['check_in', 'assessment', 'user_profile', 'crisis_plan', 'session_data'],
    priorityAccess: {
      canUseHighPriority: true,
      canUseCriticalPriority: false,
      canRequestEscalation: true,
      queueJumpAllowed: false
    },
    crisisGuarantees: {
      crisisDataAlwaysSync: true,
      emergencyBypassEnabled: true,
      crisisResponseTimeGuarantee: 200,
      hotlineDataPriority: true
    },
    gracePeriodBehavior: {
      allowedDuringGrace: ['crisis_plan', 'assessment', 'check_in'],
      emergencyOnlyMode: false,
      therapeuticContinuity: true,
      maxGraceDays: 14
    },
    lastUpdated: new Date().toISOString()
  },

  premium: {
    tier: 'premium',
    capabilities: {
      realTimeSync: true,
      crossDeviceSync: true,
      priorityQueueAccess: true,
      batchOperations: true,
      conflictResolution: true,
      auditTrail: true
    },
    limits: {
      maxOperationsPerHour: 2000,
      maxDataSizePerOperation: 20 * 1024 * 1024, // 20MB
      maxConcurrentOperations: 10,
      maxDevices: 10,
      maxRetentionDays: 365
    },
    allowedSyncTypes: ['check_in', 'assessment', 'user_profile', 'crisis_plan', 'session_data', 'analytics', 'preferences', 'therapeutic_content'],
    priorityAccess: {
      canUseHighPriority: true,
      canUseCriticalPriority: true,
      canRequestEscalation: true,
      queueJumpAllowed: true
    },
    crisisGuarantees: {
      crisisDataAlwaysSync: true,
      emergencyBypassEnabled: true,
      crisisResponseTimeGuarantee: 200,
      hotlineDataPriority: true
    },
    gracePeriodBehavior: {
      allowedDuringGrace: ['crisis_plan', 'assessment', 'check_in', 'user_profile'],
      emergencyOnlyMode: false,
      therapeuticContinuity: true,
      maxGraceDays: 30
    },
    lastUpdated: new Date().toISOString()
  },

  grace_period: {
    tier: 'grace_period',
    capabilities: {
      realTimeSync: false,
      crossDeviceSync: false,
      priorityQueueAccess: false,
      batchOperations: false,
      conflictResolution: true,
      auditTrail: true
    },
    limits: {
      maxOperationsPerHour: 50,
      maxDataSizePerOperation: 512 * 1024, // 512KB
      maxConcurrentOperations: 1,
      maxDevices: 1,
      maxRetentionDays: 14
    },
    allowedSyncTypes: ['assessment', 'crisis_plan'],
    priorityAccess: {
      canUseHighPriority: false,
      canUseCriticalPriority: false,
      canRequestEscalation: false,
      queueJumpAllowed: false
    },
    crisisGuarantees: {
      crisisDataAlwaysSync: true,
      emergencyBypassEnabled: true,
      crisisResponseTimeGuarantee: 200,
      hotlineDataPriority: true
    },
    gracePeriodBehavior: {
      allowedDuringGrace: ['crisis_plan', 'assessment'],
      emergencyOnlyMode: true,
      therapeuticContinuity: true,
      maxGraceDays: 14
    },
    lastUpdated: new Date().toISOString()
  }
};

export default SubscriptionSyncAPI;