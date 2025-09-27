/**
 * ExpandingScreen - MBCT 3-Minute Breathing Space (Step 3)
 * 
 * CLINICAL SPECIFICATIONS:
 * - Duration: 60 seconds exact
 * - Title: "Widen your awareness"
 * - Subtitle: "Expand your attention like ripples in a pond"
 * - Instruction: "Let your awareness expand from breath to body to surrounding space"
 * - Pleasant event input
 * - Challenging event input (changed from "difficult")
 * - Support needs selection
 * - Auto-advance after 60 seconds or completion
 * - Skip option available
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colorSystem, spacing, typography } from '../../../constants/colors';
import Timer from '../../shared/components/Timer';
import NeedsGrid from '../../shared/components/NeedsGrid';
import SafetyButton from '../../shared/components/SafetyButton';

interface ExpandingScreenData {
  pleasantEvent: string;
  challengingEvent: string;
  selectedNeed: string | null;
}

interface ExpandingScreenProps {
  onComplete: (data: ExpandingScreenData) => void;
  onSafetyPress: () => void;
  onSkip: () => void;
}

const ExpandingScreen: React.FC<ExpandingScreenProps> = ({
  onComplete,
  onSafetyPress,
  onSkip
}) => {
  const [pleasantEvent, setPleasantEvent] = useState('');
  const [challengingEvent, setChallengingEvent] = useState('');
  const [selectedNeed, setSelectedNeed] = useState<string | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(true);

  // Duration: exactly 60 seconds (60,000ms)
  const SCREEN_DURATION = 60000;

  const handleTimerComplete = () => {
    setIsTimerActive(false);
    completeScreen();
  };

  const handleSkipPress = () => {
    setIsTimerActive(false);
    onSkip();
  };

  const completeScreen = () => {
    onComplete({
      pleasantEvent,
      challengingEvent,
      selectedNeed
    });
  };

  // Check if user has completed enough to auto-advance early
  const isReadyForCompletion = () => {
    return (pleasantEvent.trim() || challengingEvent.trim()) && selectedNeed;
  };

  useEffect(() => {
    // If user completes inputs early, they can advance
    if (isReadyForCompletion()) {
      // Could add early completion option here
    }
  }, [pleasantEvent, challengingEvent, selectedNeed]);

  useEffect(() => {
    // Announce screen for accessibility
    const announcement = "Expanding awareness screen. Let your awareness expand from breath to body to surrounding space.";
    // Note: AccessibilityInfo.announceForAccessibility would be imported in real implementation
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Widen your awareness</Text>
            <Text style={styles.subtitle}>
              Expand your attention like ripples in a pond
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
            testID="expanding-timer"
          />

          {/* Main instruction */}
          <View style={styles.instructionContainer}>
            <Text style={styles.instruction}>
              Let your awareness expand from breath to body to surrounding space
            </Text>
          </View>

          {/* Pleasant event input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>One pleasant thing today</Text>
            <TextInput
              style={styles.textInput}
              value={pleasantEvent}
              onChangeText={setPleasantEvent}
              placeholder="What brought a moment of ease or joy?"
              placeholderTextColor={colorSystem.gray[500]}
              multiline
              numberOfLines={2}
              maxLength={200}
              accessibilityLabel="Pleasant event input"
              accessibilityHint="Describe one pleasant thing that happened today"
              testID="expanding-pleasant-input"
            />
          </View>

          {/* Challenging event input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>One challenging thing today</Text>
            <TextInput
              style={styles.textInput}
              value={challengingEvent}
              onChangeText={setChallengingEvent}
              placeholder="What felt difficult or stressful?"
              placeholderTextColor={colorSystem.gray[500]}
              multiline
              numberOfLines={2}
              maxLength={200}
              accessibilityLabel="Challenging event input"
              accessibilityHint="Describe one challenging thing that happened today"
              testID="expanding-challenging-input"
            />
          </View>

          {/* Support needs selection */}
          <View style={styles.needsSection}>
            <NeedsGrid
              selectedNeed={selectedNeed}
              onSelectionChange={setSelectedNeed}
              theme="midday"
              testID="expanding-needs"
            />
          </View>

          {/* Guidance text */}
          <View style={styles.guidanceContainer}>
            <Text style={styles.guidanceText}>
              Notice how awareness can hold both pleasant and challenging experiences with equal compassion.
            </Text>
          </View>

          {/* Completion message */}
          {isReadyForCompletion() && (
            <View style={styles.completionContainer}>
              <Text style={styles.completionText}>
                You've completed your 3-minute breathing space. Notice how you feel.
              </Text>
            </View>
          )}

          {/* Safety button */}
          <View style={styles.safetyContainer}>
            <SafetyButton onPress={onSafetyPress} testID="expanding-safety" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.themes.midday.background, // #F0FBF9
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xxxl, // Extra space for keyboard
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
  inputSection: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.base.black,
    fontWeight: '600',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  textInput: {
    backgroundColor: colorSystem.base.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colorSystem.gray[300],
    padding: spacing.md,
    fontSize: typography.bodyRegular.size,
    color: colorSystem.base.black,
    minHeight: 80,
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  needsSection: {
    marginVertical: spacing.lg,
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
  completionContainer: {
    backgroundColor: colorSystem.themes.midday.light + '20',
    borderRadius: 12,
    padding: spacing.md,
    marginVertical: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.themes.midday.primary,
  },
  completionText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.themes.midday.primary,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 22,
  },
  safetyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginTop: spacing.xl,
  },
});

export default ExpandingScreen;