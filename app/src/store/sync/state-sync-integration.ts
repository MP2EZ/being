/**
 * State Sync Integration - Unified Cross-Device State Management
 *
 * Integrates cross-device state management with existing FullMind stores:
 * - Automatic bidirectional sync between local and cross-device stores
 * - Crisis state propagation with local-first guarantees
 * - Therapeutic session continuity across devices
 * - Performance monitoring and optimization
 * - Store-specific conflict resolution strategies
 *
 * INTEGRATION PATTERNS:
 * - Local-first: Critical data always available locally within 200ms
 * - Selective sync: Only essential data synced based on privacy/performance
 * - Event-driven: Real-time updates via subscription patterns
 * - Conflict-aware: Automatic resolution with clinical priority
 * - Performance-optimized: Memory management and cleanup
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { EventEmitter } from 'events';

// Store imports
import { useCrossDeviceStateStore, crossDeviceStateSelectors } from './cross-device-state-store';
import { useUserStore } from '../userStore';
import { useCheckInStore } from '../checkInStore';
import { useAssessmentStore } from '../assessmentStore';

// Service imports
import { encryptionService, DataSensitivity } from '../../services/security/EncryptionService';
import {
  SyncEntityType,
  SyncOperationType,
  SyncStatus,
  StoreSyncStatus,
  ClinicalValidationResult
} from '../../types/sync';

// Types
import type { CheckIn, Assessment, UserProfile, CrisisPlan } from '../../types';

// ============================================================================
// INTEGRATION CONFIGURATION
// ============================================================================

/**
 * Sync Configuration for each store type
 */
interface StoreSyncConfig {
  entityType: SyncEntityType;
  syncPriority: 'crisis' | 'therapeutic' | 'normal';
  syncFields: string[]; // Which fields to sync
  conflictResolution: 'local_wins' | 'remote_wins' | 'merge_crdt' | 'clinical_priority';
  encryptionLevel: DataSensitivity;
  realTimeSync: boolean;
  localFirstAccess: boolean; // Critical data must be available locally
  maxSyncInterval: number; // ms
  validationRequired: boolean;
}

const STORE_SYNC_CONFIGS: Record<string, StoreSyncConfig> = {
  user: {
    entityType: SyncEntityType.USER_PROFILE,
    syncPriority: 'normal',
    syncFields: ['preferences', 'notifications', 'values', 'emergencyContacts'],
    conflictResolution: 'merge_crdt',
    encryptionLevel: DataSensitivity.PERSONAL,
    realTimeSync: false,
    localFirstAccess: false,
    maxSyncInterval: 300000, // 5 minutes
    validationRequired: false,
  },

  checkin: {
    entityType: SyncEntityType.CHECK_IN,
    syncPriority: 'therapeutic',
    syncFields: ['type', 'data', 'timestamp', 'sessionId'],
    conflictResolution: 'merge_crdt',
    encryptionLevel: DataSensitivity.PERSONAL,
    realTimeSync: true,
    localFirstAccess: true,
    maxSyncInterval: 30000, // 30 seconds
    validationRequired: true,
  },

  assessment: {
    entityType: SyncEntityType.ASSESSMENT,
    syncPriority: 'crisis', // High priority due to crisis detection
    syncFields: ['type', 'answers', 'score', 'completed', 'completedAt'],
    conflictResolution: 'clinical_priority',
    encryptionLevel: DataSensitivity.CLINICAL,
    realTimeSync: true,
    localFirstAccess: true,
    maxSyncInterval: 5000, // 5 seconds
    validationRequired: true,
  },

  crisis: {
    entityType: SyncEntityType.CRISIS_PLAN,
    syncPriority: 'crisis',
    syncFields: ['emergencyContacts', 'crisisPlans', 'hotlinePreferences', 'safetyPlan'],
    conflictResolution: 'clinical_priority',
    encryptionLevel: DataSensitivity.CLINICAL,
    realTimeSync: true,
    localFirstAccess: true,
    maxSyncInterval: 1000, // 1 second for crisis data
    validationRequired: true,
  },
};

// ============================================================================
// SYNC EVENT TYPES
// ============================================================================

