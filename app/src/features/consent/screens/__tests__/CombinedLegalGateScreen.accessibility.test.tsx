/**
 * CombinedLegalGateScreen — crisis footer reachability (DEBUG-390)
 *
 * THE DEFECT. DEBUG-372 made `LegalGate` the route a dismissed cold-start
 * `being://crisis` deep link lands on. `RootCrisisButton.SUPPRESSED_ROUTES` holds
 * `LegalGate` on the justification that this screen "owns its own inline Call-988 /
 * Text UI" — but that footer was the LAST child of the main branch's `ScrollView`,
 * below a 150pt year picker, four consent cards and the Continue button. So the
 * post-dismiss state traded a persistent 1-tap 988 for a scroll-then-tap one.
 *
 * Measured before the fix (arithmetic over this file's stylesheet and the real
 * `@/core/theme` tokens, at 375pt content width): total content 1433pt against a
 * 759pt viewport on iPhone 15 — the 988 button's top edge at y=1366, i.e. 95.3% of
 * scroll depth, needing 642pt of scrolling (754pt on iPhone SE 3). At the largest
 * Dynamic Type setting (RN multiplier 3.571, `RCTUtils.mm:370-384`) that becomes
 * 6295-7039pt. The defect therefore reproduces at DEFAULT text size; Dynamic Type
 * only makes it worse.
 *
 * THE FIX (DEBUG-390): the footer is pinned OUTSIDE the `ScrollView`, as a sibling
 * after it inside `SafeAreaView`. `LegalGate` STAYS in `SUPPRESSED_ROUTES` — the
 * suppression is re-earned rather than withdrawn, because suppression is earned by
 * an affordance reachable WITHOUT SCROLLING, not by one that merely exists.
 *
 * WHY THE POSITION TEST IS THE LOAD-BEARING ONE. `__tests__/safety/crisis-zero-988-windows.test.tsx`
 * already asserted the footer EXISTS, and that assertion passed throughout the entire
 * period the bug was live. Existence was never the property in question. Test 1 below
 * is the assertion that would have gone red on the shipped defect, and it is what stops
 * a future refactor from silently re-nesting the footer inside the ScrollView.
 */

import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, within } from '@testing-library/react-native';
import { ScrollView, StyleSheet } from 'react-native';
import { colorSystem, getContrastRatio, TOUCH_TARGETS } from '@/core/theme';

jest.mock('@react-native-picker/picker', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Picker = ({ children, ...props }: never) => React.createElement(View, props, children);
  Picker.Item = (props: never) => React.createElement(View, props);
  return { Picker };
});

jest.mock('@/core/stores/consentStore', () => ({
  useConsentStore: () => ({ verifyAge: jest.fn() }),
  recordLegalGateConsents: jest.fn(),
}));

import CombinedLegalGateScreen from '../CombinedLegalGateScreen';

const SCREEN_PATH = path.join(__dirname, '../CombinedLegalGateScreen.tsx');
const source = fs.readFileSync(SCREEN_PATH, 'utf-8');

/**
 * Source with comments stripped, for assertions about what the screen DOES rather
 * than what it says. The screen's DEBUG-390 comments deliberately name the
 * anti-patterns below in prose to warn the next reader off them; asserting against
 * raw source flagged those warnings as violations.
 */
const code = source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const renderScreen = () =>
  render(<CombinedLegalGateScreen onComplete={jest.fn()} onUnderAge={jest.fn()} />);

/** The stylesheet block for a single named style, for source-level assertions. */
const styleBlock = (name: string): string => {
  const start = source.indexOf(`  ${name}: {`);
  if (start === -1) throw new Error(`style "${name}" not found in CombinedLegalGateScreen`);
  return source.slice(start, source.indexOf('\n  },', start));
};

describe('DEBUG-390 — the crisis footer is reachable without scrolling', () => {
  /**
   * THE contract. Queried by accessibilityLabel rather than testID on purpose: the
   * labels are pinned independently by the DEBUG-314 suite
   * (CombinedLegalGateScreen.crisis.test.tsx), so this assertion stays honest even
   * if the testIDs are renamed, and it fails on POSITION rather than on a missing
   * identifier.
   */
  it('does not render the 988 control inside the ScrollView', () => {
    const screen = renderScreen();
    const scrollView = screen.UNSAFE_getByType(ScrollView);

    expect(within(scrollView).queryByLabelText('Call 988')).toBeNull();
    expect(within(scrollView).queryByLabelText('Text Crisis Line')).toBeNull();
  });

  it('still renders both crisis controls on the main branch', () => {
    // Guards the opposite failure: a "fix" that scopes the footer to the under-age
    // branch, or drops it, would satisfy the position test above trivially.
    const screen = renderScreen();

    expect(screen.getByTestId('legal-gate-crisis-988')).toBeTruthy();
    expect(screen.getByTestId('legal-gate-crisis-text')).toBeTruthy();
  });
});

