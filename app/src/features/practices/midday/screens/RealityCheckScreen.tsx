/**
 * REALITY CHECK SCREEN (Screen 2 of 4)
 *
 * MAINT-65: Stoic Mindfulness Midday Flow - Simplified
 * Principles: Sphere Sovereignty (Dichotomy of Control)
 *
 * Purpose: Focus on what's controllable
 *
 * Structure (UX-simplified):
 * 1. Previous answer card (shows situation from Screen 1)
 * 2. Single text input: "What can you actually control or influence here?"
 *
 * UX/Philosopher validated: Removed 3-way acceptance selector + quote
 * Dichotomy of control embedded in helper text
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
import { PreviousAnswerCard } from '@/features/practices/shared/components/PreviousAnswerCard';
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

  // State - single text input (simplified from acceptance selector + input)
  const [withinPower, setWithinPower] = useState(initialData?.withinPower || '');

  const themeColors = getTheme('midday');

  // Handle continue
  const handleContinue = useCallback(() => {
    if (!withinPower.trim()) {
      return;
    }

    const data: RealityCheckData = {
      withinPower: withinPower.trim(),
      timestamp: new Date(),
    };

    onSave?.(data);
    navigation.navigate('VirtueResponse');
  }, [withinPower, onSave, navigation]);

  const canContinue = withinPower.trim().length > 0;

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

        {/* Section Header */}
        <Text style={styles.sectionTitle}>Reality Check</Text>
        <Text style={styles.sectionSubtitle}>
          Let's examine what's truly within your power.
        </Text>

        {/* Previous Answer Card - Context from Screen 1 */}
        {previousSituation && (
          <PreviousAnswerCard
            label="What's weighing on you:"
            answer={previousSituation}
            theme="midday"
            testID="previous-situation-card"
          />
        )}

        {/* Sphere of Control Input - Single focused input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>
            What can you actually control or influence here?
          </Text>
          <Text style={styles.inputHint}>
            Focus on your own thoughts, intentions, and actions—not outcomes or other people's behavior.
          </Text>

          <TextInput
            style={[
              styles.textInput,
              { borderColor: withinPower ? themeColors.primary : colorSystem.gray[300] },
            ]}
            value={withinPower}
            onChangeText={setWithinPower}
            placeholder="E.g., 'My response, my attitude, asking for help...'"
            placeholderTextColor={colorSystem.gray[500]}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            accessibilityLabel="What's within your power"
            accessibilityHint="Enter what you can control in this situation"
            testID="within-power-input"
          />
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
    marginBottom: spacing[16],
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
    minHeight: 120,
  },

  // Continue button
  continueButton: {
    padding: spacing[16],
    borderRadius: borderRadius.medium,
    alignItems: 'center',
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
