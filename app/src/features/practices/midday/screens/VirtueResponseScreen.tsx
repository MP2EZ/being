/**
 * VIRTUE RESPONSE SCREEN (Screen 3 of 4)
 *
 * MAINT-65: Stoic Mindfulness Midday Flow - Simplified
 * Principle: Virtuous Response (demonstrated through action)
 *
 * Purpose: Identify a virtuous action (simplified per UX/Philosopher validation)
 *
 * Structure (UX-simplified):
 * 1. Previous answer card (shows "within power" from Screen 2)
 * 2. Single text input: "What's one small, virtuous action you could take?"
 *
 * UX/Philosopher validated: Removed principle picker + Cardinal Virtues card
 * Virtue is demonstrated through action, not by naming/categorizing
 * "Wisdom and integrity" + "best self" embeds virtue without taxonomy
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
import type { MiddayFlowParamList, VirtueResponseData } from '@/features/practices/types/flows';

type Props = StackScreenProps<MiddayFlowParamList, 'VirtueResponse'> & {
  onSave?: (data: VirtueResponseData) => void;
  previousWithinPower?: string | undefined;
};

const VirtueResponseScreen: React.FC<Props> = ({
  navigation,
  route,
  onSave,
  previousWithinPower,
}) => {
  // FEAT-23: Restore initial data if resuming session
  const initialData = (route.params as any)?.initialData as VirtueResponseData | undefined;

  // State - single text input (simplified from input + principle picker)
  const [virtuousResponse, setVirtuousResponse] = useState(initialData?.virtuousResponse || '');

  const themeColors = getTheme('midday');

  // Handle continue
  const handleContinue = useCallback(() => {
    if (!virtuousResponse.trim()) {
      return;
    }

    const data: VirtueResponseData = {
      virtuousResponse: virtuousResponse.trim(),
      timestamp: new Date(),
    };

    onSave?.(data);
    navigation.navigate('CompassionateClose');
  }, [virtuousResponse, onSave, navigation]);

  const canContinue = virtuousResponse.trim().length > 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        testID="virtue-response-screen"
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
        <Text style={styles.sectionTitle}>Virtue Response</Text>
        <Text style={styles.sectionSubtitle}>
          What would wisdom call you to do here?
        </Text>

        {/* Previous Answer Card - Context from Screen 2 */}
        {previousWithinPower && (
          <PreviousAnswerCard
            label="What's within your power:"
            answer={previousWithinPower}
            theme="midday"
            testID="previous-power-card"
          />
        )}

        {/* Virtuous Action Input - Single focused input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>
            What's one small, virtuous action you could take?
          </Text>
          <Text style={styles.inputHint}>
            Consider: What would your best self do here?
          </Text>

          <TextInput
            style={[
              styles.textInput,
              { borderColor: virtuousResponse ? themeColors.primary : colorSystem.gray[300] },
            ]}
            value={virtuousResponse}
            onChangeText={setVirtuousResponse}
            placeholder="E.g., 'Speak calmly, ask for what I need, take a break...'"
            placeholderTextColor={colorSystem.gray[500]}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            accessibilityLabel="Your virtuous action"
            accessibilityHint="Describe one small action you could take"
            testID="virtuous-response-input"
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

export default VirtueResponseScreen;
