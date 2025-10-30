/**
 * VIRTUE CHALLENGES SCREEN TESTS
 *
 * Tests for recording struggles with virtue practice (+ REQUIRED self-compassion).
 * Philosopher-validated (9.5/10) - aligns with Architecture v1.0.
 *
 * TDD Approach: Tests written first, screen implemented to pass tests.
 *
 * Screen Requirements:
 * - Allow adding multiple virtue challenges (0-5 recommended)
 * - Each challenge captures:
 *   - Situation description
 *   - Virtue violated (wisdom, courage, justice, temperance)
 *   - What I could have done instead
 *   - Optional: Trigger identified
 *   - What I'll practice next time
 *   - Self-compassion reflection (REQUIRED - non-negotiable!)
 * - Display list of added challenges with edit/delete
 * - Navigate to Learning screen
 *
 * Classical Stoic Practice:
 * - Seneca: "What infirmity have I mastered today? What passions opposed? What
 *   temptation resisted? In what respect am I better?" (Letters 28:10) - Balanced
 *   examination includes acknowledging where we fell short
 * - Marcus Aurelius: "When you have stumbled, do not dwell on the stumble but
 *   on the lesson" (Meditations 8:51) - Focus on learning, not self-criticism
 * - Epictetus: "Don't be ashamed to need help. Like a soldier storming a wall,
 *   you have a mission to accomplish. And if you've been wounded and can't climb
 *   it alone, wouldn't it be better to accept a comrade's help?" (Discourses 1:18)
 *   - Accept your limitations with compassion
 *
 * CRITICAL: Self-compassion field is REQUIRED for every challenge. This prevents
 * harsh Stoicism and maintains philosopher validation (9.5/10 rating). Without it,
 * this becomes self-flagellation, not Stoic examination.
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import VirtueChallengesScreen from '../../../src/flows/evening/screens/VirtueChallengesScreen';
import type { VirtueChallenge } from '../../../src/types/stoic';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

describe('VirtueChallengesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Screen Rendering', () => {
    it('should render virtue challenges screen', () => {
      const { queryAllByText } = render(
        <VirtueChallengesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Check for challenge-related text
      const challengeMatches = queryAllByText(/challenge/i);
      const struggleMatches = queryAllByText(/struggle/i);

      expect(challengeMatches.length > 0 || struggleMatches.length > 0).toBe(true);
    });

    it('should show add challenge button', () => {
      const { getByTestId } = render(
        <VirtueChallengesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('add-challenge-button')).toBeTruthy();
    });

    it('should show empty state initially', () => {
      const { getByText } = render(
        <VirtueChallengesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(
        getByText(/no challenges yet/i) ||
        getByText(/add your first/i) ||
        getByText(/0 challenges/i)
      ).toBeTruthy();
    });
  });

  describe('Adding Virtue Challenges', () => {
    it('should show add form when add button pressed', () => {
      const { getByTestId, queryByTestId } = render(
        <VirtueChallengesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Form should not be visible initially
      expect(queryByTestId('situation-input')).toBeNull();

      fireEvent.press(getByTestId('add-challenge-button'));

      // Form should now be visible
      expect(queryByTestId('situation-input')).toBeTruthy();
    });

    it('should show situation input', () => {
      const { getByTestId } = render(
        <VirtueChallengesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-challenge-button'));

      expect(getByTestId('situation-input')).toBeTruthy();
    });

    it('should allow entering situation', () => {
      const { getByTestId } = render(
        <VirtueChallengesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-challenge-button'));

      const input = getByTestId('situation-input');
      fireEvent.changeText(input, 'Lost my temper during meeting');

      expect(input.props.value).toBe('Lost my temper during meeting');
    });

    it('should show four virtue violated options', () => {
      const { getByTestId } = render(
        <VirtueChallengesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-challenge-button'));

      expect(getByTestId('virtue-wisdom')).toBeTruthy();
      expect(getByTestId('virtue-courage')).toBeTruthy();
      expect(getByTestId('virtue-justice')).toBeTruthy();
      expect(getByTestId('virtue-temperance')).toBeTruthy();
    });

    it('should allow selecting a virtue violated', () => {
      const { getByTestId } = render(
        <VirtueChallengesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-challenge-button'));

      const temperanceButton = getByTestId('virtue-temperance');
      fireEvent.press(temperanceButton);

      expect(temperanceButton.props.accessibilityState.selected).toBe(true);
    });

    it('should show what I could have done input', () => {
      const { getByTestId } = render(
        <VirtueChallengesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-challenge-button'));

      expect(getByTestId('could-have-done-input')).toBeTruthy();
    });

    it('should show what I will practice input', () => {
      const { getByTestId } = render(
        <VirtueChallengesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-challenge-button'));

      expect(getByTestId('will-practice-input')).toBeTruthy();
    });

    it('should show REQUIRED self-compassion input', () => {
      const { getByTestId } = render(
        <VirtueChallengesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-challenge-button'));

      const compassionInput = getByTestId('self-compassion-input');
      expect(compassionInput).toBeTruthy();
      // Should NOT be marked as optional
    });

    it('should show optional trigger input', () => {
      const { getByTestId } = render(
        <VirtueChallengesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-challenge-button'));

      expect(getByTestId('trigger-input')).toBeTruthy();
    });

    it('should allow saving challenge with all required fields', async () => {
      const { getByTestId, getByText } = render(
        <VirtueChallengesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-challenge-button'));

      fireEvent.changeText(getByTestId('situation-input'), 'Lost temper');
      fireEvent.press(getByTestId('virtue-temperance'));
      fireEvent.changeText(getByTestId('could-have-done-input'), 'Paused and breathed');
      fireEvent.changeText(getByTestId('will-practice-input'), 'Count to 10');
      fireEvent.changeText(
        getByTestId('self-compassion-input'),
        'I am human and learning'
      );

      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      await waitFor(() => {
        expect(getByText('Lost temper')).toBeTruthy();
      });
    });

    it('should require situation', () => {
      const { getByTestId, getByText } = render(
        <VirtueChallengesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-challenge-button'));

      // Don't enter situation
      fireEvent.press(getByTestId('virtue-temperance'));
      fireEvent.changeText(getByTestId('could-have-done-input'), 'Something');
      fireEvent.changeText(getByTestId('will-practice-input'), 'Something');
      fireEvent.changeText(getByTestId('self-compassion-input'), 'Compassion');

      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      // Should not save without situation
      expect(getByTestId('situation-input')).toBeTruthy(); // Form still visible
    });

    it('should require virtue selection', () => {
      const { getByTestId, getByText } = render(
        <VirtueChallengesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-challenge-button'));

      fireEvent.changeText(getByTestId('situation-input'), 'Situation');
      // Don't select virtue
      fireEvent.changeText(getByTestId('could-have-done-input'), 'Something');
      fireEvent.changeText(getByTestId('will-practice-input'), 'Something');
      fireEvent.changeText(getByTestId('self-compassion-input'), 'Compassion');

      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      // Should not save without virtue
      expect(getByTestId('situation-input')).toBeTruthy();
    });

    it('should require what I could have done', () => {
      const { getByTestId, getByText } = render(
        <VirtueChallengesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-challenge-button'));

      fireEvent.changeText(getByTestId('situation-input'), 'Situation');
      fireEvent.press(getByTestId('virtue-temperance'));
      // Don't enter could have done
      fireEvent.changeText(getByTestId('will-practice-input'), 'Something');
      fireEvent.changeText(getByTestId('self-compassion-input'), 'Compassion');

      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      // Should not save
      expect(getByTestId('situation-input')).toBeTruthy();
    });

    it('should require what I will practice', () => {
      const { getByTestId, getByText } = render(
        <VirtueChallengesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-challenge-button'));

      fireEvent.changeText(getByTestId('situation-input'), 'Situation');
      fireEvent.press(getByTestId('virtue-temperance'));
      fireEvent.changeText(getByTestId('could-have-done-input'), 'Something');
      // Don't enter will practice
      fireEvent.changeText(getByTestId('self-compassion-input'), 'Compassion');

      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      // Should not save
      expect(getByTestId('situation-input')).toBeTruthy();
    });

    it('should REQUIRE self-compassion (CRITICAL)', () => {
      const { getByTestId, getByText } = render(
        <VirtueChallengesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-challenge-button'));

      fireEvent.changeText(getByTestId('situation-input'), 'Situation');
      fireEvent.press(getByTestId('virtue-temperance'));
      fireEvent.changeText(getByTestId('could-have-done-input'), 'Something');
      fireEvent.changeText(getByTestId('will-practice-input'), 'Something');
      // Don't enter self-compassion - this should fail validation

      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      // Should NOT save without self-compassion
      expect(getByTestId('situation-input')).toBeTruthy(); // Form still visible
    });

    it('should allow optional trigger', async () => {
      const { getByTestId, getByText } = render(
        <VirtueChallengesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-challenge-button'));

      fireEvent.changeText(getByTestId('situation-input'), 'Lost temper');
      fireEvent.press(getByTestId('virtue-temperance'));
      fireEvent.changeText(getByTestId('could-have-done-input'), 'Paused');
      fireEvent.changeText(getByTestId('will-practice-input'), 'Count to 10');
      fireEvent.changeText(getByTestId('self-compassion-input'), 'Learning');
      fireEvent.changeText(getByTestId('trigger-input'), 'Feeling rushed');

      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      await waitFor(() => {
        expect(getByText('Lost temper')).toBeTruthy();
      });
    });
  });

  describe('Challenge List Management', () => {
    it('should display added challenges', async () => {
      const { getByTestId, getByText } = render(
        <VirtueChallengesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-challenge-button'));

      fireEvent.changeText(getByTestId('situation-input'), 'First challenge');
      fireEvent.press(getByTestId('virtue-temperance'));
      fireEvent.changeText(getByTestId('could-have-done-input'), 'Paused');
      fireEvent.changeText(getByTestId('will-practice-input'), 'Breathe');
      fireEvent.changeText(getByTestId('self-compassion-input'), 'Learning');

      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      await waitFor(() => {
        expect(getByText('First challenge')).toBeTruthy();
        expect(getByText(/temperance/i)).toBeTruthy();
      });
    });

    it('should allow adding multiple challenges', async () => {
      const { getByTestId, getByText } = render(
        <VirtueChallengesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Add first
      fireEvent.press(getByTestId('add-challenge-button'));
      fireEvent.changeText(getByTestId('situation-input'), 'First');
      fireEvent.press(getByTestId('virtue-temperance'));
      fireEvent.changeText(getByTestId('could-have-done-input'), 'X');
      fireEvent.changeText(getByTestId('will-practice-input'), 'Y');
      fireEvent.changeText(getByTestId('self-compassion-input'), 'Z');
      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      await waitFor(() => {
        expect(getByText('First')).toBeTruthy();
      });

      // Add second
      fireEvent.press(getByTestId('add-challenge-button'));
      fireEvent.changeText(getByTestId('situation-input'), 'Second');
      fireEvent.press(getByTestId('virtue-wisdom'));
      fireEvent.changeText(getByTestId('could-have-done-input'), 'A');
      fireEvent.changeText(getByTestId('will-practice-input'), 'B');
      fireEvent.changeText(getByTestId('self-compassion-input'), 'C');
      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      await waitFor(() => {
        expect(getByText('First')).toBeTruthy();
        expect(getByText('Second')).toBeTruthy();
      });
    });

    it('should allow deleting challenge', async () => {
      const { getByTestId, getByText, queryByText } = render(
        <VirtueChallengesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Add challenge
      fireEvent.press(getByTestId('add-challenge-button'));
      fireEvent.changeText(getByTestId('situation-input'), 'To delete');
      fireEvent.press(getByTestId('virtue-temperance'));
      fireEvent.changeText(getByTestId('could-have-done-input'), 'X');
      fireEvent.changeText(getByTestId('will-practice-input'), 'Y');
      fireEvent.changeText(getByTestId('self-compassion-input'), 'Z');
      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      await waitFor(() => {
        expect(getByText('To delete')).toBeTruthy();
      });

      // Delete
      fireEvent.press(getByTestId('delete-challenge-0'));

      await waitFor(() => {
        expect(queryByText('To delete')).toBeNull();
      });
    });

    it('should show challenge count', async () => {
      const { getByTestId, getByText } = render(
        <VirtueChallengesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Add challenge
      fireEvent.press(getByTestId('add-challenge-button'));
      fireEvent.changeText(getByTestId('situation-input'), 'Challenge');
      fireEvent.press(getByTestId('virtue-temperance'));
      fireEvent.changeText(getByTestId('could-have-done-input'), 'X');
      fireEvent.changeText(getByTestId('will-practice-input'), 'Y');
      fireEvent.changeText(getByTestId('self-compassion-input'), 'Z');
      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      await waitFor(() => {
        expect(getByText(/1 challenge/i) || getByText(/1 struggle/i)).toBeTruthy();
      });
    });
  });

  describe('Data Persistence', () => {
    it('should save challenges on continue', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <VirtueChallengesScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      // Add challenge
      fireEvent.press(getByTestId('add-challenge-button'));
      fireEvent.changeText(getByTestId('situation-input'), 'Test situation');
      fireEvent.press(getByTestId('virtue-temperance'));
      fireEvent.changeText(getByTestId('could-have-done-input'), 'Paused');
      fireEvent.changeText(getByTestId('trigger-input'), 'Feeling rushed');
      fireEvent.changeText(getByTestId('will-practice-input'), 'Count to 10');
      fireEvent.changeText(getByTestId('self-compassion-input'), 'I am learning');
      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      await waitFor(() => {
        expect(getByText('Test situation')).toBeTruthy();
      });

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              situation: 'Test situation',
              virtueViolated: 'temperance',
              whatICouldHaveDone: 'Paused',
              triggerIdentified: 'Feeling rushed',
              whatWillIPractice: 'Count to 10',
              selfCompassion: 'I am learning', // REQUIRED
              timestamp: expect.any(Date),
            }),
          ])
        );
      });
    });

    it('should save empty array if no challenges added', async () => {
      const onSave = jest.fn();
      const { getByText } = render(
        <VirtueChallengesScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith([]);
      });
    });

    it('should trim whitespace from all text fields', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <VirtueChallengesScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.press(getByTestId('add-challenge-button'));
      fireEvent.changeText(getByTestId('situation-input'), '  Test  ');
      fireEvent.press(getByTestId('virtue-temperance'));
      fireEvent.changeText(getByTestId('could-have-done-input'), '  X  ');
      fireEvent.changeText(getByTestId('will-practice-input'), '  Y  ');
      fireEvent.changeText(getByTestId('self-compassion-input'), '  Z  ');
      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      await waitFor(() => {
        expect(getByText('Test')).toBeTruthy();
      });

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              situation: 'Test',
              whatICouldHaveDone: 'X',
              whatWillIPractice: 'Y',
              selfCompassion: 'Z',
            }),
          ])
        );
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to learning screen on continue', async () => {
      const { getByText } = render(
        <VirtueChallengesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Learning');
      });
    });

    it('should allow going back', () => {
      const { getByTestId } = render(
        <VirtueChallengesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('back-button'));
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for all inputs', () => {
      const { getByTestId } = render(
        <VirtueChallengesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-challenge-button'));

      expect(getByTestId('situation-input').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('virtue-temperance').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('could-have-done-input').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('will-practice-input').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('self-compassion-input').props.accessibilityLabel).toBeTruthy();
    });
  });

  describe('Stoic Guidance', () => {
    it('should show Stoic wisdom about learning from struggles', () => {
      const { queryAllByText } = render(
        <VirtueChallengesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Should show quote about learning, not dwelling on failures
      const senecaMatches = queryAllByText(/Seneca/i);
      const marcusMatches = queryAllByText(/Marcus Aurelius/i);
      const stumbleMatches = queryAllByText(/stumble/i);
      const lessonMatches = queryAllByText(/lesson/i);

      expect(
        senecaMatches.length > 0 ||
        marcusMatches.length > 0 ||
        stumbleMatches.length > 0 ||
        lessonMatches.length > 0
      ).toBe(true);
    });

    it('should emphasize self-compassion requirement', () => {
      const { getByText, getByTestId, queryAllByText } = render(
        <VirtueChallengesScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-challenge-button'));

      // Self-compassion should be emphasized as required
      const compassionMatches = queryAllByText(/self-compassion/i);
      const requiredMatches = queryAllByText(/required/i);
      const importantMatches = queryAllByText(/important/i);

      expect(compassionMatches.length > 0).toBe(true);
      expect(requiredMatches.length > 0 || importantMatches.length > 0).toBe(true);
    });
  });
});
