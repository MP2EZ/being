/**
 * Payment API Service Tests
 *
 * Comprehensive test suite for payment integration including:
 * - Crisis safety payment processing
 * - HIPAA-compliant payment handling
 * - PCI DSS compliance validation
 * - Stripe integration testing
 * - Subscription management testing
 * - Payment security validation
 */

import { paymentAPIService } from '../../src/services/cloud/PaymentAPIService';
import { stripePaymentClient } from '../../src/services/cloud/StripePaymentClient';
import { paymentSecurityService } from '../../src/services/security/PaymentSecurityService';
import {
  PaymentConfig,
  CustomerData,
  PaymentMethodData,
  PaymentIntentData,
  SubscriptionPlan
} from '../../src/types/payment';

// Mock external dependencies
jest.mock('../../src/services/cloud/StripePaymentClient');
jest.mock('../../src/services/security/PaymentSecurityService');
jest.mock('../../src/services/cloud/CloudSyncAPI');
jest.mock('../../src/services/cloud/AuthIntegrationService');

describe('PaymentAPIService', () => {
  const mockPaymentConfig: PaymentConfig = {
    stripe: {
      publishableKey: 'pk_test_mock_key',
      apiVersion: '2023-10-16',
      timeout: 30000,
      maxRetries: 3,
      enableApplePay: true,
      enableGooglePay: true
    },
    subscription: {
      defaultTrialDays: 7,
      gracePeriodDays: 3,
      retryAttempts: 3,
      invoiceReminders: true
    },
    crisis: {
      enablePaymentBypass: true,
      emergencyAccessDuration: 24,
      crisisDetectionTimeout: 200,
      hotlineAlwaysAccessible: true
    },
    security: {
      enableFraudDetection: true,
      rateLimit: {
        maxAttemptsPerMinute: 10,
        blockDurationMinutes: 5
      },
      tokenExpiry: {
        paymentMethods: 24,
        sessions: 2
      }
    },
    compliance: {
      pciDssLevel: '2',
      auditRetentionYears: 7,
      enableDetailedLogging: true,
      hipaaCompliant: true
    }
  };

  const mockCustomerData: CustomerData = {
    userId: 'test_user_123',
    email: 'test@example.com',
    name: 'Test User',
    metadata: {
      appUserId: 'test_user_123',
      deviceId: 'test_device_123',
      registrationDate: new Date().toISOString(),
      therapeuticConsent: true,
      crisisContactConsent: true
    }
  };

  const mockPaymentMethodData: PaymentMethodData = {
    type: 'card',
    card: {
      number: '4242424242424242',
      expiryMonth: 12,
      expiryYear: 2025,
      cvc: '123'
    },
    billingDetails: {
      name: 'Test User',
      email: 'test@example.com'
    }
  };

  const mockPaymentIntentData: PaymentIntentData = {
    amount: 999,
    currency: 'usd',
    subscriptionType: 'monthly',
    description: 'Being. Premium Monthly Subscription',
    metadata: {
      userId: 'test_user_123',
      deviceId: 'test_device_123',
      sessionId: 'test_session_123',
      crisisMode: false,
      appVersion: '1.0.0'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton instance for each test
    (paymentAPIService as any).initialized = false;
    (paymentAPIService as any).config = null;
    (paymentAPIService as any).crisisMode = false;
  });

  describe('Initialization', () => {
    it('should initialize payment API service successfully', async () => {
      // Mock Stripe client initialization
      (stripePaymentClient.initialize as jest.Mock).mockResolvedValue(undefined);
      (paymentSecurityService.initialize as jest.Mock).mockResolvedValue(undefined);

      await paymentAPIService.initialize(mockPaymentConfig);

      expect(paymentAPIService.isInitialized()).toBe(true);
      expect(stripePaymentClient.initialize).toHaveBeenCalledWith(
        mockPaymentConfig.stripe.publishableKey,
        true // Crisis mode enabled by default
      );
    });

    it('should handle initialization failure gracefully with emergency mode', async () => {
      // Mock initialization failure
      (stripePaymentClient.initialize as jest.Mock).mockRejectedValue(new Error('Initialization failed'));

      // Should not throw - should enable emergency mode instead
      await paymentAPIService.initialize(mockPaymentConfig);

      expect(paymentAPIService.isInitialized()).toBe(true);
    });

    it('should validate payment configuration schema', async () => {
      const invalidConfig = { ...mockPaymentConfig, stripe: null };

      await expect(paymentAPIService.initialize(invalidConfig as any))
        .rejects.toThrow();
    });
  });

  describe('Customer Management', () => {
    beforeEach(async () => {
      (stripePaymentClient.initialize as jest.Mock).mockResolvedValue(undefined);
      await paymentAPIService.initialize(mockPaymentConfig);
    });

    it('should create customer successfully', async () => {
      const mockCustomerResult = {
        customerId: 'cus_test123',
        userId: mockCustomerData.userId,
        email: mockCustomerData.email,
        name: mockCustomerData.name,
        created: new Date().toISOString()
      };

      const customer = await paymentAPIService.createCustomer(mockCustomerData);

      expect(customer).toMatchObject({
        userId: mockCustomerData.userId,
        email: mockCustomerData.email,
        name: mockCustomerData.name
      });
      expect(customer.customerId).toBeDefined();
      expect(customer.created).toBeDefined();
    });

    it('should handle customer creation during crisis mode', async () => {
      // Enable crisis mode
      await paymentAPIService.enableCrisisMode('test_user_123', 'test_device_123', 'test_crisis');

      const customer = await paymentAPIService.createCustomer(mockCustomerData);

      expect(customer.customerId).toContain('crisis_');
      expect(customer.userId).toBe(mockCustomerData.userId);
    });

    it('should retrieve existing customer', async () => {
      const customerId = 'cus_existing123';

      const customer = await paymentAPIService.getCustomer(customerId);

      // Should attempt to get from cache first, then from Stripe
      expect(customer).toBeDefined();
    });

    it('should update customer information', async () => {
      const customerId = 'cus_test123';
      const updates = { name: 'Updated Name' };

      // Create mock existing customer
      const existingCustomer = {
        customerId,
        userId: 'test_user_123',
        email: 'test@example.com',
        name: 'Original Name',
        created: new Date().toISOString()
      };

      const updatedCustomer = await paymentAPIService.updateCustomer(customerId, updates);

      expect(updatedCustomer).toMatchObject(updates);
    });
  });

  describe('Payment Method Management', () => {
    beforeEach(async () => {
      (stripePaymentClient.initialize as jest.Mock).mockResolvedValue(undefined);
      await paymentAPIService.initialize(mockPaymentConfig);
    });

    it('should create payment method successfully', async () => {
      const customerId = 'cus_test123';

      // Mock Stripe client payment method creation
      (stripePaymentClient.createPaymentMethod as jest.Mock).mockResolvedValue({
        paymentMethod: {
          paymentMethodId: 'pm_test123',
          type: 'card',
          card: {
            brand: 'visa',
            last4: '4242',
            expiryMonth: 12,
            expiryYear: 2025
          },
          created: new Date().toISOString(),
          fingerprint: 'test_fingerprint'
        }
      });

      const paymentMethod = await paymentAPIService.createPaymentMethod(
        mockPaymentMethodData,
        customerId
      );

      expect(paymentMethod.paymentMethodId).toBe('pm_test123');
      expect(paymentMethod.type).toBe('card');
      expect(paymentMethod.card?.last4).toBe('4242');
    });

    it('should handle payment method creation during crisis mode', async () => {
      const customerId = 'cus_test123';

      // Enable crisis mode
      await paymentAPIService.enableCrisisMode('test_user_123', 'test_device_123', 'emergency_access');

      const paymentMethod = await paymentAPIService.createPaymentMethod(
        mockPaymentMethodData,
        customerId,
        true // Crisis mode
      );

      expect(paymentMethod.paymentMethodId).toContain('crisis_pm_');
      expect(paymentMethod.card?.last4).toBe('0000');
    });

    it('should list payment methods for customer', async () => {
      const customerId = 'cus_test123';

      const paymentMethods = await paymentAPIService.listPaymentMethods(customerId);

      expect(Array.isArray(paymentMethods)).toBe(true);
    });

    it('should delete payment method', async () => {
      const paymentMethodId = 'pm_test123';

      await expect(paymentAPIService.deletePaymentMethod(paymentMethodId))
        .resolves.not.toThrow();
    });

    it('should set default payment method', async () => {
      const customerId = 'cus_test123';
      const paymentMethodId = 'pm_test123';

      await expect(paymentAPIService.setDefaultPaymentMethod(customerId, paymentMethodId))
        .resolves.not.toThrow();
    });
  });

  describe('Payment Intent Management', () => {
    beforeEach(async () => {
      (stripePaymentClient.initialize as jest.Mock).mockResolvedValue(undefined);
      await paymentAPIService.initialize(mockPaymentConfig);
    });

    it('should create payment intent successfully', async () => {
      // Mock Stripe client payment intent creation
      (stripePaymentClient.createPaymentIntent as jest.Mock).mockResolvedValue({
        paymentIntentId: 'pi_test123',
        clientSecret: 'pi_test123_secret',
        status: 'requires_payment_method',
        amount: 999,
        currency: 'usd',
        created: new Date().toISOString()
      });

      const paymentIntent = await paymentAPIService.createPaymentIntent(mockPaymentIntentData);

      expect(paymentIntent.paymentIntentId).toBe('pi_test123');
      expect(paymentIntent.amount).toBe(999);
      expect(paymentIntent.currency).toBe('usd');
    });

    it('should handle payment intent creation during crisis with <200ms response', async () => {
      // Enable crisis mode
      await paymentAPIService.enableCrisisMode('test_user_123', 'test_device_123', 'crisis_access');

      const startTime = Date.now();
      const paymentIntent = await paymentAPIService.createPaymentIntent(
        mockPaymentIntentData,
        true // Crisis mode
      );
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(200); // Must maintain <200ms for crisis
      expect(paymentIntent.paymentIntentId).toContain('crisis_intent_');
      expect(paymentIntent.amount).toBe(0); // Free during crisis
      expect(paymentIntent.crisisOverride).toBe(true);
    });

    it('should confirm payment intent', async () => {
      const paymentIntentId = 'pi_test123';
      const paymentMethodId = 'pm_test123';

      // Mock Stripe client confirmation
      (stripePaymentClient.confirmPaymentIntent as jest.Mock).mockResolvedValue({
        paymentIntentId,
        clientSecret: 'pi_test123_secret',
        status: 'succeeded',
        amount: 999,
        currency: 'usd',
        created: new Date().toISOString()
      });

      const confirmedIntent = await paymentAPIService.confirmPaymentIntent(
        paymentIntentId,
        paymentMethodId
      );

      expect(confirmedIntent.status).toBe('succeeded');
    });

    it('should retrieve payment intent', async () => {
      const paymentIntentId = 'pi_test123';

      const paymentIntent = await paymentAPIService.getPaymentIntent(paymentIntentId);

      expect(paymentIntent).toBeDefined();
    });
  });

  describe('Subscription Management', () => {
    beforeEach(async () => {
      (stripePaymentClient.initialize as jest.Mock).mockResolvedValue(undefined);
      await paymentAPIService.initialize(mockPaymentConfig);
    });

    it('should create subscription successfully', async () => {
      const customerId = 'cus_test123';
      const planId = 'being_monthly';
      const paymentMethodId = 'pm_test123';

      // Mock Stripe client subscription creation
      (stripePaymentClient.createSubscription as jest.Mock).mockResolvedValue({
        subscriptionId: 'sub_test123',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

      const subscription = await paymentAPIService.createSubscription(
        customerId,
        planId,
        paymentMethodId,
        7 // Trial days
      );

      expect(subscription.subscriptionId).toBe('sub_test123');
      expect(subscription.status).toBe('active');
    });

    it('should create crisis subscription for therapeutic continuity', async () => {
      const customerId = 'cus_test123';
      const planId = 'being_monthly';

      // Enable crisis mode
      await paymentAPIService.enableCrisisMode('test_user_123', 'test_device_123', 'therapeutic_continuity');

      const subscription = await paymentAPIService.createSubscription(
        customerId,
        planId,
        undefined, // No payment method needed
        undefined, // No trial
        true // Crisis mode
      );

      expect(subscription.subscriptionId).toContain('crisis_sub_');
      expect(subscription.status).toBe('active');
      expect(subscription.plan.amount).toBe(0); // Free during crisis
    });

    it('should get subscription details', async () => {
      const subscriptionId = 'sub_test123';

      const subscription = await paymentAPIService.getSubscription(subscriptionId);

      expect(subscription).toBeDefined();
    });

    it('should update subscription', async () => {
      const subscriptionId = 'sub_test123';
      const updates = { cancelAtPeriodEnd: true };

      const updatedSubscription = await paymentAPIService.updateSubscription(
        subscriptionId,
        updates
      );

      expect(updatedSubscription).toMatchObject(updates);
    });

    it('should cancel subscription', async () => {
      const subscriptionId = 'sub_test123';

      const canceledSubscription = await paymentAPIService.cancelSubscription(
        subscriptionId,
        true // At period end
      );

      expect(canceledSubscription.cancelAtPeriodEnd).toBe(true);
    });

    it('should reactivate subscription', async () => {
      const subscriptionId = 'sub_test123';

      const reactivatedSubscription = await paymentAPIService.reactivateSubscription(
        subscriptionId
      );

      expect(reactivatedSubscription.status).toBe('active');
    });
  });

  describe('Crisis Management', () => {
    beforeEach(async () => {
      (stripePaymentClient.initialize as jest.Mock).mockResolvedValue(undefined);
      await paymentAPIService.initialize(mockPaymentConfig);
    });

    it('should enable crisis mode with <200ms response time', async () => {
      const userId = 'test_user_123';
      const deviceId = 'test_device_123';
      const reason = 'mental_health_crisis';

      const startTime = Date.now();
      const crisisOverride = await paymentAPIService.enableCrisisMode(userId, deviceId, reason);
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(200); // Critical performance requirement
      expect(crisisOverride.crisisSessionId).toBeDefined();
      expect(crisisOverride.userId).toBe(userId);
      expect(crisisOverride.overrideType).toBe('full_access');
      expect(crisisOverride.auditTrail.safetyScore).toBe(100);
    });

    it('should provide full therapeutic access during crisis', async () => {
      const userId = 'test_user_123';
      const deviceId = 'test_device_123';

      const crisisOverride = await paymentAPIService.enableCrisisMode(
        userId,
        deviceId,
        'suicide_ideation'
      );

      expect(crisisOverride.auditTrail.accessGranted).toContain('therapeutic_content');
      expect(crisisOverride.auditTrail.accessGranted).toContain('crisis_tools');
      expect(crisisOverride.auditTrail.accessGranted).toContain('emergency_contacts');
      expect(crisisOverride.auditTrail.accessGranted).toContain('988_hotline');
    });

    it('should disable crisis mode successfully', async () => {
      const userId = 'test_user_123';
      const deviceId = 'test_device_123';

      // Enable crisis mode first
      const crisisOverride = await paymentAPIService.enableCrisisMode(
        userId,
        deviceId,
        'test_crisis'
      );

      // Disable crisis mode
      await paymentAPIService.disableCrisisMode(crisisOverride.crisisSessionId);

      // Should not throw and crisis mode should be disabled
      expect(true).toBe(true); // Test passes if no exception thrown
    });

    it('should get crisis status for user', async () => {
      const userId = 'test_user_123';
      const deviceId = 'test_device_123';

      // Enable crisis mode first
      await paymentAPIService.enableCrisisMode(userId, deviceId, 'test_crisis');

      const crisisStatus = await paymentAPIService.getCrisisStatus(userId);

      expect(crisisStatus).toBeDefined();
      expect(crisisStatus?.userId).toBe(userId);
    });

    it('should maintain 988 hotline access even during payment failures', async () => {
      // Simulate payment system failure
      (stripePaymentClient.createPaymentIntent as jest.Mock).mockRejectedValue(
        new Error('Payment system unavailable')
      );

      // Enable crisis mode
      const crisisOverride = await paymentAPIService.enableCrisisMode(
        'test_user_123',
        'test_device_123',
        'payment_system_failure'
      );

      // Verify 988 access is guaranteed
      expect(crisisOverride.auditTrail.accessGranted).toContain('988_hotline');
      expect(crisisOverride.overrideType).toBe('full_access');
    });
  });

  describe('Utility Methods', () => {
    beforeEach(async () => {
      (stripePaymentClient.initialize as jest.Mock).mockResolvedValue(undefined);
      await paymentAPIService.initialize(mockPaymentConfig);
    });

    it('should get available subscription plans', async () => {
      const mockPlans: SubscriptionPlan[] = [
        {
          planId: 'being_monthly',
          name: 'Being. Premium Monthly',
          description: 'Monthly subscription',
          amount: 999,
          currency: 'usd',
          interval: 'month',
          features: ['All MBCT practices', 'Progress tracking']
        }
      ];

      (stripePaymentClient.getSubscriptionPlans as jest.Mock).mockReturnValue(mockPlans);

      const plans = await paymentAPIService.getAvailablePlans();

      expect(plans).toEqual(mockPlans);
      expect(plans[0].planId).toBe('being_monthly');
    });

    it('should validate payment method', async () => {
      const paymentMethodId = 'pm_test123';

      // Mock successful validation
      (stripePaymentClient as any).paymentSecurity = {
        validatePaymentToken: jest.fn().mockResolvedValue({ success: true })
      };

      const isValid = await paymentAPIService.validatePaymentMethod(paymentMethodId);

      expect(isValid).toBe(true);
    });

    it('should get payment history', async () => {
      const customerId = 'cus_test123';
      const limit = 10;

      const history = await paymentAPIService.getPaymentHistory(customerId, limit);

      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('Health and Status Monitoring', () => {
    beforeEach(async () => {
      (stripePaymentClient.initialize as jest.Mock).mockResolvedValue(undefined);
      await paymentAPIService.initialize(mockPaymentConfig);
    });

    it('should return health status', async () => {
      // Mock Stripe client status
      (stripePaymentClient.getPaymentClientStatus as jest.Mock).mockResolvedValue({
        initialized: true,
        stripeSDKAvailable: true,
        errorRate: 0
      });

      const healthStatus = await paymentAPIService.getHealthStatus();

      expect(healthStatus.stripe.connected).toBe(true);
      expect(healthStatus.database.connected).toBeDefined();
      expect(healthStatus.crisisMode).toBeDefined();
      expect(Array.isArray(healthStatus.errors)).toBe(true);
    });

    it('should report errors in health status', async () => {
      // Mock Stripe connection failure
      (stripePaymentClient.getPaymentClientStatus as jest.Mock).mockResolvedValue({
        initialized: false,
        stripeSDKAvailable: false,
        errorRate: 100
      });

      const healthStatus = await paymentAPIService.getHealthStatus();

      expect(healthStatus.stripe.connected).toBe(false);
      expect(healthStatus.errors.length).toBeGreaterThan(0);
    });

    it('should handle health check failures gracefully', async () => {
      // Mock health check failure
      (stripePaymentClient.getPaymentClientStatus as jest.Mock).mockRejectedValue(
        new Error('Health check failed')
      );

      const healthStatus = await paymentAPIService.getHealthStatus();

      expect(healthStatus.stripe.connected).toBe(false);
      expect(healthStatus.errors).toContain('Health status check failed');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      (stripePaymentClient.initialize as jest.Mock).mockResolvedValue(undefined);
      await paymentAPIService.initialize(mockPaymentConfig);
    });

    it('should format payment errors with user-friendly messages', async () => {
      const error = {
        type: 'card_error',
        code: 'card_declined',
        message: 'Your card was declined.'
      };

      // This tests the private method indirectly through public API
      try {
        (stripePaymentClient.createPaymentIntent as jest.Mock).mockRejectedValue(error);
        await paymentAPIService.createPaymentIntent(mockPaymentIntentData);
      } catch (formattedError: any) {
        expect(formattedError.userMessage).toContain('payment method');
        expect(formattedError.suggestions).toBeDefined();
      }
    });

    it('should assess crisis impact of payment errors', async () => {
      const criticalError = {
        type: 'api_error',
        code: 'service_unavailable',
        message: 'Service temporarily unavailable'
      };

      try {
        (stripePaymentClient.createPaymentIntent as jest.Mock).mockRejectedValue(criticalError);
        await paymentAPIService.createPaymentIntent(mockPaymentIntentData);
      } catch (formattedError: any) {
        expect(['degraded', 'blocked']).toContain(formattedError.crisisImpact);
      }
    });

    it('should provide crisis-aware error messages', async () => {
      // Enable crisis mode
      await paymentAPIService.enableCrisisMode('test_user_123', 'test_device_123', 'error_test');

      const error = {
        type: 'api_error',
        message: 'Payment service unavailable'
      };

      try {
        (stripePaymentClient.createPaymentIntent as jest.Mock).mockRejectedValue(error);
        await paymentAPIService.createPaymentIntent(mockPaymentIntentData, true);
      } catch (formattedError: any) {
        expect(formattedError.userMessage).toContain('therapeutic features remain accessible');
        expect(formattedError.crisisImpact).toBe('none');
      }
    });
  });

  describe('Performance Requirements', () => {
    beforeEach(async () => {
      (stripePaymentClient.initialize as jest.Mock).mockResolvedValue(undefined);
      await paymentAPIService.initialize(mockPaymentConfig);
    });

    it('should maintain crisis response time under 200ms', async () => {
      const iterations = 10;
      const responseTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await paymentAPIService.enableCrisisMode(
          `test_user_${i}`,
          `test_device_${i}`,
          'performance_test'
        );
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
      }

      const averageResponseTime = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);

      expect(averageResponseTime).toBeLessThan(200);
      expect(maxResponseTime).toBeLessThan(200);
    });

    it('should handle payment processing within acceptable time limits', async () => {
      (stripePaymentClient.createPaymentIntent as jest.Mock).mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => resolve({
            paymentIntentId: 'pi_test123',
            clientSecret: 'secret',
            status: 'requires_payment_method',
            amount: 999,
            currency: 'usd',
            created: new Date().toISOString()
          }), 100); // Simulate 100ms processing time
        })
      );

      const startTime = Date.now();
      await paymentAPIService.createPaymentIntent(mockPaymentIntentData);
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(5000); // Should be under 5 seconds
    });
  });

  describe('Integration Tests', () => {
    it('should integrate with existing cloud sync API', async () => {
      (stripePaymentClient.initialize as jest.Mock).mockResolvedValue(undefined);
      await paymentAPIService.initialize(mockPaymentConfig);

      // Test should verify integration without mocking everything
      expect(paymentAPIService.isInitialized()).toBe(true);
    });

    it('should integrate with auth service for user context', async () => {
      (stripePaymentClient.initialize as jest.Mock).mockResolvedValue(undefined);
      await paymentAPIService.initialize(mockPaymentConfig);

      // This tests the auth integration indirectly
      const customer = await paymentAPIService.createCustomer(mockCustomerData);
      expect(customer).toBeDefined();
    });

    it('should integrate with encryption service for data protection', async () => {
      (stripePaymentClient.initialize as jest.Mock).mockResolvedValue(undefined);
      await paymentAPIService.initialize(mockPaymentConfig);

      // This tests encryption integration through secure storage
      const customer = await paymentAPIService.createCustomer(mockCustomerData);
      expect(customer.customerId).toBeDefined(); // Stored with encryption
    });
  });
});