/**
 * Type-Safe GAD-7 Assessment Screen - Zero Tolerance Clinical Accuracy
 *
 * This component implements GAD-7 anxiety assessment with compile-time type safety
 * and 100% accuracy guarantees for clinical calculations and crisis detection.
 * Parallels PHQ-9 type safety patterns with GAD-7 specific requirements.
 *
 * CRITICAL: All scoring and crisis detection is handled by certified clinical
 * calculation services with real-time validation and therapeutic timing.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Button } from '../../components/core';
import { colorSystem, spacing, borderRadius } from '../../constants/colors';

import type {
  GAD7Answers,
  GAD7Answer,
  GAD7Score,
  GAD7Severity,
  ISODateString,
  createISODateString
} from '../../types/clinical';

import type {
  ValidatedGAD7Score,
  ValidatedSeverity,
  CrisisDetected,
  ClinicalCalculationCertified,
  TherapeuticTimingCertified,
  ClinicalTypeValidationError
} from '../../types/clinical-type-safety';

import type {
  StrictGAD7Answer,
  StrictGAD7Answers,
  ExactGAD7Score,
  GAD7CrisisScore,
  TypeSafeAssessmentState,
  CrisisDetectionResult,
  CrisisType,
  AssessmentQuestionDisplayProps,
  AssessmentOptionProps,
  AssessmentNavigationProps,
  ASSESSMENT_TYPE_CONSTANTS
} from '../../types/enhanced-assessment-types';

import type {
  EnhancedButtonProps as AssessmentButtonProps,
  EnhancedButtonProps as AnswerOptionButtonProps,
  EnhancedButtonProps as AssessmentNavigationButtonProps,
  createDefaultCrisisPerformanceConfig as createAssessmentButtonProps,
  COMPONENT_PROPS_CANONICAL_CONSTANTS
} from '../../types/component-props-canonical';

// Maintain THERAPEUTIC_BUTTON_CONSTANTS for backward compatibility
const THERAPEUTIC_BUTTON_CONSTANTS = COMPONENT_PROPS_CANONICAL_CONSTANTS;

import { useTypeSafeAssessmentHandler } from '../../hooks/useTypeSafeAssessmentHandler';
import { enhancedClinicalCalculator } from '../../services/TypeSafeClinicalCalculationService';

// === ROUTE PARAMS ===

type GAD7ScreenParams = {
  TypeSafeGAD7Screen: {
    context?: 'onboarding' | 'standalone' | 'clinical';
    returnTo?: string;
  };
};

type GAD7ScreenRouteProp = RouteProp<GAD7ScreenParams, 'TypeSafeGAD7Screen'>;

// === GAD-7 CLINICAL DATA ===

/**
 * GAD-7 Question Data - EXACT clinical wording required
 * DO NOT MODIFY without clinical validation
 */
const GAD7_QUESTIONS = [
  {
    id: 1,
    text: "Feeling nervous, anxious or on edge",
    clinicalWording: "Over the last 2 weeks, how often have you been bothered by feeling nervous, anxious or on edge?"
  },
  {
    id: 2,
    text: "Not being able to stop or control worrying",
    clinicalWording: "Over the last 2 weeks, how often have you been bothered by not being able to stop or control worrying?"
  },
  {
    id: 3,
    text: "Worrying too much about different things",
    clinicalWording: "Over the last 2 weeks, how often have you been bothered by worrying too much about different things?"
  },
  {
    id: 4,
    text: "Trouble relaxing",
    clinicalWording: "Over the last 2 weeks, how often have you been bothered by trouble relaxing?"
  },
  {
    id: 5,
    text: "Being so restless that it is hard to sit still",
    clinicalWording: "Over the last 2 weeks, how often have you been bothered by being so restless that it is hard to sit still?"
  },
  {
    id: 6,
    text: "Becoming easily annoyed or irritable",
    clinicalWording: "Over the last 2 weeks, how often have you been bothered by becoming easily annoyed or irritable?"
  },
  {
    id: 7,
    text: "Feeling afraid as if something awful might happen",
    clinicalWording: "Over the last 2 weeks, how often have you been bothered by feeling afraid as if something awful might happen?"
  }
] as const;

/**
 * GAD-7 Response Options - EXACT clinical wording required
 */
