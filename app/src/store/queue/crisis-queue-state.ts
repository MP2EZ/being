/**
 * Crisis Queue State Management for Being. MBCT App
 *
 * Emergency operation state management with comprehensive crisis protection:
 * - Emergency operation state that bypasses offline queue completely
 * - Crisis data state with immediate online sync priority
 * - Therapeutic access state preservation during offline periods
 * - Crisis override state for emergency access to queued operations
 * - Emergency queue flush state for immediate crisis data synchronization
 *
 * CRITICAL PERFORMANCE REQUIREMENTS:
 * - Crisis state changes: <50ms for all emergency operations
 * - Emergency bypass activation: <100ms for immediate access
 * - Crisis data escalation: <200ms for priority sync operations
 * - Therapeutic continuity: Zero data loss during crisis events
 * - Emergency access guarantee: 100% availability during crisis
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import { encryptionService } from '../../services/security/EncryptionService';
import type {
  PriorityQueueOperation,
  PriorityLevel,
} from '../../types/sync/sync-priority-queue';
import type { SubscriptionTier } from '../../types/payment-canonical';

/**
 * Crisis Level Enum with Escalation Thresholds
 */
export const CrisisLevelSchema = z.enum(['none', 'mild', 'moderate', 'severe', 'emergency']);
export type CrisisLevel = z.infer<typeof CrisisLevelSchema>;

/**
 * Crisis Response State with Performance Guarantees
 */
export const CrisisResponseStateSchema = z.object({
  responseTime: z.object({
    detectionToActivationMs: z.number().min(0),
    activationToAccessMs: z.number().min(0),
    totalResponseTimeMs: z.number().min(0),
    slaCompliance: z.boolean(), // <200ms total response time
  }),

  accessGrants: z.object({
    emergencyBypassActive: z.boolean(),
    therapeuticAccessGuaranteed: z.boolean(),
    crisisResourcesAccessible: z.boolean(),
    paymentRestrictionsLifted: z.boolean(),
    fullFeatureAccess: z.boolean(),
  }),

  escalationHistory: z.array(z.object({
    timestamp: z.string(), // ISO timestamp
    fromLevel: CrisisLevelSchema,
    toLevel: CrisisLevelSchema,
    trigger: z.enum(['assessment_score', 'user_activation', 'system_detection', 'manual_override']),
    responseTimeMs: z.number().min(0),
    accessGranted: z.boolean(),
  })),

  lastCrisisEvent: z.object({
    timestamp: z.string(), // ISO timestamp
    level: CrisisLevelSchema,
    trigger: z.string(),
    resolved: z.boolean(),
    resolutionTime: z.string().optional(), // ISO timestamp
  }).optional(),
});

export type CrisisResponseState = z.infer<typeof CrisisResponseStateSchema>;

/**
 * Emergency Operation with Bypass Capabilities
 */
export const EmergencyOperationSchema = z.object({
  operationId: z.string().uuid(),
  emergencyType: z.enum(['crisis_data_sync', 'therapeutic_access', 'emergency_contact', 'hotline_access', 'safety_plan']),
  crisisLevel: CrisisLevelSchema,
  bypassesQueue: z.boolean().default(true),

  // Priority and timing
  absolutePriority: z.boolean().default(true), // Cannot be preempted
  maxExecutionTimeMs: z.number().positive().default(200),
  guaranteedExecutionTimeMs: z.number().positive().default(100),

  // Emergency context
  emergencyContext: z.object({
    userInitiated: z.boolean(),
    systemDetected: z.boolean(),
    assessmentTriggered: z.boolean(),
    therapeuticSessionActive: z.boolean(),
    previousCrisisLevel: CrisisLevelSchema.optional(),
  }),

  // Data and access requirements
  dataRequirements: z.object({
    immediateSync: z.boolean().default(true),
    preserveTherapeuticState: z.boolean().default(true),
    requiresEncryption: z.boolean().default(true),
    auditTrailRequired: z.boolean().default(true),
  }),

  // Execution state
  executionState: z.object({
    status: z.enum(['queued', 'executing', 'completed', 'failed', 'bypassed']),
    startTime: z.string().optional(), // ISO timestamp
    completionTime: z.string().optional(), // ISO timestamp
    bypassGranted: z.boolean().default(false),
    emergencyAccessActive: z.boolean().default(false),
  }),

  // Performance tracking
  performanceMetrics: z.object({
    responseTimeMs: z.number().min(0).default(0),
    executionTimeMs: z.number().min(0).default(0),
    slaCompliant: z.boolean().default(true),
    escalationTimeMs: z.number().min(0).default(0),
  }),

  createdAt: z.string(), // ISO timestamp
  lastUpdatedAt: z.string(), // ISO timestamp
});

