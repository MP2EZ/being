/**
 * CognitiveConflictResolver - Simplified conflict resolution for cognitive accessibility
 *
 * Features:
 * - Simplified language and concepts for cognitive accessibility
 * - Visual and logical simplification for mental health users
 * - Enhanced decision support for users with cognitive challenges
 * - Crisis-safe conflict resolution with preserved emergency access
 * - Progressive complexity based on user cognitive level
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform
} from 'react-native';
import { Button } from '../core/Button';
import { useTheme } from '../../hooks/useTheme';
import { useCommonHaptics } from '../../hooks/useHaptics';
import { SyncAccessibilityCoordinator } from '../../services/accessibility/SyncAccessibilityCoordinator';
import { colorSystem, spacing, borderRadius, typography } from '../../constants/colors';
import {
  SyncConflict,
  ConflictType,
  ConflictResolutionStrategy
} from '../../types/cross-device-sync';

// Enhanced conflict interface with cognitive accessibility metadata
interface CognitiveConflict extends SyncConflict {
  simplifiedExplanation: string;
  impactDescription: string;
  recommendedAction: 'keep_local' | 'keep_remote' | 'merge' | 'expert_help';
  difficultyLevel: 'simple' | 'moderate' | 'complex';
  userFriendlyPreview: {
    thisDevice: string;
    otherDevice: string;
    whatItMeans: string;
  };
}

interface CognitiveConflictResolverProps {
  conflicts: CognitiveConflict[];
  onResolveConflict: (conflictId: string, resolution: ConflictResolutionStrategy) => Promise<void>;
  onRequestExpertHelp: (conflictId: string) => void;
  userCognitiveLevel: 'high' | 'moderate' | 'low' | 'crisis';
  currentMentalHealthState: 'stable' | 'depression' | 'anxiety' | 'crisis';
  testID?: string;
}

export const CognitiveConflictResolver: React.FC<CognitiveConflictResolverProps> = ({
  conflicts,
  onResolveConflict,
  onRequestExpertHelp,
  userCognitiveLevel,
  currentMentalHealthState,
  testID = 'cognitive-conflict-resolver'
}) => {
  const { colorSystem } = useTheme();
  const { onPress, onSelect, onSuccess, onWarning } = useCommonHaptics();

  // State for simplified conflict management
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0);
  const [showDetailedComparison, setShowDetailedComparison] = useState(false);
  const [resolvingConflicts, setResolvingConflicts] = useState<Set<string>>(new Set());

  // Filter and sort conflicts based on cognitive accessibility needs
  const processedConflicts = useMemo(() => {
    return conflicts
      .filter(conflict => shouldShowConflict(conflict, userCognitiveLevel))
      .sort((a, b) => getConflictPriority(a) - getConflictPriority(b))
      .map(conflict => enhanceConflictForCognitiveAccess(conflict, userCognitiveLevel));
  }, [conflicts, userCognitiveLevel]);

  const currentConflict = processedConflicts[currentConflictIndex];

  // Enhanced conflict resolution with cognitive support
  const handleSimplifiedResolution = useCallback(async (
    conflict: CognitiveConflict,
    choice: 'this_device' | 'other_device' | 'recommended' | 'get_help'
  ) => {
    try {
      await onSelect();
      setResolvingConflicts(prev => new Set([...prev, conflict.id]));

      // Announce decision for screen reader users
      SyncAccessibilityCoordinator.announceForComponent(
        'cognitive-resolver',
        getDecisionAnnouncement(conflict, choice),
        'polite',
        'therapeutic'
      );

      if (choice === 'get_help') {
        onRequestExpertHelp(conflict.id);
        return;
      }

      // Convert simplified choice to resolution strategy
      const strategy = getResolutionStrategy(choice, conflict.recommendedAction);
      await onResolveConflict(conflict.id, strategy);
      await onSuccess();

      // Move to next conflict if available
      if (currentConflictIndex < processedConflicts.length - 1) {
        setCurrentConflictIndex(prev => prev + 1);
      }

    } catch (error) {
      console.error('Cognitive conflict resolution failed:', error);
      await onWarning();

      SyncAccessibilityCoordinator.announceForComponent(
        'cognitive-resolver',
        'Resolution failed. You can try again or get help.',
        'assertive',
        'general'
      );
    } finally {
      setResolvingConflicts(prev => {
        const next = new Set(prev);
        next.delete(conflict.id);
        return next;
      });
    }
  }, [currentConflictIndex, processedConflicts.length, onSelect, onSuccess, onWarning, onResolveConflict, onRequestExpertHelp]);

  // Render simplified conflict view for cognitive accessibility
  const renderSimplifiedConflictView = useCallback((conflict: CognitiveConflict) => {
    const isResolving = resolvingConflicts.has(conflict.id);

    return (
      <View style={[styles.simplifiedConflictContainer, { backgroundColor: colorSystem.base.white }]}>
        {/* Clear progress indicator */}
        <View style={styles.progressHeader}>
          <Text
            style={[styles.progressText, { color: colorSystem.accessibility.text.secondary }]}
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel={`Conflict ${currentConflictIndex + 1} of ${processedConflicts.length}`}
          >
            Question {currentConflictIndex + 1} of {processedConflicts.length}
          </Text>
        </View>

        {/* Simplified conflict explanation */}
        <View
          style={styles.explanationSection}
          accessible={true}
          accessibilityRole="text"
          accessibilityLabel="Conflict explanation"
          accessibilityValue={conflict.simplifiedExplanation}
        >
          <Text style={[styles.conflictTitle, { color: colorSystem.accessibility.text.primary }]}>
            {getSimplifiedTitle(conflict)}
          </Text>

          <Text style={[styles.conflictExplanation, { color: colorSystem.accessibility.text.primary }]}>
            {conflict.simplifiedExplanation}
          </Text>

          <Text style={[styles.impactDescription, { color: colorSystem.accessibility.text.secondary }]}>
            {conflict.impactDescription}
          </Text>
        </View>

        {/* Visual comparison for cognitive support */}
        <View style={styles.comparisonSection}>
          <Text style={[styles.comparisonTitle, { color: colorSystem.accessibility.text.primary }]}>
            Here's what's different:
          </Text>

          <View style={styles.comparisonCards}>
            <View
              style={[styles.comparisonCard, styles.thisDeviceCard, { borderColor: colorSystem.status.info }]}
              accessible={true}
              accessibilityRole="text"
              accessibilityLabel="This device's version"
              accessibilityValue={conflict.userFriendlyPreview.thisDevice}
            >
              <Text style={[styles.cardHeader, { color: colorSystem.status.info }]}>
                📱 This Device
              </Text>
              <Text style={[styles.cardContent, { color: colorSystem.accessibility.text.primary }]}>
                {conflict.userFriendlyPreview.thisDevice}
              </Text>
            </View>

            <View
              style={[styles.comparisonCard, styles.otherDeviceCard, { borderColor: colorSystem.status.warning }]}
              accessible={true}
              accessibilityRole="text"
              accessibilityLabel="Other device's version"
              accessibilityValue={conflict.userFriendlyPreview.otherDevice}
            >
              <Text style={[styles.cardHeader, { color: colorSystem.status.warning }]}>
                📱 Other Device
              </Text>
              <Text style={[styles.cardContent, { color: colorSystem.accessibility.text.primary }]}>
                {conflict.userFriendlyPreview.otherDevice}
              </Text>
            </View>
          </View>

          <View
            style={[styles.meaningCard, { backgroundColor: colorSystem.status.infoBackground }]}
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel="What this means"
            accessibilityValue={conflict.userFriendlyPreview.whatItMeans}
          >
            <Text style={[styles.meaningHeader, { color: colorSystem.status.info }]}>
              💡 What this means:
            </Text>
            <Text style={[styles.meaningContent, { color: colorSystem.accessibility.text.primary }]}>
              {conflict.userFriendlyPreview.whatItMeans}
            </Text>
          </View>
        </View>

        {/* Simplified decision options */}
        <View style={styles.decisionSection}>
          <Text style={[styles.decisionPrompt, { color: colorSystem.accessibility.text.primary }]}>
            Which would you like to use?
          </Text>

          <View style={styles.decisionButtons}>
            {/* Keep this device's version */}
            <Button
              variant="primary"
              onPress={() => handleSimplifiedResolution(conflict, 'this_device')}
              loading={isResolving}
              style={styles.decisionButton}
              accessibilityLabel="Keep this device's version"
              accessibilityHint={`Use the information from this device: ${conflict.userFriendlyPreview.thisDevice}`}
              accessibilityActions={[
                {
                  name: 'activate',
                  label: 'Choose this device\'s version'
                }
              ]}
              testID={`${testID}-keep-local`}
            >
              Use This Device's Version
            </Button>

            {/* Keep other device's version */}
            <Button
              variant="outline"
              onPress={() => handleSimplifiedResolution(conflict, 'other_device')}
              loading={isResolving}
              style={styles.decisionButton}
              accessibilityLabel="Keep other device's version"
              accessibilityHint={`Use the information from the other device: ${conflict.userFriendlyPreview.otherDevice}`}
              accessibilityActions={[
                {
                  name: 'activate',
                  label: 'Choose other device\'s version'
                }
              ]}
              testID={`${testID}-keep-remote`}
            >
              Use Other Device's Version
            </Button>

            {/* Recommended choice (if available) */}
            {conflict.recommendedAction !== 'expert_help' && (
              <Button
                variant="secondary"
                onPress={() => handleSimplifiedResolution(conflict, 'recommended')}
                loading={isResolving}
                style={[styles.decisionButton, styles.recommendedButton]}
                accessibilityLabel="Use recommended choice"
                accessibilityHint={`The app recommends: ${getRecommendationExplanation(conflict.recommendedAction)}`}
                accessibilityActions={[
                  {
                    name: 'activate',
                    label: 'Choose recommended option'
                  }
                ]}
                testID={`${testID}-recommended`}
              >
                ⭐ Use Recommended Choice
              </Button>
            )}

            {/* Get help option */}
            <Button
              variant="outline"
              onPress={() => handleSimplifiedResolution(conflict, 'get_help')}
              style={[styles.decisionButton, styles.helpButton]}
              accessibilityLabel="Get help with this decision"
              accessibilityHint="Ask for expert help to resolve this conflict"
              accessibilityActions={[
                {
                  name: 'activate',
                  label: 'Request expert assistance'
                }
              ]}
              testID={`${testID}-get-help`}
            >
              🤝 I Need Help Deciding
            </Button>
          </View>
        </View>

        {/* Detailed comparison toggle for users who want more info */}
        {userCognitiveLevel !== 'crisis' && (
          <TouchableOpacity
            style={styles.detailsToggle}
            onPress={() => setShowDetailedComparison(!showDetailedComparison)}
            accessibilityRole="button"
            accessibilityLabel={showDetailedComparison ? 'Hide detailed comparison' : 'Show detailed comparison'}
            accessibilityHint="Toggle technical details about the conflict"
          >
            <Text style={[styles.detailsToggleText, { color: colorSystem.status.info }]}>
              {showDetailedComparison ? '▼ Hide Technical Details' : '▶ Show Technical Details'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Detailed comparison (collapsible) */}
        {showDetailedComparison && renderDetailedComparison(conflict)}
      </View>
    );
  }, [
    currentConflictIndex,
    processedConflicts.length,
    resolvingConflicts,
    showDetailedComparison,
    userCognitiveLevel,
    colorSystem,
    handleSimplifiedResolution,
    testID
  ]);

  // Render detailed technical comparison
  const renderDetailedComparison = (conflict: CognitiveConflict) => (
    <View
      style={[styles.detailedSection, { backgroundColor: colorSystem.gray[50] }]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel="Technical details"
    >
      <Text style={[styles.detailedTitle, { color: colorSystem.accessibility.text.primary }]}>
        Technical Details
      </Text>

      <View style={styles.technicalComparison}>
        <View style={styles.technicalItem}>
          <Text style={[styles.technicalLabel, { color: colorSystem.accessibility.text.secondary }]}>
            Conflict Type:
          </Text>
          <Text style={[styles.technicalValue, { color: colorSystem.accessibility.text.primary }]}>
            {getConflictTypeDescription(conflict.conflictType)}
          </Text>
        </View>

        <View style={styles.technicalItem}>
          <Text style={[styles.technicalLabel, { color: colorSystem.accessibility.text.secondary }]}>
            Local Data:
          </Text>
          <Text style={[styles.technicalValue, { color: colorSystem.accessibility.text.primary }]}>
            {JSON.stringify(conflict.localData, null, 2)}
          </Text>
        </View>

        <View style={styles.technicalItem}>
          <Text style={[styles.technicalLabel, { color: colorSystem.accessibility.text.secondary }]}>
            Remote Data:
          </Text>
          <Text style={[styles.technicalValue, { color: colorSystem.accessibility.text.primary }]}>
            {JSON.stringify(conflict.remoteData, null, 2)}
          </Text>
        </View>
      </View>
    </View>
  );

  // Main render
  if (!currentConflict) {
    return (
      <View
        style={[styles.emptyState, { backgroundColor: colorSystem.gray[50] }]}
        accessible={true}
        accessibilityRole="text"
        accessibilityLabel="No conflicts to resolve"
      >
        <Text style={[styles.emptyStateText, { color: colorSystem.accessibility.text.secondary }]}>
          ✅ All conflicts have been resolved
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colorSystem.gray[50] }]}
      showsVerticalScrollIndicator={false}
      accessible={true}
      accessibilityLabel="Conflict resolution screen"
      testID={testID}
    >
      {renderSimplifiedConflictView(currentConflict)}

      {/* Navigation controls */}
      {processedConflicts.length > 1 && (
        <View style={styles.navigationControls}>
          <Button
            variant="outline"
            onPress={() => setCurrentConflictIndex(Math.max(0, currentConflictIndex - 1))}
            disabled={currentConflictIndex === 0}
            style={styles.navButton}
            accessibilityLabel="Previous conflict"
            accessibilityHint="Go to previous conflict to resolve"
          >
            ← Previous
          </Button>

          <Button
            variant="outline"
            onPress={() => setCurrentConflictIndex(Math.min(processedConflicts.length - 1, currentConflictIndex + 1))}
            disabled={currentConflictIndex === processedConflicts.length - 1}
            style={styles.navButton}
            accessibilityLabel="Next conflict"
            accessibilityHint="Go to next conflict to resolve"
          >
            Next →
          </Button>
        </View>
      )}
    </ScrollView>
  );
};

