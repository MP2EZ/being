/**
 * GatheringScreen - MBCT 3-Minute Breathing Space (Step 2)
 * 
 * CLINICAL SPECIFICATIONS:
 * - Duration: 60 seconds exact
 * - Title: "Focus on your breath"
 * - Subtitle: "Use your breath as an anchor to the present moment"
 * - Instruction: "Gently bring your attention to your breathing"
 * - 8-second breathing cycles (4s in, 4s out)
 * - Non-directive guidance
 * - Auto-advance after 60 seconds
 * - Skip option available
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colorSystem, spacing, typography } from '../../../constants/colors';
import Timer from '../../shared/components/Timer';
import BreathingCircle from '../../shared/components/BreathingCircle';
import SafetyButton from '../../shared/components/SafetyButton';

interface GatheringScreenProps {
  onComplete: () => void;
  onSafetyPress: () => void;
  onSkip: () => void;
}

const GatheringScreen: React.FC<GatheringScreenProps> = ({
  onComplete,
  onSafetyPress,
  onSkip
}) => {
  const [isTimerActive, setIsTimerActive] = useState(true);
  const [isBreathingActive, setIsBreathingActive] = useState(true);

  // Duration: exactly 60 seconds (60,000ms)
  const SCREEN_DURATION = 60000;

  const handleTimerComplete = () => {
    setIsTimerActive(false);
    setIsBreathingActive(false);
    onComplete();
  };

  const handleSkipPress = () => {
    setIsTimerActive(false);
    setIsBreathingActive(false);
    onSkip();
  };

  const handleTimerPause = () => {
    setIsBreathingActive(false);
  };

  const handleTimerResume = () => {
    setIsBreathingActive(true);
  };

  useEffect(() => {
    // Announce screen for accessibility
    const announcement = "Breathing focus screen. Gently bring your attention to your breathing and follow the circle.";
    // Note: AccessibilityInfo.announceForAccessibility would be imported in real implementation
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Focus on your breath</Text>
          <Text style={styles.subtitle}>
            Use your breath as an anchor to the present moment
          </Text>
        </View>

        {/* Timer */}
        <Timer
          duration={SCREEN_DURATION}
          isActive={isTimerActive}
          onComplete={handleTimerComplete}
          onPause={handleTimerPause}
          onResume={handleTimerResume}
          onSkip={handleSkipPress}
          showProgress={true}
          showSkip={true}
          theme="midday"
          testID="gathering-timer"
        />

        {/* Main instruction */}
        <View style={styles.instructionContainer}>
          <Text style={styles.instruction}>
            Gently bring your attention to your breathing
          </Text>
        </View>

        {/* Breathing Circle */}
        <View style={styles.breathingContainer}>
          <BreathingCircle
            isActive={isBreathingActive}
            testID="gathering-breathing-circle"
          />
        </View>

        {/* Guidance text */}
        <View style={styles.guidanceContainer}>
          <Text style={styles.guidanceText}>
            If your mind wanders, that's perfectly natural. Simply notice where it went and gently return your attention to the breath.
          </Text>
        </View>

        {/* Additional support text */}
        <View style={styles.supportContainer}>
          <Text style={styles.supportText}>
            If feeling overwhelmed, return attention to breath
          </Text>
        </View>

        {/* Safety button */}
        <View style={styles.safetyContainer}>
          <SafetyButton onPress={onSafetyPress} testID="gathering-safety" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.themes.midday.background, // #F0FBF9
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.headline2.weight,
    color: colorSystem.themes.midday.primary, // #40B5AD
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.base.black,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
  instructionContainer: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  instruction: {
    fontSize: typography.bodyLarge.size,
    color: colorSystem.base.black,
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '500',
  },
  breathingContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  guidanceContainer: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  guidanceText: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[600],
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  supportContainer: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colorSystem.themes.midday.light + '20', // Subtle background
    borderRadius: 12,
    marginHorizontal: spacing.md,
  },
  supportText: {
    fontSize: typography.caption.size,
    color: colorSystem.themes.midday.primary,
    textAlign: 'center',
    fontWeight: '500',
  },
  safetyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginTop: spacing.xl,
  },
});

export default GatheringScreen;