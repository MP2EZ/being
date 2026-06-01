/**
 * UNIFIED INSIGHTS DASHBOARD - Being. Stoic Mindfulness (FEAT-28)
 *
 * A mirror for contemplation - showing practice patterns without gamification.
 *
 * PHILOSOPHY (Multi-Agent Validated):
 * - "Here is what your practice looks like. What do you notice?"
 * - Observation over control
 * - Recognition over achievement
 * - Prohairesis (user moral agency) respected
 *
 * FRAMEWORK HIERARCHY:
 * - PRIMARY: 5 Stoic Mindfulness Principles (equal dignity)
 * - SECONDARY: 4 Cardinal Virtues (contained within Principle 4)
 *
 * SECTIONS:
 * 1. Header: Marcus Aurelius quote (contemplative)
 * 2. Practice Rhythm: Dot calendar showing check-in patterns
 * 3. Principle Embodiment: Engagement with each principle
 * 4. Wellness Screening Trends: PHQ-9/GAD-7 (compliance-approved labels)
 *
 * NON-NEGOTIABLES:
 * - NO gamification (no streaks, badges, points)
 * - NO algorithm-assigned developmental stage
 * - NO selection/focus-setting UI
 * - MUST use compliant clinical labels
 *
 * @see /docs/product/FEAT-28-insights-design-plan.md
 */

import React, { useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStoicPracticeStore } from '@/features/practices/stores/stoicPracticeStore';
import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore';
import { CollapsibleCrisisButton } from '@/features/crisis/components/CollapsibleCrisisButton';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAnalytics } from '@/core/analytics';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';
import { colorSystem, spacing, borderRadius, typography } from '@/core/theme';

// Import components
import {
  DotCalendar,
  PrincipleEngagementChart,
  WellnessScreeningTrends,
  WeeklyReflectionCard,
} from '../components';

type NavigationProp = StackNavigationProp<RootStackParamList>;

// ──────────────────────────────────────────────────────────────────────────────
// MARCUS AURELIUS QUOTES (Contemplative Rotation)
// ──────────────────────────────────────────────────────────────────────────────

const MARCUS_QUOTES = [
  {
    text: "Waste no more time arguing about what a good man should be. Be one.",
    source: "Meditations 10:16",
  },
  {
    text: "Look well into thyself; there is a source of strength which will always spring up if thou wilt always look.",
    source: "Meditations 7:59",
  },
  {
    text: "Very little is needed to make a happy life; it is all within yourself, in your way of thinking.",
    source: "Meditations 7:67",
  },
  {
    text: "The object of life is not to be on the side of the majority, but to escape finding oneself in the ranks of the insane.",
    source: "Meditations 4:32",
  },
  {
    text: "When you arise in the morning, think of what a precious privilege it is to be alive.",
    source: "Meditations 2:1",
  },
];

/**
 * Get a quote based on the day of the year (changes daily)
 */
const getDailyQuote = () => {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  return MARCUS_QUOTES[dayOfYear % MARCUS_QUOTES.length];
};

// ──────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────────────────────────────────────

const InsightsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { trackScreenView } = useAnalytics();

  // Track screen view for analytics (FEAT-137)
  useFocusEffect(
    useCallback(() => {
      trackScreenView('InsightsScreen');
    }, [trackScreenView])
  );

  // PERF-03: selectors instead of whole-store destructure — subscribe ONLY
  // to the slices this screen reads, not every change in the store.
  const getCheckInHistory = useStoicPracticeStore((s) => s.getCheckInHistory);
  const getPrincipleEngagements = useStoicPracticeStore((s) => s.getPrincipleEngagements);
  const checkInCompletions = useStoicPracticeStore((s) => s.checkInCompletions);
  const rawPrincipleEngagements = useStoicPracticeStore((s) => s.principleEngagements);
  const completedAssessments = useAssessmentStore((s) => s.completedAssessments);

  // Get data for components - depend on raw arrays for proper reactivity
  const checkInHistory = useMemo(
    () => getCheckInHistory(90),
    [getCheckInHistory, checkInCompletions]
  );
  const principleEngagements = useMemo(
    () => getPrincipleEngagements(90),
    [getPrincipleEngagements, rawPrincipleEngagements]
  );

  // Get daily quote
  const dailyQuote = useMemo(() => getDailyQuote(), []);

  // Only offer the full-history detail screen (FEAT-196) once there's a
  // completed screening to show — mirrors WellnessScreeningTrends' own guard.
  const hasWellnessHistory = useMemo(
    () => completedAssessments.some((s) => (s.type === 'phq9' || s.type === 'gad7') && s.result),
    [completedAssessments]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Insights</Text>
          <Text style={styles.headerSubtitle}>
            Here is what your practice looks like.{'\n'}What do you notice?
          </Text>
        </View>

        {/* Marcus Aurelius Quote */}
        {dailyQuote && (
          <View style={styles.quoteContainer}>
            <Text style={styles.quoteText}>"{dailyQuote.text}"</Text>
            <Text style={styles.quoteSource}>- Marcus Aurelius, {dailyQuote.source}</Text>
          </View>
        )}

        {/* Practice Rhythm (Dot Calendar) */}
        <DotCalendar checkInHistory={checkInHistory} initialTimeRange="month" />

        {/* Principle Embodiment */}
        <PrincipleEngagementChart
          engagements={principleEngagements}
          initialTimeRange="month"
        />

        {/* Weekly Reflection (FEAT-194) - replaces FEAT-53 standalone weekly review */}
        <WeeklyReflectionCard />

        {/* Wellness Screening Trends (wellness context) */}
        <WellnessScreeningTrends sessions={completedAssessments} />

        {/* Full-history detail entry point (FEAT-196) */}
        {hasWellnessHistory && (
          <TouchableOpacity
            style={styles.fullHistoryLink}
            onPress={() => navigation.navigate('WellnessTrendsDetail')}
            accessibilityRole="button"
            accessibilityLabel="See full history"
            accessibilityHint="Opens the full wellness screening trend history"
          >
            <Text style={styles.fullHistoryLinkText}>See full history</Text>
            <Text style={styles.fullHistoryLinkArrow} accessibilityElementsHidden importantForAccessibility="no">
              →
            </Text>
          </TouchableOpacity>
        )}

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Crisis Button */}
      <CollapsibleCrisisButton
        mode="standard"
        onNavigate={() => navigation.navigate('CrisisResources')}
        testID="crisis-insights"
      />
    </SafeAreaView>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// STYLES
// ──────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colorSystem.gray[100],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
  },
  header: {
    marginBottom: spacing[16],
  },
  screenTitle: {
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.midnightBlue,
    marginBottom: spacing[4],
  },
  headerSubtitle: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    lineHeight: 22,
  },
  quoteContainer: {
    backgroundColor: colorSystem.base.white,
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    marginBottom: spacing[16],
    borderLeftWidth: 3,
    borderLeftColor: colorSystem.themes.morning.primary,
  },
  quoteText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    fontStyle: 'italic',
    lineHeight: 24,
    marginBottom: spacing[8],
  },
  quoteSource: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[500],
    textAlign: 'right',
  },
  bottomPadding: {
    height: spacing[32],
  },
  fullHistoryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44, // ≥44pt tap target (WCAG 2.5.5)
    marginBottom: spacing[16],
  },
  fullHistoryLinkText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.themes.morning.primary,
  },
  fullHistoryLinkArrow: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.themes.morning.primary,
    marginLeft: spacing[4],
  },
});

export default InsightsScreen;
