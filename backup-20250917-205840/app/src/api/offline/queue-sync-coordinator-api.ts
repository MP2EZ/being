/**
 * Queue Sync Coordinator API
 *
 * Manages the critical transition from offline to online operations, providing intelligent
 * batching, crisis-prioritized sync, and therapeutic continuity preservation during
 * connectivity changes.
 *
 * KEY RESPONSIBILITIES:
 * - Online/offline transition coordination
 * - Crisis data immediate sync (<200ms)
 * - Bandwidth-optimized progressive upload
 * - Conflict resolution with server state
 * - Cross-device synchronization coordination
 *
 * PERFORMANCE TARGETS:
 * - Crisis sync: <200ms offline-to-online
 * - Standard sync: <2s offline-to-online
 * - Conflict resolution: <500ms
 * - Bandwidth optimization: 60% reduction in data transfer
 */

import { z } from 'zod';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { OfflinePaymentQueueAPI, type OfflineOperation } from './offline-payment-queue-api';
import type { SubscriptionTier } from '../../types/subscription';

/**
 * Sync Status and Coordination Types
 */
export const SyncStatusSchema = z.object({
  // Overall sync state
  status: z.enum([
    'offline',
    'connecting',
    'syncing',
    'online',
    'error',
    'paused'
  ]),

  // Connection quality
  connectionQuality: z.enum(['poor', 'fair', 'good', 'excellent']).optional(),
  bandwidth: z.object({
    downlink: z.number().optional(), // Mbps
    uplink: z.number().optional(),
    effectiveType: z.string().optional() // '2g', '3g', '4g', '5g'
  }).optional(),

  // Sync progress
  syncProgress: z.object({
    totalOperations: z.number().min(0),
    completedOperations: z.number().min(0),
    failedOperations: z.number().min(0),
    remainingOperations: z.number().min(0),
    estimatedTimeRemaining: z.number().min(0), // ms
    bytesTransferred: z.number().min(0),
    totalBytes: z.number().min(0)
  }),

  // Crisis sync tracking
  crisisSyncStatus: z.object({
    hasCrisisOperations: z.boolean(),
    crisisOperationsCompleted: z.number().min(0),
    crisisOperationsFailed: z.number().min(0),
    averageCrisisResponseTime: z.number().min(0), // ms
    lastCrisisSync: z.string().optional() // ISO timestamp
  }),

  // Batch information
  currentBatch: z.object({
    batchId: z.string().optional(),
    operationsInBatch: z.number().min(0),
    batchStartTime: z.string().optional(), // ISO timestamp
    estimatedBatchTime: z.number().min(0) // ms
  }),

  // Error tracking
  lastError: z.string().optional(),
  errorCount: z.number().min(0).default(0),
  retryAttempts: z.number().min(0).default(0),

  // Performance metrics
  performance: z.object({
    syncSpeed: z.number().min(0), // operations per second
    averageOperationTime: z.number().min(0), // ms
    compressionRatio: z.number().min(0).max(1), // 0-1
    cacheMissRate: z.number().min(0).max(1)
  }),

  // Timestamps
  lastSyncAttempt: z.string().optional(), // ISO timestamp
  lastSuccessfulSync: z.string().optional(),
  nextScheduledSync: z.string().optional(),
  statusUpdatedAt: z.string() // ISO timestamp
});

export type SyncStatus = z.infer<typeof SyncStatusSchema>;

/**
 * Conflict Resolution Types
 */
