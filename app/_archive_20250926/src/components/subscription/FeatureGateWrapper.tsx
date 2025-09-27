/**
 * Feature Gate Wrapper - Subscription-Aware Component Rendering
 *
 * CLINICAL REQUIREMENTS:
 * - Crisis features always render regardless of subscription
 * - Therapeutic continuity maintained during subscription changes
 * - Non-judgmental messaging for locked features
 * - MBCT-compliant upgrade prompts
 *
 * PERFORMANCE REQUIREMENTS:
 * - Feature gate evaluation <50ms
 * - Conditional rendering without layout shift
 * - Optimized re-renders with subscription changes
 * - Crisis access validation <200ms
 *
 * BUSINESS REQUIREMENTS:
 * - Clear feature access boundaries per tier
 * - Upgrade prompts with therapeutic framing
 * - Trial benefits highlighting
 * - Graceful degradation for expired subscriptions
 */

import React, { useMemo, useCallback, useEffect, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  AccessibilityInfo
} from 'react-native';
import {
  usePaymentStatus,
  useFeatureAccess,
  useCrisisPaymentSafety,
  useTrialManagement
} from '../../store';
import { useNavigation } from '@react-navigation/native';
import { Card, Button } from '../core';
import { colorSystem, spacing, typography } from '../../constants/colors';

/**
 * Feature Access Tiers
 */
export type FeatureTier = 'free' | 'trial' | 'basic' | 'premium' | 'crisis_override';

/**
 * Feature Gate Configuration
 */
export interface FeatureGateConfig {
  featureId: string;
  requiredTier: FeatureTier;
  crisisProtected: boolean; // Always accessible during crisis
  therapeuticCore: boolean; // Core therapeutic feature
  gracefulDegradation?: boolean; // Show limited version instead of blocking
  customUpgradeMessage?: string;
  customAccessDeniedMessage?: string;
}

/**
 * Component Props
 */
interface FeatureGateWrapperProps {
  config: FeatureGateConfig;
  children: ReactNode;
  fallback?: ReactNode;
  onAccessDenied?: (reason: string) => void;
  onUpgradePrompt?: (tier: FeatureTier) => void;
  renderUpgradePrompt?: boolean;
  showTrialBenefits?: boolean;
  className?: string;
}

/**
 * Pre-configured Feature Gates for Common Features
 */
export const FEATURE_GATES = {
  PHQ9_ASSESSMENT: {
    featureId: 'phq9_assessment',
    requiredTier: 'free' as FeatureTier,
    crisisProtected: true,
    therapeuticCore: true
  },
  GAD7_ASSESSMENT: {
    featureId: 'gad7_assessment',
    requiredTier: 'free' as FeatureTier,
    crisisProtected: true,
    therapeuticCore: true
  },
  BREATHING_EXERCISES: {
    featureId: 'breathing_exercises',
    requiredTier: 'free' as FeatureTier,
    crisisProtected: true,
    therapeuticCore: true
  },
  CRISIS_SUPPORT: {
    featureId: 'crisis_support',
    requiredTier: 'free' as FeatureTier,
    crisisProtected: true,
    therapeuticCore: true
  },
  CLOUD_SYNC: {
    featureId: 'cloud_sync',
    requiredTier: 'basic' as FeatureTier,
    crisisProtected: false,
    therapeuticCore: false,
    gracefulDegradation: true
  },
  ADVANCED_INSIGHTS: {
    featureId: 'advanced_insights',
    requiredTier: 'premium' as FeatureTier,
    crisisProtected: false,
    therapeuticCore: false,
    customUpgradeMessage: 'Deepen your self-understanding with advanced progress insights'
  },
  PREMIUM_CONTENT: {
    featureId: 'premium_content',
    requiredTier: 'premium' as FeatureTier,
    crisisProtected: false,
    therapeuticCore: false,
    customUpgradeMessage: 'Access extended MBCT practices and advanced therapeutic content'
  }
} as const;

/**
 * Feature Gate Wrapper Component
 */
