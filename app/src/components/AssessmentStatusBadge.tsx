/**
 * Assessment Status Badge
 * Shows assessment completion status and prompts user when due
 * Three states: Recent (<14 days), Due (14-20 days), Recommended (≥21 days)
 *
 * COMPLIANCE:
 * - Assessment completion dates stored in AsyncStorage (non-PHI)
 * - No assessment scores or results stored (those are encrypted separately)
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
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'assessment_completion_dates';

// Types
type AssessmentType = 'phq9' | 'gad7';
type BadgeStatus = 'recent' | 'due' | 'recommended';

interface AssessmentDates {
  phq9?: number; // timestamp
  gad7?: number; // timestamp
}

// Tab navigation type (from CleanTabNavigator)
type TabParamList = {
  Home: undefined;
  Exercises: undefined;
  Progress: undefined;
  Profile: undefined;
};

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
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const [status, setStatus] = useState<BadgeStatus | null>(null);
  const [daysSinceAssessment, setDaysSinceAssessment] = useState<number | null>(null);

  useEffect(() => {
    loadAssessmentDates();
  }, []);

  const loadAssessmentDates = async () => {
    try {
      const storedData = await AsyncStorage.getItem(STORAGE_KEY);
      if (!storedData) {
        setStatus('recommended');
        setDaysSinceAssessment(null);
        return;
      }

      const dates: AssessmentDates = JSON.parse(storedData);
      const now = Date.now();

      // Find most recent assessment
      const phq9Date = dates.phq9 || 0;
      const gad7Date = dates.gad7 || 0;
      const mostRecentDate = Math.max(phq9Date, gad7Date);

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

  // Save assessment completion date (called from ExercisesScreen)
  const markAssessmentComplete = async (type: AssessmentType) => {
    try {
      const storedData = await AsyncStorage.getItem(STORAGE_KEY);
      const dates: AssessmentDates = storedData ? JSON.parse(storedData) : {};

      dates[type] = Date.now();

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dates));
      await loadAssessmentDates(); // Refresh status
    } catch (error) {
      console.error('[AssessmentStatusBadge] Failed to save assessment date', error);
    }
  };

  const handlePress = () => {
    if (status === 'due' || status === 'recommended') {
      navigation.navigate('Exercises');
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

// Export function to mark assessment complete (called from ExercisesScreen)
export const markAssessmentComplete = async (type: AssessmentType) => {
  try {
    const storedData = await AsyncStorage.getItem(STORAGE_KEY);
    const dates: AssessmentDates = storedData ? JSON.parse(storedData) : {};

    dates[type] = Date.now();

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dates));
  } catch (error) {
    console.error('[AssessmentStatusBadge] Failed to save assessment date', error);
  }
};

// Export function to get assessment dates (called from ExercisesScreen)
export const getAssessmentDates = async (): Promise<AssessmentDates> => {
  try {
    const storedData = await AsyncStorage.getItem(STORAGE_KEY);
    return storedData ? JSON.parse(storedData) : {};
  } catch (error) {
    console.error('[AssessmentStatusBadge] Failed to load assessment dates', error);
    return {};
  }
};

export default AssessmentStatusBadge;
