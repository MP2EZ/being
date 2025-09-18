/**
 * User Experience Testing for Payment Sync Error Recovery Journeys
 *
 * This test suite validates complete user journeys through payment sync error scenarios,
 * ensuring therapeutic continuity and mental health safety throughout recovery processes.
 *
 * Test Categories:
 * 1. Payment Sync Error Recovery User Journeys
 * 2. Subscription Tier Differentiation UI Validation
 * 3. Crisis Access Preservation During Payment Outages
 * 4. Therapeutic Session Protection UI Testing
 *
 * Critical Validations:
 * - Complete error recovery workflows maintain therapeutic access
 * - Subscription tier changes preserve crisis functionality
 * - User guidance maintains MBCT therapeutic principles
 * - Error messaging reduces anxiety and promotes wellbeing
 */

import React from 'react';
import { render, fireEvent, waitFor, act, screen } from '@testing-library/react-native';
import { Alert, AccessibilityInfo, Platform } from 'react-native';

// Components for user journey testing
import { PaymentSyncStatus, PaymentErrorHandling, PaymentPerformanceFeedback } from '../../src/components/payment/PaymentSyncResilienceUI';
import { CrisisSafetyIndicator, ProtectedCrisisButton, TherapeuticSessionProtection } from '../../src/components/payment/CrisisSafetyPaymentUI';
import { SubscriptionTierDisplay } from '../../src/components/payment/SubscriptionTierDisplay';
import { PaymentStatusDashboard } from '../../src/components/payment/PaymentStatusDashboard';

// Test utilities
import { UserJourneyTestUtils } from '../utils/UserJourneyTestUtils';
import { TherapeuticTestUtils } from '../utils/TherapeuticTestUtils';
import { PaymentTestProvider } from '../mocks/PaymentTestProvider';

// Mock store with dynamic state management
const createMockStore = (initialState = {}) => ({
  ...initialState,
  syncStatus: {
    status: 'success',
    networkStatus: 'online',
    lastSync: Date.now(),
    queueSize: 0,
    ...initialState.syncStatus
  },
  crisisAccess: {
    isActive: false,
    ...initialState.crisisAccess
  },
  subscriptionTier: {
    name: 'Premium',
    features: ['unlimited_sessions', 'advanced_analytics', 'crisis_support'],
    ...initialState.subscriptionTier
  },
  resilienceMetrics: {
    retryCount: 0,
    maxRetries: 3,
    circuitBreakerOpen: false,
    ...initialState.resilienceMetrics
  },
  therapeuticSession: {
    active: false,
    type: null,
    duration: 0,
    ...initialState.therapeuticSession
  }
});

jest.mock('../../src/store/paymentStore', () => {
  let mockState = createMockStore();

  return {
    usePaymentStore: () => mockState,
    paymentSelectors: {
      getSyncStatus: (store: any) => store.syncStatus,
      getCrisisAccess: (store: any) => store.crisisAccess,
      getSubscriptionTier: (store: any) => store.subscriptionTier,
      getResilienceMetrics: (store: any) => store.resilienceMetrics,
      getTherapeuticSession: (store: any) => store.therapeuticSession,
      getPaymentError: () => null,
      getEmergencyProtocols: () => ({ active: true, hotlineAccess: true }),
      getSessionProtection: () => ({ active: false }),
      getPerformanceMetrics: () => ({
        averageResponseTime: 150,
        successRate: 97,
        compressionRatio: 0.3
      })
    },
    __updateMockState: (newState: any) => {
      mockState = createMockStore(newState);
    }
  };
});

// Helper to update mock state during tests
const updateMockState = (newState: any) => {
  const mockModule = jest.requireMock('../../src/store/paymentStore');
  mockModule.__updateMockState(newState);
};

jest.mock('../../src/hooks/useTheme', () => ({
  useTheme: () => ({
    colorSystem: {
      status: {
        success: '#16A34A',
        error: '#DC2626',
        warning: '#D97706',
        info: '#2563EB',
        successBackground: '#F0FDF4',
        errorBackground: '#FEF2F2',
        warningBackground: '#FFFBEB',
        infoBackground: '#EFF6FF'
      },
      gray: {
        50: '#F9FAFB',
        300: '#D1D5DB',
        600: '#757575',
        700: '#424242'
      }
    },
    isDarkMode: false
  })
}));

