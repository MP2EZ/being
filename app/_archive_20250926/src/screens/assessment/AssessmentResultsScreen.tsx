/**
 * AssessmentResultsScreen - Clinical Score Display with Therapeutic Appropriateness
 * Enhanced with clinical severity interpretation and crisis threshold communication
 * CRITICAL: All clinical messaging must maintain therapeutic appropriateness
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { useNavigation, RouteProp, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/core/Button';
import { colorSystem, spacing, borderRadius } from '../../constants/colors';
import { useAssessmentStore } from '../../store';
import { CRISIS_THRESHOLDS, requiresCrisisIntervention } from '../../utils/validation';

type AssessmentResultsParams = {
  AssessmentResults: {
    type: 'phq9' | 'gad7';
    score: number;
  };
};

type AssessmentResultsScreenRouteProp = RouteProp<AssessmentResultsParams, 'AssessmentResults'>;

// CLINICAL ACCURACY: Exact severity level classification per clinical standards
const getSeverityLevel = (type: 'phq9' | 'gad7', score: number) => {
  if (type === 'phq9') {
    // PHQ-9 Clinical Severity Ranges (validated)
    if (score <= 4) return {
      level: 'Minimal Depression',
      color: colorSystem.status.success,
      description: 'Little to no impact on daily functioning'
    };
    if (score <= 9) return {
      level: 'Mild Depression',
      color: colorSystem.status.info,
      description: 'Some impact on daily activities'
    };
    if (score <= 14) return {
      level: 'Moderate Depression',
      color: colorSystem.status.warning,
      description: 'Noticeable impact on daily functioning'
    };
    if (score <= 19) return {
      level: 'Moderately Severe Depression',
      color: colorSystem.status.error,
      description: 'Significant impairment in functioning'
    };
    return {
      level: 'Severe Depression',
      color: colorSystem.status.critical,
      description: 'Severe impairment, professional support recommended'
    };
  } else {
    // GAD-7 Clinical Severity Ranges (validated)
    if (score <= 4) return {
      level: 'Minimal Anxiety',
      color: colorSystem.status.success,
      description: 'Little interference with daily activities'
    };
    if (score <= 9) return {
      level: 'Mild Anxiety',
      color: colorSystem.status.info,
      description: 'Some interference with activities'
    };
    if (score <= 14) return {
      level: 'Moderate Anxiety',
      color: colorSystem.status.warning,
      description: 'Notable interference with daily functioning'
    };
    return {
      level: 'Severe Anxiety',
      color: colorSystem.status.critical,
      description: 'Significant impairment, professional support recommended'
    };
  }
};

// THERAPEUTIC MESSAGING: Clinical recommendations with appropriate urgency and empowerment
const getRecommendation = (type: 'phq9' | 'gad7', score: number) => {
  if (type === 'phq9') {
    if (score <= 4) return {
      message: 'Your current symptoms are minimal. Continue with your self-care practices and regular wellness activities.',
      suggestions: ['Maintain current MBCT practices', 'Continue regular check-ins', 'Monitor for any changes']
    };
    if (score <= 9) return {
      message: 'You may be experiencing mild depressive symptoms. These are manageable with proper support and strategies.',
      suggestions: ['Consider increasing mindfulness practice', 'Reach out to supportive friends/family', 'Discuss with healthcare provider if symptoms persist']
    };
    if (score <= 14) return {
      message: 'Your symptoms suggest moderate depression. Professional support can provide effective strategies for improvement.',
      suggestions: ['Consult with mental health professional', 'Continue MBCT practices', 'Consider therapy or counseling']
    };
    if (score <= 19) return {
      message: 'Your symptoms indicate moderately severe depression. Professional help is important for your wellbeing.',
      suggestions: ['Schedule appointment with mental health provider', 'Reach out to support network', 'Continue crisis resources if needed']
    };
    return {
      message: 'Your symptoms suggest severe depression. Immediate professional support is strongly recommended for your safety and recovery.',
      suggestions: ['Contact mental health professional immediately', 'Use crisis resources as needed', 'Inform trusted support person']
    };
  } else {
    if (score <= 4) return {
      message: 'Your anxiety symptoms are minimal. Continue with your current wellness practices and mindfulness activities.',
      suggestions: ['Maintain breathing exercises', 'Continue regular self-care', 'Practice mindful awareness']
    };
    if (score <= 9) return {
      message: 'You may be experiencing mild anxiety. These symptoms are very treatable with appropriate strategies.',
      suggestions: ['Increase mindfulness practice', 'Try relaxation techniques', 'Consider speaking with healthcare provider']
    };
    if (score <= 14) return {
      message: 'Your symptoms suggest moderate anxiety. Professional support can help you develop effective coping strategies.',
      suggestions: ['Consult with mental health professional', 'Practice anxiety management techniques', 'Consider therapy options']
    };
    return {
      message: 'Your symptoms indicate severe anxiety. Professional support can provide immediate relief and long-term strategies.',
      suggestions: ['Contact mental health professional promptly', 'Use breathing exercises for immediate relief', 'Consider crisis support if overwhelmed']
    };
  }
};

export const AssessmentResultsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<AssessmentResultsScreenRouteProp>();
  const { type, score } = route.params;
  const { completeAssessment } = useAssessmentStore();
  
  const severity = getSeverityLevel(type, score);
  const recommendation = getRecommendation(type, score);
  const isCritical = (type === 'phq9' && score >= CRISIS_THRESHOLDS.PHQ9_SEVERE) ||
                     (type === 'gad7' && score >= CRISIS_THRESHOLDS.GAD7_SEVERE);

  React.useEffect(() => {
    // Complete the assessment in store
    completeAssessment();
  }, [completeAssessment]);

  const handleCrisisSupport = async () => {
    Alert.alert(
      'Crisis Support Resources',
      'Immediate support is available 24/7. Choose how you\'d like to get help:',
      [
        {
          text: 'Call 988 - Crisis Lifeline',
          onPress: async () => {
            try {
              await Linking.openURL('tel:988');
            } catch (error) {
              Alert.alert('Call 988', 'Please dial 988 directly for immediate crisis support.');
            }
          }
        },
        {
          text: 'Text Crisis Line',
          onPress: async () => {
            try {
              await Linking.openURL('sms:741741?body=HOME');
            } catch (error) {
              Alert.alert('Text Support', 'Text HOME to 741741 for crisis text line support.');
            }
          }
        },
        {
          text: 'Emergency Services',
          onPress: async () => {
            try {
              await Linking.openURL('tel:911');
            } catch (error) {
              Alert.alert('Emergency', 'Call 911 for immediate emergency assistance.');
            }
          }
        },
        { text: 'Close', style: 'cancel' }
      ]
    );
  };

  const handleShareWithTherapist = () => {
    Alert.alert(
      'Share Results',
      'Export feature coming soon. You can take a screenshot to share with your therapist.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {type === 'phq9' ? 'Depression' : 'Anxiety'} Assessment Results
          </Text>
        </View>

        <View style={[styles.scoreCard, { borderColor: severity.color }]}>
          <Text style={styles.scoreLabel}>Your Score</Text>
          <Text style={[styles.scoreValue, { color: severity.color }]}>
            {score}
          </Text>
          <Text style={[styles.severityLevel, { color: severity.color }]}>
            {severity.level}
          </Text>
          <Text style={styles.severityDescription}>
            {severity.description}
          </Text>
        </View>

        <View style={styles.recommendationCard}>
          <Text style={styles.recommendationTitle}>Understanding Your Results</Text>
          <Text style={styles.recommendationText}>{recommendation.message}</Text>

          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>Recommended Next Steps:</Text>
            {recommendation.suggestions.map((suggestion, index) => (
              <View key={index} style={styles.suggestionItem}>
                <Text style={styles.suggestionBullet}>•</Text>
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </View>
            ))}
          </View>
        </View>

        {isCritical && (
          <View style={[styles.crisisCard, { backgroundColor: colorSystem.status.criticalBackground }]}>
            <Text style={styles.crisisTitle}>Important Resources</Text>
            <Text style={styles.crisisText}>
              Based on your responses, we want to ensure you have access to immediate support.
            </Text>
            <Button
              variant="primary"
              onPress={handleCrisisSupport}
              style={styles.crisisButton}
            >
              Crisis Support Resources
            </Button>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>About This Assessment</Text>
          <Text style={styles.infoText}>
            The {type === 'phq9' ? 'PHQ-9' : 'GAD-7'} is a validated clinical screening tool.
            These results are not a diagnosis. Please consult with a healthcare professional
            for proper evaluation and treatment.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            variant="outline"
            onPress={handleShareWithTherapist}
            fullWidth
          >
            Share with Therapist
          </Button>
          <Button
            variant="primary"
            onPress={() => navigation.goBack()}
            fullWidth
          >
            Done
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  header: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colorSystem.base.black,
    textAlign: 'center',
  },
  scoreCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colorSystem.base.white,
    borderRadius: borderRadius.large,
    borderWidth: 2,
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreLabel: {
    fontSize: 14,
    color: colorSystem.gray[600],
    marginBottom: spacing.xs,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  severityLevel: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  severityDescription: {
    fontSize: 14,
    color: colorSystem.gray[600],
    textAlign: 'center',
    fontStyle: 'italic',
  },
  recommendationCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colorSystem.gray[50],
    borderRadius: borderRadius.medium,
    marginBottom: spacing.lg,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.sm,
  },
  recommendationText: {
    fontSize: 14,
    color: colorSystem.gray[700],
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  suggestionsContainer: {
    marginTop: spacing.sm,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
    paddingLeft: spacing.xs,
  },
  suggestionBullet: {
    fontSize: 14,
    color: colorSystem.gray[600],
    marginRight: spacing.xs,
    marginTop: 1,
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    color: colorSystem.gray[700],
    lineHeight: 18,
  },
  crisisCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.lg,
  },
  crisisTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.status.critical,
    marginBottom: spacing.sm,
  },
  crisisText: {
    fontSize: 14,
    color: colorSystem.gray[700],
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  crisisButton: {
    backgroundColor: colorSystem.status.critical,
  },
  infoCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colorSystem.status.infoBackground,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.lg,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colorSystem.status.info,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: 13,
    color: colorSystem.gray[700],
    lineHeight: 18,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
});

export default AssessmentResultsScreen;