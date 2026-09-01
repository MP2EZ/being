/**
 * DEBUG-575 — the focus trap for root-slot overlays lives on the navigator host,
 * and the crisis affordances stay OUTSIDE it.
 *
 * The defect this pins against: `accessibilityViewIsModal` on an overlay
 * published into `RootOverlaySlot` pruned both `RootCrisisButton` and
 * `CrisisKeyboardAccessory` out of the accessibility tree, because the slot
 * renders a bare fragment and the overlay is therefore their direct native
 * SIBLING. Measured on the gate sim: zero `crisis-button-root` nodes with the
 * weekly-reflection composer open, one again once dismissed, with the button
 * painted on screen the whole time. A zero-988 state for assistive technology
 * that no screenshot and no `<Modal>` guard could catch.
 *
 * `modalOcclusionConversions.test.tsx` pins the negative half (the two slot
 * composers must NOT set the prop). This file pins the positive half: something
 * still traps focus, and it excludes the crisis affordances.
 *
 * WHY THE WIRING IS PINNED FROM SOURCE. `CleanRootNavigator` cannot be rendered
 * here — importing it drags in the whole screen tree and several transitive deps
 * sit outside `transformIgnorePatterns`, the same constraint
 * `CleanTabNavigator.accessibility.test.tsx` records. The host component itself
 * is therefore tested behaviourally, and only its PLACEMENT is read from source.
 * Comments are stripped first: `CleanRootNavigator` and both composers now carry
 * prose naming this anti-pattern, which is exactly the DEBUG-390 collision where
 * a bare identifier match fails on correct code.
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { Text } from 'react-native';
import { render, act } from '@testing-library/react-native';

import NavigatorA11yHost from '@/core/navigation/NavigatorA11yHost';
import {
  useRootOverlayStore,
  useIsRootOverlayOccupied,
} from '@/core/navigation/rootOverlaySlot';

const navigatorSource = fs.readFileSync(
  path.join(__dirname, '..', '..', 'src', 'core', 'navigation', 'CleanRootNavigator.tsx'),
  'utf8',
);

/** Source with block and line comments removed (DEBUG-390). */
const stripped = navigatorSource
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('DEBUG-575 · NavigatorA11yHost hides its subtree on demand', () => {
  it('hides descendants from assistive tech while an overlay holds the slot', () => {
    const { getByTestId } = render(
      <NavigatorA11yHost hidden>
        <Text>navigator</Text>
      </NavigatorA11yHost>,
    );
    // `includeHiddenElements` is REQUIRED here and is itself evidence: RNTL
    // excludes accessibility-hidden nodes from queries by default, so the host
    // is only findable this way precisely BECAUSE the hiding took effect. A
    // future regression that drops the props makes the plain query start
    // working — which is why the sibling test below asserts the enabled case
    // with a plain query.
    const host = getByTestId('navigator-a11y-host', { includeHiddenElements: true });
    // Both platforms. accessibilityViewIsModal is iOS-only and was never the
    // right tool here; importantForAccessibility is what carries Android, where
    // nothing trapped focus at all before this.
    expect(host.props.accessibilityElementsHidden).toBe(true);
    expect(host.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('leaves the subtree fully reachable when the slot is empty', () => {
    const { getByTestId } = render(
      <NavigatorA11yHost hidden={false}>
        <Text>navigator</Text>
      </NavigatorA11yHost>,
    );
    // Plain query, deliberately: with the slot empty the navigator must be
    // reachable by assistive tech, so RNTL must find it without the escape hatch.
    const host = getByTestId('navigator-a11y-host');
    expect(host.props.accessibilityElementsHidden).toBe(false);
    expect(host.props.importantForAccessibility).toBe('auto');
  });

  it('never sets accessibilityViewIsModal — that is the defect, not the fix', () => {
    const { getByTestId } = render(
      <NavigatorA11yHost hidden>
        <Text>navigator</Text>
      </NavigatorA11yHost>,
    );
    expect(
      getByTestId('navigator-a11y-host', { includeHiddenElements: true }).props
        .accessibilityViewIsModal,
    ).not.toBe(true);
  });
});

describe('DEBUG-575 · slot occupancy drives the trap', () => {
  afterEach(() => {
    act(() => useRootOverlayStore.getState().release('probe'));
  });

  const Probe: React.FC = () => (
    <Text testID="occupied">{String(useIsRootOverlayOccupied())}</Text>
  );

  it('is false with an empty slot and true once an overlay claims it', () => {
    const { getByTestId } = render(<Probe />);
    expect(getByTestId('occupied').props.children).toBe('false');

    act(() => useRootOverlayStore.getState().claim('probe', <Text>o</Text>));
    expect(getByTestId('occupied').props.children).toBe('true');

    act(() => useRootOverlayStore.getState().release('probe'));
    expect(getByTestId('occupied').props.children).toBe('false');
  });
});

describe('DEBUG-575 · the crisis affordances are outside the host', () => {
  // The load-bearing structural claim. If any crisis affordance moved INSIDE the
  // host, hiding the navigator would hide 988 too — reintroducing the very
  // zero-affordance state this fix removes, and the flow would not catch it
  // because the flow asserts the button is reachable while the sheet is up,
  // which is exactly when the host is hidden.
  const idx = (needle: string) => stripped.indexOf(needle);

  it('wraps the Stack.Navigator, and only the Stack.Navigator', () => {
    const hostOpen = idx('<NavigatorA11yHost');
    const navOpen = idx('<Stack.Navigator');
    const navClose = idx('</Stack.Navigator>');
    const hostClose = idx('</NavigatorA11yHost>');

    expect(hostOpen).toBeGreaterThan(-1);
    expect(hostClose).toBeGreaterThan(-1);
    expect(hostOpen).toBeLessThan(navOpen);
    expect(navClose).toBeLessThan(hostClose);
  });

  it('leaves the slot and both crisis affordances outside it', () => {
    const hostClose = idx('</NavigatorA11yHost>');
    for (const affordance of [
      '<RootOverlaySlot',
      '<RootCrisisBoundary',
      '<CrisisKeyboardAccessory',
    ]) {
      const at = idx(affordance);
      expect(at).toBeGreaterThan(-1);
      // After the host closes ⇒ not a descendant of it.
      expect(at).toBeGreaterThan(hostClose);
    }
  });

  it('drives the host from slot occupancy, not from a route or local state', () => {
    expect(stripped).toMatch(/<NavigatorA11yHost\s+hidden=\{rootOverlayOccupied\}/);
    expect(stripped).toMatch(/const rootOverlayOccupied = useIsRootOverlayOccupied\(\)/);
  });

  it('the source assertions above can still fail (DEBUG-390 control)', () => {
    // Prove each matcher fires against a literal known-bad string, and that the
    // stripper did not eat the file — a vacuous `indexOf` of -1 would otherwise
    // make the ordering assertions silently meaningless.
    expect('<NavigatorA11yHost hidden={rootOverlayOccupied}>').toMatch(
      /<NavigatorA11yHost\s+hidden=\{rootOverlayOccupied\}/,
    );
    expect('const rootOverlayOccupied = useIsRootOverlayOccupied();').toMatch(
      /const rootOverlayOccupied = useIsRootOverlayOccupied\(\)/,
    );
    expect(stripped.length).toBeGreaterThan(1000);
    expect(stripped).toContain('CleanRootNavigator');
    // And that comment-stripping actually ran: the prose naming the anti-pattern
    // is present in the raw file and absent from the stripped one.
    expect(navigatorSource).toContain('accessibilityViewIsModal');
    expect(stripped).not.toContain('accessibilityViewIsModal');
  });
});
