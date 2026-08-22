/**
 * Marcus Aurelius quotes for the Insights daily rotation.
 *
 * DEBUG-319 — every entry in this array is VERBATIM from a public-domain translation
 * with a verified book.section citation. That was not previously true: a philosopher
 * audit found 4 of the 5 original entries failed a verbatim check, including TWO
 * outright fabrications with no locus in Meditations at all:
 *
 *   - "When you arise in the morning, think of what a precious privilege it is to be
 *     alive." cited Meditations 2:1 — a circulated internet confection. Real 2.1 is the
 *     busybody passage, which this repo already carries correctly as
 *     `marcus-meditations-2-1` in assets/passages/passages-5-interconnected-living.json.
 *   - "The object of life is not to be on the side of the majority, but to escape
 *     finding oneself in the ranks of the insane." cited Meditations 4:32 — traces to a
 *     translation of Tolstoy's "Bethink Yourselves!", not Marcus. Real 4.32 is the
 *     Vespasian passage. Independently un-Stoic: contempt for "the ranks of the insane"
 *     inverts Meditations 2.1's own conclusion (the ignorant err through ignorance, are
 *     kin to me, and cannot be hated) and contradicts Principle 5, Interconnected Living.
 *
 * The other two failures were subtler and are the reason a verbatim standard exists:
 * 7.59 rendered Marcus's "fountain of GOOD" (the agathon, i.e. virtue) as "a source of
 * STRENGTH", converting a virtue-ethics claim into a resilience claim; and 7.67 was a
 * composite whose genuine first half carried an accretion ("it is all within yourself,
 * in your way of thinking") found in no standard translation.
 *
 * RULES for anything added here (all four are load-bearing):
 *  1. VERBATIM only, from a named translation. A paraphrase inside quotation marks with
 *     a precise citation is the exact failure mode that produced this bug.
 *  2. PUBLIC DOMAIN translations only — George Long (Marcus), Gummere (Seneca),
 *     Oldfather (Epictetus), all already used by the assets/passages corpus. Gregory
 *     Hays (2002) and Robin Hard (2011) are IN COPYRIGHT, and a daily-rotating in-app
 *     quote is a materially weaker fair-use posture than a single critical quotation.
 *  3. The translator ships in the data AND is surfaced in the UI. An uncredited
 *     translation is how paraphrase drift re-enters.
 *  4. If a non-Marcus author is ever added, the hardcoded "- Marcus Aurelius," in
 *     InsightsScreen's render MUST move into the data in the same change — otherwise
 *     the UI itself manufactures a new misattribution.
 *
 * Regression-pinned by ./__tests__/marcusQuotes.test.ts.
 */

export interface MarcusQuote {
  /** Verbatim text from the named translation. Never a paraphrase. */
  readonly text: string;
  /** Book.section in dot form, matching the assets/passages corpus convention. */
  readonly source: string;
  /** Public-domain translator. Surfaced in the UI (rule 3 above). */
  readonly translation: string;
}

export const MARCUS_QUOTES: readonly MarcusQuote[] = [
  {
    // Byte-identical to `marcus-meditations-10-16` in passages-4-virtuous-response.json.
    // Replaces the paraphrase "Waste no more time arguing about what a good man should
    // be. Be one." — right locus, right sense, but no standard translation reads that way.
    text: 'No longer talk at all about the kind of man that a good man ought to be, but be such.',
    source: 'Meditations 10.16',
    translation: 'George Long',
  },
  {
    // Restores "the fountain of good" (the agathon). See the semantic-drift note above.
    text: 'Look within. Within is the fountain of good, and it will ever bubble up, if thou wilt ever dig.',
    source: 'Meditations 7.59',
    translation: 'George Long',
  },
  {
    // Truncated to the genuine clause; the trailing accretion is dropped.
    text: 'Very little indeed is necessary for living a happy life.',
    source: 'Meditations 7.67',
    translation: 'George Long',
  },
  {
    // Replaces the Tolstoy-derived "ranks of the insane" fabrication.
    // Byte-identical to `marcus-meditations-7-29` in passages-1-aware-presence.json.
    text: 'Wipe out the imagination. Stop the pulling of the strings. Confine thyself to the present.',
    source: 'Meditations 7.29',
    translation: 'George Long',
  },
  {
    // Replaces the "precious privilege" fabrication, keeping the dawn slot it occupied.
    // 5.1 is the passage Marcus actually wrote about waking, and it normalizes reluctance
    // ("when thou risest unwillingly") rather than demanding cheerfulness — the safer
    // register for a surface every user sees daily, including low-mood users.
    // DELIBERATELY TRUNCATED here: Long continues "Or have I been made for this, to lie
    // in the bed-clothes and keep myself warm?", which reads as shaming without the
    // surrounding context. Do not restore that clause on this surface.
    text: 'In the morning when thou risest unwillingly, let this thought be present: I am rising to the work of a human being.',
    source: 'Meditations 5.1',
    translation: 'George Long',
  },
];

/**
 * Pick the quote for today.
 *
 * NOTE the modulo: the array LENGTH is load-bearing for rotation. Removing an entry
 * silently re-maps every day of the year to a different quote for every user, and
 * nothing else in the app would catch it. Replace in place; do not delete.
 */
export const getDailyQuote = (): MarcusQuote | undefined => {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  // The modulo is always in range for a non-empty array, but `noUncheckedIndexedAccess`
  // types this as possibly-undefined and the return type says so rather than asserting
  // it away — InsightsScreen already guards the render with `{dailyQuote && …}`.
  return MARCUS_QUOTES[dayOfYear % MARCUS_QUOTES.length];
};
