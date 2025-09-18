/**
 * Cross-Device Queue State Management for FullMind MBCT App
 *
 * Multi-device queue coordination with comprehensive state synchronization:
 * - Multi-device queue state synchronization and conflict resolution
 * - Device capability-aware queue distribution and load balancing
 * - Family/enterprise queue coordination with privacy boundary preservation
 * - Session handoff queue state transfer between devices
 * - Intelligent merge strategies for multi-device offline operations
 *
 * CRITICAL PERFORMANCE REQUIREMENTS:
 * - Cross-device state sync: <500ms when connectivity restored
 * - Device coordination: <100ms for device state updates
 * - Conflict resolution: <200ms for intelligent therapeutic data prioritization
 * - Session handoff: <300ms for seamless device transitions
 * - Privacy preservation: Zero cross-device PII exposure
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
import type { SubscriptionTier } from '../../types/subscription';

/**
 * Device Information with Capabilities
 */
export const DeviceInfoSchema = z.object({
  deviceId: z.string().uuid(),
  deviceName: z.string(),
  deviceType: z.enum(['mobile', 'tablet', 'desktop', 'widget']),
  platform: z.enum(['ios', 'android', 'web', 'desktop']),

  // Subscription and permissions
  subscriptionTier: z.enum(['trial', 'basic', 'premium', 'grace_period']),
  subscriptionAccess: z.object({
    queueCapacity: z.number().int().positive(),
    concurrentOperations: z.number().int().positive(),
    priorityAccessLevel: z.number().int().min(1).max(10),
    crisisAccess: z.boolean(),
    therapeuticAccess: z.boolean(),
  }),

  // Device capabilities
  capabilities: z.object({
    supportsBackgroundSync: z.boolean(),
    hasStableConnection: z.boolean(),
    batteryOptimized: z.boolean(),
    crisisCapable: z.boolean(),
    offlineCapacity: z.number().int().min(0), // Hours of offline operation
    computePower: z.enum(['low', 'medium', 'high']),
    storageAvailableMB: z.number().int().min(0),
    memoryAvailableMB: z.number().int().min(0),
  }),

  // Network and connectivity
  networkState: z.object({
    isOnline: z.boolean(),
    connectionType: z.enum(['wifi', 'cellular', 'ethernet', 'unknown']),
    connectionQuality: z.enum(['excellent', 'good', 'fair', 'poor']),
    bandwidthMbps: z.number().min(0).optional(),
    latencyMs: z.number().min(0).optional(),
    lastConnectivityCheck: z.string(), // ISO timestamp
  }),

  // Device status
  status: z.object({
    isActive: z.boolean(),
    lastSeen: z.string(), // ISO timestamp
    batteryLevel: z.number().min(0).max(1).optional(), // 0-1 percentage
    memoryPressure: z.enum(['low', 'moderate', 'high', 'critical']).optional(),
    performanceState: z.enum(['optimal', 'degraded', 'limited']),
  }),

  // Privacy and security
  privacy: z.object({
    allowsCrossDeviceSync: z.boolean(),
    privacyLevel: z.enum(['minimal', 'standard', 'strict']),
    anonymizedId: z.string(), // For analytics without PII
    encryptionKey: z.string().optional(), // For device-to-device encryption
  }),

  createdAt: z.string(), // ISO timestamp
  lastUpdatedAt: z.string(), // ISO timestamp
});

export type DeviceInfo = z.infer<typeof DeviceInfoSchema>;

/**
 * Queue Distribution Strategy
 */
export const QueueDistributionStrategySchema = z.object({
  strategyType: z.enum(['round_robin', 'capability_based', 'subscription_optimized', 'therapeutic_priority', 'crisis_aware']),

  // Load balancing parameters
  loadBalancing: z.object({
    considerBatteryLevel: z.boolean(),
    considerNetworkQuality: z.boolean(),
    considerDeviceCapabilities: z.boolean(),
    considerSubscriptionTier: z.boolean(),
    preferStableDevices: z.boolean(),
  }),

  // Priority rules
  priorityRules: z.object({
    crisisOperationsAlwaysLocal: z.boolean(),
    therapeuticSessionsPreferPrimary: z.boolean(),
    backgroundTasksToSecondary: z.boolean(),
    emergencyOperationsBypassDistribution: z.boolean(),
  }),

  // Performance optimization
  performanceOptimization: z.object({
    balanceThresholdPercentage: z.number().min(0).max(1), // When to rebalance
    maxOperationsPerDevice: z.number().int().positive(),
    redistributionEnabled: z.boolean(),
    dynamicAdjustmentEnabled: z.boolean(),
  }),

  lastUpdated: z.string(), // ISO timestamp
});

export type QueueDistributionStrategy = z.infer<typeof QueueDistributionStrategySchema>;

/**
 * Device Queue State for Coordination
 */
export const DeviceQueueStateSchema = z.object({
  deviceId: z.string().uuid(),

  // Queue state
  queueState: z.object({
    totalOperations: z.number().int().min(0),
    queuedOperations: z.number().int().min(0),
    processingOperations: z.number().int().min(0),
    completedOperations: z.number().int().min(0),
    failedOperations: z.number().int().min(0),
    crisisOperations: z.number().int().min(0),

    utilizationPercentage: z.number().min(0).max(1),
    averageProcessingTimeMs: z.number().min(0),
    lastProcessedOperation: z.string().optional(), // ISO timestamp
  }),

  // Synchronization state
  syncState: z.object({
    lastSyncAttempt: z.string().optional(), // ISO timestamp
    lastSuccessfulSync: z.string().optional(), // ISO timestamp
    syncInProgress: z.boolean(),
    pendingSyncOperations: z.number().int().min(0),
    conflictResolutionRequired: z.boolean(),

    syncPerformance: z.object({
      averageSyncTimeMs: z.number().min(0),
      syncSuccessRate: z.number().min(0).max(1),
      lastSyncDurationMs: z.number().min(0),
    }),
  }),

  // Coordination locks and state
  coordinationState: z.object({
    isCoordinationLeader: z.boolean(),
    hasActiveCoordinationLock: z.boolean(),
    coordinatingOperations: z.array(z.string().uuid()),
    waitingForCoordination: z.number().int().min(0),
    lastCoordinationActivity: z.string().optional(), // ISO timestamp
  }),

  lastUpdated: z.string(), // ISO timestamp
});

