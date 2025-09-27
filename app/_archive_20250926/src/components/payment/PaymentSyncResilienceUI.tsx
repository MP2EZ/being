/**
 * Payment Sync Resilience UI Components
 *
 * Comprehensive React Native UI integration for P0-CLOUD payment sync resilience
 * Features:
 * - Real-time sync status with subscription tier differentiation
 * - Resilience operation monitoring (retry attempts, circuit breaker)
 * - Network outage handling with encrypted queue management
 * - Crisis safety preservation during payment failures
 * - Accessibility-first design with therapeutic UX principles
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ScrollView,
  Alert,
  Vibration,
  AccessibilityInfo,
  Platform
} from 'react-native';
import { Card, Button } from '../core';
import { colorSystem, spacing, borderRadius, typography } from '../../constants/colors';
import { useTheme } from '../../hooks/useTheme';
import { useCommonHaptics, useHapticPreference } from '../../hooks/useHaptics';
import { usePaymentStore, paymentSelectors } from '../../store/paymentStore';
import { PaymentStatusIndicator } from './PaymentStatusIndicator';
import { CrisisPaymentBanner } from './CrisisPaymentBanner';

/**
 * Payment Sync Status UI Component
 * Shows real-time sync status with subscription tier differentiation
 */
export interface PaymentSyncStatusProps {
  readonly compact?: boolean;
  readonly showCrisisIndicator?: boolean;
  readonly onSyncRetry?: () => Promise<void>;
  readonly testID: string;
}

export const PaymentSyncStatus: React.FC<PaymentSyncStatusProps> = ({
  compact = false,
  showCrisisIndicator = true,
  onSyncRetry,
  testID
}) => {
  const { colorSystem: colors } = useTheme();
  const { onSuccess, onError, onWarning } = useCommonHaptics();
  const animatedValue = useRef(new Animated.Value(0)).current;

  const store = usePaymentStore();
  const syncStatus = paymentSelectors.getSyncStatus(store);
  const resilienceMetrics = paymentSelectors.getResilienceMetrics(store);
  const subscriptionTier = paymentSelectors.getSubscriptionTier(store);
  const crisisAccess = paymentSelectors.getCrisisAccess(store);

  // Animation for sync status changes
  useEffect(() => {
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  }, [syncStatus.status, animatedValue]);

  const getSyncStatusInfo = () => {
    const isOffline = syncStatus.networkStatus === 'offline';
    const isRetrying = syncStatus.status === 'retrying';
    const hasError = syncStatus.status === 'error';
    const isQueued = syncStatus.queueSize > 0;

    if (crisisAccess.isActive && hasError) {
      return {
        icon: '🛡️',
        title: 'Crisis Access Protected',
        subtitle: 'Payment sync paused - therapeutic access maintained',
        color: colors.status.success,
        backgroundColor: colors.status.successBackground,
        therapeutic: true,
        priority: 'high'
      };
    }

    if (isOffline) {
      return {
        icon: '📡',
        title: 'Offline Mode Active',
        subtitle: `${syncStatus.queueSize} operations queued for sync`,
        color: colors.status.warning,
        backgroundColor: colors.status.warningBackground,
        therapeutic: true,
        priority: 'medium'
      };
    }

    if (isRetrying) {
      return {
        icon: '🔄',
        title: 'Reconnecting Payment Sync',
        subtitle: `Attempt ${resilienceMetrics.retryCount}/${resilienceMetrics.maxRetries}`,
        color: colors.status.info,
        backgroundColor: colors.status.infoBackground,
        therapeutic: false,
        priority: 'medium'
      };
    }

    if (hasError) {
      return {
        icon: '⚠️',
        title: 'Payment Sync Needs Attention',
        subtitle: 'Your mindfulness practice continues safely',
        color: colors.status.error,
        backgroundColor: colors.status.errorBackground,
        therapeutic: true,
        priority: 'high'
      };
    }

    // Successful sync
    const tierName = subscriptionTier?.name || 'Basic';
    return {
      icon: '✅',
      title: `${tierName} - Synced`,
      subtitle: syncStatus.lastSync
        ? `Last sync: ${new Date(syncStatus.lastSync).toLocaleTimeString()}`
        : 'Subscription active',
      color: colors.status.success,
      backgroundColor: colors.status.successBackground,
      therapeutic: false,
      priority: 'low'
    };
  };

  const statusInfo = getSyncStatusInfo();

  const handleRetryPress = async () => {
    if (onSyncRetry) {
      await onWarning();

      try {
        await onSyncRetry();
        await onSuccess();

        // Accessibility announcement
        if (Platform.OS === 'ios') {
          AccessibilityInfo.announceForAccessibility('Payment sync retry initiated');
        }
      } catch (error) {
        await onError();

        Alert.alert(
          'Sync Retry Failed',
          'Unable to retry payment sync. Your mindfulness practice continues safely.',
          [{ text: 'OK', style: 'default' }]
        );
      }
    }
  };

  const SyncContent = () => (
    <View style={[
      styles.syncContainer,
      compact && styles.syncContainerCompact,
      { backgroundColor: statusInfo.backgroundColor }
    ]}>
      <Animated.View
        style={[
          styles.syncIconContainer,
          { opacity: animatedValue.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] }) }
        ]}
      >
        <Text style={styles.syncIcon}>{statusInfo.icon}</Text>
      </Animated.View>

      <View style={styles.syncContent}>
        <Text
          style={[styles.syncTitle, { color: statusInfo.color }]}
          allowFontScaling={true}
          maxFontSizeMultiplier={1.5}
        >
          {statusInfo.title}
        </Text>

        {!compact && (
          <Text
            style={[styles.syncSubtitle, { color: colors.gray[600] }]}
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
          >
            {statusInfo.subtitle}
          </Text>
        )}
      </View>

      {/* Resilience metrics for advanced users */}
      {!compact && resilienceMetrics.circuitBreakerOpen && (
        <View style={styles.circuitBreakerIndicator}>
          <Text style={[styles.circuitBreakerText, { color: colors.status.warning }]}>
            Circuit Breaker Active
          </Text>
        </View>
      )}

      {/* Retry button for error states */}
      {statusInfo.priority === 'high' && onSyncRetry && (
        <TouchableOpacity
          style={[styles.retryButton, { borderColor: statusInfo.color }]}
          onPress={handleRetryPress}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Retry payment sync"
          accessibilityHint="Attempts to reconnect payment synchronization"
        >
          <Text style={[styles.retryButtonText, { color: statusInfo.color }]}>
            Retry
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.syncStatusContainer}>
      {/* Crisis safety banner if needed */}
      {showCrisisIndicator && crisisAccess.isActive && (
        <CrisisPaymentBanner
          compact={compact}
          testID={`${testID}-crisis-banner`}
        />
      )}

      <View
        accessible={true}
        accessibilityRole="status"
        accessibilityLabel={`Payment sync status: ${statusInfo.title}. ${statusInfo.subtitle}${statusInfo.therapeutic ? '. Your therapeutic access is protected.' : ''}`}
        testID={testID}
      >
        <SyncContent />
      </View>
    </View>
  );
};

