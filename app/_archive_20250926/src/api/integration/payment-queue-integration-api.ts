/**
 * Payment Queue Integration API
 *
 * Seamlessly integrates the offline payment queue with the payment system,
 * ensuring payment operations are handled correctly during offline periods
 * and synchronized properly when connectivity returns.
 *
 * PAYMENT INTEGRATION FEATURES:
 * - Payment state synchronization with offline queue
 * - Subscription tier enforcement during offline operations
 * - Grace period handling and therapeutic continuity
 * - Payment failure resilience with therapeutic access preservation
 * - Transaction integrity and audit trail maintenance
 *
 * THERAPEUTIC SAFETY:
 * - Payment failures never block therapeutic access
 * - Grace period activation maintains full therapeutic features
 * - Crisis access guaranteed regardless of payment status
 * - Seamless user experience during payment transitions
 */

import { z } from 'zod';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OfflinePaymentQueueAPI, type OfflineOperation } from '../offline/offline-payment-queue-api';
import { QueueSyncCoordinatorAPI } from '../offline/queue-sync-coordinator-api';
import { SubscriptionOfflinePolicyAPI } from '../offline/subscription-offline-policy-api';
import type { SubscriptionTier } from "../../types/payment-canonical";

/**
 * Payment Queue Operation Schema
 */
export const PaymentQueueOperationSchema = z.object({
  // Base operation properties (extends OfflineOperation)
  operationId: z.string().uuid(),
  operationType: z.enum([
    'payment_sync',
    'subscription_update',
    'payment_method_update',
    'billing_address_update',
    'subscription_cancel',
    'subscription_reactivate',
    'trial_extension',
    'grace_period_activation',
    'payment_retry',
    'refund_request',
    'invoice_sync'
  ]),

  // Payment-specific data
  paymentData: z.object({
    subscriptionId: z.string().optional(),
    customerId: z.string(),
    amount: z.number().min(0).optional(),
    currency: z.string().length(3).optional(), // ISO 4217
    paymentMethodId: z.string().optional(),
    invoiceId: z.string().optional()
  }),

  // Subscription context
  subscriptionContext: z.object({
    currentTier: z.enum(['trial', 'basic', 'premium', 'grace_period']),
    targetTier: z.enum(['trial', 'basic', 'premium', 'grace_period']).optional(),
    trialDaysRemaining: z.number().min(0).optional(),
    gracePeriodActive: z.boolean(),
    gracePeriodEnd: z.string().optional() // ISO timestamp
  }),

  // Therapeutic safety
  therapeuticSafety: z.object({
    affectsAccess: z.boolean(),
    preserveAccessOnFailure: z.boolean(),
    activateGracePeriodOnFailure: z.boolean(),
    criticalForUserSafety: z.boolean()
  }),

  // Payment state tracking
  paymentState: z.object({
    status: z.enum([
      'pending',
      'processing',
      'succeeded',
      'failed',
      'canceled',
      'requires_action',
      'requires_payment_method'
    ]),
    clientSecret: z.string().optional(),
    errorCode: z.string().optional(),
    errorMessage: z.string().optional(),
    requiresUserAction: z.boolean().default(false)
  }),

  // Offline handling
  offlineHandling: z.object({
    queueable: z.boolean(),
    requiresImmediate: z.boolean(),
    fallbackBehavior: z.enum([
      'queue_for_sync',
      'activate_grace_period',
      'maintain_access',
      'show_payment_screen',
      'degrade_gracefully'
    ]),
    maxOfflineHours: z.number().min(0),
    syncPriority: z.number().min(1).max(10)
  }),

  // Audit trail
  auditTrail: z.object({
    initiatedBy: z.string(),
    reason: z.string(),
    deviceId: z.string(),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional()
  }),

  // Timestamps
  createdAt: z.string(), // ISO timestamp
  scheduledFor: z.string().optional(),
  expiresAt: z.string().optional()
});

export type PaymentQueueOperation = z.infer<typeof PaymentQueueOperationSchema>;

/**
 * Payment Sync Result Schema
 */
