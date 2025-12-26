/**
 * COMPASSIONATE CLOSE SCREEN (Screen 4 of 4)
 *
 * MAINT-65: Stoic Mindfulness Midday Flow - Simplified
 * Principle: Interconnected Living (Self-compassion)
 *
 * Purpose: Single integration prompt + completion
 *
 * Structure (UX-simplified):
 * 1. Single optional text input: "What do you need to remember?"
 * 2. Visible Complete button
 * 3. CelebrationToast on completion (auto-dismiss, consistent with morning flow)
 *
 * @see /docs/design/midday-flow-wireframes-v2.md
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import { colorSystem, spacing, borderRadius, typography, getTheme } from '@/core/theme';
import { CelebrationToast } from '@/core/components/CelebrationToast';
import type { MiddayFlowParamList, CompassionateCloseData } from '@/features/practices/types/flows';

type Props = StackScreenProps<MiddayFlowParamList, 'CompassionateClose'> & {
  onComplete?: (data: CompassionateCloseData) => void;
  startTime?: number; // Flow start time for duration calculation
};

const CompassionateCloseScreen: React.FC<Props> = ({
  route,
  onComplete,
  startTime,
}) => {
  // FEAT-23: Restore initial data if resuming session
  const initialData = (route.params as any)?.initialData as CompassionateCloseData | undefined;

  // State
  const [integrationNote, setIntegrationNote] = useState(initialData?.integrationNote || '');
  const [showToast, setShowToast] = useState(false);
  const [completionData, setCompletionData] = useState<CompassionateCloseData | null>(null);

  const themeColors = getTheme('midday');

  // Calculate duration in minutes
  const getDurationMinutes = () => {
    if (!startTime) return 3; // Default estimate
    return Math.max(1, Math.round((Date.now() - startTime) / 60000));
  };

  // Handle complete - show toast
  const handleComplete = useCallback(() => {
    const data: CompassionateCloseData = {
      integrationNote: integrationNote.trim() || undefined,
      timestamp: new Date(),
    };

    setCompletionData(data);
    setShowToast(true);
  }, [integrationNote]);

  // Handle toast dismiss - trigger completion callback
  const handleToastComplete = useCallback(() => {
    if (completionData) {
      onComplete?.(completionData);
    }
  }, [completionData, onComplete]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        testID="compassionate-close-screen"
      >
        {/* Header */}
        <Text style={styles.sectionTitle}>Compassionate Close</Text>
        <Text style={styles.sectionSubtitle}>
          You've done the work. Now, close with kindness.
        </Text>

        {/* Single Integration Input (Optional) */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>
            What do you need to remember as you return to your day?
          </Text>
          <Text style={styles.inputHint}>
            A reminder, intention, or word of kindness. (Optional)
          </Text>

          <TextInput
            style={[
              styles.textInput,
              { borderColor: integrationNote ? themeColors.primary : colorSystem.gray[300] },
            ]}
            value={integrationNote}
            onChangeText={setIntegrationNote}
            placeholder="E.g., 'I can only control my effort' or 'Be patient with myself'"
            placeholderTextColor={colorSystem.gray[500]}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            accessibilityLabel="Integration note"
            accessibilityHint="What do you need to remember?"
            testID="integration-note-input"
          />
        </View>

        {/* Complete Button */}
        <Pressable
          style={({ pressed }) => [
            styles.completeButton,
            { backgroundColor: themeColors.primary },
            pressed && styles.completeButtonPressed,
          ]}
          onPress={handleComplete}
          accessibilityRole="button"
          accessibilityLabel="Complete midday reset"
          testID="complete-button"
        >
          <Text style={styles.completeButtonText}>Complete</Text>
        </Pressable>
      </ScrollView>

      {/* Celebration Toast */}
      {showToast && (
        <CelebrationToast
          flowType="midday"
          screenCount={4}
          duration={getDurationMinutes()}
          streak={1} // TODO: Get actual streak from user data
          onComplete={handleToastComplete}
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[20],
    paddingBottom: spacing[40],
  },

  // Section header
  sectionTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
  },
  sectionSubtitle: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    marginBottom: spacing[24],
  },

  // Input section
  inputSection: {
    marginBottom: spacing[32],
  },
  inputLabel: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
  },
  inputHint: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
    marginBottom: spacing[16],
    lineHeight: typography.bodySmall.size * 1.5,
  },
  textInput: {
    borderWidth: 2,
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    fontSize: typography.bodyRegular.size,
    color: colorSystem.base.black,
    backgroundColor: colorSystem.base.white,
    minHeight: 100,
  },

  // Complete button
  completeButton: {
    padding: spacing[16],
    borderRadius: borderRadius.medium,
    alignItems: 'center',
  },
  completeButtonPressed: {
    opacity: 0.8,
  },
  completeButtonText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
});

export default CompassionateCloseScreen;
