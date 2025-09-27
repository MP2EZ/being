/**
 * Crisis Safety Testing Suite
 * Day 17 Phase 5: Crisis safety validation for subscription system
 *
 * Testing:
 * - Crisis features always accessible regardless of subscription
 * - Emergency subscription activation during mental health crisis
 * - Crisis response time <200ms maintained during subscription checks
 * - 988 hotline accessibility from all subscription screens
 * - Crisis mode overrides all subscription restrictions
 */

import { renderHook, act } from '@testing-library/react-native';
import { useSubscriptionStore } from '../../src/store/subscriptionStore';
import { useCrisisMode } from '../../src/hooks/useCrisisMode';
import {
  SubscriptionTier,
  FeatureAccessResult,
  SUBSCRIPTION_CONSTANTS
} from '../../src/types/subscription';

// Mock dependencies
jest.mock('../../src/services/CrisisProtectionService', () => ({
  crisisProtectionService: {
    isInCrisisMode: jest.fn().mockReturnValue(false),
    activateCrisisMode: jest.fn().mockResolvedValue(undefined),
    deactivateCrisisMode: jest.fn().mockResolvedValue(undefined),
    measureResponseTime: jest.fn().mockResolvedValue(150),
    validateCrisisAccess: jest.fn().mockResolvedValue(true),
    getCrisisFeatures: jest.fn().mockReturnValue([
      'crisis_button',
      'breathing_exercises',
      'emergency_contacts',
      'hotline_988'
    ]),
    recordCrisisEvent: jest.fn().mockResolvedValue(undefined),
    getCrisisHistory: jest.fn().mockResolvedValue([])
  }
}));

