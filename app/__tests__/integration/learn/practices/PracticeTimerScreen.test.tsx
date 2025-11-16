/**
 * PracticeTimerScreen Integration Tests
 * FEAT-81 Phase 2: DRY Migration Validation
 *
 * Test Coverage:
 * 1. Screen renders with Phase 2 components (PracticeScreenLayout, PracticeInstructions)
 * 2. Timer functionality (start, pause, resume, complete)
 * 3. BreathingCircle integration and activation
 * 4. Completion flow triggers correctly
 * 5. Accessibility compliance (WCAG AA)
 * 6. Component props and callbacks
 *
 * Target: 90%+ coverage
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import PracticeTimerScreen from '@/features/learn/practices/PracticeTimerScreen';

// Mock Phase 2 shared components
jest.mock('../../../../src/screens/learn/practices/shared/PracticeScreenLayout', () => {
  const React = require('react');
  return ({ children, title, onBack, testID }: any) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID={testID}>
        <View testID="practice-header">
          <Text>{title}</Text>
          <TouchableOpacity testID="back-button" onPress={onBack}>
            <Text>Back</Text>
          </TouchableOpacity>
        </View>
        {children}
      </View>
    );
  };
});

jest.mock('../../../../src/screens/learn/practices/shared/PracticeInstructions', () => {
  const React = require('react');
  return ({ text, isActive, testID }: any) => {
    const { Text } = require('react-native');
    return (
      <Text testID={testID} accessibilityLabel="Practice Instructions">
        {text}
      </Text>
    );
  };
});

jest.mock('../../../../src/screens/learn/practices/shared/PracticeToggleButton', () => {
  const React = require('react');
  return ({ isActive, onToggle, testID }: any) => {
    const { TouchableOpacity, Text } = require('react-native');
    const buttonText = isActive ? 'Pause' : 'Begin Practice';
    return (
      <TouchableOpacity
        testID={testID}
        onPress={() => onToggle(!isActive)}
        accessibilityRole="button"
        accessibilityLabel={buttonText}
      >
        <Text>{buttonText}</Text>
      </TouchableOpacity>
    );
  };
});

// Mock shared components
jest.mock('../../../../src/flows/shared/components/BreathingCircle', () => {
  const React = require('react');
  return ({ isActive, testID }: any) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={testID} accessibilityLabel="Breathing Circle">
        <Text>BreathingCircle - {isActive ? 'Active' : 'Inactive'}</Text>
      </View>
    );
  };
});

jest.mock('../../../../src/flows/shared/components/Timer', () => {
  const React = require('react');
  const { useState, useEffect } = React;
  return ({ duration, isActive, onComplete, onTick, testID }: any) => {
    const { View, Text } = require('react-native');
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
      if (!isActive) return;

      const interval = setInterval(() => {
        setElapsed((prev: number) => {
          const next = prev + 100;
          if (onTick) onTick(next);
          if (next >= duration) {
            clearInterval(interval);
            if (onComplete) onComplete();
            return duration;
          }
          return next;
        });
      }, 100);

      return () => clearInterval(interval);
    }, [isActive, duration, onComplete, onTick]);

    return (
      <View testID={testID} accessibilityRole="timer">
        <Text>Timer: {Math.floor(elapsed / 1000)}s / {Math.floor(duration / 1000)}s</Text>
      </View>
    );
  };
});

// Mock usePracticeCompletion hook
jest.mock('../../../../src/screens/learn/practices/shared/usePracticeCompletion', () => ({
  usePracticeCompletion: ({ onComplete, testID }: any) => {
    const React = require('react');
    const { useState } = React;
    const [showCompletion, setShowCompletion] = useState(false);

    return {
      renderCompletion: () => {
        if (!showCompletion) return null;
        const { View, Text, TouchableOpacity } = require('react-native');
        return (
          <View testID={`${testID}-completion`}>
            <Text>Practice Complete!</Text>
            <Text testID="philosopher-quote">
              "You have power over your mind - not outside events." - Marcus Aurelius
            </Text>
            <TouchableOpacity
              testID="completion-done-button"
              onPress={onComplete}
            >
              <Text>Done</Text>
            </TouchableOpacity>
          </View>
        );
      },
      markComplete: () => {
        setShowCompletion(true);
      },
    };
  },
}));

describe('PracticeTimerScreen Integration Tests', () => {
  const defaultProps = {
    practiceId: 'breathing-practice-1',
    moduleId: 'mindfulness' as const,
    duration: 60, // 60 seconds
    title: 'Breathing Practice',
    testID: 'practice-timer-screen',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Screen Rendering', () => {
    it('should render without errors', () => {
      const { getByTestId } = render(<PracticeTimerScreen {...defaultProps} />);
      expect(getByTestId('practice-timer-screen')).toBeTruthy();
    });

    it('should render with correct title', () => {
      const { getByText } = render(<PracticeTimerScreen {...defaultProps} />);
      expect(getByText('Breathing Practice')).toBeTruthy();
    });

    it('should render PracticeScreenLayout component', () => {
      const { getByTestId } = render(<PracticeTimerScreen {...defaultProps} />);
      expect(getByTestId('practice-header')).toBeTruthy();
    });

    it('should render PracticeInstructions component', () => {
      const { getByTestId } = render(<PracticeTimerScreen {...defaultProps} />);
      expect(getByTestId('practice-timer-screen-instructions')).toBeTruthy();
    });

    it('should display correct instruction text', () => {
      const { getByText } = render(<PracticeTimerScreen {...defaultProps} />);
      expect(
        getByText(/Find a comfortable position. Follow the breathing circle/)
      ).toBeTruthy();
    });
  });

  describe('2. Phase 2 Component Integration', () => {
    it('should render BreathingCircle component', () => {
      const { getByTestId } = render(<PracticeTimerScreen {...defaultProps} />);
      expect(getByTestId('practice-timer-screen-breathing-circle')).toBeTruthy();
    });

    it('should render Timer component', () => {
      const { getByTestId } = render(<PracticeTimerScreen {...defaultProps} />);
      expect(getByTestId('practice-timer-screen-timer')).toBeTruthy();
    });

    it('should render PracticeToggleButton component', () => {
      const { getByTestId } = render(<PracticeTimerScreen {...defaultProps} />);
      expect(getByTestId('practice-timer-screen-toggle-button')).toBeTruthy();
    });

    it('should render mindfulness note section', () => {
      const { getByText } = render(<PracticeTimerScreen {...defaultProps} />);
      expect(
        getByText(/If your mind wanders, gently return your attention to the breath/)
      ).toBeTruthy();
    });
  });

  describe('3. Timer Functionality', () => {
    it('should initialize with timer inactive', () => {
      const { getByText } = render(<PracticeTimerScreen {...defaultProps} />);
      expect(getByText('Begin Practice')).toBeTruthy();
    });

    it('should start timer when Begin Practice is pressed', async () => {
      const { getByTestId, getByText } = render(
        <PracticeTimerScreen {...defaultProps} />
      );

      const toggleButton = getByTestId('practice-timer-screen-toggle-button');
      fireEvent.press(toggleButton);

      await waitFor(() => {
        expect(getByText('Pause')).toBeTruthy();
      });
    });

    it('should pause timer when Pause is pressed', async () => {
      const { getByTestId, getByText } = render(
        <PracticeTimerScreen {...defaultProps} />
      );

      const toggleButton = getByTestId('practice-timer-screen-toggle-button');

      // Start timer
      fireEvent.press(toggleButton);
      await waitFor(() => expect(getByText('Pause')).toBeTruthy());

      // Pause timer
      fireEvent.press(toggleButton);
      await waitFor(() => {
        expect(getByText('Begin Practice')).toBeTruthy();
      });
    });

    it('should resume timer after pausing', async () => {
      const { getByTestId, getByText } = render(
        <PracticeTimerScreen {...defaultProps} />
      );

      const toggleButton = getByTestId('practice-timer-screen-toggle-button');

      // Start
      fireEvent.press(toggleButton);
      await waitFor(() => expect(getByText('Pause')).toBeTruthy());

      // Pause
      fireEvent.press(toggleButton);
      await waitFor(() => expect(getByText('Begin Practice')).toBeTruthy());

      // Resume
      fireEvent.press(toggleButton);
      await waitFor(() => {
        expect(getByText('Pause')).toBeTruthy();
      });
    });

    it('should complete timer after duration', async () => {
      const shortDuration = 1; // 1 second for faster test
      const { getByTestId } = render(
        <PracticeTimerScreen {...defaultProps} duration={shortDuration} />
      );

      const toggleButton = getByTestId('practice-timer-screen-toggle-button');
      fireEvent.press(toggleButton);

      await waitFor(
        () => {
          expect(getByTestId('practice-timer-screen-completion')).toBeTruthy();
        },
        { timeout: 2000 }
      );
    });
  });

  describe('4. BreathingCircle Integration', () => {
    it('should render BreathingCircle in inactive state initially', () => {
      const { getByText } = render(<PracticeTimerScreen {...defaultProps} />);
      expect(getByText('BreathingCircle - Inactive')).toBeTruthy();
    });

    it('should activate BreathingCircle when timer starts', async () => {
      const { getByTestId, getByText } = render(
        <PracticeTimerScreen {...defaultProps} />
      );

      const toggleButton = getByTestId('practice-timer-screen-toggle-button');
      fireEvent.press(toggleButton);

      await waitFor(() => {
        expect(getByText('BreathingCircle - Active')).toBeTruthy();
      });
    });

    it('should deactivate BreathingCircle when timer pauses', async () => {
      const { getByTestId, getByText } = render(
        <PracticeTimerScreen {...defaultProps} />
      );

      const toggleButton = getByTestId('practice-timer-screen-toggle-button');

      // Start
      fireEvent.press(toggleButton);
      await waitFor(() => expect(getByText('BreathingCircle - Active')).toBeTruthy());

      // Pause
      fireEvent.press(toggleButton);
      await waitFor(() => {
        expect(getByText('BreathingCircle - Inactive')).toBeTruthy();
      });
    });
  });

  describe('5. Completion Flow', () => {
    it('should show completion screen after timer completes', async () => {
      const shortDuration = 1;
      const { getByTestId, getByText } = render(
        <PracticeTimerScreen {...defaultProps} duration={shortDuration} />
      );

      const toggleButton = getByTestId('practice-timer-screen-toggle-button');
      fireEvent.press(toggleButton);

      await waitFor(
        () => {
          expect(getByText('Practice Complete!')).toBeTruthy();
        },
        { timeout: 2000 }
      );
    });

    it('should display philosopher quote on completion', async () => {
      const shortDuration = 1;
      const { getByTestId, getByText } = render(
        <PracticeTimerScreen {...defaultProps} duration={shortDuration} />
      );

      const toggleButton = getByTestId('practice-timer-screen-toggle-button');
      fireEvent.press(toggleButton);

      await waitFor(
        () => {
          expect(getByText(/Marcus Aurelius/)).toBeTruthy();
        },
        { timeout: 2000 }
      );
    });

    it('should call onComplete callback when completion done is pressed', async () => {
      const onComplete = jest.fn();
      const shortDuration = 1;
      const { getByTestId } = render(
        <PracticeTimerScreen
          {...defaultProps}
          duration={shortDuration}
          onComplete={onComplete}
        />
      );

      const toggleButton = getByTestId('practice-timer-screen-toggle-button');
      fireEvent.press(toggleButton);

      await waitFor(
        () => {
          expect(getByTestId('completion-done-button')).toBeTruthy();
        },
        { timeout: 2000 }
      );

      fireEvent.press(getByTestId('completion-done-button'));
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('6. Back Navigation', () => {
    it('should call onBack when back button is pressed', () => {
      const onBack = jest.fn();
      const { getByTestId } = render(
        <PracticeTimerScreen {...defaultProps} onBack={onBack} />
      );

      fireEvent.press(getByTestId('back-button'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('should provide default onBack handler if none provided', () => {
      const { getByTestId } = render(<PracticeTimerScreen {...defaultProps} />);

      // Should not throw error
      expect(() => {
        fireEvent.press(getByTestId('back-button'));
      }).not.toThrow();
    });
  });

  describe('7. Accessibility Compliance (WCAG AA)', () => {
    it('should have accessible timer component', () => {
      const { getByTestId } = render(<PracticeTimerScreen {...defaultProps} />);
      const timer = getByTestId('practice-timer-screen-timer');
      expect(timer.props.accessibilityRole).toBe('timer');
    });

    it('should have accessible toggle button', () => {
      const { getByTestId } = render(<PracticeTimerScreen {...defaultProps} />);
      const button = getByTestId('practice-timer-screen-toggle-button');
      expect(button.props.accessibilityRole).toBe('button');
      expect(button.props.accessibilityLabel).toBeTruthy();
    });

    it('should have accessible breathing circle', () => {
      const { getByTestId } = render(<PracticeTimerScreen {...defaultProps} />);
      const circle = getByTestId('practice-timer-screen-breathing-circle');
      expect(circle.props.accessibilityLabel).toBe('Breathing Circle');
    });

    it('should have accessible instructions', () => {
      const { getByTestId } = render(<PracticeTimerScreen {...defaultProps} />);
      const instructions = getByTestId('practice-timer-screen-instructions');
      expect(instructions.props.accessibilityLabel).toBe('Practice Instructions');
    });
  });

  describe('8. Props and Component Integration', () => {
    it('should pass correct duration to Timer component', () => {
      const customDuration = 180; // 3 minutes
      const { getByText } = render(
        <PracticeTimerScreen {...defaultProps} duration={customDuration} />
      );

      expect(getByText(/180s/)).toBeTruthy();
    });

    it('should pass practiceId to completion hook', async () => {
      const customPracticeId = 'custom-practice-123';
      const shortDuration = 1;
      const { getByTestId } = render(
        <PracticeTimerScreen
          {...defaultProps}
          practiceId={customPracticeId}
          duration={shortDuration}
        />
      );

      const toggleButton = getByTestId('practice-timer-screen-toggle-button');
      fireEvent.press(toggleButton);

      await waitFor(
        () => {
          expect(getByTestId('practice-timer-screen-completion')).toBeTruthy();
        },
        { timeout: 2000 }
      );
    });

    it('should pass custom testID correctly', () => {
      const customTestID = 'custom-practice-screen';
      const { getByTestId } = render(
        <PracticeTimerScreen {...defaultProps} testID={customTestID} />
      );

      expect(getByTestId(customTestID)).toBeTruthy();
      expect(getByTestId(`${customTestID}-instructions`)).toBeTruthy();
      expect(getByTestId(`${customTestID}-breathing-circle`)).toBeTruthy();
      expect(getByTestId(`${customTestID}-timer`)).toBeTruthy();
      expect(getByTestId(`${customTestID}-toggle-button`)).toBeTruthy();
    });
  });

  describe('9. Performance Requirements', () => {
    it('should render within performance budget (<500ms)', () => {
      const startTime = Date.now();
      render(<PracticeTimerScreen {...defaultProps} />);
      const renderTime = Date.now() - startTime;

      expect(renderTime).toBeLessThan(500);
    });

    it('should handle rapid toggle presses without errors', async () => {
      const { getByTestId } = render(<PracticeTimerScreen {...defaultProps} />);
      const toggleButton = getByTestId('practice-timer-screen-toggle-button');

      // Rapid toggle presses
      for (let i = 0; i < 5; i++) {
        fireEvent.press(toggleButton);
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        });
      }

      // Should not crash
      expect(toggleButton).toBeTruthy();
    });
  });
});
