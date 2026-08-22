/**
 * The crisis affordance that renders INTO the keyboard's window (DEBUG-450).
 *
 * WHY IT EXISTS. `RootCrisisButton` cannot be reached while a software keyboard is up:
 * the iOS keyboard renders in `UIRemoteKeyboardWindow`, a separate `UIWindow` above the
 * app's, so `zIndex: 9999` is as irrelevant to it as it is to an RN `<Modal>`, and at the
 * button's 100pt offset its top edge (156pt) is already inside every shipping iPhone's
 * keyboard frame. No in-tree y-position escapes that — see `crisisButtonGeometry.ts`.
 * `InputAccessoryView` is the one shape that renders above the keyboard, which is why
 * DEBUG-431 ruled it "the shape the constraints permit".
 *
 * IT IS ADDITIVE, NEVER A REPLACEMENT. The root button's geometry and
 * `CRISIS_BUTTON_EXCLUSION_RECT` are untouched, and the root button is NOT hidden or
 * faded while this is up. Coordinating the two would be a fourth instance of the
 * two-list reconciliation failure CLAUDE.md already names twice (`features/guidance/`,
 * `features/consent/`): both controls stay independently correct, so a bug in one can
 * never silently remove the other's coverage.
 *
 * IT NAVIGATES, IT DOES NOT DIAL. `Static988Button`'s direct-dial design is scoped to
 * contexts where the navigator itself is the suspect — crash boundaries, pre-ready
 * windows. This fires during normal operation with a mounted navigator, so it takes
 * `RootCrisisButton`'s shape and reuses the same shared path: the retry-then-fallback in
 * `navigateToCrisisResources` already degrades to a direct 988 dial if the navigator is
 * not ready within 400ms, so the safety property comes for free on the rare path that
 * needs it, without narrowing the destination on the common one.
 *
 * DEPENDENCY-LIGHT, following `Static988Button`'s recorded reasoning: no reanimated
 * (DEBUG-299 shipped a NaN transform that made the crisis button invisible AND inert
 * app-wide), no gesture-handler, no icon packages, no React context. A text label cannot
 * fail to render.
 *
 * THE CHILD IS ALWAYS MOUNTED. Visibility is toggled by height/opacity/pointerEvents,
 * never by rendering `null` — `InputAccessoryView` unmounts entirely at zero children,
 * and re-attaching a native accessory view to an already-focused field is the real RN
 * risk here. Collapsing in place avoids it.
 */

import React from 'react';
import {
  InputAccessoryView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { beginCrisisTap } from '@/features/crisis/services/crisisTapTrace';
import { navigateToCrisisResources } from '@/features/crisis/utils/navigateToCrisisResources';
import { useKeyboardOccludesCrisisButton } from '@/core/hooks/useKeyboardOccludesCrisisButton';
import {
  CRISIS_KEYBOARD_ACCESSORY_CONTAINER_TEST_ID,
  CRISIS_KEYBOARD_ACCESSORY_NATIVE_ID,
  CRISIS_KEYBOARD_ACCESSORY_TEST_ID,
} from '@/features/crisis/constants/crisisInputAccessory';
import { colorSystem, semantic, spacing, borderRadius, TOUCH_TARGETS } from '@/core/theme';

/**
 * Mount ONCE, as a sibling of `RootCrisisButton` inside `NavigationContainer`.
 * RN registers accessory content by `nativeID` app-wide, so a single mount serves every
 * `TextInput` that spreads `crisisAccessoryProps()`.
 */
export const CrisisKeyboardAccessory: React.FC = () => {
  const occluded = useKeyboardOccludesCrisisButton();

  // InputAccessoryView is iOS-only in RN. Android needs no equivalent: adjustResize
  // repositions the root button above the IME by itself.
  if (Platform.OS !== 'ios') return null;

  const handlePress = (): void => {
    // INFRA-297 ordering, matching CollapsibleCrisisButton's
    // `beginCrisisTap → navigate → cosmetics`. Opens the tap→render measurement; must
    // precede the navigate, because you cannot measure tap→render starting after it.
    beginCrisisTap('keyboard_accessory');

    // THE CRISIS ACTION. First, unconditional, synchronous, outside every telemetry
    // construct. Same shared path the root button takes.
    navigateToCrisisResources('keyboard_accessory', 'CrisisKeyboardAccessory');
  };

  return (
    <InputAccessoryView nativeID={CRISIS_KEYBOARD_ACCESSORY_NATIVE_ID}>
      <View
        testID={CRISIS_KEYBOARD_ACCESSORY_CONTAINER_TEST_ID}
        style={[styles.bar, occluded ? styles.barVisible : styles.barCollapsed]}
        pointerEvents={occluded ? 'auto' : 'none'}
        // Hidden from assistive tech when collapsed, so a screen-reader user does not
        // land on a zero-height control they cannot act on.
        accessibilityElementsHidden={!occluded}
        importantForAccessibility={occluded ? 'yes' : 'no-hide-descendants'}
      >
        <Pressable
          testID={CRISIS_KEYBOARD_ACCESSORY_TEST_ID}
          onPress={handlePress}
          style={styles.button}
          hitSlop={spacing[8]}
          accessibilityRole="button"
          // Identical to the root button's, deliberately: the same affordance in a
          // different place should not announce itself as a different control.
          accessibilityLabel="I need support"
          accessibilityHint="Tap for immediate access to crisis resources"
        >
          <Text style={styles.label}>I need support</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
};

const styles = StyleSheet.create({
  bar: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'flex-end',
    backgroundColor: semantic.background.secondary,
    overflow: 'hidden',
  },
  barVisible: {
    // The padding is clearance around the control, not the target itself — the
    // button below carries its own >=44pt of REAL height, per the same WCAG 2.5.5
    // reasoning Static988Button records (hitSlop enlarges touch, not the visible target).
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[16],
  },
  barCollapsed: {
    height: 0,
    paddingVertical: 0,
    opacity: 0,
  },
  button: {
    minHeight: TOUCH_TARGETS.minimum,
    justifyContent: 'center',
    paddingHorizontal: spacing[16],
    borderRadius: borderRadius.medium,
    backgroundColor: colorSystem.status.critical,
  },
  label: {
    color: colorSystem.base.white,
    fontWeight: '600',
  },
});

export default CrisisKeyboardAccessory;
