/**
 * Weekly Reflection Composer (FEAT-194)
 *
 * Bottom-sheet composer for writing or editing this week's reflection.
 * Single open-text input — no prompts beyond the card's "What did this week
 * teach you?" question. Save / Cancel only.
 *
 * ── WHY THIS IS NOT AN RN <Modal> (DEBUG-406) ──
 *
 * It used to be one, and its docblock used to cite `ResumeSessionModal` as the
 * pattern it mirrored — which is exactly backwards now: DEBUG-403 converted
 * `ResumeSessionModal` AWAY from `<Modal>` for this reason and this file was
 * left behind.
 *
 * RN's `<Modal>` renders in a separate native window above the JS view
 * hierarchy, so while this sheet was open the root crisis button was not on
 * screen at all — a zero-988-affordance state. DEBUG-403 scoped this site out by
 * analogy; DEBUG-406 audited it individually and ruled it DOES NOT STAND, on its
 * own facts:
 *
 *   • The app already ships this exact content class WITH crisis access.
 *     `VoiceReflection` is free-text reflection on a standard route: it keeps the
 *     root crisis button AND runs `journalCrisisScan`. This surface had neither.
 *     There is no principled reason the same content class gets 988 access in one
 *     place and none in another.
 *   • The prompt is retrospective and evaluative — "What did this week teach
 *     you?" — with a 5000-character limit. A long session about a hard week is
 *     precisely the shape.
 *   • The card's `checkInsThisWeek >= 4` gate selects TOWARD risk, not away:
 *     it filters for engaged, habituated daily users, who are the people most
 *     likely to be in the app during a bad week. It is not a protective rarity
 *     gate.
 *   • Unlike the other converted sites it has no feature flag — this was live,
 *     unconditionally, for every qualifying user.
 *
 * Do NOT convert this back. `scripts/check-modal-occlusion-guard.js` fails the
 * build if you do.
 *
 * ── WHERE IT RENDERS ──
 *
 * Into the root overlay slot (`core/navigation/rootOverlaySlot`), NOT inline.
 * This component is mounted by `WeeklyReflectionCard`, which lives inside
 * `InsightsScreen`'s `ScrollView`. RN resolves `position: 'absolute'` against
 * the PARENT's padding box, so an inline inset-0 overlay here would cover the
 * CARD, scroll away with the content, and be clipped outright on Android. The
 * slot's box is the screen, and it is painted immediately before the crisis
 * button so it structurally cannot cover it.
 *
 * ── WHAT <Modal> SUPPLIED FOR FREE AND IS NOW HAND-ROLLED ──
 *   • the focus trap           → CleanRootNavigator's host (DEBUG-575; it is
 *                                  NOT `accessibilityViewIsModal` — see below)
 *   • Android back-to-dismiss    → BackHandler, live only while visible
 *   • touch isolation            → the overlay root claims the responder
 *   • the surface-change announcement → focus moves to the title
 *
 * ── autoFocus WAS REMOVED, DELIBERATELY ──
 *
 * It cost one tap and bought two defects. It stole VoiceOver focus from the
 * title, so the question being asked was never announced. And because the iOS
 * keyboard renders in `UIRemoteKeyboardWindow` — above the app window, where
 * `zIndex` is meaningless — raising it immediately meant the crisis button was
 * occluded for essentially the whole life of the sheet, which would have made
 * this conversion cosmetic. Opening with the keyboard DOWN means the sheet and
 * the crisis button are on screen together at the moment of opening, so the user
 * has seen that it is there and knows it returns.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  BackHandler,
  AccessibilityInfo,
  findNodeHandle,
} from 'react-native';
import {
  colorSystem,
  spacing,
  borderRadius,
  typography,
  semantic,
} from '@/core/theme';
import { TOUCH_TARGETS } from '@/core/theme/accessibility';
import { OVERLAY_ACTION_ROW_PADDING_RIGHT } from '@/features/crisis/constants/crisisButtonGeometry';
import { useOverlayBottomInset } from '@/core/hooks/useOverlayBottomInset';
import { crisisAccessoryProps } from '@/features/crisis/constants/crisisInputAccessory';

const MAX_LEN = 5000;

const TITLE = 'What did this week teach you?';

interface WeeklyReflectionComposerProps {
  visible: boolean;
  initialText: string;
  onSave: (text: string) => void | Promise<void>;
  onCancel: () => void;
  /** Control that opened the sheet; focus returns here on close. */
  returnFocusRef?: React.RefObject<React.ComponentRef<typeof Pressable> | null>;
}

