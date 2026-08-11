/**
 * BreathingCircle Component - 3-Minute Breathing Space
 *
 * PRACTICE SPECIFICATIONS:
 * - 8-second breathing cycle (4s inhale, 4s exhale)
 * - 60fps performance for therapeutic smoothness
 * - Non-directive guidance (follows natural rhythm)
 * - Therapeutic blue-gray (#6B8BA8) - flow-agnostic color
 * - Screen-reader phase cues via AccessibilityInfo.announceForAccessibility
 *   (spoken by VoiceOver/TalkBack when enabled — the app plays no audio itself)
 * - Reduced motion support
 *
 * REDUCED MOTION (MAINT-386)
 * ==========================
 * This component now DETECTS the OS reduce-motion setting itself instead of
 * waiting to be told. Before MAINT-386 the `reducedMotion` prop was the only
 * way in, and the only screen that ever passed it — SharedBreathingScreen — had
 * been dead code since FEAT-298 slice 6c retired its callers. The net effect was
 * that all three live breathing surfaces (PracticeTimerScreen,
 * DailyLoopStepScreen, DailyLoopCompleteScreen) ran an unconditional 1.0 → 1.5
 * scale pulse with no vestibular accommodation at all. Detecting here rather
 * than at each call site means all three inherit it, and any future one does too.
 *
 * That last sentence was ASPIRATIONAL until DEBUG-394, and this header asserted
 * it as fact. MAINT-386 derived `effectiveReducedMotion` correctly and then threw
 * it away: the worklet read a shared value that an effect overwrote with the raw
 * `reducedMotion` prop, which no live caller passes. So the suppression branch
 * never executed on any of the three surfaces, while the phase label and guidance
 * copy — reading `effectiveReducedMotion` directly — correctly reported the
 * accommodation as active. A user with OS reduce-motion on got the full pulse
 * they had asked to avoid AND text telling them it was suppressed. DEBUG-394
 * collapsed the two readers onto one value, so the halves can no longer disagree.
 *
 * The accommodation deliberately is NOT the dead screen's answer. That one
 * swapped the circle for a static glow carrying the word "Breathe" — motion
 * gone, but pacing gone with it, leaving a reduce-motion practitioner sitting
 * untimed with no cue for when to breathe in or out. Here the breath CLOCK keeps
 * running (it is what schedules the phase cues); only its visual expression is
 * suppressed, and the pacing moves into a visible phase label plus the existing
 * spoken announcements. A paced practice stays a paced practice.
 *
 * ONE ENGINE (MAINT-391)
 * ======================
 * There used to be two. A pattern carrying a `hold` selected a nested
 * `setTimeout` chain instead of the Reanimated sequence below. That path was
 * dormant, broken in four separate ways, and untested; MAINT-391 deleted it
 * along with the `hold` field, the countdown display it drove, and the
 * `phaseText.hold` label. This component now paces exactly one shape: a
 * two-phase inhale/exhale pattern, symmetric (4-4) or asymmetric (4-6, the
 * extended-exhale shape). The full ruling — including what reintroducing
 * retention would require — lives in `../breathingPatterns`.
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  runOnJS,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { colorSystem, spacing, typography, borderRadius, semantic } from '@/core/theme';
import { DEFAULT_PATTERN } from '../breathingPatterns';

interface BreathingPattern {
  inhale: number;  // milliseconds
  exhale: number;  // milliseconds
}

interface BreathingCircleProps {
  isActive?: boolean;
  onCycleComplete?: () => void;
  testID?: string;
  reducedMotion?: boolean;
  pattern?: BreathingPattern; // configurable pattern (two-phase only)
  phaseText?: {               // custom phase labels
    inhale?: string;
    exhale?: string;
  };
}

/**
 * Default 4-4 pattern, re-exported for backward compatibility.
 *
 * The definition lives in `../breathingPatterns` since FEAT-285 — screens that
 * render this component without a `pattern` prop build their haptic cue
 * schedule from the same constant, and it must survive this component being
 * mocked in tests.
 */
export { DEFAULT_PATTERN };

// Default phase text (stable reference to prevent re-renders)
const DEFAULT_PHASE_TEXT = {
  inhale: 'Breathe in',
  exhale: 'Breathe out',
};

