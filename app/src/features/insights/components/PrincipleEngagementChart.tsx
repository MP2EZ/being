/**
 * PrincipleEngagementChart - Principle Embodiment Visualization (FEAT-28)
 *
 * Displays engagement frequency with each of the 5 Stoic Mindfulness Principles.
 * Uses horizontal bars for clear, accessible visualization.
 *
 * Framework Hierarchy:
 * - PRIMARY: 5 Stoic Mindfulness Principles (all shown equally)
 * - SECONDARY: 4 Cardinal Virtues (contained within Principle 4 only)
 *
 * Design Philosophy:
 * - Observation over achievement ("How often each principle appears")
 * - No ranking or competition between principles
 * - Contemplative, not gamified
 *
 * @see /docs/product/FEAT-28-insights-design-plan.md
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  colorSystem,
  spacing,
  borderRadius,
  typography,
  semantic,
} from '@/core/theme';
import type { StoicPrinciple } from '@/features/practices/types/stoic';
import type { PrincipleEngagement } from '@/features/practices/stores/stoicPracticeStore';

// ──────────────────────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────────────────────

type TimeRange = 'week' | 'month' | 'quarter';

interface PrincipleEngagementChartProps {
  /** Principle engagement history from stoicPracticeStore */
  engagements: PrincipleEngagement[];
  /** Initially selected time range */
  initialTimeRange?: TimeRange;
}

interface PrincipleCount {
  principle: StoicPrinciple;
  count: number;
  percentage: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ──────────────────────────────────────────────────────────────────────────────

const TIME_RANGE_DAYS: Record<TimeRange, number> = {
  week: 7,
  month: 30,
  quarter: 90,
};

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  week: 'Week',
  month: 'Month',
  quarter: 'Quarter',
};

/**
 * Principle metadata for display
 * Philosopher-validated (FEAT-45)
 */
const PRINCIPLE_METADATA: Record<StoicPrinciple, { name: string; shortName: string; color: string }> = {
  aware_presence: {
    name: 'Aware Presence',
    shortName: 'Presence',
    color: '#FF9F43', // Morning primary (warm orange)
  },
  radical_acceptance: {
    name: 'Radical Acceptance',
    shortName: 'Acceptance',
    color: '#6C5CE7', // Purple (contemplative)
  },
  sphere_sovereignty: {
    name: 'Sphere Sovereignty',
    shortName: 'Sovereignty',
    color: '#00CEC9', // Teal (control/clarity)
  },
  virtuous_response: {
    name: 'Virtuous Response',
    shortName: 'Virtue',
    color: '#E17055', // Evening primary (warm coral)
  },
  interconnected_living: {
    name: 'Interconnected Living',
    shortName: 'Connection',
    color: '#00B894', // Green (growth/community)
  },
};

const ALL_PRINCIPLES: StoicPrinciple[] = [
  'aware_presence',
  'radical_acceptance',
  'sphere_sovereignty',
  'virtuous_response',
  'interconnected_living',
];

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Filter engagements by date range
 */
const filterByDateRange = (
  engagements: PrincipleEngagement[],
  days: number
): PrincipleEngagement[] => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffString = cutoffDate.toISOString().split('T')[0];

  return engagements.filter(e => cutoffString && e.date >= cutoffString);
};

/**
 * Calculate engagement counts per principle
 */
const calculatePrincipleCounts = (
  engagements: PrincipleEngagement[]
): PrincipleCount[] => {
  // Count engagements per principle
  const counts = new Map<StoicPrinciple, number>();
  for (const principle of ALL_PRINCIPLES) {
    counts.set(principle, 0);
  }

  for (const engagement of engagements) {
    const current = counts.get(engagement.principle) || 0;
    counts.set(engagement.principle, current + 1);
  }

  // Find max for percentage calculation
  const maxCount = Math.max(...counts.values(), 1); // Minimum 1 to avoid division by zero

  // Convert to sorted array (by principle order, not count - no competition)
  return ALL_PRINCIPLES.map(principle => ({
    principle,
    count: counts.get(principle) || 0,
    percentage: ((counts.get(principle) || 0) / maxCount) * 100,
  }));
};

