/**
 * BreathingCircle Component - MBCT 3-Minute Breathing Space
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
  runOnJS,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { colorSystem, spacing, typography } from '../../../constants/colors';

interface BreathingCircleProps {
  isActive?: boolean;
  onCycleComplete?: () => void;
  testID?: string;
  reducedMotion?: boolean;
}

const BreathingCircle: React.FC<BreathingCircleProps> = ({
  isActive = true,
  onCycleComplete,
  testID = 'breathing-circle',
  reducedMotion = false
}) => {
  // High-performance shared values for 60fps animations
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.8);
  const phase = useSharedValue(0); // 0 = inhale start, 0.5 = exhale start, 1 = cycle complete

  // Cycle counter for completion tracking
  const cycleCountRef = useRef(0);
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

      scale.value = withTiming(1, { duration: 300 });
      opacity.value = withTiming(0.8, { duration: 300 });
      phase.value = 0;
      return;
    }

    // Start the breathing cycle with precise timing
    const startBreathingCycle = () => {
      // Complete cycle: inhale (4s) + exhale (4s) = 8s total
      scale.value = withRepeat(
        withTiming(1.5, {
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true // Reverse animation for exhale
      );

      opacity.value = withRepeat(
        withTiming(1, {
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true // Reverse animation for exhale
      );

      // Phase tracking for accessibility
      phase.value = withRepeat(
        withTiming(1, {
          duration: 8000,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    };

    // Start the breathing cycle
    startBreathingCycle();

    // Cleanup function
    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      cancelAnimation(phase);
    };
  }, [isActive, scale, opacity, phase]);

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

        {/* Accessibility status */}
        <Text style={styles.accessibilityText}>
          {reducedMotion ? '🔊 Audio guidance enabled' : '👁️ Visual guidance active'}
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
  accessibilityText: {
    fontSize: typography.caption.size,
    color: colorSystem.themes.midday.primary,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontWeight: '500',
  },
});

export default BreathingCircle;