export const ConflictSchema = z.object({
  conflictId: z.string().uuid(),
  operationId: z.string().uuid(),

  // Conflict details
  conflictType: z.enum([
    'data_version_mismatch',
    'simultaneous_update',
    'deleted_on_server',
    'permission_changed',
    'schema_mismatch',
    'payment_state_conflict'
  ]),

  // Data states
  clientData: z.record(z.any()),
  serverData: z.record(z.any()),

  // Resolution strategy
  resolutionStrategy: z.enum([
    'client_wins',
    'server_wins',
    'merge_fields',
    'user_choice',
    'latest_timestamp'
  ]),

  // Conflict context
  fieldConflicts: z.array(z.object({
    field: z.string(),
    clientValue: z.any(),
    serverValue: z.any(),
    canMerge: z.boolean()
  })),

  // Resolution state
  isResolved: z.boolean(),
  resolvedAt: z.string().optional(), // ISO timestamp
  resolvedBy: z.enum(['system', 'user', 'policy']).optional(),
  resolution: z.record(z.any()).optional(),

  // Priority and urgency
  priority: z.number().min(1).max(10),
  affectsTherapeuticAccess: z.boolean(),
  blocksSyncProgress: z.boolean(),

  // Timestamps
  detectedAt: z.string(), // ISO timestamp
  mustResolveBy: z.string().optional() // ISO timestamp for urgent conflicts
});

export type Conflict = z.infer<typeof ConflictSchema>;

/**
 * Bandwidth Optimization Configuration
 */
export const BandwidthConfigSchema = z.object({
  // Connection-based policies
  connectionType: z.enum(['wifi', 'cellular', 'other']),
  connectionQuality: z.enum(['poor', 'fair', 'good', 'excellent']),

  // Optimization settings
  enableCompression: z.boolean(),
  compressionLevel: z.number().min(1).max(9).default(6),
  enableDeltaSync: z.boolean(),
  maxPayloadSize: z.number().positive(), // bytes

  // Batching configuration
  maxBatchSize: z.number().positive(),
  batchTimeoutMs: z.number().positive(),
  prioritizedBatching: z.boolean(),

  // Retry configuration
  maxRetries: z.number().min(0).max(10),
  retryDelayMs: z.number().positive(),
  exponentialBackoff: z.boolean(),

  // Data prioritization
  prioritizeMetadata: z.boolean(),
  prioritizeCrisisData: z.boolean(),
  skipNonEssentialData: z.boolean()
});

export type BandwidthConfig = z.infer<typeof BandwidthConfigSchema>;

/**
 * Queue Sync Coordinator API Class
 */
export class QueueSyncCoordinatorAPI {
  private queueAPI: OfflinePaymentQueueAPI;
  private syncStatus: SyncStatus;
  private activeConflicts: Map<string, Conflict>;
  private bandwidthConfig: BandwidthConfig;
  private syncInProgress: boolean;
  private abortController: AbortController | null;

  constructor(queueAPI?: OfflinePaymentQueueAPI) {
    this.queueAPI = queueAPI || new OfflinePaymentQueueAPI();
    this.syncStatus = this.initializeSyncStatus();
    this.activeConflicts = new Map();
    this.bandwidthConfig = this.getDefaultBandwidthConfig();
    this.syncInProgress = false;
    this.abortController = null;

    // Initialize network monitoring
    this.initializeNetworkMonitoring();
  }

  /**
   * Start comprehensive sync operation
   */
  async startSync(options: {
    subscriptionTier: SubscriptionTier;
    forceCrisisSync?: boolean;
    maxDuration?: number; // ms
    onProgress?: (status: SyncStatus) => void;
  }): Promise<{
    success: boolean;
    syncedOperations: number;
    failedOperations: number;
    conflicts: number;
    syncTime: number; // ms
    crisisOperationsSynced: number;
  }> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    const startTime = Date.now();
    this.syncInProgress = true;
    this.abortController = new AbortController();

    try {
      // Update sync status to "connecting"
      await this.updateSyncStatus('connecting');
      options.onProgress?.(this.syncStatus);

      // Check network connectivity
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        throw new Error('No network connection available');
      }

      // Configure bandwidth optimization
      await this.optimizeBandwidthConfig(networkState);

      // Update status to "syncing"
      await this.updateSyncStatus('syncing');

      let totalSynced = 0;
      let totalFailed = 0;
      let crisisSynced = 0;
      let conflictCount = 0;

      // Phase 1: Emergency/Crisis operations first
      if (options.forceCrisisSync) {
        const crisisResult = await this.syncCrisisOperations(options.subscriptionTier);
        crisisSynced = crisisResult.synced;
        totalSynced += crisisResult.synced;
        totalFailed += crisisResult.failed;
        conflictCount += crisisResult.conflicts;

        options.onProgress?.(this.syncStatus);
      }

