/**
 * Sync Mixin for Zustand Stores - Adds offline-first sync capabilities
 * Clinical-grade data synchronization with conflict resolution and performance optimization
 */

import * as Crypto from 'expo-crypto';
import { syncOrchestrationService, SyncCapableStore } from '../../services/SyncOrchestrationService';
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
  SyncMetadata,
  SyncableData,
  ClinicalValidationResult,
  SYNC_CONSTANTS,
  isSyncableData
} from '../../types/sync';
import {
  OfflinePriority,
  NetworkQuality,
  OfflineOperationResult
} from '../../types/offline';
import { CheckIn, Assessment, UserProfile, CrisisPlan } from '../../types';
import { validateCheckInData, validateAssessment } from '../../utils/validation';
import { calculatePHQ9Score, calculateGAD7Score, requiresCrisisIntervention } from '../../types/clinical';

/**
 * Sync state interface for Zustand stores
 */
interface SyncState {
  _syncStatus: StoreSyncStatus;
  _syncMetadata: Map<string, SyncMetadata>;
  _pendingOperations: SyncOperation[];
  _optimisticUpdates: Map<string, { data: SyncableData; originalData: SyncableData }>;
  _conflictHistory: SyncConflict[];
}

/**
 * Sync actions interface for Zustand stores
 */
interface SyncActions {
  // Core sync operations
  _prepareSyncOperation: (operation: SyncOperationType, data: SyncableData, options?: SyncOperationOptions) => SyncOperation;
  _applySyncResult: (operation: SyncOperation, result: OfflineOperationResult) => Promise<void>;
  _handleSyncConflict: (conflict: SyncConflict) => Promise<ConflictResolution>;
  _validateSyncData: (data: SyncableData) => ClinicalValidationResult;
  _generateSyncMetadata: (data: SyncableData) => SyncMetadata;
  
  // Optimistic updates
  _performOptimisticUpdate: (entityId: string, data: SyncableData) => void;
  _rollbackOptimisticUpdate: (entityId: string) => void;
  _commitOptimisticUpdate: (entityId: string) => void;
  
  // Sync management
  _triggerSync: (priority?: OfflinePriority) => Promise<OfflineOperationResult>;
  _pauseSync: () => void;
  _resumeSync: () => void;
  _clearSyncErrors: () => void;
  
  // Conflict resolution
  _resolveConflict: (conflictId: string, strategy: ConflictResolutionStrategy) => Promise<ConflictResolution>;
  _getConflicts: () => SyncConflict[];
  
  // Sync status
  _getSyncStatus: () => StoreSyncStatus;
  _getSyncMetadata: (entityId: string) => SyncMetadata | undefined;
  _getPendingOperations: () => SyncOperation[];
}

/**
 * Options for sync operations
 */
interface SyncOperationOptions {
  priority?: OfflinePriority;
  conflictResolution?: ConflictResolutionStrategy;
  optimistic?: boolean;
  clinicalSafety?: boolean;
  dependencies?: string[];
  timeout?: number;
}

/**
 * Creates sync mixin for Zustand stores
 */
