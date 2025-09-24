/**
 * New Architecture Button Performance Tests
 *
 * CRITICAL: Validates <200ms crisis response requirement
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { NewArchButton } from '../NewArchButton';
import { CrisisButtonV2 } from '../CrisisButtonV2';

describe('NewArchButton Performance', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should respond to crisis button press within 200ms', async () => {
    const mockOnPress = jest.fn();
    const startTime = Date.now();

    const { getByTestId } = render(
      <NewArchButton
        emergency={true}
        onPress={mockOnPress}
        testID="crisis-test-button"
      >
        988
      </NewArchButton>
    );

    const button = getByTestId('crisis-test-button');

    act(() => {
      fireEvent.press(button);
    });

    const responseTime = Date.now() - startTime;

    expect(mockOnPress).toHaveBeenCalled();
    expect(responseTime).toBeLessThan(200);
  });

  it('should provide immediate haptic feedback on pressIn', () => {
    const { getByTestId } = render(
      <NewArchButton
        emergency={true}
        haptic={true}
        testID="haptic-test-button"
      >
        Emergency
      </NewArchButton>
    );

    const button = getByTestId('haptic-test-button');

    // Test immediate response to pressIn
    const startTime = performance.now();

    act(() => {
      fireEvent(button, 'pressIn');
    });

    const pressInTime = performance.now() - startTime;
    expect(pressInTime).toBeLessThan(50); // Sub-50ms haptic response
  });

  it('should maintain accessibility during high-frequency interactions', () => {
    const { getByTestId } = render(
      <CrisisButtonV2
        variant="floating"
        urgencyLevel="emergency"
        testID="accessibility-stress-test"
      />
    );

    const button = getByTestId('accessibility-stress-test');

    // Rapid interaction stress test
    for (let i = 0; i < 10; i++) {
      act(() => {
        fireEvent(button, 'pressIn');
        fireEvent(button, 'pressOut');
      });
    }

    // Verify accessibility attributes remain intact
    expect(button.props.accessibilityLabel).toContain('EMERGENCY');
    expect(button.props.accessibilityRole).toBe('button');
  });

  it('should handle New Architecture property access without conflicts', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(
      <NewArchButton variant="crisis" emergency={true}>
        Test Crisis Button
      </NewArchButton>
    );

    // Verify no property descriptor errors
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('property')
    );

    consoleSpy.mockRestore();
  });
});

describe('CrisisButtonV2 Performance', () => {
  it('should track and log crisis response timing', async () => {
    const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
    const mockLinking = {
      openURL: jest.fn().mockResolvedValue(true)
    };

    // Mock Linking for test environment
    jest.doMock('react-native', () => ({
      ...jest.requireActual('react-native'),
      Linking: mockLinking
    }));

    const { getByTestId } = render(
      <CrisisButtonV2
        variant="floating"
        urgencyLevel="emergency"
        testID="timing-test-button"
      />
    );

    const button = getByTestId('timing-test-button');

    await act(async () => {
      fireEvent.press(button);
    });

    // Verify performance logging
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Crisis call initiated in')
    );

    consoleSpy.mockRestore();
  });
});