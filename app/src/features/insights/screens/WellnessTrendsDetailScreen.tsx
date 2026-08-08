/**
 * WellnessTrendsDetailScreen — full-history wellness-screening trends (FEAT-196)
 *
 * A dedicated full-screen surface for exploring the complete PHQ-9/GAD-7
 * screening history with more room than the Insights dashboard card allows.
 * Spun off from FEAT-30 (Assessment Trends); it REUSES the shipped
 * `WellnessScreeningTrends` component verbatim — same verdict-free chart, neutral
 * severity bands, time-range tabs, comparison chips, reflection-prompt close, and
 * the non-dismissible 988 disclaimer — passing `fullHistory` so the accessible
 * per-point list shows every check-in (not the downsampled subset).
 *
 * SAFETY / FRAMING (inherited red lines — do not regress):
 * - Its OWN non-dismissible disclaimer + 988 tap target render via the embedded
 *   `WellnessScreeningTrends` (it cannot rely on the parent section).
 * - The always-reachable crisis button is a sibling OUTSIDE the ScrollView so it
 *   never scrolls away (988 < 3 taps from here).
 * - No goal line, no verdicts, neutral severity (depth not stoplight), no
 *   schedule pressure, no whole-history aggregate/grade. The app surfaces; the
 *   user interprets. Title stays the compliance-approved "Wellness Screening
 *   Trends" string — never "results"/"progress"/"assessment"/"diagnosis".
 *
 * @see WellnessScreeningTrends.tsx (the reused, philosopher/crisis-gated component)
 */

import React, { useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore';
import { useAnalytics } from '@/core/analytics';
import { colorSystem, spacing, typography, semantic } from '@/core/theme';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';
import { WellnessScreeningTrends } from '../components';
import { WELLNESS_LABELS } from '../utils/wellnessTrendData';

type NavigationProp = StackNavigationProp<RootStackParamList, 'WellnessTrendsDetail'>;

const WellnessTrendsDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { trackScreenView } = useAnalytics();

  // Subscribe only to the slice this screen reads (same source as InsightsScreen).
  const completedAssessments = useAssessmentStore((s) => s.completedAssessments);

  // Track the screen name only — never score values (no raw scores leave the device).
  useFocusEffect(
    useCallback(() => {
      trackScreenView('WellnessTrendsDetailScreen');
    }, [trackScreenView])
  );

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const hasHistory = completedAssessments.some(
    (s) => (s.type === 'phq9' || s.type === 'gad7') && s.result
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.flex}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header — back control is the first focusable element. */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Back to Insights"
              accessibilityHint="Returns to the previous screen"
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>

            <Text style={styles.screenTitle} accessibilityRole="header">
              Full {WELLNESS_LABELS.sectionTitle}
            </Text>
            <Text style={styles.headerSubtitle}>
              Your complete check-in history. What do you notice?
            </Text>
          </View>

          {hasHistory ? (
            // Reuse the shipped trends component as-is; fullHistory lists every
            // check-in. It renders its own non-dismissible disclaimer + 988 link.
            <WellnessScreeningTrends sessions={completedAssessments} fullHistory />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No screenings yet. When you complete a wellness screening, it'll appear here.
              </Text>
            </View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// STYLES
// ──────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // MAINT-263: unified tab-screen surface (was gray[100]); matches Insights.
    backgroundColor: semantic.background.screen,
  },
  flex: {
    flex: 1,
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
  backButton: {
    minHeight: 44,
    justifyContent: 'center',
    marginBottom: spacing[8],
  },
  backButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.themes.morning.primary,
  },
  screenTitle: {
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.midnightBlue,
    marginBottom: spacing[4],
  },
  headerSubtitle: {
    fontSize: typography.bodyRegular.size,
    color: semantic.text.secondary,
    lineHeight: 22,
  },
  emptyState: {
    backgroundColor: colorSystem.base.white,
    borderRadius: spacing[8],
    // MAINT-263: hairline so the card stays defined on the now-white screen surface.
    borderWidth: 1,
    borderColor: semantic.border.default,
    padding: spacing[16],
  },
  emptyStateText: {
    fontSize: typography.bodyRegular.size,
    color: semantic.text.secondary,
    lineHeight: 22,
  },
  bottomPadding: {
    height: spacing[32],
  },
});

export default WellnessTrendsDetailScreen;
