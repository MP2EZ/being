/**
 * PRACTICE TAB - Module Practice Exercises
 * FEAT-49: Educational Modules
 *
 * Displays practice exercises with:
 * - Practice type (guided-timer, sorting, reflection, body-scan)
 * - Duration
 * - Instructions
 * - Launch button (will open practice screen when implemented)
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { colorSystem, spacing, typography, borderRadius } from '@/core/theme';
import { useEducationStore } from '../stores/educationStore';
import type { ModuleContent, ModuleId, Practice } from '@/features/learn/types/education';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface PracticeTabProps {
  moduleContent: ModuleContent;
  moduleId: ModuleId;
}

const PracticeTab: React.FC<PracticeTabProps> = ({
  moduleContent,
  moduleId,
}) => {
  const navigation = useNavigation<NavigationProp>();
  const { incrementPracticeCount } = useEducationStore();

  const handlePracticePress = (practice: Practice) => {
    // Navigate to the appropriate practice screen based on type
    switch (practice.type) {
      case 'guided-timer':
        navigation.navigate('PracticeTimer', {
          practiceId: practice.id,
          moduleId,
          duration: practice.duration ?? 180, // Default 3 minutes
          title: practice.title,
        });
        break;

      case 'sorting':
        // Sorting practice uses scenarios from the practice object
        if (practice.scenarios && practice.scenarios.length > 0) {
          navigation.navigate('SortingPractice', {
            practiceId: practice.id,
            moduleId,
            scenarios: practice.scenarios,
          });
        } else {
          console.warn(`Sorting practice ${practice.id} has no scenarios`);
        }
        break;

      case 'body-scan':
        navigation.navigate('BodyScan', {
          practiceId: practice.id,
          moduleId,
          duration: practice.duration ?? 300, // Default 5 minutes
        });
        break;

      case 'reflection':
        // Reflection exercises - contemplation without breathing circle
        navigation.navigate('ReflectionTimer', {
          practiceId: practice.id,
          moduleId,
          duration: practice.duration ?? 300, // Default 5 minutes
          title: practice.title,
          prompt: practice.description, // Use description as reflection prompt
          ...(practice.instructions && { instructions: practice.instructions }), // Full instruction steps
        });
        break;

      case 'guided-body-scan':
        // Self-paced resistance/tension body check
        navigation.navigate('GuidedBodyScan', {
          practiceId: practice.id,
          moduleId,
          title: practice.title,
        });
        break;

      default:
        console.warn(`Unknown practice type: ${practice.type}`);
        // Fallback to timer screen
        navigation.navigate('PracticeTimer', {
          practiceId: practice.id,
          moduleId,
          duration: practice.duration ?? 180,
          title: practice.title,
        });
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  const getPracticeTypeLabel = (type: string): string => {
    switch (type) {
      case 'guided-timer':
        return 'Guided Practice';
      case 'sorting':
        return 'Interactive Sorting';
      case 'reflection':
        return 'Reflection Exercise';
      case 'body-scan':
        return 'Body Scan';
      case 'guided-body-scan':
        return 'Guided Body Scan';
      default:
        return 'Practice';
    }
  };

  const getPracticeIcon = (type: string): string => {
    switch (type) {
      case 'guided-timer':
        return '⏱️';
      case 'sorting':
        return '🔄';
      case 'reflection':
        return '✍️';
      case 'body-scan':
        return '🧘';
      case 'guided-body-scan':
        return '🙏';
      default:
        return '✨';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Introduction */}
      <View style={styles.introSection}>
        <Text style={styles.introTitle}>Practice Exercises</Text>
        <Text style={styles.introText}>
          These practices help you internalize the principle through direct
          experience. Choose a practice to begin.
        </Text>
      </View>

      {/* Practice Cards */}
      <View style={styles.practicesSection}>
        {moduleContent.practices.map((practice, index) => (
          <View key={practice.id} style={styles.practiceCard}>
            {/* Practice Header */}
            <View style={styles.practiceHeader}>
              <View style={styles.practiceIconContainer}>
                <Text style={styles.practiceEmoji}>
                  {practice.icon || getPracticeIcon(practice.type)}
                </Text>
              </View>
              <View style={styles.practiceHeaderText}>
                <Text style={styles.practiceTitle}>{practice.title}</Text>
                <View style={styles.practiceMetadata}>
                  <Text style={styles.practiceType}>
                    {getPracticeTypeLabel(practice.type)}
                  </Text>
                  <Text style={styles.practiceDuration}>
                    {formatDuration(practice.duration ?? 0)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Practice Description */}
            <Text style={styles.practiceDescription}>
              {practice.description}
            </Text>

            {/* Instructions (expandable in future) */}
            {practice.instructions && practice.instructions.length > 0 && (
              <View style={styles.instructionsSection}>
                <Text style={styles.instructionsLabel}>Instructions:</Text>
                {practice.instructions.slice(0, 3).map((instruction, i) => (
                  <View key={i} style={styles.instructionRow}>
                    <Text style={styles.instructionNumber}>{i + 1}.</Text>
                    <Text style={styles.instructionText}>{instruction}</Text>
                  </View>
                ))}
                {practice.instructions.length > 3 && (
                  <Text style={styles.instructionsMore}>
                    +{practice.instructions.length - 3} more steps
                  </Text>
                )}
              </View>
            )}

            {/* Start Practice Button */}
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => handlePracticePress(practice)}
              activeOpacity={0.7}
            >
              <Text style={styles.startButtonText}>Start Practice</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Practice Tips */}
      <View style={styles.tipsSection}>
        <Text style={styles.tipsTitle}>Practice Tips</Text>
        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>💡</Text>
          <Text style={styles.tipText}>
            <Text style={styles.tipBold}>Consistency over intensity:</Text> 5
            minutes daily beats occasional hour-long sessions. The brain learns
            through repetition.
          </Text>
        </View>
        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>🌱</Text>
          <Text style={styles.tipText}>
            <Text style={styles.tipBold}>Progress takes time:</Text> Genuine
            skill development happens over months and years, not weeks. Trust
            the process.
          </Text>
        </View>
        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>🎯</Text>
          <Text style={styles.tipText}>
            <Text style={styles.tipBold}>Apply in daily life:</Text> The real
            practice happens throughout your day. These exercises are
            preparation.
          </Text>
        </View>
      </View>

      {/* Bottom Padding */}
      <View style={{ height: spacing[64] }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  scrollContent: {
    padding: spacing[24],
  },
  introSection: {
    marginBottom: spacing[32],
  },
  introTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
  },
  introText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    lineHeight: 22,
  },
  practicesSection: {
    gap: spacing[24],
    marginBottom: spacing[32],
  },
  practiceCard: {
    backgroundColor: colorSystem.base.white,
    borderRadius: borderRadius.xl,
    padding: spacing[24],
    borderWidth: 1.5,
    borderColor: colorSystem.navigation.learn,
    gap: spacing[16],
  },
  practiceHeader: {
    flexDirection: 'row',
    gap: spacing[16],
    alignItems: 'flex-start',
  },
  practiceIconContainer: {
    width: spacing[48],
    height: spacing[48],
    borderRadius: borderRadius.xxl,
    backgroundColor: colorSystem.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  practiceEmoji: {
    fontSize: typography.headline4.size,
  },
  practiceHeaderText: {
    flex: 1,
    gap: spacing[4],
  },
  practiceTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
  },
  practiceMetadata: {
    flexDirection: 'row',
    gap: spacing[8],
    flexWrap: 'wrap',
  },
  practiceType: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.navigation.learn,
  },
  practiceDuration: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[500],
  },
  practiceDescription: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    lineHeight: 22,
  },
  instructionsSection: {
    gap: spacing[4],
    paddingTop: spacing[8],
    borderTopWidth: 1,
    borderTopColor: colorSystem.gray[200],
  },
  instructionsLabel: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.gray[700],
    marginBottom: spacing[4],
  },
  instructionRow: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  instructionNumber: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.navigation.learn,
    minWidth: spacing[20],
  },
  instructionText: {
    flex: 1,
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[700],
    lineHeight: 20,
  },
  instructionsMore: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[500],
    fontStyle: 'italic',
    marginTop: spacing[4],
  },
  startButton: {
    backgroundColor: colorSystem.navigation.learn,
    borderRadius: borderRadius.large,
    paddingVertical: spacing[16],
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
  tipsSection: {
    gap: spacing[16],
  },
  tipsTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
  },
  tipCard: {
    flexDirection: 'row',
    gap: spacing[16],
    backgroundColor: colorSystem.gray[50],
    padding: spacing[16],
    borderRadius: borderRadius.large,
    borderWidth: 1.5,
    borderColor: colorSystem.navigation.learn,
  },
  tipIcon: {
    fontSize: typography.title.size,
  },
  tipText: {
    flex: 1,
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[700],
    lineHeight: 20,
  },
  tipBold: {
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.gray[800],
  },
});

export default PracticeTab;
