/**
 * REAPPRAISAL SCREEN TESTS
 *
 * Tests for Stoic cognitive reframing screen.
 * Philosopher-validated (9.5/10) - aligns with Architecture v1.0.
 *
 * TDD Approach: Tests written first, screen implemented to pass tests.
 *
 * Screen Requirements:
 * - Obstacle description (current challenge)
 * - Virtue opportunity (which virtue to practice)
 * - Reframed perspective (new way of seeing it)
 * - Optional: Principle applied
 * - Save to ReappraisalData
 * - Navigate to IntentionProgress screen
 *
 * Classical Stoic Practice:
 * - Marcus Aurelius: "The impediment to action advances action. What stands in
 *   the way becomes the way." (Meditations 5:20)
 * - Epictetus: "It's not what happens to you, but how you react to it that matters."
 *   (Enchiridion 5)
 * - Seneca: "Difficulties strengthen the mind, as labor does the body." (Letters 13)
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ReappraisalScreen from '@/features/practices/midday/screens/ReappraisalScreen';
import type { ReappraisalData } from '@/features/practices/types/flows';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

describe('ReappraisalScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Screen Rendering', () => {
    it('should render reappraisal screen', () => {
      const { getByText } = render(
        <ReappraisalScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText(/reappraisal/i)).toBeTruthy();
      expect(getByText('Reframe Obstacles as Opportunities')).toBeTruthy();
    });

    it('should show all required fields', () => {
      const { getByTestId } = render(
        <ReappraisalScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('obstacle-input')).toBeTruthy();
      expect(getByTestId('virtue-opportunity-input')).toBeTruthy();
      expect(getByTestId('reframed-perspective-input')).toBeTruthy();
    });
  });

  describe('Obstacle Input', () => {
    it('should allow entering obstacle description', () => {
      const { getByTestId } = render(
        <ReappraisalScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const obstacleInput = getByTestId('obstacle-input');
      fireEvent.changeText(obstacleInput, 'Difficult feedback from manager');

      expect(obstacleInput.props.value).toBe('Difficult feedback from manager');
    });

    it('should require obstacle description', () => {
      const { getByText, getByTestId } = render(
        <ReappraisalScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Fill other fields but not obstacle
      fireEvent.changeText(getByTestId('virtue-opportunity-input'), 'Wisdom');
      fireEvent.changeText(getByTestId('reframed-perspective-input'), 'Growth opportunity');

      fireEvent.press(getByText(/continue/i));

      // Should not navigate without obstacle
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Virtue Opportunity Input', () => {
    it('should allow entering virtue opportunity', () => {
      const { getByTestId } = render(
        <ReappraisalScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const virtueInput = getByTestId('virtue-opportunity-input');
      fireEvent.changeText(virtueInput, 'Opportunity to practice wisdom by listening openly');

      expect(virtueInput.props.value).toBe('Opportunity to practice wisdom by listening openly');
    });

    it('should require virtue opportunity', () => {
      const { getByText, getByTestId } = render(
        <ReappraisalScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Fill other fields but not virtue
      fireEvent.changeText(getByTestId('obstacle-input'), 'Challenge');
      fireEvent.changeText(getByTestId('reframed-perspective-input'), 'Growth');

      fireEvent.press(getByText(/continue/i));

      // Should not navigate without virtue opportunity
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Reframed Perspective Input', () => {
    it('should allow entering reframed perspective', () => {
      const { getByTestId } = render(
        <ReappraisalScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const reframedInput = getByTestId('reframed-perspective-input');
      fireEvent.changeText(
        reframedInput,
        'This feedback is valuable data for improvement'
      );

      expect(reframedInput.props.value).toBe('This feedback is valuable data for improvement');
    });

    it('should require reframed perspective', () => {
      const { getByText, getByTestId } = render(
        <ReappraisalScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Fill other fields but not reframed perspective
      fireEvent.changeText(getByTestId('obstacle-input'), 'Challenge');
      fireEvent.changeText(getByTestId('virtue-opportunity-input'), 'Wisdom');

      fireEvent.press(getByText(/continue/i));

      // Should not navigate without reframed perspective
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Principle Applied (Optional)', () => {
    it('should show optional principle input', () => {
      const { getByTestId } = render(
        <ReappraisalScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('principle-input')).toBeTruthy();
    });

    it('should allow entering principle applied', () => {
      const { getByTestId } = render(
        <ReappraisalScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const principleInput = getByTestId('principle-input');
      fireEvent.changeText(principleInput, 'The obstacle is the way');

      expect(principleInput.props.value).toBe('The obstacle is the way');
    });

    it('should NOT require principle (optional field)', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <ReappraisalScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.changeText(getByTestId('obstacle-input'), 'Challenge');
      fireEvent.changeText(getByTestId('virtue-opportunity-input'), 'Wisdom');
      fireEvent.changeText(getByTestId('reframed-perspective-input'), 'Opportunity');

      // Don't fill principle field
      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            obstacle: 'Challenge',
            virtueOpportunity: 'Wisdom',
            reframedPerspective: 'Opportunity',
            principleApplied: undefined,
          })
        );
      });
    });
  });

  describe('Data Persistence', () => {
    it('should save reappraisal data on continue', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <ReappraisalScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.changeText(
        getByTestId('obstacle-input'),
        'Unexpected project setback'
      );
      fireEvent.changeText(
        getByTestId('virtue-opportunity-input'),
        'Practice courage and wisdom in problem-solving'
      );
      fireEvent.changeText(
        getByTestId('reframed-perspective-input'),
        'This is a chance to demonstrate resilience and creativity'
      );
      fireEvent.changeText(
        getByTestId('principle-input'),
        'The impediment to action advances action'
      );

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            obstacle: 'Unexpected project setback',
            virtueOpportunity: 'Practice courage and wisdom in problem-solving',
            reframedPerspective: 'This is a chance to demonstrate resilience and creativity',
            principleApplied: 'The impediment to action advances action',
            timestamp: expect.any(Date),
          })
        );
      });
    });

    it('should trim whitespace from inputs', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <ReappraisalScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.changeText(getByTestId('obstacle-input'), '  Challenge  ');
      fireEvent.changeText(getByTestId('virtue-opportunity-input'), '  Wisdom  ');
      fireEvent.changeText(getByTestId('reframed-perspective-input'), '  Growth  ');

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            obstacle: 'Challenge',
            virtueOpportunity: 'Wisdom',
            reframedPerspective: 'Growth',
          })
        );
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to intention progress on continue', async () => {
      const { getByTestId, getByText } = render(
        <ReappraisalScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.changeText(getByTestId('obstacle-input'), 'Challenge');
      fireEvent.changeText(getByTestId('virtue-opportunity-input'), 'Wisdom');
      fireEvent.changeText(getByTestId('reframed-perspective-input'), 'Opportunity');

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('IntentionProgress');
      });
    });

    it('should allow going back', () => {
      const { getByTestId } = render(
        <ReappraisalScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('back-button'));
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for all inputs', () => {
      const { getByTestId } = render(
        <ReappraisalScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('obstacle-input').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('virtue-opportunity-input').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('reframed-perspective-input').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('principle-input').props.accessibilityLabel).toBeTruthy();
    });
  });

  describe('Validation', () => {
    it('should require all required fields before continuing', () => {
      const { getByText } = render(
        <ReappraisalScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByText(/continue/i));

      // Should not navigate with empty fields
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not allow empty obstacle after trimming', () => {
      const { getByTestId, getByText } = render(
        <ReappraisalScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.changeText(getByTestId('obstacle-input'), '   ');
      fireEvent.changeText(getByTestId('virtue-opportunity-input'), 'Wisdom');
      fireEvent.changeText(getByTestId('reframed-perspective-input'), 'Growth');

      fireEvent.press(getByText(/continue/i));

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Helper Text', () => {
    it('should show Stoic guidance for reframing', () => {
      const { getByText } = render(
        <ReappraisalScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Should show Marcus Aurelius quote or similar guidance
      expect(
        getByText(/impediment/i) || getByText(/obstacle/i) || getByText(/reframe/i)
      ).toBeTruthy();
    });
  });
});
