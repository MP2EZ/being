/**
 * Subscription Offline Policy API
 *
 * Manages tier-based offline capabilities, queue policies, and graceful degradation
 * strategies for different subscription levels. Ensures fair resource allocation
 * while maintaining therapeutic access and crisis safety across all tiers.
 *
 * TIER-BASED CAPABILITIES:
 * - Trial: 4-hour offline capacity, basic sync priority, limited batching
 * - Basic: 12-hour offline capacity, enhanced sync, intelligent batching
 * - Premium: 24-hour offline capacity, priority sync, advanced conflict resolution
 * - Grace Period: Therapeutic continuity with reduced capacity
 *
 * CRISIS OVERRIDES: All tiers maintain full crisis access regardless of limits
 */

import { z } from 'zod';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SubscriptionTier } from '../../types/subscription';
import type { OfflineOperation } from './offline-payment-queue-api';

/**
 * Subscription Policy Configuration
 */
export const SubscriptionPolicySchema = z.object({
  tier: z.enum(['trial', 'basic', 'premium', 'grace_period']),

  // Offline capacity limits
  capacity: z.object({
    maxOfflineHours: z.number().positive(),
    maxOperations: z.number().positive(),
    maxStorageBytes: z.number().positive(),
    compressionEnabled: z.boolean(),
    deduplicationEnabled: z.boolean()
  }),

  // Queue management
  queueing: z.object({
    priorityBonus: z.number().min(0).max(3),
    canJumpQueue: z.boolean(),
    maxConcurrentSyncs: z.number().positive(),
    batchSize: z.number().positive(),
    batchDelayMs: z.number().min(0),
    intelligentBatching: z.boolean()
  }),

  // Sync behavior
  synchronization: z.object({
    syncFrequency: z.enum(['immediate', 'high', 'normal', 'low', 'manual']),
    retryPolicy: z.object({
      maxRetries: z.number().min(0).max(10),
      retryDelayBase: z.number().positive(),
      retryDelayMultiplier: z.number().min(1).max(5),
      exponentialBackoff: z.boolean()
    }),
    conflictResolution: z.enum(['server_wins', 'client_wins', 'merge', 'ask_user', 'smart_merge']),
    autoResolveConflicts: z.boolean()
  }),

  // Performance optimization
  performance: z.object({
    enableAggregation: z.boolean(),
    enablePrefetch: z.boolean(),
    cacheStrategy: z.enum(['aggressive', 'normal', 'conservative']),
    backgroundSync: z.boolean(),
    lowPowerModeHandling: z.enum(['pause', 'reduce', 'continue'])
  }),

  // Graceful degradation
  degradation: z.object({
    enableGracefulDegradation: z.boolean(),
    fallbackBehaviors: z.array(z.enum([
      'cache_locally',
      'show_offline_message',
      'disable_feature',
      'provide_alternatives',
      'queue_for_later'
    ])),
    offlineFeatureAccess: z.record(z.boolean()), // Feature availability offline
    reducedFunctionality: z.boolean()
  }),

  // Crisis safety overrides
  crisisOverrides: z.object({
    maintainFullAccess: z.boolean(),
    extendCapacityForCrisis: z.boolean(),
    prioritizeCrisisOperations: z.boolean(),
    crisisCapacityMultiplier: z.number().min(1).max(10),
    emergencyFeatureAccess: z.array(z.string())
  }),

  // Grace period handling
  gracePeriod: z.object({
    enabled: z.boolean(),
    durationHours: z.number().min(0),
    maintainTherapeuticAccess: z.boolean(),
    reducedCapacity: z.boolean(),
    capacityReductionRatio: z.number().min(0).max(1)
  }),

  // Messaging and user experience
  userExperience: z.object({
    showCapacityWarnings: z.boolean(),
    upgradePrompts: z.boolean(),
    gracefulErrorMessages: z.boolean(),
    therapeuticGuidance: z.array(z.string()),
    offlineExperience: z.enum(['full', 'limited', 'essential'])
  })
});

export type SubscriptionPolicy = z.infer<typeof SubscriptionPolicySchema>;

/**
 * Policy Enforcement Result
 */
