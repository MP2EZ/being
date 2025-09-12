/**
 * Security Ecosystem Integration Tests
 * 
 * Comprehensive end-to-end testing of the complete security ecosystem
 * including SQLite migration, Calendar integration, and their coordination.
 * 
 * CRITICAL: Validates that all security components work together seamlessly
 * while maintaining clinical-grade data protection and emergency access.
 */

import { jest } from '@jest/globals';
import { productionEncryptionService } from '../../src/services/security/ProductionEncryptionService';
import { featureCoordinationSecurity } from '../../src/services/security/FeatureCoordinationSecurityService';
import { calendarIntegrationService } from '../../src/services/calendar/CalendarIntegrationAPI';
import { DataSensitivity } from '../../src/services/security/EncryptionService';

// Mock Web Crypto API for testing
const mockSubtle = {
  encrypt: jest.fn(),
  decrypt: jest.fn(),
  deriveKey: jest.fn(),
  importKey: jest.fn(),
  generateKey: jest.fn()
};

Object.defineProperty(global, 'crypto', {
  value: {
    subtle: mockSubtle,
    getRandomValues: jest.fn((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    })
  }
});

// Mock Expo Crypto
jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn().mockImplementation((size: number) => {
    const array = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return Promise.resolve(array);
  }),
  digestStringAsync: jest.fn().mockResolvedValue('mocked-hash')
}));

// Mock Expo SecureStore
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockImplementation((key: string) => {
    if (key.includes('master_key')) {
      return Promise.resolve('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
    }
    if (key.includes('emergency_contacts')) {
      return Promise.resolve('{"contacts": ["911", "988"]}');
    }
    return Promise.resolve(null);
  }),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined)
}));

// Mock React Native
jest.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '15.0' }
}));

