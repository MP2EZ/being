/**
 * Subscription Manager Component for FullMind P0-CLOUD
 *
 * React component demonstrating the enhanced state management integration with:
 * - Subscription Manager and Payment-Aware Feature Gates
 * - Real-time feature access validation with <100ms response
 * - Crisis-safe subscription handling with therapeutic continuity
 * - State synchronization across devices and stores
 *
 * This component serves as both a UI interface and integration example
 * for the Day 17 Phase 2 subscription state management enhancements.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import {
  usePaymentStatus,
  useFeatureAccess,
  useSubscriptionManagement,
  useTrialManagement,
  useCrisisPaymentSafety
} from '../../store';

interface SubscriptionManagerProps {
  userId: string;
  onFeatureAccessChange?: (featureId: string, hasAccess: boolean) => void;
  onSubscriptionChange?: (tier: string, status: string) => void;
  enableRealTimeUpdates?: boolean;
}

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({
  userId,
  onFeatureAccessChange,
  onSubscriptionChange,
  enableRealTimeUpdates = true
}) => {
  const [selectedFeature, setSelectedFeature] = useState<string>('');
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [lastFeatureCheck, setLastFeatureCheck] = useState<number>(0);

  // Enhanced subscription hooks from Day 17 Phase 2
  const paymentStatus = usePaymentStatus();
  const featureAccess = useFeatureAccess(selectedFeature);
  const subscriptionManagement = useSubscriptionManagement();
  const trialManagement = useTrialManagement();
  const crisisSafety = useCrisisPaymentSafety();

  /**
   * Initialize subscription manager integration
   */
  useEffect(() => {
    const initializeSubscription = async () => {
      try {
        console.log('Initializing subscription manager integration...');

        // Initialize subscription manager if not already done
        if (!subscriptionManagement.subscriptionManager) {
          const { usePaymentStore } = await import('../../store/paymentStore');
          const paymentStore = usePaymentStore.getState();
          await paymentStore.initializeSubscriptionManager();
        }

        // Sync subscription state
        await subscriptionManagement.syncSubscriptionState();

        console.log('Subscription manager integration initialized');
      } catch (error) {
        console.error('Subscription initialization failed:', error);
        Alert.alert(
          'Subscription Service',
          'Unable to initialize subscription features. Crisis and therapeutic features remain available.',
          [{ text: 'OK' }]
        );
      }
    };

    initializeSubscription();
  }, [subscriptionManagement]);

  /**
   * Real-time performance monitoring
   */
  useEffect(() => {
    if (!enableRealTimeUpdates) return;

    const performanceInterval = setInterval(() => {
      setPerformanceMetrics({
        ...paymentStatus.performanceMetrics,
        cacheSize: featureAccess.cacheSize,
        lastCheck: featureAccess.lastCheck,
        syncStatus: paymentStatus.syncStatus
      });
    }, 5000); // Update every 5 seconds

    return () => clearInterval(performanceInterval);
  }, [enableRealTimeUpdates, paymentStatus.performanceMetrics, featureAccess, paymentStatus.syncStatus]);

  /**
   * Handle feature access check with performance tracking
   */
  const handleFeatureCheck = useCallback(async (featureId: string) => {
    const startTime = Date.now();

    try {
      setSelectedFeature(featureId);

      // Use the enhanced feature access check
      const result = await featureAccess.checkFeatureAccess(featureId);

      const responseTime = Date.now() - startTime;
      setLastFeatureCheck(responseTime);

      // Notify parent component
      if (onFeatureAccessChange) {
        onFeatureAccessChange(featureId, result.granted);
      }

      // Show performance warning if response time exceeds target
      if (responseTime > 100) {
        console.warn(`Feature check took ${responseTime}ms (target: <100ms)`);
      }

      return result;
    } catch (error) {
      console.error('Feature check failed:', error);

      // Emergency fallback - grant therapeutic features for safety
      return {
        granted: true,
        reason: 'Emergency fallback - therapeutic continuity maintained',
        crisisOverride: true
      };
    }
  }, [featureAccess, onFeatureAccessChange]);

  /**
   * Handle trial start with mindful messaging
   */
  const handleStartTrial = useCallback(async () => {
    try {
      console.log('Starting mindful trial...');

      const result = await subscriptionManagement.startMindfulTrial(userId);

      Alert.alert(
        'Welcome to Your Mindful Journey',
        'Your 21-day exploration of MBCT practices begins now. Take this time to discover how mindfulness can support your mental wellness.',
        [{ text: 'Begin Journey', style: 'default' }]
      );

      // Sync state after trial start
      await subscriptionManagement.syncSubscriptionState();

      if (onSubscriptionChange) {
        onSubscriptionChange('trial', 'trialing');
      }

    } catch (error) {
      console.error('Trial start failed:', error);
      Alert.alert(
        'Trial Start',
        'Unable to start trial at this time. Crisis support and basic therapeutic features remain available.',
        [{ text: 'OK' }]
      );
    }
  }, [subscriptionManagement, userId, onSubscriptionChange]);

  /**
   * Handle subscription upgrade with therapeutic messaging
   */
  const handleUpgradeSubscription = useCallback(async (planId: string) => {
    try {
      console.log(`Upgrading to ${planId} subscription...`);

      if (trialManagement.trialActive) {
        // Convert trial to paid
        await trialManagement.convertTrialToPaid(planId);

        Alert.alert(
          'Subscription Upgraded',
          'Your mindful journey continues with enhanced features to support your therapeutic growth.',
          [{ text: 'Continue Journey', style: 'default' }]
        );
      } else {
        // Direct subscription creation would go here
        console.log('Direct subscription creation not implemented yet');
      }

      // Sync state after upgrade
      await subscriptionManagement.syncSubscriptionState();

      if (onSubscriptionChange) {
        onSubscriptionChange(planId, 'active');
      }

    } catch (error) {
      console.error('Subscription upgrade failed:', error);
      Alert.alert(
        'Subscription Upgrade',
        'Unable to process upgrade at this time. Your current access level is maintained.',
        [{ text: 'OK' }]
      );
    }
  }, [subscriptionManagement, trialManagement, onSubscriptionChange]);

  /**
   * Handle crisis mode toggle for testing
   */
  const handleCrisisModeToggle = useCallback(async () => {
    try {
      if (crisisSafety.crisisMode) {
        await crisisSafety.disableCrisisMode();
        Alert.alert('Crisis Mode Disabled', 'Normal subscription access restored.');
      } else {
        await crisisSafety.enableCrisisMode('User testing');
        Alert.alert('Crisis Mode Enabled', 'All therapeutic features are now accessible for safety.');
      }
    } catch (error) {
      console.error('Crisis mode toggle failed:', error);
    }
  }, [crisisSafety]);

  /**
   * Memoized feature list for performance
   */
  const availableFeatures = useMemo(() => [
    { id: 'phq9_assessment', name: 'PHQ-9 Depression Assessment', critical: true },
    { id: 'gad7_assessment', name: 'GAD-7 Anxiety Assessment', critical: true },
    { id: 'breathing_exercises', name: 'Guided Breathing Exercises', critical: false },
    { id: 'crisis_detection', name: 'Crisis Detection & Support', critical: true },
    { id: 'cloud_sync', name: 'Cloud Synchronization', critical: false },
    { id: 'advanced_insights', name: 'Advanced Analytics', critical: false },
    { id: 'premium_features', name: 'Premium Features', critical: false }
  ], []);

  /**
   * Subscription tier display name
   */
  const subscriptionTierDisplay = useMemo(() => {
    const tier = paymentStatus.subscriptionTier;
    const tierNames: Record<string, string> = {
      'none': 'No Subscription',
      'trial': 'Trial (21-day)',
      'basic': 'Basic MBCT',
      'premium': 'Premium MBCT',
      'crisis_access': 'Crisis Access (Emergency)'
    };
    return tierNames[tier] || tier;
  }, [paymentStatus.subscriptionTier]);

  return (
    <ScrollView style={styles.container}>
      {/* Subscription Status Header */}
      <View style={styles.statusHeader}>
        <Text style={styles.statusTitle}>Subscription Status</Text>
        <Text style={styles.statusTier}>{subscriptionTierDisplay}</Text>

        {crisisSafety.crisisMode && (
          <View style={styles.crisisBanner}>
            <Text style={styles.crisisText}>Crisis Mode Active - All Features Available</Text>
          </View>
        )}

        {paymentStatus.trialInfo?.active && (
          <View style={styles.trialBanner}>
            <Text style={styles.trialText}>
              Trial: {paymentStatus.trialInfo.daysRemaining} days remaining
            </Text>
          </View>
        )}
      </View>

      {/* Feature Access Testing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Feature Access Testing</Text>

        {availableFeatures.map((feature) => {
          const hasAccess = featureAccess.canAccessFeature(feature.id);

          return (
            <TouchableOpacity
              key={feature.id}
              style={[styles.featureRow, hasAccess ? styles.featureGranted : styles.featureDenied]}
              onPress={() => handleFeatureCheck(feature.id)}
            >
              <View style={styles.featureInfo}>
                <Text style={styles.featureName}>{feature.name}</Text>
                {feature.critical && <Text style={styles.criticalLabel}>Critical</Text>}
              </View>
              <Text style={[styles.accessStatus, hasAccess ? styles.granted : styles.denied]}>
                {hasAccess ? 'Granted' : 'Denied'}
              </Text>
            </TouchableOpacity>
          );
        })}

        {lastFeatureCheck > 0 && (
          <Text style={styles.performanceNote}>
            Last check: {lastFeatureCheck}ms {lastFeatureCheck > 100 ? '⚠️' : '✅'}
          </Text>
        )}
      </View>

      {/* Subscription Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription Actions</Text>

        {!trialManagement.trialActive && paymentStatus.subscriptionTier === 'none' && (
          <TouchableOpacity style={styles.actionButton} onPress={handleStartTrial}>
            <Text style={styles.actionButtonText}>Start 21-Day Mindful Trial</Text>
          </TouchableOpacity>
        )}

        {trialManagement.trialActive && (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleUpgradeSubscription('basic')}
            >
              <Text style={styles.actionButtonText}>Upgrade to Basic MBCT</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleUpgradeSubscription('premium')}
            >
              <Text style={styles.actionButtonText}>Upgrade to Premium MBCT</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.crisisButton]}
          onPress={handleCrisisModeToggle}
        >
          <Text style={styles.actionButtonText}>
            {crisisSafety.crisisMode ? 'Disable Crisis Mode' : 'Enable Crisis Mode (Test)'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Performance Metrics */}
      {performanceMetrics && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Metrics</Text>

          <View style={styles.metricsGrid}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Subscription Manager</Text>
              <Text style={styles.metricValue}>
                {performanceMetrics.subscriptionManagerActive ? 'Active' : 'Inactive'}
              </Text>
            </View>

            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Feature Cache Size</Text>
              <Text style={styles.metricValue}>{performanceMetrics.cacheSize || 0}</Text>
            </View>

            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Sync Status</Text>
              <Text style={styles.metricValue}>
                {performanceMetrics.syncStatus?.syncEnabled ? 'Online' : 'Offline'}
              </Text>
            </View>

            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Crisis Overrides</Text>
              <Text style={styles.metricValue}>
                {performanceMetrics.crisisOverrideCount || 0}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* State Synchronization Info */}
      {paymentStatus.syncStatus && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>State Synchronization</Text>

          <Text style={styles.syncInfo}>
            Last Sync: {paymentStatus.syncStatus.lastSync ?
              new Date(paymentStatus.syncStatus.lastSync).toLocaleTimeString() : 'Never'}
          </Text>
          <Text style={styles.syncInfo}>
            Mode: {paymentStatus.syncStatus.offlineMode ? 'Offline' : 'Online'}
          </Text>
          <Text style={styles.syncInfo}>
            Monitoring: {paymentStatus.syncStatus.monitoringActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16
  },
  statusHeader: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  statusTier: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8
  },
  crisisBanner: {
    backgroundColor: '#ff6b6b',
    padding: 8,
    borderRadius: 6,
    marginTop: 8
  },
  crisisText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  trialBanner: {
    backgroundColor: '#4ecdc4',
    padding: 8,
    borderRadius: 6,
    marginTop: 8
  },
  trialText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8
  },
  featureGranted: {
    backgroundColor: '#e8f5e8'
  },
  featureDenied: {
    backgroundColor: '#fce8e8'
  },
  featureInfo: {
    flex: 1
  },
  featureName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333'
  },
  criticalLabel: {
    fontSize: 10,
    color: '#ff6b6b',
    fontWeight: 'bold',
    marginTop: 2
  },
  accessStatus: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  granted: {
    color: '#28a745'
  },
  denied: {
    color: '#dc3545'
  },
  performanceNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8
  },
  actionButton: {
    backgroundColor: '#4ecdc4',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8
  },
  crisisButton: {
    backgroundColor: '#ff6b6b'
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  metric: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  syncInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  }
});

export default SubscriptionManager;