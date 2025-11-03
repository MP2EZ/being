/**
 * Exercises Screen with DRD-005 Assessments
 * Simple integration of PHQ-9 and GAD-7 assessments into exercises tab
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { colorSystem, spacing, typography } from '../constants/colors';
import AssessmentIntroduction from '../flows/assessment/components/AssessmentIntroduction';
import AssessmentQuestion from '../flows/assessment/components/AssessmentQuestion';
import AssessmentResults from '../flows/assessment/components/AssessmentResults';
import { PHQ9_QUESTIONS, GAD7_QUESTIONS } from '../flows/assessment/types/questions';
import type { AssessmentType, AssessmentAnswer, AssessmentResponse, PHQ9Result, GAD7Result } from '../flows/assessment/types';
import { CollapsibleCrisisButton } from '../flows/shared/components/CollapsibleCrisisButton';

type Screen = 'menu' | 'intro' | 'assessment' | 'results';

const ExercisesScreen: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('menu');
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('phq9');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AssessmentAnswer[]>([]);

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

  const handleAnswer = (response: AssessmentResponse) => {
    const newAnswer: AssessmentAnswer = {
      questionId: currentQuestion.id,
      response,
      timestamp: Date.now(),
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

  const calculateResults = (): PHQ9Result | GAD7Result => {
    const totalScore = answers.reduce((sum, answer) => sum + answer.response, 0);
    const completedAt = Date.now();

    if (assessmentType === 'phq9') {
      // PHQ-9 severity calculation
      let severity: 'minimal' | 'mild' | 'moderate' | 'moderately_severe' | 'severe';
      if (totalScore <= 4) severity = 'minimal';
      else if (totalScore <= 9) severity = 'mild';
      else if (totalScore <= 14) severity = 'moderate';
      else if (totalScore <= 19) severity = 'moderately_severe';
      else severity = 'severe';

      // Check for suicidal ideation (question 9)
      const question9Answer = answers.find(a => a.questionId === 'phq9_9');
      const suicidalIdeation = question9Answer ? question9Answer.response > 0 : false;

      return {
        totalScore,
        severity,
        isCrisis: totalScore >= 20 || suicidalIdeation,
        suicidalIdeation,
        completedAt,
        answers,
      } as PHQ9Result;
    } else {
      // GAD-7 severity calculation
      let severity: 'minimal' | 'mild' | 'moderate' | 'severe';
      if (totalScore <= 4) severity = 'minimal';
      else if (totalScore <= 9) severity = 'mild';
      else if (totalScore <= 14) severity = 'moderate';
      else severity = 'severe';

      return {
        totalScore,
        severity,
        isCrisis: totalScore >= 15,
        completedAt,
        answers,
      } as GAD7Result;
    }
  };

  const handleComplete = () => {
    setCurrentScreen('menu');
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coming Soon</Text>
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderTitle}>Breathing Exercises</Text>
            <Text style={styles.placeholderText}>Guided breathing practices for mindfulness</Text>
          </View>
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderTitle}>Meditation Sessions</Text>
            <Text style={styles.placeholderText}>Stoic Mindfulness meditation practices</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  // Render content based on current screen
  const renderContent = () => {
    if (currentScreen === 'menu') {
      return renderMenu();
    }

    if (currentScreen === 'intro') {
      return (
        <AssessmentIntroduction
          assessmentType={assessmentType}
          onBegin={handleBeginAssessment}
          context="standalone"
        />
      );
    }

    if (currentScreen === 'assessment') {
      return (
        <AssessmentQuestion
          question={currentQuestion}
          onAnswer={handleAnswer}
          currentStep={currentQuestionIndex + 1}
          totalSteps={questions.length}
        />
      );
    }

    if (currentScreen === 'results') {
      return (
        <AssessmentResults
          result={calculateResults()}
          onComplete={handleComplete}
          context="standalone"
        />
      );
    }

    return null;
  };

  return (
    <>
      {renderContent()}
      {/* Crisis Button Overlay - accessible across all exercise states */}
      <CollapsibleCrisisButton testID="crisis-exercises" />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
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
    fontSize: typography.headline1.size,
    fontWeight: typography.headline1.weight,
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.bodyLarge.weight,
    color: colorSystem.accessibility.text.secondary,
    textAlign: 'center',
    lineHeight: typography.bodyLarge.size * 1.5,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.md,
  },
  assessmentCard: {
    backgroundColor: colorSystem.base.white,
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.sm,
  },
  cardDescription: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.bodyRegular.weight,
    color: colorSystem.accessibility.text.secondary,
    lineHeight: typography.bodyRegular.size * 1.5,
    marginBottom: spacing.sm,
  },
  cardDuration: {
    fontSize: typography.caption.size,
    fontWeight: typography.caption.weight,
    color: colorSystem.base.midnightBlue,
  },
  placeholderCard: {
    backgroundColor: colorSystem.gray[50],
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  placeholderTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.gray[500],
    marginBottom: spacing.sm,
  },
  placeholderText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.bodyRegular.weight,
    color: colorSystem.gray[400],
    lineHeight: typography.bodyRegular.size * 1.5,
  },
});

export default ExercisesScreen;