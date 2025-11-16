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
import { colorSystem, spacing } from '@/core/theme/colors';
import { useEducationStore } from '../../stores/educationStore';
import { loadModuleContent } from '../../services/moduleContent';
import type { ModuleId, ModuleContent } from '../../types/education';
import OverviewTab from './tabs/OverviewTab';
import PracticeTab from './tabs/PracticeTab';

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
    fontSize: 16,
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
    fontSize: 16,
    color: colorSystem.gray[700],
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: colorSystem.navigation.learn,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 16,
    fontWeight: '500',
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
    fontSize: 13,
    fontWeight: '600',
    color: colorSystem.gray[600],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colorSystem.gray[200],
  },
  headerTagEssential: {
    backgroundColor: colorSystem.navigation.learn,
  },
  headerTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colorSystem.gray[700],
    letterSpacing: 0.5,
  },
  headerTagTextEssential: {
    color: colorSystem.base.white,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colorSystem.base.black,
  },
  headerDescription: {
    fontSize: 15,
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
    fontSize: 15,
    fontWeight: '500',
    color: colorSystem.gray[600],
  },
  tabTextActive: {
    fontSize: 15,
    fontWeight: '600',
    color: colorSystem.navigation.learn,
  },
  tabContent: {
    flex: 1,
  },
});

export default ModuleDetailScreen;
