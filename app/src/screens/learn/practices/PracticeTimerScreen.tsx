/**
 * Practice Timer Screen - Educational Breathing & Reflection Exercises
 * FEAT-81: Interactive Practice Screens (Phase 2 DRY Migration)
 *
 * Phase 2 Migration: Uses Phase 2 DRY abstractions from practiceCommon.ts barrel
 * - PracticeScreenLayout: Shared layout wrapper (replaces SafeAreaView + header)
 * - PracticeInstructions: Fade animation component (replaces inline Animated.View)
 * - useTimerPractice: Timer state management hook (consolidates timer logic)
 * - sharedPracticeStyles: Common styles (reduces StyleSheet duplication)
 *
 * Reuses shared components:
 * - BreathingCircle: 60fps react-native-reanimated animations
 * - Timer: Timestamp-based timer with pause/resume and accessibility
 * - PracticeToggleButton: Begin/Pause/Resume logic
 * - usePracticeCompletion: Completion flow and quote lookup
 *
 * Philosopher-validated Stoic quotes for completion screen
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  PracticeScreenLayout,
  PracticeInstructions,
  PracticeToggleButton,
  usePracticeCompletion,
  useTimerPractice,
  sharedPracticeStyles,
  colorSystem,
  spacing,
  typography,
  borderRadius,
  type ModuleId,
} from './shared/practiceCommon';
import BreathingCircle from '../../../flows/shared/components/BreathingCircle';
import Timer from '../../../flows/shared/components/Timer';

interface PracticeTimerScreenProps {
  practiceId: string;
  moduleId: ModuleId;
  duration: number; // Duration in seconds
  title: string;
  onComplete?: () => void;
  onBack?: () => void;
  testID?: string;
}

const PracticeTimerScreen: React.FC<PracticeTimerScreenProps> = ({
  practiceId,
  moduleId,
  duration,
  title,
  onComplete,
  onBack,
  testID = 'practice-timer-screen',
}) => {
  // Phase 2: Consolidated timer state management
  const {
    isTimerActive,
    elapsedTime,
    setIsTimerActive,
    handleTimerTick,
    handleTimerComplete,
  } = useTimerPractice({
    duration,
    onComplete: () => markComplete(),
  });

  // Shared hooks
  const { renderCompletion, markComplete } = usePracticeCompletion({
    practiceId,
    moduleId,
    title,
    onComplete,
    testID,
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
      scrollable={false}
      testID={testID}
    >
      {/* Practice Instructions - Phase 2: Uses shared PracticeInstructions component */}
      <PracticeInstructions
        text="Find a comfortable position. Follow the breathing circle and let your breath find its natural rhythm."
        isActive={isTimerActive}
        variant="simple"
        testID={`${testID}-instructions`}
      />

      {/* Breathing Circle - Screen-specific component */}
      <View style={styles.breathingSection}>
        <BreathingCircle
          isActive={isTimerActive}
          testID={`${testID}-breathing-circle`}
        />
      </View>

      {/* Timer Component (Shared DRY Component) - Always rendered, controlled by isActive */}
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
        style={{ marginBottom: spacing.xl }}
        testID={`${testID}-toggle-button`}
      />

      {/* Mindfulness Note - Phase 2: Uses shared styles */}
      <View style={sharedPracticeStyles.noteSection}>
        <Text style={sharedPracticeStyles.noteIcon}>💡</Text>
        <Text style={sharedPracticeStyles.noteText}>
          If your mind wanders, gently return your attention to the breath. This is
          the practice.
        </Text>
      </View>
    </PracticeScreenLayout>
  );
};

const styles = StyleSheet.create({
  // Screen-specific styles only
  breathingSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
});

export default PracticeTimerScreen;
