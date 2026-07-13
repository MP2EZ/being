/**
 * Enhanced Assessment Question Component
 *
 * Renders a single PHQ-9/GAD-7 question and forwards the selected response to
 * the parent via `onAnswer`. All clinical-data handling — AES-256 encryption,
 * consent enforcement, audit logging, and crisis detection (inline PHQ-9 Q9 and
 * score-based thresholds) — happens downstream in
 * `assessmentStore.answerQuestion` → `SecureStorageService`, NOT in this
 * component. The component only renders the always-on crisis button and the
 * store-sourced crisis banner.
 *
 * CLINICAL SPECIFICATIONS:
 * - PHQ-9/GAD-7 validated response handling
 * - Suicidal ideation immediate intervention (PHQ-9 Q9 >0)
 * - Crisis score thresholds (PHQ≥20, GAD≥15)
 * - WCAG AA accessibility compliance
 */


import { logSecurity, logError, LogCategory } from '@/core/services/logging';
import React, { useCallback, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  AccessibilityInfo,
} from 'react-native';
import { colorSystem, spacing, typography, borderRadius } from '@/core/theme';
import { CollapsibleCrisisButton } from '@/features/crisis/components/CollapsibleCrisisButton';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';
import { RadioGroup, FocusProvider, Focusable } from '@/core/components/accessibility';
import type { RadioOption } from '@/core/components/accessibility';
import type {
  AssessmentQuestion as AssessmentQuestionType,
  AssessmentResponse
} from '@/features/assessment/types';
import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore';

interface DataProtectionConsentStatus {
  dataProcessingConsent: boolean;
  clinicalDataConsent: boolean;
  consentTimestamp: number;
  consentVersion: string;
}

