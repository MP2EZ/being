/**
 * End-to-End Tests - Feature Flag System
 *
 * Complete end-to-end tests covering the entire feature flag lifecycle
 * from initialization through user interaction to emergency scenarios
 */

import { useFeatureFlagStore, initializeFeatureFlags } from '../../src/store/featureFlagStore';
import {
  useFeatureFlag,
  useProgressiveFeature,
  useCostAwareFeature,
  useSafetyAwareFeature,
  useEmergencyFeatureControl
} from '../../src/hooks/useFeatureFlags';
import { DEFAULT_FEATURE_FLAGS, FEATURE_FLAG_CONSTANTS } from '../../src/types/feature-flags';
import { renderHook, act } from '@testing-library/react-native';

// Mock all external services for E2E testing
jest.mock('../../src/services/storage/SecureDataStore', () => ({
  secureDataStore: {
    getFeatureFlags: jest.fn().mockResolvedValue({}),
    getUserConsents: jest.fn().mockResolvedValue({}),
    getUserEligibility: jest.fn().mockResolvedValue({
      userId: 'test-user-e2e',
      planType: 'premium',
      rolloutSegment: 'early_adopter',
      betaOptIn: true,
      geographicRegion: 'US',
      appVersion: '1.0.0',
      deviceType: 'ios',
      eligibleFeatures: ['CLOUD_SYNC_ENABLED', 'ANALYTICS_ENABLED', 'PUSH_NOTIFICATIONS_ENABLED'],
      waitlistFeatures: ['AI_INSIGHTS_ENABLED']
    }),
    saveFeatureFlags: jest.fn().mockResolvedValue(undefined),
    saveUserConsents: jest.fn().mockResolvedValue(undefined),
    saveUserEligibility: jest.fn().mockResolvedValue(undefined),
    saveRolloutPercentages: jest.fn().mockResolvedValue(undefined),
    validateEncryption: jest.fn().mockResolvedValue(true),
    getData: jest.fn().mockResolvedValue(null),
    saveData: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock('../../src/services/NetworkService', () => ({
  networkService: {
    isOnline: jest.fn().mockReturnValue(true),
    checkConnectivity: jest.fn().mockResolvedValue(true)
  }
}));

jest.mock('../../src/services/CrisisProtectionService', () => ({
  crisisProtectionService: {
    isInCrisisMode: jest.fn().mockReturnValue(false),
    measureResponseTime: jest.fn().mockResolvedValue(120),
    testFeatureResponse: jest.fn().mockResolvedValue(150),
    checkCrisisThresholds: jest.fn().mockReturnValue(false),
    triggerCrisisProtocol: jest.fn().mockResolvedValue(undefined),
    activateCrisisMode: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock('../../src/services/cloud/CostMonitoring', () => ({
  costMonitoringService: {
    getCurrentCosts: jest.fn().mockResolvedValue({
      total: 12.50,
      budgetRemaining: 0.65,
      byFeature: {
        CLOUD_SYNC_ENABLED: 5.00,
        ANALYTICS_ENABLED: 2.50,
        PUSH_NOTIFICATIONS_ENABLED: 3.00,
        THERAPIST_PORTAL_ENABLED: 2.00
      },
      limitedFeatures: [],
      recommendations: ['Consider enabling AI insights for better user experience'],
      efficiency: 0.75
    }),
    getProjectedCosts: jest.fn().mockResolvedValue({
      monthly: 37.50,
      breakEvenUsers: 82,
      confidence: 0.85
    }),
    getOptimizationRecommendations: jest.fn().mockResolvedValue([
      {
        id: 'opt-e2e-1',
        type: 'optimize',
        feature: 'CLOUD_SYNC_ENABLED',
        potentialSavings: 2.0,
        automated: true,
        description: 'Optimize sync frequency during off-peak hours'
      }
    ])
  }
}));

jest.mock('../../src/services/cloud/CloudMonitoring', () => ({
  cloudMonitoringService: {
    reportEmergencyDisable: jest.fn().mockResolvedValue(undefined),
    reportCostAlert: jest.fn().mockResolvedValue(undefined),
    reportFeatureUsage: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('E2E Tests: Feature Flag System', () => {
  beforeEach(async () => {
    // Reset store to clean state
    useFeatureFlagStore.setState({
      flags: { ...DEFAULT_FEATURE_FLAGS },
      userConsents: {},
      rolloutPercentages: {},
      userEligibility: null,
      isLoading: false,
      isUpdating: false,
      error: null
    });

    jest.clearAllMocks();
  });

  describe('1. Complete Feature Flag Lifecycle', () => {
    test('Full initialization and setup flow', async () => {
      // Step 1: Initialize the feature flag system
      const cleanup = await initializeFeatureFlags();

      const store = useFeatureFlagStore.getState();

      // Should be initialized with defaults
      expect(store.flags).toEqual(DEFAULT_FEATURE_FLAGS);
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeNull();

      // User eligibility should be loaded
      expect(store.userEligibility).toBeDefined();
      expect(store.userEligibility?.userId).toBe('test-user-e2e');
      expect(store.userEligibility?.planType).toBe('premium');

      // Health status should be good
      expect(store.healthStatus.overall).toBe('healthy');
      expect(store.safetyStatus.crisisResponseTime).toBeLessThan(200);
      expect(store.safetyStatus.offlineFallbackReady).toBe(true);

      // Cleanup
      if (typeof cleanup === 'function') {
        cleanup();
      }
    });

    test('Feature request, consent, and activation flow', async () => {
      await initializeFeatureFlags();

      const { result: featureFlagResult } = renderHook(() =>
        useFeatureFlag('CLOUD_SYNC_ENABLED')
      );

      // Initially disabled
      expect(featureFlagResult.current.enabled).toBe(false);
      expect(featureFlagResult.current.requiresConsent).toBe(true);
      expect(featureFlagResult.current.hasConsent).toBe(false);

      // Step 1: Give consent
      await act(async () => {
        await featureFlagResult.current.updateConsent(true);
      });

      // Should have consent
      const store = useFeatureFlagStore.getState();
      expect(store.userConsents.CLOUD_SYNC_ENABLED).toBe(true);

      // Step 2: Request access
      await act(async () => {
        await featureFlagResult.current.requestAccess();
      });

      // Should now be enabled
      expect(store.flags.CLOUD_SYNC_ENABLED).toBe(true);
      expect(featureFlagResult.current.enabled).toBe(true);
    });

    test('Progressive rollout and user eligibility flow', async () => {
      await initializeFeatureFlags();

      const { result } = renderHook(() => useProgressiveFeature('ANALYTICS_ENABLED'));

      // Should show rollout information
      expect(result.current.rolloutPercentage).toBeDefined();
      expect(result.current.waitlisted).toBe(false); // User is eligible

      // Enable feature through rollout
      const store = useFeatureFlagStore.getState();
      await store.updateRolloutPercentage('ANALYTICS_ENABLED', 100);

      await act(async () => {
        await result.current.updateConsent(true);
        await result.current.requestAccess();
      });

      expect(store.flags.ANALYTICS_ENABLED).toBe(true);
      expect(result.current.enabled).toBe(true);
    });

    test('Cost monitoring and budget management flow', async () => {
      await initializeFeatureFlags();

      const { result } = renderHook(() => useCostAwareFeature('THERAPIST_PORTAL_ENABLED'));

      // Should show cost information
      expect(result.current.costImpact).toBe('medium');
      expect(result.current.budgetRemaining).toBe(0.65);
      expect(result.current.costLimited).toBe(false);

      // Enable feature and check cost tracking
      const store = useFeatureFlagStore.getState();
      await store.updateUserConsent('THERAPIST_PORTAL_ENABLED', true);
      await store.requestFeatureAccess('THERAPIST_PORTAL_ENABLED');

      // Should track costs
      await store.checkCostLimits();
      expect(store.costStatus.featureCosts.THERAPIST_PORTAL_ENABLED).toBe(2.00);
    });
  });

  describe('2. User Journey Scenarios', () => {
    test('New user onboarding and feature discovery', async () => {
      await initializeFeatureFlags();

      // New user starts with no features enabled
      const store = useFeatureFlagStore.getState();
      expect(Object.values(store.flags).every(flag => !flag)).toBe(true);

      // User discovers analytics feature
      const { result: analyticsResult } = renderHook(() => useFeatureFlag('ANALYTICS_ENABLED'));

      await act(async () => {
        await analyticsResult.current.updateConsent(true);
        await analyticsResult.current.requestAccess();
      });

      expect(store.flags.ANALYTICS_ENABLED).toBe(true);

      // User then discovers cloud sync
      const { result: cloudSyncResult } = renderHook(() => useFeatureFlag('CLOUD_SYNC_ENABLED'));

      await act(async () => {
        await cloudSyncResult.current.updateConsent(true);
        await cloudSyncResult.current.requestAccess();
      });

      expect(store.flags.CLOUD_SYNC_ENABLED).toBe(true);

      // Both features should work together
      expect(store.flags.ANALYTICS_ENABLED).toBe(true);
      expect(store.flags.CLOUD_SYNC_ENABLED).toBe(true);
    });

    test('Premium user upgrading features', async () => {
      await initializeFeatureFlags();

      // Premium user can access advanced features
      const { result: therapistPortalResult } = renderHook(() =>
        useFeatureFlag('THERAPIST_PORTAL_ENABLED')
      );

      const { result: familySharingResult } = renderHook(() =>
        useFeatureFlag('FAMILY_SHARING_ENABLED')
      );

      // Both require cloud sync as dependency
      const { result: cloudSyncResult } = renderHook(() => useFeatureFlag('CLOUD_SYNC_ENABLED'));

      // Enable cloud sync first
      await act(async () => {
        await cloudSyncResult.current.updateConsent(true);
        await cloudSyncResult.current.requestAccess();
      });

      // Now enable premium features
      await act(async () => {
        await therapistPortalResult.current.updateConsent(true);
        await therapistPortalResult.current.requestAccess();
      });

      await act(async () => {
        await familySharingResult.current.updateConsent(true);
        await familySharingResult.current.requestAccess();
      });

      const store = useFeatureFlagStore.getState();
      expect(store.flags.CLOUD_SYNC_ENABLED).toBe(true);
      expect(store.flags.THERAPIST_PORTAL_ENABLED).toBe(true);
      expect(store.flags.FAMILY_SHARING_ENABLED).toBe(true);
    });

    test('Beta user accessing experimental features', async () => {
      await initializeFeatureFlags();

      // User is beta opt-in according to mock
      const { result: betaResult } = renderHook(() => useFeatureFlag('BETA_FEATURES_ENABLED'));
      const { result: aiInsightsResult } = renderHook(() => useProgressiveFeature('AI_INSIGHTS_ENABLED'));

      // AI Insights should be waitlisted
      expect(aiInsightsResult.current.waitlisted).toBe(true);
      expect(aiInsightsResult.current.estimatedAvailability).toBe('Coming soon');

      // But can enable beta features
      await act(async () => {
        await betaResult.current.updateConsent(true);
        await betaResult.current.requestAccess();
      });

      const store = useFeatureFlagStore.getState();
      expect(store.flags.BETA_FEATURES_ENABLED).toBe(true);
    });
  });

  describe('3. Crisis and Safety Scenarios', () => {
    test('Crisis mode activation preserves essential features', async () => {
      await initializeFeatureFlags();

      // Enable multiple features
      const store = useFeatureFlagStore.getState();
      await store.updateUserConsent('CLOUD_SYNC_ENABLED', true);
      await store.updateUserConsent('ANALYTICS_ENABLED', true);
      await store.updateUserConsent('THERAPIST_PORTAL_ENABLED', true);
      await store.updateUserConsent('BETA_FEATURES_ENABLED', true);

      await store.requestFeatureAccess('CLOUD_SYNC_ENABLED');
      await store.requestFeatureAccess('ANALYTICS_ENABLED');
      await store.requestFeatureAccess('THERAPIST_PORTAL_ENABLED');
      await store.requestFeatureAccess('BETA_FEATURES_ENABLED');

      // Simulate crisis mode
      const { crisisProtectionService } = require('../../src/services/CrisisProtectionService');
      crisisProtectionService.isInCrisisMode.mockReturnValue(true);

      // Crisis-protected features should remain enabled
      expect(store.evaluateFlag('EMERGENCY_CONTACTS_CLOUD')).toBe(true);
      expect(store.evaluateFlag('PUSH_NOTIFICATIONS_ENABLED')).toBe(true);

      // Crisis response should be fast
      const responseTime = await store.validateCrisisAccess();
      expect(responseTime).toBe(true);
      expect(store.safetyStatus.crisisResponseTime).toBeLessThan(200);
    });

    test('Emergency shutdown and recovery workflow', async () => {
      await initializeFeatureFlags();

      const { result: emergencyResult } = renderHook(() => useEmergencyFeatureControl());

      // Enable multiple features first
      const store = useFeatureFlagStore.getState();
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          CLOUD_SYNC_ENABLED: true,
          ANALYTICS_ENABLED: true,
          THERAPIST_PORTAL_ENABLED: true,
          BETA_FEATURES_ENABLED: true
        }
      });

      // Trigger emergency shutdown
      await act(async () => {
        await emergencyResult.current.emergencyDisableAll();
      });

      // Non-critical features should be disabled
      expect(store.flags.ANALYTICS_ENABLED).toBe(false);
      expect(store.flags.BETA_FEATURES_ENABLED).toBe(false);

      // Critical features should remain
      expect(store.flags.EMERGENCY_CONTACTS_CLOUD).toBe(true);
      expect(store.flags.PUSH_NOTIFICATIONS_ENABLED).toBe(true);

      // Emergency mode should be active
      expect(store.safetyStatus.emergencyOverrideActive).toBe(true);

      // Recovery: Disable emergency mode
      await act(async () => {
        await emergencyResult.current.emergencyEnableOffline();
      });

      expect(store.safetyStatus.offlineFallbackReady).toBe(true);
    });

    test('HIPAA compliance throughout feature lifecycle', async () => {
      await initializeFeatureFlags();

      const { result: safetyResult } = renderHook(() =>
        useSafetyAwareFeature('THERAPIST_PORTAL_ENABLED')
      );

      // HIPAA-relevant feature should require encryption
      expect(safetyResult.current.hipaaRelevant).toBe(true);
      expect(safetyResult.current.encryptionRequired).toBe(true);

      // Enable the feature
      await act(async () => {
        await safetyResult.current.updateConsent(true);
        await safetyResult.current.requestAccess();
      });

      // Encryption should be validated
      expect(safetyResult.current.safetyValidated).toBe(true);

      const store = useFeatureFlagStore.getState();
      const hipaaCompliant = await store.checkHIPAACompliance();
      expect(hipaaCompliant).toBe(true);
    });
  });

  describe('4. Cost Management Scenarios', () => {
    test('Budget approach and automatic limiting', async () => {
      await initializeFeatureFlags();

      // Mock approaching budget limit
      const { costMonitoringService } = require('../../src/services/cloud/CostMonitoring');
      costMonitoringService.getCurrentCosts.mockResolvedValue({
        total: 85.0,
        budgetRemaining: 0.15, // 15% remaining
        byFeature: {
          CLOUD_SYNC_ENABLED: 25.0,
          ANALYTICS_ENABLED: 20.0,
          THERAPIST_PORTAL_ENABLED: 25.0,
          AI_INSIGHTS_ENABLED: 15.0
        },
        limitedFeatures: ['AI_INSIGHTS_ENABLED'],
        recommendations: ['Consider disabling AI insights to reduce costs'],
        efficiency: 0.6
      });

      const store = useFeatureFlagStore.getState();
      await store.checkCostLimits();

      // Should limit expensive features
      expect(store.costStatus.limitedFeatures).toContain('AI_INSIGHTS_ENABLED');
      expect(store.costStatus.budgetRemaining).toBe(0.15);

      // AI insights should be disabled due to cost
      expect(store.evaluateFlag('AI_INSIGHTS_ENABLED')).toBe(false);
    });

    test('Cost optimization workflow', async () => {
      await initializeFeatureFlags();

      const store = useFeatureFlagStore.getState();

      // Enable features that could be optimized
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          CLOUD_SYNC_ENABLED: true,
          ANALYTICS_ENABLED: true,
          THERAPIST_PORTAL_ENABLED: true
        }
      });

      // Run cost optimization
      await store.optimizeCosts();

      // Should apply automated optimizations
      const { costMonitoringService } = require('../../src/services/cloud/CostMonitoring');
      expect(costMonitoringService.getOptimizationRecommendations).toHaveBeenCalled();
    });

    test('Budget exceeded emergency response', async () => {
      await initializeFeatureFlags();

      // Mock budget exceeded
      const { costMonitoringService } = require('../../src/services/cloud/CostMonitoring');
      costMonitoringService.getCurrentCosts.mockResolvedValue({
        total: 120.0,
        budgetRemaining: -0.2, // 20% over budget
        byFeature: {},
        limitedFeatures: [],
        recommendations: ['EMERGENCY: Budget exceeded - disable all non-critical features'],
        efficiency: 0.3
      });

      const store = useFeatureFlagStore.getState();

      // Enable expensive features
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          AI_INSIGHTS_ENABLED: true,
          THERAPIST_PORTAL_ENABLED: true,
          CROSS_DEVICE_SYNC_ENABLED: true
        }
      });

      await store.disableExpensiveFeatures();

      // Should disable expensive features that can be disabled
      expect(store.flags.AI_INSIGHTS_ENABLED).toBe(false);

      // Crisis features should remain
      expect(store.flags.EMERGENCY_CONTACTS_CLOUD).toBe(true);
    });
  });

  describe('5. Network and Offline Scenarios', () => {
    test('Online to offline transition', async () => {
      await initializeFeatureFlags();

      const { networkService } = require('../../src/services/NetworkService');

      // Start online with cloud features
      networkService.isOnline.mockReturnValue(true);

      const store = useFeatureFlagStore.getState();
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          CLOUD_SYNC_ENABLED: true,
          ANALYTICS_ENABLED: true
        }
      });

      expect(store.flags.CLOUD_SYNC_ENABLED).toBe(true);

      // Go offline
      networkService.isOnline.mockReturnValue(false);

      // Should still work but with offline fallback
      expect(store.safetyStatus.offlineFallbackReady).toBe(true);

      // Crisis features should always work
      const crisisValid = await store.validateCrisisAccess();
      expect(crisisValid).toBe(true);
    });

    test('Offline mode with emergency override', async () => {
      await initializeFeatureFlags();

      const { networkService } = require('../../src/services/NetworkService');
      networkService.isOnline.mockReturnValue(false);

      const store = useFeatureFlagStore.getState();

      // Trigger emergency offline mode
      await store.emergencyEnableOfflineMode();

      expect(store.safetyStatus.emergencyOverrideActive).toBe(true);
      expect(store.safetyStatus.offlineFallbackReady).toBe(true);

      // Critical features should remain accessible
      expect(store.flags.EMERGENCY_CONTACTS_CLOUD).toBe(true);
      expect(store.flags.PUSH_NOTIFICATIONS_ENABLED).toBe(true);
    });

    test('Network recovery and feature restoration', async () => {
      await initializeFeatureFlags();

      const { networkService } = require('../../src/services/NetworkService');

      // Start offline
      networkService.isOnline.mockReturnValue(false);

      const store = useFeatureFlagStore.getState();
      await store.emergencyEnableOfflineMode();

      // Go back online
      networkService.isOnline.mockReturnValue(true);

      // Should be able to restore features
      useFeatureFlagStore.setState({
        safetyStatus: {
          ...store.safetyStatus,
          emergencyOverrideActive: false
        }
      });

      // Health check should pass
      const healthStatus = await store.getHealthStatus();
      expect(healthStatus.overall).toBe('healthy');
    });
  });

  describe('6. Performance and Scalability', () => {
    test('System performance with multiple concurrent users', async () => {
      await initializeFeatureFlags();

      // Simulate multiple users with different feature combinations
      const userScenarios = [
        ['ANALYTICS_ENABLED'],
        ['CLOUD_SYNC_ENABLED', 'ANALYTICS_ENABLED'],
        ['CLOUD_SYNC_ENABLED', 'THERAPIST_PORTAL_ENABLED'],
        ['PUSH_NOTIFICATIONS_ENABLED', 'EMERGENCY_CONTACTS_CLOUD'],
        ['BETA_FEATURES_ENABLED', 'DEBUG_CLOUD_LOGS']
      ];

      const startTime = performance.now();

      // Process all scenarios concurrently
      const promises = userScenarios.map(async (features, index) => {
        const flags = { ...DEFAULT_FEATURE_FLAGS };
        features.forEach(feature => {
          flags[feature as keyof typeof flags] = true;
        });

        useFeatureFlagStore.setState({ flags });

        // Simulate user interactions
        const store = useFeatureFlagStore.getState();
        await store.validateAllFeatures();
        await store.checkCostLimits();

        return features.length;
      });

      const results = await Promise.all(promises);
      const endTime = performance.now();

      expect(results).toHaveLength(userScenarios.length);
      expect(endTime - startTime).toBeLessThan(1000); // 1 second for all scenarios
    });

    test('Memory usage during extended operation', () => {
      const initialHeap = (performance as any).memory?.usedJSHeapSize || 0;

      // Simulate extended usage
      for (let i = 0; i < 500; i++) {
        const store = useFeatureFlagStore.getState();

        // Cycle through different feature combinations
        const features = Object.keys(DEFAULT_FEATURE_FLAGS);
        const randomFeature = features[i % features.length];

        store.evaluateFlag(randomFeature as keyof typeof DEFAULT_FEATURE_FLAGS);
      }

      const finalHeap = (performance as any).memory?.usedJSHeapSize || 0;
      const heapGrowth = finalHeap - initialHeap;

      // Memory growth should be reasonable
      if (initialHeap > 0) {
        expect(heapGrowth).toBeLessThan(1024 * 1024); // 1MB max growth
      }
    });

    test('Crisis response time under load', async () => {
      await initializeFeatureFlags();

      // Enable all features to create maximum load
      const allEnabled = Object.keys(DEFAULT_FEATURE_FLAGS).reduce((acc, key) => {
        acc[key as keyof typeof DEFAULT_FEATURE_FLAGS] = true;
        return acc;
      }, {} as typeof DEFAULT_FEATURE_FLAGS);

      useFeatureFlagStore.setState({ flags: allEnabled });

      const store = useFeatureFlagStore.getState();

      // Test crisis response under load
      const iterations = 20;
      const responseTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await store.validateCrisisAccess();
        const endTime = performance.now();

        responseTimes.push(endTime - startTime);
      }

      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);

      expect(averageResponseTime).toBeLessThan(100); // Very fast average
      expect(maxResponseTime).toBeLessThan(200); // All responses under limit
    });
  });

  describe('7. Data Integrity and Consistency', () => {
    test('Feature state consistency across operations', async () => {
      await initializeFeatureFlags();

      const store = useFeatureFlagStore.getState();

      // Perform rapid state changes
      const operations = [
        () => store.updateUserConsent('ANALYTICS_ENABLED', true),
        () => store.updateUserConsent('CLOUD_SYNC_ENABLED', true),
        () => store.requestFeatureAccess('ANALYTICS_ENABLED'),
        () => store.requestFeatureAccess('CLOUD_SYNC_ENABLED'),
        () => store.updateRolloutPercentage('PUSH_NOTIFICATIONS_ENABLED', 75),
        () => store.refreshMetrics()
      ];

      await Promise.all(operations.map(op => op()));

      // State should be consistent
      expect(store.userConsents.ANALYTICS_ENABLED).toBe(true);
      expect(store.userConsents.CLOUD_SYNC_ENABLED).toBe(true);
      expect(store.flags.ANALYTICS_ENABLED).toBe(true);
      expect(store.flags.CLOUD_SYNC_ENABLED).toBe(true);
    });

    test('Storage persistence and recovery', async () => {
      await initializeFeatureFlags();

      const store = useFeatureFlagStore.getState();

      // Enable features and set consents
      await store.updateUserConsent('ANALYTICS_ENABLED', true);
      await store.updateUserConsent('CLOUD_SYNC_ENABLED', true);
      await store.requestFeatureAccess('ANALYTICS_ENABLED');
      await store.requestFeatureAccess('CLOUD_SYNC_ENABLED');

      const { secureDataStore } = require('../../src/services/storage/SecureDataStore');

      // Verify storage calls were made
      expect(secureDataStore.saveFeatureFlags).toHaveBeenCalled();
      expect(secureDataStore.saveUserConsents).toHaveBeenCalled();

      // Simulate app restart by reinitializing
      secureDataStore.getFeatureFlags.mockResolvedValue({
        ANALYTICS_ENABLED: true,
        CLOUD_SYNC_ENABLED: true
      });

      secureDataStore.getUserConsents.mockResolvedValue({
        ANALYTICS_ENABLED: true,
        CLOUD_SYNC_ENABLED: true
      });

      await store.initializeFlags();

      // State should be restored
      expect(store.flags.ANALYTICS_ENABLED).toBe(true);
      expect(store.flags.CLOUD_SYNC_ENABLED).toBe(true);
      expect(store.userConsents.ANALYTICS_ENABLED).toBe(true);
      expect(store.userConsents.CLOUD_SYNC_ENABLED).toBe(true);
    });
  });

  describe('8. Error Recovery and Resilience', () => {
    test('System resilience to service failures', async () => {
      const { costMonitoringService } = require('../../src/services/cloud/CostMonitoring');
      const { crisisProtectionService } = require('../../src/services/CrisisProtectionService');

      // Mock service failures
      costMonitoringService.getCurrentCosts.mockRejectedValue(new Error('Cost service down'));
      crisisProtectionService.measureResponseTime.mockRejectedValue(new Error('Crisis service down'));

      await initializeFeatureFlags();

      const store = useFeatureFlagStore.getState();

      // System should still function with defaults
      expect(store.flags).toEqual(DEFAULT_FEATURE_FLAGS);
      expect(store.safetyStatus.offlineFallbackReady).toBe(true);

      // Crisis access should still work
      const crisisValid = await store.validateCrisisAccess();
      expect(crisisValid).toBe(true);
    });

    test('Recovery from corrupted state', async () => {
      await initializeFeatureFlags();

      // Corrupt the store state
      useFeatureFlagStore.setState({
        flags: null as any,
        metadata: {} as any,
        userConsents: null as any,
        error: 'Corrupted state'
      });

      // Reinitialize
      await initializeFeatureFlags();

      const store = useFeatureFlagStore.getState();

      // Should recover to safe defaults
      expect(store.flags).toBeDefined();
      expect(store.metadata).toBeDefined();
      expect(store.userConsents).toBeDefined();
      expect(store.error).toBeNull();
    });

    test('Emergency mode as ultimate fallback', async () => {
      await initializeFeatureFlags();

      const { result: emergencyResult } = renderHook(() => useEmergencyFeatureControl());

      // Simulate system-wide failure
      const store = useFeatureFlagStore.getState();
      useFeatureFlagStore.setState({
        error: 'System failure',
        healthStatus: {
          ...store.healthStatus,
          overall: 'critical'
        }
      });

      // Emergency controls should still work
      await act(async () => {
        await emergencyResult.current.emergencyEnableOffline();
      });

      expect(store.safetyStatus.emergencyOverrideActive).toBe(true);
      expect(store.safetyStatus.offlineFallbackReady).toBe(true);

      // Crisis features should remain accessible
      const crisisValid = await store.validateCrisisAccess();
      expect(crisisValid).toBe(true);
    });
  });
});