/**
 * Subscription Integration Demo Screen
 *
 * Comprehensive demonstration of Day 17 Phase 3 React component integration
 * for subscription logic and feature gates. Shows practical implementation
 * patterns for subscription-aware UI components throughout the app.
 *
 * CLINICAL SAFETY:
 * - Crisis features always accessible regardless of subscription
 * - Non-judgmental messaging for locked features
 * - Therapeutic continuity during subscription changes
 *
 * PERFORMANCE TARGETS:
 * - Feature gate rendering: <50ms
 * - Subscription UI updates: <200ms
 * - Crisis feature access: <200ms (maintained)
 * - Trial countdown updates: Real-time
 * 
 * ✅ PRESSABLE MIGRATION: TouchableOpacity → Pressable with New Architecture optimization
 * - Enhanced android_ripple for subscription demo interface
 * - Improved accessibility labeling for subscription features
 * - Optimized touch targets for demo interactions
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  usePaymentStatus,
  useSubscriptionManagement,
  useTrialManagement,
  useCrisisPaymentSafety,
  useFeatureAccess
} from '../../store';
import {
  FeatureGateWrapper,
  FEATURE_GATES,
  useFeatureGate
} from '../../components/subscription/FeatureGateWrapper';
import { TrialManagementUI } from '../../components/subscription/TrialManagementUI';
import { SubscriptionManager } from '../../components/subscription/SubscriptionManager';
import { CrisisButton, Card, Button } from '../../components/core';
import { colorSystem, spacing, typography } from '../../constants/colors';

/**
 * Demo Components showcasing subscription integration patterns
 */

// 1. Basic Feature Gate Usage
const BasicFeatureExample: React.FC = () => {
  return (
    <FeatureGateWrapper
      config={FEATURE_GATES.CLOUD_SYNC}
      renderUpgradePrompt={true}
      showTrialBenefits={true}
    >
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>🔄 Cloud Synchronization</Text>
        <Text style={styles.featureDescription}>
          Your mindfulness data syncs across all your devices, ensuring your
          therapeutic progress is always accessible.
        </Text>
        <Button variant="primary">Enable Cloud Sync</Button>
      </View>
    </FeatureGateWrapper>
  );
};

// 2. Advanced Insights with Custom Messaging
const AdvancedInsightsExample: React.FC = () => {
  return (
    <FeatureGateWrapper
      config={{
        ...FEATURE_GATES.ADVANCED_INSIGHTS,
        customUpgradeMessage: 'Unlock deeper understanding of your mental health patterns with advanced analytics and personalized insights based on your MBCT journey.',
        customAccessDeniedMessage: 'Advanced insights help you track long-term progress and identify therapeutic patterns.'
      }}
      onAccessDenied={(reason) => {
        console.log('Advanced insights access denied:', reason);
      }}
      onUpgradePrompt={(tier) => {
        console.log('User prompted to upgrade to:', tier);
      }}
    >
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>📊 Advanced Progress Insights</Text>
        <Text style={styles.featureDescription}>
          Comprehensive analytics showing your MBCT progress patterns, mood trends,
          and therapeutic milestones over time.
        </Text>
        <View style={styles.insightCards}>
          <Card style={styles.insightCard}>
            <Text style={styles.insightValue}>85%</Text>
            <Text style={styles.insightLabel}>Mindfulness Growth</Text>
          </Card>
          <Card style={styles.insightCard}>
            <Text style={styles.insightValue}>12</Text>
            <Text style={styles.insightLabel}>Therapeutic Milestones</Text>
          </Card>
        </View>
      </View>
    </FeatureGateWrapper>
  );
};

// 3. Crisis-Protected Feature (Always Accessible)
const CrisisToolsExample: React.FC = () => {
  return (
    <FeatureGateWrapper
      config={FEATURE_GATES.CRISIS_SUPPORT}
      renderUpgradePrompt={false} // Never show upgrade prompts for crisis features
    >
      <View style={styles.crisisFeatureContent}>
        <Text style={styles.featureTitle}>🆘 Crisis Support Tools</Text>
        <Text style={styles.featureDescription}>
          These tools are always freely available for your safety and wellbeing.
        </Text>
        <View style={styles.crisisActions}>
          <Button variant="critical" style={styles.crisisButton}>
            Call 988 Crisis Hotline
          </Button>
          <Button variant="outline" style={styles.crisisButton}>
            Access Safety Plan
          </Button>
          <Button variant="secondary" style={styles.crisisButton}>
            Emergency Contacts
          </Button>
        </View>
      </View>
    </FeatureGateWrapper>
  );
};

// 4. Graceful Degradation Example
const CloudSyncGracefulExample: React.FC = () => {
  return (
    <FeatureGateWrapper
      config={{
        ...FEATURE_GATES.CLOUD_SYNC,
        gracefulDegradation: true
      }}
    >
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>💾 Data Backup</Text>
        <Text style={styles.featureDescription}>
          Basic local backup is available. Upgrade for full cloud synchronization.
        </Text>
        <Button variant="outline">Create Local Backup</Button>
      </View>
    </FeatureGateWrapper>
  );
};

