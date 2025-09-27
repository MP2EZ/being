/**
 * Network-Aware Payment Performance Optimizer
 *
 * Optimizes payment sync UI performance based on network conditions:
 * - Adaptive UI behavior during network outages
 * - Efficient retry visualization without performance impact
 * - Battery-optimized offline payment status indicators
 * - Performance-efficient payment sync queue status updates
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  NetInfo,
  AppState,
  Vibration,
  Platform
} from 'react-native';
import { colorSystem, spacing, borderRadius, typography } from '../../constants/colors';
import { useTheme } from '../../hooks/useTheme';

// Network performance monitoring
class NetworkPerformanceMonitor {
  private static instance: NetworkPerformanceMonitor;
  private networkSpeed: 'slow' | 'medium' | 'fast' = 'medium';
  private connectionType: string = 'unknown';
  private retryAttempts: number = 0;
  private consecutiveFailures: number = 0;
  private lastSuccessfulSync: number = 0;
  private adaptiveUpdateInterval: number = 5000; // Start with 5 seconds

  static getInstance(): NetworkPerformanceMonitor {
    if (!NetworkPerformanceMonitor.instance) {
      NetworkPerformanceMonitor.instance = new NetworkPerformanceMonitor();
    }
    return NetworkPerformanceMonitor.instance;
  }

  updateNetworkInfo(speed: 'slow' | 'medium' | 'fast', type: string): void {
    this.networkSpeed = speed;
    this.connectionType = type;

    // Adjust update intervals based on network speed
    switch (speed) {
      case 'slow':
        this.adaptiveUpdateInterval = 15000; // 15 seconds for slow networks
        break;
      case 'medium':
        this.adaptiveUpdateInterval = 8000; // 8 seconds for medium networks
        break;
      case 'fast':
        this.adaptiveUpdateInterval = 3000; // 3 seconds for fast networks
        break;
    }
  }

  recordRetryAttempt(): void {
    this.retryAttempts++;
  }

  recordFailure(): void {
    this.consecutiveFailures++;
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.lastSuccessfulSync = Date.now();
  }

  getOptimalUpdateInterval(): number {
    // Increase interval based on consecutive failures to save battery
    const failureMultiplier = Math.min(this.consecutiveFailures * 2, 8);
    return this.adaptiveUpdateInterval * (1 + failureMultiplier);
  }

  shouldReduceActivity(): boolean {
    // Reduce UI activity if many consecutive failures or slow network
    return this.consecutiveFailures > 3 || this.networkSpeed === 'slow';
  }

  getMetrics() {
    return {
      networkSpeed: this.networkSpeed,
      connectionType: this.connectionType,
      retryAttempts: this.retryAttempts,
      consecutiveFailures: this.consecutiveFailures,
      lastSuccessfulSync: this.lastSuccessfulSync,
      adaptiveUpdateInterval: this.adaptiveUpdateInterval
    };
  }
}

/**
 * Adaptive Network Status Component
 * Adjusts UI behavior and update frequency based on network conditions
 */
interface AdaptiveNetworkStatusProps {
  readonly onNetworkChange?: (networkInfo: NetworkInfo) => void;
  readonly children: (networkState: {
    isOnline: boolean;
    networkSpeed: 'slow' | 'medium' | 'fast';
    connectionType: string;
    shouldReduceActivity: boolean;
    optimalUpdateInterval: number;
  }) => React.ReactNode;
}

interface NetworkInfo {
  isConnected: boolean;
  type: string;
  effectiveType?: string;
}

