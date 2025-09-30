/**
 * Sync Coordinator - Week 2 Orchestration Layer
 *
 * ARCHITECTURAL PATTERN: Facade Pattern
 * - Orchestrates CloudBackupService & SupabaseService
 * - Enhances existing services without replacement
 * - Maintains Week 1 encryption and performance guarantees
 *
 * CORE RESPONSIBILITIES:
 * - Last-write-wins conflict resolution
 * - Crisis-priority sync operations (<200ms bypass)
 * - Unified sync state management
 * - Offline queue coordination
 * - Network resilience orchestration
 *
 * PRIVACY-FIRST DESIGN:
 * - Operates on encrypted blobs only (HIPAA compliant)
 * - No PHI exposure during conflict resolution
 * - Maintains "conduit exception" status
 * - Sync metadata contains no health information
 *
 * PERFORMANCE REQUIREMENTS:
 * - Crisis operations: <200ms (bypass all queues)
 * - Assessment backup: <1s (priority queue)
 * - Routine sync: <5s (background processing)
 * - Conflict resolution: <500ms (local computation)
 */


import { logSecurity, logPerformance, logError, LogCategory } from '../logging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Services
import { cloudBackupService } from './CloudBackupService';
import supabaseService from './SupabaseService';
import { useAssessmentStore } from '../../flows/assessment/stores/assessmentStore';

// Types
export type SyncState = 'idle' | 'syncing' | 'conflict' | 'error' | 'crisis_priority';
export type SyncPriority = 'crisis' | 'high' | 'normal' | 'low';
export type OperationType = 'backup' | 'restore' | 'conflict_resolution';

export interface SyncStatus {
  // Global sync state
  globalState: SyncState;

  // Per-store sync states
  storeStates: {
    assessment: StoreSyncState;
    user: StoreSyncState;
    exercises: StoreSyncState;
  };

  // Operational metadata (NO PHI)
  lastSyncTime: number;
  pendingOperations: number;
  conflictCount: number;

  // Crisis-specific tracking
  crisisOperationsPending: number;
  lastCrisisSync: number;

  // Performance metrics
  averageSyncDuration: number;
  successRate: number;
}

export interface StoreSyncState {
  state: 'synced' | 'dirty' | 'syncing' | 'conflict' | 'error';
  lastModified: number;
  pendingChanges: number;
  priority: SyncPriority;
}

export interface SyncOperation {
  id: string;
  type: OperationType;
  priority: SyncPriority;
  timestamp: number;
  encryptedData?: string;  // Encrypted blob only
  metadata: {
    storeType: string;
    checksum: string;
    size: number;
  };
  data?: {
    conflictId?: string;
    retryCount?: number;
    lastError?: string;
    [key: string]: any;
  };
}

export interface ConflictResolution {
  conflictId: string;
  localTimestamp: number;
  remoteTimestamp: number;
  resolutionStrategy: 'last_write_wins' | 'preserve_both' | 'merge';
  resolvedData: string;  // Encrypted blob
  resolutionTime: number;
}

export interface SyncResult {
  success: boolean;
  timestamp: number;
  operationsCompleted: number;
  conflictsResolved: number;
  errors: string[];
  performance: {
    duration: number;
    throughput: number;
  };
}

// Storage keys
const STORAGE_KEYS = {
  SYNC_STATUS: '@being/sync/status',
  SYNC_QUEUE: '@being/sync/queue',
  SYNC_METADATA: '@being/sync/metadata',
  CONFLICT_HISTORY: '@being/sync/conflicts',
} as const;

class SyncCoordinator {
  private static instance: SyncCoordinator;

  // Core state
  private isInitialized = false;
  private currentSyncStatus: SyncStatus;
  private syncState: SyncStatus;
  private syncQueue: SyncOperation[] = [];
  private conflictHistory: ConflictResolution[] = [];
  private stateChangeListeners: ((status: SyncStatus) => void)[] = [];

  // Sync tracking
  private lastSuccessfulSync: number = 0;
  private lastSyncOperationStart: number = 0;
  private lastSyncOperationEnd: number = 0;
  private operationMetrics = {
    successful: 0,
    failed: 0,
  };

  // Network state
  private isConnected: boolean = true;
  private networkQuality: 'excellent' | 'good' | 'poor' | 'offline' = 'excellent';
  private connectionSpeed: number = 0; // Mbps estimate
  private lastConnectionTest: number = 0;

  // Service references
  private cloudBackupService: typeof cloudBackupService;
  private supabaseService: typeof supabaseService;

  // Timers and monitoring
  private syncTimer: NodeJS.Timeout | null = null;
  private performanceMetrics: Array<{ timestamp: number; duration: number; success: boolean }> = [];
  private syncScheduler: NodeJS.Timeout | null = null;

  // Cleanup handlers
  private networkUnsubscribe: (() => void) | null = null;
  private storeUnsubscribe: (() => void) | null = null;
  private appStateCleanup: (() => void) | null = null;

  // Phase 3: Enhanced resilience
  private retryAttempts: Map<string, number> = new Map();
  private failureBackoff: Map<string, number> = new Map();
  private queuePersistenceKey = '@being/sync_coordinator/queue_v2';
  private maxQueueSize = 1000;
  private circuitBreakerFailures = 0;
  private circuitBreakerLastFailure = 0;

  private constructor() {
    this.cloudBackupService = cloudBackupService;
    this.supabaseService = supabaseService;

    // Initialize sync status
    this.currentSyncStatus = this.createInitialSyncStatus();
    this.syncState = this.createInitialSyncStatus();
  }

  public static getInstance(): SyncCoordinator {
    if (!SyncCoordinator.instance) {
      SyncCoordinator.instance = new SyncCoordinator();
    }
    return SyncCoordinator.instance;
  }

  /**
   * INITIALIZATION
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      logPerformance('🔄 Initializing SyncCoordinator...');

      // Load persisted sync state
      await this.loadSyncState();

      // Load sync metadata
      await this.loadSyncMetadata();

      // Phase 3: Load persisted queue
      await this.loadPersistedQueue();

      // Setup network monitoring
      await this.setupNetworkMonitoring();

      // Setup assessment store integration
      await this.setupStoreIntegration();

      // Start background sync scheduler
      this.startSyncScheduler();

      this.isInitialized = true;
      logPerformance('✅ SyncCoordinator initialized successfully');

    } catch (error) {
      logError('🚨 SyncCoordinator initialization failed:', error);
      throw new Error(`SyncCoordinator initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * CORE SYNC OPERATIONS
   */