export type SyncIntegrationEvent =
  | { type: 'STORE_SYNC_STARTED'; storeType: string; entityId: string }
  | { type: 'STORE_SYNC_COMPLETED'; storeType: string; entityId: string; success: boolean }
  | { type: 'STORE_CONFLICT_DETECTED'; storeType: string; conflictId: string; criticalData: boolean }
  | { type: 'STORE_CONFLICT_RESOLVED'; storeType: string; conflictId: string; strategy: string }
  | { type: 'CRISIS_STATE_PROPAGATED'; sourceStore: string; crisisLevel: string; deviceCount: number }
  | { type: 'THERAPEUTIC_CONTINUITY_MAINTAINED'; sessionId: string; fromDevice: string; toDevice: string }
  | { type: 'SYNC_PERFORMANCE_ALERT'; storeType: string; metric: string; value: number; threshold: number };

// ============================================================================
// STATE SYNC INTEGRATION STORE
// ============================================================================

interface StateSyncIntegration {
  // Integration state
  integrationStatus: Record<string, {
    connected: boolean;
    lastSync: string | null;
    syncErrors: string[];
    conflictsCount: number;
    performanceMetrics: {
      avgSyncTime: number;
      successRate: number;
      lastSyncLatency: number;
    };
  }>;

  // Sync coordination
  activeSyncs: Map<string, {
    storeType: string;
    entityId: string;
    startTime: number;
    priority: 'crisis' | 'therapeutic' | 'normal';
  }>;

  // Performance tracking
  integrationMetrics: {
    totalSyncs: number;
    successfulSyncs: number;
    averageSyncTime: number;
    crisisResponseTime: number;
    therapeuticContinuityRate: number;
    memoryEfficiency: number;
  };

  // Actions
  initializeIntegration: () => Promise<void>;
  integrateStore: (storeType: string, store: any) => Promise<void>;
  syncStoreData: (storeType: string, entityId: string, data: any, priority?: 'crisis' | 'therapeutic' | 'normal') => Promise<boolean>;
  handleStoreUpdate: (storeType: string, updateType: string, data: any) => Promise<void>;
  propagateCrisisState: (crisisData: any, sourceStore: string) => Promise<void>;
  maintainTherapeuticContinuity: (sessionData: any, storeType: string) => Promise<void>;
  resolveStoreConflict: (storeType: string, conflictId: string, strategy?: string) => Promise<boolean>;
  validateStoreSync: (storeType: string) => Promise<{ valid: boolean; issues: string[] }>;
  optimizeSyncPerformance: () => Promise<void>;
  getIntegrationStatus: (storeType?: string) => any;
  subscribeToSyncEvents: (callback: (event: SyncIntegrationEvent) => void) => () => void;

  // Internal state
  _internal: {
    eventEmitter: EventEmitter;
    storeSubscriptions: Map<string, () => void>;
    syncTimers: Map<string, NodeJS.Timeout>;
    performanceTracker: IntegrationPerformanceTracker;
  };
}

/**
 * Integration Performance Tracker
 */
class IntegrationPerformanceTracker {
  private metrics: Map<string, number[]> = new Map();

  recordSyncLatency(storeType: string, latency: number): void {
    this.addMetric(`${storeType}_sync_latency`, latency);
  }

  recordSyncSuccess(storeType: string, success: boolean): void {
    this.addMetric(`${storeType}_sync_success`, success ? 1 : 0);
  }

  recordCrisisResponse(responseTime: number): void {
    this.addMetric('crisis_response_time', responseTime);
  }

  recordTherapeuticContinuity(maintained: boolean): void {
    this.addMetric('therapeutic_continuity', maintained ? 1 : 0);
  }

  getAverageMetric(metricName: string): number {
    const values = this.metrics.get(metricName) || [];
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  getSuccessRate(storeType: string): number {
    return this.getAverageMetric(`${storeType}_sync_success`);
  }

  private addMetric(metricName: string, value: number): void {
    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, []);
    }

    const values = this.metrics.get(metricName)!;
    values.push(value);

    // Keep only last 100 values for memory efficiency
    if (values.length > 100) {
      values.shift();
    }
  }
}

/**
 * Create State Sync Integration Store
 */
