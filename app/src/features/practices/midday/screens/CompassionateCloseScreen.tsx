/**
 * COMPASSIONATE CLOSE SCREEN (Screen 4 of 4)
 *
 * MAINT-65: Stoic Mindfulness Midday Flow - Refactored
 * Principle: Interconnected Living (Relational ethics, self-compassion)
 *
 * Purpose: Self-compassion and integration into afternoon
 *
 * Structure:
 * 1. Previous answer card (shows virtuous response from Screen 3)
 * 2. Optional self-compassion input: "What kindness do you need?"
 * 3. Optional afternoon intention: "How will you carry this forward?"
 * 4. Completion card with summary
 *
 * Design: Both inputs are optional to respect user's time and energy.
 * Focus on closure and transition back to day.
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
import type { MiddayFlowParamList, CompassionateCloseData } from '@/features/practices/types/flows';

type Props = StackScreenProps<MiddayFlowParamList, 'CompassionateClose'> & {
  onComplete?: (data: CompassionateCloseData) => void;
  previousVirtuousResponse?: string | undefined;
};

const CompassionateCloseScreen: React.FC<Props> = ({
  navigation,
  route,
  onComplete,
  previousVirtuousResponse,
}) => {
  // FEAT-23: Restore initial data if resuming session
  const initialData = (route.params as any)?.initialData as CompassionateCloseData | undefined;

  // State - both fields are optional
  const [selfCompassion, setSelfCompassion] = useState(initialData?.selfCompassion || '');
  const [afternoonIntention, setAfternoonIntention] = useState(
    initialData?.afternoonIntention || ''
  );

  const themeColors = getTheme('midday');

  // Handle complete
  const handleComplete = useCallback(() => {
    const data: CompassionateCloseData = {
      selfCompassion: selfCompassion.trim() || undefined,
      afternoonIntention: afternoonIntention.trim() || undefined,
      timestamp: new Date(),
    };

    onComplete?.(data);
  }, [selfCompassion, afternoonIntention, onComplete]);

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

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Compassionate Close</Text>
          <Text style={styles.headerSubtitle}>
            Take a moment of kindness before returning to your day.
          </Text>
        </View>

        {/* Previous Answer Card */}
        {previousVirtuousResponse && (
          <PreviousAnswerCard
            label="Your virtuous response:"
            answer={previousVirtuousResponse}
            theme="midday"
            testID="previous-response-card"
          />
        )}

        {/* Self-Compassion Input (Optional) */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>What kindness do you need?</Text>
          <Text style={styles.inputHint}>
            Offer yourself the same understanding you'd give a friend. (Optional)
          </Text>

          <TextInput
            style={[
              styles.textInput,
              { borderColor: selfCompassion ? themeColors.primary : colorSystem.gray[300] },
            ]}
            value={selfCompassion}
            onChangeText={setSelfCompassion}
            placeholder="E.g., 'I'm doing my best in a difficult situation...'"
            placeholderTextColor={colorSystem.gray[500]}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
            accessibilityLabel="Self-compassion note"
            accessibilityHint="What kindness do you need right now?"
            testID="self-compassion-input"
          />
        </View>

        {/* Afternoon Intention Input (Optional) */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>How will you carry this forward?</Text>
          <Text style={styles.inputHint}>
            A simple intention for the rest of your day. (Optional)
          </Text>

          <TextInput
            style={[
              styles.textInput,
              { borderColor: afternoonIntention ? themeColors.primary : colorSystem.gray[300] },
            ]}
            value={afternoonIntention}
            onChangeText={setAfternoonIntention}
            placeholder="E.g., 'I'll pause before reacting, stay present in my next meeting...'"
            placeholderTextColor={colorSystem.gray[500]}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
            accessibilityLabel="Afternoon intention"
            accessibilityHint="How will you carry this forward into your afternoon?"
            testID="afternoon-intention-input"
          />
        </View>

        {/* Completion Card */}
        <View style={[styles.completionCard, { backgroundColor: themeColors.background }]}>
          <Text style={[styles.completionIcon, { color: themeColors.primary }]}>✓</Text>
          <Text style={styles.completionTitle}>Midday Reset Complete</Text>
          <Text style={styles.completionText}>
            You've taken a meaningful pause. Return to your day with renewed perspective.
          </Text>
        </View>

        {/* Stoic Wisdom */}
        <View style={styles.wisdomSection}>
          <Text style={styles.wisdomText}>
            "The soul becomes dyed with the color of its thoughts."
          </Text>
          <Text style={[styles.wisdomSource, { color: themeColors.primary }]}>
            — Marcus Aurelius, Meditations 5:16
          </Text>
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
          accessibilityLabel="Complete midday reset and return to home"
          testID="complete-button"
        >
          <Text style={styles.completeButtonText}>Complete & Return Home</Text>
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
    marginBottom: spacing[8],
  },
  backButtonText: {
    fontSize: typography.bodyRegular.size,
  },

  // Header
  header: {
    marginBottom: spacing[24],
    paddingTop: spacing[16],
  },
  headerTitle: {
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
  },
  headerSubtitle: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
  },

  // Input section
  inputSection: {
    marginBottom: spacing[20],
  },
  inputLabel: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.gray[700],
    marginBottom: spacing[4],
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
    minHeight: 80,
  },

  // Completion card
  completionCard: {
    padding: spacing[24],
    borderRadius: borderRadius.large,
    alignItems: 'center',
    marginBottom: spacing[24],
  },
  completionIcon: {
    fontSize: 48,
    marginBottom: spacing[12],
  },
  completionTitle: {
    fontSize: typography.headline4.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
    textAlign: 'center',
  },
  completionText: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
    textAlign: 'center',
    lineHeight: typography.bodySmall.size * 1.5,
  },

  // Wisdom section
  wisdomSection: {
    marginBottom: spacing[24],
    alignItems: 'center',
  },
  wisdomText: {
    fontSize: typography.bodySmall.size,
    fontStyle: 'italic',
    color: colorSystem.gray[700],
    textAlign: 'center',
    lineHeight: typography.bodySmall.size * 1.5,
    marginBottom: spacing[8],
  },
  wisdomSource: {
    fontSize: typography.caption.size,
    fontWeight: typography.fontWeight.medium,
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