/**
 * Payment Error Handling UI Component
 * Graceful error messaging with clear user actions
 */
export interface PaymentErrorHandlingProps {
  readonly error?: any;
  readonly subscriptionTier?: string;
  readonly onResolveError?: () => Promise<void>;
  readonly onEmergencyAccess?: () => void;
  readonly testID: string;
}

export const PaymentErrorHandling: React.FC<PaymentErrorHandlingProps> = ({
  error,
  subscriptionTier = 'basic',
  onResolveError,
  onEmergencyAccess,
  testID
}) => {
  const { colorSystem: colors } = useTheme();
  const { onError, onSuccess } = useCommonHaptics();
  const [isResolving, setIsResolving] = useState(false);

  const getErrorInfo = () => {
    if (!error) return null;

    const errorType = error.type || 'unknown';
    const isNetworkError = errorType === 'network' || error.code === 'NETWORK_ERROR';
    const isPaymentError = errorType === 'payment' || error.code?.startsWith('PAYMENT_');
    const isCritical = error.severity === 'critical';

    if (isNetworkError) {
      return {
        icon: '📡',
        title: 'Connection Temporarily Unavailable',
        message: 'Your mindfulness practice continues while we reconnect payment services.',
        actions: ['Use Offline Features', 'Retry Connection'],
        therapeutic: true,
        allowEmergencyAccess: true
      };
    }

    if (isPaymentError && subscriptionTier !== 'basic') {
      return {
        icon: '💳',
        title: 'Payment Attention Needed',
        message: 'Your subscription requires attention. All mindfulness features remain available during this grace period.',
        actions: ['Update Payment Method', 'View Account'],
        therapeutic: true,
        allowEmergencyAccess: false
      };
    }

    if (isCritical) {
      return {
        icon: '🛡️',
        title: 'Service Protection Active',
        message: 'Emergency protocols activated to ensure continuous access to your mindfulness practice.',
        actions: ['Access Emergency Features', 'Contact Support'],
        therapeutic: true,
        allowEmergencyAccess: true
      };
    }

    return {
      icon: '⚠️',
      title: 'Temporary Service Issue',
      message: 'A brief interruption occurred. Your practice data is safe and services are reconnecting.',
      actions: ['Continue Practice', 'Retry'],
      therapeutic: true,
      allowEmergencyAccess: false
    };
  };

  const errorInfo = getErrorInfo();
  if (!errorInfo) return null;

  const handleResolveError = async () => {
    if (onResolveError && !isResolving) {
      setIsResolving(true);
      await onError();

      try {
        await onResolveError();
        await onSuccess();

        // Accessibility announcement
        if (Platform.OS === 'ios') {
          AccessibilityInfo.announceForAccessibility('Payment error resolution completed');
        }
      } catch (resolveError) {
        console.error('Error resolution failed:', resolveError);
      } finally {
        setIsResolving(false);
      }
    }
  };

  const handleEmergencyAccess = async () => {
    if (onEmergencyAccess) {
      await onSuccess();
      onEmergencyAccess();

      // Accessibility announcement
      if (Platform.OS === 'ios') {
        AccessibilityInfo.announceForAccessibility('Emergency access activated');
      }
    }
  };

  return (
    <Card
      style={[styles.errorContainer, { backgroundColor: colors.status.errorBackground }]}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLabel={`Payment error: ${errorInfo.title}. ${errorInfo.message}`}
      testID={testID}
    >
      <View style={styles.errorHeader}>
        <Text style={styles.errorIcon}>{errorInfo.icon}</Text>
        <Text style={[styles.errorTitle, { color: colors.status.error }]}>
          {errorInfo.title}
        </Text>
      </View>

      <Text
        style={[styles.errorMessage, { color: colors.gray[700] }]}
        allowFontScaling={true}
        maxFontSizeMultiplier={1.4}
      >
        {errorInfo.message}
      </Text>

      <View style={styles.errorActions}>
        <Button
          title={errorInfo.actions[0]}
          onPress={errorInfo.allowEmergencyAccess ? handleEmergencyAccess : handleResolveError}
          variant="primary"
          size="medium"
          loading={isResolving}
          accessibilityLabel={`${errorInfo.actions[0]} button`}
          testID={`${testID}-primary-action`}
          style={styles.errorActionButton}
        />

        {errorInfo.actions[1] && (
          <Button
            title={errorInfo.actions[1]}
            onPress={handleResolveError}
            variant="secondary"
            size="medium"
            loading={isResolving}
            accessibilityLabel={`${errorInfo.actions[1]} button`}
            testID={`${testID}-secondary-action`}
            style={styles.errorActionButton}
          />
        )}
      </View>

      {errorInfo.therapeutic && (
        <View style={styles.therapeuticNote}>
          <Text style={[styles.therapeuticText, { color: colors.status.success }]}>
            💚 Your mindfulness journey continues uninterrupted
          </Text>
        </View>
      )}
    </Card>
  );
};

