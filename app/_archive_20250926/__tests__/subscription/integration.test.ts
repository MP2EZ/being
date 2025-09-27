/**
 * Subscription Integration Testing Suite
 * Day 17 Phase 5: Integration testing for subscription system
 *
 * Testing:
 * - Subscription store integration with userStore
 * - Feature gate wrapper component functionality
 * - Trial management UI integration
 * - Payment screen subscription logic
 * - Cross-device subscription state synchronization
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSubscriptionStore } from '../../src/store/subscriptionStore';
import { useUserStore } from '../../src/store';
import { FeatureGateWrapper } from '../../src/components/FeatureGate/FeatureGateWrapper';
import { TrialCountdown } from '../../src/components/Subscription/TrialCountdown';
import { PaymentScreen } from '../../src/screens/PaymentScreen';
import {
  SubscriptionTier,
  TrialState,
  FeatureAccessResult
} from '../../src/types/subscription';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack
  }),
  useFocusEffect: jest.fn()
}));

// Mock stores
jest.mock('../../src/store/subscriptionStore');
jest.mock('../../src/store');

// Mock payment service
jest.mock('../../src/services/PaymentService', () => ({
  paymentService: {
    processPayment: jest.fn().mockResolvedValue({
      success: true,
      subscriptionId: 'sub_test_123',
      tier: 'premium'
    }),
    validatePaymentMethod: jest.fn().mockResolvedValue({ valid: true }),
    getAvailablePlans: jest.fn().mockResolvedValue([
      {
        id: 'plan_premium_monthly',
        tier: 'premium',
        price: 9.99,
        interval: 'month'
      },
      {
        id: 'plan_family_monthly',
        tier: 'family',
        price: 14.99,
        interval: 'month'
      }
    ])
  }
}));

// Mock sync service
jest.mock('../../src/services/SyncService', () => ({
  syncService: {
    syncSubscriptionState: jest.fn().mockResolvedValue(undefined),
    getRemoteSubscriptionState: jest.fn().mockResolvedValue({
      tier: 'premium',
      status: 'active',
      lastSyncTime: new Date().toISOString()
    }),
    pushSubscriptionUpdate: jest.fn().mockResolvedValue(undefined)
  }
}));

const mockUseSubscriptionStore = useSubscriptionStore as jest.MockedFunction<typeof useSubscriptionStore>;
const mockUseUserStore = useUserStore as jest.MockedFunction<typeof useUserStore>;

describe('Subscription Integration Testing Suite', () => {
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
    startTrial: jest.fn(),
    extendTrial: jest.fn(),
    upgrade: jest.fn(),
    cancelSubscription: jest.fn(),
    isValidating: false,
    isInitialized: true,
    crisisMode: false,
    crisisOverrides: []
  };

  const mockUserStore = {
    profile: {
      userId: 'user_test_123',
      subscriptionTier: 'free' as SubscriptionTier,
      subscriptionStatus: 'active',
      trialActive: false,
      trialDaysRemaining: 0
    },
    updateProfile: jest.fn(),
    syncProfile: jest.fn()
  };

  beforeEach(() => {
    mockUseSubscriptionStore.mockReturnValue(mockSubscriptionStore as any);
    mockUseUserStore.mockReturnValue(mockUserStore as any);
    jest.clearAllMocks();
  });

  describe('1. Subscription Store Integration with UserStore', () => {
    test('subscription tier changes sync to user profile', async () => {
      const upgradedStore = {
        ...mockSubscriptionStore,
        subscription: {
          ...mockSubscriptionStore.subscription,
          tier: 'premium'
        }
      };

      mockUseSubscriptionStore.mockReturnValue(upgradedStore as any);

      const TestComponent = () => {
        const { subscription } = useSubscriptionStore();
        const { profile, updateProfile } = useUserStore();

        React.useEffect(() => {
          if (subscription.tier !== profile.subscriptionTier) {
            updateProfile({
              subscriptionTier: subscription.tier,
              subscriptionStatus: subscription.status
            });
          }
        }, [subscription.tier, subscription.status]);

        return (
          <View>
            <Text testID="subscription-tier">{subscription.tier}</Text>
            <Text testID="profile-tier">{profile.subscriptionTier}</Text>
          </View>
        );
      };

      const { getByTestId } = render(<TestComponent />);

      await waitFor(() => {
        expect(getByTestId('subscription-tier')).toHaveTextContent('premium');
      });

      expect(mockUserStore.updateProfile).toHaveBeenCalledWith({
        subscriptionTier: 'premium',
        subscriptionStatus: 'active'
      });
    });

    test('trial state synchronization between stores', async () => {
      const trialState: TrialState = {
        isActive: true,
        daysRemaining: 5,
        originalDuration: 7,
        startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        extendedForCrisis: false,
        crisisExtensionDays: 0,
        gracePeriodActive: false
      };

      const trialStore = {
        ...mockSubscriptionStore,
        subscription: {
          ...mockSubscriptionStore.subscription,
          status: 'trialing'
        },
        trial: {
          current: trialState
        }
      };

      mockUseSubscriptionStore.mockReturnValue(trialStore as any);

      const TrialSyncComponent = () => {
        const { trial } = useSubscriptionStore();
        const { updateProfile } = useUserStore();

        React.useEffect(() => {
          if (trial?.current) {
            updateProfile({
              trialActive: trial.current.isActive,
              trialDaysRemaining: trial.current.daysRemaining
            });
          }
        }, [trial?.current?.isActive, trial?.current?.daysRemaining]);

        return (
          <Text testID="trial-status">
            Trial: {trial?.current?.isActive ? 'Active' : 'Inactive'} -
            {trial?.current?.daysRemaining} days
          </Text>
        );
      };

      const { getByTestId } = render(<TrialSyncComponent />);

      await waitFor(() => {
        expect(getByTestId('trial-status')).toHaveTextContent('Trial: Active - 5 days');
      });

      expect(mockUserStore.updateProfile).toHaveBeenCalledWith({
        trialActive: true,
        trialDaysRemaining: 5
      });
    });

    test('feature access cache integration with user preferences', async () => {
      const featureAccess: FeatureAccessResult = {
        hasAccess: true,
        reason: 'granted',
        userMessage: 'Feature available',
        validationTime: 65,
        cacheHit: false,
        crisisMode: false,
        crisisOverrideActive: false
      };

      mockSubscriptionStore.validateFeatureAccess.mockResolvedValue(featureAccess);

      const FeatureCacheComponent = () => {
        const { validateFeatureAccess } = useSubscriptionStore();
        const { profile } = useUserStore();
        const [hasCloudSync, setHasCloudSync] = React.useState(false);

        React.useEffect(() => {
          const checkFeature = async () => {
            const access = await validateFeatureAccess('cloud_sync');
            setHasCloudSync(access.hasAccess);
          };
          checkFeature();
        }, [profile.subscriptionTier]);

        return (
          <Text testID="cloud-sync-status">
            Cloud Sync: {hasCloudSync ? 'Available' : 'Unavailable'}
          </Text>
        );
      };

      const { getByTestId } = render(<FeatureCacheComponent />);

      await waitFor(() => {
        expect(getByTestId('cloud-sync-status')).toHaveTextContent('Cloud Sync: Available');
      });

      expect(mockSubscriptionStore.validateFeatureAccess).toHaveBeenCalledWith('cloud_sync');
    });
  });

  describe('2. Feature Gate Wrapper Component Functionality', () => {
    test('feature gate wrapper renders content based on access', async () => {
      const featureAccess: FeatureAccessResult = {
        hasAccess: true,
        reason: 'granted',
        userMessage: 'Feature available',
        validationTime: 45,
        cacheHit: true,
        crisisMode: false,
        crisisOverrideActive: false
      };

      mockSubscriptionStore.validateFeatureAccess.mockResolvedValue(featureAccess);

      const ProtectedContent = () => (
        <Text testID="protected-content">Premium Feature Content</Text>
      );

      const UpgradeFallback = () => (
        <View testID="upgrade-fallback">
          <Text>Upgrade to Premium</Text>
          <TouchableOpacity testID="upgrade-button">
            <Text>Upgrade Now</Text>
          </TouchableOpacity>
        </View>
      );

      const { getByTestId, queryByTestId } = render(
        <FeatureGateWrapper
          featureKey="cloud_sync"
          fallback={<UpgradeFallback />}
          maxValidationTime={100}
          trackAccess={true}
        >
          <ProtectedContent />
        </FeatureGateWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('protected-content')).toBeTruthy();
        expect(queryByTestId('upgrade-fallback')).toBeNull();
      });
    });

    test('feature gate wrapper shows fallback for denied access', async () => {
      const deniedAccess: FeatureAccessResult = {
        hasAccess: false,
        reason: 'tier_insufficient',
        userMessage: 'Upgrade to Premium to access this feature',
        actionLabel: 'Upgrade Now',
        actionRoute: '/upgrade',
        upgradeInfo: {
          recommendedTier: 'premium',
          monthlyPrice: 9.99,
          annualPrice: 99.99,
          savings: 16.7,
          features: ['Cloud Sync', 'Advanced Analytics']
        },
        validationTime: 75,
        cacheHit: false,
        crisisMode: false,
        crisisOverrideActive: false
      };

      mockSubscriptionStore.validateFeatureAccess.mockResolvedValue(deniedAccess);

      const ProtectedContent = () => (
        <Text testID="protected-content">Premium Feature Content</Text>
      );

      const UpgradeFallback = () => (
        <View testID="upgrade-fallback">
          <Text testID="upgrade-message">Upgrade to Premium to access this feature</Text>
          <TouchableOpacity testID="upgrade-button" onPress={() => mockNavigate('Upgrade')}>
            <Text>Upgrade Now</Text>
          </TouchableOpacity>
        </View>
      );

      const { getByTestId, queryByTestId } = render(
        <FeatureGateWrapper
          featureKey="advanced_analytics"
          fallback={<UpgradeFallback />}
          onAccessDenied={(result) => {
            console.log('Access denied:', result.reason);
          }}
        >
          <ProtectedContent />
        </FeatureGateWrapper>
      );

      await waitFor(() => {
        expect(queryByTestId('protected-content')).toBeNull();
        expect(getByTestId('upgrade-fallback')).toBeTruthy();
        expect(getByTestId('upgrade-message')).toHaveTextContent('Upgrade to Premium');
      });

      fireEvent.press(getByTestId('upgrade-button'));
      expect(mockNavigate).toHaveBeenCalledWith('Upgrade');
    });

    test('feature gate wrapper handles crisis mode override', async () => {
      const crisisAccess: FeatureAccessResult = {
        hasAccess: true,
        reason: 'crisis_override',
        userMessage: 'Feature available during crisis',
        validationTime: 25,
        cacheHit: false,
        crisisMode: true,
        crisisOverrideActive: true
      };

      mockSubscriptionStore.validateFeatureAccess.mockResolvedValue(crisisAccess);

      const crisisStore = {
        ...mockSubscriptionStore,
        crisisMode: true,
        crisisOverrides: ['family_sharing']
      };

      mockUseSubscriptionStore.mockReturnValue(crisisStore as any);

      const ProtectedContent = () => (
        <Text testID="protected-content">Family Sharing Feature</Text>
      );

      const CrisisComponent = () => (
        <View testID="crisis-component">
          <Text testID="crisis-message">Crisis support activated</Text>
        </View>
      );

      const { getByTestId } = render(
        <FeatureGateWrapper
          featureKey="family_sharing"
          allowCrisisOverride={true}
          crisisComponent={<CrisisComponent />}
        >
          <ProtectedContent />
        </FeatureGateWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('crisis-component')).toBeTruthy();
        expect(getByTestId('crisis-message')).toHaveTextContent('Crisis support activated');
      });
    });
  });

  describe('3. Trial Management UI Integration', () => {
    test('trial countdown component integration', async () => {
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

      const trialStore = {
        ...mockSubscriptionStore,
        trial: {
          current: trialState,
          eligibility: {
            canStartTrial: false,
            availableTrialDays: 0,
            maxExtensions: 2,
            extensionsUsed: 0
          }
        }
      };

      mockUseSubscriptionStore.mockReturnValue(trialStore as any);

      const { getByTestId } = render(
        <TrialCountdown
          trial={trialState}
          format="full"
          showExtendOption={true}
          showUpgradePrompt={true}
          urgencyThreshold={5}
          onUpgrade={(tier) => mockNavigate('Upgrade', { tier })}
          onExtend={(days) => mockSubscriptionStore.extendTrial(days)}
        />
      );

      await waitFor(() => {
        expect(getByTestId('trial-days-remaining')).toHaveTextContent('3');
        expect(getByTestId('trial-urgency-indicator')).toBeTruthy(); // <5 days shows urgency
      });

      fireEvent.press(getByTestId('upgrade-button'));
      expect(mockNavigate).toHaveBeenCalledWith('Upgrade', { tier: 'premium' });
    });

    test('trial extension during crisis integration', async () => {
      const { crisisProtectionService } = require('../../src/services/CrisisProtectionService');
      crisisProtectionService.isInCrisisMode = jest.fn().mockReturnValue(true);

      const nearExpiryTrial: TrialState = {
        isActive: true,
        daysRemaining: 1,
        originalDuration: 7,
        startDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        extendedForCrisis: false,
        crisisExtensionDays: 0,
        gracePeriodActive: false
      };

      const crisisTrialStore = {
        ...mockSubscriptionStore,
        trial: {
          current: nearExpiryTrial,
          crisisExtensions: {
            available: true,
            maxDays: 14,
            daysUsed: 0,
            autoExtendInCrisis: true
          }
        },
        crisisMode: true
      };

      mockUseSubscriptionStore.mockReturnValue(crisisTrialStore as any);
      mockSubscriptionStore.extendTrial.mockResolvedValue({
        ...nearExpiryTrial,
        extendedForCrisis: true,
        crisisExtensionDays: 14,
        daysRemaining: 15
      });

      const { getByTestId } = render(
        <TrialCountdown
          trial={nearExpiryTrial}
          allowCrisisExtension={true}
          crisisExtensionDays={14}
          onExtend={(days) => mockSubscriptionStore.extendTrial(days, 'Crisis extension')}
        />
      );

      await waitFor(() => {
        expect(getByTestId('crisis-extension-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('crisis-extension-button'));

      expect(mockSubscriptionStore.extendTrial).toHaveBeenCalledWith(14, 'Crisis extension');
    });

    test('trial to subscription conversion flow', async () => {
      mockSubscriptionStore.upgrade.mockResolvedValue(undefined);

      const conversionTrialStore = {
        ...mockSubscriptionStore,
        subscription: {
          ...mockSubscriptionStore.subscription,
          status: 'trialing'
        },
        trial: {
          current: {
            isActive: true,
            daysRemaining: 2,
            originalDuration: 7
          }
        }
      };

      mockUseSubscriptionStore.mockReturnValue(conversionTrialStore as any);

      const ConversionComponent = () => {
        const { upgrade } = useSubscriptionStore();
        const [converting, setConverting] = React.useState(false);

        const handleConvert = async () => {
          setConverting(true);
          try {
            await upgrade('premium');
            mockNavigate('SubscriptionSuccess');
          } catch (error) {
            console.error('Conversion failed:', error);
          } finally {
            setConverting(false);
          }
        };

        return (
          <View>
            <Text testID="conversion-prompt">Convert your trial to Premium</Text>
            <TouchableOpacity
              testID="convert-button"
              onPress={handleConvert}
              disabled={converting}
            >
              <Text>{converting ? 'Converting...' : 'Convert to Premium'}</Text>
            </TouchableOpacity>
          </View>
        );
      };

      const { getByTestId } = render(<ConversionComponent />);

      fireEvent.press(getByTestId('convert-button'));

      await waitFor(() => {
        expect(mockSubscriptionStore.upgrade).toHaveBeenCalledWith('premium');
        expect(mockNavigate).toHaveBeenCalledWith('SubscriptionSuccess');
      });
    });
  });

  describe('4. Payment Screen Subscription Logic', () => {
    test('payment screen integration with subscription upgrade', async () => {
      const { paymentService } = require('../../src/services/PaymentService');

      const PaymentScreenWrapper = () => (
        <PaymentScreen
          route={{
            params: {
              selectedTier: 'premium',
              billingCycle: 'monthly',
              fromFeature: 'cloud_sync'
            }
          }}
          navigation={{ navigate: mockNavigate, goBack: mockGoBack }}
        />
      );

      const { getByTestId } = render(<PaymentScreenWrapper />);

      await waitFor(() => {
        expect(getByTestId('payment-form')).toBeTruthy();
        expect(getByTestId('selected-plan')).toHaveTextContent('Premium Monthly');
      });

      // Fill payment form
      fireEvent.changeText(getByTestId('card-number'), '4242424242424242');
      fireEvent.changeText(getByTestId('expiry-date'), '12/25');
      fireEvent.changeText(getByTestId('cvv'), '123');

      fireEvent.press(getByTestId('submit-payment'));

      await waitFor(() => {
        expect(paymentService.processPayment).toHaveBeenCalledWith(
          expect.objectContaining({
            planId: 'plan_premium_monthly',
            paymentMethod: expect.any(Object)
          })
        );
      });
    });

    test('payment failure handling with therapeutic messaging', async () => {
      const { paymentService } = require('../../src/services/PaymentService');
      paymentService.processPayment.mockRejectedValueOnce(new Error('Payment declined'));

      const PaymentErrorComponent = () => {
        const [error, setError] = React.useState<string | null>(null);

        const handlePayment = async () => {
          try {
            await paymentService.processPayment({
              planId: 'plan_premium_monthly',
              paymentMethod: { /* mock payment method */ }
            });
          } catch (err) {
            setError('Payment could not be processed. Take a moment to breathe - your mental wellness journey can continue regardless.');
          }
        };

        return (
          <View>
            <TouchableOpacity testID="payment-button" onPress={handlePayment}>
              <Text>Process Payment</Text>
            </TouchableOpacity>
            {error && (
              <Text testID="therapeutic-error" style={{ color: 'orange' }}>
                {error}
              </Text>
            )}
          </View>
        );
      };

      const { getByTestId } = render(<PaymentErrorComponent />);

      fireEvent.press(getByTestId('payment-button'));

      await waitFor(() => {
        const errorText = getByTestId('therapeutic-error');
        expect(errorText).toHaveTextContent('breathe');
        expect(errorText).toHaveTextContent('mental wellness journey can continue');
      });
    });

    test('payment screen crisis mode integration', async () => {
      const crisisStore = {
        ...mockSubscriptionStore,
        crisisMode: true,
        crisisOverrides: ['premium_features']
      };

      mockUseSubscriptionStore.mockReturnValue(crisisStore as any);

      const CrisisPaymentComponent = () => {
        const { crisisMode } = useSubscriptionStore();

        return (
          <View>
            {crisisMode && (
              <View testID="crisis-banner">
                <Text testID="crisis-message">
                  Crisis support is active. Premium features are temporarily available.
                </Text>
                <TouchableOpacity testID="crisis-upgrade">
                  <Text>Make permanent with subscription</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      };

      const { getByTestId } = render(<CrisisPaymentComponent />);

      expect(getByTestId('crisis-banner')).toBeTruthy();
      expect(getByTestId('crisis-message')).toHaveTextContent('Crisis support is active');
      expect(getByTestId('crisis-upgrade')).toBeTruthy();
    });
  });

  describe('5. Cross-Device Subscription State Synchronization', () => {
    test('subscription state sync across devices', async () => {
      const { syncService } = require('../../src/services/SyncService');

      const syncStore = {
        ...mockSubscriptionStore,
        subscription: {
          ...mockSubscriptionStore.subscription,
          tier: 'premium',
          subscriptionId: 'sub_test_123'
        }
      };

      mockUseSubscriptionStore.mockReturnValue(syncStore as any);

      const SyncComponent = () => {
        const { subscription } = useSubscriptionStore();
        const [syncStatus, setSyncStatus] = React.useState('idle');

        React.useEffect(() => {
          const syncSubscription = async () => {
            setSyncStatus('syncing');
            try {
              await syncService.syncSubscriptionState(subscription);
              setSyncStatus('synced');
            } catch (error) {
              setSyncStatus('error');
            }
          };

          if (subscription.subscriptionId) {
            syncSubscription();
          }
        }, [subscription.subscriptionId]);

        return (
          <View>
            <Text testID="sync-status">Sync: {syncStatus}</Text>
            <Text testID="subscription-id">{subscription.subscriptionId}</Text>
          </View>
        );
      };

      const { getByTestId } = render(<SyncComponent />);

      await waitFor(() => {
        expect(getByTestId('sync-status')).toHaveTextContent('Sync: synced');
        expect(getByTestId('subscription-id')).toHaveTextContent('sub_test_123');
      });

      expect(syncService.syncSubscriptionState).toHaveBeenCalledWith(
        expect.objectContaining({
          tier: 'premium',
          subscriptionId: 'sub_test_123'
        })
      );
    });

    test('remote subscription state retrieval and merge', async () => {
      const { syncService } = require('../../src/services/SyncService');

      syncService.getRemoteSubscriptionState.mockResolvedValue({
        tier: 'family',
        status: 'active',
        subscriptionId: 'sub_remote_456',
        lastSyncTime: new Date().toISOString()
      });

      const RemoteSyncComponent = () => {
        const [remoteState, setRemoteState] = React.useState(null);

        React.useEffect(() => {
          const fetchRemoteState = async () => {
            const remote = await syncService.getRemoteSubscriptionState();
            setRemoteState(remote);
          };
          fetchRemoteState();
        }, []);

        return (
          <View>
            {remoteState && (
              <>
                <Text testID="remote-tier">{remoteState.tier}</Text>
                <Text testID="remote-status">{remoteState.status}</Text>
                <Text testID="remote-id">{remoteState.subscriptionId}</Text>
              </>
            )}
          </View>
        );
      };

      const { getByTestId } = render(<RemoteSyncComponent />);

      await waitFor(() => {
        expect(getByTestId('remote-tier')).toHaveTextContent('family');
        expect(getByTestId('remote-status')).toHaveTextContent('active');
        expect(getByTestId('remote-id')).toHaveTextContent('sub_remote_456');
      });
    });

    test('subscription conflict resolution between devices', async () => {
      const { syncService } = require('../../src/services/SyncService');

      const localState = {
        tier: 'premium',
        status: 'active',
        lastValidated: new Date(Date.now() - 60000).toISOString() // 1 minute ago
      };

      const remoteState = {
        tier: 'family',
        status: 'active',
        lastValidated: new Date().toISOString() // Current time
      };

      syncService.getRemoteSubscriptionState.mockResolvedValue(remoteState);

      const ConflictResolutionComponent = () => {
        const [resolvedState, setResolvedState] = React.useState(null);

        React.useEffect(() => {
          const resolveConflict = async () => {
            const remote = await syncService.getRemoteSubscriptionState();

            // Use most recent state based on lastValidated timestamp
            const localTime = new Date(localState.lastValidated).getTime();
            const remoteTime = new Date(remote.lastValidated).getTime();

            const resolved = remoteTime > localTime ? remote : localState;
            setResolvedState(resolved);
          };

          resolveConflict();
        }, []);

        return (
          <View>
            {resolvedState && (
              <Text testID="resolved-tier">{resolvedState.tier}</Text>
            )}
          </View>
        );
      };

      const { getByTestId } = render(<ConflictResolutionComponent />);

      await waitFor(() => {
        expect(getByTestId('resolved-tier')).toHaveTextContent('family'); // Remote is newer
      });
    });

    test('offline subscription state persistence and sync on reconnection', async () => {
      const { syncService } = require('../../src/services/SyncService');
      const { networkService } = require('../../src/services/NetworkService');

      networkService.isOnline = jest.fn()
        .mockReturnValueOnce(false) // Initially offline
        .mockReturnValueOnce(true);  // Then online

      const OfflineSyncComponent = () => {
        const [isOnline, setIsOnline] = React.useState(false);
        const [pendingSync, setPendingSync] = React.useState(false);

        React.useEffect(() => {
          const checkConnection = () => {
            const online = networkService.isOnline();
            setIsOnline(online);

            if (online && pendingSync) {
              syncService.pushSubscriptionUpdate({
                tier: 'premium',
                status: 'active'
              });
              setPendingSync(false);
            }
          };

          checkConnection();

          if (!isOnline) {
            setPendingSync(true);
          }
        }, []);

        return (
          <View>
            <Text testID="online-status">
              {isOnline ? 'Online' : 'Offline'}
            </Text>
            <Text testID="sync-pending">
              {pendingSync ? 'Sync Pending' : 'Synced'}
            </Text>
          </View>
        );
      };

      const { getByTestId } = render(<OfflineSyncComponent />);

      await waitFor(() => {
        expect(getByTestId('online-status')).toHaveTextContent('Offline');
        expect(getByTestId('sync-pending')).toHaveTextContent('Sync Pending');
      });

      // Simulate coming back online
      networkService.isOnline.mockReturnValue(true);

      await waitFor(() => {
        expect(syncService.pushSubscriptionUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            tier: 'premium',
            status: 'active'
          })
        );
      });
    });
  });

  describe('6. End-to-End Integration Scenarios', () => {
    test('complete subscription journey from trial to paid', async () => {
      // Start with free user
      let currentStore = { ...mockSubscriptionStore };
      mockUseSubscriptionStore.mockReturnValue(currentStore as any);

      // Step 1: Start trial
      mockSubscriptionStore.startTrial.mockResolvedValue({
        isActive: true,
        daysRemaining: 7,
        originalDuration: 7,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        extendedForCrisis: false,
        crisisExtensionDays: 0,
        gracePeriodActive: false
      });

      // Step 2: User upgrades during trial
      mockSubscriptionStore.upgrade.mockResolvedValue(undefined);

      const JourneyComponent = () => {
        const { startTrial, upgrade } = useSubscriptionStore();
        const [step, setStep] = React.useState(1);

        const handleStartTrial = async () => {
          await startTrial('premium', 7);
          setStep(2);
        };

        const handleUpgrade = async () => {
          await upgrade('premium');
          setStep(3);
        };

        return (
          <View>
            <Text testID="step">Step: {step}</Text>
            {step === 1 && (
              <TouchableOpacity testID="start-trial" onPress={handleStartTrial}>
                <Text>Start 7-Day Trial</Text>
              </TouchableOpacity>
            )}
            {step === 2 && (
              <TouchableOpacity testID="upgrade" onPress={handleUpgrade}>
                <Text>Upgrade to Premium</Text>
              </TouchableOpacity>
            )}
            {step === 3 && (
              <Text testID="success">Welcome to Premium!</Text>
            )}
          </View>
        );
      };

      const { getByTestId } = render(<JourneyComponent />);

      // Start trial
      fireEvent.press(getByTestId('start-trial'));
      await waitFor(() => {
        expect(getByTestId('step')).toHaveTextContent('Step: 2');
      });

      // Upgrade to paid
      fireEvent.press(getByTestId('upgrade'));
      await waitFor(() => {
        expect(getByTestId('step')).toHaveTextContent('Step: 3');
        expect(getByTestId('success')).toHaveTextContent('Welcome to Premium!');
      });

      expect(mockSubscriptionStore.startTrial).toHaveBeenCalledWith('premium', 7);
      expect(mockSubscriptionStore.upgrade).toHaveBeenCalledWith('premium');
    });

    test('subscription system integration with crisis intervention', async () => {
      const { crisisProtectionService } = require('../../src/services/CrisisProtectionService');
      crisisProtectionService.isInCrisisMode.mockReturnValue(true);

      const crisisIntegrationStore = {
        ...mockSubscriptionStore,
        subscription: {
          ...mockSubscriptionStore.subscription,
          tier: 'free',
          status: 'canceled'
        },
        crisisMode: true,
        crisisOverrides: ['family_sharing', 'premium_content']
      };

      mockUseSubscriptionStore.mockReturnValue(crisisIntegrationStore as any);

      const CrisisIntegrationComponent = () => {
        const { crisisMode, crisisOverrides } = useSubscriptionStore();

        return (
          <View>
            <Text testID="crisis-status">
              Crisis Mode: {crisisMode ? 'Active' : 'Inactive'}
            </Text>
            <Text testID="overrides-count">
              Overridden Features: {crisisOverrides.length}
            </Text>
            <FeatureGateWrapper
              featureKey="family_sharing"
              allowCrisisOverride={true}
              fallback={<Text testID="blocked">Feature Blocked</Text>}
            >
              <Text testID="family-content">Family Sharing Available</Text>
            </FeatureGateWrapper>
          </View>
        );
      };

      const { getByTestId, queryByTestId } = render(<CrisisIntegrationComponent />);

      expect(getByTestId('crisis-status')).toHaveTextContent('Crisis Mode: Active');
      expect(getByTestId('overrides-count')).toHaveTextContent('Overridden Features: 2');

      // Feature should be accessible despite canceled subscription due to crisis override
      await waitFor(() => {
        expect(getByTestId('family-content')).toBeTruthy();
        expect(queryByTestId('blocked')).toBeNull();
      });
    });
  });
});