export function createSyncMixin<T extends Record<string, unknown>>(
  entityType: SyncEntityType,
  validateEntityData?: (data: SyncableData) => ClinicalValidationResult
): (set: any, get: any) => SyncState & SyncActions {
  
  return (set, get) => {
    // Initialize sync state
    const initialSyncStatus: StoreSyncStatus = {
      storeType: entityType,
      status: SyncStatus.IDLE,
      lastSync: null,
      pendingOperations: 0,
      conflicts: [],
      errors: [],
      networkQuality: NetworkQuality.OFFLINE
    };

    const syncState: SyncState = {
      _syncStatus: initialSyncStatus,
      _syncMetadata: new Map(),
      _pendingOperations: [],
      _optimisticUpdates: new Map(),
      _conflictHistory: []
    };

    const syncActions: SyncActions = {
      /**
       * Prepare sync operation for queue
       */
      _prepareSyncOperation: (operation: SyncOperationType, data: SyncableData, options: SyncOperationOptions = {}): SyncOperation => {
        const metadata = get()._generateSyncMetadata(data);
        
        return {
          id: Crypto.randomUUID(),
          type: operation,
          entityType,
          entityId: metadata.entityId,
          priority: options.priority || getDefaultPriority(entityType, operation),
          data,
          metadata,
          conflictResolution: options.conflictResolution || getDefaultConflictResolution(entityType),
          createdAt: new Date().toISOString(),
          scheduledFor: options.timeout ? new Date(Date.now() + options.timeout).toISOString() : undefined,
          retryCount: 0,
          maxRetries: getMaxRetries(options.priority || OfflinePriority.MEDIUM),
          dependencies: options.dependencies,
          clinicalSafety: options.clinicalSafety !== false && isClinicalEntityType(entityType)
        };
      },

      /**
       * Apply sync operation result
       */
      _applySyncResult: async (operation: SyncOperation, result: OfflineOperationResult): Promise<void> => {
        const currentState = get();
        
        if (result.success) {
          // Update metadata
          const newMetadata = new Map(currentState._syncMetadata);
          newMetadata.set(operation.entityId, {
            ...operation.metadata,
            lastSynced: new Date().toISOString()
          });
          
          // Remove from pending operations
          const pendingOps = currentState._pendingOperations.filter(op => op.id !== operation.id);
          
          // Commit any optimistic updates
          if (currentState._optimisticUpdates.has(operation.entityId)) {
            currentState._commitOptimisticUpdate(operation.entityId);
          }
          
          set({
            _syncMetadata: newMetadata,
            _pendingOperations: pendingOps,
            _syncStatus: {
              ...currentState._syncStatus,
              status: SyncStatus.SUCCESS,
              lastSync: new Date().toISOString(),
              pendingOperations: pendingOps.length
            }
          });
          
        } else {
          // Handle sync failure
          if (result.conflicts && result.conflicts.length > 0) {
            // Add conflicts to store
            const newConflicts = [...currentState._syncStatus.conflicts, ...result.conflicts];
            
            set({
              _syncStatus: {
                ...currentState._syncStatus,
                status: SyncStatus.CONFLICT,
                conflicts: newConflicts
              }
            });
          } else {
            // Add error
            const syncError = {
              id: Crypto.randomUUID(),
              type: 'SYNC_OPERATION_ERROR' as any,
              entityType,
              entityId: operation.entityId,
              message: result.error || 'Unknown sync error',
              retryable: operation.retryCount < operation.maxRetries,
              clinicalImpact: assessClinicalImpact(entityType, result.error),
              occurredAt: new Date().toISOString()
            };
            
            set({
              _syncStatus: {
                ...currentState._syncStatus,
                status: SyncStatus.ERROR,
                errors: [...currentState._syncStatus.errors, syncError]
              }
            });
            
            // Rollback optimistic update if it exists
            if (currentState._optimisticUpdates.has(operation.entityId)) {
              currentState._rollbackOptimisticUpdate(operation.entityId);
            }
          }
        }
      },

      /**
       * Handle sync conflict with automatic resolution strategies
       */
      _handleSyncConflict: async (conflict: SyncConflict): Promise<ConflictResolution> => {
        const strategy = getConflictResolutionStrategy(entityType, conflict.conflictType);
        
        let resolvedData: SyncableData;
        let resolvedMetadata: SyncMetadata;
        
        switch (strategy) {
          case ConflictResolutionStrategy.CLIENT_WINS:
            resolvedData = conflict.localData;
            resolvedMetadata = conflict.localMetadata;
            break;
            
          case ConflictResolutionStrategy.SERVER_WINS:
            resolvedData = conflict.remoteData;
            resolvedMetadata = conflict.remoteMetadata;
            break;
            
          case ConflictResolutionStrategy.MERGE_TIMESTAMP:
            // Use most recent data based on lastModified
            const localTime = new Date(conflict.localMetadata.lastModified).getTime();
            const remoteTime = new Date(conflict.remoteMetadata.lastModified).getTime();
            
            if (localTime > remoteTime) {
              resolvedData = conflict.localData;
              resolvedMetadata = conflict.localMetadata;
            } else {
              resolvedData = conflict.remoteData;
              resolvedMetadata = conflict.remoteMetadata;
            }
            break;
            
          case ConflictResolutionStrategy.MERGE_FIELDS:
            // Intelligent field merging (simplified implementation)
            resolvedData = mergeDataFields(conflict.localData, conflict.remoteData);
            resolvedMetadata = {
              ...conflict.localMetadata,
              version: Math.max(conflict.localMetadata.version, conflict.remoteMetadata.version) + 1,
              lastModified: new Date().toISOString(),
              checksum: await calculateChecksum(resolvedData)
            };
            break;
            
          default:
            // Default to client wins
            resolvedData = conflict.localData;
            resolvedMetadata = conflict.localMetadata;
        }
        
        // Validate resolved data
        const validation = get()._validateSyncData(resolvedData);
        
        const resolution: ConflictResolution = {
          conflictId: conflict.id,
          strategy,
          resolvedData,
          resolvedMetadata,
          resolutionReason: `Automatic resolution using ${strategy}`,
          clinicalValidation: validation.isValid,
          auditTrail: [
            {
              step: 1,
              action: 'automatic_resolution',
              result: `Applied ${strategy}`,
              timestamp: new Date().toISOString(),
              validation
            }
          ],
          resolvedAt: new Date().toISOString(),
          resolvedBy: 'system'
        };
        
        return resolution;
      },

      /**
       * Validate sync data with clinical safety checks
       */
      _validateSyncData: (data: SyncableData): ClinicalValidationResult => {
        if (validateEntityData) {
          return validateEntityData(data);
        }
        
        // Default validation based on entity type
        return defaultValidateData(entityType, data);
      },

      /**
       * Generate sync metadata for data
       */
      _generateSyncMetadata: (data: SyncableData): SyncMetadata => {
        return {
          entityId: extractEntityId(data),
          entityType,
          version: 1,
          lastModified: new Date().toISOString(),
          checksum: '', // Will be calculated async
          deviceId: '', // Will be set by sync service
          userId: extractUserId(data)
        };
      },

      /**
       * Perform optimistic update
       */
      _performOptimisticUpdate: (entityId: string, data: SyncableData): void => {
        const currentState = get();
        const originalData = getCurrentEntityData(currentState, entityId);
        
        if (originalData) {
          const optimisticUpdates = new Map(currentState._optimisticUpdates);
          optimisticUpdates.set(entityId, { data, originalData });
          
          set({
            _optimisticUpdates: optimisticUpdates
          });
          
          // Apply the optimistic update to the actual store data
          applyOptimisticUpdateToStore(set, entityType, data);
        }
      },

      /**
       * Rollback optimistic update
       */
      _rollbackOptimisticUpdate: (entityId: string): void => {
        const currentState = get();
        const optimisticUpdate = currentState._optimisticUpdates.get(entityId);
        
        if (optimisticUpdate) {
          // Restore original data
          applyOptimisticUpdateToStore(set, entityType, optimisticUpdate.originalData);
          
          // Remove from optimistic updates
          const optimisticUpdates = new Map(currentState._optimisticUpdates);
          optimisticUpdates.delete(entityId);
          
          set({
            _optimisticUpdates: optimisticUpdates
          });
        }
      },

      /**
       * Commit optimistic update
       */
      _commitOptimisticUpdate: (entityId: string): void => {
        const currentState = get();
        const optimisticUpdates = new Map(currentState._optimisticUpdates);
        optimisticUpdates.delete(entityId);
        
        set({
          _optimisticUpdates: optimisticUpdates
        });
      },

      /**
       * Trigger sync for this store
       */
      _triggerSync: async (priority: OfflinePriority = OfflinePriority.MEDIUM): Promise<OfflineOperationResult> => {
        return await syncOrchestrationService.synchronize(entityType);
      },

      /**
       * Pause sync for this store
       */
      _pauseSync: (): void => {
        const currentState = get();
        set({
          _syncStatus: {
            ...currentState._syncStatus,
            status: SyncStatus.PAUSED
          }
        });
      },

      /**
       * Resume sync for this store
       */
      _resumeSync: (): void => {
        const currentState = get();
        set({
          _syncStatus: {
            ...currentState._syncStatus,
            status: SyncStatus.IDLE
          }
        });
      },

      /**
       * Clear sync errors
       */
      _clearSyncErrors: (): void => {
        const currentState = get();
        set({
          _syncStatus: {
            ...currentState._syncStatus,
            errors: []
          }
        });
      },

      /**
       * Resolve conflict manually
       */
      _resolveConflict: async (conflictId: string, strategy: ConflictResolutionStrategy): Promise<ConflictResolution> => {
        return await syncOrchestrationService.resolveConflict(conflictId, strategy);
      },

      /**
       * Get conflicts for this store
       */
      _getConflicts: (): SyncConflict[] => {
        return get()._syncStatus.conflicts;
      },

      /**
       * Get sync status
       */
      _getSyncStatus: (): StoreSyncStatus => {
        return get()._syncStatus;
      },

      /**
       * Get sync metadata for entity
       */
      _getSyncMetadata: (entityId: string): SyncMetadata | undefined => {
        return get()._syncMetadata.get(entityId);
      },

      /**
       * Get pending operations
       */
      _getPendingOperations: (): SyncOperation[] => {
        return get()._pendingOperations;
      }
    };

    return {
      ...syncState,
      ...syncActions
    };
  };
}

