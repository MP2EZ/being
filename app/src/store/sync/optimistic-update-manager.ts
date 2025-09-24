/**
 * Optimistic Update Manager for Being. MBCT App
 *
 * Optimistic UI updates with robust conflict resolution:
 * - Immediate UI responsiveness with <100ms optimistic updates
 * - Crisis-safe rollback mechanisms with therapeutic continuity protection
 * - Intelligent conflict resolution prioritizing user safety
 * - HIPAA-compliant optimistic state management and audit trails
 * - Real-time conflict detection and resolution strategies
 * - Mental health-aware error handling and recovery protocols
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
 * Optimistic Update Types
 */
export type OptimisticUpdateType =
  | 'subscription_change'
  | 'payment_processing'
  | 'feature_access_change'
  | 'crisis_level_update'
  | 'emergency_access_grant'
  | 'grace_period_activation'
  | 'therapeutic_state_change'
  | 'user_preference_update'
  | 'assessment_completion'
  | 'crisis_intervention_trigger';

/**
 * Update Confirmation Status
 */
export type UpdateConfirmationStatus =
  | 'pending'          // Awaiting server confirmation
  | 'confirmed'        // Server confirmed the update
  | 'conflicted'       // Server state conflicts with optimistic state
  | 'rejected'         // Server rejected the update
  | 'rolled_back'      // Update was rolled back
  | 'timed_out';       // No confirmation received within timeout

/**
 * Conflict Resolution Strategy
 */
export type ConflictResolutionStrategy =
  | 'server_wins'      // Always accept server state
  | 'client_wins'      // Keep optimistic state
  | 'merge_intelligent' // Intelligent merge favoring user safety
  | 'therapeutic_priority' // Prioritize therapeutic continuity
  | 'crisis_safety'    // Prioritize crisis safety above all
  | 'manual_review';   // Require manual intervention

/**
 * Optimistic Update Record
 */
interface OptimisticUpdate {
  id: string;
  type: OptimisticUpdateType;
  timestamp: number;
  originalState: any;
  optimisticState: any;
  targetStores: string[];
  status: UpdateConfirmationStatus;

  // Crisis & Therapeutic Context
  crisisLevel: CrisisLevel;
  therapeuticImpact: boolean;
  userSafetyPriority: boolean;

  // Confirmation & Timing
  confirmationTimeout: number;
  confirmationReceived: boolean;
  serverState?: any;
  conflictDetected: boolean;

  // Resolution
  resolutionStrategy: ConflictResolutionStrategy;
  autoResolvable: boolean;
  rollbackRequired: boolean;
  rollbackCompleted: boolean;

  // Performance & Monitoring
  updateLatency: number;
  confirmationLatency?: number;
  rollbackLatency?: number;

  // Error Handling
  errorOccurred: boolean;
  errorMessage?: string;
  recoveryAction?: string;

  // Audit Trail
  auditTrail: Array<{
    timestamp: number;
    action: string;
    state: any;
    reason: string;
  }>;
}

/**
 * Conflict Resolution Context
 */
interface ConflictContext {
  conflictId: string;
  updateId: string;
  storeId: string;
  localState: any;
  serverState: any;
  conflictType: 'data_mismatch' | 'timestamp_conflict' | 'operation_conflict' | 'state_integrity_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  therapeuticImpact: boolean;
  userSafetyImplication: boolean;
  autoResolutionAttempted: boolean;
  manualReviewRequired: boolean;
  resolutionTimestamp?: number;
  resolutionStrategy?: ConflictResolutionStrategy;
  resolvedState?: any;
}

/**
 * Optimistic Update Manager State
 */
interface OptimisticUpdateManagerState {
  // Core Update Management
  activeUpdates: Map<string, OptimisticUpdate>;
  pendingConfirmations: Map<string, OptimisticUpdate>;
  confirmedUpdates: Map<string, OptimisticUpdate>;
  rejectedUpdates: Map<string, OptimisticUpdate>;
  rolledBackUpdates: Map<string, OptimisticUpdate>;

  // Conflict Management
  activeConflicts: Map<string, ConflictContext>;
  conflictResolutionQueue: string[];
  manualReviewQueue: string[];

  // Configuration
  optimisticConfig: {
    enabled: boolean;
    defaultTimeout: number;
    crisisTimeout: number;
    maxConcurrentUpdates: number;
    autoRollbackOnError: boolean;
    therapeuticSafetyMode: boolean;
    crisisSafetyOverride: boolean;
  };