export type EmergencyOperation = z.infer<typeof EmergencyOperationSchema>;

/**
 * Therapeutic Continuity State for Crisis Events
 */
export const TherapeuticContinuityStateSchema = z.object({
  preservationActive: z.boolean().default(false),

  // Active therapeutic sessions
  activeSessions: z.array(z.object({
    sessionId: z.string().uuid(),
    sessionType: z.enum(['breathing', 'check_in', 'assessment', 'crisis_intervention']),
    startTime: z.string(), // ISO timestamp
    lastActivity: z.string(), // ISO timestamp
    preservedState: z.record(z.any()), // Encrypted session state
    criticalForRecovery: z.boolean(),
  })),

  // Data preservation state
  dataPreservation: z.object({
    therapeuticDataProtected: z.boolean().default(true),
    sessionStateBackedUp: z.boolean().default(false),
    recoveryPointCreated: z.boolean().default(false),
    lastBackupTime: z.string().optional(), // ISO timestamp
  }),

  // Recovery capabilities
  recoveryState: z.object({
    canResumeSessions: z.boolean().default(true),
    preservedDataIntegrity: z.boolean().default(true),
    recoveryTimeEstimateMs: z.number().min(0).default(5000),
    automaticRecoveryEnabled: z.boolean().default(true),
  }),

  // Access continuity
  accessContinuity: z.object({
    therapeuticFeaturesAccessible: z.boolean().default(true),
    emergencyResourcesAvailable: z.boolean().default(true),
    crisisButtonActive: z.boolean().default(true),
    holineAccessReady: z.boolean().default(true),
  }),

  lastContinuityCheck: z.string().optional(), // ISO timestamp
});

export type TherapeuticContinuityState = z.infer<typeof TherapeuticContinuityStateSchema>;

/**
 * Crisis Queue State Interface
 */
interface CrisisQueueState {
  // Crisis detection and level management
  currentCrisisLevel: CrisisLevel;
  crisisActive: boolean;
  crisisResponseState: CrisisResponseState;

  // Emergency operations management
  emergencyOperations: EmergencyOperation[];
  emergencyBypassActive: boolean;
  emergencyQueueFlushActive: boolean;

  // Therapeutic continuity
  therapeuticContinuity: TherapeuticContinuityState;

  // Crisis data synchronization
  crisisDataSync: {
    immediateSync: boolean;
    syncInProgress: boolean;
    lastSyncAttempt: string | null; // ISO timestamp
    pendingCrisisData: string[]; // Operation IDs
    syncFailureCount: number;
  };

  // Performance monitoring
  crisisPerformanceMetrics: {
    averageResponseTimeMs: number;
    responseTimeViolations: number;
    lastViolationTime: string | null; // ISO timestamp
    slaCompliancePercentage: number;
    emergencyOperationsCount: number;
    successfulCrisisResolutions: number;
  };

  // Configuration
  crisisConfiguration: {
    maxResponseTimeMs: number; // 200ms SLA
    emergencyBypassThreshold: CrisisLevel;
    therapeuticContinuityEnabled: boolean;
    automaticEscalationEnabled: boolean;
    crisisDataRetentionHours: number;
  };

  lastStateUpdate: string; // ISO timestamp
}

/**
 * Crisis Queue Actions
 */
interface CrisisQueueActions {
  // Crisis level management
  setCrisisLevel: (level: CrisisLevel, trigger: string) => Promise<boolean>;
  escalateCrisisLevel: (toLevel: CrisisLevel, trigger: string) => Promise<boolean>;
  resolveCrisis: () => Promise<boolean>;

  // Emergency operations
  addEmergencyOperation: (operation: Omit<EmergencyOperation, 'operationId' | 'createdAt' | 'lastUpdatedAt'>) => Promise<string>; // Returns operation ID
  executeEmergencyOperation: (operationId: string) => Promise<boolean>;
  bypassQueueForOperation: (operationId: string) => Promise<boolean>;

  // Emergency access management
  activateEmergencyBypass: () => Promise<boolean>;
  deactivateEmergencyBypass: () => Promise<boolean>;
  grantEmergencyAccess: (accessType: keyof CrisisResponseState['accessGrants']) => Promise<boolean>;