/**
 * Helper functions
 */

function getDefaultPriority(entityType: SyncEntityType, operation: SyncOperationType): OfflinePriority {
  // Crisis and assessment data gets high priority
  if (entityType === SyncEntityType.CRISIS_PLAN || entityType === SyncEntityType.ASSESSMENT) {
    return OfflinePriority.HIGH;
  }
  
  // Check-ins get medium priority
  if (entityType === SyncEntityType.CHECK_IN) {
    return OfflinePriority.MEDIUM;
  }
  
  // User profile and widget data get low priority
  return OfflinePriority.LOW;
}

function getDefaultConflictResolution(entityType: SyncEntityType): ConflictResolutionStrategy {
  switch (entityType) {
    case SyncEntityType.ASSESSMENT:
    case SyncEntityType.CRISIS_PLAN:
      return ConflictResolutionStrategy.SERVER_WINS; // Clinical data should be server authoritative
    case SyncEntityType.CHECK_IN:
    case SyncEntityType.USER_PROFILE:
    case SyncEntityType.WIDGET_DATA:
      return ConflictResolutionStrategy.CLIENT_WINS; // User preferences should be client authoritative
    case SyncEntityType.SESSION_DATA:
      return ConflictResolutionStrategy.MERGE_TIMESTAMP; // Session data should merge based on recency
    default:
      return ConflictResolutionStrategy.MERGE_TIMESTAMP;
  }
}

