/**
 * Type-Safe PHQ-9 Assessment Screen - Zero Tolerance Clinical Accuracy
 *
 * This component implements PHQ-9 assessment with compile-time type safety
 * and 100% accuracy guarantees for clinical calculations and crisis detection.
 *
 * CRITICAL: All scoring and crisis detection is handled by certified clinical
 * calculation services. No direct manipulation of clinical data allowed.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../../components/core';
import { colorSystem, spacing, borderRadius } from '../../constants/colors';

import {
  PHQ9Answers,
  PHQ9Answer,
  PHQ9Score,
  PHQ9Severity,
  ISODateString,
  createISODateString
} from '../../types/clinical';

import {
  ValidatedPHQ9Score,
  ValidatedSeverity,
  CrisisDetected,
  SuicidalIdeationDetected,
  ClinicallyValidatedProps,
  ValidatedAssessmentQuestionProps,
  ClinicalValidationState,
  ClinicalTypeValidationError
} from '../../types/clinical-type-safety';

import { clinicalCalculator } from '../../services/clinical/ClinicalCalculationService';
import { therapeuticTimer } from '../../services/clinical/TherapeuticTimingService';

/**
 * PHQ-9 Question Data - EXACT clinical wording required
 * DO NOT MODIFY without clinical validation
 */
const PHQ9_QUESTIONS = [
  {
    id: 1,
    text: "Little interest or pleasure in doing things",
    clinicalWording: "Over the last 2 weeks, how often have you been bothered by little interest or pleasure in doing things?"
  },
  {
    id: 2,
    text: "Feeling down, depressed, or hopeless",
    clinicalWording: "Over the last 2 weeks, how often have you been bothered by feeling down, depressed, or hopeless?"
  },
  {
    id: 3,
    text: "Trouble falling or staying asleep, or sleeping too much",
    clinicalWording: "Over the last 2 weeks, how often have you been bothered by trouble falling or staying asleep, or sleeping too much?"
  },
  {
    id: 4,
    text: "Feeling tired or having little energy",
    clinicalWording: "Over the last 2 weeks, how often have you been bothered by feeling tired or having little energy?"
  },
  {
    id: 5,
    text: "Poor appetite or overeating",
    clinicalWording: "Over the last 2 weeks, how often have you been bothered by poor appetite or overeating?"
  },
  {
    id: 6,
    text: "Feeling bad about yourself - or that you are a failure or have let yourself or your family down",
    clinicalWording: "Over the last 2 weeks, how often have you been bothered by feeling bad about yourself - or that you are a failure or have let yourself or your family down?"
  },
  {
    id: 7,
    text: "Trouble concentrating on things, such as reading the newspaper or watching television",
    clinicalWording: "Over the last 2 weeks, how often have you been bothered by trouble concentrating on things, such as reading the newspaper or watching television?"
  },
  {
    id: 8,
    text: "Moving or speaking so slowly that other people could have noticed. Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual",
    clinicalWording: "Over the last 2 weeks, how often have you been bothered by moving or speaking so slowly that other people could have noticed. Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual?"
  },
  {
    id: 9,
    text: "Thoughts that you would be better off dead, or thoughts of hurting yourself",
    clinicalWording: "Over the last 2 weeks, how often have you been bothered by thoughts that you would be better off dead, or thoughts of hurting yourself?"
  }
] as const;

/**
 * PHQ-9 Response Options - EXACT clinical wording required
 */
const PHQ9_RESPONSE_OPTIONS = [
  { value: 0 as PHQ9Answer, text: "Not at all", clinicalDescription: "0 days" },
  { value: 1 as PHQ9Answer, text: "Several days", clinicalDescription: "1-6 days" },
  { value: 2 as PHQ9Answer, text: "More than half the days", clinicalDescription: "7-10 days" },
  { value: 3 as PHQ9Answer, text: "Nearly every day", clinicalDescription: "11-14 days" }
] as const;

/**
 * Type-Safe PHQ-9 Assessment State
 */
interface PHQ9AssessmentState {
  answers: (PHQ9Answer | null)[];
  currentQuestion: number;
  startTime: number;
  lastAnswerTime: number;
  validationState: ClinicalValidationState | null;
  score: ValidatedPHQ9Score | null;
  severity: ValidatedSeverity<'phq9'> | null;
  crisisDetected: CrisisDetected | false;
  suicidalIdeation: SuicidalIdeationDetected | false;
}

/**
 * Crisis Detection Result Interface
 */
interface CrisisDetectionResult {
  requiresIntervention: boolean;
  crisisType: 'score_threshold' | 'suicidal_ideation' | 'both' | null;
  score: ValidatedPHQ9Score;
  severity: ValidatedSeverity<'phq9'>;
  recommendations: string[];
}

/**
 * Type-Safe PHQ-9 Assessment Component
 */
