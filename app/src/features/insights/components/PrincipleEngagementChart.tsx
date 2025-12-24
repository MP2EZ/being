/**
 * PrincipleEngagementChart - Principle Embodiment Visualization (FEAT-28)
 * Enhanced with Observational Insights (FEAT-133)
 *
 * Displays engagement frequency with each of the 5 Stoic Mindfulness Principles.
 * Uses horizontal bars for clear, accessible visualization.
 *
 * FEAT-133 Enhancements:
 * - Observational insight text when dominant principle detected (≥40%, ≥2× next)
 * - Tappable principle bars → navigate to Learn tab modules
 * - Beginner tip for users <3 months with ≥3 engagements
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

import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import {
  colorSystem,
  spacing,
  borderRadius,
  typography,
  semantic,
} from '@/core/theme';
import type { StoicPrinciple } from '@/features/practices/types/stoic';
import type { PrincipleEngagement } from '@/features/practices/stores/stoicPracticeStore';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';
import { getModuleIdForPrinciple } from '@/features/learn/utils/principleMapping';
import { useEducationStore } from '@/features/learn/stores/educationStore';
import { useStoicPracticeStore } from '@/features/practices/stores/stoicPracticeStore';

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

interface DominantPrincipleInfo {
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

const TIME_RANGE_PERIOD_TEXT: Record<TimeRange, string> = {
  week: 'this week',
  month: 'this month',
  quarter: 'this quarter',
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

/** Minimum engagements to show observational insight (AC-1) */
const MIN_ENGAGEMENTS_FOR_INSIGHT = 5;

/** Minimum percentage to be considered dominant (AC-1) */
const DOMINANT_PERCENTAGE_THRESHOLD = 40;

/** Minimum ratio vs next highest to be considered dominant (AC-1) */
const DOMINANT_RATIO_THRESHOLD = 2;

/** Days threshold for beginner tip (<90 days) (AC-3) */
const BEGINNER_DAYS_THRESHOLD = 90;

/** Minimum engagements to show beginner tip (AC-3) */
const MIN_ENGAGEMENTS_FOR_TIP = 3;

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

/**
 * Detect dominant principle based on AC-1 criteria:
 * - ≥40% of total engagements
 * - ≥2× the next highest
 * - Minimum 5 total engagements
 */
const detectDominantPrinciple = (
  principleCounts: PrincipleCount[],
  totalEngagements: number
): DominantPrincipleInfo | null => {
  if (totalEngagements < MIN_ENGAGEMENTS_FOR_INSIGHT) {
    return null;
  }

  // Sort by count descending
  const sorted = [...principleCounts].sort((a, b) => b.count - a.count);
  const highest = sorted[0];
  const secondHighest = sorted[1];

  if (!highest || highest.count === 0) {
    return null;
  }

  // Calculate percentage of total
  const highestPercentage = (highest.count / totalEngagements) * 100;

  // Check threshold criteria
  if (highestPercentage < DOMINANT_PERCENTAGE_THRESHOLD) {
    return null;
  }

  // Check ratio to second highest (if second exists and has count)
  if (secondHighest && secondHighest.count > 0) {
    const ratio = highest.count / secondHighest.count;
    if (ratio < DOMINANT_RATIO_THRESHOLD) {
      return null;
    }
  }

  return {
    principle: highest.principle,
    count: highest.count,
    percentage: highestPercentage,
  };
};

/**
 * Check if user is a beginner (<90 days since practice start)
 */
