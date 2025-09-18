/**
 * PaymentStatusDashboard - Complete payment status overview
 *
 * Demonstrates integration of all webhook UI components
 * Shows comprehensive payment status with crisis safety
 * Example implementation for therapeutic UX patterns
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  PaymentStatusIndicator,
  SubscriptionTierDisplay,
  PaymentErrorModal,
  GracePeriodBanner,
  WebhookLoadingStates
} from './index';
import { Card, Button } from '../core';
import { colorSystem, spacing, borderRadius, typography } from '../../constants/colors';
import { usePaymentStatus, usePaymentActions, useGracePeriodMonitoring } from '../../store/paymentStore';
import { useTheme } from '../../hooks/useTheme';
import { useCommonHaptics } from '../../hooks/useHaptics';

interface PaymentStatusDashboardProps {
  onNavigateToSettings?: () => void;
  onNavigateToSupport?: () => void;
  theme?: 'morning' | 'midday' | 'evening' | null;
  style?: any;
  testID?: string;
}

export const PaymentStatusDashboard: React.FC<PaymentStatusDashboardProps> = ({
  onNavigateToSettings,
  onNavigateToSupport,
  theme = 'evening',
  style,
  testID = 'payment-status-dashboard'
}) => {
  const { colorSystem: colors } = useTheme();
  const { onSelect } = useCommonHaptics();
  const [showPaymentError, setShowPaymentError] = useState(false);
  const [showSubscriptionDetails, setShowSubscriptionDetails] = useState(false);

  const {
    paymentError,
    isSubscriptionActive,
    subscriptionTier
  } = usePaymentStatus();

  const {
    gracePeriodStatus
  } = useGracePeriodMonitoring();

  const {
    retryFailedPayment,
    updatePaymentMethod,
    activateGracePeriod
  } = usePaymentActions();

  const handleStatusPress = async () => {
    await onSelect();
    setShowSubscriptionDetails(!showSubscriptionDetails);
  };

  const handleUpgrade = async (planId: string) => {
    await onSelect();
    // Navigate to payment flow
    console.log(`Upgrading to plan: ${planId}`);
  };

  const handleResolvePayment = async () => {
    await onSelect();
    setShowPaymentError(true);
  };

  const handleContactSupport = async () => {
    await onSelect();
    onNavigateToSupport?.();
  };

  const handleRetryPayment = async () => {
    try {
      await retryFailedPayment();
      setShowPaymentError(false);
    } catch (error) {
      console.error('Payment retry failed:', error);
    }
  };

  const handleUpdatePaymentMethod = async () => {
    await onSelect();
    // Navigate to payment method update
    console.log('Updating payment method');
  };

  const getDashboardTitle = () => {
    if (gracePeriodStatus?.active) {
      return 'Your Practice Continues Safely';
    }

    if (!isSubscriptionActive) {
      return 'Basic Mindful Access';
    }

    return `${subscriptionTier?.name || 'Premium'} Subscription`;
  };

  const getDashboardSubtitle = () => {
    if (gracePeriodStatus?.active) {
      return 'Therapeutic continuity ensures uninterrupted access to your mindful practice';
    }

    if (!isSubscriptionActive) {
      return 'Core breathing exercises and crisis support available';
    }

    return 'Full access to MBCT program and all therapeutic features';
  };

  return (
    <SafeAreaView style={[styles.container, style]} testID={testID}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Dashboard Header */}
        <View style={styles.header}>
          <Text style={[styles.dashboardTitle, { color: colors.base.black }]}>
            {getDashboardTitle()}
          </Text>
          <Text style={[styles.dashboardSubtitle, { color: colors.gray[600] }]}>
            {getDashboardSubtitle()}
          </Text>
        </View>

        {/* Real-time Processing States */}
        <WebhookLoadingStates
          showProcessingDetails={__DEV__}
          theme={theme}
        />

        {/* Grace Period Banner */}
        <GracePeriodBanner
          onResolvePayment={handleResolvePayment}
          onContactSupport={handleContactSupport}
          theme={theme}
        />

        {/* Payment Status Overview */}
        <Card theme={theme} style={styles.statusCard}>
          <Text style={[styles.sectionTitle, { color: colors.base.black }]}>
            Subscription Status
          </Text>

          <PaymentStatusIndicator
            onPress={handleStatusPress}
            theme={theme}
            showUpgradePrompt={!isSubscriptionActive}
            accessibilityLabel="View subscription status details"
          />

          {/* Crisis Safety Reassurance */}
          <View style={[styles.safetyNote, { backgroundColor: colors.status.successBackground }]}>
            <Text style={[styles.safetyText, { color: colors.status.success }]}>
              🛡️ Your therapeutic access and crisis support are always protected
            </Text>
          </View>
        </Card>

        {/* Subscription Details */}
        {showSubscriptionDetails && (
          <SubscriptionTierDisplay
            onUpgrade={handleUpgrade}
            onManageSubscription={onNavigateToSettings}
            showFeatureComparison={true}
            theme={theme}
          />
        )}

        {/* Quick Actions */}
        <Card style={styles.actionsCard}>
          <Text style={[styles.sectionTitle, { color: colors.base.black }]}>
            Account Management
          </Text>

          <View style={styles.actionButtons}>
            {onNavigateToSettings && (
              <Button
                variant="outline"
                onPress={onNavigateToSettings}
                style={styles.actionButton}
                accessibilityLabel="Manage subscription settings"
              >
                Manage Subscription
              </Button>
            )}

            {paymentError && (
              <Button
                variant="primary"
                theme="evening"
                onPress={() => setShowPaymentError(true)}
                style={styles.actionButton}
                accessibilityLabel="Resolve payment issue"
              >
                Resolve Payment Issue
              </Button>
            )}

            {onNavigateToSupport && (
              <Button
                variant="secondary"
                onPress={handleContactSupport}
                style={styles.actionButton}
                accessibilityLabel="Contact support team"
              >
                Contact Support
              </Button>
            )}
          </View>
        </Card>

        {/* Therapeutic Continuity Information */}
        <Card style={[styles.therapeuticCard, { backgroundColor: colors.status.successBackground }]}>
          <Text style={[styles.therapeuticTitle, { color: colors.status.success }]}>
            Your Wellbeing Comes First
          </Text>
          <Text style={[styles.therapeuticText, { color: colors.gray[700] }]}>
            Payment issues never interrupt your access to:
          </Text>

          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Text style={[styles.featureBullet, { color: colors.status.success }]}>•</Text>
              <Text style={[styles.featureText, { color: colors.gray[700] }]}>
                3-minute breathing exercises
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={[styles.featureBullet, { color: colors.status.success }]}>•</Text>
              <Text style={[styles.featureText, { color: colors.gray[700] }]}>
                Daily check-ins and mood tracking
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={[styles.featureBullet, { color: colors.status.success }]}>•</Text>
              <Text style={[styles.featureText, { color: colors.gray[700] }]}>
                Crisis support and emergency resources
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={[styles.featureBullet, { color: colors.status.success }]}>•</Text>
              <Text style={[styles.featureText, { color: colors.gray[700] }]}>
                Core mindfulness practices
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      {/* Payment Error Modal */}
      <PaymentErrorModal
        visible={showPaymentError}
        onClose={() => setShowPaymentError(false)}
        onRetryPayment={handleRetryPayment}
        onUpdatePaymentMethod={handleUpdatePaymentMethod}
        onContactSupport={handleContactSupport}
        error={paymentError}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  header: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  dashboardTitle: {
    fontSize: typography.headline2.size,
    fontWeight: typography.headline2.weight,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  dashboardSubtitle: {
    fontSize: typography.bodyRegular.size,
    lineHeight: 22,
    textAlign: 'center',
  },
  statusCard: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    marginBottom: spacing.md,
  },
  safetyNote: {
    padding: spacing.sm,
    borderRadius: borderRadius.medium,
    marginTop: spacing.md,
  },
  safetyText: {
    fontSize: typography.bodyRegular.size,
    textAlign: 'center',
    fontWeight: '500',
  },
  actionsCard: {
    marginBottom: spacing.lg,
  },
  actionButtons: {
    gap: spacing.sm,
  },
  actionButton: {
    marginBottom: 0,
  },
  therapeuticCard: {
    marginBottom: spacing.xl,
  },
  therapeuticTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  therapeuticText: {
    fontSize: typography.bodyRegular.size,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  featureList: {
    gap: spacing.xs,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  featureBullet: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    marginRight: spacing.sm,
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    fontSize: typography.bodyRegular.size,
    lineHeight: 22,
  },
});

export default PaymentStatusDashboard;