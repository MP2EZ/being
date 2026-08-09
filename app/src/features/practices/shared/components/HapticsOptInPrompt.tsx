/**
 * HapticsOptInPrompt — the one and only haptics opt-in (FEAT-285).
 *
 * A haptic is an unrequested somatic intervention during a practice whose
 * purpose is sensitising the practitioner to their own body, so it has to be
 * assented to rather than assumed. That is why this exists at all, and why it
 * appears BEFORE the timer starts rather than mid-practice.
 *
 * It is also why it appears exactly once, ever. A decline is permanent — no
 * re-prompt on a later session, a different practice, or an app update. Asking
 * again after a "no" would make the "no" meaningless.
 *
 * Consequences of "exactly once" that shape every decision below:
 * - Both choices carry EQUAL weight. Same button treatment, same hint text
 *   verbatim, neither pre-selected. A differing hint or a `selected` state is
 *   the audio equivalent of a pre-checked box, and it is far harder to spot in
 *   the speech channel than on screen.
 * - It is modal on BOTH platforms. Non-modal, a screen-reader user could swipe
 *   straight past to "Begin" and never encounter it — permanently foreclosing
 *   the choice for precisely the practitioner who most needs the tactile
 *   channel.
 * - There is no ✕, no tap-outside, no swipe-to-dismiss. The single prompt is
 *   spent only by an explicit choice.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colorSystem, spacing, borderRadius, typography } from '@/core/theme';
import { TOUCH_TARGETS } from '@/core/theme/accessibility';

export interface HapticsOptInPromptProps {
  onChoose: (enabled: boolean) => void;
  testID?: string;
}

/**
 * Identical on both buttons, deliberately. See the equal-weight note above.
 */
const CHOICE_HINT = 'Saves your choice. You will not be asked again.';

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
        <Text
          ref={headingRef}
          style={styles.heading}
          accessibilityRole="header"
          testID={`${testID}-heading`}
        >
          Use vibration cues in practices?
        </Text>

        <Text style={styles.body}>
          Vibration can mark the start and end of a practice, and the change from
          one phase to the next. This choice is saved and you will not be asked
          again. You can change it later in Settings.
        </Text>

        <View style={styles.choices}>
          <Pressable
            style={styles.choiceButton}
            onPress={accept}
            accessibilityRole="button"
            accessibilityLabel="Turn on vibration cues"
            accessibilityHint={CHOICE_HINT}
            accessibilityState={{ disabled: false }}
            testID={`${testID}-accept`}
          >
            <Text style={styles.choiceLabel}>Turn on</Text>
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
    backgroundColor: colorSystem.gray[900],
    padding: spacing[24],
  },
  card: {
    width: '100%',
    backgroundColor: colorSystem.base.white,
    borderRadius: borderRadius.large,
    padding: spacing[24],
  },
  heading: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
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
   * ONE style for both choices. No `primary` / `secondary` variant, no colour
   * asymmetry — the visual channel must not recommend what the copy refuses to.
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
  choiceLabel: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.midnightBlue,
  },
});

export default HapticsOptInPrompt;