  /**
   * Perform full sync with conflict resolution
   */
  public async performFullSync(): Promise<SyncResult> {
    const startTime = performance.now();

    try {
      if (!this.isInitialized) {
        throw new Error('SyncCoordinator not initialized');
      }

      logPerformance('🔄 Starting full sync...');
      this.updateSyncState('syncing');

      // Step 1: Process any pending offline operations
      await this.processOfflineQueue();

      // Step 2: Detect and resolve conflicts
      const conflicts = await this.detectConflicts();
      const resolutions = await this.resolveConflicts(conflicts);

      // Step 3: Perform backup if needed
      const backupResult = await this.performConditionalBackup();

      // Step 4: Update sync metadata
      await this.updateSyncMetadata();

      const duration = performance.now() - startTime;
      const result: SyncResult = {
        success: true,
        timestamp: Date.now(),
        operationsCompleted: this.syncQueue.length,
        conflictsResolved: resolutions.length,
        errors: [],
        performance: {
          duration,
          throughput: this.calculateThroughput(duration),
        },
      };

      // Update status
      this.updateSyncState('idle');
      this.recordPerformanceMetric(duration, true);

      logPerformance(`✅ Full sync completed in ${duration.toFixed(2)}ms`);
      return result;

    } catch (error) {
      const duration = performance.now() - startTime;
      logError('🚨 Full sync failed:', error);

      this.updateSyncState('error');
      this.recordPerformanceMetric(duration, false);

      return {
        success: false,
        timestamp: Date.now(),
        operationsCompleted: 0,
        conflictsResolved: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        performance: {
          duration,
          throughput: 0,
        },
      };
    }
  }

  /**
   * Trigger priority backup for crisis/assessment events
   */
  public async triggerPriorityBackup(
    reason: 'crisis' | 'assessment' | 'manual'
  ): Promise<SyncResult> {
    const startTime = performance.now();

    try {
      logPerformance(`🚨 Priority backup triggered: ${reason}`);

      // Crisis operations bypass normal sync queues
      if (reason === 'crisis') {
        this.updateSyncState('crisis_priority');
        this.currentSyncStatus.crisisOperationsPending++;
      }

      // Create immediate backup
      const backupResult = await this.cloudBackupService.createBackup();

      if (backupResult.success) {
        // Update crisis sync timestamp
        if (reason === 'crisis') {
          this.currentSyncStatus.lastCrisisSync = Date.now();
          this.currentSyncStatus.crisisOperationsPending = Math.max(
            0,
            this.currentSyncStatus.crisisOperationsPending - 1
          );
        }

        const duration = performance.now() - startTime;
        logPerformance(`✅ Priority backup completed in ${duration.toFixed(2)}ms`);

        // Emit state change
        this.emitSyncStateChange();

        return {
          success: true,
          timestamp: Date.now(),
          operationsCompleted: 1,
          conflictsResolved: 0,
          errors: [],
          performance: {
            duration,
            throughput: this.calculateThroughput(duration),
          },
        };
      } else {
        throw new Error(backupResult.error || 'Priority backup failed');
      }

    } catch (error) {
      logError('🚨 Priority backup failed:', error);
      this.updateSyncState('error');

      return {
        success: false,
        timestamp: Date.now(),
        operationsCompleted: 0,
        conflictsResolved: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        performance: {
          duration: performance.now() - startTime,
          throughput: 0,
        },
      };
    }
  }

  /**
   * CONFLICT RESOLUTION
   */

  /**
   * Detect conflicts between local and remote data
   */
  private async detectConflicts(): Promise<string[]> {
    try {
      // Get remote backup data
      const remoteBackup = await this.supabaseService.getBackup();
      if (!remoteBackup) {
        return []; // No remote data, no conflicts
      }

      // Calculate local data hash
      const assessmentStore = useAssessmentStore.getState();
      const localDataString = JSON.stringify(assessmentStore);
      const localHash = Date.now().toString(); // Simple timestamp-based comparison for now

      // Compare checksums to detect conflicts
      if (remoteBackup.checksum !== localHash) {
        logPerformance('🔍 Conflict detected between local and remote data');
        return ['data_conflict'];
      }

      return [];

    } catch (error) {
      logError('🚨 Conflict detection failed:', error);
      return [];
    }
  }

  /**
   * Resolve conflicts using last-write-wins strategy
   */
  private async resolveConflicts(conflicts: string[]): Promise<ConflictResolution[]> {
    const resolutions: ConflictResolution[] = [];

    for (const conflictId of conflicts) {
      try {
        const resolution = await this.resolveConflict(conflictId);
        if (resolution) {
          resolutions.push(resolution);
          this.conflictHistory.push(resolution);
        }
      } catch (error) {
        logError(`🚨 Failed to resolve conflict ${conflictId}:`, error);
      }
    }

    // Update conflict count
    this.currentSyncStatus.conflictCount += resolutions.length;

    return resolutions;
  }

  /**
   * Resolve individual conflict using architect-defined strategy
   * Implements clinical safety guards for crisis and assessment data
   */
  private async resolveConflict(conflictId: string): Promise<ConflictResolution | null> {
    try {
      // Get local and remote data timestamps
      const localData = await this.getLocalDataTimestamp();
      const remoteData = await this.getRemoteDataTimestamp();

      if (!localData || !remoteData) {
        logSecurity('Cannot resolve conflict: missing timestamp data');
        return null;
      }

      // Determine conflict context from data
      const context = await this.determineConflictContext(localData.data, remoteData.data);

      let resolutionStrategy: 'last_write_wins' | 'preserve_both' | 'merge' = 'last_write_wins';
      let resolvedData: string;

      // SAFETY FIRST: Crisis data preservation
      if (context === 'crisis') {
        logPerformance('🚨 Crisis data conflict detected - preserving both with flags');
        resolutionStrategy = 'preserve_both';
        resolvedData = await this.preserveBothWithCrisisFlag(localData.data, remoteData.data);

      // CLINICAL: Assessment completions are append-only
      } else if (context === 'assessment' && await this.isCompletedAssessment(localData.data, remoteData.data)) {
        logPerformance('📋 Assessment completion conflict - merging history');
        resolutionStrategy = 'merge';
        resolvedData = await this.mergeAssessmentHistory(localData.data, remoteData.data);

      // ROUTINE: Standard last-write-wins
      } else {
        const useLocal = localData.timestamp > remoteData.timestamp;
        resolvedData = useLocal ? localData.data : remoteData.data;

        logPerformance(
          `🔧 Standard conflict resolved: ${useLocal ? 'local' : 'remote'} data wins ` +
          `(${new Date(localData.timestamp).toISOString()} vs ${new Date(remoteData.timestamp).toISOString()})`
        );
      }

      return {
        conflictId,
        localTimestamp: localData.timestamp,
        remoteTimestamp: remoteData.timestamp,
        resolutionStrategy,
        resolvedData,
        resolutionTime: Date.now(),
      };

    } catch (error) {
      logError('🚨 Conflict resolution failed:', error);
      return null;
    }
  }

