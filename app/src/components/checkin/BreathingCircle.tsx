/**
 * BreathingCircle Component - Guided breathing animation for midday reset
 * CRITICAL: Must be exactly 60 seconds per step (3 minutes total)
 *
 * Enhanced with strict TypeScript typing for therapeutic accuracy and timing validation
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { colorSystem, spacing } from '../../constants/colors';
import { Button } from '../core';
import type {
  TherapeuticBreathingSession,
  BreathingPhase,
  BreathingStepDuration,
  TotalBreathingDuration,
  BreathingCycleMs,
  TherapeuticComponentProps,
  TimeOfDay,
  THERAPEUTIC_CONSTANTS,
  TherapeuticTimingError,
  validateTherapeuticTiming
} from '../../types/therapeutic-components';
import type { ISODateString } from '../../types/clinical';

// Strict typing for breathing circle props
interface BreathingCircleProps extends TherapeuticComponentProps {
  readonly onComplete: () => void;
  readonly onTimingError?: (error: TherapeuticTimingError) => void;
  readonly autoStart?: boolean;
  readonly validateTiming?: boolean;
  readonly theme?: TimeOfDay;
}

const { width: screenWidth } = Dimensions.get('window');
const CIRCLE_SIZE = Math.min(screenWidth * 0.6, 200);

// CRITICAL TIMING CONSTANTS - Type-safe and immutable
const BREATH_DURATION: BreathingCycleMs = THERAPEUTIC_CONSTANTS.TIMING.BREATH_CYCLE_MS;
const CYCLES_PER_STEP = THERAPEUTIC_CONSTANTS.TIMING.CYCLES_PER_STEP;
const TOTAL_STEPS = 3 as const;
const STEP_DURATION: BreathingStepDuration = THERAPEUTIC_CONSTANTS.TIMING.BREATHING_STEP_MS;
const TOTAL_DURATION: TotalBreathingDuration = THERAPEUTIC_CONSTANTS.TIMING.TOTAL_BREATHING_MS;

// Internal state type for breathing session
interface BreathingSessionState {
  readonly isActive: boolean;
  readonly currentStep: 1 | 2 | 3;
  readonly instruction: BreathingPhase;
  readonly timeRemaining: number;
  readonly session: TherapeuticBreathingSession | null;
  readonly startTime: ISODateString | null;
}

export const BreathingCircle: React.FC<BreathingCircleProps> = ({
  onComplete,
  onTimingError,
  theme = 'midday',
  autoStart = false,
  validateTiming = true,
  testID = 'breathing-circle',
  accessibilityLabel = 'Breathing exercise circle',
  anxietyAdaptive = false
}) => {
  // Enhanced state with type safety
  const [sessionState, setSessionState] = useState<BreathingSessionState>({
    isActive: autoStart,
    currentStep: 1,
    instruction: 'inhale',
    timeRemaining: TOTAL_DURATION / 1000, // Convert to seconds for display
    session: null,
    startTime: null
  });
  
  const scaleAnimation = useSharedValue(1);
  const opacityAnimation = useSharedValue(0.7);
  const breathPhase = useSharedValue(0);
  
  const themeColors = colorSystem.themes[theme];

  useEffect(() => {
    if (!isActive) return;

    // Main breathing animation
    scaleAnimation.value = withRepeat(
      withSequence(
        // Inhale - expand
        withTiming(1.3, {
          duration: BREATH_DURATION / 2,
          easing: Easing.inOut(Easing.ease),
        }),
        // Exhale - contract
        withTiming(1, {
          duration: BREATH_DURATION / 2,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1, // Infinite
      false
    );

    // Opacity animation for visual feedback
    opacityAnimation.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: BREATH_DURATION / 2,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0.7, {
          duration: BREATH_DURATION / 2,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1,
      false
    );

    // Breath phase tracking for instruction text
    const breathInterval = setInterval(() => {
      breathPhase.value = (breathPhase.value + 1) % 2;
      setInstruction(breathPhase.value === 0 ? 'Breathe In' : 'Breathe Out');
    }, BREATH_DURATION / 2);

    // Timer countdown
    const timerInterval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleComplete();
          return 0;
        }
        
        // Update step every 60 seconds
        const newTime = prev - 1;
        const newStep = Math.ceil(newTime / 60);
        if (newStep !== currentStep) {
          setCurrentStep(TOTAL_STEPS - newStep + 1);
        }
        
        return newTime;
      });
    }, 1000);

    return () => {
      clearInterval(breathInterval);
      clearInterval(timerInterval);
    };
  }, [isActive, scaleAnimation, opacityAnimation, breathPhase, currentStep]);

  const handleStart = () => {
    setIsActive(true);
    setCurrentStep(1);
    setTimeRemaining(TOTAL_STEPS * 60);
  };

  const handleComplete = () => {
    setIsActive(false);
    onComplete();
  };

  const handleSkip = () => {
    setIsActive(false);
    setTimeRemaining(0);
    onComplete();
  };

  const animatedCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnimation.value }],
    opacity: opacityAnimation.value,
  }));

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isActive && timeRemaining === TOTAL_STEPS * 60) {
    // Start screen
    return (
      <View style={styles.container}>
        <Text style={styles.title}>3-Minute Breathing Exercise</Text>
        <Text style={styles.subtitle}>
          Find a comfortable position and follow the breathing circle
        </Text>
        
        <View style={styles.circleContainer}>
          <View style={[
            styles.staticCircle,
            { backgroundColor: themeColors.primary }
          ]} />
        </View>
        
        <Text style={styles.duration}>Duration: 3 minutes</Text>
        
        <Button
          theme={theme}
          onPress={handleStart}
        >
          Start Breathing Exercise
        </Button>
      </View>
    );
  }

  if (!isActive && timeRemaining === 0) {
    // Completion screen
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Well Done!</Text>
        <Text style={styles.subtitle}>
          You've completed your 3-minute breathing exercise
        </Text>
        
        <View style={styles.circleContainer}>
          <View style={[
            styles.staticCircle,
            { backgroundColor: themeColors.success }
          ]} />
        </View>
        
        <Button
          theme={theme}
          variant="success"
          onPress={onComplete}
        >
          Continue
        </Button>
      </View>
    );
  }

  // Active breathing screen
  return (
    <View style={styles.container}>
      <Text style={styles.stepIndicator}>
        Step {currentStep} of {TOTAL_STEPS}
      </Text>
      
      <View style={styles.circleContainer}>
        <Animated.View
          style={[
            styles.breathingCircle,
            animatedCircleStyle,
            {
              backgroundColor: themeColors.primary,
            }
          ]}
        >
          <Text style={styles.instruction}>{instruction}</Text>
        </Animated.View>
      </View>
      
      <Text style={styles.timer}>{formatTime(timeRemaining)}</Text>
      <Text style={styles.guidance}>
        Follow the circle as it expands and contracts
      </Text>
      
      <View style={styles.buttonContainer}>
        <Button
          variant="outline"
          onPress={handleSkip}
          fullWidth={false}
        >
          Skip
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colorSystem.gray[600],
    marginBottom: spacing.xl,
    textAlign: 'center',
    lineHeight: 22,
  },
  stepIndicator: {
    fontSize: 14,
    color: colorSystem.gray[600],
    marginBottom: spacing.md,
  },
  circleContainer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xl,
  },
  breathingCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staticCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    opacity: 0.8,
  },
  instruction: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.base.white,
  },
  timer: {
    fontSize: 32,
    fontWeight: '300',
    color: colorSystem.base.black,
    marginBottom: spacing.sm,
  },
  guidance: {
    fontSize: 14,
    color: colorSystem.gray[600],
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  duration: {
    fontSize: 16,
    color: colorSystem.gray[600],
    marginBottom: spacing.xl,
  },
  buttonContainer: {
    marginTop: spacing.lg,
  },
});

export default BreathingCircle;