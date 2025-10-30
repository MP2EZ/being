/**
 * LEARNING SCREEN TESTS
 *
 * Tests for recording react vs respond moments (key Stoic practice).
 * Philosopher-validated (9.5/10) - aligns with Architecture v1.0.
 *
 * TDD Approach: Tests written first, screen implemented to pass tests.
 *
 * Screen Requirements:
 * - Allow adding multiple learning moments (0-3 recommended)
 * - Each moment captures:
 *   - Situation description
 *   - Response type: reacted, responded, or mixed
 *   - What I learned
 *   - What I'll practice next time
 * - Display list of added moments with delete
 * - Navigate to Seneca Questions screen
 *
 * Classical Stoic Practice:
 * - Epictetus: "Between stimulus and response there is a space. In that space is
 *   our power to choose our response" (Discourses) - The pause
 * - Marcus Aurelius: "You have power over your mind - not outside events. Realize
 *   this, and you will find strength" (Meditations 8:51) - Choosing response
 * - Seneca: "The wise man is not disturbed by insult; the ignorant man is angered
 *   by it" (On Anger 3:25) - Response vs reaction
 *
 * Purpose: Build awareness of react vs respond pattern. Reactions are automatic,
 * responses are chosen. This is core to Stoic emotional regulation.
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LearningScreen from '../../../src/flows/evening/screens/LearningScreen';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

describe('LearningScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Screen Rendering', () => {
    it('should render learning screen', () => {
      const { queryAllByText } = render(
        <LearningScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const learningMatches = queryAllByText(/learning/i);
      const reactMatches = queryAllByText(/react/i);
      const respondMatches = queryAllByText(/respond/i);

      expect(
        learningMatches.length > 0 || reactMatches.length > 0 || respondMatches.length > 0
      ).toBe(true);
    });

    it('should show add moment button', () => {
      const { getByTestId } = render(
        <LearningScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByTestId('add-moment-button')).toBeTruthy();
    });

    it('should show empty state initially', () => {
      const { getByText } = render(
        <LearningScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(
        getByText(/no moments yet/i) ||
        getByText(/add your first/i) ||
        getByText(/0 moments/i)
      ).toBeTruthy();
    });
  });

  describe('Adding Learning Moments', () => {
    it('should show add form when add button pressed', () => {
      const { getByTestId, queryByTestId } = render(
        <LearningScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(queryByTestId('situation-input')).toBeNull();

      fireEvent.press(getByTestId('add-moment-button'));

      expect(queryByTestId('situation-input')).toBeTruthy();
    });

    it('should show situation input', () => {
      const { getByTestId } = render(
        <LearningScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-moment-button'));

      expect(getByTestId('situation-input')).toBeTruthy();
    });

    it('should allow entering situation', () => {
      const { getByTestId } = render(
        <LearningScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-moment-button'));

      const input = getByTestId('situation-input');
      fireEvent.changeText(input, 'Traffic frustration');

      expect(input.props.value).toBe('Traffic frustration');
    });

    it('should show three response type options', () => {
      const { getByTestId } = render(
        <LearningScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-moment-button'));

      expect(getByTestId('response-reacted')).toBeTruthy();
      expect(getByTestId('response-responded')).toBeTruthy();
      expect(getByTestId('response-mixed')).toBeTruthy();
    });

    it('should allow selecting reacted', () => {
      const { getByTestId } = render(
        <LearningScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-moment-button'));

      const reactedButton = getByTestId('response-reacted');
      fireEvent.press(reactedButton);

      expect(reactedButton.props.accessibilityState.selected).toBe(true);
    });

    it('should allow selecting responded', () => {
      const { getByTestId } = render(
        <LearningScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-moment-button'));

      const respondedButton = getByTestId('response-responded');
      fireEvent.press(respondedButton);

      expect(respondedButton.props.accessibilityState.selected).toBe(true);
    });

    it('should allow selecting mixed', () => {
      const { getByTestId } = render(
        <LearningScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-moment-button'));

      const mixedButton = getByTestId('response-mixed');
      fireEvent.press(mixedButton);

      expect(mixedButton.props.accessibilityState.selected).toBe(true);
    });

    it('should show what I learned input', () => {
      const { getByTestId } = render(
        <LearningScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-moment-button'));

      expect(getByTestId('learned-input')).toBeTruthy();
    });

    it('should show what I will practice input', () => {
      const { getByTestId } = render(
        <LearningScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-moment-button'));

      expect(getByTestId('practice-input')).toBeTruthy();
    });

    it('should allow saving moment', async () => {
      const { getByTestId, getByText } = render(
        <LearningScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-moment-button'));

      fireEvent.changeText(getByTestId('situation-input'), 'Traffic');
      fireEvent.press(getByTestId('response-reacted'));
      fireEvent.changeText(getByTestId('learned-input'), 'Anger serves no purpose');
      fireEvent.changeText(getByTestId('practice-input'), 'Pause and breathe');

      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      await waitFor(() => {
        expect(getByText('Traffic')).toBeTruthy();
      });
    });

    it('should require situation', () => {
      const { getByTestId, getByText } = render(
        <LearningScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-moment-button'));

      // Don't enter situation
      fireEvent.press(getByTestId('response-reacted'));
      fireEvent.changeText(getByTestId('learned-input'), 'Learning');
      fireEvent.changeText(getByTestId('practice-input'), 'Practice');

      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      // Should not save
      expect(getByTestId('situation-input')).toBeTruthy();
    });

    it('should require response selection', () => {
      const { getByTestId, getByText } = render(
        <LearningScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-moment-button'));

      fireEvent.changeText(getByTestId('situation-input'), 'Situation');
      // Don't select response
      fireEvent.changeText(getByTestId('learned-input'), 'Learning');
      fireEvent.changeText(getByTestId('practice-input'), 'Practice');

      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      // Should not save
      expect(getByTestId('situation-input')).toBeTruthy();
    });

    it('should require what I learned', () => {
      const { getByTestId, getByText } = render(
        <LearningScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-moment-button'));

      fireEvent.changeText(getByTestId('situation-input'), 'Situation');
      fireEvent.press(getByTestId('response-reacted'));
      // Don't enter learned
      fireEvent.changeText(getByTestId('practice-input'), 'Practice');

      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      // Should not save
      expect(getByTestId('situation-input')).toBeTruthy();
    });

    it('should require what I will practice', () => {
      const { getByTestId, getByText } = render(
        <LearningScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-moment-button'));

      fireEvent.changeText(getByTestId('situation-input'), 'Situation');
      fireEvent.press(getByTestId('response-reacted'));
      fireEvent.changeText(getByTestId('learned-input'), 'Learning');
      // Don't enter practice

      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      // Should not save
      expect(getByTestId('situation-input')).toBeTruthy();
    });
  });

  describe('Moment List Management', () => {
    it('should display added moments', async () => {
      const { getByTestId, getByText } = render(
        <LearningScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-moment-button'));

      fireEvent.changeText(getByTestId('situation-input'), 'First moment');
      fireEvent.press(getByTestId('response-reacted'));
      fireEvent.changeText(getByTestId('learned-input'), 'Learning');
      fireEvent.changeText(getByTestId('practice-input'), 'Practice');

      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      await waitFor(() => {
        expect(getByText('First moment')).toBeTruthy();
        expect(getByText(/reacted/i)).toBeTruthy();
      });
    });

    it('should allow adding multiple moments', async () => {
      const { getByTestId, getByText } = render(
        <LearningScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Add first
      fireEvent.press(getByTestId('add-moment-button'));
      fireEvent.changeText(getByTestId('situation-input'), 'First');
      fireEvent.press(getByTestId('response-reacted'));
      fireEvent.changeText(getByTestId('learned-input'), 'A');
      fireEvent.changeText(getByTestId('practice-input'), 'B');
      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      await waitFor(() => {
        expect(getByText('First')).toBeTruthy();
      });

      // Add second
      fireEvent.press(getByTestId('add-moment-button'));
      fireEvent.changeText(getByTestId('situation-input'), 'Second');
      fireEvent.press(getByTestId('response-responded'));
      fireEvent.changeText(getByTestId('learned-input'), 'C');
      fireEvent.changeText(getByTestId('practice-input'), 'D');
      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      await waitFor(() => {
        expect(getByText('First')).toBeTruthy();
        expect(getByText('Second')).toBeTruthy();
      });
    });

    it('should allow deleting moment', async () => {
      const { getByTestId, getByText, queryByText } = render(
        <LearningScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Add moment
      fireEvent.press(getByTestId('add-moment-button'));
      fireEvent.changeText(getByTestId('situation-input'), 'To delete');
      fireEvent.press(getByTestId('response-reacted'));
      fireEvent.changeText(getByTestId('learned-input'), 'A');
      fireEvent.changeText(getByTestId('practice-input'), 'B');
      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      await waitFor(() => {
        expect(getByText('To delete')).toBeTruthy();
      });

      // Delete
      fireEvent.press(getByTestId('delete-moment-0'));

      await waitFor(() => {
        expect(queryByText('To delete')).toBeNull();
      });
    });

    it('should show moment count', async () => {
      const { getByTestId, getByText } = render(
        <LearningScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Add moment
      fireEvent.press(getByTestId('add-moment-button'));
      fireEvent.changeText(getByTestId('situation-input'), 'Moment');
      fireEvent.press(getByTestId('response-reacted'));
      fireEvent.changeText(getByTestId('learned-input'), 'A');
      fireEvent.changeText(getByTestId('practice-input'), 'B');
      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      await waitFor(() => {
        expect(getByText(/1 moment/i) || getByText(/1 learning/i)).toBeTruthy();
      });
    });
  });

  describe('Data Persistence', () => {
    it('should save moments on continue', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <LearningScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      // Add moment
      fireEvent.press(getByTestId('add-moment-button'));
      fireEvent.changeText(getByTestId('situation-input'), 'Test situation');
      fireEvent.press(getByTestId('response-mixed'));
      fireEvent.changeText(getByTestId('learned-input'), 'Test learning');
      fireEvent.changeText(getByTestId('practice-input'), 'Test practice');
      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      await waitFor(() => {
        expect(getByText('Test situation')).toBeTruthy();
      });

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            reactVsRespondMoments: expect.arrayContaining([
              expect.objectContaining({
                situation: 'Test situation',
                myResponse: 'mixed',
                whatILearned: 'Test learning',
                whatIllPractice: 'Test practice',
              }),
            ]),
            timestamp: expect.any(Date),
          })
        );
      });
    });

    it('should save empty array if no moments added', async () => {
      const onSave = jest.fn();
      const { getByText } = render(
        <LearningScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            reactVsRespondMoments: [],
          })
        );
      });
    });

    it('should trim whitespace from text fields', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <LearningScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      fireEvent.press(getByTestId('add-moment-button'));
      fireEvent.changeText(getByTestId('situation-input'), '  Test  ');
      fireEvent.press(getByTestId('response-reacted'));
      fireEvent.changeText(getByTestId('learned-input'), '  A  ');
      fireEvent.changeText(getByTestId('practice-input'), '  B  ');
      fireEvent.press(getByText(/save/i) || getByText(/add/i));

      await waitFor(() => {
        expect(getByText('Test')).toBeTruthy();
      });

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            reactVsRespondMoments: expect.arrayContaining([
              expect.objectContaining({
                situation: 'Test',
                whatILearned: 'A',
                whatIllPractice: 'B',
              }),
            ]),
          })
        );
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to Seneca questions on continue', async () => {
      const { getByText } = render(
        <LearningScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('SenecaQuestions');
      });
    });

    it('should allow going back', () => {
      const { getByTestId } = render(
        <LearningScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('back-button'));
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for all inputs', () => {
      const { getByTestId } = render(
        <LearningScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-moment-button'));

      expect(getByTestId('situation-input').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('response-reacted').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('learned-input').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('practice-input').props.accessibilityLabel).toBeTruthy();
    });
  });

  describe('Stoic Guidance', () => {
    it('should show Stoic wisdom about react vs respond', () => {
      const { queryAllByText } = render(
        <LearningScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const epictetusMatches = queryAllByText(/Epictetus/i);
      const marcusMatches = queryAllByText(/Marcus Aurelius/i);
      const spaceMatches = queryAllByText(/space/i);
      const chooseMatches = queryAllByText(/choose/i);

      expect(
        epictetusMatches.length > 0 ||
        marcusMatches.length > 0 ||
        spaceMatches.length > 0 ||
        chooseMatches.length > 0
      ).toBe(true);
    });
  });
});
