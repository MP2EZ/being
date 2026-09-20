/**
 * PRACTICE LIBRARY — standalone practice discoverability (FEAT-293)
 *
 * The standalone practices were reachable only as modals launched from deep
 * inside Learn (Learn > ModuleDetail > Practice tab > launch). The Stoic
 * control-sorting drill in particular is a differentiated asset that no user was
 * finding. This screen is the primary surface that fixes that.
 *
 * PHILOSOPHER CONSTRAINTS encoded here (non-negotiable):
 *  - Practices are named and grouped BY PRINCIPLE, never by mechanic. Each
 *    section heading and every line of principle prose is read from PRINCIPLES
 *    (byte-parity pinned by principles.test.ts) — no parallel copy is authored
 *    in this file.
 *  - The sorting drill may not launch context-free. Its card carries the
 *    Enchiridion 1 framing and a visible link back to the full principle,
 *    because the drill's answer key encodes a counterintuitive doctrine that
 *    reads as arbitrary once Module 3's prose is out of view.
 *  - Practices are grouped under THEIR OWN principle. Breathing and body scan
 *    are the Aware Presence limb; the Reserve Clause is hypexhairesis and
 *    belongs to Sphere Sovereignty. Filing the latter under "Aware Presence"
 *    would be a mis-attribution, so the grouping is derived, not hardcoded to a
 *    single heading.
 *  - NO score, percentage, tally, streak, or badge anywhere. These are
 *    discernment exercises; a scoreboard would convert them into performance.
 *    Note there is deliberately no practice-count display on this screen.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
/**
 * DEBUG-620 — `edges` applies to the one SafeAreaView root in this file.
 *
 * Root-stack card with `headerShown: false` (CleanRootNavigator), so no navigator
 * supplies the top inset: without it "‹ Back" sat under the clock and the title in the
 * Dynamic Island row. TOP ONLY, deliberately. The crisis FAB is positioned against the
 * window, not the safe area, so a bottom edge would move the list's end further INTO
 * its touch band rather than away from it (crisis ruling). The trailing spacer below
 * handles that clearance instead. Same shape as WellnessTrendsDetailScreen.
 */
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { semantic, colorSystem, spacing, typography, borderRadius } from '@/core/theme';
import { CRISIS_BUTTON_EXCLUSION_RECT } from '@/features/crisis/constants/crisisButtonGeometry';
import { TOUCH_TARGETS } from '@/core/theme/accessibility';
import { PRINCIPLES } from '@/features/practices/shared/constants/principles';
import { loadModuleContent } from '@/core/services/moduleContent';
import { resolvePracticeRoute } from '@/features/practices/catalog/practiceNavigation';
import {
  STANDALONE_PRACTICES,
  FEATURED_PRACTICE,
} from '@/features/practices/catalog/standalonePractices';
import { PRACTICE_QUOTES } from '@/features/learn/practices/PracticeCompletionScreen';
import type { ModuleId, Practice } from '@/features/learn/types/education';
import type { StoicPrinciple } from '@/features/practices/types/stoic';

/**
 * The framing line on the featured card. Single-sourced from the same constant
 * the completion screen uses, so the drill's citation cannot drift between the
 * surface that launches it and the surface that closes it.
 */
const FRAMING_QUOTE = PRACTICE_QUOTES[FEATURED_PRACTICE.practiceId];

interface PracticeLibraryScreenProps {
  onBack: () => void;
  onOpenPractice: (screen: string, params: unknown) => void;
  onOpenModule: (moduleId: ModuleId) => void;
  testID?: string;
}

/** A resolved catalog entry: the curated reference plus its loaded content. */
interface ResolvedEntry {
  principleKey: StoicPrinciple;
  moduleId: ModuleId;
  practice: Practice;
}

/** Module scope, so the prop keeps a stable identity across renders. */
const LIBRARY_EDGES: readonly Edge[] = ['top'];