export const FeatureGateWrapper: React.FC<FeatureGateWrapperProps> = ({
  config,
  children,
  fallback,
  onAccessDenied,
  onUpgradePrompt,
  renderUpgradePrompt = true,
  showTrialBenefits = true,
  className
}) => {
  const navigation = useNavigation();

  // Store hooks
  const paymentStatus = usePaymentStatus();
  const featureAccess = useFeatureAccess(config.featureId);
  const crisisSafety = useCrisisPaymentSafety();
  const trialManagement = useTrialManagement();

  /**
   * Evaluate feature access with performance tracking
   */
  const accessResult = useMemo(() => {
    const startTime = Date.now();

    try {
      // Crisis override always grants access to crisis-protected features
      if (config.crisisProtected && crisisSafety.crisisMode) {
        return {
          granted: true,
          reason: 'crisis_override',
          tier: 'crisis_override' as FeatureTier,
          responseTime: Date.now() - startTime
        };
      }

      // Check current subscription tier
      const currentTier = paymentStatus.subscriptionTier as FeatureTier;
      const tierHierarchy: FeatureTier[] = ['free', 'trial', 'basic', 'premium', 'crisis_override'];

      const currentTierIndex = tierHierarchy.indexOf(currentTier);
      const requiredTierIndex = tierHierarchy.indexOf(config.requiredTier);

      const granted = currentTierIndex >= requiredTierIndex;

      const responseTime = Date.now() - startTime;

      // Log performance warning if too slow
      if (responseTime > 50) {
        console.warn(`Feature gate evaluation took ${responseTime}ms (target: <50ms) for ${config.featureId}`);
      }

      return {
        granted,
        reason: granted ? 'subscription_access' : 'insufficient_tier',
        tier: currentTier,
        requiredTier: config.requiredTier,
        responseTime
      };

    } catch (error) {
      console.error('Feature gate evaluation failed:', error);

      // Emergency fallback - grant therapeutic features for safety
      const emergencyGrant = config.therapeuticCore || config.crisisProtected;

      return {
        granted: emergencyGrant,
        reason: emergencyGrant ? 'emergency_therapeutic_access' : 'evaluation_error',
        tier: 'free' as FeatureTier,
        responseTime: Date.now() - startTime
      };
    }
  }, [
    config,
    paymentStatus.subscriptionTier,
    crisisSafety.crisisMode,
    featureAccess.lastCheck
  ]);

  /**
   * Handle access denied with therapeutic messaging
   */
  const handleAccessDenied = useCallback(() => {
    const message = config.customAccessDeniedMessage ||
      `This feature is available with ${config.requiredTier} subscription. Your therapeutic journey continues with your current access level.`;

    if (onAccessDenied) {
      onAccessDenied(accessResult.reason);
    }

    // Announce for screen readers
    AccessibilityInfo.announceForAccessibility(message);

  }, [config, accessResult.reason, onAccessDenied]);

  /**
   * Handle upgrade prompt with mindful messaging
   */
  const handleUpgradePrompt = useCallback(() => {
    const tierDisplayNames = {
      trial: 'Mindful Trial',
      basic: 'Basic MBCT',
      premium: 'Premium MBCT'
    };

    const tierName = tierDisplayNames[config.requiredTier] || config.requiredTier;

    const upgradeMessage = config.customUpgradeMessage ||
      `This feature is part of ${tierName}. Would you like to learn more about what this plan offers for your therapeutic journey?`;

    Alert.alert(
      'Feature Available with Upgrade',
      upgradeMessage,
      [
        { text: 'Not right now', style: 'cancel' },
        {
          text: 'Learn More',
          onPress: () => {
            if (onUpgradePrompt) {
              onUpgradePrompt(config.requiredTier);
            }
            (navigation as any).navigate('SubscriptionScreen', {
              highlightTier: config.requiredTier,
              featureContext: config.featureId
            });
          }
        }
      ]
    );
  }, [config, navigation, onUpgradePrompt]);

  /**
   * Trial Benefits Component
   */
  const TrialBenefits: React.FC = () => {
    if (!showTrialBenefits || !trialManagement.trialActive) return null;

    return (
      <View style={styles.trialBenefits}>
        <Text style={styles.trialBenefitsTitle}>✨ Trial Benefit</Text>
        <Text style={styles.trialBenefitsText}>
          You can explore this feature during your {trialManagement.daysRemaining}-day mindful trial
        </Text>
      </View>
    );
  };

  /**
   * Upgrade Prompt Component
   */
  const UpgradePrompt: React.FC = () => {
    if (!renderUpgradePrompt) return null;

    const tierEmojis = {
      trial: '🌱',
      basic: '🧘‍♀️',
      premium: '🌟'
    };

    return (
      <Card style={styles.upgradePrompt}>
        <View style={styles.upgradeHeader}>
          <Text style={styles.upgradeEmoji}>{tierEmojis[config.requiredTier] || '💝'}</Text>
          <Text style={styles.upgradeTitle}>
            Available with {config.requiredTier} Subscription
          </Text>
        </View>

        <Text style={styles.upgradeDescription}>
          {config.customUpgradeMessage ||
           `This feature is designed to support your therapeutic journey with enhanced MBCT practices.`}
        </Text>

        <TrialBenefits />

        <View style={styles.upgradeActions}>
          <Button
            variant="primary"
            onPress={handleUpgradePrompt}
            style={styles.upgradeButton}
            accessibilityLabel={`Learn more about ${config.requiredTier} subscription`}
          >
            Learn More
          </Button>
        </View>

        <Text style={styles.upgradeDisclaimer}>
          Your current therapeutic access and crisis support remain unchanged
        </Text>
      </Card>
    );
  };

  /**
   * Crisis Override Banner
   */
  const CrisisOverrideBanner: React.FC = () => {
    if (!crisisSafety.crisisMode || !config.crisisProtected) return null;

    return (
      <View style={styles.crisisOverride}>
        <Text style={styles.crisisOverrideText}>
          Crisis Support Active - Feature Accessible for Your Safety
        </Text>
      </View>
    );
  };

  /**
   * Graceful Degradation Content
   */
  const GracefulDegradation: React.FC = () => {
    if (!config.gracefulDegradation) return null;

    return (
      <View style={styles.degradedAccess}>
        <Text style={styles.degradedTitle}>Limited Version Available</Text>
        <Text style={styles.degradedText}>
          You can use basic functionality with your current subscription.
          Upgrade for full features.
        </Text>
      </View>
    );
  };

  // Performance monitoring effect
  useEffect(() => {
    if (accessResult.responseTime > 50) {
      console.warn(`Feature gate performance warning: ${config.featureId} took ${accessResult.responseTime}ms`);
    }
  }, [accessResult.responseTime, config.featureId]);

  // Render based on access result
  if (accessResult.granted) {
    return (
      <View className={className}>
        <CrisisOverrideBanner />
        {children}
      </View>
    );
  }

  // Handle graceful degradation
  if (config.gracefulDegradation) {
    return (
      <View className={className}>
        <GracefulDegradation />
        {children}
      </View>
    );
  }

  // Handle access denied
  handleAccessDenied();

  // Render fallback or upgrade prompt
  if (fallback) {
    return <View className={className}>{fallback}</View>;
  }

  return (
    <View className={className}>
      <UpgradePrompt />
    </View>
  );
};

