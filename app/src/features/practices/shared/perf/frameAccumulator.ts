/**
 * frameAccumulator — pure frame-interval statistics for the INFRA-373 probe.
 *
 * Separated from the probe component so the arithmetic is provable on CI without
 * a handset. Every function here is `'worklet'`-annotated: accumulation runs on
 * the UI thread inside a `useFrameCallback` body, and a worklet may only call
 * other worklets. The annotations are inert string directives under jest, which
 * is what makes the same code testable in both places.
 *
 * NO ALLOCATION AND NO BRANCHING ON DERIVED STATE PER FRAME. `accumulateFrame`
 * does a bounded amount of scalar arithmetic and one array increment. Everything
 * that needs the whole distribution — the nominal interval, the dropped-frame
 * count — is deferred to `summarizeFrames`, which runs once at window close.
 * That split is not tidiness: the probe perturbs what it measures, so per-frame
 * work is the one cost that corrupts the reading rather than merely slowing it.
 *
 * THE NOMINAL IS THE MODE, NEVER THE MINIMUM (measured, INFRA-373).
 * INFRA-309's AC said the device's nominal interval was derivable from "the
 * accumulated min/modal interval". The measured run on the iPhone 16e gave
 * min 16.42 against a true nominal of 16.67 — frames land early — so the minimum
 * is biased LOW. Normalising against it inflates every dropped-frame ratio, in
 * the direction that makes the budget look worse than reality and gets a
 * threshold loosened on first red. Mean and max are no better: on a hitching run
 * the mean drags up and the max IS the worst hitch. The mode is the only one of
 * the four that survives all three cases, so it is the only one used.
 */

/**
 * Intervals at or above this are treated as a suspend, not as dropped frames.
 *
 * A five-minute background is not 18,000 dropped frames. `usePracticeHaptics`
 * re-anchors its session origin across AppState changes for the same reason —
 * attributing a suspend to the animation makes any budget both unmeetable and
 * untrue.
 */
export const GAP_THRESHOLD_MS = 1000;

/** One 1 ms bin per millisecond below the gap threshold. */
const BIN_COUNT = GAP_THRESHOLD_MS;

export interface FrameAccumulatorState {
  /** Non-null, positive, non-gap intervals observed. */
  frames: number;
  sumMs: number;
  minMs: number;
  maxMs: number;
  /** Whether a `timeSincePreviousFrame === null` frame was seen. */
  nullFirstFrame: boolean;
  /** Intervals at or above GAP_THRESHOLD_MS, excluded from every statistic. */
  gapCount: number;
  gapMs: number;
  /** Histogram of interval magnitudes, indexed by floor(ms). */
  binCounts: number[];
  /** Sum of the intervals falling in each bin, for a precise modal centre. */
  binSums: number[];
}

export interface FrameWindowSummary {
  frames: number;
  /** Wall time inside the window, gaps excluded. */
  elapsedMs: number;
  /** Device refresh interval, derived from the modal bin. 0 when no frames. */
  nominalMs: number;
  meanMs: number;
  minMs: number;
  maxMs: number;
  droppedFrames: number;
  /** dropped / (delivered + dropped). 0 when no frames. */
  droppedRatio: number;
  gapCount: number;
  nullFirstFrame: boolean;
}

export function createFrameAccumulator(): FrameAccumulatorState {
  'worklet';
  const binCounts: number[] = [];
  const binSums: number[] = [];
  for (let i = 0; i < BIN_COUNT; i += 1) {
    binCounts.push(0);
    binSums.push(0);
  }
  return {
    frames: 0,
    sumMs: 0,
    minMs: 0,
    maxMs: 0,
    nullFirstFrame: false,
    gapCount: 0,
    gapMs: 0,
    binCounts,
    binSums,
  };
}

/**
 * Fold one frame into the accumulator. Mutates in place — this runs per frame,
 * and returning a new object would allocate on the UI thread every frame.
 *
 * `null` is the first frame of a callback registration: an interval that does
 * not exist, not an interval of zero. Counting it as zero would drag the mean
 * down by one frame's worth on every window.
 */
export function accumulateFrame(
  state: FrameAccumulatorState,
  timeSincePreviousFrame: number | null
): void {
  'worklet';
  if (timeSincePreviousFrame === null) {
    state.nullFirstFrame = true;
    return;
  }
  const dt = timeSincePreviousFrame;
  if (!(dt > 0)) {
    // Non-positive intervals are not physical. Binning them would put mass at
    // bin 0 and could hand the mode to a value no display can produce.
    return;
  }
  if (dt >= GAP_THRESHOLD_MS) {
    state.gapCount += 1;
    state.gapMs += dt;
    return;
  }

  state.frames += 1;
  state.sumMs += dt;
  if (state.frames === 1 || dt < state.minMs) {
    state.minMs = dt;
  }
  if (dt > state.maxMs) {
    state.maxMs = dt;
  }

  const bin = Math.floor(dt);
  state.binCounts[bin] = (state.binCounts[bin] ?? 0) + 1;
  state.binSums[bin] = (state.binSums[bin] ?? 0) + dt;
}

/**
 * Close the window and derive the statistics that need the whole distribution.
 *
 * Dropped frames are counted per bin rather than per frame: an interval of
 * k x nominal represents k - 1 frames the display did not get. Ties round to
 * nearest, so jitter inside one interval never registers as a drop.
 */
export function summarizeFrames(state: FrameAccumulatorState): FrameWindowSummary {
  'worklet';
  const empty = state.frames === 0;

  let modalBin = -1;
  let modalCount = 0;
  for (let b = 0; b < BIN_COUNT; b += 1) {
    const c = state.binCounts[b] ?? 0;
    // Strictly greater, so a tie keeps the LOWER bin: the nominal is the fastest
    // cluster the display sustains, not the slowest one tied with it.
    if (c > modalCount) {
      modalCount = c;
      modalBin = b;
    }
  }

  const nominalMs =
    modalBin >= 0 && modalCount > 0 ? (state.binSums[modalBin] ?? 0) / modalCount : 0;

  let droppedFrames = 0;
  if (nominalMs > 0) {
    for (let b = 0; b < BIN_COUNT; b += 1) {
      const c = state.binCounts[b] ?? 0;
      if (c === 0) {
        continue;
      }
      const binMean = (state.binSums[b] ?? 0) / c;
      const framesWorth = Math.round(binMean / nominalMs);
      if (framesWorth > 1) {
        droppedFrames += c * (framesWorth - 1);
      }
    }
  }

  const expected = state.frames + droppedFrames;

  return {
    frames: state.frames,
    elapsedMs: state.sumMs,
    nominalMs,
    meanMs: empty ? 0 : state.sumMs / state.frames,
    minMs: empty ? 0 : state.minMs,
    maxMs: empty ? 0 : state.maxMs,
    droppedFrames,
    droppedRatio: expected === 0 ? 0 : droppedFrames / expected,
    gapCount: state.gapCount,
    nullFirstFrame: state.nullFirstFrame,
  };
}
