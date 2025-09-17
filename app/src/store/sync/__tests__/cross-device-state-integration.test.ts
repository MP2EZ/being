/**
 * Cross-Device State Management Integration Tests
 *
 * Comprehensive test suite validating:
 * - Crisis state sync <200ms requirement
 * - Therapeutic continuity preservation
 * - Conflict resolution with clinical priority
 * - Device coordination and handoffs
 * - Performance optimization and memory management
 * - Integration with existing stores
 */

import { act, renderHook } from '@testing-library/react-hooks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jest } from '@jest/globals';

// Test imports
import { useCrossDeviceStateStore } from '../cross-device-state-store';
import { useStateSyncIntegration, useIntegratedSync, useCrisisIntegration } from '../state-sync-integration';
import { SyncEntityType, SyncOperationType } from '../../../types/sync';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../../services/security/EncryptionService');
jest.mock('../../../services/cloud/CrossDeviceSyncAPI');
jest.mock('../../../services/security/SecurityControlsService');

// Mock stores
const mockUserStore = {
  getState: () => ({
    user: { id: 'user123', preferences: { theme: 'dark' } },
    preferences: { notifications: true },
  }),
  subscribe: jest.fn(),
};

const mockCheckInStore = {
  getState: () => ({
    currentCheckIn: { id: 'checkin123', type: 'morning', data: { mood: 7 } },
    currentSession: { sessionId: 'session123', progress: 0.5 },
  }),
  subscribe: jest.fn(),
};

const mockAssessmentStore = {
  getState: () => ({
    lastAssessment: { id: 'assessment123', type: 'phq9', score: 15, completed: true },
  }),
  subscribe: jest.fn(),
};

// Test utilities
const createMockDevice = (overrides = {}) => ({
  deviceId: `device_${Math.random().toString(36).slice(2, 9)}`,
  deviceName: 'Test Device',
  deviceType: 'mobile' as const,
  platform: 'ios' as const,
  appVersion: '1.0.0',
  isOnline: true,
  syncCapabilities: {
    canHostCrisisState: true,
    canReceiveEmergencyHandoff: true,
    supportsRealtimeSync: true,
    maxConcurrentSessions: 5,
    encryptionVersion: '1.0',
    conflictResolutionSupport: true,
  },
  performanceProfile: {
    averageStateTransferTime: 150,
    maxStateSize: 1024 * 1024,
    memoryAvailable: 100 * 1024 * 1024,
    batteryLevel: 0.8,
    networkQuality: 'excellent' as const,
    crisisResponseReady: true,
  },
  ...overrides,
});

const createMockSessionData = (overrides = {}) => ({
  sessionId: `session_${Math.random().toString(36).slice(2, 9)}`,
  type: 'assessment',
  totalSteps: 5,
  crisisLevel: 'none',
  needsContinuity: true,
  canPause: true,
  canHandoff: true,
  privacyLevel: 'private',
  ...overrides,
});

