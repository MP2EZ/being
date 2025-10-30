/**
 * PHYSICAL METRICS SCREEN TESTS
 *
 * Tests for retained MBCT physical metrics baseline screen.
 * Retained from original Being MBCT flow (not Stoic-specific).
 *
 * TDD Approach: Tests written first, screen implemented to pass tests.
 *
 * Screen Requirements:
 * - Sleep hours (0-24)
 * - Exercise minutes (0-300)
 * - Meals eaten (0-5)
 * - Optional notes field
 * - Save to StoicMorningFlowData.physicalMetrics
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md (MBCT integration)
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import PhysicalMetricsScreen from '../../../src/flows/morning/screens/PhysicalMetricsScreen';
import type { PhysicalMetricsData } from '../../../src/types/flows';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

describe('PhysicalMetricsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Screen Rendering', () => {
    it('should render physical metrics screen', () => {
      const { getByText } = render(
        <PhysicalMetricsScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText(/physical metrics/i)).toBeTruthy();
      expect(getByText(/baseline check-in/i)).toBeTruthy();
    });

    it('should show all metric inputs', () => {
      const { getByTestId } = render(
        <PhysicalMetricsScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('sleep-hours')).toBeTruthy();
      expect(getByTestId('exercise-minutes')).toBeTruthy();
      expect(getByTestId('meals-count')).toBeTruthy();
    });
  });

  describe('Sleep Hours Input', () => {
    it('should allow setting sleep hours from 0-24', () => {
      const { getByLabelText } = render(
        <PhysicalMetricsScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const sleepButton = getByLabelText('Set sleep hours to 7');
      fireEvent.press(sleepButton);

      // Should be selected (implementation validates)
      expect(sleepButton).toBeTruthy();
    });

    it('should default to 7 hours', () => {
      const { getByText } = render(
        <PhysicalMetricsScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('7 hours')).toBeTruthy();
    });
  });

  describe('Exercise Minutes Input', () => {
    it('should allow setting exercise minutes', () => {
      const { getByLabelText } = render(
        <PhysicalMetricsScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const exerciseButton = getByLabelText('Set exercise to 30 minutes');
      fireEvent.press(exerciseButton);

      expect(exerciseButton).toBeTruthy();
    });

    it('should default to 0 minutes', () => {
      const { getByText } = render(
        <PhysicalMetricsScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('0 minutes')).toBeTruthy();
    });
  });

  describe('Meals Count Input', () => {
    it('should allow setting meals from 0-5', () => {
      const { getByLabelText } = render(
        <PhysicalMetricsScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const mealsButton = getByLabelText('Set meals to 3');
      fireEvent.press(mealsButton);

      expect(mealsButton).toBeTruthy();
    });

    it('should default to 3 meals', () => {
      const { getByText } = render(
        <PhysicalMetricsScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('3 meals')).toBeTruthy();
    });
  });

  describe('Notes Field', () => {
    it('should have optional notes field', () => {
      const { getByTestId } = render(
        <PhysicalMetricsScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const notesInput = getByTestId('metrics-notes');
      fireEvent.changeText(notesInput, 'Slept well, low energy');

      expect(notesInput.props.value).toBe('Slept well, low energy');
    });

    it('should NOT require notes (optional)', async () => {
      const onSave = jest.fn();
      const { getByText } = render(
        <PhysicalMetricsScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            notes: undefined,
          })
        );
      });
    });
  });

  describe('Data Persistence', () => {
    it('should save physical metrics on continue', async () => {
      const onSave = jest.fn();
      const { getByLabelText, getByText } = render(
        <PhysicalMetricsScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.press(getByLabelText('Set sleep hours to 8'));
      fireEvent.press(getByLabelText('Set exercise to 30 minutes'));
      fireEvent.press(getByLabelText('Set meals to 3'));

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            sleepHours: 8,
            exerciseMinutes: 30,
            mealsCount: 3,
            timestamp: expect.any(Date),
          })
        );
      });
    });

    it('should save with notes', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <PhysicalMetricsScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.changeText(getByTestId('metrics-notes'), 'Good rest');
      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            notes: 'Good rest',
          })
        );
      });
    });

    it('should trim whitespace from notes', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <PhysicalMetricsScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.changeText(getByTestId('metrics-notes'), '  Good rest  ');
      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            notes: 'Good rest',
          })
        );
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to completion screen on continue', async () => {
      const { getByText } = render(
        <PhysicalMetricsScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('MorningCompletion');
      });
    });

    it('should allow going back', () => {
      const { getByTestId } = render(
        <PhysicalMetricsScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('back-button'));
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for all inputs', () => {
      const { getByTestId } = render(
        <PhysicalMetricsScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('sleep-hours').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('exercise-minutes').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('meals-count').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('metrics-notes').props.accessibilityLabel).toBeTruthy();
    });
  });

  describe('Validation', () => {
    it('should allow proceeding with default values', async () => {
      const onSave = jest.fn();
      const { getByText } = render(
        <PhysicalMetricsScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('MorningCompletion');
      });
    });
  });
});