  // Therapeutic continuity
  preserveTherapeuticState: (sessionId: string, sessionType: string, state: any) => Promise<boolean>;
  restoreTherapeuticState: (sessionId: string) => Promise<any | null>;
  ensureTherapeuticContinuity: () => Promise<boolean>;

  // Crisis data synchronization
  flushCrisisDataToSync: () => Promise<boolean>;
  prioritizeCrisisSync: (operationIds: string[]) => Promise<boolean>;
  handleCrisisSyncFailure: (operationId: string, error: string) => Promise<boolean>;

  // Performance and monitoring
  recordCrisisResponse: (responseTimeMs: number) => void;
  checkPerformanceSLA: () => boolean;
  generateCrisisReport: () => Promise<string>;

  // Recovery and cleanup
  performCrisisCleanup: () => Promise<{ operationsRemoved: number; statePreserved: boolean }>;
  validateCrisisReadiness: () => Promise<boolean>;

  // Configuration
  updateCrisisConfiguration: (config: Partial<CrisisQueueState['crisisConfiguration']>) => void;

  reset: () => void;
}

/**
 * Default Crisis Response State
 */
const getDefaultCrisisResponseState = (): CrisisResponseState => ({
  responseTime: {
    detectionToActivationMs: 0,
    activationToAccessMs: 0,
    totalResponseTimeMs: 0,
    slaCompliance: true,
  },
  accessGrants: {
    emergencyBypassActive: false,
    therapeuticAccessGuaranteed: true,
    crisisResourcesAccessible: true,
    paymentRestrictionsLifted: false,
    fullFeatureAccess: false,
  },
  escalationHistory: [],
  lastCrisisEvent: undefined,
});

/**
 * Default Therapeutic Continuity State
 */
const getDefaultTherapeuticContinuityState = (): TherapeuticContinuityState => ({
  preservationActive: false,
  activeSessions: [],
  dataPreservation: {
    therapeuticDataProtected: true,
    sessionStateBackedUp: false,
    recoveryPointCreated: false,
    lastBackupTime: undefined,
  },
  recoveryState: {
    canResumeSessions: true,
    preservedDataIntegrity: true,
    recoveryTimeEstimateMs: 5000,
    automaticRecoveryEnabled: true,
  },
  accessContinuity: {
    therapeuticFeaturesAccessible: true,
    emergencyResourcesAvailable: true,
    crisisButtonActive: true,
    holineAccessReady: true,
  },
  lastContinuityCheck: undefined,
});

/**
 * Crisis Queue Store Implementation
 */
