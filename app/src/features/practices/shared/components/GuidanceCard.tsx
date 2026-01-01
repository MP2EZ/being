/**
 * GUIDANCE CARD - Shared DRY Component
 *
 * Displays sensory anchoring guidance for breathing screens.
 * Used across morning/midday/evening flows to teach Aware Presence.
 *
 * Props:
 * - title: Header text (e.g., "Before this day begins, notice:")
 * - items: Array of guidance points (e.g., ["The weight of your body", ...])
 *
 * @see /docs/architecture/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colorSystem, spacing, borderRadius, typography } from '@/core/theme';

interface GuidanceCardProps {
  title: string;
  items: string[];
  testID?: string;
}

const GuidanceCard: React.FC<GuidanceCardProps> = ({ title, items, testID }) => {
  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.list}>
        {items.map((item, index) => (
          <Text key={index} style={styles.item}>
            {'\u2022'} {item}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.medium,
    padding: spacing[20],
  },
  title: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[16],
  },
  list: {
    gap: spacing[12],
  },
  item: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    lineHeight: 24,
  },
});

export default GuidanceCard;
