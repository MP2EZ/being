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
import { useStoicPracticeStore } from '../stores/stoicPracticeStore';
import type { CardinalVirtue, DevelopmentalStage } from '../types/stoic';

interface VirtueDashboardScreenProps {
  onReturn: () => void;
}

const VirtueDashboardScreen: React.FC<VirtueDashboardScreenProps> = ({ onReturn }) => {
  const {
    isLoading,
    developmentalStage,
    totalPracticeDays,
    currentStreak,
    longestStreak,
    virtueInstances,
    virtueChallenges,
    domainProgress,
    getVirtueInstancesByVirtue,
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

  // Virtue data
  const virtueData = [
    {
      virtue: 'wisdom' as CardinalVirtue,
      label: 'Wisdom',
      greekTerm: 'Sophia/Phronesis',
      description: 'Sound judgment, understanding what matters',
      instances: getVirtueInstancesByVirtue('wisdom'),
      challenges: virtueChallenges.wisdom || [],
    },
    {
      virtue: 'courage' as CardinalVirtue,
      label: 'Courage',
      greekTerm: 'Andreia',
      description: 'Acting rightly despite fear',
      instances: getVirtueInstancesByVirtue('courage'),
      challenges: virtueChallenges.courage || [],
    },
    {
      virtue: 'justice' as CardinalVirtue,
      label: 'Justice',
      greekTerm: 'Dikaiosyne',
      description: 'Fairness, contributing to common good',
      instances: getVirtueInstancesByVirtue('justice'),
      challenges: virtueChallenges.justice || [],
    },
    {
      virtue: 'temperance' as CardinalVirtue,
      label: 'Temperance',
      greekTerm: 'Sophrosyne',
      description: 'Self-control, moderation',
      instances: getVirtueInstancesByVirtue('temperance'),
      challenges: virtueChallenges.temperance || [],
    },
  ];

  // Domain data
  const domains = [
    {
      domain: 'work',
      label: 'Work',
      description: 'Professional context, productivity, collaboration',
      progress: domainProgress.work,
    },
    {
      domain: 'relationships',
      label: 'Relationships',
      description: 'Family, friends, personal connections',
      progress: domainProgress.relationships,
    },
    {
      domain: 'adversity',
      label: 'Adversity',
      description: 'Challenges, setbacks, difficult circumstances',
      progress: domainProgress.adversity,
    },
  ];

  // Recent practice (last 30 days)
  const recentInstances = getRecentVirtueInstances(30);
  const practiceFrequency = recentInstances.length;
  const consistencyPercentage = Math.round((practiceFrequency / 30) * 100);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Virtue Tracking Dashboard</Text>
          <Text style={styles.subtitle}>
            Character Development Through Practice
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

        {/* Section 2: The Four Cardinal Virtues */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>The Four Cardinal Virtues</Text>
          <Text style={styles.sectionHelper}>
            Classical Stoic philosophy - the foundation of character
          </Text>

          {virtueData.map((virtue) => (
            <View key={virtue.virtue} style={styles.virtueCard}>
              <View style={styles.virtueHeader}>
                <View>
                  <Text style={styles.virtueLabel}>{virtue.label}</Text>
                  <Text style={styles.virtueGreek}>{virtue.greekTerm}</Text>
                </View>
                <View style={styles.virtueCounts}>
                  <Text style={styles.instanceCount}>{virtue.instances.length} instances</Text>
                  <Text style={styles.challengeCount}>{virtue.challenges.length} challenges</Text>
                </View>
              </View>

              <Text style={styles.virtueDescription}>{virtue.description}</Text>

              {/* Recent Practice */}
              {virtue.instances.length > 0 && (
                <View style={styles.recentPractice}>
                  <Text style={styles.recentLabel}>Recent Practice:</Text>
                  {virtue.instances.slice(0, 3).map((instance, index) => (
                    <Text key={index} style={styles.recentItem}>
                      • {instance.context.substring(0, 80)}
                      {instance.context.length > 80 ? '...' : ''}
                    </Text>
                  ))}
                </View>
              )}

              {/* Growth Area */}
              {virtue.challenges.length > 0 && (
                <View style={styles.growthArea}>
                  <Text style={styles.growthLabel}>Growth Area:</Text>
                  <Text style={styles.growthText}>
                    {virtue.challenges.length} {virtue.challenges.length === 1 ? 'challenge' : 'challenges'} identified
                    - opportunities for practice
                  </Text>
                </View>
              )}

              {/* No practice yet */}
              {virtue.instances.length === 0 && virtue.challenges.length === 0 && (
                <View style={styles.noPractice}>
                  <Text style={styles.noPracticeText}>
                    No practice recorded yet. Evening reflection is a good place to start.
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Section 3: Practice Domains */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Where You Practice Virtue</Text>
          <Text style={styles.sectionHelper}>
            Virtue in action across different areas of life
          </Text>

          {domains.map((domain) => (
            <View key={domain.domain} style={styles.domainCard}>
              <View style={styles.domainHeader}>
                <Text style={styles.domainLabel}>{domain.label}</Text>
                <Text style={styles.domainCount}>
                  {domain.progress.practiceInstances} instances
                </Text>
              </View>

              {domain.progress.practiceInstances > 0 ? (
                <>
                  <Text style={styles.domainDescription}>
                    Most practiced: {domain.progress.principlesApplied.length > 0
                      ? domain.progress.principlesApplied.slice(0, 2).join(', ')
                      : 'Building practice'}
                  </Text>
                  <Text style={styles.domainLastPractice}>
                    Last practice: {domain.progress.lastPracticeDate
                      ? new Date(domain.progress.lastPracticeDate).toLocaleDateString()
                      : 'Not yet'}
                  </Text>
                </>
              ) : (
                <Text style={styles.domainNoPractice}>
                  No practice in this domain yet
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Section 4: Practice Timeline */}
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

        {/* Return Button */}
        <Pressable style={styles.returnButton} onPress={onReturn}>
          <Text style={styles.returnButtonText}>Return to Profile</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const colors = {
  white: '#FFFFFF',
  black: '#1C1C1C',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  midnightBlue: '#1B2951',
  eveningPrimary: '#4A7C59',
  success: '#10B981',
  warning: '#F59E0B',
};

const spacing = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
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
    fontSize: 16,
    fontWeight: '400',
    color: colors.gray600,
    marginTop: spacing.md,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.black,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '400',
    color: colors.gray600,
    lineHeight: 24,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.black,
    marginBottom: spacing.sm,
  },
  sectionHelper: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.gray500,
    marginBottom: spacing.md,
  },
  stageCard: {
    backgroundColor: colors.gray100,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  stageLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stageName: {
    fontSize: 20,
    fontWeight: '700',
  },
  stageDescription: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.gray600,
    lineHeight: 22,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.eveningPrimary,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray500,
    textAlign: 'center',
  },
  virtueCard: {
    backgroundColor: colors.gray100,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.eveningPrimary,
  },
  virtueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  virtueLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.black,
    marginBottom: 2,
  },
  virtueGreek: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.gray500,
    fontStyle: 'italic',
  },
  virtueCounts: {
    alignItems: 'flex-end',
  },
  instanceCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  challengeCount: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.warning,
  },
  virtueDescription: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.gray600,
    marginBottom: spacing.md,
    lineHeight: 21,
  },
  recentPractice: {
    marginTop: spacing.sm,
  },
  recentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray700,
    marginBottom: 4,
  },
  recentItem: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.gray600,
    lineHeight: 20,
    marginBottom: 4,
  },
  growthArea: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray300,
  },
  growthLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray700,
    marginBottom: 4,
  },
  growthText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.gray600,
    lineHeight: 20,
  },
  noPractice: {
    marginTop: spacing.sm,
  },
  noPracticeText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.gray500,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  domainCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  domainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  domainLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.black,
  },
  domainCount: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.eveningPrimary,
  },
  domainDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.gray600,
    marginBottom: 4,
  },
  domainLastPractice: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.gray500,
  },
  domainNoPractice: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.gray500,
    fontStyle: 'italic',
  },
  frequencyCard: {
    backgroundColor: colors.gray100,
    borderRadius: 12,
    padding: spacing.lg,
  },
  frequencyHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  frequencyValue: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.eveningPrimary,
    marginRight: spacing.sm,
  },
  frequencyLabel: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.gray600,
  },
  progressBarContainer: {
    marginBottom: spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.gray300,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.eveningPrimary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray600,
    textAlign: 'right',
  },
  frequencyHelper: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.gray600,
    lineHeight: 20,
  },
  quoteSection: {
    padding: spacing.lg,
    backgroundColor: colors.gray100,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.eveningPrimary,
    marginBottom: spacing.xl,
  },
  quoteText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: colors.gray600,
    lineHeight: 20,
  },
  returnButton: {
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.gray300,
  },
  returnButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.midnightBlue,
  },
});

export default VirtueDashboardScreen;