export const PolicyEnforcementResultSchema = z.object({
  // Enforcement decision
  allowed: z.boolean(),
  action: z.enum(['allow', 'queue', 'reject', 'degrade', 'upgrade_prompt']),

  // Resource allocation
  resourceAllocation: z.object({
    priorityLevel: z.number().min(1).max(10),
    queuePosition: z.number().min(0).optional(),
    estimatedWaitTime: z.number().min(0).optional(), // ms
    resourcesUsed: z.object({
      operations: z.number().min(0),
      storageBytes: z.number().min(0),
      syncSlots: z.number().min(0)
    })
  }),

  // Policy application
  appliedPolicies: z.array(z.string()),
  overrideReasons: z.array(z.string()),
  crisisOverrideActive: z.boolean(),

  // User messaging
  userMessage: z.string().optional(),
  upgradeRecommendation: z.object({
    recommended: z.boolean(),
    targetTier: z.enum(['trial', 'basic', 'premium', 'grace_period']).optional(),
    benefits: z.array(z.string()),
    urgency: z.enum(['low', 'medium', 'high'])
  }).optional(),

  // Therapeutic guidance
  therapeuticGuidance: z.string().optional(),
  alternativeActions: z.array(z.string()),

  // Performance impact
  performanceImpact: z.object({
    expectedDelayMs: z.number().min(0),
    qualityReduction: z.number().min(0).max(1), // 0-1 ratio
    featureLimitations: z.array(z.string())
  }),

  // Enforcement metadata
  enforcedAt: z.string(), // ISO timestamp
  validUntil: z.string().optional(), // ISO timestamp
  policyVersion: z.string()
});

export type PolicyEnforcementResult = z.infer<typeof PolicyEnforcementResultSchema>;

/**
 * Capacity Usage Tracking
 */
export const CapacityUsageSchema = z.object({
  tier: z.enum(['trial', 'basic', 'premium', 'grace_period']),
  userId: z.string(),

  // Current usage
  currentUsage: z.object({
    operations: z.number().min(0),
    storageBytes: z.number().min(0),
    offlineHours: z.number().min(0),
    syncSlotsUsed: z.number().min(0)
  }),

  // Capacity limits
  limits: z.object({
    maxOperations: z.number().positive(),
    maxStorageBytes: z.number().positive(),
    maxOfflineHours: z.number().positive(),
    maxConcurrentSyncs: z.number().positive()
  }),

  // Utilization ratios
  utilization: z.object({
    operations: z.number().min(0).max(1),
    storage: z.number().min(0).max(1),
    time: z.number().min(0).max(1),
    overall: z.number().min(0).max(1)
  }),

  // Trends and predictions
  trends: z.object({
    dailyGrowthRate: z.number(),
    predictedFullCapacity: z.string().optional(), // ISO timestamp
    peakUsageHours: z.array(z.number().min(0).max(23)),
    avgDailyOperations: z.number().min(0)
  }),

  // Crisis adjustments
  crisisAdjustments: z.object({
    capacityMultiplierActive: z.boolean(),
    currentMultiplier: z.number().min(1),
    crisisStartTime: z.string().optional(), // ISO timestamp
    adjustedLimits: z.object({
      maxOperations: z.number().positive(),
      maxStorageBytes: z.number().positive(),
      maxOfflineHours: z.number().positive()
    })
  }),

  lastUpdated: z.string() // ISO timestamp
});

export type CapacityUsage = z.infer<typeof CapacityUsageSchema>;

/**
 * Subscription Offline Policy API Class
 */
export class SubscriptionOfflinePolicyAPI {
  private policies: Record<SubscriptionTier, SubscriptionPolicy>;
  private usageTracker: Map<string, CapacityUsage>;
  private storageKey: string;

  constructor(config?: {
    storageKey?: string;
    customPolicies?: Partial<Record<SubscriptionTier, Partial<SubscriptionPolicy>>>;
  }) {
    this.storageKey = config?.storageKey || 'being_subscription_policies';
    this.policies = this.initializePolicies();
    this.usageTracker = new Map();

    // Apply any custom policy overrides
    if (config?.customPolicies) {
      this.applyPolicyOverrides(config.customPolicies);
    }
  }

