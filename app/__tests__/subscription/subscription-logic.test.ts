/**
 * Subscription Logic Testing Suite
 * Day 17 Phase 5: Comprehensive subscription system validation
 *
 * Testing:
 * - Trial-to-paid conversion flows
 * - Grace period handling during payment failures
 * - Subscription tier changes and feature access updates
 * - Crisis extension logic for trial subscriptions
 * - Subscription cancellation with retention flows
 */

import { renderHook, act } from '@testing-library/react-native';
import { useSubscriptionStore } from '../../src/store/subscriptionStore';
import {
  SubscriptionState,
  TrialState,
  SubscriptionTier,
  FeatureAccessResult,
  SubscriptionError,
  SUBSCRIPTION_CONSTANTS
} from '../../src/types/subscription';

// Mock dependencies
jest.mock('../../src/services/storage/SecureDataStore', () => ({
  secureDataStore: {
    getSubscriptionState: jest.fn().mockResolvedValue(null),
    saveSubscriptionState: jest.fn().mockResolvedValue(undefined),
    getTrialState: jest.fn().mockResolvedValue(null),
    saveTrialState: jest.fn().mockResolvedValue(undefined),
    getFeatureCache: jest.fn().mockResolvedValue({}),
    saveFeatureCache: jest.fn().mockResolvedValue(undefined),
    clearCache: jest.fn().mockResolvedValue(undefined),
    validateEncryption: jest.fn().mockResolvedValue(true)
  }
}));

jest.mock('../../src/services/PaymentService', () => ({
  paymentService: {
    validateSubscription: jest.fn().mockResolvedValue({
      tier: 'free',
      status: 'active',
      validationLatency: 45
    }),
    processUpgrade: jest.fn().mockResolvedValue({
      success: true,
      subscriptionId: 'sub_test_123',
      tier: 'premium'
    }),
    cancelSubscription: jest.fn().mockResolvedValue({
      success: true,
      cancelAtPeriodEnd: true
    }),
    retryPayment: jest.fn().mockResolvedValue({
      success: true,
      nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })
  }
}));

