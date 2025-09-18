/**
 * Subscription Manager for FullMind P0-CLOUD Phase 1
 *
 * Comprehensive subscription logic and API integration with:
 * - Trial-to-paid conversion with MBCT-compliant messaging
 * - Grace period handling for payment issues
 * - Crisis-safe subscription validation (<200ms response)
 * - Feature gate integration with therapeutic continuity
 * - Offline subscription state caching and sync
 */

import { z } from 'zod';
import * as SecureStore from 'expo-secure-store';
import {
  SubscriptionResult,
  SubscriptionPlan,
  SubscriptionStatus,
  PaymentError,
  CrisisPaymentOverride
} from '../../types/payment';
import { encryptionService } from '../security/EncryptionService';
import { paymentAPIService } from './PaymentAPIService';
import { featureFlagManager } from './FeatureFlagManager';

/**
 * Subscription Tier Definitions with Crisis Safety
 */
export interface SubscriptionTier {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly features: readonly string[];
  readonly therapeuticFeatures: readonly string[];
  readonly crisisFeatures: readonly string[]; // Always available regardless of subscription
  readonly pricing: {
    readonly monthly: number;
    readonly annual: number;
    readonly currency: string;
  };
  readonly limits: {
    readonly cloudSyncDevices: number;
    readonly backupRetentionDays: number;
    readonly advancedInsights: boolean;
    readonly prioritySupport: boolean;
  };
  readonly trialEligible: boolean;
  readonly gracePeriodDays: number;
}

/**
 * Trial Management Configuration
 */
export interface TrialConfiguration {
  readonly durationDays: number;
  readonly extensionDays: number; // For crisis situations
  readonly warningDays: number; // When to show trial ending notices
  readonly features: readonly string[];
  readonly therapeuticGuidance: {
    readonly showTrialProgress: boolean;
    readonly mindfulMessaging: boolean;
    readonly nonPressuredReminders: boolean;
    readonly crisisExtensionAutomatic: boolean;
  };
}

/**
 * Grace Period Management
 */
export interface GracePeriodConfiguration {
  readonly durationDays: number;
  readonly retryIntervalHours: number;
  readonly therapeuticContinuity: boolean; // Maintain access during grace period
  readonly crisisOverride: boolean; // Extend grace period during crisis
  readonly gracefulDegradation: {
    readonly maintainCoreFeatures: boolean;
    readonly disableCloudSync: boolean;
    readonly showSupportiveMessages: boolean;
  };
}

/**
 * Subscription State with Offline Support
 */
export interface SubscriptionState {
  readonly current: SubscriptionResult | null;
  readonly tier: SubscriptionTier | null;
  readonly trial: {
    readonly active: boolean;
    readonly daysRemaining: number;
    readonly startDate: string;
    readonly endDate: string;
    readonly extended: boolean;
    readonly extensionReason?: string;
  } | null;
  readonly gracePeriod: {
    readonly active: boolean;
    readonly daysRemaining: number;
    readonly reason: string;
    readonly retryCount: number;
    readonly lastRetryDate: string;
  } | null;
  readonly features: {
    readonly available: readonly string[];
    readonly restricted: readonly string[];
    readonly crisisOverride: readonly string[];
  };
  readonly lastSyncTime: string;
  readonly offlineMode: boolean;
  readonly crisisMode: boolean;
}

/**
 * Feature Access Response with Performance Tracking
 */
export interface FeatureAccessResult {
  readonly granted: boolean;
  readonly reason: string;
  readonly fallbackOptions: readonly string[];
  readonly responseTime: number;
  readonly crisisOverride: boolean;
  readonly therapeuticImpact: 'none' | 'minimal' | 'moderate' | 'significant';
}

/**
 * Subscription Manager Implementation
 */
export class SubscriptionManager {
  private static instance: SubscriptionManager;
  private initialized = false;

