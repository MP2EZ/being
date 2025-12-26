/**
 * REALITY CHECK SCREEN (Screen 2 of 4)
 *
 * MAINT-65: Stoic Mindfulness Midday Flow - Refactored
 * Principles: Radical Acceptance + Sphere Sovereignty
 *
 * Purpose: Accept reality, identify what's controllable
 *
 * Structure:
 * 1. Previous answer card (shows situation from Screen 1)
 * 2. Graduated acceptance selector (3 levels)
 * 3. Text input: "What's actually within your power here?"
 *
 * Philosopher-validated levels:
 * - Full: "I can accept this as it is"
 * - Aware Resistance: "I notice I'm resisting"
 * - Struggling: "I'm struggling to accept" (no shame - honest acknowledgment)
 *
 * @see /docs/design/midday-flow-wireframes-v2.md
 * @see /docs/architecture/Stoic-Mindfulness-Architecture-v1.0.md
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
import { PreviousAnswerCard } from '@/features/practices/shared/components/PreviousAnswerCard';
import { GraduatedAcceptanceSelector, type AcceptanceLevel } from '@/features/practices/shared/components/GraduatedAcceptanceSelector';
import type { MiddayFlowParamList, RealityCheckData } from '@/features/practices/types/flows';

type Props = StackScreenProps<MiddayFlowParamList, 'RealityCheck'> & {
  onSave?: (data: RealityCheckData) => void;
  previousSituation?: string | undefined;
};

const RealityCheckScreen: React.FC<Props> = ({
  navigation,
  route,
  onSave,
  previousSituation,
}) => {
  // FEAT-23: Restore initial data if resuming session
  const initialData = (route.params as any)?.initialData as RealityCheckData | undefined;

  // State
  const [acceptanceLevel, setAcceptanceLevel] = useState<AcceptanceLevel | null>(
    initialData?.acceptanceLevel || null
  );
  const [withinPower, setWithinPower] = useState(initialData?.withinPower || '');

  const themeColors = getTheme('midday');

  // Handle continue
  const handleContinue = useCallback(() => {
    if (!acceptanceLevel || !withinPower.trim()) {
      return;
    }

    const data: RealityCheckData = {
      acceptanceLevel,
      withinPower: withinPower.trim(),
      timestamp: new Date(),
    };

    onSave?.(data);
    navigation.navigate('VirtueResponse');
  }, [acceptanceLevel, withinPower, onSave, navigation]);

  const canContinue = acceptanceLevel !== null && withinPower.trim().length > 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        testID="reality-check-screen"
      >
        {/* Back Button */}
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          testID="back-button"
        >
          <Text style={[styles.backButtonText, { color: themeColors.primary }]}>← Back</Text>
        </Pressable>

        {/* Previous Answer Card */}
        {previousSituation && (
          <PreviousAnswerCard
            label="What's weighing on you:"
            answer={previousSituation}
            theme="midday"
            testID="previous-situation-card"
          />
        )}

        {/* Section Header */}
        <Text style={styles.sectionTitle}>Reality Check</Text>
        <Text style={styles.sectionSubtitle}>
          Accept what's happening, then identify what you can control.
        </Text>

        {/* Graduated Acceptance Selector */}
        <View style={styles.acceptanceSection}>
          <GraduatedAcceptanceSelector
            value={acceptanceLevel}
            onChange={setAcceptanceLevel}
            theme="midday"
            testID="acceptance-selector"
          />
        </View>

        {/* Sphere of Control Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>
            What's actually within your power here? <Text style={styles.required}>*</Text>
          </Text>
          <Text style={styles.inputHint}>
            Focus on your intentions, judgments, and responses—not outcomes.
          </Text>

          <TextInput
            style={[
              styles.textInput,
              { borderColor: withinPower ? themeColors.primary : colorSystem.gray[300] },
            ]}
            value={withinPower}
            onChangeText={setWithinPower}
            placeholder="E.g., 'I can choose how I respond, ask for help, set boundaries...'"
            placeholderTextColor={colorSystem.gray[500]}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            accessibilityLabel="What's within your power"
            accessibilityHint="Enter what you can control in this situation"
            testID="within-power-input"
          />
        </View>

        {/* Stoic Wisdom Note */}
        <View style={[styles.wisdomCard, { backgroundColor: themeColors.background }]}>
          <Text style={styles.wisdomText}>
            "Make the best use of what is in your power, and take the rest as it happens."
          </Text>
          <Text style={[styles.wisdomSource, { color: themeColors.primary }]}>
            — Epictetus, Enchiridion 1
          </Text>
        </View>

        {/* Continue Button */}
        <Pressable
          style={({ pressed }) => [
            styles.continueButton,
            { backgroundColor: canContinue ? themeColors.primary : colorSystem.gray[300] },
            pressed && canContinue && styles.continueButtonPressed,
          ]}
          onPress={handleContinue}
          disabled={!canContinue}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canContinue }}
          accessibilityLabel="Continue to next step"
          testID="continue-button"
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </Pressable>
      </ScrollView>
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

  // Back button
  backButton: {
    marginBottom: spacing[20],
  },
  backButtonText: {
    fontSize: typography.bodyRegular.size,
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

  // Acceptance section
  acceptanceSection: {
    marginBottom: spacing[24],
  },

  // Input section
  inputSection: {
    marginBottom: spacing[24],
  },
  inputLabel: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.gray[700],
    marginBottom: spacing[8],
  },
  required: {
    color: colorSystem.status.error,
  },
  inputHint: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[600],
    marginBottom: spacing[12],
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

  // Wisdom card
  wisdomCard: {
    padding: spacing[16],
    borderRadius: borderRadius.medium,
    marginBottom: spacing[24],
  },
  wisdomText: {
    fontSize: typography.bodySmall.size,
    fontStyle: 'italic',
    color: colorSystem.gray[700],
    lineHeight: typography.bodySmall.size * 1.5,
    marginBottom: spacing[8],
  },
  wisdomSource: {
    fontSize: typography.caption.size,
    fontWeight: typography.fontWeight.medium,
  },

  // Continue button
  continueButton: {
    padding: spacing[16],
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    marginTop: spacing[8],
  },
  continueButtonPressed: {
    opacity: 0.8,
  },
  continueButtonText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
});

export default RealityCheckScreen;
