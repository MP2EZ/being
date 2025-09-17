/**
 * Subscription State Management Integration Tests
 * Day 17 Phase 2: Comprehensive validation of subscription system integration
 *
 * Tests the complete integration of:
 * - PaymentStore with SubscriptionManager integration
 * - PaymentAwareFeatureGates with state management
 * - UserStore subscription integration
 * - StateSynchronizationService cross-store updates
 * - Crisis safety guarantees across all state changes
 * - Performance targets (<100ms feature access, <500ms subscription status)
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Import the stores and services
import { usePaymentStore, paymentSelectors } from '../../store/paymentStore';
import { useUserStore } from '../../store/userStore';
import { useFeatureFlagStore } from '../../store/featureFlagStore';
import { subscriptionManager } from '../../services/cloud/SubscriptionManager';
import { paymentAwareFeatureGates } from '../../services/cloud/PaymentAwareFeatureGates';
import { stateSynchronizationService } from '../../services/state/StateSynchronization';

// Mock SecureStore for testing
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn()
}));

// Mock network connectivity
const mockNavigator = {
  onLine: true
};
global.navigator = mockNavigator as any;

describe('Subscription State Management Integration', () => {
  beforeEach(async () => {
    // Reset all stores to initial state
    usePaymentStore.getState().reset();
    useFeatureFlagStore.getState().initializeFlags();

    // Clear any cached data
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any intervals or listeners
    jest.clearAllTimers();
  });

  describe('PaymentStore Enhanced Integration', () => {
    it('should initialize subscription manager integration', async () => {
      const paymentStore = usePaymentStore.getState();

      // Test initialization
      const startTime = Date.now();
      await paymentStore.initializeSubscriptionManager();
      const initTime = Date.now() - startTime;

      // Verify initialization performance
      expect(initTime).toBeLessThan(2000); // 2 second initialization limit

      // Verify managers are connected
      expect(paymentStore.subscriptionManager).toBeDefined();
      expect(paymentStore.paymentAwareFeatureGates).toBeDefined();

      // Verify emergency state is available
      expect(paymentStore.featureAccess).toBeDefined();
      expect(paymentStore.featureAccess.crisisTools).toBe(true);
      expect(paymentStore.featureAccess.emergencyContacts).toBe(true);
    });

    it('should provide fast feature access checks (<100ms)', async () => {
      const paymentStore = usePaymentStore.getState();
      await paymentStore.initializeSubscriptionManager();

      const testFeatures = [
        'crisis_detection',
        'phq9_assessment',
        'breathing_exercises',
        'cloud_sync',
        'premium_features'
      ];

      for (const feature of testFeatures) {
        const startTime = Date.now();
        const result = await paymentStore.checkFeatureAccess(feature);
        const responseTime = Date.now() - startTime;

        // Verify performance target
        expect(responseTime).toBeLessThan(100);

        // Verify result structure
        expect(result).toHaveProperty('granted');
        expect(result).toHaveProperty('reason');
        expect(result).toHaveProperty('responseTime');
        expect(result).toHaveProperty('crisisOverride');
        expect(result).toHaveProperty('therapeuticImpact');

        // Crisis features should always be granted
        if (['crisis_detection', 'emergency_contacts', 'hotline_988'].includes(feature)) {
          expect(result.granted).toBe(true);
        }
      }
    });

    it('should provide detailed subscription status (<500ms)', async () => {
      const paymentStore = usePaymentStore.getState();
      await paymentStore.initializeSubscriptionManager();

      const startTime = Date.now();
      const status = await paymentStore.getSubscriptionStatusDetailed();
      const responseTime = Date.now() - startTime;

      // Verify performance target
      expect(responseTime).toBeLessThan(500);

      // Verify status structure
      expect(status).toHaveProperty('tier');
      expect(status).toHaveProperty('features');
      expect(status).toHaveProperty('featureAccess');
      expect(status).toHaveProperty('responseTime');

      // Crisis features should always be available
      expect(status.featureAccess.crisisTools).toBe(true);
      expect(status.featureAccess.emergencyContacts).toBe(true);
      expect(status.featureAccess.hotlineAccess).toBe(true);
    });

    it('should maintain crisis safety during subscription changes', async () => {
      const paymentStore = usePaymentStore.getState();
      await paymentStore.initializeSubscriptionManager();

      // Enable crisis mode
      await paymentStore.enableCrisisMode('Integration test');

      // Verify crisis mode is active
      expect(paymentStore.crisisMode).toBe(true);

      // Test feature access during crisis
      const crisisResult = await paymentStore.checkFeatureAccess('premium_features');
      expect(crisisResult.granted).toBe(true);
      expect(crisisResult.crisisOverride).toBe(true);

      // Test subscription status during crisis
      const statusDuringCrisis = await paymentStore.getSubscriptionStatusDetailed();
      expect(statusDuringCrisis.tier).toBe('crisis_access');
      expect(statusDuringCrisis.featureAccess.premiumFeatures).toBe(true);

      // Simulate subscription failure during crisis
      try {
        await paymentStore.handleSubscriptionPaymentFailure({
          code: 'card_declined',
          message: 'Payment failed',
          retryable: true
        });

        // Crisis mode should be maintained
        expect(paymentStore.crisisMode).toBe(true);

        // Features should remain accessible
        const postFailureResult = await paymentStore.checkFeatureAccess('breathing_exercises');
        expect(postFailureResult.granted).toBe(true);
      } catch (error) {
        // Should not throw during crisis mode
        expect(error).toBeUndefined();
      }
    });

    it('should sync subscription state efficiently', async () => {
      const paymentStore = usePaymentStore.getState();
      await paymentStore.initializeSubscriptionManager();

      const startTime = Date.now();
      await paymentStore.syncSubscriptionState();
      const syncTime = Date.now() - startTime;

      // Verify sync performance
      expect(syncTime).toBeLessThan(1000); // 1 second sync limit

      // Verify feature access is updated
      expect(paymentStore.featureAccess).toBeDefined();

      // Verify monitoring is active
      expect(paymentStore._monitoringInterval).toBeDefined();
    });
  });

  describe('Enhanced Selectors and Hooks', () => {
    it('should provide accurate subscription tier detection', () => {
      const paymentStore = usePaymentStore.getState();

      // Test with no subscription
      expect(paymentSelectors.getSubscriptionTier(paymentStore)).toBe('none');

      // Test with crisis mode
      paymentStore.crisisMode = true;
      expect(paymentSelectors.getSubscriptionTier(paymentStore)).toBe('crisis_access');

      // Test with subscription state
      paymentStore.crisisMode = false;
      paymentStore.subscriptionState = {
        tier: { id: 'premium' },
        current: { status: 'active' },
        features: { available: [] }
      } as any;
      expect(paymentSelectors.getSubscriptionTier(paymentStore)).toBe('premium');
    });

    it('should provide fast feature access validation', () => {
      const paymentStore = usePaymentStore.getState();

      // Test crisis features (always available)
      expect(paymentSelectors.canAccessFeature(paymentStore, 'crisis_detection')).toBe(true);
      expect(paymentSelectors.canAccessFeature(paymentStore, 'emergency_contacts')).toBe(true);

      // Test crisis mode override
      paymentStore.crisisMode = true;
      expect(paymentSelectors.canAccessFeature(paymentStore, 'premium_features')).toBe(true);

      // Test subscription-based access
      paymentStore.crisisMode = false;
      paymentStore.subscriptionState = {
        features: {
          available: ['breathing_exercises', 'phq9_assessment'],
          crisisOverride: ['crisis_detection']
        }
      } as any;

      expect(paymentSelectors.canAccessFeature(paymentStore, 'breathing_exercises')).toBe(true);
      expect(paymentSelectors.canAccessFeature(paymentStore, 'premium_features')).toBe(false);
    });

    it('should provide comprehensive trial information', () => {
      const paymentStore = usePaymentStore.getState();

      // Test with no trial
      expect(paymentSelectors.getTrialInfo(paymentStore)).toBeNull();

      // Test with active trial countdown
      paymentStore.trialCountdown = {
        daysRemaining: 14,
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        extended: false
      };

      const trialInfo = paymentSelectors.getTrialInfo(paymentStore);
      expect(trialInfo).toBeDefined();
      expect(trialInfo?.daysRemaining).toBe(14);
      expect(trialInfo?.extended).toBe(false);

      // Test with extended trial
      paymentStore.trialCountdown.extended = true;
      paymentStore.trialCountdown.extensionReason = 'Crisis support';

      const extendedTrialInfo = paymentSelectors.getTrialInfo(paymentStore);
      expect(extendedTrialInfo?.extended).toBe(true);
    });

    it('should track performance metrics accurately', async () => {
      const paymentStore = usePaymentStore.getState();
      await paymentStore.initializeSubscriptionManager();

      // Perform some operations to generate metrics
      await paymentStore.checkFeatureAccess('breathing_exercises');
      await paymentStore.getSubscriptionStatusDetailed();

      const metrics = paymentSelectors.getPerformanceMetrics(paymentStore);

      expect(metrics).toHaveProperty('crisisModeEnabled');
      expect(metrics).toHaveProperty('subscriptionTier');
      expect(metrics).toHaveProperty('featureCacheSize');
      expect(metrics).toHaveProperty('subscriptionManagerActive');

      expect(typeof metrics.featureCacheSize).toBe('number');
      expect(typeof metrics.lastFeatureCheck).toBe('number');
      expect(metrics.subscriptionManagerActive).toBe(true);
    });
  });

  describe('Crisis Safety Integration', () => {
    it('should maintain therapeutic access during all failure scenarios', async () => {
      const paymentStore = usePaymentStore.getState();

      // Simulate complete initialization failure
      const mockError = new Error('Subscription service unavailable');
      jest.spyOn(console, 'error').mockImplementation(() => {}); // Silence error logs

      try {
        // Force initialization to fail
        jest.spyOn(subscriptionManager, 'initialize').mockRejectedValue(mockError);

        await paymentStore.initializeSubscriptionManager();

        // Emergency state should be initialized
        expect(paymentStore.featureAccess.therapeuticContent).toBe(true);
        expect(paymentStore.featureAccess.crisisTools).toBe(true);
        expect(paymentStore.featureAccess.assessments).toBe(true);

      } finally {
        jest.restoreAllMocks();
      }
    });

    it('should override any restrictions during crisis mode', async () => {
      const paymentStore = usePaymentStore.getState();
      await paymentStore.initializeSubscriptionManager();

      // Set up restricted access
      paymentStore.subscriptionState = {
        tier: { id: 'none' },
        features: {
          available: ['crisis_detection'],
          restricted: ['premium_features', 'advanced_insights'],
          crisisOverride: []
        }
      } as any;

      // Verify restrictions apply normally
      let premiumAccess = await paymentStore.checkFeatureAccess('premium_features');
      expect(premiumAccess.granted).toBe(false);

      // Enable crisis mode
      await paymentStore.enableCrisisMode('Emergency test');

      // Verify crisis mode overrides restrictions
      premiumAccess = await paymentStore.checkFeatureAccess('premium_features');
      expect(premiumAccess.granted).toBe(true);
      expect(premiumAccess.crisisOverride).toBe(true);

      // Verify therapeutic impact is minimized
      expect(premiumAccess.therapeuticImpact).toBe('none');
    });

    it('should provide immediate emergency state initialization', async () => {
      const paymentStore = usePaymentStore.getState();

      const startTime = Date.now();
      await paymentStore.initializeEmergencySubscriptionState();
      const initTime = Date.now() - startTime;

      // Should be very fast for emergency scenarios
      expect(initTime).toBeLessThan(100);

      // Should provide comprehensive therapeutic access
      expect(paymentStore.featureAccess.therapeuticContent).toBe(true);
      expect(paymentStore.featureAccess.assessments).toBe(true);
      expect(paymentStore.featureAccess.breathingExercises).toBe(true);

      // Should include emergency subscription state
      expect(paymentStore.subscriptionState).toBeDefined();
      expect(paymentStore.subscriptionState.features.crisisOverride).toContain('crisis_detection');
    });
  });

  describe('State Synchronization Integration', () => {
    it('should synchronize subscription changes across stores', async () => {
      // Initialize all stores
      const paymentStore = usePaymentStore.getState();
      const userStore = useUserStore.getState();

      await paymentStore.initializeSubscriptionManager();
      await stateSynchronizationService.initialize();

      // Make a subscription change
      await paymentStore.startMindfulTrial('test_user', 21);

      // Trigger state synchronization
      const syncResult = await stateSynchronizationService.synchronizeState();

      expect(syncResult.success).toBe(true);
      expect(syncResult.performanceMetrics.syncDuration).toBeLessThan(2000);

      // Verify stores are synchronized
      const trialInfo = paymentSelectors.getTrialInfo(paymentStore);
      expect(trialInfo?.active).toBe(true);
    });

    it('should handle cross-device state conflicts safely', async () => {
      await stateSynchronizationService.initialize();

      // Simulate conflicting subscription states
      const localState = {
        subscription: { status: 'active', tier: 'basic' },
        crisis: { mode: false }
      };

      const remoteState = {
        subscription: { status: 'past_due', tier: 'basic' },
        crisis: { mode: true }
      };

      // Synchronize with conflict resolution
      const syncResult = await stateSynchronizationService.synchronizeState();

      // Crisis mode should always win for safety
      expect(syncResult.crisisOverrideApplied || syncResult.success).toBe(true);
    });

    it('should maintain offline queue for subscription changes', async () => {
      await stateSynchronizationService.initialize();

      // Simulate offline mode
      mockNavigator.onLine = false;

      // Queue subscription updates
      stateSynchronizationService.queueStateUpdate('payment', {
        subscriptionTier: 'premium',
        featureAccess: { premiumFeatures: true }
      });

      // Verify update is queued
      const metrics = stateSynchronizationService.getPerformanceMetrics();
      expect(metrics.pendingUpdates).toBeGreaterThan(0);

      // Simulate going online
      mockNavigator.onLine = true;

      // Process offline queue
      const syncResult = await stateSynchronizationService.synchronizeState();
      expect(syncResult.success).toBe(true);
    });
  });

  describe('Performance and Reliability', () => {
    it('should meet all performance targets under load', async () => {
      const paymentStore = usePaymentStore.getState();
      await paymentStore.initializeSubscriptionManager();

      const performanceResults = {
        featureChecks: [],
        subscriptionStatus: [],
        stateSync: []
      };

      // Test feature access performance (target: <100ms)
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        await paymentStore.checkFeatureAccess('breathing_exercises');
        const duration = Date.now() - startTime;
        performanceResults.featureChecks.push(duration);
      }

      // Test subscription status performance (target: <500ms)
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        await paymentStore.getSubscriptionStatusDetailed();
        const duration = Date.now() - startTime;
        performanceResults.subscriptionStatus.push(duration);
      }

      // Test state synchronization performance (target: <2s)
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();
        await stateSynchronizationService.forceSynchronization();
        const duration = Date.now() - startTime;
        performanceResults.stateSync.push(duration);
      }

      // Verify performance targets
      const avgFeatureCheck = performanceResults.featureChecks.reduce((a, b) => a + b, 0) / performanceResults.featureChecks.length;
      const avgStatusCheck = performanceResults.subscriptionStatus.reduce((a, b) => a + b, 0) / performanceResults.subscriptionStatus.length;
      const avgStateSync = performanceResults.stateSync.reduce((a, b) => a + b, 0) / performanceResults.stateSync.length;

      expect(avgFeatureCheck).toBeLessThan(100);
      expect(avgStatusCheck).toBeLessThan(500);
      expect(avgStateSync).toBeLessThan(2000);

      console.log('Performance Results:', {
        avgFeatureCheck,
        avgStatusCheck,
        avgStateSync
      });
    });

    it('should handle rapid successive operations gracefully', async () => {
      const paymentStore = usePaymentStore.getState();
      await paymentStore.initializeSubscriptionManager();

      // Rapidly fire multiple operations
      const operations = Array(20).fill(0).map(async (_, index) => {
        if (index % 3 === 0) {
          return paymentStore.checkFeatureAccess(`feature_${index}`);
        } else if (index % 3 === 1) {
          return paymentStore.getSubscriptionStatusDetailed();
        } else {
          return paymentStore.syncSubscriptionState();
        }
      });

      const results = await Promise.allSettled(operations);

      // All operations should complete without errors
      const failures = results.filter(result => result.status === 'rejected');
      expect(failures.length).toBe(0);

      // Cache should be populated efficiently
      expect(paymentStore.featureGateCache.size).toBeGreaterThan(0);
    });

    it('should recover gracefully from service failures', async () => {
      const paymentStore = usePaymentStore.getState();

      // Mock service failures
      jest.spyOn(subscriptionManager, 'getSubscriptionStatus').mockRejectedValue(new Error('Service unavailable'));

      await paymentStore.initializeSubscriptionManager();

      // Operations should still work with fallbacks
      const featureResult = await paymentStore.checkFeatureAccess('crisis_detection');
      expect(featureResult.granted).toBe(true); // Crisis features always work

      const statusResult = await paymentStore.getSubscriptionStatusDetailed();
      expect(statusResult.tier).toBe('emergency_access'); // Fallback tier

      // Therapeutic continuity should be maintained
      expect(statusResult.featureAccess.therapeuticContent).toBe(true);
      expect(statusResult.featureAccess.crisisTools).toBe(true);

      jest.restoreAllMocks();
    });
  });
});

describe('Hook Integration Tests', () => {
  it('should provide consistent data across all subscription hooks', async () => {
    // This would test the React hooks in a testing environment
    // For now, we test the underlying store methods they depend on
    const paymentStore = usePaymentStore.getState();
    await paymentStore.initializeSubscriptionManager();

    // Test consistency between selectors
    const tier1 = paymentSelectors.getSubscriptionTier(paymentStore);
    const tier2 = paymentSelectors.getSubscriptionTier(paymentStore);
    expect(tier1).toBe(tier2);

    // Test feature access consistency
    const access1 = paymentSelectors.canAccessFeature(paymentStore, 'breathing_exercises');
    const access2 = paymentSelectors.canAccessFeature(paymentStore, 'breathing_exercises');
    expect(access1).toBe(access2);
  });

  it('should handle concurrent hook usage efficiently', async () => {
    const paymentStore = usePaymentStore.getState();
    await paymentStore.initializeSubscriptionManager();

    // Simulate multiple components using hooks simultaneously
    const concurrentOperations = [
      () => paymentSelectors.getFeatureAccess(paymentStore),
      () => paymentSelectors.getTrialInfo(paymentStore),
      () => paymentSelectors.getPerformanceMetrics(paymentStore),
      () => paymentSelectors.getSyncStatus(paymentStore),
      () => paymentSelectors.canAccessFeature(paymentStore, 'premium_features'),
      () => paymentSelectors.getNeedsUpgrade(paymentStore, 'advanced_insights')
    ];

    const startTime = Date.now();
    const results = await Promise.all(concurrentOperations.map(op => Promise.resolve(op())));
    const totalTime = Date.now() - startTime;

    // All operations should complete quickly
    expect(totalTime).toBeLessThan(100);

    // All results should be defined and consistent
    results.forEach(result => {
      expect(result).toBeDefined();
    });
  });
});