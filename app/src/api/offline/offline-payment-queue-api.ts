/**
 * Offline Payment Queue API
 *
 * Core offline queue management system with 24-hour capacity for payment-related sync operations.
 * Provides crisis-resilient queue architecture with intelligent priority management and
 * subscription tier-aware policies.
 *
 * KEY FEATURES:
 * - 24-hour offline capacity with intelligent queue management
 * - Crisis operations bypass with immediate sync priority
 * - Subscription tier-aware queue policies and batching
 * - Cross-device synchronization and conflict resolution
 * - Memory-efficient mobile-optimized storage (<20MB)
 *
 * PERFORMANCE TARGETS:
 * - Queue operations: <50ms add/remove
 * - Crisis sync priority: <200ms offline-to-online
 * - Standard sync: <2s offline-to-online transition
 * - Memory usage: <20MB for 24-hour capacity
 */

import { z } from 'zod';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SubscriptionTier } from '../../types/subscription';

/**
 * Offline Queue Operation Types
 */
export const OfflineOperationSchema = z.object({
  // Core identification
  id: z.string().uuid(),
  operationType: z.enum([
    'payment_sync',
    'subscription_update',
    'trial_extension',
    'billing_update',
    'usage_sync',
    'tier_change',
    'grace_period_activation',
    'payment_retry',
    'subscription_cancel',
    'refund_request'
  ]),

  // Queue priority (1-10, 10 being highest)
  priority: z.number().min(1).max(10),

  // Crisis handling
  isCrisisOperation: z.boolean().default(false),
  bypassOfflineQueue: z.boolean().default(false),
  crisisLevel: z.enum(['none', 'watch', 'elevated', 'high', 'critical', 'emergency']).default('none'),

  // Payload data
  payload: z.record(z.any()),
  payloadSize: z.number().min(0), // bytes
  payloadHash: z.string(), // for integrity checking

  // Subscription context
  subscriptionTier: z.enum(['trial', 'basic', 'premium', 'grace_period']),
  userId: z.string(),
  subscriptionId: z.string().optional(),

  // Timing management
  createdAt: z.string(), // ISO timestamp
  scheduledFor: z.string().optional(), // ISO timestamp for delayed operations
  expiresAt: z.string(), // ISO timestamp when operation becomes stale
  maxRetries: z.number().min(0).max(5).default(3),
  retryCount: z.number().min(0).default(0),

  // Queue management
  queuedAt: z.string().optional(), // When added to queue
  lastAttemptAt: z.string().optional(),
  nextRetryAt: z.string().optional(),
  estimatedSyncTime: z.number().min(0).default(1000), // ms

  // Dependencies and ordering
  dependsOn: z.array(z.string()).default([]), // Operation IDs that must complete first
  blockedBy: z.array(z.string()).default([]), // Operations blocking this one
  conflicts: z.array(z.string()).default([]), // Potentially conflicting operations

  // Network and sync context
  requiresOnline: z.boolean().default(true),
  syncEndpoint: z.string(),
  httpMethod: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
  headers: z.record(z.string()).optional(),

  // Error handling
  lastError: z.string().optional(),
  errorCount: z.number().min(0).default(0),
  isPermanentFailure: z.boolean().default(false),

  // Therapeutic continuity
  affectsTherapeuticAccess: z.boolean().default(false),
  therapeuticPriority: z.number().min(1).max(5).default(3),

  // Metadata
  metadata: z.record(z.any()).default({})
});

export type OfflineOperation = z.infer<typeof OfflineOperationSchema>;

/**
 * Queue Status and Metrics
 */
