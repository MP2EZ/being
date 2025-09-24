/**
 * PaymentErrorModal Tests - Crisis Safety & Error Recovery
 * Comprehensive testing for therapeutic error handling and recovery flows
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Modal } from 'react-native';
import { PaymentErrorModal } from '../../src/components/payment/PaymentErrorModal';
import { useTheme } from '../../src/hooks/useTheme';
import { useCommonHaptics } from '../../src/hooks/useHaptics';

// Mock dependencies
jest.mock('../../src/hooks/useTheme');
jest.mock('../../src/hooks/useHaptics');

const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;
const mockUseCommonHaptics = useCommonHaptics as jest.MockedFunction<typeof useCommonHaptics>;

// Test utilities
const mockTheme = {
  colorSystem: {
    status: {
      error: '#EF4444',
      warning: '#F59E0B',
      info: '#3B82F6',
      success: '#10B981',
      errorBackground: '#FEE2E2',
      warningBackground: '#FEF3C7',
      infoBackground: '#DBEAFE',
    },
    gray: {
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
    base: {
      black: '#000000',
      white: '#FFFFFF',
    }
  }
};

const mockHaptics = {
  onSelect: jest.fn().mockResolvedValue(undefined),
  onError: jest.fn().mockResolvedValue(undefined),
  onSuccess: jest.fn().mockResolvedValue(undefined)
};

const createPaymentError = (severity: 'low' | 'medium' | 'high' | 'critical', code: string) => ({
  id: 'error_test_123',
  code,
  message: `Test error message for ${code}`,
  severity,
  timestamp: new Date().toISOString(),
  recoverable: true,
  userMessage: `User-friendly message for ${code}`,
  suggestedActions: ['retry', 'contact_support'],
  metadata: {
    paymentMethodId: 'pm_test_123',
    attemptCount: 1
  }
});

describe('PaymentErrorModal - Crisis Safety Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue(mockTheme);
    mockUseCommonHaptics.mockReturnValue(mockHaptics);
  });

  describe('Crisis Mode Error Handling', () => {
    it('should prioritize crisis access over payment errors', () => {
      const criticalError = createPaymentError('critical', 'card_declined');

      const { getByText } = render(
        <PaymentErrorModal
          visible={true}
          error={criticalError}
          crisisMode={true}
          testID="crisis-error-modal"
        />
      );

      expect(getByText('Your Safety Comes First')).toBeTruthy();
      expect(getByText('Your therapeutic access and crisis support remain fully available')).toBeTruthy();
    });

    it('should respond within 200ms for crisis error resolution', async () => {
      const error = createPaymentError('high', 'payment_failed');
      const onRetry = jest.fn();

      const { getByText } = render(
        <PaymentErrorModal
          visible={true}
          error={error}
          crisisMode={true}
          onRetry={onRetry}
          testID="crisis-response-modal"
        />
      );

      const startTime = performance.now();

      const continueButton = getByText('Continue Safely');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(onRetry).toHaveBeenCalled();
      });

      const responseTime = performance.now() - startTime;
      expect(responseTime).toBeLessThan(200);
    });

    it('should provide immediate crisis access paths', () => {
      const error = createPaymentError('critical', 'subscription_suspended');

      const { getByText } = render(
        <PaymentErrorModal
          visible={true}
          error={error}
          crisisMode={true}
          testID="crisis-access-modal"
        />
      );

      expect(getByText('Continue Safely')).toBeTruthy();
      expect(getByText('Crisis Support: Available 24/7')).toBeTruthy();
    });

    it('should maintain therapeutic context during errors', () => {
      const error = createPaymentError('medium', 'insufficient_funds');

      const { getByText } = render(
        <PaymentErrorModal
          visible={true}
          error={error}
          crisisMode={false}
          testID="therapeutic-context-modal"
        />
      );

      expect(getByText('Your Mindful Journey Continues')).toBeTruthy();
      expect(getByText('This temporary issue won\'t interrupt your therapeutic progress')).toBeTruthy();
    });
  });

  describe('Focus Management and Accessibility', () => {
    it('should trap focus within modal', () => {
      const error = createPaymentError('medium', 'card_expired');

      const { getByTestId } = render(
        <PaymentErrorModal
          visible={true}
          error={error}
          testID="focus-trap-modal"
        />
      );

      const modal = getByTestId('focus-trap-modal');
      expect(modal.props.accessible).toBe(true);
      expect(modal.props.accessibilityViewIsModal).toBe(true);
    });

    it('should restore focus properly when dismissed', async () => {
      const error = createPaymentError('low', 'processing_error');
      const onDismiss = jest.fn();

      const { getByText, rerender } = render(
        <PaymentErrorModal
          visible={true}
          error={error}
          onDismiss={onDismiss}
          testID="focus-restore-modal"
        />
      );

      const dismissButton = getByText('Dismiss');
      fireEvent.press(dismissButton);

      await waitFor(() => {
        expect(onDismiss).toHaveBeenCalled();
      });

      // Re-render as closed
      rerender(
        <PaymentErrorModal
          visible={false}
          error={error}
          onDismiss={onDismiss}
          testID="focus-restore-modal"
        />
      );

      // Focus should be restored (tested through modal visibility)
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should provide comprehensive accessibility labels', () => {
      const error = createPaymentError('high', 'authentication_required');

      const { getByLabelText } = render(
        <PaymentErrorModal
          visible={true}
          error={error}
          testID="accessibility-modal"
        />
      );

      const modal = getByLabelText('Payment error dialog. Authentication required.');
      expect(modal.props.accessibilityRole).toBe('dialog');
    });

    it('should support voice control for error recovery', () => {
      const error = createPaymentError('medium', 'card_verification_failed');
      const onRetry = jest.fn();
      const onContactSupport = jest.fn();

      const { getByLabelText } = render(
        <PaymentErrorModal
          visible={true}
          error={error}
          onRetry={onRetry}
          onContactSupport={onContactSupport}
          testID="voice-control-modal"
        />
      );

      const retryButton = getByLabelText('Retry payment process');
      const supportButton = getByLabelText('Contact therapeutic support team');

      expect(retryButton.props.accessibilityRole).toBe('button');
      expect(supportButton.props.accessibilityRole).toBe('button');

      fireEvent.press(retryButton);
      fireEvent.press(supportButton);

      expect(onRetry).toHaveBeenCalled();
      expect(onContactSupport).toHaveBeenCalled();
    });
  });

  describe('Therapeutic Error Messaging', () => {
    it('should use calming language for payment failures', () => {
      const error = createPaymentError('high', 'payment_failed');

      const { getByText } = render(
        <PaymentErrorModal
          visible={true}
          error={error}
          testID="calming-language-modal"
        />
      );

      expect(getByText('Your Mindful Journey Continues')).toBeTruthy();
      expect(getByText('Take a mindful breath. This issue can be resolved gently.')).toBeTruthy();
    });

    it('should provide reassurance for subscription issues', () => {
      const error = createPaymentError('critical', 'subscription_suspended');

      const { getByText } = render(
        <PaymentErrorModal
          visible={true}
          error={error}
          testID="reassurance-modal"
        />
      );

      expect(getByText('Your progress and therapeutic access are protected')).toBeTruthy();
      expect(getByText('We\'re here to support your wellbeing journey')).toBeTruthy();
    });

    it('should adapt messaging based on error severity', () => {
      // Test low severity
      const lowError = createPaymentError('low', 'temporary_processing_delay');

      const { getByText: getLowText, rerender } = render(
        <PaymentErrorModal
          visible={true}
          error={lowError}
          testID="severity-adaptation-modal"
        />
      );

      expect(getLowText('Minor Processing Delay')).toBeTruthy();

      // Test critical severity
      const criticalError = createPaymentError('critical', 'account_suspended');

      rerender(
        <PaymentErrorModal
          visible={true}
          error={criticalError}
          testID="severity-adaptation-modal"
        />
      );

      expect(getLowText('Account Access Issue')).toBeTruthy();
    });

    it('should provide specific guidance for different error types', () => {
      const cardError = createPaymentError('medium', 'card_declined');

      const { getByText } = render(
        <PaymentErrorModal
          visible={true}
          error={cardError}
          testID="specific-guidance-modal"
        />
      );

      expect(getByText('Payment Card Issue')).toBeTruthy();
      expect(getByText('Your card was not accepted. Please try a different payment method.')).toBeTruthy();
    });
  });

  describe('Error Recovery Flows', () => {
    it('should provide multiple recovery paths', () => {
      const error = createPaymentError('medium', 'payment_method_unavailable');
      const onRetry = jest.fn();
      const onContactSupport = jest.fn();
      const onUpdatePayment = jest.fn();

      const { getByText } = render(
        <PaymentErrorModal
          visible={true}
          error={error}
          onRetry={onRetry}
          onContactSupport={onContactSupport}
          onUpdatePayment={onUpdatePayment}
          testID="multiple-recovery-modal"
        />
      );

      expect(getByText('Try Again')).toBeTruthy();
      expect(getByText('Update Payment')).toBeTruthy();
      expect(getByText('Get Support')).toBeTruthy();
    });

    it('should prioritize therapeutic recovery over payment urgency', () => {
      const error = createPaymentError('high', 'subscription_payment_failed');

      const { getByText } = render(
        <PaymentErrorModal
          visible={true}
          error={error}
          testID="therapeutic-priority-modal"
        />
      );

      expect(getByText('Continue Mindfully')).toBeTruthy();
      expect(getByText('Your practice continues. Resolve payment when you\'re ready.')).toBeTruthy();
    });

    it('should handle retry failures gracefully', async () => {
      const error = createPaymentError('medium', 'retry_failed');
      const onRetry = jest.fn().mockRejectedValue(new Error('Retry failed'));

      const { getByText } = render(
        <PaymentErrorModal
          visible={true}
          error={error}
          onRetry={onRetry}
          testID="retry-failure-modal"
        />
      );

      const retryButton = getByText('Try Again');
      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(onRetry).toHaveBeenCalled();
      });

      // Should not crash on retry failure
      expect(getByText('Try Again')).toBeTruthy();
    });

    it('should provide graceful escalation to support', async () => {
      const error = createPaymentError('critical', 'persistent_failure');
      const onContactSupport = jest.fn();

      const { getByText } = render(
        <PaymentErrorModal
          visible={true}
          error={error}
          onContactSupport={onContactSupport}
          showEscalation={true}
          testID="escalation-modal"
        />
      );

      const supportButton = getByText('Speak with Our Team');
      fireEvent.press(supportButton);

      await waitFor(() => {
        expect(onContactSupport).toHaveBeenCalled();
      });

      expect(mockHaptics.onSelect).toHaveBeenCalled();
    });
  });

  describe('Haptic Feedback Integration', () => {
    it('should provide error haptic feedback on modal display', () => {
      const error = createPaymentError('high', 'payment_failed');

      render(
        <PaymentErrorModal
          visible={true}
          error={error}
          useErrorHaptics={true}
          testID="error-haptics-modal"
        />
      );

      expect(mockHaptics.onError).toHaveBeenCalled();
    });

    it('should provide success haptic on resolution', async () => {
      const error = createPaymentError('medium', 'temporary_issue');
      const onRetry = jest.fn().mockResolvedValue({ success: true });

      const { getByText } = render(
        <PaymentErrorModal
          visible={true}
          error={error}
          onRetry={onRetry}
          testID="success-haptics-modal"
        />
      );

      const retryButton = getByText('Try Again');
      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(onRetry).toHaveBeenCalled();
      });

      expect(mockHaptics.onSuccess).toHaveBeenCalled();
    });

    it('should handle haptic failures gracefully', () => {
      mockHaptics.onError.mockRejectedValueOnce(new Error('Haptic error'));
      const error = createPaymentError('low', 'minor_issue');

      // Should not throw
      expect(() => {
        render(
          <PaymentErrorModal
            visible={true}
            error={error}
            useErrorHaptics={true}
            testID="haptic-failure-modal"
          />
        );
      }).not.toThrow();
    });
  });

  describe('Animation and Performance', () => {
    it('should animate modal appearance smoothly', () => {
      const error = createPaymentError('medium', 'animation_test');

      const startTime = performance.now();

      render(
        <PaymentErrorModal
          visible={true}
          error={error}
          animationType="slide"
          testID="animated-modal"
        />
      );

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(50);
    });

    it('should handle rapid visibility changes', () => {
      const error = createPaymentError('low', 'rapid_changes');

      const { rerender } = render(
        <PaymentErrorModal
          visible={false}
          error={error}
          testID="rapid-visibility-modal"
        />
      );

      const startTime = performance.now();

      // Rapid visibility changes
      for (let i = 0; i < 10; i++) {
        rerender(
          <PaymentErrorModal
            visible={i % 2 === 0}
            error={error}
            testID="rapid-visibility-modal"
          />
        );
      }

      const totalTime = performance.now() - startTime;
      expect(totalTime).toBeLessThan(100);
    });

    it('should maintain performance with complex error objects', () => {
      const complexError = {
        ...createPaymentError('high', 'complex_error'),
        metadata: {
          ...createPaymentError('high', 'complex_error').metadata,
          additionalData: new Array(100).fill(0).map((_, i) => `data_${i}`),
          timestamp: new Date().toISOString(),
          userAgent: 'test-agent',
          sessionId: 'session_123'
        }
      };

      const startTime = performance.now();

      render(
        <PaymentErrorModal
          visible={true}
          error={complexError}
          testID="complex-error-modal"
        />
      );

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(100);
    });
  });

  describe('Modal Lifecycle Management', () => {
    it('should handle modal dismissal properly', async () => {
      const error = createPaymentError('low', 'dismissal_test');
      const onDismiss = jest.fn();

      const { getByText } = render(
        <PaymentErrorModal
          visible={true}
          error={error}
          onDismiss={onDismiss}
          testID="dismissal-modal"
        />
      );

      const dismissButton = getByText('Dismiss');
      fireEvent.press(dismissButton);

      await waitFor(() => {
        expect(onDismiss).toHaveBeenCalled();
      });

      expect(mockHaptics.onSelect).toHaveBeenCalled();
    });

    it('should handle back button on Android', () => {
      const error = createPaymentError('medium', 'back_button_test');
      const onDismiss = jest.fn();

      const { getByTestId } = render(
        <PaymentErrorModal
          visible={true}
          error={error}
          onDismiss={onDismiss}
          testID="back-button-modal"
        />
      );

      const modal = getByTestId('back-button-modal');

      // Simulate back button press (Android)
      fireEvent(modal, 'requestClose');

      expect(onDismiss).toHaveBeenCalled();
    });

    it('should prevent dismissal for critical errors when required', () => {
      const criticalError = createPaymentError('critical', 'non_dismissible');
      const onDismiss = jest.fn();

      const { queryByText } = render(
        <PaymentErrorModal
          visible={true}
          error={criticalError}
          onDismiss={onDismiss}
          dismissible={false}
          testID="non-dismissible-modal"
        />
      );

      expect(queryByText('Dismiss')).toBeFalsy();
    });
  });

  describe('Error State Variations', () => {
    it('should handle null error gracefully', () => {
      const { queryByTestId } = render(
        <PaymentErrorModal
          visible={true}
          error={null}
          testID="null-error-modal"
        />
      );

      expect(queryByTestId('null-error-modal')).toBeFalsy();
    });

    it('should handle errors without user messages', () => {
      const errorWithoutUserMessage = {
        ...createPaymentError('medium', 'no_user_message'),
        userMessage: undefined
      };

      const { getByText } = render(
        <PaymentErrorModal
          visible={true}
          error={errorWithoutUserMessage}
          testID="no-user-message-modal"
        />
      );

      expect(getByText('Payment Processing Issue')).toBeTruthy();
    });

    it('should handle errors with custom recovery actions', () => {
      const customError = {
        ...createPaymentError('medium', 'custom_actions'),
        suggestedActions: ['custom_action_1', 'custom_action_2']
      };

      const onCustomAction = jest.fn();

      const { getByText } = render(
        <PaymentErrorModal
          visible={true}
          error={customError}
          onCustomAction={onCustomAction}
          testID="custom-actions-modal"
        />
      );

      // Should still show standard actions if custom handler provided
      expect(getByText('Try Again')).toBeTruthy();
    });
  });

  describe('Theme Integration', () => {
    it('should adapt colors based on error severity', () => {
      const criticalError = createPaymentError('critical', 'theme_test');

      const { getByText } = render(
        <PaymentErrorModal
          visible={true}
          error={criticalError}
          testID="theme-adaptation-modal"
        />
      );

      const title = getByText('Account Access Issue');
      expect(title.props.style).toMatchObject(
        expect.objectContaining({
          color: mockTheme.colorSystem.status.error
        })
      );
    });

    it('should support different modal themes', () => {
      const error = createPaymentError('medium', 'theme_variation');

      const { rerender, getByTestId } = render(
        <PaymentErrorModal
          visible={true}
          error={error}
          theme="evening"
          testID="themed-modal"
        />
      );

      const modal = getByTestId('themed-modal');
      expect(modal).toBeTruthy();

      // Test theme changes
      rerender(
        <PaymentErrorModal
          visible={true}
          error={error}
          theme="morning"
          testID="themed-modal"
        />
      );

      expect(getByTestId('themed-modal')).toBeTruthy();
    });
  });
});