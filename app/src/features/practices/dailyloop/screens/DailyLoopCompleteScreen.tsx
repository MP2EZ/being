/**
 * DailyLoopCompleteScreen — FEAT-291
 *
 * Closing coda + completion. Opens with a short "breathe and release" breath that
 * mirrors step 1's opening breath (bookending the loop and returning to Aware
 * Presence) — this is practice-architecture, deliberately NOT folded into step 5
 * (Interconnected Living). The breath is SKIPPABLE and short (crisis review:
 * non-trapping; the root crisis overlay stays tappable throughout). Then a neutral
 * completion with an optional integration note. This is NOT a principle beat.
 *
 * FEAT-328 removed the "✓ Loop complete" pill that used to open the post-breath block.
 * Do not reinstate a completion marker here. Completion is STATED by the title; marking it
 * as well made the coda congratulate twice in its two most prominent positions. The
 * governing rule lives with the closing copy in `tenseMode.ts` (INVARIANTS) — read it there
 * before adding anything to the top of this block.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  AccessibilityInfo,
  findNodeHandle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colorSystem, spacing, borderRadius, typography, getTheme, semantic } from '@/core/theme';
import { AccessibleButton } from '@/core/components/accessibility/AccessibleButton';
import { BreathingCircle, Timer, SkipLink } from '@/features/practices/shared/components';
// Module-scope constant, not an inline literal: `pattern` sits in BreathingCircle's
// animation-effect dep array, so a fresh object identity each parent render both
// defeats its React.memo and can restart the breath cycle mid-practice (DEBUG-394).
import { DEFAULT_PATTERN } from '@/features/practices/shared/breathingPatterns';
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

  const insets = useSafeAreaInsets();
  const titleRef = useRef<Text>(null);

  const finishBreath = useCallback(() => {
    setBreathDone(true);
    setIsBreathActive(false);
  }, []);

  // WCAG 4.1.3 — when the breath section unmounts, VoiceOver focus is left on a destroyed
  // element and iOS gives no announcement. A user who let the 15s timer run out (so had no
  // tap to anchor focus) would sit in silence, unaware the screen changed. Move focus to
  // the title, which since FEAT-328 is also the first post-breath element — so the
  // announcement and the visual top of the block are the same substantive line.
  useEffect(() => {
    if (!breathDone) return;
    const handle = findNodeHandle(titleRef.current);
    if (!handle) return;
    const frame = requestAnimationFrame(() => AccessibilityInfo.setAccessibilityFocus(handle));
    return () => cancelAnimationFrame(frame);
  }, [breathDone]);

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
                pattern={DEFAULT_PATTERN}
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
            {/* Depth-accurate: quick moved through 3 canonical beats, not five —
                naming all five (or "all five principles") would be false + re-rank quick. */}
            <Text ref={titleRef} style={styles.title} accessibilityRole="header">
              {getCompleteTitle(depth)}
            </Text>
            {/* The visible '·' separator is silent at default VoiceOver punctuation
                verbosity, collapsing five names into one run-on. Same words, comma-joined,
                so every TTS engine gets a prosodic pause. STEP_TITLES stays the source. */}
            <Text
              style={styles.subtitle}
              accessibilityLabel={getStepKeysForDepth(depth).map((k) => STEP_TITLES[k]).join(', ')}
            >
              {getStepKeysForDepth(depth).map((k) => STEP_TITLES[k]).join(' · ')}
            </Text>

            {/* FEAT-298 slice 6b — gratitude, re-homed from the retired morning/evening
                flows. Tense-varied (unlike the posture below), static (nothing to submit or
                skip), and placed BEFORE the posture because De Ira 3.36 runs review →
                clemency and the pardon is terminal. */}
            {/* One passage, two movements. De Ira 3.36 is a single act — review → clemency
                — and the pardon being terminal is expressed by the posture being LAST in the
                box. Two containers would present them as independent affordances of equal
                standing and lose the sequence.
                Deliberately NOT accessible={true}: combined these are ~250 chars, one
                utterance a screen-reader user cannot pause inside or re-read half of. Two
                distinct stops is correct. Do not "match the visual grouping" here. */}
            <View style={styles.passage}>
              <Text style={styles.gratitudeLine}>{CLOSING.gratitudeLine[mode]}</Text>

            {/* FEAT-298 slice 6a — self-compassion posture, re-homed from the retired
                Midday CompassionateCloseScreen. Placement is load-bearing: this sits in the
                POST-BREATH block, never in the breath section above, because the breath is
                skippable (SkipLink) and anything attached to it is invisible to a skipper —
                the exact failure that stranded the evening step-4 compassion hint. */}
              <Text style={styles.postureLine}>{CLOSING.postureLine}</Text>
            </View>

            <Text style={styles.inputLabel}>{CLOSING.noteLabel}</Text>
            <TextInput
              style={[
                styles.textInput,
                { borderColor: integrationNote ? themeColors.primary : colorSystem.gray[300] },
              ]}
              value={integrationNote}
              onChangeText={setIntegrationNote}
              placeholder={CLOSING.notePlaceholder}
              placeholderTextColor={semantic.text.secondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              accessibilityLabel="Optional note to carry back"
              accessibilityHint="Optional — leave blank to skip"
              testID="daily-loop-integration-input"
            />

            {/* MAINT-140's "return anytime", re-homed and made Stoic: beginning again IS
                the practice (Marcus 5.9), not a concession. Quiet static line — no toast. */}
            <View style={styles.codaRule} />
            <Text style={styles.returnLine}>{CLOSING.returnLine}</Text>

          </>
        )}
      </ScrollView>

      {/* FEAT-298 slice 6b — the primary action is PINNED, outside the ScrollView.
          It was previously the last child in-scroll, which put it below the fold on every
          current iPhone once 6a/6b added the posture and gratitude lines (~745pt of content
          against a ~547pt viewport on SE). That was not merely awkward: the header still
          renders a ✕ whose onExit is a bare goBack(), so the only VISIBLE exit from a
          completed practice discarded the session — no 'daily' check-in, no principle
          engagements, and a stale resumable session left on disk. The ✕ is now suppressed
          on this route (see DailyLoopNavigator) and the recording exit is always reachable.
          No border and no shadow on the footer: a divider here would read as a form action
          bar, which is the one register the coda must not have. */}
      {breathDone && (
        <View style={[styles.footer, { paddingBottom: spacing[16] + insets.bottom }]}>
          <AccessibleButton
            onPress={handleDone}
            label="Return to Home"
            variant="primary"
            size="large"
            theme="midday"
            testID="daily-loop-done-button"
            accessibilityHint="Finish and return to the home screen"
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colorSystem.base.white },
  scrollView: { flex: 1 },
  // The pinned footer owns the bottom gap now, so the scroll content no longer reserves it.
  scrollContent: { padding: spacing[20], paddingBottom: spacing[24] },

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
    color: semantic.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[32],
  },
  breathCircleContainer: { marginBottom: spacing[24] },

  title: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    // FEAT-328 removed a badge that sat above this line and contributed its own leading
    // margin. Without a little top space the title butts against the header and reads as
    // a rendering fault rather than as the top of the block. This is deliberately less
    // than the badge's old footprint — the point of the removal was to reclaim the space,
    // not to respend it.
    marginTop: spacing[8],
    // 4pt, so the beat-name subtitle below reads as belonging TO this title.
    marginBottom: spacing[4],
  },
  /**
   * Metadata, not practice content — and in DEEP mode it is strictly redundant
   * (completeTitle already says "all five principles", this then lists them). In QUICK it
   * does carry new information, so it stays. Demoted by RE-PARENTING to the title (4pt
   * above, 32pt below reads as unambiguous ownership), not by shrinking: these are the five
   * canonical principle names, and 12pt would bury the framework's spine to solve a local
   * layout problem. gray[500] is not an option either — 1.98:1, an outright AA failure.
   */
  subtitle: {
    fontSize: typography.bodySmall.size,
    color: semantic.text.secondary,
    letterSpacing: typography.caption.spacing,
    marginBottom: spacing[32],
    lineHeight: typography.bodySmall.size * typography.bodySmall.lineHeight,
  },
  /**
   * FEAT-298 slice 6b — gratitude + posture share ONE quiet passage.
   *
   * Reuses the app's existing vocabulary for "a passage to sit with": the same
   * `spacing[4]` left rule + `gray[50]` fill + `gray[700]` text as PassageReaderScreen. So
   * these read as the same KIND of thing as a Marcus passage in the Library — which is what
   * they are — rather than as invented emphasis. One container, not two: De Ira 3.36 is a
   * single act (review → clemency), and the pardon being terminal is expressed by the
   * posture being last INSIDE the box.
   *
   * ⚠️ `gray[700]` is REQUIRED BY THE FILL, not chosen for emphasis. `gray[600]` on
   * `gray[50]` is 4.38:1 and FAILS AA. Do not "simplify" the text back to `gray[600]` while
   * keeping the fill. Nothing here is hued — reward in this app is carried by the accent
   * teal, and the passage has none, so darker reads as "body content", not "you did well".
   */
  passage: {
    backgroundColor: colorSystem.gray[50],
    borderLeftWidth: spacing[4],
    borderLeftColor: colorSystem.gray[400],
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    marginBottom: spacing[32],
  },
  gratitudeLine: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[700],
    marginBottom: spacing[16],
    // Most air on the screen — this is the line the copy asks you to dwell on.
    lineHeight: typography.bodySmall.size * 1.6,
  },
  postureLine: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[700],
    lineHeight: typography.bodySmall.size * 1.6,
  },
  /**
   * Separates the ENDMATTER register (about next time) from the practice itself.
   * A zero-height View, not a Text border — RN renders borders on Text inconsistently on
   * Android, and hairlineWidth on a Text border is unreliable there.
   */
  codaRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colorSystem.gray[300],
    marginTop: spacing[24],
    marginBottom: spacing[20],
  },
  /** Pinned primary action. No border and no shadow — see the JSX comment. */
  footer: {
    paddingHorizontal: spacing[20],
    paddingTop: spacing[16],
    backgroundColor: colorSystem.base.white,
  },
  returnLine: {
    fontSize: typography.bodySmall.size,
    color: semantic.text.secondary,
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
    minHeight: spacing[96],
    // numberOfLines is Android-only for multiline; without this iOS grows unbounded.
    maxHeight: spacing[128],
  },
});

export default DailyLoopCompleteScreen;
