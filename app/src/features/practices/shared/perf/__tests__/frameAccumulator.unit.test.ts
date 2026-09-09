/**
 * frameAccumulator — the pure half of the INFRA-373 frame probe.
 *
 * This exists so the arithmetic is provable on CI without a handset. The probe
 * component itself cannot be: the reanimated jest mock deliberately never
 * invokes the frame callback, because a mock that fired it would assert a frame
 * cadence jest cannot have. So the hook stays untested here and the maths is
 * tested exhaustively, which is the honest split.
 *
 * Streams are synthetic and exact. Real device intervals jitter — the measured
 * run on the iPhone 16e gave min 16.42 / mean 16.66 / max 16.67 — so the
 * jitter cases below are modelled on that rather than invented.
 */

import {
  GAP_THRESHOLD_MS,
  accumulateFrame,
  createFrameAccumulator,
  summarizeFrames,
} from '../frameAccumulator';

/** Feed a stream of intervals into a fresh accumulator. */
function accumulate(intervals: Array<number | null>): ReturnType<typeof createFrameAccumulator> {
  const state = createFrameAccumulator();
  for (const dt of intervals) {
    accumulateFrame(state, dt);
  }
  return state;
}

/** n intervals of exactly `ms`. */
function steady(n: number, ms: number): number[] {
  return Array.from({ length: n }, () => ms);
}

const MS_60HZ = 1000 / 60; // 16.666…
const MS_120HZ = 1000 / 120; // 8.333…

describe('frameAccumulator — nominal interval derivation', () => {
  it('derives a 60Hz nominal from a steady 60Hz stream', () => {
    const summary = summarizeFrames(accumulate(steady(600, MS_60HZ)));

    expect(summary.frames).toBe(600);
    expect(summary.nominalMs).toBeCloseTo(MS_60HZ, 2);
    expect(summary.droppedFrames).toBe(0);
    expect(summary.droppedRatio).toBe(0);
  });

  it('derives a 120Hz nominal from a steady 120Hz stream', () => {
    const summary = summarizeFrames(accumulate(steady(1200, MS_120HZ)));

    expect(summary.nominalMs).toBeCloseTo(MS_120HZ, 2);
    expect(summary.droppedFrames).toBe(0);
  });

  // The correction that motivated this module. INFRA-309's AC said the nominal
  // was derivable from "the accumulated min/modal interval". On the 16e the
  // measured min was 16.42 against a true nominal of 16.67 — some frames land
  // early — so min is biased LOW. Normalising against it inflates every dropped
  // -frame ratio, i.e. it makes the budget look worse than reality, which is the
  // direction that gets a threshold loosened on first red.
  it('does NOT use the minimum as the nominal when frames arrive early', () => {
    const summary = summarizeFrames(
      accumulate([...steady(590, MS_60HZ), ...steady(10, 16.42)])
    );

    expect(summary.minMs).toBeCloseTo(16.42, 2);
    expect(summary.nominalMs).toBeGreaterThan(summary.minMs);
    expect(summary.nominalMs).toBeCloseTo(MS_60HZ, 1);
  });
});

describe('frameAccumulator — dropped frames', () => {
  it('counts a doubled interval as exactly one dropped frame', () => {
    const summary = summarizeFrames(
      accumulate([...steady(100, MS_60HZ), MS_60HZ * 2, ...steady(100, MS_60HZ)])
    );

    expect(summary.droppedFrames).toBe(1);
  });

  it('counts a quadrupled interval as three dropped frames', () => {
    const summary = summarizeFrames(
      accumulate([...steady(100, MS_60HZ), MS_60HZ * 4, ...steady(100, MS_60HZ)])
    );

    expect(summary.droppedFrames).toBe(3);
  });

  it('reports a ratio against delivered + dropped, not against delivered alone', () => {
    // 99 good intervals + 1 doubled = 100 delivered, 1 dropped, 101 expected.
    const summary = summarizeFrames(
      accumulate([...steady(99, MS_60HZ), MS_60HZ * 2])
    );

    expect(summary.frames).toBe(100);
    expect(summary.droppedFrames).toBe(1);
    expect(summary.droppedRatio).toBeCloseTo(1 / 101, 5);
  });

  it('is unaffected by jitter that stays inside one frame interval', () => {
    const jittered = [16.42, 16.66, 16.67, 16.5, 16.7, 16.61];
    const summary = summarizeFrames(accumulate(Array.from({ length: 100 }, (_, i) => jittered[i % jittered.length]!)));

    expect(summary.droppedFrames).toBe(0);
  });
});

describe('frameAccumulator — first frame and background gaps', () => {
  it('does not count a null first frame as an interval, but records it', () => {
    const summary = summarizeFrames(accumulate([null, ...steady(60, MS_60HZ)]));

    expect(summary.nullFirstFrame).toBe(true);
    expect(summary.frames).toBe(60);
    // A null counted as zero would drag the mean down by one frame's worth.
    expect(summary.meanMs).toBeCloseTo(MS_60HZ, 2);
  });

  it('reports nullFirstFrame false when every interval is real', () => {
    expect(summarizeFrames(accumulate(steady(10, MS_60HZ))).nullFirstFrame).toBe(false);
  });

  // A five-minute background is not 18,000 dropped frames. Attributing a
  // suspend to the animation would make any budget unmeetable and untrue.
  it('excludes a background gap instead of counting it as dropped frames', () => {
    const summary = summarizeFrames(
      accumulate([...steady(300, MS_60HZ), 300_000, ...steady(300, MS_60HZ)])
    );

    expect(summary.gapCount).toBe(1);
    expect(summary.droppedFrames).toBe(0);
    expect(summary.frames).toBe(600);
    expect(summary.maxMs).toBeCloseTo(MS_60HZ, 2);
  });

  it('treats an interval just over the gap threshold as a gap, and just under as dropped frames', () => {
    const over = summarizeFrames(
      accumulate([...steady(60, MS_60HZ), GAP_THRESHOLD_MS + 1])
    );
    const under = summarizeFrames(
      accumulate([...steady(60, MS_60HZ), GAP_THRESHOLD_MS - 1])
    );

    expect(over.gapCount).toBe(1);
    expect(over.droppedFrames).toBe(0);

    expect(under.gapCount).toBe(0);
    expect(under.droppedFrames).toBeGreaterThan(0);
  });
});

describe('frameAccumulator — degenerate input', () => {
  it('summarizes an empty window without dividing by zero', () => {
    const summary = summarizeFrames(createFrameAccumulator());

    expect(summary.frames).toBe(0);
    expect(summary.meanMs).toBe(0);
    expect(summary.minMs).toBe(0);
    expect(summary.nominalMs).toBe(0);
    expect(summary.droppedRatio).toBe(0);
  });

  it('ignores non-positive intervals rather than binning them', () => {
    const summary = summarizeFrames(accumulate([0, -5, ...steady(60, MS_60HZ)]));

    expect(summary.frames).toBe(60);
    expect(summary.nominalMs).toBeCloseTo(MS_60HZ, 2);
  });

  it('does not let one absurd interval below the gap threshold define the nominal', () => {
    const summary = summarizeFrames(accumulate([...steady(600, MS_60HZ), 900]));

    expect(summary.nominalMs).toBeCloseTo(MS_60HZ, 1);
  });
});
