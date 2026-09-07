/**
 * BreathingFrameProbe — UI-thread frame-delivery probe (INFRA-373, Slice A spike).
 *
 * WHAT THIS MEASURES, AND WHAT IT DOES NOT. `useFrameCallback` ticks once per UI
 * frame regardless of which component animates. Mounted as a sibling, this probe
 * therefore measures *UI-thread frame delivery while its host screen is mounted* —
 * NOT `BreathingCircle` specifically. Do not attribute a result to the breathing
 * animation: `Timer` re-renders at 4 Hz on every screen that mounts the circle, and
 * on `PracticeTimerScreen` the `usePracticeHaptics` cue chain runs alongside.
 * Mislabelling a proxy as the thing itself is the error MAINT-307 had to correct.
 *
 * WHY `PracticeTimerScreen` IS THE HOST. Of the three live `BreathingCircle`
 * mounts it is the only one carrying JS-thread work beyond that shared `Timer`
 * floor — the haptic cue chain, a `setTimeout` re-armed at every breath boundary
 * plus AppState and navigation-blur listeners. FEAT-565 then made that a standing
 * property rather than an accident: haptic cues were DECLINED on the DailyLoop
 * beat by philosopher ruling, so the differential is designed, not incidental.
 *
 * THE ONE JS HOP. Accumulation is entirely in shared values; the probe crosses to
 * JS exactly once, at window close, guarded by `closed`. A per-frame `runOnJS` is
 * the PERF-02 cost deleted in `ff591f3a` and would make the probe a cause of the
 * very hitching it exists to observe.
 *
 * This file is NOT yet in `check-breathing-worklet-purity.js`'s guarded set, and
 * that is deliberate — see the note there. The guard's only escape hatch keys off
 * the HOOK's line and would suppress this whole callback, so listing the file
 * before the companion rule exists would guard nothing while appearing to.
 *
 * NEVER CLOCK THE WINDOW OFF `timeSinceFirstFrame` (measured, INFRA-373).
 * That field is `timestamp - startTime` where `startTime` is per-REGISTRATION,
 * and Reanimated re-registers whenever the callback's identity changes. This
 * screen re-renders 1x/sec — `useTimerPractice` calls `setElapsedTime` on each
 * whole-second `onTick` — so an unmemoized probe had its `startTime` reset every
 * second and a 10 s window never closed, while the shared values (which survive
 * re-registration) went on accumulating. Measured: 708 frames counted, window
 * never closed. Elapsed is therefore summed from `timeSincePreviousFrame` into a
 * shared value, and the component is memoized so the parent's cascade cannot
 * re-register it. The memo is not merely an optimisation: without it the probe is
 * reset by the very JS-thread work it exists to observe.
 *
 * SPIKE SCOPE. This file answers one question: does `useFrameCallback` tick
 * reliably on a Reanimated 4 Release build under the mandatory New Architecture?
 * The accumulator here is deliberately inline and untested. Slice B extracts it
 * into a pure `'worklet'` module with jest coverage of synthetic 120/60 Hz
 * streams, injected hitches, the null first frame and background gaps. Do not
 * build a threshold on these numbers — the nominal interval must be derived from
 * the device's own measured modal interval, and the probe's own per-frame cost
 * must be quantified by the two control runs first.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { runOnJS, useFrameCallback, useSharedValue } from 'react-native-reanimated';

import { semantic, spacing, typography } from '@/core/theme';

/** One closed measurement window. Milliseconds throughout. */
export interface FrameWindowResult {
  /** Frames observed with a non-null inter-frame interval. */
  frames: number;
  /** Wall time from the first frame to window close. */
  windowMs: number;
  /** Mean inter-frame interval. */
  meanMs: number;
  /** Shortest interval seen — the practical estimator of the device's nominal. */
  minMs: number;
  /** Longest interval seen — the worst single hitch. */
  maxMs: number;
  /** Whether a `timeSincePreviousFrame === null` first frame was observed. */
  nullFirstFrame: boolean;
}

/**
 * Window length. Long enough to span several 4-4 breath cycles (8 s + the 100 ms
 * inter-cycle gap) so a boundary-aligned hitch cannot sit entirely outside it.
 */
