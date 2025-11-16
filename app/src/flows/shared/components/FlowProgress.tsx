/**
 * Flow Progress Component
 * DRD-compliant progress indicator for check-in flows
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getTheme, spacing, typography, colorSystem } from '@/core/theme/colors';

interface FlowProgressProps {
  currentStep: number;
  totalSteps: number;
  flowType: 'morning' | 'midday' | 'evening';
  stepTitles?: string[];
}

const FlowProgress: React.FC<FlowProgressProps> = ({
  currentStep,
  totalSteps,
  flowType,
  stepTitles = [],
}) => {
  const themeColors = getTheme(flowType);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Progress</Text>
        <Text style={styles.stepCounter}>
          {currentStep} of {totalSteps}
        </Text>
      </View>
      
      <View style={styles.progressContainer}>
        <Text style={styles.placeholder}>
          Flow progress indicator will be implemented here
        </Text>
        <Text style={styles.description}>
          - Step progress bar{'\n'}
          - Current step highlighting{'\n'}
          - Flow type theming{'\n'}
          - Step title display{'\n'}
          - Completion percentage
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colorSystem.base.white,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.base.black,
  },
  stepCounter: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    fontWeight: '500',
  },
  progressContainer: {
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '500',
    color: colorSystem.gray[600],
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[500],
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default FlowProgress;