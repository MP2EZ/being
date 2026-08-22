/**
 * phaseAtElapsed — breath-phase timing model for practice haptic cues (FEAT-285).
 *
 * WHY THIS EXISTS SEPARATELY FROM THE ANIMATION
 * `BreathingCircle` schedules its visuals as a Reanimated
 * `withRepeat(withSequence(...))` that lives on the UI thread; JS only learns
 * about a boundary through a `runOnJS` hop. Driving cues off that would
 * accumulate error across a session. Instead this module models the schedule
 * analytically: given a fixed session origin and an elapsed duration, it answers
 * "which phase, and when did it start" with no dependence on how many boundaries
 * have already gone by. Error therefore does not accumulate — it is zero by
 * construction.
 *
 * ONE ENGINE, NO INTER-CYCLE GAP (MAINT-391)
 * This module used to carry an `INTER_CYCLE_GAP_MS = 100` constant and a
 * gap-inclusive cycle length, because a pattern with a `hold` selected a second
 * animation engine in `BreathingCircle` — a nested setTimeout chain that waited
 * 100 ms before restarting. That engine, the `hold` field, and the gap are gone.
 * A cycle is now exactly `inhale + exhale`, and it is seamless, so the model and
 * the visuals agree without a shared constant anyone has to remember to keep in
 * sync. The retention ruling — and what reintroducing a hold would require — is
 * in `../breathingPatterns`.
 *
 * The pattern may be asymmetric (`{ inhale: 4000, exhale: 6000 }`); nothing here
 * assumes the two phases are equal.
 */

export type BreathPhase = 'inhale' | 'exhale';

export interface BreathPattern {
  /** Duration of the inhale, in ms. */
  inhale: number;
  /** Duration of the exhale, in ms. */
  exhale: number;
}

export interface PhaseAtElapsed {
  phase: BreathPhase;
  /** 0-based index of the breath cycle containing `elapsedMs`. */
  cycleIndex: number;
  /** Absolute elapsed-ms position at which the current phase began. */
  phaseStartedAtMs: number;
}

export interface PhaseBoundary {
  /** Absolute elapsed-ms position of the boundary. */
  atMs: number;
  /** The phase that BEGINS at this boundary. */
  phase: BreathPhase;
  cycleIndex: number;
}

/**
 * Full length of one breath cycle as the practitioner experiences it.
 *
 * The animation loops seamlessly, so this is the whole story: no gap, no
 * settling time, nothing between the end of one exhale and the start of the
 * next inhale.
 */
export function cycleDurationMs(pattern: BreathPattern): number {
  return pattern.inhale + pattern.exhale;
}

/**
 * Which phase is active at `elapsedMs` into the session, and when it began.
 *
 * Negative input clamps to the opening inhale rather than throwing — a caller
 * comparing timestamps across a pause can legitimately produce one.
 */
export function phaseAtElapsed(pattern: BreathPattern, elapsedMs: number): PhaseAtElapsed {
  const clamped = Math.max(0, elapsedMs);
  const cycle = cycleDurationMs(pattern);
  const cycleIndex = Math.floor(clamped / cycle);
  const cycleStart = cycleIndex * cycle;
  const withinCycle = clamped - cycleStart;

  if (withinCycle < pattern.inhale) {
    return { phase: 'inhale', cycleIndex, phaseStartedAtMs: cycleStart };
  }

  return {
    phase: 'exhale',
    cycleIndex,
    phaseStartedAtMs: cycleStart + pattern.inhale,
  };
}

/** Options for {@link boundariesWithin}. */
export interface BoundariesWithinOptions {
  /**
   * Omit the opening `inhale` at atMs 0 (FEAT-311).
   *
   * Set this on any screen that also fires the `sessionStart` anchor. Both cues
   * are `impactLight` and would land on the same instant, so the engine's
   * module-scoped MIN_CUE_INTERVAL_MS throttle drops one of them — and two
   * identical transients 0ms apart are a single pulse to the skin regardless.
   * Trimming here makes `sessionStart` REPLACE the opening inhale as a stated
   * decision, rather than leaving the throttle to arbitrate which meaning the
   * practitioner receives.
   */
  skipOpening?: boolean;
}

/**
 * Every phase boundary strictly inside a session of `sessionMs`.
 *
 * Each entry is computed from the cycle origin rather than by adding to its
 * predecessor, which is what keeps cumulative drift at zero. A scheduler should
 * use these absolute positions as targets measured against a fixed session
 * start, never as successive relative delays.
 */
export function boundariesWithin(
  pattern: BreathPattern,
  sessionMs: number,
  options: BoundariesWithinOptions = {}
): PhaseBoundary[] {
  if (sessionMs <= 0) return [];

  const cycle = cycleDurationMs(pattern);
  const boundaries: PhaseBoundary[] = [];

  for (let cycleIndex = 0; cycleIndex * cycle < sessionMs; cycleIndex += 1) {
    const cycleStart = cycleIndex * cycle;

    const offsets: Array<{ offset: number; phase: BreathPhase }> = [
      { offset: 0, phase: 'inhale' },
      { offset: pattern.inhale, phase: 'exhale' },
    ];

    for (const { offset, phase } of offsets) {
      const atMs = cycleStart + offset;
      if (atMs === 0 && options.skipOpening) continue;
      if (atMs < sessionMs) boundaries.push({ atMs, phase, cycleIndex });
    }
  }

  return boundaries;
}
