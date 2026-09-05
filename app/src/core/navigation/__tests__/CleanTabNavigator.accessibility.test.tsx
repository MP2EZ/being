/**
 * DEBUG-356 — the active tab state is carried by a CONTAINER, not by the hue.
 *
 * The defect: active tab icon tints are `colorSystem.navigation.*` rendered on a
 * white tab bar (`CleanTabNavigator` sets `tabBarStyle.backgroundColor` to
 * `colorSystem.base.white`). Measured with the repo's own `getContrastRatio`:
 * navigation.insights #A8E6CF is 1.41:1 and navigation.home #FF6B9D is 2.68:1,
 * both under the WCAG 1.4.11 non-text bar of 3:1. An active tab icon is exactly
 * "visual information required to identify a UI component's state", and the
 * 1.4.11 "inactive component" exemption does not apply — that term means
 * DISABLED, and a tab is fully operable.
 *
 * Two corrections to the original report, verified against this file:
 *   - There are FOUR tabs (Home / Learn / Insights / Profile). There is no
 *     Exercises tab; `navigation.exercises` has zero consumers in app/src.
 *   - `navigation.learn` (3.44:1) and `base.midnightBlue` (14.16:1) already PASS.
 *     So two tints fail, not three.
 *
 * The fix moves the obligation off the hue entirely rather than darkening brand
 * colours. Every brand hex is preserved byte-for-byte; the focused icon is placed
 * on a dark container which is what now carries 1.4.11. This is the emphasis-side
 * corollary of the DEBUG-323 / FEAT-292 ruling that quieting is expressed
 * STRUCTURALLY rather than chromatically.
 *
 * FILE PATH IS LOAD-BEARING. `npm run test:accessibility` is
 * `jest --testPathPattern=accessibility`, so the filename must contain
 * "accessibility" or this never runs.
 */
import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

// Imported from its own module, NOT from CleanTabNavigator. Importing the
// navigator drags in the entire screen tree (react-native-svg, and through
// LearnScreen react-native-markdown-display), neither of which is in
// jest.config.js's transformIgnorePatterns — so the suite dies on an untransformed
// import before a single assertion runs. Mocking each transitive dependency would
// make this file fragile against changes in screens it does not test. The wrapper
// is presentational and self-contained, so it lives in its own module and is
// tested directly.
import { ACTIVE_TAB_CONTAINER, ActiveTabIndicator } from '../ActiveTabIndicator';
import { getContrastRatio } from '@/core/theme/accessibility';
import { colorSystem, semantic } from '@/core/theme';

/** WCAG 2.1 AA minimum for non-text / UI-component information (SC 1.4.11). */
const AA_NON_TEXT = 3.0;

/** The literal the navigator sets as the tab bar's own background. */
const TAB_BAR_SURFACE = colorSystem.base.white;

const flatten = (style: unknown): Record<string, unknown> =>
  Array.isArray(style)
    ? Object.assign({}, ...style.map(flatten))
    : ((style ?? {}) as Record<string, unknown>);

describe('DEBUG-356: the focused tab icon sits on a container', () => {
  it('wraps the icon when focused', () => {
    const { getByTestId } = render(
      <ActiveTabIndicator focused>
        <Text>icon</Text>
      </ActiveTabIndicator>,
    );
    const container = getByTestId('active-tab-container');
    expect(flatten(container.props.style).backgroundColor).toBe(ACTIVE_TAB_CONTAINER);
  });

  it('renders the icon bare when NOT focused', () => {
    // The container must be the thing that distinguishes selected from
    // unselected. If it rendered in both states it would carry no state at all.
    const { queryByTestId, getByText } = render(
      <ActiveTabIndicator focused={false}>
        <Text>icon</Text>
      </ActiveTabIndicator>,
    );
    expect(queryByTestId('active-tab-container')).toBeNull();
    expect(getByText('icon')).toBeTruthy();
  });
});

describe('DEBUG-356: the container carries 1.4.11, so the hues do not have to', () => {
  it('the container clears 3:1 against the tab bar surface', () => {
    // 14.16:1. Pinned as a floor rather than an equality so a DIFFERENT dark
    // token could be substituted, but a light one could not — which is the
    // property that matters. A soft grey pill is not available: the ramp offers
    // gray[300] 1.23:1, gray[400] 1.50:1 and gray[500] 1.98:1 (itself banned by
    // DEBUG-342), so the lightest legal container is already gray[600] at 4.61:1.
    const ratio = getContrastRatio(ACTIVE_TAB_CONTAINER, TAB_BAR_SURFACE);
    expect(ratio).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });

  it('the container token comes from the design system, not a bespoke hex', () => {
    // Mirrors the guard in theme-contrast.accessibility.test.ts. The app repo
    // cannot mint colour; if the container were an invented intermediate value
    // this whole fix would just relocate the original defect.
    expect(Object.values(colorSystem.base as Record<string, string>)).toContain(
      ACTIVE_TAB_CONTAINER,
    );
  });

  const glyphs: Array<[string, string]> = [
    ['navigation.home', colorSystem.navigation.home],
    ['navigation.learn', colorSystem.navigation.learn],
    ['navigation.insights', colorSystem.navigation.insights],
    ['text.inverse (Profile)', semantic.text.inverse],
  ];

  it('covers every tab (guards against a silently shrinking matrix)', () => {
    expect(glyphs).toHaveLength(4);
  });

  test.each(glyphs)('%s is legible ON the container', (name, glyph) => {
    const ratio = getContrastRatio(glyph, ACTIVE_TAB_CONTAINER);
    expect(`${name}: ${ratio >= AA_NON_TEXT}`).toBe(`${name}: true`);
  });

  it('Profile had to flip to inverse — its old tint IS the container colour', () => {
    // base.midnightBlue was the Profile active tint. On a midnightBlue container
    // it is 1.00:1, i.e. invisible. This pin records WHY that one call site
    // changed colour while the other three kept their brand hue, so a future
    // reader does not "restore" it.
    expect(getContrastRatio(colorSystem.base.midnightBlue, ACTIVE_TAB_CONTAINER)).toBeLessThan(
      AA_NON_TEXT,
    );
  });
});

