/**
 * About Stoic Mindfulness Screen
 * Educational article explaining the Stoic Mindfulness framework: the five principles,
 * developmental stages, and philosophical foundations.
 *
 * Extracted verbatim from ProfileScreen's inline `renderAboutStoicMindfulness()` (FEAT-211 /
 * FEAT-203 Slice 3). Content is a protected therapeutic path — the five principles (in order),
 * four developmental stages (with timeframes), and three dated attributions must stay
 * faithful to docs/product/stoic-mindfulness/INDEX.md.
 *
 * FEAT-76 (content enhancement): fixed the Radical Acceptance card, which previously wrapped a
 * framework paraphrase in quotation marks and attributed it to "Meditations 10:6" (a quote
 * Marcus Aurelius did not write); the unverified bare verse numbers on Virtuous Response (5:1)
 * and Interconnected Living (8:59) were dropped as well. Epictetus, Enchiridion 1 stays
 * (canonical). Each principle card deep-links to its Learn module, and the principle/stage
 * cards are now progressive-disclosure accordions.
 *
 * FEAT-268: the five-principle copy is now single-sourced from the canonical constant at
 * @/features/practices/shared/constants/principles (philosopher-signed, byte-pinned by its
 * spec). The developmental stages and dated attributions remain inline below — they are not
 * principle data and are not duplicated elsewhere, so they stay here, byte-identical.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { colorSystem, spacing, borderRadius, typography, semantic } from '@/core/theme';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';
import type { StoicPrinciple } from '@/features/practices/types/stoic';
import { getModuleIdForPrinciple } from '@/features/learn/utils/principleMapping';
import { PRINCIPLES } from '@/features/practices/shared/constants/principles';

type AboutNavigation = StackNavigationProp<RootStackParamList>;

/**
 * Collapsible card for a principle or developmental stage. The title row is a button
 * (not a header — the screen exposes exactly four section-level headers); the body is
 * revealed on tap. `onLearnMore`, when provided, renders a deep-link into the Learn module.
 */
