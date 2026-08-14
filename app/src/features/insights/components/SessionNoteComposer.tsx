/**
 * SessionNoteComposer (FEAT-195)
 *
 * Bottom-sheet modal for adding / editing / deleting a short "Your note"
 * annotation on a single wellness check-in. Mirrors the WeeklyReflectionComposer
 * pattern but capped at SESSION_NOTE_MAX_LENGTH (140) with a live character
 * counter and a delete affordance when a note already exists.
 *
 * ── WHY THIS IS NOT AN RN <Modal> (DEBUG-406) ──
 *
 * It used to be one. RN's <Modal> renders in a separate native window above the
 * JS view hierarchy, so while this sheet was open the root crisis button was not
 * on screen at all. DEBUG-403 scoped this site out by analogy; DEBUG-406 audited
 * it individually and ruled it DOES NOT STAND — the MOST severe of the four:
 *
 *   • It is the only site that occluded TWO 988 affordances. Besides the root
 *     crisis button, its host card renders `WellnessDisclaimer`, whose inline
 *     `openCrisisUrl('tel:988')` link is required to be NON-DISMISSIBLE. A
 *     <Modal> dismissed it in practice, so this breached its host's own stated
 *     compliance invariant as well as the crisis contract.
 *   • The entry gesture is score-anchored: the composer opens by tapping a data
 *     point on the user's own PHQ-9 / GAD-7 longitudinal chart. The action is
 *     literally "I want to say something about THIS score" — the highest
 *     distress-probability entry gesture in the app outside the assessment flow
 *     itself.
 *   • Dwell is unbounded: free text, not a transaction.
 *
 * The feature flag (`wellness_trend_notes`) being dark did not save it. The
 * flag's documented model is "PostHog promotes; build-time is the floor", so one
 * dashboard toggle would enable this for every analytics-consenting user with no
 * build and no code review. That is exactly the change class that must not be
 * able to open a zero-988-affordance window.
 *
 * Renders into the ROOT overlay slot, not inline — this component's host chain is
 * `WellnessScreeningTrends` → a card → `InsightsScreen`'s ScrollView, and RN
 * resolves `position: 'absolute'` against the parent's padding box. See
 * `core/navigation/rootOverlaySlot`.
 *
 * autoFocus was removed deliberately: it stole VoiceOver focus from the title and
 * it raised the keyboard immediately, and the iOS keyboard renders in
 * `UIRemoteKeyboardWindow` ABOVE the app window — so it would have kept the
 * crisis button occluded for essentially the whole life of the sheet, making the
 * conversion cosmetic.
 *
 * FRAMING (philosopher-gated — non-negotiable):
 * - The note is an artifact of reflective examination, NOT a mood log. Microcopy
 *   must never prescribe a feeling ("how do you feel") or imply the note
 *   changes/improves the score. The label is fixed: "Your note".
 * - The note text is opaque — it is captured and rendered verbatim. Nothing here
 *   infers, scores, categorizes, or analyzes it.
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
import { SESSION_NOTE_MAX_LENGTH } from '@/features/assessment/stores/assessmentStore';

/** Fixed label — compliance + philosopher red line; never "clinical context". */
export const SESSION_NOTE_LABEL = 'Your note';
/** Neutral, reflection-inviting placeholder (philosopher-approved). */
export const SESSION_NOTE_PLACEHOLDER =
  'Add context for this check-in — a life event, or what was in your control.';

interface SessionNoteComposerProps {
  visible: boolean;
  /** Existing note text (empty string when none yet). */
  initialText: string;
  /** Short context line, e.g. the check-in date — never the score as a verdict. */
  subtitle?: string | undefined;
  onSave: (text: string) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  onCancel: () => void;
  /** Control that opened the sheet; focus returns here on close. */
  returnFocusRef?: React.RefObject<React.ComponentRef<typeof Pressable> | null>;
}