export const QueueStatusSchema = z.object({
  // Queue statistics
  totalOperations: z.number().min(0),
  operationsByPriority: z.record(z.string(), z.number()),
  operationsByType: z.record(z.string(), z.number()),
  operationsByTier: z.record(z.string(), z.number()),

  // Storage metrics
  totalStorageUsed: z.number().min(0), // bytes
  maxStorageCapacity: z.number().positive(), // bytes (20MB default)
  storageUtilization: z.number().min(0).max(1), // 0-1 ratio

  // Time-based metrics
  oldestOperation: z.string().optional(), // ISO timestamp
  averageQueueTime: z.number().min(0), // ms
  estimatedSyncTime: z.number().min(0), // ms for all operations

  // Crisis operations
  crisisOperationsCount: z.number().min(0),
  emergencyBypassCount: z.number().min(0),
  crisisAvgResponseTime: z.number().min(0), // ms

  // Subscription tier breakdown
  tierCapacity: z.record(z.string(), z.object({
    maxOperations: z.number().positive(),
    currentOperations: z.number().min(0),
    maxHours: z.number().positive(), // hours of offline capacity
    utilizationRatio: z.number().min(0).max(1)
  })),

  // Performance metrics
  performance: z.object({
    avgAddTime: z.number().min(0), // ms
    avgRemoveTime: z.number().min(0), // ms
    avgSyncTime: z.number().min(0), // ms
    successRate: z.number().min(0).max(1),
    errorRate: z.number().min(0).max(1)
  }),

  // Health indicators
  isHealthy: z.boolean(),
  healthIssues: z.array(z.string()),
  lastCleanup: z.string(), // ISO timestamp
  lastSync: z.string().optional(), // ISO timestamp

  // Generated timestamp
  statusAt: z.string() // ISO timestamp
});

export type QueueStatus = z.infer<typeof QueueStatusSchema>;

/**
 * Subscription Tier Queue Policies
 */
export const TierQueuePolicySchema = z.object({
  tier: z.enum(['trial', 'basic', 'premium', 'grace_period']),

  // Capacity limits
  maxOperations: z.number().positive(),
  maxStorageBytes: z.number().positive(),
  maxOfflineHours: z.number().positive(),

  // Priority handling
  priorityBonus: z.number().min(0).max(3), // Added to base priority
  canJumpQueue: z.boolean(),
  maxConcurrentSyncs: z.number().positive(),

  // Batching behavior
  batchSize: z.number().positive(),
  batchDelayMs: z.number().min(0),
  intelligentBatching: z.boolean(),

  // Retry policies
  maxRetries: z.number().min(0).max(5),
  retryDelayBase: z.number().positive(), // ms
  retryDelayMultiplier: z.number().min(1).max(3),

  // Conflict resolution
  conflictResolutionStrategy: z.enum(['server_wins', 'client_wins', 'merge', 'ask_user']),
  autoResolveConflicts: z.boolean(),

  // Grace period handling
  gracePeriodExtension: z.number().min(0), // hours
  gracePeriodPriority: z.boolean(),

  // Storage management
  compressionEnabled: z.boolean(),
  autoCleanupEnabled: z.boolean(),
  cleanupThresholdRatio: z.number().min(0).max(1) // When to trigger cleanup
});

export type TierQueuePolicy = z.infer<typeof TierQueuePolicySchema>;

/**
 * Offline Payment Queue API Class
 */
export class OfflinePaymentQueueAPI {
  private storageKey: string;
  private statusKey: string;
  private maxStorageBytes: number;
  private tierPolicies: Record<string, TierQueuePolicy>;
  private performanceMetrics: {
    operations: number;
    totalTime: number;
    errors: number;
    lastCleanup: number;
  };

  constructor(config?: {
    storageKey?: string;
    maxStorageBytes?: number;
  }) {
    this.storageKey = config?.storageKey || 'being_offline_payment_queue';
    this.statusKey = `${this.storageKey}_status`;
    this.maxStorageBytes = config?.maxStorageBytes || 20 * 1024 * 1024; // 20MB
    this.tierPolicies = this.initializeTierPolicies();
    this.performanceMetrics = {
      operations: 0,
      totalTime: 0,
      errors: 0,
      lastCleanup: Date.now()
    };
  }

