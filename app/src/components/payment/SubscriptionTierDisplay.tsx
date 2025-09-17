/**
 * SubscriptionTierDisplay - Comprehensive subscription tier visualization
 *
 * Shows current plan, features, upgrade flows with therapeutic messaging
 * and crisis-safe payment interactions
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Card, Button } from '../core';
import { colorSystem, spacing, borderRadius, typography } from '../../constants/colors';
import { usePaymentStatus, paymentSelectors, usePaymentStore } from '../../store/paymentStore';
import { useTheme } from '../../hooks/useTheme';
import { useCommonHaptics } from '../../hooks/useHaptics';

export interface SubscriptionTierDisplayProps {
  readonly onUpgrade?: (planId: 'basic' | 'premium' | 'premium_monthly' | 'premium_annual') => void | Promise<void>;
  readonly onManageSubscription?: () => void | Promise<void>;
  readonly showFeatureComparison?: boolean;
  readonly theme?: 'morning' | 'midday' | 'evening' | null;
  readonly style?: ViewStyle | ViewStyle[];
  readonly testID: string; // Required for comprehensive testing

  // Crisis safety and therapeutic access
  readonly crisisMode?: boolean;
  readonly therapeuticAccessOverride?: boolean;
  readonly maintainCoreFeatures?: boolean;

  // Accessibility props
  readonly accessibilityLabel?: string;
  readonly accessibilityHint?: string;

  // Performance monitoring
  readonly onRenderPerformance?: (componentName: string, duration: number) => void;
}

interface FeatureItem {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly basicPlan: boolean;
  readonly premiumPlan: boolean;
  readonly therapeuticCore?: boolean; // Never blocked in crisis
  readonly crisisProtected?: boolean; // Always available during emergency
}

const SUBSCRIPTION_FEATURES: FeatureItem[] = [
  {
    id: 'breathing-exercises',
    name: '3-Minute Breathing Space',
    description: 'Core MBCT breathing practice',
    basicPlan: true,
    premiumPlan: true,
    therapeuticCore: true
  },
  {
    id: 'daily-checkins',
    name: 'Daily Check-ins',
    description: 'Morning, midday, evening reflection',
    basicPlan: true,
    premiumPlan: true,
    therapeuticCore: true
  },
  {
    id: 'mood-tracking',
    name: 'Mood Tracking',
    description: 'PHQ-9 and GAD-7 assessments',
    basicPlan: true,
    premiumPlan: true,
    therapeuticCore: true
  },
  {
    id: 'crisis-support',
    name: 'Crisis Support',
    description: '24/7 crisis button and resources',
    basicPlan: true,
    premiumPlan: true,
    therapeuticCore: true
  },
  {
    id: 'guided-practices',
    name: 'Guided MBCT Practices',
    description: '8-week structured program',
    basicPlan: false,
    premiumPlan: true
  },
  {
    id: 'progress-insights',
    name: 'Progress Insights',
    description: 'Detailed analytics and trends',
    basicPlan: false,
    premiumPlan: true
  },
  {
    id: 'export-data',
    name: 'Data Export',
    description: 'PDF reports and CSV export',
    basicPlan: false,
    premiumPlan: true
  },
  {
    id: 'offline-access',
    name: 'Offline Access',
    description: 'Practice without internet',
    basicPlan: false,
    premiumPlan: true
  }
];

export const SubscriptionTierDisplay: React.FC<SubscriptionTierDisplayProps> = ({
  onUpgrade,
  onManageSubscription,
  showFeatureComparison = true,
  theme = 'evening',
  style,
  testID,
  crisisMode = false,
  therapeuticAccessOverride = false,
  maintainCoreFeatures = true,
  accessibilityLabel,
  accessibilityHint,
  onRenderPerformance
}) => {
  const { colorSystem: colors } = useTheme();
  const { onSelect, onSuccess } = useCommonHaptics();
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'premium'>('premium');

  const store = usePaymentStore();
  const {
    subscriptionStatus,
    subscriptionTier,
    isSubscriptionActive,
    paymentError
  } = usePaymentStatus();

  const gracePeriodStatus = paymentSelectors.getGracePeriodStatus(store);

  const handleUpgrade = async (planId: string) => {
    await onSuccess();
    onUpgrade?.(planId);
  };

  const handleManageSubscription = async () => {
    await onSelect();
    onManageSubscription?.();
  };

  const handlePlanSelect = async (plan: 'basic' | 'premium') => {
    await onSelect();
    setSelectedPlan(plan);
  };

  const getCurrentPlan = () => {
    if (gracePeriodStatus?.active) {
      return {
        id: 'grace-period',
        name: 'Therapeutic Continuity',
        description: 'Full access maintained during payment resolution',
        isActive: true,
        isPremium: true,
        therapeuticProtection: true
      };
    }

    if (!isSubscriptionActive) {
      return {
        id: 'basic',
        name: 'Basic Access',
        description: 'Core mindfulness practices',
        isActive: true,
        isPremium: false,
        therapeuticProtection: true
      };
    }

    return {
      id: subscriptionTier?.id || 'premium',
      name: subscriptionTier?.name || 'Premium',
      description: 'Full MBCT program access',
      isActive: true,
      isPremium: true,
      therapeuticProtection: false
    };
  };

  const currentPlan = getCurrentPlan();

  const FeatureRow: React.FC<{ feature: FeatureItem }> = ({ feature }) => {
    const basicIncluded = feature.basicPlan;
    const premiumIncluded = feature.premiumPlan;
    const isTherapeuticCore = feature.therapeuticCore;

    return (
      <View style={styles.featureRow}>
        <View style={styles.featureInfo}>
          <Text style={[styles.featureName, { color: colors.base.black }]}>
            {feature.name}
            {isTherapeuticCore && (
              <Text style={[styles.therapeuticBadge, { color: colors.status.success }]}>
                {' '}🛡️
              </Text>
            )}
          </Text>
          <Text style={[styles.featureDescription, { color: colors.gray[600] }]}>
            {feature.description}
          </Text>
        </View>

        <View style={styles.planSupport}>
          <View style={styles.planColumn}>
            <Text style={[styles.planColumnHeader, { color: colors.gray[600] }]}>
              Basic
            </Text>
            <View style={styles.featureSupport}>
              {basicIncluded ? (
                <Text style={[styles.supportIcon, { color: colors.status.success }]}>✓</Text>
              ) : (
                <Text style={[styles.supportIcon, { color: colors.gray[300] }]}>−</Text>
              )}
            </View>
          </View>

          <View style={styles.planColumn}>
            <Text style={[styles.planColumnHeader, { color: colors.status.info }]}>
              Premium
            </Text>
            <View style={styles.featureSupport}>
              {premiumIncluded ? (
                <Text style={[styles.supportIcon, { color: colors.status.success }]}>✓</Text>
              ) : (
                <Text style={[styles.supportIcon, { color: colors.gray[300] }]}>−</Text>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const PlanCard: React.FC<{
    planType: 'basic' | 'premium';
    title: string;
    price: string;
    description: string;
    features: string[];
    recommended?: boolean;
  }> = ({ planType, title, price, description, features, recommended = false }) => {
    const isSelected = selectedPlan === planType;
    const isCurrent = currentPlan.isPremium ? planType === 'premium' : planType === 'basic';

    return (
      <TouchableOpacity
        style={[
          styles.planCard,
          {
            borderColor: isSelected ? colors.status.info : colors.gray[300],
            backgroundColor: isSelected ? colors.status.infoBackground : colors.base.white
          },
          recommended && styles.recommendedCard
        ]}
        onPress={() => handlePlanSelect(planType)}
        activeOpacity={0.8}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${title} plan, ${price}, ${description}`}
        accessibilityState={{ selected: isSelected }}
      >
        {recommended && (
          <View style={[styles.recommendedBadge, { backgroundColor: colors.status.success }]}>
            <Text style={styles.recommendedText}>Recommended</Text>
          </View>
        )}

        <Text style={[styles.planTitle, { color: colors.base.black }]}>
          {title}
        </Text>

        <Text style={[styles.planPrice, { color: colors.status.info }]}>
          {price}
        </Text>

        <Text style={[styles.planDescription, { color: colors.gray[600] }]}>
          {description}
        </Text>

        {isCurrent && (
          <View style={[styles.currentPlanBadge, { backgroundColor: colors.status.successBackground }]}>
            <Text style={[styles.currentPlanText, { color: colors.status.success }]}>
              Current Plan
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={[styles.container, style]}
      showsVerticalScrollIndicator={false}
      testID={testID}
    >
      {/* Current Plan Status */}
      <Card theme={theme} style={styles.currentPlanCard}>
        <View style={styles.currentPlanHeader}>
          <View style={styles.currentPlanInfo}>
            <Text style={[styles.currentPlanTitle, { color: colors.base.black }]}>
              {currentPlan.name}
            </Text>
            <Text style={[styles.currentPlanDesc, { color: colors.gray[600] }]}>
              {currentPlan.description}
            </Text>
          </View>

          {currentPlan.therapeuticProtection && (
            <View style={[styles.protectionBadge, { backgroundColor: colors.status.successBackground }]}>
              <Text style={[styles.protectionText, { color: colors.status.success }]}>
                🛡️ Protected
              </Text>
            </View>
          )}
        </View>

        {gracePeriodStatus?.active && (
          <View style={[styles.gracePeriodInfo, { backgroundColor: colors.status.warningBackground }]}>
            <Text style={[styles.gracePeriodText, { color: colors.status.warning }]}>
              {gracePeriodStatus.daysRemainingFormatted} of therapeutic continuity
            </Text>
          </View>
        )}

        {isSubscriptionActive && onManageSubscription && (
          <Button
            variant="outline"
            onPress={handleManageSubscription}
            style={styles.manageButton}
            accessibilityLabel="Manage subscription settings"
          >
            Manage Subscription
          </Button>
        )}
      </Card>

      {/* Feature Comparison */}
      {showFeatureComparison && (
        <Card style={styles.featuresCard}>
          <Text style={[styles.sectionTitle, { color: colors.base.black }]}>
            Features & Access
          </Text>

          <View style={styles.featuresHeader}>
            <View style={styles.featureHeaderSpace} />
            <View style={styles.planColumns}>
              <Text style={[styles.planColumnTitle, { color: colors.gray[600] }]}>
                Basic
              </Text>
              <Text style={[styles.planColumnTitle, { color: colors.status.info }]}>
                Premium
              </Text>
            </View>
          </View>

          {SUBSCRIPTION_FEATURES.map((feature) => (
            <FeatureRow key={feature.id} feature={feature} />
          ))}

          <View style={styles.therapeuticNote}>
            <Text style={[styles.therapeuticNoteText, { color: colors.status.success }]}>
              🛡️ Core therapeutic features are always available during crisis or payment issues
            </Text>
          </View>
        </Card>
      )}

      {/* Upgrade Options */}
      {!currentPlan.isPremium && onUpgrade && (
        <Card style={styles.upgradeCard}>
          <Text style={[styles.sectionTitle, { color: colors.base.black }]}>
            Upgrade Your Practice
          </Text>

          <View style={styles.plansGrid}>
            <PlanCard
              planType="basic"
              title="Basic"
              price="Free"
              description="Essential mindfulness tools"
              features={['3-minute breathing', 'Daily check-ins', 'Crisis support']}
            />

            <PlanCard
              planType="premium"
              title="Premium"
              price="$9.99/month"
              description="Complete MBCT program"
              features={['All Basic features', 'Guided practices', 'Progress insights', 'Data export']}
              recommended={true}
            />
          </View>

          <Button
            variant="primary"
            theme={theme}
            onPress={() => handleUpgrade(selectedPlan === 'premium' ? 'premium_monthly' : 'basic')}
            disabled={selectedPlan === 'basic'}
            style={styles.upgradeButton}
            accessibilityLabel={`Upgrade to ${selectedPlan} plan`}
          >
            {selectedPlan === 'premium' ? 'Upgrade to Premium' : 'Continue with Basic'}
          </Button>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  currentPlanCard: {
    marginBottom: spacing.lg,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  currentPlanInfo: {
    flex: 1,
  },
  currentPlanTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    marginBottom: spacing.xs,
  },
  currentPlanDesc: {
    fontSize: typography.bodyRegular.size,
  },
  protectionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.medium,
  },
  protectionText: {
    fontSize: typography.caption.size,
    fontWeight: '600',
  },
  gracePeriodInfo: {
    padding: spacing.sm,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.sm,
  },
  gracePeriodText: {
    fontSize: typography.caption.size,
    fontWeight: '500',
    textAlign: 'center',
  },
  manageButton: {
    marginTop: spacing.sm,
  },
  featuresCard: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    marginBottom: spacing.md,
  },
  featuresHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.gray[200],
  },
  featureHeaderSpace: {
    flex: 1,
  },
  planColumns: {
    flexDirection: 'row',
    width: 120,
  },
  planColumnTitle: {
    flex: 1,
    fontSize: typography.caption.size,
    fontWeight: '600',
    textAlign: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.gray[100],
  },
  featureInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  featureName: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '500',
    marginBottom: spacing.xs / 2,
  },
  therapeuticBadge: {
    fontSize: typography.micro.size,
  },
  featureDescription: {
    fontSize: typography.caption.size,
    lineHeight: 18,
  },
  planSupport: {
    flexDirection: 'row',
    width: 120,
  },
  planColumn: {
    flex: 1,
    alignItems: 'center',
  },
  planColumnHeader: {
    fontSize: typography.micro.size,
    fontWeight: '500',
    marginBottom: spacing.xs / 2,
  },
  featureSupport: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportIcon: {
    fontSize: 16,
    fontWeight: '600',
  },
  therapeuticNote: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colorSystem.status.successBackground,
    borderRadius: borderRadius.medium,
  },
  therapeuticNoteText: {
    fontSize: typography.caption.size,
    textAlign: 'center',
    lineHeight: 18,
  },
  upgradeCard: {
    marginBottom: spacing.lg,
  },
  plansGrid: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  planCard: {
    padding: spacing.md,
    borderRadius: borderRadius.large,
    borderWidth: 2,
    position: 'relative',
  },
  recommendedCard: {
    paddingTop: spacing.lg,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -1,
    left: spacing.md,
    right: spacing.md,
    paddingVertical: spacing.xs,
    borderTopLeftRadius: borderRadius.medium,
    borderTopRightRadius: borderRadius.medium,
    alignItems: 'center',
  },
  recommendedText: {
    color: colorSystem.base.white,
    fontSize: typography.micro.size,
    fontWeight: '600',
  },
  planTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    marginBottom: spacing.xs,
  },
  planPrice: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  planDescription: {
    fontSize: typography.bodyRegular.size,
    marginBottom: spacing.sm,
  },
  currentPlanBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.medium,
    alignSelf: 'flex-start',
  },
  currentPlanText: {
    fontSize: typography.caption.size,
    fontWeight: '500',
  },
  upgradeButton: {
    marginTop: spacing.sm,
  },
});