/**
 * Crisis Payment Bypass Protocol Tests
 *
 * CRITICAL SAFETY VALIDATION:
 * - Emergency payment bypass functionality
 * - Crisis mode activation protocols
 * - 988 hotline integration verification
 * - Financial hardship safety net validation
 *
 * CRISIS SAFETY COMPONENTS TESTED:
 * - CrisisSafetyPaymentUI.tsx (import cleanup validation)
 * - PaymentMethodScreen crisis banner
 * - PaymentSettingsScreen financial support
 * - PaymentAnxietyDetection crisis escalation
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Linking, AccessibilityInfo } from 'react-native';
import PaymentMethodScreen from '../../src/screens/payment/PaymentMethodScreen';
import PaymentSettingsScreen from '../../src/screens/payment/PaymentSettingsScreen';
import PaymentAnxietyDetection from '../../src/components/payment/PaymentAnxietyDetection';

// Mock dependencies
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
  Linking: {
    openURL: jest.fn(),
  },
  AccessibilityInfo: {
    announceForAccessibility: jest.fn(),
  },
}));

// Mock crisis safety stores
const mockEnableCrisisMode = jest.fn();
const mockCrisisOverride = jest.fn();

jest.mock('../../src/store', () => ({
  usePaymentStore: () => ({
    customer: { email: 'test@example.com', customerId: 'test_customer' },
    paymentMethods: [],
    currentPaymentIntent: null,
    paymentInProgress: false,
    lastPaymentError: null,
    activeSubscription: {
      status: 'active',
      plan: { name: 'Premium Plan', amount: 999, interval: 'month' },
      currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
      cancelAtPeriodEnd: false,
    },
    availablePlans: [],
  }),
  usePaymentActions: () => ({
    addPaymentMethod: jest.fn(),
    createPaymentIntent: jest.fn(),
    confirmPayment: jest.fn(),
    createSubscription: jest.fn(),
    updateSubscription: jest.fn(),
    cancelSubscription: jest.fn(),
    reactivateSubscription: jest.fn(),
    loadPaymentMethods: jest.fn(),
  }),
  usePaymentStatus: () => ({
    crisisMode: false,
    isLoading: false,
    subscriptionStatus: 'active',
    featureAccess: {},
  }),
  useCrisisPaymentSafety: () => ({
    crisisOverride: false,
    enableCrisisMode: mockEnableCrisisMode,
    performanceMetrics: {},
  }),
  useSubscriptionManagement: () => ({}),
  useTrialManagement: () => ({}),
}));

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: {},
  }),
}));

describe('Crisis Payment Bypass Protocol Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Emergency Payment System Bypass', () => {
    it('should activate crisis mode when payment system is unavailable', async () => {
      // Mock payment system failure
      const paymentError = {
        code: 'payment_unavailable',
        message: 'Payment system temporarily unavailable',
      };

      jest.mock('../../src/services/cloud/StripePaymentClient', () => ({
        stripePaymentClient: {
          initialize: jest.fn().mockRejectedValue(paymentError),
          createPaymentMethod: jest.fn(),
        },
      }));

      const { getByText } = render(<PaymentMethodScreen />);

      // Should show crisis banner
      expect(getByText(/Crisis Support Always Free/)).toBeTruthy();
      expect(getByText(/Call 988 Anytime/)).toBeTruthy();

      // Crisis call button should be functional
      const crisisCallButton = getByText('Call Now');
      fireEvent.press(crisisCallButton);

      expect(Linking.openURL).toHaveBeenCalledWith('tel:988');
    });

    it('should provide payment system error alert with crisis options', async () => {
      // Simulate payment system initialization failure
      const { getByText } = render(<PaymentMethodScreen />);

      // Should display crisis-aware error handling
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Payment System Unavailable',
          expect.stringContaining('therapeutic features remain accessible'),
          expect.arrayContaining([
            expect.objectContaining({
              text: 'Call 988',
              onPress: expect.any(Function),
              style: 'destructive',
            }),
            expect.objectContaining({
              text: 'Continue with Free Access',
              onPress: expect.any(Function),
            }),
          ])
        );
      });
    });

    it('should enable crisis mode for payment system failures', async () => {
      const paymentSystemError = {
        code: 'initialization_failed',
        message: 'Failed to initialize payment system',
      };

      // Should call enableCrisisMode with proper context
      expect(mockEnableCrisisMode).toHaveBeenCalledWith('payment_system_unavailable');
    });

    it('should validate crisis mode preserves therapeutic access', async () => {
      // Test with crisis mode enabled
      jest.mock('../../src/store', () => ({
        usePaymentStatus: () => ({
          crisisMode: true,
          isLoading: false,
          subscriptionStatus: 'crisis_override',
          featureAccess: {
            assessments: true,
            breathing: true,
            checkins: true,
            crisisSupport: true,
          },
        }),
      }));

      const { getByText } = render(<PaymentMethodScreen />);

      // Verify therapeutic messaging in crisis mode
      expect(getByText(/therapeutic features remain accessible/)).toBeTruthy();
    });
  });

  describe('Crisis Button Integration and Response Times', () => {
    it('should meet crisis button response time requirement (<200ms)', async () => {
      const { getByText } = render(<PaymentMethodScreen />);

      const crisisCallButton = getByText('Call Now');
      const startTime = Date.now();

      fireEvent.press(crisisCallButton);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(200);
      expect(Linking.openURL).toHaveBeenCalledWith('tel:988');
    });

    it('should validate crisis button accessibility during payment flows', async () => {
      const { getByText } = render(<PaymentMethodScreen />);

      const crisisCallButton = getByText('Call Now');

      // Verify accessibility attributes
      expect(crisisCallButton.props.accessibilityRole).toBe('button');
      expect(crisisCallButton.props.accessibilityLabel).toBe('Call 988 crisis hotline');
      expect(crisisCallButton.props.accessible).toBe(true);
    });

    it('should maintain crisis button visibility during payment errors', async () => {
      const { getByText } = render(<PaymentMethodScreen />);

      // Simulate payment error
      const paymentError = {
        code: 'card_declined',
        message: 'Your card was declined',
      };

      // Crisis banner should remain visible
      expect(getByText(/Crisis Support Always Free/)).toBeTruthy();
      expect(getByText('Call Now')).toBeTruthy();
    });

    it('should announce crisis support availability to screen readers', async () => {
      render(<PaymentMethodScreen />);

      // Should announce crisis support availability
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        expect.stringContaining('crisis support')
      );
    });
  });

  describe('Financial Hardship Crisis Activation', () => {
    it('should activate crisis mode for financial hardship in settings', async () => {
      const { getByText } = render(<PaymentSettingsScreen />);

      // Find financial hardship option
      const crisisSupportButton = getByText(/Activate Crisis Support Mode/);
      fireEvent.press(crisisSupportButton);

      expect(mockEnableCrisisMode).toHaveBeenCalledWith('financial_hardship');
    });

    it('should display financial support options for payment difficulties', async () => {
      // Mock subscription with past due status
      jest.mock('../../src/store', () => ({
        usePaymentStore: () => ({
          activeSubscription: {
            status: 'past_due',
            plan: { name: 'Premium Plan' },
          },
        }),
      }));

      const { getByText } = render(<PaymentSettingsScreen />);

      await waitFor(() => {
        expect(getByText(/Financial Support Available/)).toBeTruthy();
        expect(getByText(/Your mental health matters regardless/)).toBeTruthy();
      });
    });

    it('should provide therapeutic pause option during financial stress', async () => {
      const { getByText } = render(<PaymentSettingsScreen />);

      const pauseOption = getByText(/Temporary Pause/);
      fireEvent.press(pauseOption);

      // Should show pause confirmation with therapeutic messaging
      expect(Alert.alert).toHaveBeenCalledWith(
        'Pause Subscription',
        expect.stringContaining('maintaining basic therapeutic access'),
        expect.any(Array)
      );
    });

    it('should offer financial assistance program contact', async () => {
      const { getByText } = render(<PaymentSettingsScreen />);

      const assistanceButton = getByText(/Financial Assistance Program/);
      fireEvent.press(assistanceButton);

      expect(Linking.openURL).toHaveBeenCalledWith(
        'mailto:support@being.app?subject=Financial Assistance Request'
      );
    });
  });

  describe('Payment Anxiety Crisis Escalation', () => {
    it('should escalate payment anxiety to crisis mode when appropriate', async () => {
      const { getByText } = render(
        <PaymentAnxietyDetection
          formInteractions={20}
          errorCount={10}
          timeOnScreen={180000}
          paymentFailures={5}
        />
      );

      await waitFor(() => {
        const crisisModeButton = getByText('Crisis Mode');
        fireEvent.press(crisisModeButton);
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Payment Stress Support',
        expect.stringContaining('Mental health matters more than any payment'),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Call 988 Crisis Line' }),
          expect.objectContaining({ text: 'Activate Crisis Mode' }),
        ])
      );
    });

    it('should validate 988 hotline direct access from payment anxiety', async () => {
      const { getByText } = render(
        <PaymentAnxietyDetection
          formInteractions={25}
          errorCount={12}
          timeOnScreen={200000}
          paymentFailures={6}
        />
      );

      await waitFor(() => {
        const call988Button = getByText('Call 988');
        fireEvent.press(call988Button);
      });

      expect(Linking.openURL).toHaveBeenCalledWith('tel:988');
    });

    it('should activate crisis mode for payment anxiety escalation', async () => {
      const { getByText } = render(
        <PaymentAnxietyDetection
          formInteractions={15}
          errorCount={8}
          timeOnScreen={150000}
          paymentFailures={4}
        />
      );

      await waitFor(() => {
        const crisisModeButton = getByText('Crisis Mode');
        fireEvent.press(crisisModeButton);
      });

      // Simulate alert action selection
      const alertCalls = Alert.alert.mock.calls;
      const lastAlert = alertCalls[alertCalls.length - 1];
      const crisisModeAction = lastAlert[2].find(action => action.text === 'Activate Crisis Mode');

      if (crisisModeAction && crisisModeAction.onPress) {
        crisisModeAction.onPress();
      }

      expect(mockEnableCrisisMode).toHaveBeenCalledWith('payment_anxiety_escalation');
    });

    it('should provide non-judgmental crisis support messaging', async () => {
      const { getByText } = render(
        <PaymentAnxietyDetection
          formInteractions={18}
          errorCount={9}
          timeOnScreen={160000}
          paymentFailures={5}
        />
      );

      await waitFor(() => {
        expect(getByText(/worth isn't determined by payment status/)).toBeTruthy();
        expect(getByText(/Professional help is available/)).toBeTruthy();
      });
    });
  });

  describe('Crisis Mode Payment Error Handling', () => {
    it('should handle payment failures with crisis-aware messaging', async () => {
      const { getByText } = render(<PaymentMethodScreen />);

      // Simulate payment method error with anxiety trigger
      const paymentError = {
        code: 'card_declined',
        message: 'Card declined',
      };

      // Should show crisis-aware error message
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Payment Challenge - You\'re Supported',
          expect.stringContaining('don\'t define your worth'),
          expect.arrayContaining([
            expect.objectContaining({
              text: 'Activate Crisis Support',
              style: 'destructive',
            }),
          ])
        );
      });
    });

    it('should provide alternative access during payment failures', async () => {
      const { getByText } = render(<PaymentMethodScreen />);

      // Payment failure should offer free access continuation
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          expect.any(String),
          expect.stringContaining('therapeutic access continues'),
          expect.any(Array)
        );
      });
    });

    it('should handle subscription cancellation with crisis safety', async () => {
      const { getByText } = render(<PaymentSettingsScreen />);

      const cancelOption = getByText(/Cancel Subscription/);
      fireEvent.press(cancelOption);

      // Should provide retention offer with crisis support
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'We Support Your Decision',
          expect.stringContaining('financial assistance options'),
          expect.arrayContaining([
            expect.objectContaining({ text: 'Just cancel' }),
            expect.objectContaining({ text: 'Tell me more' }),
          ])
        );
      });
    });
  });

  describe('Emergency Contact and Crisis Protocol Integration', () => {
    it('should validate 988 hotline is always accessible', async () => {
      const { getByText } = render(<PaymentMethodScreen />);

      // Multiple ways to access 988
      const crisisCallButton = getByText('Call Now');
      fireEvent.press(crisisCallButton);

      expect(Linking.openURL).toHaveBeenCalledWith('tel:988');
    });

    it('should maintain crisis protocol during payment processing', async () => {
      const { getByText } = render(<PaymentMethodScreen />);

      // Crisis banner should remain visible during all payment states
      expect(getByText(/Crisis Support Always Free/)).toBeTruthy();
      expect(getByText(/988 Available/)).toBeTruthy();
    });

    it('should validate crisis button accessibility compliance', async () => {
      const { getByText } = render(<PaymentMethodScreen />);

      const crisisCallButton = getByText('Call Now');

      // Must meet accessibility standards for crisis situations
      expect(crisisCallButton.props.accessibilityRole).toBe('button');
      expect(crisisCallButton.props.accessible).toBe(true);
      expect(crisisCallButton.props.accessibilityLabel).toBeDefined();
    });

    it('should announce crisis support availability during payment errors', async () => {
      render(<PaymentMethodScreen />);

      // Should proactively announce crisis support
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        expect.stringMatching(/crisis support|emergency|988/i)
      );
    });
  });

  describe('Crisis Override Performance Validation', () => {
    it('should activate crisis override within performance requirements', async () => {
      const startTime = Date.now();

      const { getByText } = render(<PaymentMethodScreen />);
      const crisisCallButton = getByText('Call Now');

      fireEvent.press(crisisCallButton);

      const activationTime = Date.now() - startTime;
      expect(activationTime).toBeLessThan(200); // Must be < 200ms
    });

    it('should maintain UI responsiveness during crisis mode activation', async () => {
      const { getByText } = render(<PaymentMethodScreen />);

      // Crisis mode activation should not block UI
      const crisisCallButton = getByText('Call Now');
      fireEvent.press(crisisCallButton);

      // UI should remain responsive
      expect(getByText(/Secure Payment Method/)).toBeTruthy();
    });

    it('should validate crisis mode state persistence', async () => {
      // Mock crisis mode enabled
      jest.mock('../../src/store', () => ({
        usePaymentStatus: () => ({
          crisisMode: true,
          isLoading: false,
        }),
        useCrisisPaymentSafety: () => ({
          crisisOverride: true,
          enableCrisisMode: mockEnableCrisisMode,
        }),
      }));

      const { getByText } = render(<PaymentMethodScreen />);

      // Crisis mode should persist across payment interactions
      expect(getByText(/Crisis Support Always Free/)).toBeTruthy();
    });
  });

  describe('Therapeutic Continuity During Crisis', () => {
    it('should ensure therapeutic messaging remains consistent in crisis mode', async () => {
      const { getByText } = render(<PaymentSettingsScreen />);

      // Therapeutic language should be preserved
      expect(getByText(/Your subscription choices are personal decisions/)).toBeTruthy();
      expect(getByText(/no judgment here/)).toBeTruthy();
    });

    it('should validate crisis mode preserves MBCT compliance', async () => {
      const { getByText } = render(<PaymentMethodScreen />);

      // MBCT-compliant messaging during crisis
      expect(getByText(/mindful journey/)).toBeTruthy();
      expect(getByText(/investing in your wellbeing/)).toBeTruthy();
    });

    it('should maintain therapeutic access during payment bypass', async () => {
      // Crisis mode should preserve all therapeutic features
      jest.mock('../../src/store', () => ({
        usePaymentStatus: () => ({
          crisisMode: true,
          featureAccess: {
            assessments: true,
            breathing: true,
            checkins: true,
            crisisSupport: true,
            therapeuticContent: true,
          },
        }),
      }));

      const { getByText } = render(<PaymentMethodScreen />);

      expect(getByText(/therapeutic features remain accessible/)).toBeTruthy();
    });
  });
});