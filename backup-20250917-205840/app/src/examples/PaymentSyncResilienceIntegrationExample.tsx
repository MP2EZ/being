/**
 * Payment Sync Resilience Integration Example
 *
 * Demonstrates how to integrate the P0-CLOUD payment sync resilience UI components
 * in FullMind MBCT app screens following therapeutic UX principles
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import payment resilience UI components
import {
  PaymentSyncResilienceDashboard,
  CompactPaymentResilienceDashboard,
  PaymentSyncStatus,
  CrisisSafetyIndicator,
  AccessiblePaymentAnnouncements,
  HapticPaymentFeedback
} from '../components/payment';

import { usePaymentStore, paymentSelectors } from '../store/paymentStore';
import { useTheme } from '../hooks/useTheme';
import { spacing } from '../constants/colors';

/**
 * Example 1: Full Dashboard Integration
 * Complete payment resilience dashboard for dedicated payment/account screens
 */
export const PaymentAccountScreen: React.FC = () => {
  const { colorSystem: colors } = useTheme();
  const [emergencyMode, setEmergencyMode] = useState(false);

  const store = usePaymentStore();
  const paymentError = paymentSelectors.getPaymentError(store);

  // Auto-activate emergency mode for critical payment issues
  useEffect(() => {
    if (paymentError?.severity === 'critical') {
      setEmergencyMode(true);
    }
  }, [paymentError]);

  const handleRefresh = async () => {
    try {
      await store.refreshPaymentStatus();
      await store.syncPendingOperations();
    } catch (error) {
      console.error('Payment refresh failed:', error);
    }
  };

  const handleEmergencyAccess = () => {
    setEmergencyMode(!emergencyMode);

    if (!emergencyMode) {
      Alert.alert(
        'Emergency Payment Access',
        'Crisis protection activated. All therapeutic features remain available.',
        [{ text: 'Continue', style: 'default' }]
      );
    }
  };

  const handleOptimizePerformance = async () => {
    try {
      await store.optimizePerformance();
      Alert.alert(
        'Performance Optimized',
        'Payment sync performance has been improved.',
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      console.error('Performance optimization failed:', error);
    }
  };

  const handleResolveError = async () => {
    try {
      await store.resolvePaymentError();
    } catch (error) {
      console.error('Error resolution failed:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.gray[50] }]}>
      <PaymentSyncResilienceDashboard
        onRefresh={handleRefresh}
        onEmergencyAccess={handleEmergencyAccess}
        onOptimizePerformance={handleOptimizePerformance}
        onResolveError={handleResolveError}
        showDetailedMetrics={true}
        emergencyMode={emergencyMode}
        testID="payment-account-dashboard"
      />
    </SafeAreaView>
  );
};

/**
 * Example 2: Home Screen Integration
 * Compact payment status for main app screens
 */
export const HomeScreenWithPaymentStatus: React.FC = () => {
  const { colorSystem: colors } = useTheme();
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);

  const navigateToPaymentDetails = () => {
    setShowPaymentDetails(true);
    // In real app: navigation.navigate('PaymentAccount')
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.base.white }]}>
      {/* Accessibility Services - Always Present */}
      <AccessiblePaymentAnnouncements
        enabled={true}
        priorityLevels={['high', 'critical']}
        testID="home-payment-announcements"
      />

      <HapticPaymentFeedback
        enabledTypes={['error', 'critical']}
        respectUserPreferences={true}
        testID="home-payment-haptics"
      />

      {/* Main home screen content would go here */}
      <View style={styles.homeContent}>
        {/* Existing home screen components */}
      </View>

      {/* Compact Payment Status */}
      <CompactPaymentResilienceDashboard
        onViewDetails={navigateToPaymentDetails}
        showCrisisOnly={false}
        testID="home-compact-payment"
      />

      {/* Full Dashboard Modal (if showPaymentDetails is true) */}
      {showPaymentDetails && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <PaymentSyncResilienceDashboard
              onRefresh={async () => {}}
              onEmergencyAccess={() => setShowPaymentDetails(false)}
              showDetailedMetrics={false}
              emergencyMode={false}
              testID="home-modal-dashboard"
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

/**
 * Example 3: Crisis Screen Integration
 * Crisis-focused payment protection during emergency scenarios
 */
export const CrisisScreenWithPaymentProtection: React.FC = () => {
  const { colorSystem: colors } = useTheme();
  const [sessionActive, setSessionActive] = useState(true);

  const store = usePaymentStore();
  const paymentError = paymentSelectors.getPaymentError(store);

  const getPaymentStatus = () => {
    if (paymentError?.severity === 'critical') return 'critical';
    if (paymentError?.severity === 'high') return 'error';
    return 'active';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.status.errorBackground }]}>
      {/* Crisis Safety Indicator - Always Visible */}
      <View style={styles.crisisHeader}>
        <CrisisSafetyIndicator
          paymentStatus={getPaymentStatus()}
          compact={false}
          onEmergencyAccess={() => {
            Alert.alert(
              'Emergency Access Confirmed',
              'Crisis support is guaranteed regardless of payment status.',
              [{ text: 'Continue', style: 'default' }]
            );
          }}
          testID="crisis-safety-indicator"
        />
      </View>

      {/* Crisis screen content */}
      <View style={styles.crisisContent}>
        {/* Crisis intervention components would go here */}
      </View>

      {/* Payment Status (Minimal) */}
      <View style={styles.crisisFooter}>
        <PaymentSyncStatus
          compact={true}
          showCrisisIndicator={false}
          testID="crisis-payment-status"
        />
      </View>
    </SafeAreaView>
  );
};