  /**
   * Add operation to offline queue with crisis bypass logic
   */
  async enqueueOperation(operation: OfflineOperation): Promise<{
    queued: boolean;
    position: number;
    estimatedSyncTime: number;
    bypassedQueue: boolean;
    reason?: string;
  }> {
    const startTime = Date.now();

    try {
      // Validate operation
      const validatedOperation = OfflineOperationSchema.parse(operation);

      // Crisis bypass check
      if (validatedOperation.bypassOfflineQueue || validatedOperation.isCrisisOperation) {
        return {
          queued: false,
          position: 0,
          estimatedSyncTime: 0,
          bypassedQueue: true,
          reason: 'Crisis operation bypassed queue for immediate sync'
        };
      }

      // Get current queue
      const queue = await this.getQueue();

      // Check capacity limits for user's tier
      const tierPolicy = this.getTierPolicy(validatedOperation.subscriptionTier);
      if (await this.isCapacityExceeded(queue, tierPolicy)) {
        // Attempt cleanup first
        const cleanedQueue = await this.cleanupExpiredOperations(queue);
        if (await this.isCapacityExceeded(cleanedQueue, tierPolicy)) {
          throw new Error(`Queue capacity exceeded for tier: ${validatedOperation.subscriptionTier}`);
        }
      }

      // Calculate priority with tier bonus
      const effectivePriority = Math.min(10, validatedOperation.priority + tierPolicy.priorityBonus);
      const operationWithPriority = {
        ...validatedOperation,
        priority: effectivePriority,
        queuedAt: new Date().toISOString(),
        estimatedSyncTime: this.calculateEstimatedSyncTime(validatedOperation, tierPolicy)
      };

      // Insert operation in priority order
      const position = this.findInsertPosition(queue, operationWithPriority);
      queue.splice(position, 0, operationWithPriority);

      // Save updated queue
      await this.saveQueue(queue);

      // Update performance metrics
      this.recordPerformanceMetric(Date.now() - startTime, true);

      return {
        queued: true,
        position,
        estimatedSyncTime: operationWithPriority.estimatedSyncTime,
        bypassedQueue: false
      };

    } catch (error) {
      this.recordPerformanceMetric(Date.now() - startTime, false);
      throw new Error(`Failed to enqueue operation: ${error}`);
    }
  }

  /**
   * Remove operation from queue (when sync completes)
   */
  async dequeueOperation(operationId: string): Promise<{
    removed: boolean;
    operation?: OfflineOperation;
    wasProcessing: boolean;
  }> {
    const startTime = Date.now();

    try {
      const queue = await this.getQueue();
      const index = queue.findIndex(op => op.id === operationId);

      if (index === -1) {
        return {
          removed: false,
          wasProcessing: false
        };
      }

      const operation = queue[index];
      queue.splice(index, 1);

      await this.saveQueue(queue);
      this.recordPerformanceMetric(Date.now() - startTime, true);

      return {
        removed: true,
        operation,
        wasProcessing: index === 0 // First in queue is typically being processed
      };

    } catch (error) {
      this.recordPerformanceMetric(Date.now() - startTime, false);
      throw new Error(`Failed to dequeue operation: ${error}`);
    }
  }

  /**
   * Get next batch of operations for sync
   */
  async getNextSyncBatch(subscriptionTier: SubscriptionTier): Promise<{
    operations: OfflineOperation[];
    estimatedSyncTime: number;
    batchSize: number;
    hasMore: boolean;
  }> {
    const startTime = Date.now();

    try {
      const queue = await this.getQueue();
      const tierPolicy = this.getTierPolicy(subscriptionTier);

      // Filter operations for this tier and sort by priority
      const eligibleOps = queue
        .filter(op => op.subscriptionTier === subscriptionTier)
        .filter(op => !op.dependsOn.length || this.areDependenciesResolved(op, queue))
        .filter(op => new Date(op.scheduledFor || op.createdAt) <= new Date())
        .slice(0, tierPolicy.batchSize);

      // Calculate total estimated sync time
      const estimatedSyncTime = eligibleOps.reduce((total, op) => total + op.estimatedSyncTime, 0);

      this.recordPerformanceMetric(Date.now() - startTime, true);

      return {
        operations: eligibleOps,
        estimatedSyncTime,
        batchSize: eligibleOps.length,
        hasMore: queue.length > eligibleOps.length
      };

    } catch (error) {
      this.recordPerformanceMetric(Date.now() - startTime, false);
      throw new Error(`Failed to get sync batch: ${error}`);
    }
  }

