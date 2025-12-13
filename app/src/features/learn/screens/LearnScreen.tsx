/**
 * LEARN SCREEN - Educational Modules Directory
 * FEAT-49: Educational Modules for 5 Stoic Principles
 *
 * Displays all 5 educational modules with progress tracking.
 * Non-negotiables:
 * - All modules unlocked (no forced progression)
 * - No gamification (no points, badges, accuracy scores)
 * - Learning-focused progress (not performance metrics)
 * - Module 3 (Sphere Sovereignty) emphasized as MOST ESSENTIAL
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';
import { CollapsibleCrisisButton } from '@/features/crisis/components';
import { colorSystem, spacing, typography, borderRadius } from '@/core/theme';
import { useEducationStore } from '@/features/learn/stores/educationStore';
import type { ModuleId } from '@/features/learn/types/education';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const MODULE_INFO: Record<
  ModuleId,
  { number: number; title: string; tag: string; description: string; estimatedMinutes: number }
> = {
  'aware-presence': {
    number: 1,
    title: 'Aware Presence',
    tag: 'FOUNDATION',
    description: 'Learn to observe your thoughts and emotions without judgment.',
    estimatedMinutes: 15,
  },
  'radical-acceptance': {
    number: 2,
    title: 'Radical Acceptance',
    tag: 'WORKING WITH WHAT IS',
    description: 'This is what\'s happening. What do I do from here?',
    estimatedMinutes: 18,
  },
  'sphere-sovereignty': {
    number: 3,
    title: 'Sphere Sovereignty',
    tag: 'MOST ESSENTIAL',
    description: 'Master the dichotomy of control—the cornerstone of Stoic practice.',
    estimatedMinutes: 25,
  },
  'virtuous-response': {
    number: 4,
    title: 'Virtuous Response',
    tag: 'CHARACTER & VIRTUE',
    description: 'Respond to life through wisdom, courage, justice, and temperance.',
    estimatedMinutes: 20,
  },
  'interconnected-living': {
    number: 5,
    title: 'Interconnected Living',
    tag: 'ETHICS & COMMUNITY',
    description: 'Recognize our fundamental interconnection and act for the common good.',
    estimatedMinutes: 18,
  },
};

const LearnScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { modules, getRecommendedModule } = useEducationStore();

  const recommendedModuleId = getRecommendedModule();

  const handleModulePress = (moduleId: ModuleId) => {
    // Navigate to ModuleDetailScreen
    navigation.navigate('ModuleDetail', { moduleId });
  };

  const getProgressPercentage = (moduleId: ModuleId): number => {
    const module = modules[moduleId];
    if (module.status === 'completed') return 100;
    if (module.status === 'not_started') return 0;

    // For in_progress, calculate based on completed sections
    // This is a simple heuristic - will be more sophisticated later
    const totalSections = 5; // Approximate (What It Is concepts + practices)
    return Math.min(Math.round((module.completedSections.length / totalSections) * 100), 90);
  };

  const getStatusColor = (moduleId: ModuleId): string => {
    const module = modules[moduleId];
    if (module.status === 'completed') return colorSystem.status.success;
    if (module.status === 'in_progress') return colorSystem.navigation.learn;
    return colorSystem.gray[400];
  };

  const moduleIds: ModuleId[] = [
    'aware-presence',
    'radical-acceptance',
    'sphere-sovereignty',
    'virtuous-response',
    'interconnected-living',
  ];

  return (
    <SafeAreaView style={styles.safeArea} testID="learn-screen">
      <View style={{ flex: 1 }}>
        <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Learn</Text>
          <Text style={styles.headerSubtitle}>
            Explore the 5 Stoic Mindfulness principles
          </Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Recommendation Card (if applicable) */}
          {recommendedModuleId && (
            <View style={styles.recommendationCard}>
              <Text style={styles.recommendationLabel}>RECOMMENDED FOR YOU</Text>
              <Text style={styles.recommendationTitle}>
                {MODULE_INFO[recommendedModuleId].title}
              </Text>
              <Text style={styles.recommendationDescription}>
                {MODULE_INFO[recommendedModuleId].description}
              </Text>
              <TouchableOpacity
                style={styles.recommendationButton}
                onPress={() => handleModulePress(recommendedModuleId)}
                activeOpacity={0.7}
              >
                <Text style={styles.recommendationButtonText}>Start Learning</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Module Cards */}
          <View style={styles.modulesSection}>
            <Text style={styles.sectionTitle}>All Modules</Text>
            {moduleIds.map((moduleId) => {
              const info = MODULE_INFO[moduleId];
              const progress = getProgressPercentage(moduleId);
              const statusColor = getStatusColor(moduleId);
              const isMostEssential = moduleId === 'sphere-sovereignty';

              return (
                <TouchableOpacity
                  key={moduleId}
                  style={[
                    styles.moduleCard,
                    isMostEssential && styles.moduleCardEssential,
                  ]}
                  onPress={() => handleModulePress(moduleId)}
                  activeOpacity={0.7}
                >
                  {/* Module Number & Tag */}
                  <View style={styles.moduleHeader}>
                    <View style={styles.moduleNumber}>
                      <Text style={styles.moduleNumberText}>{info.number}</Text>
                    </View>
                    <View
                      style={[
                        styles.moduleTag,
                        isMostEssential && styles.moduleTagEssential,
                      ]}
                    >
                      <Text
                        style={[
                          styles.moduleTagText,
                          isMostEssential && styles.moduleTagTextEssential,
                        ]}
                      >
                        {info.tag}
                      </Text>
                    </View>
                  </View>

                  {/* Module Title & Description */}
                  <Text style={styles.moduleTitle}>{info.title}</Text>
                  <Text style={styles.moduleDescription} numberOfLines={2}>
                    {info.description}
                  </Text>

                  {/* Progress Bar */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${progress}%`, backgroundColor: statusColor },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>{progress}%</Text>
                  </View>

                  {/* Metadata */}
                  <View style={styles.moduleFooter}>
                    <Text style={styles.moduleTime}>
                      {info.estimatedMinutes} min read
                    </Text>
                    {modules[moduleId].practiceCount > 0 && (
                      <Text style={styles.modulePractices}>
                        {modules[moduleId].practiceCount} practices
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
        </View>
        <CollapsibleCrisisButton
          mode="standard"
          onNavigate={() => navigation.navigate('CrisisResources')}
          testID="crisis-button"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing[24],
    paddingTop: spacing[24],
    paddingBottom: spacing[16],
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.gray[200],
  },
  headerTitle: {
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.midnightBlue,
    marginBottom: spacing[4],
  },
  headerSubtitle: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[24],
    paddingBottom: spacing[48],
  },
  recommendationCard: {
    backgroundColor: '#F8F5FF', // Light purple background
    borderRadius: borderRadius.xl,
    padding: spacing[24],
    marginBottom: spacing[32],
    borderWidth: 1,
    borderColor: colorSystem.navigation.learn,
  },
  recommendationLabel: {
    fontSize: typography.micro.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.navigation.learn,
    letterSpacing: 0.5,
    marginBottom: spacing[4],
  },
  recommendationTitle: {
    fontSize: typography.title.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.black,
    marginBottom: spacing[4],
  },
  recommendationDescription: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    lineHeight: 20,
    marginBottom: spacing[16],
  },
  recommendationButton: {
    backgroundColor: colorSystem.navigation.learn,
    borderRadius: borderRadius.large,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[24],
    alignItems: 'center',
  },
  recommendationButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
  modulesSection: {
    gap: spacing[16],
  },
  sectionTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
  },
  moduleCard: {
    backgroundColor: colorSystem.base.white,
    borderRadius: borderRadius.xl,
    padding: spacing[24],
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: spacing[16],
  },
  moduleCardEssential: {
    borderWidth: 2,
    borderColor: colorSystem.navigation.learn,
    backgroundColor: '#FEFAFF', // Very light purple tint
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[8],
    gap: spacing[8],
  },
  moduleNumber: {
    width: spacing[32],
    height: spacing[32],
    borderRadius: borderRadius.xl,
    backgroundColor: colorSystem.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleNumberText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.gray[700],
  },
  moduleTag: {
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.medium,
    backgroundColor: colorSystem.gray[100],
  },
  moduleTagEssential: {
    backgroundColor: colorSystem.navigation.learn,
  },
  moduleTagText: {
    fontSize: typography.micro.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.gray[600],
    letterSpacing: 0.5,
  },
  moduleTagTextEssential: {
    color: colorSystem.base.white,
  },
  moduleTitle: {
    fontSize: typography.title.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.black,
    marginBottom: spacing[4],
  },
  moduleDescription: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
    lineHeight: 20,
    marginBottom: spacing[16],
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    marginBottom: spacing[8],
  },
  progressBar: {
    flex: 1,
    height: borderRadius.medium,
    backgroundColor: colorSystem.gray[200],
    borderRadius: borderRadius.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.xs,
  },
  progressText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.gray[600],
    minWidth: spacing[40],
    textAlign: 'right',
  },
  moduleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[16],
  },
  moduleTime: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[500],
  },
  modulePractices: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[500],
  },
});

export default LearnScreen;
