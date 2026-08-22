/**
 * GUIDANCE CARD - Shared DRY Component
 *
 * Displays sensory anchoring guidance as a titled bullet list.
 *
 * NO PRODUCTION CONSUMER AS OF DEBUG-468. This docstring used to claim it was
 * "used across morning/midday/evening flows" — those flows were retired in
 * FEAT-298 slice 6c, leaving `DailyLoopStepScreen` as the only caller, and
 * DEBUG-468 replaced that use with anchors paced through the breath itself
 * (the card was ~245pt at wrap and sat ~350pt below the fold on an iPhone SE 3).
 * What remains referencing it is its own coverage, in BOTH test roots:
 * `__tests__/unit/shared/GuidanceCard.test.tsx` and
 * `src/features/practices/__tests__/accessibility/practices-surface-contrast…`.
 * Kept rather than deleted because removing a component is a call of its own, not
 * a side effect of a layout fix — but do not treat those suites as evidence that
 * anything ships this.
 *
 * Props:
 * - title: Header text (e.g., "Before this day begins, notice:")
 * - items: Array of guidance points (e.g., ["The weight of your body", ...])
 *
 * @see /docs/architecture/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colorSystem, semantic, spacing, borderRadius, typography } from '@/core/theme';

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
    color: semantic.text.primary,
    marginBottom: spacing[16],
  },
  list: {
    gap: spacing[12],
  },
  item: {
    fontSize: typography.bodyRegular.size,
    color: semantic.text.secondary,
    lineHeight: 24,
  },
});

export default GuidanceCard;
