/**
 * DEBUG-803 (supersedes DEBUG-356) — the active tab state is carried by a
 * non-hue TOP-EDGE PILL, not by the icon hue and no longer by an enclosure.
 *
 * The defect DEBUG-356 found stands: active tab icon tints are
 * `colorSystem.navigation.*` rendered on a white tab bar
 * (`CleanTabNavigator` sets `tabBarStyle.backgroundColor` to
 * `colorSystem.base.white`). Measured with the repo's own `getContrastRatio`:
 * navigation.insights #A8E6CF is 1.41:1 and navigation.home #FF6B9D is 2.68:1,
 * both under the WCAG 1.4.11 non-text bar of 3:1; navigation.learn (3.44:1) and
 * base.midnightBlue (14.16:1) pass. There are FOUR tabs; `navigation.exercises`
 * has zero consumers in app/src.
 *
 * THE RULING (recorded in ActiveTabIndicator.tsx): a non-hue selected-state
 * indicator at >= 3:1 satisfies 1.4.11 on its own, and the icon tint need not
 * pass 3:1 because every tab keeps a visible text label (graphics duplicating
 * adjacent text are exempt). Conditions: (i) labels stay visible, (ii) the
 * indicator renders on the focused tab only, (iii) the indicator is not a hue.
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
// import before a single assertion runs. The indicator is presentational and
// self-contained, so it lives in its own module and is tested directly.
import {
  ACTIVE_TAB_GLYPH_TINT,
  ACTIVE_TAB_INDICATOR,
  ActiveTabIndicator,
} from '../ActiveTabIndicator';
import { TAB_ITEM_TOP_PADDING } from '../tabBarLayout';
import { getContrastRatio } from '@/core/theme/accessibility';
import { colorSystem, semantic } from '@/core/theme';

/** WCAG 2.1 AA minimum for non-text / UI-component information (SC 1.4.11). */
const AA_NON_TEXT = 3.0;

/** The literal the navigator sets as the tab bar's own background. */
const TAB_BAR_SURFACE = colorSystem.base.white;

/** The tab bar's hairline (`borderTopColor`) the pill is painted beneath. */
const TAB_BAR_HAIRLINE = colorSystem.gray[200];

const flatten = (style: unknown): Record<string, unknown> =>
  Array.isArray(style)
    ? Object.assign({}, ...style.map(flatten))
    : ((style ?? {}) as Record<string, unknown>);

const renderFocused = () =>
  render(
    <ActiveTabIndicator focused>
      <Text>icon</Text>
    </ActiveTabIndicator>,
  );

describe('DEBUG-803: the focused tab carries a top-edge indicator', () => {
  it('renders the indicator and the glyph when focused', () => {
    const { getByTestId, getByText } = renderFocused();
    const indicator = getByTestId('active-tab-indicator');
    expect(flatten(indicator.props.style).backgroundColor).toBe(ACTIVE_TAB_INDICATOR);
    expect(getByText('icon')).toBeTruthy();
  });

  it('renders the glyph bare, with NO indicator, when NOT focused', () => {
    // The indicator must be the thing that distinguishes selected from
    // unselected. If it rendered in both states it would carry no state at all.
    const { queryByTestId, getByText } = render(
      <ActiveTabIndicator focused={false}>
        <Text>icon</Text>
      </ActiveTabIndicator>,
    );
    expect(queryByTestId('active-tab-indicator')).toBeNull();
    expect(getByText('icon')).toBeTruthy();
  });

  it('puts no fill behind the glyph (AC1: the DEBUG-356 box is gone)', () => {
    // Walk the rendered host tree: the ONLY node allowed a backgroundColor is
    // the pill itself. Any filled ancestor of the glyph is the old enclosure.
    type Node = { props?: { testID?: string; style?: unknown }; children?: unknown[] | null };
    const filled: string[] = [];
    const walk = (node: unknown): void => {
      if (!node || typeof node === 'string') return;
      const n = node as Node;
      const bg = flatten(n.props?.style).backgroundColor;
      if (bg !== undefined) filled.push(n.props?.testID ?? '<unnamed>');
      (n.children ?? []).forEach(walk);
    };
    walk(renderFocused().toJSON());
    expect(filled).toEqual(['active-tab-indicator']);
  });

  it('is decorative: not accessible, hidden from a11y, and never a touch target', () => {
    const { getByTestId } = renderFocused();
    const indicator = getByTestId('active-tab-indicator');
    expect(indicator.props.accessible).toBe(false);
    expect(indicator.props.importantForAccessibility).toBe('no');
    expect(indicator.props.pointerEvents).toBe('none');
  });
});

describe('DEBUG-803: indicator geometry', () => {
  const style = () => flatten(renderFocused().getByTestId('active-tab-indicator').props.style);

  it('spans the whole 31x28 icon slot', () => {
    expect(style().width).toBe('100%');
  });

  it('is tall enough to see (>= 3pt) and fits the top padding it paints into', () => {
    const { height } = style() as { height: number };
    expect(height).toBeGreaterThanOrEqual(3);
    expect(height).toBeLessThanOrEqual(TAB_ITEM_TOP_PADDING);
  });

  it('is lifted by exactly the top padding, so it sits under the hairline', () => {
    expect(style().top).toBe(-TAB_ITEM_TOP_PADDING);
    expect(style().position).toBe('absolute');
  });

  it('adds no layering or elevation', () => {
    expect(style().zIndex).toBeUndefined();
    expect(style().elevation).toBeUndefined();
  });
});