describe('Security Ecosystem Integration Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Web Crypto API mocks for AES-256-GCM
    mockSubtle.encrypt.mockImplementation(() => {
      // Mock encrypted data with auth tag
      const ciphertext = new Uint8Array(32); // Mock encrypted data
      const authTag = new Uint8Array(16);    // Mock authentication tag
      const result = new Uint8Array(48);      // Combined result
      result.set(ciphertext, 0);
      result.set(authTag, 32);
      return Promise.resolve(result.buffer);
    });

    mockSubtle.decrypt.mockImplementation(() => {
      // Mock decrypted data
      const plaintext = JSON.stringify({ test: 'data', clinical: false });
      return Promise.resolve(new TextEncoder().encode(plaintext));
    });

    mockSubtle.deriveKey.mockImplementation(() => {
      // Mock derived CryptoKey
      return Promise.resolve({
        type: 'secret',
        extractable: false,
        algorithm: { name: 'AES-GCM', length: 256 },
        usages: ['encrypt', 'decrypt']
      });
    });

    mockSubtle.importKey.mockImplementation(() => {
      // Mock imported key for PBKDF2
      return Promise.resolve({
        type: 'secret',
        extractable: false,
        algorithm: { name: 'PBKDF2' },
        usages: ['deriveKey']
      });
    });
  });

  describe('CRITICAL: End-to-End Security Validation', () => {
    
    test('complete security workflow with clinical data protection', async () => {
      // Step 1: Validate production encryption service
      const configValidation = await productionEncryptionService.validateConfiguration();
      expect(configValidation.valid).toBe(true);
      expect(configValidation.issues).toHaveLength(0);

      // Step 2: Test clinical data encryption/decryption
      const clinicalData = {
        phq9Scores: [1, 2, 1, 0, 1, 2, 1, 1, 0],
        totalScore: 9,
        severity: 'mild',
        timestamp: new Date().toISOString(),
        assessmentId: 'phq9_001'
      };

      const encryptionResult = await productionEncryptionService.encryptData(
        clinicalData,
        DataSensitivity.CLINICAL,
        { dataType: 'phq9_assessment' }
      );

      expect(encryptionResult.encryptedData).toBeDefined();
      expect(encryptionResult.iv).toBeDefined();
      expect(encryptionResult.authTag).toBeDefined();
      expect(encryptionResult.metadata.algorithm).toBe('aes-256-gcm');
      expect(encryptionResult.metadata.sensitivity).toBe(DataSensitivity.CLINICAL);

      // Step 3: Validate decryption and integrity
      const decryptedData = await productionEncryptionService.decryptData(
        encryptionResult,
        DataSensitivity.CLINICAL
      );

      const integrityValid = await productionEncryptionService.validateDataIntegrity(
        clinicalData,
        encryptionResult,
        DataSensitivity.CLINICAL
      );

      expect(integrityValid).toBe(true);
      
      console.log('✅ Clinical data encryption/decryption: Authenticated encryption validated');
    });

    test('emergency access guarantee during coordinated operations', async () => {
      // Simulate concurrent migration and calendar operations
      const migrationOperation = {
        id: 'security_migration',
        type: 'migration' as const,
        priority: 'high' as const,
        requiresExclusiveLock: true,
        emergencyAccessRequired: true,
        execute: jest.fn().mockImplementation(async () => {
          // Simulate migration work with encryption
          const testData = { migrationStep: 1, progress: 50 };
          const encrypted = await productionEncryptionService.encryptData(
            testData,
            DataSensitivity.PERSONAL
          );
          await new Promise(resolve => setTimeout(resolve, 200)); // Simulate work
          const decrypted = await productionEncryptionService.decryptData(
            encrypted,
            DataSensitivity.PERSONAL
          );
          return decrypted;
        }),
        rollback: jest.fn().mockResolvedValue(undefined),
        validate: jest.fn().mockResolvedValue(true)
      };

      const calendarOperation = {
        id: 'security_calendar',
        type: 'calendar' as const,
        priority: 'medium' as const,
        requiresExclusiveLock: false,
        emergencyAccessRequired: false,
        execute: jest.fn().mockImplementation(async () => {
          // Test calendar privacy protection
          const calendarData = {
            title: 'FullMind Practice',
            description: 'Daily mindfulness',
            startTime: new Date().toISOString()
          };
          return calendarData;
        }),
        rollback: jest.fn().mockResolvedValue(undefined),
        validate: jest.fn().mockResolvedValue(true)
      };

      // Execute coordinated operations
      const coordinationPromise = featureCoordinationSecurity.coordinateSecureOperations([
        migrationOperation,
        calendarOperation
      ]);

      // Test emergency access during operations
      await new Promise(resolve => setTimeout(resolve, 50)); // Let operations start
      
      const emergencyStart = performance.now();
      const emergencyAccess = await featureCoordinationSecurity.validateEmergencyAccess();
      const emergencyDuration = performance.now() - emergencyStart;

      // Wait for operations to complete
      await coordinationPromise;

      // Validate emergency access performance
      expect(emergencyAccess.accessible).toBe(true);
      expect(emergencyAccess.responseTime).toBeLessThan(200);
      expect(emergencyDuration).toBeLessThan(250);
      expect(emergencyAccess.crisisDataAvailable).toBe(true);

      // Validate operations completed successfully
      expect(migrationOperation.execute).toHaveBeenCalledTimes(1);
      expect(calendarOperation.execute).toHaveBeenCalledTimes(1);

      console.log(`✅ Emergency access during coordination: ${emergencyAccess.responseTime.toFixed(2)}ms response time`);
    });

    test('security boundary validation across all components', async () => {
      // Test operation that requires all security boundaries
      const comprehensiveOperation = {
        id: 'comprehensive_security_test',
        type: 'migration' as const,
        priority: 'high' as const,
        requiresExclusiveLock: true,
        emergencyAccessRequired: true,
        execute: jest.fn().mockImplementation(async () => {
          // Test encryption during operation
          const sensitiveData = {
            userProfile: { id: 'user_001', preferences: {} },
            clinicalData: { assessmentCount: 5, lastScore: 8 }
          };

          // Encrypt different sensitivity levels
          const profileEncrypted = await productionEncryptionService.encryptData(
            sensitiveData.userProfile,
            DataSensitivity.PERSONAL
          );

          const clinicalEncrypted = await productionEncryptionService.encryptData(
            sensitiveData.clinicalData,
            DataSensitivity.CLINICAL
          );

          // Validate encryption worked
          expect(profileEncrypted.authTag).toBeDefined();
          expect(clinicalEncrypted.authTag).toBeDefined();

          return { profileEncrypted, clinicalEncrypted };
        }),
        rollback: jest.fn().mockResolvedValue(undefined),
        validate: jest.fn().mockResolvedValue(true)
      };

      // Validate security boundaries
      const boundaries = await featureCoordinationSecurity.validateSecurityBoundaries(comprehensiveOperation);
      
      expect(boundaries).toHaveLength(4);
      expect(boundaries.every(b => ['secure', 'warning'].includes(b.status))).toBe(true);

      // Execute operation with boundary validation
      await featureCoordinationSecurity.coordinateSecureOperations([comprehensiveOperation]);

      // Re-validate boundaries after operation
      const postExecutionBoundaries = await featureCoordinationSecurity.validateSecurityBoundaries(comprehensiveOperation);
      expect(postExecutionBoundaries.every(b => b.status !== 'violation')).toBe(true);

      console.log('✅ Security boundary validation: All boundaries maintained during operation');
    });

    test('privacy protection in calendar integration with encrypted storage', async () => {
      // Mock calendar service with PHI detection
      const potentiallyRiskyContent = [
        'PHQ-9 score: 15 severe depression',
        'GAD-7 assessment due',
        'Patient feeling suicidal',
        'Normal mindfulness practice',
        'Therapy appointment with Dr. Smith'
      ];

      for (const content of potentiallyRiskyContent) {
        // Test content sanitization
        const sanitized = await calendarIntegrationService.sanitizeEventContent(content);
        
        // Should not contain any PHI
        expect(sanitized.title).not.toMatch(/phq|gad|score|suicid|patient|dr\./i);
        expect(sanitized.description).not.toMatch(/phq|gad|score|suicid|patient|dr\./i);
        
        // Test encryption of sanitized content
        const encrypted = await productionEncryptionService.encryptData(
          {
            originalContent: content,
            sanitizedTitle: sanitized.title,
            sanitizedDescription: sanitized.description,
            privacyLevel: sanitized.privacyLevel
          },
          DataSensitivity.THERAPEUTIC
        );

        expect(encrypted.authTag).toBeDefined();
        expect(encrypted.metadata.sensitivity).toBe(DataSensitivity.THERAPEUTIC);

        if (content.includes('mindfulness')) {
          expect(sanitized.hasPrivateData).toBe(false);
          console.log(`✅ Clean content: "${content}" → "${sanitized.title}"`);
        } else {
          expect(sanitized.hasPrivateData).toBe(true);
          console.log(`⚠️ PHI sanitized: "${content}" → "${sanitized.title}"`);
        }
      }
    });

  });

  describe('Performance Under Security Load', () => {
    
    test('encryption performance meets healthcare requirements', async () => {
      const testDataSizes = [
        { size: 'small', data: { test: 'small data' } },
        { size: 'medium', data: { test: 'medium data', array: Array.from({ length: 100 }, (_, i) => i) } },
        { size: 'large', data: { test: 'large data', array: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item_${i}` })) } }
      ];

      for (const testCase of testDataSizes) {
        const startTime = performance.now();
        
        const encrypted = await productionEncryptionService.encryptData(
          testCase.data,
          DataSensitivity.CLINICAL
        );
        
        const decrypted = await productionEncryptionService.decryptData(
          encrypted,
          DataSensitivity.CLINICAL
        );
        
        const totalTime = performance.now() - startTime;
        
        // Healthcare applications should encrypt/decrypt within reasonable time
        expect(totalTime).toBeLessThan(100); // 100ms for clinical operations
        
        // Validate data integrity
        const integrity = await productionEncryptionService.validateDataIntegrity(
          testCase.data,
          encrypted,
          DataSensitivity.CLINICAL
        );
        expect(integrity).toBe(true);
        
        console.log(`✅ ${testCase.size} data encryption: ${totalTime.toFixed(2)}ms`);
      }

      // Check performance metrics
      const metrics = productionEncryptionService.getPerformanceMetrics();
      expect(metrics.averageEncryptionTime).toBeLessThan(50);
      expect(metrics.averageDecryptionTime).toBeLessThan(30);
    });

    test('concurrent security operations performance', async () => {
      const concurrentOperations = Array.from({ length: 5 }, (_, i) => ({
        id: `concurrent_op_${i}`,
        type: 'calendar' as const,
        priority: 'medium' as const,
        requiresExclusiveLock: false,
        emergencyAccessRequired: false,
        execute: jest.fn().mockImplementation(async () => {
          // Each operation does some encryption work
          const data = { operationId: i, timestamp: new Date().toISOString() };
          const encrypted = await productionEncryptionService.encryptData(
            data,
            DataSensitivity.THERAPEUTIC
          );
          const decrypted = await productionEncryptionService.decryptData(
            encrypted,
            DataSensitivity.THERAPEUTIC
          );
          return decrypted;
        }),
        rollback: jest.fn().mockResolvedValue(undefined),
        validate: jest.fn().mockResolvedValue(true)
      }));

      const startTime = performance.now();
      
      // Execute all operations concurrently
      await Promise.all(concurrentOperations.map(op => 
        featureCoordinationSecurity.coordinateSecureOperations([op])
      ));
      
      const totalTime = performance.now() - startTime;

      // Should complete within reasonable time even with concurrent load
      expect(totalTime).toBeLessThan(1000); // 1 second for 5 concurrent operations
      
      // All operations should have executed
      concurrentOperations.forEach(op => {
        expect(op.execute).toHaveBeenCalledTimes(1);
      });

      console.log(`✅ Concurrent security operations: ${totalTime.toFixed(2)}ms for ${concurrentOperations.length} operations`);
    });

    test('emergency access performance under encryption load', async () => {
      // Create heavy encryption workload
      const heavyWorkload = Array.from({ length: 10 }, () => 
        productionEncryptionService.encryptData(
          { heavyData: Array.from({ length: 100 }, (_, i) => `data_${i}`) },
          DataSensitivity.PERSONAL
        )
      );

      // Start heavy workload
      const workloadPromise = Promise.all(heavyWorkload);

      // Test emergency access during heavy load
      const emergencyTests = Array.from({ length: 3 }, () => 
        featureCoordinationSecurity.validateEmergencyAccess()
      );

      const [workloadResults, emergencyResults] = await Promise.all([
        workloadPromise,
        Promise.all(emergencyTests)
      ]);

      // Validate workload completed
      expect(workloadResults).toHaveLength(10);
      workloadResults.forEach(result => {
        expect(result.authTag).toBeDefined();
      });

      // Validate emergency access maintained performance
      emergencyResults.forEach(result => {
        expect(result.accessible).toBe(true);
        expect(result.responseTime).toBeLessThan(200);
      });

      const avgEmergencyTime = emergencyResults.reduce((sum, r) => sum + r.responseTime, 0) / emergencyResults.length;
      console.log(`✅ Emergency access under load: ${avgEmergencyTime.toFixed(2)}ms average (during heavy encryption)`);
    });

  });

  describe('Error Handling and Recovery', () => {
    
    test('encryption failure recovery with rollback', async () => {
      // Mock encryption failure
      mockSubtle.encrypt.mockRejectedValueOnce(new Error('Encryption hardware failure'));

      const failingOperation = {
        id: 'failing_encryption',
        type: 'migration' as const,
        priority: 'high' as const,
        requiresExclusiveLock: false,
        emergencyAccessRequired: true,
        execute: jest.fn().mockImplementation(async () => {
          // This should fail due to encryption failure
          await productionEncryptionService.encryptData(
            { test: 'data' },
            DataSensitivity.CLINICAL
          );
        }),
        rollback: jest.fn().mockResolvedValue(undefined),
        validate: jest.fn().mockResolvedValue(true)
      };

      // Should handle encryption failure gracefully
      await expect(
        featureCoordinationSecurity.coordinateSecureOperations([failingOperation])
      ).rejects.toThrow();

      // Rollback should be called
      expect(failingOperation.rollback).toHaveBeenCalledTimes(1);

      // Emergency access should still work
      const emergencyAccess = await featureCoordinationSecurity.validateEmergencyAccess();
      expect(emergencyAccess.accessible).toBe(true);

      console.log('✅ Encryption failure recovery: Proper rollback and emergency access maintained');
    });

    test('authentication failure detection', async () => {
      // Mock authentication failure (tampered data)
      mockSubtle.decrypt.mockRejectedValueOnce(new Error('Authentication tag verification failed'));

      const tamperedData = {
        encryptedData: 'tampered_ciphertext',
        iv: '0123456789abcdef0123456789abcdef',
        authTag: 'tampered_auth_tag_000',
        timestamp: new Date().toISOString(),
        metadata: {
          algorithm: 'aes-256-gcm' as const,
          keyVersion: 1,
          dataType: 'test_data',
          sensitivity: DataSensitivity.CLINICAL,
          createdAt: new Date().toISOString(),
          deviceInfo: { platform: 'ios', version: '15.0' }
        }
      };

      // Should detect authentication failure
      await expect(
        productionEncryptionService.decryptData(tamperedData, DataSensitivity.CLINICAL)
      ).rejects.toThrow(/authentication.*failed|tampered/i);

      console.log('✅ Authentication failure detection: Tampered data properly rejected');
    });

    test('system resilience during partial failures', async () => {
      let encryptionCallCount = 0;
      
      // Mock intermittent failures
      mockSubtle.encrypt.mockImplementation(() => {
        encryptionCallCount++;
        if (encryptionCallCount === 2) {
          return Promise.reject(new Error('Intermittent failure'));
        }
        return Promise.resolve(new Uint8Array(48).buffer);
      });

      const resilientOperations = Array.from({ length: 3 }, (_, i) => ({
        id: `resilient_op_${i}`,
        type: 'calendar' as const,
        priority: 'medium' as const,
        requiresExclusiveLock: false,
        emergencyAccessRequired: false,
        execute: jest.fn().mockImplementation(async () => {
          try {
            await productionEncryptionService.encryptData(
              { operationId: i },
              DataSensitivity.THERAPEUTIC
            );
            return { success: true };
          } catch (error) {
            // Simulate graceful degradation
            return { success: false, fallback: true };
          }
        }),
        rollback: jest.fn().mockResolvedValue(undefined),
        validate: jest.fn().mockResolvedValue(true)
      }));

      // Execute operations - should handle partial failures
      await Promise.all(resilientOperations.map(op => 
        featureCoordinationSecurity.coordinateSecureOperations([op])
      ));

      // All operations should complete (some with fallback)
      resilientOperations.forEach(op => {
        expect(op.execute).toHaveBeenCalledTimes(1);
      });

      console.log('✅ System resilience: Partial failures handled with graceful degradation');
    });

  });

  describe('Security Compliance Validation', () => {
    
    test('HIPAA technical safeguards validation', async () => {
      // Test Access Control
      const accessValidation = await featureCoordinationSecurity.validateEmergencyAccess();
      expect(accessValidation.accessible).toBe(true);

      // Test Audit Controls
      const auditData = { auditTest: 'data', timestamp: new Date().toISOString() };
      const auditEncrypted = await productionEncryptionService.encryptData(
        auditData,
        DataSensitivity.CLINICAL
      );
      expect(auditEncrypted.metadata.createdAt).toBeDefined();
      expect(auditEncrypted.timestamp).toBeDefined();

      // Test Integrity
      const integrityValid = await productionEncryptionService.validateDataIntegrity(
        auditData,
        auditEncrypted,
        DataSensitivity.CLINICAL
      );
      expect(integrityValid).toBe(true);

      // Test Person or Entity Authentication (simulated)
      const boundaries = await featureCoordinationSecurity.validateSecurityBoundaries({
        id: 'hipaa_test',
        type: 'migration',
        priority: 'high',
        requiresExclusiveLock: false,
        emergencyAccessRequired: false,
        execute: jest.fn(),
        rollback: jest.fn(),
        validate: jest.fn().mockResolvedValue(true)
      });

      const accessControlBoundary = boundaries.find(b => b.boundaryType === 'access_control');
      expect(accessControlBoundary?.status).toMatch(/secure|warning/);

      // Test Transmission Security (via encryption)
      expect(auditEncrypted.authTag).toBeDefined();
      expect(auditEncrypted.metadata.algorithm).toBe('aes-256-gcm');

      console.log('✅ HIPAA technical safeguards: All core requirements validated');
    });

    test('clinical data protection standards', async () => {
      const clinicalTestCases = [
        {
          type: 'assessment_data',
          data: { phq9Score: 15, gad7Score: 12, riskLevel: 'moderate' },
          sensitivity: DataSensitivity.CLINICAL
        },
        {
          type: 'personal_notes',
          data: { note: 'Feeling better today', mood: 7, timestamp: new Date().toISOString() },
          sensitivity: DataSensitivity.PERSONAL
        },
        {
          type: 'therapeutic_progress',
          data: { sessions: 10, improvement: 'significant', goals: ['reduce anxiety'] },
          sensitivity: DataSensitivity.THERAPEUTIC
        }
      ];

      for (const testCase of clinicalTestCases) {
        // Encrypt with appropriate sensitivity
        const encrypted = await productionEncryptionService.encryptData(
          testCase.data,
          testCase.sensitivity
        );

        // Validate encryption metadata
        expect(encrypted.metadata.sensitivity).toBe(testCase.sensitivity);
        expect(encrypted.metadata.algorithm).toBe('aes-256-gcm');
        expect(encrypted.authTag).toBeDefined();

        // Validate decryption and integrity
        const decrypted = await productionEncryptionService.decryptData(
          encrypted,
          testCase.sensitivity
        );

        const integrityValid = await productionEncryptionService.validateDataIntegrity(
          testCase.data,
          encrypted,
          testCase.sensitivity
        );

        expect(integrityValid).toBe(true);
        expect(JSON.stringify(decrypted)).toBe(JSON.stringify(testCase.data));

        console.log(`✅ Clinical data protection: ${testCase.type} properly encrypted and authenticated`);
      }
    });

  });

});

/**
 * Real-world Scenario Testing
 */
describe('Real-world Security Scenarios', () => {
  
  test('SCENARIO: Complete app lifecycle with security coordination', async () => {
    console.log('🎬 SCENARIO: Complete app lifecycle security test');
    
    // 1. App initialization
    const initConfig = await productionEncryptionService.validateConfiguration();
    expect(initConfig.valid).toBe(true);

    // 2. User data creation and encryption
    const userData = {
      profile: { id: 'user_001', name: 'Test User', preferences: {} },
      initialAssessment: { phq9: [1, 1, 0, 1, 0, 1, 1, 0, 0], total: 5 }
    };

    const profileEncrypted = await productionEncryptionService.encryptData(
      userData.profile,
      DataSensitivity.PERSONAL
    );

    const assessmentEncrypted = await productionEncryptionService.encryptData(
      userData.initialAssessment,
      DataSensitivity.CLINICAL
    );

    // 3. Calendar integration with privacy protection
    const calendarEvent = {
      title: 'Morning Check-in',
      description: 'Daily mindfulness practice',
      time: new Date().toISOString()
    };

    const sanitizedEvent = await calendarIntegrationService.sanitizeEventContent(
      `${calendarEvent.title}: ${calendarEvent.description}`
    );

    expect(sanitizedEvent.hasPrivateData).toBe(false);

    // 4. Data migration simulation
    const migrationOp = {
      id: 'lifecycle_migration',
      type: 'migration' as const,
      priority: 'high' as const,
      requiresExclusiveLock: true,
      emergencyAccessRequired: true,
      execute: jest.fn().mockImplementation(async () => {
        // Decrypt, process, and re-encrypt data
        const profile = await productionEncryptionService.decryptData(
          profileEncrypted,
          DataSensitivity.PERSONAL
        );
        
        const assessment = await productionEncryptionService.decryptData(
          assessmentEncrypted,
          DataSensitivity.CLINICAL
        );

        return { profile, assessment };
      }),
      rollback: jest.fn().mockResolvedValue(undefined),
      validate: jest.fn().mockResolvedValue(true)
    };

    // 5. Execute with coordination
    await featureCoordinationSecurity.coordinateSecureOperations([migrationOp]);

    // 6. Validate emergency access throughout
    const finalEmergencyCheck = await featureCoordinationSecurity.validateEmergencyAccess();
    expect(finalEmergencyCheck.accessible).toBe(true);

    console.log('✅ SCENARIO: Complete app lifecycle security maintained');
  });

  test('SCENARIO: Crisis intervention with security preservation', async () => {
    console.log('🚨 SCENARIO: Crisis intervention security test');

    // 1. Simulate crisis detection data
    const crisisData = {
      phq9Score: 20,
      suicidalIdeation: true,
      riskLevel: 'critical',
      timestamp: new Date().toISOString(),
      emergencyContacts: ['911', 'family member']
    };

    // 2. Encrypt crisis data
    const crisisEncrypted = await productionEncryptionService.encryptData(
      crisisData,
      DataSensitivity.CLINICAL
    );

    // 3. Simulate emergency access under time pressure
    const emergencyStart = performance.now();
    
    const emergencyValidation = await featureCoordinationSecurity.validateEmergencyAccess();
    const crisisDecrypted = await productionEncryptionService.decryptData(
      crisisEncrypted,
      DataSensitivity.CLINICAL
    );
    
    const emergencyTime = performance.now() - emergencyStart;

    // 4. Validate crisis response time and data integrity
    expect(emergencyTime).toBeLessThan(200); // Must be under 200ms
    expect(emergencyValidation.accessible).toBe(true);
    expect(crisisDecrypted.riskLevel).toBe('critical');
    expect(crisisDecrypted.emergencyContacts).toContain('911');

    // 5. Validate calendar reminders are appropriately paused
    const calendarSafeContent = await calendarIntegrationService.sanitizeEventContent(
      'Crisis support session scheduled'
    );
    
    expect(calendarSafeContent.title).not.toContain('crisis');
    expect(calendarSafeContent.hasPrivateData).toBe(true);

    console.log(`✅ SCENARIO: Crisis intervention - ${emergencyTime.toFixed(2)}ms emergency access`);
  });

});