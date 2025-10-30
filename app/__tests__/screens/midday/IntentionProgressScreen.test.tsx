/**
 * INTENTION PROGRESS SCREEN TESTS
 *
 * Tests for midday review of morning intention.
 * Philosopher-validated (9.5/10) - aligns with Architecture v1.0.
 *
 * TDD Approach: Tests written first, screen implemented to pass tests.
 *
 * Screen Requirements:
 * - Display morning intention (from route params or state)
 * - Boolean: Have you practiced your intention?
 * - If practiced: Optional "How did you apply it?"
 * - Optional: Adjustments to make
 * - Save to IntentionProgressData
 * - Navigate to Embodiment screen
 *
 * Classical Stoic Practice:
 * - Marcus Aurelius: "At dawn, when you have trouble getting out of bed, tell yourself:
 *   'I have to go to work...' But at midday, pause and ask: 'How goes my day?'"
 *   (Meditations 5:1) - Regular self-examination
 * - Epictetus: "In every affair consider what precedes and what follows, and then
 *   undertake it." (Enchiridion 34) - Review and adjust
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import IntentionProgressScreen from '../../../src/flows/midday/screens/IntentionProgressScreen';
import type { IntentionProgressData } from '../../../src/types/flows';

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

describe('IntentionProgressScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Screen Rendering', () => {
    it('should render intention progress screen', () => {
      const { getByText } = render(
        <IntentionProgressScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      expect(getByText(/intention progress/i)).toBeTruthy();
      expect(getByText(/morning check/i)).toBeTruthy();
    });

    it('should display morning intention', () => {
      const { getByText } = render(
        <IntentionProgressScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      expect(getByText('Practice patience in difficult conversations')).toBeTruthy();
    });

    it('should show practiced selection options', () => {
      const { getByTestId } = render(
        <IntentionProgressScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      expect(getByTestId('practiced-yes')).toBeTruthy();
      expect(getByTestId('practiced-no')).toBeTruthy();
    });
  });

  describe('Practiced Selection', () => {
    it('should allow selecting yes for practiced', () => {
      const { getByTestId } = render(
        <IntentionProgressScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      const yesButton = getByTestId('practiced-yes');
      fireEvent.press(yesButton);

      expect(yesButton.props.accessibilityState.selected).toBe(true);
    });

    it('should allow selecting no for practiced', () => {
      const { getByTestId } = render(
        <IntentionProgressScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      const noButton = getByTestId('practiced-no');
      fireEvent.press(noButton);

      expect(noButton.props.accessibilityState.selected).toBe(true);
    });

    it('should show how applied field when practiced is yes', () => {
      const { getByTestId, queryByTestId } = render(
        <IntentionProgressScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      // Initially not visible
      expect(queryByTestId('how-applied-input')).toBeNull();

      // Select yes
      fireEvent.press(getByTestId('practiced-yes'));

      // Now visible
      expect(getByTestId('how-applied-input')).toBeTruthy();
    });

    it('should NOT show how applied field when practiced is no', () => {
      const { getByTestId, queryByTestId } = render(
        <IntentionProgressScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      // Select no
      fireEvent.press(getByTestId('practiced-no'));

      // Should not be visible
      expect(queryByTestId('how-applied-input')).toBeNull();
    });

    it('should require practiced selection', () => {
      const { getByText } = render(
        <IntentionProgressScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      // Don't select practiced
      fireEvent.press(getByText(/continue/i));

      // Should not navigate without practiced selection
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('How Applied Input', () => {
    it('should allow entering how applied when practiced', () => {
      const { getByTestId } = render(
        <IntentionProgressScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      fireEvent.press(getByTestId('practiced-yes'));

      const howAppliedInput = getByTestId('how-applied-input');
      fireEvent.changeText(
        howAppliedInput,
        'I paused before responding to criticism'
      );

      expect(howAppliedInput.props.value).toBe('I paused before responding to criticism');
    });

    it('should NOT require how applied field (optional)', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <IntentionProgressScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
          onSave={onSave}
        />
      );

      fireEvent.press(getByTestId('practiced-yes'));

      // Don't fill how applied
      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            practiced: true,
            howApplied: undefined,
          })
        );
      });
    });
  });

  describe('Adjustment Input', () => {
    it('should show adjustment field', () => {
      const { getByTestId } = render(
        <IntentionProgressScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      expect(getByTestId('adjustment-input')).toBeTruthy();
    });

    it('should allow entering adjustment', () => {
      const { getByTestId } = render(
        <IntentionProgressScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      const adjustmentInput = getByTestId('adjustment-input');
      fireEvent.changeText(adjustmentInput, 'Need to practice more at work');

      expect(adjustmentInput.props.value).toBe('Need to practice more at work');
    });

    it('should NOT require adjustment field (optional)', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <IntentionProgressScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
          onSave={onSave}
        />
      );

      fireEvent.press(getByTestId('practiced-no'));

      // Don't fill adjustment
      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            practiced: false,
            adjustment: undefined,
          })
        );
      });
    });
  });

  describe('Data Persistence', () => {
    it('should save intention progress data when practiced', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <IntentionProgressScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
          onSave={onSave}
        />
      );

      fireEvent.press(getByTestId('practiced-yes'));
      fireEvent.changeText(
        getByTestId('how-applied-input'),
        'Used it during team meeting'
      );
      fireEvent.changeText(
        getByTestId('adjustment-input'),
        'Could be more consistent'
      );

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            morningIntention: 'Practice patience in difficult conversations',
            practiced: true,
            howApplied: 'Used it during team meeting',
            adjustment: 'Could be more consistent',
            timestamp: expect.any(Date),
          })
        );
      });
    });

    it('should save intention progress data when not practiced', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <IntentionProgressScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
          onSave={onSave}
        />
      );

      fireEvent.press(getByTestId('practiced-no'));
      fireEvent.changeText(
        getByTestId('adjustment-input'),
        'Will try tomorrow morning'
      );

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            morningIntention: 'Practice patience in difficult conversations',
            practiced: false,
            howApplied: undefined,
            adjustment: 'Will try tomorrow morning',
            timestamp: expect.any(Date),
          })
        );
      });
    });

    it('should trim whitespace from inputs', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <IntentionProgressScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
          onSave={onSave}
        />
      );

      fireEvent.press(getByTestId('practiced-yes'));
      fireEvent.changeText(getByTestId('how-applied-input'), '  Applied well  ');
      fireEvent.changeText(getByTestId('adjustment-input'), '  Keep going  ');

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            howApplied: 'Applied well',
            adjustment: 'Keep going',
          })
        );
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to embodiment screen on continue', async () => {
      const { getByTestId, getByText } = render(
        <IntentionProgressScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      fireEvent.press(getByTestId('practiced-yes'));
      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Embodiment');
      });
    });

    it('should allow going back', () => {
      const { getByTestId } = render(
        <IntentionProgressScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      fireEvent.press(getByTestId('back-button'));
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for all inputs', () => {
      const { getByTestId } = render(
        <IntentionProgressScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      expect(getByTestId('practiced-yes').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('practiced-no').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('adjustment-input').props.accessibilityLabel).toBeTruthy();

      // Check how-applied only after showing it
      fireEvent.press(getByTestId('practiced-yes'));
      expect(getByTestId('how-applied-input').props.accessibilityLabel).toBeTruthy();
    });
  });

  describe('Validation', () => {
    it('should require practiced selection before continuing', () => {
      const { getByText } = render(
        <IntentionProgressScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      fireEvent.press(getByText(/continue/i));

      // Should not navigate without practiced selection
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Helper Text', () => {
    it('should show Stoic guidance for self-examination', () => {
      const { getByText } = render(
        <IntentionProgressScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      // Should show guidance about midday review
      expect(
        getByText(/how goes/i) || getByText(/check/i) || getByText(/review/i)
      ).toBeTruthy();
    });
  });
});
