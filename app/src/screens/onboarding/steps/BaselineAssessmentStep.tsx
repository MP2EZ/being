/**
 * BaselineAssessmentStep - Step 3: Clinical Baseline Assessment (PHQ-9/GAD-7)
 *
 * CLINICAL FOCUS: Baseline mood assessment with crisis detection
 * DURATION: ~7 minutes with progressive disclosure
 * SAFETY: Real-time crisis detection and intervention protocols
 */

import React, { useCallback, useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

import {
  Screen,
  Typography,
  TherapeuticHeading,
  Button,
  Card,
  CrisisButton,
  LoadingScreen,
} from '../../../components/core';

import { AssessmentFlow } from '../../../flows/assessment/AssessmentFlow';
import { OnboardingStepProps } from '../TherapeuticOnboardingFlow';
import { useAssessmentStore, useCrisisStore } from '../../../store';
import { colorSystem, spacing } from '../../../constants/colors';
import { useHaptics } from '../../../hooks/useHaptics';

type AssessmentPhase = 'intro' | 'phq9' | 'gad7' | 'results' | 'crisis-support' | 'complete';

export const BaselineAssessmentStep: React.FC<OnboardingStepProps> = ({
  theme,
  onNext,
  onBack,
  progress,
}) => {
  const [currentPhase, setCurrentPhase] = useState<AssessmentPhase>('intro');
  const [phq9Score, setPHQ9Score] = useState<number | null>(null);
  const [gad7Score, setGAD7Score] = useState<number | null>(null);
  const [crisisDetected, setCrisisDetected] = useState(false);
  const [hasCompletedAssessments, setHasCompletedAssessments] = useState(false);

  const { triggerHaptic } = useHaptics();
  const {
    startAssessment,
    clearCurrentAssessment,
    currentAssessment,
    detectCrisis,
  } = useAssessmentStore();

  const {
    activateCrisisProtocols,
    getCrisisResources,
    isInCrisisState,
  } = useCrisisStore();

  // Animation values
  const fadeInValue = useSharedValue(0);
  const slideUpValue = useSharedValue(30);

  const themeColors = colorSystem.themes[theme];

  useEffect(() => {
    // Gentle entrance animation
    fadeInValue.value = withTiming(1, { duration: 600 });
    slideUpValue.value = withSpring(0, {
      damping: 12,
      stiffness: 100,
    });
  }, []);

  // Crisis detection effect
  useEffect(() => {
    if (phq9Score !== null || gad7Score !== null) {
      const crisis = detectCrisis({
        phq9Score: phq9Score || 0,
        gad7Score: gad7Score || 0,
        context: 'onboarding'
      });

      if (crisis.detected) {
        setCrisisDetected(true);
        activateCrisisProtocols(crisis);
        setCurrentPhase('crisis-support');
      }
    }
  }, [phq9Score, gad7Score, detectCrisis, activateCrisisProtocols]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeInValue.value,
    transform: [{ translateY: slideUpValue.value }],
  }));

  const handleStartPHQ9 = useCallback(() => {
    triggerHaptic('light');
    startAssessment('phq9', 'onboarding');
    setCurrentPhase('phq9');
  }, [triggerHaptic, startAssessment]);

  const handlePHQ9Complete = useCallback((score: number) => {
    setPHQ9Score(score);
    triggerHaptic('success');

    // Check for crisis before proceeding
    const crisis = detectCrisis({
      phq9Score: score,
      gad7Score: 0,
      context: 'onboarding'
    });

    if (crisis.detected) {
      setCrisisDetected(true);
      setCurrentPhase('crisis-support');
    } else {
      // Continue to GAD-7
      setTimeout(() => {
        startAssessment('gad7', 'onboarding');
        setCurrentPhase('gad7');
      }, 1000);
    }
  }, [triggerHaptic, detectCrisis, startAssessment]);

  const handleGAD7Complete = useCallback((score: number) => {
    setGAD7Score(score);
    setHasCompletedAssessments(true);
    triggerHaptic('success');

    // Final crisis check with both scores
    const crisis = detectCrisis({
      phq9Score: phq9Score || 0,
      gad7Score: score,
      context: 'onboarding'
    });

    if (crisis.detected) {
      setCrisisDetected(true);
      setCurrentPhase('crisis-support');
    } else {
      setCurrentPhase('results');
    }
  }, [phq9Score, triggerHaptic, detectCrisis]);

  const handleContinueFromCrisis = useCallback(() => {
    triggerHaptic('light');
    if (hasCompletedAssessments) {
      setCurrentPhase('results');
    } else if (phq9Score !== null) {
      // Continue to GAD-7 with enhanced support
      startAssessment('gad7', 'onboarding');
      setCurrentPhase('gad7');
    } else {
      // Crisis detected during PHQ-9, provide option to continue with support
      Alert.alert(
        'Continue with Support',
        'We can continue the assessment with additional safety measures, or you can connect with crisis resources first.',
        [
          {
            text: 'Connect to Crisis Support',
            onPress: () => {
              // This would open crisis resources
              activateCrisisProtocols({ detected: true, level: 'high', context: 'onboarding' });
            }
          },
          {
            text: 'Continue with Support',
            onPress: () => {
              startAssessment('gad7', 'onboarding');
              setCurrentPhase('gad7');
            }
          }
        ]
      );
    }
  }, [triggerHaptic, hasCompletedAssessments, phq9Score, startAssessment, activateCrisisProtocols]);

  const handleContinueToNext = useCallback(() => {
    triggerHaptic('light');
    clearCurrentAssessment();
    onNext();
  }, [triggerHaptic, clearCurrentAssessment, onNext]);

  const handleBack = useCallback(() => {
    if (currentPhase !== 'intro') {
      Alert.alert(
        'Assessment in Progress',
        'Are you sure you want to go back? Your assessment progress will be saved.',
        [
          { text: 'Continue Assessment', style: 'cancel' },
          {
            text: 'Go Back',
            onPress: () => {
              clearCurrentAssessment();
              onBack?.();
            }
          }
        ]
      );
    } else {
      triggerHaptic('light');
      onBack?.();
    }
  }, [currentPhase, clearCurrentAssessment, onBack, triggerHaptic]);

  // Assessment introduction phase
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
                Understanding Your Current State
              </TherapeuticHeading>

              <Typography
                variant="subtitle"
                style={[styles.subtitle, { color: themeColors.text.secondary }]}
              >
                Brief baseline assessment to personalize your experience
              </Typography>
            </View>

            <Card style={[styles.introCard, { backgroundColor: themeColors.surface }]}>
              <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.primary }]}>
                Why We Ask These Questions
              </Typography>
              <Typography variant="body" style={styles.cardText}>
                These clinically-validated questionnaires help us understand your current
                emotional state so we can:
                {'\n\n'}• Personalize your MBCT practice to your needs
                {'\n'}• Track your progress and growth over time
                {'\n'}• Ensure appropriate safety measures are in place
                {'\n'}• Connect you with additional resources if helpful
                {'\n\n'}Your responses are private and encrypted on your device only.
              </Typography>
            </Card>

            <Card style={[styles.safetyCard, { backgroundColor: themeColors.safety?.background || themeColors.surface }]}>
              <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.primary }]}>
                Your Privacy & Autonomy
              </Typography>
              <Typography variant="body" style={styles.cardText}>
                • All responses are confidential and stored securely on your device
                {'\n'}• You can skip questions or stop at any time
                {'\n'}• If responses indicate you need support, we'll provide resources
                {'\n'}• This is not a diagnostic tool - it's for awareness and personalization
                {'\n'}• You remain in complete control of your therapeutic journey
              </Typography>
            </Card>

            <Card style={[styles.timeCard, { backgroundColor: themeColors.surface }]}>
              <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.primary }]}>
                Assessment Overview
              </Typography>
              <Typography variant="body" style={styles.cardText}>
                <Typography variant="bodyBold">PHQ-9 Assessment</Typography> (2-3 minutes)
                {'\n'}9 questions about mood and well-being over the past two weeks
                {'\n\n'}<Typography variant="bodyBold">GAD-7 Assessment</Typography> (2-3 minutes)
                {'\n'}7 questions about anxiety and worry patterns
                {'\n\n'}Total time: approximately 5-7 minutes with therapeutic pacing
              </Typography>
            </Card>

            <View style={styles.progressSection}>
              <Typography variant="caption" style={styles.progressText}>
                Step {progress.current} of {progress.total} • Building your therapeutic foundation
              </Typography>
            </View>
          </ScrollView>

          <View style={styles.buttonContainer}>
            <Button
              variant="outline"
              onPress={handleBack}
              style={styles.backButton}
              accessibilityLabel="Go back to MBCT education"
              haptic={true}
            >
              Back
            </Button>

            <Button
              onPress={handleStartPHQ9}
              style={styles.continueButton}
              accessibilityLabel="Begin baseline assessment"
              haptic={true}
            >
              Begin Assessment
            </Button>
          </View>
        </Animated.View>
      </Screen>
    );
  }

  // Assessment in progress
  if (currentPhase === 'phq9' || currentPhase === 'gad7') {
    return (
      <Screen safeAreaEdges={[]} style={{ backgroundColor: themeColors.background }}>
        <View style={styles.crisisButtonContainer}>
          <CrisisButton />
        </View>

        <View style={styles.assessmentContainer}>
          <AssessmentFlow
            type={currentPhase}
            onComplete={currentPhase === 'phq9' ? handlePHQ9Complete : handleGAD7Complete}
            onCancel={handleBack}
          />
        </View>
      </Screen>
    );
  }

  // Crisis support phase
  if (currentPhase === 'crisis-support') {
    return (
      <Screen safeAreaEdges={[]} style={{ backgroundColor: themeColors.background }}>
        <View style={styles.crisisButtonContainer}>
          <CrisisButton />
        </View>

        <View style={styles.container}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.headerSection}>
              <TherapeuticHeading
                variant="h1"
                style={[styles.title, { color: themeColors.accent }]}
              >
                Additional Support Available
              </TherapeuticHeading>

              <Typography
                variant="subtitle"
                style={[styles.subtitle, { color: themeColors.text.secondary }]}
              >
                Your responses suggest you might benefit from extra care
              </Typography>
            </View>

            <Card style={[styles.crisisCard, {
              backgroundColor: themeColors.surface,
              borderColor: themeColors.accent,
              borderWidth: 2
            }]}>
              <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.accent }]}>
                We're Here to Support You
              </Typography>
              <Typography variant="body" style={styles.cardText}>
                Your well-being is our priority. Based on your responses, Being. will:
                {'\n\n'}• Provide extra safety resources and gentle practices
                {'\n'}• Offer more frequent check-ins and support reminders
                {'\n'}• Connect you quickly to crisis resources when needed
                {'\n'}• Personalize your experience with additional care
                {'\n\n'}Remember: you're taking a positive step by exploring support options.
              </Typography>
            </Card>

            <Card style={[styles.resourcesCard, { backgroundColor: themeColors.surface }]}>
              <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.accent }]}>
                Immediate Support Resources
              </Typography>
              <Typography variant="body" style={styles.cardText}>
                <Typography variant="bodyBold" style={styles.emergencyText}>
                  🆘 988 - Suicide & Crisis Lifeline (24/7)
                </Typography>
                {'\n'}Free, confidential support for people in crisis
                {'\n\n'}<Typography variant="bodyBold" style={styles.emergencyText}>
                  💬 Crisis Text Line: Text HOME to 741741
                </Typography>
                {'\n'}24/7 text-based crisis support
                {'\n\n'}<Typography variant="bodyBold" style={styles.emergencyText}>
                  🚑 911 - Emergency Services
                </Typography>
                {'\n'}For immediate life-threatening emergencies
              </Typography>
            </Card>

            <Card style={[styles.continuityCard, { backgroundColor: themeColors.surface }]}>
              <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.primary }]}>
                Continuing Your Journey
              </Typography>
              <Typography variant="body" style={styles.cardText}>
                You can continue setting up Being. with enhanced safety features, or take time
                to connect with professional support first. Either choice honors your needs.
                {'\n\n'}Being. will adapt to provide the most appropriate level of support for your situation.
              </Typography>
            </Card>
          </ScrollView>

          <View style={styles.buttonContainer}>
            <Button
              variant="outline"
              onPress={() => {
                // Open crisis resources
                activateCrisisProtocols({ detected: true, level: 'high', context: 'onboarding' });
              }}
              style={styles.backButton}
              accessibilityLabel="Connect to crisis resources"
              haptic={true}
            >
              Connect to Resources
            </Button>

            <Button
              onPress={handleContinueFromCrisis}
              style={styles.continueButton}
              accessibilityLabel="Continue with enhanced support"
              haptic={true}
            >
              Continue with Support
            </Button>
          </View>
        </View>
      </Screen>
    );
  }

  // Assessment results
  if (currentPhase === 'results') {
    return (
      <Screen safeAreaEdges={[]} style={{ backgroundColor: themeColors.background }}>
        <View style={styles.crisisButtonContainer}>
          <CrisisButton />
        </View>

        <View style={styles.container}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.headerSection}>
              <TherapeuticHeading
                variant="h1"
                style={[styles.title, { color: themeColors.primary }]}
              >
                Assessment Complete
              </TherapeuticHeading>

              <Typography
                variant="subtitle"
                style={[styles.subtitle, { color: themeColors.text.secondary }]}
              >
                Thank you for sharing this information with us
              </Typography>
            </View>

            <Card style={[styles.resultsCard, { backgroundColor: themeColors.surface }]}>
              <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.primary }]}>
                Your Personalized Experience
              </Typography>
              <Typography variant="body" style={styles.cardText}>
                Your responses help us personalize your Being. experience:
                {'\n\n'}• Daily practices tailored to your current needs
                {'\n'}• Progress tracking meaningful to your therapeutic goals
                {'\n'}• Appropriate safety resources and support levels
                {'\n'}• MBCT exercises adapted to your comfort level
                {'\n\n'}Remember: this information supports your wellness journey,
                and professional care remains important for mental health concerns.
              </Typography>
            </Card>

            {crisisDetected && (
              <Card style={[styles.enhancedSupportCard, {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.accent,
                borderWidth: 2
              }]}>
                <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.accent }]}>
                  Enhanced Support Features
                </Typography>
                <Typography variant="body" style={styles.cardText}>
                  Being. will provide additional care including:
                  {'\n\n'}• More frequent wellness check-ins
                  {'\n'}• Gentle, trauma-informed MBCT practices
                  {'\n'}• Quick access to crisis resources
                  {'\n'}• Enhanced safety monitoring and support
                </Typography>
              </Card>
            )}

            <Card style={[styles.nextStepsCard, { backgroundColor: themeColors.surface }]}>
              <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.primary }]}>
                What Happens Next
              </Typography>
              <Typography variant="body" style={styles.cardText}>
                We'll help you set up your safety network and personalize your practice preferences.
                Your assessment results remain private and secure on your device.
                {'\n\n'}You can retake these assessments anytime to track your progress and adjust your experience.
              </Typography>
            </Card>

            <View style={styles.progressSection}>
              <Typography variant="caption" style={styles.progressText}>
                Step {progress.current} of {progress.total} • Foundation complete
              </Typography>
            </View>
          </ScrollView>

          <View style={styles.buttonContainer}>
            <Button
              onPress={handleContinueToNext}
              style={styles.fullWidthButton}
              accessibilityLabel="Continue to safety planning"
              haptic={true}
            >
              Continue to Safety Planning
            </Button>
          </View>
        </View>
      </Screen>
    );
  }

  return <LoadingScreen message="Processing assessment..." theme={theme} />;
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
  introCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  safetyCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  timeCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  crisisCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  resourcesCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  continuityCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  resultsCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  enhancedSupportCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  nextStepsCard: {
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
  emergencyText: {
    color: colorSystem.semantic.error,
  },
  assessmentContainer: {
    flex: 1,
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
});

export default BaselineAssessmentStep;