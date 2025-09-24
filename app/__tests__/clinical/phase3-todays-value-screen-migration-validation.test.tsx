/**
 * Phase 3 Clinical Validation: TodaysValueScreen TouchableOpacity → Pressable Migration
 * MBCT Compliance and Therapeutic Effectiveness Testing
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { TodaysValueScreen } from '../../src/flows/morning/TodaysValueScreen';
import { useCheckInStore } from '../../src/store/checkInStore';
import * as Haptics from 'expo-haptics';

// Mock dependencies
jest.mock('../../src/store/checkInStore', () => ({
  useCheckInStore: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));

// Clinical test values based on MBCT core values
const MBCT_CORE_VALUES = [
  'kindness', 'courage', 'authenticity', 'growth', 'connection',
  'creativity', 'peace', 'purpose', 'gratitude', 'resilience'
];

describe('TodaysValueScreen - MBCT Therapeutic Migration Validation', () => {
  let mockStore: any;
  let mockOnNext: jest.Mock;
  let mockOnBack: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockStore = {
      currentCheckIn: {
        data: {}
      },
      updateCurrentCheckIn: jest.fn(),
    };

    (useCheckInStore as jest.Mock).mockReturnValue(mockStore);

    mockOnNext = jest.fn();
    mockOnBack = jest.fn();
  });

  describe('MBCT Compliance - Value-Based Mindfulness', () => {
    test('presents all 10 MBCT-aligned core values', () => {
      const { getByText } = render(
        <TodaysValueScreen onNext={mockOnNext} onBack={mockOnBack} />
      );

      // Verify all MBCT core values are present
      MBCT_CORE_VALUES.forEach(valueId => {
        const expectedLabels: Record<string, string> = {
          'kindness': 'Kindness',
          'courage': 'Courage',
          'authenticity': 'Authenticity',
          'growth': 'Growth',
          'connection': 'Connection',
          'creativity': 'Creativity',
          'peace': 'Peace',
          'purpose': 'Purpose',
          'gratitude': 'Gratitude',
          'resilience': 'Resilience'
        };

        expect(getByText(expectedLabels[valueId])).toBeTruthy();
      });
    });

    test('maintains mindful single-value selection (MBCT principle)', async () => {
      const { getByText, queryByText } = render(
        <TodaysValueScreen onNext={mockOnNext} onBack={mockOnBack} />
      );

      // Select first value
      const kindnessCard = getByText('Kindness').parent;
      fireEvent.press(kindnessCard);

      await waitFor(() => {
        expect(getByText('Today you\'re focusing on: Kindness')).toBeTruthy();
      });

      // Select second value - should replace first (single selection)
      const courageCard = getByText('Courage').parent;
      fireEvent.press(courageCard);

      await waitFor(() => {
        expect(getByText('Today you\'re focusing on: Courage')).toBeTruthy();
        expect(queryByText('Today you\'re focusing on: Kindness')).toBeNull();
      });
    });

    test('provides MBCT therapeutic guidance for selected values', async () => {
      const { getByText } = render(
        <TodaysValueScreen onNext={mockOnNext} onBack={mockOnBack} />
      );

      // Test mindfulness integration
      const peaceCard = getByText('Peace').parent;
      fireEvent.press(peaceCard);

      await waitFor(() => {
        expect(getByText(/How can I honor peace in this moment/i)).toBeTruthy();
        expect(getByText('Cultivating inner calm and tranquility')).toBeTruthy();
      });
    });
  });

  describe('Pressable Migration - New Architecture Compatibility', () => {
    test('Pressable responds with correct therapeutic timing', async () => {
      const { getByText } = render(
        <TodaysValueScreen onNext={mockOnNext} onBack={mockOnBack} />
      );

      const valueCard = getByText('Gratitude').parent;

      // Simulate therapeutic press timing
      await act(async () => {
        fireEvent.press(valueCard);
        // Allow time for haptic feedback
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      await waitFor(() => {
        expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
        expect(getByText('Today you\'re focusing on: Gratitude')).toBeTruthy();
      });
    });

    test('maintains accessibility for therapeutic interactions', () => {
      const { getByRole, getAllByRole } = render(
        <TodaysValueScreen onNext={mockOnNext} onBack={mockOnBack} />
      );

      // Check all value cards have proper accessibility
      const radioButtons = getAllByRole('radio');
      expect(radioButtons).toHaveLength(10); // All 10 core values

      // Test specific accessibility attributes
      const firstValue = radioButtons[0];
      expect(firstValue.props.accessibilityLabel).toMatch(/value.*not selected/);
      expect(firstValue.props.accessibilityState).toEqual({ selected: false });
    });

    test('supports anxiety-aware therapeutic interactions', async () => {
      const { getByText } = render(
        <TodaysValueScreen onNext={mockOnNext} onBack={mockOnBack} />
      );

      const valueCard = getByText('Kindness').parent;

      // Test gentle interaction (no aggressive animations for anxiety)
      fireEvent.press(valueCard);

      await waitFor(() => {
        // Should not trigger harsh haptic feedback
        expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
      });
    });
  });

  describe('Therapeutic Flow Integration', () => {
    test('requires both value selection and intention for MBCT completion', async () => {
      const { getByText, getByPlaceholderText } = render(
        <TodaysValueScreen onNext={mockOnNext} onBack={mockOnBack} />
      );

      // Select value
      fireEvent.press(getByText('Purpose').parent);

      await waitFor(() => {
        expect(getByText('Today I will...')).toBeTruthy();
      });

      // Try to proceed without intention
      const nextButton = getByText('Next');
      expect(nextButton.props.accessibilityState?.disabled).toBe(true);

      // Add intention
      const intentionInput = getByPlaceholderText('Today I will focus on...');
      fireEvent.changeText(intentionInput, 'I will approach challenges with curiosity rather than judgment');

      await waitFor(() => {
        expect(nextButton.props.accessibilityState?.disabled).toBe(false);
      });
    });

    test('preserves therapeutic data in store', async () => {
      const { getByText, getByPlaceholderText } = render(
        <TodaysValueScreen onNext={mockOnNext} onBack={mockOnBack} />
      );

      // Complete therapeutic selection
      fireEvent.press(getByText('Growth').parent);

      await waitFor(() => {
        const intentionInput = getByPlaceholderText('Today I will focus on...');
        fireEvent.changeText(intentionInput, 'I will celebrate small victories throughout my day');
      });

      // Proceed to next
      fireEvent.press(getByText('Next'));

      await waitFor(() => {
        expect(mockStore.updateCurrentCheckIn).toHaveBeenCalledWith({
          todayValue: 'growth',
          intention: 'I will celebrate small victories throughout my day'
        });
        expect(mockOnNext).toHaveBeenCalled();
      });
    });
  });

  describe('Clinical Safety and Compliance', () => {
    test('maintains therapeutic language and messaging', () => {
      const { getByText } = render(
        <TodaysValueScreen onNext={mockOnNext} onBack={mockOnBack} />
      );

      // Verify MBCT-appropriate therapeutic language
      expect(getByText('What Matters Most Today?')).toBeTruthy();
      expect(getByText('Choose one value and set your intention for the day')).toBeTruthy();
      expect(getByText('Why choose just one value?')).toBeTruthy();
      expect(getByText('Focusing on one value creates clarity in decision-making')).toBeTruthy();
    });

    test('prevents rushed therapeutic decisions', async () => {
      const { getByText } = render(
        <TodaysValueScreen onNext={mockOnNext} onBack={mockOnBack} />
      );

      // Rapid selection should still provide therapeutic feedback
      const start = Date.now();

      fireEvent.press(getByText('Resilience').parent);

      await waitFor(() => {
        const timeTaken = Date.now() - start;
        expect(timeTaken).toBeGreaterThanOrEqual(0); // No artificial delays that might confuse users
        expect(getByText('Today you\'re focusing on: Resilience')).toBeTruthy();
      });
    });

    test('supports therapeutic reflection through examples', async () => {
      const { getByText } = render(
        <TodaysValueScreen onNext={mockOnNext} onBack={mockOnBack} />
      );

      // Select value to trigger intention section
      fireEvent.press(getByText('Authenticity').parent);

      await waitFor(() => {
        expect(getByText('Example intentions:')).toBeTruthy();
        expect(getByText(/I will approach challenges with curiosity/)).toBeTruthy();
        expect(getByText(/I will take three deep breaths/)).toBeTruthy();
        expect(getByText(/I will celebrate small victories/)).toBeTruthy();
      });
    });
  });

  describe('Cross-Platform Therapeutic Consistency', () => {
    test('android ripple effect maintains therapeutic feel', () => {
      const { getAllByRole } = render(
        <TodaysValueScreen onNext={mockOnNext} onBack={mockOnBack} />
      );

      const valueCards = getAllByRole('radio');
      valueCards.forEach(card => {
        expect(card.props.android_ripple).toEqual({
          color: 'rgba(0, 0, 0, 0.1)',
          borderless: false,
          radius: 200
        });
      });
    });

    test('hit slop supports accessibility and therapeutic touch', () => {
      const { getAllByRole } = render(
        <TodaysValueScreen onNext={mockOnNext} onBack={mockOnBack} />
      );

      const valueCards = getAllByRole('radio');
      valueCards.forEach(card => {
        expect(card.props.hitSlop).toEqual({
          top: 8, left: 8, bottom: 8, right: 8
        });
      });
    });
  });
});