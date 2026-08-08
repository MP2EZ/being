/**
 * Timer Component - Millisecond Precision for 3-Minute Breathing Space
 * 
 * CLINICAL SPECIFICATIONS:
 * - 60 seconds per screen (±50ms tolerance)
 * - Auto-advance functionality
 * - Pause capability for safety/accessibility
 * - Visual progress indicator
 * - Screen reader announcements
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, AccessibilityInfo } from 'react-native';
import { colorSystem, spacing, typography, borderRadius } from '@/core/theme';
import { TOUCH_TARGETS } from '@/core/theme/accessibility';

interface TimerProps {
  duration: number; // Duration in milliseconds
  isActive: boolean;
  onComplete: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onTick?: (remainingMs: number) => void; // Called on each tick with remaining time
  showProgress?: boolean;
  showControls?: boolean; // Show pause/resume buttons (default true)
  showSkip?: boolean;
  onSkip?: () => void;
  theme?: 'morning' | 'midday' | 'evening' | 'learn';
  testID?: string;
}

const Timer: React.FC<TimerProps> = ({
  duration,
  isActive,
  onComplete,
  onPause,
  onResume,
  onTick,
  showProgress = true,
  showControls = true,
  showSkip = true,
  onSkip,
  theme = 'learn',
  testID = 'timer'
}) => {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);
  const pauseStartTimeRef = useRef<number | null>(null); // Track when pause started
  const previousIsActiveRef = useRef<boolean>(isActive); // Track previous isActive state
  const lastSecondRef = useRef<number | null>(null); // Last whole-second value reported to parent

  // The interval drives the local display/progress; parent-facing onTick and
  // a11y announcements are gated to whole-second changes (see startTimer). Keep
  // this a clean divisor of 1000ms and <=500ms so no trigger second
  // (30/10/5/4/3/2/1) is ever skipped. 250ms = 4 ticks/sec for a smooth bar.
  const TICK_INTERVAL_MS = 250;

  const themeColors = colorSystem.themes[theme];

  // Calculate progress percentage
  const progress = 1 - (timeRemaining / duration);

  // Format time for display (mm:ss)
  const formatTime = useCallback((ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // Announce time remaining for accessibility
  const announceTimeRemaining = useCallback((ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds === 30 || seconds === 10 || seconds <= 5) {
      const announcement = seconds === 1 
        ? "1 second remaining"
        : `${seconds} seconds remaining`;
      AccessibilityInfo.announceForAccessibility(announcement);
    }
  }, []);

  // Start timer
  const startTimer = useCallback(() => {
    // Only set start time on fresh start (not on resume from pause)
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    }

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      // Guard against null startTimeRef (defensive - shouldn't happen)
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
        return;
      }
      const elapsed = now - startTimeRef.current - pausedTimeRef.current;
      const remaining = duration - elapsed;

      if (remaining <= 0) {
        lastSecondRef.current = 0;
        setTimeRemaining(0);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        onComplete();
      } else {
        // Local display + progress bar update at the tick cadence. This
        // re-render is isolated to Timer (memoized below), so it does not
        // cascade to the parent screen or its siblings (e.g. BreathingCircle).
        setTimeRemaining(remaining);

        // Parent-facing onTick and accessibility announcements fire only when
        // the displayed whole-second changes — keeps the parent screen at
        // ~1 render/sec instead of cascading at the tick rate, and prevents
        // duplicate "N seconds remaining" utterances within the same second.
        const second = Math.ceil(remaining / 1000);
        if (second !== lastSecondRef.current) {
          lastSecondRef.current = second;
          announceTimeRemaining(remaining);
          onTick?.(remaining); // Report remaining time to parent
        }
      }
    }, TICK_INTERVAL_MS);
  }, [duration, onComplete, announceTimeRemaining, onTick]);

  // Pause timer - just notify parent, parent controls isActive
  const handlePause = useCallback(() => {
    onPause?.();
  }, [onPause]);

  // Resume timer - just notify parent, parent controls isActive
  const handleResume = useCallback(() => {
    onResume?.();
  }, [onResume]);

  // Handle skip
  const handleSkip = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    onSkip?.();
  }, [onSkip]);

  // Reset timer when duration changes - MUST run before isActive effect
  useEffect(() => {
    setTimeRemaining(duration);
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
    pauseStartTimeRef.current = null;
    lastSecondRef.current = null;
  }, [duration]);

  // Effect to manage timer lifecycle based on isActive prop
  useEffect(() => {
    const wasActive = previousIsActiveRef.current;
    previousIsActiveRef.current = isActive;

    if (isActive) {
      // Only start timer if not already running
      if (!intervalRef.current) {
        // Handle resume from pause
        if (!wasActive && pauseStartTimeRef.current !== null) {
          // Resuming from pause - add pause duration to total
          const pauseDuration = Date.now() - pauseStartTimeRef.current;
          pausedTimeRef.current += pauseDuration;
          pauseStartTimeRef.current = null;
        }
        startTimer();
      }
    } else {
      // Pause timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (wasActive) {
        // Just paused - store pause start time
        pauseStartTimeRef.current = Date.now();
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, startTimer]);

  return (
    <View style={styles.container} testID={testID}>
      {/* Progress indicator */}
      {showProgress && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressTrack, { backgroundColor: themeColors.background }]}>
            <View 
              style={[
                styles.progressFill,
                { 
                  backgroundColor: themeColors.primary,
                  width: `${Math.min(progress * 100, 100)}%` 
                }
              ]}
            />
          </View>
        </View>
      )}

      {/* Time display */}
      <Text 
        style={[styles.timeText, { color: themeColors.primary }]}
        accessibilityRole="timer"
        accessibilityLabel={`Time remaining: ${formatTime(timeRemaining)}`}
      >
        {formatTime(timeRemaining)}
      </Text>

      {/* Control buttons */}
      <View style={styles.controlsContainer}>
        {/* Pause/Resume button */}
        {showControls && (
          <Pressable
            style={({ pressed }) => [
              styles.controlButton,
              {
                backgroundColor: pressed ? themeColors.light : themeColors.primary,
                opacity: pressed ? 0.8 : 1
              }
            ]}
            onPress={isActive ? handlePause : handleResume}
            accessibilityRole="button"
            accessibilityLabel={isActive ? "Pause timer" : "Resume timer"}
            accessibilityHint="Tap to pause or resume the session timer"
          >
            <Text style={styles.controlButtonText}>
              {isActive ? 'Pause' : 'Resume'}
            </Text>
          </Pressable>
        )}

        {/* Skip button */}
        {showSkip && onSkip && (
          <Pressable
            style={({ pressed }) => [
              styles.skipButton,
              { opacity: pressed ? 0.6 : 1 }
            ]}
            onPress={handleSkip}
            accessibilityRole="button"
            accessibilityLabel="Skip this step"
            accessibilityHint="Skip the current breathing exercise step"
          >
            <Text style={[styles.skipButtonText, { color: themeColors.primary }]}>
              Skip this step
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing[16],
  },
  progressContainer: {
    width: '100%',
    marginBottom: spacing[16],
  },
  progressTrack: {
    width: '100%',
    height: spacing[4],
    borderRadius: borderRadius.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.xs,
  },
  timeText: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    marginBottom: spacing[16],
    fontVariant: ['tabular-nums'], // Consistent spacing for numbers
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[16],
  },
  controlButton: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    borderRadius: borderRadius.medium,
    minWidth: 80,
    alignItems: 'center',
    // DEBUG-365. Padding alone gave ~33pt. minHeight (never height) so the box
    // can still grow at large Dynamic Type sizes instead of clipping the label;
    // justifyContent centres the label now that the box is taller than content.
    // NOT hitSlop: the collapsible crisis overlay already rejected slop-only as
    // meeting "functional but not visual requirement" (see the 44pt visible-target
    // note in features/crisis/components/), and controlsContainer's 16pt gap
    // means a 12pt slop on both this and skipButton would overlap by 8pt — Skip
    // renders later, so it would win the overlap and fire an irreversible step
    // advance when the user aimed at Pause.
    minHeight: TOUCH_TARGETS.minimum,
    justifyContent: 'center',
  },
  controlButtonText: {
    color: colorSystem.base.white,
    fontSize: typography.caption.size,
    fontWeight: typography.fontWeight.semibold,
  },
  skipButton: {
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[8],
    // DEBUG-365. LATENT, not live: `showSkip && onSkip` guards the render and
    // every one of the six <Timer> call sites passes showSkip={false} with no
    // onSkip, so this renders nowhere today (SkipLink, already 44pt, provides
    // the skip affordance instead). Fixed rather than deleted because showSkip
    // defaults to true — the next call site that omits the prop gets a compliant
    // control instead of a ~33pt one.
    minHeight: TOUCH_TARGETS.minimum,
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: typography.caption.size,
    fontWeight: typography.fontWeight.medium,
    textDecorationLine: 'underline',
  },
});

// Memoized: with stable props (duration, isActive, and the now-stable
// onTick/onComplete from useTimerPractice) Timer only re-renders when those
// change, so a parent re-render does not reconcile it. Its own per-tick
// display updates remain internal.
export default React.memo(Timer);