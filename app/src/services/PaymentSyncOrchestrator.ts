/**
 * Payment-Aware Sync Orchestrator - Day 19 Phase 2
 *
 * Extends SyncOrchestrationService with payment awareness ensuring
 * subscription tiers control sync behavior while maintaining crisis safety.
 *
 * Key Features:
 * - Tier-based sync frequency and data limits
 * - Payment validation before sync operations
 * - Crisis bypass for mental health emergencies
 * - Grace period sync handling during payment failures
 * - Integration with existing sync infrastructure
 */

import { EventEmitter } from 'events';
import { paymentAwareSyncContext, PaymentSyncContextResult } from './cloud/PaymentAwareSyncContext';
import { usePaymentStore } from '../store/paymentStore';
import {
  SyncStatus,
  SyncOperation,
  SyncOperationType,
  SyncEntityType,
  SyncConflict,
  ConflictType,
  ConflictResolution,
  StoreSyncStatus,
  AppSyncState,
  SyncConfiguration,
  SyncMetadata,
  SyncableData,
  SyncProgress,
  SyncError,
  SyncErrorType,
  SyncPerformanceMetrics,
  SyncAuditEntry,
  SYNC_CONSTANTS
} from '../types/sync';
import { SubscriptionTier, SubscriptionState } from '../types/subscription';
import { CrisisPaymentOverride } from '../types/payment';

/**
 * Payment-aware sync configuration
 */
export interface PaymentSyncConfiguration extends SyncConfiguration {
  paymentSettings: {
    validatePaymentBeforeSync: boolean;
    gracePeriodDays: number;
    crisisOverrideEnabled: boolean;
    trialSyncLimitMB: number;
    basicSyncLimitMB: number;
    premiumSyncLimitMB: number;
    emergencyContactNumber: string;
  };
  tierSyncIntervals: Record<SubscriptionTier, number>; // minutes
  tierPriorities: Record<SubscriptionTier, number>; // 1-10
}

/**
 * Payment sync operation with payment context
 */
export interface PaymentSyncOperation extends SyncOperation {
  paymentContext: PaymentSyncContextResult;
  subscriptionTier: SubscriptionTier;
  gracePeriodSync: boolean;
  crisisOverride: CrisisPaymentOverride | null;
}

/**
 * Payment-aware sync state
 */
export interface PaymentAwareSyncState extends AppSyncState {
  paymentSyncStatus: {
    subscriptionTier: SubscriptionTier;
    subscriptionActive: boolean;
    gracePeriodActive: boolean;
    gracePeriodEndsAt?: string;
    syncAllowance: {
      remaining: number; // MB
      total: number; // MB
      resetDate: string;
    };
    lastPaymentValidation: string;
    crisisMode: boolean;
    emergencyBypassActive: boolean;
  };
  tierLimits: {
    maxConcurrentSyncs: number;
    maxSyncSize: number;
    syncInterval: number;
    allowedEntityTypes: SyncEntityType[];
  };
}

/**
 * Enhanced sync orchestrator with payment awareness
 */
export class PaymentSyncOrchestrator extends EventEmitter {
  private static instance: PaymentSyncOrchestrator;

  // Core state
  private isInitialized = false;
  private syncInProgress = false;
  private activeSyncs = new Map<string, PaymentSyncOperation>();
  private syncQueue: PaymentSyncOperation[] = [];
  private configuration: PaymentSyncConfiguration;
  private syncState: PaymentAwareSyncState;
  private performanceMetrics: SyncPerformanceMetrics;

  // Payment-specific state
  private lastPaymentCheck = 0;
  private paymentCheckInterval = 30000; // 30 seconds
  private crisisMode = false;
  private gracePeriodWarningShown = false;

  // Timers
  private syncTimer?: NodeJS.Timeout;
  private paymentCheckTimer?: NodeJS.Timeout;
  private healthCheckTimer?: NodeJS.Timeout;

  public static getInstance(): PaymentSyncOrchestrator {
    if (!PaymentSyncOrchestrator.instance) {
      PaymentSyncOrchestrator.instance = new PaymentSyncOrchestrator();
    }
    return PaymentSyncOrchestrator.instance;
  }

  constructor() {
    super();
    this.configuration = this.getDefaultConfiguration();
    this.syncState = this.getInitialSyncState();
    this.performanceMetrics = this.getInitialPerformanceMetrics();
  }