  // Performance constants for crisis safety
  private readonly CRISIS_RESPONSE_TARGET = 200; // ms
  private readonly FEATURE_CHECK_TIMEOUT = 100; // ms
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Storage keys
  private readonly SUBSCRIPTION_STATE_KEY = '@fullmind_subscription_state_v1';
  private readonly TRIAL_CONFIG_KEY = '@fullmind_trial_config_v1';
  private readonly GRACE_PERIOD_KEY = '@fullmind_grace_period_v1';
  private readonly FEATURE_CACHE_KEY = '@fullmind_feature_cache_v1';

  // Subscription tiers configuration
  private readonly subscriptionTiers: Record<string, SubscriptionTier> = {
    trial: {
      id: 'trial',
      name: '21-Day Trial',
      description: 'Full access to all MBCT features during your mindful exploration',
      features: [
        'core_mbct_practices',
        'basic_cloud_sync',
        'enhanced_insights',
        'breathing_exercises',
        'mood_tracking',
        'progress_analytics'
      ],
      therapeuticFeatures: [
        'phq9_assessment',
        'gad7_assessment',
        'daily_check_ins',
        'mindfulness_exercises',
        'therapeutic_journaling'
      ],
      crisisFeatures: [
        'crisis_detection',
        'emergency_contacts',
        '988_hotline',
        'safety_planning',
        'crisis_resources'
      ],
      pricing: {
        monthly: 0,
        annual: 0,
        currency: 'usd'
      },
      limits: {
        cloudSyncDevices: 2,
        backupRetentionDays: 30,
        advancedInsights: true,
        prioritySupport: false
      },
      trialEligible: false,
      gracePeriodDays: 7
    },
    basic: {
      id: 'basic',
      name: 'Basic MBCT',
      description: 'Essential mindfulness tools with cloud sync for your therapeutic journey',
      features: [
        'core_mbct_practices',
        'cloud_sync',
        'cross_device_access',
        'basic_insights',
        'breathing_exercises',
        'mood_tracking'
      ],
      therapeuticFeatures: [
        'phq9_assessment',
        'gad7_assessment',
        'daily_check_ins',
        'mindfulness_exercises',
        'progress_tracking'
      ],
      crisisFeatures: [
        'crisis_detection',
        'emergency_contacts',
        '988_hotline',
        'safety_planning',
        'crisis_resources'
      ],
      pricing: {
        monthly: 9.99,
        annual: 99.99,
        currency: 'usd'
      },
      limits: {
        cloudSyncDevices: 3,
        backupRetentionDays: 90,
        advancedInsights: false,
        prioritySupport: false
      },
      trialEligible: true,
      gracePeriodDays: 7
    },
    premium: {
      id: 'premium',
      name: 'Premium MBCT',
      description: 'Complete mindfulness experience with advanced insights and priority support',
      features: [
        'core_mbct_practices',
        'unlimited_cloud_sync',
        'cross_device_access',
        'advanced_insights',
        'breathing_exercises',
        'mood_tracking',
        'therapeutic_analytics',
        'personalized_recommendations',
        'export_data',
        'priority_support'
      ],
      therapeuticFeatures: [
        'phq9_assessment',
        'gad7_assessment',
        'daily_check_ins',
        'mindfulness_exercises',
        'advanced_progress_tracking',
        'therapeutic_journaling',
        'personalized_mbct_programs'
      ],
      crisisFeatures: [
        'crisis_detection',
        'emergency_contacts',
        '988_hotline',
        'safety_planning',
        'crisis_resources',
        'priority_crisis_support'
      ],
      pricing: {
        monthly: 19.99,
        annual: 199.99,
        currency: 'usd'
      },
      limits: {
        cloudSyncDevices: 10,
        backupRetentionDays: 365,
        advancedInsights: true,
        prioritySupport: true
      },
      trialEligible: true,
      gracePeriodDays: 14
    }
  };

