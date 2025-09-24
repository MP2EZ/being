/**
 * MBCTPracticesPane Component
 *
 * Displays evidence-based MBCT outcomes with relapse reduction chart,
 * program benefits, and breathing exercise visualization.
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Vibration
} from 'react-native';

import { ClinicalPaneProps, ChartData } from '../types';
import { EvidenceChart } from '../components/EvidenceChart';
import { BreathingExerciseVisual } from '../components/BreathingExerciseVisual';
import { ProgramBenefits } from '../components/ProgramBenefits';
import { ClinicalIcon } from '../components/ClinicalIcon';

const MBCTPracticesPane: React.FC<ClinicalPaneProps> = memo(({ data, isActive }) => {
  const chartData = data.visual.data as ChartData;

  const programBenefits = [
    {
      stat: '8 weeks',
      description: 'Average time to notice mood improvements'
    },
    {
      stat: '73%',
      description: 'Report improved emotional regulation'
    },
    {
      stat: '2.3x',
      description: 'Better treatment engagement compared to therapy alone'
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
          type="outcomes"
          size={32}
          color="#16A085"
          accessibilityLabel="Evidence-based outcomes icon"
        />
        <View style={styles.paneTitles}>
          <Text style={styles.paneTitle}>{data.title}</Text>
          <Text style={styles.paneSubtitle}>{data.subtitle}</Text>
        </View>
      </View>

      {/* Evidence Chart Section */}
      <View style={styles.outcomeSection}>
        <EvidenceChart
          data={chartData}
          title="Relapse Reduction in MBCT Users"
          subtitle="Source: Meta-analysis of 8 randomized controlled trials (N=1,456)"
        />
      </View>

      {/* Breathing Exercise Visual */}
      <View style={styles.breathingSection}>
        <BreathingExerciseVisual
          isActive={isActive}
          accessibilityLabel="3-minute breathing exercise demonstration"
        />
      </View>

      {/* Program Benefits */}
      <View style={styles.benefitsSection}>
        <ProgramBenefits
          benefits={programBenefits}
          accessibilityLabel="MBCT program benefits and statistics"
        />
      </View>

      {/* Call to Action */}
      {data.content.callToAction && (
        <Pressable
          onPressIn={() => {
            // MBCT: Medium haptic feedback for mindfulness program engagement
            // Provides grounding tactile feedback for therapeutic commitment
            Vibration.vibrate(150); // Medium feedback for MBCT program engagement
          }}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={data.content.callToAction.text}
          accessibilityHint="Begin the 8-week MBCT program"
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
  outcomeSection: {
    marginBottom: 25
  },
  breathingSection: {
    marginBottom: 20,
    alignItems: 'center'
  },
  benefitsSection: {
    marginBottom: 20
  },
  ctaButton: {
    backgroundColor: '#16A085',
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

MBCTPracticesPane.displayName = 'MBCTPracticesPane';

export { MBCTPracticesPane };