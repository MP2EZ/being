/**
 * VIRTUE RESPONSE SCREEN (Screen 3 of 4)
 *
 * MAINT-65: Stoic Mindfulness Midday Flow - Refactored
 * Principle: Virtuous Response (Virtue ethics in action)
 *
 * Purpose: Choose virtuous response, identify guiding principle
 *
 * Structure:
 * 1. Previous answer card (shows "within power" from Screen 2)
 * 2. Text input: "How does virtue invite you to respond?"
 * 3. Principle picker (REQUIRED - feeds Insights dashboard)
 *
 * Critical: The principle picker selection feeds the Insights dashboard
 * to track which principles users apply most often.
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
import { StoicPrinciplePicker } from '@/features/practices/shared/components/StoicPrinciplePicker';
import type { MiddayFlowParamList, VirtueResponseData } from '@/features/practices/types/flows';
import type { StoicPrinciple } from '@/features/practices/types/stoic';

type Props = StackScreenProps<MiddayFlowParamList, 'VirtueResponse'> & {
  onSave?: (data: VirtueResponseData) => void;
  previousSituation?: string | undefined;
  previousWithinPower?: string | undefined;
};

const VirtueResponseScreen: React.FC<Props> = ({
  navigation,
  route,
  onSave,
  previousSituation,
  previousWithinPower,
}) => {
  // FEAT-23: Restore initial data if resuming session
  const initialData = (route.params as any)?.initialData as VirtueResponseData | undefined;

  // State
  const [virtuousResponse, setVirtuousResponse] = useState(initialData?.virtuousResponse || '');
  const [guidingPrinciple, setGuidingPrinciple] = useState<StoicPrinciple | null>(
    initialData?.guidingPrinciple || null
  );

  const themeColors = getTheme('midday');

  // Handle continue
  const handleContinue = useCallback(() => {
    if (!virtuousResponse.trim() || !guidingPrinciple) {
      return;
    }

    const data: VirtueResponseData = {
      virtuousResponse: virtuousResponse.trim(),
      guidingPrinciple,
      timestamp: new Date(),
    };

    onSave?.(data);
    navigation.navigate('CompassionateClose');
  }, [virtuousResponse, guidingPrinciple, onSave, navigation]);

  const canContinue = virtuousResponse.trim().length > 0 && guidingPrinciple !== null;

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

        {/* Previous Answer Card */}
        {previousWithinPower && (
          <PreviousAnswerCard
            label="What's within your power:"
            answer={previousWithinPower}
            theme="midday"
            testID="previous-power-card"
          />
        )}

        {/* Section Header */}
        <Text style={styles.sectionTitle}>Virtue Response</Text>
        <Text style={styles.sectionSubtitle}>
          How would wisdom, courage, justice, or temperance guide you here?
        </Text>

        {/* Virtuous Response Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>
            How does virtue invite you to respond? <Text style={styles.required}>*</Text>
          </Text>
          <Text style={styles.inputHint}>
            Consider what the best version of yourself would do.
          </Text>

          <TextInput
            style={[
              styles.textInput,
              { borderColor: virtuousResponse ? themeColors.primary : colorSystem.gray[300] },
            ]}
            value={virtuousResponse}
            onChangeText={setVirtuousResponse}
            placeholder="E.g., 'I'll speak calmly, focus on solutions, ask for what I need...'"
            placeholderTextColor={colorSystem.gray[500]}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            accessibilityLabel="Your virtuous response"
            accessibilityHint="Describe how virtue invites you to respond"
            testID="virtuous-response-input"
          />
        </View>

        {/* Principle Picker */}
        <View style={styles.pickerSection}>
          <StoicPrinciplePicker
            value={guidingPrinciple}
            onChange={setGuidingPrinciple}
            theme="midday"
            label="Which principle is guiding you?"
            required
            testID="principle-picker"
          />
        </View>

        {/* Four Virtues Reference */}
        <View style={[styles.virtuesCard, { backgroundColor: themeColors.background }]}>
          <Text style={styles.virtuesTitle}>The Four Cardinal Virtues</Text>
          <View style={styles.virtuesList}>
            <Text style={styles.virtueItem}>
              <Text style={styles.virtueName}>Wisdom</Text> — Right judgment in the moment
            </Text>
            <Text style={styles.virtueItem}>
              <Text style={styles.virtueName}>Courage</Text> — Facing what's difficult
            </Text>
            <Text style={styles.virtueItem}>
              <Text style={styles.virtueName}>Justice</Text> — Treating others rightly
            </Text>
            <Text style={styles.virtueItem}>
              <Text style={styles.virtueName}>Temperance</Text> — Self-control and moderation
            </Text>
          </View>
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

  // Picker section
  pickerSection: {
    marginBottom: spacing[24],
  },

  // Virtues card
  virtuesCard: {
    padding: spacing[16],
    borderRadius: borderRadius.medium,
    marginBottom: spacing[24],
  },
  virtuesTitle: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.gray[700],
    marginBottom: spacing[12],
  },
  virtuesList: {
    gap: spacing[8],
  },
  virtueItem: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[600],
    lineHeight: typography.caption.size * 1.4,
  },
  virtueName: {
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.gray[700],
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

export default VirtueResponseScreen;
