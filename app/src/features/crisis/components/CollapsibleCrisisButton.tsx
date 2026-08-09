/**
 * CRISIS BUTTON COMPONENT
 *
 * Always-present crisis support button:
 * - Small red lifebuoy icon pinned to the screen edge
 * - Single tap goes straight to CrisisResourcesScreen (<3s / <3 taps to 988)
 * - <200ms response time for crisis action
 * - VoiceOver/TalkBack accessibility
 * - Voice command support
 *
 * DEBUG-299 — SWIPE-TO-EXPAND WAS REMOVED. DO NOT REINTRODUCE A GESTURE HERE.
 *
 * The component previously carried a `Gesture.Pan()` swipe that revealed a
 * wider "Get Support" label. It shipped a defect that removed 988 access
 * app-wide: the pan was constructed near the top of the component while its
 * `onUpdate`/`onEnd` worklets closed over `collapsedWidth`, declared ~80 lines
 * below. Reanimated's babel plugin serializes a worklet's `_closure` EAGERLY at
 * the construction site, so the worklets captured `undefined` — and since
 * TypeScript's `const` is down-levelled to `var`, there was no TDZ error to
 * surface it. `Math.max(-260 + undefined, ...)` produced NaN, which reached the
 * style as `transform: [{ translateX: NaN }]`. On iOS/Fabric a NaN transform
 * yields a layer that is neither drawn nor hit-testable: the button became
 * invisible AND inert, throwing nothing. MAINT-290's single root mount never
 * unmounts, so one NaN persisted across every screen for the whole session —
 * the reported "it disappeared, and is now not active anywhere."
 *
 * Two independent reasons the affordance is gone rather than repaired:
 *   1. The pan winning the touch is what CANCELLED the child Pressable, so a
 *      tap with any finger drift produced no navigation at all. Keeping it
 *      would make gesture-activation distance a safety tuning parameter on the
 *      988 path.
 *   2. It was the sole consumer of the defective clamp arithmetic, and it only
 *      ever revealed a label the collapsed tap already reaches.
 * Deleting it removes the failure class instead of narrowing it.
 *
 * Pinned by `__tests__/safety/crisisButtonGestureState.regression.test.tsx`
 * (runs in `npm run precommit` via `test:safety`), which asserts no pan gesture
 * is registered and that no shared value can drive the style non-finite. That
 * file carries FILE-LOCAL reanimated/gesture-handler mocks on purpose: the
 * global stubs in `__tests__/setup/jest.setup.js` never invoke gesture
 * callbacks, which is why the suite was blind to this for two releases.
 *
 * ACCESSIBILITY (MAINT-127):
 * - Reduced-motion: 100% opacity always (no fade)
 * - 44x44pt hit area ALWAYS active, even in faded state
 * - Direct tap on faded button works immediately
 * - Contrast ratio >= 3:1 for faded state
 * - VoiceOver: Custom accessibility actions
 * - Voice control: "crisis help" command
 * - Motor: Large touch targets, no complex gestures required
 *
 * MODES:
 * - 'standard': 44px, persistent, full opacity (Learn, check-ins)
 * - 'immersive': 44px, starts faded (50%), tap reveals briefly (practices)
 * - 'prominent': 56px, full emphasis (assessments, PHQ>=15)
 *
 * Usage:
 * ```tsx
 * <CollapsibleCrisisButton
 *   mode="immersive"
 *   onNavigate={() => navigation.navigate('CrisisResources')}
 *   testID="crisis-button"
 * />
 * ```
 */

import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  AccessibilityInfo,
  AppState,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
// Eager import, deliberately — the crisis path never lazy-imports (CLAUDE.md).
// Sentry itself is no longer imported here: all crisis-tap telemetry moved into
// crisisTapTrace so that no telemetry code can sit upstream of the dial.
import { beginCrisisTap } from '@/features/crisis/services/crisisTapTrace';
import { borderRadius, colorSystem } from '@/core/theme';

/** Display mode for the crisis button */
export type CrisisButtonMode = 'standard' | 'immersive' | 'prominent';

