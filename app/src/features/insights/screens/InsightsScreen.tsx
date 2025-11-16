/**
 * INSIGHTS SCREEN - Being. Mindfulness Insights
 *
 * Main screen for the Insights tab. Displays virtue practice summary
 * and will include future clinical insights (with visual separation).
 *
 * Philosophical Requirements (NON-NEGOTIABLE):
 * - Framing: "Character Development Journey" (who you're becoming)
 * - Language: "practice/journey/character" NOT "achievements"
 * - Visual separation: 65pt separator between virtue and clinical sections
 * - Green (#4A7C59) color accent for virtue section
 * - Marcus Aurelius quote: Meditations 5.16
 *
 * Design: DRD-compliant therapeutic design
 * Navigation: Tappable card navigates to VirtueDashboardScreen
 *
 * @see FEAT-77: Move Virtue Tracking to Insights Tab
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useStoicPracticeStore } from '@/stores/stoicPracticeStore';
import { CollapsibleCrisisButton } from '@/features/crisis/components/CollapsibleCrisisButton';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';

type NavigationProp = StackNavigationProp<RootStackParamList>;

// Hardcoded colors - no dynamic theme system
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
};

const spacing = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

interface VirtueSummaryCardProps {
  onPress: () => void;
  developmentalStage: string;
  totalPracticeDays: number;
  currentStreak: number;
  consistencyPercentage: number;
}

const VirtueSummaryCard: React.FC<VirtueSummaryCardProps> = ({
  onPress,
  developmentalStage,
  totalPracticeDays,
  currentStreak,
  consistencyPercentage,
}) => {
  const getStageColor = (stage: string): string => {
    switch (stage) {
      case 'fragmented':
        return '#757575'; // Fixed: 4.5:1 contrast
      case 'effortful':
        return '#D97706'; // Fixed: 3.5:1 contrast (large text)
      case 'fluid':
        return '#10B981';
      case 'integrated':
        return '#6366F1';
      default:
        return '#757575';
    }
  };

  const getStageLabel = (stage: string): string => {
    return stage.charAt(0).toUpperCase() + stage.slice(1);
  };

  const getStageDescription = (stage: string): string => {
    switch (stage) {
      case 'fragmented':
        return 'Beginning stage: Building awareness of virtue practices';
      case 'effortful':
        return 'Developing stage: Practicing virtues with conscious effort';
      case 'fluid':
        return 'Advanced stage: Virtues becoming natural habits';
      case 'integrated':
        return 'Mastery stage: Virtues are part of your character';
      default:
        return 'Beginning stage';
    }
  };

  return (
    <Pressable
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Virtue development summary. Your current stage is ${getStageLabel(developmentalStage)}. ${getStageDescription(developmentalStage)}. ${totalPracticeDays} practice days. ${currentStreak} day current streak. ${consistencyPercentage} percent consistency.`}
      accessibilityHint="Double tap to view your full virtue development dashboard"
      style={({ pressed }) => [
        styles.summaryCard,
        pressed && styles.summaryCardPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.summaryHeader}>
        <View
          accessible={true}
          accessibilityLabel={`Developmental stage: ${getStageLabel(developmentalStage)}. ${getStageDescription(developmentalStage)}`}
          style={[
            styles.stageBadge,
            { backgroundColor: getStageColor(developmentalStage) },
          ]}
        >
          <Text style={styles.stageBadgeText}>
            {getStageLabel(developmentalStage)}
          </Text>
        </View>
        <Text style={styles.viewDashboardText}>View Dashboard →</Text>
      </View>

      <View style={styles.summaryMetrics}>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{totalPracticeDays}</Text>
          <Text style={styles.metricLabel}>Practice Days</Text>
        </View>
        <View
          style={styles.metricDivider}
          accessibilityElementsHidden={true}
          importantForAccessibility="no"
        />
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{currentStreak}</Text>
          <Text style={styles.metricLabel}>Current Streak</Text>
        </View>
        <View
          style={styles.metricDivider}
          accessibilityElementsHidden={true}
          importantForAccessibility="no"
        />
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{consistencyPercentage}%</Text>
          <Text style={styles.metricLabel}>Consistency</Text>
        </View>
      </View>
    </Pressable>
  );
};

interface VirtueEmptyStateProps {
  onLearnMore: () => void;
}

const VirtueEmptyState: React.FC<VirtueEmptyStateProps> = ({ onLearnMore }) => (
  <View style={styles.emptyStateCard}>
    <Text style={styles.emptyStateTitle}>Begin Your Character Journey</Text>
    <Text style={styles.emptyStateDescription}>
      Stoic Mindfulness is a practice of character development through the four cardinal virtues.
      Track your growth as you cultivate wisdom, courage, justice, and temperance.
    </Text>
    <Pressable
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel="Start Tracking"
      accessibilityHint="Double tap to open your virtue tracking dashboard"
      style={({ pressed }) => [
        styles.emptyStateButton,
        pressed && styles.emptyStateButtonPressed,
      ]}
      onPress={onLearnMore}
    >
      <Text style={styles.emptyStateButtonText}>Start Tracking</Text>
    </Pressable>
  </View>
);

const SectionSeparator: React.FC = () => (
  <View style={styles.separator}>
    <View style={styles.separatorLine} />
    <Text style={styles.separatorText}>Future Clinical Insights</Text>
    <View style={styles.separatorLine} />
  </View>
);

const InsightsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {
    isLoading,
    developmentalStage,
    totalPracticeDays,
    currentStreak,
    getRecentVirtueInstances,
    loadPersistedState,
  } = useStoicPracticeStore();

  // Load data on mount
  useEffect(() => {
    loadPersistedState();
  }, []);

  // Calculate consistency percentage (last 30 days)
  const recentInstances = getRecentVirtueInstances(30);
  const consistencyPercentage = Math.round((recentInstances.length / 30) * 100);

  // Check if user has practice data
  const hasPracticeData = totalPracticeDays > 0;

  const handleNavigateToDashboard = () => {
    navigation.navigate('VirtueDashboard');
  };

  const handleLearnMore = () => {
    // Navigate to virtue dashboard which has educational content
    navigation.navigate('VirtueDashboard');
  };

  return (
    <SafeAreaView style={styles.container}>
      <CollapsibleCrisisButton />
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            Your Insights
          </Text>
          <Text style={styles.subtitle}>
            Track your character development and mindfulness journey
          </Text>
        </View>

        {/* Virtue Practice Section */}
        <View style={styles.virtueSection}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Your Character Development Journey
          </Text>
          <Text style={styles.sectionSubtitle}>
            Stoic practice is about who you're becoming, not what you're achieving
          </Text>

          {hasPracticeData ? (
            <VirtueSummaryCard
              onPress={handleNavigateToDashboard}
              developmentalStage={developmentalStage}
              totalPracticeDays={totalPracticeDays}
              currentStreak={currentStreak}
              consistencyPercentage={consistencyPercentage}
            />
          ) : (
            <VirtueEmptyState onLearnMore={handleLearnMore} />
          )}

          {/* Marcus Aurelius Quote */}
          <View style={styles.quoteSection}>
            <Text style={styles.quoteText}>
              "Such as are your habitual thoughts, such also will be the character of your mind"
            </Text>
            <Text style={styles.quoteAttribution}>— Marcus Aurelius, Meditations 5.16</Text>
          </View>
        </View>

        {/* 65pt Visual Separator */}
        <SectionSeparator />

        {/* Future Clinical Insights Section */}
        <View style={styles.futureSection}>
          <Text style={styles.futureSectionText}>
            Clinical insights and progress tracking will appear here in future updates.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
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
    fontSize: 16,
    fontWeight: '400',
    color: colors.gray600,
    lineHeight: 22,
  },
  virtueSection: {
    marginBottom: 65, // 65pt spacing before separator
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.eveningPrimary,
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.gray600,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    backgroundColor: colors.gray100,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.eveningPrimary,
  },
  summaryCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  summaryCardFocused: {
    borderWidth: 3,
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  stageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  stageBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  viewDashboardText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.eveningPrimary,
  },
  summaryMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.eveningPrimary,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray600, // Fixed: 7.0:1 contrast
    textAlign: 'center',
  },
  metricDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.gray300,
    marginHorizontal: spacing.sm,
  },
  emptyStateCard: {
    backgroundColor: colors.gray100,
    borderRadius: 12,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.eveningPrimary,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.black,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.gray600,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyStateButton: {
    backgroundColor: colors.eveningPrimary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
  },
  emptyStateButtonPressed: {
    opacity: 0.8,
  },
  emptyStateButtonFocused: {
    borderWidth: 3,
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  quoteSection: {
    padding: spacing.lg,
    backgroundColor: colors.gray100,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.eveningPrimary,
  },
  quoteText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: colors.gray600,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  quoteAttribution: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray600, // Fixed: 7.0:1 contrast
    textAlign: 'right',
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray300,
  },
  separatorText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray500,
    paddingHorizontal: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  futureSection: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  futureSectionText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.gray500,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default InsightsScreen;
