/**
 * AssessmentFlow - Main controller for PHQ-9/GAD-7 assessment flows
 * Handles navigation through questions and scoring
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import { AssessmentQuestionScreen } from './AssessmentQuestionScreen';
import { useAssessmentStore } from '../../store';

interface AssessmentFlowProps {
  type: 'phq9' | 'gad7';
  onComplete: (score: number) => void;
  onCancel: () => void;
}

export const AssessmentFlow: React.FC<AssessmentFlowProps> = ({
  type,
  onComplete,
  onCancel
}) => {
  const { 
    currentAssessment,
    answerQuestion,
    goToPreviousQuestion,
    saveAssessment,
    clearCurrentAssessment,
    isAssessmentComplete,
    getCurrentProgress
  } = useAssessmentStore();

  const [currentAnswers, setCurrentAnswers] = useState<(number | null)[]>([]);

  useEffect(() => {
    if (currentAssessment?.config) {
      // Initialize answers array with null values
      const questionCount = currentAssessment.config.questions.length;
      setCurrentAnswers(new Array(questionCount).fill(null));
    }
  }, [currentAssessment?.config]);

  if (!currentAssessment?.config) {
    return <View style={styles.container} />;
  }

  const progress = getCurrentProgress();
  const currentQuestion = currentAssessment.config.questions[progress.current];
  const isFirstQuestion = progress.current === 0;
  const isLastQuestion = progress.current === progress.total - 1;

  const handleAnswerSelect = (answer: number) => {
    // Validate that answer is within valid range for clinical assessments
    if (answer < 0 || answer > 3 || !Number.isInteger(answer)) {
      console.error(`Invalid assessment answer: ${answer}. Must be 0, 1, 2, or 3.`);
      return;
    }
    
    const validAnswer = answer as 0 | 1 | 2 | 3;
    const newAnswers = [...currentAnswers];
    newAnswers[progress.current] = validAnswer;
    setCurrentAnswers(newAnswers);
    answerQuestion(validAnswer);
  };

  const handleNext = async () => {
    if (isLastQuestion && isAssessmentComplete()) {
      // Assessment complete - save and finish
      try {
        const score = currentAnswers.reduce((total: number, answer) => total + (answer || 0), 0);
        await saveAssessment();
        onComplete(score);
      } catch (error) {
        Alert.alert(
          'Save Error',
          'Unable to save your assessment. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } else if (!isLastQuestion) {
      // Move to next question - handled by store
    }
  };

  const handleBack = () => {
    if (isFirstQuestion) {
      handleCancel();
    } else {
      goToPreviousQuestion();
    }
  };

  const handleCancel = () => {
    const assessmentName = type === 'phq9' ? 'PHQ-9' : 'GAD-7';
    Alert.alert(
      `Cancel ${assessmentName}?`,
      'Are you sure you want to cancel this assessment? Your progress will be lost.',
      [
        { text: 'Continue Assessment', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            clearCurrentAssessment();
            onCancel();
          }
        }
      ]
    );
  };

  const currentAnswer = currentAnswers[progress.current] ?? null;

  // Safety check for currentQuestion
  if (!currentQuestion) {
    console.error('Current question is undefined');
    return (
      <View style={styles.container}>
        <Text>Error loading assessment question</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AssessmentQuestionScreen
        question={currentQuestion}
        questionNumber={progress.current + 1}
        totalQuestions={progress.total}
        selectedAnswer={currentAnswer}
        onAnswerSelect={handleAnswerSelect}
        onNext={handleNext}
        onBack={handleBack}
        isFirstQuestion={isFirstQuestion}
        isLastQuestion={isLastQuestion}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AssessmentFlow;