/**
 * Payment Store Tests
 *
 * Comprehensive test suite for payment state management including:
 * - Crisis-safe payment state handling
 * - Zustand store integration testing
 * - Persistent storage testing
 * - Payment workflow state management
 * - Crisis mode state transitions
 */

import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  usePaymentStore,
  usePaymentActions,
  usePaymentStatus,
  useCrisisPaymentSafety,
  paymentSelectors
} from '../../src/store/paymentStore';
import {
  PaymentConfig,
  CustomerData,
  PaymentMethodData,
  PaymentError
} from '../../src/types/payment';
import { paymentAPIService } from '../../src/services/cloud/PaymentAPIService';

// Mock dependencies
jest.mock('../../src/services/cloud/PaymentAPIService');
jest.mock('../../src/services/security/EncryptionService');
jest.mock('@react-native-async-storage/async-storage');

describe('Payment Store', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset AsyncStorage
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

    // Mock payment API service
    (paymentAPIService.initialize as jest.Mock).mockResolvedValue(undefined);
    (paymentAPIService.isInitialized as jest.Mock).mockReturnValue(true);
    (paymentAPIService.getAvailablePlans as jest.Mock).mockResolvedValue([]);
  });

  describe('Store Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => usePaymentStore());

      expect(result.current.customer).toBeNull();
      expect(result.current.paymentMethods).toEqual([]);
      expect(result.current.activeSubscription).toBeNull();
      expect(result.current.availablePlans).toEqual([]);
      expect(result.current.currentPaymentIntent).toBeNull();
      expect(result.current.paymentInProgress).toBe(false);
      expect(result.current.lastPaymentError).toBeNull();
      expect(result.current.crisisMode).toBe(false);
      expect(result.current.crisisOverride).toBeNull();
      expect(result.current.securityValidated).toBe(false);
    });

    it('should initialize payments successfully', async () => {
      const { result } = renderHook(() => usePaymentStore());

      await act(async () => {
        await result.current.initializePayments(mockPaymentConfig);
      });

      expect(paymentAPIService.initialize).toHaveBeenCalledWith(mockPaymentConfig);
      expect(result.current.securityValidated).toBe(true);
    });

    it('should handle initialization failure with crisis mode', async () => {
      (paymentAPIService.initialize as jest.Mock).mockRejectedValue(
        new Error('Initialization failed')
      );

      const { result } = renderHook(() => usePaymentStore());

      await act(async () => {
        await result.current.initializePayments(mockPaymentConfig);
      });

      expect(result.current.crisisMode).toBe(true);
      expect(result.current.lastPaymentError).toBeDefined();
      expect(result.current.lastPaymentError?.userMessage).toContain('therapeutic features remain available');
    });
  });

  describe('Customer Management', () => {
    it('should load customer successfully', async () => {
      const mockCustomer = {
        customerId: 'cus_test123',
        userId: 'test_user_123',
        email: 'test@example.com',
        name: 'Test User',
        created: new Date().toISOString()
      };

      (paymentAPIService.getCustomer as jest.Mock).mockResolvedValue(mockCustomer);

      const { result } = renderHook(() => usePaymentStore());

      await act(async () => {
        await result.current.loadCustomer('test_user_123');
      });

      expect(result.current.customer).toEqual(mockCustomer);
      expect(result.current.loadingCustomer).toBe(false);
    });

    it('should handle customer loading during crisis mode', async () => {
      const { result } = renderHook(() => usePaymentStore());

      // Enable crisis mode first
      await act(async () => {
        await result.current.enableCrisisMode('mental_health_crisis');
      });

      await act(async () => {
        await result.current.loadCustomer('test_user_123');
      });

      expect(result.current.customer?.customerId).toContain('crisis_');
      expect(result.current.customer?.name).toBe('Emergency Access');
    });

    it('should create customer successfully', async () => {
      const mockCreatedCustomer = {
        customerId: 'cus_new123',
        userId: mockCustomerData.userId,
        email: mockCustomerData.email,
        name: mockCustomerData.name,
        created: new Date().toISOString()
      };

      (paymentAPIService.createCustomer as jest.Mock).mockResolvedValue(mockCreatedCustomer);

      const { result } = renderHook(() => usePaymentStore());

      await act(async () => {
        await result.current.createCustomer(mockCustomerData);
      });

      expect(result.current.customer).toEqual(mockCreatedCustomer);
      expect(result.current.loadingCustomer).toBe(false);
    });

    it('should update customer information', async () => {
      const mockUpdatedCustomer = {
        customerId: 'cus_test123',
        userId: 'test_user_123',
        email: 'updated@example.com',
        name: 'Updated Name',
        created: new Date().toISOString()
      };

      (paymentAPIService.updateCustomer as jest.Mock).mockResolvedValue(mockUpdatedCustomer);

      const { result } = renderHook(() => usePaymentStore());

      // Set initial customer
      act(() => {
        result.current.customer = {
          customerId: 'cus_test123',
          userId: 'test_user_123',
          email: 'test@example.com',
          name: 'Test User',
          created: new Date().toISOString()
        };
      });

      await act(async () => {
        await result.current.updateCustomerInfo({ name: 'Updated Name' });
      });

      expect(result.current.customer).toEqual(mockUpdatedCustomer);
    });
  });

  describe('Payment Method Management', () => {
    it('should load payment methods successfully', async () => {
      const mockPaymentMethods = [
        {
          paymentMethodId: 'pm_test123',
          type: 'card' as const,
          card: {
            brand: 'visa',
            last4: '4242',
            expiryMonth: 12,
            expiryYear: 2025
          },
          created: new Date().toISOString(),
          fingerprint: 'test_fingerprint',
          metadata: {
            deviceFingerprint: 'device123',
            riskAssessment: 'low' as const,
            verificationStatus: 'verified' as const
          }
        }
      ];

      (paymentAPIService.listPaymentMethods as jest.Mock).mockResolvedValue(mockPaymentMethods);

      const { result } = renderHook(() => usePaymentStore());

      // Set customer first
      act(() => {
        result.current.customer = {
          customerId: 'cus_test123',
          userId: 'test_user_123',
          email: 'test@example.com',
          name: 'Test User',
          created: new Date().toISOString()
        };
      });

      await act(async () => {
        await result.current.loadPaymentMethods();
      });

      expect(result.current.paymentMethods).toEqual(mockPaymentMethods);
      expect(result.current.loadingPaymentMethods).toBe(false);
    });

    it('should handle payment method loading during crisis mode', async () => {
      const { result } = renderHook(() => usePaymentStore());

      // Enable crisis mode
      await act(async () => {
        await result.current.enableCrisisMode('crisis_test');
      });

      // Set customer
      act(() => {
        result.current.customer = {
          customerId: 'cus_crisis',
          userId: 'crisis_user',
          email: 'crisis@example.com',
          name: 'Crisis User',
          created: new Date().toISOString()
        };
      });

      await act(async () => {
        await result.current.loadPaymentMethods();
      });

      // Should return empty array during crisis (no payment processing needed)
      expect(result.current.paymentMethods).toEqual([]);
    });

    it('should add payment method successfully', async () => {
      const mockPaymentMethod = {
        paymentMethodId: 'pm_new123',
        type: 'card' as const,
        card: {
          brand: 'visa',
          last4: '4242',
          expiryMonth: 12,
          expiryYear: 2025
        },
        created: new Date().toISOString(),
        fingerprint: 'new_fingerprint',
        metadata: {
          deviceFingerprint: 'device123',
          riskAssessment: 'low' as const,
          verificationStatus: 'verified' as const
        }
      };

      (paymentAPIService.createPaymentMethod as jest.Mock).mockResolvedValue(mockPaymentMethod);

      const { result } = renderHook(() => usePaymentStore());

      // Set customer
      act(() => {
        result.current.customer = {
          customerId: 'cus_test123',
          userId: 'test_user_123',
          email: 'test@example.com',
          name: 'Test User',
          created: new Date().toISOString()
        };
      });

      await act(async () => {
        await result.current.addPaymentMethod(mockPaymentMethodData);
      });

      expect(result.current.paymentMethods).toContain(mockPaymentMethod);
    });

    it('should remove payment method successfully', async () => {
      (paymentAPIService.deletePaymentMethod as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => usePaymentStore());

      // Set initial payment methods
      act(() => {
        result.current.paymentMethods = [
          {
            paymentMethodId: 'pm_to_remove',
            type: 'card',
            created: new Date().toISOString(),
            fingerprint: 'test',
            metadata: {
              deviceFingerprint: 'device',
              riskAssessment: 'low',
              verificationStatus: 'verified'
            }
          }
        ];
      });

      await act(async () => {
        await result.current.removePaymentMethod('pm_to_remove');
      });

      expect(result.current.paymentMethods).toEqual([]);
    });

    it('should set default payment method successfully', async () => {
      (paymentAPIService.setDefaultPaymentMethod as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => usePaymentStore());

      // Set customer and payment methods
      act(() => {
        result.current.customer = {
          customerId: 'cus_test123',
          userId: 'test_user_123',
          email: 'test@example.com',
          name: 'Test User',
          created: new Date().toISOString()
        };
        result.current.paymentMethods = [
          {
            paymentMethodId: 'pm_test123',
            type: 'card',
            created: new Date().toISOString(),
            fingerprint: 'test',
            metadata: {
              deviceFingerprint: 'device',
              riskAssessment: 'low',
              verificationStatus: 'verified'
            }
          }
        ];
      });

      await act(async () => {
        await result.current.setDefaultPaymentMethod('pm_test123');
      });

      expect(result.current.customer?.defaultPaymentMethod).toBe('pm_test123');
      expect(result.current.paymentMethods[0].isDefault).toBe(true);
    });
  });

  describe('Subscription Management', () => {
    it('should load subscription successfully', async () => {
      const { result } = renderHook(() => usePaymentStore());

      await act(async () => {
        await result.current.loadSubscription();
      });

      expect(result.current.loadingSubscription).toBe(false);
    });

    it('should create crisis subscription during crisis mode', async () => {
      const { result } = renderHook(() => usePaymentStore());

      // Enable crisis mode
      await act(async () => {
        await result.current.enableCrisisMode('subscription_crisis');
      });

      // Set customer
      act(() => {
        result.current.customer = {
          customerId: 'cus_crisis',
          userId: 'crisis_user',
          email: 'crisis@example.com',
          name: 'Crisis User',
          created: new Date().toISOString()
        };
      });

      await act(async () => {
        await result.current.loadSubscription();
      });

      expect(result.current.activeSubscription).toBeDefined();
      expect(result.current.activeSubscription?.subscriptionId).toContain('crisis_sub_');
      expect(result.current.activeSubscription?.status).toBe('active');
      expect(result.current.activeSubscription?.plan.amount).toBe(0);
      expect(result.current.activeSubscription?.plan.features).toContain('988 hotline integration');
    });

    it('should create subscription successfully', async () => {
      const mockSubscription = {
        subscriptionId: 'sub_test123',
        customerId: 'cus_test123',
        status: 'active' as const,
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
        plan: {
          planId: 'fullmind_monthly',
          name: 'FullMind Premium Monthly',
          description: 'Monthly subscription',
          amount: 999,
          currency: 'usd',
          interval: 'month' as const,
          features: ['All MBCT practices', 'Progress tracking']
        }
      };

      (paymentAPIService.createSubscription as jest.Mock).mockResolvedValue(mockSubscription);

      const { result } = renderHook(() => usePaymentStore());

      // Set customer
      act(() => {
        result.current.customer = {
          customerId: 'cus_test123',
          userId: 'test_user_123',
          email: 'test@example.com',
          name: 'Test User',
          created: new Date().toISOString()
        };
      });

      await act(async () => {
        await result.current.createSubscription('fullmind_monthly', 'pm_test123', 7);
      });

      expect(result.current.activeSubscription).toEqual(mockSubscription);
    });

    it('should cancel subscription successfully', async () => {
      const mockCanceledSubscription = {
        subscriptionId: 'sub_test123',
        customerId: 'cus_test123',
        status: 'active' as const,
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: true,
        plan: {
          planId: 'fullmind_monthly',
          name: 'FullMind Premium Monthly',
          description: 'Monthly subscription',
          amount: 999,
          currency: 'usd',
          interval: 'month' as const,
          features: ['All MBCT practices']
        }
      };

      (paymentAPIService.cancelSubscription as jest.Mock).mockResolvedValue(mockCanceledSubscription);

      const { result } = renderHook(() => usePaymentStore());

      // Set active subscription
      act(() => {
        result.current.activeSubscription = {
          subscriptionId: 'sub_test123',
          customerId: 'cus_test123',
          status: 'active',
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancelAtPeriodEnd: false,
          plan: {
            planId: 'fullmind_monthly',
            name: 'FullMind Premium Monthly',
            description: 'Monthly subscription',
            amount: 999,
            currency: 'usd',
            interval: 'month',
            features: ['All MBCT practices']
          }
        };
      });

      await act(async () => {
        await result.current.cancelSubscription(true);
      });

      expect(result.current.activeSubscription?.cancelAtPeriodEnd).toBe(true);
    });
  });

  describe('Crisis Management', () => {
    it('should enable crisis mode with proper state transitions', async () => {
      (paymentAPIService.enableCrisisMode as jest.Mock).mockResolvedValue({
        crisisSessionId: 'crisis_session_123',
        userId: 'test_user_123',
        deviceId: 'test_device_123',
        overrideReason: 'mental_health_crisis',
        overrideType: 'full_access',
        granted: new Date().toISOString(),
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        auditTrail: {
          triggerEvent: 'mental_health_crisis',
          safetyScore: 100,
          accessGranted: ['all_therapeutic_features', 'crisis_tools', 'emergency_contacts']
        }
      });

      const { result } = renderHook(() => usePaymentStore());

      await act(async () => {
        await result.current.enableCrisisMode('mental_health_crisis');
      });

      expect(result.current.crisisMode).toBe(true);
      expect(result.current.crisisOverride).toBeDefined();
      expect(result.current.crisisOverride?.overrideType).toBe('full_access');
      expect(result.current.lastPaymentError).toBeNull(); // Errors cleared during crisis
    });

    it('should handle crisis mode enablement failure with local emergency mode', async () => {
      (paymentAPIService.enableCrisisMode as jest.Mock).mockRejectedValue(
        new Error('Crisis API failed')
      );

      const { result } = renderHook(() => usePaymentStore());

      await act(async () => {
        await result.current.enableCrisisMode('api_failure_crisis');
      });

      // Should still enable crisis mode locally
      expect(result.current.crisisMode).toBe(true);
      expect(result.current.crisisOverride).toBeDefined();
      expect(result.current.crisisOverride?.crisisSessionId).toContain('emergency_');
    });

    it('should disable crisis mode successfully', async () => {
      (paymentAPIService.disableCrisisMode as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => usePaymentStore());

      // Enable crisis mode first
      act(() => {
        result.current.crisisMode = true;
        result.current.crisisOverride = {
          crisisSessionId: 'test_session',
          userId: 'test_user',
          deviceId: 'test_device',
          overrideReason: 'emergency_access',
          overrideType: 'full_access',
          granted: new Date().toISOString(),
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          auditTrail: {
            triggerEvent: 'test',
            safetyScore: 100,
            accessGranted: ['test']
          }
        };
      });

      await act(async () => {
        await result.current.disableCrisisMode();
      });

      expect(result.current.crisisMode).toBe(false);
      expect(result.current.crisisOverride).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle payment errors gracefully', () => {
      const mockError: PaymentError = {
        type: 'card_error',
        code: 'card_declined',
        message: 'Your card was declined.',
        retryable: true,
        crisisImpact: 'degraded',
        userMessage: 'Please try a different payment method.'
      };

      const { result } = renderHook(() => usePaymentStore());

      act(() => {
        result.current.handlePaymentError(mockError);
      });

      expect(result.current.lastPaymentError).toEqual(mockError);
    });

    it('should provide crisis-aware error handling', () => {
      const mockError = {
        type: 'api_error',
        message: 'Service unavailable'
      };

      const { result } = renderHook(() => usePaymentStore());

      // Enable crisis mode
      act(() => {
        result.current.crisisMode = true;
      });

      act(() => {
        result.current.handlePaymentError(mockError);
      });

      expect(result.current.lastPaymentError?.crisisImpact).toBe('none');
      expect(result.current.lastPaymentError?.userMessage).toContain('therapeutic features remain accessible');
    });

    it('should clear payment errors', () => {
      const { result } = renderHook(() => usePaymentStore());

      // Set an error first
      act(() => {
        result.current.lastPaymentError = {
          type: 'api_error',
          code: 'test_error',
          message: 'Test error',
          retryable: true,
          crisisImpact: 'none',
          userMessage: 'Test error message'
        };
      });

      act(() => {
        result.current.clearPaymentError();
      });

      expect(result.current.lastPaymentError).toBeNull();
    });
  });

  describe('UI State Management', () => {
    it('should manage payment sheet visibility', () => {
      const { result } = renderHook(() => usePaymentStore());

      act(() => {
        result.current.showPaymentSheet();
      });

      expect(result.current.showPaymentSheet).toBe(true);

      act(() => {
        result.current.hidePaymentSheet();
      });

      expect(result.current.showPaymentSheet).toBe(false);
    });

    it('should manage subscription selector visibility', () => {
      const { result } = renderHook(() => usePaymentStore());

      act(() => {
        result.current.showSubscriptionSelector();
      });

      expect(result.current.showSubscriptionSelector).toBe(true);

      act(() => {
        result.current.hideSubscriptionSelector();
      });

      expect(result.current.showSubscriptionSelector).toBe(false);
    });
  });

  describe('Store Reset and Cleanup', () => {
    it('should reset store state', () => {
      const { result } = renderHook(() => usePaymentStore());

      // Set some state
      act(() => {
        result.current.customer = {
          customerId: 'cus_test',
          userId: 'user_test',
          email: 'test@example.com',
          name: 'Test',
          created: new Date().toISOString()
        };
        result.current.crisisMode = true;
        result.current.paymentInProgress = true;
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.customer).toBeNull();
      expect(result.current.crisisMode).toBe(false);
      expect(result.current.paymentInProgress).toBe(false);
    });

    it('should clear sensitive data', () => {
      const { result } = renderHook(() => usePaymentStore());

      // Set sensitive data
      act(() => {
        result.current.paymentMethods = [{
          paymentMethodId: 'pm_sensitive',
          type: 'card',
          created: new Date().toISOString(),
          fingerprint: 'sensitive',
          metadata: {
            deviceFingerprint: 'device',
            riskAssessment: 'low',
            verificationStatus: 'verified'
          }
        }];
        result.current.currentPaymentIntent = {
          paymentIntentId: 'pi_sensitive',
          clientSecret: 'sensitive_secret',
          status: 'requires_payment_method',
          amount: 999,
          currency: 'usd',
          created: new Date().toISOString()
        };
      });

      act(() => {
        result.current.clearSensitiveData();
      });

      expect(result.current.paymentMethods).toEqual([]);
      expect(result.current.currentPaymentIntent).toBeNull();
    });
  });

  describe('Selectors', () => {
    it('should get subscription status with crisis awareness', () => {
      const { result } = renderHook(() => usePaymentStore());

      // Normal mode
      act(() => {
        result.current.activeSubscription = {
          subscriptionId: 'sub_test',
          customerId: 'cus_test',
          status: 'active',
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancelAtPeriodEnd: false,
          plan: {
            planId: 'test_plan',
            name: 'Test Plan',
            description: 'Test',
            amount: 999,
            currency: 'usd',
            interval: 'month',
            features: []
          }
        };
      });

      expect(paymentSelectors.getSubscriptionStatus(result.current)).toBe('active');

      // Crisis mode
      act(() => {
        result.current.crisisMode = true;
      });

      expect(paymentSelectors.getSubscriptionStatus(result.current)).toBe('crisis_access');
    });

    it('should get feature access with crisis consideration', () => {
      const { result } = renderHook(() => usePaymentStore());

      // No subscription - basic access
      const basicAccess = paymentSelectors.getFeatureAccess(result.current);
      expect(basicAccess.therapeuticContent).toBe(false);
      expect(basicAccess.crisisTools).toBe(true); // Always available
      expect(basicAccess.hotlineAccess).toBe(true); // Always available

      // Crisis mode - full access
      act(() => {
        result.current.crisisMode = true;
      });

      const crisisAccess = paymentSelectors.getFeatureAccess(result.current);
      expect(crisisAccess.therapeuticContent).toBe(true);
      expect(crisisAccess.premiumFeatures).toBe(true);
      expect(crisisAccess.crisisTools).toBe(true);
    });

    it('should get payment error with crisis awareness', () => {
      const { result } = renderHook(() => usePaymentStore());

      const testError: PaymentError = {
        type: 'api_error',
        code: 'service_unavailable',
        message: 'Service unavailable',
        retryable: true,
        crisisImpact: 'blocked',
        userMessage: 'Service temporarily unavailable'
      };

      act(() => {
        result.current.lastPaymentError = testError;
      });

      // Normal mode
      const normalError = paymentSelectors.getPaymentErrorForUser(result.current);
      expect(normalError?.crisisImpact).toBe('blocked');

      // Crisis mode
      act(() => {
        result.current.crisisMode = true;
      });

      const crisisError = paymentSelectors.getPaymentErrorForUser(result.current);
      expect(crisisError?.crisisImpact).toBe('none');
      expect(crisisError?.userMessage).toContain('therapeutic and safety features remain fully accessible');
    });

    it('should get performance metrics', () => {
      const { result } = renderHook(() => usePaymentStore());

      act(() => {
        result.current.crisisMode = true;
        result.current.activeSubscription = {
          subscriptionId: 'sub_test',
          customerId: 'cus_test',
          status: 'active',
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancelAtPeriodEnd: false,
          plan: {
            planId: 'test_plan',
            name: 'Test Plan',
            description: 'Test',
            amount: 999,
            currency: 'usd',
            interval: 'month',
            features: []
          }
        };
        result.current.paymentMethods = [
          {
            paymentMethodId: 'pm_test',
            type: 'card',
            created: new Date().toISOString(),
            fingerprint: 'test',
            metadata: {
              deviceFingerprint: 'device',
              riskAssessment: 'low',
              verificationStatus: 'verified'
            }
          }
        ];
      });

      const metrics = paymentSelectors.getPerformanceMetrics(result.current);

      expect(metrics.crisisModeEnabled).toBe(true);
      expect(metrics.hasActiveSubscription).toBe(true);
      expect(metrics.paymentMethodsCount).toBe(1);
    });
  });

  describe('Custom Hooks', () => {
    it('should provide payment actions through usePaymentActions', () => {
      const { result } = renderHook(() => usePaymentActions());

      expect(typeof result.current.initializePayments).toBe('function');
      expect(typeof result.current.loadCustomer).toBe('function');
      expect(typeof result.current.enableCrisisMode).toBe('function');
      expect(typeof result.current.showPaymentSheet).toBe('function');
    });

    it('should provide payment status through usePaymentStatus', () => {
      const { result: storeResult } = renderHook(() => usePaymentStore());
      const { result: statusResult } = renderHook(() => usePaymentStatus());

      expect(statusResult.current.subscriptionStatus).toBe('none');
      expect(statusResult.current.featureAccess).toBeDefined();
      expect(statusResult.current.crisisMode).toBe(false);
      expect(statusResult.current.isLoading).toBe(false);
    });

    it('should provide crisis payment safety through useCrisisPaymentSafety', () => {
      const { result: storeResult } = renderHook(() => usePaymentStore());
      const { result: crisisResult } = renderHook(() => useCrisisPaymentSafety());

      expect(crisisResult.current.crisisMode).toBe(false);
      expect(crisisResult.current.crisisOverride).toBeNull();
      expect(typeof crisisResult.current.enableCrisisMode).toBe('function');
      expect(typeof crisisResult.current.disableCrisisMode).toBe('function');
      expect(crisisResult.current.featureAccess).toBeDefined();
      expect(crisisResult.current.performanceMetrics).toBeDefined();
    });
  });
});