/**
 * BugReportOverlay (FEAT-570) — the first-party replacement for Sentry's
 * feedback widget.
 *
 * ── WHAT THIS REPLACES, AND WHY A REPLACEMENT RATHER THAN A REPAIR ──
 *
 * FEAT-284 opened `Sentry.showFeedbackWidget()`. DEBUG-533 ruled that a DEBUG-406
 * conversion site failing all three legs of the `NotificationTimePicker`
 * exception, and MEASURED it on device: with the widget up, `crisis-button-root`
 * appeared ZERO times in the accessibility hierarchy, having asserted VISIBLE
 * three steps earlier in the same run. After 75s untouched it was still open —
 * the dwell is unbounded.
 *
 * The occluder was never the RN `<Modal>`. `Sentry.wrap(App)` mounts
 * `FeedbackWidgetProvider` above `GestureHandlerRootView`; it emits our whole app
 * as `children` and THEN, as a later sibling, an inset-0 `Animated.View`
 * animating to `rgba(0,0,0,0.9)`. `RootCrisisButton`'s `zIndex: 9999` cannot
 * reach past it, because zIndex orders siblings and that backdrop is a later
 * sibling of the button's ANCESTOR. No z-order or RN-level change recovers that
 * surface — only not calling Sentry's presenter, which is what FEAT-570 does.
 *
 * ── WHY IT RENDERS INTO THE ROOT SLOT ──
 *
 * `rootOverlaySlot` is a sibling of the whole `Stack.Navigator`, declared
 * IMMEDIATELY BEFORE `RootCrisisButton` in `CleanRootNavigator`. Siblings paint
 * in JSX order, so nothing published here can paint above the crisis button —
 * not "should not", CANNOT. Its box is the navigator's root `View`, so inset-0
 * means the screen rather than whatever card happens to contain the caller.
 *
 * The slot ALSO refuses and releases this overlay on
 * `CRISIS_DESTINATION_ROUTES ∪ SCREEN_OWNED_988_ROUTES`. That matters more here
 * than for the two `features/insights/` composers, because this is the first
 * claimant armed at the APP ROOT: `useBugReportShake()` is called inside `App()`,
 * above `NavigationContainer`, so a shake can raise this on `AssessmentFlow` or
 * on the pre-consent `LegalGate`, where the FAB has stepped aside and the SCREEN
 * owns the only route to 988. `onRevoked` below is what makes that stick.
 *
 * ── WHAT `<Modal>` SUPPLIED FOR FREE AND IS NOW HAND-ROLLED ──
 *   • the focus trap             → `CleanRootNavigator`'s `NavigatorA11yHost`.
 *                                   NOT `accessibilityViewIsModal` — see below.
 *   • Android back-to-dismiss    → `BackHandler`, live only while visible
 *   • touch isolation            → the overlay root claims the responder
 *   • the surface announcement   → focus moves to the title
 *
 * ── EXITS ARE FIXED, AND THIS IS THE LEG SENTRY FAILED WORST ──
 *
 * Sentry's Cancel was the LAST CHILD of its `ScrollView`, below the required
 * textarea, with the keyboard up whenever the user had engaged at all. Measured
 * on device: with three lines typed, `Cancel` was not on screen AT ALL — there
 * was no visible exit. So Cancel here is PINNED IN THE HEADER, outside the
 * scroll region, and there are three independent exits: header Cancel, backdrop
 * press, and Android hardware back.
 *
 * ── NO SCREENSHOT (compliance ruling, FEAT-570) ──
 *
 * Deliberately not re-implemented. Attachments ride the envelope rather than the
 * event, so `scrubFeedbackEvent` structurally cannot reach one; there is no
 * public capture API; and this surface is armed over `AssessmentFlow` and
 * `VoiceReflectionScreen`, so a capture could carry assessment answers or
 * reflection prose. The full reasoning is at `ExternalErrorReporter`'s FEAT-284
 * posture block.
 *
 * ── THE KILL SWITCH CHANGES WHAT THIS RENDERS, NOT WHETHER IT OPENS ──
 *
 * When `killExternalReporting()` has fired, this renders an informational
 * variant with NO input field and NO submit control. Two rulings meet there:
 * a form that solicits free text and then discards it is worse than one that
 * never offered (compliance), and a surface that simply does nothing on a
 * gesture advertised as working from any screen is the silent no-op this item
 * exists to remove (crisis).
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
import { crisisAccessoryProps } from '@/features/crisis/constants/crisisInputAccessory';
import { useOverlayBottomInset } from '@/core/hooks/useOverlayBottomInset';
import { useRootOverlay } from '@/core/navigation/rootOverlaySlot';
import { useBugReportStore } from '@/core/stores/bugReportStore';
import { isExternalReportingKilled, submitFeedback } from '@/core/services/logging';

/** Stable slot identity. Mutual exclusion is keyed on this. */
export const BUG_REPORT_OVERLAY_ID = 'bug-report-form';

export const BUG_REPORT_TITLE = 'Report a bug';

/**
 * Concedes that the field can receive wellness disclosures, without the old
 * copy's screenshot clause (compliance-supplied, FEAT-570).
 */
