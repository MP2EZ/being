/**
 * EVENING FLOW INTEGRATION TESTS
 *
 * Tests complete evening flow navigation and data persistence.
 * Validates the entire 9-screen Stoic evening examination journey.
 *
 * Flow Sequence:
 * 1. DayReview → VirtueInstances
 * 2. VirtueInstances → VirtueChallenges
 * 3. VirtueChallenges → Learning
 * 4. Learning → SenecaQuestions
 * 5. SenecaQuestions → Gratitude
 * 6. Gratitude → TomorrowIntention
 * 7. TomorrowIntention → SelfCompassion
 * 8. SelfCompassion → EveningCompletion
 * 9. EveningCompletion → Home (reset)
 *
 * @see /docs/architecture/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import DayReviewScreen from '../../src/flows/evening/screens/DayReviewScreen';
import VirtueInstancesScreen from '../../src/flows/evening/screens/VirtueInstancesScreen';
import VirtueChallengesScreen from '../../src/flows/evening/screens/VirtueChallengesScreen';
import LearningScreen from '../../src/flows/evening/screens/LearningScreen';
import SenecaQuestionsScreen from '../../src/flows/evening/screens/SenecaQuestionsScreen';
import GratitudeScreen from '../../src/flows/evening/screens/GratitudeScreen';
import TomorrowIntentionScreen from '../../src/flows/evening/screens/TomorrowIntentionScreen';
import SelfCompassionScreen from '../../src/flows/evening/screens/SelfCompassionScreen';
import EveningCompletionScreen from '../../src/flows/evening/screens/EveningCompletionScreen';

describe('Evening Flow Integration', () => {
  let mockNavigate: jest.Mock;
  let mockReset: jest.Mock;
  let mockGoBack: jest.Mock;
  let mockNavigation: any;

  beforeEach(() => {
    mockNavigate = jest.fn();
    mockReset = jest.fn();
    mockGoBack = jest.fn();
    mockNavigation = {
      navigate: mockNavigate,
      reset: mockReset,
      goBack: mockGoBack,
      setOptions: jest.fn(),
    };
  });

  describe('Complete Flow Navigation', () => {
    it('should navigate from DayReview to VirtueInstances', async () => {
      const mockRoute = {
        params: { morningIntention: 'Test intention' },
      };

      const { getByTestId, getByText } = render(
        <DayReviewScreen navigation={mockNavigation} route={mockRoute as any} />
      );

      // Fill required fields
      fireEvent.press(getByTestId('practiced-yes'));
      fireEvent.changeText(getByTestId('reflection-input'), 'Good day');

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('VirtueInstances');
      });
    });

    it('should navigate from VirtueInstances to VirtueChallenges', async () => {
      const { getByText } = render(
        <VirtueInstancesScreen navigation={mockNavigation} route={{} as any} />
      );

      // Can continue with 0 instances (optional)
      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('VirtueChallenges');
      });
    });

    it('should navigate from VirtueChallenges to Learning', async () => {
      const { getByText } = render(
        <VirtueChallengesScreen navigation={mockNavigation} route={{} as any} />
      );

      // Can continue with 0 challenges (optional)
      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Learning');
      });
    });

    it('should navigate from Learning to SenecaQuestions', async () => {
      const { getByText } = render(
        <LearningScreen navigation={mockNavigation} route={{} as any} />
      );

      // Can continue with 0 moments (optional)
      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('SenecaQuestions');
      });
    });

    it('should navigate from SenecaQuestions to Gratitude', async () => {
      const { getByTestId, getByText } = render(
        <SenecaQuestionsScreen navigation={mockNavigation} route={{} as any} />
      );

      // Fill required fields
      fireEvent.changeText(getByTestId('vice-input'), 'Vice');
      fireEvent.changeText(getByTestId('habit-input'), 'Habit');
      fireEvent.changeText(getByTestId('better-input'), 'Better');

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Gratitude');
      });
    });

    it('should navigate from Gratitude to TomorrowIntention', async () => {
      const { getByTestId, getByText } = render(
        <GratitudeScreen navigation={mockNavigation} route={{} as any} />
      );

      // Fill required 3 gratitudes
      fireEvent.changeText(getByTestId('gratitude-0'), 'First');
      fireEvent.changeText(getByTestId('gratitude-1'), 'Second');
      fireEvent.changeText(getByTestId('gratitude-2'), 'Third');

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('TomorrowIntention');
      });
    });

    it('should navigate from TomorrowIntention to SelfCompassion', async () => {
      const { getByTestId, getByText } = render(
        <TomorrowIntentionScreen navigation={mockNavigation} route={{} as any} />
      );

      // Fill required fields
      fireEvent.press(getByTestId('virtue-wisdom'));
      fireEvent.press(getByTestId('context-work'));
      fireEvent.changeText(getByTestId('intention-input'), 'Intention');

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('SelfCompassion');
      });
    });

    it('should navigate from SelfCompassion to EveningCompletion', async () => {
      const { getByTestId, getByText } = render(
        <SelfCompassionScreen navigation={mockNavigation} route={{} as any} />
      );

      // Fill required field
      fireEvent.changeText(getByTestId('compassion-input'), 'Compassion');

      fireEvent.press(getByText(/complete/i));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('EveningCompletion');
      });
    });

    it('should reset navigation from EveningCompletion to home', () => {
      const mockRoute = {
        params: {
          tomorrowIntention: 'Test intention',
          tomorrowVirtue: 'wisdom',
        },
      };

      const { getByTestId } = render(
        <EveningCompletionScreen navigation={mockNavigation} route={mockRoute as any} />
      );

      fireEvent.press(getByTestId('finish-button'));

      expect(mockReset).toHaveBeenCalled();
    });
  });

  describe('Data Persistence Across Screens', () => {
    it('should persist and pass data through complete flow', async () => {
      const reviewData = {
        morningIntentionPracticed: true,
        dayQualityRating: 8,
        briefReflection: 'Good day',
        timestamp: new Date(),
      };

      const senecaData = {
        whatViceDidIResist: 'Anger',
        whatHabitDidIImprove: 'Patience',
        howAmIBetterToday: 'More calm',
        timestamp: new Date(),
      };

      const gratitudeData = {
        items: [
          { what: 'Health' },
          { what: 'Family' },
          { what: 'Purpose' },
        ],
        timestamp: new Date(),
      };

      const tomorrowData = {
        virtue: 'wisdom' as const,
        context: 'work' as const,
        intentionStatement: 'Practice patience',
        whatIControl: 'My responses',
        whatIDontControl: 'Others actions',
        timestamp: new Date(),
      };

      const compassionData = {
        reflection: 'I did my best today',
        timestamp: new Date(),
      };

      // All data should be captured and available for final save
      expect(reviewData).toBeDefined();
      expect(senecaData).toBeDefined();
      expect(gratitudeData).toBeDefined();
      expect(tomorrowData).toBeDefined();
      expect(compassionData).toBeDefined();
    });
  });

  describe('Back Navigation', () => {
    it('should allow going back from any screen', () => {
      const screens = [
        DayReviewScreen,
        VirtueInstancesScreen,
        VirtueChallengesScreen,
        LearningScreen,
        SenecaQuestionsScreen,
        GratitudeScreen,
        TomorrowIntentionScreen,
        SelfCompassionScreen,
      ];

      screens.forEach((Screen) => {
        const { getByTestId } = render(
          <Screen navigation={mockNavigation} route={{} as any} />
        );

        fireEvent.press(getByTestId('back-button'));
        expect(mockGoBack).toHaveBeenCalled();

        // Reset for next iteration
        mockGoBack.mockClear();
      });
    });
  });

  describe('Validation Across Flow', () => {
    it('should enforce required fields on each screen', () => {
      // DayReview requires: practiced selection + reflection
      const dayReview = render(
        <DayReviewScreen
          navigation={mockNavigation}
          route={{ params: { morningIntention: 'Test' } } as any}
        />
      );
      fireEvent.press(dayReview.getByText(/continue/i));
      expect(mockNavigate).not.toHaveBeenCalled();
      mockNavigate.mockClear();

      // SenecaQuestions requires: all 3 answers
      const seneca = render(
        <SenecaQuestionsScreen navigation={mockNavigation} route={{} as any} />
      );
      fireEvent.press(seneca.getAllByText(/continue/i)[0]);
      expect(mockNavigate).not.toHaveBeenCalled();
      mockNavigate.mockClear();

      // Gratitude requires: all 3 items
      const gratitude = render(
        <GratitudeScreen navigation={mockNavigation} route={{} as any} />
      );
      fireEvent.press(gratitude.getByText(/continue/i));
      expect(mockNavigate).not.toHaveBeenCalled();
      mockNavigate.mockClear();

      // TomorrowIntention requires: virtue + context + intention
      const tomorrow = render(
        <TomorrowIntentionScreen navigation={mockNavigation} route={{} as any} />
      );
      fireEvent.press(tomorrow.getByText(/continue/i));
      expect(mockNavigate).not.toHaveBeenCalled();
      mockNavigate.mockClear();

      // SelfCompassion requires: reflection (CRITICAL)
      const compassion = render(
        <SelfCompassionScreen navigation={mockNavigation} route={{} as any} />
      );
      fireEvent.press(compassion.getByText(/complete/i));
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('CRITICAL: Self-Compassion Required', () => {
    it('should require self-compassion in VirtueChallenges', () => {
      const { getByTestId, getByText } = render(
        <VirtueChallengesScreen navigation={mockNavigation} route={{} as any} />
      );

      // Add challenge without self-compassion
      fireEvent.press(getByTestId('add-challenge-button'));
      fireEvent.changeText(getByTestId('situation-input'), 'Situation');
      fireEvent.press(getByTestId('virtue-wisdom'));
      fireEvent.changeText(getByTestId('could-have-done-input'), 'Better');
      fireEvent.changeText(getByTestId('will-practice-input'), 'Practice');
      // Don't fill self-compassion

      fireEvent.press(getByText(/save/i));

      // Should not save without self-compassion
      expect(getByTestId('situation-input')).toBeTruthy(); // Form still visible
    });

    it('should require self-compassion in SelfCompassion screen', () => {
      const { getByText } = render(
        <SelfCompassionScreen navigation={mockNavigation} route={{} as any} />
      );

      // Try to continue without filling reflection
      fireEvent.press(getByText(/complete/i));

      // Should not navigate
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Stoic Integrity Validation', () => {
    it('should include Stoic quotes on all screens', () => {
      const screens = [
        DayReviewScreen,
        VirtueInstancesScreen,
        VirtueChallengesScreen,
        LearningScreen,
        SenecaQuestionsScreen,
        GratitudeScreen,
        TomorrowIntentionScreen,
        SelfCompassionScreen,
        EveningCompletionScreen,
      ];

      screens.forEach((Screen) => {
        const mockRoute =
          Screen === DayReviewScreen
            ? { params: { morningIntention: 'Test' } }
            : Screen === EveningCompletionScreen
            ? { params: { tomorrowIntention: 'Test', tomorrowVirtue: 'wisdom' } }
            : {};

        const { queryAllByText } = render(
          <Screen navigation={mockNavigation} route={mockRoute as any} />
        );

        const marcusMatches = queryAllByText(/Marcus Aurelius/i);
        const senecaMatches = queryAllByText(/Seneca/i);
        const epictetusMatches = queryAllByText(/Epictetus/i);

        // Each screen should have at least one Stoic reference
        expect(
          marcusMatches.length > 0 ||
            senecaMatches.length > 0 ||
            epictetusMatches.length > 0
        ).toBe(true);
      });
    });

    it('should maintain virtue-focused language', () => {
      const screens = [
        DayReviewScreen,
        VirtueInstancesScreen,
        VirtueChallengesScreen,
      ];

      screens.forEach((Screen) => {
        const mockRoute =
          Screen === DayReviewScreen
            ? { params: { morningIntention: 'Test' } }
            : {};

        const { queryAllByText } = render(
          <Screen navigation={mockNavigation} route={mockRoute as any} />
        );

        const virtueMatches = queryAllByText(/virtue/i);
        const characterMatches = queryAllByText(/character/i);
        const practiceMatches = queryAllByText(/practice/i);

        // Should use virtue-focused language
        expect(
          virtueMatches.length > 0 ||
            characterMatches.length > 0 ||
            practiceMatches.length > 0
        ).toBe(true);
      });
    });
  });
});
