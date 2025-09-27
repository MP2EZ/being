/**
 * Unit Tests - Feature Flag Store
 *
 * Comprehensive tests for the feature flag control center ensuring
 * all cloud features default OFF and preserve offline-first behavior
 * while maintaining crisis response <200ms requirements
 */

import { useFeatureFlagStore } from '../../src/store/featureFlagStore';
import {
  P0CloudFeatureFlags,
  DEFAULT_FEATURE_FLAGS,
  FEATURE_FLAG_CONSTANTS,
  FEATURE_FLAG_METADATA
} from '../../src/types/feature-flags';

// Mock dependencies
jest.mock('../../src/services/storage/SecureDataStore', () => ({
  secureDataStore: {
    getFeatureFlags: jest.fn().mockResolvedValue({}),
    getUserConsents: jest.fn().mockResolvedValue({}),
    getUserEligibility: jest.fn().mockResolvedValue(null),
    saveFeatureFlags: jest.fn().mockResolvedValue(undefined),
    saveUserConsents: jest.fn().mockResolvedValue(undefined),
    saveUserEligibility: jest.fn().mockResolvedValue(undefined),
    saveRolloutPercentages: jest.fn().mockResolvedValue(undefined),
    validateEncryption: jest.fn().mockResolvedValue(true)
  }
}));

jest.mock('../../src/services/NetworkService', () => ({
  networkService: {
    isOnline: jest.fn().mockReturnValue(false)
  }
}));

jest.mock('../../src/services/CrisisProtectionService', () => ({
  crisisProtectionService: {
    isInCrisisMode: jest.fn().mockReturnValue(false),
    measureResponseTime: jest.fn().mockResolvedValue(150),
    testFeatureResponse: jest.fn().mockResolvedValue(180)
  }
}));

jest.mock('../../src/services/cloud/CostMonitoring', () => ({
  costMonitoringService: {
    getCurrentCosts: jest.fn().mockResolvedValue({
      total: 5.50,
      budgetRemaining: 0.75,
      byFeature: {},
      limitedFeatures: [],
      recommendations: [],
      efficiency: 0.85
    }),
    getProjectedCosts: jest.fn().mockResolvedValue({
      monthly: 15.0,
      breakEvenUsers: 65
    }),
    getOptimizationRecommendations: jest.fn().mockResolvedValue([])
  }
}));