export const useStateSyncIntegration = create<StateSyncIntegration>()(
  subscribeWithSelector((set, get) => {
    const eventEmitter = new EventEmitter();
    const performanceTracker = new IntegrationPerformanceTracker();

    return {
      // ============================================================================
      // INITIAL STATE
      // ============================================================================
      integrationStatus: {},
      activeSyncs: new Map(),
      integrationMetrics: {
        totalSyncs: 0,
        successfulSyncs: 0,
        averageSyncTime: 0,
        crisisResponseTime: 0,
        therapeuticContinuityRate: 1.0,
        memoryEfficiency: 1.0,
      },

      _internal: {
        eventEmitter,
        storeSubscriptions: new Map(),
        syncTimers: new Map(),
        performanceTracker,
      },

      // ============================================================================
      // INTEGRATION INITIALIZATION
      // ============================================================================

      initializeIntegration: async (): Promise<void> => {
        console.log('Initializing state sync integration...');

        try {
          // Initialize cross-device state store connection
          const crossDeviceStore = useCrossDeviceStateStore.getState();

          // Integrate with existing stores
          await get().integrateStore('user', useUserStore.getState());
          await get().integrateStore('checkin', useCheckInStore.getState());
          await get().integrateStore('assessment', useAssessmentStore.getState());

          // Set up cross-device state integration
          crossDeviceStore.integrateWithStore('user', useUserStore.getState());
          crossDeviceStore.integrateWithStore('checkin', useCheckInStore.getState());
          crossDeviceStore.integrateWithStore('assessment', useAssessmentStore.getState());

          // Start performance monitoring
          startPerformanceMonitoring();

          console.log('State sync integration initialized successfully');

        } catch (error) {
          console.error('Failed to initialize state sync integration:', error);
          throw error;
        }
      },

      // ============================================================================
      // STORE INTEGRATION
      // ============================================================================

      integrateStore: async (storeType, store): Promise<void> => {
        const config = STORE_SYNC_CONFIGS[storeType];
        if (!config) {
          throw new Error(`Unknown store type: ${storeType}`);
        }

        console.log(`Integrating ${storeType} store with cross-device sync...`);

        try {
          // Initialize integration status
          set((state) => {
            state.integrationStatus[storeType] = {
              connected: false,
              lastSync: null,
              syncErrors: [],
              conflictsCount: 0,
              performanceMetrics: {
                avgSyncTime: 0,
                successRate: 1.0,
                lastSyncLatency: 0,
              },
            };
          });

          // Set up store subscription for real-time sync
          const unsubscribe = setupStoreSubscription(storeType, store, config);
          get()._internal.storeSubscriptions.set(storeType, unsubscribe);

          // Perform initial sync
          await performInitialStoreSync(storeType, store, config);

          // Set up periodic sync for non-real-time stores
          if (!config.realTimeSync) {
            setupPeriodicSync(storeType, store, config);
          }

          // Mark as connected
          set((state) => {
            state.integrationStatus[storeType].connected = true;
            state.integrationStatus[storeType].lastSync = new Date().toISOString();
          });

          console.log(`${storeType} store integration completed`);

        } catch (error) {
          console.error(`Failed to integrate ${storeType} store:`, error);

          set((state) => {
            state.integrationStatus[storeType].syncErrors.push(error.message);
          });

          throw error;
        }
      },

      // ============================================================================
      // SYNC OPERATIONS
      // ============================================================================

      syncStoreData: async (storeType, entityId, data, priority = 'normal'): Promise<boolean> => {
        const config = STORE_SYNC_CONFIGS[storeType];
        if (!config) {
          console.error(`Unknown store type for sync: ${storeType}`);
          return false;
        }

        const syncId = `${storeType}_${entityId}_${Date.now()}`;
        const startTime = performance.now();

        try {
          // Track active sync
          set((state) => {
            state.activeSyncs.set(syncId, {
              storeType,
              entityId,
              startTime,
              priority: priority || config.syncPriority,
            });
          });

          // Emit sync started event
          eventEmitter.emit('syncEvent', {
            type: 'STORE_SYNC_STARTED',
            storeType,
            entityId,
          } as SyncIntegrationEvent);

          // Extract sync-relevant fields
          const syncData = extractSyncFields(data, config.syncFields);

          // Validate data if required
          if (config.validationRequired) {
            const validation = await validateStoreData(storeType, syncData);
            if (!validation.isValid) {
              throw new Error(`Validation failed: ${validation.dataIntegrityIssues.join(', ')}`);
            }
          }

          // Perform cross-device sync
          const crossDeviceStore = useCrossDeviceStateStore.getState();
          const syncSuccess = await crossDeviceStore.syncStateToAllDevices(
            config.entityType,
            syncData,
            priority || config.syncPriority
          );

          const syncLatency = performance.now() - startTime;

          // Update metrics
          performanceTracker.recordSyncLatency(storeType, syncLatency);
          performanceTracker.recordSyncSuccess(storeType, syncSuccess.successful.length > 0);

          set((state) => {
            state.integrationMetrics.totalSyncs++;
            if (syncSuccess.successful.length > 0) {
              state.integrationMetrics.successfulSyncs++;
            }
            state.integrationMetrics.averageSyncTime =
              (state.integrationMetrics.averageSyncTime + syncLatency) / 2;

            // Update store-specific metrics
            const status = state.integrationStatus[storeType];
            status.lastSync = new Date().toISOString();
            status.performanceMetrics.lastSyncLatency = syncLatency;
            status.performanceMetrics.avgSyncTime =
              (status.performanceMetrics.avgSyncTime + syncLatency) / 2;
            status.performanceMetrics.successRate = performanceTracker.getSuccessRate(storeType);
          });

          // Clean up active sync
          set((state) => {
            state.activeSyncs.delete(syncId);
          });

          // Emit completion event
          eventEmitter.emit('syncEvent', {
            type: 'STORE_SYNC_COMPLETED',
            storeType,
            entityId,
            success: syncSuccess.successful.length > 0,
          } as SyncIntegrationEvent);

          return syncSuccess.successful.length > 0;

        } catch (error) {
          console.error(`Store sync failed for ${storeType}.${entityId}:`, error);

          // Update error tracking
          set((state) => {
            state.integrationStatus[storeType].syncErrors.push(error.message);
            state.activeSyncs.delete(syncId);
          });

          // Emit failure event
          eventEmitter.emit('syncEvent', {
            type: 'STORE_SYNC_COMPLETED',
            storeType,
            entityId,
            success: false,
          } as SyncIntegrationEvent);

          return false;
        }
      },

      handleStoreUpdate: async (storeType, updateType, data): Promise<void> => {
        const config = STORE_SYNC_CONFIGS[storeType];
        if (!config) return;

        try {
          // Handle different update types
          switch (updateType) {
            case 'create':
            case 'update':
              await get().syncStoreData(storeType, data.id, data, config.syncPriority);
              break;

            case 'delete':
              // Handle deletion sync
              await handleDeletionSync(storeType, data.id);
              break;

            case 'crisis_detected':
              await get().propagateCrisisState(data, storeType);
              break;

            case 'session_started':
            case 'session_updated':
              await get().maintainTherapeuticContinuity(data, storeType);
              break;

            default:
              console.log(`Unhandled update type: ${updateType} for store: ${storeType}`);
          }

        } catch (error) {
          console.error(`Failed to handle store update ${updateType} for ${storeType}:`, error);
        }
      },

      // ============================================================================
      // CRISIS STATE PROPAGATION
      // ============================================================================

      propagateCrisisState: async (crisisData, sourceStore): Promise<void> => {
        const startTime = performance.now();

        try {
          console.log(`Propagating crisis state from ${sourceStore}:`, crisisData);

          // Activate crisis mode in cross-device store
          const crossDeviceStore = useCrossDeviceStateStore.getState();
          const activationSuccess = await crossDeviceStore.activateCrisisMode(
            crisisData.crisisLevel || 'moderate',
            {
              sourceStore,
              crisisData,
              automaticDetection: true,
            }
          );

          if (!activationSuccess) {
            throw new Error('Failed to activate crisis mode');
          }

          // Ensure local crisis accessibility
          await crossDeviceStore.ensureCrisisAccessibility();

          // Propagate to all integrated stores
          const storeTypes = Object.keys(get().integrationStatus);
          for (const storeType of storeTypes) {
            if (storeType !== sourceStore) {
              await notifyStoreCrisisState(storeType, crisisData);
            }
          }

          const responseTime = performance.now() - startTime;
          performanceTracker.recordCrisisResponse(responseTime);

          set((state) => {
            state.integrationMetrics.crisisResponseTime = responseTime;
          });

          // Get device count for metrics
          const onlineDevices = crossDeviceStateSelectors.getOnlineDevices(crossDeviceStore);

          eventEmitter.emit('syncEvent', {
            type: 'CRISIS_STATE_PROPAGATED',
            sourceStore,
            crisisLevel: crisisData.crisisLevel || 'moderate',
            deviceCount: onlineDevices.length,
          } as SyncIntegrationEvent);

          console.log(`Crisis state propagated successfully in ${responseTime}ms to ${onlineDevices.length} devices`);

        } catch (error) {
          console.error(`Crisis state propagation failed:`, error);
          throw error;
        }
      },

      // ============================================================================
      // THERAPEUTIC CONTINUITY
      // ============================================================================

      maintainTherapeuticContinuity: async (sessionData, storeType): Promise<void> => {
        try {
          const crossDeviceStore = useCrossDeviceStateStore.getState();

          // Check if session exists in cross-device store
          const existingSession = Array.from(crossDeviceStore.activeSessions.values())
            .find(session => session.sessionId === sessionData.sessionId);

          if (existingSession) {
            // Update existing session
            await crossDeviceStore.updateSessionState(
              sessionData.sessionId,
              sessionData,
              true // preserve therapeutic continuity
            );
          } else {
            // Create new cross-device session
            await crossDeviceStore.createCrossDeviceSession(
              sessionData.type || 'general',
              sessionData,
              undefined // auto-determine participating devices
            );
          }

          performanceTracker.recordTherapeuticContinuity(true);

          set((state) => {
            state.integrationMetrics.therapeuticContinuityRate =
              performanceTracker.getAverageMetric('therapeutic_continuity');
          });

          console.log(`Therapeutic continuity maintained for session ${sessionData.sessionId}`);

        } catch (error) {
          console.error(`Failed to maintain therapeutic continuity:`, error);
          performanceTracker.recordTherapeuticContinuity(false);
        }
      },

      // ============================================================================
      // CONFLICT RESOLUTION
      // ============================================================================

      resolveStoreConflict: async (storeType, conflictId, strategy): Promise<boolean> => {
        try {
          const config = STORE_SYNC_CONFIGS[storeType];
          const resolutionStrategy = strategy || config.conflictResolution;

          const crossDeviceStore = useCrossDeviceStateStore.getState();
          const result = await crossDeviceStore.resolveConflict(conflictId, resolutionStrategy);

          set((state) => {
            if (result.resolved) {
              state.integrationStatus[storeType].conflictsCount = Math.max(0,
                state.integrationStatus[storeType].conflictsCount - 1
              );
            }
          });

          eventEmitter.emit('syncEvent', {
            type: 'STORE_CONFLICT_RESOLVED',
            storeType,
            conflictId,
            strategy: resolutionStrategy,
          } as SyncIntegrationEvent);

          return result.resolved;

        } catch (error) {
          console.error(`Conflict resolution failed for ${storeType}.${conflictId}:`, error);
          return false;
        }
      },

      // ============================================================================
      // VALIDATION AND OPTIMIZATION
      // ============================================================================

      validateStoreSync: async (storeType): Promise<{ valid: boolean; issues: string[] }> => {
        const issues: string[] = [];
        let valid = true;

        try {
          const config = STORE_SYNC_CONFIGS[storeType];
          if (!config) {
            issues.push(`Unknown store type: ${storeType}`);
            return { valid: false, issues };
          }

          // Check integration status
          const status = get().integrationStatus[storeType];
          if (!status?.connected) {
            issues.push(`Store ${storeType} not connected`);
            valid = false;
          }

          // Check sync errors
          if (status?.syncErrors?.length > 0) {
            issues.push(`Recent sync errors: ${status.syncErrors.slice(-3).join(', ')}`);
            valid = false;
          }

          // Check performance metrics
          if (status?.performanceMetrics?.successRate < 0.9) {
            issues.push(`Low success rate: ${(status.performanceMetrics.successRate * 100).toFixed(1)}%`);
            valid = false;
          }

          // Validate with cross-device store
          const crossDeviceStore = useCrossDeviceStateStore.getState();
          const crossDeviceValidation = await crossDeviceStore.validateStateIntegrity();

          if (!crossDeviceValidation.valid) {
            issues.push(...crossDeviceValidation.issues);
            valid = false;
          }

          return { valid, issues };

        } catch (error) {
          console.error(`Validation failed for ${storeType}:`, error);
          return { valid: false, issues: ['Validation process failed'] };
        }
      },

      optimizeSyncPerformance: async (): Promise<void> => {
        try {
          console.log('Optimizing sync performance...');

          // Optimize cross-device state distribution
          const crossDeviceStore = useCrossDeviceStateStore.getState();
          await crossDeviceStore.optimizeStateDistribution();

          // Clean up stale states
          const cleanupResult = await crossDeviceStore.cleanupStaleStates();
          console.log(`Cleaned up ${cleanupResult.cleaned} stale states, freed ${cleanupResult.memoryFreed} bytes`);

          // Update memory efficiency metric
          set((state) => {
            state.integrationMetrics.memoryEfficiency = Math.min(1,
              1 - (crossDeviceStore.performanceMetrics.memoryUsage / (100 * 1024 * 1024)) // 100MB baseline
            );
          });

          // Optimize sync timers
          optimizeSyncTimers();

          console.log('Sync performance optimization completed');

        } catch (error) {
          console.error('Sync performance optimization failed:', error);
        }
      },

      // ============================================================================
      // STATUS AND MONITORING
      // ============================================================================

      getIntegrationStatus: (storeType): any => {
        if (storeType) {
          return get().integrationStatus[storeType] || null;
        }
        return {
          integrationStatus: get().integrationStatus,
          activeSyncs: Array.from(get().activeSyncs.values()),
          integrationMetrics: get().integrationMetrics,
        };
      },

      subscribeToSyncEvents: (callback): (() => void) => {
        eventEmitter.on('syncEvent', callback);
        return () => eventEmitter.off('syncEvent', callback);
      },
    };

    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================

    function setupStoreSubscription(storeType: string, store: any, config: StoreSyncConfig): () => void {
      if (!store.subscribe) {
        console.warn(`Store ${storeType} does not support subscriptions`);
        return () => {};
      }

      return store.subscribe((state: any, prevState: any) => {
        // Detect changes in sync-relevant fields
        const hasRelevantChanges = config.syncFields.some(field => {
          const currentValue = getNestedValue(state, field);
          const prevValue = getNestedValue(prevState, field);
          return JSON.stringify(currentValue) !== JSON.stringify(prevValue);
        });

        if (hasRelevantChanges && config.realTimeSync) {
          // Trigger real-time sync
          const syncData = extractSyncFields(state, config.syncFields);
          get().syncStoreData(storeType, state.id || 'current', syncData, config.syncPriority);
        }

        // Handle special cases
        if (storeType === 'assessment' && state.lastAssessment && !prevState.lastAssessment) {
          get().handleStoreUpdate(storeType, 'create', state.lastAssessment);
        }

        if (storeType === 'checkin' && state.currentSession && !prevState.currentSession) {
          get().handleStoreUpdate(storeType, 'session_started', state.currentSession);
        }
      });
    }

    async function performInitialStoreSync(storeType: string, store: any, config: StoreSyncConfig): Promise<void> {
      try {
        const state = store.getState ? store.getState() : store;
        const syncData = extractSyncFields(state, config.syncFields);

        if (Object.keys(syncData).length > 0) {
          await get().syncStoreData(storeType, 'initial', syncData, config.syncPriority);
        }
      } catch (error) {
        console.error(`Initial sync failed for ${storeType}:`, error);
      }
    }

    function setupPeriodicSync(storeType: string, store: any, config: StoreSyncConfig): void {
      const timer = setInterval(async () => {
        try {
          const state = store.getState ? store.getState() : store;
          const syncData = extractSyncFields(state, config.syncFields);

          if (Object.keys(syncData).length > 0) {
            await get().syncStoreData(storeType, 'periodic', syncData, config.syncPriority);
          }
        } catch (error) {
          console.error(`Periodic sync failed for ${storeType}:`, error);
        }
      }, config.maxSyncInterval);

      get()._internal.syncTimers.set(storeType, timer);
    }

    function extractSyncFields(data: any, fields: string[]): any {
      const extracted: any = {};

      fields.forEach(field => {
        const value = getNestedValue(data, field);
        if (value !== undefined) {
          setNestedValue(extracted, field, value);
        }
      });

      return extracted;
    }

    function getNestedValue(obj: any, path: string): any {
      return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    function setNestedValue(obj: any, path: string, value: any): void {
      const keys = path.split('.');
      const lastKey = keys.pop()!;
      const target = keys.reduce((current, key) => {
        if (!current[key]) current[key] = {};
        return current[key];
      }, obj);
      target[lastKey] = value;
    }

    async function validateStoreData(storeType: string, data: any): Promise<ClinicalValidationResult> {
      // Basic validation based on store type
      const result: ClinicalValidationResult = {
        isValid: true,
        assessmentScoresValid: true,
        crisisThresholdsValid: true,
        therapeuticContinuityPreserved: true,
        dataIntegrityIssues: [],
        recommendations: [],
        validatedAt: new Date().toISOString(),
      };

      try {
        switch (storeType) {
          case 'assessment':
            if (data.score !== undefined) {
              if (data.type === 'phq9' && (data.score < 0 || data.score > 27)) {
                result.isValid = false;
                result.assessmentScoresValid = false;
                result.dataIntegrityIssues.push('PHQ-9 score out of valid range (0-27)');
              }
              if (data.type === 'gad7' && (data.score < 0 || data.score > 21)) {
                result.isValid = false;
                result.assessmentScoresValid = false;
                result.dataIntegrityIssues.push('GAD-7 score out of valid range (0-21)');
              }
            }
            break;

          case 'checkin':
            if (!data.timestamp || !data.type || !data.data) {
              result.isValid = false;
              result.therapeuticContinuityPreserved = false;
              result.dataIntegrityIssues.push('Check-in missing required fields');
            }
            break;

          case 'crisis':
            if (!data.emergencyContacts && !data.crisisPlans) {
              result.isValid = false;
              result.crisisThresholdsValid = false;
              result.dataIntegrityIssues.push('Crisis data missing essential safety information');
            }
            break;
        }

        return result;

      } catch (error) {
        result.isValid = false;
        result.dataIntegrityIssues.push(`Validation error: ${error.message}`);
        return result;
      }
    }

    async function handleDeletionSync(storeType: string, entityId: string): Promise<void> {
      try {
        const crossDeviceStore = useCrossDeviceStateStore.getState();
        await crossDeviceStore.syncStateToAllDevices(
          STORE_SYNC_CONFIGS[storeType].entityType,
          { id: entityId, deleted: true },
          'normal'
        );
      } catch (error) {
        console.error(`Deletion sync failed for ${storeType}.${entityId}:`, error);
      }
    }

    async function notifyStoreCrisisState(storeType: string, crisisData: any): Promise<void> {
      try {
        // Implementation would depend on store-specific APIs
        console.log(`Notifying ${storeType} store of crisis state:`, crisisData);
      } catch (error) {
        console.error(`Failed to notify ${storeType} of crisis state:`, error);
      }
    }

    function startPerformanceMonitoring(): void {
      setInterval(() => {
        const metrics = get().integrationMetrics;

        // Check for performance alerts
        if (metrics.averageSyncTime > 5000) { // 5 seconds
          eventEmitter.emit('syncEvent', {
            type: 'SYNC_PERFORMANCE_ALERT',
            storeType: 'all',
            metric: 'average_sync_time',
            value: metrics.averageSyncTime,
            threshold: 5000,
          } as SyncIntegrationEvent);
        }

        if (metrics.crisisResponseTime > 200) { // 200ms for crisis
          eventEmitter.emit('syncEvent', {
            type: 'SYNC_PERFORMANCE_ALERT',
            storeType: 'crisis',
            metric: 'crisis_response_time',
            value: metrics.crisisResponseTime,
            threshold: 200,
          } as SyncIntegrationEvent);
        }
      }, 60000); // Check every minute
    }

    function optimizeSyncTimers(): void {
      // Optimize sync intervals based on usage patterns
      for (const [storeType, timer] of get()._internal.syncTimers) {
        const status = get().integrationStatus[storeType];
        if (status?.performanceMetrics?.successRate > 0.95) {
          // High success rate - can increase interval slightly for efficiency
          clearInterval(timer);
          const config = STORE_SYNC_CONFIGS[storeType];
          setupPeriodicSync(storeType, null, {
            ...config,
            maxSyncInterval: Math.min(config.maxSyncInterval * 1.2, 600000) // Max 10 minutes
          });
        }
      }
    }
  })
);

// ============================================================================
// INTEGRATION HOOKS AND SELECTORS
// ============================================================================

/**
 * Main integration hook
 */
export const useIntegratedSync = () => {
  const integration = useStateSyncIntegration();
  const crossDeviceState = useCrossDeviceStateStore();

  return {
    // Integration state
    integrationStatus: integration.integrationStatus,
    integrationMetrics: integration.integrationMetrics,
    activeSyncs: integration.activeSyncs,

    // Cross-device state
    deviceRegistry: crossDeviceState.deviceRegistry,
    activeSessions: crossDeviceState.activeSessions,
    crisisCoordination: crossDeviceState.crisisCoordination,

    // Actions
    initializeIntegration: integration.initializeIntegration,
    syncStoreData: integration.syncStoreData,
    propagateCrisisState: integration.propagateCrisisState,
    maintainTherapeuticContinuity: integration.maintainTherapeuticContinuity,
    resolveStoreConflict: integration.resolveStoreConflict,
    validateStoreSync: integration.validateStoreSync,
    optimizeSyncPerformance: integration.optimizeSyncPerformance,

    // Monitoring
    getIntegrationStatus: integration.getIntegrationStatus,
    subscribeToSyncEvents: integration.subscribeToSyncEvents,

    // Cross-device actions
    registerDevice: crossDeviceState.registerDevice,
    handoffSession: crossDeviceState.handoffSession,
    activateCrisisMode: crossDeviceState.activateCrisisMode,
    ensureCrisisAccessibility: crossDeviceState.ensureCrisisAccessibility,
  };
};

/**
 * Crisis-specific integration hook
 */
export const useCrisisIntegration = () => {
  const integration = useStateSyncIntegration();
  const crossDeviceState = useCrossDeviceStateStore();

  return {
    // Crisis state
    crisisActive: crossDeviceState.crisisCoordination.crisisActive,
    crisisLevel: crossDeviceState.crisisCoordination.crisisLevel,
    crisisResponseTime: integration.integrationMetrics.crisisResponseTime,

    // Crisis actions
    activateCrisisMode: crossDeviceState.activateCrisisMode,
    propagateCrisisState: integration.propagateCrisisState,
    ensureCrisisAccessibility: crossDeviceState.ensureCrisisAccessibility,
    resolvecrisis: crossDeviceState.resolvecrisis,

    // Crisis monitoring
    getCrisisDevices: () => crossDeviceStateSelectors.getCrisisDevices(crossDeviceState),
    isCrisisReady: () => crossDeviceState.crisisCoordination.crisisStateDistribution.crisisResourcesReady,
    isHotlineReady: () => crossDeviceState.crisisCoordination.crisisStateDistribution.hotlineAccessReady,
  };
};

/**
 * Performance monitoring hook
 */
export const useSyncPerformance = () => {
  const integration = useStateSyncIntegration();
  const crossDeviceState = useCrossDeviceStateStore();

  return {
    // Performance metrics
    integrationMetrics: integration.integrationMetrics,
    crossDeviceMetrics: crossDeviceState.performanceMetrics,

    // Performance actions
    optimizeSyncPerformance: integration.optimizeSyncPerformance,
    cleanupStaleStates: crossDeviceState.cleanupStaleStates,
    validateStateIntegrity: crossDeviceState.validateStateIntegrity,

    // Performance monitoring
    subscribeToSyncEvents: integration.subscribeToSyncEvents,
    getIntegrationStatus: integration.getIntegrationStatus,
  };
};

export default useStateSyncIntegration;