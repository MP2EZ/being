/**
 * PHQ9Screen - Complete PHQ-9 Depression Assessment Implementation
 * Clinical Requirements: Exact wording, 100% scoring accuracy, real-time crisis detection
 * CRITICAL: Do NOT modify clinical questions without approval
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Button } from '../../components/core/Button';
import { useAssessmentStore } from '../../store/assessmentStore';
import { colorSystem, spacing, borderRadius } from '../../constants/colors';
import { AssessmentQuestion, AssessmentOption } from '../../types';
import { CRISIS_THRESHOLDS } from '../../utils/validation';

type PHQ9ScreenParams = {
  PHQ9Screen: {
    context?: 'onboarding' | 'standalone' | 'clinical';
    returnTo?: string;
  };
};

type PHQ9ScreenRouteProp = RouteProp<PHQ9ScreenParams, 'PHQ9Screen'>;

// CLINICAL REQUIREMENT: Exact PHQ-9 question wording - DO NOT MODIFY
const PHQ9_QUESTIONS: AssessmentQuestion[] = [
  {
    id: 1,
    text: 'Little interest or pleasure in doing things',
    options: [
      { value: 0, text: 'Not at all' },
      { value: 1, text: 'Several days' },
      { value: 2, text: 'More than half the days' },
      { value: 3, text: 'Nearly every day' }
    ]
  },
  {
    id: 2,
    text: 'Feeling down, depressed, or hopeless',
    options: [
      { value: 0, text: 'Not at all' },
      { value: 1, text: 'Several days' },
      { value: 2, text: 'More than half the days' },
      { value: 3, text: 'Nearly every day' }
    ]
  },
  {
    id: 3,
    text: 'Trouble falling or staying asleep, or sleeping too much',
    options: [
      { value: 0, text: 'Not at all' },
      { value: 1, text: 'Several days' },
      { value: 2, text: 'More than half the days' },
      { value: 3, text: 'Nearly every day' }
    ]
  },
  {
    id: 4,
    text: 'Feeling tired or having little energy',
    options: [
      { value: 0, text: 'Not at all' },
      { value: 1, text: 'Several days' },
      { value: 2, text: 'More than half the days' },
      { value: 3, text: 'Nearly every day' }
    ]
  },
  {
    id: 5,
    text: 'Poor appetite or overeating',
    options: [
      { value: 0, text: 'Not at all' },
      { value: 1, text: 'Several days' },
      { value: 2, text: 'More than half the days' },
      { value: 3, text: 'Nearly every day' }
    ]
  },
  {
    id: 6,
    text: 'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
    options: [
      { value: 0, text: 'Not at all' },
      { value: 1, text: 'Several days' },
      { value: 2, text: 'More than half the days' },
      { value: 3, text: 'Nearly every day' }
    ]
  },
  {
    id: 7,
    text: 'Trouble concentrating on things, such as reading the newspaper or watching television',
    options: [
      { value: 0, text: 'Not at all' },
      { value: 1, text: 'Several days' },
      { value: 2, text: 'More than half the days' },
      { value: 3, text: 'Nearly every day' }
    ]
  },
  {
    id: 8,
    text: 'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual',
    options: [
      { value: 0, text: 'Not at all' },
      { value: 1, text: 'Several days' },
      { value: 2, text: 'More than half the days' },
      { value: 3, text: 'Nearly every day' }
    ]
  },
  {
    id: 9,
    text: 'Thoughts that you would be better off dead or of hurting yourself in some way',
    options: [
      { value: 0, text: 'Not at all' },
      { value: 1, text: 'Several days' },
      { value: 2, text: 'More than half the days' },
      { value: 3, text: 'Nearly every day' }
    ]
  }
];

export const PHQ9Screen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<PHQ9ScreenRouteProp>();
  const { context = 'standalone', returnTo } = route.params || {};

  const {
    currentAssessment,
    startAssessment,
    answerQuestion,
    goToPreviousQuestion,
    saveAssessment,
    calculateScore,
    crisisDetected,
    setCrisisDetected,
    clearCurrentAssessment
  } = useAssessmentStore();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(9).fill(null));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize assessment on mount
  useEffect(() => {
    startAssessment('phq9', context);
    setCrisisDetected(false);
  }, [startAssessment, context, setCrisisDetected]);

  // Sync with store state
  useEffect(() => {
    if (currentAssessment?.answers) {
      setAnswers(currentAssessment.answers);
      setCurrentQuestionIndex(currentAssessment.currentQuestion || 0);
    }
  }, [currentAssessment]);

  const currentQuestion = PHQ9_QUESTIONS[currentQuestionIndex];
  const selectedAnswer = answers[currentQuestionIndex];

  // CRITICAL: Real-time crisis detection for Question 9 (suicidal ideation)
  const handleAnswerSelect = useCallback(async (answer: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = answer;
    setAnswers(newAnswers);

    // IMMEDIATE crisis detection for Question 9 (suicidal ideation)
    if (currentQuestionIndex === 8 && answer >= 1) {
      setCrisisDetected(true);

      // IMMEDIATE intervention alert
      setTimeout(() => {
        Alert.alert(
          'Immediate Support Available',
          'We notice you may be having difficult thoughts. Crisis support is available 24/7.',
          [
            {
              text: 'Call 988 Now',
              onPress: async () => {
                try {
                  const { Linking } = await import('react-native');
                  await Linking.openURL('tel:988');
                } catch (error) {
                  Alert.alert('Call 988', 'Please dial 988 for immediate crisis support.');
                }
              },
              style: 'default'
            },
            {
              text: 'Crisis Resources',
              onPress: () => navigation.navigate('CrisisInterventionScreen' as never)
            },
            {
              text: 'Continue Assessment',
              style: 'cancel'
            }
          ],
          { cancelable: true }
        );
      }, 100);
    }

    // Real-time score monitoring for crisis thresholds (after sufficient answers)
    if (currentQuestionIndex >= 3) {
      const currentTotal = newAnswers.slice(0, currentQuestionIndex + 1).reduce((sum, a) => sum + (a || 0), 0);
      const projectedScore = Math.round((currentTotal / (currentQuestionIndex + 1)) * 9);

      if (projectedScore >= CRISIS_THRESHOLDS.PHQ9_SEVERE) {
        setCrisisDetected(true);
        console.log('🚨 PHQ-9 Crisis threshold detected during assessment');
      }
    }

    // Update store
    await answerQuestion(answer);
  }, [currentQuestionIndex, answers, answerQuestion, setCrisisDetected, navigation]);

  const handleNext = useCallback(() => {
    if (currentQuestionIndex < PHQ9_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleCompleteAssessment();
    }
  }, [currentQuestionIndex]);

  const handleBack = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      goToPreviousQuestion();
    }
  }, [currentQuestionIndex, goToPreviousQuestion]);

  const handleCompleteAssessment = useCallback(async () => {
    if (answers.some(answer => answer === null || answer === undefined)) {
      Alert.alert('Incomplete Assessment', 'Please answer all questions before completing the assessment.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate final score for results navigation
      const finalScore = calculateScore('phq9', answers.filter(a => a !== null) as number[]);

      // Save assessment
      await saveAssessment();

      // Navigate to results
      navigation.navigate('AssessmentResults' as never, {
        type: 'phq9',
        score: finalScore,
        context,
        returnTo
      } as never);

    } catch (error) {
      console.error('Failed to complete PHQ-9 assessment:', error);
      Alert.alert('Error', 'Failed to save assessment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, calculateScore, saveAssessment, navigation, context, returnTo]);

  const handleExit = useCallback(() => {
    Alert.alert(
      'Exit Assessment',
      'Your progress will be lost. Are you sure you want to exit?',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Exit',
          onPress: () => {
            clearCurrentAssessment();
            if (returnTo) {
              navigation.navigate(returnTo as never);
            } else {
              navigation.goBack();
            }
          },
          style: 'destructive'
        }
      ]
    );
  }, [clearCurrentAssessment, navigation, returnTo]);

  const renderAnswerOption = (option: AssessmentOption) => {
    const isSelected = selectedAnswer === option.value;

    return (
      <Button
        key={option.value}
        variant={isSelected ? "primary" : "outline"}
        onPress={() => handleAnswerSelect(option.value)}
        style={[
          styles.answerOption,
          isSelected && styles.answerOptionSelected,
          crisisDetected && currentQuestionIndex === 8 && styles.answerOptionCrisis
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
          <Text style={[
            styles.answerText,
            isSelected && styles.answerTextSelected
          ]}>
            {option.text}
          </Text>
        </View>
      </Button>
    );
  };

  const progress = ((currentQuestionIndex + 1) / PHQ9_QUESTIONS.length) * 100;
  const isLastQuestion = currentQuestionIndex === PHQ9_QUESTIONS.length - 1;

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
              accessibilityLabel="Exit assessment"
              accessibilityHint="Exits the assessment and returns to previous screen"
            >
              ✕
            </Button>

            <View style={styles.headerCenter}>
              <Text style={styles.assessmentTitle}>PHQ-9 Assessment</Text>
              <Text style={styles.assessmentSubtitle}>
                Over the last 2 weeks, how often have you been bothered by:
              </Text>
            </View>
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Question {currentQuestionIndex + 1} of {PHQ9_QUESTIONS.length}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress}%`,
                    backgroundColor: crisisDetected ? colorSystem.status.critical : colorSystem.status.info
                  }
                ]}
              />
            </View>
          </View>

          {/* Crisis Alert Banner */}
          {crisisDetected && (
            <View style={styles.crisisAlert}>
              <Text style={styles.crisisAlertText}>
                🆘 Crisis support resources are available 24/7
              </Text>
              <Button
                variant="crisis"
                emergency={true}
                onPress={() => navigation.navigate('CrisisInterventionScreen' as never)}
                style={styles.crisisAlertButton}
              >
                View Resources
              </Button>
            </View>
          )}

          {/* Question */}
          <View style={styles.questionContainer}>
            <Text style={styles.questionNumber}>
              {currentQuestionIndex + 1}.
            </Text>
            <Text style={[
              styles.questionText,
              currentQuestionIndex === 8 && styles.questionTextCritical
            ]}>
              {currentQuestion.text}
            </Text>
          </View>

          {/* Answer Options */}
          <View style={styles.answersContainer}>
            {currentQuestion.options.map(renderAnswerOption)}
          </View>

          {/* Clinical Note */}
          <View style={styles.clinicalNote}>
            <Text style={styles.clinicalNoteText}>
              💡 Please answer honestly based on how you've been feeling over the last 2 weeks.
              There are no right or wrong answers.
            </Text>
          </View>

          {/* Special Note for Question 9 */}
          {currentQuestionIndex === 8 && (
            <View style={styles.sensitiveQuestionNote}>
              <Text style={styles.sensitiveQuestionNoteText}>
                🔒 This question addresses sensitive content. If you're experiencing difficult thoughts,
                immediate support is available through the crisis resources.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        <Button
          variant="outline"
          onPress={handleBack}
          disabled={currentQuestionIndex === 0}
          style={styles.backButton}
          accessibilityLabel="Go to previous question"
        >
          Back
        </Button>

        <Button
          onPress={handleNext}
          disabled={selectedAnswer === null}
          loading={isSubmitting}
          style={[
            styles.nextButton,
            {
              backgroundColor: selectedAnswer !== null
                ? (crisisDetected ? colorSystem.status.critical : colorSystem.status.info)
                : colorSystem.gray[300]
            }
          ]}
          accessibilityLabel={isLastQuestion ? 'Complete assessment' : 'Continue to next question'}
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
  questionContainer: {
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  questionNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.gray[700],
    marginRight: spacing.sm,
    marginTop: 2,
  },
  questionText: {
    flex: 1,
    fontSize: 18,
    color: colorSystem.base.black,
    lineHeight: 26,
    fontWeight: '500',
  },
  questionTextCritical: {
    color: colorSystem.status.critical,
  },
  answersContainer: {
    marginBottom: spacing.xl,
  },
  answerOption: {
    marginBottom: spacing.sm,
  },
  answerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  answerOptionSelected: {
    borderColor: colorSystem.status.info,
    backgroundColor: colorSystem.gray[100],
  },
  answerOptionCrisis: {
    borderColor: colorSystem.status.critical,
  },
  answerRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colorSystem.gray[400],
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
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
  answerText: {
    fontSize: 16,
    color: colorSystem.base.black,
    flex: 1,
    lineHeight: 22,
  },
  answerTextSelected: {
    fontWeight: '500',
  },
  clinicalNote: {
    backgroundColor: colorSystem.gray[100],
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
  sensitiveQuestionNote: {
    backgroundColor: colorSystem.status.criticalBackground,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.status.critical,
  },
  sensitiveQuestionNoteText: {
    fontSize: 13,
    color: colorSystem.status.critical,
    lineHeight: 18,
    fontWeight: '500',
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

export default PHQ9Screen;