  /**
   * Enforce subscription policy for operation
   */
  async enforcePolicy(
    operation: OfflineOperation,
    userId: string,
    currentCapacity?: CapacityUsage
  ): Promise<PolicyEnforcementResult> {
    const tier = operation.subscriptionTier;
    const policy = this.getPolicy(tier);

    // Get current usage
    const usage = currentCapacity || await this.getCapacityUsage(userId, tier);

    // Check for crisis overrides first
    const crisisOverride = await this.checkCrisisOverride(operation, policy);
    if (crisisOverride.active) {
      return this.createAllowedResult(operation, policy, crisisOverride.reason, true);
    }

    // Check capacity limits
    const capacityCheck = this.checkCapacityLimits(operation, usage, policy);
    if (!capacityCheck.allowed) {
      return this.createCapacityExceededResult(operation, policy, capacityCheck.reason);
    }

    // Check queue limits
    const queueCheck = this.checkQueueLimits(operation, usage, policy);
    if (!queueCheck.allowed) {
      return this.createQueueLimitResult(operation, policy, queueCheck.reason);
    }

    // Apply performance policies
    const performanceAdjustments = this.applyPerformancePolicies(operation, policy);

    // Create success result
    return this.createAllowedResult(operation, policy, 'Policy compliance verified', false, performanceAdjustments);
  }

  /**
   * Get policy configuration for tier
   */
  getPolicy(tier: SubscriptionTier): SubscriptionPolicy {
    return this.policies[tier];
  }

  /**
   * Update capacity usage tracking
   */
  async updateCapacityUsage(
    userId: string,
    tier: SubscriptionTier,
    operation: OfflineOperation,
    action: 'add' | 'remove'
  ): Promise<CapacityUsage> {
    const currentUsage = await this.getCapacityUsage(userId, tier);
    const policy = this.getPolicy(tier);

    if (action === 'add') {
      currentUsage.currentUsage.operations += 1;
      currentUsage.currentUsage.storageBytes += operation.payloadSize || 0;
      currentUsage.currentUsage.syncSlotsUsed = Math.min(
        currentUsage.currentUsage.syncSlotsUsed + 1,
        policy.queueing.maxConcurrentSyncs
      );
    } else {
      currentUsage.currentUsage.operations = Math.max(0, currentUsage.currentUsage.operations - 1);
      currentUsage.currentUsage.storageBytes = Math.max(0, currentUsage.currentUsage.storageBytes - (operation.payloadSize || 0));
      currentUsage.currentUsage.syncSlotsUsed = Math.max(0, currentUsage.currentUsage.syncSlotsUsed - 1);
    }

    // Update utilization ratios
    this.updateUtilizationRatios(currentUsage);

    // Update trends
    this.updateUsageTrends(currentUsage);

    // Save updated usage
    await this.saveCapacityUsage(userId, currentUsage);

    return currentUsage;
  }