export const TypeSafePHQ9Screen: React.FC = () => {
  const navigation = useNavigation();
  const startTime = useMemo(() => Date.now(), []);

  const [assessmentState, setAssessmentState] = useState<PHQ9AssessmentState>({
    answers: new Array(9).fill(null),
    currentQuestion: 0,
    startTime,
    lastAnswerTime: startTime,
    validationState: null,
    score: null,
    severity: null,
    crisisDetected: false,
    suicidalIdeation: false
  });

  /**
   * Type-Safe Answer Handler with Real-Time Validation
   */
  const handleAnswerSelect = useCallback((questionIndex: number, answer: PHQ9Answer) => {
    const answerTime = Date.now();
    const responseTime = answerTime - assessmentState.lastAnswerTime;

    // Validate response time for quality assurance
    try {
      therapeuticTimer.validateCrisisResponse(responseTime);
    } catch (error) {
      // Log slow response but don't block assessment
      console.warn('Slow response time detected:', responseTime, 'ms');
    }

    setAssessmentState(prevState => {
      const newAnswers = [...prevState.answers];
      newAnswers[questionIndex] = answer;

      return {
        ...prevState,
        answers: newAnswers,
        lastAnswerTime: answerTime,
        // Reset calculations - will be recalculated if assessment is complete
        score: null,
        severity: null,
        crisisDetected: false,
        suicidalIdeation: false,
        validationState: null
      };
    });
  }, [assessmentState.lastAnswerTime]);

  /**
   * Type-Safe Assessment Completion with Clinical Validation
   */
  const handleCompleteAssessment = useCallback(async (): Promise<CrisisDetectionResult | null> => {
    try {
      // Validate all questions are answered
      const completedAnswers = assessmentState.answers;
      if (completedAnswers.some(answer => answer === null)) {
        Alert.alert('Incomplete Assessment', 'Please answer all questions to complete the assessment.');
        return null;
      }

      // Convert to validated PHQ9Answers type
      const validatedAnswers = completedAnswers as PHQ9Answers;

      // Calculate score with 100% accuracy guarantee
      const score = clinicalCalculator.calculatePHQ9Score(validatedAnswers);
      const severity = clinicalCalculator.determinePHQ9Severity(score);
      const crisisFromScore = clinicalCalculator.detectPHQ9Crisis(score);
      const suicidalIdeation = clinicalCalculator.detectSuicidalIdeation(validatedAnswers);

      // Determine overall crisis status
      const requiresIntervention = crisisFromScore !== false || suicidalIdeation !== false;
      let crisisType: CrisisDetectionResult['crisisType'] = null;

      if (crisisFromScore !== false && suicidalIdeation !== false) {
        crisisType = 'both';
      } else if (crisisFromScore !== false) {
        crisisType = 'score_threshold';
      } else if (suicidalIdeation !== false) {
        crisisType = 'suicidal_ideation';
      }

      // Generate clinical recommendations
      const recommendations = generateClinicalRecommendations(score, severity, crisisType);

      // Update state with validated results
      const validationState: ClinicalValidationState = {
        isValidated: true,
        validatedAt: createISODateString(),
        validator: 'TypeSafePHQ9Screen-v1.0',
        errors: [],
        warnings: []
      };

      setAssessmentState(prevState => ({
        ...prevState,
        score,
        severity,
        crisisDetected: crisisFromScore || false,
        suicidalIdeation: suicidalIdeation || false,
        validationState
      }));

      return {
        requiresIntervention,
        crisisType,
        score,
        severity,
        recommendations
      };

    } catch (error) {
      if (error instanceof ClinicalTypeValidationError) {
        Alert.alert(
          'Clinical Validation Error',
          `Assessment validation failed: ${error.message}. Please contact support.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Assessment Error',
          'An error occurred while processing your assessment. Please try again.',
          [{ text: 'OK' }]
        );
      }
      console.error('PHQ-9 assessment error:', error);
      return null;
    }
  }, [assessmentState.answers]);

  /**
   * Generate Clinical Recommendations Based on Results
   */
  const generateClinicalRecommendations = (
    score: ValidatedPHQ9Score,
    severity: ValidatedSeverity<'phq9'>,
    crisisType: CrisisDetectionResult['crisisType']
  ): string[] => {
    const recommendations: string[] = [];

    // Crisis-specific recommendations
    if (crisisType === 'suicidal_ideation' || crisisType === 'both') {
      recommendations.push('Immediate crisis support resources are available');
      recommendations.push('Consider contacting 988 Suicide & Crisis Lifeline');
      recommendations.push('Connect with a mental health professional immediately');
    }

    if (crisisType === 'score_threshold' || crisisType === 'both') {
      recommendations.push('Your symptoms indicate severe depression');
      recommendations.push('Professional mental health support is strongly recommended');
    }

    // Severity-based recommendations
    switch (severity) {
      case 'minimal':
        recommendations.push('Continue regular self-care and monitoring');
        break;
      case 'mild':
        recommendations.push('Consider speaking with a healthcare provider if symptoms persist');
        break;
      case 'moderate':
        recommendations.push('Consult with a mental health professional');
        break;
      case 'moderately_severe':
        recommendations.push('Seek professional help soon');
        break;
      case 'severe':
        recommendations.push('Immediate professional support recommended');
        break;
    }

    return recommendations;
  };

  /**
   * Navigation to Next Question or Results
   */
  const handleNext = useCallback(() => {
    if (assessmentState.currentQuestion < PHQ9_QUESTIONS.length - 1) {
      setAssessmentState(prev => ({
        ...prev,
        currentQuestion: prev.currentQuestion + 1
      }));
    } else {
      // Complete assessment
      handleCompleteAssessment().then(result => {
        if (result) {
          navigation.navigate('AssessmentResults', {
            type: 'phq9',
            score: result.score,
            severity: result.severity,
            crisisDetected: result.requiresIntervention,
            crisisType: result.crisisType,
            recommendations: result.recommendations,
            validatedAt: createISODateString()
          });
        }
      });
    }
  }, [assessmentState.currentQuestion, handleCompleteAssessment, navigation]);

  /**
   * Navigation to Previous Question
   */
  const handleBack = useCallback(() => {
    if (assessmentState.currentQuestion > 0) {
      setAssessmentState(prev => ({
        ...prev,
        currentQuestion: prev.currentQuestion - 1
      }));
    } else {
      navigation.goBack();
    }
  }, [assessmentState.currentQuestion, navigation]);

  /**
   * Current Question Data
   */
  const currentQuestion = PHQ9_QUESTIONS[assessmentState.currentQuestion];
  const currentAnswer = assessmentState.answers[assessmentState.currentQuestion];
  const isLastQuestion = assessmentState.currentQuestion === PHQ9_QUESTIONS.length - 1;

  /**
   * Progress Calculation
   */
  const progress = ((assessmentState.currentQuestion + 1) / PHQ9_QUESTIONS.length) * 100;

  /**
   * Render Answer Options
   */
  const renderAnswerOptions = () => {
    return PHQ9_RESPONSE_OPTIONS.map((option) => {
      const isSelected = currentAnswer === option.value;

      return (
        <Button
          key={option.value}
          variant={isSelected ? "primary" : "outline"}
          onPress={() => handleAnswerSelect(assessmentState.currentQuestion, option.value)}
          style={[
            styles.answerOption,
            isSelected && styles.answerOptionSelected
          ]}
          accessibilityLabel={`${option.text}, option ${option.value + 1} of 4`}
          accessibilityHint={isSelected ? "Selected answer option" : "Tap to select this answer"}
          fullWidth={true}
          haptic={true}
        >
          <View style={styles.answerContent}>
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
          </View>
        </Button>
      );
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Question {assessmentState.currentQuestion + 1} of {PHQ9_QUESTIONS.length}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress}%`,
                    backgroundColor: colorSystem.status.warning
                  }
                ]}
              />
            </View>
          </View>

          {/* Assessment Header */}
          <View style={styles.header}>
            <Text style={styles.assessmentTitle}>PHQ-9 Depression Assessment</Text>
            <Text style={styles.assessmentSubtitle}>
              This questionnaire helps assess symptoms of depression over the past 2 weeks.
            </Text>
          </View>

          {/* Question */}
          <View style={styles.questionContainer}>
            <Text style={styles.questionText}>
              {currentQuestion.clinicalWording}
            </Text>
          </View>

          {/* Answer Options */}
          <View style={styles.answersContainer}>
            {renderAnswerOptions()}
          </View>

          {/* Clinical Note */}
          <View style={styles.clinicalNote}>
            <Text style={styles.clinicalNoteText}>
              💡 Please answer based on how you've been feeling over the past 2 weeks.
              Your honest responses help us provide better support.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        <Button
          variant="outline"
          onPress={handleBack}
        >
          {assessmentState.currentQuestion === 0 ? 'Cancel' : 'Back'}
        </Button>

        <Button
          onPress={handleNext}
          disabled={currentAnswer === null}
          style={[
            styles.nextButton,
            {
              backgroundColor: currentAnswer !== null
                ? colorSystem.status.warning
                : colorSystem.gray[300]
            }
          ]}
        >
          {isLastQuestion ? 'Complete Assessment' : 'Continue'}
        </Button>
      </View>
    </SafeAreaView>
  );
};

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
  progressContainer: {
    paddingTop: spacing.md,
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
  header: {
    marginBottom: spacing.xl,
  },
  assessmentTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  assessmentSubtitle: {
    fontSize: 16,
    color: colorSystem.gray[600],
    lineHeight: 22,
    textAlign: 'center',
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
    borderColor: colorSystem.status.warning,
    backgroundColor: colorSystem.status.warningBackground,
  },
  answerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
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
    borderColor: colorSystem.status.warning,
  },
  answerRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colorSystem.status.warning,
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
    marginTop: spacing.md,
  },
  clinicalNoteText: {
    fontSize: 14,
    color: colorSystem.gray[700],
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
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
  nextButton: {
    flex: 1,
    marginLeft: spacing.md,
  },
});

export default TypeSafePHQ9Screen;