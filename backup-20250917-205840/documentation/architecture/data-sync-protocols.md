# Data Synchronization Protocols

## Overview

This document defines the comprehensive data synchronization architecture for FullMind's mental health platform. The protocols ensure clinical-grade data integrity, therapeutic continuity, and seamless multi-device experiences while maintaining an offline-first approach that prioritizes user data sovereignty and clinical safety.

## Table of Contents

1. [Synchronization Architecture](#synchronization-architecture)
2. [Local-First Sync Patterns](#local-first-sync-patterns)
3. [Conflict Resolution Strategies](#conflict-resolution-strategies)
4. [Crisis Data Prioritization](#crisis-data-prioritization)
5. [Delta Sync Optimization](#delta-sync-optimization)
6. [Data Versioning and Migration](#data-versioning-and-migration)
7. [Offline Queue Management](#offline-queue-management)
8. [Performance Optimization](#performance-optimization)
9. [Clinical Safety Protocols](#clinical-safety-protocols)
10. [Monitoring and Observability](#monitoring-and-observability)

## Synchronization Architecture

### Core Sync Principles

1. **Local-First Authority**: Local data is the source of truth until proven otherwise
2. **Clinical Safety First**: Therapeutic continuity takes precedence over data consistency
3. **Eventual Consistency**: All devices converge to consistent state over time
4. **Conflict Prevention**: Proactive measures to minimize sync conflicts
5. **Audit Transparency**: Complete audit trail for all sync operations

### Sync Architecture Overview

```typescript
interface SyncArchitecture {
  readonly strategy: SyncStrategy;
  readonly topology: SyncTopology;
  readonly consistency: ConsistencyModel;
  readonly conflictResolution: ConflictResolutionFramework;
  readonly auditTrail: AuditingSystem;
}

enum SyncStrategy {
  OPERATIONAL_TRANSFORM = 'operational_transform',
  CONFLICT_FREE_REPLICATED_DATA_TYPE = 'crdt',
  LAST_WRITER_WINS = 'last_writer_wins',
  CLINICAL_SAFETY_FIRST = 'clinical_safety_first'
}

enum SyncTopology {
  CLIENT_SERVER = 'client_server',
  PEER_TO_PEER = 'peer_to_peer',
  HYBRID = 'hybrid'
}

// FullMind's chosen architecture
const FULLMIND_SYNC_ARCHITECTURE: SyncArchitecture = {
  strategy: SyncStrategy.CLINICAL_SAFETY_FIRST,
  topology: SyncTopology.CLIENT_SERVER,
  consistency: ConsistencyModel.EVENTUAL_WITH_CLINICAL_GUARANTEES,
  conflictResolution: ConflictResolutionFramework.THERAPEUTIC_CONTINUITY,
  auditTrail: AuditingSystem.COMPREHENSIVE_CLINICAL
};
```

### Sync Entity Hierarchy

```typescript
interface SyncEntityHierarchy {
  readonly criticalEntities: readonly EntityType[];
  readonly standardEntities: readonly EntityType[];
  readonly lowPriorityEntities: readonly EntityType[];
}

const SYNC_PRIORITY_HIERARCHY: SyncEntityHierarchy = {
  criticalEntities: [
    EntityType.CRISIS_PLAN,
    EntityType.ASSESSMENT,
    EntityType.CRISIS_EVENTS
  ],
  standardEntities: [
    EntityType.CHECK_IN,
    EntityType.USER_PROFILE,
    EntityType.SESSION_DATA
  ],
  lowPriorityEntities: [
    EntityType.APP_PREFERENCES,
    EntityType.ANALYTICS_DATA,
    EntityType.CACHE_DATA
  ]
};
```

## Local-First Sync Patterns

### Local Authority Model

```typescript
class LocalFirstSyncManager {
  private readonly localDataStore: SecureDataStore;
  private readonly remoteAPI: SyncAPI;
  private readonly conflictResolver: ConflictResolver;
  
  async performSync(): Promise<SyncResult> {
    const syncSession = await this.initializeSyncSession();
    
    try {
      // 1. Local changes take priority
      const localChanges = await this.getLocalChanges(syncSession.lastSync);
      
      // 2. Upload local changes first
      const uploadResult = await this.uploadLocalChanges(localChanges);
      
      // 3. Fetch remote changes
      const remoteChanges = await this.fetchRemoteChanges(syncSession.lastSync);
      
      // 4. Apply remote changes with conflict resolution
      const applyResult = await this.applyRemoteChanges(remoteChanges);
      
      // 5. Resolve any conflicts with clinical safety priority
      const conflicts = [...uploadResult.conflicts, ...applyResult.conflicts];
      const resolutions = await this.resolveConflicts(conflicts);
      
      return {
        success: true,
        localChangesUploaded: uploadResult.count,
        remoteChangesApplied: applyResult.count,
        conflictsResolved: resolutions.length,
        clinicalSafetyMaintained: this.validateClinicalSafety(resolutions),
        syncDuration: Date.now() - syncSession.startTime
      };
      
    } catch (error) {
      return this.handleSyncError(error, syncSession);
    }
  }
  
  private async getLocalChanges(since: string): Promise<LocalChanges> {
    const changes: LocalChanges = {
      assessments: await this.localDataStore.getModifiedAssessments(since),
      checkIns: await this.localDataStore.getModifiedCheckIns(since),
      crisisPlans: await this.localDataStore.getModifiedCrisisPlans(since),
      userProfile: await this.localDataStore.getModifiedUserProfile(since)
    };
    
    // Validate clinical data before sync
    await this.validateClinicalData(changes);
    
    return changes;
  }
}
```

### Optimistic Updates

```typescript
interface OptimisticUpdateManager {
  applyOptimisticUpdate<T>(
    entityId: string,
    update: Partial<T>,
    operation: SyncOperation
  ): Promise<OptimisticUpdateResult>;
  
  revertOptimisticUpdate(updateId: string): Promise<void>;
  confirmOptimisticUpdate(updateId: string): Promise<void>;
}

class ClinicalOptimisticUpdates implements OptimisticUpdateManager {
  private pendingUpdates = new Map<string, OptimisticUpdate>();
  
  async applyOptimisticUpdate<T>(
    entityId: string,
    update: Partial<T>,
    operation: SyncOperation
  ): Promise<OptimisticUpdateResult> {
    const updateId = this.generateUpdateId();
    
    // Clinical data requires conservative optimistic updates
    if (this.isClinicalData(update)) {
      return this.applyConservativeUpdate(entityId, update, operation, updateId);
    }
    
    // Standard optimistic update for non-clinical data
    return this.applyStandardUpdate(entityId, update, operation, updateId);
  }
  
  private async applyConservativeUpdate<T>(
    entityId: string,
    update: Partial<T>,
    operation: SyncOperation,
    updateId: string
  ): Promise<OptimisticUpdateResult> {
    // Validate update doesn't compromise clinical safety
    const safetyCheck = await this.validateClinicalSafety(update);
    if (!safetyCheck.isSafe) {
      throw new ClinicalSafetyError('Update would compromise clinical data integrity');
    }
    
    // Apply with revert capability
    const originalData = await this.captureOriginalState(entityId);
    await this.applyUpdate(entityId, update);
    
    const optimisticUpdate: OptimisticUpdate = {
      id: updateId,
      entityId,
      operation,
      originalData,
      appliedUpdate: update,
      timestamp: new Date().toISOString(),
      clinicalData: true,
      safetyValidated: true
    };
    
    this.pendingUpdates.set(updateId, optimisticUpdate);
    
    return {
      updateId,
      applied: true,
      requiresConfirmation: true,
      clinicalSafetyValidated: true
    };
  }
}
```

### Local State Reconciliation

```typescript
class LocalStateReconciler {
  async reconcileLocalState(): Promise<ReconciliationResult> {
    const issues: ReconciliationIssue[] = [];
    const fixes: ReconciliationFix[] = [];
    
    // 1. Check for orphaned data
    const orphanedData = await this.findOrphanedData();
    if (orphanedData.length > 0) {
      issues.push({
        type: 'orphaned_data',
        severity: 'medium',
        count: orphanedData.length,
        description: 'Data records without proper relationships'
      });
      
      const orphanFix = await this.fixOrphanedData(orphanedData);
      fixes.push(orphanFix);
    }
    
    // 2. Validate clinical data consistency
    const clinicalInconsistencies = await this.validateClinicalConsistency();
    if (clinicalInconsistencies.length > 0) {
      issues.push({
        type: 'clinical_inconsistency',
        severity: 'high',
        count: clinicalInconsistencies.length,
        description: 'Clinical data integrity issues detected'
      });
      
      const clinicalFix = await this.fixClinicalInconsistencies(clinicalInconsistencies);
      fixes.push(clinicalFix);
    }
    
    // 3. Check for duplicate entries
    const duplicates = await this.findDuplicateEntries();
    if (duplicates.length > 0) {
      issues.push({
        type: 'duplicate_entries',
        severity: 'low',
        count: duplicates.length,
        description: 'Duplicate data entries found'
      });
      
      const duplicateFix = await this.mergeDuplicateEntries(duplicates);
      fixes.push(duplicateFix);
    }
    
    return {
      issues,
      fixes,
      overallHealth: this.calculateDataHealth(issues),
      recommendedActions: this.generateRecommendations(issues)
    };
  }
}
```

## Conflict Resolution Strategies

### Clinical-First Conflict Resolution

```typescript
enum ConflictResolutionStrategy {
  CLINICAL_SAFETY_FIRST = 'clinical_safety_first',
  LAST_WRITER_WINS = 'last_writer_wins',
  MERGE_COMPATIBLE = 'merge_compatible',
  USER_INTERVENTION = 'user_intervention',
  THERAPEUTIC_CONTINUITY = 'therapeutic_continuity'
}

class ClinicalConflictResolver {
  async resolveConflict(conflict: SyncConflict): Promise<ConflictResolution> {
    // Determine appropriate resolution strategy based on conflict type
    const strategy = this.determineResolutionStrategy(conflict);
    
    switch (strategy) {
      case ConflictResolutionStrategy.CLINICAL_SAFETY_FIRST:
        return this.resolveByClinicalSafety(conflict);
        
      case ConflictResolutionStrategy.THERAPEUTIC_CONTINUITY:
        return this.resolveByTherapeuticContinuity(conflict);
        
      case ConflictResolutionStrategy.MERGE_COMPATIBLE:
        return this.resolveByMerging(conflict);
        
      case ConflictResolutionStrategy.USER_INTERVENTION:
        return this.requestUserIntervention(conflict);
        
      default:
        return this.resolveByLastWriter(conflict);
    }
  }
  
  private async resolveByClinicalSafety(
    conflict: SyncConflict
  ): Promise<ConflictResolution> {
    const localData = conflict.localData;
    const remoteData = conflict.remoteData;
    
    // Validate clinical integrity of both versions
    const localValidation = await this.validateClinicalIntegrity(localData);
    const remoteValidation = await this.validateClinicalIntegrity(remoteData);
    
    // Choose version with better clinical integrity
    if (localValidation.score > remoteValidation.score) {
      return {
        strategy: ConflictResolutionStrategy.CLINICAL_SAFETY_FIRST,
        resolvedData: localData,
        reason: `Local version has better clinical integrity (${localValidation.score} vs ${remoteValidation.score})`,
        clinicalValidation: localValidation,
        auditRequired: true,
        userNotificationRequired: false
      };
    }
    
    if (remoteValidation.score > localValidation.score) {
      return {
        strategy: ConflictResolutionStrategy.CLINICAL_SAFETY_FIRST,
        resolvedData: remoteData,
        reason: `Remote version has better clinical integrity (${remoteValidation.score} vs ${localValidation.score})`,
        clinicalValidation: remoteValidation,
        auditRequired: true,
        userNotificationRequired: false
      };
    }
    
    // Equal clinical integrity - fall back to timestamp
    return this.resolveByTimestamp(conflict);
  }
  
  private async resolveByTherapeuticContinuity(
    conflict: SyncConflict
  ): Promise<ConflictResolution> {
    // For therapeutic data, prioritize continuity of care
    if (conflict.entityType === EntityType.CHECK_IN) {
      return this.resolveCheckInConflict(conflict as CheckInConflict);
    }
    
    if (conflict.entityType === EntityType.ASSESSMENT) {
      return this.resolveAssessmentConflict(conflict as AssessmentConflict);
    }
    
    if (conflict.entityType === EntityType.CRISIS_PLAN) {
      return this.resolveCrisisPlanConflict(conflict as CrisisPlanConflict);
    }
    
    // Default to clinical safety resolution
    return this.resolveByClinicalSafety(conflict);
  }
}
```

### Assessment Conflict Resolution

```typescript
class AssessmentConflictResolver {
  async resolveAssessmentConflict(
    conflict: AssessmentConflict
  ): Promise<ConflictResolution> {
    const localAssessment = conflict.localData as Assessment;
    const remoteAssessment = conflict.remoteData as Assessment;
    
    // 1. Validate scoring accuracy (critical for clinical compliance)
    const localScoreValid = this.validateAssessmentScoring(localAssessment);
    const remoteScoreValid = this.validateAssessmentScoring(remoteAssessment);
    
    if (localScoreValid && !remoteScoreValid) {
      return this.createResolution(
        ConflictResolutionStrategy.CLINICAL_SAFETY_FIRST,
        localAssessment,
        'Local assessment has valid scoring, remote does not'
      );
    }
    
    if (!localScoreValid && remoteScoreValid) {
      return this.createResolution(
        ConflictResolutionStrategy.CLINICAL_SAFETY_FIRST,
        remoteAssessment,
        'Remote assessment has valid scoring, local does not'
      );
    }
    
    // 2. Check for crisis detection accuracy
    const localCrisisValid = this.validateCrisisDetection(localAssessment);
    const remoteCrisisValid = this.validateCrisisDetection(remoteAssessment);
    
    if (localCrisisValid && !remoteCrisisValid) {
      return this.createResolution(
        ConflictResolutionStrategy.CLINICAL_SAFETY_FIRST,
        localAssessment,
        'Local assessment has correct crisis detection'
      );
    }
    
    if (!localCrisisValid && remoteCrisisValid) {
      return this.createResolution(
        ConflictResolutionStrategy.CLINICAL_SAFETY_FIRST,
        remoteAssessment,
        'Remote assessment has correct crisis detection'
      );
    }
    
    // 3. Both valid or both invalid - use most recent
    const useLocal = new Date(localAssessment.timestamp) > new Date(remoteAssessment.timestamp);
    const chosenAssessment = useLocal ? localAssessment : remoteAssessment;
    
    return this.createResolution(
      ConflictResolutionStrategy.LAST_WRITER_WINS,
      chosenAssessment,
      `Most recent clinically valid assessment (${chosenAssessment.timestamp})`
    );
  }
  
  private validateAssessmentScoring(assessment: Assessment): boolean {
    const calculatedScore = assessment.answers.reduce((sum, answer) => sum + answer, 0);
    return assessment.score === calculatedScore;
  }
  
  private validateCrisisDetection(assessment: Assessment): boolean {
    const threshold = assessment.type === 'phq9' ? 20 : 15;
    const shouldDetectCrisis = assessment.score >= threshold;
    return assessment.crisisDetected === shouldDetectCrisis;
  }
}
```

### Check-in Conflict Resolution

```typescript
class CheckInConflictResolver {
  async resolveCheckInConflict(
    conflict: CheckInConflict
  ): Promise<ConflictResolution> {
    const localCheckIn = conflict.localData as CheckIn;
    const remoteCheckIn = conflict.remoteData as CheckIn;
    
    // 1. Preserve therapeutic timing
    if (this.hasTherapeuticSignificance(localCheckIn, remoteCheckIn)) {
      return this.resolveByTherapeuticTiming(localCheckIn, remoteCheckIn);
    }
    
    // 2. Merge compatible data if possible
    if (this.areCheckInsCompatible(localCheckIn, remoteCheckIn)) {
      const mergedCheckIn = await this.mergeCheckInData(localCheckIn, remoteCheckIn);
      return this.createResolution(
        ConflictResolutionStrategy.MERGE_COMPATIBLE,
        mergedCheckIn,
        'Successfully merged compatible check-in data'
      );
    }
    
    // 3. Choose more complete check-in
    const localCompleteness = this.calculateCompleteness(localCheckIn);
    const remoteCompleteness = this.calculateCompleteness(remoteCheckIn);
    
    if (localCompleteness > remoteCompleteness) {
      return this.createResolution(
        ConflictResolutionStrategy.THERAPEUTIC_CONTINUITY,
        localCheckIn,
        `Local check-in is more complete (${localCompleteness}% vs ${remoteCompleteness}%)`
      );
    }
    
    return this.createResolution(
      ConflictResolutionStrategy.THERAPEUTIC_CONTINUITY,
      remoteCheckIn,
      `Remote check-in is more complete (${remoteCompleteness}% vs ${localCompleteness}%)`
    );
  }
  
  private async mergeCheckInData(
    local: CheckIn,
    remote: CheckIn
  ): Promise<CheckIn> {
    const mergedData: CheckInData = {};
    
    // Merge arrays by combining unique values
    if (local.data.emotions || remote.data.emotions) {
      const allEmotions = [
        ...(local.data.emotions || []),
        ...(remote.data.emotions || [])
      ];
      mergedData.emotions = [...new Set(allEmotions)];
    }
    
    // For scalar values, prefer non-null values, then more recent
    mergedData.sleepQuality = local.data.sleepQuality || remote.data.sleepQuality;
    mergedData.energyLevel = local.data.energyLevel || remote.data.energyLevel;
    mergedData.anxietyLevel = local.data.anxietyLevel || remote.data.anxietyLevel;
    
    // For text fields, prefer longer, more descriptive entries
    mergedData.intention = this.selectBetterText(
      local.data.intention,
      remote.data.intention
    );
    
    const useLocalTimestamp = new Date(local.startedAt) > new Date(remote.startedAt);
    const baseCheckIn = useLocalTimestamp ? local : remote;
    
    return {
      ...baseCheckIn,
      data: mergedData,
      mergedFrom: [local.id, remote.id],
      mergedAt: new Date().toISOString()
    };
  }
}
```

## Crisis Data Prioritization

### Crisis Data Sync Protocol

```typescript
interface CrisisDataSyncProtocol {
  readonly priority: 'immediate' | 'urgent' | 'high';
  readonly timeout: number; // milliseconds
  readonly retryStrategy: RetryStrategy;
  readonly failoverBehavior: FailoverBehavior;
}

class CrisisDataSyncManager {
  private readonly CRISIS_SYNC_TIMEOUT = 5000; // 5 seconds
  private readonly CRISIS_RETRY_ATTEMPTS = 10;
  
  async syncCrisisData(
    crisisData: CrisisData,
    context: SyncContext
  ): Promise<CrisisDataSyncResult> {
    const startTime = Date.now();
    
    try {
      // 1. Immediate local backup
      await this.createLocalCrisisBackup(crisisData);
      
      // 2. Prioritize crisis data in sync queue
      await this.prioritizeInSyncQueue(crisisData, Priority.CRITICAL);
      
      // 3. Attempt immediate sync with aggressive retry
      const syncResult = await this.attemptImmediateSync(crisisData);
      
      if (syncResult.success) {
        return {
          success: true,
          syncedAt: new Date().toISOString(),
          latency: Date.now() - startTime,
          backupCreated: true,
          emergencyProtocolsTriggered: false
        };
      }
      
      // 4. If sync fails, trigger emergency protocols
      await this.triggerEmergencyProtocols(crisisData, context);
      
      return {
        success: false,
        syncedAt: null,
        latency: Date.now() - startTime,
        backupCreated: true,
        emergencyProtocolsTriggered: true,
        error: syncResult.error
      };
      
    } catch (error) {
      // Emergency fallback - ensure crisis data is preserved
      await this.emergencyFallback(crisisData, error);
      throw error;
    }
  }
  
  private async attemptImmediateSync(
    crisisData: CrisisData
  ): Promise<SyncResult> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.CRISIS_RETRY_ATTEMPTS; attempt++) {
      try {
        const result = await Promise.race([
          this.syncAPI.uploadCrisisData(crisisData),
          this.createTimeoutPromise(this.CRISIS_SYNC_TIMEOUT)
        ]);
        
        return { success: true, data: result };
        
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.CRISIS_RETRY_ATTEMPTS) {
          // Exponential backoff with jitter for crisis data
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          const jitter = Math.random() * 1000;
          await this.delay(delay + jitter);
        }
      }
    }
    
    return { success: false, error: lastError };
  }
  
  private async triggerEmergencyProtocols(
    crisisData: CrisisData,
    context: SyncContext
  ): Promise<void> {
    // 1. Ensure multiple local backups
    await this.createRedundantLocalBackups(crisisData);
    
    // 2. Attempt alternative sync channels
    await this.attemptAlternativeSyncChannels(crisisData);
    
    // 3. Log emergency incident
    await this.logEmergencyIncident({
      type: 'crisis_data_sync_failure',
      crisisDataId: crisisData.id,
      timestamp: new Date().toISOString(),
      context,
      severity: 'critical'
    });
    
    // 4. Notify emergency monitoring if configured
    if (this.emergencyMonitoringEnabled) {
      await this.notifyEmergencyMonitoring(crisisData);
    }
  }
}
```

### Crisis Event Prioritization

```typescript
enum CrisisEventType {
  ASSESSMENT_CRISIS_THRESHOLD = 'assessment_crisis_threshold',
  CRISIS_PLAN_ACTIVATION = 'crisis_plan_activation',
  EMERGENCY_CONTACT_TRIGGERED = 'emergency_contact_triggered',
  SELF_HARM_INDICATION = 'self_harm_indication',
  SUICIDAL_IDEATION = 'suicidal_ideation'
}

interface CrisisEvent {
  readonly id: string;
  readonly type: CrisisEventType;
  readonly severity: CrisisSeverity;
  readonly timestamp: string;
  readonly userId: string;
  readonly deviceId: string;
  readonly triggerData: CrisisTriggerData;
  readonly immediateResponse: CrisisResponse;
  readonly syncPriority: 'immediate' | 'urgent';
}

class CrisisEventSyncManager {
  async syncCrisisEvent(event: CrisisEvent): Promise<void> {
    // Crisis events bypass normal sync queue
    await this.bypassSyncQueue(event);
    
    // Create multiple sync attempts simultaneously
    const syncAttempts = await Promise.allSettled([
      this.primarySyncChannel.sync(event),
      this.backupSyncChannel.sync(event),
      this.emergencySyncChannel.sync(event)
    ]);
    
    const successfulSyncs = syncAttempts.filter(
      result => result.status === 'fulfilled'
    ).length;
    
    if (successfulSyncs === 0) {
      // All sync attempts failed - trigger emergency protocols
      await this.handleCrisisEventSyncFailure(event);
    }
    
    // Log sync results for audit
    await this.auditCrisisEventSync(event, syncAttempts);
  }
}
```

## Delta Sync Optimization

### Delta Calculation

```typescript
interface DeltaCalculationStrategy {
  calculateDeltas<T>(
    currentData: T[],
    previousData: T[],
    keyExtractor: (item: T) => string
  ): SyncDeltas<T>;
}

class OptimizedDeltaCalculator implements DeltaCalculationStrategy {
  calculateDeltas<T>(
    currentData: T[],
    previousData: T[],
    keyExtractor: (item: T) => string
  ): SyncDeltas<T> {
    const currentMap = new Map(currentData.map(item => [keyExtractor(item), item]));
    const previousMap = new Map(previousData.map(item => [keyExtractor(item), item]));
    
    const deltas: SyncDeltas<T> = {
      created: [],
      updated: [],
      deleted: [],
      metadata: {
        totalItems: currentData.length,
        deltaCount: 0,
        compressionRatio: 0,
        calculatedAt: new Date().toISOString()
      }
    };
    
    // Find created and updated items
    for (const [key, currentItem] of currentMap) {
      const previousItem = previousMap.get(key);
      
      if (!previousItem) {
        deltas.created.push(currentItem);
      } else if (this.hasChanges(currentItem, previousItem)) {
        deltas.updated.push({
          id: key,
          changes: this.calculateFieldChanges(currentItem, previousItem),
          currentItem,
          previousItem
        });
      }
    }
    
    // Find deleted items
    for (const [key, previousItem] of previousMap) {
      if (!currentMap.has(key)) {
        deltas.deleted.push({
          id: key,
          deletedItem: previousItem,
          deletedAt: new Date().toISOString()
        });
      }
    }
    
    deltas.metadata.deltaCount = deltas.created.length + deltas.updated.length + deltas.deleted.length;
    deltas.metadata.compressionRatio = this.calculateCompressionRatio(deltas, currentData);
    
    return deltas;
  }
  
  private calculateFieldChanges<T>(current: T, previous: T): FieldChanges {
    const changes: FieldChanges = {};
    
    for (const key in current) {
      if (current[key] !== previous[key]) {
        changes[key] = {
          from: previous[key],
          to: current[key],
          type: this.determineChangeType(previous[key], current[key])
        };
      }
    }
    
    return changes;
  }
}
```

### Efficient Sync Batching

```typescript
class SyncBatchOptimizer {
  private readonly MAX_BATCH_SIZE = 100;
  private readonly MAX_BATCH_BYTES = 1024 * 1024; // 1MB
  private readonly PRIORITY_BATCH_SIZE = 10;
  
  async optimizeSyncBatches(
    syncOperations: SyncOperation[]
  ): Promise<SyncBatch[]> {
    // Sort by priority and dependency order
    const sortedOperations = this.sortByPriorityAndDependencies(syncOperations);
    
    const batches: SyncBatch[] = [];
    let currentBatch: SyncOperation[] = [];
    let currentBatchSize = 0;
    
    for (const operation of sortedOperations) {
      const operationSize = this.estimateOperationSize(operation);
      
      // Check if operation should start a new batch
      if (this.shouldStartNewBatch(currentBatch, currentBatchSize, operation, operationSize)) {
        if (currentBatch.length > 0) {
          batches.push(this.createBatch(currentBatch));
          currentBatch = [];
          currentBatchSize = 0;
        }
      }
      
      currentBatch.push(operation);
      currentBatchSize += operationSize;
    }
    
    // Add final batch
    if (currentBatch.length > 0) {
      batches.push(this.createBatch(currentBatch));
    }
    
    return batches;
  }
  
  private shouldStartNewBatch(
    currentBatch: SyncOperation[],
    currentSize: number,
    nextOperation: SyncOperation,
    nextOperationSize: number
  ): boolean {
    // Always start new batch for critical operations
    if (nextOperation.priority === Priority.CRITICAL) {
      return currentBatch.length > 0;
    }
    
    // Start new batch if size limits exceeded
    if (currentBatch.length >= this.MAX_BATCH_SIZE) {
      return true;
    }
    
    if (currentSize + nextOperationSize > this.MAX_BATCH_BYTES) {
      return true;
    }
    
    // Start new batch if dependency requirements conflict
    if (this.hasDependencyConflicts(currentBatch, nextOperation)) {
      return true;
    }
    
    return false;
  }
  
  private createBatch(operations: SyncOperation[]): SyncBatch {
    return {
      id: this.generateBatchId(),
      operations,
      priority: this.calculateBatchPriority(operations),
      estimatedSize: operations.reduce((sum, op) => sum + this.estimateOperationSize(op), 0),
      dependsOn: this.extractBatchDependencies(operations),
      clinicalSafety: operations.some(op => op.clinicalSafety),
      createdAt: new Date().toISOString()
    };
  }
}
```

### Compression and Deduplication

```typescript
class SyncDataCompressor {
  async compressSyncData(data: SyncData): Promise<CompressedSyncData> {
    // 1. Remove duplicate data
    const deduplicatedData = await this.deduplicateData(data);
    
    // 2. Apply field-level compression for repetitive data
    const compressedFields = await this.compressRepetitiveFields(deduplicatedData);
    
    // 3. Binary compression for large payloads
    const binaryCompressed = await this.applyBinaryCompression(compressedFields);
    
    return {
      compressedData: binaryCompressed,
      compressionMetadata: {
        originalSize: JSON.stringify(data).length,
        compressedSize: binaryCompressed.length,
        compressionRatio: binaryCompressed.length / JSON.stringify(data).length,
        deduplicationSavings: this.calculateDeduplicationSavings(data, deduplicatedData),
        algorithm: 'gzip+deduplication+field_compression'
      }
    };
  }
  
  private async deduplicateData(data: SyncData): Promise<SyncData> {
    const seenHashes = new Set<string>();
    const deduplicatedOperations: SyncOperation[] = [];
    
    for (const operation of data.operations) {
      const operationHash = await this.calculateOperationHash(operation);
      
      if (!seenHashes.has(operationHash)) {
        seenHashes.add(operationHash);
        deduplicatedOperations.push(operation);
      }
    }
    
    return {
      ...data,
      operations: deduplicatedOperations
    };
  }
  
  private async compressRepetitiveFields(data: SyncData): Promise<SyncData> {
    // Extract common patterns in clinical data
    const fieldPatterns = this.analyzeFieldPatterns(data);
    
    // Create compression dictionary for repetitive values
    const compressionDict = this.createCompressionDictionary(fieldPatterns);
    
    // Apply compression using dictionary
    const compressedOperations = data.operations.map(operation => 
      this.compressOperationFields(operation, compressionDict)
    );
    
    return {
      ...data,
      operations: compressedOperations,
      compressionDict
    };
  }
}
```

## Data Versioning and Migration

### Version Management

```typescript
interface DataVersionManager {
  getCurrentVersion(): string;
  getCompatibleVersions(version: string): string[];
  migrateData(data: any, fromVersion: string, toVersion: string): Promise<any>;
  validateVersionCompatibility(clientVersion: string, serverVersion: string): boolean;
}

class ClinicalDataVersionManager implements DataVersionManager {
  private readonly VERSION_COMPATIBILITY_MATRIX = {
    '1.0': ['1.0', '1.1'],
    '1.1': ['1.0', '1.1', '1.2'],
    '1.2': ['1.1', '1.2', '1.3'],
    // ... version matrix
  };
  
  private readonly MIGRATION_STRATEGIES = {
    '1.0_to_1.1': this.migrate_1_0_to_1_1.bind(this),
    '1.1_to_1.2': this.migrate_1_1_to_1_2.bind(this),
    '1.2_to_1.3': this.migrate_1_2_to_1_3.bind(this),
    // ... migration functions
  };
  
  async migrateData(
    data: any,
    fromVersion: string,
    toVersion: string
  ): Promise<MigrationResult> {
    if (fromVersion === toVersion) {
      return { success: true, data, migrationsApplied: [] };
    }
    
    const migrationPath = this.findMigrationPath(fromVersion, toVersion);
    if (!migrationPath) {
      throw new Error(`No migration path from ${fromVersion} to ${toVersion}`);
    }
    
    let currentData = data;
    const migrationsApplied: string[] = [];
    
    for (let i = 0; i < migrationPath.length - 1; i++) {
      const from = migrationPath[i];
      const to = migrationPath[i + 1];
      const migrationKey = `${from}_to_${to}`;
      
      const migrationFunction = this.MIGRATION_STRATEGIES[migrationKey];
      if (!migrationFunction) {
        throw new Error(`No migration strategy for ${migrationKey}`);
      }
      
      currentData = await migrationFunction(currentData);
      migrationsApplied.push(migrationKey);
      
      // Validate data after each migration
      await this.validateMigratedData(currentData, to);
    }
    
    return {
      success: true,
      data: currentData,
      migrationsApplied
    };
  }
  
  private async migrate_1_1_to_1_2(data: any): Promise<any> {
    // Example migration: Add crisis detection fields to assessments
    if (data.assessments) {
      data.assessments = data.assessments.map((assessment: any) => ({
        ...assessment,
        crisisDetected: assessment.score >= (assessment.type === 'phq9' ? 20 : 15),
        crisisDetectionVersion: '1.2',
        migratedFrom: '1.1'
      }));
    }
    
    return data;
  }
  
  private async validateMigratedData(data: any, version: string): Promise<void> {
    const validator = this.getValidatorForVersion(version);
    const validation = await validator.validate(data);
    
    if (!validation.isValid) {
      throw new MigrationError(
        `Data validation failed after migration to ${version}`,
        validation.errors
      );
    }
  }
}
```

### Schema Evolution

```typescript
interface SchemaEvolution {
  readonly version: string;
  readonly changes: readonly SchemaChange[];
  readonly migrationRequired: boolean;
  readonly backwardCompatible: boolean;
}

enum SchemaChangeType {
  ADD_FIELD = 'add_field',
  REMOVE_FIELD = 'remove_field',
  RENAME_FIELD = 'rename_field',
  CHANGE_TYPE = 'change_type',
  ADD_VALIDATION = 'add_validation',
  REMOVE_VALIDATION = 'remove_validation'
}

interface SchemaChange {
  readonly type: SchemaChangeType;
  readonly entityType: string;
  readonly fieldPath: string;
  readonly oldValue?: any;
  readonly newValue?: any;
  readonly migrationFunction?: string;
  readonly clinicalImpact: boolean;
}

const SCHEMA_EVOLUTION_HISTORY: readonly SchemaEvolution[] = [
  {
    version: '1.2',
    changes: [
      {
        type: SchemaChangeType.ADD_FIELD,
        entityType: 'Assessment',
        fieldPath: 'crisisDetected',
        newValue: 'boolean',
        clinicalImpact: true
      },
      {
        type: SchemaChangeType.ADD_FIELD,
        entityType: 'Assessment',
        fieldPath: 'metadata.validated',
        newValue: 'boolean',
        clinicalImpact: true
      }
    ],
    migrationRequired: true,
    backwardCompatible: true
  }
];
```

## Offline Queue Management

### Queue Architecture

```typescript
class PriorityOfflineQueue {
  private readonly queues = new Map<Priority, Queue<QueuedOperation>>();
  private readonly processingState = new Map<Priority, boolean>();
  
  constructor() {
    // Initialize priority queues
    Object.values(Priority).forEach(priority => {
      this.queues.set(priority, new Queue<QueuedOperation>());
      this.processingState.set(priority, false);
    });
  }
  
  async enqueue(
    operation: SyncOperation,
    priority: Priority = Priority.MEDIUM
  ): Promise<void> {
    const queuedOperation: QueuedOperation = {
      id: this.generateOperationId(),
      operation,
      priority,
      enqueuedAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: this.getMaxRetries(priority),
      clinicalSafety: operation.clinicalSafety
    };
    
    const queue = this.queues.get(priority);
    if (!queue) {
      throw new Error(`Invalid priority: ${priority}`);
    }
    
    queue.enqueue(queuedOperation);
    
    // Trigger processing for high-priority items
    if (priority === Priority.CRITICAL || priority === Priority.HIGH) {
      this.processQueue(priority);
    }
  }
  
  async processQueues(): Promise<void> {
    // Process queues in priority order
    const priorityOrder = [Priority.CRITICAL, Priority.HIGH, Priority.MEDIUM, Priority.LOW];
    
    for (const priority of priorityOrder) {
      if (!this.processingState.get(priority)) {
        await this.processQueue(priority);
      }
    }
  }
  
  private async processQueue(priority: Priority): Promise<void> {
    if (this.processingState.get(priority)) {
      return; // Already processing this queue
    }
    
    this.processingState.set(priority, true);
    
    try {
      const queue = this.queues.get(priority);
      if (!queue || queue.isEmpty()) {
        return;
      }
      
      const operation = queue.dequeue();
      if (!operation) {
        return;
      }
      
      const success = await this.executeOperation(operation);
      
      if (!success && operation.retryCount < operation.maxRetries) {
        // Re-queue with incremented retry count
        operation.retryCount++;
        operation.lastRetryAt = new Date().toISOString();
        
        // Apply exponential backoff
        const delay = this.calculateRetryDelay(operation.retryCount);
        setTimeout(() => {
          queue.enqueue(operation);
        }, delay);
      }
      
      // Continue processing queue
      if (!queue.isEmpty()) {
        setTimeout(() => this.processQueue(priority), 100);
      }
      
    } finally {
      this.processingState.set(priority, false);
    }
  }
}
```

### Retry Policies

```typescript
interface RetryPolicy {
  readonly maxRetries: number;
  readonly baseDelay: number; // milliseconds
  readonly maxDelay: number;
  readonly backoffStrategy: 'linear' | 'exponential' | 'fibonacci';
  readonly jitter: boolean;
}

class AdaptiveRetryManager {
  private readonly RETRY_POLICIES: Record<Priority, RetryPolicy> = {
    [Priority.CRITICAL]: {
      maxRetries: 10,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffStrategy: 'exponential',
      jitter: true
    },
    [Priority.HIGH]: {
      maxRetries: 5,
      baseDelay: 2000,
      maxDelay: 60000,
      backoffStrategy: 'exponential',
      jitter: true
    },
    [Priority.MEDIUM]: {
      maxRetries: 3,
      baseDelay: 5000,
      maxDelay: 300000,
      backoffStrategy: 'exponential',
      jitter: false
    },
    [Priority.LOW]: {
      maxRetries: 1,
      baseDelay: 30000,
      maxDelay: 600000,
      backoffStrategy: 'linear',
      jitter: false
    }
  };
  
  calculateRetryDelay(
    retryCount: number,
    priority: Priority,
    networkQuality?: NetworkQuality
  ): number {
    const policy = this.RETRY_POLICIES[priority];
    let delay: number;
    
    switch (policy.backoffStrategy) {
      case 'exponential':
        delay = Math.min(
          policy.baseDelay * Math.pow(2, retryCount - 1),
          policy.maxDelay
        );
        break;
        
      case 'fibonacci':
        delay = Math.min(
          policy.baseDelay * this.fibonacci(retryCount),
          policy.maxDelay
        );
        break;
        
      case 'linear':
      default:
        delay = Math.min(
          policy.baseDelay * retryCount,
          policy.maxDelay
        );
        break;
    }
    
    // Adjust for network quality
    if (networkQuality) {
      delay = this.adjustForNetworkQuality(delay, networkQuality);
    }
    
    // Add jitter to prevent thundering herd
    if (policy.jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      delay += (Math.random() - 0.5) * 2 * jitterAmount;
    }
    
    return Math.max(delay, 100); // Minimum delay of 100ms
  }
}
```

## Performance Optimization

### Sync Performance Monitoring

```typescript
class SyncPerformanceMonitor {
  private metrics: SyncMetrics = this.initializeMetrics();
  
  async measureSyncPerformance<T>(
    operation: () => Promise<T>,
    operationType: string
  ): Promise<T> {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();
    
    try {
      const result = await operation();
      
      const endTime = performance.now();
      const endMemory = this.getMemoryUsage();
      const duration = endTime - startTime;
      const memoryDelta = endMemory - startMemory;
      
      this.recordMetric({
        operationType,
        duration,
        memoryDelta,
        success: true,
        timestamp: new Date().toISOString()
      });
      
      return result;
      
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.recordMetric({
        operationType,
        duration,
        memoryDelta: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }
  
  getPerformanceReport(): SyncPerformanceReport {
    return {
      averageSyncDuration: this.calculateAverageDuration(),
      successRate: this.calculateSuccessRate(),
      memoryEfficiency: this.calculateMemoryEfficiency(),
      networkUtilization: this.calculateNetworkUtilization(),
      operationBreakdown: this.getOperationBreakdown(),
      recommendations: this.generatePerformanceRecommendations()
    };
  }
  
  private generatePerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.metrics.averageDuration > 30000) { // 30 seconds
      recommendations.push('Consider reducing batch sizes for faster sync');
    }
    
    if (this.metrics.memoryUsage > 50 * 1024 * 1024) { // 50MB
      recommendations.push('Implement streaming for large dataset sync');
    }
    
    if (this.metrics.successRate < 0.95) {
      recommendations.push('Improve error handling and retry logic');
    }
    
    if (this.metrics.networkUtilization < 0.5) {
      recommendations.push('Consider parallel sync operations');
    }
    
    return recommendations;
  }
}
```

### Intelligent Sync Scheduling

```typescript
class IntelligentSyncScheduler {
  private readonly userBehaviorAnalyzer: UserBehaviorAnalyzer;
  private readonly networkAnalyzer: NetworkAnalyzer;
  private readonly batteryMonitor: BatteryMonitor;
  
  async calculateOptimalSyncTime(): Promise<SyncSchedule> {
    // Analyze user behavior patterns
    const behaviorPattern = await this.userBehaviorAnalyzer.analyzePatterns();
    
    // Check network conditions
    const networkConditions = await this.networkAnalyzer.getCurrentConditions();
    
    // Monitor battery and device state
    const deviceState = await this.batteryMonitor.getDeviceState();
    
    // Calculate optimal sync windows
    const syncWindows = this.calculateSyncWindows(
      behaviorPattern,
      networkConditions,
      deviceState
    );
    
    return {
      immediateSync: this.shouldSyncImmediately(networkConditions, deviceState),
      nextScheduledSync: this.getNextOptimalTime(syncWindows),
      syncFrequency: this.calculateOptimalFrequency(behaviorPattern),
      backgroundSyncEnabled: this.shouldEnableBackgroundSync(deviceState),
      adaptiveScheduling: true
    };
  }
  
  private calculateSyncWindows(
    behavior: UserBehaviorPattern,
    network: NetworkConditions,
    device: DeviceState
  ): SyncWindow[] {
    const windows: SyncWindow[] = [];
    
    // Prefer sync during user's active periods with good network
    for (const activeWindow of behavior.activeWindows) {
      if (network.quality >= NetworkQuality.GOOD && device.batteryLevel > 0.3) {
        windows.push({
          startTime: activeWindow.start,
          endTime: activeWindow.end,
          priority: Priority.HIGH,
          reason: 'User active with good network conditions'
        });
      }
    }
    
    // Add low-priority windows during inactive periods
    for (const inactiveWindow of behavior.inactiveWindows) {
      if (device.batteryLevel > 0.5 && device.charging) {
        windows.push({
          startTime: inactiveWindow.start,
          endTime: inactiveWindow.end,
          priority: Priority.LOW,
          reason: 'Device charging during inactive period'
        });
      }
    }
    
    return windows;
  }
}
```

## Clinical Safety Protocols

### Clinical Validation Pipeline

```typescript
class ClinicalValidationPipeline {
  async validateSyncOperation(
    operation: SyncOperation
  ): Promise<ClinicalValidationResult> {
    const validators: ClinicalValidator[] = [
      new AssessmentScoringValidator(),
      new CrisisDetectionValidator(),
      new TherapeuticContinuityValidator(),
      new DataIntegrityValidator()
    ];
    
    const results: ValidationResult[] = [];
    
    for (const validator of validators) {
      if (validator.appliesTo(operation)) {
        const result = await validator.validate(operation);
        results.push(result);
        
        // Stop on critical validation failure
        if (!result.isValid && result.severity === 'critical') {
          throw new ClinicalValidationError(
            `Critical validation failure: ${result.message}`,
            operation,
            result
          );
        }
      }
    }
    
    return this.aggregateValidationResults(results);
  }
}

class AssessmentScoringValidator implements ClinicalValidator {
  appliesTo(operation: SyncOperation): boolean {
    return operation.entityType === EntityType.ASSESSMENT;
  }
  
  async validate(operation: SyncOperation): Promise<ValidationResult> {
    const assessment = operation.data as Assessment;
    
    // Validate score calculation
    const calculatedScore = assessment.answers.reduce((sum, answer) => sum + answer, 0);
    if (assessment.score !== calculatedScore) {
      return {
        isValid: false,
        severity: 'critical',
        message: `Assessment score mismatch: declared ${assessment.score}, calculated ${calculatedScore}`,
        context: {
          assessmentId: assessment.id,
          declaredScore: assessment.score,
          calculatedScore,
          answers: assessment.answers
        }
      };
    }
    
    // Validate crisis detection
    const crisisThreshold = assessment.type === 'phq9' ? 20 : 15;
    const shouldDetectCrisis = assessment.score >= crisisThreshold;
    if (assessment.crisisDetected !== shouldDetectCrisis) {
      return {
        isValid: false,
        severity: 'high',
        message: `Crisis detection error: score ${assessment.score}, detected ${assessment.crisisDetected}`,
        context: {
          assessmentId: assessment.id,
          score: assessment.score,
          crisisDetected: assessment.crisisDetected,
          shouldDetectCrisis
        }
      };
    }
    
    return {
      isValid: true,
      severity: 'none',
      message: 'Assessment validation passed'
    };
  }
}
```

### Therapeutic Continuity Preservation

```typescript
class TherapeuticContinuityGuard {
  async validateTherapeuticContinuity(
    operation: SyncOperation,
    context: TherapeuticContext
  ): Promise<ContinuityValidationResult> {
    switch (operation.entityType) {
      case EntityType.CHECK_IN:
        return this.validateCheckInContinuity(operation.data as CheckIn, context);
        
      case EntityType.ASSESSMENT:
        return this.validateAssessmentContinuity(operation.data as Assessment, context);
        
      case EntityType.CRISIS_PLAN:
        return this.validateCrisisPlanContinuity(operation.data as CrisisPlan, context);
        
      default:
        return { isValid: true, preservesContinuity: true };
    }
  }
  
  private async validateCheckInContinuity(
    checkIn: CheckIn,
    context: TherapeuticContext
  ): Promise<ContinuityValidationResult> {
    // Check for appropriate timing
    const today = new Date().toISOString().split('T')[0];
    const existingCheckIns = await context.dataStore.getCheckInsByType(checkIn.type);
    const todaysCheckIns = existingCheckIns.filter(c => 
      c.completedAt?.startsWith(today)
    );
    
    if (todaysCheckIns.length > 0 && !checkIn.id.startsWith('merge_')) {
      return {
        isValid: false,
        preservesContinuity: false,
        message: `Multiple ${checkIn.type} check-ins detected for today`,
        recommendation: 'Merge check-ins or mark as duplicate'
      };
    }
    
    // Check for therapeutic flow preservation
    const recentCheckIns = existingCheckIns.slice(-7); // Last 7 check-ins
    const flowAnalysis = this.analyzeTherapeuticFlow(recentCheckIns, checkIn);
    
    if (!flowAnalysis.preservesFlow) {
      return {
        isValid: true, // Not invalid, but flagged for review
        preservesContinuity: false,
        message: 'Check-in may disrupt therapeutic flow',
        recommendation: flowAnalysis.recommendation,
        flags: ['therapeutic_flow_concern']
      };
    }
    
    return {
      isValid: true,
      preservesContinuity: true,
      message: 'Check-in preserves therapeutic continuity'
    };
  }
}
```

## Monitoring and Observability

### Sync Health Monitoring

```typescript
interface SyncHealthMonitor {
  trackSyncMetrics(operation: SyncOperation, result: SyncResult): void;
  generateHealthReport(): SyncHealthReport;
  detectAnomalies(): SyncAnomaly[];
  getPerformanceInsights(): PerformanceInsight[];
}

class ComprehensiveSyncHealthMonitor implements SyncHealthMonitor {
  private metrics: SyncMetrics[] = [];
  private readonly METRIC_RETENTION_DAYS = 30;
  
  trackSyncMetrics(operation: SyncOperation, result: SyncResult): void {
    const metric: SyncMetrics = {
      operationId: operation.id,
      entityType: operation.entityType,
      operationType: operation.type,
      priority: operation.priority,
      startTime: operation.timestamp,
      endTime: result.completedAt,
      duration: new Date(result.completedAt).getTime() - new Date(operation.timestamp).getTime(),
      success: result.success,
      error: result.error,
      networkQuality: result.networkQuality,
      conflictsResolved: result.conflictsResolved || 0,
      clinicalSafety: operation.clinicalSafety,
      deviceId: operation.deviceId,
      dataSize: this.estimateDataSize(operation.data)
    };
    
    this.metrics.push(metric);
    this.cleanupOldMetrics();
  }
  
  generateHealthReport(): SyncHealthReport {
    const recentMetrics = this.getRecentMetrics(24); // Last 24 hours
    
    return {
      overallHealth: this.calculateOverallHealth(recentMetrics),
      syncSuccessRate: this.calculateSuccessRate(recentMetrics),
      averageSyncDuration: this.calculateAverageDuration(recentMetrics),
      clinicalDataSafety: this.calculateClinicalSafety(recentMetrics),
      networkPerformance: this.analyzeNetworkPerformance(recentMetrics),
      conflictResolution: this.analyzeConflictResolution(recentMetrics),
      anomalies: this.detectAnomalies(),
      recommendations: this.generateRecommendations(recentMetrics)
    };
  }
  
  detectAnomalies(): SyncAnomaly[] {
    const anomalies: SyncAnomaly[] = [];
    const recentMetrics = this.getRecentMetrics(24);
    
    // Detect unusual sync failure patterns
    const failureRate = this.calculateFailureRate(recentMetrics);
    if (failureRate > 0.1) { // >10% failure rate
      anomalies.push({
        type: 'high_failure_rate',
        severity: failureRate > 0.3 ? 'critical' : 'warning',
        description: `Sync failure rate is ${(failureRate * 100).toFixed(1)}%`,
        detectedAt: new Date().toISOString(),
        affectedOperations: recentMetrics.filter(m => !m.success).length
      });
    }
    
    // Detect performance degradation
    const avgDuration = this.calculateAverageDuration(recentMetrics);
    const baseline = this.getBaselinePerformance();
    if (avgDuration > baseline * 2) {
      anomalies.push({
        type: 'performance_degradation',
        severity: 'warning',
        description: `Sync duration is ${(avgDuration / baseline).toFixed(1)}x slower than baseline`,
        detectedAt: new Date().toISOString(),
        context: { currentAvg: avgDuration, baseline }
      });
    }
    
    // Detect clinical data issues
    const clinicalFailures = recentMetrics.filter(m => 
      m.clinicalSafety && !m.success
    );
    if (clinicalFailures.length > 0) {
      anomalies.push({
        type: 'clinical_data_sync_failure',
        severity: 'critical',
        description: `${clinicalFailures.length} clinical data sync failures detected`,
        detectedAt: new Date().toISOString(),
        affectedOperations: clinicalFailures.length
      });
    }
    
    return anomalies;
  }
}
```

### Real-time Sync Monitoring

```typescript
class RealTimeSyncMonitor {
  private eventEmitter = new EventEmitter();
  private activeOperations = new Map<string, ActiveSyncOperation>();
  
  startMonitoring(operation: SyncOperation): void {
    const activeOp: ActiveSyncOperation = {
      operation,
      startedAt: new Date().toISOString(),
      status: 'in_progress',
      progress: 0
    };
    
    this.activeOperations.set(operation.id, activeOp);
    
    this.eventEmitter.emit('sync_started', {
      operationId: operation.id,
      entityType: operation.entityType,
      priority: operation.priority,
      clinicalSafety: operation.clinicalSafety
    });
  }
  
  updateProgress(operationId: string, progress: number): void {
    const activeOp = this.activeOperations.get(operationId);
    if (activeOp) {
      activeOp.progress = progress;
      activeOp.lastUpdated = new Date().toISOString();
      
      this.eventEmitter.emit('sync_progress', {
        operationId,
        progress,
        estimatedTimeRemaining: this.estimateTimeRemaining(activeOp)
      });
    }
  }
  
  completeOperation(operationId: string, result: SyncResult): void {
    const activeOp = this.activeOperations.get(operationId);
    if (activeOp) {
      activeOp.status = result.success ? 'completed' : 'failed';
      activeOp.completedAt = new Date().toISOString();
      activeOp.result = result;
      
      this.eventEmitter.emit('sync_completed', {
        operationId,
        success: result.success,
        duration: new Date(activeOp.completedAt).getTime() - new Date(activeOp.startedAt).getTime(),
        clinicalSafety: activeOp.operation.clinicalSafety
      });
      
      // Clean up completed operation
      this.activeOperations.delete(operationId);
    }
  }
  
  getActiveSyncOperations(): ActiveSyncOperation[] {
    return Array.from(this.activeOperations.values());
  }
  
  onSyncEvent(event: string, listener: (data: any) => void): void {
    this.eventEmitter.on(event, listener);
  }
}
```

---

This comprehensive data synchronization protocol ensures that FullMind maintains clinical-grade data integrity while providing seamless multi-device experiences and robust offline functionality. The protocols prioritize clinical safety above all else while optimizing for performance and user experience.