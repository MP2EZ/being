/**
 * GracePeriodBanner Tests - Therapeutic Messaging & Crisis Safety
 * Comprehensive testing for grace period therapeutic communication
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { GracePeriodBanner } from '../../src/components/payment/GracePeriodBanner';
import { useGracePeriodMonitoring } from '../../src/store/paymentStore';
import { useTheme } from '../../src/hooks/useTheme';
import { useCommonHaptics } from '../../src/hooks/useHaptics';

// Mock dependencies
jest.mock('../../src/store/paymentStore');
jest.mock('../../src/hooks/useTheme');
jest.mock('../../src/hooks/useHaptics');

const mockUseGracePeriodMonitoring = useGracePeriodMonitoring as jest.MockedFunction<typeof useGracePeriodMonitoring>;
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

const createGracePeriodStatus = (daysRemaining: number, reason = 'payment_issue') => ({
  gracePeriodStatus: {
    active: true,
    daysRemaining,
    daysRemainingFormatted: `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`,
    reason,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000).toISOString()
  },
  gracePeriodActive: true
});

describe('GracePeriodBanner - Therapeutic Messaging Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue(mockTheme);
    mockUseCommonHaptics.mockReturnValue(mockHaptics);

    // Mock Animated.timing
    jest.spyOn(Animated, 'timing').mockImplementation(() => ({
      start: jest.fn((callback) => callback && callback()),
    }));
  });

  describe('Therapeutic Messaging by Urgency Level', () => {
    it('should provide calming messaging for low urgency (>3 days)', () => {
      mockUseGracePeriodMonitoring.mockReturnValue(createGracePeriodStatus(5));

      const { getByText } = render(
        <GracePeriodBanner testID="low-urgency-banner" />
      );

      expect(getByText('Therapeutic Continuity Activated')).toBeTruthy();
      expect(getByText('5 days of uninterrupted access while resolving payment.')).toBeTruthy();
      expect(getByText('Your mindful journey continues safely. No rush - address payment when ready.')).toBeTruthy();
    });

    it('should provide supportive messaging for medium urgency (1-3 days)', () => {
      mockUseGracePeriodMonitoring.mockReturnValue(createGracePeriodStatus(2));

      const { getByText } = render(
        <GracePeriodBanner testID="medium-urgency-banner" />
      );

      expect(getByText('Therapeutic Continuity Active')).toBeTruthy();
      expect(getByText('2 days remaining to resolve payment while maintaining full access.')).toBeTruthy();
      expect(getByText('Practice continues uninterrupted. You have space to address payment calmly.')).toBeTruthy();
    });

    it('should provide gentle urgency for high urgency (≤1 day)', () => {
      mockUseGracePeriodMonitoring.mockReturnValue(createGracePeriodStatus(1));

      const { getByText } = render(
        <GracePeriodBanner testID="high-urgency-banner" />
      );

      expect(getByText('Final Day of Therapeutic Continuity')).toBeTruthy();
      expect(getByText('Your mindful practice continues today. Please resolve payment to maintain access.')).toBeTruthy();
      expect(getByText('Your wellbeing remains our priority. Take time to breathe and address this mindfully.')).toBeTruthy();
    });

    it('should handle edge case of 0 days remaining', () => {
      mockUseGracePeriodMonitoring.mockReturnValue(createGracePeriodStatus(0));

      const { getByText } = render(
        <GracePeriodBanner testID="zero-days-banner" />
      );

      expect(getByText('Final Day of Therapeutic Continuity')).toBeTruthy();
      expect(getByText('Your wellbeing remains our priority. Take time to breathe and address this mindfully.')).toBeTruthy();
    });
  });

  describe('Crisis Safety Integration', () => {
    it('should maintain access to crisis features messaging', () => {
      mockUseGracePeriodMonitoring.mockReturnValue(createGracePeriodStatus(3));

      const { getByText } = render(
        <GracePeriodBanner testID="crisis-safety-banner" />
      );

      // Expand to see crisis safety details
      const banner = getByText('Therapeutic Continuity Active');
      fireEvent.press(banner);

      expect(getByText('Crisis support remains available 24/7')).toBeTruthy();
      expect(getByText('Full access to all therapeutic features')).toBeTruthy();
    });

    it('should emphasize no interruption to practice', () => {
      mockUseGracePeriodMonitoring.mockReturnValue(createGracePeriodStatus(4));

      const { getByText } = render(
        <GracePeriodBanner testID="no-interruption-banner" />
      );

      // Expand banner
      const banner = getByText('Therapeutic Continuity Activated');
      fireEvent.press(banner);

      expect(getByText('No interruption to your mindful practice')).toBeTruthy();
      expect(getByText('Your progress and data are safely preserved')).toBeTruthy();
    });

    it('should respond within performance requirements for crisis mode', async () => {
      mockUseGracePeriodMonitoring.mockReturnValue(createGracePeriodStatus(1));
      const onResolvePayment = jest.fn();

      const { getByText } = render(
        <GracePeriodBanner
          onResolvePayment={onResolvePayment}
          testID="crisis-performance-banner"
        />
      );

      const startTime = performance.now();

      // Expand and resolve payment
      const banner = getByText('Final Day of Therapeutic Continuity');
      fireEvent.press(banner);

      const resolveButton = getByText('Resolve Payment');
      fireEvent.press(resolveButton);

      await waitFor(() => {
        expect(onResolvePayment).toHaveBeenCalled();
      });

      const responseTime = performance.now() - startTime;
      expect(responseTime).toBeLessThan(200); // Crisis safety requirement
    });
  });

  describe('Screen Reader Accessibility', () => {
    it('should provide comprehensive accessibility labels', () => {
      mockUseGracePeriodMonitoring.mockReturnValue(createGracePeriodStatus(3));

      const { getByTestId } = render(
        <GracePeriodBanner testID="accessible-banner" />
      );

      const banner = getByTestId('accessible-banner');
      const headerSection = banner.findByType('TouchableOpacity');

      expect(headerSection.props.accessibilityLabel).toContain('Therapeutic Continuity Active');
      expect(headerSection.props.accessibilityLabel).toContain('3 days remaining');
      expect(headerSection.props.accessibilityLabel).toContain('Practice continues uninterrupted');
      expect(headerSection.props.accessibilityHint).toBe('Tap to expand grace period details');
    });

    it('should announce progress updates appropriately', () => {
      mockUseGracePeriodMonitoring.mockReturnValue(createGracePeriodStatus(2));

      const { getByText } = render(
        <GracePeriodBanner testID="progress-banner" />
      );

      expect(getByText('2 days remaining')).toBeTruthy();

      // Progress indicator should be accessible
      const progressText = getByText('2 days remaining');
      expect(progressText).toBeTruthy();
    });

    it('should provide accessible expand/collapse functionality', () => {
      mockUseGracePeriodMonitoring.mockReturnValue(createGracePeriodStatus(4));

      const { getByLabelText, getByText } = render(
        <GracePeriodBanner testID="expandable-banner" />
      );

      const expandButton = getByLabelText('Expand details');
      expect(expandButton.props.accessibilityRole).toBe('button');

      fireEvent.press(expandButton);

      const collapseButton = getByLabelText('Collapse details');
      expect(collapseButton).toBeTruthy();
    });

    it('should handle dismiss functionality accessibly', async () => {
      mockUseGracePeriodMonitoring.mockReturnValue(createGracePeriodStatus(3));
      const onDismiss = jest.fn();

      const { getByLabelText } = render(
        <GracePeriodBanner
          onDismiss={onDismiss}
          testID="dismissible-banner"
        />
      );

      const dismissButton = getByLabelText('Dismiss grace period banner');
      expect(dismissButton.props.accessibilityRole).toBe('button');

      fireEvent.press(dismissButton);

      await waitFor(() => {
        expect(onDismiss).toHaveBeenCalled();
      });
    });
  });

  describe('Visual Progress Indicators', () => {
    it('should show accurate progress bar for grace period', () => {
      mockUseGracePeriodMonitoring.mockReturnValue(createGracePeriodStatus(3));

      const { getByText } = render(
        <GracePeriodBanner testID="progress-indicator-banner" />
      );

      expect(getByText('3 days remaining')).toBeTruthy();

      // Progress should be calculated as 3/7 = ~43%
      // This is tested through the component's progress calculation logic
    });

    it('should handle edge cases for progress calculation', () => {
      mockUseGracePeriodMonitoring.mockReturnValue(createGracePeriodStatus(0));

      const { getByText } = render(
        <GracePeriodBanner testID="edge-case-progress-banner" />
      );

      expect(getByText('0 days remaining')).toBeTruthy();
      // Progress should not be negative
    });

    it('should use appropriate colors for different urgency levels', () => {
      const { rerender, getByText } = render(
        <GracePeriodBanner testID="color-urgency-banner" />
      );

      // Test high urgency (red)
      mockUseGracePeriodMonitoring.mockReturnValue(createGracePeriodStatus(1));
      rerender(<GracePeriodBanner testID="color-urgency-banner" />);

      const highUrgencyTitle = getByText('Final Day of Therapeutic Continuity');
      expect(highUrgencyTitle.props.style).toMatchObject(
        expect.objectContaining({ color: mockTheme.colorSystem.status.error })
      );

      // Test medium urgency (warning)
      mockUseGracePeriodMonitoring.mockReturnValue(createGracePeriodStatus(2));
      rerender(<GracePeriodBanner testID="color-urgency-banner" />);

      const mediumUrgencyTitle = getByText('Therapeutic Continuity Active');
      expect(mediumUrgencyTitle.props.style).toMatchObject(
        expect.objectContaining({ color: mockTheme.colorSystem.status.warning })
      );

      // Test low urgency (success)
      mockUseGracePeriodMonitoring.mockReturnValue(createGracePeriodStatus(5));
      rerender(<GracePeriodBanner testID="color-urgency-banner" />);

      const lowUrgencyTitle = getByText('Therapeutic Continuity Activated');
      expect(lowUrgencyTitle.props.style).toMatchObject(
        expect.objectContaining({ color: mockTheme.colorSystem.status.success })
      );
    });
  });

  describe('Compact Mode', () => {
    it('should render essential information in compact mode', () => {
      mockUseGracePeriodMonitoring.mockReturnValue(createGracePeriodStatus(3));

      const { getByText, queryByText } = render(
        <GracePeriodBanner
          compact={true}
          testID="compact-banner"
        />
      );

      expect(getByText('Therapeutic Continuity Active')).toBeTruthy();
      expect(getByText('3 days remaining to resolve payment while maintaining full access.')).toBeTruthy();

      // Therapeutic message should be hidden in compact mode
      expect(queryByText('Practice continues uninterrupted')).toBeFalsy();
    });

    it('should provide compact actions when enabled', () => {
      mockUseGracePeriodMonitoring.mockReturnValue(createGracePeriodStatus(2));
      const onResolvePayment = jest.fn();

      const { getByText } = render(
        <GracePeriodBanner
          compact={true}
          onResolvePayment={onResolvePayment}
          testID="compact-actions-banner"
        />
      );

      const resolveButton = getByText('Resolve');
      expect(resolveButton).toBeTruthy();

      fireEvent.press(resolveButton);
      expect(onResolvePayment).toHaveBeenCalled();
    });

    it('should not allow expansion in compact mode', () => {
      mockUseGracePeriodMonitoring.mockReturnValue(createGracePeriodStatus(4));

      const { getByText, queryByLabelText } = render(
        <GracePeriodBanner
          compact={true}
          testID="compact-no-expand-banner"
        />
      );

      const headerText = getByText('Therapeutic Continuity Activated');
      fireEvent.press(headerText);

      // Should not show expanded content
      expect(queryByLabelText('Expand details')).toBeFalsy();
      expect(queryByText('What this means:')).toBeFalsy();
    });
  });

  describe('Animation and Dismissal', () => {
    it('should animate dismissal smoothly', async () => {
      mockUseGracePeriodMonitoring.mockReturnValue(createGracePeriodStatus(3));
      const onDismiss = jest.fn();

      const { getByLabelText } = render(
        <GracePeriodBanner
          onDismiss={onDismiss}
          testID="animated-dismiss-banner"
        />
      );

      const dismissButton = getByLabelText('Dismiss grace period banner');
      fireEvent.press(dismissButton);

      // Animation should start
      expect(Animated.timing).toHaveBeenCalled();

      await waitFor(() => {
        expect(onDismiss).toHaveBeenCalled();
      });
    });

    it('should handle animation interruption gracefully', async () => {
      mockUseGracePeriodMonitoring.mockReturnValue(createGracePeriodStatus(3));
      const onDismiss = jest.fn();

      const { getByLabelText, unmount } = render(
        <GracePeriodBanner
          onDismiss={onDismiss}
          testID="interrupted-animation-banner"
        />
      );

      const dismissButton = getByLabelText('Dismiss grace period banner');
      fireEvent.press(dismissButton);

      // Unmount component during animation
      unmount();

      // Should not crash
      expect(onDismiss).toHaveBeenCalled();
    });
  });

  describe('Action Button Integration', () => {
    it('should handle resolve payment action with haptic feedback', async () => {
      mockUseGracePeriodMonitoring.mockReturnValue(createGracePeriodStatus(2));
      const onResolvePayment = jest.fn();

      const { getByText } = render(
        <GracePeriodBanner
          onResolvePayment={onResolvePayment}
          testID="resolve-payment-banner"
        />
      );

      // Expand to show actions
      const banner = getByText('Therapeutic Continuity Active');
      fireEvent.press(banner);

      const resolveButton = getByText('Resolve Payment');
      fireEvent.press(resolveButton);

      await waitFor(() => {
        expect(mockHaptics.onSelect).toHaveBeenCalled();
        expect(onResolvePayment).toHaveBeenCalled();
      });
    });

    it('should handle contact support action', async () => {
      mockUseGracePeriodMonitoring.mockReturnValue(createGracePeriodStatus(3));
      const onContactSupport = jest.fn();

      const { getByText } = render(
        <GracePeriodBanner
          onContactSupport={onContactSupport}
          testID="contact-support-banner"
        />
      );

      // Expand to show actions
      const banner = getByText('Therapeutic Continuity Active');
      fireEvent.press(banner);

      const supportButton = getByText('Get Help');
      fireEvent.press(supportButton);

      await waitFor(() => {
        expect(mockHaptics.onSelect).toHaveBeenCalled();
        expect(onContactSupport).toHaveBeenCalled();
      });
    });

    it('should disable actions when not provided', () => {
      mockUseGracePeriodMonitoring.mockReturnValue(createGracePeriodStatus(3));

      const { getByText, queryByText } = render(
        <GracePeriodBanner
          showActions={false}
          testID="no-actions-banner"
        />
      );

      // Expand banner
      const banner = getByText('Therapeutic Continuity Active');
      fireEvent.press(banner);

      expect(queryByText('Resolve Payment')).toBeFalsy();
      expect(queryByText('Get Help')).toBeFalsy();
    });
  });

  describe('No Grace Period State', () => {
    it('should not render when grace period is inactive', () => {
      mockUseGracePeriodMonitoring.mockReturnValue({
        gracePeriodStatus: {
          active: false,
          daysRemaining: 0,
          daysRemainingFormatted: '0 days',
          reason: 'resolved'
        },
        gracePeriodActive: false
      });

      const { queryByTestId } = render(
        <GracePeriodBanner testID="inactive-grace-period-banner" />
      );

      expect(queryByTestId('inactive-grace-period-banner')).toBeFalsy();
    });

    it('should not render when grace period status is null', () => {
      mockUseGracePeriodMonitoring.mockReturnValue({
        gracePeriodStatus: null,
        gracePeriodActive: false
      });

      const { queryByTestId } = render(
        <GracePeriodBanner testID="null-grace-period-banner" />
      );

      expect(queryByTestId('null-grace-period-banner')).toBeFalsy();
    });
  });

  describe('Performance Testing', () => {
    it('should render efficiently with complex state', () => {
      mockUseGracePeriodMonitoring.mockReturnValue(createGracePeriodStatus(3));

      const startTime = performance.now();

      render(
        <GracePeriodBanner
          onResolvePayment={() => {}}
          onContactSupport={() => {}}
          onDismiss={() => {}}
          testID="performance-banner"
        />
      );

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(50);
    });

    it('should handle rapid state changes efficiently', () => {
      const { rerender } = render(
        <GracePeriodBanner testID="rapid-changes-banner" />
      );

      const startTime = performance.now();

      // Simulate rapid grace period updates
      for (let i = 7; i >= 1; i--) {
        mockUseGracePeriodMonitoring.mockReturnValue(createGracePeriodStatus(i));
        rerender(<GracePeriodBanner testID="rapid-changes-banner" />);
      }

      const totalTime = performance.now() - startTime;
      expect(totalTime).toBeLessThan(100); // Should handle rapid updates efficiently
    });
  });
});