interface EnhancedAssessmentQuestionProps {
  question: AssessmentQuestionType;
  currentAnswer?: AssessmentResponse | undefined;
  onAnswer: (response: AssessmentResponse) => void;
  showProgress?: boolean | undefined;
  currentStep: number;
  totalSteps: number;
  theme?: ('morning' | 'midday' | 'evening' | 'neutral') | undefined;
  consentStatus: DataProtectionConsentStatus;
  onError?: ((error: Error) => void) | undefined;
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

const EnhancedAssessmentQuestion: React.FC<EnhancedAssessmentQuestionProps> = ({
  question,
  currentAnswer,
  onAnswer,
  showProgress = true,
  currentStep,
  totalSteps,
  theme = 'neutral',
  consentStatus,
  onError,
}) => {
  // Navigation for crisis button
  const rootNavigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  // Crisis-banner state is sourced from the assessment store — the store's
  // `answerQuestion` action runs the canonical inline Q9 detection and the
  // `CrisisDetectionService.triggerEmergencyResponse` Alert. This component
  // just observes the result so it can render the always-on banner.
  const crisisAlert = useAssessmentStore((state) => state.crisisDetection);

  // State management
  const [isProcessing, setIsProcessing] = useState(false);

  // Performance monitoring
  const responseStartTime = useRef<number>(0);

  // Theme-based styling
  const themeColors = useMemo(() => {
    if (theme === 'neutral') {
      return {
        primary: colorSystem.base.midnightBlue,
        light: colorSystem.gray[200],
        background: colorSystem.base.white,
      };
    }
    return colorSystem.themes[theme];
  }, [theme]);

  // Forward the selected answer to the parent, which delegates to
  // `assessmentStore.answerQuestion` — the canonical path that runs inline
  // crisis detection (PHQ-9 Q9) and AES-256 encryption via SecureStorageService.
  const handleAnswerSelection = useCallback((response: string | number) => {
    responseStartTime.current = performance.now();
    const assessmentResponse = Number(response) as AssessmentResponse;

    setIsProcessing(true);

    try {
      // Call the parent unconditionally and before anything that can throw, so
      // a downstream error can never suppress the store call — and with it,
      // crisis detection on a self-harm response.
      onAnswer(assessmentResponse);

      AccessibilityInfo.announceForAccessibility(
        `Selected: ${RESPONSE_LABELS[assessmentResponse]}`
      );

      // Surface unexpectedly slow handling against the 300ms assessment budget.
      const totalResponseTime = performance.now() - responseStartTime.current;
      if (totalResponseTime > 300) {
        logSecurity('Assessment response time exceeded', 'medium', {
          totalResponseTime,
          threshold: 300,
        });
      }
    } catch (error) {
      logError(LogCategory.SYSTEM, 'Enhanced assessment response error:', error instanceof Error ? error : new Error(String(error)));
      onError?.(error as Error);
    } finally {
      setIsProcessing(false);
    }
  }, [onAnswer, onError]);

  // Empty label - progress is shown at top, no need for duplicate text
  const radioGroupLabel = useMemo(() => {
    return ''; // Empty string to hide visual label
  }, []);

  return (
    <>
      <FocusProvider
        announceChanges={true}
        restoreFocus={true}
      >
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
          {/* Crisis Alert Banner */}
          {crisisAlert && (
            <Focusable
              id="crisis-alert-banner"
              priority={5}
            >
              <View
                style={styles.crisisAlertBanner}
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
              >
                <Text style={styles.crisisAlertText}>
                  🚨 Crisis support is available immediately
                </Text>
              </View>
            </Focusable>
          )}

        {/* Enhanced Progress indicator with security status */}
        {showProgress && (
          <Focusable
            id="assessment-progress"
            priority={10}
          >
            <View style={styles.progressContainer}>
              <Text
                style={styles.progressText}
                accessibilityLiveRegion="polite"
              >
                Question {currentStep} of {totalSteps}
              </Text>
              <View style={styles.progressRow}>
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
            </View>
          </Focusable>
        )}

        {/* Privacy Consent Status */}
        {!consentStatus.dataProcessingConsent && (
          <Focusable
            id="consent-warning"
            priority={15}
          >
            <View style={styles.consentWarning}>
              <Text style={styles.consentWarningText}>
                ⚠️ Data processing consent required for secure response storage
              </Text>
            </View>
          </Focusable>
        )}

        {/* Enhanced Question text with clinical context */}
        <Focusable
          id="assessment-question-text"
          priority={20}
        >
          <View style={styles.questionContainer}>
            <Text
              style={styles.instructionText}
              accessibilityRole="text"
            >
              Over the last 2 weeks, how often have you been bothered by this problem?
            </Text>
            <Text
              style={styles.questionText}
              accessibilityRole="header"
            >
              {question.text}
            </Text>

            {/* Special handling for suicidal ideation question */}
            {question.id === 'phq9_9' && (
              <View style={styles.specialInstructionContainer}>
                <Text style={styles.specialInstructionText}>
                  Your safety is our priority. Crisis support is immediately available regardless of your response.
                </Text>
              </View>
            )}
          </View>
        </Focusable>

        {/* Enhanced Response options with security integration */}
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
            orientation="vertical"
            clinicalContext={question.type === 'phq9' ? 'phq9' : 'gad7'}
            showScores={false}
            showRadioIndicator={false}
            theme={theme}
            disabled={isProcessing}
            testID="assessment-response-group"
          />
        </Focusable>

        {/* Processing indicator */}
        {isProcessing && (
          <Focusable
            id="processing-indicator"
            priority={35}
          >
            <View style={styles.processingContainer}>
              <Text style={styles.processingText}>
                Securing your response...
              </Text>
            </View>
          </Focusable>
        )}

        </View>
      </FocusProvider>

      {/* Collapsible Crisis Button - Always accessible overlay */}
      <CollapsibleCrisisButton
        mode="prominent"
        onNavigate={() => rootNavigation.navigate('CrisisResources')}
        testID="assessment-crisis-button"
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing[16],
  },
  crisisAlertBanner: {
    backgroundColor: colorSystem.status.critical,
    padding: spacing[16],
    borderRadius: borderRadius.medium,
    marginBottom: spacing[24],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  crisisAlertText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
    flex: 1,
  },
  progressContainer: {
    marginBottom: spacing[24],
  },
  progressText: {
    fontSize: typography.caption.size,
    fontWeight: typography.caption.weight,
    color: colorSystem.accessibility.text.secondary,
    marginBottom: spacing[4],
    textAlign: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  progressBar: {
    flex: 1,
    height: spacing[4],
    backgroundColor: colorSystem.gray[200],
    borderRadius: borderRadius.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.xs,
  },
  securityIndicator: {
    alignItems: 'center',
  },
  securityText: {
    fontSize: typography.caption.size,
    fontWeight: typography.fontWeight.medium,
  },
  consentWarning: {
    backgroundColor: colorSystem.status.warningBackground,
    padding: spacing[8],
    borderRadius: borderRadius.medium,
    marginBottom: spacing[16],
    borderLeftWidth: spacing[4],
    borderLeftColor: colorSystem.status.warning,
  },
  consentWarningText: {
    fontSize: typography.caption.size,
    color: colorSystem.status.warning,
    fontWeight: typography.fontWeight.medium,
  },
  questionContainer: {
    marginBottom: spacing[32], // Space between question and response options
  },
  questionText: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.accessibility.text.primary,
    lineHeight: typography.headline3.size * 1.3,
    marginBottom: 0, // No space below question text
  },
  instructionText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.bodyRegular.weight,
    color: colorSystem.accessibility.text.secondary,
    lineHeight: typography.bodyRegular.size * 1.5,
    marginBottom: spacing[24], // More space between instruction and question
  },
  specialInstructionContainer: {
    backgroundColor: colorSystem.status.infoBackground,
    padding: spacing[8],
    borderRadius: borderRadius.medium,
    marginTop: spacing[8],
    borderLeftWidth: spacing[4],
    borderLeftColor: colorSystem.status.info,
  },
  specialInstructionText: {
    fontSize: typography.caption.size,
    color: colorSystem.status.info,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.caption.size * 1.4,
  },
  responseContainer: {
    flex: 1,
    marginBottom: spacing[16],
  },
  processingContainer: {
    backgroundColor: colorSystem.gray[100],
    padding: spacing[8],
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    marginBottom: spacing[16],
  },
  processingText: {
    fontSize: typography.caption.size,
    color: colorSystem.accessibility.text.secondary,
    fontStyle: 'italic',
  },
  safetyContainer: {
    marginTop: spacing[24],
    paddingTop: spacing[16],
    borderTopWidth: 1,
    borderTopColor: colorSystem.gray[200],
  },
  safetyTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.accessibility.text.primary,
    textAlign: 'center',
    marginBottom: spacing[8],
  },
  safetyButtonRow: {
    flexDirection: 'row',
    gap: spacing[8],
    justifyContent: 'center',
  },
});

export default EnhancedAssessmentQuestion;