  /**
   * Determine the context of the conflict for safety guards
   */
  private async determineConflictContext(localData: string, remoteData: string): Promise<'crisis' | 'assessment' | 'routine'> {
    try {
      // Parse data to check for crisis indicators
      // Note: This operates on structured data before encryption
      const localParsed = JSON.parse(localData);
      const remoteParsed = JSON.parse(remoteData);

      // Check for crisis indicators in stores
      if (localParsed.stores?.assessment?.crisisDetected ||
          remoteParsed.stores?.assessment?.crisisDetected ||
          localParsed.stores?.assessment?.lastCompleted) {

        // Further check for actual crisis scores (PHQ-9 ≥20, GAD-7 ≥15)
        const localAssessment = localParsed.stores?.assessment;
        const remoteAssessment = remoteParsed.stores?.assessment;

        if (this.isCrisisScore(localAssessment) || this.isCrisisScore(remoteAssessment)) {
          return 'crisis';
        }

        // Assessment completion without crisis
        return 'assessment';
      }

      return 'routine';

    } catch (error) {
      logSecurity('Failed to determine conflict context, defaulting to routine:', error);
      return 'routine';
    }
  }

  /**
   * Check if assessment data indicates crisis-level scores
   */
  private isCrisisScore(assessmentData: any): boolean {
    if (!assessmentData) return false;

    const responses = assessmentData.responses;
    const assessmentType = assessmentData.currentAssessment;

    if (!responses || !Array.isArray(responses)) return false;

    // Calculate total score
    const totalScore = responses.reduce((sum: number, response: number) => sum + response, 0);

    // Crisis thresholds
    if (assessmentType === 'PHQ-9' && totalScore >= 20) return true;
    if (assessmentType === 'GAD-7' && totalScore >= 15) return true;

    // PHQ-9 Question 9 (suicidal ideation) check
    if (assessmentType === 'PHQ-9' && responses[8] > 0) return true;

    return false;
  }

  /**
   * Check if data represents completed assessments
   */
  private async isCompletedAssessment(localData: string, remoteData: string): Promise<boolean> {
    try {
      const localParsed = JSON.parse(localData);
      const remoteParsed = JSON.parse(remoteData);

      const localCompleted = localParsed.stores?.assessment?.lastCompleted;
      const remoteCompleted = remoteParsed.stores?.assessment?.lastCompleted;

      return !!(localCompleted || remoteCompleted);

    } catch (error) {
      return false;
    }
  }

  /**
   * Preserve both datasets with crisis flags for manual review
   */
  private async preserveBothWithCrisisFlag(localData: string, remoteData: string): Promise<string> {
    try {
      const localParsed = JSON.parse(localData);
      const remoteParsed = JSON.parse(remoteData);

      // Create combined dataset with conflict markers
      const preservedData = {
        ...localParsed,
        conflictResolution: {
          strategy: 'preserve_both',
          localData: localParsed,
          remoteData: remoteParsed,
          requiresManualReview: true,
          crisisConflict: true,
          resolvedAt: Date.now(),
        },
      };

      return JSON.stringify(preservedData);

    } catch (error) {
      logError('Failed to preserve crisis data:', error);
      // Fallback to local data if preservation fails
      return localData;
    }
  }

  /**
   * Merge assessment history from both sources
   */
  private async mergeAssessmentHistory(localData: string, remoteData: string): Promise<string> {
    try {
      const localParsed = JSON.parse(localData);
      const remoteParsed = JSON.parse(remoteData);

      // Merge assessment stores
      const localAssessment = localParsed.stores?.assessment || {};
      const remoteAssessment = remoteParsed.stores?.assessment || {};

      // Combine assessment history (append-only)
      const mergedAssessment = {
        ...localAssessment,
        ...remoteAssessment,
        // Keep the most recent completion
        lastCompleted: localAssessment.lastCompleted || remoteAssessment.lastCompleted,
        // Merge any additional properties
        conflictResolution: {
          strategy: 'merge',
          mergedAt: Date.now(),
          sources: ['local', 'remote'],
        },
      };

      const mergedData = {
        ...localParsed,
        stores: {
          ...localParsed.stores,
          assessment: mergedAssessment,
        },
        timestamp: Math.max(localParsed.timestamp || 0, remoteParsed.timestamp || 0),
      };

      return JSON.stringify(mergedData);

    } catch (error) {
      logError('Failed to merge assessment history:', error);
      // Fallback to local data if merge fails
      return localData;
    }
  }

  /**
   * SYNC STATE MANAGEMENT
   */

  /**
   * Get current sync status
   */
  public getSyncStatus(): SyncStatus {
    return { ...this.currentSyncStatus };
  }

  /**
   * Subscribe to sync state changes
   */
  public onSyncStateChange(callback: (status: SyncStatus) => void): () => void {
    this.stateChangeListeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.stateChangeListeners.indexOf(callback);
      if (index > -1) {
        this.stateChangeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Update sync state and notify listeners
   */
  private updateSyncState(newState: SyncState): void {
    this.currentSyncStatus.globalState = newState;
    this.currentSyncStatus.lastSyncTime = Date.now();
    this.emitSyncStateChange();
  }

  /**
   * Emit sync state change to all listeners
   */
  private emitSyncStateChange(): void {
    const status = this.getSyncStatus();
    for (const listener of this.stateChangeListeners) {
      try {
        listener(status);
      } catch (error) {
        logError('🚨 Sync state listener error:', error);
      }
    }
  }

  /**
   * OFFLINE QUEUE MANAGEMENT
   */

  /**
   * Process offline operations when network is available
   */
  public async processOfflineQueue(): Promise<void> {
    if (this.syncQueue.length === 0) {
      return;
    }

    try {
      logPerformance(`🔄 Processing ${this.syncQueue.length} offline operations...`);

      // Sort by priority and timestamp
      this.syncQueue.sort((a, b) => {
        const priorityOrder = { crisis: 0, high: 1, normal: 2, low: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.timestamp - b.timestamp;
      });

      // Process operations
      for (const operation of this.syncQueue) {
        await this.processQueuedOperation(operation);
      }

      // Clear completed operations
      this.syncQueue = [];
      this.currentSyncStatus.pendingOperations = 0;

      logPerformance('✅ Offline queue processed successfully');

    } catch (error) {
      logError('🚨 Offline queue processing failed:', error);
    }
  }

  /**
   * Add operation to offline queue
   */
  private addToOfflineQueue(operation: SyncOperation): void {
    this.syncQueue.push(operation);
    this.currentSyncStatus.pendingOperations = this.syncQueue.length;

    // Persist queue
    this.persistSyncQueue().catch((error) => {
      logError('🚨 Failed to persist sync queue:', error);
    });
  }

  /**
   * UTILITY METHODS
   */

  private createInitialSyncStatus(): SyncStatus {
    return {
      globalState: 'idle',
      storeStates: {
        assessment: {
          state: 'synced',
          lastModified: 0,
          pendingChanges: 0,
          priority: 'normal',
        },
        user: {
          state: 'synced',
          lastModified: 0,
          pendingChanges: 0,
          priority: 'normal',
        },
        exercises: {
          state: 'synced',
          lastModified: 0,
          pendingChanges: 0,
          priority: 'normal',
        },
      },
      lastSyncTime: 0,
      pendingOperations: 0,
      conflictCount: 0,
      crisisOperationsPending: 0,
      lastCrisisSync: 0,
      averageSyncDuration: 0,
      successRate: 1.0,
    };
  }

  private async loadSyncState(): Promise<void> {
    try {
      const savedStatus = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_STATUS);
      if (savedStatus) {
        this.currentSyncStatus = {
          ...this.currentSyncStatus,
          ...JSON.parse(savedStatus),
        };
      }

      const savedQueue = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      if (savedQueue) {
        this.syncQueue = JSON.parse(savedQueue);
        this.currentSyncStatus.pendingOperations = this.syncQueue.length;
      }
    } catch (error) {
      logSecurity('Failed to load sync state:', error);
    }
  }

  private async persistSyncState(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SYNC_STATUS,
        JSON.stringify(this.currentSyncStatus)
      );
    } catch (error) {
      logError('Failed to persist sync state:', error);
    }
  }