describe('DEBUG-390 — crisis footer touch targets', () => {
  /**
   * Measured before the fix: paddingVertical 8 (×2) + borderWidth 1 (×2) + one line
   * of bodySmall (14pt, no explicit lineHeight → ~16.7pt natural) = ~34.7pt tall.
   * That cleared WCAG 2.2 AA 2.5.8 (24×24) but failed 2.5.5 AAA / iOS HIG (44) and
   * the repo's own TOUCH_TARGETS.large (56), which names "Crisis buttons" as its
   * application. The sibling under-age controls already ship at minHeight 72.
   *
   * The file header at line 22 claimed "44px+ touch targets" throughout that period.
   */
  it.each([
    ['legal-gate-crisis-988'],
    ['legal-gate-crisis-text'],
  ])('%s meets the 44pt floor', (testID) => {
    const screen = renderScreen();
    const flattened = StyleSheet.flatten(screen.getByTestId(testID).props.style);

    // Assert the BAR, not the shipped value (56) — a later bump to 64 is benign and
    // must not turn this red.
    expect(flattened.minHeight).toBeGreaterThanOrEqual(TOUCH_TARGETS.minimum);
  });

  it('declares minHeight in the stylesheet rather than relying on content height', () => {
    // Style-object assertions alone can be satisfied by a value a later token change
    // silently drops. Mirrors the COLLAPSED_WIDTH_* source guard in
    // CollapsibleCrisisButton.accessibility.test.ts.
    expect(styleBlock('crisisFooterButton')).toContain('minHeight');
  });
});

describe('DEBUG-390 — the footer survives Dynamic Type', () => {
  /**
   * Independent of the fold defect, and more severe: `crisisFooterButtons` was
   * `flexDirection: 'row'` with NO `flexWrap`, and RN's default `flexShrink` is 0.
   * Intrinsic row width = 2 × (48 padding + 2 border + label) + 16 gap, which
   * exceeds the content column above font multiplier ~1.351 at 327pt width and
   * ~1.466 at 345pt. 1.351 is xxxLarge — the largest NON-accessibility Dynamic Type
   * setting, reachable from ordinary iOS Settings. `crisisFooter` is
   * `alignItems: 'center'`, so an over-wide row overflows BOTH edges and
   * UIScrollView clips them.
   *
   * Asserted from source, not from the rendered tree: jest does not run Yoga layout,
   * so there is no measured width to read. Same reasoning DEBUG-396 recorded for
   * asserting contrast from the token rather than off a rendered node.
   */
  it('allows the button row to wrap instead of clipping', () => {
    const block = styleBlock('crisisFooterButtons');
    expect(block).toContain("flexWrap: 'wrap'");
    expect(block).toContain("justifyContent: 'center'");
  });

  it('does not cap font scaling on the crisis labels', () => {
    // Anti-pattern guard. Capping text growth to solve the overflow above would
    // invert the priority — it shrinks the crisis affordance specifically. Wrap,
    // don't cap. (WCAG 1.4.4 requires 200% scaling support.)
    const footerStart = source.indexOf('styles.crisisFooter}');
    const footer = source.slice(footerStart, source.indexOf('</View>', footerStart) + 200);

    expect(footer).not.toContain('maxFontSizeMultiplier');
    expect(footer).not.toContain('allowFontScaling={false}');
  });
});

describe('DEBUG-390 — reading order is not forced', () => {
  /**
   * Anti-pattern guard, currently passing. Forcing the footer's VoiceOver position
   * with accessibilityViewIsModal (or hiding the ScrollView's descendants) would
   * trap VoiceOver in the footer and make the DOB picker and all four consent
   * controls unreachable — a consent-flow lockout dressed as an accessibility fix.
   *
   * Note what this test does NOT claim: it does not assert that the footer is
   * announced early. A footer declared after the ScrollView is still traversed
   * after its subtree, so this fix improves scroll reachability and touch
   * exploration, NOT sequential swipe order. Fixing traversal order is an app-wide
   * question about overlay declaration order and needs on-device VoiceOver; it is
   * deliberately not in DEBUG-390.
   */
  it.each([
    ['accessibilityViewIsModal', /accessibilityViewIsModal\s*[=:]/],
    ['accessibilityElementsHidden', /accessibilityElementsHidden\s*[=:]/],
    ['importantForAccessibility="no-hide-descendants"', /importantForAccessibility\s*=\s*["'{]?\s*["']?no-hide-descendants/],
  ])('does not use %s to force traversal', (_label, propUsage) => {
    // Prop usage (`prop=` / `prop:`) against comment-stripped source — see `code`.
    expect(code).not.toMatch(propUsage);
  });

  it('the anti-pattern assertion can actually fail', () => {
    // Guards the guard: comment-stripping plus a prop-shaped regex is exactly the
    // combination that can quietly match nothing at all.
    expect('accessibilityViewIsModal={true}').toMatch(/accessibilityViewIsModal\s*[=:]/);
    expect(code.length).toBeGreaterThan(1000);
  });
});

describe('DEBUG-390 — crisis footer contrast (regression guard)', () => {
  /**
   * Currently PASSING — recorded here so a future token re-point cannot quietly
   * break a control that is fine today. Measured: #991B1B on #FFFFFF = 8.310:1 for
   * both the label and the border.
   *
   * DEBUG-396's failure mode does not reach this footer: that one came from
   * COMPOSITING (FADED_OPACITY mixing the fill toward the backdrop on
   * IMMERSIVE_ROUTES). There is no opacity, no Animated.View and no compositing
   * anywhere here. What carries over from DEBUG-396 is its method — assert from the
   * source token, never off a rendered node.
   */
  it('clears 1.4.3 for the label and 1.4.11 for the border', () => {
    const ratio = getContrastRatio(colorSystem.status.critical, colorSystem.base.white);

    // 14pt at weight 600 is NOT "large text" under WCAG (needs 18.66pt, or 14pt at
    // 700+), so the 4.5:1 normal-text bar applies, not 3:1.
    expect(ratio).toBeGreaterThanOrEqual(4.5); // 1.4.3 text
    expect(ratio).toBeGreaterThanOrEqual(3); // 1.4.11 non-text border
  });
});
