/**
 * Weekly Reflection Composer (FEAT-194)
 *
 * Bottom-sheet modal for writing or editing this week's reflection.
 * Mirrors the RN `Modal` pattern from `ResumeSessionModal`.
 *
 * Single open-text input — no prompts beyond the card's "What did this week
 * teach you?" question. Save / Cancel only.
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

const MAX_LEN = 5000;

interface WeeklyReflectionComposerProps {
  visible: boolean;
  initialText: string;
  onSave: (text: string) => void | Promise<void>;
  onCancel: () => void;
}

const WeeklyReflectionComposer: React.FC<WeeklyReflectionComposerProps> = ({
  visible,
  initialText,
  onSave,
  onCancel,
}) => {
  const [text, setText] = useState(initialText);

  // Sync controlled text with incoming initialText whenever the modal opens
  // (handles Edit-on-saved-reflection case where prefill changes between opens).
  useEffect(() => {
    if (visible) {
      setText(initialText);
    }
  }, [visible, initialText]);

  const canSave = text.trim().length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Dismiss" />
        <View style={styles.sheet} testID="weekly-reflection-composer">
          <View style={styles.handle} />

          <Text style={styles.title}>What did this week teach you?</Text>

          <TextInput
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
            autoFocus
            testID="weekly-reflection-input"
          />

          <View style={styles.buttons}>
            <Pressable
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              onPress={onCancel}
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
  pressed: {
    opacity: 0.7,
  },
});

export default WeeklyReflectionComposer;
