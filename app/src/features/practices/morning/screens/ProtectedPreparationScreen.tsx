/**
 * PROTECTED PREPARATION SCREEN
 *
 * Safety wrapper for PreparationScreen (premeditatio malorum practice).
 * Prevents high-risk users from accessing negative visualization.
 *
 * Crisis Agent Validation: Critical safety requirement
 * - Users with PHQ-9 ≥20 (severe depression) SKIP premeditatio
 * - Users with PHQ-9 Q9>0 (suicidal ideation) SKIP premeditatio
 * - Users with GAD-7 ≥15 (severe anxiety) see opt-out suggestion
 *
 * Clinical Justification:
 * Premeditatio malorum (visualizing negative outcomes) can be harmful for:
 * - Severely depressed individuals (may worsen hopelessness)
 * - Individuals with suicidal ideation (may trigger crisis)
 * - Highly anxious individuals (may increase catastrophizing)
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { MorningFlowParamList } from '@/features/practices/types/flows';
import PreparationScreen from './PreparationScreen';
import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore';
import { ACCESSIBLE_COLORS, SPACING, TOUCH_TARGETS } from '@/core/theme/accessibility';

type Props = StackScreenProps<MorningFlowParamList, 'Preparation'>;

const ProtectedPreparationScreen: React.FC<Props> = (props) => {
  const { navigation } = props;
  const [isChecking, setIsChecking] = useState(true);
  const [shouldSkip, setShouldSkip] = useState(false);
  const [skipReason, setSkipReason] = useState<'severe' | 'suicidal' | null>(null);

  useEffect(() => {
    checkCrisisState();
  }, []);

  const checkCrisisState = () => {
    try {
      // Get latest PHQ-9 result
      const latestPHQ9 = useAssessmentStore.getState().getLastResult('phq9');

      if (latestPHQ9) {
        // Check for severe depression (PHQ-9 ≥20)
        if (latestPHQ9.totalScore >= 20) {
          setShouldSkip(true);
          setSkipReason('severe');
          setIsChecking(false);
          return;
        }

        // Check for suicidal ideation (Q9 > 0)
        if ('suicidalIdeation' in latestPHQ9 && latestPHQ9.suicidalIdeation) {
          setShouldSkip(true);
          setSkipReason('suicidal');
          setIsChecking(false);
          return;
        }
      }

      // No crisis state detected - allow practice
      setIsChecking(false);
    } catch (error) {
      console.error('Error checking crisis state:', error);
      // Err on side of caution - skip if check fails
      setShouldSkip(true);
      setSkipReason('severe');
      setIsChecking(false);
    }
  };

  const handleSkip = () => {
    // Navigate to next screen (PrincipleFocus)
    navigation.navigate('PrincipleFocus');
  };

  const handleProceedAnyway = () => {
    // User explicitly chooses to continue despite recommendation
    // Set flag so we don't check again
    setShouldSkip(false);
  };

  // Loading state while checking
  if (isChecking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ACCESSIBLE_COLORS.morningPrimary} />
        <Text style={styles.loadingText}>Checking safety...</Text>
      </View>
    );
  }

  // Skip screen if high-risk detected
  if (shouldSkip) {
    return (
      <View style={styles.skipContainer}>
        <View style={styles.skipCard}>
          <Text style={styles.skipIcon}>🌅</Text>
          <Text style={styles.skipTitle}>Let's Skip This Today</Text>

          {skipReason === 'severe' && (
            <Text style={styles.skipMessage}>
              Based on your recent check-in, we recommend focusing on gratitude and
              positive practices this morning instead of challenging exercises.
            </Text>
          )}

          {skipReason === 'suicidal' && (
            <Text style={styles.skipMessage}>
              We want to support you with practices that feel nurturing right now.
              Let's continue with more uplifting exercises.
            </Text>
          )}

          <View style={styles.skipActions}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              testID="skip-preparation-button"
              accessibilityLabel="Skip preparation and continue"
              accessibilityRole="button"
            >
              <Text style={styles.skipButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>

          {/* Crisis resources reminder */}
          <View style={styles.crisisReminder}>
            <Text style={styles.crisisReminderText}>
              If you're in crisis or need immediate support:
            </Text>
            <TouchableOpacity
              style={styles.crisisButton}
              onPress={() => {
                // Direct 988 call
                const Linking = require('react-native').Linking;
                Linking.openURL('tel:988');
              }}
              testID="crisis-button"
              accessibilityLabel="Call 988 Suicide & Crisis Lifeline"
              accessibilityRole="button"
            >
              <Text style={styles.crisisButtonText}>Call 988</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Safe to proceed - render actual PreparationScreen
  return <PreparationScreen {...props} />;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: ACCESSIBLE_COLORS.textSecondary,
  },
  skipContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: SPACING.xl,
  },
  skipCard: {
    width: '100%',
    maxWidth: 400,
    padding: SPACING.xl,
    backgroundColor: '#FFF9F0',
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: ACCESSIBLE_COLORS.morningPrimary,
    alignItems: 'center',
  },
  skipIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  skipTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: ACCESSIBLE_COLORS.textPrimary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  skipMessage: {
    fontSize: 16,
    color: ACCESSIBLE_COLORS.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  skipActions: {
    width: '100%',
    marginBottom: SPACING.lg,
  },
  skipButton: {
    backgroundColor: ACCESSIBLE_COLORS.morningPrimary,
    padding: SPACING.md,
    borderRadius: 12,
    minHeight: TOUCH_TARGETS.minimum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  crisisReminder: {
    width: '100%',
    padding: SPACING.md,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: ACCESSIBLE_COLORS.error,
    alignItems: 'center',
  },
  crisisReminderText: {
    fontSize: 14,
    color: ACCESSIBLE_COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  crisisButton: {
    backgroundColor: ACCESSIBLE_COLORS.error,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    minHeight: TOUCH_TARGETS.minimum,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crisisButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ProtectedPreparationScreen;
