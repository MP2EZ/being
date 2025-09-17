/**
 * PaymentStatusIndicator - Visual indicator for subscription status
 *
 * Shows current subscription tier, payment status, and renewal information
 * with therapeutic-appropriate messaging and crisis safety integration
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from '../core';
import { colorSystem, spacing, borderRadius, typography } from '../../constants/colors';
import { usePaymentStatus, paymentSelectors, usePaymentStore } from '../../store/paymentStore';
import { useTheme } from '../../hooks/useTheme';
import { useCommonHaptics } from '../../hooks/useHaptics';

export interface PaymentStatusIndicatorProps {
  readonly onPress?: (() => void) | (() => Promise<void>);
  readonly theme?: 'morning' | 'midday' | 'evening' | null;
  readonly showUpgradePrompt?: boolean;
  readonly compact?: boolean;
  readonly style?: ViewStyle | ViewStyle[];
  readonly accessibilityLabel: string; // Required for payment components
  readonly accessibilityHint?: string;
  readonly accessibilityRole?: 'button' | 'text';
  readonly accessibilityState?: {
    readonly disabled?: boolean;
    readonly selected?: boolean;
    readonly busy?: boolean;
  };
  readonly testID: string; // Required for comprehensive testing

  // Crisis safety constraints
  readonly crisisMode?: boolean;
  readonly maxResponseTimeMs?: number; // Default: 200ms
  readonly onPerformanceViolation?: (duration: number, operation: string) => void;
}

export const PaymentStatusIndicator: React.FC<PaymentStatusIndicatorProps> = ({
  onPress,
  theme = null,
  showUpgradePrompt = true,
  compact = false,
  style,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  accessibilityState,
  testID,
  crisisMode = false,
  maxResponseTimeMs = 200,
  onPerformanceViolation
}) => {
  const { colorSystem: colors } = useTheme();
  const { onSelect } = useCommonHaptics();

  const store = usePaymentStore();
  const {
    subscriptionStatus,
    subscriptionTier,
    isSubscriptionActive,
    paymentError,
    gracePeriodInfo
  } = usePaymentStatus();

  const gracePeriodStatus = paymentSelectors.getGracePeriodStatus(store);

  const handlePress = async () => {
    if (onPress) {
      const startTime = Date.now();
      await onSelect();

      try {
        await onPress();

        // Performance monitoring for crisis safety
        const duration = Date.now() - startTime;
        if (duration > maxResponseTimeMs && onPerformanceViolation) {
          onPerformanceViolation(duration, 'payment-status-press');
        }
      } catch (error) {
        console.error('PaymentStatusIndicator press error:', error);
      }
    }
  };

  const getStatusInfo = () => {
    // Crisis safety: Always allow therapeutic access
    if (gracePeriodStatus?.active) {
      return {
        status: 'grace-period',
        title: 'Therapeutic Continuity Active',
        subtitle: `${gracePeriodStatus.daysRemainingFormatted || 'Days'} of continued access`,
        color: colors.status.warning,
        backgroundColor: colors.status.warningBackground,
        icon: '🛡️',
        therapeutic: true
      };
    }

    if (!isSubscriptionActive) {
      return {
        status: 'inactive',
        title: 'Basic Access',
        subtitle: 'Core breathing exercises available',
        color: colors.gray[600],
        backgroundColor: colors.gray[100],
        icon: '🌱',
        therapeutic: true
      };
    }

    if (paymentError?.severity === 'critical') {
      return {
        status: 'payment-issue',
        title: 'Payment Attention Needed',
        subtitle: 'Your mindful practice continues safely',
        color: colors.status.error,
        backgroundColor: colors.status.errorBackground,
        icon: '💳',
        therapeutic: true
      };
    }

    // Active subscription
    const tierName = subscriptionTier?.name || 'Premium';
    return {
      status: 'active',
      title: `${tierName} Active`,
      subtitle: subscriptionStatus?.nextBilling
        ? `Renews ${new Date(subscriptionStatus.nextBilling).toLocaleDateString()}`
        : 'Active subscription',
      color: colors.status.success,
      backgroundColor: colors.status.successBackground,
      icon: '✨',
      therapeutic: false
    };
  };

  const statusInfo = getStatusInfo();
  const isClickable = !!onPress && !compact;

  const StatusContent = () => (
    <View style={[
      styles.container,
      compact && styles.compactContainer,
      { backgroundColor: statusInfo.backgroundColor }
    ]}>
      <View style={styles.iconContainer}>
        <Text style={styles.statusIcon}>{statusInfo.icon}</Text>
      </View>

      <View style={styles.statusContent}>
        <Text
          style={[
            styles.statusTitle,
            { color: statusInfo.color },
            compact && styles.compactTitle
          ]}
          allowFontScaling={true}
          maxFontSizeMultiplier={1.5}
        >
          {statusInfo.title}
        </Text>

        {!compact && (
          <Text
            style={[styles.statusSubtitle, { color: colors.gray[600] }]}
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
          >
            {statusInfo.subtitle}
          </Text>
        )}
      </View>

      {isClickable && (
        <View style={styles.actionIndicator}>
          <Text style={[styles.actionText, { color: statusInfo.color }]}>
            →
          </Text>
        </View>
      )}

      {/* Upgrade prompt for basic users */}
      {showUpgradePrompt && statusInfo.status === 'inactive' && !compact && (
        <View style={styles.upgradePrompt}>
          <Text style={[styles.upgradeText, { color: colors.status.info }]}>
            Unlock guided practices
          </Text>
        </View>
      )}
    </View>
  );

  const accessibilityProps = {
    accessible: true,
    accessibilityRole: accessibilityRole || (isClickable ? 'button' as const : 'text' as const),
    accessibilityLabel: accessibilityLabel || `${statusInfo.title}. ${statusInfo.subtitle}${statusInfo.therapeutic ? '. Your therapeutic access is protected.' : ''}`,
    accessibilityHint: accessibilityHint || (isClickable ? 'Tap to view subscription details' : undefined),
    accessibilityState: accessibilityState || {
      disabled: false,
      selected: false,
      busy: false
    },
    testID
  };

  if (isClickable) {
    return (
      <TouchableOpacity
        style={[styles.touchableContainer, style]}
        onPress={handlePress}
        activeOpacity={0.8}
        {...accessibilityProps}
      >
        <StatusContent />
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.staticContainer, style]} {...accessibilityProps}>
      <StatusContent />
    </View>
  );
};

const styles = StyleSheet.create({
  touchableContainer: {
    borderRadius: borderRadius.large,
    overflow: 'hidden',
  },
  staticContainer: {
    borderRadius: borderRadius.large,
    overflow: 'hidden',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 72, // WCAG AA touch target
  },
  compactContainer: {
    padding: spacing.sm,
    minHeight: 48,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.medium,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  statusIcon: {
    fontSize: 20,
  },
  statusContent: {
    flex: 1,
    marginRight: spacing.xs,
  },
  statusTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
    lineHeight: 20,
  },
  compactTitle: {
    fontSize: typography.caption.size,
    marginBottom: 0,
  },
  statusSubtitle: {
    fontSize: typography.caption.size,
    lineHeight: 18,
  },
  actionIndicator: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 18,
    fontWeight: '600',
  },
  upgradePrompt: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colorSystem.status.infoBackground,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.small,
  },
  upgradeText: {
    fontSize: typography.micro.size,
    fontWeight: '500',
  },
});