/**
 * HapticsOptInPrompt — the one and only haptics opt-in (FEAT-285, re-homed FEAT-385).
 *
 * A haptic is an unrequested somatic intervention during a practice whose purpose is
 * sensitising the practitioner to their own body, so it has to be assented to rather
 * than assumed. That is why this exists at all, and why it appears BEFORE the timer
 * starts rather than mid-practice.
 *
 * It is also why it appears exactly once, ever. A decline is permanent — no re-prompt
 * on a later session, a different practice, or an app update. Asking again after a
 * "no" would make the "no" meaningless. FEAT-385 mounts this on three practice
 * screens, so that invariant is now ENFORCED rather than structural: see
 * `useHapticsOptIn`, which holds the claim and closes the async-write window.
 *
 * ── THE EQUAL-WEIGHT DESIGN WAS OVERRIDDEN. READ THIS BEFORE "FIXING" EITHER SIDE. ──
 *
 * This component originally gave both choices identical visual treatment, on the
 * argument that "the visual channel must not recommend what the copy refuses to."
 * That argument was sound given its premise. FEAT-385 overrode it (founder decision
 * 2026-07-25, retained through the 2026-08-09 scope-down) because the premise was
 * false in a way that mattered:
 *
 *   The original case for equal weight assumed haptics had another discovery route,
 *   so a neutral prompt cost nothing. They do not. The Settings "Haptic Cues" block
 *   is gated on the SAME `practice_haptics` flag as this prompt
 *   (AppSettingsScreen.tsx), so this prompt is the ONLY discovery surface there has
 *   ever been. Neutrality was not neutral — it silently withheld a capability built
 *   for eyes-closed and low-vision practice from the people with the strongest claim
 *   on it.
 *
 * WHERE THE LINE BETWEEN PREFERENCE AND COERCION IS DRAWN, and why each half holds:
 *
 * - The recommendation is LEGIBLE. It lives in the body copy, so it is perceivable —
 *   an impression eligible for assent or refusal, in the Stoic sense the rest of this
 *   app is built on. A visual-only asymmetry would influence below the threshold of
 *   noticing, which is what coercion actually is.
 * - It is therefore carried in the SHARED body text, never in a per-button label,
 *   hint, or accessibilityState. Hints are the wrong carrier regardless: iOS lets
 *   users disable hint speech outright and TalkBack routinely truncates it, so a
 *   recommendation placed there would vanish for exactly the cohort it is for
 *   (WCAG 1.3.1 — information conveyed by presentation needs a text equivalent).
 * - Emphasis is ADDITIVE on accept, never subtractive on decline. Decline is
 *   byte-identical to the original treatment. There is no legal chromatic
 *   de-emphasis available anyway — the gray ramp has no compliant step between
 *   gray[500] (1.98:1) and gray[600] (4.61:1, white-only), so quieting must be
 *   structural, never chromatic.
 * - EQUAL COST is preserved exactly: identical minHeight, flex, padding, borderWidth,
 *   borderRadius, fontSize, fontWeight, gap and source order. Emphasis may change
 *   appearance; it must never change reachability. An unequally-sized target is the
 *   motor-channel equivalent of the pre-selected control this prompt forbids.
 * - Still NO ✕, no tap-outside, no swipe-to-dismiss, and on Android the hardware back
 *   button is consumed. The single prompt is spent only by an explicit choice — and
 *   both choices spend it.
 * - Modal on BOTH platforms. Non-modal, a screen-reader user could swipe straight past
 *   to "Begin" and never encounter it, permanently foreclosing the choice.
 *
 * ── WHY THIS IS NOT AN RN <Modal> ──
 *
 * RN's <Modal> renders in a SEPARATE NATIVE WINDOW, above the JS view hierarchy — and
 * therefore above the root crisis button, which would leave this screen with zero 988
 * affordance while showing an undismissable prompt. Modality here means
 * `accessibilityViewIsModal` (iOS) plus the caller hiding its own content subtree with
 * `importantForAccessibility="no-hide-descendants"` (Android), which
 * `PracticeScreenLayout`'s `overlay` prop does. Never convert this to <Modal>.
 *
 * ── BACKDROP: WHY LIGHT, AND WHAT IT DOES NOT FIX ──
 *
 * The backdrop was `gray[900]` (#171717) with NO alpha — an opaque fill, not a scrim.
 * All three hosts are in RootCrisisButton's IMMERSIVE_ROUTES, so the crisis button
 * renders at FADED_OPACITY 0.5 on top of this layer. Against #171717 the faded button
 * measured 1.34:1, and 2.16:1 at full opacity — on a prompt with no dismissal path.
 * A darker scrim cannot fix that: #991B1B is LIGHTER than #171717, so darkening moves
 * the wrong way. White is the maximum available:
 *
 *      backdrop      faded (0.5)     full opacity
 *      #171717       1.34:1          2.16:1
 *      #FFFFFF       2.71:1          8.31:1   ← this file
 *
 * Full opacity — what reduce-motion users get always, and what any interaction
 * restores — now passes comfortably. The FADED resting state still does not reach
 * 1.4.11's 3:1, and no backdrop can make it: white is the ceiling at 2.71:1 because
 * the composite is pinned halfway to the red. Closing that last gap requires
 * suppressing the immersive fade while a modal prompt is up, which is a change to the
 * crisis components themselves and deliberately out of this item's scope.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  BackHandler,
  findNodeHandle,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { semantic, colorSystem, spacing, borderRadius, typography } from '@/core/theme';
import { TOUCH_TARGETS } from '@/core/theme/accessibility';

export interface HapticsOptInPromptProps {
  onChoose: (enabled: boolean) => void;
  testID?: string;
}

/**
 * Identical on both buttons, deliberately. A differing hint is the audio equivalent
 * of a pre-checked box, and far harder to notice in speech than on screen. The
 * recommendation is NOT here — see the header note.
 */
