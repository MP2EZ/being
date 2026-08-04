/**
 * DailyLoopCompleteScreen — FEAT-291
 *
 * Closing coda + completion. Opens with a short "breathe and release" breath that
 * mirrors step 1's opening breath (bookending the loop and returning to Aware
 * Presence) — this is practice-architecture, deliberately NOT folded into step 5
 * (Interconnected Living). The breath is SKIPPABLE and short (crisis review:
 * non-trapping; the root crisis overlay stays tappable throughout). Then a neutral
 * completion with an optional integration note. This is NOT a principle beat.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colorSystem, spacing, borderRadius, typography, getTheme } from '@/core/theme';
import { AccessibleButton } from '@/core/components/accessibility/AccessibleButton';
import { BreathingCircle, Timer, SkipLink } from '@/features/practices/shared/components';
import type { DailyLoopMode, DailyLoopCompleteData, DailyLoopDepth } from '@/features/practices/types/flows';
import { CLOSING, STEP_TITLES, getStepKeysForDepth, getCompleteTitle } from '../config/tenseMode';

const CLOSING_BREATH_MS = 15 * 1000;

export interface DailyLoopCompleteScreenProps {
  /** Per-session depth (FEAT-301) — drives the depth-accurate completion copy. */
  depth: DailyLoopDepth;
  /**
   * Session tense (FEAT-298 slice 6b). The ONLY structural cost of the re-homed gratitude
   * line: unlike postureLine, gratitude varies by tense, so the coda needs the mode the
   * navigator already holds. Not user-facing — since slice 5 the tense is inferred from
   * the clock and never displayed.
   */
  mode: DailyLoopMode;
  onComplete: (data: DailyLoopCompleteData) => void;
}

