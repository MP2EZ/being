/**
 * breathingGuidance — selects which grounding anchor the breath is currently on.
 *
 * This lives OUTSIDE `BreathingCircle` for the same reason `breathingPatterns.ts`
 * does (FEAT-285): a suite that mocks the component would otherwise take the
 * selection rule with it, and the rule is the part carrying the edge cases. It is
 * also the only part that is testable at all — the Reanimated mocks in this tree
 * stub `withTiming` as `(val) => val`, so the completion callbacks that advance a
 * cycle never fire under jest.
 *
 * WHY PACED RATHER THAN LISTED (DEBUG-468, philosopher ruling). A static
 * three-bullet card asks the practitioner to read three lines, hold them in
 * working memory and allocate them across the sit themselves — language
 * processing, which is the exact mode an arriving breath is trying to step out
 * of. Pacing the anchors one per cycle is what `01-aware-presence.md:29` means by
 * "establish anchor points to which you can return attention". It also happens to
 * remove ~245pt from a beat that overflowed the smallest supported viewport, but
 * that is the smaller half of why it is right.
 */

/**
 * The anchor for a given number of COMPLETED breath cycles.
 *
 * Total over its inputs by construction. The last item HOLDS once the list is
 * exhausted — a 30s sit on the 4-4 default is 3.75 cycles, so ~6s remain after the
 * third anchor, and a slot that blanked (or wrapped to a fourth anchor that does
 * not exist) would read as the practice having ended early.
 *
 * @param items  authored anchors, in order; `undefined` keeps the feature opt-in
 * @param completedCycles  cycles finished so far; clamped, so a negative or
 *                         fractional value from a double-invoked setState cannot
 *                         blank the slot
 */
export const groundingItemForCycle = (
  items: readonly string[] | undefined,
  completedCycles: number,
): string | undefined => {
  if (!items || items.length === 0) return undefined;
  const index = Math.min(Math.max(Math.floor(completedCycles), 0), items.length - 1);
  return items[index];
};
