/**
 * ProgressScreen - Assessment history and therapeutic progress visualization
 * Displays mood trends, check-in statistics, and therapeutic milestones
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Button, CrisisButton } from '../../components/core';
import { colorSystem, spacing } from '../../constants/colors';
import { useCheckInStore } from '../../store';
import { useAssessmentStore } from '../../store/assessmentStore';
import { CheckIn } from '../../types';
import { AssessmentResult } from '../../types/assessments';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - (spacing.lg * 2);

interface ProgressStats {
  totalCheckIns: number;
  checkInStreak: number;
  averageMood: number;
  completionRate: number;
  lastAssessment: AssessmentResult | null;
  improvementTrend: 'improving' | 'stable' | 'concerning' | 'unknown';
}

interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }[];
}

export const ProgressScreen: React.FC = () => {
  const navigation = useNavigation();
  const { checkIns, loadCheckIns, getRecentCheckIns } = useCheckInStore();
  const { assessmentResults, loadAssessmentResults } = useAssessmentStore();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'three_months'>('month');

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        loadCheckIns(),
        loadAssessmentResults(),
      ]);
    } catch (error) {
      console.error('Failed to load progress data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadCheckIns, loadAssessmentResults]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Calculate progress statistics
  const progressStats = useMemo((): ProgressStats => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    // Recent check-ins (last 30 days)
    const recentCheckIns = checkIns.filter(checkIn => {
      const checkInDate = new Date(checkIn.completedAt || checkIn.startedAt);
      return checkInDate >= thirtyDaysAgo && checkIn.completedAt && !checkIn.skipped;
    });

    // Calculate streak
    let streak = 0;
    const sortedDates = Array.from(new Set(
      recentCheckIns.map(c => new Date(c.completedAt!).toDateString())
    )).sort().reverse();

    for (let i = 0; i < sortedDates.length; i++) {
      const date = new Date(sortedDates[i]);
      const expectedDate = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));

      if (date.toDateString() === expectedDate.toDateString()) {
        streak++;
      } else {
        break;
      }
    }

    // Calculate average mood (from mood tracking in check-ins)
    const moodValues = recentCheckIns
      .map(c => c.data?.mood?.value)
      .filter((mood): mood is number => typeof mood === 'number');

    const averageMood = moodValues.length > 0
      ? moodValues.reduce((sum, mood) => sum + mood, 0) / moodValues.length
      : 0;

    // Calculate completion rate
    const totalStarted = checkIns.filter(c =>
      new Date(c.startedAt) >= thirtyDaysAgo
    ).length;
    const completionRate = totalStarted > 0 ? (recentCheckIns.length / totalStarted) * 100 : 0;

    // Get last assessment
    const lastAssessment = assessmentResults.length > 0
      ? assessmentResults.sort((a, b) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        )[0]
      : null;

    // Determine improvement trend
    let improvementTrend: ProgressStats['improvementTrend'] = 'unknown';
    if (assessmentResults.length >= 2) {
      const recent = assessmentResults.slice(0, 2).sort((a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );
      const current = recent[0];
      const previous = recent[1];

      if (current.type === previous.type) {
        const currentScore = current.type === 'phq9' ? current.phq9Score! : current.gad7Score!;
        const previousScore = previous.type === 'phq9' ? previous.phq9Score! : previous.gad7Score!;

        if (currentScore < previousScore - 2) {
          improvementTrend = 'improving';
        } else if (currentScore > previousScore + 2) {
          improvementTrend = 'concerning';
        } else {
          improvementTrend = 'stable';
        }
      }
    }

    return {
      totalCheckIns: recentCheckIns.length,
      checkInStreak: streak,
      averageMood,
      completionRate,
      lastAssessment,
      improvementTrend,
    };
  }, [checkIns, assessmentResults]);

  // Generate mood trend chart data
  const moodChartData = useMemo((): ChartData => {
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
    const now = new Date();
    const labels: string[] = [];
    const moodData: number[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dayCheckIns = checkIns.filter(checkIn => {
        const checkInDate = new Date(checkIn.completedAt || checkIn.startedAt);
        return checkInDate.toDateString() === date.toDateString() &&
               checkIn.completedAt &&
               !checkIn.skipped;
      });

      // Calculate average mood for the day
      const dayMoods = dayCheckIns
        .map(c => c.data?.mood?.value)
        .filter((mood): mood is number => typeof mood === 'number');

      const avgMood = dayMoods.length > 0
        ? dayMoods.reduce((sum, mood) => sum + mood, 0) / dayMoods.length
        : null;

      if (timeRange === 'week') {
        labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
      } else {
        labels.push(date.getDate().toString());
      }

      moodData.push(avgMood || 0);
    }

    return {
      labels,
      datasets: [{
        data: moodData,
        color: (opacity = 1) => `rgba(64, 181, 173, ${opacity})`, // midday theme color
        strokeWidth: 3,
      }],
    };
  }, [checkIns, timeRange]);

  // Generate check-in frequency chart data
  const checkInChartData = useMemo((): ChartData => {
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
    const now = new Date();
    const labels: string[] = [];
    const checkInCounts: number[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dayCheckIns = checkIns.filter(checkIn => {
        const checkInDate = new Date(checkIn.completedAt || checkIn.startedAt);
        return checkInDate.toDateString() === date.toDateString() &&
               checkIn.completedAt &&
               !checkIn.skipped;
      });

      if (timeRange === 'week') {
        labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
      } else {
        labels.push(date.getDate().toString());
      }

      checkInCounts.push(dayCheckIns.length);
    }

    return {
      labels,
      datasets: [{
        data: checkInCounts,
      }],
    };
  }, [checkIns, timeRange]);

  // Get trend message
  const getTrendMessage = () => {
    switch (progressStats.improvementTrend) {
      case 'improving':
        return { text: 'Your scores show positive improvement! Keep up the great work.', color: colorSystem.status.success };
      case 'stable':
        return { text: 'Your progress is stable. Consistency is key to wellbeing.', color: colorSystem.status.info };
      case 'concerning':
        return { text: 'Consider reaching out for additional support. You don\'t have to manage this alone.', color: colorSystem.status.warning };
      default:
        return { text: 'Complete a few more assessments to see your progress trends.', color: colorSystem.gray[600] };
    }
  };

  const trendMessage = getTrendMessage();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your progress...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Crisis Button */}
      <CrisisButton variant="floating" />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Your Progress</Text>
          <Text style={styles.subtitle}>Track your mindfulness journey</Text>
        </View>

        {/* Progress Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{progressStats.totalCheckIns}</Text>
            <Text style={styles.statLabel}>Check-ins (30d)</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{progressStats.checkInStreak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {progressStats.averageMood > 0 ? progressStats.averageMood.toFixed(1) : '--'}
            </Text>
            <Text style={styles.statLabel}>Avg Mood</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{Math.round(progressStats.completionRate)}%</Text>
            <Text style={styles.statLabel}>Completion</Text>
          </View>
        </View>

        {/* Trend Message */}
        <View style={styles.trendContainer}>
          <Text style={[styles.trendText, { color: trendMessage.color }]}>
            {trendMessage.text}
          </Text>
        </View>

        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          <Text style={styles.sectionTitle}>Mood Trends</Text>
          <View style={styles.timeRangeButtons}>
            {(['week', 'month', 'three_months'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'primary' : 'outline'}
                onPress={() => setTimeRange(range)}
                style={styles.timeRangeButton}
                fullWidth={false}
              >
                {range === 'week' ? '7D' : range === 'month' ? '30D' : '90D'}
              </Button>
            ))}
          </View>
        </View>

        {/* Mood Trend Chart */}
        {moodChartData.datasets[0].data.some(d => d > 0) ? (
          <View style={styles.chartContainer}>
            <LineChart
              data={moodChartData}
              width={chartWidth}
              height={220}
              chartConfig={{
                backgroundColor: colorSystem.base.white,
                backgroundGradientFrom: colorSystem.base.white,
                backgroundGradientTo: colorSystem.base.white,
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(64, 181, 173, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(117, 117, 117, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: colorSystem.themes.midday.primary,
                },
              }}
              bezier
              style={styles.chart}
            />
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>
              Start tracking your mood with daily check-ins to see trends here.
            </Text>
          </View>
        )}

        {/* Check-in Frequency Chart */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Check-in Frequency</Text>
          {checkInChartData.datasets[0].data.some(d => d > 0) ? (
            <BarChart
              data={checkInChartData}
              width={chartWidth}
              height={220}
              chartConfig={{
                backgroundColor: colorSystem.base.white,
                backgroundGradientFrom: colorSystem.base.white,
                backgroundGradientTo: colorSystem.base.white,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 159, 67, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(117, 117, 117, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
              }}
              style={styles.chart}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>
                Complete some check-ins to see your frequency patterns.
              </Text>
            </View>
          )}
        </View>

        {/* Last Assessment */}
        {progressStats.lastAssessment && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Latest Assessment</Text>
            <View style={styles.assessmentCard}>
              <View style={styles.assessmentHeader}>
                <Text style={styles.assessmentType}>
                  {progressStats.lastAssessment.type === 'phq9' ? 'PHQ-9 Depression' : 'GAD-7 Anxiety'}
                </Text>
                <Text style={styles.assessmentDate}>
                  {new Date(progressStats.lastAssessment.completedAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.assessmentScore}>
                <Text style={styles.scoreNumber}>
                  {progressStats.lastAssessment.type === 'phq9'
                    ? progressStats.lastAssessment.phq9Score
                    : progressStats.lastAssessment.gad7Score}
                </Text>
                <Text style={styles.scoreLabel}>
                  {progressStats.lastAssessment.riskLevel}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Button
            theme="midday"
            onPress={() => (navigation as any).navigate('AssessmentFlow', { type: 'phq9' })}
          >
            Take Assessment
          </Button>

          <Button
            variant="outline"
            onPress={() => (navigation as any).navigate('CheckInFlow', { type: 'morning' })}
            style={styles.actionButton}
          >
            Start Check-in
          </Button>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colorSystem.gray[600],
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colorSystem.gray[600],
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colorSystem.gray[50],
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: colorSystem.gray[600],
    textAlign: 'center',
  },
  trendContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colorSystem.gray[50],
    borderRadius: 12,
  },
  trendText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  timeRangeContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.md,
  },
  timeRangeButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
  chartContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  chart: {
    borderRadius: 16,
  },
  noDataContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colorSystem.gray[50],
    borderRadius: 12,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: colorSystem.gray[600],
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  assessmentCard: {
    backgroundColor: colorSystem.gray[50],
    padding: spacing.md,
    borderRadius: 12,
  },
  assessmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  assessmentType: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.base.black,
  },
  assessmentDate: {
    fontSize: 14,
    color: colorSystem.gray[600],
  },
  assessmentScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: colorSystem.base.black,
  },
  scoreLabel: {
    fontSize: 16,
    color: colorSystem.gray[600],
    textTransform: 'capitalize',
  },
  actionsContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  actionButton: {
    marginTop: spacing.md,
  },
  bottomSpacer: {
    height: spacing.xl,
  },
});

export default ProgressScreen;