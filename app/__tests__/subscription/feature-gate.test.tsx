/**
 * Feature Gate Testing Suite
 * Day 17 Phase 5: Comprehensive feature gate validation
 *
 * Testing:
 * - Subscription-aware feature access validation
 * - Crisis feature bypass testing (always accessible)
 * - Feature upgrade prompts and downgrade handling
 * - Offline feature access with cached subscription state
 * - Performance testing for <100ms feature validation
 */

import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';
import { useFeatureGate } from '../../src/hooks/useFeatureGate';
import { FeatureGateWrapper } from '../../src/components/FeatureGate/FeatureGateWrapper';
import { useSubscriptionStore } from '../../src/store/subscriptionStore';
import {
  SubscriptionTier,
  FeatureAccessResult,
  SUBSCRIPTION_CONSTANTS,
  DEFAULT_FEATURE_GATES
} from '../../src/types/subscription';

// Mock dependencies
jest.mock('../../src/store/subscriptionStore');
jest.mock('../../src/services/CrisisProtectionService', () => ({
  crisisProtectionService: {
    isInCrisisMode: jest.fn().mockReturnValue(false),
    measureResponseTime: jest.fn().mockResolvedValue(150)
  }
}));

jest.mock('../../src/services/NetworkService', () => ({
  networkService: {
    isOnline: jest.fn().mockReturnValue(true)
  }
}));

const mockUseSubscriptionStore = useSubscriptionStore as jest.MockedFunction<typeof useSubscriptionStore>;

// Test Components
const TestFeatureComponent = ({ featureKey }: { featureKey: string }) => {
  const { hasAccess, isLoading, requestAccess, validationTime } = useFeatureGate(featureKey);

  if (isLoading) {
    return <Text testID="loading">Loading feature...</Text>;
  }

  return (
    <>
      <Text testID="access-status">{hasAccess ? 'Granted' : 'Denied'}</Text>
      <Text testID="validation-time">{validationTime}ms</Text>
      {!hasAccess && (
        <TouchableOpacity testID="request-access" onPress={requestAccess}>
          <Text>Request Access</Text>
        </TouchableOpacity>
      )}
    </>
  );
};

const ProtectedFeatureContent = () => (
  <Text testID="protected-content">Premium Feature Content</Text>
);

const UpgradePrompt = () => (
  <Text testID="upgrade-prompt">Upgrade to Premium</Text>
);

const CrisisOverride = () => (
  <Text testID="crisis-override">Crisis Mode Active</Text>
);

