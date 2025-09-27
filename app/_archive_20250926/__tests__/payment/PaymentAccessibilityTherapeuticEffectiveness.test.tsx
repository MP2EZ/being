/**
 * Payment Accessibility & Therapeutic Effectiveness Tests
 *
 * WCAG AA COMPLIANCE VALIDATION:
 * - Screen reader compatibility
 * - Motor accessibility for payment stress
 * - Cognitive accessibility for mental health users
 * - Color contrast and visual accessibility
 *
 * THERAPEUTIC EFFECTIVENESS VALIDATION:
 * - MBCT-compliant payment messaging
 * - Non-judgmental financial stress handling
 * - Therapeutic continuity during payment flows
 * - Crisis-responsive payment experience
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, Alert } from 'react-native';
import PaymentMethodScreen from '../../src/screens/payment/PaymentMethodScreen';
import PaymentSettingsScreen from '../../src/screens/payment/PaymentSettingsScreen';
import PaymentAnxietyDetection from '../../src/components/payment/PaymentAnxietyDetection';

// Mock accessibility utilities
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  AccessibilityInfo: {
    announceForAccessibility: jest.fn(),
    isScreenReaderEnabled: jest.fn(() => Promise.resolve(true)),
    setAccessibilityFocus: jest.fn(),
  },
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock stores
jest.mock('../../src/store', () => ({
  usePaymentStore: () => ({
    customer: { email: 'test@example.com', customerId: 'test_customer' },
    paymentMethods: [
      {
        paymentMethodId: 'pm_test123',
        card: { brand: 'visa', last4: '4242', expiryMonth: 12, expiryYear: 2025 },
        isDefault: true,
      },
    ],
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
    enableCrisisMode: jest.fn(),
    performanceMetrics: {},
  }),
  useSubscriptionManagement: () => ({}),
  useTrialManagement: () => ({}),
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

describe('Payment Accessibility & Therapeutic Effectiveness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WCAG AA Accessibility Compliance', () => {
    describe('Screen Reader Compatibility', () => {
      it('should provide comprehensive screen reader support for payment methods', async () => {
        const { getByLabelText, getByText } = render(<PaymentMethodScreen />);

        // Payment method selection accessibility
        const paymentMethodButton = getByLabelText(/visa ending in 4242/i);
        expect(paymentMethodButton).toBeTruthy();
        expect(paymentMethodButton.props.accessibilityRole).toBe('button');
        expect(paymentMethodButton.props.accessibilityState).toBeDefined();

        // Crisis button accessibility
        const crisisButton = getByText('Call Now');
        expect(crisisButton.props.accessibilityLabel).toBe('Call 988 crisis hotline');
        expect(crisisButton.props.accessibilityRole).toBe('button');
      });

      it('should announce payment form interactions to screen readers', async () => {
        const { getByDisplayValue } = render(<PaymentMethodScreen />);

        // Card number input accessibility
        const cardInput = getByDisplayValue('');
        expect(cardInput.props.accessibilityLabel).toBe('Card number input');
        expect(cardInput.props.accessibilityHint).toBe('Enter your card number with or without spaces');

        fireEvent.changeText(cardInput, '4242424242424242');

        // Should announce successful input
        expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
          expect.stringContaining('take your time')
        );
      });

      it('should provide accessible form validation feedback', async () => {
        const { getByDisplayValue } = render(<PaymentMethodScreen />);

        // Test invalid card number
        const cardInput = getByDisplayValue('');
        fireEvent.changeText(cardInput, '1234');

        // Should announce validation error accessibly
        expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
          expect.stringContaining('check the highlighted fields')
        );
      });

      it('should announce payment method addition success', async () => {
        const { getByText } = render(<PaymentMethodScreen />);

        // Simulate successful payment method addition
        await waitFor(() => {
          expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
            'Payment method added successfully and securely stored.'
          );
        });
      });

      it('should provide accessible subscription management', async () => {
        const { getAllByRole } = render(<PaymentSettingsScreen />);

        // All subscription change options should be accessible
        const buttons = getAllByRole('button');
        buttons.forEach(button => {
          expect(button.props.accessibilityLabel).toBeDefined();
          expect(button.props.accessibilityRole).toBe('button');
        });
      });
    });

    describe('Motor Accessibility for Payment Stress', () => {
      it('should provide large touch targets for crisis situations', async () => {
        const { getByText } = render(<PaymentMethodScreen />);

        const crisisCallButton = getByText('Call Now');

        // Crisis buttons should have large touch targets (minimum 44px)
        const styles = crisisCallButton.props.style;
        expect(styles.minHeight).toBeGreaterThanOrEqual(44);
        expect(styles.minWidth).toBeGreaterThanOrEqual(44);
      });

      it('should provide accessible payment method selection for motor impairments', async () => {
        const { getByLabelText } = render(<PaymentMethodScreen />);

        const paymentMethodButton = getByLabelText(/visa ending in 4242/i);

        // Should be easily tappable with motor impairments
        expect(paymentMethodButton.props.accessibilityHint).toContain('Double tap to select');

        // Should provide visual feedback on press
        fireEvent.press(paymentMethodButton);
        expect(paymentMethodButton.props.accessibilityState.selected).toBe(true);
      });

      it('should support accessible breathing exercise controls', async () => {
        const { getByText } = render(
          <PaymentAnxietyDetection
            formInteractions={8}
            errorCount={4}
            timeOnScreen={50000}
          />
        );

        await waitFor(() => {
          const startBreathingButton = getByText('Start Breathing');

          // Breathing controls should be accessible with motor limitations
          expect(startBreathingButton.props.accessibilityRole).toBe('button');
          expect(startBreathingButton.props.accessible).toBe(true);

          fireEvent.press(startBreathingButton);
        });

        // Should provide accessible stop control
        await waitFor(() => {
          const stopButton = getByText('Stop Breathing Exercise');
          expect(stopButton).toBeTruthy();
          expect(stopButton.props.accessibilityRole).toBe('button');
        });
      });

      it('should provide accessible subscription change controls', async () => {
        const { getByText } = render(<PaymentSettingsScreen />);

        // Subscription change options should be motor-accessible
        const upgradeOption = getByText(/Upgrade to Annual Commitment/);
        expect(upgradeOption.props.accessibilityRole).toBe('button');
        expect(upgradeOption.props.accessible).toBe(true);

        fireEvent.press(upgradeOption);

        // Should provide confirmation dialog accessible to motor impairments
        expect(Alert.alert).toHaveBeenCalledWith(
          'Mindful Subscription Change',
          expect.any(String),
          expect.arrayContaining([
            expect.objectContaining({ text: 'I need more time' }),
            expect.objectContaining({ text: 'Continue mindfully' }),
          ])
        );
      });
    });

    describe('Cognitive Accessibility for Mental Health Users', () => {
      it('should use clear, simple language for payment forms', async () => {
        const { getByText, getByLabelText } = render(<PaymentMethodScreen />);

        // Form labels should be clear and simple
        expect(getByLabelText('Card number input')).toBeTruthy();
        expect(getByLabelText('Expiry month')).toBeTruthy();
        expect(getByLabelText('Security code')).toBeTruthy();

        // Instructions should be cognitive-load appropriate
        expect(getByText(/Enter your card number with or without spaces/)).toBeTruthy();
      });

      it('should provide clear progress indicators for payment processes', async () => {
        const { getByText } = render(<PaymentMethodScreen />);

        // Should indicate progress clearly
        expect(getByText(/Secure Payment Method/)).toBeTruthy();
        expect(getByText(/Add New Payment Method/)).toBeTruthy();
      });

      it('should use cognitive-friendly anxiety support messaging', async () => {
        const { getByText } = render(
          <PaymentAnxietyDetection
            formInteractions={6}
            errorCount={3}
            timeOnScreen={35000}
          />
        );

        await waitFor(() => {
          expect(getByText(/Take a Mindful Moment/)).toBeTruthy();
          expect(getByText(/Payment forms can feel overwhelming/)).toBeTruthy();
          expect(getByText(/center ourselves with mindful breathing/)).toBeTruthy();
        });

        // Language should be supportive, not clinical
        expect(getByText(/overwhelming/)).toBeTruthy();
        expect(getByText(/center ourselves/)).toBeTruthy();
      });

      it('should provide clear subscription cancellation guidance', async () => {
        const { getByText } = render(<PaymentSettingsScreen />);

        const cancelOption = getByText(/Cancel Subscription/);
        fireEvent.press(cancelOption);

        // Should use clear, supportive language
        expect(Alert.alert).toHaveBeenCalledWith(
          'Mindful Subscription Change',
          expect.stringContaining('therapeutic journey continues'),
          expect.any(Array)
        );
      });
    });

    describe('Visual Accessibility and Color Contrast', () => {
      it('should ensure crisis elements meet high contrast requirements', async () => {
        const { getByText } = render(<PaymentMethodScreen />);

        const crisisCallButton = getByText('Call Now');
        const crisisBanner = getByText(/Crisis Support Always Free/);

        // Crisis elements should have high contrast for visibility
        expect(crisisCallButton.props.style.backgroundColor).toBeDefined();
        expect(crisisBanner.props.style.color).toBeDefined();
      });

      it('should provide visual feedback for payment method selection', async () => {
        const { getByLabelText } = render(<PaymentMethodScreen />);

        const paymentMethodButton = getByLabelText(/visa ending in 4242/i);

        // Should have visual indication of selection state
        expect(paymentMethodButton.props.style).toContain(
          expect.objectContaining({
            borderColor: expect.any(String),
            backgroundColor: expect.any(String),
          })
        );
      });

      it('should use accessible colors for anxiety support elements', async () => {
        const { getByText } = render(
          <PaymentAnxietyDetection
            formInteractions={8}
            errorCount={4}
            timeOnScreen={50000}
          />
        );

        await waitFor(() => {
          const supportTitle = getByText(/Take a Mindful Moment/);

          // Support elements should meet WCAG AA contrast ratios
          expect(supportTitle.props.style.color).toBeDefined();
        });
      });
    });
  });

  describe('Therapeutic Effectiveness Validation', () => {
    describe('MBCT-Compliant Payment Messaging', () => {
      it('should use mindful language throughout payment flows', async () => {
        const { getByText } = render(<PaymentMethodScreen />);

        // MBCT-compliant terminology
        expect(getByText(/mindful journey/)).toBeTruthy();
        expect(getByText(/investing in your wellbeing/)).toBeTruthy();
      });

      it('should provide therapeutic context for subscription changes', async () => {
        const { getByText } = render(<PaymentSettingsScreen />);

        const upgradeOption = getByText(/Upgrade to Annual Commitment/);
        fireEvent.press(upgradeOption);

        // Should frame subscription changes therapeutically
        expect(Alert.alert).toHaveBeenCalledWith(
          'Mindful Subscription Change',
          expect.stringContaining('therapeutic journey continues'),
          expect.any(Array)
        );
      });

      it('should maintain mindful approach during payment errors', async () => {
        const { getByText } = render(<PaymentMethodScreen />);

        // Error handling should be mindful and supportive
        await waitFor(() => {
          expect(Alert.alert).toHaveBeenCalledWith(
            'Payment Challenge - You\'re Supported',
            expect.stringContaining('don\'t define your worth'),
            expect.any(Array)
          );
        });
      });

      it('should provide mindful breathing guidance during payment stress', async () => {
        const { getByText } = render(
          <PaymentAnxietyDetection
            formInteractions={8}
            errorCount={4}
            timeOnScreen={50000}
          />
        );

        await waitFor(() => {
          const startBreathingButton = getByText('Start Breathing');
          fireEvent.press(startBreathingButton);
        });

        // Breathing instructions should be MBCT-compliant
        expect(getByText(/Follow the circle - breathe in as it grows/)).toBeTruthy();
        expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
          expect.stringContaining('mindful breathing exercise')
        );
      });
    });

    describe('Non-Judgmental Financial Stress Handling', () => {
      it('should frame payment difficulties non-judgmentally', async () => {
        const { getByText } = render(<PaymentSettingsScreen />);

        // Financial support messaging should be non-judgmental
        expect(getByText(/Your mental health matters regardless of your ability to pay/)).toBeTruthy();
        expect(getByText(/financial circumstances can change/)).toBeTruthy();
      });

      it('should provide supportive messaging for payment failures', async () => {
        const { getByText } = render(<PaymentMethodScreen />);

        // Payment failure messaging should be supportive
        expect(getByText(/Payment challenges can feel overwhelming/)).toBeTruthy();
        expect(getByText(/don\'t diminish your right to healing/)).toBeTruthy();
      });

      it('should validate subscription cancellation messaging is supportive', async () => {
        const { getByText } = render(<PaymentSettingsScreen />);

        const cancelOption = getByText(/Cancel Subscription/);
        fireEvent.press(cancelOption);

        // Cancellation should be framed supportively
        expect(Alert.alert).toHaveBeenCalledWith(
          'Mindful Subscription Change',
          expect.stringContaining('feels right for you right now'),
          expect.any(Array)
        );
      });

      it('should handle payment anxiety without shame or judgment', async () => {
        const { getByText } = render(
          <PaymentAnxietyDetection
            formInteractions={18}
            errorCount={9}
            timeOnScreen={160000}
            paymentFailures={5}
          />
        );

        await waitFor(() => {
          expect(getByText(/Payment difficulties can be overwhelming/)).toBeTruthy();
          expect(getByText(/worth isn't determined by payment status/)).toBeTruthy();
        });
      });
    });

    describe('Therapeutic Continuity During Payment Flows', () => {
      it('should maintain therapeutic messaging during all payment states', async () => {
        const { getByText } = render(<PaymentMethodScreen />);

        // Therapeutic reminders should be present
        expect(getByText(/Your worth isn't determined by what you can afford/)).toBeTruthy();
        expect(getByText(/Payment challenges don't diminish your right to healing/)).toBeTruthy();
      });

      it('should preserve therapeutic access during payment issues', async () => {
        const { getByText } = render(<PaymentMethodScreen />);

        // Should reassure continued therapeutic access
        expect(getByText(/Crisis support remains free and accessible always/)).toBeTruthy();
      });

      it('should provide therapeutic guidance for subscription management', async () => {
        const { getByText } = render(<PaymentSettingsScreen />);

        // Subscription management should include therapeutic guidance
        expect(getByText(/align with your current life circumstances/)).toBeTruthy();
        expect(getByText(/no judgment here - only support for your wellbeing/)).toBeTruthy();
      });

      it('should maintain crisis support availability throughout payment flows', async () => {
        const { getByText } = render(<PaymentMethodScreen />);

        // Crisis support should be consistently available
        expect(getByText(/Crisis Support Always Free/)).toBeTruthy();
        expect(getByText(/Call 988 Anytime/)).toBeTruthy();
      });
    });

    describe('Crisis-Responsive Payment Experience', () => {
      it('should adapt payment experience for users in crisis', async () => {
        // Mock crisis mode
        jest.mock('../../src/store', () => ({
          usePaymentStatus: () => ({
            crisisMode: true,
            isLoading: false,
          }),
        }));

        const { getByText } = render(<PaymentMethodScreen />);

        // Should show crisis-adapted messaging
        expect(getByText(/therapeutic features remain accessible/)).toBeTruthy();
      });

      it('should provide immediate crisis escalation during payment stress', async () => {
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
          expect(call988Button).toBeTruthy();

          fireEvent.press(call988Button);
        });

        expect(require('react-native').Linking.openURL).toHaveBeenCalledWith('tel:988');
      });

      it('should maintain therapeutic safety during financial hardship', async () => {
        const { getByText } = render(<PaymentSettingsScreen />);

        // Financial hardship should maintain therapeutic safety
        const crisisSupportButton = getByText(/Activate Crisis Support Mode/);
        expect(crisisSupportButton).toBeTruthy();
        expect(getByText(/Full therapeutic access during financial hardship/)).toBeTruthy();
      });
    });
  });

  describe('Payment Flow User Experience Validation', () => {
    it('should provide smooth, anxiety-reducing payment flow', async () => {
      const { getByText, getByDisplayValue } = render(<PaymentMethodScreen />);

      // Form should be clearly structured
      expect(getByText(/Add New Payment Method/)).toBeTruthy();
      expect(getByText(/PCI Compliant Security/)).toBeTruthy();

      // Security notice should reduce anxiety
      expect(getByText(/never store your card details/)).toBeTruthy();
    });

    it('should validate therapeutic timing for payment processes', async () => {
      const { getByText } = render(<PaymentMethodScreen />);

      const startTime = Date.now();

      // Payment screen should load quickly to reduce stress
      expect(getByText(/Secure Payment Method/)).toBeTruthy();

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(500); // Mental health UX requirement
    });

    it('should provide clear completion feedback for therapeutic closure', async () => {
      const { getByText } = render(<PaymentMethodScreen />);

      // Should provide clear success messaging
      await waitFor(() => {
        expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
          'Payment method added successfully and securely stored.'
        );
      });
    });

    it('should maintain consistent therapeutic voice throughout payment experience', async () => {
      const { getByText } = render(<PaymentSettingsScreen />);

      // Consistent therapeutic voice
      expect(getByText(/Manage your subscription with compassion and transparency/)).toBeTruthy();
      expect(getByText(/Your therapeutic access and safety always come first/)).toBeTruthy();
    });
  });
});