const WINDOW_MS = 10_000;

/**
 * JS-side backstop, deliberately later than WINDOW_MS.
 *
 * Without it a stalled probe is unattributable: `closed` latches, so "the
 * callback never fired", "it fired but the window never closed" and "it closed
 * and the single runOnJS hop failed" all render identically as a status stuck on
 * `sampling`. A probe that cannot tell no-data from broken-reporting is the same
 * silently-green shape this item exists to eliminate, so the readout says which
 * path produced it. This timer is per-mount, not per-frame — it is not a JS hop
 * on the animation path.
 */
const FORCED_READOUT_MS = 12_000;

interface BreathingFrameProbeProps {
  testID?: string;
}

const BreathingFrameProbe: React.FC<BreathingFrameProbeProps> = ({
  testID = 'breathing-frame-probe',
}) => {
  const [readout, setReadout] = useState<{
    via: 'window' | 'forced';
    result: FrameWindowResult;
  } | null>(null);

  const frames = useSharedValue(0);
  const sumMs = useSharedValue(0);
  const minMs = useSharedValue(Number.POSITIVE_INFINITY);
  const maxMs = useSharedValue(0);
  const sawNullFirst = useSharedValue(false);
  const elapsedMs = useSharedValue(0);
  const closed = useSharedValue(false);

  // First writer wins, so a working window close beats the backstop and the
  // `via` label stays honest about which path actually produced the numbers.
  const report = useCallback(
    (via: 'window' | 'forced') => {
      setReadout((prev) =>
        prev ?? {
          via,
          result: {
            frames: frames.value,
            windowMs: elapsedMs.value,
            meanMs: frames.value > 0 ? sumMs.value / frames.value : 0,
            minMs: Number.isFinite(minMs.value) ? minMs.value : 0,
            maxMs: maxMs.value,
            nullFirstFrame: sawNullFirst.value,
          },
        }
      );
    },
    [frames, sumMs, elapsedMs, minMs, maxMs, sawNullFirst]
  );

  useEffect(() => {
    const handle = setTimeout((): void => report('forced'), FORCED_READOUT_MS);
    return (): void => clearTimeout(handle);
  }, [report]);

  useFrameCallback((frame) => {
    'worklet';
    if (closed.value) {
      return;
    }

    const dt = frame.timeSincePreviousFrame;
    if (dt === null) {
      // Reanimated reports null for the first frame of a callback's life. It is
      // an interval that does not exist, not an interval of zero — counting it
      // would drag the mean down by one frame's worth on every window.
      sawNullFirst.value = true;
    } else {
      frames.value += 1;
      sumMs.value += dt;
      elapsedMs.value += dt;
      if (dt < minMs.value) {
        minMs.value = dt;
      }
      if (dt > maxMs.value) {
        maxMs.value = dt;
      }
    }

    if (elapsedMs.value >= WINDOW_MS) {
      closed.value = true;
      runOnJS(report)('window');
    }
  });

  // Rendered as plain text rather than a formatted overlay: Maestro reads this
  // with `copyTextFrom`, and every decorative character is one more thing for the
  // `${maestro.copiedText}` coercion to trip over.
  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.label} testID={`${testID}-status`}>
        {readout === null ? 'probe: sampling' : `probe: ${readout.via}`}
      </Text>
      {readout !== null && (
        <>
          <Text style={styles.value} testID={`${testID}-frames`}>
            {`frames ${readout.result.frames}`}
          </Text>
          <Text style={styles.value} testID={`${testID}-min-ms`}>
            {`min ${readout.result.minMs.toFixed(2)}`}
          </Text>
          <Text style={styles.value} testID={`${testID}-mean-ms`}>
            {`mean ${readout.result.meanMs.toFixed(2)}`}
          </Text>
          <Text style={styles.value} testID={`${testID}-max-ms`}>
            {`max ${readout.result.maxMs.toFixed(2)}`}
          </Text>
          <Text style={styles.value} testID={`${testID}-null-first`}>
            {`nullFirst ${String(readout.result.nullFirstFrame)}`}
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
