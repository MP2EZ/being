/**
 * ProgramBenefits Component
 *
 * Displays MBCT program benefits with statistics and outcomes.
 * Highlights key metrics for evidence-based effectiveness.
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet
} from 'react-native';

interface ProgramBenefit {
  stat: string;
  description: string;
}

interface ProgramBenefitsProps {
  benefits: ProgramBenefit[];
  accessibilityLabel?: string;
}

const ProgramBenefits: React.FC<ProgramBenefitsProps> = memo(({
  benefits,
  accessibilityLabel
}) => {
  return (
    <View
      style={styles.benefitsContainer}
      accessible={true}
      accessibilityRole="list"
      accessibilityLabel={accessibilityLabel || 'MBCT program benefits'}
    >
      <Text style={styles.benefitsTitle}>Evidence-Based Benefits</Text>

      <View style={styles.benefitsGrid}>
        {benefits.map((benefit, index) => (
          <View
            key={index}
            style={styles.benefitItem}
            accessible={true}
            accessibilityRole="listitem"
            accessibilityLabel={`${benefit.stat}: ${benefit.description}`}
          >
            <Text style={styles.benefitStat}>{benefit.stat}</Text>
            <Text style={styles.benefitDescription}>{benefit.description}</Text>
          </View>
        ))}
      </View>

      <View style={styles.clinicalNote}>
        <Text style={styles.noteText}>
          Results based on 8-week MBCT program completion with daily practice
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  benefitsContainer: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 16
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A365D',
    marginBottom: 12,
    textAlign: 'center'
  },
  benefitsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12
  },
  benefitItem: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8
  },
  benefitStat: {
    fontSize: 20,
    fontWeight: '700',
    color: '#16A085',
    marginBottom: 4
  },
  benefitDescription: {
    fontSize: 11,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 14,
    fontWeight: '400'
  },
  clinicalNote: {
    backgroundColor: '#EDF2F7',
    borderRadius: 8,
    padding: 12,
    marginTop: 8
  },
  noteText: {
    fontSize: 10,
    color: '#4A5568',
    textAlign: 'center',
    fontStyle: 'italic'
  }
});

ProgramBenefits.displayName = 'ProgramBenefits';

export { ProgramBenefits };