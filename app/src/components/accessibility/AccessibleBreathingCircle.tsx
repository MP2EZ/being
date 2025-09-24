/**
 * AccessibleBreathingCircle - Enhanced accessibility for breathing exercises
 *
 * THERAPEUTIC ACCESSIBILITY FEATURES:
 * - Voice-guided breathing instructions with therapeutic pacing
 * - Haptic breathing rhythm for motor accessibility
 * - Screen reader integration with calming announcements
 * - High contrast mode for visual accessibility
 * - Anxiety-aware larger targets and simplified controls
 * - Depression-supportive encouraging feedback
 * - Crisis-aware emergency exit options
 */

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, AccessibilityInfo } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  runOnJS,
  Easing,
  cancelAnimation,
} from '../../utils/ReanimatedMock';
import { colorSystem, spacing } from '../../constants/colors';
import { Button } from '../core';
import { useTherapeuticAccessibility } from './TherapeuticAccessibilityProvider';

interface AccessibleBreathingCircleProps {
  onComplete: () => void;
  theme?: 'morning' | 'midday' | 'evening';
  autoStart?: boolean;
  accessibilityMode?: 'standard' | 'enhanced' | 'crisis';
  cognitiveSupport?: boolean;
  crisisExitEnabled?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

// Accessibility-aware circle sizing
const getCircleSize = (accessibilityMode: string, anxietyAdaptations: boolean) => {
  const baseSize = Math.min(screenWidth * 0.6, 200);
  const anxietyMultiplier = anxietyAdaptations ? 1.2 : 1.0;
  const accessibilityMultiplier = accessibilityMode === 'enhanced' ? 1.3 : 1.0;

  return Math.min(baseSize * anxietyMultiplier * accessibilityMultiplier, screenWidth * 0.8);
};

// Therapeutic timing constants - slower for accessibility
const THERAPEUTIC_TIMING = {
  BREATH_DURATION: 10000, // 10 seconds per breath cycle (slower for anxiety)
  TOTAL_DURATION: 180000, // 3 minutes total
  INHALE_RATIO: 0.4, // 4 seconds inhale
  HOLD_RATIO: 0.2, // 2 seconds hold
  EXHALE_RATIO: 0.4, // 4 seconds exhale
};

export const AccessibleBreathingCircle: React.FC<AccessibleBreathingCircleProps> = React.memo(({
  onComplete,
  theme = 'midday',
  autoStart = false,
  accessibilityMode = 'standard',
  cognitiveSupport = true,
  crisisExitEnabled = true
}) => {
  const [isActive, setIsActive] = useState(autoStart);
  const [sessionState, setSessionState] = useState<'ready' | 'active' | 'completed'>('ready');
  const [currentPhase, setCurrentPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [timeRemaining, setTimeRemaining] = useState(THERAPEUTIC_TIMING.TOTAL_DURATION / 1000);

  // Therapeutic Accessibility Context
  const {
    anxietyAdaptationsEnabled,
    depressionSupportMode,
    crisisEmergencyMode,
    isScreenReaderEnabled,
    announceForTherapy,
    announceBreathingGuidance,
    provideBreathingHaptics,
    provideTharapeuticFeedback,
    activateEmergencyCrisisAccess,
  } = useTherapeuticAccessibility();

  // Animation values
  const progress = useSharedValue(0);
  const scaleAnimation = useSharedValue(1);
  const opacityAnimation = useSharedValue(0.7);

  // References for accessibility focus
  const instructionRef = useRef<Text>(null);
  const circleRef = useRef<View>(null);

  const themeColors = useMemo(() => colorSystem.themes[theme], [theme]);
  const circleSize = useMemo(() =>
    getCircleSize(accessibilityMode, anxietyAdaptationsEnabled),
    [accessibilityMode, anxietyAdaptationsEnabled]
  );

  // Enhanced breathing cycle with therapeutic guidance
  const breathingCycle = useMemo(() => ({
    inhale: THERAPEUTIC_TIMING.BREATH_DURATION * THERAPEUTIC_TIMING.INHALE_RATIO,
    hold: THERAPEUTIC_TIMING.BREATH_DURATION * THERAPEUTIC_TIMING.HOLD_RATIO,
    exhale: THERAPEUTIC_TIMING.BREATH_DURATION * THERAPEUTIC_TIMING.EXHALE_RATIO,
  }), []);

  // Therapeutic completion callback
  const handleComplete = useCallback(async () => {
    setIsActive(false);
    setSessionState('completed');

    // Therapeutic feedback for completion
    await provideTharapeuticFeedback('celebrating');
    await announceForTherapy(
      'Wonderful! You\'ve completed your breathing exercise. Take a moment to notice how you feel.',
      'polite'
    );

    onComplete();
  }, [onComplete, provideTharapeuticFeedback, announceForTherapy]);

  // Breathing phase management with accessibility announcements
  const updateBreathingPhase = useCallback(async (elapsedSeconds: number) => {
    const cycleTime = elapsedSeconds % (THERAPEUTIC_TIMING.BREATH_DURATION / 1000);
    const inhaleTime = breathingCycle.inhale / 1000;
    const holdTime = breathingCycle.hold / 1000;

    let newPhase: 'inhale' | 'hold' | 'exhale';
    let duration: number;

    if (cycleTime < inhaleTime) {
      newPhase = 'inhale';
      duration = inhaleTime;
    } else if (cycleTime < inhaleTime + holdTime) {
      newPhase = 'hold';
      duration = holdTime;
    } else {
      newPhase = 'exhale';
      duration = breathingCycle.exhale / 1000;
    }

    if (newPhase !== currentPhase) {
      setCurrentPhase(newPhase);

      // Provide therapeutic breathing guidance
      if (isScreenReaderEnabled) {
        await announceBreathingGuidance(newPhase, duration);
      }

      // Provide haptic guidance
      await provideBreathingHaptics(newPhase);
    }
  }, [currentPhase, breathingCycle, isScreenReaderEnabled, announceBreathingGuidance, provideBreathingHaptics]);

  // Main breathing animation with therapeutic pacing
  useEffect(() => {
    if (!isActive) return;

    setSessionState('active');
    progress.value = 0;

    // Announce start for screen readers
    if (isScreenReaderEnabled) {
      announceForTherapy(
        'Starting your breathing exercise. Find a comfortable position and follow the gentle rhythm. Remember, this is your time for self-care.',
        'polite'
      );
    }

    // Master progress animation
    progress.value = withTiming(
      1,
      {
        duration: THERAPEUTIC_TIMING.TOTAL_DURATION,
        easing: Easing.linear,
      },
      (finished) => {
        if (finished) {
          runOnJS(handleComplete)();
        }
      }
    );

    // Therapeutic breathing animation - calmer for anxiety
    const breathingScale = anxietyAdaptationsEnabled ? 1.2 : 1.3;
    scaleAnimation.value = withRepeat(
      withSequence(
        withTiming(breathingScale, {
          duration: breathingCycle.inhale,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94), // Calmer easing
        }),
        withTiming(breathingScale, {
          duration: breathingCycle.hold,
          easing: Easing.linear,
        }),
        withTiming(1.0, {
          duration: breathingCycle.exhale,
          easing: Easing.bezier(0.55, 0.06, 0.68, 0.19), // Gentle exhale
        })
      ),
      Math.floor(THERAPEUTIC_TIMING.TOTAL_DURATION / THERAPEUTIC_TIMING.BREATH_DURATION),
      false
    );

    // Synchronized opacity animation
    opacityAnimation.value = withRepeat(
      withSequence(
        withTiming(1.0, { duration: breathingCycle.inhale }),
        withTiming(1.0, { duration: breathingCycle.hold }),
        withTiming(0.7, { duration: breathingCycle.exhale })
      ),
      Math.floor(THERAPEUTIC_TIMING.TOTAL_DURATION / THERAPEUTIC_TIMING.BREATH_DURATION),
      false
    );

    // Therapeutic guidance timer
    const guidanceTimer = setInterval(() => {
      const elapsed = progress.value * THERAPEUTIC_TIMING.TOTAL_DURATION;
      const remaining = Math.max(0, Math.ceil((THERAPEUTIC_TIMING.TOTAL_DURATION - elapsed) / 1000));

      if (remaining <= 0) {
        clearInterval(guidanceTimer);
        return;
      }

      setTimeRemaining(remaining);
      updateBreathingPhase((THERAPEUTIC_TIMING.TOTAL_DURATION - elapsed) / 1000);
    }, 1000);

    // Cleanup
    return () => {
      clearInterval(guidanceTimer);
      cancelAnimation(progress);
      cancelAnimation(scaleAnimation);
      cancelAnimation(opacityAnimation);
    };
  }, [isActive, anxietyAdaptationsEnabled, isScreenReaderEnabled, breathingCycle, handleComplete, updateBreathingPhase, announceForTherapy]);

  // Animated circle styles with therapeutic colors
  const animatedCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnimation.value }],
    opacity: opacityAnimation.value,
  }), []);

  // Therapeutic time formatting
  const formattedTime = useMemo(() => {
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [timeRemaining]);

  // Therapeutic instruction text
  const getInstructionText = () => {
    const baseInstructions = {
      inhale: 'Breathe In Gently',
      hold: 'Hold Softly',
      exhale: 'Breathe Out Slowly',
    };

    if (depressionSupportMode) {
      return {
        inhale: 'Breathe In Self-Compassion',
        hold: 'Hold This Moment',
        exhale: 'Release What No Longer Serves',
      }[currentPhase];
    }

    if (anxietyAdaptationsEnabled) {
      return {
        inhale: 'Breathe In Calm',
        hold: 'Stay Present',
        exhale: 'Release Tension',
      }[currentPhase];
    }

    return baseInstructions[currentPhase];
  };

  // Crisis exit handler
  const handleCrisisExit = useCallback(async () => {
    await activateEmergencyCrisisAccess('breathing_exercise_exit');
    setIsActive(false);
    onComplete();
  }, [activateEmergencyCrisisAccess, onComplete]);

  // Start handler with therapeutic announcement
  const handleStart = useCallback(async () => {
    setIsActive(true);
    setTimeRemaining(THERAPEUTIC_TIMING.TOTAL_DURATION / 1000);

    if (isScreenReaderEnabled) {
      await provideTharapeuticFeedback('guiding');
    }
  }, [isScreenReaderEnabled, provideTharapeuticFeedback]);

  // Skip handler with therapeutic support
  const handleSkip = useCallback(async () => {
    if (depressionSupportMode) {
      await announceForTherapy(
        'That\'s perfectly okay. Taking any step toward self-care is meaningful. You can try again anytime.',
        'polite'
      );
    }

    setIsActive(false);
    setSessionState('completed');
    onComplete();
  }, [depressionSupportMode, announceForTherapy, onComplete]);

  // Ready screen with therapeutic messaging
  if (sessionState === 'ready') {
    return (
      <View style={styles.container}>
        <Text
          style={[
            styles.title,
            anxietyAdaptationsEnabled && styles.anxietyTitle,
            depressionSupportMode && styles.depressionTitle
          ]}
          accessible={true}
          accessibilityRole="header"
          accessibilityLevel={1}
        >
          {depressionSupportMode
            ? 'A Moment of Self-Care'
            : anxietyAdaptationsEnabled
              ? 'Gentle Breathing Space'
              : '3-Minute Breathing Exercise'
          }
        </Text>

        <Text
          style={[
            styles.subtitle,
            anxietyAdaptationsEnabled && styles.anxietySubtitle
          ]}
          accessible={true}
          accessibilityHint="Instructions for breathing exercise"
        >
          {anxietyAdaptationsEnabled
            ? 'Find a comfortable position. This is your safe space to breathe and be present.'
            : 'Find a comfortable position and follow the breathing circle at your own pace.'
          }
        </Text>

        <View
          style={[styles.circleContainer, { width: circleSize, height: circleSize }]}
          accessible={true}
          accessibilityLabel="Breathing circle - visual guide for breathing rhythm"
        >
          <View style={[
            styles.staticCircle,
            {
              backgroundColor: themeColors.primary,
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2
            }
          ]} />
        </View>

        <Text
          style={styles.duration}
          accessible={true}
          accessibilityLabel="Exercise duration: 3 minutes"
        >
          Duration: 3 minutes
        </Text>

        <View style={styles.buttonContainer}>
          <Button
            theme={theme}
            onPress={handleStart}
            accessibilityLabel="Start breathing exercise"
            accessibilityHint="Begin 3-minute guided breathing session"
            style={[
              anxietyAdaptationsEnabled && styles.anxietyButton,
              { minHeight: anxietyAdaptationsEnabled ? 56 : 48 }
            ]}
          >
            {depressionSupportMode ? 'Begin Self-Care' : 'Start Breathing Exercise'}
          </Button>

          {crisisExitEnabled && crisisEmergencyMode && (
            <Button
              variant="outline"
              onPress={handleCrisisExit}
              accessibilityLabel="Exit to crisis support"
              accessibilityHint="Get immediate crisis support instead"
              style={[styles.crisisExitButton, { marginTop: spacing.md }]}
            >
              I Need Crisis Support
            </Button>
          )}
        </View>
      </View>
    );
  }

  // Completion screen with therapeutic celebration
  if (sessionState === 'completed') {
    return (
      <View style={styles.container}>
        <Text
          style={[
            styles.title,
            { color: themeColors.success }
          ]}
          accessible={true}
          accessibilityRole="header"
          accessibilityLevel={1}
          accessibilityLiveRegion="polite"
        >
          {depressionSupportMode
            ? 'You Did Something Beautiful'
            : 'Wonderful Progress!'}
        </Text>

        <Text
          style={styles.subtitle}
          accessible={true}
        >
          {depressionSupportMode
            ? 'You took time for yourself today. That\'s a meaningful act of self-compassion and care.'
            : anxietyAdaptationsEnabled
              ? 'You\'ve created a moment of calm in your day. Notice how your body feels now.'
              : 'You\'ve completed your 3-minute breathing exercise. Take a moment to notice how you feel.'
          }
        </Text>

        <View
          style={[styles.circleContainer, { width: circleSize, height: circleSize }]}
          accessible={true}
          accessibilityLabel="Breathing exercise completed successfully"
        >
          <View style={[
            styles.staticCircle,
            {
              backgroundColor: themeColors.success,
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2
            }
          ]} />
        </View>

        <Button
          theme={theme}
          variant="success"
          onPress={onComplete}
          accessibilityLabel="Continue to next step"
          accessibilityHint="Proceed with your therapeutic journey"
          style={[
            anxietyAdaptationsEnabled && styles.anxietyButton,
            { minHeight: anxietyAdaptationsEnabled ? 56 : 48 }
          ]}
        >
          Continue
        </Button>
      </View>
    );
  }

  // Active breathing screen with full accessibility
  return (
    <View style={styles.container}>
      <Text
        style={styles.stepIndicator}
        accessible={true}
        accessibilityLabel={`Progress: ${Math.floor((1 - timeRemaining / 180) * 100)} percent complete`}
        accessibilityLiveRegion="polite"
      >
        {formattedTime} remaining
      </Text>

      <View
        ref={circleRef}
        style={[styles.circleContainer, { width: circleSize, height: circleSize }]}
        accessible={true}
        accessibilityLabel={`Breathing circle ${currentPhase} phase`}
        accessibilityHint="Visual breathing guide - follow the circle's rhythm"
        accessibilityLiveRegion="polite"
      >
        <Animated.View
          style={[
            styles.breathingCircle,
            animatedCircleStyle,
            {
              backgroundColor: crisisEmergencyMode
                ? colorSystem.status.warning
                : themeColors.primary,
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
            }
          ]}
        >
          <Text
            ref={instructionRef}
            style={[
              styles.instruction,
              anxietyAdaptationsEnabled && styles.anxietyInstruction,
              depressionSupportMode && styles.depressionInstruction
            ]}
            accessible={true}
            accessibilityLabel={`Current breathing instruction: ${getInstructionText()}`}
            accessibilityLiveRegion="assertive"
            allowFontScaling={true}
            maxFontSizeMultiplier={2.0}
          >
            {getInstructionText()}
          </Text>
        </Animated.View>
      </View>

      <Text
        style={[
          styles.timer,
          anxietyAdaptationsEnabled && styles.anxietyTimer
        ]}
        accessible={true}
        accessibilityLabel={`Time remaining: ${formattedTime}`}
        accessibilityLiveRegion="polite"
        allowFontScaling={true}
        maxFontSizeMultiplier={1.5}
      >
        {formattedTime}
      </Text>

      {cognitiveSupport && (
        <Text
          style={[
            styles.guidance,
            anxietyAdaptationsEnabled && styles.anxietyGuidance
          ]}
          accessible={true}
          accessibilityHint="Helpful guidance for breathing exercise"
          allowFontScaling={true}
          maxFontSizeMultiplier={1.3}
        >
          {anxietyAdaptationsEnabled
            ? 'Breathe at your own pace. You\'re safe here.'
            : 'Follow the circle as it expands and contracts. You\'re doing great.'}
        </Text>
      )}

      <View style={styles.buttonContainer}>
        <Button
          variant="outline"
          onPress={handleSkip}
          accessibilityLabel="Skip breathing exercise"
          accessibilityHint="End exercise early if needed"
          style={[
            { minHeight: anxietyAdaptationsEnabled ? 56 : 48 },
            anxietyAdaptationsEnabled && styles.anxietyButton
          ]}
        >
          {depressionSupportMode ? 'That\'s Enough for Now' : 'Skip'}
        </Button>

        {crisisExitEnabled && crisisEmergencyMode && (
          <Button
            variant="emergency"
            onPress={handleCrisisExit}
            accessibilityLabel="Emergency crisis support"
            accessibilityHint="Get immediate crisis help - interrupts exercise"
            style={[styles.crisisExitButton, { marginLeft: spacing.md }]}
          >
            Crisis Support
          </Button>
        )}
      </View>
    </View>
  );
});