export const BUG_REPORT_PLACEHOLDER =
  'Describe the bug or issue. Please avoid including personal wellness details — like assessment scores, mood notes, or journal content.';

export const BUG_REPORT_INPUT_LABEL = 'Bug report message';
export const BUG_REPORT_INPUT_HINT =
  'Enter a description of the problem. Avoid including personal wellness details such as assessment scores or journal content.';

/** Shown when the reporter is killed: no field is rendered at all. */
export const BUG_REPORT_KILLED_COPY =
  "Bug reporting is temporarily unavailable and we're not able to accept new reports right now. Please try again later, or email us directly at support@being.fyi.";

/**
 * Shown when submission is refused at the moment of sending — an empty DSN, or a
 * kill that landed while the form was open. Deliberately distinct from the copy
 * above: that one answers "why can't I type", this one answers "what happened to
 * what I just typed".
 */
export const BUG_REPORT_REFUSED_COPY =
  "Reporting is temporarily unavailable. Nothing was sent, and what you typed here won't be saved — copy it if you want to keep it, then try again later.";

const MAX_MESSAGE_LENGTH = 500;

interface BugReportFormProps {
  /** Present so the structural guards can render this directly. */
  visible: boolean;
  killed: boolean;
  onClose: () => void;
}

/**
 * Exported for `__tests__/safety/modalOcclusionConversions.test.tsx`, which
 * renders each DEBUG-406 conversion directly rather than through the slot.
 */
