/**
 * Practice Timer Screen - Educational Breathing & Reflection Exercises
 * FEAT-81: Interactive Practice Screens
 *
 * Reuses shared components for DRY compliance:
 * - BreathingCircle: 60fps react-native-reanimated animations
 * - Timer: Timestamp-based timer with pause/resume and accessibility
 *
 * Philosopher-validated Stoic quotes for completion screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { colorSystem, spacing, typography, borderRadius } from '../../../constants/colors';
import BreathingCircle from '../../../flows/shared/components/BreathingCircle';
import Timer from '../../../flows/shared/components/Timer';
import PracticeCompletionScreen, {
  PRACTICE_QUOTES,
} from './PracticeCompletionScreen';
import { useEducationStore } from '../../../stores/educationStore';
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
  const [isComplete, setIsComplete] = useState(false);
  const [isTimerActive, setIsTimerActive] = useState(false); // Start inactive, wait for user to begin
  const [elapsedTime, setElapsedTime] = useState(0); // Track elapsed time in ms

  // Store actions
  const incrementPracticeCount = useEducationStore(
    (state) => state.incrementPracticeCount
  );

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
    setIsComplete(true);
    incrementPracticeCount(moduleId);
  };

  /**
   * Handle starting the practice
   */
  const handleStart = () => {
    setIsTimerActive(true);
  };

  /**
   * Handle completion screen done
   */
  const handleCompletionDone = () => {
    onComplete?.();
  };

  /**
   * Handle back button
   */
  const handleBack = () => {
    onBack?.();
  };

  // Show completion screen after timer finishes
  if (isComplete) {
    const quote = PRACTICE_QUOTES[practiceId] || PRACTICE_QUOTES['breathing-space'];
    if (!quote) {
      throw new Error(`Missing quote for practiceId: ${practiceId}`);
    }
    return (
      <PracticeCompletionScreen
        practiceTitle={title}
        quote={quote}
        moduleId={moduleId}
        onContinue={handleCompletionDone}
        onReturn={handleBack}
        testID={`${testID}-completion`}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} testID={testID}>
      <StatusBar barStyle="dark-content" backgroundColor={colorSystem.base.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          accessibilityHint="Return to previous screen"
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Practice Instructions */}
        <View style={styles.instructionsSection}>
          <Text style={styles.instructionsText}>
            Find a comfortable position. Follow the breathing circle and let your breath
            find its natural rhythm.
          </Text>
        </View>

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
            theme="midday"
            testID={`${testID}-timer`}
          />
        </View>

        {/* Single Toggle Button: Begin Practice → Pause → Resume */}
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => {
            if (elapsedTime === 0) {
              // First press: Begin Practice
              handleStart();
            } else if (isTimerActive) {
              // Active: Pause
              setIsTimerActive(false);
            } else {
              // Paused: Resume
              setIsTimerActive(true);
            }
          }}
          accessibilityRole="button"
          accessibilityLabel={
            elapsedTime === 0
              ? "Begin practice"
              : isTimerActive
              ? "Pause practice"
              : "Resume practice"
          }
          testID={`${testID}-toggle-button`}
        >
          <Text style={styles.startButtonText}>
            {elapsedTime === 0 ? 'Begin Practice' : isTimerActive ? 'Pause' : 'Resume'}
          </Text>
        </TouchableOpacity>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.gray[200],
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  backButtonText: {
    fontSize: 24,
    color: colorSystem.navigation.learn,
  },
  headerTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.base.black,
    textAlign: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
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
  startButton: {
    backgroundColor: colorSystem.navigation.learn,
    borderRadius: borderRadius.large,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  startButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    color: colorSystem.base.white,
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
