/**
 * EarlyWarningPane Component
 *
 * Displays pattern recognition and early warning system with timeline
 * visualization, mood tracking, and AI-powered intervention insights.
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Vibration
} from 'react-native';

import { ClinicalPaneProps, TimelineData } from '../types';
import { TimelineVisualization } from '../components/TimelineVisualization';
import { PatternInsights } from '../components/PatternInsights';
import { TriggerInsights } from '../components/TriggerInsights';
import { ClinicalIcon } from '../components/ClinicalIcon';

const EarlyWarningPane: React.FC<ClinicalPaneProps> = memo(({ data, isActive }) => {
  const timelineData = data.visual.data as TimelineData;

  const patternInsights = [
    {
      type: 'early-warning' as const,
      title: 'Early Warning Detection',
      description: 'Identifies concerning patterns 2-3 weeks before crisis episodes',
      icon: 'warning'
    },
    {
      type: 'personalized' as const,
      title: 'Personalized Triggers',
      description: 'Learns your unique warning signs: sleep, stress, social patterns',
      icon: 'brain'
    },
    {
      type: 'intervention' as const,
      title: 'Proactive Intervention',
      description: 'Suggests specific MBCT exercises when patterns indicate risk',
      icon: 'shield'
    }
  ];

  return (
    <View
      style={styles.paneContainer}
      accessible={true}
      accessibilityRole="tabpanel"
      accessibilityLabel={data.title}
      accessibilityState={{ selected: isActive }}
    >
      {/* Pane Header */}
      <View style={styles.paneHeader}>
        <ClinicalIcon
          type="patterns"
          size={32}
          color="#8B5CF6"
          accessibilityLabel="Pattern recognition icon"
        />
        <View style={styles.paneTitles}>
          <Text style={styles.paneTitle}>{data.title}</Text>
          <Text style={styles.paneSubtitle}>{data.subtitle}</Text>
        </View>
      </View>

      {/* Timeline Visualization */}
      <View style={styles.timelineSection}>
        <TimelineVisualization
          data={timelineData}
          title="Your Mental Health Timeline"
          subtitle="Last 30 Days"
          isActive={isActive}
        />
      </View>

      {/* Pattern Insights */}
      <View style={styles.insightsSection}>
        <PatternInsights
          insights={patternInsights}
          accessibilityLabel="AI-powered pattern recognition insights"
        />
      </View>

      {/* Trigger Analysis */}
      <View style={styles.triggerSection}>
        <TriggerInsights
          personalizedTriggers={[
            'Sleep pattern disruption',
            'Increased work stress',
            'Social isolation periods'
          ]}
          accessibilityLabel="Personalized trigger pattern analysis"
        />
      </View>

      {/* Call to Action */}
      {data.content.callToAction && (
        <Pressable
          onPressIn={() => {
            // THERAPEUTIC: Medium haptic feedback for therapeutic action buttons
            // Reinforces engagement with pattern insights
            Vibration.vibrate(150); // Medium feedback for therapeutic engagement
          }}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={data.content.callToAction.text}
          accessibilityHint="View detailed pattern analysis and recommendations"
          style={({ pressed }) => [
            styles.ctaButton,
            pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.ctaButtonText}>
            {data.content.callToAction.text}
          </Text>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  paneContainer: {
    flex: 1,
    padding: 25,
    backgroundColor: 'transparent'
  },
  paneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    gap: 15
  },
  paneTitles: {
    flex: 1
  },
  paneTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A365D',
    marginBottom: 5,
    lineHeight: 30
  },
  paneSubtitle: {
    fontSize: 16,
    color: '#4A5568',
    lineHeight: 22,
    fontWeight: '400'
  },
  timelineSection: {
    marginBottom: 25
  },
  insightsSection: {
    marginBottom: 20
  },
  triggerSection: {
    marginBottom: 20
  },
  ctaButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    // Minimum touch target for accessibility
    minHeight: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center'
  }
});

EarlyWarningPane.displayName = 'EarlyWarningPane';

export { EarlyWarningPane };