// 5. Hook-Based Feature Access
const HookBasedFeatureExample: React.FC = () => {
  const premiumAccess = useFeatureGate(FEATURE_GATES.PREMIUM_CONTENT);

  return (
    <View style={styles.featureContent}>
      <Text style={styles.featureTitle}>
        🌟 Premium MBCT Content
        {premiumAccess.granted ? ' ✓' : ' 🔒'}
      </Text>

      {premiumAccess.granted ? (
        <View>
          <Text style={styles.featureDescription}>
            Access to advanced MBCT practices, extended meditation sessions,
            and specialized therapeutic content.
          </Text>
          <Button variant="primary">Explore Premium Content</Button>
        </View>
      ) : (
        <View>
          <Text style={styles.featureDescription}>
            Premium content includes advanced therapeutic practices designed
            to deepen your MBCT journey.
          </Text>
          <Text style={styles.accessInfo}>
            Current tier: {premiumAccess.tier} | Required: {premiumAccess.requiredTier}
          </Text>
        </View>
      )}
    </View>
  );
};

// 6. Real-time Feature Access Monitoring
const FeatureAccessMonitor: React.FC = () => {
  const paymentStatus = usePaymentStatus();
  const [accessChecks, setAccessChecks] = useState<any[]>([]);

  const testFeatureAccess = useCallback((featureId: string) => {
    const startTime = Date.now();
    const access = useFeatureGate(FEATURE_GATES[featureId as keyof typeof FEATURE_GATES]);
    const responseTime = Date.now() - startTime;

    const checkResult = {
      featureId,
      granted: access.granted,
      reason: access.reason,
      responseTime,
      timestamp: new Date().toLocaleTimeString()
    };

    setAccessChecks(prev => [checkResult, ...prev.slice(0, 4)]);
  }, []);

  return (
    <View style={styles.monitorContainer}>
      <Text style={styles.monitorTitle}>Feature Access Monitor</Text>
      <Text style={styles.monitorStatus}>
        Subscription Tier: {paymentStatus.subscriptionTier}
      </Text>

      <View style={styles.testButtons}>
        <Button
          variant="outline"
          size="small"
          onPress={() => testFeatureAccess('CLOUD_SYNC')}
        >
          Test Cloud Sync
        </Button>
        <Button
          variant="outline"
          size="small"
          onPress={() => testFeatureAccess('ADVANCED_INSIGHTS')}
        >
          Test Insights
        </Button>
        <Button
          variant="outline"
          size="small"
          onPress={() => testFeatureAccess('PREMIUM_CONTENT')}
        >
          Test Premium
        </Button>
      </View>

      <View style={styles.checkResults}>
        {accessChecks.map((check, index) => (
          <View key={index} style={styles.checkResult}>
            <Text style={styles.checkFeature}>{check.featureId}</Text>
            <Text style={[
              styles.checkStatus,
              { color: check.granted ? colorSystem.status.success : colorSystem.status.error }
            ]}>
              {check.granted ? '✓' : '✗'} {check.responseTime}ms
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

/**
 * Main Demo Screen Component
 */
const SubscriptionIntegrationDemo: React.FC = () => {
  const [activeSection, setActiveSection] = useState('basic');
  const paymentStatus = usePaymentStatus();
  const crisisSafety = useCrisisPaymentSafety();

  const sections = [
    { id: 'basic', title: 'Basic Feature Gates', component: BasicFeatureExample },
    { id: 'advanced', title: 'Advanced Insights', component: AdvancedInsightsExample },
    { id: 'crisis', title: 'Crisis-Protected', component: CrisisToolsExample },
    { id: 'graceful', title: 'Graceful Degradation', component: CloudSyncGracefulExample },
    { id: 'hooks', title: 'Hook-Based Access', component: HookBasedFeatureExample },
    { id: 'monitor', title: 'Access Monitor', component: FeatureAccessMonitor },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <CrisisButton variant="floating" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Subscription Integration Demo</Text>
          <Text style={styles.subtitle}>
            Day 17 Phase 3: React component integration for subscription logic and feature gates
          </Text>
        </View>

        {/* Current Status */}
        <Card style={styles.statusCard}>
          <Text style={styles.statusTitle}>Current Status</Text>
          <Text style={styles.statusText}>Tier: {paymentStatus.subscriptionTier}</Text>
          <Text style={styles.statusText}>
            Crisis Mode: {crisisSafety.crisisMode ? 'Active' : 'Inactive'}
          </Text>
        </Card>

        {/* Trial Management UI */}
        <TrialManagementUI
          showExtensionOptions={true}
          showConversionPrompts={true}
          showBenefitsHighlight={true}
        />

        {/* Section Navigation */}
        <View style={styles.navigation}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {sections.map((section) => (
              <Pressable
                key={section.id}
                style={({ pressed }) => [
                  styles.navButton,
                  activeSection === section.id && styles.activeNavButton,
                  pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
                ]}
                onPress={() => setActiveSection(section.id)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Switch to ${section.title} section`}
                android_ripple={{
                  color: 'rgba(0, 0, 0, 0.1)',
                  borderless: true,
                  radius: 100
                }}
                hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}
              >
                <Text style={[
                  styles.navButtonText,
                  activeSection === section.id && styles.activeNavButtonText
                ]}>
                  {section.title}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Active Section Content */}
        <Card style={styles.sectionContent}>
          {React.createElement(
            sections.find(s => s.id === activeSection)?.component || BasicFeatureExample
          )}
        </Card>

        {/* Subscription Manager Component */}
        <View style={styles.managerSection}>
          <Text style={styles.sectionHeader}>Subscription Manager Integration</Text>
          <SubscriptionManager
            userId="demo_user"
            enableRealTimeUpdates={true}
            onFeatureAccessChange={(featureId, hasAccess) => {
              console.log(`Feature ${featureId} access: ${hasAccess}`);
            }}
            onSubscriptionChange={(tier, status) => {
              console.log(`Subscription changed: ${tier} - ${status}`);
            }}
          />
        </View>

        {/* Performance Metrics */}
        <Card style={styles.metricsCard}>
          <Text style={styles.metricsTitle}>Performance Metrics</Text>
          <Text style={styles.metricsText}>
            ✓ Feature gate rendering: &lt;50ms target
          </Text>
          <Text style={styles.metricsText}>
            ✓ Subscription UI updates: &lt;200ms target
          </Text>
          <Text style={styles.metricsText}>
            ✓ Crisis feature access: &lt;200ms (maintained)
          </Text>
          <Text style={styles.metricsText}>
            ✓ Trial countdown updates: Real-time
          </Text>
        </Card>
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
  header: {
    padding: spacing.lg,
    backgroundColor: colorSystem.gray[50],
  },
  title: {
    fontSize: typography.headline1.size,
    fontWeight: typography.headline1.weight,
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.accessibility.text.secondary,
    lineHeight: typography.bodyRegular.lineHeight * typography.bodyRegular.size,
  },

  // Status Card
  statusCard: {
    margin: spacing.lg,
    padding: spacing.md,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.sm,
  },
  statusText: {
    fontSize: 14,
    color: colorSystem.accessibility.text.secondary,
    marginBottom: spacing.xs,
  },

  // Navigation
  navigation: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  navButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: 20,
    backgroundColor: colorSystem.gray[100],
  },
  activeNavButton: {
    backgroundColor: colorSystem.status.info,
  },
  navButtonText: {
    fontSize: 14,
    color: colorSystem.accessibility.text.secondary,
    fontWeight: '500',
  },
  activeNavButtonText: {
    color: colorSystem.base.white,
  },

  // Section Content
  sectionContent: {
    margin: spacing.lg,
    padding: spacing.lg,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },

  // Feature Content
  featureContent: {
    padding: spacing.md,
  },
  crisisFeatureContent: {
    padding: spacing.md,
    backgroundColor: colorSystem.status.successBackground,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.status.success,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.sm,
  },
  featureDescription: {
    fontSize: 14,
    color: colorSystem.accessibility.text.secondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  accessInfo: {
    fontSize: 12,
    color: colorSystem.accessibility.text.tertiary,
    fontStyle: 'italic',
  },

  // Crisis Actions
  crisisActions: {
    gap: spacing.sm,
  },
  crisisButton: {
    marginBottom: spacing.sm,
  },

  // Insight Cards
  insightCards: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  insightCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  insightValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colorSystem.status.info,
    marginBottom: spacing.xs,
  },
  insightLabel: {
    fontSize: 12,
    color: colorSystem.accessibility.text.secondary,
    textAlign: 'center',
  },

  // Monitor
  monitorContainer: {
    padding: spacing.md,
    backgroundColor: colorSystem.gray[50],
    borderRadius: 8,
  },
  monitorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.sm,
  },
  monitorStatus: {
    fontSize: 14,
    color: colorSystem.accessibility.text.secondary,
    marginBottom: spacing.md,
  },
  testButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  checkResults: {
    gap: spacing.xs,
  },
  checkResult: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  checkFeature: {
    fontSize: 12,
    color: colorSystem.accessibility.text.secondary,
  },
  checkStatus: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Manager Section
  managerSection: {
    marginBottom: spacing.lg,
  },

  // Metrics
  metricsCard: {
    margin: spacing.lg,
    padding: spacing.md,
    marginBottom: 100, // Space for floating crisis button
  },
  metricsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing.sm,
  },
  metricsText: {
    fontSize: 14,
    color: colorSystem.accessibility.text.secondary,
    marginBottom: spacing.xs,
  },
});

export default SubscriptionIntegrationDemo;