/**
 * AwarenessScreen - MBCT 3-Minute Breathing Space (Step 1)
 * 
 * CLINICAL SPECIFICATIONS:
 * - Duration: 60 seconds exact
 * - Title: "What's here right now?"
 * - Subtitle: "Pause and notice thoughts, feelings, and sensations"
 * - Instruction: "Take a moment to notice what's present in your experience right now"
 * - Auto-advance after 60 seconds
 * - Skip option available
 * - Safety features integrated
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colorSystem, spacing, typography } from '../../../constants/colors';
import Timer from '../../shared/components/Timer';
import EmotionGrid from '../../shared/components/EmotionGrid';
import SafetyButton from '../../shared/components/SafetyButton';

interface AwarenessScreenProps {
  onComplete: (data: { emotions: string[] }) => void;
  onSafetyPress: () => void;
  onSkip: () => void;
}

const AwarenessScreen: React.FC<AwarenessScreenProps> = ({
  onComplete,
  onSafetyPress,
  onSkip
}) => {
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [isTimerActive, setIsTimerActive] = useState(true);

  // Duration: exactly 60 seconds (60,000ms)
  const SCREEN_DURATION = 60000;

  const handleTimerComplete = () => {
    setIsTimerActive(false);
    onComplete({ emotions: selectedEmotions });
  };

  const handleSkipPress = () => {
    setIsTimerActive(false);
    onSkip();
  };

  useEffect(() => {
    // Announce screen for accessibility
    const announcement = "Awareness screen. Take a moment to notice what's present in your experience right now.";
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
          <Text style={styles.title}>What's here right now?</Text>
          <Text style={styles.subtitle}>
            Pause and notice thoughts, feelings, and sensations
          </Text>
        </View>

        {/* Timer */}
        <Timer
          duration={SCREEN_DURATION}
          isActive={isTimerActive}
          onComplete={handleTimerComplete}
          onSkip={handleSkipPress}
          showProgress={true}
          showSkip={true}
          theme="midday"
          testID="awareness-timer"
        />

        {/* Main instruction */}
        <View style={styles.instructionContainer}>
          <Text style={styles.instruction}>
            Take a moment to notice what's present in your experience right now
          </Text>
        </View>

        {/* Emotion selection */}
        <EmotionGrid
          selectedEmotions={selectedEmotions}
          onSelectionChange={setSelectedEmotions}
          maxSelections={3}
          theme="midday"
          testID="awareness-emotions"
        />

        {/* Guidance text */}
        <View style={styles.guidanceContainer}>
          <Text style={styles.guidanceText}>
            There's no right or wrong way to feel. Simply notice what's here with kindness.
          </Text>
        </View>

        {/* Safety button */}
        <View style={styles.safetyContainer}>
          <SafetyButton onPress={onSafetyPress} testID="awareness-safety" />
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
  safetyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginTop: spacing.xl,
  },
});

export default AwarenessScreen;