// ──────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ──────────────────────────────────────────────────────────────────────────────

interface TimeRangeSelectorProps {
  selected: TimeRange;
  onSelect: (range: TimeRange) => void;
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  selected,
  onSelect,
}) => (
  <View style={styles.timeRangeContainer}>
    {(['week', 'month', 'quarter'] as TimeRange[]).map(range => (
      <TouchableOpacity
        key={range}
        style={[
          styles.timeRangeButton,
          selected === range && styles.timeRangeButtonSelected,
        ]}
        onPress={() => onSelect(range)}
        accessibilityRole="tab"
        accessibilityState={{ selected: selected === range }}
        accessibilityLabel={`View ${TIME_RANGE_LABELS[range].toLowerCase()}`}
      >
        <Text
          style={[
            styles.timeRangeText,
            selected === range && styles.timeRangeTextSelected,
          ]}
        >
          {TIME_RANGE_LABELS[range]}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

interface PrincipleBarProps {
  principleCount: PrincipleCount;
}

const PrincipleBar: React.FC<PrincipleBarProps> = ({ principleCount }) => {
  const { principle, count, percentage } = principleCount;
  const metadata = PRINCIPLE_METADATA[principle];

  return (
    <View style={styles.barContainer}>
      <View style={styles.barLabelContainer}>
        <Text style={styles.barLabel}>{metadata.shortName}</Text>
        <Text style={styles.barCount}>
          {count === 0 ? '' : count}
        </Text>
      </View>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.max(percentage, count > 0 ? 5 : 0)}%`,
              backgroundColor: metadata.color,
            },
          ]}
        />
      </View>
    </View>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────────────────────────────────────

const PrincipleEngagementChart: React.FC<PrincipleEngagementChartProps> = ({
  engagements,
  initialTimeRange = 'month',
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);

  // Filter and calculate principle counts
  const principleCounts = useMemo(() => {
    const days = TIME_RANGE_DAYS[timeRange];
    const filtered = filterByDateRange(engagements, days);
    return calculatePrincipleCounts(filtered);
  }, [engagements, timeRange]);

  // Calculate total engagements for observational text
  const totalEngagements = principleCounts.reduce((sum, p) => sum + p.count, 0);

  // Observational summary text
  const getSummaryText = (): string => {
    if (totalEngagements === 0) {
      return 'No principle engagement recorded yet in this period.';
    }
    const activePrinciples = principleCounts.filter(p => p.count > 0).length;
    return `${activePrinciples} of 5 principles appear in your practice.`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.title}>Principle Embodiment</Text>
      <Text style={styles.subtitle}>
        How often each principle appears in your practice
      </Text>

      {/* Time Range Selector */}
      <TimeRangeSelector selected={timeRange} onSelect={setTimeRange} />

      {/* Principle Bars */}
      <View style={styles.barsContainer}>
        {principleCounts.map(principleCount => (
          <PrincipleBar
            key={principleCount.principle}
            principleCount={principleCount}
          />
        ))}
      </View>

      {/* Observational Summary */}
      <Text style={styles.summaryText}>{getSummaryText()}</Text>
    </View>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// STYLES
// ──────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: colorSystem.base.white,
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    marginBottom: spacing[16],
  },
  title: {
    fontSize: typography.headline4.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
    marginBottom: spacing[4],
  },
  subtitle: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[500],
    marginBottom: spacing[12],
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.small,
    padding: spacing[4],
    marginBottom: spacing[16],
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[12],
    borderRadius: borderRadius.small,
    alignItems: 'center',
  },
  timeRangeButtonSelected: {
    backgroundColor: colorSystem.base.white,
    shadowColor: colorSystem.base.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeRangeText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.gray[500],
  },
  timeRangeTextSelected: {
    color: semantic.text.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  barsContainer: {
    gap: spacing[12],
    marginBottom: spacing[16],
  },
  barContainer: {
    gap: spacing[4],
  },
  barLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barLabel: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: semantic.text.primary,
  },
  barCount: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[500],
    minWidth: 20,
    textAlign: 'right',
  },
  barTrack: {
    height: 8,
    backgroundColor: colorSystem.gray[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  summaryText: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default PrincipleEngagementChart;
