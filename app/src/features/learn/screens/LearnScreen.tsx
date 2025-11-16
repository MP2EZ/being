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

import React, { useEffect } from 'react';
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
import { colorSystem, spacing } from '@/core/theme/colors';
import { useEducationStore } from '@/stores/educationStore';
import type { ModuleId } from '@/types/education';

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
    <SafeAreaView style={styles.safeArea}>
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
              const isRecommended = moduleId === recommendedModuleId;
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.gray[200],
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 15,
    color: colorSystem.gray[600],
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  recommendationCard: {
    backgroundColor: '#F8F5FF', // Light purple background
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colorSystem.navigation.learn,
  },
  recommendationLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colorSystem.navigation.learn,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  recommendationTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  recommendationDescription: {
    fontSize: 15,
    color: colorSystem.gray[700],
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  recommendationButton: {
    backgroundColor: colorSystem.navigation.learn,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  recommendationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.base.white,
  },
  modulesSection: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.sm,
  },
  moduleCard: {
    backgroundColor: colorSystem.base.white,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: spacing.md,
  },
  moduleCardEssential: {
    borderWidth: 2,
    borderColor: colorSystem.navigation.learn,
    backgroundColor: '#FEFAFF', // Very light purple tint
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  moduleNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colorSystem.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: colorSystem.gray[700],
  },
  moduleTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colorSystem.gray[100],
  },
  moduleTagEssential: {
    backgroundColor: colorSystem.navigation.learn,
  },
  moduleTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colorSystem.gray[600],
    letterSpacing: 0.5,
  },
  moduleTagTextEssential: {
    color: colorSystem.base.white,
  },
  moduleTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  moduleDescription: {
    fontSize: 14,
    color: colorSystem.gray[600],
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colorSystem.gray[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    color: colorSystem.gray[600],
    minWidth: 40,
    textAlign: 'right',
  },
  moduleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  moduleTime: {
    fontSize: 13,
    color: colorSystem.gray[500],
  },
  modulePractices: {
    fontSize: 13,
    color: colorSystem.gray[500],
  },
});

export default LearnScreen;