const BreathingCircle: React.FC<BreathingCircleProps> = ({
  isActive = true,
  onCycleComplete,
  testID = 'breathing-circle',
  reducedMotion = false,
  pattern = DEFAULT_PATTERN,
  phaseText = DEFAULT_PHASE_TEXT,
}) => {
  // High-performance shared values for 60fps animations
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.8);
  const phase = useSharedValue(0); // retained for reset/cancel only (no longer frame-sampled)
  // UI-thread active flag, read inside animation-completion worklets so a
  // callback that resolves after deactivation/unmount does not emit a stray
  // announcement or phantom cycle-complete.
  const activeRef = useSharedValue(false);

  // Cycle counter for completion tracking
  const cycleCountRef = useRef(0);

  /**
   * OS reduce-motion, OR'd with the explicit prop (MAINT-386).
   *
   * The prop stays authoritative when set — a caller that has already decided
   * (or a test) must not be overridden — but the OS switch alone is now enough.
   */
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!cancelled) setSystemReducedMotion(enabled);
    });

    // Listened to, not just read once: a practitioner can flip the switch mid
    // practice precisely BECAUSE the motion is bothering them, and that is the
    // moment the accommodation matters most.
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => setSystemReducedMotion(enabled)
    );

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  const effectiveReducedMotion = reducedMotion || systemReducedMotion;

  /**
   * Visible phase cue — the pacing that replaces the suppressed motion.
   *
   * Only rendered under reduced motion. `announcePhase` is already the single
   * JS-thread funnel every phase transition passes through, so hanging the label
   * off it needs no new timing machinery — and adding one would mean a second
   * clock that could drift from the animation's.
   */
  const [phaseCue, setPhaseCue] = useState<string | null>(null);
  // Read inside `announcePhase` so its identity can stay stable: it sits in the
  // animation effect's dep array, and a new identity restarts the animation.
  // Also keeps the setState off the non-reduced path entirely, where a re-render
  // every cycle leg would be reconciling mid-animation for nothing.
  const reducedMotionRef = useRef(effectiveReducedMotion);
  // Last phase announced, recorded unconditionally (not only under reduced
  // motion) so the visible cue can be seeded the instant suppression turns on.
  const lastPhaseRef = useRef<string | null>(null);
  useEffect(() => {
    const wasReduced = reducedMotionRef.current;
    reducedMotionRef.current = effectiveReducedMotion;
    if (!effectiveReducedMotion) {
      setPhaseCue(null);
      return;
    }
    // false → true (DEBUG-394). `systemReducedMotion` starts false and resolves
    // asynchronously, so the animation effect's immediate first-inhale
    // `announcePhase` has already run with this ref still false and set no cue.
    // That effect deliberately does NOT depend on reduce-motion — depending on
    // it would restart the breath mid-practice — so nothing re-announces until
    // the next leg completes. Without seeding here, a practitioner who has the
    // OS switch on gets a static circle and no pacing text for up to a full
    // inhale, at exactly the moment they are orienting to the practice.
    //
    // Seed SILENTLY: a screen-reader user already heard this phase when it was
    // announced, so re-announcing it here would duplicate it for them.
    if (!wasReduced && lastPhaseRef.current) setPhaseCue(lastPhaseRef.current);
  }, [effectiveReducedMotion]);

  // Screen-reader phase announcements — NOT audio. `announceForAccessibility`
  // hands the string to VoiceOver/TalkBack, so it is heard only when a screen
  // reader is running. Being ships no audio playback at all (no expo-av,
  // expo-audio or expo-speech in app/package.json), so a silent-by-default
  // practitioner gets pacing from the animation and, under reduced motion, from
  // the visible phase label below — never from a sound.
  const announcePhase = useCallback((phaseText: string) => {
    AccessibilityInfo.announceForAccessibility(phaseText);
    lastPhaseRef.current = phaseText;
    if (reducedMotionRef.current) setPhaseCue(phaseText);
  }, []);

  // Handle cycle completion on JS thread
  const handleCycleComplete = useCallback(() => {
    cycleCountRef.current += 1;
    onCycleComplete?.();
  }, [onCycleComplete]);

  // 60fps optimized animation styles using worklets
  const animatedStyle = useAnimatedStyle(() => {
    'worklet';

    if (effectiveReducedMotion) {
      // MAINT-386: motion fully suppressed, not merely damped.
      //
      // This branch used to return `scale: 1 + (scale.value - 1) * 0.2` — a
      // continuous 1.0 → 1.1 pulse. That was written when nothing could reach
      // this branch (only the dead SharedBreathingScreen passed the prop), so it
      // was never a validated answer; now that the OS switch reaches it on every
      // breathing surface it has to actually be one. A smoothly and continuously
      // scaling 120dp object is the vestibular trigger whether it grows by 50% or
      // by 10%, so the honest reading of the setting is: stop.
      //
      // The underlying `scale` animation keeps running — it is the breath clock
      // that fires the phase-cue callbacks — it just stops being drawn. Pacing is
      // carried by the visible phase label and the spoken announcements instead.
      return {
        transform: [{ scale: 1 }],
        opacity: 0.9,
      };
    }

    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
    // DEBUG-394: the worklet closes over the render-scoped
    // `effectiveReducedMotion` boolean rather than reading a shared value.
    //
    // It used to read an `isReducedMotion` shared value seeded from
    // `effectiveReducedMotion` — but `useSharedValue`'s argument applies only at
    // MOUNT, and an effect then overwrote it with the RAW `reducedMotion` prop,
    // which no live caller passes. So the shared value was `false` forever and
    // this entire branch was unreachable in production, while the phase label
    // and guidance copy below (which read `effectiveReducedMotion` directly)
    // correctly reported the accommodation as active. Two halves, two sources of
    // truth, guaranteed to disagree.
    //
    // One source of truth removes the bug class rather than patching the write:
    // there is no longer a value that CAN go stale. Reanimated re-runs the
    // mapper when a dependency changes, and the boolean is in the dep array.
  }, [scale, opacity, effectiveReducedMotion]);

  useEffect(() => {
    if (!isActive) {
      // Stop all animations and reset to initial state
      activeRef.value = false;
      cancelAnimation(scale);
      cancelAnimation(opacity);
      cancelAnimation(phase);

      scale.value = withTiming(1, { duration: 300 });
      opacity.value = withTiming(0.8, { duration: 300 });
      phase.value = 0;
      return;
    }

    // When becoming active, ensure clean state by canceling any existing animations
    activeRef.value = true;
    cancelAnimation(scale);
    cancelAnimation(opacity);
    cancelAnimation(phase);

    // Two-phase inhale/exhale pattern — the only engine (MAINT-391). Scale
    // expands over `inhale` then contracts over `exhale`, repeating seamlessly:
    // no inter-cycle gap, which is what lets `haptics/phaseAtElapsed` model the
    // cue timeline as plain (inhale + exhale) arithmetic. Completion callbacks
    // on each leg drive the accessibility announcements and fire
    // `handleCycleComplete` exactly once per cycle — replacing the old per-frame
    // phase sampling, which could double-fire cycle-complete and used
    // float-equality phase checks that rarely matched. `activeRef` guards
    // against a callback resolving after deactivation (cancelAnimation invokes
    // the callback with finished=false).
    const inhaleLabel = phaseText.inhale || 'Breathe in';
    const exhaleLabel = phaseText.exhale || 'Breathe out';

    scale.value = withRepeat(
      withSequence(
        withTiming(
          1.5,
          { duration: pattern.inhale, easing: Easing.inOut(Easing.ease) },
          (finished) => {
            'worklet';
            // Contraction begins → announce exhale.
            if (finished && activeRef.value) {
              runOnJS(announcePhase)(exhaleLabel);
            }
          }
        ),
        withTiming(
          1,
          { duration: pattern.exhale, easing: Easing.inOut(Easing.ease) },
          (finished) => {
            'worklet';
            // Cycle end → count it once, then cue the next inhale (the repeat
            // loops straight into the next expansion).
            if (finished && activeRef.value) {
              runOnJS(handleCycleComplete)();
              runOnJS(announcePhase)(inhaleLabel);
            }
          }
        )
      ),
      -1,
      false
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: pattern.inhale, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.8, { duration: pattern.exhale, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // Immediate first inhale cue on activation (subsequent inhale cues come
    // from the exhale-leg completion callback above).
    announcePhase(inhaleLabel);

    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      cancelAnimation(phase);
    };
  }, [isActive, pattern, scale, opacity, phase, activeRef, announcePhase, handleCycleComplete, phaseText]);

  return (
    <View style={styles.container} testID={testID}>
      {/* Main breathing circle */}
      <Animated.View
        style={[styles.breathingCircle, animatedStyle]}
        accessibilityRole="image"
        accessibilityLabel="Breathing guide circle"
        accessibilityHint="Follow the expanding and contracting circle to guide your breathing. Each phase change is announced."
      >
        {/* Inner circle for visual depth */}
        <View style={styles.innerCircle} />
      </Animated.View>

      {/* Guidance text */}
      <View style={styles.guidanceContainer}>
        {/*
          Visible phase cue — the pacing that replaces suppressed motion
          (MAINT-386). Rendered ONLY under reduced motion: with the circle
          static, this label and the spoken announcement are the only things
          carrying the rhythm, so without it a reduce-motion practitioner gets
          an untimed sit. That is the defect the dead SharedBreathingScreen's
          own treatment had, and the reason its branch was not copied verbatim.

          `accessibilityElementsHidden` / `importantForAccessibility="no-hide-
          descendants"`: `announcePhase` already pushes each transition through
          the screen-reader announcement queue, so exposing this text as well
          would double every phase for a VoiceOver/TalkBack user.

          Colour is `semantic.text.primary` (base.black, 21:1 on white). The
          dead screen tinted its equivalent text with the flow theme at 0.3
          container opacity, which multiplied through to the glyphs and landed
          at ~1.9:1 — a 1.4.3 failure that DEBUG-364 had to pin. Do not
          reintroduce a themed colour or a container opacity here.
        */}
        {effectiveReducedMotion && phaseCue && (
          <Text
            style={styles.phaseCueText}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            testID={testID ? `${testID}-phase-cue` : undefined}
          >
            {phaseCue}
          </Text>
        )}
        <Text style={styles.guidanceText}>
          {/*
            DEBUG-394: this read 'Each phase change is announced as it happens'.
            "Announced" describes `announceForAccessibility`, which only
            VoiceOver/TalkBack speak — and Being ships no audio playback at all.
            Reduce-motion is a vestibular/migraine setting, so the MODAL user of
            this branch is sighted with no screen reader, and for them the
            sentence was simply false: nothing is announced, they get the silent
            text label above. Copy here must be true for every user regardless of
            assistive tech; a screen-reader user additionally hears it.
          */}
          {effectiveReducedMotion
            ? 'Each phase change is shown above as it happens'
            : 'Follow the circle as it expands and contracts'
          }
        </Text>
        <Text style={styles.instructionText}>
          Let your breath find its natural rhythm
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[32],
  },
  breathingCircle: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.full,
    backgroundColor: colorSystem.therapeutic.breathing, // #6B8BA8 - flow-agnostic
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colorSystem.therapeutic.breathing,
    shadowOffset: {
      width: 0,
      height: spacing[4],
    },
    shadowOpacity: 0.3,
    shadowRadius: spacing[8],
    elevation: 8,
  },
  innerCircle: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colorSystem.therapeutic.breathingLight, // #8EAFC9 - flow-agnostic
    opacity: 0.6,
  },
  guidanceContainer: {
    marginTop: spacing[56], // Extra space to account for circle expansion (1.5x scale adds 30px to bottom)
    alignItems: 'center',
    paddingHorizontal: spacing[24],
  },
  phaseCueText: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    // base.black on the default white surface = 21:1. See the render-site
    // comment: the branch this replaces failed 1.4.3 at ~1.9:1 because a themed
    // colour was composited under a 0.3 container opacity.
    color: semantic.text.primary,
    textAlign: 'center',
    marginBottom: spacing[8],
  },
  guidanceText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: semantic.text.primary,
    textAlign: 'center',
    marginBottom: spacing[8],
    lineHeight: 22,
  },
  instructionText: {
    fontSize: typography.caption.size,
    color: semantic.text.secondary,
    textAlign: 'center',
    lineHeight: spacing[24],
    fontStyle: 'italic',
  },
});

// Memoized: props are stable during a session (isActive flips only on
// start/pause; pattern/phaseText are module constants for the default callers),
// so a parent re-render no longer reconciles the breathing circle.
export default React.memo(BreathingCircle);