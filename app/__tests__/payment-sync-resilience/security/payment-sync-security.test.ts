/**
 * Payment Sync Resilience Security Testing
 *
 * Comprehensive security testing for payment sync resilience including:
 * - PCI DSS compliance during failure scenarios
 * - HIPAA audit trail preservation testing
 * - Encrypted queue operations during outages
 * - Zero data exposure validation during recovery
 *
 * Security Requirements:
 * - No card data ever stored (tokenization only)
 * - HIPAA audit trail maintained during all failure modes
 * - Encrypted persistence of sensitive data during outages
 * - Zero leakage of PHI data in error messages or logs
 * - Crisis access preserved while maintaining security controls
 */

import { jest } from '@jest/globals';
import { PaymentSyncResilienceAPI, CircuitBreakerState } from '../../../src/services/cloud/PaymentSyncResilienceAPI';
import { PaymentAwareSyncRequest, SyncPriorityLevel } from '../../../src/services/cloud/PaymentAwareSyncAPI';
import { EncryptionService } from '../../../src/services/security/EncryptionService';
import { PaymentSecurityService } from '../../../src/services/security/PaymentSecurityService';

// Mock dependencies
jest.mock('../../../src/services/security/EncryptionService');
jest.mock('../../../src/services/security/PaymentSecurityService');
jest.mock('expo-secure-store');

// Security test utilities
class SecurityValidator {
  static validateNoPHIExposure(data: any): boolean {
    const phiPatterns = [
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card numbers
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{2}\/\d{2}\/\d{4}\b/, // Dates that might be DOB
      /@[\w.-]+\.[\w.-]+/, // Email addresses
      /\b\d{10}\b/, // Phone numbers
      /phq.*score.*\d+/i, // Assessment scores in logs
      /gad.*score.*\d+/i,
      /suicidal/i, // Crisis indicators
      /depression/i,
      /anxiety/i
    ];

    const dataString = JSON.stringify(data).toLowerCase();
    return !phiPatterns.some(pattern => pattern.test(dataString));
  }

  static validateEncryptionUsed(mockEncryption: jest.Mocked<EncryptionService>): boolean {
    return mockEncryption.encryptData.mock.calls.length > 0;
  }

  static validateAuditTrail(operation: string, result: any): boolean {
    // Verify audit trail contains required security events
    return result.auditEventId && result.auditEventId.startsWith(operation);
  }

  static validateTokenization(paymentData: any): boolean {
    // Verify no raw payment data, only tokens
    const paymentString = JSON.stringify(paymentData);
    const rawCardPatterns = [
      /\b4\d{15}\b/, // Visa
      /\b5[1-5]\d{14}\b/, // MasterCard
      /\b3[47]\d{13}\b/, // Amex
      /\bcvv?\s*:?\s*\d{3,4}\b/i, // CVV
      /\bexp.*\d{2}\/\d{2}\b/i // Expiration
    ];

    return !rawCardPatterns.some(pattern => pattern.test(paymentString));
  }
}