jest.mock('../../src/hooks/useHaptics', () => ({
  useCommonHaptics: () => ({
    onSuccess: jest.fn(),
    onError: jest.fn(),
    onWarning: jest.fn(),
    onCritical: jest.fn()
  })
}));

const mockAccessibilityInfo = {
  announceForAccessibility: jest.fn(),
  isScreenReaderEnabled: jest.fn().mockResolvedValue(true)
};

AccessibilityInfo.announceForAccessibility = mockAccessibilityInfo.announceForAccessibility;
AccessibilityInfo.isScreenReaderEnabled = mockAccessibilityInfo.isScreenReaderEnabled;

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PaymentTestProvider>
    {children}
  </PaymentTestProvider>
);

describe('Payment Sync Error Recovery User Journeys', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    updateMockState({}); // Reset to default state
    UserJourneyTestUtils.reset();
  });

  describe('Complete Error Recovery Workflows', () => {
    test('network connection failure to full recovery maintains therapeutic continuity', async () => {
      const journey = UserJourneyTestUtils.createJourney('network-failure-recovery');

      // Step 1: Start with successful sync during therapeutic session
      updateMockState({
        therapeuticSession: { active: true, type: 'breathing', duration: 60000 }
      });

      const { getByTestId, rerender } = render(
        <TestWrapper>
          <PaymentSyncStatus testID="sync-status" />
          <TherapeuticSessionProtection
            sessionActive={true}
            paymentStatus="active"
            sessionType="breathing"
            testID="session-protection"
          />
        </TestWrapper>
      );

      journey.recordStep('initial-state', 'User in active breathing session with stable payment sync');

      // Step 2: Network failure occurs
      updateMockState({
        syncStatus: { status: 'error', networkStatus: 'offline', queueSize: 3 },
        therapeuticSession: { active: true, type: 'breathing', duration: 90000 }
      });

      rerender(
        <TestWrapper>
          <PaymentSyncStatus testID="sync-status" />
          <TherapeuticSessionProtection
            sessionActive={true}
            paymentStatus="offline"
            sessionType="breathing"
            testID="session-protection"
          />
        </TestWrapper>
      );

      journey.recordStep('network-failure', 'Network connection lost during breathing session');

      // Verify session protection activates
      await waitFor(() => {
        const sessionProtection = getByTestId('session-protection');
        expect(sessionProtection.props.accessibilityLabel).toContain('Offline Session');
        expect(sessionProtection.props.accessibilityLabel).toContain('no network required');
      });

      // Step 3: User continues session despite network issues
      journey.recordStep('continued-session', 'User continues breathing session offline');

      // Step 4: Network recovery
      updateMockState({
        syncStatus: { status: 'retrying', networkStatus: 'online', queueSize: 3 },
        resilienceMetrics: { retryCount: 1, maxRetries: 3 }
      });

      rerender(
        <TestWrapper>
          <PaymentSyncStatus testID="sync-status" />
          <TherapeuticSessionProtection
            sessionActive={true}
            paymentStatus="active"
            sessionType="breathing"
            testID="session-protection"
          />
        </TestWrapper>
      );

      journey.recordStep('network-recovery', 'Network connection restored, sync retrying');

      // Step 5: Full sync recovery
      updateMockState({
        syncStatus: { status: 'success', networkStatus: 'online', queueSize: 0, lastSync: Date.now() },
        resilienceMetrics: { retryCount: 0, maxRetries: 3 }
      });

      rerender(
        <TestWrapper>
          <PaymentSyncStatus testID="sync-status" />
          <TherapeuticSessionProtection
            sessionActive={true}
            paymentStatus="active"
            sessionType="breathing"
            testID="session-protection"
          />
        </TestWrapper>
      );

      journey.recordStep('full-recovery', 'Payment sync fully recovered, session completed');

      // Validate therapeutic continuity throughout journey
      const journeyReport = journey.complete();
      expect(journeyReport.therapeuticContinuity).toBe(100);
      expect(journeyReport.userExperienceScore).toBeGreaterThan(85);
      expect(journeyReport.criticalSteps.filter(step => step.crisisSafe)).toHaveLength(5);
    });

    test('payment method failure with subscription downgrade preserves core functionality', async () => {
      const journey = UserJourneyTestUtils.createJourney('payment-failure-downgrade');

      // Step 1: Premium subscription with active payment
      updateMockState({
        subscriptionTier: { name: 'Premium', features: ['unlimited_sessions', 'advanced_analytics'] }
      });

      const { getByTestId, rerender } = render(
        <TestWrapper>
          <SubscriptionTierDisplay testID="tier-display" />
          <PaymentSyncStatus testID="sync-status" />
          <CrisisSafetyIndicator
            paymentStatus="active"
            testID="crisis-safety"
          />
        </TestWrapper>
      );

      journey.recordStep('premium-active', 'User with Premium subscription, all features available');

      // Step 2: Payment method fails
      const paymentError = { type: 'payment', message: 'Card declined', severity: 'high' };

      rerender(
        <TestWrapper>
          <SubscriptionTierDisplay testID="tier-display" />
          <PaymentErrorHandling
            error={paymentError}
            subscriptionTier="premium"
            testID="error-handling"
          />
          <CrisisSafetyIndicator
            paymentStatus="error"
            testID="crisis-safety"
          />
        </TestWrapper>
      );

      journey.recordStep('payment-failure', 'Payment method declined, error handling displayed');

      // Verify error handling uses therapeutic messaging
      const errorHandling = getByTestId('error-handling');
      expect(errorHandling.props.accessibilityLabel).toContain('mindfulness features remain available');

      // Step 3: Grace period activation
      updateMockState({
        subscriptionTier: { name: 'Premium', features: ['limited_sessions'], gracePeriod: true }
      });

      rerender(
        <TestWrapper>
          <SubscriptionTierDisplay testID="tier-display" />
          <PaymentErrorHandling
            error={paymentError}
            subscriptionTier="premium"
            testID="error-handling"
          />
          <CrisisSafetyIndicator
            paymentStatus="error"
            testID="crisis-safety"
          />
        </TestWrapper>
      );

      journey.recordStep('grace-period', 'Grace period activated, limited features available');

      // Step 4: User updates payment method
      const mockResolveError = jest.fn().mockResolvedValue(undefined);

      rerender(
        <TestWrapper>
          <PaymentErrorHandling
            error={paymentError}
            subscriptionTier="premium"
            onResolveError={mockResolveError}
            testID="error-handling"
          />
        </TestWrapper>
      );

      const updatePaymentButton = getByTestId('error-handling-primary-action');
      fireEvent.press(updatePaymentButton);

      await waitFor(() => {
        expect(mockResolveError).toHaveBeenCalled();
      });

      journey.recordStep('payment-update', 'User initiates payment method update');

      // Step 5: Payment resolved, full service restored
      updateMockState({
        subscriptionTier: { name: 'Premium', features: ['unlimited_sessions', 'advanced_analytics'] },
        syncStatus: { status: 'success', networkStatus: 'online', lastSync: Date.now() }
      });

      rerender(
        <TestWrapper>
          <SubscriptionTierDisplay testID="tier-display" />
          <PaymentSyncStatus testID="sync-status" />
          <CrisisSafetyIndicator
            paymentStatus="active"
            testID="crisis-safety"
          />
        </TestWrapper>
      );

      journey.recordStep('service-restored', 'Payment resolved, full Premium service restored');

      const journeyReport = journey.complete();
      expect(journeyReport.crisisAccessMaintained).toBe(true);
      expect(journeyReport.therapeuticMessaging).toBe(true);
      expect(journeyReport.userSatisfaction).toBeGreaterThan(80);
    });

    test('critical system failure triggers emergency protocols', async () => {
      const journey = UserJourneyTestUtils.createJourney('critical-system-failure');

      // Step 1: Normal operation
      const { getByTestId, rerender } = render(
        <TestWrapper>
          <PaymentSyncStatus testID="sync-status" />
          <CrisisSafetyIndicator
            paymentStatus="active"
            testID="crisis-safety"
          />
        </TestWrapper>
      );

      journey.recordStep('normal-operation', 'System operating normally');

      // Step 2: Critical failure occurs
      const criticalError = {
        type: 'system',
        message: 'Service unavailable',
        severity: 'critical',
        code: 'SYSTEM_CRITICAL_FAILURE'
      };

      updateMockState({
        syncStatus: { status: 'error', networkStatus: 'critical' },
        crisisAccess: { isActive: true }
      });

      rerender(
        <TestWrapper>
          <PaymentErrorHandling
            error={criticalError}
            testID="error-handling"
          />
          <CrisisSafetyIndicator
            paymentStatus="critical"
            testID="crisis-safety"
          />
          <ProtectedCrisisButton
            paymentIssue={true}
            testID="protected-crisis"
          />
        </TestWrapper>
      );

      journey.recordStep('critical-failure', 'Critical system failure triggers emergency protocols');

      // Verify emergency protocols activation
      const crisisSafety = getByTestId('crisis-safety');
      expect(crisisSafety.props.accessibilityLabel).toContain('Emergency Access Available');

      const protectedCrisis = getByTestId('protected-crisis');
      expect(protectedCrisis.props.accessibilityLabel).toContain('payment protection active');

      // Step 3: User accesses emergency features
      const emergencyButton = getByTestId('crisis-safety-emergency-button');
      if (emergencyButton) {
        fireEvent.press(emergencyButton);
        journey.recordStep('emergency-access', 'User activates emergency access');
      }

      // Step 4: Crisis support remains available
      fireEvent.press(protectedCrisis);
      journey.recordStep('crisis-support', 'Crisis support accessed during system failure');

      const journeyReport = journey.complete();
      expect(journeyReport.emergencyProtocolsActive).toBe(true);
      expect(journeyReport.crisisAccessTime).toBeLessThan(3000); // Under 3 seconds
    });
  });

  describe('Subscription Tier Differentiation UI Validation', () => {
    test('tier downgrade maintains core MBCT functionality', async () => {
      const { getByTestId, rerender } = render(
        <TestWrapper>
          <SubscriptionTierDisplay testID="tier-display" />
          <PaymentStatusDashboard testID="payment-dashboard" />
        </TestWrapper>
      );

      // Premium to Basic downgrade
      updateMockState({
        subscriptionTier: {
          name: 'Basic',
          features: ['basic_sessions', 'crisis_support'],
          previousTier: 'Premium'
        }
      });

      rerender(
        <TestWrapper>
          <SubscriptionTierDisplay testID="tier-display" />
          <PaymentStatusDashboard testID="payment-dashboard" />
        </TestWrapper>
      );

      // Verify core MBCT features remain available
      const tierDisplay = getByTestId('tier-display');
      expect(tierDisplay.props.accessibilityLabel).toContain('Basic');
      expect(tierDisplay.props.accessibilityLabel).toContain('crisis_support');

      // Validate therapeutic messaging for tier change
      const therapeuticValidation = TherapeuticTestUtils.validateTierChangeMessaging('Premium', 'Basic');
      expect(therapeuticValidation.maintainsWellbeing).toBe(true);
      expect(therapeuticValidation.reducesAnxiety).toBe(true);
    });

    test('premium features graceful degradation preserves user experience', async () => {
      const journey = UserJourneyTestUtils.createJourney('premium-degradation');

      // Start with Premium features
      updateMockState({
        subscriptionTier: {
          name: 'Premium',
          features: ['unlimited_sessions', 'advanced_analytics', 'premium_content']
        }
      });

      const { getByTestId, rerender } = render(
        <TestWrapper>
          <SubscriptionTierDisplay testID="tier-display" />
        </TestWrapper>
      );

      journey.recordStep('premium-full', 'All Premium features available');

      // Simulate payment issue leading to feature restrictions
      updateMockState({
        subscriptionTier: {
          name: 'Premium',
          features: ['limited_sessions', 'basic_analytics'],
          gracePeriod: true,
          restrictions: ['advanced_analytics', 'premium_content']
        }
      });

      rerender(
        <TestWrapper>
          <SubscriptionTierDisplay testID="tier-display" />
        </TestWrapper>
      );

      journey.recordStep('graceful-degradation', 'Premium features gracefully limited');

      const tierDisplay = getByTestId('tier-display');
      expect(tierDisplay.props.accessibilityLabel).toContain('limited_sessions');

      const journeyReport = journey.complete();
      expect(journeyReport.featureDegradationGraceful).toBe(true);
    });
  });

  describe('Crisis Access Preservation During Payment Outages', () => {
    test('crisis button maintains functionality during extended outage', async () => {
      const outageStartTime = Date.now();
      const crisis = UserJourneyTestUtils.createCrisisScenario('extended-outage');

      // Simulate extended outage
      updateMockState({
        syncStatus: { status: 'error', networkStatus: 'offline', queueSize: 10 },
        crisisAccess: { isActive: true }
      });

      const { getByTestId } = render(
        <TestWrapper>
          <ProtectedCrisisButton
            paymentIssue={true}
            testID="crisis-button"
          />
          <CrisisSafetyIndicator
            paymentStatus="critical"
            testID="crisis-indicator"
          />
        </TestWrapper>
      );

      // Test crisis button responsiveness during outage
      const responseTests = [];
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        const crisisButton = getByTestId('crisis-button');
        fireEvent.press(crisisButton);
        const responseTime = Date.now() - startTime;
        responseTests.push(responseTime);

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second between tests
        });
      }

      const averageResponseTime = responseTests.reduce((a, b) => a + b, 0) / responseTests.length;
      expect(averageResponseTime).toBeLessThan(200); // Always under 200ms

      crisis.recordResponse('crisis-button-responsive', responseTests);

      const crisisReport = crisis.complete();
      expect(crisisReport.reliabilityDuringOutage).toBe(100);
    });

    test('988 hotline access remains prioritized during system failures', async () => {
      updateMockState({
        syncStatus: { status: 'error', networkStatus: 'critical' }
      });

      const { getByTestId } = render(
        <TestWrapper>
          <CrisisSafetyIndicator
            paymentStatus="critical"
            testID="crisis-safety"
          />
        </TestWrapper>
      );

      const crisisSafety = getByTestId('crisis-safety');
      expect(crisisSafety.props.accessibilityLabel).toContain('Emergency Access Available');

      // Verify 988 access is guaranteed
      const hotlineValidation = UserJourneyTestUtils.validateHotlineAccess({
        paymentStatus: 'critical',
        networkStatus: 'offline'
      });

      expect(hotlineValidation.accessible).toBe(true);
      expect(hotlineValidation.responseTime).toBeLessThan(500);
    });
  });

  describe('Therapeutic Session Protection UI Testing', () => {
    test('breathing session protection during payment sync issues', async () => {
      const breathingSession = TherapeuticTestUtils.createBreathingSession();
      breathingSession.start();

      updateMockState({
        therapeuticSession: { active: true, type: 'breathing', duration: 120000 } // 2 minutes in
      });

      const { getByTestId, rerender } = render(
        <TestWrapper>
          <TherapeuticSessionProtection
            sessionActive={true}
            paymentStatus="active"
            sessionType="breathing"
            testID="session-protection"
          />
        </TestWrapper>
      );

      // Simulate payment issue during session
      updateMockState({
        syncStatus: { status: 'error', networkStatus: 'offline' },
        therapeuticSession: { active: true, type: 'breathing', duration: 150000 } // 2.5 minutes
      });

      rerender(
        <TestWrapper>
          <TherapeuticSessionProtection
            sessionActive={true}
            paymentStatus="error"
            sessionType="breathing"
            testID="session-protection"
          />
        </TestWrapper>
      );

      // Verify session protection activated
      await waitFor(() => {
        const sessionProtection = getByTestId('session-protection');
        expect(sessionProtection.props.accessibilityLabel).toContain('Session Protected');
        expect(sessionProtection.props.accessibilityLabel).toContain('continues safely');
      });

      const sessionReport = breathingSession.complete();
      expect(sessionReport.interruptionHandled).toBe(true);
      expect(sessionReport.therapeuticContinuity).toBe(100);
    });

    test('assessment session isolation from payment failures', async () => {
      updateMockState({
        therapeuticSession: { active: true, type: 'assessment', subtype: 'PHQ-9' }
      });

      const { getByTestId } = render(
        <TestWrapper>
          <TherapeuticSessionProtection
            sessionActive={true}
            paymentStatus="error"
            sessionType="assessment"
            testID="assessment-protection"
          />
        </TestWrapper>
      );

      const assessmentProtection = getByTestId('assessment-protection');
      expect(assessmentProtection.props.accessibilityLabel).toContain('assessment session');

      // Verify PHQ-9 assessment can complete despite payment issues
      const assessmentValidation = TherapeuticTestUtils.validateAssessmentIsolation({
        assessmentType: 'PHQ-9',
        paymentStatus: 'error',
        sessionActive: true
      });

      expect(assessmentValidation.canComplete).toBe(true);
      expect(assessmentValidation.dataIntegrity).toBe(100);
      expect(assessmentValidation.scoringAccuracy).toBe(100);
    });
  });
});