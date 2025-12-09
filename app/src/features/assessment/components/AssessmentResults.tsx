/**
 * AssessmentResults Component - DRD-FLOW-005
 * 
 * CLINICAL SPECIFICATIONS:
 * - PHQ-9/GAD-7 score display with clinical accuracy
 * - Crisis intervention triggers (PHQ-9 ≥20, GAD-7 ≥15)
 * - Suicidal ideation detection (PHQ-9 Question 9 >0)
 * - Therapeutic language and guidance
 * - <200ms crisis response time (CRITICAL)
 * - Professional support resources and next steps
 * - Proper focus management and keyboard navigation
 * - Visible focus indicators meeting WCAG contrast requirements
 */


import { logSecurity, logPerformance, logError, LogCategory } from '@/core/services/logging';
import React, { useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Linking,
} from 'react-native';
import { colorSystem, spacing, typography, borderRadius } from '@/core/theme/colors';
import { CollapsibleCrisisButton } from '@/features/crisis/components/CollapsibleCrisisButton';
import { FocusProvider, Focusable, SkipLink } from '@/core/components/accessibility';
import type { PHQ9Result, GAD7Result, AssessmentType } from '../types';

interface AssessmentResultsProps {
  result: PHQ9Result | GAD7Result;
  onComplete: () => void;
  onRetake?: () => void;
  showCrisisIntervention?: boolean;
  theme?: 'morning' | 'midday' | 'evening' | 'neutral';
  context?: 'standalone' | 'onboarding' | 'checkin';
}

