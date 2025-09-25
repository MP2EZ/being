/**
 * Sync Status Indicator - Real-time sync status display for FullMind
 * Shows sync progress, conflicts, and network quality with clinical awareness
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { syncOrchestrationService } from '../../services/SyncOrchestrationService';
import { networkAwareService } from '../../services/NetworkAwareService';
import {
  SyncState,
  SyncOperation,
  SyncConflict,
  SyncStatus,
  AppSyncState,
  SyncEntityType,
  StoreSyncStatus,
  SyncProgress,
  NetworkQuality
} from '../../types/cross-device-sync-canonical';
import { colors } from '../../constants/colors';

interface SyncStatusIndicatorProps {
  compact?: boolean;
  onPress?: () => void;
  onConflictPress?: () => void;
  showDetails?: boolean;
  entityType?: SyncEntityType;
}

/**
 * Real-time sync status indicator with progress and conflict information
 * Optimized for <50ms response time and 60fps animations
 */
export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = React.memo(({
  compact = false,
  onPress,
  onConflictPress,
  showDetails = false,
  entityType
}) => {
  const [syncState, setSyncState] = useState<AppSyncState | null>(null);
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>(NetworkQuality.OFFLINE);
  const [storeStatus, setStoreStatus] = useState<StoreSyncStatus | null>(null);

  // Pre-allocate animated values with refs for optimal performance
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const progressAnimation = useRef(new Animated.Value(0)).current;

  // Debounce state updates to prevent excessive re-renders
  const updateTimeoutRef = useRef<NodeJS.Timeout>();

  /**
   * Load sync state and status with debouncing for performance
   */
  const loadSyncState = useCallback(async () => {
    // Clear previous timeout to debounce rapid updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(async () => {
      try {
        const state = syncOrchestrationService.getSyncState();
        setSyncState(state);

        if (entityType) {
          const storeStatuses = state.storeStatuses;
          const entityStatus = storeStatuses.find(s => s.storeType === entityType);
          setStoreStatus(entityStatus || null);
        }

        const networkState = await networkAwareService.getNetworkState();
        setNetworkQuality(networkState.quality);

      } catch (error) {
        console.warn('Failed to load sync state:', error);
      }
    }, 16); // 16ms debounce for 60fps compatibility
  }, [entityType]);

  /**
   * Set up event listeners and initial load
   */
  useEffect(() => {
    loadSyncState();
    
    // Listen for sync status changes
    const handleSyncStatusChanged = () => {
      loadSyncState();
    };
    
    const handleStoreStatusChanged = (event: any) => {
      if (!entityType || event.entityType === entityType) {
        loadSyncState();
      }
    };
    
    const handleNetworkChanged = (event: any) => {
      setNetworkQuality(event.networkState.quality);
    };
    
    syncOrchestrationService.addEventListener('sync_status_changed', handleSyncStatusChanged);
    syncOrchestrationService.addEventListener('store_sync_status_changed', handleStoreStatusChanged);
    syncOrchestrationService.addEventListener('sync_progress_updated', handleStoreStatusChanged);
    networkAwareService.addEventListener('network_state_changed', handleNetworkChanged);
    
    return () => {
      syncOrchestrationService.removeEventListener('sync_status_changed', handleSyncStatusChanged);
      syncOrchestrationService.removeEventListener('store_sync_status_changed', handleStoreStatusChanged);
      syncOrchestrationService.removeEventListener('sync_progress_updated', handleStoreStatusChanged);
      networkAwareService.removeEventListener('network_state_changed', handleNetworkChanged);
    };
  }, [loadSyncState, entityType]);

  /**
   * Animate pulse for sync activity
   */
  useEffect(() => {
    const currentStatus = storeStatus?.status || syncState?.globalStatus;
    
    if (currentStatus === SyncStatus.SYNCING) {
      const pulseAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 0.7,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnim.start();
      
      return () => pulseAnim.stop();
    } else {
      pulseAnimation.setValue(1);
    }
  }, [storeStatus?.status, syncState?.globalStatus, pulseAnimation]);

  /**
   * Animate progress bar
   */
  useEffect(() => {
    const progress = storeStatus?.syncProgress;
    if (progress) {
      Animated.timing(progressAnimation, {
        toValue: progress.percentage / 100,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnimation.setValue(0);
    }
  }, [storeStatus?.syncProgress, progressAnimation]);

  /**
   * Memoized style calculations for performance
   */
  const statusColor = useMemo((): string => {
    const currentStatus = storeStatus?.status || syncState?.globalStatus;

    switch (currentStatus) {
      case SyncStatus.SYNCING:
        return colors.morning.primary;
      case SyncStatus.SUCCESS:
        return '#28A745';
      case SyncStatus.ERROR:
        return '#DC3545';
      case SyncStatus.CONFLICT:
        return '#FFC107';
      case SyncStatus.PAUSED:
        return '#6C757D';
      default:
        return '#6C757D';
    }
  }, [storeStatus?.status, syncState?.globalStatus]);

  const statusIcon = useMemo((): string => {
    const currentStatus = storeStatus?.status || syncState?.globalStatus;

    switch (currentStatus) {
      case SyncStatus.SYNCING:
        return '⟳';
      case SyncStatus.SUCCESS:
        return '✓';
      case SyncStatus.ERROR:
        return '✗';
      case SyncStatus.CONFLICT:
        return '⚠';
      case SyncStatus.PAUSED:
        return '⏸';
      default:
        return '○';
    }
  }, [storeStatus?.status, syncState?.globalStatus]);

  const networkIndicator = useMemo((): { icon: string; color: string } => {
    switch (networkQuality) {
      case NetworkQuality.EXCELLENT:
        return { icon: '📶', color: '#28A745' };
      case NetworkQuality.GOOD:
        return { icon: '📶', color: '#FFC107' };
      case NetworkQuality.POOR:
        return { icon: '📶', color: '#DC3545' };
      case NetworkQuality.OFFLINE:
        return { icon: '📵', color: '#6C757D' };
      default:
        return { icon: '❓', color: '#6C757D' };
    }
  }, [networkQuality]);

  /**
   * Memoized status text for performance
   */
  const statusText = useMemo((): string => {
    const currentStatus = storeStatus?.status || syncState?.globalStatus;
    const progress = storeStatus?.syncProgress;
    const conflicts = storeStatus?.conflicts || syncState?.conflicts || [];
    const errors = storeStatus?.errors || [];

    if (conflicts.length > 0) {
      return `${conflicts.length} conflict${conflicts.length !== 1 ? 's' : ''} need resolution`;
    }

    if (errors.length > 0) {
      return `${errors.length} sync error${errors.length !== 1 ? 's' : ''}`;
    }

    if (progress && currentStatus === SyncStatus.SYNCING) {
      return `Syncing ${progress.percentage}%`;
    }

    switch (currentStatus) {
      case SyncStatus.SYNCING:
        return 'Syncing...';
      case SyncStatus.SUCCESS:
        return 'Up to date';
      case SyncStatus.ERROR:
        return 'Sync error';
      case SyncStatus.CONFLICT:
        return 'Conflicts detected';
      case SyncStatus.PAUSED:
        return 'Sync paused';
      case SyncStatus.IDLE:
        return networkQuality === NetworkQuality.OFFLINE ? 'Offline' : 'Ready to sync';
      default:
        return 'Unknown status';
    }
  }, [storeStatus?.status, storeStatus?.syncProgress, storeStatus?.conflicts, storeStatus?.errors,
      syncState?.globalStatus, syncState?.conflicts, networkQuality]);

  /**
   * Memoized last sync time for performance
   */
  const lastSyncText = useMemo((): string | null => {
    const lastSync = storeStatus?.lastSync || syncState?.lastGlobalSync;

    if (!lastSync) return null;

    const lastSyncDate = new Date(lastSync);
    const now = new Date();
    const diffMs = now.getTime() - lastSyncDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return lastSyncDate.toLocaleDateString();
  }, [storeStatus?.lastSync, syncState?.lastGlobalSync]);

  /**
   * Handle indicator press
   */
  const handlePress = () => {
    const conflicts = storeStatus?.conflicts || syncState?.conflicts || [];
    
    if (conflicts.length > 0 && onConflictPress) {
      onConflictPress();
    } else if (onPress) {
      onPress();
    }
  };

  // Memoized conflict calculations for performance
  const conflictData = useMemo(() => {
    const conflicts = storeStatus?.conflicts || syncState?.conflicts || [];
    const isClinicalConflict = conflicts.some(c =>
      c.clinicalImplications && c.clinicalImplications.length > 0
    );
    return { conflicts, isClinicalConflict };
  }, [storeStatus?.conflicts, syncState?.conflicts]);

  const currentStatus = storeStatus?.status || syncState?.globalStatus;
  const progress = storeStatus?.syncProgress;

  // Early return with null check
  if (!syncState && !storeStatus) {
    return null;
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  if (compact) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.compactContainer,
          { borderColor: statusColor },
          pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] }
        ]}
        onPress={handlePress}
        disabled={!onPress && !onConflictPress}
      >
        <Animated.View style={[
          styles.compactIndicator,
          { backgroundColor: statusColor, transform: [{ scale: pulseAnimation }] }
        ]}>
          {currentStatus === SyncStatus.SYNCING ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.compactIcon}>{statusIcon}</Text>
          )}
        </Animated.View>
        
        {conflictData.conflicts.length > 0 && (
          <View style={[
            styles.conflictBadge,
            conflictData.isClinicalConflict && styles.clinicalConflictBadge
          ]}>
            <Text style={styles.conflictBadgeText}>{conflictData.conflicts.length}</Text>
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && { opacity: 0.95, transform: [{ scale: 0.98 }] }
      ]}
      onPress={handlePress}
      disabled={!onPress && !onConflictPress}
    >
      <View style={styles.header}>
        <View style={styles.statusSection}>
          <Animated.View style={[
            styles.statusIndicator,
            { backgroundColor: statusColor, transform: [{ scale: pulseAnimation }] }
          ]}>
            {currentStatus === SyncStatus.SYNCING ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.statusIcon}>{statusIcon}</Text>
            )}
          </Animated.View>
          
          <View style={styles.statusInfo}>
            <Text style={styles.statusText}>{statusText}</Text>
            {lastSyncText && (
              <Text style={styles.lastSyncText}>Last sync: {lastSyncText}</Text>
            )}
          </View>
        </View>
        
        <View style={styles.networkSection}>
          <Text style={[styles.networkIcon, { color: networkIndicator.color }]}>
            {networkIndicator.icon}
          </Text>
          <Text style={styles.networkText}>
            {networkQuality.charAt(0).toUpperCase() + networkQuality.slice(1)}
          </Text>
        </View>
      </View>
      
      {/* Progress Bar */}
      {progress && currentStatus === SyncStatus.SYNCING && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View style={[
              styles.progressFill,
              {
                backgroundColor: statusColor,
                width: progressAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                })
              }
            ]} />
          </View>
          <Text style={styles.progressText}>
            {progress.completed}/{progress.total} items
          </Text>
        </View>
      )}
      
      {/* Conflicts Warning */}
      {conflictData.conflicts.length > 0 && (
        <View style={[
          styles.conflictWarning,
          conflictData.isClinicalConflict && styles.clinicalConflictWarning
        ]}>
          <Text style={styles.conflictWarningIcon}>⚠️</Text>
          <Text style={[
            styles.conflictWarningText,
            conflictData.isClinicalConflict && styles.clinicalConflictWarningText
          ]}>
            {conflictData.conflicts.length} conflict{conflictData.conflicts.length !== 1 ? 's' : ''} require{conflictData.conflicts.length === 1 ? 's' : ''} attention
            {conflictData.isClinicalConflict && ' (Clinical data affected)'}
          </Text>
        </View>
      )}
      
      {/* Detailed Information */}
      {showDetails && entityType && (
        <View style={styles.detailsSection}>
          <Text style={styles.detailsTitle}>
            {getEntityTypeDisplayName(entityType)}
          </Text>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Pending</Text>
              <Text style={styles.detailValue}>
                {storeStatus?.pendingOperations || 0}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Errors</Text>
              <Text style={styles.detailValue}>
                {storeStatus?.errors.length || 0}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Conflicts</Text>
              <Text style={styles.detailValue}>
                {conflictData.conflicts.length}
              </Text>
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for React.memo optimization
  return (
    prevProps.compact === nextProps.compact &&
    prevProps.showDetails === nextProps.showDetails &&
    prevProps.entityType === nextProps.entityType &&
    prevProps.onPress === nextProps.onPress &&
    prevProps.onConflictPress === nextProps.onConflictPress
  );
});

