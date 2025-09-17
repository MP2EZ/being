/**
 * Payment Sync Resilience Dashboard
 *
 * Comprehensive dashboard integrating all payment sync resilience UI components
 * Features:
 * - Unified view of payment sync status, errors, and performance
 * - Crisis safety integration with therapeutic UX
 * - Accessibility-first design with comprehensive screen reader support
 * - Dark mode support following FullMind design patterns
 * - Performance monitoring with user-friendly feedback
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Platform,
  AccessibilityInfo
} from 'react-native';
import { Card, Button } from '../core';
import { colorSystem, spacing, borderRadius, typography } from '../../constants/colors';
import { useTheme } from '../../hooks/useTheme';
import { useCommonHaptics } from '../../hooks/useHaptics';
import { usePaymentStore, paymentSelectors } from '../../store/paymentStore';

// Import our new resilience UI components
import {
  PaymentSyncStatus,
  PaymentErrorHandling,
  PaymentPerformanceFeedback
} from './PaymentSyncResilienceUI';

import {
  CrisisSafetyIndicator,
  ProtectedCrisisButton,
  TherapeuticSessionProtection,
  EmergencyHotlineAccess
} from './CrisisSafetyPaymentUI';

import {
  AccessiblePaymentAnnouncements,
  HighContrastPaymentStatus,
  HapticPaymentFeedback,
  VoiceControlPaymentInterface
} from './AccessibilityPaymentUI';

// Import existing components
import { PaymentStatusIndicator } from './PaymentStatusIndicator';
import { CrisisPaymentBanner } from './CrisisPaymentBanner';

/**
 * Main Payment Sync Resilience Dashboard Component
 */
export interface PaymentSyncResilienceDashboardProps {
  readonly onRefresh?: () => Promise<void>;
  readonly onEmergencyAccess?: () => void;
  readonly onOptimizePerformance?: () => Promise<void>;
  readonly onResolveError?: () => Promise<void>;
  readonly showDetailedMetrics?: boolean;
  readonly emergencyMode?: boolean;
  readonly testID: string;
}

