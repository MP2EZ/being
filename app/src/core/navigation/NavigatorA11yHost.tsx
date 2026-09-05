/**
 * Accessibility focus-trap host for root-slot overlays (DEBUG-575).
 *
 * Wraps the navigator subtree and hides it from assistive technology while an
 * overlay holds the root slot. This is where the focus trap for every root-slot
 * overlay lives — NOT on the overlay itself.
 *
 * ── WHY NOT `accessibilityViewIsModal` ON THE OVERLAY ──
 *
 * `RootOverlaySlot` renders a bare fragment, so a published overlay is a direct
 * native SIBLING of `RootCrisisButton` and `CrisisKeyboardAccessory`. That prop
 * prunes the RECEIVER'S SIBLINGS from the accessibility tree, so setting it on
 * the overlay removed both root crisis affordances. Measured on the gate sim:
 * zero `crisis-button-root` nodes in the hierarchy with the weekly-reflection
 * composer open, one again the moment it closed, with the button plainly painted
 * on screen throughout. Tree-level occlusion no screenshot can catch.
 *
 * Hiding the navigator subtree instead confines assistive technology to the
 * overlay PLUS the crisis affordances, which is the trap that was actually
 * wanted. Same shape as `DailyLoopNavigator`'s resume-modal host and the
 * containment rule `PracticeScreenLayout` states.
 *
 * ── WHAT MUST STAY OUTSIDE THIS HOST ──
 *
 * `RootOverlaySlot`, `RootCrisisBoundary` and `CrisisKeyboardAccessory`. Putting
 * any of them inside would hide the overlay along with the navigator — and hide
 * 988 with it. That is the whole failure this component exists to prevent, so it
 * takes ONLY the navigator as children and is never given the crisis affordances.
 *
 * ── WHY IT IS ITS OWN MODULE ──
 *
 * `CleanRootNavigator` cannot be rendered in jest: importing it drags in the
 * entire screen tree, and several transitive deps are outside
 * `transformIgnorePatterns`. The same reasoning `CleanTabNavigator.accessibility.test.tsx`
 * records for its own wrapper. Presentational and self-contained, so it is tested
 * directly.
 *
 * `importantForAccessibility` is not redundant with `accessibilityElementsHidden`:
 * the first carries Android (where `accessibilityViewIsModal` is a no-op and
 * nothing trapped focus at all before this), the second carries iOS.
 */

import React from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';

interface NavigatorA11yHostProps {
  /** True while an overlay holds the root slot. */
  hidden: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export const NavigatorA11yHost: React.FC<NavigatorA11yHostProps> = ({
  hidden,
  style,
  children,
}) => (
  <View
    testID="navigator-a11y-host"
    style={style ?? styles.fill}
    accessibilityElementsHidden={hidden}
    importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
  >
    {children}
  </View>
);

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

export default NavigatorA11yHost;