export const BugReportForm: React.FC<BugReportFormProps> = ({ visible, killed, onClose }) => {
  // In-memory ONLY. Never persisted, queued, or retried — see `bugReportStore`.
  const [message, setMessage] = useState('');
  const [refused, setRefused] = useState(false);
  const titleRef = useRef<React.ComponentRef<typeof Text> | null>(null);
  const bottomInset = useOverlayBottomInset();

  // Android hardware back — replaces `<Modal onRequestClose>`. Registered only
  // while mounted; an always-mounted listener would swallow back navigation
  // app-wide.
  useEffect(() => {
    if (!visible) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  // Initial accessibility focus on the title, not the input. autoFocus is
  // deliberately absent (see the guard in modalOcclusionConversions.test.tsx):
  // it would steal VoiceOver focus from the title so the sheet never announced
  // itself, and it would raise the keyboard immediately — and the iOS keyboard
  // renders in UIRemoteKeyboardWindow, ABOVE the app window, so the crisis
  // button would be occluded for essentially the whole life of the form, making
  // this conversion cosmetic.
  useEffect(() => {
    if (!visible) return undefined;
    const focusTitle = (): void => {
      const handle = titleRef.current ? findNodeHandle(titleRef.current) : null;
      if (handle != null) AccessibilityInfo.setAccessibilityFocus(handle);
    };
    const raf = requestAnimationFrame(focusTitle);
    // TalkBack needs the later attempt: setAccessibilityFocus silently no-ops
    // if it lands during a window change.
    const timer = setTimeout(focusTitle, 350);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [visible]);

  // A `<Modal visible={false}>` still mounted its children; a plain overlay must
  // not leave an invisible full-screen responder over the host.
  const canSend = message.trim().length > 0;

  const handleSend = useCallback(() => {
    // `submitFeedback` re-reads `isActive()` at this instant — never a value
    // cached from when the form opened, because kill() can fire in between.
    if (submitFeedback(message)) {
      onClose();
      return;
    }
    setRefused(true);
  }, [message, onClose]);

  if (!visible) return null;

  return (
    <View
      style={styles.overlay}
      /* DEBUG-575: NO `accessibilityViewIsModal` HERE, deliberately.
         Published into the root slot, which renders a bare fragment — so this is
         a direct native SIBLING of RootCrisisButton and CrisisKeyboardAccessory,
         and that prop prunes the receiver's SIBLINGS. Setting it would delete
         both crisis affordances from the accessibility tree while this form is
         open: a zero-988 state for assistive tech, with the button still painted
         so no screenshot could catch it. The trap lives on CleanRootNavigator's
         host instead. Pinned by modalOcclusionConversions.test.tsx. */
      testID="bug-report-overlay"
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />

      <View style={[styles.sheet, { paddingBottom: bottomInset }]} testID="bug-report-sheet">
        {/* PINNED HEADER, OUTSIDE the ScrollView. This is the leg Sentry's widget
            failed most clearly — its Cancel was the last child of a scroll region
            under a raised keyboard, and on device it was not on screen at all
            once three lines had been typed. One tap, always reachable. */}
        <View style={styles.header}>
          <Text ref={titleRef} style={styles.title} accessibilityRole="header" accessible>
            {BUG_REPORT_TITLE}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            testID="bug-report-cancel"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>

        {killed ? (
          <Text style={styles.notice} testID="bug-report-unavailable">
            {BUG_REPORT_KILLED_COPY}
          </Text>
        ) : (
          <>
            <ScrollView style={styles.scrollRegion} keyboardShouldPersistTaps="handled">
              <TextInput
                {...crisisAccessoryProps()} /* DEBUG-450 — the keyboard is
                   necessarily up for the dwell here, so on iOS this accessory is
                   the SOLE 988 route while it is. Mandatory, not optional. */
                style={styles.input}
                value={message}
                onChangeText={setMessage}
                placeholder={BUG_REPORT_PLACEHOLDER}
                placeholderTextColor={colorSystem.gray[400]}
                multiline
                textAlignVertical="top"
                maxLength={MAX_MESSAGE_LENGTH}
                accessible
                accessibilityLabel={BUG_REPORT_INPUT_LABEL}
                accessibilityHint={BUG_REPORT_INPUT_HINT}
                testID="bug-report-input"
              />

              {refused ? (
                <Text
                  style={styles.notice}
                  accessibilityLiveRegion="polite"
                  testID="bug-report-refused"
                >
                  {BUG_REPORT_REFUSED_COPY}
                </Text>
              ) : null}
            </ScrollView>

            {/* The exclusion rect is anchored to the screen's BOTTOM right, so the
                padding belongs on this row — the crisis FAB renders at zIndex 9999
                and wins an overlapping tap, which would turn a Send press into a
                wrong-destination crisis navigation. */}
            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [
                  styles.sendButton,
                  !canSend && styles.sendButtonDisabled,
                  pressed && canSend && styles.pressed,
                ]}
                onPress={() => canSend && handleSend()}
                disabled={!canSend}
                accessibilityRole="button"
                accessibilityLabel="Send report"
                accessibilityState={{ disabled: !canSend }}
                testID="bug-report-send"
              >
                <Text style={styles.sendButtonText}>Send report</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </View>
  );
};

/**
 * Publishes the form into the root slot. Renders nothing itself.
 *
 * Mounted ONCE, in `CleanRootNavigator`. Both entry points are imperative, so
 * visibility comes from `bugReportStore` rather than from a parent's state.
 */
export const BugReportOverlay: React.FC = () => {
  const visible = useBugReportStore((s) => s.visible);
  const close = useBugReportStore((s) => s.close);

  // Read per-open rather than per-render: the variant must not flip under the
  // user mid-composition if kill() fires. Submission is still refused at that
  // instant by `submitFeedback`'s own fresh check, which is the half that
  // matters for transmission.
  const [killed, setKilled] = useState(false);
  useEffect(() => {
    if (visible) setKilled(isExternalReportingKilled());
  }, [visible]);

  useRootOverlay(
    BUG_REPORT_OVERLAY_ID,
    visible,
    () => <BugReportForm visible killed={killed} onClose={close} />,
    // Revoked, or refused at the door. The slot forbids this overlay on crisis
    // destinations and on routes where the screen owns the 988 affordance; the
    // shake gesture is armed at the app root, so it can be raised on both.
    // Closing is what makes that stick — without it `visible` stays true, the
    // claim effect re-runs on every render, and the form pops at the user the
    // moment they navigate away. The draft is dropped with it, deliberately:
    // it is never persisted.
    close,
  );

  return null;
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
    // DEBUG-406 — OPAQUE and light, never an alpha scrim. The crisis button
    // (#991B1B) composites over this once it is no longer a native window, and
    // contrast against a mid-dark red is NON-MONOTONIC in backdrop luminance:
    // darkening bottoms out near 2.10:1 and reaches only 2.53:1 at black, so no
    // dark backdrop passes WCAG 1.4.11 at any alpha. Alpha is independently
    // wrong: the composite would depend on whatever the host draws behind it.
    backgroundColor: colorSystem.gray[200],
  },
  sheet: {
    backgroundColor: colorSystem.base.white,
    borderTopLeftRadius: borderRadius.large,
    borderTopRightRadius: borderRadius.large,
    padding: spacing[24],
    // Capped so the sheet cannot outgrow its box (DEBUG-403's ~13pt overflow put
    // a primary action's centre in clipped space, where the tap resolved in the
    // hierarchy but never reached the app).
    maxHeight: '100%',
    // paddingBottom applied inline: max(crisis band, keyboard height).
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[16],
  },
  title: {
    fontSize: typography.headline4.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
    flexShrink: 1,
  },
  cancelButton: {
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[16],
    minHeight: TOUCH_TARGETS.minimum,
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: semantic.text.primary,
  },
  scrollRegion: {
    flexShrink: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    borderRadius: borderRadius.small,
    padding: spacing[12],
    minHeight: 96,
    fontSize: typography.bodyRegular.size,
    color: semantic.text.primary,
    marginBottom: spacing[12],
  },
  notice: {
    fontSize: typography.bodyRegular.size,
    color: semantic.text.secondary,
    marginBottom: spacing[16],
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    // Keeps Send out of the crisis button's contested column.
    paddingRight: OVERLAY_ACTION_ROW_PADDING_RIGHT,
  },
  sendButton: {
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[24],
    borderRadius: borderRadius.small,
    backgroundColor: colorSystem.base.midnightBlue,
    minHeight: TOUCH_TARGETS.minimum,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colorSystem.gray[300],
  },
  sendButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
  pressed: {
    opacity: 0.7,
  },
});

export default BugReportOverlay;
