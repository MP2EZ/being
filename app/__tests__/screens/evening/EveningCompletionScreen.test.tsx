/**
 * EVENING COMPLETION SCREEN TESTS
 *
 * Tests for evening flow completion and summary screen.
 * Philosopher-validated (9.5/10) - aligns with Architecture v1.0.
 *
 * TDD Approach: Tests written first, screen implemented to pass tests.
 *
 * Screen Requirements:
 * - Display completion summary
 * - Show tomorrow's intention reminder
 * - Show encouragement for completing the practice
 * - Navigate back to home/main app
 *
 * Classical Stoic Practice:
 * - Marcus Aurelius: "You have power over your mind - not outside events.
 *   Realize this, and you will find strength" (Meditations 4:3)
 * - Seneca: "Each day acquire something that will fortify you against poverty,
 *   against death, indeed against other misfortunes as well; and after you have
 *   run over many thoughts, select one to be thoroughly digested that day"
 *   (Letters 2:1)
 * - Epictetus: "Don't hope that events will turn out the way you want, welcome
 *   events in whichever way they happen: this is the path to peace" (Enchiridion 8)
 *
 * Purpose: Complete the evening examination with encouragement and preparation
 * for tomorrow. This creates closure for today and readiness for tomorrow.
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import EveningCompletionScreen from '@/features/practices/evening/screens/EveningCompletionScreen';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
  reset: jest.fn(),
};

// Mock route with tomorrow's intention
const mockRoute = {
  params: {
    tomorrowIntention: 'Practice patience in difficult conversations',
    tomorrowVirtue: 'wisdom',
  },
};

describe('EveningCompletionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Screen Rendering', () => {
    it('should render completion screen', () => {
      const { queryAllByText } = render(
        <EveningCompletionScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      const completeMatches = queryAllByText(/complete/i);
      const doneMatches = queryAllByText(/done/i);
      const finishMatches = queryAllByText(/finish/i);

      expect(
        completeMatches.length > 0 || doneMatches.length > 0 || finishMatches.length > 0
      ).toBe(true);
    });

    it('should show congratulations or encouragement', () => {
      const { queryAllByText } = render(
        <EveningCompletionScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      const wellMatches = queryAllByText(/well done/i);
      const congratsMatches = queryAllByText(/congratulations/i);
      const excellentMatches = queryAllByText(/excellent/i);
      const practiceMatches = queryAllByText(/practice/i);

      expect(
        wellMatches.length > 0 ||
          congratsMatches.length > 0 ||
          excellentMatches.length > 0 ||
          practiceMatches.length > 0
      ).toBe(true);
    });
  });

  describe('Tomorrow Intention Reminder', () => {
    it('should display tomorrow intention', () => {
      const { getByText } = render(
        <EveningCompletionScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      expect(getByText('Practice patience in difficult conversations')).toBeTruthy();
    });

    it('should show tomorrow context', () => {
      const { queryAllByText } = render(
        <EveningCompletionScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      const tomorrowMatches = queryAllByText(/tomorrow/i);
      const intentionMatches = queryAllByText(/intention/i);

      expect(tomorrowMatches.length > 0 || intentionMatches.length > 0).toBe(true);
    });
  });

  describe('Summary Information', () => {
    it('should show completion summary', () => {
      const { queryAllByText } = render(
        <EveningCompletionScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      const examinationMatches = queryAllByText(/examination/i);
      const reflectionMatches = queryAllByText(/reflection/i);
      const completedMatches = queryAllByText(/completed/i);

      expect(
        examinationMatches.length > 0 ||
          reflectionMatches.length > 0 ||
          completedMatches.length > 0
      ).toBe(true);
    });
  });

  describe('Navigation', () => {
    it('should have finish button', () => {
      const { getByTestId } = render(
        <EveningCompletionScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      expect(getByTestId('finish-button')).toBeTruthy();
    });

    it('should navigate to home on finish', () => {
      const { getByTestId } = render(
        <EveningCompletionScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      fireEvent.press(getByTestId('finish-button'));

      // Should call reset to go back to home
      expect(mockNavigation.reset).toHaveBeenCalled();
    });
  });

  describe('Stoic Guidance', () => {
    it('should show Stoic wisdom about completion', () => {
      const { queryAllByText } = render(
        <EveningCompletionScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      const marcusMatches = queryAllByText(/Marcus Aurelius/i);
      const senecaMatches = queryAllByText(/Seneca/i);
      const epictetusMatches = queryAllByText(/Epictetus/i);
      const strengthMatches = queryAllByText(/strength/i);

      expect(
        marcusMatches.length > 0 ||
          senecaMatches.length > 0 ||
          epictetusMatches.length > 0 ||
          strengthMatches.length > 0
      ).toBe(true);
    });
  });

  describe('Encouragement', () => {
    it('should provide encouragement for completing practice', () => {
      const { queryAllByText } = render(
        <EveningCompletionScreen
          navigation={mockNavigation as any}
          route={mockRoute as any}
        />
      );

      const encouragementMatches = queryAllByText(/virtue|practice|growth|progress/i);

      expect(encouragementMatches.length > 0).toBe(true);
    });
  });
});