AccessibleBreathingCircle.displayName = 'AccessibleBreathingCircle';

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
    lineHeight: 32,
  },
  anxietyTitle: {
    fontSize: 26,
    color: colorSystem.status.success,
    fontWeight: '500', // Softer weight for anxiety
  },
  depressionTitle: {
    fontSize: 28,
    color: colorSystem.status.success,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    color: colorSystem.gray[600],
    marginBottom: spacing.xl,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
  anxietySubtitle: {
    fontSize: 18,
    lineHeight: 26,
    color: colorSystem.gray[700],
  },
  stepIndicator: {
    fontSize: 16,
    color: colorSystem.gray[600],
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  circleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xl,
  },
  breathingCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  staticCircle: {
    opacity: 0.8,
  },
  instruction: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.base.white,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  anxietyInstruction: {
    fontSize: 20,
    fontWeight: '500',
  },
  depressionInstruction: {
    fontSize: 19,
    fontWeight: '600',
  },
  timer: {
    fontSize: 32,
    fontWeight: '300',
    color: colorSystem.base.black,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  anxietyTimer: {
    fontSize: 36,
    fontWeight: '400',
    color: colorSystem.status.success,
  },
  guidance: {
    fontSize: 14,
    color: colorSystem.gray[600],
    marginBottom: spacing.xl,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },
  anxietyGuidance: {
    fontSize: 16,
    color: colorSystem.status.success,
    fontWeight: '500',
  },
  duration: {
    fontSize: 16,
    color: colorSystem.gray[600],
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
    width: '100%',
  },
  anxietyButton: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
  },
  crisisExitButton: {
    backgroundColor: colorSystem.status.critical,
    borderColor: colorSystem.status.critical,
  },
});

export default AccessibleBreathingCircle;