/**
 * Get entity type display name
 */
const getEntityTypeDisplayName = (type: SyncEntityType): string => {
  switch (type) {
    case SyncEntityType.CHECK_IN:
      return 'Check-ins';
    case SyncEntityType.ASSESSMENT:
      return 'Assessments';
    case SyncEntityType.USER_PROFILE:
      return 'Profile';
    case SyncEntityType.CRISIS_PLAN:
      return 'Crisis Plan';
    case SyncEntityType.WIDGET_DATA:
      return 'Widget';
    case SyncEntityType.SESSION_DATA:
      return 'Sessions';
    default:
      return 'Unknown';
  }
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  compactContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  compactIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIcon: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  compactIcon: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusInfo: {
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  lastSyncText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  networkSection: {
    alignItems: 'center',
  },
  networkIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  networkText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  conflictWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FFF3CD',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#FFC107',
  },
  clinicalConflictWarning: {
    backgroundColor: '#F8D7DA',
    borderLeftColor: '#DC3545',
  },
  conflictWarningIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  conflictWarningText: {
    fontSize: 12,
    color: '#856404',
    flex: 1,
  },
  clinicalConflictWarningText: {
    color: '#721C24',
    fontWeight: '500',
  },
  conflictBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFC107',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clinicalConflictBadge: {
    backgroundColor: '#DC3545',
  },
  conflictBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  detailsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  detailsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
});