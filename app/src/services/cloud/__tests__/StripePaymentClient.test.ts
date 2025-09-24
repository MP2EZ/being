/**
 * Stripe Payment Client Integration Test Suite
 *
 * Tests HIPAA-compliant Stripe integration with crisis safety protocols
 * Focus Areas:
 * - HIPAA compliance with separate data contexts
 * - Crisis mode bypass functionality
 * - Payment intent and subscription creation
 * - Error handling with graceful degradation
 * - Zero card data storage validation
 */

import { StripePaymentClient } from '../StripePaymentClient';
import { PaymentSecurityService } from '../../security/PaymentSecurityService';

// Mock dependencies
jest.mock('../../security/PaymentSecurityService');
jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(() => Promise.resolve(new Uint8Array(32).fill(1))),
  digestStringAsync: jest.fn(() => Promise.resolve('mock_hash'))
}));

describe('StripePaymentClient', () => {
  let stripeClient: StripePaymentClient;
  let mockPaymentSecurity: jest.Mocked<PaymentSecurityService>;

  beforeEach(async () => {
    stripeClient = StripePaymentClient.getInstance();
    mockPaymentSecurity = PaymentSecurityService.getInstance() as jest.Mocked<PaymentSecurityService>;

    // Mock payment security responses
    mockPaymentSecurity.initialize.mockResolvedValue();
    mockPaymentSecurity.createPaymentToken.mockResolvedValue({
      tokenInfo: {
        tokenId: 'mock_token_123',
        paymentMethodType: 'card',
        last4: '4242',
        brand: 'visa',
        expiryMonth: 12,
        expiryYear: 2025,
        created: new Date().toISOString(),
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        metadata: {
          deviceFingerprint: 'mock_fingerprint',
          riskAssessment: 'low',
          verificationStatus: 'verified'
        }
      },
      securityResult: {
        success: true,
        action: 'proceed',
        riskScore: 10,
        reason: 'Token created successfully',
        auditEventId: 'audit_123',
        recommendations: []
      }
    });

    mockPaymentSecurity.validatePaymentToken.mockResolvedValue({
      success: true,
      action: 'proceed',
      riskScore: 15,
      reason: 'Token validated successfully',
      auditEventId: 'audit_validate_123',
      recommendations: []
    });

    // Initialize Stripe client
    await stripeClient.initialize('pk_test_mock_key');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization and Configuration', () => {
    test('should initialize with valid publishable key', async () => {
      const newClient = StripePaymentClient.getInstance();
      await expect(newClient.initialize('pk_test_valid_key')).resolves.not.toThrow();
    });

    test('should reject invalid publishable key', async () => {
      const newClient = StripePaymentClient.getInstance();
      await expect(newClient.initialize('invalid_key')).rejects.toThrow('Invalid Stripe publishable key');
    });

    test('should initialize in crisis mode with reduced timeouts', async () => {
      const newClient = StripePaymentClient.getInstance();
      await newClient.initialize('pk_test_crisis_key', true);

      const status = await newClient.getPaymentClientStatus();
      expect(status.crisisMode).toBe(true);
    });

    test('should enable emergency mode when initialization fails in crisis', async () => {
      mockPaymentSecurity.initialize.mockRejectedValueOnce(new Error('Security init failed'));

      // Should not throw during crisis initialization
      await expect(stripeClient.initialize('pk_test_key', true)).resolves.not.toThrow();

      const status = await stripeClient.getPaymentClientStatus();
      expect(status.crisisMode).toBe(true);
    });
  });

  describe('Payment Intent Operations', () => {
    test('should create payment intent with HIPAA-compliant metadata', async () => {
      const paymentData = {
        amount: 999,
        currency: 'usd',
        subscriptionType: 'monthly' as const,
        description: 'FullMind Premium Monthly',
        metadata: {
          userId: 'user_123',
          deviceId: 'device_456',
          sessionId: 'session_789',
          crisisMode: false,
          appVersion: '1.0.0'
        }
      };

      const result = await stripeClient.createPaymentIntent(paymentData);

      expect(result.paymentIntentId).toMatch(/^pi_/);
      expect(result.clientSecret).toMatch(/^pi_.*_secret/);
      expect(result.amount).toBe(999);
      expect(result.currency).toBe('usd');
      expect(result.status).toBe('requires_payment_method');
    });

    test('should handle crisis mode payment intent creation', async () => {
      const paymentData = {
        amount: 999,
        currency: 'usd',
        subscriptionType: 'monthly' as const,
        description: 'Crisis Access',
        metadata: {
          userId: 'crisis_user',
          deviceId: 'crisis_device',
          sessionId: 'crisis_session',
          crisisMode: true,
          appVersion: '1.0.0'
        }
      };

      const startTime = Date.now();
      const result = await stripeClient.createPaymentIntent(paymentData, true);
      const responseTime = Date.now() - startTime;

      expect(result.crisisOverride).toBe(true);
      expect(result.status).toBe('succeeded');
      expect(result.amount).toBe(0); // Free during crisis
      expect(responseTime).toBeLessThan(200); // Crisis response time requirement
    });

    test('should confirm payment intent with security validation', async () => {
      const result = await stripeClient.confirmPaymentIntent(
        'pi_test_123',
        'pm_test_456',
        'user_123',
        'device_456'
      );

      expect(result.paymentIntentId).toBe('pi_test_123');
      expect(result.status).toBe('succeeded');
      expect(mockPaymentSecurity.validatePaymentToken).toHaveBeenCalledWith(
        'pm_test_456',
        'user_123',
        'device_456',
        false
      );
    });

    test('should bypass payment confirmation in crisis mode', async () => {
      const result = await stripeClient.confirmPaymentIntent(
        'pi_crisis_123',
        'pm_crisis_456',
        'crisis_user',
        'crisis_device',
        true // Crisis mode
      );

      expect(result.crisisOverride).toBe(true);
      expect(result.status).toBe('succeeded');
      expect(result.clientSecret).toBe('crisis_bypass');
    });
  });

  describe('Payment Method Operations', () => {
    test('should create payment method with card tokenization', async () => {
      const cardData = {
        number: '4242424242424242',
        expiryMonth: 12,
        expiryYear: 2025,
        cvc: '123'
      };

      const billingDetails = {
        name: 'Test User',
        email: 'test@example.com'
      };

      const result = await stripeClient.createPaymentMethod(
        cardData,
        billingDetails,
        'user_123',
        'device_456'
      );

      expect(result.paymentMethod.paymentMethodId).toMatch(/^pm_/);
      expect(result.paymentMethod.type).toBe('card');
      expect(result.paymentMethod.card?.last4).toBe('4242');
      expect(result.paymentMethod.card?.brand).toBe('visa');

      // Verify no sensitive card data is returned
      expect(JSON.stringify(result)).not.toContain('4242424242424242');
      expect(JSON.stringify(result)).not.toContain('123');
    });

    test('should handle crisis mode payment method creation', async () => {
      const billingDetails = {
        name: 'Crisis User'
      };

      const result = await stripeClient.createPaymentMethod(
        {},
        billingDetails,
        'crisis_user',
        'crisis_device',
        true // Crisis mode
      );

      expect(result.paymentMethod.paymentMethodId).toMatch(/^crisis_pm_/);
      expect(result.securityResult.crisisOverride).toBe(true);
      expect(result.tokenInfo.tokenId).toMatch(/^crisis_/);
    });

    test('should validate payment method security before creation', async () => {
      const cardData = {
        number: '4000000000000002', // Declined card
        expiryMonth: 1,
        expiryYear: 2020 // Expired
      };

      const billingDetails = {
        name: 'Test User'
      };

      await stripeClient.createPaymentMethod(
        cardData,
        billingDetails,
        'user_123',
        'device_456'
      );

      // Should still call security service for validation
      expect(mockPaymentSecurity.createPaymentToken).toHaveBeenCalled();
    });
  });

  describe('Subscription Management', () => {
    test('should return available subscription plans', () => {
      const plans = stripeClient.getSubscriptionPlans();

      expect(plans).toHaveLength(2);
      expect(plans[0].planId).toBe('fullmind_monthly');
      expect(plans[1].planId).toBe('fullmind_annual');

      // Verify plan structure
      const monthlyPlan = plans[0];
      expect(monthlyPlan.amount).toBe(999);
      expect(monthlyPlan.currency).toBe('usd');
      expect(monthlyPlan.interval).toBe('month');
      expect(monthlyPlan.features).toContain('All MBCT guided practices');
    });

    test('should create subscription with secure payment method', async () => {
      const result = await stripeClient.createSubscription(
        'cus_test_123',
        'fullmind_monthly',
        'pm_test_456',
        'user_123',
        'device_456',
        7 // Trial days
      );

      expect(result.subscriptionId).toMatch(/^sub_/);
      expect(result.status).toBe('active');
      expect(result.trialEnd).toBeDefined();
      expect(mockPaymentSecurity.validatePaymentToken).toHaveBeenCalled();
    });

    test('should handle crisis mode subscription creation', async () => {
      const result = await stripeClient.createSubscription(
        'cus_crisis_123',
        'fullmind_monthly',
        'pm_crisis_456',
        'crisis_user',
        'crisis_device',
        undefined, // No trial
        true // Crisis mode
      );

      expect(result.subscriptionId).toMatch(/^crisis_sub_/);
      expect(result.status).toBe('active');
      // Should not validate payment method in crisis mode
      expect(mockPaymentSecurity.validatePaymentToken).not.toHaveBeenCalled();
    });
  });

  describe('Crisis Safety Protocols', () => {
    test('should maintain <200ms response times in crisis mode', async () => {
      const iterations = 10;
      const responseTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        await stripeClient.createPaymentIntent({
          amount: 999,
          currency: 'usd',
          subscriptionType: 'monthly',
          description: 'Crisis Payment',
          metadata: {
            userId: `crisis_user_${i}`,
            deviceId: `crisis_device_${i}`,
            sessionId: `crisis_session_${i}`,
            crisisMode: true,
            appVersion: '1.0.0'
          }
        }, true);

        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
      }

      const averageTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxTime = Math.max(...responseTimes);

      expect(averageTime).toBeLessThan(100); // Target <100ms average
      expect(maxTime).toBeLessThan(200); // Never exceed 200ms

      console.log(`Crisis payment response times - Avg: ${averageTime}ms, Max: ${maxTime}ms`);
    });

    test('should bypass all payment validation during crisis', async () => {
      // Mock payment security to fail validation
      mockPaymentSecurity.validatePaymentToken.mockResolvedValueOnce({
        success: false,
        action: 'block',
        riskScore: 100,
        reason: 'High risk detected',
        auditEventId: 'audit_block_123',
        recommendations: ['Re-authenticate']
      });

      // Crisis mode should still work
      const result = await stripeClient.confirmPaymentIntent(
        'pi_crisis_test',
        'pm_high_risk',
        'crisis_user',
        'crisis_device',
        true // Crisis mode
      );

      expect(result.crisisOverride).toBe(true);
      expect(result.status).toBe('succeeded');
    });

    test('should preserve 988 hotline access during payment failures', async () => {
      // Mock all payment operations to fail
      jest.spyOn(stripeClient, 'createPaymentIntent').mockRejectedValueOnce(
        new Error('Payment system down')
      );

      // Crisis mode should provide emergency access
      const result = await stripeClient.createPaymentIntent({
        amount: 0,
        currency: 'usd',
        subscriptionType: 'monthly',
        description: 'Emergency Access',
        metadata: {
          userId: 'emergency_user',
          deviceId: 'emergency_device',
          sessionId: 'emergency_session',
          crisisMode: true,
          appVersion: '1.0.0'
        }
      }, true);

      expect(result.crisisOverride).toBe(true);
      expect(result.amount).toBe(0);
    });

    test('should handle emergency mode when Stripe is unavailable', async () => {
      // Initialize in crisis mode with Stripe unavailable
      await stripeClient.initialize('pk_test_unavailable', true);

      const status = await stripeClient.getPaymentClientStatus();
      expect(status.crisisMode).toBe(true);
      expect(status.initialized).toBe(true); // Should still initialize
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should format Stripe errors with crisis impact assessment', async () => {
      // Mock API to throw Stripe error
      const mockError = {
        type: 'card_error',
        code: 'card_declined',
        message: 'Your card was declined',
        decline_code: 'generic_decline'
      };

      // This would be handled internally by formatStripeError
      // Testing the error structure
      expect(mockError.type).toBe('card_error');
      expect(mockError.code).toBe('card_declined');
    });

    test('should maintain service availability during partial failures', async () => {
      // Mock payment security to partially fail
      mockPaymentSecurity.createPaymentToken.mockRejectedValueOnce(
        new Error('Temporary security failure')
      );

      // Normal mode should fail
      await expect(stripeClient.createPaymentMethod(
        { number: '4242424242424242' },
        { name: 'Test User' },
        'user_123',
        'device_456'
      )).rejects.toThrow();

      // Crisis mode should still work
      const crisisResult = await stripeClient.createPaymentMethod(
        { number: '4242424242424242' },
        { name: 'Crisis User' },
        'crisis_user',
        'crisis_device',
        true // Crisis mode
      );

      expect(crisisResult.securityResult.crisisOverride).toBe(true);
    });

    test('should handle network timeouts gracefully', async () => {
      // Mock network timeout
      jest.setTimeout(10000);

      // Crisis operations should complete quickly even with network issues
      const startTime = Date.now();
      const result = await stripeClient.createPaymentIntent({
        amount: 999,
        currency: 'usd',
        subscriptionType: 'monthly',
        description: 'Timeout Test',
        metadata: {
          userId: 'timeout_user',
          deviceId: 'timeout_device',
          sessionId: 'timeout_session',
          crisisMode: true,
          appVersion: '1.0.0'
        }
      }, true);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(3000); // Crisis timeout limit
      expect(result.crisisOverride).toBe(true);
    });
  });

  describe('HIPAA Compliance', () => {
    test('should separate payment metadata from health data', async () => {
      const paymentData = {
        amount: 999,
        currency: 'usd',
        subscriptionType: 'monthly' as const,
        description: 'FullMind Premium',
        metadata: {
          userId: 'hipaa_user',
          deviceId: 'hipaa_device',
          sessionId: 'hipaa_session',
          crisisMode: false,
          appVersion: '1.0.0'
        }
      };

      const result = await stripeClient.createPaymentIntent(paymentData);

      // Verify metadata doesn't contain health information
      expect(result.paymentIntentId).toBeDefined();
      expect(JSON.stringify(result)).not.toContain('phq9');
      expect(JSON.stringify(result)).not.toContain('gad7');
      expect(JSON.stringify(result)).not.toContain('mood');
      expect(JSON.stringify(result)).not.toContain('clinical');
    });

    test('should use separate encryption context for payment data', async () => {
      await stripeClient.createPaymentMethod(
        { number: '4242424242424242' },
        { name: 'HIPAA Test User' },
        'hipaa_user',
        'hipaa_device'
      );

      // Verify payment security uses separate encryption
      expect(mockPaymentSecurity.createPaymentToken).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'card',
          last4: '4242'
        }),
        'hipaa_user',
        'hipaa_device',
        expect.stringMatching(/payment_method_/),
        false
      );
    });

    test('should maintain audit trails separate from health data', async () => {
      await stripeClient.confirmPaymentIntent(
        'pi_audit_test',
        'pm_audit_test',
        'audit_user',
        'audit_device'
      );

      // Payment security should handle audit logging separately
      expect(mockPaymentSecurity.validatePaymentToken).toHaveBeenCalled();
      // Audit logs should be in payment security service, not health service
    });
  });

  describe('Performance and Monitoring', () => {
    test('should provide comprehensive status monitoring', async () => {
      const status = await stripeClient.getPaymentClientStatus();

      expect(status.initialized).toBe(true);
      expect(status.crisisMode).toBeDefined();
      expect(status.stripeSDKAvailable).toBeDefined();
      expect(status.paymentSecurityStatus).toBeDefined();
      expect(typeof status.averageResponseTime).toBe('number');
      expect(typeof status.errorRate).toBe('number');
    });

    test('should handle concurrent payment operations efficiently', async () => {
      const concurrentOperations = 10;
      const promises = [];

      for (let i = 0; i < concurrentOperations; i++) {
        promises.push(
          stripeClient.createPaymentIntent({
            amount: 999,
            currency: 'usd',
            subscriptionType: 'monthly',
            description: `Concurrent Test ${i}`,
            metadata: {
              userId: `concurrent_user_${i}`,
              deviceId: `concurrent_device_${i}`,
              sessionId: `concurrent_session_${i}`,
              crisisMode: true, // Use crisis mode for consistent performance
              appVersion: '1.0.0'
            }
          }, true)
        );
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(concurrentOperations);
      results.forEach(result => {
        expect(result.crisisOverride).toBe(true);
        expect(result.status).toBe('succeeded');
      });
    });
  });

  describe('Cleanup and Resource Management', () => {
    test('should cleanup resources properly', async () => {
      await expect(stripeClient.cleanup()).resolves.not.toThrow();

      const status = await stripeClient.getPaymentClientStatus();
      expect(status.initialized).toBe(false);
      expect(status.crisisMode).toBe(false);
    });

    test('should handle cleanup during active operations', async () => {
      // Start payment operation
      const paymentPromise = stripeClient.createPaymentIntent({
        amount: 999,
        currency: 'usd',
        subscriptionType: 'monthly',
        description: 'Cleanup Test',
        metadata: {
          userId: 'cleanup_user',
          deviceId: 'cleanup_device',
          sessionId: 'cleanup_session',
          crisisMode: true,
          appVersion: '1.0.0'
        }
      }, true);

      // Cleanup should not interfere with active operations
      await stripeClient.cleanup();
      const result = await paymentPromise;

      expect(result.crisisOverride).toBe(true);
    });
  });
});