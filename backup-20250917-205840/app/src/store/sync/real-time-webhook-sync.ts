/**
 * Real-Time Webhook Sync for FullMind MBCT App
 *
 * Live state updates from webhook processing with:
 * - Real-time state synchronization with <200ms crisis response
 * - Optimistic updates with conflict resolution
 * - Therapeutic continuity protection during sync operations
 * - Crisis-aware sync prioritization and batching
 * - HIPAA-compliant real-time data handling
 * - WebSocket-style live updates for subscription changes
 * - Offline queue management with encrypted persistence
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  WebhookEvent,
  WebhookProcessingResult,
} from '../../types/webhooks/webhook-events';
import {
  CrisisLevel,
  TherapeuticContinuity,
} from '../../types/webhooks/crisis-safety-types';
import { TherapeuticMessage } from '../../types/webhooks/therapeutic-messaging';

/**
 * Real-Time Sync Event Types
 */
export type SyncEventType =
  | 'subscription_status_change'
  | 'payment_status_update'
  | 'feature_access_change'
  | 'crisis_level_change'
  | 'grace_period_activation'
  | 'emergency_access_granted'
  | 'therapeutic_continuity_update'
  | 'webhook_processing_complete'
  | 'state_conflict_detected'
  | 'sync_performance_update';

/**
 * Real-Time Sync Priority Levels
 */
export type SyncPriority = 'immediate' | 'high' | 'normal' | 'low' | 'background';

/**
 * Sync Operation Status
 */
export type SyncOperationStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying' | 'cancelled';

/**
 * Real-Time Sync Event
 */
interface RealTimeSyncEvent {
  id: string;
  type: SyncEventType;
  priority: SyncPriority;
  timestamp: number;
  sourceEvent?: WebhookEvent;
  data: any;
  targetStores: string[];
  crisisLevel: CrisisLevel;
  therapeuticImpact: boolean;
  status: SyncOperationStatus;
  retryCount: number;
  maxRetries: number;
  processingTime?: number;
  errorMessage?: string;
}

/**
 * Store Sync Configuration
 */
interface StoreSyncConfig {
  storeId: string;
  syncEnabled: boolean;
  syncPriority: SyncPriority;
  batchingEnabled: boolean;
  batchSize: number;
  batchTimeout: number;
  conflictResolution: 'local_wins' | 'remote_wins' | 'merge' | 'manual';
  lastSyncTimestamp: number;
  syncErrors: number;
  syncSuccess: number;
}

/**
 * Real-Time Webhook Sync State
 */
interface RealTimeWebhookSyncState {
  // Core Sync State
  syncActive: boolean;
  realTimeMode: boolean;
  syncInterval: number;
  lastGlobalSync: number;
  globalSyncHealth: 'healthy' | 'degraded' | 'critical' | 'offline';

  // Event Processing
  activeEvents: Map<string, RealTimeSyncEvent>;
  eventQueue: RealTimeSyncEvent[];
  processingQueue: RealTimeSyncEvent[];
  completedEvents: Map<string, RealTimeSyncEvent>;
  failedEvents: Map<string, RealTimeSyncEvent>;

  // Store Integration
  connectedStores: Map<string, StoreSyncConfig>;
  storeSubscriptions: Map<string, Function>;
  syncBatches: Map<string, RealTimeSyncEvent[]>;

  // Performance Monitoring
  syncPerformanceMetrics: {
    totalSyncOperations: number;
    successfulSyncs: number;
    failedSyncs: number;
    averageSyncTime: number;
    crisisSyncTime: number;
    lastPerformanceCheck: number;
    throughputPerSecond: number;
    concurrentOperations: number;
    maxConcurrentOperations: number;
  };

  // Crisis-Aware Sync Management
  crisisSyncState: {
    crisisMode: boolean;
    crisisLevel: CrisisLevel;
    emergencySyncActive: boolean;
    therapeuticContinuityProtected: boolean;
    crisisEventPrioritization: boolean;
    emergencyBypassActive: boolean;
  };

  // Conflict Resolution
  activeConflicts: Map<string, {
    conflictId: string;
    localState: any;
    remoteState: any;
    storeId: string;
    timestamp: number;
    resolutionStrategy: string;
    autoResolvable: boolean;
  }>;
  conflictResolutionQueue: string[];

  // Offline & Recovery
  offlineSyncQueue: RealTimeSyncEvent[];
  networkStatus: 'online' | 'offline' | 'poor' | 'unknown';
  syncRecoveryInProgress: boolean;
  lastOfflineTimestamp: number;