const SessionNoteComposer: React.FC<SessionNoteComposerProps> = ({
  visible,
  initialText,
  subtitle,
  onSave,
  onDelete,
  onCancel,
  returnFocusRef,
}) => {
  const [text, setText] = useState(initialText);
  const titleRef = useRef<React.ComponentRef<typeof Text> | null>(null);
  const bottomInset = useOverlayBottomInset();

  // Re-seed when the sheet opens for a different point (edit vs add).
  useEffect(() => {
    if (visible) setText(initialText);
  }, [visible, initialText]);

  const canSave = text.trim().length > 0;
  const hadNote = initialText.trim().length > 0;
  const remaining = SESSION_NOTE_MAX_LENGTH - text.length;

  const handleCancel = useCallback(() => {
    const handle = returnFocusRef?.current ? findNodeHandle(returnFocusRef.current) : null;
    if (handle != null) AccessibilityInfo.setAccessibilityFocus(handle);
    onCancel();
  }, [onCancel, returnFocusRef]);

  // Android hardware back — replaces `<Modal onRequestClose={onCancel}>`.
  // Registered only while visible; an always-mounted listener would swallow
  // back navigation app-wide.
  useEffect(() => {
    if (!visible) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleCancel();
      return true;
    });
    return () => sub.remove();
  }, [visible, handleCancel]);

  // Initial accessibility focus on the label, not the input. autoFocus used to
  // take it to the field, so the sheet never announced what it was.
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
      accessibilityViewIsModal
      testID="session-note-overlay"
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
      <View style={[styles.sheet, { paddingBottom: bottomInset }]} testID="session-note-composer">
          <View style={styles.handle} />

        <ScrollView style={styles.scrollRegion} keyboardShouldPersistTaps="handled">
          <Text ref={titleRef} style={styles.title} accessibilityRole="header" accessible>
            {SESSION_NOTE_LABEL}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          <TextInput
            style={styles.input}
            value={text}
            onChangeText={(next) =>
              setText(next.length > SESSION_NOTE_MAX_LENGTH ? next.slice(0, SESSION_NOTE_MAX_LENGTH) : next)
            }
            placeholder={SESSION_NOTE_PLACEHOLDER}
            placeholderTextColor={colorSystem.gray[400]}
            multiline
            textAlignVertical="top"
            maxLength={SESSION_NOTE_MAX_LENGTH}
            accessible
            accessibilityLabel={SESSION_NOTE_LABEL}
            accessibilityHint="Optional. A short personal note for this check-in."
            testID="session-note-input"
          />

          <Text
            style={styles.counter}
            accessibilityLabel={`${remaining} characters remaining`}
            // DEBUG-406: the label changes on every keystroke but nothing
            // announced it, so the 140-char limit was invisible to a screen
            // reader until maxLength silently truncated.
            accessibilityLiveRegion="polite"
            testID="session-note-counter"
          >
            {remaining}
          </Text>
        </ScrollView>

          <View style={styles.buttons}>
            {hadNote && (
              <Pressable
                style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
                onPress={onDelete}
                accessibilityRole="button"
                accessibilityLabel="Delete note"
                testID="session-note-delete"
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            )}

            <View style={styles.rightButtons}>
              <Pressable
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                onPress={handleCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                testID="session-note-cancel"
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
                accessibilityLabel="Save note"
                accessibilityState={{ disabled: !canSave }}
                testID="session-note-save"
              >
                <Text style={styles.primaryButtonText}>Save</Text>
              </Pressable>
            </View>
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
    // DEBUG-406 — OPAQUE and light. Was `rgba(0,0,0,0.4)`, compositing to
    // #999999 over this white host: 2.92:1 against the crisis button's #991B1B,
    // failing WCAG 1.4.11. Darkening cannot rescue it — for a mid-dark red the
    // ratio is non-monotonic, bottoming near 2.10 at #808080 and reaching only
    // 2.53 at black. Alpha is independently wrong: the composite would depend on
    // whatever the host draws behind it, so the measurement would describe the
    // screen rather than this overlay.
    backgroundColor: colorSystem.gray[200],
  },
  sheet: {
    backgroundColor: colorSystem.base.white,
    borderTopLeftRadius: borderRadius.large,
    borderTopRightRadius: borderRadius.large,
    padding: spacing[24],
    // Capped so the sheet cannot outgrow its box (DEBUG-403's ~13pt overflow
    // put a primary action's centre in clipped space, where the tap resolved in
    // the hierarchy but never reached the app).
    maxHeight: '100%',
    // paddingBottom applied inline: max(crisis band, keyboard height).
  },
  scrollRegion: {
    flexShrink: 1,
  },
  handle: {
    alignSelf: 'center',
    width: spacing[48],
    height: 4,
    borderRadius: 2,
    backgroundColor: colorSystem.gray[300],
    marginBottom: spacing[16],
  },
  title: {
    fontSize: typography.headline4.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
    marginBottom: spacing[4],
  },
  subtitle: {
    fontSize: typography.caption.size,
    color: semantic.text.secondary,
    marginBottom: spacing[12],
  },
  input: {
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    borderRadius: borderRadius.small,
    padding: spacing[12],
    minHeight: 96,
    fontSize: typography.bodyRegular.size,
    color: semantic.text.primary,
    marginBottom: spacing[4],
  },
  counter: {
    alignSelf: 'flex-end',
    fontSize: typography.caption.size,
    color: semantic.text.muted,
    marginBottom: spacing[16],
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // Keeps Save/Cancel/Delete out of the crisis button's contested column; it
    // renders at zIndex 9999 and wins an overlapping tap.
    paddingRight: OVERLAY_ACTION_ROW_PADDING_RIGHT,
  },
  rightButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[12],
    marginLeft: 'auto',
  },
  primaryButton: {
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[24],
    borderRadius: borderRadius.small,
    backgroundColor: colorSystem.base.midnightBlue,
    // DEBUG-406: measured ~43pt from padding alone, under WCAG 2.5.5.
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
  deleteButton: {
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[16],
    borderRadius: borderRadius.small,
    minHeight: TOUCH_TARGETS.minimum,
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: semantic.text.secondary,
  },
  pressed: {
    opacity: 0.7,
  },
});

export default SessionNoteComposer;
