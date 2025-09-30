/**
 * AssessmentQuestion Component - DRD-FLOW-005
 * 
 * CLINICAL SPECIFICATIONS:
 * - PHQ-9/GAD-7 validated 4-option response scale
 * - Exact clinical wording compliance (0-3 scale)
 * - MBCT therapeutic styling with accessibility
 * - Crisis detection integrated (<200ms response)
 * - WCAG AA compliant interactions
 * - Proper radio group semantics with keyboard navigation
 * - Visible focus indicators meeting WCAG contrast requirements
 */


import { logSecurity, logPerformance, logError, LogCategory } from '../../../services/logging';
import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  AccessibilityInfo,
} from 'react-native';
import { colorSystem, spacing, typography } from '../../../constants/colors';
import { SafetyButton } from '../../shared/components';
import { RadioGroup, FocusProvider, Focusable } from '../../../components/accessibility';
import type { RadioOption } from '../../../components/accessibility';
import type { 
  AssessmentQuestion as AssessmentQuestionType, 
  AssessmentResponse
} from '../types';

interface AssessmentQuestionProps {
  question: AssessmentQuestionType;
  currentAnswer?: AssessmentResponse;
  onAnswer: (response: AssessmentResponse) => void;
  showProgress?: boolean;
  currentStep: number;
  totalSteps: number;
  theme?: 'morning' | 'midday' | 'evening' | 'neutral';
  showSafetyButton?: boolean;
}

// Clinically validated response labels (exact PHQ-9/GAD-7 wording)
const RESPONSE_LABELS: Record<AssessmentResponse, string> = {
  0: "Not at all",
  1: "Several days", 
  2: "More than half the days",
  3: "Nearly every day"
};

// Convert response labels to RadioOption format
const RESPONSE_OPTIONS: RadioOption[] = [
  { value: 0, label: RESPONSE_LABELS[0] },
  { value: 1, label: RESPONSE_LABELS[1] },
  { value: 2, label: RESPONSE_LABELS[2] },
  { value: 3, label: RESPONSE_LABELS[3] },
];

const AssessmentQuestion: React.FC<AssessmentQuestionProps> = ({
  question,
  currentAnswer,
  onAnswer,
  showProgress = true,
  currentStep,
  totalSteps,
  theme = 'neutral',
  showSafetyButton = true,
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

  // Handle answer selection with clinical validation
  const handleAnswerSelection = useCallback((response: string | number) => {
    const startTime = performance.now();
    
    // Ensure response is AssessmentResponse type (0-3)
    const assessmentResponse = Number(response) as AssessmentResponse;
    
    // Immediate response for therapeutic flow
    onAnswer(assessmentResponse);
    
    // Announce selection to screen readers
    AccessibilityInfo.announceForAccessibility(
      `Selected: ${RESPONSE_LABELS[assessmentResponse]}`
    );
    
    // Performance monitoring for clinical compliance
    const responseTime = performance.now() - startTime;
    if (responseTime > 100) {
      logSecurity(`⚠️ Assessment response time: ${responseTime}ms (target: <100ms)`);
    }
  }, [onAnswer]);

  // Get radio group label for accessibility
  const radioGroupLabel = useMemo(() => {
    return `${question.text} - Assessment question ${currentStep} of ${totalSteps}`;
  }, [question.text, currentStep, totalSteps]);

  // Get radio group description
  const radioGroupDescription = useMemo(() => {
    return "Over the last 2 weeks, how often have you been bothered by this problem? Use arrow keys to navigate between options.";
  }, []);

  return (
    <FocusProvider
      announceChanges={true}
      restoreFocus={true}
    >
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        {/* Progress indicator */}
        {showProgress && (
          <Focusable
            id="assessment-progress"
            priority={10}
          >
            <View style={styles.progressContainer}>
              <Text 
                style={styles.progressText}
                accessibilityRole="status"
                accessibilityLiveRegion="polite"
              >
                Question {currentStep} of {totalSteps}
              </Text>
              <View 
                style={styles.progressBar}
                accessibilityLabel={`Progress: ${currentStep} of ${totalSteps} questions completed`}
                accessibilityRole="progressbar"
                accessibilityValue={{
                  min: 0,
                  max: totalSteps,
                  now: currentStep,
                }}
              >
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      width: `${(currentStep / totalSteps) * 100}%`,
                      backgroundColor: themeColors.primary,
                    }
                  ]} 
                />
              </View>
            </View>
          </Focusable>
        )}

        {/* Question text */}
        <Focusable
          id="assessment-question-text"
          priority={20}
        >
          <View style={styles.questionContainer}>
            <Text 
              style={styles.questionText}
              accessibilityRole="header"
              accessibilityLevel={2}
            >
              {question.text}
            </Text>
            <Text 
              style={styles.instructionText}
              accessibilityRole="text"
            >
              Over the last 2 weeks, how often have you been bothered by this problem?
            </Text>
          </View>
        </Focusable>

        {/* Response options using RadioGroup */}
        <Focusable
          id="assessment-radio-group"
          priority={30}
          style={styles.responseContainer}
        >
          <RadioGroup
            options={RESPONSE_OPTIONS}
            value={currentAnswer}
            onValueChange={handleAnswerSelection}
            label={radioGroupLabel}
            description={radioGroupDescription}
            orientation="vertical"
            required={true}
            clinicalContext={question.type === 'phq9' ? 'phq9' : 'gad7'}
            showScores={true}
            theme={theme}
            testID="assessment-response-group"
          />
        </Focusable>

        {/* Safety buttons - crisis access <3 taps */}
        {showSafetyButton && (
          <Focusable
            id="assessment-safety-buttons"
            priority={40}
          >
            <View style={styles.safetyContainer}>
              {/* CRITICAL: Direct 1-tap crisis access */}
              <SafetyButton
                variant="crisis"
                testID="assessment-crisis-button"
              />
              {/* General support options */}
              <SafetyButton
                variant="primary"
                testID="assessment-safety-button"
              />
            </View>
          </Focusable>
        )}
      </View>
    </FocusProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  progressContainer: {
    marginBottom: spacing.lg,
  },
  progressText: {
    fontSize: typography.caption.size,
    fontWeight: typography.caption.weight,
    color: colorSystem.accessibility.text.secondary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: colorSystem.gray[200],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    // Transition handled by Animated.View in React Native
  },
  questionContainer: {
    marginBottom: spacing.xl,
  },
  questionText: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.accessibility.text.primary,
    lineHeight: typography.headline3.size * 1.3,
    marginBottom: spacing.md,
  },
  instructionText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.bodyRegular.weight,
    color: colorSystem.accessibility.text.secondary,
    lineHeight: typography.bodyRegular.size * 1.5,
  },
  responseContainer: {
    flex: 1,
    marginBottom: spacing.md,
  },
  safetyContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colorSystem.gray[200],
    gap: spacing.sm, // Space between crisis and general support buttons
    alignItems: 'center', // Center buttons horizontally
  },
});

export default AssessmentQuestion;