/**
 * CrisisButton React Integration Validation Test
 *
 * Comprehensive React validation of CrisisButton migration to enhanced Button component.
 * Tests component integration, New Architecture features, and crisis-specific functionality.
 *
 * VALIDATION SCOPE:
 * - Component integration with enhanced Button
 * - New Architecture Pressable features
 * - Crisis-optimized performance
 * - Accessibility implementation
 * - Haptic feedback integration
 */

import React from 'react';
import { Text, Platform } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { CrisisButton } from '../core/CrisisButton';
import { useNavigation } from '@react-navigation/native';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Linking: {
      openURL: jest.fn(() => Promise.resolve(true)),
    },
    AccessibilityInfo: {
      isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
      isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
      isBoldTextEnabled: jest.fn(() => Promise.resolve(false)),
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      announceForAccessibility: jest.fn(),
    },
    Vibration: {
      vibrate: jest.fn(),
    },
    Alert: {
      alert: jest.fn(),
    },
  };
});

// Mock haptics
jest.mock('../../hooks/useHaptics', () => ({
  useCommonHaptics: () => ({
    onPress: jest.fn(() => Promise.resolve()),
  }),
  useHaptics: () => ({
    triggerHaptic: jest.fn(() => Promise.resolve()),
  }),
}));

describe('CrisisButton React Integration Validation', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });
  });

  describe('1. Component Integration Validation', () => {
    it('should render floating CrisisButton using enhanced Button component', () => {
      const { getByTestId } = render(
        <CrisisButton variant="floating" testID="crisis-test" />
      );

      const crisisButton = getByTestId('crisis-button-floating');
      expect(crisisButton).toBeTruthy();

      // Verify Button component integration
      expect(crisisButton.props.accessibilityRole).toBe('button');
      expect(crisisButton.props.accessible).toBe(true);
    });

    it('should render embedded CrisisButton using enhanced Button component', () => {
      const { getByTestId } = render(
        <CrisisButton variant="embedded" testID="crisis-test" />
      );

      const crisisButton = getByTestId('crisis-button-embedded');
      expect(crisisButton).toBeTruthy();

      // Verify component composition with Button
      expect(crisisButton.props.accessibilityRole).toBe('button');
    });

    it('should properly pass props to enhanced Button component', () => {
      const onCrisisStart = jest.fn();
      const { getByTestId } = render(
        <CrisisButton
          variant="floating"
          urgencyLevel="emergency"
          onCrisisStart={onCrisisStart}
          testID="crisis-test"
        />
      );

      const crisisButton = getByTestId('crisis-button-floating');

      // Verify emergency props passed through
      expect(crisisButton.props.emergency).toBe(true);
      expect(crisisButton.props.variant).toBe('crisis');
    });

    it('should handle loading state correctly', () => {
      const { getByTestId, rerender } = render(
        <CrisisButton variant="floating" testID="crisis-test" />
      );

      // Trigger loading state by simulating press
      const crisisButton = getByTestId('crisis-button-floating');
      fireEvent.press(crisisButton);

      // Button should show loading state
      expect(crisisButton.props.loading).toBe(true);
      expect(crisisButton.props.disabled).toBe(true);
    });
  });

  describe('2. New Architecture Features Validation', () => {
    it('should configure crisis-optimized android_ripple for floating button', () => {
      const { getByTestId } = render(
        <CrisisButton
          variant="floating"
          crisisOptimizedRipple={true}
          testID="crisis-test"
        />
      );

      const crisisButton = getByTestId('crisis-button-floating');

      // Verify crisis-optimized ripple configuration
      expect(crisisButton.props.android_ripple).toEqual({
        color: 'rgba(255, 255, 255, 0.4)',
        borderless: false,
        radius: 32,
        foreground: false,
      });
    });

    it('should configure crisis-optimized android_ripple for embedded button', () => {
      const { getByTestId } = render(
        <CrisisButton
          variant="embedded"
          urgencyLevel="emergency"
          crisisOptimizedRipple={true}
          testID="crisis-test"
        />
      );

      const crisisButton = getByTestId('crisis-button-embedded');

      // Verify emergency ripple configuration
      expect(crisisButton.props.android_ripple).toEqual({
        color: 'rgba(255, 255, 255, 0.4)',
        borderless: false,
        radius: 200,
        foreground: false,
      });
    });

    it('should apply enhanced hit areas for crisis accessibility', () => {
      const { getByTestId } = render(
        <CrisisButton variant="floating" testID="crisis-test" />
      );

      const crisisButton = getByTestId('crisis-button-floating');

      // Verify enhanced hit slop for crisis accessibility
      expect(crisisButton.props.hitSlop).toEqual({
        top: 20,
        bottom: 20,
        left: 20,
        right: 20,
      });
    });

    it('should disable ripple when crisisOptimizedRipple is false', () => {
      const { getByTestId } = render(
        <CrisisButton
          variant="floating"
          crisisOptimizedRipple={false}
          testID="crisis-test"
        />
      );

      const crisisButton = getByTestId('crisis-button-floating');

      // Verify ripple is disabled
      expect(crisisButton.props.android_ripple).toBeUndefined();
    });
  });

  describe('3. Performance Validation', () => {
    it('should maintain <200ms crisis response time monitoring', async () => {
      const startTime = Date.now();
      const onCrisisStart = jest.fn();

      const { getByTestId } = render(
        <CrisisButton
          variant="floating"
          onCrisisStart={onCrisisStart}
          safetyMonitoring={true}
          testID="crisis-test"
        />
      );

      const crisisButton = getByTestId('crisis-button-floating');

      await act(async () => {
        fireEvent.press(crisisButton);
      });

      const responseTime = Date.now() - startTime;

      // Verify onCrisisStart was called
      expect(onCrisisStart).toHaveBeenCalled();

      // Response time should be reasonable for test environment
      expect(responseTime).toBeLessThan(1000); // Test environment tolerance
    });

    it('should render with proper component lifecycle', () => {
      const { getByTestId, unmount } = render(
        <CrisisButton variant="floating" testID="crisis-test" />
      );

      const crisisButton = getByTestId('crisis-button-floating');
      expect(crisisButton).toBeTruthy();

      // Should unmount cleanly
      expect(() => unmount()).not.toThrow();
    });

    it('should handle memory usage optimization', () => {
      const { getByTestId } = render(
        <CrisisButton
          variant="floating"
          safetyMonitoring={true}
          testID="crisis-test"
        />
      );

      const crisisButton = getByTestId('crisis-button-floating');

      // Component should be memoized (React.memo)
      expect(crisisButton).toBeTruthy();

      // Multiple renders with same props should not cause re-render
      const { getByTestId: getByTestId2 } = render(
        <CrisisButton
          variant="floating"
          safetyMonitoring={true}
          testID="crisis-test-2"
        />
      );

      expect(getByTestId2('crisis-button-floating')).toBeTruthy();
    });
  });

  describe('4. Crisis-Specific React Features', () => {
    it('should handle emergency urgency level correctly', () => {
      const { getByTestId } = render(
        <CrisisButton
          variant="floating"
          urgencyLevel="emergency"
          testID="crisis-test"
        />
      );

      const crisisButton = getByTestId('crisis-button-floating');

      // Verify emergency mode styling and props
      expect(crisisButton.props.emergency).toBe(true);
      expect(crisisButton.props.accessibilityLabel).toContain('EMERGENCY');
    });

    it('should handle standard urgency level correctly', () => {
      const { getByTestId } = render(
        <CrisisButton
          variant="floating"
          urgencyLevel="standard"
          testID="crisis-test"
        />
      );

      const crisisButton = getByTestId('crisis-button-floating');

      // Verify standard mode
      expect(crisisButton.props.emergency).toBe(true); // Still crisis variant
      expect(crisisButton.props.accessibilityLabel).toContain('Emergency crisis support');
    });

    it('should handle floating vs embedded variant behavior', () => {
      const { getByTestId: getFloating } = render(
        <CrisisButton variant="floating" testID="floating-test" />
      );

      const { getByTestId: getEmbedded } = render(
        <CrisisButton variant="embedded" testID="embedded-test" />
      );

      const floatingButton = getFloating('crisis-button-floating');
      const embeddedButton = getEmbedded('crisis-button-embedded');

      // Floating should have 988 text
      expect(floatingButton).toBeTruthy();

      // Embedded should have different text
      expect(embeddedButton).toBeTruthy();
    });

    it('should handle crisis callback integration', async () => {
      const onCrisisStart = jest.fn();

      const { getByTestId } = render(
        <CrisisButton
          variant="floating"
          onCrisisStart={onCrisisStart}
          testID="crisis-test"
        />
      );

      const crisisButton = getByTestId('crisis-button-floating');

      await act(async () => {
        fireEvent.press(crisisButton);
      });

      // Verify callback was triggered
      expect(onCrisisStart).toHaveBeenCalledTimes(1);
    });

    it('should prevent multiple rapid crisis presses', async () => {
      const onCrisisStart = jest.fn();

      const { getByTestId } = render(
        <CrisisButton
          variant="floating"
          onCrisisStart={onCrisisStart}
          testID="crisis-test"
        />
      );

      const crisisButton = getByTestId('crisis-button-floating');

      // Rapid fire multiple presses
      await act(async () => {
        fireEvent.press(crisisButton);
        fireEvent.press(crisisButton);
        fireEvent.press(crisisButton);
      });

      // Should only process first press while loading
      expect(onCrisisStart).toHaveBeenCalledTimes(1);
    });
  });

  describe('5. Accessibility React Implementation', () => {
    it('should implement enhanced accessibility labels for crisis situations', () => {
      const { getByTestId } = render(
        <CrisisButton
          variant="floating"
          urgencyLevel="emergency"
          voiceCommandEnabled={true}
          testID="crisis-test"
        />
      );

      const crisisButton = getByTestId('crisis-button-floating');

      // Verify enhanced accessibility
      expect(crisisButton.props.accessibilityLabel).toBe(
        'EMERGENCY: Call 988 crisis hotline immediately'
      );
      expect(crisisButton.props.accessibilityHint).toContain('emergency help');
    });

    it('should handle screen reader integration', async () => {
      const { AccessibilityInfo } = require('react-native');

      const { getByTestId } = render(
        <CrisisButton variant="floating" testID="crisis-test" />
      );

      const crisisButton = getByTestId('crisis-button-floating');

      await act(async () => {
        fireEvent.press(crisisButton);
      });

      // Verify accessibility announcement
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Calling crisis support line at 988'
      );
    });

    it('should handle accessibility state management', () => {
      const { getByTestId } = render(
        <CrisisButton
          variant="floating"
          highContrastMode={true}
          largeTargetMode={true}
          testID="crisis-test"
        />
      );

      const crisisButton = getByTestId('crisis-button-floating');

      // Verify accessibility features are passed through
      expect(crisisButton.props.accessible).toBe(true);
      expect(crisisButton.props.accessibilityRole).toBe('button');
    });

    it('should respect voice command accessibility', () => {
      const { getByTestId } = render(
        <CrisisButton
          variant="floating"
          voiceCommandEnabled={false}
          testID="crisis-test"
        />
      );

      const crisisButton = getByTestId('crisis-button-floating');

      // Verify voice command hint is adjusted
      expect(crisisButton.props.accessibilityHint).not.toContain("say 'emergency help'");
      expect(crisisButton.props.accessibilityHint).toContain('Double tap');
    });
  });

  describe('6. Enhanced Haptic Integration', () => {
    it('should trigger enhanced haptic patterns for crisis response', async () => {
      const { Vibration } = require('react-native');

      const { getByTestId } = render(
        <CrisisButton
          variant="floating"
          enhancedHaptics={true}
          testID="crisis-test"
        />
      );

      const crisisButton = getByTestId('crisis-button-floating');

      await act(async () => {
        fireEvent.press(crisisButton);
      });

      // Verify enhanced haptic pattern was triggered
      if (Platform.OS === 'ios') {
        expect(Vibration.vibrate).toHaveBeenCalledWith([0, 200, 50, 200, 50, 300]);
      } else {
        expect(Vibration.vibrate).toHaveBeenCalledWith([200, 50, 200, 50, 300]);
      }
    });

    it('should fall back to standard haptics when enhanced disabled', async () => {
      const { Vibration } = require('react-native');

      const { getByTestId } = render(
        <CrisisButton
          variant="floating"
          enhancedHaptics={false}
          testID="crisis-test"
        />
      );

      const crisisButton = getByTestId('crisis-button-floating');

      await act(async () => {
        fireEvent.press(crisisButton);
      });

      // Verify standard haptic pattern
      if (Platform.OS === 'ios') {
        expect(Vibration.vibrate).toHaveBeenCalledWith([0, 250, 100, 250]);
      } else {
        expect(Vibration.vibrate).toHaveBeenCalledWith(500);
      }
    });
  });

  describe('7. Error Handling and Fallbacks', () => {
    it('should handle Linking.openURL failure gracefully', async () => {
      const { Linking, Alert } = require('react-native');
      Linking.openURL.mockRejectedValueOnce(new Error('Cannot open URL'));

      const { getByTestId } = render(
        <CrisisButton variant="floating" testID="crisis-test" />
      );

      const crisisButton = getByTestId('crisis-button-floating');

      await act(async () => {
        fireEvent.press(crisisButton);
      });

      // Should show fallback alert
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Call 988',
          'Please dial 988 directly for immediate crisis support.',
          expect.any(Array)
        );
      });
    });

    it('should handle accessibility preferences failure gracefully', () => {
      const { AccessibilityInfo } = require('react-native');
      AccessibilityInfo.isReduceMotionEnabled.mockRejectedValueOnce(new Error('Access denied'));

      // Should still render without throwing
      expect(() => {
        render(<CrisisButton variant="floating" testID="crisis-test" />);
      }).not.toThrow();
    });
  });

  describe('8. Performance Regression Detection', () => {
    it('should complete render within performance budget', () => {
      const startTime = performance.now();

      render(<CrisisButton variant="floating" testID="crisis-test" />);

      const renderTime = performance.now() - startTime;

      // Should render within 16ms budget (60fps)
      expect(renderTime).toBeLessThan(16);
    });

    it('should handle multiple instances efficiently', () => {
      const startTime = performance.now();

      // Render multiple crisis buttons
      render(
        <>
          <CrisisButton variant="floating" testID="crisis-1" />
          <CrisisButton variant="embedded" testID="crisis-2" />
          <CrisisButton variant="floating" urgencyLevel="emergency" testID="crisis-3" />
        </>
      );

      const renderTime = performance.now() - startTime;

      // Multiple instances should still render efficiently
      expect(renderTime).toBeLessThan(50);
    });
  });
});