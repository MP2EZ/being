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
import { fireEvent, render, within } from '@testing-library/react-native';
import { Linking, ScrollView, StyleSheet } from 'react-native';
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

/**
 * DEBUG-430 — the Terms and Privacy links are reachable by screen reader.
 *
 * THE DEFECT. Both consent rows are a `Pressable` with
 * `accessibilityRole="checkbox"` and no `accessible` prop, and
 * `Pressable.js:252` reads `accessible: accessible !== false` — so they default
 * to `accessible={true}`, which collapses the whole subtree into ONE
 * accessibility element on iOS. The inline `<Text onPress>` document links get
 * no node of their own: VoiceOver cannot focus them, and a double-tap anywhere
 * in the row fires the PARENT's onPress, toggling the checkbox instead of
 * opening the document.
 *
 * There is no second route on this screen — `styles.linkRow` was declared and
 * rendered nowhere, and the other `linkText` uses are on the under-age branch a
 * passing user never sees. So a screen-reader user was asked to give
 * sensitive-data consent to documents the app gave them no way to read.
 *
 * THE FIX ports FEAT-376's shipped `ReConsentScreen` shape: `accessibilityActions`
 * surfacing in VoiceOver's Actions rotor and TalkBack's local context menu, which
 * preserves both the checkbox semantics and the inline-link visual design.
 *
 * WHAT THESE ASSERTIONS ARE FOR. Jest renders the tree; it does NOT model iOS
 * accessibility-element collapsing, which is precisely why no existing test
 * caught this. So these pin the DECLARED CONTRACT — the props and the handler
 * behaviour — and cannot prove a rotor traversal. Real VoiceOver/TalkBack
 * confirmation is device work and is not claimed here.
 */
describe('DEBUG-430 — the document links are reachable by screen reader', () => {
  /** Query by label, never by getAllByRole index: this screen has FOUR checkboxes. */
  const box = (screen: ReturnType<typeof renderScreen>, label: string) =>
    screen.getByLabelText(label);

  /**
   * FEAT-470 appended a `, required` / `, optional` suffix to every consent label.
   * That suffix is load-bearing, not cosmetic: it is the one required/optional
   * channel a user cannot switch off (iOS lets hint speech be disabled and TalkBack
   * truncates hints), following AccessibleInput.tsx:86's `${label}, required` shape.
   * These constants carry it so the lookup stays an EXACT match — a substring match
   * here would silently keep passing if the suffix were later dropped.
   */
  const TOS = 'I agree to the Terms of Service, required';
  const PRIVACY = 'I agree to the Privacy Policy, required';

  beforeEach(() => {
    // Linking.openURL is a shared global jest.fn; without this the openURL
    // assertions bleed across cases in this file, which has no clearAllMocks.
    jest.clearAllMocks();
  });

  it('exposes an open-document action on both linked checkboxes', () => {
    const screen = renderScreen();

    for (const [label, actionLabel] of [
      [TOS, 'Open Terms of Service'],
      [PRIVACY, 'Open Privacy Policy'],
    ]) {
      const actions = box(screen, label).props.accessibilityActions as
        | { name: string; label?: string }[]
        | undefined;
      expect(actions).toBeDefined();
      expect(actions?.map((a) => a.name)).toEqual(
        expect.arrayContaining(['activate', 'openDocument'])
      );
      expect(actions?.map((a) => a.label)).toEqual(expect.arrayContaining([actionLabel]));
    }
  });

  it('opens the document when the custom action fires — without toggling consent', () => {
    // Two properties in one case, deliberately: opening a document must not
    // silently tick a consent box. That would be a worse defect than the one
    // being fixed, on the screen where it matters most.
    const screen = renderScreen();
    const tos = box(screen, TOS);
    expect(tos.props.accessibilityState.checked).toBe(false);

    fireEvent(tos, 'accessibilityAction', { nativeEvent: { actionName: 'openDocument' } });

    expect(Linking.openURL).toHaveBeenCalledWith('https://being.fyi/terms');
    expect(box(screen, TOS).props.accessibilityState.checked).toBe(false);

    fireEvent(box(screen, PRIVACY), 'accessibilityAction', {
      nativeEvent: { actionName: 'openDocument' },
    });
    expect(Linking.openURL).toHaveBeenCalledWith('https://being.fyi/privacy');
  });

  it('still toggles the checkbox on the activate action', () => {
    // THE TRAP GUARD. On Android, declaring `activate` maps to ACTION_CLICK and
    // ReactAccessibilityDelegate returns true WITHOUT calling super, so the
    // View's own click handling is bypassed and TalkBack activation depends
    // entirely on the JS handler's fallthrough. If that fallthrough is ever
    // rewritten as a `switch` without a default, the consent checkboxes become
    // untickable by TalkBack while every touch test still passes — a consent
    // lockout on the gate that blocks the whole app.
    const screen = renderScreen();

    fireEvent(box(screen, TOS), 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });
    expect(box(screen, TOS).props.accessibilityState.checked).toBe(true);

    fireEvent(box(screen, PRIVACY), 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });
    expect(box(screen, PRIVACY).props.accessibilityState.checked).toBe(true);
  });

  it('routes touch and screen-reader activation through ONE callback', () => {
    // WHY THIS IS STRUCTURAL AND NOT BEHAVIOURAL. This screen's onPress does TWO
    // things — the toggle AND setError(null) — where ReConsentScreen's is a bare
    // toggle, so a verbatim port of FEAT-376 would wire only the boolean flip and
    // let screen-reader activation diverge from touch. But the divergence cannot
    // be observed from the outside today: the error banner is only raised by
    // handleContinue, and the Continue button is `disabled` until a year is
    // selected AND all four consents are ticked, so those two setError guards are
    // currently unreachable defensive code. The parity still has to be pinned,
    // because it becomes observable the moment that disabled condition changes.
    //
    // So: assert both props reference the SAME hoisted callback identity.
    for (const cb of ['toggleTos', 'togglePrivacy']) {
      expect(code).toMatch(new RegExp(`onPress=\\{${cb}\\}`));
      expect(code).toMatch(new RegExp(`onAccessibilityAction=\\{onDocumentAction\\([A-Z_]+,\\s*${cb}\\)\\}`));
    }
    // Guard the guard (DEBUG-390): comment-stripping plus a narrow regex is the
    // combination that can silently match nothing, so prove the matcher fires
    // against a known-good literal and that the stripped source is non-trivial.
    expect(/onPress=\{toggleTos\}/.test('<Pressable onPress={toggleTos} />')).toBe(true);
    expect(code.length).toBeGreaterThan(1000);
  });

  it('keeps the inline link and the rotor action pointed at the same URL', () => {
    // The rotor action duplicates a destination that is also hard-coded in the
    // inline <Text onPress>. Two literals is exactly the drift a second call
    // site invites, so both must resolve through one constant.
    expect(code).toMatch(/const TERMS_URL\s*=\s*'https:\/\/being\.fyi\/terms'/);
    expect(code).toMatch(/const PRIVACY_URL\s*=\s*'https:\/\/being\.fyi\/privacy'/);
    // Guard the guard (DEBUG-390): prove the comment-stripped source is not
    // trivially empty and the matcher can still fire.
    expect(code.length).toBeGreaterThan(1000);
    expect(/const TERMS_URL\s*=\s*'https:\/\/being\.fyi\/terms'/.test('const TERMS_URL = \'https://being.fyi/terms\';')).toBe(true);
  });
});