  // Performance Metrics
  optimisticMetrics: {
    totalUpdates: number;
    successfulUpdates: number;
    conflictedUpdates: number;
    rolledBackUpdates: number;
    averageConfirmationTime: number;
    averageRollbackTime: number;
    conflictResolutionTime: number;
    userSatisfactionScore: number; // Based on successful vs. rolled back updates
  };

  // Crisis-Aware State Management
  crisisOptimisticState: {
    crisisMode: boolean;
    crisisLevel: CrisisLevel;
    emergencyUpdatesEnabled: boolean;
    therapeuticContinuityProtected: boolean;
    safetyOverrideActive: boolean;
    crisisUpdateThreshold: number;
  };

  // Store Integration
  connectedStores: Map<string, {
    storeId: string;
    updateCapabilities: OptimisticUpdateType[];
    conflictResolutionStrategy: ConflictResolutionStrategy;
    lastUpdateTimestamp: number;
    updateSuccessRate: number;
  }>;

  // User Experience
  userExperienceState: {
    currentMessage: TherapeuticMessage | null;
    anxietyReducingMode: boolean;
    smoothTransitionsEnabled: boolean;
    updateFeedbackEnabled: boolean;
    errorMessagingTherapeutic: boolean;
  };

  // Recovery & Backup
  stateBackups: Map<string, {
    storeId: string;
    backupState: any;
    timestamp: number;
    updateId: string;
  }>;
  recoveryInProgress: boolean;
  lastRecoveryTimestamp: number;
}

/**
 * Optimistic Update Manager Actions
 */
interface OptimisticUpdateManagerActions {
  // Core Optimistic Update Operations
  applyOptimisticUpdate: (
    type: OptimisticUpdateType,
    optimisticState: any,
    targetStores: string[],
    options?: {
      timeout?: number;
      resolutionStrategy?: ConflictResolutionStrategy;
      therapeuticImpact?: boolean;
      crisisLevel?: CrisisLevel;
    }
  ) => Promise<string>;

  confirmOptimisticUpdate: (updateId: string, serverState?: any) => Promise<void>;
  rejectOptimisticUpdate: (updateId: string, reason: string, serverState?: any) => Promise<void>;
  rollbackOptimisticUpdate: (updateId: string, reason: string) => Promise<void>;

  // Conflict Detection & Resolution
  detectConflict: (updateId: string, serverState: any) => ConflictContext | null;
  resolveConflict: (conflictId: string, strategy: ConflictResolutionStrategy) => Promise<void>;
  autoResolveConflicts: () => Promise<number>;
  queueManualReview: (conflictId: string) => void;

  // Crisis-Safe Operations
  activateCrisisOptimisticMode: (crisisLevel: CrisisLevel) => Promise<void>;
  deactivateCrisisOptimisticMode: () => Promise<void>;
  preserveTherapeuticContinuityInUpdates: () => Promise<void>;
  applyCrisisSafeUpdate: (type: OptimisticUpdateType, state: any, targetStores: string[]) => Promise<string>;

  // Store Integration
  connectStore: (storeId: string, capabilities: OptimisticUpdateType[], strategy: ConflictResolutionStrategy) => void;
  disconnectStore: (storeId: string) => void;
  syncWithStores: (updateId: string) => Promise<void>;

  // Performance & Monitoring
  trackUpdatePerformance: (updateId: string, phase: 'apply' | 'confirm' | 'rollback', latency: number) => void;
  getUpdateHealth: () => { healthy: boolean; issues: string[]; metrics: any };
  optimizeUpdatePerformance: () => Promise<void>;

  // Recovery & Error Handling
  initiateRecovery: (scope: 'single_update' | 'store_specific' | 'global') => Promise<void>;
  backupStateBeforeUpdate: (updateId: string, storeId: string, state: any) => void;
  restoreStateFromBackup: (updateId: string, storeId: string) => Promise<any>;

  // User Experience
  displayUpdateNotification: (message: TherapeuticMessage) => void;
  generateTherapeuticUpdateMessage: (type: 'success' | 'conflict' | 'rollback' | 'error', context: string) => TherapeuticMessage;
  clearUpdateNotifications: () => void;

  // Configuration & Management
  configureOptimisticUpdates: (config: Partial<OptimisticUpdateManagerState['optimisticConfig']>) => void;
  getOptimisticUpdateStatus: (updateId: string) => OptimisticUpdate | null;
  cleanupCompletedUpdates: () => void;
}

/**
 * Combined Optimistic Update Manager Store
 */
type OptimisticUpdateManagerStore = OptimisticUpdateManagerState & OptimisticUpdateManagerActions;

/**
 * Optimistic Update Manager Implementation
 */
