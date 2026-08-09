/**
 * Practice Timer Screen - Educational Breathing & Reflection Exercises
 *
 * Uses shared abstractions from the practiceCommon.ts barrel:
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

import React, { useMemo } from 'react';
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
} from '@/features/learn/practices/shared/practiceCommon';
import BreathingCircle from '@/features/practices/shared/components/BreathingCircle';
import { DEFAULT_PATTERN } from '@/features/practices/shared/breathingPatterns';
import { usePracticeHaptics } from '@/features/practices/shared/haptics/usePracticeHaptics';
import { boundariesWithin } from '@/features/practices/shared/haptics/phaseAtElapsed';
import Timer from '@/features/practices/shared/components/Timer';
import type { PracticeVisualMode } from '@/features/learn/types/education';

/**
 * DEBUG-353: default copy for the breath-paced presentation. Kept verbatim so
 * breathing-space renders byte-identically to before this change.
 */
const BREATHING_INSTRUCTION =
  'Find a comfortable position. Follow the breathing circle and let your breath find its natural rhythm.';
const BREATHING_NOTE =
  'If your mind wanders, gently return your attention to the breath. This is the practice.';

/**
 * Contemplative note. The breath note above is WRONG for a directed-intention
 * practice: it tells the practitioner to return to the breath, when the object
 * of attention is a person. Philosopher-authored (DEBUG-353).
 */
const CONTEMPLATIVE_NOTE =
  "If your mind wanders, that's expected. Notice where it went, and return to the person you were holding in mind. Returning is the practice.";
const CONTEMPLATIVE_FALLBACK_INSTRUCTION =
  'Settle comfortably and let your attention rest. Hold one person in mind at a time and offer them a simple, sincere wish.';

interface PracticeTimerScreenProps {
  practiceId: string;
  moduleId: ModuleId;
  duration: number; // Duration in seconds
  title: string;
  /**
   * Authored steps from the module JSON (DEBUG-353). Explicit `| undefined`
   * because tsconfig sets exactOptionalPropertyTypes — the navigator forwards
   * `route.params.instructions`, which is genuinely `string[] | undefined`.
   */
  instructions?: string[] | undefined;
  /** 'contemplative' suppresses the breathing circle (DEBUG-353). */
  visualMode?: PracticeVisualMode | undefined;
  onComplete?: () => void;
  onBack?: () => void;
  testID?: string;
}