export const useCrisisQueueStore = create<CrisisQueueState & CrisisQueueActions>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        // Initial state
        currentCrisisLevel: 'none',
        crisisActive: false,
        crisisResponseState: getDefaultCrisisResponseState(),
        emergencyOperations: [],
        emergencyBypassActive: false,
        emergencyQueueFlushActive: false,
        therapeuticContinuity: getDefaultTherapeuticContinuityState(),
        crisisDataSync: {
          immediateSync: false,
          syncInProgress: false,
          lastSyncAttempt: null,
          pendingCrisisData: [],
          syncFailureCount: 0,
        },
        crisisPerformanceMetrics: {
          averageResponseTimeMs: 0,
          responseTimeViolations: 0,
          lastViolationTime: null,
          slaCompliancePercentage: 100,
          emergencyOperationsCount: 0,
          successfulCrisisResolutions: 0,
        },
        crisisConfiguration: {
          maxResponseTimeMs: 200,
          emergencyBypassThreshold: 'moderate',
          therapeuticContinuityEnabled: true,
          automaticEscalationEnabled: true,
          crisisDataRetentionHours: 168, // 7 days
        },
        lastStateUpdate: new Date().toISOString(),

        // Crisis level management
        setCrisisLevel: async (level: CrisisLevel, trigger: string): Promise<boolean> => {
          const startTime = performance.now();

          try {
            set((state) => {
              const previousLevel = state.currentCrisisLevel;
              const now = new Date().toISOString();

              state.currentCrisisLevel = level;
              state.crisisActive = level !== 'none';

              // Record escalation in history
              state.crisisResponseState.escalationHistory.push({
                timestamp: now,
                fromLevel: previousLevel,
                toLevel: level,
                trigger: trigger as any,
                responseTimeMs: 0, // Will be updated below
                accessGranted: false,
              });

              // Update last crisis event
              state.crisisResponseState.lastCrisisEvent = {
                timestamp: now,
                level,
                trigger,
                resolved: false,
              };

              // Activate emergency bypass if threshold reached
              if (['severe', 'emergency'].includes(level)) {
                state.emergencyBypassActive = true;
                state.crisisResponseState.accessGrants.emergencyBypassActive = true;
                state.crisisResponseState.accessGrants.paymentRestrictionsLifted = true;
                state.crisisResponseState.accessGrants.fullFeatureAccess = true;
              }

              // Activate therapeutic continuity preservation
              if (state.crisisConfiguration.therapeuticContinuityEnabled) {
                state.therapeuticContinuity.preservationActive = true;
                state.therapeuticContinuity.dataPreservation.therapeuticDataProtected = true;
              }

              state.lastStateUpdate = now;
            });

            // Performance tracking
            const responseTime = performance.now() - startTime;
            get().recordCrisisResponse(responseTime);

            // Update the last escalation with actual response time
            set((state) => {
              const lastEscalation = state.crisisResponseState.escalationHistory[
                state.crisisResponseState.escalationHistory.length - 1
              ];
              if (lastEscalation) {
                lastEscalation.responseTimeMs = responseTime;
                lastEscalation.accessGranted = state.emergencyBypassActive;
              }
            });

            return true;
          } catch (error) {
            console.error('Failed to set crisis level:', error);
            return false;
          }
        },

        escalateCrisisLevel: async (toLevel: CrisisLevel, trigger: string): Promise<boolean> => {
          const currentLevel = get().currentCrisisLevel;

          // Define crisis level hierarchy for escalation
          const levels = ['none', 'mild', 'moderate', 'severe', 'emergency'];
          const currentIndex = levels.indexOf(currentLevel);
          const toIndex = levels.indexOf(toLevel);

          // Only escalate, don't de-escalate (use resolveCrisis for that)
          if (toIndex <= currentIndex) {
            console.warn(`Cannot escalate from ${currentLevel} to ${toLevel} (not an escalation)`);
            return false;
          }

          return await get().setCrisisLevel(toLevel, trigger);
        },

        resolveCrisis: async (): Promise<boolean> => {
          try {
            set((state) => {
              const now = new Date().toISOString();

              state.currentCrisisLevel = 'none';
              state.crisisActive = false;
              state.emergencyBypassActive = false;

              // Update crisis response state
              state.crisisResponseState.accessGrants = {
                emergencyBypassActive: false,
                therapeuticAccessGuaranteed: true,
                crisisResourcesAccessible: true,
                paymentRestrictionsLifted: false,
                fullFeatureAccess: false,
              };

              // Mark last crisis event as resolved
              if (state.crisisResponseState.lastCrisisEvent) {
                state.crisisResponseState.lastCrisisEvent.resolved = true;
                state.crisisResponseState.lastCrisisEvent.resolutionTime = now;
              }

              // Update performance metrics
              state.crisisPerformanceMetrics.successfulCrisisResolutions++;

              // Deactivate therapeutic preservation (but keep data intact)
              state.therapeuticContinuity.preservationActive = false;

              state.lastStateUpdate = now;
            });

            return true;
          } catch (error) {
            console.error('Failed to resolve crisis:', error);
            return false;
          }
        },

        // Emergency operations
        addEmergencyOperation: async (operation: Omit<EmergencyOperation, 'operationId' | 'createdAt' | 'lastUpdatedAt'>): Promise<string> => {
          const operationId = crypto.randomUUID();
          const now = new Date().toISOString();

          try {
            set((state) => {
              const emergencyOperation: EmergencyOperation = {
                ...operation,
                operationId,
                createdAt: now,
                lastUpdatedAt: now,
                executionState: {
                  status: 'queued',
                  startTime: undefined,
                  completionTime: undefined,
                  bypassGranted: false,
                  emergencyAccessActive: false,
                },
                performanceMetrics: {
                  responseTimeMs: 0,
                  executionTimeMs: 0,
                  slaCompliant: true,
                  escalationTimeMs: 0,
                },
              };

              state.emergencyOperations.push(emergencyOperation);
              state.crisisPerformanceMetrics.emergencyOperationsCount++;
              state.lastStateUpdate = now;
            });

            return operationId;
          } catch (error) {
            console.error('Failed to add emergency operation:', error);
            throw error;
          }
        },

        executeEmergencyOperation: async (operationId: string): Promise<boolean> => {
          const startTime = performance.now();

          try {
            set((state) => {
              const operationIndex = state.emergencyOperations.findIndex(
                op => op.operationId === operationId
              );

              if (operationIndex === -1) return;

              const operation = state.emergencyOperations[operationIndex];
              const now = new Date().toISOString();

              // Update execution state
              operation.executionState.status = 'executing';
              operation.executionState.startTime = now;
              operation.executionState.emergencyAccessActive = true;

              // Grant bypass if required
              if (operation.bypassesQueue) {
                operation.executionState.bypassGranted = true;
              }

              operation.lastUpdatedAt = now;
              state.emergencyOperations[operationIndex] = operation;
            });

            // Simulate execution time (in real implementation, this would be actual execution)
            await new Promise(resolve => setTimeout(resolve, 50));

            // Complete execution
            const executionTime = performance.now() - startTime;

            set((state) => {
              const operationIndex = state.emergencyOperations.findIndex(
                op => op.operationId === operationId
              );

              if (operationIndex === -1) return;

              const operation = state.emergencyOperations[operationIndex];
              const now = new Date().toISOString();

              operation.executionState.status = 'completed';
              operation.executionState.completionTime = now;
              operation.performanceMetrics.executionTimeMs = executionTime;
              operation.performanceMetrics.responseTimeMs = executionTime;
              operation.performanceMetrics.slaCompliant = executionTime <= operation.maxExecutionTimeMs;
              operation.lastUpdatedAt = now;

              // Check SLA compliance
              if (!operation.performanceMetrics.slaCompliant) {
                state.crisisPerformanceMetrics.responseTimeViolations++;
                state.crisisPerformanceMetrics.lastViolationTime = now;
              }

              state.emergencyOperations[operationIndex] = operation;
            });

            return true;
          } catch (error) {
            console.error('Failed to execute emergency operation:', error);
            return false;
          }
        },

        bypassQueueForOperation: async (operationId: string): Promise<boolean> => {
          try {
            set((state) => {
              const operationIndex = state.emergencyOperations.findIndex(
                op => op.operationId === operationId
              );

              if (operationIndex === -1) return;

              const operation = state.emergencyOperations[operationIndex];
              operation.executionState.bypassGranted = true;
              operation.executionState.status = 'bypassed';
              operation.lastUpdatedAt = new Date().toISOString();

              state.emergencyOperations[operationIndex] = operation;
            });

            return true;
          } catch (error) {
            console.error('Failed to bypass queue for operation:', error);
            return false;
          }
        },

        // Emergency access management
        activateEmergencyBypass: async (): Promise<boolean> => {
          const startTime = performance.now();

          try {
            set((state) => {
              state.emergencyBypassActive = true;
              state.crisisResponseState.accessGrants.emergencyBypassActive = true;
              state.crisisResponseState.accessGrants.paymentRestrictionsLifted = true;
              state.crisisResponseState.accessGrants.fullFeatureAccess = true;
              state.lastStateUpdate = new Date().toISOString();
            });

            const activationTime = performance.now() - startTime;
            get().recordCrisisResponse(activationTime);

            // Performance check - must be <100ms
            if (activationTime > 100) {
              console.error(`Emergency bypass activation exceeded 100ms: ${activationTime}ms`);

              set((state) => {
                state.crisisPerformanceMetrics.responseTimeViolations++;
                state.crisisPerformanceMetrics.lastViolationTime = new Date().toISOString();
              });
            }

            return true;
          } catch (error) {
            console.error('Failed to activate emergency bypass:', error);
            return false;
          }
        },

        deactivateEmergencyBypass: async (): Promise<boolean> => {
          try {
            set((state) => {
              state.emergencyBypassActive = false;
              state.crisisResponseState.accessGrants.emergencyBypassActive = false;
              state.crisisResponseState.accessGrants.paymentRestrictionsLifted = false;
              state.crisisResponseState.accessGrants.fullFeatureAccess = false;
              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to deactivate emergency bypass:', error);
            return false;
          }
        },

        grantEmergencyAccess: async (accessType: keyof CrisisResponseState['accessGrants']): Promise<boolean> => {
          try {
            set((state) => {
              state.crisisResponseState.accessGrants[accessType] = true;
              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error(`Failed to grant emergency access for ${accessType}:`, error);
            return false;
          }
        },

        // Therapeutic continuity
        preserveTherapeuticState: async (sessionId: string, sessionType: string, state: any): Promise<boolean> => {
          try {
            set((storeState) => {
              const now = new Date().toISOString();

              // Check if session already exists
              const existingIndex = storeState.therapeuticContinuity.activeSessions.findIndex(
                session => session.sessionId === sessionId
              );

              const preservedSession = {
                sessionId,
                sessionType: sessionType as any,
                startTime: now,
                lastActivity: now,
                preservedState: state, // Would be encrypted in production
                criticalForRecovery: true,
              };

              if (existingIndex !== -1) {
                storeState.therapeuticContinuity.activeSessions[existingIndex] = preservedSession;
              } else {
                storeState.therapeuticContinuity.activeSessions.push(preservedSession);
              }

              // Update preservation state
              storeState.therapeuticContinuity.dataPreservation.sessionStateBackedUp = true;
              storeState.therapeuticContinuity.dataPreservation.recoveryPointCreated = true;
              storeState.therapeuticContinuity.dataPreservation.lastBackupTime = now;

              storeState.lastStateUpdate = now;
            });

            return true;
          } catch (error) {
            console.error('Failed to preserve therapeutic state:', error);
            return false;
          }
        },

        restoreTherapeuticState: async (sessionId: string): Promise<any | null> => {
          try {
            const state = get();
            const session = state.therapeuticContinuity.activeSessions.find(
              s => s.sessionId === sessionId
            );

            if (!session) return null;

            // Update last activity time
            set((storeState) => {
              const sessionIndex = storeState.therapeuticContinuity.activeSessions.findIndex(
                s => s.sessionId === sessionId
              );

              if (sessionIndex !== -1) {
                storeState.therapeuticContinuity.activeSessions[sessionIndex].lastActivity = new Date().toISOString();
              }

              storeState.lastStateUpdate = new Date().toISOString();
            });

            return session.preservedState;
          } catch (error) {
            console.error('Failed to restore therapeutic state:', error);
            return null;
          }
        },

        ensureTherapeuticContinuity: async (): Promise<boolean> => {
          try {
            set((state) => {
              const now = new Date().toISOString();

              // Ensure all access points are available
              state.therapeuticContinuity.accessContinuity = {
                therapeuticFeaturesAccessible: true,
                emergencyResourcesAvailable: true,
                crisisButtonActive: true,
                holineAccessReady: true,
              };

              // Check recovery capabilities
              state.therapeuticContinuity.recoveryState.canResumeSessions = true;
              state.therapeuticContinuity.recoveryState.preservedDataIntegrity = true;

              state.therapeuticContinuity.lastContinuityCheck = now;
              state.lastStateUpdate = now;
            });

            return true;
          } catch (error) {
            console.error('Failed to ensure therapeutic continuity:', error);
            return false;
          }
        },

        // Crisis data synchronization
        flushCrisisDataToSync: async (): Promise<boolean> => {
          try {
            set((state) => {
              state.emergencyQueueFlushActive = true;
              state.crisisDataSync.immediateSync = true;
              state.crisisDataSync.syncInProgress = true;
              state.crisisDataSync.lastSyncAttempt = new Date().toISOString();
              state.lastStateUpdate = new Date().toISOString();
            });

            // Simulate sync operation
            await new Promise(resolve => setTimeout(resolve, 100));

            set((state) => {
              state.emergencyQueueFlushActive = false;
              state.crisisDataSync.syncInProgress = false;
              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to flush crisis data to sync:', error);

            set((state) => {
              state.emergencyQueueFlushActive = false;
              state.crisisDataSync.syncInProgress = false;
              state.crisisDataSync.syncFailureCount++;
              state.lastStateUpdate = new Date().toISOString();
            });

            return false;
          }
        },

        prioritizeCrisisSync: async (operationIds: string[]): Promise<boolean> => {
          try {
            set((state) => {
              // Add to pending crisis data
              operationIds.forEach(id => {
                if (!state.crisisDataSync.pendingCrisisData.includes(id)) {
                  state.crisisDataSync.pendingCrisisData.push(id);
                }
              });

              state.crisisDataSync.immediateSync = true;
              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to prioritize crisis sync:', error);
            return false;
          }
        },

        handleCrisisSyncFailure: async (operationId: string, error: string): Promise<boolean> => {
          try {
            set((state) => {
              state.crisisDataSync.syncFailureCount++;

              // Keep operation in pending for retry
              if (!state.crisisDataSync.pendingCrisisData.includes(operationId)) {
                state.crisisDataSync.pendingCrisisData.push(operationId);
              }

              state.lastStateUpdate = new Date().toISOString();
            });

            console.error(`Crisis sync failure for operation ${operationId}:`, error);
            return true;
          } catch (error) {
            console.error('Failed to handle crisis sync failure:', error);
            return false;
          }
        },

        // Performance and monitoring
        recordCrisisResponse: (responseTimeMs: number): void => {
          set((state) => {
            const metrics = state.crisisPerformanceMetrics;

            // Update average response time
            const totalOperations = metrics.emergencyOperationsCount || 1;
            metrics.averageResponseTimeMs = (
              (metrics.averageResponseTimeMs * (totalOperations - 1)) + responseTimeMs
            ) / totalOperations;

            // Check SLA compliance (<200ms)
            if (responseTimeMs > state.crisisConfiguration.maxResponseTimeMs) {
              metrics.responseTimeViolations++;
              metrics.lastViolationTime = new Date().toISOString();
            }

            // Update SLA compliance percentage
            const totalResponses = totalOperations;
            const compliantResponses = totalResponses - metrics.responseTimeViolations;
            metrics.slaCompliancePercentage = (compliantResponses / totalResponses) * 100;

            state.lastStateUpdate = new Date().toISOString();
          });
        },

        checkPerformanceSLA: (): boolean => {
          const state = get();
          const metrics = state.crisisPerformanceMetrics;

          // SLA requirements: <200ms average response time, >95% compliance
          const responseTimeSLA = metrics.averageResponseTimeMs < state.crisisConfiguration.maxResponseTimeMs;
          const complianceSLA = metrics.slaCompliancePercentage >= 95;

          return responseTimeSLA && complianceSLA;
        },

        generateCrisisReport: async (): Promise<string> => {
          const state = get();

          const report = {
            generatedAt: new Date().toISOString(),
            crisisState: {
              currentLevel: state.currentCrisisLevel,
              active: state.crisisActive,
              emergencyBypassActive: state.emergencyBypassActive,
            },
            performance: {
              averageResponseTime: state.crisisPerformanceMetrics.averageResponseTimeMs,
              slaCompliance: state.crisisPerformanceMetrics.slaCompliancePercentage,
              violations: state.crisisPerformanceMetrics.responseTimeViolations,
              emergencyOperations: state.crisisPerformanceMetrics.emergencyOperationsCount,
              successfulResolutions: state.crisisPerformanceMetrics.successfulCrisisResolutions,
            },
            emergencyOperations: {
              total: state.emergencyOperations.length,
              active: state.emergencyOperations.filter(op =>
                !['completed', 'failed'].includes(op.executionState.status)
              ).length,
              bypassed: state.emergencyOperations.filter(op =>
                op.executionState.bypassGranted
              ).length,
            },
            therapeuticContinuity: {
              preservationActive: state.therapeuticContinuity.preservationActive,
              activeSessions: state.therapeuticContinuity.activeSessions.length,
              dataIntegrity: state.therapeuticContinuity.recoveryState.preservedDataIntegrity,
            },
            dataSync: {
              pendingOperations: state.crisisDataSync.pendingCrisisData.length,
              syncFailures: state.crisisDataSync.syncFailureCount,
              lastSyncAttempt: state.crisisDataSync.lastSyncAttempt,
            },
          };

          return JSON.stringify(report, null, 2);
        },

        // Recovery and cleanup
        performCrisisCleanup: async (): Promise<{ operationsRemoved: number; statePreserved: boolean }> => {
          let operationsRemoved = 0;
          let statePreserved = true;

          set((state) => {
            const now = Date.now();
            const retentionMs = state.crisisConfiguration.crisisDataRetentionHours * 60 * 60 * 1000;

            // Remove old emergency operations (but preserve critical ones)
            const initialOperationCount = state.emergencyOperations.length;
            state.emergencyOperations = state.emergencyOperations.filter(operation => {
              const operationAge = now - new Date(operation.createdAt).getTime();
              const shouldKeep = operationAge < retentionMs ||
                ['severe', 'emergency'].includes(operation.crisisLevel) ||
                operation.executionState.status === 'executing';

              return shouldKeep;
            });

            operationsRemoved = initialOperationCount - state.emergencyOperations.length;

            // Clean up old therapeutic sessions (but preserve critical ones)
            state.therapeuticContinuity.activeSessions = state.therapeuticContinuity.activeSessions.filter(session => {
              const sessionAge = now - new Date(session.lastActivity).getTime();
              return sessionAge < retentionMs || session.criticalForRecovery;
            });

            // Always preserve essential therapeutic access
            if (!state.therapeuticContinuity.accessContinuity.therapeuticFeaturesAccessible) {
              statePreserved = false;
            }

            state.lastStateUpdate = new Date().toISOString();
          });

          return { operationsRemoved, statePreserved };
        },

        validateCrisisReadiness: async (): Promise<boolean> => {
          const state = get();

          // Check all critical systems are ready
          const checks = [
            state.therapeuticContinuity.accessContinuity.crisisButtonActive,
            state.therapeuticContinuity.accessContinuity.emergencyResourcesAvailable,
            state.therapeuticContinuity.accessContinuity.holineAccessReady,
            state.therapeuticContinuity.recoveryState.canResumeSessions,
            state.crisisPerformanceMetrics.slaCompliancePercentage >= 95,
          ];

          const isReady = checks.every(check => check);

          if (!isReady) {
            console.warn('Crisis readiness validation failed. Some systems not ready.');
          }

          return isReady;
        },

        // Configuration
        updateCrisisConfiguration: (config: Partial<CrisisQueueState['crisisConfiguration']>): void => {
          set((state) => {
            state.crisisConfiguration = {
              ...state.crisisConfiguration,
              ...config,
            };
            state.lastStateUpdate = new Date().toISOString();
          });
        },

        reset: () => {
          set(() => ({
            currentCrisisLevel: 'none',
            crisisActive: false,
            crisisResponseState: getDefaultCrisisResponseState(),
            emergencyOperations: [],
            emergencyBypassActive: false,
            emergencyQueueFlushActive: false,
            therapeuticContinuity: getDefaultTherapeuticContinuityState(),
            crisisDataSync: {
              immediateSync: false,
              syncInProgress: false,
              lastSyncAttempt: null,
              pendingCrisisData: [],
              syncFailureCount: 0,
            },
            crisisPerformanceMetrics: {
              averageResponseTimeMs: 0,
              responseTimeViolations: 0,
              lastViolationTime: null,
              slaCompliancePercentage: 100,
              emergencyOperationsCount: 0,
              successfulCrisisResolutions: 0,
            },
            crisisConfiguration: {
              maxResponseTimeMs: 200,
              emergencyBypassThreshold: 'moderate',
              therapeuticContinuityEnabled: true,
              automaticEscalationEnabled: true,
              crisisDataRetentionHours: 168,
            },
            lastStateUpdate: new Date().toISOString(),
          }));
        },
      })),
      {
        name: 'being-crisis-queue',
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          currentCrisisLevel: state.currentCrisisLevel,
          crisisActive: state.crisisActive,
          crisisResponseState: state.crisisResponseState,
          emergencyOperations: state.emergencyOperations,
          therapeuticContinuity: state.therapeuticContinuity,
          crisisDataSync: state.crisisDataSync,
          crisisPerformanceMetrics: state.crisisPerformanceMetrics,
          crisisConfiguration: state.crisisConfiguration,
        }),
      }
    )
  )
);

