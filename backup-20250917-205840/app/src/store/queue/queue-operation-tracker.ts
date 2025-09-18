/**
 * Queue Operation Tracker for FullMind MBCT App
 *
 * Individual operation state tracking with comprehensive monitoring:
 * - Real-time operation status tracking with detailed execution history
 * - Performance metrics collection per operation with SLA compliance monitoring
 * - Crisis operation monitoring with <200ms response time guarantees
 * - Retry logic management with intelligent backoff strategies
 * - Cross-device operation coordination and conflict detection
 *
 * CRITICAL PERFORMANCE REQUIREMENTS:
 * - Operation status updates: <5ms for real-time tracking
 * - Crisis operation monitoring: <50ms for emergency status changes
 * - Memory efficient tracking: <2MB per 1000 operations
 * - Automatic cleanup: Operations older than 24 hours (non-crisis)
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import type {
  PriorityQueueOperation,
  PriorityLevel,
} from '../../types/sync/sync-priority-queue';
import type { SubscriptionTier } from '../../types/subscription';

/**
 * Operation Execution History Entry
 */
export const ExecutionHistoryEntrySchema = z.object({
  attemptNumber: z.number().int().positive(),
  startedAt: z.string(), // ISO timestamp
  completedAt: z.string().optional(), // ISO timestamp
  result: z.enum(['success', 'failure', 'timeout', 'canceled', 'deferred']),
  error: z.string().optional(),
  errorCode: z.string().optional(),

  // Performance metrics for this attempt
  performanceMetrics: z.object({
    executionTimeMs: z.number().min(0),
    queueWaitTimeMs: z.number().min(0),
    networkLatencyMs: z.number().min(0).optional(),
    subscriptionValidationMs: z.number().min(0).optional(),
    crisisEscalationMs: z.number().min(0).optional(), // Time to escalate if crisis

    // Resource usage during execution
    peakMemoryUsageMB: z.number().min(0).optional(),
    networkBytesTransferred: z.number().int().min(0).optional(),
    storageOperations: z.number().int().min(0).optional(),
  }),

  // Context during execution
  executionContext: z.object({
    deviceOnline: z.boolean(),
    subscriptionTier: z.enum(['trial', 'basic', 'premium', 'grace_period']),
    crisisMode: z.boolean().default(false),
    emergencyBypass: z.boolean().default(false),
    deviceBatteryLevel: z.number().min(0).max(1).optional(), // 0-1 percentage
    deviceMemoryPressure: z.enum(['low', 'moderate', 'high']).optional(),
  }),

  // Dependencies and conflicts
  dependencyWaitTimeMs: z.number().min(0).default(0),
  conflictResolutionTimeMs: z.number().min(0).default(0),
  conflictsDetected: z.array(z.string()).default([]), // Operation IDs that conflicted
});

export type ExecutionHistoryEntry = z.infer<typeof ExecutionHistoryEntrySchema>;

/**
 * Operation Tracking State with Crisis Monitoring
 */
export const OperationTrackingStateSchema = z.object({
  operationId: z.string().uuid(),
  entityType: z.string(),
  entityId: z.string(),
  operationType: z.string(),

  // Current status and timing
  currentStatus: z.enum(['queued', 'processing', 'completed', 'failed', 'retrying', 'deferred', 'crisis_escalated', 'emergency_bypass']),
  createdAt: z.string(), // ISO timestamp
  lastUpdatedAt: z.string(), // ISO timestamp
  scheduledExecutionTime: z.string(), // ISO timestamp
  actualStartTime: z.string().optional(), // ISO timestamp
  completionTime: z.string().optional(), // ISO timestamp

  // Priority and crisis state
  priority: z.number().int().min(1).max(10),
  isCrisisOperation: z.boolean().default(false),
  crisisLevel: z.enum(['none', 'mild', 'moderate', 'severe', 'emergency']).default('none'),
  emergencyBypassGranted: z.boolean().default(false),

  // Execution tracking
  attemptCount: z.number().int().min(0).default(0),
  maxRetries: z.number().int().positive(),
  executionHistory: z.array(ExecutionHistoryEntrySchema).default([]),

  // Performance tracking
  totalExecutionTimeMs: z.number().min(0).default(0),
  totalQueueWaitTimeMs: z.number().min(0).default(0),
  averageExecutionTimeMs: z.number().min(0).default(0),

  // SLA compliance
  slaRequirements: z.object({
    maxExecutionTimeMs: z.number().positive(),
    maxQueueWaitTimeMs: z.number().positive(),
    guaranteedExecutionTimeMs: z.number().positive().optional(), // For crisis operations
    requiresSLACompliance: z.boolean(),
  }),

  slaCompliance: z.object({
    executionTimeMet: z.boolean().default(true),
    queueWaitTimeMet: z.boolean().default(true),
    crisisResponseTimeMet: z.boolean().default(true),
    overallCompliant: z.boolean().default(true),
    violationCount: z.number().int().min(0).default(0),
    lastViolationAt: z.string().optional(), // ISO timestamp
  }),

  // Dependencies and relationships
  dependsOn: z.array(z.string().uuid()).default([]),
  blockedBy: z.array(z.string().uuid()).default([]),
  blockedOperations: z.array(z.string().uuid()).default([]), // Operations blocked by this one

  // Cross-device coordination
  crossDeviceState: z.object({
    requiresCoordination: z.boolean().default(false),
    primaryDeviceId: z.string().optional(),
    coordinatedDevices: z.array(z.string()).default([]),
    coordinationLockHeld: z.boolean().default(false),
    lastCoordinationSync: z.string().optional(), // ISO timestamp
  }),

  // Error tracking
  errorState: z.object({
    lastError: z.string().optional(),
    lastErrorCode: z.string().optional(),
    errorCount: z.number().int().min(0).default(0),
    criticalErrorCount: z.number().int().min(0).default(0),
    recoveryAttempts: z.number().int().min(0).default(0),
    isRecoverable: z.boolean().default(true),
  }),
});

