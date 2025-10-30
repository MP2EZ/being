/**
 * SELF-COMPASSION SCREEN TESTS
 *
 * Tests for REQUIRED self-compassion reflection screen.
 * Philosopher-validated (9.5/10) - CRITICAL for preventing harsh Stoicism.
 *
 * TDD Approach: Tests written first, screen implemented to pass tests.
 *
 * Screen Requirements:
 * - Display importance of self-compassion in Stoic practice
 * - Require self-compassion reflection (prevents harsh judgment)
 * - Navigate to EveningCompletion screen
 *
 * Classical Stoic Practice:
 * - Marcus Aurelius: "Be tolerant with others and strict with yourself"
 *   (Meditations 10:4) - But NOT harshly strict!
 * - Seneca: "We are more often frightened than hurt; and we suffer more in
 *   imagination than in reality" (Letters 13:4) - Self-compassion prevents
 *   exaggerating our failures
 * - Epictetus: "If a person gave away your body to some passerby, you'd be
 *   furious. Yet you hand over your mind to anyone who comes along, so they
 *   may abuse you, leaving it disturbed and troubled — have you no shame in
 *   that?" (Enchiridion 28) - Treat yourself with respect
 *
 * CRITICAL PURPOSE: This screen is REQUIRED to maintain 9.5/10 philosopher
 * validation. Without self-compassion, Stoicism can become harsh and
 * counterproductive. Modern research shows self-compassion enhances resilience.
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SelfCompassionScreen from '../../../src/flows/evening/screens/SelfCompassionScreen';
import type { SelfCompassionData } from '../../../src/types/flows';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

describe('SelfCompassionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Screen Rendering', () => {
    it('should render self-compassion screen', () => {
      const { queryAllByText } = render(
        <SelfCompassionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const compassionMatches = queryAllByText(/compassion/i);
      const kindnessMatches = queryAllByText(/kindness/i);

      expect(compassionMatches.length > 0 || kindnessMatches.length > 0).toBe(true);
    });

    it('should explain importance of self-compassion', () => {
      const { queryAllByText } = render(
        <SelfCompassionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const harshMatches = queryAllByText(/harsh/i);
      const balanceMatches = queryAllByText(/balance/i);
      const gentleMatches = queryAllByText(/gentle/i);

      expect(
        harshMatches.length > 0 || balanceMatches.length > 0 || gentleMatches.length > 0
      ).toBe(true);
    });
  });

  describe('Self-Compassion Reflection', () => {
    it('should show reflection input', () => {
      const { getByTestId } = render(
        <SelfCompassionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('compassion-input')).toBeTruthy();
    });

    it('should allow entering reflection', () => {
      const { getByTestId } = render(
        <SelfCompassionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const input = getByTestId('compassion-input');
      fireEvent.changeText(
        input,
        'I did my best today. Tomorrow is another opportunity to practice.'
      );

      expect(input.props.value).toBe(
        'I did my best today. Tomorrow is another opportunity to practice.'
      );
    });

    it('should REQUIRE reflection (CRITICAL)', () => {
      const { getByText } = render(
        <SelfCompassionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Don't fill reflection
      fireEvent.press(getByText(/complete/i) || getByText(/continue/i));

      // Should not navigate without reflection
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Data Persistence', () => {
    it('should save reflection on complete', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <SelfCompassionScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.changeText(
        getByTestId('compassion-input'),
        'I practiced virtue today and will continue tomorrow'
      );

      fireEvent.press(getByText(/complete/i) || getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            reflection: 'I practiced virtue today and will continue tomorrow',
            timestamp: expect.any(Date),
          })
        );
      });
    });

    it('should trim whitespace from reflection', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <SelfCompassionScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.changeText(getByTestId('compassion-input'), '  Reflection  ');

      fireEvent.press(getByText(/complete/i) || getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            reflection: 'Reflection',
          })
        );
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to evening completion on complete', async () => {
      const { getByTestId, getByText } = render(
        <SelfCompassionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.changeText(getByTestId('compassion-input'), 'Compassion reflection');

      fireEvent.press(getByText(/complete/i) || getByText(/continue/i));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('EveningCompletion');
      });
    });

    it('should allow going back', () => {
      const { getByTestId } = render(
        <SelfCompassionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('back-button'));
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible label for input', () => {
      const { getByTestId } = render(
        <SelfCompassionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('compassion-input').props.accessibilityLabel).toBeTruthy();
    });
  });

  describe('Validation', () => {
    it('should require reflection to continue', () => {
      const { getByText } = render(
        <SelfCompassionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Don't fill anything
      fireEvent.press(getByText(/complete/i) || getByText(/continue/i));

      // Should not navigate
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Stoic Guidance', () => {
    it('should show Stoic wisdom about self-compassion', () => {
      const { queryAllByText } = render(
        <SelfCompassionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const marcusMatches = queryAllByText(/Marcus Aurelius/i);
      const senecaMatches = queryAllByText(/Seneca/i);
      const tolerantMatches = queryAllByText(/tolerant/i);
      const gentleMatches = queryAllByText(/gentle/i);

      expect(
        marcusMatches.length > 0 ||
          senecaMatches.length > 0 ||
          tolerantMatches.length > 0 ||
          gentleMatches.length > 0
      ).toBe(true);
    });
  });

  describe('CRITICAL: Prevents Harsh Stoicism', () => {
    it('should emphasize balance not harshness', () => {
      const { queryAllByText } = render(
        <SelfCompassionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const harshMatches = queryAllByText(/harsh/i);
      const balanceMatches = queryAllByText(/balance/i);
      const kindMatches = queryAllByText(/kind/i);

      // Should mention avoiding harshness or promoting balance/kindness
      expect(
        harshMatches.length > 0 || balanceMatches.length > 0 || kindMatches.length > 0
      ).toBe(true);
    });
  });
});