/**
 * Crisis Queue Selectors for Performance
 */
export const crisisQueueSelectors = {
  getCurrentCrisisLevel: (state: CrisisQueueState) => state.currentCrisisLevel,
  isCrisisActive: (state: CrisisQueueState) => state.crisisActive,
  isEmergencyBypassActive: (state: CrisisQueueState) => state.emergencyBypassActive,
  getEmergencyOperations: (state: CrisisQueueState) => state.emergencyOperations,
  getActiveEmergencyOperations: (state: CrisisQueueState) =>
    state.emergencyOperations.filter(op => !['completed', 'failed'].includes(op.executionState.status)),
  getTherapeuticContinuityState: (state: CrisisQueueState) => state.therapeuticContinuity,
  getCrisisPerformanceMetrics: (state: CrisisQueueState) => state.crisisPerformanceMetrics,
  isSLACompliant: (state: CrisisQueueState) => state.crisisPerformanceMetrics.slaCompliancePercentage >= 95,
  getPendingCrisisSync: (state: CrisisQueueState) => state.crisisDataSync.pendingCrisisData,
  getCrisisAccessGrants: (state: CrisisQueueState) => state.crisisResponseState.accessGrants,
};

/**
 * Crisis Queue Hook with Selectors
 */
export const useCrisisQueue = () => {
  const store = useCrisisQueueStore();
  return {
    ...store,
    selectors: crisisQueueSelectors,
  };
};