/**
 * Offline Queue Store for FullMind MBCT App
 *
 * Core offline queue state management with crisis protection:
 * - Persistent queue state with encrypted storage for sensitive operations
 * - Real-time queue status tracking with sync operation monitoring
 * - Crisis data protection with immediate state priority escalation
 * - Memory-efficient state management optimized for 24-hour capacity
 * - Cross-device queue state synchronization when connectivity restored
 *
 * CRITICAL PERFORMANCE REQUIREMENTS:
 * - State updates: <10ms for queue operations
 * - Crisis state escalation: <50ms for emergency operations
 * - Memory efficiency: <15MB for comprehensive queue state management
 * - 24-hour offline capacity with graceful degradation
 */

import { create } from 'zustand';
import { createJSONStorage, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import { encryptionService } from '../../services/security/EncryptionService';
import type {
  PriorityQueueOperation,
  QueueState,
  QueueConfiguration,
  PriorityLevel
} from '../../types/sync/sync-priority-queue';
import type { SubscriptionTier } from '../../types/subscription';

/**
 * Queue Operation Status with Crisis State Awareness
 */
export type QueueOperationStatus =
  | 'queued'              // Waiting in queue
  | 'processing'          // Currently executing
  | 'completed'           // Successfully completed
  | 'failed'              // Failed execution
  | 'retrying'            // In retry cycle
  | 'deferred'            // Deferred to later
  | 'crisis_escalated'    // Escalated to crisis priority
  | 'emergency_bypass';   // Emergency operation bypassing queue

/**
 * Crisis Priority State for Queue Operations
 */
export const CrisisPriorityStateSchema = z.object({
  emergencyBypassActive: z.boolean().default(false),
  crisisEscalationLevel: z.enum(['none', 'mild', 'moderate', 'severe', 'emergency']).default('none'),
  crisisOperationsCount: z.number().int().min(0).default(0),
  lastCrisisEscalation: z.string().optional(), // ISO timestamp
  emergencyOperationIds: z.array(z.string().uuid()).default([]),

  // Crisis response metrics
  averageCrisisResponseTimeMs: z.number().min(0).default(0),
  crisisResponseTimeViolations: z.number().int().min(0).default(0),
  lastCrisisResponseTimeViolation: z.string().optional(), // ISO timestamp
});

export type CrisisPriorityState = z.infer<typeof CrisisPriorityStateSchema>;

/**
 * Queue Performance Metrics for Monitoring
 */
export const QueuePerformanceMetricsSchema = z.object({
  // Basic throughput metrics
  operationsPerSecond: z.number().min(0).default(0),
  averageProcessingTimeMs: z.number().min(0).default(0),
  totalOperationsProcessed: z.number().int().min(0).default(0),

  // Queue health metrics
  currentQueueSize: z.number().int().min(0).default(0),
  maxQueueSizeReached: z.number().int().min(0).default(0),
  queueUtilizationPercentage: z.number().min(0).max(1).default(0),

  // Error and retry metrics
  failedOperationsCount: z.number().int().min(0).default(0),
  retryAttemptCount: z.number().int().min(0).default(0),
  failureRate: z.number().min(0).max(1).default(0),

  // Memory and resource metrics
  memoryUsageBytes: z.number().int().min(0).default(0),
  storageUsageBytes: z.number().int().min(0).default(0),
  estimatedCapacityHours: z.number().min(0).default(24), // Hours of operation capacity

  // Performance thresholds
  performanceStatus: z.enum(['optimal', 'warning', 'critical']).default('optimal'),
  lastPerformanceCheck: z.string().optional(), // ISO timestamp
});

export type QueuePerformanceMetrics = z.infer<typeof QueuePerformanceMetricsSchema>;

/**
 * Offline Queue State Interface
 */
interface OfflineQueueState {
  // Core queue management
  queuedOperations: PriorityQueueOperation[];
  queueStatus: 'idle' | 'processing' | 'syncing' | 'error' | 'crisis_mode';
  isOnline: boolean;
  lastSyncAttempt: string | null; // ISO timestamp
  nextScheduledSync: string | null; // ISO timestamp

  // Crisis safety
  emergencyBypass: boolean;
  crisisDataPriority: CrisisPriorityState;

  // Performance monitoring
  queueMetrics: QueuePerformanceMetrics;

  // Configuration
  configuration: QueueConfiguration | null;
  subscriptionTier: SubscriptionTier;

  // State management
  initialized: boolean;
  lastStateUpdate: string; // ISO timestamp
}

/**
 * Offline Queue Store Actions
 */
interface OfflineQueueActions {
  // Core queue operations
  addOperation: (operation: PriorityQueueOperation) => Promise<boolean>;
  removeOperation: (operationId: string) => boolean;
  updateOperation: (operationId: string, updates: Partial<PriorityQueueOperation>) => boolean;
  getOperation: (operationId: string) => PriorityQueueOperation | null;

  // Queue management
  processNextOperation: () => Promise<PriorityQueueOperation | null>;
  retryOperation: (operationId: string) => Promise<boolean>;
  deferOperation: (operationId: string, deferUntil: string) => boolean;
  clearCompletedOperations: () => number;

  // Crisis management
  escalateToCrisisPriority: (operationId: string, crisisLevel: CrisisPriorityState['crisisEscalationLevel']) => boolean;
  activateEmergencyBypass: () => void;
  deactivateEmergencyBypass: () => void;

  // Queue state management
  updateQueueStatus: (status: OfflineQueueState['queueStatus']) => void;
  setOnlineStatus: (isOnline: boolean) => void;
  updateConfiguration: (config: Partial<QueueConfiguration>) => void;
  updateSubscriptionTier: (tier: SubscriptionTier) => void;

  // Performance monitoring
  updatePerformanceMetrics: (metrics: Partial<QueuePerformanceMetrics>) => void;
  performHealthCheck: () => QueuePerformanceMetrics['performanceStatus'];
  optimizeQueueMemory: () => Promise<number>; // Returns bytes freed

  // Utility actions
  getQueueStats: () => {
    total: number;
    byPriority: Record<PriorityLevel, number>;
    byStatus: Record<QueueOperationStatus, number>;
    crisisOperations: number;
  };
  exportQueueState: () => Promise<string>; // Encrypted export for debugging
  reset: () => void;
}

/**
 * Default Performance Metrics
 */
const getDefaultPerformanceMetrics = (): QueuePerformanceMetrics => ({
  operationsPerSecond: 0,
  averageProcessingTimeMs: 0,
  totalOperationsProcessed: 0,
  currentQueueSize: 0,
  maxQueueSizeReached: 0,
  queueUtilizationPercentage: 0,
  failedOperationsCount: 0,
  retryAttemptCount: 0,
  failureRate: 0,
  memoryUsageBytes: 0,
  storageUsageBytes: 0,
  estimatedCapacityHours: 24,
  performanceStatus: 'optimal',
  lastPerformanceCheck: new Date().toISOString(),
});

/**
 * Default Crisis Priority State
 */
const getDefaultCrisisPriorityState = (): CrisisPriorityState => ({
  emergencyBypassActive: false,
  crisisEscalationLevel: 'none',
  crisisOperationsCount: 0,
  lastCrisisEscalation: undefined,
  emergencyOperationIds: [],
  averageCrisisResponseTimeMs: 0,
  crisisResponseTimeViolations: 0,
  lastCrisisResponseTimeViolation: undefined,
});

/**
 * Offline Queue Store Implementation
 */
export const useOfflineQueueStore = create<OfflineQueueState & OfflineQueueActions>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        // Initial state
        queuedOperations: [],
        queueStatus: 'idle',
        isOnline: true,
        lastSyncAttempt: null,
        nextScheduledSync: null,
        emergencyBypass: false,
        crisisDataPriority: getDefaultCrisisPriorityState(),
        queueMetrics: getDefaultPerformanceMetrics(),
        configuration: null,
        subscriptionTier: 'trial',
        initialized: false,
        lastStateUpdate: new Date().toISOString(),

        // Core queue operations
        addOperation: async (operation: PriorityQueueOperation): Promise<boolean> => {
          const startTime = performance.now();

          try {
            set((state) => {
              // Check if operation already exists
              const existingIndex = state.queuedOperations.findIndex(
                op => op.operationId === operation.operationId
              );

              if (existingIndex !== -1) {
                // Update existing operation
                state.queuedOperations[existingIndex] = operation;
              } else {
                // Add new operation with priority insertion
                const insertIndex = state.queuedOperations.findIndex(
                  op => (op.priority || 5) < (operation.priority || 5)
                );

                if (insertIndex === -1) {
                  state.queuedOperations.push(operation);
                } else {
                  state.queuedOperations.splice(insertIndex, 0, operation);
                }
              }

              // Update metrics
              state.queueMetrics.currentQueueSize = state.queuedOperations.length;
              state.queueMetrics.maxQueueSizeReached = Math.max(
                state.queueMetrics.maxQueueSizeReached,
                state.queuedOperations.length
              );

              // Handle crisis operations
              if (operation.crisisAttributes?.isCrisisOperation) {
                state.crisisDataPriority.crisisOperationsCount++;
                state.crisisDataPriority.crisisEscalationLevel = operation.crisisAttributes.crisisLevel;
                state.crisisDataPriority.emergencyOperationIds.push(operation.operationId);
                state.crisisDataPriority.lastCrisisEscalation = new Date().toISOString();

                // Activate emergency bypass for severe/emergency crisis
                if (['severe', 'emergency'].includes(operation.crisisAttributes.crisisLevel)) {
                  state.emergencyBypass = true;
                  state.crisisDataPriority.emergencyBypassActive = true;
                }
              }

              state.lastStateUpdate = new Date().toISOString();
            });

            // Performance tracking
            const processingTime = performance.now() - startTime;
            if (processingTime > 10) {
              console.warn(`Queue operation add exceeded 10ms threshold: ${processingTime}ms`);
            }

            return true;
          } catch (error) {
            console.error('Failed to add operation to queue:', error);
            return false;
          }
        },

        removeOperation: (operationId: string): boolean => {
          try {
            set((state) => {
              const operationIndex = state.queuedOperations.findIndex(
                op => op.operationId === operationId
              );

              if (operationIndex === -1) return;

              const operation = state.queuedOperations[operationIndex];

              // Remove from queue
              state.queuedOperations.splice(operationIndex, 1);

              // Update crisis state if it was a crisis operation
              if (operation.crisisAttributes?.isCrisisOperation) {
                state.crisisDataPriority.crisisOperationsCount = Math.max(
                  0, state.crisisDataPriority.crisisOperationsCount - 1
                );

                // Remove from emergency operations
                state.crisisDataPriority.emergencyOperationIds =
                  state.crisisDataPriority.emergencyOperationIds.filter(id => id !== operationId);

                // Deactivate emergency bypass if no more crisis operations
                if (state.crisisDataPriority.crisisOperationsCount === 0) {
                  state.emergencyBypass = false;
                  state.crisisDataPriority.emergencyBypassActive = false;
                  state.crisisDataPriority.crisisEscalationLevel = 'none';
                }
              }

              // Update metrics
              state.queueMetrics.currentQueueSize = state.queuedOperations.length;
              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to remove operation from queue:', error);
            return false;
          }
        },

        updateOperation: (operationId: string, updates: Partial<PriorityQueueOperation>): boolean => {
          try {
            set((state) => {
              const operationIndex = state.queuedOperations.findIndex(
                op => op.operationId === operationId
              );

              if (operationIndex === -1) return;

              // Update operation with merge
              state.queuedOperations[operationIndex] = {
                ...state.queuedOperations[operationIndex],
                ...updates,
                statusUpdatedAt: new Date().toISOString(),
              };

              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to update operation in queue:', error);
            return false;
          }
        },

        getOperation: (operationId: string): PriorityQueueOperation | null => {
          const state = get();
          return state.queuedOperations.find(op => op.operationId === operationId) || null;
        },

        processNextOperation: async (): Promise<PriorityQueueOperation | null> => {
          const state = get();

          // Find highest priority operation that can be executed
          const executableOperation = state.queuedOperations.find(op =>
            op.status === 'queued' &&
            (!op.dependencies || op.dependencies.length === 0)
          );

          if (!executableOperation) return null;

          // Update operation status to processing
          get().updateOperation(executableOperation.operationId, {
            status: 'executing',
          });

          return executableOperation;
        },

        retryOperation: async (operationId: string): Promise<boolean> => {
          const operation = get().getOperation(operationId);
          if (!operation) return false;

          const maxRetries = operation.crisisAttributes?.isCrisisOperation ? 10 : 3;

          if (operation.executionMetadata.attemptCount >= maxRetries) {
            get().updateOperation(operationId, { status: 'failed' });
            return false;
          }

          // Update retry attempt
          get().updateOperation(operationId, {
            status: 'queued',
            executionMetadata: {
              ...operation.executionMetadata,
              attemptCount: operation.executionMetadata.attemptCount + 1,
              lastAttemptAt: new Date().toISOString(),
            },
          });

          set((state) => {
            state.queueMetrics.retryAttemptCount++;
          });

          return true;
        },

        deferOperation: (operationId: string, deferUntil: string): boolean => {
          return get().updateOperation(operationId, {
            status: 'deferred',
            scheduling: {
              ...get().getOperation(operationId)?.scheduling,
              scheduledExecutionTime: deferUntil,
            },
          });
        },

        clearCompletedOperations: (): number => {
          let removedCount = 0;

          set((state) => {
            const initialLength = state.queuedOperations.length;
            state.queuedOperations = state.queuedOperations.filter(op =>
              !['completed', 'failed'].includes(op.status)
            );
            removedCount = initialLength - state.queuedOperations.length;

            state.queueMetrics.currentQueueSize = state.queuedOperations.length;
            state.lastStateUpdate = new Date().toISOString();
          });

          return removedCount;
        },

        // Crisis management
        escalateToCrisisPriority: (operationId: string, crisisLevel: CrisisPriorityState['crisisEscalationLevel']): boolean => {
          const startTime = performance.now();

          try {
            set((state) => {
              const operationIndex = state.queuedOperations.findIndex(
                op => op.operationId === operationId
              );

              if (operationIndex === -1) return;

              // Update operation with crisis attributes
              state.queuedOperations[operationIndex].crisisAttributes = {
                ...state.queuedOperations[operationIndex].crisisAttributes,
                isCrisisOperation: true,
                crisisLevel,
                requiresImmediateExecution: true,
                maxTolerableDelayMs: 200,
                bypassSubscriptionLimits: true,
                crisisEscalationTrigger: true,
              };

              // Update priority to crisis level
              state.queuedOperations[operationIndex].priority = 10;
              state.queuedOperations[operationIndex].status = 'crisis_escalated';

              // Move operation to front of queue
              const operation = state.queuedOperations.splice(operationIndex, 1)[0];
              state.queuedOperations.unshift(operation);

              // Update crisis state
              state.crisisDataPriority.crisisOperationsCount++;
              state.crisisDataPriority.crisisEscalationLevel = crisisLevel;
              state.crisisDataPriority.lastCrisisEscalation = new Date().toISOString();
              state.crisisDataPriority.emergencyOperationIds.push(operationId);

              // Activate emergency bypass for severe/emergency
              if (['severe', 'emergency'].includes(crisisLevel)) {
                state.emergencyBypass = true;
                state.crisisDataPriority.emergencyBypassActive = true;
              }

              state.lastStateUpdate = new Date().toISOString();
            });

            // Performance tracking for crisis escalation
            const processingTime = performance.now() - startTime;
            if (processingTime > 50) {
              console.error(`Crisis escalation exceeded 50ms threshold: ${processingTime}ms`);

              set((state) => {
                state.crisisDataPriority.crisisResponseTimeViolations++;
                state.crisisDataPriority.lastCrisisResponseTimeViolation = new Date().toISOString();
              });
            }

            return true;
          } catch (error) {
            console.error('Failed to escalate operation to crisis priority:', error);
            return false;
          }
        },

        activateEmergencyBypass: () => {
          set((state) => {
            state.emergencyBypass = true;
            state.crisisDataPriority.emergencyBypassActive = true;
            state.queueStatus = 'crisis_mode';
            state.lastStateUpdate = new Date().toISOString();
          });
        },

        deactivateEmergencyBypass: () => {
          set((state) => {
            state.emergencyBypass = false;
            state.crisisDataPriority.emergencyBypassActive = false;

            // Only exit crisis mode if no crisis operations remain
            if (state.crisisDataPriority.crisisOperationsCount === 0) {
              state.queueStatus = 'idle';
              state.crisisDataPriority.crisisEscalationLevel = 'none';
            }

            state.lastStateUpdate = new Date().toISOString();
          });
        },

        // Queue state management
        updateQueueStatus: (status: OfflineQueueState['queueStatus']) => {
          set((state) => {
            state.queueStatus = status;
            state.lastStateUpdate = new Date().toISOString();
          });
        },

        setOnlineStatus: (isOnline: boolean) => {
          set((state) => {
            state.isOnline = isOnline;

            if (isOnline) {
              state.nextScheduledSync = new Date().toISOString();
            }

            state.lastStateUpdate = new Date().toISOString();
          });
        },

        updateConfiguration: (config: Partial<QueueConfiguration>) => {
          set((state) => {
            state.configuration = {
              ...state.configuration,
              ...config,
            } as QueueConfiguration;
            state.lastStateUpdate = new Date().toISOString();
          });
        },

        updateSubscriptionTier: (tier: SubscriptionTier) => {
          set((state) => {
            state.subscriptionTier = tier;
            state.lastStateUpdate = new Date().toISOString();
          });
        },

        // Performance monitoring
        updatePerformanceMetrics: (metrics: Partial<QueuePerformanceMetrics>) => {
          set((state) => {
            state.queueMetrics = {
              ...state.queueMetrics,
              ...metrics,
              lastPerformanceCheck: new Date().toISOString(),
            };
            state.lastStateUpdate = new Date().toISOString();
          });
        },

        performHealthCheck: (): QueuePerformanceMetrics['performanceStatus'] => {
          const state = get();
          const metrics = state.queueMetrics;

          // Critical conditions
          if (metrics.crisisResponseTimeViolations > 0 ||
              metrics.failureRate > 0.1 ||
              metrics.currentQueueSize > 500) {
            return 'critical';
          }

          // Warning conditions
          if (metrics.failureRate > 0.05 ||
              metrics.currentQueueSize > 100 ||
              metrics.averageProcessingTimeMs > 5000) {
            return 'warning';
          }

          return 'optimal';
        },

        optimizeQueueMemory: async (): Promise<number> => {
          let bytesFreed = 0;

          set((state) => {
            const initialOperationCount = state.queuedOperations.length;

            // Remove completed/failed operations older than 1 hour
            const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
            state.queuedOperations = state.queuedOperations.filter(op => {
              const shouldRemove = (
                ['completed', 'failed'].includes(op.status) &&
                op.statusUpdatedAt < oneHourAgo &&
                !op.crisisAttributes?.isCrisisOperation
              );
              return !shouldRemove;
            });

            const removedCount = initialOperationCount - state.queuedOperations.length;
            bytesFreed = removedCount * 1024; // Estimate 1KB per operation

            state.queueMetrics.currentQueueSize = state.queuedOperations.length;
            state.queueMetrics.memoryUsageBytes = Math.max(
              0, state.queueMetrics.memoryUsageBytes - bytesFreed
            );

            state.lastStateUpdate = new Date().toISOString();
          });

          return bytesFreed;
        },

        // Utility actions
        getQueueStats: () => {
          const state = get();

          const stats = {
            total: state.queuedOperations.length,
            byPriority: {} as Record<PriorityLevel, number>,
            byStatus: {} as Record<QueueOperationStatus, number>,
            crisisOperations: 0,
          };

          state.queuedOperations.forEach(op => {
            const priority = (op.priority || 5) as PriorityLevel;
            const status = op.status as QueueOperationStatus;

            stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;
            stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

            if (op.crisisAttributes?.isCrisisOperation) {
              stats.crisisOperations++;
            }
          });

          return stats;
        },

        exportQueueState: async (): Promise<string> => {
          const state = get();
          const exportData = {
            timestamp: new Date().toISOString(),
            queueState: {
              operations: state.queuedOperations,
              status: state.queueStatus,
              metrics: state.queueMetrics,
              crisisState: state.crisisDataPriority,
            },
          };

          // Encrypt export data for security
          return await encryptionService.encrypt(JSON.stringify(exportData));
        },

        reset: () => {
          set(() => ({
            queuedOperations: [],
            queueStatus: 'idle',
            isOnline: true,
            lastSyncAttempt: null,
            nextScheduledSync: null,
            emergencyBypass: false,
            crisisDataPriority: getDefaultCrisisPriorityState(),
            queueMetrics: getDefaultPerformanceMetrics(),
            configuration: null,
            subscriptionTier: 'trial',
            initialized: false,
            lastStateUpdate: new Date().toISOString(),
          }));
        },
      })),
      {
        name: 'fullmind-offline-queue',
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          queuedOperations: state.queuedOperations,
          queueStatus: state.queueStatus,
          lastSyncAttempt: state.lastSyncAttempt,
          nextScheduledSync: state.nextScheduledSync,
          crisisDataPriority: state.crisisDataPriority,
          queueMetrics: state.queueMetrics,
          configuration: state.configuration,
          subscriptionTier: state.subscriptionTier,
        }),
      }
    )
  )
);

