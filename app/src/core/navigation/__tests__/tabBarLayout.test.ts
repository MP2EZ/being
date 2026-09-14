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
  TAB_BAR_BORDER_TOP_WIDTH,
  TAB_BAR_CONTENT_BOX,
  TAB_BAR_CONTENT_HEIGHT,
  TAB_ICON_BOX_HEIGHT,
  TAB_ITEM_BOTTOM_PADDING,
  TAB_ITEM_TOP_PADDING,
  TAB_LABEL_GAP,
  TAB_LABEL_LINE_HEIGHT,
  TAB_LABEL_MAX_FONT_SCALE,
  TAB_LABEL_MAX_LINE_HEIGHT,
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
    // Measured from @react-navigation/bottom-tabs@7.16.2 and now IMPORTED rather
    // than restated, so this case and DEBUG-579's cap cannot drift apart.
    // The label is load-bearing for WCAG 1.4.1 / 1.4.11 per DEBUG-342/356, so it
    // may not be clipped to make a smaller bar fit.
    //
    // DEBUG-579 corrected the bound: the children's box is TAB_BAR_CONTENT_BOX
    // (53), not TAB_BAR_CONTENT_HEIGHT (54). The bar's own borderTopWidth is set
    // on the same style object as its height and RN/Yoga is border-box, so it
    // comes out of the box the stack gets. 52 <= 53 held before and holds now;
    // the slack is 1pt, not the 2pt this file and tabBarLayout.ts both claimed.
    const required =
      TAB_ITEM_TOP_PADDING +
      TAB_ICON_BOX_HEIGHT +
      TAB_LABEL_GAP +
      TAB_LABEL_LINE_HEIGHT +
      TAB_ITEM_BOTTOM_PADDING;
    expect(required).toBeLessThanOrEqual(TAB_BAR_CONTENT_BOX);
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

/**
 * DEBUG-579 — the tab label's Dynamic Type scale is capped, and the cap is real.
 *
 * These are arithmetic, not a render: CleanTabNavigator cannot mount under jest
 * (react-native-svg via the icons, react-native-markdown-display via LearnScreen,
 * both outside transformIgnorePatterns) and jest.setup.js pins useSafeAreaInsets
 * to zero. That is the same reason tabBarLayout.ts exists at all.
 *
 * Arithmetic alone cannot prove the cap is APPLIED — a correct constant can ship
 * unreferenced with every case below green. The wiring pin lives in
 * CleanTabNavigator.accessibility.test.tsx and reads the file as source.
 */
