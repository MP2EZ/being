/**
 * DEBUG-629 — how the Daily Loop step header holds scaling text.
 *
 * The header painted a fixed 72pt band (DEBUG-468) around a block that grows with Dynamic
 * Type, so at accessibility sizes the block left the band in both directions. Measured on
 * device at AX5 (iPhone SE 3, 375x667, `maestro hierarchy`), against the same nodes at the
 * default size:
 *
 *   node                     AX5                 default
 *   band                     [0,30][375,102]     same          (30pt status inset + 72)
 *   title `Daily Practice`   [32,0][343,128]     [130,42][245,63]
 *   progress bar             [32,132][343,136]   inside the band
 *   counter `n of 3`         [133,140][241,191]  [170,75][204,90]
 *   `daily-loop-exit` ✕      [16,44][60,88]      same
 *   first content node       y=102               y=122
 *
 * Two distinct defects, one cause:
 *
 *   1. LOSS OF CONTENT (WCAG 2.2 SC 1.4.4, failure technique F69 — a fixed-size container,
 *      not a truncated string; the title has no `numberOfLines`). The counter at y=140..191
 *      is painted over scroll content that begins at y=102. It is provable at exactly
 *      fontScale 2.0, the SC's own ceiling: the block is 84pt in a 72pt band. Secondary:
 *      SC 1.4.10 Reflow. NOT a contrast failure — do not cite SC 1.4.3 or 1.4.11.
 *
 *   2. AN INOPERABLE EXIT. `headerContainer` is a later flex sibling than the header's
 *      `start` cell (@react-navigation/elements Header.tsx lays the header out as a row),
 *      so at AX5 its [32,0][343,128] cell hit-tests ABOVE the ✕ at [16,44][60,88], leaving
 *      16x44pt reachable. MEASURED, not derived: the same flow tapping `daily-loop-exit`
 *      reached home at content size `large` and did not at AX5, same binary, same device.
 *      On beat 1 nothing sits below the loop in the inner stack, so the ✕ is the only exit.
 *      That is SC 2.5.8 Target Size, which carries no "200%" qualifier and applies at the
 *      user's actual setting.
 *
 * WHY THE CHROME IS CAPPED AND THE BAND COMPUTED, rather than the band simply growing.
 * The band is the TOTAL header including the status inset, and the scene container loses
 * 1pt for every 1pt of band, so on this viewport the AX5 scroll viewport is `344 - band`.
 * An uncapped block (~191pt, band ~221) would cut that viewport from 242pt to ~82pt on a
 * beat whose purpose is to be typed into — trading a 1.4.4 loss of content for a loss of
 * functionality, which the SC does not accept. It would also break the gate: at AX5
 * `continue-button` is 169pt tall and Maestro's `scrollUntilVisible` only settles on a
 * 100%-visible element, so the band may not exceed 175 at all, and 123 is the ceiling that
 * still reserves one AX5 line of the pinned crisis support bar (crisis ruling, DEBUG-629).
 *
 * WHY CAPPING THIS TITLE IS NOT WHAT `practiceScreenHeaderLayout.ts` REFUSED. That file
 * declines to cap ITS title and gives a budget reason ("the header has none: it grows with
 * its content"). The real distinction is informational, and it must be stated here or a
 * future reader will harmonise the two constants and re-break one of them:
 * `PracticeScreenHeader`'s title is the practice's NAME — the only place a user learns
 * which of 20+ practices they opened. This header renders the fixed string `Daily Practice`
 * on every beat of one flow the user entered by tapping a card of the same name. It carries
 * no state, no instruction, and is not the accessible name of any control. That is
 * navigational chrome, in the `TAB_LABEL_MAX_FONT_SCALE` category — and unlike that
 * constant's 1.43, a cap at exactly 2.0 IS 1.4.4 conformance.
 *
 * The title STRING is frozen and the counter stays in the header at every scale
 * (philosopher ruling): `Daily Practice` is the practice's identity at four surfaces, and
 * a numeric progress token moved into the beat's content column would complete the
 * checklist conversion MAINT-564 AC4 exists to prevent — at AX5 the virtue grid is already
 * a single column. Note the overstrike is itself an AC4 breach arriving by geometry, which
 * that AC's `\d\s*(of|\/)\s*4` guard cannot see because the string is "3 of 3".
 */

import { spacing, typography, TOUCH_TARGETS } from '@/core/theme';

/** DEBUG-468's reclaimed band. Unchanged at the default size, and that is load-bearing:
 *  `daily-loop-quick-depth.yaml`'s hand-measured fold, `continue-button` and support-line
 *  y-ranges AND its `timeout: 25000` scroll budget are all anchored to it. */
export const DAILY_LOOP_HEADER_STYLE_HEIGHT_BASE = 72;

