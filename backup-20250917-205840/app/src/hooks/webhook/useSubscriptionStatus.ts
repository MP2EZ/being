/**
 * Real-Time Subscription Status Hook for FullMind MBCT App
 *
 * Real-time subscription state management with:
 * - Live subscription status synchronization
 * - Crisis-safe state updates
 * - Therapeutic feature access control
 * - Grace period tracking
 * - Emergency access management
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { WebhookEvent, SubscriptionUpdatedEvent, SubscriptionDeletedEvent, SubscriptionTrialEndingEvent } from '../../types/webhooks/webhook-events';
import { CrisisLevel, GracePeriodState } from '../../types/webhooks/crisis-safety-types';
import { TherapeuticMessage, buildTherapeuticMessage, MessageContext } from '../../types/webhooks/therapeutic-messaging';
import { PerformanceMetric } from '../../types/webhooks/performance-monitoring';
import { usePaymentStore } from '../../store/paymentStore';
import { useWebhookProcessor } from './useWebhookProcessor';

export interface SubscriptionStatusState {
  status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'paused' | 'trialing' | 'unpaid' | 'emergency_access';
  subscriptionId: string | null;
  customerId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  trialStart: Date | null;
  trialEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  lastUpdated: Date;
  realTimeUpdatesEnabled: boolean;
  gracePeriod: GracePeriodState | null;
  emergencyAccess: boolean;
  therapeuticFeatures: {
    available: string[];
    restricted: string[];
    emergency: string[];
  };
  tier: {
    current: string;
    features: string[];
    limitations: string[];
  };
}

export interface SubscriptionFeatureAccess {
  featureId: string;
  available: boolean;
  reason: string;
  gracePeriodProtected: boolean;
  emergencyAccessible: boolean;
  therapeuticPriority: 'essential' | 'important' | 'nice_to_have';
}

export interface SubscriptionStatusAPI {
  // Subscription Event Handlers
  handleSubscriptionUpdated: (event: SubscriptionUpdatedEvent) => Promise<void>;
  handleSubscriptionDeleted: (event: SubscriptionDeletedEvent) => Promise<void>;
  handleTrialWillEnd: (event: SubscriptionTrialEndingEvent) => Promise<void>;

  // Status Queries
  getSubscriptionStatus: () => SubscriptionStatusState;
  isFeatureAvailable: (featureId: string) => SubscriptionFeatureAccess;
  getAvailableFeatures: () => SubscriptionFeatureAccess[];
  getTierInformation: () => { current: string; features: string[]; limitations: string[] };

  // Grace Period Management
  getGracePeriodStatus: () => GracePeriodState | null;
  calculateGracePeriodRemaining: () => number; // days
  isInGracePeriod: () => boolean;

  // Emergency Access
  hasEmergencyAccess: () => boolean;
  getEmergencyFeatures: () => string[];
  requestEmergencyAccess: (reason: string) => Promise<boolean>;

  // Real-Time Updates
  enableRealTimeUpdates: () => void;
  disableRealTimeUpdates: () => void;
  forceStatusSync: () => Promise<void>;
  getLastSyncTime: () => Date;

  // Therapeutic Continuity
  assessTherapeuticImpact: (newStatus: string) => Promise<{
    continuityThreatened: boolean;
    recommendedActions: string[];
    crisisLevel: CrisisLevel;
  }>;
  protectTherapeuticAccess: () => Promise<void>;

  // Crisis Safety
  activateEmergencyProtocols: (level: CrisisLevel) => Promise<void>;
  getTherapeuticAccessReport: () => Promise<any>;
}

const THERAPEUTIC_FEATURES = {
  essential: [
    'crisis_resources',
    'emergency_contacts',
    'breathing_exercises',
    'crisis_hotline_access',
    'safety_planning',
    'immediate_support'
  ],
  important: [
    'mindfulness_exercises',
    'body_scan_meditations',
    'assessment_tools',
    'progress_tracking',
    'guided_meditations',
    'therapeutic_content'
  ],
  nice_to_have: [
    'advanced_analytics',
    'premium_content',
    'customization_options',
    'export_features',
    'social_features',
    'advanced_reporting'
  ],
};

const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    features: ['basic_breathing', 'crisis_resources', 'limited_content'],
    limitations: ['limited_sessions', 'basic_support'],
  },
  basic: {
    name: 'Basic',
    features: ['all_breathing', 'full_crisis_support', 'basic_analytics'],
    limitations: ['limited_advanced_features'],
  },
  premium: {
    name: 'Premium',
    features: ['all_features', 'advanced_analytics', 'priority_support'],
    limitations: [],
  },
  emergency_access: {
    name: 'Emergency Access',
    features: ['crisis_resources', 'emergency_contacts', 'breathing_exercises', 'safety_planning'],
    limitations: ['temporary_access'],
  },
};

/**
 * Real-Time Subscription Status Hook
 */
