/**
 * Payment-Aware Sync Context Service - Day 19 Phase 1
 *
 * Bridges payment state with sync operations ensuring subscription tiers
 * affect synchronization behavior while maintaining crisis safety.
 *
 * Key Features:
 * - Subscription tier-based sync priorities and limits
 * - Crisis override for emergency operations (<200ms)
 * - Grace period sync handling during payment failures
 * - HIPAA-compliant payment metadata integration
 */

import { usePaymentStore } from '../../store/paymentStore';
import { SyncEntityType, SyncOperation, SyncMetadata } from '../../types/sync';
import { SubscriptionTier, SubscriptionState } from '../../types/subscription';
import { CrisisPaymentOverride } from '../../types/payment';

/**
 * Payment sync configuration per subscription tier
 */
export interface PaymentSyncTierConfig {
  readonly tier: SubscriptionTier;
  readonly syncInterval: number; // minutes
  readonly maxSyncSize: number; // bytes
  readonly maxConcurrentSyncs: number;
  readonly priorityMultiplier: number; // higher = more priority
  readonly enabledEntityTypes: readonly SyncEntityType[];
  readonly offlineQueueLimit: number;
  readonly bandwidthLimit?: number; // bytes per second
}

/**
 * Payment metadata for sync operations
 */
export interface PaymentSyncMetadata {
  readonly subscriptionTier: SubscriptionTier;
  readonly subscriptionStatus: SubscriptionState;
  readonly gracePeriodActive: boolean;
  readonly trialDaysRemaining?: number;
  readonly paymentCurrent: boolean;
  readonly lastPaymentDate?: string;
  readonly syncEntitlements: {
    readonly maxSyncFrequency: number; // minutes
    readonly maxDataSize: number; // bytes
    readonly priorityLevel: number; // 1-5, 5 = highest
  };
  readonly crisisOverride: CrisisPaymentOverride | null;
}

/**
 * Payment-aware sync context result
 */
export interface PaymentSyncContextResult {
  readonly allowed: boolean;
  readonly priority: number; // 1-10, 10 = highest
  readonly maxSize: number; // bytes
  readonly interval: number; // minutes
  readonly crisisMode: boolean;
  readonly gracePeriod: boolean;
  readonly reasons: readonly string[];
  readonly metadata: PaymentSyncMetadata;
  readonly performanceRequirements: {
    readonly maxResponseTime: number; // ms
    readonly requiresImmediateSync: boolean;
    readonly criticalData: boolean;
  };
}

/**
 * Sync tier configurations mapped by subscription level
 */
const SYNC_TIER_CONFIGS: Record<SubscriptionTier, PaymentSyncTierConfig> = {
  trial: {
    tier: 'trial',
    syncInterval: 15, // 15 minutes
    maxSyncSize: 10 * 1024 * 1024, // 10MB
    maxConcurrentSyncs: 2,
    priorityMultiplier: 0.5,
    enabledEntityTypes: ['check_in', 'user_profile', 'crisis_plan'],
    offlineQueueLimit: 20,
    bandwidthLimit: 50 * 1024 // 50KB/s
  },
  basic: {
    tier: 'basic',
    syncInterval: 60, // 60 minutes
    maxSyncSize: 100 * 1024 * 1024, // 100MB
    maxConcurrentSyncs: 3,
    priorityMultiplier: 1.0,
    enabledEntityTypes: ['check_in', 'user_profile', 'assessment', 'crisis_plan'],
    offlineQueueLimit: 50,
    bandwidthLimit: 100 * 1024 // 100KB/s
  },
  premium: {
    tier: 'premium',
    syncInterval: 5, // 5 minutes
    maxSyncSize: Number.MAX_SAFE_INTEGER, // unlimited
    maxConcurrentSyncs: 10,
    priorityMultiplier: 2.0,
    enabledEntityTypes: ['check_in', 'user_profile', 'assessment', 'crisis_plan', 'widget_data', 'session_data'],
    offlineQueueLimit: 200,
    // No bandwidth limit for premium
  }
};

/**
 * Crisis data types that always sync regardless of payment
 */
