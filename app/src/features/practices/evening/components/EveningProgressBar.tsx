/**
 * EVENING PROGRESS BAR - FEAT-134
 *
 * Shared progress indicator for evening flow screens.
 * Uses progress bar style (like morning/midday) for consistency.
 *
 * UX Rationale:
 * - Bar > Dots for 6+ steps (clearer percentage progress)
 * - Consistent with morning/midday flows
 * - Smooth visual progression supports calming evening UX
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { spacing, typography, colorSystem, borderRadius } from '@/core/theme';

interface EveningProgressBarProps {
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
  showBackButton?: boolean;
}

const EveningProgressBar: React.FC<EveningProgressBarProps> = ({
  currentStep,
  totalSteps,
  onBack,
  showBackButton = true,
}) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <View style={styles.container}>
      {/* Back button row */}
      <View style={styles.topRow}>
        {showBackButton && onBack ? (
          <Pressable
            onPress={onBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            accessibilityHint="Return to previous screen"
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
        ) : (
          <View style={styles.backButtonPlaceholder} />
        )}

        {/* Progress indicator */}
        <View style={styles.progressWrapper}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%` }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {currentStep}/{totalSteps}
          </Text>
        </View>

        {/* Spacer for balance */}
        <View style={styles.backButtonPlaceholder} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[16],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[4],
    minWidth: 70,
  },
  backButtonText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.themes.evening.primary,
    fontWeight: typography.fontWeight.medium,
  },
  backButtonPlaceholder: {
    minWidth: 70,
  },
  progressWrapper: {
    flex: 1,
    alignItems: 'center',
    maxWidth: 200,
  },
  progressBar: {
    width: 120,
    height: spacing[4],
    backgroundColor: colorSystem.gray[300],
    borderRadius: borderRadius.xs,
    marginBottom: spacing[4],
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colorSystem.themes.evening.primary,
    borderRadius: borderRadius.xs,
  },
  progressText: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[600],
    fontWeight: typography.fontWeight.medium,
  },
});

export default EveningProgressBar;
