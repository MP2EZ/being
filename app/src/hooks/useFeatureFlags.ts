/**
 * Feature Flag React Hooks
 * React hooks for seamless feature flag integration
 */

import { useMemo, useCallback, useEffect, useState } from 'react';
import { useFeatureFlagStore } from '../store/featureFlagStore';
import { 
  P0CloudFeatureFlags, 
  FeatureFlagMetadata,
  FEATURE_FLAG_METADATA 
} from '../types/feature-flags';

/**
 * Feature Flag Hook Result
 */
export interface FeatureFlagResult {
  readonly enabled: boolean;
  readonly loading: boolean;
  readonly error: string | null;
  readonly metadata: FeatureFlagMetadata;
  readonly hasConsent: boolean;
  readonly requiresConsent: boolean;
  readonly canEnable: boolean;
  readonly requestAccess: () => Promise<void>;
  readonly updateConsent: (consent: boolean) => Promise<void>;
}

/**
 * Progressive Feature Hook Result
 */
export interface ProgressiveFeatureResult extends FeatureFlagResult {
  readonly rolloutPercentage: number;
  readonly isInRollout: boolean;
  readonly estimatedAvailability: string | null;
  readonly waitlisted: boolean;
}

/**
 * Cost Aware Feature Hook Result
 */
export interface CostAwareFeatureResult extends FeatureFlagResult {
  readonly costImpact: 'none' | 'low' | 'medium' | 'high' | 'variable';
  readonly currentCost: number;
  readonly budgetRemaining: number;
  readonly costLimited: boolean;
  readonly monthlyEstimate: number;
}

/**
 * Safety Aware Feature Hook Result
 */
export interface SafetyAwareFeatureResult extends FeatureFlagResult {
  readonly hipaaRelevant: boolean;
  readonly canDisableInCrisis: boolean;
  readonly crisisProtected: boolean;
  readonly encryptionRequired: boolean;
  readonly safetyValidated: boolean;
}

/**
 * Base Feature Flag Hook
 */
export function useFeatureFlag(flag: keyof P0CloudFeatureFlags): FeatureFlagResult {
  const {
    evaluateFlag,
    requestFeatureAccess,
    updateUserConsent,
    userConsents,
    isLoading,
    isUpdating,
    error
  } = useFeatureFlagStore();

  const metadata = FEATURE_FLAG_METADATA[flag];

  const enabled = useMemo(() => evaluateFlag(flag), [evaluateFlag, flag]);
  const hasConsent = useMemo(() => userConsents[flag] || false, [userConsents, flag]);
  const loading = isLoading || isUpdating;

  const requestAccess = useCallback(async () => {
    const result = await requestFeatureAccess(flag);
    if (!result.granted) {
      throw new Error(result.reason || 'Access denied');
    }
  }, [requestFeatureAccess, flag]);

  const updateConsent = useCallback(async (consent: boolean) => {
    await updateUserConsent(flag, consent);
  }, [updateUserConsent, flag]);

  return {
    enabled,
    loading,
    error,
    metadata,
    hasConsent,
    requiresConsent: metadata.requiresConsent,
    canEnable: !enabled,
    requestAccess,
    updateConsent
  };
}

/**
 * Progressive Feature Hook
 */
export function useProgressiveFeature(flag: keyof P0CloudFeatureFlags): ProgressiveFeatureResult {
  const baseResult = useFeatureFlag(flag);
  const { 
    rolloutPercentages, 
    userEligibility,
    checkRolloutEligibility 
  } = useFeatureFlagStore();

  const rolloutPercentage = rolloutPercentages[flag] || 0;
  const isInRollout = rolloutPercentage > 0 && rolloutPercentage < 100;
  const inRollout = checkRolloutEligibility(flag);
  const waitlisted = userEligibility?.waitlistFeatures.includes(flag) || false;

  const estimatedAvailability = useMemo(() => {
    if (baseResult.enabled) return null;
    if (waitlisted) return 'Coming soon';
    if (isInRollout && !inRollout) {
      // Estimate based on rollout percentage
      const weeksRemaining = Math.ceil((100 - rolloutPercentage) / 20); // Assuming 20% per week
      return `Estimated ${weeksRemaining} week${weeksRemaining !== 1 ? 's' : ''}`;
    }
    return null;
  }, [baseResult.enabled, waitlisted, isInRollout, inRollout, rolloutPercentage]);

  return {
    ...baseResult,
    rolloutPercentage,
    isInRollout,
    estimatedAvailability,
    waitlisted
  };
}

/**
 * Cost Aware Feature Hook
 */
export function useCostAwareFeature(flag: keyof P0CloudFeatureFlags): CostAwareFeatureResult {
  const baseResult = useFeatureFlag(flag);
  const { costStatus } = useFeatureFlagStore();

  const currentCost = costStatus.featureCosts[flag] || 0;
  const costLimited = costStatus.limitedFeatures.includes(flag);
  
  // Estimate monthly cost based on current usage
  const monthlyEstimate = useMemo(() => {
    const dailyCost = currentCost;
    return dailyCost * 30;
  }, [currentCost]);

  return {
    ...baseResult,
    costImpact: baseResult.metadata.costImpact,
    currentCost,
    budgetRemaining: costStatus.budgetRemaining,
    costLimited,
    monthlyEstimate
  };
}