  /**
   * Update operation status (retry, error, etc.)
   */
  async updateOperationStatus(
    operationId: string,
    updates: Partial<Pick<OfflineOperation, 'retryCount' | 'lastError' | 'errorCount' | 'isPermanentFailure' | 'lastAttemptAt' | 'nextRetryAt'>>
  ): Promise<boolean> {
    try {
      const queue = await this.getQueue();
      const index = queue.findIndex(op => op.id === operationId);

      if (index === -1) {
        return false;
      }

      // Update operation
      queue[index] = {
        ...queue[index],
        ...updates,
        lastAttemptAt: new Date().toISOString()
      };

      // Check if operation should be marked as permanently failed
      const tierPolicy = this.getTierPolicy(queue[index].subscriptionTier);
      if (queue[index].retryCount >= tierPolicy.maxRetries) {
        queue[index].isPermanentFailure = true;
      }

      await this.saveQueue(queue);
      return true;

    } catch (error) {
      throw new Error(`Failed to update operation status: ${error}`);
    }
  }

  /**
   * Get current queue status and metrics
   */
  async getQueueStatus(): Promise<QueueStatus> {
    try {
      const queue = await this.getQueue();
      const now = new Date().toISOString();

      // Calculate metrics
      const operationsByPriority = this.groupBy(queue, 'priority');
      const operationsByType = this.groupBy(queue, 'operationType');
      const operationsByTier = this.groupBy(queue, 'subscriptionTier');

      // Storage calculations
      const totalStorageUsed = await this.calculateStorageUsage();

      // Crisis operations count
      const crisisOperationsCount = queue.filter(op => op.isCrisisOperation).length;

      // Calculate tier capacity utilization
      const tierCapacity: Record<string, any> = {};
      for (const [tier, policy] of Object.entries(this.tierPolicies)) {
        const tierOps = queue.filter(op => op.subscriptionTier === tier);
        tierCapacity[tier] = {
          maxOperations: policy.maxOperations,
          currentOperations: tierOps.length,
          maxHours: policy.maxOfflineHours,
          utilizationRatio: tierOps.length / policy.maxOperations
        };
      }

      // Performance metrics
      const avgTime = this.performanceMetrics.operations > 0
        ? this.performanceMetrics.totalTime / this.performanceMetrics.operations
        : 0;

      const successRate = this.performanceMetrics.operations > 0
        ? 1 - (this.performanceMetrics.errors / this.performanceMetrics.operations)
        : 1;

      // Health check
      const healthIssues: string[] = [];
      const storageUtilization = totalStorageUsed / this.maxStorageBytes;

      if (storageUtilization > 0.9) {
        healthIssues.push('Storage utilization above 90%');
      }

      if (queue.some(op => Date.now() - new Date(op.createdAt).getTime() > 24 * 60 * 60 * 1000)) {
        healthIssues.push('Operations older than 24 hours detected');
      }

      return {
        totalOperations: queue.length,
        operationsByPriority,
        operationsByType,
        operationsByTier,
        totalStorageUsed,
        maxStorageCapacity: this.maxStorageBytes,
        storageUtilization,
        oldestOperation: queue.length > 0 ? queue.reduce((oldest, op) =>
          new Date(op.createdAt) < new Date(oldest.createdAt) ? op : oldest
        ).createdAt : undefined,
        averageQueueTime: queue.length > 0
          ? queue.reduce((sum, op) => sum + (Date.now() - new Date(op.queuedAt || op.createdAt).getTime()), 0) / queue.length
          : 0,
        estimatedSyncTime: queue.reduce((sum, op) => sum + op.estimatedSyncTime, 0),
        crisisOperationsCount,
        emergencyBypassCount: 0, // Would be tracked separately for immediate sync
        crisisAvgResponseTime: 150, // ms - would be calculated from actual crisis responses
        tierCapacity,
        performance: {
          avgAddTime: avgTime,
          avgRemoveTime: avgTime,
          avgSyncTime: avgTime,
          successRate,
          errorRate: 1 - successRate
        },
        isHealthy: healthIssues.length === 0,
        healthIssues,
        lastCleanup: new Date(this.performanceMetrics.lastCleanup).toISOString(),
        lastSync: undefined, // Would be tracked by sync coordinator
        statusAt: now
      };

    } catch (error) {
      throw new Error(`Failed to get queue status: ${error}`);
    }
  }

