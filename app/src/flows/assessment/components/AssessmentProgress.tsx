/**
 * AssessmentProgress Component - DRD-FLOW-005
 * 
 * CLINICAL SPECIFICATIONS:
 * - Visual progress tracking for therapeutic continuity
 * - Theme-aware progress styling (morning/midday/evening)
 * - Accessibility compliant progress indication
 * - Performance optimized animations
 * - Crisis detection visual feedback
 */

import React, { useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import { colorSystem, spacing, typography } from '@/core/theme/colors';
import type { AssessmentProgress as AssessmentProgressType } from '../types';

interface AssessmentProgressProps {
  progress: AssessmentProgressType;
  theme?: 'morning' | 'midday' | 'evening' | 'neutral';
  showEstimatedTime?: boolean;
  showQuestionCounter?: boolean;
  animated?: boolean;
}

const AssessmentProgress: React.FC<AssessmentProgressProps> = ({
  progress,
  theme = 'neutral',
  showEstimatedTime = true,
  showQuestionCounter = true,
  animated = true,
}) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Theme-based styling
  const themeColors = useMemo(() => {
    // Default neutral theme
    const neutralTheme = {
      primary: colorSystem.base.midnightBlue,
      light: colorSystem.gray[200],
      background: colorSystem.base.white,
    };

    if (theme === 'neutral') {
      return neutralTheme;
    }

    // Safely access theme with proper fallback
    const selectedTheme = colorSystem.themes[theme as keyof typeof colorSystem.themes];
    return selectedTheme || neutralTheme;
  }, [theme]);

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    if (progress.totalQuestions === 0) return 0;
    return Math.min((progress.currentQuestionIndex / progress.totalQuestions) * 100, 100);
  }, [progress.currentQuestionIndex, progress.totalQuestions]);

  // Estimated time remaining (based on 30 seconds per question)
  const estimatedTimeRemaining = useMemo(() => {
    const remainingQuestions = progress.totalQuestions - progress.currentQuestionIndex;
    const estimatedMinutes = Math.ceil((remainingQuestions * 30) / 60); // 30 seconds per question
    
    if (estimatedMinutes <= 0) return 'Almost done';
    if (estimatedMinutes === 1) return '1 minute left';
    return `${estimatedMinutes} minutes left`;
  }, [progress.currentQuestionIndex, progress.totalQuestions]);

  // Assessment type display name
  const assessmentDisplayName = useMemo(() => {
    switch (progress.type) {
      case 'phq9':
        return 'Depression Assessment (PHQ-9)';
      case 'gad7':
        return 'Anxiety Assessment (GAD-7)';
      default:
        return 'Assessment';
    }
  }, [progress.type]);

  // Animate progress changes
  useEffect(() => {
    if (animated) {
      Animated.parallel([
        Animated.timing(progressAnim, {
          toValue: progressPercentage,
          duration: 600,
          useNativeDriver: false,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Announce progress to screen readers
      if (progress.currentQuestionIndex > 0) {
        AccessibilityInfo.announceForAccessibility(
          `Progress: ${Math.round(progressPercentage)}% complete. ${estimatedTimeRemaining}.`
        );
      }
    } else {
      progressAnim.setValue(progressPercentage);
      fadeAnim.setValue(1);
    }
  }, [progressPercentage, animated, estimatedTimeRemaining, progress.currentQuestionIndex]);

  return (
    <Animated.View 
      style={[
        styles.container,
        { opacity: fadeAnim }
      ]}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(progressPercentage),
      }}
      accessibilityLabel={`Assessment progress: ${Math.round(progressPercentage)} percent complete`}
    >
      {/* Assessment title */}
      <View style={styles.headerContainer}>
        <Text style={styles.assessmentTitle}>
          {assessmentDisplayName}
        </Text>
        {showEstimatedTime && (
          <Text style={styles.timeEstimate}>
            {estimatedTimeRemaining}
          </Text>
        )}
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarTrack, { backgroundColor: themeColors.light }]}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: themeColors.primary,
                width: animated 
                  ? progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                      extrapolate: 'clamp',
                    })
                  : `${progressPercentage}%`,
              },
            ]}
          />
        </View>
        
        {/* Progress percentage text */}
        <Text style={styles.progressPercentage}>
          {Math.round(progressPercentage)}%
        </Text>
      </View>

      {/* Question counter */}
      {showQuestionCounter && (
        <View style={styles.counterContainer}>
          <Text style={styles.counterText}>
            Question {progress.currentQuestionIndex} of {progress.totalQuestions}
          </Text>
          {progress.answers.length > 0 && (
            <Text style={styles.answeredText}>
              {progress.answers.length} answered
            </Text>
          )}
        </View>
      )}

      {/* Completion indicator */}
      {progress.isComplete && (
        <View style={[styles.completionBadge, { backgroundColor: themeColors.primary }]}>
          <Text style={styles.completionText}>✓ Complete</Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colorSystem.base.white,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  assessmentTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.accessibility.text.primary,
    flex: 1,
  },
  timeEstimate: {
    fontSize: typography.caption.size,
    fontWeight: typography.caption.weight,
    color: colorSystem.accessibility.text.secondary,
    textAlign: 'right',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  progressBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    minWidth: 8, // Minimum visible progress
  },
  progressPercentage: {
    fontSize: typography.caption.size,
    fontWeight: '600',
    color: colorSystem.accessibility.text.secondary,
    minWidth: 35,
    textAlign: 'right',
  },
  counterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counterText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.bodyRegular.weight,
    color: colorSystem.accessibility.text.primary,
  },
  answeredText: {
    fontSize: typography.caption.size,
    fontWeight: typography.caption.weight,
    color: colorSystem.status.success,
  },
  completionBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  completionText: {
    fontSize: typography.micro.size,
    fontWeight: typography.micro.weight,
    color: colorSystem.base.white,
  },
});

export default AssessmentProgress;