/**
 * CURRENT SITUATION SCREEN TESTS
 *
 * Tests for midday check-in screen (present moment awareness).
 * Aligns with Stoic Mindfulness Architecture v1.0.
 *
 * TDD Approach: Tests written first, screen implemented to pass tests.
 *
 * Screen Requirements:
 * - Situation description (brief current circumstance)
 * - Emotional state (text input or selection)
 * - Energy level (1-10 scale)
 * - All fields required
 * - Save to CurrentSituationData
 * - Navigate to ControlCheck screen
 *
 * Classical Stoic Practice:
 * - Marcus Aurelius: Midday reflection to re-center (Meditations 5:1)
 * - Epictetus: "Check yourself throughout the day" (Enchiridion 34)
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CurrentSituationScreen from '../../../src/flows/midday/screens/CurrentSituationScreen';
import type { CurrentSituationData } from '../../../src/types/flows';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

describe('CurrentSituationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Screen Rendering', () => {
    it('should render current situation screen', () => {
      const { getByText } = render(
        <CurrentSituationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText(/current situation/i)).toBeTruthy();
      expect(getByText(/midday check-in/i)).toBeTruthy();
    });

    it('should show all required fields', () => {
      const { getByTestId } = render(
        <CurrentSituationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('situation-input')).toBeTruthy();
      expect(getByTestId('emotional-state-input')).toBeTruthy();
      expect(getByTestId('energy-level')).toBeTruthy();
    });
  });

  describe('Situation Input', () => {
    it('should allow entering situation description', () => {
      const { getByTestId } = render(
        <CurrentSituationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const situationInput = getByTestId('situation-input');
      fireEvent.changeText(situationInput, 'Working on project deadline');

      expect(situationInput.props.value).toBe('Working on project deadline');
    });

    it('should require situation description', () => {
      const { getByText, getByTestId } = render(
        <CurrentSituationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Fill other fields but not situation
      fireEvent.changeText(getByTestId('emotional-state-input'), 'Focused');
      fireEvent.press(getByTestId('energy-7'));

      const continueButton = getByText(/continue/i);
      fireEvent.press(continueButton);

      // Should not navigate without situation
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Emotional State Input', () => {
    it('should allow entering emotional state', () => {
      const { getByTestId } = render(
        <CurrentSituationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const emotionalInput = getByTestId('emotional-state-input');
      fireEvent.changeText(emotionalInput, 'Calm and focused');

      expect(emotionalInput.props.value).toBe('Calm and focused');
    });

    it('should require emotional state', () => {
      const { getByText, getByTestId } = render(
        <CurrentSituationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Fill other fields but not emotional state
      fireEvent.changeText(getByTestId('situation-input'), 'At work');
      fireEvent.press(getByTestId('energy-7'));

      const continueButton = getByText(/continue/i);
      fireEvent.press(continueButton);

      // Should not navigate without emotional state
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Energy Level Selection', () => {
    it('should allow selecting energy level', () => {
      const { getByTestId } = render(
        <CurrentSituationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const energy7Button = getByTestId('energy-7');
      fireEvent.press(energy7Button);

      // Should be selected (verified by visual state)
      expect(energy7Button).toBeTruthy();
    });

    it('should show 1-10 energy options', () => {
      const { getByTestId } = render(
        <CurrentSituationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      for (let i = 1; i <= 10; i++) {
        expect(getByTestId(`energy-${i}`)).toBeTruthy();
      }
    });

    it('should default to mid-range energy (5)', () => {
      const { getByText } = render(
        <CurrentSituationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText(/energy: 5\/10/i)).toBeTruthy();
    });
  });

  describe('Data Persistence', () => {
    it('should save current situation data on continue', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <CurrentSituationScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.changeText(getByTestId('situation-input'), 'Working on urgent task');
      fireEvent.changeText(getByTestId('emotional-state-input'), 'Stressed but focused');
      fireEvent.press(getByTestId('energy-6'));

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            situation: 'Working on urgent task',
            emotionalState: 'Stressed but focused',
            energyLevel: 6,
            timestamp: expect.any(Date),
          })
        );
      });
    });

    it('should trim whitespace from inputs', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <CurrentSituationScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.changeText(getByTestId('situation-input'), '  At meeting  ');
      fireEvent.changeText(getByTestId('emotional-state-input'), '  Engaged  ');
      fireEvent.press(getByTestId('energy-7'));

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            situation: 'At meeting',
            emotionalState: 'Engaged',
          })
        );
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to control check on continue', async () => {
      const { getByTestId, getByText } = render(
        <CurrentSituationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.changeText(getByTestId('situation-input'), 'Working');
      fireEvent.changeText(getByTestId('emotional-state-input'), 'Focused');
      fireEvent.press(getByTestId('energy-7'));

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('ControlCheck');
      });
    });

    it('should allow going back', () => {
      const { getByTestId } = render(
        <CurrentSituationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('back-button'));
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for all inputs', () => {
      const { getByTestId } = render(
        <CurrentSituationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('situation-input').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('emotional-state-input').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('energy-level').props.accessibilityLabel).toBeTruthy();
    });

    it('should announce current energy level', () => {
      const { getByTestId } = render(
        <CurrentSituationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('energy-8'));

      const energyDisplay = getByTestId('energy-level');
      expect(energyDisplay.props.accessibilityLabel).toContain('8');
    });
  });

  describe('Validation', () => {
    it('should require all fields before continuing', () => {
      const { getByText } = render(
        <CurrentSituationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const continueButton = getByText(/continue/i);
      fireEvent.press(continueButton);

      // Should not navigate with empty fields
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not allow empty situation after trimming', () => {
      const { getByTestId, getByText } = render(
        <CurrentSituationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.changeText(getByTestId('situation-input'), '   ');
      fireEvent.changeText(getByTestId('emotional-state-input'), 'Calm');
      fireEvent.press(getByTestId('energy-5'));

      fireEvent.press(getByText(/continue/i));

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Helper Text', () => {
    it('should show helpful prompts for each field', () => {
      const { getByText } = render(
        <CurrentSituationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText(/what's happening right now/i)).toBeTruthy();
      expect(getByText(/how are you feeling/i)).toBeTruthy();
      expect(getByText(/energy level/i)).toBeTruthy();
    });
  });
});
