/**
 * Reflection Timer Screen - Educational Reflection & Contemplation Exercises
 * FEAT-81: Interactive Practice Screens
 *
 * Reuses shared components for DRY compliance:
 * - Timer: Timestamp-based timer with pause/resume and accessibility
 * - PracticeCompletionScreen: Philosopher-validated completion
 *
 * Use case: Reflection practices (virtue exercises, contemplation, journaling prompts)
 * vs. PracticeTimerScreen: Breathing-focused practices with BreathingCircle
 *
 * DESIGN:
 * - Clean, minimal interface for contemplation
 * - No input required (space for mental reflection)
 * - Optional reflection prompt that fades after start
 *
 * ACCESSIBILITY:
 * - WCAG AA compliant
 * - Screen reader announcements via Timer
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { colorSystem, spacing, typography, borderRadius } from '../../../constants/colors';
import Timer from '../../../flows/shared/components/Timer';
import PracticeScreenHeader from './shared/PracticeScreenHeader';
import PracticeToggleButton from './shared/PracticeToggleButton';
import { usePracticeCompletion } from './shared/usePracticeCompletion';
import type { ModuleId } from '../../../types/education';

interface ReflectionTimerScreenProps {
  practiceId: string;
  moduleId: ModuleId;
  duration: number; // Duration in seconds
  title: string;
  prompt?: string; // Optional brief reflection prompt
  instructions?: string[]; // Full instruction steps (always visible)
  onComplete?: () => void;
  onBack?: () => void;
  testID?: string;
}

const ReflectionTimerScreen: React.FC<ReflectionTimerScreenProps> = ({
  practiceId,
  moduleId,
  duration,
  title,
  prompt,
  instructions,
  onComplete,
  onBack,
  testID = 'reflection-timer-screen',
}) => {
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // Track elapsed time in ms

  // Shared hooks
  const { renderCompletion, markComplete } = usePracticeCompletion({
    practiceId,
    moduleId,
    title,
    onComplete,
    onBack,
    testID,
  });

  /**
   * Handle timer tick - update elapsed time
   */
  const handleTimerTick = (remainingMs: number) => {
    const elapsed = (duration * 1000) - remainingMs;
    setElapsedTime(elapsed);
  };

  /**
   * Handle timer completion
   */
  const handleTimerComplete = () => {
    setIsTimerActive(false);
    markComplete();
  };

  // Show completion screen after timer finishes
  const completionScreen = renderCompletion();
  if (completionScreen) {
    return completionScreen;
  }

  return (
    <SafeAreaView style={styles.container} testID={testID}>
      <StatusBar barStyle="dark-content" backgroundColor={colorSystem.base.white} />

      {/* Header */}
      <PracticeScreenHeader
        title={title}
        onBack={onBack || (() => {})}
        testID={`${testID}-header`}
      />

      {/* Main Content - Scrollable */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Always-Visible Full Instructions */}
        {instructions && instructions.length > 0 && (
          <View style={styles.instructionsSection}>
            <Text style={styles.instructionsLabel}>Instructions:</Text>
            {instructions.map((instruction, index) => (
              <View key={index} style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>{index + 1}.</Text>
                <Text style={styles.instructionText}>{instruction}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Contemplation Space - Visual anchor */}
        <View style={styles.contemplationSpace}>
          <View style={styles.contemplationIcon}>
            <Text style={styles.iconText}>🧘</Text>
          </View>
          <Text style={styles.contemplationText}>
            Take time to reflect. There's no need to write anything down—simply
            contemplate the prompt and notice what arises.
          </Text>
        </View>

        {/* Timer Component (Shared DRY Component) */}
        <View style={styles.timerSection}>
          <Timer
            duration={duration * 1000} // Convert seconds to milliseconds
            isActive={isTimerActive}
            onComplete={handleTimerComplete}
            onTick={handleTimerTick}
            onPause={() => setIsTimerActive(false)}
            onResume={() => setIsTimerActive(true)}
            showProgress={true}
            showControls={false} // Hide built-in controls, using custom button below
            showSkip={false}
            theme="learn"
            testID={`${testID}-timer`}
          />
        </View>

        {/* Single Toggle Button: Begin Practice → Pause → Resume */}
        <PracticeToggleButton
          isActive={isTimerActive}
          elapsedTime={elapsedTime}
          onToggle={setIsTimerActive}
          style={{ marginBottom: spacing.xl }}
          testID={`${testID}-toggle-button`}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  instructionsSection: {
    marginBottom: spacing.xl,
    paddingVertical: spacing.md,
  },
  instructionsLabel: {
    fontSize: typography.caption.size,
    fontWeight: '700',
    color: colorSystem.navigation.learn,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  instructionNumber: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    color: colorSystem.navigation.learn,
    marginRight: spacing.xs,
    minWidth: 20,
  },
  instructionText: {
    flex: 1,
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[800],
    lineHeight: 22,
  },
  contemplationSpace: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.xl,
  },
  contemplationIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colorSystem.navigation.learn + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconText: {
    fontSize: 40,
  },
  contemplationText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
  timerSection: {
    marginBottom: spacing.xl,
  },
});

export default ReflectionTimerScreen;