export const useSubscriptionStatus = (): SubscriptionStatusAPI => {
  const [state, setState] = useState<SubscriptionStatusState>({
    status: 'incomplete',
    subscriptionId: null,
    customerId: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    trialStart: null,
    trialEnd: null,
    cancelAtPeriodEnd: false,
    lastUpdated: new Date(),
    realTimeUpdatesEnabled: true,
    gracePeriod: null,
    emergencyAccess: false,
    therapeuticFeatures: {
      available: THERAPEUTIC_FEATURES.essential,
      restricted: [],
      emergency: THERAPEUTIC_FEATURES.essential,
    },
    tier: {
      current: 'free',
      features: SUBSCRIPTION_TIERS.free.features,
      limitations: SUBSCRIPTION_TIERS.free.limitations,
    },
  });

  const syncTimer = useRef<NodeJS.Timeout | null>(null);
  const performanceMetrics = useRef<PerformanceMetric[]>([]);

  // External dependencies
  const paymentStore = usePaymentStore();
  const webhookProcessor = useWebhookProcessor();

  /**
   * Subscription Updated Handler
   */
  const handleSubscriptionUpdated = useCallback(async (event: SubscriptionUpdatedEvent): Promise<void> => {
    const startTime = Date.now();

    try {
      const subscription = event.data.object;

      // Extract subscription data
      const newState: Partial<SubscriptionStatusState> = {
        status: subscription.status as any,
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        lastUpdated: new Date(),
      };

      // Determine tier based on subscription
      const tierName = determineTierFromSubscription(subscription);
      newState.tier = {
        current: tierName,
        features: SUBSCRIPTION_TIERS[tierName as keyof typeof SUBSCRIPTION_TIERS]?.features || [],
        limitations: SUBSCRIPTION_TIERS[tierName as keyof typeof SUBSCRIPTION_TIERS]?.limitations || [],
      };

      // Assess therapeutic impact
      const therapeuticImpact = await assessTherapeuticImpact(subscription.status);

      // Handle status changes that might affect therapeutic access
      if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
        // Activate grace period to protect therapeutic access
        const gracePeriod: GracePeriodState = {
          active: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          remainingDays: 7,
          reason: 'payment_failure',
          therapeuticFeatures: THERAPEUTIC_FEATURES.essential,
          emergencyAccess: therapeuticImpact.crisisLevel !== 'none',
        };

        newState.gracePeriod = gracePeriod;
      }

      if (subscription.status === 'canceled') {
        // Assess if emergency access should be activated
        if (therapeuticImpact.continuityThreatened) {
          await activateEmergencyProtocols(therapeuticImpact.crisisLevel);
        }
      }

      // Update therapeutic features based on new subscription
      newState.therapeuticFeatures = calculateAvailableFeatures(tierName, newState.gracePeriod, state.emergencyAccess);

      setState(prev => ({ ...prev, ...newState }));

      // Update payment store
      await paymentStore.updateSubscriptionStateFromBilling({
        subscription_id: subscription.id,
        status: subscription.status,
        tier: tierName,
        grace_period: newState.gracePeriod?.active || false,
      });

      // Generate therapeutic message if needed
      if (therapeuticImpact.continuityThreatened) {
        await generateStatusChangeMessage(subscription.status, therapeuticImpact.crisisLevel);
      }

      // Record performance metric
      performanceMetrics.current.push({
        timestamp: startTime,
        category: 'subscription_update',
        operation: 'handle_subscription_updated',
        duration: Date.now() - startTime,
        success: true,
        crisisMode: therapeuticImpact.crisisLevel !== 'none',
        therapeuticImpact: therapeuticImpact.continuityThreatened,
      });

      console.log(`Subscription updated: ${subscription.status} (tier: ${tierName})`);

    } catch (error) {
      console.error('Error handling subscription update:', error);

      // Protect therapeutic access even on error
      await protectTherapeuticAccess();
    }
  }, [paymentStore, assessTherapeuticImpact, activateEmergencyProtocols, protectTherapeuticAccess, state.emergencyAccess]);

  /**
   * Subscription Deleted Handler
   */
  const handleSubscriptionDeleted = useCallback(async (event: SubscriptionDeletedEvent): Promise<void> => {
    const startTime = Date.now();

    try {
      // Assess therapeutic impact of cancellation
      const therapeuticImpact = await assessTherapeuticImpact('canceled');

      // Always activate grace period for canceled subscriptions
      const gracePeriod: GracePeriodState = {
        active: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        remainingDays: 7,
        reason: 'subscription_cancelled',
        therapeuticFeatures: THERAPEUTIC_FEATURES.essential,
        emergencyAccess: therapeuticImpact.crisisLevel !== 'none',
      };

      setState(prev => ({
        ...prev,
        status: 'canceled',
        gracePeriod,
        therapeuticFeatures: calculateAvailableFeatures('free', gracePeriod, prev.emergencyAccess),
        lastUpdated: new Date(),
      }));

      // Activate crisis protection if needed
      if (therapeuticImpact.crisisLevel !== 'none') {
        await activateEmergencyProtocols(therapeuticImpact.crisisLevel);
      }

      // Generate therapeutic cancellation message
      await generateStatusChangeMessage('canceled', therapeuticImpact.crisisLevel);

      console.log('Subscription canceled - grace period activated');

    } catch (error) {
      console.error('Error handling subscription deletion:', error);
      await protectTherapeuticAccess();
    }
  }, [assessTherapeuticImpact, activateEmergencyProtocols, protectTherapeuticAccess]);

  /**
   * Trial Will End Handler
   */
  const handleTrialWillEnd = useCallback(async (event: SubscriptionTrialEndingEvent): Promise<void> => {
    try {
      const subscription = event.data.object;
      const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
      const daysRemaining = trialEnd ? Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

      setState(prev => ({
        ...prev,
        trialEnd,
        lastUpdated: new Date(),
      }));

      // Generate gentle trial ending message
      const messageContext: MessageContext = {
        userState: 'stable',
        urgency: 'low',
        therapeuticPhase: 'engagement',
      };

      const message = buildTherapeuticMessage(
        'TRIAL_ENDING_GENTLE',
        { trialDaysRemaining: daysRemaining.toString() },
        messageContext,
        'none'
      );

      console.log('Trial ending message:', message.content.message);

    } catch (error) {
      console.error('Error handling trial will end:', error);
    }
  }, []);

  /**
   * Feature Access Management
   */
  const isFeatureAvailable = useCallback((featureId: string): SubscriptionFeatureAccess => {
    const isInEssential = THERAPEUTIC_FEATURES.essential.includes(featureId);
    const isInImportant = THERAPEUTIC_FEATURES.important.includes(featureId);
    const isInNiceToHave = THERAPEUTIC_FEATURES.nice_to_have.includes(featureId);

    let therapeuticPriority: 'essential' | 'important' | 'nice_to_have' = 'nice_to_have';
    if (isInEssential) therapeuticPriority = 'essential';
    else if (isInImportant) therapeuticPriority = 'important';

    // Check various access paths
    const tierIncludes = state.tier.features.includes(featureId);
    const gracePeriodProtected = state.gracePeriod?.active && isInEssential;
    const emergencyAccessible = state.emergencyAccess && isInEssential;

    const available = tierIncludes || gracePeriodProtected || emergencyAccessible;

    let reason = 'Not available in current tier';
    if (available) {
      if (tierIncludes) reason = 'Included in subscription tier';
      else if (gracePeriodProtected) reason = 'Protected by grace period';
      else if (emergencyAccessible) reason = 'Available via emergency access';
    }

    return {
      featureId,
      available,
      reason,
      gracePeriodProtected: gracePeriodProtected || false,
      emergencyAccessible: emergencyAccessible || false,
      therapeuticPriority,
    };
  }, [state]);

  const getAvailableFeatures = useCallback((): SubscriptionFeatureAccess[] => {
    const allFeatures = [
      ...THERAPEUTIC_FEATURES.essential,
      ...THERAPEUTIC_FEATURES.important,
      ...THERAPEUTIC_FEATURES.nice_to_have,
    ];

    return allFeatures.map(featureId => isFeatureAvailable(featureId));
  }, [isFeatureAvailable]);

  const getTierInformation = useCallback(() => state.tier, [state.tier]);

  /**
   * Grace Period Management
   */
  const getGracePeriodStatus = useCallback((): GracePeriodState | null => state.gracePeriod, [state.gracePeriod]);

  const calculateGracePeriodRemaining = useCallback((): number => {
    if (!state.gracePeriod?.active) return 0;
    return Math.max(0, Math.ceil((state.gracePeriod.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  }, [state.gracePeriod]);

  const isInGracePeriod = useCallback((): boolean => {
    return state.gracePeriod?.active && calculateGracePeriodRemaining() > 0;
  }, [state.gracePeriod, calculateGracePeriodRemaining]);

  /**
   * Emergency Access Management
   */
  const hasEmergencyAccess = useCallback((): boolean => state.emergencyAccess, [state.emergencyAccess]);

  const getEmergencyFeatures = useCallback((): string[] => {
    return state.emergencyAccess ? THERAPEUTIC_FEATURES.essential : [];
  }, [state.emergencyAccess]);

  const requestEmergencyAccess = useCallback(async (reason: string): Promise<boolean> => {
    try {
      setState(prev => ({
        ...prev,
        emergencyAccess: true,
        therapeuticFeatures: {
          ...prev.therapeuticFeatures,
          available: [...prev.therapeuticFeatures.available, ...THERAPEUTIC_FEATURES.essential],
          emergency: THERAPEUTIC_FEATURES.essential,
        },
        lastUpdated: new Date(),
      }));

      await webhookProcessor.grantEmergencyAccess(reason);
      return true;
    } catch (error) {
      console.error('Error requesting emergency access:', error);
      return false;
    }
  }, [webhookProcessor]);

  /**
   * Real-Time Updates
   */
  const enableRealTimeUpdates = useCallback((): void => {
    setState(prev => ({ ...prev, realTimeUpdatesEnabled: true }));

    // Start periodic sync
    if (syncTimer.current) clearInterval(syncTimer.current);
    syncTimer.current = setInterval(async () => {
      await forceStatusSync();
    }, 30000); // 30 seconds
  }, []);

  const disableRealTimeUpdates = useCallback((): void => {
    setState(prev => ({ ...prev, realTimeUpdatesEnabled: false }));

    if (syncTimer.current) {
      clearInterval(syncTimer.current);
      syncTimer.current = null;
    }
  }, []);

  const forceStatusSync = useCallback(async (): Promise<void> => {
    try {
      // In a real implementation, this would fetch current subscription status
      setState(prev => ({ ...prev, lastUpdated: new Date() }));
    } catch (error) {
      console.error('Error syncing subscription status:', error);
    }
  }, []);

  const getLastSyncTime = useCallback((): Date => state.lastUpdated, [state.lastUpdated]);

  /**
   * Therapeutic Continuity
   */
  const assessTherapeuticImpact = useCallback(async (newStatus: string): Promise<{
    continuityThreatened: boolean;
    recommendedActions: string[];
    crisisLevel: CrisisLevel;
  }> => {
    const threateningStatuses = ['canceled', 'past_due', 'unpaid', 'incomplete_expired'];
    const continuityThreatened = threateningStatuses.includes(newStatus);

    let crisisLevel: CrisisLevel = 'none';
    if (newStatus === 'canceled') crisisLevel = 'medium';
    if (newStatus === 'past_due' || newStatus === 'unpaid') crisisLevel = 'low';

    const recommendedActions = [];
    if (continuityThreatened) {
      recommendedActions.push('Activate grace period');
      recommendedActions.push('Ensure therapeutic content access');
      if (crisisLevel !== 'none') {
        recommendedActions.push('Monitor for crisis indicators');
        recommendedActions.push('Activate emergency protocols if needed');
      }
    }

    return {
      continuityThreatened,
      recommendedActions,
      crisisLevel,
    };
  }, []);

  const protectTherapeuticAccess = useCallback(async (): Promise<void> => {
    setState(prev => ({
      ...prev,
      therapeuticFeatures: {
        available: [...THERAPEUTIC_FEATURES.essential, ...THERAPEUTIC_FEATURES.important],
        restricted: [],
        emergency: THERAPEUTIC_FEATURES.essential,
      },
      gracePeriod: prev.gracePeriod || {
        active: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        remainingDays: 7,
        reason: 'therapeutic_protection',
        therapeuticFeatures: THERAPEUTIC_FEATURES.essential,
        emergencyAccess: true,
      },
      lastUpdated: new Date(),
    }));

    console.log('Therapeutic access protected');
  }, []);

  /**
   * Crisis Safety
   */
  const activateEmergencyProtocols = useCallback(async (level: CrisisLevel): Promise<void> => {
    setState(prev => ({
      ...prev,
      emergencyAccess: true,
      status: 'emergency_access',
      therapeuticFeatures: {
        available: THERAPEUTIC_FEATURES.essential,
        restricted: [],
        emergency: THERAPEUTIC_FEATURES.essential,
      },
      tier: {
        current: 'emergency_access',
        features: SUBSCRIPTION_TIERS.emergency_access.features,
        limitations: SUBSCRIPTION_TIERS.emergency_access.limitations,
      },
      lastUpdated: new Date(),
    }));

    await webhookProcessor.activateCrisisMode(level);
    console.log(`Emergency protocols activated: level ${level}`);
  }, [webhookProcessor]);

  const getTherapeuticAccessReport = useCallback(async (): Promise<any> => {
    return {
      currentStatus: state.status,
      therapeuticAccessProtected: state.therapeuticFeatures.available.length > 0,
      gracePeriodActive: state.gracePeriod?.active || false,
      gracePeriodRemaining: calculateGracePeriodRemaining(),
      emergencyAccessActive: state.emergencyAccess,
      essentialFeaturesAvailable: THERAPEUTIC_FEATURES.essential.every(feature =>
        state.therapeuticFeatures.available.includes(feature)
      ),
      crisisResourcesAvailable: state.therapeuticFeatures.available.includes('crisis_resources'),
      lastUpdated: state.lastUpdated,
    };
  }, [state, calculateGracePeriodRemaining]);

  /**
   * Utility Functions
   */
  const determineTierFromSubscription = (subscription: any): string => {
    // In a real implementation, this would map subscription price/product to tier
    if (subscription.status === 'trialing') return 'premium';
    if (subscription.status === 'active') return 'premium';
    return 'free';
  };

  const calculateAvailableFeatures = (
    tier: string,
    gracePeriod: GracePeriodState | null,
    emergencyAccess: boolean
  ) => {
    const tierFeatures = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS]?.features || [];
    let available = [...tierFeatures];

    if (gracePeriod?.active) {
      available = [...available, ...THERAPEUTIC_FEATURES.essential];
    }

    if (emergencyAccess) {
      available = [...available, ...THERAPEUTIC_FEATURES.essential];
    }

    // Remove duplicates
    available = [...new Set(available)];

    return {
      available,
      restricted: THERAPEUTIC_FEATURES.nice_to_have.filter(feature => !available.includes(feature)),
      emergency: emergencyAccess ? THERAPEUTIC_FEATURES.essential : [],
    };
  };

  const generateStatusChangeMessage = async (status: string, crisisLevel: CrisisLevel) => {
    const messageContext: MessageContext = {
      userState: crisisLevel !== 'none' ? 'crisis' : 'stable',
      urgency: crisisLevel !== 'none' ? 'high' : 'moderate',
      therapeuticPhase: 'crisis_support',
    };

    if (status === 'canceled') {
      const message = buildTherapeuticMessage(
        'GRACE_PERIOD_START',
        { gracePeriodDays: '7' },
        messageContext,
        crisisLevel
      );
      console.log('Cancellation message:', message.content.message);
    }
  };

  // State getters
  const getSubscriptionStatus = useCallback((): SubscriptionStatusState => state, [state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncTimer.current) {
        clearInterval(syncTimer.current);
      }
    };
  }, []);

  return {
    // Subscription Event Handlers
    handleSubscriptionUpdated,
    handleSubscriptionDeleted,
    handleTrialWillEnd,

    // Status Queries
    getSubscriptionStatus,
    isFeatureAvailable,
    getAvailableFeatures,
    getTierInformation,

    // Grace Period Management
    getGracePeriodStatus,
    calculateGracePeriodRemaining,
    isInGracePeriod,

    // Emergency Access
    hasEmergencyAccess,
    getEmergencyFeatures,
    requestEmergencyAccess,

    // Real-Time Updates
    enableRealTimeUpdates,
    disableRealTimeUpdates,
    forceStatusSync,
    getLastSyncTime,

    // Therapeutic Continuity
    assessTherapeuticImpact,
    protectTherapeuticAccess,

    // Crisis Safety
    activateEmergencyProtocols,
    getTherapeuticAccessReport,
  };
};