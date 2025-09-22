/**
 * Breathing Practice Introduction Component
 *
 * CLINICAL PURPOSE:
 * - Introduces users to core MBCT 3-minute breathing space
 * - Provides gentle, trauma-informed first mindfulness experience
 * - Establishes body-first approach fundamental to MBCT
 * - Models non-judgmental awareness and self-compassion
 *
 * THERAPEUTIC APPROACH:
 * - Present-moment awareness cultivation
 * - Body sensations as anchor for attention
 * - Gentle return to breath when mind wanders
 * - Self-compassion for all experiences during practice
 *
 * SAFETY CONSIDERATIONS:
 * - Crisis button always accessible
 * - Option to pause or stop at any time
 * - Gentle language to prevent performance anxiety
 * - Clear instructions to avoid overwhelm
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Easing
} from 'react-native-reanimated';

import { Button } from '../core/Button';
import { Card } from '../core/Card';
import { CrisisButton } from '../core/CrisisButton';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { colorSystem, spacing, borderRadius } from '../../constants/colors';

interface BreathingPracticeIntroProps {
  onComplete: () => void;
  onSkip?: () => void;
}

interface PracticePhase {
  name: string;
  duration: number; // in seconds
  instruction: string;
  description: string;
  breathingPattern?: {
    inhale: number;
    hold?: number;
    exhale: number;
    pause?: number;
  };
}

const PRACTICE_PHASES: PracticePhase[] = [
  {
    name: 'Awareness',
    duration: 60,
    instruction: 'Notice what\'s here right now',
    description: 'Gently bringing awareness to your current experience - thoughts, feelings, and body sensations',
    breathingPattern: {
      inhale: 4,
      exhale: 6
    }
  },
  {
    name: 'Gathering',
    duration: 60,
    instruction: 'Focus on your breathing',
    description: 'Gathering attention on the sensations of breathing - the natural rhythm of your body',
    breathingPattern: {
      inhale: 4,
      exhale: 6
    }
  },
  {
    name: 'Expanding',
    duration: 60,
    instruction: 'Expand awareness around your whole body',
    description: 'Widening attention to include your whole body and the space around you',
    breathingPattern: {
      inhale: 4,
      exhale: 6
    }
  }
];

export const BreathingPracticeIntro: React.FC<BreathingPracticeIntroProps> = ({
  onComplete,
  onSkip
}) => {
  const { colorSystem } = useTheme();
  const { triggerHaptic } = useHaptics();

  const [practiceState, setPracticeState] = useState<'intro' | 'practicing' | 'complete'>('intro');
  const [currentPhase, setCurrentPhase] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isInhaling, setIsInhaling] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const breathingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Animation values
  const circleScale = useSharedValue(1);
  const circleOpacity = useSharedValue(0.8);
  const breathingProgress = useSharedValue(0);

  // Start the breathing practice
  const startPractice = useCallback(() => {
    setPracticeState('practicing');
    setCurrentPhase(0);
    setTimeRemaining(PRACTICE_PHASES[0].duration);
    triggerHaptic('light');

    // Start breathing animation
    circleOpacity.value = withTiming(1, { duration: 500 });
    startBreathingAnimation();
    startPhaseTimer();
  }, [triggerHaptic]);

  // Breathing circle animation
  const startBreathingAnimation = useCallback(() => {
    const phase = PRACTICE_PHASES[currentPhase];
    if (!phase?.breathingPattern) return;

    const { inhale, exhale } = phase.breathingPattern;
    const cycleDuration = (inhale + exhale) * 1000;

    const animateBreathing = () => {
      // Inhale (expand)
      circleScale.value = withTiming(1.4, {
        duration: inhale * 1000,
        easing: Easing.inOut(Easing.ease)
      });

      setIsInhaling(true);

      // Exhale (contract) after inhale completes
      setTimeout(() => {
        circleScale.value = withTiming(1, {
          duration: exhale * 1000,
          easing: Easing.inOut(Easing.ease)
        });
        setIsInhaling(false);
      }, inhale * 1000);
    };

    // Start first cycle immediately
    animateBreathing();

    // Continue cycles while practice is active
    breathingTimerRef.current = setInterval(() => {
      if (!isPaused && practiceState === 'practicing') {
        animateBreathing();
      }
    }, cycleDuration);
  }, [currentPhase, isPaused, practiceState]);

  // Phase timer management
  const startPhaseTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Move to next phase or complete
          const nextPhase = currentPhase + 1;
          if (nextPhase < PRACTICE_PHASES.length) {
            setCurrentPhase(nextPhase);
            return PRACTICE_PHASES[nextPhase].duration;
          } else {
            // Practice complete
            completePractice();
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);
  }, [currentPhase]);

  // Complete the practice
  const completePractice = useCallback(() => {
    setPracticeState('complete');

    // Clear timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (breathingTimerRef.current) {
      clearInterval(breathingTimerRef.current);
    }

    // Fade out breathing circle
    circleOpacity.value = withTiming(0.3, { duration: 1000 });
    circleScale.value = withTiming(1, { duration: 1000 });

    triggerHaptic('success');
  }, [triggerHaptic]);

  // Pause/resume practice
  const togglePause = useCallback(() => {
    setIsPaused(!isPaused);
    triggerHaptic('light');
  }, [isPaused, triggerHaptic]);

  // Stop practice early
  const stopPractice = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (breathingTimerRef.current) {
      clearInterval(breathingTimerRef.current);
    }

    setPracticeState('intro');
    setCurrentPhase(0);
    setTimeRemaining(0);
    setIsPaused(false);

    circleOpacity.value = withTiming(0.8, { duration: 500 });
    circleScale.value = withTiming(1, { duration: 500 });
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (breathingTimerRef.current) {
        clearInterval(breathingTimerRef.current);
      }
    };
  }, []);

  // Update breathing animation when phase changes
  useEffect(() => {
    if (practiceState === 'practicing') {
      if (breathingTimerRef.current) {
        clearInterval(breathingTimerRef.current);
      }
      startBreathingAnimation();
    }
  }, [currentPhase, startBreathingAnimation, practiceState]);

  // Animated styles
  const breathingCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
    opacity: circleOpacity.value,
  }));

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (practiceState === 'intro') {
    return (
      <View style={styles.container}>
        <View style={styles.crisisContainer}>
          <CrisisButton variant="compact" />
        </View>

        <Card style={styles.introCard}>
          <Text style={[styles.title, { color: colorSystem.base.midnightBlue }]}>
            3-Minute Breathing Space
          </Text>

          <Text style={[styles.description, { color: colorSystem.gray[800] }]}>
            This gentle practice is the foundation of MBCT. It helps you:
            {'\n\n'}• Connect with the present moment
            {'\n'}• Notice your current experience without judgment
            {'\n'}• Find stability in your breath and body
            {'\n'}• Create space around difficult feelings
          </Text>

          <View style={styles.instructionCard}>
            <Text style={[styles.instructionTitle, { color: colorSystem.base.midnightBlue }]}>
              How It Works
            </Text>
            <Text style={[styles.instructionText, { color: colorSystem.gray[800] }]}>
              The practice has three gentle phases:
              {'\n\n'}1. <Text style={styles.phaseTitle}>Awareness</Text> - Notice what's here
              {'\n'}2. <Text style={styles.phaseTitle}>Gathering</Text> - Focus on breathing
              {'\n'}3. <Text style={styles.phaseTitle}>Expanding</Text> - Widen your awareness
              {'\n\n'}Simply follow the breathing circle and gentle voice guidance.
              There's no perfect way to do this - whatever you experience is okay.
            </Text>
          </View>

          <View style={styles.safetyNote}>
            <Text style={[styles.safetyText, { color: colorSystem.gray[700] }]}>
              💡 You can pause or stop anytime. This practice is about gentle awareness, not performance.
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <Button
              onPress={startPractice}
              style={styles.startButton}
              accessibilityLabel="Start 3-minute breathing practice"
            >
              Begin Practice
            </Button>

            {onSkip && (
              <Button
                variant="outline"
                onPress={onSkip}
                style={styles.skipButton}
                accessibilityLabel="Skip practice for now"
              >
                Skip for Now
              </Button>
            )}
          </View>
        </Card>
      </View>
    );
  }

  if (practiceState === 'practicing') {
    const phase = PRACTICE_PHASES[currentPhase];
    const totalTime = PRACTICE_PHASES.reduce((sum, p) => sum + p.duration, 0);
    const elapsedTime = PRACTICE_PHASES.slice(0, currentPhase).reduce((sum, p) => sum + p.duration, 0) +
                      (phase.duration - timeRemaining);
    const progress = (elapsedTime / totalTime) * 100;

    return (
      <View style={styles.container}>
        <View style={styles.crisisContainer}>
          <CrisisButton variant="compact" />
        </View>

        <View style={styles.practiceContainer}>
          {/* Progress indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress}%`,
                    backgroundColor: colorSystem.primary.morning
                  }
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colorSystem.gray[600] }]}>
              {formatTime(elapsedTime)} / {formatTime(totalTime)}
            </Text>
          </View>

          {/* Phase indicator */}
          <Text style={[styles.phaseIndicator, { color: colorSystem.base.midnightBlue }]}>
            Phase {currentPhase + 1}: {phase.name}
          </Text>

          {/* Breathing circle */}
          <View style={styles.breathingContainer}>
            <Animated.View
              style={[
                styles.breathingCircle,
                {
                  backgroundColor: colorSystem.primary.morning,
                },
                breathingCircleStyle
              ]}
            />

            <Text style={[styles.breathingInstruction, { color: colorSystem.gray[800] }]}>
              {isInhaling ? 'Breathe In' : 'Breathe Out'}
            </Text>
          </View>

          {/* Current instruction */}
          <Card style={styles.instructionContainer}>
            <Text style={[styles.currentInstruction, { color: colorSystem.base.midnightBlue }]}>
              {phase.instruction}
            </Text>
            <Text style={[styles.phaseDescription, { color: colorSystem.gray[700] }]}>
              {phase.description}
            </Text>
          </Card>

          {/* Control buttons */}
          <View style={styles.controlContainer}>
            <Button
              variant="outline"
              onPress={togglePause}
              style={styles.controlButton}
              accessibilityLabel={isPaused ? "Resume practice" : "Pause practice"}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </Button>

            <Button
              variant="outline"
              onPress={stopPractice}
              style={styles.controlButton}
              accessibilityLabel="Stop practice early"
            >
              Stop
            </Button>
          </View>
        </View>
      </View>
    );
  }

  // Practice complete
  return (
    <View style={styles.container}>
      <View style={styles.crisisContainer}>
        <CrisisButton variant="compact" />
      </View>

      <Card style={styles.completionCard}>
        <Text style={[styles.completionTitle, { color: colorSystem.base.midnightBlue }]}>
          Practice Complete 🌱
        </Text>

        <Text style={[styles.completionMessage, { color: colorSystem.gray[800] }]}>
          Well done! You've just experienced the foundation of MBCT practice.
          {'\n\n'}Take a moment to notice:
          {'\n\n'}• How does your body feel right now?
          {'\n'}• What did you observe about your thoughts?
          {'\n'}• Can you appreciate taking this time for yourself?
          {'\n\n'}This gentle awareness is at the heart of your Being. journey.
        </Text>

        <View style={styles.reflectionCard}>
          <Text style={[styles.reflectionTitle, { color: colorSystem.base.midnightBlue }]}>
            Remember
          </Text>
          <Text style={[styles.reflectionText, { color: colorSystem.gray[800] }]}>
            Every moment of awareness is valuable, regardless of how the mind wandered
            or what you experienced. This practice grows stronger with gentle, consistent attention.
          </Text>
        </View>

        <Button
          onPress={onComplete}
          style={styles.completeButton}
          accessibilityLabel="Complete breathing practice introduction"
        >
          Continue Journey
        </Button>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  crisisContainer: {
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  introCard: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  instructionCard: {
    backgroundColor: colorSystem.therapeutic.practice,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  instructionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  phaseTitle: {
    fontWeight: '600',
  },
  safetyNote: {
    backgroundColor: colorSystem.therapeutic.safety,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  safetyText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  buttonContainer: {
    gap: spacing.md,
  },
  startButton: {
    backgroundColor: colorSystem.primary.morning,
  },
  skipButton: {},
  practiceContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  progressContainer: {
    marginBottom: spacing.xl,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colorSystem.gray[200],
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  progressText: {
    fontSize: 14,
    textAlign: 'center',
  },
  phaseIndicator: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  breathingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginVertical: spacing.xl,
  },
  breathingCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: spacing.lg,
  },
  breathingInstruction: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  instructionContainer: {
    marginBottom: spacing.lg,
  },
  currentInstruction: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  phaseDescription: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  controlContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  controlButton: {
    flex: 1,
  },
  completionCard: {
    flex: 1,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  completionMessage: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  reflectionCard: {
    backgroundColor: colorSystem.therapeutic.success,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xl,
  },
  reflectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  reflectionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  completeButton: {
    backgroundColor: colorSystem.primary.morning,
  },
});

export default BreathingPracticeIntro;