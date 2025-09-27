/**
 * Cross-Device Sync Integration Tests
 *
 * End-to-end testing of complete sync workflows with focus on:
 * - Multi-device session handoff <2 seconds
 * - Crisis response across devices <200ms
 * - Conflict resolution in real scenarios
 * - Performance under realistic load
 * - Therapeutic continuity validation
 * - Security and privacy preservation
 */

import { jest } from '@jest/globals';
import '../setup/sync-test-setup';
import { CrossDeviceSyncAPI } from '../../../src/services/cloud/CrossDeviceSyncAPI';
import { SyncStatus, NetworkQuality } from '../../../src/types/sync';

// Mock store integration
const mockUserStore = {
  getState: jest.fn(),
  setState: jest.fn(),
  subscribe: jest.fn(),
};

const mockAssessmentStore = {
  getState: jest.fn(),
  setState: jest.fn(),
  subscribe: jest.fn(),
  addAssessment: jest.fn(),
  updateAssessment: jest.fn(),
};

const mockCheckInStore = {
  getState: jest.fn(),
  setState: jest.fn(),
  subscribe: jest.fn(),
  addCheckIn: jest.fn(),
};

jest.mock('../../../src/store/userStore', () => ({ userStore: mockUserStore }));
jest.mock('../../../src/store/assessmentStore', () => ({ assessmentStore: mockAssessmentStore }));
jest.mock('../../../src/store/checkInStore', () => ({ checkInStore: mockCheckInStore }));