function getConflictResolutionStrategy(entityType: SyncEntityType, conflictType: ConflictType): ConflictResolutionStrategy {
  // Clinical data conflicts always require careful handling
  if (conflictType === ConflictType.CLINICAL_DATA_DIVERGENCE) {
    return ConflictResolutionStrategy.SERVER_WINS;
  }
  
  // Version mismatches can often be resolved by timestamp
  if (conflictType === ConflictType.VERSION_MISMATCH || conflictType === ConflictType.CONCURRENT_EDIT) {
    return ConflictResolutionStrategy.MERGE_TIMESTAMP;
  }
  
  // Fall back to entity-specific defaults
  return getDefaultConflictResolution(entityType);
}

function getMaxRetries(priority: OfflinePriority): number {
  switch (priority) {
    case OfflinePriority.CRITICAL:
      return SYNC_CONSTANTS.CRITICAL_MAX_RETRIES;
    case OfflinePriority.HIGH:
      return SYNC_CONSTANTS.DEFAULT_MAX_RETRIES;
    default:
      return SYNC_CONSTANTS.LOW_PRIORITY_MAX_RETRIES;
  }
}

function isClinicalEntityType(entityType: SyncEntityType): boolean {
  return [
    SyncEntityType.ASSESSMENT,
    SyncEntityType.CRISIS_PLAN,
    SyncEntityType.CHECK_IN
  ].includes(entityType);
}