interface CollapsibleCrisisButtonProps {
  /** Navigation callback - navigates to CrisisResourcesScreen */
  onNavigate: () => void;

  /** Display mode */
  mode?: CrisisButtonMode;

  /** Position on screen (right or left for one-handed mode) */
  position?: 'right' | 'left';

  /** Test ID for testing */
  testID?: string;
}

// Mode-dependent button sizes (crisis-agent validated)
// Standard/Immersive: 44px - WCAG 2.5.5 minimum visible target (was 40px relying
// on hitSlop, which met functional but not visual requirement)
// Prominent: 56px - 40% larger for assessments (PHQ>=15)
const COLLAPSED_WIDTH_STANDARD = 44;
const COLLAPSED_WIDTH_PROMINENT = 56;

// Fade configuration for immersive mode
const FADED_OPACITY = 0.5; // 50% opacity minimum for 3:1+ contrast
const FADE_DURATION_MS = 300;
const FADE_BACK_DELAY_MS = 3000; // Re-fade after interaction

/**
 * Collapsible crisis button component
 */
export const CollapsibleCrisisButton: React.FC<CollapsibleCrisisButtonProps> = ({
  onNavigate,
  mode = 'standard',
  position = 'right',
  testID = 'collapsible-crisis-button',
}) => {
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const fadeOpacity = useSharedValue(1);

  // DEBUG-299: declared FIRST, above every consumer. The original defect was a
  // closure capturing these before their initializer ran. Nothing in this file
  // may read a mode-derived size before this point.
  //
  // Standard/Immersive: 44px (WCAG 2.5.5 minimum visible target)
  // Prominent: 56px (assessments, PHQ>=15)
  const collapsedWidth =
    mode === 'prominent' ? COLLAPSED_WIDTH_PROMINENT : COLLAPSED_WIDTH_STANDARD;
  const iconSize = mode === 'prominent' ? 32 : 24;

  /**
   * ACCESSIBILITY: Check reduced-motion preference
   * Users with reduced-motion enabled see 100% opacity always (no fade)
   */
  useEffect(() => {
    const checkReduceMotion = async () => {
      try {
        const enabled = await AccessibilityInfo.isReduceMotionEnabled();
        setReduceMotionEnabled(enabled);
      } catch {
        // DEBUG-341 — FAIL OPEN. This used to default to `false`, which meant an
        // errored or unavailable accessibility read left the button in its FADED
        // immersive state. A predicate that can dim the crisis button must resolve
        // toward SHOWING it fully when its input is unknown, not toward hiding it.
        //
        // `true` here means "treat as reduce-motion", which is the safe direction: it
        // skips the fade entirely and renders at full opacity. The MAINT-127 immersive
        // fade is an accepted tradeoff only when we KNOW the user has not asked for
        // reduced motion; on an unknown, full visibility wins.
        setReduceMotionEnabled(true);
      }
    };

    checkReduceMotion();

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled: boolean) => {
        setReduceMotionEnabled(enabled);
        // Restore full opacity when reduce-motion enabled
        if (enabled) {
          fadeOpacity.value = 1;
        }
      }
    );

    return () => subscription?.remove();
  }, [fadeOpacity]);

  /**
   * IMMERSIVE MODE: Start already faded for minimal distraction
   * Button remains visible but subtle during mindful practices
   * Tapping restores full visibility temporarily
   */
  useEffect(() => {
    if (mode !== 'immersive' || reduceMotionEnabled) {
      // Full opacity in non-immersive modes or for accessibility
      fadeOpacity.value = withTiming(1, { duration: FADE_DURATION_MS / 2 });
      return;
    }

    // Start faded immediately - no jarring transition during practice
    fadeOpacity.value = withTiming(FADED_OPACITY, { duration: FADE_DURATION_MS });
  }, [mode, reduceMotionEnabled, fadeOpacity]);

  /**
   * DEBUG-299 — in-session self-heal.
   *
   * The original AC asked for a rehydrate migration so already-broken installs
   * recover on upgrade. That premise was wrong: there is no persisted `crisis`
   * store in this repo (the only `persist()` call is assessmentStore), so no
   * stored flag can render this button absent or inert and there is nothing to
   * migrate. The stuck state was an in-memory shared value, which is why the
   * meaningful equivalent is an in-session reset rather than a persistence
   * change.
   *
   * Restoring on foreground is belt-and-braces alongside the style guard below:
   * if any future animation writes a non-finite opacity, this returns the
   * button to fully visible the next time the user comes back to the app.
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && !Number.isFinite(fadeOpacity.value)) {
        fadeOpacity.value = 1;
      }
    });

    return () => subscription?.remove();
  }, [fadeOpacity]);

  /**
   * Reset fade on interaction, then auto-fade back in immersive mode
   */
  const resetFade = useCallback(() => {
    if (mode === 'immersive' && !reduceMotionEnabled) {
      // Brief full visibility on interaction
      fadeOpacity.value = withTiming(1, { duration: FADE_DURATION_MS / 2 });
      // Auto-fade back after brief delay
      setTimeout(() => {
        fadeOpacity.value = withTiming(FADED_OPACITY, { duration: FADE_DURATION_MS });
      }, FADE_BACK_DELAY_MS);
    }
  }, [mode, reduceMotionEnabled, fadeOpacity]);

  /**
   * CRITICAL: <200ms crisis response - navigate to CrisisResourcesScreen
   * Direct tap works immediately, even in faded state
   */
  const handleCrisisAction = useCallback(() => {
    // ORDERING IS THE SAFETY CONTRACT HERE (INFRA-297). Do not reorder.
    //
    // `onNavigate()` used to be called from INSIDE a `Sentry.startSpan` callback.
    // `startSpan` does real work before it invokes that callback — async-context
    // strategy dispatch, a scope fork, a sampling decision, span creation. If any
    // of it throws, the callback never runs and the crisis tap produces NOTHING:
    // no navigation, no dial, and no log, because the audit call was inside the
    // same callback. On the CrisisErrorBoundary path that is the last-resort
    // tel:988 dial in an already-crashed app — the one context where Sentry is
    // itself a likely cause of the crash.
    //
    // A try/catch around the span does NOT fix that: it turns a visible crash
    // into a silently swallowed tap, which is worse. So the navigate is moved
    // out of the callback entirely, and telemetry is strictly downstream.
    // Pinned by __tests__/safety/crisis-button-telemetry-ordering.test.tsx,
    // which asserts ORDER, not just occurrence — occurrence alone would pass a
    // try/catch non-fix.

    // Opens the tap→render measurement. Must precede the navigate (you cannot
    // measure tap→render starting after the navigate). Safe to sit here only
    // because it reads a clock, writes one field, schedules a timer, and is
    // internally guarded so it cannot throw. Do not add anything to it.
    beginCrisisTap('crisis_button');

    // THE CRISIS ACTION. First, unconditional, synchronous, outside every
    // telemetry construct. Navigates to CrisisResourcesScreen (choice of Call
    // 988, Text 741741, emergency contacts) — or, on the error-boundary mount,
    // dials 988 directly.
    onNavigate();

    // Cosmetic only, and therefore after. Nothing may run ahead of the crisis
    // action for the sake of a fade animation.
    resetFade();

    // No telemetry here by design. The measurement closes at the point the user
    // can actually act — CrisisResourcesScreen's commit, or the OS taking the
    // dial — which also moves the span and log work off this tap frame entirely.
    // Net effect: this path is now faster than before, not slower.
  }, [onNavigate, resetFade]);

  /**
   * Handle tap - DIRECT ACTION (no double-tap required)
   * In faded state, single tap triggers crisis action immediately
   */
  const handleTap = useCallback(() => {
    resetFade();

    // Direct tap triggers crisis action immediately (navigates to CrisisResourcesScreen)
    // This ensures <3s access even in faded state
    handleCrisisAction();
  }, [resetFade, handleCrisisAction]);

  /**
   * Animated style for the button container (fade only).
   *
   * DEBUG-299 — THE FINITE GUARD IS A SAFETY CONTROL, NOT DEFENSIVE PADDING.
   * A non-finite value reaching a style is what removed 988 access app-wide:
   * on iOS/Fabric such a layer is neither drawn nor hit-testable, so the button
   * goes invisible and inert without throwing. The guard sits HERE, at the
   * useAnimatedStyle boundary, rather than only at the assignment sites, so
   * that a future arithmetic or closure-capture bug anywhere upstream still
   * cannot blank the crisis button.
   *
   * It fails OPEN — a corrupt value renders fully visible, never hidden. Every
   * predicate on this component's visibility must default to SHOWING it.
   *
   * There is no `transform` here any more. The only shared value that reaches
   * a style is opacity, and swipe-to-expand is gone (see the header).
   */
  const animatedStyle = useAnimatedStyle(() => {
    const opacity = fadeOpacity.value;
    return {
      opacity: Number.isFinite(opacity) ? opacity : 1,
    };
  });

  /**
   * Handle accessibility actions
   */
  // DEBUG-299: the 'expand' action was dropped alongside swipe-to-expand. It
  // only ever revealed the "Get Support" label, which 'activate' reaches
  // directly — so VoiceOver users lose no capability, and an action that
  // expanded nothing would be worse than none.
  const accessibilityActions = [
    {
      name: 'activate' as const,
      label: 'I need support',
    },
  ];

  const onAccessibilityAction = useCallback(
    (event: { nativeEvent: { actionName: string } }) => {
      switch (event.nativeEvent.actionName) {
        case 'activate':
          handleCrisisAction();
          break;
      }
    },
    [handleCrisisAction]
  );

  /**
   * Get mode-specific styling
   */
  const getModeStyles = useCallback(() => {
    switch (mode) {
      case 'prominent':
        return {
          shadowOpacity: 0.6,
          elevation: 12,
        };
      case 'immersive':
        return {
          shadowOpacity: 0.3,
          elevation: 6,
        };
      default:
        return {
          shadowOpacity: 0.4,
          elevation: 8,
        };
    }
  }, [mode]);

  const modeStyles = getModeStyles();

  return (
    <View
      style={[
        styles.container,
        position === 'right' ? styles.containerRight : styles.containerLeft,
      ]}
      pointerEvents="box-none"
    >
      {/* DEBUG-299: no GestureDetector wrapper. Nothing may sit between this
          Pressable and the touch — a gesture recognizer winning the touch is
          what cancelled the crisis press. */}
      <Animated.View style={[styles.buttonContainer, animatedStyle]}>
        <Pressable
          style={[
            styles.iconButton,
            {
              width: collapsedWidth,
              height: collapsedWidth,
              shadowOpacity: modeStyles.shadowOpacity,
              elevation: modeStyles.elevation,
            },
          ]}
          onPress={handleTap}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="I need support"
          accessibilityHint="Tap for immediate access to crisis resources"
          accessibilityActions={accessibilityActions}
          onAccessibilityAction={onAccessibilityAction}
          testID={testID}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <MaterialDesignIcons
            name="lifebuoy"
            size={iconSize}
            color={colorSystem.base.white}
          />
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Container positioning - MAINT-127: Moved to bottom-right (above tab bar)
  container: {
    position: 'absolute',
    bottom: Platform.select({ ios: 100, android: 104 }), // Above tab bar
    zIndex: 9999,
  },
  containerRight: {
    right: 0,
  },
  containerLeft: {
    left: 0,
  },

  // Button container
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Collapsed state: Lifebuoy icon button
  // Note: width/height applied dynamically based on mode
  iconButton: {
    backgroundColor: colorSystem.status.critical,
    borderTopLeftRadius: borderRadius.xxl,
    borderBottomLeftRadius: borderRadius.xxl,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowRadius: 6,
  },

  // DEBUG-299: expandedContent / crisisButton / buttonIcon / crisisButtonText /
  // collapseButton were removed with swipe-to-expand. The collapsed lifebuoy
  // tap reaches CrisisResourcesScreen directly, which is what the expanded
  // "Get Support" button did.
});

export default CollapsibleCrisisButton;
