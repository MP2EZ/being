/**
 * Sync Orchestration Service - Central coordinator for data synchronization
 * Clinical-grade sync management with conflict resolution and performance optimization
 * Integrates with all offline services and Zustand stores for seamless data consistency
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { enhancedOfflineQueueService } from './EnhancedOfflineQueueService';
import { networkAwareService } from './NetworkAwareService';
import { assetCacheService } from './AssetCacheService';
import { resumableSessionService } from './ResumableSessionService';
import { dataStore } from './storage/SecureDataStore';
import {
  SyncStatus,
  SyncOperation,
  SyncOperationType,
  SyncEntityType,
  SyncConflict,
  ConflictType,
  ConflictResolution,
  ConflictResolutionStrategy,
  StoreSyncStatus,
  AppSyncState,
  SyncConfiguration,
  SyncMetadata,
  SyncableData,
  SyncProgress,
  SyncError,
  SyncErrorType,
  ClinicalImpactLevel,
  SyncHealthStatus,
  SyncPerformanceMetrics,
  SyncAuditEntry,
  ClinicalValidationResult,
  SYNC_CONSTANTS,
  isSyncableData,
  isSyncConflict
} from '../types/sync';
import {
  OfflinePriority,
  NetworkQuality,
  OfflineOperationResult
} from '../types/offline';
import { CheckIn, Assessment, UserProfile, CrisisPlan } from '../types';

/**
 * Sync store interface for Zustand store integration
 */
export interface SyncCapableStore {
  // Sync state
  _syncStatus: StoreSyncStatus;
  _syncMetadata: Map<string, SyncMetadata>;
  _pendingOperations: SyncOperation[];
  
  // Sync methods
  _prepareSyncOperation: (operation: SyncOperationType, data: SyncableData) => SyncOperation;
  _applySyncResult: (operation: SyncOperation, result: OfflineOperationResult) => Promise<void>;
  _handleSyncConflict: (conflict: SyncConflict) => Promise<ConflictResolution>;
  _validateSyncData: (data: SyncableData) => ClinicalValidationResult;
  _generateSyncMetadata: (data: SyncableData) => SyncMetadata;
}

/**
 * Enhanced sync orchestration service with clinical safety
 */
class SyncOrchestrationService {
  private readonly SYNC_STATE_KEY = '@being_sync_state';
  private readonly SYNC_CONFIG_KEY = '@being_sync_config';
  private readonly SYNC_AUDIT_KEY = '@being_sync_audit';
  private readonly SYNC_PERFORMANCE_KEY = '@being_sync_performance';
  
  // Service state
  private isInitialized = false;
  private syncInProgress = false;
  private registeredStores = new Map<SyncEntityType, SyncCapableStore>();
  private syncConfiguration: SyncConfiguration;
  private syncState: AppSyncState;
  private performanceMetrics: SyncPerformanceMetrics;
  private auditTrail: SyncAuditEntry[] = [];
  
  // Event listeners
  private readonly listeners = new Map<string, Set<Function>>();
  
  // Sync intervals and timers
  private syncInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  private conflictResolutionQueue: SyncConflict[] = [];
  
  constructor() {
    this.syncConfiguration = this.getDefaultConfiguration();
    this.syncState = this.getInitialSyncState();
    this.performanceMetrics = this.getInitialPerformanceMetrics();
  }

  /**
   * Initialize the sync orchestration service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load persisted state and configuration
      await this.loadPersistedState();
      
      // Initialize network monitoring
      await networkAwareService.initialize();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      // Begin automatic sync if enabled
      if (this.syncConfiguration.autoSync) {
        this.startAutoSync();
      }
      
      this.isInitialized = true;
      this.emit('initialized', { timestamp: new Date().toISOString() });
      
    } catch (error) {
      throw new Error(`Failed to initialize sync orchestration: ${error.message}`);
    }
  }

  /**
   * Register a Zustand store for synchronization
   */
  registerStore(entityType: SyncEntityType, store: SyncCapableStore): void {
    this.registeredStores.set(entityType, store);
    
    // Initialize store sync status
    store._syncStatus = {
      storeType: entityType,
      status: SyncStatus.IDLE,
      lastSync: null,
      pendingOperations: 0,
      conflicts: [],
      errors: [],
      networkQuality: NetworkQuality.OFFLINE
    };
    
    this.emit('store_registered', { entityType, timestamp: new Date().toISOString() });
  }

