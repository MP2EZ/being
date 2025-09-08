/**
 * AssessmentResultsScreen - Display PHQ-9 and GAD-7 assessment results
 * Shows scores, severity levels, and crisis resources when needed
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation, RouteProp, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/core/Button';
import { colorSystem, spacing, borderRadius } from '../../constants/colors';
import { useAssessmentStore } from '../../store';

type AssessmentResultsParams = {
  AssessmentResults: {
    type: 'phq9' | 'gad7';
    score: number;
  };
};

type AssessmentResultsScreenRouteProp = RouteProp<AssessmentResultsParams, 'AssessmentResults'>;

const getSeverityLevel = (type: 'phq9' | 'gad7', score: number) => {
  if (type === 'phq9') {
    if (score <= 4) return { level: 'Minimal', color: colorSystem.status.success };
    if (score <= 9) return { level: 'Mild', color: colorSystem.status.info };
    if (score <= 14) return { level: 'Moderate', color: colorSystem.status.warning };
    if (score <= 19) return { level: 'Moderately Severe', color: colorSystem.status.error };
    return { level: 'Severe', color: colorSystem.status.critical };
  } else {
    if (score <= 4) return { level: 'Minimal', color: colorSystem.status.success };
    if (score <= 9) return { level: 'Mild', color: colorSystem.status.info };
    if (score <= 14) return { level: 'Moderate', color: colorSystem.status.warning };
    return { level: 'Severe', color: colorSystem.status.critical };
  }
};

const getRecommendation = (type: 'phq9' | 'gad7', score: number) => {
  if (type === 'phq9') {
    if (score <= 4) return 'Your symptoms are minimal. Continue with regular self-care and monitoring.';
    if (score <= 9) return 'You may be experiencing mild depression. Consider speaking with a healthcare provider if symptoms persist.';
    if (score <= 14) return 'You may be experiencing moderate depression. We recommend consulting with a mental health professional.';
    if (score <= 19) return 'Your symptoms suggest moderately severe depression. Please seek professional help soon.';
    return 'Your symptoms suggest severe depression. We strongly recommend immediate professional support.';
  } else {
    if (score <= 4) return 'Your anxiety symptoms are minimal. Continue practicing mindfulness and self-care.';
    if (score <= 9) return 'You may be experiencing mild anxiety. Consider discussing with your healthcare provider if it continues.';
    if (score <= 14) return 'You may be experiencing moderate anxiety. Professional support could be beneficial.';
    return 'Your symptoms suggest severe anxiety. Please consider seeking professional help promptly.';
  }
};

export const AssessmentResultsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<AssessmentResultsScreenRouteProp>();
  const { type, score } = route.params;
  const { completeAssessment } = useAssessmentStore();
  
  const severity = getSeverityLevel(type, score);
  const recommendation = getRecommendation(type, score);
  const isCritical = score >= 20 || (type === 'gad7' && score >= 15);

  React.useEffect(() => {
    // Complete the assessment in store
    completeAssessment();
  }, [completeAssessment]);

  const handleCrisisSupport = () => {
    Alert.alert(
      'Crisis Support',
      'If you are having thoughts of self-harm, please reach out for immediate help:\n\n988 - Suicide & Crisis Lifeline (24/7)\n\nText HOME to 741741 - Crisis Text Line',
      [
        { text: 'Call 988', onPress: () => console.log('Calling 988') },
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
        </View>

        <View style={styles.recommendationCard}>
          <Text style={styles.recommendationTitle}>Recommendation</Text>
          <Text style={styles.recommendationText}>{recommendation}</Text>
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