/**
 * Flow Progress Indicator Component
 *
 * Shared progress indicator for flow navigator headers.
 * Displays current step and visual progress bar with theme-appropriate styling.
 *
 * INFRA-135: originally extracted from the three retired time-of-day navigators
 * (FEAT-298 slice 6c); now serves the daily loop.
 *
 * @see /docs/architecture/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colorSystem, spacing, borderRadius, typography, getTheme } from '@/core/theme';
import { themeKeyFor } from '@/core/types/practice-identity';

// FEAT-298 slice 1: re-exported from the canonical declaration, not re-declared.
export type { FlowType } from '@/core/types/practice-identity';
// FEAT-298 slice 3b: accepts any practice identity so the daily loop can pass its OWN
// identity instead of claiming to be midday. The palette is unchanged (themeKeyFor maps
// 'daily-loop' to midday) — what changes is that the prop now tells the truth.
import type { PracticeIdentity } from '@/core/types/practice-identity';

interface FlowProgressIndicatorProps {
  /** Current step number (1-indexed) */
  currentStep: number;
  /** Total number of steps in the flow */
  totalSteps: number;
  /** Practice identity for theme colouring */
  flowType: PracticeIdentity;
}

/**
 * Progress indicator for flow navigator headers.
 * Displays a progress bar and step counter with flow-specific theming.
 */
export const FlowProgressIndicator: React.FC<FlowProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  flowType,
}) => {
  const progress = (currentStep / totalSteps) * 100;
  const themeColors = getTheme(themeKeyFor(flowType));

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progress}%`,
              backgroundColor: themeColors.primary,
            },
          ]}
        />
      </View>
      <Text style={styles.progressText}>
        {currentStep} of {totalSteps}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  progressContainer: {
    alignItems: 'center',
    width: '100%',
  },
  progressBar: {
    width: 120,
    height: spacing[4],
    backgroundColor: colorSystem.gray[200],
    borderRadius: borderRadius.xs,
    marginBottom: spacing[4],
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.xs,
  },
  progressText: {
    fontSize: typography.micro.size,
    color: colorSystem.gray[600],
    fontWeight: typography.fontWeight.medium,
  },
});

export default FlowProgressIndicator;
