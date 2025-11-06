/**
 * BreathingCircle Component - 3-Minute Breathing Space
 *
 * CLINICAL SPECIFICATIONS:
 * - 8-second breathing cycle (4s inhale, 4s exhale)
 * - 60fps performance for therapeutic smoothness
 * - Non-directive guidance (follows natural rhythm)
 * - Midday theme (#40B5AD)
 * - Accessibility compliant with audio cues
 * - Reduced motion support
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withDelay,
  withSequence,
  runOnJS,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { colorSystem, spacing, typography } from '../../../constants/colors';

interface BreathingPattern {
  inhale: number;  // milliseconds
  hold?: number;   // milliseconds (optional)
  exhale: number;  // milliseconds
}

interface BreathingCircleProps {
  isActive?: boolean;
  onCycleComplete?: () => void;
  testID?: string;
  reducedMotion?: boolean;
  pattern?: BreathingPattern; // NEW: configurable pattern
  showCountdown?: boolean;     // NEW: show countdown numbers
  phaseText?: {                // NEW: custom phase labels
    inhale?: string;
    hold?: string;
    exhale?: string;
  };
}

// Default 4-4 pattern (backward compatible)
const DEFAULT_PATTERN: BreathingPattern = {
  inhale: 4000,
  exhale: 4000,
};

const BreathingCircle: React.FC<BreathingCircleProps> = ({
  isActive = true,
  onCycleComplete,
  testID = 'breathing-circle',
  reducedMotion = false,
  pattern = DEFAULT_PATTERN,
  showCountdown = false,
  phaseText = { inhale: 'Breathe in', hold: 'Hold', exhale: 'Breathe out' },
}) => {
  // High-performance shared values for 60fps animations
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.8);
  const phase = useSharedValue(0); // 0 = inhale start, 0.5 = exhale start, 1 = cycle complete
  const countdown = useSharedValue(0);        // Current countdown number
  const currentPhase = useSharedValue<'inhale' | 'hold' | 'exhale'>('inhale');

  // Cycle counter for completion tracking
  const cycleCountRef = useRef(0);
  // Countdown interval ref for proper cleanup
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Use shared value for worklet compatibility (accessed in UI thread)
  const isReducedMotion = useSharedValue(reducedMotion);

  // Audio accessibility announcements
  const announcePhase = useCallback((phaseText: string) => {
    AccessibilityInfo.announceForAccessibility(phaseText);
  }, []);

  // Handle cycle completion on JS thread
  const handleCycleComplete = useCallback(() => {
    cycleCountRef.current += 1;
    onCycleComplete?.();
  }, [onCycleComplete]);

  // 60fps optimized animation styles using worklets
  const animatedStyle = useAnimatedStyle(() => {
    'worklet';

    if (isReducedMotion.value) {
      // Minimal animation for reduced motion
      return {
        transform: [{ scale: 1 + (scale.value - 1) * 0.2 }],
        opacity: 0.9,
      };
    }

    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  }, [scale, opacity, isReducedMotion]); // Add dependencies for better optimization

  // Phase monitoring for accessibility announcements
  const phaseStyle = useAnimatedStyle(() => {
    'worklet';

    // Trigger announcements at phase transitions
    if (phase.value === 0) {
      runOnJS(announcePhase)('Breathe in');
    } else if (phase.value === 0.5) {
      runOnJS(announcePhase)('Breathe out');
    } else if (phase.value >= 0.99) {
      runOnJS(handleCycleComplete)();
    }

    return {};
  }, [phase]); // Add dependencies for optimization

  useEffect(() => {
    isReducedMotion.value = reducedMotion;
  }, [reducedMotion, isReducedMotion]);

  useEffect(() => {
    if (!isActive) {
      // Stop all animations and reset to initial state
      cancelAnimation(scale);
      cancelAnimation(opacity);
      cancelAnimation(phase);
      cancelAnimation(countdown);

      // Clear countdown interval
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }

      scale.value = withTiming(1, { duration: 300 });
      opacity.value = withTiming(0.8, { duration: 300 });
      phase.value = 0;
      countdown.value = 0;
      return;
    }

    const hasHoldPhase = pattern.hold && pattern.hold > 0;

    if (!hasHoldPhase) {
      // Backward compatible: use withRepeat for simple inhale/exhale pattern
      const cycleDuration = pattern.inhale + pattern.exhale;

      scale.value = withRepeat(
        withTiming(1.5, {
          duration: pattern.inhale,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true // Reverse animation for exhale
      );

      opacity.value = withRepeat(
        withTiming(1, {
          duration: pattern.inhale,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true // Reverse animation for exhale
      );

      phase.value = withRepeat(
        withTiming(1, {
          duration: cycleDuration,
          easing: Easing.linear,
        }),
        -1,
        false
      );

      // Initial announcement
      announcePhase(phaseText.inhale || 'Breathe in');
    } else {
      // Sequential animation for patterns with hold phase (e.g., 4-7-8)
      let isComponentActive = true;

      const startCountdown = (duration: number, phaseName: 'inhale' | 'hold' | 'exhale') => {
        if (!showCountdown) return;

        const seconds = Math.ceil(duration / 1000);
        countdown.value = seconds;
        currentPhase.value = phaseName;

        countdownIntervalRef.current = setInterval(() => {
          countdown.value = Math.max(0, countdown.value - 1);
          if (countdown.value <= 0 && countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
        }, 1000);
      };

      const clearCountdown = () => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      };

      const startBreathingCycle = () => {
        if (!isComponentActive) return;

        // INHALE phase - start announcements and countdown
        currentPhase.value = 'inhale';
        announcePhase(phaseText.inhale || 'Breathe in');
        startCountdown(pattern.inhale, 'inhale');

        // Animation: inhale -> hold (maintain) -> exhale
        scale.value = withSequence(
          // Inhale: scale up
          withTiming(1.5, {
            duration: pattern.inhale,
            easing: Easing.inOut(Easing.ease),
          }),
          // Hold: maintain scale for hold duration
          withDelay(pattern.hold!, withTiming(1.5, { duration: 0 })),
          // Exhale: scale down
          withTiming(1, {
            duration: pattern.exhale,
            easing: Easing.inOut(Easing.ease),
          })
        );

        // Schedule phase transitions and announcements
        // After inhale completes -> start hold
        setTimeout(() => {
          if (!isComponentActive) return;
          clearCountdown();
          currentPhase.value = 'hold';
          announcePhase(phaseText.hold || 'Hold');
          startCountdown(pattern.hold!, 'hold');

          // After hold completes -> start exhale
          setTimeout(() => {
            if (!isComponentActive) return;
            clearCountdown();
            currentPhase.value = 'exhale';
            announcePhase(phaseText.exhale || 'Breathe out');
            startCountdown(pattern.exhale, 'exhale');

            // After exhale completes -> cycle complete
            setTimeout(() => {
              if (!isComponentActive) return;
              clearCountdown();
              handleCycleComplete();

              // Restart cycle
              setTimeout(() => {
                if (isComponentActive) {
                  startBreathingCycle();
                }
              }, 100);
            }, pattern.exhale);
          }, pattern.hold!);
        }, pattern.inhale);

        // Opacity animation (simpler - just pulse throughout)
        opacity.value = withRepeat(
          withTiming(1, {
            duration: (pattern.inhale + (pattern.hold || 0) + pattern.exhale) / 2,
            easing: Easing.inOut(Easing.ease),
          }),
          -1,
          true
        );
      };

      startBreathingCycle();

      // Cleanup function
      return () => {
        isComponentActive = false;
        clearCountdown();
        cancelAnimation(scale);
        cancelAnimation(opacity);
        cancelAnimation(phase);
        cancelAnimation(countdown);
      };
    }

    // Cleanup function for simple pattern
    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      cancelAnimation(phase);
      cancelAnimation(countdown);
    };
  }, [isActive, pattern, scale, opacity, phase, countdown, announcePhase, handleCycleComplete, phaseText, showCountdown]);

  return (
    <View style={styles.container} testID={testID}>
      {/* Phase monitoring for accessibility */}
      <Animated.View style={phaseStyle} />

      {/* Main breathing circle */}
      <Animated.View
        style={[styles.breathingCircle, animatedStyle]}
        accessibilityRole="image"
        accessibilityLabel="Breathing guide circle"
        accessibilityHint="Follow the expanding and contracting circle to guide your breathing. Audio cues will announce when to breathe in and out."
      >
        {/* Inner circle for visual depth */}
        <View style={styles.innerCircle} />

        {/* Countdown display (when enabled) */}
        {showCountdown && (
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownText}>
              {countdown.value > 0 ? countdown.value : ''}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Guidance text */}
      <View style={styles.guidanceContainer}>
        <Text style={styles.guidanceText}>
          {reducedMotion
            ? 'Audio cues will guide your breathing'
            : 'Follow the circle as it expands and contracts'
          }
        </Text>
        <Text style={styles.instructionText}>
          Let your breath find its natural rhythm
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  breathingCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colorSystem.themes.midday.primary, // #40B5AD
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colorSystem.themes.midday.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  innerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colorSystem.themes.midday.light, // #5EC4BC
    opacity: 0.6,
  },
  guidanceContainer: {
    marginTop: spacing.xl,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  guidanceText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '500',
    color: colorSystem.base.black,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  instructionText: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[600],
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  countdownContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colorSystem.base.white,
    textAlign: 'center',
  },
});

export default BreathingCircle;