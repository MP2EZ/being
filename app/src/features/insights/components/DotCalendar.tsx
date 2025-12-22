/**
 * DotCalendar - Practice Rhythm Visualization (FEAT-28)
 *
 * A contemplative view of daily practice patterns using a dot grid.
 * Each dot represents a day, with fill state based on check-in completion.
 *
 * Design Philosophy:
 * - "Mirror for contemplation" - observation not achievement
 * - Pattern recognition over streak counting
 * - No gamification (no flame icons, badges, or celebratory animations)
 *
 * Dot States:
 * - Empty: No check-ins completed
 * - Partial: 1-2 check-ins completed
 * - Complete: All 3 check-ins completed (morning, midday, evening)
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
import type { CheckInCompletion, CheckInType } from '@/features/practices/stores/stoicPracticeStore';

// ──────────────────────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────────────────────

type TimeRange = 'week' | 'month' | 'quarter';

type DotState = 'empty' | 'partial' | 'complete';

interface DayData {
  date: string; // YYYY-MM-DD
  checkIns: CheckInType[];
  state: DotState;
}

interface DotCalendarProps {
  /** Check-in completion history from stoicPracticeStore */
  checkInHistory: CheckInCompletion[];
  /** Initially selected time range */
  initialTimeRange?: TimeRange;
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

// All possible check-in types
const ALL_CHECK_INS: CheckInType[] = ['morning', 'midday', 'evening'];

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Get date string in YYYY-MM-DD format
 */
const getDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Generate array of dates for the given range ending today
 */
const generateDateRange = (days: number): string[] => {
  const dates: string[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(getDateString(date));
  }

  return dates;
};

/**
 * Calculate dot state based on completed check-ins
 */
const calculateDotState = (checkIns: CheckInType[]): DotState => {
  if (checkIns.length === 0) return 'empty';
  if (checkIns.length >= ALL_CHECK_INS.length) return 'complete';
  return 'partial';
};

/**
 * Process check-in history into day data
 */
const processCheckInHistory = (
  history: CheckInCompletion[],
  dateRange: string[]
): DayData[] => {
  // Group completions by date
  const completionsByDate = new Map<string, CheckInType[]>();

  for (const completion of history) {
    const existing = completionsByDate.get(completion.date) || [];
    if (!existing.includes(completion.type)) {
      existing.push(completion.type);
    }
    completionsByDate.set(completion.date, existing);
  }

  // Map dates to day data
  return dateRange.map(date => {
    const checkIns = completionsByDate.get(date) || [];
    return {
      date,
      checkIns,
      state: calculateDotState(checkIns),
    };
  });
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

interface DotProps {
  state: DotState;
  isToday: boolean;
}

const Dot: React.FC<DotProps> = ({ state, isToday }) => {
  const dotStyle = [
    styles.dot,
    state === 'empty' && styles.dotEmpty,
    state === 'partial' && styles.dotPartial,
    state === 'complete' && styles.dotComplete,
    isToday && styles.dotToday,
  ];

  return <View style={dotStyle} />;
};

// ──────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────────────────────────────────────

const DotCalendar: React.FC<DotCalendarProps> = ({
  checkInHistory,
  initialTimeRange = 'month',
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);

  // Generate date range and process history
  const dayData = useMemo(() => {
    const days = TIME_RANGE_DAYS[timeRange];
    const dateRange = generateDateRange(days);
    return processCheckInHistory(checkInHistory, dateRange);
  }, [checkInHistory, timeRange]);

  // Get today's date string for highlighting
  const todayString = getDateString(new Date());

  // Calculate summary stats for observational text
  const summary = useMemo(() => {
    const completeDays = dayData.filter(d => d.state === 'complete').length;
    const partialDays = dayData.filter(d => d.state === 'partial').length;
    const practiceDays = completeDays + partialDays;
    return { completeDays, partialDays, practiceDays, totalDays: dayData.length };
  }, [dayData]);

  // Observational summary text (not celebratory)
  const getSummaryText = (): string => {
    const { practiceDays, totalDays } = summary;
    if (practiceDays === 0) {
      return 'No practice recorded yet in this period.';
    }
    return `Practice appears on ${practiceDays} of the last ${totalDays} days.`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.title}>Your Practice Rhythm</Text>

      {/* Time Range Selector */}
      <TimeRangeSelector selected={timeRange} onSelect={setTimeRange} />

      {/* Dot Grid */}
      <View style={styles.dotGrid}>
        {dayData.map(day => (
          <Dot
            key={day.date}
            state={day.state}
            isToday={day.date === todayString}
          />
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.dotEmpty]} />
          <Text style={styles.legendText}>None</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.dotPartial]} />
          <Text style={styles.legendText}>Some</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.dotComplete]} />
          <Text style={styles.legendText}>All</Text>
        </View>
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
  dotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
    justifyContent: 'flex-start',
    marginBottom: spacing[16],
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotEmpty: {
    backgroundColor: colorSystem.gray[200],
  },
  dotPartial: {
    backgroundColor: colorSystem.themes.morning.light,
  },
  dotComplete: {
    backgroundColor: colorSystem.themes.morning.primary,
  },
  dotToday: {
    borderWidth: 2,
    borderColor: semantic.text.primary,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[16],
    marginBottom: spacing[12],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[500],
  },
  summaryText: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default DotCalendar;
