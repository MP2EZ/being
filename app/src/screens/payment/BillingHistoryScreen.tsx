/**
 * Billing History Screen - Transaction History with Crisis Safety
 *
 * CLINICAL REQUIREMENTS:
 * - Non-judgmental approach to payment history review
 * - Therapeutic messaging for billing concerns
 * - Crisis support integration for financial stress
 * - Transparent transaction history presentation
 *
 * PRIVACY REQUIREMENTS:
 * - HIPAA-compliant billing data display
 * - Secure transaction history access
 * - No sensitive financial data storage
 * - Clear data retention policies
 *
 * PERFORMANCE REQUIREMENTS:
 * - Screen load time <500ms
 * - Smooth scrolling through transaction history
 * - Crisis button response <200ms
 * - Efficient data pagination
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
  Share,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  usePaymentStore,
  usePaymentActions,
  usePaymentStatus,
  useCrisisPaymentSafety
} from '../../store';
import { CrisisButton, Card, Button, LoadingScreen } from '../../components/core';
import { colorSystem, spacing, typography } from '../../constants/colors';

interface Transaction {
  id: string;
  type: 'payment' | 'refund' | 'trial_start' | 'subscription_change';
  status: 'succeeded' | 'pending' | 'failed' | 'canceled';
  amount: number;
  currency: string;
  description: string;
  date: string;
  paymentMethod?: {
    type: string;
    last4: string;
    brand: string;
  };
  invoiceId?: string;
  receiptUrl?: string;
  subscriptionPlan?: string;
  metadata?: {
    therapeuticContext?: string;
    crisisSupport?: boolean;
  };
}

// Mock transaction data - in production would come from payment service
const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'txn_2024_001',
    type: 'payment',
    status: 'succeeded',
    amount: 999,
    currency: 'usd',
    description: 'Mindful Growth Monthly Subscription',
    date: '2024-01-15T10:30:00Z',
    paymentMethod: {
      type: 'card',
      last4: '4242',
      brand: 'visa'
    },
    invoiceId: 'inv_2024_001',
    receiptUrl: 'https://pay.stripe.com/receipts/example',
    subscriptionPlan: 'fullmind_monthly',
    metadata: {
      therapeuticContext: 'continuing_care'
    }
  },
  {
    id: 'txn_2024_002',
    type: 'trial_start',
    status: 'succeeded',
    amount: 0,
    currency: 'usd',
    description: 'Mindful Foundation Trial Started',
    date: '2023-12-15T14:20:00Z',
    subscriptionPlan: 'fullmind_free_trial',
    metadata: {
      therapeuticContext: 'initial_engagement'
    }
  },
  {
    id: 'txn_2024_003',
    type: 'payment',
    status: 'failed',
    amount: 999,
    currency: 'usd',
    description: 'Monthly Subscription Renewal',
    date: '2023-11-15T10:30:00Z',
    paymentMethod: {
      type: 'card',
      last4: '4000',
      brand: 'visa'
    },
    metadata: {
      therapeuticContext: 'payment_difficulty',
      crisisSupport: true
    }
  }
];

const BillingHistoryScreen: React.FC = () => {
  const navigation = useNavigation();

  // Store integration
  const {
    customer,
    activeSubscription,
    paymentMethods
  } = usePaymentStore();

  const { } = usePaymentActions();

  const {
    subscriptionStatus,
    crisisMode,
    isLoading
  } = usePaymentStatus();

  const {
    enableCrisisMode,
    performanceMetrics
  } = useCrisisPaymentSafety();

  // Component state
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'payments' | 'refunds' | 'trials'>('all');
  const [showBillingSupport, setShowBillingSupport] = useState(false);
  const [financialStressDetected, setFinancialStressDetected] = useState(false);

  useEffect(() => {
    loadTransactionHistory();
    detectFinancialStress();
  }, []);

  const loadTransactionHistory = async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    }

    try {
      // In production, would fetch from payment API
      // const history = await paymentAPIService.getTransactionHistory(customer?.customerId);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      setTransactions(MOCK_TRANSACTIONS);

    } catch (error) {
      console.error('Failed to load transaction history:', error);

      Alert.alert(
        'Transaction History Unavailable',
        'We\'re having difficulty loading your billing history. Your therapeutic access continues unaffected.',
        [
          { text: 'Try Again', onPress: () => loadTransactionHistory(true) },
          { text: 'Continue Anyway', style: 'cancel' }
        ]
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const detectFinancialStress = () => {
    // Check for failed payments or patterns indicating financial stress
    const failedPayments = transactions.filter(t => t.status === 'failed');
    const hasRecentFailures = failedPayments.some(t =>
      new Date(t.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
    );

    if (hasRecentFailures && !crisisMode) {
      setFinancialStressDetected(true);
      setShowBillingSupport(true);
      announceForScreenReader('Financial support resources are available if you\'re experiencing payment difficulties.');
    }
  };

  const announceForScreenReader = (message: string) => {
    AccessibilityInfo.announceForAccessibility(message);
  };

  const handleFinancialStressSupport = async () => {
    Alert.alert(
      'Financial Stress Support',
      'Payment difficulties can cause significant anxiety and stress. Remember that your worth and your right to mental health support aren\'t determined by your financial situation.\n\nWould you like to activate crisis support mode?',
      [
        {
          text: 'Activate Crisis Support',
          onPress: () => enableCrisisMode('financial_stress'),
          style: 'destructive'
        },
        {
          text: 'Call 988',
          onPress: () => Linking.openURL('tel:988')
        },
        {
          text: 'Continue Review',
          style: 'cancel'
        }
      ]
    );
  };

  const handleTransactionTap = async (transaction: Transaction) => {
    if (transaction.status === 'failed' && !crisisMode) {
      Alert.alert(
        'Payment Difficulty',
        'This payment was unsuccessful. Remember that payment challenges don\'t reflect your worth or diminish your right to healing support.\n\nWould you like help managing this?',
        [
          {
            text: 'Get Support',
            onPress: handleFinancialStressSupport
          },
          {
            text: 'View Receipt',
            onPress: () => viewTransactionReceipt(transaction),
            style: 'default'
          },
          { text: 'Close', style: 'cancel' }
        ]
      );
    } else {
      await viewTransactionReceipt(transaction);
    }
  };

  const viewTransactionReceipt = async (transaction: Transaction) => {
    if (transaction.receiptUrl) {
      try {
        await Linking.openURL(transaction.receiptUrl);
      } catch (error) {
        Alert.alert('Receipt Unavailable', 'Unable to open receipt at this time.');
      }
    } else {
      // Generate receipt text for sharing/viewing
      const receiptText = generateReceiptText(transaction);

      Alert.alert(
        'Transaction Details',
        receiptText,
        [
          {
            text: 'Share Receipt',
            onPress: () => Share.share({ message: receiptText })
          },
          { text: 'Close' }
        ]
      );
    }
  };

  const generateReceiptText = (transaction: Transaction): string => {
    const date = new Date(transaction.date).toLocaleDateString();
    const amount = transaction.amount === 0 ? 'Free' : `$${(transaction.amount / 100).toFixed(2)}`;

    return `
FullMind MBCT App - Transaction Receipt

Transaction ID: ${transaction.id}
Date: ${date}
Description: ${transaction.description}
Amount: ${amount}
Status: ${transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
${transaction.paymentMethod ? `Payment Method: ${transaction.paymentMethod.brand.toUpperCase()} •••• ${transaction.paymentMethod.last4}` : ''}

Thank you for investing in your mental health and wellbeing.

Questions? Contact support@fullmind.app
Crisis Support: Always call 988 for immediate help
    `.trim();
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      switch (selectedFilter) {
        case 'payments':
          return transaction.type === 'payment' && transaction.amount > 0;
        case 'refunds':
          return transaction.type === 'refund';
        case 'trials':
          return transaction.type === 'trial_start' || transaction.amount === 0;
        default:
          return true;
      }
    });
  }, [transactions, selectedFilter]);

  const calculateTotalSpent = useMemo(() => {
    return transactions
      .filter(t => t.type === 'payment' && t.status === 'succeeded')
      .reduce((total, t) => total + t.amount, 0);
  }, [transactions]);

  const BillingStressSupport: React.FC = () => {
    if (!showBillingSupport) return null;

    return (
      <View style={styles.stressSupport}>
        <Text style={styles.stressSupportTitle}>Financial Support Available</Text>
        <Text style={styles.stressSupportText}>
          We notice you may be experiencing payment difficulties. Your mental health matters regardless of financial circumstances.
          Crisis support and many therapeutic features remain freely accessible.
        </Text>
        <View style={styles.stressSupportActions}>
          <Button
            variant="outline"
            onPress={handleFinancialStressSupport}
            style={styles.supportButton}
          >
            Get Financial Support
          </Button>
          <Button
            variant="secondary"
            onPress={() => setShowBillingSupport(false)}
          >
            Continue Review
          </Button>
        </View>
      </View>
    );
  };

  const TransactionSummary: React.FC = () => (
    <Card style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Your Investment in Wellbeing</Text>
      <View style={styles.summaryStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>${(calculateTotalSpent / 100).toFixed(2)}</Text>
          <Text style={styles.statLabel}>Total Investment</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{transactions.length}</Text>
          <Text style={styles.statLabel}>Transactions</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {subscriptionStatus === 'active' ? 'Active' : 'Inactive'}
          </Text>
          <Text style={styles.statLabel}>Current Status</Text>
        </View>
      </View>
      <Text style={styles.summaryNote}>
        Thank you for prioritizing your mental health journey
      </Text>
    </Card>
  );

  const TransactionFilters: React.FC = () => (
    <View style={styles.filters}>
      {[
        { key: 'all', label: 'All Transactions' },
        { key: 'payments', label: 'Payments' },
        { key: 'trials', label: 'Trials' },
        { key: 'refunds', label: 'Refunds' }
      ].map(filter => (
        <TouchableOpacity
          key={filter.key}
          style={[
            styles.filterButton,
            selectedFilter === filter.key && styles.activeFilter
          ]}
          onPress={() => setSelectedFilter(filter.key as any)}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Filter by ${filter.label}`}
          accessibilityState={{ selected: selectedFilter === filter.key }}
        >
          <Text style={[
            styles.filterText,
            selectedFilter === filter.key && styles.activeFilterText
          ]}>
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const TransactionItem: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'succeeded':
          return colorSystem.status.success;
        case 'failed':
          return colorSystem.status.error;
        case 'pending':
          return colorSystem.status.warning;
        default:
          return colorSystem.gray[500];
      }
    };

    const getTransactionIcon = (type: string, status: string) => {
      if (type === 'trial_start') return '🎯';
      if (type === 'refund') return '↩️';
      if (status === 'failed') return '❌';
      if (status === 'succeeded') return '✅';
      return '⏳';
    };

    return (
      <TouchableOpacity
        style={styles.transactionItem}
        onPress={() => handleTransactionTap(transaction)}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Transaction: ${transaction.description}, amount ${transaction.amount === 0 ? 'free' : `$${(transaction.amount / 100).toFixed(2)}`}, status ${transaction.status}`}
      >
        <View style={styles.transactionIcon}>
          <Text style={styles.iconText}>
            {getTransactionIcon(transaction.type, transaction.status)}
          </Text>
        </View>

        <View style={styles.transactionDetails}>
          <Text style={styles.transactionDescription}>{transaction.description}</Text>
          <Text style={styles.transactionDate}>
            {new Date(transaction.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </Text>
          {transaction.paymentMethod && (
            <Text style={styles.paymentMethod}>
              {transaction.paymentMethod.brand.toUpperCase()} •••• {transaction.paymentMethod.last4}
            </Text>
          )}
        </View>

        <View style={styles.transactionAmount}>
          <Text style={[
            styles.amountText,
            { color: transaction.type === 'refund' ? colorSystem.status.warning : colorSystem.accessibility.text.primary }
          ]}>
            {transaction.type === 'refund' ? '-' : ''}
            {transaction.amount === 0 ? 'Free' : `$${(transaction.amount / 100).toFixed(2)}`}
          </Text>
          <Text style={[
            styles.statusText,
            { color: getStatusColor(transaction.status) }
          ]}>
            {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <CrisisButton variant="floating" />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadTransactionHistory(true)}
            colors={[colorSystem.status.info]}
            tintColor={colorSystem.status.info}
          />
        }
      >
        {/* Crisis Safety Banner */}
        <View style={styles.crisisBanner}>
          <Text style={styles.crisisText}>
            Financial stress? Crisis support is always free • Call 988
          </Text>
        </View>

        {/* Billing Stress Support */}
        <BillingStressSupport />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Your Billing History</Text>
          <Text style={styles.subtitle}>
            Review your therapeutic investment history with transparency and compassion
          </Text>
        </View>

        {/* Transaction Summary */}
        <TransactionSummary />

        {/* Filters */}
        <TransactionFilters />

        {/* Transaction List */}
        <View style={styles.transactionList}>
          {filteredTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No Transactions Found</Text>
              <Text style={styles.emptyText}>
                {selectedFilter === 'all'
                  ? 'Your transaction history will appear here as you use FullMind.'
                  : `No ${selectedFilter} found in your history.`
                }
              </Text>
            </View>
          ) : (
            filteredTransactions.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
              />
            ))
          )}
        </View>

        {/* Therapeutic Guidance */}
        <View style={styles.therapeuticGuidance}>
          <Text style={styles.guidanceTitle}>Mindful Financial Reflection</Text>
          <Text style={styles.guidanceText}>
            • Your investment in mental health is an act of self-care
          </Text>
          <Text style={styles.guidanceText}>
            • Payment difficulties don't diminish your worth or right to support
          </Text>
          <Text style={styles.guidanceText}>
            • Crisis support remains free and accessible regardless of payment status
          </Text>
          <Text style={styles.guidanceText}>
            • You have full control over your subscription and can make changes anytime
          </Text>
        </View>

        {/* Support Actions */}
        <View style={styles.supportActions}>
          <Button
            variant="outline"
            onPress={() => (navigation as any).navigate('PaymentSettingsScreen')}
          >
            Manage Subscription
          </Button>
          <Button
            variant="secondary"
            onPress={() => {
              Alert.alert(
                'Contact Support',
                'Need help with billing or have questions about your transactions?',
                [
                  {
                    text: 'Email Support',
                    onPress: () => Linking.openURL('mailto:support@fullmind.app?subject=Billing Question')
                  },
                  { text: 'Cancel' }
                ]
              );
            }}
          >
            Contact Billing Support
          </Button>
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
    paddingHorizontal: spacing.md,
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

  // Stress Support
  stressSupport: {
    backgroundColor: colorSystem.status.warningBackground,
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.status.warning,
  },
  stressSupportTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.status.warning,
    marginBottom: spacing.sm,
  },
  stressSupportText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.accessibility.text.primary,
    lineHeight: typography.bodyRegular.lineHeight * typography.bodyRegular.size,
    marginBottom: spacing.md,
  },
  stressSupportActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  supportButton: {
    flex: 1,
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

  // Summary
  summaryCard: {
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colorSystem.status.info,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 14,
    color: colorSystem.accessibility.text.secondary,
  },
  summaryNote: {
    fontSize: 14,
    color: colorSystem.accessibility.text.tertiary,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Filters
  filters: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  filterButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    backgroundColor: colorSystem.base.white,
  },
  activeFilter: {
    backgroundColor: colorSystem.status.info,
    borderColor: colorSystem.status.info,
  },
  filterText: {
    textAlign: 'center',
    fontSize: 14,
    color: colorSystem.accessibility.text.secondary,
  },
  activeFilterText: {
    color: colorSystem.base.white,
    fontWeight: '600',
  },

  // Transaction List
  transactionList: {
    marginBottom: spacing.xl,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorSystem.base.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colorSystem.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconText: {
    fontSize: 18,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.xs,
  },
  transactionDate: {
    fontSize: 14,
    color: colorSystem.accessibility.text.secondary,
    marginBottom: spacing.xs,
  },
  paymentMethod: {
    fontSize: 12,
    color: colorSystem.accessibility.text.tertiary,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.accessibility.text.secondary,
    textAlign: 'center',
    lineHeight: typography.bodyRegular.lineHeight * typography.bodyRegular.size,
  },

  // Therapeutic Guidance
  therapeuticGuidance: {
    backgroundColor: colorSystem.gray[50],
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  guidanceTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.md,
  },
  guidanceText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.accessibility.text.secondary,
    lineHeight: typography.bodyRegular.lineHeight * typography.bodyRegular.size,
    marginBottom: spacing.sm,
  },

  // Support Actions
  supportActions: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
});

export default BillingHistoryScreen;