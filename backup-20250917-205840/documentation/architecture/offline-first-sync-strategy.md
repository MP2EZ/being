# Offline-First Sync Strategy

## Overview

This document details FullMind's comprehensive offline-first synchronization strategy, designed to provide a seamless mental health application experience regardless of network connectivity. The strategy prioritizes clinical data integrity, therapeutic continuity, and user experience while maintaining robust data consistency across devices.

## Table of Contents

1. [Offline-First Philosophy](#offline-first-philosophy)
2. [Offline Queue Architecture](#offline-queue-architecture)
3. [Network Connectivity Detection](#network-connectivity-detection)
4. [Data Consistency Guarantees](#data-consistency-guarantees)
5. [User Experience Design](#user-experience-design)
6. [Performance Optimization](#performance-optimization)
7. [Testing Strategies](#testing-strategies)
8. [Monitoring and Analytics](#monitoring-and-analytics)
9. [Recovery Mechanisms](#recovery-mechanisms)
10. [Clinical Safety Protocols](#clinical-safety-protocols)

## Offline-First Philosophy

### Core Principles

1. **Local-First Data Authority**: The local device is the authoritative source for user data
2. **Zero Network Dependency**: Full application functionality without internet connectivity
3. **Seamless Connectivity Transitions**: Invisible sync when network becomes available
4. **Clinical Data Integrity**: 100% data preservation for mental health records
5. **User Empowerment**: Users control their data regardless of network status

### Architectural Foundation

```typescript
interface OfflineFirstArchitecture {
  readonly localDataStore: 'primary_source_of_truth';
  readonly remoteSync: 'enhancement_not_requirement';
  readonly conflictResolution: 'local_preference_with_clinical_safety';
  readonly userExperience: 'fully_functional_offline';
  readonly dataFlow: 'local_to_remote_sync';
}

const OFFLINE_FIRST_PRINCIPLES = {
  // Data flows from local to remote, never the reverse
  dataFlow: 'local → queue → remote',
  
  // User interactions work immediately, sync happens later
  userInteraction: 'immediate_response → queued_sync',
  
  // Clinical data safety is maintained at all times
  clinicalSafety: 'local_validation → queue_validation → remote_confirmation',
  
  // Network is an enhancement, not a requirement
  networkRole: 'sync_enhancement',
  
  // Conflicts favor local data with clinical validation
  conflictResolution: 'local_preference_with_safety_checks'
} as const;
```

## Offline Queue Architecture

### Queue System Design

```typescript
interface OfflineQueueSystem {
  readonly primaryQueue: EnhancedOfflineQueue;
  readonly priorityQueues: Map<Priority, OfflineQueue>;
  readonly deadLetterQueue: FailedOperationQueue;
  readonly clinicalSafetyQueue: ClinicalDataQueue;
}

class EnhancedOfflineQueue {
  private readonly queueStorage: QueueStorage;
  private readonly priorityManager: PriorityManager;
  private readonly clinicalValidator: ClinicalValidator;
  private readonly performanceMonitor: QueuePerformanceMonitor;
  
  async enqueueOperation(
    operation: OfflineOperation,
    options: OfflineQueueOptions = {}
  ): Promise<QueueResult> {
    const startTime = performance.now();
    
    try {
      // 1. Validate operation before queuing
      const validation = await this.validateOperation(operation);
      if (!validation.isValid) {
        throw new OfflineQueueError(
          'Operation validation failed',
          validation.errors
        );
      }
      
      // 2. Determine priority and clinical safety requirements
      const priority = this.determinePriority(operation, options);
      const clinicalSafety = this.requiresClinicalSafety(operation);
      
      // 3. Create queued operation with metadata
      const queuedOperation: QueuedOfflineOperation = {
        id: this.generateOperationId(),
        operation,
        priority,
        clinicalSafety,
        enqueuedAt: new Date().toISOString(),
        retryCount: 0,
        maxRetries: this.getMaxRetries(priority),
        metadata: {
          deviceId: await this.getDeviceId(),
          userId: this.getCurrentUserId(),
          operationSize: this.estimateOperationSize(operation),
          dependencies: options.dependencies || [],
          networkQualityAtEnqueue: await this.getCurrentNetworkQuality()
        }
      };
      
      // 4. Apply clinical safety validation if required
      if (clinicalSafety) {
        const clinicalValidation = await this.clinicalValidator.validate(queuedOperation);
        queuedOperation.clinicalValidation = clinicalValidation;
        
        if (!clinicalValidation.isValid) {
          throw new ClinicalSafetyError(
            'Clinical validation failed for queued operation',
            clinicalValidation.issues
          );
        }
      }
      
      // 5. Store in appropriate queue
      await this.storeInQueue(queuedOperation);
      
      // 6. Update queue statistics
      await this.updateQueueStatistics(queuedOperation);
      
      // 7. Trigger immediate processing for high-priority operations
      if (priority >= Priority.HIGH) {
        this.triggerImmediateProcessing(priority);
      }
      
      const result: QueueResult = {
        success: true,
        operationId: queuedOperation.id,
        queuePosition: await this.getQueuePosition(queuedOperation),
        estimatedProcessingTime: this.estimateProcessingTime(queuedOperation),
        metadata: {
          enqueueDuration: performance.now() - startTime,
          queueSize: await this.getQueueSize(),
          priority
        }
      };
      
      this.performanceMonitor.recordEnqueueMetrics(result);
      return result;
      
    } catch (error) {
      const errorResult: QueueResult = {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown queue error'),
        metadata: {
          enqueueDuration: performance.now() - startTime,
          queueSize: await this.getQueueSize(),
          priority: Priority.MEDIUM
        }
      };
      
      this.performanceMonitor.recordEnqueueError(errorResult);
      return errorResult;
    }
  }
  
  private determinePriority(
    operation: OfflineOperation,
    options: OfflineQueueOptions
  ): Priority {
    // Explicit priority override
    if (options.priority) {
      return options.priority;
    }
    
    // Clinical data gets high priority
    if (this.isClinicalData(operation)) {
      return Priority.HIGH;
    }
    
    // Crisis-related data gets critical priority
    if (this.isCrisisData(operation)) {
      return Priority.CRITICAL;
    }
    
    // Check-in data during therapeutic windows gets medium priority
    if (this.isTherapeuticTiming(operation)) {
      return Priority.MEDIUM;
    }
    
    // Default to low priority
    return Priority.LOW;
  }
}
```

### Queue Processing Engine

```typescript
class QueueProcessingEngine {
  private readonly processingState = new Map<Priority, ProcessingState>();
  private readonly batchProcessor: BatchProcessor;
  private readonly conflictResolver: ConflictResolver;
  private readonly networkMonitor: NetworkMonitor;
  
  async startProcessing(): Promise<void> {
    // Initialize processing state for all priority levels
    Object.values(Priority).forEach(priority => {
      this.processingState.set(priority, {
        isProcessing: false,
        lastProcessed: null,
        consecutiveFailures: 0,
        backoffUntil: null
      });
    });
    
    // Start the main processing loop
    this.scheduleProcessing();
  }
  
  private async scheduleProcessing(): Promise<void> {
    // Process queues in priority order
    const priorityOrder = [Priority.CRITICAL, Priority.HIGH, Priority.MEDIUM, Priority.LOW];
    
    for (const priority of priorityOrder) {
      const state = this.processingState.get(priority);
      if (!state || state.isProcessing) {
        continue;
      }
      
      // Check if we're in backoff period
      if (state.backoffUntil && new Date() < new Date(state.backoffUntil)) {
        continue;
      }
      
      // Check network requirements for this priority
      if (await this.shouldProcessQueue(priority)) {
        this.processQueue(priority);
      }
    }
    
    // Schedule next processing cycle
    setTimeout(() => this.scheduleProcessing(), this.getProcessingInterval());
  }
  
  private async processQueue(priority: Priority): Promise<void> {
    const state = this.processingState.get(priority);
    if (!state || state.isProcessing) {
      return;
    }
    
    state.isProcessing = true;
    
    try {
      const queue = await this.getQueue(priority);
      const operations = await queue.peek(this.getBatchSize(priority));
      
      if (operations.length === 0) {
        return;
      }
      
      console.log(`Processing ${operations.length} operations at priority ${priority}`);
      
      // Process operations in batches
      const batchResults = await this.batchProcessor.processBatch(operations);
      
      // Handle results
      await this.handleBatchResults(batchResults, queue);
      
      // Update processing state
      state.lastProcessed = new Date().toISOString();
      state.consecutiveFailures = 0;
      state.backoffUntil = null;
      
    } catch (error) {
      console.error(`Queue processing error for priority ${priority}:`, error);
      
      // Handle processing failure
      state.consecutiveFailures++;
      state.backoffUntil = this.calculateBackoffTime(state.consecutiveFailures);
      
    } finally {
      state.isProcessing = false;
    }
  }
  
  private async shouldProcessQueue(priority: Priority): Promise<boolean> {
    const networkQuality = await this.networkMonitor.getCurrentQuality();
    
    // Always process critical operations offline
    if (priority === Priority.CRITICAL) {
      return true;
    }
    
    // High priority requires at least poor network
    if (priority === Priority.HIGH) {
      return networkQuality >= NetworkQuality.POOR;
    }
    
    // Medium priority requires fair network
    if (priority === Priority.MEDIUM) {
      return networkQuality >= NetworkQuality.FAIR;
    }
    
    // Low priority requires good network
    return networkQuality >= NetworkQuality.GOOD;
  }
}
```

### Intelligent Batching

```typescript
class IntelligentBatchProcessor {
  private readonly OPTIMAL_BATCH_SIZES = {
    [Priority.CRITICAL]: 1,    // Process immediately
    [Priority.HIGH]: 5,        // Small batches for responsiveness
    [Priority.MEDIUM]: 20,     // Balanced batches
    [Priority.LOW]: 50         // Large batches for efficiency
  };
  
  async processBatch(operations: QueuedOfflineOperation[]): Promise<BatchProcessingResult> {
    const batchId = this.generateBatchId();
    const startTime = performance.now();
    
    console.log(`Processing batch ${batchId} with ${operations.length} operations`);
    
    try {
      // 1. Group operations by type for efficient processing
      const groupedOperations = this.groupOperationsByType(operations);
      
      // 2. Check for dependencies and reorder if necessary
      const orderedOperations = await this.resolveDependencies(groupedOperations);
      
      // 3. Process operations with parallel execution where possible
      const results = await this.executeOperations(orderedOperations);
      
      // 4. Handle any conflicts that arise
      const conflictResolutions = await this.resolveConflicts(results);
      
      const batchResult: BatchProcessingResult = {
        batchId,
        success: true,
        operationsProcessed: operations.length,
        successfulOperations: results.filter(r => r.success).length,
        failedOperations: results.filter(r => !r.success).length,
        conflictsResolved: conflictResolutions.length,
        processingTime: performance.now() - startTime,
        results,
        conflictResolutions
      };
      
      console.log(`Batch ${batchId} completed: ${batchResult.successfulOperations}/${batchResult.operationsProcessed} successful`);
      
      return batchResult;
      
    } catch (error) {
      return {
        batchId,
        success: false,
        operationsProcessed: operations.length,
        successfulOperations: 0,
        failedOperations: operations.length,
        conflictsResolved: 0,
        processingTime: performance.now() - startTime,
        results: [],
        conflictResolutions: [],
        error: error instanceof Error ? error : new Error('Batch processing failed')
      };
    }
  }
  
  private async executeOperations(
    operations: QueuedOfflineOperation[]
  ): Promise<OperationResult[]> {
    const results: OperationResult[] = [];
    
    // Process operations with respect to dependencies
    for (const operation of operations) {
      try {
        const result = await this.executeOperation(operation);
        results.push(result);
        
        // For clinical data, validate the result immediately
        if (operation.clinicalSafety) {
          const validation = await this.validateClinicalResult(result);
          if (!validation.isValid) {
            throw new ClinicalSafetyError(
              'Clinical validation failed after operation execution',
              validation.issues
            );
          }
        }
        
      } catch (error) {
        const errorResult: OperationResult = {
          operationId: operation.id,
          success: false,
          error: error instanceof Error ? error : new Error('Operation execution failed'),
          timestamp: new Date().toISOString(),
          clinicalSafety: operation.clinicalSafety
        };
        
        results.push(errorResult);
        
        // For critical operations, we may want to halt batch processing
        if (operation.priority === Priority.CRITICAL && operation.clinicalSafety) {
          console.error(`Critical clinical operation failed: ${operation.id}`);
          // Continue processing but flag for emergency review
          await this.flagForEmergencyReview(operation, errorResult);
        }
      }
    }
    
    return results;
  }
}
```

## Network Connectivity Detection

### Advanced Network Monitoring

```typescript
interface NetworkMonitoringSystem {
  readonly qualityDetector: NetworkQualityDetector;
  readonly connectivityTracker: ConnectivityTracker;
  readonly adaptiveScheduler: AdaptiveScheduler;
  readonly offlineIndicator: OfflineIndicator;
}

class ComprehensiveNetworkMonitor {
  private currentQuality: NetworkQuality = NetworkQuality.UNKNOWN;
  private connectivity: ConnectivityState = ConnectivityState.UNKNOWN;
  private qualityHistory: NetworkQualityMeasurement[] = [];
  private listeners: NetworkChangeListener[] = [];
  
  async initialize(): Promise<void> {
    // Set up multiple network monitoring methods
    await this.setupReachabilityMonitoring();
    await this.setupQualityMonitoring();
    await this.setupAdaptiveThrottling();
    
    // Start continuous monitoring
    this.startContinuousMonitoring();
    
    console.log('Network monitoring system initialized');
  }
  
  private async setupQualityMonitoring(): Promise<void> {
    // Test network quality using multiple indicators
    setInterval(async () => {
      const measurement = await this.measureNetworkQuality();
      this.qualityHistory.push(measurement);
      
      // Keep only recent measurements
      if (this.qualityHistory.length > 100) {
        this.qualityHistory = this.qualityHistory.slice(-100);
      }
      
      // Calculate rolling average quality
      const newQuality = this.calculateAverageQuality();
      
      if (newQuality !== this.currentQuality) {
        const previousQuality = this.currentQuality;
        this.currentQuality = newQuality;
        
        console.log(`Network quality changed: ${previousQuality} → ${newQuality}`);
        
        // Notify listeners of quality change
        this.notifyQualityChange(previousQuality, newQuality);
      }
    }, 10000); // Check every 10 seconds
  }
  
  private async measureNetworkQuality(): Promise<NetworkQualityMeasurement> {
    const startTime = performance.now();
    
    try {
      // Test with a lightweight endpoint
      const response = await fetch('/api/ping', {
        method: 'GET',
        timeout: 5000
      });
      
      const latency = performance.now() - startTime;
      const success = response.ok;
      
      // Determine quality based on latency and success
      let quality: NetworkQuality;
      if (!success) {
        quality = NetworkQuality.OFFLINE;
      } else if (latency < 100) {
        quality = NetworkQuality.EXCELLENT;
      } else if (latency < 300) {
        quality = NetworkQuality.GOOD;
      } else if (latency < 1000) {
        quality = NetworkQuality.FAIR;
      } else {
        quality = NetworkQuality.POOR;
      }
      
      return {
        quality,
        latency,
        success,
        timestamp: new Date().toISOString(),
        bandwidth: await this.estimateBandwidth()
      };
      
    } catch (error) {
      return {
        quality: NetworkQuality.OFFLINE,
        latency: -1,
        success: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Network test failed'
      };
    }
  }
  
  async getOptimalSyncStrategy(): Promise<SyncStrategy> {
    const currentQuality = this.getCurrentQuality();
    const recentHistory = this.getRecentQualityHistory();
    const stabilityScore = this.calculateStabilityScore(recentHistory);
    
    if (currentQuality === NetworkQuality.OFFLINE) {
      return {
        mode: 'offline_only',
        batchSize: 0,
        retryDelay: 30000, // 30 seconds
        priorityThreshold: Priority.CRITICAL
      };
    }
    
    if (currentQuality === NetworkQuality.POOR || stabilityScore < 0.5) {
      return {
        mode: 'conservative',
        batchSize: 5,
        retryDelay: 10000, // 10 seconds
        priorityThreshold: Priority.HIGH
      };
    }
    
    if (currentQuality === NetworkQuality.FAIR) {
      return {
        mode: 'balanced',
        batchSize: 20,
        retryDelay: 5000, // 5 seconds
        priorityThreshold: Priority.MEDIUM
      };
    }
    
    // Good or excellent quality
    return {
      mode: 'aggressive',
      batchSize: 50,
      retryDelay: 2000, // 2 seconds
      priorityThreshold: Priority.LOW
    };
  }
}
```

### Connectivity State Management

```typescript
enum ConnectivityState {
  UNKNOWN = 'unknown',
  OFFLINE = 'offline',
  ONLINE_POOR = 'online_poor',
  ONLINE_GOOD = 'online_good',
  ONLINE_EXCELLENT = 'online_excellent'
}

class ConnectivityStateManager {
  private currentState: ConnectivityState = ConnectivityState.UNKNOWN;
  private stateHistory: ConnectivityStateChange[] = [];
  private transitionHandlers = new Map<string, StateTransitionHandler>();
  
  constructor() {
    this.registerTransitionHandlers();
  }
  
  private registerTransitionHandlers(): void {
    // Offline → Online transitions
    this.transitionHandlers.set('offline_to_online', async (from, to) => {
      console.log('Device came online - triggering sync');
      
      // Trigger immediate sync for critical operations
      await this.syncService.triggerPrioritySync(Priority.CRITICAL);
      
      // Gradually increase sync activity based on network quality
      await this.syncService.adaptToNetworkQuality(this.mapConnectivityToQuality(to));
      
      // Notify user of connectivity restoration
      this.notificationService.showConnectivityRestored();
    });
    
    // Online → Offline transitions
    this.transitionHandlers.set('online_to_offline', async (from, to) => {
      console.log('Device went offline - preserving data locally');
      
      // Ensure all pending operations are safely queued
      await this.syncService.preservePendingOperations();
      
      // Switch to offline-only mode
      await this.syncService.enterOfflineMode();
      
      // Notify user of offline status
      this.notificationService.showOfflineMode();
    });
    
    // Quality degradation
    this.transitionHandlers.set('quality_degraded', async (from, to) => {
      console.log(`Network quality degraded: ${from} → ${to}`);
      
      // Reduce sync aggressiveness
      await this.syncService.reduceSyncActivity();
      
      // Increase local caching
      await this.cacheService.increaseLocalCaching();
    });
    
    // Quality improvement
    this.transitionHandlers.set('quality_improved', async (from, to) => {
      console.log(`Network quality improved: ${from} → ${to}`);
      
      // Increase sync aggressiveness gradually
      await this.syncService.increaseSyncActivity();
      
      // Process any queued operations
      await this.syncService.processQueuedOperations();
    });
  }
  
  async updateConnectivityState(newState: ConnectivityState): Promise<void> {
    if (newState === this.currentState) {
      return; // No change
    }
    
    const previousState = this.currentState;
    const transition: ConnectivityStateChange = {
      from: previousState,
      to: newState,
      timestamp: new Date().toISOString(),
      cause: await this.determineCause(previousState, newState)
    };
    
    this.stateHistory.push(transition);
    this.currentState = newState;
    
    // Execute appropriate transition handler
    const transitionKey = this.getTransitionKey(previousState, newState);
    const handler = this.transitionHandlers.get(transitionKey);
    
    if (handler) {
      try {
        await handler(previousState, newState);
      } catch (error) {
        console.error(`Transition handler failed: ${transitionKey}`, error);
      }
    }
    
    // Notify all listeners
    this.notifyStateChange(transition);
  }
}
```

## Data Consistency Guarantees

### Eventual Consistency Model

```typescript
interface ConsistencyGuarantees {
  readonly localConsistency: 'immediate_and_strong';
  readonly remoteConsistency: 'eventual_with_conflict_resolution';
  readonly clinicalDataConsistency: 'strong_with_validation';
  readonly crossDeviceConsistency: 'eventual_with_therapeutic_priority';
}

class EventualConsistencyManager {
  private readonly consistencyCheckers = new Map<EntityType, ConsistencyChecker>();
  private readonly reconciliationEngine: ReconciliationEngine;
  
  async ensureDataConsistency(): Promise<ConsistencyReport> {
    const consistencyIssues: ConsistencyIssue[] = [];
    const reconciliationActions: ReconciliationAction[] = [];
    
    // Check consistency for each entity type
    for (const [entityType, checker] of this.consistencyCheckers) {
      try {
        const issues = await checker.checkConsistency();
        consistencyIssues.push(...issues);
        
        // Attempt automatic reconciliation for safe issues
        for (const issue of issues) {
          if (issue.autoReconcilable) {
            const action = await this.reconciliationEngine.reconcile(issue);
            reconciliationActions.push(action);
          }
        }
        
      } catch (error) {
        console.error(`Consistency check failed for ${entityType}:`, error);
        consistencyIssues.push({
          entityType,
          issueType: 'check_failure',
          severity: 'high',
          description: `Failed to check consistency: ${error}`,
          autoReconcilable: false
        });
      }
    }
    
    return {
      overallConsistency: this.calculateOverallConsistency(consistencyIssues),
      issues: consistencyIssues,
      reconciliationActions,
      checkedAt: new Date().toISOString(),
      recommendations: this.generateConsistencyRecommendations(consistencyIssues)
    };
  }
  
  async guaranteeLocalConsistency(): Promise<void> {
    // Ensure all local operations maintain ACID properties
    await this.validateTransactionalIntegrity();
    
    // Check referential integrity
    await this.validateReferentialIntegrity();
    
    // Validate clinical data constraints
    await this.validateClinicalConstraints();
    
    // Ensure data format consistency
    await this.validateDataFormats();
  }
  
  private async validateClinicalConstraints(): Promise<void> {
    // Validate assessment scoring accuracy
    const assessments = await this.dataStore.getAssessments();
    for (const assessment of assessments) {
      const calculatedScore = assessment.answers.reduce((sum, answer) => sum + answer, 0);
      if (assessment.score !== calculatedScore) {
        throw new ConsistencyError(
          `Assessment ${assessment.id} has invalid score: declared ${assessment.score}, calculated ${calculatedScore}`
        );
      }
    }
    
    // Validate crisis detection consistency
    for (const assessment of assessments) {
      const threshold = assessment.type === 'phq9' ? 20 : 15;
      const shouldDetectCrisis = assessment.score >= threshold;
      if (assessment.crisisDetected !== shouldDetectCrisis) {
        throw new ConsistencyError(
          `Assessment ${assessment.id} has inconsistent crisis detection`
        );
      }
    }
    
    // Validate check-in data completeness
    const checkIns = await this.dataStore.getCheckIns();
    for (const checkIn of checkIns) {
      if (checkIn.completed && this.isIncompleteData(checkIn)) {
        console.warn(`Check-in ${checkIn.id} marked complete but has incomplete data`);
        // Auto-fix by marking as incomplete
        await this.dataStore.updateCheckIn(checkIn.id, { completed: false });
      }
    }
  }
}
```

### Conflict-Free Data Structures

```typescript
class ConflictFreeReplicatedDataType<T> {
  private readonly id: string;
  private readonly localState: Map<string, TimestampedValue<T>>;
  private readonly vectorClock: VectorClock;
  
  constructor(id: string) {
    this.id = id;
    this.localState = new Map();
    this.vectorClock = new VectorClock();
  }
  
  async setValue(key: string, value: T): Promise<void> {
    const timestamp = this.vectorClock.increment(this.id);
    
    const timestampedValue: TimestampedValue<T> = {
      value,
      timestamp,
      deviceId: this.id,
      vectorClock: this.vectorClock.copy()
    };
    
    this.localState.set(key, timestampedValue);
    
    // Queue for sync if network available
    await this.queueForSync(key, timestampedValue);
  }
  
  getValue(key: string): T | undefined {
    const timestampedValue = this.localState.get(key);
    return timestampedValue?.value;
  }
  
  async merge(remoteState: Map<string, TimestampedValue<T>>): Promise<MergeResult> {
    const conflicts: ConflictingValue<T>[] = [];
    const resolved: ResolvedValue<T>[] = [];
    
    for (const [key, remoteValue] of remoteState) {
      const localValue = this.localState.get(key);
      
      if (!localValue) {
        // No local value, accept remote
        this.localState.set(key, remoteValue);
        resolved.push({ key, value: remoteValue.value, source: 'remote' });
        continue;
      }
      
      // Compare vector clocks to determine order
      const comparison = this.vectorClock.compare(localValue.vectorClock, remoteValue.vectorClock);
      
      if (comparison === ClockComparison.BEFORE) {
        // Remote is newer, use remote value
        this.localState.set(key, remoteValue);
        resolved.push({ key, value: remoteValue.value, source: 'remote' });
      } else if (comparison === ClockComparison.AFTER) {
        // Local is newer, keep local value
        resolved.push({ key, value: localValue.value, source: 'local' });
      } else {
        // Concurrent updates - conflict needs resolution
        conflicts.push({
          key,
          localValue: localValue.value,
          remoteValue: remoteValue.value,
          localTimestamp: localValue.timestamp,
          remoteTimestamp: remoteValue.timestamp
        });
      }
    }
    
    return { conflicts, resolved };
  }
}
```

## User Experience Design

### Offline Indicators and Feedback

```typescript
interface OfflineUXManager {
  showOfflineIndicator(): void;
  hideOfflineIndicator(): void;
  showSyncProgress(progress: SyncProgress): void;
  showConflictResolution(conflicts: SyncConflict[]): void;
  showDataPreservationNotice(): void;
}

class SeamlessOfflineExperience implements OfflineUXManager {
  private readonly notificationService: NotificationService;
  private readonly animationService: AnimationService;
  private readonly accessibilityService: AccessibilityService;
  
  showOfflineIndicator(): void {
    // Subtle, non-intrusive offline indicator
    this.notificationService.showPersistentNotification({
      id: 'offline_indicator',
      type: 'info',
      title: 'Working Offline',
      message: 'Your data is being saved locally and will sync when connected.',
      icon: 'offline',
      dismissible: false,
      position: 'top',
      priority: 'low'
    });
    
    // Update app header with offline badge
    this.updateAppHeader({ 
      badge: 'offline',
      badgeColor: '#666',
      badgeAccessibilityLabel: 'Application is currently offline'
    });
    
    // Announce to screen readers
    this.accessibilityService.announce(
      'Application is now working offline. Your data will be saved locally.',
      'polite'
    );
  }
  
  showSyncProgress(progress: SyncProgress): void {
    if (progress.isVisible) {
      this.notificationService.showProgress({
        id: 'sync_progress',
        title: 'Syncing Data',
        progress: progress.percentage,
        message: `${progress.completed} of ${progress.total} items synced`,
        estimatedTimeRemaining: progress.estimatedTimeRemaining,
        cancellable: false
      });
    } else {
      // Background sync - show minimal indicator
      this.updateAppHeader({
        badge: 'syncing',
        badgeColor: '#007AFF',
        badgeAnimation: 'pulse'
      });
    }
  }
  
  showConflictResolution(conflicts: SyncConflict[]): void {
    if (conflicts.length === 0) return;
    
    // Prioritize clinical data conflicts
    const clinicalConflicts = conflicts.filter(c => c.clinicalData);
    const regularConflicts = conflicts.filter(c => !c.clinicalData);
    
    if (clinicalConflicts.length > 0) {
      this.showClinicalConflictDialog(clinicalConflicts);
    }
    
    if (regularConflicts.length > 0) {
      this.showRegularConflictNotification(regularConflicts);
    }
  }
  
  private showClinicalConflictDialog(conflicts: SyncConflict[]): void {
    this.notificationService.showDialog({
      id: 'clinical_conflict_resolution',
      type: 'warning',
      title: 'Clinical Data Sync Conflict',
      message: `We found ${conflicts.length} conflict(s) in your clinical data. Your local data has been preserved for safety.`,
      buttons: [
        {
          text: 'Review Conflicts',
          action: () => this.navigateToConflictResolution(conflicts),
          primary: true
        },
        {
          text: 'Keep Local Data',
          action: () => this.resolveConflictsWithLocal(conflicts),
          secondary: true
        }
      ],
      persistent: true,
      priority: 'high'
    });
  }
  
  showDataPreservationNotice(): void {
    this.notificationService.showToast({
      type: 'success',
      message: 'Your data has been safely preserved offline',
      icon: 'shield-check',
      duration: 3000,
      position: 'bottom'
    });
    
    // Log for analytics
    this.analyticsService.track('data_preservation_notice_shown', {
      timestamp: new Date().toISOString(),
      context: 'offline_mode'
    });
  }
}
```

### Optimistic UI Updates

```typescript
class OptimisticUIManager {
  private readonly pendingUpdates = new Map<string, OptimisticUpdate>();
  private readonly rollbackService: RollbackService;
  
  async applyOptimisticUpdate<T>(
    entityId: string,
    updateFunction: (current: T) => T,
    operationId: string
  ): Promise<OptimisticUpdateResult> {
    try {
      // Get current data
      const currentData = await this.dataStore.getEntity<T>(entityId);
      if (!currentData) {
        throw new Error(`Entity ${entityId} not found for optimistic update`);
      }
      
      // Apply optimistic update
      const optimisticData = updateFunction(currentData);
      
      // Validate update for clinical safety
      if (this.isClinicalData(optimisticData)) {
        const validation = await this.validateClinicalData(optimisticData);
        if (!validation.isValid) {
          throw new ClinicalSafetyError(
            'Optimistic update would compromise clinical data safety',
            validation.issues
          );
        }
      }
      
      // Store original data for potential rollback
      const optimisticUpdate: OptimisticUpdate = {
        id: operationId,
        entityId,
        originalData: currentData,
        optimisticData,
        appliedAt: new Date().toISOString(),
        clinicalData: this.isClinicalData(optimisticData)
      };
      
      this.pendingUpdates.set(operationId, optimisticUpdate);
      
      // Apply update to UI state
      await this.uiStateManager.updateEntity(entityId, optimisticData);
      
      // Show subtle loading indicator for clinical data
      if (optimisticUpdate.clinicalData) {
        this.showClinicalDataPendingIndicator(entityId);
      }
      
      return {
        success: true,
        updateId: operationId,
        rollbackAvailable: true
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Optimistic update failed'),
        rollbackAvailable: false
      };
    }
  }
  
  async confirmOptimisticUpdate(operationId: string): Promise<void> {
    const update = this.pendingUpdates.get(operationId);
    if (!update) {
      console.warn(`No pending optimistic update found for operation ${operationId}`);
      return;
    }
    
    // Remove from pending updates
    this.pendingUpdates.delete(operationId);
    
    // Remove any pending indicators
    if (update.clinicalData) {
      this.hideClinicalDataPendingIndicator(update.entityId);
    }
    
    console.log(`Confirmed optimistic update for operation ${operationId}`);
  }
  
  async rollbackOptimisticUpdate(operationId: string): Promise<void> {
    const update = this.pendingUpdates.get(operationId);
    if (!update) {
      console.warn(`No pending optimistic update found for operation ${operationId}`);
      return;
    }
    
    // Restore original data
    await this.uiStateManager.updateEntity(update.entityId, update.originalData);
    
    // Remove from pending updates
    this.pendingUpdates.delete(operationId);
    
    // Show rollback notification for clinical data
    if (update.clinicalData) {
      this.showClinicalDataRollbackNotification(update.entityId);
    }
    
    console.log(`Rolled back optimistic update for operation ${operationId}`);
  }
}
```

## Performance Optimization

### Memory Management

```typescript
class OfflineMemoryManager {
  private readonly MEMORY_THRESHOLDS = {
    WARNING: 100 * 1024 * 1024,  // 100MB
    CRITICAL: 200 * 1024 * 1024  // 200MB
  };
  
  private readonly memoryMonitor: MemoryMonitor;
  private readonly cacheManager: CacheManager;
  private readonly garbageCollector: GarbageCollector;
  
  async optimizeMemoryUsage(): Promise<MemoryOptimizationResult> {
    const currentUsage = await this.memoryMonitor.getCurrentUsage();
    const optimizations: MemoryOptimization[] = [];
    
    if (currentUsage > this.MEMORY_THRESHOLDS.CRITICAL) {
      // Critical memory pressure - aggressive cleanup
      optimizations.push(await this.performAggressiveCleanup());
    } else if (currentUsage > this.MEMORY_THRESHOLDS.WARNING) {
      // Warning level - moderate cleanup
      optimizations.push(await this.performModerateCleanup());
    }
    
    // Always optimize queues
    optimizations.push(await this.optimizeQueueMemory());
    
    const finalUsage = await this.memoryMonitor.getCurrentUsage();
    const memoryFreed = currentUsage - finalUsage;
    
    return {
      initialUsage: currentUsage,
      finalUsage,
      memoryFreed,
      optimizations,
      efficiency: memoryFreed / currentUsage
    };
  }
  
  private async performAggressiveCleanup(): Promise<MemoryOptimization> {
    const freed = await Promise.all([
      this.cacheManager.clearNonEssentialCache(),
      this.garbageCollector.forceCollection(),
      this.compressQueuedOperations(),
      this.archiveOldData()
    ]);
    
    return {
      type: 'aggressive_cleanup',
      memoryFreed: freed.reduce((sum, amount) => sum + amount, 0),
      actions: ['clear_cache', 'force_gc', 'compress_queue', 'archive_data']
    };
  }
  
  private async optimizeQueueMemory(): Promise<MemoryOptimization> {
    const beforeSize = await this.getQueueMemoryUsage();
    
    // Compress large operations
    await this.compressLargeOperations();
    
    // Remove duplicate operations
    await this.deduplicateQueueOperations();
    
    // Archive completed operations
    await this.archiveCompletedOperations();
    
    const afterSize = await this.getQueueMemoryUsage();
    
    return {
      type: 'queue_optimization',
      memoryFreed: beforeSize - afterSize,
      actions: ['compress_operations', 'deduplicate', 'archive_completed']
    };
  }
}
```

### Storage Optimization

```typescript
class OfflineStorageOptimizer {
  private readonly STORAGE_QUOTAS = {
    CRITICAL_DATA: 50 * 1024 * 1024,   // 50MB for critical clinical data
    STANDARD_DATA: 100 * 1024 * 1024,  // 100MB for standard data
    CACHE_DATA: 200 * 1024 * 1024      // 200MB for cache data
  };
  
  async optimizeStorage(): Promise<StorageOptimizationResult> {
    const currentUsage = await this.calculateStorageUsage();
    const optimizations: StorageOptimization[] = [];
    
    // Prioritize clinical data storage
    if (currentUsage.clinical > this.STORAGE_QUOTAS.CRITICAL_DATA * 0.8) {
      optimizations.push(await this.optimizeClinicalDataStorage());
    }
    
    // Optimize standard data
    if (currentUsage.standard > this.STORAGE_QUOTAS.STANDARD_DATA * 0.8) {
      optimizations.push(await this.optimizeStandardDataStorage());
    }
    
    // Clean up cache if necessary
    if (currentUsage.cache > this.STORAGE_QUOTAS.CACHE_DATA * 0.9) {
      optimizations.push(await this.optimizeCacheStorage());
    }
    
    const finalUsage = await this.calculateStorageUsage();
    
    return {
      before: currentUsage,
      after: finalUsage,
      spaceFreed: this.calculateSpaceFreed(currentUsage, finalUsage),
      optimizations
    };
  }
  
  private async optimizeClinicalDataStorage(): Promise<StorageOptimization> {
    const actions: string[] = [];
    let spaceFreed = 0;
    
    // Compress old assessments while preserving data integrity
    const assessmentCompression = await this.compressOldAssessments();
    spaceFreed += assessmentCompression.spaceFreed;
    actions.push('compress_assessments');
    
    // Archive old check-ins beyond retention period
    const checkInArchive = await this.archiveOldCheckIns();
    spaceFreed += checkInArchive.spaceFreed;
    actions.push('archive_checkins');
    
    // Optimize crisis plan storage
    const crisisPlanOptimization = await this.optimizeCrisisPlanStorage();
    spaceFreed += crisisPlanOptimization.spaceFreed;
    actions.push('optimize_crisis_plans');
    
    return {
      type: 'clinical_data_optimization',
      spaceFreed,
      actions,
      dataIntegrityMaintained: true
    };
  }
  
  private async compressOldAssessments(): Promise<CompressionResult> {
    const oldAssessments = await this.getAssessmentsOlderThan(90); // 90 days
    let totalSpaceFreed = 0;
    
    for (const assessment of oldAssessments) {
      const originalSize = this.calculateDataSize(assessment);
      const compressedAssessment = await this.compressAssessment(assessment);
      const compressedSize = this.calculateDataSize(compressedAssessment);
      
      await this.dataStore.updateAssessment(assessment.id, compressedAssessment);
      totalSpaceFreed += originalSize - compressedSize;
    }
    
    return {
      itemsProcessed: oldAssessments.length,
      spaceFreed: totalSpaceFreed,
      compressionRatio: totalSpaceFreed / this.calculateTotalSize(oldAssessments)
    };
  }
}
```

## Testing Strategies

### Offline Testing Framework

```typescript
class OfflineTestingFramework {
  private readonly networkSimulator: NetworkSimulator;
  private readonly testDataGenerator: TestDataGenerator;
  private readonly validationEngine: ValidationEngine;
  
  async runOfflineTestSuite(): Promise<TestSuiteResult> {
    const testResults: TestResult[] = [];
    
    // Test basic offline functionality
    testResults.push(await this.testBasicOfflineFunctionality());
    
    // Test network transition scenarios
    testResults.push(await this.testNetworkTransitions());
    
    // Test data consistency scenarios
    testResults.push(await this.testDataConsistency());
    
    // Test clinical data safety
    testResults.push(await this.testClinicalDataSafety());
    
    // Test performance under offline conditions
    testResults.push(await this.testOfflinePerformance());
    
    return {
      totalTests: testResults.length,
      passedTests: testResults.filter(r => r.passed).length,
      failedTests: testResults.filter(r => !r.passed).length,
      results: testResults,
      overallPassed: testResults.every(r => r.passed)
    };
  }
  
  async testNetworkTransitions(): Promise<TestResult> {
    const scenarios: NetworkTransitionScenario[] = [
      { from: 'online', to: 'offline', during: 'checkin_save' },
      { from: 'offline', to: 'online', during: 'app_startup' },
      { from: 'good_network', to: 'poor_network', during: 'sync_operation' },
      { from: 'poor_network', to: 'offline', during: 'assessment_submission' }
    ];
    
    const scenarioResults: ScenarioResult[] = [];
    
    for (const scenario of scenarios) {
      try {
        // Set up initial network state
        await this.networkSimulator.setNetworkState(scenario.from);
        
        // Start the operation
        const operation = await this.startTestOperation(scenario.during);
        
        // Trigger network transition mid-operation
        await this.networkSimulator.transitionTo(scenario.to);
        
        // Verify operation completes successfully
        const result = await operation.waitForCompletion();
        
        // Validate data integrity
        const dataIntegrity = await this.validateDataIntegrity();
        
        scenarioResults.push({
          scenario,
          operationCompleted: result.success,
          dataIntegrityMaintained: dataIntegrity.isValid,
          passed: result.success && dataIntegrity.isValid
        });
        
      } catch (error) {
        scenarioResults.push({
          scenario,
          operationCompleted: false,
          dataIntegrityMaintained: false,
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return {
      testName: 'Network Transitions',
      passed: scenarioResults.every(r => r.passed),
      details: scenarioResults
    };
  }
  
  async testClinicalDataSafety(): Promise<TestResult> {
    const safetyTests: ClinicalSafetyTest[] = [
      { name: 'assessment_scoring_accuracy', description: 'Verify assessment scores remain accurate during offline operations' },
      { name: 'crisis_detection_reliability', description: 'Ensure crisis detection works offline' },
      { name: 'data_corruption_prevention', description: 'Verify no clinical data corruption during sync conflicts' },
      { name: 'therapeutic_continuity', description: 'Ensure therapeutic flow preservation offline' }
    ];
    
    const testResults: ClinicalSafetyTestResult[] = [];
    
    for (const test of safetyTests) {
      const result = await this.runClinicalSafetyTest(test);
      testResults.push(result);
    }
    
    return {
      testName: 'Clinical Data Safety',
      passed: testResults.every(r => r.passed && r.clinicallyAccurate),
      details: testResults,
      clinicalSafetyScore: this.calculateClinicalSafetyScore(testResults)
    };
  }
}
```

### Chaos Testing

```typescript
class OfflineChaosTestingEngine {
  private readonly chaosScenarios: ChaosScenario[] = [
    {
      name: 'Random Network Interruptions',
      description: 'Randomly interrupt network during operations',
      frequency: 'high',
      impact: 'medium'
    },
    {
      name: 'Storage Space Exhaustion',
      description: 'Simulate device storage running out',
      frequency: 'low',
      impact: 'high'
    },
    {
      name: 'Memory Pressure',
      description: 'Simulate low memory conditions',
      frequency: 'medium',
      impact: 'medium'
    },
    {
      name: 'App Termination',
      description: 'Randomly terminate app during operations',
      frequency: 'medium',
      impact: 'high'
    }
  ];
  
  async runChaosTest(duration: number): Promise<ChaosTestResult> {
    const startTime = Date.now();
    const incidents: ChaosIncident[] = [];
    const dataIntegrityChecks: DataIntegrityCheck[] = [];
    
    console.log(`Starting chaos test for ${duration}ms`);
    
    // Start chaos generators
    const chaosPromises = this.chaosScenarios.map(scenario => 
      this.runChaosScenario(scenario, duration)
    );
    
    // Start normal application operations
    const appOperations = this.simulateNormalUsage(duration);
    
    // Run periodic data integrity checks
    const integrityChecker = this.runPeriodicIntegrityChecks(duration);
    
    // Wait for all chaos to complete
    await Promise.all([...chaosPromises, appOperations, integrityChecker]);
    
    const endTime = Date.now();
    
    // Final data integrity validation
    const finalIntegrityCheck = await this.performComprehensiveIntegrityCheck();
    
    return {
      duration: endTime - startTime,
      incidents,
      dataIntegrityChecks,
      finalIntegrityCheck,
      overallSuccess: finalIntegrityCheck.isValid && incidents.every(i => i.recovered),
      resilientOperations: this.calculateResilienceScore(incidents)
    };
  }
}
```

## Recovery Mechanisms

### Data Recovery Strategies

```typescript
class DataRecoveryManager {
  private readonly recoveryStrategies = new Map<RecoveryScenario, RecoveryStrategy>();
  
  constructor() {
    this.initializeRecoveryStrategies();
  }
  
  private initializeRecoveryStrategies(): void {
    this.recoveryStrategies.set(RecoveryScenario.CORRUPTED_QUEUE, {
      name: 'Queue Corruption Recovery',
      priority: Priority.HIGH,
      steps: [
        'backup_current_queue',
        'validate_individual_operations',
        'rebuild_clean_queue',
        'restore_valid_operations'
      ],
      estimatedTime: 30000, // 30 seconds
      clinicalSafetyRequired: true
    });
    
    this.recoveryStrategies.set(RecoveryScenario.LOST_NETWORK_OPERATIONS, {
      name: 'Lost Network Operations Recovery',
      priority: Priority.MEDIUM,
      steps: [
        'scan_for_incomplete_operations',
        'reconstruct_from_local_state',
        'validate_reconstructed_data',
        'requeue_for_sync'
      ],
      estimatedTime: 60000, // 1 minute
      clinicalSafetyRequired: false
    });
    
    this.recoveryStrategies.set(RecoveryScenario.CLINICAL_DATA_INCONSISTENCY, {
      name: 'Clinical Data Inconsistency Recovery',
      priority: Priority.CRITICAL,
      steps: [
        'isolate_inconsistent_data',
        'validate_against_clinical_rules',
        'attempt_automatic_correction',
        'flag_for_manual_review_if_needed'
      ],
      estimatedTime: 120000, // 2 minutes
      clinicalSafetyRequired: true
    });
  }
  
  async performRecovery(scenario: RecoveryScenario): Promise<RecoveryResult> {
    const strategy = this.recoveryStrategies.get(scenario);
    if (!strategy) {
      throw new Error(`No recovery strategy found for scenario: ${scenario}`);
    }
    
    console.log(`Starting recovery for scenario: ${scenario}`);
    const startTime = performance.now();
    
    try {
      // Execute recovery steps
      const stepResults: RecoveryStepResult[] = [];
      
      for (const step of strategy.steps) {
        const stepResult = await this.executeRecoveryStep(step, scenario);
        stepResults.push(stepResult);
        
        if (!stepResult.success && stepResult.critical) {
          throw new RecoveryError(`Critical recovery step failed: ${step}`);
        }
      }
      
      // Validate recovery success
      const validation = await this.validateRecovery(scenario);
      
      const result: RecoveryResult = {
        scenario,
        success: validation.isValid,
        duration: performance.now() - startTime,
        stepsExecuted: stepResults.length,
        stepsSuccessful: stepResults.filter(r => r.success).length,
        clinicalSafetyMaintained: strategy.clinicalSafetyRequired ? validation.clinicalSafety : true,
        details: stepResults
      };
      
      console.log(`Recovery completed for ${scenario}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      return result;
      
    } catch (error) {
      return {
        scenario,
        success: false,
        duration: performance.now() - startTime,
        stepsExecuted: 0,
        stepsSuccessful: 0,
        clinicalSafetyMaintained: false,
        error: error instanceof Error ? error.message : 'Unknown recovery error',
        details: []
      };
    }
  }
  
  private async executeRecoveryStep(
    step: string,
    scenario: RecoveryScenario
  ): Promise<RecoveryStepResult> {
    switch (step) {
      case 'backup_current_queue':
        return this.backupCurrentQueue();
        
      case 'validate_individual_operations':
        return this.validateIndividualOperations();
        
      case 'rebuild_clean_queue':
        return this.rebuildCleanQueue();
        
      case 'isolate_inconsistent_data':
        return this.isolateInconsistentData();
        
      case 'validate_against_clinical_rules':
        return this.validateAgainstClinicalRules();
        
      default:
        throw new Error(`Unknown recovery step: ${step}`);
    }
  }
}
```

### Emergency Data Preservation

```typescript
class EmergencyDataPreservation {
  private readonly EMERGENCY_BACKUP_KEY = '@fullmind_emergency_backup';
  private readonly MAX_EMERGENCY_BACKUPS = 5;
  
  async createEmergencyBackup(reason: EmergencyReason): Promise<EmergencyBackupResult> {
    const backupId = this.generateBackupId();
    const timestamp = new Date().toISOString();
    
    console.log(`Creating emergency backup: ${backupId} (Reason: ${reason})`);
    
    try {
      // Gather all critical data
      const criticalData = await this.gatherCriticalData();
      
      // Validate data integrity before backup
      const integrity = await this.validateDataIntegrity(criticalData);
      if (!integrity.isValid) {
        console.warn('Data integrity issues detected during emergency backup:', integrity.issues);
      }
      
      // Create compressed backup
      const compressedData = await this.compressData(criticalData);
      
      // Create backup metadata
      const backup: EmergencyBackup = {
        id: backupId,
        timestamp,
        reason,
        dataIntegrity: integrity,
        dataSize: JSON.stringify(criticalData).length,
        compressedSize: compressedData.length,
        deviceInfo: await this.getDeviceInfo(),
        clinicalDataIncluded: this.containsClinicalData(criticalData)
      };
      
      // Store backup with redundancy
      await this.storeBackupWithRedundancy(backup, compressedData);
      
      // Clean up old backups
      await this.cleanupOldBackups();
      
      return {
        success: true,
        backupId,
        dataSize: backup.dataSize,
        compressedSize: backup.compressedSize,
        compressionRatio: backup.compressedSize / backup.dataSize,
        clinicalDataIncluded: backup.clinicalDataIncluded
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Emergency backup failed'
      };
    }
  }
  
  private async gatherCriticalData(): Promise<CriticalData> {
    // Gather all essential data that must be preserved
    const [
      assessments,
      crisisPlans,
      recentCheckIns,
      userProfile,
      queuedOperations
    ] = await Promise.all([
      this.dataStore.getAssessments(),
      this.dataStore.getCrisisPlan(),
      this.dataStore.getRecentCheckIns(30), // Last 30 days
      this.dataStore.getUser(),
      this.offlineQueue.getQueueContents()
    ]);
    
    return {
      assessments,
      crisisPlans: crisisPlans ? [crisisPlans] : [],
      checkIns: recentCheckIns,
      userProfile,
      queuedOperations,
      metadata: {
        backupVersion: '1.0',
        appVersion: await this.getAppVersion(),
        deviceId: await this.getDeviceId(),
        backupTimestamp: new Date().toISOString()
      }
    };
  }
  
  async restoreFromEmergencyBackup(backupId: string): Promise<RestoreResult> {
    console.log(`Attempting to restore from emergency backup: ${backupId}`);
    
    try {
      // Load backup data
      const backup = await this.loadBackup(backupId);
      if (!backup) {
        throw new Error(`Backup ${backupId} not found`);
      }
      
      // Decompress data
      const criticalData = await this.decompressData(backup.compressedData);
      
      // Validate restored data
      const validation = await this.validateRestoredData(criticalData);
      if (!validation.isValid) {
        throw new Error(`Restored data validation failed: ${validation.errors.join(', ')}`);
      }
      
      // Create current state backup before restore
      await this.createEmergencyBackup(EmergencyReason.PRE_RESTORE);
      
      // Restore data with clinical safety checks
      const restoreResults = await this.restoreDataSafely(criticalData);
      
      return {
        success: true,
        backupId,
        itemsRestored: restoreResults.itemsRestored,
        clinicalDataRestored: restoreResults.clinicalDataRestored,
        validationPassed: validation.isValid,
        restoredAt: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        success: false,
        backupId,
        error: error instanceof Error ? error.message : 'Restore failed'
      };
    }
  }
}
```

---

This comprehensive offline-first sync strategy ensures that FullMind provides an exceptional user experience regardless of network connectivity, while maintaining the highest standards of clinical data integrity and therapeutic continuity. The strategy prioritizes user empowerment, data sovereignty, and clinical safety above all else.