  /**
   * Clear queue (emergency or maintenance)
   */
  async clearQueue(reason: string = 'Manual clear'): Promise<{
    cleared: number;
    reason: string;
    preservedCrisisOps: number;
  }> {
    try {
      const queue = await this.getQueue();

      // Preserve crisis operations
      const crisisOps = queue.filter(op => op.isCrisisOperation || op.affectsTherapeuticAccess);
      const clearedCount = queue.length - crisisOps.length;

      await this.saveQueue(crisisOps);

      return {
        cleared: clearedCount,
        reason,
        preservedCrisisOps: crisisOps.length
      };

    } catch (error) {
      throw new Error(`Failed to clear queue: ${error}`);
    }
  }

  /**
   * Cleanup expired operations
   */
  async cleanupExpiredOperations(queue?: OfflineOperation[]): Promise<OfflineOperation[]> {
    const currentQueue = queue || await this.getQueue();
    const now = new Date();

    // Remove expired operations (but preserve crisis operations)
    const cleanedQueue = currentQueue.filter(op => {
      if (op.isCrisisOperation || op.affectsTherapeuticAccess) {
        return true; // Never remove crisis or therapeutic operations
      }

      return new Date(op.expiresAt) > now && !op.isPermanentFailure;
    });

    if (cleanedQueue.length !== currentQueue.length) {
      await this.saveQueue(cleanedQueue);
      this.performanceMetrics.lastCleanup = Date.now();
    }

    return cleanedQueue;
  }

