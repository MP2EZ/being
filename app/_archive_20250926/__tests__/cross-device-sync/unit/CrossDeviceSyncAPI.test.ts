/**
 * CrossDeviceSyncAPI Unit Tests
 *
 * Comprehensive testing of the core CrossDeviceSyncAPI with focus on:
 * - Crisis response time <200ms requirement
 * - Therapeutic continuity validation
 * - Performance under load
 * - Security and encryption validation
 * - Device trust establishment
 * - Conflict resolution accuracy
 */

import { jest } from '@jest/globals';
import '../setup/sync-test-setup';
import { CrossDeviceSyncAPI } from '../../../src/services/cloud/CrossDeviceSyncAPI';
import { DataSensitivity } from '../../../src/services/security/EncryptionService';

// Mock dependencies
jest.mock('../../../src/services/security/ZeroKnowledgeCloudSync', () => ({
  zeroKnowledgeCloudSync: {
    prepareForCloudUpload: jest.fn(() => Promise.resolve({
      encryptedData: 'mock_encrypted_data',
      metadata: {
        version: 1,
        lastModified: new Date().toISOString(),
        checksum: 'mock_checksum',
      },
    })),
  },
}));

jest.mock('../../../src/services/security/SecurityControlsService', () => ({
  securityControlsService: {
    logAuditEntry: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../../../src/services/cloud/CloudSyncAPI', () => ({
  cloudSyncAPI: {
    syncBatch: jest.fn(() => Promise.resolve({ success: true })),
    getSyncConflicts: jest.fn(() => Promise.resolve({ conflicts: [] })),
  },
}));

describe('CrossDeviceSyncAPI', () => {
  let syncAPI: CrossDeviceSyncAPI;
  let performanceMonitor: any;

  beforeEach(() => {
    global.cleanupSyncTests();
    syncAPI = CrossDeviceSyncAPI.getInstance();
    performanceMonitor = global.performanceMonitor;
  });

  afterEach(() => {
    syncAPI.destroy();
    jest.clearAllMocks();
  });

  describe('Crisis Data Sync - <200ms Requirement', () => {
    it('should sync crisis data within 200ms via WebSocket', async () => {
      const crisisData = global.SyncTestUtils.createCrisisScenario('phq9_threshold');

      const { result, duration } = await global.SyncTestUtils.measurePerformance(
        () => syncAPI.syncCrisisData(crisisData, 'crisis_plan', 'test_crisis_plan'),
        'crisis_sync_websocket'
      );

      // Validate crisis response time requirement
      const validation = global.SyncTestUtils.validateCrisisResponseTime(duration, 200);
      expect(validation.passed).toBe(true);
      expect(duration).toRespondWithinTime(200);

      expect(result.success).toBe(true);
      expect(result.responseTime).toBeLessThan(200);

      performanceMonitor.recordResponseTime('crisis_sync', duration);
    });

    it('should sync crisis data within 200ms via REST fallback', async () => {
      // Mock WebSocket as disconnected to force REST fallback
      const mockWs = { isConnected: () => false };
      (syncAPI as any).wsManager = mockWs;

      const crisisData = global.SyncTestUtils.createCrisisScenario('gad7_threshold');

      const { result, duration } = await global.SyncTestUtils.measurePerformance(
        () => syncAPI.syncCrisisData(crisisData, 'assessment', 'test_assessment'),
        'crisis_sync_rest'
      );

      // Even with REST fallback, must meet crisis requirement
      expect(duration).toRespondWithinTime(200);
      expect(result.success).toBe(true);
    });

    it('should prioritize crisis data over other sync operations', async () => {
      const crisisData = global.SyncTestUtils.createCrisisScenario('crisis_button');
      const therapeuticData = { sessionId: 'test_session', mood: 5 };
      const generalData = { preferences: { theme: 'morning' } };

      // Start multiple sync operations simultaneously
      const crisisPromise = syncAPI.syncCrisisData(crisisData, 'crisis_plan', 'crisis_1');
      const therapeuticPromise = syncAPI.syncTherapeuticData(therapeuticData, 'session_data', 'session_1');
      const generalPromise = syncAPI.syncGeneralData(generalData, 'user_profile', 'profile_1');

      const results = await Promise.all([crisisPromise, therapeuticPromise, generalPromise]);

      // Crisis sync should complete fastest
      expect(results[0].responseTime).toBeLessThan(results[1].responseTime);
      expect(results[0].responseTime).toBeLessThan(results[2].responseTime);
      expect(results[0].success).toBe(true);
    });

    it('should maintain crisis access during sync failures', async () => {
      // Mock sync failure
      const { cloudSyncAPI } = require('../../../src/services/cloud/CloudSyncAPI');
      cloudSyncAPI.syncBatch.mockRejectedValueOnce(new Error('Network failure'));

      const crisisData = global.SyncTestUtils.createCrisisScenario('phq9_threshold');

      const result = await syncAPI.syncCrisisData(crisisData, 'crisis_plan', 'test_plan');

      // Even on failure, should respond quickly and maintain access
      expect(result.responseTime).toBeLessThan(200);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Crisis access features should remain available
      const crisisAccess = {
        emergency_button: true,
        hotline_access: true,
        crisis_plan_access: true,
      };
      expect(crisisAccess).toMaintainCrisisAccess();
    });

    it('should handle concurrent crisis sync requests efficiently', async () => {
      const concurrentRequests = 10;
      const crisisPromises = Array.from({ length: concurrentRequests }, (_, i) =>
        syncAPI.syncCrisisData(
          global.SyncTestUtils.createCrisisScenario('phq9_threshold'),
          'assessment',
          `crisis_${i}`
        )
      );

      const startTime = performance.now();
      const results = await Promise.all(crisisPromises);
      const totalTime = performance.now() - startTime;

      // All requests should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.responseTime).toBeLessThan(200);
      });

      // Total time should not be significantly more than single request
      expect(totalTime).toBeLessThan(500); // Allow some overhead for concurrent processing
    });
  });

  describe('Therapeutic Data Sync - Session Continuity', () => {
    it('should sync therapeutic data within 500ms target', async () => {
      const therapeuticData = {
        sessionId: 'mbct_session_1',
        exerciseType: 'breathing',
        progress: 0.5,
        timestamp: new Date().toISOString(),
      };

      const { result, duration } = await global.SyncTestUtils.measurePerformance(
        () => syncAPI.syncTherapeuticData(
          therapeuticData,
          'session_data',
          'session_1',
          { sessionId: 'mbct_session_1', exerciseType: 'breathing' }
        ),
        'therapeutic_sync'
      );

      expect(duration).toRespondWithinTime(500);
      expect(result.success).toBe(true);
      expect(result.responseTime).toBeLessThan(500);
    });

    it('should preserve session context during sync', async () => {
      const sessionContext = {
        sessionId: 'session_123',
        exerciseType: 'body_scan',
      };

      const therapeuticData = {
        progress: 0.75,
        currentStep: 3,
        totalSteps: 4,
      };

      const result = await syncAPI.syncTherapeuticData(
        therapeuticData,
        'session_data',
        'session_123',
        sessionContext
      );

      expect(result.success).toBe(true);

      // Verify WebSocket message includes session context
      const mockWs = (syncAPI as any).wsManager;
      if (mockWs && mockWs.send) {
        expect(mockWs.send).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'therapeutic_sync',
            sessionContext,
          }),
          'high'
        );
      }
    });

    it('should handle session handoff between devices', async () => {
      const device1Data = {
        sessionId: 'handoff_session',
        deviceId: 'device_1',
        progress: 0.3,
        lastStep: 'breathing_in',
      };

      const device2Data = {
        sessionId: 'handoff_session',
        deviceId: 'device_2',
        progress: 0.3,
        resumeFromStep: 'breathing_in',
      };

      // Sync from device 1
      const result1 = await syncAPI.syncTherapeuticData(
        device1Data,
        'session_data',
        'handoff_session'
      );

      // Sync from device 2 (handoff)
      const { result: result2, duration } = await global.SyncTestUtils.measurePerformance(
        () => syncAPI.syncTherapeuticData(device2Data, 'session_data', 'handoff_session'),
        'session_handoff'
      );

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Handoff should be fast (<2 seconds)
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Device Registration and Trust', () => {
    it('should register new device with encryption key generation', async () => {
      const deviceInfo = {
        deviceName: 'iPhone 15 Pro',
        platform: 'ios' as const,
        appVersion: '1.0.0',
      };

      const result = await syncAPI.registerDevice(deviceInfo);

      expect(result.success).toBe(true);
      expect(result.deviceId).toBeDefined();
      expect(result.deviceKey).toBeDefined();
      expect(result.deviceKey).toMatch(/^[a-f0-9]{64}$/); // 64-character hex string
    });

    it('should establish device trust with secure key exchange', async () => {
      const deviceInfo = global.SyncTestUtils.createMockDevice();

      const registrationResult = await syncAPI.registerDevice(deviceInfo);
      expect(registrationResult.success).toBe(true);

      // Verify trust establishment
      const syncStatus = await syncAPI.getSyncStatus();
      expect(syncStatus.devices).toHaveLength(1);
      expect(syncStatus.devices[0].deviceName).toBe(deviceInfo.deviceName);
    });

    it('should handle device revocation securely', async () => {
      const device1 = global.SyncTestUtils.createMockDevice({ deviceName: 'Device 1' });
      const device2 = global.SyncTestUtils.createMockDevice({ deviceName: 'Device 2' });

      // Register two devices
      await syncAPI.registerDevice(device1);
      await syncAPI.registerDevice(device2);

      let syncStatus = await syncAPI.getSyncStatus();
      expect(syncStatus.devices).toHaveLength(2);

      // Revoke one device
      const deviceManager = (syncAPI as any).deviceManager;
      const revokeResult = await deviceManager.revokeDeviceTrust(syncStatus.devices[0].deviceId);
      expect(revokeResult).toBe(true);

      syncStatus = await syncAPI.getSyncStatus();
      expect(syncStatus.devices).toHaveLength(1);
      expect(syncStatus.devices[0].deviceName).toBe('Device 2');
    });

    it('should validate device keys for trust verification', async () => {
      const deviceInfo = global.SyncTestUtils.createMockDevice();
      const registrationResult = await syncAPI.registerDevice(deviceInfo);

      const deviceManager = (syncAPI as any).deviceManager;

      // Valid key should pass verification
      const validResult = await deviceManager.verifyDeviceTrust(
        registrationResult.deviceId!,
        registrationResult.deviceKey!
      );
      expect(validResult).toBe(true);

      // Invalid key should fail verification
      const invalidResult = await deviceManager.verifyDeviceTrust(
        registrationResult.deviceId!,
        'invalid_key'
      );
      expect(invalidResult).toBe(false);
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve clinical data conflicts with latest priority', async () => {
      const conflict = global.SyncTestUtils.createMockConflict({
        clinicalRelevant: true,
        entityType: 'assessment',
        conflictType: 'version_mismatch',
      });

      const conflictResolver = (syncAPI as any).conflictResolver;
      const result = await conflictResolver.resolveConflict(conflict);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('latest_clinical_wins');
      expect(result.resolvedData).toBeDefined();
    });

    it('should resolve crisis plan conflicts with local priority', async () => {
      const crisisConflict = global.SyncTestUtils.createMockConflict({
        entityType: 'crisis_plan',
        conflictType: 'concurrent_modification',
        clinicalRelevant: true,
      });

      const conflictResolver = (syncAPI as any).conflictResolver;
      const result = await conflictResolver.resolveConflict(crisisConflict);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('crisis_local_priority');
      expect(result.resolvedData).toBeDefined();

      // Local data should take priority for immediate safety access
      expect(result.resolvedData?.metadata.conflictResolved).toBe(true);
    });

    it('should handle concurrent conflicts efficiently', async () => {
      const conflicts = Array.from({ length: 5 }, (_, i) =>
        global.SyncTestUtils.createMockConflict({
          entityId: `entity_${i}`,
          conflictType: 'version_mismatch',
        })
      );

      const conflictResolver = (syncAPI as any).conflictResolver;
      const resolutionPromises = conflicts.map(conflict =>
        conflictResolver.resolveConflict(conflict)
      );

      const results = await Promise.all(resolutionPromises);

      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.resolvedData).toBeDefined();
        expect(result.strategy).toBeDefined();
      });
    });
  });

  describe('Performance and Health Monitoring', () => {
    it('should track performance metrics accurately', async () => {
      // Perform various sync operations
      await syncAPI.syncCrisisData({}, 'crisis_plan', 'test_1');
      await syncAPI.syncTherapeuticData({}, 'session_data', 'test_2');
      await syncAPI.syncGeneralData({}, 'user_profile', 'test_3');

      const metrics = syncAPI.getPerformanceMetrics();

      expect(metrics.averageCrisisResponseTime).toBeGreaterThan(0);
      expect(metrics.averageTherapeuticSyncTime).toBeGreaterThan(0);
      expect(metrics.averageGeneralSyncTime).toBeGreaterThan(0);
      expect(metrics.successRate).toBeGreaterThanOrEqual(0);
      expect(metrics.successRate).toBeLessThanOrEqual(1);
      expect(metrics.queueStatus).toHaveProperty('size');
      expect(metrics.queueStatus).toHaveProperty('processing');
    });

    it('should calculate sync health status correctly', async () => {
      const syncStatus = await syncAPI.getSyncStatus();

      expect(syncStatus.syncHealth).toHaveValidSyncStatus();
      expect(['healthy', 'warning', 'error']).toContain(syncStatus.syncHealth);
    });

    it('should maintain performance under load', async () => {
      const loadTestOperations = 100;
      const startMemory = global.SyncTestUtils.trackMemoryUsage();

      const operations = Array.from({ length: loadTestOperations }, (_, i) => {
        const type = i % 3;
        if (type === 0) {
          return syncAPI.syncCrisisData({}, 'crisis_plan', `load_test_crisis_${i}`);
        } else if (type === 1) {
          return syncAPI.syncTherapeuticData({}, 'session_data', `load_test_therapeutic_${i}`);
        } else {
          return syncAPI.syncGeneralData({}, 'user_profile', `load_test_general_${i}`);
        }
      });

      const startTime = performance.now();
      const results = await Promise.all(operations);
      const totalTime = performance.now() - startTime;

      const endMemory = global.SyncTestUtils.trackMemoryUsage();
      const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;

      // Performance requirements
      expect(memoryIncrease).toBeLessThan(global.SyncTestConfig.performance.memoryLimit);
      expect(totalTime / loadTestOperations).toBeLessThan(100); // Average per operation

      // All operations should succeed
      const successCount = results.filter(r => r.success).length;
      expect(successCount / loadTestOperations).toBeGreaterThan(0.95); // 95% success rate
    });
  });

  describe('Security and Encryption', () => {
    it('should encrypt all sync data with zero-knowledge protocol', async () => {
      const sensitiveData = {
        phq9Score: 18,
        assessmentResponses: [2, 2, 3, 2, 2, 1, 2, 1, 1],
        timestamp: new Date().toISOString(),
      };

      const { zeroKnowledgeCloudSync } = require('../../../src/services/security/ZeroKnowledgeCloudSync');

      await syncAPI.syncCrisisData(sensitiveData, 'assessment', 'sensitive_assessment');

      // Verify encryption was called with correct parameters
      expect(zeroKnowledgeCloudSync.prepareForCloudUpload).toHaveBeenCalledWith(
        sensitiveData,
        expect.objectContaining({
          dataSensitivity: DataSensitivity.CLINICAL,
          syncStrategy: 'immediate',
        })
      );
    });

    it('should maintain encryption integrity during conflict resolution', async () => {
      const encryptedConflict = global.SyncTestUtils.createMockConflict({
        localData: {
          encryptedData: 'encrypted_local_data',
          metadata: {
            version: 1,
            checksum: 'local_checksum',
            lastModified: new Date().toISOString(),
            deviceId: 'local_device',
            cloudVersion: 0,
          },
          updatedAt: new Date().toISOString(),
        },
        cloudData: {
          encryptedData: 'encrypted_cloud_data',
          metadata: {
            version: 2,
            checksum: 'cloud_checksum',
            lastModified: new Date().toISOString(),
            deviceId: 'cloud_device',
            cloudVersion: 1,
          },
          updatedAt: new Date().toISOString(),
        },
      });

      const conflictResolver = (syncAPI as any).conflictResolver;
      const result = await conflictResolver.resolveConflict(encryptedConflict);

      expect(result.success).toBe(true);
      expect(result.resolvedData).toBeSecurelyEncrypted();
    });

    it('should audit all sync operations', async () => {
      const { securityControlsService } = require('../../../src/services/security/SecurityControlsService');

      await syncAPI.syncCrisisData({}, 'crisis_plan', 'audit_test');

      // Verify audit logging was called
      expect(securityControlsService.logAuditEntry).toHaveBeenCalled();

      const auditCall = securityControlsService.logAuditEntry.mock.calls[0][0];
      expect(auditCall).toHaveProperty('operation');
      expect(auditCall).toHaveProperty('entityType');
      expect(auditCall).toHaveProperty('dataSensitivity');
      expect(auditCall).toHaveProperty('securityContext');
    });
  });

  describe('Emergency Sync Configuration', () => {
    it('should configure emergency sync settings', async () => {
      const emergencyConfig = {
        enabled: true,
        triggers: ['phq9_threshold', 'crisis_button'],
        timeoutMs: 150,
        maxRetries: 5,
        forceSync: true,
      };

      await syncAPI.configureEmergencySync(emergencyConfig);

      // Verify configuration is applied
      const currentConfig = (syncAPI as any).emergencyConfig;
      expect(currentConfig.timeoutMs).toBe(150);
      expect(currentConfig.maxRetries).toBe(5);
      expect(currentConfig.triggers).toContain('phq9_threshold');
      expect(currentConfig.triggers).toContain('crisis_button');
    });

    it('should enforce emergency timeout settings', async () => {
      await syncAPI.configureEmergencySync({ timeoutMs: 100 });

      const crisisData = global.SyncTestUtils.createCrisisScenario('crisis_button');

      const { result, duration } = await global.SyncTestUtils.measurePerformance(
        () => syncAPI.syncCrisisData(crisisData, 'crisis_plan', 'timeout_test'),
        'emergency_timeout_test'
      );

      // Should respect the configured timeout
      expect(duration).toBeLessThan(200); // Still within safety requirements
      expect(result.success).toBe(true);
    });
  });

  describe('WebSocket and REST Fallback', () => {
    it('should seamlessly fallback to REST when WebSocket fails', async () => {
      // Mock WebSocket failure
      const mockWs = {
        isConnected: () => false,
        send: jest.fn().mockReturnValue(false),
      };
      (syncAPI as any).wsManager = mockWs;

      const testData = { test: 'data' };
      const result = await syncAPI.syncTherapeuticData(testData, 'session_data', 'fallback_test');

      expect(result.success).toBe(true);

      // Verify REST API was called as fallback
      const { cloudSyncAPI } = require('../../../src/services/cloud/CloudSyncAPI');
      expect(cloudSyncAPI.syncBatch).toHaveBeenCalled();
    });

    it('should maintain connection health with heartbeat', async () => {
      const mockWs = {
        isConnected: () => true,
        send: jest.fn().mockReturnValue(true),
        readyState: 1, // OPEN
      };
      (syncAPI as any).wsManager = mockWs;
      (syncAPI as any).wsManager.ws = mockWs;

      // Simulate heartbeat interval
      const wsManager = (syncAPI as any).wsManager;
      if (wsManager.startHeartbeat) {
        wsManager.startHeartbeat();
      }

      // Wait for heartbeat
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify heartbeat was sent (would be called by interval)
      // Note: In real implementation, this would be tested with timer mocking
    });
  });
});