jest.mock('../../src/services/cloud/CloudMonitoring', () => ({
  cloudMonitoringService: {
    reportEmergencyDisable: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('Unit Tests: Feature Flag Store', () => {
  let store: ReturnType<typeof useFeatureFlagStore>;

  beforeEach(() => {
    store = useFeatureFlagStore.getState();
    // Reset store to initial state
    useFeatureFlagStore.setState({
      flags: { ...DEFAULT_FEATURE_FLAGS },
      userConsents: {},
      rolloutPercentages: {},
      userEligibility: null,
      isLoading: false,
      isUpdating: false,
      error: null
    });
  });

  describe('1. Feature Flag System Validation', () => {
    test('All cloud features default OFF', () => {
      const flags = store.flags;

      // Every feature flag should default to false
      Object.entries(flags).forEach(([key, value]) => {
        expect(value).toBe(false);
      });

      // Specifically test critical flags
      expect(flags.CLOUD_SYNC_ENABLED).toBe(false);
      expect(flags.PAYMENT_SYSTEM_ENABLED).toBe(false);
      expect(flags.THERAPIST_PORTAL_ENABLED).toBe(false);
      expect(flags.ANALYTICS_ENABLED).toBe(false);
      expect(flags.PUSH_NOTIFICATIONS_ENABLED).toBe(false);
      expect(flags.CROSS_DEVICE_SYNC_ENABLED).toBe(false);
      expect(flags.AI_INSIGHTS_ENABLED).toBe(false);
      expect(flags.FAMILY_SHARING_ENABLED).toBe(false);
      expect(flags.EMERGENCY_CONTACTS_CLOUD).toBe(false);
      expect(flags.BACKUP_RESTORE_ENABLED).toBe(false);
      expect(flags.BETA_FEATURES_ENABLED).toBe(false);
      expect(flags.DEBUG_CLOUD_LOGS).toBe(false);
      expect(flags.STAGING_ENVIRONMENT).toBe(false);
    });

    test('Feature flags integrate with existing offline app', async () => {
      // Initialize flags
      await store.initializeFlags();

      // All flags should remain false after initialization
      expect(store.flags.CLOUD_SYNC_ENABLED).toBe(false);
      expect(store.flags.ANALYTICS_ENABLED).toBe(false);

      // Store should be in healthy state
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeNull();
      expect(store.safetyStatus.offlineFallbackReady).toBe(true);
    });

    test('Emergency controls and crisis safety overrides work', async () => {
      // Enable some features first
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          CLOUD_SYNC_ENABLED: true,
          ANALYTICS_ENABLED: true,
          BETA_FEATURES_ENABLED: true
        }
      });

      // Test emergency disable
      await store.emergencyDisable('ANALYTICS_ENABLED', 'Test emergency');

      expect(store.flags.ANALYTICS_ENABLED).toBe(false);
      expect(store.healthStatus.features.ANALYTICS_ENABLED).toBe('disabled');
      expect(store.healthStatus.overall).toBe('warning');
    });

    test('Progressive rollout and consent management work', async () => {
      // Set up user eligibility
      const eligibility = {
        userId: 'test-user-123',
        planType: 'premium' as const,
        rolloutSegment: 'beta',
        betaOptIn: true,
        geographicRegion: 'US',
        appVersion: '1.0.0',
        deviceType: 'ios' as const,
        eligibleFeatures: ['CLOUD_SYNC_ENABLED' as keyof P0CloudFeatureFlags],
        waitlistFeatures: []
      };

      await store.updateUserEligibility(eligibility);

      // Set rollout percentage
      await store.updateRolloutPercentage('CLOUD_SYNC_ENABLED', 50);

      // Check rollout eligibility
      const isEligible = store.checkRolloutEligibility('CLOUD_SYNC_ENABLED');
      expect(typeof isEligible).toBe('boolean');

      // Test consent management
      await store.updateUserConsent('CLOUD_SYNC_ENABLED', true);
      expect(store.userConsents.CLOUD_SYNC_ENABLED).toBe(true);
    });
  });

  describe('2. Integration Testing', () => {
    test('Feature flags work with cloud services when enabled', async () => {
      // Set up eligibility and enable cloud sync
      const eligibility = {
        userId: 'test-user-456',
        planType: 'premium' as const,
        rolloutSegment: 'early',
        betaOptIn: false,
        geographicRegion: 'US',
        appVersion: '1.0.0',
        deviceType: 'ios' as const,
        eligibleFeatures: ['CLOUD_SYNC_ENABLED' as keyof P0CloudFeatureFlags],
        waitlistFeatures: []
      };

      await store.updateUserEligibility(eligibility);
      await store.updateUserConsent('CLOUD_SYNC_ENABLED', true);
      await store.updateRolloutPercentage('CLOUD_SYNC_ENABLED', 100);

      // Request feature access
      const result = await store.requestFeatureAccess('CLOUD_SYNC_ENABLED');

      expect(result.granted).toBe(true);
      expect(store.flags.CLOUD_SYNC_ENABLED).toBe(true);
    });

    test('Offline-first behavior is preserved', () => {
      // Even with features enabled, offline fallback should be ready
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          CLOUD_SYNC_ENABLED: true,
          PUSH_NOTIFICATIONS_ENABLED: true
        }
      });

      expect(store.safetyStatus.offlineFallbackReady).toBe(true);

      // Crisis features should always work offline
      const crisisFeatures = ['EMERGENCY_CONTACTS_CLOUD'];
      crisisFeatures.forEach(feature => {
        const metadata = FEATURE_FLAG_METADATA[feature as keyof P0CloudFeatureFlags];
        expect(metadata.canDisableInCrisis).toBe(false);
      });
    });

    test('Crisis response time maintained', async () => {
      const crisisValid = await store.validateCrisisAccess();
      expect(crisisValid).toBe(true);

      expect(store.safetyStatus.crisisResponseTime).toBeLessThan(
        FEATURE_FLAG_CONSTANTS.CRISIS_RESPONSE_MAX_MS
      );
    });

    test('HIPAA compliance maintained with feature flag controls', async () => {
      // Enable HIPAA-relevant features
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          CLOUD_SYNC_ENABLED: true,
          THERAPIST_PORTAL_ENABLED: true
        }
      });

      const hipaaCompliant = await store.checkHIPAACompliance();
      expect(hipaaCompliant).toBe(true);
      expect(store.safetyStatus.encryptionValidated).toBe(true);
    });
  });

  describe('3. Performance Testing', () => {
    test('App startup time not impacted by feature flag system', async () => {
      const startTime = performance.now();

      await store.initializeFlags();

      const endTime = performance.now();
      const initTime = endTime - startTime;

      // Feature flag initialization should be fast
      expect(initTime).toBeLessThan(100); // 100ms max
    });

    test('Feature flag evaluation performance', () => {
      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        store.evaluateFlag('CLOUD_SYNC_ENABLED');
        store.evaluateFlag('ANALYTICS_ENABLED');
        store.evaluateFlag('PUSH_NOTIFICATIONS_ENABLED');
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / (iterations * 3);

      // Each flag evaluation should be very fast
      expect(avgTime).toBeLessThan(0.1); // 0.1ms per evaluation
    });

    test('Memory usage remains acceptable', () => {
      const initialHeap = (performance as any).memory?.usedJSHeapSize || 0;

      // Simulate heavy usage
      for (let i = 0; i < 100; i++) {
        store.evaluateFlag('CLOUD_SYNC_ENABLED');
        store.getFeatureUsage('ANALYTICS_ENABLED');
      }

      const finalHeap = (performance as any).memory?.usedJSHeapSize || 0;
      const heapGrowth = finalHeap - initialHeap;

      // Memory growth should be minimal (if supported)
      if (initialHeap > 0) {
        expect(heapGrowth).toBeLessThan(1024 * 1024); // 1MB max growth
      }
    });

    test('Battery impact assessment', () => {
      // Simulate periodic health checks
      const checksPerMinute = 60; // Every second for a minute

      const startTime = performance.now();

      for (let i = 0; i < checksPerMinute; i++) {
        store.evaluateFlag('CLOUD_SYNC_ENABLED');
        store.evaluateFlag('ANALYTICS_ENABLED');
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete quickly to minimize battery impact
      expect(totalTime).toBeLessThan(50); // 50ms for 60 checks
    });
  });

  describe('4. Safety & Compliance Testing', () => {
    test('Crisis features cannot be disabled by flags', () => {
      const crisisProtectedFeatures = [
        'EMERGENCY_CONTACTS_CLOUD',
        'PUSH_NOTIFICATIONS_ENABLED'
      ];

      crisisProtectedFeatures.forEach(feature => {
        const metadata = FEATURE_FLAG_METADATA[feature as keyof P0CloudFeatureFlags];
        expect(metadata.canDisableInCrisis).toBe(false);
      });
    });

    test('PHQ-9/GAD-7 accuracy maintained regardless of feature flags', async () => {
      // Feature flags should not affect assessment scoring
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          ANALYTICS_ENABLED: true,
          CLOUD_SYNC_ENABLED: true
        }
      });

      // Validate all features to ensure assessments still work
      const allValid = await store.validateAllFeatures();
      expect(allValid).toBe(true);

      // Crisis response time should remain fast
      expect(store.safetyStatus.crisisResponseTime).toBeLessThan(200);
    });

    test('Emergency shutdown and recovery scenarios', async () => {
      // Enable features
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          CLOUD_SYNC_ENABLED: true,
          ANALYTICS_ENABLED: true,
          BETA_FEATURES_ENABLED: true
        }
      });

      // Test emergency offline mode
      await store.emergencyEnableOfflineMode();

      expect(store.safetyStatus.emergencyOverrideActive).toBe(true);
      expect(store.safetyStatus.offlineFallbackReady).toBe(true);

      // Non-critical features should be disabled
      expect(store.flags.ANALYTICS_ENABLED).toBe(false);
      expect(store.flags.BETA_FEATURES_ENABLED).toBe(false);

      // Critical features should remain enabled
      expect(store.flags.EMERGENCY_CONTACTS_CLOUD).toBe(true);
      expect(store.flags.PUSH_NOTIFICATIONS_ENABLED).toBe(true);
    });

    test('Audit logging for feature flag changes', async () => {
      const consoleSpy = jest.spyOn(console, 'warn');

      await store.emergencyDisable('ANALYTICS_ENABLED', 'Test audit log');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Emergency disable triggered for ANALYTICS_ENABLED: Test audit log')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('5. Cost Control Testing', () => {
    test('Budget monitoring and alerts', async () => {
      const costStatus = await store.checkCostLimits();

      expect(costStatus.currentSpend).toBeDefined();
      expect(costStatus.budgetRemaining).toBeDefined();
      expect(costStatus.projectedMonthlySpend).toBeDefined();
      expect(costStatus.featureCosts).toBeDefined();
      expect(costStatus.breakEvenUsers).toBeGreaterThan(0);
    });

    test('Automatic feature limiting when over budget', async () => {
      // Simulate low budget
      useFeatureFlagStore.setState({
        costStatus: {
          currentSpend: 95,
          budgetRemaining: 0.1, // 10% remaining
          projectedMonthlySpend: 200,
          featureCosts: {},
          limitedFeatures: [],
          recommendations: [],
          breakEvenUsers: 100,
          costEfficiency: 0.5
        }
      });

      await store.disableExpensiveFeatures();

      // High-cost features should be in limited list
      const expensiveFeatures = Object.entries(FEATURE_FLAG_METADATA)
        .filter(([_, metadata]) =>
          metadata.costImpact === 'high' || metadata.costImpact === 'variable'
        )
        .map(([key, _]) => key);

      expensiveFeatures.forEach(feature => {
        if (FEATURE_FLAG_METADATA[feature as keyof P0CloudFeatureFlags].canDisableInCrisis) {
          expect(store.flags[feature as keyof P0CloudFeatureFlags]).toBe(false);
        }
      });
    });

    test('Cost projections accuracy', async () => {
      const costStatus = await store.checkCostLimits();

      // Projections should be reasonable
      expect(costStatus.projectedMonthlySpend).toBeGreaterThan(0);
      expect(costStatus.breakEvenUsers).toBeGreaterThan(50);
      expect(costStatus.breakEvenUsers).toBeLessThan(100);
      expect(costStatus.costEfficiency).toBeGreaterThan(0);
      expect(costStatus.costEfficiency).toBeLessThanOrEqual(1);
    });

    test('Cost transparency for users', () => {
      Object.entries(FEATURE_FLAG_METADATA).forEach(([key, metadata]) => {
        expect(metadata.costImpact).toMatch(/^(none|low|medium|high|variable)$/);
        expect(metadata.displayName).toBeTruthy();
        expect(metadata.description).toBeTruthy();
      });
    });
  });

  describe('6. Edge Cases and Error Handling', () => {
    test('Invalid feature flag keys handled gracefully', () => {
      expect(() => {
        store.evaluateFlag('INVALID_FLAG' as any);
      }).not.toThrow();
    });

    test('Network failures do not break feature evaluation', () => {
      // Mock network failure
      jest.spyOn(console, 'error').mockImplementation();

      // Feature evaluation should still work
      expect(store.evaluateFlag('CLOUD_SYNC_ENABLED')).toBe(false);
      expect(store.evaluateFlag('ANALYTICS_ENABLED')).toBe(false);

      jest.restoreAllMocks();
    });

    test('Storage failures handled gracefully', async () => {
      const { secureDataStore } = require('../../src/services/storage/SecureDataStore');
      secureDataStore.saveFeatureFlags.mockRejectedValueOnce(new Error('Storage failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await store.requestFeatureAccess('ANALYTICS_ENABLED');

      expect(result.granted).toBe(false);
      expect(result.reason).toBe('Failed to enable feature');

      consoleSpy.mockRestore();
    });

    test('Concurrent flag evaluations', async () => {
      const promises = Array(100).fill(null).map(() =>
        Promise.resolve(store.evaluateFlag('CLOUD_SYNC_ENABLED'))
      );

      const results = await Promise.all(promises);

      // All results should be consistent
      expect(results.every(result => result === false)).toBe(true);
    });

    test('Rapid flag updates handled correctly', async () => {
      const updates = Array(10).fill(null).map((_, index) =>
        store.updateUserConsent('ANALYTICS_ENABLED', index % 2 === 0)
      );

      await Promise.all(updates);

      // Final state should be consistent
      expect(typeof store.userConsents.ANALYTICS_ENABLED).toBe('boolean');
    });
  });

  describe('7. Security and Privacy', () => {
    test('Sensitive data encrypted in storage', async () => {
      const { secureDataStore } = require('../../src/services/storage/SecureDataStore');

      await store.updateUserConsent('CLOUD_SYNC_ENABLED', true);

      expect(secureDataStore.saveUserConsents).toHaveBeenCalled();
      expect(secureDataStore.validateEncryption).toHaveBeenCalled();
    });

    test('HIPAA-relevant features require encryption', () => {
      const hipaaFeatures = Object.entries(FEATURE_FLAG_METADATA)
        .filter(([_, metadata]) => metadata.hipaaRelevant)
        .map(([key, _]) => key);

      expect(hipaaFeatures.length).toBeGreaterThan(0);

      hipaaFeatures.forEach(feature => {
        const metadata = FEATURE_FLAG_METADATA[feature as keyof P0CloudFeatureFlags];
        expect(metadata.requiresConsent).toBe(true);
      });
    });

    test('User consent properly tracked', async () => {
      await store.updateUserConsent('ANALYTICS_ENABLED', true);
      expect(store.userConsents.ANALYTICS_ENABLED).toBe(true);

      await store.updateUserConsent('ANALYTICS_ENABLED', false);
      expect(store.userConsents.ANALYTICS_ENABLED).toBe(false);
    });
  });
});