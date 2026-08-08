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
} from 'react-native';
import { semantic, colorSystem, spacing, typography, borderRadius } from '@/core/theme';
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
 * surface that launches it and the surface that closes it. Pinned by
 * practiceLibrary.contract.test.ts.
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

const formatDuration = (seconds?: number | null): string | null =>
  seconds ? `${Math.round(seconds / 60)} min` : null;

const PracticeLibraryScreen: React.FC<PracticeLibraryScreenProps> = ({
  onBack,
  onOpenPractice,
  onOpenModule,
  testID = 'practice-library-screen',
}) => {
  const [entries, setEntries] = useState<ResolvedEntry[] | null>(null);

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
    <View style={styles.container} testID={testID}>
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          testID="practice-library-back"
        >
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Practices</Text>
        <View style={styles.headerSpacer} />
      </View>

      {!entries ? (
        <View style={styles.centered} testID="practice-library-loading">
          <ActivityIndicator color={colorSystem.navigation.learn} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* FEATURED — the sorting drill, promoted to a first-class Stoic
              practice, carrying its principle framing and citation. */}
          {featured && featuredPrinciple && FRAMING_QUOTE && (
            <View style={styles.featuredCard} testID="practice-library-featured">
              <Text style={styles.principleEyebrow}>
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
                  <Pressable
                    key={entry.practice.id}
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
                );
              })}
            </View>
          ))}

          <View style={{ height: spacing[48] }} />
        </ScrollView>
      )}
    </View>
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
  backText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.navigation.learn,
  },
  headerTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: spacing[24], paddingTop: spacing[8] },
  featuredCard: {
    borderWidth: 1.5,
    borderColor: colorSystem.navigation.learn,
    borderRadius: borderRadius.xl,
    padding: spacing[24],
    gap: spacing[8],
    marginBottom: spacing[32],
  },
  principleEyebrow: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.navigation.learn,
    letterSpacing: 1,
    marginBottom: spacing[4],
  },
  featuredTitle: {
    fontSize: typography.headline4.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
  },
  featuredFraming: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    lineHeight: 22,
  },
  citation: {
    fontSize: typography.bodySmall.size,
    fontStyle: 'italic',
    color: colorSystem.gray[600],
  },
  principleLink: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.navigation.learn,
    marginTop: spacing[4],
  },
  // DEBUG-365 sweep finding, not named in the ticket. The Pressable wrapping
  // the principle link carried NO style prop at all, so its box collapsed to
  // the bodySmall line height (~17-21pt) — a smaller target than the declared
  // defect the ticket was filed for.
  principleLinkTouch: {
    minHeight: TOUCH_TARGETS.minimum,
    justifyContent: 'center',
  },
  featuredButton: {
    marginTop: spacing[16],
    backgroundColor: colorSystem.navigation.learn,
    borderRadius: borderRadius.large,
    paddingVertical: spacing[16],
    alignItems: 'center',
  },
  featuredButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
  section: { marginBottom: spacing[32] },
  practiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[16],
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.gray[200],
  },
  practiceRowTitle: {
    flex: 1,
    fontSize: typography.bodyRegular.size,
    color: colorSystem.base.black,
  },
  practiceRowMeta: {
    fontSize: typography.bodySmall.size,
    color: semantic.text.muted,
  },
});

export default PracticeLibraryScreen;