// Helper functions for cognitive accessibility

const shouldShowConflict = (conflict: SyncConflict, cognitiveLevel: string): boolean => {
  // Hide very complex conflicts for users with low cognitive capacity
  if (cognitiveLevel === 'crisis') {
    return conflict.entityType === 'CRISIS_PLAN'; // Only show crisis-related conflicts
  }

  if (cognitiveLevel === 'low') {
    // Hide technical conflicts that can be auto-resolved
    return !['WIDGET_DATA', 'SESSION_DATA'].includes(conflict.entityType);
  }

  return true;
};

const getConflictPriority = (conflict: SyncConflict): number => {
  // Lower number = higher priority
  const priorityMap: Record<string, number> = {
    'CRISIS_PLAN': 1,
    'ASSESSMENT': 2,
    'CHECK_IN': 3,
    'USER_PROFILE': 4,
    'SESSION_DATA': 5,
    'WIDGET_DATA': 6
  };

  return priorityMap[conflict.entityType] || 10;
};

const enhanceConflictForCognitiveAccess = (
  conflict: SyncConflict,
  cognitiveLevel: string
): CognitiveConflict => {
  const enhanced: CognitiveConflict = {
    ...conflict,
    simplifiedExplanation: getSimplifiedExplanation(conflict, cognitiveLevel),
    impactDescription: getImpactDescription(conflict),
    recommendedAction: getRecommendedAction(conflict),
    difficultyLevel: getDifficultyLevel(conflict),
    userFriendlyPreview: getUserFriendlyPreview(conflict)
  };

  return enhanced;
};

