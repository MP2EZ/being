/**
 * Cross-Device Coordination Store for Being. MBCT App
 *
 * Advanced multi-device state synchronization with:
 * - Therapeutic session handoff with context preservation
 * - Device-aware sync priority and conflict resolution
 * - Real-time device presence and activity tracking
 * - Session continuity across device switches
 * - Family sharing coordination with privacy controls
 * - Crisis state propagation across all user devices
 */

import { create } from 'zustand';
import { createJSONStorage, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import { encryptionService } from '../../services/security/EncryptionService';
import { stateSynchronizationService } from '../../services/state/StateSynchronization';
import type { SubscriptionTier } from '../../types/payment-canonical';

/**
 * Device Information Schema
 */
export const DeviceInfoSchema = z.object({
  deviceId: z.string(),
  deviceName: z.string(),
  deviceType: z.enum(['mobile', 'tablet', 'desktop', 'widget', 'smartwatch']),
  platform: z.enum(['ios', 'android', 'web', 'windows', 'macos', 'watch']),
  appVersion: z.string(),
  lastSeen: z.string(), // ISO timestamp
  isActive: z.boolean(),
  isOnline: z.boolean(),

  // Device capabilities
  capabilities: z.object({
    canReceiveSessionHandoff: z.boolean(),
    canInitiateSessionHandoff: z.boolean(),
    supportsCrisisNotifications: z.boolean(),
    supportsHapticFeedback: z.boolean(),
    supportsPushNotifications: z.boolean(),
    supportsWidgets: z.boolean(),
  }),

  // Current state
  currentSession: z.object({
    sessionId: z.string().optional(),
    sessionType: z.enum(['assessment', 'breathing', 'checkin', 'crisis', 'meditation']).optional(),
    sessionProgress: z.number().min(0).max(1).optional(),
    startTime: z.string().optional(), // ISO timestamp
    canInterrupt: z.boolean().default(true),
  }).optional(),

  // Sync preferences
  syncPreferences: z.object({
    autoSyncEnabled: z.boolean().default(true),
    syncFrequency: z.enum(['realtime', 'frequent', 'normal', 'background']).default('normal'),
    crisisAlertEnabled: z.boolean().default(true),
    familySharingEnabled: z.boolean().default(false),
    sessionHandoffEnabled: z.boolean().default(true),
  }),

  // Performance metrics
  performance: z.object({
    averageResponseTime: z.number().default(0), // ms
    lastSyncLatency: z.number().default(0), // ms
    reliabilityScore: z.number().min(0).max(1).default(1), // 0-1
    batteryOptimized: z.boolean().default(false),
  }),
});

export type DeviceInfo = z.infer<typeof DeviceInfoSchema>;

/**
 * Session Context Schema for Handoff
 */
export const SessionContextSchema = z.object({
  sessionId: z.string(),
  sessionType: z.enum(['assessment', 'breathing', 'checkin', 'crisis', 'meditation']),

  // Session state
  currentStep: z.number().default(0),
  totalSteps: z.number(),
  progress: z.number().min(0).max(1),
  startTime: z.string(), // ISO timestamp
  estimatedEndTime: z.string().optional(), // ISO timestamp

  // Session data (encrypted)
  sessionData: z.any(), // Encrypted session-specific data
  userResponses: z.array(z.any()).default([]), // Encrypted user responses

  // Handoff metadata
  sourceDeviceId: z.string(),
  targetDeviceId: z.string().optional(),
  handoffReason: z.enum(['user_request', 'device_switch', 'battery_low', 'better_device', 'crisis']).optional(),
  handoffTimestamp: z.string().optional(), // ISO timestamp

  // Therapeutic context
  therapeuticContext: z.object({
    moodBefore: z.number().min(1).max(10).optional(),
    crisisLevel: z.enum(['none', 'mild', 'moderate', 'severe', 'emergency']).default('none'),
    needsContinuity: z.boolean().default(false),
    canPause: z.boolean().default(true),
    privacyLevel: z.enum(['private', 'family_visible', 'shared']).default('private'),
  }),

  // Quality assurance
  integrity: z.object({
    checksum: z.string(),
    encryptionVersion: z.string(),
    lastVerified: z.string(), // ISO timestamp
  }),
});

export type SessionContext = z.infer<typeof SessionContextSchema>;

/**
 * Device Network State Schema
 */
export const DeviceNetworkStateSchema = z.object({
  // Network topology
  connectedDevices: z.array(DeviceInfoSchema),
  deviceRelationships: z.record(z.string(), z.object({
    deviceId: z.string(),
    relationship: z.enum(['primary', 'secondary', 'family_member', 'guest']),
    trustLevel: z.enum(['full', 'limited', 'restricted']),
    syncPermissions: z.array(z.enum(['session_data', 'progress', 'crisis_alerts', 'family_insights'])),
    lastHandoff: z.string().optional(), // ISO timestamp
  })),

  // Network leadership
  coordinatorDevice: z.object({
    deviceId: z.string(),
    electedAt: z.string(), // ISO timestamp
    leadershipScore: z.number().min(0).max(1), // Based on capabilities, reliability, battery
    isStable: z.boolean(),
  }).optional(),

  // Sync topology
  syncTopology: z.enum(['star', 'mesh', 'hierarchical', 'crisis_mode']).default('star'),
  lastTopologyChange: z.string().optional(), // ISO timestamp

  // Network health
  networkHealth: z.object({
    overallLatency: z.number().default(0), // ms average across devices
    reliabilityScore: z.number().min(0).max(1).default(1),
    conflictRate: z.number().min(0).max(1).default(0), // conflicts per sync
    lastHealthCheck: z.string().optional(), // ISO timestamp
  }),
});

export type DeviceNetworkState = z.infer<typeof DeviceNetworkStateSchema>;

/**
 * Family Sharing State Schema
 */
export const FamilySharingStateSchema = z.object({
  // Family configuration
  familyId: z.string().optional(),
  familyRole: z.enum(['admin', 'member', 'child', 'observer']).optional(),

  // Shared insights
  sharedInsights: z.object({
    progressSharing: z.boolean().default(false),
    moodTrends: z.boolean().default(false),
    crisisAlerts: z.boolean().default(true),
    milestones: z.boolean().default(false),
    anonymizedData: z.boolean().default(true),
  }),

  // Family members
  familyMembers: z.array(z.object({
    memberId: z.string(),
    memberName: z.string(),
    role: z.enum(['admin', 'member', 'child', 'observer']),
    devices: z.array(z.string()), // device IDs
    sharingLevel: z.enum(['none', 'basic', 'detailed', 'full']),
    lastActivity: z.string().optional(), // ISO timestamp
    crisisContactEnabled: z.boolean().default(false),
  })),

  // Privacy controls
  privacySettings: z.object({
    shareProgress: z.boolean().default(false),
    shareCrisisState: z.boolean().default(true),
    shareSessionTypes: z.boolean().default(false),
    allowFamilyHandoff: z.boolean().default(false),
    childSafetyMode: z.boolean().default(false),
  }),

  // Family insights
  familyInsights: z.object({
    aggregatedProgress: z.any().optional(), // Anonymized family progress
    supportPatterns: z.any().optional(), // When family members help each other
    crisisSupport: z.any().optional(), // Crisis response patterns
    lastUpdated: z.string().optional(), // ISO timestamp
  }),
});

export type FamilySharingState = z.infer<typeof FamilySharingStateSchema>;

/**
 * Crisis Coordination State Schema
 */
export const CrisisCoordinationStateSchema = z.object({
  // Crisis detection
  crisisActive: z.boolean().default(false),
  crisisLevel: z.enum(['none', 'mild', 'moderate', 'severe', 'emergency']).default('none'),
  crisisDeviceId: z.string().optional(), // Device that detected crisis
  crisisTimestamp: z.string().optional(), // ISO timestamp

  // Crisis response
  crisisResponsePlan: z.object({
    primaryDevice: z.string().optional(), // Device for primary crisis response
    backupDevices: z.array(z.string()).default([]), // Backup devices for crisis
    emergencyContacts: z.array(z.object({
      contactId: z.string(),
      contactMethod: z.enum(['phone', 'sms', 'app_notification']),
      priority: z.number().min(1).max(10),
      deviceNotification: z.boolean().default(true),
    })).default([]),
    automaticHandoff: z.boolean().default(true),
  }),

  // Crisis propagation
  crisisNotifications: z.array(z.object({
    deviceId: z.string(),
    notificationType: z.enum(['immediate', 'urgent', 'standard', 'silent']),
    sentAt: z.string(), // ISO timestamp
    acknowledgedAt: z.string().optional(), // ISO timestamp
    response: z.enum(['acknowledged', 'escalated', 'handled', 'ignored']).optional(),
  })),

  // Crisis session coordination
  crisisSessionState: z.object({
    activeSession: z.string().optional(), // Crisis session ID
    coordinatingDevice: z.string().optional(),
    supportingDevices: z.array(z.string()).default([]),
    sessionData: z.any().optional(), // Encrypted crisis session data
    interventionType: z.enum(['breathing', 'grounding', 'emergency_contact', 'professional_help']).optional(),
  }),

  // Crisis recovery
  crisisRecovery: z.object({
    recoveryStarted: z.boolean().default(false),
    recoveryDeviceId: z.string().optional(),
    recoverySessionId: z.string().optional(),
    postCrisisCheckin: z.boolean().default(false),
    supportContinuity: z.boolean().default(false),
  }),
});

export type CrisisCoordinationState = z.infer<typeof CrisisCoordinationStateSchema>;

/**
 * Cross-Device Coordination Store Interface
 */
export interface CrossDeviceCoordinationStore {
  // Core state
  currentDevice: DeviceInfo;
  deviceNetwork: DeviceNetworkState;
  familySharing: FamilySharingState;
  crisisCoordination: CrisisCoordinationState;

  // Active sessions
  activeSessions: SessionContext[];
  sessionHandoffQueue: SessionContext[];

  // Performance tracking
  coordinationMetrics: {
    handoffSuccessRate: number;
    averageHandoffTime: number; // ms
    crisisResponseTime: number; // ms
    networkLatency: number; // ms
    conflictResolutionTime: number; // ms
  };

  // Device management actions
  registerDevice: (deviceInfo: Omit<DeviceInfo, 'lastSeen' | 'isActive'>) => Promise<void>;
  updateDeviceStatus: (deviceId: string, updates: Partial<DeviceInfo>) => Promise<void>;
  removeDevice: (deviceId: string) => Promise<void>;
  promoteDeviceToCoordinator: (deviceId?: string) => Promise<void>;

  // Session handoff actions
  initiateSessionHandoff: (sessionContext: SessionContext, targetDeviceId: string) => Promise<string>;
  acceptSessionHandoff: (sessionId: string) => Promise<SessionContext>;
  rejectSessionHandoff: (sessionId: string, reason: string) => Promise<void>;
  completeSessionHandoff: (sessionId: string) => Promise<void>;

  // Session management
  startSession: (sessionType: string, sessionData: any) => Promise<string>;
  updateSessionProgress: (sessionId: string, progress: number, data?: any) => Promise<void>;
  pauseSession: (sessionId: string) => Promise<void>;
  resumeSession: (sessionId: string, deviceId?: string) => Promise<void>;
  endSession: (sessionId: string, result: any) => Promise<void>;

  // Crisis coordination actions
  triggerCrisisAlert: (level: 'mild' | 'moderate' | 'severe' | 'emergency', context?: any) => Promise<void>;
  acknowledgeCrisisAlert: (deviceId: string) => Promise<void>;
  escalateCrisis: (newLevel: 'moderate' | 'severe' | 'emergency') => Promise<void>;
  resolveCrisis: () => Promise<void>;
  startCrisisRecovery: (deviceId: string) => Promise<void>;

  // Family sharing actions
  enableFamilySharing: (familyId: string, role: 'admin' | 'member') => Promise<void>;
  inviteFamilyMember: (memberInfo: any) => Promise<string>;
  updateFamilyPrivacy: (settings: Partial<FamilySharingState['privacySettings']>) => Promise<void>;
  shareFamilyInsight: (insightType: string, data: any) => Promise<void>;

  // Network coordination actions
  electCoordinator: () => Promise<string>;
  syncDeviceStates: () => Promise<void>;
  resolveNetworkConflict: (conflictId: string, resolution: any) => Promise<void>;
  optimizeNetworkTopology: () => Promise<void>;

  // Performance monitoring
  recordCoordinationMetric: (metric: string, value: number) => void;
  getNetworkHealthReport: () => any;
  optimizeNetworkPerformance: () => Promise<void>;

  // Integration actions
  integrateWithSyncStore: (syncStore: any) => void;
  integrateWithCrisisStore: (crisisStore: any) => void;
  integrateWithPaymentStore: (paymentStore: any) => void;

  // Internal state
  _internal: {
    coordinationTimers: Map<string, NodeJS.Timeout>;
    deviceHeartbeats: Map<string, NodeJS.Timeout>;
    sessionTimeouts: Map<string, NodeJS.Timeout>;
    crisisEscalationTimer: NodeJS.Timeout | null;
    storeIntegrations: Map<string, any>;
  };
}

/**
 * Create Cross-Device Coordination Store
 */
export const useCrossDeviceCoordinationStore = create<CrossDeviceCoordinationStore>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        // Initial state
        currentDevice: {
          deviceId: '',
          deviceName: '',
          deviceType: 'mobile',
          platform: 'ios',
          appVersion: '1.0.0',
          lastSeen: new Date().toISOString(),
          isActive: true,
          isOnline: true,
          capabilities: {
            canReceiveSessionHandoff: true,
            canInitiateSessionHandoff: true,
            supportsCrisisNotifications: true,
            supportsHapticFeedback: true,
            supportsPushNotifications: true,
            supportsWidgets: false,
          },
          syncPreferences: {
            autoSyncEnabled: true,
            syncFrequency: 'normal',
            crisisAlertEnabled: true,
            familySharingEnabled: false,
            sessionHandoffEnabled: true,
          },
          performance: {
            averageResponseTime: 0,
            lastSyncLatency: 0,
            reliabilityScore: 1,
            batteryOptimized: false,
          },
        },

        deviceNetwork: {
          connectedDevices: [],
          deviceRelationships: {},
          syncTopology: 'star',
          networkHealth: {
            overallLatency: 0,
            reliabilityScore: 1,
            conflictRate: 0,
          },
        },

        familySharing: {
          sharedInsights: {
            progressSharing: false,
            moodTrends: false,
            crisisAlerts: true,
            milestones: false,
            anonymizedData: true,
          },
          familyMembers: [],
          privacySettings: {
            shareProgress: false,
            shareCrisisState: true,
            shareSessionTypes: false,
            allowFamilyHandoff: false,
            childSafetyMode: false,
          },
          familyInsights: {},
        },

        crisisCoordination: {
          crisisActive: false,
          crisisLevel: 'none',
          crisisResponsePlan: {
            backupDevices: [],
            emergencyContacts: [],
            automaticHandoff: true,
          },
          crisisNotifications: [],
          crisisSessionState: {
            supportingDevices: [],
          },
          crisisRecovery: {
            recoveryStarted: false,
            postCrisisCheckin: false,
            supportContinuity: false,
          },
        },

        activeSessions: [],
        sessionHandoffQueue: [],

        coordinationMetrics: {
          handoffSuccessRate: 1,
          averageHandoffTime: 0,
          crisisResponseTime: 0,
          networkLatency: 0,
          conflictResolutionTime: 0,
        },

        _internal: {
          coordinationTimers: new Map(),
          deviceHeartbeats: new Map(),
          sessionTimeouts: new Map(),
          crisisEscalationTimer: null,
          storeIntegrations: new Map(),
        },

        // Device management actions
        registerDevice: async (deviceInfo) => {
          const fullDeviceInfo: DeviceInfo = {
            ...deviceInfo,
            lastSeen: new Date().toISOString(),
            isActive: true,
          };

          set((state) => {
            // Check if device already exists
            const existingIndex = state.deviceNetwork.connectedDevices.findIndex(
              d => d.deviceId === deviceInfo.deviceId
            );

            if (existingIndex !== -1) {
              // Update existing device
              state.deviceNetwork.connectedDevices[existingIndex] = fullDeviceInfo;
            } else {
              // Add new device
              state.deviceNetwork.connectedDevices.push(fullDeviceInfo);
            }

            // Add device relationship
            state.deviceNetwork.deviceRelationships[deviceInfo.deviceId] = {
              deviceId: deviceInfo.deviceId,
              relationship: 'secondary',
              trustLevel: 'full',
              syncPermissions: ['session_data', 'progress', 'crisis_alerts'],
            };
          });

          // Start heartbeat for the device
          get()._startDeviceHeartbeat(deviceInfo.deviceId);

          // If this is the first device or coordinator is unavailable, elect coordinator
          const state = get();
          if (!state.deviceNetwork.coordinatorDevice ||
              !state.deviceNetwork.connectedDevices.find(d =>
                d.deviceId === state.deviceNetwork.coordinatorDevice?.deviceId && d.isActive
              )) {
            await get().electCoordinator();
          }
        },

        updateDeviceStatus: async (deviceId, updates) => {
          set((state) => {
            const device = state.deviceNetwork.connectedDevices.find(d => d.deviceId === deviceId);
            if (device) {
              Object.assign(device, updates, { lastSeen: new Date().toISOString() });
            }

            // Update current device if it's this device
            if (state.currentDevice.deviceId === deviceId) {
              Object.assign(state.currentDevice, updates, { lastSeen: new Date().toISOString() });
            }
          });

          // Record performance metrics
          if (updates.performance) {
            get().recordCoordinationMetric('device_response_time', updates.performance.averageResponseTime || 0);
          }
        },

        removeDevice: async (deviceId) => {
          // Clean up device heartbeat
          const heartbeat = get()._internal.deviceHeartbeats.get(deviceId);
          if (heartbeat) {
            clearInterval(heartbeat);
            get()._internal.deviceHeartbeats.delete(deviceId);
          }

          set((state) => {
            // Remove device from network
            state.deviceNetwork.connectedDevices = state.deviceNetwork.connectedDevices.filter(
              d => d.deviceId !== deviceId
            );

            // Remove device relationship
            delete state.deviceNetwork.deviceRelationships[deviceId];

            // If this was the coordinator, elect a new one
            if (state.deviceNetwork.coordinatorDevice?.deviceId === deviceId) {
              state.deviceNetwork.coordinatorDevice = undefined;
            }
          });

          // Elect new coordinator if needed
          await get().electCoordinator();
        },

        promoteDeviceToCoordinator: async (deviceId) => {
          const targetDeviceId = deviceId || get().currentDevice.deviceId;
          const targetDevice = get().deviceNetwork.connectedDevices.find(d => d.deviceId === targetDeviceId);

          if (!targetDevice) {
            throw new Error('Target device not found');
          }

          set((state) => {
            state.deviceNetwork.coordinatorDevice = {
              deviceId: targetDeviceId,
              electedAt: new Date().toISOString(),
              leadershipScore: get()._calculateLeadershipScore(targetDevice),
              isStable: true,
            };

            // Update device relationship to primary
            if (state.deviceNetwork.deviceRelationships[targetDeviceId]) {
              state.deviceNetwork.deviceRelationships[targetDeviceId].relationship = 'primary';
            }
          });

          // Notify other devices of coordinator change
          await stateSynchronizationService.broadcastCoordinatorChange(targetDeviceId);
        },

        // Session handoff actions
        initiateSessionHandoff: async (sessionContext, targetDeviceId) => {
          const handoffId = `handoff_${Date.now()}_${Math.random()}`;
          const startTime = performance.now();

          // Verify target device capabilities
          const targetDevice = get().deviceNetwork.connectedDevices.find(d => d.deviceId === targetDeviceId);
          if (!targetDevice || !targetDevice.capabilities.canReceiveSessionHandoff) {
            throw new Error('Target device cannot receive session handoff');
          }

          // Prepare session context with integrity check
          const sessionWithIntegrity: SessionContext = {
            ...sessionContext,
            sessionId: handoffId,
            targetDeviceId,
            handoffTimestamp: new Date().toISOString(),
            integrity: {
              checksum: await get()._calculateSessionChecksum(sessionContext),
              encryptionVersion: '1.0',
              lastVerified: new Date().toISOString(),
            },
          };

          // Encrypt session data
          const encryptedSessionData = await encryptionService.encrypt(
            JSON.stringify(sessionWithIntegrity.sessionData)
          );
          sessionWithIntegrity.sessionData = encryptedSessionData;

          set((state) => {
            state.sessionHandoffQueue.push(sessionWithIntegrity);
          });

          try {
            // Send handoff request to target device
            await stateSynchronizationService.requestSessionHandoff(targetDeviceId, sessionWithIntegrity);

            const handoffTime = performance.now() - startTime;
            get().recordCoordinationMetric('handoff_time', handoffTime);

            return handoffId;

          } catch (error) {
            // Remove from queue on failure
            set((state) => {
              state.sessionHandoffQueue = state.sessionHandoffQueue.filter(
                s => s.sessionId !== handoffId
              );
            });

            throw error;
          }
        },

        acceptSessionHandoff: async (sessionId) => {
          const sessionContext = get().sessionHandoffQueue.find(s => s.sessionId === sessionId);
          if (!sessionContext) {
            throw new Error('Session handoff not found');
          }

          // Verify session integrity
          const isValid = await get()._verifySessionIntegrity(sessionContext);
          if (!isValid) {
            throw new Error('Session integrity verification failed');
          }

          // Decrypt session data
          const decryptedData = await encryptionService.decrypt(sessionContext.sessionData);
          sessionContext.sessionData = JSON.parse(decryptedData);

          // Move session to active sessions
          set((state) => {
            state.sessionHandoffQueue = state.sessionHandoffQueue.filter(
              s => s.sessionId !== sessionId
            );
            state.activeSessions.push(sessionContext);

            // Update current device session
            state.currentDevice.currentSession = {
              sessionId: sessionContext.sessionId,
              sessionType: sessionContext.sessionType,
              sessionProgress: sessionContext.progress,
              startTime: sessionContext.startTime,
              canInterrupt: sessionContext.therapeuticContext.canPause,
            };
          });

          // Notify source device of successful handoff
          await stateSynchronizationService.confirmSessionHandoff(
            sessionContext.sourceDeviceId,
            sessionId
          );

          // Update success metrics
          const state = get();
          const successfulHandoffs = state.coordinationMetrics.handoffSuccessRate * 100 + 1;
          set((state) => {
            state.coordinationMetrics.handoffSuccessRate = successfulHandoffs / (successfulHandoffs + 1);
          });

          return sessionContext;
        },

        rejectSessionHandoff: async (sessionId, reason) => {
          set((state) => {
            state.sessionHandoffQueue = state.sessionHandoffQueue.filter(
              s => s.sessionId !== sessionId
            );
          });

          const sessionContext = get().sessionHandoffQueue.find(s => s.sessionId === sessionId);
          if (sessionContext) {
            // Notify source device of rejection
            await stateSynchronizationService.rejectSessionHandoff(
              sessionContext.sourceDeviceId,
              sessionId,
              reason
            );
          }
        },

        completeSessionHandoff: async (sessionId) => {
          set((state) => {
            // Remove session from active sessions
            state.activeSessions = state.activeSessions.filter(s => s.sessionId !== sessionId);

            // Clear current device session if it matches
            if (state.currentDevice.currentSession?.sessionId === sessionId) {
              state.currentDevice.currentSession = undefined;
            }
          });
        },

        // Session management
        startSession: async (sessionType, sessionData) => {
          const sessionId = `session_${Date.now()}_${Math.random()}`;
          const sessionContext: SessionContext = {
            sessionId,
            sessionType: sessionType as any,
            currentStep: 0,
            totalSteps: sessionData.totalSteps || 1,
            progress: 0,
            startTime: new Date().toISOString(),
            sessionData: await encryptionService.encrypt(JSON.stringify(sessionData)),
            userResponses: [],
            sourceDeviceId: get().currentDevice.deviceId,
            therapeuticContext: {
              crisisLevel: sessionData.crisisLevel || 'none',
              needsContinuity: sessionData.needsContinuity || false,
              canPause: sessionData.canPause !== false,
              privacyLevel: sessionData.privacyLevel || 'private',
            },
            integrity: {
              checksum: await get()._calculateSessionChecksum(sessionData),
              encryptionVersion: '1.0',
              lastVerified: new Date().toISOString(),
            },
          };

          set((state) => {
            state.activeSessions.push(sessionContext);
            state.currentDevice.currentSession = {
              sessionId,
              sessionType: sessionType as any,
              sessionProgress: 0,
              startTime: sessionContext.startTime,
              canInterrupt: sessionContext.therapeuticContext.canPause,
            };
          });

          // Set session timeout if applicable
          if (sessionData.timeoutMinutes) {
            const timeout = setTimeout(() => {
              get().endSession(sessionId, { reason: 'timeout' });
            }, sessionData.timeoutMinutes * 60 * 1000);

            get()._internal.sessionTimeouts.set(sessionId, timeout);
          }

          // Sync session start with other devices if family sharing is enabled
          const state = get();
          if (state.familySharing.privacySettings.shareSessionTypes) {
            await stateSynchronizationService.broadcastSessionStart(sessionContext);
          }

          return sessionId;
        },

        updateSessionProgress: async (sessionId, progress, data) => {
          const session = get().activeSessions.find(s => s.sessionId === sessionId);
          if (!session) return;

          set((state) => {
            const sessionIndex = state.activeSessions.findIndex(s => s.sessionId === sessionId);
            if (sessionIndex !== -1) {
              state.activeSessions[sessionIndex].progress = progress;
              state.activeSessions[sessionIndex].currentStep = Math.floor(progress * session.totalSteps);

              if (data) {
                // Encrypt and add response data
                state.activeSessions[sessionIndex].userResponses.push({
                  timestamp: new Date().toISOString(),
                  data: data, // Will be encrypted when saved
                });
              }
            }

            // Update current device session progress
            if (state.currentDevice.currentSession?.sessionId === sessionId) {
              state.currentDevice.currentSession.sessionProgress = progress;
            }
          });

          // Sync progress with coordinator device
          const coordinatorId = get().deviceNetwork.coordinatorDevice?.deviceId;
          if (coordinatorId && coordinatorId !== get().currentDevice.deviceId) {
            await stateSynchronizationService.syncSessionProgress(coordinatorId, sessionId, progress);
          }
        },

        pauseSession: async (sessionId) => {
          const session = get().activeSessions.find(s => s.sessionId === sessionId);
          if (!session || !session.therapeuticContext.canPause) return;

          // Save current session state
          await get()._saveSessionState(sessionId);

          set((state) => {
            const sessionIndex = state.activeSessions.findIndex(s => s.sessionId === sessionId);
            if (sessionIndex !== -1) {
              // Mark session as paused (could add a paused field to schema)
              state.activeSessions[sessionIndex].therapeuticContext.canPause = false;
            }
          });
        },

        resumeSession: async (sessionId, deviceId) => {
          const targetDeviceId = deviceId || get().currentDevice.deviceId;
          const session = get().activeSessions.find(s => s.sessionId === sessionId);

          if (!session) return;

          if (targetDeviceId !== get().currentDevice.deviceId) {
            // Resume on different device - initiate handoff
            await get().initiateSessionHandoff(session, targetDeviceId);
          } else {
            // Resume on same device
            set((state) => {
              const sessionIndex = state.activeSessions.findIndex(s => s.sessionId === sessionId);
              if (sessionIndex !== -1) {
                state.activeSessions[sessionIndex].therapeuticContext.canPause = true;
              }
            });
          }
        },

        endSession: async (sessionId, result) => {
          const session = get().activeSessions.find(s => s.sessionId === sessionId);
          if (!session) return;

          // Clear session timeout
          const timeout = get()._internal.sessionTimeouts.get(sessionId);
          if (timeout) {
            clearTimeout(timeout);
            get()._internal.sessionTimeouts.delete(sessionId);
          }

          // Save session results
          const sessionResult = {
            sessionId,
            sessionType: session.sessionType,
            completedAt: new Date().toISOString(),
            duration: Date.now() - new Date(session.startTime).getTime(),
            progress: session.progress,
            result,
            userResponses: session.userResponses,
          };

          // Store encrypted session result
          await stateSynchronizationService.saveSessionResult(
            await encryptionService.encrypt(JSON.stringify(sessionResult))
          );

          set((state) => {
            // Remove from active sessions
            state.activeSessions = state.activeSessions.filter(s => s.sessionId !== sessionId);

            // Clear current device session
            if (state.currentDevice.currentSession?.sessionId === sessionId) {
              state.currentDevice.currentSession = undefined;
            }
          });

          // Sync session completion with family if enabled
          const state = get();
          if (state.familySharing.privacySettings.shareProgress) {
            await stateSynchronizationService.broadcastSessionCompletion(sessionResult);
          }
        },

        // Crisis coordination actions
        triggerCrisisAlert: async (level, context) => {
          const crisisId = `crisis_${Date.now()}_${Math.random()}`;
          const startTime = performance.now();

          set((state) => {
            state.crisisCoordination.crisisActive = true;
            state.crisisCoordination.crisisLevel = level;
            state.crisisCoordination.crisisDeviceId = state.currentDevice.deviceId;
            state.crisisCoordination.crisisTimestamp = new Date().toISOString();
          });

          // Determine crisis response devices
          const responseDevices = get()._selectCrisisResponseDevices(level);

          // Send crisis notifications to all devices
          const notifications = await Promise.all(
            responseDevices.map(async (deviceId) => {
              const device = get().deviceNetwork.connectedDevices.find(d => d.deviceId === deviceId);
              const notificationType = get()._determineCrisisNotificationType(level, device);

              const notification = {
                deviceId,
                notificationType,
                sentAt: new Date().toISOString(),
              };

              try {
                await stateSynchronizationService.sendCrisisNotification(deviceId, {
                  crisisId,
                  level,
                  context,
                  sourceDevice: get().currentDevice.deviceId,
                  urgency: notificationType,
                });

                return notification;
              } catch (error) {
                console.error(`Failed to send crisis notification to ${deviceId}:`, error);
                return { ...notification, error: error.message };
              }
            })
          );

          set((state) => {
            state.crisisCoordination.crisisNotifications.push(...notifications);
          });

          // Record crisis response time
          const responseTime = performance.now() - startTime;
          get().recordCoordinationMetric('crisis_response_time', responseTime);

          // Start crisis escalation timer for severe/emergency cases
          if (level === 'severe' || level === 'emergency') {
            const escalationTimer = setTimeout(() => {
              // Auto-escalate if no response within time limit
              get().escalateCrisis(level === 'severe' ? 'emergency' : 'emergency');
            }, level === 'emergency' ? 30000 : 60000); // 30s for emergency, 60s for severe

            set((state) => {
              state._internal.crisisEscalationTimer = escalationTimer;
            });
          }

          // Change network topology to crisis mode
          set((state) => {
            state.deviceNetwork.syncTopology = 'crisis_mode';
            state.deviceNetwork.lastTopologyChange = new Date().toISOString();
          });
        },

        acknowledgeCrisisAlert: async (deviceId) => {
          set((state) => {
            const notification = state.crisisCoordination.crisisNotifications.find(
              n => n.deviceId === deviceId && !n.acknowledgedAt
            );
            if (notification) {
              notification.acknowledgedAt = new Date().toISOString();
              notification.response = 'acknowledged';
            }
          });

          // If enough devices have acknowledged, consider crisis handled
          const state = get();
          const totalNotifications = state.crisisCoordination.crisisNotifications.length;
          const acknowledgedNotifications = state.crisisCoordination.crisisNotifications.filter(
            n => n.acknowledgedAt
          ).length;

          if (acknowledgedNotifications / totalNotifications >= 0.5) {
            // Majority acknowledged - reduce crisis escalation
            if (state._internal.crisisEscalationTimer) {
              clearTimeout(state._internal.crisisEscalationTimer);
              set((state) => {
                state._internal.crisisEscalationTimer = null;
              });
            }
          }
        },

        escalateCrisis: async (newLevel) => {
          const currentLevel = get().crisisCoordination.crisisLevel;
          if (currentLevel === 'emergency') return; // Already at highest level

          set((state) => {
            state.crisisCoordination.crisisLevel = newLevel;
          });

          // Trigger new crisis alert with higher level
          await get().triggerCrisisAlert(newLevel, { escalatedFrom: currentLevel });

          // Add emergency contacts if escalating to emergency
          if (newLevel === 'emergency') {
            // Trigger external emergency protocols
            await stateSynchronizationService.triggerEmergencyProtocols();
          }
        },

        resolveCrisis: async () => {
          // Clear crisis escalation timer
          if (get()._internal.crisisEscalationTimer) {
            clearTimeout(get()._internal.crisisEscalationTimer);
          }

          set((state) => {
            state.crisisCoordination.crisisActive = false;
            state.crisisCoordination.crisisLevel = 'none';
            state.crisisCoordination.crisisDeviceId = undefined;
            state.crisisCoordination.crisisTimestamp = undefined;
            state._internal.crisisEscalationTimer = null;

            // Clear crisis notifications
            state.crisisCoordination.crisisNotifications = [];

            // Reset network topology
            state.deviceNetwork.syncTopology = 'star';
            state.deviceNetwork.lastTopologyChange = new Date().toISOString();
          });

          // Notify all devices of crisis resolution
          const connectedDevices = get().deviceNetwork.connectedDevices;
          await Promise.all(
            connectedDevices.map(device =>
              stateSynchronizationService.sendCrisisResolution(device.deviceId)
            )
          );
        },

        startCrisisRecovery: async (deviceId) => {
          set((state) => {
            state.crisisCoordination.crisisRecovery.recoveryStarted = true;
            state.crisisCoordination.crisisRecovery.recoveryDeviceId = deviceId;
            state.crisisCoordination.crisisRecovery.recoverySessionId = `recovery_${Date.now()}`;
          });

          // Start recovery session
          const recoverySessionId = await get().startSession('crisis_recovery', {
            crisisLevel: get().crisisCoordination.crisisLevel,
            needsContinuity: true,
            canPause: false,
            privacyLevel: 'private',
          });

          set((state) => {
            state.crisisCoordination.crisisRecovery.recoverySessionId = recoverySessionId;
          });
        },

        // Family sharing actions
        enableFamilySharing: async (familyId, role) => {
          set((state) => {
            state.familySharing.familyId = familyId;
            state.familySharing.familyRole = role;
            state.currentDevice.syncPreferences.familySharingEnabled = true;
          });

          // Update device relationships for family context
          await get()._updateFamilyDeviceRelationships();
        },

        inviteFamilyMember: async (memberInfo) => {
          const inviteId = `invite_${Date.now()}_${Math.random()}`;

          set((state) => {
            state.familySharing.familyMembers.push({
              memberId: inviteId,
              memberName: memberInfo.name,
              role: memberInfo.role || 'member',
              devices: [],
              sharingLevel: memberInfo.sharingLevel || 'basic',
              crisisContactEnabled: memberInfo.crisisContact || false,
            });
          });

          // Send family invitation
          await stateSynchronizationService.sendFamilyInvitation(memberInfo.email, inviteId);

          return inviteId;
        },

        updateFamilyPrivacy: async (settings) => {
          set((state) => {
            Object.assign(state.familySharing.privacySettings, settings);
          });

          // Sync privacy settings with family members
          await stateSynchronizationService.syncFamilyPrivacySettings(settings);
        },

        shareFamilyInsight: async (insightType, data) => {
          const state = get();

          // Check privacy settings
          if (!state.familySharing.sharedInsights[insightType]) {
            throw new Error(`Sharing not enabled for ${insightType}`);
          }

          // Anonymize data if required
          let sharedData = data;
          if (state.familySharing.sharedInsights.anonymizedData) {
            sharedData = await get()._anonymizeInsightData(data);
          }

          // Share with family members
          await stateSynchronizationService.shareFamilyInsight(
            state.familySharing.familyId!,
            insightType,
            sharedData
          );
        },

        // Network coordination actions
        electCoordinator: async () => {
          const devices = get().deviceNetwork.connectedDevices.filter(d => d.isActive);
          if (devices.length === 0) return '';

          // Calculate leadership scores for all devices
          const deviceScores = devices.map(device => ({
            deviceId: device.deviceId,
            score: get()._calculateLeadershipScore(device),
            device,
          }));

          // Sort by score (highest first)
          deviceScores.sort((a, b) => b.score - a.score);

          const newCoordinator = deviceScores[0];

          set((state) => {
            state.deviceNetwork.coordinatorDevice = {
              deviceId: newCoordinator.deviceId,
              electedAt: new Date().toISOString(),
              leadershipScore: newCoordinator.score,
              isStable: true,
            };

            // Update device relationship
            if (state.deviceNetwork.deviceRelationships[newCoordinator.deviceId]) {
              state.deviceNetwork.deviceRelationships[newCoordinator.deviceId].relationship = 'primary';
            }
          });

          // Notify all devices of new coordinator
          await stateSynchronizationService.broadcastCoordinatorElection(newCoordinator.deviceId);

          return newCoordinator.deviceId;
        },

        syncDeviceStates: async () => {
          const coordinator = get().deviceNetwork.coordinatorDevice;
          if (!coordinator) return;

          const connectedDevices = get().deviceNetwork.connectedDevices;

          // Collect states from all devices
          const deviceStates = await Promise.all(
            connectedDevices.map(async (device) => {
              try {
                const state = await stateSynchronizationService.getDeviceState(device.deviceId);
                return { deviceId: device.deviceId, state };
              } catch (error) {
                console.error(`Failed to get state from device ${device.deviceId}:`, error);
                return { deviceId: device.deviceId, state: null };
              }
            })
          );

          // Resolve conflicts and merge states
          const mergedState = await get()._mergeDeviceStates(deviceStates);

          // Distribute merged state to all devices
          await Promise.all(
            connectedDevices.map(device =>
              stateSynchronizationService.updateDeviceState(device.deviceId, mergedState)
            )
          );
        },

        resolveNetworkConflict: async (conflictId, resolution) => {
          // Implementation for network-level conflict resolution
          await stateSynchronizationService.resolveNetworkConflict(conflictId, resolution);

          // Record resolution time
          const resolutionTime = performance.now(); // Should track from conflict detection
          get().recordCoordinationMetric('conflict_resolution_time', resolutionTime);
        },

        optimizeNetworkTopology: async () => {
          const devices = get().deviceNetwork.connectedDevices;
          const networkHealth = get().deviceNetwork.networkHealth;

          // Analyze current topology performance
          if (networkHealth.reliabilityScore < 0.8 || networkHealth.overallLatency > 1000) {
            // Switch to mesh topology for better reliability
            set((state) => {
              state.deviceNetwork.syncTopology = 'mesh';
              state.deviceNetwork.lastTopologyChange = new Date().toISOString();
            });
          } else if (devices.length <= 3) {
            // Use star topology for small networks
            set((state) => {
              state.deviceNetwork.syncTopology = 'star';
              state.deviceNetwork.lastTopologyChange = new Date().toISOString();
            });
          }

          // Notify devices of topology change
          await stateSynchronizationService.broadcastTopologyChange(
            get().deviceNetwork.syncTopology
          );
        },

        // Performance monitoring
        recordCoordinationMetric: (metric, value) => {
          set((state) => {
            switch (metric) {
              case 'handoff_time':
                state.coordinationMetrics.averageHandoffTime =
                  (state.coordinationMetrics.averageHandoffTime + value) / 2;
                break;
              case 'crisis_response_time':
                state.coordinationMetrics.crisisResponseTime = value;
                break;
              case 'network_latency':
                state.coordinationMetrics.networkLatency = value;
                state.deviceNetwork.networkHealth.overallLatency = value;
                break;
              case 'conflict_resolution_time':
                state.coordinationMetrics.conflictResolutionTime = value;
                break;
            }
          });
        },

        getNetworkHealthReport: () => {
          const state = get();
          return {
            networkHealth: state.deviceNetwork.networkHealth,
            coordinationMetrics: state.coordinationMetrics,
            deviceCount: state.deviceNetwork.connectedDevices.length,
            activeDevices: state.deviceNetwork.connectedDevices.filter(d => d.isActive).length,
            crisisCapableDevices: state.deviceNetwork.connectedDevices.filter(
              d => d.capabilities.supportsCrisisNotifications
            ).length,
            topology: state.deviceNetwork.syncTopology,
            coordinator: state.deviceNetwork.coordinatorDevice,
          };
        },

        optimizeNetworkPerformance: async () => {
          const healthReport = get().getNetworkHealthReport();

          // Remove inactive devices
          const inactiveDevices = get().deviceNetwork.connectedDevices.filter(
            d => !d.isActive || Date.now() - new Date(d.lastSeen).getTime() > 300000 // 5 minutes
          );

          for (const device of inactiveDevices) {
            await get().removeDevice(device.deviceId);
          }

          // Optimize sync frequencies based on network performance
          if (healthReport.networkHealth.overallLatency > 1000) {
            // Reduce sync frequency for high latency
            const connectedDevices = get().deviceNetwork.connectedDevices;
            await Promise.all(
              connectedDevices.map(device =>
                stateSynchronizationService.updateDeviceSyncFrequency(
                  device.deviceId,
                  'background'
                )
              )
            );
          }

          // Elect new coordinator if current one is underperforming
          const coordinator = get().deviceNetwork.coordinatorDevice;
          if (coordinator) {
            const coordinatorDevice = get().deviceNetwork.connectedDevices.find(
              d => d.deviceId === coordinator.deviceId
            );
            if (coordinatorDevice && coordinatorDevice.performance.reliabilityScore < 0.7) {
              await get().electCoordinator();
            }
          }
        },

        // Integration actions
        integrateWithSyncStore: (syncStore) => {
          get()._internal.storeIntegrations.set('sync', syncStore);

          // Subscribe to sync store events
          syncStore.subscribe((state: any) => {
            if (state.crisisSafety.crisisDetected) {
              get().triggerCrisisAlert(state.crisisSafety.crisisLevel);
            }
          });
        },

        integrateWithCrisisStore: (crisisStore) => {
          get()._internal.storeIntegrations.set('crisis', crisisStore);

          // Subscribe to crisis store events
          crisisStore.subscribe((state: any) => {
            if (state.crisisDetected && !get().crisisCoordination.crisisActive) {
              get().triggerCrisisAlert(state.crisisLevel);
            }
          });
        },

        integrateWithPaymentStore: (paymentStore) => {
          get()._internal.storeIntegrations.set('payment', paymentStore);

          // Subscribe to payment changes that affect device limits
          paymentStore.subscribe((state: any) => {
            const deviceLimit = get()._getDeviceLimitForTier(state.subscriptionTier);
            const currentDevices = get().deviceNetwork.connectedDevices.length;

            if (currentDevices > deviceLimit) {
              // Need to remove excess devices
              get()._enforceDeviceLimit(deviceLimit);
            }
          });
        },

        // Helper methods
        _startDeviceHeartbeat: (deviceId: string) => {
          const heartbeat = setInterval(async () => {
            try {
              const isAlive = await stateSynchronizationService.pingDevice(deviceId);
              if (!isAlive) {
                await get().removeDevice(deviceId);
              } else {
                await get().updateDeviceStatus(deviceId, { lastSeen: new Date().toISOString() });
              }
            } catch (error) {
              console.error(`Heartbeat failed for device ${deviceId}:`, error);
            }
          }, 30000); // 30 second heartbeat

          get()._internal.deviceHeartbeats.set(deviceId, heartbeat);
        },

        _calculateLeadershipScore: (device: DeviceInfo): number => {
          let score = 0;

          // Device type preference (mobile/tablet preferred for availability)
          if (device.deviceType === 'mobile') score += 0.3;
          else if (device.deviceType === 'tablet') score += 0.25;
          else if (device.deviceType === 'desktop') score += 0.2;

          // Performance metrics
          score += device.performance.reliabilityScore * 0.3;
          score += Math.max(0, 1 - device.performance.averageResponseTime / 1000) * 0.2; // Prefer <1s response

          // Capabilities
          if (device.capabilities.supportsCrisisNotifications) score += 0.1;
          if (device.capabilities.canInitiateSessionHandoff) score += 0.05;
          if (device.capabilities.supportsPushNotifications) score += 0.05;

          return Math.min(1, score);
        },

        _calculateSessionChecksum: async (sessionData: any): Promise<string> => {
          // Simple checksum calculation for session integrity
          const dataString = JSON.stringify(sessionData);
          return btoa(dataString).slice(0, 16); // Simple checksum
        },

        _verifySessionIntegrity: async (sessionContext: SessionContext): Promise<boolean> => {
          try {
            // Verify checksum
            const expectedChecksum = await get()._calculateSessionChecksum(sessionContext.sessionData);
            return expectedChecksum === sessionContext.integrity.checksum;
          } catch (error) {
            console.error('Session integrity verification failed:', error);
            return false;
          }
        },

        _saveSessionState: async (sessionId: string) => {
          const session = get().activeSessions.find(s => s.sessionId === sessionId);
          if (!session) return;

          const sessionState = {
            sessionId,
            sessionData: session.sessionData,
            progress: session.progress,
            currentStep: session.currentStep,
            userResponses: session.userResponses,
            savedAt: new Date().toISOString(),
          };

          await AsyncStorage.setItem(
            `session_state_${sessionId}`,
            await encryptionService.encrypt(JSON.stringify(sessionState))
          );
        },

        _selectCrisisResponseDevices: (level: string): string[] => {
          const devices = get().deviceNetwork.connectedDevices.filter(
            d => d.isActive && d.capabilities.supportsCrisisNotifications
          );

          switch (level) {
            case 'emergency':
              // All devices for emergency
              return devices.map(d => d.deviceId);
            case 'severe':
              // Primary devices and family devices
              return devices
                .filter(d =>
                  get().deviceNetwork.deviceRelationships[d.deviceId]?.relationship === 'primary' ||
                  get().deviceNetwork.deviceRelationships[d.deviceId]?.relationship === 'family_member'
                )
                .map(d => d.deviceId);
            default:
              // Only primary device for mild/moderate
              const primaryDevice = devices.find(d =>
                get().deviceNetwork.deviceRelationships[d.deviceId]?.relationship === 'primary'
              );
              return primaryDevice ? [primaryDevice.deviceId] : [];
          }
        },

        _determineCrisisNotificationType: (level: string, device?: DeviceInfo) => {
          if (!device) return 'standard';

          switch (level) {
            case 'emergency':
              return 'immediate';
            case 'severe':
              return 'urgent';
            case 'moderate':
              return 'standard';
            default:
              return 'silent';
          }
        },

        _updateFamilyDeviceRelationships: async () => {
          const familyMembers = get().familySharing.familyMembers;

          for (const member of familyMembers) {
            for (const deviceId of member.devices) {
              set((state) => {
                state.deviceNetwork.deviceRelationships[deviceId] = {
                  deviceId,
                  relationship: 'family_member',
                  trustLevel: 'limited',
                  syncPermissions: ['crisis_alerts', 'family_insights'],
                };
              });
            }
          }
        },

        _anonymizeInsightData: async (data: any) => {
          // Remove personally identifiable information
          const anonymized = { ...data };
          delete anonymized.userId;
          delete anonymized.deviceId;
          delete anonymized.sessionData;

          // Aggregate numeric data
          if (anonymized.moodScores) {
            anonymized.moodTrend = anonymized.moodScores.length > 0 ?
              anonymized.moodScores.reduce((a, b) => a + b, 0) / anonymized.moodScores.length : 0;
            delete anonymized.moodScores;
          }

          return anonymized;
        },

        _mergeDeviceStates: async (deviceStates: any[]) => {
          // Implement state merging logic based on timestamps and priorities
          const validStates = deviceStates.filter(ds => ds.state !== null);

          if (validStates.length === 0) return {};

          // Use most recent state as base
          const baseState = validStates.reduce((latest, current) => {
            const latestTime = new Date(latest.state.lastUpdated || 0).getTime();
            const currentTime = new Date(current.state.lastUpdated || 0).getTime();
            return currentTime > latestTime ? current : latest;
          });

          return baseState.state;
        },

        _getDeviceLimitForTier: (tier: SubscriptionTier): number => {
          switch (tier) {
            case 'enterprise': return 50;
            case 'family': return 10;
            case 'premium': return 5;
            case 'free': return 1;
            default: return 1;
          }
        },

        _enforceDeviceLimit: async (limit: number) => {
          const devices = get().deviceNetwork.connectedDevices;
          if (devices.length <= limit) return;

          // Sort devices by last seen and reliability, keep the best ones
          const sortedDevices = devices.sort((a, b) => {
            const scoreA = a.performance.reliabilityScore + (a.isActive ? 0.5 : 0);
            const scoreB = b.performance.reliabilityScore + (b.isActive ? 0.5 : 0);
            return scoreB - scoreA;
          });

          const devicesToRemove = sortedDevices.slice(limit);
          for (const device of devicesToRemove) {
            await get().removeDevice(device.deviceId);
          }
        },
      })),
      {
        name: 'being-cross-device-coordination-store',
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          currentDevice: state.currentDevice,
          deviceNetwork: state.deviceNetwork,
          familySharing: state.familySharing,
          coordinationMetrics: state.coordinationMetrics,
        }),
      }
    )
  )
);

