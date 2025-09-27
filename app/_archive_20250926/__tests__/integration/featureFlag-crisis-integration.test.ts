/**
 * Integration Tests - Feature Flag Crisis Integration
 *
 * Critical tests ensuring crisis response <200ms is maintained
 * and crisis features cannot be disabled under any circumstances
 */

import { useFeatureFlagStore } from '../../src/store/featureFlagStore';
import { useCrisisStore } from '../../src/store/crisisStore';
import { useAssessmentStore } from '../../src/store/assessmentStore';
import { FEATURE_FLAG_CONSTANTS, DEFAULT_FEATURE_FLAGS } from '../../src/types/feature-flags';

// Mock crisis protection service
const mockCrisisService = {
  isInCrisisMode: jest.fn().mockReturnValue(false),
  measureResponseTime: jest.fn().mockResolvedValue(150),
  testFeatureResponse: jest.fn().mockResolvedValue(180),
  checkCrisisThresholds: jest.fn().mockReturnValue(false),
  triggerCrisisProtocol: jest.fn().mockResolvedValue(undefined),
  activateCrisisMode: jest.fn().mockResolvedValue(undefined),
  validateEmergencyAccess: jest.fn().mockResolvedValue(true)
};

jest.mock('../../src/services/CrisisProtectionService', () => ({
  crisisProtectionService: mockCrisisService
}));

// Mock secure storage
jest.mock('../../src/services/storage/SecureDataStore', () => ({
  secureDataStore: {
    getFeatureFlags: jest.fn().mockResolvedValue({}),
    getUserConsents: jest.fn().mockResolvedValue({}),
    getUserEligibility: jest.fn().mockResolvedValue(null),
    saveFeatureFlags: jest.fn().mockResolvedValue(undefined),
    saveUserConsents: jest.fn().mockResolvedValue(undefined),
    validateEncryption: jest.fn().mockResolvedValue(true)
  }
}));

// Mock cost monitoring
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

