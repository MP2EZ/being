/**
 * WellnessScreeningTrends - Clinical Trend Visualization (FEAT-28)
 *
 * Displays PHQ-9 and GAD-7 wellness screening trends over time.
 * Uses compliance-approved labels and includes required disclaimer.
 *
 * COMPLIANCE REQUIREMENTS (from docs/legal):
 * - Labels: "Mood Wellness Screening (PHQ-9)" and "Stress Wellness Screening (GAD-7)"
 * - Section title: "Wellness Screening Trends"
 * - Disclaimer displayed ABOVE charts (non-dismissible)
 * - Include 988 crisis reference
 * - Non-HIPAA wellness positioning
 *
 * @see /docs/product/FEAT-28-insights-design-plan.md
 * @see /docs/legal/Medical-Disclaimer.md
 */

import React from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import {
  colorSystem,
  spacing,
  borderRadius,
  typography,
  semantic,
  crisis,
} from '@/core/theme';

// ──────────────────────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────────────────────

interface AssessmentDataPoint {
  score: number;
  date: Date;
  severity: string;
}

interface WellnessScreeningTrendsProps {
  /** PHQ-9 assessment history */
  phq9History: AssessmentDataPoint[];
  /** GAD-7 assessment history */
  gad7History: AssessmentDataPoint[];
}

// ──────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Compliance-approved labels (from legal review)
 */
const LABELS = {
  sectionTitle: 'Wellness Screening Trends',
  phq9: 'Mood Wellness Screening (PHQ-9)',
  gad7: 'Stress Wellness Screening (GAD-7)',
};

/**
 * PHQ-9 score ranges (0-27)
 */
const PHQ9_MAX = 27;
const PHQ9_RANGES = [
  { min: 0, max: 4, label: 'Minimal', color: colorSystem.status.success },
  { min: 5, max: 9, label: 'Mild', color: '#90EE90' },
  { min: 10, max: 14, label: 'Moderate', color: colorSystem.status.warning },
  { min: 15, max: 19, label: 'Moderately Severe', color: '#FFA07A' },
  { min: 20, max: 27, label: 'Severe', color: colorSystem.status.error },
];

/**
 * GAD-7 score ranges (0-21)
 */
const GAD7_MAX = 21;
const GAD7_RANGES = [
  { min: 0, max: 4, label: 'Minimal', color: colorSystem.status.success },
  { min: 5, max: 9, label: 'Mild', color: '#90EE90' },
  { min: 10, max: 14, label: 'Moderate', color: colorSystem.status.warning },
  { min: 15, max: 21, label: 'Severe', color: colorSystem.status.error },
];

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Format date for display
 */
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * Get color for PHQ-9 score
 */
const getPHQ9Color = (score: number): string => {
  const range = PHQ9_RANGES.find(r => score >= r.min && score <= r.max);
  return range?.color || colorSystem.gray[400];
};

/**
 * Get color for GAD-7 score
 */
const getGAD7Color = (score: number): string => {
  const range = GAD7_RANGES.find(r => score >= r.min && score <= r.max);
  return range?.color || colorSystem.gray[400];
};

// ──────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Required Disclaimer (compliance-mandated)
 * MUST appear ABOVE charts, non-dismissible
 */
const WellnessDisclaimer: React.FC = () => {
  const handleCrisisLink = () => {
    Linking.openURL('tel:988');
  };

  return (
    <View style={styles.disclaimerContainer}>
      <Text style={styles.disclaimerText}>
        These trends show your PHQ-9 and GAD-7 self-monitoring scores over time.
      </Text>
      <Text style={styles.disclaimerText}>
        <Text style={styles.disclaimerBold}>Important:</Text> These are wellness
        screening tools for personal awareness, not clinical assessments or
        diagnoses. Always consult a licensed healthcare provider to discuss
        your mental health.
      </Text>
      <Text style={styles.disclaimerText}>
        If you're experiencing severe symptoms or a crisis, call or text{' '}
        <Text style={styles.crisisLink} onPress={handleCrisisLink}>
          988
        </Text>{' '}
        for immediate support.
      </Text>
    </View>
  );
};

interface TrendChartProps {
  title: string;
  history: AssessmentDataPoint[];
  maxScore: number;
  getColor: (score: number) => string;
}

/**
 * Simple trend visualization (dots connected by line)
 */
