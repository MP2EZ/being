/**
 * MAINT-307 — sorting-deck sequencing.
 *
 * FEAT-293 promoted the control-sorting drill to a primary surface reachable
 * from Home. The philosopher's review approved the rewritten card wording but
 * flagged POSITION separately: `medical-test-anxiety` was card 3 of 12, and on a
 * wrong answer SortingPracticeScreen announces "Not quite. How you respond to
 * the anxiety is in your control…". For someone with a real pending medical
 * result that lands roughly thirty seconds into a cold entry from Home, before
 * they have learned what the drill is even asking of them.
 *
 * The fix is ordering, not copy. This pins the PROPERTY (sensitive cards are not
 * in the opening run) rather than the exact arrangement, so authoring a new
 * scenario doesn't spuriously fail — but a card drifting back toward the front
 * does.
 */

import moduleThree from '../../../assets/modules/module-3-sphere-sovereignty.json';

/**
 * Cards that presuppose a live, personally-loaded situation. They are fine once
 * the in-control / not-in-control convention is understood, and unkind as an
 * opener.
 *
 * - medical-test-anxiety: the user may literally be awaiting a result.
 * - event-interpretation: invites the user to supply "a difficult event", so it
 *   is the card most likely to be loaded with real material.
 */
const SENSITIVE_CARDS = ['medical-test-anxiety', 'event-interpretation'];

/** How many opening cards must stay low-stakes. */
const OPENING_RUN = 5;

const sortingPractice = moduleThree.practices.find((p) => p.type === 'sorting');
const scenarios = (sortingPractice?.scenarios ?? []) as Array<{ id: string }>;

describe('MAINT-307 — control-sorting deck order', () => {
  it('still has all 12 scenarios with unique ids', () => {
    expect(scenarios).toHaveLength(12);
    expect(new Set(scenarios.map((s) => s.id)).size).toBe(12);
  });

  it.each(SENSITIVE_CARDS)(
    'keeps %s out of the opening run',
    (id) => {
      const position = scenarios.findIndex((s) => s.id === id) + 1;
      expect(position).toBeGreaterThan(0); // card still exists
      expect(position).toBeGreaterThan(OPENING_RUN);
    }
  );

  it('opens with a low-stakes card', () => {
    // Whatever else changes, card 1 teaches the convention on something
    // impersonal. Asserted as "not sensitive" rather than a hardcoded id so the
    // opener can be re-authored freely.
    expect(SENSITIVE_CARDS).not.toContain(scenarios[0]?.id);
  });

  it('leaves the philosopher-approved wording untouched', () => {
    // MAINT-307 is sequencing only. If this ever fails, the copy changed — which
    // needs a philosopher pass, not a reorder.
    const card = scenarios.find((s) => s.id === 'medical-test-anxiety') as
      | { text: string; correctAnswer: string }
      | undefined;
    expect(card?.text).toBe(
      'How you respond to anxiety while waiting for a medical test result.'
    );
    expect(card?.correctAnswer).toBe('in-control');
  });
});
