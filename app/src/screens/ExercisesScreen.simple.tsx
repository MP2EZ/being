/**
 * Simple Exercises Screen - Minimal implementation
 * Direct PHQ-9/GAD-7 assessments with shared components
 * Uses RadioGroup for WCAG-AA compliant accessibility
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PHQ9_QUESTIONS, GAD7_QUESTIONS } from '../flows/assessment/types/questions';
import { RadioGroup } from '../components/accessibility';
import type { RadioOption } from '../components/accessibility';

// Hardcoded colors - no dynamic theme system
const colors = {
  white: '#FFFFFF',
  black: '#1C1C1C',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  midnightBlue: '#1B2951',
  morningPrimary: '#FF9F43',
  eveningPrimary: '#4A7C59',
};

const spacing = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

// NOTE: PHQ9_QUESTIONS and GAD7_QUESTIONS now imported from shared assessment types
// This eliminates duplication and ensures clinical accuracy across the app

// Response options in RadioOption format (clinically validated)
const RESPONSE_OPTIONS: RadioOption[] = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' },
  { value: 3, label: 'Nearly every day' },
];

type AssessmentType = 'phq9' | 'gad7';
type Screen = 'menu' | 'intro' | 'assessment' | 'results';

interface Answer {
  questionId: string;
  response: number;
}

const ExercisesScreen: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('menu');
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('phq9');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);

  const questions = assessmentType === 'phq9' ? PHQ9_QUESTIONS : GAD7_QUESTIONS;
  const currentQuestion = questions[currentQuestionIndex];

  const handleStartAssessment = (type: AssessmentType) => {
    setAssessmentType(type);
    setCurrentScreen('intro');
    setCurrentQuestionIndex(0);
    setAnswers([]);
  };

  const handleBeginAssessment = () => {
    setCurrentScreen('assessment');
  };

  const handleAnswer = (response: number) => {
    const newAnswer: Answer = {
      questionId: currentQuestion.id,
      response,
    };

    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);

    // Move to next question or results
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setCurrentScreen('results');
    }
  };

  const calculateResults = () => {
    const totalScore = answers.reduce((sum, answer) => sum + answer.response, 0);

    if (assessmentType === 'phq9') {
      // Check for crisis conditions: PHQ≥20 or suicidal ideation (question 9)
      const question9Answer = answers.find(a => a.questionId === 'phq9_9');
      const suicidalIdeation = question9Answer ? question9Answer.response > 0 : false;
      const isCrisis = totalScore >= 20 || suicidalIdeation;

      let severity = 'minimal';
      if (totalScore <= 4) severity = 'minimal';
      else if (totalScore <= 9) severity = 'mild';
      else if (totalScore <= 14) severity = 'moderate';
      else if (totalScore <= 19) severity = 'moderately severe';
      else severity = 'severe';

      return { totalScore, severity, isCrisis, suicidalIdeation };
    } else {
      // GAD-7: Crisis at ≥15
      const isCrisis = totalScore >= 15;

      let severity = 'minimal';
      if (totalScore <= 4) severity = 'minimal';
      else if (totalScore <= 9) severity = 'mild';
      else if (totalScore <= 14) severity = 'moderate';
      else severity = 'severe';

      return { totalScore, severity, isCrisis };
    }
  };

  const handleComplete = () => {
    setCurrentScreen('menu');
  };

  const showCrisisAlert = () => {
    Alert.alert(
      'Crisis Resources Available',
      'If you are in immediate danger, please call 911.\n\nFor crisis support:\n• Call 988 (Suicide & Crisis Lifeline)\n• Text "HELLO" to 741741 (Crisis Text Line)',
      [{ text: 'OK', onPress: handleComplete }],
      { cancelable: false }
    );
  };

  const renderMenu = () => (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Mindful Exercises</Text>
          <Text style={styles.subtitle}>
            Self-assessment tools to support your wellbeing journey
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mental Health Assessments</Text>

          <Pressable
            style={styles.assessmentCard}
            onPress={() => handleStartAssessment('phq9')}
          >
            <Text style={styles.cardTitle}>Depression Assessment (PHQ-9)</Text>
            <Text style={styles.cardDescription}>
              A 9-question assessment to help you understand your mood patterns over the past two weeks.
            </Text>
            <Text style={styles.cardDuration}>3-5 minutes</Text>
          </Pressable>

          <Pressable
            style={styles.assessmentCard}
            onPress={() => handleStartAssessment('gad7')}
          >
            <Text style={styles.cardTitle}>Anxiety Assessment (GAD-7)</Text>
            <Text style={styles.cardDescription}>
              A 7-question assessment to help you observe your relationship with worry and anxiety.
            </Text>
            <Text style={styles.cardDuration}>2-4 minutes</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  const renderIntro = () => (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {assessmentType === 'phq9' ? 'Mood Assessment' : 'Anxiety Assessment'}
          </Text>
          <Text style={styles.subtitle}>
            {assessmentType === 'phq9'
              ? 'A gentle check-in with your recent experiences'
              : 'Noticing your relationship with worry and tension'
            }
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.bodyText}>
            Over the last 2 weeks, how often have you been bothered by any of the following problems?
          </Text>
          <Text style={styles.bodyText}>
            There are no right or wrong answers. Simply notice what feels true for you right now.
          </Text>
        </View>

        <Pressable style={styles.primaryButton} onPress={handleBeginAssessment}>
          <Text style={styles.primaryButtonText}>Begin Assessment</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={handleComplete}>
          <Text style={styles.secondaryButtonText}>Return to Menu</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );

  const renderAssessment = () => (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Question {currentQuestionIndex + 1} of {questions.length}
          </Text>
        </View>

        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>{currentQuestion.text}</Text>
        </View>

        <View style={styles.optionsContainer}>
          <RadioGroup
            options={RESPONSE_OPTIONS}
            value={answers.find(a => a.questionId === currentQuestion.id)?.response}
            onValueChange={(value) => handleAnswer(value as number)}
            label={`Response options for question ${currentQuestionIndex + 1} of ${questions.length}`}
            orientation="vertical"
            clinicalContext={assessmentType === 'phq9' ? 'phq9' : 'gad7'}
            theme="neutral"
            testID={`${assessmentType}-response-options`}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  const renderResults = () => {
    const results = calculateResults();

    // Check for crisis and show alert immediately
    if (results.isCrisis) {
      setTimeout(() => showCrisisAlert(), 500);
    }

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Assessment Complete</Text>
          </View>

          <View style={styles.resultsContainer}>
            <Text style={styles.scoreText}>
              Total Score: {results.totalScore}
            </Text>
            <Text style={styles.severityText}>
              Severity: {results.severity}
            </Text>

            {results.isCrisis && (
              <View style={styles.crisisContainer}>
                <Text style={styles.crisisText}>
                  ⚠️ Crisis Support Recommended
                </Text>
                <Text style={styles.crisisSubtext}>
                  Your responses indicate you may benefit from immediate support.
                </Text>
              </View>
            )}
          </View>

          <Pressable style={styles.primaryButton} onPress={handleComplete}>
            <Text style={styles.primaryButtonText}>Return to Menu</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  };

  if (currentScreen === 'menu') return renderMenu();
  if (currentScreen === 'intro') return renderIntro();
  if (currentScreen === 'assessment') return renderAssessment();
  if (currentScreen === 'results') return renderResults();

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.black,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '400',
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.black,
    marginBottom: spacing.md,
  },
  bodyText: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.gray600,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  assessmentCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.black,
    marginBottom: spacing.sm,
  },
  cardDescription: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.gray600,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  cardDuration: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.midnightBlue,
  },
  primaryButton: {
    backgroundColor: colors.morningPrimary,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.gray200,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.black,
    fontSize: 18,
    fontWeight: '600',
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray600,
  },
  questionContainer: {
    marginBottom: spacing.xl,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '500',
    color: colors.black,
    lineHeight: 28,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: spacing.md,
  },
  optionButton: {
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.black,
  },
  resultsContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.gray100,
    borderRadius: 12,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.black,
    marginBottom: spacing.sm,
  },
  severityText: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.gray600,
  },
  crisisContainer: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  crisisText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  crisisSubtext: {
    fontSize: 16,
    fontWeight: '400',
    color: '#991B1B',
    textAlign: 'center',
  },
});

export default ExercisesScreen;