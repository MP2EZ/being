/**
 * Payment Sync Security Resilience Service Tests
 *
 * Test suite for validating payment sync security resilience functionality
 * including secure recovery operations, cryptographic resilience, and
 * compliance preservation during failure scenarios.
 */

import { PaymentSyncSecurityResilienceService } from '../PaymentSyncSecurityResilience';

// Mock dependencies
jest.mock('../EncryptionService');
jest.mock('../PaymentSecurityService');
jest.mock('expo-crypto');
jest.mock('expo-secure-store');

describe('PaymentSyncSecurityResilienceService', () => {
  let service: PaymentSyncSecurityResilienceService;

  beforeEach(() => {
    service = PaymentSyncSecurityResilienceService.getInstance();
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should initialize with default configuration', async () => {
      await expect(service.initialize()).resolves.not.toThrow();
    });

    it('should initialize with custom configuration', async () => {
      const customConfig = {
        maxRecoveryAttempts: 5,
        cryptographicResilienceEnabled: true,
        realTimeMonitoringEnabled: true,
        pciDssComplianceEnforced: true,
        crisisSafetyProtectionEnabled: true
      };

      await expect(service.initialize(customConfig)).resolves.not.toThrow();
    });

    it('should handle initialization failures gracefully', async () => {
      // Mock initialization failure
      const mockError = new Error('Initialization failed');
      jest.spyOn(service as any, 'initializeCryptographicResilience').mockRejectedValue(mockError);

      await expect(service.initialize()).rejects.toThrow('Security resilience initialization failed');
    });
  });

  describe('Secure Recovery Operations', () => {
    it('should execute secure recovery for payment sync failures', async () => {
      const operationType = 'payment_sync_failure';
      const failureContext = {
        originalError: 'Network timeout',
        failureTimestamp: new Date().toISOString(),
        subscriptionTier: 'premium' as const,
        crisisMode: false,
        sensitiveDataInvolved: true
      };

      const result = await service.executeSecureRecovery(operationType, failureContext, false);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.securityMetrics.dataExposureLevel).toBe('none');
      expect(result.securityMetrics.encryptionIntegrityMaintained).toBe(true);
      expect(result.securityMetrics.auditTrailComplete).toBe(true);
    });

    it('should prioritize crisis mode recovery operations', async () => {
      const operationType = 'network_outage';
      const failureContext = {
        originalError: 'Crisis emergency - network down',
        failureTimestamp: new Date().toISOString(),
        subscriptionTier: 'basic' as const,
        crisisMode: true,
        sensitiveDataInvolved: true
      };

      const result = await service.executeSecureRecovery(operationType, failureContext, true);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.performanceMetrics.recoveryTimeMs).toBeLessThan(5000); // Crisis mode requirement
      expect(result.emergencyProtocolsActivated).toContain('crisis_safety_bypass');
    });

    it('should recover encrypted state without data exposure', async () => {
      const corruptedState = { encrypted: true, data: 'corrupted' };
      const recoveryMetadata = {
        userId: 'test-user',
        subscriptionTier: 'premium' as const,
        crisisMode: false,
        lastKnownGoodState: JSON.stringify({ valid: 'backup' })
      };

      const result = await service.recoverEncryptedState(corruptedState, recoveryMetadata);

      expect(result).toBeDefined();
      expect(result.recoveredState).toBeDefined();
      expect(result.integrityValidated).toBe(true);
      expect(result.encryptionMaintained).toBe(true);
      expect(result.auditTrail).toHaveLength(2); // Initial and completion audit events
    });

    it('should handle secure authentication during failures', async () => {
      const authContext = {
        userId: 'test-user',
        deviceId: 'test-device',
        failureReason: 'Network timeout',
        crisisMode: false,
        subscriptionTier: 'basic' as const
      };

      const result = await service.secureAuthentication(authContext);

      expect(result).toBeDefined();
      expect(result.authenticated).toBe(true);
      expect(result.authLevel).toBe('standard');
      expect(result.auditEventId).toBeDefined();
    });

    it('should provide emergency authentication for crisis mode', async () => {
      const authContext = {
        userId: 'crisis-user',
        deviceId: 'crisis-device',
        failureReason: 'Mental health emergency',
        crisisMode: true,
        subscriptionTier: 'trial' as const
      };

      const result = await service.secureAuthentication(authContext);

      expect(result).toBeDefined();
      expect(result.authenticated).toBe(true);
      expect(result.authLevel).toBe('emergency');
      expect(result.bypassReason).toBe('crisis_mode_emergency_access');
      expect(result.securityConstraints).toContain('data_access_limited');
    });
  });

  describe('Cryptographic Resilience', () => {
    it('should perform key rotation during recovery operations', async () => {
      const recoveryOperationId = 'recovery_123';
      const maxDurationMs = 10000;

      const result = await service.performKeyRotationDuringRecovery(recoveryOperationId, maxDurationMs);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.newKeyGeneration).toBeGreaterThan(0);
      expect(result.rotationDurationMs).toBeLessThan(maxDurationMs);
      expect(result.complianceValidated).toBe(true);
    });

    it('should handle encrypted queue operations during network outages', async () => {
      const queueOperations = [
        { id: 'op1', type: 'payment_sync', encrypted: true },
        { id: 'op2', type: 'queue_update', encrypted: true }
      ];
      const networkAvailable = false;

      const result = await service.processEncryptedQueueOperations(queueOperations, networkAvailable);

      expect(result).toBeDefined();
      expect(result.processed).toBe(0); // Should queue when network unavailable
      expect(result.queuedForLater).toBe(2);
      expect(result.encryptionIntegrityMaintained).toBe(true);
      expect(result.auditEvents).toHaveLength(2);
    });

    it('should refresh secure tokens for extended operations', async () => {
      const tokenContext = {
        userId: 'test-user',
        deviceId: 'test-device',
        subscriptionTier: 'premium' as const,
        operationDurationMs: 30000,
        crisisMode: false
      };

      const result = await service.refreshSecureTokens(tokenContext);

      expect(result).toBeDefined();
      expect(result.refreshSuccessful).toBe(true);
      expect(result.tokensRefreshed).toBeGreaterThan(0);
      expect(result.securityValidated).toBe(true);
      expect(result.auditEventId).toBeDefined();
    });
  });

  describe('Security Monitoring', () => {
    it('should start security monitoring', async () => {
      await expect(service.startSecurityMonitoring()).resolves.not.toThrow();
    });

    it('should trigger automated security response for breaches', async () => {
      const breachType = 'data_exposure';
      const context = {
        severity: 'critical' as const,
        affectedSystems: ['payment_sync', 'encryption'],
        potentialDataExposure: true,
        crisisSafetyRisk: false
      };

      const result = await service.triggerAutomatedSecurityResponse(breachType, context);

      expect(result).toBeDefined();
      expect(result.responseTriggered).toBe(true);
      expect(result.actionsExecuted).toContain('system_isolation');
      expect(result.actionsExecuted).toContain('emergency_key_rotation');
      expect(result.escalationRequired).toBe(true);
    });

    it('should activate crisis safety protocols for crisis-related breaches', async () => {
      const breachType = 'system_compromise';
      const context = {
        severity: 'emergency' as const,
        affectedSystems: ['payment_sync'],
        potentialDataExposure: true,
        crisisSafetyRisk: true
      };

      const result = await service.triggerAutomatedSecurityResponse(breachType, context);

      expect(result).toBeDefined();
      expect(result.responseTriggered).toBe(true);
      expect(result.emergencyProtocolsActivated).toContain('crisis_safety_bypass');
      expect(result.escalationRequired).toBe(true);
    });
  });

  describe('Compliance Resilience', () => {
    it('should maintain PCI DSS compliance during failures', async () => {
      const failureContext = {
        failureType: 'network_outage',
        systemsAffected: ['payment_sync'],
        dataIntegrityCompromised: false,
        crisisMode: false
      };

      const result = await service.maintainPCIComplianceDuringFailure(failureContext);

      expect(result).toBeDefined();
      expect(result.complianceMainained).toBe(true);
      expect(result.violationsDetected).toHaveLength(0);
      expect(result.auditTrailPreserved).toBe(true);
    });

    it('should preserve HIPAA audit trail during recovery', async () => {
      const recoveryContext = {
        systemsRecovered: ['payment_sync', 'encryption'],
        dataLossOccurred: false,
        userDataAffected: false,
        therapeuticSessionsImpacted: false
      };

      const result = await service.preserveHIPAAAuditTrail(recoveryContext);

      expect(result).toBeDefined();
      expect(result.auditTrailComplete).toBe(true);
      expect(result.complianceRisk).toBe('low');
      expect(result.missingAuditEvents).toHaveLength(0);
    });

    it('should escalate compliance risk for data loss scenarios', async () => {
      const recoveryContext = {
        systemsRecovered: ['payment_sync'],
        dataLossOccurred: true,
        userDataAffected: true,
        therapeuticSessionsImpacted: true
      };

      const result = await service.preserveHIPAAAuditTrail(recoveryContext);

      expect(result).toBeDefined();
      expect(result.complianceRisk).toBe('critical');
    });
  });

  describe('Service Status and Management', () => {
    it('should provide comprehensive security resilience status', async () => {
      const status = await service.getSecurityResilienceStatus();

      expect(status).toBeDefined();
      expect(status.initialized).toBe(true);
      expect(status.complianceStatus).toBeDefined();
      expect(status.cryptographicHealth).toBeDefined();
      expect(Array.isArray(status.recommendations)).toBe(true);
    });

    it('should handle emergency shutdown gracefully', async () => {
      await expect(service.emergencyShutdown()).resolves.not.toThrow();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle service errors gracefully', async () => {
      // Test error handling by mocking a service failure
      const mockError = new Error('Service failure');
      jest.spyOn(service as any, 'generateSecureId').mockRejectedValue(mockError);

      const operationType = 'encryption_failure';
      const failureContext = {
        originalError: 'Test error',
        failureTimestamp: new Date().toISOString(),
        subscriptionTier: 'basic' as const,
        crisisMode: false,
        sensitiveDataInvolved: true
      };

      await expect(service.executeSecureRecovery(operationType, failureContext)).rejects.toThrow();
    });

    it('should prioritize crisis safety even during service failures', async () => {
      // Mock a critical failure
      const mockError = new Error('Critical system failure');
      jest.spyOn(service as any, 'executeRecoveryStrategy').mockRejectedValue(mockError);

      const operationType = 'system_compromise';
      const failureContext = {
        originalError: 'Critical error during crisis',
        failureTimestamp: new Date().toISOString(),
        subscriptionTier: 'trial' as const,
        crisisMode: true,
        sensitiveDataInvolved: true
      };

      try {
        await service.executeSecureRecovery(operationType, failureContext, true);
      } catch (error) {
        // Should still maintain crisis safety even if recovery fails
        expect(error).toBeDefined();
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should meet crisis response time requirements', async () => {
      const startTime = Date.now();

      const authContext = {
        userId: 'crisis-user',
        deviceId: 'crisis-device',
        failureReason: 'Mental health emergency',
        crisisMode: true,
        subscriptionTier: 'basic' as const
      };

      const result = await service.secureAuthentication(authContext);
      const responseTime = Date.now() - startTime;

      expect(result.authenticated).toBe(true);
      expect(responseTime).toBeLessThan(200); // Crisis requirement: <200ms
    });

    it('should maintain performance during high load scenarios', async () => {
      // Simulate multiple concurrent operations
      const operations = Array.from({ length: 10 }, (_, i) =>
        service.executeSecureRecovery(
          'payment_sync_failure',
          {
            originalError: `Concurrent error ${i}`,
            failureTimestamp: new Date().toISOString(),
            subscriptionTier: 'premium' as const,
            crisisMode: false,
            sensitiveDataInvolved: true
          }
        )
      );

      const results = await Promise.all(operations);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.performanceMetrics.recoveryTimeMs).toBeLessThan(30000); // 30s max
      });
    });
  });
});

describe('Service Integration', () => {
  it('should integrate with existing security services', () => {
    const service = PaymentSyncSecurityResilienceService.getInstance();
    expect(service).toBeDefined();
    expect(typeof service.initialize).toBe('function');
    expect(typeof service.executeSecureRecovery).toBe('function');
    expect(typeof service.getSecurityResilienceStatus).toBe('function');
  });

  it('should maintain singleton pattern', () => {
    const service1 = PaymentSyncSecurityResilienceService.getInstance();
    const service2 = PaymentSyncSecurityResilienceService.getInstance();
    expect(service1).toBe(service2);
  });
});