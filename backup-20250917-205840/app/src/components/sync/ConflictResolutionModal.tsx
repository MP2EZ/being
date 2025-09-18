/**
 * Conflict Resolution Modal - User interface for resolving data sync conflicts
 * Clinical-grade conflict resolution with therapeutic safety considerations
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Pressable
} from 'react-native';
import { Card, Button } from '../core';
import { syncOrchestrationService } from '../../services/SyncOrchestrationService';
import {
  SyncConflict,
  ConflictType,
  ConflictResolutionStrategy,
  SyncEntityType,
  ConflictResolution
} from '../../types/sync';
import { colors } from '../../constants/colors';
import { CheckIn, Assessment, UserProfile } from '../../types';

interface ConflictResolutionModalProps {
  visible: boolean;
  onClose: () => void;
  onResolutionComplete?: (resolution: ConflictResolution) => void;
}

/**
 * Modal for resolving data synchronization conflicts
 */
export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  visible,
  onClose,
  onResolutionComplete
}) => {
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [currentConflict, setCurrentConflict] = useState<SyncConflict | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<ConflictResolutionStrategy | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [loading, setLoading] = useState(true);

  /**
   * Load pending conflicts
   */
  const loadConflicts = useCallback(async () => {
    try {
      setLoading(true);
      const pendingConflicts = syncOrchestrationService.getPendingConflicts();
      setConflicts(pendingConflicts);
      
      if (pendingConflicts.length > 0 && !currentConflict) {
        setCurrentConflict(pendingConflicts[0]);
      }
    } catch (error) {
      console.error('Failed to load conflicts:', error);
      Alert.alert('Error', 'Failed to load sync conflicts');
    } finally {
      setLoading(false);
    }
  }, [currentConflict]);

  useEffect(() => {
    if (visible) {
      loadConflicts();
    }
  }, [visible, loadConflicts]);

  /**
   * Resolve current conflict
   */
  const handleResolveConflict = async () => {
    if (!currentConflict || !selectedStrategy) return;

    try {
      setIsResolving(true);
      
      const resolution = await syncOrchestrationService.resolveConflict(
        currentConflict.id,
        selectedStrategy
      );
      
      // Remove resolved conflict from list
      const remainingConflicts = conflicts.filter(c => c.id !== currentConflict.id);
      setConflicts(remainingConflicts);
      
      // Move to next conflict or close
      if (remainingConflicts.length > 0) {
        setCurrentConflict(remainingConflicts[0]);
        setSelectedStrategy(null);
      } else {
        setCurrentConflict(null);
        onClose();
      }
      
      onResolutionComplete?.(resolution);
      
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      Alert.alert('Error', 'Failed to resolve conflict. Please try again.');
    } finally {
      setIsResolving(false);
    }
  };

  /**
   * Skip current conflict for later resolution
   */
  const handleSkipConflict = () => {
    const remainingConflicts = conflicts.filter(c => c.id !== currentConflict?.id);
    
    if (remainingConflicts.length > 0) {
      setCurrentConflict(remainingConflicts[0]);
      setSelectedStrategy(null);
    } else {
      onClose();
    }
  };

  /**
   * Get human-readable conflict type description
   */
  const getConflictTypeDescription = (type: ConflictType): string => {
    switch (type) {
      case ConflictType.VERSION_MISMATCH:
        return 'Data was modified on different devices simultaneously';
      case ConflictType.CONCURRENT_EDIT:
        return 'The same data was edited at the same time';
      case ConflictType.CLINICAL_DATA_DIVERGENCE:
        return 'Clinical assessment data differs between devices';
      case ConflictType.CHECKSUM_MISMATCH:
        return 'Data integrity verification failed';
      case ConflictType.TIMESTAMP_ANOMALY:
        return 'Modification timestamps are inconsistent';
      case ConflictType.SCHEMA_INCOMPATIBILITY:
        return 'Data structure is incompatible between versions';
      default:
        return 'Unknown conflict type';
    }
  };

  /**
   * Get entity type display name
   */
  const getEntityTypeDisplayName = (type: SyncEntityType): string => {
    switch (type) {
      case SyncEntityType.CHECK_IN:
        return 'Check-in Data';
      case SyncEntityType.ASSESSMENT:
        return 'Assessment Results';
      case SyncEntityType.USER_PROFILE:
        return 'User Profile';
      case SyncEntityType.CRISIS_PLAN:
        return 'Crisis Plan';
      case SyncEntityType.WIDGET_DATA:
        return 'Widget Settings';
      case SyncEntityType.SESSION_DATA:
        return 'Session Progress';
      default:
        return 'Unknown Data';
    }
  };

  /**
   * Get resolution strategy description
   */
  const getStrategyDescription = (strategy: ConflictResolutionStrategy): string => {
    switch (strategy) {
      case ConflictResolutionStrategy.CLIENT_WINS:
        return 'Keep your local changes (recommended for personal settings)';
      case ConflictResolutionStrategy.SERVER_WINS:
        return 'Use the version from the server (recommended for clinical data)';
      case ConflictResolutionStrategy.MERGE_TIMESTAMP:
        return 'Keep the most recently modified version';
      case ConflictResolutionStrategy.MERGE_FIELDS:
        return 'Combine both versions intelligently';
      default:
        return 'Unknown strategy';
    }
  };

  /**
   * Get recommended strategies based on conflict and entity type
   */
  const getRecommendedStrategies = (conflict: SyncConflict): ConflictResolutionStrategy[] => {
    const isClinicalData = [
      SyncEntityType.ASSESSMENT,
      SyncEntityType.CRISIS_PLAN
    ].includes(conflict.entityType);
    
    const isPersonalData = [
      SyncEntityType.USER_PROFILE,
      SyncEntityType.WIDGET_DATA
    ].includes(conflict.entityType);
    
    if (isClinicalData) {
      return [
        ConflictResolutionStrategy.SERVER_WINS,
        ConflictResolutionStrategy.MERGE_TIMESTAMP,
        ConflictResolutionStrategy.CLIENT_WINS
      ];
    }
    
    if (isPersonalData) {
      return [
        ConflictResolutionStrategy.CLIENT_WINS,
        ConflictResolutionStrategy.MERGE_TIMESTAMP,
        ConflictResolutionStrategy.MERGE_FIELDS
      ];
    }
    
    return [
      ConflictResolutionStrategy.MERGE_TIMESTAMP,
      ConflictResolutionStrategy.CLIENT_WINS,
      ConflictResolutionStrategy.SERVER_WINS
    ];
  };

  /**
   * Render data preview
   */
  const renderDataPreview = (data: any, label: string) => {
    if (!data) return null;
    
    let preview = '';
    
    if (data.type === 'phq9' || data.type === 'gad7') {
      // Assessment data
      preview = `${data.type.toUpperCase()} Assessment - Score: ${data.score || 'Not calculated'}`;
    } else if (data.type && ['morning', 'midday', 'evening'].includes(data.type)) {
      // Check-in data
      preview = `${data.type} check-in from ${new Date(data.timestamp || data.createdAt).toLocaleDateString()}`;
    } else if (data.name || data.email) {
      // User profile
      preview = `Profile: ${data.name || 'Unknown'} (${data.email || 'No email'})`;
    } else {
      // Generic data
      preview = JSON.stringify(data, null, 2).substring(0, 200) + '...';
    }
    
    return (
      <View style={styles.dataPreview}>
        <Text style={styles.dataLabel}>{label}</Text>
        <Text style={styles.dataContent}>{preview}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.morning.primary} />
            <Text style={styles.loadingText}>Loading conflicts...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (!currentConflict) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={styles.noConflictsCard}>
            <Text style={styles.noConflictsTitle}>No Conflicts Found</Text>
            <Text style={styles.noConflictsMessage}>
              All your data is synchronized successfully.
            </Text>
            <Button
              title="Close"
              onPress={onClose}
              variant="primary"
              style={styles.closeButton}
            />
          </Card>
        </View>
      </Modal>
    );
  }

  const recommendedStrategies = getRecommendedStrategies(currentConflict);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <ScrollView style={styles.scrollContainer}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Resolve Data Conflict</Text>
              <Text style={styles.subtitle}>
                {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} need{conflicts.length === 1 ? 's' : ''} resolution
              </Text>
            </View>

            {/* Conflict Details */}
            <Card style={styles.conflictCard}>
              <Text style={styles.conflictTitle}>
                {getEntityTypeDisplayName(currentConflict.entityType)}
              </Text>
              <Text style={styles.conflictDescription}>
                {getConflictTypeDescription(currentConflict.conflictType)}
              </Text>
              
              {currentConflict.clinicalImplications && currentConflict.clinicalImplications.length > 0 && (
                <View style={styles.clinicalWarning}>
                  <Text style={styles.clinicalWarningText}>
                    ⚠️ Clinical Impact: {currentConflict.clinicalImplications.join(', ')}
                  </Text>
                </View>
              )}
            </Card>

            {/* Data Comparison */}
            <Card style={styles.comparisonCard}>
              <Text style={styles.comparisonTitle}>Data Comparison</Text>
              
              {renderDataPreview(currentConflict.localData, 'Your Device')}
              {renderDataPreview(currentConflict.remoteData, 'Server/Other Device')}
              
              <View style={styles.metadataComparison}>
                <Text style={styles.metadataTitle}>Modification Details</Text>
                <View style={styles.metadataRow}>
                  <Text style={styles.metadataLabel}>Your Device:</Text>
                  <Text style={styles.metadataValue}>
                    {new Date(currentConflict.localMetadata.lastModified).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.metadataRow}>
                  <Text style={styles.metadataLabel}>Server:</Text>
                  <Text style={styles.metadataValue}>
                    {new Date(currentConflict.remoteMetadata.lastModified).toLocaleString()}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Resolution Strategies */}
            <Card style={styles.strategiesCard}>
              <Text style={styles.strategiesTitle}>Choose Resolution Strategy</Text>
              
              {recommendedStrategies.map((strategy, index) => (
                <Pressable
                  key={strategy}
                  style={[
                    styles.strategyOption,
                    selectedStrategy === strategy && styles.strategyOptionSelected,
                    index === 0 && styles.recommendedStrategy
                  ]}
                  onPress={() => setSelectedStrategy(strategy)}
                >
                  <View style={styles.strategyHeader}>
                    <Text style={[
                      styles.strategyName,
                      selectedStrategy === strategy && styles.strategyNameSelected
                    ]}>
                      {strategy.replace('_', ' ').toUpperCase()}
                      {index === 0 && (
                        <Text style={styles.recommendedLabel}> (Recommended)</Text>
                      )}
                    </Text>
                  </View>
                  <Text style={[
                    styles.strategyDescription,
                    selectedStrategy === strategy && styles.strategyDescriptionSelected
                  ]}>
                    {getStrategyDescription(strategy)}
                  </Text>
                </Pressable>
              ))}
            </Card>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button
              title="Skip for Now"
              onPress={handleSkipConflict}
              variant="secondary"
              style={styles.skipButton}
            />
            <Button
              title={isResolving ? "Resolving..." : "Resolve"}
              onPress={handleResolveConflict}
              variant="primary"
              disabled={!selectedStrategy || isResolving}
              style={styles.resolveButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 20,
    maxHeight: '90%',
    width: '90%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  conflictCard: {
    margin: 16,
    padding: 16,
  },
  conflictTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  conflictDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  clinicalWarning: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  clinicalWarningText: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '500',
  },
  comparisonCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  dataPreview: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  dataLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 4,
  },
  dataContent: {
    fontSize: 14,
    color: '#6C757D',
    lineHeight: 18,
  },
  metadataComparison: {
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    paddingTop: 12,
    marginTop: 12,
  },
  metadataTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 8,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metadataLabel: {
    fontSize: 14,
    color: '#6C757D',
  },
  metadataValue: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  strategiesCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
  },
  strategiesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  strategyOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 8,
  },
  strategyOptionSelected: {
    borderColor: colors.morning.primary,
    backgroundColor: `${colors.morning.primary}0F`,
  },
  recommendedStrategy: {
    borderColor: '#28A745',
    backgroundColor: '#F8FFF9',
  },
  strategyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  strategyName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  strategyNameSelected: {
    color: colors.morning.primary,
  },
  recommendedLabel: {
    fontSize: 12,
    color: '#28A745',
    fontWeight: 'normal',
  },
  strategyDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  strategyDescriptionSelected: {
    color: '#555',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  skipButton: {
    flex: 1,
    marginRight: 8,
  },
  resolveButton: {
    flex: 2,
    marginLeft: 8,
  },
  noConflictsCard: {
    margin: 20,
    padding: 24,
    alignItems: 'center',
  },
  noConflictsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  noConflictsMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  closeButton: {
    minWidth: 120,
  },
});