/**
 * DailyLoopDepthSelectScreen — FEAT-301
 *
 * Per-session depth chooser: picks a quick or a deeper pass through the daily
 * practice. Shown only when the DailyLoop route was opened without a `depth` param.
 *
 * NON-NEGOTIABLES (philosopher / product):
 *  - Two EQUAL, always-available choices. No pre-selection, no "recommended", no
 *    badge / lock / star, no algorithmic or history-derived default. Availability
 *    never depends on tenure, history, or prior choices.
 *  - Symmetric, non-ranking copy: quick is never framed as lesser / lite / partial;
 *    deep is never framed as the "real" / "full" practice by contrast (see
 *    DEPTH_LABELS / DEPTH_PICKER_COPY in tenseMode.ts).
 *  - The chosen depth is per-session only (the navigator holds it in local state and
 *    never persists it) — the next session re-presents this same neutral choice.
 */
import React from 'react';
import { Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { colorSystem, spacing, borderRadius, typography, getTheme } from '@/core/theme';
import type { DailyLoopDepth } from '@/features/practices/types/flows';
import { DEPTH_LABELS, DEPTH_PICKER_COPY } from '../config/tenseMode';

export interface DailyLoopDepthSelectScreenProps {
  onSelect: (depth: DailyLoopDepth) => void;
}

// Order is presentation-only and carries no ranking (neither card is pre-selected,
// weighted, or badged). Matches the story's phrasing "a quick or a deeper version".
const DEPTHS: DailyLoopDepth[] = ['quick', 'deep'];

const DailyLoopDepthSelectScreen: React.FC<DailyLoopDepthSelectScreenProps> = ({ onSelect }) => {
  const themeColors = getTheme('midday');
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="daily-loop-depth-select-screen"
    >
      <Text style={styles.title}>{DEPTH_PICKER_COPY.title}</Text>
      <Text style={styles.subtitle}>{DEPTH_PICKER_COPY.subtitle}</Text>

      {DEPTHS.map((depth) => (
        <Pressable
          key={depth}
          onPress={() => onSelect(depth)}
          style={[styles.card, { borderColor: themeColors.primary }]}
          accessibilityRole="button"
          accessibilityLabel={`${DEPTH_LABELS[depth].label} practice`}
          accessibilityHint={DEPTH_LABELS[depth].blurb}
          testID={`daily-loop-depth-${depth}`}
        >
          <Text style={[styles.cardTitle, { color: themeColors.primary }]}>
            {DEPTH_LABELS[depth].label}
          </Text>
          <Text style={styles.cardBlurb}>{DEPTH_LABELS[depth].blurb}</Text>
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

export default DailyLoopDepthSelectScreen;