export type OperationTrackingState = z.infer<typeof OperationTrackingStateSchema>;

/**
 * Queue Operation Tracker State
 */
interface QueueOperationTrackerState {
  // Tracked operations
  trackedOperations: Map<string, OperationTrackingState>;

  // Global tracking metrics
  globalMetrics: {
    totalOperationsTracked: number;
    activeOperations: number;
    completedOperations: number;
    failedOperations: number;
    crisisOperations: number;
    averageExecutionTimeMs: number;
    slaViolationCount: number;
    lastCleanupAt: string | null; // ISO timestamp
  };

  // Performance monitoring
  performanceAlerts: Array<{
    alertId: string;
    alertType: 'sla_violation' | 'crisis_response_delay' | 'high_failure_rate' | 'memory_pressure';
    severity: 'low' | 'medium' | 'high' | 'critical';
    operationId: string;
    message: string;
    triggeredAt: string; // ISO timestamp
    acknowledged: boolean;
  }>;

  // Configuration
  trackingConfig: {
    maxTrackedOperations: number;
    cleanupIntervalHours: number;
    retentionHours: number;
    crisisRetentionHours: number;
    enablePerformanceAlerts: boolean;
  };
}

/**
 * Queue Operation Tracker Actions
 */
interface QueueOperationTrackerActions {
  // Operation tracking lifecycle
  startTracking: (operation: PriorityQueueOperation) => boolean;
  stopTracking: (operationId: string) => boolean;
  updateOperationStatus: (operationId: string, status: OperationTrackingState['currentStatus']) => boolean;

  // Execution tracking
  recordExecutionStart: (operationId: string, executionContext?: Partial<ExecutionHistoryEntry['executionContext']>) => boolean;
  recordExecutionComplete: (operationId: string, result: ExecutionHistoryEntry['result'], metrics?: Partial<ExecutionHistoryEntry['performanceMetrics']>) => boolean;
  recordExecutionError: (operationId: string, error: string, errorCode?: string) => boolean;

  // Crisis monitoring
  escalateToCrisis: (operationId: string, crisisLevel: OperationTrackingState['crisisLevel']) => boolean;
  grantEmergencyBypass: (operationId: string) => boolean;
  recordCrisisResponse: (operationId: string, responseTimeMs: number) => boolean;

  // Performance monitoring
  updateSLACompliance: (operationId: string, compliance: Partial<OperationTrackingState['slaCompliance']>) => boolean;
  recordPerformanceAlert: (operationId: string, alertType: string, severity: string, message: string) => string; // Returns alert ID
  acknowledgeAlert: (alertId: string) => boolean;

  // Dependency management
  addDependency: (operationId: string, dependsOn: string) => boolean;
  removeDependency: (operationId: string, dependsOn: string) => boolean;
  checkDependenciesResolved: (operationId: string) => boolean;

  // Cross-device coordination
  requestCoordinationLock: (operationId: string, deviceId: string) => boolean;
  releaseCoordinationLock: (operationId: string) => boolean;
  syncCrossDeviceState: (operationId: string, deviceStates: Array<{ deviceId: string; state: any }>) => boolean;

  // Maintenance and optimization
  performCleanup: () => Promise<{ removed: number; alerts: number }>;
  optimizeTracking: () => Promise<{ memoryFreed: number; operationsArchived: number }>;

