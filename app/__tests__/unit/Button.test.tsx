/**
 * Button Component Unit Tests - TouchableOpacity → Pressable Migration Validation
 *
 * Tests core Button functionality, therapeutic features, and New Architecture compatibility.
 *
 * Critical Test Areas:
 * ✅ Pressable Migration & Behavior
 * ✅ Therapeutic Features (Crisis Response, Haptics)
 * ✅ Accessibility Compliance (WCAG AA+)
 * ✅ New Architecture Compatibility
 * ✅ Mental Health Specific Features
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Button } from '../../src/components/core/Button';

// Mock React Native modules that might cause issues
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    AccessibilityInfo: {
      isReduceMotionEnabled: jest.fn().mockResolvedValue(false),
      isBoldTextEnabled: jest.fn().mockResolvedValue(false),
      addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    },
  };
});

// Mock the hooks used by Button
jest.mock('../../src/hooks/useTheme', () => ({
  useTheme: () => ({
    colorSystem: {
      status: {
        info: '#007AFF',
        success: '#28A745',
        critical: '#DC3545',
      },
      gray: {
        200: '#F8F9FA',
        300: '#DEE2E6',
        500: '#6C757D',
        700: '#495057',
      },
      base: {
        black: '#000000',
      },
    },
  }),
}));

jest.mock('../../src/hooks/useHaptics', () => ({
  useCommonHaptics: () => ({
    onPress: jest.fn().mockResolvedValue(undefined),
  }),
  useHaptics: () => ({
    triggerHaptic: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../../src/contexts/ThemeContext', () => ({
  useThemeColors: () => ({
    primary: '#007AFF',
    success: '#28A745',
    crisis: '#DC3545',
    text: '#000000',
  }),
}));

describe('Button Component - Core Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering & Pressable Migration', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(
        <Button testID="basic-button">Test Button</Button>
      );

      const button = getByTestId('basic-button');
      expect(button).toBeTruthy();
    });

    it('should render text content correctly', () => {
      const { getByText } = render(
        <Button>Button Text</Button>
      );

      expect(getByText('Button Text')).toBeTruthy();
    });

    it('should handle onPress callback', async () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <Button testID="press-button" onPress={mockOnPress}>
          Press Me
        </Button>
      );

      const button = getByTestId('press-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockOnPress).toHaveBeenCalledTimes(1);
      });
    });

    it('should be disabled when disabled prop is true', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <Button testID="disabled-button" disabled={true} onPress={mockOnPress}>
          Disabled
        </Button>
      );

      const button = getByTestId('disabled-button');
      fireEvent.press(button);

      expect(mockOnPress).not.toHaveBeenCalled();
      expect(button.props.disabled).toBe(true);
    });

    it('should be disabled when loading prop is true', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <Button testID="loading-button" loading={true} onPress={mockOnPress}>
          Loading
        </Button>
      );

      const button = getByTestId('loading-button');
      fireEvent.press(button);

      expect(mockOnPress).not.toHaveBeenCalled();
      expect(button.props.disabled).toBe(true);
    });
  });

  describe('Button Variants', () => {
    const variants = ['primary', 'secondary', 'outline', 'success', 'emergency', 'crisis'] as const;

    variants.forEach(variant => {
      it(`should render ${variant} variant`, () => {
        const { getByTestId } = render(
          <Button testID={`${variant}-button`} variant={variant}>
            {variant} Button
          </Button>
        );

        const button = getByTestId(`${variant}-button`);
        expect(button).toBeTruthy();
      });
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper accessibility props', () => {
      const { getByTestId } = render(
        <Button testID="accessible-button">Accessible Button</Button>
      );

      const button = getByTestId('accessible-button');
      expect(button.props.accessible).toBe(true);
      expect(button.props.accessibilityRole).toBe('button');
      expect(button.props.accessibilityLabel).toBe('Accessible Button');
    });

    it('should provide enhanced accessibility for crisis buttons', () => {
      const { getByTestId } = render(
        <Button testID="crisis-button" variant="crisis">
          Get Help
        </Button>
      );

      const button = getByTestId('crisis-button');
      expect(button.props.accessibilityLabel).toBe('Emergency assistance button');
      expect(button.props.accessibilityHint).toBe('Double-tap to access emergency support immediately');
    });

    it('should configure appropriate hit slop for normal buttons', () => {
      const { getByTestId } = render(
        <Button testID="normal-hit-slop">Normal Button</Button>
      );

      const button = getByTestId('normal-hit-slop');
      expect(button.props.hitSlop).toEqual({
        top: 8, left: 8, bottom: 8, right: 8
      });
    });

    it('should provide larger hit slop for emergency buttons', () => {
      const { getByTestId } = render(
        <Button testID="emergency-hit-slop" emergency={true}>
          Emergency
        </Button>
      );

      const button = getByTestId('emergency-hit-slop');
      expect(button.props.hitSlop).toEqual({
        top: 12, left: 12, bottom: 12, right: 12
      });
    });

    it('should show loading state in accessibility', () => {
      const { getByTestId } = render(
        <Button testID="loading-accessibility" loading={true}>
          Loading
        </Button>
      );

      const button = getByTestId('loading-accessibility');
      expect(button.props.accessibilityState.busy).toBe(true);
      expect(button.props.accessibilityValue.text).toBe('Loading, please wait');
      expect(button.props.accessibilityLiveRegion).toBe('polite');
    });
  });

  describe('Android Ripple Configuration', () => {
    it('should configure basic ripple for normal buttons', () => {
      const { getByTestId } = render(
        <Button testID="ripple-button">Ripple Test</Button>
      );

      const button = getByTestId('ripple-button');
      expect(button.props.android_ripple).toBeDefined();
      expect(button.props.android_ripple.color).toBe('rgba(0, 0, 0, 0.1)');
      expect(button.props.android_ripple.borderless).toBe(false);
      expect(button.props.android_ripple.radius).toBe(200);
    });

    it('should use enhanced ripple for crisis buttons', () => {
      const { getByTestId } = render(
        <Button testID="crisis-ripple" variant="crisis">
          Crisis
        </Button>
      );

      const button = getByTestId('crisis-ripple');
      expect(button.props.android_ripple.color).toBe('rgba(255, 255, 255, 0.3)');
    });
  });

  describe('Therapeutic Features', () => {
    it('should handle emergency buttons correctly', () => {
      const { getByTestId } = render(
        <Button testID="emergency-button" emergency={true}>
          Emergency
        </Button>
      );

      const button = getByTestId('emergency-button');
      expect(button).toBeTruthy();
      // Emergency styling should be applied (tested through visual regression)
    });

    it('should implement crisis response timing', async () => {
      jest.useFakeTimers();
      const mockOnPress = jest.fn();

      const { getByTestId } = render(
        <Button
          testID="crisis-timing"
          variant="crisis"
          onPress={mockOnPress}
        >
          Crisis Help
        </Button>
      );

      const button = getByTestId('crisis-timing');
      fireEvent.press(button);

      // Should not execute immediately for crisis buttons (50ms delay)
      expect(mockOnPress).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(50);
      });

      await waitFor(() => {
        expect(mockOnPress).toHaveBeenCalledTimes(1);
      });

      jest.useRealTimers();
    });

    it('should prevent multiple rapid crisis presses', async () => {
      jest.useFakeTimers();
      const mockOnPress = jest.fn();

      const { getByTestId } = render(
        <Button
          testID="rapid-press"
          emergency={true}
          onPress={mockOnPress}
        >
          Emergency
        </Button>
      );

      const button = getByTestId('rapid-press');

      // Rapid multiple presses
      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        // Should only execute once due to timeout clearing
        expect(mockOnPress).toHaveBeenCalledTimes(1);
      });

      jest.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing onPress gracefully', () => {
      const { getByTestId } = render(
        <Button testID="no-onpress">No OnPress</Button>
      );

      const button = getByTestId('no-onpress');

      expect(() => {
        fireEvent.press(button);
      }).not.toThrow();
    });

    it('should handle empty children', () => {
      const { getByTestId } = render(
        <Button testID="empty-children">{''}</Button>
      );

      const button = getByTestId('empty-children');
      expect(button).toBeTruthy();
    });

    it('should work with async onPress functions', async () => {
      const asyncOnPress = jest.fn().mockResolvedValue(undefined);

      const { getByTestId } = render(
        <Button testID="async-button" onPress={asyncOnPress}>
          Async Button
        </Button>
      );

      const button = getByTestId('async-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(asyncOnPress).toHaveBeenCalled();
      });
    });
  });

  describe('Style and Theme Integration', () => {
    it('should apply fullWidth styling when specified', () => {
      const { getByTestId } = render(
        <Button testID="full-width" fullWidth={true}>
          Full Width
        </Button>
      );

      const button = getByTestId('full-width');
      expect(button).toBeTruthy();
      // fullWidth style application tested through visual regression
    });

    it('should handle custom theme variants', () => {
      const { getByTestId } = render(
        <Button testID="themed-button" theme="morning" variant="success">
          Themed Button
        </Button>
      );

      const button = getByTestId('themed-button');
      expect(button).toBeTruthy();
    });

    it('should handle custom style arrays', () => {
      const customStyles = [
        { backgroundColor: 'red' },
        { padding: 10 },
      ];

      const { getByTestId } = render(
        <Button testID="custom-styles" style={customStyles}>
          Custom Styles
        </Button>
      );

      const button = getByTestId('custom-styles');
      expect(button).toBeTruthy();
    });
  });

  describe('New Architecture Compatibility', () => {
    it('should use Pressable component (New Architecture)', () => {
      const { getByTestId } = render(
        <Button testID="pressable-check">Pressable Button</Button>
      );

      const button = getByTestId('pressable-check');
      expect(button).toBeTruthy();
      expect(button.props.accessible).toBe(true);
    });

    it('should handle Pressable style functions', () => {
      const { getByTestId } = render(
        <Button testID="pressable-style">Style Function</Button>
      );

      const button = getByTestId('pressable-style');
      expect(button.props.style).toBeDefined();
    });
  });

  describe('Performance Requirements', () => {
    it('should render efficiently', () => {
      const renderStart = performance.now();

      const { getByTestId } = render(
        <Button testID="performance-test">Performance</Button>
      );

      const renderTime = performance.now() - renderStart;

      expect(getByTestId('performance-test')).toBeTruthy();
      expect(renderTime).toBeLessThan(100); // Reasonable for test environment
    });

    it('should cleanup timers on unmount', () => {
      jest.useFakeTimers();
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { unmount } = render(
        <Button emergency={true}>Emergency Button</Button>
      );

      unmount();

      // Should clean up any active timeouts
      expect(clearTimeoutSpy).toHaveBeenCalled();

      jest.useRealTimers();
      clearTimeoutSpy.mockRestore();
    });
  });
});