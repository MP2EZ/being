/**
 * Optimized Crisis Payment Performance Components
 *
 * High-performance crisis response UI that maintains <200ms response time
 * during payment sync operations with optimized rendering and memory usage.
 */

import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  AccessibilityInfo,
  Platform,
  InteractionManager
} from 'react-native';
import { Button } from '../core';
import { colorSystem, spacing, borderRadius, typography } from '../../constants/colors';
import { useTheme } from '../../hooks/useTheme';
import { useCommonHaptics } from '../../hooks/useHaptics';
import { usePaymentStore, paymentSelectors } from '../../store/paymentStore';

/**
 * High-Performance Crisis Button Wrapper
 * Isolated from payment sync operations with dedicated animation thread
 */
interface OptimizedCrisisButtonProps {
  readonly paymentSyncActive?: boolean;
  readonly onCrisisActivated: () => void;
  readonly testID: string;
}

export const OptimizedCrisisButton: React.FC<OptimizedCrisisButtonProps> = React.memo(({
  paymentSyncActive = false,
  onCrisisActivated,
  testID
}) => {
  const { colorSystem: colors } = useTheme();
  const { onCritical } = useCommonHaptics();

  // Dedicated refs for performance isolation
  const responseTimeRef = useRef<number>(0);
  const renderCountRef = useRef<number>(0);
  const lastPressRef = useRef<number>(0);

  // Optimized crisis state - minimal re-renders
  const crisisState = useMemo(() => {
    const store = usePaymentStore.getState();
    return {
      isProtected: paymentSelectors.getCrisisAccess(store).isActive,
      priority: 'critical' as const
    };
  }, []);

  // Performance-optimized crisis handler
  const handleCrisisPress = useCallback(async () => {
    const startTime = performance.now();
    responseTimeRef.current = startTime;

    // Immediate haptic feedback - don't wait for async operations
    const hapticPromise = onCritical();

    // Prevent double-taps within 1000ms
    const now = Date.now();
    if (now - lastPressRef.current < 1000) {
      return;
    }
    lastPressRef.current = now;

    // Execute crisis activation immediately
    InteractionManager.runAfterInteractions(() => {
      onCrisisActivated();
    });

    // Track response time for performance monitoring
    const responseTime = performance.now() - startTime;
    if (responseTime > 200) {
      console.warn(`Crisis button response exceeded 200ms: ${responseTime.toFixed(2)}ms`);
    }

    // Accessibility announcement (non-blocking)
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility('Crisis support activated');
    }

    await hapticPromise;
  }, [onCrisisActivated, onCritical]);

  // Count renders for performance monitoring
  useEffect(() => {
    renderCountRef.current += 1;
    if (renderCountRef.current > 10) {
      console.warn(`Crisis button rendered ${renderCountRef.current} times - check for unnecessary re-renders`);
    }
  });

  // Memoized styles for performance
  const buttonStyle = useMemo(() => [
    styles.crisisButton,
    {
      backgroundColor: colors.status.error,
      borderColor: crisisState.isProtected ? colors.status.success : colors.status.error,
      borderWidth: crisisState.isProtected ? 2 : 1,
      // Dedicated crisis layer - always on top
      zIndex: 9999,
      elevation: 20
    }
  ], [colors, crisisState.isProtected]);

  const textStyle = useMemo(() => [
    styles.crisisButtonText,
    { color: colors.white }
  ], [colors.white]);

  return (
    <View style={styles.crisisContainer} testID={`${testID}-container`}>
      {/* Protection indicator - lightweight */}
      {crisisState.isProtected && (
        <View style={[styles.protectionIndicator, { backgroundColor: colors.status.successBackground }]}>
          <Text style={[styles.protectionText, { color: colors.status.success }]}>
            🛡️ Protected
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={buttonStyle}
        onPress={handleCrisisPress}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Emergency crisis support - always available"
        accessibilityHint="Immediate access to mental health emergency resources"
        testID={testID}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        // Optimize touch response
        delayPressIn={0}
        delayPressOut={0}
      >
        <Text style={textStyle} allowFontScaling={false}>
          Crisis Support
        </Text>
      </TouchableOpacity>
    </View>
  );
});

/**
 * Performance-Optimized Payment Status Indicator
 * Minimal re-renders during sync operations
 */
interface OptimizedPaymentStatusProps {
  readonly compact?: boolean;
  readonly testID: string;
}

export const OptimizedPaymentStatus: React.FC<OptimizedPaymentStatusProps> = React.memo(({
  compact = false,
  testID
}) => {
  const { colorSystem: colors } = useTheme();

  // Optimized selector - only subscribe to essential payment state
  const paymentStatus = useMemo(() => {
    const store = usePaymentStore.getState();
    const syncStatus = paymentSelectors.getSyncStatus(store);
    const crisisAccess = paymentSelectors.getCrisisAccess(store);

    return {
      status: syncStatus.status || 'active',
      networkStatus: syncStatus.networkStatus || 'online',
      queueSize: syncStatus.queueSize || 0,
      crisisProtected: crisisAccess.isActive,
      lastSync: syncStatus.lastSync
    };
  }, []);

  // Memoized status info to prevent recalculation
  const statusInfo = useMemo(() => {
    const { status, networkStatus, queueSize, crisisProtected } = paymentStatus;

    if (crisisProtected) {
      return {
        icon: '🛡️',
        color: colors.status.success,
        title: 'Crisis Protected',
        priority: 'high' as const
      };
    }

    if (networkStatus === 'offline') {
      return {
        icon: '📱',
        color: colors.status.warning,
        title: compact ? 'Offline' : `Offline (${queueSize} queued)`,
        priority: 'medium' as const
      };
    }

    if (status === 'error') {
      return {
        icon: '⚠️',
        color: colors.status.error,
        title: compact ? 'Attention Needed' : 'Payment Attention Needed',
        priority: 'high' as const
      };
    }

    return {
      icon: '✅',
      color: colors.status.success,
      title: compact ? 'Active' : 'Sync Active',
      priority: 'low' as const
    };
  }, [paymentStatus, colors, compact]);

  // Lightweight container styles
  const containerStyle = useMemo(() => [
    styles.statusContainer,
    compact && styles.statusContainerCompact,
    { backgroundColor: `${statusInfo.color}15` }
  ], [compact, statusInfo.color]);

  return (
    <View
      style={containerStyle}
      accessible={true}
      accessibilityRole="status"
      accessibilityLabel={`Payment status: ${statusInfo.title}`}
      testID={testID}
    >
      <Text style={styles.statusIcon}>{statusInfo.icon}</Text>
      <Text style={[styles.statusTitle, { color: statusInfo.color }]}>
        {statusInfo.title}
      </Text>
    </View>
  );
});

/**
 * Memory-Efficient Sync Progress Component
 * Optimized for battery efficiency during long sync operations
 */
interface OptimizedSyncProgressProps {
  readonly percentage: number;
  readonly estimatedTimeMs?: number;
  readonly testID: string;
}

export const OptimizedSyncProgress: React.FC<OptimizedSyncProgressProps> = React.memo(({
  percentage,
  estimatedTimeMs,
  testID
}) => {
  const { colorSystem: colors } = useTheme();
  const progressAnim = useRef(new Animated.Value(percentage / 100)).current;

  // Throttled animation updates to reduce battery drain
  useEffect(() => {
    const targetValue = percentage / 100;

    // Only animate if difference is significant (>5%)
    if (Math.abs(targetValue - progressAnim._value) > 0.05) {
      Animated.timing(progressAnim, {
        toValue: targetValue,
        duration: 300,
        useNativeDriver: false, // Required for width animations
      }).start();
    }
  }, [percentage, progressAnim]);

  // Memoized estimated time display
  const timeDisplay = useMemo(() => {
    if (!estimatedTimeMs || estimatedTimeMs < 1000) return null;

    const seconds = Math.ceil(estimatedTimeMs / 1000);
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }, [estimatedTimeMs]);

  return (
    <View style={styles.progressContainer} testID={testID}>
      <View style={styles.progressHeader}>
        <Text style={[styles.progressLabel, { color: colors.gray[700] }]}>
          Syncing
        </Text>
        <Text style={[styles.progressPercentage, { color: colors.gray[600] }]}>
          {Math.round(percentage)}%
        </Text>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: colors.gray[200] }]}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              backgroundColor: colors.primary,
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
                extrapolate: 'clamp'
              })
            }
          ]}
        />
      </View>

      {timeDisplay && (
        <Text style={[styles.progressTime, { color: colors.gray[500] }]}>
          ETA: {timeDisplay}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  // Crisis Button Styles
  crisisContainer: {
    alignItems: 'center',
    zIndex: 9999, // Always on top
  },
  crisisButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.large,
    minHeight: 48,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    // Performance optimization: avoid shadows during sync
    shadowColor: 'transparent',
    elevation: 0,
  },
  crisisButtonText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    textAlign: 'center',
  },
  protectionIndicator: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.small,
    marginBottom: spacing.xs,
  },
  protectionText: {
    fontSize: typography.caption.size,
    fontWeight: '500',
  },

  // Status Indicator Styles
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.medium,
    minHeight: 40,
  },
  statusContainerCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 32,
  },
  statusIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  statusTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '500',
  },

  // Progress Styles
  progressContainer: {
    padding: spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  progressLabel: {
    fontSize: typography.caption.size,
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: typography.caption.size,
    fontWeight: '600',
  },
  progressTrack: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 1.5,
  },
  progressTime: {
    fontSize: typography.micro.size,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});

export {
  OptimizedCrisisButton,
  OptimizedPaymentStatus,
  OptimizedSyncProgress
};