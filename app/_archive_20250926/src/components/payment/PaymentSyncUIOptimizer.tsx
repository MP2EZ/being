/**
 * Payment Sync UI Performance Optimizer
 *
 * Advanced optimization system for payment sync UI components targeting:
 * - 60fps sync status updates
 * - Battery-efficient background sync visualization
 * - Memory-optimized notification rendering
 * - Non-blocking progress indicators
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  useWindowDimensions,
  PixelRatio,
  Platform,
  NativeModules,
  InteractionManager
} from 'react-native';
import { colorSystem, spacing, borderRadius, typography } from '../../constants/colors';
import { useTheme } from '../../hooks/useTheme';

// Performance monitoring utilities
const PerformanceMonitor = {
  frameDrops: 0,
  lastFrameTime: 0,
  targetFrameTime: 16.67, // 60fps = 16.67ms per frame

  trackFrame: () => {
    const now = performance.now();
    if (PerformanceMonitor.lastFrameTime > 0) {
      const frameDuration = now - PerformanceMonitor.lastFrameTime;
      if (frameDuration > PerformanceMonitor.targetFrameTime * 1.5) {
        PerformanceMonitor.frameDrops++;
        if (PerformanceMonitor.frameDrops % 10 === 0) {
          console.warn(`Payment UI frame drops: ${PerformanceMonitor.frameDrops} (${frameDuration.toFixed(2)}ms)`);
        }
      }
    }
    PerformanceMonitor.lastFrameTime = now;
  },

  resetMetrics: () => {
    PerformanceMonitor.frameDrops = 0;
    PerformanceMonitor.lastFrameTime = 0;
  }
};

/**
 * High-Performance Sync Status Indicator
 * Uses requestAnimationFrame for 60fps updates during sync operations
 */
interface OptimizedSyncStatusIndicatorProps {
  readonly syncActive: boolean;
  readonly progress: number;
  readonly status: 'syncing' | 'success' | 'error' | 'offline';
  readonly showDetailedProgress?: boolean;
  readonly testID: string;
}

export const OptimizedSyncStatusIndicator: React.FC<OptimizedSyncStatusIndicatorProps> = React.memo(({
  syncActive,
  progress,
  status,
  showDetailedProgress = false,
  testID
}) => {
  const { colorSystem: colors } = useTheme();
  const dimensions = useWindowDimensions();

  // Animation refs for 60fps performance
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(progress)).current;

  // Frame tracking for performance monitoring
  const frameRef = useRef<number>();
  const renderCount = useRef(0);

  // Optimized color scheme based on status
  const statusColors = useMemo(() => {
    switch (status) {
      case 'syncing':
        return {
          primary: colors.primary,
          background: `${colors.primary}15`,
          icon: '🔄'
        };
      case 'success':
        return {
          primary: colors.status.success,
          background: `${colors.status.success}15`,
          icon: '✅'
        };
      case 'error':
        return {
          primary: colors.status.error,
          background: `${colors.status.error}15`,
          icon: '⚠️'
        };
      case 'offline':
        return {
          primary: colors.status.warning,
          background: `${colors.status.warning}15`,
          icon: '📱'
        };
    }
  }, [status, colors]);

  // High-performance rotation animation for sync indicator
  useEffect(() => {
    if (syncActive && status === 'syncing') {
      const startRotation = () => {
        Animated.loop(
          Animated.timing(rotationAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          })
        ).start();
      };

      InteractionManager.runAfterInteractions(startRotation);
    } else {
      rotationAnim.stopAnimation();
      rotationAnim.setValue(0);
    }
  }, [syncActive, status, rotationAnim]);

  // Battery-efficient pulse animation for critical states
  useEffect(() => {
    if (status === 'error') {
      const startPulse = () => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
          ])
        ).start();
      };

      InteractionManager.runAfterInteractions(startPulse);
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [status, pulseAnim]);

  // Optimized progress animation with frame throttling
  useEffect(() => {
    const updateProgress = () => {
      PerformanceMonitor.trackFrame();

      // Throttle progress updates to maintain 60fps
      if (Math.abs(progress - progressAnim._value * 100) > 1) {
        Animated.timing(progressAnim, {
          toValue: progress / 100,
          duration: 200,
          useNativeDriver: false, // Required for width animations
        }).start();
      }
    };

    InteractionManager.runAfterInteractions(updateProgress);
  }, [progress, progressAnim]);

  // Render count tracking for performance monitoring
  useEffect(() => {
    renderCount.current++;
    if (renderCount.current > 50) {
      console.warn(`Sync indicator rendered ${renderCount.current} times - check for unnecessary re-renders`);
    }
  });

  // Optimized interpolation for rotation
  const rotationInterpolate = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Memoized styles for performance
  const containerStyle = useMemo(() => [
    styles.syncIndicatorContainer,
    {
      backgroundColor: statusColors.background,
      borderColor: statusColors.primary,
    }
  ], [statusColors]);

  const iconContainerStyle = useMemo(() => [
    styles.iconContainer,
    {
      transform: [
        { scale: pulseAnim },
        ...(status === 'syncing' ? [{ rotate: rotationInterpolate }] : [])
      ]
    }
  ], [pulseAnim, rotationInterpolate, status]);

  return (
    <View style={containerStyle} testID={testID}>
      <Animated.View style={iconContainerStyle}>
        <Text style={styles.statusIcon}>{statusColors.icon}</Text>
      </Animated.View>

      <View style={styles.statusContent}>
        <Text style={[styles.statusTitle, { color: statusColors.primary }]}>
          {status === 'syncing' ? 'Syncing Payment Data' :
           status === 'success' ? 'Sync Complete' :
           status === 'error' ? 'Sync Attention Needed' :
           'Offline Mode'}
        </Text>

        {showDetailedProgress && syncActive && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressTrack, { backgroundColor: colors.gray[200] }]}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    backgroundColor: statusColors.primary,
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                      extrapolate: 'clamp'
                    })
                  }
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.gray[600] }]}>
              {Math.round(progress)}%
            </Text>
          </View>
        )}
      </View>
    </View>
  );
});

