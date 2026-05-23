/**
 * PAUSE & ACKNOWLEDGE SCREEN (Screen 1 of 4)
 *
 * MAINT-65: Stoic Mindfulness Midday Flow - Refactored
 * Principle: Aware Presence (Present-moment attention)
 *
 * Purpose: Transition from "doing" to "being" + name what's present
 *
 * Structure:
 * 1. 30s micro-breath (using BreathingCircle component)
 * 2. Text input: "What's weighing on you right now?"
 *
 * Design: BreathingCircle with 30s countdown, then input field appears
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import { colorSystem, spacing, borderRadius, typography, getTheme } from '@/core/theme';
import { AccessibleButton } from '@/core/components/accessibility/AccessibleButton';
import { BreathingCircle, Timer, GuidanceCard, SkipLink } from '@/features/practices/shared/components';
import type { MiddayFlowParamList, PauseAcknowledgeData } from '@/features/practices/types/flows';

type Props = StackScreenProps<MiddayFlowParamList, 'PauseAcknowledge'> & {
  onSave?: (data: PauseAcknowledgeData) => void;
};

// 30 second micro-breath
const BREATH_DURATION_MS = 30 * 1000;

const PauseAcknowledgeScreen: React.FC<Props> = ({ navigation, route, onSave }) => {
  // FEAT-23: Restore initial data if resuming session
  const initialData = (route.params as any)?.initialData as PauseAcknowledgeData | undefined;

  // State
  const [breathCompleted, setBreathCompleted] = useState(initialData?.breathCompleted || false);
  const [situation, setSituation] = useState(initialData?.situation || '');
  const [isBreathActive, setIsBreathActive] = useState(!initialData?.breathCompleted);

  const themeColors = getTheme('midday');

  // Handle breath completion
  const handleBreathComplete = useCallback(() => {
    setBreathCompleted(true);
    setIsBreathActive(false);
  }, []);

  // Handle continue
  const handleContinue = useCallback(() => {
    if (!situation.trim()) {
      return;
    }

    const data: PauseAcknowledgeData = {
      breathCompleted: true,
      breathDuration: 30,
      situation: situation.trim(),
      timestamp: new Date(),
    };

    onSave?.(data);
    navigation.navigate('RealityCheck');
  }, [situation, onSave, navigation]);

  // Skip breathing (accessibility option)
  const handleSkipBreath = useCallback(() => {
    setBreathCompleted(true);
    setIsBreathActive(false);
  }, []);

  const canContinue = breathCompleted && situation.trim().length > 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        testID="pause-acknowledge-screen"
      >
        {/* Breathing Phase */}
        {!breathCompleted && (
          <View style={styles.breathSection}>
            <Text style={styles.breathTitle}>Take a moment to pause</Text>
            <Text style={styles.breathSubtitle}>
              Let your body settle. Notice what's here.
            </Text>

            {/* Breathing Circle */}
            <View style={styles.breathCircleContainer}>
              <BreathingCircle
                isActive={isBreathActive}
                pattern={{ inhale: 4000, exhale: 4000 }}
                testID="pause-breathing-circle"
              />
            </View>

            {/* Timer */}
            <Timer
              duration={BREATH_DURATION_MS}
              isActive={isBreathActive}
              onComplete={handleBreathComplete}
              onPause={() => setIsBreathActive(false)}
              onResume={() => setIsBreathActive(true)}
              showProgress
              showControls
              showSkip={false}
              theme="midday"
              testID="pause-breath-timer"
            />

            {/* Skip Link - Consistent with morning/evening flows */}
            <SkipLink
              onPress={handleSkipBreath}
              accessibilityLabel="Skip breathing exercise"
              testID="midday-skip-breath"
            />

            {/* Guidance Card */}
            <View style={styles.guidanceWrapper}>
              <GuidanceCard
                title="Pause and notice:"
                items={[
                  'Your posture right now',
                  'The rhythm of your breath',
                  "What's asking for your attention",
                ]}
                testID="midday-pause-guidance"
              />
            </View>
          </View>
        )}

        {/* Input Phase (shown after breathing completes) */}
        {breathCompleted && (
          <View style={styles.inputSection}>
            {/* Section Header */}
            <Text style={styles.sectionTitle}>Pause & Acknowledge</Text>
            <Text style={styles.sectionSubtitle}>
              You've paused. Now name what's present.
            </Text>

            {/* Completion message */}
            <View style={[styles.completionCard, { backgroundColor: themeColors.background }]}>
              <Text style={[styles.completionText, { color: themeColors.primary }]}>
                ✓ Breath complete
              </Text>
            </View>

            {/* Input section */}
            <Text style={styles.inputLabel}>
              What's present right now?
            </Text>
            <Text style={styles.inputHint}>
              Name the situation, thought, or feeling you notice.
            </Text>

            <TextInput
              style={[
                styles.textInput,
                { borderColor: situation ? themeColors.primary : colorSystem.gray[300] },
              ]}
              value={situation}
              onChangeText={setSituation}
              placeholder="E.g., 'Feeling overwhelmed by the project deadline'"
              placeholderTextColor={colorSystem.gray[500]}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              accessibilityLabel="Describe what's weighing on you"
              accessibilityHint="Enter the situation, thought, or feeling that's present"
              testID="situation-input"
            />

            {/* Character count hint */}
            {situation.length > 0 && (
              <Text style={styles.charCount}>
                {situation.length} characters
              </Text>
            )}
          </View>
        )}

        {/* Continue Button */}
        {breathCompleted && (
          <AccessibleButton
            onPress={handleContinue}
            label="Continue"
            variant="primary"
            size="large"
            theme="midday"
            disabled={!canContinue}
            testID="continue-button"
            accessibilityHint="Continue to next step"
            style={{ marginTop: spacing[24] }}
          />
        )}
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

  // Breathing section
  breathSection: {
    alignItems: 'center',
    paddingTop: spacing[24],
  },
  breathTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    textAlign: 'center',
    marginBottom: spacing[8],
  },
  breathSubtitle: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    textAlign: 'center',
    marginBottom: spacing[32],
  },
  breathCircleContainer: {
    marginBottom: spacing[24],
  },
  guidanceWrapper: {
    marginTop: spacing[24],
    width: '100%',
  },

  // Section header (input phase)
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
    paddingTop: spacing[16],
  },
  completionCard: {
    padding: spacing[12],
    borderRadius: borderRadius.medium,
    marginBottom: spacing[24],
    alignItems: 'center',
  },
  completionText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
  },
  inputLabel: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
  },
  inputHint: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
    marginBottom: spacing[16],
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
  charCount: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[500],
    textAlign: 'right',
    marginTop: spacing[4],
  },
});

export default PauseAcknowledgeScreen;
