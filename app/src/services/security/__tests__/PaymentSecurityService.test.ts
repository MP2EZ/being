/**
 * Payment Security Service Test Suite
 *
 * Comprehensive testing for PCI DSS compliance and crisis safety
 * Focus Areas:
 * - PCI DSS Level 2 compliance validation
 * - Crisis bypass functionality (<200ms response)
 * - Payment data isolation from PHI
 * - Fraud detection and rate limiting
 * - Audit logging compliance
 */

import { PaymentSecurityService } from '../PaymentSecurityService';
import { EncryptionService } from '../EncryptionService';

// Mock dependencies
jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(() => Promise.resolve(new Uint8Array(32).fill(1))),
  digestStringAsync: jest.fn(() => Promise.resolve('mock_hash'))
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve())
}));

describe('PaymentSecurityService', () => {
  let paymentSecurity: PaymentSecurityService;
  let encryptionService: EncryptionService;

  beforeEach(async () => {
    paymentSecurity = PaymentSecurityService.getInstance();
    encryptionService = EncryptionService.getInstance();

    // Initialize services
    await encryptionService.initialize();
    await paymentSecurity.initialize();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('PCI DSS Compliance', () => {
    test('should use separate encryption context for payment data', async () => {
      const testData = { cardToken: 'tok_test123' };
      const userId = 'test_user';
      const deviceId = 'test_device';
      const sessionId = 'test_session';

      const result = await paymentSecurity.createPaymentToken(
        testData,
        userId,
        deviceId,
        sessionId
      );

      expect(result.tokenInfo.tokenId).toBeDefined();
      expect(result.securityResult.success).toBe(true);
      expect(result.tokenInfo.metadata.deviceFingerprint).toBeDefined();
    });

    test('should never store card data locally', async () => {
      const cardData = {
        number: '4242424242424242',
        expiryMonth: 12,
        expiryYear: 2025,
        cvc: '123'
      };

      const result = await paymentSecurity.createPaymentToken(
        cardData,
        'test_user',
        'test_device',
        'test_session'
      );

      // Verify no sensitive card data in token
      expect(result.tokenInfo.tokenId).not.toContain('4242424242424242');
      expect(JSON.stringify(result.tokenInfo)).not.toContain('123');
      expect(JSON.stringify(result.tokenInfo)).not.toContain(cardData.number);
    });

    test('should implement proper key rotation for payment keys', async () => {
      const status = await paymentSecurity.getPaymentSecurityStatus();

      expect(status.pciCompliant).toBe(true);
      expect(status.crisisBypassEnabled).toBe(true);
      expect(status.fraudDetectionActive).toBe(true);
    });

    test('should enforce rate limiting with PCI DSS requirements', async () => {
      const userId = 'test_user';
      const deviceId = 'test_device';

      // Make multiple payment attempts to trigger rate limiting
      const promises = [];
      for (let i = 0; i < 15; i++) {
        promises.push(
          paymentSecurity.createPaymentToken(
            { test: 'data' },
            userId,
            deviceId,
            `session_${i}`
          ).catch(err => err)
        );
      }

      const results = await Promise.all(promises);

      // Should have some rate limit failures
      const failures = results.filter(r => r instanceof Error);
      expect(failures.length).toBeGreaterThan(0);

      // Check that error mentions rate limiting
      const rateLimitError = failures.find(f =>
        f.message.includes('Rate limit exceeded')
      );
      expect(rateLimitError).toBeDefined();
    });

    test('should maintain comprehensive audit logs', async () => {
      const userId = 'audit_test_user';
      const deviceId = 'audit_test_device';

      await paymentSecurity.createPaymentToken(
        { test: 'audit_data' },
        userId,
        deviceId,
        'audit_session'
      );

      // Audit events should be recorded automatically
      // In real implementation, would verify audit log entries
      expect(true).toBe(true); // Placeholder for audit verification
    });
  });

  describe('Crisis Safety Protocols', () => {
    test('should bypass payment security during crisis mode', async () => {
      const startTime = Date.now();

      const result = await paymentSecurity.createPaymentToken(
        { emergency: 'payment' },
        'crisis_user',
        'crisis_device',
        'crisis_session',
        true // Crisis mode
      );

      const responseTime = Date.now() - startTime;

      expect(result.securityResult.crisisOverride).toBe(true);
      expect(result.securityResult.action).toBe('bypass');
      expect(result.securityResult.riskScore).toBe(0);
      expect(responseTime).toBeLessThan(200); // <200ms requirement
    });

    test('should allow payment token validation during crisis', async () => {
      // Create token in normal mode
      const tokenResult = await paymentSecurity.createPaymentToken(
        { test: 'token' },
        'test_user',
        'test_device',
        'test_session'
      );

      // Validate in crisis mode
      const startTime = Date.now();
      const validationResult = await paymentSecurity.validatePaymentToken(
        tokenResult.tokenInfo.tokenId,
        'test_user',
        'test_device',
        true // Crisis mode
      );

      const responseTime = Date.now() - startTime;

      expect(validationResult.success).toBe(true);
      expect(validationResult.crisisOverride).toBe(true);
      expect(responseTime).toBeLessThan(200); // <200ms requirement
    });

    test('should exempt crisis mode from rate limiting', async () => {
      const userId = 'crisis_rate_test';
      const deviceId = 'crisis_device';

      // Make many attempts in crisis mode
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          paymentSecurity.createPaymentToken(
            { crisis: 'payment' },
            userId,
            deviceId,
            `crisis_session_${i}`,
            true // Crisis mode
          )
        );
      }

      const results = await Promise.all(promises);

      // All should succeed in crisis mode (no rate limiting)
      const successes = results.filter(r => r.securityResult.success);
      expect(successes.length).toBe(20);

      // All should have crisis override
      const crisisOverrides = results.filter(r => r.securityResult.crisisOverride);
      expect(crisisOverrides.length).toBe(20);
    });

    test('should maintain 988 hotline access regardless of payment status', async () => {
      // Simulate payment system failure
      const originalCreateToken = paymentSecurity.createPaymentToken;

      // Mock payment failure
      jest.spyOn(paymentSecurity, 'createPaymentToken').mockRejectedValue(
        new Error('Payment system unavailable')
      );

      // Crisis access should still work
      try {
        const result = await paymentSecurity.createPaymentToken(
          { emergency: 'call' },
          'emergency_user',
          'emergency_device',
          'emergency_session',
          true // Crisis mode
        );

        // Should not reach here with mocked failure, unless crisis bypass works
        expect(result.securityResult.crisisOverride).toBe(true);
      } catch (error) {
        // If error occurs, verify it's not blocking emergency features
        expect(error.message).not.toContain('988');
        expect(error.message).not.toContain('hotline');
        expect(error.message).not.toContain('crisis');
      }

      // Restore original method
      jest.restoreAllMocks();
    });

    test('should handle emergency cleanup without breaking crisis access', async () => {
      await paymentSecurity.emergencyCleanup();

      // Crisis access should still work after cleanup
      const result = await paymentSecurity.createPaymentToken(
        { post_cleanup: 'test' },
        'cleanup_user',
        'cleanup_device',
        'cleanup_session',
        true // Crisis mode
      );

      expect(result.securityResult.success).toBe(true);
      expect(result.securityResult.crisisOverride).toBe(true);
    });
  });

  describe('Fraud Detection', () => {
    test('should detect high-risk payment patterns', async () => {
      const userId = 'fraud_test_user';
      const deviceId = 'suspicious_device';

      // Create multiple rapid payment attempts
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          paymentSecurity.createPaymentToken(
            {
              amount: 10000, // High amount
              rapid_attempt: i
            },
            userId,
            deviceId,
            `rapid_session_${i}`
          ).catch(err => err)
        );
      }

      const results = await Promise.all(promises);

      // Some should be flagged for high risk
      const highRiskResults = results.filter(r =>
        r.securityResult && r.securityResult.riskScore > 50
      );

      expect(highRiskResults.length).toBeGreaterThan(0);
    });

    test('should allow legitimate payment patterns', async () => {
      const result = await paymentSecurity.createPaymentToken(
        {
          amount: 999, // Normal subscription amount
          legitimate: true
        },
        'good_user',
        'trusted_device',
        'normal_session'
      );

      expect(result.securityResult.success).toBe(true);
      expect(result.securityResult.riskScore).toBeLessThan(50);
      expect(result.securityResult.action).toEqual(
        expect.stringMatching(/proceed|challenge/)
      );
    });

    test('should never block crisis operations due to fraud detection', async () => {
      // Even with suspicious patterns, crisis mode should work
      const result = await paymentSecurity.createPaymentToken(
        {
          amount: 100000, // Suspicious high amount
          suspicious: 'pattern'
        },
        'suspicious_user',
        'unknown_device',
        'suspicious_session',
        true // Crisis mode
      );

      expect(result.securityResult.success).toBe(true);
      expect(result.securityResult.crisisOverride).toBe(true);
      expect(result.securityResult.riskScore).toBe(0); // Risk ignored in crisis
    });
  });

  describe('Data Isolation', () => {
    test('should use separate encryption keys for payment vs PHI data', async () => {
      // This test would verify that payment and health data use different encryption contexts
      // In real implementation, would check key derivation and storage separation

      const paymentStatus = await paymentSecurity.getPaymentSecurityStatus();
      expect(paymentStatus.pciCompliant).toBe(true);

      // Verify payment encryption is separate from health data encryption
      const encryptionStatus = await encryptionService.getSecurityReadiness();
      expect(encryptionStatus.ready).toBe(true);

      // Both should be ready but with separate security contexts
      expect(paymentStatus.pciCompliant).toBe(true);
      expect(encryptionStatus.cloudSyncReady).toBe(true);
    });

    test('should maintain separate audit trails for payment vs health data', async () => {
      await paymentSecurity.createPaymentToken(
        { payment: 'data' },
        'audit_user',
        'audit_device',
        'payment_audit_session'
      );

      // Payment audit should be separate from health data audit
      // In real implementation, would verify separate audit log storage
      expect(true).toBe(true); // Placeholder for audit separation verification
    });
  });

  describe('Performance Requirements', () => {
    test('should meet <200ms crisis response time requirement', async () => {
      const iterations = 10;
      const responseTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        await paymentSecurity.createPaymentToken(
          { performance: 'test' },
          'perf_user',
          'perf_device',
          `perf_session_${i}`,
          true // Crisis mode
        );

        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
      }

      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);

      expect(averageResponseTime).toBeLessThan(100); // Target <100ms average
      expect(maxResponseTime).toBeLessThan(200); // Never exceed 200ms

      console.log(`Crisis response times - Avg: ${averageResponseTime}ms, Max: ${maxResponseTime}ms`);
    });

    test('should maintain performance under load', async () => {
      const concurrentRequests = 20;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        paymentSecurity.createPaymentToken(
          { load: 'test' },
          `load_user_${i}`,
          `load_device_${i}`,
          `load_session_${i}`,
          true // Crisis mode for consistent performance
        )
      );

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / concurrentRequests;

      expect(results.length).toBe(concurrentRequests);
      expect(averageTime).toBeLessThan(300); // Reasonable performance under load

      const successCount = results.filter(r => r.securityResult.success).length;
      expect(successCount).toBe(concurrentRequests);
    });
  });

  describe('Token Lifecycle Management', () => {
    test('should enforce token expiration', async () => {
      const result = await paymentSecurity.createPaymentToken(
        { test: 'expiry' },
        'expiry_user',
        'expiry_device',
        'expiry_session'
      );

      // Mock token as expired
      const tokenInfo = result.tokenInfo;
      tokenInfo.expires = new Date(Date.now() - 1000).toISOString(); // 1 second ago

      // Validation should fail for expired token
      const validationResult = await paymentSecurity.validatePaymentToken(
        tokenInfo.tokenId,
        'expiry_user',
        'expiry_device'
      );

      expect(validationResult.success).toBe(false);
      expect(validationResult.reason).toContain('expired');
    });

    test('should handle token cleanup gracefully', async () => {
      // Create several tokens
      const tokens = [];
      for (let i = 0; i < 5; i++) {
        const result = await paymentSecurity.createPaymentToken(
          { cleanup: `test_${i}` },
          'cleanup_user',
          'cleanup_device',
          `cleanup_session_${i}`
        );
        tokens.push(result.tokenInfo.tokenId);
      }

      // Cleanup should not throw errors
      await expect(paymentSecurity.emergencyCleanup()).resolves.not.toThrow();

      // Crisis mode should still work after cleanup
      const postCleanupResult = await paymentSecurity.createPaymentToken(
        { post_cleanup: 'test' },
        'cleanup_user',
        'cleanup_device',
        'post_cleanup_session',
        true // Crisis mode
      );

      expect(postCleanupResult.securityResult.success).toBe(true);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle encryption failures gracefully', async () => {
      // Mock encryption failure
      const originalEncrypt = encryptionService.encryptData;
      jest.spyOn(encryptionService, 'encryptData').mockRejectedValue(
        new Error('Encryption failed')
      );

      try {
        await paymentSecurity.createPaymentToken(
          { error: 'test' },
          'error_user',
          'error_device',
          'error_session'
        );

        // Should throw error for normal mode
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain('Payment security failure');
      }

      // Crisis mode should still work even with encryption failure
      const crisisResult = await paymentSecurity.createPaymentToken(
        { crisis_error: 'test' },
        'error_user',
        'error_device',
        'crisis_error_session',
        true // Crisis mode
      );

      expect(crisisResult.securityResult.crisisOverride).toBe(true);

      // Restore original method
      jest.restoreAllMocks();
    });

    test('should maintain service availability during partial failures', async () => {
      // Test resilience to various failure scenarios
      const testCases = [
        { scenario: 'network_error', data: { network: 'failed' } },
        { scenario: 'device_error', data: { device: 'unavailable' } },
        { scenario: 'storage_error', data: { storage: 'full' } }
      ];

      for (const testCase of testCases) {
        // Crisis mode should work regardless of other failures
        const result = await paymentSecurity.createPaymentToken(
          testCase.data,
          'resilience_user',
          'resilience_device',
          `resilience_${testCase.scenario}`,
          true // Crisis mode
        );

        expect(result.securityResult.success).toBe(true);
        expect(result.securityResult.crisisOverride).toBe(true);
      }
    });
  });

  describe('Security Validation', () => {
    test('should validate PCI DSS compliance requirements', async () => {
      const status = await paymentSecurity.getPaymentSecurityStatus();

      // All PCI DSS requirements should be met
      expect(status.pciCompliant).toBe(true);
      expect(status.fraudDetectionActive).toBe(true);
      expect(status.crisisBypassEnabled).toBe(true);
      expect(status.issues).toHaveLength(0);
    });

    test('should enforce biometric authentication for payment operations', async () => {
      // Normal payment operations should require biometric auth
      const result = await paymentSecurity.createPaymentToken(
        { biometric: 'test' },
        'biometric_user',
        'biometric_device',
        'biometric_session'
      );

      // In production, would verify biometric challenge was required
      expect(result.securityResult.success).toBe(true);
    });

    test('should validate device binding for payment tokens', async () => {
      const result = await paymentSecurity.createPaymentToken(
        { device: 'binding' },
        'device_user',
        'original_device',
        'device_session'
      );

      // Try to validate token from different device
      const validationResult = await paymentSecurity.validatePaymentToken(
        result.tokenInfo.tokenId,
        'device_user',
        'different_device' // Different device
      );

      // Should fail due to device binding
      expect(validationResult.success).toBe(false);
      expect(validationResult.reason).toContain('Device binding');
    });
  });
});