const DailyLoopCompleteScreen: React.FC<DailyLoopCompleteScreenProps> = ({ depth, mode, onComplete }) => {
  const themeColors = getTheme('midday');
  const [breathDone, setBreathDone] = useState(false);
  const [isBreathActive, setIsBreathActive] = useState(true);
  const [integrationNote, setIntegrationNote] = useState('');

  const finishBreath = useCallback(() => {
    setBreathDone(true);
    setIsBreathActive(false);
  }, []);

  const handleDone = useCallback(() => {
    onComplete({
      ...(integrationNote.trim() ? { integrationNote: integrationNote.trim() } : {}),
      timestamp: new Date(),
    });
  }, [integrationNote, onComplete]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        testID="daily-loop-complete-screen"
      >
        {/* Closing-breath coda (mirrors step 1; skippable) */}
        {!breathDone && (
          <View style={styles.breathSection}>
            <Text style={styles.breathTitle}>{CLOSING.breathTitle}</Text>
            <Text style={styles.breathSubtitle}>{CLOSING.breathSubtitle}</Text>
            <View style={styles.breathCircleContainer}>
              <BreathingCircle
                isActive={isBreathActive}
                pattern={{ inhale: 4000, exhale: 4000 }}
                testID="daily-loop-closing-breathing-circle"
              />
            </View>
            <Timer
              duration={CLOSING_BREATH_MS}
              isActive={isBreathActive}
              onComplete={finishBreath}
              onPause={() => setIsBreathActive(false)}
              onResume={() => setIsBreathActive(true)}
              showProgress
              showControls
              showSkip={false}
              theme="midday"
              testID="daily-loop-closing-timer"
            />
            <SkipLink
              onPress={finishBreath}
              accessibilityLabel="Skip closing breath"
              testID="daily-loop-skip-closing-breath"
            />
          </View>
        )}

        {/* Completion */}
        {breathDone && (
          <>
            <View style={[styles.badge, { backgroundColor: themeColors.background }]}>
              <Text style={[styles.badgeText, { color: themeColors.primary }]}>✓ Loop complete</Text>
            </View>

            {/* Depth-accurate: quick moved through 3 canonical beats, not five —
                naming all five (or "all five principles") would be false + re-rank quick. */}
            <Text style={styles.title}>{getCompleteTitle(depth)}</Text>
            <Text style={styles.subtitle}>
              {getStepKeysForDepth(depth).map((k) => STEP_TITLES[k]).join(' · ')}
            </Text>

            {/* FEAT-298 slice 6b — gratitude, re-homed from the retired morning/evening
                flows. Tense-varied (unlike the posture below), static (nothing to submit or
                skip), and placed BEFORE the posture because De Ira 3.36 runs review →
                clemency and the pardon is terminal. */}
            <Text style={styles.gratitudeLine}>{CLOSING.gratitudeLine[mode]}</Text>

            {/* FEAT-298 slice 6a — self-compassion posture, re-homed from the retired
                Midday CompassionateCloseScreen. Placement is load-bearing: this sits in the
                POST-BREATH block, never in the breath section above, because the breath is
                skippable (SkipLink) and anything attached to it is invisible to a skipper —
                the exact failure that stranded the evening step-4 compassion hint. */}
            <Text style={styles.postureLine}>{CLOSING.postureLine}</Text>

            <Text style={styles.inputLabel}>{CLOSING.noteLabel}</Text>
            <TextInput
              style={[
                styles.textInput,
                { borderColor: integrationNote ? themeColors.primary : colorSystem.gray[300] },
              ]}
              value={integrationNote}
              onChangeText={setIntegrationNote}
              placeholder={CLOSING.notePlaceholder}
              placeholderTextColor={colorSystem.gray[500]}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              accessibilityLabel="Optional note to carry back"
              accessibilityHint="Optional — leave blank to skip"
              testID="daily-loop-integration-input"
            />

            {/* MAINT-140's "return anytime", re-homed and made Stoic: beginning again IS
                the practice (Marcus 5.9), not a concession. Quiet static line — no toast. */}
            <Text style={styles.returnLine}>{CLOSING.returnLine}</Text>

            <AccessibleButton
              onPress={handleDone}
              label="Return to Home"
              variant="primary"
              size="large"
              theme="midday"
              testID="daily-loop-done-button"
              accessibilityHint="Finish and return to the home screen"
              style={{ marginTop: spacing[24] }}
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colorSystem.base.white },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing[20], paddingBottom: spacing[40] },

  breathSection: { alignItems: 'center', paddingTop: spacing[24] },
  breathTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    textAlign: 'center',
    marginBottom: spacing[8],
  },
  breathSubtitle: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    textAlign: 'center',
    marginBottom: spacing[32],
  },
  breathCircleContainer: { marginBottom: spacing[24] },

  badge: {
    padding: spacing[12],
    borderRadius: borderRadius.medium,
    marginBottom: spacing[24],
    alignItems: 'center',
  },
  badgeText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
  },
  title: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
  },
  subtitle: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
    marginBottom: spacing[24],
    lineHeight: typography.bodySmall.size * 1.5,
  },
  // FEAT-298 slice 6a — quiet, non-congratulatory register. Deliberately the same muted
  // gray as `subtitle`, never accent-coloured or emphasised: the coda carries a posture,
  // not a reward.
  // Styled identically to postureLine — same quiet register, same muted gray.
  gratitudeLine: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
    marginBottom: spacing[16],
    lineHeight: typography.bodySmall.size * 1.5,
  },
  postureLine: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
    marginBottom: spacing[24],
    lineHeight: typography.bodySmall.size * 1.5,
  },
  returnLine: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
    marginTop: spacing[16],
    lineHeight: typography.bodySmall.size * 1.5,
  },
  inputLabel: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
  },
  textInput: {
    borderWidth: 2,
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    fontSize: typography.bodyRegular.size,
    color: colorSystem.base.black,
    backgroundColor: colorSystem.base.white,
    minHeight: 90,
  },
});

export default DailyLoopCompleteScreen;