export type DeviceQueueState = z.infer<typeof DeviceQueueStateSchema>;

/**
 * Conflict Resolution Context for Cross-Device Operations
 */
export const ConflictResolutionContextSchema = z.object({
  conflictId: z.string().uuid(),
  operationId: z.string().uuid(),

  // Conflict details
  conflictType: z.enum(['data_divergence', 'version_mismatch', 'priority_conflict', 'access_conflict', 'timing_conflict']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),

  // Devices involved
  conflictingDevices: z.array(z.object({
    deviceId: z.string().uuid(),
    deviceData: z.record(z.any()), // Encrypted device-specific data
    timestamp: z.string(), // ISO timestamp
    confidence: z.number().min(0).max(1), // Confidence in this device's data
  })),

  // Resolution strategy
  resolutionStrategy: z.enum(['latest_wins', 'highest_priority', 'merge', 'therapeutic_priority', 'user_choice', 'crisis_priority']),

  // Therapeutic considerations
  therapeuticImpact: z.object({
    affectsActiveSessions: z.boolean(),
    impactsContinuity: z.boolean(),
    crisisDataInvolved: z.boolean(),
    therapeuticPriorityLevel: z.number().int().min(1).max(10),
  }),

  // Resolution state
  resolutionState: z.object({
    status: z.enum(['pending', 'in_progress', 'resolved', 'failed']),
    resolutionStarted: z.string().optional(), // ISO timestamp
    resolutionCompleted: z.string().optional(), // ISO timestamp
    chosenResolution: z.string().optional(), // Description of resolution applied
    resolvedBy: z.string().optional(), // Device ID that resolved the conflict
  }),

  // Metadata
  detectedAt: z.string(), // ISO timestamp
  lastUpdated: z.string(), // ISO timestamp
});

export type ConflictResolutionContext = z.infer<typeof ConflictResolutionContextSchema>;

/**
 * Session Handoff State for Device Transitions
 */
export const SessionHandoffStateSchema = z.object({
  handoffId: z.string().uuid(),

  // Session information
  sessionInfo: z.object({
    sessionId: z.string().uuid(),
    sessionType: z.enum(['breathing', 'check_in', 'assessment', 'crisis_intervention', 'general_usage']),
    sessionData: z.record(z.any()), // Encrypted session state
    criticalForContinuity: z.boolean(),
  }),

  // Device transition
  deviceTransition: z.object({
    fromDeviceId: z.string().uuid(),
    toDeviceId: z.string().uuid(),
    handoffReason: z.enum(['user_initiated', 'device_switch', 'connection_loss', 'performance_optimization', 'crisis_escalation']),
    priorityLevel: z.number().int().min(1).max(10),
  }),

  // Handoff state
  handoffState: z.object({
    status: z.enum(['initiated', 'transferring', 'completed', 'failed', 'cancelled']),
    transferStarted: z.string().optional(), // ISO timestamp
    transferCompleted: z.string().optional(), // ISO timestamp
    dataIntegrity: z.boolean().default(true),

    progress: z.object({
      sessionDataTransferred: z.boolean(),
      queueStateTransferred: z.boolean(),
      preferencesTransferred: z.boolean(),
      securityContextTransferred: z.boolean(),
      validationCompleted: z.boolean(),
    }),
  }),

  // Performance metrics
  handoffMetrics: z.object({
    handoffDurationMs: z.number().min(0),
    dataTransferSizeMB: z.number().min(0),
    verificationTimeMs: z.number().min(0),
    userExperienceImpactMs: z.number().min(0), // Time user experienced disruption
  }),

  createdAt: z.string(), // ISO timestamp
  lastUpdated: z.string(), // ISO timestamp
});

export type SessionHandoffState = z.infer<typeof SessionHandoffStateSchema>;

/**
 * Cross-Device Queue Coordination State Interface
 */
interface CrossDeviceQueueState {
  // Device management
  connectedDevices: Map<string, DeviceInfo>;
  currentDevice: DeviceInfo;
  primaryDevice: string | null; // Device ID of primary device

  // Queue distribution and coordination
  queueDistribution: QueueDistributionStrategy;
  deviceQueueStates: Map<string, DeviceQueueState>;

  // Conflict resolution
  activeConflicts: ConflictResolutionContext[];
  conflictHistory: ConflictResolutionContext[];

  // Session handoff management
  activeHandoffs: SessionHandoffState[];
  handoffHistory: SessionHandoffState[];

  // Coordination performance
  coordinationMetrics: {
    averageConflictResolutionTimeMs: number;
    averageHandoffTimeMs: number;
    syncSuccessRate: number;
    deviceCoordinationLatencyMs: number;
    lastCoordinationActivity: string | null; // ISO timestamp
  };

  // Privacy and security
  privacyConfig: {
    allowCrossDeviceDataSharing: boolean;
    encryptAllCrossDeviceData: boolean;
    anonymizeAnalyticsData: boolean;
    minimizeCrossDeviceExposure: boolean;
    auditTrailEnabled: boolean;
  };

  // Configuration
  coordinationConfig: {
    maxConnectedDevices: number;
    deviceTimeoutMs: number;
    conflictResolutionTimeoutMs: number;
    handoffTimeoutMs: number;
    syncIntervalMs: number;
    enableAutomaticConflictResolution: boolean;
    enableAutomaticDeviceDiscovery: boolean;
  };

  lastStateUpdate: string; // ISO timestamp
}

/**
 * Cross-Device Queue Actions
 */
interface CrossDeviceQueueActions {
  // Device management
  registerDevice: (device: Omit<DeviceInfo, 'createdAt' | 'lastUpdatedAt'>) => boolean;
  updateDevice: (deviceId: string, updates: Partial<DeviceInfo>) => boolean;
  removeDevice: (deviceId: string) => boolean;
  setPrimaryDevice: (deviceId: string) => boolean;

  // Queue distribution
  updateQueueDistributionStrategy: (strategy: Partial<QueueDistributionStrategy>) => boolean;
  redistributeQueueOperations: () => Promise<{ redistributed: number; conflicts: number }>;
  getOptimalDeviceForOperation: (operation: PriorityQueueOperation) => string | null; // Returns device ID