/**
 * Cap on the header's chrome — title, `n of m` counter, and the ✕ glyph. Set from WCAG
 * 2.2 SC 1.4.4 (text resizes to 200% without loss of content), which is also exactly where
 * this defect becomes an SC failure rather than a courtesy fix beyond the threshold.
 *
 * Must stay > 1: iOS SILENTLY IGNORES a `maxFontSizeMultiplier` below 1.0, and exactly 1.0
 * is `allowFontScaling={false}` wearing a different name (DEBUG-579) — either would restore
 * the defect with every arithmetic test still green. The test file asserts both bounds.
 */
export const DAILY_LOOP_HEADER_CHROME_MAX_FONT_SCALE = 2;

/** The ✕'s outer edge: `marginLeft` + its 44pt target. Declared here so the StyleSheet in
 *  DailyLoopNavigator and the title's reservation below cannot drift apart — MAINT-564
 *  recorded this coupling as a comment asking the next reader to "re-measure if that button
 *  changes", and a comment is not a mechanism. */
export const DAILY_LOOP_CLOSE_BUTTON_MARGIN_LEFT = spacing[16];
export const DAILY_LOOP_CLOSE_BUTTON_SIZE = TOUCH_TARGETS.minimum;
const CLOSE_BUTTON_OUTER_EDGE =
  DAILY_LOOP_CLOSE_BUTTON_MARGIN_LEFT + DAILY_LOOP_CLOSE_BUTTON_SIZE;

/** WCAG's 8pt minimum between adjacent targets (`core/theme/accessibility.ts` header). */
const MIN_TARGET_SPACING = spacing[8];

/**
 * `Daily Practice`'s measured advance at the default size: [130,42][245,63], so 115pt for
 * an 18pt font. The one estimate in this module, and the reason it is pinned as an
 * inequality in the test rather than trusted: at the 2.0 cap the title needs 230pt against
 * the 239pt this module reserves on the narrowest supported viewport (375pt — iOS 16.4
 * excludes the 320pt SE 1), a 9pt margin. A token move that erases it goes red there, and
 * the remedy is a two-line title budget, NOT a wider reservation: the ✕ owns that space.
 */
export const DAILY_LOOP_TITLE_ADVANCE_AT_1X = 115;

/**
 * Line-box ratios, PINNED FROM THE MEASURED BOUNDS ABOVE rather than derived from the
 * tokens' `lineHeight`: `micro` declares none, and iOS's natural leading compresses
 * relative to font size, so a computed ratio disagrees with the device at large sizes.
 * These only scale `growth()`; they cannot move the default band, because `growth(1)` is
 * the identity `block(1) - block(1)`.
 */
const TITLE_LINE_RATIO = 21 / typography.bodyLarge.size; // measured [130,42][245,63]
const COUNTER_LINE_RATIO = 15 / typography.micro.size; // measured [170,75][204,90]

/** The progress bar's own box: 4pt track plus the `spacing[4]` gap either side of it. */
const PROGRESS_BAR_BOX = spacing[4] + spacing[4] + spacing[4];

/**
 * The header's content block at a given font scale. Exported so the fix's PREMISE is
 * testable — `block(2.0) > DAILY_LOOP_HEADER_STYLE_HEIGHT_BASE` is what makes every other
 * assertion here non-vacuous.
 */
export function dailyLoopHeaderBlockHeight(fontScale: number): number {
  const s = Number.isFinite(fontScale) && fontScale > 0 ? fontScale : 1;
  return (
    Math.round(typography.bodyLarge.size * s * TITLE_LINE_RATIO) +
    PROGRESS_BAR_BOX +
    Math.round(typography.micro.size * s * COUNTER_LINE_RATIO)
  );
}

/**
 * The band. A DELTA with a floor, never a threshold branch: `growth(1) === 0` is an
 * identity, so the default size cannot drift no matter what the ratios above say.
 *
 * Deliberately not `onLayout`-driven — that adds a reflow the Maestro flows' scroll budgets
 * would race.
 */
export function dailyLoopHeaderStyleHeight(fontScale: number): number {
  if (!Number.isFinite(fontScale) || (fontScale as number) <= 0) {
    return DAILY_LOOP_HEADER_STYLE_HEIGHT_BASE;
  }
  const capped = Math.min(fontScale, DAILY_LOOP_HEADER_CHROME_MAX_FONT_SCALE);
  const growth = dailyLoopHeaderBlockHeight(capped) - dailyLoopHeaderBlockHeight(1);
  return DAILY_LOOP_HEADER_STYLE_HEIGHT_BASE + Math.max(0, growth);
}

/**
 * The title's horizontal reservation, so it can never share coordinates with the ✕.
 *
 * `maxWidth` ONLY at the call site, never `width`: the title cell sizes to its intrinsic
 * content (115pt at the default size, which is why MAINT-564's "96pt gain" is only partly
 * realised — `FlowProgressIndicator`'s `width: '100%'` bar resolves against that 115, not
 * the widened slot). Setting `width` would widen the default cell to 239 and take the bar
 * with it, changing default-size geometry and re-opening the ✕ collision at every size.
 */
export function dailyLoopHeaderTitleMaxWidth(windowWidth: number): number {
  return windowWidth - 2 * (CLOSE_BUTTON_OUTER_EDGE + MIN_TARGET_SPACING);
}