const CRISIS_ENTITY_TYPES: ReadonlySet<SyncEntityType> = new Set([
  'crisis_plan',
  'assessment' // PHQ-9/GAD-7 for crisis detection
]);

/**
 * Payment-Aware Sync Context Service
 */
export class PaymentAwareSyncContext {
  private static instance: PaymentAwareSyncContext;

  public static getInstance(): PaymentAwareSyncContext {
    if (!PaymentAwareSyncContext.instance) {
      PaymentAwareSyncContext.instance = new PaymentAwareSyncContext();
    }
    return PaymentAwareSyncContext.instance;
  }

  /**
   * Evaluate sync context for a given operation
   */
  public async evaluateSyncContext(
    operation: Pick<SyncOperation, 'entityType' | 'priority' | 'clinicalSafety' | 'data'>,
    crisisMode: boolean = false
  ): Promise<PaymentSyncContextResult> {
    const startTime = performance.now();

    try {
      // Get current payment state
      const paymentState = this.getPaymentState();
      const tierConfig = this.getTierConfig(paymentState.tier);

      // Check for crisis override
      const isCrisisData = CRISIS_ENTITY_TYPES.has(operation.entityType) ||
                          operation.clinicalSafety ||
                          crisisMode;

      // Crisis override - always allow with highest priority
      if (isCrisisData) {
        return this.createCrisisOverrideResult(paymentState, startTime);
      }

      // Check payment status and grace period
      if (!paymentState.paymentCurrent && !paymentState.gracePeriodActive) {
        return this.createDeniedResult(paymentState, 'Payment required for sync operations');
      }

      // Check entity type permissions
      if (!tierConfig.enabledEntityTypes.includes(operation.entityType)) {
        return this.createDeniedResult(paymentState, `${operation.entityType} sync not available in ${tierConfig.tier} tier`);
      }

      // Calculate data size for limits
      const dataSize = this.estimateDataSize(operation.data);
      if (dataSize > tierConfig.maxSyncSize) {
        return this.createDeniedResult(paymentState, `Data size (${dataSize} bytes) exceeds tier limit (${tierConfig.maxSyncSize} bytes)`);
      }

      // Create successful sync context
      return this.createAllowedResult(paymentState, tierConfig, dataSize, startTime);

    } catch (error) {
      console.error('PaymentAwareSyncContext evaluation error:', error);

      // Fallback to crisis mode for safety
      const paymentState = this.getPaymentState();
      return this.createCrisisOverrideResult(paymentState, startTime);
    }
  }

  /**
   * Get sync interval for current subscription tier
   */
  public getSyncInterval(): number {
    const paymentState = this.getPaymentState();
    const tierConfig = this.getTierConfig(paymentState.tier);
    return tierConfig.syncInterval;
  }

  /**
   * Check if entity type is allowed for current tier
   */
  public isEntityTypeAllowed(entityType: SyncEntityType, crisisMode: boolean = false): boolean {
    // Crisis data always allowed
    if (CRISIS_ENTITY_TYPES.has(entityType) || crisisMode) {
      return true;
    }

    const paymentState = this.getPaymentState();
    const tierConfig = this.getTierConfig(paymentState.tier);

    return tierConfig.enabledEntityTypes.includes(entityType) &&
           (paymentState.paymentCurrent || paymentState.gracePeriodActive);
  }

  /**
   * Get maximum concurrent syncs for current tier
   */
  public getMaxConcurrentSyncs(): number {
    const paymentState = this.getPaymentState();
    const tierConfig = this.getTierConfig(paymentState.tier);
    return tierConfig.maxConcurrentSyncs;
  }

  /**
   * Get offline queue limit for current tier
   */
  public getOfflineQueueLimit(): number {
    const paymentState = this.getPaymentState();
    const tierConfig = this.getTierConfig(paymentState.tier);
    return tierConfig.offlineQueueLimit;
  }