const isBeginnerUser = (practiceStartDate: Date | null): boolean => {
  if (!practiceStartDate) {
    return true; // No start date = assume new user = show beginner tip
  }

  const now = new Date();
  const daysSinceStart = Math.floor(
    (now.getTime() - practiceStartDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Use < not ≤ per AC-3 edge case
  return daysSinceStart < BEGINNER_DAYS_THRESHOLD;
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
  onPress: (principle: StoicPrinciple) => void;
}

const PrincipleBar: React.FC<PrincipleBarProps> = ({ principleCount, onPress }) => {
  const { principle, count, percentage } = principleCount;
  const metadata = PRINCIPLE_METADATA[principle];

  return (
    <TouchableOpacity
      style={styles.barContainer}
      onPress={() => onPress(principle)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${metadata.name}: ${count} engagements`}
      accessibilityHint={`Learn more about ${metadata.name}`}
    >
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
    </TouchableOpacity>
  );
};

interface ObservationalInsightProps {
  dominantPrinciple: DominantPrincipleInfo;
  timeRange: TimeRange;
}

const ObservationalInsight: React.FC<ObservationalInsightProps> = ({
  dominantPrinciple,
  timeRange,
}) => {
  const principleName = PRINCIPLE_METADATA[dominantPrinciple.principle].name;
  const periodText = TIME_RANGE_PERIOD_TEXT[timeRange];

  return (
    <View style={styles.insightContainer}>
      <Text style={styles.insightText}>
        You've naturally gravitated toward{' '}
        <Text style={styles.insightPrincipleName}>{principleName}</Text>{' '}
        {periodText}. Does this reflect what you're working through?
      </Text>
    </View>
  );
};

interface BeginnerTipProps {
  onDismiss: () => void;
}

const BeginnerTip: React.FC<BeginnerTipProps> = ({ onDismiss }) => (
  <View style={styles.beginnerTipContainer}>
    <View style={styles.beginnerTipContent}>
      <Text style={styles.beginnerTipIcon}>i</Text>
      <Text style={styles.beginnerTipText}>
        Exploring multiple principles can provide different perspectives on the same situation.
      </Text>
    </View>
    <TouchableOpacity
      onPress={onDismiss}
      style={styles.beginnerTipDismiss}
      accessibilityRole="button"
      accessibilityLabel="Dismiss tip"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Text style={styles.beginnerTipDismissText}>×</Text>
    </TouchableOpacity>
  </View>
);

// ──────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────────────────────────────────────

const PrincipleEngagementChart: React.FC<PrincipleEngagementChartProps> = ({
  engagements,
  initialTimeRange = 'month',
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  // FEAT-133: Education store for dismissed tips
  // Subscribe to dismissedInsightTips array directly for proper reactivity
  const { dismissInsightTip, dismissedInsightTips } = useEducationStore();

  // FEAT-133: Practice start date for beginner detection
  const { practiceStartDate } = useStoicPracticeStore();

  // Filter and calculate principle counts
  const principleCounts = useMemo(() => {
    const days = TIME_RANGE_DAYS[timeRange];
    const filtered = filterByDateRange(engagements, days);
    return calculatePrincipleCounts(filtered);
  }, [engagements, timeRange]);

  // Calculate total engagements for observational text
  const totalEngagements = principleCounts.reduce((sum, p) => sum + p.count, 0);

  // FEAT-133: Detect dominant principle for observational insight
  const dominantPrinciple = useMemo(() => {
    return detectDominantPrinciple(principleCounts, totalEngagements);
  }, [principleCounts, totalEngagements]);

  // FEAT-133: Determine if beginner tip should show
  // Uses dismissedInsightTips array directly for proper reactivity (not the function)
  const shouldShowBeginnerTip = useMemo(() => {
    const tipDismissed = dismissedInsightTips.includes('principle-engagement-beginner');
    if (tipDismissed) return false;

    const isBeginner = isBeginnerUser(practiceStartDate);
    if (!isBeginner) return false;

    return totalEngagements >= MIN_ENGAGEMENTS_FOR_TIP;
  }, [dismissedInsightTips, practiceStartDate, totalEngagements]);

  // FEAT-133: Handle principle bar press → navigate to module
  const handlePrinciplePress = useCallback((principle: StoicPrinciple) => {
    const moduleId = getModuleIdForPrinciple(principle);
    navigation.navigate('ModuleDetail', { moduleId });
  }, [navigation]);

  // FEAT-133: Handle beginner tip dismiss
  const handleDismissBeginnerTip = useCallback(() => {
    dismissInsightTip('principle-engagement-beginner');
  }, [dismissInsightTip]);

  // Observational summary text (fallback when no dominant principle)
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

      {/* Principle Bars - Now Tappable (FEAT-133) */}
      <View style={styles.barsContainer}>
        {principleCounts.map(principleCount => (
          <PrincipleBar
            key={principleCount.principle}
            principleCount={principleCount}
            onPress={handlePrinciplePress}
          />
        ))}
      </View>

      {/* FEAT-133: Observational Insight (when dominant principle detected) */}
      {dominantPrinciple ? (
        <ObservationalInsight
          dominantPrinciple={dominantPrinciple}
          timeRange={timeRange}
        />
      ) : (
        <Text style={styles.summaryText}>{getSummaryText()}</Text>
      )}

      {/* FEAT-133: Beginner Tip (for users <3 months with ≥3 engagements) */}
      {shouldShowBeginnerTip && (
        <BeginnerTip onDismiss={handleDismissBeginnerTip} />
      )}
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
  // FEAT-133: Observational Insight styles
  insightContainer: {
    backgroundColor: colorSystem.gray[50],
    borderRadius: borderRadius.small,
    padding: spacing[12],
  },
  insightText: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[700],
    textAlign: 'center',
    lineHeight: 20,
  },
  insightPrincipleName: {
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
  },
  // FEAT-133: Beginner Tip styles (light purple tint with left border)
  beginnerTipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(108, 92, 231, 0.08)', // Light purple tint
    borderLeftWidth: 3,
    borderLeftColor: '#6C5CE7', // Purple
    borderRadius: borderRadius.small,
    padding: spacing[12],
    marginTop: spacing[12],
  },
  beginnerTipContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  beginnerTipIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#6C5CE7',
    color: colorSystem.base.white,
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
    lineHeight: 18,
    marginRight: spacing[8],
  },
  beginnerTipText: {
    flex: 1,
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[700],
    lineHeight: 20,
  },
  beginnerTipDismiss: {
    marginLeft: spacing[8],
    padding: spacing[4],
  },
  beginnerTipDismissText: {
    fontSize: 18,
    color: colorSystem.gray[500],
    fontWeight: typography.fontWeight.light,
  },
});

export default PrincipleEngagementChart;