const CHOICE_HINT = 'Saves your choice. You will not be asked again.';

/**
 * Vertical band at the bottom of the screen that the root crisis button occupies,
 * kept clear so the choices row can never overlap it.
 *
 * Derived from CollapsibleCrisisButton's own geometry: it sits at `bottom` 100 (iOS)
 * / 104 (Android), is TOUCH_TARGETS.minimum tall, and carries a 12pt hitSlop — so its
 * hit area reaches ~156pt up from the bottom edge. The larger platform value plus one
 * spacing step of margin is used for both platforms rather than branching, because
 * being generous here costs nothing and an overlap is unrecoverable: the button
 * renders at zIndex 9999 above this prompt and would win the tap, so an overlap would
 * BOTH fire a false crisis entry AND land on the DECLINE side — biasing against the
 * very choice it made harder to press.
 */
const CRISIS_BUTTON_RESERVED_BAND = 104 + TOUCH_TARGETS.minimum + 12 + spacing[16];

export const HapticsOptInPrompt: React.FC<HapticsOptInPromptProps> = ({
  onChoose,
  testID = 'haptics-optin-prompt',
}) => {
  const headingRef = useRef<Text>(null);

  useEffect(() => {
    // Move focus to the QUESTION, not to a choice — landing on a button would
    // skip what is being asked.
    const focusHeading = (): void => {
      const tag = findNodeHandle(headingRef.current);
      if (tag) AccessibilityInfo.setAccessibilityFocus(tag);
    };

    const raf = requestAnimationFrame(focusHeading);
    // TalkBack silently no-ops setAccessibilityFocus if it has not finished
    // processing the window change, so retry once.
    const retry = setTimeout(focusHeading, 350);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(retry);
    };
  }, []);

  useEffect(() => {
    // Android hardware back is a dismissal path like any other, and this prompt has
    // none. Returning true consumes the event so back cannot spend the single,
    // unrepeatable prompt without a choice having been made.
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, []);

  const accept = useCallback(() => onChoose(true), [onChoose]);
  const decline = useCallback(() => onChoose(false), [onChoose]);

  return (
    <View
      style={styles.backdrop}
      // iOS: trap VoiceOver inside the prompt.
      accessibilityViewIsModal={true}
      // Android: TalkBack has no equivalent, so the content behind is hidden by
      // the caller via importantForAccessibility="no-hide-descendants".
      testID={testID}
    >
      {/* accessible={false} so heading, body and both buttons stay individually
          navigable rather than collapsing into one swipe stop. */}
      <View style={styles.card} accessible={false}>
        {/* Only the prose scrolls. The choices row below is pinned, so at the
            largest Dynamic Type sizes the text gives way rather than pushing the
            buttons down into the crisis button's band. */}
        <ScrollView
          style={styles.prose}
          contentContainerStyle={styles.proseContent}
          showsVerticalScrollIndicator={false}
        >
          <Text
            ref={headingRef}
            style={styles.heading}
            accessibilityRole="header"
            testID={`${testID}-heading`}
          >
            Use vibration cues in practices?
          </Text>

          <Text style={styles.body} testID={`${testID}-body`}>
            Vibration can mark the start and end of a practice, and the change from
            one phase to the next. We suggest turning them on — the cues let you
            follow a practice with your eyes closed. This choice is saved and you
            will not be asked again. You can change it later in Settings.
          </Text>
        </ScrollView>

        <View style={styles.choices}>
          <Pressable
            style={[styles.choiceButton, styles.choiceButtonAccept]}
            onPress={accept}
            accessibilityRole="button"
            accessibilityLabel="Turn on vibration cues"
            accessibilityHint={CHOICE_HINT}
            accessibilityState={{ disabled: false }}
            testID={`${testID}-accept`}
          >
            <Text style={[styles.choiceLabel, styles.choiceLabelAccept]}>Turn on</Text>
          </Pressable>

          <Pressable
            style={styles.choiceButton}
            onPress={decline}
            accessibilityRole="button"
            accessibilityLabel="Leave vibration cues off"
            accessibilityHint={CHOICE_HINT}
            accessibilityState={{ disabled: false }}
            testID={`${testID}-decline`}
          >
            <Text style={styles.choiceLabel}>Leave off</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    // Light, not dark — see the backdrop note in the header. This is the only
    // available direction: the crisis overlay composites over it.
    backgroundColor: colorSystem.base.white,
    padding: spacing[24],
    // Keeps the whole card clear of the root crisis button's hit area.
    paddingBottom: CRISIS_BUTTON_RESERVED_BAND,
  },
  card: {
    width: '100%',
    maxHeight: '100%',
    backgroundColor: colorSystem.base.white,
    borderRadius: borderRadius.large,
    padding: spacing[24],
  },
  prose: {
    flexShrink: 1,
  },
  proseContent: {
    flexGrow: 0,
  },
  heading: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
    marginBottom: spacing[16],
  },
  body: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[700],
    marginBottom: spacing[24],
  },
  choices: {
    flexDirection: 'row',
    // Recommended rather than minimum spacing: a mis-tap on an unrepeatable
    // prompt is unrecoverable.
    gap: TOUCH_TARGETS.spacingRecommended,
  },
  /**
   * SHARED base for both choices — this is what makes the cost equal. Every
   * property that affects the box a finger has to hit lives here and nowhere else,
   * so the accept variant below cannot change reachability even by accident.
   *
   * Note `borderWidth: 1` is on the base, not the decline variant: dropping it on
   * the filled button would make accept 2pt smaller than decline.
   */
  choiceButton: {
    flex: 1,
    minHeight: TOUCH_TARGETS.minimum,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[16],
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: colorSystem.base.midnightBlue,
    backgroundColor: colorSystem.base.white,
  },
  /**
   * The ONLY difference: a fill. Additive emphasis, and a pure luminance delta
   * (14.16:1 both directions), so it survives greyscale and every CVD type — and
   * it is never `opacity`, which would composite midnightBlue to 4.00:1 at 0.6 and
   * silently fail 1.4.3 while reading as a styling choice.
   */
  choiceButtonAccept: {
    backgroundColor: colorSystem.base.midnightBlue,
  },
  choiceLabel: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.midnightBlue,
  },
  choiceLabelAccept: {
    color: colorSystem.base.white,
  },
});

export default HapticsOptInPrompt;
