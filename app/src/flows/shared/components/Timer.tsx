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
import { colorSystem, spacing, typography } from '../../../constants/colors';

interface TimerProps {
  duration: number; // Duration in milliseconds
  isActive: boolean;
  onComplete: () => void;
  onPause?: () => void;
  onResume?: () => void;
  showProgress?: boolean;
  showSkip?: boolean;
  onSkip?: () => void;
  theme?: 'morning' | 'midday' | 'evening';
  testID?: string;
}

const Timer: React.FC<TimerProps> = ({
  duration,
  isActive,
  onComplete,
  onPause,
  onResume,
  showProgress = true,
  showSkip = true,
  onSkip,
  theme = 'midday',
  testID = 'timer'
}) => {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);
  
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
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    }
    
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - (startTimeRef.current || 0) - pausedTimeRef.current;
      const remaining = duration - elapsed;
      
      if (remaining <= 0) {
        setTimeRemaining(0);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        onComplete();
      } else {
        setTimeRemaining(remaining);
        announceTimeRemaining(remaining);
      }
    }, 16); // ~60fps for smooth progress updates
  }, [duration, onComplete, announceTimeRemaining]);

  // Pause timer
  const handlePause = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPaused(true);
    onPause?.();
  }, [onPause]);

  // Resume timer
  const handleResume = useCallback(() => {
    if (isPaused) {
      pausedTimeRef.current += Date.now() - (startTimeRef.current || 0);
      startTimer();
      setIsPaused(false);
      onResume?.();
    }
  }, [isPaused, startTimer, onResume]);

  // Handle skip
  const handleSkip = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    onSkip?.();
  }, [onSkip]);

  // Effect to manage timer lifecycle
  useEffect(() => {
    if (isActive && !isPaused) {
      startTimer();
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, isPaused, startTimer]);

  // Reset timer when duration changes
  useEffect(() => {
    setTimeRemaining(duration);
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
    setIsPaused(false);
  }, [duration]);

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
        <Pressable
          style={({ pressed }) => [
            styles.controlButton,
            { 
              backgroundColor: pressed ? themeColors.light : themeColors.primary,
              opacity: pressed ? 0.8 : 1 
            }
          ]}
          onPress={isPaused ? handleResume : handlePause}
          accessibilityRole="button"
          accessibilityLabel={isPaused ? "Resume timer" : "Pause timer"}
          accessibilityHint="Tap to pause or resume the session timer"
        >
          <Text style={styles.controlButtonText}>
            {isPaused ? 'Resume' : 'Pause'}
          </Text>
        </Pressable>

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
    paddingVertical: spacing.md,
  },
  progressContainer: {
    width: '100%',
    marginBottom: spacing.md,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  timeText: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    marginBottom: spacing.md,
    fontVariant: ['tabular-nums'], // Consistent spacing for numbers
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  controlButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  controlButtonText: {
    color: colorSystem.base.white,
    fontSize: typography.caption.size,
    fontWeight: '600',
  },
  skipButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  skipButtonText: {
    fontSize: typography.caption.size,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});

export default Timer;