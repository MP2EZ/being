/**
 * SyncConflictResolver - User-friendly conflict resolution interface
 *
 * Features:
 * - Side-by-side data comparison for conflicts
 * - Smart merge suggestions with domain priority (crisis > therapeutic > general)
 * - One-tap resolution for non-critical conflicts
 * - Manual resolution interface for complex conflicts
 * - Crisis safety: Crisis data always takes priority
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../core/Button';
import { useTheme } from '../../hooks/useTheme';
import { useCommonHaptics } from '../../hooks/useHaptics';
import { colorSystem, spacing, borderRadius, typography } from '../../constants/colors';
import {
  SyncConflict,
  ConflictType,
  ConflictResolutionStrategy
} from '../../types/cross-device-sync';

// Enhanced conflict interface with domain-specific metadata
interface EnhancedSyncConflict extends SyncConflict {
  domainPriority: 'crisis' | 'therapeutic' | 'general';
  userImpact: 'high' | 'medium' | 'low';
  autoResolvable: boolean;
  smartSuggestion?: {
    strategy: ConflictResolutionStrategy['strategy'];
    confidence: number; // 0-1
    reasoning: string;
  };
  previewData?: {
    localPreview: string;
    remotePreview: string;
    mergedPreview?: string;
  };
}

interface SyncConflictResolverProps {
  conflicts: EnhancedSyncConflict[];
  onResolveConflict: (conflictId: string, resolution: ConflictResolutionStrategy) => Promise<void>;
  onResolveAll: (resolutions: Array<{ conflictId: string; resolution: ConflictResolutionStrategy }>) => Promise<void>;
  onClose: () => void;
  showAsModal?: boolean;
  testID?: string;
}

export const SyncConflictResolver: React.FC<SyncConflictResolverProps> = React.memo(({
  conflicts,
  onResolveConflict,
  onResolveAll,
  onClose,
  showAsModal = true,
  testID = 'sync-conflict-resolver'
}) => {
  const { colorSystem } = useTheme();
  const { onPress, onSelect, onSuccess, onError } = useCommonHaptics();

  // State management with performance optimization
  const [selectedConflict, setSelectedConflict] = useState<EnhancedSyncConflict | null>(null);
  const [resolvingConflicts, setResolvingConflicts] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);

  // Categorize conflicts by domain priority
  const categorizedConflicts = useMemo(() => {
    const crisis = conflicts.filter(c => c.domainPriority === 'crisis');
    const therapeutic = conflicts.filter(c => c.domainPriority === 'therapeutic');
    const general = conflicts.filter(c => c.domainPriority === 'general');

    return { crisis, therapeutic, general };
  }, [conflicts]);

  // Count auto-resolvable conflicts
  const autoResolvableCount = useMemo(() => {
    return conflicts.filter(c => c.autoResolvable).length;
  }, [conflicts]);

  // Get conflict type display
  const getConflictTypeDisplay = useCallback((type: ConflictType) => {
    switch (type) {
      case ConflictType.VERSION_MISMATCH:
        return { label: 'Version Conflict', icon: '🔄', description: 'Data was modified on multiple devices' };
      case ConflictType.TIMESTAMP_CONFLICT:
        return { label: 'Timing Conflict', icon: '⏰', description: 'Conflicting timestamps detected' };
      case ConflictType.DATA_DIVERGENCE:
        return { label: 'Data Divergence', icon: '📊', description: 'Different data values found' };
      case ConflictType.ENCRYPTION_MISMATCH:
        return { label: 'Security Conflict', icon: '🔒', description: 'Encryption keys or data integrity mismatch' };
      default:
        return { label: 'Unknown Conflict', icon: '❓', description: 'Unrecognized conflict type' };
    }
  }, []);

  // Get priority display
  const getPriorityDisplay = useCallback((priority: EnhancedSyncConflict['domainPriority']) => {
    switch (priority) {
      case 'crisis':
        return {
          label: 'Crisis Priority',
          color: colorSystem.status.critical,
          icon: '🚨',
          description: 'Crisis or safety-related data'
        };
      case 'therapeutic':
        return {
          label: 'Therapeutic',
          color: colorSystem.status.warning,
          icon: '🎯',
          description: 'MBCT exercises, assessments, progress data'
        };
      case 'general':
        return {
          label: 'General',
          color: colorSystem.status.info,
          icon: '📱',
          description: 'Settings, preferences, non-clinical data'
        };
    }
  }, [colorSystem]);

  // Handle automatic resolution
  const handleAutoResolve = useCallback(async (conflict: EnhancedSyncConflict) => {
    if (!conflict.autoResolvable || !conflict.smartSuggestion) return;

    try {
      await onSelect();
      setResolvingConflicts(prev => new Set([...prev, conflict.id]));

      const strategy: ConflictResolutionStrategy = {
        strategy: conflict.smartSuggestion.strategy,
        ...(conflict.domainPriority === 'crisis' && {
          crisisPriority: {
            prioritizeLocal: conflict.smartSuggestion.strategy === 'client_wins',
            emergencyOverride: true
          }
        })
      };

      await onResolveConflict(conflict.id, strategy);
      await onSuccess();
    } catch (error) {
      console.error('Auto-resolve failed:', error);
      await onError();
    } finally {
      setResolvingConflicts(prev => {
        const next = new Set(prev);
        next.delete(conflict.id);
        return next;
      });
    }
  }, [onSelect, onResolveConflict, onSuccess, onError]);

  // Handle manual resolution
  const handleManualResolve = useCallback(async (conflict: EnhancedSyncConflict, strategy: ConflictResolutionStrategy['strategy']) => {
    try {
      await onSelect();
      setResolvingConflicts(prev => new Set([...prev, conflict.id]));

      const resolution: ConflictResolutionStrategy = {
        strategy,
        ...(conflict.domainPriority === 'crisis' && {
          crisisPriority: {
            prioritizeLocal: strategy === 'client_wins',
            emergencyOverride: true
          }
        })
      };

      await onResolveConflict(conflict.id, resolution);
      await onSuccess();
    } catch (error) {
      console.error('Manual resolve failed:', error);
      await onError();
    } finally {
      setResolvingConflicts(prev => {
        const next = new Set(prev);
        next.delete(conflict.id);
        return next;
      });
    }
  }, [onSelect, onResolveConflict, onSuccess, onError]);

  // Handle resolve all auto-resolvable
  const handleResolveAllAuto = useCallback(async () => {
    const autoResolvable = conflicts.filter(c => c.autoResolvable && c.smartSuggestion);

    if (autoResolvable.length === 0) return;

    Alert.alert(
      'Auto-Resolve Conflicts',
      `Automatically resolve ${autoResolvable.length} conflicts using smart suggestions?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resolve All',
          onPress: async () => {
            try {
              await onPress();

              const resolutions = autoResolvable.map(conflict => ({
                conflictId: conflict.id,
                resolution: {
                  strategy: conflict.smartSuggestion!.strategy,
                  ...(conflict.domainPriority === 'crisis' && {
                    crisisPriority: {
                      prioritizeLocal: conflict.smartSuggestion!.strategy === 'client_wins',
                      emergencyOverride: true
                    }
                  })
                } as ConflictResolutionStrategy
              }));

              await onResolveAll(resolutions);
              await onSuccess();
            } catch (error) {
              console.error('Bulk auto-resolve failed:', error);
              await onError();
            }
          }
        }
      ]
    );
  }, [conflicts, onPress, onResolveAll, onSuccess, onError]);

  // Render conflict priority section
  const renderPrioritySection = useCallback((
    title: string,
    conflictList: EnhancedSyncConflict[],
    priority: EnhancedSyncConflict['domainPriority']
  ) => {
    if (conflictList.length === 0) return null;

    const priorityDisplay = getPriorityDisplay(priority);

    return (
      <View style={styles.prioritySection}>
        <View style={styles.priorityHeader}>
          <Text style={[styles.priorityIcon, { color: priorityDisplay.color }]}>
            {priorityDisplay.icon}
          </Text>
          <View style={styles.priorityInfo}>
            <Text style={[styles.priorityTitle, { color: colorSystem.accessibility.text.primary }]}>
              {title} ({conflictList.length})
            </Text>
            <Text style={[styles.priorityDescription, { color: colorSystem.accessibility.text.secondary }]}>
              {priorityDisplay.description}
            </Text>
          </View>
        </View>

        {conflictList.map(conflict => renderConflictCard(conflict, priority))}
      </View>
    );
  }, [getPriorityDisplay, colorSystem]);

  // Render conflict card
  const renderConflictCard = useCallback((conflict: EnhancedSyncConflict, priority: EnhancedSyncConflict['domainPriority']) => {
    const typeDisplay = getConflictTypeDisplay(conflict.conflictType);
    const priorityDisplay = getPriorityDisplay(priority);
    const isResolving = resolvingConflicts.has(conflict.id);

    return (
      <View
        key={conflict.id}
        style={[
          styles.conflictCard,
          {
            backgroundColor: colorSystem.base.white,
            borderLeftColor: priorityDisplay.color,
            opacity: isResolving ? 0.7 : 1
          }
        ]}
      >
        <View style={styles.conflictHeader}>
          <View style={styles.conflictType}>
            <Text style={styles.conflictTypeIcon}>{typeDisplay.icon}</Text>
            <View style={styles.conflictTypeInfo}>
              <Text style={[styles.conflictTypeLabel, { color: colorSystem.accessibility.text.primary }]}>
                {typeDisplay.label}
              </Text>
              <Text style={[styles.conflictTypeDescription, { color: colorSystem.accessibility.text.secondary }]}>
                {typeDisplay.description}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.compareButton}
            onPress={() => {
              setSelectedConflict(conflict);
              setShowComparison(true);
            }}
            accessibilityLabel="Compare data versions"
            accessibilityHint="Shows side-by-side comparison of conflicting data"
          >
            <Text style={[styles.compareButtonText, { color: colorSystem.status.info }]}>
              Compare
            </Text>
          </TouchableOpacity>
        </View>

        {conflict.previewData && (
          <View style={styles.previewSection}>
            <Text style={[styles.previewLabel, { color: colorSystem.accessibility.text.secondary }]}>
              Preview:
            </Text>
            <Text style={[styles.previewText, { color: colorSystem.accessibility.text.primary }]} numberOfLines={2}>
              Local: {conflict.previewData.localPreview} | Remote: {conflict.previewData.remotePreview}
            </Text>
          </View>
        )}

        {conflict.smartSuggestion && (
          <View style={[styles.suggestionSection, { backgroundColor: colorSystem.status.infoBackground }]}>
            <Text style={[styles.suggestionLabel, { color: colorSystem.status.info }]}>
              Smart Suggestion ({Math.round(conflict.smartSuggestion.confidence * 100)}% confidence)
            </Text>
            <Text style={[styles.suggestionReasoning, { color: colorSystem.accessibility.text.secondary }]}>
              {conflict.smartSuggestion.reasoning}
            </Text>
          </View>
        )}

        <View style={styles.conflictActions}>
          {conflict.autoResolvable && conflict.smartSuggestion && (
            <Button
              variant="primary"
              onPress={() => handleAutoResolve(conflict)}
              loading={isResolving}
              style={styles.actionButton}
              accessibilityLabel="Accept smart suggestion"
              accessibilityHint={`Automatically resolves using ${conflict.smartSuggestion.strategy} strategy`}
            >
              Accept Suggestion
            </Button>
          )}

          <View style={styles.manualActions}>
            <Button
              variant="outline"
              onPress={() => handleManualResolve(conflict, 'client_wins')}
              loading={isResolving}
              style={styles.manualButton}
              accessibilityLabel="Use local version"
              accessibilityHint="Resolves conflict by keeping the local device data"
            >
              Use Local
            </Button>

            <Button
              variant="outline"
              onPress={() => handleManualResolve(conflict, 'server_wins')}
              loading={isResolving}
              style={styles.manualButton}
              accessibilityLabel="Use remote version"
              accessibilityHint="Resolves conflict by using the remote device data"
            >
              Use Remote
            </Button>

            {priority !== 'crisis' && (
              <Button
                variant="outline"
                onPress={() => handleManualResolve(conflict, 'merge')}
                loading={isResolving}
                style={styles.manualButton}
                accessibilityLabel="Merge data"
                accessibilityHint="Attempts to merge both versions of the data"
              >
                Merge
              </Button>
            )}
          </View>
        </View>
      </View>
    );
  }, [getConflictTypeDisplay, getPriorityDisplay, colorSystem, resolvingConflicts, handleAutoResolve, handleManualResolve]);

  // Render comparison modal
  const renderComparisonModal = () => {
    if (!selectedConflict || !showComparison) return null;

    return (
      <Modal
        visible={showComparison}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowComparison(false)}
      >
        <SafeAreaView style={styles.comparisonModal}>
          <View style={styles.comparisonHeader}>
            <TouchableOpacity onPress={() => setShowComparison(false)}>
              <Text style={[styles.comparisonClose, { color: colorSystem.status.info }]}>
                Close
              </Text>
            </TouchableOpacity>
            <Text style={[styles.comparisonTitle, { color: colorSystem.accessibility.text.primary }]}>
              Data Comparison
            </Text>
            <View style={styles.comparisonPlaceholder} />
          </View>

          <ScrollView style={styles.comparisonContent}>
            <View style={styles.comparisonSection}>
              <Text style={[styles.comparisonSectionTitle, { color: colorSystem.accessibility.text.primary }]}>
                Local Version (This Device)
              </Text>
              <View style={[styles.comparisonData, { backgroundColor: colorSystem.gray[100] }]}>
                <Text style={[styles.comparisonDataText, { color: colorSystem.accessibility.text.primary }]}>
                  {JSON.stringify(selectedConflict.localData, null, 2)}
                </Text>
              </View>
            </View>

            <View style={styles.comparisonSection}>
              <Text style={[styles.comparisonSectionTitle, { color: colorSystem.accessibility.text.primary }]}>
                Remote Version (Other Device)
              </Text>
              <View style={[styles.comparisonData, { backgroundColor: colorSystem.gray[100] }]}>
                <Text style={[styles.comparisonDataText, { color: colorSystem.accessibility.text.primary }]}>
                  {JSON.stringify(selectedConflict.remoteData, null, 2)}
                </Text>
              </View>
            </View>

            {selectedConflict.previewData?.mergedPreview && (
              <View style={styles.comparisonSection}>
                <Text style={[styles.comparisonSectionTitle, { color: colorSystem.accessibility.text.primary }]}>
                  Suggested Merge
                </Text>
                <View style={[styles.comparisonData, { backgroundColor: colorSystem.status.successBackground }]}>
                  <Text style={[styles.comparisonDataText, { color: colorSystem.accessibility.text.primary }]}>
                    {selectedConflict.previewData.mergedPreview}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  // Main content
  const content = (
    <View style={[styles.container, { backgroundColor: colorSystem.gray[50] }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colorSystem.accessibility.text.primary }]}>
          Sync Conflicts ({conflicts.length})
        </Text>
        <Text style={[styles.subtitle, { color: colorSystem.accessibility.text.secondary }]}>
          Resolve data conflicts between your devices
        </Text>

        {autoResolvableCount > 0 && (
          <TouchableOpacity
            style={[styles.autoResolveButton, { backgroundColor: colorSystem.status.successBackground }]}
            onPress={handleResolveAllAuto}
            accessibilityRole="button"
            accessibilityLabel={`Auto-resolve ${autoResolvableCount} conflicts`}
            accessibilityHint="Automatically resolves conflicts with high-confidence suggestions"
          >
            <Text style={[styles.autoResolveText, { color: colorSystem.status.success }]}>
              🤖 Auto-resolve {autoResolvableCount} conflicts
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        {renderPrioritySection('Crisis Priority', categorizedConflicts.crisis, 'crisis')}
        {renderPrioritySection('Therapeutic Data', categorizedConflicts.therapeutic, 'therapeutic')}
        {renderPrioritySection('General Data', categorizedConflicts.general, 'general')}

        {conflicts.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateText, { color: colorSystem.accessibility.text.secondary }]}>
              No sync conflicts to resolve
            </Text>
          </View>
        )}
      </ScrollView>

      {renderComparisonModal()}
    </View>
  );

  // Render as modal or screen
  if (showAsModal) {
    return (
      <Modal
        visible={true}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.fullScreen}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.modalCloseButton, { color: colorSystem.status.info }]}>
                Done
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colorSystem.accessibility.text.primary }]}>
              Resolve Conflicts
            </Text>
            <View style={styles.modalPlaceholder} />
          </View>
          {content}
        </SafeAreaView>
      </Modal>
    );
  }

  return <SafeAreaView style={styles.fullScreen}>{content}</SafeAreaView>;
}, (prevProps, nextProps) => {
  // Custom comparison for React.memo optimization
  return (
    prevProps.conflicts.length === nextProps.conflicts.length &&
    prevProps.showAsModal === nextProps.showAsModal &&
    prevProps.onResolveConflict === nextProps.onResolveConflict &&
    prevProps.onResolveAll === nextProps.onResolveAll &&
    prevProps.onClose === nextProps.onClose &&
    // Deep compare conflicts if array length is the same
    prevProps.conflicts.every((conflict, index) =>
      conflict.id === nextProps.conflicts[index]?.id &&
      conflict.domainPriority === nextProps.conflicts[index]?.domainPriority
    )
  );
});

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.headline2.weight,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.bodyRegular.size,
    lineHeight: typography.bodyRegular.lineHeight * typography.bodyRegular.size,
    marginBottom: spacing.md,
  },
  autoResolveButton: {
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
  },
  autoResolveText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  prioritySection: {
    marginBottom: spacing.xl,
  },
  priorityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  priorityIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  priorityInfo: {
    flex: 1,
  },
  priorityTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    marginBottom: spacing.xs,
  },
  priorityDescription: {
    fontSize: typography.caption.size,
  },
  conflictCard: {
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  conflictHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  conflictType: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  conflictTypeIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  conflictTypeInfo: {
    flex: 1,
  },
  conflictTypeLabel: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    marginBottom: 2,
  },
  conflictTypeDescription: {
    fontSize: typography.caption.size,
  },
  compareButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  compareButtonText: {
    fontSize: typography.caption.size,
    fontWeight: '500',
  },
  previewSection: {
    marginBottom: spacing.sm,
  },
  previewLabel: {
    fontSize: typography.caption.size,
    marginBottom: spacing.xs,
  },
  previewText: {
    fontSize: typography.caption.size,
    fontStyle: 'italic',
  },
  suggestionSection: {
    padding: spacing.sm,
    borderRadius: borderRadius.small,
    marginBottom: spacing.sm,
  },
  suggestionLabel: {
    fontSize: typography.caption.size,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  suggestionReasoning: {
    fontSize: typography.caption.size,
  },
  conflictActions: {
    gap: spacing.sm,
  },
  actionButton: {
    marginBottom: 0,
  },
  manualActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  manualButton: {
    flex: 1,
    marginBottom: 0,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    fontSize: typography.bodyRegular.size,
    fontStyle: 'italic',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalCloseButton: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
  },
  modalPlaceholder: {
    width: 60,
  },
  comparisonModal: {
    flex: 1,
  },
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  comparisonClose: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '500',
  },
  comparisonTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
  },
  comparisonPlaceholder: {
    width: 60,
  },
  comparisonContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  comparisonSection: {
    marginVertical: spacing.md,
  },
  comparisonSectionTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  comparisonData: {
    padding: spacing.md,
    borderRadius: borderRadius.medium,
  },
  comparisonDataText: {
    fontSize: typography.caption.size,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

export default SyncConflictResolver;