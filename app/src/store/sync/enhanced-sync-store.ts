/**
 * Enhanced Zustand Sync Store for Being. MBCT App
 *
 * Comprehensive real-time state synchronization with:
 * - Payment-aware subscription tier enforcement
 * - Crisis safety state with emergency override capabilities
 * - Cross-device state coordination with session preservation
 * - Performance-optimized state updates (<500ms sync, <200ms crisis)
 * - Intelligent conflict resolution with therapeutic data priority
 * - Zero-PII compliance with HIPAA-aware state management
 */

import { create } from 'zustand';
import { createJSONStorage, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import { encryptionService } from '../../services/security/EncryptionService';
import { stateSynchronizationService } from '../../services/state/StateSynchronization';
import type { SubscriptionTier, SubscriptionState } from '../../types/subscription';
import type { PaymentState } from '../../types/payment';

/**
 * Sync State Schema with Crisis Safety Integration
 */
export const SyncStateSchema = z.object({
  status: z.enum(['idle', 'syncing', 'synced', 'conflict', 'error', 'crisis_override']),
  lastSyncTime: z.string().optional(), // ISO timestamp
  nextSyncTime: z.string().optional(),
  syncProgress: z.number().min(0).max(1).default(0),
  operationsInProgress: z.number().default(0),

  // Performance metrics
  averageSyncTime: z.number().default(0), // ms
  lastSyncDuration: z.number().default(0), // ms
  syncCount: z.number().default(0),
  errorCount: z.number().default(0),

  // Crisis state
  crisisMode: z.boolean().default(false),
  crisisOverrideActive: z.boolean().default(false),
  crisisDataProtected: z.boolean().default(true),

  // Network state
  isOnline: z.boolean().default(true),
  connectionQuality: z.enum(['excellent', 'good', 'poor', 'offline']).default('good'),
});

export type SyncState = z.infer<typeof SyncStateSchema>;

/**
 * Conflict Resolution State Schema
 */
export const ConflictResolutionStateSchema = z.object({
  activeConflicts: z.array(z.object({
    id: z.string(),
    storeType: z.enum(['user', 'assessment', 'checkin', 'payment', 'crisis']),
    conflictType: z.enum(['version_mismatch', 'data_divergence', 'timestamp_conflict', 'crisis_override']),
    localData: z.any(),
    remoteData: z.any(),
    priority: z.enum(['low', 'medium', 'high', 'crisis']),
    therapeuticImpact: z.enum(['none', 'minimal', 'moderate', 'significant']),
    createdAt: z.string(), // ISO timestamp
    resolvedAt: z.string().optional(),
    resolution: z.enum(['local_wins', 'remote_wins', 'merge', 'user_choice', 'crisis_priority']).optional(),
  })),

  resolutionStrategy: z.enum(['automatic', 'user_guided', 'therapeutic_priority', 'crisis_first']),
  autoResolveEnabled: z.boolean().default(true),
  lastConflictResolved: z.string().optional(), // ISO timestamp
  conflictResolutionTime: z.number().default(0), // ms average
});

export type ConflictResolutionState = z.infer<typeof ConflictResolutionStateSchema>;

/**
 * Cross-Device Sync State Schema
 */
export const CrossDeviceSyncStateSchema = z.object({
  connectedDevices: z.array(z.object({
    deviceId: z.string(),
    deviceName: z.string(),
    deviceType: z.enum(['mobile', 'tablet', 'desktop', 'widget']),
    lastSeen: z.string(), // ISO timestamp
    isActive: z.boolean(),
    syncEnabled: z.boolean(),
    therapeuticSessionActive: z.boolean(),
  })),

  currentDevice: z.object({
    deviceId: z.string(),
    deviceName: z.string(),
    deviceType: z.enum(['mobile', 'tablet', 'desktop', 'widget']),
    isLeader: z.boolean(), // Device coordinating sync
  }),

  sessionHandoff: z.object({
    enabled: z.boolean(),
    activeSession: z.string().optional(), // Session ID
    sessionData: z.any().optional(), // Encrypted session state
    handoffInProgress: z.boolean().default(false),
    lastHandoffTime: z.string().optional(), // ISO timestamp
  }),

  coordinationState: z.enum(['leading', 'following', 'negotiating', 'isolated']),
  lastCoordinationTime: z.string().optional(), // ISO timestamp
});

export type CrossDeviceSyncState = z.infer<typeof CrossDeviceSyncStateSchema>;

/**
 * Crisis Safety State Schema
 */
export const CrisisSafetyStateSchema = z.object({
  crisisDetected: z.boolean().default(false),
  crisisLevel: z.enum(['none', 'mild', 'moderate', 'severe', 'emergency']).default('none'),
  crisisTimestamp: z.string().optional(), // ISO timestamp

  emergencyOverrides: z.object({
    syncDisabled: z.boolean().default(false),
    localDataLocked: z.boolean().default(false),
    emergencyContactsAccessible: z.boolean().default(true),
    crisisDataProtectionEnabled: z.boolean().default(true),
  }),

  emergencyAccess: z.object({
    crisisButtonEnabled: z.boolean().default(true),
    emergencyContactsAvailable: z.boolean().default(true),
    offlineModeForced: z.boolean().default(false),
    therapeuticContinuityMaintained: z.boolean().default(true),
  }),

  responseTime: z.object({
    lastCrisisResponseTime: z.number().default(0), // ms
    averageCrisisResponseTime: z.number().default(0), // ms
    crisisResponseViolations: z.number().default(0), // Count of >200ms responses
  }),

  dataProtection: z.object({
    crisisDataEncrypted: z.boolean().default(true),
    emergencyDataAccessible: z.boolean().default(true),
    syncDataFiltered: z.boolean().default(true), // Remove PII during crisis sync
  }),
});

export type CrisisSafetyState = z.infer<typeof CrisisSafetyStateSchema>;

/**
 * Subscription Sync Context Schema
 */
export const SubscriptionSyncContextSchema = z.object({
  currentTier: z.enum(['free', 'premium', 'family', 'enterprise']),
  subscriptionStatus: z.enum(['active', 'trialing', 'past_due', 'canceled', 'incomplete']),

  tierBasedSync: z.object({
    syncFrequency: z.number(), // ms between syncs
    batchSize: z.number(), // Max operations per sync batch
    priorityLevel: z.enum(['low', 'normal', 'high', 'realtime']),
    conflictResolutionLevel: z.enum(['basic', 'advanced', 'ai_assisted']),
  }),

  featureAccess: z.object({
    realtimeSync: z.boolean(),
    crossDeviceSync: z.boolean(),
    advancedConflictResolution: z.boolean(),
    therapeuticSessionSync: z.boolean(),
    familySharing: z.boolean(),
  }),

  quotas: z.object({
    dailySyncOperations: z.number(),
    usedSyncOperations: z.number(),
    deviceLimit: z.number(),
    connectedDevices: z.number(),
  }),

  paymentStatus: z.object({
    lastPaymentSuccessful: z.boolean(),
    gracePeriodActive: z.boolean(),
    gracePeriodEndsAt: z.string().optional(), // ISO timestamp
    crisisAccessGuaranteed: z.boolean().default(true),
  }),
});

export type SubscriptionSyncContext = z.infer<typeof SubscriptionSyncContextSchema>;

/**
 * Optimistic Update State Schema
 */
export const OptimisticUpdateStateSchema = z.object({
  pendingUpdates: z.array(z.object({
    id: z.string(),
    storeType: z.enum(['user', 'assessment', 'checkin', 'payment', 'crisis']),
    operation: z.enum(['create', 'update', 'delete', 'crisis_update']),
    data: z.any(),
    timestamp: z.string(), // ISO timestamp
    retryCount: z.number().default(0),
    maxRetries: z.number().default(3),
    priority: z.enum(['low', 'normal', 'high', 'crisis']),
    rollbackData: z.any().optional(),
  })),

  rollbackQueue: z.array(z.object({
    updateId: z.string(),
    rollbackReason: z.enum(['conflict', 'error', 'timeout', 'user_request']),
    rollbackData: z.any(),
    timestamp: z.string(), // ISO timestamp
  })),

  updateMetrics: z.object({
    totalUpdates: z.number().default(0),
    successfulUpdates: z.number().default(0),
    failedUpdates: z.number().default(0),
    rollbacksPerformed: z.number().default(0),
    averageUpdateTime: z.number().default(0), // ms
  }),
});

export type OptimisticUpdateState = z.infer<typeof OptimisticUpdateStateSchema>;

/**
 * Performance Monitoring State Schema
 */
export const PerformanceMonitoringStateSchema = z.object({
  realTimeMetrics: z.object({
    syncLatency: z.number().default(0), // ms
    conflictResolutionTime: z.number().default(0), // ms
    crisisResponseTime: z.number().default(0), // ms
    crossDeviceCoordinationTime: z.number().default(0), // ms
  }),

  performanceTargets: z.object({
    maxSyncLatency: z.number().default(500), // ms
    maxCrisisResponseTime: z.number().default(200), // ms
    maxConflictResolutionTime: z.number().default(1000), // ms
    maxCrossDeviceCoordinationTime: z.number().default(300), // ms
  }),

  performanceViolations: z.array(z.object({
    metric: z.enum(['sync_latency', 'crisis_response', 'conflict_resolution', 'cross_device']),
    actual: z.number(), // ms
    target: z.number(), // ms
    timestamp: z.string(), // ISO timestamp
    severity: z.enum(['minor', 'major', 'critical']),
  })),

  memoryUsage: z.object({
    currentUsage: z.number().default(0), // bytes
    maxUsage: z.number().default(0), // bytes
    averageUsage: z.number().default(0), // bytes
    gcCount: z.number().default(0), // garbage collection count
  }),
});

export type PerformanceMonitoringState = z.infer<typeof PerformanceMonitoringStateSchema>;

/**
 * Enhanced Sync Store Interface
 */
export interface EnhancedSyncStore {
  // Core sync state
  syncState: SyncState;
  conflicts: ConflictResolutionState;
  deviceSync: CrossDeviceSyncState;
  crisisSafety: CrisisSafetyState;
  subscriptionContext: SubscriptionSyncContext;
  optimisticUpdates: OptimisticUpdateState;
  performanceMonitoring: PerformanceMonitoringState;

  // Core sync actions
  initializeSync: () => Promise<void>;
  startSync: () => Promise<void>;
  stopSync: () => void;
  forceSync: () => Promise<void>;

  // Real-time sync actions
  enableRealTimeSync: () => Promise<void>;
  disableRealTimeSync: () => void;
  updateSyncFrequency: (frequencyMs: number) => void;

  // Crisis safety actions
  activateCrisisMode: (level: 'mild' | 'moderate' | 'severe' | 'emergency') => Promise<void>;
  deactivateCrisisMode: () => Promise<void>;
  triggerEmergencyOverride: () => Promise<void>;
  validateCrisisResponseTime: () => Promise<boolean>;

  // Conflict resolution actions
  resolveConflict: (conflictId: string, resolution: 'local_wins' | 'remote_wins' | 'merge' | 'user_choice') => Promise<void>;
  setConflictResolutionStrategy: (strategy: 'automatic' | 'user_guided' | 'therapeutic_priority') => void;
  getConflictsByPriority: (priority?: 'low' | 'medium' | 'high' | 'crisis') => any[];

  // Cross-device coordination actions
  registerDevice: (deviceInfo: any) => Promise<void>;
  removeDevice: (deviceId: string) => Promise<void>;
  initiateSessionHandoff: (targetDeviceId: string, sessionData: any) => Promise<void>;
  completeSessionHandoff: (sessionId: string) => Promise<void>;
  promoteToLeader: () => Promise<void>;

  // Optimistic update actions
  applyOptimisticUpdate: (storeType: string, operation: string, data: any, priority?: 'low' | 'normal' | 'high' | 'crisis') => Promise<string>;
  rollbackOptimisticUpdate: (updateId: string) => Promise<void>;
  confirmOptimisticUpdate: (updateId: string) => Promise<void>;
  retryFailedUpdate: (updateId: string) => Promise<void>;

  // Subscription integration actions
  updateSubscriptionContext: (subscriptionState: SubscriptionState, paymentState: PaymentState) => void;
  validateSyncQuotas: () => boolean;
  getSubscriptionBasedSyncConfig: () => any;
  handlePaymentUpdate: (paymentUpdate: any) => Promise<void>;

  // Performance monitoring actions
  recordMetric: (metric: string, value: number) => void;
  getPerformanceReport: () => any;
  checkPerformanceTargets: () => boolean;
  optimizePerformance: () => Promise<void>;

  // State persistence actions
  persistSyncState: () => Promise<void>;
  restoreSyncState: () => Promise<void>;
  clearSyncData: () => Promise<void>;

  // Integration actions
  integrateWithStore: (storeType: 'user' | 'assessment' | 'checkin' | 'payment' | 'crisis', store: any) => void;
  syncStoreState: (storeType: string, stateData: any) => Promise<void>;

  // Network state actions
  updateNetworkState: (isOnline: boolean, quality: 'excellent' | 'good' | 'poor' | 'offline') => void;
  handleOfflineMode: () => Promise<void>;
  handleOnlineReconnection: () => Promise<void>;

  // Internal state management
  _internal: {
    syncIntervals: Map<string, NodeJS.Timeout>;
    subscriptions: Map<string, any>;
    eventHandlers: Map<string, Function>;
    performanceTimers: Map<string, number>;
    storeReferences: Map<string, any>;
  };
}

/**
 * Create Enhanced Sync Store with Crisis Safety and Payment Awareness
 */
export const useEnhancedSyncStore = create<EnhancedSyncStore>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        // Initial state
        syncState: {
          status: 'idle',
          syncProgress: 0,
          operationsInProgress: 0,
          averageSyncTime: 0,
          lastSyncDuration: 0,
          syncCount: 0,
          errorCount: 0,
          crisisMode: false,
          crisisOverrideActive: false,
          crisisDataProtected: true,
          isOnline: true,
          connectionQuality: 'good',
        },

        conflicts: {
          activeConflicts: [],
          resolutionStrategy: 'therapeutic_priority',
          autoResolveEnabled: true,
          conflictResolutionTime: 0,
        },

        deviceSync: {
          connectedDevices: [],
          currentDevice: {
            deviceId: '',
            deviceName: '',
            deviceType: 'mobile',
            isLeader: false,
          },
          sessionHandoff: {
            enabled: true,
            handoffInProgress: false,
          },
          coordinationState: 'isolated',
        },

        crisisSafety: {
          crisisDetected: false,
          crisisLevel: 'none',
          emergencyOverrides: {
            syncDisabled: false,
            localDataLocked: false,
            emergencyContactsAccessible: true,
            crisisDataProtectionEnabled: true,
          },
          emergencyAccess: {
            crisisButtonEnabled: true,
            emergencyContactsAvailable: true,
            offlineModeForced: false,
            therapeuticContinuityMaintained: true,
          },
          responseTime: {
            lastCrisisResponseTime: 0,
            averageCrisisResponseTime: 0,
            crisisResponseViolations: 0,
          },
          dataProtection: {
            crisisDataEncrypted: true,
            emergencyDataAccessible: true,
            syncDataFiltered: true,
          },
        },

        subscriptionContext: {
          currentTier: 'free',
          subscriptionStatus: 'active',
          tierBasedSync: {
            syncFrequency: 30000, // 30 seconds for free tier
            batchSize: 10,
            priorityLevel: 'normal',
            conflictResolutionLevel: 'basic',
          },
          featureAccess: {
            realtimeSync: false,
            crossDeviceSync: false,
            advancedConflictResolution: false,
            therapeuticSessionSync: false,
            familySharing: false,
          },
          quotas: {
            dailySyncOperations: 100,
            usedSyncOperations: 0,
            deviceLimit: 1,
            connectedDevices: 0,
          },
          paymentStatus: {
            lastPaymentSuccessful: true,
            gracePeriodActive: false,
            crisisAccessGuaranteed: true,
          },
        },

        optimisticUpdates: {
          pendingUpdates: [],
          rollbackQueue: [],
          updateMetrics: {
            totalUpdates: 0,
            successfulUpdates: 0,
            failedUpdates: 0,
            rollbacksPerformed: 0,
            averageUpdateTime: 0,
          },
        },

        performanceMonitoring: {
          realTimeMetrics: {
            syncLatency: 0,
            conflictResolutionTime: 0,
            crisisResponseTime: 0,
            crossDeviceCoordinationTime: 0,
          },
          performanceTargets: {
            maxSyncLatency: 500,
            maxCrisisResponseTime: 200,
            maxConflictResolutionTime: 1000,
            maxCrossDeviceCoordinationTime: 300,
          },
          performanceViolations: [],
          memoryUsage: {
            currentUsage: 0,
            maxUsage: 0,
            averageUsage: 0,
            gcCount: 0,
          },
        },

        _internal: {
          syncIntervals: new Map(),
          subscriptions: new Map(),
          eventHandlers: new Map(),
          performanceTimers: new Map(),
          storeReferences: new Map(),
        },

        // Core sync actions
        initializeSync: async () => {
          const startTime = performance.now();

          set((state) => {
            state.syncState.status = 'syncing';
            state._internal.performanceTimers.set('init', startTime);
          });

          try {
            // Initialize state synchronization service
            await stateSynchronizationService.initialize();

            // Set up real-time event handlers
            const state = get();
            state._internal.eventHandlers.set('crisis', state.activateCrisisMode);
            state._internal.eventHandlers.set('payment', state.handlePaymentUpdate);

            // Start performance monitoring
            state.recordMetric('sync_initialization', performance.now() - startTime);

            set((state) => {
              state.syncState.status = 'synced';
              state.syncState.lastSyncTime = new Date().toISOString();
            });

          } catch (error) {
            console.error('Sync initialization failed:', error);
            set((state) => {
              state.syncState.status = 'error';
              state.syncState.errorCount += 1;
            });
          }
        },

        startSync: async () => {
          const state = get();
          const syncConfig = state.getSubscriptionBasedSyncConfig();

          // Validate sync quotas
          if (!state.validateSyncQuotas()) {
            console.warn('Sync quota exceeded, using reduced frequency');
            syncConfig.frequency *= 2; // Reduce frequency
          }

          // Start sync interval based on subscription tier
          const syncInterval = setInterval(async () => {
            await state.forceSync();
          }, syncConfig.frequency);

          set((state) => {
            state._internal.syncIntervals.set('main', syncInterval);
            state.syncState.status = 'syncing';
          });
        },

        stopSync: () => {
          const state = get();

          // Clear all sync intervals
          state._internal.syncIntervals.forEach((interval) => {
            clearInterval(interval);
          });

          set((state) => {
            state._internal.syncIntervals.clear();
            state.syncState.status = 'idle';
          });
        },

        forceSync: async () => {
          const startTime = performance.now();

          set((state) => {
            state.syncState.status = 'syncing';
            state.syncState.operationsInProgress += 1;
            state._internal.performanceTimers.set('force_sync', startTime);
          });

          try {
            const state = get();

            // Crisis mode check - bypass normal sync for emergency response
            if (state.crisisSafety.crisisDetected) {
              await state._handleCrisisSync();
              return;
            }

            // Process pending optimistic updates
            for (const update of state.optimisticUpdates.pendingUpdates) {
              try {
                await stateSynchronizationService.processUpdate(update);
                await state.confirmOptimisticUpdate(update.id);
              } catch (error) {
                await state.rollbackOptimisticUpdate(update.id);
              }
            }

            // Sync with remote state
            const syncResult = await stateSynchronizationService.synchronize();

            // Handle conflicts if any
            if (syncResult.conflicts && syncResult.conflicts.length > 0) {
              set((state) => {
                state.conflicts.activeConflicts.push(...syncResult.conflicts.map(conflict => ({
                  id: `conflict_${Date.now()}_${Math.random()}`,
                  storeType: conflict.storeType,
                  conflictType: conflict.type,
                  localData: conflict.local,
                  remoteData: conflict.remote,
                  priority: conflict.priority || 'medium',
                  therapeuticImpact: conflict.therapeuticImpact || 'minimal',
                  createdAt: new Date().toISOString(),
                })));
              });
            }

            const syncTime = performance.now() - startTime;
            state.recordMetric('sync_latency', syncTime);

            set((state) => {
              state.syncState.status = 'synced';
              state.syncState.lastSyncTime = new Date().toISOString();
              state.syncState.lastSyncDuration = syncTime;
              state.syncState.syncCount += 1;
              state.syncState.operationsInProgress -= 1;
              state.syncState.averageSyncTime =
                (state.syncState.averageSyncTime * (state.syncState.syncCount - 1) + syncTime) /
                state.syncState.syncCount;
            });

          } catch (error) {
            console.error('Force sync failed:', error);
            const syncTime = performance.now() - startTime;

            set((state) => {
              state.syncState.status = 'error';
              state.syncState.errorCount += 1;
              state.syncState.operationsInProgress -= 1;
              state.syncState.lastSyncDuration = syncTime;
            });
          }
        },

        // Crisis safety actions
        activateCrisisMode: async (level) => {
          const startTime = performance.now();

          set((state) => {
            state.crisisSafety.crisisDetected = true;
            state.crisisSafety.crisisLevel = level;
            state.crisisSafety.crisisTimestamp = new Date().toISOString();
            state.syncState.crisisMode = true;
            state._internal.performanceTimers.set('crisis_activation', startTime);
          });

          // Enable emergency overrides based on crisis level
          const emergencyConfig = get()._getCrisisConfiguration(level);

          set((state) => {
            state.crisisSafety.emergencyOverrides = emergencyConfig.overrides;
            state.crisisSafety.emergencyAccess = emergencyConfig.access;
          });

          // Force immediate sync for crisis data
          await get()._handleCrisisSync();

          const responseTime = performance.now() - startTime;
          get().recordMetric('crisis_response_time', responseTime);

          // Validate crisis response time
          if (responseTime > 200) {
            set((state) => {
              state.crisisSafety.responseTime.crisisResponseViolations += 1;
              state.performanceMonitoring.performanceViolations.push({
                metric: 'crisis_response',
                actual: responseTime,
                target: 200,
                timestamp: new Date().toISOString(),
                severity: responseTime > 500 ? 'critical' : 'major',
              });
            });
          }

          set((state) => {
            state.crisisSafety.responseTime.lastCrisisResponseTime = responseTime;
            state.crisisSafety.responseTime.averageCrisisResponseTime =
              (state.crisisSafety.responseTime.averageCrisisResponseTime + responseTime) / 2;
          });
        },

        deactivateCrisisMode: async () => {
          set((state) => {
            state.crisisSafety.crisisDetected = false;
            state.crisisSafety.crisisLevel = 'none';
            state.syncState.crisisMode = false;
            state.crisisSafety.emergencyOverrides.syncDisabled = false;
            state.crisisSafety.emergencyOverrides.localDataLocked = false;
          });

          // Resume normal sync operations
          await get().startSync();
        },

        triggerEmergencyOverride: async () => {
          set((state) => {
            state.syncState.crisisOverrideActive = true;
            state.crisisSafety.emergencyOverrides.syncDisabled = true;
            state.crisisSafety.emergencyOverrides.localDataLocked = true;
            state.crisisSafety.emergencyAccess.offlineModeForced = true;
          });

          // Ensure crisis data is accessible
          await get()._ensureCrisisDataAccess();
        },

        validateCrisisResponseTime: async () => {
          const state = get();
          return state.crisisSafety.responseTime.averageCrisisResponseTime <= 200;
        },

        // Helper methods for crisis management
        _getCrisisConfiguration: (level: string) => {
          switch (level) {
            case 'emergency':
              return {
                overrides: {
                  syncDisabled: true,
                  localDataLocked: false,
                  emergencyContactsAccessible: true,
                  crisisDataProtectionEnabled: true,
                },
                access: {
                  crisisButtonEnabled: true,
                  emergencyContactsAvailable: true,
                  offlineModeForced: true,
                  therapeuticContinuityMaintained: true,
                },
              };
            case 'severe':
              return {
                overrides: {
                  syncDisabled: false,
                  localDataLocked: false,
                  emergencyContactsAccessible: true,
                  crisisDataProtectionEnabled: true,
                },
                access: {
                  crisisButtonEnabled: true,
                  emergencyContactsAvailable: true,
                  offlineModeForced: false,
                  therapeuticContinuityMaintained: true,
                },
              };
            default:
              return {
                overrides: {
                  syncDisabled: false,
                  localDataLocked: false,
                  emergencyContactsAccessible: true,
                  crisisDataProtectionEnabled: true,
                },
                access: {
                  crisisButtonEnabled: true,
                  emergencyContactsAvailable: true,
                  offlineModeForced: false,
                  therapeuticContinuityMaintained: true,
                },
              };
          }
        },

        _handleCrisisSync: async () => {
          // Implement crisis-specific sync logic
          // Priority: Crisis data, emergency contacts, therapeutic continuity
          const crisisData = await stateSynchronizationService.getCrisisData();

          // Filter out PII during crisis sync
          const filteredData = await encryptionService.filterCrisisData(crisisData);

          // Immediate sync for crisis-critical data only
          await stateSynchronizationService.emergencySync(filteredData);
        },

        _ensureCrisisDataAccess: async () => {
          // Ensure critical crisis data is always accessible
          const crisisStores = ['crisis', 'emergency_contacts', 'breathing_exercises'];

          for (const storeType of crisisStores) {
            try {
              await stateSynchronizationService.ensureStoreAccess(storeType);
            } catch (error) {
              console.error(`Failed to ensure access to ${storeType}:`, error);
            }
          }
        },

        // Conflict resolution actions
        resolveConflict: async (conflictId, resolution) => {
          const state = get();
          const conflict = state.conflicts.activeConflicts.find(c => c.id === conflictId);

          if (!conflict) return;

          const startTime = performance.now();

          try {
            let resolvedData;

            switch (resolution) {
              case 'local_wins':
                resolvedData = conflict.localData;
                break;
              case 'remote_wins':
                resolvedData = conflict.remoteData;
                break;
              case 'merge':
                resolvedData = await stateSynchronizationService.mergeData(
                  conflict.localData,
                  conflict.remoteData,
                  { therapeuticPriority: conflict.therapeuticImpact !== 'none' }
                );
                break;
              case 'user_choice':
                // User choice will be handled by UI
                return;
            }

            // Apply resolution
            await stateSynchronizationService.applyResolution(conflict.storeType, resolvedData);

            const resolutionTime = performance.now() - startTime;

            set((state) => {
              // Remove resolved conflict
              state.conflicts.activeConflicts = state.conflicts.activeConflicts.filter(
                c => c.id !== conflictId
              );

              // Update metrics
              state.conflicts.lastConflictResolved = new Date().toISOString();
              state.conflicts.conflictResolutionTime =
                (state.conflicts.conflictResolutionTime + resolutionTime) / 2;
            });

            get().recordMetric('conflict_resolution_time', resolutionTime);

          } catch (error) {
            console.error('Conflict resolution failed:', error);
          }
        },

        setConflictResolutionStrategy: (strategy) => {
          set((state) => {
            state.conflicts.resolutionStrategy = strategy;
          });
        },

        getConflictsByPriority: (priority) => {
          const state = get();
          if (priority) {
            return state.conflicts.activeConflicts.filter(c => c.priority === priority);
          }
          return state.conflicts.activeConflicts.sort((a, b) => {
            const priorityOrder = { crisis: 4, high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          });
        },

        // Cross-device coordination actions
        registerDevice: async (deviceInfo) => {
          set((state) => {
            const existingDevice = state.deviceSync.connectedDevices.find(
              d => d.deviceId === deviceInfo.deviceId
            );

            if (existingDevice) {
              // Update existing device
              Object.assign(existingDevice, deviceInfo, {
                lastSeen: new Date().toISOString(),
                isActive: true,
              });
            } else {
              // Add new device
              state.deviceSync.connectedDevices.push({
                ...deviceInfo,
                lastSeen: new Date().toISOString(),
                isActive: true,
                syncEnabled: true,
                therapeuticSessionActive: false,
              });
            }

            // Update subscription context device count
            state.subscriptionContext.quotas.connectedDevices = state.deviceSync.connectedDevices.length;
          });

          // Check device limits based on subscription
          const state = get();
          if (state.subscriptionContext.quotas.connectedDevices > state.subscriptionContext.quotas.deviceLimit) {
            console.warn('Device limit exceeded for current subscription tier');
            // Could trigger upgrade prompt here
          }
        },

        removeDevice: async (deviceId) => {
          set((state) => {
            state.deviceSync.connectedDevices = state.deviceSync.connectedDevices.filter(
              d => d.deviceId !== deviceId
            );
            state.subscriptionContext.quotas.connectedDevices = state.deviceSync.connectedDevices.length;
          });
        },

        initiateSessionHandoff: async (targetDeviceId, sessionData) => {
          const startTime = performance.now();

          set((state) => {
            state.deviceSync.sessionHandoff.handoffInProgress = true;
            state.deviceSync.sessionHandoff.activeSession = `session_${Date.now()}`;
            state.deviceSync.sessionHandoff.sessionData = sessionData;
          });

          try {
            // Encrypt session data for secure handoff
            const encryptedSessionData = await encryptionService.encrypt(JSON.stringify(sessionData));

            // Send handoff request to target device
            await stateSynchronizationService.requestSessionHandoff(targetDeviceId, encryptedSessionData);

            const handoffTime = performance.now() - startTime;
            get().recordMetric('cross_device_coordination_time', handoffTime);

          } catch (error) {
            console.error('Session handoff failed:', error);
            set((state) => {
              state.deviceSync.sessionHandoff.handoffInProgress = false;
              state.deviceSync.sessionHandoff.activeSession = undefined;
              state.deviceSync.sessionHandoff.sessionData = undefined;
            });
          }
        },

        completeSessionHandoff: async (sessionId) => {
          set((state) => {
            state.deviceSync.sessionHandoff.handoffInProgress = false;
            state.deviceSync.sessionHandoff.lastHandoffTime = new Date().toISOString();
            state.deviceSync.sessionHandoff.activeSession = undefined;
            state.deviceSync.sessionHandoff.sessionData = undefined;
          });
        },

        promoteToLeader: async () => {
          set((state) => {
            state.deviceSync.currentDevice.isLeader = true;
            state.deviceSync.coordinationState = 'leading';
            state.deviceSync.lastCoordinationTime = new Date().toISOString();
          });

          // Start leadership responsibilities
          await get().startSync();
        },

        // Optimistic update actions
        applyOptimisticUpdate: async (storeType, operation, data, priority = 'normal') => {
          const updateId = `update_${Date.now()}_${Math.random()}`;
          const timestamp = new Date().toISOString();

          // Store rollback data for potential rollback
          const rollbackData = await get()._getStoreCurrentState(storeType);

          set((state) => {
            state.optimisticUpdates.pendingUpdates.push({
              id: updateId,
              storeType,
              operation,
              data,
              timestamp,
              retryCount: 0,
              maxRetries: 3,
              priority,
              rollbackData,
            });

            state.optimisticUpdates.updateMetrics.totalUpdates += 1;
          });

          // Apply update locally immediately
          await get()._applyLocalUpdate(storeType, operation, data);

          return updateId;
        },

        rollbackOptimisticUpdate: async (updateId) => {
          const state = get();
          const update = state.optimisticUpdates.pendingUpdates.find(u => u.id === updateId);

          if (!update) return;

          // Restore previous state
          if (update.rollbackData) {
            await get()._applyLocalUpdate(update.storeType, 'restore', update.rollbackData);
          }

          set((state) => {
            // Remove from pending updates
            state.optimisticUpdates.pendingUpdates = state.optimisticUpdates.pendingUpdates.filter(
              u => u.id !== updateId
            );

            // Add to rollback queue for tracking
            state.optimisticUpdates.rollbackQueue.push({
              updateId,
              rollbackReason: 'error',
              rollbackData: update.rollbackData,
              timestamp: new Date().toISOString(),
            });

            state.optimisticUpdates.updateMetrics.rollbacksPerformed += 1;
          });
        },

        confirmOptimisticUpdate: async (updateId) => {
          set((state) => {
            state.optimisticUpdates.pendingUpdates = state.optimisticUpdates.pendingUpdates.filter(
              u => u.id !== updateId
            );
            state.optimisticUpdates.updateMetrics.successfulUpdates += 1;
          });
        },

        retryFailedUpdate: async (updateId) => {
          const state = get();
          const update = state.optimisticUpdates.pendingUpdates.find(u => u.id === updateId);

          if (!update || update.retryCount >= update.maxRetries) {
            await get().rollbackOptimisticUpdate(updateId);
            return;
          }

          set((state) => {
            const updateIndex = state.optimisticUpdates.pendingUpdates.findIndex(u => u.id === updateId);
            if (updateIndex !== -1) {
              state.optimisticUpdates.pendingUpdates[updateIndex].retryCount += 1;
            }
          });

          // Retry the update
          try {
            await stateSynchronizationService.processUpdate(update);
            await get().confirmOptimisticUpdate(updateId);
          } catch (error) {
            // Will be retried again or rolled back on next attempt
            console.error(`Retry ${update.retryCount} failed for update ${updateId}:`, error);
          }
        },

        // Subscription integration actions
        updateSubscriptionContext: (subscriptionState, paymentState) => {
          set((state) => {
            // Update subscription tier and status
            state.subscriptionContext.currentTier = subscriptionState.tier;
            state.subscriptionContext.subscriptionStatus = subscriptionState.status;

            // Update payment status
            state.subscriptionContext.paymentStatus.lastPaymentSuccessful =
              paymentState.lastPaymentStatus === 'success';
            state.subscriptionContext.paymentStatus.gracePeriodActive =
              paymentState.gracePeriod?.active || false;
            state.subscriptionContext.paymentStatus.gracePeriodEndsAt =
              paymentState.gracePeriod?.endsAt;

            // Update tier-based sync configuration
            const tierConfig = state._getTierBasedSyncConfig(subscriptionState.tier);
            state.subscriptionContext.tierBasedSync = tierConfig.syncConfig;
            state.subscriptionContext.featureAccess = tierConfig.features;
            state.subscriptionContext.quotas = { ...state.subscriptionContext.quotas, ...tierConfig.quotas };
          });

          // Restart sync with new configuration
          get().stopSync();
          get().startSync();
        },

        validateSyncQuotas: () => {
          const state = get();
          const quotas = state.subscriptionContext.quotas;

          return quotas.usedSyncOperations < quotas.dailySyncOperations &&
                 quotas.connectedDevices <= quotas.deviceLimit;
        },

        getSubscriptionBasedSyncConfig: () => {
          const state = get();
          return {
            frequency: state.subscriptionContext.tierBasedSync.syncFrequency,
            batchSize: state.subscriptionContext.tierBasedSync.batchSize,
            priority: state.subscriptionContext.tierBasedSync.priorityLevel,
            conflictResolution: state.subscriptionContext.tierBasedSync.conflictResolutionLevel,
            features: state.subscriptionContext.featureAccess,
          };
        },

        handlePaymentUpdate: async (paymentUpdate) => {
          // Handle payment status changes that affect sync capabilities
          if (paymentUpdate.status === 'failed' && !paymentUpdate.gracePeriod) {
            // Downgrade sync capabilities
            set((state) => {
              state.subscriptionContext.tierBasedSync.syncFrequency *= 2; // Reduce frequency
              state.subscriptionContext.tierBasedSync.batchSize = Math.max(1, Math.floor(state.subscriptionContext.tierBasedSync.batchSize / 2));
              state.subscriptionContext.featureAccess.realtimeSync = false;
            });
          } else if (paymentUpdate.status === 'success') {
            // Restore full sync capabilities
            const state = get();
            const tierConfig = state._getTierBasedSyncConfig(state.subscriptionContext.currentTier);

            set((state) => {
              state.subscriptionContext.tierBasedSync = tierConfig.syncConfig;
              state.subscriptionContext.featureAccess = tierConfig.features;
            });
          }
        },

        _getTierBasedSyncConfig: (tier: SubscriptionTier) => {
          switch (tier) {
            case 'enterprise':
              return {
                syncConfig: {
                  syncFrequency: 5000, // 5 seconds
                  batchSize: 100,
                  priorityLevel: 'realtime' as const,
                  conflictResolutionLevel: 'ai_assisted' as const,
                },
                features: {
                  realtimeSync: true,
                  crossDeviceSync: true,
                  advancedConflictResolution: true,
                  therapeuticSessionSync: true,
                  familySharing: true,
                },
                quotas: {
                  dailySyncOperations: 10000,
                  deviceLimit: 50,
                },
              };
            case 'family':
              return {
                syncConfig: {
                  syncFrequency: 10000, // 10 seconds
                  batchSize: 50,
                  priorityLevel: 'high' as const,
                  conflictResolutionLevel: 'advanced' as const,
                },
                features: {
                  realtimeSync: true,
                  crossDeviceSync: true,
                  advancedConflictResolution: true,
                  therapeuticSessionSync: true,
                  familySharing: true,
                },
                quotas: {
                  dailySyncOperations: 5000,
                  deviceLimit: 10,
                },
              };
            case 'premium':
              return {
                syncConfig: {
                  syncFrequency: 15000, // 15 seconds
                  batchSize: 25,
                  priorityLevel: 'high' as const,
                  conflictResolutionLevel: 'advanced' as const,
                },
                features: {
                  realtimeSync: true,
                  crossDeviceSync: true,
                  advancedConflictResolution: true,
                  therapeuticSessionSync: false,
                  familySharing: false,
                },
                quotas: {
                  dailySyncOperations: 2000,
                  deviceLimit: 5,
                },
              };
            case 'free':
            default:
              return {
                syncConfig: {
                  syncFrequency: 30000, // 30 seconds
                  batchSize: 10,
                  priorityLevel: 'normal' as const,
                  conflictResolutionLevel: 'basic' as const,
                },
                features: {
                  realtimeSync: false,
                  crossDeviceSync: false,
                  advancedConflictResolution: false,
                  therapeuticSessionSync: false,
                  familySharing: false,
                },
                quotas: {
                  dailySyncOperations: 100,
                  deviceLimit: 1,
                },
              };
          }
        },

        // Performance monitoring actions
        recordMetric: (metric, value) => {
          set((state) => {
            switch (metric) {
              case 'sync_latency':
                state.performanceMonitoring.realTimeMetrics.syncLatency = value;
                break;
              case 'crisis_response_time':
                state.performanceMonitoring.realTimeMetrics.crisisResponseTime = value;
                break;
              case 'conflict_resolution_time':
                state.performanceMonitoring.realTimeMetrics.conflictResolutionTime = value;
                break;
              case 'cross_device_coordination_time':
                state.performanceMonitoring.realTimeMetrics.crossDeviceCoordinationTime = value;
                break;
            }

            // Check performance targets
            const targets = state.performanceMonitoring.performanceTargets;
            const violations = [];

            if (metric === 'sync_latency' && value > targets.maxSyncLatency) {
              violations.push({
                metric: 'sync_latency',
                actual: value,
                target: targets.maxSyncLatency,
                timestamp: new Date().toISOString(),
                severity: value > targets.maxSyncLatency * 2 ? 'critical' : 'major',
              });
            }

            if (metric === 'crisis_response_time' && value > targets.maxCrisisResponseTime) {
              violations.push({
                metric: 'crisis_response',
                actual: value,
                target: targets.maxCrisisResponseTime,
                timestamp: new Date().toISOString(),
                severity: value > targets.maxCrisisResponseTime * 2 ? 'critical' : 'major',
              });
            }

            state.performanceMonitoring.performanceViolations.push(...violations);

            // Keep only recent violations (last 24 hours)
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            state.performanceMonitoring.performanceViolations =
              state.performanceMonitoring.performanceViolations.filter(
                v => v.timestamp > oneDayAgo
              );
          });
        },

        getPerformanceReport: () => {
          const state = get();
          return {
            currentMetrics: state.performanceMonitoring.realTimeMetrics,
            targets: state.performanceMonitoring.performanceTargets,
            recentViolations: state.performanceMonitoring.performanceViolations.slice(-10),
            violationSummary: {
              total: state.performanceMonitoring.performanceViolations.length,
              critical: state.performanceMonitoring.performanceViolations.filter(v => v.severity === 'critical').length,
              major: state.performanceMonitoring.performanceViolations.filter(v => v.severity === 'major').length,
              minor: state.performanceMonitoring.performanceViolations.filter(v => v.severity === 'minor').length,
            },
            memoryUsage: state.performanceMonitoring.memoryUsage,
          };
        },

        checkPerformanceTargets: () => {
          const state = get();
          const metrics = state.performanceMonitoring.realTimeMetrics;
          const targets = state.performanceMonitoring.performanceTargets;

          return (
            metrics.syncLatency <= targets.maxSyncLatency &&
            metrics.crisisResponseTime <= targets.maxCrisisResponseTime &&
            metrics.conflictResolutionTime <= targets.maxConflictResolutionTime &&
            metrics.crossDeviceCoordinationTime <= targets.maxCrossDeviceCoordinationTime
          );
        },

        optimizePerformance: async () => {
          const state = get();

          // Analyze recent performance violations
          const recentViolations = state.performanceMonitoring.performanceViolations.slice(-20);
          const violationCounts = recentViolations.reduce((acc, v) => {
            acc[v.metric] = (acc[v.metric] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          // Apply optimizations based on violation patterns
          if (violationCounts.sync_latency > 5) {
            // Increase sync frequency to reduce batch size
            set((state) => {
              state.subscriptionContext.tierBasedSync.syncFrequency = Math.min(
                state.subscriptionContext.tierBasedSync.syncFrequency * 1.5,
                60000
              );
              state.subscriptionContext.tierBasedSync.batchSize = Math.max(
                Math.floor(state.subscriptionContext.tierBasedSync.batchSize * 0.8),
                1
              );
            });
          }

          if (violationCounts.crisis_response > 2) {
            // Optimize crisis response path
            set((state) => {
              state.crisisSafety.emergencyOverrides.syncDisabled = true;
              state.crisisSafety.emergencyAccess.offlineModeForced = true;
            });
          }

          // Clear old performance data to free memory
          set((state) => {
            const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            state.performanceMonitoring.performanceViolations =
              state.performanceMonitoring.performanceViolations.filter(
                v => v.timestamp > oneWeekAgo
              );
          });

          // Trigger garbage collection hint
          if (global.gc) {
            global.gc();
            set((state) => {
              state.performanceMonitoring.memoryUsage.gcCount += 1;
            });
          }
        },

        // State persistence actions
        persistSyncState: async () => {
          const state = get();
          const persistData = {
            syncState: state.syncState,
            subscriptionContext: state.subscriptionContext,
            deviceSync: state.deviceSync,
            crisisSafety: state.crisisSafety,
          };

          // Encrypt sensitive data before storage
          const encryptedData = await encryptionService.encrypt(JSON.stringify(persistData));
          await AsyncStorage.setItem('being_enhanced_sync_state', encryptedData);
        },

        restoreSyncState: async () => {
          try {
            const encryptedData = await AsyncStorage.getItem('being_enhanced_sync_state');
            if (encryptedData) {
              const decryptedData = await encryptionService.decrypt(encryptedData);
              const persistData = JSON.parse(decryptedData);

              set((state) => {
                Object.assign(state.syncState, persistData.syncState);
                Object.assign(state.subscriptionContext, persistData.subscriptionContext);
                Object.assign(state.deviceSync, persistData.deviceSync);
                Object.assign(state.crisisSafety, persistData.crisisSafety);
              });
            }
          } catch (error) {
            console.error('Failed to restore sync state:', error);
          }
        },

        clearSyncData: async () => {
          await AsyncStorage.removeItem('being_enhanced_sync_state');

          set((state) => {
            // Reset to initial state
            Object.assign(state, {
              syncState: {
                status: 'idle',
                syncProgress: 0,
                operationsInProgress: 0,
                averageSyncTime: 0,
                lastSyncDuration: 0,
                syncCount: 0,
                errorCount: 0,
                crisisMode: false,
                crisisOverrideActive: false,
                crisisDataProtected: true,
                isOnline: true,
                connectionQuality: 'good',
              },
              conflicts: {
                activeConflicts: [],
                resolutionStrategy: 'therapeutic_priority',
                autoResolveEnabled: true,
                conflictResolutionTime: 0,
              },
              optimisticUpdates: {
                pendingUpdates: [],
                rollbackQueue: [],
                updateMetrics: {
                  totalUpdates: 0,
                  successfulUpdates: 0,
                  failedUpdates: 0,
                  rollbacksPerformed: 0,
                  averageUpdateTime: 0,
                },
              },
            });
          });
        },

        // Integration actions
        integrateWithStore: (storeType, store) => {
          set((state) => {
            state._internal.storeReferences.set(storeType, store);
          });

          // Set up sync hooks for the store
          if (storeType === 'crisis') {
            store.subscribe((state: any) => {
              if (state.crisisDetected) {
                get().activateCrisisMode(state.crisisLevel);
              }
            });
          }

          if (storeType === 'payment') {
            store.subscribe((state: any) => {
              get().handlePaymentUpdate(state);
            });
          }
        },

        syncStoreState: async (storeType, stateData) => {
          // Apply optimistic update for store state change
          const updateId = await get().applyOptimisticUpdate(
            storeType,
            'update',
            stateData,
            storeType === 'crisis' ? 'crisis' : 'normal'
          );

          try {
            // Sync with remote
            await stateSynchronizationService.syncStoreState(storeType, stateData);
            await get().confirmOptimisticUpdate(updateId);
          } catch (error) {
            await get().rollbackOptimisticUpdate(updateId);
            throw error;
          }
        },

        // Network state actions
        updateNetworkState: (isOnline, quality) => {
          set((state) => {
            state.syncState.isOnline = isOnline;
            state.syncState.connectionQuality = quality;
          });

          if (!isOnline) {
            get().handleOfflineMode();
          } else {
            get().handleOnlineReconnection();
          }
        },

        handleOfflineMode: async () => {
          // Stop sync operations
          get().stopSync();

          set((state) => {
            state.syncState.status = 'error';
            // Enable offline mode optimizations
            state.crisisSafety.emergencyAccess.offlineModeForced = true;
          });

          // Ensure crisis data is still accessible
          await get()._ensureCrisisDataAccess();
        },

        handleOnlineReconnection: async () => {
          set((state) => {
            state.crisisSafety.emergencyAccess.offlineModeForced = false;
          });

          // Resume sync operations
          await get().startSync();

          // Force sync to catch up
          await get().forceSync();
        },

        // Helper methods
        _getStoreCurrentState: async (storeType: string) => {
          const store = get()._internal.storeReferences.get(storeType);
          return store ? store.getState() : null;
        },

        _applyLocalUpdate: async (storeType: string, operation: string, data: any) => {
          const store = get()._internal.storeReferences.get(storeType);
          if (store && store.setState) {
            if (operation === 'restore') {
              store.setState(data);
            } else {
              // Apply update based on operation type
              store.setState((state: any) => ({
                ...state,
                ...data,
              }));
            }
          }
        },

        // Real-time sync actions
        enableRealTimeSync: async () => {
          const state = get();

          // Check if subscription tier supports real-time sync
          if (!state.subscriptionContext.featureAccess.realtimeSync) {
            throw new Error('Real-time sync not available for current subscription tier');
          }

          // Set up real-time sync interval
          const realtimeInterval = setInterval(async () => {
            await state.forceSync();
          }, 5000); // 5-second intervals for real-time

          set((state) => {
            state._internal.syncIntervals.set('realtime', realtimeInterval);
          });
        },

        disableRealTimeSync: () => {
          const state = get();
          const realtimeInterval = state._internal.syncIntervals.get('realtime');

          if (realtimeInterval) {
            clearInterval(realtimeInterval);
            set((state) => {
              state._internal.syncIntervals.delete('realtime');
            });
          }
        },

        updateSyncFrequency: (frequencyMs) => {
          set((state) => {
            state.subscriptionContext.tierBasedSync.syncFrequency = frequencyMs;
          });

          // Restart sync with new frequency
          get().stopSync();
          get().startSync();
        },
      })),
      {
        name: 'being-enhanced-sync-store',
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          syncState: state.syncState,
          subscriptionContext: state.subscriptionContext,
          deviceSync: state.deviceSync,
          crisisSafety: state.crisisSafety,
        }),
      }
    )
  )
);

