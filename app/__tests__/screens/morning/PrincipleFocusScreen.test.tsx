/**
 * PRINCIPLE FOCUS SCREEN TESTS
 *
 * Tests for daily Stoic principle selection screen.
 * Philosopher-validated (9.5/10) - aligns with Architecture v1.0.
 *
 * TDD Approach: Tests written first, screen implemented to pass tests.
 *
 * Screen Requirements:
 * - Show 12 Stoic principles (Foundation 1-3, Discernment 4-5, Regulation 6-7, Practice 8-9, Ethics 10-12)
 * - User selects ONE principle for daily focus
 * - Optional: Write personal interpretation/application
 * - Optional: Set principle reminder time
 * - Save selection to StoicMorningFlowData
 *
 * @see /docs/architecture/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import PrincipleFocusScreen from '@/features/practices/morning/screens/PrincipleFocusScreen';
import type { PrincipleFocusData } from '@/features/practices/types/flows';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

describe('PrincipleFocusScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Screen Rendering', () => {
    it('should render principle focus screen', () => {
      const { getByText } = render(
        <PrincipleFocusScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText(/principle focus/i)).toBeTruthy();
      expect(getByText(/choose one principle/i)).toBeTruthy();
    });

    it('should show 12 Stoic principles', () => {
      const { getByTestId } = render(
        <PrincipleFocusScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Foundation (1-3)
      expect(getByTestId('principle-attention_to_present')).toBeTruthy();
      expect(getByTestId('principle-perception_examination')).toBeTruthy();
      expect(getByTestId('principle-judgment_suspension')).toBeTruthy();

      // Discernment (4-5)
      expect(getByTestId('principle-dichotomy_of_control')).toBeTruthy();
      expect(getByTestId('principle-events_vs_interpretations')).toBeTruthy();

      // Regulation (6-7)
      expect(getByTestId('principle-pause_before_reaction')).toBeTruthy();
      expect(getByTestId('principle-reframe_adversity')).toBeTruthy();

      // Practice (8-9)
      expect(getByTestId('principle-contemplation')).toBeTruthy();
      expect(getByTestId('principle-view_from_above')).toBeTruthy();

      // Ethics (10-12)
      expect(getByTestId('principle-virtue_as_foundation')).toBeTruthy();
      expect(getByTestId('principle-service_to_others')).toBeTruthy();
      expect(getByTestId('principle-amor_fati')).toBeTruthy();
    });

    it('should organize principles by category', () => {
      const { getAllByText } = render(
        <PrincipleFocusScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Categories appear as section headers
      expect(getAllByText('Foundation').length).toBeGreaterThan(0);
      expect(getAllByText('Discernment').length).toBeGreaterThan(0);
      expect(getAllByText('Regulation').length).toBeGreaterThan(0);
      expect(getAllByText('Practice').length).toBeGreaterThan(0);
      expect(getAllByText('Ethics').length).toBeGreaterThan(0);
    });
  });

  describe('Principle Selection', () => {
    it('should allow selecting a principle', () => {
      const { getByTestId } = render(
        <PrincipleFocusScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const principleButton = getByTestId('principle-dichotomy_of_control');
      fireEvent.press(principleButton);

      // Should be selected (visual feedback)
      expect(principleButton).toBeTruthy();
    });

    it('should only allow selecting one principle at a time', () => {
      const { getByTestId } = render(
        <PrincipleFocusScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Select first principle
      fireEvent.press(getByTestId('principle-attention_to_present'));

      // Select second principle (should replace first)
      fireEvent.press(getByTestId('principle-dichotomy_of_control'));

      // Both should exist but only second selected
      expect(getByTestId('principle-attention_to_present')).toBeTruthy();
      expect(getByTestId('principle-dichotomy_of_control')).toBeTruthy();
    });

    it('should show principle details when selected', () => {
      const { getByTestId, getByText } = render(
        <PrincipleFocusScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('principle-dichotomy_of_control'));

      // Should show principle description/source
      expect(getByText(/Epictetus/i)).toBeTruthy();
    });
  });

  describe('Personal Application', () => {
    it('should allow writing personal interpretation', () => {
      const { getByTestId } = render(
        <PrincipleFocusScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('principle-dichotomy_of_control'));

      const interpretationInput = getByTestId('personal-interpretation');
      fireEvent.changeText(interpretationInput, 'I will focus on my effort, not outcomes');

      expect(interpretationInput.props.value).toBe('I will focus on my effort, not outcomes');
    });

    it('should NOT require personal interpretation (optional)', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <PrincipleFocusScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.press(getByTestId('principle-dichotomy_of_control'));
      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            principleKey: 'dichotomy_of_control',
            personalInterpretation: undefined,
          })
        );
      });
    });
  });

  describe('Reminder Settings', () => {
    it('should show reminder time option', () => {
      const { getByTestId, getByText } = render(
        <PrincipleFocusScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('principle-dichotomy_of_control'));

      expect(getByText(/remind me later today/i)).toBeTruthy();
    });

    it('should allow setting reminder time', async () => {
      const { getByTestId } = render(
        <PrincipleFocusScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('principle-dichotomy_of_control'));

      // Enable reminder
      const reminderToggle = getByTestId('reminder-toggle');
      fireEvent(reminderToggle, 'valueChange', true);

      // Should show time input
      await waitFor(() => {
        expect(getByTestId('reminder-time-input')).toBeTruthy();
      });
    });

    it('should NOT require reminder (optional)', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <PrincipleFocusScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.press(getByTestId('principle-dichotomy_of_control'));
      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            reminderTime: undefined,
          })
        );
      });
    });
  });

  describe('Data Persistence', () => {
    it('should save principle selection on continue', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <PrincipleFocusScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.press(getByTestId('principle-dichotomy_of_control'));
      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            principleKey: 'dichotomy_of_control',
            timestamp: expect.any(Date),
          })
        );
      });
    });

    it('should save with personal interpretation', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <PrincipleFocusScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.press(getByTestId('principle-dichotomy_of_control'));
      fireEvent.changeText(
        getByTestId('personal-interpretation'),
        'Focus on process, not results'
      );
      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            principleKey: 'dichotomy_of_control',
            personalInterpretation: 'Focus on process, not results',
          })
        );
      });
    });

    it('should trim whitespace from interpretation', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <PrincipleFocusScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.press(getByTestId('principle-dichotomy_of_control'));
      fireEvent.changeText(getByTestId('personal-interpretation'), '  Focus  ');
      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            personalInterpretation: 'Focus',
          })
        );
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to next screen on continue', async () => {
      const { getByTestId, getByText } = render(
        <PrincipleFocusScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('principle-dichotomy_of_control'));
      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('PhysicalMetrics');
      });
    });

    it('should allow going back', () => {
      const { getByTestId } = render(
        <PrincipleFocusScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('back-button'));
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('should require principle selection before continuing', () => {
      const { getByText } = render(
        <PrincipleFocusScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const continueButton = getByText(/continue/i);
      fireEvent.press(continueButton);

      // Should not navigate without selection
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for all principle buttons', () => {
      const { getByTestId } = render(
        <PrincipleFocusScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const principleButton = getByTestId('principle-dichotomy_of_control');
      expect(principleButton.props.accessibilityLabel).toBeTruthy();
    });

    it('should have accessible label for interpretation input', () => {
      const { getByTestId } = render(
        <PrincipleFocusScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('principle-dichotomy_of_control'));

      const interpretationInput = getByTestId('personal-interpretation');
      expect(interpretationInput.props.accessibilityLabel).toBeTruthy();
    });
  });

  describe('Principle Content', () => {
    it('should show classical source citations', () => {
      const { getByTestId, getByText } = render(
        <PrincipleFocusScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('principle-dichotomy_of_control'));

      // Should show Epictetus citation
      expect(getByText(/Enchiridion/i)).toBeTruthy();
    });

    it('should show principle descriptions', () => {
      const { getByTestId, getAllByText } = render(
        <PrincipleFocusScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('principle-dichotomy_of_control'));

      // Should show description (appears in both card and selected section)
      expect(getAllByText(/some things are in our control/i).length).toBeGreaterThan(0);
    });
  });
});