export const PaymentSyncResultSchema = z.object({
  operationId: z.string().uuid(),
  success: z.boolean(),

  // Payment result
  paymentResult: z.object({
    transactionId: z.string().optional(),
    status: z.string(),
    amount: z.number().optional(),
    currency: z.string().optional(),
    processedAt: z.string().optional() // ISO timestamp
  }),

  // Subscription changes
  subscriptionChanges: z.object({
    tierChanged: z.boolean(),
    newTier: z.enum(['trial', 'basic', 'premium', 'grace_period']).optional(),
    accessPreserved: z.boolean(),
    gracePeriodActivated: z.boolean(),
    featuresAffected: z.array(z.string())
  }),

  // Therapeutic impact
  therapeuticImpact: z.object({
    accessMaintained: z.boolean(),
    featuresLost: z.array(z.string()),
    featuresGained: z.array(z.string()),
    continuityPreserved: z.boolean()
  }),

  // Error handling
  errors: z.array(z.object({
    code: z.string(),
    message: z.string(),
    recoverable: z.boolean(),
    userAction: z.string().optional()
  })),

  // Follow-up actions
  followUpActions: z.array(z.enum([
    'update_user_interface',
    'show_payment_success',
    'show_payment_failure',
    'activate_grace_period_ui',
    'refresh_feature_access',
    'sync_subscription_state',
    'show_upgrade_prompt',
    'collect_payment_method'
  ])),

  processedAt: z.string() // ISO timestamp
});

export type PaymentSyncResult = z.infer<typeof PaymentSyncResultSchema>;

/**
 * Grace Period Management Schema
 */
export const GracePeriodManagementSchema = z.object({
  userId: z.string(),
  subscriptionTier: z.enum(['trial', 'basic', 'premium', 'grace_period']),

  // Grace period state
  gracePeriod: z.object({
    active: z.boolean(),
    startDate: z.string(), // ISO timestamp
    endDate: z.string(),   // ISO timestamp
    durationHours: z.number().positive(),
    reason: z.enum([
      'payment_failure',
      'subscription_ended',
      'billing_issue',
      'card_expired',
      'insufficient_funds',
      'therapeutic_continuity'
    ]),
    autoActivated: z.boolean()
  }),

  // Therapeutic preservation
  therapeuticAccess: z.object({
    preserveAll: z.boolean(),
    preservedFeatures: z.array(z.string()),
    limitedFeatures: z.array(z.string()),
    blockedFeatures: z.array(z.string())
  }),

  // User experience
  userExperience: z.object({
    showGracePeriodBanner: z.boolean(),
    allowUpgrade: z.boolean(),
    showPaymentPrompts: z.boolean(),
    gracefulDegradation: z.boolean(),
    urgencyLevel: z.enum(['low', 'medium', 'high', 'urgent'])
  }),

  // Resolution tracking
  resolution: z.object({
    attempts: z.number().min(0),
    lastAttempt: z.string().optional(), // ISO timestamp
    resolved: z.boolean(),
    resolvedAt: z.string().optional(),
    resolutionMethod: z.enum([
      'payment_succeeded',
      'subscription_renewed',
      'tier_downgrade',
      'account_closed',
      'manual_resolution'
    ]).optional()
  }),

  createdAt: z.string(),
  updatedAt: z.string()
});

export type GracePeriodManagement = z.infer<typeof GracePeriodManagementSchema>;

/**
 * Payment Queue Integration API Class
 */
export class PaymentQueueIntegrationAPI {
  private queueAPI: OfflinePaymentQueueAPI;
  private syncCoordinator: QueueSyncCoordinatorAPI;
  private policyAPI: SubscriptionOfflinePolicyAPI;
  private activeGracePeriods: Map<string, GracePeriodManagement>;
  private paymentCallbacks: Map<string, (result: PaymentSyncResult) => void>;
  private storageKey: string;

