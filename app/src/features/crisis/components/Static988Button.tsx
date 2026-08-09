/**
 * DEBUG-341 — the last-resort 988 control.
 *
 * This is what every DEGRADED path renders: the root error boundary's fallback, the
 * overlay boundary's fallback, LoadingScreen's pre-route window, the NavigationContainer
 * readiness watchdog, and CrisisErrorBoundary's default branch. One component so those
 * five surfaces cannot drift apart.
 *
 * WHAT IT DELIBERATELY DOES NOT USE, AND WHY.
 * Every excluded dependency below is a DEMONSTRATED failure mode on this exact path, not
 * a hypothetical:
 *   • react-native-reanimated  — DEBUG-299 shipped a worklet that captured `collapsedWidth`
 *                                before initialisation, producing a NaN transform that made
 *                                the crisis button invisible AND inert app-wide.
 *   • react-native-gesture-handler / GestureDetector — throws outside
 *                                GestureHandlerRootView; the swipe affordance was silently
 *                                dead in release before DEBUG-299.
 *   • navigation               — in the boundary case the navigator is exactly what has
 *                                unmounted, so navigate() is the silent no-op AC2 forbids.
 *   • @react-native-vector-icons — the glyph packages are a plausible crash cause; a text
 *                                label cannot fail to render.
 *   • React context            — if PostHogProvider or a theme provider threw, the fallback
 *                                must not re-enter it. This component reads NO context.
 * A crash inside a fallback has no boundary above it, so the fallback must not depend on
 * the subsystems most likely to have caused the crash it is displaying.
 *
 * IT DIALS, IT DOES NOT NAVIGATE. `openCrisisUrl` is the single guarded dial entry point
 * (DEBUG-314) — it canOpenURL-checks, closes the INFRA-297 trace mark via
 * endCrisisTap('url_open' | 'manual_fallback'), and logs to the crisis category. There is
 * no autodial hazard: on iOS `tel:` presents the system Call/Cancel sheet, and on Android
 * it opens the dialer pre-filled (ACTION_DIAL, not ACTION_CALL). The user keeps an out.
 *
 * THE DIGITS ARE ALWAYS ON SCREEN. `openCrisisUrl`'s canOpenURL failure path shows an
 * Alert telling the user to dial manually — but an Alert is transient, and a user who
 * dismisses it has nothing. On a device with no telephony (iPad, no SIM) canOpenURL is
 * legitimately false and the rendered digits are the ONLY remaining affordance. So "988"
 * and "Text HOME to 741741" render unconditionally as static selectable text, independent
 * of dial capability and of whether the Alert ever fired.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { openCrisisUrl } from '@/features/crisis/utils/openCrisisUrl';
import { colorSystem, semantic, spacing, borderRadius } from '@/core/theme';

export const STATIC_988_BUTTON_TEST_ID = 'static-988-button';
export const STATIC_988_TEXT_TEST_ID = 'static-988-text';
export const STATIC_988_DIGITS_TEST_ID = 'static-988-digits';

interface Static988ButtonProps {
  /** Optional context line rendered ABOVE the control, never instead of it. */
  message?: string;
  testID?: string;
}

export const Static988Button: React.FC<Static988ButtonProps> = ({
  message,
  testID = STATIC_988_BUTTON_TEST_ID,
}) => (
  <View style={styles.container}>
    {/*
      The call control is FIRST in the accessibility reading order — ahead of any
      heading or explanatory copy — so a VoiceOver user reaches it on the first swipe
      rather than after hearing an error message. Copy goes below it, deliberately.
    */}
    <Pressable
      testID={testID}
      onPress={() => {
        openCrisisUrl('tel:988', { manualLabel: '988' });
      }}
      accessibilityRole="button"
      // Name the DESTINATION. "I need support" is ambiguous on a crash screen;
      // this matches the wording already used on the legal gate.
      accessibilityLabel="Call 988 Suicide and Crisis Lifeline"
      accessibilityHint="Opens your phone dialer to call 988"
      style={styles.callButton}
    >
      <Text style={styles.callButtonText}>Call 988</Text>
    </Pressable>

    <Pressable
      testID={`${testID}-sms`}
      onPress={() => {
        openCrisisUrl('sms:741741?body=HOME', { manualLabel: '741741' });
      }}
      accessibilityRole="button"
      accessibilityLabel="Text HOME to 741741, the Crisis Text Line"
      accessibilityHint="Opens your messaging app to text the Crisis Text Line"
      style={styles.textButton}
    >
      <Text style={styles.textButtonText}>Text 741741</Text>
    </Pressable>

    {/*
      Always-visible digits. NOT a duplicate of the buttons above: this is the
      affordance that survives a device with no telephony and a dismissed Alert.
    */}
    <Text
      testID={STATIC_988_DIGITS_TEST_ID}
      selectable
      style={styles.digits}
      accessibilityLabel="If the buttons do not work, dial 9 8 8, or text HOME to 7 4 1 7 4 1"
    >
      988 · Text HOME to 741741
    </Text>

    {message ? (
      <Text testID={STATIC_988_TEXT_TEST_ID} style={styles.message}>
        {message}
      </Text>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    // No flex:1 — this renders inside fallbacks of varying shape and must not
    // fight its parent for space.
    alignItems: 'stretch',
    padding: spacing[16],
    gap: spacing[8],
  },
  callButton: {
    // >=56pt of REAL height, not hitSlop. hitSlop enlarges the touch target but
    // leaves the VISIBLE target below the WCAG 2.5.5 / Apple HIG floor, which is
    // what a person with a tremor or in acute distress is actually aiming at.
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[16],
    borderRadius: borderRadius.medium,
    backgroundColor: colorSystem.status.critical,
    // Literal 1. No animated opacity can reach this control: a last-resort button
    // presented at 50% (or mid-transition) is not a last-resort button.
    opacity: 1,
  },
  callButtonText: {
    color: colorSystem.base.white,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  textButton: {
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[16],
    borderRadius: borderRadius.medium,
    borderWidth: 2,
    borderColor: colorSystem.status.critical,
    opacity: 1,
  },
  textButtonText: {
    color: colorSystem.status.critical,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  digits: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing[4],
    color: semantic.text.primary,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: semantic.text.secondary,
  },
});

export default Static988Button;