/**
 * Hook for feature access checking
 */
export const useFeatureGate = (config: FeatureGateConfig) => {
  const paymentStatus = usePaymentStatus();
  const crisisSafety = useCrisisPaymentSafety();

  return useMemo(() => {
    // Crisis override
    if (config.crisisProtected && crisisSafety.crisisMode) {
      return { granted: true, reason: 'crisis_override' };
    }

    // Check subscription tier
    const currentTier = paymentStatus.subscriptionTier as FeatureTier;
    const tierHierarchy: FeatureTier[] = ['free', 'trial', 'basic', 'premium', 'crisis_override'];

    const currentTierIndex = tierHierarchy.indexOf(currentTier);
    const requiredTierIndex = tierHierarchy.indexOf(config.requiredTier);

    const granted = currentTierIndex >= requiredTierIndex;

    return {
      granted,
      reason: granted ? 'subscription_access' : 'insufficient_tier',
      tier: currentTier,
      requiredTier: config.requiredTier
    };
  }, [config, paymentStatus.subscriptionTier, crisisSafety.crisisMode]);
};

const styles = StyleSheet.create({
  // Crisis Override
  crisisOverride: {
    backgroundColor: colorSystem.status.successBackground,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.status.success,
  },
  crisisOverrideText: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.status.success,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Trial Benefits
  trialBenefits: {
    backgroundColor: colorSystem.status.infoBackground,
    padding: spacing.md,
    borderRadius: 8,
    marginVertical: spacing.sm,
  },
  trialBenefitsTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    color: colorSystem.status.info,
    marginBottom: spacing.xs,
  },
  trialBenefitsText: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.accessibility.text.secondary,
  },

  // Upgrade Prompt
  upgradePrompt: {
    backgroundColor: colorSystem.base.white,
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
  },
  upgradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  upgradeEmoji: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  upgradeTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.accessibility.text.primary,
    flex: 1,
  },
  upgradeDescription: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.accessibility.text.secondary,
    lineHeight: typography.bodyRegular.lineHeight * typography.bodyRegular.size,
    marginBottom: spacing.md,
  },
  upgradeActions: {
    marginBottom: spacing.md,
  },
  upgradeButton: {
    alignSelf: 'flex-start',
  },
  upgradeDisclaimer: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.accessibility.text.tertiary,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // Graceful Degradation
  degradedAccess: {
    backgroundColor: colorSystem.status.warningBackground,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  degradedTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    color: colorSystem.status.warning,
    marginBottom: spacing.xs,
  },
  degradedText: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.accessibility.text.secondary,
  },
});

export default FeatureGateWrapper;