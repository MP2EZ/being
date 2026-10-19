/**
 * DEBUG-803 — the selected tab is marked by a bar along its TOP edge.
 *
 * Supersedes DEBUG-356's filled midnight-blue enclosure behind the glyph. The
 * focused tab now renders its glyph bare plus a 31x4 midnight-blue pill painted
 * into the tab item's existing 5pt top padding (`TAB_ITEM_TOP_PADDING`), just
 * under the bar's hairline. No bar, slot or label geometry changes.
 *
 * ACCESSIBILITY RULING (WCAG 1.4.11 Non-text Contrast)
 *
 * A non-hue selected-state indicator at >= 3:1 satisfies 1.4.11 on its own. The
 * icon tint need not also pass 3:1, because every tab keeps a visible text label
 * and the Understanding doc exempts graphics that duplicate adjacent text.
 *
 * Measured against `colorSystem.base.white` (the bar): indicator midnightBlue
 * 14.16:1, and 12.99:1 against the gray[200] hairline. Glyph tints: home 2.68:1
 * and insights 1.41:1 fail on white and are exempt by this ruling; learn 3.44:1;
 * Profile (midnightBlue) 14.16:1. Inactive tint is gray[650]
 * (`semantic.text.muted`) at 5.57:1.
 *
 * The ruling holds only while ALL of these do:
 *   (i)   every tab keeps its visible label (no icon-only mode, no
 *         `tabBarShowLabel: false`);
 *   (ii)  the indicator renders on the focused tab only;
 *   (iii) the indicator is not a hue — it carries state by shape and position.
 *
 * GEOMETRY IS CONSTRAINED BY REACT NAVIGATION. `TabBarIcon` renders children
 * inside a fixed 31x28 wrapper with absolutely positioned children at 100%, so
 * the pill is 100% of that slot wide. Do not widen it via `tabBarIconStyle` or
 * `tabBarItemStyle`: that resizes both states and shifts the label. The pill is
 * decorative and static — no zIndex, no elevation, no animation, no hit target.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { borderRadius, colorSystem, spacing } from '@/core/theme';
import { TAB_ITEM_TOP_PADDING } from './tabBarLayout';

/**
 * The fill that carries selected state. Exported so the accessibility pins
 * measure the same value the navigator renders, rather than restating a hex.
 */
export const ACTIVE_TAB_INDICATOR = colorSystem.base.midnightBlue;

/**
 * Focused glyph tint per tab. Profile is midnightBlue (its pre-DEBUG-356 tint),
 * not white: the glyph now sits on the white bar, not on a dark enclosure.
 */
export const ACTIVE_TAB_GLYPH_TINT = {
  home: colorSystem.navigation.home,
  learn: colorSystem.navigation.learn,
  insights: colorSystem.navigation.insights,
  profile: colorSystem.base.midnightBlue,
} as const;

interface ActiveTabIndicatorProps {
  focused: boolean;
  children: React.ReactNode;
}

/**
 * Renders the glyph, plus the top pill when focused. Rendering the pill in BOTH
 * states would mean it carried no state at all — pinned by
 * `__tests__/CleanTabNavigator.accessibility.test.tsx`.
 */
export const ActiveTabIndicator: React.FC<ActiveTabIndicatorProps> = ({ focused, children }) => {
  if (!focused) {
    return <>{children}</>;
  }

  return (
    <View style={styles.slot}>
      {children}
      {/* accessible={false} is deliberate and load-bearing: the pill is purely
          decorative — selected state is already announced by the tab's own
          accessibilityState, and the tab is addressed by `tabBarButtonTestID`
          ('tab-home' etc.), which the Maestro safety flows use. It must not
          become an accessibility element or a touch target. */}
      <View
        testID="active-tab-indicator"
        accessible={false}
        importantForAccessibility="no"
        pointerEvents="none"
        style={styles.indicator}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  slot: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    top: -TAB_ITEM_TOP_PADDING,
    width: '100%',
    height: spacing[4],
    borderRadius: borderRadius.full,
    backgroundColor: ACTIVE_TAB_INDICATOR,
  },
});

export default ActiveTabIndicator;
