/**
 * GAD7Screen - Complete GAD-7 Anxiety Assessment Implementation
 * Clinical Requirements: Exact wording, 100% scoring accuracy, real-time anxiety monitoring
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

type GAD7ScreenParams = {
  GAD7Screen: {
    context?: 'onboarding' | 'standalone' | 'clinical';
    returnTo?: string;
  };
};

type GAD7ScreenRouteProp = RouteProp<GAD7ScreenParams, 'GAD7Screen'>;

// CLINICAL REQUIREMENT: Exact GAD-7 question wording - DO NOT MODIFY
const GAD7_QUESTIONS: AssessmentQuestion[] = [
  {
    id: 1,
    text: 'Feeling nervous, anxious, or on edge',
    options: [
      { value: 0, text: 'Not at all' },
      { value: 1, text: 'Several days' },
      { value: 2, text: 'More than half the days' },
      { value: 3, text: 'Nearly every day' }
    ]
  },
  {
    id: 2,
    text: 'Not being able to stop or control worrying',
    options: [
      { value: 0, text: 'Not at all' },
      { value: 1, text: 'Several days' },
      { value: 2, text: 'More than half the days' },
      { value: 3, text: 'Nearly every day' }
    ]
  },
  {
    id: 3,
    text: 'Worrying too much about different things',
    options: [
      { value: 0, text: 'Not at all' },
      { value: 1, text: 'Several days' },
      { value: 2, text: 'More than half the days' },
      { value: 3, text: 'Nearly every day' }
    ]
  },
  {
    id: 4,
    text: 'Trouble relaxing',
    options: [
      { value: 0, text: 'Not at all' },
      { value: 1, text: 'Several days' },
      { value: 2, text: 'More than half the days' },
      { value: 3, text: 'Nearly every day' }
    ]
  },
  {
    id: 5,
    text: 'Being so restless that it\'s hard to sit still',
    options: [
      { value: 0, text: 'Not at all' },
      { value: 1, text: 'Several days' },
      { value: 2, text: 'More than half the days' },
      { value: 3, text: 'Nearly every day' }
    ]
  },
  {
    id: 6,
    text: 'Becoming easily annoyed or irritable',
    options: [
      { value: 0, text: 'Not at all' },
      { value: 1, text: 'Several days' },
      { value: 2, text: 'More than half the days' },
      { value: 3, text: 'Nearly every day' }
    ]
  },
  {
    id: 7,
    text: 'Feeling afraid as if something awful might happen',
    options: [
      { value: 0, text: 'Not at all' },
      { value: 1, text: 'Several days' },
      { value: 2, text: 'More than half the days' },
      { value: 3, text: 'Nearly every day' }
    ]
  }
];

export const GAD7Screen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<GAD7ScreenRouteProp>();
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
  const [answers, setAnswers] = useState<number[]>(new Array(7).fill(null));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [anxietyLevel, setAnxietyLevel] = useState<'minimal' | 'mild' | 'moderate' | 'severe'>('minimal');

  // Initialize assessment on mount
  useEffect(() => {
    startAssessment('gad7', context);
    setCrisisDetected(false);
  }, [startAssessment, context, setCrisisDetected]);

  // Sync with store state
  useEffect(() => {
    if (currentAssessment?.answers) {
      setAnswers(currentAssessment.answers);
      setCurrentQuestionIndex(currentAssessment.currentQuestion || 0);
    }
  }, [currentAssessment]);

  const currentQuestion = GAD7_QUESTIONS[currentQuestionIndex];
  const selectedAnswer = answers[currentQuestionIndex];

  // Real-time anxiety level monitoring and crisis detection
  const handleAnswerSelect = useCallback(async (answer: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = answer;
    setAnswers(newAnswers);

    // Real-time anxiety level calculation
    if (currentQuestionIndex >= 2) {
      const currentTotal = newAnswers.slice(0, currentQuestionIndex + 1).reduce((sum, a) => sum + (a || 0), 0);
      const projectedScore = Math.round((currentTotal / (currentQuestionIndex + 1)) * 7);

      let newAnxietyLevel: 'minimal' | 'mild' | 'moderate' | 'severe' = 'minimal';
      if (projectedScore <= 4) newAnxietyLevel = 'minimal';
      else if (projectedScore <= 9) newAnxietyLevel = 'mild';
      else if (projectedScore <= 14) newAnxietyLevel = 'moderate';
      else newAnxietyLevel = 'severe';

      setAnxietyLevel(newAnxietyLevel);

      // Crisis detection for severe anxiety
      if (projectedScore >= CRISIS_THRESHOLDS.GAD7_SEVERE) {
        setCrisisDetected(true);
        console.log('🚨 GAD-7 Severe anxiety threshold detected');

        // Alert for severe anxiety (less urgent than suicidal ideation but still important)
        if (currentQuestionIndex >= 4) { // Only after sufficient questions
          setTimeout(() => {
            Alert.alert(
              'High Anxiety Detected',
              'Your responses suggest significant anxiety. Support resources are available.',
              [
                {
                  text: 'Anxiety Resources',
                  onPress: () => navigation.navigate('CrisisInterventionScreen' as never),
                  style: 'default'
                },
                {
                  text: 'Breathing Exercise',
                  onPress: () => {
                    Alert.alert(
                      'Quick Calm',
                      'Would you like to try a 3-minute breathing exercise to help manage anxiety?',
                      [
                        { text: 'Not Now', style: 'cancel' },
                        { text: 'Yes, Help Me Calm', onPress: () => {
                          // Navigate to breathing exercise
                          console.log('Navigate to breathing exercise');
                        }}
                      ]
                    );
                  }
                },
                {
                  text: 'Continue Assessment',
                  style: 'cancel'
                }
              ],
              { cancelable: true }
            );
          }, 200);
        }
      }
    }

    // Update store
    await answerQuestion(answer);
  }, [currentQuestionIndex, answers, answerQuestion, setCrisisDetected, navigation]);

  const handleNext = useCallback(() => {
    if (currentQuestionIndex < GAD7_QUESTIONS.length - 1) {
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
      const finalScore = calculateScore('gad7', answers.filter(a => a !== null) as number[]);

      // Save assessment
      await saveAssessment();

      // Navigate to results
      navigation.navigate('AssessmentResults' as never, {
        type: 'gad7',
        score: finalScore,
        context,
        returnTo
      } as never);

    } catch (error) {
      console.error('Failed to complete GAD-7 assessment:', error);
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
          anxietyLevel === 'severe' && isSelected && styles.answerOptionHighAnxiety
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

  const progress = ((currentQuestionIndex + 1) / GAD7_QUESTIONS.length) * 100;
  const isLastQuestion = currentQuestionIndex === GAD7_QUESTIONS.length - 1;

  const getAnxietyLevelColor = () => {
    switch (anxietyLevel) {
      case 'minimal': return colorSystem.status.success;
      case 'mild': return colorSystem.status.info;
      case 'moderate': return colorSystem.status.warning;
      case 'severe': return colorSystem.status.critical;
    }
  };

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
              <Text style={styles.assessmentTitle}>GAD-7 Assessment</Text>
              <Text style={styles.assessmentSubtitle}>
                Over the last 2 weeks, how often have you been bothered by:
              </Text>
            </View>
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Question {currentQuestionIndex + 1} of {GAD7_QUESTIONS.length}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress}%`,
                    backgroundColor: getAnxietyLevelColor()
                  }
                ]}
              />
            </View>
          </View>

          {/* Real-time Anxiety Level Indicator */}
          {currentQuestionIndex >= 2 && (
            <View style={[styles.anxietyLevelIndicator, { borderLeftColor: getAnxietyLevelColor() }]}>
              <Text style={styles.anxietyLevelLabel}>Current Anxiety Level:</Text>
              <Text style={[styles.anxietyLevelText, { color: getAnxietyLevelColor() }]}>
                {anxietyLevel.charAt(0).toUpperCase() + anxietyLevel.slice(1)}
              </Text>
            </View>
          )}

          {/* Crisis Alert Banner */}
          {crisisDetected && (
            <View style={styles.anxietyAlert}>
              <Text style={styles.anxietyAlertText}>
                🧘‍♀️ Anxiety support resources and calming exercises are available
              </Text>
              <Button
                variant="secondary"
                onPress={() => navigation.navigate('CrisisInterventionScreen' as never)}
                style={styles.anxietyAlertButton}
                haptic={true}
              >
                Get Support
              </Button>
            </View>
          )}

          {/* Question */}
          <View style={styles.questionContainer}>
            <Text style={styles.questionNumber}>
              {currentQuestionIndex + 1}.
            </Text>
            <Text style={styles.questionText}>
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
              Anxiety is treatable and support is available.
            </Text>
          </View>

          {/* Anxiety-specific guidance */}
          {anxietyLevel === 'moderate' || anxietyLevel === 'severe' ? (
            <View style={styles.anxietyGuidance}>
              <Text style={styles.anxietyGuidanceText}>
                🌟 Remember: Anxiety is a common experience, and effective treatments are available.
                Consider speaking with a healthcare professional for personalized support.
              </Text>
            </View>
          ) : null}
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
                ? getAnxietyLevelColor()
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
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: colorSystem.gray[200],
  },
  exitButtonText: {
    fontSize: 18,
    color: colorSystem.gray[600],
    fontWeight: '600',
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
  anxietyLevelIndicator: {
    backgroundColor: colorSystem.gray[50],
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    borderLeftWidth: 4,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  anxietyLevelLabel: {
    fontSize: 14,
    color: colorSystem.gray[700],
    fontWeight: '500',
  },
  anxietyLevelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  anxietyAlert: {
    backgroundColor: colorSystem.status.warningBackground,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.status.warning,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  anxietyAlertText: {
    flex: 1,
    fontSize: 14,
    color: colorSystem.status.warning,
    fontWeight: '500',
  },
  anxietyAlertButton: {
    backgroundColor: colorSystem.status.warning,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.small,
  },
  anxietyAlertButtonText: {
    color: colorSystem.base.white,
    fontSize: 12,
    fontWeight: '600',
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
  answerOptionHighAnxiety: {
    borderColor: colorSystem.status.warning,
    backgroundColor: colorSystem.status.warningBackground,
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
  anxietyGuidance: {
    backgroundColor: colorSystem.status.infoBackground,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.status.info,
  },
  anxietyGuidanceText: {
    fontSize: 13,
    color: colorSystem.status.info,
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

export default GAD7Screen;