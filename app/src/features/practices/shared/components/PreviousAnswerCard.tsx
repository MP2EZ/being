/**
 * Previous Answer Card Component
 *
 * MAINT-65: Displays previous screen's answer for contextual continuity.
 * Used in midday flow screens 2-4 to show what user entered on prior screen.
 *
 * Design: Quoted text in subtle card with gray left border accent.
 * Follows wireframes: /docs/design/midday-flow-wireframes-v2.md
 *
 * @see /docs/design/midday-flow-wireframes-v2.md
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colorSystem, spacing, borderRadius, typography, getTheme } from '@/core/theme';

export type FlowTheme = 'morning' | 'midday' | 'evening';

interface PreviousAnswerCardProps {
  /** The label describing what this answer is */
  label: string;
  /** The user's previous answer text */
  answer: string;
  /** Flow theme for styling */
  theme?: FlowTheme;
  /** Optional test ID for testing */
  testID?: string;
}

/**
 * PreviousAnswerCard - Displays previous screen's answer
 *
 * @example
 * <PreviousAnswerCard
 *   label="What's weighing on you:"
 *   answer={situationData}
 *   theme="midday"
 * />
 */
export const PreviousAnswerCard: React.FC<PreviousAnswerCardProps> = ({
  label,
  answer,
  theme = 'midday',
  testID = 'previous-answer-card',
}) => {
  const themeColors = getTheme(theme);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colorSystem.gray[100],
          borderLeftColor: themeColors.primary,
        },
      ]}
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={`${label} ${answer}`}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.answer}>"{answer}"</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing[16],
    borderRadius: borderRadius.medium,
    borderLeftWidth: 4,
    marginBottom: spacing[16],
  },
  label: {
    fontSize: typography.caption.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.gray[600],
    marginBottom: spacing[4],
  },
  answer: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.gray[700],
    fontStyle: 'italic',
    lineHeight: typography.bodyRegular.size * 1.4,
  },
});

export default PreviousAnswerCard;
