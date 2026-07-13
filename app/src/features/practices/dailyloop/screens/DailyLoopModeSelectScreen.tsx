/**
 * DailyLoopModeSelectScreen — FEAT-291
 *
 * Prototype entry chooser: picks the tense mode (flat / morning / evening) so the
 * three modes are comparable head-to-head from a single Home entry. Shown only when
 * the DailyLoop route was opened without a `mode` param. The five principles, their
 * order, and their canonical names are identical across modes — only the voice of
 * the prompts changes.
 */
import React from 'react';
import { Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { colorSystem, spacing, borderRadius, typography, getTheme } from '@/core/theme';
import type { DailyLoopMode } from '@/features/practices/types/flows';
import { MODE_LABELS } from '../config/tenseMode';

export interface DailyLoopModeSelectScreenProps {
  onSelect: (mode: DailyLoopMode) => void;
}

const MODES: DailyLoopMode[] = ['flat', 'morning', 'evening'];

const DailyLoopModeSelectScreen: React.FC<DailyLoopModeSelectScreenProps> = ({ onSelect }) => {
  const themeColors = getTheme('midday');
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="daily-loop-mode-select-screen"
    >
      <Text style={styles.title}>Daily Practice</Text>
      <Text style={styles.subtitle}>
        One loop through the Five Principles. Choose how it's framed — this is a
        prototype comparing the three.
      </Text>

      {MODES.map((mode) => (
        <Pressable
          key={mode}
          onPress={() => onSelect(mode)}
          style={[styles.card, { borderColor: themeColors.primary }]}
          accessibilityRole="button"
          accessibilityLabel={`${MODE_LABELS[mode].label} mode`}
          accessibilityHint={MODE_LABELS[mode].blurb}
          testID={`daily-loop-mode-${mode}`}
        >
          <Text style={[styles.cardTitle, { color: themeColors.primary }]}>
            {MODE_LABELS[mode].label}
          </Text>
          <Text style={styles.cardBlurb}>{MODE_LABELS[mode].blurb}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colorSystem.base.white },
  content: { padding: spacing[20], paddingBottom: spacing[40] },
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
  },
  subtitle: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    marginBottom: spacing[24],
    lineHeight: typography.bodyRegular.size * 1.5,
  },
  card: {
    borderWidth: 2,
    borderRadius: borderRadius.medium,
    padding: spacing[20],
    marginBottom: spacing[16],
    minHeight: 44,
  },
  cardTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[4],
  },
  cardBlurb: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
  },
});

export default DailyLoopModeSelectScreen;
