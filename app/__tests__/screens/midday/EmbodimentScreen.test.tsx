/**
 * EMBODIMENT SCREEN TESTS
 *
 * Tests for 60-second breathing practice (original evidence-based).
 * Philosopher-validated (9.5/10) - aligns with Architecture v1.0.
 *
 * TDD Approach: Tests written first, screen implemented to pass tests.
 *
 * Screen Requirements:
 * - Display BreathingCircle component for EXACTLY 60 seconds
 * - 60fps animation performance (critical)
 * - After breathing: Rate breathing quality (1-10)
 * - After breathing: Describe body awareness
 * - Save to EmbodimentData with breathingDuration: 60 (constant)
 * - Navigate to MiddayCompletion screen
 *
 * Evidence-Based Retention:
 * - This practice is retained from original original evidence-based protocol
 * - 60-second breathing space for midday embodiment
 * - Combines with Stoic Mindfulness in broader flow
 *
 * Performance Critical:
 * - BreathingCircle must run at 60fps for therapeutic smoothness
 * - Timer must be precise (exactly 60 seconds, not 59 or 61)
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import EmbodimentScreen from '../../../src/flows/midday/screens/EmbodimentScreen';
import type { EmbodimentData } from '../../../src/types/flows';

// Mock BreathingCircle component
jest.mock('../../../src/flows/shared/components/BreathingCircle', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockBreathingCircle({ isActive, onCycleComplete, testID }: any) {
    return (
      <View testID={testID || 'breathing-circle'}>
        <Text>Breathing Circle</Text>
        <Text testID="breathing-active">{isActive ? 'Active' : 'Inactive'}</Text>
      </View>
    );
  };
});

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

describe('EmbodimentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Screen Rendering', () => {
    it('should render embodiment screen', () => {
      const { getByText } = render(
        <EmbodimentScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText(/embodiment/i)).toBeTruthy();
    });

    it('should show breathing circle initially', () => {
      const { getByTestId } = render(
        <EmbodimentScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('breathing-circle')).toBeTruthy();
    });

    it('should start breathing circle as active', () => {
      const { getByTestId } = render(
        <EmbodimentScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('breathing-active').props.children).toBe('Active');
    });
  });

  describe('60-Second Timer', () => {
    it('should run breathing for 60 seconds', async () => {
      const { getByTestId, queryByTestId } = render(
        <EmbodimentScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Initially breathing
      expect(getByTestId('breathing-circle')).toBeTruthy();
      expect(queryByTestId('quality-rating')).toBeNull();

      // Advance 60 seconds
      await act(async () => {
        jest.advanceTimersByTime(60000);
      });

      // Should now show quality rating
      expect(queryByTestId('quality-rating')).toBeTruthy();
    });

    it('should show timer progress', async () => {
      const { getByText } = render(
        <EmbodimentScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Should show initial time with "s" suffix
      expect(getByText('60s')).toBeTruthy();

      // Advance 30 seconds
      await act(async () => {
        jest.advanceTimersByTime(30000);
      });

      // Should show remaining time (approximately 30)
      expect(getByText('30s') || getByText('29s') || getByText('31s')).toBeTruthy();
    });
  });

  describe('Breathing Quality Rating', () => {
    it('should show quality rating after breathing completes', async () => {
      const { queryByTestId } = render(
        <EmbodimentScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Not visible initially
      expect(queryByTestId('quality-rating')).toBeNull();

      // Complete breathing
      await act(async () => {
        jest.advanceTimersByTime(60000);
      });

      // Now visible
      expect(queryByTestId('quality-rating')).toBeTruthy();
    });

    it('should show 1-10 quality options', async () => {
      const { getByTestId } = render(
        <EmbodimentScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Complete breathing
      await act(async () => {
        jest.advanceTimersByTime(60000);
      });

      // Check for all quality options
      for (let i = 1; i <= 10; i++) {
        expect(getByTestId(`quality-${i}`)).toBeTruthy();
      }
    });

    it('should allow selecting quality rating', async () => {
      const { getByTestId } = render(
        <EmbodimentScreen navigation={mockNavigation as any} route={{} as any} />
      );

      await act(async () => {
        jest.advanceTimersByTime(60000);
      });

      const quality7Button = getByTestId('quality-7');
      fireEvent.press(quality7Button);

      expect(quality7Button.props.accessibilityState.selected).toBe(true);
    });

    it('should default to mid-range quality (5)', async () => {
      const { getByTestId } = render(
        <EmbodimentScreen navigation={mockNavigation as any} route={{} as any} />
      );

      await act(async () => {
        jest.advanceTimersByTime(60000);
      });

      const quality5Button = getByTestId('quality-5');
      expect(quality5Button.props.accessibilityState.selected).toBe(true);
    });
  });

  describe('Body Awareness Input', () => {
    it('should show body awareness input after breathing', async () => {
      const { getByTestId } = render(
        <EmbodimentScreen navigation={mockNavigation as any} route={{} as any} />
      );

      await act(async () => {
        jest.advanceTimersByTime(60000);
      });

      expect(getByTestId('body-awareness-input')).toBeTruthy();
    });

    it('should allow entering body awareness', async () => {
      const { getByTestId } = render(
        <EmbodimentScreen navigation={mockNavigation as any} route={{} as any} />
      );

      await act(async () => {
        jest.advanceTimersByTime(60000);
      });

      const input = getByTestId('body-awareness-input');
      fireEvent.changeText(input, 'Tension in shoulders, calm breath');

      expect(input.props.value).toBe('Tension in shoulders, calm breath');
    });

    it('should require body awareness input', async () => {
      const { getByTestId, getByText } = render(
        <EmbodimentScreen navigation={mockNavigation as any} route={{} as any} />
      );

      await act(async () => {
        jest.advanceTimersByTime(60000);
      });

      // Don't fill body awareness
      fireEvent.press(getByText(/continue/i));

      // Should not navigate without body awareness
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Data Persistence', () => {
    it('should save embodiment data on continue', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <EmbodimentScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      await act(async () => {
        jest.advanceTimersByTime(60000);
      });

      fireEvent.press(getByTestId('quality-8'));
      fireEvent.changeText(
        getByTestId('body-awareness-input'),
        'Relaxed, centered, present'
      );

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            breathingDuration: 60, // Constant value
            breathingQuality: 8,
            bodyAwareness: 'Relaxed, centered, present',
            timestamp: expect.any(Date),
          })
        );
      });
    });

    it('should save with exactly 60 for breathingDuration', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <EmbodimentScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      await act(async () => {
        jest.advanceTimersByTime(60000);
      });

      fireEvent.press(getByTestId('quality-5'));
      fireEvent.changeText(getByTestId('body-awareness-input'), 'Present');

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            breathingDuration: 60, // Must be exactly 60, not a variable
          })
        );
      });
    });

    it('should trim whitespace from body awareness', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <EmbodimentScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      await act(async () => {
        jest.advanceTimersByTime(60000);
      });

      fireEvent.changeText(getByTestId('body-awareness-input'), '  Calm and present  ');

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            bodyAwareness: 'Calm and present',
          })
        );
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to midday completion on continue', async () => {
      const { getByTestId, getByText } = render(
        <EmbodimentScreen navigation={mockNavigation as any} route={{} as any} />
      );

      await act(async () => {
        jest.advanceTimersByTime(60000);
      });

      fireEvent.press(getByTestId('quality-7'));
      fireEvent.changeText(getByTestId('body-awareness-input'), 'Present');

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('MiddayCompletion');
      });
    });

    it('should allow going back during breathing', () => {
      const { getByTestId } = render(
        <EmbodimentScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('back-button'));
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for inputs', async () => {
      const { getByTestId } = render(
        <EmbodimentScreen navigation={mockNavigation as any} route={{} as any} />
      );

      await act(async () => {
        jest.advanceTimersByTime(60000);
      });

      expect(getByTestId('body-awareness-input').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('quality-5').props.accessibilityLabel).toBeTruthy();
    });
  });

  describe('Validation', () => {
    it('should require body awareness before continuing', async () => {
      const { getByText } = render(
        <EmbodimentScreen navigation={mockNavigation as any} route={{} as any} />
      );

      await act(async () => {
        jest.advanceTimersByTime(60000);
      });

      // Don't fill body awareness
      fireEvent.press(getByText(/continue/i));

      // Should not navigate
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not allow continuing during breathing', () => {
      const { queryByText } = render(
        <EmbodimentScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Continue button should not be visible during breathing
      expect(queryByText(/continue/i)).toBeNull();
    });
  });
});
