/**
 * AssessmentQuestionScreen - Individual question screen for PHQ-9/GAD-7
 * Clinical accuracy is critical - exact wording must be preserved
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/core';
import { useAssessmentStore } from '../../store';
import { AssessmentQuestion, AssessmentOption } from '../../types';
import { colorSystem, spacing } from '../../constants/colors';

interface AssessmentQuestionScreenProps {
  question: AssessmentQuestion;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer: number | null;
  onAnswerSelect: (answer: number) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
}

export const AssessmentQuestionScreen: React.FC<AssessmentQuestionScreenProps> = ({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  onAnswerSelect,
  onNext,
  onBack,
  isFirstQuestion,
  isLastQuestion
}) => {
  const { currentAssessment } = useAssessmentStore();
  const assessmentType = currentAssessment?.config?.type || 'phq9';

  const renderAnswerOption = (option: AssessmentOption) => {
    if (!option || typeof option.value !== 'number' || !option.text) {
      console.warn('Invalid option in assessment question:', option);
      return null;
    }
    
    const isSelected = selectedAnswer === option.value;
    
    return (
      <Pressable
        key={option.value}
        style={({ pressed }) => [
          styles.answerOption,
          isSelected && styles.answerOptionSelected,
          pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] }
        ]}
        onPress={() => onAnswerSelect(option.value)}
        accessible={true}
        accessibilityRole="radio"
        accessibilityLabel={`${option.text} - ${assessmentType === 'phq9' ? 'PHQ-9' : 'GAD-7'} option ${option.value}`}
        accessibilityState={{ selected: isSelected }}
        android_ripple={{
          color: 'rgba(0, 0, 0, 0.1)',
          borderless: false,
          radius: 200
        }}
        hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}
      >
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
      </Pressable>
    );
  };

  const getProgressText = () => {
    return `${questionNumber} of ${totalQuestions}`;
  };

  const getThemeColor = () => {
    return assessmentType === 'phq9' 
      ? colorSystem.status.warning 
      : colorSystem.status.info;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>{getProgressText()}</Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { 
                    width: `${(questionNumber / totalQuestions) * 100}%`,
                    backgroundColor: getThemeColor()
                  }
                ]} 
              />
            </View>
          </View>

          {/* Assessment Context */}
          <View style={styles.header}>
            <Text style={styles.assessmentType}>
              {assessmentType === 'phq9' ? 'PHQ-9 Assessment' : 'GAD-7 Assessment'}
            </Text>
            <Text style={styles.subtitle}>
              {currentAssessment?.config?.subtitle || 
                (assessmentType === 'phq9' 
                  ? 'Over the last 2 weeks, how often have you been bothered by:' 
                  : 'Over the last 2 weeks, how often have you been bothered by:')}
            </Text>
          </View>

          {/* Question */}
          <View style={styles.questionContainer}>
            <Text style={styles.questionText}>
              {question.text}
            </Text>
          </View>

          {/* Answer Options */}
          <View style={styles.answersContainer}>
            {question.options?.filter(option => option != null).map(renderAnswerOption)}
          </View>

          {/* Clinical Note */}
          <View style={styles.clinicalNote}>
            <Text style={styles.clinicalNoteText}>
              💡 Please answer honestly. There are no right or wrong answers - this helps us understand how you've been feeling.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        <Button
          variant="outline"
          onPress={onBack}
          disabled={isFirstQuestion}
        >
          Back
        </Button>
        
        <Button
          onPress={onNext}
          disabled={selectedAnswer === null}
          style={[
            styles.nextButton,
            { backgroundColor: selectedAnswer !== null ? getThemeColor() : colorSystem.gray[300] }
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
  assessmentType: {
    fontSize: 20,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colorSystem.gray[600],
    lineHeight: 22,
  },
  questionContainer: {
    marginBottom: spacing.lg,
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
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    backgroundColor: colorSystem.base.white,
  },
  answerOptionSelected: {
    borderColor: colorSystem.status.info,
    backgroundColor: colorSystem.gray[100],
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
    color: colorSystem.base.black,
    fontWeight: '500',
  },
  clinicalNote: {
    backgroundColor: colorSystem.gray[100],
    padding: spacing.md,
    borderRadius: 8,
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

export default AssessmentQuestionScreen;