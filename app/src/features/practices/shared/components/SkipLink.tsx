/**
 * SKIP LINK COMPONENT
 *
 * Consistent "Skip →" link used across all check-in flow screens.
 * Allows users to bypass optional content while maintaining flow progress.
 *
 * WCAG AA compliant:
 * - 44pt minimum touch target
 * - Proper accessibility role and label
 *
 * Design Decision (Philosopher validated):
 * - Skip buttons respect user agency per Stoic Mindfulness principles
 * - Forward-oriented arrow suggests progression, not abandonment
 *
 * @example
 * <SkipLink onPress={handleSkip} label="Skip gratitude" />
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colorSystem, spacing, typography } from '@/core/theme';

interface SkipLinkProps {
  /** Press handler */
  onPress: () => void;
  /** Accessibility label describing what is being skipped */
  accessibilityLabel: string;
  /** Optional test ID */
  testID?: string;
}

/**
 * SkipLink - Consistent skip navigation across flow screens
 */
export const SkipLink: React.FC<SkipLinkProps> = ({
  onPress,
  accessibilityLabel,
  testID = 'skip-button',
}) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <Text style={styles.text}>Skip →</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: spacing[12],
    minHeight: 44, // WCAG touch target
    justifyContent: 'center',
  },
  text: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[500],
  },
});

export default SkipLink;