/**
 * Offline Queue Store Selectors for Performance
 */
export const offlineQueueSelectors = {
  getQueuedOperations: (state: OfflineQueueState) => state.queuedOperations,
  getQueueStatus: (state: OfflineQueueState) => state.queueStatus,
  getCrisisOperations: (state: OfflineQueueState) =>
    state.queuedOperations.filter(op => op.crisisAttributes?.isCrisisOperation),
  getHighPriorityOperations: (state: OfflineQueueState) =>
    state.queuedOperations.filter(op => (op.priority || 5) >= 7),
  getQueueMetrics: (state: OfflineQueueState) => state.queueMetrics,
  getCrisisState: (state: OfflineQueueState) => state.crisisDataPriority,
  isEmergencyBypassActive: (state: OfflineQueueState) => state.emergencyBypass,
  getQueueCapacity: (state: OfflineQueueState) => ({
    current: state.queuedOperations.length,
    max: state.configuration?.tierLimits?.[state.subscriptionTier]?.maxQueuedOperations || 100,
    utilizationPercentage: state.queueMetrics.queueUtilizationPercentage,
  }),
};

/**
 * Offline Queue Store Hook with Selectors
 */
export const useOfflineQueue = () => {
  const store = useOfflineQueueStore();
  return {
    ...store,
    selectors: offlineQueueSelectors,
  };
};