// Cross-Device Coordination Selectors
export const crossDeviceSelectors = {
  // Device selectors
  getCurrentDevice: (state: CrossDeviceCoordinationStore) => state.currentDevice,
  getConnectedDevices: (state: CrossDeviceCoordinationStore) => state.deviceNetwork.connectedDevices,
  getActiveDevices: (state: CrossDeviceCoordinationStore) =>
    state.deviceNetwork.connectedDevices.filter(d => d.isActive),
  getCoordinator: (state: CrossDeviceCoordinationStore) => state.deviceNetwork.coordinatorDevice,
  isCoordinator: (state: CrossDeviceCoordinationStore) =>
    state.deviceNetwork.coordinatorDevice?.deviceId === state.currentDevice.deviceId,

  // Session selectors
  getActiveSessions: (state: CrossDeviceCoordinationStore) => state.activeSessions,
  getCurrentSession: (state: CrossDeviceCoordinationStore) => state.currentDevice.currentSession,
  getPendingHandoffs: (state: CrossDeviceCoordinationStore) => state.sessionHandoffQueue,

  // Crisis selectors
  isCrisisActive: (state: CrossDeviceCoordinationStore) => state.crisisCoordination.crisisActive,
  getCrisisLevel: (state: CrossDeviceCoordinationStore) => state.crisisCoordination.crisisLevel,
  getCrisisResponseDevices: (state: CrossDeviceCoordinationStore) =>
    state.crisisCoordination.crisisNotifications.map(n => n.deviceId),

  // Family selectors
  isFamilySharingEnabled: (state: CrossDeviceCoordinationStore) =>
    state.currentDevice.syncPreferences.familySharingEnabled,
  getFamilyMembers: (state: CrossDeviceCoordinationStore) => state.familySharing.familyMembers,
  getFamilyPrivacySettings: (state: CrossDeviceCoordinationStore) =>
    state.familySharing.privacySettings,

  // Performance selectors
  getCoordinationMetrics: (state: CrossDeviceCoordinationStore) => state.coordinationMetrics,
  getNetworkHealth: (state: CrossDeviceCoordinationStore) => state.deviceNetwork.networkHealth,
  getNetworkTopology: (state: CrossDeviceCoordinationStore) => state.deviceNetwork.syncTopology,
};