const AssessmentResults: React.FC<AssessmentResultsProps> = ({
  result,
  onComplete,
  onRetake,
  showCrisisIntervention = true,
  theme = 'neutral',
  context = 'standalone',
}) => {
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

  // Assessment type detection
  const assessmentType: AssessmentType = useMemo(() => {
    return 'suicidalIdeation' in result ? 'phq9' : 'gad7';
  }, [result]);

  // Crisis detection logic (CRITICAL - <200ms response)
  const crisisDetection = useMemo(() => {
    const startTime = performance.now();
    
    let isCrisis = false;
    let crisisType: string[] = [];
    
    if (assessmentType === 'phq9') {
      const phq9Result = result as PHQ9Result;
      if (phq9Result.totalScore >= 20) {
        isCrisis = true;
        crisisType.push('severe_depression');
      }
      if (phq9Result.suicidalIdeation) {
        isCrisis = true;
        crisisType.push('suicidal_ideation');
      }
    } else if (assessmentType === 'gad7') {
      const gad7Result = result as GAD7Result;
      if (gad7Result.totalScore >= 15) {
        isCrisis = true;
        crisisType.push('severe_anxiety');
      }
    }
    
    const responseTime = performance.now() - startTime;
    if (responseTime > 50) {
      logSecurity('Crisis detection time exceeded', 'high', {
        responseTime,
        threshold: 50
      });
    }
    
    return { isCrisis, crisisType, responseTime };
  }, [result, assessmentType]);

  // Score interpretation and guidance
  const scoreInterpretation = useMemo(() => {
    if (assessmentType === 'phq9') {
      const phq9Result = result as PHQ9Result;
      switch (phq9Result.severity) {
        case 'minimal':
          return {
            title: 'Minimal Depression',
            description: 'Your responses suggest minimal depressive symptoms. This is a positive sign for your mental well-being.',
            guidance: 'Continue with mindfulness practices and self-care routines. Regular check-ins can help maintain your wellness.',
            color: colorSystem.status.success,
            backgroundColor: colorSystem.status.successBackground,
          };
        case 'mild':
          return {
            title: 'Mild Depression',
            description: 'Your responses indicate mild depressive symptoms that may benefit from attention and care.',
            guidance: 'Consider incorporating more mindfulness practices, gentle exercise, and connecting with supportive people. Monitor your mood patterns.',
            color: colorSystem.status.warning,
            backgroundColor: colorSystem.status.warningBackground,
          };
        case 'moderate':
          return {
            title: 'Moderate Depression',
            description: 'Your responses suggest moderate depressive symptoms that warrant professional support.',
            guidance: 'We recommend speaking with a mental health professional. In the meantime, practice self-compassion and maintain supportive connections.',
            color: colorSystem.status.warning,
            backgroundColor: colorSystem.status.warningBackground,
          };
        case 'moderately_severe':
        case 'severe':
          return {
            title: 'Significant Depression',
            description: 'Your responses indicate significant depressive symptoms that require professional attention.',
            guidance: 'Please reach out to a mental health professional soon. You deserve support, and effective treatments are available.',
            color: colorSystem.status.critical,
            backgroundColor: colorSystem.status.criticalBackground,
          };
        default:
          return {
            title: 'Assessment Complete',
            description: 'Your assessment has been completed.',
            guidance: 'Thank you for taking the time to reflect on your well-being.',
            color: colorSystem.accessibility.text.primary,
            backgroundColor: colorSystem.gray[50],
          };
      }
    } else {
      const gad7Result = result as GAD7Result;
      switch (gad7Result.severity) {
        case 'minimal':
          return {
            title: 'Minimal Anxiety',
            description: 'Your responses suggest minimal anxiety symptoms. Your relationship with worry appears manageable.',
            guidance: 'Continue with mindfulness practices and notice when anxiety arises with curiosity rather than judgment.',
            color: colorSystem.status.success,
            backgroundColor: colorSystem.status.successBackground,
          };
        case 'mild':
          return {
            title: 'Mild Anxiety',
            description: 'Your responses indicate mild anxiety symptoms that you might explore with gentle awareness.',
            guidance: 'Practice breathing exercises and mindful observation of anxious thoughts. Notice patterns without judgment.',
            color: colorSystem.status.warning,
            backgroundColor: colorSystem.status.warningBackground,
          };
        case 'moderate':
          return {
            title: 'Moderate Anxiety',
            description: 'Your responses suggest moderate anxiety that may benefit from professional guidance.',
            guidance: 'Consider speaking with a counselor who can help you develop effective coping strategies. You\'re not alone in this.',
            color: colorSystem.status.warning,
            backgroundColor: colorSystem.status.warningBackground,
          };
        case 'severe':
          return {
            title: 'Significant Anxiety',
            description: 'Your responses indicate significant anxiety that warrants professional support.',
            guidance: 'Please consider reaching out to a mental health professional. Effective treatments can help you find relief.',
            color: colorSystem.status.critical,
            backgroundColor: colorSystem.status.criticalBackground,
          };
        default:
          return {
            title: 'Assessment Complete',
            description: 'Your assessment has been completed.',
            guidance: 'Thank you for taking the time to reflect on your well-being.',
            color: colorSystem.accessibility.text.primary,
            backgroundColor: colorSystem.gray[50],
          };
      }
    }
  }, [result, assessmentType]);

  // Crisis intervention effect (CRITICAL - immediate response)
  useEffect(() => {
    if (crisisDetection.isCrisis && showCrisisIntervention) {
      const startTime = performance.now();
      
      // Immediate crisis alert
      setTimeout(() => {
        Alert.alert(
          '🚨 Immediate Support Available',
          'Your responses indicate you may benefit from immediate support. Crisis resources are available 24/7.',
          [
            { 
              text: 'Call 988 Now', 
              onPress: () => Linking.openURL('tel:988'),
              style: 'default'
            },
            { 
              text: 'View Resources', 
              onPress: () => {},
              style: 'cancel'
            }
          ],
          { cancelable: false }
        );
        
        const alertTime = performance.now() - startTime;
        if (alertTime > 200) {
          logSecurity('Crisis alert time exceeded', 'high', {
            alertTime,
            threshold: 200
          });
        }
      }, 100); // Small delay for UI rendering
    }
  }, [crisisDetection.isCrisis, showCrisisIntervention]);

  // Handle completion
  const handleComplete = useCallback(() => {
    const startTime = performance.now();
    onComplete();
    
    const responseTime = performance.now() - startTime;
    if (responseTime > 100) {
      logSecurity('Results completion time exceeded', 'medium', {
        responseTime,
        threshold: 100
      });
    }
  }, [onComplete]);

  return (
    <FocusProvider
      announceChanges={true}
      restoreFocus={true}
    >
      <ScrollView 
        style={[styles.container, { backgroundColor: themeColors.background }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Skip link to main action */}
        <SkipLink 
          targetId="assessment-complete-button"
          text="Skip to continue"
          position="top-left"
        />

        {/* Crisis Banner (if applicable) */}
        {crisisDetection.isCrisis && (
          <Focusable
            id="crisis-banner"
            priority={5}
          >
            <View 
              style={styles.crisisBanner}
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              <Text
                style={styles.crisisBannerText}
                accessibilityRole="text"
              >
                🚨 Immediate support is available. You don't have to face this alone. Use the crisis button below for immediate help.
              </Text>
            </View>
          </Focusable>
        )}

        {/* Score Display */}
        <Focusable
          id="assessment-score"
          priority={10}
        >
          <View style={[styles.scoreContainer, { 
            backgroundColor: scoreInterpretation.backgroundColor,
            borderColor: scoreInterpretation.color,
          }]}>
            <View style={styles.scoreHeader}>
              <Text 
                style={styles.assessmentTitle}
                accessibilityRole="header"
              >
                {assessmentType === 'phq9' ? 'PHQ-9 Depression Assessment' : 'GAD-7 Anxiety Assessment'}
              </Text>
              <View style={[styles.scoreBadge, { backgroundColor: scoreInterpretation.color }]}>
                <Text 
                  style={styles.scoreBadgeText}
                  accessibilityLabel={`Score: ${result.totalScore} out of ${assessmentType === 'phq9' ? '27' : '21'}`}
                >
                  {result.totalScore}/{assessmentType === 'phq9' ? '27' : '21'}
                </Text>
              </View>
            </View>
            
            <Text 
              style={[styles.severityTitle, { color: scoreInterpretation.color }]}
              accessibilityRole="header"
            >
              {scoreInterpretation.title}
            </Text>
            
            <Text 
              style={styles.severityDescription}
              accessibilityRole="text"
            >
              {scoreInterpretation.description}
            </Text>
          </View>
        </Focusable>

        {/* Therapeutic Guidance */}
        <Focusable
          id="therapeutic-guidance"
          priority={20}
        >
          <View style={styles.guidanceContainer}>
            <Text 
              style={styles.guidanceTitle}
              accessibilityRole="header"
            >
              Mindful Reflection & Next Steps
            </Text>
            <Text 
              style={styles.guidanceText}
              accessibilityRole="text"
            >
              {scoreInterpretation.guidance}
            </Text>
            
            {/* evidence-based guidance */}
            <View style={[styles.therapeuticContainer, { 
              backgroundColor: themeColors.light,
              borderLeftColor: themeColors.primary,
            }]}>
              <Text 
                style={styles.therapeuticTitle}
                accessibilityRole="header"
              >
                Mindful Approach
              </Text>
              <Text 
                style={styles.therapeuticText}
                accessibilityRole="text"
              >
                Remember that these results are a snapshot of your current experience. 
                Feelings and thoughts change—practice observing them with kindness and patience. 
                Each moment offers a new opportunity for awareness and growth.
              </Text>
            </View>
          </View>
        </Focusable>

        {/* Professional Resources */}
        {(result.severity === 'moderate' || result.severity === 'moderately_severe' || 
          result.severity === 'severe') && (
          <Focusable
            id="professional-resources"
            priority={30}
          >
            <View 
              style={styles.resourcesContainer}
              
              accessibilityLabel="Professional support resources"
            >
              <Text 
                style={styles.resourcesTitle}
                accessibilityRole="header"
              >
                Professional Support
              </Text>
              <View style={styles.resourcesList}>
                <Text style={styles.resourceItem}>
                  • Speak with your primary care doctor
                </Text>
                <Text style={styles.resourceItem}>
                  • Contact a mental health professional
                </Text>
                <Text style={styles.resourceItem}>
                  • Call 988 for crisis support (24/7)
                </Text>
                <Text style={styles.resourceItem}>
                  • Text HOME to 741741 for crisis text line
                </Text>
              </View>
            </View>
          </Focusable>
        )}

        {/* Results Summary */}
        <Focusable
          id="assessment-summary"
          priority={40}
        >
          <View 
            style={styles.summaryContainer}
            
            accessibilityLabel="Assessment summary"
          >
            <Text 
              style={styles.summaryTitle}
              accessibilityRole="header"
            >
              Assessment Summary
            </Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Score</Text>
                <Text style={styles.summaryValue}>
                  {result.totalScore}/{assessmentType === 'phq9' ? '27' : '21'}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Severity</Text>
                <Text style={styles.summaryValue}>
                  {result.severity.replace('_', ' ')}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Questions</Text>
                <Text style={styles.summaryValue}>
                  {result.answers.length}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Date</Text>
                <Text style={styles.summaryValue}>
                  {new Date(result.completedAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>
        </Focusable>

        {/* Action buttons */}
        <View style={styles.actionContainer}>
          <Focusable
            id="assessment-complete-button"
            priority={50}
          >
            <Pressable
              style={({ pressed }) => [
                styles.completeButton,
                { backgroundColor: themeColors.primary },
                pressed && styles.completeButtonPressed,
              ]}
              onPress={handleComplete}
              accessibilityRole="button"
              accessibilityLabel="Continue with results"
              testID="assessment-complete-button"
            >
              <Text style={styles.completeButtonText}>
                {context === 'onboarding' ? 'Continue Setup' : 'Continue'}
              </Text>
            </Pressable>
          </Focusable>

          {onRetake && (
            <Focusable
              id="assessment-retake-button"
              priority={60}
            >
              <Pressable
                style={styles.retakeButton}
                onPress={onRetake}
                accessibilityRole="button"
                accessibilityLabel="Retake assessment"
                testID="assessment-retake-button"
              >
                <Text style={styles.retakeButtonText}>
                  Retake Assessment
                </Text>
              </Pressable>
            </Focusable>
          )}
        </View>
      </ScrollView>

      {/* Collapsible Crisis Button - Fixed overlay, always accessible */}
      <CollapsibleCrisisButton />
    </FocusProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  crisisBanner: {
    backgroundColor: colorSystem.status.critical,
    padding: spacing.md,
    borderRadius: borderRadius.large,
    marginBottom: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  crisisBannerText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
    textAlign: 'center',
  },
  scoreContainer: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    marginBottom: spacing.lg,
  },
  scoreHeader: {
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
  scoreBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: typography.title.size,
  },
  scoreBadgeText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.white,
  },
  severityTitle: {
    fontSize: typography.headline2.size,
    fontWeight: typography.headline2.weight,
    marginBottom: spacing.sm,
  },
  severityDescription: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.bodyLarge.weight,
    color: colorSystem.accessibility.text.primary,
    lineHeight: typography.bodyLarge.size * 1.5,
  },
  guidanceContainer: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  guidanceTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.accessibility.text.primary,
  },
  guidanceText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.bodyRegular.weight,
    color: colorSystem.accessibility.text.primary,
    lineHeight: typography.bodyRegular.size * 1.5,
  },
  therapeuticContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.large,
    borderLeftWidth: 4,
  },
  therapeuticTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.sm,
  },
  therapeuticText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.bodyRegular.weight,
    color: colorSystem.accessibility.text.primary,
    lineHeight: typography.bodyRegular.size * 1.5,
    fontStyle: 'italic',
  },
  resourcesContainer: {
    backgroundColor: colorSystem.status.infoBackground,
    padding: spacing.md,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: colorSystem.status.info,
    marginBottom: spacing.lg,
  },
  resourcesTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.status.info,
    marginBottom: spacing.sm,
  },
  resourcesList: {
    gap: spacing.xs,
  },
  resourceItem: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.bodyRegular.weight,
    color: colorSystem.accessibility.text.primary,
    lineHeight: typography.bodyRegular.size * 1.4,
  },
  summaryContainer: {
    backgroundColor: colorSystem.gray[50],
    padding: spacing.md,
    borderRadius: borderRadius.large,
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryLabel: {
    fontSize: typography.caption.size,
    fontWeight: typography.caption.weight,
    color: colorSystem.accessibility.text.secondary,
  },
  summaryValue: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.accessibility.text.primary,
    textTransform: 'capitalize',
  },
  actionContainer: {
    gap: spacing.md,
  },
  completeButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: borderRadius.small,
    elevation: 4,
  },
  completeButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  completeButtonText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
  retakeButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  retakeButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.bodyRegular.weight,
    color: colorSystem.accessibility.text.secondary,
    textDecorationLine: 'underline',
  },
});

export default AssessmentResults;