export const PaymentSyncResilienceDashboard: React.FC<PaymentSyncResilienceDashboardProps> = ({
  onRefresh,
  onEmergencyAccess,
  onOptimizePerformance,
  onResolveError,
  showDetailedMetrics = false,
  emergencyMode = false,
  testID
}) => {
  const { colorSystem: colors, isDarkMode } = useTheme();
  const { onSuccess, onWarning, onError } = useCommonHaptics();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);

  const store = usePaymentStore();
  const syncStatus = paymentSelectors.getSyncStatus(store);
  const paymentError = paymentSelectors.getPaymentError(store);
  const crisisAccess = paymentSelectors.getCrisisAccess(store);
  const subscriptionTier = paymentSelectors.getSubscriptionTier(store);
  const performanceMetrics = paymentSelectors.getPerformanceMetrics(store);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onWarning();

      try {
        await onRefresh();
        await onSuccess();

        // Accessibility announcement
        if (Platform.OS === 'ios') {
          AccessibilityInfo.announceForAccessibility('Payment sync dashboard refreshed');
        }
      } catch (error) {
        await onError();
        console.error('Dashboard refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
  }, [onRefresh, onWarning, onSuccess, onError]);

  // Handle sync retry
  const handleSyncRetry = useCallback(async () => {
    try {
      // Trigger sync retry through payment store
      await store.retryPaymentSync();

      // Accessibility announcement
      if (Platform.OS === 'ios') {
        AccessibilityInfo.announceForAccessibility('Payment sync retry initiated');
      }
    } catch (error) {
      console.error('Sync retry failed:', error);

      Alert.alert(
        'Sync Retry Failed',
        'Unable to retry payment sync. Your mindfulness practice continues safely.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  }, [store]);

  // Handle voice commands
  const handleVoiceCommand = useCallback((command: string) => {
    if (command.includes('emergency access') && onEmergencyAccess) {
      onEmergencyAccess();
    } else if (command.includes('retry') && handleSyncRetry) {
      handleSyncRetry();
    } else if (command.includes('crisis hotline')) {
      // Handle crisis hotline voice activation
      console.log('Voice command: Crisis hotline access');
    }
  }, [onEmergencyAccess, handleSyncRetry]);

  // Get current payment status for high contrast component
  const getPaymentStatus = () => {
    if (paymentError?.severity === 'critical') return 'error';
    if (paymentError?.severity === 'high') return 'warning';
    if (syncStatus.status === 'error') return 'error';
    if (syncStatus.status === 'retrying') return 'warning';
    if (syncStatus.networkStatus === 'offline') return 'info';
    return 'active';
  };

  const dashboardPaymentStatus = getPaymentStatus();

  return (
    <View style={styles.dashboardContainer}>
      {/* Accessibility Services */}
      <AccessiblePaymentAnnouncements
        enabled={true}
        announcementDelay={2000}
        priorityLevels={['medium', 'high', 'critical']}
        testID={`${testID}-announcements`}
      />

      <HapticPaymentFeedback
        enabledTypes={['warning', 'error', 'critical']}
        respectUserPreferences={true}
        testID={`${testID}-haptics`}
      />

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.themes.midday.primary}
            colors={[colors.themes.midday.primary]}
            progressBackgroundColor={colors.base.white}
          />
        }
        accessible={true}
        accessibilityLabel="Payment sync resilience dashboard"
        accessibilityRole="scrollbar"
        testID={`${testID}-scroll`}
      >
        {/* Emergency Mode Header */}
        {emergencyMode && (
          <Card style={[styles.emergencyHeader, { backgroundColor: colors.status.errorBackground }]}>
            <Text style={[styles.emergencyTitle, { color: colors.status.error }]}>
              🚨 Emergency Payment Access Mode
            </Text>
            <Text style={[styles.emergencySubtitle, { color: colors.gray[700] }]}>
              Crisis safety protocols active - all therapeutic features protected
            </Text>
          </Card>
        )}

        {/* Crisis Safety Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.gray[800] }]}>
            Crisis Safety Status
          </Text>

          <CrisisSafetyIndicator
            paymentStatus={dashboardPaymentStatus}
            compact={false}
            onEmergencyAccess={onEmergencyAccess}
            testID={`${testID}-crisis-safety`}
          />

          {/* Protected Crisis Button */}
          <View style={styles.crisisButtonContainer}>
            <ProtectedCrisisButton
              paymentIssue={dashboardPaymentStatus === 'error'}
              onCrisisActivated={onEmergencyAccess}
              testID={`${testID}-crisis-button`}
            />
          </View>

          {/* Therapeutic Session Protection */}
          <TherapeuticSessionProtection
            sessionActive={sessionActive}
            paymentStatus={dashboardPaymentStatus}
            sessionType="breathing"
            onProtectionActivated={() => {
              console.log('Therapeutic session protection activated');
            }}
            testID={`${testID}-session-protection`}
          />
        </View>

        {/* Payment Sync Status Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.gray[800] }]}>
            Payment Sync Status
          </Text>

          {/* Main sync status */}
          <PaymentSyncStatus
            compact={false}
            showCrisisIndicator={true}
            onSyncRetry={handleSyncRetry}
            testID={`${testID}-sync-status`}
          />

          {/* Legacy payment status indicator for comparison */}
          <PaymentStatusIndicator
            onPress={() => console.log('Payment status pressed')}
            accessibilityLabel="Current subscription status"
            testID={`${testID}-legacy-status`}
            showUpgradePrompt={false}
          />

          {/* High contrast status for accessibility */}
          <HighContrastPaymentStatus
            status={dashboardPaymentStatus}
            title={`${subscriptionTier?.name || 'Basic'} Subscription`}
            message={
              dashboardPaymentStatus === 'error'
                ? 'Payment sync experiencing issues - therapeutic access protected'
                : 'Payment sync operating normally'
            }
            autoContrastDetection={true}
            onStatusPress={() => console.log('High contrast status pressed')}
            testID={`${testID}-high-contrast-status`}
          />
        </View>

        {/* Error Handling Section */}
        {paymentError && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.gray[800] }]}>
              Error Resolution
            </Text>

            <PaymentErrorHandling
              error={paymentError}
              subscriptionTier={subscriptionTier?.name}
              onResolveError={onResolveError}
              onEmergencyAccess={onEmergencyAccess}
              testID={`${testID}-error-handling`}
            />
          </View>
        )}

        {/* Performance Feedback Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.gray[800] }]}>
            Sync Performance
          </Text>

          <PaymentPerformanceFeedback
            showDetailedMetrics={showDetailedMetrics}
            onOptimizePerformance={onOptimizePerformance}
            testID={`${testID}-performance`}
          />
        </View>

        {/* Voice Control Section (Emergency Mode) */}
        {emergencyMode && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.gray[800] }]}>
              Emergency Voice Control
            </Text>

            <VoiceControlPaymentInterface
              emergencyMode={true}
              onVoiceCommand={handleVoiceCommand}
              supportedCommands={[
                'activate emergency access',
                'retry payment sync',
                'call crisis hotline'
              ]}
              testID={`${testID}-voice-control`}
            />
          </View>
        )}

        {/* Emergency Hotline Access */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.gray[800] }]}>
            Emergency Support
          </Text>

          <EmergencyHotlineAccess
            paymentIssue={dashboardPaymentStatus === 'error'}
            testID={`${testID}-hotline`}
          />
        </View>

        {/* Dashboard Actions */}
        <View style={styles.actionsSection}>
          <Button
            title="Refresh Dashboard"
            onPress={handleRefresh}
            variant="secondary"
            size="large"
            loading={isRefreshing}
            accessibilityLabel="Refresh payment dashboard"
            testID={`${testID}-refresh-button`}
            style={styles.actionButton}
          />

          {emergencyMode && onEmergencyAccess && (
            <Button
              title="Exit Emergency Mode"
              onPress={onEmergencyAccess}
              variant="primary"
              size="large"
              accessibilityLabel="Exit emergency payment mode"
              testID={`${testID}-exit-emergency`}
              style={styles.actionButton}
            />
          )}
        </View>

        {/* Therapeutic Footer */}
        <View style={styles.therapeuticFooter}>
          <Text style={[styles.therapeuticText, { color: colors.status.success }]}>
            💚 Your mindfulness journey continues safely regardless of payment status
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  dashboardContainer: {
    flex: 1,
    backgroundColor: colorSystem.gray[50],
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },

  // Emergency Mode Styles
  emergencyHeader: {
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colorSystem.status.error,
  },
  emergencyTitle: {
    fontSize: typography.h2.size,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emergencySubtitle: {
    fontSize: typography.bodyRegular.size,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Section Styles
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.h3.size,
    fontWeight: '600',
    marginBottom: spacing.md,
    lineHeight: typography.h3.lineHeight,
  },

  // Crisis Button Container
  crisisButtonContainer: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },

  // Actions Section
  actionsSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  actionButton: {
    marginBottom: spacing.md,
  },

  // Therapeutic Footer
  therapeuticFooter: {
    backgroundColor: colorSystem.status.successBackground,
    padding: spacing.lg,
    borderRadius: borderRadius.large,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  therapeuticText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
});

