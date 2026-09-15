/**
 * DEBUG-619 — how PracticeScreenHeader holds scaling text at accessibility sizes.
 *
 * The header put its "←" glyph and Sorting's progress counter in fixed 44×44 boxes and
 * truncated the title to one line. From AX3 the glyph (headline4 × 2.643 ≈ 63pt)
 * clipped to a sliver, the counter read "1/", and at AX5 titles truncated to "3-Mi…".
 * These modals are `gestureEnabled: false`, so the glyph is the only visible exit.
 */

/**
 * The font scale from which the title leaves the Back/counter row and takes its own
 * full-width line. It sits between xxxLarge (1.353, the largest standard slider size)
 * and AX1 (1.786), matching the Daily Loop screens' AX layout threshold. Defined here
 * rather than imported: `practices/dailyloop/` is a gated Protected Path, and this
 * shared header must not take a dependency on it.
 */
export const PRACTICE_HEADER_STACKED_FONT_SCALE = 1.6;

/**
 * Cap on the glyph and the progress counter ONLY; the title is never capped. This is set
 * from WCAG 1.4.4 (text resizes to 200% without loss of content), not derived from a
 * size budget, because the header has none: it grows with its content. Must stay > 1:
 * iOS silently ignores a `maxFontSizeMultiplier` below 1.0, and exactly 1.0 is
 * `allowFontScaling={false}` under another name (DEBUG-579).
 */
export const PRACTICE_HEADER_CONTROL_MAX_FONT_SCALE = 2;

export function practiceHeaderStacksTitle(fontScale: number): boolean {
  return Number.isFinite(fontScale) && fontScale >= PRACTICE_HEADER_STACKED_FONT_SCALE;
}
