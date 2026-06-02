/**
 * About Stoic Mindfulness Screen
 * Educational article explaining the Stoic Mindfulness framework: the five principles,
 * developmental stages, and philosophical foundations.
 *
 * Extracted verbatim from ProfileScreen's inline `renderAboutStoicMindfulness()` (FEAT-211 /
 * FEAT-203 Slice 3). Content is a protected therapeutic path — the five principles (in order),
 * four developmental stages (with timeframes), and three dated attributions must stay
 * byte-for-byte identical to docs/product/stoic-mindfulness/INDEX.md. Content/citation
 * accuracy changes belong to FEAT-76, not here.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colorSystem, spacing, borderRadius, typography } from '@/core/theme';

// FEAT-212: rendered as a route on ProfileStackNavigator; the native stack header
// supplies the back chevron (SubMenuHeader's ✕ removed).
const AboutStoicMindfulnessScreen: React.FC = () => (
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

        <View style={styles.principleCard}>
          <Text style={styles.principleTitle}>1. Aware Presence</Text>
          <Text style={styles.principleDescription}>
            Be fully here now, observing thoughts as mental events rather than truth, and feeling what's happening in your body. Integrates present perception, metacognitive space, and embodied awareness.
          </Text>
        </View>

        <View style={styles.principleCard}>
          <Text style={styles.principleTitle}>2. Radical Acceptance</Text>
          <Text style={styles.principleDescription}>
            Accept reality as it is, without resistance. "This is what's happening right now. I may not like it, but it is the reality I face. What do I do from here?" (Marcus Aurelius, Meditations 10:6)
          </Text>
        </View>

        <View style={styles.principleCard}>
          <Text style={styles.principleTitle}>3. Sphere Sovereignty</Text>
          <Text style={styles.principleDescription}>
            Distinguish what you control (your intentions, judgments, character, responses) from what you don't (outcomes, others' choices, externals). Focus energy only within your sphere. (Epictetus, Enchiridion 1)
          </Text>
        </View>

        <View style={styles.principleCard}>
          <Text style={styles.principleTitle}>4. Virtuous Response</Text>
          <Text style={styles.principleDescription}>
            In every situation, ask "What does wisdom, courage, justice, or temperance require here?" View obstacles as opportunities for practicing virtue. (Marcus Aurelius, Meditations 5:1)
          </Text>
        </View>

        <View style={styles.principleCard}>
          <Text style={styles.principleTitle}>5. Interconnected Living</Text>
          <Text style={styles.principleDescription}>
            Bring full presence to others. Recognize that we're all members of one human community. Act for the common good, not just personal benefit. (Marcus Aurelius, Meditations 8:59)
          </Text>
        </View>
      </View>

      {/* Developmental Stages Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle} accessibilityRole="header" accessibilityLevel={2}>
          Developmental Stages
        </Text>
        <Text style={styles.sectionDescription}>
          Stoic practice develops through four natural stages over time:
        </Text>

        <View style={styles.principleCard}>
          <Text style={styles.principleTitle}>Fragmented (1-6 months)</Text>
          <Text style={styles.principleDescription}>
            Building basic infrastructure - learning principles, inconsistent practice, conscious effort required.
          </Text>
        </View>

        <View style={styles.principleCard}>
          <Text style={styles.principleTitle}>Effortful (6-18 months)</Text>
          <Text style={styles.principleDescription}>
            Principles begin influencing behavior with conscious effort. More consistent practice across multiple domains.
          </Text>
        </View>

        <View style={styles.principleCard}>
          <Text style={styles.principleTitle}>Fluid (2-5 years)</Text>
          <Text style={styles.principleDescription}>
            Spontaneous application with less effort. Principles naturally arise in challenging moments.
          </Text>
        </View>

        <View style={styles.principleCard}>
          <Text style={styles.principleTitle}>Integrated (5+ years)</Text>
          <Text style={styles.principleDescription}>
            Embodied wisdom - practice becomes a natural way of being rather than something you do.
          </Text>
        </View>
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
    color: colorSystem.gray[600],
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
    color: colorSystem.base.black,
    marginBottom: spacing[16],
  },
  sectionDescription: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[600],
    lineHeight: 22,
    marginBottom: spacing[16],
  },
  bodyText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[600],
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
  principleTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
  },
  principleDescription: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[600],
    lineHeight: 20,
  },
});

export default AboutStoicMindfulnessScreen;
