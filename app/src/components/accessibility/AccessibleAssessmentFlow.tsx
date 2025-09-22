/**
 * AccessibleAssessmentFlow - Enhanced PHQ-9/GAD-7 with Therapeutic Accessibility
 *
 * CLINICAL ACCESSIBILITY REQUIREMENTS:
 * - Voice-guided question navigation for motor accessibility
 * - Anxiety-aware pacing with optional extended timeouts
 * - Depression-supportive encouraging feedback between questions
 * - Trauma-informed predictable progression and safe exit options
 * - Cognitive accessibility with simplified language options
 * - Screen reader optimized clinical content presentation
 * - Crisis detection with immediate accessible intervention
 * - WCAG AA compliance with therapeutic enhancement (4.5:1+ contrast)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  AccessibilityInfo,
  Alert,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../core';
import { AssessmentQuestion, AssessmentOption } from '../../types';
import { colorSystem, spacing, borderRadius } from '../../constants/colors';
import { useTherapeuticAccessibility } from './TherapeuticAccessibilityProvider';
import { AccessibleCrisisButton } from './AccessibleCrisisButton';

interface AccessibleAssessmentFlowProps {
  type: 'phq9' | 'gad7';
  questions: AssessmentQuestion[];
  onComplete: (score: number, answers: number[]) => void;
  onCancel: () => void;
  currentQuestionIndex?: number;
  answers?: (number | null)[];
  // Accessibility enhancements
  anxietySupport?: boolean;
  depressionSupport?: boolean;
  cognitiveSupport?: boolean;
  traumaInformed?: boolean;
  voiceNavigation?: boolean;
  simplifiedLanguage?: boolean;
  extendedTimeouts?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

// Therapeutic timing constants for accessibility
const THERAPEUTIC_TIMING = {
  STANDARD_TIMEOUT: 30000, // 30 seconds standard
  EXTENDED_TIMEOUT: 60000, // 60 seconds for cognitive support
  ENCOURAGEMENT_DELAY: 2000, // 2 seconds before encouragement
  PROGRESS_ANNOUNCEMENT_DELAY: 1500, // 1.5 seconds for progress
};

export const AccessibleAssessmentFlow: React.FC<AccessibleAssessmentFlowProps> = ({
  type,
  questions,
  onComplete,
  onCancel,
  currentQuestionIndex = 0,
  answers = [],
  anxietySupport = true,
  depressionSupport = true,
  cognitiveSupport = true,
  traumaInformed = true,
  voiceNavigation = true,
  simplifiedLanguage = false,
  extendedTimeouts = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(currentQuestionIndex);
  const [currentAnswers, setCurrentAnswers] = useState<(number | null)[]>(
    answers.length > 0 ? answers : new Array(questions.length).fill(null)
  );
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [crisisDetected, setCrisisDetected] = useState(false);

  // References for accessibility focus
  const questionRef = useRef<Text>(null);
  const progressRef = useRef<Text>(null);
  const firstOptionRef = useRef<TouchableOpacity>(null);

  // Therapeutic Accessibility Context
  const {
    anxietyAdaptationsEnabled,
    depressionSupportMode,
    crisisEmergencyMode,
    cognitiveAccessibilityLevel,
    isScreenReaderEnabled,
    assessmentInProgress,
    announceForTherapy,
    provideAssessmentGuidance,
    provideTharapeuticFeedback,
    setTherapeuticFocus,
    activateEmergencyCrisisAccess,
  } = useTherapeuticAccessibility();

  // Animation values for therapeutic feedback
  const progressValue = useSharedValue(0);
  const questionOpacity = useSharedValue(1);
  const encouragementScale = useSharedValue(0);

  const currentQuestion = questions[currentIndex];
  const isFirstQuestion = currentIndex === 0;
  const isLastQuestion = currentIndex === questions.length - 1;
  const progressPercentage = ((currentIndex + 1) / questions.length) * 100;

  // Initialize assessment accessibility state
  useEffect(() => {
    // Mark assessment as in progress for accessibility context
    if (typeof assessmentInProgress === 'function') {
      assessmentInProgress(true);
    }

    // Set initial progress animation
    progressValue.value = withTiming(progressPercentage / 100, { duration: 800 });

    return () => {
      if (typeof assessmentInProgress === 'function') {
        assessmentInProgress(false);
      }
    };
  }, []);

  // Question transition with accessibility announcements
  useEffect(() => {
    const handleQuestionTransition = async () => {
      setQuestionStartTime(Date.now());
      setShowEncouragement(false);

      // Announce question for screen readers
      if (isScreenReaderEnabled && currentQuestion) {
        await provideAssessmentGuidance(
          currentIndex + 1,
          questions.length,
          simplifiedLanguage ? simplifyQuestionText(currentQuestion.text) : currentQuestion.text
        );
      }

      // Set focus to question
      if (questionRef.current) {
        setTimeout(() => {
          setTherapeuticFocus(questionRef, 'assessment question');
        }, 500);
      }

      // Update progress animation
      progressValue.value = withTiming(progressPercentage / 100, { duration: 600 });

      // Question transition animation
      questionOpacity.value = withTiming(0, { duration: 200 }, () => {
        questionOpacity.value = withTiming(1, { duration: 400 });
      });

      // Show encouragement after delay for anxiety/depression support
      if ((anxietySupport && anxietyAdaptationsEnabled) || (depressionSupport && depressionSupportMode)) {
        setTimeout(() => {
          setShowEncouragement(true);
          encouragementScale.value = withSpring(1, { damping: 15, stiffness: 200 });
        }, THERAPEUTIC_TIMING.ENCOURAGEMENT_DELAY);
      }
    };

    handleQuestionTransition();
  }, [currentIndex, currentQuestion, isScreenReaderEnabled, anxietySupport, depressionSupport]);

  // Crisis detection for PHQ-9/GAD-7 critical responses
  const detectCrisis = useCallback((questionIndex: number, answer: number) => {
    const isCriticalQuestion = (type === 'phq9' && questionIndex === 8) || // PHQ-9 question 9 (suicidal ideation)
                              (type === 'gad7' && questionIndex === 6); // GAD-7 question 7 (severe anxiety)

    const isCriticalAnswer = answer >= 2; // "More than half the days" or higher

    if (isCriticalQuestion && isCriticalAnswer) {
      setCrisisDetected(true);
      return true;
    }

    // Check for overall high scores indicating crisis
    const answeredQuestions = currentAnswers.slice(0, questionIndex + 1);
    const currentScore = answeredQuestions.reduce((sum, ans) => sum + (ans || 0), 0);
    const maxPossibleScore = (questionIndex + 1) * 3;
    const scorePercentage = currentScore / maxPossibleScore;

    if (scorePercentage >= 0.7 && questionIndex >= Math.floor(questions.length / 2)) {
      setCrisisDetected(true);
      return true;
    }

    return false;
  }, [type, currentAnswers, questions.length]);

  // Handle crisis intervention
  const handleCrisisIntervention = useCallback(async () => {
    await activateEmergencyCrisisAccess('assessment_crisis_detection');

    await announceForTherapy(
      'Crisis support has been activated based on your responses. Your safety is our priority. Professional help is available immediately.',
      'emergency'
    );

    Alert.alert(
      'Crisis Support Available',
      'Based on your responses, we want to ensure you have immediate access to professional support. Crisis counselors are available 24/7.',
      [
        {
          text: 'Call 988 Now',
          onPress: async () => {
            try {
              const { Linking } = require('react-native');
              await Linking.openURL('tel:988');
            } catch (error) {
              console.error('Failed to call 988:', error);
            }
          },
          style: 'default'
        },
        {
          text: 'Continue Assessment',
          onPress: () => {
            // Allow continuing with crisis mode active
          },
          style: 'cancel'
        }
      ],
      { cancelable: false }
    );
  }, [activateEmergencyCrisisAccess, announceForTherapy]);

  // Simplify question text for cognitive accessibility
  const simplifyQuestionText = useCallback((text: string): string => {
    const simplifications: Record<string, string> = {
      'Over the last 2 weeks': 'In the past 2 weeks',
      'how often have you been bothered by': 'how often did you feel',
      'Little interest or pleasure in doing things': 'Not enjoying activities you used to like',
      'Feeling down, depressed, or hopeless': 'Feeling sad or without hope',
      'Trouble falling or staying asleep, or sleeping too much': 'Problems with sleep',
      'Feeling tired or having little energy': 'Feeling tired or low energy',
      'Poor appetite or overeating': 'Changes in eating habits',
      'Feeling bad about yourself': 'Feeling bad about yourself',
      'Trouble concentrating': 'Difficulty focusing',
      'Moving or speaking slowly': 'Moving or talking slowly',
      'Thoughts that you would be better off dead': 'Thoughts about death or not wanting to be alive',
    };

    let simplified = text;
    Object.entries(simplifications).forEach(([complex, simple]) => {
      simplified = simplified.replace(complex, simple);
    });

    return simplified;
  }, []);

  // Handle answer selection with accessibility support
  const handleAnswerSelect = useCallback(async (answer: number) => {
    // Provide therapeutic feedback for selection
    if (anxietySupport && anxietyAdaptationsEnabled) {
      await provideTharapeuticFeedback('encouraging');
    }

    // Update answers
    const newAnswers = [...currentAnswers];
    newAnswers[currentIndex] = answer;
    setCurrentAnswers(newAnswers);

    // Check for crisis
    const isCrisis = detectCrisis(currentIndex, answer);
    if (isCrisis && !crisisDetected) {
      await handleCrisisIntervention();
    }

    // Auto-advance after brief delay for cognitive processing
    const delay = cognitiveSupport && cognitiveAccessibilityLevel === 'maximum' ? 1500 : 800;
    setTimeout(() => {
      handleNext();
    }, delay);
  }, [
    currentAnswers,
    currentIndex,
    anxietySupport,
    anxietyAdaptationsEnabled,
    cognitiveSupport,
    cognitiveAccessibilityLevel,
    detectCrisis,
    crisisDetected,
    handleCrisisIntervention,
    provideTharapeuticFeedback
  ]);

  // Handle navigation with therapeutic support
  const handleNext = useCallback(async () => {
    if (isLastQuestion) {
      // Assessment complete
      const finalScore = currentAnswers.reduce((total, answer) => total + (answer || 0), 0);

      if (depressionSupport && depressionSupportMode) {
        await provideTharapeuticFeedback('celebrating');
        await announceForTherapy(
          'You\'ve completed the assessment. Taking this step shows strength and self-awareness.',
          'polite'
        );
      }

      onComplete(finalScore, currentAnswers as number[]);
    } else {
      // Move to next question
      setCurrentIndex(prev => prev + 1);

      if (depressionSupport && depressionSupportMode && currentIndex % 3 === 0) {
        await provideTharapeuticFeedback('encouraging');
      }
    }
  }, [
    isLastQuestion,
    currentAnswers,
    currentIndex,
    depressionSupport,
    depressionSupportMode,
    onComplete,
    provideTharapeuticFeedback,
    announceForTherapy
  ]);

  const handleBack = useCallback(async () => {
    if (isFirstQuestion) {
      // Trauma-informed cancel confirmation
      Alert.alert(
        `Cancel ${type.toUpperCase()} Assessment?`,
        traumaInformed
          ? 'It\'s okay to stop anytime. Your wellbeing comes first. Would you like to cancel this assessment?'
          : 'Are you sure you want to cancel this assessment? Your progress will be lost.',
        [
          {
            text: 'Continue Assessment',
            style: 'cancel'
          },
          {
            text: 'Yes, Cancel',
            style: 'destructive',
            onPress: onCancel
          }
        ]
      );
    } else {
      setCurrentIndex(prev => prev - 1);
    }
  }, [isFirstQuestion, type, traumaInformed, onCancel]);

  // Animated styles
  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }), []);

  const questionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: questionOpacity.value,
  }), []);

  const encouragementAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: encouragementScale.value }],
    opacity: encouragementScale.value,
  }), []);

  // Get therapeutic color scheme
  const getThemeColor = () => {
    if (crisisDetected || crisisEmergencyMode) {
      return colorSystem.status.critical;
    }
    return type === 'phq9' ? colorSystem.status.warning : colorSystem.status.info;
  };

  // Render answer option with accessibility
  const renderAnswerOption = (option: AssessmentOption, index: number) => {
    if (!option || typeof option.value !== 'number' || !option.text) {
      return null;
    }

    const isSelected = currentAnswers[currentIndex] === option.value;
    const themeColor = getThemeColor();

    return (
      <TouchableOpacity
        ref={index === 0 ? firstOptionRef : undefined}
        key={option.value}
        style={[
          styles.answerOption,
          isSelected && { ...styles.answerOptionSelected, borderColor: themeColor },
          anxietySupport && anxietyAdaptationsEnabled && styles.anxietyAnswerOption,
        ]}
        onPress={() => handleAnswerSelect(option.value)}
        activeOpacity={0.8}
        accessible={true}
        accessibilityRole="radio"
        accessibilityState={{
          selected: isSelected,
          checked: isSelected
        }}
        accessibilityLabel={`${option.text}. ${isSelected ? 'Selected' : 'Not selected'}`}
        accessibilityHint={`Answer option ${index + 1} of ${currentQuestion.options?.length}. Double tap to select.`}
      >
        <View style={[
          styles.answerRadio,
          isSelected && { ...styles.answerRadioSelected, borderColor: themeColor },
          anxietySupport && anxietyAdaptationsEnabled && styles.anxietyRadio,
        ]}>
          {isSelected && (
            <View style={[
              styles.answerRadioInner,
              { backgroundColor: themeColor }
            ]} />
          )}
        </View>
        <Text
          style={[
            styles.answerText,
            isSelected && styles.answerTextSelected,
            cognitiveSupport && styles.cognitiveAnswerText,
          ]}
          allowFontScaling={true}
          maxFontSizeMultiplier={1.5}
        >
          {simplifiedLanguage ? option.text.replace(/Not at all/g, 'Never').replace(/Several days/g, 'Sometimes') : option.text}
        </Text>
      </TouchableOpacity>
    );
  };

  if (!currentQuestion) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Assessment question not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Crisis Button - Always Accessible */}
      {(crisisDetected || crisisEmergencyMode) && (
        <AccessibleCrisisButton
          variant="header"
          emergencyMode={true}
          style={styles.crisisButton}
        />
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Progress Indicator with Accessibility */}
          <View style={styles.progressContainer}>
            <Text
              ref={progressRef}
              style={[
                styles.progressText,
                cognitiveSupport && styles.cognitiveProgressText
              ]}
              accessible={true}
              accessibilityRole="progressbar"
              accessibilityLabel={`Assessment progress: ${Math.round(progressPercentage)}% complete`}
              accessibilityValue={{
                min: 0,
                max: 100,
                now: Math.round(progressPercentage),
                text: `Question ${currentIndex + 1} of ${questions.length}`
              }}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.3}
            >
              Question {currentIndex + 1} of {questions.length}
            </Text>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  progressAnimatedStyle,
                  { backgroundColor: getThemeColor() }
                ]}
              />
            </View>
          </View>

          {/* Assessment Header */}
          <View style={styles.header}>
            <Text
              style={[
                styles.assessmentType,
                crisisDetected && styles.crisisAssessmentType
              ]}
              accessible={true}
              accessibilityRole="header"
              accessibilityLevel={1}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.4}
            >
              {type === 'phq9' ? 'PHQ-9 Assessment' : 'GAD-7 Assessment'}
              {crisisDetected && ' - Crisis Support Active'}
            </Text>
            <Text
              style={[
                styles.subtitle,
                cognitiveSupport && styles.cognitiveSubtitle
              ]}
              accessible={true}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.3}
            >
              {simplifiedLanguage
                ? 'Answer based on how you\'ve felt in the past 2 weeks. There are no right or wrong answers.'
                : 'Please answer honestly based on how you have been feeling over the past 2 weeks.'
              }
            </Text>
          </View>

          {/* Question with Therapeutic Animation */}
          <Animated.View style={[styles.questionContainer, questionAnimatedStyle]}>
            <Text
              ref={questionRef}
              style={[
                styles.questionText,
                cognitiveSupport && styles.cognitiveQuestionText,
                crisisDetected && styles.crisisQuestionText
              ]}
              accessible={true}
              accessibilityRole="text"
              accessibilityLabel={`Assessment question: ${simplifiedLanguage ? simplifyQuestionText(currentQuestion.text) : currentQuestion.text}`}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.6}
            >
              {simplifiedLanguage ? simplifyQuestionText(currentQuestion.text) : currentQuestion.text}
            </Text>
          </Animated.View>

          {/* Answer Options with Accessibility */}
          <View
            style={styles.answersContainer}
            accessible={false}
            accessibilityLabel="Answer options"
          >
            {currentQuestion.options?.filter(option => option != null).map((option, index) =>
              renderAnswerOption(option, index)
            )}
          </View>

          {/* Therapeutic Encouragement */}
          {showEncouragement && (anxietySupport || depressionSupport) && (
            <Animated.View style={[styles.encouragementContainer, encouragementAnimatedStyle]}>
              <Text
                style={styles.encouragementText}
                accessible={true}
                accessibilityLiveRegion="polite"
                allowFontScaling={true}
                maxFontSizeMultiplier={1.3}
              >
                {depressionSupport && depressionSupportMode
                  ? '💙 You\'re taking an important step for your mental health. Take your time.'
                  : anxietySupport && anxietyAdaptationsEnabled
                    ? '🌱 There\'s no pressure. Answer when you feel ready.'
                    : '✨ You\'re doing great. Every answer helps us understand how to support you.'
                }
              </Text>
            </Animated.View>
          )}

          {/* Clinical Note with Accessibility */}
          <View style={styles.clinicalNote}>
            <Text
              style={[
                styles.clinicalNoteText,
                cognitiveSupport && styles.cognitiveClinicalNote
              ]}
              accessible={true}
              accessibilityHint="Additional information about the assessment"
              allowFontScaling={true}
              maxFontSizeMultiplier={1.2}
            >
              💡 {simplifiedLanguage
                ? 'Please answer honestly. There are no right or wrong answers. This helps us understand how you\'ve been feeling.'
                : 'Please answer honestly. There are no right or wrong answers - this helps us understand how you\'ve been feeling.'
              }
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Navigation with Accessibility */}
      <View style={styles.navigation}>
        <Button
          variant="outline"
          onPress={handleBack}
          accessibilityLabel={isFirstQuestion ? 'Cancel assessment' : 'Go to previous question'}
          accessibilityHint={isFirstQuestion ? 'Cancels the entire assessment' : 'Returns to the previous assessment question'}
          style={[
            cognitiveSupport && styles.cognitiveButton,
            { minHeight: anxietySupport && anxietyAdaptationsEnabled ? 56 : 48 }
          ]}
        >
          {isFirstQuestion ? 'Cancel' : 'Back'}
        </Button>

        <Button
          onPress={handleNext}
          disabled={currentAnswers[currentIndex] === null}
          accessibilityLabel={isLastQuestion ? 'Complete assessment' : 'Continue to next question'}
          accessibilityHint={
            currentAnswers[currentIndex] === null
              ? 'Please select an answer to continue'
              : isLastQuestion
                ? 'Completes the assessment and shows results'
                : 'Proceeds to the next assessment question'
          }
          style={[
            styles.nextButton,
            {
              backgroundColor: currentAnswers[currentIndex] !== null ? getThemeColor() : colorSystem.gray[300],
              minHeight: anxietySupport && anxietyAdaptationsEnabled ? 56 : 48
            },
            cognitiveSupport && styles.cognitiveButton,
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
  crisisButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.lg,
    zIndex: 1000,
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
    fontWeight: '500',
  },
  cognitiveProgressText: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.gray[700],
  },
  progressBar: {
    height: 6,
    backgroundColor: colorSystem.gray[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  header: {
    marginBottom: spacing.xl,
  },
  assessmentType: {
    fontSize: 20,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.sm,
    lineHeight: 28,
  },
  crisisAssessmentType: {
    color: colorSystem.status.critical,
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    color: colorSystem.gray[600],
    lineHeight: 24,
  },
  cognitiveSubtitle: {
    fontSize: 18,
    lineHeight: 26,
    color: colorSystem.gray[700],
  },
  questionContainer: {
    marginBottom: spacing.lg,
  },
  questionText: {
    fontSize: 18,
    color: colorSystem.base.black,
    lineHeight: 28,
    fontWeight: '500',
  },
  cognitiveQuestionText: {
    fontSize: 20,
    lineHeight: 32,
    fontWeight: '600',
  },
  crisisQuestionText: {
    fontSize: 19,
    color: colorSystem.status.critical,
    fontWeight: '600',
  },
  answersContainer: {
    marginBottom: spacing.xl,
  },
  answerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.medium,
    borderWidth: 2,
    borderColor: colorSystem.gray[300],
    backgroundColor: colorSystem.base.white,
    minHeight: 56,
  },
  anxietyAnswerOption: {
    minHeight: 64,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  answerOptionSelected: {
    backgroundColor: colorSystem.gray[50],
    borderWidth: 2,
  },
  answerRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colorSystem.gray[400],
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  anxietyRadio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
  },
  answerRadioSelected: {
    borderWidth: 2,
  },
  answerRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  answerText: {
    fontSize: 16,
    color: colorSystem.base.black,
    flex: 1,
    lineHeight: 24,
  },
  cognitiveAnswerText: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '500',
  },
  answerTextSelected: {
    fontWeight: '600',
  },
  encouragementContainer: {
    backgroundColor: colorSystem.status.successBackground,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.status.success,
  },
  encouragementText: {
    fontSize: 14,
    color: colorSystem.status.success,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
  clinicalNote: {
    backgroundColor: colorSystem.gray[100],
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
  cognitiveClinicalNote: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    fontStyle: 'normal',
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
  cognitiveButton: {
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.large,
  },
  errorText: {
    fontSize: 16,
    color: colorSystem.status.error,
    textAlign: 'center',
    margin: spacing.lg,
  },
});

export default AccessibleAssessmentFlow;