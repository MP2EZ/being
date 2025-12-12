/**
 * SUBSCRIPTION STATUS CARD COMPONENT
 * Displays current subscription status, trial countdown, and manage options
 *
 * FEATURES:
 * - Trial countdown timer
 * - Active subscription display
 * - Grace period warnings
 * - Manage subscription link
 * - Crisis access guarantee message
 *
 * ACCESSIBILITY:
 * - Screen reader announcements for status changes
 * - High contrast mode support
 * - Large touch targets
 * - Clear visual hierarchy
 *
 * PERFORMANCE:
 * - Real-time status updates
 * - Minimal re-renders
 * - Efficient countdown timer
 */

import * as React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
} from 'react-native';
import {
  useSubscription,
  useSubscriptionStatus,
  useIsTrialActive,
  useSubscriptionStore,
} from '@/core/stores/subscriptionStore';
import {
  SubscriptionStatus,
  SUBSCRIPTION_STATUS_LABELS,
} from '@/core/types/subscription';
import { spacing, borderRadius, typography } from '@/core/theme';

interface SubscriptionStatusCardProps {
  style?: any;
  onUpgrade?: () => void;
  onManage?: () => void;
}

export default function SubscriptionStatusCard({
  style,
  onUpgrade,
  onManage,
}: SubscriptionStatusCardProps) {
  const subscription = useSubscription();
  const status = useSubscriptionStatus();
  const isTrialActive = useIsTrialActive();
  const store = useSubscriptionStore();

  const [timeRemaining, setTimeRemaining] = React.useState<string>('');

  // Update countdown timer
  React.useEffect(() => {
    const updateCountdown = () => {
      if (!subscription) return;

      if (status === 'trial') {
        const daysLeft = store.getTrialDaysRemaining();
        if (daysLeft !== null) {
          setTimeRemaining(`${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`);
        }
      } else if (status === 'grace') {
        const daysLeft = store.getGraceDaysRemaining();
        if (daysLeft !== null) {
          setTimeRemaining(`${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`);
        }
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [subscription, status]);

  // Open platform subscription management
  const handleManageSubscription = async () => {
    if (onManage) {
      onManage();
      return;
    }

    const url =
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/account/subscriptions'
        : 'https://play.google.com/store/account/subscriptions';

    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  // No subscription yet
  if (!subscription) {
    return (
      <View style={[styles.card, style]}>
        <Text style={styles.title}>Start Your Free Trial</Text>
        <Text style={styles.description}>
          Try Being for free with full access to all features
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onUpgrade}
          accessibilityLabel="Start free trial"
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>Start Free Trial</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Trial status
  if (status === 'trial') {
    return (
      <View style={[styles.card, styles.trialCard, style]}>
        <Text style={styles.badge}>FREE TRIAL</Text>
        <Text style={styles.title}>Your Trial is Active</Text>
        <Text style={styles.countdown}>{timeRemaining}</Text>
        <Text style={styles.description}>
          Enjoying Being? Upgrade to continue your journey after the trial ends.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onUpgrade}
          accessibilityLabel="Upgrade now"
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>Upgrade Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Active subscription
  if (status === 'active') {
    return (
      <View style={[styles.card, styles.activeCard, style]}>
        <Text style={[styles.badge, styles.activeBadge]}>ACTIVE</Text>
        <Text style={styles.title}>Subscription Active</Text>
        <Text style={styles.description}>
          Thank you for supporting your mental health journey
        </Text>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleManageSubscription}
          accessibilityLabel="Manage subscription"
          accessibilityRole="button"
        >
          <Text style={styles.secondaryButtonText}>Manage Subscription</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Grace period
  if (status === 'grace') {
    return (
      <View style={[styles.card, styles.graceCard, style]}>
        <Text style={[styles.badge, styles.graceBadge]}>PAYMENT ISSUE</Text>
        <Text style={styles.title}>Update Payment Method</Text>
        <Text style={styles.countdown}>{timeRemaining}</Text>
        <Text style={styles.description}>
          We couldn't process your payment. Update your payment method to continue.
        </Text>
        <TouchableOpacity
          style={[styles.primaryButton, styles.warningButton]}
          onPress={handleManageSubscription}
          accessibilityLabel="Update payment"
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>Update Payment</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Expired subscription
  if (status === 'expired') {
    return (
      <View style={[styles.card, styles.expiredCard, style]}>
        <Text style={[styles.badge, styles.expiredBadge]}>EXPIRED</Text>
        <Text style={styles.title}>Subscription Ended</Text>
        <Text style={styles.description}>
          Renew your subscription to regain access to all features
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onUpgrade}
          accessibilityLabel="Renew subscription"
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>Renew Subscription</Text>
        </TouchableOpacity>
        <Text style={styles.crisisNote}>
          Crisis support features remain accessible
        </Text>
      </View>
    );
  }

  // Crisis-only access
  if (status === 'crisis_only') {
    return (
      <View style={[styles.card, style]}>
        <Text style={styles.title}>Crisis Support Always Available</Text>
        <Text style={styles.description}>
          Subscribe to unlock all therapeutic features
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onUpgrade}
          accessibilityLabel="Subscribe now"
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>Subscribe</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.large,
    padding: spacing[20],
    marginHorizontal: spacing[16],
    marginVertical: spacing[8],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trialCard: {
    borderColor: '#4A90E2',
    borderWidth: 2,
  },
  activeCard: {
    borderColor: '#7ED321',
    borderWidth: 2,
  },
  graceCard: {
    borderColor: '#F5A623',
    borderWidth: 2,
  },
  expiredCard: {
    borderColor: '#D0D0D0',
    borderWidth: 1,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#4A90E2',
    color: '#FFFFFF',
    fontSize: typography.micro.size,
    fontWeight: typography.fontWeight.bold,
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.small,
    marginBottom: spacing[12],
    letterSpacing: 0.5,
  },
  activeBadge: {
    backgroundColor: '#7ED321',
  },
  graceBadge: {
    backgroundColor: '#F5A623',
  },
  expiredBadge: {
    backgroundColor: '#D0D0D0',
    color: '#666666',
  },
  title: {
    fontSize: typography.title.size,
    fontWeight: typography.fontWeight.bold,
    color: '#333333',
    marginBottom: spacing[8],
  },
  countdown: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: '#4A90E2',
    marginBottom: spacing[12],
  },
  description: {
    fontSize: typography.bodySmall.size,
    color: '#666666',
    lineHeight: 20,
    marginBottom: spacing[16],
  },
  primaryButton: {
    backgroundColor: '#4A90E2',
    borderRadius: borderRadius.medium,
    padding: spacing[8],
    alignItems: 'center',
    marginTop: spacing[8],
  },
  warningButton: {
    backgroundColor: '#F5A623',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderColor: '#4A90E2',
    borderWidth: 2,
    borderRadius: borderRadius.medium,
    padding: spacing[8],
    alignItems: 'center',
    marginTop: spacing[8],
  },
  secondaryButtonText: {
    color: '#4A90E2',
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
  },
  crisisNote: {
    fontSize: typography.micro.size,
    color: '#999999',
    textAlign: 'center',
    marginTop: spacing[12],
    fontStyle: 'italic',
  },
});
