/**
 * FEAT-285 — breath-phase timing model.
 *
 * `phaseAtElapsed` is the timing authority for haptic cues. It is deliberately
 * INDEPENDENT of the visual animation code so that a cue schedule can be
 * re-derived from a fixed session start instead of accumulating error through a
 * chain of setTimeouts.
 *
 * MAINT-391 removed the breath-retention engine, and with it the 4-4-6 fixture,
 * the `INTER_CYCLE_GAP_MS` constant, and every hold assertion in this file. What
 * those tests were really protecting was that the model tracks the *shape* of
 * the pattern rather than assuming a symmetric one — so the fixture here is now
 * 4-6, the asymmetric extended-exhale shape that survives the deletion and is
 * the only non-default pattern the engine can still be asked to pace. A
 * symmetric-only fixture would let a `cycle = 2 * inhale` regression pass.
 */

import {
  phaseAtElapsed,
  cycleDurationMs,
  boundariesWithin,
  type BreathPattern,
} from '@/features/practices/shared/haptics/phaseAtElapsed';

/** 4-6 — asymmetric extended exhale, the parasympathetic-downregulation shape. */
const PATTERN_46: BreathPattern = { inhale: 4000, exhale: 6000 };
/** 4-4 — PracticeTimerScreen / BreathingCircle's DEFAULT_PATTERN. */
const PATTERN_44: BreathPattern = { inhale: 4000, exhale: 4000 };

describe('cycleDurationMs', () => {
  it('is exactly inhale + exhale — the loop is seamless, with no inter-cycle gap', () => {
    expect(cycleDurationMs(PATTERN_44)).toBe(8000);
  });

  it('follows an asymmetric pattern rather than assuming equal phases', () => {
    expect(cycleDurationMs(PATTERN_46)).toBe(10_000);
  });
});

describe('phaseAtElapsed — 4-6 boundaries', () => {
  it.each([
    [0, 'inhale'],
    [1, 'inhale'],
    [3999, 'inhale'],
    [4000, 'exhale'],
    [9999, 'exhale'],
    // Second cycle begins — no gap, no settling time.
    [10_000, 'inhale'],
    [14_000, 'exhale'],
    [20_000, 'inhale'],
  ])('elapsed %ims -> %s', (elapsed, expected) => {
    expect(phaseAtElapsed(PATTERN_46, elapsed).phase).toBe(expected);
  });

  it('reports the cycle index alongside the phase', () => {
    expect(phaseAtElapsed(PATTERN_46, 0).cycleIndex).toBe(0);
    expect(phaseAtElapsed(PATTERN_46, 9999).cycleIndex).toBe(0);
    expect(phaseAtElapsed(PATTERN_46, 10_000).cycleIndex).toBe(1);
    expect(phaseAtElapsed(PATTERN_46, 20_000).cycleIndex).toBe(2);
  });

  it('reports when the current phase started, in absolute elapsed ms', () => {
    expect(phaseAtElapsed(PATTERN_46, 5000).phaseStartedAtMs).toBe(4000);
    expect(phaseAtElapsed(PATTERN_46, 15_000).phaseStartedAtMs).toBe(14_000);
  });

  it('clamps negative elapsed to the first inhale rather than throwing', () => {
    const result = phaseAtElapsed(PATTERN_46, -500);
    expect(result.phase).toBe('inhale');
    expect(result.cycleIndex).toBe(0);
    expect(result.phaseStartedAtMs).toBe(0);
  });
});

describe('phaseAtElapsed — the symmetric default', () => {
  it('alternates inhale/exhale on the 4 s boundaries', () => {
    expect(phaseAtElapsed(PATTERN_44, 3999).phase).toBe('inhale');
    expect(phaseAtElapsed(PATTERN_44, 4000).phase).toBe('exhale');
    expect(phaseAtElapsed(PATTERN_44, 8000).phase).toBe('inhale');
  });
});

describe('boundariesWithin — drift over a simulated 60 s session', () => {
  const SESSION_MS = 60_000;

  it('enumerates every phase boundary in a 60 s 4-6 session', () => {
    const boundaries = boundariesWithin(PATTERN_46, SESSION_MS);

    // Cycles open at 0/10000/20000/30000/40000/50000, each with its exhale
    // 4000 ms in. Cycle 6 would open at 60000, which is the session end, so 12
    // boundaries land inside.
    expect(boundaries.map((b) => b.atMs)).toEqual([
      0, 4000, 10_000, 14_000, 20_000, 24_000, 30_000, 34_000, 40_000, 44_000,
      50_000, 54_000,
    ]);
    expect(boundaries[0].phase).toBe('inhale');
    expect(boundaries[1].phase).toBe('exhale');
    expect(boundaries[2].phase).toBe('inhale');
  });

  it('has ZERO cumulative drift at the final boundary (budget is < 50 ms)', () => {
    const boundaries = boundariesWithin(PATTERN_46, SESSION_MS);
    const last = boundaries[boundaries.length - 1];

    // Analytic position of that same boundary, computed independently of the
    // implementation: it is the exhale of cycle 5.
    const analytic = 5 * (4000 + 6000) + 4000;

    expect(Math.abs(last.atMs - analytic)).toBeLessThan(50);
    // Re-derivation from a fixed origin means the error is not merely small,
    // it is exactly zero. Assert that, so a regression to chained offsets fails.
    expect(last.atMs).toBe(analytic);
  });

  it('agrees with phaseAtElapsed at every boundary it reports', () => {
    for (const boundary of boundariesWithin(PATTERN_46, SESSION_MS)) {
      const probed = phaseAtElapsed(PATTERN_46, boundary.atMs);
      expect(probed.phase).toBe(boundary.phase);
      expect(probed.phaseStartedAtMs).toBe(boundary.atMs);
    }
  });

  it('never reports a boundary at or past the session end', () => {
    for (const boundary of boundariesWithin(PATTERN_46, SESSION_MS)) {
      expect(boundary.atMs).toBeLessThan(SESSION_MS);
    }
  });

  it('returns an empty list for a non-positive session length', () => {
    expect(boundariesWithin(PATTERN_46, 0)).toEqual([]);
    expect(boundariesWithin(PATTERN_46, -1)).toEqual([]);
  });
});