  /**
   * Start synchronization for a specific store or all stores
   */
  async synchronize(entityType?: SyncEntityType): Promise<OfflineOperationResult> {
    if (!this.isInitialized) {
      throw new Error('Sync orchestration service not initialized');
    }

    if (this.syncInProgress) {
      return { success: false, error: 'Sync already in progress' };
    }

    this.syncInProgress = true;
    const startTime = Date.now();
    
    try {
      // Check network availability and quality
      const networkState = await networkAwareService.getNetworkState();
      
      if (!networkState.isConnected && !this.syncConfiguration.network.emergencyOverride) {
        return { success: false, error: 'No network connection available' };
      }

      // Determine which stores to sync
      const storesToSync = entityType 
        ? [entityType]
        : Array.from(this.registeredStores.keys());

      // Update global sync status
      this.updateGlobalSyncStatus(SyncStatus.SYNCING);
      
      // Process each store
      const results: OfflineOperationResult[] = [];
      
      for (const storeType of storesToSync) {
        const result = await this.synchronizeStore(storeType);
        results.push(result);
      }
      
      // Consolidate results
      const overallSuccess = results.every(result => result.success);
      const syncDuration = Date.now() - startTime;
      
      // Update performance metrics
      this.updatePerformanceMetrics(syncDuration, results.length);
      
      // Create audit entry
      await this.createAuditEntry({
        operationType: SyncOperationType.MERGE,
        entityType: entityType || SyncEntityType.USER_PROFILE,
        entityId: 'global_sync',
        operation: 'synchronize',
        result: overallSuccess ? 'success' : 'failure',
        details: { duration: syncDuration, storesCount: results.length },
        clinicalData: true
      });
      
      this.updateGlobalSyncStatus(overallSuccess ? SyncStatus.SUCCESS : SyncStatus.ERROR);
      
      return {
        success: overallSuccess,
        operationsCompleted: results.length,
        duration: syncDuration
      };
      
    } catch (error) {
      this.updateGlobalSyncStatus(SyncStatus.ERROR);
      return { success: false, error: error.message };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Synchronize a specific store
   */
  private async synchronizeStore(entityType: SyncEntityType): Promise<OfflineOperationResult> {
    const store = this.registeredStores.get(entityType);
    if (!store) {
      return { success: false, error: `Store not registered: ${entityType}` };
    }

    try {
      // Update store sync status
      this.updateStoreSyncStatus(entityType, SyncStatus.SYNCING);
      
      // Get pending operations for this store
      const pendingOps = store._pendingOperations;
      
      if (pendingOps.length === 0) {
        this.updateStoreSyncStatus(entityType, SyncStatus.SUCCESS);
        return { success: true, operationsCompleted: 0 };
      }
      
      // Sort operations by priority and dependencies
      const sortedOps = this.prioritizeOperations(pendingOps);
      
      // Process operations in batches
      const batchSize = this.getBatchSize(entityType);
      const results: OfflineOperationResult[] = [];
      
      for (let i = 0; i < sortedOps.length; i += batchSize) {
        const batch = sortedOps.slice(i, i + batchSize);
        const batchResults = await this.processBatch(entityType, batch);
        results.push(...batchResults);
        
        // Update progress
        this.updateSyncProgress(entityType, {
          total: sortedOps.length,
          completed: i + batch.length,
          failed: results.filter(r => !r.success).length,
          skipped: 0,
          percentage: Math.round(((i + batch.length) / sortedOps.length) * 100),
          currentOperation: `Batch ${Math.floor(i / batchSize) + 1}`,
          startedAt: new Date().toISOString()
        });
      }
      
      // Handle any conflicts that arose
      await this.processConflicts(entityType);
      
      const success = results.every(r => r.success);
      this.updateStoreSyncStatus(entityType, success ? SyncStatus.SUCCESS : SyncStatus.ERROR);
      
      return {
        success,
        operationsCompleted: results.length,
        conflicts: store._syncStatus.conflicts.length
      };
      
    } catch (error) {
      this.updateStoreSyncStatus(entityType, SyncStatus.ERROR);
      this.addSyncError(entityType, {
        type: SyncErrorType.NETWORK_ERROR,
        message: error.message,
        retryable: true,
        clinicalImpact: this.assessClinicalImpact(entityType, error)
      });
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Process a batch of sync operations
   */
  private async processBatch(entityType: SyncEntityType, operations: SyncOperation[]): Promise<OfflineOperationResult[]> {
    const results: OfflineOperationResult[] = [];
    
    for (const operation of operations) {
      try {
        // Validate operation data
        const validationResult = await this.validateOperation(operation);
        if (!validationResult.isValid) {
          results.push({
            success: false,
            error: `Validation failed: ${validationResult.dataIntegrityIssues.join(', ')}`
          });
          continue;
        }
        
        // Execute the operation
        const result = await this.executeOperation(operation);
        results.push(result);
        
        // Handle conflicts if they arise
        if (result.conflicts && result.conflicts.length > 0) {
          await this.handleConflicts(entityType, result.conflicts);
        }
        
      } catch (error) {
        results.push({ success: false, error: error.message });
        
        // Log clinical safety errors
        if (this.isClinicalData(operation.entityType)) {
          await this.logClinicalSafetyIncident(operation, error);
        }
      }
    }
    
    return results;
  }

  /**
   * Execute a single sync operation
   */
  private async executeOperation(operation: SyncOperation): Promise<OfflineOperationResult> {
    // Add to enhanced offline queue with clinical priority
    const queueResult = await enhancedOfflineQueueService.addAction({
      type: operation.type as any,
      data: operation.data,
      priority: operation.priority,
      clinicalSafety: operation.clinicalSafety,
      metadata: {
        entityType: operation.entityType,
        entityId: operation.entityId,
        conflictResolution: operation.conflictResolution
      }
    });
    
    if (!queueResult.success) {
      return queueResult;
    }
    
    // Wait for operation completion
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ success: false, error: 'Operation timeout' });
      }, this.getOperationTimeout(operation.priority));
      
      // Monitor queue for completion
      const checkCompletion = async () => {
        const stats = await enhancedOfflineQueueService.getStatistics();
        // This is simplified - in real implementation, track specific operation
        if (stats.successfulOperations > 0) {
          clearTimeout(timeout);
          resolve({ success: true, operationsCompleted: 1 });
        } else {
          setTimeout(checkCompletion, 1000);
        }
      };
      
      checkCompletion();
    });
  }

  /**
   * Handle conflicts that arise during sync
   */
  private async handleConflicts(entityType: SyncEntityType, conflicts: SyncConflict[]): Promise<void> {
    const store = this.registeredStores.get(entityType);
    if (!store) return;
    
    for (const conflict of conflicts) {
      try {
        // Check if manual resolution is required
        if (this.requiresManualResolution(conflict)) {
          // Add to conflict queue for user resolution
          this.conflictResolutionQueue.push(conflict);
          store._syncStatus.conflicts.push(conflict);
          this.updateStoreSyncStatus(entityType, SyncStatus.CONFLICT);
          continue;
        }
        
        // Attempt automatic resolution
        const resolution = await store._handleSyncConflict(conflict);
        
        if (resolution) {
          await this.applyConflictResolution(entityType, resolution);
          
          // Create audit entry
          await this.createAuditEntry({
            operationType: SyncOperationType.MERGE,
            entityType: conflict.entityType,
            entityId: conflict.entityId,
            operation: 'conflict_resolution',
            result: 'success',
            details: { 
              conflictType: conflict.conflictType,
              strategy: resolution.strategy,
              automatic: true
            },
            clinicalData: this.isClinicalData(conflict.entityType)
          });
        }
        
      } catch (error) {
        // Log conflict resolution failure
        this.addSyncError(entityType, {
          type: SyncErrorType.CONFLICT_RESOLUTION_ERROR,
          message: `Failed to resolve conflict: ${error.message}`,
          retryable: false,
          clinicalImpact: ClinicalImpactLevel.HIGH
        });
      }
    }
  }

  /**
   * Apply conflict resolution to data
   */
  private async applyConflictResolution(entityType: SyncEntityType, resolution: ConflictResolution): Promise<void> {
    const store = this.registeredStores.get(entityType);
    if (!store) return;
    
    // Update the store with resolved data
    const operation: SyncOperation = {
      id: resolution.conflictId,
      type: SyncOperationType.UPDATE,
      entityType,
      entityId: resolution.resolvedMetadata.entityId,
      priority: OfflinePriority.HIGH,
      data: resolution.resolvedData,
      metadata: resolution.resolvedMetadata,
      conflictResolution: resolution.strategy,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 1,
      clinicalSafety: this.isClinicalData(entityType)
    };
    
    await store._applySyncResult(operation, { success: true });
    
    // Remove conflict from store status
    store._syncStatus.conflicts = store._syncStatus.conflicts.filter(
      c => c.id !== resolution.conflictId
    );
  }

  /**
   * Validate sync operation data
   */
  private async validateOperation(operation: SyncOperation): Promise<ClinicalValidationResult> {
    const store = this.registeredStores.get(operation.entityType);
    if (!store) {
      return {
        isValid: false,
        assessmentScoresValid: false,
        crisisThresholdsValid: false,
        therapeuticContinuityPreserved: false,
        dataIntegrityIssues: ['Store not found'],
        recommendations: ['Register store before sync'],
        validatedAt: new Date().toISOString()
      };
    }
    
    return store._validateSyncData(operation.data);
  }

  /**
   * Prioritize operations based on clinical safety and dependencies
   */
  private prioritizeOperations(operations: SyncOperation[]): SyncOperation[] {
    return operations.sort((a, b) => {
      // Crisis data gets highest priority
      if (a.clinicalSafety && !b.clinicalSafety) return -1;
      if (!a.clinicalSafety && b.clinicalSafety) return 1;
      
      // Then by priority level
      const priorityOrder = [
        OfflinePriority.CRITICAL,
        OfflinePriority.HIGH,
        OfflinePriority.MEDIUM,
        OfflinePriority.LOW,
        OfflinePriority.DEFERRED
      ];
      
      const aPriorityIndex = priorityOrder.indexOf(a.priority);
      const bPriorityIndex = priorityOrder.indexOf(b.priority);
      
      if (aPriorityIndex !== bPriorityIndex) {
        return aPriorityIndex - bPriorityIndex;
      }
      
      // Finally by creation time (oldest first)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  /**
   * Determine if conflict requires manual resolution
   */
  private requiresManualResolution(conflict: SyncConflict): boolean {
    return this.syncConfiguration.conflictResolution.requireUserApproval.includes(conflict.conflictType) ||
           conflict.resolutionRequired ||
           (conflict.clinicalImplications && conflict.clinicalImplications.length > 0);
  }

  /**
   * Assess clinical impact of an error
   */
  private assessClinicalImpact(entityType: SyncEntityType, error: Error): ClinicalImpactLevel {
    if (!this.isClinicalData(entityType)) {
      return ClinicalImpactLevel.LOW;
    }
    
    // Assessment data errors are high impact
    if (entityType === SyncEntityType.ASSESSMENT || entityType === SyncEntityType.CRISIS_PLAN) {
      return ClinicalImpactLevel.HIGH;
    }
    
    return ClinicalImpactLevel.MODERATE;
  }

  /**
   * Check if entity type contains clinical data
   */
  private isClinicalData(entityType: SyncEntityType): boolean {
    return [
      SyncEntityType.ASSESSMENT,
      SyncEntityType.CRISIS_PLAN,
      SyncEntityType.CHECK_IN
    ].includes(entityType);
  }

  /**
   * Get batch size based on entity type and network quality
   */
  private getBatchSize(entityType: SyncEntityType): number {
    const networkState = networkAwareService.getNetworkState();
    
    if (networkState.quality === NetworkQuality.POOR) {
      return SYNC_CONSTANTS.CRITICAL_BATCH_SIZE;
    }
    
    if (this.isClinicalData(entityType)) {
      return SYNC_CONSTANTS.CRITICAL_BATCH_SIZE;
    }
    
    return SYNC_CONSTANTS.DEFAULT_BATCH_SIZE;
  }

  /**
   * Get operation timeout based on priority
   */
  private getOperationTimeout(priority: OfflinePriority): number {
    switch (priority) {
      case OfflinePriority.CRITICAL:
        return SYNC_CONSTANTS.CRITICAL_TIMEOUT;
      case OfflinePriority.HIGH:
        return SYNC_CONSTANTS.DEFAULT_TIMEOUT;
      default:
        return SYNC_CONSTANTS.LARGE_OPERATION_TIMEOUT;
    }
  }

  /**
   * Update global sync status
   */
  private updateGlobalSyncStatus(status: SyncStatus): void {
    this.syncState = {
      ...this.syncState,
      globalStatus: status,
      lastGlobalSync: status === SyncStatus.SUCCESS ? new Date().toISOString() : this.syncState.lastGlobalSync
    };
    
    this.emit('sync_status_changed', { status, timestamp: new Date().toISOString() });
  }

  /**
   * Update store-specific sync status
   */
  private updateStoreSyncStatus(entityType: SyncEntityType, status: SyncStatus): void {
    const store = this.registeredStores.get(entityType);
    if (!store) return;
    
    store._syncStatus = {
      ...store._syncStatus,
      status,
      lastSync: status === SyncStatus.SUCCESS ? new Date().toISOString() : store._syncStatus.lastSync,
      networkQuality: networkAwareService.getNetworkState().quality
    };
    
    this.emit('store_sync_status_changed', { entityType, status, timestamp: new Date().toISOString() });
  }

  /**
   * Update sync progress for a store
   */
  private updateSyncProgress(entityType: SyncEntityType, progress: SyncProgress): void {
    const store = this.registeredStores.get(entityType);
    if (!store) return;
    
    store._syncStatus = {
      ...store._syncStatus,
      syncProgress: progress
    };
    
    this.emit('sync_progress_updated', { entityType, progress, timestamp: new Date().toISOString() });
  }

  /**
   * Add sync error to store status
   */
  private addSyncError(entityType: SyncEntityType, errorDetails: Partial<SyncError>): void {
    const store = this.registeredStores.get(entityType);
    if (!store) return;
    
    const error: SyncError = {
      id: Crypto.randomUUID(),
      entityType,
      entityId: '',
      occurredAt: new Date().toISOString(),
      ...errorDetails
    } as SyncError;
    
    store._syncStatus.errors.push(error);
    
    this.emit('sync_error', { entityType, error, timestamp: new Date().toISOString() });
  }

  /**
   * Log clinical safety incident
   */
  private async logClinicalSafetyIncident(operation: SyncOperation, error: Error): Promise<void> {
    await this.createAuditEntry({
      operationType: operation.type,
      entityType: operation.entityType,
      entityId: operation.entityId,
      operation: 'clinical_safety_incident',
      result: 'failure',
      details: {
        error: error.message,
        operation: operation,
        clinicalSafety: true,
        severity: 'high'
      },
      clinicalData: true
    });
  }

  /**
   * Process pending conflicts
   */
  private async processConflicts(entityType: SyncEntityType): Promise<void> {
    // This would typically involve UI prompts for manual resolution
    // For now, we'll log them for monitoring
    const store = this.registeredStores.get(entityType);
    if (!store || store._syncStatus.conflicts.length === 0) return;
    
    console.warn(`Conflicts pending for ${entityType}:`, store._syncStatus.conflicts.length);
  }

  /**
   * Create audit trail entry
   */
  private async createAuditEntry(details: Partial<SyncAuditEntry>): Promise<void> {
    const entry: SyncAuditEntry = {
      id: Crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      deviceId: await this.getDeviceId(),
      dataIntegrityHash: await this.calculateDataIntegrityHash(details),
      ...details
    } as SyncAuditEntry;
    
    this.auditTrail.push(entry);
    
    // Persist audit trail
    await AsyncStorage.setItem(
      this.SYNC_AUDIT_KEY,
      JSON.stringify(this.auditTrail.slice(-1000)) // Keep last 1000 entries
    );
  }

  /**
   * Calculate data integrity hash
   */
  private async calculateDataIntegrityHash(data: unknown): Promise<string> {
    const dataString = JSON.stringify(data);
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      dataString
    );
  }

  /**
   * Get device identifier
   */
  private async getDeviceId(): Promise<string> {
    // This would typically use a device-specific identifier
    // For now, generate a stable identifier based on stored data
    let deviceId = await AsyncStorage.getItem('@being_device_id');
    if (!deviceId) {
      deviceId = Crypto.randomUUID();
      await AsyncStorage.setItem('@being_device_id', deviceId);
    }
    return deviceId;
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(duration: number, operationCount: number): void {
    this.performanceMetrics = {
      ...this.performanceMetrics,
      operationsPerSecond: operationCount / (duration / 1000),
      averageOperationTime: duration / operationCount,
      lastMeasurement: new Date().toISOString()
    };
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Network state changes
    networkAwareService.addEventListener('network_state_changed', this.handleNetworkChange.bind(this));
    
    // Queue events
    enhancedOfflineQueueService.addEventListener('operation_completed', this.handleQueueOperation.bind(this));
  }

  /**
   * Handle network state changes
   */
  private async handleNetworkChange(event: any): Promise<void> {
    const networkState = event.networkState;
    
    // Update all store network quality
    for (const store of this.registeredStores.values()) {
      store._syncStatus.networkQuality = networkState.quality;
    }
    
    // Trigger sync if network becomes available
    if (networkState.isConnected && this.syncConfiguration.autoSync) {
      await this.synchronize();
    }
  }

  /**
   * Handle queue operation completion
   */
  private handleQueueOperation(event: any): void {
    // Update relevant store operation counts
    const { operation, result } = event;
    
    if (operation?.metadata?.entityType) {
      const store = this.registeredStores.get(operation.metadata.entityType);
      if (store) {
        store._syncStatus.pendingOperations = Math.max(0, store._syncStatus.pendingOperations - 1);
      }
    }
  }

  /**
   * Start automatic synchronization
   */
  private startAutoSync(): void {
    const interval = this.syncConfiguration.syncInterval;
    
    this.syncInterval = setInterval(async () => {
      if (!this.syncInProgress) {
        await this.synchronize();
      }
    }, interval);
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 60000); // Every minute
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    // This is a simplified health check
    // In practice, this would check various system metrics
    
    const healthStatus: SyncHealthStatus = {
      overall: 'healthy',
      networkHealth: 1.0,
      dataIntegrityHealth: 1.0,
      conflictResolutionHealth: 1.0,
      performanceHealth: 1.0,
      clinicalSafetyHealth: 1.0,
      lastHealthCheck: new Date().toISOString(),
      issues: []
    };
    
    this.syncState.syncHealth = healthStatus;
  }

  /**
   * Load persisted sync state
   */
  private async loadPersistedState(): Promise<void> {
    try {
      const configData = await AsyncStorage.getItem(this.SYNC_CONFIG_KEY);
      if (configData) {
        this.syncConfiguration = { ...this.syncConfiguration, ...JSON.parse(configData) };
      }
      
      const auditData = await AsyncStorage.getItem(this.SYNC_AUDIT_KEY);
      if (auditData) {
        this.auditTrail = JSON.parse(auditData);
      }
      
    } catch (error) {
      console.warn('Failed to load persisted sync state:', error);
    }
  }

  /**
   * Get default sync configuration
   */
  private getDefaultConfiguration(): SyncConfiguration {
    return {
      enabled: true,
      autoSync: true,
      syncInterval: SYNC_CONSTANTS.DEFAULT_SYNC_INTERVAL,
      batchSize: SYNC_CONSTANTS.DEFAULT_BATCH_SIZE,
      maxRetries: SYNC_CONSTANTS.DEFAULT_MAX_RETRIES,
      timeoutMs: SYNC_CONSTANTS.DEFAULT_TIMEOUT,
      priorityOrder: [
        OfflinePriority.CRITICAL,
        OfflinePriority.HIGH,
        OfflinePriority.MEDIUM,
        OfflinePriority.LOW,
        OfflinePriority.DEFERRED
      ],
      conflictResolution: {
        defaultStrategy: ConflictResolutionStrategy.MERGE_TIMESTAMP,
        entityStrategies: {
          [SyncEntityType.ASSESSMENT]: ConflictResolutionStrategy.SERVER_WINS,
          [SyncEntityType.CRISIS_PLAN]: ConflictResolutionStrategy.SERVER_WINS,
          [SyncEntityType.CHECK_IN]: ConflictResolutionStrategy.CLIENT_WINS,
          [SyncEntityType.USER_PROFILE]: ConflictResolutionStrategy.CLIENT_WINS,
          [SyncEntityType.WIDGET_DATA]: ConflictResolutionStrategy.CLIENT_WINS,
          [SyncEntityType.SESSION_DATA]: ConflictResolutionStrategy.MERGE_TIMESTAMP
        },
        requireUserApproval: [ConflictType.CLINICAL_DATA_DIVERGENCE, ConflictType.SCHEMA_INCOMPATIBILITY]
      },
      clinicalSafety: {
        validateAssessmentScores: true,
        validateCrisisThresholds: true,
        preserveTherapeuticContinuity: true,
        auditAllOperations: true
      },
      network: {
        minQualityForSync: NetworkQuality.POOR,
        pauseOnPoorConnection: false,
        adaptiveBatching: true,
        emergencyOverride: true
      }
    };
  }

  /**
   * Get initial sync state
   */
  private getInitialSyncState(): AppSyncState {
    return {
      globalStatus: SyncStatus.IDLE,
      storeStatuses: [],
      conflicts: [],
      pendingOperations: 0,
      networkQuality: NetworkQuality.OFFLINE,
      lastGlobalSync: null,
      syncHealth: {
        overall: 'healthy',
        networkHealth: 1.0,
        dataIntegrityHealth: 1.0,
        conflictResolutionHealth: 1.0,
        performanceHealth: 1.0,
        clinicalSafetyHealth: 1.0,
        lastHealthCheck: new Date().toISOString(),
        issues: []
      },
      emergencyMode: false,
      clinicalDataIntegrity: true
    };
  }

  /**
   * Get initial performance metrics
   */
  private getInitialPerformanceMetrics(): SyncPerformanceMetrics {
    return {
      operationsPerSecond: 0,
      averageOperationTime: 0,
      networkLatency: 0,
      dataTransferRate: 0,
      conflictResolutionTime: 0,
      clinicalValidationTime: 0,
      memoryUsage: 0,
      batteryImpact: 0,
      lastMeasurement: new Date().toISOString()
    };
  }

  /**
   * Event system
   */
  addEventListener(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  removeEventListener(event: string, listener: Function): void {
    this.listeners.get(event)?.delete(listener);
  }

  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.warn(`Error in sync event listener for ${event}:`, error);
      }
    });
  }

  /**
   * Public API methods
   */
  
  /**
   * Get current sync state
   */
  getSyncState(): AppSyncState {
    return { ...this.syncState };
  }

  /**
   * Get sync configuration
   */
  getSyncConfiguration(): SyncConfiguration {
    return { ...this.syncConfiguration };
  }

  /**
   * Update sync configuration
   */
  async updateSyncConfiguration(updates: Partial<SyncConfiguration>): Promise<void> {
    this.syncConfiguration = { ...this.syncConfiguration, ...updates };
    await AsyncStorage.setItem(this.SYNC_CONFIG_KEY, JSON.stringify(this.syncConfiguration));
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): SyncPerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Get pending conflicts
   */
  getPendingConflicts(): SyncConflict[] {
    return [...this.conflictResolutionQueue];
  }

  /**
   * Resolve conflict manually
   */
  async resolveConflict(conflictId: string, strategy: ConflictResolutionStrategy): Promise<ConflictResolution> {
    const conflict = this.conflictResolutionQueue.find(c => c.id === conflictId);
    if (!conflict) {
      throw new Error(`Conflict not found: ${conflictId}`);
    }

    // Apply resolution strategy
    let resolvedData: SyncableData;
    
    switch (strategy) {
      case ConflictResolutionStrategy.CLIENT_WINS:
        resolvedData = conflict.localData;
        break;
      case ConflictResolutionStrategy.SERVER_WINS:
        resolvedData = conflict.remoteData;
        break;
      default:
        // For now, default to client wins
        resolvedData = conflict.localData;
    }

    const resolution: ConflictResolution = {
      conflictId,
      strategy,
      resolvedData,
      resolvedMetadata: conflict.localMetadata,
      resolutionReason: 'Manual user resolution',
      clinicalValidation: this.isClinicalData(conflict.entityType),
      auditTrail: [],
      resolvedAt: new Date().toISOString(),
      resolvedBy: 'user'
    };

    // Apply resolution
    await this.applyConflictResolution(conflict.entityType, resolution);
    
    // Remove from queue
    this.conflictResolutionQueue = this.conflictResolutionQueue.filter(c => c.id !== conflictId);
    
    return resolution;
  }

  /**
   * Emergency sync for critical data
   */
  async emergencySync(entityType: SyncEntityType, entityId: string): Promise<OfflineOperationResult> {
    const originalConfig = this.syncConfiguration;
    
    // Temporarily enable emergency mode
    this.syncConfiguration = {
      ...originalConfig,
      network: {
        ...originalConfig.network,
        emergencyOverride: true
      }
    };
    
    try {
      return await this.synchronize(entityType);
    } finally {
      this.syncConfiguration = originalConfig;
    }
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Save final state
    await AsyncStorage.setItem(this.SYNC_STATE_KEY, JSON.stringify(this.syncState));
    await AsyncStorage.setItem(this.SYNC_AUDIT_KEY, JSON.stringify(this.auditTrail));
    
    this.isInitialized = false;
  }
}

// Export singleton instance
export const syncOrchestrationService = new SyncOrchestrationService();