/**
 * MODULE DETAIL SCREEN - Educational Module Detail View
 * FEAT-49: Educational Modules for 5 Stoic Principles
 * FEAT-80: Reorganized to 2-tab design (Overview + Practice)
 *
 * Shows module content across 2 tabs:
 * - Overview: Classical quote, What It Is, Why It Matters, Common Obstacles, Developmental Stages
 * - Practice: Practice exercises with timers/interactions
 *
 * Non-negotiables:
 * - User-determined completion (no forced progression)
 * - No performance metrics (no accuracy scores)
 * - Learning-focused (not gamified)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';
import { colorSystem, spacing, typography, borderRadius } from '@/core/theme';
import { useEducationStore } from '@/features/learn/stores/educationStore';
import { loadModuleContent } from '@/core/services/moduleContent';
import type { ModuleId, ModuleContent } from '@/features/learn/types/education';
import OverviewTab from '@/features/learn/tabs/OverviewTab';
import PracticeTab from '@/features/learn/tabs/PracticeTab';

type ModuleDetailRouteProp = RouteProp<
  { ModuleDetail: { moduleId: ModuleId } },
  'ModuleDetail'
>;

type NavigationProp = StackNavigationProp<RootStackParamList>;

type TabType = 'overview' | 'practice';

const ModuleDetailScreen: React.FC = () => {
  const route = useRoute<ModuleDetailRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { moduleId } = route.params;

  const { setCurrentModule, getModuleProgress } = useEducationStore();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [moduleContent, setModuleContent] = useState<ModuleContent | null>(null);
  const [loading, setLoading] = useState(true);

  const moduleProgress = getModuleProgress(moduleId);

  // Load module content on mount
  useEffect(() => {
    const loadContent = async () => {
      try {
        setLoading(true);
        const content = await loadModuleContent(moduleId);
        setModuleContent(content);
        setCurrentModule(moduleId);
      } catch (error) {
        console.error('[ModuleDetail] Failed to load module:', error);
        // TODO: Show error state to user
      } finally {
        setLoading(false);
      }
    };

    loadContent();

    return () => {
      setCurrentModule(null);
    };
  }, [moduleId]);

  const handleBack = () => {
    navigation.goBack();
  };

  const renderTabContent = () => {
    if (!moduleContent) return null;

    switch (activeTab) {
      case 'overview':
        return <OverviewTab moduleContent={moduleContent} moduleId={moduleId} />;
      case 'practice':
        return <PracticeTab moduleContent={moduleContent} moduleId={moduleId} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colorSystem.navigation.learn} />
          <Text style={styles.loadingText}>Loading module...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!moduleContent) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load module content.</Text>
          <TouchableOpacity style={styles.errorButton} onPress={handleBack}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isMostEssential = moduleId === 'sphere-sovereignty';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, isMostEssential && styles.headerEssential]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <Text style={styles.headerNumber}>Module {moduleContent.number}</Text>
              <View
                style={[
                  styles.headerTag,
                  isMostEssential && styles.headerTagEssential,
                ]}
              >
                <Text
                  style={[
                    styles.headerTagText,
                    isMostEssential && styles.headerTagTextEssential,
                  ]}
                >
                  {moduleContent.tag}
                </Text>
              </View>
            </View>
            <Text style={styles.headerTitle}>{moduleContent.title}</Text>
            <Text style={styles.headerDescription}>
              {moduleContent.description}
            </Text>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'overview' && styles.tabTextActive,
              ]}
            >
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'practice' && styles.tabActive]}
            onPress={() => setActiveTab('practice')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'practice' && styles.tabTextActive,
              ]}
            >
              Practice
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>{renderTabContent()}</View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  errorText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: colorSystem.navigation.learn,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.large,
  },
  errorButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colorSystem.gray[50],
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.gray[200],
  },
  headerEssential: {
    backgroundColor: '#F8F5FF', // Light purple for Module 3
  },
  backButton: {
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  backButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.navigation.learn,
  },
  headerContent: {
    gap: spacing.xs,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerNumber: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.gray[600],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.medium,
    backgroundColor: colorSystem.gray[200],
  },
  headerTagEssential: {
    backgroundColor: colorSystem.navigation.learn,
  },
  headerTagText: {
    fontSize: typography.micro.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.gray[700],
    letterSpacing: 0.5,
  },
  headerTagTextEssential: {
    color: colorSystem.base.white,
  },
  headerTitle: {
    fontSize: typography.headline4.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.black,
  },
  headerDescription: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    lineHeight: 20,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colorSystem.base.white,
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.gray[200],
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colorSystem.navigation.learn,
  },
  tabText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.gray[600],
  },
  tabTextActive: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.navigation.learn,
  },
  tabContent: {
    flex: 1,
  },
});

export default ModuleDetailScreen;