      // Phase 2: Standard sync operations in batches
      const standardResult = await this.syncStandardOperations(options.subscriptionTier, options.onProgress);
      totalSynced += standardResult.synced;
      totalFailed += standardResult.failed;
      conflictCount += standardResult.conflicts;

      // Phase 3: Resolve any remaining conflicts
      const resolvedConflicts = await this.resolveActiveConflicts();

      // Update final status
      const finalStatus = totalFailed === 0 ? 'online' : 'error';
      await this.updateSyncStatus(finalStatus);

      const syncTime = Date.now() - startTime;

      return {
        success: totalFailed === 0,
        syncedOperations: totalSynced,
        failedOperations: totalFailed,
        conflicts: conflictCount,
        syncTime,
        crisisOperationsSynced: crisisSynced
      };

    } catch (error) {
      await this.updateSyncStatus('error');
      this.syncStatus.lastError = String(error);
      throw error;

    } finally {
      this.syncInProgress = false;
      this.abortController = null;
    }
  }

  /**
   * Sync crisis operations with <200ms target
   */
  private async syncCrisisOperations(subscriptionTier: SubscriptionTier): Promise<{
    synced: number;
    failed: number;
    conflicts: number;
  }> {
    const startTime = Date.now();
    let synced = 0;
    let failed = 0;
    let conflicts = 0;

    try {
      // Get crisis operations from queue
      const queue = await this.queueAPI.getQueue();
      const crisisOps = queue
        .filter(op => op.isCrisisOperation || op.bypassOfflineQueue)
        .sort((a, b) => b.priority - a.priority); // Highest priority first

      for (const operation of crisisOps) {
        try {
          const syncResult = await this.syncSingleOperation(operation, true);

          if (syncResult.success) {
            await this.queueAPI.dequeueOperation(operation.id);
            synced++;
          } else {
            if (syncResult.conflict) {
              conflicts++;
              await this.registerConflict(syncResult.conflict);
            } else {
              failed++;
            }
          }

          // Ensure we stay within crisis response time target
          if (Date.now() - startTime > 200) {
            console.warn('Crisis sync exceeded 200ms target');
            break;
          }

        } catch (error) {
          console.error(`Crisis operation ${operation.id} sync failed:`, error);
          failed++;
        }
      }

      // Update crisis sync metrics
      this.syncStatus.crisisSyncStatus.crisisOperationsCompleted = synced;
      this.syncStatus.crisisSyncStatus.crisisOperationsFailed = failed;
      this.syncStatus.crisisSyncStatus.averageCrisisResponseTime =
        crisisOps.length > 0 ? (Date.now() - startTime) / crisisOps.length : 0;
      this.syncStatus.crisisSyncStatus.lastCrisisSync = new Date().toISOString();

      return { synced, failed, conflicts };

    } catch (error) {
      console.error('Crisis operations sync failed:', error);
      return { synced, failed: crisisOps?.length || 0, conflicts };
    }
  }

  /**
   * Sync standard operations in optimized batches
   */
  private async syncStandardOperations(
    subscriptionTier: SubscriptionTier,
    onProgress?: (status: SyncStatus) => void
  ): Promise<{
    synced: number;
    failed: number;
    conflicts: number;
  }> {
    let totalSynced = 0;
    let totalFailed = 0;
    let totalConflicts = 0;

    try {
      while (true) {
        // Get next batch of operations
        const batchResult = await this.queueAPI.getNextSyncBatch(subscriptionTier);

        if (batchResult.operations.length === 0) {
          break; // No more operations to sync
        }

        // Update batch information
        const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.syncStatus.currentBatch = {
          batchId,
          operationsInBatch: batchResult.operations.length,
          batchStartTime: new Date().toISOString(),
          estimatedBatchTime: batchResult.estimatedSyncTime
        };

        // Sync batch operations
        const batchSyncResult = await this.syncBatch(batchResult.operations, batchId);

        totalSynced += batchSyncResult.synced;
        totalFailed += batchSyncResult.failed;
        totalConflicts += batchSyncResult.conflicts;

        // Update progress
        this.syncStatus.syncProgress.completedOperations += batchSyncResult.synced;
        this.syncStatus.syncProgress.failedOperations += batchSyncResult.failed;
        this.syncStatus.syncProgress.remainingOperations -= batchResult.operations.length;

        onProgress?.(this.syncStatus);

        // Check if we should continue or pause
        if (this.abortController?.signal.aborted) {
          break;
        }

        // Brief pause between batches for system resources
        await new Promise(resolve => setTimeout(resolve, this.bandwidthConfig.batchTimeoutMs));
      }

      return {
        synced: totalSynced,
        failed: totalFailed,
        conflicts: totalConflicts
      };

    } catch (error) {
      console.error('Standard operations sync failed:', error);
      throw error;
    }
  }

  /**
   * Sync a batch of operations
   */
  private async syncBatch(operations: OfflineOperation[], batchId: string): Promise<{
    synced: number;
    failed: number;
    conflicts: number;
  }> {
    let synced = 0;
    let failed = 0;
    let conflicts = 0;

    // Process operations in parallel within bandwidth limits
    const concurrentLimit = Math.min(3, operations.length);
    const batches = this.chunkArray(operations, concurrentLimit);

    for (const batch of batches) {
      const promises = batch.map(operation => this.syncSingleOperation(operation, false));

      try {
        const results = await Promise.all(promises);

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const operation = batch[i];

          if (result.success) {
            await this.queueAPI.dequeueOperation(operation.id);
            synced++;
          } else {
            if (result.conflict) {
              conflicts++;
              await this.registerConflict(result.conflict);
            } else {
              failed++;
              // Update operation with error info
              await this.queueAPI.updateOperationStatus(operation.id, {
                retryCount: operation.retryCount + 1,
                lastError: result.error,
                errorCount: operation.errorCount + 1,
                lastAttemptAt: new Date().toISOString()
              });
            }
          }
        }

      } catch (error) {
        console.error(`Batch ${batchId} sync failed:`, error);
        failed += batch.length;
      }
    }

    return { synced, failed, conflicts };
  }

  /**
   * Sync individual operation
   */
  private async syncSingleOperation(
    operation: OfflineOperation,
    isCrisisOperation: boolean
  ): Promise<{
    success: boolean;
    conflict?: Conflict;
    error?: string;
    responseTime: number;
  }> {
    const startTime = Date.now();

    try {
      // Prepare request
      const requestOptions: RequestInit = {
        method: operation.httpMethod,
        headers: {
          'Content-Type': 'application/json',
          'X-Operation-Id': operation.id,
          'X-Crisis-Operation': isCrisisOperation.toString(),
          'X-Subscription-Tier': operation.subscriptionTier,
          'X-Payload-Hash': operation.payloadHash,
          ...operation.headers
        },
        body: operation.httpMethod !== 'GET' ? JSON.stringify(operation.payload) : undefined,
        signal: this.abortController?.signal
      };

      // Add compression if enabled
      if (this.bandwidthConfig.enableCompression && operation.payloadSize > 1024) {
        requestOptions.headers!['Content-Encoding'] = 'gzip';
        // Note: Actual compression would be implemented here
      }

      // Make request
      const response = await fetch(operation.syncEndpoint, requestOptions);
      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        if (response.status === 409) {
          // Conflict detected
          const serverData = await response.json();
          const conflict = await this.createConflictFromResponse(operation, serverData);
          return {
            success: false,
            conflict,
            responseTime
          };
        }

        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          responseTime
        };
      }

      return {
        success: true,
        responseTime
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;

      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Operation aborted',
          responseTime
        };
      }

      return {
        success: false,
        error: String(error),
        responseTime
      };
    }
  }

  /**
   * Network monitoring and optimization
   */
  private initializeNetworkMonitoring(): void {
    NetInfo.addEventListener(state => {
      this.handleNetworkStateChange(state);
    });
  }

  private async handleNetworkStateChange(state: NetInfoState): Promise<void> {
    const wasOnline = this.syncStatus.status === 'online';
    const isOnline = state.isConnected === true;

    if (!wasOnline && isOnline) {
      // Just came online - trigger sync
      console.log('Network connection restored, triggering sync');
      this.updateSyncStatus('connecting');
    } else if (wasOnline && !isOnline) {
      // Lost connection
      console.log('Network connection lost');
      this.updateSyncStatus('offline');

      // Abort any ongoing sync
      if (this.syncInProgress && this.abortController) {
        this.abortController.abort();
      }
    }
  }

  /**
   * Bandwidth optimization based on network conditions
   */
  private async optimizeBandwidthConfig(networkState: NetInfoState): Promise<void> {
    const isWifi = networkState.type === 'wifi';
    const isCellular = networkState.type === 'cellular';

    // Get connection quality metrics
    let quality: 'poor' | 'fair' | 'good' | 'excellent' = 'good';

    if ('effectiveType' in networkState.details) {
      switch (networkState.details.effectiveType) {
        case '2g':
          quality = 'poor';
          break;
        case '3g':
          quality = 'fair';
          break;
        case '4g':
          quality = 'good';
          break;
        case '5g':
          quality = 'excellent';
          break;
      }
    }

    this.bandwidthConfig = {
      connectionType: isWifi ? 'wifi' : isCellular ? 'cellular' : 'other',
      connectionQuality: quality,
      enableCompression: quality === 'poor' || quality === 'fair',
      compressionLevel: quality === 'poor' ? 9 : 6,
      enableDeltaSync: true,
      maxPayloadSize: quality === 'poor' ? 50 * 1024 : quality === 'fair' ? 200 * 1024 : 1024 * 1024,
      maxBatchSize: quality === 'poor' ? 3 : quality === 'fair' ? 8 : 20,
      batchTimeoutMs: quality === 'poor' ? 2000 : quality === 'fair' ? 1000 : 500,
      prioritizedBatching: true,
      maxRetries: quality === 'poor' ? 5 : 3,
      retryDelayMs: quality === 'poor' ? 3000 : 1500,
      exponentialBackoff: true,
      prioritizeMetadata: true,
      prioritizeCrisisData: true,
      skipNonEssentialData: quality === 'poor'
    };
  }

  /**
   * Conflict resolution
   */
  private async registerConflict(conflict: Conflict): Promise<void> {
    this.activeConflicts.set(conflict.conflictId, conflict);

    // Auto-resolve if policy allows
    if (conflict.resolutionStrategy !== 'user_choice') {
      await this.autoResolveConflict(conflict);
    }
  }

  private async autoResolveConflict(conflict: Conflict): Promise<boolean> {
    try {
      let resolvedData: Record<string, any>;

      switch (conflict.resolutionStrategy) {
        case 'server_wins':
          resolvedData = conflict.serverData;
          break;

        case 'client_wins':
          resolvedData = conflict.clientData;
          break;

        case 'latest_timestamp':
          const clientTime = new Date(conflict.clientData.updatedAt || 0).getTime();
          const serverTime = new Date(conflict.serverData.updatedAt || 0).getTime();
          resolvedData = clientTime > serverTime ? conflict.clientData : conflict.serverData;
          break;

        case 'merge_fields':
          resolvedData = this.mergeConflictingFields(conflict);
          break;

        default:
          return false; // Cannot auto-resolve
      }

      // Apply resolution
      conflict.isResolved = true;
      conflict.resolvedAt = new Date().toISOString();
      conflict.resolvedBy = 'system';
      conflict.resolution = resolvedData;

      this.activeConflicts.set(conflict.conflictId, conflict);
      return true;

    } catch (error) {
      console.error('Auto-resolve conflict failed:', error);
      return false;
    }
  }

  private mergeConflictingFields(conflict: Conflict): Record<string, any> {
    const merged = { ...conflict.serverData };

    for (const fieldConflict of conflict.fieldConflicts) {
      if (fieldConflict.canMerge) {
        // Simple merge strategy - prefer client for certain fields, server for others
        const preferClientFields = ['userPreferences', 'localSettings', 'draftData'];

        if (preferClientFields.includes(fieldConflict.field)) {
          merged[fieldConflict.field] = fieldConflict.clientValue;
        }
        // Otherwise keep server value (already in merged)
      }
    }

    return merged;
  }

  private async resolveActiveConflicts(): Promise<number> {
    let resolved = 0;

    for (const [conflictId, conflict] of this.activeConflicts) {
      if (!conflict.isResolved) {
        if (await this.autoResolveConflict(conflict)) {
          resolved++;
        }
      }
    }

    return resolved;
  }

  /**
   * Utility methods
   */
  private async updateSyncStatus(status: SyncStatus['status']): Promise<void> {
    this.syncStatus.status = status;
    this.syncStatus.statusUpdatedAt = new Date().toISOString();

    if (status === 'syncing') {
      this.syncStatus.lastSyncAttempt = this.syncStatus.statusUpdatedAt;
    } else if (status === 'online') {
      this.syncStatus.lastSuccessfulSync = this.syncStatus.statusUpdatedAt;
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private async createConflictFromResponse(
    operation: OfflineOperation,
    serverResponse: any
  ): Promise<Conflict> {
    return {
      conflictId: crypto.randomUUID(),
      operationId: operation.id,
      conflictType: 'data_version_mismatch',
      clientData: operation.payload,
      serverData: serverResponse.data || serverResponse,
      resolutionStrategy: 'server_wins', // Default strategy
      fieldConflicts: [], // Would be populated by detailed comparison
      isResolved: false,
      priority: operation.priority,
      affectsTherapeuticAccess: operation.affectsTherapeuticAccess,
      blocksSyncProgress: operation.priority > 7,
      detectedAt: new Date().toISOString()
    };
  }

  private initializeSyncStatus(): SyncStatus {
    return {
      status: 'offline',
      syncProgress: {
        totalOperations: 0,
        completedOperations: 0,
        failedOperations: 0,
        remainingOperations: 0,
        estimatedTimeRemaining: 0,
        bytesTransferred: 0,
        totalBytes: 0
      },
      crisisSyncStatus: {
        hasCrisisOperations: false,
        crisisOperationsCompleted: 0,
        crisisOperationsFailed: 0,
        averageCrisisResponseTime: 0
      },
      currentBatch: {
        operationsInBatch: 0,
        estimatedBatchTime: 0
      },
      errorCount: 0,
      retryAttempts: 0,
      performance: {
        syncSpeed: 0,
        averageOperationTime: 0,
        compressionRatio: 0,
        cacheMissRate: 0
      },
      statusUpdatedAt: new Date().toISOString()
    };
  }

  private getDefaultBandwidthConfig(): BandwidthConfig {
    return {
      connectionType: 'wifi',
      connectionQuality: 'good',
      enableCompression: false,
      compressionLevel: 6,
      enableDeltaSync: true,
      maxPayloadSize: 1024 * 1024, // 1MB
      maxBatchSize: 10,
      batchTimeoutMs: 1000,
      prioritizedBatching: true,
      maxRetries: 3,
      retryDelayMs: 1500,
      exponentialBackoff: true,
      prioritizeMetadata: true,
      prioritizeCrisisData: true,
      skipNonEssentialData: false
    };
  }

  /**
   * Public API methods
   */
  public async getSyncStatus(): Promise<SyncStatus> {
    return { ...this.syncStatus };
  }

  public async getActiveConflicts(): Promise<Conflict[]> {
    return Array.from(this.activeConflicts.values());
  }

  public async pauseSync(): Promise<void> {
    if (this.syncInProgress && this.abortController) {
      this.abortController.abort();
    }
    await this.updateSyncStatus('paused');
  }

  public async resumeSync(): Promise<void> {
    if (this.syncStatus.status === 'paused') {
      await this.updateSyncStatus('offline');
    }
  }
}

/**
 * Default instance for global use
 */
export const queueSyncCoordinator = new QueueSyncCoordinatorAPI();

export default QueueSyncCoordinatorAPI;