/**
 * Reflection Timer Screen - Educational Reflection & Contemplation Exercises
 * FEAT-81: Interactive Practice Screens
 *
 * Phase 2 Migration: Uses DRY abstractions
 * - PracticeScreenLayout: Unified layout wrapper
 * - useTimerPractice: Shared timer state management
 * - sharedPracticeStyles: Reusable layout styles
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
 * - Always-visible numbered instructions (unique pattern)
 *
 * ACCESSIBILITY:
 * - WCAG AA compliant
 * - Screen reader announcements via Timer
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  PracticeScreenLayout,
  PracticeToggleButton,
  usePracticeCompletion,
  useTimerPractice,
  sharedPracticeStyles,
  colorSystem,
  spacing,
  typography,
  borderRadius,
  type ModuleId,
} from '@/features/learn/practices/shared/practiceCommon';
import Timer from '@/features/practices/shared/components/Timer';

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
  // Shared hooks
  const { renderCompletion, markComplete } = usePracticeCompletion({
    practiceId,
    moduleId,
    title,
    onComplete,
    testID,
  });

  const {
    isTimerActive,
    elapsedTime,
    setIsTimerActive,
    handleTimerTick,
    handleTimerComplete,
  } = useTimerPractice({
    duration,
    onComplete: markComplete,
  });

  // Show completion screen after timer finishes
  const completionScreen = renderCompletion();
  if (completionScreen) {
    return completionScreen;
  }

  return (
    <PracticeScreenLayout
      title={title}
      onBack={onBack || (() => {})}
      scrollable={true}
      testID={testID}
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
      <View style={sharedPracticeStyles.timerSection}>
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
        style={{ marginBottom: spacing[32] }}
        testID={`${testID}-toggle-button`}
      />
    </PracticeScreenLayout>
  );
};

const styles = StyleSheet.create({
  // Screen-specific: Always-visible numbered instructions (unique pattern)
  instructionsSection: {
    marginBottom: spacing[32],
    paddingVertical: spacing[16],
  },
  instructionsLabel: {
    fontSize: typography.caption.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.navigation.learn,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[8],
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[8],
  },
  instructionNumber: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.navigation.learn,
    marginRight: spacing[4],
    minWidth: spacing[20],
  },
  instructionText: {
    flex: 1,
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[800],
    lineHeight: spacing[20] + spacing[4],
  },

  // Screen-specific: Contemplation space
  contemplationSpace: {
    alignItems: 'center',
    paddingVertical: spacing[32],
    marginBottom: spacing[32],
  },
  contemplationIcon: {
    width: spacing[80],
    height: spacing[80],
    borderRadius: borderRadius.xxxl,
    backgroundColor: colorSystem.navigation.learn + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[16],
  },
  iconText: {
    fontSize: spacing[40],
  },
  contemplationText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    textAlign: 'center',
    lineHeight: spacing[24],
    paddingHorizontal: spacing[16],
  },
});

export default ReflectionTimerScreen;