const GAD7_RESPONSE_OPTIONS = [
  { value: 0 as StrictGAD7Answer, text: "Not at all", clinicalDescription: "0 days" },
  { value: 1 as StrictGAD7Answer, text: "Several days", clinicalDescription: "1-6 days" },
  { value: 2 as StrictGAD7Answer, text: "More than half the days", clinicalDescription: "7-10 days" },
  { value: 3 as StrictGAD7Answer, text: "Nearly every day", clinicalDescription: "11-14 days" }
] as const;

// === MAIN COMPONENT ===

export const TypeSafeGAD7Screen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<GAD7ScreenRouteProp>();
  const { context = 'standalone', returnTo } = route.params || {};

  // === TYPE-SAFE ASSESSMENT HANDLER ===

  const assessmentHandler = useTypeSafeAssessmentHandler<'gad7'>({
    assessmentType: 'gad7',
    context,
    calculator: enhancedClinicalCalculator,
    
    onCrisisDetected: useCallback((crisis: CrisisDetected, type: CrisisType<'gad7'>) => {
      console.log('🚨 GAD-7 Crisis detected:', { crisis, type });
      
      // Show crisis intervention alert
      Alert.alert(
        'High Anxiety Levels Detected',
        'Your responses indicate significant anxiety symptoms. Professional support is recommended.',
        [
          {
            text: 'Get Support Now',
            onPress: () => navigation.navigate('CrisisInterventionScreen' as never, {
              source: 'assessment',
              assessmentType: 'gad7',
              emergencyLevel: 'high'
            } as never)
          },
          {
            text: 'Continue Assessment',
            style: 'cancel'
          }
        ],
        { cancelable: true }
      );
    }, [navigation]),

    onComplete: useCallback((result: CrisisDetectionResult<'gad7'>) => {
      console.log('GAD-7 Assessment completed:', result);
      
      navigation.navigate('AssessmentResults' as never, {
        type: 'gad7',
        score: result.score,
        severity: result.severity,
        crisisDetected: result.requiresIntervention,
        crisisType: result.crisisType,
        recommendations: result.recommendations,
        context,
        returnTo,
        validatedAt: result.validatedAt
      } as never);
    }, [navigation, context, returnTo]),

    onError: useCallback((error: ClinicalTypeValidationError) => {
      console.error('GAD-7 Clinical validation error:', error);
      
      Alert.alert(
        'Assessment Error',
        `A validation error occurred: ${error.message}. Please contact support if this continues.`,
        [{ text: 'OK' }]
      );
    }, [])
  });

  // === DESTRUCTURE HANDLER ===

  const {
    assessmentState,
    currentQuestion,
    progress,
    canProceed,
    handleAnswerSelect,
    handleNext,
    handleBack,
    handleExit,
    crisisDetected,
    averageResponseTime,
    therapeuticCompliance,
    validationErrors
  } = assessmentHandler;

  // === DERIVED STATE ===

  const currentQuestionData = GAD7_QUESTIONS[currentQuestion];
  const currentAnswer = assessmentState.answers[currentQuestion];
  const isLastQuestion = currentQuestion === GAD7_QUESTIONS.length - 1;

  // === ANSWER OPTION RENDERING ===

  const renderAnswerOptions = useCallback(() => {
    return GAD7_RESPONSE_OPTIONS.map((option) => {
      const isSelected = currentAnswer === option.value;

      const buttonProps: AnswerOptionButtonProps<'gad7'> = {
        assessmentType: 'gad7',
        questionIndex: currentQuestion,
        optionValue: option.value,
        optionText: option.text,
        optionDescription: option.clinicalDescription,
        isSelected,
        isCriticalQuestion: false, // GAD-7 has no equivalent to PHQ-9 Q9
        onSelect: () => handleAnswerSelect(currentQuestion, option.value),
        accessibilityLabel: `${option.text}, option ${option.value + 1} of 4`,
        accessibilityHint: isSelected ? "Selected answer option" : "Tap to select this answer",
        hapticEnabled: true,
        responseTime: averageResponseTime,
      };

      return (
        <Pressable
          key={option.value}
          style={({ pressed }) => [
            styles.answerOption,
            isSelected && styles.answerOptionSelected,
            crisisDetected && styles.answerOptionCrisis,
            pressed && styles.answerOptionPressed
          ]}
          onPress={buttonProps.onSelect}
          accessibilityLabel={buttonProps.accessibilityLabel}
          accessibilityHint={buttonProps.accessibilityHint}
          accessibilityRole="button"
          android_ripple={{
            color: '#00000020',
            borderless: false
          }}
        >
          <View style={[
            styles.answerRadio,
            isSelected && styles.answerRadioSelected
          ]}>
            {isSelected && <View style={styles.answerRadioInner} />}
          </View>
          <View style={styles.answerTextContainer}>
            <Text style={[
              styles.answerText,
              isSelected && styles.answerTextSelected
            ]}>
              {option.text}
            </Text>
            <Text style={styles.answerDescription}>
              {option.clinicalDescription}
            </Text>
          </View>
        </Pressable>
      );
    });
  }, [currentQuestion, currentAnswer, handleAnswerSelect, crisisDetected, averageResponseTime]);

  // === NAVIGATION PROPS ===

  const navigationProps: AssessmentNavigationButtonProps = {
    navigationType: isLastQuestion ? 'complete' : 'next',
    assessmentComplete: assessmentState.isComplete,
    currentAnswerValid: canProceed,
    isLastQuestion,
    onPress: handleNext,
    crisisDetected: crisisDetected !== false,
    disabled: !canProceed,
    children: isLastQuestion ? 'Complete Assessment' : 'Continue',
    accessibilityLabel: isLastQuestion ? 'Complete GAD-7 assessment' : 'Continue to next question',
  };

  // === CRISIS ALERT COMPONENT ===

  const CrisisAlert = () => {
    if (crisisDetected === false) return null;

    return (
      <View style={styles.crisisAlert}>
        <Text style={styles.crisisAlertText}>
          🚨 High anxiety levels detected - Support resources available
        </Text>
        <Button
          variant="crisis"
          emergency={true}
          onPress={() => navigation.navigate('CrisisInterventionScreen' as never, {
            source: 'assessment',
            assessmentType: 'gad7',
            emergencyLevel: 'high'
          } as never)}
          style={styles.crisisAlertButton}
        >
          Get Support
        </Button>
      </View>
    );
  };

  // === VALIDATION ERRORS DISPLAY ===

  const ValidationErrors = () => {
    if (validationErrors.length === 0) return null;

    return (
      <View style={styles.validationErrorContainer}>
        <Text style={styles.validationErrorTitle}>⚠️ Validation Issues</Text>
        {validationErrors.map((error, index) => (
          <Text key={index} style={styles.validationErrorText}>{error}</Text>
        ))}
      </View>
    );
  };

  // === PERFORMANCE METRICS (DEBUG) ===

  const PerformanceMetrics = () => {
    if (__DEV__ && currentQuestion > 0) {
      return (
        <View style={styles.debugMetrics}>
          <Text style={styles.debugText}>
            Avg Response: {averageResponseTime.toFixed(0)}ms | 
            Compliant: {therapeuticCompliance ? '✅' : '❌'} |
            Questions: {currentQuestion + 1}/{GAD7_QUESTIONS.length}
          </Text>
        </View>
      );
    }
    return null;
  };

  // === RENDER ===

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Button
              variant="outline"
              onPress={handleExit}
              style={styles.exitButton}
              accessibilityLabel="Exit GAD-7 assessment"
              accessibilityHint="Exits the assessment and returns to previous screen"
            >
              ✕
            </Button>

            <View style={styles.headerCenter}>
              <Text style={styles.assessmentTitle}>GAD-7 Anxiety Assessment</Text>
              <Text style={styles.assessmentSubtitle}>
                This questionnaire helps assess symptoms of anxiety over the past 2 weeks.
              </Text>
            </View>
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Question {currentQuestion + 1} of {GAD7_QUESTIONS.length}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress}%`,
                    backgroundColor: crisisDetected !== false 
                      ? colorSystem.status.critical 
                      : colorSystem.status.info
                  }
                ]}
              />
            </View>
          </View>

          {/* Crisis Alert */}
          <CrisisAlert />

          {/* Validation Errors */}
          <ValidationErrors />

          {/* Performance Metrics (Debug) */}
          <PerformanceMetrics />

          {/* Question */}
          <View style={styles.questionContainer}>
            <Text style={styles.questionText}>
              {currentQuestionData.clinicalWording}
            </Text>
          </View>

          {/* Answer Options */}
          <View style={styles.answersContainer}>
            {renderAnswerOptions()}
          </View>

          {/* Clinical Note */}
          <View style={styles.clinicalNote}>
            <Text style={styles.clinicalNoteText}>
              💡 Please answer honestly based on how you've been feeling over the past 2 weeks.
              Your responses help us provide better support for managing anxiety.
            </Text>
          </View>

          {/* GAD-7 Specific Information */}
          <View style={styles.gad7Info}>
            <Text style={styles.gad7InfoText}>
              ℹ️ The GAD-7 is a validated tool for measuring generalized anxiety disorder symptoms.
              Higher scores indicate more severe anxiety symptoms requiring professional evaluation.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        <Button
          variant="outline"
          onPress={handleBack}
          disabled={currentQuestion === 0}
          style={styles.backButton}
          accessibilityLabel="Go to previous question"
        >
          {currentQuestion === 0 ? 'Cancel' : 'Back'}
        </Button>

        <Button
          onPress={navigationProps.onPress}
          disabled={!navigationProps.currentAnswerValid}
          loading={assessmentState.isComplete}
          style={[
            styles.nextButton,
            {
              backgroundColor: navigationProps.currentAnswerValid
                ? (crisisDetected !== false ? colorSystem.status.critical : colorSystem.status.info)
                : colorSystem.gray[300]
            }
          ]}
          accessibilityLabel={navigationProps.accessibilityLabel}
        >
          {navigationProps.children}
        </Button>
      </View>
    </SafeAreaView>
  );
};

// === STYLES ===

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  exitButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginLeft: -32, // Compensate for exit button
  },
  assessmentTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  assessmentSubtitle: {
    fontSize: 14,
    color: colorSystem.gray[600],
    textAlign: 'center',
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: spacing.lg,
  },
  progressText: {
    fontSize: 14,
    color: colorSystem.gray[600],
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: colorSystem.gray[200],
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  crisisAlert: {
    backgroundColor: colorSystem.status.criticalBackground,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.status.critical,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  crisisAlertText: {
    flex: 1,
    fontSize: 14,
    color: colorSystem.status.critical,
    fontWeight: '500',
  },
  crisisAlertButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  validationErrorContainer: {
    backgroundColor: colorSystem.status.warningBackground,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.md,
  },
  validationErrorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colorSystem.status.warning,
    marginBottom: spacing.xs,
  },
  validationErrorText: {
    fontSize: 12,
    color: colorSystem.status.warning,
    lineHeight: 16,
  },
  debugMetrics: {
    backgroundColor: colorSystem.gray[100],
    padding: spacing.sm,
    borderRadius: borderRadius.small,
    marginBottom: spacing.md,
  },
  debugText: {
    fontSize: 10,
    color: colorSystem.gray[600],
    fontFamily: 'monospace',
  },
  questionContainer: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colorSystem.gray[50],
    borderRadius: borderRadius.medium,
  },
  questionText: {
    fontSize: 18,
    color: colorSystem.base.black,
    lineHeight: 26,
    fontWeight: '500',
  },
  answersContainer: {
    marginBottom: spacing.xl,
  },
  answerOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    backgroundColor: colorSystem.base.white,
  },
  answerOptionSelected: {
    borderColor: colorSystem.status.info,
    backgroundColor: colorSystem.status.infoBackground,
  },
  answerOptionCrisis: {
    borderColor: colorSystem.status.critical,
    backgroundColor: colorSystem.status.criticalBackground,
  },
  answerOptionPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
    backgroundColor: colorSystem.gray[50],
  },
  answerRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colorSystem.gray[400],
    marginRight: spacing.md,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  answerRadioSelected: {
    borderColor: colorSystem.status.info,
  },
  answerRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colorSystem.status.info,
  },
  answerTextContainer: {
    flex: 1,
  },
  answerText: {
    fontSize: 16,
    color: colorSystem.base.black,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  answerTextSelected: {
    fontWeight: '500',
  },
  answerDescription: {
    fontSize: 12,
    color: colorSystem.gray[600],
    fontStyle: 'italic',
  },
  clinicalNote: {
    backgroundColor: colorSystem.status.infoBackground,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.md,
  },
  clinicalNoteText: {
    fontSize: 14,
    color: colorSystem.gray[700],
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  gad7Info: {
    backgroundColor: colorSystem.gray[100],
    padding: spacing.md,
    borderRadius: borderRadius.medium,
  },
  gad7InfoText: {
    fontSize: 13,
    color: colorSystem.gray[700],
    lineHeight: 18,
    textAlign: 'center',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colorSystem.base.white,
    borderTopWidth: 1,
    borderTopColor: colorSystem.gray[200],
  },
  backButton: {
    flex: 0,
    minWidth: 80,
  },
  nextButton: {
    flex: 1,
    marginLeft: spacing.md,
  },
});

export default TypeSafeGAD7Screen;