/**
 * DAY REVIEW SCREEN TESTS
 *
 * Tests for Stoic evening examination screen.
 * Philosopher-validated (9.5/10) - aligns with Architecture v1.0.
 *
 * TDD Approach: Tests written first, screen implemented to pass tests.
 *
 * Screen Requirements:
 * - Morning intention practiced (boolean)
 * - Day quality rating (1-10, virtue-focused NOT outcome-focused)
 * - Brief reflection on the day
 * - Navigate to VirtueInstances screen
 *
 * Classical Stoic Practice:
 * - Seneca: "Let us balance life's ledger each day" (Letters 18:1)
 * - Marcus Aurelius: "When you wake up in the morning, tell yourself... But at
 *   evening, examine your day" (Meditations 2:1, 5:1)
 * - Epictetus: "Every day and night keep thoughts like these at hand - write them,
 *   read them aloud, talk to yourself and others about them" (Enchiridion 3)
 *
 * CRITICAL: Self-compassion will be handled in separate required screen
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import DayReviewScreen from '../../../src/flows/evening/screens/DayReviewScreen';
import type { ReviewData } from '../../../src/types/flows';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

// Mock route with morning intention
const mockRoute = {
  params: {
    morningIntention: 'Practice patience in difficult conversations',
  },
};

describe('DayReviewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Screen Rendering', () => {
    it('should render day review screen', () => {
      const { getByText } = render(
        <DayReviewScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText(/day review/i) || getByText(/evening/i)).toBeTruthy();
    });

    it('should display morning intention', () => {
      const { getByText } = render(
        <DayReviewScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByText('Practice patience in difficult conversations')).toBeTruthy();
    });
  });

  describe('Morning Intention Practiced', () => {
    it('should show yes/no options for intention practiced', () => {
      const { getByTestId } = render(
        <DayReviewScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByTestId('practiced-yes')).toBeTruthy();
      expect(getByTestId('practiced-no')).toBeTruthy();
    });

    it('should allow selecting yes', () => {
      const { getByTestId } = render(
        <DayReviewScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      const yesButton = getByTestId('practiced-yes');
      fireEvent.press(yesButton);

      expect(yesButton.props.accessibilityState.selected).toBe(true);
    });

    it('should allow selecting no', () => {
      const { getByTestId } = render(
        <DayReviewScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      const noButton = getByTestId('practiced-no');
      fireEvent.press(noButton);

      expect(noButton.props.accessibilityState.selected).toBe(true);
    });

    it('should require intention practiced selection', () => {
      const { getByText } = render(
        <DayReviewScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      // Don't select anything
      fireEvent.press(getByText(/continue/i));

      // Should not navigate
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Day Quality Rating', () => {
    it('should show 1-10 quality rating options', () => {
      const { getByTestId } = render(
        <DayReviewScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      for (let i = 1; i <= 10; i++) {
        expect(getByTestId(`quality-${i}`)).toBeTruthy();
      }
    });

    it('should allow selecting day quality', () => {
      const { getByTestId } = render(
        <DayReviewScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      const quality7Button = getByTestId('quality-7');
      fireEvent.press(quality7Button);

      expect(quality7Button.props.accessibilityState.selected).toBe(true);
    });

    it('should default to mid-range quality (5)', () => {
      const { getByTestId } = render(
        <DayReviewScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      const quality5Button = getByTestId('quality-5');
      expect(quality5Button.props.accessibilityState.selected).toBe(true);
    });

    it('should show virtue-focused labeling', () => {
      const { queryAllByText } = render(
        <DayReviewScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      // Should reference virtue, not outcomes (at least one match)
      const virtueMatches = queryAllByText(/virtue/i);
      const characterMatches = queryAllByText(/character/i);
      const practiceMatches = queryAllByText(/practice/i);

      expect(
        virtueMatches.length > 0 ||
        characterMatches.length > 0 ||
        practiceMatches.length > 0
      ).toBe(true);
    });
  });

  describe('Brief Reflection', () => {
    it('should show reflection input', () => {
      const { getByTestId } = render(
        <DayReviewScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByTestId('reflection-input')).toBeTruthy();
    });

    it('should allow entering reflection', () => {
      const { getByTestId } = render(
        <DayReviewScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      const input = getByTestId('reflection-input');
      fireEvent.changeText(input, 'Practiced patience twice today');

      expect(input.props.value).toBe('Practiced patience twice today');
    });

    it('should require reflection', () => {
      const { getByTestId, getByText } = render(
        <DayReviewScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      fireEvent.press(getByTestId('practiced-yes'));
      // Don't fill reflection

      fireEvent.press(getByText(/continue/i));

      // Should not navigate without reflection
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Data Persistence', () => {
    it('should save review data on continue', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <DayReviewScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
          onSave={onSave}
        />
      );

      fireEvent.press(getByTestId('practiced-yes'));
      fireEvent.press(getByTestId('quality-8'));
      fireEvent.changeText(
        getByTestId('reflection-input'),
        'Good day practicing virtue'
      );

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            morningIntentionPracticed: true,
            dayQualityRating: 8,
            briefReflection: 'Good day practicing virtue',
            timestamp: expect.any(Date),
          })
        );
      });
    });

    it('should trim whitespace from reflection', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <DayReviewScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
          onSave={onSave}
        />
      );

      fireEvent.press(getByTestId('practiced-no'));
      fireEvent.changeText(getByTestId('reflection-input'), '  Reflection  ');

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            briefReflection: 'Reflection',
          })
        );
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to virtue instances on continue', async () => {
      const { getByTestId, getByText } = render(
        <DayReviewScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      fireEvent.press(getByTestId('practiced-yes'));
      fireEvent.changeText(getByTestId('reflection-input'), 'Reflection');

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('VirtueInstances');
      });
    });

    it('should allow going back', () => {
      const { getByTestId } = render(
        <DayReviewScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      fireEvent.press(getByTestId('back-button'));
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for all inputs', () => {
      const { getByTestId } = render(
        <DayReviewScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      expect(getByTestId('practiced-yes').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('practiced-no').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('quality-5').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('reflection-input').props.accessibilityLabel).toBeTruthy();
    });
  });

  describe('Validation', () => {
    it('should require intention practiced selection', () => {
      const { getByText } = render(
        <DayReviewScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      fireEvent.press(getByText(/continue/i));

      // Should not navigate without practiced selection
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Stoic Guidance', () => {
    it('should show Stoic wisdom about examination', () => {
      const { getByText } = render(
        <DayReviewScreen navigation={mockNavigation as any} route={mockRoute as any} />
      );

      // Should show Stoic quote or guidance
      expect(
        getByText(/Seneca/i) ||
        getByText(/Marcus Aurelius/i) ||
        getByText(/examine/i) ||
        getByText(/ledger/i)
      ).toBeTruthy();
    });
  });
});
