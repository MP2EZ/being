/**
 * EvidenceChart Component
 *
 * Displays clinical evidence data with bar charts, highlighting
 * MBCT effectiveness and relapse reduction statistics.
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated
} from 'react-native';

import { EvidenceChartProps } from '../types';

const EvidenceChart: React.FC<EvidenceChartProps & { subtitle?: string }> = memo(({
  data,
  title,
  subtitle
}) => {
  const maxValue = Math.max(...data.dataPoints.map(point => point.value));

  const renderBarChart = () => (
    <View style={styles.chartContainer}>
      <View style={styles.chartBars}>
        {data.dataPoints.map((point, index) => {
          const barHeight = (point.value / maxValue) * 200; // Max height 200px

          return (
            <View key={index} style={styles.barGroup}>
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    backgroundColor: point.color
                  }
                ]}
                accessible={true}
                accessibilityLabel={`${point.label}: ${point.value}% relapse rate`}
                accessibilityRole="text"
              >
                <View style={styles.barValue}>
                  <Text style={styles.barValueText}>{point.value}%</Text>
                </View>
              </View>
              <Text style={styles.barLabel}>{point.label}</Text>
            </View>
          );
        })}
      </View>

      {/* Improvement Highlight */}
      {data.highlightValue && (
        <View style={styles.improvementHighlight}>
          <Text style={styles.improvementNumber}>
            {data.highlightValue.value}
          </Text>
          <Text style={styles.improvementText}>
            {data.highlightValue.description}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Chart Header */}
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>{title}</Text>
        {subtitle && (
          <Text style={styles.studyNote}>{subtitle}</Text>
        )}
      </View>

      {/* Chart Visualization */}
      {data.chartType === 'bar' && renderBarChart()}

      {/* Y-Axis Label */}
      {data.yAxisLabel && (
        <View style={styles.yAxisContainer}>
          <Text style={styles.yAxisLabel}>{data.yAxisLabel}</Text>
        </View>
      )}

      {/* Timeframe */}
      {data.timeframe && (
        <View style={styles.timeframeContainer}>
          <Text style={styles.timeframeText}>{data.timeframe}</Text>
        </View>
      )}

      {/* Clinical Context */}
      <View style={styles.clinicalContext}>
        <Text style={styles.contextTitle}>Clinical Significance</Text>
        <Text style={styles.contextDescription}>
          This 43% reduction represents a clinically meaningful improvement in depression
          relapse prevention, exceeding the threshold for therapeutic significance.
        </Text>
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
  chartHeader: {
    marginBottom: 20
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A365D',
    marginBottom: 4
  },
  studyNote: {
    fontSize: 12,
    color: '#4A5568',
    fontStyle: 'italic'
  },
  chartContainer: {
    position: 'relative',
    marginBottom: 20
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 40,
    height: 220,
    paddingBottom: 20
  },
  barGroup: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 120
  },
  bar: {
    width: 60,
    minHeight: 20,
    borderRadius: 8,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 8,
    marginBottom: 8,
    position: 'relative'
  },
  barValue: {
    position: 'absolute',
    top: 8
  },
  barValueText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center'
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2D3748',
    textAlign: 'center',
    lineHeight: 16
  },
  improvementHighlight: {
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: [{ translateY: -30 }],
    backgroundColor: '#E6FFFA',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#38B2AC',
    minWidth: 120
  },
  improvementNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C7A7B',
    textAlign: 'center',
    marginBottom: 4
  },
  improvementText: {
    fontSize: 12,
    color: '#2C7A7B',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 16
  },
  yAxisContainer: {
    position: 'absolute',
    left: -40,
    top: '50%',
    transform: [{ rotate: '-90deg' }, { translateY: -50 }]
  },
  yAxisLabel: {
    fontSize: 12,
    color: '#4A5568',
    fontWeight: '500'
  },
  timeframeContainer: {
    alignItems: 'center',
    marginBottom: 16
  },
  timeframeText: {
    fontSize: 12,
    color: '#4A5568',
    fontStyle: 'italic'
  },
  clinicalContext: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#16A085'
  },
  contextTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A365D',
    marginBottom: 6
  },
  contextDescription: {
    fontSize: 12,
    color: '#4A5568',
    lineHeight: 18
  }
});

EvidenceChart.displayName = 'EvidenceChart';

export { EvidenceChart };