/**
 * FEAT-470 — the required/optional split is discoverable by a screen reader.
 *
 * WHY THIS IS AN ACCESSIBILITY CONCERN AND NOT A COSMETIC ONE. Before FEAT-470 all
 * four consent checkboxes were required and visually identical, so uniformity was
 * itself the information. Now three are required and one is not, with nothing in the
 * rendered tree distinguishing them unless it is put there deliberately. A
 * screen-reader user who cannot tell which box is optional has strictly less
 * information than a sighted one — and the whole point of the change is that
 * refusing the optional box is a real choice.
 *
 * THREE CHANNELS, asserted separately because each fails independently:
 *   - `accessibilityLabel` suffix — cannot be disabled by the user;
 *   - `accessibilityHint` — CAN be disabled on iOS and truncated by TalkBack, so it
 *     may never be the sole carrier of load-bearing information;
 *   - a visible group heading with `accessibilityRole="header"` — navigable by the
 *     headings rotor, which no per-control property can substitute for.
 */
describe('FEAT-470 — required vs optional is exposed on three channels', () => {
  const REQUIRED_LABELS = [
    'I agree to the Terms of Service, required',
    'I agree to the Privacy Policy, required',
    'I understand Being provides wellness support, not medical care, and in a crisis I will call 911 or 988, required',
  ];

  it('suffixes every mandatory checkbox label with ", required"', () => {
    const screen = renderScreen();
    for (const label of REQUIRED_LABELS) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
  });

  /**
   * Queried by label regex, not by walking up from the testID: the indicator View
   * carrying `legal-consent-mh-processing` is not the node holding the
   * accessibility props, and a `.parent` hop is brittle against any change in the
   * Pressable's host-component nesting.
   */
  const art9Box = (screen: ReturnType<typeof renderScreen>) =>
    screen.getByLabelText(/^I explicitly consent to Being processing my personal wellness data/);

  it('suffixes the Art. 9 checkbox label with ", optional" and never ", required"', () => {
    const screen = renderScreen();
    expect(art9Box(screen).props.accessibilityLabel).toMatch(/, optional$/);
    expect(art9Box(screen).props.accessibilityLabel).not.toMatch(/, required/);
  });

  it('gives the three mandatory boxes a "Required to continue" hint', () => {
    const screen = renderScreen();
    for (const label of REQUIRED_LABELS) {
      expect(screen.getByLabelText(label).props.accessibilityHint).toBe('Required to continue');
    }
  });

  it('leads the Art. 9 hint with "Optional" rather than burying it', () => {
    // The repo convention for optional controls is to lead with the word, so a
    // truncating screen reader still conveys the operative fact.
    const screen = renderScreen();
    expect(art9Box(screen).props.accessibilityHint).toMatch(/^Optional\b/);
  });

  it('marks both group headings with accessibilityRole="header"', () => {
    const screen = renderScreen();
    for (const heading of ['Required to continue', 'Optional']) {
      const node = screen.getByText(heading);
      expect(node.props.accessibilityRole).toBe('header');
    }
  });

  it('does not rely on the hint alone — the label carries the split too', () => {
    // Guards the guard: if a future edit moved the required/optional marker into
    // the hint only, every assertion above except this one would still pass.
    const screen = renderScreen();
    const withHintsDisabled = art9Box(screen).props.accessibilityLabel ?? '';
    expect(withHintsDisabled).toContain('optional');
  });
});