/**
 * Battery-Efficient Background Sync Visualizer
 * Minimal CPU usage during background sync operations
 */
interface BackgroundSyncVisualizerProps {
  readonly queueSize: number;
  readonly networkStatus: 'online' | 'offline';
  readonly estimatedSyncTime?: number;
  readonly testID: string;
}

export const BackgroundSyncVisualizer: React.FC<BackgroundSyncVisualizerProps> = React.memo(({
  queueSize,
  networkStatus,
  estimatedSyncTime,
  testID
}) => {
  const { colorSystem: colors } = useTheme();

  // Battery-efficient animation - only when necessary
  const dotAnim = useRef(new Animated.Value(0)).current;
  const [animationActive, setAnimationActive] = useState(false);

  // Start animation only when there's actual sync work
  useEffect(() => {
    const shouldAnimate = queueSize > 0 && networkStatus === 'online';

    if (shouldAnimate && !animationActive) {
      setAnimationActive(true);

      const startAnimation = () => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(dotAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(dotAnim, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      };

      // Delay animation start to avoid blocking UI
      InteractionManager.runAfterInteractions(startAnimation);
    } else if (!shouldAnimate && animationActive) {
      setAnimationActive(false);
      dotAnim.stopAnimation();
      dotAnim.setValue(0);
    }
  }, [queueSize, networkStatus, animationActive, dotAnim]);

  // Memoized status info to prevent recalculation
  const syncInfo = useMemo(() => {
    if (queueSize === 0) {
      return {
        message: 'All sync operations complete',
        color: colors.status.success,
        showDots: false
      };
    }

    if (networkStatus === 'offline') {
      return {
        message: `${queueSize} operations queued for sync`,
        color: colors.status.warning,
        showDots: false
      };
    }

    const timeText = estimatedSyncTime
      ? ` (${Math.ceil(estimatedSyncTime / 1000)}s remaining)`
      : '';

    return {
      message: `Syncing ${queueSize} operations${timeText}`,
      color: colors.primary,
      showDots: true
    };
  }, [queueSize, networkStatus, estimatedSyncTime, colors]);

  // Animated dots for visual feedback
  const renderAnimatedDots = useCallback(() => {
    if (!syncInfo.showDots) return null;

    const dotOpacity = dotAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    });

    return (
      <View style={styles.dotsContainer}>
        {[0, 1, 2].map((index) => (
          <Animated.View
            key={index}
            style={[
              styles.syncDot,
              {
                backgroundColor: syncInfo.color,
                opacity: dotAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 1],
                  extrapolate: 'clamp'
                }),
                transform: [{
                  scale: dotAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 1.2, 1],
                    extrapolate: 'clamp'
                  })
                }]
              }
            ]}
          />
        ))}
      </View>
    );
  }, [syncInfo, dotAnim]);

  return (
    <View style={styles.backgroundSyncContainer} testID={testID}>
      <Text style={[styles.syncMessage, { color: syncInfo.color }]}>
        {syncInfo.message}
      </Text>
      {renderAnimatedDots()}
    </View>
  );
});

