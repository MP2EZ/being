/**
 * Body Scan Practice Screen - Educational Body Awareness Exercise
 * FEAT-81: Interactive Practice Screens
 *
 * Reuses shared components for DRY compliance:
 * - BodyAreaGrid: Progressive body scan visualization
 * - Timer: Timestamp-based timer with pause/resume and accessibility
 *
 * CLINICAL SPECIFICATIONS:
 * - Progressive body scan through 10 body areas
 * - Timer advances through areas automatically
 * - Guidance text for each body area
 *
 * PERFORMANCE:
 * - <500ms launch time
 * - Timestamp-based timer (deterministic)
 *
 * PHILOSOPHER VALIDATION:
 * - Marcus Aurelius quote on completion (Meditations 5.9)
 * - Educational tone (no gamification)
 *
 * ACCESSIBILITY:
 * - WCAG AA compliant
 * - Screen reader announcements via BodyAreaGrid
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import { colorSystem, spacing, typography, borderRadius } from '../../../constants/colors';
import { BODY_AREAS } from '../../../flows/shared/components/BodyAreaGrid';
import ProgressiveBodyScanList from '../../../flows/shared/components/ProgressiveBodyScanList';
import Timer from '../../../flows/shared/components/Timer';
import PracticeCompletionScreen, {
  PRACTICE_QUOTES,
} from './PracticeCompletionScreen';
import { useEducationStore } from '../../../stores/educationStore';
import type { ModuleId } from '../../../types/education';

interface BodyScanScreenProps {
  practiceId: string;
  moduleId: ModuleId;
  duration: number; // Total duration in seconds
  onComplete?: () => void;
  onBack?: () => void;
  testID?: string;
}

/**
 * Guidance text for each body area
 * Maps to BODY_AREAS from BodyAreaGrid (6 grouped areas)
 */
const AREA_GUIDANCE: Record<string, string> = {
  'Head & Neck': 'Notice any tension in your forehead, jaw, temples, or neck. Allow your face to soften and your neck to release.',
  'Shoulders & Chest': 'Feel your shoulders and notice if they\'re raised or tense. Notice your breath moving through your chest.',
  'Upper Back & Lower Back': 'Bring awareness to your entire spine, from upper back to lower back. Notice areas of tension or ease.',
  'Abdomen & Hips': 'Scan through your core and hips. Notice any sensations and feel points of contact with your seat.',
  'Legs & Thighs': 'Bring awareness through your legs and thighs. Notice points of contact and any sensations present.',
  'Feet': 'Ground your awareness in your feet. Feel the connection with the surface beneath you.',
};

const BodyScanScreen: React.FC<BodyScanScreenProps> = ({
  practiceId,
  moduleId,
  duration,
  onComplete,
  onBack,
  testID = 'body-scan-screen',
}) => {
  const [currentAreaIndex, setCurrentAreaIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // Track elapsed time in ms

  // Store actions
  const incrementPracticeCount = useEducationStore(
    (state) => state.incrementPracticeCount
  );

  const currentArea = BODY_AREAS[currentAreaIndex] ?? 'Head & Neck';
  const currentGuidance = AREA_GUIDANCE[currentArea] || 'Bring gentle awareness to this area.';
  const areaCount = BODY_AREAS.length;
  const durationPerArea = duration / areaCount; // Seconds per area

  /**
   * Handle timer tick - update elapsed time and advance areas
   */
  const handleTimerTick = (remainingMs: number) => {
    const elapsed = (duration * 1000) - remainingMs;
    setElapsedTime(elapsed);

    // Calculate which area we should be on based on elapsed time
    const elapsedSeconds = elapsed / 1000;
    const targetAreaIndex = Math.min(
      Math.floor(elapsedSeconds / durationPerArea),
      areaCount - 1
    );

    if (targetAreaIndex !== currentAreaIndex) {
      setCurrentAreaIndex(targetAreaIndex);
    }
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
   * Handle final completion screen done
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

  /**
   * Start the practice
   */
  const handleStart = () => {
    setIsTimerActive(true);
  };

  // Show completion screen after all areas scanned
  if (isComplete) {
    const quote = PRACTICE_QUOTES[practiceId] || PRACTICE_QUOTES['body-scan'];
    if (!quote) {
      throw new Error(`Missing quote for practiceId: ${practiceId}`);
    }
    return (
      <PracticeCompletionScreen
        practiceTitle="Body Scan Practice"
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
        <Text style={styles.headerTitle}>Body Scan Practice</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Main Content - Scrollable */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Practice Instructions - Only show before starting */}
        {!isTimerActive && (
          <View style={styles.instructionsSection}>
            <Text style={styles.instructionsText}>
              Find a comfortable position. We'll guide you through {areaCount} body areas,
              spending time with each one. Simply notice what's here.
            </Text>
          </View>
        )}

        {/* Progressive Body Scan List (Shared DRY Component) */}
        <View style={styles.bodyAreaSection}>
          <ProgressiveBodyScanList
            areas={BODY_AREAS}
            currentIndex={currentAreaIndex}
            {...(isTimerActive && { currentGuidance })}
            testID={`${testID}-body-scan-list`}
          />
        </View>

        {/* Timer Component (Shared DRY Component) - Full duration */}
        <View style={styles.timerSection}>
          <Timer
            duration={duration * 1000} // Full duration in milliseconds
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
              ? "Begin body scan practice"
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
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
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
  instructionsSection: {
    marginBottom: spacing.xl,
  },
  instructionsText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    textAlign: 'center',
    lineHeight: 24,
  },
  bodyAreaSection: {
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
});

export default BodyScanScreen;