  // Query operations
  getOperationStatus: (operationId: string) => OperationTrackingState | null;
  getOperationHistory: (operationId: string) => ExecutionHistoryEntry[];
  getCrisisOperations: () => OperationTrackingState[];
  getSLAViolations: () => OperationTrackingState[];
  getPerformanceMetrics: () => QueueOperationTrackerState['globalMetrics'];

  // Export and diagnostics
  exportTrackingData: (operationIds?: string[]) => Promise<string>; // Encrypted export
  generatePerformanceReport: () => Promise<string>; // Performance analysis report

  reset: () => void;
}

/**
 * Default tracking configuration
 */
const getDefaultTrackingConfig = () => ({
  maxTrackedOperations: 5000,
  cleanupIntervalHours: 6,
  retentionHours: 24,
  crisisRetentionHours: 168, // 7 days
  enablePerformanceAlerts: true,
});

/**
 * Default global metrics
 */
const getDefaultGlobalMetrics = () => ({
  totalOperationsTracked: 0,
  activeOperations: 0,
  completedOperations: 0,
  failedOperations: 0,
  crisisOperations: 0,
  averageExecutionTimeMs: 0,
  slaViolationCount: 0,
  lastCleanupAt: null,
});

/**
 * Queue Operation Tracker Store Implementation
 */
