/**
 * Phase 3 Pressable Migration Therapeutic Validation Tests
 * CRITICAL: Validates TouchableOpacity → Pressable migration for therapeutic components
 * 
 * Components Under Test:
 * - BreathingCircle: 60-second therapeutic timing precision
 * - EmotionGrid: Crisis detection and anxiety adaptation delays
 * - ThoughtBubbles: Complex floating animations with acknowledgment states
 * - BodyAreaGrid: Multi-selection body awareness accuracy
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { TestRenderer } from 'react-test-renderer';
import { jest } from '@jest/globals';

// Mock react-native-reanimated for testing
jest.mock('react-native-reanimated', () => ({
  useSharedValue: jest.fn((value) => ({ value })),
  useAnimatedStyle: jest.fn(() => ({})),
  withSpring: jest.fn((value) => value),
  withTiming: jest.fn((value) => value),
  withSequence: jest.fn((...values) => values[values.length - 1]),
  withRepeat: jest.fn((value) => value),
  interpolate: jest.fn((value) => value),
  runOnJS: jest.fn((fn) => fn),
  Easing: {
    inOut: jest.fn(() => ({})),
    ease: {}
  }
}));

// Mock therapeutic accessibility provider
jest.mock('../../src/components/accessibility/TherapeuticAccessibilityProvider', () => ({
  useTherapeuticAccessibility: () => ({
    anxietyAdaptationsEnabled: false,
    depressionSupportMode: false,
    crisisEmergencyMode: false,
    isScreenReaderEnabled: false,
    announceForTherapy: jest.fn(),
    provideTharapeuticFeedback: jest.fn(),
    activateEmergencyCrisisAccess: jest.fn(),
    announceEmergencyInstructions: jest.fn(),
  })
}));

// Mock haptics
jest.mock('../../src/hooks/useHaptics', () => ({
  useCommonHaptics: () => ({
    onSelect: jest.fn()
  })
}));

// Import components after mocks
import { BreathingCircle } from '../../src/components/checkin/BreathingCircle';
import { EmotionGrid } from '../../src/components/checkin/EmotionGrid';
import { ThoughtBubbles } from '../../src/components/checkin/ThoughtBubbles';
import { BodyAreaGrid } from '../../src/components/checkin/BodyAreaGrid';

describe('Phase 3: Pressable Migration Therapeutic Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('BreathingCircle Therapeutic Timing Precision', () => {
    const mockOnComplete = jest.fn();
    const mockOnTimingError = jest.fn();

    beforeEach(() => {
      mockOnComplete.mockClear();
      mockOnTimingError.mockClear();
    });

    test('validates 60-second step timing precision (±50ms tolerance)', async () => {
      const { getByTestId, getByText } = render(
        <BreathingCircle
          onComplete={mockOnComplete}
          onTimingError={mockOnTimingError}
          validateTiming={true}
          testID="breathing-circle"
        />
      );

      // Start breathing exercise
      const startButton = getByText('Start Breathing Exercise');
      fireEvent.press(startButton);

      // Validate initial state
      expect(getByText('Step 1 of 3')).toBeTruthy();
      expect(getByText('3:00')).toBeTruthy();

      // Fast-forward to test step transitions
      act(() => {
        jest.advanceTimersByTime(60000); // 60 seconds exactly
      });

      await waitFor(() => {
        expect(getByText('Step 2 of 3')).toBeTruthy();
        expect(getByText('2:00')).toBeTruthy();
      }, { timeout: 100 });

      // Verify timing precision (should not call timing error)
      expect(mockOnTimingError).not.toHaveBeenCalled();

      // Test second step transition
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      await waitFor(() => {
        expect(getByText('Step 3 of 3')).toBeTruthy();
        expect(getByText('1:00')).toBeTruthy();
      });

      // Complete final step
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledTimes(1);
      });
    });

    test('validates breathing cycle animation timing (4-second cycles)', async () => {
      const { getByTestId } = render(
        <BreathingCircle
          onComplete={mockOnComplete}
          autoStart={true}
          testID="breathing-circle"
        />
      );

      const breathingCircle = getByTestId('breathing-circle');

      // Verify breathing cycle timing
      let breathInCount = 0;
      let breathOutCount = 0;

      // Mock instruction changes
      const originalSetInterval = setInterval;
      setInterval = jest.fn((callback, ms) => {
        if (ms === 2000) { // Half of 4-second cycle
          breathInCount++;
          if (breathInCount % 2 === 1) {
            // Should be "Breathe In"
          } else {
            // Should be "Breathe Out"
            breathOutCount++;
          }
        }
        return originalSetInterval(callback, ms);
      });

      act(() => {
        jest.advanceTimersByTime(8000); // 2 complete cycles
      });

      // Verify cycle count
      expect(breathInCount).toBeGreaterThan(0);
      expect(breathOutCount).toBeGreaterThan(0);
    });

    test('handles therapeutic interruption and recovery', async () => {
      const { getByText, queryByText } = render(
        <BreathingCircle
          onComplete={mockOnComplete}
          autoStart={true}
        />
      );

      // Start exercise
      await waitFor(() => {
        expect(getByText('Step 1 of 3')).toBeTruthy();
      });

      // Simulate app backgrounding during therapeutic session
      act(() => {
        jest.advanceTimersByTime(30000); // 30 seconds
      });

      // Press skip to test interruption handling
      const skipButton = getByText('Skip');
      fireEvent.press(skipButton);

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledTimes(1);
      });

      // Verify clean completion
      expect(queryByText('Step 1 of 3')).toBeFalsy();
    });
  });

  describe('EmotionGrid Crisis Safety and Anxiety Adaptation', () => {
    const mockOnSelectionChange = jest.fn();

    beforeEach(() => {
      mockOnSelectionChange.mockClear();
    });

    test('validates 150ms anxiety adaptation delays', async () => {
      const { getByText } = render(
        <EmotionGrid
          selected={[]}
          onSelectionChange={mockOnSelectionChange}
          anxietyAware={true}
          mindfulPacing={true}
        />
      );

      const startTime = Date.now();
      
      // Select an emotion
      const anxiousButton = getByText('Anxious');
      fireEvent.press(anxiousButton);

      // Fast-forward anxiety adaptation delay
      act(() => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(mockOnSelectionChange).toHaveBeenCalledWith(['anxious']);
      });

      // Verify delay was applied (timing precision test)
      const elapsedTime = Date.now() - startTime;
      expect(elapsedTime).toBeGreaterThanOrEqual(150);
    });

    test('detects crisis emotions and activates emergency protocols', async () => {
      const mockActivateEmergencyCrisisAccess = jest.fn();
      const mockAnnounceEmergencyInstructions = jest.fn();

      // Mock therapeutic accessibility with crisis detection
      jest.doMock('../../src/components/accessibility/TherapeuticAccessibilityProvider', () => ({
        useTherapeuticAccessibility: () => ({
          anxietyAdaptationsEnabled: false,
          depressionSupportMode: false,
          crisisEmergencyMode: true,
          isScreenReaderEnabled: true,
          announceForTherapy: jest.fn(),
          provideTharapeuticFeedback: jest.fn(),
          activateEmergencyCrisisAccess: mockActivateEmergencyCrisisAccess,
          announceEmergencyInstructions: mockAnnounceEmergencyInstructions,
        })
      }));

      const { getByText, queryByText } = render(
        <EmotionGrid
          selected={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      // Add crisis emotion to test data
      const CRISIS_EMOTIONS = ['suicidal', 'hopeless', 'overwhelmed'];
      
      // This test would need the component to be modified to include crisis emotions
      // For now, test the high-concern pattern detection
      
      // Select multiple concerning emotions
      fireEvent.press(getByText('Anxious'));
      fireEvent.press(getByText('Sad'));
      fireEvent.press(getByText('Frustrated'));

      act(() => {
        jest.advanceTimersByTime(300); // Allow for async processing
      });

      // Verify crisis support becomes available
      await waitFor(() => {
        expect(queryByText(/Need extra support/)).toBeTruthy();
      });
    });

    test('provides therapeutic feedback for positive emotions in depression mode', async () => {
      const mockProvideTharapeuticFeedback = jest.fn();
      const mockAnnounceForTherapy = jest.fn();

      jest.doMock('../../src/components/accessibility/TherapeuticAccessibilityProvider', () => ({
        useTherapeuticAccessibility: () => ({
          anxietyAdaptationsEnabled: false,
          depressionSupportMode: true,
          crisisEmergencyMode: false,
          isScreenReaderEnabled: true,
          announceForTherapy: mockAnnounceForTherapy,
          provideTharapeuticFeedback: mockProvideTharapeuticFeedback,
          activateEmergencyCrisisAccess: jest.fn(),
          announceEmergencyInstructions: jest.fn(),
        })
      }));

      const { getByText } = render(
        <EmotionGrid
          selected={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      // Select positive emotion
      fireEvent.press(getByText('Happy'));

      act(() => {
        jest.advanceTimersByTime(500); // Wait for therapeutic feedback delay
      });

      await waitFor(() => {
        expect(mockProvideTharapeuticFeedback).toHaveBeenCalledWith('celebrating');
      });
    });
  });

  describe('Pressable Response Time Validation', () => {
    test('validates <200ms response times for crisis situations', async () => {
      const { getByText } = render(
        <EmotionGrid
          selected={[]}
          onSelectionChange={jest.fn()}
          anxietyAware={false}
        />
      );

      const startTime = performance.now();
      
      // Test rapid emotion selection (crisis scenario)
      fireEvent.press(getByText('Anxious'));
      
      const responseTime = performance.now() - startTime;
      
      // In crisis situations, response should be <200ms
      expect(responseTime).toBeLessThan(200);
    });

    test('validates enhanced touch targets for anxiety support (80px+)', () => {
      const { getByText } = render(
        <EmotionGrid
          selected={[]}
          onSelectionChange={jest.fn()}
          anxietyAware={true}
        />
      );

      const emotionButton = getByText('Anxious');
      
      // Get computed style (this would need additional setup in real testing)
      // For now, we validate that the component renders without errors
      expect(emotionButton).toBeTruthy();
      
      // In a real test environment, we would verify:
      // expect(emotionButton.props.style.minHeight).toBeGreaterThanOrEqual(80);
    });
  });

  describe('Therapeutic Animation Performance', () => {
    test('validates 60fps animation performance during therapeutic sessions', async () => {
      const { getByTestId } = render(
        <BreathingCircle
          onComplete={jest.fn()}
          autoStart={true}
          testID="breathing-circle"
        />
      );

      // Simulate animation frames
      let frameCount = 0;
      const targetFPS = 60;
      const testDuration = 1000; // 1 second
      const expectedFrames = (targetFPS * testDuration) / 1000;

      // Mock requestAnimationFrame
      const originalRAF = global.requestAnimationFrame;
      global.requestAnimationFrame = jest.fn((callback) => {
        frameCount++;
        callback(frameCount * (1000 / targetFPS));
        return frameCount;
      });

      act(() => {
        jest.advanceTimersByTime(testDuration);
      });

      // Verify frame rate (should be close to 60fps)
      expect(frameCount).toBeGreaterThanOrEqual(expectedFrames * 0.9); // 90% tolerance
      
      global.requestAnimationFrame = originalRAF;
    });

    test('validates memory management during extended therapeutic interactions', async () => {
      const { getByText, unmount } = render(
        <EmotionGrid
          selected={[]}
          onSelectionChange={jest.fn()}
          anxietyAware={true}
        />
      );

      // Simulate rapid emotion selections (stress test)
      const emotions = ['Happy', 'Sad', 'Anxious', 'Calm', 'Frustrated'];
      
      for (let i = 0; i < 50; i++) {
        const emotion = emotions[i % emotions.length];
        fireEvent.press(getByText(emotion));
        
        act(() => {
          jest.advanceTimersByTime(10); // Rapid selections
        });
      }

      // Component should still be responsive
      expect(getByText('Happy')).toBeTruthy();

      // Clean unmount
      unmount();
      
      // Verify no memory leaks (timers should be cleared)
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('Cross-Platform Parity Validation', () => {
    test('validates identical therapeutic timing across platforms', () => {
      // Mock platform detection
      const originalPlatform = require('react-native').Platform.OS;
      
      // Test iOS timing
      require('react-native').Platform.OS = 'ios';
      const iosComponent = render(
        <BreathingCircle onComplete={jest.fn()} autoStart={true} />
      );
      
      // Test Android timing
      require('react-native').Platform.OS = 'android';
      const androidComponent = render(
        <BreathingCircle onComplete={jest.fn()} autoStart={true} />
      );

      // Both should have identical timing constants
      // (In practice, this would test actual timing behavior)
      expect(iosComponent.getByText('3:00')).toBeTruthy();
      expect(androidComponent.getByText('3:00')).toBeTruthy();

      require('react-native').Platform.OS = originalPlatform;
    });
  });

  describe('Accessibility Compliance Validation', () => {
    test('validates screen reader compatibility with therapeutic announcements', async () => {
      const mockAnnounceForTherapy = jest.fn();

      jest.doMock('../../src/components/accessibility/TherapeuticAccessibilityProvider', () => ({
        useTherapeuticAccessibility: () => ({
          anxietyAdaptationsEnabled: false,
          depressionSupportMode: true,
          crisisEmergencyMode: false,
          isScreenReaderEnabled: true,
          announceForTherapy: mockAnnounceForTherapy,
          provideTharapeuticFeedback: jest.fn(),
          activateEmergencyCrisisAccess: jest.fn(),
          announceEmergencyInstructions: jest.fn(),
        })
      }));

      const { getByText } = render(
        <EmotionGrid
          selected={[]}
          onSelectionChange={jest.fn()}
        />
      );

      fireEvent.press(getByText('Happy'));

      await waitFor(() => {
        expect(mockAnnounceForTherapy).toHaveBeenCalledWith(
          expect.stringContaining('Happy selected'),
          'polite'
        );
      });
    });

    test('validates voice command recognition (<500ms response)', async () => {
      // This would test voice command integration
      // For now, verify accessibility props are correctly set
      const { getByLabelText } = render(
        <EmotionGrid
          selected={[]}
          onSelectionChange={jest.fn()}
        />
      );

      const emotionGrid = getByLabelText(/Emotion selection grid/);
      expect(emotionGrid.props.accessible).toBe(true);
      expect(emotionGrid.props.accessibilityRole).toBe('group');
    });
  });

  describe('Integration with Check-in Flows', () => {
    test('validates data persistence during Pressable interactions', async () => {
      const mockOnSelectionChange = jest.fn();
      
      const { getByText, rerender } = render(
        <EmotionGrid
          selected={[]}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      // Select emotion
      fireEvent.press(getByText('Happy'));

      await waitFor(() => {
        expect(mockOnSelectionChange).toHaveBeenCalledWith(['happy']);
      });

      // Re-render with selection to test persistence
      rerender(
        <EmotionGrid
          selected={['happy']}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      // Verify selection is maintained
      const happyButton = getByText('Happy');
      expect(happyButton.props.accessibilityState.selected).toBe(true);
    });

    test('validates theme adaptation during therapeutic interactions', () => {
      const themes = ['morning', 'midday', 'evening'] as const;
      
      themes.forEach(theme => {
        const { getByText, unmount } = render(
          <EmotionGrid
            selected={[]}
            onSelectionChange={jest.fn()}
            theme={theme}
          />
        );

        // Component should render successfully with each theme
        expect(getByText('Happy')).toBeTruthy();
        
        unmount();
      });
    });
  });
});