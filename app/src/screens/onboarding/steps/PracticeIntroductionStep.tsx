/**
 * PracticeIntroductionStep - Step 6: First MBCT Practice Experience
 *
 * CLINICAL FOCUS: Experiential introduction to 3-minute breathing space
 * DURATION: ~6 minutes with guided practice
 * THERAPEUTIC: Complete MBCT experience and onboarding celebration
 */

import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from '../../../utils/ReanimatedMock';

import {
  Screen,
  Typography,
  TherapeuticHeading,
  Button,
  Card,
  CrisisButton,
  BreathingCircle,
} from '../../../components/core';

import { OnboardingStepProps } from '../TherapeuticOnboardingFlow';
import { useBreathingSessionStore } from '../../../store';
import { colorSystem, spacing } from '../../../constants/colors';
import { useHaptics } from '../../../hooks/useHaptics';

type PracticePhase = 'intro' | 'breathing-practice' | 'reflection' | 'completion';

export const PracticeIntroductionStep: React.FC<OnboardingStepProps> = ({
  theme,
  onNext,
  onBack,
  onComplete,
  progress,
}) => {
  const [currentPhase, setCurrentPhase] = useState<PracticePhase>('intro');
  const [practiceCompleted, setPracticeCompleted] = useState(false);
  const [reflectionNotes, setReflectionNotes] = useState('');

  const { triggerHaptic } = useHaptics();
  const { startSession, endSession, currentSession } = useBreathingSessionStore();

  // Animation values
  const fadeInValue = useSharedValue(0);
  const slideUpValue = useSharedValue(30);
  const celebrationScale = useSharedValue(1);

  const themeColors = colorSystem.themes[theme];

  React.useEffect(() => {
    // Entrance animation
    fadeInValue.value = withTiming(1, { duration: 600 });
    slideUpValue.value = withSpring(0, {
      damping: 12,
      stiffness: 100,
    });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeInValue.value,
    transform: [{ translateY: slideUpValue.value }],
  }));

  const celebrationAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrationScale.value }],
  }));

  const handleStartPractice = useCallback(() => {
    triggerHaptic('light');
    startSession({
      type: 'breathing',
      duration: 180, // 3 minutes
      context: 'onboarding',
      guided: true,
    });
    setCurrentPhase('breathing-practice');
  }, [triggerHaptic, startSession]);

  const handlePracticeComplete = useCallback(() => {
    setPracticeCompleted(true);
    triggerHaptic('success');
    endSession();

    // Celebration animation
    celebrationScale.value = withSequence(
      withTiming(1.2, { duration: 300 }),
      withSpring(1, { damping: 8, stiffness: 200 })
    );

    setTimeout(() => {
      setCurrentPhase('reflection');
    }, 1000);
  }, [triggerHaptic, endSession, celebrationScale]);

  const handleContinueToReflection = useCallback(() => {
    triggerHaptic('light');
    setCurrentPhase('reflection');
  }, [triggerHaptic]);

  const handleCompleteOnboarding = useCallback(() => {
    if (!practiceCompleted) {
      Alert.alert(
        'Complete Your First Practice',
        'The 3-minute breathing space is an essential foundation of your MBCT journey. Would you like to complete it now?',
        [
          { text: 'Complete Practice', style: 'default' },
          {
            text: 'Skip for Now',
            style: 'cancel',
            onPress: () => {
              triggerHaptic('light');
              onComplete?.();
            }
          }
        ]
      );
      return;
    }

    triggerHaptic('success');
    setCurrentPhase('completion');

    // Final celebration
    celebrationScale.value = withSequence(
      withTiming(1.3, { duration: 400 }),
      withSpring(1, { damping: 6, stiffness: 150 })
    );

    setTimeout(() => {
      onComplete?.();
    }, 2000);
  }, [practiceCompleted, triggerHaptic, onComplete, celebrationScale]);

  const handleBack = useCallback(() => {
    if (currentPhase === 'breathing-practice') {
      Alert.alert(
        'Exit Practice?',
        'Are you sure you want to exit your breathing practice?',
        [
          { text: 'Continue Practice', style: 'cancel' },
          {
            text: 'Exit',
            style: 'default',
            onPress: () => {
              endSession();
              setCurrentPhase('intro');
              triggerHaptic('light');
            }
          }
        ]
      );
    } else if (currentPhase === 'intro') {
      triggerHaptic('light');
      onBack?.();
    } else {
      triggerHaptic('light');
      setCurrentPhase('intro');
    }
  }, [currentPhase, endSession, triggerHaptic, onBack]);

  // Introduction Phase
  if (currentPhase === 'intro') {
    return (
      <Screen safeAreaEdges={[]} style={{ backgroundColor: themeColors.background }}>
        <View style={styles.crisisButtonContainer}>
          <CrisisButton />
        </View>

        <Animated.View style={[styles.container, animatedStyle]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.headerSection}>
              <TherapeuticHeading
                variant="h1"
                style={[styles.title, { color: themeColors.primary }]}
              >
                Your First Practice
              </TherapeuticHeading>

              <Typography
                variant="subtitle"
                style={[styles.subtitle, { color: themeColors.text.secondary }]}
              >
                Experience the foundation of MBCT with a gentle introduction
              </Typography>
            </View>

            <Card style={[styles.practiceCard, { backgroundColor: themeColors.surface }]}>
              <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.primary }]}>
                3-Minute Breathing Space
              </Typography>
              <Typography variant="body" style={styles.cardText}>
                This core MBCT practice helps you:
                {'\n\n'}• Ground yourself in the present moment
                {'\n'}• Notice what's happening without judgment
                {'\n'}• Connect with your body and breath
                {'\n'}• Create space around difficult experiences
                {'\n\n'}There's no right or wrong way to practice - this is about gentle awareness
                and self-compassion.
              </Typography>
            </Card>

            <Card style={[styles.instructionCard, { backgroundColor: themeColors.surface }]}>
              <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.primary }]}>
                How It Works
              </Typography>
              <Typography variant="body" style={styles.cardText}>
                <Typography variant="bodyBold">Step 1: Awareness</Typography> (1 minute)
                {'\n'}Notice what's here right now - thoughts, feelings, body sensations
                {'\n\n'}<Typography variant="bodyBold">Step 2: Gathering</Typography> (1 minute)
                {'\n'}Focus attention on the breath, using it as an anchor
                {'\n\n'}<Typography variant="bodyBold">Step 3: Expanding</Typography> (1 minute)
                {'\n'}Widen awareness to include the whole body and surroundings
                {'\n\n'}The breathing circle will guide your timing with gentle visual cues.
              </Typography>
            </Card>

            <Card style={[styles.preparationCard, { backgroundColor: themeColors.surface }]}>
              <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.primary }]}>
                Getting Ready
              </Typography>
              <Typography variant="body" style={styles.cardText}>
                • Find a comfortable position - sitting or standing
                {'\n'}• You can keep your eyes open or gently close them
                {'\n'}• There's no need to change your breathing
                {'\n'}• If your mind wanders, that's completely normal
                {'\n'}• Simply notice and gently return attention to the practice
                {'\n\n'}Remember: this is about being kind to yourself, not perfect performance.
              </Typography>
            </Card>

            <View style={styles.progressSection}>
              <Typography variant="caption" style={styles.progressText}>
                Step {progress.current} of {progress.total} • Final step - experiencing MBCT
              </Typography>
            </View>
          </ScrollView>

          <View style={styles.buttonContainer}>
            <Button
              variant="outline"
              onPress={handleBack}
              style={styles.backButton}
              accessibilityLabel="Go back to personalization"
              haptic={true}
            >
              Back
            </Button>

            <Button
              onPress={handleStartPractice}
              style={styles.continueButton}
              accessibilityLabel="Begin 3-minute breathing practice"
              haptic={true}
            >
              Begin Practice
            </Button>
          </View>
        </Animated.View>
      </Screen>
    );
  }

  // Breathing Practice Phase
  if (currentPhase === 'breathing-practice') {
    return (
      <Screen safeAreaEdges={[]} style={{ backgroundColor: themeColors.background }}>
        <View style={styles.crisisButtonContainer}>
          <CrisisButton />
        </View>

        <View style={styles.practiceContainer}>
          <BreathingCircle
            onComplete={handlePracticeComplete}
            theme={theme}
            autoStart={true}
          />
        </View>
      </Screen>
    );
  }

  // Reflection Phase
  if (currentPhase === 'reflection') {
    return (
      <Screen safeAreaEdges={[]} style={{ backgroundColor: themeColors.background }}>
        <View style={styles.crisisButtonContainer}>
          <CrisisButton />
        </View>

        <Animated.View style={[styles.container, celebrationAnimatedStyle]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.headerSection}>
              <TherapeuticHeading
                variant="h1"
                style={[styles.title, { color: themeColors.accent }]}
              >
                Beautiful Practice
              </TherapeuticHeading>

              <Typography
                variant="subtitle"
                style={[styles.subtitle, { color: themeColors.text.secondary }]}
              >
                You've just experienced the heart of MBCT
              </Typography>
            </View>

            <Card style={[styles.celebrationCard, {
              backgroundColor: themeColors.surface,
              borderColor: themeColors.accent,
              borderWidth: 2
            }]}>
              <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.accent }]}>
                ✨ Congratulations!
              </Typography>
              <Typography variant="body" style={styles.cardText}>
                You've just completed your first MBCT practice. This is a significant step
                in your journey toward greater mindfulness and emotional well-being.
                {'\n\n'}Take a moment to notice:
                {'\n\n'}• How does your body feel right now?
                {'\n'}• What did you observe about your thoughts during the practice?
                {'\n'}• Can you appreciate that you took this time for yourself?
              </Typography>
            </Card>

            <Card style={[styles.reflectionCard, { backgroundColor: themeColors.surface }]}>
              <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.primary }]}>
                Your MBCT Foundation
              </Typography>
              <Typography variant="body" style={styles.cardText}>
                What you just experienced is the foundation of all MBCT practices:
                {'\n\n'}• <Typography variant="bodyBold">Present-moment awareness</Typography> - being here now
                {'\n'}• <Typography variant="bodyBold">Non-judgmental observation</Typography> - noticing without evaluating
                {'\n'}• <Typography variant="bodyBold">Body-first grounding</Typography> - starting with felt experience
                {'\n'}• <Typography variant="bodyBold">Self-compassion</Typography> - being kind to yourself
                {'\n\n'}These principles will guide every interaction you have with Being.
              </Typography>
            </Card>

            <Card style={[styles.journeyCard, { backgroundColor: themeColors.surface }]}>
              <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.primary }]}>
                Your Journey Continues
              </Typography>
              <Typography variant="body" style={styles.cardText}>
                You're now ready to explore Being. and deepen your MBCT practice:
                {'\n\n'}• Daily check-ins that build on what you just experienced
                {'\n'}• Personalized practices adapted to your needs and preferences
                {'\n'}• Progress tracking that honors your unique journey
                {'\n'}• Crisis support and safety resources always available
                {'\n\n'}Remember: every moment is a new opportunity to practice mindfulness.
              </Typography>
            </Card>

            <View style={styles.progressSection}>
              <Typography variant="caption" style={styles.progressText}>
                Step {progress.current} of {progress.total} • Onboarding complete - welcome to Being.
              </Typography>
            </View>
          </ScrollView>

          <View style={styles.buttonContainer}>
            <Button
              onPress={handleCompleteOnboarding}
              style={styles.fullWidthButton}
              accessibilityLabel="Complete onboarding and enter Being."
              haptic={true}
            >
              Enter Being.
            </Button>
          </View>
        </Animated.View>
      </Screen>
    );
  }

  // Completion Phase
  if (currentPhase === 'completion') {
    return (
      <Screen safeAreaEdges={[]} style={{ backgroundColor: themeColors.background }}>
        <Animated.View style={[styles.completionContainer, celebrationAnimatedStyle]}>
          <View style={styles.completionContent}>
            <TherapeuticHeading
              variant="h1"
              style={[styles.completionTitle, { color: themeColors.accent }]}
            >
              Welcome to Being.
            </TherapeuticHeading>

            <Typography
              variant="subtitle"
              style={[styles.completionSubtitle, { color: themeColors.text.secondary }]}
            >
              Your mindful journey begins now
            </Typography>

            <View style={[styles.completionIcon, { backgroundColor: themeColors.accent }]}>
              <Typography variant="h1" style={styles.iconText}>
                🌱
              </Typography>
            </View>
          </View>
        </Animated.View>
      </Screen>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  crisisButtonContainer: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    zIndex: 1000,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl * 2,
    paddingBottom: spacing.xl,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  practiceCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  instructionCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  preparationCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  celebrationCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  reflectionCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  journeyCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  cardTitle: {
    marginBottom: spacing.md,
  },
  cardText: {
    lineHeight: 24,
    color: colorSystem.text.body,
  },
  practiceContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressSection: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  progressText: {
    textAlign: 'center',
    color: colorSystem.text.secondary,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  backButton: {
    flex: 1,
  },
  continueButton: {
    flex: 2,
  },
  fullWidthButton: {
    flex: 1,
  },
  completionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  completionTitle: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  completionSubtitle: {
    textAlign: 'center',
    marginBottom: spacing.xl * 2,
  },
  completionIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 48,
  },
});

export default PracticeIntroductionStep;