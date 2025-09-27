/**
 * TimelineVisualization Component
 *
 * Interactive timeline showing mental health patterns with mood zones,
 * warning indicators, and early detection alerts.
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet
} from 'react-native';

import { TimelineVisualizationProps } from '../types';
import { ClinicalIcon } from './ClinicalIcon';

const TimelineVisualization: React.FC<TimelineVisualizationProps & {
  subtitle?: string;
  isActive?: boolean;
}> = memo(({
  data,
  title,
  subtitle,
  isActive = false
}) => {
  const getMoodColor = (mood: 'good' | 'moderate' | 'concerning') => {
    switch (mood) {
      case 'good': return '#48BB78';
      case 'moderate': return '#ED8936';
      case 'concerning': return '#F56565';
      default: return '#A0AEC0';
    }
  };

  const getMoodZoneStyle = (level: 'good' | 'moderate' | 'concerning') => {
    switch (level) {
      case 'good':
        return { backgroundColor: '#F0FFF4', borderColor: '#48BB78' };
      case 'moderate':
        return { backgroundColor: '#FFFAF0', borderColor: '#ED8936' };
      case 'concerning':
        return { backgroundColor: '#FED7D7', borderColor: '#F56565' };
      default:
        return { backgroundColor: '#F7FAFC', borderColor: '#A0AEC0' };
    }
  };

  const renderTimelinePoint = (point: typeof data.dataPoints[0], index: number) => (
    <View
      key={index}
      style={[
        styles.dataPoint,
        {
          left: `${point.position}%`,
          backgroundColor: getMoodColor(point.mood)
        }
      ]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`Day ${index + 1}: ${point.mood} mood${point.hasWarning ? ', warning detected' : ''}`}
    >
      {point.hasWarning && (
        <View style={styles.warningFlag}>
          <ClinicalIcon
            type="warning"
            size={12}
            color="#F56565"
            accessibilityLabel="Pattern alert"
          />
          <Text style={styles.warningText}>Pattern Alert</Text>
        </View>
      )}
    </View>
  );

  const renderMoodZone = (zone: typeof data.zones[0], index: number) => (
    <View
      key={index}
      style={[
        styles.moodZone,
        getMoodZoneStyle(zone.level),
        { top: index * 40 + 20 }
      ]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`${zone.name} mood zone`}
    >
      <Text style={[styles.zoneText, { color: getMoodColor(zone.level) }]}>
        {zone.name}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Timeline Header */}
      <View style={styles.timelineHeader}>
        <Text style={styles.timelineTitle}>{title}</Text>
        {subtitle && (
          <Text style={styles.timelinePeriod}>{subtitle}</Text>
        )}
      </View>

      {/* Timeline Graph */}
      <View
        style={styles.timelineGraph}
        accessible={true}
        accessibilityLabel="Mental health timeline visualization"
      >
        {/* Mood Zones Background */}
        <View style={styles.moodZonesContainer}>
          {data.zones.map(renderMoodZone)}
        </View>

        {/* Timeline Axis */}
        <View style={styles.timelineAxis}>
          <View style={styles.axisLine} />
        </View>

        {/* Data Points */}
        <View style={styles.timelineData}>
          {data.dataPoints.map(renderTimelinePoint)}
        </View>

        {/* Timeline Dates */}
        <View style={styles.timelineDates}>
          <Text style={styles.dateLabel}>3 weeks ago</Text>
          <Text style={styles.dateLabel}>2 weeks ago</Text>
          <Text style={styles.dateLabel}>1 week ago</Text>
          <Text style={styles.dateLabel}>Today</Text>
        </View>
      </View>

      {/* Pattern Analysis Summary */}
      <View style={styles.patternSummary}>
        <View style={styles.summaryHeader}>
          <ClinicalIcon
            type="analytics"
            size={16}
            color="#4A5568"
            accessibilityLabel="Pattern analysis"
          />
          <Text style={styles.summaryTitle}>Pattern Analysis</Text>
        </View>

        <Text style={styles.summaryText}>
          AI detected concerning pattern on day 15 based on mood decline and sleep disruption.
          Early intervention recommended: 3-minute breathing exercise.
        </Text>

        <View style={styles.summaryMetrics}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>2-3 weeks</Text>
            <Text style={styles.metricLabel}>Early warning lead time</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>87%</Text>
            <Text style={styles.metricLabel}>Pattern accuracy</Text>
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  timelineHeader: {
    marginBottom: 20
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A365D',
    marginBottom: 4
  },
  timelinePeriod: {
    fontSize: 12,
    color: '#4A5568',
    fontWeight: '500'
  },
  timelineGraph: {
    position: 'relative',
    height: 180,
    marginBottom: 20
  },
  moodZonesContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '100%'
  },
  moodZone: {
    position: 'absolute',
    left: 0,
    right: 60,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    paddingLeft: 12
  },
  zoneText: {
    fontSize: 12,
    fontWeight: '500'
  },
  timelineAxis: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    height: 2
  },
  axisLine: {
    height: '100%',
    backgroundColor: '#E2E8F0',
    borderRadius: 1
  },
  timelineData: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    height: 20
  },
  dataPoint: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2
  },
  warningFlag: {
    position: 'absolute',
    top: -35,
    left: -30,
    backgroundColor: '#FED7D7',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: '#F56565',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 80
  },
  warningText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#C53030'
  },
  timelineDates: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  dateLabel: {
    fontSize: 10,
    color: '#4A5568',
    textAlign: 'center'
  },
  patternSummary: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6'
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A365D'
  },
  summaryText: {
    fontSize: 12,
    color: '#4A5568',
    lineHeight: 18,
    marginBottom: 12
  },
  summaryMetrics: {
    flexDirection: 'row',
    gap: 20
  },
  metric: {
    alignItems: 'center'
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B5CF6',
    marginBottom: 2
  },
  metricLabel: {
    fontSize: 10,
    color: '#4A5568',
    textAlign: 'center'
  }
});

TimelineVisualization.displayName = 'TimelineVisualization';

export { TimelineVisualization };