describe('DEBUG-356: the underlying tints are still illegal on white (regression pin)', () => {
  // NEGATIVE PIN. This is what stops someone deleting the container in a future
  // refactor and believing the hues became legal on their own. It asserts the
  // defect still exists in the raw palette — because it does; the fix routed
  // around it rather than changing it. If the design system ever darkens these,
  // this test fails and should be deleted deliberately, not weakened.
  const failing: Array<[string, string]> = [
    ['navigation.home', colorSystem.navigation.home],
    ['navigation.insights', colorSystem.navigation.insights],
  ];

  test.each(failing)('%s alone still fails 3:1 on the white tab bar', (name, tint) => {
    const ratio = getContrastRatio(tint, TAB_BAR_SURFACE);
    expect(`${name}: ${ratio < AA_NON_TEXT}`).toBe(`${name}: true`);
  });

  it('navigation.learn was never part of the defect', () => {
    // The work item claimed "three of four" fail. Verified false: learn is
    // 3.44:1 and passes. Pinned so the corrected count survives.
    expect(getContrastRatio(colorSystem.navigation.learn, TAB_BAR_SURFACE)).toBeGreaterThanOrEqual(
      AA_NON_TEXT,
    );
  });
});

/**
 * DEBUG-579 — the label's font-scale cap is WIRED, not merely computed.
 *
 * tabBarLayout.test.ts proves the cap is arithmetically right. It cannot prove
 * the navigator uses it: delete the two props and every one of those cases stays
 * green while the defect is fully restored. The navigator cannot be rendered here
 * (see the note at the top of this file), so the only available evidence is the
 * source text — the same move CombinedLegalGateScreen.accessibility.test.tsx makes.
 *
 * COMMENTS ARE STRIPPED FIRST, and that is not defensive tidying (DEBUG-390).
 * The navigator deliberately names `allowFontScaling={false}` in prose to warn
 * the next reader off it, so a bare `not.toContain` on that string fails against
 * CORRECT code. Match prop-shaped patterns on comment-free source, and prove the
 * matcher still fires — a stripped-source regex is exactly the combination that
 * can silently match nothing at all.
 */
describe('DEBUG-579: the tab label cap reaches the component', () => {
  const NAVIGATOR_PATH = require('path').join(__dirname, '..', 'CleanTabNavigator.tsx');
  const raw = require('fs').readFileSync(NAVIGATOR_PATH, 'utf8');
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('strips comments without gutting the file', () => {
    // If this ever collapses, every assertion below passes or fails for the
    // wrong reason.
    expect(source.length).toBeGreaterThan(1000);
    expect(source).toContain('tabBarLabel');
  });

  it('applies the derived cap by name, never a literal', () => {
    expect(source).toMatch(/maxFontSizeMultiplier\s*=\s*\{\s*TAB_LABEL_MAX_FONT_SCALE\s*\}/);
    expect(source).toMatch(/TAB_LABEL_MAX_FONT_SCALE/);
    // A hardcoded 1.4 / 1.43 / 1.4286 would drift from tabBarLayout.ts silently.
    expect(source).not.toMatch(/maxFontSizeMultiplier\s*=\s*\{\s*[\d.]+\s*\}/);
  });

  it('clamps the label to one line', () => {
    // Load-bearing, not polish: the cap bounds the line BOX, so an unclamped
    // wrap is 2 x lineHeight x scale and defeats it.
    expect(source).toMatch(/numberOfLines\s*=\s*\{\s*1\s*\}/);
  });

  it('does not freeze Dynamic Type', () => {
    // The prose above this assertion's target names allowFontScaling={false} as
    // the REJECTED option; only comment-stripping makes this assertion honest.
    expect(source).not.toMatch(/allowFontScaling\s*=\s*\{\s*false\s*\}/);
    expect(source).not.toMatch(/adjustsFontSizeToFit/);
  });

  it('the matchers still fire (DEBUG-390)', () => {
    // Run each predicate over literal known-bad strings, so a regex that has
    // stopped matching anything cannot pass as a clean file.
    expect('maxFontSizeMultiplier={TAB_LABEL_MAX_FONT_SCALE}').toMatch(
      /maxFontSizeMultiplier\s*=\s*\{\s*TAB_LABEL_MAX_FONT_SCALE\s*\}/,
    );
    expect('maxFontSizeMultiplier={1.43}').toMatch(/maxFontSizeMultiplier\s*=\s*\{\s*[\d.]+\s*\}/);
    expect('numberOfLines={1}').toMatch(/numberOfLines\s*=\s*\{\s*1\s*\}/);
    expect('allowFontScaling={false}').toMatch(/allowFontScaling\s*=\s*\{\s*false\s*\}/);
    // And prove the stripper removes a comment mentioning the banned prop,
    // which is the specific false-failure this block is built to avoid.
    const withComment = 'const a = 1;\n// NOT allowFontScaling={false} — rejected\nconst b = 2;';
    const stripped = withComment.replace(/^\s*\/\/.*$/gm, '');
    expect(stripped).not.toMatch(/allowFontScaling\s*=\s*\{\s*false\s*\}/);
  });
});