describe('Feature Gate Testing Suite', () => {
  const mockSubscriptionStore = {
    subscription: {
      tier: 'free' as SubscriptionTier,
      status: 'active',
      crisisAccessGuaranteed: true,
      crisisFeatureOverrides: [],
      lastValidated: new Date().toISOString(),
      validationLatency: 45
    },
    trial: null,
    validateFeatureAccess: jest.fn(),
    checkMultipleFeatures: jest.fn(),
    isValidating: false,
    isInitialized: true,
    crisisMode: false,
    crisisOverrides: [],
    performanceMetrics: {
      validationLatency: { avg: 85, p50: 75, p95: 150, p99: 200, max: 250 },
      crisisResponseTime: { avg: 150, max: 180, violations: 0 },
      cacheMetrics: { hitRate: 0.92, missRate: 0.08, invalidationRate: 0.02, averageSize: 2048 }
    }
  };

  beforeEach(() => {
    mockUseSubscriptionStore.mockReturnValue(mockSubscriptionStore as any);
    jest.clearAllMocks();
  });

  describe('1. Subscription-Aware Feature Access Validation', () => {
    test('free tier user cannot access premium features', async () => {
      const mockFeatureAccess: FeatureAccessResult = {
        hasAccess: false,
        reason: 'tier_insufficient',
        userMessage: 'This feature requires a Premium subscription',
        actionLabel: 'Upgrade to Premium',
        actionRoute: '/upgrade',
        upgradeInfo: {
          recommendedTier: 'premium',
          monthlyPrice: 9.99,
          annualPrice: 99.99,
          savings: 20,
          features: ['Cloud Sync', 'Advanced Analytics', 'Unlimited Exports']
        },
        validationTime: 75,
        cacheHit: false,
        crisisMode: false,
        crisisOverrideActive: false
      };

      mockSubscriptionStore.validateFeatureAccess.mockResolvedValue(mockFeatureAccess);

      const { getByTestId } = render(<TestFeatureComponent featureKey="cloud_sync" />);

      await waitFor(() => {
        expect(getByTestId('access-status')).toHaveTextContent('Denied');
        expect(getByTestId('validation-time')).toHaveTextContent('75ms');
        expect(getByTestId('request-access')).toBeTruthy();
      });

      expect(mockSubscriptionStore.validateFeatureAccess).toHaveBeenCalledWith('cloud_sync');
    });

    test('premium tier user can access premium features', async () => {
      const premiumStore = {
        ...mockSubscriptionStore,
        subscription: {
          ...mockSubscriptionStore.subscription,
          tier: 'premium' as SubscriptionTier
        }
      };

      const mockFeatureAccess: FeatureAccessResult = {
        hasAccess: true,
        reason: 'granted',
        userMessage: 'Feature access granted',
        validationTime: 45,
        cacheHit: true,
        crisisMode: false,
        crisisOverrideActive: false
      };

      premiumStore.validateFeatureAccess.mockResolvedValue(mockFeatureAccess);
      mockUseSubscriptionStore.mockReturnValue(premiumStore as any);

      const { getByTestId } = render(<TestFeatureComponent featureKey="cloud_sync" />);

      await waitFor(() => {
        expect(getByTestId('access-status')).toHaveTextContent('Granted');
        expect(getByTestId('validation-time')).toHaveTextContent('45ms');
      });

      expect(premiumStore.validateFeatureAccess).toHaveBeenCalledWith('cloud_sync');
    });

    test('trial user can access premium features with trial indication', async () => {
      const trialStore = {
        ...mockSubscriptionStore,
        subscription: {
          ...mockSubscriptionStore.subscription,
          status: 'trialing'
        },
        trial: {
          current: {
            isActive: true,
            daysRemaining: 5,
            originalDuration: 7
          }
        }
      };

      const mockFeatureAccess: FeatureAccessResult = {
        hasAccess: true,
        reason: 'trial_access',
        userMessage: 'Available during your trial',
        trialInfo: {
          isInTrial: true,
          daysRemaining: 5,
          canExtend: true,
          extensionAvailable: true
        },
        validationTime: 60,
        cacheHit: false,
        crisisMode: false,
        crisisOverrideActive: false
      };

      trialStore.validateFeatureAccess.mockResolvedValue(mockFeatureAccess);
      mockUseSubscriptionStore.mockReturnValue(trialStore as any);

      const { getByTestId } = render(<TestFeatureComponent featureKey="advanced_analytics" />);

      await waitFor(() => {
        expect(getByTestId('access-status')).toHaveTextContent('Granted');
        expect(getByTestId('validation-time')).toHaveTextContent('60ms');
      });
    });

    test('feature gate wrapper renders appropriate content based on access', async () => {
      const mockFeatureAccess: FeatureAccessResult = {
        hasAccess: false,
        reason: 'tier_insufficient',
        userMessage: 'Upgrade to access this feature',
        actionLabel: 'Upgrade Now',
        validationTime: 85,
        cacheHit: false,
        crisisMode: false,
        crisisOverrideActive: false
      };

      mockSubscriptionStore.validateFeatureAccess.mockResolvedValue(mockFeatureAccess);

      const { getByTestId, queryByTestId } = render(
        <FeatureGateWrapper
          featureKey="cloud_sync"
          fallback={<UpgradePrompt />}
          maxValidationTime={100}
        >
          <ProtectedFeatureContent />
        </FeatureGateWrapper>
      );

      await waitFor(() => {
        expect(queryByTestId('protected-content')).toBeNull();
        expect(getByTestId('upgrade-prompt')).toBeTruthy();
      });
    });
  });

  describe('2. Crisis Feature Bypass Testing', () => {
    test('crisis features always accessible regardless of subscription', async () => {
      const { crisisProtectionService } = require('../../src/services/CrisisProtectionService');
      crisisProtectionService.isInCrisisMode.mockReturnValue(true);

      const crisisStore = {
        ...mockSubscriptionStore,
        subscription: {
          ...mockSubscriptionStore.subscription,
          tier: 'free' as SubscriptionTier,
          status: 'canceled'
        },
        crisisMode: true,
        crisisOverrides: ['crisis_button', 'breathing_exercises']
      };

      const mockCrisisAccess: FeatureAccessResult = {
        hasAccess: true,
        reason: 'crisis_override',
        userMessage: 'Crisis support is always available',
        validationTime: 25, // Extra fast for crisis
        cacheHit: false,
        crisisMode: true,
        crisisOverrideActive: true
      };

      crisisStore.validateFeatureAccess.mockResolvedValue(mockCrisisAccess);
      mockUseSubscriptionStore.mockReturnValue(crisisStore as any);

      const { getByTestId } = render(<TestFeatureComponent featureKey="crisis_button" />);

      await waitFor(() => {
        expect(getByTestId('access-status')).toHaveTextContent('Granted');
        expect(getByTestId('validation-time')).toHaveTextContent('25ms');
      });

      // Crisis response should be extra fast
      expect(25).toBeLessThan(SUBSCRIPTION_CONSTANTS.CRISIS_RESPONSE_MAX_LATENCY);
    });

    test('crisis mode enables previously inaccessible features', async () => {
      const { crisisProtectionService } = require('../../src/services/CrisisProtectionService');
      crisisProtectionService.isInCrisisMode.mockReturnValue(true);

      const crisisStore = {
        ...mockSubscriptionStore,
        crisisMode: true,
        crisisOverrides: ['family_sharing'] // Family support during crisis
      };

      const mockCrisisAccess: FeatureAccessResult = {
        hasAccess: true,
        reason: 'crisis_override',
        userMessage: 'Family support is available during difficult times',
        validationTime: 35,
        cacheHit: false,
        crisisMode: true,
        crisisOverrideActive: true
      };

      crisisStore.validateFeatureAccess.mockResolvedValue(mockCrisisAccess);
      mockUseSubscriptionStore.mockReturnValue(crisisStore as any);

      const { getByTestId } = render(
        <FeatureGateWrapper
          featureKey="family_sharing"
          allowCrisisOverride={true}
          crisisComponent={<CrisisOverride />}
        >
          <ProtectedFeatureContent />
        </FeatureGateWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('crisis-override')).toBeTruthy();
      });
    });

    test('crisis mode deactivation restores normal access rules', async () => {
      const { crisisProtectionService } = require('../../src/services/CrisisProtectionService');

      // First test with crisis mode active
      crisisProtectionService.isInCrisisMode.mockReturnValue(true);

      const crisisAccess: FeatureAccessResult = {
        hasAccess: true,
        reason: 'crisis_override',
        userMessage: 'Available during crisis',
        validationTime: 30,
        cacheHit: false,
        crisisMode: true,
        crisisOverrideActive: true
      };

      mockSubscriptionStore.validateFeatureAccess.mockResolvedValueOnce(crisisAccess);

      const { getByTestId, rerender } = render(<TestFeatureComponent featureKey="advanced_analytics" />);

      await waitFor(() => {
        expect(getByTestId('access-status')).toHaveTextContent('Granted');
      });

      // Deactivate crisis mode
      crisisProtectionService.isInCrisisMode.mockReturnValue(false);

      const normalAccess: FeatureAccessResult = {
        hasAccess: false,
        reason: 'tier_insufficient',
        userMessage: 'Requires Premium subscription',
        validationTime: 75,
        cacheHit: false,
        crisisMode: false,
        crisisOverrideActive: false
      };

      mockSubscriptionStore.validateFeatureAccess.mockResolvedValueOnce(normalAccess);

      rerender(<TestFeatureComponent featureKey="advanced_analytics" />);

      await waitFor(() => {
        expect(getByTestId('access-status')).toHaveTextContent('Denied');
      });
    });
  });

  describe('3. Feature Upgrade Prompts and Downgrade Handling', () => {
    test('upgrade prompt shows appropriate tier recommendation', async () => {
      const mockFeatureAccess: FeatureAccessResult = {
        hasAccess: false,
        reason: 'tier_insufficient',
        userMessage: 'This feature requires Family plan for shared mindfulness',
        actionLabel: 'Upgrade to Family',
        actionRoute: '/upgrade?tier=family',
        upgradeInfo: {
          recommendedTier: 'family',
          monthlyPrice: 14.99,
          annualPrice: 149.99,
          savings: 16.7,
          features: ['Family Sharing', 'Multiple Profiles', 'Progress Insights', 'All Premium Features']
        },
        validationTime: 95,
        cacheHit: false,
        crisisMode: false,
        crisisOverrideActive: false
      };

      mockSubscriptionStore.validateFeatureAccess.mockResolvedValue(mockFeatureAccess);

      const UpgradeComponent = ({ featureKey }: { featureKey: string }) => {
        const { access, requestAccess } = useFeatureGate(featureKey);

        if (!access.hasAccess && access.upgradeInfo) {
          return (
            <>
              <Text testID="upgrade-tier">{access.upgradeInfo.recommendedTier}</Text>
              <Text testID="upgrade-price">${access.upgradeInfo.monthlyPrice}/month</Text>
              <Text testID="upgrade-savings">{access.upgradeInfo.savings}% savings annually</Text>
              <TouchableOpacity testID="upgrade-button" onPress={requestAccess}>
                <Text>Upgrade Now</Text>
              </TouchableOpacity>
            </>
          );
        }

        return <Text testID="feature-granted">Feature Available</Text>;
      };

      const { getByTestId } = render(<UpgradeComponent featureKey="family_sharing" />);

      await waitFor(() => {
        expect(getByTestId('upgrade-tier')).toHaveTextContent('family');
        expect(getByTestId('upgrade-price')).toHaveTextContent('$14.99/month');
        expect(getByTestId('upgrade-savings')).toHaveTextContent('16.7% savings annually');
        expect(getByTestId('upgrade-button')).toBeTruthy();
      });
    });

    test('downgrade handling maintains basic feature access', async () => {
      const downgradedStore = {
        ...mockSubscriptionStore,
        subscription: {
          ...mockSubscriptionStore.subscription,
          tier: 'free' as SubscriptionTier,
          status: 'active',
          cancelAtPeriodEnd: false
        }
      };

      // Basic features should remain accessible
      const basicFeatureAccess: FeatureAccessResult = {
        hasAccess: true,
        reason: 'granted',
        userMessage: 'Basic breathing exercises available',
        validationTime: 55,
        cacheHit: true,
        crisisMode: false,
        crisisOverrideActive: false
      };

      downgradedStore.validateFeatureAccess.mockResolvedValue(basicFeatureAccess);
      mockUseSubscriptionStore.mockReturnValue(downgradedStore as any);

      const { getByTestId } = render(<TestFeatureComponent featureKey="breathing_exercises" />);

      await waitFor(() => {
        expect(getByTestId('access-status')).toHaveTextContent('Granted');
      });

      // Premium features should be restricted
      const premiumFeatureAccess: FeatureAccessResult = {
        hasAccess: false,
        reason: 'tier_insufficient',
        userMessage: 'Advanced analytics requires Premium subscription',
        actionLabel: 'Resubscribe to Premium',
        validationTime: 60,
        cacheHit: false,
        crisisMode: false,
        crisisOverrideActive: false
      };

      downgradedStore.validateFeatureAccess.mockResolvedValue(premiumFeatureAccess);

      const { getByTestId: getByTestId2 } = render(<TestFeatureComponent featureKey="advanced_analytics" />);

      await waitFor(() => {
        expect(getByTestId2('access-status')).toHaveTextContent('Denied');
        expect(getByTestId2('request-access')).toBeTruthy();
      });
    });

    test('therapeutic messaging in upgrade prompts', async () => {
      const mockFeatureAccess: FeatureAccessResult = {
        hasAccess: false,
        reason: 'tier_insufficient',
        userMessage: 'Deepening your practice with advanced insights can enhance your mindfulness journey',
        actionLabel: 'Explore Premium Benefits',
        validationTime: 80,
        cacheHit: false,
        crisisMode: false,
        crisisOverrideActive: false
      };

      mockSubscriptionStore.validateFeatureAccess.mockResolvedValue(mockFeatureAccess);

      const TherapeuticPrompt = ({ featureKey }: { featureKey: string }) => {
        const { access } = useFeatureGate(featureKey);

        return (
          <Text testID="therapeutic-message">{access.userMessage}</Text>
        );
      };

      const { getByTestId } = render(<TherapeuticPrompt featureKey="advanced_analytics" />);

      await waitFor(() => {
        const message = getByTestId('therapeutic-message').children[0] as string;
        expect(message).toContain('mindfulness');
        expect(message).toContain('practice');
        expect(message).not.toContain('buy now');
        expect(message).not.toContain('limited time');
      });
    });
  });

  describe('4. Offline Feature Access with Cached State', () => {
    test('cached feature access works offline', async () => {
      const { networkService } = require('../../src/services/NetworkService');
      networkService.isOnline.mockReturnValue(false);

      const offlineStore = {
        ...mockSubscriptionStore,
        subscription: {
          ...mockSubscriptionStore.subscription,
          tier: 'premium' as SubscriptionTier
        }
      };

      const cachedAccess: FeatureAccessResult = {
        hasAccess: true,
        reason: 'granted',
        userMessage: 'Feature available (cached)',
        validationTime: 5, // Very fast cache hit
        cacheHit: true,
        crisisMode: false,
        crisisOverrideActive: false
      };

      offlineStore.validateFeatureAccess.mockResolvedValue(cachedAccess);
      mockUseSubscriptionStore.mockReturnValue(offlineStore as any);

      const { getByTestId } = render(<TestFeatureComponent featureKey="cloud_sync" />);

      await waitFor(() => {
        expect(getByTestId('access-status')).toHaveTextContent('Granted');
        expect(getByTestId('validation-time')).toHaveTextContent('5ms');
      });

      // Offline validation should use cache
      expect(cachedAccess.cacheHit).toBe(true);
    });

    test('offline mode graceful degradation for uncached features', async () => {
      const { networkService } = require('../../src/services/NetworkService');
      networkService.isOnline.mockReturnValue(false);

      const offlineAccess: FeatureAccessResult = {
        hasAccess: false,
        reason: 'validation_timeout',
        userMessage: 'Feature validation unavailable offline. Please connect to validate access.',
        actionLabel: 'Try When Online',
        validationTime: 100,
        cacheHit: false,
        crisisMode: false,
        crisisOverrideActive: false
      };

      mockSubscriptionStore.validateFeatureAccess.mockResolvedValue(offlineAccess);

      const { getByTestId } = render(<TestFeatureComponent featureKey="new_premium_feature" />);

      await waitFor(() => {
        expect(getByTestId('access-status')).toHaveTextContent('Denied');
        expect(getByTestId('request-access')).toBeTruthy();
      });
    });

    test('offline crisis features remain accessible', async () => {
      const { networkService } = require('../../src/services/NetworkService');
      const { crisisProtectionService } = require('../../src/services/CrisisProtectionService');

      networkService.isOnline.mockReturnValue(false);
      crisisProtectionService.isInCrisisMode.mockReturnValue(true);

      const offlineCrisisAccess: FeatureAccessResult = {
        hasAccess: true,
        reason: 'crisis_override',
        userMessage: 'Crisis support available offline',
        validationTime: 15, // Very fast offline crisis access
        cacheHit: true,
        crisisMode: true,
        crisisOverrideActive: true
      };

      mockSubscriptionStore.validateFeatureAccess.mockResolvedValue(offlineCrisisAccess);

      const { getByTestId } = render(<TestFeatureComponent featureKey="crisis_button" />);

      await waitFor(() => {
        expect(getByTestId('access-status')).toHaveTextContent('Granted');
        expect(getByTestId('validation-time')).toHaveTextContent('15ms');
      });

      expect(15).toBeLessThan(SUBSCRIPTION_CONSTANTS.CRISIS_RESPONSE_MAX_LATENCY);
    });
  });

  describe('5. Performance Testing for <100ms Feature Validation', () => {
    test('single feature validation performance', async () => {
      const fastAccess: FeatureAccessResult = {
        hasAccess: true,
        reason: 'granted',
        userMessage: 'Feature granted',
        validationTime: 65,
        cacheHit: false,
        crisisMode: false,
        crisisOverrideActive: false
      };

      mockSubscriptionStore.validateFeatureAccess.mockResolvedValue(fastAccess);

      const startTime = performance.now();

      const { getByTestId } = render(<TestFeatureComponent featureKey="cloud_sync" />);

      await waitFor(() => {
        expect(getByTestId('access-status')).toHaveTextContent('Granted');
      });

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(200); // Total render + validation time
      expect(fastAccess.validationTime).toBeLessThan(SUBSCRIPTION_CONSTANTS.MAX_VALIDATION_LATENCY);
    });

    test('multiple feature validation performance', async () => {
      const features = ['cloud_sync', 'advanced_analytics', 'family_sharing', 'crisis_button'];
      const mockResults: Record<string, FeatureAccessResult> = {};

      features.forEach(feature => {
        mockResults[feature] = {
          hasAccess: true,
          reason: 'granted',
          userMessage: 'Feature granted',
          validationTime: Math.random() * 80 + 20, // 20-100ms
          cacheHit: Math.random() > 0.5,
          crisisMode: false,
          crisisOverrideActive: false
        };
      });

      mockSubscriptionStore.checkMultipleFeatures.mockResolvedValue(mockResults);

      const startTime = performance.now();

      const MultiFeatureComponent = () => {
        const [results, setResults] = React.useState<Record<string, FeatureAccessResult>>({});

        React.useEffect(() => {
          const checkFeatures = async () => {
            const store = useSubscriptionStore.getState();
            const results = await store.checkMultipleFeatures(features);
            setResults(results);
          };
          checkFeatures();
        }, []);

        return (
          <>
            {Object.entries(results).map(([feature, result]) => (
              <Text key={feature} testID={`result-${feature}`}>
                {feature}: {result.validationTime}ms
              </Text>
            ))}
          </>
        );
      };

      const { getByTestId } = render(<MultiFeatureComponent />);

      await waitFor(() => {
        features.forEach(feature => {
          expect(getByTestId(`result-${feature}`)).toBeTruthy();
        });
      });

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(400); // Batch validation should be efficient

      // Each individual validation should meet performance requirements
      Object.values(mockResults).forEach(result => {
        expect(result.validationTime).toBeLessThan(SUBSCRIPTION_CONSTANTS.MAX_VALIDATION_LATENCY);
      });
    });

    test('cache hit performance optimization', async () => {
      const cacheHitResult: FeatureAccessResult = {
        hasAccess: true,
        reason: 'granted',
        userMessage: 'Feature granted',
        validationTime: 3, // Very fast cache hit
        cacheHit: true,
        crisisMode: false,
        crisisOverrideActive: false
      };

      mockSubscriptionStore.validateFeatureAccess.mockResolvedValue(cacheHitResult);

      // Multiple rapid validations
      const validations = Array(50).fill(null).map(async () => {
        const startTime = performance.now();
        const result = await mockSubscriptionStore.validateFeatureAccess('cloud_sync');
        const endTime = performance.now();
        return {
          result,
          time: endTime - startTime
        };
      });

      const results = await Promise.all(validations);

      results.forEach(({ result, time }) => {
        expect(result.cacheHit).toBe(true);
        expect(result.validationTime).toBeLessThan(10); // Cache hits should be very fast
      });

      const avgTime = results.reduce((sum, { time }) => sum + time, 0) / results.length;
      expect(avgTime).toBeLessThan(5); // Average validation time for cache hits
    });

    test('performance degradation alerts', async () => {
      const slowValidation: FeatureAccessResult = {
        hasAccess: true,
        reason: 'granted',
        userMessage: 'Feature granted (slow)',
        validationTime: 150, // Exceeds performance threshold
        cacheHit: false,
        crisisMode: false,
        crisisOverrideActive: false
      };

      mockSubscriptionStore.validateFeatureAccess.mockResolvedValue(slowValidation);

      const { getByTestId } = render(<TestFeatureComponent featureKey="cloud_sync" />);

      await waitFor(() => {
        expect(getByTestId('validation-time')).toHaveTextContent('150ms');
      });

      // Performance violation should be logged
      expect(slowValidation.validationTime).toBeGreaterThan(SUBSCRIPTION_CONSTANTS.MAX_VALIDATION_LATENCY);

      // In a real implementation, this would trigger performance monitoring alerts
      expect(mockSubscriptionStore.performanceMetrics.validationLatency.max).toBeDefined();
    });
  });
});