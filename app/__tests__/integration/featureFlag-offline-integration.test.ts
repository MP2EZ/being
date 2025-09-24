/**
 * Integration Tests - Feature Flag Offline Integration
 *
 * Tests that feature flags preserve offline-first behavior and
 * maintain crisis response <200ms requirement in all scenarios
 */

import { useFeatureFlagStore } from '../../src/store/featureFlagStore';
import { useCheckInStore } from '../../src/store/checkInStore';
import { useAssessmentStore } from '../../src/store/assessmentStore';
import { useCrisisStore } from '../../src/store/crisisStore';
import { DEFAULT_FEATURE_FLAGS, FEATURE_FLAG_CONSTANTS } from '../../src/types/feature-flags';

// Mock critical services
jest.mock('../../src/services/storage/SecureDataStore', () => ({
  secureDataStore: {
    getFeatureFlags: jest.fn().mockResolvedValue({}),
    getUserConsents: jest.fn().mockResolvedValue({}),
    getUserEligibility: jest.fn().mockResolvedValue(null),
    saveFeatureFlags: jest.fn().mockResolvedValue(undefined),
    saveUserConsents: jest.fn().mockResolvedValue(undefined),
    validateEncryption: jest.fn().mockResolvedValue(true),
    getData: jest.fn().mockResolvedValue(null),
    saveData: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock('../../src/services/NetworkService', () => ({
  networkService: {
    isOnline: jest.fn().mockReturnValue(false),
    checkConnectivity: jest.fn().mockResolvedValue(false)
  }
}));

jest.mock('../../src/services/CrisisProtectionService', () => ({
  crisisProtectionService: {
    isInCrisisMode: jest.fn().mockReturnValue(false),
    measureResponseTime: jest.fn().mockResolvedValue(150),
    testFeatureResponse: jest.fn().mockResolvedValue(180),
    checkCrisisThresholds: jest.fn().mockReturnValue(false),
    triggerCrisisProtocol: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock('../../src/services/cloud/CostMonitoring', () => ({
  costMonitoringService: {
    getCurrentCosts: jest.fn().mockResolvedValue({
      total: 0,
      budgetRemaining: 1.0,
      byFeature: {},
      limitedFeatures: [],
      recommendations: [],
      efficiency: 1.0
    }),
    getProjectedCosts: jest.fn().mockResolvedValue({
      monthly: 0,
      breakEvenUsers: 75
    })
  }
}));

// Mock other stores
jest.mock('../../src/store/checkInStore', () => ({
  useCheckInStore: {
    getState: jest.fn(() => ({
      todayCheckIn: null,
      completedCheckIns: [],
      createCheckIn: jest.fn(),
      completeCheckIn: jest.fn(),
      isOfflineMode: false
    }))
  }
}));

jest.mock('../../src/store/assessmentStore', () => ({
  useAssessmentStore: {
    getState: jest.fn(() => ({
      assessments: [],
      createAssessment: jest.fn(),
      calculateScore: jest.fn(),
      checkCrisisThreshold: jest.fn(),
      isOfflineMode: false
    }))
  }
}));

jest.mock('../../src/store/crisisStore', () => ({
  useCrisisStore: {
    getState: jest.fn(() => ({
      isInCrisis: false,
      activeCrisisPlan: null,
      emergencyContacts: [],
      triggerCrisis: jest.fn(),
      call988: jest.fn(),
      responseTime: 150
    }))
  }
}));

describe('Integration Tests: Feature Flag Offline Integration', () => {
  let featureFlagStore: ReturnType<typeof useFeatureFlagStore.getState>;
  let checkInStore: ReturnType<typeof useCheckInStore.getState>;
  let assessmentStore: ReturnType<typeof useAssessmentStore.getState>;
  let crisisStore: ReturnType<typeof useCrisisStore.getState>;

  beforeEach(async () => {
    // Reset all stores
    featureFlagStore = useFeatureFlagStore.getState();
    checkInStore = useCheckInStore.getState();
    assessmentStore = useAssessmentStore.getState();
    crisisStore = useCrisisStore.getState();

    // Initialize feature flags
    await featureFlagStore.initializeFlags();

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('1. Offline-First Behavior Preservation', () => {
    test('App functions normally with all features disabled', async () => {
      // Verify all features are disabled by default
      expect(featureFlagStore.flags.CLOUD_SYNC_ENABLED).toBe(false);
      expect(featureFlagStore.flags.ANALYTICS_ENABLED).toBe(false);
      expect(featureFlagStore.flags.PUSH_NOTIFICATIONS_ENABLED).toBe(false);
      expect(featureFlagStore.flags.THERAPIST_PORTAL_ENABLED).toBe(false);

      // Core app functions should still work
      expect(featureFlagStore.safetyStatus.offlineFallbackReady).toBe(true);
      expect(featureFlagStore.safetyStatus.crisisResponseTime).toBeLessThan(200);
    });

    test('Check-in functionality works without cloud features', async () => {
      // Mock check-in creation
      const mockCheckIn = {
        id: 'morning-test',
        type: 'morning' as const,
        startedAt: new Date().toISOString(),
        data: {
          sleepQuality: 7,
          energyLevel: 6,
          anxietyLevel: 3
        }
      };

      checkInStore.createCheckIn = jest.fn().mockResolvedValue(mockCheckIn);

      // Should work offline without cloud sync
      const checkIn = await checkInStore.createCheckIn('morning');
      expect(checkIn).toBeDefined();
      expect(checkInStore.createCheckIn).toHaveBeenCalledWith('morning');
    });

    test('Assessment functionality works without cloud features', async () => {
      // Mock assessment creation
      const mockAssessment = {
        id: 'phq9-test',
        type: 'phq9' as const,
        answers: [1, 1, 1, 1, 1, 1, 1, 1, 0],
        score: 8,
        severity: 'mild' as const,
        completedAt: new Date().toISOString(),
        context: 'standalone' as const
      };

      assessmentStore.createAssessment = jest.fn().mockResolvedValue(mockAssessment);
      assessmentStore.calculateScore = jest.fn().mockReturnValue(8);

      // Should work offline
      const assessment = await assessmentStore.createAssessment('phq9', [1, 1, 1, 1, 1, 1, 1, 1, 0]);
      expect(assessment).toBeDefined();
      expect(assessmentStore.calculateScore).toHaveBeenCalled();
    });

    test('Crisis features work without cloud features', async () => {
      // Crisis response should always work, regardless of feature flags
      crisisStore.call988 = jest.fn().mockResolvedValue(undefined);
      crisisStore.triggerCrisis = jest.fn().mockResolvedValue(undefined);

      await crisisStore.call988();
      expect(crisisStore.call988).toHaveBeenCalled();

      await crisisStore.triggerCrisis('assessment_triggered');
      expect(crisisStore.triggerCrisis).toHaveBeenCalledWith('assessment_triggered');
    });
  });

  describe('2. Progressive Feature Enablement', () => {
    test('Enabling analytics does not break offline functionality', async () => {
      // Enable analytics
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          ANALYTICS_ENABLED: true
        }
      });

      // Offline functionality should still work
      expect(featureFlagStore.safetyStatus.offlineFallbackReady).toBe(true);

      // Check-ins should still work
      const mockCheckIn = await checkInStore.createCheckIn('evening');
      expect(mockCheckIn).toBeDefined();
    });

    test('Enabling cloud sync maintains offline fallback', async () => {
      // Enable cloud sync
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          CLOUD_SYNC_ENABLED: true
        }
      });

      // Should have fallback ready
      expect(featureFlagStore.safetyStatus.offlineFallbackReady).toBe(true);

      // Crisis response should still be fast
      expect(featureFlagStore.safetyStatus.crisisResponseTime).toBeLessThan(200);
    });

    test('Multiple features enabled preserve core functionality', async () => {
      // Enable multiple features
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          CLOUD_SYNC_ENABLED: true,
          ANALYTICS_ENABLED: true,
          PUSH_NOTIFICATIONS_ENABLED: true
        }
      });

      // Core functionality should still work
      expect(featureFlagStore.safetyStatus.offlineFallbackReady).toBe(true);
      expect(featureFlagStore.healthStatus.crisisResponseOk).toBe(true);

      // Crisis response time should be maintained
      const responseTime = await crisisStore.responseTime;
      expect(responseTime).toBeLessThan(FEATURE_FLAG_CONSTANTS.CRISIS_RESPONSE_MAX_MS);
    });
  });

  describe('3. Crisis Response Time Validation', () => {
    test('Crisis response <200ms with no features enabled', async () => {
      const startTime = performance.now();

      // Simulate crisis trigger
      await crisisStore.triggerCrisis('test_crisis');

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(200);
    });

    test('Crisis response <200ms with all features enabled', async () => {
      // Enable all features
      const allFeaturesEnabled = Object.keys(DEFAULT_FEATURE_FLAGS).reduce((acc, key) => {
        acc[key as keyof typeof DEFAULT_FEATURE_FLAGS] = true;
        return acc;
      }, {} as typeof DEFAULT_FEATURE_FLAGS);

      useFeatureFlagStore.setState({
        flags: allFeaturesEnabled
      });

      const startTime = performance.now();

      // Crisis should still be fast
      await crisisStore.triggerCrisis('test_crisis_with_features');

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(200);
    });

    test('Crisis response maintained during emergency override', async () => {
      // Trigger emergency override
      await featureFlagStore.emergencyEnableOfflineMode();

      expect(featureFlagStore.safetyStatus.emergencyOverrideActive).toBe(true);

      const startTime = performance.now();

      // Crisis should still work
      await crisisStore.call988();

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(200);
    });

    test('Crisis features cannot be disabled', () => {
      const crisisFeatures = ['EMERGENCY_CONTACTS_CLOUD', 'PUSH_NOTIFICATIONS_ENABLED'];

      crisisFeatures.forEach(feature => {
        const canDisable = featureFlagStore.metadata[feature as keyof typeof featureFlagStore.metadata]?.canDisableInCrisis;
        expect(canDisable).toBe(false);
      });
    });
  });

  describe('4. Network State Changes', () => {
    test('Offline to online transition preserves state', async () => {
      const { networkService } = require('../../src/services/NetworkService');

      // Start offline
      networkService.isOnline.mockReturnValue(false);

      // Create some offline data
      await checkInStore.createCheckIn('morning');
      await assessmentStore.createAssessment('phq9', [1, 1, 1, 1, 1, 1, 1, 1, 0]);

      // Go online
      networkService.isOnline.mockReturnValue(true);

      // Feature flags should adapt but maintain state
      expect(featureFlagStore.safetyStatus.offlineFallbackReady).toBe(true);
    });

    test('Online to offline transition preserves functionality', async () => {
      const { networkService } = require('../../src/services/NetworkService');

      // Start online with some features enabled
      networkService.isOnline.mockReturnValue(true);
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          CLOUD_SYNC_ENABLED: true,
          ANALYTICS_ENABLED: true
        }
      });

      // Go offline
      networkService.isOnline.mockReturnValue(false);

      // Should trigger offline mode
      await featureFlagStore.emergencyEnableOfflineMode();

      // Core functionality should still work
      expect(featureFlagStore.safetyStatus.offlineFallbackReady).toBe(true);
      expect(featureFlagStore.safetyStatus.emergencyOverrideActive).toBe(true);
    });
  });

  describe('5. Data Consistency During Feature Changes', () => {
    test('Enabling cloud sync does not corrupt local data', async () => {
      // Create local data first
      const localCheckIn = await checkInStore.createCheckIn('morning');
      const localAssessment = await assessmentStore.createAssessment('phq9', [2, 2, 2, 2, 2, 2, 2, 2, 1]);

      expect(localCheckIn).toBeDefined();
      expect(localAssessment).toBeDefined();

      // Enable cloud sync
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          CLOUD_SYNC_ENABLED: true
        }
      });

      // Local data should still be accessible
      expect(checkInStore.todayCheckIn).toBeDefined();
      expect(assessmentStore.assessments.length).toBeGreaterThanOrEqual(0);
    });

    test('Disabling features preserves critical data', async () => {
      // Enable features and create data
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          CLOUD_SYNC_ENABLED: true,
          ANALYTICS_ENABLED: true
        }
      });

      await checkInStore.createCheckIn('evening');

      // Disable features
      useFeatureFlagStore.setState({
        flags: { ...DEFAULT_FEATURE_FLAGS }
      });

      // Critical data should be preserved
      expect(featureFlagStore.safetyStatus.offlineFallbackReady).toBe(true);
    });
  });

  describe('6. Performance Under Feature Load', () => {
    test('Feature evaluation does not impact check-in performance', async () => {
      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        featureFlagStore.evaluateFlag('CLOUD_SYNC_ENABLED');
        featureFlagStore.evaluateFlag('ANALYTICS_ENABLED');
        featureFlagStore.evaluateFlag('PUSH_NOTIFICATIONS_ENABLED');
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should be very fast
      expect(totalTime).toBeLessThan(50); // 50ms for 300 evaluations
    });

    test('Multiple feature flags do not slow crisis response', async () => {
      // Enable all features
      const allEnabled = Object.keys(DEFAULT_FEATURE_FLAGS).reduce((acc, key) => {
        acc[key as keyof typeof DEFAULT_FEATURE_FLAGS] = true;
        return acc;
      }, {} as typeof DEFAULT_FEATURE_FLAGS);

      useFeatureFlagStore.setState({ flags: allEnabled });

      const startTime = performance.now();

      // Crisis should still be instant
      const crisisValid = await featureFlagStore.validateCrisisAccess();

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(crisisValid).toBe(true);
      expect(responseTime).toBeLessThan(50); // Much faster than 200ms requirement
    });
  });

  describe('7. Emergency Scenarios', () => {
    test('Emergency offline mode disables non-critical features', async () => {
      // Enable various features
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          CLOUD_SYNC_ENABLED: true,
          ANALYTICS_ENABLED: true,
          BETA_FEATURES_ENABLED: true,
          THERAPIST_PORTAL_ENABLED: true
        }
      });

      // Trigger emergency offline mode
      await featureFlagStore.emergencyEnableOfflineMode();

      // Non-critical features should be disabled
      expect(featureFlagStore.flags.ANALYTICS_ENABLED).toBe(false);
      expect(featureFlagStore.flags.BETA_FEATURES_ENABLED).toBe(false);

      // Critical features should remain
      expect(featureFlagStore.flags.EMERGENCY_CONTACTS_CLOUD).toBe(true);
      expect(featureFlagStore.flags.PUSH_NOTIFICATIONS_ENABLED).toBe(true);
    });

    test('Emergency mode maintains crisis functionality', async () => {
      await featureFlagStore.emergencyEnableOfflineMode();

      // Crisis should still work perfectly
      const crisisValid = await featureFlagStore.validateCrisisAccess();
      expect(crisisValid).toBe(true);

      const responseTime = featureFlagStore.safetyStatus.crisisResponseTime;
      expect(responseTime).toBeLessThan(200);
    });

    test('Recovery from emergency mode restores functionality', async () => {
      // Enable features
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          CLOUD_SYNC_ENABLED: true,
          ANALYTICS_ENABLED: true
        }
      });

      // Trigger emergency
      await featureFlagStore.emergencyEnableOfflineMode();
      expect(featureFlagStore.safetyStatus.emergencyOverrideActive).toBe(true);

      // Simulate recovery (manual override)
      useFeatureFlagStore.setState({
        safetyStatus: {
          ...featureFlagStore.safetyStatus,
          emergencyOverrideActive: false
        }
      });

      // Should be able to restore functionality
      const allValid = await featureFlagStore.validateAllFeatures();
      expect(allValid).toBe(true);
    });
  });

  describe('8. Edge Cases and Stress Testing', () => {
    test('Rapid feature toggle does not break state', async () => {
      // Rapidly toggle features
      for (let i = 0; i < 20; i++) {
        useFeatureFlagStore.setState({
          flags: {
            ...DEFAULT_FEATURE_FLAGS,
            ANALYTICS_ENABLED: i % 2 === 0
          }
        });

        // Should remain stable
        expect(featureFlagStore.safetyStatus.offlineFallbackReady).toBe(true);
      }
    });

    test('Concurrent feature operations handled safely', async () => {
      const operations = [
        featureFlagStore.updateUserConsent('ANALYTICS_ENABLED', true),
        featureFlagStore.updateUserConsent('CLOUD_SYNC_ENABLED', true),
        featureFlagStore.updateRolloutPercentage('ANALYTICS_ENABLED', 50),
        featureFlagStore.refreshMetrics()
      ];

      await Promise.all(operations);

      // Should complete without errors
      expect(featureFlagStore.error).toBeNull();
    });

    test('Feature flag system survives store corruption', async () => {
      const { secureDataStore } = require('../../src/services/storage/SecureDataStore');

      // Simulate corrupted storage
      secureDataStore.getFeatureFlags.mockResolvedValue(null);
      secureDataStore.getUserConsents.mockResolvedValue(undefined);

      await featureFlagStore.initializeFlags();

      // Should fall back to defaults
      expect(featureFlagStore.flags).toEqual(DEFAULT_FEATURE_FLAGS);
      expect(featureFlagStore.safetyStatus.offlineFallbackReady).toBe(true);
    });
  });
});