/**
 * FEAT-470 — the Continue button explains why it is disabled.
 *
 * A disabled button with no hint tells a screen-reader user nothing about what to
 * do next, and this screen now has two independent blockers (birth year, and the
 * three required acceptances). The count must name THREE, never four: naming the
 * Art. 9 tick as a blocker would re-imply it is mandatory, which is the exact
 * defect FEAT-470 removes.
 */
describe('FEAT-470 — the Continue hint counts only the three required items', () => {
  const continueBtn = (screen: ReturnType<typeof renderScreen>) =>
    screen.getByTestId('legal-gate-continue');

  const tick = (screen: ReturnType<typeof renderScreen>, testID: string) => {
    const pressable = screen.getByTestId(testID).parent;
    if (!pressable) throw new Error(`no pressable ancestor for ${testID}`);
    fireEvent.press(pressable);
  };

  it('reports three remaining when nothing is ticked', () => {
    const screen = renderScreen();
    expect(continueBtn(screen).props.accessibilityHint).toMatch(/3 remaining/);
  });

  it('counts down as required items are ticked, ignoring the Art. 9 tick', () => {
    const screen = renderScreen();
    tick(screen, 'legal-consent-tos');
    expect(continueBtn(screen).props.accessibilityHint).toMatch(/2 remaining/);

    // Ticking the OPTIONAL box must not change the count. If it did, the hint would
    // be describing a four-item gate that no longer exists.
    tick(screen, 'legal-consent-mh-processing');
    expect(continueBtn(screen).props.accessibilityHint).toMatch(/2 remaining/);

    tick(screen, 'legal-consent-privacy');
    expect(continueBtn(screen).props.accessibilityHint).toMatch(/1 remaining/);
  });

  it('never says "four" anywhere in the disabled-state hint', () => {
    const screen = renderScreen();
    expect(continueBtn(screen).props.accessibilityHint).not.toMatch(/four|4 remaining/i);
  });

  it('switches to the birth-year reason once all three required items are ticked', () => {
    const screen = renderScreen();
    for (const id of ['legal-consent-tos', 'legal-consent-privacy', 'legal-consent-wellness']) {
      tick(screen, id);
    }
    // Consents satisfied, year still unset — the hint must name the real blocker.
    expect(continueBtn(screen).props.accessibilityHint).toMatch(/birth year/i);
  });
});

/**
 * FEAT-470 — the error banner reaches Android too.
 *
 * `announceForAccessibility` at the setError sites covers iOS, which has no trait
 * that auto-announces an alert. Android needs the live region. Before this change
 * the banner had neither prop, so Android users were shown an error they were never
 * told about.
 */
describe('FEAT-470 — the error banner is announced on both platforms', () => {
  it('declares role="alert" and an assertive live region on the error text', () => {
    // Source-level: the banner renders only when `error` is set, and the guard that
    // sets it is unreachable defensive code (Continue is disabled on the same
    // condition), so there is no render path to assert against.
    const banner = code.slice(code.indexOf('{error && ('), code.indexOf('Continue Button'));
    expect(banner).toMatch(/accessibilityRole="alert"/);
    expect(banner).toMatch(/accessibilityLiveRegion="assertive"/);
  });

  it('proves that matcher can fail', () => {
    expect(/accessibilityRole="alert"/.test('<Text style={styles.errorText}>')).toBe(false);
    expect(/accessibilityRole="alert"/.test('accessibilityRole="alert"')).toBe(true);
  });

  it('keeps the visible and announced error strings aligned on the count', () => {
    // These two strings drifted before (only the visible one said "to continue").
    // A screen-reader user hearing a different count than the screen shows is the
    // failure this pins.
    const guard = code.slice(code.indexOf('if (!requiredConsentsTicked)'));
    const visible = guard.match(/setError\('([^']+)'\)/)?.[1];
    const announced = guard.match(/announceForAccessibility\(\s*'([^']+)'/)?.[1];
    expect(visible).toBeDefined();
    expect(announced).toBeDefined();
    expect(visible).toMatch(/three/);
    expect(announced).toContain(visible as string);
  });
});
