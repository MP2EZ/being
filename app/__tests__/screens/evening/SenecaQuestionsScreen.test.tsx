/**
 * SENECA QUESTIONS SCREEN TESTS
 *
 * Tests for Seneca's three evening examination questions.
 * Philosopher-validated (9.5/10) - aligns with Architecture v1.0.
 *
 * TDD Approach: Tests written first, screen implemented to pass tests.
 *
 * Screen Requirements:
 * - Display Seneca's three evening questions
 * - Capture answers to all three questions (all required)
 * - Questions are:
 *   1. What vice did I resist today?
 *   2. What habit did I improve today?
 *   3. How am I better today than yesterday?
 * - Navigate to Gratitude screen
 *
 * Classical Stoic Practice:
 * - Seneca: "What infirmity have I mastered today? What passions opposed? What
 *   temptation resisted? In what respect am I better?" (Letters 28:10)
 * - Marcus Aurelius: "At evening, ask yourself: did I master myself today? Did
 *   I progress in character?" (Meditations 5:1)
 *
 * Purpose: Seneca's evening examination focuses on growth and progress. These
 * three questions guide daily self-improvement and virtue development.
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SenecaQuestionsScreen from '../../../src/flows/evening/screens/SenecaQuestionsScreen';
import type { SenecaQuestionsData } from '../../../src/types/flows';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

describe('SenecaQuestionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Screen Rendering', () => {
    it('should render Seneca questions screen', () => {
      const { queryAllByText } = render(
        <SenecaQuestionsScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const senecaMatches = queryAllByText(/Seneca/i);
      const questionsMatches = queryAllByText(/questions/i);

      expect(senecaMatches.length > 0 || questionsMatches.length > 0).toBe(true);
    });

    it('should show all three questions', () => {
      const { getByText } = render(
        <SenecaQuestionsScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText(/vice.*resist/i)).toBeTruthy();
      expect(getByText(/habit.*improve/i)).toBeTruthy();
      expect(getByText(/better.*today/i)).toBeTruthy();
    });
  });

  describe('Question 1: Vice Resisted', () => {
    it('should show vice resisted input', () => {
      const { getByTestId } = render(
        <SenecaQuestionsScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('vice-input')).toBeTruthy();
    });

    it('should allow entering vice resisted', () => {
      const { getByTestId } = render(
        <SenecaQuestionsScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const input = getByTestId('vice-input');
      fireEvent.changeText(input, 'Resisted impulse to interrupt others');

      expect(input.props.value).toBe('Resisted impulse to interrupt others');
    });

    it('should require vice resisted answer', () => {
      const { getByTestId, getAllByText } = render(
        <SenecaQuestionsScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Fill other questions but not this one
      fireEvent.changeText(getByTestId('habit-input'), 'Habit');
      fireEvent.changeText(getByTestId('better-input'), 'Better');

      // Get continue button (first match is the button text)
      const continueElements = getAllByText(/continue/i);
      fireEvent.press(continueElements[0]);

      // Should not navigate without all answers
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Question 2: Habit Improved', () => {
    it('should show habit improved input', () => {
      const { getByTestId } = render(
        <SenecaQuestionsScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('habit-input')).toBeTruthy();
    });

    it('should allow entering habit improved', () => {
      const { getByTestId } = render(
        <SenecaQuestionsScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const input = getByTestId('habit-input');
      fireEvent.changeText(input, 'Practiced morning meditation consistently');

      expect(input.props.value).toBe('Practiced morning meditation consistently');
    });

    it('should require habit improved answer', () => {
      const { getByTestId, getAllByText } = render(
        <SenecaQuestionsScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.changeText(getByTestId('vice-input'), 'Vice');
      // Don't fill this one
      fireEvent.changeText(getByTestId('better-input'), 'Better');

      const continueElements = getAllByText(/continue/i);
      fireEvent.press(continueElements[0]);

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Question 3: How Better', () => {
    it('should show how better input', () => {
      const { getByTestId } = render(
        <SenecaQuestionsScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('better-input')).toBeTruthy();
    });

    it('should allow entering how better', () => {
      const { getByTestId } = render(
        <SenecaQuestionsScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const input = getByTestId('better-input');
      fireEvent.changeText(input, 'More patient with family');

      expect(input.props.value).toBe('More patient with family');
    });

    it('should require how better answer', () => {
      const { getByTestId, getAllByText } = render(
        <SenecaQuestionsScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.changeText(getByTestId('vice-input'), 'Vice');
      fireEvent.changeText(getByTestId('habit-input'), 'Habit');
      // Don't fill this one

      const continueElements = getAllByText(/continue/i);
      fireEvent.press(continueElements[0]);

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Data Persistence', () => {
    it('should save answers on continue', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <SenecaQuestionsScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.changeText(getByTestId('vice-input'), 'Resisted anger');
      fireEvent.changeText(getByTestId('habit-input'), 'Improved patience');
      fireEvent.changeText(getByTestId('better-input'), 'More compassionate');

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            whatViceDidIResist: 'Resisted anger',
            whatHabitDidIImprove: 'Improved patience',
            howAmIBetterToday: 'More compassionate',
            timestamp: expect.any(Date),
          })
        );
      });
    });

    it('should trim whitespace from answers', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <SenecaQuestionsScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.changeText(getByTestId('vice-input'), '  Vice  ');
      fireEvent.changeText(getByTestId('habit-input'), '  Habit  ');
      fireEvent.changeText(getByTestId('better-input'), '  Better  ');

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            whatViceDidIResist: 'Vice',
            whatHabitDidIImprove: 'Habit',
            howAmIBetterToday: 'Better',
          })
        );
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to gratitude on continue', async () => {
      const { getByTestId, getByText } = render(
        <SenecaQuestionsScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.changeText(getByTestId('vice-input'), 'Vice');
      fireEvent.changeText(getByTestId('habit-input'), 'Habit');
      fireEvent.changeText(getByTestId('better-input'), 'Better');

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Gratitude');
      });
    });

    it('should allow going back', () => {
      const { getByTestId } = render(
        <SenecaQuestionsScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('back-button'));
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for all inputs', () => {
      const { getByTestId } = render(
        <SenecaQuestionsScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('vice-input').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('habit-input').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('better-input').props.accessibilityLabel).toBeTruthy();
    });
  });

  describe('Validation', () => {
    it('should require all three answers', () => {
      const { getAllByText } = render(
        <SenecaQuestionsScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Don't fill any questions
      const continueElements = getAllByText(/continue/i);
      fireEvent.press(continueElements[0]);

      // Should not navigate
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Stoic Guidance', () => {
    it('should show Seneca quote about examination', () => {
      const { queryAllByText } = render(
        <SenecaQuestionsScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const senecaMatches = queryAllByText(/Seneca/i);
      const infirmityMatches = queryAllByText(/infirmity/i);
      const masteredMatches = queryAllByText(/mastered/i);

      expect(
        senecaMatches.length > 0 || infirmityMatches.length > 0 || masteredMatches.length > 0
      ).toBe(true);
    });
  });
});