/**
 * Safety Aware Feature Hook
 */
export function useSafetyAwareFeature(flag: keyof P0CloudFeatureFlags): SafetyAwareFeatureResult {
  const baseResult = useFeatureFlag(flag);
  const { safetyStatus, validateEncryption } = useFeatureFlagStore();
  const [safetyValidated, setSafetyValidated] = useState(false);

  const hipaaRelevant = baseResult.metadata.hipaaRelevant;
  const canDisableInCrisis = baseResult.metadata.canDisableInCrisis;
  const crisisProtected = !canDisableInCrisis;
  const encryptionRequired = hipaaRelevant;

  useEffect(() => {
    if (baseResult.enabled && encryptionRequired) {
      validateEncryption().then(setSafetyValidated);
    } else {
      setSafetyValidated(true);
    }
  }, [baseResult.enabled, encryptionRequired, validateEncryption]);

  return {
    ...baseResult,
    hipaaRelevant,
    canDisableInCrisis,
    crisisProtected,
    encryptionRequired,
    safetyValidated: safetyValidated && safetyStatus.encryptionValidated
  };
}

/**
 * Multiple Feature Flags Hook
 */
export function useMultipleFeatureFlags(
  flags: readonly (keyof P0CloudFeatureFlags)[]
): Record<keyof P0CloudFeatureFlags, boolean> {
  const { evaluateFlag } = useFeatureFlagStore();

  return useMemo(() => {
    const result = {} as Record<keyof P0CloudFeatureFlags, boolean>;
    flags.forEach(flag => {
      result[flag] = evaluateFlag(flag);
    });
    return result;
  }, [evaluateFlag, flags]);
}

/**
 * Feature Flag Admin Hook (for settings/admin UI)
 */
export interface FeatureFlagAdminResult {
  readonly allFlags: Record<keyof P0CloudFeatureFlags, boolean>;
  readonly metadata: Record<keyof P0CloudFeatureFlags, FeatureFlagMetadata>;
  readonly consents: Record<keyof P0CloudFeatureFlags, boolean>;
  readonly rolloutPercentages: Record<keyof P0CloudFeatureFlags, number>;
  readonly costStatus: any;
  readonly safetyStatus: any;
  readonly healthStatus: any;
  readonly emergencyDisable: (flag: keyof P0CloudFeatureFlags, reason: string) => Promise<void>;
  readonly updateRollout: (flag: keyof P0CloudFeatureFlags, percentage: number) => Promise<void>;
  readonly refreshMetrics: () => Promise<void>;
}

export function useFeatureFlagAdmin(): FeatureFlagAdminResult {
  const store = useFeatureFlagStore();

  const allFlags = useMemo(() => {
    const result = {} as Record<keyof P0CloudFeatureFlags, boolean>;
    Object.keys(store.flags).forEach(key => {
      result[key as keyof P0CloudFeatureFlags] = store.evaluateFlag(key as keyof P0CloudFeatureFlags);
    });
    return result;
  }, [store.flags, store.evaluateFlag]);

  return {
    allFlags,
    metadata: store.metadata,
    consents: store.userConsents,
    rolloutPercentages: store.rolloutPercentages,
    costStatus: store.costStatus,
    safetyStatus: store.safetyStatus,
    healthStatus: store.healthStatus,
    emergencyDisable: store.emergencyDisable,
    updateRollout: store.updateRolloutPercentage,
    refreshMetrics: store.refreshMetrics
  };
}

/**
 * Feature Flag Context Hook
 */
export interface FeatureFlagContextResult {
  readonly hasAnyCloudFeatures: boolean;
  readonly hasAnyPremiumFeatures: boolean;
  readonly hasAnyExperimentalFeatures: boolean;
  readonly enabledFeaturesCount: number;
  readonly totalFeaturesCount: number;
  readonly adoptionPercentage: number;
  readonly canAffordMoreFeatures: boolean;
  readonly nextRecommendedFeature: keyof P0CloudFeatureFlags | null;
}