// Cross-Device Coordination Hooks
export const useCrossDeviceCoordination = () => {
  const store = useCrossDeviceCoordinationStore();

  return {
    // State
    currentDevice: store.currentDevice,
    deviceNetwork: store.deviceNetwork,
    familySharing: store.familySharing,
    crisisCoordination: store.crisisCoordination,
    activeSessions: store.activeSessions,
    coordinationMetrics: store.coordinationMetrics,

    // Device management
    registerDevice: store.registerDevice,
    updateDeviceStatus: store.updateDeviceStatus,
    removeDevice: store.removeDevice,
    promoteDeviceToCoordinator: store.promoteDeviceToCoordinator,

    // Session management
    startSession: store.startSession,
    updateSessionProgress: store.updateSessionProgress,
    pauseSession: store.pauseSession,
    resumeSession: store.resumeSession,
    endSession: store.endSession,

    // Session handoff
    initiateSessionHandoff: store.initiateSessionHandoff,
    acceptSessionHandoff: store.acceptSessionHandoff,
    rejectSessionHandoff: store.rejectSessionHandoff,
    completeSessionHandoff: store.completeSessionHandoff,

    // Crisis coordination
    triggerCrisisAlert: store.triggerCrisisAlert,
    acknowledgeCrisisAlert: store.acknowledgeCrisisAlert,
    escalateCrisis: store.escalateCrisis,
    resolveCrisis: store.resolveCrisis,
    startCrisisRecovery: store.startCrisisRecovery,

    // Family sharing
    enableFamilySharing: store.enableFamilySharing,
    inviteFamilyMember: store.inviteFamilyMember,
    updateFamilyPrivacy: store.updateFamilyPrivacy,
    shareFamilyInsight: store.shareFamilyInsight,

    // Network coordination
    electCoordinator: store.electCoordinator,
    syncDeviceStates: store.syncDeviceStates,
    optimizeNetworkTopology: store.optimizeNetworkTopology,

    // Performance
    recordCoordinationMetric: store.recordCoordinationMetric,
    getNetworkHealthReport: store.getNetworkHealthReport,
    optimizeNetworkPerformance: store.optimizeNetworkPerformance,

    // Integration
    integrateWithSyncStore: store.integrateWithSyncStore,
    integrateWithCrisisStore: store.integrateWithCrisisStore,
    integrateWithPaymentStore: store.integrateWithPaymentStore,

    // Selectors
    ...crossDeviceSelectors,
  };
};

export default useCrossDeviceCoordinationStore;