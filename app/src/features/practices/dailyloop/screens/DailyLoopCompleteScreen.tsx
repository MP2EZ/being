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
import type { DailyLoopCompleteData, DailyLoopDepth } from '@/features/practices/types/flows';
import { CLOSING, STEP_TITLES, getStepKeysForDepth, getCompleteTitle } from '../config/tenseMode';

const CLOSING_BREATH_MS = 15 * 1000;

export interface DailyLoopCompleteScreenProps {
  /** Per-session depth (FEAT-301) — drives the depth-accurate completion copy. */
  depth: DailyLoopDepth;
  onComplete: (data: DailyLoopCompleteData) => void;
}

const DailyLoopCompleteScreen: React.FC<DailyLoopCompleteScreenProps> = ({ depth, onComplete }) => {
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