jest.mock('../../src/services/CrisisProtectionService', () => ({
  crisisProtectionService: {
    isInCrisisMode: jest.fn().mockReturnValue(false),
    measureResponseTime: jest.fn().mockResolvedValue(150),
    activateCrisisMode: jest.fn().mockResolvedValue(undefined),
    deactivateCrisisMode: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('Subscription Logic Testing Suite', () => {
  let subscriptionStore: ReturnType<typeof useSubscriptionStore>;

  beforeEach(() => {
    subscriptionStore = useSubscriptionStore.getState();

    // Reset to initial state
    useSubscriptionStore.setState({
      subscription: {
        tier: 'free',
        status: 'active',
        crisisAccessGuaranteed: true,
        crisisFeatureOverrides: [],
        lastValidated: new Date().toISOString(),
        validationLatency: 0
      },
      trial: null,
      validationCache: {},
      performanceMetrics: {
        validationLatency: { avg: 0, p50: 0, p95: 0, p99: 0, max: 0 },
        crisisResponseTime: { avg: 150, max: 200, violations: 0 },
        cacheMetrics: { hitRate: 0.95, missRate: 0.05, invalidationRate: 0.01, averageSize: 1024 },
        errorMetrics: { validationErrors: 0, timeoutErrors: 0, networkErrors: 0, totalErrors: 0, errorRate: 0 },
        usageMetrics: { totalValidations: 0, uniqueFeatures: 0, peakValidationsPerSecond: 10, averageValidationsPerUser: 50 },
        periodStart: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        periodEnd: new Date().toISOString(),
        sampleCount: 1000
      },
      lastError: null,
      retryQueue: [],
      isValidating: false,
      isUpdating: false,
      isInitialized: false,
      crisisMode: false,
      crisisOverrides: []
    });
  });

  describe('1. Trial-to-Paid Conversion Flows', () => {
    test('successful trial start and configuration', async () => {
      const startTime = performance.now();

      await act(async () => {
        const trialState = await subscriptionStore.startTrial('premium', 7);

        expect(trialState.isActive).toBe(true);
        expect(trialState.daysRemaining).toBe(7);
        expect(trialState.originalDuration).toBe(7);
        expect(trialState.extendedForCrisis).toBe(false);
        expect(trialState.crisisExtensionDays).toBe(0);
        expect(trialState.gracePeriodActive).toBe(false);
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(500); // Trial start <500ms
    });

    test('trial conversion to premium subscription', async () => {
      // Set up active trial
      const trialState: TrialState = {
        isActive: true,
        daysRemaining: 3,
        originalDuration: 7,
        startDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        extendedForCrisis: false,
        crisisExtensionDays: 0,
        gracePeriodActive: false
      };

      useSubscriptionStore.setState({
        subscription: {
          ...subscriptionStore.subscription,
          status: 'trialing',
          trial: trialState
        },
        trial: {
          current: trialState,
          history: [],
          eligibility: {
            canStartTrial: false,
            availableTrialDays: 0,
            maxExtensions: 2,
            extensionsUsed: 0
          },
          crisisExtensions: {
            available: true,
            maxDays: 14,
            daysUsed: 0,
            autoExtendInCrisis: true
          },
          conversionMetrics: {
            featuresUsed: ['cloud_sync', 'advanced_analytics'],
            engagementScore: 0.85,
            likelihoodToConvert: 0.92
          }
        }
      });

      await act(async () => {
        const conversionResult = await subscriptionStore.upgrade('premium');

        expect(subscriptionStore.subscription.tier).toBe('premium');
        expect(subscriptionStore.subscription.status).toBe('active');
        expect(subscriptionStore.subscription.subscriptionId).toBe('sub_test_123');
        expect(subscriptionStore.trial?.current?.isActive).toBe(false);
      });
    });

    test('trial expiration with grace period activation', async () => {
      const expiredTrial: TrialState = {
        isActive: false,
        daysRemaining: 0,
        originalDuration: 7,
        startDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        extendedForCrisis: false,
        crisisExtensionDays: 0,
        gracePeriodActive: true,
        gracePeriodEndDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
      };

      useSubscriptionStore.setState({
        subscription: {
          ...subscriptionStore.subscription,
          status: 'incomplete',
          trial: expiredTrial
        }
      });

      const featureAccess = await subscriptionStore.validateFeatureAccess('cloud_sync');

      expect(featureAccess.reason).toBe('grace_period');
      expect(featureAccess.hasAccess).toBe(true);
      expect(featureAccess.userMessage).toContain('grace period');
      expect(featureAccess.actionLabel).toBe('Complete Payment');
    });

    test('trial extension during crisis', async () => {
      const { crisisProtectionService } = require('../../src/services/CrisisProtectionService');
      crisisProtectionService.isInCrisisMode.mockReturnValue(true);

      const activeTrial: TrialState = {
        isActive: true,
        daysRemaining: 1,
        originalDuration: 7,
        startDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        extendedForCrisis: false,
        crisisExtensionDays: 0,
        gracePeriodActive: false
      };

      useSubscriptionStore.setState({
        subscription: {
          ...subscriptionStore.subscription,
          status: 'trialing',
          trial: activeTrial
        },
        crisisMode: true
      });

      await act(async () => {
        const extendedTrial = await subscriptionStore.extendTrial(14, 'Crisis intervention');

        expect(extendedTrial.extendedForCrisis).toBe(true);
        expect(extendedTrial.crisisExtensionDays).toBe(14);
        expect(extendedTrial.daysRemaining).toBe(15); // 1 + 14
        expect(extendedTrial.isActive).toBe(true);
      });
    });
  });

  describe('2. Grace Period and Payment Failure Handling', () => {
    test('payment failure triggers grace period', async () => {
      const subscriptionWithFailedPayment: SubscriptionState = {
        tier: 'premium',
        status: 'past_due',
        subscriptionId: 'sub_test_123',
        customerId: 'cus_test_123',
        planId: 'plan_premium_monthly',
        currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        lastPaymentDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        nextPaymentDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        paymentMethodValid: false,
        cancelAtPeriodEnd: false,
        crisisAccessGuaranteed: true,
        crisisFeatureOverrides: [],
        lastValidated: new Date().toISOString(),
        validationLatency: 75
      };

      useSubscriptionStore.setState({
        subscription: subscriptionWithFailedPayment
      });

      const featureAccess = await subscriptionStore.validateFeatureAccess('cloud_sync');

      expect(featureAccess.reason).toBe('payment_failed');
      expect(featureAccess.hasAccess).toBe(false);
      expect(featureAccess.userMessage).toContain('payment');
      expect(featureAccess.actionLabel).toBe('Update Payment');
    });

    test('grace period feature access with limitations', async () => {
      const gracePeriodSubscription: SubscriptionState = {
        tier: 'premium',
        status: 'past_due',
        subscriptionId: 'sub_test_123',
        currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        paymentMethodValid: false,
        crisisAccessGuaranteed: true,
        crisisFeatureOverrides: ['crisis_button', 'breathing_exercises'],
        lastValidated: new Date().toISOString(),
        validationLatency: 85
      };

      useSubscriptionStore.setState({
        subscription: gracePeriodSubscription
      });

      // Crisis features should remain accessible
      const crisisAccess = await subscriptionStore.validateFeatureAccess('crisis_button');
      expect(crisisAccess.hasAccess).toBe(true);
      expect(crisisAccess.reason).toBe('crisis_override');

      // Premium features should be limited
      const premiumAccess = await subscriptionStore.validateFeatureAccess('advanced_analytics');
      expect(premiumAccess.hasAccess).toBe(false);
      expect(premiumAccess.reason).toBe('payment_failed');
    });

    test('successful payment retry and restoration', async () => {
      const { paymentService } = require('../../src/services/PaymentService');

      useSubscriptionStore.setState({
        subscription: {
          ...subscriptionStore.subscription,
          tier: 'premium',
          status: 'past_due',
          paymentMethodValid: false
        }
      });

      await act(async () => {
        await subscriptionStore.retryFailedValidation('payment_retry');

        expect(paymentService.retryPayment).toHaveBeenCalled();
        expect(subscriptionStore.subscription.status).toBe('active');
        expect(subscriptionStore.subscription.paymentMethodValid).toBe(true);
      });
    });
  });

  describe('3. Subscription Tier Changes and Feature Access', () => {
    test('premium to family tier upgrade', async () => {
      useSubscriptionStore.setState({
        subscription: {
          ...subscriptionStore.subscription,
          tier: 'premium',
          status: 'active',
          subscriptionId: 'sub_premium_123'
        }
      });

      await act(async () => {
        await subscriptionStore.upgrade('family');

        expect(subscriptionStore.subscription.tier).toBe('family');
        expect(subscriptionStore.subscription.status).toBe('active');
      });

      // Validate new feature access
      const familyFeatureAccess = await subscriptionStore.validateFeatureAccess('family_sharing');
      expect(familyFeatureAccess.hasAccess).toBe(true);
      expect(familyFeatureAccess.reason).toBe('granted');
    });

    test('tier downgrade with feature access limitations', async () => {
      useSubscriptionStore.setState({
        subscription: {
          ...subscriptionStore.subscription,
          tier: 'family',
          status: 'active',
          cancelAtPeriodEnd: true,
          currentPeriodEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
        }
      });

      // Simulate period end downgrade
      useSubscriptionStore.setState({
        subscription: {
          ...subscriptionStore.subscription,
          tier: 'free',
          status: 'active',
          cancelAtPeriodEnd: false
        }
      });

      const familyFeatureAccess = await subscriptionStore.validateFeatureAccess('family_sharing');
      expect(familyFeatureAccess.hasAccess).toBe(false);
      expect(familyFeatureAccess.reason).toBe('tier_insufficient');
      expect(familyFeatureAccess.upgradeInfo?.recommendedTier).toBe('family');
    });

    test('feature access validation performance during tier changes', async () => {
      const features = ['cloud_sync', 'advanced_analytics', 'family_sharing', 'crisis_button'];

      const startTime = performance.now();

      await act(async () => {
        const accessResults = await subscriptionStore.checkMultipleFeatures(features);

        Object.values(accessResults).forEach(result => {
          expect(result.validationTime).toBeLessThan(SUBSCRIPTION_CONSTANTS.MAX_VALIDATION_LATENCY);
        });
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(400); // Multiple feature validation <400ms
    });
  });

  describe('4. Crisis Extension Logic', () => {
    test('automatic crisis extension for trials', async () => {
      const { crisisProtectionService } = require('../../src/services/CrisisProtectionService');
      crisisProtectionService.isInCrisisMode.mockReturnValue(true);

      const trialNearExpiry: TrialState = {
        isActive: true,
        daysRemaining: 0,
        originalDuration: 7,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
        extendedForCrisis: false,
        crisisExtensionDays: 0,
        gracePeriodActive: false
      };

      useSubscriptionStore.setState({
        subscription: {
          ...subscriptionStore.subscription,
          status: 'trialing',
          trial: trialNearExpiry
        },
        trial: {
          current: trialNearExpiry,
          history: [],
          eligibility: {
            canStartTrial: false,
            availableTrialDays: 0,
            maxExtensions: 2,
            extensionsUsed: 0
          },
          crisisExtensions: {
            available: true,
            maxDays: 14,
            daysUsed: 0,
            autoExtendInCrisis: true
          },
          conversionMetrics: {
            featuresUsed: ['crisis_button', 'breathing_exercises'],
            engagementScore: 0.65,
            likelihoodToConvert: 0.30
          }
        },
        crisisMode: true
      });

      await act(async () => {
        await subscriptionStore.activateCrisisOverride(['crisis_button', 'breathing_exercises']);

        expect(subscriptionStore.trial?.current?.extendedForCrisis).toBe(true);
        expect(subscriptionStore.trial?.current?.crisisExtensionDays).toBe(14);
        expect(subscriptionStore.trial?.current?.isActive).toBe(true);
      });
    });

    test('crisis feature access regardless of subscription status', async () => {
      const { crisisProtectionService } = require('../../src/services/CrisisProtectionService');
      crisisProtectionService.isInCrisisMode.mockReturnValue(true);

      useSubscriptionStore.setState({
        subscription: {
          ...subscriptionStore.subscription,
          tier: 'free',
          status: 'canceled'
        },
        crisisMode: true,
        crisisOverrides: ['crisis_button', 'breathing_exercises', 'emergency_contacts']
      });

      const crisisFeatures = ['crisis_button', 'breathing_exercises', 'emergency_contacts'];

      for (const feature of crisisFeatures) {
        const access = await subscriptionStore.validateFeatureAccess(feature);
        expect(access.hasAccess).toBe(true);
        expect(access.reason).toBe('crisis_override');
        expect(access.validationTime).toBeLessThan(SUBSCRIPTION_CONSTANTS.CRISIS_RESPONSE_MAX_LATENCY);
      }
    });

    test('crisis mode deactivation restores normal subscription rules', async () => {
      const { crisisProtectionService } = require('../../src/services/CrisisProtectionService');

      // Start in crisis mode
      crisisProtectionService.isInCrisisMode.mockReturnValue(true);

      useSubscriptionStore.setState({
        subscription: {
          ...subscriptionStore.subscription,
          tier: 'free',
          status: 'active'
        },
        crisisMode: true,
        crisisOverrides: ['advanced_analytics']
      });

      let access = await subscriptionStore.validateFeatureAccess('advanced_analytics');
      expect(access.hasAccess).toBe(true);
      expect(access.reason).toBe('crisis_override');

      // Deactivate crisis mode
      crisisProtectionService.isInCrisisMode.mockReturnValue(false);

      await act(async () => {
        await subscriptionStore.deactivateCrisisOverride();
      });

      access = await subscriptionStore.validateFeatureAccess('advanced_analytics');
      expect(access.hasAccess).toBe(false);
      expect(access.reason).toBe('tier_insufficient');
    });
  });

  describe('5. Subscription Cancellation with Retention', () => {
    test('subscription cancellation with end-of-period retention', async () => {
      useSubscriptionStore.setState({
        subscription: {
          ...subscriptionStore.subscription,
          tier: 'premium',
          status: 'active',
          subscriptionId: 'sub_premium_123',
          currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
        }
      });

      await act(async () => {
        await subscriptionStore.cancelSubscription();

        expect(subscriptionStore.subscription.cancelAtPeriodEnd).toBe(true);
        expect(subscriptionStore.subscription.status).toBe('active'); // Still active until period end
      });

      // Features should remain accessible until period end
      const featureAccess = await subscriptionStore.validateFeatureAccess('cloud_sync');
      expect(featureAccess.hasAccess).toBe(true);
      expect(featureAccess.userMessage).toContain('until');
    });

    test('immediate cancellation with feature access termination', async () => {
      const { paymentService } = require('../../src/services/PaymentService');
      paymentService.cancelSubscription.mockResolvedValueOnce({
        success: true,
        cancelAtPeriodEnd: false,
        effectiveDate: new Date().toISOString()
      });

      useSubscriptionStore.setState({
        subscription: {
          ...subscriptionStore.subscription,
          tier: 'premium',
          status: 'active',
          subscriptionId: 'sub_premium_123'
        }
      });

      await act(async () => {
        await subscriptionStore.cancelSubscription();

        expect(subscriptionStore.subscription.status).toBe('canceled');
        expect(subscriptionStore.subscription.tier).toBe('free');
      });

      const featureAccess = await subscriptionStore.validateFeatureAccess('cloud_sync');
      expect(featureAccess.hasAccess).toBe(false);
      expect(featureAccess.reason).toBe('tier_insufficient');
    });

    test('retention flow with trial extension offer', async () => {
      useSubscriptionStore.setState({
        subscription: {
          ...subscriptionStore.subscription,
          tier: 'premium',
          status: 'active',
          cancelAtPeriodEnd: true
        },
        trial: {
          current: null,
          history: [
            {
              startDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
              endDate: new Date(Date.now() - 38 * 24 * 60 * 60 * 1000).toISOString(),
              duration: 7,
              tier: 'premium',
              completedNormally: true,
              crisisExtended: false,
              conversionOutcome: 'converted'
            }
          ],
          eligibility: {
            canStartTrial: false,
            reasonIfNot: 'Already converted from trial',
            availableTrialDays: 0,
            maxExtensions: 2,
            extensionsUsed: 0
          },
          crisisExtensions: {
            available: true,
            maxDays: 14,
            daysUsed: 0,
            autoExtendInCrisis: true
          },
          conversionMetrics: {
            daysToConversion: 6,
            featuresUsed: ['cloud_sync', 'advanced_analytics'],
            engagementScore: 0.88,
            likelihoodToConvert: 0.95
          }
        }
      });

      // Since user already converted from trial, no additional trial should be offered
      expect(subscriptionStore.trial?.eligibility.canStartTrial).toBe(false);
      expect(subscriptionStore.trial?.eligibility.reasonIfNot).toContain('Already converted');
    });
  });

  describe('6. Performance and Error Handling', () => {
    test('subscription validation performance requirements', async () => {
      const iterations = 10;
      const validationTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await subscriptionStore.validateSubscription(false);
        const endTime = performance.now();
        validationTimes.push(endTime - startTime);
      }

      const avgTime = validationTimes.reduce((a, b) => a + b, 0) / iterations;
      const maxTime = Math.max(...validationTimes);

      expect(avgTime).toBeLessThan(SUBSCRIPTION_CONSTANTS.MAX_VALIDATION_LATENCY);
      expect(maxTime).toBeLessThan(SUBSCRIPTION_CONSTANTS.MAX_VALIDATION_LATENCY * 2);
    });

    test('error handling with therapeutic messaging', async () => {
      const { paymentService } = require('../../src/services/PaymentService');
      paymentService.validateSubscription.mockRejectedValueOnce(new Error('Network timeout'));

      await act(async () => {
        await subscriptionStore.validateSubscription(true);

        expect(subscriptionStore.lastError).toBeTruthy();
        expect(subscriptionStore.lastError?.code).toBe('NETWORK_ERROR');
        expect(subscriptionStore.lastError?.therapeuticGuidance).toContain('mindful');
        expect(subscriptionStore.lastError?.primaryAction.action).toBe('try_again');
      });
    });

    test('cache performance and hit rate optimization', async () => {
      // Warm up cache
      await subscriptionStore.warmupCache(['cloud_sync', 'advanced_analytics', 'family_sharing']);

      const startTime = performance.now();

      // Multiple cache hits
      for (let i = 0; i < 20; i++) {
        const result = await subscriptionStore.validateFeatureAccess('cloud_sync');
        expect(result.cacheHit).toBe(true);
        expect(result.validationTime).toBeLessThan(10); // Cache hits should be very fast
      }

      const endTime = performance.now();
      const avgTimePerValidation = (endTime - startTime) / 20;

      expect(avgTimePerValidation).toBeLessThan(5); // <5ms per cached validation
      expect(subscriptionStore.performanceMetrics.cacheMetrics.hitRate).toBeGreaterThan(0.9);
    });

    test('concurrent subscription operations', async () => {
      const operations = [
        subscriptionStore.validateFeatureAccess('cloud_sync'),
        subscriptionStore.validateFeatureAccess('advanced_analytics'),
        subscriptionStore.validateFeatureAccess('family_sharing'),
        subscriptionStore.validateSubscription(false),
        subscriptionStore.recordValidationMetric('cloud_sync', 75, true)
      ];

      const results = await Promise.all(operations);

      // All operations should complete successfully
      expect(results[0]).toBeTruthy();
      expect(results[1]).toBeTruthy();
      expect(results[2]).toBeTruthy();
      expect(results[3]).toBeTruthy();
      // Last operation is void, so undefined is expected
    });
  });
});