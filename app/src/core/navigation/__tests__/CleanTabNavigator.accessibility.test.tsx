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
