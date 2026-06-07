/**
 * SessionNoteComposer (FEAT-195)
 *
 * Bottom-sheet modal for adding / editing / deleting a short "Your note"
 * annotation on a single wellness check-in. Mirrors the WeeklyReflectionComposer
 * pattern but capped at SESSION_NOTE_MAX_LENGTH (140) with a live character
 * counter and a delete affordance when a note already exists.
 *
 * FRAMING (philosopher-gated — non-negotiable):
 * - The note is an artifact of reflective examination, NOT a mood log. Microcopy
 *   must never prescribe a feeling ("how do you feel") or imply the note
 *   changes/improves the score. The label is fixed: "Your note".
 * - The note text is opaque — it is captured and rendered verbatim. Nothing here
 *   infers, scores, categorizes, or analyzes it.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  colorSystem,
  spacing,
  borderRadius,
  typography,
  semantic,
} from '@/core/theme';
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
}

const SessionNoteComposer: React.FC<SessionNoteComposerProps> = ({
  visible,
  initialText,
  subtitle,
  onSave,
  onDelete,
  onCancel,
}) => {
  const [text, setText] = useState(initialText);

  // Re-seed when the sheet opens for a different point (edit vs add).
  useEffect(() => {
    if (visible) setText(initialText);
  }, [visible, initialText]);

  const canSave = text.trim().length > 0;
  const hadNote = initialText.trim().length > 0;
  const remaining = SESSION_NOTE_MAX_LENGTH - text.length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Dismiss" />
        <View style={styles.sheet} testID="session-note-composer">
          <View style={styles.handle} />

          <Text style={styles.title}>{SESSION_NOTE_LABEL}</Text>
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
            autoFocus
            accessible
            accessibilityLabel={SESSION_NOTE_LABEL}
            accessibilityHint="Optional. A short personal note for this check-in."
            testID="session-note-input"
          />

          <Text
            style={styles.counter}
            accessibilityLabel={`${remaining} characters remaining`}
            testID="session-note-counter"
          >
            {remaining}
          </Text>

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
                onPress={onCancel}
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
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    backgroundColor: colorSystem.base.white,
    borderTopLeftRadius: borderRadius.large,
    borderTopRightRadius: borderRadius.large,
    padding: spacing[24],
    paddingBottom: spacing[32],
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