export function useFeatureFlagContext(): FeatureFlagContextResult {
  const { flags, metadata, costStatus, evaluateFlag } = useFeatureFlagStore();

  const categoryCounts = useMemo(() => {
    const counts = { core: 0, premium: 0, experimental: 0, enterprise: 0 };
    const enabled = { core: 0, premium: 0, experimental: 0, enterprise: 0 };

    Object.entries(metadata).forEach(([key, meta]) => {
      counts[meta.category]++;
      if (evaluateFlag(key as keyof P0CloudFeatureFlags)) {
        enabled[meta.category]++;
      }
    });

    return { counts, enabled };
  }, [metadata, evaluateFlag]);

  const enabledFeaturesCount = Object.keys(flags).filter(key => 
    evaluateFlag(key as keyof P0CloudFeatureFlags)
  ).length;

  const totalFeaturesCount = Object.keys(flags).length;
  const adoptionPercentage = (enabledFeaturesCount / totalFeaturesCount) * 100;

  const hasAnyCloudFeatures = categoryCounts.enabled.core > 0 || categoryCounts.enabled.premium > 0;
  const hasAnyPremiumFeatures = categoryCounts.enabled.premium > 0;
  const hasAnyExperimentalFeatures = categoryCounts.enabled.experimental > 0;

  const canAffordMoreFeatures = costStatus.budgetRemaining > 0.3; // 30% budget remaining

  const nextRecommendedFeature = useMemo(() => {
    // Find the next logical feature to recommend based on current usage
    const enabledFlags = Object.keys(flags).filter(key => 
      evaluateFlag(key as keyof P0CloudFeatureFlags)
    ) as (keyof P0CloudFeatureFlags)[];

    if (enabledFlags.length === 0) {
      return 'CLOUD_SYNC_ENABLED'; // Start with core sync
    }

    if (enabledFlags.includes('CLOUD_SYNC_ENABLED') && !enabledFlags.includes('PUSH_NOTIFICATIONS_ENABLED')) {
      return 'PUSH_NOTIFICATIONS_ENABLED';
    }

    if (enabledFlags.includes('CLOUD_SYNC_ENABLED') && !enabledFlags.includes('BACKUP_RESTORE_ENABLED')) {
      return 'BACKUP_RESTORE_ENABLED';
    }

    return null;
  }, [flags, evaluateFlag]);

  return {
    hasAnyCloudFeatures,
    hasAnyPremiumFeatures,
    hasAnyExperimentalFeatures,
    enabledFeaturesCount,
    totalFeaturesCount,
    adoptionPercentage,
    canAffordMoreFeatures,
    nextRecommendedFeature
  };
}

/**
 * Emergency Feature Control Hook
 */
export interface EmergencyFeatureControlResult {
  readonly emergencyActive: boolean;
  readonly canTriggerEmergency: boolean;
  readonly emergencyDisableAll: () => Promise<void>;
  readonly emergencyEnableOffline: () => Promise<void>;
  readonly validateCrisisAccess: () => Promise<boolean>;
  readonly crisisResponseTime: number;
}

export function useEmergencyFeatureControl(): EmergencyFeatureControlResult {
  const { 
    safetyStatus, 
    emergencyEnableOfflineMode, 
    validateCrisisAccess,
    emergencyDisable
  } = useFeatureFlagStore();

  const [canTrigger, setCanTrigger] = useState(false);

  useEffect(() => {
    // Only allow emergency controls for authorized users/situations
    // This would integrate with user permissions system
    setCanTrigger(true); // Simplified for demo
  }, []);

  const emergencyDisableAll = useCallback(async () => {
    if (!canTrigger) throw new Error('Not authorized for emergency controls');
    
    const allFlags = Object.keys(FEATURE_FLAG_METADATA) as (keyof P0CloudFeatureFlags)[];
    const disablePromises = allFlags
      .filter(flag => FEATURE_FLAG_METADATA[flag].canDisableInCrisis)
      .map(flag => emergencyDisable(flag, 'Emergency shutdown'));
    
    await Promise.all(disablePromises);
  }, [canTrigger, emergencyDisable]);

  return {
    emergencyActive: safetyStatus.emergencyOverrideActive,
    canTriggerEmergency: canTrigger,
    emergencyDisableAll,
    emergencyEnableOffline: emergencyEnableOfflineMode,
    validateCrisisAccess,
    crisisResponseTime: safetyStatus.crisisResponseTime
  };
}

/**
 * Feature Flag Analytics Hook
 */
export interface FeatureFlagAnalyticsResult {
  readonly usageStats: Record<keyof P0CloudFeatureFlags, any>;
  readonly adoptionTrends: any[];
  readonly costTrends: any[];
  readonly satisfactionScores: Record<keyof P0CloudFeatureFlags, number>;
  readonly reportUsage: (flag: keyof P0CloudFeatureFlags, action: string) => void;
}

export function useFeatureFlagAnalytics(): FeatureFlagAnalyticsResult {
  const { getFeatureUsage } = useFeatureFlagStore();

  const usageStats = useMemo(() => {
    const stats = {} as Record<keyof P0CloudFeatureFlags, any>;
    Object.keys(FEATURE_FLAG_METADATA).forEach(key => {
      stats[key as keyof P0CloudFeatureFlags] = getFeatureUsage(key as keyof P0CloudFeatureFlags);
    });
    return stats;
  }, [getFeatureUsage]);

  const reportUsage = useCallback((flag: keyof P0CloudFeatureFlags, action: string) => {
    // This would integrate with analytics service
    console.log(`Feature usage: ${flag} - ${action}`);
  }, []);

  return {
    usageStats,
    adoptionTrends: [], // Would be populated by analytics service
    costTrends: [], // Would be populated by cost monitoring
    satisfactionScores: {} as Record<keyof P0CloudFeatureFlags, number>,
    reportUsage
  };
}