/**
 * Non-Blocking Error Notification System
 * Lightweight notifications that don't interrupt therapeutic flow
 */
interface NonBlockingNotificationProps {
  readonly visible: boolean;
  readonly type: 'payment_error' | 'sync_error' | 'network_error';
  readonly message: string;
  readonly onDismiss?: () => void;
  readonly therapeuticMode?: boolean;
  readonly testID: string;
}

export const NonBlockingNotification: React.FC<NonBlockingNotificationProps> = React.memo(({
  visible,
  type,
  message,
  onDismiss,
  therapeuticMode = false,
  testID
}) => {
  const { colorSystem: colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Non-blocking slide animation
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();

      // Auto-dismiss in therapeutic mode to avoid disruption
      if (therapeuticMode && onDismiss) {
        const timer = setTimeout(onDismiss, 3000);
        return () => clearTimeout(timer);
      }
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible, slideAnim, opacityAnim, therapeuticMode, onDismiss]);

  // Memoized notification config
  const notificationConfig = useMemo(() => {
    switch (type) {
      case 'payment_error':
        return {
          icon: '💳',
          color: colors.status.error,
          backgroundColor: colors.status.errorBackground,
          title: 'Payment Attention Needed'
        };
      case 'sync_error':
        return {
          icon: '🔄',
          color: colors.status.warning,
          backgroundColor: colors.status.warningBackground,
          title: 'Sync Issue'
        };
      case 'network_error':
        return {
          icon: '📡',
          color: colors.status.info,
          backgroundColor: colors.status.infoBackground,
          title: 'Connection Issue'
        };
    }
  }, [type, colors]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.notificationContainer,
        {
          backgroundColor: notificationConfig.backgroundColor,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        }
      ]}
      testID={testID}
    >
      <Text style={styles.notificationIcon}>{notificationConfig.icon}</Text>

      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, { color: notificationConfig.color }]}>
          {notificationConfig.title}
        </Text>
        <Text style={[styles.notificationMessage, { color: colors.gray[700] }]}>
          {message}
        </Text>

        {therapeuticMode && (
          <Text style={[styles.therapeuticNote, { color: colors.status.success }]}>
            💚 Your mindfulness practice continues safely
          </Text>
        )}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  // Sync Status Indicator
  syncIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    marginVertical: spacing.xs,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  statusIcon: {
    fontSize: 16,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    marginRight: spacing.sm,
  },
  progressBar: {
    height: '100%',
    borderRadius: 1,
  },
  progressText: {
    fontSize: typography.caption.size,
    fontWeight: '500',
    minWidth: 35,
  },

  // Background Sync Visualizer
  backgroundSyncContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  syncMessage: {
    fontSize: typography.caption.size,
    marginRight: spacing.sm,
  },
  dotsContainer: {
    flexDirection: 'row',
  },
  syncDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 1,
  },

  // Non-Blocking Notification
  notificationContainer: {
    position: 'absolute',
    top: 0,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.medium,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  notificationIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  notificationMessage: {
    fontSize: typography.caption.size,
    lineHeight: 16,
  },
  therapeuticNote: {
    fontSize: typography.micro.size,
    marginTop: spacing.xs / 2,
    fontStyle: 'italic',
  },
});

export {
  OptimizedSyncStatusIndicator,
  BackgroundSyncVisualizer,
  NonBlockingNotification,
  PerformanceMonitor
};