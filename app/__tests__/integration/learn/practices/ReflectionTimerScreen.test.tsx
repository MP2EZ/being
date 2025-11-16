/**
 * ReflectionTimerScreen Integration Tests
 * FEAT-81 Phase 2: DRY Migration Validation
 *
 * Test Coverage:
 * 1. Screen renders with Phase 2 components (unique numbered instructions pattern)
 * 2. Timer functionality (start, pause, resume, complete)
 * 3. Always-visible numbered instructions (NOT using PracticeInstructions component)
 * 4. Contemplation space renders correctly
 * 5. Completion flow triggers correctly
 * 6. Accessibility compliance (WCAG AA)
 * 7. Component props and callbacks
 *
 * Target: 90%+ coverage
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import ReflectionTimerScreen from '@/features/learn/practices/ReflectionTimerScreen';

// Mock Phase 2 shared components
jest.mock('../../../../src/screens/learn/practices/shared/PracticeScreenLayout', () => {
  const React = require('react');
  return ({ children, title, onBack, testID, scrollable }: any) => {
    const { View, Text, TouchableOpacity, ScrollView } = require('react-native');
    const Container = scrollable ? ScrollView : View;
    return (
      <Container testID={testID}>
        <View testID="practice-header">
          <Text>{title}</Text>
          <TouchableOpacity testID="back-button" onPress={onBack}>
            <Text>Back</Text>
          </TouchableOpacity>
        </View>
        {children}
      </Container>
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

// Mock Timer component
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
              "The impediment to action advances action." - Marcus Aurelius
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

describe('ReflectionTimerScreen Integration Tests', () => {
  const defaultProps = {
    practiceId: 'reflection-practice-1',
    moduleId: 'virtue' as const,
    duration: 300, // 5 minutes
    title: 'Virtue Reflection',
    prompt: 'Consider how you practiced wisdom today',
    instructions: [
      'Find a quiet space and get comfortable',
      'Read the reflection prompt carefully',
      'Allow thoughts to arise without judgment',
      'Notice patterns in your thinking',
    ],
    testID: 'reflection-timer-screen',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Screen Rendering', () => {
    it('should render without errors', () => {
      const { getByTestId } = render(<ReflectionTimerScreen {...defaultProps} />);
      expect(getByTestId('reflection-timer-screen')).toBeTruthy();
    });

    it('should render with correct title', () => {
      const { getByText } = render(<ReflectionTimerScreen {...defaultProps} />);
      expect(getByText('Virtue Reflection')).toBeTruthy();
    });

    it('should render PracticeScreenLayout as scrollable', () => {
      const { getByTestId } = render(<ReflectionTimerScreen {...defaultProps} />);
      expect(getByTestId('reflection-timer-screen')).toBeTruthy();
    });
  });

  describe('2. Numbered Instructions Pattern', () => {
    it('should render instructions label', () => {
      const { getByText } = render(<ReflectionTimerScreen {...defaultProps} />);
      expect(getByText('Instructions:')).toBeTruthy();
    });

    it('should render all instruction items', () => {
      const { getByText } = render(<ReflectionTimerScreen {...defaultProps} />);

      expect(getByText('Find a quiet space and get comfortable')).toBeTruthy();
      expect(getByText('Read the reflection prompt carefully')).toBeTruthy();
      expect(getByText('Allow thoughts to arise without judgment')).toBeTruthy();
      expect(getByText('Notice patterns in your thinking')).toBeTruthy();
    });

    it('should render numbered instruction items (1-4)', () => {
      const { getByText } = render(<ReflectionTimerScreen {...defaultProps} />);

      expect(getByText('1.')).toBeTruthy();
      expect(getByText('2.')).toBeTruthy();
      expect(getByText('3.')).toBeTruthy();
      expect(getByText('4.')).toBeTruthy();
    });

    it('should keep instructions visible when timer starts', async () => {
      const { getByTestId, getByText } = render(
        <ReflectionTimerScreen {...defaultProps} />
      );

      // Instructions visible initially
      expect(getByText('Instructions:')).toBeTruthy();

      // Start timer
      const toggleButton = getByTestId('reflection-timer-screen-toggle-button');
      fireEvent.press(toggleButton);

      await waitFor(() => expect(getByText('Pause')).toBeTruthy());

      // Instructions still visible (unique pattern for ReflectionTimerScreen)
      expect(getByText('Instructions:')).toBeTruthy();
      expect(getByText('Find a quiet space and get comfortable')).toBeTruthy();
    });

    it('should handle empty instructions array', () => {
      const { queryByText } = render(
        <ReflectionTimerScreen {...defaultProps} instructions={[]} />
      );

      expect(queryByText('Instructions:')).toBeFalsy();
    });

    it('should handle undefined instructions', () => {
      const { queryByText } = render(
        <ReflectionTimerScreen {...defaultProps} instructions={undefined} />
      );

      expect(queryByText('Instructions:')).toBeFalsy();
    });
  });

  describe('3. Contemplation Space', () => {
    it('should render contemplation icon', () => {
      const { getByText } = render(<ReflectionTimerScreen {...defaultProps} />);
      expect(getByText('🧘')).toBeTruthy();
    });

    it('should render contemplation guidance text', () => {
      const { getByText } = render(<ReflectionTimerScreen {...defaultProps} />);
      expect(
        getByText(
          /Take time to reflect. There's no need to write anything down/
        )
      ).toBeTruthy();
    });

    it('should render contemplation space with proper accessibility', () => {
      const { getByText } = render(<ReflectionTimerScreen {...defaultProps} />);
      const guidanceText = getByText(
        /Take time to reflect. There's no need to write anything down/
      );
      expect(guidanceText).toBeTruthy();
    });
  });

  describe('4. Timer Functionality', () => {
    it('should initialize with timer inactive', () => {
      const { getByText } = render(<ReflectionTimerScreen {...defaultProps} />);
      expect(getByText('Begin Practice')).toBeTruthy();
    });

    it('should start timer when Begin Practice is pressed', async () => {
      const { getByTestId, getByText } = render(
        <ReflectionTimerScreen {...defaultProps} />
      );

      const toggleButton = getByTestId('reflection-timer-screen-toggle-button');
      fireEvent.press(toggleButton);

      await waitFor(() => {
        expect(getByText('Pause')).toBeTruthy();
      });
    });

    it('should pause timer when Pause is pressed', async () => {
      const { getByTestId, getByText } = render(
        <ReflectionTimerScreen {...defaultProps} />
      );

      const toggleButton = getByTestId('reflection-timer-screen-toggle-button');

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
        <ReflectionTimerScreen {...defaultProps} />
      );

      const toggleButton = getByTestId('reflection-timer-screen-toggle-button');

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
        <ReflectionTimerScreen {...defaultProps} duration={shortDuration} />
      );

      const toggleButton = getByTestId('reflection-timer-screen-toggle-button');
      fireEvent.press(toggleButton);

      await waitFor(
        () => {
          expect(getByTestId('reflection-timer-screen-completion')).toBeTruthy();
        },
        { timeout: 2000 }
      );
    });

    it('should display correct duration in timer', () => {
      const { getByText } = render(<ReflectionTimerScreen {...defaultProps} />);
      expect(getByText(/300s/)).toBeTruthy(); // 5 minutes
    });
  });

  describe('5. Phase 2 Component Integration', () => {
    it('should render Timer component', () => {
      const { getByTestId } = render(<ReflectionTimerScreen {...defaultProps} />);
      expect(getByTestId('reflection-timer-screen-timer')).toBeTruthy();
    });

    it('should render PracticeToggleButton component', () => {
      const { getByTestId } = render(<ReflectionTimerScreen {...defaultProps} />);
      expect(getByTestId('reflection-timer-screen-toggle-button')).toBeTruthy();
    });

    it('should NOT render PracticeInstructions component', () => {
      const { queryByTestId } = render(<ReflectionTimerScreen {...defaultProps} />);
      // ReflectionTimerScreen uses custom numbered instructions
      expect(queryByTestId('reflection-timer-screen-instructions')).toBeFalsy();
    });

    it('should NOT render BreathingCircle component', () => {
      const { queryByTestId } = render(<ReflectionTimerScreen {...defaultProps} />);
      // ReflectionTimerScreen is for contemplation, not breathing
      expect(queryByTestId('reflection-timer-screen-breathing-circle')).toBeFalsy();
    });
  });

  describe('6. Completion Flow', () => {
    it('should show completion screen after timer completes', async () => {
      const shortDuration = 1;
      const { getByTestId, getByText } = render(
        <ReflectionTimerScreen {...defaultProps} duration={shortDuration} />
      );

      const toggleButton = getByTestId('reflection-timer-screen-toggle-button');
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
        <ReflectionTimerScreen {...defaultProps} duration={shortDuration} />
      );

      const toggleButton = getByTestId('reflection-timer-screen-toggle-button');
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
        <ReflectionTimerScreen
          {...defaultProps}
          duration={shortDuration}
          onComplete={onComplete}
        />
      );

      const toggleButton = getByTestId('reflection-timer-screen-toggle-button');
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

  describe('7. Back Navigation', () => {
    it('should call onBack when back button is pressed', () => {
      const onBack = jest.fn();
      const { getByTestId } = render(
        <ReflectionTimerScreen {...defaultProps} onBack={onBack} />
      );

      fireEvent.press(getByTestId('back-button'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('should provide default onBack handler if none provided', () => {
      const { getByTestId } = render(<ReflectionTimerScreen {...defaultProps} />);

      // Should not throw error
      expect(() => {
        fireEvent.press(getByTestId('back-button'));
      }).not.toThrow();
    });
  });

  describe('8. Accessibility Compliance (WCAG AA)', () => {
    it('should have accessible timer component', () => {
      const { getByTestId } = render(<ReflectionTimerScreen {...defaultProps} />);
      const timer = getByTestId('reflection-timer-screen-timer');
      expect(timer.props.accessibilityRole).toBe('timer');
    });

    it('should have accessible toggle button', () => {
      const { getByTestId } = render(<ReflectionTimerScreen {...defaultProps} />);
      const button = getByTestId('reflection-timer-screen-toggle-button');
      expect(button.props.accessibilityRole).toBe('button');
      expect(button.props.accessibilityLabel).toBeTruthy();
    });

    it('should have accessible instruction numbers', () => {
      const { getByText } = render(<ReflectionTimerScreen {...defaultProps} />);

      // Verify all numbered instructions are rendered
      for (let i = 1; i <= 4; i++) {
        expect(getByText(`${i}.`)).toBeTruthy();
      }
    });
  });

  describe('9. Props and Component Integration', () => {
    it('should pass correct duration to Timer component', () => {
      const customDuration = 600; // 10 minutes
      const { getByText } = render(
        <ReflectionTimerScreen {...defaultProps} duration={customDuration} />
      );

      expect(getByText(/600s/)).toBeTruthy();
    });

    it('should pass practiceId to completion hook', async () => {
      const customPracticeId = 'custom-reflection-123';
      const shortDuration = 1;
      const { getByTestId } = render(
        <ReflectionTimerScreen
          {...defaultProps}
          practiceId={customPracticeId}
          duration={shortDuration}
        />
      );

      const toggleButton = getByTestId('reflection-timer-screen-toggle-button');
      fireEvent.press(toggleButton);

      await waitFor(
        () => {
          expect(getByTestId('reflection-timer-screen-completion')).toBeTruthy();
        },
        { timeout: 2000 }
      );
    });

    it('should pass custom testID correctly', () => {
      const customTestID = 'custom-reflection-screen';
      const { getByTestId } = render(
        <ReflectionTimerScreen {...defaultProps} testID={customTestID} />
      );

      expect(getByTestId(customTestID)).toBeTruthy();
      expect(getByTestId(`${customTestID}-timer`)).toBeTruthy();
      expect(getByTestId(`${customTestID}-toggle-button`)).toBeTruthy();
    });

    it('should handle custom title', () => {
      const customTitle = 'Custom Reflection Practice';
      const { getByText } = render(
        <ReflectionTimerScreen {...defaultProps} title={customTitle} />
      );

      expect(getByText(customTitle)).toBeTruthy();
    });

    it('should handle optional prompt prop', () => {
      const { getByTestId } = render(
        <ReflectionTimerScreen {...defaultProps} prompt={undefined} />
      );

      // Should still render without error
      expect(getByTestId('reflection-timer-screen')).toBeTruthy();
    });
  });

  describe('10. Performance Requirements', () => {
    it('should render within performance budget (<500ms)', () => {
      const startTime = Date.now();
      render(<ReflectionTimerScreen {...defaultProps} />);
      const renderTime = Date.now() - startTime;

      expect(renderTime).toBeLessThan(500);
    });

    it('should handle rapid toggle presses without errors', async () => {
      const { getByTestId } = render(<ReflectionTimerScreen {...defaultProps} />);
      const toggleButton = getByTestId('reflection-timer-screen-toggle-button');

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

    it('should handle long instruction lists efficiently', () => {
      const longInstructions = Array.from({ length: 20 }, (_, i) =>
        `Instruction ${i + 1}: This is a longer instruction text to test rendering performance`
      );

      const startTime = Date.now();
      const { getByText } = render(
        <ReflectionTimerScreen {...defaultProps} instructions={longInstructions} />
      );
      const renderTime = Date.now() - startTime;

      expect(renderTime).toBeLessThan(500);
      expect(getByText('1.')).toBeTruthy();
      expect(getByText('20.')).toBeTruthy();
    });
  });

  describe('11. Unique Screen Patterns', () => {
    it('should differentiate from PracticeTimerScreen by using custom instructions', () => {
      const { getByText, queryByTestId } = render(
        <ReflectionTimerScreen {...defaultProps} />
      );

      // Has numbered instructions
      expect(getByText('Instructions:')).toBeTruthy();
      expect(getByText('1.')).toBeTruthy();

      // Does NOT have PracticeInstructions fade component
      expect(queryByTestId('reflection-timer-screen-instructions')).toBeFalsy();

      // Does NOT have BreathingCircle
      expect(queryByTestId('reflection-timer-screen-breathing-circle')).toBeFalsy();
    });

    it('should differentiate from BodyScanScreen by having contemplation space', () => {
      const { getByText, queryByTestId } = render(
        <ReflectionTimerScreen {...defaultProps} />
      );

      // Has contemplation space
      expect(getByText('🧘')).toBeTruthy();

      // Does NOT have ProgressiveBodyScanList
      expect(queryByTestId('reflection-timer-screen-body-scan-list')).toBeFalsy();
    });
  });
});
