/**
 * DEBUG-629 — the Daily Loop step header's title block.
 *
 * Extracted from `DailyLoopNavigator`'s inline `headerTitle` so its props can be asserted
 * without mounting a navigator. The geometry and the reasoning live in
 * `../config/headerLayout.ts`; this file is only the render.
 *
 * `pointerEvents="none"` is LOAD-BEARING, not tidiness. This View is a later flex sibling
 * than the header's `start` cell, so with the default `'auto'` its cell hit-tests above the
 * ✕ — measured at AX5 as an inoperable exit (see the module docblock). It holds no
 * interactive child, so declining touches costs nothing and makes the hit-steal
 * unrepresentable regardless of any future width change.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { semantic, spacing, typography } from '@/core/theme';
import { FlowProgressIndicator } from '../../shared/components';
import { DAILY_LOOP_HEADER_CHROME_MAX_FONT_SCALE } from '../config/headerLayout';

interface DailyLoopHeaderTitleProps {
  /** Current beat, 1-indexed. */
  currentStep: number;
  /** Beats in the resolved depth — 3 for quick, 5 for deep. Never a deep count on quick. */
  totalSteps: number;
  /** Suppressed on the coda, where progress chrome would convert closure into a metric. */
  showProgress: boolean;
}

export const DailyLoopHeaderTitle: React.FC<DailyLoopHeaderTitleProps> = ({
  currentStep,
  totalSteps,
  showProgress,
}) => (
  <View style={styles.headerContainer} pointerEvents="none" testID="daily-loop-header-title">
    {/* The string is frozen: it is the practice's identity at four surfaces, so no short
        form, no scale-conditional variant, and no `numberOfLines` — a clipped name reads
        worse than a wrap, and the band grows to hold it. */}
    <Text
      style={styles.headerTitle}
      maxFontSizeMultiplier={DAILY_LOOP_HEADER_CHROME_MAX_FONT_SCALE}
    >
      Daily Practice
    </Text>
    {showProgress && (
      <FlowProgressIndicator
        currentStep={currentStep}
        totalSteps={totalSteps}
        flowType="daily-loop"
        maxFontSizeMultiplier={DAILY_LOOP_HEADER_CHROME_MAX_FONT_SCALE}
      />
    )}
  </View>
);

const styles = StyleSheet.create({
  headerContainer: { alignItems: 'center', width: '100%' },
  headerTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
    marginBottom: spacing[4],
  },
});

export default DailyLoopHeaderTitle;