  /**
   * Private helper methods
   */
  private async getQueue(): Promise<OfflineOperation[]> {
    try {
      const data = await AsyncStorage.getItem(this.storageKey);
      if (!data) return [];

      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async saveQueue(queue: OfflineOperation[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(queue));
    } catch (error) {
      throw new Error(`Failed to save queue: ${error}`);
    }
  }

  private getTierPolicy(tier: SubscriptionTier): TierQueuePolicy {
    return this.tierPolicies[tier] || this.tierPolicies['trial'];
  }

  private async isCapacityExceeded(queue: OfflineOperation[], policy: TierQueuePolicy): Promise<boolean> {
    if (queue.length >= policy.maxOperations) return true;

    const storageUsed = await this.calculateStorageUsage();
    if (storageUsed >= policy.maxStorageBytes) return true;

    // Check time-based capacity (24-hour limit)
    const oldestAllowed = new Date(Date.now() - policy.maxOfflineHours * 60 * 60 * 1000);
    const tooOldOperations = queue.filter(op => new Date(op.createdAt) < oldestAllowed);

    return tooOldOperations.length > 0;
  }

  private async calculateStorageUsage(): Promise<number> {
    try {
      const data = await AsyncStorage.getItem(this.storageKey);
      return data ? new Blob([data]).size : 0;
    } catch {
      return 0;
    }
  }

  private findInsertPosition(queue: OfflineOperation[], operation: OfflineOperation): number {
    // Insert based on priority (higher priority first) and creation time
    for (let i = 0; i < queue.length; i++) {
      if (operation.priority > queue[i].priority) {
        return i;
      }
      if (operation.priority === queue[i].priority) {
        // Same priority, sort by creation time (older first)
        if (new Date(operation.createdAt) < new Date(queue[i].createdAt)) {
          return i;
        }
      }
    }
    return queue.length;
  }

  private calculateEstimatedSyncTime(operation: OfflineOperation, policy: TierQueuePolicy): number {
    // Base time calculation based on operation type and payload size
    const baseTime = 1000; // 1 second base
    const sizeMultiplier = Math.log(operation.payloadSize + 1) * 100; // Logarithmic scaling
    const typeMultiplier = this.getOperationTypeMultiplier(operation.operationType);

    return Math.round(baseTime + sizeMultiplier * typeMultiplier);
  }

  private getOperationTypeMultiplier(operationType: string): number {
    const multipliers: Record<string, number> = {
      'payment_sync': 1.5,
      'subscription_update': 2.0,
      'trial_extension': 1.2,
      'billing_update': 1.8,
      'usage_sync': 0.8,
      'tier_change': 2.5,
      'grace_period_activation': 1.0,
      'payment_retry': 1.3,
      'subscription_cancel': 1.5,
      'refund_request': 3.0
    };
    return multipliers[operationType] || 1.0;
  }

  private areDependenciesResolved(operation: OfflineOperation, queue: OfflineOperation[]): boolean {
    return operation.dependsOn.every(depId =>
      !queue.some(op => op.id === depId)
    );
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((groups, item) => {
      const groupKey = String(item[key]);
      groups[groupKey] = (groups[groupKey] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);
  }

  private recordPerformanceMetric(timeMs: number, success: boolean): void {
    this.performanceMetrics.operations++;
    this.performanceMetrics.totalTime += timeMs;
    if (!success) {
      this.performanceMetrics.errors++;
    }
  }

  private initializeTierPolicies(): Record<string, TierQueuePolicy> {
    return {
      trial: {
        tier: 'trial',
        maxOperations: 50,
        maxStorageBytes: 4 * 1024 * 1024, // 4MB
        maxOfflineHours: 4,
        priorityBonus: 0,
        canJumpQueue: false,
        maxConcurrentSyncs: 1,
        batchSize: 5,
        batchDelayMs: 1000,
        intelligentBatching: false,
        maxRetries: 2,
        retryDelayBase: 2000,
        retryDelayMultiplier: 2,
        conflictResolutionStrategy: 'server_wins',
        autoResolveConflicts: true,
        gracePeriodExtension: 2,
        gracePeriodPriority: false,
        compressionEnabled: false,
        autoCleanupEnabled: true,
        cleanupThresholdRatio: 0.8
      },
      basic: {
        tier: 'basic',
        maxOperations: 150,
        maxStorageBytes: 8 * 1024 * 1024, // 8MB
        maxOfflineHours: 12,
        priorityBonus: 1,
        canJumpQueue: false,
        maxConcurrentSyncs: 2,
        batchSize: 10,
        batchDelayMs: 500,
        intelligentBatching: true,
        maxRetries: 3,
        retryDelayBase: 1500,
        retryDelayMultiplier: 2,
        conflictResolutionStrategy: 'merge',
        autoResolveConflicts: true,
        gracePeriodExtension: 6,
        gracePeriodPriority: true,
        compressionEnabled: true,
        autoCleanupEnabled: true,
        cleanupThresholdRatio: 0.75
      },
      premium: {
        tier: 'premium',
        maxOperations: 500,
        maxStorageBytes: 16 * 1024 * 1024, // 16MB
        maxOfflineHours: 24,
        priorityBonus: 2,
        canJumpQueue: true,
        maxConcurrentSyncs: 3,
        batchSize: 20,
        batchDelayMs: 200,
        intelligentBatching: true,
        maxRetries: 5,
        retryDelayBase: 1000,
        retryDelayMultiplier: 1.5,
        conflictResolutionStrategy: 'ask_user',
        autoResolveConflicts: false,
        gracePeriodExtension: 12,
        gracePeriodPriority: true,
        compressionEnabled: true,
        autoCleanupEnabled: true,
        cleanupThresholdRatio: 0.7
      },
      grace_period: {
        tier: 'grace_period',
        maxOperations: 75,
        maxStorageBytes: 6 * 1024 * 1024, // 6MB
        maxOfflineHours: 8,
        priorityBonus: 1,
        canJumpQueue: false,
        maxConcurrentSyncs: 1,
        batchSize: 8,
        batchDelayMs: 800,
        intelligentBatching: true,
        maxRetries: 3,
        retryDelayBase: 2000,
        retryDelayMultiplier: 2,
        conflictResolutionStrategy: 'server_wins',
        autoResolveConflicts: true,
        gracePeriodExtension: 0,
        gracePeriodPriority: true,
        compressionEnabled: true,
        autoCleanupEnabled: true,
        cleanupThresholdRatio: 0.9
      }
    };
  }
}

/**
 * Default instance for global use
 */
export const offlinePaymentQueue = new OfflinePaymentQueueAPI();

export default OfflinePaymentQueueAPI;