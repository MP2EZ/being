/**
 * phaseAtElapsed — breath-phase timing model for practice haptic cues (FEAT-285).
 *
 * WHY THIS EXISTS SEPARATELY FROM THE ANIMATION
 * `BreathingCircle` schedules its visuals two different ways depending on the
 * pattern, and neither is a usable timing source for cues:
 *   - No hold phase: a Reanimated `withRepeat(withSequence(...))` that lives on
 *     the UI thread; JS only learns about a boundary through a `runOnJS` hop.
 *   - With a hold phase: a nested `setTimeout` chain on the JS thread, where
 *     every link adds its own scheduling latency to the one before it.
 * Driving cues off either would accumulate error across a session. Instead this
 * module models the schedule analytically: given a fixed session origin and an
 * elapsed duration, it answers "which phase, and when did it start" with no
 * dependence on how many boundaries have already gone by. Error therefore does
 * not accumulate — it is zero by construction.
 *
 * THE INTER-CYCLE GAP
 * The hold-path setTimeout chain waits `INTER_CYCLE_GAP_MS` after a cycle
 * completes before starting the next one. That gap is part of the *visual*
 * cadence, so the model has to include it or cues would slide 100 ms earlier per
 * cycle relative to what the practitioner sees. The seamless no-hold path has no
 * such gap. Keep this constant in sync with BreathingCircle's restart delay.
 */

export type BreathPhase = 'inhale' | 'hold' | 'exhale';

export interface BreathPattern {
  /** Duration of the inhale, in ms. */
  inhale: number;
  /** Duration of the hold, in ms. Absent or 0 selects the seamless engine. */
  hold?: number;
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
 * Delay BreathingCircle's hold-path chain inserts between cycles, in ms.
 *
 * Mirrors the `setTimeout(..., 100)` that restarts `startBreathingCycle`. If
 * that value ever changes, this one must change with it — the drift test in
 * `__tests__/unit/practices/haptics/phaseAtElapsed.test.ts` pins the pairing.
 */
export const INTER_CYCLE_GAP_MS = 100;

/** True when the pattern selects the hold-path (setTimeout chain) engine. */
function hasHold(pattern: BreathPattern): boolean {
  return typeof pattern.hold === 'number' && pattern.hold > 0;
}

/** Hold duration in ms, normalised to 0 when the pattern has no hold. */
function holdMs(pattern: BreathPattern): number {
  return hasHold(pattern) ? (pattern.hold as number) : 0;
}

/**
 * Full length of one breath cycle as the practitioner experiences it,
 * including the inter-cycle gap on the hold path.
 */
export function cycleDurationMs(pattern: BreathPattern): number {
  const gap = hasHold(pattern) ? INTER_CYCLE_GAP_MS : 0;
  return pattern.inhale + holdMs(pattern) + pattern.exhale + gap;
}

/**
 * Which phase is active at `elapsedMs` into the session, and when it began.
 *
 * The inter-cycle gap reads as the tail of the exhale: the circle has already
 * finished contracting and the practitioner is still emptying, so there is no
 * fourth phase to name and no cue to fire.
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

  const hold = holdMs(pattern);
  if (hold > 0 && withinCycle < pattern.inhale + hold) {
    return { phase: 'hold', cycleIndex, phaseStartedAtMs: cycleStart + pattern.inhale };
  }

  return {
    phase: 'exhale',
    cycleIndex,
    phaseStartedAtMs: cycleStart + pattern.inhale + hold,
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
  const hold = holdMs(pattern);
  const boundaries: PhaseBoundary[] = [];

  for (let cycleIndex = 0; cycleIndex * cycle < sessionMs; cycleIndex += 1) {
    const cycleStart = cycleIndex * cycle;

    const offsets: Array<{ offset: number; phase: BreathPhase }> = [
      { offset: 0, phase: 'inhale' },
      ...(hold > 0
        ? [{ offset: pattern.inhale, phase: 'hold' as BreathPhase }]
        : []),
      { offset: pattern.inhale + hold, phase: 'exhale' },
    ];

    for (const { offset, phase } of offsets) {
      const atMs = cycleStart + offset;
      if (atMs === 0 && options.skipOpening) continue;
      if (atMs < sessionMs) boundaries.push({ atMs, phase, cycleIndex });
    }
  }

  return boundaries;
}