// Enhanced Sync Store Selectors
export const enhancedSyncSelectors = {
  // Sync state selectors
  getSyncStatus: (state: EnhancedSyncStore) => state.syncState.status,
  getSyncProgress: (state: EnhancedSyncStore) => state.syncState.syncProgress,
  isOnline: (state: EnhancedSyncStore) => state.syncState.isOnline,
  getConnectionQuality: (state: EnhancedSyncStore) => state.syncState.connectionQuality,

  // Crisis state selectors
  isCrisisMode: (state: EnhancedSyncStore) => state.crisisSafety.crisisDetected,
  getCrisisLevel: (state: EnhancedSyncStore) => state.crisisSafety.crisisLevel,
  isCrisisOverrideActive: (state: EnhancedSyncStore) => state.syncState.crisisOverrideActive,

  // Conflict selectors
  getActiveConflicts: (state: EnhancedSyncStore) => state.conflicts.activeConflicts,
  getCriticalConflicts: (state: EnhancedSyncStore) =>
    state.conflicts.activeConflicts.filter(c => c.priority === 'crisis' || c.priority === 'high'),

  // Performance selectors
  getPerformanceMetrics: (state: EnhancedSyncStore) => state.performanceMonitoring.realTimeMetrics,
  hasPerformanceViolations: (state: EnhancedSyncStore) =>
    state.performanceMonitoring.performanceViolations.length > 0,

  // Subscription selectors
  getCurrentTier: (state: EnhancedSyncStore) => state.subscriptionContext.currentTier,
  hasRealtimeSync: (state: EnhancedSyncStore) => state.subscriptionContext.featureAccess.realtimeSync,
  hasCrossDeviceSync: (state: EnhancedSyncStore) => state.subscriptionContext.featureAccess.crossDeviceSync,
  getSyncQuotaUsage: (state: EnhancedSyncStore) => ({
    used: state.subscriptionContext.quotas.usedSyncOperations,
    total: state.subscriptionContext.quotas.dailySyncOperations,
    percentage: (state.subscriptionContext.quotas.usedSyncOperations /
                state.subscriptionContext.quotas.dailySyncOperations) * 100,
  }),

  // Device sync selectors
  getConnectedDevices: (state: EnhancedSyncStore) => state.deviceSync.connectedDevices,
  isDeviceLeader: (state: EnhancedSyncStore) => state.deviceSync.currentDevice.isLeader,
  isSessionHandoffInProgress: (state: EnhancedSyncStore) => state.deviceSync.sessionHandoff.handoffInProgress,

  // Optimistic update selectors
  getPendingUpdates: (state: EnhancedSyncStore) => state.optimisticUpdates.pendingUpdates,
  getPendingUpdatesByPriority: (state: EnhancedSyncStore, priority?: string) =>
    priority
      ? state.optimisticUpdates.pendingUpdates.filter(u => u.priority === priority)
      : state.optimisticUpdates.pendingUpdates.sort((a, b) => {
          const priorityOrder = { crisis: 4, high: 3, normal: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }),
};

// Enhanced Sync Store Hooks
export const useEnhancedSync = () => {
  const store = useEnhancedSyncStore();

  return {
    // State
    syncState: store.syncState,
    conflicts: store.conflicts,
    deviceSync: store.deviceSync,
    crisisSafety: store.crisisSafety,
    subscriptionContext: store.subscriptionContext,
    performanceMonitoring: store.performanceMonitoring,

    // Actions
    initializeSync: store.initializeSync,
    startSync: store.startSync,
    stopSync: store.stopSync,
    forceSync: store.forceSync,

    // Crisis actions
    activateCrisisMode: store.activateCrisisMode,
    deactivateCrisisMode: store.deactivateCrisisMode,
    triggerEmergencyOverride: store.triggerEmergencyOverride,

    // Performance
    recordMetric: store.recordMetric,
    getPerformanceReport: store.getPerformanceReport,
    checkPerformanceTargets: store.checkPerformanceTargets,
    optimizePerformance: store.optimizePerformance,

    // Selectors
    ...enhancedSyncSelectors,
  };
};

// Crisis-Safe Sync Hook
export const useCrisisSafeSync = () => {
  const {
    crisisSafety,
    activateCrisisMode,
    deactivateCrisisMode,
    triggerEmergencyOverride,
    isCrisisMode,
    getCrisisLevel,
    isCrisisOverrideActive,
  } = useEnhancedSync();

  return {
    crisisSafety,
    isCrisisMode: isCrisisMode(useEnhancedSyncStore.getState()),
    crisisLevel: getCrisisLevel(useEnhancedSyncStore.getState()),
    isEmergencyOverrideActive: isCrisisOverrideActive(useEnhancedSyncStore.getState()),

    activateCrisis: activateCrisisMode,
    deactivateCrisis: deactivateCrisisMode,
    triggerEmergencyOverride,

    validateCrisisResponseTime: useEnhancedSyncStore.getState().validateCrisisResponseTime,
  };
};

// Payment-Aware Sync Hook
export const usePaymentAwareSync = () => {
  const {
    subscriptionContext,
    updateSubscriptionContext,
    handlePaymentUpdate,
    getCurrentTier,
    hasRealtimeSync,
    hasCrossDeviceSync,
    getSyncQuotaUsage,
  } = useEnhancedSync();

  return {
    subscriptionContext,
    currentTier: getCurrentTier(useEnhancedSyncStore.getState()),
    hasRealtimeSync: hasRealtimeSync(useEnhancedSyncStore.getState()),
    hasCrossDeviceSync: hasCrossDeviceSync(useEnhancedSyncStore.getState()),
    quotaUsage: getSyncQuotaUsage(useEnhancedSyncStore.getState()),

    updateSubscription: updateSubscriptionContext,
    handlePaymentUpdate,
    validateQuotas: useEnhancedSyncStore.getState().validateSyncQuotas,
    getSyncConfig: useEnhancedSyncStore.getState().getSubscriptionBasedSyncConfig,
  };
};

// Performance Monitoring Hook
export const useSyncPerformance = () => {
  const {
    performanceMonitoring,
    recordMetric,
    getPerformanceReport,
    checkPerformanceTargets,
    optimizePerformance,
    getPerformanceMetrics,
    hasPerformanceViolations,
  } = useEnhancedSync();

  return {
    metrics: getPerformanceMetrics(useEnhancedSyncStore.getState()),
    hasViolations: hasPerformanceViolations(useEnhancedSyncStore.getState()),

    recordMetric,
    getReport: getPerformanceReport,
    checkTargets: checkPerformanceTargets,
    optimize: optimizePerformance,

    // Performance thresholds
    THRESHOLDS: {
      SYNC_LATENCY: 500,
      CRISIS_RESPONSE: 200,
      CONFLICT_RESOLUTION: 1000,
      CROSS_DEVICE_COORDINATION: 300,
    },
  };
};

export default useEnhancedSyncStore;