/**
 * FEAT-285 — breath-phase timing model.
 *
 * `phaseAtElapsed` is the timing authority for haptic cues. It is deliberately
 * INDEPENDENT of the visual animation code so that a cue schedule can be
 * re-derived from a fixed session start instead of accumulating error through a
 * chain of setTimeouts.
 *
 * The subtle requirement: BreathingCircle runs two different engines. Without a
 * hold phase it uses a seamless Reanimated `withRepeat`, so one cycle is exactly
 * inhale+exhale. WITH a hold phase it uses a nested setTimeout chain that inserts
 * a 100 ms gap before restarting, so one visual cycle is inhale+hold+exhale+100.
 * If the model ignored that gap the cues would walk away from the visuals by
 * 100 ms per cycle. These tests pin the gap into the model.
 */

import {
  phaseAtElapsed,
  cycleDurationMs,
  boundariesWithin,
  INTER_CYCLE_GAP_MS,
  type BreathPattern,
} from '@/features/practices/shared/haptics/phaseAtElapsed';

/** 4-4-6 — the evening breathing pattern, and the one named in the ACs. */
const PATTERN_446: BreathPattern = { inhale: 4000, hold: 4000, exhale: 6000 };
/** 4-4 with no hold — GroundedPresenceScreen / BreathingCircle's DEFAULT_PATTERN. */
const PATTERN_44: BreathPattern = { inhale: 4000, exhale: 4000 };

describe('cycleDurationMs', () => {
  it('includes the inter-cycle gap when the pattern has a hold phase', () => {
    // 4000 + 4000 + 6000 + 100
    expect(cycleDurationMs(PATTERN_446)).toBe(14100);
  });

  it('has no inter-cycle gap when there is no hold phase (seamless withRepeat)', () => {
    expect(cycleDurationMs(PATTERN_44)).toBe(8000);
  });

  it('treats an explicit hold of 0 as no hold', () => {
    expect(cycleDurationMs({ inhale: 4000, hold: 0, exhale: 4000 })).toBe(8000);
  });

  it('exposes the gap constant so BreathingCircle and the model cannot drift apart', () => {
    expect(INTER_CYCLE_GAP_MS).toBe(100);
  });
});

describe('phaseAtElapsed — 4-4-6 boundaries', () => {
  it.each([
    [0, 'inhale'],
    [1, 'inhale'],
    [3999, 'inhale'],
    [4000, 'hold'],
    [7999, 'hold'],
    [8000, 'exhale'],
    [13999, 'exhale'],
    // The 100 ms inter-cycle gap reads as the tail of exhale: the circle is
    // already contracted and the practitioner is still emptying.
    [14000, 'exhale'],
    [14099, 'exhale'],
    // Second cycle begins.
    [14100, 'inhale'],
    [18100, 'hold'],
    [22100, 'exhale'],
  ])('elapsed %ims -> %s', (elapsed, expected) => {
    expect(phaseAtElapsed(PATTERN_446, elapsed).phase).toBe(expected);
  });

  it('reports the cycle index alongside the phase', () => {
    expect(phaseAtElapsed(PATTERN_446, 0).cycleIndex).toBe(0);
    expect(phaseAtElapsed(PATTERN_446, 14099).cycleIndex).toBe(0);
    expect(phaseAtElapsed(PATTERN_446, 14100).cycleIndex).toBe(1);
    expect(phaseAtElapsed(PATTERN_446, 28200).cycleIndex).toBe(2);
  });

  it('reports when the current phase started, in absolute elapsed ms', () => {
    expect(phaseAtElapsed(PATTERN_446, 5000).phaseStartedAtMs).toBe(4000);
    expect(phaseAtElapsed(PATTERN_446, 20000).phaseStartedAtMs).toBe(18100);
  });

  it('clamps negative elapsed to the first inhale rather than throwing', () => {
    const result = phaseAtElapsed(PATTERN_446, -500);
    expect(result.phase).toBe('inhale');
    expect(result.cycleIndex).toBe(0);
    expect(result.phaseStartedAtMs).toBe(0);
  });
});

describe('phaseAtElapsed — no-hold pattern never reports a hold', () => {
  it.each([0, 1000, 3999, 4000, 7999, 8000, 12000])('elapsed %ims', (elapsed) => {
    expect(phaseAtElapsed(PATTERN_44, elapsed).phase).not.toBe('hold');
  });

  it('alternates inhale/exhale on the 4 s boundaries', () => {
    expect(phaseAtElapsed(PATTERN_44, 3999).phase).toBe('inhale');
    expect(phaseAtElapsed(PATTERN_44, 4000).phase).toBe('exhale');
    expect(phaseAtElapsed(PATTERN_44, 8000).phase).toBe('inhale');
  });
});

describe('boundariesWithin — drift over a simulated 60 s session', () => {
  const SESSION_MS = 60_000;

  it('enumerates every phase boundary in a 60 s 4-4-6 session', () => {
    const boundaries = boundariesWithin(PATTERN_446, SESSION_MS);

    // Cycle 0 at 0/4000/8000; cycle 1 at 14100/18100/22100; cycle 2 at
    // 28200/32200/36200; cycle 3 at 42300/46300/50300; cycle 4 at 56400 and
    // 60400 — the latter is past the session end, so 13 boundaries land inside.
    expect(boundaries.map((b) => b.atMs)).toEqual([
      0, 4000, 8000, 14100, 18100, 22100, 28200, 32200, 36200, 42300, 46300,
      50300, 56400,
    ]);
    expect(boundaries[0].phase).toBe('inhale');
    expect(boundaries[1].phase).toBe('hold');
    expect(boundaries[2].phase).toBe('exhale');
  });

  it('has ZERO cumulative drift at the final boundary (budget is < 50 ms)', () => {
    const boundaries = boundariesWithin(PATTERN_446, SESSION_MS);
    const last = boundaries[boundaries.length - 1];

    // Analytic position of that same boundary, computed independently of the
    // implementation: it is the inhale opening cycle 4.
    const analytic = 4 * (4000 + 4000 + 6000 + INTER_CYCLE_GAP_MS);

    expect(Math.abs(last.atMs - analytic)).toBeLessThan(50);
    // Re-derivation from a fixed origin means the error is not merely small,
    // it is exactly zero. Assert that, so a regression to chained offsets fails.
    expect(last.atMs).toBe(analytic);
  });

  it('agrees with phaseAtElapsed at every boundary it reports', () => {
    for (const boundary of boundariesWithin(PATTERN_446, SESSION_MS)) {
      const probed = phaseAtElapsed(PATTERN_446, boundary.atMs);
      expect(probed.phase).toBe(boundary.phase);
      expect(probed.phaseStartedAtMs).toBe(boundary.atMs);
    }
  });

  it('never reports a boundary at or past the session end', () => {
    for (const boundary of boundariesWithin(PATTERN_446, SESSION_MS)) {
      expect(boundary.atMs).toBeLessThan(SESSION_MS);
    }
  });

  it('returns an empty list for a non-positive session length', () => {
    expect(boundariesWithin(PATTERN_446, 0)).toEqual([]);
    expect(boundariesWithin(PATTERN_446, -1)).toEqual([]);
  });
});
