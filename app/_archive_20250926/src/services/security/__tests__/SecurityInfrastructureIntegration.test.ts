/**
 * Security Infrastructure Integration Tests - P0-CLOUD Phase 1
 *
 * Comprehensive integration tests for the security infrastructure ensuring:
 * - Zero-knowledge architecture compliance
 * - Crisis response performance <200ms
 * - Feature flag security enforcement
 * - End-to-end encryption workflows
 * - HIPAA compliance validation
 */

import { jest } from '@jest/globals';

// Mock expo modules before importing services
jest.mock('expo-crypto');
jest.mock('expo-secure-store');
jest.mock('expo-local-authentication');

import {
  securityManager,
  encryptionService,
  featureFlagService,
  securityControlsService,
  zeroKnowledgeCloudSync,
  DataSensitivity
} from '../index';

// Mock implementations
const mockCrypto = require('expo-crypto') as jest.Mocked<typeof import('expo-crypto')>;
const mockSecureStore = require('expo-secure-store') as jest.Mocked<typeof import('expo-secure-store')>;
const mockLocalAuth = require('expo-local-authentication') as jest.Mocked<typeof import('expo-local-authentication')>;

describe('Security Infrastructure Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock crypto operations
    mockCrypto.getRandomBytesAsync.mockResolvedValue(new Uint8Array(32).fill(1));
    mockCrypto.digestStringAsync.mockResolvedValue('mock-hash');

    // Mock secure storage
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    mockSecureStore.setItemAsync.mockResolvedValue();
    mockSecureStore.deleteItemAsync.mockResolvedValue();

    // Mock biometric authentication
    mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
    mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
    mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });

    // Mock Web Crypto API
    global.crypto = {
      subtle: {
        importKey: jest.fn().mockResolvedValue({}),
        encrypt: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
        decrypt: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
        deriveBits: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
        generateKey: jest.fn().mockResolvedValue({})
      }
    } as any;

    global.TextEncoder = jest.fn().mockImplementation(() => ({
      encode: jest.fn().mockReturnValue(new Uint8Array())
    }));

    global.TextDecoder = jest.fn().mockImplementation(() => ({
      decode: jest.fn().mockReturnValue('mock-decoded')
    }));
  });

  describe('Security Manager Initialization', () => {
    it('should initialize all security services successfully', async () => {
      const initializeTime = Date.now();

      await securityManager.initialize();

      const initializeDuration = Date.now() - initializeTime;

      // Verify initialization is fast
      expect(initializeDuration).toBeLessThan(2000); // Under 2 seconds

      // Verify security status
      const status = await securityManager.getSecurityStatus();
      expect(status).toBeDefined();
      expect(status.overall).toMatch(/secure|warning|critical/);
    });

    it('should handle initialization failures gracefully', async () => {
      // Mock encryption service failure
      jest.spyOn(encryptionService, 'initialize').mockRejectedValueOnce(new Error('Init failed'));

      await expect(securityManager.initialize()).rejects.toThrow('Security initialization failed');
    });

    it('should validate security readiness correctly', async () => {
      await securityManager.initialize();

      const readiness = await securityManager.validateSecurityReadiness();

      expect(readiness).toHaveProperty('ready');
      expect(readiness).toHaveProperty('requiredActions');
      expect(readiness).toHaveProperty('criticalIssues');
      expect(readiness.estimatedReadinessTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Feature Flag Security Integration', () => {
    it('should default all cloud features to OFF', async () => {
      const flagStatus = await featureFlagService.getFeatureFlagStatus();

      expect(flagStatus.flags.cloudSyncEnabled).toBe(false);
      expect(flagStatus.flags.zeroKnowledgeEncryption).toBe(false);
      expect(flagStatus.flags.remoteBackupEnabled).toBe(false);
      expect(flagStatus.flags.multiDeviceSync).toBe(false);
      expect(flagStatus.flags.realTimeSync).toBe(false);

      // Safety features should be enabled
      expect(flagStatus.flags.crisisResponseOverride).toBe(true);
      expect(flagStatus.flags.auditLoggingEnabled).toBe(true);
      expect(flagStatus.flags.threatDetectionEnabled).toBe(true);
    });

    it('should enforce security validation before enabling cloud features', async () => {
      // Try to enable cloud sync without security validation
      const result = await featureFlagService.setFlag('cloudSyncEnabled', true, {
        modifiedBy: 'user',
        reason: 'Test'
      });

      // Should fail due to security requirements not met
      expect(result).toBe(false);
    });

    it('should enable cloud features progressively when security requirements are met', async () => {
      // Mock security requirements as met
      jest.spyOn(encryptionService, 'getSecurityReadiness').mockResolvedValue({
        ready: true,
        algorithm: 'AES-256-GCM',
        keyDerivation: 'PBKDF2-SHA256-100000',
        encryptionStrength: 'production',
        cloudSyncReady: true,
        zeroKnowledgeReady: true,
        issues: [],
        recommendations: []
      });

      const result = await featureFlagService.enableCloudFeaturesProgressive();

      expect(result.success).toBe(true);
      expect(result.enabledFeatures.length).toBeGreaterThan(0);
      expect(result.failedFeatures.length).toBe(0);
    });

    it('should handle emergency disable of cloud features', async () => {
      // First enable some cloud features
      await featureFlagService.setFlag('cloudSyncEnabled', true, {
        modifiedBy: 'system',
        securityApproved: true
      });

      // Emergency disable
      await featureFlagService.emergencyDisableCloudFeatures('Security threat detected');

      // Verify cloud features are disabled
      const cloudSyncEnabled = await featureFlagService.getFlag('cloudSyncEnabled');
      const emergencyMode = await featureFlagService.getFlag('emergencyOfflineMode');

      expect(cloudSyncEnabled).toBe(false);
      expect(emergencyMode).toBe(true);
    });
  });

  describe('Zero-Knowledge Cloud Sync Integration', () => {
    const mockData = {
      mood: 7,
      anxiety: 3,
      note: 'Feeling better today',
      timestamp: new Date().toISOString()
    };

    const mockMetadata = {
      entityType: 'check_in' as const,
      entityId: 'checkin_123',
      userId: 'user_456',
      version: 1,
      lastModified: new Date().toISOString(),
      dataSensitivity: DataSensitivity.PERSONAL,
      syncStrategy: 'immediate' as const,
      clientTimestamp: new Date().toISOString(),
      deviceId: 'device_789',
      appVersion: '1.8.0'
    };

    it('should prepare data for zero-knowledge cloud upload', async () => {
      // Enable zero-knowledge sync
      await featureFlagService.setFlag('zeroKnowledgeEncryption', true, {
        modifiedBy: 'system',
        securityApproved: true
      });

      const payload = await zeroKnowledgeCloudSync.prepareForCloudUpload(mockData, mockMetadata);

      expect(payload).toHaveProperty('encryptedData');
      expect(payload).toHaveProperty('encryptedMetadata');
      expect(payload).toHaveProperty('syncSalt');
      expect(payload).toHaveProperty('integrityHash');
      expect(payload.performanceMetadata.encryptionTime).toBeGreaterThan(0);

      // Verify no plaintext in payload
      expect(payload.encryptedData).not.toContain('Feeling better today');
      expect(payload.encryptedMetadata).not.toContain('checkin_123');
    });

    it('should process data from zero-knowledge cloud download', async () => {
      // First prepare data for upload
      const payload = await zeroKnowledgeCloudSync.prepareForCloudUpload(mockData, mockMetadata);

      // Then process it as if downloaded from cloud
      const processedData = await zeroKnowledgeCloudSync.processFromCloudDownload(payload, mockMetadata);

      expect(processedData).toEqual(mockData);
    });

    it('should resolve conflicts with encrypted data', async () => {
      const clientData = { ...mockData, mood: 8 };
      const serverData = { ...mockData, anxiety: 2 };

      const clientPayload = await zeroKnowledgeCloudSync.prepareForCloudUpload(clientData, mockMetadata);
      const serverPayload = await zeroKnowledgeCloudSync.prepareForCloudUpload(serverData, mockMetadata);

      const resolutionStrategy = {
        strategy: 'merge' as const,
        encryptedResolutionData: 'encrypted-strategy-data'
      };

      const result = await zeroKnowledgeCloudSync.resolveConflictEncrypted(
        clientPayload,
        serverPayload,
        resolutionStrategy,
        mockMetadata
      );

      expect(result.success).toBe(true);
      expect(result.operation).toBe('conflict_resolution');
      expect(result.securityAudit.zeroKnowledgeVerified).toBe(true);
      expect(result.securityAudit.noPlaintextTransmitted).toBe(true);
    });

    it('should validate zero-knowledge compliance', async () => {
      const compliance = await zeroKnowledgeCloudSync.validateZeroKnowledgeCompliance();

      expect(compliance).toHaveProperty('compliant');
      expect(compliance).toHaveProperty('violations');
      expect(compliance).toHaveProperty('recommendations');

      if (!compliance.compliant) {
        expect(compliance.violations.length).toBeGreaterThan(0);
        expect(compliance.recommendations.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Security Controls and Threat Assessment', () => {
    it('should generate Row Level Security policies for all entity types', async () => {
      const policies = await securityControlsService.generateRowLevelSecurityPolicies();

      expect(policies.length).toBeGreaterThan(0);

      // Check that all entity types have policies
      const entityTypes = ['user_profile', 'check_in', 'assessment', 'crisis_plan'];
      for (const entityType of entityTypes) {
        const entityPolicies = policies.filter(p => p.entityType === entityType);
        expect(entityPolicies.length).toBeGreaterThan(0);
      }

      // Check that clinical data has stricter policies
      const assessmentPolicies = policies.filter(p => p.entityType === 'assessment');
      expect(assessmentPolicies.every(p => p.encryptionRequired)).toBe(true);
      expect(assessmentPolicies.every(p => p.auditRequired)).toBe(true);
    });

    it('should validate RLS policies correctly', async () => {
      const validation = await securityControlsService.validateRLSPolicy(
        'assessment',
        'SELECT',
        'user_123',
        {
          biometricAuthenticated: true,
          emergencyAccess: false,
          dataSensitivity: DataSensitivity.CLINICAL
        }
      );

      expect(validation).toHaveProperty('allowed');
      expect(validation).toHaveProperty('reason');
      expect(validation).toHaveProperty('auditRequired');
    });

    it('should perform threat assessment', async () => {
      const assessment = await securityControlsService.performThreatAssessment();

      expect(assessment).toHaveProperty('threatId');
      expect(assessment).toHaveProperty('threatLevel');
      expect(assessment).toHaveProperty('indicators');
      expect(assessment).toHaveProperty('recommendedActions');
      expect(assessment).toHaveProperty('cloudIntegrationImpact');

      expect(['none', 'low', 'medium', 'high', 'critical']).toContain(assessment.threatLevel);
    });

    it('should handle biometric authentication with fallback', async () => {
      const authResult = await securityControlsService.authenticateUser({
        operation: 'data_access',
        emergencyBypass: false
      });

      expect(authResult).toHaveProperty('success');
      expect(authResult).toHaveProperty('method');
      expect(authResult).toHaveProperty('duration');

      if (authResult.success) {
        expect(['biometric', 'pin', 'emergency_bypass']).toContain(authResult.method);
      }
    });

    it('should record and handle security violations', async () => {
      await securityControlsService.recordSecurityViolation({
        violationType: 'authentication_failure',
        severity: 'medium',
        description: 'Test security violation',
        affectedResources: ['test_resource'],
        automaticResponse: {
          implemented: false,
          actions: []
        }
      });

      const status = await securityControlsService.getSecurityStatus();
      expect(status.securityViolations).toBeGreaterThan(0);
    });
  });

  describe('End-to-End Encryption Workflows', () => {
    it('should encrypt and decrypt clinical data with audit logging', async () => {
      const clinicalData = {
        phq9Score: 15,
        suicidalIdeation: false,
        assessmentDate: new Date().toISOString(),
        responses: [2, 2, 1, 3, 2, 1, 2, 2, 2] // PHQ-9 responses
      };

      // Encrypt clinical data
      const encrypted = await securityManager.encryptForStorage(clinicalData, DataSensitivity.CLINICAL);

      expect(encrypted).toHaveProperty('encryptedData');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('timestamp');

      // Verify no plaintext in encrypted data
      expect(encrypted.encryptedData).not.toContain('15');
      expect(encrypted.encryptedData).not.toContain('suicidalIdeation');

      // Decrypt clinical data
      const decrypted = await securityManager.decryptFromStorage(encrypted, DataSensitivity.CLINICAL);

      expect(decrypted).toEqual(clinicalData);
    });

    it('should prepare and process cloud sync data', async () => {
      const syncData = { mood: 8, note: 'Great day!' };
      const metadata = {
        entityType: 'check_in',
        entityId: 'sync_test_123',
        dataSensitivity: DataSensitivity.PERSONAL
      };

      // Prepare for cloud sync
      const prepared = await securityManager.prepareForCloudSync(syncData, metadata);

      expect(prepared).toHaveProperty('encryptedPayload');
      expect(prepared).toHaveProperty('syncSalt');
      expect(prepared).toHaveProperty('integrity');

      // Process from cloud sync
      const processed = await securityManager.processFromCloudSync(prepared, metadata);

      expect(processed).toEqual(syncData);
    });
  });

  describe('Performance Requirements', () => {
    it('should meet crisis response time requirements', async () => {
      // Test emergency data access performance
      const startTime = Date.now();

      const canAccess = await securityManager.validateAccess('crisis_plan', 'SELECT', 'user_123');

      const responseTime = Date.now() - startTime;

      // Crisis response must be under 200ms
      expect(responseTime).toBeLessThan(200);
      expect(canAccess).toHaveProperty('allowed');
    });

    it('should optimize security performance', async () => {
      const optimization = await securityManager.optimizeSecurityPerformance();

      expect(optimization).toHaveProperty('optimizationsApplied');
      expect(optimization).toHaveProperty('performanceGain');
      expect(optimization).toHaveProperty('securityImpact');

      // Optimizations should not compromise security
      expect(optimization.securityImpact).toBe('none');
    });

    it('should monitor performance metrics', async () => {
      const metrics = await securityManager.monitorPerformance();

      expect(metrics).toHaveProperty('crisisResponseTime');
      expect(metrics).toHaveProperty('throughput');
      expect(metrics).toHaveProperty('errorRates');
      expect(metrics).toHaveProperty('resourceUsage');

      // Crisis response time should be under requirement
      expect(metrics.crisisResponseTime).toBeLessThan(200);
    });
  });

  describe('HIPAA Compliance Integration', () => {
    it('should generate comprehensive compliance report', async () => {
      const report = await securityManager.generateComplianceReport();

      expect(report).toHaveProperty('reportId');
      expect(report).toHaveProperty('hipaaCompliance');
      expect(report).toHaveProperty('auditSummary');
      expect(report).toHaveProperty('recommendations');

      expect(report.hipaaCompliance).toHaveProperty('overall');
      expect(report.hipaaCompliance).toHaveProperty('technicalSafeguards');
      expect(report.hipaaCompliance).toHaveProperty('administrativeSafeguards');
      expect(report.hipaaCompliance).toHaveProperty('physicalSafeguards');
    });

    it('should log security events with proper audit trail', async () => {
      await securityManager.logSecurityEvent({
        operation: 'test_audit_event',
        entityType: 'test_entity',
        dataSensitivity: DataSensitivity.CLINICAL,
        userId: 'test_user'
      });

      const status = await securityManager.getSecurityStatus();
      expect(status.compliance.auditLoggingActive).toBe(true);
    });

    it('should handle key rotation for compliance', async () => {
      const startTime = Date.now();

      await securityManager.rotateSecurityKeys();

      const rotationTime = Date.now() - startTime;

      // Key rotation should complete in reasonable time
      expect(rotationTime).toBeLessThan(5000); // Under 5 seconds
    });
  });

  describe('Emergency and Crisis Scenarios', () => {
    it('should enable emergency mode correctly', async () => {
      await securityManager.enableEmergencyMode('Test emergency scenario');

      const status = await securityManager.getSecurityStatus();

      // Cloud features should be disabled in emergency mode
      expect(status.cloudSync.enabled).toBe(false);

      // Emergency mode flag should be set
      const emergencyMode = await featureFlagService.getFlag('emergencyOfflineMode');
      expect(emergencyMode).toBe(true);
    });

    it('should allow emergency access to crisis plans', async () => {
      // Test emergency access without full authentication
      const startTime = Date.now();

      const validation = await securityControlsService.validateRLSPolicy(
        'crisis_plan',
        'SELECT',
        'user_123',
        {
          biometricAuthenticated: false,
          emergencyAccess: true,
          dataSensitivity: DataSensitivity.CLINICAL
        }
      );

      const accessTime = Date.now() - startTime;

      expect(validation.allowed).toBe(true);
      expect(validation.reason).toContain('Emergency access');
      expect(accessTime).toBeLessThan(200); // Crisis response requirement
    });

    it('should maintain security during system failures', async () => {
      // Mock various system failures
      jest.spyOn(encryptionService, 'encryptData').mockRejectedValueOnce(new Error('Encryption failed'));

      // System should fail safely
      await expect(
        securityManager.encryptForStorage({ test: 'data' }, DataSensitivity.CLINICAL)
      ).rejects.toThrow();

      // But emergency functions should still work
      const emergencyCheck = await securityManager.getSecurityStatus();
      expect(emergencyCheck).toBeDefined();
    });
  });

  describe('Integration Security Validation', () => {
    it('should validate complete security infrastructure integrity', async () => {
      // Test the complete security stack integration
      await securityManager.initialize();

      const readiness = await securityManager.validateSecurityReadiness();
      const status = await securityManager.getSecurityStatus();
      const threatAssessment = await securityManager.assessThreats();

      // All security components should be functioning
      expect(status.overall).toMatch(/secure|warning/); // Should not be critical in test
      expect(threatAssessment.threatLevel).toMatch(/none|low|medium/); // Should not be high/critical in test

      // Performance should meet requirements
      expect(status.performance.crisisResponseTime).toBeLessThan(200);
    });

    it('should handle concurrent security operations safely', async () => {
      // Test concurrent encryption operations
      const concurrentOperations = Array.from({ length: 10 }, (_, i) =>
        securityManager.encryptForStorage({ test: `data_${i}` }, DataSensitivity.PERSONAL)
      );

      const results = await Promise.all(concurrentOperations);

      // All operations should succeed
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toHaveProperty('encryptedData');
        expect(result).toHaveProperty('iv');
      });
    });

    it('should maintain data consistency across all security layers', async () => {
      const testData = {
        id: 'consistency_test',
        value: 'test_data_value',
        timestamp: new Date().toISOString()
      };

      // Encrypt → Prepare for cloud → Process from cloud → Decrypt
      const encrypted = await securityManager.encryptForStorage(testData, DataSensitivity.PERSONAL);

      const cloudPrepped = await securityManager.prepareForCloudSync(testData, {
        entityType: 'check_in',
        entityId: 'test',
        dataSensitivity: DataSensitivity.PERSONAL
      });

      const cloudProcessed = await securityManager.processFromCloudSync(cloudPrepped, {
        dataSensitivity: DataSensitivity.PERSONAL
      });

      const decrypted = await securityManager.decryptFromStorage(encrypted, DataSensitivity.PERSONAL);

      // Data should be consistent through all transformations
      expect(cloudProcessed).toEqual(testData);
      expect(decrypted).toEqual(testData);
    });
  });
});

describe('Security Infrastructure Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle crypto API failures gracefully', async () => {
    // Mock crypto failure
    global.crypto.subtle.encrypt = jest.fn().mockRejectedValue(new Error('Crypto failed'));

    await expect(
      encryptionService.encryptData({ test: 'data' }, DataSensitivity.CLINICAL)
    ).rejects.toThrow();
  });

  it('should handle secure storage failures', async () => {
    mockSecureStore.setItemAsync.mockRejectedValue(new Error('Storage failed'));

    // Should handle storage failures without crashing
    await expect(
      featureFlagService.setFlag('testFlag' as any, true, { modifiedBy: 'user' })
    ).resolves.toBe(false);
  });

  it('should handle biometric authentication failures', async () => {
    mockLocalAuth.authenticateAsync.mockResolvedValue({
      success: false,
      error: 'User canceled'
    });

    const authResult = await securityControlsService.authenticateUser({
      operation: 'data_access'
    });

    expect(authResult.success).toBe(false);
    expect(authResult.error).toContain('User canceled');
  });
});

// Performance benchmarking tests
describe('Security Infrastructure Performance Benchmarks', () => {
  it('should meet encryption performance benchmarks', async () => {
    const iterations = 100;
    const testData = { benchmark: 'data', iteration: 0 };

    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      testData.iteration = i;
      await encryptionService.encryptData(testData, DataSensitivity.PERSONAL);
    }

    const totalTime = Date.now() - startTime;
    const averageTime = totalTime / iterations;

    // Should encrypt data in under 50ms on average
    expect(averageTime).toBeLessThan(50);

    console.log(`Encryption benchmark: ${averageTime.toFixed(2)}ms average over ${iterations} iterations`);
  });

  it('should meet authentication performance benchmarks', async () => {
    const iterations = 20;
    const authTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();

      await securityControlsService.authenticateUser({
        operation: 'data_access'
      });

      authTimes.push(Date.now() - startTime);
    }

    const averageAuthTime = authTimes.reduce((a, b) => a + b, 0) / authTimes.length;

    // Should authenticate in under 500ms on average
    expect(averageAuthTime).toBeLessThan(500);

    console.log(`Authentication benchmark: ${averageAuthTime.toFixed(2)}ms average over ${iterations} iterations`);
  });

  it('should meet crisis response performance benchmarks', async () => {
    const iterations = 50;
    const responseTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();

      // Simulate crisis response workflow
      await securityManager.validateAccess('crisis_plan', 'SELECT', 'user_123');

      responseTimes.push(Date.now() - startTime);
    }

    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);

    // Average should be well under 200ms
    expect(averageResponseTime).toBeLessThan(100);

    // Maximum should never exceed 200ms (crisis requirement)
    expect(maxResponseTime).toBeLessThan(200);

    console.log(`Crisis response benchmark: ${averageResponseTime.toFixed(2)}ms average, ${maxResponseTime}ms max over ${iterations} iterations`);
  });
});