/**
 * Tab bar geometry — DEBUG-562.
 *
 * WHY THIS MODULE EXISTS AT ALL
 * =============================
 * `CleanTabNavigator` cannot be rendered under jest: react-native-svg and
 * react-native-markdown-display sit outside `transformIgnorePatterns` (recorded
 * in `CleanTabNavigator.accessibility.test.tsx`), and `jest.setup.js` pins
 * `useSafeAreaInsets()` to all-zero insets globally. A 34pt-inset case is
 * therefore unobservable through the component. Extracting the arithmetic is the
 * only way this gets an assertion that runs in CI — the same move
 * `ActiveTabIndicator` already made, for the same reason.
 *
 * WHAT WAS WRONG
 * ==============
 * The bar hardcoded `height: 84` with `paddingBottom: spacing[8]`.
 * `@react-navigation/bottom-tabs@7.16.2` then overrode React Navigation twice:
 * `getTabBarHeight` early-returns on a numeric custom height, skipping its own
 * `TABBAR_HEIGHT_UIKIT (49) + inset` path; and the bar's style array is
 * `[{…, paddingBottom: insets.bottom}, tabBarStyle]`, last entry wins, so our
 * 8pt padding replaced the inset. On a 34pt-inset device the icon+label stack
 * was laid out into the home-indicator band. Observed live in MAINT-456's
 * 2026-08-20 captures (iPhone 16 Pro, iOS 18.6). On an iPhone SE 3 the inset is
 * 0, which is the only reason the old constant looked correct.
 *
 * THE AC2 COLLISION, AND WHY NEITHER OFFERED OPTION WAS TAKEN
 * ==========================================================
 * The item offered two resolutions and `crisis` review refused both:
 *
 *   GROW (height = 84 + inset = 118) leaves `CRISIS_BUTTON_BOTTOM_OFFSET.ios` at
 *   100, so 30pt of the FAB's touch band falls inside the bar. At `zIndex: 9999`
 *   the FAB WINS that tap: a wrong-DESTINATION navigation to `CrisisResources`
 *   that the user did not ask for, with the tab press swallowed. That is a crisis
 *   FALSE POSITIVE of DEBUG-547's class, on the app's most-used control. Its
 *   repair needs an inset-conditional crisis `bottom`, which
 *   `docs/development/crisis-button-keyboard-occlusion.md` (Status: RULED)
 *   forbids in terms: "The fix is not to move the button."
 *
 *   ABSORB (keep 84, spend the inset as padding) leaves a 50pt content box
 *   against a measured 56pt requirement, so the label clips — and the label is
 *   load-bearing for WCAG 1.4.1 / 1.4.11 per DEBUG-342/356, so it cannot be
 *   dropped to make it fit.
 *
 * SO: BOUNDED DERIVATION. The bar's top edge stays at a FIXED distance from the
 * screen bottom on every device; only the padding below the content grows. No
 * file under `features/crisis/` is touched, and every derived crisis constant
 * keeps its current value. If an implementation finds itself editing
 * `crisisButtonGeometry.ts`, stop and re-open the crisis pass.
 *
 * THE INVARIANT (asserted in __tests__/tabBarLayout.test.ts against the REAL
 * crisis constants, never against restated literals):
 *
 *     TAB_BAR_CONTENT_HEIGHT + MAX_IOS_BOTTOM_INSET
 *       <= CRISIS_BUTTON_BOTTOM_OFFSET.ios - CRISIS_BUTTON_HIT_SLOP
 *     i.e.  54 + 34 = 88  <=  100 - 12 = 88
 *
 * Flush, under the same half-open convention `intersectsCrisisButtonExclusion`
 * already uses: a control that ENDS exactly where the region begins does not
 * intersect.
 *
 * THE COST, STATED: on a 0-inset device (iPhone SE 3) the bar goes 84 -> 54.
 * That is a deliberate design decision, taken at batch approval. UIKit's own
 * base bar is 49, so this moves toward the platform norm rather than away.
 */

/**
 * Content box above the safe-area padding, in points.
 *
 * Sized to the real stack `@react-navigation/bottom-tabs@7.16.2` lays out:
 *   5 + 5   `tabVerticalUiKit { padding: 5 }` in BottomTabItem
 *   28      `ICON_SIZE_TALL` in TabBarIcon (library-owned — do NOT override it
 *           via tabBarIconStyle; ActiveTabIndicator records that doing so
 *           resizes both states and shifts the label)
 *   0       label gap (`spacing[0]`)
 *   14      `TAB_LABEL_LINE_HEIGHT`
 *   = 52, inside a 53pt CONTENT box.
 *
 * The content box is 53, not 54. `CleanTabNavigator` sets `borderTopWidth: 1` on
 * the same style object that carries `height`, and RN/Yoga is border-box, while
 * `paddingBottom: insets.bottom` consumes the inset exactly — so children get
 * `(54 + inset) - 1 - inset`. This comment claimed 2pt of slack until DEBUG-579;
 * the real figure is 1pt. Nothing was broken by it (52 <= 53), but the cap below
 * derives from the box, so the arithmetic had to be right first.
 *
 * The gap is `spacing[0]` rather than `spacing[4]` because the design-system
 * scale has no 2 (`0,4,8,12,…`) and 4 would put the stack at 56, over the 54
 * the invariant allows. A literal 2 would be a magic number.
 */
export const TAB_BAR_CONTENT_HEIGHT = 54;

