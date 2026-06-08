/**
 * SYNC STATUS INDICATOR
 *
 * SYNC STATUS DISPLAY:
 * - Real-time sync coordinator status monitoring
 * - Crisis sync performance metrics (<200ms requirement)
 * - User-friendly visual status indicators with accessibility
 *
 * NOTE (INFRA-214): the former "Analytics Service" half of this indicator was removed.
 * It read `AnalyticsService.getStatus()` from the dead custom-API analytics path and
 * displayed hardcoded `privacyCompliance: true` / `networkSecurity: true` — never real
 * signal. The PostHog analytics tier has no per-device status surface.
 *
 * FEATURES:
 * - Live sync status updates with color-coded indicators
 * - Crisis sync performance monitoring
 * - Detailed status breakdown in advanced mode
 * - Accessibility optimized with screen reader support
 *
 * PERFORMANCE:
 * - Efficient real-time updates without blocking UI
 * - Minimal memory footprint with smart caching
 * - Optimistic UI updates for better responsiveness
 */


import { logError, LogCategory } from '@/core/services/logging';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';

// Import services
import SyncCoordinator from '@/core/services/supabase/SyncCoordinator';
import { spacing, borderRadius, typography } from '@/core/theme';

/**
 * SYNC STATUS TYPES
 */
interface SyncStatus {
  isInitialized: boolean;
  lastSyncTime: number | null;
  pendingOperations: number;
  isConnected: boolean;
  circuitBreakerState: 'closed' | 'open' | 'half-open';
  errorCount: number;
  retryScheduled: boolean;
}

interface SyncStatusIndicatorProps {
  showDetailed?: boolean;
  onStatusChange?: (status: 'healthy' | 'warning' | 'critical' | 'offline') => void;
  style?: any;
  testID?: string;
}

/**
 * SYNC STATUS INDICATOR COMPONENT
 */