  /**
   * Check if user needs upgrade recommendation
   */
  async getUpgradeRecommendation(
    userId: string,
    tier: SubscriptionTier
  ): Promise<{
    recommended: boolean;
    targetTier?: SubscriptionTier;
    reasons: string[];
    benefits: string[];
    urgency: 'low' | 'medium' | 'high';
  }> {
    const usage = await this.getCapacityUsage(userId, tier);
    const policy = this.getPolicy(tier);

    const reasons: string[] = [];
    let urgency: 'low' | 'medium' | 'high' = 'low';

    // Check utilization thresholds
    if (usage.utilization.overall > 0.9) {
      reasons.push('Approaching capacity limits');
      urgency = 'high';
    } else if (usage.utilization.overall > 0.75) {
      reasons.push('High capacity utilization');
      urgency = 'medium';
    }

    // Check trends
    if (usage.trends.predictedFullCapacity) {
      const daysToFull = Math.ceil(
        (new Date(usage.trends.predictedFullCapacity).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      );
      if (daysToFull <= 3) {
        reasons.push('Capacity will be full within 3 days');
        urgency = 'high';
      } else if (daysToFull <= 7) {
        reasons.push('Capacity will be full within a week');
        urgency = Math.max(urgency === 'high' ? 'high' : 'medium', urgency as any);
      }
    }

    // Determine target tier
    let targetTier: SubscriptionTier | undefined;
    const benefits: string[] = [];

    if (tier === 'trial') {
      targetTier = 'basic';
      benefits.push('12-hour offline capacity', 'Enhanced sync priority', 'Intelligent batching');
    } else if (tier === 'basic') {
      targetTier = 'premium';
      benefits.push('24-hour offline capacity', 'Queue jump privileges', 'Advanced conflict resolution');
    } else if (tier === 'grace_period') {
      targetTier = 'basic';
      benefits.push('Restored full capacity', 'Enhanced features', 'Priority support');
    }

    return {
      recommended: reasons.length > 0,
      targetTier,
      reasons,
      benefits,
      urgency
    };
  }

  /**
   * Handle graceful degradation for tier limits
   */
  async handleGracefulDegradation(
    operation: OfflineOperation,
    tier: SubscriptionTier,
    reason: string
  ): Promise<{
    degradedOperation?: Partial<OfflineOperation>;
    alternativeAction?: string;
    userGuidance: string;
    canContinue: boolean;
  }> {
    const policy = this.getPolicy(tier);

    if (!policy.degradation.enableGracefulDegradation) {
      return {
        userGuidance: 'This feature requires an upgrade to continue.',
        canContinue: false
      };
    }

    // Determine degradation strategy based on operation type
    if (operation.operationType === 'payment_sync') {
      return {
        degradedOperation: {
          ...operation,
          priority: Math.max(1, operation.priority - 2), // Reduce priority
          estimatedSyncTime: operation.estimatedSyncTime * 2 // Double expected time
        },
        userGuidance: 'Payment sync will be delayed but will complete when capacity allows.',
        canContinue: true
      };
    }

    if (operation.affectsTherapeuticAccess) {
      return {
        degradedOperation: operation, // Keep therapeutic operations unchanged
        userGuidance: 'Therapeutic features remain available. Some enhanced features may be limited.',
        canContinue: true
      };
    }

    // Generic degradation
    return {
      alternativeAction: 'cache_locally',
      userGuidance: `Operation queued for later sync. ${this.getTierUpgradeMessage(tier)}`,
      canContinue: true
    };
  }

  /**
   * Private helper methods
   */
  private async checkCrisisOverride(
    operation: OfflineOperation,
    policy: SubscriptionPolicy
  ): Promise<{ active: boolean; reason?: string }> {
    if (!policy.crisisOverrides.maintainFullAccess) {
      return { active: false };
    }

    // Crisis operations always override
    if (operation.isCrisisOperation || operation.bypassOfflineQueue) {
      return {
        active: true,
        reason: 'Crisis operation override active'
      };
    }

    // Therapeutic operations during crisis
    if (operation.affectsTherapeuticAccess && policy.crisisOverrides.prioritizeCrisisOperations) {
      const isUserInCrisis = await this.checkUserCrisisStatus(operation.userId);
      if (isUserInCrisis) {
        return {
          active: true,
          reason: 'Therapeutic access during crisis period'
        };
      }
    }

    return { active: false };
  }

  private checkCapacityLimits(
    operation: OfflineOperation,
    usage: CapacityUsage,
    policy: SubscriptionPolicy
  ): { allowed: boolean; reason?: string } {
    // Check operation count limit
    if (usage.currentUsage.operations >= usage.limits.maxOperations) {
      return {
        allowed: false,
        reason: 'Maximum operation count exceeded'
      };
    }

    // Check storage limit
    if (usage.currentUsage.storageBytes + (operation.payloadSize || 0) > usage.limits.maxStorageBytes) {
      return {
        allowed: false,
        reason: 'Storage capacity exceeded'
      };
    }

    // Check time-based capacity
    if (usage.currentUsage.offlineHours >= usage.limits.maxOfflineHours) {
      return {
        allowed: false,
        reason: 'Offline time capacity exceeded'
      };
    }

    return { allowed: true };
  }

  private checkQueueLimits(
    operation: OfflineOperation,
    usage: CapacityUsage,
    policy: SubscriptionPolicy
  ): { allowed: boolean; reason?: string } {
    if (usage.currentUsage.syncSlotsUsed >= policy.queueing.maxConcurrentSyncs) {
      return {
        allowed: false,
        reason: 'Maximum concurrent syncs reached'
      };
    }

    return { allowed: true };
  }

  private applyPerformancePolicies(
    operation: OfflineOperation,
    policy: SubscriptionPolicy
  ): any {
    return {
      compressionEnabled: policy.capacity.compressionEnabled,
      batchingOptimized: policy.queueing.intelligentBatching,
      syncFrequency: policy.synchronization.syncFrequency,
      cacheStrategy: policy.performance.cacheStrategy
    };
  }

  private createAllowedResult(
    operation: OfflineOperation,
    policy: SubscriptionPolicy,
    reason: string,
    crisisOverride: boolean,
    adjustments?: any
  ): PolicyEnforcementResult {
    return {
      allowed: true,
      action: 'allow',
      resourceAllocation: {
        priorityLevel: Math.min(10, operation.priority + policy.queueing.priorityBonus),
        resourcesUsed: {
          operations: 1,
          storageBytes: operation.payloadSize || 0,
          syncSlots: 1
        }
      },
      appliedPolicies: [policy.tier],
      overrideReasons: crisisOverride ? [reason] : [],
      crisisOverrideActive: crisisOverride,
      performanceImpact: {
        expectedDelayMs: 0,
        qualityReduction: 0,
        featureLimitations: []
      },
      enforcedAt: new Date().toISOString(),
      policyVersion: '1.0.0'
    };
  }

  private createCapacityExceededResult(
    operation: OfflineOperation,
    policy: SubscriptionPolicy,
    reason: string
  ): PolicyEnforcementResult {
    const upgradeRecommendation = this.getUpgradeRecommendationForPolicy(policy.tier);

    return {
      allowed: false,
      action: 'upgrade_prompt',
      resourceAllocation: {
        priorityLevel: 1,
        resourcesUsed: { operations: 0, storageBytes: 0, syncSlots: 0 }
      },
      appliedPolicies: [policy.tier],
      overrideReasons: [],
      crisisOverrideActive: false,
      userMessage: `${reason}. ${this.getTierUpgradeMessage(policy.tier)}`,
      upgradeRecommendation,
      therapeuticGuidance: policy.userExperience.therapeuticGuidance[0],
      alternativeActions: ['upgrade_subscription', 'wait_for_capacity', 'free_up_space'],
      performanceImpact: {
        expectedDelayMs: 0,
        qualityReduction: 1,
        featureLimitations: ['Feature unavailable until capacity available']
      },
      enforcedAt: new Date().toISOString(),
      policyVersion: '1.0.0'
    };
  }

  private createQueueLimitResult(
    operation: OfflineOperation,
    policy: SubscriptionPolicy,
    reason: string
  ): PolicyEnforcementResult {
    return {
      allowed: false,
      action: 'queue',
      resourceAllocation: {
        priorityLevel: operation.priority,
        queuePosition: 0, // Would be calculated based on current queue
        estimatedWaitTime: 30000, // 30 seconds default
        resourcesUsed: { operations: 0, storageBytes: 0, syncSlots: 0 }
      },
      appliedPolicies: [policy.tier],
      overrideReasons: [],
      crisisOverrideActive: false,
      userMessage: 'Operation queued due to sync capacity limits.',
      performanceImpact: {
        expectedDelayMs: 30000,
        qualityReduction: 0.3,
        featureLimitations: ['Delayed sync processing']
      },
      enforcedAt: new Date().toISOString(),
      policyVersion: '1.0.0'
    };
  }

  private async getCapacityUsage(userId: string, tier: SubscriptionTier): Promise<CapacityUsage> {
    const cacheKey = `${userId}_${tier}`;

    if (this.usageTracker.has(cacheKey)) {
      return this.usageTracker.get(cacheKey)!;
    }

    // Try to load from storage
    try {
      const stored = await AsyncStorage.getItem(`${this.storageKey}_usage_${userId}`);
      if (stored) {
        const usage = CapacityUsageSchema.parse(JSON.parse(stored));
        this.usageTracker.set(cacheKey, usage);
        return usage;
      }
    } catch (error) {
      console.warn('Failed to load capacity usage from storage:', error);
    }

    // Create new usage tracking
    const policy = this.getPolicy(tier);
    const newUsage: CapacityUsage = {
      tier,
      userId,
      currentUsage: {
        operations: 0,
        storageBytes: 0,
        offlineHours: 0,
        syncSlotsUsed: 0
      },
      limits: {
        maxOperations: policy.capacity.maxOperations,
        maxStorageBytes: policy.capacity.maxStorageBytes,
        maxOfflineHours: policy.capacity.maxOfflineHours,
        maxConcurrentSyncs: policy.queueing.maxConcurrentSyncs
      },
      utilization: {
        operations: 0,
        storage: 0,
        time: 0,
        overall: 0
      },
      trends: {
        dailyGrowthRate: 0,
        peakUsageHours: [],
        avgDailyOperations: 0
      },
      crisisAdjustments: {
        capacityMultiplierActive: false,
        currentMultiplier: 1,
        adjustedLimits: {
          maxOperations: policy.capacity.maxOperations,
          maxStorageBytes: policy.capacity.maxStorageBytes,
          maxOfflineHours: policy.capacity.maxOfflineHours
        }
      },
      lastUpdated: new Date().toISOString()
    };

    this.usageTracker.set(cacheKey, newUsage);
    return newUsage;
  }

  private updateUtilizationRatios(usage: CapacityUsage): void {
    usage.utilization.operations = usage.currentUsage.operations / usage.limits.maxOperations;
    usage.utilization.storage = usage.currentUsage.storageBytes / usage.limits.maxStorageBytes;
    usage.utilization.time = usage.currentUsage.offlineHours / usage.limits.maxOfflineHours;
    usage.utilization.overall = Math.max(
      usage.utilization.operations,
      usage.utilization.storage,
      usage.utilization.time
    );
  }

  private updateUsageTrends(usage: CapacityUsage): void {
    // Simple trend calculation - in production this would be more sophisticated
    const currentHour = new Date().getHours();
    if (!usage.trends.peakUsageHours.includes(currentHour)) {
      usage.trends.peakUsageHours.push(currentHour);
    }

    // Update daily growth rate based on current usage
    usage.trends.dailyGrowthRate = usage.utilization.overall * 0.1; // Simplified calculation
    usage.trends.avgDailyOperations = usage.currentUsage.operations * 1.2; // Estimated
  }

  private async saveCapacityUsage(userId: string, usage: CapacityUsage): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${this.storageKey}_usage_${userId}`,
        JSON.stringify(usage)
      );
      this.usageTracker.set(`${userId}_${usage.tier}`, usage);
    } catch (error) {
      console.error('Failed to save capacity usage:', error);
    }
  }

  private async checkUserCrisisStatus(userId: string): Promise<boolean> {
    try {
      const crisisData = await AsyncStorage.getItem(`crisis_mode_${userId}`);
      if (!crisisData) return false;

      const crisis = JSON.parse(crisisData);
      const endTime = new Date(crisis.endTime);
      return endTime > new Date();
    } catch {
      return false;
    }
  }

  private getTierUpgradeMessage(tier: SubscriptionTier): string {
    const messages = {
      'trial': 'Upgrade to Basic for 12-hour offline capacity and enhanced features.',
      'basic': 'Upgrade to Premium for 24-hour offline capacity and priority sync.',
      'premium': 'You have the highest tier - consider contacting support if you need more capacity.',
      'grace_period': 'Restore your subscription to regain full capacity and features.'
    };
    return messages[tier];
  }

  private getUpgradeRecommendationForPolicy(tier: SubscriptionTier) {
    const recommendations = {
      'trial': {
        recommended: true,
        targetTier: 'basic' as SubscriptionTier,
        benefits: ['12-hour offline capacity', 'Enhanced sync priority', 'Intelligent batching'],
        urgency: 'medium' as const
      },
      'basic': {
        recommended: true,
        targetTier: 'premium' as SubscriptionTier,
        benefits: ['24-hour offline capacity', 'Queue jump privileges', 'Advanced conflict resolution'],
        urgency: 'medium' as const
      },
      'premium': {
        recommended: false,
        benefits: [],
        urgency: 'low' as const
      },
      'grace_period': {
        recommended: true,
        targetTier: 'basic' as SubscriptionTier,
        benefits: ['Restored full access', 'Enhanced features'],
        urgency: 'high' as const
      }
    };
    return recommendations[tier];
  }

  private applyPolicyOverrides(
    overrides: Partial<Record<SubscriptionTier, Partial<SubscriptionPolicy>>>
  ): void {
    for (const [tier, override] of Object.entries(overrides)) {
      if (this.policies[tier as SubscriptionTier] && override) {
        this.policies[tier as SubscriptionTier] = {
          ...this.policies[tier as SubscriptionTier],
          ...override
        } as SubscriptionPolicy;
      }
    }
  }

  private initializePolicies(): Record<SubscriptionTier, SubscriptionPolicy> {
    return {
      'trial': {
        tier: 'trial',
        capacity: {
          maxOfflineHours: 4,
          maxOperations: 50,
          maxStorageBytes: 4 * 1024 * 1024, // 4MB
          compressionEnabled: false,
          deduplicationEnabled: true
        },
        queueing: {
          priorityBonus: 0,
          canJumpQueue: false,
          maxConcurrentSyncs: 1,
          batchSize: 5,
          batchDelayMs: 1000,
          intelligentBatching: false
        },
        synchronization: {
          syncFrequency: 'normal',
          retryPolicy: {
            maxRetries: 2,
            retryDelayBase: 2000,
            retryDelayMultiplier: 2,
            exponentialBackoff: true
          },
          conflictResolution: 'server_wins',
          autoResolveConflicts: true
        },
        performance: {
          enableAggregation: false,
          enablePrefetch: false,
          cacheStrategy: 'conservative',
          backgroundSync: false,
          lowPowerModeHandling: 'pause'
        },
        degradation: {
          enableGracefulDegradation: true,
          fallbackBehaviors: ['cache_locally', 'queue_for_later'],
          offlineFeatureAccess: {
            'basic_breathing': true,
            'crisis_button': true,
            'mood_tracking': true,
            'advanced_analytics': false
          },
          reducedFunctionality: true
        },
        crisisOverrides: {
          maintainFullAccess: true,
          extendCapacityForCrisis: true,
          prioritizeCrisisOperations: true,
          crisisCapacityMultiplier: 3,
          emergencyFeatureAccess: ['crisis_button', 'emergency_contacts', 'breathing_exercises']
        },
        gracePeriod: {
          enabled: true,
          durationHours: 48,
          maintainTherapeuticAccess: true,
          reducedCapacity: false,
          capacityReductionRatio: 1
        },
        userExperience: {
          showCapacityWarnings: true,
          upgradePrompts: true,
          gracefulErrorMessages: true,
          therapeuticGuidance: ['Your trial provides essential features to start your mindfulness journey.'],
          offlineExperience: 'essential'
        }
      },

      'basic': {
        tier: 'basic',
        capacity: {
          maxOfflineHours: 12,
          maxOperations: 150,
          maxStorageBytes: 8 * 1024 * 1024, // 8MB
          compressionEnabled: true,
          deduplicationEnabled: true
        },
        queueing: {
          priorityBonus: 1,
          canJumpQueue: false,
          maxConcurrentSyncs: 2,
          batchSize: 10,
          batchDelayMs: 500,
          intelligentBatching: true
        },
        synchronization: {
          syncFrequency: 'high',
          retryPolicy: {
            maxRetries: 3,
            retryDelayBase: 1500,
            retryDelayMultiplier: 2,
            exponentialBackoff: true
          },
          conflictResolution: 'merge',
          autoResolveConflicts: true
        },
        performance: {
          enableAggregation: true,
          enablePrefetch: true,
          cacheStrategy: 'normal',
          backgroundSync: true,
          lowPowerModeHandling: 'reduce'
        },
        degradation: {
          enableGracefulDegradation: true,
          fallbackBehaviors: ['cache_locally', 'provide_alternatives'],
          offlineFeatureAccess: {
            'basic_breathing': true,
            'crisis_button': true,
            'mood_tracking': true,
            'advanced_analytics': true,
            'cloud_sync': false
          },
          reducedFunctionality: false
        },
        crisisOverrides: {
          maintainFullAccess: true,
          extendCapacityForCrisis: true,
          prioritizeCrisisOperations: true,
          crisisCapacityMultiplier: 5,
          emergencyFeatureAccess: ['crisis_button', 'emergency_contacts', 'breathing_exercises', 'mood_tracking']
        },
        gracePeriod: {
          enabled: true,
          durationHours: 72,
          maintainTherapeuticAccess: true,
          reducedCapacity: true,
          capacityReductionRatio: 0.7
        },
        userExperience: {
          showCapacityWarnings: true,
          upgradePrompts: true,
          gracefulErrorMessages: true,
          therapeuticGuidance: ['Your Basic subscription provides enhanced features for consistent practice.'],
          offlineExperience: 'limited'
        }
      },

      'premium': {
        tier: 'premium',
        capacity: {
          maxOfflineHours: 24,
          maxOperations: 500,
          maxStorageBytes: 16 * 1024 * 1024, // 16MB
          compressionEnabled: true,
          deduplicationEnabled: true
        },
        queueing: {
          priorityBonus: 2,
          canJumpQueue: true,
          maxConcurrentSyncs: 3,
          batchSize: 20,
          batchDelayMs: 200,
          intelligentBatching: true
        },
        synchronization: {
          syncFrequency: 'immediate',
          retryPolicy: {
            maxRetries: 5,
            retryDelayBase: 1000,
            retryDelayMultiplier: 1.5,
            exponentialBackoff: true
          },
          conflictResolution: 'smart_merge',
          autoResolveConflicts: false
        },
        performance: {
          enableAggregation: true,
          enablePrefetch: true,
          cacheStrategy: 'aggressive',
          backgroundSync: true,
          lowPowerModeHandling: 'continue'
        },
        degradation: {
          enableGracefulDegradation: true,
          fallbackBehaviors: ['provide_alternatives'],
          offlineFeatureAccess: {
            'basic_breathing': true,
            'crisis_button': true,
            'mood_tracking': true,
            'advanced_analytics': true,
            'cloud_sync': true,
            'family_sharing': true
          },
          reducedFunctionality: false
        },
        crisisOverrides: {
          maintainFullAccess: true,
          extendCapacityForCrisis: true,
          prioritizeCrisisOperations: true,
          crisisCapacityMultiplier: 10,
          emergencyFeatureAccess: ['crisis_button', 'emergency_contacts', 'breathing_exercises', 'mood_tracking', 'family_sharing']
        },
        gracePeriod: {
          enabled: true,
          durationHours: 168, // 7 days
          maintainTherapeuticAccess: true,
          reducedCapacity: true,
          capacityReductionRatio: 0.5
        },
        userExperience: {
          showCapacityWarnings: false,
          upgradePrompts: false,
          gracefulErrorMessages: true,
          therapeuticGuidance: ['Your Premium subscription provides full access to support your deepening practice.'],
          offlineExperience: 'full'
        }
      },

      'grace_period': {
        tier: 'grace_period',
        capacity: {
          maxOfflineHours: 8,
          maxOperations: 75,
          maxStorageBytes: 6 * 1024 * 1024, // 6MB
          compressionEnabled: true,
          deduplicationEnabled: true
        },
        queueing: {
          priorityBonus: 1,
          canJumpQueue: false,
          maxConcurrentSyncs: 1,
          batchSize: 8,
          batchDelayMs: 800,
          intelligentBatching: true
        },
        synchronization: {
          syncFrequency: 'normal',
          retryPolicy: {
            maxRetries: 3,
            retryDelayBase: 2000,
            retryDelayMultiplier: 2,
            exponentialBackoff: true
          },
          conflictResolution: 'server_wins',
          autoResolveConflicts: true
        },
        performance: {
          enableAggregation: true,
          enablePrefetch: false,
          cacheStrategy: 'normal',
          backgroundSync: false,
          lowPowerModeHandling: 'pause'
        },
        degradation: {
          enableGracefulDegradation: true,
          fallbackBehaviors: ['cache_locally', 'show_offline_message'],
          offlineFeatureAccess: {
            'basic_breathing': true,
            'crisis_button': true,
            'mood_tracking': true,
            'advanced_analytics': false,
            'cloud_sync': false
          },
          reducedFunctionality: true
        },
        crisisOverrides: {
          maintainFullAccess: true,
          extendCapacityForCrisis: true,
          prioritizeCrisisOperations: true,
          crisisCapacityMultiplier: 3,
          emergencyFeatureAccess: ['crisis_button', 'emergency_contacts', 'breathing_exercises']
        },
        gracePeriod: {
          enabled: false,
          durationHours: 0,
          maintainTherapeuticAccess: true,
          reducedCapacity: false,
          capacityReductionRatio: 1
        },
        userExperience: {
          showCapacityWarnings: true,
          upgradePrompts: true,
          gracefulErrorMessages: true,
          therapeuticGuidance: ['Continue your practice while we work on your subscription. Crisis support is always available.'],
          offlineExperience: 'essential'
        }
      }
    };
  }
}

/**
 * Default instance for global use
 */
export const subscriptionOfflinePolicy = new SubscriptionOfflinePolicyAPI();

export default SubscriptionOfflinePolicyAPI;