const CollapsibleCard: React.FC<{
  title: string;
  defaultExpanded?: boolean;
  onLearnMore?: () => void;
  children: React.ReactNode;
}> = ({ title, defaultExpanded = false, onLearnMore, children }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View style={styles.principleCard}>
      <Pressable
        onPress={() => setExpanded((prev) => !prev)}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded }}
        accessibilityHint={expanded ? 'Collapses this section' : 'Expands this section'}
        style={styles.cardHeaderRow}
      >
        <Text style={styles.principleTitle}>{title}</Text>
        <Text style={styles.chevron} importantForAccessibility="no" accessibilityElementsHidden>
          {expanded ? '⌄' : '›'}
        </Text>
      </Pressable>

      {expanded && (
        <View style={styles.cardBody}>
          {children}
          {onLearnMore && (
            <Pressable
              onPress={onLearnMore}
              accessibilityRole="button"
              accessibilityLabel={`Learn more about ${title}`}
              style={styles.learnMoreRow}
            >
              <Text style={styles.learnMoreText}>Learn more</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
};

const AboutStoicMindfulnessScreen: React.FC = () => {
  const navigation = useNavigation<AboutNavigation>();

  const openModule = (principle: StoicPrinciple): void => {
    navigation.navigate('ModuleDetail', { moduleId: getModuleIdForPrinciple(principle) });
  };

  return (
    <SafeAreaView key="stoicMindfulness-screen" style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.subtitle, styles.subtitleSpacing]}>
          A comprehensive integration of ancient Stoic philosophy with modern mindfulness practice
        </Text>

        {/* Introduction Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header" accessibilityLevel={2}>
            What is Stoic Mindfulness?
          </Text>
          <Text style={styles.bodyText}>
            Stoic Mindfulness is a comprehensive integration of ancient Stoic philosophy with contemporary mindfulness practice, creating a comprehensive path to human flourishing through the transformation of consciousness.
          </Text>
          <Text style={styles.bodyText}>
            It combines the present-moment awareness of mindfulness with Stoic wisdom about what we control, how to respond virtuously, and how to live well in community with others.
          </Text>
        </View>

        {/* Five Principles Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header" accessibilityLevel={2}>
            The Five Principles
          </Text>
          <Text style={styles.sectionDescription}>
            These integrative principles guide daily practice and long-term development:
          </Text>

          {/* FEAT-268: principle copy single-sourced from the canonical constant. */}
          {PRINCIPLES.map((principle, index) => (
            <CollapsibleCard
              key={principle.key}
              title={`${index + 1}. ${principle.title}`}
              defaultExpanded
              onLearnMore={() => openModule(principle.key)}
            >
              <Text style={styles.principleDescription}>
                {principle.citation
                  ? `${principle.description} (${principle.citation})`
                  : principle.description}
              </Text>
            </CollapsibleCard>
          ))}
        </View>

        {/* Developmental Stages Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header" accessibilityLevel={2}>
            Developmental Stages
          </Text>
          <Text style={styles.sectionDescription}>
            Stoic practice develops through four natural stages over time:
          </Text>

          <CollapsibleCard title="Fragmented (1-6 months)">
            <Text style={styles.principleDescription}>
              Building basic infrastructure - learning principles, inconsistent practice, conscious effort required.
            </Text>
          </CollapsibleCard>

          <CollapsibleCard title="Effortful (6-18 months)">
            <Text style={styles.principleDescription}>
              Principles begin influencing behavior with conscious effort. More consistent practice across multiple domains.
            </Text>
          </CollapsibleCard>

          <CollapsibleCard title="Fluid (2-5 years)">
            <Text style={styles.principleDescription}>
              Spontaneous application with less effort. Principles naturally arise in challenging moments.
            </Text>
          </CollapsibleCard>

          <CollapsibleCard title="Integrated (5+ years)">
            <Text style={styles.principleDescription}>
              Embodied wisdom - practice becomes a natural way of being rather than something you do.
            </Text>
          </CollapsibleCard>
        </View>

        {/* Philosophical Foundations Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header" accessibilityLevel={2}>
            Philosophical Foundations
          </Text>
          <Text style={styles.bodyText}>
            Stoic Mindfulness draws on the wisdom of three major Stoic philosophers:
          </Text>
          <Text style={styles.bodyText}>
            <Text style={{ fontWeight: typography.fontWeight.semibold }}>Marcus Aurelius</Text> (121-180 CE) - Roman Emperor whose Meditations provide intimate reflections on applying Stoic principles to daily challenges.
          </Text>
          <Text style={styles.bodyText}>
            <Text style={{ fontWeight: typography.fontWeight.semibold }}>Epictetus</Text> (50-135 CE) - Former slave who taught that true freedom comes from focusing only on what we control.
          </Text>
          <Text style={styles.bodyText}>
            <Text style={{ fontWeight: typography.fontWeight.semibold }}>Seneca</Text> (4 BCE-65 CE) - Statesman and advisor whose Letters provide practical guidance for living well.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[24],
    paddingBottom: spacing[32],
  },
  subtitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  subtitleSpacing: {
    marginBottom: spacing[24],
  },
  section: {
    marginBottom: spacing[32],
  },
  sectionTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
    marginBottom: spacing[16],
  },
  sectionDescription: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    lineHeight: 22,
    marginBottom: spacing[16],
  },
  bodyText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    lineHeight: 24,
    marginBottom: spacing[16],
  },
  principleCard: {
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    marginBottom: spacing[16],
    borderLeftWidth: 3,
    borderLeftColor: colorSystem.base.midnightBlue,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chevron: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    marginLeft: spacing[8],
  },
  cardBody: {
    marginTop: spacing[8],
  },
  principleTitle: {
    flex: 1,
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
  },
  principleDescription: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    lineHeight: 20,
  },
  learnMoreRow: {
    marginTop: spacing[12],
  },
  learnMoreText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.midnightBlue,
  },
});

export default AboutStoicMindfulnessScreen;
