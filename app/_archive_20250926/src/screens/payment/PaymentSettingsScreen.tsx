/**
 * Payment Settings Screen - Subscription Management with Crisis Safety
 *
 * CLINICAL REQUIREMENTS:
 * - MBCT-compliant subscription management
 * - Non-judgmental approach to subscription changes
 * - Crisis safety integration for financial stress
 * - Therapeutic continuity assurance during changes
 *
 * BUSINESS REQUIREMENTS:
 * - Transparent subscription management
 * - Clear cancellation/pause options
 * - Upgrade/downgrade flows with guidance
 * - Retention strategies aligned with therapeutic values
 *
 * PERFORMANCE REQUIREMENTS:
 * - Screen load time <500ms
 * - Settings changes processed within 2 seconds
 * - Crisis button response <200ms
 * - Real-time subscription status updates
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Switch,
  Linking,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  usePaymentStore,
  usePaymentActions,
  usePaymentStatus,
  useCrisisPaymentSafety,
  useSubscriptionManagement,
  useTrialManagement
} from '../../store';
import { CrisisButton, Card, Button, LoadingScreen } from '../../components/core';
import { colorSystem, spacing, typography } from '../../constants/colors';

interface SubscriptionChangeOption {
  id: string;
  title: string;
  description: string;
  therapeuticRationale: string;
  action: 'upgrade' | 'downgrade' | 'pause' | 'cancel';
  impact: 'positive' | 'neutral' | 'caution';
  crisisSafe: boolean;
}

const SUBSCRIPTION_OPTIONS: SubscriptionChangeOption[] = [
  {
    id: 'upgrade_annual',
    title: 'Upgrade to Annual Commitment',
    description: 'Deepen your practice with long-term therapeutic commitment and savings',
    therapeuticRationale: 'Annual commitment can support sustained therapeutic progress and reduced financial stress through savings',
    action: 'upgrade',
    impact: 'positive',
    crisisSafe: true
  },
  {
    id: 'pause_subscription',
    title: 'Pause Subscription',
    description: 'Temporarily pause billing while maintaining basic crisis support access',
    therapeuticRationale: 'Sometimes life requires a pause. Your therapeutic tools will be here when you\'re ready to return',
    action: 'pause',
    impact: 'neutral',
    crisisSafe: true
  },
  {
    id: 'downgrade_basic',
    title: 'Switch to Foundation Plan',
    description: 'Reduce to essential features while maintaining therapeutic safety net',
    therapeuticRationale: 'Scaling back can reduce financial stress while preserving access to core mindfulness tools',
    action: 'downgrade',
    impact: 'caution',
    crisisSafe: true
  },
  {
    id: 'cancel_subscription',
    title: 'Cancel Subscription',
    description: 'End subscription while preserving crisis support and basic safety tools',
    therapeuticRationale: 'Ending subscription doesn\'t end your therapeutic journey. Crisis support remains available always',
    action: 'cancel',
    impact: 'caution',
    crisisSafe: true
  }
];

const PaymentSettingsScreen: React.FC = () => {
  const navigation = useNavigation();

  // Store integration
  const {
    customer,
    activeSubscription,
    paymentMethods,
    availablePlans
  } = usePaymentStore();

  const {
    updateSubscription,
    cancelSubscription,
    reactivateSubscription,
    loadPaymentMethods
  } = usePaymentActions();

  const {
    subscriptionStatus,
    featureAccess,
    crisisMode,
    isLoading
  } = usePaymentStatus();

  const {
    crisisOverride,
    enableCrisisMode,
    performanceMetrics
  } = useCrisisPaymentSafety();

  // Component state
  const [isProcessingChange, setIsProcessingChange] = useState(false);
  const [showCancellationFlow, setShowCancellationFlow] = useState(false);
  const [showFinancialSupport, setShowFinancialSupport] = useState(false);
  const [autoRenewalEnabled, setAutoRenewalEnabled] = useState(true);
  const [billingEmailNotifications, setBillingEmailNotifications] = useState(true);
  const [pauseUntilDate, setPauseUntilDate] = useState<Date | null>(null);

  useEffect(() => {
    initializeSettings();
  }, []);

  useEffect(() => {
    // Monitor for financial stress indicators
    if (activeSubscription?.status === 'past_due' || activeSubscription?.status === 'unpaid') {
      setShowFinancialSupport(true);
      announceForScreenReader('Financial support options are available if you need assistance with your subscription.');
    }
  }, [activeSubscription]);

  const initializeSettings = async () => {
    try {
      await loadPaymentMethods();

      // Set current subscription settings
      if (activeSubscription) {
        setAutoRenewalEnabled(!activeSubscription.cancelAtPeriodEnd);
      }

    } catch (error) {
      console.error('Failed to initialize payment settings:', error);
    }
  };

  const announceForScreenReader = (message: string) => {
    AccessibilityInfo.announceForAccessibility(message);
  };

  const handleSubscriptionChange = useCallback(async (option: SubscriptionChangeOption) => {
    // Show therapeutic guidance before any subscription change
    Alert.alert(
      'Mindful Subscription Change',
      `${option.therapeuticRationale}\n\nThis change feels right for you right now, and that's what matters. Your therapeutic journey continues regardless of subscription level.`,
      [
        { text: 'I need more time', style: 'cancel' },
        {
          text: 'Continue mindfully',
          onPress: () => processSubscriptionChange(option)
        }
      ]
    );
  }, []);

  const processSubscriptionChange = async (option: SubscriptionChangeOption) => {
    setIsProcessingChange(true);

    try {
      switch (option.action) {
        case 'upgrade':
          await handleUpgrade(option);
          break;
        case 'downgrade':
          await handleDowngrade(option);
          break;
        case 'pause':
          await handlePause(option);
          break;
        case 'cancel':
          await handleCancellation(option);
          break;
      }

      announceForScreenReader(`Subscription ${option.action} completed successfully. Your therapeutic access has been updated.`);

    } catch (error) {
      console.error(`Subscription ${option.action} failed:`, error);
      handleSubscriptionError(error, option);
    } finally {
      setIsProcessingChange(false);
    }
  };

  const handleUpgrade = async (option: SubscriptionChangeOption) => {
    // Navigate to subscription selection with upgrade context
    (navigation as any).navigate('SubscriptionScreen', {
      upgradeContext: true,
      currentPlan: activeSubscription?.plan
    });
  };

  const handleDowngrade = async (option: SubscriptionChangeOption) => {
    if (!activeSubscription) return;

    const confirmDowngrade = await new Promise<boolean>(resolve => {
      Alert.alert(
        'Confirm Plan Change',
        'You\'ll retain full access until your current billing period ends, then transition to the Foundation plan. Crisis support remains free always.',
        [
          { text: 'Keep Current Plan', onPress: () => resolve(false) },
          { text: 'Confirm Change', onPress: () => resolve(true) }
        ]
      );
    });

    if (confirmDowngrade) {
      await updateSubscription({
        ...activeSubscription,
        plan: availablePlans.find(p => p.planId === 'being_free_trial') || activeSubscription.plan,
        cancelAtPeriodEnd: false // Continue with new plan
      });

      Alert.alert(
        'Plan Updated',
        'Your subscription will change to the Foundation plan at the end of your current billing period. You\'ll maintain full access until then.',
        [{ text: 'Got it' }]
      );
    }
  };

  const handlePause = async (option: SubscriptionChangeOption) => {
    // Show pause duration options
    Alert.alert(
      'Pause Duration',
      'How long would you like to pause your subscription?',
      [
        { text: '1 Month', onPress: () => pauseSubscription(30) },
        { text: '3 Months', onPress: () => pauseSubscription(90) },
        { text: '6 Months', onPress: () => pauseSubscription(180) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const pauseSubscription = async (days: number) => {
    if (!activeSubscription) return;

    const pauseUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    setPauseUntilDate(pauseUntil);

    // In production, would call pause API
    Alert.alert(
      'Subscription Paused',
      `Your subscription is paused until ${pauseUntil.toLocaleDateString()}. Crisis support and basic tools remain available during the pause.`,
      [{ text: 'Thanks' }]
    );
  };

  const handleCancellation = async (option: SubscriptionChangeOption) => {
    setShowCancellationFlow(true);
  };

  const processCancellation = async (immediate: boolean = false) => {
    if (!activeSubscription) return;

    // Show retention offer with therapeutic framing
    const showRetention = await new Promise<boolean>(resolve => {
      Alert.alert(
        'We Support Your Decision',
        'Your choice to cancel is valid and respected. Before we process this, would you like to know about our financial assistance options or temporary pause feature?',
        [
          { text: 'Just cancel', onPress: () => resolve(false) },
          { text: 'Tell me more', onPress: () => resolve(true) }
        ]
      );
    });

    if (showRetention) {
      setShowFinancialSupport(true);
      setShowCancellationFlow(false);
      return;
    }

    await cancelSubscription(!immediate);

    const endDate = immediate ? 'now' : new Date(activeSubscription.currentPeriodEnd).toLocaleDateString();

    Alert.alert(
      'Subscription Cancelled',
      `Your subscription will ${immediate ? 'end immediately' : `end on ${endDate}`}. Crisis support, emergency contacts, and safety tools remain freely available always.\n\nThank you for being part of your healing journey.`,
      [{ text: 'Understood' }]
    );

    setShowCancellationFlow(false);
  };

  const handleSubscriptionError = (error: any, option: SubscriptionChangeOption) => {
    const isFinancialError = [
      'payment_failed',
      'card_declined',
      'insufficient_funds'
    ].includes(error.code);

    if (isFinancialError) {
      Alert.alert(
        'Payment Challenge',
        'It looks like there\'s a payment issue. This doesn\'t reflect your worth or diminish your right to therapeutic support.\n\nWould you like to access crisis support or explore financial assistance?',
        [
          {
            text: 'Get Crisis Support',
            onPress: () => enableCrisisMode('subscription_payment_failed'),
            style: 'destructive'
          },
          {
            text: 'Financial Assistance',
            onPress: () => setShowFinancialSupport(true)
          },
          { text: 'Try Again Later', style: 'cancel' }
        ]
      );
    } else {
      Alert.alert(
        'Subscription Update',
        'We encountered a temporary issue. Your current subscription and therapeutic access continue unaffected.',
        [{ text: 'OK' }]
      );
    }
  };

  const FinancialSupportOptions: React.FC = () => {
    if (!showFinancialSupport) return null;

    return (
      <View style={styles.financialSupport}>
        <Text style={styles.financialSupportTitle}>Financial Support Available</Text>
        <Text style={styles.financialSupportText}>
          We understand that financial circumstances can change. Your mental health matters regardless of your ability to pay.
          Here are some options to continue your therapeutic journey:
        </Text>

        <View style={styles.supportOptions}>
          <Pressable
            style={({ pressed }) => [
              styles.supportOption,
              pressed && { opacity: 0.8 }
            ]}
            onPress={() => enableCrisisMode('financial_hardship')}
          >
            <Text style={styles.supportOptionTitle}>🆓 Activate Crisis Support Mode</Text>
            <Text style={styles.supportOptionText}>
              Full therapeutic access during financial hardship
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.supportOption,
              pressed && { opacity: 0.8 }
            ]}
            onPress={() => {
              Alert.alert(
                'Pause Subscription',
                'Temporarily pause billing while maintaining basic therapeutic access',
                [
                  { text: 'Learn More', onPress: () => handleSubscriptionChange(SUBSCRIPTION_OPTIONS.find(o => o.id === 'pause_subscription')!) },
                  { text: 'Not Now', style: 'cancel' }
                ]
              );
            }}
          >
            <Text style={styles.supportOptionTitle}>⏸️ Temporary Pause</Text>
            <Text style={styles.supportOptionText}>
              Pause billing while keeping crisis support and basic tools
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.supportOption,
              pressed && { opacity: 0.8 }
            ]}
            onPress={() => {
              Linking.openURL('mailto:support@being.app?subject=Financial Assistance Request');
            }}
          >
            <Text style={styles.supportOptionTitle}>💬 Financial Assistance Program</Text>
            <Text style={styles.supportOptionText}>
              Contact us about sliding scale or hardship options
            </Text>
          </Pressable>
        </View>

        <Button
          variant="secondary"
          onPress={() => setShowFinancialSupport(false)}
          style={styles.closeSupportButton}
        >
          Close
        </Button>
      </View>
    );
  };

  const CancellationFlow: React.FC = () => {
    if (!showCancellationFlow) return null;

    return (
      <View style={styles.cancellationFlow}>
        <Text style={styles.cancellationTitle}>We Respect Your Decision</Text>
        <Text style={styles.cancellationText}>
          Canceling your subscription doesn't mean your therapeutic journey ends. Crisis support and safety tools remain freely available always.
        </Text>

        <View style={styles.cancellationOptions}>
          <Button
            variant="outline"
            onPress={() => processCancellation(false)}
            style={styles.cancellationButton}
          >
            Cancel at Period End
          </Button>
          <Button
            variant="secondary"
            onPress={() => processCancellation(true)}
            style={styles.cancellationButton}
          >
            Cancel Immediately
          </Button>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.keepSubscription,
            pressed && { opacity: 0.8 }
          ]}
          onPress={() => setShowCancellationFlow(false)}
        >
          <Text style={styles.keepSubscriptionText}>Actually, I'll keep my subscription</Text>
        </Pressable>
      </View>
    );
  };

  const SubscriptionStatus: React.FC = () => (
    <Card style={styles.statusCard}>
      <View style={styles.statusHeader}>
        <Text style={styles.statusTitle}>Current Subscription</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: subscriptionStatus === 'active' ? colorSystem.status.success : colorSystem.status.warning }
        ]}>
          <Text style={styles.statusBadgeText}>
            {subscriptionStatus === 'active' ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      {activeSubscription ? (
        <View>
          <Text style={styles.planName}>{activeSubscription.plan?.name || 'Current Plan'}</Text>
          <Text style={styles.planDetails}>
            {activeSubscription.plan?.amount ? `$${(activeSubscription.plan.amount / 100).toFixed(2)}/${activeSubscription.plan.interval}` : 'Free'}
          </Text>
          <Text style={styles.nextBilling}>
            Next billing: {new Date(activeSubscription.currentPeriodEnd).toLocaleDateString()}
          </Text>
          {activeSubscription.cancelAtPeriodEnd && (
            <Text style={styles.cancellationNotice}>
              Subscription will end on {new Date(activeSubscription.currentPeriodEnd).toLocaleDateString()}
            </Text>
          )}
          {pauseUntilDate && (
            <Text style={styles.pauseNotice}>
              Paused until {pauseUntilDate.toLocaleDateString()}
            </Text>
          )}
        </View>
      ) : (
        <Text style={styles.noSubscription}>
          No active subscription. Crisis support and basic tools remain available.
        </Text>
      )}
    </Card>
  );

  const PaymentMethodsSection: React.FC = () => (
    <Card style={styles.paymentMethodsCard}>
      <Text style={styles.sectionTitle}>Payment Methods</Text>

      {paymentMethods.length === 0 ? (
        <Text style={styles.noPaymentMethods}>
          No payment methods saved. Add one to manage your subscription.
        </Text>
      ) : (
        <View>
          {paymentMethods.map((method) => (
            <View key={method.paymentMethodId} style={styles.paymentMethodItem}>
              <View style={styles.methodInfo}>
                <Text style={styles.methodBrand}>{method.card?.brand?.toUpperCase()}</Text>
                <Text style={styles.methodNumber}>•••• {method.card?.last4}</Text>
                <Text style={styles.methodExpiry}>
                  Expires {String(method.card?.expiryMonth).padStart(2, '0')}/{method.card?.expiryYear}
                </Text>
              </View>
              {method.isDefault && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>Default</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      <Button
        variant="outline"
        onPress={() => (navigation as any).navigate('PaymentMethodScreen')}
        style={styles.managePaymentMethodsButton}
      >
        Manage Payment Methods
      </Button>
    </Card>
  );

  const SubscriptionChangeOptions: React.FC = () => (
    <Card style={styles.changeOptionsCard}>
      <Text style={styles.sectionTitle}>Subscription Options</Text>

      {SUBSCRIPTION_OPTIONS.map((option) => (
        <Pressable
          key={option.id}
          style={({ pressed }) => [
            styles.changeOption,
            option.impact === 'caution' && styles.cautionOption,
            pressed && { opacity: 0.8 }
          ]}
          onPress={() => handleSubscriptionChange(option)}
          disabled={isProcessingChange}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`${option.title}: ${option.description}`}
        >
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>{option.title}</Text>
            <Text style={styles.optionDescription}>{option.description}</Text>
          </View>
          <Text style={styles.optionArrow}>→</Text>
        </Pressable>
      ))}
    </Card>
  );

  const SettingsToggles: React.FC = () => (
    <Card style={styles.settingsCard}>
      <Text style={styles.sectionTitle}>Billing Preferences</Text>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Auto-renewal</Text>
          <Text style={styles.settingDescription}>
            Automatically renew subscription at the end of each period
          </Text>
        </View>
        <Switch
          value={autoRenewalEnabled}
          onValueChange={setAutoRenewalEnabled}
          trackColor={{
            false: colorSystem.gray[300],
            true: colorSystem.status.success
          }}
          thumbColor={autoRenewalEnabled ? colorSystem.base.white : colorSystem.gray[400]}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Email notifications</Text>
          <Text style={styles.settingDescription}>
            Receive billing reminders and receipt confirmations
          </Text>
        </View>
        <Switch
          value={billingEmailNotifications}
          onValueChange={setBillingEmailNotifications}
          trackColor={{
            false: colorSystem.gray[300],
            true: colorSystem.status.success
          }}
          thumbColor={billingEmailNotifications ? colorSystem.base.white : colorSystem.gray[400]}
        />
      </View>
    </Card>
  );

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <CrisisButton variant="floating" />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Crisis Safety Banner */}
        <View style={styles.crisisBanner}>
          <Text style={styles.crisisText}>
            Crisis Support Always Free • 988 Available 24/7
          </Text>
        </View>

        {/* Financial Support */}
        <FinancialSupportOptions />

        {/* Cancellation Flow */}
        <CancellationFlow />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Subscription Settings</Text>
          <Text style={styles.subtitle}>
            Manage your subscription with compassion and transparency.
            Your therapeutic access and safety always come first.
          </Text>
        </View>

        {/* Subscription Status */}
        <SubscriptionStatus />

        {/* Payment Methods */}
        <PaymentMethodsSection />

        {/* Subscription Change Options */}
        <SubscriptionChangeOptions />

        {/* Settings Toggles */}
        <SettingsToggles />

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Button
            variant="outline"
            onPress={() => (navigation as any).navigate('BillingHistoryScreen')}
          >
            View Billing History
          </Button>
          <Button
            variant="secondary"
            onPress={() => {
              Linking.openURL('mailto:support@being.app?subject=Subscription Support');
            }}
          >
            Contact Support
          </Button>
        </View>

        {/* Therapeutic Reminder */}
        <View style={styles.therapeuticReminder}>
          <Text style={styles.reminderTitle}>Remember</Text>
          <Text style={styles.reminderText}>
            Your subscription choices are personal decisions that should align with your current life circumstances.
            There's no judgment here - only support for your wellbeing journey.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 100,
  },

  // Crisis Banner
  crisisBanner: {
    backgroundColor: colorSystem.status.critical,
    padding: spacing.md,
    marginVertical: spacing.md,
    borderRadius: 12,
  },
  crisisText: {
    color: colorSystem.base.white,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Header
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.headline1.size,
    fontWeight: typography.headline1.weight,
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.bodyLarge.size,
    color: colorSystem.accessibility.text.secondary,
    lineHeight: typography.bodyLarge.lineHeight * typography.bodyLarge.size,
  },

  // Status Card
  statusCard: {
    marginBottom: spacing.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.accessibility.text.primary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: colorSystem.base.white,
    fontSize: 12,
    fontWeight: '600',
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.xs,
  },
  planDetails: {
    fontSize: 16,
    color: colorSystem.accessibility.text.secondary,
    marginBottom: spacing.sm,
  },
  nextBilling: {
    fontSize: 14,
    color: colorSystem.accessibility.text.tertiary,
  },
  cancellationNotice: {
    fontSize: 14,
    color: colorSystem.status.warning,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  pauseNotice: {
    fontSize: 14,
    color: colorSystem.status.info,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  noSubscription: {
    fontSize: 16,
    color: colorSystem.accessibility.text.secondary,
    fontStyle: 'italic',
  },

  // Payment Methods
  paymentMethodsCard: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.md,
  },
  noPaymentMethods: {
    fontSize: 14,
    color: colorSystem.accessibility.text.secondary,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  paymentMethodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.gray[200],
  },
  methodInfo: {
    flex: 1,
  },
  methodBrand: {
    fontSize: 14,
    fontWeight: '600',
    color: colorSystem.accessibility.text.primary,
  },
  methodNumber: {
    fontSize: 16,
    color: colorSystem.accessibility.text.secondary,
  },
  methodExpiry: {
    fontSize: 12,
    color: colorSystem.accessibility.text.tertiary,
  },
  defaultBadge: {
    backgroundColor: colorSystem.status.info,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  defaultBadgeText: {
    color: colorSystem.base.white,
    fontSize: 12,
    fontWeight: '600',
  },
  managePaymentMethodsButton: {
    marginTop: spacing.md,
  },

  // Change Options
  changeOptionsCard: {
    marginBottom: spacing.lg,
  },
  changeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.gray[200],
  },
  cautionOption: {
    backgroundColor: colorSystem.status.warningBackground,
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.xs,
  },
  optionDescription: {
    fontSize: 14,
    color: colorSystem.accessibility.text.secondary,
  },
  optionArrow: {
    fontSize: 18,
    color: colorSystem.accessibility.text.tertiary,
    marginLeft: spacing.sm,
  },

  // Settings
  settingsCard: {
    marginBottom: spacing.lg,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.gray[200],
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.xs,
  },
  settingDescription: {
    fontSize: 14,
    color: colorSystem.accessibility.text.secondary,
  },

  // Financial Support
  financialSupport: {
    backgroundColor: colorSystem.status.warningBackground,
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.status.warning,
  },
  financialSupportTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.status.warning,
    marginBottom: spacing.sm,
  },
  financialSupportText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.accessibility.text.primary,
    lineHeight: typography.bodyRegular.lineHeight * typography.bodyRegular.size,
    marginBottom: spacing.md,
  },
  supportOptions: {
    marginBottom: spacing.md,
  },
  supportOption: {
    backgroundColor: colorSystem.base.white,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
  },
  supportOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.xs,
  },
  supportOptionText: {
    fontSize: 14,
    color: colorSystem.accessibility.text.secondary,
  },
  closeSupportButton: {
    alignSelf: 'flex-end',
  },

  // Cancellation Flow
  cancellationFlow: {
    backgroundColor: colorSystem.status.errorBackground,
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.status.error,
  },
  cancellationTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.status.error,
    marginBottom: spacing.sm,
  },
  cancellationText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.accessibility.text.primary,
    lineHeight: typography.bodyRegular.lineHeight * typography.bodyRegular.size,
    marginBottom: spacing.md,
  },
  cancellationOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cancellationButton: {
    flex: 1,
  },
  keepSubscription: {
    alignSelf: 'center',
  },
  keepSubscriptionText: {
    fontSize: 14,
    color: colorSystem.status.info,
    textDecorationLine: 'underline',
  },

  // Quick Actions
  quickActions: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  // Therapeutic Reminder
  therapeuticReminder: {
    backgroundColor: colorSystem.gray[50],
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.xl,
  },
  reminderTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.sm,
  },
  reminderText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.accessibility.text.secondary,
    lineHeight: typography.bodyRegular.lineHeight * typography.bodyRegular.size,
  },
});

export default PaymentSettingsScreen;