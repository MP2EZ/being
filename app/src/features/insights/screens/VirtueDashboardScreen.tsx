/**
 * VIRTUE DASHBOARD SCREEN - Stoic Mindfulness
 *
 * Visualize character development through the four cardinal virtues.
 * This screen displays virtue practice tracking in the Profile tab.
 *
 * Classical Stoic Philosophy:
 * - Marcus Aurelius: Meditations 5.16 - "Such as are your habitual thoughts, such also will be the character of your mind"
 * - Epictetus: Discourses 1.4 - Progress in virtue is the only true progress
 * - Seneca: Letters 71 - "The wise person's only wealth is virtue"
 *
 * Design Principles:
 * - NON-GAMIFIED: No badges, achievements, or competition
 * - GROWTH-ORIENTED: "Practice" not "completed", "challenges" not "failures"
 * - BALANCED VIEW: Both instances (successes) and challenges (struggles)
 * - THERAPEUTIC LANGUAGE: Compassionate, not harsh judgment
 * - SIMPLE VISUALIZATIONS: Progress bars, counts, no complex charts
 *
 * Four Cardinal Virtues (ONLY):
 * - Wisdom (sophia/phronesis): Sound judgment, practical wisdom
 * - Courage (andreia): Acting rightly despite fear, moral fortitude
 * - Justice (dikaiosyne): Fairness, contributing to common good
 * - Temperance (sophrosyne): Self-control, moderation, emotional regulation
 *
 * @see FEAT-51: Virtue Tracking Dashboard
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStoicPracticeStore } from '@/features/practices/stores/stoicPracticeStore';
import type { CardinalVirtue, DevelopmentalStage } from '@/features/practices/types/stoic';
import { colorSystem, spacing, borderRadius, typography } from '@/core/theme/colors';

const VirtueDashboardScreen: React.FC = () => {
  const {
    isLoading,
    developmentalStage,
    totalPracticeDays,
    currentStreak,
    longestStreak,
    getRecentVirtueInstances,
    loadPersistedState,
  } = useStoicPracticeStore();

  // Load data on mount
  useEffect(() => {
    loadPersistedState();
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A7C59" />
          <Text style={styles.loadingText}>Loading your virtue practice...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Developmental stage display
  const getStageDisplay = (stage: DevelopmentalStage): { label: string; description: string; color: string } => {
    switch (stage) {
      case 'fragmented':
        return {
          label: 'Fragmented',
          description: "You're building awareness. Practice is becoming more intentional.",
          color: '#9CA3AF',
        };
      case 'effortful':
        return {
          label: 'Effortful',
          description: "You're building consistent practice. Principles are becoming more natural.",
          color: '#F59E0B',
        };
      case 'fluid':
        return {
          label: 'Fluid',
          description: "Principles arise naturally. You're embodying Stoic practice.",
          color: '#10B981',
        };
      case 'integrated':
        return {
          label: 'Integrated',
          description: 'Virtue flows naturally from character. This is lifelong practice.',
          color: '#6366F1',
        };
    }
  };

  const stageInfo = getStageDisplay(developmentalStage);

  // Recent practice (last 30 days)
  const recentInstances = getRecentVirtueInstances(30);
  const practiceFrequency = recentInstances.length;
  const consistencyPercentage = Math.round((practiceFrequency / 30) * 100);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Practice Progress</Text>
          <Text style={styles.subtitle}>
            Your Mindfulness Journey
          </Text>
        </View>

        {/* Section 1: Developmental Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Character Development</Text>

          <View style={[styles.stageCard, { borderLeftColor: stageInfo.color }]}>
            <View style={styles.stageHeader}>
              <Text style={styles.stageLabel}>Current Stage</Text>
              <Text style={[styles.stageName, { color: stageInfo.color }]}>
                {stageInfo.label}
              </Text>
            </View>
            <Text style={styles.stageDescription}>{stageInfo.description}</Text>
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{totalPracticeDays}</Text>
              <Text style={styles.metricLabel}>Practice Days</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{currentStreak}</Text>
              <Text style={styles.metricLabel}>Current Streak</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{longestStreak}</Text>
              <Text style={styles.metricLabel}>Longest Streak</Text>
            </View>
          </View>
        </View>

        {/* Section 2: Practice Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Practice Frequency (Last 30 Days)</Text>

          <View style={styles.frequencyCard}>
            <View style={styles.frequencyHeader}>
              <Text style={styles.frequencyValue}>{practiceFrequency}</Text>
              <Text style={styles.frequencyLabel}>days with practice</Text>
            </View>

            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${consistencyPercentage}%` }
                  ]}
                />
              </View>
              <Text style={styles.progressText}>{consistencyPercentage}% consistency</Text>
            </View>

            <Text style={styles.frequencyHelper}>
              {consistencyPercentage >= 70
                ? 'Excellent consistency! Character development is a daily practice.'
                : consistencyPercentage >= 40
                ? "You're building momentum. Keep practicing when you can."
                : "Every practice session matters. Start with evening reflection."}
            </Text>
          </View>
        </View>

        {/* Stoic Quote */}
        <View style={styles.quoteSection}>
          <Text style={styles.quoteText}>
            "Such as are your habitual thoughts, such also will be the character of your mind;
            for the soul is dyed by the thoughts."
            — Marcus Aurelius, Meditations 5.16
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const colors = {
  white: colorSystem.base.white,
  black: colorSystem.base.black,
  gray100: colorSystem.gray[100],
  gray200: colorSystem.gray[200],
  gray300: colorSystem.gray[300],
  gray400: colorSystem.gray[400],
  gray500: colorSystem.gray[500],
  gray600: colorSystem.gray[600],
  midnightBlue: colorSystem.base.midnightBlue,
  eveningPrimary: '#4A7C59',
  success: '#10B981',
  warning: '#F59E0B',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: colors.gray600,
    marginTop: spacing.md,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.regular,
    color: colors.gray600,
    lineHeight: typography.headline4.size,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
    marginBottom: spacing.sm,
  },
  sectionHelper: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: colors.gray500,
    marginBottom: spacing.md,
  },
  stageCard: {
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.large,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: spacing.xs,
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  stageLabel: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stageName: {
    fontSize: typography.title.size,
    fontWeight: typography.fontWeight.bold,
  },
  stageDescription: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: colors.gray600,
    lineHeight: typography.headline3.size,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: typography.display2.size,
    fontWeight: typography.fontWeight.bold,
    color: colors.eveningPrimary,
    marginBottom: spacing.xs,
  },
  metricLabel: {
    fontSize: typography.micro.size,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray500,
    textAlign: 'center',
  },
  frequencyCard: {
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.large,
    padding: spacing.lg,
  },
  frequencyHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  frequencyValue: {
    fontSize: typography.display1.size,
    fontWeight: typography.fontWeight.bold,
    color: colors.eveningPrimary,
    marginRight: spacing.sm,
  },
  frequencyLabel: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: colors.gray600,
  },
  progressBarContainer: {
    marginBottom: spacing.md,
  },
  progressBar: {
    height: spacing.sm,
    backgroundColor: colors.gray300,
    borderRadius: borderRadius.small,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.eveningPrimary,
    borderRadius: borderRadius.small,
  },
  progressText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray600,
    textAlign: 'right',
  },
  frequencyHelper: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: colors.gray600,
    lineHeight: typography.title.size,
  },
  quoteSection: {
    padding: spacing.lg,
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.medium,
    borderLeftWidth: spacing.xs,
    borderLeftColor: colors.eveningPrimary,
    marginBottom: spacing.xl,
  },
  quoteText: {
    fontSize: typography.bodySmall.size,
    fontStyle: 'italic',
    color: colors.gray600,
    lineHeight: typography.title.size,
  },
});

export default VirtueDashboardScreen;
