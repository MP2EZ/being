/**
 * PatternInsights Component
 *
 * Displays AI-powered pattern recognition insights for early warning system.
 * Shows personalized triggers and intervention recommendations.
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet
} from 'react-native';

import { ClinicalInsight } from '../types';
import { ClinicalIcon } from './ClinicalIcon';

interface PatternInsightsProps {
  insights: Array<Omit<ClinicalInsight, 'icon'> & { icon: string }>;
  accessibilityLabel?: string;
}

const PatternInsights: React.FC<PatternInsightsProps> = memo(({
  insights,
  accessibilityLabel
}) => {
  const getInsightColor = (type: string) => {
    switch (type) {
      case 'early-warning': return '#F56565';
      case 'personalized': return '#8B5CF6';
      case 'intervention': return '#48BB78';
      default: return '#4A5568';
    }
  };

  const getInsightIcon = (iconType: string) => {
    switch (iconType) {
      case 'warning': return 'warning';
      case 'brain': return 'brain';
      case 'shield': return 'shield';
      default: return 'info';
    }
  };

  return (
    <View
      style={styles.insightsContainer}
      accessible={true}
      accessibilityRole="list"
      accessibilityLabel={accessibilityLabel || 'Pattern recognition insights'}
    >
      <Text style={styles.insightsTitle}>AI Pattern Recognition</Text>

      <View style={styles.insightsList}>
        {insights.map((insight, index) => (
          <View
            key={index}
            style={[
              styles.insightCard,
              { borderLeftColor: getInsightColor(insight.type) }
            ]}
            accessible={true}
            accessibilityRole="listitem"
            accessibilityLabel={`${insight.title}: ${insight.description}`}
          >
            <View style={styles.insightHeader}>
              <View style={[
                styles.insightIconContainer,
                { backgroundColor: `${getInsightColor(insight.type)}15` }
              ]}>
                <ClinicalIcon
                  type={getInsightIcon(insight.icon) as any}
                  size={20}
                  color={getInsightColor(insight.type)}
                  accessibilityLabel=""
                />
              </View>
              <Text style={styles.insightTitle}>{insight.title}</Text>
            </View>

            <Text style={styles.insightDescription}>
              {insight.description}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.aiDisclaimer}>
        <ClinicalIcon
          type="brain"
          size={14}
          color="#8B5CF6"
          accessibilityLabel=""
        />
        <Text style={styles.disclaimerText}>
          AI learns your patterns over time for personalized insights
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  insightsContainer: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A365D',
    marginBottom: 16,
    textAlign: 'center'
  },
  insightsList: {
    gap: 12,
    marginBottom: 16
  },
  insightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6
  },
  insightIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A365D',
    flex: 1
  },
  insightDescription: {
    fontSize: 12,
    color: '#4A5568',
    lineHeight: 16,
    marginLeft: 42
  },
  aiDisclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0'
  },
  disclaimerText: {
    fontSize: 10,
    color: '#8B5CF6',
    fontStyle: 'italic'
  }
});

PatternInsights.displayName = 'PatternInsights';

export { PatternInsights };