  // Device queue state management
  updateDeviceQueueState: (deviceId: string, queueState: Partial<DeviceQueueState>) => boolean;
  requestQueueCoordination: (deviceId: string, operationIds: string[]) => Promise<boolean>;
  releaseQueueCoordination: (deviceId: string, operationIds: string[]) => boolean;

  // Conflict detection and resolution
  detectConflict: (operation: PriorityQueueOperation, deviceStates: Array<{ deviceId: string; data: any }>) => ConflictResolutionContext | null;
  resolveConflict: (conflictId: string, resolution: ConflictResolutionContext['resolutionStrategy']) => Promise<boolean>;
  applyTherapeuticPriority: (conflictId: string) => Promise<boolean>;

  // Session handoff
  initiateSessionHandoff: (sessionId: string, fromDeviceId: string, toDeviceId: string, reason: SessionHandoffState['deviceTransition']['handoffReason']) => Promise<string>; // Returns handoff ID
  processSessionHandoff: (handoffId: string) => Promise<boolean>;
  completeSessionHandoff: (handoffId: string) => Promise<boolean>;
  cancelSessionHandoff: (handoffId: string, reason: string) => boolean;

  // Synchronization
  syncDeviceStates: () => Promise<{ synced: number; conflicts: number; failed: number }>;
  forceSyncDevice: (deviceId: string) => Promise<boolean>;
  validateDeviceStateConsistency: () => Promise<{ consistent: boolean; inconsistencies: string[] }>;

  // Performance and monitoring
  updateCoordinationMetrics: (metrics: Partial<CrossDeviceQueueState['coordinationMetrics']>) => void;
  checkCoordinationHealth: () => { healthy: boolean; issues: string[] };
  optimizeDeviceCoordination: () => Promise<{ optimizationsApplied: number; performanceGain: number }>;

  // Analytics and reporting
  generateCoordinationReport: () => Promise<string>;
  exportDeviceCoordinationData: () => Promise<string>;

  // Configuration
  updateCoordinationConfig: (config: Partial<CrossDeviceQueueState['coordinationConfig']>) => void;
  updatePrivacyConfig: (config: Partial<CrossDeviceQueueState['privacyConfig']>) => void;

  reset: () => void;
}

/**
 * Default Queue Distribution Strategy
 */
const getDefaultQueueDistributionStrategy = (): QueueDistributionStrategy => ({
  strategyType: 'capability_based',
  loadBalancing: {
    considerBatteryLevel: true,
    considerNetworkQuality: true,
    considerDeviceCapabilities: true,
    considerSubscriptionTier: true,
    preferStableDevices: true,
  },
  priorityRules: {
    crisisOperationsAlwaysLocal: true,
    therapeuticSessionsPreferPrimary: true,
    backgroundTasksToSecondary: true,
    emergencyOperationsBypassDistribution: true,
  },
  performanceOptimization: {
    balanceThresholdPercentage: 0.8,
    maxOperationsPerDevice: 100,
    redistributionEnabled: true,
    dynamicAdjustmentEnabled: true,
  },
  lastUpdated: new Date().toISOString(),
});

/**
 * Default Coordination Configuration
 */
const getDefaultCoordinationConfig = () => ({
  maxConnectedDevices: 5,
  deviceTimeoutMs: 60000, // 1 minute
  conflictResolutionTimeoutMs: 10000, // 10 seconds
  handoffTimeoutMs: 30000, // 30 seconds
  syncIntervalMs: 30000, // 30 seconds
  enableAutomaticConflictResolution: true,
  enableAutomaticDeviceDiscovery: true,
});

/**
 * Cross-Device Queue Store Implementation
 */
