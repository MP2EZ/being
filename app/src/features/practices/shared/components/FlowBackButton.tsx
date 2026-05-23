/**
 * FLOW BACK BUTTON COMPONENT
 *
 * Consistent back button used across all check-in flow screens.
 * Supports theming for morning/midday/evening flows.
 *
 * WCAG AA compliant:
 * - 44pt minimum touch target
 * - Proper accessibility role and label
 *
 * @example
 * <FlowBackButton onPress={() => navigation.goBack()} theme="morning" />
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colorSystem, spacing, typography, getTheme } from '@/core/theme';

export type FlowTheme = 'morning' | 'midday' | 'evening';

interface FlowBackButtonProps {
  /** Press handler (typically navigation.goBack) */
  onPress: () => void;
  /** Flow theme for color styling */
  theme?: FlowTheme;
  /** Optional test ID */
  testID?: string;
}

/**
 * FlowBackButton - Consistent back navigation across flow screens
 */
export const FlowBackButton: React.FC<FlowBackButtonProps> = ({
  onPress,
  theme = 'morning',
  testID = 'back-button',
}) => {
  const themeColors = getTheme(theme);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      testID={testID}
      accessibilityLabel="Go back"
      accessibilityRole="button"
    >
      <Text style={[styles.text, { color: themeColors.primary }]}>
        ← Back
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[20],
    padding: spacing[4],
    minHeight: 44, // WCAG touch target
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: typography.bodyRegular.size,
  },
});

export default FlowBackButton;
