/**
 * PHQAssessmentPreview Component
 *
 * Interactive preview of PHQ-9 assessment with sample questions and scoring.
 * Maintains clinical accuracy and accessibility for therapeutic presentation.
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Vibration
} from 'react-native';

import { AssessmentPreviewProps, AssessmentQuestion } from '../types';
import { ClinicalIcon } from './ClinicalIcon';

const PHQAssessmentPreview: React.FC<AssessmentPreviewProps> = memo(({
  data,
  title,
  subtitle
}) => {
  // Sample PHQ-9 questions for preview
  const sampleQuestions: AssessmentQuestion[] = [
    {
      number: 1,
      text: 'Little interest or pleasure in doing things',
      selectedOption: 2,
      options: ['Not at all', 'Several days', 'More than half', 'Nearly every day']
    },
    {
      number: 2,
      text: 'Feeling down, depressed, or hopeless',
      selectedOption: 1,
      options: ['Not at all', 'Several days', 'More than half', 'Nearly every day']
    }
  ];

  const renderQuestionOption = (option: string, index: number, selectedIndex: number) => (
    <Pressable
      key={index}
      onPressIn={() => {
        // CLINICAL: Light haptic feedback for assessment option selection
        // Maintains therapeutic engagement without overwhelming
        Vibration.vibrate(50); // Very light feedback for clinical accuracy
      }}
      accessible={true}
      accessibilityRole="radio"
      accessibilityState={{ checked: index === selectedIndex }}
      accessibilityLabel={option}
      style={({ pressed }) => [
        styles.questionOption,
        index === selectedIndex && styles.selectedOption,
        pressed && { opacity: 0.8 }
      ]}
      hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
    >
      <Text
        style={[
          styles.optionText,
          index === selectedIndex && styles.selectedOptionText
        ]}
      >
        {option}
      </Text>
    </Pressable>
  );

  const renderQuestion = (question: AssessmentQuestion) => (
    <View key={question.number} style={styles.questionItem}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionNumber}>{question.number}.</Text>
        <Text style={styles.questionText}>{question.text}</Text>
      </View>

      <View style={styles.questionOptions}>
        {question.options.map((option, index) =>
          renderQuestionOption(option, index, question.selectedOption)
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.previewContainer}>
      {/* Assessment Header */}
      <View style={styles.assessmentHeader}>
        <View style={styles.assessmentBadge}>
          <Text style={styles.badgeText}>{data.assessmentType}</Text>
        </View>
        <Text style={styles.assessmentType}>{title}</Text>
      </View>

      {/* Sample Questions */}
      <View
        style={styles.questionsContainer}
        accessible={true}
        accessibilityLabel="Sample assessment questions"
      >
        {sampleQuestions.map(renderQuestion)}
      </View>

      {/* Assessment Note */}
      <View style={styles.assessmentNote}>
        <ClinicalIcon
          type="info"
          size={16}
          color="#4A5568"
          accessibilityLabel="Information"
        />
        <Text style={styles.noteText}>
          Automatically scored with clinical interpretation
        </Text>
      </View>

      {/* Score Preview */}
      <View style={styles.scorePreview}>
        <View style={styles.scoreDisplay}>
          <Text style={styles.scoreNumber}>
            {data.score}/{data.maxScore}
          </Text>
          <Text style={styles.severityLevel}>{data.severity}</Text>
        </View>
        <Text style={styles.interpretation}>{data.interpretation}</Text>
      </View>

      {/* Clinical Features */}
      <View style={styles.clinicalFeatures}>
        <View style={styles.featureRow}>
          <ClinicalIcon
            type="share"
            size={18}
            color="#2C5282"
            accessibilityLabel="Share results"
          />
          <Text style={styles.featureText}>
            Share results securely with your therapist
          </Text>
        </View>

        <View style={styles.featureRow}>
          <ClinicalIcon
            type="history"
            size={18}
            color="#2C5282"
            accessibilityLabel="Track progress"
          />
          <Text style={styles.featureText}>
            Track progress over time with detailed history
          </Text>
        </View>

        <View style={styles.featureRow}>
          <ClinicalIcon
            type="verified"
            size={18}
            color="#2C5282"
            accessibilityLabel="Clinical validation"
          />
          <Text style={styles.featureText}>
            Clinically validated with 95% accuracy rate
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  previewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  assessmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12
  },
  assessmentBadge: {
    backgroundColor: '#EBF8FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2C5282'
  },
  assessmentType: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2D3748',
    flex: 1
  },
  questionsContainer: {
    marginBottom: 16
  },
  questionItem: {
    marginBottom: 16
  },
  questionHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C5282',
    minWidth: 20
  },
  questionText: {
    fontSize: 14,
    color: '#2D3748',
    flex: 1,
    lineHeight: 20
  },
  questionOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingLeft: 28
  },
  questionOption: {
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    // Minimum touch target
    minHeight: 32
  },
  selectedOption: {
    backgroundColor: '#E6FFFA',
    borderColor: '#38B2AC'
  },
  optionText: {
    fontSize: 12,
    color: '#4A5568'
  },
  selectedOptionText: {
    color: '#2C7A7B',
    fontWeight: '500'
  },
  assessmentNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0'
  },
  noteText: {
    fontSize: 12,
    color: '#4A5568',
    fontStyle: 'italic'
  },
  scorePreview: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  scoreDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  scoreNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C5282'
  },
  severityLevel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#38B2AC'
  },
  interpretation: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20
  },
  clinicalFeatures: {
    gap: 12
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  featureText: {
    fontSize: 14,
    color: '#2D3748',
    flex: 1,
    lineHeight: 20
  }
});

PHQAssessmentPreview.displayName = 'PHQAssessmentPreview';

export { PHQAssessmentPreview };