const getSimplifiedExplanation = (conflict: SyncConflict, cognitiveLevel: string): string => {
  const entityName = getEntityDisplayName(conflict.entityType);

  if (cognitiveLevel === 'crisis') {
    return `Your ${entityName} information is different on your devices. We need to pick one version.`;
  }

  if (cognitiveLevel === 'low') {
    return `You have different ${entityName} on this device and another device. You can choose which one to keep.`;
  }

  return `Your ${entityName} was changed on multiple devices, creating different versions. You need to decide which version to use going forward.`;
};

const getImpactDescription = (conflict: SyncConflict): string => {
  const entityName = getEntityDisplayName(conflict.entityType);

  if (conflict.entityType === 'CRISIS_PLAN') {
    return `This affects your safety plan. Choose the version that has your most current emergency information.`;
  }

  if (conflict.entityType === 'ASSESSMENT') {
    return `This affects your ${entityName} results. Choose the version that reflects your most recent assessment.`;
  }

  return `This affects your ${entityName}. Choose the version that has your most recent and accurate information.`;
};

const getRecommendedAction = (conflict: SyncConflict): 'keep_local' | 'keep_remote' | 'merge' | 'expert_help' => {
  // Simple heuristics for recommendations
  if (conflict.entityType === 'CRISIS_PLAN') {
    return 'expert_help'; // Always get help for crisis plans
  }

  if (conflict.conflictType === ConflictType.ENCRYPTION_MISMATCH) {
    return 'expert_help'; // Technical conflicts need expert help
  }

  // For now, recommend keeping local version as it's what user is currently seeing
  return 'keep_local';
};

