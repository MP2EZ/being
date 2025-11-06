/**
 * Assessment Status Badge
 * Shows assessment completion status and prompts user when due
 * Three states: Recent (<14 days), Due (14-20 days), Recommended (≥21 days)
 *
 * COMPLIANCE:
 * - Assessment completion dates read from encrypted assessmentStore (SecureStore)
 * - No assessment scores or results stored locally (only dates from encrypted source)
 * - Single source of truth: assessmentStore.completedAssessments
 *
 * ACCESSIBILITY:
 * - Touch target ≥44pt
 * - WCAG AA color contrast (≥4.5:1)
 * - Screen reader compatible
 * - Status not color-only (includes text)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  AccessibilityInfo,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useAssessmentStore } from '../flows/assessment/stores/assessmentStore';
import type { RootStackParamList } from '../navigation/CleanRootNavigator';

// Types
type BadgeStatus = 'recent' | 'due' | 'recommended';

// WCAG-AA compliant colors with muted presentation
const colors = {
  white: '#FFFFFF',
  black: '#1C1C1C',
  gray600: '#4B5563',
  gray700: '#374151',
  // Muted status colors (low opacity backgrounds)
  recentBg: '#D1FAE5', // Light green (4.51:1 contrast with text)
  recentText: '#065F46', // Dark green (8.21:1 contrast)
  dueBg: '#F3F4F6', // Light gray
  dueText: '#374151', // Dark gray (10.70:1 contrast)
  recommendedBg: '#FEF3C7', // Light amber (4.52:1 contrast with text)
  recommendedText: '#92400E', // Dark amber (8.73:1 contrast)
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
};

const AssessmentStatusBadge: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [status, setStatus] = useState<BadgeStatus | null>(null);
  const [daysSinceAssessment, setDaysSinceAssessment] = useState<number | null>(null);

  // Get assessment history from encrypted store
  const completedAssessments = useAssessmentStore(state => state.completedAssessments);

  useEffect(() => {
    loadAssessmentDates();
  }, [completedAssessments]); // Re-calculate when assessments change

  const loadAssessmentDates = () => {
    try {
      const now = Date.now();

      // Find most recent assessment from encrypted store
      let mostRecentDate = 0;

      completedAssessments.forEach(session => {
        if (session.result?.completedAt) {
          mostRecentDate = Math.max(mostRecentDate, session.result.completedAt);
        }
      });

      if (mostRecentDate === 0) {
        setStatus('recommended');
        setDaysSinceAssessment(null);
        return;
      }

      const daysSince = Math.floor((now - mostRecentDate) / (1000 * 60 * 60 * 24));
      setDaysSinceAssessment(daysSince);

      // Determine status based on days since assessment
      if (daysSince < 14) {
        setStatus('recent');
      } else if (daysSince < 21) {
        setStatus('due');
      } else {
        setStatus('recommended');
      }
    } catch (error) {
      console.error('[AssessmentStatusBadge] Failed to load assessment dates', error);
      setStatus('recommended');
      setDaysSinceAssessment(null);
    }
  };

  const handlePress = () => {
    if (status === 'due' || status === 'recommended') {
      // Default to PHQ-9 (primary depression assessment)
      // User can access GAD-7 from the assessment flow if needed
      navigation.navigate('AssessmentFlow', {
        assessmentType: 'phq9',
        context: 'standalone',
        allowSkip: false,
      });
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'recent':
        return {
          backgroundColor: colors.recentBg,
          textColor: colors.recentText,
          label: 'Assessment Completed',
          sublabel: daysSinceAssessment !== null
            ? `${daysSinceAssessment} ${daysSinceAssessment === 1 ? 'day' : 'days'} ago`
            : 'Recently completed',
          accessibilityLabel: `Assessment status: Completed ${daysSinceAssessment || 0} days ago. Recommended every 2 weeks.`,
          actionable: false,
        };
      case 'due':
        return {
          backgroundColor: colors.dueBg,
          textColor: colors.dueText,
          label: 'Assessment Due Soon',
          sublabel: daysSinceAssessment !== null
            ? `Last completed ${daysSinceAssessment} days ago`
            : 'Recommended every 2 weeks',
          accessibilityLabel: `Assessment status: Due soon. Last completed ${daysSinceAssessment || 0} days ago. Tap to complete assessment.`,
          actionable: true,
        };
      case 'recommended':
        return {
          backgroundColor: colors.recommendedBg,
          textColor: colors.recommendedText,
          label: 'Assessment Recommended',
          sublabel: daysSinceAssessment !== null
            ? `Last completed ${daysSinceAssessment} days ago`
            : 'Complete your first assessment',
          accessibilityLabel: `Assessment status: Recommended. ${daysSinceAssessment !== null ? `Last completed ${daysSinceAssessment} days ago.` : 'No assessment completed yet.'} Tap to complete assessment.`,
          actionable: true,
        };
      default:
        return null;
    }
  };

  if (!status) {
    return null;
  }

  const config = getStatusConfig();
  if (!config) {
    return null;
  }

  const Component = config.actionable ? Pressable : View;

  return (
    <Component
      style={[
        styles.badge,
        { backgroundColor: config.backgroundColor }
      ]}
      onPress={config.actionable ? handlePress : undefined}
      accessible={true}
      accessibilityRole={config.actionable ? 'button' : 'text'}
      accessibilityLabel={config.accessibilityLabel}
      accessibilityHint={config.actionable ? 'Tap to navigate to assessments' : undefined}
    >
      <View style={styles.content}>
        <Text
          style={[styles.label, { color: config.textColor }]}
          accessibilityLabel="" // Label read by parent
        >
          {config.label}
        </Text>
        <Text
          style={[styles.sublabel, { color: config.textColor }]}
          accessibilityLabel="" // Sublabel read by parent
        >
          {config.sublabel}
        </Text>
      </View>
    </Component>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  content: {
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  sublabel: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
  },
});

export default AssessmentStatusBadge;