/**
 * Pinned line box for the 12pt `typography.micro` label (~1.17 ratio).
 *
 * Explicit so the stack stops depending on the platform's default font metrics —
 * otherwise the 2pt of slack above is at the mercy of a font-metrics change, and
 * the failure mode is a clipped label rather than a loud error.
 */
export const TAB_LABEL_LINE_HEIGHT = 14;

/**
 * The largest bottom safe-area inset iOS reports for a home-indicator device.
 * The value MAINT-456's collision was measured at.
 */
/**
 * The bar's own top border, in points.
 *
 * `CleanTabNavigator` sets `borderTopWidth: 1` on the same style object as
 * `height`. Border-box sizing means it comes OUT of the declared height, so the
 * box children actually get is `TAB_BAR_CONTENT_HEIGHT` less this. Named rather
 * than folded into a literal so a border change moves the label cap with it.
 */
export const TAB_BAR_BORDER_TOP_WIDTH = 1;

/** Height available to the item stack, after the bar's own border. */
export const TAB_BAR_CONTENT_BOX = TAB_BAR_CONTENT_HEIGHT - TAB_BAR_BORDER_TOP_WIDTH;

/**
 * The library-owned pieces of the item stack, promoted from comments and test
 * locals so one edit moves the derivation, the invariant and the cap together.
 *
 * `tabVerticalUiKit { padding: 5 }` in BottomTabItem gives a top AND a bottom
 * padding; they are separate constants because DEBUG-579's cap deliberately
 * spends the BOTTOM one and must not touch the top.
 */
export const TAB_ITEM_TOP_PADDING = 5;
export const TAB_ITEM_BOTTOM_PADDING = 5;
/** `ICON_SIZE_TALL` in TabBarIcon — library-owned; see the warning above. */
export const TAB_ICON_BOX_HEIGHT = 28;
/** `spacing[0]`. The scale has no 2, and 4 would overflow the box. */
export const TAB_LABEL_GAP = 0;

/**
 * DEBUG-579 — the largest line box the label may grow to, and the multiplier
 * that enforces it.
 *
 * THE DEFECT. The `tabBarLabel` render prop set `fontSize` and `lineHeight` with
 * no `maxFontSizeMultiplier`, while the bar's height is fixed. iOS scales both by
 * one `effectiveFontSizeMultiplier`, so at accessibility sizes the stack outgrew
 * the box and — `tabVerticalUiKit` being `justifyContent: 'flex-start'` — spilled
 * DOWNWARD past the bar. Measured on iPhone SE 3 / iOS 18.6: clipped at the screen
 * edge from AX1, entirely below the bar at AX5.
 *
 * WHY THE BOTTOM PADDING IS SPENT. Preserving both paddings yields a 15pt budget
 * and a ~1.07 cap — below iOS's xLarge step (1.118), so the label would freeze at
 * the FIRST size above default. That is `allowFontScaling={false}` in all but
 * name, which the item explicitly refuses. Growing into the bottom padding
 * instead yields 20pt and ~1.43, which covers every non-accessibility size
 * including xxxLarge (1.353). The growth direction is what makes this safe: it
 * runs downward, AWAY from the crisis FAB's touch band. A fix that pushed label
 * pixels UPWARD out of the box — negative margin, `overflow: 'visible'`, absolute
 * positioning — would paint a target inside that band, where the FAB wins at
 * `zIndex: 9999`. Do not do that.
 *
 * WHY NOT A TALLER BAR. `TAB_BAR_CONTENT_HEIGHT` is flush against the FAB touch
 * band at the maximum inset (54 + 34 = 88 = offset 100 - hitSlop 12). Raising it
 * re-opens the collision DEBUG-562 settled. The cap spends slack that already
 * existed inside the box and adds nothing to the bar.
 *
 * THIS IS NOT WCAG 1.4.4 CONFORMANCE, and should not be recorded as such: 143%
 * is short of the 200% the SC asks. What makes it acceptable is that the status
 * quo fails 1.4.4 WORSE — uncapped, the label is off-screen well before 200%,
 * which is the loss of content the SC exists to forbid — and that the label is a
 * redundant cue, since DEBUG-356 moved the selected-state obligation onto
 * `ActiveTabIndicator`'s 14.16:1 focused enclosure. The residual gap is the iOS
 * Large Content Viewer, which RN does not expose.
 */
export const TAB_LABEL_MAX_LINE_HEIGHT =
  TAB_BAR_CONTENT_BOX - TAB_ITEM_TOP_PADDING - TAB_ICON_BOX_HEIGHT - TAB_LABEL_GAP;

/**
 * Derived, never a literal. Must stay > 1: iOS SILENTLY IGNORES a
 * `maxFontSizeMultiplier` below 1.0, and exactly 1.0 is `allowFontScaling={false}`
 * wearing a different name — either would restore the defect with every
 * arithmetic test still green. The test file asserts it.
 */
export const TAB_LABEL_MAX_FONT_SCALE = TAB_LABEL_MAX_LINE_HEIGHT / TAB_LABEL_LINE_HEIGHT;

export const MAX_IOS_BOTTOM_INSET = 34;

/**
 * Bar height for a given bottom safe-area inset.
 *
 * Non-finite or negative input falls back to the content height (DEBUG-299 house
 * rule): a NaN here would propagate into a style value and yield an
 * unpredictable bar instead of a loud failure.
 */
export function getTabBarHeight(bottomInset: number): number {
  if (typeof bottomInset !== 'number' || !Number.isFinite(bottomInset) || bottomInset < 0) {
    return TAB_BAR_CONTENT_HEIGHT;
  }
  return TAB_BAR_CONTENT_HEIGHT + bottomInset;
}
