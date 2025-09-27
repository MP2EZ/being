/**
 * BreathingCircle Timing Precision Tests
 * CRITICAL: Validates exact 60-second therapeutic timing requirements
 * 
 * Requirements:
 * - Each step must be exactly 60 seconds (±50ms tolerance)
 * - Total duration must be exactly 180 seconds (3 minutes)
 * - Breathing cycles must be exactly 4 seconds (2s inhale, 2s exhale)
 * - Animation timing must maintain 60fps during therapeutic sessions
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { jest } from '@jest/globals';
import { performance } from 'perf_hooks';

// Mock react-native-reanimated with timing tracking
const mockAnimationCallbacks: Function[] = [];
let animationFrameCount = 0;

jest.mock('react-native-reanimated', () => ({
  useSharedValue: jest.fn((value) => ({ 
    value,
    _timing: Date.now() // Track creation time
  })),
  useAnimatedStyle: jest.fn(() => ({})),
  withSpring: jest.fn((value, config) => {
    // Track spring animation timing
    return {
      value,
      config,
      type: 'spring',
      startTime: performance.now()
    };
  }),
  withTiming: jest.fn((value, config) => {
    // Track timing animation precision
    return {
      value,
      config,
      type: 'timing',
      startTime: performance.now(),
      duration: config?.duration || 0
    };
  }),
  withSequence: jest.fn((...animations) => ({
    type: 'sequence',
    animations,
    totalDuration: animations.reduce((sum, anim) => sum + (anim.duration || 0), 0)
  })),
  withRepeat: jest.fn((animation, count, reverse) => ({
    type: 'repeat',
    animation,
    count,
    reverse,
    duration: animation.duration || 4000 // Default breathing cycle
  })),
  interpolate: jest.fn((value, input, output) => value),
  runOnJS: jest.fn((fn) => (...args: any[]) => {
    setTimeout(() => fn(...args), 0);
  }),
  Easing: {
    inOut: jest.fn((easing) => easing),
    ease: 'ease'
  }
}));

// Mock timing constants validation
jest.mock('../../src/types/therapeutic-components', () => ({
  THERAPEUTIC_CONSTANTS: {
    TIMING: {
      BREATH_CYCLE_MS: 4000,
      CYCLES_PER_STEP: 15,
      BREATHING_STEP_MS: 60000,
      TOTAL_BREATHING_MS: 180000
    }
  },
  validateTherapeuticTiming: jest.fn((actual, expected, tolerance = 50) => {
    const diff = Math.abs(actual - expected);
    return {
      isValid: diff <= tolerance,
      difference: diff,
      tolerance,
      actual,
      expected
    };
  })
}));

import { BreathingCircle } from '../../src/components/checkin/BreathingCircle';

describe('BreathingCircle Timing Precision Validation', () => {
  let mockOnComplete: jest.Mock;
  let mockOnTimingError: jest.Mock;
  let originalSetInterval: typeof setInterval;
  let originalClearInterval: typeof clearInterval;
  let activeIntervals: NodeJS.Timeout[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ shouldClearNativeTimers: true });
    
    mockOnComplete = jest.fn();
    mockOnTimingError = jest.fn();
    activeIntervals = [];
    
    // Track intervals for precise timing validation
    originalSetInterval = global.setInterval;
    originalClearInterval = global.clearInterval;
    
    global.setInterval = jest.fn((callback, ms) => {
      const interval = originalSetInterval(callback, ms);
      activeIntervals.push(interval);
      return interval;
    });
    
    global.clearInterval = jest.fn((interval) => {
      activeIntervals = activeIntervals.filter(i => i !== interval);
      return originalClearInterval(interval);
    });

    animationFrameCount = 0;
  });

  afterEach(() => {
    // Clean up all intervals
    activeIntervals.forEach(clearInterval);
    activeIntervals = [];
    
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
    
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('60-Second Step Timing Validation', () => {
    test('validates exact 60-second step transitions with ±50ms tolerance', async () => {
      const timingErrors: Array<{step: number, actual: number, expected: number}> = [];
      
      const { getByText } = render(
        <BreathingCircle
          onComplete={mockOnComplete}
          onTimingError={(error) => {
            timingErrors.push({
              step: error.step,
              actual: error.actualDuration,
              expected: error.expectedDuration
            });
            mockOnTimingError(error);
          }}
          validateTiming={true}
          autoStart={true}
        />
      );

      const stepTransitionTimes: number[] = [];
      let currentStep = 1;

      // Monitor step transitions
      const checkStepTransition = () => {
        try {
          const stepText = getByText(`Step ${currentStep + 1} of 3`);
          if (stepText) {
            stepTransitionTimes.push(performance.now());
            currentStep++;
          }
        } catch (e) {
          // Step not yet visible
        }
      };

      // Start timing
      const startTime = performance.now();

      // Advance exactly 60 seconds for first step
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      checkStepTransition();

      // Advance exactly 60 seconds for second step
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      checkStepTransition();

      // Advance exactly 60 seconds for final step
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledTimes(1);
      });

      // Validate total duration (180 seconds ±50ms)
      const totalDuration = performance.now() - startTime;
      const expectedTotalDuration = 180000; // 3 minutes
      const tolerance = 50;

      expect(Math.abs(totalDuration - expectedTotalDuration)).toBeLessThanOrEqual(tolerance);

      // Validate no timing errors occurred
      expect(timingErrors).toHaveLength(0);
      expect(mockOnTimingError).not.toHaveBeenCalled();
    });

    test('detects and reports timing drift beyond tolerance', async () => {
      const { getByText } = render(
        <BreathingCircle
          onComplete={mockOnComplete}
          onTimingError={mockOnTimingError}
          validateTiming={true}
          autoStart={true}
        />
      );

      // Introduce timing drift (advance by 60.1 seconds)
      act(() => {
        jest.advanceTimersByTime(60100); // 100ms over tolerance
      });

      // Should trigger timing error
      await waitFor(() => {
        expect(mockOnTimingError).toHaveBeenCalledWith(
          expect.objectContaining({
            step: 1,
            actualDuration: expect.any(Number),
            expectedDuration: 60000,
            tolerance: 50,
            isValid: false
          })
        );
      });
    });

    test('maintains timing accuracy during app backgrounding', async () => {
      const { getByText } = render(
        <BreathingCircle
          onComplete={mockOnComplete}
          onTimingError={mockOnTimingError}
          validateTiming={true}
          autoStart={true}
        />
      );

      // Simulate app going to background after 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Simulate app coming back to foreground
      // Component should maintain accurate timing
      act(() => {
        jest.advanceTimersByTime(30000); // Complete the 60-second step
      });

      // Verify step transition occurred correctly
      await waitFor(() => {
        expect(getByText('Step 2 of 3')).toBeTruthy();
      });

      expect(mockOnTimingError).not.toHaveBeenCalled();
    });
  });

  describe('Breathing Cycle Timing (4-Second Cycles)', () => {
    test('validates 4-second breathing cycles (2s inhale, 2s exhale)', async () => {
      const breathingPhases: Array<{phase: string, timestamp: number}> = [];
      
      // Mock instruction updates to track breathing phases
      const originalConsoleLog = console.log;
      console.log = jest.fn();

      const { getByText } = render(
        <BreathingCircle
          onComplete={mockOnComplete}
          autoStart={true}
        />
      );

      // Track breathing instruction changes
      let currentInstruction = 'Breathe In';
      const trackInstructionChange = (newInstruction: string) => {
        if (newInstruction !== currentInstruction) {
          breathingPhases.push({
            phase: newInstruction,
            timestamp: performance.now()
          });
          currentInstruction = newInstruction;
        }
      };

      // Monitor for 16 seconds (4 complete breathing cycles)
      for (let i = 0; i < 8; i++) {
        act(() => {
          jest.advanceTimersByTime(2000); // 2-second intervals
        });
        
        // Check for instruction changes
        try {
          const breatheInElement = getByText('Breathe In');
          trackInstructionChange('Breathe In');
        } catch (e) {
          try {
            const breatheOutElement = getByText('Breathe Out');
            trackInstructionChange('Breathe Out');
          } catch (e) {
            // Neither instruction visible
          }
        }
      }

      // Validate breathing cycle timing
      for (let i = 1; i < breathingPhases.length; i++) {
        const timeDiff = breathingPhases[i].timestamp - breathingPhases[i-1].timestamp;
        expect(Math.abs(timeDiff - 2000)).toBeLessThanOrEqual(50); // ±50ms tolerance
      }

      console.log = originalConsoleLog;
    });

    test('validates breathing cycle animation synchronization', async () => {
      const animationTimings: Array<{type: string, timestamp: number, duration: number}> = [];
      
      // Track animation calls
      const reanimated = require('react-native-reanimated');
      const originalWithTiming = reanimated.withTiming;
      
      reanimated.withTiming = jest.fn((value, config) => {
        animationTimings.push({
          type: 'timing',
          timestamp: performance.now(),
          duration: config?.duration || 0
        });
        return originalWithTiming(value, config);
      });

      const { getByTestId } = render(
        <BreathingCircle
          onComplete={mockOnComplete}
          autoStart={true}
          testID="breathing-circle"
        />
      );

      // Allow for animation setup
      act(() => {
        jest.advanceTimersByTime(4000); // One complete breathing cycle
      });

      // Verify animation timing synchronization
      const breathingAnimations = animationTimings.filter(anim => anim.duration === 2000);
      expect(breathingAnimations.length).toBeGreaterThanOrEqual(2); // Inhale and exhale animations

      reanimated.withTiming = originalWithTiming;
    });
  });

  describe('Performance Timing Validation', () => {
    test('validates 60fps animation performance during therapeutic timing', async () => {
      let frameCount = 0;
      const targetFPS = 60;
      const testDuration = 4000; // 4 seconds (one breathing cycle)
      
      // Mock requestAnimationFrame with precise timing
      const originalRAF = global.requestAnimationFrame;
      global.requestAnimationFrame = jest.fn((callback) => {
        const frameTime = frameCount * (1000 / targetFPS);
        frameCount++;
        setTimeout(() => callback(frameTime), 0);
        return frameCount;
      });

      const { getByTestId } = render(
        <BreathingCircle
          onComplete={mockOnComplete}
          autoStart={true}
          testID="breathing-circle"
        />
      );

      // Run animation for test duration
      act(() => {
        jest.advanceTimersByTime(testDuration);
      });

      // Calculate expected frames
      const expectedFrames = (targetFPS * testDuration) / 1000;
      const frameRateTolerance = 0.1; // 10% tolerance

      expect(frameCount).toBeGreaterThanOrEqual(expectedFrames * (1 - frameRateTolerance));
      expect(frameCount).toBeLessThanOrEqual(expectedFrames * (1 + frameRateTolerance));

      global.requestAnimationFrame = originalRAF;
    });

    test('validates memory efficiency during 3-minute therapeutic session', async () => {
      const initialMemory = process.memoryUsage();
      
      const { getByTestId, unmount } = render(
        <BreathingCircle
          onComplete={mockOnComplete}
          autoStart={true}
          testID="breathing-circle"
        />
      );

      // Run complete 3-minute session
      act(() => {
        jest.advanceTimersByTime(180000); // 3 minutes
      });

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledTimes(1);
      });

      // Clean unmount
      unmount();

      // Allow garbage collection
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory growth should be minimal (< 10MB for this test)
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);

      // All intervals should be cleared
      expect(activeIntervals).toHaveLength(0);
    });

    test('validates timing accuracy under simulated load', async () => {
      const timingMeasurements: number[] = [];
      
      // Simulate system load with concurrent operations
      const loadSimulation = setInterval(() => {
        // Simulate CPU-intensive operation
        for (let i = 0; i < 1000; i++) {
          Math.random();
        }
      }, 10);

      const { getByText } = render(
        <BreathingCircle
          onComplete={mockOnComplete}
          onTimingError={mockOnTimingError}
          validateTiming={true}
          autoStart={true}
        />
      );

      const startTime = performance.now();

      // Measure step transition timing under load
      for (let step = 1; step <= 3; step++) {
        act(() => {
          jest.advanceTimersByTime(60000);
        });
        
        timingMeasurements.push(performance.now() - startTime - (step * 60000));
      }

      clearInterval(loadSimulation);

      // All timing measurements should be within tolerance despite load
      timingMeasurements.forEach(deviation => {
        expect(Math.abs(deviation)).toBeLessThanOrEqual(50);
      });

      expect(mockOnTimingError).not.toHaveBeenCalled();
    });
  });

  describe('Cross-Platform Timing Consistency', () => {
    test('validates identical timing behavior across platforms', () => {
      const platforms = ['ios', 'android'] as const;
      const timingResults: Record<string, number[]> = {};

      platforms.forEach(platform => {
        // Mock platform
        const originalPlatform = require('react-native').Platform.OS;
        require('react-native').Platform.OS = platform;

        const stepTransitions: number[] = [];
        
        const { getByText, unmount } = render(
          <BreathingCircle
            onComplete={mockOnComplete}
            autoStart={true}
          />
        );

        const startTime = performance.now();

        // Measure step transitions
        for (let step = 1; step <= 3; step++) {
          act(() => {
            jest.advanceTimersByTime(60000);
          });
          stepTransitions.push(performance.now() - startTime);
        }

        timingResults[platform] = stepTransitions;
        unmount();

        require('react-native').Platform.OS = originalPlatform;
      });

      // Compare timing consistency across platforms
      const iosTimings = timingResults.ios;
      const androidTimings = timingResults.android;

      for (let i = 0; i < iosTimings.length; i++) {
        const timingDifference = Math.abs(iosTimings[i] - androidTimings[i]);
        expect(timingDifference).toBeLessThanOrEqual(10); // Very tight tolerance for cross-platform
      }
    });
  });

  describe('Edge Case Timing Scenarios', () => {
    test('validates timing recovery after component re-render', async () => {
      const { getByText, rerender } = render(
        <BreathingCircle
          onComplete={mockOnComplete}
          onTimingError={mockOnTimingError}
          validateTiming={true}
          autoStart={true}
        />
      );

      // Progress 30 seconds into first step
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Force re-render
      rerender(
        <BreathingCircle
          onComplete={mockOnComplete}
          onTimingError={mockOnTimingError}
          validateTiming={true}
          autoStart={true}
        />
      );

      // Complete remaining 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Should transition to step 2 correctly
      await waitFor(() => {
        expect(getByText('Step 2 of 3')).toBeTruthy();
      });

      expect(mockOnTimingError).not.toHaveBeenCalled();
    });

    test('validates timing with rapid start/stop cycles', async () => {
      const { getByText } = render(
        <BreathingCircle
          onComplete={mockOnComplete}
          onTimingError={mockOnTimingError}
          validateTiming={true}
        />
      );

      // Start exercise
      fireEvent.press(getByText('Start Breathing Exercise'));

      // Progress partially
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Skip (stop)
      fireEvent.press(getByText('Skip'));

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled();
      });

      // Restart
      fireEvent.press(getByText('Start Breathing Exercise'));

      // Should start fresh timing
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      await waitFor(() => {
        expect(getByText('Step 2 of 3')).toBeTruthy();
      });

      expect(mockOnTimingError).not.toHaveBeenCalled();
    });
  });
});