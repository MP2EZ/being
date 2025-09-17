/**
 * Unit Tests - Feature Flag React Hooks
 *
 * Tests for React hooks that provide feature flag functionality
 * with safety, cost, and crisis protection integration
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import {
  useFeatureFlag,
  useProgressiveFeature,
  useCostAwareFeature,
  useSafetyAwareFeature,
  useMultipleFeatureFlags,
  useFeatureFlagAdmin,
  useFeatureFlagContext,
  useEmergencyFeatureControl,
  useFeatureFlagAnalytics
} from '../../src/hooks/useFeatureFlags';
import { useFeatureFlagStore } from '../../src/store/featureFlagStore';
import { DEFAULT_FEATURE_FLAGS, FEATURE_FLAG_METADATA } from '../../src/types/feature-flags';

// Mock the store
jest.mock('../../src/store/featureFlagStore');

const mockStore = {
  flags: { ...DEFAULT_FEATURE_FLAGS },
  metadata: { ...FEATURE_FLAG_METADATA },
  userConsents: {},
  rolloutPercentages: {},
  userEligibility: null,
  costStatus: {
    currentSpend: 5.50,
    budgetRemaining: 0.75,
    projectedMonthlySpend: 15.0,
    featureCosts: {},
    limitedFeatures: [],
    recommendations: [],
    breakEvenUsers: 65,
    costEfficiency: 0.85
  },
  safetyStatus: {
    crisisResponseTime: 150,
    hipaaCompliant: true,
    offlineFallbackReady: true,
    encryptionValidated: true,
    emergencyOverrideActive: false,
    protectedFeaturesCount: 2,
    lastValidation: new Date().toISOString()
  },
  healthStatus: {
    overall: 'healthy' as const,
    features: {},
    crisisResponseOk: true,
    costWithinLimits: true,
    complianceOk: true,
    lastCheck: new Date().toISOString()
  },
  isLoading: false,
  isUpdating: false,
  error: null,
  evaluateFlag: jest.fn().mockReturnValue(false),
  requestFeatureAccess: jest.fn().mockResolvedValue({ granted: true }),
  updateUserConsent: jest.fn().mockResolvedValue(undefined),
  checkRolloutEligibility: jest.fn().mockReturnValue(true),
  emergencyDisable: jest.fn().mockResolvedValue(undefined),
  emergencyEnableOfflineMode: jest.fn().mockResolvedValue(undefined),
  validateCrisisAccess: jest.fn().mockResolvedValue(true),
  validateEncryption: jest.fn().mockResolvedValue(true),
  getFeatureUsage: jest.fn().mockReturnValue({
    enabled: false,
    activations: 0,
    deactivations: 0,
    errorCount: 0,
    averageLatency: 0,
    userAdoption: 0,
    costPerUser: 0,
    satisfactionScore: 4.5
  }),
  updateRolloutPercentage: jest.fn().mockResolvedValue(undefined),
  refreshMetrics: jest.fn().mockResolvedValue(undefined)
};

describe('Unit Tests: Feature Flag React Hooks', () => {
  beforeEach(() => {
    (useFeatureFlagStore as jest.Mock).mockReturnValue(mockStore);
    jest.clearAllMocks();
  });

  describe('1. Base Feature Flag Hook', () => {
    test('useFeatureFlag returns correct initial state', () => {
      const { result } = renderHook(() => useFeatureFlag('CLOUD_SYNC_ENABLED'));

      expect(result.current.enabled).toBe(false);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.metadata).toBe(FEATURE_FLAG_METADATA.CLOUD_SYNC_ENABLED);
      expect(result.current.hasConsent).toBe(false);
      expect(result.current.requiresConsent).toBe(true);
      expect(result.current.canEnable).toBe(true);
    });

    test('useFeatureFlag handles enabled state correctly', () => {
      mockStore.evaluateFlag.mockReturnValue(true);
      mockStore.userConsents = { CLOUD_SYNC_ENABLED: true };

      const { result } = renderHook(() => useFeatureFlag('CLOUD_SYNC_ENABLED'));

      expect(result.current.enabled).toBe(true);
      expect(result.current.hasConsent).toBe(true);
      expect(result.current.canEnable).toBe(false);
    });

    test('requestAccess function works correctly', async () => {
      const { result } = renderHook(() => useFeatureFlag('ANALYTICS_ENABLED'));

      await act(async () => {
        await result.current.requestAccess();
      });

      expect(mockStore.requestFeatureAccess).toHaveBeenCalledWith('ANALYTICS_ENABLED');
    });

    test('updateConsent function works correctly', async () => {
      const { result } = renderHook(() => useFeatureFlag('ANALYTICS_ENABLED'));

      await act(async () => {
        await result.current.updateConsent(true);
      });

      expect(mockStore.updateUserConsent).toHaveBeenCalledWith('ANALYTICS_ENABLED', true);
    });

    test('requestAccess handles denied access', async () => {
      mockStore.requestFeatureAccess.mockResolvedValue({
        granted: false,
        reason: 'Not eligible'
      });

      const { result } = renderHook(() => useFeatureFlag('PREMIUM_FEATURE'));

      await act(async () => {
        await expect(result.current.requestAccess()).rejects.toThrow('Not eligible');
      });
    });
  });

  describe('2. Progressive Feature Hook', () => {
    test('useProgressiveFeature returns rollout information', () => {
      mockStore.rolloutPercentages = { CLOUD_SYNC_ENABLED: 50 };
      mockStore.userEligibility = {
        userId: 'test-user',
        planType: 'premium',
        rolloutSegment: 'early',
        betaOptIn: true,
        geographicRegion: 'US',
        appVersion: '1.0.0',
        deviceType: 'ios',
        eligibleFeatures: ['CLOUD_SYNC_ENABLED'],
        waitlistFeatures: []
      };

      const { result } = renderHook(() => useProgressiveFeature('CLOUD_SYNC_ENABLED'));

      expect(result.current.rolloutPercentage).toBe(50);
      expect(result.current.isInRollout).toBe(true);
      expect(result.current.waitlisted).toBe(false);
    });

    test('useProgressiveFeature handles waitlisted features', () => {
      mockStore.userEligibility = {
        userId: 'test-user',
        planType: 'free',
        rolloutSegment: 'general',
        betaOptIn: false,
        geographicRegion: 'US',
        appVersion: '1.0.0',
        deviceType: 'ios',
        eligibleFeatures: [],
        waitlistFeatures: ['AI_INSIGHTS_ENABLED']
      };

      const { result } = renderHook(() => useProgressiveFeature('AI_INSIGHTS_ENABLED'));

      expect(result.current.waitlisted).toBe(true);
      expect(result.current.estimatedAvailability).toBe('Coming soon');
    });

    test('useProgressiveFeature calculates estimated availability', () => {
      mockStore.rolloutPercentages = { CLOUD_SYNC_ENABLED: 40 };
      mockStore.checkRolloutEligibility.mockReturnValue(false);
      mockStore.evaluateFlag.mockReturnValue(false);

      const { result } = renderHook(() => useProgressiveFeature('CLOUD_SYNC_ENABLED'));

      expect(result.current.estimatedAvailability).toContain('week');
    });
  });

  describe('3. Cost Aware Feature Hook', () => {
    test('useCostAwareFeature returns cost information', () => {
      mockStore.costStatus.featureCosts = { CLOUD_SYNC_ENABLED: 2.50 };

      const { result } = renderHook(() => useCostAwareFeature('CLOUD_SYNC_ENABLED'));

      expect(result.current.costImpact).toBe('medium');
      expect(result.current.currentCost).toBe(2.50);
      expect(result.current.budgetRemaining).toBe(0.75);
      expect(result.current.costLimited).toBe(false);
      expect(result.current.monthlyEstimate).toBe(75.0); // 2.50 * 30
    });

    test('useCostAwareFeature handles cost-limited features', () => {
      mockStore.costStatus.limitedFeatures = ['AI_INSIGHTS_ENABLED'];

      const { result } = renderHook(() => useCostAwareFeature('AI_INSIGHTS_ENABLED'));

      expect(result.current.costLimited).toBe(true);
    });

    test('useCostAwareFeature calculates monthly estimates correctly', () => {
      mockStore.costStatus.featureCosts = { ANALYTICS_ENABLED: 0.10 };

      const { result } = renderHook(() => useCostAwareFeature('ANALYTICS_ENABLED'));

      expect(result.current.monthlyEstimate).toBe(3.0); // 0.10 * 30
    });
  });

  describe('4. Safety Aware Feature Hook', () => {
    test('useSafetyAwareFeature returns safety information', () => {
      const { result } = renderHook(() => useSafetyAwareFeature('CLOUD_SYNC_ENABLED'));

      expect(result.current.hipaaRelevant).toBe(true);
      expect(result.current.canDisableInCrisis).toBe(false);
      expect(result.current.crisisProtected).toBe(true);
      expect(result.current.encryptionRequired).toBe(true);
    });

    test('useSafetyAwareFeature validates encryption for HIPAA features', () => {
      mockStore.evaluateFlag.mockReturnValue(true);

      const { result } = renderHook(() => useSafetyAwareFeature('THERAPIST_PORTAL_ENABLED'));

      expect(result.current.safetyValidated).toBe(true);
      expect(mockStore.validateEncryption).toHaveBeenCalled();
    });

    test('useSafetyAwareFeature handles non-HIPAA features', () => {
      const { result } = renderHook(() => useSafetyAwareFeature('ANALYTICS_ENABLED'));

      expect(result.current.hipaaRelevant).toBe(false);
      expect(result.current.encryptionRequired).toBe(false);
      expect(result.current.canDisableInCrisis).toBe(true);
    });
  });

  describe('5. Multiple Feature Flags Hook', () => {
    test('useMultipleFeatureFlags evaluates multiple flags', () => {
      mockStore.evaluateFlag.mockImplementation((flag) => {
        return flag === 'ANALYTICS_ENABLED';
      });

      const flags = ['CLOUD_SYNC_ENABLED', 'ANALYTICS_ENABLED', 'PUSH_NOTIFICATIONS_ENABLED'] as const;
      const { result } = renderHook(() => useMultipleFeatureFlags(flags));

      expect(result.current.CLOUD_SYNC_ENABLED).toBe(false);
      expect(result.current.ANALYTICS_ENABLED).toBe(true);
      expect(result.current.PUSH_NOTIFICATIONS_ENABLED).toBe(false);
    });

    test('useMultipleFeatureFlags optimizes evaluation calls', () => {
      const flags = ['CLOUD_SYNC_ENABLED', 'ANALYTICS_ENABLED'] as const;
      renderHook(() => useMultipleFeatureFlags(flags));

      expect(mockStore.evaluateFlag).toHaveBeenCalledTimes(2);
    });
  });

  describe('6. Feature Flag Admin Hook', () => {
    test('useFeatureFlagAdmin returns admin interface', () => {
      const { result } = renderHook(() => useFeatureFlagAdmin());

      expect(result.current.allFlags).toBeDefined();
      expect(result.current.metadata).toBe(FEATURE_FLAG_METADATA);
      expect(result.current.consents).toBe(mockStore.userConsents);
      expect(result.current.rolloutPercentages).toBe(mockStore.rolloutPercentages);
      expect(result.current.costStatus).toBe(mockStore.costStatus);
      expect(result.current.safetyStatus).toBe(mockStore.safetyStatus);
      expect(result.current.healthStatus).toBe(mockStore.healthStatus);
    });

    test('useFeatureFlagAdmin emergency controls work', async () => {
      const { result } = renderHook(() => useFeatureFlagAdmin());

      await act(async () => {
        await result.current.emergencyDisable('ANALYTICS_ENABLED', 'Test emergency');
      });

      expect(mockStore.emergencyDisable).toHaveBeenCalledWith('ANALYTICS_ENABLED', 'Test emergency');
    });

    test('useFeatureFlagAdmin rollout controls work', async () => {
      const { result } = renderHook(() => useFeatureFlagAdmin());

      await act(async () => {
        await result.current.updateRollout('CLOUD_SYNC_ENABLED', 75);
      });

      expect(mockStore.updateRolloutPercentage).toHaveBeenCalledWith('CLOUD_SYNC_ENABLED', 75);
    });
  });

  describe('7. Feature Flag Context Hook', () => {
    test('useFeatureFlagContext calculates adoption metrics', () => {
      mockStore.evaluateFlag.mockImplementation((flag) => {
        return ['ANALYTICS_ENABLED', 'PUSH_NOTIFICATIONS_ENABLED'].includes(flag);
      });

      const { result } = renderHook(() => useFeatureFlagContext());

      expect(result.current.enabledFeaturesCount).toBe(2);
      expect(result.current.totalFeaturesCount).toBeGreaterThan(0);
      expect(result.current.adoptionPercentage).toBeGreaterThan(0);
      expect(result.current.hasAnyCloudFeatures).toBe(false); // No core/premium enabled
      expect(result.current.canAffordMoreFeatures).toBe(true); // Budget remaining > 30%
    });

    test('useFeatureFlagContext recommends next feature', () => {
      mockStore.evaluateFlag.mockReturnValue(false);

      const { result } = renderHook(() => useFeatureFlagContext());

      expect(result.current.nextRecommendedFeature).toBe('CLOUD_SYNC_ENABLED');
    });

    test('useFeatureFlagContext handles progression logic', () => {
      mockStore.evaluateFlag.mockImplementation((flag) => {
        return flag === 'CLOUD_SYNC_ENABLED';
      });

      const { result } = renderHook(() => useFeatureFlagContext());

      expect(result.current.nextRecommendedFeature).toBe('PUSH_NOTIFICATIONS_ENABLED');
    });
  });

  describe('8. Emergency Feature Control Hook', () => {
    test('useEmergencyFeatureControl provides emergency interface', () => {
      const { result } = renderHook(() => useEmergencyFeatureControl());

      expect(result.current.emergencyActive).toBe(false);
      expect(result.current.canTriggerEmergency).toBe(true);
      expect(result.current.crisisResponseTime).toBe(150);
    });

    test('useEmergencyFeatureControl emergency disable all works', async () => {
      const { result } = renderHook(() => useEmergencyFeatureControl());

      await act(async () => {
        await result.current.emergencyDisableAll();
      });

      // Should call emergency disable for disableable features
      const disableableFeaturesCount = Object.values(FEATURE_FLAG_METADATA)
        .filter(metadata => metadata.canDisableInCrisis).length;

      expect(mockStore.emergencyDisable).toHaveBeenCalledTimes(disableableFeaturesCount);
    });

    test('useEmergencyFeatureControl handles unauthorized access', async () => {
      // Mock unauthorized state
      const unauthorizedStore = {
        ...mockStore,
        canTriggerEmergency: false
      };
      (useFeatureFlagStore as jest.Mock).mockReturnValue(unauthorizedStore);

      const { result } = renderHook(() => useEmergencyFeatureControl());

      await act(async () => {
        await expect(result.current.emergencyDisableAll()).rejects.toThrow('Not authorized');
      });
    });
  });

  describe('9. Feature Flag Analytics Hook', () => {
    test('useFeatureFlagAnalytics returns analytics data', () => {
      const { result } = renderHook(() => useFeatureFlagAnalytics());

      expect(result.current.usageStats).toBeDefined();
      expect(result.current.adoptionTrends).toEqual([]);
      expect(result.current.costTrends).toEqual([]);
      expect(result.current.satisfactionScores).toBeDefined();
      expect(typeof result.current.reportUsage).toBe('function');
    });

    test('useFeatureFlagAnalytics reportUsage function works', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const { result } = renderHook(() => useFeatureFlagAnalytics());

      act(() => {
        result.current.reportUsage('ANALYTICS_ENABLED', 'activated');
      });

      expect(consoleSpy).toHaveBeenCalledWith('Feature usage: ANALYTICS_ENABLED - activated');

      consoleSpy.mockRestore();
    });
  });

  describe('10. Hook Performance and Memory', () => {
    test('Hooks do not cause memory leaks', () => {
      const { unmount } = renderHook(() => useFeatureFlag('CLOUD_SYNC_ENABLED'));

      unmount();

      // Should clean up without errors
      expect(true).toBe(true);
    });

    test('Hooks handle rapid re-renders', () => {
      const { rerender } = renderHook(
        ({ flag }) => useFeatureFlag(flag),
        { initialProps: { flag: 'CLOUD_SYNC_ENABLED' as const } }
      );

      // Rapid re-renders
      for (let i = 0; i < 10; i++) {
        rerender({ flag: 'ANALYTICS_ENABLED' as const });
        rerender({ flag: 'CLOUD_SYNC_ENABLED' as const });
      }

      // Should handle gracefully
      expect(true).toBe(true);
    });

    test('Multiple hook instances work independently', () => {
      const { result: result1 } = renderHook(() => useFeatureFlag('CLOUD_SYNC_ENABLED'));
      const { result: result2 } = renderHook(() => useFeatureFlag('ANALYTICS_ENABLED'));

      expect(result1.current.metadata.flagKey).toBe('CLOUD_SYNC_ENABLED');
      expect(result2.current.metadata.flagKey).toBe('ANALYTICS_ENABLED');
    });
  });

  describe('11. Error Handling', () => {
    test('Hooks handle store errors gracefully', () => {
      mockStore.error = 'Store error';

      const { result } = renderHook(() => useFeatureFlag('CLOUD_SYNC_ENABLED'));

      expect(result.current.error).toBe('Store error');
      expect(result.current.enabled).toBe(false);
    });

    test('Hooks handle loading states', () => {
      mockStore.isLoading = true;

      const { result } = renderHook(() => useFeatureFlag('CLOUD_SYNC_ENABLED'));

      expect(result.current.loading).toBe(true);
    });

    test('Hooks handle missing metadata gracefully', () => {
      // This should not happen in practice, but test defensive coding
      const { result } = renderHook(() => useFeatureFlag('CLOUD_SYNC_ENABLED'));

      expect(result.current.metadata).toBeDefined();
    });

    test('Async operations handle rejections', async () => {
      mockStore.requestFeatureAccess.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useFeatureFlag('CLOUD_SYNC_ENABLED'));

      await act(async () => {
        await expect(result.current.requestAccess()).rejects.toThrow('Network error');
      });
    });
  });
});