const TrendChart: React.FC<TrendChartProps> = ({
  title,
  history,
  maxScore,
  getColor,
}) => {
  // Show last 6 data points max for clean display
  const displayHistory = history.slice(-6);

  if (displayHistory.length === 0) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartText}>
            No assessments completed yet
          </Text>
        </View>
      </View>
    );
  }

  // Calculate chart dimensions
  const chartWidth = 280;
  const chartHeight = 100;
  const padding = 20;
  const plotWidth = chartWidth - padding * 2;
  const plotHeight = chartHeight - padding * 2;

  // Calculate points
  const points = displayHistory.map((point, index) => {
    const x = padding + (index / Math.max(displayHistory.length - 1, 1)) * plotWidth;
    const y = padding + plotHeight - (point.score / maxScore) * plotHeight;
    return { x, y, score: point.score, date: point.date };
  });

  // Get latest score info (safe - we returned early if length === 0)
  const latestPoint = displayHistory[displayHistory.length - 1]!;
  const latestColor = getColor(latestPoint.score);

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>{title}</Text>
        <View style={[styles.latestScore, { backgroundColor: latestColor }]}>
          <Text style={styles.latestScoreText}>{latestPoint.score}</Text>
        </View>
      </View>

      {/* Simple visual representation */}
      <View style={[styles.chartArea, { height: chartHeight }]}>
        {/* Baseline */}
        <View style={styles.chartBaseline} />

        {/* Data points */}
        <View style={styles.pointsRow}>
          {points.map((point, index) => (
            <View key={index} style={styles.pointColumn}>
              <View
                style={[
                  styles.dataPoint,
                  {
                    backgroundColor: getColor(point.score),
                    marginBottom: (point.score / maxScore) * plotHeight,
                  },
                ]}
              />
              <Text style={styles.pointLabel}>{formatDate(point.date)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Latest severity */}
      <Text style={styles.latestSeverity}>
        Most recent: {latestPoint.severity} ({formatDate(latestPoint.date)})
      </Text>
    </View>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────────────────────────────────────

const WellnessScreeningTrends: React.FC<WellnessScreeningTrendsProps> = ({
  phq9History,
  gad7History,
}) => {
  // Don't show section if no assessments completed
  if (phq9History.length === 0 && gad7History.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.sectionTitle}>{LABELS.sectionTitle}</Text>

      {/* Disclaimer - REQUIRED ABOVE charts */}
      <WellnessDisclaimer />

      {/* PHQ-9 Trend */}
      {phq9History.length > 0 && (
        <TrendChart
          title={LABELS.phq9}
          history={phq9History}
          maxScore={PHQ9_MAX}
          getColor={getPHQ9Color}
        />
      )}

      {/* GAD-7 Trend */}
      {gad7History.length > 0 && (
        <TrendChart
          title={LABELS.gad7}
          history={gad7History}
          maxScore={GAD7_MAX}
          getColor={getGAD7Color}
        />
      )}
    </View>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// STYLES
// ──────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: colorSystem.gray[50],
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    marginBottom: spacing[16],
  },
  sectionTitle: {
    fontSize: typography.headline4.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
    marginBottom: spacing[12],
  },
  disclaimerContainer: {
    backgroundColor: colorSystem.base.white,
    borderRadius: borderRadius.small,
    padding: spacing[12],
    marginBottom: spacing[16],
    borderLeftWidth: 3,
    borderLeftColor: colorSystem.gray[300],
  },
  disclaimerText: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[600],
    lineHeight: 18,
    marginBottom: spacing[8],
  },
  disclaimerBold: {
    fontWeight: typography.fontWeight.semibold,
  },
  crisisLink: {
    color: crisis,
    fontWeight: typography.fontWeight.semibold,
    textDecorationLine: 'underline',
  },
  chartContainer: {
    backgroundColor: colorSystem.base.white,
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    marginBottom: spacing[12],
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[12],
  },
  chartTitle: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
    flex: 1,
  },
  latestScore: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  latestScoreText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.white,
  },
  chartArea: {
    position: 'relative',
    marginBottom: spacing[8],
  },
  chartBaseline: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colorSystem.gray[200],
  },
  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '100%',
    paddingBottom: 20,
  },
  pointColumn: {
    alignItems: 'center',
    flex: 1,
  },
  dataPoint: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pointLabel: {
    fontSize: typography.micro.size,
    color: colorSystem.gray[500],
    marginTop: spacing[4],
    textAlign: 'center',
  },
  latestSeverity: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[500],
    textAlign: 'center',
    fontStyle: 'italic',
  },
  emptyChart: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.small,
  },
  emptyChartText: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[500],
    fontStyle: 'italic',
  },
});

export default WellnessScreeningTrends;
