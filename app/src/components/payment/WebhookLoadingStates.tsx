/**
 * WebhookLoadingStates - Real-time loading states for webhook processing
 *
 * Shows loading, processing, and status updates for webhook events
 * Maintains crisis safety during payment processing with <200ms requirements
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { Card } from '../core';
import { colorSystem, spacing, borderRadius, typography } from '../../constants/colors';
import { usePaymentStatus, useGracePeriodMonitoring, useWebhookProcessing } from '../../store/paymentStore';
import { useTheme } from '../../hooks/useTheme';

export interface WebhookLoadingStatesProps {
  readonly showProcessingDetails?: boolean;
  readonly compact?: boolean;
  readonly theme?: 'morning' | 'midday' | 'evening' | null;
  readonly style?: ViewStyle | ViewStyle[];
  readonly testID: string; // Required for comprehensive testing

  // Performance monitoring (crisis safety requirements)
  readonly performanceThreshold?: number; // Default: 200ms
  readonly crisisPerformanceThreshold?: number; // Default: 100ms
  readonly onPerformanceViolation?: (violation: PerformanceViolation) => void;

  // Crisis safety and therapeutic access
  readonly crisisMode?: boolean;
  readonly prioritizeTherapeuticAccess?: boolean;
  readonly emergencyFallback?: () => void;

  // Accessibility and announcements
  readonly accessibilityLabel: string; // Required for real-time updates
  readonly accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';
  readonly announceUpdates?: boolean; // Screen reader announcements
  readonly importantForAccessibility?: 'auto' | 'yes' | 'no' | 'no-hide-descendants';
}

interface PerformanceViolation {
  readonly component: string;
  readonly operation: string;
  readonly duration: number;
  readonly threshold: number;
  readonly timestamp: string;
  readonly crisisMode: boolean;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

interface ProcessingState {
  type: 'idle' | 'processing' | 'success' | 'error' | 'crisis-override';
  message: string;
  subMessage?: string;
  duration?: number;
  therapeutic?: boolean;
}

export const WebhookLoadingStates: React.FC<WebhookLoadingStatesProps> = ({
  showProcessingDetails = true,
  compact = false,
  theme = null,
  style,
  testID,
  performanceThreshold = 200,
  crisisPerformanceThreshold = 100,
  onPerformanceViolation,
  crisisMode = false,
  prioritizeTherapeuticAccess = true,
  emergencyFallback,
  accessibilityLabel,
  accessibilityLiveRegion = 'polite',
  announceUpdates = true,
  importantForAccessibility = 'yes'
}) => {
  const { colorSystem: colors } = useTheme();
  const [processingState, setProcessingState] = useState<ProcessingState>({ type: 'idle', message: '' });
  const [fadeAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [startTime, setStartTime] = useState<number | null>(null);

  const {
    paymentError
  } = usePaymentStatus();

  const {
    gracePeriodStatus
  } = useGracePeriodMonitoring();

  const webhookStatus = useWebhookProcessing();

  // Extract webhook processing state
  const isWebhookProcessing = webhookStatus.isProcessing || false;
  const isPaymentProcessing = false; // Will be derived from webhook status
  const webhookProcessingStatus = webhookStatus.lastEventType || null;
  const lastWebhookEvent = webhookStatus.lastEventProcessed ? {
    type: webhookStatus.lastEventType,
    processed_at: webhookStatus.lastEventProcessed
  } : null;

  // Monitor webhook processing state
  useEffect(() => {
    const updateProcessingState = () => {
      // Crisis override: Always prioritize therapeutic access
      if (gracePeriodStatus?.active && gracePeriodStatus.therapeuticContinuity) {
        setProcessingState({
          type: 'crisis-override',
          message: 'Therapeutic Access Protected',
          subMessage: 'Processing continues safely in background',
          therapeutic: true
        });
        return;
      }

      // Payment processing states
      if (isPaymentProcessing) {
        setProcessingState({
          type: 'processing',
          message: 'Processing Payment',
          subMessage: 'Your therapeutic access remains uninterrupted',
          therapeutic: true
        });
        return;
      }

      // Webhook processing states
      if (isWebhookProcessing) {
        const webhookMessage = getWebhookMessage(webhookProcessingStatus);
        setProcessingState({
          type: 'processing',
          message: webhookMessage.title,
          subMessage: webhookMessage.subtitle,
          therapeutic: webhookMessage.therapeutic
        });
        return;
      }

      // Error states
      if (paymentError?.severity === 'critical') {
        setProcessingState({
          type: 'error',
          message: 'Payment Issue Detected',
          subMessage: 'Your mindful practice continues safely',
          therapeutic: true
        });
        return;
      }

      // Success states
      if (lastWebhookEvent && Date.now() - new Date(lastWebhookEvent.processed_at || 0).getTime() < 5000) {
        const successMessage = getSuccessMessage(lastWebhookEvent.type);
        setProcessingState({
          type: 'success',
          message: successMessage.title,
          subMessage: successMessage.subtitle,
          duration: 3000
        });
        return;
      }

      // Idle state
      setProcessingState({ type: 'idle', message: '' });
    };

    updateProcessingState();
    const interval = setInterval(updateProcessingState, 500); // 500ms polling for real-time updates

    return () => clearInterval(interval);
  }, [
    isPaymentProcessing,
    isWebhookProcessing,
    webhookProcessingStatus,
    gracePeriodStatus,
    paymentError,
    lastWebhookEvent
  ]);

  // Animate visibility
  useEffect(() => {
    if (processingState.type !== 'idle') {
      setStartTime(Date.now());
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Auto-hide success states
      if (processingState.type === 'success' && processingState.duration) {
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }, processingState.duration);
      }
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [processingState.type]);

  // Pulse animation for processing states
  useEffect(() => {
    if (processingState.type === 'processing') {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.7,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      return () => pulseAnimation.stop();
    }
  }, [processingState.type]);

  const getWebhookMessage = (status: any) => {
    if (!status) {
      return {
        title: 'Processing Update',
        subtitle: 'Updating subscription status',
        therapeutic: false
      };
    }

    switch (status.type) {
      case 'subscription.created':
      case 'subscription.updated':
        return {
          title: 'Updating Subscription',
          subtitle: 'Your access is being configured',
          therapeutic: false
        };

      case 'invoice.payment_succeeded':
        return {
          title: 'Payment Successful',
          subtitle: 'Activating your subscription',
          therapeutic: false
        };

      case 'invoice.payment_failed':
        return {
          title: 'Payment Processing',
          subtitle: 'Activating therapeutic continuity',
          therapeutic: true
        };

      case 'customer.subscription.deleted':
        return {
          title: 'Subscription Update',
          subtitle: 'Maintaining core access safely',
          therapeutic: true
        };

      default:
        return {
          title: 'Processing Update',
          subtitle: 'Your access remains protected',
          therapeutic: true
        };
    }
  };

  const getSuccessMessage = (eventType: string) => {
    switch (eventType) {
      case 'invoice.payment_succeeded':
        return {
          title: 'Payment Successful',
          subtitle: 'Subscription activated'
        };

      case 'subscription.created':
      case 'subscription.updated':
        return {
          title: 'Subscription Updated',
          subtitle: 'Access configured successfully'
        };

      case 'customer.subscription.deleted':
        return {
          title: 'Subscription Changed',
          subtitle: 'Core access maintained'
        };

      default:
        return {
          title: 'Update Complete',
          subtitle: 'Status synchronized'
        };
    }
  };

  const getStateInfo = () => {
    switch (processingState.type) {
      case 'processing':
        return {
          color: colors.status.info,
          backgroundColor: colors.status.infoBackground,
          icon: null, // Uses ActivityIndicator
          showSpinner: true
        };

      case 'success':
        return {
          color: colors.status.success,
          backgroundColor: colors.status.successBackground,
          icon: '✓',
          showSpinner: false
        };

      case 'error':
        return {
          color: colors.status.error,
          backgroundColor: colors.status.errorBackground,
          icon: '⚠️',
          showSpinner: false
        };

      case 'crisis-override':
        return {
          color: colors.status.success,
          backgroundColor: colors.status.successBackground,
          icon: '🛡️',
          showSpinner: false
        };

      default:
        return {
          color: colors.gray[600],
          backgroundColor: colors.gray[100],
          icon: '',
          showSpinner: false
        };
    }
  };

  const stateInfo = getStateInfo();

  // Calculate processing duration for performance monitoring
  const getProcessingDuration = () => {
    if (!startTime || processingState.type === 'idle') return null;
    const duration = Date.now() - startTime;
    return duration;
  };

  const processingDuration = getProcessingDuration();

  // Don't render if idle
  if (processingState.type === 'idle') {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim },
        style
      ]}
      testID={testID}
    >
      <Card
        style={[
          styles.loadingCard,
          { backgroundColor: stateInfo.backgroundColor },
          compact && styles.compactCard
        ]}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            {stateInfo.showSpinner ? (
              <Animated.View style={{ opacity: pulseAnim }}>
                <ActivityIndicator
                  size="small"
                  color={stateInfo.color}
                />
              </Animated.View>
            ) : (
              <Text style={styles.stateIcon}>{stateInfo.icon}</Text>
            )}
          </View>

          <View style={styles.messageContainer}>
            <Text style={[styles.primaryMessage, { color: stateInfo.color }]}>
              {processingState.message}
            </Text>

            {processingState.subMessage && !compact && (
              <Text style={[styles.subMessage, { color: colors.gray[600] }]}>
                {processingState.subMessage}
              </Text>
            )}

            {processingState.therapeutic && (
              <Text style={[styles.therapeuticBadge, { color: colors.status.success }]}>
                🛡️ Therapeutic access protected
              </Text>
            )}
          </View>

          {/* Performance indicator for development */}
          {showProcessingDetails && processingDuration && processingDuration > 200 && (
            <View style={styles.performanceIndicator}>
              <Text style={[styles.performanceText, { color: colors.gray[500] }]}>
                {processingDuration}ms
              </Text>
            </View>
          )}
        </View>

        {/* Progress bar for longer operations */}
        {processingState.type === 'processing' && !compact && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressTrack, { backgroundColor: colors.gray[200] }]}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: stateInfo.color,
                    opacity: pulseAnim
                  }
                ]}
              />
            </View>
          </View>
        )}
      </Card>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  loadingCard: {
    borderWidth: 1,
    borderColor: 'transparent',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  compactCard: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  stateIcon: {
    fontSize: 16,
  },
  messageContainer: {
    flex: 1,
  },
  primaryMessage: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '500',
    lineHeight: 20,
  },
  subMessage: {
    fontSize: typography.caption.size,
    lineHeight: 16,
    marginTop: spacing.xs / 2,
  },
  therapeuticBadge: {
    fontSize: typography.micro.size,
    fontWeight: '500',
    marginTop: spacing.xs / 2,
  },
  performanceIndicator: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    backgroundColor: colorSystem.gray[200],
    borderRadius: borderRadius.small,
  },
  performanceText: {
    fontSize: typography.micro.size,
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: spacing.sm,
  },
  progressTrack: {
    height: 2,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '100%',
    borderRadius: 1,
  },
});