/**
 * Example 4: Breathing Exercise Integration
 * Therapeutic session protection during mindfulness practices
 */
export const BreathingExerciseWithPaymentProtection: React.FC = () => {
  const { colorSystem: colors } = useTheme();
  const [exerciseActive, setExerciseActive] = useState(false);
  const [exercisePhase, setExercisePhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');

  const store = usePaymentStore();
  const paymentError = paymentSelectors.getPaymentError(store);

  const startExercise = () => {
    setExerciseActive(true);
  };

  const stopExercise = () => {
    setExerciseActive(false);
  };

  const getPaymentStatus = () => {
    if (paymentError?.severity === 'critical') return 'critical';
    if (paymentError) return 'error';
    return 'active';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.themes.morning.background }]}>
      {/* Accessibility Services */}
      <HapticPaymentFeedback
        enabledTypes={['critical']} // Only critical during exercises
        respectUserPreferences={true}
        testID="breathing-payment-haptics"
      />

      {/* Breathing Exercise UI */}
      <View style={styles.breathingContent}>
        {/* Breathing circle and instructions would go here */}

        {exerciseActive && (
          <View style={styles.breathingControls}>
            {/* Exercise controls */}
          </View>
        )}
      </View>

      {/* Payment Protection Status (Bottom) */}
      <View style={styles.protectionFooter}>
        {/* Show payment protection status during active sessions */}
        {exerciseActive && (
          <View style={styles.sessionProtection}>
            {/* TherapeuticSessionProtection component would be imported and used here */}
            <PaymentSyncStatus
              compact={true}
              showCrisisIndicator={false}
              testID="breathing-payment-protection"
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

/**
 * Example 5: Settings Screen Integration
 * Payment accessibility preferences and configuration
 */
export const PaymentAccessibilitySettingsScreen: React.FC = () => {
  const { colorSystem: colors } = useTheme();
  const [accessibilityEnabled, setAccessibilityEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [announcementsEnabled, setAnnouncementsEnabled] = useState(true);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.base.white }]}>
      {/* Settings content */}
      <View style={styles.settingsContent}>
        {/* Payment accessibility settings would go here */}
      </View>

      {/* Preview of current accessibility features */}
      <View style={styles.accessibilityPreview}>
        {accessibilityEnabled && (
          <AccessiblePaymentAnnouncements
            enabled={announcementsEnabled}
            announcementDelay={2000}
            priorityLevels={['medium', 'high', 'critical']}
            testID="settings-announcements-preview"
          />
        )}

        {hapticsEnabled && (
          <HapticPaymentFeedback
            enabledTypes={['success', 'warning', 'error', 'critical']}
            respectUserPreferences={true}
            testID="settings-haptics-preview"
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  homeContent: {
    flex: 1,
    padding: spacing.md,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    margin: spacing.lg,
    borderRadius: 12,
    maxHeight: '90%',
    width: '90%',
  },
  crisisHeader: {
    padding: spacing.md,
  },
  crisisContent: {
    flex: 1,
    padding: spacing.md,
  },
  crisisFooter: {
    padding: spacing.sm,
  },
  breathingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  breathingControls: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.md,
    right: spacing.md,
  },
  protectionFooter: {
    padding: spacing.sm,
  },
  sessionProtection: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: spacing.sm,
  },
  settingsContent: {
    flex: 1,
    padding: spacing.md,
  },
  accessibilityPreview: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
});

// Export examples for documentation and testing
export {
  PaymentAccountScreen,
  HomeScreenWithPaymentStatus,
  CrisisScreenWithPaymentProtection,
  BreathingExerciseWithPaymentProtection,
  PaymentAccessibilitySettingsScreen
};