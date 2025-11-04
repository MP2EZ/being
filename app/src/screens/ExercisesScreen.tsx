/**
 * Exercises Screen
 * PHQ-9/GAD-7 mental health assessments with shared components
 * Uses RadioGroup for WCAG-AA compliant accessibility
 */

import React, { useState, useEffect } from 'react';
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
import { CollapsibleCrisisButton } from '../flows/shared/components/CollapsibleCrisisButton';
import ThresholdEducationModal from '../components/ThresholdEducationModal';
import { markAssessmentComplete, getAssessmentDates } from '../components/AssessmentStatusBadge';

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

interface AssessmentMetadata {
  lastCompleted?: number;
  daysSince?: number;
  status: 'recent' | 'due' | 'recommended' | 'never';
}

const ExercisesScreen: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('menu');
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('phq9');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [phq9Metadata, setPhq9Metadata] = useState<AssessmentMetadata>({ status: 'never' });
  const [gad7Metadata, setGad7Metadata] = useState<AssessmentMetadata>({ status: 'never' });

  const questions = assessmentType === 'phq9' ? PHQ9_QUESTIONS : GAD7_QUESTIONS;
  const currentQuestion = questions[currentQuestionIndex];

  // Load assessment metadata on mount
  useEffect(() => {
    loadAssessmentMetadata();
  }, []);

  const loadAssessmentMetadata = async () => {
    const dates = await getAssessmentDates();
    const now = Date.now();

    // PHQ-9 metadata
    if (dates.phq9) {
      const daysSince = Math.floor((now - dates.phq9) / (1000 * 60 * 60 * 24));
      let status: 'recent' | 'due' | 'recommended' = 'recommended';
      if (daysSince < 14) status = 'recent';
      else if (daysSince < 21) status = 'due';
      else status = 'recommended';
      setPhq9Metadata({ lastCompleted: dates.phq9, daysSince, status });
    } else {
      setPhq9Metadata({ status: 'never' });
    }

    // GAD-7 metadata
    if (dates.gad7) {
      const daysSince = Math.floor((now - dates.gad7) / (1000 * 60 * 60 * 24));
      let status: 'recent' | 'due' | 'recommended' = 'recommended';
      if (daysSince < 14) status = 'recent';
      else if (daysSince < 21) status = 'due';
      else status = 'recommended';
      setGad7Metadata({ lastCompleted: dates.gad7, daysSince, status });
    } else {
      setGad7Metadata({ status: 'never' });
    }
  };

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
    if (!currentQuestion) return;

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

  const handleComplete = async () => {
    // Save assessment completion date
    await markAssessmentComplete(assessmentType);
    await loadAssessmentMetadata(); // Refresh metadata
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

  const getStatusIndicator = (metadata: AssessmentMetadata) => {
    if (metadata.status === 'never') {
      return <Text style={styles.statusRecommended}>Recommended</Text>;
    }
    if (metadata.status === 'recent') {
      return <Text style={styles.statusRecent}>Completed</Text>;
    }
    if (metadata.status === 'due') {
      return <Text style={styles.statusDue}>Due Soon</Text>;
    }
    return <Text style={styles.statusRecommended}>Recommended</Text>;
  };

  const getMetadataText = (metadata: AssessmentMetadata) => {
    if (metadata.status === 'never') {
      return 'Not completed yet';
    }
    if (metadata.daysSince !== undefined) {
      return `Last completed ${metadata.daysSince} ${metadata.daysSince === 1 ? 'day' : 'days'} ago`;
    }
    return '';
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
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Depression Assessment (PHQ-9)</Text>
              {getStatusIndicator(phq9Metadata)}
            </View>
            <Text style={styles.cardDescription}>
              A 9-question assessment to help you understand your mood patterns over the past two weeks.
            </Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardDuration}>3-5 minutes</Text>
              <Text style={styles.cardMetadata}>{getMetadataText(phq9Metadata)}</Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.assessmentCard}
            onPress={() => handleStartAssessment('gad7')}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Anxiety Assessment (GAD-7)</Text>
              {getStatusIndicator(gad7Metadata)}
            </View>
            <Text style={styles.cardDescription}>
              A 7-question assessment to help you observe your relationship with worry and anxiety.
            </Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardDuration}>2-4 minutes</Text>
              <Text style={styles.cardMetadata}>{getMetadataText(gad7Metadata)}</Text>
            </View>
          </Pressable>

          <Text style={styles.recommendationText}>
            Recommended every 2 weeks
          </Text>

          <Pressable
            style={styles.educationLink}
            onPress={() => setShowEducationModal(true)}
            accessibilityRole="button"
            accessibilityLabel="Learn about assessment scoring"
          >
            <Text style={styles.educationLinkText}>
              Learn about assessment scoring
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Education Modal */}
      <ThresholdEducationModal
        visible={showEducationModal}
        onDismiss={() => setShowEducationModal(false)}
      />
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

  const renderAssessment = () => {
    if (!currentQuestion) {
      return null;
    }

    return (
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
  };

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

  const renderContent = () => {
    if (currentScreen === 'menu') return renderMenu();
    if (currentScreen === 'intro') return renderIntro();
    if (currentScreen === 'assessment') return renderAssessment();
    if (currentScreen === 'results') return renderResults();
    return null;
  };

  return (
    <>
      {renderContent()}
      {/* Crisis Button Overlay - accessible across all exercise states (menu, intro, assessment, results) */}
      <CollapsibleCrisisButton testID="crisis-exercises" />
    </>
  );
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.black,
    flex: 1,
  },
  cardDescription: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.gray600,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDuration: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.midnightBlue,
  },
  cardMetadata: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.gray500,
  },
  statusRecent: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusDue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusRecommended: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  recommendationText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.gray500,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  educationLink: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  educationLinkText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.morningPrimary,
    textDecorationLine: 'underline',
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