/**
 * Compact Dashboard Component for Integration
 * Simplified version for embedding in other screens
 */
export interface CompactPaymentResilienceDashboardProps {
  readonly onViewDetails?: () => void;
  readonly showCrisisOnly?: boolean;
  readonly testID: string;
}

export const CompactPaymentResilienceDashboard: React.FC<CompactPaymentResilienceDashboardProps> = ({
  onViewDetails,
  showCrisisOnly = false,
  testID
}) => {
  const { colorSystem: colors } = useTheme();

  const store = usePaymentStore();
  const syncStatus = paymentSelectors.getSyncStatus(store);
  const paymentError = paymentSelectors.getPaymentError(store);
  const crisisAccess = paymentSelectors.getCrisisAccess(store);

  const getPaymentStatus = () => {
    if (paymentError?.severity === 'critical') return 'error';
    if (syncStatus.status === 'error') return 'error';
    if (syncStatus.networkStatus === 'offline') return 'info';
    return 'active';
  };

  const compactPaymentStatus = getPaymentStatus();

  return (
    <Card style={styles.compactContainer}>
      {/* Accessibility Services */}
      <HapticPaymentFeedback
        enabledTypes={['error', 'critical']}
        respectUserPreferences={true}
        testID={`${testID}-compact-haptics`}
      />

      {/* Crisis Safety (Always Shown) */}
      <CrisisSafetyIndicator
        paymentStatus={compactPaymentStatus}
        compact={true}
        testID={`${testID}-compact-crisis`}
      />

      {/* Payment Sync (Conditional) */}
      {!showCrisisOnly && (
        <PaymentSyncStatus
          compact={true}
          showCrisisIndicator={false}
          testID={`${testID}-compact-sync`}
        />
      )}

      {/* View Details Button */}
      {onViewDetails && (
        <Button
          title="View Payment Details"
          onPress={onViewDetails}
          variant="secondary"
          size="small"
          accessibilityLabel="View detailed payment resilience dashboard"
          testID={`${testID}-view-details`}
          style={styles.compactButton}
        />
      )}
    </Card>
  );
};

const compactStyles = StyleSheet.create({
  compactContainer: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  compactButton: {
    marginTop: spacing.sm,
    alignSelf: 'center',
    minWidth: 140,
  },
});

// Merge styles
const mergedStyles = { ...styles, ...compactStyles };

export default PaymentSyncResilienceDashboard;

export {
  PaymentSyncResilienceDashboard,
  CompactPaymentResilienceDashboard
};