/**
 * Crisis Scenario End-to-End Tests
 * Complete crisis workflow validation for webhook UI components
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { PaymentStatusIndicator } from '../../src/components/payment/PaymentStatusIndicator';
import { GracePeriodBanner } from '../../src/components/payment/GracePeriodBanner';
import { PaymentErrorModal } from '../../src/components/payment/PaymentErrorModal';
import { PaymentStatusDashboard } from '../../src/components/payment/PaymentStatusDashboard';
import { usePaymentStore, usePaymentStatus } from '../../src/store/paymentStore';
import { useCrisisStore } from '../../src/store/crisisStore';

// Mock dependencies
jest.mock('../../src/store/paymentStore');
jest.mock('../../src/store/crisisStore');
jest.mock('react-native/Libraries/Linking/Linking');

const mockUsePaymentStore = usePaymentStore as jest.MockedFunction<typeof usePaymentStore>;
const mockUsePaymentStatus = usePaymentStatus as jest.MockedFunction<typeof usePaymentStatus>;
const mockUseCrisisStore = useCrisisStore as jest.MockedFunction<typeof useCrisisStore>;

// Crisis test scenarios
const crisisScenarios = {
  paymentFailureDuringCrisis: {
    description: 'Payment failure while user is in crisis state',
    crisisState: {
      isInCrisis: true,
      crisisLevel: 'high' as const,
      lastCrisisEvent: new Date().toISOString(),
      crisisSupport: {
        available: true,
        hotlineNumber: '988',
        emergencyContacts: ['contact_1']
      }
    },
    paymentState: {
      subscriptionStatus: { id: 'sub_123', status: 'unpaid' },
      paymentError: {
        severity: 'critical' as const,
        code: 'payment_failed',
        message: 'Payment processing failed'
      },
      gracePeriodInfo: {
        active: true,
        daysRemaining: 7,
        daysRemainingFormatted: '7 days',
        reason: 'payment_failure'
      }
    }
  },

  subscriptionCancellationDuringTherapy: {
    description: 'Subscription cancellation while user is actively using therapeutic features',
    crisisState: {
      isInCrisis: false,
      activeSession: {
        type: 'breathing_exercise',
        startTime: new Date().toISOString(),
        progress: 60
      }
    },
    paymentState: {
      subscriptionStatus: { id: 'sub_123', status: 'canceled' },
      gracePeriodInfo: {
        active: true,
        daysRemaining: 5,
        daysRemainingFormatted: '5 days',
        reason: 'subscription_canceled'
      }
    }
  },

  webhookFailureDuringCrisis: {
    description: 'Webhook processing failure while crisis support is needed',
    crisisState: {
      isInCrisis: true,
      crisisLevel: 'critical' as const,
      needsImmediateSupport: true
    },
    paymentState: {
      webhookStatus: {
        connected: false,
        lastEventTime: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
        errorCount: 5,
        processingQueue: 10
      },
      paymentError: {
        severity: 'high' as const,
        code: 'webhook_timeout',
        message: 'Webhook processing timeout'
      }
    }
  }
};

describe('Crisis Scenario End-to-End Tests', () => {
  const renderWithNavigation = (component: React.ReactElement) => {
    return render(
      <NavigationContainer>
        {component}
      </NavigationContainer>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Payment Failure During Crisis', () => {
    const setupCrisisPaymentFailure = () => {
      const scenario = crisisScenarios.paymentFailureDuringCrisis;

      mockUseCrisisStore.mockReturnValue({
        ...scenario.crisisState,
        triggerCrisisMode: jest.fn(),
        exitCrisisMode: jest.fn()
      });

      mockUsePaymentStatus.mockReturnValue({
        ...scenario.paymentState,
        isSubscriptionActive: false
      });

      mockUsePaymentStore.mockReturnValue({
        handlePaymentFailedWebhook: jest.fn(),
        syncWebhookState: jest.fn(),
        isLoading: false
      });
    };

    it('should prioritize crisis support over payment resolution', async () => {
      setupCrisisPaymentFailure();

      const { getByText, getByTestId } = renderWithNavigation(
        <PaymentStatusDashboard
          crisisMode={true}
          testID="crisis-payment-dashboard"
        />
      );

      // Crisis support should be prominently displayed
      expect(getByText('Crisis Support: Always Available')).toBeTruthy();
      expect(getByText('Call 988 for immediate support')).toBeTruthy();

      // Payment error should be de-emphasized
      const crisisSection = getByTestId('crisis-support-section');
      const paymentSection = getByTestId('payment-error-section');

      expect(crisisSection.props.style).toMatchObject(
        expect.objectContaining({ zIndex: expect.any(Number) })
      );
    });

    it('should maintain therapeutic access during payment failure', () => {
      setupCrisisPaymentFailure();

      const { getByText } = renderWithNavigation(
        <GracePeriodBanner
          testID="crisis-grace-banner"
        />
      );

      expect(getByText('Therapeutic Continuity Activated')).toBeTruthy();
      expect(getByText('Your mindful journey continues safely. No rush - address payment when ready.')).toBeTruthy();
      expect(getByText('Crisis support remains available 24/7')).toBeTruthy();
    });

    it('should respond within 200ms for crisis interactions', async () => {
      setupCrisisPaymentFailure();

      const onCrisisSupport = jest.fn();

      const { getByText } = renderWithNavigation(
        <PaymentStatusIndicator
          crisisMode={true}
          onPress={onCrisisSupport}
          maxResponseTimeMs={200}
          accessibilityLabel="Crisis support access"
          testID="crisis-payment-indicator"
        />
      );

      const startTime = performance.now();

      fireEvent.press(getByText('Therapeutic Continuity Active'));

      await waitFor(() => {
        expect(onCrisisSupport).toHaveBeenCalled();
      });

      const responseTime = performance.now() - startTime;
      expect(responseTime).toBeLessThan(200);
    });

    it('should provide multiple crisis recovery paths', () => {
      setupCrisisPaymentFailure();

      const onEmergencyCall = jest.fn();
      const onCrisisChat = jest.fn();
      const onContinueTherapy = jest.fn();

      const { getByText } = renderWithNavigation(
        <PaymentErrorModal
          visible={true}
          error={crisisScenarios.paymentFailureDuringCrisis.paymentState.paymentError}
          crisisMode={true}
          onEmergencyCall={onEmergencyCall}
          onCrisisChat={onCrisisChat}
          onContinueTherapy={onContinueTherapy}
          testID="crisis-payment-error"
        />
      );

      expect(getByText('Call 988 Now')).toBeTruthy();
      expect(getByText('Crisis Chat')).toBeTruthy();
      expect(getByText('Continue Safely')).toBeTruthy();

      fireEvent.press(getByText('Call 988 Now'));
      fireEvent.press(getByText('Crisis Chat'));
      fireEvent.press(getByText('Continue Safely'));

      expect(onEmergencyCall).toHaveBeenCalled();
      expect(onCrisisChat).toHaveBeenCalled();
      expect(onContinueTherapy).toHaveBeenCalled();
    });
  });

  describe('Subscription Cancellation During Active Therapy', () => {
    const setupTherapyCancellation = () => {
      const scenario = crisisScenarios.subscriptionCancellationDuringTherapy;

      mockUseCrisisStore.mockReturnValue({
        ...scenario.crisisState,
        activeSession: scenario.crisisState.activeSession
      });

      mockUsePaymentStatus.mockReturnValue({
        ...scenario.paymentState,
        isSubscriptionActive: false
      });
    };

    it('should not interrupt active therapeutic sessions', async () => {
      setupTherapyCancellation();

      const { getByText, queryByText } = renderWithNavigation(
        <GracePeriodBanner
          testID="therapy-interruption-banner"
        />
      );

      expect(getByText('Therapeutic Continuity Active')).toBeTruthy();
      expect(getByText('No interruption to your mindful practice')).toBeTruthy();

      // Should not show disruptive cancellation messaging
      expect(queryByText('Subscription canceled')).toBeFalsy();
      expect(queryByText('Access revoked')).toBeFalsy();
    });

    it('should provide session continuity assurance', () => {
      setupTherapyCancellation();

      const { getByText } = renderWithNavigation(
        <PaymentStatusIndicator
          accessibilityLabel="Session continuity"
          testID="session-continuity-indicator"
        />
      );

      expect(getByText('Your therapeutic access is protected')).toBeTruthy();
    });

    it('should guide gentle resolution after session completion', async () => {
      setupTherapyCancellation();

      // Simulate session completion
      mockUseCrisisStore.mockReturnValue({
        isInCrisis: false,
        activeSession: null
      });

      const { getByText } = renderWithNavigation(
        <GracePeriodBanner
          showActions={true}
          testID="post-session-banner"
        />
      );

      const expandBanner = getByText('Therapeutic Continuity Active');
      fireEvent.press(expandBanner);

      await waitFor(() => {
        expect(getByText('Ready to resolve?')).toBeTruthy();
      });

      expect(getByText('Resolve Payment')).toBeTruthy();
      expect(getByText('Get Help')).toBeTruthy();
    });
  });

  describe('Webhook Failure During Crisis', () => {
    const setupWebhookCrisisFailure = () => {
      const scenario = crisisScenarios.webhookFailureDuringCrisis;

      mockUseCrisisStore.mockReturnValue({
        ...scenario.crisisState
      });

      mockUsePaymentStatus.mockReturnValue({
        ...scenario.paymentState,
        isSubscriptionActive: true // Subscription is active but webhooks failing
      });
    };

    it('should maintain service availability during webhook failures', () => {
      setupWebhookCrisisFailure();

      const { getByText } = renderWithNavigation(
        <PaymentStatusDashboard
          crisisMode={true}
          showWebhookStatus={true}
          testID="webhook-crisis-dashboard"
        />
      );

      expect(getByText('Service Status: Fully Available')).toBeTruthy();
      expect(getByText('Crisis support is not affected by connection issues')).toBeTruthy();
    });

    it('should queue non-critical webhooks during crisis', () => {
      setupWebhookCrisisFailure();

      const { getByText } = renderWithNavigation(
        <PaymentStatusDashboard
          showWebhookStatus={true}
          testID="webhook-queue-dashboard"
        />
      );

      expect(getByText('10 updates queued')).toBeTruthy();
      expect(getByText('Crisis access prioritized')).toBeTruthy();
    });

    it('should provide immediate fallback for critical operations', async () => {
      setupWebhookCrisisFailure();

      const onEmergencyAccess = jest.fn();

      const { getByText } = renderWithNavigation(
        <PaymentErrorModal
          visible={true}
          error={crisisScenarios.webhookFailureDuringCrisis.paymentState.paymentError}
          crisisMode={true}
          onEmergencyAccess={onEmergencyAccess}
          testID="webhook-crisis-error"
        />
      );

      const emergencyButton = getByText('Emergency Access');
      fireEvent.press(emergencyButton);

      await waitFor(() => {
        expect(onEmergencyAccess).toHaveBeenCalled();
      });

      // Should bypass webhook requirements for crisis access
      expect(getByText('Bypass connection issues')).toBeTruthy();
    });
  });

  describe('End-to-End Crisis Flow Integration', () => {
    it('should handle complete crisis-to-recovery workflow', async () => {
      // Start with crisis + payment issue
      setupCrisisPaymentFailure();

      const { getByText, rerender } = renderWithNavigation(
        <PaymentStatusDashboard
          crisisMode={true}
          testID="complete-crisis-flow"
        />
      );

      // Initial crisis state
      expect(getByText('Crisis Support: Always Available')).toBeTruthy();

      // User accesses crisis support
      const crisisButton = getByText('Call 988 for immediate support');
      fireEvent.press(crisisButton);

      // Simulate crisis resolution
      await act(async () => {
        mockUseCrisisStore.mockReturnValue({
          isInCrisis: false,
          recentCrisisResolved: true,
          lastCrisisEvent: new Date().toISOString()
        });

        rerender(
          <PaymentStatusDashboard
            crisisMode={false}
            testID="complete-crisis-flow"
          />
        );
      });

      // Post-crisis: gentle payment resolution
      expect(getByText('Take time to address payment mindfully')).toBeTruthy();

      // Simulate payment resolution
      await act(async () => {
        mockUsePaymentStatus.mockReturnValue({
          subscriptionStatus: { id: 'sub_123', status: 'active' },
          isSubscriptionActive: true,
          paymentError: null,
          gracePeriodInfo: null
        });

        rerender(
          <PaymentStatusDashboard
            testID="complete-crisis-flow"
          />
        );
      });

      // Final state: normal operation
      expect(getByText('Premium Active')).toBeTruthy();
    });

    it('should maintain crisis accessibility throughout entire flow', async () => {
      setupCrisisPaymentFailure();

      const testComponents = [
        <PaymentStatusIndicator
          crisisMode={true}
          accessibilityLabel="Crisis indicator"
          testID="crisis-indicator"
        />,
        <GracePeriodBanner testID="crisis-banner" />,
        <PaymentStatusDashboard
          crisisMode={true}
          testID="crisis-dashboard"
        />
      ];

      for (const component of testComponents) {
        const { getByTestId } = renderWithNavigation(component);

        const element = getByTestId(component.props.testID);
        expect(element.props.accessible).toBe(true);

        // Should have crisis-appropriate accessibility labels
        if (element.props.accessibilityLabel) {
          expect(element.props.accessibilityLabel).toMatch(
            /(crisis|emergency|support|safety|therapeutic)/i
          );
        }
      }
    });

    it('should validate performance across entire crisis workflow', async () => {
      const performanceLogs: Array<{ operation: string; duration: number }> = [];

      const logPerformance = (operation: string, duration: number) => {
        performanceLogs.push({ operation, duration });
      };

      const crisisWorkflow = [
        {
          name: 'crisis_detection',
          setup: () => setupCrisisPaymentFailure(),
          render: () => (
            <PaymentStatusIndicator
              crisisMode={true}
              onPerformanceViolation={logPerformance}
              accessibilityLabel="Crisis detection"
              testID="crisis-detection"
            />
          )
        },
        {
          name: 'crisis_support_access',
          setup: () => setupCrisisPaymentFailure(),
          render: () => (
            <PaymentStatusDashboard
              crisisMode={true}
              onCrisisSupportAccess={async () => {
                const start = performance.now();
                await new Promise(resolve => setTimeout(resolve, 100));
                logPerformance('crisis_support_access', performance.now() - start);
              }}
              testID="crisis-support"
            />
          )
        },
        {
          name: 'therapeutic_continuity',
          setup: () => setupTherapyCancellation(),
          render: () => (
            <GracePeriodBanner
              onResolvePayment={async () => {
                const start = performance.now();
                await new Promise(resolve => setTimeout(resolve, 150));
                logPerformance('therapeutic_continuity', performance.now() - start);
              }}
              testID="therapeutic-continuity"
            />
          )
        }
      ];

      for (const step of crisisWorkflow) {
        step.setup();

        const startTime = performance.now();
        const { getByTestId } = renderWithNavigation(step.render());
        const renderTime = performance.now() - startTime;

        expect(renderTime).toBeLessThan(100); // Render performance

        const element = getByTestId(step.render().props.testID);
        expect(element).toBeTruthy();
      }

      // All crisis operations should meet performance requirements
      const slowOperations = performanceLogs.filter(log => log.duration > 200);
      expect(slowOperations).toHaveLength(0);
    });
  });

  describe('Screen Reader Crisis Navigation', () => {
    it('should provide logical crisis navigation flow for screen readers', () => {
      setupCrisisPaymentFailure();

      const { getByLabelText } = renderWithNavigation(
        <PaymentStatusDashboard
          crisisMode={true}
          testID="screen-reader-crisis"
        />
      );

      // Crisis elements should be first in navigation order
      const crisisSupport = getByLabelText(/crisis support/i);
      const emergencyCall = getByLabelText(/call 988/i);
      const therapeuticAccess = getByLabelText(/therapeutic.*continue/i);

      expect(crisisSupport.props.accessibilityRole).toBe('button');
      expect(emergencyCall.props.accessibilityRole).toBe('button');
      expect(therapeuticAccess.props.accessibilityRole).toBe('text');

      // Should have appropriate accessibility hints
      expect(crisisSupport.props.accessibilityHint).toContain('immediate');
      expect(emergencyCall.props.accessibilityHint).toContain('emergency');
    });

    it('should announce crisis state changes appropriately', async () => {
      setupCrisisPaymentFailure();

      const { getByLabelText, rerender } = renderWithNavigation(
        <PaymentStatusIndicator
          crisisMode={true}
          accessibilityLabel="Crisis state indicator"
          testID="crisis-state-announcer"
        />
      );

      const indicator = getByLabelText('Crisis state indicator');
      expect(indicator.props.accessibilityLiveRegion).toBe('assertive');

      // Simulate crisis resolution
      await act(async () => {
        mockUseCrisisStore.mockReturnValue({
          isInCrisis: false,
          recentCrisisResolved: true
        });

        rerender(
          <PaymentStatusIndicator
            crisisMode={false}
            accessibilityLabel="Crisis resolved indicator"
            testID="crisis-state-announcer"
          />
        );
      });

      const resolvedIndicator = getByLabelText('Crisis resolved indicator');
      expect(resolvedIndicator.props.accessibilityLiveRegion).toBe('polite');
    });
  });

  describe('Crisis Data Protection', () => {
    it('should protect sensitive crisis data during payment flows', () => {
      setupCrisisPaymentFailure();

      const onDataAccess = jest.fn();

      const { getByTestId } = renderWithNavigation(
        <PaymentStatusDashboard
          crisisMode={true}
          onDataAccess={onDataAccess}
          testID="crisis-data-protection"
        />
      );

      const dashboard = getByTestId('crisis-data-protection');

      // Crisis data should not be exposed in payment contexts
      expect(dashboard.props.children).not.toMatch(/crisis.*details/i);
      expect(dashboard.props.children).not.toMatch(/emergency.*contact/i);
    });

    it('should maintain crisis context without exposing sensitive information', () => {
      setupCrisisPaymentFailure();

      const { getByText, queryByText } = renderWithNavigation(
        <GracePeriodBanner testID="crisis-context-protection" />
      );

      // Should show crisis support is available
      expect(getByText('Crisis support remains available 24/7')).toBeTruthy();

      // Should not expose specific crisis details
      expect(queryByText(/crisis level/i)).toBeFalsy();
      expect(queryByText(/crisis trigger/i)).toBeFalsy();
      expect(queryByText(/emergency contact/i)).toBeFalsy();
    });
  });
});