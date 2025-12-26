/**
 * Flow Progress Indicator Component
 *
 * Shared progress indicator for flow navigator headers.
 * Displays current step and visual progress bar with theme-appropriate styling.
 *
 * INFRA-135: Extracted from MorningFlowNavigator, MiddayFlowNavigator, EveningFlowNavigator
 * to reduce code duplication (~75 lines saved across 3 navigators).
 *
 * @see /docs/architecture/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colorSystem, spacing, borderRadius, typography, getTheme } from '@/core/theme';

export type FlowType = 'morning' | 'midday' | 'evening';

interface FlowProgressIndicatorProps {
  /** Current step number (1-indexed) */
  currentStep: number;
  /** Total number of steps in the flow */
  totalSteps: number;
  /** Flow type for theme coloring */
  flowType: FlowType;
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
  const themeColors = getTheme(flowType);

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
