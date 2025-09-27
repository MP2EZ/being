/**
 * GracePeriodBanner - Therapeutic messaging during grace periods
 *
 * Shows grace period status with calming, supportive messaging
 * Maintains MBCT-appropriate language and crisis safety
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Card, Button } from '../core';
import { colorSystem, spacing, borderRadius, typography } from '../../constants/colors';
import { useGracePeriodMonitoring } from '../../store/paymentStore';
import { useTheme } from '../../hooks/useTheme';
import { useCommonHaptics } from '../../hooks/useHaptics';

export interface GracePeriodBannerProps {
  onResolvePayment?: () => void;
  onContactSupport?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
  showActions?: boolean;
  theme?: 'morning' | 'midday' | 'evening' | null;
  style?: any;
  testID?: string;
}

export const GracePeriodBanner: React.FC<GracePeriodBannerProps> = ({
  onResolvePayment,
  onContactSupport,
  onDismiss,
  compact = false,
  showActions = true,
  theme = 'evening',
  style,
  testID = 'grace-period-banner'
}) => {
  const { colorSystem: colors } = useTheme();
  const { onSelect } = useCommonHaptics();
  const [isExpanded, setIsExpanded] = useState(false);
  const [dismissAnimation] = useState(new Animated.Value(1));

  const {
    gracePeriodStatus,
    gracePeriodActive
  } = useGracePeriodMonitoring();

  // Don't render if no grace period active
  if (!gracePeriodStatus?.active) {
    return null;
  }

  const handleResolvePayment = async () => {
    await onSelect();
    onResolvePayment?.();
  };

  const handleContactSupport = async () => {
    await onSelect();
    onContactSupport?.();
  };

  const handleDismiss = async () => {
    await onSelect();

    Animated.timing(dismissAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onDismiss?.();
    });
  };

  const handleToggleExpanded = async () => {
    await onSelect();
    setIsExpanded(!isExpanded);
  };

  const getGracePeriodMessage = () => {
    const daysRemaining = gracePeriodStatus.daysRemaining || 0;
    const reason = gracePeriodStatus?.reason || 'payment_issue';

    if (daysRemaining <= 1) {
      return {
        title: 'Final Day of Therapeutic Continuity',
        message: 'Your mindful practice continues today. Please resolve payment to maintain access.',
        urgency: 'high' as const,
        therapeutic: 'Your wellbeing remains our priority. Take time to breathe and address this mindfully.'
      };
    }

    if (daysRemaining <= 3) {
      return {
        title: 'Therapeutic Continuity Active',
        message: `${daysRemaining} days remaining to resolve payment while maintaining full access.`,
        urgency: 'medium' as const,
        therapeutic: 'Practice continues uninterrupted. You have space to address payment calmly.'
      };
    }

    return {
      title: 'Therapeutic Continuity Activated',
      message: `${daysRemaining} days of uninterrupted access while resolving payment.`,
      urgency: 'low' as const,
      therapeutic: 'Your mindful journey continues safely. No rush - address payment when ready.'
    };
  };

  const messageInfo = getGracePeriodMessage();

  const getUrgencyColor = () => {
    switch (messageInfo.urgency) {
      case 'high':
        return colors.status.error;
      case 'medium':
        return colors.status.warning;
      case 'low':
        return colors.status.success;
      default:
        return colors.status.info;
    }
  };

  const getUrgencyBackground = () => {
    switch (messageInfo.urgency) {
      case 'high':
        return colors.status.errorBackground;
      case 'medium':
        return colors.status.warningBackground;
      case 'low':
        return colors.status.successBackground;
      default:
        return colors.status.infoBackground;
    }
  };

  const getProgressWidth = () => {
    const totalDays = 7; // Standard grace period
    const daysRemaining = gracePeriodStatus.daysRemaining || 0;
    const progressPercent = Math.max(0, (daysRemaining / totalDays) * 100);
    return `${progressPercent}%`;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: dismissAnimation },
        style
      ]}
      testID={testID}
    >
      <Card
        style={[
          styles.bannerCard,
          { backgroundColor: getUrgencyBackground() },
          compact && styles.compactCard
        ]}
      >
        {/* Header Section */}
        <TouchableOpacity
          style={styles.headerSection}
          onPress={compact ? undefined : handleToggleExpanded}
          activeOpacity={compact ? 1 : 0.8}
          accessible={true}
          accessibilityRole={compact ? 'text' : 'button'}
          accessibilityLabel={`${messageInfo.title}. ${messageInfo.message}. ${messageInfo.therapeutic}`}
          accessibilityHint={compact ? undefined : 'Tap to expand grace period details'}
          accessibilityState={{ expanded: isExpanded }}
        >
          <View style={styles.headerContent}>
            <View style={styles.iconContainer}>
              <Text style={styles.protectionIcon}>🛡️</Text>
            </View>

            <View style={styles.messageContent}>
              <Text style={[styles.bannerTitle, { color: getUrgencyColor() }]}>
                {messageInfo.title}
              </Text>

              <Text style={[styles.bannerMessage, { color: colors.gray[700] }]}>
                {messageInfo.message}
              </Text>

              {!compact && (
                <Text style={[styles.therapeuticMessage, { color: colors.gray[600] }]}>
                  {messageInfo.therapeutic}
                </Text>
              )}
            </View>

            {onDismiss && (
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={handleDismiss}
                accessibilityLabel="Dismiss grace period banner"
                accessibilityRole="button"
              >
                <Text style={[styles.dismissIcon, { color: colors.gray[500] }]}>
                  ×
                </Text>
              </TouchableOpacity>
            )}

            {!compact && (
              <TouchableOpacity
                style={styles.expandButton}
                onPress={handleToggleExpanded}
                accessibilityLabel={isExpanded ? 'Collapse details' : 'Expand details'}
                accessibilityRole="button"
              >
                <Text style={[styles.expandIcon, { color: getUrgencyColor() }]}>
                  {isExpanded ? '−' : '+'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressTrack, { backgroundColor: colors.gray[200] }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: getUrgencyColor(),
                  width: getProgressWidth()
                }
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.gray[600] }]}>
            {gracePeriodStatus.daysRemainingFormatted} remaining
          </Text>
        </View>

        {/* Expanded Content */}
        {isExpanded && !compact && (
          <View style={styles.expandedContent}>
            {/* Grace Period Details */}
            <View style={styles.detailsSection}>
              <Text style={[styles.detailsTitle, { color: colors.base.black }]}>
                What this means:
              </Text>
              <View style={styles.detailsList}>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailBullet, { color: colors.status.success }]}>✓</Text>
                  <Text style={[styles.detailText, { color: colors.gray[700] }]}>
                    Full access to all therapeutic features
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailBullet, { color: colors.status.success }]}>✓</Text>
                  <Text style={[styles.detailText, { color: colors.gray[700] }]}>
                    Crisis support remains available 24/7
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailBullet, { color: colors.status.success }]}>✓</Text>
                  <Text style={[styles.detailText, { color: colors.gray[700] }]}>
                    Your progress and data are safely preserved
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailBullet, { color: colors.status.success }]}>✓</Text>
                  <Text style={[styles.detailText, { color: colors.gray[700] }]}>
                    No interruption to your mindful practice
                  </Text>
                </View>
              </View>
            </View>

            {/* Actions Section */}
            {showActions && (
              <View style={styles.actionsSection}>
                <Text style={[styles.actionsTitle, { color: colors.base.black }]}>
                  Ready to resolve?
                </Text>

                <View style={styles.actionButtons}>
                  {onResolvePayment && (
                    <Button
                      variant="primary"
                      theme={theme}
                      onPress={handleResolvePayment}
                      style={styles.actionButton}
                      accessibilityLabel="Resolve payment issue"
                    >
                      Resolve Payment
                    </Button>
                  )}

                  {onContactSupport && (
                    <Button
                      variant="outline"
                      onPress={handleContactSupport}
                      style={styles.actionButton}
                      accessibilityLabel="Contact support for help"
                    >
                      Get Help
                    </Button>
                  )}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Compact Actions */}
        {compact && showActions && (
          <View style={styles.compactActions}>
            {onResolvePayment && (
              <TouchableOpacity
                style={[styles.compactActionButton, { borderColor: getUrgencyColor() }]}
                onPress={handleResolvePayment}
                accessibilityLabel="Resolve payment"
                accessibilityRole="button"
              >
                <Text style={[styles.compactActionText, { color: getUrgencyColor() }]}>
                  Resolve
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Card>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  bannerCard: {
    borderWidth: 1,
    borderColor: 'transparent',
  },
  compactCard: {
    paddingVertical: spacing.sm,
  },
  headerSection: {
    flex: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  protectionIcon: {
    fontSize: 20,
  },
  messageContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  bannerTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
    lineHeight: 22,
  },
  bannerMessage: {
    fontSize: typography.bodyRegular.size,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  therapeuticMessage: {
    fontSize: typography.caption.size,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  dismissButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  dismissIcon: {
    fontSize: 20,
    fontWeight: '300',
  },
  expandButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandIcon: {
    fontSize: 18,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginRight: spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    minWidth: 8,
  },
  progressText: {
    fontSize: typography.micro.size,
    fontWeight: '500',
    minWidth: 80,
    textAlign: 'right',
  },
  expandedContent: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colorSystem.gray[200],
  },
  detailsSection: {
    marginBottom: spacing.md,
  },
  detailsTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  detailsList: {
    gap: spacing.xs,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailBullet: {
    fontSize: typography.caption.size,
    fontWeight: '600',
    marginRight: spacing.sm,
    marginTop: 2,
  },
  detailText: {
    flex: 1,
    fontSize: typography.caption.size,
    lineHeight: 18,
  },
  actionsSection: {
    marginTop: spacing.sm,
  },
  actionsTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  actionButtons: {
    gap: spacing.sm,
  },
  actionButton: {
    marginBottom: 0,
  },
  compactActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  compactActionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
  },
  compactActionText: {
    fontSize: typography.caption.size,
    fontWeight: '500',
  },
});