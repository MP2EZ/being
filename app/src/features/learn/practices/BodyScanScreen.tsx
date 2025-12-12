/**
 * Body Scan Practice Screen - Educational Body Awareness Exercise
 * FEAT-81: Interactive Practice Screens
 * PHASE 2: Migrated to DRY abstractions
 *
 * Reuses shared components for DRY compliance:
 * - PracticeScreenLayout: Unified screen wrapper with header
 * - PracticeInstructions: Standardized fade-in/out instructions
 * - PracticeToggleButton: Begin/Pause/Resume control
 * - useTimerPractice: Timer state management with custom onTick
 * - ProgressiveBodyScanList: Progressive body scan visualization
 * - Timer: Timestamp-based timer with pause/resume and accessibility
 *
 * CLINICAL SPECIFICATIONS:
 * - Progressive body scan through 6 body areas
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
 * - Screen reader announcements via ProgressiveBodyScanList
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
  useState,
  sharedPracticeStyles,
  colorSystem,
  spacing,
  typography,
  type ModuleId,
} from '@/features/learn/practices/shared/practiceCommon';
import { BODY_AREAS } from '@/features/practices/shared/components/BodyAreaGrid';
import ProgressiveBodyScanList from '@/features/practices/shared/components/ProgressiveBodyScanList';
import Timer from '@/features/practices/shared/components/Timer';

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
  // Screen-specific state: track which body area we're currently on
  const [currentAreaIndex, setCurrentAreaIndex] = useState(0);

  // Calculate area-based timing
  const areaCount = BODY_AREAS.length;
  const durationPerArea = duration / areaCount; // Seconds per area

  // Shared hooks
  const { renderCompletion, markComplete } = usePracticeCompletion({
    practiceId,
    moduleId,
    title: 'Body Scan Practice',
    onComplete,
    testID,
  });

  // Timer state management with custom onTick for area advancement
  const {
    isTimerActive,
    elapsedTime,
    setIsTimerActive,
    handleTimerTick,
    handleTimerComplete,
  } = useTimerPractice({
    duration,
    onComplete: markComplete,
    onTick: (elapsedMs) => {
      // Calculate which area we should be on based on elapsed time
      const elapsedSeconds = elapsedMs / 1000;
      const targetAreaIndex = Math.min(
        Math.floor(elapsedSeconds / durationPerArea),
        areaCount - 1
      );

      // Advance to next area if needed
      if (targetAreaIndex !== currentAreaIndex) {
        setCurrentAreaIndex(targetAreaIndex);
      }
    },
  });

  // Current area context
  const currentArea = BODY_AREAS[currentAreaIndex] ?? 'Head & Neck';
  const currentGuidance = AREA_GUIDANCE[currentArea] || 'Bring gentle awareness to this area.';

  // Show completion screen after all areas scanned
  const completionScreen = renderCompletion();
  if (completionScreen) {
    return completionScreen;
  }

  return (
    <PracticeScreenLayout
      title="Body Scan Practice"
      onBack={onBack || (() => {})}
      scrollable={true}
      testID={testID}
    >
      {/* Practice Instructions - Fade out after starting */}
      <PracticeInstructions
        text={`Find a comfortable position. We'll guide you through ${areaCount} body areas, spending time with each one. Simply notice what's here.`}
        isActive={isTimerActive}
        variant="simple"
        testID={`${testID}-instructions`}
      />

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
      <View style={sharedPracticeStyles.timerSection}>
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
        style={{ marginBottom: spacing[32] }}
        testID={`${testID}-toggle-button`}
      />
    </PracticeScreenLayout>
  );
};

const styles = StyleSheet.create({
  bodyAreaSection: {
    marginBottom: spacing[32],
  },
});

export default BodyScanScreen;