export const AdaptiveNetworkStatus: React.FC<AdaptiveNetworkStatusProps> = ({
  onNetworkChange,
  children
}) => {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    isConnected: true,
    type: 'unknown'
  });

  const networkMonitor = NetworkPerformanceMonitor.getInstance();

  // Monitor network changes with performance tracking
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const networkSpeed = determineNetworkSpeed(state);
      const newNetworkInfo: NetworkInfo = {
        isConnected: state.isConnected || false,
        type: state.type,
        effectiveType: state.details?.effectiveType
      };

      setNetworkInfo(newNetworkInfo);
      networkMonitor.updateNetworkInfo(networkSpeed, state.type);

      if (onNetworkChange) {
        onNetworkChange(newNetworkInfo);
      }
    });

    return unsubscribe;
  }, [onNetworkChange, networkMonitor]);

  // Determine network speed based on connection info
  const determineNetworkSpeed = useCallback((state: any): 'slow' | 'medium' | 'fast' => {
    if (!state.isConnected) return 'slow';

    const { type, details } = state;

    // Mobile network speed classification
    if (type === 'cellular') {
      const effectiveType = details?.effectiveType || '';
      if (effectiveType.includes('2g')) return 'slow';
      if (effectiveType.includes('3g')) return 'medium';
      if (effectiveType.includes('4g') || effectiveType.includes('5g')) return 'fast';
      return 'medium'; // Default for cellular
    }

    // WiFi is generally fast, but can vary
    if (type === 'wifi') {
      return 'fast';
    }

    // Other connection types
    if (type === 'ethernet') return 'fast';

    return 'medium'; // Default
  }, []);

  const networkState = useMemo(() => {
    const metrics = networkMonitor.getMetrics();

    return {
      isOnline: networkInfo.isConnected,
      networkSpeed: metrics.networkSpeed,
      connectionType: networkInfo.type,
      shouldReduceActivity: networkMonitor.shouldReduceActivity(),
      optimalUpdateInterval: networkMonitor.getOptimalUpdateInterval()
    };
  }, [networkInfo, networkMonitor]);

  return <>{children(networkState)}</>;
};

/**
 * Battery-Optimized Offline Indicator
 * Shows offline status with minimal battery drain
 */
interface BatteryOptimizedOfflineIndicatorProps {
  readonly isOffline: boolean;
  readonly queuedOperations: number;
  readonly lastSuccessfulSync?: number;
  readonly showAnimation?: boolean;
  readonly testID: string;
}