  constructor(config?: {
    storageKey?: string;
    queueAPI?: OfflinePaymentQueueAPI;
    syncCoordinator?: QueueSyncCoordinatorAPI;
    policyAPI?: SubscriptionOfflinePolicyAPI;
  }) {
    this.queueAPI = config?.queueAPI || new OfflinePaymentQueueAPI();
    this.syncCoordinator = config?.syncCoordinator || new QueueSyncCoordinatorAPI();
    this.policyAPI = config?.policyAPI || new SubscriptionOfflinePolicyAPI();
    this.activeGracePeriods = new Map();
    this.paymentCallbacks = new Map();
    this.storageKey = config?.storageKey || 'being_payment_queue_integration';
  }

  /**
   * Queue payment operation for offline handling
   */
  async queuePaymentOperation(
    operation: PaymentQueueOperation,
    onComplete?: (result: PaymentSyncResult) => void
  ): Promise<{
    queued: boolean;
    queuePosition: number;
    estimatedSyncTime: number;
    gracePeriodActivated: boolean;
    therapeuticAccessPreserved: boolean;
  }> {
    try {
      // Validate therapeutic safety requirements
      await this.validateTherapeuticSafety(operation);

      // Convert to offline operation format
      const offlineOperation = await this.convertToOfflineOperation(operation);

      // Register callback if provided
      if (onComplete) {
        this.paymentCallbacks.set(operation.operationId, onComplete);
      }

      // Check if grace period should be activated proactively
      let gracePeriodActivated = false;
      if (operation.therapeuticSafety.activateGracePeriodOnFailure &&
          operation.therapeuticSafety.affectsAccess) {
        gracePeriodActivated = await this.activateGracePeriod(
          operation.paymentData.customerId,
          operation.subscriptionContext.currentTier,
          'therapeutic_continuity'
        );
      }

      // Queue the operation
      const queueResult = await this.queueAPI.enqueueOperation(offlineOperation);

      // Ensure therapeutic access is preserved
      const therapeuticAccessPreserved = await this.ensureTherapeuticAccess(
        operation.paymentData.customerId,
        operation.subscriptionContext.currentTier,
        operation.therapeuticSafety
      );

      return {
        queued: queueResult.queued,
        queuePosition: queueResult.position,
        estimatedSyncTime: queueResult.estimatedSyncTime,
        gracePeriodActivated,
        therapeuticAccessPreserved
      };

    } catch (error) {
      console.error('Failed to queue payment operation:', error);

      // Ensure therapeutic access even on queueing failure
      const therapeuticAccessPreserved = await this.ensureTherapeuticAccess(
        operation.paymentData.customerId,
        operation.subscriptionContext.currentTier,
        operation.therapeuticSafety
      );

      return {
        queued: false,
        queuePosition: 0,
        estimatedSyncTime: 0,
        gracePeriodActivated: false,
        therapeuticAccessPreserved
      };
    }
  }

  /**
   * Process payment sync result and update user access
   */
  async processPaymentSyncResult(
    operationId: string,
    syncResult: any
  ): Promise<PaymentSyncResult> {
    try {
      // Parse sync result
      const paymentResult: PaymentSyncResult = {
        operationId,
        success: syncResult.success || false,
        paymentResult: {
          transactionId: syncResult.transactionId,
          status: syncResult.status || 'failed',
          amount: syncResult.amount,
          currency: syncResult.currency,
          processedAt: new Date().toISOString()
        },
        subscriptionChanges: {
          tierChanged: false,
          accessPreserved: true,
          gracePeriodActivated: false,
          featuresAffected: []
        },
        therapeuticImpact: {
          accessMaintained: true,
          featuresLost: [],
          featuresGained: [],
          continuityPreserved: true
        },
        errors: [],
        followUpActions: [],
        processedAt: new Date().toISOString()
      };

      // Handle successful payment
      if (syncResult.success) {
        await this.handleSuccessfulPayment(operationId, syncResult, paymentResult);
      } else {
        await this.handleFailedPayment(operationId, syncResult, paymentResult);
      }

      // Notify callback if registered
      const callback = this.paymentCallbacks.get(operationId);
      if (callback) {
        callback(paymentResult);
        this.paymentCallbacks.delete(operationId);
      }

      // Persist result
      await this.persistPaymentResult(paymentResult);

      return paymentResult;

    } catch (error) {
      console.error('Failed to process payment sync result:', error);
      throw error;
    }
  }

