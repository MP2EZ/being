/**
 * DEBUG-356 — the container that carries active-tab state.
 *
 * WHY THIS EXISTS AS A CONTAINER RATHER THAN A DARKER PALETTE
 *
 * Active tab icon tints are `colorSystem.navigation.*` on a white tab bar.
 * Measured against `colorSystem.base.white`: insights #A8E6CF is 1.41:1 and
 * home #FF6B9D is 2.68:1, both under the WCAG 1.4.11 non-text bar of 3:1.
 * (learn #9B7EBD at 3.44:1 and the Profile tint at 14.16:1 already pass — the
 * failing set is two tints, not the three originally reported, and
 * `navigation.exercises` is not a tab tint at all.)
 *
 * Darkening those two hues is not available to this repo: they ship from
 * `@mp2ez/being-design-system`, so it is a package release plus a dependency
 * bump — and it is a brand decision, not an accessibility one. To clear 3:1,
 * mint #A8E6CF would have to become roughly a deep forest green; that is not
 * darkening the hue, it is deleting it.
 *
 * So the obligation moves OFF the hue. The focused icon is placed on a dark
 * container, and the container — 14.16:1 against the bar — is what identifies
 * the selected state. Every brand hex renders unchanged, and on the dark ground
 * each one gains headroom rather than losing it: insights 10.04:1, home 5.29:1,
 * learn 4.12:1.
 *
 * This is the emphasis-side corollary of the standing repo ruling that quieting
 * must be expressed STRUCTURALLY rather than chromatically (DEBUG-323 in
 * colors.ts, FEAT-292 in DailyLoopStepScreen). Emphasis, likewise, is carried by
 * enclosure rather than by colour.
 *
 * A LIGHT container is not an option worth revisiting: the gray ramp offers
 * gray[300] 1.23:1, gray[400] 1.50:1 and gray[500] 1.98:1 (itself banned
 * outright by DEBUG-342), so the lightest legal container is already gray[600]
 * at 4.61:1. `base.midnightBlue` is chosen because it is an existing brand
 * ground AND was already the Profile tab's own tint, so nothing new enters the
 * palette.
 *
 * DEBUG-342's ordering is preserved, not re-inverted: the selected tab now has
 * enclosure + an inverted fill + a 17:1 semibold label, against an unselected
 * tab's bare 4.61:1 glyph and medium label. The delta widens.
 *
 * GEOMETRY IS CONSTRAINED BY REACT NAVIGATION, NOT BY CHOICE. `TabBarIcon`
 * renders its children inside a fixed 31x28 wrapper (`ICON_SIZE_WIDE` x
 * `ICON_SIZE_TALL`) with `position: 'absolute'` children at 100%. The container
 * therefore fills that slot and cannot be made wider without overriding the
 * wrapper via `tabBarIconStyle` — which would resize both the focused and
 * unfocused copies and shift the label, on a protected navigation path. Not
 * worth it: the contrast outcome is identical either way.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { borderRadius, colorSystem } from '@/core/theme';

/**
 * The fill that carries selected state. Exported so the accessibility pins
 * measure the same value the navigator renders, rather than restating a hex.
 */
export const ACTIVE_TAB_CONTAINER = colorSystem.base.midnightBlue;

interface ActiveTabIndicatorProps {
  focused: boolean;
  children: React.ReactNode;
}

/**
 * Wraps a tab glyph in the active-state container when focused, and renders it
 * bare otherwise. Rendering the container in BOTH states would mean it carried
 * no state at all — that asymmetry is the whole point and is pinned by
 * `__tests__/CleanTabNavigator.accessibility.test.tsx`.
 */
export const ActiveTabIndicator: React.FC<ActiveTabIndicatorProps> = ({ focused, children }) => {
  if (!focused) {
    return <>{children}</>;
  }

  return (
    // accessible={false} is deliberate and load-bearing, not defensive noise.
    // This container is purely decorative — the selected state is already
    // announced by the tab's own accessibilityState, and the tab is addressed by
    // `tabBarButtonTestID` ('tab-home' etc., INFRA-183), which six Maestro safety
    // flows use to walk the tab bar. Marking the wrapper non-accessible keeps it
    // from becoming an accessibility element that could shadow or split the tab
    // button's node. The testID is for the jest pin only.
    <View testID="active-tab-container" accessible={false} style={styles.container}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACTIVE_TAB_CONTAINER,
    borderRadius: borderRadius.large,
  },
});

export default ActiveTabIndicator;
