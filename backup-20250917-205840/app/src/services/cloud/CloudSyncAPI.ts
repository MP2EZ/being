/**
 * Cloud Sync API - Zero-Knowledge Data Synchronization
 *
 * RESTful API endpoints for encrypted data sync with Supabase
 * Implements secure batch operations, conflict resolution, and audit logging
 */

import { SupabaseClient, Session } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  EncryptedDataContainer,
  CloudSyncOperation,
  CloudSyncError,
  CloudConflict,
  CloudAuditEntry,
  CloudSyncStats,
  CLOUD_CONSTANTS,
  EncryptedDataContainerSchema,
  CloudSyncOperationSchema
} from '../../types/cloud';
import { SyncStatus, ConflictType } from '../../types/sync';
import { supabaseClient } from './SupabaseClient';
import { createSupabaseDatabaseHelpers } from './SupabaseSchema';

/**
 * API request and response schemas
 */
const SyncBatchRequestSchema = z.object({
  operations: z.array(CloudSyncOperationSchema).max(CLOUD_CONSTANTS.MAX_BATCH_OPERATIONS),
  deviceId: z.string().min(1),
  timestamp: z.string().datetime(),
  checksum: z.string().min(64) // SHA-256
}).readonly();

const SyncBatchResponseSchema = z.object({
  success: z.boolean(),
  processed: z.number(),
  failed: z.number(),
  conflicts: z.array(z.object({
    operationId: z.string(),
    conflictType: z.string(),
    conflictId: z.string()
  })),
  errors: z.array(z.object({
    operationId: z.string(),
    error: z.string(),
    retryable: z.boolean()
  })),
  nextSyncToken: z.string().optional(),
  serverTimestamp: z.string().datetime()
}).readonly();

type SyncBatchRequest = z.infer<typeof SyncBatchRequestSchema>;
type SyncBatchResponse = z.infer<typeof SyncBatchResponseSchema>;

/**
 * Cloud Sync API Client for secure data operations
 */
export class CloudSyncAPI {
  private client: SupabaseClient | null = null;
  private dbHelpers: ReturnType<typeof createSupabaseDatabaseHelpers> | null = null;
  private currentSession: Session | null = null;
  private rateLimitTracker: Map<string, number[]> = new Map();

  constructor() {
    this.initialize();
  }

  /**
   * Initialize API client
   */
  private async initialize(): Promise<void> {
    this.client = supabaseClient.getClient();
    if (this.client) {
      this.dbHelpers = createSupabaseDatabaseHelpers(this.client);
      this.currentSession = supabaseClient.getSession();
    }
  }

  /**
   * Check if API is ready for operations
   */
  public isReady(): boolean {
    return !!(this.client && this.dbHelpers && this.currentSession);
  }

  /**
   * Ensure client is initialized and authenticated
   */
  private async ensureReady(): Promise<void> {
    if (!this.isReady()) {
      await this.initialize();

      if (!this.isReady()) {
        throw new Error('Cloud sync API not available - authentication required');
      }
    }
  }

  /**
   * Rate limiting check
   */
  private checkRateLimit(operation: string): boolean {
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const maxRequests = 100; // Max requests per window

    const requests = this.rateLimitTracker.get(operation) || [];
    const recentRequests = requests.filter(time => now - time < windowMs);

    if (recentRequests.length >= maxRequests) {
      return false;
    }

    recentRequests.push(now);
    this.rateLimitTracker.set(operation, recentRequests);
    return true;
  }