const getDifficultyLevel = (conflict: SyncConflict): 'simple' | 'moderate' | 'complex' => {
  if (conflict.entityType === 'CRISIS_PLAN') return 'complex';
  if (conflict.conflictType === ConflictType.ENCRYPTION_MISMATCH) return 'complex';
  if (conflict.entityType === 'ASSESSMENT') return 'moderate';
  return 'simple';
};

const getUserFriendlyPreview = (conflict: SyncConflict): {
  thisDevice: string;
  otherDevice: string;
  whatItMeans: string;
} => {
  // Convert technical data to user-friendly descriptions
  const entityName = getEntityDisplayName(conflict.entityType);

  return {
    thisDevice: formatDataForUser(conflict.localData, conflict.entityType),
    otherDevice: formatDataForUser(conflict.remoteData, conflict.entityType),
    whatItMeans: `Your ${entityName} has different information on your devices. Pick the one that's most accurate.`
  };
};

const formatDataForUser = (data: any, entityType: string): string => {
  // Convert technical data to human-readable format
  if (typeof data === 'string') return data;

  if (entityType === 'ASSESSMENT') {
    return `Assessment score: ${data.score || 'Unknown'}`;
  }

  if (entityType === 'CHECK_IN') {
    return `Mood: ${data.mood || 'Not recorded'}, Date: ${data.date || 'Unknown'}`;
  }

  if (entityType === 'CRISIS_PLAN') {
    const contacts = data.emergencyContacts?.length || 0;
    return `Emergency plan with ${contacts} contact${contacts !== 1 ? 's' : ''}`;
  }

  // Fallback to simple JSON representation
  return JSON.stringify(data).substring(0, 50) + '...';
};