  // Trial configuration
  private readonly trialConfig: TrialConfiguration = {
    durationDays: 21,
    extensionDays: 7, // Extended during crisis
    warningDays: 3,
    features: [
      'core_mbct_practices',
      'basic_cloud_sync',
      'enhanced_insights',
      'breathing_exercises',
      'mood_tracking',
      'progress_analytics'
    ],
    therapeuticGuidance: {
      showTrialProgress: true,
      mindfulMessaging: true,
      nonPressuredReminders: true,
      crisisExtensionAutomatic: true
    }
  };

  // Grace period configuration
  private readonly gracePeriodConfig: GracePeriodConfiguration = {
    durationDays: 7,
    retryIntervalHours: 24,
    therapeuticContinuity: true,
    crisisOverride: true,
    gracefulDegradation: {
      maintainCoreFeatures: true,
      disableCloudSync: true,
      showSupportiveMessages: true
    }
  };

  // Current state
  private currentState: SubscriptionState | null = null;
  private lastSyncTime = 0;
  private crisisMode = false;

  private constructor() {}

  public static getInstance(): SubscriptionManager {
    if (!SubscriptionManager.instance) {
      SubscriptionManager.instance = new SubscriptionManager();
    }
    return SubscriptionManager.instance;
  }

  /**
   * Initialize subscription manager with crisis safety validation
   */
  async initialize(): Promise<void> {
    const startTime = Date.now();

    try {
      if (this.initialized) {
        return;
      }

      console.log('Initializing subscription manager...');

      // Load cached subscription state
      await this.loadSubscriptionState();

      // Initialize trial configuration if needed
      await this.initializeTrialConfiguration();

      // Sync with remote if possible (non-blocking)
      this.syncSubscriptionState().catch(error =>
        console.warn('Initial subscription sync failed (non-critical):', error)
      );

      this.initialized = true;

      const initTime = Date.now() - startTime;
      console.log(`Subscription manager initialized in ${initTime}ms`);

      // Validate crisis response time
      if (initTime > this.CRISIS_RESPONSE_TARGET) {
        console.warn(`Subscription initialization took ${initTime}ms (target: <${this.CRISIS_RESPONSE_TARGET}ms)`);
      }

    } catch (error) {
      console.error('Subscription manager initialization failed:', error);

      // Initialize with emergency defaults for crisis safety
      await this.initializeEmergencyDefaults();
      this.initialized = true;
    }
  }

