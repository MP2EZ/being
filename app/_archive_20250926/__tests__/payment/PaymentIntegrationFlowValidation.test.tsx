/**
 * Payment Integration Flow Validation Tests
 *
 * COMPLETE PAYMENT FLOW TESTING:
 * - End-to-end payment method addition
 * - Subscription creation and management workflows
 * - Anxiety detection → crisis escalation → support access
 * - Cross-component integration validation
 *
 * INTEGRATION SCENARIOS:
 * - PaymentMethodScreen → PaymentSettingsScreen
 * - PaymentAnxietyDetection → Crisis Mode → Therapeutic Access
 * - Financial Hardship → Crisis Support → Subscription Management
 * - Emergency Payment Bypass → Therapeutic Continuity
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, Linking, AccessibilityInfo } from 'react-native';
import PaymentMethodScreen from '../../src/screens/payment/PaymentMethodScreen';
import PaymentSettingsScreen from '../../src/screens/payment/PaymentSettingsScreen';
import PaymentAnxietyDetection from '../../src/components/payment/PaymentAnxietyDetection';

// Integration test store state
let mockStoreState = {
  customer: { email: 'test@example.com', customerId: 'test_customer' },
  paymentMethods: [],
  currentPaymentIntent: null,
  paymentInProgress: false,
  lastPaymentError: null,
  activeSubscription: null,
  availablePlans: [
    { planId: 'premium_monthly', name: 'Premium Plan', amount: 999, interval: 'month' },
    { planId: 'being_free_trial', name: 'Foundation Plan', amount: 0, interval: 'month' },
  ],
  crisisMode: false,
  isLoading: false,
  subscriptionStatus: 'inactive',
  featureAccess: {},
};

const mockActions = {
  addPaymentMethod: jest.fn(),
  createPaymentIntent: jest.fn(),
  confirmPayment: jest.fn(),
  createSubscription: jest.fn(),
  updateSubscription: jest.fn(),
  cancelSubscription: jest.fn(),
  reactivateSubscription: jest.fn(),
  loadPaymentMethods: jest.fn(),
  enableCrisisMode: jest.fn(),
};

// Mock dynamic store
jest.mock('../../src/store', () => ({
  usePaymentStore: () => mockStoreState,
  usePaymentActions: () => mockActions,
  usePaymentStatus: () => ({
    crisisMode: mockStoreState.crisisMode,
    isLoading: mockStoreState.isLoading,
    subscriptionStatus: mockStoreState.subscriptionStatus,
    featureAccess: mockStoreState.featureAccess,
  }),
  useCrisisPaymentSafety: () => ({
    crisisOverride: mockStoreState.crisisMode,
    enableCrisisMode: mockActions.enableCrisisMode,
    performanceMetrics: {},
  }),
  useSubscriptionManagement: () => ({}),
  useTrialManagement: () => ({}),
}));

// Mock React Native dependencies
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: { alert: jest.fn() },
  Linking: { openURL: jest.fn() },
  AccessibilityInfo: { announceForAccessibility: jest.fn() },
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: { selectedPlan: mockStoreState.availablePlans[0] },
  }),
}));

// Mock Stripe client
const mockStripeClient = {
  initialize: jest.fn(),
  createPaymentMethod: jest.fn(),
};
jest.mock('../../src/services/cloud/StripePaymentClient', () => ({
  stripePaymentClient: mockStripeClient,
}));

describe('Payment Integration Flow Validation', () => {
  beforeEach(() => {
    // Reset store state
    mockStoreState = {
      customer: { email: 'test@example.com', customerId: 'test_customer' },
      paymentMethods: [],
      currentPaymentIntent: null,
      paymentInProgress: false,
      lastPaymentError: null,
      activeSubscription: null,
      availablePlans: [
        { planId: 'premium_monthly', name: 'Premium Plan', amount: 999, interval: 'month' },
        { planId: 'being_free_trial', name: 'Foundation Plan', amount: 0, interval: 'month' },
      ],
      crisisMode: false,
      isLoading: false,
      subscriptionStatus: 'inactive',
      featureAccess: {},
    };

    jest.clearAllMocks();
  });

  describe('Complete Payment Method Addition Flow', () => {
    it('should successfully complete payment method addition with Pressable interactions', async () => {
      // Setup successful Stripe response
      mockStripeClient.createPaymentMethod.mockResolvedValue({
        paymentMethod: {
          paymentMethodId: 'pm_test123456',
          card: { last4: '4242', brand: 'visa', expiryMonth: 12, expiryYear: 2025 },
          fingerprint: 'test_fingerprint',
        },
      });

      const { getByDisplayValue, getByText, getByLabelText } = render(<PaymentMethodScreen />);

      // Fill out payment form
      const cardInput = getByLabelText('Card number input');
      fireEvent.changeText(cardInput, '4242424242424242');

      const expiryMonthInput = getByLabelText('Expiry month');
      fireEvent.changeText(expiryMonthInput, '12');

      const expiryYearInput = getByLabelText('Expiry year');
      fireEvent.changeText(expiryYearInput, '2025');

      const cvcInput = getByLabelText('Security code');
      fireEvent.changeText(cvcInput, '123');

      const nameInput = getByLabelText('Cardholder name');
      fireEvent.changeText(nameInput, 'Test User');

      const emailInput = getByLabelText('Billing email address');
      fireEvent.changeText(emailInput, 'test@example.com');

      // Submit form with Pressable
      const addButton = getByText(/Add Secure Payment Method/);
      fireEvent.press(addButton);

      // Verify Stripe integration
      await waitFor(() => {
        expect(mockStripeClient.createPaymentMethod).toHaveBeenCalledWith(
          expect.objectContaining({
            number: '4242424242424242',
            expiryMonth: 12,
            expiryYear: 2025,
            cvc: '123',
          }),
          expect.objectContaining({
            name: 'Test User',
            email: 'test@example.com',
          }),
          'test_customer',
          'current_device',
          false
        );
      });

      // Verify payment method addition action
      await waitFor(() => {
        expect(mockActions.addPaymentMethod).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'card',
            stripePaymentMethodId: 'pm_test123456',
            last4: '4242',
            brand: 'visa',
            expiryMonth: 12,
            expiryYear: 2025,
            nameOnCard: 'Test User',
            billingEmail: 'test@example.com',
          })
        );
      });

      // Verify accessibility announcement
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Payment method added successfully and securely stored.'
      );
    });

    it('should handle payment method addition errors with therapeutic messaging', async () => {
      // Setup Stripe error
      const stripeError = {
        code: 'card_declined',
        message: 'Your card was declined.',
      };
      mockStripeClient.createPaymentMethod.mockRejectedValue(stripeError);

      const { getByDisplayValue, getByText, getByLabelText } = render(<PaymentMethodScreen />);

      // Fill form and submit
      const cardInput = getByLabelText('Card number input');
      fireEvent.changeText(cardInput, '4000000000000002'); // Declined card

      const addButton = getByText(/Add Secure Payment Method/);
      fireEvent.press(addButton);

      // Should show therapeutic error handling
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Payment Challenge - You\'re Supported',
          expect.stringContaining('don\'t define your worth'),
          expect.arrayContaining([
            expect.objectContaining({ text: 'Activate Crisis Support' }),
            expect.objectContaining({ text: 'Try Different Card' }),
            expect.objectContaining({ text: 'Take a Mindful Pause' }),
          ])
        );
      });
    });
  });

  describe('Subscription Creation and Management Integration', () => {
    it('should complete subscription creation after payment method addition', async () => {
      // Setup with selected plan
      mockStoreState.paymentMethods = [
        {
          paymentMethodId: 'pm_test123',
          card: { brand: 'visa', last4: '4242', expiryMonth: 12, expiryYear: 2025 },
          isDefault: true,
        },
      ];

      const { getByText } = render(<PaymentMethodScreen />);

      // Select existing payment method
      const paymentMethodButton = getByText(/VISA/);
      fireEvent.press(paymentMethodButton);

      // Complete subscription
      const subscribeButton = getByText(/Complete Subscription/);
      fireEvent.press(subscribeButton);

      await waitFor(() => {
        expect(mockActions.createSubscription).toHaveBeenCalledWith(
          'premium_monthly',
          'pm_test123',
          undefined
        );
      });

      // Should show therapeutic success message
      expect(Alert.alert).toHaveBeenCalledWith(
        'Welcome to Your Mindful Journey',
        expect.stringContaining('investing in your wellbeing'),
        expect.any(Array)
      );
    });

    it('should handle subscription changes with therapeutic guidance', async () => {
      // Setup with active subscription
      mockStoreState.activeSubscription = {
        status: 'active',
        plan: { planId: 'premium_monthly', name: 'Premium Plan', amount: 999, interval: 'month' },
        currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
        cancelAtPeriodEnd: false,
      };

      const { getByText } = render(<PaymentSettingsScreen />);

      // Test downgrade option
      const downgradeOption = getByText(/Switch to Foundation Plan/);
      fireEvent.press(downgradeOption);

      // Should show therapeutic guidance
      expect(Alert.alert).toHaveBeenCalledWith(
        'Mindful Subscription Change',
        expect.stringContaining('therapeutic journey continues'),
        expect.arrayContaining([
          expect.objectContaining({ text: 'I need more time' }),
          expect.objectContaining({ text: 'Continue mindfully' }),
        ])
      );
    });

    it('should handle subscription cancellation with retention and crisis support', async () => {
      mockStoreState.activeSubscription = {
        status: 'active',
        plan: { planId: 'premium_monthly', name: 'Premium Plan' },
        currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
        cancelAtPeriodEnd: false,
      };

      const { getByText } = render(<PaymentSettingsScreen />);

      // Start cancellation flow
      const cancelOption = getByText(/Cancel Subscription/);
      fireEvent.press(cancelOption);

      // Should show therapeutic guidance first
      expect(Alert.alert).toHaveBeenCalledWith(
        'Mindful Subscription Change',
        expect.stringContaining('therapeutic journey continues'),
        expect.any(Array)
      );

      // Simulate proceeding with cancellation
      const alertCalls = Alert.alert.mock.calls;
      const guidanceAlert = alertCalls[alertCalls.length - 1];
      const continueAction = guidanceAlert[2].find(action => action.text === 'Continue mindfully');

      if (continueAction && continueAction.onPress) {
        continueAction.onPress();
      }

      await waitFor(() => {
        // Should show retention offer with therapeutic framing
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

  describe('Anxiety Detection to Crisis Escalation Integration', () => {
    it('should complete anxiety detection → breathing exercise → crisis escalation flow', async () => {
      const { getByText, rerender } = render(
        <PaymentAnxietyDetection
          formInteractions={5}
          errorCount={2}
          timeOnScreen={25000}
          paymentFailures={1}
        />
      );

      // Start with moderate anxiety (should trigger breathing exercise)
      await waitFor(() => {
        expect(getByText(/Take a Mindful Moment/)).toBeTruthy();
      });

      const startBreathingButton = getByText('Start Breathing');
      fireEvent.press(startBreathingButton);

      // Should start breathing exercise
      await waitFor(() => {
        expect(getByText('Breathe')).toBeTruthy();
        expect(getByText(/Follow the circle/)).toBeTruthy();
      });

      // Escalate to high anxiety
      rerender(
        <PaymentAnxietyDetection
          formInteractions={20}
          errorCount={10}
          timeOnScreen={180000}
          paymentFailures={5}
        />
      );

      // Should trigger crisis escalation
      await waitFor(() => {
        expect(getByText(/Payment Stress Detected/)).toBeTruthy();
        expect(getByText('Call 988')).toBeTruthy();
        expect(getByText('Crisis Mode')).toBeTruthy();
      });

      // Test crisis mode activation
      const crisisModeButton = getByText('Crisis Mode');
      fireEvent.press(crisisModeButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Payment Stress Support',
        expect.stringContaining('Mental health matters more than any payment'),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Call 988 Crisis Line' }),
          expect.objectContaining({ text: 'Activate Crisis Mode' }),
        ])
      );
    });

    it('should integrate 988 hotline across all payment components', async () => {
      // Test PaymentMethodScreen crisis button
      const methodScreen = render(<PaymentMethodScreen />);
      const crisisCall1 = methodScreen.getByText('Call Now');
      fireEvent.press(crisisCall1);
      expect(Linking.openURL).toHaveBeenCalledWith('tel:988');

      methodScreen.unmount();

      // Test PaymentAnxietyDetection 988 access
      const anxietyComponent = render(
        <PaymentAnxietyDetection
          formInteractions={25}
          errorCount={12}
          timeOnScreen={200000}
          paymentFailures={6}
        />
      );

      await waitFor(() => {
        const call988Button = anxietyComponent.getByText('Call 988');
        fireEvent.press(call988Button);
      });

      expect(Linking.openURL).toHaveBeenCalledWith('tel:988');
    });

    it('should maintain crisis support consistency across payment flows', async () => {
      // PaymentMethodScreen crisis banner
      const methodScreen = render(<PaymentMethodScreen />);
      expect(methodScreen.getByText(/Crisis Support Always Free/)).toBeTruthy();
      methodScreen.unmount();

      // PaymentSettingsScreen crisis banner
      const settingsScreen = render(<PaymentSettingsScreen />);
      expect(settingsScreen.getByText(/Crisis Support Always Free/)).toBeTruthy();
      settingsScreen.unmount();

      // PaymentAnxietyDetection crisis support
      const anxietyComponent = render(
        <PaymentAnxietyDetection
          formInteractions={18}
          errorCount={9}
          timeOnScreen={160000}
          paymentFailures={5}
        />
      );

      await waitFor(() => {
        expect(anxietyComponent.getByText(/Payment Stress Detected/)).toBeTruthy();
      });
    });
  });

  describe('Financial Hardship to Crisis Support Integration', () => {
    it('should handle financial hardship → crisis mode → therapeutic access flow', async () => {
      // Start with past due subscription
      mockStoreState.activeSubscription = {
        status: 'past_due',
        plan: { name: 'Premium Plan' },
        currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
      };

      const { getByText } = render(<PaymentSettingsScreen />);

      // Should show financial support options
      await waitFor(() => {
        expect(getByText(/Financial Support Available/)).toBeTruthy();
      });

      // Activate crisis support mode
      const crisisSupportButton = getByText(/Activate Crisis Support Mode/);
      fireEvent.press(crisisSupportButton);

      expect(mockActions.enableCrisisMode).toHaveBeenCalledWith('financial_hardship');

      // Should maintain therapeutic access in crisis mode
      mockStoreState.crisisMode = true;
      mockStoreState.featureAccess = {
        assessments: true,
        breathing: true,
        checkins: true,
        crisisSupport: true,
        therapeuticContent: true,
      };

      // Verify therapeutic access is preserved
      expect(getByText(/Full therapeutic access during financial hardship/)).toBeTruthy();
    });

    it('should integrate financial assistance program with subscription management', async () => {
      const { getByText } = render(<PaymentSettingsScreen />);

      // Access financial assistance program
      const assistanceButton = getByText(/Financial Assistance Program/);
      fireEvent.press(assistanceButton);

      expect(Linking.openURL).toHaveBeenCalledWith(
        'mailto:support@being.app?subject=Financial Assistance Request'
      );

      // Should also offer subscription pause as alternative
      const pauseButton = getByText(/Temporary Pause/);
      fireEvent.press(pauseButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Pause Subscription',
        expect.stringContaining('maintaining basic therapeutic access'),
        expect.any(Array)
      );
    });
  });

  describe('Emergency Payment Bypass Integration', () => {
    it('should activate emergency bypass when payment system fails', async () => {
      // Mock payment system failure
      const systemError = {
        code: 'payment_unavailable',
        message: 'Payment system temporarily unavailable',
      };
      mockStripeClient.initialize.mockRejectedValue(systemError);

      const { getByText } = render(<PaymentMethodScreen />);

      // Should automatically handle payment system failure
      await waitFor(() => {
        expect(mockActions.enableCrisisMode).toHaveBeenCalledWith('payment_system_unavailable');
      });

      // Should show emergency bypass alert
      expect(Alert.alert).toHaveBeenCalledWith(
        'Payment System Unavailable',
        expect.stringContaining('therapeutic features remain accessible'),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Call 988' }),
          expect.objectContaining({ text: 'Continue with Free Access' }),
        ])
      );
    });

    it('should maintain therapeutic continuity during emergency bypass', async () => {
      // Enable crisis mode (emergency bypass)
      mockStoreState.crisisMode = true;
      mockStoreState.subscriptionStatus = 'crisis_override';
      mockStoreState.featureAccess = {
        assessments: true,
        breathing: true,
        checkins: true,
        crisisSupport: true,
        therapeuticContent: true,
      };

      const { getByText } = render(<PaymentMethodScreen />);

      // Should show therapeutic continuity messaging
      expect(getByText(/therapeutic features remain accessible/)).toBeTruthy();

      // Crisis button should remain accessible
      const crisisButton = getByText('Call Now');
      fireEvent.press(crisisButton);
      expect(Linking.openURL).toHaveBeenCalledWith('tel:988');
    });
  });

  describe('Cross-Component State Management Integration', () => {
    it('should maintain consistent state across payment components', async () => {
      // Add payment method in PaymentMethodScreen
      mockStoreState.paymentMethods = [
        {
          paymentMethodId: 'pm_test123',
          card: { brand: 'visa', last4: '4242', expiryMonth: 12, expiryYear: 2025 },
          isDefault: true,
        },
      ];

      // Verify payment method appears in PaymentSettingsScreen
      const { getByText } = render(<PaymentSettingsScreen />);
      expect(getByText(/VISA/)).toBeTruthy();
      expect(getByText(/4242/)).toBeTruthy();
    });

    it('should propagate crisis mode across all payment components', async () => {
      // Enable crisis mode
      mockStoreState.crisisMode = true;

      // Test crisis mode in PaymentMethodScreen
      const methodScreen = render(<PaymentMethodScreen />);
      expect(methodScreen.getByText(/Crisis Support Always Free/)).toBeTruthy();
      methodScreen.unmount();

      // Test crisis mode in PaymentSettingsScreen
      const settingsScreen = render(<PaymentSettingsScreen />);
      expect(settingsScreen.getByText(/Crisis Support Always Free/)).toBeTruthy();
    });

    it('should handle anxiety level propagation across payment flows', async () => {
      const mockOnAnxietyDetected = jest.fn();

      const { rerender } = render(
        <PaymentAnxietyDetection
          formInteractions={8}
          errorCount={4}
          timeOnScreen={50000}
          paymentFailures={2}
          onAnxietyDetected={mockOnAnxietyDetected}
        />
      );

      // Should detect and report anxiety level
      await waitFor(() => {
        expect(mockOnAnxietyDetected).toHaveBeenCalledWith(expect.any(Number));
      });

      const anxietyLevel = mockOnAnxietyDetected.mock.calls[0][0];
      expect(anxietyLevel).toBeGreaterThan(0);
      expect(anxietyLevel).toBeLessThanOrEqual(5);
    });
  });

  describe('Performance Integration Under Load', () => {
    it('should maintain performance during complete payment flows', async () => {
      const startTime = Date.now();

      // Render multiple components simultaneously
      const methodScreen = render(<PaymentMethodScreen />);
      const settingsScreen = render(<PaymentSettingsScreen />);
      const anxietyComponent = render(
        <PaymentAnxietyDetection
          formInteractions={10}
          errorCount={5}
          timeOnScreen={60000}
        />
      );

      const totalRenderTime = Date.now() - startTime;
      expect(totalRenderTime).toBeLessThan(1000); // Should render quickly

      // Test interaction performance
      const interactionStart = Date.now();
      const crisisButton = methodScreen.getByText('Call Now');
      fireEvent.press(crisisButton);
      const interactionTime = Date.now() - interactionStart;

      expect(interactionTime).toBeLessThan(200); // Crisis button response requirement

      // Cleanup
      methodScreen.unmount();
      settingsScreen.unmount();
      anxietyComponent.unmount();
    });

    it('should handle rapid state changes efficiently', async () => {
      const mockOnAnxietyDetected = jest.fn();

      const { rerender } = render(
        <PaymentAnxietyDetection
          formInteractions={1}
          onAnxietyDetected={mockOnAnxietyDetected}
        />
      );

      // Rapidly change anxiety indicators
      for (let i = 2; i <= 20; i++) {
        rerender(
          <PaymentAnxietyDetection
            formInteractions={i}
            errorCount={Math.floor(i / 3)}
            timeOnScreen={i * 1000}
            paymentFailures={Math.floor(i / 5)}
            onAnxietyDetected={mockOnAnxietyDetected}
          />
        );
      }

      // Should handle rapid updates without performance degradation
      expect(mockOnAnxietyDetected).toHaveBeenCalled();
      expect(mockOnAnxietyDetected.mock.calls.length).toBeGreaterThan(5);
    });
  });

  describe('End-to-End Therapeutic Journey Integration', () => {
    it('should complete full payment journey with therapeutic support', async () => {
      // Start: User enters payment screen
      const { getByText, getByLabelText } = render(<PaymentMethodScreen />);

      // Step 1: User sees crisis support immediately
      expect(getByText(/Crisis Support Always Free/)).toBeTruthy();

      // Step 2: User fills payment form (might trigger anxiety)
      const cardInput = getByLabelText('Card number input');
      fireEvent.changeText(cardInput, '4242424242424242');

      // Step 3: Payment succeeds with therapeutic messaging
      mockStripeClient.createPaymentMethod.mockResolvedValue({
        paymentMethod: {
          paymentMethodId: 'pm_test123456',
          card: { last4: '4242', brand: 'visa', expiryMonth: 12, expiryYear: 2025 },
          fingerprint: 'test_fingerprint',
        },
      });

      const addButton = getByText(/Add Secure Payment Method/);
      fireEvent.press(addButton);

      // Step 4: Success with therapeutic closure
      await waitFor(() => {
        expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
          'Payment method added successfully and securely stored.'
        );
      });

      // Step 5: Therapeutic reminders remain visible
      expect(getByText(/Your worth isn't determined by what you can afford/)).toBeTruthy();
    });

    it('should maintain therapeutic voice throughout error recovery', async () => {
      // Start with payment error
      mockStripeClient.createPaymentMethod.mockRejectedValue({
        code: 'card_declined',
        message: 'Card declined',
      });

      const { getByText, getByLabelText } = render(<PaymentMethodScreen />);

      // Fill form and submit
      const cardInput = getByLabelText('Card number input');
      fireEvent.changeText(cardInput, '4000000000000002');

      const addButton = getByText(/Add Secure Payment Method/);
      fireEvent.press(addButton);

      // Should maintain therapeutic approach in error handling
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Payment Challenge - You\'re Supported',
          expect.stringContaining('don\'t define your worth'),
          expect.any(Array)
        );
      });

      // Crisis support should remain available
      expect(getByText(/Crisis Support Always Free/)).toBeTruthy();
    });
  });
});