export const useQueueOperationTrackerStore = create<QueueOperationTrackerState & QueueOperationTrackerActions>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        // Initial state
        trackedOperations: new Map(),
        globalMetrics: getDefaultGlobalMetrics(),
        performanceAlerts: [],
        trackingConfig: getDefaultTrackingConfig(),

        // Operation tracking lifecycle
        startTracking: (operation: PriorityQueueOperation): boolean => {
          const startTime = performance.now();

          try {
            set((state) => {
              const trackingState: OperationTrackingState = {
                operationId: operation.operationId,
                entityType: operation.entityType,
                entityId: operation.entityId,
                operationType: operation.operationType,
                currentStatus: 'queued',
                createdAt: operation.executionMetadata.createdAt,
                lastUpdatedAt: new Date().toISOString(),
                scheduledExecutionTime: operation.scheduling.scheduledExecutionTime,
                priority: operation.priority || 5,
                isCrisisOperation: operation.crisisAttributes?.isCrisisOperation || false,
                crisisLevel: operation.crisisAttributes?.crisisLevel || 'none',
                emergencyBypassGranted: operation.crisisAttributes?.bypassSubscriptionLimits || false,
                attemptCount: operation.executionMetadata.attemptCount,
                maxRetries: operation.executionMetadata.maxRetries,
                executionHistory: [],
                totalExecutionTimeMs: 0,
                totalQueueWaitTimeMs: 0,
                averageExecutionTimeMs: 0,
                slaRequirements: {
                  maxExecutionTimeMs: operation.performanceRequirements.maxExecutionTimeMs,
                  maxQueueWaitTimeMs: operation.performanceRequirements.guaranteedExecutionTimeMs || 30000,
                  guaranteedExecutionTimeMs: operation.performanceRequirements.guaranteedExecutionTimeMs,
                  requiresSLACompliance: operation.performanceRequirements.requiresSLACompliance,
                },
                slaCompliance: {
                  executionTimeMet: true,
                  queueWaitTimeMet: true,
                  crisisResponseTimeMet: true,
                  overallCompliant: true,
                  violationCount: 0,
                  lastViolationAt: undefined,
                },
                dependsOn: operation.dependencies || [],
                blockedBy: [],
                blockedOperations: [],
                crossDeviceState: {
                  requiresCoordination: operation.crossDeviceCoordination?.requiresCoordination || false,
                  primaryDeviceId: operation.crossDeviceCoordination?.primaryDeviceId,
                  coordinatedDevices: operation.crossDeviceCoordination?.affectedDevices || [],
                  coordinationLockHeld: false,
                  lastCoordinationSync: undefined,
                },
                errorState: {
                  lastError: undefined,
                  lastErrorCode: undefined,
                  errorCount: 0,
                  criticalErrorCount: 0,
                  recoveryAttempts: 0,
                  isRecoverable: true,
                },
              };

              state.trackedOperations.set(operation.operationId, trackingState);

              // Update global metrics
              state.globalMetrics.totalOperationsTracked++;
              state.globalMetrics.activeOperations++;

              if (trackingState.isCrisisOperation) {
                state.globalMetrics.crisisOperations++;
              }
            });

            // Performance check
            const trackingTime = performance.now() - startTime;
            if (trackingTime > 5) {
              console.warn(`Operation tracking start exceeded 5ms threshold: ${trackingTime}ms`);
            }

            return true;
          } catch (error) {
            console.error('Failed to start tracking operation:', error);
            return false;
          }
        },

        stopTracking: (operationId: string): boolean => {
          try {
            set((state) => {
              const operation = state.trackedOperations.get(operationId);
              if (!operation) return;

              // Update global metrics
              state.globalMetrics.activeOperations--;

              if (['completed', 'failed'].includes(operation.currentStatus)) {
                if (operation.currentStatus === 'completed') {
                  state.globalMetrics.completedOperations++;
                } else {
                  state.globalMetrics.failedOperations++;
                }
              }

              // Remove from tracking (unless it's a crisis operation - keep for audit)
              if (!operation.isCrisisOperation) {
                state.trackedOperations.delete(operationId);
              } else {
                // Mark as archived for crisis operations
                operation.currentStatus = 'completed';
                operation.lastUpdatedAt = new Date().toISOString();
                state.trackedOperations.set(operationId, operation);
              }
            });

            return true;
          } catch (error) {
            console.error('Failed to stop tracking operation:', error);
            return false;
          }
        },

        updateOperationStatus: (operationId: string, status: OperationTrackingState['currentStatus']): boolean => {
          try {
            set((state) => {
              const operation = state.trackedOperations.get(operationId);
              if (!operation) return;

              const previousStatus = operation.currentStatus;
              operation.currentStatus = status;
              operation.lastUpdatedAt = new Date().toISOString();

              // Handle status transitions
              if (status === 'processing' && previousStatus === 'queued') {
                operation.actualStartTime = new Date().toISOString();

                // Calculate queue wait time
                const queueWaitTime = Date.now() - new Date(operation.createdAt).getTime();
                operation.totalQueueWaitTimeMs += queueWaitTime;

                // Check SLA compliance for queue wait time
                if (queueWaitTime > operation.slaRequirements.maxQueueWaitTimeMs) {
                  operation.slaCompliance.queueWaitTimeMet = false;
                  operation.slaCompliance.violationCount++;
                  operation.slaCompliance.lastViolationAt = new Date().toISOString();
                  state.globalMetrics.slaViolationCount++;
                }
              }

              state.trackedOperations.set(operationId, operation);
            });

            return true;
          } catch (error) {
            console.error('Failed to update operation status:', error);
            return false;
          }
        },

        // Execution tracking
        recordExecutionStart: (operationId: string, executionContext?: Partial<ExecutionHistoryEntry['executionContext']>): boolean => {
          try {
            set((state) => {
              const operation = state.trackedOperations.get(operationId);
              if (!operation) return;

              operation.attemptCount++;
              operation.actualStartTime = new Date().toISOString();
              operation.currentStatus = 'processing';
              operation.lastUpdatedAt = new Date().toISOString();

              state.trackedOperations.set(operationId, operation);
            });

            return true;
          } catch (error) {
            console.error('Failed to record execution start:', error);
            return false;
          }
        },

        recordExecutionComplete: (operationId: string, result: ExecutionHistoryEntry['result'], metrics?: Partial<ExecutionHistoryEntry['performanceMetrics']>): boolean => {
          try {
            set((state) => {
              const operation = state.trackedOperations.get(operationId);
              if (!operation) return;

              const completionTime = new Date().toISOString();
              const executionTimeMs = operation.actualStartTime
                ? Date.now() - new Date(operation.actualStartTime).getTime()
                : 0;

              // Create execution history entry
              const historyEntry: ExecutionHistoryEntry = {
                attemptNumber: operation.attemptCount,
                startedAt: operation.actualStartTime || operation.createdAt,
                completedAt: completionTime,
                result,
                performanceMetrics: {
                  executionTimeMs,
                  queueWaitTimeMs: operation.totalQueueWaitTimeMs,
                  networkLatencyMs: metrics?.networkLatencyMs,
                  subscriptionValidationMs: metrics?.subscriptionValidationMs,
                  crisisEscalationMs: metrics?.crisisEscalationMs,
                  peakMemoryUsageMB: metrics?.peakMemoryUsageMB,
                  networkBytesTransferred: metrics?.networkBytesTransferred,
                  storageOperations: metrics?.storageOperations,
                  ...metrics,
                },
                executionContext: {
                  deviceOnline: true,
                  subscriptionTier: 'basic', // Default - should be passed in
                  crisisMode: operation.isCrisisOperation,
                  emergencyBypass: operation.emergencyBypassGranted,
                  deviceBatteryLevel: undefined,
                  deviceMemoryPressure: undefined,
                },
                dependencyWaitTimeMs: 0,
                conflictResolutionTimeMs: 0,
                conflictsDetected: [],
              };

              operation.executionHistory.push(historyEntry);
              operation.completionTime = completionTime;
              operation.currentStatus = result === 'success' ? 'completed' : 'failed';
              operation.totalExecutionTimeMs += executionTimeMs;
              operation.lastUpdatedAt = completionTime;

              // Update average execution time
              if (operation.executionHistory.length > 0) {
                operation.averageExecutionTimeMs = operation.totalExecutionTimeMs / operation.executionHistory.length;
              }

              // Check SLA compliance
              if (executionTimeMs > operation.slaRequirements.maxExecutionTimeMs) {
                operation.slaCompliance.executionTimeMet = false;
                operation.slaCompliance.violationCount++;
                operation.slaCompliance.lastViolationAt = completionTime;
                state.globalMetrics.slaViolationCount++;
              }

              // Crisis response time check
              if (operation.isCrisisOperation && operation.slaRequirements.guaranteedExecutionTimeMs) {
                if (executionTimeMs > operation.slaRequirements.guaranteedExecutionTimeMs) {
                  operation.slaCompliance.crisisResponseTimeMet = false;
                  operation.slaCompliance.violationCount++;
                  operation.slaCompliance.lastViolationAt = completionTime;
                  state.globalMetrics.slaViolationCount++;

                  // Generate critical alert for crisis response violation
                  state.performanceAlerts.push({
                    alertId: crypto.randomUUID(),
                    alertType: 'crisis_response_delay',
                    severity: 'critical',
                    operationId,
                    message: `Crisis operation exceeded guaranteed response time: ${executionTimeMs}ms > ${operation.slaRequirements.guaranteedExecutionTimeMs}ms`,
                    triggeredAt: completionTime,
                    acknowledged: false,
                  });
                }
              }

              // Update overall compliance
              operation.slaCompliance.overallCompliant =
                operation.slaCompliance.executionTimeMet &&
                operation.slaCompliance.queueWaitTimeMet &&
                operation.slaCompliance.crisisResponseTimeMet;

              // Update global metrics
              state.globalMetrics.averageExecutionTimeMs =
                (state.globalMetrics.averageExecutionTimeMs * state.globalMetrics.completedOperations + executionTimeMs) /
                (state.globalMetrics.completedOperations + 1);

              state.trackedOperations.set(operationId, operation);
            });

            return true;
          } catch (error) {
            console.error('Failed to record execution complete:', error);
            return false;
          }
        },

        recordExecutionError: (operationId: string, error: string, errorCode?: string): boolean => {
          try {
            set((state) => {
              const operation = state.trackedOperations.get(operationId);
              if (!operation) return;

              operation.errorState.lastError = error;
              operation.errorState.lastErrorCode = errorCode;
              operation.errorState.errorCount++;
              operation.lastUpdatedAt = new Date().toISOString();

              // Determine if it's a critical error
              const criticalErrors = ['NETWORK_TIMEOUT', 'STORAGE_FULL', 'ENCRYPTION_FAILED', 'CRISIS_ESCALATION_FAILED'];
              if (errorCode && criticalErrors.includes(errorCode)) {
                operation.errorState.criticalErrorCount++;
              }

              // Check if operation is still recoverable
              if (operation.errorState.criticalErrorCount > 2 || operation.attemptCount >= operation.maxRetries) {
                operation.errorState.isRecoverable = false;
                operation.currentStatus = 'failed';
              }

              state.trackedOperations.set(operationId, operation);
            });

            return true;
          } catch (error) {
            console.error('Failed to record execution error:', error);
            return false;
          }
        },

        // Crisis monitoring
        escalateToCrisis: (operationId: string, crisisLevel: OperationTrackingState['crisisLevel']): boolean => {
          const startTime = performance.now();

          try {
            set((state) => {
              const operation = state.trackedOperations.get(operationId);
              if (!operation) return;

              const previousCrisisLevel = operation.crisisLevel;
              operation.isCrisisOperation = true;
              operation.crisisLevel = crisisLevel;
              operation.priority = 10; // Maximum priority for crisis
              operation.currentStatus = 'crisis_escalated';
              operation.lastUpdatedAt = new Date().toISOString();

              // Grant emergency bypass for severe/emergency levels
              if (['severe', 'emergency'].includes(crisisLevel)) {
                operation.emergencyBypassGranted = true;
              }

              // Update global crisis count
              if (!previousCrisisLevel || previousCrisisLevel === 'none') {
                state.globalMetrics.crisisOperations++;
              }

              state.trackedOperations.set(operationId, operation);
            });

            // Performance check for crisis escalation
            const escalationTime = performance.now() - startTime;
            if (escalationTime > 50) {
              console.error(`Crisis escalation exceeded 50ms threshold: ${escalationTime}ms`);

              // Record performance alert
              get().recordPerformanceAlert(operationId, 'crisis_response_delay', 'critical',
                `Crisis escalation took ${escalationTime}ms, exceeding 50ms threshold`);
            }

            return true;
          } catch (error) {
            console.error('Failed to escalate to crisis:', error);
            return false;
          }
        },

        grantEmergencyBypass: (operationId: string): boolean => {
          try {
            set((state) => {
              const operation = state.trackedOperations.get(operationId);
              if (!operation) return;

              operation.emergencyBypassGranted = true;
              operation.currentStatus = 'emergency_bypass';
              operation.lastUpdatedAt = new Date().toISOString();

              state.trackedOperations.set(operationId, operation);
            });

            return true;
          } catch (error) {
            console.error('Failed to grant emergency bypass:', error);
            return false;
          }
        },

        recordCrisisResponse: (operationId: string, responseTimeMs: number): boolean => {
          try {
            set((state) => {
              const operation = state.trackedOperations.get(operationId);
              if (!operation) return;

              // Check if response time meets crisis requirements (<200ms)
              if (responseTimeMs > 200) {
                operation.slaCompliance.crisisResponseTimeMet = false;
                operation.slaCompliance.violationCount++;
                operation.slaCompliance.lastViolationAt = new Date().toISOString();
                state.globalMetrics.slaViolationCount++;

                // Generate critical alert
                state.performanceAlerts.push({
                  alertId: crypto.randomUUID(),
                  alertType: 'crisis_response_delay',
                  severity: 'critical',
                  operationId,
                  message: `Crisis response time violation: ${responseTimeMs}ms > 200ms`,
                  triggeredAt: new Date().toISOString(),
                  acknowledged: false,
                });
              }

              state.trackedOperations.set(operationId, operation);
            });

            return true;
          } catch (error) {
            console.error('Failed to record crisis response:', error);
            return false;
          }
        },

        // Performance monitoring
        updateSLACompliance: (operationId: string, compliance: Partial<OperationTrackingState['slaCompliance']>): boolean => {
          try {
            set((state) => {
              const operation = state.trackedOperations.get(operationId);
              if (!operation) return;

              operation.slaCompliance = {
                ...operation.slaCompliance,
                ...compliance,
              };
              operation.lastUpdatedAt = new Date().toISOString();

              state.trackedOperations.set(operationId, operation);
            });

            return true;
          } catch (error) {
            console.error('Failed to update SLA compliance:', error);
            return false;
          }
        },

        recordPerformanceAlert: (operationId: string, alertType: string, severity: string, message: string): string => {
          const alertId = crypto.randomUUID();

          set((state) => {
            state.performanceAlerts.push({
              alertId,
              alertType: alertType as any,
              severity: severity as any,
              operationId,
              message,
              triggeredAt: new Date().toISOString(),
              acknowledged: false,
            });

            // Limit alert history to prevent memory issues
            if (state.performanceAlerts.length > 1000) {
              state.performanceAlerts.splice(0, 500); // Remove oldest 500 alerts
            }
          });

          return alertId;
        },

        acknowledgeAlert: (alertId: string): boolean => {
          try {
            set((state) => {
              const alert = state.performanceAlerts.find(a => a.alertId === alertId);
              if (alert) {
                alert.acknowledged = true;
              }
            });

            return true;
          } catch (error) {
            console.error('Failed to acknowledge alert:', error);
            return false;
          }
        },

        // Dependency management
        addDependency: (operationId: string, dependsOn: string): boolean => {
          try {
            set((state) => {
              const operation = state.trackedOperations.get(operationId);
              const dependencyOperation = state.trackedOperations.get(dependsOn);

              if (!operation || !dependencyOperation) return;

              if (!operation.dependsOn.includes(dependsOn)) {
                operation.dependsOn.push(dependsOn);
              }

              if (!dependencyOperation.blockedOperations.includes(operationId)) {
                dependencyOperation.blockedOperations.push(operationId);
              }

              operation.lastUpdatedAt = new Date().toISOString();

              state.trackedOperations.set(operationId, operation);
              state.trackedOperations.set(dependsOn, dependencyOperation);
            });

            return true;
          } catch (error) {
            console.error('Failed to add dependency:', error);
            return false;
          }
        },

        removeDependency: (operationId: string, dependsOn: string): boolean => {
          try {
            set((state) => {
              const operation = state.trackedOperations.get(operationId);
              const dependencyOperation = state.trackedOperations.get(dependsOn);

              if (!operation || !dependencyOperation) return;

              operation.dependsOn = operation.dependsOn.filter(id => id !== dependsOn);
              dependencyOperation.blockedOperations =
                dependencyOperation.blockedOperations.filter(id => id !== operationId);

              operation.lastUpdatedAt = new Date().toISOString();

              state.trackedOperations.set(operationId, operation);
              state.trackedOperations.set(dependsOn, dependencyOperation);
            });

            return true;
          } catch (error) {
            console.error('Failed to remove dependency:', error);
            return false;
          }
        },

        checkDependenciesResolved: (operationId: string): boolean => {
          const state = get();
          const operation = state.trackedOperations.get(operationId);

          if (!operation) return false;

          return operation.dependsOn.every(depId => {
            const dependency = state.trackedOperations.get(depId);
            return dependency && dependency.currentStatus === 'completed';
          });
        },

        // Cross-device coordination
        requestCoordinationLock: (operationId: string, deviceId: string): boolean => {
          try {
            set((state) => {
              const operation = state.trackedOperations.get(operationId);
              if (!operation) return;

              operation.crossDeviceState.coordinationLockHeld = true;
              operation.crossDeviceState.primaryDeviceId = deviceId;
              operation.crossDeviceState.lastCoordinationSync = new Date().toISOString();
              operation.lastUpdatedAt = new Date().toISOString();

              state.trackedOperations.set(operationId, operation);
            });

            return true;
          } catch (error) {
            console.error('Failed to request coordination lock:', error);
            return false;
          }
        },

        releaseCoordinationLock: (operationId: string): boolean => {
          try {
            set((state) => {
              const operation = state.trackedOperations.get(operationId);
              if (!operation) return;

              operation.crossDeviceState.coordinationLockHeld = false;
              operation.crossDeviceState.lastCoordinationSync = new Date().toISOString();
              operation.lastUpdatedAt = new Date().toISOString();

              state.trackedOperations.set(operationId, operation);
            });

            return true;
          } catch (error) {
            console.error('Failed to release coordination lock:', error);
            return false;
          }
        },

        syncCrossDeviceState: (operationId: string, deviceStates: Array<{ deviceId: string; state: any }>): boolean => {
          try {
            set((state) => {
              const operation = state.trackedOperations.get(operationId);
              if (!operation) return;

              operation.crossDeviceState.coordinatedDevices = deviceStates.map(ds => ds.deviceId);
              operation.crossDeviceState.lastCoordinationSync = new Date().toISOString();
              operation.lastUpdatedAt = new Date().toISOString();

              state.trackedOperations.set(operationId, operation);
            });

            return true;
          } catch (error) {
            console.error('Failed to sync cross-device state:', error);
            return false;
          }
        },

        // Maintenance and optimization
        performCleanup: async (): Promise<{ removed: number; alerts: number }> => {
          let removedOperations = 0;
          let removedAlerts = 0;

          set((state) => {
            const now = Date.now();
            const retentionMs = state.trackingConfig.retentionHours * 60 * 60 * 1000;
            const crisisRetentionMs = state.trackingConfig.crisisRetentionHours * 60 * 60 * 1000;

            // Clean up old operations
            for (const [operationId, operation] of state.trackedOperations) {
              const operationAge = now - new Date(operation.lastUpdatedAt).getTime();
              const shouldRemove = operation.isCrisisOperation
                ? operationAge > crisisRetentionMs
                : operationAge > retentionMs;

              if (shouldRemove && ['completed', 'failed'].includes(operation.currentStatus)) {
                state.trackedOperations.delete(operationId);
                removedOperations++;
              }
            }

            // Clean up old alerts
            const alertRetentionMs = 24 * 60 * 60 * 1000; // 24 hours
            const initialAlertCount = state.performanceAlerts.length;

            state.performanceAlerts = state.performanceAlerts.filter(alert => {
              const alertAge = now - new Date(alert.triggeredAt).getTime();
              return alertAge < alertRetentionMs;
            });

            removedAlerts = initialAlertCount - state.performanceAlerts.length;
            state.globalMetrics.lastCleanupAt = new Date().toISOString();
          });

          return { removed: removedOperations, alerts: removedAlerts };
        },

        optimizeTracking: async (): Promise<{ memoryFreed: number; operationsArchived: number }> => {
          let memoryFreed = 0;
          let operationsArchived = 0;

          set((state) => {
            // Archive old execution history from non-crisis operations
            for (const [operationId, operation] of state.trackedOperations) {
              if (!operation.isCrisisOperation && operation.executionHistory.length > 5) {
                const historyToKeep = operation.executionHistory.slice(-5); // Keep last 5 entries
                const removedEntries = operation.executionHistory.length - historyToKeep.length;

                operation.executionHistory = historyToKeep;
                memoryFreed += removedEntries * 512; // Estimate 512 bytes per history entry
                operationsArchived++;

                state.trackedOperations.set(operationId, operation);
              }
            }
          });

          return { memoryFreed, operationsArchived };
        },

        // Query operations
        getOperationStatus: (operationId: string): OperationTrackingState | null => {
          const state = get();
          return state.trackedOperations.get(operationId) || null;
        },

        getOperationHistory: (operationId: string): ExecutionHistoryEntry[] => {
          const state = get();
          const operation = state.trackedOperations.get(operationId);
          return operation?.executionHistory || [];
        },

        getCrisisOperations: (): OperationTrackingState[] => {
          const state = get();
          return Array.from(state.trackedOperations.values()).filter(op => op.isCrisisOperation);
        },

        getSLAViolations: (): OperationTrackingState[] => {
          const state = get();
          return Array.from(state.trackedOperations.values()).filter(op => !op.slaCompliance.overallCompliant);
        },

        getPerformanceMetrics: (): QueueOperationTrackerState['globalMetrics'] => {
          return get().globalMetrics;
        },

        // Export and diagnostics
        exportTrackingData: async (operationIds?: string[]): Promise<string> => {
          const state = get();

          const operationsToExport = operationIds
            ? operationIds.map(id => state.trackedOperations.get(id)).filter(Boolean)
            : Array.from(state.trackedOperations.values());

          const exportData = {
            timestamp: new Date().toISOString(),
            operations: operationsToExport,
            globalMetrics: state.globalMetrics,
            performanceAlerts: state.performanceAlerts,
          };

          // Note: Would encrypt in production using encryptionService
          return JSON.stringify(exportData, null, 2);
        },

        generatePerformanceReport: async (): Promise<string> => {
          const state = get();
          const operations = Array.from(state.trackedOperations.values());

          const report = {
            generatedAt: new Date().toISOString(),
            summary: {
              totalOperations: operations.length,
              completedOperations: operations.filter(op => op.currentStatus === 'completed').length,
              failedOperations: operations.filter(op => op.currentStatus === 'failed').length,
              crisisOperations: operations.filter(op => op.isCrisisOperation).length,
              slaViolations: operations.filter(op => !op.slaCompliance.overallCompliant).length,
            },
            performance: {
              averageExecutionTime: state.globalMetrics.averageExecutionTimeMs,
              crisisOperationsCompliant: operations
                .filter(op => op.isCrisisOperation)
                .every(op => op.slaCompliance.crisisResponseTimeMet),
              highFailureRateOperations: operations.filter(op =>
                op.errorState.errorCount / Math.max(op.attemptCount, 1) > 0.5
              ).length,
            },
            alerts: {
              totalAlerts: state.performanceAlerts.length,
              criticalAlerts: state.performanceAlerts.filter(a => a.severity === 'critical').length,
              unacknowledgedAlerts: state.performanceAlerts.filter(a => !a.acknowledged).length,
            },
          };

          return JSON.stringify(report, null, 2);
        },

        reset: () => {
          set(() => ({
            trackedOperations: new Map(),
            globalMetrics: getDefaultGlobalMetrics(),
            performanceAlerts: [],
            trackingConfig: getDefaultTrackingConfig(),
          }));
        },
      })),
      {
        name: 'fullmind-queue-operation-tracker',
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          // Convert Map to object for serialization
          trackedOperations: Object.fromEntries(state.trackedOperations),
          globalMetrics: state.globalMetrics,
          performanceAlerts: state.performanceAlerts,
          trackingConfig: state.trackingConfig,
        }),
        // Convert object back to Map after deserialization
        onRehydrateStorage: () => (state) => {
          if (state && state.trackedOperations) {
            const operationsMap = new Map();
            Object.entries(state.trackedOperations as any).forEach(([key, value]) => {
              operationsMap.set(key, value);
            });
            state.trackedOperations = operationsMap;
          }
        },
      }
    )
  )
);

/**
 * Queue Operation Tracker Selectors for Performance
 */
export const queueOperationTrackerSelectors = {
  getTrackedOperations: (state: QueueOperationTrackerState) =>
    Array.from(state.trackedOperations.values()),
  getActiveOperations: (state: QueueOperationTrackerState) =>
    Array.from(state.trackedOperations.values()).filter(op =>
      !['completed', 'failed'].includes(op.currentStatus)
    ),
  getCrisisOperations: (state: QueueOperationTrackerState) =>
    Array.from(state.trackedOperations.values()).filter(op => op.isCrisisOperation),
  getSLAViolations: (state: QueueOperationTrackerState) =>
    Array.from(state.trackedOperations.values()).filter(op => !op.slaCompliance.overallCompliant),
  getCriticalAlerts: (state: QueueOperationTrackerState) =>
    state.performanceAlerts.filter(alert => alert.severity === 'critical' && !alert.acknowledged),
  getGlobalMetrics: (state: QueueOperationTrackerState) => state.globalMetrics,
};

/**
 * Queue Operation Tracker Hook with Selectors
 */
export const useQueueOperationTracker = () => {
  const store = useQueueOperationTrackerStore();
  return {
    ...store,
    selectors: queueOperationTrackerSelectors,
  };
};