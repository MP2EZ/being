/**
 * PersonalizationStep - Step 5: Therapeutic Preferences & Accessibility
 *
 * CLINICAL FOCUS: User preferences for therapeutic customization
 * DURATION: ~3 minutes with personalization options
 * THERAPEUTIC: Honoring user autonomy and accessibility needs
 */

import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from '../../../utils/ReanimatedMock';

import {
  Screen,
  Typography,
  TherapeuticHeading,
  Button,
  Card,
  CrisisButton,
  MultiSelect,
} from '../../../components/core';

import { OnboardingStepProps } from '../TherapeuticOnboardingFlow';
import { colorSystem, spacing } from '../../../constants/colors';
import { useHaptics } from '../../../hooks/useHaptics';

interface TherapeuticPreferences {
  practiceTime: string[];
  exerciseDifficulty: 'gentle' | 'moderate' | 'challenging';
  crisisSensitivity: 'high' | 'medium' | 'low';
  accessibilityNeeds: string[];
  notifications: {
    enabled: boolean;
    frequency: 'minimal' | 'standard' | 'supportive';
  };
  therapeuticFocus: string[];
}

const PRACTICE_TIMES = [
  { id: 'morning', label: 'Morning (6-10 AM)', description: 'Start your day with mindfulness' },
  { id: 'midday', label: 'Midday (11 AM-2 PM)', description: 'Midday reset and grounding' },
  { id: 'afternoon', label: 'Afternoon (3-6 PM)', description: 'Transition and energy check' },
  { id: 'evening', label: 'Evening (7-10 PM)', description: 'Wind down and reflection' },
];

const DIFFICULTY_LEVELS = [
  {
    id: 'gentle',
    label: 'Gentle & Supportive',
    description: 'Shorter practices with extra support and guidance'
  },
  {
    id: 'moderate',
    label: 'Balanced Approach',
    description: 'Standard MBCT practices with moderate challenge'
  },
  {
    id: 'challenging',
    label: 'Deep Practice',
    description: 'Longer, more intensive mindfulness exercises'
  },
];

const CRISIS_SENSITIVITY_OPTIONS = [
  {
    id: 'high',
    label: 'High Sensitivity',
    description: 'More frequent check-ins and proactive support'
  },
  {
    id: 'medium',
    label: 'Balanced Approach',
    description: 'Standard safety monitoring with appropriate intervention'
  },
  {
    id: 'low',
    label: 'User-Directed',
    description: 'Minimal intervention, more user control over support'
  },
];

const ACCESSIBILITY_OPTIONS = [
  { id: 'screen-reader', label: 'Screen Reader Support' },
  { id: 'large-text', label: 'Large Text' },
  { id: 'high-contrast', label: 'High Contrast' },
  { id: 'reduced-motion', label: 'Reduced Motion' },
  { id: 'haptic-feedback', label: 'Enhanced Haptic Feedback' },
  { id: 'audio-descriptions', label: 'Audio Descriptions' },
];

const THERAPEUTIC_FOCUS_OPTIONS = [
  { id: 'anxiety', label: 'Anxiety & Worry' },
  { id: 'depression', label: 'Depression & Low Mood' },
  { id: 'stress', label: 'Stress Management' },
  { id: 'sleep', label: 'Sleep & Rest' },
  { id: 'relationships', label: 'Relationships & Communication' },
  { id: 'self-compassion', label: 'Self-Compassion & Kindness' },
  { id: 'emotional-regulation', label: 'Emotional Regulation' },
  { id: 'focus', label: 'Focus & Concentration' },
];

