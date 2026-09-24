/**
 * Reflection Timer Screen - Educational Reflection & Contemplation Exercises
 *
 * Uses shared abstractions:
 * - PracticeScreenLayout: Unified layout wrapper
 * - useTimerPractice: Shared timer state management
 * - sharedPracticeStyles: Reusable layout styles
 *
 * Reuses shared components:
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

import React, { useMemo } from 'react';
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
  semantic,
  spacing,
  typography,
  borderRadius,
  type ModuleId,
} from '@/features/learn/practices/shared/practiceCommon';
import Timer from '@/features/practices/shared/components/Timer';
import { usePracticeHaptics } from '@/features/practices/shared/haptics/usePracticeHaptics';
import { useHapticsOptIn } from '@/features/practices/shared/haptics/useHapticsOptIn';
import { HapticsOptInPrompt } from '@/features/practices/shared/components/HapticsOptInPrompt';
import { intervalSchedule } from '@/features/practices/shared/haptics/cueScheduler';
import { usePracticeSettings } from '@/core/stores/settingsStore';
import { CRISIS_BUTTON_EXCLUSION_RECT } from '@/features/crisis/constants/crisisButtonGeometry';
import { useCrisisExclusionAssertion } from '@/core/hooks/useCrisisExclusionAssertion';

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
  const { renderCompletion, markStarted, markComplete } = usePracticeCompletion({
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
    // FEAT-311: reached only by the timer running out, so an abandoned
    // reflection stays silent.
    onComplete: () => {
      emitSessionEnd();
      markComplete();
    },
  });

  /**
   * Interval haptic cues (FEAT-285).
   *
   * OFF unless the practitioner has separately opted into interval cadence —
   * turning the master haptics toggle on must not, by itself, start pulsing at
   * someone mid-contemplation. Every pulse is identical: no halfway marker, no
   * near-end escalation. An escalating cue turns resting into counting down,
   * which is the opposite of what a reflection timer is for.
   */
  const practiceSettings = usePracticeSettings();
  const intervalCues = useMemo(
    () =>
      practiceSettings?.practiceHapticsInterval === 'minute'
        ? intervalSchedule(duration * 1000, 60_000)
        : [],
    [practiceSettings?.practiceHapticsInterval, duration]
  );

  /**
   * FEAT-311: the session anchors ride the MASTER toggle, NOT the interval
   * opt-in above. Two markers bounding the practice are a different thing from
   * a cadence inside it — the separate interval consent exists so that enabling
   * haptics does not start pulsing at someone mid-contemplation, and that
   * reasoning does not extend to "begun" and "complete".
   *
   * This is also why the anchors cannot ride the scheduler: `intervalCues` is
   * an EMPTY array by default, and the scheduler effect early-returns on it.
   */
  const { emitSessionEnd } = usePracticeHaptics({
    schedule: intervalCues,
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

  return (
    <PracticeScreenLayout
      title={title}
      onBack={onBack || (() => {})}
      scrollable={true}
      overlay={
        shouldPromptHaptics ? <HapticsOptInPrompt onChoose={onChooseHaptics} /> : undefined
      }
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
        onToggle={handleToggle}
        onLayout={toggleExclusionCheck}
        style={styles.toggleButton}
        testID={`${testID}-toggle-button`}
      />
    </PracticeScreenLayout>
  );
};

const styles = StyleSheet.create({
  toggleButton: {
    marginBottom: spacing[32],
    // DEBUG-628 (crisis ruling): moves the toggle's OWN FRAME out of the crisis FAB's
    // contested column, mirroring DEBUG-622 on PracticeTimerScreen. ReflectionTimer is an
    // immersive route: the FAB renders faded, but FADED_OPACITY does not affect hit
    // testing and it still wins at zIndex 9999, so any overlap sends a tap on Begin
    // Practice to CrisisResources.
    // DERIVED, not measured (DEBUG-626 owns the on-device bounds). The toggle is a stretch
    // child of sharedPracticeStyles.content, whose paddingHorizontal is spacing[24], so it
    // spans x=24..W-24; the rect's left is 72. Both are offsets from screen-right, so W
    // cancels and the overlap is 48pt on EVERY viewport:
    //   390x844  toggle x24-366 vs region left 318, y ~679-746 vs band 668-772
    //   402x874  toggle x24-378 vs region left 330, y ~709-776 vs band 698-802
    // HORIZONTAL because the column scrolls (scrollable={true}): the toggle can rest at
    // any y and at any text size, but its x-range is fixed. Must NOT be paddingRight,
    // which moves the label and leaves the frame in place. Declared LAST: StyleSheet is
    // last-key-wins, so a marginHorizontal added below would silently undo it.
    marginRight: CRISIS_BUTTON_EXCLUSION_RECT.left,
  },
  // Screen-specific: Always-visible numbered instructions (unique pattern)
  instructionsSection: {
    marginBottom: spacing[32],
    paddingVertical: spacing[16],
  },
  instructionsLabel: {
    fontSize: typography.caption.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.navigation.learn,
    // DEBUG-639: no `textTransform: 'uppercase'`. It made the literal `Instructions:`
    // a single 13-glyph all-caps token with no internal break opportunity, and at AX5
    // that token exceeds the 342pt line box — so TextKit fell back to a CHARACTER
    // break and rendered `INSTRUCTION` / `S:`. Clamping instead is not available:
    // DEBUG-628 forbids numberOfLines, a fixed height and maxFontSizeMultiplier here.
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
    color: semantic.text.primary,
    textAlign: 'center',
    lineHeight: spacing[24],
    paddingHorizontal: spacing[16],
  },
});

export default ReflectionTimerScreen;
