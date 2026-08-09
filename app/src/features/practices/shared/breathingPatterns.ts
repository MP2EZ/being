/**
 * breathingPatterns — breath timings shared by the animation and the cues.
 *
 * This lives OUTSIDE `BreathingCircle` deliberately (FEAT-285). The 4-4 default
 * is consumed by two independent things: the component that animates it, and
 * the haptic scheduler that builds a cue timeline from it. Keeping the constant
 * inside the component meant any test that mocked BreathingCircle also nulled
 * the value out from under the scheduler — the mock stopped being a stand-in
 * for a component and started silently deleting shared data.
 *
 * Pattern data is not a component concern. It sits here so both consumers read
 * one definition and neither can be mocked out of existence.
 */

export interface BreathingPattern {
  /** Inhale duration in milliseconds */
  inhale: number;
  /** Optional hold duration in milliseconds */
  hold?: number;
  /** Exhale duration in milliseconds */
  exhale: number;
}

/**
 * Default 4-4 pattern (backward compatible).
 *
 * NOTE the absent hold: this selects BreathingCircle's seamless Reanimated
 * engine rather than its setTimeout-chain engine, and the two have different
 * cycle lengths (the chain inserts an inter-cycle gap). Adding a hold here
 * changes which engine every default-pattern screen runs on.
 */
export const DEFAULT_PATTERN: BreathingPattern = {
  inhale: 4000,
  exhale: 4000,
};