/**
 * Performance Feedback UI Component
 * Shows sync operation progress and optimization status
 */
export interface PaymentPerformanceFeedbackProps {
  readonly showDetailedMetrics?: boolean;
  readonly onOptimizePerformance?: () => Promise<void>;
  readonly testID: string;
}

export const PaymentPerformanceFeedback: React.FC<PaymentPerformanceFeedbackProps> = ({
  showDetailedMetrics = false,
  onOptimizePerformance,
  testID
}) => {
  const { colorSystem: colors } = useTheme();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [isOptimizing, setIsOptimizing] = useState(false);

  const store = usePaymentStore();
  const performanceMetrics = paymentSelectors.getPerformanceMetrics(store);
  const syncProgress = paymentSelectors.getSyncProgress(store);

  // Animate progress updates
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: syncProgress.completionPercentage / 100,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [syncProgress.completionPercentage, progressAnim]);

  const getPerformanceStatus = () => {
    const avgResponseTime = performanceMetrics.averageResponseTime || 0;
    const successRate = performanceMetrics.successRate || 100;
    const compressionRatio = performanceMetrics.compressionRatio || 1;

    if (avgResponseTime < 200 && successRate > 95) {
      return {
        status: 'excellent',
        icon: '⚡',
        title: 'Optimal Performance',
        color: colors.status.success
      };
    } else if (avgResponseTime < 500 && successRate > 90) {
      return {
        status: 'good',
        icon: '✅',
        title: 'Good Performance',
        color: colors.status.info
      };
    } else {
      return {
        status: 'needs-optimization',
        icon: '🔧',
        title: 'Performance Optimization Available',
        color: colors.status.warning
      };
    }
  };

  const performanceStatus = getPerformanceStatus();

  const handleOptimizePerformance = async () => {
    if (onOptimizePerformance && !isOptimizing) {
      setIsOptimizing(true);

      try {
        await onOptimizePerformance();

        // Accessibility announcement
        if (Platform.OS === 'ios') {
          AccessibilityInfo.announceForAccessibility('Performance optimization completed');
        }
      } catch (error) {
        console.error('Performance optimization failed:', error);
      } finally {
        setIsOptimizing(false);
      }
    }
  };

  return (
    <View
      style={styles.performanceContainer}
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityLabel={`Payment sync performance: ${performanceStatus.title}`}
      testID={testID}
    >
      {/* Progress indicator */}
      {syncProgress.isActive && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: colors.gray[700] }]}>
              Syncing Payment Data
            </Text>
            <Text style={[styles.progressPercentage, { color: colors.gray[600] }]}>
              {Math.round(syncProgress.completionPercentage)}%
            </Text>
          </View>

          <View style={styles.progressBarContainer}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%']
                  }),
                  backgroundColor: colors.status.info
                }
              ]}
            />
          </View>

          {syncProgress.estimatedTimeRemaining && (
            <Text style={[styles.progressETA, { color: colors.gray[600] }]}>
              ETA: {Math.round(syncProgress.estimatedTimeRemaining / 1000)}s
            </Text>
          )}
        </View>
      )}

      {/* Performance status */}
      <View style={styles.performanceStatus}>
        <View style={styles.performanceHeader}>
          <Text style={styles.performanceIcon}>{performanceStatus.icon}</Text>
          <Text style={[styles.performanceTitle, { color: performanceStatus.color }]}>
            {performanceStatus.title}
          </Text>
        </View>

        {showDetailedMetrics && (
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: colors.gray[600] }]}>
                Response Time
              </Text>
              <Text style={[styles.metricValue, { color: colors.gray[700] }]}>
                {Math.round(performanceMetrics.averageResponseTime || 0)}ms
              </Text>
            </View>

            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: colors.gray[600] }]}>
                Success Rate
              </Text>
              <Text style={[styles.metricValue, { color: colors.gray[700] }]}>
                {Math.round(performanceMetrics.successRate || 100)}%
              </Text>
            </View>

            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: colors.gray[600] }]}>
                Data Compression
              </Text>
              <Text style={[styles.metricValue, { color: colors.gray[700] }]}>
                {Math.round((1 - (performanceMetrics.compressionRatio || 1)) * 100)}%
              </Text>
            </View>
          </View>
        )}

        {performanceStatus.status === 'needs-optimization' && onOptimizePerformance && (
          <Button
            title="Optimize Performance"
            onPress={handleOptimizePerformance}
            variant="secondary"
            size="small"
            loading={isOptimizing}
            accessibilityLabel="Optimize payment sync performance"
            testID={`${testID}-optimize-button`}
            style={styles.optimizeButton}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Payment Sync Status Styles
  syncStatusContainer: {
    marginBottom: spacing.sm,
  },
  syncContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 72,
  },
  syncContainerCompact: {
    padding: spacing.sm,
    minHeight: 48,
  },
  syncIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.medium,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  syncIcon: {
    fontSize: 20,
  },
  syncContent: {
    flex: 1,
    marginRight: spacing.xs,
  },
  syncTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
    lineHeight: 20,
  },
  syncSubtitle: {
    fontSize: typography.caption.size,
    lineHeight: 18,
  },
  circuitBreakerIndicator: {
    backgroundColor: colorSystem.status.warningBackground,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.small,
    marginRight: spacing.xs,
  },
  circuitBreakerText: {
    fontSize: typography.micro.size,
    fontWeight: '500',
  },
  retryButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    minWidth: 60,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: typography.caption.size,
    fontWeight: '600',
  },

  // Payment Error Handling Styles
  errorContainer: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  errorIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  errorTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    flex: 1,
  },
  errorMessage: {
    fontSize: typography.bodyRegular.size,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  errorActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  errorActionButton: {
    flex: 1,
    marginHorizontal: spacing.xs / 2,
  },
  therapeuticNote: {
    backgroundColor: colorSystem.status.successBackground,
    padding: spacing.sm,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
  },
  therapeuticText: {
    fontSize: typography.caption.size,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Performance Feedback Styles
  performanceContainer: {
    backgroundColor: colorSystem.gray[50],
    padding: spacing.md,
    borderRadius: borderRadius.large,
    marginBottom: spacing.sm,
  },
  progressSection: {
    marginBottom: spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: typography.caption.size,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: colorSystem.gray[300],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  progressETA: {
    fontSize: typography.caption.size,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  performanceStatus: {
    // No additional styles needed
  },
  performanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  performanceIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  performanceTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: typography.caption.size,
    marginBottom: spacing.xs / 2,
  },
  metricValue: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
  },
  optimizeButton: {
    alignSelf: 'center',
    minWidth: 140,
  },
});

export {
  PaymentSyncStatus,
  PaymentErrorHandling,
  PaymentPerformanceFeedback
};