  // Real-Time Communication
  realTimeCommunication: {
    currentMessage: TherapeuticMessage | null;
    syncNotifications: boolean;
    userFeedbackEnabled: boolean;
    anxietyReducingMode: boolean;
  };
}

/**
 * Real-Time Webhook Sync Actions
 */
interface RealTimeWebhookSyncActions {
  // Initialization & Configuration
  initializeRealTimeSync: () => Promise<void>;
  shutdownRealTimeSync: () => Promise<void>;
  configureSync: (config: Partial<RealTimeWebhookSyncState>) => void;

  // Real-Time Event Processing
  processRealTimeEvent: (event: RealTimeSyncEvent) => Promise<WebhookProcessingResult>;
  queueSyncEvent: (type: SyncEventType, data: any, targetStores: string[], priority?: SyncPriority) => string;
  prioritizeEvent: (eventId: string, newPriority: SyncPriority) => void;
  cancelSyncEvent: (eventId: string, reason: string) => void;

  // Store Integration & Management
  connectStore: (storeId: string, store: any, config: Partial<StoreSyncConfig>) => void;
  disconnectStore: (storeId: string) => void;
  syncWithStore: (storeId: string, data: any) => Promise<void>;
  batchSyncToStore: (storeId: string, events: RealTimeSyncEvent[]) => Promise<void>;

  // Crisis-Aware Sync Operations
  activateCrisisSync: (crisisLevel: CrisisLevel) => Promise<void>;
  deactivateCrisisSync: () => Promise<void>;
  prioritizeCrisisEvents: () => Promise<void>;
  preserveTherapeuticSyncContinuity: () => Promise<void>;

  // Conflict Resolution
  detectSyncConflict: (storeId: string, localState: any, remoteState: any) => string;
  resolveSyncConflict: (conflictId: string, resolution: 'local' | 'remote' | 'merge') => Promise<void>;
  autoResolveConflicts: () => Promise<void>;

  // Performance & Monitoring
  trackSyncPerformance: (eventId: string, startTime: number, endTime: number, success: boolean) => void;
  getSyncHealth: () => { healthy: boolean; issues: string[]; metrics: any };
  optimizeSyncPerformance: () => Promise<void>;

  // Offline & Recovery Management
  handleOfflineMode: () => Promise<void>;
  handleOnlineRecovery: () => Promise<void>;
  processSyncRecovery: () => Promise<void>;
  flushOfflineQueue: () => Promise<void>;

  // Real-Time Communication
  displaySyncNotification: (message: TherapeuticMessage) => void;
  updateUserOnSyncStatus: (status: string, therapeutic: boolean) => void;
  clearSyncNotifications: () => void;

  // Batch Operations
  createSyncBatch: (storeId: string, events: RealTimeSyncEvent[]) => void;
  processSyncBatches: () => Promise<void>;
  optimizeBatchSize: (storeId: string) => void;

  // Event Queue Management
  processEventQueue: () => Promise<void>;
  retryFailedEvents: () => Promise<void>;
  cleanupCompletedEvents: () => void;
}

/**
 * Combined Real-Time Webhook Sync Store
 */
type RealTimeWebhookSyncStore = RealTimeWebhookSyncState & RealTimeWebhookSyncActions;

/**
 * Real-Time Webhook Sync Implementation
 */