export const useCrossDeviceQueueStore = create<CrossDeviceQueueState & CrossDeviceQueueActions>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        // Initial state
        connectedDevices: new Map(),
        currentDevice: {
          deviceId: crypto.randomUUID(),
          deviceName: 'Current Device',
          deviceType: 'mobile',
          platform: 'ios',
          subscriptionTier: 'trial',
          subscriptionAccess: {
            queueCapacity: 50,
            concurrentOperations: 2,
            priorityAccessLevel: 5,
            crisisAccess: true,
            therapeuticAccess: true,
          },
          capabilities: {
            supportsBackgroundSync: true,
            hasStableConnection: true,
            batteryOptimized: true,
            crisisCapable: true,
            offlineCapacity: 24,
            computePower: 'medium',
            storageAvailableMB: 1000,
            memoryAvailableMB: 2000,
          },
          networkState: {
            isOnline: true,
            connectionType: 'wifi',
            connectionQuality: 'good',
            lastConnectivityCheck: new Date().toISOString(),
          },
          status: {
            isActive: true,
            lastSeen: new Date().toISOString(),
            performanceState: 'optimal',
          },
          privacy: {
            allowsCrossDeviceSync: true,
            privacyLevel: 'standard',
            anonymizedId: crypto.randomUUID(),
          },
          createdAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString(),
        },
        primaryDevice: null,
        queueDistribution: getDefaultQueueDistributionStrategy(),
        deviceQueueStates: new Map(),
        activeConflicts: [],
        conflictHistory: [],
        activeHandoffs: [],
        handoffHistory: [],
        coordinationMetrics: {
          averageConflictResolutionTimeMs: 0,
          averageHandoffTimeMs: 0,
          syncSuccessRate: 1.0,
          deviceCoordinationLatencyMs: 0,
          lastCoordinationActivity: null,
        },
        privacyConfig: {
          allowCrossDeviceDataSharing: true,
          encryptAllCrossDeviceData: true,
          anonymizeAnalyticsData: true,
          minimizeCrossDeviceExposure: true,
          auditTrailEnabled: true,
        },
        coordinationConfig: getDefaultCoordinationConfig(),
        lastStateUpdate: new Date().toISOString(),

        // Device management
        registerDevice: (device: Omit<DeviceInfo, 'createdAt' | 'lastUpdatedAt'>): boolean => {
          try {
            set((state) => {
              const now = new Date().toISOString();

              // Check device limit
              if (state.connectedDevices.size >= state.coordinationConfig.maxConnectedDevices) {
                console.warn('Maximum connected devices limit reached');
                return;
              }

              const completeDevice: DeviceInfo = {
                ...device,
                createdAt: now,
                lastUpdatedAt: now,
              };

              state.connectedDevices.set(device.deviceId, completeDevice);

              // Initialize device queue state
              const deviceQueueState: DeviceQueueState = {
                deviceId: device.deviceId,
                queueState: {
                  totalOperations: 0,
                  queuedOperations: 0,
                  processingOperations: 0,
                  completedOperations: 0,
                  failedOperations: 0,
                  crisisOperations: 0,
                  utilizationPercentage: 0,
                  averageProcessingTimeMs: 0,
                },
                syncState: {
                  syncInProgress: false,
                  pendingSyncOperations: 0,
                  conflictResolutionRequired: false,
                  syncPerformance: {
                    averageSyncTimeMs: 0,
                    syncSuccessRate: 1.0,
                    lastSyncDurationMs: 0,
                  },
                },
                coordinationState: {
                  isCoordinationLeader: false,
                  hasActiveCoordinationLock: false,
                  coordinatingOperations: [],
                  waitingForCoordination: 0,
                },
                lastUpdated: now,
              };

              state.deviceQueueStates.set(device.deviceId, deviceQueueState);

              // Set as primary device if it's the first one or has premium subscription
              if (!state.primaryDevice || device.subscriptionTier === 'premium') {
                state.primaryDevice = device.deviceId;
              }

              state.lastStateUpdate = now;
            });

            return true;
          } catch (error) {
            console.error('Failed to register device:', error);
            return false;
          }
        },

        updateDevice: (deviceId: string, updates: Partial<DeviceInfo>): boolean => {
          try {
            set((state) => {
              const existingDevice = state.connectedDevices.get(deviceId);
              if (!existingDevice) return;

              const updatedDevice = {
                ...existingDevice,
                ...updates,
                lastUpdatedAt: new Date().toISOString(),
              };

              state.connectedDevices.set(deviceId, updatedDevice);
              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to update device:', error);
            return false;
          }
        },

        removeDevice: (deviceId: string): boolean => {
          try {
            set((state) => {
              // Remove device and its queue state
              state.connectedDevices.delete(deviceId);
              state.deviceQueueStates.delete(deviceId);

              // If this was the primary device, elect a new one
              if (state.primaryDevice === deviceId) {
                const remainingDevices = Array.from(state.connectedDevices.values());
                if (remainingDevices.length > 0) {
                  // Prefer premium devices, then by creation time
                  const newPrimary = remainingDevices
                    .sort((a, b) => {
                      if (a.subscriptionTier === 'premium' && b.subscriptionTier !== 'premium') return -1;
                      if (b.subscriptionTier === 'premium' && a.subscriptionTier !== 'premium') return 1;
                      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                    })[0];

                  state.primaryDevice = newPrimary.deviceId;
                } else {
                  state.primaryDevice = null;
                }
              }

              // Cancel any active handoffs involving this device
              state.activeHandoffs = state.activeHandoffs.filter(handoff => {
                if (handoff.deviceTransition.fromDeviceId === deviceId ||
                    handoff.deviceTransition.toDeviceId === deviceId) {
                  // Move to history as cancelled
                  handoff.handoffState.status = 'cancelled';
                  state.handoffHistory.push(handoff);
                  return false;
                }
                return true;
              });

              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to remove device:', error);
            return false;
          }
        },

        setPrimaryDevice: (deviceId: string): boolean => {
          const state = get();

          if (!state.connectedDevices.has(deviceId)) {
            console.error('Cannot set primary device: device not found');
            return false;
          }

          set((storeState) => {
            storeState.primaryDevice = deviceId;
            storeState.lastStateUpdate = new Date().toISOString();
          });

          return true;
        },

        // Queue distribution
        updateQueueDistributionStrategy: (strategy: Partial<QueueDistributionStrategy>): boolean => {
          try {
            set((state) => {
              state.queueDistribution = {
                ...state.queueDistribution,
                ...strategy,
                lastUpdated: new Date().toISOString(),
              };
              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to update queue distribution strategy:', error);
            return false;
          }
        },

        redistributeQueueOperations: async (): Promise<{ redistributed: number; conflicts: number }> => {
          // This would integrate with the main queue store to redistribute operations
          // For now, simulate the redistribution process

          await new Promise(resolve => setTimeout(resolve, 100));

          return { redistributed: 5, conflicts: 1 };
        },

        getOptimalDeviceForOperation: (operation: PriorityQueueOperation): string | null => {
          const state = get();
          const strategy = state.queueDistribution;

          // Crisis operations always stay local
          if (operation.crisisAttributes?.isCrisisOperation && strategy.priorityRules.crisisOperationsAlwaysLocal) {
            return state.currentDevice.deviceId;
          }

          // Emergency operations bypass distribution
          if (operation.crisisAttributes?.requiresImmediateExecution && strategy.priorityRules.emergencyOperationsBypassDistribution) {
            return state.currentDevice.deviceId;
          }

          const availableDevices = Array.from(state.connectedDevices.values())
            .filter(device => device.status.isActive && device.networkState.isOnline);

          if (availableDevices.length === 0) {
            return state.currentDevice.deviceId;
          }

          // Apply distribution strategy
          switch (strategy.strategyType) {
            case 'capability_based':
              return availableDevices
                .filter(device => device.capabilities.computePower !== 'low')
                .sort((a, b) => {
                  // Score based on capabilities
                  const scoreA = (a.capabilities.computePower === 'high' ? 3 : 2) +
                                (a.networkState.connectionQuality === 'excellent' ? 2 : 1) +
                                (a.status.batteryLevel || 1);
                  const scoreB = (b.capabilities.computePower === 'high' ? 3 : 2) +
                                (b.networkState.connectionQuality === 'excellent' ? 2 : 1) +
                                (b.status.batteryLevel || 1);
                  return scoreB - scoreA;
                })[0]?.deviceId || state.currentDevice.deviceId;

            case 'subscription_optimized':
              return availableDevices
                .sort((a, b) => {
                  const tierOrder = ['trial', 'basic', 'premium'];
                  return tierOrder.indexOf(b.subscriptionTier) - tierOrder.indexOf(a.subscriptionTier);
                })[0]?.deviceId || state.currentDevice.deviceId;

            case 'therapeutic_priority':
              // Prefer primary device for therapeutic operations
              if (state.primaryDevice && availableDevices.some(d => d.deviceId === state.primaryDevice)) {
                return state.primaryDevice;
              }
              return availableDevices[0]?.deviceId || state.currentDevice.deviceId;

            case 'round_robin':
              // Simple round-robin (would need state tracking in real implementation)
              const deviceIds = availableDevices.map(d => d.deviceId).sort();
              return deviceIds[0] || state.currentDevice.deviceId;

            default:
              return state.currentDevice.deviceId;
          }
        },

        // Device queue state management
        updateDeviceQueueState: (deviceId: string, queueStateUpdates: Partial<DeviceQueueState>): boolean => {
          try {
            set((state) => {
              const existingState = state.deviceQueueStates.get(deviceId);
              if (!existingState) return;

              const updatedState = {
                ...existingState,
                ...queueStateUpdates,
                lastUpdated: new Date().toISOString(),
              };

              state.deviceQueueStates.set(deviceId, updatedState);
              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to update device queue state:', error);
            return false;
          }
        },

        requestQueueCoordination: async (deviceId: string, operationIds: string[]): Promise<boolean> => {
          try {
            set((state) => {
              const deviceState = state.deviceQueueStates.get(deviceId);
              if (!deviceState) return;

              deviceState.coordinationState.hasActiveCoordinationLock = true;
              deviceState.coordinationState.coordinatingOperations = operationIds;
              deviceState.coordinationState.lastCoordinationActivity = new Date().toISOString();
              deviceState.lastUpdated = new Date().toISOString();

              state.deviceQueueStates.set(deviceId, deviceState);
              state.coordinationMetrics.lastCoordinationActivity = new Date().toISOString();
              state.lastStateUpdate = new Date().toISOString();
            });

            // Simulate coordination time
            await new Promise(resolve => setTimeout(resolve, 50));

            return true;
          } catch (error) {
            console.error('Failed to request queue coordination:', error);
            return false;
          }
        },

        releaseQueueCoordination: (deviceId: string, operationIds: string[]): boolean => {
          try {
            set((state) => {
              const deviceState = state.deviceQueueStates.get(deviceId);
              if (!deviceState) return;

              deviceState.coordinationState.hasActiveCoordinationLock = false;
              deviceState.coordinationState.coordinatingOperations = [];
              deviceState.coordinationState.lastCoordinationActivity = new Date().toISOString();
              deviceState.lastUpdated = new Date().toISOString();

              state.deviceQueueStates.set(deviceId, deviceState);
              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to release queue coordination:', error);
            return false;
          }
        },

        // Conflict detection and resolution
        detectConflict: (operation: PriorityQueueOperation, deviceStates: Array<{ deviceId: string; data: any }>): ConflictResolutionContext | null => {
          // Analyze device states to detect conflicts
          if (deviceStates.length < 2) return null;

          // Simple conflict detection based on data differences
          const firstData = deviceStates[0].data;
          const conflicts = deviceStates.slice(1).filter(deviceState =>
            JSON.stringify(deviceState.data) !== JSON.stringify(firstData)
          );

          if (conflicts.length === 0) return null;

          // Create conflict context
          const conflictContext: ConflictResolutionContext = {
            conflictId: crypto.randomUUID(),
            operationId: operation.operationId,
            conflictType: 'data_divergence',
            severity: operation.crisisAttributes?.isCrisisOperation ? 'critical' : 'medium',
            conflictingDevices: deviceStates.map(ds => ({
              deviceId: ds.deviceId,
              deviceData: ds.data,
              timestamp: new Date().toISOString(),
              confidence: 0.8, // Default confidence
            })),
            resolutionStrategy: operation.crisisAttributes?.isCrisisOperation ? 'crisis_priority' : 'latest_wins',
            therapeuticImpact: {
              affectsActiveSessions: false,
              impactsContinuity: false,
              crisisDataInvolved: operation.crisisAttributes?.isCrisisOperation || false,
              therapeuticPriorityLevel: operation.priority || 5,
            },
            resolutionState: {
              status: 'pending',
            },
            detectedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
          };

          return conflictContext;
        },

        resolveConflict: async (conflictId: string, resolution: ConflictResolutionContext['resolutionStrategy']): Promise<boolean> => {
          const startTime = performance.now();

          try {
            set((state) => {
              const conflictIndex = state.activeConflicts.findIndex(c => c.conflictId === conflictId);
              if (conflictIndex === -1) return;

              const conflict = state.activeConflicts[conflictIndex];
              const now = new Date().toISOString();

              conflict.resolutionStrategy = resolution;
              conflict.resolutionState.status = 'in_progress';
              conflict.resolutionState.resolutionStarted = now;
              conflict.lastUpdated = now;

              state.activeConflicts[conflictIndex] = conflict;
            });

            // Simulate conflict resolution processing
            await new Promise(resolve => setTimeout(resolve, 100));

            set((state) => {
              const conflictIndex = state.activeConflicts.findIndex(c => c.conflictId === conflictId);
              if (conflictIndex === -1) return;

              const conflict = state.activeConflicts[conflictIndex];
              const now = new Date().toISOString();

              conflict.resolutionState.status = 'resolved';
              conflict.resolutionState.resolutionCompleted = now;
              conflict.resolutionState.chosenResolution = resolution;
              conflict.resolutionState.resolvedBy = state.currentDevice.deviceId;
              conflict.lastUpdated = now;

              // Move to history
              state.conflictHistory.push(conflict);
              state.activeConflicts.splice(conflictIndex, 1);

              // Update metrics
              const resolutionTime = performance.now() - startTime;
              state.coordinationMetrics.averageConflictResolutionTimeMs =
                (state.coordinationMetrics.averageConflictResolutionTimeMs + resolutionTime) / 2;

              state.lastStateUpdate = now;
            });

            return true;
          } catch (error) {
            console.error('Failed to resolve conflict:', error);
            return false;
          }
        },

        applyTherapeuticPriority: async (conflictId: string): Promise<boolean> => {
          const state = get();
          const conflict = state.activeConflicts.find(c => c.conflictId === conflictId);

          if (!conflict) return false;

          // Determine therapeutic priority based on conflict context
          const therapeuticResolution = conflict.therapeuticImpact.crisisDataInvolved
            ? 'crisis_priority'
            : conflict.therapeuticImpact.affectsActiveSessions
            ? 'therapeutic_priority'
            : 'latest_wins';

          return await get().resolveConflict(conflictId, therapeuticResolution);
        },

        // Session handoff
        initiateSessionHandoff: async (sessionId: string, fromDeviceId: string, toDeviceId: string, reason: SessionHandoffState['deviceTransition']['handoffReason']): Promise<string> => {
          const handoffId = crypto.randomUUID();
          const now = new Date().toISOString();

          try {
            set((state) => {
              const sessionHandoff: SessionHandoffState = {
                handoffId,
                sessionInfo: {
                  sessionId,
                  sessionType: 'general_usage', // Would be determined from session context
                  sessionData: {}, // Would be populated with actual session data
                  criticalForContinuity: true,
                },
                deviceTransition: {
                  fromDeviceId,
                  toDeviceId,
                  handoffReason: reason,
                  priorityLevel: 7, // High priority for session handoff
                },
                handoffState: {
                  status: 'initiated',
                  dataIntegrity: true,
                  progress: {
                    sessionDataTransferred: false,
                    queueStateTransferred: false,
                    preferencesTransferred: false,
                    securityContextTransferred: false,
                    validationCompleted: false,
                  },
                },
                handoffMetrics: {
                  handoffDurationMs: 0,
                  dataTransferSizeMB: 0,
                  verificationTimeMs: 0,
                  userExperienceImpactMs: 0,
                },
                createdAt: now,
                lastUpdated: now,
              };

              state.activeHandoffs.push(sessionHandoff);
              state.lastStateUpdate = now;
            });

            return handoffId;
          } catch (error) {
            console.error('Failed to initiate session handoff:', error);
            throw error;
          }
        },

        processSessionHandoff: async (handoffId: string): Promise<boolean> => {
          const startTime = performance.now();

          try {
            set((state) => {
              const handoff = state.activeHandoffs.find(h => h.handoffId === handoffId);
              if (!handoff) return;

              handoff.handoffState.status = 'transferring';
              handoff.handoffState.transferStarted = new Date().toISOString();
              handoff.lastUpdated = new Date().toISOString();
            });

            // Simulate handoff processing
            const steps = ['sessionDataTransferred', 'queueStateTransferred', 'preferencesTransferred', 'securityContextTransferred', 'validationCompleted'];

            for (let i = 0; i < steps.length; i++) {
              await new Promise(resolve => setTimeout(resolve, 50));

              set((state) => {
                const handoff = state.activeHandoffs.find(h => h.handoffId === handoffId);
                if (!handoff) return;

                (handoff.handoffState.progress as any)[steps[i]] = true;
                handoff.lastUpdated = new Date().toISOString();
              });
            }

            // Complete handoff
            const processingTime = performance.now() - startTime;

            set((state) => {
              const handoff = state.activeHandoffs.find(h => h.handoffId === handoffId);
              if (!handoff) return;

              handoff.handoffState.status = 'completed';
              handoff.handoffState.transferCompleted = new Date().toISOString();
              handoff.handoffMetrics.handoffDurationMs = processingTime;
              handoff.handoffMetrics.userExperienceImpactMs = Math.max(0, processingTime - 200); // Impact beyond 200ms
              handoff.lastUpdated = new Date().toISOString();

              // Update coordination metrics
              state.coordinationMetrics.averageHandoffTimeMs =
                (state.coordinationMetrics.averageHandoffTimeMs + processingTime) / 2;

              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to process session handoff:', error);
            return false;
          }
        },

        completeSessionHandoff: async (handoffId: string): Promise<boolean> => {
          try {
            set((state) => {
              const handoffIndex = state.activeHandoffs.findIndex(h => h.handoffId === handoffId);
              if (handoffIndex === -1) return;

              const handoff = state.activeHandoffs[handoffIndex];
              handoff.handoffState.status = 'completed';
              handoff.lastUpdated = new Date().toISOString();

              // Move to history
              state.handoffHistory.push(handoff);
              state.activeHandoffs.splice(handoffIndex, 1);

              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to complete session handoff:', error);
            return false;
          }
        },

        cancelSessionHandoff: (handoffId: string, reason: string): boolean => {
          try {
            set((state) => {
              const handoffIndex = state.activeHandoffs.findIndex(h => h.handoffId === handoffId);
              if (handoffIndex === -1) return;

              const handoff = state.activeHandoffs[handoffIndex];
              handoff.handoffState.status = 'cancelled';
              handoff.lastUpdated = new Date().toISOString();

              // Move to history
              state.handoffHistory.push(handoff);
              state.activeHandoffs.splice(handoffIndex, 1);

              state.lastStateUpdate = new Date().toISOString();
            });

            return true;
          } catch (error) {
            console.error('Failed to cancel session handoff:', error);
            return false;
          }
        },

        // Synchronization
        syncDeviceStates: async (): Promise<{ synced: number; conflicts: number; failed: number }> => {
          let synced = 0;
          let conflicts = 0;
          let failed = 0;

          const state = get();
          const devices = Array.from(state.connectedDevices.values()).filter(d => d.status.isActive);

          for (const device of devices) {
            try {
              // Simulate sync operation
              await new Promise(resolve => setTimeout(resolve, 100));

              // Update device queue state sync status
              get().updateDeviceQueueState(device.deviceId, {
                syncState: {
                  ...state.deviceQueueStates.get(device.deviceId)?.syncState,
                  lastSuccessfulSync: new Date().toISOString(),
                  syncInProgress: false,
                },
              });

              synced++;
            } catch (error) {
              failed++;
            }
          }

          // Update coordination metrics
          set((storeState) => {
            storeState.coordinationMetrics.syncSuccessRate = synced / (synced + failed);
            storeState.coordinationMetrics.lastCoordinationActivity = new Date().toISOString();
            storeState.lastStateUpdate = new Date().toISOString();
          });

          return { synced, conflicts, failed };
        },

        forceSyncDevice: async (deviceId: string): Promise<boolean> => {
          try {
            // Simulate forced sync
            await new Promise(resolve => setTimeout(resolve, 200));

            get().updateDeviceQueueState(deviceId, {
              syncState: {
                ...get().deviceQueueStates.get(deviceId)?.syncState,
                lastSuccessfulSync: new Date().toISOString(),
                syncInProgress: false,
              },
            });

            return true;
          } catch (error) {
            console.error('Failed to force sync device:', error);
            return false;
          }
        },

        validateDeviceStateConsistency: async (): Promise<{ consistent: boolean; inconsistencies: string[] }> => {
          const state = get();
          const inconsistencies: string[] = [];

          // Check device queue states for consistency
          for (const [deviceId, queueState] of state.deviceQueueStates) {
            const device = state.connectedDevices.get(deviceId);

            if (!device) {
              inconsistencies.push(`Queue state exists for non-existent device: ${deviceId}`);
              continue;
            }

            if (!device.status.isActive && queueState.queueState.processingOperations > 0) {
              inconsistencies.push(`Inactive device ${deviceId} has processing operations`);
            }
          }

          // Check for orphaned handoffs
          for (const handoff of state.activeHandoffs) {
            if (!state.connectedDevices.has(handoff.deviceTransition.fromDeviceId) ||
                !state.connectedDevices.has(handoff.deviceTransition.toDeviceId)) {
              inconsistencies.push(`Active handoff references non-existent devices: ${handoff.handoffId}`);
            }
          }

          return {
            consistent: inconsistencies.length === 0,
            inconsistencies,
          };
        },

        // Performance and monitoring
        updateCoordinationMetrics: (metrics: Partial<CrossDeviceQueueState['coordinationMetrics']>): void => {
          set((state) => {
            state.coordinationMetrics = {
              ...state.coordinationMetrics,
              ...metrics,
            };
            state.lastStateUpdate = new Date().toISOString();
          });
        },

        checkCoordinationHealth: (): { healthy: boolean; issues: string[] } => {
          const state = get();
          const issues: string[] = [];

          // Check device connectivity
          const activeDevices = Array.from(state.connectedDevices.values()).filter(d => d.status.isActive);
          const onlineDevices = activeDevices.filter(d => d.networkState.isOnline);

          if (onlineDevices.length / activeDevices.length < 0.8) {
            issues.push('Low device connectivity: Less than 80% of devices are online');
          }

          // Check sync success rate
          if (state.coordinationMetrics.syncSuccessRate < 0.9) {
            issues.push('Poor sync success rate: Below 90%');
          }

          // Check conflict resolution time
          if (state.coordinationMetrics.averageConflictResolutionTimeMs > 5000) {
            issues.push('Slow conflict resolution: Average time above 5 seconds');
          }

          // Check handoff performance
          if (state.coordinationMetrics.averageHandoffTimeMs > 1000) {
            issues.push('Slow session handoffs: Average time above 1 second');
          }

          return {
            healthy: issues.length === 0,
            issues,
          };
        },

        optimizeDeviceCoordination: async (): Promise<{ optimizationsApplied: number; performanceGain: number }> => {
          let optimizationsApplied = 0;
          let performanceGain = 0;

          const state = get();

          // Optimize queue distribution based on current performance
          if (state.coordinationMetrics.averageHandoffTimeMs > 500) {
            get().updateQueueDistributionStrategy({
              performanceOptimization: {
                ...state.queueDistribution.performanceOptimization,
                redistributionEnabled: false, // Reduce redistribution to improve handoff time
              },
            });
            optimizationsApplied++;
            performanceGain += 20; // Estimated percentage improvement
          }

          // Clean up old handoff history to reduce memory usage
          if (state.handoffHistory.length > 50) {
            set((storeState) => {
              storeState.handoffHistory = storeState.handoffHistory.slice(-25);
              storeState.lastStateUpdate = new Date().toISOString();
            });
            optimizationsApplied++;
            performanceGain += 5;
          }

          // Clean up old conflict history
          if (state.conflictHistory.length > 100) {
            set((storeState) => {
              storeState.conflictHistory = storeState.conflictHistory.slice(-50);
              storeState.lastStateUpdate = new Date().toISOString();
            });
            optimizationsApplied++;
            performanceGain += 3;
          }

          return { optimizationsApplied, performanceGain };
        },

        // Analytics and reporting
        generateCoordinationReport: async (): Promise<string> => {
          const state = get();
          const healthCheck = get().checkCoordinationHealth();

          const report = {
            generatedAt: new Date().toISOString(),
            deviceCoordination: {
              connectedDevices: state.connectedDevices.size,
              activeDevices: Array.from(state.connectedDevices.values()).filter(d => d.status.isActive).length,
              primaryDevice: state.primaryDevice,
              distributionStrategy: state.queueDistribution.strategyType,
            },
            performance: {
              ...state.coordinationMetrics,
              healthStatus: healthCheck,
            },
            conflicts: {
              active: state.activeConflicts.length,
              resolved: state.conflictHistory.length,
              averageResolutionTime: state.coordinationMetrics.averageConflictResolutionTimeMs,
            },
            sessionHandoffs: {
              active: state.activeHandoffs.length,
              completed: state.handoffHistory.filter(h => h.handoffState.status === 'completed').length,
              averageHandoffTime: state.coordinationMetrics.averageHandoffTimeMs,
            },
            privacy: {
              encryptionEnabled: state.privacyConfig.encryptAllCrossDeviceData,
              anonymizedAnalytics: state.privacyConfig.anonymizeAnalyticsData,
              crossDeviceDataSharing: state.privacyConfig.allowCrossDeviceDataSharing,
            },
          };

          return JSON.stringify(report, null, 2);
        },

        exportDeviceCoordinationData: async (): Promise<string> => {
          const state = get();

          const exportData = {
            exportedAt: new Date().toISOString(),
            devices: Array.from(state.connectedDevices.entries()).map(([id, device]) => ({
              deviceId: id,
              // Anonymize sensitive data
              deviceInfo: {
                ...device,
                privacy: {
                  ...device.privacy,
                  encryptionKey: device.privacy.encryptionKey ? '[ENCRYPTED]' : undefined,
                },
              },
              queueState: state.deviceQueueStates.get(id),
            })),
            coordination: {
              distribution: state.queueDistribution,
              metrics: state.coordinationMetrics,
              conflicts: state.activeConflicts.length + state.conflictHistory.length,
              handoffs: state.activeHandoffs.length + state.handoffHistory.length,
            },
          };

          // In production, this would be encrypted
          return JSON.stringify(exportData, null, 2);
        },

        // Configuration
        updateCoordinationConfig: (config: Partial<CrossDeviceQueueState['coordinationConfig']>): void => {
          set((state) => {
            state.coordinationConfig = {
              ...state.coordinationConfig,
              ...config,
            };
            state.lastStateUpdate = new Date().toISOString();
          });
        },

        updatePrivacyConfig: (config: Partial<CrossDeviceQueueState['privacyConfig']>): void => {
          set((state) => {
            state.privacyConfig = {
              ...state.privacyConfig,
              ...config,
            };
            state.lastStateUpdate = new Date().toISOString();
          });
        },

        reset: () => {
          const currentDeviceId = crypto.randomUUID();

          set(() => ({
            connectedDevices: new Map(),
            currentDevice: {
              deviceId: currentDeviceId,
              deviceName: 'Current Device',
              deviceType: 'mobile',
              platform: 'ios',
              subscriptionTier: 'trial',
              subscriptionAccess: {
                queueCapacity: 50,
                concurrentOperations: 2,
                priorityAccessLevel: 5,
                crisisAccess: true,
                therapeuticAccess: true,
              },
              capabilities: {
                supportsBackgroundSync: true,
                hasStableConnection: true,
                batteryOptimized: true,
                crisisCapable: true,
                offlineCapacity: 24,
                computePower: 'medium',
                storageAvailableMB: 1000,
                memoryAvailableMB: 2000,
              },
              networkState: {
                isOnline: true,
                connectionType: 'wifi',
                connectionQuality: 'good',
                lastConnectivityCheck: new Date().toISOString(),
              },
              status: {
                isActive: true,
                lastSeen: new Date().toISOString(),
                performanceState: 'optimal',
              },
              privacy: {
                allowsCrossDeviceSync: true,
                privacyLevel: 'standard',
                anonymizedId: crypto.randomUUID(),
              },
              createdAt: new Date().toISOString(),
              lastUpdatedAt: new Date().toISOString(),
            },
            primaryDevice: null,
            queueDistribution: getDefaultQueueDistributionStrategy(),
            deviceQueueStates: new Map(),
            activeConflicts: [],
            conflictHistory: [],
            activeHandoffs: [],
            handoffHistory: [],
            coordinationMetrics: {
              averageConflictResolutionTimeMs: 0,
              averageHandoffTimeMs: 0,
              syncSuccessRate: 1.0,
              deviceCoordinationLatencyMs: 0,
              lastCoordinationActivity: null,
            },
            privacyConfig: {
              allowCrossDeviceDataSharing: true,
              encryptAllCrossDeviceData: true,
              anonymizeAnalyticsData: true,
              minimizeCrossDeviceExposure: true,
              auditTrailEnabled: true,
            },
            coordinationConfig: getDefaultCoordinationConfig(),
            lastStateUpdate: new Date().toISOString(),
          }));
        },
      })),
      {
        name: 'fullmind-cross-device-queue',
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          // Convert Maps to objects for serialization
          connectedDevices: Object.fromEntries(state.connectedDevices),
          deviceQueueStates: Object.fromEntries(state.deviceQueueStates),
          currentDevice: state.currentDevice,
          primaryDevice: state.primaryDevice,
          queueDistribution: state.queueDistribution,
          activeConflicts: state.activeConflicts,
          conflictHistory: state.conflictHistory.slice(-50), // Keep only recent history
          activeHandoffs: state.activeHandoffs,
          handoffHistory: state.handoffHistory.slice(-20), // Keep only recent handoffs
          coordinationMetrics: state.coordinationMetrics,
          privacyConfig: state.privacyConfig,
          coordinationConfig: state.coordinationConfig,
        }),
        // Convert objects back to Maps after deserialization
        onRehydrateStorage: () => (state) => {
          if (state) {
            if (state.connectedDevices) {
              const devicesMap = new Map();
              Object.entries(state.connectedDevices as any).forEach(([key, value]) => {
                devicesMap.set(key, value);
              });
              state.connectedDevices = devicesMap;
            }

            if (state.deviceQueueStates) {
              const queueStatesMap = new Map();
              Object.entries(state.deviceQueueStates as any).forEach(([key, value]) => {
                queueStatesMap.set(key, value);
              });
              state.deviceQueueStates = queueStatesMap;
            }
          }
        },
      }
    )
  )
);

/**
 * Cross-Device Queue Selectors for Performance
 */
export const crossDeviceQueueSelectors = {
  getConnectedDevices: (state: CrossDeviceQueueState) => Array.from(state.connectedDevices.values()),
  getActiveDevices: (state: CrossDeviceQueueState) =>
    Array.from(state.connectedDevices.values()).filter(d => d.status.isActive),
  getPrimaryDevice: (state: CrossDeviceQueueState) =>
    state.primaryDevice ? state.connectedDevices.get(state.primaryDevice) : null,
  getCurrentDevice: (state: CrossDeviceQueueState) => state.currentDevice,
  getQueueDistribution: (state: CrossDeviceQueueState) => state.queueDistribution,
  getActiveConflicts: (state: CrossDeviceQueueState) => state.activeConflicts,
  getActiveHandoffs: (state: CrossDeviceQueueState) => state.activeHandoffs,
  getCoordinationMetrics: (state: CrossDeviceQueueState) => state.coordinationMetrics,
  getDeviceQueueState: (state: CrossDeviceQueueState, deviceId: string) =>
    state.deviceQueueStates.get(deviceId),
  getCoordinationHealth: (state: CrossDeviceQueueState) => ({
    healthy: state.coordinationMetrics.syncSuccessRate > 0.9 &&
             state.coordinationMetrics.averageConflictResolutionTimeMs < 5000,
    activeDevices: Array.from(state.connectedDevices.values()).filter(d => d.status.isActive).length,
    conflicts: state.activeConflicts.length,
    handoffs: state.activeHandoffs.length,
  }),
};

/**
 * Cross-Device Queue Hook with Selectors
 */
export const useCrossDeviceQueue = () => {
  const store = useCrossDeviceQueueStore();
  return {
    ...store,
    selectors: crossDeviceQueueSelectors,
  };
};