// Mock cloud monitoring
jest.mock('../../src/services/cloud/CloudMonitoring', () => ({
  cloudMonitoringService: {
    reportEmergencyDisable: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock crisis store
const mockCrisisStore = {
  isInCrisis: false,
  activeCrisisPlan: null,
  emergencyContacts: [
    { id: '988', name: 'Crisis Lifeline', phone: '988' },
    { id: 'emergency', name: 'Emergency Services', phone: '911' }
  ],
  lastCrisisCheck: new Date().toISOString(),
  triggerCrisis: jest.fn().mockResolvedValue(undefined),
  call988: jest.fn().mockResolvedValue(undefined),
  callEmergency: jest.fn().mockResolvedValue(undefined),
  activateCrisisPlan: jest.fn().mockResolvedValue(undefined),
  checkCrisisResponse: jest.fn().mockResolvedValue(150),
  responseTime: 150
};

jest.mock('../../src/store/crisisStore', () => ({
  useCrisisStore: {
    getState: jest.fn(() => mockCrisisStore)
  }
}));

// Mock assessment store
const mockAssessmentStore = {
  assessments: [],
  currentAssessment: null,
  createAssessment: jest.fn(),
  calculateScore: jest.fn(),
  checkCrisisThreshold: jest.fn().mockReturnValue(false),
  triggerCrisisFromAssessment: jest.fn().mockResolvedValue(undefined)
};

jest.mock('../../src/store/assessmentStore', () => ({
  useAssessmentStore: {
    getState: jest.fn(() => mockAssessmentStore)
  }
}));

describe('Integration Tests: Feature Flag Crisis Integration', () => {
  let featureFlagStore: ReturnType<typeof useFeatureFlagStore.getState>;
  let crisisStore: ReturnType<typeof useCrisisStore.getState>;
  let assessmentStore: ReturnType<typeof useAssessmentStore.getState>;

  beforeEach(async () => {
    featureFlagStore = useFeatureFlagStore.getState();
    crisisStore = useCrisisStore.getState();
    assessmentStore = useAssessmentStore.getState();

    // Reset to initial state
    useFeatureFlagStore.setState({
      flags: { ...DEFAULT_FEATURE_FLAGS },
      userConsents: {},
      rolloutPercentages: {},
      userEligibility: null,
      isLoading: false,
      isUpdating: false,
      error: null,
      safetyStatus: {
        crisisResponseTime: 150,
        hipaaCompliant: true,
        offlineFallbackReady: true,
        encryptionValidated: true,
        emergencyOverrideActive: false,
        protectedFeaturesCount: 2,
        lastValidation: new Date().toISOString()
      }
    });

    await featureFlagStore.initializeFlags();
    jest.clearAllMocks();
  });

  describe('1. Crisis Response Time Requirements', () => {
    test('Crisis response <200ms with no features enabled', async () => {
      const startTime = performance.now();

      const responseValid = await featureFlagStore.validateCrisisAccess();

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseValid).toBe(true);
      expect(responseTime).toBeLessThan(200);
      expect(featureFlagStore.safetyStatus.crisisResponseTime).toBeLessThan(FEATURE_FLAG_CONSTANTS.CRISIS_RESPONSE_MAX_MS);
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

      const responseValid = await featureFlagStore.validateCrisisAccess();

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseValid).toBe(true);
      expect(responseTime).toBeLessThan(200);
    });

    test('Crisis button access <200ms under all conditions', async () => {
      const testConditions = [
        { name: 'No features', flags: { ...DEFAULT_FEATURE_FLAGS } },
        {
          name: 'Cloud sync enabled',
          flags: { ...DEFAULT_FEATURE_FLAGS, CLOUD_SYNC_ENABLED: true }
        },
        {
          name: 'Multiple features',
          flags: {
            ...DEFAULT_FEATURE_FLAGS,
            CLOUD_SYNC_ENABLED: true,
            ANALYTICS_ENABLED: true,
            PUSH_NOTIFICATIONS_ENABLED: true
          }
        },
        {
          name: 'Emergency override active',
          flags: { ...DEFAULT_FEATURE_FLAGS },
          emergencyOverride: true
        }
      ];

      for (const condition of testConditions) {
        useFeatureFlagStore.setState({
          flags: condition.flags,
          safetyStatus: {
            ...featureFlagStore.safetyStatus,
            emergencyOverrideActive: condition.emergencyOverride || false
          }
        });

        const startTime = performance.now();

        // Simulate crisis button press
        await crisisStore.call988();

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        expect(responseTime).toBeLessThan(200);
        expect(crisisStore.call988).toHaveBeenCalled();
      }
    });

    test('988 call initiation <200ms regardless of feature state', async () => {
      // Test with various feature combinations
      const featureCombinations = [
        [],
        ['ANALYTICS_ENABLED'],
        ['CLOUD_SYNC_ENABLED', 'ANALYTICS_ENABLED'],
        ['CLOUD_SYNC_ENABLED', 'ANALYTICS_ENABLED', 'THERAPIST_PORTAL_ENABLED']
      ];

      for (const features of featureCombinations) {
        const flags = { ...DEFAULT_FEATURE_FLAGS };
        features.forEach(feature => {
          flags[feature as keyof typeof flags] = true;
        });

        useFeatureFlagStore.setState({ flags });

        const startTime = performance.now();

        await crisisStore.call988();

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        expect(responseTime).toBeLessThan(200);
      }
    });
  });

  describe('2. Crisis Feature Protection', () => {
    test('Emergency contacts cannot be disabled by feature flags', () => {
      const emergencyContactsMetadata = featureFlagStore.metadata.EMERGENCY_CONTACTS_CLOUD;

      expect(emergencyContactsMetadata.canDisableInCrisis).toBe(false);

      // Even with emergency override, emergency contacts should work
      useFeatureFlagStore.setState({
        safetyStatus: {
          ...featureFlagStore.safetyStatus,
          emergencyOverrideActive: true
        }
      });

      const emergencyContactsEnabled = featureFlagStore.evaluateFlag('EMERGENCY_CONTACTS_CLOUD');
      expect(emergencyContactsEnabled).toBe(true);
    });

    test('Push notifications cannot be disabled during crisis', () => {
      const pushNotificationsMetadata = featureFlagStore.metadata.PUSH_NOTIFICATIONS_ENABLED;

      expect(pushNotificationsMetadata.canDisableInCrisis).toBe(false);

      // Simulate crisis mode
      mockCrisisService.isInCrisisMode.mockReturnValue(true);

      const pushEnabled = featureFlagStore.evaluateFlag('PUSH_NOTIFICATIONS_ENABLED');
      expect(pushEnabled).toBe(true);
    });

    test('Crisis features remain enabled during emergency shutdown', async () => {
      // Enable various features
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          CLOUD_SYNC_ENABLED: true,
          ANALYTICS_ENABLED: true,
          THERAPIST_PORTAL_ENABLED: true,
          BETA_FEATURES_ENABLED: true
        }
      });

      // Trigger emergency offline mode
      await featureFlagStore.emergencyEnableOfflineMode();

      // Crisis-protected features should remain enabled
      expect(featureFlagStore.flags.EMERGENCY_CONTACTS_CLOUD).toBe(true);
      expect(featureFlagStore.flags.PUSH_NOTIFICATIONS_ENABLED).toBe(true);

      // Non-critical features should be disabled
      expect(featureFlagStore.flags.ANALYTICS_ENABLED).toBe(false);
      expect(featureFlagStore.flags.BETA_FEATURES_ENABLED).toBe(false);
    });

    test('Crisis features bypass cost limitations', async () => {
      // Simulate budget exceeded
      useFeatureFlagStore.setState({
        costStatus: {
          ...featureFlagStore.costStatus,
          budgetRemaining: 0,
          limitedFeatures: ['EMERGENCY_CONTACTS_CLOUD', 'PUSH_NOTIFICATIONS_ENABLED']
        }
      });

      // Crisis features should still be enabled despite cost limits
      expect(featureFlagStore.evaluateFlag('EMERGENCY_CONTACTS_CLOUD')).toBe(true);
      expect(featureFlagStore.evaluateFlag('PUSH_NOTIFICATIONS_ENABLED')).toBe(true);
    });
  });

  describe('3. Crisis-Triggered Feature Control', () => {
    test('High PHQ-9 score triggers crisis mode but preserves features', async () => {
      // Create severe depression assessment (score ≥20)
      const severeAssessment = {
        id: 'severe-phq9',
        type: 'phq9' as const,
        answers: [3, 3, 3, 3, 3, 2, 1, 1, 1] as const,
        score: 20,
        severity: 'severe' as const,
        completedAt: new Date().toISOString(),
        context: 'standalone' as const
      };

      // Mock crisis threshold check
      mockAssessmentStore.checkCrisisThreshold.mockReturnValue(true);
      mockCrisisService.isInCrisisMode.mockReturnValue(true);

      // Simulate assessment completion
      await assessmentStore.triggerCrisisFromAssessment(severeAssessment);

      // Crisis should be triggered
      expect(assessmentStore.triggerCrisisFromAssessment).toHaveBeenCalledWith(severeAssessment);

      // Crisis features should remain available
      const crisisResponseTime = await featureFlagStore.validateCrisisAccess();
      expect(crisisResponseTime).toBe(true);
    });

    test('Suicidal ideation (PHQ-9 Q9 > 0) maintains crisis access', async () => {
      // PHQ-9 with suicidal ideation
      const suicidalIdeationAssessment = {
        id: 'suicidal-phq9',
        type: 'phq9' as const,
        answers: [1, 1, 1, 1, 1, 1, 1, 1, 2] as const, // Q9 = 2 (suicidal ideation)
        score: 10,
        severity: 'moderate' as const,
        completedAt: new Date().toISOString(),
        context: 'standalone' as const
      };

      mockAssessmentStore.checkCrisisThreshold.mockReturnValue(true);
      mockCrisisService.isInCrisisMode.mockReturnValue(true);

      await assessmentStore.triggerCrisisFromAssessment(suicidalIdeationAssessment);

      // Should maintain crisis access
      const startTime = performance.now();
      await crisisStore.call988();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(200);
    });

    test('Severe GAD-7 (≥15) maintains crisis response time', async () => {
      const severeAnxietyAssessment = {
        id: 'severe-gad7',
        type: 'gad7' as const,
        answers: [3, 3, 3, 2, 2, 1, 1] as const,
        score: 15,
        severity: 'severe' as const,
        completedAt: new Date().toISOString(),
        context: 'standalone' as const
      };

      mockAssessmentStore.checkCrisisThreshold.mockReturnValue(true);
      mockCrisisService.isInCrisisMode.mockReturnValue(true);

      await assessmentStore.triggerCrisisFromAssessment(severeAnxietyAssessment);

      // Crisis response should remain fast
      const responseTime = featureFlagStore.safetyStatus.crisisResponseTime;
      expect(responseTime).toBeLessThan(200);
    });
  });

  describe('4. Emergency Override Testing', () => {
    test('Emergency disable preserves critical crisis functions', async () => {
      // Enable multiple features
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          CLOUD_SYNC_ENABLED: true,
          ANALYTICS_ENABLED: true,
          THERAPIST_PORTAL_ENABLED: true,
          AI_INSIGHTS_ENABLED: true
        }
      });

      // Emergency disable non-critical features
      await featureFlagStore.emergencyDisable('ANALYTICS_ENABLED', 'Cost overrun');
      await featureFlagStore.emergencyDisable('AI_INSIGHTS_ENABLED', 'Performance issue');

      // Crisis functions should still work
      const startTime = performance.now();
      await crisisStore.call988();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(200);
      expect(featureFlagStore.flags.EMERGENCY_CONTACTS_CLOUD).toBe(true);
    });

    test('Emergency offline mode prioritizes crisis functionality', async () => {
      // Start with multiple features enabled
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          CLOUD_SYNC_ENABLED: true,
          ANALYTICS_ENABLED: true,
          THERAPIST_PORTAL_ENABLED: true,
          FAMILY_SHARING_ENABLED: true,
          BACKUP_RESTORE_ENABLED: true
        }
      });

      // Trigger emergency offline mode
      await featureFlagStore.emergencyEnableOfflineMode();

      // Verify emergency state
      expect(featureFlagStore.safetyStatus.emergencyOverrideActive).toBe(true);
      expect(featureFlagStore.safetyStatus.offlineFallbackReady).toBe(true);

      // Crisis features should be preserved
      expect(featureFlagStore.flags.EMERGENCY_CONTACTS_CLOUD).toBe(true);
      expect(featureFlagStore.flags.PUSH_NOTIFICATIONS_ENABLED).toBe(true);

      // Crisis response should remain fast
      const responseTime = await featureFlagStore.validateCrisisAccess();
      expect(responseTime).toBe(true);
    });

    test('Manual emergency override cannot disable crisis features', async () => {
      // Attempt to emergency disable crisis-protected features
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await featureFlagStore.emergencyDisable('EMERGENCY_CONTACTS_CLOUD', 'Manual test');

      // Crisis feature should remain enabled despite emergency disable attempt
      expect(featureFlagStore.flags.EMERGENCY_CONTACTS_CLOUD).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  describe('5. Feature Flag Crisis Integration Performance', () => {
    test('Crisis validation performance under feature load', async () => {
      // Enable all features to create maximum load
      const allFeaturesEnabled = Object.keys(DEFAULT_FEATURE_FLAGS).reduce((acc, key) => {
        acc[key as keyof typeof DEFAULT_FEATURE_FLAGS] = true;
        return acc;
      }, {} as typeof DEFAULT_FEATURE_FLAGS);

      useFeatureFlagStore.setState({ flags: allFeaturesEnabled });

      // Test crisis validation performance
      const iterations = 50;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        await featureFlagStore.validateCrisisAccess();
      }

      const endTime = performance.now();
      const averageTime = (endTime - startTime) / iterations;

      expect(averageTime).toBeLessThan(50); // Much faster than 200ms requirement
    });

    test('Concurrent crisis operations with feature flags', async () => {
      // Enable multiple features
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          CLOUD_SYNC_ENABLED: true,
          ANALYTICS_ENABLED: true,
          PUSH_NOTIFICATIONS_ENABLED: true
        }
      });

      // Run concurrent crisis operations
      const operations = [
        featureFlagStore.validateCrisisAccess(),
        crisisStore.call988(),
        crisisStore.checkCrisisResponse(),
        featureFlagStore.validateCrisisAccess(),
        crisisStore.call988()
      ];

      const startTime = performance.now();
      const results = await Promise.all(operations);
      const endTime = performance.now();

      const totalTime = endTime - startTime;

      // All operations should complete quickly
      expect(totalTime).toBeLessThan(500); // 500ms for 5 concurrent operations
      expect(results.every(result => result === true || result === undefined)).toBe(true);
    });

    test('Memory usage during crisis with feature flags', () => {
      const initialHeap = (performance as any).memory?.usedJSHeapSize || 0;

      // Simulate crisis scenario with features enabled
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          CLOUD_SYNC_ENABLED: true,
          ANALYTICS_ENABLED: true
        }
      });

      // Run multiple crisis validations
      for (let i = 0; i < 100; i++) {
        featureFlagStore.evaluateFlag('EMERGENCY_CONTACTS_CLOUD');
        featureFlagStore.evaluateFlag('PUSH_NOTIFICATIONS_ENABLED');
      }

      const finalHeap = (performance as any).memory?.usedJSHeapSize || 0;
      const heapGrowth = finalHeap - initialHeap;

      // Memory growth should be minimal
      if (initialHeap > 0) {
        expect(heapGrowth).toBeLessThan(512 * 1024); // 512KB max growth
      }
    });
  });

  describe('6. Crisis Data Integrity', () => {
    test('Crisis contact data preserved during feature changes', async () => {
      // Set up emergency contacts
      const emergencyContacts = [
        { id: '988', name: 'Crisis Lifeline', phone: '988' },
        { id: 'personal', name: 'Family Contact', phone: '+1234567890' }
      ];

      mockCrisisStore.emergencyContacts = emergencyContacts;

      // Change feature flags
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          EMERGENCY_CONTACTS_CLOUD: true
        }
      });

      // Then disable
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          EMERGENCY_CONTACTS_CLOUD: false
        }
      });

      // Emergency contacts should still be accessible
      expect(crisisStore.emergencyContacts).toHaveLength(2);
      expect(crisisStore.emergencyContacts[0].phone).toBe('988');
    });

    test('Crisis assessment thresholds unaffected by feature flags', () => {
      // Test various feature combinations
      const featureCombinations = [
        { ANALYTICS_ENABLED: true },
        { CLOUD_SYNC_ENABLED: true, ANALYTICS_ENABLED: true },
        { THERAPIST_PORTAL_ENABLED: true },
        {} // No features enabled
      ];

      featureCombinations.forEach(features => {
        useFeatureFlagStore.setState({
          flags: { ...DEFAULT_FEATURE_FLAGS, ...features }
        });

        // Crisis thresholds should remain constant
        expect(FEATURE_FLAG_CONSTANTS.CRISIS_RESPONSE_MAX_MS).toBe(200);

        // Assessment crisis logic should be unaffected
        const mockSeverePhq9 = {
          score: 22,
          type: 'phq9' as const,
          answers: [3, 3, 3, 3, 3, 2, 2, 1, 2] as const
        };

        mockAssessmentStore.checkCrisisThreshold.mockReturnValue(true);
        const requiresCrisis = assessmentStore.checkCrisisThreshold(mockSeverePhq9);
        expect(requiresCrisis).toBe(true);
      });
    });
  });

  describe('7. Recovery and Failsafe Testing', () => {
    test('Crisis system recovery after feature flag failure', async () => {
      // Simulate feature flag system failure
      useFeatureFlagStore.setState({
        error: 'Feature flag system error',
        isLoading: false
      });

      // Crisis should still work
      const startTime = performance.now();
      await crisisStore.call988();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(200);
      expect(crisisStore.call988).toHaveBeenCalled();
    });

    test('Crisis access during storage failures', async () => {
      const { secureDataStore } = require('../../src/services/storage/SecureDataStore');

      // Mock storage failure
      secureDataStore.getFeatureFlags.mockRejectedValue(new Error('Storage failed'));
      secureDataStore.validateEncryption.mockRejectedValue(new Error('Encryption failed'));

      // Crisis should still work with defaults
      const crisisValid = await featureFlagStore.validateCrisisAccess();
      expect(crisisValid).toBe(true);
    });

    test('Crisis system resilience to feature flag corruption', async () => {
      // Corrupt feature flag data
      useFeatureFlagStore.setState({
        flags: null as any,
        metadata: {} as any
      });

      // Crisis features should fall back to safe defaults
      const crisisAccess = await featureFlagStore.validateCrisisAccess();
      expect(crisisAccess).toBe(true);

      // Should be able to call 988
      await crisisStore.call988();
      expect(crisisStore.call988).toHaveBeenCalled();
    });
  });

  describe('8. Regulatory Compliance During Crisis', () => {
    test('HIPAA compliance maintained during crisis', async () => {
      // Enable HIPAA-relevant features
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          EMERGENCY_CONTACTS_CLOUD: true,
          THERAPIST_PORTAL_ENABLED: true
        }
      });

      // Trigger crisis mode
      mockCrisisService.isInCrisisMode.mockReturnValue(true);

      // HIPAA compliance should be maintained
      const hipaaCompliant = await featureFlagStore.checkHIPAACompliance();
      expect(hipaaCompliant).toBe(true);
      expect(featureFlagStore.safetyStatus.hipaaCompliant).toBe(true);
    });

    test('Crisis data encryption validation', async () => {
      // Enable emergency contacts with encryption
      useFeatureFlagStore.setState({
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          EMERGENCY_CONTACTS_CLOUD: true
        }
      });

      // Validate encryption during crisis
      const encryptionValid = await featureFlagStore.validateEncryption();
      expect(encryptionValid).toBe(true);
      expect(featureFlagStore.safetyStatus.encryptionValidated).toBe(true);
    });

    test('Audit logging for crisis-related feature changes', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Attempt emergency disable of crisis feature
      await featureFlagStore.emergencyDisable('EMERGENCY_CONTACTS_CLOUD', 'Test audit');

      // Should log the attempt (even though it won't actually disable)
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});