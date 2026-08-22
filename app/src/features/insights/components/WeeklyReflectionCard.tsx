/**
 * Weekly Reflection Card (FEAT-194)
 *
 * Single-prompt card on the Insights tab inviting the user to write down what
 * they noticed this week. Replaces the standalone weekly-review feature
 * (FEAT-53, cancelled) with a minimal philosophically-authentic surface.
 *
 * Anchor: Seneca, Letters 84 — "for deepening, not catching up.
 * Daily practice remains the work."
 *
 * Render gate: only when there are >=4 check-ins in the last 7 days.
 * Below the threshold the card renders nothing — no "locked" state copy,
 * no gamification, no nudges.
 *
 * Anti-scope (do not extend):
 *   - No frequency counts of any kind.
 *   - No "pick next week's focus" CTA (would recreate FEAT-50 anti-scope).
 *   - No algorithmic prompts.
 */

import React, { useMemo, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import {
  colorSystem,
  spacing,
  borderRadius,
  typography,
  semantic,
} from '@/core/theme';
import { useStoicPracticeStore } from '@/features/practices/stores/stoicPracticeStore';
import { getIsoWeekStart } from '@/core/utils/isoWeek';
import WeeklyReflectionComposer from './WeeklyReflectionComposer';
import { useRootOverlay } from '@/core/navigation/rootOverlaySlot';

const MIN_CHECK_INS_TO_SHOW = 4;
const PROMPT_LABEL = 'What did this week teach you?';
const FRAMING = 'For deepening, not catching up. Daily practice remains the work.';

const WeeklyReflectionCard: React.FC = () => {
  const [composerOpen, setComposerOpen] = useState(false);
  // Focus returns here when the composer closes — the overlay is no longer an
  // RN <Modal>, so nothing restores it for free.
  const triggerRef = useRef<React.ComponentRef<typeof Pressable> | null>(null);

  const getCheckInHistory = useStoicPracticeStore((s) => s.getCheckInHistory);
  const checkInCompletions = useStoicPracticeStore((s) => s.checkInCompletions);
  const getWeeklyReflectionForWeek = useStoicPracticeStore((s) => s.getWeeklyReflectionForWeek);
  const weeklyReflections = useStoicPracticeStore((s) => s.weeklyReflections);
  const addWeeklyReflection = useStoicPracticeStore((s) => s.addWeeklyReflection);

  const weekStartIso = useMemo(() => getIsoWeekStart(), []);

  // Raw-array deps are intentional: re-memoize when the store array changes
  // even though the selector function reference is stable. Mirrors the
  // pattern in `InsightsScreen.tsx` (PERF-03).
  const checkInsThisWeek = useMemo(
    () => getCheckInHistory(7).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getCheckInHistory, checkInCompletions]
  );

  const reflection = useMemo(
    () => getWeeklyReflectionForWeek(weekStartIso),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getWeeklyReflectionForWeek, weeklyReflections, weekStartIso]
  );

  const handleSave = useCallback(
    async (text: string) => {
      await addWeeklyReflection(text);
      setComposerOpen(false);
    },
    [addWeeklyReflection]
  );

  // DEBUG-406: publish the composer into the root overlay slot. Declared before
  // the early return below so the hook order is stable across renders.
  useRootOverlay('weekly-reflection-composer', composerOpen, () => (
    <WeeklyReflectionComposer
      visible
      initialText={reflection?.text ?? ''}
      onSave={handleSave}
      onCancel={() => setComposerOpen(false)}
      returnFocusRef={triggerRef}
    />
  ));

  if (checkInsThisWeek < MIN_CHECK_INS_TO_SHOW) {
    return null;
  }

  return (
    <View style={styles.container} testID="weekly-reflection-card">
      <Text style={styles.title}>Reflection</Text>
      <Text style={styles.subtitle}>{FRAMING}</Text>

      {reflection ? (
        <View style={styles.savedSection}>
          <Text style={styles.savedText}>{reflection.text}</Text>
          <Pressable
            ref={triggerRef}
            style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
            onPress={() => setComposerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Edit weekly reflection"
            testID="weekly-reflection-edit"
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          ref={triggerRef}
          style={({ pressed }) => [styles.promptButton, pressed && styles.pressed]}
          onPress={() => setComposerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={PROMPT_LABEL}
          testID="weekly-reflection-prompt"
        >
          <Text style={styles.promptText}>{PROMPT_LABEL}</Text>
          <Text style={styles.promptChevron}>›</Text>
        </Pressable>
      )}

      {/* DEBUG-406: the composer renders into the ROOT overlay slot, not here.
          This card sits inside InsightsScreen's ScrollView, and RN resolves
          `position: 'absolute'` against the parent's padding box — so an inline
          full-bleed overlay would cover the card, scroll away with the content,
          and be clipped outright on Android. The slot's box is the screen and it
          paints immediately below the crisis button. Nothing is rendered at this
          point in the tree; `useRootOverlay` above publishes it. */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colorSystem.base.white,
    // MAINT-222: unified content-card radius (xl=16)
    borderRadius: borderRadius.xl,
    padding: spacing[16],
    marginBottom: spacing[16],
  },
  title: {
    fontSize: typography.headline4.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
    marginBottom: spacing[4],
  },
  subtitle: {
    fontSize: typography.bodySmall.size,
    color: semantic.text.muted,
    fontStyle: 'italic',
    marginBottom: spacing[16],
  },
  promptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[16],
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: semantic.border.default,
    borderRadius: borderRadius.medium,
  },
  promptText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    flex: 1,
  },
  promptChevron: {
    marginLeft: spacing[8],
    fontSize: typography.bodyRegular.size,
    color: semantic.text.muted,
  },
  savedSection: {
    gap: spacing[12],
  },
  savedText: {
    fontSize: typography.bodyRegular.size,
    color: semantic.text.primary,
    lineHeight: 22,
  },
  editButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[12],
    borderRadius: borderRadius.small,
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
  },
  editButtonText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: semantic.text.primary,
  },
  pressed: {
    opacity: 0.7,
  },
});

export default WeeklyReflectionCard;