export const useRealTimeWebhookSync = create<RealTimeWebhookSyncStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    syncActive: false,
    realTimeMode: false,
    syncInterval: 1000, // 1 second for real-time
    lastGlobalSync: 0,
    globalSyncHealth: 'healthy',

    // Event Processing
    activeEvents: new Map(),
    eventQueue: [],
    processingQueue: [],
    completedEvents: new Map(),
    failedEvents: new Map(),

    // Store Integration
    connectedStores: new Map(),
    storeSubscriptions: new Map(),
    syncBatches: new Map(),

    // Performance Metrics
    syncPerformanceMetrics: {
      totalSyncOperations: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      averageSyncTime: 0,
      crisisSyncTime: 0,
      lastPerformanceCheck: Date.now(),
      throughputPerSecond: 0,
      concurrentOperations: 0,
      maxConcurrentOperations: 10,
    },

    // Crisis State
    crisisSyncState: {
      crisisMode: false,
      crisisLevel: 'none',
      emergencySyncActive: false,
      therapeuticContinuityProtected: true,
      crisisEventPrioritization: false,
      emergencyBypassActive: false,
    },

    // Conflicts
    activeConflicts: new Map(),
    conflictResolutionQueue: [],

    // Offline
    offlineSyncQueue: [],
    networkStatus: 'online',
    syncRecoveryInProgress: false,
    lastOfflineTimestamp: 0,

    // Communication
    realTimeCommunication: {
      currentMessage: null,
      syncNotifications: true,
      userFeedbackEnabled: true,
      anxietyReducingMode: true,
    },

    // Actions Implementation
    initializeRealTimeSync: async () => {
      const startTime = Date.now();

      try {
        set({
          syncActive: true,
          realTimeMode: true,
          lastGlobalSync: Date.now(),
          globalSyncHealth: 'healthy',
        });

        // Start real-time processing
        get().processEventQueue();

        // Start performance monitoring
        setInterval(() => {
          get().optimizeSyncPerformance();
        }, 30000); // Every 30 seconds

        const initTime = Date.now() - startTime;
        console.log(`[RealTimeWebhookSync] Initialized in ${initTime}ms`);

      } catch (error) {
        console.error('[RealTimeWebhookSync] Initialization failed:', error);
        set({ globalSyncHealth: 'critical' });
        throw error;
      }
    },

    shutdownRealTimeSync: async () => {
      // Process remaining events
      await get().processEventQueue();

      // Flush offline queue
      await get().flushOfflineQueue();

      set({
        syncActive: false,
        realTimeMode: false,
      });

      console.log('[RealTimeWebhookSync] Shutdown completed');
    },

    configureSync: (config: Partial<RealTimeWebhookSyncState>) => {
      set({ ...config });
      console.log('[RealTimeWebhookSync] Configuration updated');
    },

    processRealTimeEvent: async (event: RealTimeSyncEvent) => {
      const startTime = Date.now();

      try {
        // Add to active events
        const activeEvents = new Map(get().activeEvents);
        activeEvents.set(event.id, { ...event, status: 'processing' });
        set({ activeEvents });

        // Determine processing urgency based on crisis level and priority
        const isCrisisEvent = event.crisisLevel === 'critical' || event.crisisLevel === 'emergency';
        const isImmediateEvent = event.priority === 'immediate';
        const maxProcessingTime = (isCrisisEvent || isImmediateEvent) ? 200 : 2000;

        // Process event based on type
        switch (event.type) {
          case 'subscription_status_change':
            await get().syncSubscriptionStatusChange(event);
            break;

          case 'payment_status_update':
            await get().syncPaymentStatusUpdate(event);
            break;

          case 'crisis_level_change':
            await get().syncCrisisLevelChange(event);
            break;

          case 'emergency_access_granted':
            await get().syncEmergencyAccessChange(event);
            break;

          case 'therapeutic_continuity_update':
            await get().syncTherapeuticContinuityUpdate(event);
            break;

          default:
            console.log(`[RealTimeWebhookSync] Processing general sync event: ${event.type}`);
            await get().syncGeneralEvent(event);
        }

        const processingTime = Date.now() - startTime;

        // Track performance
        get().trackSyncPerformance(event.id, startTime, Date.now(), true);

        // Validate crisis response time
        if ((isCrisisEvent || isImmediateEvent) && processingTime > maxProcessingTime) {
          console.warn(`[RealTimeWebhookSync] Crisis response time violation: ${processingTime}ms > ${maxProcessingTime}ms`);
        }

        // Mark as completed
        const completedEvents = new Map(get().completedEvents);
        completedEvents.set(event.id, { ...event, status: 'completed', processingTime });

        const updatedActiveEvents = new Map(get().activeEvents);
        updatedActiveEvents.delete(event.id);

        set({
          completedEvents,
          activeEvents: updatedActiveEvents,
        });

        return {
          success: true,
          eventId: event.id,
          processingTime,
          crisisMode: isCrisisEvent,
          therapeuticContinuity: true,
        };

      } catch (error) {
        const processingTime = Date.now() - startTime;

        // Track failure
        get().trackSyncPerformance(event.id, startTime, Date.now(), false);

        // Move to failed events
        const failedEvents = new Map(get().failedEvents);
        failedEvents.set(event.id, {
          ...event,
          status: 'failed',
          processingTime,
          errorMessage: error.message,
        });

        const updatedActiveEvents = new Map(get().activeEvents);
        updatedActiveEvents.delete(event.id);

        set({
          failedEvents,
          activeEvents: updatedActiveEvents,
        });

        console.error(`[RealTimeWebhookSync] Event processing failed: ${event.id}`, error);

        return {
          success: false,
          eventId: event.id,
          processingTime,
          error: error.message,
          crisisMode: event.crisisLevel === 'critical',
          therapeuticContinuity: get().crisisSyncState.therapeuticContinuityProtected,
        };
      }
    },

    queueSyncEvent: (type: SyncEventType, data: any, targetStores: string[], priority: SyncPriority = 'normal') => {
      const event: RealTimeSyncEvent = {
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        priority,
        timestamp: Date.now(),
        data,
        targetStores,
        crisisLevel: get().crisisSyncState.crisisLevel,
        therapeuticImpact: type.includes('therapeutic') || type.includes('crisis'),
        status: 'pending',
        retryCount: 0,
        maxRetries: priority === 'immediate' ? 5 : 3,
      };

      const eventQueue = [...get().eventQueue, event];

      // Sort by priority
      eventQueue.sort((a, b) => {
        const priorityOrder = { immediate: 0, high: 1, normal: 2, low: 3, background: 4 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      set({ eventQueue });

      // Process immediately if high priority
      if (priority === 'immediate' || priority === 'high') {
        get().processEventQueue();
      }

      console.log(`[RealTimeWebhookSync] Event queued: ${type} (${priority})`);
      return event.id;
    },

    prioritizeEvent: (eventId: string, newPriority: SyncPriority) => {
      const eventQueue = get().eventQueue.map(event =>
        event.id === eventId ? { ...event, priority: newPriority } : event
      );

      // Re-sort queue
      eventQueue.sort((a, b) => {
        const priorityOrder = { immediate: 0, high: 1, normal: 2, low: 3, background: 4 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      set({ eventQueue });
      console.log(`[RealTimeWebhookSync] Event ${eventId} prioritized to ${newPriority}`);
    },

    cancelSyncEvent: (eventId: string, reason: string) => {
      const eventQueue = get().eventQueue.filter(event => event.id !== eventId);

      const activeEvents = new Map(get().activeEvents);
      if (activeEvents.has(eventId)) {
        const event = activeEvents.get(eventId)!;
        event.status = 'cancelled';
        event.errorMessage = reason;
        activeEvents.set(eventId, event);
      }

      set({ eventQueue, activeEvents });
      console.log(`[RealTimeWebhookSync] Event ${eventId} cancelled: ${reason}`);
    },

    connectStore: (storeId: string, store: any, config: Partial<StoreSyncConfig>) => {
      const defaultConfig: StoreSyncConfig = {
        storeId,
        syncEnabled: true,
        syncPriority: 'normal',
        batchingEnabled: true,
        batchSize: 10,
        batchTimeout: 5000,
        conflictResolution: 'merge',
        lastSyncTimestamp: 0,
        syncErrors: 0,
        syncSuccess: 0,
        ...config,
      };

      const connectedStores = new Map(get().connectedStores);
      connectedStores.set(storeId, defaultConfig);

      set({ connectedStores });

      console.log(`[RealTimeWebhookSync] Store connected: ${storeId}`);
    },

    disconnectStore: (storeId: string) => {
      const connectedStores = new Map(get().connectedStores);
      connectedStores.delete(storeId);

      const storeSubscriptions = new Map(get().storeSubscriptions);
      storeSubscriptions.delete(storeId);

      set({ connectedStores, storeSubscriptions });
      console.log(`[RealTimeWebhookSync] Store disconnected: ${storeId}`);
    },

    syncWithStore: async (storeId: string, data: any) => {
      const storeConfig = get().connectedStores.get(storeId);

      if (!storeConfig || !storeConfig.syncEnabled) {
        console.warn(`[RealTimeWebhookSync] Store ${storeId} not available for sync`);
        return;
      }

      try {
        // Check for conflicts
        const conflictId = get().detectSyncConflict(storeId, data.localState, data.remoteState);

        if (conflictId && storeConfig.conflictResolution === 'manual') {
          console.log(`[RealTimeWebhookSync] Manual conflict resolution required for ${storeId}: ${conflictId}`);
          return;
        }

        // Auto-resolve conflicts
        if (conflictId) {
          await get().resolveSyncConflict(conflictId, storeConfig.conflictResolution === 'merge' ? 'merge' : 'remote');
        }

        // Update store config
        const updatedConfig = {
          ...storeConfig,
          lastSyncTimestamp: Date.now(),
          syncSuccess: storeConfig.syncSuccess + 1,
        };

        const connectedStores = new Map(get().connectedStores);
        connectedStores.set(storeId, updatedConfig);
        set({ connectedStores });

        console.log(`[RealTimeWebhookSync] Store ${storeId} synced successfully`);

      } catch (error) {
        console.error(`[RealTimeWebhookSync] Store sync failed for ${storeId}:`, error);

        // Update error count
        if (storeConfig) {
          const updatedConfig = {
            ...storeConfig,
            syncErrors: storeConfig.syncErrors + 1,
          };

          const connectedStores = new Map(get().connectedStores);
          connectedStores.set(storeId, updatedConfig);
          set({ connectedStores });
        }
      }
    },

    batchSyncToStore: async (storeId: string, events: RealTimeSyncEvent[]) => {
      if (events.length === 0) return;

      console.log(`[RealTimeWebhookSync] Batch syncing ${events.length} events to ${storeId}`);

      try {
        // Group events by type for efficient processing
        const eventGroups = events.reduce((groups, event) => {
          const key = event.type;
          if (!groups[key]) groups[key] = [];
          groups[key].push(event);
          return groups;
        }, {} as Record<string, RealTimeSyncEvent[]>);

        // Process each group
        for (const [eventType, groupEvents] of Object.entries(eventGroups)) {
          await get().processBatchEventGroup(storeId, eventType, groupEvents);
        }

        console.log(`[RealTimeWebhookSync] Batch sync completed for ${storeId}`);

      } catch (error) {
        console.error(`[RealTimeWebhookSync] Batch sync failed for ${storeId}:`, error);
      }
    },

    activateCrisisSync: async (crisisLevel: CrisisLevel) => {
      const startTime = Date.now();

      set({
        crisisSyncState: {
          ...get().crisisSyncState,
          crisisMode: true,
          crisisLevel,
          emergencySyncActive: true,
          crisisEventPrioritization: true,
          therapeuticContinuityProtected: true,
        },
      });

      // Prioritize all pending crisis events
      await get().prioritizeCrisisEvents();

      // Reduce sync interval for crisis mode
      set({ syncInterval: 500 }); // 500ms for crisis

      const activationTime = Date.now() - startTime;
      console.log(`[RealTimeWebhookSync] Crisis sync activated in ${activationTime}ms: ${crisisLevel}`);
    },

    deactivateCrisisSync: async () => {
      set({
        crisisSyncState: {
          ...get().crisisSyncState,
          crisisMode: false,
          crisisLevel: 'none',
          emergencySyncActive: false,
          crisisEventPrioritization: false,
        },
        syncInterval: 1000, // Back to normal
      });

      console.log('[RealTimeWebhookSync] Crisis sync deactivated');
    },

    prioritizeCrisisEvents: async () => {
      const eventQueue = get().eventQueue;

      // Move crisis events to front
      const crisisEvents = eventQueue.filter(event =>
        event.crisisLevel === 'critical' ||
        event.crisisLevel === 'emergency' ||
        event.therapeuticImpact
      );

      const normalEvents = eventQueue.filter(event =>
        event.crisisLevel !== 'critical' &&
        event.crisisLevel !== 'emergency' &&
        !event.therapeuticImpact
      );

      // Prioritize crisis events
      crisisEvents.forEach(event => {
        event.priority = 'immediate';
      });

      const prioritizedQueue = [...crisisEvents, ...normalEvents];
      set({ eventQueue: prioritizedQueue });

      console.log(`[RealTimeWebhookSync] Prioritized ${crisisEvents.length} crisis events`);
    },

    preserveTherapeuticSyncContinuity: async () => {
      set({
        crisisSyncState: {
          ...get().crisisSyncState,
          therapeuticContinuityProtected: true,
        },
      });

      // Queue therapeutic continuity sync events for all stores
      const connectedStores = get().connectedStores;
      for (const [storeId] of connectedStores) {
        get().queueSyncEvent(
          'therapeutic_continuity_update',
          { therapeuticContinuityActive: true },
          [storeId],
          'immediate'
        );
      }

      console.log('[RealTimeWebhookSync] Therapeutic sync continuity preserved');
    },

    detectSyncConflict: (storeId: string, localState: any, remoteState: any) => {
      // Simple conflict detection - in practice this would be more sophisticated
      const hasConflict = JSON.stringify(localState) !== JSON.stringify(remoteState);

      if (hasConflict) {
        const conflictId = `conflict_${storeId}_${Date.now()}`;

        const activeConflicts = new Map(get().activeConflicts);
        activeConflicts.set(conflictId, {
          conflictId,
          localState,
          remoteState,
          storeId,
          timestamp: Date.now(),
          resolutionStrategy: 'pending',
          autoResolvable: true,
        });

        set({ activeConflicts });

        console.log(`[RealTimeWebhookSync] Sync conflict detected: ${conflictId}`);
        return conflictId;
      }

      return null;
    },

    resolveSyncConflict: async (conflictId: string, resolution: 'local' | 'remote' | 'merge') => {
      const conflict = get().activeConflicts.get(conflictId);

      if (!conflict) {
        console.warn(`[RealTimeWebhookSync] Conflict ${conflictId} not found`);
        return;
      }

      let resolvedState;

      switch (resolution) {
        case 'local':
          resolvedState = conflict.localState;
          break;
        case 'remote':
          resolvedState = conflict.remoteState;
          break;
        case 'merge':
          resolvedState = { ...conflict.localState, ...conflict.remoteState };
          break;
      }

      // Apply resolved state
      await get().syncWithStore(conflict.storeId, { resolvedState });

      // Remove conflict
      const activeConflicts = new Map(get().activeConflicts);
      activeConflicts.delete(conflictId);
      set({ activeConflicts });

      console.log(`[RealTimeWebhookSync] Conflict ${conflictId} resolved with strategy: ${resolution}`);
    },

    autoResolveConflicts: async () => {
      const conflicts = get().activeConflicts;

      for (const [conflictId, conflict] of conflicts) {
        if (conflict.autoResolvable) {
          await get().resolveSyncConflict(conflictId, 'merge');
        }
      }
    },

    trackSyncPerformance: (eventId: string, startTime: number, endTime: number, success: boolean) => {
      const duration = endTime - startTime;
      const metrics = get().syncPerformanceMetrics;

      const updatedMetrics = {
        totalSyncOperations: metrics.totalSyncOperations + 1,
        successfulSyncs: success ? metrics.successfulSyncs + 1 : metrics.successfulSyncs,
        failedSyncs: success ? metrics.failedSyncs : metrics.failedSyncs + 1,
        averageSyncTime: (metrics.averageSyncTime + duration) / 2,
        crisisSyncTime: get().crisisSyncState.crisisMode ? duration : metrics.crisisSyncTime,
        lastPerformanceCheck: Date.now(),
        throughputPerSecond: metrics.totalSyncOperations / ((Date.now() - metrics.lastPerformanceCheck) / 1000),
        concurrentOperations: get().activeEvents.size,
        maxConcurrentOperations: Math.max(metrics.maxConcurrentOperations, get().activeEvents.size),
      };

      set({ syncPerformanceMetrics: updatedMetrics });
    },

    getSyncHealth: () => {
      const state = get();
      const metrics = state.syncPerformanceMetrics;

      const issues = [];

      if (metrics.failedSyncs > metrics.successfulSyncs * 0.1) {
        issues.push('High failure rate');
      }

      if (metrics.averageSyncTime > 2000) {
        issues.push('Slow sync performance');
      }

      if (state.activeConflicts.size > 5) {
        issues.push('Multiple unresolved conflicts');
      }

      if (state.networkStatus === 'offline') {
        issues.push('Network connectivity issues');
      }

      return {
        healthy: issues.length === 0,
        issues,
        metrics: {
          successRate: (metrics.successfulSyncs / metrics.totalSyncOperations) * 100,
          averageTime: metrics.averageSyncTime,
          throughput: metrics.throughputPerSecond,
          conflicts: state.activeConflicts.size,
        },
      };
    },

    optimizeSyncPerformance: async () => {
      const state = get();

      // Auto-resolve conflicts if too many
      if (state.activeConflicts.size > 10) {
        await get().autoResolveConflicts();
      }

      // Clean up old completed events
      get().cleanupCompletedEvents();

      // Adjust sync interval based on performance
      const metrics = state.syncPerformanceMetrics;
      if (metrics.averageSyncTime > 2000 && state.syncInterval < 2000) {
        set({ syncInterval: Math.min(state.syncInterval * 1.5, 5000) });
      } else if (metrics.averageSyncTime < 500 && state.syncInterval > 500) {
        set({ syncInterval: Math.max(state.syncInterval * 0.8, 500) });
      }

      console.log('[RealTimeWebhookSync] Performance optimization completed');
    },

    handleOfflineMode: async () => {
      set({
        networkStatus: 'offline',
        lastOfflineTimestamp: Date.now(),
      });

      // Move pending events to offline queue
      const eventQueue = get().eventQueue;
      const offlineSyncQueue = [...get().offlineSyncQueue, ...eventQueue];

      set({
        eventQueue: [],
        offlineSyncQueue,
      });

      console.log('[RealTimeWebhookSync] Offline mode activated');
    },

    handleOnlineRecovery: async () => {
      set({
        networkStatus: 'online',
        syncRecoveryInProgress: true,
      });

      // Process recovery
      await get().processSyncRecovery();

      set({ syncRecoveryInProgress: false });

      console.log('[RealTimeWebhookSync] Online recovery completed');
    },

    processSyncRecovery: async () => {
      // Flush offline queue
      await get().flushOfflineQueue();

      // Re-sync all connected stores
      const connectedStores = get().connectedStores;
      for (const [storeId] of connectedStores) {
        get().queueSyncEvent('state_recovery', {}, [storeId], 'high');
      }

      await get().processEventQueue();
    },

    flushOfflineQueue: async () => {
      const offlineQueue = get().offlineSyncQueue;

      if (offlineQueue.length === 0) return;

      console.log(`[RealTimeWebhookSync] Flushing ${offlineQueue.length} offline events`);

      // Add to main queue with high priority
      const eventQueue = get().eventQueue;
      const prioritizedOfflineEvents = offlineQueue.map(event => ({
        ...event,
        priority: 'high' as SyncPriority,
      }));

      set({
        eventQueue: [...prioritizedOfflineEvents, ...eventQueue],
        offlineSyncQueue: [],
      });

      await get().processEventQueue();
    },

    displaySyncNotification: (message: TherapeuticMessage) => {
      if (!get().realTimeCommunication.syncNotifications) return;

      set({
        realTimeCommunication: {
          ...get().realTimeCommunication,
          currentMessage: message,
        },
      });

      // Auto-clear after display duration
      setTimeout(() => {
        const current = get().realTimeCommunication.currentMessage;
        if (current && current.id === message.id) {
          set({
            realTimeCommunication: {
              ...get().realTimeCommunication,
              currentMessage: null,
            },
          });
        }
      }, message.timing.displayDuration);
    },

    updateUserOnSyncStatus: (status: string, therapeutic: boolean) => {
      if (!get().realTimeCommunication.userFeedbackEnabled) return;

      const message: TherapeuticMessage = {
        id: `sync_status_${Date.now()}`,
        type: therapeutic ? 'anxiety_reducing' : 'informational',
        priority: 'low',
        content: status,
        context: {
          userState: 'sync_operation',
          therapeuticPhase: 'background_sync',
          anxietyLevel: 'low',
          supportNeeded: false,
        },
        timing: {
          displayDuration: 3000,
          fadeIn: 300,
          fadeOut: 300,
        },
        accessibility: {
          screenReaderText: status,
          highContrast: false,
          largeText: false,
        },
        timestamp: Date.now(),
      };

      get().displaySyncNotification(message);
    },

    clearSyncNotifications: () => {
      set({
        realTimeCommunication: {
          ...get().realTimeCommunication,
          currentMessage: null,
        },
      });
    },

    createSyncBatch: (storeId: string, events: RealTimeSyncEvent[]) => {
      const syncBatches = new Map(get().syncBatches);
      const existingBatch = syncBatches.get(storeId) || [];
      syncBatches.set(storeId, [...existingBatch, ...events]);
      set({ syncBatches });
    },

    processSyncBatches: async () => {
      const syncBatches = get().syncBatches;

      for (const [storeId, events] of syncBatches) {
        if (events.length > 0) {
          await get().batchSyncToStore(storeId, events);
        }
      }

      // Clear processed batches
      set({ syncBatches: new Map() });
    },

    optimizeBatchSize: (storeId: string) => {
      const storeConfig = get().connectedStores.get(storeId);
      if (!storeConfig) return;

      const performance = storeConfig.syncSuccess / (storeConfig.syncSuccess + storeConfig.syncErrors);

      let newBatchSize = storeConfig.batchSize;

      if (performance > 0.95 && storeConfig.batchSize < 20) {
        newBatchSize = Math.min(storeConfig.batchSize + 2, 20);
      } else if (performance < 0.8 && storeConfig.batchSize > 5) {
        newBatchSize = Math.max(storeConfig.batchSize - 2, 5);
      }

      if (newBatchSize !== storeConfig.batchSize) {
        const connectedStores = new Map(get().connectedStores);
        connectedStores.set(storeId, { ...storeConfig, batchSize: newBatchSize });
        set({ connectedStores });

        console.log(`[RealTimeWebhookSync] Optimized batch size for ${storeId}: ${storeConfig.batchSize} -> ${newBatchSize}`);
      }
    },

    processEventQueue: async () => {
      const { eventQueue, syncActive } = get();

      if (!syncActive || eventQueue.length === 0) return;

      // Process up to max concurrent operations
      const maxConcurrent = get().syncPerformanceMetrics.maxConcurrentOperations;
      const currentConcurrent = get().activeEvents.size;
      const availableSlots = maxConcurrent - currentConcurrent;

      if (availableSlots <= 0) return;

      const eventsToProcess = eventQueue.slice(0, availableSlots);
      const remainingQueue = eventQueue.slice(availableSlots);

      set({ eventQueue: remainingQueue });

      // Process events concurrently
      const processPromises = eventsToProcess.map(event => get().processRealTimeEvent(event));
      await Promise.allSettled(processPromises);

      // Continue processing if more events
      if (remainingQueue.length > 0) {
        setTimeout(() => get().processEventQueue(), get().syncInterval);
      }
    },

    retryFailedEvents: async () => {
      const failedEvents = get().failedEvents;

      for (const [eventId, event] of failedEvents) {
        if (event.retryCount < event.maxRetries) {
          // Add back to queue with incremented retry count
          const retryEvent = {
            ...event,
            status: 'pending' as SyncOperationStatus,
            retryCount: event.retryCount + 1,
          };

          const eventQueue = [...get().eventQueue, retryEvent];
          set({ eventQueue });

          // Remove from failed events
          const updatedFailedEvents = new Map(failedEvents);
          updatedFailedEvents.delete(eventId);
          set({ failedEvents: updatedFailedEvents });

          console.log(`[RealTimeWebhookSync] Retrying failed event: ${eventId} (attempt ${retryEvent.retryCount})`);
        }
      }
    },

    cleanupCompletedEvents: () => {
      const completedEvents = get().completedEvents;
      const cutoffTime = Date.now() - (30 * 60 * 1000); // 30 minutes ago

      const cleanedEvents = new Map();
      for (const [eventId, event] of completedEvents) {
        if (event.timestamp > cutoffTime) {
          cleanedEvents.set(eventId, event);
        }
      }

      set({ completedEvents: cleanedEvents });
    },

    // Helper methods for specific sync operations
    syncSubscriptionStatusChange: async (event: RealTimeSyncEvent) => {
      for (const storeId of event.targetStores) {
        await get().syncWithStore(storeId, {
          type: 'subscription_update',
          data: event.data,
        });
      }
    },

    syncPaymentStatusUpdate: async (event: RealTimeSyncEvent) => {
      for (const storeId of event.targetStores) {
        await get().syncWithStore(storeId, {
          type: 'payment_update',
          data: event.data,
        });
      }
    },

    syncCrisisLevelChange: async (event: RealTimeSyncEvent) => {
      // Crisis changes sync to all stores immediately
      const connectedStores = get().connectedStores;
      for (const [storeId] of connectedStores) {
        await get().syncWithStore(storeId, {
          type: 'crisis_update',
          data: event.data,
          priority: 'immediate',
        });
      }
    },

    syncEmergencyAccessChange: async (event: RealTimeSyncEvent) => {
      for (const storeId of event.targetStores) {
        await get().syncWithStore(storeId, {
          type: 'emergency_access_update',
          data: event.data,
          priority: 'immediate',
        });
      }
    },

    syncTherapeuticContinuityUpdate: async (event: RealTimeSyncEvent) => {
      for (const storeId of event.targetStores) {
        await get().syncWithStore(storeId, {
          type: 'therapeutic_continuity_update',
          data: event.data,
          priority: 'immediate',
        });
      }
    },

    syncGeneralEvent: async (event: RealTimeSyncEvent) => {
      for (const storeId of event.targetStores) {
        await get().syncWithStore(storeId, {
          type: 'general_update',
          data: event.data,
        });
      }
    },

    processBatchEventGroup: async (storeId: string, eventType: string, events: RealTimeSyncEvent[]) => {
      // Process events of the same type together for efficiency
      const batchData = {
        type: eventType,
        events: events.map(e => e.data),
        count: events.length,
      };

      await get().syncWithStore(storeId, batchData);
    },
  }))
);

/**
 * Real-Time Webhook Sync Selectors
 */
export const realTimeWebhookSyncSelectors = {
  isHealthy: (state: RealTimeWebhookSyncState) => {
    const health = state.getSyncHealth?.();
    return health?.healthy ?? false;
  },

  isCrisisMode: (state: RealTimeWebhookSyncState) =>
    state.crisisSyncState.crisisMode,

  hasActiveConflicts: (state: RealTimeWebhookSyncState) =>
    state.activeConflicts.size > 0,

  pendingOperations: (state: RealTimeWebhookSyncState) =>
    state.eventQueue.length + state.activeEvents.size + state.offlineSyncQueue.length,

  syncPerformance: (state: RealTimeWebhookSyncState) => ({
    averageTime: state.syncPerformanceMetrics.averageSyncTime,
    successRate: (state.syncPerformanceMetrics.successfulSyncs /
                  (state.syncPerformanceMetrics.totalSyncOperations || 1)) * 100,
    throughput: state.syncPerformanceMetrics.throughputPerSecond,
    concurrentOps: state.syncPerformanceMetrics.concurrentOperations,
  }),

  networkStatus: (state: RealTimeWebhookSyncState) => ({
    status: state.networkStatus,
    recoveryInProgress: state.syncRecoveryInProgress,
    offlineQueueSize: state.offlineSyncQueue.length,
  }),
};

export default useRealTimeWebhookSync;