const getEntityDisplayName = (entityType: string): string => {
  const displayNames: Record<string, string> = {
    'CHECK_IN': 'daily check-in',
    'ASSESSMENT': 'assessment',
    'CRISIS_PLAN': 'crisis plan',
    'USER_PROFILE': 'profile',
    'SESSION_DATA': 'session progress',
    'WIDGET_DATA': 'widget'
  };

  return displayNames[entityType] || entityType.toLowerCase().replace('_', ' ');
};

const getSimplifiedTitle = (conflict: CognitiveConflict): string => {
  const entityName = getEntityDisplayName(conflict.entityType);
  return `Different ${entityName} information found`;
};

const getDecisionAnnouncement = (conflict: CognitiveConflict, choice: string): string => {
  const entityName = getEntityDisplayName(conflict.entityType);

  switch (choice) {
    case 'this_device':
      return `Keeping this device's ${entityName} information`;
    case 'other_device':
      return `Keeping other device's ${entityName} information`;
    case 'recommended':
      return `Using recommended choice for ${entityName}`;
    case 'get_help':
      return `Requesting help for ${entityName} conflict`;
    default:
      return `Decision made for ${entityName} conflict`;
  }
};

const getResolutionStrategy = (
  choice: string,
  recommended: 'keep_local' | 'keep_remote' | 'merge' | 'expert_help'
): ConflictResolutionStrategy => {
  switch (choice) {
    case 'this_device':
      return { strategy: 'client_wins' };
    case 'other_device':
      return { strategy: 'server_wins' };
    case 'recommended':
      return {
        strategy: recommended === 'keep_local' ? 'client_wins' :
                 recommended === 'keep_remote' ? 'server_wins' : 'merge'
      };
    default:
      return { strategy: 'client_wins' };
  }
};

