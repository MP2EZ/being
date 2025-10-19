/**
 * PREPARATION SCREEN TESTS
 *
 * Tests for premeditatio malorum (negative visualization) with safety safeguards.
 * Philosopher-validated (9.5/10) - implements classical practice with modern safety.
 *
 * TDD Approach: Tests written first, screen implemented to pass tests.
 *
 * Screen Requirements:
 * - Integrates PremeditationSafetyService (max 2 obstacles, time-boxing, anxiety detection)
 * - Optional practice (user can skip entirely)
 * - Self-compassion REQUIRED if obstacles present
 * - Opt-out pathway for anxiety
 * - Visual safety indicators (time remaining, obstacle count)
 * - Crisis resources if severe distress detected
 *
 * Safety Safeguards (NON-NEGOTIABLE):
 * - Max 2 obstacles (prevents rumination spiral)
 * - Time-boxing: flag if >120s, suggest opt-out
 * - Anxiety detection: keywords + patterns
 * - Opt-out pathway: "prefer gratitude" | "not needed today" | "anxiety"
 * - Self-compassion REQUIRED when obstacles present
 * - Crisis integration: show resources if severe distress
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import PreparationScreen from '../../../src/flows/morning/screens/PreparationScreen';
import type { PreparationData } from '../../../src/types/flows';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

// Mock timers for time-boxing tests
jest.useFakeTimers();

describe('PreparationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Screen Rendering', () => {
    it('should render preparation screen', () => {
      const { getByText } = render(
        <PreparationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText(/preparation/i)).toBeTruthy();
      expect(getByText(/premeditatio malorum/i)).toBeTruthy();
    });

    it('should show optional practice message', () => {
      const { getByText } = render(
        <PreparationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('Premeditatio malorum (optional)')).toBeTruthy();
      expect(getByText(/this practice is optional/i)).toBeTruthy();
    });

    it('should show safety indicators', () => {
      const { getByText } = render(
        <PreparationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Time remaining indicator
      expect(getByText(/2 min/i)).toBeTruthy();

      // Obstacle count indicator
      expect(getByText(/0\/2/i)).toBeTruthy();
    });
  });

  describe('Skip/Opt-Out Pathway', () => {
    it('should allow skipping practice entirely', async () => {
      const onSave = jest.fn();
      const { getByTestId } = render(
        <PreparationScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      const skipButton = getByTestId('skip-preparation');
      fireEvent.press(skipButton);

      // Select opt-out reason from modal
      const notNeededButton = getByTestId('opt-out-not-needed');
      fireEvent.press(notNeededButton);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            obstacles: [],
            optedOut: true,
            optOutReason: 'not_needed_today',
          })
        );
      });

      expect(mockNavigate).toHaveBeenCalledWith('PrincipleFocus');
    });

    it('should offer opt-out reasons', () => {
      const { getByTestId } = render(
        <PreparationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const skipButton = getByTestId('skip-preparation');
      fireEvent.press(skipButton);

      // Should show opt-out reason options
      expect(getByTestId('opt-out-anxiety')).toBeTruthy();
      expect(getByTestId('opt-out-not-needed')).toBeTruthy();
      expect(getByTestId('opt-out-prefer-gratitude')).toBeTruthy();
    });

    it('should navigate immediately on "prefer gratitude" opt-out', async () => {
      const { getByTestId } = render(
        <PreparationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('skip-preparation'));
      fireEvent.press(getByTestId('opt-out-prefer-gratitude'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('PrincipleFocus');
      });
    });
  });

  describe('Obstacle Entry', () => {
    it('should allow adding first obstacle', () => {
      const { getByTestId } = render(
        <PreparationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const addButton = getByTestId('add-obstacle');
      fireEvent.press(addButton);

      // Should show obstacle input form
      expect(getByTestId('obstacle-input-0')).toBeTruthy();
      expect(getByTestId('response-input-0')).toBeTruthy();
      expect(getByTestId('control-input-0')).toBeTruthy();
      expect(getByTestId('no-control-input-0')).toBeTruthy();
    });

    it('should allow filling obstacle details', () => {
      const { getByTestId } = render(
        <PreparationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-obstacle'));

      const obstacleInput = getByTestId('obstacle-input-0');
      const responseInput = getByTestId('response-input-0');
      const controlInput = getByTestId('control-input-0');
      const noControlInput = getByTestId('no-control-input-0');

      fireEvent.changeText(obstacleInput, 'Difficult meeting');
      fireEvent.changeText(responseInput, 'Stay calm and listen');
      fireEvent.changeText(controlInput, 'My response, my preparation');
      fireEvent.changeText(noControlInput, 'Meeting outcome, others reactions');

      expect(obstacleInput.props.value).toBe('Difficult meeting');
      expect(responseInput.props.value).toBe('Stay calm and listen');
      expect(controlInput.props.value).toBe('My response, my preparation');
      expect(noControlInput.props.value).toBe('Meeting outcome, others reactions');
    });

    it('should allow adding second obstacle', () => {
      const { getByTestId, getAllByText } = render(
        <PreparationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Add first obstacle
      fireEvent.press(getByTestId('add-obstacle'));
      fireEvent.changeText(getByTestId('obstacle-input-0'), 'Challenge 1');
      fireEvent.changeText(getByTestId('response-input-0'), 'Response 1');
      fireEvent.changeText(getByTestId('control-input-0'), 'Control 1');
      fireEvent.changeText(getByTestId('no-control-input-0'), 'No control 1');

      // Add second obstacle
      fireEvent.press(getByTestId('add-obstacle'));

      expect(getByTestId('obstacle-input-1')).toBeTruthy();
      expect(getByTestId('response-input-1')).toBeTruthy();
    });

    it('should prevent adding more than 2 obstacles (safety requirement)', () => {
      const { getByTestId, queryByTestId } = render(
        <PreparationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Add first obstacle
      fireEvent.press(getByTestId('add-obstacle'));
      fireEvent.changeText(getByTestId('obstacle-input-0'), 'Challenge 1');
      fireEvent.changeText(getByTestId('response-input-0'), 'Response 1');
      fireEvent.changeText(getByTestId('control-input-0'), 'Control 1');
      fireEvent.changeText(getByTestId('no-control-input-0'), 'No control 1');

      // Add second obstacle
      fireEvent.press(getByTestId('add-obstacle'));
      fireEvent.changeText(getByTestId('obstacle-input-1'), 'Challenge 2');
      fireEvent.changeText(getByTestId('response-input-1'), 'Response 2');
      fireEvent.changeText(getByTestId('control-input-1'), 'Control 2');
      fireEvent.changeText(getByTestId('no-control-input-1'), 'No control 2');

      // Add button should be disabled/hidden
      const addButtonAfter = queryByTestId('add-obstacle');
      expect(addButtonAfter).toBeNull();
    });

    it('should allow removing obstacles', () => {
      const { getByTestId, queryByTestId } = render(
        <PreparationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Add obstacle
      fireEvent.press(getByTestId('add-obstacle'));
      fireEvent.changeText(getByTestId('obstacle-input-0'), 'Challenge 1');

      // Remove obstacle
      const removeButton = getByTestId('remove-obstacle-0');
      fireEvent.press(removeButton);

      // Obstacle should be gone
      expect(queryByTestId('obstacle-input-0')).toBeNull();
    });
  });

  describe('Time-Boxing Safety', () => {
    it('should show time remaining', () => {
      const { getByText } = render(
        <PreparationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText(/2 min/i)).toBeTruthy();
    });

    it('should update time remaining as seconds pass', async () => {
      const { getByTestId } = render(
        <PreparationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const timeDisplay = getByTestId('time-remaining');
      const initialTime = timeDisplay.props.children;

      // Advance 30 seconds
      act(() => {
        jest.advanceTimersByTime(30 * 1000);
      });

      await waitFor(() => {
        const updatedTime = timeDisplay.props.children;
        expect(updatedTime).not.toBe(initialTime);
      });
    });

    it('should show warning when time exceeds 120 seconds', async () => {
      const { getByText } = render(
        <PreparationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Advance 121 seconds
      act(() => {
        jest.advanceTimersByTime(121 * 1000);
      });

      await waitFor(() => {
        expect(getByText(/taking longer/i)).toBeTruthy();
        expect(getByText(/consider stopping/i)).toBeTruthy();
      });
    });

    it('should suggest opt-out when time exceeded', async () => {
      const { getByTestId } = render(
        <PreparationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Advance 121 seconds
      act(() => {
        jest.advanceTimersByTime(121 * 1000);
      });

      await waitFor(() => {
        expect(getByTestId('opt-out-suggestion')).toBeTruthy();
      });
    });
  });

  describe('Anxiety Detection', () => {
    it('should detect anxiety from obstacle text', async () => {
      const { getByTestId, getByText } = render(
        <PreparationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-obstacle'));

      act(() => {
        fireEvent.changeText(
          getByTestId('obstacle-input-0'),
          'I am so worried and anxious about this meeting'
        );
      });

      await waitFor(() => {
        expect(getByText(/distress detected/i)).toBeTruthy();
        expect(getByTestId('opt-out-suggestion')).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('should detect rumination patterns', async () => {
      const { getByTestId, getByText } = render(
        <PreparationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-obstacle'));

      act(() => {
        fireEvent.changeText(
          getByTestId('obstacle-input-0'),
          'What if everything goes wrong and terrible things happen'
        );
      });

      await waitFor(() => {
        expect(getByText(/distress detected/i)).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('should NOT flag normal obstacle descriptions', () => {
      const { getByTestId, queryByText } = render(
        <PreparationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-obstacle'));
      fireEvent.changeText(
        getByTestId('obstacle-input-0'),
        'Difficult meeting with stakeholders'
      );

      expect(queryByText(/distress detected/i)).toBeNull();
    });
  });

  describe('Self-Compassion Requirement', () => {
    it('should require self-compassion note when obstacles present', () => {
      const { getByTestId, getByText } = render(
        <PreparationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Add obstacle
      fireEvent.press(getByTestId('add-obstacle'));
      fireEvent.changeText(getByTestId('obstacle-input-0'), 'Challenge');
      fireEvent.changeText(getByTestId('response-input-0'), 'Response');
      fireEvent.changeText(getByTestId('control-input-0'), 'Control');
      fireEvent.changeText(getByTestId('no-control-input-0'), 'No control');

      // Try to continue without self-compassion
      const continueButton = getByText(/continue/i);
      fireEvent.press(continueButton);

      // Should not navigate
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should show self-compassion field after obstacles entered', () => {
      const { getByTestId } = render(
        <PreparationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Add obstacle
      fireEvent.press(getByTestId('add-obstacle'));
      fireEvent.changeText(getByTestId('obstacle-input-0'), 'Challenge');

      // Self-compassion field should appear
      expect(getByTestId('self-compassion-note')).toBeTruthy();
    });

    it('should allow continuing with self-compassion note', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <PreparationScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      // Add obstacle
      fireEvent.press(getByTestId('add-obstacle'));
      fireEvent.changeText(getByTestId('obstacle-input-0'), 'Challenge');
      fireEvent.changeText(getByTestId('response-input-0'), 'Response');
      fireEvent.changeText(getByTestId('control-input-0'), 'Control');
      fireEvent.changeText(getByTestId('no-control-input-0'), 'No control');

      // Add self-compassion
      fireEvent.changeText(getByTestId('self-compassion-note'), "I'm doing my best");

      // Continue
      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            selfCompassionNote: "I'm doing my best",
          })
        );
      });
    });

    it('should NOT require self-compassion if no obstacles', async () => {
      const onSave = jest.fn();
      const { getByText } = render(
        <PreparationScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      // Continue without adding obstacles
      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            obstacles: [],
            selfCompassionNote: '',
          })
        );
      });
    });
  });

  describe('Crisis Integration', () => {
    it('should show crisis resources for severe distress', async () => {
      const { getByTestId, getByText } = render(
        <PreparationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-obstacle'));

      act(() => {
        fireEvent.changeText(
          getByTestId('obstacle-input-0'),
          'I cannot stop panicking and feel suicidal'
        );
      });

      await waitFor(() => {
        expect(getByText(/we're here to support you/i)).toBeTruthy();
        expect(getByTestId('crisis-resources-button')).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('should NOT show crisis resources for normal obstacles', () => {
      const { getByTestId, queryByTestId } = render(
        <PreparationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-obstacle'));
      fireEvent.changeText(
        getByTestId('obstacle-input-0'),
        'Difficult meeting with stakeholders'
      );

      expect(queryByTestId('crisis-resources-button')).toBeNull();
    });
  });

  describe('Data Persistence', () => {
    it('should save preparation data on continue', async () => {
      const onSave = jest.fn();
      const { getByTestId, getByText } = render(
        <PreparationScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      // Add obstacle
      fireEvent.press(getByTestId('add-obstacle'));
      fireEvent.changeText(getByTestId('obstacle-input-0'), 'Difficult meeting');
      fireEvent.changeText(getByTestId('response-input-0'), 'Stay calm');
      fireEvent.changeText(getByTestId('control-input-0'), 'My response');
      fireEvent.changeText(getByTestId('no-control-input-0'), 'Meeting outcome');

      // Add self-compassion
      fireEvent.changeText(getByTestId('self-compassion-note'), "I'm prepared");

      // Continue
      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            obstacles: expect.arrayContaining([
              expect.objectContaining({
                obstacle: 'Difficult meeting',
                howICanRespond: 'Stay calm',
                whatIControl: 'My response',
                whatIDontControl: 'Meeting outcome',
              }),
            ]),
            selfCompassionNote: "I'm prepared",
            optedOut: false,
            timestamp: expect.any(Date),
          })
        );
      });
    });

    it('should save time spent in session', async () => {
      const onSave = jest.fn();
      const { getByText } = render(
        <PreparationScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      // Advance 45 seconds
      act(() => {
        jest.advanceTimersByTime(45 * 1000);
      });

      // Continue without obstacles
      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            timeSpentSeconds: expect.any(Number),
          })
        );

        const timeSpent = onSave.mock.calls[0][0].timeSpentSeconds;
        expect(timeSpent).toBeGreaterThanOrEqual(45);
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to next screen on continue', async () => {
      const { getByText } = render(
        <PreparationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('PrincipleFocus');
      });
    });

    it('should allow going back', () => {
      const { getByTestId } = render(
        <PreparationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('back-button'));
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for all inputs', () => {
      const { getByTestId } = render(
        <PreparationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      fireEvent.press(getByTestId('add-obstacle'));

      expect(getByTestId('obstacle-input-0').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('response-input-0').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('control-input-0').props.accessibilityLabel).toBeTruthy();
      expect(getByTestId('no-control-input-0').props.accessibilityLabel).toBeTruthy();
    });

    it('should announce when time warning occurs', async () => {
      const { getByTestId } = render(
        <PreparationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // Advance 121 seconds
      act(() => {
        jest.advanceTimersByTime(121 * 1000);
      });

      await waitFor(() => {
        const warningView = getByTestId('time-warning');
        expect(warningView.props.accessibilityLiveRegion).toBe('polite');
      });
    });
  });

  describe('Readiness Rating', () => {
    it('should show readiness rating buttons', () => {
      const { getByText } = render(
        <PreparationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText(/how ready do you feel/i)).toBeTruthy();
      expect(getByText('5')).toBeTruthy(); // Default rating
    });

    it('should allow setting readiness from 1-10', () => {
      const { getByText, getByLabelText } = render(
        <PreparationScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const rating7Button = getByLabelText('Set readiness rating to 7');
      fireEvent.press(rating7Button);

      // Should show updated rating
      expect(getByText('Rating: 7/10')).toBeTruthy();
    });

    it('should save readiness rating', async () => {
      const onSave = jest.fn();
      const { getByLabelText, getByText } = render(
        <PreparationScreen
          navigation={mockNavigation as any}
          route={{} as any}
          onSave={onSave}
        />
      );

      const rating8Button = getByLabelText('Set readiness rating to 8');
      fireEvent.press(rating8Button);

      fireEvent.press(getByText(/continue/i));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            readinessRating: 8,
          })
        );
      });
    });
  });
});
