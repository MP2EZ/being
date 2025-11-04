/**
 * Exercises Screen
 * PHQ-9/GAD-7 mental health assessments with shared components
 * Uses EnhancedAssessmentFlow modal for DRY implementation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/CleanRootNavigator';
import { CollapsibleCrisisButton } from '../flows/shared/components/CollapsibleCrisisButton';
import ThresholdEducationModal from '../components/ThresholdEducationModal';
import { useAssessmentStore } from '../flows/assessment/stores/assessmentStore';

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

type AssessmentType = 'phq9' | 'gad7';

interface AssessmentMetadata {
  lastCompleted?: number;
  daysSince?: number;
  status: 'recent' | 'due' | 'recommended' | 'never';
}

const ExercisesScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [phq9Metadata, setPhq9Metadata] = useState<AssessmentMetadata>({ status: 'never' });
  const [gad7Metadata, setGad7Metadata] = useState<AssessmentMetadata>({ status: 'never' });

  // Get assessment history from encrypted store
  const completedAssessments = useAssessmentStore(state => state.completedAssessments);

  // Load assessment metadata when assessments change
  useEffect(() => {
    loadAssessmentMetadata();
  }, [completedAssessments]); // Re-calculate when assessments change

  const loadAssessmentMetadata = () => {
    const now = Date.now();

    // PHQ-9 metadata from encrypted store
    const phq9Sessions = completedAssessments.filter(s => s.type === 'phq9');
    if (phq9Sessions.length > 0) {
      const lastPhq9 = phq9Sessions[phq9Sessions.length - 1];
      const completedAt = lastPhq9.result?.completedAt;

      if (completedAt) {
        const daysSince = Math.floor((now - completedAt) / (1000 * 60 * 60 * 24));
        let status: 'recent' | 'due' | 'recommended' = 'recommended';
        if (daysSince < 14) status = 'recent';
        else if (daysSince < 21) status = 'due';
        else status = 'recommended';
        setPhq9Metadata({ lastCompleted: completedAt, daysSince, status });
      }
    } else {
      setPhq9Metadata({ status: 'never' });
    }

    // GAD-7 metadata from encrypted store
    const gad7Sessions = completedAssessments.filter(s => s.type === 'gad7');
    if (gad7Sessions.length > 0) {
      const lastGad7 = gad7Sessions[gad7Sessions.length - 1];
      const completedAt = lastGad7.result?.completedAt;

      if (completedAt) {
        const daysSince = Math.floor((now - completedAt) / (1000 * 60 * 60 * 24));
        let status: 'recent' | 'due' | 'recommended' = 'recommended';
        if (daysSince < 14) status = 'recent';
        else if (daysSince < 21) status = 'due';
        else status = 'recommended';
        setGad7Metadata({ lastCompleted: completedAt, daysSince, status });
      }
    } else {
      setGad7Metadata({ status: 'never' });
    }
  };

  const handleStartAssessment = (type: AssessmentType) => {
    navigation.navigate('AssessmentFlow', {
      assessmentType: type,
      context: 'standalone',
      onComplete: (result) => {
        // Assessment automatically saved to assessmentStore by EnhancedAssessmentFlow
        // Metadata will auto-refresh via useEffect watching completedAssessments
        console.log(`✅ ${type} assessment completed:`, result);
      },
    });
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

  // All assessment rendering now handled by EnhancedAssessmentFlow modal
  // Removed ~250 lines of duplicate code (renderIntro, renderAssessment, renderResults)

  return (
    <>
      {renderMenu()}
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