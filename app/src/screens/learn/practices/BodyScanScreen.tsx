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
  StatusBar,
  ScrollView,
  Animated,
} from 'react-native';
import { colorSystem, spacing, typography, borderRadius } from '../../../constants/colors';
import { BODY_AREAS } from '../../../flows/shared/components/BodyAreaGrid';
import ProgressiveBodyScanList from '../../../flows/shared/components/ProgressiveBodyScanList';
import Timer from '../../../flows/shared/components/Timer';
import PracticeScreenHeader from './shared/PracticeScreenHeader';
import PracticeToggleButton from './shared/PracticeToggleButton';
import { usePracticeCompletion } from './shared/usePracticeCompletion';
import { useInstructionsFade } from './shared/useInstructionsFade';
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
  'Upper Legs & Lower Legs': 'Bring awareness through your upper legs and lower legs. Notice points of contact and any sensations present.',
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
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // Track elapsed time in ms

  // Shared hooks
  const { opacity: instructionsOpacity, showInstructions } = useInstructionsFade(isTimerActive);
  const { renderCompletion, markComplete } = usePracticeCompletion({
    practiceId,
    moduleId,
    title: 'Body Scan Practice',
    onComplete,
    onBack,
    testID,
  });

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
    markComplete();
  };

  // Show completion screen after all areas scanned
  const completionScreen = renderCompletion();
  if (completionScreen) {
    return completionScreen;
  }

  return (
    <SafeAreaView style={styles.container} testID={testID}>
      <StatusBar barStyle="dark-content" backgroundColor={colorSystem.base.white} />

      {/* Header */}
      <PracticeScreenHeader
        title="Body Scan Practice"
        onBack={onBack || (() => {})}
        testID={`${testID}-header`}
      />

      {/* Main Content - Scrollable */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Practice Instructions - Fade out after starting */}
        <Animated.View
          style={[
            styles.instructionsSection,
            { opacity: instructionsOpacity }
          ]}
          pointerEvents={showInstructions ? 'auto' : 'none'}
        >
          <Text style={styles.instructionsText}>
            Find a comfortable position. We'll guide you through {areaCount} body areas,
            spending time with each one. Simply notice what's here.
          </Text>
        </Animated.View>

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
});

export default BodyScanScreen;
