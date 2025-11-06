/**
 * AssessmentIntroduction Component - DRD-FLOW-005
 * 
 * CLINICAL SPECIFICATIONS:
 * - MBCT therapeutic guidance and mindful awareness
 * - PHQ-9/GAD-7 clinical context and purpose explanation
 * - Therapeutic language for anxiety reduction
 * - Crisis support integration and safety messaging
 * - Accessibility compliant therapeutic content
 * - Proper focus management and keyboard navigation
 * - Visible focus indicators meeting WCAG contrast requirements
 */


import { logSecurity, logPerformance, logError, LogCategory } from '../../../services/logging';
import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { colorSystem, spacing, typography } from '../../../constants/colors';
import { CollapsibleCrisisButton } from '../../shared/components/CollapsibleCrisisButton';
import { FocusProvider, Focusable, SkipLink } from '../../../components/accessibility';
import type { AssessmentType } from '../types';

interface AssessmentIntroductionProps {
  assessmentType: AssessmentType;
  onBegin: () => void;
  onSkip?: () => void;
  theme?: 'morning' | 'midday' | 'evening' | 'neutral';
  context?: 'standalone' | 'onboarding' | 'checkin';
  showSkipOption?: boolean;
}

const AssessmentIntroduction: React.FC<AssessmentIntroductionProps> = ({
  assessmentType,
  onBegin,
  onSkip,
  theme = 'neutral',
  context = 'standalone',
  showSkipOption = false,
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

  // Assessment-specific content
  const assessmentContent = useMemo(() => {
    switch (assessmentType) {
      case 'phq9':
        return {
          title: 'Depression Assessment (PHQ-9)',
          subtitle: 'Understanding Your Mood Patterns',
          description: 'This assessment helps you observe your mood patterns with kindness and awareness, in the spirit of mindfulness-based cognitive therapy.',
          purpose: 'The PHQ-9 is a clinically validated tool that gently guides you to notice patterns in your thoughts and feelings over the past two weeks.',
          mindfulnessNote: 'As you respond, practice observing your experiences without judgment—simply noticing what has been present for you.',
          timeEstimate: '3-5 minutes',
          questionCount: 9,
        };
      case 'gad7':
        return {
          title: 'Anxiety Assessment (GAD-7)',
          subtitle: 'Observing Worry and Anxiety',
          description: 'This assessment invites you to mindfully observe your relationship with worry and anxiety over the past two weeks.',
          purpose: 'The GAD-7 helps you notice patterns of anxiety with gentle awareness, supporting your journey toward greater understanding.',
          mindfulnessNote: 'As you reflect on each question, breathe deeply and observe your responses with compassion and curiosity.',
          timeEstimate: '2-4 minutes',
          questionCount: 7,
        };
      default:
        return {
          title: 'Assessment',
          subtitle: 'Mindful Self-Reflection',
          description: 'This assessment supports your mindful awareness of your current experiences.',
          purpose: 'Take a moment to reflect on your recent experiences with openness and self-compassion.',
          mindfulnessNote: 'Practice gentle observation as you respond to each question.',
          timeEstimate: '3-5 minutes',
          questionCount: 0,
        };
    }
  }, [assessmentType]);

  // Context-specific messaging
  const contextMessage = useMemo(() => {
    switch (context) {
      case 'onboarding':
        return 'This assessment helps us understand how to best support your wellness journey.';
      case 'checkin':
        return 'This brief check-in helps track your progress and well-being over time.';
      default:
        return 'This assessment provides insights into your current well-being.';
    }
  }, [context]);

  const handleBegin = useCallback(() => {
    const startTime = performance.now();
    onBegin();
    
    // Performance monitoring for therapeutic flow
    const responseTime = performance.now() - startTime;
    if (responseTime > 100) {
      logSecurity('Assessment begin response time exceeded', 'medium', {
        responseTime,
        threshold: 100
      });
    }
  }, [onBegin]);

  return (
    <FocusProvider
      announceChanges={true}
      restoreFocus={true}
    >
      {/* Close/Exit Button - Top left */}
      {onSkip && (
        <Pressable
          style={styles.closeButton}
          onPress={onSkip}
          accessibilityRole="button"
          accessibilityLabel="Close assessment"
          accessibilityHint="Exit this assessment"
          testID="assessment-close-button"
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>
      )}

      <ScrollView
        style={[styles.container, { backgroundColor: themeColors.background }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Skip link to main action */}
        <SkipLink
          targetId="assessment-begin-button"
          text="Skip to begin assessment"
          position="top-left"
        />

        {/* Header */}
        <Focusable
          id="assessment-header"
          priority={10}
        >
          <View style={styles.headerContainer}>
            <Text 
              style={styles.title}
              accessibilityRole="header"
              accessibilityLevel={1}
            >
              {assessmentContent.title}
            </Text>
            <Text 
              style={styles.subtitle}
              accessibilityRole="text"
            >
              {assessmentContent.subtitle}
            </Text>
          </View>
        </Focusable>

        {/* Main content */}
        <View style={styles.contentContainer}>
          {/* Description */}
          <Focusable
            id="assessment-description"
            priority={20}
          >
            <View style={styles.sectionContainer}>
              <Text 
                style={styles.description}
                accessibilityRole="text"
              >
                {assessmentContent.description}
              </Text>
              <Text 
                style={styles.contextMessage}
                accessibilityRole="text"
              >
                {contextMessage}
              </Text>
            </View>
          </Focusable>

          {/* MBCT Mindfulness guidance */}
          <Focusable
            id="assessment-mindfulness"
            priority={30}
          >
            <View style={[styles.mindfulnessContainer, { 
              backgroundColor: themeColors.light,
              borderLeftColor: themeColors.primary,
            }]}>
              <Text 
                style={styles.mindfulnessTitle}
                accessibilityRole="header"
                accessibilityLevel={3}
              >
                Mindful Approach
              </Text>
              <Text 
                style={styles.mindfulnessText}
                accessibilityRole="text"
              >
                {assessmentContent.mindfulnessNote}
              </Text>
              <Text 
                style={styles.breathingReminder}
                accessibilityRole="text"
                accessibilityHint="Take a moment to center yourself before beginning"
              >
                Take three deep breaths before you begin. Remember, there are no right or wrong answers—only your honest experience.
              </Text>
            </View>
          </Focusable>

          {/* Assessment details */}
          <Focusable
            id="assessment-details"
            priority={40}
          >
            <View 
              style={styles.detailsContainer}
              accessibilityRole="group"
              accessibilityLabel="Assessment details"
            >
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Questions:</Text>
                <Text style={styles.detailValue}>{assessmentContent.questionCount}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Time:</Text>
                <Text style={styles.detailValue}>{assessmentContent.timeEstimate}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Purpose:</Text>
                <Text style={[styles.detailValue, styles.purposeText]}>
                  {assessmentContent.purpose}
                </Text>
              </View>
            </View>
          </Focusable>

          {/* Privacy and safety note */}
          <Focusable
            id="assessment-privacy"
            priority={50}
          >
            <View 
              style={styles.privacyContainer}
              accessibilityRole="group"
              accessibilityLabel="Privacy and safety information"
            >
              <Text 
                style={styles.privacyTitle}
                accessibilityRole="header"
                accessibilityLevel={3}
              >
                Your Privacy & Safety
              </Text>
              <Text 
                style={styles.privacyText}
                accessibilityRole="text"
              >
                • Your responses are confidentially stored and encrypted
                {'\n'}• This assessment may help identify when you need additional support
                {'\n'}• You can access crisis support at any time using the crisis button
                {'\n'}• You can pause or stop the assessment at any point
              </Text>
            </View>
          </Focusable>
        </View>

        {/* Action buttons */}
        <View style={styles.actionContainer}>
          {/* Begin button */}
          <Focusable
            id="assessment-begin-button"
            priority={60}
          >
            <Pressable
              style={({ pressed }) => [
                styles.beginButton,
                { backgroundColor: themeColors.primary },
                pressed && styles.beginButtonPressed,
              ]}
              onPress={handleBegin}
              accessibilityRole="button"
              accessibilityLabel={`Begin ${assessmentContent.title}`}
              accessibilityHint={`Start the ${assessmentContent.questionCount} question assessment`}
              testID="assessment-begin-button"
            >
              <Text style={styles.beginButtonText}>
                Begin Assessment
              </Text>
            </Pressable>
          </Focusable>

          {/* Skip option (if enabled) */}
          {showSkipOption && onSkip && (
            <Focusable
              id="assessment-skip-button"
              priority={70}
            >
              <Pressable
                style={styles.skipButton}
                onPress={onSkip}
                accessibilityRole="button"
                accessibilityLabel="Skip this assessment"
                accessibilityHint="Continue without completing this assessment"
                testID="assessment-skip-button"
              >
                <Text style={styles.skipButtonText}>
                  Skip for Now
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
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    zIndex: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: '400',
    color: colorSystem.base.black,
  },
  scrollContent: {
    padding: spacing.md,
    paddingTop: spacing.xl + spacing.lg, // Extra space for close button (60px)
    paddingBottom: spacing.xl,
  },
  headerContainer: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: typography.headline1.size,
    fontWeight: typography.headline1.weight,
    color: colorSystem.accessibility.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.accessibility.text.secondary,
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    gap: spacing.lg,
  },
  sectionContainer: {
    gap: spacing.md,
  },
  description: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.bodyLarge.weight,
    color: colorSystem.accessibility.text.primary,
    lineHeight: typography.bodyLarge.size * 1.5,
    textAlign: 'center',
  },
  contextMessage: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.bodyRegular.weight,
    color: colorSystem.accessibility.text.secondary,
    lineHeight: typography.bodyRegular.size * 1.5,
    textAlign: 'center',
  },
  mindfulnessContainer: {
    padding: spacing.md,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  mindfulnessTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.sm,
  },
  mindfulnessText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.bodyRegular.weight,
    color: colorSystem.accessibility.text.primary,
    lineHeight: typography.bodyRegular.size * 1.5,
    marginBottom: spacing.sm,
  },
  breathingReminder: {
    fontSize: typography.caption.size,
    fontWeight: typography.caption.weight,
    color: colorSystem.accessibility.text.secondary,
    fontStyle: 'italic',
    lineHeight: typography.caption.size * 1.4,
  },
  detailsContainer: {
    backgroundColor: colorSystem.gray[50],
    padding: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    color: colorSystem.accessibility.text.secondary,
    flex: 0.3,
  },
  detailValue: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.bodyRegular.weight,
    color: colorSystem.accessibility.text.primary,
    flex: 0.7,
  },
  purposeText: {
    lineHeight: typography.bodyRegular.size * 1.4,
  },
  privacyContainer: {
    backgroundColor: colorSystem.status.infoBackground,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colorSystem.status.info,
  },
  privacyTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    color: colorSystem.status.info,
    marginBottom: spacing.sm,
  },
  privacyText: {
    fontSize: typography.caption.size,
    fontWeight: typography.caption.weight,
    color: colorSystem.accessibility.text.primary,
    lineHeight: typography.caption.size * 1.5,
  },
  actionContainer: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  beginButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48, // WCAG touch target
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  beginButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  beginButtonText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    color: colorSystem.base.white,
  },
  skipButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44, // WCAG touch target
  },
  skipButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.bodyRegular.weight,
    color: colorSystem.accessibility.text.secondary,
    textDecorationLine: 'underline',
  },
});

export default AssessmentIntroduction;