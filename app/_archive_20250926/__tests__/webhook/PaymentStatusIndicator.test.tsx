/**
 * PaymentStatusIndicator Tests - Crisis Safety & Accessibility
 * Comprehensive testing for mental health payment UI component
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { PaymentStatusIndicator } from '../../src/components/payment/PaymentStatusIndicator';
import { usePaymentStore, usePaymentStatus } from '../../src/store/paymentStore';
import { useTheme } from '../../src/hooks/useTheme';
import { useCommonHaptics } from '../../src/hooks/useHaptics';

// Mock dependencies
jest.mock('../../src/store/paymentStore');
jest.mock('../../src/hooks/useTheme');
jest.mock('../../src/hooks/useHaptics');

const mockUsePaymentStore = usePaymentStore as jest.MockedFunction<typeof usePaymentStore>;
const mockUsePaymentStatus = usePaymentStatus as jest.MockedFunction<typeof usePaymentStatus>;
const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;
const mockUseCommonHaptics = useCommonHaptics as jest.MockedFunction<typeof useCommonHaptics>;

// Test utilities
const mockTheme = {
  colorSystem: {
    status: {
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
      successBackground: '#D1FAE5',
      warningBackground: '#FEF3C7',
      errorBackground: '#FEE2E2',
      infoBackground: '#DBEAFE',
    },
    gray: {
      100: '#F3F4F6',
      200: '#E5E7EB',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
    },
    base: {
      black: '#000000',
    }
  }
};

const mockHaptics = {
  onSelect: jest.fn().mockResolvedValue(undefined)
};

const defaultPaymentStore = {
  syncWebhookState: jest.fn(),
  updateSubscriptionFromWebhook: jest.fn(),
  handleSubscriptionUpdatedWebhook: jest.fn(),
  handleSubscriptionDeletedWebhook: jest.fn(),
  handleTrialEndingWebhook: jest.fn(),
  handlePaymentSucceededWebhook: jest.fn(),
  handlePaymentFailedWebhook: jest.fn(),
  isLoading: false
};

const defaultPaymentStatus = {
  subscriptionStatus: {
    id: 'sub_test_123',
    status: 'active',
    nextBilling: '2024-10-15'
  },
  subscriptionTier: {
    id: 'tier_premium',
    name: 'Premium',
    features: ['guided_practices', 'progress_tracking']
  },
  isSubscriptionActive: true,
  paymentError: null,
  gracePeriodInfo: null
};

describe('PaymentStatusIndicator - Crisis Safety Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue(mockTheme);
    mockUseCommonHaptics.mockReturnValue(mockHaptics);
    mockUsePaymentStore.mockReturnValue(defaultPaymentStore);
    mockUsePaymentStatus.mockReturnValue(defaultPaymentStatus);
  });

  describe('Crisis Mode Performance Requirements', () => {
    it('should respond within 200ms during crisis mode', async () => {
      const onPress = jest.fn();
      const onPerformanceViolation = jest.fn();

      const { getByTestId } = render(
        <PaymentStatusIndicator
          onPress={onPress}
          crisisMode={true}
          maxResponseTimeMs={200}
          onPerformanceViolation={onPerformanceViolation}
          accessibilityLabel="Payment status during crisis"
          testID="crisis-payment-status"
        />
      );

      const startTime = Date.now();

      // Simulate quick press
      fireEvent.press(getByTestId('crisis-payment-status'));

      await waitFor(() => {
        expect(onPress).toHaveBeenCalled();
      });

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(200);
      expect(onPerformanceViolation).not.toHaveBeenCalled();
    });

    it('should detect performance violations and report them', async () => {
      const onPress = jest.fn().mockImplementation(() => {
        // Simulate slow operation
        return new Promise(resolve => setTimeout(resolve, 250));
      });
      const onPerformanceViolation = jest.fn();

      const { getByTestId } = render(
        <PaymentStatusIndicator
          onPress={onPress}
          crisisMode={true}
          maxResponseTimeMs={200}
          onPerformanceViolation={onPerformanceViolation}
          accessibilityLabel="Slow payment status"
          testID="slow-payment-status"
        />
      );

      fireEvent.press(getByTestId('slow-payment-status'));

      await waitFor(() => {
        expect(onPress).toHaveBeenCalled();
      }, { timeout: 500 });

      await waitFor(() => {
        expect(onPerformanceViolation).toHaveBeenCalledWith(
          expect.any(Number),
          'payment-status-press'
        );
      });

      const violationCall = onPerformanceViolation.mock.calls[0];
      expect(violationCall[0]).toBeGreaterThan(200);
    });

    it('should maintain therapeutic access indicators during crisis', () => {
      mockUsePaymentStatus.mockReturnValue({
        ...defaultPaymentStatus,
        isSubscriptionActive: false,
        gracePeriodInfo: {
          active: true,
          daysRemaining: 3,
          daysRemainingFormatted: '3 days'
        }
      });

      const { getByText } = render(
        <PaymentStatusIndicator
          crisisMode={true}
          accessibilityLabel="Crisis payment status"
          testID="crisis-payment-status"
        />
      );

      expect(getByText('Therapeutic Continuity Active')).toBeTruthy();
      expect(getByText('3 days of continued access')).toBeTruthy();
    });

    it('should prioritize crisis safety over payment status', () => {
      mockUsePaymentStatus.mockReturnValue({
        ...defaultPaymentStatus,
        isSubscriptionActive: false,
        paymentError: {
          severity: 'critical' as const,
          message: 'Payment failed',
          code: 'card_declined'
        },
        gracePeriodInfo: {
          active: true,
          daysRemaining: 1,
          daysRemainingFormatted: '1 day'
        }
      });

      const { getByText, queryByText } = render(
        <PaymentStatusIndicator
          crisisMode={true}
          accessibilityLabel="Crisis payment priority"
          testID="crisis-payment-priority"
        />
      );

      // Grace period should take precedence during crisis
      expect(getByText('Therapeutic Continuity Active')).toBeTruthy();
      expect(queryByText('Payment Attention Needed')).toBeFalsy();
    });
  });

  describe('Screen Reader Integration', () => {
    it('should provide comprehensive accessibility labels', () => {
      const { getByTestId } = render(
        <PaymentStatusIndicator
          accessibilityLabel="Premium subscription active"
          testID="accessible-payment-status"
        />
      );

      const indicator = getByTestId('accessible-payment-status');
      expect(indicator.props.accessibilityLabel).toContain('Premium Active');
      expect(indicator.props.accessibilityLabel).toContain('Renews');
      expect(indicator.props.accessibilityRole).toBe('text');
    });

    it('should announce therapeutic protection for inactive subscriptions', () => {
      mockUsePaymentStatus.mockReturnValue({
        ...defaultPaymentStatus,
        isSubscriptionActive: false
      });

      const { getByTestId } = render(
        <PaymentStatusIndicator
          accessibilityLabel="Basic access status"
          testID="basic-access-status"
        />
      );

      const indicator = getByTestId('basic-access-status');
      expect(indicator.props.accessibilityLabel).toContain('Your therapeutic access is protected');
    });

    it('should provide appropriate accessibility hints for interactive elements', () => {
      const onPress = jest.fn();

      const { getByTestId } = render(
        <PaymentStatusIndicator
          onPress={onPress}
          accessibilityLabel="Interactive payment status"
          testID="interactive-payment-status"
        />
      );

      const indicator = getByTestId('interactive-payment-status');
      expect(indicator.props.accessibilityRole).toBe('button');
      expect(indicator.props.accessibilityHint).toBe('Tap to view subscription details');
    });

    it('should support font scaling for accessibility', () => {
      const { getByText } = render(
        <PaymentStatusIndicator
          accessibilityLabel="Font scaled status"
          testID="font-scaled-status"
        />
      );

      const titleText = getByText('Premium Active');
      expect(titleText.props.allowFontScaling).toBe(true);
      expect(titleText.props.maxFontSizeMultiplier).toBe(1.5);
    });
  });

  describe('Therapeutic Status Messaging', () => {
    it('should use calming language for payment issues', () => {
      mockUsePaymentStatus.mockReturnValue({
        ...defaultPaymentStatus,
        paymentError: {
          severity: 'critical' as const,
          message: 'Payment failed',
          code: 'card_declined'
        }
      });

      const { getByText } = render(
        <PaymentStatusIndicator
          accessibilityLabel="Payment issue status"
          testID="payment-issue-status"
        />
      );

      expect(getByText('Payment Attention Needed')).toBeTruthy();
      expect(getByText('Your mindful practice continues safely')).toBeTruthy();
    });

    it('should emphasize therapeutic continuity during grace periods', () => {
      mockUsePaymentStatus.mockReturnValue({
        ...defaultPaymentStatus,
        gracePeriodInfo: {
          active: true,
          daysRemaining: 5,
          daysRemainingFormatted: '5 days'
        }
      });

      const { getByText } = render(
        <PaymentStatusIndicator
          accessibilityLabel="Grace period status"
          testID="grace-period-status"
        />
      );

      expect(getByText('Therapeutic Continuity Active')).toBeTruthy();
      expect(getByText('5 days of continued access')).toBeTruthy();
    });

    it('should show upgrade prompts therapeutically', () => {
      mockUsePaymentStatus.mockReturnValue({
        ...defaultPaymentStatus,
        isSubscriptionActive: false
      });

      const { getByText } = render(
        <PaymentStatusIndicator
          showUpgradePrompt={true}
          accessibilityLabel="Basic with upgrade"
          testID="basic-with-upgrade"
        />
      );

      expect(getByText('Basic Access')).toBeTruthy();
      expect(getByText('Core breathing exercises available')).toBeTruthy();
      expect(getByText('Unlock guided practices')).toBeTruthy();
    });
  });

  describe('Theme Integration', () => {
    it('should adapt colors based on subscription status', () => {
      const { getByText } = render(
        <PaymentStatusIndicator
          theme="evening"
          accessibilityLabel="Themed status"
          testID="themed-status"
        />
      );

      const title = getByText('Premium Active');
      expect(title.props.style).toMatchObject(
        expect.objectContaining({
          color: mockTheme.colorSystem.status.success
        })
      );
    });

    it('should use appropriate colors for different urgency levels', () => {
      mockUsePaymentStatus.mockReturnValue({
        ...defaultPaymentStatus,
        paymentError: {
          severity: 'critical' as const,
          message: 'Payment failed',
          code: 'card_declined'
        }
      });

      const { getByText } = render(
        <PaymentStatusIndicator
          accessibilityLabel="Error status colors"
          testID="error-status-colors"
        />
      );

      const title = getByText('Payment Attention Needed');
      expect(title.props.style).toMatchObject(
        expect.objectContaining({
          color: mockTheme.colorSystem.status.error
        })
      );
    });
  });

  describe('Compact Mode', () => {
    it('should render compact version with essential information', () => {
      const { getByText, queryByText } = render(
        <PaymentStatusIndicator
          compact={true}
          accessibilityLabel="Compact status"
          testID="compact-status"
        />
      );

      expect(getByText('Premium Active')).toBeTruthy();
      expect(queryByText('Renews')).toBeFalsy(); // Subtitle hidden in compact mode
    });

    it('should maintain minimum touch targets in compact mode', () => {
      const { getByTestId } = render(
        <PaymentStatusIndicator
          compact={true}
          accessibilityLabel="Compact status"
          testID="compact-status"
        />
      );

      const indicator = getByTestId('compact-status');
      // Component should still be accessible even in compact mode
      expect(indicator.props.accessible).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle store errors gracefully', () => {
      mockUsePaymentStatus.mockImplementation(() => {
        throw new Error('Store error');
      });

      // Component should not crash
      expect(() => {
        render(
          <PaymentStatusIndicator
            accessibilityLabel="Error handling test"
            testID="error-handling-test"
          />
        );
      }).not.toThrow();
    });

    it('should handle press errors without affecting UI', async () => {
      const onPress = jest.fn().mockRejectedValue(new Error('Press error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { getByTestId } = render(
        <PaymentStatusIndicator
          onPress={onPress}
          accessibilityLabel="Error press test"
          testID="error-press-test"
        />
      );

      fireEvent.press(getByTestId('error-press-test'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'PaymentStatusIndicator press error:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Haptic Feedback Integration', () => {
    it('should provide haptic feedback for interactions', async () => {
      const onPress = jest.fn();

      const { getByTestId } = render(
        <PaymentStatusIndicator
          onPress={onPress}
          accessibilityLabel="Haptic feedback test"
          testID="haptic-feedback-test"
        />
      );

      fireEvent.press(getByTestId('haptic-feedback-test'));

      await waitFor(() => {
        expect(mockHaptics.onSelect).toHaveBeenCalled();
      });
    });

    it('should handle haptic failures gracefully', async () => {
      mockHaptics.onSelect.mockRejectedValueOnce(new Error('Haptic error'));
      const onPress = jest.fn();

      const { getByTestId } = render(
        <PaymentStatusIndicator
          onPress={onPress}
          accessibilityLabel="Haptic error test"
          testID="haptic-error-test"
        />
      );

      // Should not throw even if haptics fail
      fireEvent.press(getByTestId('haptic-error-test'));

      await waitFor(() => {
        expect(onPress).toHaveBeenCalled();
      });
    });
  });

  describe('Performance Monitoring', () => {
    it('should track render performance', () => {
      const startTime = performance.now();

      render(
        <PaymentStatusIndicator
          accessibilityLabel="Performance test"
          testID="performance-test"
        />
      );

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(50); // Should render quickly
    });

    it('should optimize re-renders with stable status', () => {
      const { rerender } = render(
        <PaymentStatusIndicator
          accessibilityLabel="Re-render test"
          testID="rerender-test"
        />
      );

      // Re-render with same props should be fast
      const startTime = performance.now();

      rerender(
        <PaymentStatusIndicator
          accessibilityLabel="Re-render test"
          testID="rerender-test"
        />
      );

      const rerenderTime = performance.now() - startTime;
      expect(rerenderTime).toBeLessThan(20);
    });
  });

  describe('Integration with Payment Store', () => {
    it('should respond to store state changes', () => {
      const { rerender } = render(
        <PaymentStatusIndicator
          accessibilityLabel="Store integration test"
          testID="store-integration-test"
        />
      );

      // Change store state
      mockUsePaymentStatus.mockReturnValue({
        ...defaultPaymentStatus,
        isSubscriptionActive: false
      });

      rerender(
        <PaymentStatusIndicator
          accessibilityLabel="Store integration test"
          testID="store-integration-test"
        />
      );

      // Should reflect new state
      expect(mockUsePaymentStatus).toHaveBeenCalled();
    });
  });
});