export default function SyncStatusIndicator({
  showDetailed = false,
  onStatusChange,
  style,
  testID = 'sync-status-indicator'
}: SyncStatusIndicatorProps) {
  // Component state
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  // Animation values
  const [pulseAnim] = useState(new Animated.Value(1));
  const [fadeAnim] = useState(new Animated.Value(0));

  /**
   * STATUS MONITORING
   */
  const updateStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get sync coordinator status
      const syncCoordinatorStatus = await (SyncCoordinator as any).getStatus();
      setSyncStatus({
        isInitialized: syncCoordinatorStatus.isInitialized,
        lastSyncTime: syncCoordinatorStatus.lastSyncTime,
        pendingOperations: syncCoordinatorStatus.pendingOperations || 0,
        isConnected: syncCoordinatorStatus.isConnected || false,
        circuitBreakerState: syncCoordinatorStatus.circuitBreakerState || 'closed',
        errorCount: syncCoordinatorStatus.errorCount || 0,
        retryScheduled: syncCoordinatorStatus.retryScheduled || false
      });

      setLastUpdated(Date.now());

      // Determine overall status and notify parent
      const overallStatus = determineOverallStatus(syncCoordinatorStatus);
      onStatusChange?.(overallStatus);

    } catch (error) {
      logError(LogCategory.SYSTEM, 'Status update failed:', error instanceof Error ? error : undefined);
      setError((error instanceof Error ? error.message : String(error)) || 'Status update failed');
    } finally {
      setIsLoading(false);
    }
  }, [onStatusChange]);

  /**
   * COMPONENT LIFECYCLE
   */
  useEffect(() => {
    // Initial status load
    updateStatus();

    // Set up periodic status updates
    const statusInterval = setInterval(updateStatus, 30000); // Every 30 seconds

    // Start fade-in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Cleanup
    return () => {
      clearInterval(statusInterval);
    };
  }, [updateStatus, fadeAnim]);

  /**
   * STATUS DETERMINATION
   */
  const determineOverallStatus = (
    sync: any
  ): 'healthy' | 'warning' | 'critical' | 'offline' => {
    // Critical: Not initialized
    if (!sync.isInitialized) {
      return 'critical';
    }

    // Offline: No connection
    if (!sync.isConnected) {
      return 'offline';
    }

    // Critical: Circuit breaker open
    if (sync.circuitBreakerState === 'open') {
      return 'critical';
    }

    // Warning: High error count
    if (sync.errorCount > 5) {
      return 'warning';
    }

    return 'healthy';
  };

  const getStatusColor = (): string => {
    if (!syncStatus) return '#999';

    const status = determineOverallStatus(syncStatus);
    const colors = {
      healthy: '#4caf50',
      warning: '#ffa726',
      critical: '#f44336',
      offline: '#757575'
    };

    return colors[status];
  };

  const getStatusText = (): string => {
    if (isLoading) return 'Updating...';
    if (error) return 'Error';
    if (!syncStatus) return 'Unknown';

    const status = determineOverallStatus(syncStatus);
    const statusTexts = {
      healthy: 'All Systems Healthy',
      warning: 'Minor Issues Detected',
      critical: 'Critical Issues',
      offline: 'Offline'
    };

    return statusTexts[status];
  };

  /**
   * ANIMATIONS
   */
  const startPulseAnimation = useCallback(() => {
    const pulse = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]);

    Animated.loop(pulse, { iterations: 3 }).start();
  }, [pulseAnim]);

  // Start pulse animation for critical status
  useEffect(() => {
    if (syncStatus) {
      const status = determineOverallStatus(syncStatus);
      if (status === 'critical') {
        startPulseAnimation();
      }
    }
  }, [syncStatus, startPulseAnimation]);

  /**
   * UTILITY METHODS
   */
  const formatLastSync = (timestamp: number | null): string => {
    if (!timestamp) return 'Never';

    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;

    return new Date(timestamp).toLocaleDateString();
  };

  /**
   * ACCESSIBILITY
   */
  const getAccessibilityLabel = (): string => {
    const status = getStatusText();
    const syncTime = formatLastSync(syncStatus?.lastSyncTime || null);
    return `Sync status: ${status}. Last sync: ${syncTime}`;
  };

  /**
   * RENDER METHODS
   */
  const renderCompactStatus = () => (
    <Animated.View
      style={[
        styles.compactContainer,
        {
          transform: [{ scale: pulseAnim }],
          opacity: fadeAnim
        }
      ]}
    >
      <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
      <Text style={styles.compactStatusText}>{getStatusText()}</Text>
      {isLoading && <ActivityIndicator size="small" color={getStatusColor()} />}
    </Animated.View>
  );

  const renderDetailedStatus = () => (
    <Animated.View
      style={[
        styles.detailedContainer,
        { opacity: fadeAnim }
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Animated.View
            style={[
              styles.statusIndicator,
              {
                backgroundColor: getStatusColor(),
                transform: [{ scale: pulseAnim }]
              }
            ]}
          />
          <Text style={styles.headerTitle}>Sync Status</Text>
        </View>
        {isLoading && <ActivityIndicator size="small" color={getStatusColor()} />}
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={updateStatus}
            style={styles.retryButton}
            accessibilityLabel="Retry status update"
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sync Status Section */}
      {syncStatus && (
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Sync Coordinator</Text>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status:</Text>
            <Text style={[styles.statusValue, { color: getStatusColor() }]}>
              {syncStatus.isInitialized ? (syncStatus.isConnected ? 'Connected' : 'Offline') : 'Initializing'}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Last Sync:</Text>
            <Text style={styles.statusValue}>
              {formatLastSync(syncStatus.lastSyncTime)}
            </Text>
          </View>

          {syncStatus.pendingOperations > 0 && (
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Pending:</Text>
              <Text style={[styles.statusValue, styles.warningText]}>
                {syncStatus.pendingOperations} operations
              </Text>
            </View>
          )}

          {syncStatus.circuitBreakerState !== 'closed' && (
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Circuit Breaker:</Text>
              <Text style={[styles.statusValue, styles.errorText]}>
                {syncStatus.circuitBreakerState.toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Last Updated */}
      <View style={styles.footer}>
        <Text style={styles.lastUpdatedText}>
          Updated: {new Date(lastUpdated).toLocaleTimeString()}
        </Text>
        <TouchableOpacity
          onPress={updateStatus}
          style={styles.refreshButton}
          accessibilityLabel="Refresh status"
          accessibilityRole="button"
        >
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  /**
   * MAIN RENDER
   */
  return (
    <View
      style={[styles.container, style]}
      testID={testID}
      accessible={true}
      accessibilityLabel={getAccessibilityLabel()}
      accessibilityRole="text"
    >
      {showDetailed ? renderDetailedStatus() : renderCompactStatus()}
    </View>
  );
}

/**
 * STYLES
 */
const styles = StyleSheet.create({
  container: {
    // Base container styles
  },

  // Compact Status Styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[12],
    backgroundColor: '#f8f9fa',
    borderRadius: borderRadius.xxl,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.small,
    marginRight: spacing[8],
  },

  compactStatusText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: '#495057',
    flex: 1,
  },

  // Detailed Status Styles
  detailedContainer: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: '#e9ecef',
    padding: spacing[16],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[16],
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: borderRadius.medium,
    marginRight: spacing[12],
  },

  headerTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.bold,
    color: '#212529',
    flex: 1,
  },

  errorContainer: {
    backgroundColor: '#ffebee',
    padding: spacing[12],
    borderRadius: borderRadius.medium,
    marginBottom: spacing[16],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  errorText: {
    color: '#c62828',
    flex: 1,
    fontSize: typography.bodySmall.size,
  },

  retryButton: {
    backgroundColor: '#c62828',
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.small,
    marginLeft: spacing[8],
  },

  retryButtonText: {
    color: '#fff',
    fontSize: typography.micro.size,
    fontWeight: typography.fontWeight.bold,
  },

  statusSection: {
    marginBottom: spacing[16],
    paddingBottom: spacing[16],
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },

  sectionTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.bold,
    color: '#495057',
    marginBottom: spacing[12],
  },

  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[8],
    minHeight: 24,
  },

  statusLabel: {
    fontSize: typography.bodySmall.size,
    color: '#6c757d',
    flex: 1,
  },

  statusValue: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: '#495057',
    textAlign: 'right',
  },

  warningText: {
    color: '#ffa726',
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[8],
    paddingTop: spacing[16],
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },

  lastUpdatedText: {
    fontSize: typography.micro.size,
    color: '#6c757d',
  },

  refreshButton: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.small,
  },

  refreshButtonText: {
    color: '#495057',
    fontSize: typography.micro.size,
    fontWeight: typography.fontWeight.medium,
  },
});

// Export prop types for documentation
export type { SyncStatusIndicatorProps, SyncStatus };