  /**
   * Batch sync operations for efficient data transfer
   */
  public async syncBatch(request: SyncBatchRequest): Promise<SyncBatchResponse> {
    await this.ensureReady();

    // Validate request
    try {
      SyncBatchRequestSchema.parse(request);
    } catch (error) {
      throw new Error(`Invalid sync batch request: ${error}`);
    }

    // Check rate limiting
    if (!this.checkRateLimit('sync_batch')) {
      throw new Error('Rate limit exceeded for batch sync operations');
    }

    const startTime = Date.now();
    const response: SyncBatchResponse = {
      success: false,
      processed: 0,
      failed: 0,
      conflicts: [],
      errors: [],
      serverTimestamp: new Date().toISOString()
    };

    try {
      // Process operations in order for consistency
      for (const operation of request.operations) {
        try {
          const result = await this.processOperation(operation);

          if (result.success) {
            response.processed++;
          } else if (result.conflict) {
            response.conflicts.push({
              operationId: operation.id,
              conflictType: result.conflict.conflictType,
              conflictId: result.conflict.id
            });
          } else {
            response.failed++;
            response.errors.push({
              operationId: operation.id,
              error: result.error || 'Unknown error',
              retryable: result.retryable || false
            });
          }

        } catch (error) {
          response.failed++;
          response.errors.push({
            operationId: operation.id,
            error: error instanceof Error ? error.message : 'Processing failed',
            retryable: true
          });
        }
      }

      response.success = response.failed === 0;

      // Log batch operation for audit
      await this.logBatchOperation(request, response, Date.now() - startTime);

      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Batch sync failed';

      await this.logBatchError(request, errorMessage, Date.now() - startTime);

      throw new Error(`Batch sync failed: ${errorMessage}`);
    }
  }

  /**
   * Process individual sync operation
   */
  private async processOperation(operation: CloudSyncOperation): Promise<{
    success: boolean;
    conflict?: CloudConflict;
    error?: string;
    retryable?: boolean;
  }> {
    if (!this.dbHelpers || !this.currentSession) {
      return { success: false, error: 'API not ready', retryable: true };
    }

    try {
      switch (operation.type) {
        case 'upload':
          return await this.processUpload(operation);

        case 'download':
          return await this.processDownload(operation);

        case 'delete':
          return await this.processDelete(operation);

        case 'resolve_conflict':
          return await this.processConflictResolution(operation);

        default:
          return { success: false, error: `Unknown operation type: ${operation.type}`, retryable: false };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Operation failed',
        retryable: true
      };
    }
  }

  /**
   * Process upload operation
   */
  private async processUpload(operation: CloudSyncOperation): Promise<{
    success: boolean;
    conflict?: CloudConflict;
    error?: string;
  }> {
    if (!operation.encryptedPayload || !this.dbHelpers) {
      return { success: false, error: 'Missing encrypted payload for upload' };
    }

    try {
      // Parse encrypted container
      const container = JSON.parse(operation.encryptedPayload) as EncryptedDataContainer;

      // Validate container structure
      if (!EncryptedDataContainerSchema.safeParse(container).success) {
        return { success: false, error: 'Invalid encrypted data container' };
      }

      // Check for existing data to detect conflicts
      const existing = await this.dbHelpers.getEncryptedData(
        container.userId,
        container.entityType
      );

      if (existing.success && existing.data) {
        const existingItem = existing.data.find(item => item.id === container.id);

        if (existingItem && existingItem.metadata.version !== container.metadata.version) {
          // Version conflict detected
          const conflict: CloudConflict = {
            id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            entityType: container.entityType,
            entityId: container.id,
            conflictType: ConflictType.VERSION_MISMATCH,
            localVersion: container.metadata.version,
            cloudVersion: existingItem.metadata.cloudVersion,
            localData: container,
            cloudData: existingItem,
            detectedAt: new Date().toISOString(),
            autoResolvable: this.isAutoResolvableConflict(container, existingItem),
            clinicalRelevant: this.isClinicalRelevant(container.entityType)
          };

          await this.storeConflict(conflict);
          return { success: false, conflict };
        }
      }

      // Store encrypted data
      const storeResult = await this.dbHelpers.storeEncryptedData(container);

      if (!storeResult.success) {
        return { success: false, error: storeResult.error };
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload processing failed'
      };
    }
  }

