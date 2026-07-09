/**
 * DailyLoopCompleteScreen — FEAT-291
 *
 * Neutral completion for the daily loop. This is NOT a principle beat — the loop's
 * fifth and final principle is Interconnected Living. Offers an optional integration
 * note before returning home (mirrors Midday's CompassionateClose, without claiming
 * to be a principle step).
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colorSystem, spacing, borderRadius, typography, getTheme } from '@/core/theme';
import { AccessibleButton } from '@/core/components/accessibility/AccessibleButton';
import type { DailyLoopCompleteData } from '@/features/practices/types/flows';

export interface DailyLoopCompleteScreenProps {
  onComplete: (data: DailyLoopCompleteData) => void;
}

const DailyLoopCompleteScreen: React.FC<DailyLoopCompleteScreenProps> = ({ onComplete }) => {
  const themeColors = getTheme('midday');
  const [integrationNote, setIntegrationNote] = useState('');

  const handleDone = useCallback(() => {
    onComplete({
      ...(integrationNote.trim() ? { integrationNote: integrationNote.trim() } : {}),
      timestamp: new Date(),
    });
  }, [integrationNote, onComplete]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        testID="daily-loop-complete-screen"
      >
        <View style={[styles.badge, { backgroundColor: themeColors.background }]}>
          <Text style={[styles.badgeText, { color: themeColors.primary }]}>✓ Loop complete</Text>
        </View>

        <Text style={styles.title}>You moved through all five principles.</Text>
        <Text style={styles.subtitle}>
          Aware Presence · Radical Acceptance · Sphere Sovereignty · Virtuous Response ·
          Interconnected Living
        </Text>

        <Text style={styles.inputLabel}>Anything to carry back with you? (optional)</Text>
        <TextInput
          style={[
            styles.textInput,
            { borderColor: integrationNote ? themeColors.primary : colorSystem.gray[300] },
          ]}
          value={integrationNote}
          onChangeText={setIntegrationNote}
          placeholder="E.g., 'Focus on what's mine; act with courage.'"
          placeholderTextColor={colorSystem.gray[500]}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          accessibilityLabel="Optional note to carry back"
          accessibilityHint="Optional — leave blank to skip"
          testID="daily-loop-integration-input"
        />

        <AccessibleButton
          onPress={handleDone}
          label="Return to Home"
          variant="primary"
          size="large"
          theme="midday"
          testID="daily-loop-done-button"
          accessibilityHint="Finish and return to the home screen"
          style={{ marginTop: spacing[24] }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colorSystem.base.white },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing[20], paddingBottom: spacing[40] },
  badge: {
    padding: spacing[12],
    borderRadius: borderRadius.medium,
    marginBottom: spacing[24],
    alignItems: 'center',
  },
  badgeText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
  },
  title: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
  },
  subtitle: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
    marginBottom: spacing[24],
    lineHeight: typography.bodySmall.size * 1.5,
  },
  inputLabel: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
  },
  textInput: {
    borderWidth: 2,
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    fontSize: typography.bodyRegular.size,
    color: colorSystem.base.black,
    backgroundColor: colorSystem.base.white,
    minHeight: 90,
  },
});

export default DailyLoopCompleteScreen;