function assessClinicalImpact(entityType: SyncEntityType, error?: string): any {
  if (!isClinicalEntityType(entityType)) {
    return 'LOW';
  }
  
  if (entityType === SyncEntityType.CRISIS_PLAN || error?.toLowerCase().includes('crisis')) {
    return 'CRITICAL';
  }
  
  if (entityType === SyncEntityType.ASSESSMENT) {
    return 'HIGH';
  }
  
  return 'MODERATE';
}

function defaultValidateData(entityType: SyncEntityType, data: SyncableData): ClinicalValidationResult {
  const result: ClinicalValidationResult = {
    isValid: true,
    assessmentScoresValid: true,
    crisisThresholdsValid: true,
    therapeuticContinuityPreserved: true,
    dataIntegrityIssues: [],
    recommendations: [],
    validatedAt: new Date().toISOString()
  };
  
  // Basic validation based on entity type
  if (entityType === SyncEntityType.ASSESSMENT && isAssessmentData(data)) {
    result.assessmentScoresValid = validateAssessmentScores(data);
    result.crisisThresholdsValid = validateCrisisThresholds(data);
  }
  
  if (entityType === SyncEntityType.CHECK_IN && isCheckInData(data)) {
    result.therapeuticContinuityPreserved = validateTherapeuticContinuity(data);
  }
  
  result.isValid = result.assessmentScoresValid && result.crisisThresholdsValid && result.therapeuticContinuityPreserved;
  
  return result;
}

function validateAssessmentScores(assessment: Assessment): boolean {
  if (assessment.type === 'phq9') {
    const score = calculatePHQ9Score(assessment.answers as any);
    return score >= 0 && score <= 27;
  }
  
  if (assessment.type === 'gad7') {
    const score = calculateGAD7Score(assessment.answers as any);
    return score >= 0 && score <= 21;
  }
  
  return true;
}

function validateCrisisThresholds(assessment: Assessment): boolean {
  if (assessment.type === 'phq9') {
    return !requiresCrisisIntervention(assessment.answers as any, 'phq9');
  }
  
  if (assessment.type === 'gad7') {
    return !requiresCrisisIntervention(assessment.answers as any, 'gad7');
  }
  
  return true;
}

function validateTherapeuticContinuity(checkIn: CheckIn): boolean {
  // Ensure check-in has valid timestamp and required data
  return !!(checkIn.timestamp && checkIn.type && checkIn.data);
}

function mergeDataFields(localData: SyncableData, remoteData: SyncableData): SyncableData {
  // Simplified field merging - in practice, this would be more sophisticated
  return {
    ...remoteData,
    ...localData,
    id: localData.id // Always keep local ID
  };
}

function calculateChecksum(data: SyncableData): Promise<string> {
  const dataString = JSON.stringify(data);
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, dataString);
}

function extractEntityId(data: SyncableData): string {
  return (data as any).id || Crypto.randomUUID();
}

function extractUserId(data: SyncableData): string | undefined {
  return (data as any).userId;
}

function getCurrentEntityData(state: any, entityId: string): SyncableData | null {
  // This would need to be implemented based on specific store structure
  // For now, return null - specific implementations will override this
  return null;
}

function applyOptimisticUpdateToStore(set: any, entityType: SyncEntityType, data: SyncableData): void {
  // This would need to be implemented based on specific store structure
  // Each store mixin implementation would override this
}

function isAssessmentData(data: SyncableData): data is Assessment {
  return 'type' in data && 'answers' in data && 'score' in data;
}

function isCheckInData(data: SyncableData): data is CheckIn {
  return 'type' in data && 'data' in data && 'timestamp' in data;
}

/**
 * Convenience function to create sync-enabled store
 */
export function withSync<T extends Record<string, unknown>>(
  entityType: SyncEntityType,
  storeDefinition: (set: any, get: any) => T,
  validateData?: (data: SyncableData) => ClinicalValidationResult
) {
  return (set: any, get: any) => {
    const syncMixin = createSyncMixin(entityType, validateData)(set, get);
    const baseStore = storeDefinition(set, get);
    
    // Register store with sync orchestration service
    const store = { ...baseStore, ...syncMixin } as T & SyncState & SyncActions;
    
    // Register with sync orchestration service after initialization
    setTimeout(() => {
      syncOrchestrationService.registerStore(entityType, store as any);
    }, 0);
    
    return store;
  };
}