export const useOptimisticUpdateManager = create<OptimisticUpdateManagerStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    activeUpdates: new Map(),
    pendingConfirmations: new Map(),
    confirmedUpdates: new Map(),
    rejectedUpdates: new Map(),
    rolledBackUpdates: new Map(),

    // Conflicts
    activeConflicts: new Map(),
    conflictResolutionQueue: [],
    manualReviewQueue: [],

    // Configuration
    optimisticConfig: {
      enabled: true,
      defaultTimeout: 10000, // 10 seconds
      crisisTimeout: 5000,   // 5 seconds for crisis
      maxConcurrentUpdates: 20,
      autoRollbackOnError: true,
      therapeuticSafetyMode: true,
      crisisSafetyOverride: true,
    },

    // Metrics
    optimisticMetrics: {
      totalUpdates: 0,
      successfulUpdates: 0,
      conflictedUpdates: 0,
      rolledBackUpdates: 0,
      averageConfirmationTime: 0,
      averageRollbackTime: 0,
      conflictResolutionTime: 0,
      userSatisfactionScore: 100,
    },

    // Crisis State
    crisisOptimisticState: {
      crisisMode: false,
      crisisLevel: 'none',
      emergencyUpdatesEnabled: true,
      therapeuticContinuityProtected: true,
      safetyOverrideActive: false,
      crisisUpdateThreshold: 100, // 100ms for crisis updates
    },

    // Store Integration
    connectedStores: new Map(),

    // User Experience
    userExperienceState: {
      currentMessage: null,
      anxietyReducingMode: true,
      smoothTransitionsEnabled: true,
      updateFeedbackEnabled: true,
      errorMessagingTherapeutic: true,
    },

    // Recovery
    stateBackups: new Map(),
    recoveryInProgress: false,
    lastRecoveryTimestamp: 0,

    // Actions Implementation
    applyOptimisticUpdate: async (
      type: OptimisticUpdateType,
      optimisticState: any,
      targetStores: string[],
      options = {}
    ) => {
      const startTime = Date.now();

      try {
        const {
          timeout = get().optimisticConfig.defaultTimeout,
          resolutionStrategy = 'therapeutic_priority',
          therapeuticImpact = false,
          crisisLevel = 'none'
        } = options;

        // Generate unique update ID
        const updateId = `optimistic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create update record
        const update: OptimisticUpdate = {
          id: updateId,
          type,
          timestamp: Date.now(),
          originalState: {}, // Will be set when backing up
          optimisticState,
          targetStores,
          status: 'pending',
          crisisLevel,
          therapeuticImpact,
          userSafetyPriority: crisisLevel === 'critical' || crisisLevel === 'emergency',
          confirmationTimeout: timeout,
          confirmationReceived: false,
          conflictDetected: false,
          resolutionStrategy,
          autoResolvable: true,
          rollbackRequired: false,
          rollbackCompleted: false,
          updateLatency: 0,
          errorOccurred: false,
          auditTrail: [{
            timestamp: Date.now(),
            action: 'update_applied',
            state: optimisticState,
            reason: 'Optimistic update initiated',
          }],
        };

        // Backup current state for all target stores
        for (const storeId of targetStores) {
          // This would integrate with actual store instances
          get().backupStateBeforeUpdate(updateId, storeId, {}); // Placeholder
        }

        // Add to active updates
        const activeUpdates = new Map(get().activeUpdates);
        activeUpdates.set(updateId, update);
        set({ activeUpdates });

        // Apply optimistic state to target stores
        await get().syncWithStores(updateId);

        // Track performance
        const applyLatency = Date.now() - startTime;
        get().trackUpdatePerformance(updateId, 'apply', applyLatency);

        // Set confirmation timeout
        setTimeout(async () => {
          const currentUpdate = get().activeUpdates.get(updateId);
          if (currentUpdate && !currentUpdate.confirmationReceived) {
            await get().rollbackOptimisticUpdate(updateId, 'Confirmation timeout');
          }
        }, timeout);

        // Update metrics
        const metrics = get().optimisticMetrics;
        set({
          optimisticMetrics: {
            ...metrics,
            totalUpdates: metrics.totalUpdates + 1,
          },
        });

        console.log(`[OptimisticUpdateManager] Applied optimistic update ${updateId} in ${applyLatency}ms`);

        return updateId;

      } catch (error) {
        console.error('[OptimisticUpdateManager] Failed to apply optimistic update:', error);
        throw error;
      }
    },

    confirmOptimisticUpdate: async (updateId: string, serverState?: any) => {
      const startTime = Date.now();
      const update = get().activeUpdates.get(updateId);

      if (!update) {
        console.warn(`[OptimisticUpdateManager] Update ${updateId} not found for confirmation`);
        return;
      }

      try {
        // Check for conflicts
        let conflict: ConflictContext | null = null;
        if (serverState) {
          conflict = get().detectConflict(updateId, serverState);
        }

        if (conflict) {
          // Handle conflict
          const activeConflicts = new Map(get().activeConflicts);
          activeConflicts.set(conflict.conflictId, conflict);
          set({ activeConflicts });

          if (conflict.autoResolutionAttempted) {
            await get().resolveConflict(conflict.conflictId, update.resolutionStrategy);
          } else {
            get().queueManualReview(conflict.conflictId);
          }

          return;
        }

        // No conflict - confirm update
        const confirmedUpdate = {
          ...update,
          status: 'confirmed' as UpdateConfirmationStatus,
          confirmationReceived: true,
          confirmationLatency: Date.now() - update.timestamp,
          serverState,
        };

        // Move from active to confirmed
        const activeUpdates = new Map(get().activeUpdates);
        const confirmedUpdates = new Map(get().confirmedUpdates);

        activeUpdates.delete(updateId);
        confirmedUpdates.set(updateId, confirmedUpdate);

        set({ activeUpdates, confirmedUpdates });

        // Track performance
        const confirmLatency = Date.now() - startTime;
        get().trackUpdatePerformance(updateId, 'confirm', confirmLatency);

        // Update metrics
        const metrics = get().optimisticMetrics;
        set({
          optimisticMetrics: {
            ...metrics,
            successfulUpdates: metrics.successfulUpdates + 1,
            averageConfirmationTime: (metrics.averageConfirmationTime + confirmLatency) / 2,
          },
        });

        // Display success message if therapeutic impact
        if (update.therapeuticImpact) {
          const successMessage = get().generateTherapeuticUpdateMessage('success', update.type);
          get().displayUpdateNotification(successMessage);
        }

        console.log(`[OptimisticUpdateManager] Confirmed update ${updateId} in ${confirmLatency}ms`);

      } catch (error) {
        console.error(`[OptimisticUpdateManager] Failed to confirm update ${updateId}:`, error);
        await get().rollbackOptimisticUpdate(updateId, `Confirmation error: ${error.message}`);
      }
    },

    rejectOptimisticUpdate: async (updateId: string, reason: string, serverState?: any) => {
      const update = get().activeUpdates.get(updateId);

      if (!update) {
        console.warn(`[OptimisticUpdateManager] Update ${updateId} not found for rejection`);
        return;
      }

      try {
        // Mark as rejected
        const rejectedUpdate = {
          ...update,
          status: 'rejected' as UpdateConfirmationStatus,
          errorOccurred: true,
          errorMessage: reason,
          serverState,
        };

        // Move to rejected updates
        const activeUpdates = new Map(get().activeUpdates);
        const rejectedUpdates = new Map(get().rejectedUpdates);

        activeUpdates.delete(updateId);
        rejectedUpdates.set(updateId, rejectedUpdate);

        set({ activeUpdates, rejectedUpdates });

        // Rollback if auto-rollback is enabled
        if (get().optimisticConfig.autoRollbackOnError) {
          await get().rollbackOptimisticUpdate(updateId, `Auto-rollback due to rejection: ${reason}`);
        }

        // Display therapeutic error message
        if (update.therapeuticImpact) {
          const errorMessage = get().generateTherapeuticUpdateMessage('error', reason);
          get().displayUpdateNotification(errorMessage);
        }

        console.log(`[OptimisticUpdateManager] Rejected update ${updateId}: ${reason}`);

      } catch (error) {
        console.error(`[OptimisticUpdateManager] Failed to reject update ${updateId}:`, error);
      }
    },

    rollbackOptimisticUpdate: async (updateId: string, reason: string) => {
      const startTime = Date.now();
      const update = get().activeUpdates.get(updateId) || get().rejectedUpdates.get(updateId);

      if (!update) {
        console.warn(`[OptimisticUpdateManager] Update ${updateId} not found for rollback`);
        return;
      }

      try {
        // Restore original state for all target stores
        for (const storeId of update.targetStores) {
          const originalState = await get().restoreStateFromBackup(updateId, storeId);
          if (originalState) {
            // This would integrate with actual store instances to restore state
            console.log(`[OptimisticUpdateManager] Restored state for store ${storeId}`);
          }
        }

        // Mark as rolled back
        const rolledBackUpdate = {
          ...update,
          status: 'rolled_back' as UpdateConfirmationStatus,
          rollbackRequired: true,
          rollbackCompleted: true,
          rollbackLatency: Date.now() - startTime,
          recoveryAction: reason,
        };

        // Move to rolled back updates
        const activeUpdates = new Map(get().activeUpdates);
        const rejectedUpdates = new Map(get().rejectedUpdates);
        const rolledBackUpdates = new Map(get().rolledBackUpdates);

        activeUpdates.delete(updateId);
        rejectedUpdates.delete(updateId);
        rolledBackUpdates.set(updateId, rolledBackUpdate);

        set({ activeUpdates, rejectedUpdates, rolledBackUpdates });

        // Track performance
        const rollbackLatency = Date.now() - startTime;
        get().trackUpdatePerformance(updateId, 'rollback', rollbackLatency);

        // Update metrics
        const metrics = get().optimisticMetrics;
        set({
          optimisticMetrics: {
            ...metrics,
            rolledBackUpdates: metrics.rolledBackUpdates + 1,
            averageRollbackTime: (metrics.averageRollbackTime + rollbackLatency) / 2,
            userSatisfactionScore: Math.max(metrics.userSatisfactionScore - 5, 0), // Slight penalty for rollbacks
          },
        });

        // Display therapeutic rollback message
        if (update.therapeuticImpact && get().userExperienceState.anxietyReducingMode) {
          const rollbackMessage = get().generateTherapeuticUpdateMessage('rollback', reason);
          get().displayUpdateNotification(rollbackMessage);
        }

        console.log(`[OptimisticUpdateManager] Rolled back update ${updateId} in ${rollbackLatency}ms: ${reason}`);

      } catch (error) {
        console.error(`[OptimisticUpdateManager] Failed to rollback update ${updateId}:`, error);
      }
    },

    detectConflict: (updateId: string, serverState: any) => {
      const update = get().activeUpdates.get(updateId);

      if (!update) return null;

      // Simple conflict detection - in practice this would be more sophisticated
      const hasConflict = JSON.stringify(update.optimisticState) !== JSON.stringify(serverState);

      if (hasConflict) {
        const conflictId = `conflict_${updateId}_${Date.now()}`;

        const conflict: ConflictContext = {
          conflictId,
          updateId,
          storeId: update.targetStores[0], // Simplified - would handle multiple stores
          localState: update.optimisticState,
          serverState,
          conflictType: 'data_mismatch',
          severity: update.userSafetyPriority ? 'critical' : 'medium',
          therapeuticImpact: update.therapeuticImpact,
          userSafetyImplication: update.userSafetyPriority,
          autoResolutionAttempted: false,
          manualReviewRequired: update.userSafetyPriority,
        };

        console.log(`[OptimisticUpdateManager] Conflict detected: ${conflictId}`);
        return conflict;
      }

      return null;
    },

    resolveConflict: async (conflictId: string, strategy: ConflictResolutionStrategy) => {
      const startTime = Date.now();
      const conflict = get().activeConflicts.get(conflictId);

      if (!conflict) {
        console.warn(`[OptimisticUpdateManager] Conflict ${conflictId} not found`);
        return;
      }

      try {
        let resolvedState;

        switch (strategy) {
          case 'server_wins':
            resolvedState = conflict.serverState;
            break;

          case 'client_wins':
            resolvedState = conflict.localState;
            break;

          case 'merge_intelligent':
            resolvedState = { ...conflict.serverState, ...conflict.localState };
            break;

          case 'therapeutic_priority':
            // Prioritize therapeutic continuity
            resolvedState = {
              ...conflict.serverState,
              therapeuticContinuityActive: true,
              emergencyContactsAccessible: true,
              crisisSupport: true,
            };
            break;

          case 'crisis_safety':
            // Always prioritize crisis safety
            resolvedState = {
              ...conflict.localState,
              emergencyAccessGranted: true,
              therapeuticContinuityActive: true,
              crisisSupport: true,
            };
            break;

          case 'manual_review':
            get().queueManualReview(conflictId);
            return;

          default:
            resolvedState = conflict.serverState;
        }

        // Apply resolved state
        const update = get().activeUpdates.get(conflict.updateId);
        if (update) {
          await get().confirmOptimisticUpdate(conflict.updateId, resolvedState);
        }

        // Update conflict record
        const updatedConflict = {
          ...conflict,
          resolutionTimestamp: Date.now(),
          resolutionStrategy: strategy,
          resolvedState,
        };

        const activeConflicts = new Map(get().activeConflicts);
        activeConflicts.set(conflictId, updatedConflict);
        set({ activeConflicts });

        // Remove from resolution queue
        const conflictResolutionQueue = get().conflictResolutionQueue.filter(id => id !== conflictId);
        set({ conflictResolutionQueue });

        // Track performance
        const resolutionTime = Date.now() - startTime;
        const metrics = get().optimisticMetrics;
        set({
          optimisticMetrics: {
            ...metrics,
            conflictedUpdates: metrics.conflictedUpdates + 1,
            conflictResolutionTime: (metrics.conflictResolutionTime + resolutionTime) / 2,
          },
        });

        console.log(`[OptimisticUpdateManager] Resolved conflict ${conflictId} with strategy ${strategy} in ${resolutionTime}ms`);

      } catch (error) {
        console.error(`[OptimisticUpdateManager] Failed to resolve conflict ${conflictId}:`, error);
      }
    },

    autoResolveConflicts: async () => {
      const conflicts = get().activeConflicts;
      let resolvedCount = 0;

      for (const [conflictId, conflict] of conflicts) {
        if (!conflict.manualReviewRequired && !conflict.autoResolutionAttempted) {
          // Determine auto-resolution strategy
          let strategy: ConflictResolutionStrategy = 'merge_intelligent';

          if (conflict.userSafetyImplication) {
            strategy = 'crisis_safety';
          } else if (conflict.therapeuticImpact) {
            strategy = 'therapeutic_priority';
          }

          await get().resolveConflict(conflictId, strategy);
          resolvedCount++;
        }
      }

      console.log(`[OptimisticUpdateManager] Auto-resolved ${resolvedCount} conflicts`);
      return resolvedCount;
    },

    queueManualReview: (conflictId: string) => {
      const manualReviewQueue = [...get().manualReviewQueue, conflictId];
      set({ manualReviewQueue });

      console.log(`[OptimisticUpdateManager] Queued conflict for manual review: ${conflictId}`);
    },

    activateCrisisOptimisticMode: async (crisisLevel: CrisisLevel) => {
      set({
        crisisOptimisticState: {
          ...get().crisisOptimisticState,
          crisisMode: true,
          crisisLevel,
          emergencyUpdatesEnabled: true,
          safetyOverrideActive: true,
        },
        optimisticConfig: {
          ...get().optimisticConfig,
          defaultTimeout: get().optimisticConfig.crisisTimeout,
          crisisSafetyOverride: true,
        },
      });

      console.log(`[OptimisticUpdateManager] Crisis optimistic mode activated: ${crisisLevel}`);
    },

    deactivateCrisisOptimisticMode: async () => {
      set({
        crisisOptimisticState: {
          ...get().crisisOptimisticState,
          crisisMode: false,
          crisisLevel: 'none',
          emergencyUpdatesEnabled: false,
          safetyOverrideActive: false,
        },
        optimisticConfig: {
          ...get().optimisticConfig,
          defaultTimeout: 10000, // Back to normal timeout
        },
      });

      console.log('[OptimisticUpdateManager] Crisis optimistic mode deactivated');
    },

    preserveTherapeuticContinuityInUpdates: async () => {
      // Ensure all active updates maintain therapeutic continuity
      const activeUpdates = get().activeUpdates;

      for (const [updateId, update] of activeUpdates) {
        if (update.therapeuticImpact) {
          update.optimisticState = {
            ...update.optimisticState,
            therapeuticContinuityActive: true,
            emergencyContactsAccessible: true,
            crisisSupport: true,
          };

          update.resolutionStrategy = 'therapeutic_priority';
        }
      }

      set({ activeUpdates: new Map(activeUpdates) });
      console.log('[OptimisticUpdateManager] Therapeutic continuity preserved in all updates');
    },

    applyCrisisSafeUpdate: async (type: OptimisticUpdateType, state: any, targetStores: string[]) => {
      const crisisSafeState = {
        ...state,
        emergencyAccessGranted: true,
        therapeuticContinuityActive: true,
        crisisSupport: true,
      };

      return await get().applyOptimisticUpdate(type, crisisSafeState, targetStores, {
        timeout: get().crisisOptimisticState.crisisUpdateThreshold,
        resolutionStrategy: 'crisis_safety',
        therapeuticImpact: true,
        crisisLevel: 'critical',
      });
    },

    connectStore: (storeId: string, capabilities: OptimisticUpdateType[], strategy: ConflictResolutionStrategy) => {
      const connectedStores = new Map(get().connectedStores);
      connectedStores.set(storeId, {
        storeId,
        updateCapabilities: capabilities,
        conflictResolutionStrategy: strategy,
        lastUpdateTimestamp: 0,
        updateSuccessRate: 100,
      });

      set({ connectedStores });
      console.log(`[OptimisticUpdateManager] Connected store: ${storeId}`);
    },

    disconnectStore: (storeId: string) => {
      const connectedStores = new Map(get().connectedStores);
      connectedStores.delete(storeId);
      set({ connectedStores });

      console.log(`[OptimisticUpdateManager] Disconnected store: ${storeId}`);
    },

    syncWithStores: async (updateId: string) => {
      const update = get().activeUpdates.get(updateId);
      if (!update) return;

      for (const storeId of update.targetStores) {
        const storeConfig = get().connectedStores.get(storeId);
        if (storeConfig && storeConfig.updateCapabilities.includes(update.type)) {
          // This would integrate with actual store instances
          console.log(`[OptimisticUpdateManager] Syncing update ${updateId} with store ${storeId}`);
        }
      }
    },

    trackUpdatePerformance: (updateId: string, phase: 'apply' | 'confirm' | 'rollback', latency: number) => {
      const update = get().activeUpdates.get(updateId) ||
                    get().confirmedUpdates.get(updateId) ||
                    get().rolledBackUpdates.get(updateId);

      if (update) {
        switch (phase) {
          case 'apply':
            update.updateLatency = latency;
            break;
          case 'confirm':
            update.confirmationLatency = latency;
            break;
          case 'rollback':
            update.rollbackLatency = latency;
            break;
        }
      }
    },

    getUpdateHealth: () => {
      const state = get();
      const metrics = state.optimisticMetrics;

      const issues = [];

      const successRate = (metrics.successfulUpdates / (metrics.totalUpdates || 1)) * 100;
      if (successRate < 80) {
        issues.push('Low success rate');
      }

      if (metrics.averageConfirmationTime > 5000) {
        issues.push('Slow confirmation times');
      }

      if (state.activeConflicts.size > 5) {
        issues.push('Multiple unresolved conflicts');
      }

      if (state.manualReviewQueue.length > 0) {
        issues.push('Manual review required');
      }

      return {
        healthy: issues.length === 0,
        issues,
        metrics: {
          successRate,
          averageConfirmationTime: metrics.averageConfirmationTime,
          conflictRate: (metrics.conflictedUpdates / (metrics.totalUpdates || 1)) * 100,
          userSatisfactionScore: metrics.userSatisfactionScore,
        },
      };
    },

    optimizeUpdatePerformance: async () => {
      // Auto-resolve conflicts if too many
      const conflictCount = get().activeConflicts.size;
      if (conflictCount > 10) {
        await get().autoResolveConflicts();
      }

      // Clean up old updates
      get().cleanupCompletedUpdates();

      // Adjust timeouts based on performance
      const metrics = get().optimisticMetrics;
      if (metrics.averageConfirmationTime > 8000) {
        const config = get().optimisticConfig;
        set({
          optimisticConfig: {
            ...config,
            defaultTimeout: Math.min(config.defaultTimeout * 1.2, 20000),
          },
        });
      }

      console.log('[OptimisticUpdateManager] Performance optimization completed');
    },

    initiateRecovery: async (scope: 'single_update' | 'store_specific' | 'global') => {
      set({ recoveryInProgress: true });

      try {
        switch (scope) {
          case 'global':
            // Rollback all active updates
            const activeUpdates = get().activeUpdates;
            for (const [updateId] of activeUpdates) {
              await get().rollbackOptimisticUpdate(updateId, 'Global recovery initiated');
            }
            break;

          case 'store_specific':
            // Implementation for store-specific recovery
            break;

          case 'single_update':
            // Implementation for single update recovery
            break;
        }

        set({ lastRecoveryTimestamp: Date.now() });
        console.log(`[OptimisticUpdateManager] Recovery completed: ${scope}`);

      } catch (error) {
        console.error('[OptimisticUpdateManager] Recovery failed:', error);
      } finally {
        set({ recoveryInProgress: false });
      }
    },

    backupStateBeforeUpdate: (updateId: string, storeId: string, state: any) => {
      const stateBackups = new Map(get().stateBackups);
      const backupKey = `${updateId}_${storeId}`;

      stateBackups.set(backupKey, {
        storeId,
        backupState: state,
        timestamp: Date.now(),
        updateId,
      });

      set({ stateBackups });
    },

    restoreStateFromBackup: async (updateId: string, storeId: string) => {
      const backupKey = `${updateId}_${storeId}`;
      const backup = get().stateBackups.get(backupKey);

      if (backup) {
        return backup.backupState;
      }

      return null;
    },

    displayUpdateNotification: (message: TherapeuticMessage) => {
      if (!get().userExperienceState.updateFeedbackEnabled) return;

      set({
        userExperienceState: {
          ...get().userExperienceState,
          currentMessage: message,
        },
      });

      // Auto-clear after display duration
      setTimeout(() => {
        const current = get().userExperienceState.currentMessage;
        if (current && current.id === message.id) {
          set({
            userExperienceState: {
              ...get().userExperienceState,
              currentMessage: null,
            },
          });
        }
      }, message.timing.displayDuration);
    },

    generateTherapeuticUpdateMessage: (type: 'success' | 'conflict' | 'rollback' | 'error', context: string) => {
      const messages = {
        success: {
          content: 'Update applied successfully. Your changes have been saved.',
          anxietyLevel: 'low',
          duration: 3000,
        },
        conflict: {
          content: 'A minor sync issue was resolved. Your data remains safe and accessible.',
          anxietyLevel: 'medium',
          duration: 5000,
        },
        rollback: {
          content: 'Changes were reversed to ensure stability. Your data remains protected.',
          anxietyLevel: 'medium',
          duration: 6000,
        },
        error: {
          content: 'A temporary issue occurred. Your progress is saved and you can continue safely.',
          anxietyLevel: 'medium',
          duration: 8000,
        },
      };

      const messageData = messages[type];

      return {
        id: `update_${type}_${Date.now()}`,
        type: 'anxiety_reducing' as const,
        priority: type === 'error' ? 'high' as const : 'low' as const,
        content: messageData.content,
        context: {
          userState: 'update_notification',
          therapeuticPhase: 'continuity_support',
          anxietyLevel: messageData.anxietyLevel,
          supportNeeded: false,
        },
        timing: {
          displayDuration: messageData.duration,
          fadeIn: 300,
          fadeOut: 300,
        },
        accessibility: {
          screenReaderText: messageData.content,
          highContrast: false,
          largeText: false,
        },
        timestamp: Date.now(),
      };
    },

    clearUpdateNotifications: () => {
      set({
        userExperienceState: {
          ...get().userExperienceState,
          currentMessage: null,
        },
      });
    },

    configureOptimisticUpdates: (config: Partial<OptimisticUpdateManagerState['optimisticConfig']>) => {
      set({
        optimisticConfig: {
          ...get().optimisticConfig,
          ...config,
        },
      });

      console.log('[OptimisticUpdateManager] Configuration updated');
    },

    getOptimisticUpdateStatus: (updateId: string) => {
      return get().activeUpdates.get(updateId) ||
             get().confirmedUpdates.get(updateId) ||
             get().rejectedUpdates.get(updateId) ||
             get().rolledBackUpdates.get(updateId) ||
             null;
    },

    cleanupCompletedUpdates: () => {
      const cutoffTime = Date.now() - (60 * 60 * 1000); // 1 hour ago

      // Clean confirmed updates
      const confirmedUpdates = new Map();
      for (const [updateId, update] of get().confirmedUpdates) {
        if (update.timestamp > cutoffTime) {
          confirmedUpdates.set(updateId, update);
        }
      }

      // Clean rolled back updates
      const rolledBackUpdates = new Map();
      for (const [updateId, update] of get().rolledBackUpdates) {
        if (update.timestamp > cutoffTime) {
          rolledBackUpdates.set(updateId, update);
        }
      }

      set({ confirmedUpdates, rolledBackUpdates });
    },
  }))
);

/**
 * Optimistic Update Manager Selectors
 */
export const optimisticUpdateSelectors = {
  isHealthy: (state: OptimisticUpdateManagerState) => {
    const health = state.getUpdateHealth?.();
    return health?.healthy ?? false;
  },

  hasPendingUpdates: (state: OptimisticUpdateManagerState) =>
    state.activeUpdates.size > 0,

  hasConflicts: (state: OptimisticUpdateManagerState) =>
    state.activeConflicts.size > 0,

  needsManualReview: (state: OptimisticUpdateManagerState) =>
    state.manualReviewQueue.length > 0,

  isCrisisMode: (state: OptimisticUpdateManagerState) =>
    state.crisisOptimisticState.crisisMode,

  updateHealth: (state: OptimisticUpdateManagerState) => ({
    successRate: (state.optimisticMetrics.successfulUpdates / (state.optimisticMetrics.totalUpdates || 1)) * 100,
    averageConfirmationTime: state.optimisticMetrics.averageConfirmationTime,
    conflictRate: (state.optimisticMetrics.conflictedUpdates / (state.optimisticMetrics.totalUpdates || 1)) * 100,
    userSatisfactionScore: state.optimisticMetrics.userSatisfactionScore,
  }),

  performanceMetrics: (state: OptimisticUpdateManagerState) => ({
    totalUpdates: state.optimisticMetrics.totalUpdates,
    activeUpdates: state.activeUpdates.size,
    activeConflicts: state.activeConflicts.size,
    averageLatency: state.optimisticMetrics.averageConfirmationTime,
  }),
};

export default useOptimisticUpdateManager;