describe('DEBUG-579 · the tab label cannot outgrow the bar', () => {
  // iOS UIContentSizeCategory multipliers (RCTAccessibilityManager.mm /
  // RCTUtils.mm). Named here because the interesting question is not "is the
  // cap self-consistent" but "where does it bite".
  const IOS_XL = 1.118;
  const IOS_XXL = 1.235;
  const IOS_XXXL = 1.353; // largest NON-accessibility step
  const IOS_AX1 = 1.786; // first accessibility step
  const IOS_AX5 = 3.571;

  const cappedStack = (scale: number) =>
    TAB_ITEM_TOP_PADDING +
    TAB_ICON_BOX_HEIGHT +
    TAB_LABEL_GAP +
    TAB_LABEL_LINE_HEIGHT * Math.min(scale, TAB_LABEL_MAX_FONT_SCALE);

  it('derives the box from the border, not from the declared height', () => {
    expect(TAB_BAR_BORDER_TOP_WIDTH).toBe(1);
    expect(TAB_BAR_CONTENT_BOX).toBe(TAB_BAR_CONTENT_HEIGHT - TAB_BAR_BORDER_TOP_WIDTH);
    expect(TAB_BAR_CONTENT_BOX).toBe(53);
  });

  it('spends the bottom padding and nothing else', () => {
    // The budget is the box less the pieces ABOVE the label. The bottom padding
    // is deliberately absent: growth runs downward (tabVerticalUiKit is
    // justifyContent: 'flex-start'), so it is the only slack available.
    expect(TAB_LABEL_MAX_LINE_HEIGHT).toBe(20);
    expect(TAB_LABEL_MAX_FONT_SCALE).toBeCloseTo(20 / 14, 5);
    // The top padding and icon box are NOT spent — a fix that took either would
    // move the icon, which ActiveTabIndicator's ruling forbids.
    expect(TAB_LABEL_MAX_LINE_HEIGHT).toBe(
      TAB_BAR_CONTENT_BOX - TAB_ITEM_TOP_PADDING - TAB_ICON_BOX_HEIGHT - TAB_LABEL_GAP,
    );
  });

  it('fits the box at the cap, with the label flush to its bottom edge', () => {
    // toBeCloseTo, not toBeLessThanOrEqual: 14 * (20/14) is 20 +/- 1 ULP.
    expect(cappedStack(IOS_AX5)).toBeCloseTo(TAB_BAR_CONTENT_BOX, 5);
    expect(cappedStack(IOS_AX5)).toBeLessThanOrEqual(TAB_BAR_CONTENT_BOX + 1e-9);
  });

  it('still scales — the cap is a ceiling, not a freeze', () => {
    // iOS SILENTLY IGNORES maxFontSizeMultiplier < 1.0 (RCTTextAttributes.mm:250-251),
    // and exactly 1.0 is allowFontScaling={false} in disguise, which AC4 forbids.
    // Without this assertion a future geometry change could restore the defect
    // with every other case in this file still green.
    expect(TAB_LABEL_MAX_FONT_SCALE).toBeGreaterThan(1);
    // Growth is untouched below the cap.
    expect(cappedStack(IOS_XL)).toBeGreaterThan(cappedStack(1));
  });

  it('does not bite before the accessibility sizes', () => {
    // The point of spending the bottom padding: xxxLarge is the largest size an
    // ordinary user reaches from Settings without turning on accessibility text,
    // and it must not regress. A 15pt budget would cap at ~1.07 and freeze the
    // label from xLarge upward.
    for (const scale of [IOS_XL, IOS_XXL, IOS_XXXL]) {
      expect(scale).toBeLessThanOrEqual(TAB_LABEL_MAX_FONT_SCALE);
    }
    expect(IOS_AX1).toBeGreaterThan(TAB_LABEL_MAX_FONT_SCALE);
  });

  it('LIVENESS — the uncapped stacks really do overflow (DEBUG-390)', () => {
    // A guard never observed failing is not a guard. Recompute the UNCAPPED
    // stack at the sizes the defect was measured at and assert it exceeds the
    // box, so this case goes red if the box, the icon, or the line height ever
    // move far enough to make the cap unnecessary.
    const uncapped = (scale: number) =>
      TAB_ITEM_TOP_PADDING +
      TAB_ICON_BOX_HEIGHT +
      TAB_LABEL_GAP +
      TAB_LABEL_LINE_HEIGHT * scale;
    expect(uncapped(IOS_AX1)).toBeGreaterThan(TAB_BAR_CONTENT_BOX);
    expect(uncapped(IOS_AX5)).toBeGreaterThan(TAB_BAR_CONTENT_BOX);
    // And the clamp is what makes the difference, not a coincidence of values.
    expect(Math.min(IOS_AX5, TAB_LABEL_MAX_FONT_SCALE)).toBe(TAB_LABEL_MAX_FONT_SCALE);
  });

  it('leaves the DEBUG-562 crisis-band invariant untouched', () => {
    // The cap spends slack INSIDE the box. The bar's outer height is unchanged,
    // so its top edge does not move and the flush 88 still holds.
    expect(getTabBarHeight(MAX_IOS_BOTTOM_INSET)).toBe(88);
    expect(TAB_BAR_CONTENT_HEIGHT).toBe(54);
  });
});