export const PersonalizationStep: React.FC<OnboardingStepProps> = ({
  theme,
  onNext,
  onBack,
  onSkip,
  progress,
}) => {
  const [preferences, setPreferences] = useState<TherapeuticPreferences>({
    practiceTime: [],
    exerciseDifficulty: 'moderate',
    crisisSensitivity: 'medium',
    accessibilityNeeds: [],
    notifications: {
      enabled: true,
      frequency: 'standard',
    },
    therapeuticFocus: [],
  });

  const { triggerHaptic } = useHaptics();

  // Animation values
  const fadeInValue = useSharedValue(0);
  const slideUpValue = useSharedValue(30);

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

  const handlePracticeTimeToggle = useCallback((timeId: string) => {
    setPreferences(prev => ({
      ...prev,
      practiceTime: prev.practiceTime.includes(timeId)
        ? prev.practiceTime.filter(t => t !== timeId)
        : [...prev.practiceTime, timeId]
    }));
    triggerHaptic('selection');
  }, [triggerHaptic]);

  const handleDifficultySelect = useCallback((difficulty: 'gentle' | 'moderate' | 'challenging') => {
    setPreferences(prev => ({ ...prev, exerciseDifficulty: difficulty }));
    triggerHaptic('light');
  }, [triggerHaptic]);

  const handleSensitivitySelect = useCallback((sensitivity: 'high' | 'medium' | 'low') => {
    setPreferences(prev => ({ ...prev, crisisSensitivity: sensitivity }));
    triggerHaptic('light');
  }, [triggerHaptic]);

  const handleAccessibilityToggle = useCallback((accessibilityId: string) => {
    setPreferences(prev => ({
      ...prev,
      accessibilityNeeds: prev.accessibilityNeeds.includes(accessibilityId)
        ? prev.accessibilityNeeds.filter(a => a !== accessibilityId)
        : [...prev.accessibilityNeeds, accessibilityId]
    }));
    triggerHaptic('selection');
  }, [triggerHaptic]);

  const handleTherapeuticFocusToggle = useCallback((focusId: string) => {
    setPreferences(prev => ({
      ...prev,
      therapeuticFocus: prev.therapeuticFocus.includes(focusId)
        ? prev.therapeuticFocus.filter(f => f !== focusId)
        : [...prev.therapeuticFocus, focusId]
    }));
    triggerHaptic('selection');
  }, [triggerHaptic]);

  const handleNotificationToggle = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        enabled: !prev.notifications.enabled
      }
    }));
    triggerHaptic('selection');
  }, [triggerHaptic]);

  const handleContinue = useCallback(() => {
    triggerHaptic('light');
    // Save preferences to user store
    // This would typically integrate with the user preferences system
    onNext();
  }, [triggerHaptic, onNext]);

  const handleSkip = useCallback(() => {
    Alert.alert(
      'Skip Personalization?',
      'You can always customize these preferences later in Settings. Being. will use gentle defaults.',
      [
        { text: 'Continue Setup', style: 'cancel' },
        {
          text: 'Use Defaults',
          style: 'default',
          onPress: () => {
            triggerHaptic('light');
            onSkip?.();
          }
        }
      ]
    );
  }, [triggerHaptic, onSkip]);

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

      <Animated.View style={[styles.container, animatedStyle]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.headerSection}>
            <TherapeuticHeading
              variant="h1"
              style={[styles.title, { color: themeColors.primary }]}
            >
              Personalizing Your Practice
            </TherapeuticHeading>

            <Typography
              variant="subtitle"
              style={[styles.subtitle, { color: themeColors.text.secondary }]}
            >
              Tailoring MBCT to fit your life and needs
            </Typography>
          </View>

          {/* Practice Times */}
          <Card style={[styles.preferencesCard, { backgroundColor: themeColors.surface }]}>
            <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.primary }]}>
              When Would You Like to Practice?
            </Typography>
            <Typography variant="body" style={[styles.cardDescription, { marginBottom: spacing.lg }]}>
              Choose the times that work best for your mindfulness practice. You can select multiple times.
            </Typography>

            {PRACTICE_TIMES.map((time) => (
              <View key={time.id} style={styles.optionRow}>
                <Button
                  variant={preferences.practiceTime.includes(time.id) ? "primary" : "outline"}
                  onPress={() => handlePracticeTimeToggle(time.id)}
                  style={styles.optionButton}
                  accessibilityLabel={`Toggle ${time.label}`}
                >
                  {preferences.practiceTime.includes(time.id) ? "✓ " : ""}{time.label}
                </Button>
                <Typography variant="caption" style={styles.optionDescription}>
                  {time.description}
                </Typography>
              </View>
            ))}
          </Card>

          {/* Exercise Difficulty */}
          <Card style={[styles.preferencesCard, { backgroundColor: themeColors.surface }]}>
            <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.primary }]}>
              Exercise Difficulty
            </Typography>
            <Typography variant="body" style={[styles.cardDescription, { marginBottom: spacing.lg }]}>
              How challenging would you like your mindfulness exercises to be?
            </Typography>

            {DIFFICULTY_LEVELS.map((level) => (
              <View key={level.id} style={styles.optionRow}>
                <Button
                  variant={preferences.exerciseDifficulty === level.id ? "primary" : "outline"}
                  onPress={() => handleDifficultySelect(level.id as any)}
                  style={styles.optionButton}
                  accessibilityLabel={`Select ${level.label}`}
                >
                  {preferences.exerciseDifficulty === level.id ? "✓ " : ""}{level.label}
                </Button>
                <Typography variant="caption" style={styles.optionDescription}>
                  {level.description}
                </Typography>
              </View>
            ))}
          </Card>

          {/* Crisis Sensitivity */}
          <Card style={[styles.preferencesCard, { backgroundColor: themeColors.surface }]}>
            <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.primary }]}>
              Crisis Support Sensitivity
            </Typography>
            <Typography variant="body" style={[styles.cardDescription, { marginBottom: spacing.lg }]}>
              How would you like us to approach crisis support detection and intervention?
            </Typography>

            {CRISIS_SENSITIVITY_OPTIONS.map((option) => (
              <View key={option.id} style={styles.optionRow}>
                <Button
                  variant={preferences.crisisSensitivity === option.id ? "primary" : "outline"}
                  onPress={() => handleSensitivitySelect(option.id as any)}
                  style={styles.optionButton}
                  accessibilityLabel={`Select ${option.label}`}
                >
                  {preferences.crisisSensitivity === option.id ? "✓ " : ""}{option.label}
                </Button>
                <Typography variant="caption" style={styles.optionDescription}>
                  {option.description}
                </Typography>
              </View>
            ))}
          </Card>

          {/* Therapeutic Focus */}
          <Card style={[styles.preferencesCard, { backgroundColor: themeColors.surface }]}>
            <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.primary }]}>
              Therapeutic Focus Areas
            </Typography>
            <Typography variant="body" style={[styles.cardDescription, { marginBottom: spacing.lg }]}>
              What areas would you like your practice to focus on? Select any that resonate with you.
            </Typography>

            <View style={styles.multiSelectContainer}>
              {THERAPEUTIC_FOCUS_OPTIONS.map((option) => (
                <Button
                  key={option.id}
                  variant={preferences.therapeuticFocus.includes(option.id) ? "primary" : "outline"}
                  onPress={() => handleTherapeuticFocusToggle(option.id)}
                  style={styles.multiSelectButton}
                  accessibilityLabel={`Toggle ${option.label}`}
                >
                  {preferences.therapeuticFocus.includes(option.id) ? "✓ " : ""}{option.label}
                </Button>
              ))}
            </View>
          </Card>

          {/* Accessibility Needs */}
          <Card style={[styles.preferencesCard, { backgroundColor: themeColors.surface }]}>
            <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.primary }]}>
              Accessibility & Inclusion
            </Typography>
            <Typography variant="body" style={[styles.cardDescription, { marginBottom: spacing.lg }]}>
              Help us make Being. work better for you by selecting any accessibility features you need.
            </Typography>

            <View style={styles.multiSelectContainer}>
              {ACCESSIBILITY_OPTIONS.map((option) => (
                <Button
                  key={option.id}
                  variant={preferences.accessibilityNeeds.includes(option.id) ? "primary" : "outline"}
                  onPress={() => handleAccessibilityToggle(option.id)}
                  style={styles.multiSelectButton}
                  accessibilityLabel={`Toggle ${option.label}`}
                >
                  {preferences.accessibilityNeeds.includes(option.id) ? "✓ " : ""}{option.label}
                </Button>
              ))}
            </View>
          </Card>

          {/* Notifications */}
          <Card style={[styles.preferencesCard, { backgroundColor: themeColors.surface }]}>
            <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.primary }]}>
              Gentle Reminders
            </Typography>
            <Typography variant="body" style={[styles.cardDescription, { marginBottom: spacing.lg }]}>
              Would you like gentle notifications to support your practice? You can adjust these anytime.
            </Typography>

            <View style={styles.optionRow}>
              <Button
                variant={preferences.notifications.enabled ? "primary" : "outline"}
                onPress={handleNotificationToggle}
                style={styles.optionButton}
                accessibilityLabel="Toggle notifications"
              >
                {preferences.notifications.enabled ? "✓ " : ""}Enable Gentle Reminders
              </Button>
              <Typography variant="caption" style={styles.optionDescription}>
                Supportive notifications for practice times and check-ins
              </Typography>
            </View>
          </Card>

          {/* Customization Note */}
          <Card style={[styles.noteCard, { backgroundColor: themeColors.surface }]}>
            <Typography variant="h4" style={[styles.cardTitle, { color: themeColors.primary }]}>
              Your Preferences, Your Control
            </Typography>
            <Typography variant="body" style={styles.cardText}>
              All of these preferences can be updated anytime in your Settings. Being. adapts
              to your changing needs and therapeutic journey.
              {'\n\n'}Your choices help create a personalized MBCT experience that honors
              your autonomy and supports your well-being.
            </Typography>
          </Card>

          {/* Progress Indicator */}
          <View style={styles.progressSection}>
            <Typography variant="caption" style={styles.progressText}>
              Step {progress.current} of {progress.total} • Optional - creating your personalized experience
            </Typography>
          </View>
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            variant="outline"
            onPress={handleBack}
            style={styles.backButton}
            accessibilityLabel="Go back to safety planning"
            haptic={true}
          >
            Back
          </Button>

          <Button
            variant="outline"
            onPress={handleSkip}
            style={styles.skipButton}
            accessibilityLabel="Skip personalization"
            haptic={true}
          >
            Use Defaults
          </Button>

          <Button
            onPress={handleContinue}
            style={styles.continueButton}
            accessibilityLabel="Continue to practice introduction"
            haptic={true}
          >
            Continue
          </Button>
        </View>
      </Animated.View>
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
  preferencesCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  noteCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  cardTitle: {
    marginBottom: spacing.md,
  },
  cardDescription: {
    lineHeight: 22,
    color: colorSystem.text.secondary,
  },
  cardText: {
    lineHeight: 24,
    color: colorSystem.text.body,
  },
  optionRow: {
    marginBottom: spacing.md,
  },
  optionButton: {
    width: '100%',
    marginBottom: spacing.xs,
  },
  optionDescription: {
    color: colorSystem.text.secondary,
    fontStyle: 'italic',
    paddingHorizontal: spacing.sm,
  },
  multiSelectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  multiSelectButton: {
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
    gap: spacing.sm,
  },
  backButton: {
    flex: 1,
  },
  skipButton: {
    flex: 1,
  },
  continueButton: {
    flex: 1.5,
  },
});

export default PersonalizationStep;