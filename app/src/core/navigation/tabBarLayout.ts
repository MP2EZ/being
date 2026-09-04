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
 *   = 52, leaving 2pt of slack inside 54.
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