const PracticeTimerScreen: React.FC<PracticeTimerScreenProps> = ({
  practiceId,
  moduleId,
  duration,
  title,
  instructions,
  visualMode = 'breathing',
  onComplete,
  onBack,
  testID = 'practice-timer-screen',
}) => {
  const {
    isTimerActive,
    elapsedTime,
    setIsTimerActive,
    handleTimerTick,
    handleTimerComplete,
  } = useTimerPractice({
    duration,
    onComplete: () => {
      // FEAT-311: the ONLY sessionEnd call site. Reached solely by the timer
      // running out, so an abandoned practice — back-navigation, unmount —
      // stays silent rather than asserting "the practice is complete" to
      // someone who did not complete it.
      emitSessionEnd();
      markComplete();
    },
  });

  // Shared hooks
  const { renderCompletion, markComplete } = usePracticeCompletion({
    practiceId,
    moduleId,
    title,
    onComplete,
    testID,
  });

  /**
   * Breath-phase haptic cues (FEAT-285).
   *
   * This screen renders BreathingCircle with NO `pattern` prop, so the visuals
   * run on the component's exported DEFAULT_PATTERN. The cue schedule is built
   * from that same constant rather than a local copy, so the two cannot drift
   * apart if the default ever changes.
   *
   * FEAT-311: `skipOpening` drops the boundary at atMs 0, because the
   * `sessionStart` anchor now occupies that instant. Both are impactLight, so
   * firing both would be one pulse to the skin with the engine's throttle
   * silently picking which meaning survived.
   */
  const hapticSchedule = useMemo(
    () =>
      boundariesWithin(DEFAULT_PATTERN, duration * 1000, { skipOpening: true }).map((b) => ({
        atMs: b.atMs,
        cue: b.phase,
      })),
    [duration]
  );

  const { emitSessionEnd } = usePracticeHaptics({
    schedule: hapticSchedule,
    isActive: isTimerActive,
    sessionAnchors: true,
  });

  // Stable pause/resume handlers so the memoized Timer is not re-rendered
  // by new inline closures on every parent render.
  const handlePause = React.useCallback(() => setIsTimerActive(false), [setIsTimerActive]);
  const handleResume = React.useCallback(() => setIsTimerActive(true), [setIsTimerActive]);

  // DEBUG-353 — presentation resolution.
  //
  // `contemplative` is only honoured when the practice actually carries authored
  // steps; otherwise there is nothing to guide with and falling back to the
  // breath copy would be worse than a generic contemplative line. Degrades, never
  // throws: this renders above RootCrisisButton with no error boundary between
  // (ErrorBoundary.tsx has zero importers), so a throw here would white-screen the
  // 988 affordance (DEBUG-344).
  const steps = React.useMemo(
    () => (instructions ?? []).filter((s) => typeof s === 'string' && s.trim().length > 0),
    [instructions]
  );
  const isContemplative = visualMode === 'contemplative';

  // Advance one step per equal slice of the session, derived from elapsed time
  // rather than chained timers so a pause/resume cannot drift the sequence.
  const activeStep = React.useMemo(() => {
    if (!isContemplative || steps.length === 0 || duration <= 0) return 0;
    const slice = duration / steps.length;
    return Math.min(Math.floor(elapsedTime / slice), steps.length - 1);
  }, [isContemplative, steps.length, duration, elapsedTime]);

  const showBreathingCircle = !isContemplative;
  const noteText = isContemplative ? CONTEMPLATIVE_NOTE : BREATHING_NOTE;

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
      {/* Practice Instructions */}
      {isContemplative && steps.length > 0 ? (
        <PracticeInstructions
          text={steps}
          isActive={isTimerActive}
          variant="stepped"
          activeStep={activeStep}
          persistent
          testID={`${testID}-instructions`}
        />
      ) : (
        <PracticeInstructions
          text={
            isContemplative ? CONTEMPLATIVE_FALLBACK_INSTRUCTION : BREATHING_INSTRUCTION
          }
          isActive={isTimerActive}
          variant="simple"
          testID={`${testID}-instructions`}
        />
      )}

      {/* Breathing Circle — suppressed for contemplative practices. A
          breath-paced animation entrains respiration and re-anchors attention
          on the breath, which contradicts a directed-intention practice whose
          object of attention is a person (philosopher ruling, DEBUG-353). */}
      {showBreathingCircle && (
        <View style={styles.breathingSection}>
          <BreathingCircle
            isActive={isTimerActive}
            testID={`${testID}-breathing-circle`}
          />
        </View>
      )}

      {/* Timer Component (Shared DRY Component) - Always rendered, controlled by isActive */}
      <View style={sharedPracticeStyles.timerSection}>
        <Timer
          duration={duration * 1000} // Convert seconds to milliseconds
          isActive={isTimerActive}
          onComplete={handleTimerComplete}
          onTick={handleTimerTick}
          onPause={handlePause}
          onResume={handleResume}
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

      {/* Mindfulness Note */}
      <View style={sharedPracticeStyles.noteSection}>
        <Text style={sharedPracticeStyles.noteIcon}>💡</Text>
        <Text style={sharedPracticeStyles.noteText}>{noteText}</Text>
      </View>
    </PracticeScreenLayout>
  );
};

const styles = StyleSheet.create({
  // Screen-specific styles only
  breathingSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[32],
  },
});

export default PracticeTimerScreen;
