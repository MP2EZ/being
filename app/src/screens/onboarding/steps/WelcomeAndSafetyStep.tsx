/**
 * WelcomeAndSafetyStep - Step 1: Therapeutic Welcome & Safety Establishment
 *
 * CLINICAL FOCUS: Therapeutic rapport, clinical disclaimers, crisis resource introduction
 * DURATION: ~7 minutes with therapeutic messaging
 * SAFETY: Immediate crisis resource access establishment
 */

import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

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

export const WelcomeAndSafetyStep: React.FC<OnboardingStepProps> = ({
  theme,
  onNext,
  progress,
}) => {
  const [hasReadDisclaimer, setHasReadDisclaimer] = useState(false);
  const [userConsent, setUserConsent] = useState(false);
  const { triggerHaptic } = useHaptics();

  // Animation values for therapeutic entrance
  const fadeInValue = useSharedValue(0);
  const slideUpValue = useSharedValue(50);

  React.useEffect(() => {
    // Gentle entrance animation for therapeutic welcome
    fadeInValue.value = withTiming(1, { duration: 800 });
    slideUpValue.value = withSpring(0, {
      damping: 15,
      stiffness: 150,
    });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeInValue.value,
    transform: [{ translateY: slideUpValue.value }],
  }));

  const themeColors = colorSystem.themes[theme];

  const handleContinue = useCallback(() => {
    if (!hasReadDisclaimer || !userConsent) {
      Alert.alert(
        'Please Review Information',
        'To ensure your safety and understanding, please review all the information and provide your consent to continue.',
        [{ text: 'I understand', style: 'default' }]
      );
      return;
    }

    triggerHaptic('light');
    onNext();
  }, [hasReadDisclaimer, userConsent, triggerHaptic, onNext]);

  const handleConsentToggle = useCallback(() => {
    setUserConsent(!userConsent);
    triggerHaptic('selection');
  }, [userConsent, triggerHaptic]);

  return (
    <Screen safeAreaEdges={[]} style={{ backgroundColor: themeColors.background }}>
      {/* Crisis Button - Always Accessible */}
      <View style={styles.crisisButtonContainer}>
        <CrisisButton />
      </View>

      <Animated.View style={[styles.container, animatedStyle]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          onScrollEndDrag={() => setHasReadDisclaimer(true)}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Therapeutic Welcome */}
          <View style={styles.welcomeSection}>
            <TherapeuticHeading
              variant="h1"
              style={[styles.welcomeTitle, { color: themeColors.primary }]}
            >
              Welcome to Being.
            </TherapeuticHeading>

            <Typography
              variant="subtitle"
              style={[styles.welcomeSubtitle, { color: themeColors.text.secondary }]}
            >
              Your companion for mindful awareness and emotional well-being
            </Typography>
          </View>

          {/* About This App */}
          <Card style={[styles.infoCard, { backgroundColor: themeColors.surface }]}>
            <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.primary }]}>
              About This App
            </Typography>
            <Typography variant="body" style={styles.cardText}>
              Being. offers evidence-based Mindfulness-Based Cognitive Therapy (MBCT) practices
              designed to support your emotional well-being through:
              {'\n\n'}• Daily mindfulness check-ins
              {'\n'}• Body awareness exercises
              {'\n'}• Present-moment practices
              {'\n'}• Mood tracking and insights
              {'\n\n'}Every practice is grounded in clinical research and designed with your
              safety and therapeutic growth in mind.
            </Typography>
          </Card>

          {/* Clinical Boundaries */}
          <Card style={[styles.clinicalCard, { backgroundColor: themeColors.safety?.background || themeColors.surface }]}>
            <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.primary }]}>
              Important Clinical Information
            </Typography>
            <Typography variant="body" style={styles.cardText}>
              This app is designed to complement, not replace, professional mental health care.
              {'\n\n'}• Being. is not a substitute for therapy or medical treatment
              {'\n'}• For crisis situations, immediate resources are always available
              {'\n'}• Your mental health journey is unique - this app supports your personal practice
              {'\n'}• We encourage discussing app use with your healthcare providers
              {'\n\n'}Your autonomy and choice guide every aspect of your experience with Being.
            </Typography>
          </Card>

          {/* Crisis Resources */}
          <Card style={[styles.crisisCard, {
            backgroundColor: themeColors.surface,
            borderColor: themeColors.accent,
            borderWidth: 2
          }]}>
            <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.accent }]}>
              🆘 Crisis Support Always Available
            </Typography>
            <Typography variant="body" style={styles.cardText}>
              If you need immediate help:
              {'\n\n'}📞 <Typography variant="bodyBold" style={styles.emergencyText}>988 - Suicide & Crisis Lifeline (24/7)</Typography>
              {'\n'}📞 <Typography variant="bodyBold" style={styles.emergencyText}>911 - Emergency Services</Typography>
              {'\n'}💬 <Typography variant="bodyBold" style={styles.emergencyText}>Text HOME to 741741 - Crisis Text Line</Typography>
              {'\n\n'}These resources are available throughout your time with Being. and
              can be accessed quickly from any screen using the crisis button.
            </Typography>
          </Card>

          {/* Consent Section */}
          <Card style={[styles.consentCard, { backgroundColor: themeColors.surface }]}>
            <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.primary }]}>
              Your Consent and Control
            </Typography>
            <Typography variant="body" style={styles.cardText}>
              By continuing, you acknowledge that:
              {'\n\n'}✓ You understand this app provides wellness support, not medical treatment
              {'\n'}✓ You can stop using the app at any time
              {'\n'}✓ Your data is encrypted and stored securely on your device
              {'\n'}✓ You will seek professional help for mental health concerns
              {'\n'}✓ Crisis resources are available if you need immediate support
              {'\n\n'}Your well-being and safety are our highest priorities.
            </Typography>

            <View style={styles.consentCheckbox}>
              <Button
                variant={userConsent ? "primary" : "outline"}
                onPress={handleConsentToggle}
                style={styles.consentButton}
                accessibilityLabel={userConsent ? "Consent given" : "Tap to provide consent"}
              >
                {userConsent ? "✓ I Understand and Consent" : "Tap to Provide Consent"}
              </Button>
            </View>
          </Card>

          {/* Progress Indicator */}
          <View style={styles.progressSection}>
            <Typography variant="caption" style={styles.progressText}>
              Step {progress.current} of {progress.total} • Establishing your therapeutic foundation
            </Typography>
          </View>
        </ScrollView>

        {/* Continue Button */}
        <View style={styles.buttonContainer}>
          <Button
            onPress={handleContinue}
            style={[
              styles.continueButton,
              {
                backgroundColor: (hasReadDisclaimer && userConsent)
                  ? themeColors.primary
                  : themeColors.text.disabled,
              }
            ]}
            disabled={!hasReadDisclaimer || !userConsent}
            accessibilityLabel="Continue to MBCT education"
            haptic={true}
          >
            Continue to Learning About MBCT
          </Button>

          {(!hasReadDisclaimer || !userConsent) && (
            <Typography variant="caption" style={styles.requirementText}>
              {!hasReadDisclaimer && "Please scroll to read all information"}
              {!hasReadDisclaimer && !userConsent && " and "}
              {!userConsent && "provide your consent to continue"}
            </Typography>
          )}
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
  welcomeSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  welcomeTitle: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  welcomeSubtitle: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  infoCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  clinicalCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  crisisCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  consentCard: {
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
  consentCheckbox: {
    marginTop: spacing.lg,
  },
  consentButton: {
    width: '100%',
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  continueButton: {
    width: '100%',
    marginBottom: spacing.sm,
  },
  requirementText: {
    textAlign: 'center',
    color: colorSystem.text.secondary,
    fontStyle: 'italic',
  },
});

export default WelcomeAndSafetyStep;