  /**
   * Create payment sync metadata
   */
  public createPaymentSyncMetadata(crisisOverride?: CrisisPaymentOverride): PaymentSyncMetadata {
    const paymentState = this.getPaymentState();
    const tierConfig = this.getTierConfig(paymentState.tier);

    return {
      subscriptionTier: paymentState.tier,
      subscriptionStatus: paymentState.subscriptionStatus,
      gracePeriodActive: paymentState.gracePeriodActive,
      trialDaysRemaining: paymentState.trialDaysRemaining,
      paymentCurrent: paymentState.paymentCurrent,
      lastPaymentDate: paymentState.lastPaymentDate,
      syncEntitlements: {
        maxSyncFrequency: tierConfig.syncInterval,
        maxDataSize: tierConfig.maxSyncSize,
        priorityLevel: Math.ceil(tierConfig.priorityMultiplier * 2)
      },
      crisisOverride: crisisOverride || null
    };
  }

  /**
   * Get current payment state from store
   */
  private getPaymentState() {
    // This would typically use the payment store
    // For now, we'll simulate the state
    return {
      tier: 'premium' as SubscriptionTier,
      subscriptionStatus: 'active' as SubscriptionState,
      gracePeriodActive: false,
      trialDaysRemaining: undefined,
      paymentCurrent: true,
      lastPaymentDate: new Date().toISOString()
    };
  }

  /**
   * Get tier configuration
   */
  private getTierConfig(tier: SubscriptionTier): PaymentSyncTierConfig {
    return SYNC_TIER_CONFIGS[tier];
  }

  /**
   * Estimate data size for sync operation
   */
  private estimateDataSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      // Fallback estimation
      return JSON.stringify(data).length * 2; // Rough UTF-8 estimation
    }
  }

  /**
   * Create crisis override result
   */
  private createCrisisOverrideResult(
    paymentState: any,
    startTime: number
  ): PaymentSyncContextResult {
    const processingTime = performance.now() - startTime;

    return {
      allowed: true,
      priority: 10, // Maximum priority
      maxSize: Number.MAX_SAFE_INTEGER,
      interval: 0, // Immediate
      crisisMode: true,
      gracePeriod: false,
      reasons: ['Crisis override - mental health emergency'],
      metadata: this.createPaymentSyncMetadata({
        enabled: true,
        reason: 'mental_health_emergency',
        activatedAt: new Date().toISOString(),
        bypassedLimits: ['sync_frequency', 'data_size', 'entity_restrictions'],
        emergencyContact: '988' // Crisis hotline
      }),
      performanceRequirements: {
        maxResponseTime: 200, // Crisis requirement
        requiresImmediateSync: true,
        criticalData: true
      }
    };
  }

  /**
   * Create denied result
   */
  private createDeniedResult(
    paymentState: any,
    reason: string
  ): PaymentSyncContextResult {
    return {
      allowed: false,
      priority: 0,
      maxSize: 0,
      interval: Number.MAX_SAFE_INTEGER,
      crisisMode: false,
      gracePeriod: paymentState.gracePeriodActive,
      reasons: [reason],
      metadata: this.createPaymentSyncMetadata(),
      performanceRequirements: {
        maxResponseTime: 5000, // Standard
        requiresImmediateSync: false,
        criticalData: false
      }
    };
  }

  /**
   * Create allowed result
   */
  private createAllowedResult(
    paymentState: any,
    tierConfig: PaymentSyncTierConfig,
    dataSize: number,
    startTime: number
  ): PaymentSyncContextResult {
    const processingTime = performance.now() - startTime;
    const priority = Math.ceil(tierConfig.priorityMultiplier * 5);

    return {
      allowed: true,
      priority,
      maxSize: tierConfig.maxSyncSize,
      interval: tierConfig.syncInterval,
      crisisMode: false,
      gracePeriod: paymentState.gracePeriodActive,
      reasons: [`Sync allowed for ${tierConfig.tier} tier`],
      metadata: this.createPaymentSyncMetadata(),
      performanceRequirements: {
        maxResponseTime: 2000, // Standard non-crisis
        requiresImmediateSync: false,
        criticalData: false
      }
    };
  }
}

// Export singleton instance
export const paymentAwareSyncContext = PaymentAwareSyncContext.getInstance();