/**
 * DEBUG-620 — the font scale from which the header stacks and the featured card's
 * horizontal padding tightens. Between xxxLarge (1.353, the largest standard slider
 * size) and AX1 (1.786), matching the Daily Loop screens' AX layout threshold. At AX3
 * a centred Back / title / spacer row needs ~490pt against ~358pt available, and at AX5
 * the header rendered "‹ BackPractice" with the title clipped.
 */
export const PRACTICE_LIBRARY_AX_LAYOUT_FONT_SCALE = 1.6;

export function libraryHeaderStacks(fontScale: number): boolean {
  return Number.isFinite(fontScale) && fontScale >= PRACTICE_LIBRARY_AX_LAYOUT_FONT_SCALE;
}

const formatDuration = (seconds?: number | null): string | null =>
  seconds ? `${Math.round(seconds / 60)} min` : null;

const PracticeLibraryScreen: React.FC<PracticeLibraryScreenProps> = ({
  onBack,
  onOpenPractice,
  onOpenModule,
  testID = 'practice-library-screen',
}) => {
  const [entries, setEntries] = useState<ResolvedEntry[] | null>(null);
  const { fontScale } = useWindowDimensions();
  const axLayout = libraryHeaderStacks(fontScale);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // The catalog stores only stable identifiers, so titles and durations are
      // read from module content rather than duplicated here (loadModuleContent
      // caches, so this is cheap and cannot drift from the authored content).
      const moduleIds = Array.from(
        new Set(STANDALONE_PRACTICES.map((p) => p.moduleId))
      );
      const contents = await Promise.all(
        moduleIds.map(async (id) => {
          try {
            return [id, await loadModuleContent(id)] as const;
          } catch {
            return [id, null] as const;
          }
        })
      );
      if (cancelled) return;

      const byModule = new Map(contents);
      const resolved: ResolvedEntry[] = [];
      for (const ref of STANDALONE_PRACTICES) {
        const content = byModule.get(ref.moduleId);
        const practice = content?.practices.find((p) => p.id === ref.practiceId);
        if (practice) {
          resolved.push({ ...ref, practice });
        }
      }
      setEntries(resolved);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Group by principle, preserving the canonical PRINCIPLES order. */
  const sections = useMemo(() => {
    if (!entries) return [];
    return PRINCIPLES.map((principle) => ({
      principle,
      items: entries.filter(
        (e) =>
          e.principleKey === principle.key &&
          e.practice.id !== FEATURED_PRACTICE.practiceId
      ),
    })).filter((s) => s.items.length > 0);
  }, [entries]);

  const featured = useMemo(
    () => entries?.find((e) => e.practice.id === FEATURED_PRACTICE.practiceId),
    [entries]
  );

  const featuredPrinciple = PRINCIPLES.find(
    (p) => p.key === FEATURED_PRACTICE.principleKey
  );

  const launch = (entry: ResolvedEntry) => {
    const { screen, params } = resolvePracticeRoute(entry.practice, entry.moduleId);
    onOpenPractice(screen, params);
  };

  return (
    <SafeAreaView edges={LIBRARY_EDGES} style={styles.container} testID={testID}>
      <View
        style={[styles.header, axLayout && styles.headerStacked]}
        testID="practice-library-header"
      >
        <Pressable
          onPress={onBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          testID="practice-library-back"
        >
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle} testID="practice-library-title">Practices</Text>
        {/* The spacer only balances a centred single-row title; stacked, it would be
            an empty row. */}
        {!axLayout && (
          <View style={styles.headerSpacer} testID="practice-library-header-spacer" />
        )}
      </View>

      {!entries ? (
        <View style={styles.centered} testID="practice-library-loading">
          <ActivityIndicator color={colorSystem.navigation.learn} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, axLayout && styles.scrollContentAx]}
          showsVerticalScrollIndicator={false}
          testID="practice-library-scroll"
        >
          {/* FEATURED — the sorting drill, promoted to a first-class Stoic
              practice, carrying its principle framing and citation. */}
          {featured && featuredPrinciple && FRAMING_QUOTE && (
            <View
              style={[styles.featuredCard, axLayout && styles.featuredCardAx]}
              testID="practice-library-featured"
            >
              <Text
                style={[styles.principleEyebrow, axLayout && styles.principleEyebrowAx]}
                testID="practice-library-featured-eyebrow"
              >
                {featuredPrinciple.title.toUpperCase()}
              </Text>
              <Text style={styles.featuredTitle}>{featured.practice.title}</Text>

              {/* Enchiridion 1 framing. IMPORTED, never retyped: this citation
                  already exists byte-identical as PRACTICE_QUOTES['control-sorting'],
                  and a hand-typed second copy is precisely how the citation drift
                  that FEAT-268 had to clean up recurs. */}
              {/* DEBUG-339: this card renders control-sorting, whose text was
                  Nicholas White (Hackett, 1983) — in copyright — until that
                  entry was re-rendered to Elizabeth Carter (1758). Because the
                  quote is imported rather than retyped, the fix reached this
                  surface for free; the translator is now surfaced here too, on
                  both the visual and screen-reader paths. */}
              <View
                accessible
                accessibilityLabel={`${FRAMING_QUOTE.author}, ${FRAMING_QUOTE.source}, translated by ${FRAMING_QUOTE.translation}. ${FRAMING_QUOTE.text}`}
              >
                <Text style={styles.featuredFraming}>“{FRAMING_QUOTE.text}”</Text>
                <Text style={styles.citation}>
                  {FRAMING_QUOTE.author}, {FRAMING_QUOTE.source} (trans.{' '}
                  {FRAMING_QUOTE.translation})
                </Text>
              </View>

              <Pressable
                onPress={() => onOpenModule(featured.moduleId)}
                style={styles.principleLinkTouch}
                accessibilityRole="link"
                accessibilityLabel={`Read the full principle: ${featuredPrinciple.title}`}
                accessibilityHint="Opens Module 3, Sphere Sovereignty"
                testID="practice-library-principle-link"
              >
                <Text style={styles.principleLink}>
                  Read the full principle: {featuredPrinciple.title} ›
                </Text>
              </Pressable>

              <Pressable
                style={styles.featuredButton}
                onPress={() => launch(featured)}
                accessibilityRole="button"
                accessibilityLabel={`Begin ${featured.practice.title}`}
                testID="practice-library-featured-start"
              >
                <Text style={styles.featuredButtonText}>Begin</Text>
              </Pressable>
            </View>
          )}

          {sections.map(({ principle, items }) => (
            <View key={principle.key} style={styles.section}>
              <Text style={styles.principleEyebrow}>
                {principle.title.toUpperCase()}
              </Text>
              {items.map((entry) => {
                const duration = formatDuration(entry.practice.duration);
                return (
                  <View
                    key={entry.practice.id}
                    style={styles.practiceRowDivider}
                    testID={`practice-library-row-divider-${entry.practice.id}`}
                  >
                  <Pressable
                    style={styles.practiceRow}
                    onPress={() => launch(entry)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      duration
                        ? `${entry.practice.title}, ${duration}`
                        : entry.practice.title
                    }
                    testID={`practice-library-item-${entry.practice.id}`}
                  >
                    <Text style={styles.practiceRowTitle}>
                      {entry.practice.title}
                    </Text>
                    {duration && (
                      <Text style={styles.practiceRowMeta}>{duration}</Text>
                    )}
                  </Pressable>
                  </View>
                );
              })}
            </View>
          ))}

          {/* DEBUG-620 (crisis ruling): the list's end clears the FAB. With no bottom
              edge the ScrollView reaches the window bottom, so at maximum scroll the
              last row's bottom rests at least CRISIS_BUTTON_EXCLUSION_RECT.top above the
              window bottom and never enters the contested region. A bare spacing[48] left its right column in
              the FAB's touch band once the top inset moved the list down. */}
          <View style={styles.fabClearance} testID="practice-library-fab-clearance" />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colorSystem.base.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[16],
  },
  // DEBUG-365. This style used to be shared with the layout spacer below, so
  // adding minHeight here would have silently grown the header row too. Split:
  // only the interactive Pressable gets the touch target.
  backButton: {
    minWidth: spacing[64],
    minHeight: TOUCH_TARGETS.minimum,
    justifyContent: 'center',
  },
  // Non-interactive right-hand spacer that balances the centred title. Keeps
  // ONLY the width — it is not a touch target and must not gain a height.
  headerSpacer: { minWidth: spacing[64] },
  // DEBUG-620: at accessibility sizes Back takes its own line and the title wraps below
  // it, instead of both competing for one row.
  headerStacked: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: spacing[4],
  },
  backText: {
    fontSize: typography.bodyRegular.size,
    color: semantic.text.learn,
  },
  headerTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: spacing[24], paddingTop: spacing[8] },
  // DEBUG-620: at accessibility sizes, horizontal padding is handed back to the text so
  // single long words ("SOVEREIGNTY", "Practice") are less likely to break mid-word.
  // Text size itself is never capped.
  scrollContentAx: { paddingHorizontal: spacing[16] },
  featuredCard: {
    borderWidth: 1.5,
    borderColor: colorSystem.navigation.learn,
    borderRadius: borderRadius.xl,
    padding: spacing[24],
    gap: spacing[8],
    marginBottom: spacing[32],
  },
  featuredCardAx: { paddingHorizontal: spacing[8] },
  principleEyebrow: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.learn,
    letterSpacing: 1,
    marginBottom: spacing[4],
  },
  principleEyebrowAx: { letterSpacing: 0 },
  featuredTitle: {
    fontSize: typography.headline4.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
  },
  featuredFraming: {
    fontSize: typography.bodyRegular.size,
    color: semantic.text.primary,
    lineHeight: 22,
  },
  citation: {
    fontSize: typography.bodySmall.size,
    fontStyle: 'italic',
    color: semantic.text.secondary,
  },
  principleLink: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: semantic.text.learn,
    marginTop: spacing[4],
  },
  // DEBUG-365 sweep finding, not named in the ticket. The Pressable wrapping
  // the principle link carried NO style prop at all, so its box collapsed to
  // the bodySmall line height (~17-21pt) — a smaller target than the declared
  // defect the ticket was filed for.
  principleLinkTouch: {
    minHeight: TOUCH_TARGETS.minimum,
    justifyContent: 'center',
    // DEBUG-637: AC1 covers this control too. It is a stretch child of `featuredCard`,
    // so the row's inset does not reach it. The full rect is used rather than a
    // card-relative derivation because that chain runs through a FRACTIONAL
    // `borderWidth: 1.5` and could not be proven exact against a half-open predicate.
    marginRight: CRISIS_BUTTON_EXCLUSION_RECT.left,
  },
  featuredButton: {
    marginTop: spacing[16],
    backgroundColor: semantic.text.learn,
    borderRadius: borderRadius.large,
    paddingVertical: spacing[16],
    alignItems: 'center',
    marginRight: CRISIS_BUTTON_EXCLUSION_RECT.left,
  },
  featuredButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
  section: { marginBottom: spacing[32] },
  fabClearance: { height: CRISIS_BUTTON_EXCLUSION_RECT.top },
  // DEBUG-637 — the divider lives on a full-width wrapper, the INSET on the Pressable.
  //
  // The row IS the Pressable, so its style is its hit rect: `paddingRight` would move the
  // glyphs and leave the tap target exactly where it was, and the FAB at `zIndex: 9999`
  // would keep winning every tap in the overlap. Splitting the border off keeps the
  // dividers bleeding to the full content column while the tappable box stops short of
  // the FAB's exclusion band.
  practiceRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.gray[200],
  },
  practiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[16],
    marginRight: CRISIS_BUTTON_EXCLUSION_RECT.left,
  },
  practiceRowTitle: {
    flex: 1,
    fontSize: typography.bodyRegular.size,
    color: semantic.text.primary,
  },
  practiceRowMeta: {
    fontSize: typography.bodySmall.size,
    color: semantic.text.muted,
  },
});

export default PracticeLibraryScreen;