export const BatteryOptimizedOfflineIndicator: React.FC<BatteryOptimizedOfflineIndicatorProps> = ({
  isOffline,
  queuedOperations,
  lastSuccessfulSync,
  showAnimation = true,
  testID
}) => {
  const { colorSystem: colors } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [animationActive, setAnimationActive] = useState(false);

  // Battery-efficient animation - only when offline and necessary
  useEffect(() => {
    if (isOffline && showAnimation && !animationActive) {
      setAnimationActive(true);

      // Slow, battery-efficient pulse
      const startPulse = () => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 0.7,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      };

      // Delay animation start to save battery
      const timer = setTimeout(startPulse, 1000);
      return () => clearTimeout(timer);
    } else if (!isOffline && animationActive) {
      setAnimationActive(false);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isOffline, showAnimation, animationActive, pulseAnim]);

  // Format last sync time efficiently
  const lastSyncText = useMemo(() => {
    if (!lastSuccessfulSync) return 'No recent sync';

    const now = Date.now();
    const diffMs = now - lastSuccessfulSync;
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return 'Just synced';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }, [lastSuccessfulSync]);

  if (!isOffline) return null;

  return (
    <Animated.View
      style={[
        styles.offlineContainer,
        {
          backgroundColor: colors.status.warningBackground,
          opacity: pulseAnim
        }
      ]}
      testID={testID}
    >
      <Text style={styles.offlineIcon}>📱</Text>

      <View style={styles.offlineContent}>
        <Text style={[styles.offlineTitle, { color: colors.status.warning }]}>
          Offline Mode
        </Text>

        <Text style={[styles.offlineSubtitle, { color: colors.gray[600] }]}>
          {queuedOperations > 0
            ? `${queuedOperations} operations queued`
            : 'All operations synced'
          }
        </Text>

        {lastSuccessfulSync && (
          <Text style={[styles.lastSyncText, { color: colors.gray[500] }]}>
            Last sync: {lastSyncText}
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

/**
 * Efficient Retry Visualizer
 * Shows retry attempts with minimal performance impact
 */
interface EfficientRetryVisualizerProps {
  readonly isRetrying: boolean;
  readonly currentAttempt: number;
  readonly maxAttempts: number;
  readonly nextRetryIn?: number; // seconds
  readonly onManualRetry?: () => void;
  readonly reducedActivity?: boolean;
  readonly testID: string;
}

export const EfficientRetryVisualizer: React.FC<EfficientRetryVisualizerProps> = ({
  isRetrying,
  currentAttempt,
  maxAttempts,
  nextRetryIn,
  onManualRetry,
  reducedActivity = false,
  testID
}) => {
  const { colorSystem: colors } = useTheme();
  const [countdown, setCountdown] = useState(nextRetryIn || 0);
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Efficient countdown with reduced updates in low-activity mode
  useEffect(() => {
    if (!nextRetryIn || nextRetryIn <= 0) return;

    setCountdown(nextRetryIn);

    const updateInterval = reducedActivity ? 2000 : 1000; // Slower updates when reducing activity
    const timer = setInterval(() => {
      setCountdown(prev => {
        const newValue = prev - (updateInterval / 1000);
        return newValue > 0 ? newValue : 0;
      });
    }, updateInterval);

    return () => clearInterval(timer);
  }, [nextRetryIn, reducedActivity]);

  // Battery-efficient spin animation
  useEffect(() => {
    if (isRetrying && !reducedActivity) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 2000, // Slower rotation to save battery
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.stopAnimation();
      spinAnim.setValue(0);
    }
  }, [isRetrying, reducedActivity, spinAnim]);

  // Progress calculation
  const progressPercentage = useMemo(() => {
    return maxAttempts > 0 ? (currentAttempt / maxAttempts) * 100 : 0;
  }, [currentAttempt, maxAttempts]);

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!isRetrying && currentAttempt === 0) return null;

  return (
    <View style={styles.retryContainer} testID={testID}>
      <View style={styles.retryHeader}>
        <Animated.View style={[
          styles.retryIcon,
          !reducedActivity && { transform: [{ rotate: spinInterpolate }] }
        ]}>
          <Text style={styles.retryIconText}>🔄</Text>
        </Animated.View>

        <View style={styles.retryInfo}>
          <Text style={[styles.retryTitle, { color: colors.status.info }]}>
            {isRetrying ? 'Retrying Connection' : 'Connection Attempts'}
          </Text>

          <Text style={[styles.retrySubtitle, { color: colors.gray[600] }]}>
            Attempt {currentAttempt} of {maxAttempts}
          </Text>

          {countdown > 0 && (
            <Text style={[styles.countdownText, { color: colors.gray[500] }]}>
              Next retry in {Math.ceil(countdown)}s
            </Text>
          )}
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.gray[200] }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progressPercentage}%`,
              backgroundColor: colors.status.info
            }
          ]}
        />
      </View>

      {/* Manual retry option if available */}
      {onManualRetry && !isRetrying && (
        <Text
          style={[styles.manualRetryText, { color: colors.primary }]}
          onPress={onManualRetry}
        >
          Tap to retry now
        </Text>
      )}
    </View>
  );
};

/**
 * Performance-Efficient Queue Status
 * Shows payment sync queue status with optimized updates
 */
interface PerformanceEfficientQueueStatusProps {
  readonly queueSize: number;
  readonly processingRate: number; // operations per second
  readonly estimatedCompletionTime?: number; // milliseconds
  readonly priority: 'low' | 'medium' | 'high';
  readonly updateInterval: number; // milliseconds
  readonly testID: string;
}

export const PerformanceEfficientQueueStatus: React.FC<PerformanceEfficientQueueStatusProps> = ({
  queueSize,
  processingRate,
  estimatedCompletionTime,
  priority,
  updateInterval,
  testID
}) => {
  const { colorSystem: colors } = useTheme();
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Throttled updates based on provided interval
  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdate(Date.now());
    }, updateInterval);

    return () => clearInterval(timer);
  }, [updateInterval]);

  // Priority-based color scheme
  const priorityColors = useMemo(() => {
    switch (priority) {
      case 'high':
        return {
          primary: colors.status.error,
          background: colors.status.errorBackground
        };
      case 'medium':
        return {
          primary: colors.status.warning,
          background: colors.status.warningBackground
        };
      case 'low':
        return {
          primary: colors.status.info,
          background: colors.status.infoBackground
        };
    }
  }, [priority, colors]);

  // Estimated completion time formatting
  const completionTimeText = useMemo(() => {
    if (!estimatedCompletionTime || estimatedCompletionTime <= 0) return null;

    const seconds = Math.ceil(estimatedCompletionTime / 1000);
    if (seconds < 60) return `~${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `~${minutes}m ${remainingSeconds}s` : `~${minutes}m`;
  }, [estimatedCompletionTime]);

  // Processing rate display
  const processingRateText = useMemo(() => {
    if (processingRate < 0.1) return 'Processing slowly';
    if (processingRate < 1) return `${(processingRate * 60).toFixed(0)}/min`;
    return `${processingRate.toFixed(1)}/sec`;
  }, [processingRate]);

  if (queueSize === 0) return null;

  return (
    <View
      style={[
        styles.queueContainer,
        { backgroundColor: priorityColors.background }
      ]}
      testID={testID}
    >
      <View style={styles.queueHeader}>
        <Text style={styles.queueIcon}>⏳</Text>

        <View style={styles.queueInfo}>
          <Text style={[styles.queueTitle, { color: priorityColors.primary }]}>
            {queueSize} Operations Queued
          </Text>

          <Text style={[styles.queueSubtitle, { color: colors.gray[600] }]}>
            Processing at {processingRateText}
          </Text>

          {completionTimeText && (
            <Text style={[styles.queueETA, { color: colors.gray[500] }]}>
              ETA: {completionTimeText}
            </Text>
          )}
        </View>
      </View>

      {/* Priority indicator */}
      <View style={[styles.priorityIndicator, { backgroundColor: priorityColors.primary }]}>
        <Text style={styles.priorityText}>
          {priority.toUpperCase()}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Offline Indicator
  offlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.medium,
    marginVertical: spacing.xs,
  },
  offlineIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  offlineContent: {
    flex: 1,
  },
  offlineTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  offlineSubtitle: {
    fontSize: typography.caption.size,
    marginBottom: spacing.xs / 2,
  },
  lastSyncText: {
    fontSize: typography.micro.size,
  },

  // Retry Visualizer
  retryContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    backgroundColor: colorSystem.gray[50],
    marginVertical: spacing.xs,
  },
  retryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  retryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  retryIconText: {
    fontSize: 16,
  },
  retryInfo: {
    flex: 1,
  },
  retryTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  retrySubtitle: {
    fontSize: typography.caption.size,
    marginBottom: spacing.xs / 2,
  },
  countdownText: {
    fontSize: typography.micro.size,
  },
  progressTrack: {
    height: 2,
    borderRadius: 1,
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 1,
  },
  manualRetryText: {
    fontSize: typography.caption.size,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },

  // Queue Status
  queueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.medium,
    marginVertical: spacing.xs,
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  queueIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  queueInfo: {
    flex: 1,
  },
  queueTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  queueSubtitle: {
    fontSize: typography.caption.size,
    marginBottom: spacing.xs / 2,
  },
  queueETA: {
    fontSize: typography.micro.size,
  },
  priorityIndicator: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.small,
  },
  priorityText: {
    fontSize: typography.micro.size,
    color: colorSystem.white,
    fontWeight: '600',
  },
});

export {
  AdaptiveNetworkStatus,
  BatteryOptimizedOfflineIndicator,
  EfficientRetryVisualizer,
  PerformanceEfficientQueueStatus,
  NetworkPerformanceMonitor
};