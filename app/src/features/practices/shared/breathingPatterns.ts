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
 *
 * BREATH RETENTION IS NOT AVAILABLE, AND ITS ABSENCE IS A RULING (MAINT-391)
 * =========================================================================
 * This type used to carry an optional `hold`, and `BreathingCircle` used to
 * carry a second animation engine — a nested `setTimeout` chain — that ran
 * whenever a pattern set it. MAINT-391 deleted both. If you are here to add a
 * hold back, read this section first: the answer is not "restore the field."
 *
 * WHAT SURVIVES. The therapeutic capability that machinery was protecting is
 * the exhale:inhale RATIO, not the hold. An extended exhale — the vagal /
 * parasympathetic downregulation shape — is expressed as an asymmetric
 * two-phase pattern, e.g. `{ inhale: 4000, exhale: 6000 }`, and it runs on the
 * seamless Reanimated engine exactly like the 4-4 default does. Nothing about
 * extended exhale depended on the deleted code, and nothing about it changed.
 *
 * WHAT WAS REMOVED, AND WHY IT IS NOT A LOSS. The hold path was dormant AND
 * broken. No screen has ever passed a hold; the only hold pattern ever authored
 * (an evening 4-4-6) was retired with its flow in FEAT-298 slice 6c. In the
 * meantime it accumulated four verified defects:
 *   1. The countdown read a Reanimated shared value (`countdown.value`) during
 *      render, so the displayed number never re-rendered — it was frozen at
 *      whatever the first paint saw.
 *   2. Opacity was scheduled against `(inhale + hold + exhale) / 2` on a
 *      `withRepeat(..., reverse)`, which corresponds to no phase boundary in the
 *      pattern and also ignored the 100 ms inter-cycle gap, so the glow desynced
 *      from the breath it was supposed to express.
 *   3. The four-deep `setTimeout` chain accrued scheduling latency link by link,
 *      while the haptic cue schedule (`haptics/phaseAtElapsed`) is analytic and
 *      re-derived from a fixed origin — so the vibrations and the visuals walked
 *      apart over a session by construction.
 *   4. No test anywhere rendered `BreathingCircle` with a hold. All four defects
 *      were invisible to CI.
 * So the usual objection — "deleting it creates work to rebuild it" — is false.
 * A returning hold pattern needed a rewritten engine either way; the rebuild was
 * already mandatory. What deletion removes is the illusion that a working
 * implementation is sitting here waiting.
 *
 * NOTE ALSO what the old type could never express. `BreathingPattern` carried
 * ONE `hold`, so 4-4-4-4 box breathing (which needs two, one after each phase)
 * was not representable at all. 4-7-8 was the single shape the field could ever
 * have carried, and it never shipped.
 *
 * REINTRODUCTION IS A NEW FEATURE, NEVER A REVERT OF THIS COMMIT. Two
 * requirements, both non-negotiable:
 *   - A new engine. Do not resurrect the setTimeout chain. Model a hold as a
 *     phase of the same seamless Reanimated sequence the two-phase engine
 *     already uses, and extend `haptics/phaseAtElapsed` in the same change so
 *     the cue model and the visual cadence agree by construction rather than by
 *     a constant someone remembered to keep in sync.
 *   - A `crisis` agent pass, not just a `philosopher` one. Breath retention is a
 *     recognised CO2 / interoceptive panic provocation — it is used deliberately
 *     as one in exposure protocols — and Being's audience includes users
 *     screening at high GAD-7. A hold is therefore a safety-surface change, and
 *     the philosophical question ("is retention Stoic?", answered in
 *     `docs/product/stoic-mindfulness/practice/daily-architecture.md`) does not
 *     substitute for the clinical one.
 */

export interface BreathingPattern {
  /** Inhale duration in milliseconds */
  inhale: number;
  /** Exhale duration in milliseconds */
  exhale: number;
}

/**
 * Default 4-4 pattern.
 *
 * Symmetric by choice, not by limitation: the engine paces any two-phase
 * pattern, so an asymmetric extended exhale is a legal value here. See the
 * retention ruling above before reaching for anything with a hold in it.
 */
export const DEFAULT_PATTERN: BreathingPattern = {
  inhale: 4000,
  exhale: 4000,
};
