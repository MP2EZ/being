/**
 * GRATITUDE SCREEN TESTS (Evening)
 *
 * Tests for evening gratitude practice with impermanence reflection.
 * Philosopher-validated (9.5/10) - aligns with Architecture v1.0.
 *
 * TDD Approach: Tests written first, screen implemented to pass tests.
 *
 * Screen Requirements:
 * - Collect exactly 3 gratitude items (required)
 * - Each item can optionally include impermanence reflection
 * - Navigate to TomorrowIntention screen
 *
 * Classical Stoic Practice:
 * - Marcus Aurelius: "When you arise in the morning, think of what a precious
 *   privilege it is to be alive - to breathe, to think, to enjoy, to love - then
 *   make that privilege count by being grateful" (Meditations 2:1)
 * - Epictetus: "He is a wise man who does not grieve for the things which he has
 *   not, but rejoices for those which he has" (Discourses)
 * - Marcus Aurelius: "Loss is nothing else but change, and change is Nature's
 *   delight" (Meditations 7:18) - Impermanence
 *
 * Purpose: Evening gratitude completes the day with reflection on what was good.
 * Optional impermanence reflection deepens appreciation by acknowledging that
 * all things are temporary.
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import GratitudeScreen from '@/features/practices/evening/screens/GratitudeScreen';
import type { GratitudeData } from '@/features/practices/types/flows';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

describe('GratitudeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Screen Rendering', () => {
    it('should render gratitude screen', () => {
      const { queryAllByText } = render(
        <GratitudeScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const gratitudeMatches = queryAllByText(/gratitude/i);
      const thankfulMatches = queryAllByText(/thankful/i);

      expect(gratitudeMatches.length > 0 || thankfulMatches.length > 0).toBe(true);
    });

    it('should show three gratitude input fields', () => {
      const { getByTestId } = render(
        <GratitudeScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('gratitude-0')).toBeTruthy();
      expect(getByTestId('gratitude-1')).toBeTruthy();
      expect(getByTestId('gratitude-2')).toBeTruthy();
    });
  });

  describe('Gratitude Inputs', () => {
    it('should allow entering first gratitude', () => {
      const { getByTestId } = render(
        <GratitudeScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const input = getByTestId('gratitude-0');
      fireEvent.changeText(input, 'My family');

      expect(input.props.value).toBe('My family');
    });

    it('should allow entering second gratitude', () => {
      const { getByTestId } = render(
        <GratitudeScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const input = getByTestId('gratitude-1');
      fireEvent.changeText(input, 'Good health');

      expect(input.props.value).toBe('Good health');
    });

    it('should allow entering third gratitude', () => {
      const { getByTestId } = render(
        <GratitudeScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const input = getByTestId('gratitude-2');
      fireEvent.changeText(input, 'Meaningful work');

      expect(input.props.value).toBe('Meaningful work');
    });

    it('should require all three gratitudes', () => {
      const { getByTestId, getByText } = render(
        <GratitudeScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Fill only two
      fireEvent.changeText(getByTestId('gratitude-0'), 'First');
      fireEvent.changeText(getByTestId('gratitude-1'), 'Second');
      // Don't fill third

      fireEvent.press(getByText(/continue/i));

      // Should not navigate
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Impermanence Reflection (Optional)', () => {
    it('should show impermanence toggle for each item', () => {
      const { getByTestId } = render(
        <GratitudeScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('impermanence-toggle-0')).toBeTruthy();
      expect(getByTestId('impermanence-toggle-1')).toBeTruthy();
      expect(getByTestId('impermanence-toggle-2')).toBeTruthy();
    });

    it('should allow enabling impermanence reflection', () => {
      const { getByTestId } = render(
        <GratitudeScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const toggle = getByTestId('impermanence-toggle-0');
      fireEvent(toggle, 'valueChange', true);

      expect(toggle.props.accessibilityState.checked).toBe(true);
    });

    it('should show impermanence fields when enabled', () => {
      const { getByTestId, queryByTestId } = render(
        <GratitudeScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Initially hidden
      expect(queryByTestId('impermanence-awareness-0')).toBeNull();

      // Enable impermanence reflection
      fireEvent(getByTestId('impermanence-toggle-0'), 'valueChange', true);

      // Now visible
      expect(queryByTestId('impermanence-awareness-0')).toBeTruthy();
    });

    it('should allow impermanence reflection to be optional', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <GratitudeScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      // Fill all three without impermanence
      fireEvent.changeText(getByTestId('gratitude-0'), 'First');
      fireEvent.changeText(getByTestId('gratitude-1'), 'Second');
      fireEvent.changeText(getByTestId('gratitude-2'), 'Third');

      fireEvent.press(getByText(/continue/i));

      // Should save without impermanence reflection (field omitted, not undefined)
      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            items: expect.arrayContaining([
              expect.objectContaining({
                what: 'First',
                // impermanenceReflection field is omitted when not provided
              }),
            ]),
          })
        );
      });
    });
  });

  describe('Data Persistence', () => {
    it('should save three gratitude items on continue', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <GratitudeScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.changeText(getByTestId('gratitude-0'), 'Health');
      fireEvent.changeText(getByTestId('gratitude-1'), 'Family');
      fireEvent.changeText(getByTestId('gratitude-2'), 'Purpose');

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            items: [
              expect.objectContaining({ what: 'Health' }),
              expect.objectContaining({ what: 'Family' }),
              expect.objectContaining({ what: 'Purpose' }),
            ],
            timestamp: expect.any(Date),
          })
        );
      });
    });

    it('should trim whitespace from gratitude items', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <GratitudeScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.changeText(getByTestId('gratitude-0'), '  Health  ');
      fireEvent.changeText(getByTestId('gratitude-1'), '  Family  ');
      fireEvent.changeText(getByTestId('gratitude-2'), '  Purpose  ');

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            items: [
              expect.objectContaining({ what: 'Health' }),
              expect.objectContaining({ what: 'Family' }),
              expect.objectContaining({ what: 'Purpose' }),
            ],
          })
        );
      });
    });

    it('should save impermanence reflection when provided', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <GratitudeScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.changeText(getByTestId('gratitude-0'), 'Health');
      fireEvent(getByTestId('impermanence-toggle-0'), 'valueChange', true);
      fireEvent.changeText(
        getByTestId('impermanence-awareness-0'),
        'This is temporary and precious'
      );

      fireEvent.changeText(getByTestId('gratitude-1'), 'Family');
      fireEvent.changeText(getByTestId('gratitude-2'), 'Purpose');

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            items: expect.arrayContaining([
              expect.objectContaining({
                what: 'Health',
                impermanenceReflection: expect.objectContaining({
                  acknowledged: true,
                  awareness: 'This is temporary and precious',
                }),
              }),
            ]),
          })
        );
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to tomorrow intention on continue', async () => {
      const { getByTestId, getByText } = render(
        <GratitudeScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.changeText(getByTestId('gratitude-0'), 'First');
      fireEvent.changeText(getByTestId('gratitude-1'), 'Second');
      fireEvent.changeText(getByTestId('gratitude-2'), 'Third');

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('TomorrowIntention');
      });
    });

    it('should allow going back', () => {
      const { getByTestId } = render(
        <GratitudeScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('back-button'));
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for all inputs', () => {
      const { getByTestId } = render(
        <GratitudeScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('gratitude-0').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('gratitude-1').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('gratitude-2').props.accessibilityLabel).toBeTruthy();
    });
  });

  describe('Validation', () => {
    it('should require all three gratitudes to be filled', () => {
      const { getByText } = render(
        <GratitudeScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Don't fill anything
      fireEvent.press(getByText(/continue/i));

      // Should not navigate
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Stoic Guidance', () => {
    it('should show Stoic wisdom about gratitude', () => {
      const { queryAllByText } = render(
        <GratitudeScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const epictetusMatches = queryAllByText(/Epictetus/i);
      const marcusMatches = queryAllByText(/Marcus Aurelius/i);
      const rejoicesMatches = queryAllByText(/rejoices/i);

      expect(
        epictetusMatches.length > 0 || marcusMatches.length > 0 || rejoicesMatches.length > 0
      ).toBe(true);
    });
  });
});