const WeeklyReflectionComposer: React.FC<WeeklyReflectionComposerProps> = ({
  visible,
  initialText,
  onSave,
  onCancel,
  returnFocusRef,
}) => {
  const [text, setText] = useState(initialText);
  const titleRef = useRef<React.ComponentRef<typeof Text> | null>(null);
  const bottomInset = useOverlayBottomInset();

  // Sync controlled text with incoming initialText whenever the sheet opens
  // (handles Edit-on-saved-reflection where prefill changes between opens).
  useEffect(() => {
    if (visible) {
      setText(initialText);
    }
  }, [visible, initialText]);

  const canSave = text.trim().length > 0;

  const handleCancel = useCallback(() => {
    const handle = returnFocusRef?.current ? findNodeHandle(returnFocusRef.current) : null;
    if (handle != null) AccessibilityInfo.setAccessibilityFocus(handle);
    onCancel();
  }, [onCancel, returnFocusRef]);

  // Android hardware back — replaces `<Modal onRequestClose={onCancel}>`.
  useEffect(() => {
    if (!visible) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleCancel();
      return true;
    });
    return () => sub.remove();
  }, [visible, handleCancel]);

  // Initial accessibility focus on the QUESTION, not on the input — the title
  // is the only thing that says what is being asked.
  useEffect(() => {
    if (!visible) return undefined;
    const focusTitle = (): void => {
      const handle = titleRef.current ? findNodeHandle(titleRef.current) : null;
      if (handle != null) AccessibilityInfo.setAccessibilityFocus(handle);
    };
    const raf = requestAnimationFrame(focusTitle);
    // TalkBack needs the later attempt: setAccessibilityFocus silently
    // no-ops if it lands during a window change.
    const timer = setTimeout(focusTitle, 350);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <View
      style={styles.overlay}
      /* DEBUG-575: NO `accessibilityViewIsModal` HERE, deliberately.
         This overlay is published into the root slot, which renders a bare
         fragment — so it is a direct native SIBLING of RootCrisisButton and
         CrisisKeyboardAccessory, and that prop prunes the receiver's SIBLINGS.
         Setting it deleted both crisis affordances from the accessibility tree
         while this sheet was open: a zero-988 state for assistive tech, with the
         button still painted on screen so no screenshot could catch it. The trap
         now lives on CleanRootNavigator's host, which hides the Stack.Navigator
         subtree and nothing else. Pinned by modalOcclusionConversions.test.tsx. */
      testID="weekly-reflection-overlay"
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
    >
      <Pressable
        style={styles.backdrop}
        onPress={handleCancel}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />

      <View style={[styles.sheet, { paddingBottom: bottomInset }]}>
        <View style={styles.handle} />

        {/* Prose + input scroll; the actions do not. DEBUG-403's defect was a
            primary action pushed into clipped space, where the tap resolved in
            the view hierarchy but never reached the app. */}
        <ScrollView style={styles.scrollRegion} keyboardShouldPersistTaps="handled">
          <Text ref={titleRef} style={styles.title} accessibilityRole="header" accessible>
            {TITLE}
          </Text>

          <TextInput
            {...crisisAccessoryProps()} /* DEBUG-450 */
            style={styles.input}
            value={text}
            onChangeText={(next) =>
              setText(next.length > MAX_LEN ? next.slice(0, MAX_LEN) : next)
            }
            placeholder="Write what you noticed this week…"
            placeholderTextColor={colorSystem.gray[400]}
            multiline
            textAlignVertical="top"
            maxLength={MAX_LEN}
            accessible
            // DEBUG-406: the visible title is not programmatically associated
            // with the field, so without this the input was unlabelled
            // (WCAG 4.1.2 / 3.3.2).
            accessibilityLabel={TITLE}
            accessibilityHint="Optional. Your reflection on this week."
            testID="weekly-reflection-input"
          />
        </ScrollView>

        {/* Pinned. `paddingRight` keeps both controls out of the crisis
            button's contested column — it renders at zIndex 9999 and WINS an
            overlapping tap, which would both fire a crisis entry the user did
            not ask for and swallow the one they did. */}
        <View style={styles.buttons}>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={handleCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            testID="weekly-reflection-cancel"
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              !canSave && styles.primaryButtonDisabled,
              pressed && canSave && styles.pressed,
            ]}
            onPress={() => canSave && onSave(text.trim())}
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityLabel="Save reflection"
            accessibilityState={{ disabled: !canSave }}
            testID="weekly-reflection-save"
          >
            <Text style={styles.primaryButtonText}>Save</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // DEBUG-406 — OPAQUE, and light. Was `rgba(0,0,0,0.4)`, which composited to
    // #999999 over this white host: 2.92:1 against the crisis button's
    // #991B1B, failing WCAG 1.4.11. Darkening cannot fix it — the ratio is
    // non-monotonic in luminance for a mid-dark red, bottoming out near 2.10 at
    // #808080 and reaching only 2.53 at black. Alpha is also wrong on its own
    // terms: the composite would depend on whatever the host renders behind it,
    // so a passing measurement would measure the screen rather than this
    // overlay. gray[200] is 7.62:1 and still reads as a layer.
    backgroundColor: colorSystem.gray[200],
  },
  sheet: {
    backgroundColor: colorSystem.base.white,
    borderTopLeftRadius: borderRadius.large,
    borderTopRightRadius: borderRadius.large,
    padding: spacing[24],
    // Cap so the sheet cannot outgrow its box. DEBUG-403 shipped a card ~13pt
    // taller than its container and the overflow was invisible to every
    // headless check.
    maxHeight: '100%',
    // paddingBottom is applied inline from useOverlayBottomInset — a max of the
    // crisis-button band and the keyboard height, never their sum.
  },
  handle: {
    alignSelf: 'center',
    width: spacing[48],
    height: 4,
    borderRadius: 2,
    backgroundColor: colorSystem.gray[300],
    marginBottom: spacing[16],
  },
  scrollRegion: {
    flexShrink: 1,
  },
  title: {
    fontSize: typography.headline4.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
    marginBottom: spacing[12],
  },
  input: {
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    borderRadius: borderRadius.small,
    padding: spacing[12],
    minHeight: 160,
    fontSize: typography.bodyRegular.size,
    color: semantic.text.primary,
    marginBottom: spacing[16],
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[12],
    paddingRight: OVERLAY_ACTION_ROW_PADDING_RIGHT,
  },
  primaryButton: {
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[24],
    borderRadius: borderRadius.small,
    backgroundColor: colorSystem.base.midnightBlue,
    // DEBUG-406: padding alone measured ~43pt, under WCAG 2.5.5. Explicit.
    minHeight: TOUCH_TARGETS.minimum,
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: colorSystem.gray[300],
  },
  primaryButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
  secondaryButton: {
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[24],
    borderRadius: borderRadius.small,
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    minHeight: TOUCH_TARGETS.minimum,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: semantic.text.primary,
  },
  pressed: {
    opacity: 0.7,
  },
});

export default WeeklyReflectionComposer;