describe('DEBUG-803: the indicator carries 1.4.11, so the hues do not have to', () => {
  it('clears 3:1 against the tab bar surface', () => {
    // 14.16:1. Pinned as a floor so a different dark token could be substituted,
    // but a light one could not — which is the property that matters.
    expect(getContrastRatio(ACTIVE_TAB_INDICATOR, TAB_BAR_SURFACE)).toBeGreaterThanOrEqual(
      AA_NON_TEXT,
    );
  });

  it('clears 3:1 against the gray[200] hairline it sits beneath', () => {
    // 12.99:1.
    expect(getContrastRatio(ACTIVE_TAB_INDICATOR, TAB_BAR_HAIRLINE)).toBeGreaterThanOrEqual(
      AA_NON_TEXT,
    );
  });

  it('the indicator token comes from the design system, not a bespoke hex', () => {
    // The app repo cannot mint colour; an invented intermediate value would just
    // relocate the original defect.
    expect(Object.values(colorSystem.base as Record<string, string>)).toContain(
      ACTIVE_TAB_INDICATOR,
    );
  });
});

describe('DEBUG-803: focused glyph tints', () => {
  const entries = Object.entries(ACTIVE_TAB_GLYPH_TINT);

  it('covers every tab (guards against a silently shrinking matrix)', () => {
    expect(entries).toHaveLength(4);
    expect(Object.keys(ACTIVE_TAB_GLYPH_TINT).sort()).toEqual(
      ['home', 'insights', 'learn', 'profile'],
    );
  });

  test.each([
    ['learn', ACTIVE_TAB_GLYPH_TINT.learn],
    ['profile', ACTIVE_TAB_GLYPH_TINT.profile],
  ])('%s glyph is legible (>= 3:1) on the white bar', (name, tint) => {
    const ratio = getContrastRatio(tint, TAB_BAR_SURFACE);
    expect(`${name}: ${ratio >= AA_NON_TEXT}`).toBe(`${name}: true`);
  });

  it('Profile focused tint is not white — white is invisible on the white bar', () => {
    expect(ACTIVE_TAB_GLYPH_TINT.profile).not.toBe(semantic.text.inverse);
    expect(ACTIVE_TAB_GLYPH_TINT.profile).toBe(colorSystem.base.midnightBlue);
  });

  it('home and insights keep their brand hex', () => {
    expect(ACTIVE_TAB_GLYPH_TINT.home).toBe(colorSystem.navigation.home);
    expect(ACTIVE_TAB_GLYPH_TINT.insights).toBe(colorSystem.navigation.insights);
  });
});

describe('DEBUG-803: recorded 1.4.11 exemption for home and insights glyphs', () => {
  // NEGATIVE PIN. These two tints still fail 3:1 on white (home 2.68:1, insights
  // 1.41:1). They are exempt by the ruling in ActiveTabIndicator.tsx — every tab
  // keeps a visible label, and the pill carries the state. This pin makes any
  // change a deliberate decision: if the design system ever darkens these, this
  // test fails and should be deleted deliberately, not weakened.
  const exempt: Array<[string, string]> = [
    ['home', ACTIVE_TAB_GLYPH_TINT.home],
    ['insights', ACTIVE_TAB_GLYPH_TINT.insights],
  ];

  test.each(exempt)('%s glyph alone still fails 3:1 on the white tab bar', (name, tint) => {
    const ratio = getContrastRatio(tint, TAB_BAR_SURFACE);
    expect(`${name}: ${ratio < AA_NON_TEXT}`).toBe(`${name}: true`);
  });
});

describe('DEBUG-803: the navigator reads the shared glyph-tint map', () => {
  // The navigator cannot be rendered here (see the note at the top), so pin the
  // wiring on comment-stripped source (DEBUG-390).
  const raw = require('fs').readFileSync(
    require('path').join(__dirname, '..', 'CleanTabNavigator.tsx'),
    'utf8',
  );
  const source = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  test.each(['home', 'learn', 'insights', 'profile'])(
    'the %s tabBarIcon reads ACTIVE_TAB_GLYPH_TINT.%s when focused',
    (tab) => {
      expect(source).toMatch(
        new RegExp(`color\\s*=\\s*\\{\\s*focused\\s*\\?\\s*ACTIVE_TAB_GLYPH_TINT\\.${tab}\\b`),
      );
    },
  );

  it('Profile no longer tints its focused glyph white', () => {
    expect(source).not.toMatch(/focused\s*\?\s*semantic\.text\.inverse/);
  });

  it('the matchers still fire', () => {
    expect('color={focused ? ACTIVE_TAB_GLYPH_TINT.home : x}').toMatch(
      /color\s*=\s*\{\s*focused\s*\?\s*ACTIVE_TAB_GLYPH_TINT\.home\b/,
    );
    expect('focused ? semantic.text.inverse : x').toMatch(/focused\s*\?\s*semantic\.text\.inverse/);
    expect(source.length).toBeGreaterThan(1000);
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