describe('Cross-Device State Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();

    // Reset stores
    useCrossDeviceStateStore.getState().deviceRegistry.clear();
    useCrossDeviceStateStore.getState().activeSessions.clear();
  });

  describe('Device Registration and Management', () => {
    it('should register a device successfully', async () => {
      const { result } = renderHook(() => useCrossDeviceStateStore());
      const deviceInfo = createMockDevice();

      await act(async () => {
        const deviceId = await result.current.registerDevice(deviceInfo);
        expect(deviceId).toBe(deviceInfo.deviceId);
      });

      const device = result.current.deviceRegistry.get(deviceInfo.deviceId);
      expect(device).toBeDefined();
      expect(device?.deviceName).toBe(deviceInfo.deviceName);
      expect(device?.isOnline).toBe(true);
    });

    it('should update device state and maintain checksum integrity', async () => {
      const { result } = renderHook(() => useCrossDeviceStateStore());
      const deviceInfo = createMockDevice();

      await act(async () => {
        const deviceId = await result.current.registerDevice(deviceInfo);

        await result.current.updateDeviceState(deviceId, {
          performanceProfile: {
            ...deviceInfo.performanceProfile,
            averageStateTransferTime: 200,
          },
        });
      });

      const device = result.current.deviceRegistry.get(deviceInfo.deviceId);
      expect(device?.performanceProfile.averageStateTransferTime).toBe(200);
      expect(device?.stateSnapshot.checksum).toBeDefined();
    });

    it('should remove device and clean up resources', async () => {
      const { result } = renderHook(() => useCrossDeviceStateStore());
      const deviceInfo = createMockDevice();

      await act(async () => {
        const deviceId = await result.current.registerDevice(deviceInfo);
        await result.current.removeDevice(deviceId);
      });

      expect(result.current.deviceRegistry.has(deviceInfo.deviceId)).toBe(false);
    });

    it('should handle device capabilities correctly', async () => {
      const { result } = renderHook(() => useCrossDeviceStateStore());
      const deviceInfo = createMockDevice({
        syncCapabilities: {
          canHostCrisisState: false,
          canReceiveEmergencyHandoff: true,
          supportsRealtimeSync: false,
          maxConcurrentSessions: 2,
          encryptionVersion: '1.0',
          conflictResolutionSupport: true,
        },
      });

      await act(async () => {
        await result.current.registerDevice(deviceInfo);
      });

      const capabilities = result.current.getDeviceCapabilities(deviceInfo.deviceId);
      expect(capabilities?.canHostCrisisState).toBe(false);
      expect(capabilities?.canReceiveEmergencyHandoff).toBe(true);
      expect(capabilities?.maxConcurrentSessions).toBe(2);
    });
  });

  describe('Crisis State Management', () => {
    it('should activate crisis mode within 200ms requirement', async () => {
      const { result } = renderHook(() => useCrossDeviceStateStore());
      const deviceInfo = createMockDevice();

      await act(async () => {
        await result.current.registerDevice(deviceInfo);
      });

      const startTime = performance.now();

      await act(async () => {
        const success = await result.current.activateCrisisMode('emergency', {
          reason: 'test_emergency',
        });
        expect(success).toBe(true);
      });

      const responseTime = performance.now() - startTime;
      expect(responseTime).toBeLessThan(200); // Critical requirement

      expect(result.current.crisisCoordination.crisisActive).toBe(true);
      expect(result.current.crisisCoordination.crisisLevel).toBe('emergency');
      expect(result.current.performanceMetrics.crisisResponseTime).toBeLessThan(200);
    });

    it('should ensure crisis accessibility with local fallback', async () => {
      const { result } = renderHook(() => useCrossDeviceStateStore());

      await act(async () => {
        const accessible = await result.current.ensureCrisisAccessibility();
        expect(accessible).toBe(true);
      });

      expect(result.current.crisisCoordination.crisisStateDistribution.hotlineAccessReady).toBe(true);
    });

    it('should distribute crisis state to capable devices', async () => {
      const { result } = renderHook(() => useCrossDeviceStateStore());

      // Register multiple devices with different capabilities
      const crisisCapableDevice = createMockDevice({
        deviceId: 'crisis_device',
        syncCapabilities: { ...createMockDevice().syncCapabilities, canHostCrisisState: true },
      });

      const normalDevice = createMockDevice({
        deviceId: 'normal_device',
        syncCapabilities: { ...createMockDevice().syncCapabilities, canHostCrisisState: false },
      });

      await act(async () => {
        await result.current.registerDevice(crisisCapableDevice);
        await result.current.registerDevice(normalDevice);
      });

      await act(async () => {
        const distributionResult = await result.current.distributeCrisisState({
          crisisLevel: 'severe',
          emergencyData: { reason: 'test' },
        });

        expect(distributionResult.devicesReached).toContain('crisis_device');
        expect(distributionResult.responseTime).toBeLessThan(500); // Severe crisis <500ms
      });
    });

    it('should resolve crisis and update all devices', async () => {
      const { result } = renderHook(() => useCrossDeviceStateStore());
      const deviceInfo = createMockDevice();

      await act(async () => {
        await result.current.registerDevice(deviceInfo);
        await result.current.activateCrisisMode('moderate');
      });

      expect(result.current.crisisCoordination.crisisActive).toBe(true);

      await act(async () => {
        await result.current.resolvecrisis();
      });

      expect(result.current.crisisCoordination.crisisActive).toBe(false);
      expect(result.current.crisisCoordination.crisisLevel).toBe('none');
    });
  });

  describe('Session Coordination and Handoffs', () => {
    it('should create cross-device session successfully', async () => {
      const { result } = renderHook(() => useCrossDeviceStateStore());
      const deviceInfo = createMockDevice();
      const sessionData = createMockSessionData();

      await act(async () => {
        await result.current.registerDevice(deviceInfo);
      });

      await act(async () => {
        const sessionId = await result.current.createCrossDeviceSession(
          sessionData.type,
          sessionData,
          [deviceInfo.deviceId]
        );
        expect(sessionId).toBeDefined();
      });

      expect(result.current.activeSessions.size).toBe(1);
      const session = Array.from(result.current.activeSessions.values())[0];
      expect(session.primaryDevice).toBe(deviceInfo.deviceId);
      expect(session.therapeuticContext.needsContinuity).toBe(true);
    });

    it('should handoff session between devices maintaining therapeutic continuity', async () => {
      const { result } = renderHook(() => useCrossDeviceStateStore());

      const sourceDevice = createMockDevice({ deviceId: 'source_device' });
      const targetDevice = createMockDevice({ deviceId: 'target_device' });
      const sessionData = createMockSessionData({ needsContinuity: true });

      await act(async () => {
        await result.current.registerDevice(sourceDevice);
        await result.current.registerDevice(targetDevice);
      });

      let sessionId: string;
      await act(async () => {
        sessionId = await result.current.createCrossDeviceSession(
          sessionData.type,
          sessionData,
          [sourceDevice.deviceId]
        );
      });

      await act(async () => {
        const handoffSuccess = await result.current.handoffSession(
          sessionId,
          targetDevice.deviceId,
          false // normal handoff
        );
        expect(handoffSuccess).toBe(true);
      });

      const session = result.current.activeSessions.get(sessionId);
      expect(session?.primaryDevice).toBe(targetDevice.deviceId);
      expect(session?.therapeuticContext.clinicalValidation.therapeuticIntegrity).toBe(true);
    });

    it('should handle emergency session handoff', async () => {
      const { result } = renderHook(() => useCrossDeviceStateStore());

      const sourceDevice = createMockDevice({
        deviceId: 'source_device',
        performanceProfile: { ...createMockDevice().performanceProfile, batteryLevel: 0.1 }
      });
      const targetDevice = createMockDevice({ deviceId: 'target_device' });
      const crisisSessionData = createMockSessionData({
        crisisLevel: 'severe',
        canHandoff: false, // Normally can't handoff
      });

      await act(async () => {
        await result.current.registerDevice(sourceDevice);
        await result.current.registerDevice(targetDevice);
      });

      let sessionId: string;
      await act(async () => {
        sessionId = await result.current.createCrossDeviceSession(
          'crisis',
          crisisSessionData,
          [sourceDevice.deviceId]
        );
      });

      await act(async () => {
        const emergencyHandoffSuccess = await result.current.handoffSession(
          sessionId,
          targetDevice.deviceId,
          true // emergency handoff
        );
        expect(emergencyHandoffSuccess).toBe(true);
      });

      const session = result.current.activeSessions.get(sessionId);
      expect(session?.primaryDevice).toBe(targetDevice.deviceId);
      expect(session?.handoffState.emergencyHandoff).toBe(true);
    });

    it('should update session state and maintain integrity', async () => {
      const { result } = renderHook(() => useCrossDeviceStateStore());
      const deviceInfo = createMockDevice();
      const sessionData = createMockSessionData();

      await act(async () => {
        await result.current.registerDevice(deviceInfo);
      });

      let sessionId: string;
      await act(async () => {
        sessionId = await result.current.createCrossDeviceSession(
          sessionData.type,
          sessionData
        );
      });

      await act(async () => {
        await result.current.updateSessionState(
          sessionId,
          {
            progress: 0.8,
            step: 4,
            userResponses: [{ timestamp: new Date().toISOString(), data: { answer: 'yes' } }]
          },
          true // preserve therapeutic continuity
        );
      });

      const session = result.current.activeSessions.get(sessionId);
      expect(session?.currentState.progress).toBe(0.8);
      expect(session?.currentState.step).toBe(4);
      expect(session?.currentState.userResponses).toHaveLength(1);
      expect(session?.integrity.auditTrail).toHaveLength(2); // Creation + update
    });

    it('should pause and resume sessions correctly', async () => {
      const { result } = renderHook(() => useCrossDeviceStateStore());
      const deviceInfo = createMockDevice();
      const sessionData = createMockSessionData({ canPause: true });

      await act(async () => {
        await result.current.registerDevice(deviceInfo);
      });

      let sessionId: string;
      await act(async () => {
        sessionId = await result.current.createCrossDeviceSession(
          sessionData.type,
          sessionData
        );
      });

      // Pause session
      await act(async () => {
        await result.current.pauseSession(sessionId, deviceInfo.deviceId);
      });

      // Resume session
      await act(async () => {
        await result.current.resumeSession(sessionId, deviceInfo.deviceId);
      });

      const session = result.current.activeSessions.get(sessionId);
      expect(session).toBeDefined();
      expect(session?.integrity.auditTrail.length).toBeGreaterThan(1);
    });

    it('should end session and clean up resources', async () => {
      const { result } = renderHook(() => useCrossDeviceStateStore());
      const deviceInfo = createMockDevice();
      const sessionData = createMockSessionData();

      await act(async () => {
        await result.current.registerDevice(deviceInfo);
      });

      let sessionId: string;
      await act(async () => {
        sessionId = await result.current.createCrossDeviceSession(
          sessionData.type,
          sessionData
        );
      });

      const initialMemoryUsage = result.current.performanceMetrics.memoryUsage;

      await act(async () => {
        await result.current.endSession(sessionId, {
          completed: true,
          finalScore: 85,
        });
      });

      expect(result.current.activeSessions.has(sessionId)).toBe(false);
      // Memory should be freed (or at least not increased significantly)
      expect(result.current.performanceMetrics.memoryUsage).toBeLessThanOrEqual(initialMemoryUsage);
    });
  });

  describe('Conflict Resolution', () => {
    it('should detect conflicts between local and remote data', async () => {
      const { result } = renderHook(() => useCrossDeviceStateStore());

      const localData = {
        id: 'test123',
        type: 'phq9',
        score: 15,
        answers: { q1: 2, q2: 1 },
        timestamp: '2023-01-01T10:00:00Z',
        version: 1,
      };

      const remoteData = [
        {
          data: {
            id: 'test123',
            type: 'phq9',
            score: 18, // Different score
            answers: { q1: 3, q2: 1 },
            timestamp: '2023-01-01T10:05:00Z',
          },
          version: 2,
          timestamp: '2023-01-01T10:05:00Z',
          deviceId: 'remote_device',
          checksum: 'abc123',
        },
      ];

      await act(async () => {
        const conflicts = result.current.detectConflicts(
          SyncEntityType.ASSESSMENT,
          localData,
          remoteData
        );

        expect(conflicts).toHaveLength(1);
        expect(conflicts[0].conflictType).toBe('data_divergence');
        expect(conflicts[0].clinicalImpact).toBe('high'); // Assessment score conflict
        expect(conflicts[0].resolutionStrategy).toBe('clinical_priority');
      });
    });

    it('should resolve conflicts with clinical priority for assessment data', async () => {
      const { result } = renderHook(() => useCrossDeviceStateStore());

      // Create a mock conflict
      const conflictId = 'conflict_123';
      const mockConflict = {
        conflictId,
        entityType: SyncEntityType.ASSESSMENT,
        entityId: 'assessment_123',
        conflictType: 'data_divergence' as const,
        localState: {
          data: { id: 'assessment_123', type: 'phq9', score: 15 },
          version: 1,
          timestamp: '2023-01-01T10:00:00Z',
          deviceId: 'local_device',
          checksum: 'local123',
        },
        remoteStates: [{
          data: { id: 'assessment_123', type: 'phq9', score: 18 },
          version: 2,
          timestamp: '2023-01-01T10:05:00Z',
          deviceId: 'remote_device',
          checksum: 'remote123',
        }],
        resolutionStrategy: 'clinical_priority' as const,
        clinicalImpact: 'high' as const,
        therapeuticContinuityRisk: false,
        crisisDataInvolved: false,
        detectedAt: new Date().toISOString(),
        mustResolveBy: new Date(Date.now() + 300000).toISOString(),
        autoResolutionAttempted: false,
        resolutionHistory: [],
      };

      // Add conflict to queue
      result.current._internal.conflictQueue.set(conflictId, mockConflict);

      await act(async () => {
        const resolutionResult = await result.current.resolveConflict(
          conflictId,
          'clinical_priority'
        );

        expect(resolutionResult.resolved).toBe(true);
        expect(resolutionResult.dataIntegrity).toBe(true);
        expect(resolutionResult.therapeuticImpact).toBe('minimal');
      });

      expect(result.current._internal.conflictQueue.has(conflictId)).toBe(false);
    });

    it('should merge states using CRDT for check-in data', async () => {
      const { result } = renderHook(() => useCrossDeviceStateStore());

      const states = [
        {
          id: 'checkin_123',
          type: 'morning',
          data: { mood: 7, energy: 6 },
          timestamp: '2023-01-01T08:00:00Z',
        },
        {
          id: 'checkin_123',
          type: 'morning',
          data: { mood: 7, anxiety: 3 }, // Additional field
          timestamp: '2023-01-01T08:05:00Z',
        },
      ];

      await act(async () => {
        const mergedState = await result.current.mergeStatesWithCRDT(
          SyncEntityType.CHECK_IN,
          states
        );

        expect(mergedState.data.mood).toBe(7); // Common field preserved
        expect(mergedState.data.energy).toBe(6); // Field from first state
        expect(mergedState.data.anxiety).toBe(3); // Field from second state
      });
    });
  });

  describe('Performance Optimization', () => {
    it('should optimize state distribution based on device performance', async () => {
      const { result } = renderHook(() => useCrossDeviceStateStore());

      // Register devices with different performance profiles
      const fastDevice = createMockDevice({
        deviceId: 'fast_device',
        performanceProfile: {
          averageStateTransferTime: 50,
          maxStateSize: 10 * 1024 * 1024,
          memoryAvailable: 500 * 1024 * 1024,
          networkQuality: 'excellent' as const,
          crisisResponseReady: true,
          batteryLevel: 0.9,
        },
      });

      const slowDevice = createMockDevice({
        deviceId: 'slow_device',
        performanceProfile: {
          averageStateTransferTime: 500,
          maxStateSize: 1 * 1024 * 1024,
          memoryAvailable: 100 * 1024 * 1024,
          networkQuality: 'poor' as const,
          crisisResponseReady: false,
          batteryLevel: 0.2,
        },
      });

      await act(async () => {
        await result.current.registerDevice(fastDevice);
        await result.current.registerDevice(slowDevice);
      });

      await act(async () => {
        await result.current.optimizeStateDistribution();
      });

      // Fast device should be prioritized for crisis state hosting
      const fastDeviceState = result.current.deviceRegistry.get('fast_device');
      const slowDeviceState = result.current.deviceRegistry.get('slow_device');

      expect(fastDeviceState?.syncCapabilities.canHostCrisisState).toBe(true);
      expect(fastDeviceState?.performanceProfile.crisisResponseReady).toBe(true);
    });

    it('should clean up stale states and free memory', async () => {
      const { result } = renderHook(() => useCrossDeviceStateStore());

      // Create some sessions and devices
      const deviceInfo = createMockDevice();
      await act(async () => {
        await result.current.registerDevice(deviceInfo);
      });

      // Create multiple sessions
      const sessionIds: string[] = [];
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          const sessionId = await result.current.createCrossDeviceSession(
            'assessment',
            createMockSessionData({ sessionId: `session_${i}` })
          );
          sessionIds.push(sessionId);
        });
      }

      expect(result.current.activeSessions.size).toBe(5);

      // End some sessions to create completed states
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          await result.current.endSession(sessionIds[i], { completed: true });
        });
      }

      const initialMemoryUsage = result.current.performanceMetrics.memoryUsage;

      await act(async () => {
        const cleanupResult = await result.current.cleanupStaleStates();
        expect(cleanupResult.cleaned).toBeGreaterThan(0);
        expect(cleanupResult.memoryFreed).toBeGreaterThan(0);
      });

      // Memory usage should be reduced
      expect(result.current.performanceMetrics.memoryUsage).toBeLessThan(initialMemoryUsage);
    });

    it('should validate state integrity across devices', async () => {
      const { result } = renderHook(() => useCrossDeviceStateStore());
      const deviceInfo = createMockDevice();

      await act(async () => {
        await result.current.registerDevice(deviceInfo);
      });

      await act(async () => {
        const validation = await result.current.validateStateIntegrity();
        expect(validation.valid).toBe(true);
        expect(validation.issues).toHaveLength(0);
      });

      // Test validation with specific device
      await act(async () => {
        const deviceValidation = await result.current.validateStateIntegrity(deviceInfo.deviceId);
        expect(deviceValidation.valid).toBe(true);
        expect(deviceValidation.issues).toHaveLength(0);
      });
    });
  });

  describe('Store Integration', () => {
    it('should initialize integration with all stores', async () => {
      const { result } = renderHook(() => useStateSyncIntegration());

      await act(async () => {
        await result.current.initializeIntegration();
      });

      const status = result.current.getIntegrationStatus();
      expect(status.integrationStatus).toBeDefined();
      expect(status.integrationMetrics).toBeDefined();
    });

    it('should integrate with user store and sync preferences', async () => {
      const { result } = renderHook(() => useStateSyncIntegration());

      await act(async () => {
        await result.current.integrateStore('user', mockUserStore);
      });

      const userStatus = result.current.getIntegrationStatus('user');
      expect(userStatus.connected).toBe(true);
      expect(userStatus.lastSync).toBeDefined();
    });

    it('should sync store data with appropriate priority', async () => {
      const { result } = renderHook(() => useStateSyncIntegration());

      await act(async () => {
        await result.current.integrateStore('assessment', mockAssessmentStore);
      });

      await act(async () => {
        const syncSuccess = await result.current.syncStoreData(
          'assessment',
          'test_assessment',
          { type: 'phq9', score: 12, completed: true },
          'crisis'
        );
        expect(syncSuccess).toBe(true);
      });

      const metrics = result.current.integrationMetrics;
      expect(metrics.totalSyncs).toBeGreaterThan(0);
    });

    it('should propagate crisis state from assessment store', async () => {
      const { result } = renderHook(() => useStateSyncIntegration());

      await act(async () => {
        await result.current.integrateStore('assessment', mockAssessmentStore);
      });

      const crisisData = {
        crisisLevel: 'severe',
        assessmentTriggered: true,
        assessmentScore: 22, // High PHQ-9 score
      };

      const startTime = performance.now();

      await act(async () => {
        await result.current.propagateCrisisState(crisisData, 'assessment');
      });

      const responseTime = performance.now() - startTime;
      expect(responseTime).toBeLessThan(200); // Crisis response time requirement

      const metrics = result.current.integrationMetrics;
      expect(metrics.crisisResponseTime).toBeLessThan(200);
    });

    it('should maintain therapeutic continuity during integration', async () => {
      const { result } = renderHook(() => useStateSyncIntegration());

      await act(async () => {
        await result.current.integrateStore('checkin', mockCheckInStore);
      });

      const sessionData = {
        sessionId: 'therapy_session_123',
        type: 'morning_checkin',
        progress: 0.6,
        needsContinuity: true,
        userResponses: [{ question: 'mood', answer: 7 }],
      };

      await act(async () => {
        await result.current.maintainTherapeuticContinuity(sessionData, 'checkin');
      });

      const metrics = result.current.integrationMetrics;
      expect(metrics.therapeuticContinuityRate).toBeGreaterThan(0.9); // High continuity rate
    });
  });

  describe('Crisis Integration Hook', () => {
    it('should provide crisis-specific functionality', async () => {
      const { result } = renderHook(() => useCrisisIntegration());

      // Initially no crisis
      expect(result.current.crisisActive).toBe(false);
      expect(result.current.isHotlineReady()).toBe(true); // 988 always ready

      await act(async () => {
        await result.current.activateCrisisMode('emergency', {
          manualTrigger: true,
        });
      });

      expect(result.current.crisisActive).toBe(true);
      expect(result.current.crisisLevel).toBe('emergency');
      expect(result.current.crisisResponseTime).toBeLessThan(200);
    });

    it('should ensure crisis accessibility and readiness', async () => {
      const { result } = renderHook(() => useCrisisIntegration());

      await act(async () => {
        const accessible = await result.current.ensureCrisisAccessibility();
        expect(accessible).toBe(true);
      });

      expect(result.current.isHotlineReady()).toBe(true);
      expect(result.current.isCrisisReady()).toBe(true);
    });
  });

  describe('Integrated Sync Hook', () => {
    it('should provide unified cross-device functionality', async () => {
      const { result } = renderHook(() => useIntegratedSync());

      // Initialize integration
      await act(async () => {
        await result.current.initializeIntegration();
      });

      // Register a device
      const deviceInfo = createMockDevice();
      await act(async () => {
        const deviceId = await result.current.registerDevice(deviceInfo);
        expect(deviceId).toBe(deviceInfo.deviceId);
      });

      // Create a session
      const sessionData = createMockSessionData();
      await act(async () => {
        const sessionId = await result.current.createCrossDeviceSession(
          sessionData.type,
          sessionData
        );
        expect(sessionId).toBeDefined();
      });

      // Validate sync performance
      await act(async () => {
        await result.current.optimizeSyncPerformance();
      });

      const status = result.current.getIntegrationStatus();
      expect(status.integrationMetrics).toBeDefined();
      expect(status.integrationMetrics.memoryEfficiency).toBeGreaterThan(0.5);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle device offline scenarios gracefully', async () => {
      const { result } = renderHook(() => useCrossDeviceStateStore());
      const deviceInfo = createMockDevice({ isOnline: false });

      await act(async () => {
        await result.current.registerDevice(deviceInfo);
      });

      await act(async () => {
        const syncSuccess = await result.current.syncStateToDevice(
          deviceInfo.deviceId,
          SyncEntityType.CHECK_IN,
          { mood: 5 },
          'normal'
        );
        expect(syncSuccess).toBe(false); // Should fail for offline device
      });
    });

    it('should handle memory pressure scenarios', async () => {
      const { result } = renderHook(() => useCrossDeviceStateStore());

      // Simulate memory pressure by creating many sessions
      const deviceInfo = createMockDevice();
      await act(async () => {
        await result.current.registerDevice(deviceInfo);
      });

      for (let i = 0; i < 50; i++) {
        await act(async () => {
          await result.current.createCrossDeviceSession(
            'assessment',
            createMockSessionData({ sessionId: `memory_test_${i}` })
          );
        });
      }

      // Cleanup should free memory
      await act(async () => {
        const cleanupResult = await result.current.cleanupStaleStates();
        expect(cleanupResult.memoryFreed).toBeGreaterThan(0);
      });
    });

    it('should handle invalid session handoff scenarios', async () => {
      const { result } = renderHook(() => useCrossDeviceStateStore());

      const sourceDevice = createMockDevice({ deviceId: 'source' });
      const targetDevice = createMockDevice({
        deviceId: 'target',
        syncCapabilities: {
          ...createMockDevice().syncCapabilities,
          canReceiveEmergencyHandoff: false, // Cannot receive handoffs
        },
      });

      await act(async () => {
        await result.current.registerDevice(sourceDevice);
        await result.current.registerDevice(targetDevice);
      });

      let sessionId: string;
      await act(async () => {
        sessionId = await result.current.createCrossDeviceSession(
          'assessment',
          createMockSessionData({ canHandoff: false }) // Cannot be handed off
        );
      });

      // Should fail due to device and session constraints
      await act(async () => {
        const handoffSuccess = await result.current.handoffSession(
          sessionId,
          targetDevice.deviceId,
          false // normal handoff (not emergency)
        );
        expect(handoffSuccess).toBe(false);
      });
    });

    it('should validate assessment scores and prevent invalid data', async () => {
      const { result } = renderHook(() => useStateSyncIntegration());

      await act(async () => {
        await result.current.integrateStore('assessment', mockAssessmentStore);
      });

      // Try to sync invalid PHQ-9 score
      await act(async () => {
        const syncSuccess = await result.current.syncStoreData(
          'assessment',
          'invalid_assessment',
          { type: 'phq9', score: 50, completed: true }, // Invalid score > 27
          'crisis'
        );
        expect(syncSuccess).toBe(false); // Should fail validation
      });

      const assessmentStatus = result.current.getIntegrationStatus('assessment');
      expect(assessmentStatus.syncErrors.length).toBeGreaterThan(0);
    });
  });
});

