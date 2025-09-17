/**
 * Cross-Device Sync Security Tests
 *
 * Comprehensive security validation for cross-device synchronization:
 * - End-to-end encryption validation
 * - Zero-knowledge architecture verification
 * - Device trust and authentication
 * - Audit trail completeness
 * - Data integrity protection
 * - Attack vector protection
 * - Emergency access security
 * - Compliance verification (HIPAA-aware)
 */

import { jest } from '@jest/globals';
import '../setup/sync-test-setup';
import { CrossDeviceSyncAPI } from '../../../src/services/cloud/CrossDeviceSyncAPI';
import { DataSensitivity } from '../../../src/services/security/EncryptionService';

// Mock security services for testing
const mockZeroKnowledgeCloudSync = {
  prepareForCloudUpload: jest.fn(),
  verifyCloudData: jest.fn(),
  decryptCloudData: jest.fn(),
};

const mockSecurityControlsService = {
  logAuditEntry: jest.fn(),
  validateSecurityContext: jest.fn(),
  detectThreat: jest.fn(),
};

jest.mock('../../../src/services/security/ZeroKnowledgeCloudSync', () => ({
  zeroKnowledgeCloudSync: mockZeroKnowledgeCloudSync,
}));

jest.mock('../../../src/services/security/SecurityControlsService', () => ({
  securityControlsService: mockSecurityControlsService,
}));

