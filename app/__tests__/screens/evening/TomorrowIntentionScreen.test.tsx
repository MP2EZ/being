/**
 * TOMORROW INTENTION SCREEN TESTS
 *
 * Tests for setting tomorrow's virtue intention.
 * Philosopher-validated (9.5/10) - aligns with Architecture v1.0.
 *
 * TDD Approach: Tests written first, screen implemented to pass tests.
 *
 * Screen Requirements:
 * - Select virtue for tomorrow (wisdom, courage, justice, temperance)
 * - Select practice context (work, relationships, adversity)
 * - Write intention statement
 * - Optionally: identify what I control vs don't control
 * - Navigate to SelfCompassion screen
 *
 * Classical Stoic Practice:
 * - Marcus Aurelius: "When you wake up in the morning, tell yourself: the people
 *   I deal with today will be meddling, ungrateful, arrogant, dishonest, jealous,
 *   and surly. They are like this because they can't tell good from evil. But I
 *   have seen the beauty of good, and the ugliness of evil, and have recognized
 *   that the wrongdoer has a nature related to my own" (Meditations 2:1) - Prepare
 *   for tomorrow
 * - Epictetus: "Each morning put before your mind the tasks of the day" (Discourses)
 *
 * Purpose: End today by setting tomorrow's intention. This creates continuity
 * between evening reflection and morning practice.
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TomorrowIntentionScreen from '../../../src/flows/evening/screens/TomorrowIntentionScreen';
import type { IntentionData } from '../../../src/types/flows';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

describe('TomorrowIntentionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Screen Rendering', () => {
    it('should render tomorrow intention screen', () => {
      const { queryAllByText } = render(
        <TomorrowIntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const tomorrowMatches = queryAllByText(/tomorrow/i);
      const intentionMatches = queryAllByText(/intention/i);

      expect(tomorrowMatches.length > 0 || intentionMatches.length > 0).toBe(true);
    });
  });

  describe('Virtue Selection', () => {
    it('should show four virtue options', () => {
      const { getByTestId } = render(
        <TomorrowIntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('virtue-wisdom')).toBeTruthy();
      expect(getByTestId('virtue-courage')).toBeTruthy();
      expect(getByTestId('virtue-justice')).toBeTruthy();
      expect(getByTestId('virtue-temperance')).toBeTruthy();
    });

    it('should allow selecting virtue', () => {
      const { getByTestId } = render(
        <TomorrowIntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const wisdomButton = getByTestId('virtue-wisdom');
      fireEvent.press(wisdomButton);

      expect(wisdomButton.props.accessibilityState.selected).toBe(true);
    });

    it('should require virtue selection', () => {
      const { getByTestId, getByText } = render(
        <TomorrowIntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Fill other fields but not virtue
      fireEvent.press(getByTestId('context-work'));
      fireEvent.changeText(getByTestId('intention-input'), 'Intention');

      fireEvent.press(getByText(/continue/i));

      // Should not navigate
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Context Selection', () => {
    it('should show three context options', () => {
      const { getByTestId } = render(
        <TomorrowIntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('context-work')).toBeTruthy();
      expect(getByTestId('context-relationships')).toBeTruthy();
      expect(getByTestId('context-adversity')).toBeTruthy();
    });

    it('should allow selecting context', () => {
      const { getByTestId } = render(
        <TomorrowIntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const workButton = getByTestId('context-work');
      fireEvent.press(workButton);

      expect(workButton.props.accessibilityState.selected).toBe(true);
    });

    it('should require context selection', () => {
      const { getByTestId, getByText } = render(
        <TomorrowIntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('virtue-wisdom'));
      // Don't select context
      fireEvent.changeText(getByTestId('intention-input'), 'Intention');

      fireEvent.press(getByText(/continue/i));

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Intention Statement', () => {
    it('should show intention input', () => {
      const { getByTestId } = render(
        <TomorrowIntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('intention-input')).toBeTruthy();
    });

    it('should allow entering intention', () => {
      const { getByTestId } = render(
        <TomorrowIntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const input = getByTestId('intention-input');
      fireEvent.changeText(input, 'Practice patience in difficult conversations');

      expect(input.props.value).toBe('Practice patience in difficult conversations');
    });

    it('should require intention', () => {
      const { getByTestId, getByText } = render(
        <TomorrowIntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('virtue-wisdom'));
      fireEvent.press(getByTestId('context-work'));
      // Don't enter intention

      fireEvent.press(getByText(/continue/i));

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Control Dichotomy (Optional)', () => {
    it('should show what I control input', () => {
      const { getByTestId } = render(
        <TomorrowIntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('control-input')).toBeTruthy();
    });

    it('should show what I don\'t control input', () => {
      const { getByTestId } = render(
        <TomorrowIntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('no-control-input')).toBeTruthy();
    });

    it('should allow optional control dichotomy', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <TomorrowIntentionScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.press(getByTestId('virtue-wisdom'));
      fireEvent.press(getByTestId('context-work'));
      fireEvent.changeText(getByTestId('intention-input'), 'Intention');
      // Don't fill control dichotomy

      fireEvent.press(getByText(/continue/i));

      // Should save without control dichotomy
      await waitFor(() => {
        expect(onSave).toHaveBeenCalled();
      });
    });
  });

  describe('Data Persistence', () => {
    it('should save intention data on continue', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <TomorrowIntentionScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.press(getByTestId('virtue-wisdom'));
      fireEvent.press(getByTestId('context-work'));
      fireEvent.changeText(getByTestId('intention-input'), 'Practice patience');
      fireEvent.changeText(getByTestId('control-input'), 'My responses');
      fireEvent.changeText(getByTestId('no-control-input'), 'Others actions');

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            virtue: 'wisdom',
            context: 'work',
            intentionStatement: 'Practice patience',
            whatIControl: 'My responses',
            whatIDontControl: 'Others actions',
            timestamp: expect.any(Date),
          })
        );
      });
    });

    it('should trim whitespace from inputs', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <TomorrowIntentionScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.press(getByTestId('virtue-wisdom'));
      fireEvent.press(getByTestId('context-work'));
      fireEvent.changeText(getByTestId('intention-input'), '  Intention  ');

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            intentionStatement: 'Intention',
          })
        );
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to self-compassion on continue', async () => {
      const { getByTestId, getByText } = render(
        <TomorrowIntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('virtue-wisdom'));
      fireEvent.press(getByTestId('context-work'));
      fireEvent.changeText(getByTestId('intention-input'), 'Intention');

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('SelfCompassion');
      });
    });

    it('should allow going back', () => {
      const { getByTestId } = render(
        <TomorrowIntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('back-button'));
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for all inputs', () => {
      const { getByTestId } = render(
        <TomorrowIntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('virtue-wisdom').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('context-work').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('intention-input').props.accessibilityLabel).toBeTruthy();
    });
  });

  describe('Validation', () => {
    it('should require all required fields', () => {
      const { getByText } = render(
        <TomorrowIntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Don't fill anything
      fireEvent.press(getByText(/continue/i));

      // Should not navigate
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Stoic Guidance', () => {
    it('should show Stoic wisdom about preparation', () => {
      const { queryAllByText } = render(
        <TomorrowIntentionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const marcusMatches = queryAllByText(/Marcus Aurelius/i);
      const epictetusMatches = queryAllByText(/Epictetus/i);
      const prepareMatches = queryAllByText(/prepare/i);

      expect(
        marcusMatches.length > 0 || epictetusMatches.length > 0 || prepareMatches.length > 0
      ).toBe(true);
    });
  });
});