// Performance benchmark tests
describe('Performance Benchmarks', () => {
  it('should maintain crisis response time under 200ms', async () => {
    const iterations = 10;
    const responseTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const { result } = renderHook(() => useCrossDeviceStateStore());
      const deviceInfo = createMockDevice();

      await act(async () => {
        await result.current.registerDevice(deviceInfo);
      });

      const startTime = performance.now();

      await act(async () => {
        await result.current.activateCrisisMode('emergency');
      });

      const responseTime = performance.now() - startTime;
      responseTimes.push(responseTime);
    }

    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);

    expect(averageResponseTime).toBeLessThan(200);
    expect(maxResponseTime).toBeLessThan(200);

    console.log(`Crisis response times: avg=${averageResponseTime.toFixed(2)}ms, max=${maxResponseTime.toFixed(2)}ms`);
  });

  it('should maintain session handoff under 1 second', async () => {
    const { result } = renderHook(() => useCrossDeviceStateStore());

    const sourceDevice = createMockDevice({ deviceId: 'source' });
    const targetDevice = createMockDevice({ deviceId: 'target' });

    await act(async () => {
      await result.current.registerDevice(sourceDevice);
      await result.current.registerDevice(targetDevice);
    });

    let sessionId: string;
    await act(async () => {
      sessionId = await result.current.createCrossDeviceSession(
        'assessment',
        createMockSessionData()
      );
    });

    const startTime = performance.now();

    await act(async () => {
      await result.current.handoffSession(sessionId, targetDevice.deviceId);
    });

    const handoffTime = performance.now() - startTime;
    expect(handoffTime).toBeLessThan(1000); // Should be under 1 second

    console.log(`Session handoff time: ${handoffTime.toFixed(2)}ms`);
  });
});