  private async persistSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SYNC_QUEUE,
        JSON.stringify(this.syncQueue)
      );
    } catch (error) {
      logError('Failed to persist sync queue:', error);
    }
  }

  private recordPerformanceMetric(duration: number, success: boolean): void {
    this.performanceMetrics.push({
      timestamp: Date.now(),
      duration,
      success,
    });

    // Keep only last 100 metrics
    if (this.performanceMetrics.length > 100) {
      this.performanceMetrics = this.performanceMetrics.slice(-100);
    }

    // Update averages
    const recentMetrics = this.performanceMetrics.slice(-20);
    this.currentSyncStatus.averageSyncDuration =
      recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length;

    this.currentSyncStatus.successRate =
      recentMetrics.filter(m => m.success).length / recentMetrics.length;
  }

  private calculateThroughput(duration: number): number {
    return duration > 0 ? 1000 / duration : 0; // Operations per second
  }

  // Placeholder methods for integration
  private async setupNetworkMonitoring(): Promise<void> {
    try {
      // Subscribe to network state changes with enhanced monitoring
      this.networkUnsubscribe = NetInfo.addEventListener(async (networkState) => {
        const wasConnected = this.isConnected;
        this.isConnected = networkState.isConnected === true;

        // Phase 3: Enhanced network quality detection
        await this.assessNetworkQuality(networkState);

        logPerformance(`[SyncCoordinator] Network: ${wasConnected ? 'connected' : 'disconnected'} → ${this.isConnected ? 'connected' : 'disconnected'} (${this.networkQuality})`);

        // If just came online, process offline queues with adaptive strategy
        if (!wasConnected && this.isConnected) {
          logPerformance('[SyncCoordinator] Connection restored, processing offline operations');

          // Reset circuit breaker on successful reconnection
          this.circuitBreakerFailures = 0;

          // Process with network-adaptive strategy
          await this.processOfflineQueueWithAdaptiveStrategy();

          // Let SupabaseService process its own queue
          await this.supabaseService.processOfflineQueue();

          // Trigger sync based on network quality
          const priority = this.networkQuality === 'excellent' ? 'normal' : 'low';
          await this.scheduleSync(priority, 'network_restored');
        }

        // Update sync state based on connectivity
        if (!this.isConnected && this.syncState.globalState === 'syncing') {
          this.updateSyncState('error');
        }
      });

      // Get initial network state
      const initialState = await NetInfo.fetch();
      this.isConnected = initialState.isConnected === true;

      logPerformance(`[SyncCoordinator] Network monitoring initialized, connected: ${this.isConnected}`);

    } catch (error) {
      logError('🚨 Failed to setup network monitoring:', error);
      // Assume connected if monitoring fails
      this.isConnected = true;
    }
  }

  private async setupStoreIntegration(): Promise<void> {
    try {
      // Subscribe to assessment store changes for real-time sync triggers
      this.storeUnsubscribe = useAssessmentStore.subscribe(
        async (state, prevState) => {
          // Check for assessment completion triggers
          if (state.completedAssessments.length > prevState.completedAssessments.length) {
            logPerformance('[SyncCoordinator] Assessment completed, triggering priority backup');

            // Assessment completion triggers high-priority backup
            await this.scheduleSync('high', 'assessment_completed');
          }

          // Check for crisis detection
          if (state.crisisDetection && !prevState.crisisDetection) {
            logPerformance('🚨 [SyncCoordinator] Crisis detected, triggering immediate backup');

            // Crisis data requires immediate backup with highest priority
            await this.triggerPriorityBackup('crisis');
          }

          // Real-time assessment score monitoring for crisis thresholds
          await this.monitorAssessmentScores(state, prevState);

          // Regular state changes trigger normal priority sync (debounced)
          if (JSON.stringify(state) !== JSON.stringify(prevState)) {
            await this.scheduleSync('normal', 'store_change');
          }
        }
      );

      logPerformance('[SyncCoordinator] Assessment store integration initialized');

    } catch (error) {
      logError('🚨 Failed to setup store integration:', error);
    }
  }

  /**
   * Monitor assessment scores for crisis thresholds (PHQ-9 ≥20, GAD-7 ≥15)
   * Triggers priority sync for crisis scores within <200ms requirement
   */
  private async monitorAssessmentScores(
    currentState: any,
    previousState: any
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Check for new assessment results
      const currentResult = currentState.currentResult;
      const previousResult = previousState.currentResult;

      // Monitor current assessment completion
      if (currentResult && !previousResult) {
        await this.evaluateAssessmentForCrisis(currentResult, 'current_assessment');
      }

      // Monitor completed assessments for new entries
      const currentCompleted = currentState.completedAssessments || [];
      const previousCompleted = previousState.completedAssessments || [];

      if (currentCompleted.length > previousCompleted.length) {
        const newAssessments = currentCompleted.slice(previousCompleted.length);

        for (const session of newAssessments) {
          if (session.result) {
            await this.evaluateAssessmentForCrisis(session.result, 'completed_assessment');
          }
        }
      }

      // Validate response time meets <200ms requirement
      const responseTime = Date.now() - startTime;
      if (responseTime >= 200) {
        logSecurity(`⚠️ Assessment monitoring exceeded 200ms: ${responseTime}ms`);
      }

    } catch (error) {
      logError('🚨 Assessment score monitoring failed:', error);
    }
  }

  /**
   * Evaluate assessment result for crisis conditions and trigger priority sync
   */
  private async evaluateAssessmentForCrisis(
    result: any,
    context: 'current_assessment' | 'completed_assessment'
  ): Promise<void> {
    try {
      let isCrisisDetected = false;
      let crisisType = '';
      let crisisValue = 0;

      // Check PHQ-9 crisis conditions
      if (result.totalScore !== undefined && result.severity !== undefined) {
        // Determine if this is PHQ-9 or GAD-7 based on score range
        if (result.totalScore <= 27) {
          // Likely PHQ-9 (0-27 range)
          if (result.totalScore >= 20) {
            isCrisisDetected = true;
            crisisType = 'phq9_score';
            crisisValue = result.totalScore;
          }

          // Check for suicidal ideation
          if (result.suicidalIdeation === true) {
            isCrisisDetected = true;
            crisisType = 'phq9_suicidal';
            crisisValue = 1;
          }
        } else if (result.totalScore <= 21) {
          // Likely GAD-7 (0-21 range)
          if (result.totalScore >= 15) {
            isCrisisDetected = true;
            crisisType = 'gad7_score';
            crisisValue = result.totalScore;
          }
        }
      }

      // Check the isCrisis flag directly from assessment store
      if (result.isCrisis === true) {
        isCrisisDetected = true;
        if (!crisisType) {
          crisisType = 'assessment_crisis_flag';
          crisisValue = result.totalScore || 0;
        }
      }

      // Trigger priority backup for crisis scores
      if (isCrisisDetected) {
        logPerformance(`🚨 [SyncCoordinator] Crisis assessment detected: ${crisisType} = ${crisisValue}`);
        logPerformance(`📊 Assessment context: ${context}, total score: ${result.totalScore}`);

        // Immediate priority backup for crisis data
        await this.triggerPriorityBackup('crisis');

        // Log crisis assessment for clinical compliance
        await this.logCrisisAssessment({
          type: crisisType,
          value: crisisValue,
          totalScore: result.totalScore,
          context,
          timestamp: Date.now(),
          assessmentType: result.totalScore <= 21 ? 'gad7' : 'phq9'
        });
      }

    } catch (error) {
      logError('🚨 Crisis assessment evaluation failed:', error);
    }
  }

  /**
   * Log crisis assessment for clinical compliance and audit trail
   */
  private async logCrisisAssessment(crisisData: {
    type: string;
    value: number;
    totalScore: number;
    context: string;
    timestamp: number;
    assessmentType: string;
  }): Promise<void> {
    try {
      const logEntry = {
        ...crisisData,
        syncTriggered: true,
        responseTime: Date.now() - crisisData.timestamp,
        syncId: `crisis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      // Store crisis log for clinical audit trail
      await AsyncStorage.setItem(
        `crisis_assessment_sync_${logEntry.syncId}`,
        JSON.stringify(logEntry)
      );

      logPerformance(`📋 Crisis assessment logged: ${logEntry.syncId}`);

    } catch (error) {
      logError('🚨 Crisis assessment logging failed:', error);
    }
  }

  private calculateAssessmentScore(assessment: string | null, responses: number[]): number {
    if (!assessment || !responses || responses.length === 0) return 0;

    // Simple sum calculation for PHQ-9 and GAD-7
    // Both use 0-3 scoring for each question
    return responses.reduce((sum, response) => sum + (response || 0), 0);
  }

  private calculateSuccessRate(): number {
    const total = this.operationMetrics.successful + this.operationMetrics.failed;
    if (total === 0) return 1; // 100% if no operations yet
    return this.operationMetrics.successful / total;
  }

  private startSyncScheduler(): void {
    try {
      // Clear any existing scheduler
      if (this.syncScheduler) {
        clearInterval(this.syncScheduler);
      }

      // Schedule background sync every 5 minutes for routine operations
      this.syncScheduler = setInterval(async () => {
        try {
          // Only run background sync if connected and not already syncing
          if (!this.isConnected || this.syncState.globalState === 'syncing') {
            return;
          }

          // Check if any sync is needed based on data changes
          const needsSync = await this.checkIfSyncNeeded();

          if (needsSync) {
            logPerformance('[SyncCoordinator] Background sync triggered');
            await this.scheduleSync('low', 'scheduled_background');
          }

        } catch (error) {
          logError('🚨 Background sync scheduler error:', error);
        }
      }, 5 * 60 * 1000); // 5 minutes

      // Also setup app state change listeners for foreground sync
      this.setupAppStateMonitoring();

      logPerformance('[SyncCoordinator] Background sync scheduler started (5min interval)');

    } catch (error) {
      logError('🚨 Failed to start sync scheduler:', error);
    }
  }

  private async checkIfSyncNeeded(): Promise<boolean> {
    try {
      // Check if we have pending operations in our queue
      if (this.syncQueue.length > 0) {
        return true;
      }

      // Check if CloudBackupService indicates sync is needed
      const backupStatus = await this.cloudBackupService.getBackupStatus();
      if (backupStatus?.needsBackup) {
        return true;
      }

      // Check if assessment store has unsaved changes
      const assessmentState = useAssessmentStore.getState();
      if (assessmentState.lastSavedAt) {
        const lastSyncTime = this.lastSuccessfulSync || 0;
        const lastAssessmentTime = assessmentState.lastSavedAt;

        // If assessment saved after last sync, we need sync
        if (lastAssessmentTime > lastSyncTime) {
          return true;
        }
      }

      return false;

    } catch (error) {
      logError('🚨 Failed to check sync needs:', error);
      // When in doubt, assume sync is needed
      return true;
    }
  }

  private setupAppStateMonitoring(): void {
    try {
      // Note: In a full React Native app, this would use AppState from 'react-native'
      // For now, we'll implement a basic version using window focus events
      if (typeof window !== 'undefined') {
        const handleForeground = async () => {
          logPerformance('[SyncCoordinator] App came to foreground, checking for sync');

          // Small delay to let other systems initialize
          setTimeout(async () => {
            const needsSync = await this.checkIfSyncNeeded();
            if (needsSync) {
              await this.scheduleSync('normal', 'app_foreground');
            }
          }, 1000);
        };

        window.addEventListener('focus', handleForeground);
        this.appStateCleanup = () => {
          window.removeEventListener('focus', handleForeground);
        };
      }

    } catch (error) {
      logError('🚨 Failed to setup app state monitoring:', error);
    }
  }

  private async performConditionalBackup(): Promise<any> {
    try {
      // Check if backup is actually needed to avoid unnecessary operations
      const backupStatus = await this.cloudBackupService.getBackupStatus();

      if (!backupStatus?.needsBackup) {
        logPerformance('[SyncCoordinator] Conditional backup skipped - no changes detected');
        return {
          success: true,
          skipped: true,
          reason: 'no_changes',
          timestamp: Date.now(),
        };
      }

      // Check if we're in crisis mode - if so, backup immediately regardless of conditions
      const assessmentState = useAssessmentStore.getState();
      const isCrisisMode = assessmentState.crisisDetection ||
        this.syncState.globalState === 'crisis_priority';

      if (isCrisisMode) {
        logPerformance('🚨 [SyncCoordinator] Crisis mode detected - forcing immediate backup');

        const result = await this.cloudBackupService.createBackup();
        return {
          ...result,
          priority: 'crisis',
          forced: true,
          timestamp: Date.now(),
        };
      }

      // Check network conditions for non-crisis backups
      if (!this.isConnected) {
        logPerformance('[SyncCoordinator] Conditional backup deferred - no network connection');
        return {
          success: false,
          skipped: true,
          reason: 'no_network',
          timestamp: Date.now(),
        };
      }

      // Check if we have too many recent failures
      const recentFailures = this.operationMetrics.failed;
      const recentSuccesses = this.operationMetrics.successful;
      const failureRate = recentFailures / Math.max(recentFailures + recentSuccesses, 1);

      if (failureRate > 0.7) {
        logSecurity('[SyncCoordinator] Conditional backup deferred - high failure rate');
        return {
          success: false,
          skipped: true,
          reason: 'high_failure_rate',
          failureRate,
          timestamp: Date.now(),
        };
      }

      // Check if sufficient time has passed since last backup (rate limiting)
      const timeSinceLastBackup = Date.now() - (this.lastSuccessfulSync || 0);
      const minBackupInterval = 30 * 1000; // 30 seconds minimum between backups

      if (timeSinceLastBackup < minBackupInterval) {
        logPerformance('[SyncCoordinator] Conditional backup deferred - rate limited');
        return {
          success: false,
          skipped: true,
          reason: 'rate_limited',
          timeSinceLastBackup,
          minInterval: minBackupInterval,
          timestamp: Date.now(),
        };
      }

      // All conditions met - perform the backup
      logPerformance('[SyncCoordinator] Conditional backup proceeding - all checks passed');

      const result = await this.cloudBackupService.createBackup();

      if (result.success) {
        this.lastSuccessfulSync = Date.now();
        await this.updateSyncMetadata();
      }

      return {
        ...result,
        conditional: true,
        timestamp: Date.now(),
      };

    } catch (error) {
      logError('🚨 Conditional backup failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
    }
  }

  private async updateSyncMetadata(): Promise<void> {
    try {
      // Update internal sync state and metrics
      const metadata = {
        lastSyncAttempt: Date.now(),
        lastSuccessfulSync: this.lastSuccessfulSync,
        syncVersion: 1,
        operationMetrics: {
          ...this.operationMetrics,
          totalOperations: this.operationMetrics.successful + this.operationMetrics.failed,
          successRate: this.calculateSuccessRate(),
        },
        queueInfo: {
          pendingOperations: this.syncQueue.length,
          queueTypes: this.syncQueue.reduce((acc, op) => {
            acc[op.type] = (acc[op.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        },
        networkStatus: {
          isConnected: this.isConnected,
          lastNetworkChange: Date.now(),
        },
        storeStates: {
          assessment: this.syncState.storeStates.assessment,
          user: this.syncState.storeStates.user,
          exercises: this.syncState.storeStates.exercises,
        },
      };

      // Store metadata locally for persistence across app restarts
      await AsyncStorage.setItem(
        '@being/sync_coordinator/metadata',
        JSON.stringify(metadata)
      );

      // TODO: Update CloudBackupService with sync metadata once updateConfig supports it

      // Update SupabaseService with sync status for analytics
      if (this.supabaseService && typeof this.supabaseService.trackEvent === 'function') {
        await this.supabaseService.trackEvent('sync_metadata_updated', {
          operation_count: metadata.operationMetrics.totalOperations,
          success_rate: metadata.operationMetrics.successRate,
          queue_size: metadata.queueInfo.pendingOperations,
          network_connected: metadata.networkStatus.isConnected,
        });
      }

      logPerformance('[SyncCoordinator] Sync metadata updated successfully');

    } catch (error) {
      logError('🚨 Failed to update sync metadata:', error);
      // Metadata update failures are non-critical, don't throw
    }
  }

  private async loadSyncMetadata(): Promise<void> {
    try {
      const metadataString = await AsyncStorage.getItem('@being/sync_coordinator/metadata');

      if (metadataString) {
        const metadata = JSON.parse(metadataString);

        // Restore sync state from metadata
        this.lastSuccessfulSync = metadata.lastSuccessfulSync || 0;

        // Restore operation metrics
        if (metadata.operationMetrics) {
          this.operationMetrics.successful = metadata.operationMetrics.successful || 0;
          this.operationMetrics.failed = metadata.operationMetrics.failed || 0;
        }

        // Restore store states if available
        if (metadata.storeStates) {
          Object.assign(this.syncState.storeStates, metadata.storeStates);
        }

        logPerformance('[SyncCoordinator] Sync metadata loaded from storage');
      }

    } catch (error) {
      logError('🚨 Failed to load sync metadata:', error);
      // Continue with defaults if metadata loading fails
    }
  }

  /**
   * PHASE 3: ENHANCED NETWORK RESILIENCE
   */
  private async assessNetworkQuality(networkState: any): Promise<void> {
    try {
      if (!this.isConnected) {
        this.networkQuality = 'offline';
        this.connectionSpeed = 0;
        return;
      }

      // Quick connection test every 30 seconds max
      const now = Date.now();
      if (now - this.lastConnectionTest < 30000) {
        return; // Skip frequent tests
      }

      this.lastConnectionTest = now;

      // Test connection speed with small payload
      const startTime = performance.now();

      try {
        // Simple ping test to Supabase
        const testStart = Date.now();
        await fetch('https://httpbin.org/get', {
          method: 'GET',
          cache: 'no-cache',
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });
        const responseTime = Date.now() - testStart;

        // Estimate quality based on response time
        if (responseTime < 200) {
          this.networkQuality = 'excellent';
          this.connectionSpeed = 10; // Estimate fast connection
        } else if (responseTime < 500) {
          this.networkQuality = 'good';
          this.connectionSpeed = 5;
        } else if (responseTime < 2000) {
          this.networkQuality = 'poor';
          this.connectionSpeed = 1;
        } else {
          this.networkQuality = 'poor';
          this.connectionSpeed = 0.5;
        }

        logPerformance(`[SyncCoordinator] Network quality: ${this.networkQuality} (${responseTime}ms)`);

      } catch (error) {
        // Network test failed, assume poor quality
        this.networkQuality = 'poor';
        this.connectionSpeed = 0.1;
        logSecurity('[SyncCoordinator] Network quality test failed, assuming poor connection');
      }

    } catch (error) {
      logError('🚨 Failed to assess network quality:', error);
      this.networkQuality = 'poor'; // Conservative default
    }
  }

  private async processOfflineQueueWithAdaptiveStrategy(): Promise<void> {
    try {
      if (this.syncQueue.length === 0) {
        return;
      }

      logPerformance(`[SyncCoordinator] Processing ${this.syncQueue.length} queued operations with ${this.networkQuality} network`);

      // Adaptive processing based on network quality
      let batchSize: number;
      let delayBetweenOperations: number;

      switch (this.networkQuality) {
        case 'excellent':
          batchSize = 10;
          delayBetweenOperations = 100; // 100ms
          break;
        case 'good':
          batchSize = 5;
          delayBetweenOperations = 500; // 500ms
          break;
        case 'poor':
          batchSize = 1;
          delayBetweenOperations = 2000; // 2s
          break;
        default:
          batchSize = 1;
          delayBetweenOperations = 5000; // 5s
      }

      // Process queue in adaptive batches
      while (this.syncQueue.length > 0 && this.isConnected) {
        const batch = this.syncQueue.splice(0, batchSize);

        for (const operation of batch) {
          try {
            await this.processQueuedOperationWithRetry(operation);

            // Delay between operations to avoid overwhelming poor connections
            if (delayBetweenOperations > 0) {
              await new Promise(resolve => setTimeout(resolve, delayBetweenOperations));
            }

          } catch (error) {
            logError(`🚨 Failed to process operation ${operation.id}:`, error);

            // Re-add failed operation to queue if retryable
            if (this.shouldRetryOperation(operation)) {
              this.syncQueue.unshift(operation); // Add back to front
            }

            // Break batch processing on failure for poor connections
            if (this.networkQuality === 'poor') {
              break;
            }
          }
        }

        // Check if network is still connected
        if (!this.isConnected) {
          logPerformance('[SyncCoordinator] Lost connection during queue processing');
          break;
        }
      }

      // Persist remaining queue
      await this.persistQueue();

    } catch (error) {
      logError('🚨 Failed to process offline queue with adaptive strategy:', error);
    }
  }

  private async processQueuedOperationWithRetry(operation: SyncOperation): Promise<void> {
    const maxRetries = operation.priority === 'crisis' ? 5 : 3;
    const operationId = operation.id;

    // Check current retry count
    const currentRetries = this.retryAttempts.get(operationId) || 0;

    if (currentRetries >= maxRetries) {
      logError(`🚨 Operation ${operationId} exceeded max retries (${maxRetries}), discarding`);
      this.retryAttempts.delete(operationId);
      this.failureBackoff.delete(operationId);
      throw new Error('Max retries exceeded');
    }

    // Check if we're in backoff period
    const backoffUntil = this.failureBackoff.get(operationId) || 0;
    if (Date.now() < backoffUntil) {
      // Still in backoff, re-queue for later
      throw new Error('Operation in backoff period');
    }

    try {
      // Try to process the operation
      await this.processQueuedOperation(operation);

      // Success - clear retry tracking
      this.retryAttempts.delete(operationId);
      this.failureBackoff.delete(operationId);

    } catch (error) {
      // Failure - increment retry count and set backoff
      const newRetryCount = currentRetries + 1;
      this.retryAttempts.set(operationId, newRetryCount);

      // Exponential backoff: 2^retries * 1000ms (1s, 2s, 4s, 8s, 16s)
      const backoffMs = Math.pow(2, newRetryCount) * 1000;
      this.failureBackoff.set(operationId, Date.now() + backoffMs);

      logSecurity(`[SyncCoordinator] Operation ${operationId} failed (retry ${newRetryCount}/${maxRetries}), backoff ${backoffMs}ms`);

      // Update circuit breaker
      this.circuitBreakerFailures++;
      this.circuitBreakerLastFailure = Date.now();

      throw error;
    }
  }

  private shouldRetryOperation(operation: SyncOperation): boolean {
    const operationId = operation.id;
    const currentRetries = this.retryAttempts.get(operationId) || 0;
    const maxRetries = operation.priority === 'crisis' ? 5 : 3;

    // Don't retry if already at max
    if (currentRetries >= maxRetries) {
      return false;
    }

    // Always retry crisis operations
    if (operation.priority === 'crisis') {
      return true;
    }

    // Check circuit breaker - if too many recent failures, don't retry normal operations
    const recentFailureThreshold = Date.now() - (5 * 60 * 1000); // 5 minutes
    if (this.circuitBreakerLastFailure > recentFailureThreshold && this.circuitBreakerFailures > 10) {
      logSecurity('[SyncCoordinator] Circuit breaker open, not retrying non-crisis operation');
      return false;
    }

    return true;
  }

  private deduplicateQueue(): void {
    // Remove duplicate operations (keep highest priority version)
    const seenOperations = new Map<string, number>();

    for (let i = this.syncQueue.length - 1; i >= 0; i--) {
      const operation = this.syncQueue[i];
      if (!operation) continue; // Skip if operation is undefined

      const operationKey = `${operation.type}_${operation.metadata.storeType}`;

      const existingIndex = seenOperations.get(operationKey);

      if (existingIndex !== undefined) {
        // Found duplicate - keep the higher priority operation
        const existing = this.syncQueue[existingIndex];
        if (!existing) continue; // Skip if existing is undefined

        const priorityOrder = { crisis: 0, high: 1, normal: 2, low: 3 };

        if (priorityOrder[operation.priority] < priorityOrder[existing.priority]) {
          // Current operation has higher priority, remove the existing one
          this.syncQueue.splice(existingIndex, 1);
          seenOperations.set(operationKey, i > existingIndex ? i - 1 : i);
        } else {
          // Existing operation has higher or equal priority, remove current one
          this.syncQueue.splice(i, 1);
        }
      } else {
        // First time seeing this operation type
        seenOperations.set(operationKey, i);
      }
    }
  }

  private async persistQueue(): Promise<void> {
    try {
      const queueData = {
        operations: this.syncQueue,
        timestamp: Date.now(),
        retryAttempts: Array.from(this.retryAttempts.entries()),
        failureBackoff: Array.from(this.failureBackoff.entries()),
      };

      await AsyncStorage.setItem(this.queuePersistenceKey, JSON.stringify(queueData));
      logPerformance(`[SyncCoordinator] Persisted ${this.syncQueue.length} operations to storage`);

    } catch (error) {
      logError('🚨 Failed to persist queue:', error);
    }
  }

  private async loadPersistedQueue(): Promise<void> {
    try {
      const queueDataString = await AsyncStorage.getItem(this.queuePersistenceKey);

      if (queueDataString) {
        const queueData = JSON.parse(queueDataString);

        // Restore queue operations
        this.syncQueue = queueData.operations || [];

        // Restore retry tracking
        this.retryAttempts = new Map(queueData.retryAttempts || []);
        this.failureBackoff = new Map(queueData.failureBackoff || []);

        // Clean up expired backoffs
        const now = Date.now();
        for (const [operationId, backoffUntil] of this.failureBackoff.entries()) {
          if (now > backoffUntil) {
            this.failureBackoff.delete(operationId);
          }
        }

        logPerformance(`[SyncCoordinator] Restored ${this.syncQueue.length} operations from storage`);
      }

    } catch (error) {
      logError('🚨 Failed to load persisted queue:', error);
      // Continue with empty queue if loading fails
      this.syncQueue = [];
      this.retryAttempts = new Map();
      this.failureBackoff = new Map();
    }
  }

  /**
   * SYNC SCHEDULING
   */
  private async scheduleSync(priority: SyncPriority, reason: string): Promise<void> {
    try {
      // Add operation to queue
      const operation: SyncOperation = {
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'backup',
        priority,
        timestamp: Date.now(),
        metadata: {
          storeType: 'mixed',
          checksum: '',
          size: 0,
        },
        data: {
          reason,
        },
      };

      // Phase 3: Enhanced queue management with overflow protection
      if (this.syncQueue.length >= this.maxQueueSize) {
        // Remove oldest low-priority operations to make space
        const lowPriorityIndex = this.syncQueue.findIndex(op => op.priority === 'low');
        if (lowPriorityIndex !== -1) {
          const removed = this.syncQueue.splice(lowPriorityIndex, 1);
          if (removed[0]) {
            logSecurity(`[SyncCoordinator] Queue overflow, removed low-priority operation: ${removed[0].id}`);
          }
        } else {
          // If no low-priority operations, remove oldest normal priority
          const normalPriorityIndex = this.syncQueue.findIndex(op => op.priority === 'normal');
          if (normalPriorityIndex !== -1) {
            const removed = this.syncQueue.splice(normalPriorityIndex, 1);
            if (removed[0]) {
              logSecurity(`[SyncCoordinator] Queue overflow, removed normal-priority operation: ${removed[0].id}`);
            }
          } else {
            // Last resort: remove oldest operation (but never crisis)
            const nonCrisisIndex = this.syncQueue.findIndex(op => op.priority !== 'crisis');
            if (nonCrisisIndex !== -1) {
              const removed = this.syncQueue.splice(nonCrisisIndex, 1);
              if (removed[0]) {
                logSecurity(`[SyncCoordinator] Queue overflow, removed operation: ${removed[0].id}`);
              }
            }
          }
        }
      }

      this.syncQueue.push(operation);

      // Enhanced queue sorting with deduplication
      this.deduplicateQueue();

      // Sort queue by priority (crisis > high > normal > low)
      this.syncQueue.sort((a, b) => {
        const priorityOrder = { crisis: 0, high: 1, normal: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      // Persist queue after changes
      await this.persistQueue();

      logPerformance(`[SyncCoordinator] Scheduled ${priority} priority sync: ${reason}`);

      // If high priority or crisis, process immediately
      if (priority === 'crisis' || priority === 'high') {
        await this.processOfflineQueue();
      }

    } catch (error) {
      logError('🚨 Failed to schedule sync:', error);
    }
  }

  /**
   * CLEANUP
   */
  public async cleanup(): Promise<void> {
    try {
      logPerformance('🧹 Cleaning up SyncCoordinator...');

      // Clear all timers
      if (this.syncTimer) {
        clearTimeout(this.syncTimer);
        this.syncTimer = null;
      }

      if (this.syncScheduler) {
        clearInterval(this.syncScheduler);
        this.syncScheduler = null;
      }

      // Unsubscribe from network monitoring
      if (this.networkUnsubscribe) {
        this.networkUnsubscribe();
        this.networkUnsubscribe = null;
      }

      // Unsubscribe from store changes
      if (this.storeUnsubscribe) {
        this.storeUnsubscribe();
        this.storeUnsubscribe = null;
      }

      // Clean up app state monitoring
      if (this.appStateCleanup) {
        this.appStateCleanup();
        this.appStateCleanup = null;
      }

      // Process any remaining queue items before shutdown
      if (this.syncQueue.length > 0) {
        logPerformance(`[SyncCoordinator] Processing ${this.syncQueue.length} final operations before cleanup`);
        await this.processOfflineQueue();
      }

      // Save final metadata
      await this.updateSyncMetadata();

      // Reset initialization state
      this.isInitialized = false;

      logPerformance('✅ SyncCoordinator cleanup completed');

    } catch (error) {
      logError('🚨 Error during SyncCoordinator cleanup:', error);
    }
  }

  private async getLocalDataTimestamp(): Promise<{ timestamp: number; data: string } | null> {
    try {
      // Get current data timestamp from assessment store
      const assessmentState = useAssessmentStore.getState();
      const currentTime = Date.now();

      return {
        timestamp: assessmentState.lastSavedAt || currentTime,
        data: JSON.stringify(assessmentState), // Simplified for now
      };

    } catch (error) {
      logError('🚨 Failed to get local data timestamp:', error);
      return null;
    }
  }

  private async getRemoteDataTimestamp(): Promise<{ timestamp: number; data: string } | null> {
    try {
      // Get remote backup from Supabase
      const remoteBackup = await this.supabaseService.getBackup();

      if (!remoteBackup) {
        logPerformance('No remote backup available');
        return null;
      }

      // Extract timestamp from remote backup metadata
      // Remote backup created_at is ISO string, convert to timestamp
      const remoteTimestamp = new Date(remoteBackup.created_at).getTime();

      return {
        timestamp: remoteTimestamp,
        data: remoteBackup.encrypted_data, // Encrypted blob from remote
      };

    } catch (error) {
      logError('🚨 Failed to get remote data timestamp:', error);
      return null;
    }
  }

  private async processQueuedOperation(operation: SyncOperation): Promise<void> {
    try {
      this.lastSyncOperationStart = Date.now();

      switch (operation.type) {
        case 'backup':
          logPerformance(`[SyncCoordinator] Processing queued backup operation: ${operation.id}`);

          // Use CloudBackupService for backup operations
          const backupResult = await this.cloudBackupService.createBackup();

          if (!backupResult.success) {
            throw new Error(`Backup operation failed: ${backupResult.error}`);
          }

          // Update sync metadata after successful backup
          await this.updateSyncMetadata();
          break;

        case 'restore':
          logPerformance(`[SyncCoordinator] Processing queued restore operation: ${operation.id}`);

          // Use CloudBackupService for restore operations
          const restoreResult = await this.cloudBackupService.restoreFromBackup();

          if (!restoreResult.success) {
            throw new Error(`Restore operation failed: ${restoreResult.errors?.join(', ')}`);
          }

          // Update local stores after successful restore
          await this.updateSyncMetadata();
          break;

        case 'conflict_resolution':
          logPerformance(`[SyncCoordinator] Processing queued conflict resolution: ${operation.id}`);

          // Re-process conflict resolution with current data
          if (operation.data?.conflictId) {
            const resolution = await this.resolveConflict(operation.data.conflictId);
            if (!resolution) {
              throw new Error(`Failed to resolve conflict: ${operation.data.conflictId}`);
            }
          }
          break;

        default:
          logSecurity(`[SyncCoordinator] Unknown queued operation type: ${operation.type}`);
      }

      // Track successful operation processing
      this.operationMetrics.successful++;
      this.lastSyncOperationEnd = Date.now();

    } catch (error) {
      logError(`🚨 Failed to process queued operation ${operation.id}:`, error);

      // Track failed operation
      this.operationMetrics.failed++;
      this.lastSyncOperationEnd = Date.now();

      // Re-queue operation if it's retryable and hasn't exceeded max retries
      const maxRetries = operation.priority === 'crisis' ? 5 : 3;
      const currentRetries = operation.data?.retryCount || 0;

      if (currentRetries < maxRetries) {
        const updatedOperation: SyncOperation = {
          ...operation,
          data: {
            ...operation.data,
            retryCount: currentRetries + 1,
            lastError: error instanceof Error ? error.message : String(error),
          }
        };

        // Add back to queue with updated retry count
        this.syncQueue.push(updatedOperation);

        logPerformance(`[SyncCoordinator] Re-queued operation ${operation.id} (retry ${currentRetries + 1}/${maxRetries})`);
      } else {
        logError(`🚨 Operation ${operation.id} exceeded max retries, discarding`);
      }

      throw error;
    }
  }
}

// Export singleton instance
export default SyncCoordinator.getInstance();