jest.mock('../../src/services/EmergencyService', () => ({
  emergencyService: {
    call988Hotline: jest.fn().mockResolvedValue({ success: true, callId: 'call_123' }),
    getEmergencyContacts: jest.fn().mockResolvedValue([
      { name: 'Crisis Hotline', number: '988' },
      { name: 'Emergency', number: '911' }
    ]),
    recordEmergencyAccess: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock('../../src/services/storage/SecureDataStore', () => ({
  secureDataStore: {
    getCrisisOverrides: jest.fn().mockResolvedValue([]),
    saveCrisisOverrides: jest.fn().mockResolvedValue(undefined),
    getCrisisHistory: jest.fn().mockResolvedValue([]),
    saveCrisisEvent: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('Crisis Safety Testing Suite', () => {
  let subscriptionStore: ReturnType<typeof useSubscriptionStore>;
  let crisisProtectionService: any;
  let emergencyService: any;

  beforeEach(() => {
    subscriptionStore = useSubscriptionStore.getState();
    crisisProtectionService = require('../../src/services/CrisisProtectionService').crisisProtectionService;
    emergencyService = require('../../src/services/EmergencyService').emergencyService;

    // Reset to safe initial state
    useSubscriptionStore.setState({
      subscription: {
        tier: 'free',
        status: 'active',
        crisisAccessGuaranteed: true,
        crisisFeatureOverrides: [],
        lastValidated: new Date().toISOString(),
        validationLatency: 45
      },
      trial: null,
      validationCache: {},
      performanceMetrics: {
        validationLatency: { avg: 75, p50: 65, p95: 120, p99: 180, max: 200 },
        crisisResponseTime: { avg: 150, max: 190, violations: 0 },
        cacheMetrics: { hitRate: 0.95, missRate: 0.05, invalidationRate: 0.01, averageSize: 1024 },
        errorMetrics: { validationErrors: 0, timeoutErrors: 0, networkErrors: 0, totalErrors: 0, errorRate: 0 },
        usageMetrics: { totalValidations: 1000, uniqueFeatures: 12, peakValidationsPerSecond: 25, averageValidationsPerUser: 150 },
        periodStart: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        periodEnd: new Date().toISOString(),
        sampleCount: 1000
      },
      lastError: null,
      retryQueue: [],
      isValidating: false,
      isUpdating: false,
      isInitialized: true,
      crisisMode: false,
      crisisOverrides: []
    });

    jest.clearAllMocks();
  });

  describe('1. Crisis Features Always Accessible', () => {
    test('crisis button accessible on free tier', async () => {
      const crisisAccess = await subscriptionStore.validateFeatureAccess('crisis_button');

      expect(crisisAccess.hasAccess).toBe(true);
      expect(crisisAccess.reason).toBe('granted');
      expect(crisisAccess.validationTime).toBeLessThan(SUBSCRIPTION_CONSTANTS.CRISIS_RESPONSE_MAX_LATENCY);
    });

    test('crisis button accessible with canceled subscription', async () => {
      useSubscriptionStore.setState({
        subscription: {
          ...subscriptionStore.subscription,
          status: 'canceled',
          tier: 'free'
        }
      });

      const crisisAccess = await subscriptionStore.validateFeatureAccess('crisis_button');

      expect(crisisAccess.hasAccess).toBe(true);
      expect(crisisAccess.reason).toBe('granted');
      expect(crisisAccess.userMessage).toContain('Crisis support is always available');
    });

    test('crisis button accessible with expired trial', async () => {
      useSubscriptionStore.setState({
        subscription: {
          ...subscriptionStore.subscription,
          status: 'incomplete_expired',
          tier: 'free'
        },
        trial: {
          current: {
            isActive: false,
            daysRemaining: 0,
            originalDuration: 7,
            startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            extendedForCrisis: false,
            crisisExtensionDays: 0,
            gracePeriodActive: false
          }
        }
      });

      const crisisAccess = await subscriptionStore.validateFeatureAccess('crisis_button');

      expect(crisisAccess.hasAccess).toBe(true);
      expect(crisisAccess.reason).toBe('granted');
    });

    test('breathing exercises accessible during payment failure', async () => {
      useSubscriptionStore.setState({
        subscription: {
          ...subscriptionStore.subscription,
          tier: 'premium',
          status: 'past_due',
          paymentMethodValid: false
        }
      });

      const breathingAccess = await subscriptionStore.validateFeatureAccess('breathing_exercises');

      expect(breathingAccess.hasAccess).toBe(true);
      expect(breathingAccess.reason).toBe('granted');
      expect(breathingAccess.userMessage).toContain('always available');
    });

    test('emergency contacts accessible in all subscription states', async () => {
      const subscriptionStates = ['active', 'canceled', 'past_due', 'incomplete', 'unpaid'];

      for (const status of subscriptionStates) {
        useSubscriptionStore.setState({
          subscription: {
            ...subscriptionStore.subscription,
            status: status as any
          }
        });

        const emergencyAccess = await subscriptionStore.validateFeatureAccess('emergency_contacts');

        expect(emergencyAccess.hasAccess).toBe(true);
        expect(emergencyAccess.reason).toBe('granted');
        expect(emergencyAccess.validationTime).toBeLessThan(SUBSCRIPTION_CONSTANTS.CRISIS_RESPONSE_MAX_LATENCY);
      }
    });
  });

  describe('2. Emergency Subscription Activation During Crisis', () => {
    test('crisis mode enables premium features temporarily', async () => {
      crisisProtectionService.isInCrisisMode.mockReturnValue(true);

      await act(async () => {
        await subscriptionStore.activateCrisisOverride([
          'advanced_analytics',
          'family_sharing',
          'cloud_sync'
        ]);
      });

      expect(subscriptionStore.crisisMode).toBe(true);
      expect(subscriptionStore.crisisOverrides).toContain('advanced_analytics');
      expect(subscriptionStore.crisisOverrides).toContain('family_sharing');
      expect(subscriptionStore.crisisOverrides).toContain('cloud_sync');

      // Validate that overridden features are now accessible
      const analyticsAccess = await subscriptionStore.validateFeatureAccess('advanced_analytics');
      expect(analyticsAccess.hasAccess).toBe(true);
      expect(analyticsAccess.reason).toBe('crisis_override');
      expect(analyticsAccess.crisisOverrideActive).toBe(true);
    });

    test('emergency trial extension during crisis', async () => {
      crisisProtectionService.isInCrisisMode.mockReturnValue(true);

      const expiredTrial = {
        isActive: false,
        daysRemaining: 0,
        originalDuration: 7,
        startDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        extendedForCrisis: false,
        crisisExtensionDays: 0,
        gracePeriodActive: false
      };

      useSubscriptionStore.setState({
        subscription: {
          ...subscriptionStore.subscription,
          status: 'trialing',
          trial: expiredTrial
        },
        trial: {
          current: expiredTrial,
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
            featuresUsed: ['crisis_button'],
            engagementScore: 0.4,
            likelihoodToConvert: 0.2
          }
        }
      });

      await act(async () => {
        const extendedTrial = await subscriptionStore.extendTrial(14, 'Emergency crisis extension');

        expect(extendedTrial.extendedForCrisis).toBe(true);
        expect(extendedTrial.crisisExtensionDays).toBe(14);
        expect(extendedTrial.isActive).toBe(true);
        expect(extendedTrial.daysRemaining).toBe(14);
      });

      expect(crisisProtectionService.recordCrisisEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'trial_extension',
          duration: 14,
          reason: 'Emergency crisis extension'
        })
      );
    });

    test('crisis subscription override with time limit', async () => {
      crisisProtectionService.isInCrisisMode.mockReturnValue(true);

      const crisisStartTime = Date.now();

      await act(async () => {
        await subscriptionStore.activateCrisisOverride(['premium_features']);
      });

      // Crisis override should be time-limited
      const crisisOverride = subscriptionStore.crisisOverrides[0];
      expect(crisisOverride).toBeTruthy();

      // Simulate crisis ending
      crisisProtectionService.isInCrisisMode.mockReturnValue(false);

      await act(async () => {
        await subscriptionStore.deactivateCrisisOverride();
      });

      expect(subscriptionStore.crisisMode).toBe(false);
      expect(subscriptionStore.crisisOverrides).toHaveLength(0);

      // Premium features should no longer be accessible
      const premiumAccess = await subscriptionStore.validateFeatureAccess('advanced_analytics');
      expect(premiumAccess.hasAccess).toBe(false);
      expect(premiumAccess.reason).toBe('tier_insufficient');
    });
  });

  describe('3. Crisis Response Time <200ms Validation', () => {
    test('crisis button response time measurement', async () => {
      const measurements: number[] = [];

      // Test multiple crisis button activations
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        await subscriptionStore.validateFeatureAccess('crisis_button');
        const endTime = performance.now();
        measurements.push(endTime - startTime);
      }

      const avgResponseTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const maxResponseTime = Math.max(...measurements);

      expect(avgResponseTime).toBeLessThan(SUBSCRIPTION_CONSTANTS.CRISIS_RESPONSE_MAX_LATENCY);
      expect(maxResponseTime).toBeLessThan(SUBSCRIPTION_CONSTANTS.CRISIS_RESPONSE_MAX_LATENCY * 1.5);

      // Update performance metrics
      expect(subscriptionStore.performanceMetrics.crisisResponseTime.avg).toBeLessThan(200);
      expect(subscriptionStore.performanceMetrics.crisisResponseTime.max).toBeLessThan(250);
    });

    test('crisis mode activation performance', async () => {
      crisisProtectionService.isInCrisisMode.mockReturnValue(true);

      const startTime = performance.now();

      await act(async () => {
        await subscriptionStore.activateCrisisOverride(['crisis_button', 'breathing_exercises']);
      });

      const endTime = performance.now();
      const activationTime = endTime - startTime;

      expect(activationTime).toBeLessThan(300); // Crisis mode activation <300ms
      expect(crisisProtectionService.recordCrisisEvent).toHaveBeenCalled();
    });

    test('emergency contact access speed', async () => {
      const startTime = performance.now();

      const contacts = await emergencyService.getEmergencyContacts();
      await subscriptionStore.validateFeatureAccess('emergency_contacts');

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(200);
      expect(contacts).toContain(expect.objectContaining({ number: '988' }));
      expect(contacts).toContain(expect.objectContaining({ number: '911' }));
    });

    test('crisis feature validation under load', async () => {
      const concurrentValidations = Array(20).fill(null).map(async () => {
        const startTime = performance.now();
        const result = await subscriptionStore.validateFeatureAccess('crisis_button');
        const endTime = performance.now();
        return {
          responseTime: endTime - startTime,
          hasAccess: result.hasAccess,
          validationTime: result.validationTime
        };
      });

      const results = await Promise.all(concurrentValidations);

      results.forEach(result => {
        expect(result.hasAccess).toBe(true);
        expect(result.responseTime).toBeLessThan(SUBSCRIPTION_CONSTANTS.CRISIS_RESPONSE_MAX_LATENCY);
        expect(result.validationTime).toBeLessThan(SUBSCRIPTION_CONSTANTS.CRISIS_RESPONSE_MAX_LATENCY);
      });

      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      expect(avgResponseTime).toBeLessThan(150); // Average should be well under limit
    });
  });

  describe('4. 988 Hotline Accessibility', () => {
    test('988 hotline accessible from all subscription screens', async () => {
      const subscriptionStates = ['free', 'premium', 'family'] as SubscriptionTier[];
      const statuses = ['active', 'canceled', 'past_due', 'trialing'];

      for (const tier of subscriptionStates) {
        for (const status of statuses) {
          useSubscriptionStore.setState({
            subscription: {
              ...subscriptionStore.subscription,
              tier,
              status: status as any
            }
          });

          const hotlineAccess = await subscriptionStore.validateFeatureAccess('hotline_988');

          expect(hotlineAccess.hasAccess).toBe(true);
          expect(hotlineAccess.reason).toBe('granted');
          expect(hotlineAccess.validationTime).toBeLessThan(100); // Extra fast for emergency
        }
      }
    });

    test('988 hotline call functionality', async () => {
      const callStartTime = performance.now();

      const callResult = await emergencyService.call988Hotline();

      const callEndTime = performance.now();
      const callInitiationTime = callEndTime - callStartTime;

      expect(callResult.success).toBe(true);
      expect(callResult.callId).toBeDefined();
      expect(callInitiationTime).toBeLessThan(500); // Call initiation <500ms

      expect(emergencyService.recordEmergencyAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'hotline_988',
          timestamp: expect.any(String),
          callId: callResult.callId
        })
      );
    });

    test('988 hotline accessible during payment failures', async () => {
      useSubscriptionStore.setState({
        subscription: {
          ...subscriptionStore.subscription,
          tier: 'premium',
          status: 'past_due',
          paymentMethodValid: false
        }
      });

      const hotlineAccess = await subscriptionStore.validateFeatureAccess('hotline_988');

      expect(hotlineAccess.hasAccess).toBe(true);
      expect(hotlineAccess.userMessage).toContain('always available');

      const callResult = await emergencyService.call988Hotline();
      expect(callResult.success).toBe(true);
    });

    test('988 hotline accessible during subscription cancellation', async () => {
      useSubscriptionStore.setState({
        subscription: {
          ...subscriptionStore.subscription,
          status: 'canceled',
          cancelAtPeriodEnd: true
        }
      });

      const hotlineAccess = await subscriptionStore.validateFeatureAccess('hotline_988');

      expect(hotlineAccess.hasAccess).toBe(true);
      expect(hotlineAccess.reason).toBe('granted');

      // Even during cancellation process, 988 should work
      const callResult = await emergencyService.call988Hotline();
      expect(callResult.success).toBe(true);
    });
  });

  describe('5. Crisis Mode Overrides All Subscription Restrictions', () => {
    test('crisis mode enables all premium features for free user', async () => {
      crisisProtectionService.isInCrisisMode.mockReturnValue(true);

      const premiumFeatures = [
        'advanced_analytics',
        'cloud_sync',
        'family_sharing',
        'premium_content'
      ];

      await act(async () => {
        await subscriptionStore.activateCrisisOverride(premiumFeatures);
      });

      for (const feature of premiumFeatures) {
        const access = await subscriptionStore.validateFeatureAccess(feature);

        expect(access.hasAccess).toBe(true);
        expect(access.reason).toBe('crisis_override');
        expect(access.crisisOverrideActive).toBe(true);
        expect(access.validationTime).toBeLessThan(SUBSCRIPTION_CONSTANTS.CRISIS_RESPONSE_MAX_LATENCY);
      }
    });

    test('crisis mode bypasses trial expiration restrictions', async () => {
      crisisProtectionService.isInCrisisMode.mockReturnValue(true);

      useSubscriptionStore.setState({
        subscription: {
          ...subscriptionStore.subscription,
          status: 'incomplete_expired',
          tier: 'free'
        },
        trial: {
          current: {
            isActive: false,
            daysRemaining: 0,
            originalDuration: 7,
            startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            extendedForCrisis: false,
            crisisExtensionDays: 0,
            gracePeriodActive: false
          }
        }
      });

      await act(async () => {
        await subscriptionStore.activateCrisisOverride(['premium_content']);
      });

      const premiumAccess = await subscriptionStore.validateFeatureAccess('premium_content');

      expect(premiumAccess.hasAccess).toBe(true);
      expect(premiumAccess.reason).toBe('crisis_override');
      expect(premiumAccess.userMessage).toContain('crisis support');
    });

    test('crisis mode overrides payment failure restrictions', async () => {
      crisisProtectionService.isInCrisisMode.mockReturnValue(true);

      useSubscriptionStore.setState({
        subscription: {
          ...subscriptionStore.subscription,
          tier: 'premium',
          status: 'unpaid',
          paymentMethodValid: false
        }
      });

      await act(async () => {
        await subscriptionStore.activateCrisisOverride(['cloud_sync', 'advanced_analytics']);
      });

      const cloudSyncAccess = await subscriptionStore.validateFeatureAccess('cloud_sync');
      const analyticsAccess = await subscriptionStore.validateFeatureAccess('advanced_analytics');

      expect(cloudSyncAccess.hasAccess).toBe(true);
      expect(cloudSyncAccess.reason).toBe('crisis_override');
      expect(analyticsAccess.hasAccess).toBe(true);
      expect(analyticsAccess.reason).toBe('crisis_override');
    });

    test('crisis mode priority over all other access rules', async () => {
      crisisProtectionService.isInCrisisMode.mockReturnValue(true);

      // Set up most restrictive subscription state
      useSubscriptionStore.setState({
        subscription: {
          ...subscriptionStore.subscription,
          tier: 'free',
          status: 'canceled',
          paymentMethodValid: false,
          cancelAtPeriodEnd: true
        },
        trial: {
          current: {
            isActive: false,
            daysRemaining: 0,
            originalDuration: 7,
            startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
            extendedForCrisis: false,
            crisisExtensionDays: 0,
            gracePeriodActive: false
          }
        }
      });

      const allFeatures = [
        'advanced_analytics',
        'cloud_sync',
        'family_sharing',
        'premium_content',
        'enterprise_features'
      ];

      await act(async () => {
        await subscriptionStore.activateCrisisOverride(allFeatures);
      });

      // All features should be accessible during crisis, regardless of subscription state
      for (const feature of allFeatures) {
        const access = await subscriptionStore.validateFeatureAccess(feature);

        expect(access.hasAccess).toBe(true);
        expect(access.reason).toBe('crisis_override');
        expect(access.crisisMode).toBe(true);
        expect(access.crisisOverrideActive).toBe(true);
      }
    });

    test('crisis mode records and audits feature overrides', async () => {
      crisisProtectionService.isInCrisisMode.mockReturnValue(true);

      const overriddenFeatures = ['advanced_analytics', 'family_sharing'];

      await act(async () => {
        await subscriptionStore.activateCrisisOverride(overriddenFeatures);
      });

      // Verify crisis event recording
      expect(crisisProtectionService.recordCrisisEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'subscription_override',
          features: overriddenFeatures,
          timestamp: expect.any(String),
          reason: 'Crisis mode activation'
        })
      );

      // Verify secure storage of crisis overrides
      const { secureDataStore } = require('../../src/services/storage/SecureDataStore');
      expect(secureDataStore.saveCrisisOverrides).toHaveBeenCalledWith(
        expect.arrayContaining(overriddenFeatures)
      );
    });
  });

  describe('6. Crisis Safety Integration and Recovery', () => {
    test('crisis mode graceful deactivation preserves user state', async () => {
      crisisProtectionService.isInCrisisMode.mockReturnValue(true);

      // Activate crisis mode
      await act(async () => {
        await subscriptionStore.activateCrisisOverride(['advanced_analytics']);
      });

      expect(subscriptionStore.crisisMode).toBe(true);

      // Deactivate crisis mode
      crisisProtectionService.isInCrisisMode.mockReturnValue(false);

      await act(async () => {
        await subscriptionStore.deactivateCrisisOverride();
      });

      expect(subscriptionStore.crisisMode).toBe(false);
      expect(subscriptionStore.crisisOverrides).toHaveLength(0);

      // User's original subscription state should be preserved
      expect(subscriptionStore.subscription.tier).toBe('free');
      expect(subscriptionStore.subscription.status).toBe('active');

      // Crisis features should remain accessible
      const crisisAccess = await subscriptionStore.validateFeatureAccess('crisis_button');
      expect(crisisAccess.hasAccess).toBe(true);
      expect(crisisAccess.reason).toBe('granted');
    });

    test('crisis history tracking for continuity of care', async () => {
      crisisProtectionService.isInCrisisMode.mockReturnValue(true);
      crisisProtectionService.getCrisisHistory.mockResolvedValue([
        {
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          type: 'subscription_override',
          features: ['advanced_analytics'],
          duration: 1800000, // 30 minutes
          resolved: true
        }
      ]);

      await act(async () => {
        await subscriptionStore.activateCrisisOverride(['family_sharing']);
      });

      const crisisHistory = await crisisProtectionService.getCrisisHistory();
      expect(crisisHistory.length).toBeGreaterThan(0);
      expect(crisisHistory[0]).toHaveProperty('type', 'subscription_override');
      expect(crisisHistory[0]).toHaveProperty('resolved', true);
    });

    test('crisis mode respects therapeutic boundaries and recovery', async () => {
      crisisProtectionService.isInCrisisMode.mockReturnValue(true);

      await act(async () => {
        await subscriptionStore.activateCrisisOverride(['family_sharing']);
      });

      // Family sharing should be available for support during crisis
      const familyAccess = await subscriptionStore.validateFeatureAccess('family_sharing');
      expect(familyAccess.hasAccess).toBe(true);
      expect(familyAccess.reason).toBe('crisis_override');
      expect(familyAccess.userMessage).toContain('support');

      // Recovery-focused features should be prioritized
      const breathingAccess = await subscriptionStore.validateFeatureAccess('breathing_exercises');
      expect(breathingAccess.hasAccess).toBe(true);
      expect(breathingAccess.userMessage).toContain('available');
    });
  });
});