  /**
   * Initialize payment-aware sync orchestrator
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load persisted sync state
      await this.loadSyncState();

      // Validate current payment status
      await this.validatePaymentStatus();

      // Setup sync intervals based on subscription tier
      this.setupTierBasedSyncSchedule();

      // Start payment validation timer
      this.startPaymentValidationTimer();

      // Start health monitoring
      this.startHealthMonitoring();

      this.isInitialized = true;
      this.emit('initialized', { paymentAware: true });

    } catch (error) {
      console.error('PaymentSyncOrchestrator initialization failed:', error);
      throw new Error(`Sync orchestrator initialization failed: ${error}`);
    }
  }

  /**
   * Queue sync operation with payment validation
   */
  public async queueSyncOperation(
    type: SyncOperationType,
    entityType: SyncEntityType,
    data: SyncableData,
    options: {
      priority?: number;
      clinicalSafety?: boolean;
      crisisMode?: boolean;
      dependsOn?: string[];
    } = {}
  ): Promise<{ success: boolean; operationId?: string; error?: string }> {
    const startTime = performance.now();

    try {
      // Evaluate payment context for this operation
      const paymentContext = await paymentAwareSyncContext.evaluateSyncContext({
        entityType,
        priority: options.priority || 5,
        clinicalSafety: options.clinicalSafety || false,
        data
      }, options.crisisMode);

      // Check if operation is allowed
      if (!paymentContext.allowed && !paymentContext.crisisMode) {
        return {
          success: false,
          error: `Sync not allowed: ${paymentContext.reasons.join(', ')}`
        };
      }

      // Create payment-aware sync operation
      const operation = await this.createPaymentSyncOperation(
        type,
        entityType,
        data,
        paymentContext,
        options
      );

      // Add to queue with payment-aware priority
      this.addToSyncQueue(operation);

      // Process queue immediately if crisis mode
      if (paymentContext.crisisMode) {
        await this.processCrisisSync(operation);
      }

      const processingTime = performance.now() - startTime;
      this.updatePerformanceMetrics('queue_operation', processingTime);

      return {
        success: true,
        operationId: operation.id
      };

    } catch (error) {
      console.error('Failed to queue sync operation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process crisis sync operation immediately
   */
  private async processCrisisSync(operation: PaymentSyncOperation): Promise<void> {
    const startTime = performance.now();

    try {
      // Mark as crisis mode
      this.crisisMode = true;
      this.emit('crisis_mode_activated', { operationId: operation.id });

      // Execute sync with highest priority
      operation.priority = 10;

      // Remove from queue and execute immediately
      this.removeFromSyncQueue(operation.id);
      await this.executeSyncOperation(operation);

      const processingTime = performance.now() - startTime;

      // Validate crisis response time requirement
      if (processingTime > 200) {
        console.warn(`Crisis sync exceeded 200ms requirement: ${processingTime}ms`);
        this.emit('performance_violation', {
          type: 'crisis_response_time',
          actual: processingTime,
          expected: 200,
          operationId: operation.id
        });
      }

    } catch (error) {
      console.error('Crisis sync failed:', error);
      this.emit('crisis_sync_failed', { operationId: operation.id, error });
    } finally {
      this.crisisMode = false;
    }
  }

  /**
   * Validate current payment status
   */
  private async validatePaymentStatus(): Promise<void> {
    const now = Date.now();

    // Skip if recently checked
    if (now - this.lastPaymentCheck < this.paymentCheckInterval) {
      return;
    }

    try {
      // Get payment state from store
      const paymentState = this.getPaymentState();

      // Update sync state with payment info
      this.syncState.paymentSyncStatus = {
        subscriptionTier: paymentState.tier,
        subscriptionActive: paymentState.subscriptionStatus === 'active',
        gracePeriodActive: paymentState.gracePeriodActive,
        gracePeriodEndsAt: paymentState.gracePeriodEndsAt,
        syncAllowance: this.calculateSyncAllowance(paymentState.tier),
        lastPaymentValidation: new Date().toISOString(),
        crisisMode: this.crisisMode,
        emergencyBypassActive: false
      };

      // Update tier limits
      this.updateTierLimits(paymentState.tier);

      // Show grace period warning if needed
      if (paymentState.gracePeriodActive && !this.gracePeriodWarningShown) {
        this.emit('grace_period_warning', {
          daysRemaining: this.calculateGracePeriodDays(paymentState.gracePeriodEndsAt)
        });
        this.gracePeriodWarningShown = true;
      }

      this.lastPaymentCheck = now;
      this.emit('payment_status_validated', this.syncState.paymentSyncStatus);

    } catch (error) {
      console.error('Payment status validation failed:', error);

      // Fallback to basic tier for safety
      this.updateTierLimits('basic');
    }
  }

  /**
   * Setup tier-based sync schedule
   */
  private setupTierBasedSyncSchedule(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    const syncInterval = paymentAwareSyncContext.getSyncInterval();
    const intervalMs = syncInterval * 60 * 1000; // Convert to milliseconds

    this.syncTimer = setInterval(async () => {
      if (!this.syncInProgress) {
        await this.processSyncQueue();
      }
    }, intervalMs);

    this.emit('sync_schedule_updated', { intervalMinutes: syncInterval });
  }

  /**
   * Process sync queue with payment awareness
   */
  private async processSyncQueue(): Promise<void> {
    if (this.syncInProgress || this.syncQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    const startTime = performance.now();

    try {
      // Validate payment status before processing
      await this.validatePaymentStatus();

      // Sort queue by payment-aware priority
      this.sortQueueByPaymentPriority();

      // Get max concurrent syncs for current tier
      const maxConcurrent = paymentAwareSyncContext.getMaxConcurrentSyncs();
      const operations = this.syncQueue.splice(0, maxConcurrent);

      // Execute operations in parallel
      const promises = operations.map(op => this.executeSyncOperation(op));
      const results = await Promise.allSettled(promises);

      // Handle results
      results.forEach((result, index) => {
        const operation = operations[index];
        if (result.status === 'fulfilled') {
          this.emit('sync_operation_completed', { operationId: operation.id });
        } else {
          this.emit('sync_operation_failed', {
            operationId: operation.id,
            error: result.reason
          });

          // Re-queue if retryable
          if (operation.retryCount < operation.maxRetries) {
            operation.retryCount++;
            this.addToSyncQueue(operation);
          }
        }
      });

      const processingTime = performance.now() - startTime;
      this.updatePerformanceMetrics('queue_processing', processingTime);

    } catch (error) {
      console.error('Sync queue processing failed:', error);
      this.emit('sync_queue_error', { error });
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Execute individual sync operation
   */
  private async executeSyncOperation(operation: PaymentSyncOperation): Promise<void> {
    const startTime = performance.now();

    try {
      this.activeSyncs.set(operation.id, operation);
      this.emit('sync_operation_started', { operationId: operation.id });

      // Simulate sync execution (would integrate with CloudSyncAPI)
      await this.performActualSync(operation);

      const processingTime = performance.now() - startTime;

      // Validate performance requirements
      if (operation.paymentContext.crisisMode && processingTime > 200) {
        console.warn(`Crisis operation ${operation.id} exceeded 200ms: ${processingTime}ms`);
      }

      this.updatePerformanceMetrics('sync_operation', processingTime);

    } catch (error) {
      console.error(`Sync operation ${operation.id} failed:`, error);
      throw error;
    } finally {
      this.activeSyncs.delete(operation.id);
    }
  }

  /**
   * Perform actual sync (integrates with existing sync infrastructure)
   */
  private async performActualSync(operation: PaymentSyncOperation): Promise<void> {
    // This would integrate with CloudSyncAPI and other sync services
    // For now, simulate the operation
    const delay = operation.paymentContext.crisisMode ? 50 : 500;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Helper methods
  private getPaymentState() {
    // Mock payment state - would integrate with actual payment store
    return {
      tier: 'premium' as SubscriptionTier,
      subscriptionStatus: 'active' as SubscriptionState,
      gracePeriodActive: false,
      gracePeriodEndsAt: undefined
    };
  }

  private calculateSyncAllowance(tier: SubscriptionTier) {
    const limits = {
      trial: 100, // 100MB
      basic: 1000, // 1GB
      premium: Number.MAX_SAFE_INTEGER
    };

    return {
      remaining: limits[tier],
      total: limits[tier],
      resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    };
  }

  private updateTierLimits(tier: SubscriptionTier): void {
    const maxConcurrent = paymentAwareSyncContext.getMaxConcurrentSyncs();
    const syncInterval = paymentAwareSyncContext.getSyncInterval();

    this.syncState.tierLimits = {
      maxConcurrentSyncs: maxConcurrent,
      maxSyncSize: tier === 'premium' ? Number.MAX_SAFE_INTEGER : 100 * 1024 * 1024,
      syncInterval,
      allowedEntityTypes: tier === 'trial'
        ? ['check_in', 'user_profile', 'crisis_plan']
        : ['check_in', 'user_profile', 'assessment', 'crisis_plan', 'widget_data', 'session_data']
    };
  }

  private calculateGracePeriodDays(gracePeriodEndsAt?: string): number {
    if (!gracePeriodEndsAt) return 0;
    const endDate = new Date(gracePeriodEndsAt);
    const now = new Date();
    const diffMs = endDate.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  private async createPaymentSyncOperation(
    type: SyncOperationType,
    entityType: SyncEntityType,
    data: SyncableData,
    paymentContext: PaymentSyncContextResult,
    options: any
  ): Promise<PaymentSyncOperation> {
    const operationId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: operationId,
      type,
      entityType,
      entityId: (data as any).id || operationId,
      priority: paymentContext.priority,
      data,
      metadata: {
        entityId: (data as any).id || operationId,
        entityType,
        version: 1,
        lastModified: new Date().toISOString(),
        checksum: 'checksum',
        deviceId: 'device',
        userId: 'user'
      },
      conflictResolution: 'client_wins',
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 3,
      dependencies: options.dependsOn || [],
      clinicalSafety: options.clinicalSafety || false,
      paymentContext,
      subscriptionTier: paymentContext.metadata.subscriptionTier,
      gracePeriodSync: paymentContext.gracePeriod,
      crisisOverride: paymentContext.metadata.crisisOverride
    };
  }

  private addToSyncQueue(operation: PaymentSyncOperation): void {
    this.syncQueue.push(operation);
    this.sortQueueByPaymentPriority();
  }

  private removeFromSyncQueue(operationId: string): void {
    this.syncQueue = this.syncQueue.filter(op => op.id !== operationId);
  }

  private sortQueueByPaymentPriority(): void {
    this.syncQueue.sort((a, b) => {
      // Crisis operations first
      if (a.paymentContext.crisisMode && !b.paymentContext.crisisMode) return -1;
      if (!a.paymentContext.crisisMode && b.paymentContext.crisisMode) return 1;

      // Then by priority
      return b.priority - a.priority;
    });
  }

  private startPaymentValidationTimer(): void {
    this.paymentCheckTimer = setInterval(async () => {
      await this.validatePaymentStatus();
    }, this.paymentCheckInterval);
  }

  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(() => {
      this.emit('health_check', {
        activeSyncs: this.activeSyncs.size,
        queueLength: this.syncQueue.length,
        syncInProgress: this.syncInProgress,
        crisisMode: this.crisisMode
      });
    }, 60000); // Every minute
  }

  private updatePerformanceMetrics(operation: string, duration: number): void {
    // Update performance tracking
    this.performanceMetrics.totalOperations++;
    this.performanceMetrics.averageLatency =
      (this.performanceMetrics.averageLatency + duration) / 2;
  }

  private getDefaultConfiguration(): PaymentSyncConfiguration {
    return {
      maxRetries: 3,
      batchSize: 10,
      timeoutMs: 30000,
      compressionEnabled: true,
      conflictResolutionStrategy: 'client_wins',
      backgroundSyncEnabled: true,
      backgroundSyncIntervalMinutes: 60,
      paymentSettings: {
        validatePaymentBeforeSync: true,
        gracePeriodDays: 7,
        crisisOverrideEnabled: true,
        trialSyncLimitMB: 10,
        basicSyncLimitMB: 100,
        premiumSyncLimitMB: 0, // unlimited
        emergencyContactNumber: '988'
      },
      tierSyncIntervals: {
        trial: 15,
        basic: 60,
        premium: 5
      },
      tierPriorities: {
        trial: 3,
        basic: 5,
        premium: 8
      }
    };
  }

  private getInitialSyncState(): PaymentAwareSyncState {
    return {
      status: SyncStatus.IDLE,
      lastSync: null,
      lastSuccessfulSync: null,
      pendingOperations: 0,
      conflictsCount: 0,
      errors: [],
      performance: {
        averageLatency: 0,
        successRate: 100,
        dataTransferred: 0
      },
      paymentSyncStatus: {
        subscriptionTier: 'trial',
        subscriptionActive: false,
        gracePeriodActive: false,
        syncAllowance: {
          remaining: 10 * 1024 * 1024, // 10MB
          total: 10 * 1024 * 1024,
          resetDate: new Date().toISOString()
        },
        lastPaymentValidation: new Date().toISOString(),
        crisisMode: false,
        emergencyBypassActive: false
      },
      tierLimits: {
        maxConcurrentSyncs: 2,
        maxSyncSize: 10 * 1024 * 1024,
        syncInterval: 15,
        allowedEntityTypes: ['check_in', 'user_profile', 'crisis_plan']
      }
    };
  }

  private getInitialPerformanceMetrics(): SyncPerformanceMetrics {
    return {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageLatency: 0,
      dataTransferred: 0,
      conflictsResolved: 0,
      lastStatsReset: new Date().toISOString(),
      syncEfficiency: 1.0
    };
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.syncTimer) clearInterval(this.syncTimer);
    if (this.paymentCheckTimer) clearInterval(this.paymentCheckTimer);
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);

    this.isInitialized = false;
    this.removeAllListeners();
  }
}

// Export singleton instance
export const paymentSyncOrchestrator = PaymentSyncOrchestrator.getInstance();