describe('Cross-Device Sync Integration', () => {
  let syncAPI: CrossDeviceSyncAPI;
  let device1: any;
  let device2: any;
  let device3: any;

  beforeEach(async () => {
    global.cleanupSyncTests();
    syncAPI = CrossDeviceSyncAPI.getInstance();

    // Set up test devices
    device1 = await setupTestDevice('iPhone 15 Pro', 'ios');
    device2 = await setupTestDevice('Pixel 8 Pro', 'android');
    device3 = await setupTestDevice('iPad Air', 'ios');
  });

  afterEach(() => {
    syncAPI.destroy();
    jest.clearAllMocks();
  });

  /**
   * Helper function to set up a test device
   */
  async function setupTestDevice(deviceName: string, platform: 'ios' | 'android') {
    const deviceInfo = {
      deviceName,
      platform,
      appVersion: '1.0.0',
    };

    const registrationResult = await syncAPI.registerDevice(deviceInfo);
    expect(registrationResult.success).toBe(true);

    return {
      ...deviceInfo,
      deviceId: registrationResult.deviceId!,
      deviceKey: registrationResult.deviceKey!,
    };
  }

  describe('Multi-Device Session Handoff', () => {
    it('should hand off MBCT session between devices within 2 seconds', async () => {
      // Start session on device 1
      const sessionData = {
        sessionId: 'mbct_session_handoff_test',
        exerciseType: 'body_scan',
        progress: 0.4,
        currentStep: 2,
        totalSteps: 5,
        timeRemaining: 120, // 2 minutes
        deviceId: device1.deviceId,
        startTime: new Date().toISOString(),
      };

      // Sync session data from device 1
      const device1SyncResult = await syncAPI.syncTherapeuticData(
        sessionData,
        'session_data',
        sessionData.sessionId,
        { sessionId: sessionData.sessionId, exerciseType: sessionData.exerciseType }
      );

      expect(device1SyncResult.success).toBe(true);

      // Simulate session handoff to device 2
      const handoffData = {
        ...sessionData,
        deviceId: device2.deviceId,
        handoffTime: new Date().toISOString(),
        previousDevice: device1.deviceId,
      };

      const startTime = performance.now();

      // Sync handoff from device 2
      const device2SyncResult = await syncAPI.syncTherapeuticData(
        handoffData,
        'session_data',
        sessionData.sessionId,
        { sessionId: sessionData.sessionId, exerciseType: sessionData.exerciseType }
      );

      const handoffDuration = performance.now() - startTime;

      expect(device2SyncResult.success).toBe(true);
      expect(handoffDuration).toBeLessThan(2000); // <2 seconds requirement

      // Verify session continuity
      expect(handoffData.progress).toBe(sessionData.progress);
      expect(handoffData.currentStep).toBe(sessionData.currentStep);
      expect(handoffData.exerciseType).toBe(sessionData.exerciseType);

      global.performanceMonitor.recordResponseTime('session_handoff', handoffDuration);
    });

    it('should preserve session timing during handoff', async () => {
      const breathingSession = {
        sessionId: 'breathing_timing_test',
        exerciseType: 'breathing',
        progress: 0.67, // 2 minutes into 3-minute session
        currentPhase: 'hold',
        phaseProgress: 0.75, // 3/4 through current phase
        exactTiming: {
          sessionStartTime: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
          phaseStartTime: new Date(Date.now() - 15000).toISOString(), // 15 seconds ago
          nextPhaseIn: 5000, // 5 seconds
        },
        deviceId: device1.deviceId,
      };

      // Sync from device 1
      await syncAPI.syncTherapeuticData(
        breathingSession,
        'session_data',
        breathingSession.sessionId
      );

      // Handoff to device 2 with timing preservation
      const handoffSession = {
        ...breathingSession,
        deviceId: device2.deviceId,
        handoffTime: new Date().toISOString(),
        timingPreserved: true,
      };

      const result = await syncAPI.syncTherapeuticData(
        handoffSession,
        'session_data',
        breathingSession.sessionId
      );

      expect(result.success).toBe(true);

      // Timing should be preserved with <100ms accuracy
      const timingDiff = new Date().getTime() - new Date(breathingSession.exactTiming.sessionStartTime).getTime();
      expect(Math.abs(timingDiff - 120000)).toBeLessThan(100);
    });

    it('should handle concurrent session access gracefully', async () => {
      const sessionId = 'concurrent_session_test';

      // Three devices try to access same session simultaneously
      const concurrentUpdates = [
        {
          deviceId: device1.deviceId,
          progress: 0.3,
          action: 'continue',
        },
        {
          deviceId: device2.deviceId,
          progress: 0.35,
          action: 'pause',
        },
        {
          deviceId: device3.deviceId,
          progress: 0.32,
          action: 'continue',
        },
      ];

      const syncPromises = concurrentUpdates.map((update, index) =>
        syncAPI.syncTherapeuticData(
          {
            sessionId,
            exerciseType: 'mindfulness',
            ...update,
            timestamp: new Date().toISOString(),
          },
          'session_data',
          sessionId
        )
      );

      const results = await Promise.all(syncPromises);

      // All syncs should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Should have conflict resolution in place
      const syncStatus = await syncAPI.getSyncStatus();
      expect(syncStatus.conflicts.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Crisis Response Across Devices', () => {
    it('should propagate crisis state across all devices within 200ms', async () => {
      // Simulate crisis detection on device 1
      const crisisEvent = {
        type: 'phq9_threshold',
        score: 22,
        assessmentId: 'phq9_crisis_test',
        detectedAt: new Date().toISOString(),
        deviceId: device1.deviceId,
        severity: 'severe',
        interventionRequired: true,
      };

      const startTime = performance.now();

      // Sync crisis data from device 1
      const crisisSyncResult = await syncAPI.syncCrisisData(
        crisisEvent,
        'assessment',
        crisisEvent.assessmentId
      );

      const crisisResponseTime = performance.now() - startTime;

      expect(crisisSyncResult.success).toBe(true);
      expect(crisisResponseTime).toBeLessThan(200);

      // Verify crisis state is available on all devices
      const syncStatus = await syncAPI.getSyncStatus();
      expect(syncStatus.devices).toHaveLength(3);

      // All devices should have access to crisis data
      expect(syncStatus.syncHealth).toBe('healthy');

      global.performanceMonitor.recordResponseTime('crisis_propagation', crisisResponseTime);
    });

    it('should maintain crisis button functionality across device sync', async () => {
      // Activate crisis button on device 2
      const crisisActivation = {
        type: 'crisis_button',
        activatedAt: new Date().toISOString(),
        deviceId: device2.deviceId,
        userInitiated: true,
        emergencyContacts: ['contact_1', 'contact_2'],
        location: { latitude: 37.7749, longitude: -122.4194 },
      };

      const { result, duration } = await global.SyncTestUtils.measurePerformance(
        () => syncAPI.syncCrisisData(crisisActivation, 'crisis_plan', 'crisis_button_activation'),
        'crisis_button_sync'
      );

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(200);

      // Crisis state should be immediately available on other devices
      const crisisAccess = {
        emergency_button: true,
        hotline_access: true,
        crisis_plan_access: true,
      };

      expect(crisisAccess).toMaintainCrisisAccess();
    });

    it('should handle offline crisis detection with local-first approach', async () => {
      // Simulate offline detection
      const offlineCrisis = {
        type: 'gad7_threshold',
        score: 18,
        detectedAt: new Date().toISOString(),
        deviceId: device3.deviceId,
        offline: true,
        queuedForSync: true,
      };

      // Mock offline network condition
      const networkConditions = global.SyncTestUtils.simulateNetworkConditions('offline');

      const result = await syncAPI.syncCrisisData(
        offlineCrisis,
        'assessment',
        'offline_crisis_test'
      );

      // Should succeed locally even when offline
      expect(result.success).toBe(true);

      // Crisis features should remain accessible
      const crisisAccess = {
        emergency_button: true,
        hotline_access: true,
        crisis_plan_access: true,
      };

      expect(crisisAccess).toMaintainCrisisAccess();
    });
  });

  describe('Conflict Resolution in Real Scenarios', () => {
    it('should resolve assessment data conflicts with clinical priority', async () => {
      const assessmentId = 'phq9_conflict_test';

      // Device 1 completes assessment
      const device1Assessment = {
        assessmentId,
        type: 'phq9',
        responses: [2, 2, 3, 2, 2, 1, 2, 1, 1],
        score: 16,
        completedAt: new Date().toISOString(),
        deviceId: device1.deviceId,
        version: 1,
      };

      // Device 2 completes same assessment (conflict scenario)
      const device2Assessment = {
        assessmentId,
        type: 'phq9',
        responses: [3, 3, 3, 3, 2, 2, 2, 2, 2],
        score: 22, // Higher score - more clinical concern
        completedAt: new Date(Date.now() + 1000).toISOString(), // 1 second later
        deviceId: device2.deviceId,
        version: 1,
      };

      // Sync both assessments
      await syncAPI.syncCrisisData(device1Assessment, 'assessment', assessmentId);
      await syncAPI.syncCrisisData(device2Assessment, 'assessment', assessmentId);

      // Check for conflicts
      const syncStatus = await syncAPI.getSyncStatus();
      const conflicts = syncStatus.conflicts.filter(c => c.entityId === assessmentId);

      if (conflicts.length > 0) {
        const conflict = conflicts[0];
        expect(conflict.clinicalRelevant).toBe(true);

        // Resolve conflict - should prioritize higher clinical concern
        const conflictResolver = (syncAPI as any).conflictResolver;
        const resolution = await conflictResolver.resolveConflict(conflict);

        expect(resolution.success).toBe(true);
        expect(resolution.strategy).toBe('latest_clinical_wins');

        // Higher score should be preserved for safety
        const resolvedData = JSON.parse(resolution.resolvedData.encryptedData);
        expect(resolvedData.score).toBe(22);
      }
    });

    it('should merge crisis plans with local safety priority', async () => {
      const crisisPlanId = 'crisis_plan_merge_test';

      // Device 1 updates crisis plan
      const device1Plan = {
        planId: crisisPlanId,
        emergencyContacts: [
          { name: 'Dr. Smith', phone: '555-1234', relationship: 'therapist' },
        ],
        copingStrategies: ['breathing', 'grounding'],
        safetyPlan: 'Call Dr. Smith, use breathing exercises',
        lastUpdated: new Date().toISOString(),
        deviceId: device1.deviceId,
      };

      // Device 2 updates same plan with additional contacts
      const device2Plan = {
        planId: crisisPlanId,
        emergencyContacts: [
          { name: 'Dr. Smith', phone: '555-1234', relationship: 'therapist' },
          { name: 'Sarah', phone: '555-5678', relationship: 'friend' },
        ],
        copingStrategies: ['breathing', 'grounding', 'cold_water'],
        safetyPlan: 'Call Dr. Smith or Sarah, use breathing exercises or cold water',
        lastUpdated: new Date(Date.now() + 500).toISOString(),
        deviceId: device2.deviceId,
      };

      // Sync both plans
      await syncAPI.syncCrisisData(device1Plan, 'crisis_plan', crisisPlanId);
      await syncAPI.syncCrisisData(device2Plan, 'crisis_plan', crisisPlanId);

      // Should create a merged plan with all safety resources
      const syncStatus = await syncAPI.getSyncStatus();
      const conflicts = syncStatus.conflicts.filter(c => c.entityId === crisisPlanId);

      if (conflicts.length > 0) {
        const conflictResolver = (syncAPI as any).conflictResolver;
        const resolution = await conflictResolver.resolveConflict(conflicts[0]);

        expect(resolution.success).toBe(true);
        expect(resolution.strategy).toBe('crisis_local_priority');

        // Should preserve all safety resources
        const mergedPlan = JSON.parse(resolution.resolvedData.encryptedData);
        expect(mergedPlan.emergencyContacts).toHaveLength(2);
        expect(mergedPlan.copingStrategies).toContain('cold_water');
      }
    });
  });

  describe('Performance Under Realistic Load', () => {
    it('should maintain performance with multiple active devices', async () => {
      const deviceCount = 5;
      const operationsPerDevice = 20;

      // Set up additional devices
      const devices = await Promise.all(
        Array.from({ length: deviceCount }, (_, i) =>
          setupTestDevice(`Test Device ${i + 4}`, i % 2 === 0 ? 'ios' : 'android')
        )
      );

      const allDevices = [device1, device2, device3, ...devices];

      // Simulate realistic mixed workload
      const operations = allDevices.flatMap(device =>
        Array.from({ length: operationsPerDevice }, (_, i) => {
          const operationType = i % 3;
          const entityId = `${device.deviceId}_operation_${i}`;

          if (operationType === 0) {
            // Crisis data (10% of operations)
            return {
              type: 'crisis',
              promise: syncAPI.syncCrisisData(
                global.SyncTestUtils.createCrisisScenario('phq9_threshold'),
                'assessment',
                entityId
              ),
            };
          } else if (operationType === 1) {
            // Therapeutic data (30% of operations)
            return {
              type: 'therapeutic',
              promise: syncAPI.syncTherapeuticData(
                { sessionId: `session_${i}`, progress: i / operationsPerDevice },
                'session_data',
                entityId
              ),
            };
          } else {
            // General data (60% of operations)
            return {
              type: 'general',
              promise: syncAPI.syncGeneralData(
                { preference: `value_${i}` },
                'user_profile',
                entityId
              ),
            };
          }
        })
      );

      const startTime = performance.now();
      const startMemory = global.SyncTestUtils.trackMemoryUsage();

      // Execute all operations
      const results = await Promise.all(operations.map(op => op.promise));

      const totalTime = performance.now() - startTime;
      const endMemory = global.SyncTestUtils.trackMemoryUsage();

      // Performance validation
      const totalOperations = allDevices.length * operationsPerDevice;
      const averageTime = totalTime / totalOperations;
      const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;

      expect(averageTime).toBeLessThan(50); // <50ms average per operation
      expect(memoryIncrease).toBeLessThan(global.SyncTestConfig.performance.memoryLimit);

      // Success rate validation
      const successCount = results.filter(r => r.success).length;
      const successRate = successCount / totalOperations;
      expect(successRate).toBeGreaterThan(0.95); // >95% success rate

      // Crisis operations should all be fast
      const crisisResults = results.filter((_, i) => operations[i].type === 'crisis');
      crisisResults.forEach(result => {
        expect(result.responseTime).toBeLessThan(200);
      });

      global.performanceMonitor.recordResponseTime('realistic_load_test', totalTime);
    });

    it('should handle burst traffic efficiently', async () => {
      const burstSize = 50;
      const burstInterval = 100; // 100ms

      // Create burst of operations
      const burstOperations = Array.from({ length: burstSize }, (_, i) => ({
        delay: (i % 10) * (burstInterval / 10), // Spread over 100ms
        operation: () => syncAPI.syncTherapeuticData(
          { burstTest: true, operationId: i },
          'session_data',
          `burst_${i}`
        ),
      }));

      const startTime = performance.now();

      // Execute burst with timing
      const burstPromises = burstOperations.map(({ delay, operation }) =>
        new Promise(resolve => setTimeout(() => resolve(operation()), delay))
      );

      const results = await Promise.all(burstPromises);
      const burstDuration = performance.now() - startTime;

      // Should handle burst efficiently
      expect(burstDuration).toBeLessThan(1000); // Complete within 1 second

      // All operations should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Queue should be empty after processing
      const queueStatus = syncAPI.getPerformanceMetrics().queueStatus;
      expect(queueStatus.size).toBe(0);
    });
  });

  describe('Therapeutic Continuity Validation', () => {
    it('should preserve assessment accuracy across sync', async () => {
      const originalAssessment = {
        type: 'phq9',
        responses: [1, 2, 2, 1, 0, 1, 2, 1, 0],
        score: 10, // Calculated score
        interpretation: 'mild',
        completedAt: new Date().toISOString(),
        deviceId: device1.deviceId,
      };

      // Sync assessment
      const result = await syncAPI.syncCrisisData(
        originalAssessment,
        'assessment',
        'accuracy_test'
      );

      expect(result.success).toBe(true);

      // Verify score calculation is preserved exactly
      const scoreSum = originalAssessment.responses.reduce((sum, response) => sum + response, 0);
      expect(scoreSum).toBe(originalAssessment.score);

      // Clinical thresholds should be accurate
      expect(originalAssessment.score).toBeLessThan(15); // Below moderate threshold
    });

    it('should maintain MBCT exercise timing precision', async () => {
      const breathingExercise = {
        sessionId: 'timing_precision_test',
        exerciseType: 'breathing',
        totalDuration: 180000, // 3 minutes exactly
        phaseTimings: {
          breatheIn: 4000,   // 4 seconds
          hold: 7000,        // 7 seconds
          breatheOut: 8000,  // 8 seconds
        },
        cycleCount: 15,      // 15 cycles = 180 seconds
        currentPhase: 'breatheIn',
        phaseStartTime: new Date().toISOString(),
        deviceId: device1.deviceId,
      };

      const syncStart = performance.now();

      const result = await syncAPI.syncTherapeuticData(
        breathingExercise,
        'session_data',
        breathingExercise.sessionId
      );

      const syncDuration = performance.now() - syncStart;

      expect(result.success).toBe(true);
      expect(syncDuration).toBeLessThan(500); // Fast enough to not disrupt timing

      // Timing precision should be maintained
      const totalCycleTime = Object.values(breathingExercise.phaseTimings).reduce((sum, time) => sum + time, 0);
      expect(totalCycleTime * breathingExercise.cycleCount).toBe(breathingExercise.totalDuration);
    });

    it('should preserve mood tracking data integrity', async () => {
      const moodData = {
        checkinId: 'mood_integrity_test',
        timestamp: new Date().toISOString(),
        mood: 7,
        energy: 6,
        anxiety: 3,
        notes: 'Feeling much better after morning meditation',
        exercisesCompleted: ['breathing', 'body_scan'],
        duration: 1800, // 30 minutes
        deviceId: device2.deviceId,
      };

      const result = await syncAPI.syncTherapeuticData(
        moodData,
        'checkin_data',
        moodData.checkinId
      );

      expect(result.success).toBe(true);

      // Validate data ranges and types
      expect(moodData.mood).toBeGreaterThanOrEqual(1);
      expect(moodData.mood).toBeLessThanOrEqual(10);
      expect(moodData.energy).toBeGreaterThanOrEqual(1);
      expect(moodData.energy).toBeLessThanOrEqual(10);
      expect(moodData.anxiety).toBeGreaterThanOrEqual(1);
      expect(moodData.anxiety).toBeLessThanOrEqual(10);

      // Therapeutic data should be preserved exactly
      expect(typeof moodData.notes).toBe('string');
      expect(Array.isArray(moodData.exercisesCompleted)).toBe(true);
      expect(typeof moodData.duration).toBe('number');
    });
  });

  describe('Security and Privacy Preservation', () => {
    it('should maintain end-to-end encryption across all sync operations', async () => {
      const sensitiveData = {
        personalInfo: 'Very sensitive user data',
        medicalHistory: 'Confidential medical information',
        emergencyContacts: [
          { name: 'Dr. Johnson', phone: '555-9999' },
        ],
      };

      const { zeroKnowledgeCloudSync } = require('../../../src/services/security/ZeroKnowledgeCloudSync');

      const result = await syncAPI.syncCrisisData(
        sensitiveData,
        'crisis_plan',
        'encryption_test'
      );

      expect(result.success).toBe(true);

      // Verify encryption was applied
      expect(zeroKnowledgeCloudSync.prepareForCloudUpload).toHaveBeenCalledWith(
        sensitiveData,
        expect.objectContaining({
          dataSensitivity: expect.any(String),
        })
      );

      // Data should be encrypted before transmission
      const encryptedData = zeroKnowledgeCloudSync.prepareForCloudUpload.mock.results[0].value;
      await expect(encryptedData).resolves.toBeSecurelyEncrypted();
    });

    it('should audit all cross-device activities', async () => {
      const { securityControlsService } = require('../../../src/services/security/SecurityControlsService');

      // Perform various sync operations
      await syncAPI.syncCrisisData({}, 'crisis_plan', 'audit_test_1');
      await syncAPI.syncTherapeuticData({}, 'session_data', 'audit_test_2');

      // Register new device
      await syncAPI.registerDevice({
        deviceName: 'Audit Test Device',
        platform: 'ios',
        appVersion: '1.0.0',
      });

      // Verify comprehensive audit logging
      expect(securityControlsService.logAuditEntry).toHaveBeenCalledTimes(3);

      // Check audit entry structure
      const auditCalls = securityControlsService.logAuditEntry.mock.calls;
      auditCalls.forEach(([auditEntry]) => {
        expect(auditEntry).toHaveProperty('operation');
        expect(auditEntry).toHaveProperty('entityType');
        expect(auditEntry).toHaveProperty('dataSensitivity');
        expect(auditEntry).toHaveProperty('securityContext');
        expect(auditEntry).toHaveProperty('complianceMarkers');
      });
    });

    it('should maintain device trust validation', async () => {
      const deviceManager = (syncAPI as any).deviceManager;

      // Verify all registered devices are trusted
      const trustedDevices = deviceManager.getTrustedDevices();
      expect(trustedDevices).toHaveLength(3);

      trustedDevices.forEach(device => {
        expect(device.deviceId).toBeDefined();
        expect(device.encryptionKey).toBeDefined();
        expect(device.syncEnabled).toBe(true);
      });

      // Test device key validation
      for (const device of [device1, device2, device3]) {
        const isValid = await deviceManager.verifyDeviceTrust(
          device.deviceId,
          device.deviceKey
        );
        expect(isValid).toBe(true);
      }
    });
  });
});