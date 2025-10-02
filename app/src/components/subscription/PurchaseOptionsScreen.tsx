/**
 * PURCHASE OPTIONS SCREEN COMPONENT
 * Displays subscription purchase options (monthly/yearly) with pricing
 *
 * FEATURES:
 * - Monthly and yearly subscription options
 * - Pricing display from App Store/Play Store
 * - Trial information
 * - Terms and privacy links
 * - Restore purchases option
 * - Loading and error states
 *
 * ACCESSIBILITY:
 * - Screen reader support for pricing
 * - Clear CTA buttons
 * - Error message announcements
 * - Focus management
 *
 * PERFORMANCE:
 * - Purchase flow: <60s (per acceptance criteria)
 * - Responsive UI during purchase
 * - Optimistic state updates
 */

import * as React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { IAPService, useIAPService } from '../../services/subscription/IAPService';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import {
  SubscriptionInterval,
  SUBSCRIPTION_PRICING,
} from '../../types/subscription';

interface PurchaseOptionsScreenProps {
  onPurchaseComplete?: () => void;
  onClose?: () => void;
}

export default function PurchaseOptionsScreen({
  onPurchaseComplete,
  onClose,
}: PurchaseOptionsScreenProps) {
  const { isReady, service } = useIAPService();
  const subscriptionStore = useSubscriptionStore();

  const [selectedInterval, setSelectedInterval] = React.useState<SubscriptionInterval>('yearly');
  const [isPurchasing, setIsPurchasing] = React.useState(false);
  const [isRestoring, setIsRestoring] = React.useState(false);

  // Get available products
  const products = service.getProducts();
  const monthlyProduct = service.getProduct('monthly');
  const yearlyProduct = service.getProduct('yearly');

  // Handle purchase
  const handlePurchase = async () => {
    if (isPurchasing) return;

    setIsPurchasing(true);

    try {
      console.log('[PurchaseOptions] Starting purchase:', selectedInterval);

      // Purchase through store (handles IAP, verification, and state update)
      await subscriptionStore.purchaseSubscription(selectedInterval);

      Alert.alert(
        'Purchase Successful',
        'Thank you for subscribing! You now have access to all features.',
        [
          {
            text: 'Continue',
            onPress: () => {
              if (onPurchaseComplete) onPurchaseComplete();
            },
          },
        ]
      );
    } catch (error) {
      console.error('[PurchaseOptions] Purchase failed:', error);

      // Don't show alert if user cancelled (not really an error)
      if (error instanceof Error && error.message.includes('cancelled')) {
        console.log('[PurchaseOptions] User cancelled purchase');
      } else {
        Alert.alert(
          'Purchase Failed',
          error instanceof Error ? error.message : 'An error occurred during purchase',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  // Handle free trial (no purchase required)
  const handleFreeTrial = async () => {
    try {
      console.log('[PurchaseOptions] Starting free trial');

      await subscriptionStore.createTrial();

      Alert.alert(
        'Free Trial Started',
        'Welcome to your 28-day free trial! Enjoy full access to all features.',
        [
          {
            text: 'Start Exploring',
            onPress: () => {
              if (onPurchaseComplete) onPurchaseComplete();
            },
          },
        ]
      );
    } catch (error) {
      console.error('[PurchaseOptions] Free trial failed:', error);

      Alert.alert(
        'Error',
        'Failed to start free trial. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle restore purchases
  const handleRestorePurchases = async () => {
    if (!isReady || isRestoring) return;

    setIsRestoring(true);

    try {
      console.log('[PurchaseOptions] Restoring purchases...');

      const purchases = await service.restorePurchases();

      if (purchases.length === 0) {
        Alert.alert(
          'No Purchases Found',
          'We could not find any previous purchases to restore.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Verify each purchase
      const platform = service.getPlatform();

      if (platform === 'none') {
        throw new Error('IAP not available on this platform');
      }

      let restoredCount = 0;

      for (const purchase of purchases) {
        const receiptData = purchase.transactionReceipt || '';
        const verification = await service.verifyReceipt(receiptData, platform);

        if (verification.valid) {
          await subscriptionStore.updateSubscriptionStatus('active');
          await service.finishTransaction(purchase);
          restoredCount++;
        }
      }

      if (restoredCount > 0) {
        Alert.alert(
          'Purchases Restored',
          'Your subscription has been restored successfully!',
          [
            {
              text: 'Continue',
              onPress: () => {
                if (onPurchaseComplete) onPurchaseComplete();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Restore Failed',
          'Could not verify your previous purchases.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('[PurchaseOptions] Restore failed:', error);

      Alert.alert(
        'Restore Failed',
        error instanceof Error ? error.message : 'An error occurred while restoring purchases',
        [{ text: 'OK' }]
      );
    } finally {
      setIsRestoring(false);
    }
  };

  // Open terms
  const handleOpenTerms = async () => {
    const url = 'https://being.app/terms'; // TODO: Replace with actual URL
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  // Open privacy policy
  const handleOpenPrivacy = async () => {
    const url = 'https://being.app/privacy'; // TODO: Replace with actual URL
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading subscription options...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>
          Start with a free trial, then continue your journey
        </Text>
      </View>

      {/* Subscription Options */}
      <View style={styles.options}>
        {/* Yearly Option (Recommended) */}
        <TouchableOpacity
          style={[
            styles.option,
            selectedInterval === 'yearly' && styles.selectedOption,
            styles.recommendedOption,
          ]}
          onPress={() => setSelectedInterval('yearly')}
          accessibilityLabel="Yearly subscription option, save 33%"
          accessibilityRole="radio"
          accessibilityState={{ selected: selectedInterval === 'yearly' }}
        >
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedBadgeText}>BEST VALUE</Text>
          </View>
          <Text style={styles.optionTitle}>Yearly</Text>
          <Text style={styles.optionPrice}>
            {yearlyProduct?.price || SUBSCRIPTION_PRICING.yearly.label}
          </Text>
          <Text style={styles.optionSavings}>{SUBSCRIPTION_PRICING.yearly.savingsLabel}</Text>
          <Text style={styles.optionDescription}>
            Billed annually • Cancel anytime
          </Text>
        </TouchableOpacity>

        {/* Monthly Option */}
        <TouchableOpacity
          style={[
            styles.option,
            selectedInterval === 'monthly' && styles.selectedOption,
          ]}
          onPress={() => setSelectedInterval('monthly')}
          accessibilityLabel="Monthly subscription option"
          accessibilityRole="radio"
          accessibilityState={{ selected: selectedInterval === 'monthly' }}
        >
          <Text style={styles.optionTitle}>Monthly</Text>
          <Text style={styles.optionPrice}>
            {monthlyProduct?.price || SUBSCRIPTION_PRICING.monthly.label}
          </Text>
          <Text style={styles.optionDescription}>
            Billed monthly • Cancel anytime
          </Text>
        </TouchableOpacity>
      </View>

      {/* Trial Information */}
      <View style={styles.trialInfo}>
        <Text style={styles.trialText}>
          🎉 Start with a <Text style={styles.trialBold}>28-day free trial</Text>
        </Text>
        <Text style={styles.trialDetails}>
          No payment required to start your trial. Full access to all features for 28 days.
        </Text>
      </View>

      {/* Free Trial Button (No Purchase) */}
      <TouchableOpacity
        style={styles.freeTrialButton}
        onPress={handleFreeTrial}
        disabled={subscriptionStore.isLoading}
        accessibilityLabel="Start 28-day free trial without payment"
        accessibilityRole="button"
      >
        {subscriptionStore.isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.freeTrialButtonText}>Start Free Trial (No Payment)</Text>
        )}
      </TouchableOpacity>

      {/* Or Divider */}
      <View style={styles.orDivider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Purchase Button (Paid Subscription) */}
      <TouchableOpacity
        style={[styles.purchaseButton, isPurchasing && styles.purchaseButtonDisabled]}
        onPress={handlePurchase}
        disabled={isPurchasing}
        accessibilityLabel={`Subscribe now with ${selectedInterval} plan`}
        accessibilityRole="button"
      >
        {isPurchasing ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.purchaseButtonText}>Subscribe Now</Text>
        )}
      </TouchableOpacity>

      {/* Restore Purchases */}
      <TouchableOpacity
        style={styles.restoreButton}
        onPress={handleRestorePurchases}
        disabled={isRestoring}
        accessibilityLabel="Restore previous purchases"
        accessibilityRole="button"
      >
        {isRestoring ? (
          <ActivityIndicator color="#4A90E2" />
        ) : (
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        )}
      </TouchableOpacity>

      {/* Crisis Access Guarantee */}
      <View style={styles.crisisGuarantee}>
        <Text style={styles.crisisGuaranteeText}>
          🛡️ Crisis support features always accessible, regardless of subscription status
        </Text>
      </View>

      {/* Terms and Privacy */}
      <View style={styles.legalLinks}>
        <TouchableOpacity onPress={handleOpenTerms}>
          <Text style={styles.legalLink}>Terms of Service</Text>
        </TouchableOpacity>
        <Text style={styles.legalSeparator}>•</Text>
        <TouchableOpacity onPress={handleOpenPrivacy}>
          <Text style={styles.legalLink}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>

      {/* Close Button */}
      {onClose && (
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <Text style={styles.closeButtonText}>Not Now</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
  options: {
    marginBottom: 24,
  },
  option: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  selectedOption: {
    borderColor: '#4A90E2',
    backgroundColor: '#F0F7FF',
  },
  recommendedOption: {
    position: 'relative',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -12,
    right: 16,
    backgroundColor: '#7ED321',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 4,
  },
  optionPrice: {
    fontSize: 32,
    fontWeight: '700',
    color: '#4A90E2',
    marginBottom: 4,
  },
  optionSavings: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7ED321',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666666',
  },
  trialInfo: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  trialText: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  trialBold: {
    fontWeight: '700',
    color: '#F5A623',
  },
  trialDetails: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 18,
  },
  freeTrialButton: {
    backgroundColor: '#7ED321',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  freeTrialButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#999999',
  },
  purchaseButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  purchaseButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  purchaseButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  restoreButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  restoreButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
  },
  crisisGuarantee: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  crisisGuaranteeText: {
    fontSize: 12,
    color: '#388E3C',
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  legalLink: {
    fontSize: 12,
    color: '#4A90E2',
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontSize: 12,
    color: '#999999',
    marginHorizontal: 8,
  },
  closeButton: {
    padding: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#999999',
  },
});
