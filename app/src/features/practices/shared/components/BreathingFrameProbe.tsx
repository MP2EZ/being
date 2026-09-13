/**
 * BreathingFrameProbe — UI-thread frame-delivery probe (INFRA-373).
 *
 * WHAT THIS MEASURES, AND WHAT IT DOES NOT. `useFrameCallback` ticks once per UI
 * frame regardless of which component animates. Mounted as a sibling, this probe
 * therefore measures *UI-thread frame delivery while its host screen is mounted* —
 * NOT `BreathingCircle` specifically. Do not attribute a result to the breathing
 * animation: `Timer` re-renders at 4 Hz on every screen that mounts the circle,
 * and on `PracticeTimerScreen` the `usePracticeHaptics` cue chain runs alongside.
 * Mislabelling a proxy as the thing itself is the error MAINT-307 had to correct.
 *
 * WHY `PracticeTimerScreen` IS THE HOST. Of the three live `BreathingCircle`
 * mounts it is the only one carrying JS-thread work beyond that shared `Timer`
 * floor — the haptic cue chain, a `setTimeout` re-armed at every breath boundary
 * plus AppState and navigation-blur listeners. FEAT-565 then made that a standing
 * property rather than an accident: haptic cues were DECLINED on the DailyLoop
 * beat by philosopher ruling, so the differential is designed, not incidental.
 *
 * THE FRAME CALLBACK MAKES NO JS HOP AT ALL. It only folds intervals into shared
 * state. The window is closed by a JS-side timer, which stops the callback and
 * reads the accumulated state directly — so there is no `runOnJS` on the
 * per-frame path to be guarded, skipped, or argued about. An earlier revision
 * closed the window from inside the callback and needed a hop there; that was a
 * shaping mistake, not a limitation of `check-breathing-worklet-purity.js`.
 *
 * NEVER CLOCK THE WINDOW OFF `timeSinceFirstFrame` (measured, INFRA-373).
 * That field is `timestamp - startTime` where `startTime` is per-REGISTRATION,
 * and Reanimated re-registers whenever the callback's identity changes. This
 * screen re-renders 1x/sec — `useTimerPractice` calls `setElapsedTime` on each
 * whole-second `onTick` — so an unmemoized probe had its `startTime` reset every
 * second and a 10 s window never closed, while the shared state (which survives
 * re-registration) went on accumulating. Measured: 708 frames counted, window
 * never closed. Hence the JS-side clock below, and the `React.memo` at the
 * bottom: the memo is not an optimisation, it stops the probe being reset by the
 * very JS-thread cascade it exists to observe.
 *
 * The statistics themselves live in `../perf/frameAccumulator`, which is pure and
 * unit-tested — including the finding that the nominal interval must come from
 * the modal bin and never from the minimum.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';

import { semantic, spacing, typography } from '@/core/theme';

import {
  accumulateFrame,
  createFrameAccumulator,
  summarizeFrames,
  type FrameWindowSummary,
} from '../perf/frameAccumulator';

/**
 * Window length. Long enough to span several 4-4 breath cycles (8 s + the 100 ms
 * inter-cycle gap) so a boundary-aligned hitch cannot sit entirely outside it.
 */
const WINDOW_MS = 10_000;

interface BreathingFrameProbeProps {
  testID?: string;
}

const BreathingFrameProbe: React.FC<BreathingFrameProbeProps> = ({
  testID = 'breathing-frame-probe',
}) => {
  const [summary, setSummary] = useState<FrameWindowSummary | null>(null);

  const state = useSharedValue(createFrameAccumulator());

  const frameCallback = useFrameCallback((frame) => {
    'worklet';
    state.modify((s) => {
      'worklet';
      accumulateFrame(s, frame.timeSincePreviousFrame);
      return s;
    });
  });

  // Held in a ref so the window-close effect does not depend on the callback
  // object's identity. Depending on it would re-arm the timer on every render of
  // a screen that re-renders once a second, and the window would never close —
  // the same failure mode as the timeSinceFirstFrame reset described above,
  // reached by a different route.
  const frameCallbackRef = useRef(frameCallback);
  frameCallbackRef.current = frameCallback;

  const closeWindow = useCallback((): void => {
    frameCallbackRef.current.setActive(false);
    setSummary(summarizeFrames(state.value));
  }, [state]);

  useEffect(() => {
    const handle = setTimeout(closeWindow, WINDOW_MS);
    return (): void => clearTimeout(handle);
  }, [closeWindow]);

  // Plain labelled text rather than a formatted overlay: Maestro reads these with
  // `copyTextFrom`, and every decorative character is one more thing for the
  // maestro.copiedText coercion to trip over.
  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.label} testID={`${testID}-status`}>
        {summary === null ? 'probe: sampling' : 'probe: done'}
      </Text>
      {summary !== null && (
        <>
          <Text style={styles.value} testID={`${testID}-frames`}>
            {`frames ${summary.frames}`}
          </Text>
          <Text style={styles.value} testID={`${testID}-nominal-ms`}>
            {`nominal ${summary.nominalMs.toFixed(2)}`}
          </Text>
          <Text style={styles.value} testID={`${testID}-min-ms`}>
            {`min ${summary.minMs.toFixed(2)}`}
          </Text>
          <Text style={styles.value} testID={`${testID}-max-ms`}>
            {`max ${summary.maxMs.toFixed(2)}`}
          </Text>
          <Text style={styles.value} testID={`${testID}-dropped`}>
            {`dropped ${summary.droppedFrames}`}
          </Text>
          {/* The budget number itself. Reported to 5dp because a ratio that
              rounds to 0.00 at 2dp is indistinguishable from a clean run, and
              "looks clean" is the reading this item exists to stop producing. */}
          <Text style={styles.value} testID={`${testID}-dropped-ratio`}>
            {`ratio ${summary.droppedRatio.toFixed(5)}`}
          </Text>
          <Text style={styles.value} testID={`${testID}-gaps`}>
            {`gaps ${summary.gapCount}`}
          </Text>
          <Text style={styles.value} testID={`${testID}-null-first`}>
            {`nullFirst ${String(summary.nullFirstFrame)}`}
          </Text>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[8],
  },
  label: {
    fontSize: typography.caption.size,
    color: semantic.text.secondary,
  },
  value: {
    fontSize: typography.caption.size,
    color: semantic.text.secondary,
  },
});

export default React.memo(BreathingFrameProbe);