  /**
   * Process download operation
   */
  private async processDownload(operation: CloudSyncOperation): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!this.dbHelpers || !this.currentSession) {
      return { success: false, error: 'API not ready' };
    }

    try {
      const result = await this.dbHelpers.getEncryptedData(
        this.currentSession.user.id,
        operation.entityType,
        operation.metadata.lastCloudSync
      );

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Download operations are processed by the caller
      // We just validate the request here
      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download processing failed'
      };
    }
  }

  /**
   * Process delete operation
   */
  private async processDelete(operation: CloudSyncOperation): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!this.client || !this.currentSession) {
      return { success: false, error: 'API not ready' };
    }

    try {
      const { error } = await this.client
        .from('encrypted_data')
        .delete()
        .eq('user_id', this.currentSession.user.id)
        .eq('entity_type', operation.entityType)
        .eq('entity_id', operation.metadata.entityId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete processing failed'
      };
    }
  }

  /**
   * Process conflict resolution
   */
  private async processConflictResolution(operation: CloudSyncOperation): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!this.client || !this.currentSession) {
      return { success: false, error: 'API not ready' };
    }

    try {
      // Mark conflict as resolved
      const { error } = await this.client
        .from('sync_conflicts')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: 'system',
          resolution_strategy: operation.metadata.entityType
        })
        .eq('id', operation.metadata.entityId)
        .eq('user_id', this.currentSession.user.id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Conflict resolution failed'
      };
    }
  }

  /**
   * Check if conflict can be auto-resolved
   */
  private isAutoResolvableConflict(local: EncryptedDataContainer, cloud: EncryptedDataContainer): boolean {
    // Auto-resolve if timestamps are significantly different (>1 hour)
    const localTime = new Date(local.updatedAt).getTime();
    const cloudTime = new Date(cloud.updatedAt).getTime();
    const timeDiff = Math.abs(localTime - cloudTime);

    return timeDiff > 3600000; // 1 hour
  }

  /**
   * Check if entity type has clinical relevance
   */
  private isClinicalRelevant(entityType: string): boolean {
    return ['assessment', 'crisis_plan'].includes(entityType);
  }

  /**
   * Store conflict for manual resolution
   */
  private async storeConflict(conflict: CloudConflict): Promise<void> {
    if (!this.client || !this.currentSession) {
      return;
    }

    await this.client
      .from('sync_conflicts')
      .insert({
        user_id: this.currentSession.user.id,
        entity_type: conflict.entityType,
        entity_id: conflict.entityId,
        conflict_type: conflict.conflictType,
        local_version: conflict.localVersion,
        cloud_version: conflict.cloudVersion,
        auto_resolvable: conflict.autoResolvable,
        clinical_relevant: conflict.clinicalRelevant,
        detected_at: conflict.detectedAt,
        context: {
          localChecksum: conflict.localData.checksum,
          cloudChecksum: conflict.cloudData.checksum
        }
      });
  }

  /**
   * Get encrypted data for user
   */
  public async getEncryptedData(
    entityType?: string,
    since?: string
  ): Promise<{ success: boolean; data?: EncryptedDataContainer[]; error?: string }> {
    await this.ensureReady();

    if (!this.dbHelpers || !this.currentSession) {
      return { success: false, error: 'API not ready' };
    }

    if (!this.checkRateLimit('get_data')) {
      return { success: false, error: 'Rate limit exceeded' };
    }

    try {
      const result = await this.dbHelpers.getEncryptedData(
        this.currentSession.user.id,
        entityType,
        since
      );

      // Log data access for audit
      await this.logDataAccess(entityType, result.data?.length || 0);

      return result;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Data retrieval failed'
      };
    }
  }

  /**
   * Get sync conflicts for user
   */
  public async getSyncConflicts(): Promise<{ success: boolean; conflicts?: CloudConflict[]; error?: string }> {
    await this.ensureReady();

    if (!this.client || !this.currentSession) {
      return { success: false, error: 'API not ready' };
    }

    try {
      const { data, error } = await this.client
        .from('sync_conflicts')
        .select('*')
        .eq('user_id', this.currentSession.user.id)
        .is('resolved_at', null)
        .order('detected_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      // Transform to CloudConflict format
      const conflicts: CloudConflict[] = data?.map(row => ({
        id: row.id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        conflictType: row.conflict_type as ConflictType,
        localVersion: row.local_version,
        cloudVersion: row.cloud_version,
        localData: {} as EncryptedDataContainer, // Would need to fetch from local storage
        cloudData: {} as EncryptedDataContainer, // Would need to fetch from cloud storage
        detectedAt: row.detected_at,
        autoResolvable: row.auto_resolvable,
        clinicalRelevant: row.clinical_relevant
      })) || [];

      return { success: true, conflicts };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Conflict retrieval failed'
      };
    }
  }

  /**
   * Get sync statistics
   */
  public async getSyncStats(): Promise<{ success: boolean; stats?: CloudSyncStats; error?: string }> {
    await this.ensureReady();

    if (!this.client || !this.currentSession) {
      return { success: false, error: 'API not ready' };
    }

    try {
      // Get audit log statistics
      const { data, error } = await this.client
        .from('audit_log')
        .select('operation, result, duration_ms, data_size_bytes')
        .eq('user_id', this.currentSession.user.id)
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      if (error) {
        return { success: false, error: error.message };
      }

      const operations = data || [];
      const totalOps = operations.length;
      const successfulOps = operations.filter(op => op.result === 'success').length;
      const failedOps = totalOps - successfulOps;

      const avgLatency = operations.reduce((sum, op) => sum + (op.duration_ms || 0), 0) / totalOps || 0;
      const totalDataTransferred = operations.reduce((sum, op) => sum + (op.data_size_bytes || 0), 0);

      const stats: CloudSyncStats = {
        totalOperations: totalOps,
        successfulOperations: successfulOps,
        failedOperations: failedOps,
        averageLatency: avgLatency,
        dataTransferred: totalDataTransferred,
        conflictsResolved: 0, // Would need separate query
        lastStatsReset: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        syncEfficiency: totalOps > 0 ? successfulOps / totalOps : 1
      };

      return { success: true, stats };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Stats retrieval failed'
      };
    }
  }

  /**
   * Log batch operation for audit
   */
  private async logBatchOperation(
    request: SyncBatchRequest,
    response: SyncBatchResponse,
    duration: number
  ): Promise<void> {
    if (!this.dbHelpers || !this.currentSession) {
      return;
    }

    const auditEntry: Omit<CloudAuditEntry, 'id'> = {
      userId: this.currentSession.user.id,
      deviceId: request.deviceId,
      operation: 'sync_batch',
      entityType: null,
      entityId: null,
      result: response.success ? 'success' : 'partial',
      ipAddress: null, // Would be set by server
      userAgent: null,
      timestamp: new Date().toISOString(),
      duration,
      dataSize: request.operations.reduce((sum, op) =>
        sum + (op.encryptedPayload?.length || 0), 0
      ),
      errorCode: response.errors.length > 0 ? 'BATCH_PARTIAL_FAILURE' : null,
      hipaaCompliant: true
    };

    await this.dbHelpers.logAuditEntry(auditEntry);
  }

  /**
   * Log batch error for audit
   */
  private async logBatchError(
    request: SyncBatchRequest,
    error: string,
    duration: number
  ): Promise<void> {
    if (!this.dbHelpers || !this.currentSession) {
      return;
    }

    const auditEntry: Omit<CloudAuditEntry, 'id'> = {
      userId: this.currentSession.user.id,
      deviceId: request.deviceId,
      operation: 'sync_batch',
      entityType: null,
      entityId: null,
      result: 'failure',
      ipAddress: null,
      userAgent: null,
      timestamp: new Date().toISOString(),
      duration,
      dataSize: request.operations.reduce((sum, op) =>
        sum + (op.encryptedPayload?.length || 0), 0
      ),
      errorCode: 'BATCH_FAILURE',
      hipaaCompliant: true
    };

    await this.dbHelpers.logAuditEntry(auditEntry);
  }

  /**
   * Log data access for audit
   */
  private async logDataAccess(entityType: string | undefined, recordCount: number): Promise<void> {
    if (!this.dbHelpers || !this.currentSession) {
      return;
    }

    const auditEntry: Omit<CloudAuditEntry, 'id'> = {
      userId: this.currentSession.user.id,
      deviceId: null,
      operation: 'data_access',
      entityType: entityType || 'all',
      entityId: null,
      result: 'success',
      ipAddress: null,
      userAgent: null,
      timestamp: new Date().toISOString(),
      duration: 0,
      dataSize: recordCount,
      errorCode: null,
      hipaaCompliant: true
    };

    await this.dbHelpers.logAuditEntry(auditEntry);
  }

  /**
   * Health check endpoint
   */
  public async healthCheck(): Promise<{ success: boolean; latency?: number; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Client not initialized' };
    }

    return await supabaseClient.testConnection();
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.client = null;
    this.dbHelpers = null;
    this.currentSession = null;
    this.rateLimitTracker.clear();
  }
}

// Export singleton instance
export const cloudSyncAPI = new CloudSyncAPI();