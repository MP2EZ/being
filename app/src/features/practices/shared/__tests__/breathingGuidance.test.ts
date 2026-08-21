/**
 * breathingGuidance — the grounding-item selector (DEBUG-468).
 *
 * WHY THIS IS A PURE MODULE AND NOT A BRANCH INSIDE BreathingCircle. Same
 * reasoning `breathingPatterns.ts` records for the pattern data: any suite that
 * mocks out `BreathingCircle` would otherwise take the selection rule with it,
 * and the rule is the part with the edge cases. It is also the only part that
 * can be tested at all — the Reanimated mocks in this tree stub `withTiming` as
 * `(val) => val`, so the completion callbacks that drive a cycle never fire in
 * jest. A render test can prove which item is on screen at cycle 0 and nothing
 * beyond it; the pacing itself is provable only here.
 *
 * THE CONTRACT. Aware Presence's grounding triad maps 1:1 onto the principle's
 * three capacities (Embodied Awareness / Present Perception / Metacognitive
 * Space — `01-aware-presence.md` lines 12, 66), so every item must surface. The
 * breath is 30s of a 4-4 pattern = 8s per cycle = 3 completed cycles, which is
 * exactly enough for three items with 6s to spare. The clamp is what spends that
 * remainder: the last item HOLDS to the end of the sit rather than the guidance
 * slot going blank, because a blank slot mid-practice reads as the practice
 * having ended.
 */
import { groundingItemForCycle } from '../breathingGuidance';

const TRIAD = [
  'one physical sensation — feet on the ground, air on your skin',
  'the space around you — where you are right now',
  "what's present in your mind",
] as const;

describe('groundingItemForCycle', () => {
  it('surfaces every item of the triad, in authored order, one per completed cycle', () => {
    // Order is not cosmetic: the triad is authored Embodied → Present →
    // Metacognitive and the principle doc integrates them in that sequence.
    expect(groundingItemForCycle(TRIAD, 0)).toBe(TRIAD[0]);
    expect(groundingItemForCycle(TRIAD, 1)).toBe(TRIAD[1]);
    expect(groundingItemForCycle(TRIAD, 2)).toBe(TRIAD[2]);
  });

  it('holds the last item once the triad is exhausted, never blanking or wrapping', () => {
    // 30s / 8s leaves 6s after the third item. Wrapping would restart the triad
    // for three-quarters of a cycle and imply a fourth anchor that does not
    // exist; blanking would read as the sit having finished early.
    expect(groundingItemForCycle(TRIAD, 3)).toBe(TRIAD[2]);
    expect(groundingItemForCycle(TRIAD, 4)).toBe(TRIAD[2]);
    expect(groundingItemForCycle(TRIAD, 99)).toBe(TRIAD[2]);
  });

  it('returns undefined when no items are supplied, so the prop stays opt-in', () => {
    // The two other live callers (PracticeTimerScreen, DailyLoopCompleteScreen)
    // pass nothing and must render byte-identical to before this change.
    expect(groundingItemForCycle(undefined, 0)).toBeUndefined();
    expect(groundingItemForCycle([], 0)).toBeUndefined();
    expect(groundingItemForCycle([], 5)).toBeUndefined();
  });

  it('is total over a negative or non-integer cycle count', () => {
    // Not defensive padding for an impossible case: the caller increments from a
    // functional setState that a StrictMode double-invoke can drive, and a
    // negative index would return undefined and blank the slot silently.
    expect(groundingItemForCycle(TRIAD, -1)).toBe(TRIAD[0]);
    expect(groundingItemForCycle(TRIAD, 1.5)).toBe(TRIAD[1]);
  });

  it('handles a single-item list without reaching past its end', () => {
    expect(groundingItemForCycle(['only anchor'], 0)).toBe('only anchor');
    expect(groundingItemForCycle(['only anchor'], 7)).toBe('only anchor');
  });
});
