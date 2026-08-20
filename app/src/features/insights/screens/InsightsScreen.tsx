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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAnalytics } from '@/core/analytics';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';
import { colorSystem, semantic, spacing, borderRadius, typography } from '@/core/theme';
import { BodyHeader } from '@/core/components/BodyHeader';
import { getDailyQuote } from '../constants/marcusQuotes';

// Import components
import {
  DotCalendar,
  PrincipleEngagementChart,
  WellnessScreeningTrends,
  WeeklyReflectionCard,
} from '../components';

type NavigationProp = StackNavigationProp<RootStackParamList>;

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
        {/* Header (MAINT-257: shared BodyHeader idiom — borderless, left headline2) */}
        <BodyHeader
          title="Insights"
          subtitle={'Here is what your practice looks like.\nWhat do you notice?'}
          containerStyle={styles.header}
        />

        {/* Marcus Aurelius Quote */}
        {dailyQuote && (
          <View style={styles.quoteContainer}>
            <Text style={styles.quoteText}>"{dailyQuote.text}"</Text>
            <Text style={styles.quoteSource}>
              - Marcus Aurelius, {dailyQuote.source} (trans. {dailyQuote.translation})
            </Text>
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
    </SafeAreaView>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// STYLES
// ──────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // MAINT-263: unified tab-screen surface (was gray[100]).
    backgroundColor: semantic.background.screen,
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
  quoteContainer: {
    backgroundColor: colorSystem.base.white,
    // MAINT-222: unified content-card radius (xl=16)
    borderRadius: borderRadius.xl,
    // MAINT-263: hairline so the card stays defined on the now-white screen surface.
    borderWidth: 1,
    borderColor: semantic.border.default,
    padding: spacing[16],
    marginBottom: spacing[16],
    borderLeftWidth: 3,
    borderLeftColor: colorSystem.navigation.insights,
  },
  quoteText: {
    fontSize: typography.bodyRegular.size,
    color: semantic.text.primary,
    fontStyle: 'italic',
    lineHeight: 24,
    marginBottom: spacing[8],
  },
  quoteSource: {
    fontSize: typography.caption.size,
    color: semantic.text.muted,
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
    color: colorSystem.base.midnightBlue,
  },
  fullHistoryLinkArrow: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.base.midnightBlue,
    marginLeft: spacing[4],
  },
});

export default InsightsScreen;
