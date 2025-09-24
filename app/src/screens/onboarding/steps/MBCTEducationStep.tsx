/**
 * MBCTEducationStep - Step 2: MBCT Education & Evidence-Based Introduction
 *
 * CLINICAL FOCUS: MBCT principles, research foundation, therapeutic approach
 * DURATION: ~7 minutes with interactive education
 * THERAPEUTIC: Present-moment awareness modeling throughout
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
} from '../../../components/core';

import { OnboardingStepProps } from '../TherapeuticOnboardingFlow';
import { colorSystem, spacing } from '../../../constants/colors';
import { useHaptics } from '../../../hooks/useHaptics';

interface MBCTPrinciple {
  id: string;
  icon: string;
  title: string;
  description: string;
  example: string;
}

const MBCT_PRINCIPLES: MBCTPrinciple[] = [
  {
    id: 'present-moment',
    icon: '🧘‍♀️',
    title: 'Present-Moment Awareness',
    description: 'Gently bringing attention to what\'s happening right now',
    example: 'Notice: How does your body feel as you read this?'
  },
  {
    id: 'non-judgmental',
    icon: '🌱',
    title: 'Non-Judgmental Observation',
    description: 'Noticing thoughts and feelings without labeling them as good or bad',
    example: 'Observing thoughts like clouds passing in the sky'
  },
  {
    id: 'body-first',
    icon: '💗',
    title: 'Body-First Approach',
    description: 'Starting with body sensations to ground awareness',
    example: 'Begin with breath, then expand awareness outward'
  },
  {
    id: 'self-compassion',
    icon: '🤝',
    title: 'Self-Compassion',
    description: 'Treating yourself with kindness during difficult moments',
    example: 'Speaking to yourself as you would a good friend'
  },
];

export const MBCTEducationStep: React.FC<OnboardingStepProps> = ({
  theme,
  onNext,
  onBack,
  progress,
}) => {
  const [hasReadEducation, setHasReadEducation] = useState(false);
  const [selectedPrinciple, setSelectedPrinciple] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const { triggerHaptic } = useHaptics();

  // Animation values
  const cardAnimations = MBCT_PRINCIPLES.map(() => useSharedValue(0));
  const selectedCardScale = useSharedValue(1);

  React.useEffect(() => {
    // Staggered card entrance animation
    MBCT_PRINCIPLES.forEach((_, index) => {
      setTimeout(() => {
        cardAnimations[index].value = withSpring(1, {
          damping: 12,
          stiffness: 100,
        });
      }, index * 200);
    });
  }, []);

  const themeColors = colorSystem.themes[theme];

  const handlePrincipleSelect = useCallback((principleId: string) => {
    setSelectedPrinciple(principleId);
    setHasInteracted(true);
    triggerHaptic('light');

    // Animate selected card
    selectedCardScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withSpring(1.05, { damping: 8, stiffness: 200 }),
      withTiming(1, { duration: 200 })
    );
  }, [triggerHaptic, selectedCardScale]);

  const handleContinue = useCallback(() => {
    if (!hasReadEducation || !hasInteracted) {
      Alert.alert(
        'Take Your Time',
        'Learning about MBCT principles helps you get the most from your practice. Please explore the principles and complete your reading.',
        [{ text: 'Continue Exploring', style: 'default' }]
      );
      return;
    }

    triggerHaptic('light');
    onNext();
  }, [hasReadEducation, hasInteracted, triggerHaptic, onNext]);

  const handleBack = useCallback(() => {
    triggerHaptic('light');
    onBack?.();
  }, [triggerHaptic, onBack]);

  return (
    <Screen safeAreaEdges={[]} style={{ backgroundColor: themeColors.background }}>
      {/* Crisis Button */}
      <View style={styles.crisisButtonContainer}>
        <CrisisButton />
      </View>

      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          onScrollEndDrag={() => setHasReadEducation(true)}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.headerSection}>
            <TherapeuticHeading
              variant="h1"
              style={[styles.title, { color: themeColors.primary }]}
            >
              Understanding MBCT
            </TherapeuticHeading>

            <Typography
              variant="subtitle"
              style={[styles.subtitle, { color: themeColors.text.secondary }]}
            >
              The science and practice behind mindful awareness
            </Typography>
          </View>

          {/* MBCT Overview */}
          <Card style={[styles.overviewCard, { backgroundColor: themeColors.surface }]}>
            <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.primary }]}>
              What is Mindfulness-Based Cognitive Therapy?
            </Typography>
            <Typography variant="body" style={styles.cardText}>
              MBCT combines mindfulness meditation with cognitive therapy principles.
              Developed from decades of research, it helps you:
              {'\n\n'}• Break free from negative thought patterns
              {'\n'}• Increase emotional awareness and regulation
              {'\n'}• Develop self-compassion and resilience
              {'\n'}• Build a healthier relationship with difficult experiences
              {'\n\n'}The practice focuses on observing thoughts and feelings without judgment,
              helping you relate differently to life's challenges.
            </Typography>
          </Card>

          {/* Evidence Base */}
          <Card style={[styles.evidenceCard, { backgroundColor: themeColors.surface }]}>
            <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.primary }]}>
              Evidence-Based Benefits
            </Typography>
            <Typography variant="body" style={styles.cardText}>
              Research shows MBCT can be effective for:
              {'\n\n'}• Reducing symptoms of depression and anxiety
              {'\n'}• Preventing relapse of depressive episodes
              {'\n'}• Improving emotional regulation and resilience
              {'\n'}• Enhancing overall quality of life and well-being
              {'\n\n'}Every practice in Being. is grounded in this research foundation.
            </Typography>
          </Card>

          {/* Interactive Principles */}
          <View style={styles.principlesSection}>
            <Typography variant="h3" style={[styles.sectionTitle, { color: themeColors.primary }]}>
              Core MBCT Principles in Being.
            </Typography>
            <Typography variant="body" style={[styles.instructionText, { color: themeColors.text.secondary }]}>
              Tap each principle to learn more about how it guides your practice:
            </Typography>

            {MBCT_PRINCIPLES.map((principle, index) => {
              const isSelected = selectedPrinciple === principle.id;
              const animatedStyle = useAnimatedStyle(() => ({
                opacity: cardAnimations[index].value,
                transform: [
                  { translateY: (1 - cardAnimations[index].value) * 50 },
                  { scale: isSelected ? selectedCardScale.value : 1 }
                ],
              }));

              return (
                <Animated.View key={principle.id} style={animatedStyle}>
                  <Card
                    style={[
                      styles.principleCard,
                      {
                        backgroundColor: isSelected ? themeColors.primary : themeColors.surface,
                        borderColor: isSelected ? themeColors.accent : themeColors.border,
                        borderWidth: isSelected ? 2 : 1,
                      }
                    ]}
                    onPress={() => handlePrincipleSelect(principle.id)}
                  >
                    <View style={styles.principleHeader}>
                      <Typography variant="h2" style={styles.principleIcon}>
                        {principle.icon}
                      </Typography>
                      <Typography
                        variant="h4"
                        style={[
                          styles.principleTitle,
                          { color: isSelected ? themeColors.surface : themeColors.primary }
                        ]}
                      >
                        {principle.title}
                      </Typography>
                    </View>

                    <Typography
                      variant="body"
                      style={[
                        styles.principleDescription,
                        { color: isSelected ? themeColors.surface : themeColors.text.body }
                      ]}
                    >
                      {principle.description}
                    </Typography>

                    {isSelected && (
                      <View style={styles.exampleSection}>
                        <Typography
                          variant="bodyBold"
                          style={[styles.exampleLabel, { color: themeColors.surface }]}
                        >
                          Try this now:
                        </Typography>
                        <Typography
                          variant="body"
                          style={[
                            styles.exampleText,
                            { color: themeColors.surface, fontStyle: 'italic' }
                          ]}
                        >
                          {principle.example}
                        </Typography>
                      </View>
                    )}
                  </Card>
                </Animated.View>
              );
            })}
          </View>

          {/* Your Journey */}
          <Card style={[styles.journeyCard, { backgroundColor: themeColors.surface }]}>
            <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.primary }]}>
              Your MBCT Journey with Being.
            </Typography>
            <Typography variant="body" style={styles.cardText}>
              Throughout your time with Being., these principles will guide:
              {'\n\n'}• Daily check-ins that build present-moment awareness
              {'\n'}• Body-first practices that ground you in felt experience
              {'\n'}• Non-judgmental observation of thoughts and emotions
              {'\n'}• Self-compassionate responses to difficult moments
              {'\n\n'}You'll experience these principles firsthand, not just learn about them.
            </Typography>
          </Card>

          {/* Progress Indicator */}
          <View style={styles.progressSection}>
            <Typography variant="caption" style={styles.progressText}>
              Step {progress.current} of {progress.total} • Building your MBCT foundation
            </Typography>
          </View>
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            variant="outline"
            onPress={handleBack}
            style={styles.backButton}
            accessibilityLabel="Go back to welcome"
            haptic={true}
          >
            Back
          </Button>

          <Button
            onPress={handleContinue}
            style={[
              styles.continueButton,
              {
                backgroundColor: (hasReadEducation && hasInteracted)
                  ? themeColors.primary
                  : themeColors.text.disabled,
              }
            ]}
            disabled={!hasReadEducation || !hasInteracted}
            accessibilityLabel="Continue to baseline assessment"
            haptic={true}
          >
            Continue to Assessment
          </Button>
        </View>

        {(!hasReadEducation || !hasInteracted) && (
          <View style={styles.requirementContainer}>
            <Typography variant="caption" style={styles.requirementText}>
              {!hasReadEducation && "Please scroll to read all information"}
              {!hasReadEducation && !hasInteracted && " and "}
              {!hasInteracted && "explore the MBCT principles"}
            </Typography>
          </View>
        )}
      </View>
    </Screen>
  );
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
  overviewCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  evidenceCard: {
    marginBottom: spacing.xl,
    padding: spacing.lg,
  },
  principlesSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  instructionText: {
    marginBottom: spacing.lg,
    fontStyle: 'italic',
  },
  principleCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  principleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  principleIcon: {
    marginRight: spacing.md,
  },
  principleTitle: {
    flex: 1,
  },
  principleDescription: {
    lineHeight: 22,
  },
  exampleSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  exampleLabel: {
    marginBottom: spacing.xs,
  },
  exampleText: {
    lineHeight: 20,
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
  requirementContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  requirementText: {
    textAlign: 'center',
    color: colorSystem.text.secondary,
    fontStyle: 'italic',
  },
});

export default MBCTEducationStep;