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
import { View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colorSystem, spacing, borderRadius, typography, getTheme, semantic } from '@/core/theme';
import type { DailyLoopDepth } from '@/features/practices/types/flows';
import { DEPTH_LABELS, DEPTH_PICKER_COPY } from '../config/tenseMode';

/**
 * DEBUG-469 — horizontal inset reserving the floating crisis button's touch band.
 *
 * Declared HERE rather than imported from features/consent: the two existing sites each
 * declare their own, and sharing one would couple a practice screen to the consent module.
 *
 * `DailyLoop` is a ROOT-STACK MODAL with no tab bar, but CollapsibleCrisisButton is
 * positioned `bottom: 100` under a comment reading "Above tab bar" — true on a tabbed
 * screen, false here — so its 44pt target plus 12pt hitSlop lands in content. While the
 * depth cards were scroll children they moved out from under it; pinned, they cannot, and
 * the FAB wins both z-order (zIndex 9999) and hit-testing. Without this inset a
 * practice-choice tap on a card's right-hand end silently navigates to CrisisResources.
 */
const CRISIS_FAB_CLEARANCE = spacing[72];

/**
 * DEBUG-469 — at or above this font scale the two blurbs RELOCATE from the pinned cards to
 * the scrolling region, leaving the cards label-only so both choices still fit on screen.
 *
 * RELOCATION, NEVER DELETION. The philosopher pass rejected hiding the blurbs and leaving
 * `accessibilityHint` to carry them: the cohort at this scale is overwhelmingly low-vision
 * SIGHTED users, who are precisely the users NOT running VoiceOver — and Speak Hints is
 * user-disablable even for those who are. Hiding would delete the blurb from the only
 * channel the affected cohort has. The strings are unchanged verbatim in both states.
 *
 * ONE module-level constant, read once, evaluated OUTSIDE the DEPTHS map. A per-depth
 * branch — or a threshold derived from measured card height, which differs because the two
 * blurbs differ in length — would drop the two blurbs at different scales. That is the
 * asymmetric-cost ranking FEAT-301 forbids, arriving through a layout back door.
 */
const BLURB_RELOCATION_FONT_SCALE = 1.6;

export interface DailyLoopDepthSelectScreenProps {
  onSelect: (depth: DailyLoopDepth) => void;
}

// Order is presentation-only and carries no ranking (neither card is pre-selected,
// weighted, or badged). Matches the story's phrasing "a quick or a deeper version".
const DEPTHS: DailyLoopDepth[] = ['quick', 'deep'];

const DailyLoopDepthSelectScreen: React.FC<DailyLoopDepthSelectScreenProps> = ({ onSelect }) => {
  const themeColors = getTheme('midday');
  const { fontScale } = useWindowDimensions();
  // Evaluated ONCE, here — never inside the map, and never per depth.
  const blurbsOnCards = fontScale < BLURB_RELOCATION_FONT_SCALE;
  return (
    <View style={styles.container} testID="daily-loop-depth-select-screen">
      {/* DEBUG-469 — the intro SCROLLS, the choices are PINNED.
          At AX5 this copy alone spans 880pt on a 667pt screen, which pushed both depth
          Pressables clean out of the XCUITest hierarchy: the loop could not be entered by
          any route. The screen was already a ScrollView, so "make it scrollable" was never
          the fix — the choices had to leave it. Copy is untouched; the philosopher pass
          ruled the intro is eleven words at ~3.5x scale and that trimming cannot close an
          880pt overflow. */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{DEPTH_PICKER_COPY.title}</Text>
        <Text style={styles.subtitle}>{DEPTH_PICKER_COPY.subtitle}</Text>

        {/* The relocated blurbs. Same typography, same order as DEPTHS, one identical
            connector for both — symmetry is structural because both come from one map. */}
        {!blurbsOnCards &&
          DEPTHS.map((depth) => (
            <Text key={depth} style={styles.relocatedBlurb}>
              {`${DEPTH_LABELS[depth].label} — ${DEPTH_LABELS[depth].blurb}`}
            </Text>
          ))}
      </ScrollView>

      {/* A plain flex sibling — never `position: 'absolute'` (which re-introduces the RN
          parent-padding-box trap DEBUG-403 records) and never a native Modal or the root
          overlay slot, either of which would paint ABOVE the crisis button. */}
      <SafeAreaView edges={['bottom']} style={styles.choices}>
      {/* FEAT-301's guarantee travels WITH the controls (DEBUG-469). Unconditional at every
          font scale: it is the last element that may ever be dropped from this region. */}
      <Text style={styles.guarantee}>{DEPTH_PICKER_COPY.guarantee}</Text>
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
          {blurbsOnCards && (
            <Text style={styles.cardBlurb}>{DEPTH_LABELS[depth].blurb}</Text>
          )}
        </Pressable>
      ))}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colorSystem.base.white },
  // DEBUG-469: flexShrink lets the prose yield space to the pinned choices below rather
  // than pushing them off screen — the whole point of the split.
  scroll: { flex: 1 },
  content: { padding: spacing[20], paddingBottom: spacing[24] },
  choices: {
    paddingHorizontal: spacing[20],
    paddingBottom: spacing[20],
    // MUST come after paddingHorizontal — RN StyleSheet is last-key-wins, so a
    // paddingHorizontal declared afterwards would silently overwrite the inset and
    // restore the collision with no visible diff.
    paddingRight: CRISIS_FAB_CLEARANCE,
  },
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.bold,
    color: semantic.text.primary,
    marginBottom: spacing[8],
  },
  subtitle: {
    fontSize: typography.bodyRegular.size,
    color: semantic.text.secondary,
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
    color: semantic.text.secondary,
  },
  // Matches subtitle typography so the split reads as one continuous intro block.
  relocatedBlurb: {
    fontSize: typography.bodyRegular.size,
    color: semantic.text.secondary,
    marginBottom: spacing[12],
    lineHeight: typography.bodyRegular.size * 1.5,
  },
  guarantee: {
    fontSize: typography.bodyRegular.size,
    color: semantic.text.secondary,
    marginBottom: spacing[12],
  },
});

export default DailyLoopDepthSelectScreen;
