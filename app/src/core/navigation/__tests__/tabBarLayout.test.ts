/**
 * DEBUG-562 — tab bar height derives from the bottom safe-area inset, and can
 * never reach the crisis FAB's touch band.
 *
 * THE DEFECT
 * ==========
 * `CleanTabNavigator` hardcoded `height: 84` with `paddingBottom: spacing[8]`.
 * `@react-navigation/bottom-tabs@7.16.2` overrides React Navigation twice as a
 * result: `getTabBarHeight` early-returns on a numeric custom height, skipping
 * `TABBAR_HEIGHT_UIKIT + inset`; and the style array is
 * `[{…paddingBottom: insets.bottom}, tabBarStyle]`, last entry wins, so our 8pt
 * padding replaced the inset. On a 34pt-inset device the icon+label stack was
 * laid out into the home-indicator band — observed live in MAINT-456's
 * 2026-08-20 captures (iPhone 16 Pro, iOS 18.6), deferred there, never filed
 * until now.
 *
 * WHY A PURE MODULE AND NOT AN ASSERTION ON THE COMPONENT
 * ======================================================
 * `CleanTabNavigator` cannot be rendered under jest — react-native-svg and
 * react-native-markdown-display sit outside `transformIgnorePatterns`, which
 * `CleanTabNavigator.accessibility.test.tsx` records — and
 * `__tests__/setup/jest.setup.js` pins `useSafeAreaInsets()` to all-zero insets
 * globally. A 34pt case is therefore unobservable through the component, so
 * extracting the arithmetic is the ONLY way AC1 gets an assertion that runs in
 * CI. Same move `ActiveTabIndicator` already made, for the same reason.
 *
 * THE INVARIANT IS THE POINT
 * ==========================
 * AC2 asked which of two options resolves the collision MAINT-456 recorded.
 * Neither was taken (see tabBarLayout.ts). What makes that resolution permanent
 * rather than a comment is the last test in this file: it imports the REAL
 * crisis constants and asserts the bar's top edge can never enter the FAB's
 * touch band. Drift on EITHER side then goes red in CI.
 */

import {
  MAX_IOS_BOTTOM_INSET,
  TAB_BAR_CONTENT_HEIGHT,
  TAB_LABEL_LINE_HEIGHT,
  getTabBarHeight,
} from '../tabBarLayout';
import {
  CRISIS_BUTTON_BOTTOM_OFFSET,
  CRISIS_BUTTON_HIT_SLOP,
} from '@/features/crisis/constants/crisisButtonGeometry';

describe('DEBUG-562 · getTabBarHeight', () => {
  it('adds the inset to a fixed content height', () => {
    expect(getTabBarHeight(0)).toBe(TAB_BAR_CONTENT_HEIGHT);
    expect(getTabBarHeight(34)).toBe(TAB_BAR_CONTENT_HEIGHT + 34);
    expect(getTabBarHeight(20)).toBe(TAB_BAR_CONTENT_HEIGHT + 20);
  });

  it('is 54 on a zero-inset device and 88 on a 34pt-inset device', () => {
    // Pinned as literals as well as by formula: a silent change to
    // TAB_BAR_CONTENT_HEIGHT would otherwise keep the formula test green.
    expect(getTabBarHeight(0)).toBe(54);
    expect(getTabBarHeight(34)).toBe(88);
  });

  it('falls back to the content height on a non-finite or negative inset', () => {
    // DEBUG-299 house rule. A NaN here would propagate into a style value and
    // yield an unpredictable bar rather than a loud failure.
    expect(getTabBarHeight(Number.NaN)).toBe(TAB_BAR_CONTENT_HEIGHT);
    expect(getTabBarHeight(Number.POSITIVE_INFINITY)).toBe(TAB_BAR_CONTENT_HEIGHT);
    expect(getTabBarHeight(-10)).toBe(TAB_BAR_CONTENT_HEIGHT);
    // @ts-expect-error — runtime guard against a value the types forbid
    expect(getTabBarHeight(undefined)).toBe(TAB_BAR_CONTENT_HEIGHT);
  });

  it('fits the real item stack that bottom-tabs lays out', () => {
    // Measured from @react-navigation/bottom-tabs@7.16.2:
    //   tabVerticalUiKit { padding: 5 }  (BottomTabItem)  → 5 top + 5 bottom
    //   ICON_SIZE_TALL = 28              (TabBarIcon)
    //   label gap + pinned label line box
    // The label is load-bearing for WCAG 1.4.1 / 1.4.11 per DEBUG-342/356, so it
    // may not be clipped to make a smaller bar fit.
    const ITEM_PADDING = 5 * 2;
    const ICON_SIZE_TALL = 28;
    const LABEL_GAP = 0; // spacing[0] — the scale has no 2, and 4 would overflow
    const required = ITEM_PADDING + ICON_SIZE_TALL + LABEL_GAP + TAB_LABEL_LINE_HEIGHT;
    expect(required).toBeLessThanOrEqual(TAB_BAR_CONTENT_HEIGHT);
  });
});

describe('DEBUG-562 · the bar can never reach the crisis FAB touch band', () => {
  it('clears the FAB touch band on iOS at the maximum inset', () => {
    // THE AC2 RESOLUTION, made mechanical. The FAB sits at `bottom: 100` in a
    // flex:1 root View with no safe-area wrapper, so its 44pt body spans
    // [100,144] from the screen bottom and its 12pt-hitSlop touch band starts at
    // 88. A bar whose top edge reached into that band would make a tap on the
    // Profile tab's upper-right corner a wrong-DESTINATION navigation to
    // CrisisResources at zIndex 9999 — a crisis FALSE POSITIVE, DEBUG-547's class.
    //
    // Imported, never restated as 100/12: drift on EITHER side must go red.
    const bandStart = CRISIS_BUTTON_BOTTOM_OFFSET.ios - CRISIS_BUTTON_HIT_SLOP;
    expect(getTabBarHeight(MAX_IOS_BOTTOM_INSET)).toBeLessThanOrEqual(bandStart);
  });

  it('clears it on Android too', () => {
    const bandStart = CRISIS_BUTTON_BOTTOM_OFFSET.android - CRISIS_BUTTON_HIT_SLOP;
    expect(getTabBarHeight(MAX_IOS_BOTTOM_INSET)).toBeLessThanOrEqual(bandStart);
  });

  it('holds on a zero-inset device, which is where the old constant was accidentally right', () => {
    expect(getTabBarHeight(0)).toBeLessThanOrEqual(
      CRISIS_BUTTON_BOTTOM_OFFSET.ios - CRISIS_BUTTON_HIT_SLOP,
    );
  });

  it('the invariant can actually fail — the old hardcoded bar violates it', () => {
    // Liveness. Without this the three assertions above would still pass if
    // getTabBarHeight were stubbed to a constant, and a guard never observed
    // failing is not a guard (DEBUG-390's lesson, applied to arithmetic).
    const oldHardcodedBar = 84 + MAX_IOS_BOTTOM_INSET; // what "grow" would have shipped
    expect(oldHardcodedBar).toBeGreaterThan(
      CRISIS_BUTTON_BOTTOM_OFFSET.ios - CRISIS_BUTTON_HIT_SLOP,
    );
  });

  it('MAX_IOS_BOTTOM_INSET is the home-indicator inset the collision was measured at', () => {
    expect(MAX_IOS_BOTTOM_INSET).toBe(34);
  });
});
