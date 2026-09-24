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
import { useWindowDimensions } from 'react-native';
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
import { useHapticsOptIn } from '@/features/practices/shared/haptics/useHapticsOptIn';
import { HapticsOptInPrompt } from '@/features/practices/shared/components/HapticsOptInPrompt';
import { boundariesWithin } from '@/features/practices/shared/haptics/phaseAtElapsed';
import Timer from '@/features/practices/shared/components/Timer';
import BreathingFrameProbe from '@/features/practices/shared/components/BreathingFrameProbe';
import { env } from '@/core/config/env';
import { CRISIS_BUTTON_EXCLUSION_RECT } from '@/features/crisis/constants/crisisButtonGeometry';
import { useCrisisExclusionAssertion } from '@/core/hooks/useCrisisExclusionAssertion';
import { practiceHeaderStacksTitle } from '@/features/learn/practices/shared/practiceScreenHeaderLayout';
import type { PracticeVisualMode } from '@/features/learn/types/education';

/**
 * DEBUG-638: from this font scale the toggle renders directly after the breathing circle
 * and the circle hides its generic guidance copy. It is the header's stacking threshold,
 * so the header and the body change shape at the same step.
 */
export const practiceTimerUsesAxLayout = (fontScale: number): boolean =>
  practiceHeaderStacksTitle(fontScale);

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
  const { renderCompletion, markStarted, markComplete } = usePracticeCompletion({
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

  // FEAT-385: the once-ever haptics opt-in. `useHapticsOptIn` owns the claim
  // across all three practice screens, so this renders on at most one of them,
  // at most once ever — see its module note for the async-write window.
  const { shouldPrompt: shouldPromptHaptics, onChoose: onChooseHaptics } = useHapticsOptIn();

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
  // DEBUG-638: at AX5 the circle's own guidance copy and the Timer put the circle ~1033pt
  // above the toggle in a ~502pt viewport, so whenever the control was reachable the breath
  // guide was not. From the header's stacking threshold the toggle takes the slot directly
  // after the circle. Contemplative practices render no circle and keep their order.
  const { fontScale } = useWindowDimensions();
  const axLayout = showBreathingCircle && practiceTimerUsesAxLayout(fontScale);
  const noteText = isContemplative ? CONTEMPLATIVE_NOTE : BREATHING_NOTE;

  // DEBUG-536: `practice_started` fires on the first activation, not on mount —
  // opening the screen is not beginning the practice. `markStarted` is latched, so
  // a resume (and a return from background) does not re-emit.
  const handleToggle = React.useCallback(
    (active: boolean) => {
      if (active) markStarted();
      setIsTimerActive(active);
    },
    [markStarted, setIsTimerActive]
  );

  // Show completion screen after timer finishes
  // DEBUG-643: __DEV__-only check that the cleared control really is clear of the crisis
  // FAB's exclusion region on the running device; undefined in Release.
  const toggleExclusionCheck = useCrisisExclusionAssertion(`${testID}-toggle-button`, 'scrolls');

  const completionScreen = renderCompletion();
  if (completionScreen) {
    return completionScreen;
  }

  // One element, two fixed slots: the toggle moves across the threshold while
  // BreathingCircle and Timer keep their child positions. A remount of either would restart
  // the breath from an inhale (DEBUG-587) or reset the timer; the toggle holds no state.
  const toggle = (
    <PracticeToggleButton
      isActive={isTimerActive}
      elapsedTime={elapsedTime}
      onToggle={handleToggle}
      onLayout={toggleExclusionCheck}
      style={styles.toggleButton}
      testID={`${testID}-toggle-button`}
    />
  );

  return (
    <PracticeScreenLayout
      title={title}
      onBack={onBack || (() => {})}
      // DEBUG-618: the column must scroll. As a plain View, Begin Practice fell below
      // the modal card's clip edge from xxxLarge text up and could not be reached.
      // Clearing the crisis FAB's touch band is the toggle's own style (DEBUG-622).
      scrollable={true}
      overlay={
        shouldPromptHaptics ? <HapticsOptInPrompt onChoose={onChooseHaptics} /> : undefined
      }
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
            showGuidanceCopy={!axLayout}
            testID={`${testID}-breathing-circle`}
          />
          {/* INFRA-373 frame probe. Sibling, not child: it must not enter
              BreathingCircle's memoized subtree, and it measures UI-thread frame
              delivery for the whole screen rather than the circle alone. Ships
              dark — EXPO_PUBLIC_PERF_HUD defaults to 'false', so a build that
              never sets it cannot render this. */}
          {env.EXPO_PUBLIC_PERF_HUD === 'true' && (
            <BreathingFrameProbe testID={`${testID}-frame-probe`} />
          )}
        </View>
      )}

      {/* DEBUG-638: at AX sizes the toggle sits directly under the circle. */}
      {axLayout && toggle}

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
      {!axLayout && toggle}

      {/* Mindfulness Note */}
      <View style={sharedPracticeStyles.noteSection} testID={`${testID}-note`}>
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
  toggleButton: {
    marginBottom: spacing[32],
    // DEBUG-622 (crisis ruling): moves the toggle's OWN FRAME out of the crisis FAB's
    // contested column. PracticeTimer is an immersive route: the FAB renders faded, but
    // a direct tap still navigates at zIndex 9999, so any overlap sends a tap on Begin
    // Practice to CrisisResources. Measured before the fix (DEBUG-563, default text):
    //   402x874  FAB x358-401 y730-774  vs  toggle x24-377.7 y757.3-824.3
    //   390x844  FAB x346-389 y700-744  vs  toggle top y751.3 (12pt hit slop reaches in)
    // HORIZONTAL because the column scrolls (DEBUG-618): the toggle can rest at any y
    // and at any text size, but its x-range is fixed. The criterion is
    // `intersectsCrisisButtonExclusion(...) === false`, which counts the hit slop and
    // clearance, not just the painted FAB. Must NOT be `paddingRight`, which moves the
    // label and leaves the frame in place. Declared LAST: StyleSheet is last-key-wins,
    // so a `marginHorizontal` added below would silently undo it.
    marginRight: CRISIS_BUTTON_EXCLUSION_RECT.left,
  },
});

export default PracticeTimerScreen;