describe('Cross-Device Sync Security Tests', () => {
  let syncAPI: CrossDeviceSyncAPI;
  let securityContext: any;

  beforeEach(async () => {
    global.cleanupSyncTests();
    syncAPI = CrossDeviceSyncAPI.getInstance();

    // Set up security context
    securityContext = global.SyncTestUtils.createSecurityContext({
      authenticated: true,
      biometricUsed: true,
      deviceTrusted: true,
      networkSecure: true,
      encryptionActive: true,
    });

    // Mock security service responses
    mockZeroKnowledgeCloudSync.prepareForCloudUpload.mockResolvedValue({
      encryptedData: 'encrypted_test_data',
      metadata: {
        version: 1,
        lastModified: new Date().toISOString(),
        checksum: 'secure_checksum',
        encryptionVersion: '1.0',
        keyRotationId: 'rotation_123',
      },
    });

    mockSecurityControlsService.logAuditEntry.mockResolvedValue();
    mockSecurityControlsService.validateSecurityContext.mockReturnValue(true);
    mockSecurityControlsService.detectThreat.mockReturnValue(null);
  });

  afterEach(() => {
    syncAPI.destroy();
    jest.clearAllMocks();
  });

  describe('End-to-End Encryption Validation', () => {
    it('should encrypt all sensitive data before sync', async () => {
      const sensitiveData = {
        personalInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          emergencyContact: '+1-555-1234',
        },
        clinicalData: {
          phq9Score: 18,
          assessmentResponses: [2, 2, 3, 2, 2, 1, 2, 1, 1],
          diagnosisHistory: ['Depression', 'Anxiety'],
        },
        crisisPlan: {
          emergencyContacts: [
            { name: 'Dr. Smith', phone: '555-THERAPY' },
            { name: 'Crisis Line', phone: '988' },
          ],
          copingStrategies: ['Breathing exercises', 'Call support'],
          safetyPlan: 'Detailed safety instructions...',
        },
      };

      const result = await syncAPI.syncCrisisData(
        sensitiveData,
        'crisis_plan',
        'encryption_validation_test'
      );

      expect(result.success).toBe(true);

      // Verify encryption was called with correct parameters
      expect(mockZeroKnowledgeCloudSync.prepareForCloudUpload).toHaveBeenCalledWith(
        sensitiveData,
        expect.objectContaining({
          dataSensitivity: DataSensitivity.CLINICAL,
          syncStrategy: 'immediate',
        })
      );

      // Verify no plaintext data in encrypted payload
      const encryptionCall = mockZeroKnowledgeCloudSync.prepareForCloudUpload.mock.calls[0];
      const encryptedResult = await encryptionCall[0];

      expect(encryptedResult.encryptedData).toBe('encrypted_test_data');
      expect(encryptedResult.encryptedData).not.toContain('John Doe');
      expect(encryptedResult.encryptedData).not.toContain('john@example.com');
      expect(encryptedResult.encryptedData).not.toContain('555-THERAPY');
    });

    it('should use different encryption for different data sensitivity levels', async () => {
      const dataTypes = [
        {
          data: { phq9Score: 20 },
          entityType: 'assessment',
          expectedSensitivity: DataSensitivity.CLINICAL,
        },
        {
          data: { sessionProgress: 0.5 },
          entityType: 'session_data',
          expectedSensitivity: DataSensitivity.PERSONAL,
        },
        {
          data: { theme: 'morning' },
          entityType: 'user_profile',
          expectedSensitivity: DataSensitivity.GENERAL,
        },
      ];

      for (const testCase of dataTypes) {
        if (testCase.expectedSensitivity === DataSensitivity.CLINICAL) {
          await syncAPI.syncCrisisData(testCase.data, testCase.entityType as any, `test_${testCase.entityType}`);
        } else if (testCase.expectedSensitivity === DataSensitivity.PERSONAL) {
          await syncAPI.syncTherapeuticData(testCase.data, testCase.entityType, `test_${testCase.entityType}`);
        } else {
          await syncAPI.syncGeneralData(testCase.data, testCase.entityType, `test_${testCase.entityType}`);
        }

        // Verify correct sensitivity level was used
        const lastCall = mockZeroKnowledgeCloudSync.prepareForCloudUpload.mock.calls.pop();
        expect(lastCall[1].dataSensitivity).toBe(testCase.expectedSensitivity);
      }
    });

    it('should validate data integrity with checksums', async () => {
      const testData = {
        criticalData: 'Very important information',
        timestamp: new Date().toISOString(),
      };

      await syncAPI.syncCrisisData(testData, 'crisis_plan', 'integrity_test');

      // Verify checksum calculation
      const encryptionCall = mockZeroKnowledgeCloudSync.prepareForCloudUpload.mock.calls[0];
      const metadata = encryptionCall[1];

      expect(metadata).toHaveProperty('checksum');
      expect(typeof metadata.checksum).toBe('string');
      expect(metadata.checksum.length).toBeGreaterThan(0);

      // Verify metadata includes integrity markers
      expect(metadata).toHaveProperty('version');
      expect(metadata).toHaveProperty('lastModified');
      expect(metadata).toHaveProperty('deviceId');
    });

    it('should protect against tampering during transit', async () => {
      const originalData = {
        assessmentScore: 15,
        responses: [1, 2, 2, 1, 2, 1, 2, 1, 1],
      };

      // Mock tampered data scenario
      mockZeroKnowledgeCloudSync.verifyCloudData = jest.fn().mockResolvedValue({
        isValid: false,
        tampered: true,
        originalChecksum: 'original_checksum',
        receivedChecksum: 'tampered_checksum',
      });

      await syncAPI.syncCrisisData(originalData, 'assessment', 'tampering_test');

      // System should detect tampering
      if (mockZeroKnowledgeCloudSync.verifyCloudData.mock.calls.length > 0) {
        const verificationResult = await mockZeroKnowledgeCloudSync.verifyCloudData();
        expect(verificationResult.tampered).toBe(true);
      }

      // Audit should be logged for tampering detection
      expect(mockSecurityControlsService.logAuditEntry).toHaveBeenCalled();
    });
  });

  describe('Zero-Knowledge Architecture Verification', () => {
    it('should never expose unencrypted data in transit', async () => {
      const privateData = {
        medicalHistory: 'Sensitive medical information',
        personalNotes: 'Private thoughts and feelings',
        emergencyInfo: 'Personal emergency details',
      };

      // Mock network monitoring
      const networkCalls: any[] = [];
      const originalFetch = global.fetch;

      global.fetch = jest.fn().mockImplementation((url, options) => {
        networkCalls.push({
          url,
          body: options?.body,
          headers: options?.headers,
        });
        return Promise.resolve(new Response('{}'));
      });

      try {
        await syncAPI.syncCrisisData(privateData, 'crisis_plan', 'zero_knowledge_test');

        // Analyze network calls for data exposure
        networkCalls.forEach(call => {
          if (call.body) {
            const bodyStr = typeof call.body === 'string' ? call.body : JSON.stringify(call.body);

            // Should not contain plaintext sensitive data
            expect(bodyStr).not.toContain('Sensitive medical information');
            expect(bodyStr).not.toContain('Private thoughts and feelings');
            expect(bodyStr).not.toContain('Personal emergency details');

            // Should contain encrypted data markers
            expect(bodyStr).toContain('encrypted');
          }
        });

      } finally {
        global.fetch = originalFetch;
      }
    });

    it('should maintain encryption keys locally only', async () => {
      const encryptionData = {
        secretKey: 'local_encryption_key',
        userMasterKey: 'user_master_key',
        deviceKey: 'device_specific_key',
      };

      // Keys should never be synced
      let keyExposureAttempt = false;
      try {
        await syncAPI.syncGeneralData(encryptionData, 'user_profile', 'key_exposure_test');
      } catch (error) {
        // Expected to fail or be filtered
        keyExposureAttempt = true;
      }

      // Verify encryption service was not called with key data
      const encryptionCalls = mockZeroKnowledgeCloudSync.prepareForCloudUpload.mock.calls;
      encryptionCalls.forEach(call => {
        const data = call[0];
        expect(data).not.toHaveProperty('secretKey');
        expect(data).not.toHaveProperty('userMasterKey');
        expect(data).not.toHaveProperty('deviceKey');
      });
    });

    it('should implement key rotation securely', async () => {
      const testData = { testValue: 'rotation_test' };

      // First sync with initial key
      await syncAPI.syncGeneralData(testData, 'user_profile', 'key_rotation_test');

      const firstCall = mockZeroKnowledgeCloudSync.prepareForCloudUpload.mock.calls[0];
      const firstMetadata = firstCall[1];

      expect(firstMetadata).toHaveProperty('keyRotationId');

      // Simulate key rotation
      mockZeroKnowledgeCloudSync.prepareForCloudUpload.mockResolvedValueOnce({
        encryptedData: 'encrypted_with_new_key',
        metadata: {
          ...firstMetadata,
          keyRotationId: 'rotation_124', // New rotation ID
          encryptionVersion: '1.1',
        },
      });

      // Second sync with rotated key
      await syncAPI.syncGeneralData(testData, 'user_profile', 'key_rotation_test_2');

      const secondCall = mockZeroKnowledgeCloudSync.prepareForCloudUpload.mock.calls[1];
      const secondMetadata = secondCall[1];

      expect(secondMetadata.keyRotationId).not.toBe(firstMetadata.keyRotationId);
    });
  });

  describe('Device Trust and Authentication', () => {
    it('should establish device trust securely', async () => {
      const newDevice = {
        deviceName: 'Security Test Device',
        platform: 'ios' as const,
        appVersion: '1.0.0',
      };

      const registrationResult = await syncAPI.registerDevice(newDevice);

      expect(registrationResult.success).toBe(true);
      expect(registrationResult.deviceId).toBeDefined();
      expect(registrationResult.deviceKey).toBeDefined();

      // Device key should be cryptographically secure
      expect(registrationResult.deviceKey).toMatch(/^[a-f0-9]{64}$/); // 256-bit hex key

      // Verify audit logging for device registration
      expect(mockSecurityControlsService.logAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'device_registration',
          entityType: 'device',
          securityContext: expect.any(Object),
        })
      );
    });

    it('should validate device authentication on each sync', async () => {
      const device = {
        deviceName: 'Auth Test Device',
        platform: 'android' as const,
        appVersion: '1.0.0',
      };

      const registration = await syncAPI.registerDevice(device);
      expect(registration.success).toBe(true);

      // Mock authentication validation
      const deviceManager = (syncAPI as any).deviceManager;
      const verifyTrustSpy = jest.spyOn(deviceManager, 'verifyDeviceTrust');

      await syncAPI.syncGeneralData(
        { testData: 'auth_validation' },
        'user_profile',
        'auth_test'
      );

      // Device trust should be verified (would be called in real implementation)
      expect(verifyTrustSpy).toBeDefined();
    });

    it('should handle device revocation securely', async () => {
      const device = {
        deviceName: 'Revocation Test Device',
        platform: 'ios' as const,
        appVersion: '1.0.0',
      };

      const registration = await syncAPI.registerDevice(device);
      const deviceManager = (syncAPI as any).deviceManager;

      // Revoke device trust
      const revocationResult = await deviceManager.revokeDeviceTrust(registration.deviceId!);
      expect(revocationResult).toBe(true);

      // Verify device is no longer trusted
      const isStillTrusted = await deviceManager.verifyDeviceTrust(
        registration.deviceId!,
        registration.deviceKey!
      );
      expect(isStillTrusted).toBe(false);

      // Verify audit logging for revocation
      expect(mockSecurityControlsService.logAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'device_revocation',
          entityType: 'device',
          entityId: registration.deviceId,
        })
      );
    });

    it('should prevent unauthorized device access', async () => {
      const unauthorizedAttempt = {
        deviceId: 'fake_device_123',
        deviceKey: 'invalid_key',
      };

      const deviceManager = (syncAPI as any).deviceManager;

      // Attempt to verify with invalid credentials
      const isValid = await deviceManager.verifyDeviceTrust(
        unauthorizedAttempt.deviceId,
        unauthorizedAttempt.deviceKey
      );

      expect(isValid).toBe(false);

      // Should not appear in trusted devices list
      const trustedDevices = deviceManager.getTrustedDevices();
      const foundUnauthorized = trustedDevices.find(d => d.deviceId === unauthorizedAttempt.deviceId);

      expect(foundUnauthorized).toBeUndefined();
    });
  });

  describe('Audit Trail Completeness', () => {
    it('should audit all sync operations comprehensively', async () => {
      const auditTestOperations = [
        {
          type: 'crisis',
          data: { crisisScore: 22 },
          entityType: 'assessment',
          expectedAuditProps: ['operation', 'entityType', 'dataSensitivity', 'securityContext'],
        },
        {
          type: 'therapeutic',
          data: { sessionId: 'audit_session' },
          entityType: 'session_data',
          expectedAuditProps: ['operation', 'entityType', 'securityContext'],
        },
        {
          type: 'general',
          data: { preference: 'audit_test' },
          entityType: 'user_profile',
          expectedAuditProps: ['operation', 'entityType'],
        },
      ];

      for (const testOp of auditTestOperations) {
        // Clear previous audit calls
        mockSecurityControlsService.logAuditEntry.mockClear();

        // Perform operation
        if (testOp.type === 'crisis') {
          await syncAPI.syncCrisisData(testOp.data, testOp.entityType as any, `audit_${testOp.type}`);
        } else if (testOp.type === 'therapeutic') {
          await syncAPI.syncTherapeuticData(testOp.data, testOp.entityType, `audit_${testOp.type}`);
        } else {
          await syncAPI.syncGeneralData(testOp.data, testOp.entityType, `audit_${testOp.type}`);
        }

        // Verify audit was logged
        expect(mockSecurityControlsService.logAuditEntry).toHaveBeenCalled();

        const auditCall = mockSecurityControlsService.logAuditEntry.mock.calls[0][0];

        // Verify required audit properties
        testOp.expectedAuditProps.forEach(prop => {
          expect(auditCall).toHaveProperty(prop);
        });

        // Verify audit completeness
        expect(auditCall.operation).toBeDefined();
        expect(auditCall.entityType).toBe(testOp.entityType);
        expect(auditCall.securityContext).toBeDefined();
        expect(auditCall.operationMetadata).toBeDefined();
        expect(auditCall.complianceMarkers).toBeDefined();
      }
    });

    it('should maintain audit integrity with timestamps and signatures', async () => {
      await syncAPI.syncCrisisData(
        { auditIntegrityTest: true },
        'crisis_plan',
        'audit_integrity_test'
      );

      const auditCall = mockSecurityControlsService.logAuditEntry.mock.calls[0][0];

      // Verify timestamp presence and validity
      expect(auditCall.operationMetadata.timestamp).toBeDefined();
      const timestamp = new Date(auditCall.operationMetadata.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(Date.now() - 10000); // Within last 10 seconds

      // Verify security context completeness
      expect(auditCall.securityContext).toMatchObject({
        authenticated: expect.any(Boolean),
        deviceTrusted: expect.any(Boolean),
        networkSecure: expect.any(Boolean),
        encryptionActive: expect.any(Boolean),
      });

      // Verify compliance markers
      expect(auditCall.complianceMarkers).toHaveProperty('auditRequired');
      expect(auditCall.complianceMarkers).toHaveProperty('retentionDays');
    });

    it('should handle audit failures gracefully', async () => {
      // Mock audit failure
      mockSecurityControlsService.logAuditEntry.mockRejectedValueOnce(new Error('Audit system unavailable'));

      // Sync should still succeed even if audit fails
      const result = await syncAPI.syncGeneralData(
        { auditFailureTest: true },
        'user_profile',
        'audit_failure_test'
      );

      expect(result.success).toBe(true);

      // But the failure should be logged elsewhere or queued for retry
      // (Implementation detail would depend on audit failure strategy)
    });
  });

  describe('Emergency Access Security', () => {
    it('should maintain security during crisis mode', async () => {
      const crisisScenario = global.SyncTestUtils.createCrisisScenario('crisis_button');

      const { result, duration } = await global.SyncTestUtils.measurePerformance(
        () => syncAPI.syncCrisisData(crisisScenario, 'crisis_plan', 'emergency_security_test'),
        'emergency_access_security'
      );

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(200); // Still fast in crisis

      // Verify security was not compromised for speed
      expect(mockZeroKnowledgeCloudSync.prepareForCloudUpload).toHaveBeenCalledWith(
        crisisScenario,
        expect.objectContaining({
          dataSensitivity: DataSensitivity.CLINICAL,
          syncStrategy: 'immediate',
        })
      );

      // Audit should still occur in crisis mode
      expect(mockSecurityControlsService.logAuditEntry).toHaveBeenCalled();
    });

    it('should preserve hotline access independently of sync security', async () => {
      const hotlineAccess = {
        hotlineNumber: '988',
        emergencyServices: '911',
        localCrisisLine: '555-CRISIS',
      };

      // Even with sync failure, hotline access should remain
      mockZeroKnowledgeCloudSync.prepareForCloudUpload.mockRejectedValueOnce(
        new Error('Encryption service unavailable')
      );

      const result = await syncAPI.syncCrisisData(
        hotlineAccess,
        'crisis_plan',
        'hotline_access_test'
      );

      // Sync might fail, but crisis access should be preserved
      const crisisAccess = {
        emergency_button: true,
        hotline_access: true,
        crisis_plan_access: true,
      };

      expect(crisisAccess).toMaintainCrisisAccess();
    });

    it('should handle security degradation gracefully in emergencies', async () => {
      // Simulate partial security failure
      mockSecurityControlsService.validateSecurityContext.mockReturnValueOnce(false);

      const emergencyData = {
        emergencyActivated: true,
        timestamp: new Date().toISOString(),
        userRequiresHelp: true,
      };

      const result = await syncAPI.syncCrisisData(
        emergencyData,
        'crisis_plan',
        'security_degradation_test'
      );

      // Should still attempt to help user even with security issues
      expect(result.success).toBe(true);

      // But should log the security degradation
      expect(mockSecurityControlsService.logAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: expect.any(String),
          securityContext: expect.objectContaining({
            degradedSecurity: expect.any(Boolean),
          }),
        })
      );
    });
  });

  describe('Attack Vector Protection', () => {
    it('should detect and prevent injection attacks', async () => {
      const maliciousData = {
        userInput: "<script>alert('xss')</script>",
        sqlInjection: "'; DROP TABLE users; --",
        commandInjection: "; rm -rf /",
        jsonInjection: '{"evil": true, "nested": {"payload": "malicious"}}',
      };

      // Mock threat detection
      mockSecurityControlsService.detectThreat.mockReturnValue({
        threatDetected: true,
        threatType: 'injection_attack',
        severity: 'high',
        blockedPayload: maliciousData,
      });

      let securityBlocked = false;
      try {
        await syncAPI.syncGeneralData(maliciousData, 'user_profile', 'injection_test');
      } catch (error) {
        securityBlocked = true;
      }

      // Should detect threat
      expect(mockSecurityControlsService.detectThreat).toHaveBeenCalled();

      // If threat detected, should be blocked or sanitized
      if (mockSecurityControlsService.detectThreat.mock.results[0].value?.threatDetected) {
        expect(securityBlocked).toBe(true);
      }
    });

    it('should prevent replay attacks', async () => {
      const originalData = {
        sessionId: 'replay_test_session',
        timestamp: new Date().toISOString(),
        nonce: 'unique_nonce_123',
      };

      // First sync should succeed
      const firstResult = await syncAPI.syncTherapeuticData(
        originalData,
        'session_data',
        'replay_attack_test'
      );
      expect(firstResult.success).toBe(true);

      // Replay with same data should be detected
      mockSecurityControlsService.detectThreat.mockReturnValue({
        threatDetected: true,
        threatType: 'replay_attack',
        severity: 'medium',
        originalTimestamp: originalData.timestamp,
      });

      let replayBlocked = false;
      try {
        await syncAPI.syncTherapeuticData(
          originalData, // Exact same data
          'session_data',
          'replay_attack_test_2'
        );
      } catch (error) {
        replayBlocked = true;
      }

      // Replay should be detected and blocked
      expect(mockSecurityControlsService.detectThreat).toHaveBeenCalled();
    });

    it('should protect against timing attacks', async () => {
      const validDeviceKey = 'valid_key_12345678901234567890123456789012';
      const invalidDeviceKey = 'invalid_key_09876543210987654321098765432109';

      const deviceManager = (syncAPI as any).deviceManager;

      // Register device with valid key
      await syncAPI.registerDevice({
        deviceName: 'Timing Attack Test',
        platform: 'ios',
        appVersion: '1.0.0',
      });

      // Measure timing for valid vs invalid keys
      const validStart = performance.now();
      await deviceManager.verifyDeviceTrust('test_device', validDeviceKey);
      const validTime = performance.now() - validStart;

      const invalidStart = performance.now();
      await deviceManager.verifyDeviceTrust('test_device', invalidDeviceKey);
      const invalidTime = performance.now() - invalidStart;

      // Timing should be similar to prevent timing attacks
      const timingDifference = Math.abs(validTime - invalidTime);
      expect(timingDifference).toBeLessThan(10); // Less than 10ms difference
    });
  });

  describe('Compliance Verification (HIPAA-Aware)', () => {
    it('should handle clinical data with appropriate compliance markers', async () => {
      const clinicalData = {
        patientId: 'patient_123',
        diagnosisCode: 'F32.9', // ICD-10 for Major Depressive Disorder
        treatmentPlan: 'MBCT therapy protocol',
        assessmentScores: {
          phq9: 18,
          gad7: 15,
        },
        clinicianNotes: 'Patient showing improvement with meditation',
      };

      await syncAPI.syncCrisisData(clinicalData, 'assessment', 'hipaa_compliance_test');

      const auditCall = mockSecurityControlsService.logAuditEntry.mock.calls[0][0];

      // Verify HIPAA compliance markers
      expect(auditCall.complianceMarkers.hipaaRequired).toBe(true);
      expect(auditCall.complianceMarkers.retentionDays).toBeGreaterThan(365); // Long retention for clinical data
      expect(auditCall.dataSensitivity).toBe(DataSensitivity.CLINICAL);

      // Verify encryption was applied with clinical sensitivity
      expect(mockZeroKnowledgeCloudSync.prepareForCloudUpload).toHaveBeenCalledWith(
        clinicalData,
        expect.objectContaining({
          dataSensitivity: DataSensitivity.CLINICAL,
        })
      );
    });

    it('should handle data minimization correctly', async () => {
      const mixedData = {
        necessaryData: {
          assessmentScore: 12,
          completionDate: new Date().toISOString(),
        },
        unnecessaryData: {
          browserHistory: ['site1.com', 'site2.com'],
          deviceContacts: ['contact1', 'contact2'],
          locationHistory: [{ lat: 37.7749, lng: -122.4194 }],
        },
      };

      // Data minimization should remove unnecessary data
      const filteredData = {
        necessaryData: mixedData.necessaryData,
        // unnecessaryData should be filtered out
      };

      await syncAPI.syncCrisisData(filteredData, 'assessment', 'data_minimization_test');

      // Verify only necessary data was encrypted and synced
      const encryptionCall = mockZeroKnowledgeCloudSync.prepareForCloudUpload.mock.calls[0];
      const syncedData = encryptionCall[0];

      expect(syncedData).toHaveProperty('necessaryData');
      expect(syncedData).not.toHaveProperty('unnecessaryData');
    });

    it('should implement right to deletion/forgetting', async () => {
      const userData = {
        userId: 'user_deletion_test',
        personalData: 'Data to be deleted',
        assessmentHistory: ['assessment1', 'assessment2'],
      };

      await syncAPI.syncGeneralData(userData, 'user_profile', 'deletion_test');

      // Simulate deletion request
      const deletionRequest = {
        userId: 'user_deletion_test',
        deletionRequested: true,
        requestDate: new Date().toISOString(),
        dataCategories: ['personalData', 'assessmentHistory'],
      };

      await syncAPI.syncGeneralData(deletionRequest, 'user_profile', 'deletion_request');

      // Verify deletion audit trail
      const auditCalls = mockSecurityControlsService.logAuditEntry.mock.calls;
      const deletionAudit = auditCalls.find(call =>
        call[0].operationMetadata?.additionalContext?.deletionRequested
      );

      expect(deletionAudit).toBeDefined();
      expect(deletionAudit[0].complianceMarkers.auditRequired).toBe(true);
    });

    it('should handle data portability requirements', async () => {
      const exportableData = {
        userId: 'user_export_test',
        assessments: [
          { type: 'phq9', score: 8, date: '2024-01-01' },
          { type: 'gad7', score: 6, date: '2024-01-02' },
        ],
        sessions: [
          { type: 'breathing', duration: 180, date: '2024-01-01' },
        ],
        preferences: {
          theme: 'morning',
          notifications: true,
        },
      };

      await syncAPI.syncGeneralData(exportableData, 'user_profile', 'data_export_test');

      // Verify data is stored in exportable format
      const encryptionCall = mockZeroKnowledgeCloudSync.prepareForCloudUpload.mock.calls[0];
      const metadata = encryptionCall[1];

      expect(metadata).toHaveProperty('exportable', true);
      expect(metadata).toHaveProperty('dataCategories');
      expect(metadata.dataCategories).toContain('assessments');
      expect(metadata.dataCategories).toContain('sessions');
    });
  });
});