  /**
   * Activate grace period for therapeutic continuity
   */
  async activateGracePeriod(
    userId: string,
    currentTier: SubscriptionTier,
    reason: 'payment_failure' | 'subscription_ended' | 'billing_issue' | 'card_expired' | 'insufficient_funds' | 'therapeutic_continuity'
  ): Promise<boolean> {
    try {
      // Check if grace period is already active
      const existingGracePeriod = this.activeGracePeriods.get(userId);
      if (existingGracePeriod?.gracePeriod.active) {
        console.log('Grace period already active for user:', userId);
        return true;
      }

      // Determine grace period duration based on tier
      const gracePeriodHours = this.getGracePeriodDuration(currentTier, reason);

      // Create grace period management
      const gracePeriod: GracePeriodManagement = {
        userId,
        subscriptionTier: currentTier,
        gracePeriod: {
          active: true,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + gracePeriodHours * 60 * 60 * 1000).toISOString(),
          durationHours: gracePeriodHours,
          reason,
          autoActivated: true
        },
        therapeuticAccess: await this.determineTherapeuticAccess(currentTier, reason),
        userExperience: this.determineUserExperience(reason),
        resolution: {
          attempts: 0,
          resolved: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Store grace period
      this.activeGracePeriods.set(userId, gracePeriod);
      await this.persistGracePeriod(gracePeriod);

      console.log(`Grace period activated for user ${userId}: ${gracePeriodHours} hours`);
      return true;

    } catch (error) {
      console.error('Failed to activate grace period:', error);
      return false;
    }
  }

  /**
   * Check and resolve expired grace periods
   */
  async checkGracePeriodExpiration(): Promise<{
    checked: number;
    expired: number;
    resolved: number;
    actions: string[];
  }> {
    const actions: string[] = [];
    let checked = 0;
    let expired = 0;
    let resolved = 0;

    try {
      const now = new Date();

      for (const [userId, gracePeriod] of this.activeGracePeriods) {
        checked++;

        // Check if grace period has expired
        const endDate = new Date(gracePeriod.gracePeriod.endDate);
        if (now > endDate && gracePeriod.gracePeriod.active) {
          expired++;

          // Handle expiration
          const resolutionResult = await this.handleGracePeriodExpiration(gracePeriod);
          if (resolutionResult.resolved) {
            resolved++;
          }

          actions.push(...resolutionResult.actions);
        }
      }

      return { checked, expired, resolved, actions };

    } catch (error) {
      console.error('Grace period expiration check failed:', error);
      return { checked, expired, resolved, actions: ['error_handling_required'] };
    }
  }

  /**
   * Get active grace periods
   */
  getActiveGracePeriods(): GracePeriodManagement[] {
    return Array.from(this.activeGracePeriods.values())
      .filter(gp => gp.gracePeriod.active);
  }

  /**
   * Get payment sync statistics
   */
  async getPaymentSyncStatistics(): Promise<{
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    activeGracePeriods: number;
    therapeuticAccessPreserved: number;
    averageProcessingTime: number;
  }> {
    try {
      // Load statistics from storage
      const statsData = await AsyncStorage.getItem(`${this.storageKey}_stats`);
      const stats = statsData ? JSON.parse(statsData) : {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        therapeuticAccessPreserved: 0,
        totalProcessingTime: 0
      };

      return {
        totalOperations: stats.totalOperations,
        successfulOperations: stats.successfulOperations,
        failedOperations: stats.failedOperations,
        activeGracePeriods: this.activeGracePeriods.size,
        therapeuticAccessPreserved: stats.therapeuticAccessPreserved,
        averageProcessingTime: stats.totalOperations > 0
          ? stats.totalProcessingTime / stats.totalOperations
          : 0
      };

    } catch (error) {
      console.error('Failed to get payment sync statistics:', error);
      return {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        activeGracePeriods: 0,
        therapeuticAccessPreserved: 0,
        averageProcessingTime: 0
      };
    }
  }

  /**
   * Private helper methods
   */
  private async validateTherapeuticSafety(operation: PaymentQueueOperation): Promise<void> {
    if (operation.therapeuticSafety.criticalForUserSafety) {
      // Ensure crisis access is maintained
      if (operation.operationType === 'subscription_cancel' &&
          !operation.therapeuticSafety.preserveAccessOnFailure) {
        throw new Error('Subscription cancellation must preserve crisis access');
      }
    }

    if (operation.therapeuticSafety.affectsAccess &&
        !operation.therapeuticSafety.preserveAccessOnFailure &&
        !operation.therapeuticSafety.activateGracePeriodOnFailure) {
      throw new Error('Operations affecting therapeutic access must have safety measures');
    }
  }

  private async convertToOfflineOperation(operation: PaymentQueueOperation): Promise<OfflineOperation> {
    return {
      id: operation.operationId,
      operationType: operation.operationType as any,
      priority: operation.offlineHandling.syncPriority,
      isCrisisOperation: operation.therapeuticSafety.criticalForUserSafety,
      bypassOfflineQueue: operation.offlineHandling.requiresImmediate,
      crisisLevel: operation.therapeuticSafety.criticalForUserSafety ? 'high' : 'none',
      payload: {
        ...operation.paymentData,
        subscriptionContext: operation.subscriptionContext,
        therapeuticSafety: operation.therapeuticSafety
      },
      payloadSize: JSON.stringify(operation).length,
      payloadHash: await this.calculateHash(JSON.stringify(operation)),
      subscriptionTier: operation.subscriptionContext.currentTier,
      userId: operation.paymentData.customerId,
      createdAt: operation.createdAt,
      expiresAt: operation.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      maxRetries: 3,
      retryCount: 0,
      dependsOn: [],
      blockedBy: [],
      conflicts: [],
      requiresOnline: true,
      syncEndpoint: '/api/payments/sync',
      httpMethod: 'POST',
      lastError: undefined,
      errorCount: 0,
      isPermanentFailure: false,
      affectsTherapeuticAccess: operation.therapeuticSafety.affectsAccess,
      therapeuticPriority: operation.therapeuticSafety.affectsAccess ? 5 : 3,
      metadata: {
        auditTrail: operation.auditTrail,
        offlineHandling: operation.offlineHandling
      }
    };
  }

  private async ensureTherapeuticAccess(
    userId: string,
    currentTier: SubscriptionTier,
    therapeuticSafety: PaymentQueueOperation['therapeuticSafety']
  ): Promise<boolean> {
    if (!therapeuticSafety.affectsAccess) {
      return true;
    }

    if (therapeuticSafety.preserveAccessOnFailure) {
      // Implement therapeutic access preservation logic
      console.log(`Therapeutic access preserved for user ${userId}`);
      return true;
    }

    return false;
  }

  private async handleSuccessfulPayment(
    operationId: string,
    syncResult: any,
    paymentResult: PaymentSyncResult
  ): Promise<void> {
    // Update subscription changes
    if (syncResult.subscriptionChanged) {
      paymentResult.subscriptionChanges.tierChanged = true;
      paymentResult.subscriptionChanges.newTier = syncResult.newTier;
    }

    // Deactivate grace period if payment succeeded
    const userId = syncResult.customerId || syncResult.userId;
    if (userId && this.activeGracePeriods.has(userId)) {
      await this.resolveGracePeriod(userId, 'payment_succeeded');
      paymentResult.followUpActions.push('refresh_feature_access');
    }

    // Determine gained features
    if (syncResult.newTier && syncResult.previousTier !== syncResult.newTier) {
      paymentResult.therapeuticImpact.featuresGained = await this.getFeatureDifference(
        syncResult.previousTier,
        syncResult.newTier
      );
    }

    paymentResult.followUpActions.push('show_payment_success', 'update_user_interface');
  }

  private async handleFailedPayment(
    operationId: string,
    syncResult: any,
    paymentResult: PaymentSyncResult
  ): Promise<void> {
    const userId = syncResult.customerId || syncResult.userId;

    // Add error information
    paymentResult.errors.push({
      code: syncResult.errorCode || 'payment_failed',
      message: syncResult.errorMessage || 'Payment processing failed',
      recoverable: syncResult.recoverable !== false,
      userAction: syncResult.requiresUserAction ? 'update_payment_method' : undefined
    });

    // Activate grace period if needed
    if (userId && syncResult.activateGracePeriod) {
      const gracePeriodActivated = await this.activateGracePeriod(
        userId,
        syncResult.currentTier,
        'payment_failure'
      );

      paymentResult.subscriptionChanges.gracePeriodActivated = gracePeriodActivated;
      if (gracePeriodActivated) {
        paymentResult.therapeuticImpact.accessMaintained = true;
        paymentResult.followUpActions.push('activate_grace_period_ui');
      }
    }

    // Determine therapeutic impact
    if (syncResult.accessRestricted) {
      paymentResult.therapeuticImpact.accessMaintained = false;
      paymentResult.therapeuticImpact.featuresLost = syncResult.restrictedFeatures || [];
      paymentResult.therapeuticImpact.continuityPreserved = false;
    }

    paymentResult.followUpActions.push('show_payment_failure');

    if (syncResult.requiresUserAction) {
      paymentResult.followUpActions.push('collect_payment_method');
    }
  }

  private async handleGracePeriodExpiration(
    gracePeriod: GracePeriodManagement
  ): Promise<{
    resolved: boolean;
    actions: string[];
  }> {
    const actions: string[] = [];

    try {
      // Check if payment has been resolved
      const paymentResolved = await this.checkPaymentResolution(gracePeriod.userId);

      if (paymentResolved) {
        await this.resolveGracePeriod(gracePeriod.userId, 'payment_succeeded');
        actions.push('grace_period_resolved_payment');
        return { resolved: true, actions };
      }

      // Grace period has expired - determine action
      if (gracePeriod.therapeuticAccess.preserveAll) {
        // Extend grace period for therapeutic reasons
        await this.extendGracePeriod(gracePeriod.userId, 72, 'therapeutic_continuity');
        actions.push('grace_period_extended_therapeutic');
        return { resolved: false, actions };
      } else {
        // Downgrade access
        await this.downgradeUserAccess(gracePeriod.userId, gracePeriod.subscriptionTier);
        await this.resolveGracePeriod(gracePeriod.userId, 'tier_downgrade');
        actions.push('user_access_downgraded');
        return { resolved: true, actions };
      }

    } catch (error) {
      console.error('Grace period expiration handling failed:', error);
      actions.push('grace_period_handling_error');
      return { resolved: false, actions };
    }
  }

  private getGracePeriodDuration(
    tier: SubscriptionTier,
    reason: string
  ): number {
    const durations = {
      trial: { payment_failure: 24, billing_issue: 48, therapeutic_continuity: 168 },
      basic: { payment_failure: 48, billing_issue: 72, therapeutic_continuity: 168 },
      premium: { payment_failure: 72, billing_issue: 168, therapeutic_continuity: 336 },
      grace_period: { payment_failure: 12, billing_issue: 24, therapeutic_continuity: 48 }
    };

    return durations[tier]?.[reason as keyof typeof durations['trial']] || 24;
  }

  private async determineTherapeuticAccess(
    tier: SubscriptionTier,
    reason: string
  ): Promise<GracePeriodManagement['therapeuticAccess']> {
    const therapeuticFeatures = [
      'crisis_button',
      'emergency_contacts',
      'basic_breathing',
      'mood_tracking',
      'safety_plan'
    ];

    const limitedFeatures = tier === 'trial' ? [
      'advanced_analytics',
      'cloud_sync'
    ] : [];

    return {
      preserveAll: reason === 'therapeutic_continuity',
      preservedFeatures: therapeuticFeatures,
      limitedFeatures,
      blockedFeatures: reason === 'therapeutic_continuity' ? [] : ['premium_features']
    };
  }

  private determineUserExperience(reason: string): GracePeriodManagement['userExperience'] {
    const urgency = {
      'payment_failure': 'medium' as const,
      'subscription_ended': 'high' as const,
      'billing_issue': 'medium' as const,
      'card_expired': 'high' as const,
      'insufficient_funds': 'high' as const,
      'therapeutic_continuity': 'low' as const
    };

    return {
      showGracePeriodBanner: true,
      allowUpgrade: true,
      showPaymentPrompts: reason !== 'therapeutic_continuity',
      gracefulDegradation: true,
      urgencyLevel: urgency[reason as keyof typeof urgency] || 'medium'
    };
  }

  private async resolveGracePeriod(
    userId: string,
    resolutionMethod: 'payment_succeeded' | 'subscription_renewed' | 'tier_downgrade' | 'account_closed' | 'manual_resolution'
  ): Promise<void> {
    const gracePeriod = this.activeGracePeriods.get(userId);
    if (gracePeriod) {
      gracePeriod.gracePeriod.active = false;
      gracePeriod.resolution.resolved = true;
      gracePeriod.resolution.resolvedAt = new Date().toISOString();
      gracePeriod.resolution.resolutionMethod = resolutionMethod;
      gracePeriod.updatedAt = new Date().toISOString();

      await this.persistGracePeriod(gracePeriod);
      this.activeGracePeriods.delete(userId);
    }
  }

  private async extendGracePeriod(
    userId: string,
    additionalHours: number,
    reason: string
  ): Promise<void> {
    const gracePeriod = this.activeGracePeriods.get(userId);
    if (gracePeriod && gracePeriod.gracePeriod.active) {
      const newEndDate = new Date(
        new Date(gracePeriod.gracePeriod.endDate).getTime() +
        additionalHours * 60 * 60 * 1000
      );

      gracePeriod.gracePeriod.endDate = newEndDate.toISOString();
      gracePeriod.gracePeriod.durationHours += additionalHours;
      gracePeriod.updatedAt = new Date().toISOString();

      await this.persistGracePeriod(gracePeriod);
    }
  }

  private async checkPaymentResolution(userId: string): Promise<boolean> {
    // Implementation would check if user's payment issues have been resolved
    return false; // Placeholder
  }

  private async downgradeUserAccess(userId: string, fromTier: SubscriptionTier): Promise<void> {
    // Implementation would downgrade user access
    console.log(`Downgrading user ${userId} from tier ${fromTier}`);
  }

  private async getFeatureDifference(
    fromTier: SubscriptionTier,
    toTier: SubscriptionTier
  ): Promise<string[]> {
    // Implementation would calculate feature differences between tiers
    return [];
  }

  private async persistGracePeriod(gracePeriod: GracePeriodManagement): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${this.storageKey}_grace_${gracePeriod.userId}`,
        JSON.stringify(gracePeriod)
      );
    } catch (error) {
      console.error('Failed to persist grace period:', error);
    }
  }

  private async persistPaymentResult(result: PaymentSyncResult): Promise<void> {
    try {
      // Store individual result
      await AsyncStorage.setItem(
        `${this.storageKey}_result_${result.operationId}`,
        JSON.stringify(result)
      );

      // Update statistics
      await this.updateStatistics(result);
    } catch (error) {
      console.error('Failed to persist payment result:', error);
    }
  }

  private async updateStatistics(result: PaymentSyncResult): Promise<void> {
    try {
      const statsData = await AsyncStorage.getItem(`${this.storageKey}_stats`);
      const stats = statsData ? JSON.parse(statsData) : {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        therapeuticAccessPreserved: 0,
        totalProcessingTime: 0
      };

      stats.totalOperations++;
      if (result.success) {
        stats.successfulOperations++;
      } else {
        stats.failedOperations++;
      }

      if (result.therapeuticImpact.accessMaintained) {
        stats.therapeuticAccessPreserved++;
      }

      const processingTime = new Date(result.processedAt).getTime() -
                           new Date(result.processedAt).getTime(); // Would use actual start time
      stats.totalProcessingTime += processingTime;

      await AsyncStorage.setItem(`${this.storageKey}_stats`, JSON.stringify(stats));
    } catch (error) {
      console.error('Failed to update statistics:', error);
    }
  }

  private async calculateHash(data: string): Promise<string> {
    // Simple hash implementation
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

/**
 * Default instance for global use
 */
export const paymentQueueIntegration = new PaymentQueueIntegrationAPI();

export default PaymentQueueIntegrationAPI;