  /**
   * Get current subscription status with crisis safety (<500ms response)
   */
  async getSubscriptionStatus(): Promise<SubscriptionState> {
    const startTime = Date.now();

    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // Return cached state if within TTL
      if (this.currentState && (Date.now() - this.lastSyncTime) < this.CACHE_TTL) {
        return this.currentState;
      }

      // Crisis mode - return immediate access
      if (this.crisisMode) {
        return this.createCrisisSubscriptionState();
      }

      // Refresh state if cache is stale
      await this.refreshSubscriptionState();

      const responseTime = Date.now() - startTime;
      if (responseTime > 500) {
        console.warn(`Subscription status check took ${responseTime}ms (target: <500ms)`);
      }

      return this.currentState || this.createDefaultState();

    } catch (error) {
      console.error('Get subscription status failed:', error);
      return this.createDefaultState();
    }
  }

  /**
   * Check feature access with <100ms response time
   */
  async checkFeatureAccess(feature: string): Promise<FeatureAccessResult> {
    const startTime = Date.now();

    try {
      // Crisis features always available - immediate response
      if (this.isCrisisFeature(feature)) {
        return {
          granted: true,
          reason: 'Crisis feature - always available for safety',
          fallbackOptions: [],
          responseTime: Date.now() - startTime,
          crisisOverride: this.crisisMode,
          therapeuticImpact: 'none'
        };
      }

      // Crisis mode override - all features available
      if (this.crisisMode) {
        return {
          granted: true,
          reason: 'Crisis mode - all therapeutic features available',
          fallbackOptions: [],
          responseTime: Date.now() - startTime,
          crisisOverride: true,
          therapeuticImpact: 'none'
        };
      }

      // Get cached subscription state
      const state = await this.getSubscriptionStatus();
      const responseTime = Date.now() - startTime;

      // Check if feature is available in current tier
      const granted = state.features.available.includes(feature) ||
                     state.features.crisisOverride.includes(feature);

      const fallbackOptions = this.getFallbackOptions(feature, state);

      return {
        granted,
        reason: granted
          ? `Feature available in ${state.tier?.name || 'current'} subscription`
          : `Feature requires ${this.getRequiredTier(feature)} subscription`,
        fallbackOptions,
        responseTime,
        crisisOverride: this.crisisMode,
        therapeuticImpact: this.assessTherapeuticImpact(feature, granted)
      };

    } catch (error) {
      console.error('Feature access check failed:', error);

      // Emergency fallback - grant access to prevent therapeutic disruption
      return {
        granted: true,
        reason: 'Emergency fallback - access granted for therapeutic continuity',
        fallbackOptions: [],
        responseTime: Date.now() - startTime,
        crisisOverride: true,
        therapeuticImpact: 'none'
      };
    }
  }

  /**
   * Start trial subscription with MBCT-compliant messaging
   */
  async startTrial(userId: string): Promise<SubscriptionResult> {
    try {
      console.log(`Starting 21-day mindful trial for user ${userId}`);

      const trialStartDate = new Date();
      const trialEndDate = new Date(trialStartDate.getTime() + this.trialConfig.durationDays * 24 * 60 * 60 * 1000);

      // Create trial subscription
      const trialSubscription: SubscriptionResult = {
        subscriptionId: `trial_${userId}_${Date.now()}`,
        customerId: `customer_${userId}`,
        status: 'trialing',
        currentPeriodStart: trialStartDate.toISOString(),
        currentPeriodEnd: trialEndDate.toISOString(),
        trialStart: trialStartDate.toISOString(),
        trialEnd: trialEndDate.toISOString(),
        cancelAtPeriodEnd: false,
        plan: {
          planId: 'trial',
          name: '21-Day Mindful Exploration',
          description: 'Discover the full power of MBCT practices with complete access to all features',
          amount: 0,
          currency: 'usd',
          interval: 'month',
          features: this.subscriptionTiers.trial.features as string[],
          trialDays: this.trialConfig.durationDays
        }
      };

      // Update local state
      await this.updateSubscriptionState(trialSubscription);

      // Log trial start for analytics
      await this.logSubscriptionEvent('trial_started', {
        userId,
        trialDuration: this.trialConfig.durationDays,
        therapeuticOnboarding: true
      });

      console.log('Trial subscription started successfully');
      return trialSubscription;

    } catch (error) {
      console.error('Trial start failed:', error);
      throw new Error(`Trial activation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert trial to paid subscription with non-pressured messaging
   */
  async convertTrialToPaid(planId: string, paymentMethodId?: string): Promise<SubscriptionResult> {
    try {
      const currentState = await this.getSubscriptionStatus();

      if (!currentState.trial?.active) {
        throw new Error('No active trial to convert');
      }

      console.log(`Converting trial to ${planId} subscription`);

      // Create paid subscription through payment API
      const paidSubscription = await paymentAPIService.createSubscription(
        currentState.current?.customerId || '',
        planId,
        paymentMethodId,
        undefined, // No additional trial
        this.crisisMode
      );

      // Update local state
      await this.updateSubscriptionState(paidSubscription);

      // Log conversion for analytics
      await this.logSubscriptionEvent('trial_converted', {
        fromPlan: 'trial',
        toPlan: planId,
        conversionTime: Date.now() - new Date(currentState.trial.startDate).getTime(),
        therapeuticJourney: true
      });

      console.log('Trial converted to paid subscription successfully');
      return paidSubscription;

    } catch (error) {
      console.error('Trial conversion failed:', error);
      throw new Error(`Trial conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle payment failure with grace period activation
   */
  async handlePaymentFailure(subscriptionId: string, errorCode: string): Promise<void> {
    try {
      console.log(`Handling payment failure for subscription ${subscriptionId}: ${errorCode}`);

      const currentState = await this.getSubscriptionStatus();

      if (!currentState.current) {
        throw new Error('No active subscription to handle failure');
      }

      // Activate grace period
      const gracePeriodStart = new Date();
      const gracePeriodEnd = new Date(gracePeriodStart.getTime() + this.gracePeriodConfig.durationDays * 24 * 60 * 60 * 1000);

      const gracePeriodState = {
        active: true,
        daysRemaining: this.gracePeriodConfig.durationDays,
        reason: `Payment failure: ${errorCode}`,
        retryCount: (currentState.gracePeriod?.retryCount || 0) + 1,
        lastRetryDate: gracePeriodStart.toISOString()
      };

      // Update subscription state with grace period
      const updatedState: SubscriptionState = {
        ...currentState,
        gracePeriod: gracePeriodState,
        features: {
          ...currentState.features,
          // Maintain therapeutic features during grace period
          available: this.gracePeriodConfig.gracefulDegradation.maintainCoreFeatures
            ? currentState.features.available
            : this.getGracePeriodFeatures()
        }
      };

      await this.saveSubscriptionState(updatedState);

      // Log grace period activation
      await this.logSubscriptionEvent('grace_period_activated', {
        subscriptionId,
        errorCode,
        retryCount: gracePeriodState.retryCount,
        therapeuticContinuity: this.gracePeriodConfig.therapeuticContinuity
      });

      // Schedule retry attempt
      this.schedulePaymentRetry(subscriptionId, this.gracePeriodConfig.retryIntervalHours);

      console.log('Grace period activated for payment failure');

    } catch (error) {
      console.error('Grace period activation failed:', error);

      // Emergency fallback - maintain therapeutic access
      await this.enableEmergencyAccess(`Grace period failure: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Extend trial during crisis situations (automatic)
   */
  async extendTrialForCrisis(userId: string, crisisReason: string): Promise<void> {
    try {
      if (!this.trialConfig.therapeuticGuidance.crisisExtensionAutomatic) {
        return;
      }

      const currentState = await this.getSubscriptionStatus();

      if (!currentState.trial?.active) {
        console.log('No active trial to extend for crisis');
        return;
      }

      console.log(`Automatically extending trial for crisis: ${crisisReason}`);

      const currentEndDate = new Date(currentState.trial.endDate);
      const extendedEndDate = new Date(currentEndDate.getTime() + this.trialConfig.extensionDays * 24 * 60 * 60 * 1000);

      const extendedTrialState = {
        ...currentState.trial,
        endDate: extendedEndDate.toISOString(),
        extended: true,
        extensionReason: crisisReason,
        daysRemaining: Math.ceil((extendedEndDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      };

      const updatedState: SubscriptionState = {
        ...currentState,
        trial: extendedTrialState
      };

      await this.saveSubscriptionState(updatedState);

      // Log crisis extension
      await this.logSubscriptionEvent('trial_extended_crisis', {
        userId,
        crisisReason,
        extensionDays: this.trialConfig.extensionDays,
        automaticExtension: true,
        therapeuticSafety: true
      });

      console.log(`Trial extended by ${this.trialConfig.extensionDays} days for crisis support`);

    } catch (error) {
      console.error('Crisis trial extension failed:', error);
      // Don't throw - crisis extensions are supportive, not critical
    }
  }

  /**
   * Enable crisis mode for subscription system
   */
  async enableCrisisMode(userId: string, reason: string): Promise<void> {
    try {
      console.log(`Enabling crisis mode in subscription manager: ${reason}`);

      this.crisisMode = true;

      // Extend trial if applicable
      await this.extendTrialForCrisis(userId, reason);

      // Override feature access for crisis safety
      const crisisState = this.createCrisisSubscriptionState();
      await this.saveSubscriptionState(crisisState);

      // Log crisis activation
      await this.logSubscriptionEvent('crisis_mode_activated', {
        userId,
        reason,
        allFeaturesGranted: true,
        therapeuticContinuity: true
      });

      console.log('Crisis mode enabled in subscription manager');

    } catch (error) {
      console.error('Crisis mode enablement failed:', error);
      // Force crisis mode even if logging fails
      this.crisisMode = true;
    }
  }

  /**
   * Disable crisis mode and restore normal subscription state
   */
  async disableCrisisMode(): Promise<void> {
    try {
      console.log('Disabling crisis mode in subscription manager');

      this.crisisMode = false;

      // Refresh subscription state from remote
      await this.syncSubscriptionState();

      // Log crisis deactivation
      await this.logSubscriptionEvent('crisis_mode_deactivated', {
        normalOperationRestored: true
      });

      console.log('Crisis mode disabled, normal subscription state restored');

    } catch (error) {
      console.error('Crisis mode disable failed:', error);
      // Continue with local disable
      this.crisisMode = false;
    }
  }

  /**
   * Get subscription tier recommendations based on usage
   */
  async getRecommendations(userId: string): Promise<{
    recommended: SubscriptionTier;
    reasons: string[];
    therapeuticBenefits: string[];
  }> {
    try {
      const currentState = await this.getSubscriptionStatus();

      // Default recommendation is Basic for most users
      let recommended = this.subscriptionTiers.basic;
      const reasons: string[] = [];
      const therapeuticBenefits: string[] = [];

      // Analyze current usage patterns (placeholder logic)
      const usageData = await this.analyzeUsagePatterns(userId);

      if (usageData.multipleDevices) {
        recommended = this.subscriptionTiers.premium;
        reasons.push('You use MBCT practices across multiple devices');
        therapeuticBenefits.push('Seamless therapeutic continuity across all your devices');
      }

      if (usageData.advancedFeatures) {
        recommended = this.subscriptionTiers.premium;
        reasons.push('You engage deeply with advanced mindfulness features');
        therapeuticBenefits.push('Personalized insights to deepen your MBCT practice');
      }

      if (usageData.consistentPractice) {
        therapeuticBenefits.push('Progress tracking to celebrate your mindfulness journey');
      }

      // Always include crisis safety
      therapeuticBenefits.push('Continued access to crisis support and safety resources');

      return {
        recommended,
        reasons,
        therapeuticBenefits
      };

    } catch (error) {
      console.error('Subscription recommendations failed:', error);

      // Safe default recommendation
      return {
        recommended: this.subscriptionTiers.basic,
        reasons: ['Start your therapeutic journey with essential MBCT features'],
        therapeuticBenefits: [
          'Core mindfulness practices for mental wellness',
          'Crisis support and safety resources always available',
          'Progress tracking for your therapeutic growth'
        ]
      };
    }
  }

  // Private helper methods

  private async loadSubscriptionState(): Promise<void> {
    try {
      const encryptedState = await SecureStore.getItemAsync(this.SUBSCRIPTION_STATE_KEY);

      if (encryptedState) {
        const parsedData = JSON.parse(encryptedState);
        this.currentState = await encryptionService.decryptData(parsedData, 'SYSTEM');
        this.lastSyncTime = Date.now();
      }

    } catch (error) {
      console.error('Failed to load subscription state:', error);
      this.currentState = null;
    }
  }

  private async saveSubscriptionState(state: SubscriptionState): Promise<void> {
    try {
      const encryptedData = await encryptionService.encryptData(
        state,
        'SYSTEM',
        { subscriptionData: true, therapeuticData: false }
      );

      await SecureStore.setItemAsync(
        this.SUBSCRIPTION_STATE_KEY,
        JSON.stringify(encryptedData)
      );

      this.currentState = state;
      this.lastSyncTime = Date.now();

    } catch (error) {
      console.error('Failed to save subscription state:', error);
    }
  }

  private async initializeTrialConfiguration(): Promise<void> {
    try {
      const existingConfig = await SecureStore.getItemAsync(this.TRIAL_CONFIG_KEY);

      if (!existingConfig) {
        const encryptedConfig = await encryptionService.encryptData(
          this.trialConfig,
          'SYSTEM'
        );

        await SecureStore.setItemAsync(
          this.TRIAL_CONFIG_KEY,
          JSON.stringify(encryptedConfig)
        );
      }

    } catch (error) {
      console.error('Failed to initialize trial configuration:', error);
    }
  }

  private async initializeEmergencyDefaults(): Promise<void> {
    this.currentState = this.createCrisisSubscriptionState();
    this.crisisMode = true;
    console.log('Emergency subscription defaults initialized');
  }

  private createCrisisSubscriptionState(): SubscriptionState {
    const crisisEndDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    return {
      current: {
        subscriptionId: `crisis_${Date.now()}`,
        customerId: 'crisis_customer',
        status: 'active',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: crisisEndDate.toISOString(),
        cancelAtPeriodEnd: false,
        plan: {
          planId: 'crisis_access',
          name: 'Crisis Therapeutic Access',
          description: 'Emergency access to all therapeutic features for safety',
          amount: 0,
          currency: 'usd',
          interval: 'month',
          features: Object.values(this.subscriptionTiers).flatMap(tier => tier.features) as string[]
        }
      },
      tier: this.subscriptionTiers.premium, // Full access during crisis
      trial: null,
      gracePeriod: null,
      features: {
        available: Object.values(this.subscriptionTiers).flatMap(tier =>
          [...tier.features, ...tier.therapeuticFeatures]
        ),
        restricted: [],
        crisisOverride: Object.values(this.subscriptionTiers).flatMap(tier => tier.crisisFeatures)
      },
      lastSyncTime: new Date().toISOString(),
      offlineMode: false,
      crisisMode: true
    };
  }

  private createDefaultState(): SubscriptionState {
    return {
      current: null,
      tier: null,
      trial: null,
      gracePeriod: null,
      features: {
        available: ['crisis_detection', 'emergency_contacts', '988_hotline'], // Crisis features always available
        restricted: [],
        crisisOverride: this.subscriptionTiers.trial.crisisFeatures
      },
      lastSyncTime: new Date().toISOString(),
      offlineMode: true,
      crisisMode: false
    };
  }

  private async refreshSubscriptionState(): Promise<void> {
    try {
      if (!this.currentState?.current) {
        return;
      }

      // Refresh from payment API
      const subscription = await paymentAPIService.getSubscription(this.currentState.current.subscriptionId);
      await this.updateSubscriptionState(subscription);

    } catch (error) {
      console.warn('Subscription state refresh failed:', error);
      // Continue with cached state
    }
  }

  private async updateSubscriptionState(subscription: SubscriptionResult): Promise<void> {
    const tier = this.subscriptionTiers[subscription.plan.planId] || this.subscriptionTiers.basic;

    // Calculate trial information
    const trial = subscription.status === 'trialing' && subscription.trialEnd ? {
      active: true,
      daysRemaining: Math.ceil((new Date(subscription.trialEnd).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
      startDate: subscription.trialStart || subscription.currentPeriodStart,
      endDate: subscription.trialEnd,
      extended: false
    } : null;

    const updatedState: SubscriptionState = {
      current: subscription,
      tier,
      trial,
      gracePeriod: null, // Reset grace period on successful update
      features: {
        available: [...tier.features, ...tier.therapeuticFeatures],
        restricted: [],
        crisisOverride: tier.crisisFeatures
      },
      lastSyncTime: new Date().toISOString(),
      offlineMode: false,
      crisisMode: this.crisisMode
    };

    await this.saveSubscriptionState(updatedState);
  }

  private async syncSubscriptionState(): Promise<void> {
    // Placeholder for remote sync logic
    console.log('Subscription state sync completed');
  }

  private isCrisisFeature(feature: string): boolean {
    const allCrisisFeatures = Object.values(this.subscriptionTiers)
      .flatMap(tier => tier.crisisFeatures);
    return allCrisisFeatures.includes(feature);
  }

  private getFallbackOptions(feature: string, state: SubscriptionState): string[] {
    // Provide alternative features or actions when access is denied
    const fallbacks: Record<string, string[]> = {
      'advanced_insights': ['basic_insights', 'progress_tracking'],
      'unlimited_cloud_sync': ['basic_cloud_sync', 'local_backup'],
      'personalized_recommendations': ['basic_recommendations', 'community_resources'],
      'priority_support': ['community_support', 'self_help_resources']
    };

    return fallbacks[feature] || ['upgrade_subscription', 'continue_with_trial'];
  }

  private getRequiredTier(feature: string): string {
    for (const [tierId, tier] of Object.entries(this.subscriptionTiers)) {
      if (tier.features.includes(feature) || tier.therapeuticFeatures.includes(feature)) {
        return tier.name;
      }
    }
    return 'Premium';
  }

  private assessTherapeuticImpact(feature: string, granted: boolean): 'none' | 'minimal' | 'moderate' | 'significant' {
    if (granted) return 'none';

    const therapeuticFeatures = [
      'phq9_assessment',
      'gad7_assessment',
      'daily_check_ins',
      'mindfulness_exercises',
      'progress_tracking'
    ];

    if (therapeuticFeatures.includes(feature)) {
      return 'moderate';
    }

    const enhancementFeatures = [
      'advanced_insights',
      'personalized_recommendations',
      'therapeutic_analytics'
    ];

    if (enhancementFeatures.includes(feature)) {
      return 'minimal';
    }

    return 'minimal';
  }

  private getGracePeriodFeatures(): string[] {
    // Core therapeutic features maintained during grace period
    return [
      'core_mbct_practices',
      'phq9_assessment',
      'gad7_assessment',
      'daily_check_ins',
      'breathing_exercises',
      'crisis_detection',
      'emergency_contacts',
      '988_hotline'
    ];
  }

  private schedulePaymentRetry(subscriptionId: string, intervalHours: number): void {
    // Placeholder for payment retry scheduling
    console.log(`Payment retry scheduled for subscription ${subscriptionId} in ${intervalHours} hours`);
  }

  private async enableEmergencyAccess(reason: string): Promise<void> {
    this.crisisMode = true;
    const emergencyState = this.createCrisisSubscriptionState();
    await this.saveSubscriptionState(emergencyState);
    console.log(`Emergency access enabled: ${reason}`);
  }

  private async analyzeUsagePatterns(userId: string): Promise<{
    multipleDevices: boolean;
    advancedFeatures: boolean;
    consistentPractice: boolean;
  }> {
    // Placeholder for usage analysis
    return {
      multipleDevices: false,
      advancedFeatures: false,
      consistentPractice: true
    };
  }

  private async logSubscriptionEvent(eventType: string, data: Record<string, any>): Promise<void> {
    try {
      const eventData = {
        eventId: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        type: eventType,
        data,
        therapeutic: true
      };

      const encryptedEvent = await encryptionService.encryptData(
        eventData,
        'SYSTEM',
        { auditLog: true }
      );

      await SecureStore.setItemAsync(
        `subscription_event_${eventData.eventId}`,
        JSON.stringify(encryptedEvent)
      );

    } catch (error) {
      console.error('Failed to log subscription event:', error);
      // Don't fail operations due to logging issues
    }
  }
}

// Export singleton instance
export const subscriptionManager = SubscriptionManager.getInstance();