const getRecommendationExplanation = (action: string): string => {
  switch (action) {
    case 'keep_local':
      return 'Keep this device\'s version';
    case 'keep_remote':
      return 'Keep other device\'s version';
    case 'merge':
      return 'Combine both versions';
    default:
      return 'Ask for expert help';
  }
};

const getConflictTypeDescription = (type: ConflictType): string => {
  switch (type) {
    case ConflictType.VERSION_MISMATCH:
      return 'Different versions of the same data';
    case ConflictType.TIMESTAMP_CONFLICT:
      return 'Data modified at different times';
    case ConflictType.DATA_DIVERGENCE:
      return 'Data has different values';
    case ConflictType.ENCRYPTION_MISMATCH:
      return 'Security encryption differences';
    default:
      return 'Unknown conflict type';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  simplifiedConflictContainer: {
    margin: spacing.lg,
    borderRadius: borderRadius.large,
    padding: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  progressHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  progressText: {
    fontSize: typography.caption.size,
    fontWeight: '500',
  },
  explanationSection: {
    marginBottom: spacing.xl,
  },
  conflictTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    marginBottom: spacing.md,
  },
  conflictExplanation: {
    fontSize: typography.bodyLarge.size,
    lineHeight: typography.bodyLarge.lineHeight * typography.bodyLarge.size,
    marginBottom: spacing.md,
  },
  impactDescription: {
    fontSize: typography.bodyRegular.size,
    lineHeight: typography.bodyRegular.lineHeight * typography.bodyRegular.size,
    fontStyle: 'italic',
  },
  comparisonSection: {
    marginBottom: spacing.xl,
  },
  comparisonTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  comparisonCards: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  comparisonCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    borderWidth: 2,
  },
  thisDeviceCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  otherDeviceCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },
  cardHeader: {
    fontSize: typography.caption.size,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  cardContent: {
    fontSize: typography.bodyRegular.size,
    lineHeight: typography.bodyRegular.lineHeight * typography.bodyRegular.size,
  },
  meaningCard: {
    padding: spacing.md,
    borderRadius: borderRadius.medium,
  },
  meaningHeader: {
    fontSize: typography.caption.size,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  meaningContent: {
    fontSize: typography.bodyRegular.size,
    lineHeight: typography.bodyRegular.lineHeight * typography.bodyRegular.size,
  },
  decisionSection: {
    marginBottom: spacing.xl,
  },
  decisionPrompt: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  decisionButtons: {
    gap: spacing.md,
  },
  decisionButton: {
    marginBottom: 0,
    minHeight: 56, // Larger touch targets
  },
  recommendedButton: {
    borderWidth: 2,
  },
  helpButton: {
    marginTop: spacing.md,
  },
  detailsToggle: {
    padding: spacing.md,
    alignItems: 'center',
  },
  detailsToggleText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '500',
  },
  detailedSection: {
    padding: spacing.lg,
    borderRadius: borderRadius.medium,
    marginTop: spacing.md,
  },
  detailedTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  technicalComparison: {
    gap: spacing.md,
  },
  technicalItem: {
    marginBottom: spacing.sm,
  },
  technicalLabel: {
    fontSize: typography.caption.size,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  technicalValue: {
    fontSize: typography.caption.size,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: spacing.sm,
    borderRadius: borderRadius.small,
  },
  navigationControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
    gap: spacing.md,
  },
  navButton: {
    flex: 1,
    marginBottom: 0,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyStateText: {
    fontSize: typography.bodyLarge.size,
    textAlign: 'center',
  },
});

export default CognitiveConflictResolver;