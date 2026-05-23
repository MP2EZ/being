/**
 * FLOW HEADER COMPONENT
 *
 * Consistent header pattern used across all check-in flow screens.
 * Displays title with optional subtitle.
 *
 * Usage across flows:
 * - Morning: "Principle Focus" / "Which principle will you practice today?"
 * - Midday: "What's weighing on you?" (single title)
 * - Evening: "What are you grateful for today?" / optional subtitle
 *
 * @example
 * <FlowHeader
 *   title="Principle Focus"
 *   subtitle="Which principle will you practice today?"
 * />
 *
 * @example
 * <FlowHeader title="What are you grateful for today?" centered />
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colorSystem, spacing, typography } from '@/core/theme';

interface FlowHeaderProps {
  /** Main title text */
  title: string;
  /** Optional subtitle text */
  subtitle?: string;
  /** Center-align the header (for breathing/transition screens) */
  centered?: boolean;
  /** Use larger headline size (headline2 vs headline3) */
  large?: boolean;
  /** Optional container style override */
  style?: ViewStyle;
  /** Optional title style override */
  titleStyle?: TextStyle;
  /** Optional subtitle style override */
  subtitleStyle?: TextStyle;
}

/**
 * FlowHeader - Consistent header pattern across flow screens
 */
export const FlowHeader: React.FC<FlowHeaderProps> = ({
  title,
  subtitle,
  centered = false,
  large = false,
  style,
  titleStyle,
  subtitleStyle,
}) => {
  return (
    <View style={[styles.container, centered && styles.centered, style]}>
      <Text
        style={[
          styles.title,
          large ? styles.titleLarge : styles.titleStandard,
          titleStyle,
        ]}
      >
        {title}
      </Text>
      {subtitle && (
        <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[24],
  },
  centered: {
    alignItems: 'center',
  },
  title: {
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.black,
  },
  titleLarge: {
    fontSize: typography.headline2.size,
    marginBottom: spacing[8],
  },
  titleStandard: {
    fontSize: typography.headline3.size,
    marginBottom: spacing[8],
  },
  subtitle: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
  },
});

export default FlowHeader;
