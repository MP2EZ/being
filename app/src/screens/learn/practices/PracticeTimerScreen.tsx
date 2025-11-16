/**
 * Practice Timer Screen - Educational Breathing & Reflection Exercises
 * FEAT-81: Interactive Practice Screens
 *
 * Reuses shared components for DRY compliance:
 * - BreathingCircle: 60fps react-native-reanimated animations
 * - Timer: Timestamp-based timer with pause/resume and accessibility
 * - PracticeScreenHeader: Shared header with back button
 * - PracticeToggleButton: Begin/Pause/Resume logic
 * - usePracticeCompletion: Completion flow and quote lookup
 * - useInstructionsFade: Instructions fade animation
 *
 * Philosopher-validated Stoic quotes for completion screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Animated,
} from 'react-native';
import { colorSystem, spacing, typography, borderRadius } from '../../../constants/colors';
import BreathingCircle from '../../../flows/shared/components/BreathingCircle';
import Timer from '../../../flows/shared/components/Timer';
import PracticeScreenHeader from './shared/PracticeScreenHeader';
import PracticeToggleButton from './shared/PracticeToggleButton';
import { usePracticeCompletion } from './shared/usePracticeCompletion';
import { useInstructionsFade } from './shared/useInstructionsFade';
import type { ModuleId } from '../../../types/education';

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
  const [isTimerActive, setIsTimerActive] = useState(false); // Start inactive, wait for user to begin
  const [elapsedTime, setElapsedTime] = useState(0); // Track elapsed time in ms

  // Shared hooks
  const { opacity: instructionsOpacity, showInstructions } = useInstructionsFade(isTimerActive);
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

      {/* Main Content */}
      <View style={styles.content}>
        {/* Practice Instructions - Fade out after starting */}
        <Animated.View
          style={[
            styles.instructionsSection,
            { opacity: instructionsOpacity }
          ]}
          pointerEvents={showInstructions ? 'auto' : 'none'}
        >
          <Text style={styles.instructionsText}>
            Find a comfortable position. Follow the breathing circle and let your breath
            find its natural rhythm.
          </Text>
        </Animated.View>

        {/* Breathing Circle */}
        <View style={styles.breathingSection}>
          <BreathingCircle
            isActive={isTimerActive}
            testID={`${testID}-breathing-circle`}
          />
        </View>

        {/* Timer Component (Shared DRY Component) - Always rendered, controlled by isActive */}
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

        {/* Mindfulness Note */}
        <View style={styles.noteSection}>
          <Text style={styles.noteIcon}>💡</Text>
          <Text style={styles.noteText}>
            If your mind wanders, gently return your attention to the breath. This is
            the practice.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  instructionsSection: {
    marginBottom: spacing.xl,
  },
  instructionsText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    textAlign: 'center',
    lineHeight: 24,
  },
  breathingSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  timerSection: {
    marginBottom: spacing.xl,
  },
  noteSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colorSystem.navigation.learn + '10',
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    gap: spacing.sm,
  },
  noteIcon: {
    fontSize: 20,
  },
  noteText: {
    flex: 1,
    fontSize: typography.caption.size,
    color: colorSystem.gray[700],
    lineHeight: 20,
    fontStyle: 'italic',
  },
});

export default PracticeTimerScreen;