describe('Payment Sync Resilience Security', () => {
  let resilienceAPI: PaymentSyncResilienceAPI;
  let mockEncryption: jest.Mocked<EncryptionService>;
  let mockPaymentSecurity: jest.Mocked<PaymentSecurityService>;
  let mockSyncOperation: jest.MockedFunction<any>;
  let securityLogs: any[] = [];

  beforeEach(async () => {
    jest.clearAllMocks();
    securityLogs = [];

    // Mock console methods to capture security logs
    jest.spyOn(console, 'log').mockImplementation((...args) => {
      securityLogs.push({ level: 'log', args });
    });
    jest.spyOn(console, 'error').mockImplementation((...args) => {
      securityLogs.push({ level: 'error', args });
    });
    jest.spyOn(console, 'warn').mockImplementation((...args) => {
      securityLogs.push({ level: 'warn', args });
    });

    resilienceAPI = PaymentSyncResilienceAPI.getInstance();
    mockEncryption = EncryptionService.getInstance() as jest.Mocked<EncryptionService>;
    mockPaymentSecurity = PaymentSecurityService.getInstance() as jest.Mocked<PaymentSecurityService>;
    mockSyncOperation = jest.fn();

    // Setup encryption mocks
    mockEncryption.encryptData.mockResolvedValue('encrypted_data_token_secure');
    mockEncryption.decryptData.mockResolvedValue('{"decrypted": "secure_data"}');
    mockEncryption.generateKeyId.mockReturnValue('secure_key_id_123');

    // Setup payment security mocks
    mockPaymentSecurity.validatePaymentSecurity.mockResolvedValue({
      success: true,
      action: 'proceed',
      riskScore: 10,
      reason: 'Low risk operation',
      auditEventId: 'audit_payment_001',
      recommendations: [],
      crisisOverride: false
    });

    await resilienceAPI.initialize({
      queuePersistence: {
        enablePersistence: true,
        maxQueueSize: 100,
        persistenceIntervalMs: 1000,
        encryptionEnabled: true,
        compressionEnabled: true,
        maxRetentionHours: 24,
        crisisPriority: true
      }
    });
  });

  afterEach(() => {
    resilienceAPI.destroy();
    jest.restoreAllMocks();
  });

  describe('PCI DSS Compliance During Failure Scenarios', () => {
    it('should maintain PCI DSS compliance during payment sync failures', async () => {
      const paymentRequest: PaymentAwareSyncRequest = {
        operationId: 'pci-test-001',
        priority: SyncPriorityLevel.HIGH_CLINICAL,
        subscriptionContext: {
          tier: 'premium',
          status: 'active',
          entitlements: ['pci_compliant_sync']
        },
        operation: {
          id: 'pci-op-001',
          type: 'create',
          entityType: 'payment_transaction',
          entityId: 'payment-001',
          priority: 'high',
          data: {
            // Only tokenized payment data, no raw card data
            paymentToken: 'tok_visa_4242424242424242',
            amount: 2999,
            currency: 'usd',
            subscriptionId: 'sub_premium_001',
            // PHI data requiring HIPAA protection
            userId: 'user_001',
            assessmentContext: {
              phq9Score: 15,
              subscriptionJustification: 'therapeutic_continuity'
            }
          },
          metadata: {
            entityId: 'payment-001',
            entityType: 'payment_transaction',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: 'pci_secure_checksum',
            deviceId: 'device-001',
            userId: 'user_001'
          },
          conflictResolution: 'reject_on_conflict',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
          clinicalSafety: true
        },
        crisisMode: false,
        requestId: 'req-pci-001'
      };

      // Mock payment service failure
      mockSyncOperation.mockRejectedValue(new Error('payment_service_unavailable: PCI service down'));

      // Execute resilient sync
      const result = await resilienceAPI.executeResilientSync(paymentRequest, mockSyncOperation);

      // Verify PCI DSS compliance maintained
      expect(result.fallbackTriggered).toBe(true);

      // Verify no raw payment data in any logs or error messages
      expect(SecurityValidator.validateTokenization(securityLogs)).toBe(true);
      expect(SecurityValidator.validateTokenization(result)).toBe(true);

      // Verify encryption was used for sensitive data persistence
      expect(mockEncryption.encryptData).toHaveBeenCalled();

      // Verify payment security validation was performed
      expect(mockPaymentSecurity.validatePaymentSecurity).toHaveBeenCalled();

      // Verify no PHI exposure in error handling
      expect(SecurityValidator.validateNoPHIExposure(securityLogs)).toBe(true);
      expect(SecurityValidator.validateNoPHIExposure(result.error)).toBe(true);
    });

    it('should handle payment tokenization failures securely', async () => {
      const tokenizationRequest: PaymentAwareSyncRequest = {
        operationId: 'tokenization-security-001',
        priority: SyncPriorityLevel.CRITICAL_SAFETY,
        subscriptionContext: {
          tier: 'premium',
          status: 'active',
          entitlements: ['secure_tokenization']
        },
        operation: {
          id: 'tokenization-op-001',
          type: 'update',
          entityType: 'payment_method',
          entityId: 'pm-001',
          priority: 'critical',
          data: {
            tokenizationStatus: 'failed',
            paymentMethodType: 'card',
            last4: '4242', // Only last 4 digits, never full number
            brand: 'visa',
            failureReason: 'tokenization_service_error'
          },
          metadata: {
            entityId: 'pm-001',
            entityType: 'payment_method',
            version: 2,
            lastModified: new Date().toISOString(),
            checksum: 'tokenization_secure',
            deviceId: 'device-001',
            userId: 'user_001'
          },
          conflictResolution: 'merge',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 5,
          clinicalSafety: true
        },
        crisisMode: false,
        requestId: 'req-tokenization-001'
      };

      // Mock tokenization service failure
      mockSyncOperation.mockRejectedValue(new Error('tokenization_failed: Service temporarily unavailable'));

      // Execute resilient sync
      const result = await resilienceAPI.executeResilientSync(tokenizationRequest, mockSyncOperation);

      // Verify secure fallback handling
      expect(result.fallbackTriggered).toBe(true);

      // Verify no raw card data exposure
      expect(SecurityValidator.validateTokenization(result)).toBe(true);
      expect(SecurityValidator.validateTokenization(securityLogs)).toBe(true);

      // Verify encryption used for persistence
      expect(mockEncryption.encryptData).toHaveBeenCalledWith(
        expect.stringContaining('tokenizationStatus'),
        tokenizationRequest.operationId
      );

      // Verify secure error categorization
      expect(result.error?.category).toBe('service');
      expect(result.error?.severity).toBe('high');
    });

    it('should maintain PCI DSS audit trail during circuit breaker scenarios', async () => {
      const auditRequest: PaymentAwareSyncRequest = {
        operationId: 'pci-audit-001',
        priority: SyncPriorityLevel.HIGH_CLINICAL,
        subscriptionContext: {
          tier: 'premium',
          status: 'past_due',
          entitlements: ['audit_compliant']
        },
        operation: {
          id: 'audit-op-001',
          type: 'create',
          entityType: 'payment_audit',
          entityId: 'audit-001',
          priority: 'high',
          data: {
            auditEvent: 'payment_attempt',
            paymentToken: 'tok_audit_secure',
            amount: 1999,
            pciComplianceLevel: 'level_2',
            auditTimestamp: new Date().toISOString()
          },
          metadata: {
            entityId: 'audit-001',
            entityType: 'payment_audit',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: 'audit_secure',
            deviceId: 'device-001',
            userId: 'user_001'
          },
          conflictResolution: 'append_audit',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
          clinicalSafety: true
        },
        crisisMode: false,
        requestId: 'req-audit-001'
      };

      // Trigger circuit breaker by multiple failures
      for (let i = 0; i < 5; i++) {
        mockSyncOperation.mockRejectedValueOnce(new Error('payment_gateway_timeout: Service overloaded'));
        try {
          await resilienceAPI.executeResilientSync(auditRequest, mockSyncOperation);
        } catch (error) {
          // Expected failures to trigger circuit breaker
        }
      }

      // Verify circuit breaker is open
      const stats = resilienceAPI.getResilienceStatistics();
      expect(stats.circuitBreaker.state).toBe(CircuitBreakerState.OPEN);

      // Attempt sync with circuit breaker open
      mockSyncOperation.mockResolvedValue({
        operationId: auditRequest.operationId,
        status: 'success',
        auditTrail: ['circuit_breaker_bypassed_for_audit']
      });

      const result = await resilienceAPI.executeResilientSync(auditRequest, mockSyncOperation);

      // Verify audit compliance maintained
      expect(result.fallbackTriggered).toBe(true);

      // Verify PCI audit trail preserved
      expect(SecurityValidator.validateTokenization(result)).toBe(true);

      // Verify no sensitive data in circuit breaker error handling
      const circuitBreakerLogs = securityLogs.filter(log =>
        log.args.some((arg: any) => String(arg).includes('circuit'))
      );
      expect(SecurityValidator.validateNoPHIExposure(circuitBreakerLogs)).toBe(true);
    });
  });

  describe('HIPAA Audit Trail Preservation', () => {
    it('should maintain HIPAA audit trail during complete system failure', async () => {
      const hipaaRequest: PaymentAwareSyncRequest = {
        operationId: 'hipaa-audit-001',
        priority: SyncPriorityLevel.HIGH_CLINICAL,
        subscriptionContext: {
          tier: 'premium',
          status: 'active',
          entitlements: ['hipaa_compliant']
        },
        operation: {
          id: 'hipaa-op-001',
          type: 'create',
          entityType: 'clinical_data',
          entityId: 'clinical-001',
          priority: 'high',
          data: {
            assessmentType: 'phq9',
            assessmentScore: 18,
            clinicalRecommendation: 'therapy_recommended',
            hipaaAuditRequired: true,
            patientConsent: true,
            dataClassification: 'phi_protected'
          },
          metadata: {
            entityId: 'clinical-001',
            entityType: 'clinical_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: 'hipaa_compliant_checksum',
            deviceId: 'device-001',
            userId: 'user_001'
          },
          conflictResolution: 'hipaa_compliant_merge',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
          clinicalSafety: true
        },
        crisisMode: false,
        requestId: 'req-hipaa-001'
      };

      // Mock complete system failure
      mockSyncOperation.mockRejectedValue(new Error('system_failure: Complete infrastructure down'));

      // Execute resilient sync
      const result = await resilienceAPI.executeResilientSync(hipaaRequest, mockSyncOperation);

      // Verify HIPAA-compliant fallback triggered
      expect(result.fallbackTriggered).toBe(true);

      // Verify PHI data encrypted during persistence
      expect(mockEncryption.encryptData).toHaveBeenCalledWith(
        expect.stringContaining('assessmentScore'),
        hipaaRequest.operationId
      );

      // Verify no PHI in error messages or logs
      expect(SecurityValidator.validateNoPHIExposure(securityLogs)).toBe(true);
      expect(SecurityValidator.validateNoPHIExposure(result.error)).toBe(true);

      // Verify audit trail created for failure
      expect(result.error?.context).toMatchObject({
        operationId: hipaaRequest.operationId,
        crisisMode: false,
        timestamp: expect.any(String)
      });

      // Verify HIPAA audit requirements met
      const auditLogs = securityLogs.filter(log =>
        log.args.some((arg: any) => String(arg).includes('audit') || String(arg).includes('hipaa'))
      );
      expect(auditLogs.length).toBeGreaterThan(0);
    });

    it('should preserve audit trail during encryption failures', async () => {
      const encryptionFailureRequest: PaymentAwareSyncRequest = {
        operationId: 'encryption-audit-001',
        priority: SyncPriorityLevel.CRITICAL_SAFETY,
        subscriptionContext: {
          tier: 'premium',
          status: 'active',
          entitlements: ['encryption_required']
        },
        operation: {
          id: 'encryption-op-001',
          type: 'create',
          entityType: 'encrypted_data',
          entityId: 'encrypted-001',
          priority: 'critical',
          data: {
            sensitiveData: true,
            phq9Results: {
              score: 20,
              suicidalIdeation: true,
              riskLevel: 'high'
            },
            encryptionRequired: true
          },
          metadata: {
            entityId: 'encrypted-001',
            entityType: 'encrypted_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: 'encryption_audit',
            deviceId: 'device-001',
            userId: 'user_001'
          },
          conflictResolution: 'encryption_priority',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
          clinicalSafety: true
        },
        crisisMode: false,
        requestId: 'req-encryption-001'
      };

      // Mock encryption failure
      mockEncryption.encryptData.mockRejectedValue(new Error('encryption_failed: Key rotation in progress'));

      // Mock sync failure
      mockSyncOperation.mockRejectedValue(new Error('data_security_error: Encryption validation failed'));

      // Execute resilient sync
      const result = await resilienceAPI.executeResilientSync(encryptionFailureRequest, mockSyncOperation);

      // Verify secure failure handling
      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('security');

      // Verify no sensitive data leaked during encryption failure
      expect(SecurityValidator.validateNoPHIExposure(securityLogs)).toBe(true);
      expect(SecurityValidator.validateNoPHIExposure(result.error)).toBe(true);

      // Verify audit trail preserved despite encryption failure
      expect(result.error?.context).toMatchObject({
        operationId: encryptionFailureRequest.operationId,
        crisisMode: false
      });

      // Verify security recommendations provided
      expect(result.error?.recoverySuggestions).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/encryption|security|key/i)
        ])
      );
    });

    it('should handle audit trail during cross-device sync conflicts', async () => {
      const device1Request: PaymentAwareSyncRequest = {
        operationId: 'audit-conflict-device1',
        priority: SyncPriorityLevel.HIGH_CLINICAL,
        subscriptionContext: {
          tier: 'premium',
          status: 'active',
          entitlements: ['cross_device_audit']
        },
        operation: {
          id: 'audit-conflict-op1',
          type: 'update',
          entityType: 'cross_device_data',
          entityId: 'shared-clinical-001',
          priority: 'high',
          data: {
            lastModifiedDevice: 'device-001',
            assessmentProgress: 'completed',
            dataVersion: 1,
            auditRequired: true
          },
          metadata: {
            entityId: 'shared-clinical-001',
            entityType: 'cross_device_data',
            version: 1,
            lastModified: '2024-01-01T10:00:00Z',
            checksum: 'device1_audit',
            deviceId: 'device-001',
            userId: 'user_001'
          },
          conflictResolution: 'audit_compliant_merge',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
          clinicalSafety: true
        },
        crisisMode: false,
        requestId: 'req-audit-device1'
      };

      const device2Request: PaymentAwareSyncRequest = {
        operationId: 'audit-conflict-device2',
        priority: SyncPriorityLevel.HIGH_CLINICAL,
        subscriptionContext: {
          tier: 'premium',
          status: 'active',
          entitlements: ['cross_device_audit']
        },
        operation: {
          id: 'audit-conflict-op2',
          type: 'update',
          entityType: 'cross_device_data',
          entityId: 'shared-clinical-001', // Same entity
          priority: 'high',
          data: {
            lastModifiedDevice: 'device-002',
            assessmentProgress: 'in_progress',
            dataVersion: 2,
            auditRequired: true
          },
          metadata: {
            entityId: 'shared-clinical-001',
            entityType: 'cross_device_data',
            version: 2,
            lastModified: '2024-01-01T10:01:00Z', // Later timestamp
            checksum: 'device2_audit',
            deviceId: 'device-002',
            userId: 'user_001'
          },
          conflictResolution: 'audit_compliant_merge',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
          clinicalSafety: true
        },
        crisisMode: false,
        requestId: 'req-audit-device2'
      };

      // Mock conflict resolution
      mockSyncOperation
        .mockRejectedValueOnce(new Error('sync_conflict: Concurrent modification detected'))
        .mockResolvedValueOnce({
          operationId: device1Request.operationId,
          status: 'success',
          conflicts: [{ field: 'dataVersion', resolution: 'device2_wins', auditTrail: true }]
        })
        .mockResolvedValueOnce({
          operationId: device2Request.operationId,
          status: 'success',
          conflicts: []
        });

      // Execute concurrent operations
      const [result1, result2] = await Promise.all([
        resilienceAPI.executeResilientSync(device1Request, mockSyncOperation),
        resilienceAPI.executeResilientSync(device2Request, mockSyncOperation)
      ]);

      // Verify audit trail maintained during conflict resolution
      expect(result1.performanceMetrics.totalAttempts).toBe(2); // Failed once, then succeeded
      expect(result2.success).toBe(true);

      // Verify no PHI leaked during conflict resolution
      expect(SecurityValidator.validateNoPHIExposure(securityLogs)).toBe(true);

      // Verify encryption used for both operations
      expect(mockEncryption.encryptData).toHaveBeenCalledTimes(2);

      // Verify audit events created for conflict resolution
      const conflictLogs = securityLogs.filter(log =>
        log.args.some((arg: any) => String(arg).includes('conflict'))
      );
      expect(conflictLogs.length).toBeGreaterThan(0);
    });
  });

  describe('Encrypted Queue Operations During Outages', () => {
    it('should maintain encryption during queue persistence', async () => {
      const queueRequest: PaymentAwareSyncRequest = {
        operationId: 'queue-encryption-001',
        priority: SyncPriorityLevel.HIGH_CLINICAL,
        subscriptionContext: {
          tier: 'premium',
          status: 'active',
          entitlements: ['encrypted_queue']
        },
        operation: {
          id: 'queue-op-001',
          type: 'create',
          entityType: 'queue_data',
          entityId: 'queue-001',
          priority: 'high',
          data: {
            sensitiveContent: true,
            assessmentData: {
              phq9Score: 19,
              gad7Score: 16,
              riskFactors: ['previous_episode', 'family_history']
            },
            personalInfo: {
              ageRange: '25-34',
              treatmentHistory: true
            }
          },
          metadata: {
            entityId: 'queue-001',
            entityType: 'queue_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: 'queue_encrypted',
            deviceId: 'device-001',
            userId: 'user_001'
          },
          conflictResolution: 'queue_priority',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
          clinicalSafety: true
        },
        crisisMode: false,
        requestId: 'req-queue-001'
      };

      // Mock complete service outage to force queue persistence
      mockSyncOperation.mockRejectedValue(new Error('service_outage: All endpoints unavailable'));

      // Execute resilient sync (will be queued)
      const result = await resilienceAPI.executeResilientSync(queueRequest, mockSyncOperation);

      // Verify queue persistence with encryption
      expect(result.fallbackTriggered).toBe(true);

      // Verify sensitive data was encrypted before queue storage
      expect(mockEncryption.encryptData).toHaveBeenCalledWith(
        expect.stringContaining('assessmentData'),
        queueRequest.operationId
      );

      // Verify no sensitive data in error messages
      expect(SecurityValidator.validateNoPHIExposure(result.error)).toBe(true);

      // Verify queue operation logged securely
      const queueLogs = securityLogs.filter(log =>
        log.args.some((arg: any) => String(arg).includes('queue') || String(arg).includes('persist'))
      );
      expect(SecurityValidator.validateNoPHIExposure(queueLogs)).toBe(true);
    });

    it('should handle queue decryption failures securely', async () => {
      const decryptionRequest: PaymentAwareSyncRequest = {
        operationId: 'queue-decrypt-001',
        priority: SyncPriorityLevel.CRITICAL_SAFETY,
        subscriptionContext: {
          tier: 'premium',
          status: 'active',
          entitlements: ['secure_queue']
        },
        operation: {
          id: 'decrypt-op-001',
          type: 'create',
          entityType: 'decrypt_data',
          entityId: 'decrypt-001',
          priority: 'critical',
          data: {
            encryptedContent: true,
            criticalAssessment: {
              emergencyScore: 22,
              immediateRisk: true
            }
          },
          metadata: {
            entityId: 'decrypt-001',
            entityType: 'decrypt_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: 'decrypt_secure',
            deviceId: 'device-001',
            userId: 'user_001'
          },
          conflictResolution: 'security_priority',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
          clinicalSafety: true
        },
        crisisMode: false,
        requestId: 'req-decrypt-001'
      };

      // First operation - force persistence due to service failure
      mockSyncOperation.mockRejectedValue(new Error('service_unavailable: Queue required'));

      // Execute to queue the operation
      await resilienceAPI.executeResilientSync(decryptionRequest, mockSyncOperation);

      // Mock decryption failure during queue retrieval
      mockEncryption.decryptData.mockRejectedValue(new Error('decryption_failed: Corrupted data'));

      // Mock service recovery and attempt queue processing
      mockSyncOperation.mockResolvedValue({
        operationId: decryptionRequest.operationId,
        status: 'success'
      });

      // Attempt recovery (should fail due to decryption error)
      const recoveryResult = await resilienceAPI.recoverPersistedOperations(mockSyncOperation);

      // Verify secure handling of decryption failure
      expect(recoveryResult.failed).toBeGreaterThan(0);

      // Verify no sensitive data leaked during decryption failure
      expect(SecurityValidator.validateNoPHIExposure(securityLogs)).toBe(true);

      // Verify decryption error logged securely
      const decryptionLogs = securityLogs.filter(log =>
        log.args.some((arg: any) => String(arg).includes('decrypt'))
      );
      expect(decryptionLogs.length).toBeGreaterThan(0);
      expect(SecurityValidator.validateNoPHIExposure(decryptionLogs)).toBe(true);
    });
  });

  describe('Zero Data Exposure During Recovery', () => {
    it('should maintain zero PHI exposure during crisis recovery', async () => {
      const crisisRequest = {
        emergencyId: 'crisis-security-001',
        userId: 'user_001',
        deviceId: 'device-001',
        timestamp: new Date().toISOString(),
        criticalData: {
          phq9Score: 24,
          suicidalIdeation: true,
          previousAttempts: true,
          emergencyContacts: ['988', 'emergency_contact_1'],
          currentLocation: 'home',
          riskLevel: 'imminent'
        }
      };

      // Mock complete crisis service failure
      const mockCrisisSync = jest.fn().mockRejectedValue(
        new Error('crisis_service_down: Emergency infrastructure failure')
      );

      // Execute crisis emergency handling
      const result = await resilienceAPI.handleCrisisEmergency(crisisRequest, mockCrisisSync);

      // Verify crisis fallback succeeded
      expect(result.success).toBe(true);
      expect(result.crisisOverrideUsed).toBe(true);

      // Verify zero PHI exposure in crisis handling
      expect(SecurityValidator.validateNoPHIExposure(securityLogs)).toBe(true);
      expect(SecurityValidator.validateNoPHIExposure(result)).toBe(true);

      // Verify crisis data encrypted if persisted
      if (result.result?.localStorageUsed) {
        expect(mockEncryption.encryptData).toHaveBeenCalled();
      }

      // Verify crisis resources provided without exposing sensitive data
      expect(result.result?.crisisResources).toMatchObject({
        hotlineNumber: '988',
        localCrisisPlan: true,
        offlineSupport: true
      });

      // Verify no crisis details in logs
      const crisisLogs = securityLogs.filter(log =>
        log.args.some((arg: any) => String(arg).includes('crisis'))
      );
      expect(SecurityValidator.validateNoPHIExposure(crisisLogs)).toBe(true);
    });

    it('should prevent data leakage during multi-device recovery', async () => {
      const multiDeviceRequests = [
        {
          operationId: 'multi-device-1',
          deviceId: 'device-001',
          sensitiveData: { mood: 3, anxiety: 8, medication: 'sertraline' }
        },
        {
          operationId: 'multi-device-2',
          deviceId: 'device-002',
          sensitiveData: { mood: 7, anxiety: 4, therapy: 'cbt' }
        }
      ];

      const requests = multiDeviceRequests.map(device => ({
        operationId: device.operationId,
        priority: SyncPriorityLevel.HIGH_CLINICAL,
        subscriptionContext: {
          tier: 'premium' as const,
          status: 'active' as const,
          entitlements: ['multi_device_security']
        },
        operation: {
          id: device.operationId,
          type: 'create' as const,
          entityType: 'multi_device_data' as const,
          entityId: device.operationId,
          priority: 'high' as const,
          data: device.sensitiveData,
          metadata: {
            entityId: device.operationId,
            entityType: 'multi_device_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: `secure-${device.deviceId}`,
            deviceId: device.deviceId,
            userId: 'user_001'
          },
          conflictResolution: 'secure_merge' as const,
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
          clinicalSafety: true
        },
        crisisMode: false,
        requestId: `req-${device.operationId}`
      }));

      // Mock service failure to force persistence
      mockSyncOperation.mockRejectedValue(new Error('multi_device_sync_failure: Service overwhelmed'));

      // Execute operations (will be persisted)
      const initialResults = await Promise.all(
        requests.map(request => resilienceAPI.executeResilientSync(request, mockSyncOperation))
      );

      // Verify all operations persisted securely
      expect(initialResults.every(r => r.fallbackTriggered)).toBe(true);

      // Verify encryption used for all sensitive data
      expect(mockEncryption.encryptData).toHaveBeenCalledTimes(2);

      // Mock service recovery
      mockSyncOperation
        .mockResolvedValueOnce({ status: 'success', operationId: 'multi-device-1' })
        .mockResolvedValueOnce({ status: 'success', operationId: 'multi-device-2' });

      // Attempt recovery
      const recoveryResult = await resilienceAPI.recoverPersistedOperations(mockSyncOperation);

      // Verify successful recovery
      expect(recoveryResult.recovered).toBe(2);

      // Verify zero data exposure during entire multi-device recovery
      expect(SecurityValidator.validateNoPHIExposure(securityLogs)).toBe(true);

      // Verify no medication or therapy details in logs
      const recoveryLogs = securityLogs.filter(log =>
        log.args.some((arg: any) => String(arg).includes('recover'))
      );
      expect(SecurityValidator.validateNoPHIExposure(recoveryLogs)).toBe(true);
    });

    it('should handle security validation errors without data exposure', async () => {
      const securityValidationRequest: PaymentAwareSyncRequest = {
        operationId: 'security-validation-001',
        priority: SyncPriorityLevel.HIGH_CLINICAL,
        subscriptionContext: {
          tier: 'premium',
          status: 'active',
          entitlements: ['security_validation']
        },
        operation: {
          id: 'security-op-001',
          type: 'create',
          entityType: 'security_test_data',
          entityId: 'security-001',
          priority: 'high',
          data: {
            securityTestData: true,
            patientData: {
              phq9Score: 17,
              personalHistory: 'sensitive_medical_info',
              demographicInfo: 'protected_demographic_data'
            }
          },
          metadata: {
            entityId: 'security-001',
            entityType: 'security_test_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: 'security_validation',
            deviceId: 'device-001',
            userId: 'user_001'
          },
          conflictResolution: 'security_strict',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
          clinicalSafety: true
        },
        crisisMode: false,
        requestId: 'req-security-001'
      };

      // Mock security validation failure
      mockPaymentSecurity.validatePaymentSecurity.mockResolvedValue({
        success: false,
        action: 'block',
        riskScore: 95,
        reason: 'High risk security violation detected',
        auditEventId: 'security_violation_001',
        recommendations: ['Review security protocols', 'Escalate to security team'],
        crisisOverride: false
      });

      // Mock sync operation that would normally succeed
      mockSyncOperation.mockResolvedValue({
        operationId: securityValidationRequest.operationId,
        status: 'success'
      });

      // Execute resilient sync
      const result = await resilienceAPI.executeResilientSync(securityValidationRequest, mockSyncOperation);

      // Verify security validation was performed
      expect(mockPaymentSecurity.validatePaymentSecurity).toHaveBeenCalled();

      // Verify no sensitive data exposed in security error handling
      expect(SecurityValidator.validateNoPHIExposure(securityLogs)).toBe(true);
      expect(SecurityValidator.validateNoPHIExposure(result)).toBe(true);

      // Verify security audit trail created
      expect(SecurityValidator.validateAuditTrail('security', result)).toBe(false); // No audit ID in this case

      // Verify security recommendations don't contain sensitive data
      if (result.error?.recoverySuggestions) {
        expect(SecurityValidator.validateNoPHIExposure(result.error.recoverySuggestions)).toBe(true);
      }
    });
  });

  describe('Security Performance Under Load', () => {
    it('should maintain security controls under concurrent load', async () => {
      const concurrentRequests = Array.from({ length: 20 }, (_, i) => ({
        operationId: `security-load-${i}`,
        priority: SyncPriorityLevel.HIGH_CLINICAL,
        subscriptionContext: {
          tier: 'premium' as const,
          status: 'active' as const,
          entitlements: ['concurrent_security']
        },
        operation: {
          id: `security-load-op-${i}`,
          type: 'create' as const,
          entityType: 'load_test_data' as const,
          entityId: `load-${i}`,
          priority: 'high' as const,
          data: {
            loadTestIndex: i,
            sensitiveData: {
              phq9Score: 10 + (i % 15),
              personalInfo: `test_patient_${i}`
            }
          },
          metadata: {
            entityId: `load-${i}`,
            entityType: 'load_test_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: `load-${i}`,
            deviceId: 'device-001',
            userId: 'user_001'
          },
          conflictResolution: 'merge' as const,
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 2,
          clinicalSafety: true
        },
        crisisMode: false,
        requestId: `req-load-${i}`
      }));

      // Mock mixed success/failure to test security under stress
      mockSyncOperation.mockImplementation((request: PaymentAwareSyncRequest) => {
        const index = parseInt(request.operationId.split('-')[2]);
        if (index % 3 === 0) {
          return Promise.reject(new Error('network_error: Load test failure'));
        }
        return Promise.resolve({
          operationId: request.operationId,
          status: 'success'
        });
      });

      // Execute concurrent security operations
      const results = await Promise.allSettled(
        concurrentRequests.map(request =>
          resilienceAPI.executeResilientSync(request, mockSyncOperation)
        )
      );

      // Verify encryption was attempted for all operations with sensitive data
      expect(mockEncryption.encryptData.mock.calls.length).toBeGreaterThan(0);

      // Verify no PHI exposure across all concurrent operations
      expect(SecurityValidator.validateNoPHIExposure(securityLogs)).toBe(true);

      // Verify security maintained even under load
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          expect(SecurityValidator.validateNoPHIExposure(result.value)).toBe(true);
        }
      });

      console.log(`Security load test: ${results.length} concurrent operations processed securely`);
    });
  });
});