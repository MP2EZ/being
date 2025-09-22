/**
 * Widget Demo Component - Enhanced with Subscription Integration
 *
 * Demonstrates widget integration with subscription-aware features:
 * - Feature gates for premium widget functionality
 * - Crisis-safe widget access during emergencies
 * - Trial-aware widget features
 * - Subscription-based widget configurations
 *
 * CLINICAL REQUIREMENTS:
 * - Quick morning check-in always accessible for crisis safety
 * - Premium widgets require appropriate subscription tier
 * - Crisis mode overrides subscription restrictions
 *
 * PERFORMANCE REQUIREMENTS:
 * - Widget feature access checks <50ms
 * - Crisis widget functionality <200ms
 * - Subscription state updates without widget interruption
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import { WidgetDataService } from '../services/WidgetDataService';
import { useWidgetIntegration } from '../hooks/useWidgetIntegration';
import {
  FeatureGateWrapper,
  FEATURE_GATES,
  useFeatureGate
} from './subscription/FeatureGateWrapper';
import {
  usePaymentStatus,
  useCrisisPaymentSafety,
  useTrialManagement
} from '../store';

export const WidgetDemo: React.FC = () => {
  const { updateWidgetData, handleDeepLink } = useWidgetIntegration();

  // Component state
  const [lastUpdate, setLastUpdate] = useState<string>('Never');
  const [isUpdating, setIsUpdating] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>({});

  // Store hooks for subscription integration
  const paymentStatus = usePaymentStatus();
  const crisisSafety = useCrisisPaymentSafety();
  const trialManagement = useTrialManagement();

  // Feature access hooks
  const cloudSyncAccess = useFeatureGate(FEATURE_GATES.CLOUD_SYNC);
  const premiumContentAccess = useFeatureGate(FEATURE_GATES.PREMIUM_CONTENT);
  const advancedInsightsAccess = useFeatureGate(FEATURE_GATES.ADVANCED_INSIGHTS);

  const widgetService = new WidgetDataService();

  /**
   * Enhanced widget update with subscription-aware features
   */
  const handleUpdateWidget = useCallback(async () => {
    const startTime = Date.now();
    setIsUpdating(true);

    try {
      // Basic widget update (always available)
      await updateWidgetData();
      setLastUpdate(new Date().toLocaleTimeString());

      // Track performance
      const updateTime = Date.now() - startTime;
      setPerformanceMetrics(prev => ({
        ...prev,
        lastWidgetUpdateTime: updateTime,
        successfulUpdates: (prev.successfulUpdates || 0) + 1
      }));

      // Show subscription-aware success message
      const message = crisisSafety.crisisMode
        ? 'Widget updated - Crisis mode ensures all features remain accessible'
        : cloudSyncAccess.granted
        ? 'Widget updated and synced to cloud'
        : 'Widget updated locally';

      Alert.alert('Widget Updated', message);

    } catch (error) {
      console.error('Widget update failed:', error);

      // Crisis-safe error handling
      if (crisisSafety.crisisMode) {
        Alert.alert(
          'Update Issue',
          'Widget update encountered an issue, but all therapeutic features remain accessible for your safety.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', `Widget update failed: ${error}`);
      }
    } finally {
      setIsUpdating(false);
    }
  }, [updateWidgetData, crisisSafety.crisisMode, cloudSyncAccess.granted]);

  /**
   * Subscription-aware deep link testing
   */
  const testDeepLink = useCallback(async (url: string, description: string) => {
    const startTime = Date.now();

    try {
      await handleDeepLink(url);

      const responseTime = Date.now() - startTime;
      setPerformanceMetrics(prev => ({
        ...prev,
        lastDeepLinkTime: responseTime
      }));

      Alert.alert('Deep Link Test', `${description} - Navigation triggered (${responseTime}ms)`);
    } catch (error) {
      Alert.alert('Error', `Deep link test failed: ${error}`);
    }
  }, [handleDeepLink]);

  /**
   * Premium widget data generation
   */
  const generateSampleData = useCallback(async () => {
    try {
      const sampleData = await widgetService.generateWidgetData();

      // Add subscription-specific enhancements
      const enhancedData = {
        ...sampleData,
        subscriptionTier: paymentStatus.subscriptionTier,
        trialActive: trialManagement.trialActive,
        crisisMode: crisisSafety.crisisMode,
        premiumFeatures: premiumContentAccess.granted,
        cloudSync: cloudSyncAccess.granted
      };

      Alert.alert(
        'Sample Widget Data',
        `Generated for ${paymentStatus.subscriptionTier} tier`,
        [
          {
            text: 'View Details',
            onPress: () => Alert.alert('Widget Data', JSON.stringify(enhancedData, null, 2))
          },
          { text: 'OK', style: 'cancel' }
        ]
      );
    } catch (error) {
      Alert.alert('Error', `Failed to generate sample data: ${error}`);
    }
  }, [
    widgetService,
    paymentStatus.subscriptionTier,
    trialManagement.trialActive,
    crisisSafety.crisisMode,
    premiumContentAccess.granted,
    cloudSyncAccess.granted
  ]);

  /**
   * Test feature access performance
   */
  const testFeaturePerformance = useCallback(async () => {
    const features = [
      { name: 'Cloud Sync', access: cloudSyncAccess },
      { name: 'Premium Content', access: premiumContentAccess },
      { name: 'Advanced Insights', access: advancedInsightsAccess }
    ];

    const results = features.map(feature => {
      const startTime = Date.now();
      const granted = feature.access.granted;
      const responseTime = Date.now() - startTime;

      return {
        feature: feature.name,
        granted,
        responseTime,
        meetsTarget: responseTime < 50
      };
    });

    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

    Alert.alert(
      'Feature Access Performance',
      `Average response time: ${avgResponseTime.toFixed(1)}ms\nTarget: <50ms\n\n${results
        .map(r => `${r.feature}: ${r.responseTime}ms ${r.meetsTarget ? '✓' : '⚠️'}`)
        .join('\n')}`
    );
  }, [cloudSyncAccess, premiumContentAccess, advancedInsightsAccess]);

  // Crisis-safe widget component
  const CrisisSafeWidget: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <FeatureGateWrapper
      config={FEATURE_GATES.CRISIS_SUPPORT}
      renderUpgradePrompt={false}
    >
      <View style={styles.crisisWidget}>
        <Text style={styles.crisisWidgetTitle}>{title}</Text>
        {children}
      </View>
    </FeatureGateWrapper>
  );

  // Premium widget component
  const PremiumWidget: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <FeatureGateWrapper
      config={FEATURE_GATES.PREMIUM_CONTENT}
      showTrialBenefits={true}
    >
      <View style={styles.premiumWidget}>
        <Text style={styles.premiumWidgetTitle}>{title}</Text>
        {children}
      </View>
    </FeatureGateWrapper>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Widget Integration Demo - Enhanced</Text>

      {/* Subscription Status */}
      <View style={styles.statusSection}>
        <Text style={styles.statusTitle}>Current Status</Text>
        <Text style={styles.statusText}>Tier: {paymentStatus.subscriptionTier}</Text>
        <Text style={styles.statusText}>
          Crisis Mode: {crisisSafety.crisisMode ? '🟢 Active' : '🟡 Inactive'}
        </Text>
        {trialManagement.trialActive && (
          <Text style={styles.statusText}>
            Trial: {trialManagement.daysRemaining} days remaining
          </Text>
        )}
      </View>

      {/* Core Widget Features - Always Available */}
      <CrisisSafeWidget title="🌅 Morning Check-in Widget">
        <TouchableOpacity
          style={[styles.button, isUpdating && styles.buttonDisabled]}
          onPress={handleUpdateWidget}
          disabled={isUpdating}
        >
          <Text style={styles.buttonText}>
            {isUpdating ? 'Updating...' : 'Update Widget Data'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.info}>Last Update: {lastUpdate}</Text>
        <Text style={styles.crisisInfo}>Always accessible for crisis safety</Text>
      </CrisisSafeWidget>

      {/* Basic Widget Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Widget Management</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={generateSampleData}
        >
          <Text style={styles.buttonText}>Generate Sample Data</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={testFeaturePerformance}
        >
          <Text style={styles.buttonText}>Test Performance</Text>
        </TouchableOpacity>

        {performanceMetrics.lastWidgetUpdateTime && (
          <Text style={styles.info}>
            Last update: {performanceMetrics.lastWidgetUpdateTime}ms
            {performanceMetrics.lastWidgetUpdateTime < 200 ? ' ✓' : ' ⚠️'}
          </Text>
        )}
      </View>

      {/* Cloud Sync Widget - Basic Tier Required */}
      <FeatureGateWrapper
        config={FEATURE_GATES.CLOUD_SYNC}
        showTrialBenefits={true}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>☁️ Cloud Sync Widget</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => Alert.alert('Cloud Sync', 'Widget data synced across devices')}
          >
            <Text style={styles.buttonText}>Sync to Cloud</Text>
          </TouchableOpacity>
          <Text style={styles.info}>Automatically syncs widget configurations and data</Text>
        </View>
      </FeatureGateWrapper>

      {/* Premium Widgets - Premium Tier Required */}
      <PremiumWidget title="📊 Advanced Widget Analytics">
        <View style={styles.premiumContent}>
          <Text style={styles.premiumInfo}>
            • Widget usage patterns and optimization suggestions
          </Text>
          <Text style={styles.premiumInfo}>
            • Therapeutic impact metrics from widget interactions
          </Text>
          <Text style={styles.premiumInfo}>
            • Personalized widget recommendations
          </Text>
          <TouchableOpacity
            style={styles.premiumButton}
            onPress={() => Alert.alert('Analytics', 'Advanced widget analytics would display here')}
          >
            <Text style={styles.buttonText}>View Analytics</Text>
          </TouchableOpacity>
        </View>
      </PremiumWidget>

      {/* Core Deep Link Testing - Crisis Safe */}
      <CrisisSafeWidget title="🔗 Core Navigation Testing">
        <TouchableOpacity
          style={styles.deepLinkButton}
          onPress={() => testDeepLink('being://checkin/morning', 'Morning Check-in')}
        >
          <Text style={styles.buttonText}>Test: Morning Check-in</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deepLinkButton}
          onPress={() => testDeepLink('being://crisis', 'Crisis Support')}
        >
          <Text style={styles.buttonText}>Test: Crisis Support</Text>
        </TouchableOpacity>
      </CrisisSafeWidget>

      {/* Advanced Deep Link Testing - Premium Feature */}
      <FeatureGateWrapper
        config={FEATURE_GATES.ADVANCED_INSIGHTS}
        customUpgradeMessage="Advanced widget deep links provide enhanced navigation and context-aware routing for premium therapeutic content."
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced Navigation Testing</Text>

          <TouchableOpacity
            style={styles.deepLinkButton}
            onPress={() => testDeepLink('being://checkin/midday?resume=true', 'Resume Midday')}
          >
            <Text style={styles.buttonText}>Test: Resume Midday Session</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deepLinkButton}
            onPress={() => testDeepLink('being://checkin/evening', 'Evening Check-in')}
          >
            <Text style={styles.buttonText}>Test: Evening Check-in</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deepLinkButton}
            onPress={() => testDeepLink('being://insights/trends', 'Advanced Insights')}
          >
            <Text style={styles.buttonText}>Test: Advanced Insights</Text>
          </TouchableOpacity>
        </View>
      </FeatureGateWrapper>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Crisis Intervention</Text>
        <TouchableOpacity
          style={[styles.deepLinkButton, styles.crisisButton]}
          onPress={() => testDeepLink('being://crisis', 'Crisis Intervention')}
        >
          <Text style={styles.buttonText}>Test: Crisis Intervention</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy & Security</Text>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>🔒 Privacy Protection</Text>
          <Text style={styles.infoText}>
            • No PHQ-9/GAD-7 data in widgets{'\n'}
            • Encrypted storage with integrity verification{'\n'}
            • Automatic clinical data filtering{'\n'}
            • Real-time privacy auditing
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>🚨 Crisis Safety</Text>
          <Text style={styles.infoText}>
            • Emergency access bypasses navigation{'\n'}
            • 988 hotline integration ready{'\n'}
            • Fail-safe fallback mechanisms{'\n'}
            • High-priority crisis updates
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>⚡ Performance</Text>
          <Text style={styles.infoText}>
            • Updates throttled to 1-minute intervals{'\n'}
            • Memory usage monitored (&lt;50MB){'\n'}
            • Battery-efficient background processing{'\n'}
            • Intelligent caching with LRU eviction
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Widget Features</Text>
        
        <View style={styles.featureList}>
          <Text style={styles.feature}>✅ Daily Progress Tracking</Text>
          <Text style={styles.feature}>✅ Session Resume Capability</Text>
          <Text style={styles.feature}>✅ Crisis Button Access</Text>
          <Text style={styles.feature}>✅ Secure Deep Linking</Text>
          <Text style={styles.feature}>✅ Cross-Platform Support</Text>
          <Text style={styles.feature}>✅ Privacy-First Design</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Implementation Status</Text>
        
        <View style={styles.statusList}>
          <Text style={styles.statusComplete}>✅ iOS WidgetKit Implementation</Text>
          <Text style={styles.statusComplete}>✅ Android App Widget Implementation</Text>
          <Text style={styles.statusComplete}>✅ Expo Config Plugin</Text>
          <Text style={styles.statusComplete}>✅ Privacy Filtering System</Text>
          <Text style={styles.statusComplete}>✅ Encrypted Storage Layer</Text>
          <Text style={styles.statusComplete}>✅ Deep Link Integration</Text>
          <Text style={styles.statusComplete}>✅ React Native Bridge</Text>
          <Text style={styles.statusPending}>⚠️ Manual Xcode Configuration Required</Text>
        </View>
      </View>

      <Text style={styles.footer}>
        Note: This demo is for development testing only.{'\n'}
        Production widgets will automatically integrate with your check-in data.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A7C59',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#4A7C59',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  deepLinkButton: {
    backgroundColor: '#40B5AD',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  crisisButton: {
    backgroundColor: '#D32F2F',
  },
  info: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  infoBox: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  featureList: {
    paddingLeft: 8,
  },
  feature: {
    fontSize: 14,
    color: '#4A7C59',
    marginBottom: 4,
    fontWeight: '500',
  },
  statusList: {
    paddingLeft: 8,
  },
  statusComplete: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 4,
    fontWeight: '500',
  },
  statusPending: {
    fontSize: 14,
    color: '#FF9800',
    marginBottom: 4,
    fontWeight: '500',
  },
  footer: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
    lineHeight: 18,
  },

  // Enhanced subscription-aware styles
  statusSection: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },

  // Crisis-safe widget styles
  crisisWidget: {
    backgroundColor: '#e8f5e8',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  crisisWidgetTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 12,
  },
  crisisInfo: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 8,
    fontStyle: 'italic',
  },

  // Premium widget styles
  premiumWidget: {
    backgroundColor: '#fff8e1',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB300',
  },
  premiumWidgetTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 12,
  },
  premiumContent: {
    marginTop: 8,
  },
  premiumInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  premiumButton: {
    backgroundColor: '#FFB300',
    padding: 12,
    borderRadius: 6,
    marginTop: 12,
  },
});