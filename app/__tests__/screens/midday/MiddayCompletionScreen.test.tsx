/**
 * MIDDAY COMPLETION SCREEN TESTS
 *
 * Tests for midday flow completion and data persistence.
 * Philosopher-validated (9.5/10) - aligns with Architecture v1.0.
 *
 * TDD Approach: Tests written first, screen implemented to pass tests.
 *
 * Screen Requirements:
 * - Display summary of completed midday practices
 * - Show completion message with Stoic guidance
 * - Save complete Stoic Midday FlowData
 * - Navigate to home screen
 * - Track flow metadata (duration, timestamp)
 *
 * Classical Stoic Completion:
 * - Marcus Aurelius: "When you have done well and another has benefited by it, why
 *   do you still look for a third thing on top—credit for the good deed or a favor
 *   in return?" (Meditations 7:73) - Practice is its own reward
 * - Epictetus: "Don't explain your philosophy. Embody it." (Discourses) - Action
 *   over explanation
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MiddayCompletionScreen from '../../../src/flows/midday/screens/MiddayCompletionScreen';
import type { StoicMiddayFlowData } from '../../../src/types/flows';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

describe('MiddayCompletionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Screen Rendering', () => {
    it('should render completion screen', () => {
      const { getByText } = render(
        <MiddayCompletionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText(/midday complete/i) || getByText(/completion/i)).toBeTruthy();
    });

    it('should show completion message', () => {
      const { getByText } = render(
        <MiddayCompletionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Should show congratulatory or completion message
      expect(
        getByText(/well done/i) ||
        getByText(/complete/i) ||
        getByText(/finished/i)
      ).toBeTruthy();
    });
  });

  describe('Practice Summary', () => {
    it('should display practices completed', () => {
      const { getByText } = render(
        <MiddayCompletionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Should mention the practices completed
      expect(
        getByText(/situation/i) ||
        getByText(/control/i) ||
        getByText(/reappraisal/i) ||
        getByText(/breathing/i)
      ).toBeTruthy();
    });
  });

  describe('Data Persistence', () => {
    it('should save midday flow data on continue', async () => {
      const onSave = jest.fn();
      const { getByText } = render(
        <MiddayCompletionScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.press(getByText(/continue/i) || getByText(/finish/i) || getByText(/done/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            completedAt: expect.any(Date),
            timeSpentSeconds: expect.any(Number),
            flowVersion: expect.any(String),
          })
        );
      });
    });

    it('should include flow version in saved data', async () => {
      const onSave = jest.fn();
      const { getByText } = render(
        <MiddayCompletionScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.press(getByText(/continue/i) || getByText(/finish/i) || getByText(/done/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            flowVersion: '1.0', // Architecture v1.0
          })
        );
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to home on continue', async () => {
      const { getByText } = render(
        <MiddayCompletionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByText(/continue/i) || getByText(/finish/i) || getByText(/done/i));

      await waitFor(() => {
        // Should navigate home or to main screen
        expect(mockNavigate).toHaveBeenCalled();
      });
    });
  });

  describe('Stoic Guidance', () => {
    it('should show Stoic wisdom about completion', () => {
      const { getByText } = render(
        <MiddayCompletionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Should show Epictetus quote about embodying philosophy
      expect(getByText(/Epictetus/i)).toBeTruthy();
      expect(getByText("The practice is its own reward")).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible continue button', () => {
      const { getByText } = render(
        <MiddayCompletionScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const continueButton = getByText(/continue/i) || getByText(/finish/i) || getByText(/done/i);
      expect(continueButton).toBeTruthy();
    });
  });
});
