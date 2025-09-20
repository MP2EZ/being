/**
 * Payment-Aware Feature Gates for Being. P0-CLOUD
 *
 * Advanced feature gate system that combines subscription tier access control
 * with feature flags while maintaining crisis safety guarantees.
 *
 * Features:
 * - Subscription tier-based feature access
 * - Crisis feature bypass (always available)
 * - Offline feature state caching
 * - <100ms feature validation response
 * - Therapeutic continuity guarantees
 */

import { z } from 'zod';
import * as SecureStore from 'expo-secure-store';
import { subscriptionManager, SubscriptionTier } from './SubscriptionManager';
import { featureFlagManager } from './FeatureFlagManager';
import { encryptionService } from '../security/EncryptionService';
import { TypeSafeFeatureFlags } from '../../types/cloud-client';

/**
 * Feature Gate Configuration
 */
export interface FeatureGateConfig {
  readonly featureId: string;
  readonly displayName: string;
  readonly description: string;
  readonly category: 'therapeutic' | 'crisis' | 'enhancement' | 'analytics' | 'sync';
  readonly subscriptionTiers: readonly string[]; // Which tiers include this feature
  readonly featureFlagDependency?: keyof TypeSafeFeatureFlags; // Optional feature flag dependency
  readonly therapeuticPriority: 'critical' | 'important' | 'enhancement' | 'optional';
  readonly crisisOverride: boolean; // Always available during crisis
  readonly offlineAvailable: boolean; // Available in offline mode
  readonly performanceImpact: 'none' | 'low' | 'medium' | 'high';
  readonly limitations?: {
    readonly maxUsagePerDay?: number;
    readonly deviceLimit?: number;
    readonly dataRetentionDays?: number;
  };
}

/**
 * Feature Access Context
 */
export interface FeatureAccessContext {
  readonly userId: string;
  readonly deviceId: string;
  readonly sessionId: string;
  readonly crisisMode: boolean;
  readonly offlineMode: boolean;
  readonly subscriptionTier?: string;
  readonly featureFlagsEnabled: boolean;
  readonly therapeuticSession: boolean;
}

/**
 * Feature Access Result with Detailed Response
 */
export interface FeatureAccessResult {
  readonly granted: boolean;
  readonly reason: string;
  readonly limitations?: {
    readonly usageRemaining?: number;
    readonly deviceLimitReached?: boolean;
    readonly dataRetentionDays?: number;
  };
  readonly fallbackOptions: readonly string[];
  readonly upgradeRecommendation?: {
    readonly tier: string;
    readonly benefits: readonly string[];
    readonly therapeuticValue: string;
  };
  readonly responseTime: number;
  readonly cacheHit: boolean;
  readonly crisisOverride: boolean;
  readonly therapeuticImpact: 'none' | 'minimal' | 'moderate' | 'significant';
  readonly complianceNotes?: readonly string[];
}

/**
 * Feature Usage Tracking
 */
export interface FeatureUsageRecord {
  readonly featureId: string;
  readonly userId: string;
  readonly timestamp: string;
  readonly accessGranted: boolean;
  readonly subscriptionTier: string;
  readonly crisisMode: boolean;
  readonly therapeuticContext: boolean;
  readonly performanceMetrics: {
    readonly responseTime: number;
    readonly cacheHit: boolean;
  };
}

/**
 * Payment-Aware Feature Gate Manager
 */
export class PaymentAwareFeatureGates {
  private static instance: PaymentAwareFeatureGates;
  private initialized = false;

  // Performance constants
  private readonly FEATURE_CHECK_TIMEOUT = 100; // ms
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly CRISIS_BYPASS_ALL = true;

  // Storage keys
  private readonly FEATURE_CACHE_KEY = 'being_feature_gate_cache_v1';
  private readonly USAGE_TRACKING_KEY = 'being_feature_usage_v1';

  // Feature gate definitions
  private readonly featureGates: Record<string, FeatureGateConfig> = {
    // Therapeutic Core Features
    phq9_assessment: {
      featureId: 'phq9_assessment',
      displayName: 'PHQ-9 Assessment',
      description: 'Depression screening and tracking',
      category: 'therapeutic',
      subscriptionTiers: ['trial', 'basic', 'premium'],
      therapeuticPriority: 'critical',
      crisisOverride: true,
      offlineAvailable: true,
      performanceImpact: 'low'
    },
    gad7_assessment: {
      featureId: 'gad7_assessment',
      displayName: 'GAD-7 Assessment',
      description: 'Anxiety screening and tracking',
      category: 'therapeutic',
      subscriptionTiers: ['trial', 'basic', 'premium'],
      therapeuticPriority: 'critical',
      crisisOverride: true,
      offlineAvailable: true,
      performanceImpact: 'low'
    },
    daily_check_ins: {
      featureId: 'daily_check_ins',
      displayName: 'Daily Check-ins',
      description: 'Regular mood and wellness tracking',
      category: 'therapeutic',
      subscriptionTiers: ['trial', 'basic', 'premium'],
      therapeuticPriority: 'important',
      crisisOverride: true,
      offlineAvailable: true,
      performanceImpact: 'low'
    },
    breathing_exercises: {
      featureId: 'breathing_exercises',
      displayName: 'Guided Breathing',
      description: '3-minute breathing space and exercises',
      category: 'therapeutic',
      subscriptionTiers: ['trial', 'basic', 'premium'],
      therapeuticPriority: 'important',
      crisisOverride: true,
      offlineAvailable: true,
      performanceImpact: 'medium'
    },
    mindfulness_exercises: {
      featureId: 'mindfulness_exercises',
      displayName: 'Mindfulness Practices',
      description: 'MBCT exercises and guided meditations',
      category: 'therapeutic',
      subscriptionTiers: ['trial', 'basic', 'premium'],
      therapeuticPriority: 'important',
      crisisOverride: true,
      offlineAvailable: true,
      performanceImpact: 'medium'
    },

    // Crisis Safety Features (Always Available)
    crisis_detection: {
      featureId: 'crisis_detection',
      displayName: 'Crisis Detection',
      description: 'Automatic crisis screening and alerts',
      category: 'crisis',
      subscriptionTiers: ['trial', 'basic', 'premium'],
      therapeuticPriority: 'critical',
      crisisOverride: true,
      offlineAvailable: true,
      performanceImpact: 'low'
    },
    emergency_contacts: {
      featureId: 'emergency_contacts',
      displayName: 'Emergency Contacts',
      description: 'Quick access to support contacts',
      category: 'crisis',
      subscriptionTiers: ['trial', 'basic', 'premium'],
      therapeuticPriority: 'critical',
      crisisOverride: true,
      offlineAvailable: true,
      performanceImpact: 'none'
    },
    hotline_988: {
      featureId: 'hotline_988',
      displayName: '988 Crisis Hotline',
      description: 'Direct access to crisis support',
      category: 'crisis',
      subscriptionTiers: ['trial', 'basic', 'premium'],
      therapeuticPriority: 'critical',
      crisisOverride: true,
      offlineAvailable: false, // Requires call capability
      performanceImpact: 'none'
    },
    safety_planning: {
      featureId: 'safety_planning',
      displayName: 'Safety Planning',
      description: 'Personal crisis response planning',
      category: 'crisis',
      subscriptionTiers: ['trial', 'basic', 'premium'],
      therapeuticPriority: 'critical',
      crisisOverride: true,
      offlineAvailable: true,
      performanceImpact: 'low'
    },

    // Cloud Sync Features
    basic_cloud_sync: {
      featureId: 'basic_cloud_sync',
      displayName: 'Basic Cloud Sync',
      description: 'Sync data across 2-3 devices',
      category: 'sync',
      subscriptionTiers: ['trial', 'basic', 'premium'],
      featureFlagDependency: 'supabaseSync',
      therapeuticPriority: 'enhancement',
      crisisOverride: false,
      offlineAvailable: false,
      performanceImpact: 'medium',
      limitations: {
        deviceLimit: 3,
        dataRetentionDays: 90
      }
    },
    unlimited_cloud_sync: {
      featureId: 'unlimited_cloud_sync',
      displayName: 'Unlimited Cloud Sync',
      description: 'Sync across unlimited devices',
      category: 'sync',
      subscriptionTiers: ['premium'],
      featureFlagDependency: 'supabaseSync',
      therapeuticPriority: 'enhancement',
      crisisOverride: false,
      offlineAvailable: false,
      performanceImpact: 'medium',
      limitations: {
        deviceLimit: undefined,
        dataRetentionDays: 365
      }
    },
    encrypted_backup: {
      featureId: 'encrypted_backup',
      displayName: 'Encrypted Backup',
      description: 'Zero-knowledge encrypted data backup',
      category: 'sync',
      subscriptionTiers: ['trial', 'basic', 'premium'],
      featureFlagDependency: 'encryptedBackup',
      therapeuticPriority: 'important',
      crisisOverride: false,
      offlineAvailable: false,
      performanceImpact: 'high'
    },

    // Enhancement Features
    basic_insights: {
      featureId: 'basic_insights',
      displayName: 'Basic Insights',
      description: 'Simple progress tracking and trends',
      category: 'analytics',
      subscriptionTiers: ['trial', 'basic', 'premium'],
      therapeuticPriority: 'enhancement',
      crisisOverride: false,
      offlineAvailable: true,
      performanceImpact: 'low'
    },
    advanced_insights: {
      featureId: 'advanced_insights',
      displayName: 'Advanced Analytics',
      description: 'Detailed therapeutic progress analysis',
      category: 'analytics',
      subscriptionTiers: ['trial', 'premium'],
      therapeuticPriority: 'enhancement',
      crisisOverride: false,
      offlineAvailable: true,
      performanceImpact: 'medium'
    },
    personalized_recommendations: {
      featureId: 'personalized_recommendations',
      displayName: 'Personalized MBCT',
      description: 'AI-guided personalized practice recommendations',
      category: 'enhancement',
      subscriptionTiers: ['premium'],
      therapeuticPriority: 'enhancement',
      crisisOverride: false,
      offlineAvailable: false,
      performanceImpact: 'high'
    },
    data_export: {
      featureId: 'data_export',
      displayName: 'Data Export',
      description: 'Export therapeutic data for healthcare providers',
      category: 'enhancement',
      subscriptionTiers: ['premium'],
      therapeuticPriority: 'optional',
      crisisOverride: false,
      offlineAvailable: false,
      performanceImpact: 'medium'
    },
    priority_support: {
      featureId: 'priority_support',
      displayName: 'Priority Support',
      description: 'Priority customer and therapeutic support',
      category: 'enhancement',
      subscriptionTiers: ['premium'],
      therapeuticPriority: 'optional',
      crisisOverride: true, // Crisis support always prioritized
      offlineAvailable: false,
      performanceImpact: 'none'
    }
  };

  // Cache for feature access results
  private featureCache = new Map<string, { result: FeatureAccessResult; timestamp: number }>();

  private constructor() {}

  public static getInstance(): PaymentAwareFeatureGates {
    if (!PaymentAwareFeatureGates.instance) {
      PaymentAwareFeatureGates.instance = new PaymentAwareFeatureGates();
    }
    return PaymentAwareFeatureGates.instance;
  }

  /**
   * Initialize payment-aware feature gates
   */
  async initialize(): Promise<void> {
    try {
      if (this.initialized) {
        return;
      }

      console.log('Initializing payment-aware feature gates...');

      // Initialize dependencies
      await subscriptionManager.initialize();
      await featureFlagManager.initialize();

      // Load cached feature access results
      await this.loadFeatureCache();

      this.initialized = true;
      console.log('Payment-aware feature gates initialized successfully');

    } catch (error) {
      console.error('Feature gates initialization failed:', error);
      this.initialized = true; // Initialize with fallbacks
    }
  }

  /**
   * Check feature access with subscription and feature flag integration
   */
  async checkFeatureAccess(
    featureId: string,
    context: FeatureAccessContext
  ): Promise<FeatureAccessResult> {
    const startTime = Date.now();

    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // Check cache first for performance
      const cacheKey = `${featureId}_${context.userId}_${context.subscriptionTier}`;
      const cached = this.featureCache.get(cacheKey);

      if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
        return {
          ...cached.result,
          responseTime: Date.now() - startTime,
          cacheHit: true
        };
      }

      // Get feature configuration
      const featureConfig = this.featureGates[featureId];
      if (!featureConfig) {
        return this.createFeatureNotFoundResult(featureId, startTime);
      }

      // Crisis override - all therapeutic and crisis features available
      if (context.crisisMode && (featureConfig.crisisOverride || featureConfig.category === 'crisis')) {
        const result = this.createCrisisOverrideResult(featureConfig, startTime);
        this.cacheFeatureResult(cacheKey, result);
        await this.trackFeatureUsage(featureConfig, context, result);
        return result;
      }

      // Check feature flag dependency if required
      if (featureConfig.featureFlagDependency) {
        const featureFlags = await featureFlagManager.getFlags();
        if (!featureFlags[featureConfig.featureFlagDependency]) {
          const result = this.createFeatureFlagDisabledResult(featureConfig, startTime);
          this.cacheFeatureResult(cacheKey, result);
          await this.trackFeatureUsage(featureConfig, context, result);
          return result;
        }
      }

      // Check subscription tier access
      const subscriptionStatus = await subscriptionManager.getSubscriptionStatus();
      const hasSubscriptionAccess = this.checkSubscriptionAccess(
        featureConfig,
        subscriptionStatus.tier?.id || 'none'
      );

      if (!hasSubscriptionAccess) {
        const result = this.createSubscriptionRestrictedResult(featureConfig, subscriptionStatus.tier, startTime);
        this.cacheFeatureResult(cacheKey, result);
        await this.trackFeatureUsage(featureConfig, context, result);
        return result;
      }

      // Check offline availability
      if (context.offlineMode && !featureConfig.offlineAvailable) {
        const result = this.createOfflineUnavailableResult(featureConfig, startTime);
        this.cacheFeatureResult(cacheKey, result);
        await this.trackFeatureUsage(featureConfig, context, result);
        return result;
      }

      // Feature access granted
      const result = this.createAccessGrantedResult(featureConfig, subscriptionStatus.tier, startTime);
      this.cacheFeatureResult(cacheKey, result);
      await this.trackFeatureUsage(featureConfig, context, result);
      return result;

    } catch (error) {
      console.error('Feature access check failed:', error);

      // Emergency fallback for therapeutic continuity
      const featureConfig = this.featureGates[featureId];
      if (featureConfig?.therapeuticPriority === 'critical' || featureConfig?.category === 'crisis') {
        return {
          granted: true,
          reason: 'Emergency fallback - therapeutic continuity maintained',
          fallbackOptions: [],
          responseTime: Date.now() - startTime,
          cacheHit: false,
          crisisOverride: true,
          therapeuticImpact: 'none',
          complianceNotes: ['Emergency access granted for therapeutic safety']
        };
      }

      return {
        granted: false,
        reason: `Feature access check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        fallbackOptions: ['retry_check', 'contact_support'],
        responseTime: Date.now() - startTime,
        cacheHit: false,
        crisisOverride: false,
        therapeuticImpact: 'moderate',
        complianceNotes: ['Feature access validation failed']
      };
    }
  }

  /**
   * Get all available features for current subscription and context
   */
  async getAvailableFeatures(context: FeatureAccessContext): Promise<{
    granted: string[];
    restricted: string[];
    crisisOverride: string[];
    recommendations: string[];
  }> {
    try {
      const granted: string[] = [];
      const restricted: string[] = [];
      const crisisOverride: string[] = [];
      const recommendations: string[] = [];

      // Check each feature
      for (const [featureId, config] of Object.entries(this.featureGates)) {
        const access = await this.checkFeatureAccess(featureId, context);

        if (access.granted) {
          if (access.crisisOverride) {
            crisisOverride.push(featureId);
          } else {
            granted.push(featureId);
          }
        } else {
          restricted.push(featureId);
          if (access.upgradeRecommendation) {
            recommendations.push(
              `Upgrade to ${access.upgradeRecommendation.tier} for ${config.displayName}`
            );
          }
        }
      }

      return {
        granted,
        restricted,
        crisisOverride,
        recommendations
      };

    } catch (error) {
      console.error('Get available features failed:', error);

      // Safe fallback
      const crisisFeatures = Object.entries(this.featureGates)
        .filter(([_, config]) => config.category === 'crisis')
        .map(([id]) => id);

      return {
        granted: crisisFeatures,
        restricted: [],
        crisisOverride: crisisFeatures,
        recommendations: ['Contact support for feature access assistance']
      };
    }
  }

  /**
   * Clear feature access cache (for subscription changes)
   */
  async clearFeatureCache(): Promise<void> {
    try {
      this.featureCache.clear();
      await SecureStore.deleteItemAsync(this.FEATURE_CACHE_KEY);
      console.log('Feature access cache cleared');
    } catch (error) {
      console.error('Clear feature cache failed:', error);
    }
  }

  /**
   * Get feature usage analytics
   */
  async getFeatureUsageAnalytics(userId: string, days = 7): Promise<{
    totalChecks: number;
    accessGranted: number;
    accessDenied: number;
    crisisOverrides: number;
    mostUsedFeatures: Array<{ feature: string; count: number }>;
    therapeuticEngagement: number;
  }> {
    try {
      // Placeholder for usage analytics
      // In a real implementation, this would aggregate usage data
      return {
        totalChecks: 150,
        accessGranted: 145,
        accessDenied: 5,
        crisisOverrides: 2,
        mostUsedFeatures: [
          { feature: 'daily_check_ins', count: 45 },
          { feature: 'breathing_exercises', count: 30 },
          { feature: 'phq9_assessment', count: 8 }
        ],
        therapeuticEngagement: 0.87
      };

    } catch (error) {
      console.error('Get feature usage analytics failed:', error);
      return {
        totalChecks: 0,
        accessGranted: 0,
        accessDenied: 0,
        crisisOverrides: 0,
        mostUsedFeatures: [],
        therapeuticEngagement: 0
      };
    }
  }

  // Private helper methods

  private checkSubscriptionAccess(config: FeatureGateConfig, currentTier: string): boolean {
    return config.subscriptionTiers.includes(currentTier) || currentTier === 'premium';
  }

  private createCrisisOverrideResult(config: FeatureGateConfig, startTime: number): FeatureAccessResult {
    return {
      granted: true,
      reason: 'Crisis mode - feature access granted for therapeutic safety',
      fallbackOptions: [],
      responseTime: Date.now() - startTime,
      cacheHit: false,
      crisisOverride: true,
      therapeuticImpact: 'none',
      complianceNotes: ['Crisis override applied for user safety']
    };
  }

  private createFeatureFlagDisabledResult(config: FeatureGateConfig, startTime: number): FeatureAccessResult {
    return {
      granted: false,
      reason: `Feature flag '${config.featureFlagDependency}' is disabled`,
      fallbackOptions: ['enable_feature_flags', 'contact_support'],
      responseTime: Date.now() - startTime,
      cacheHit: false,
      crisisOverride: false,
      therapeuticImpact: this.getTherapeuticImpact(config),
      complianceNotes: ['Feature disabled by system configuration']
    };
  }

  private createSubscriptionRestrictedResult(
    config: FeatureGateConfig,
    currentTier: SubscriptionTier | null,
    startTime: number
  ): FeatureAccessResult {
    const requiredTiers = config.subscriptionTiers.filter(tier => tier !== 'trial');
    const lowestTier = requiredTiers[0] || 'basic';

    return {
      granted: false,
      reason: `Feature requires ${lowestTier} subscription or higher`,
      fallbackOptions: this.getSubscriptionFallbacks(config),
      upgradeRecommendation: {
        tier: lowestTier,
        benefits: this.getUpgradeBenefits(config),
        therapeuticValue: this.getTherapeuticValue(config)
      },
      responseTime: Date.now() - startTime,
      cacheHit: false,
      crisisOverride: false,
      therapeuticImpact: this.getTherapeuticImpact(config)
    };
  }

  private createOfflineUnavailableResult(config: FeatureGateConfig, startTime: number): FeatureAccessResult {
    return {
      granted: false,
      reason: 'Feature requires internet connection',
      fallbackOptions: ['connect_internet', 'use_offline_alternatives'],
      responseTime: Date.now() - startTime,
      cacheHit: false,
      crisisOverride: false,
      therapeuticImpact: this.getTherapeuticImpact(config),
      complianceNotes: ['Feature requires online connectivity']
    };
  }

  private createAccessGrantedResult(
    config: FeatureGateConfig,
    tier: SubscriptionTier | null,
    startTime: number
  ): FeatureAccessResult {
    return {
      granted: true,
      reason: `Feature available with ${tier?.name || 'current'} subscription`,
      limitations: config.limitations ? {
        usageRemaining: config.limitations.maxUsagePerDay,
        deviceLimitReached: false,
        dataRetentionDays: config.limitations.dataRetentionDays
      } : undefined,
      fallbackOptions: [],
      responseTime: Date.now() - startTime,
      cacheHit: false,
      crisisOverride: false,
      therapeuticImpact: 'none'
    };
  }

  private createFeatureNotFoundResult(featureId: string, startTime: number): FeatureAccessResult {
    return {
      granted: false,
      reason: `Feature '${featureId}' not found`,
      fallbackOptions: ['check_feature_id', 'contact_support'],
      responseTime: Date.now() - startTime,
      cacheHit: false,
      crisisOverride: false,
      therapeuticImpact: 'minimal'
    };
  }

  private getSubscriptionFallbacks(config: FeatureGateConfig): string[] {
    const fallbacks = [];

    if (config.category === 'therapeutic') {
      fallbacks.push('use_basic_version', 'start_trial');
    } else if (config.category === 'sync') {
      fallbacks.push('use_local_storage', 'manual_backup');
    } else {
      fallbacks.push('upgrade_subscription', 'explore_alternatives');
    }

    return fallbacks;
  }

  private getUpgradeBenefits(config: FeatureGateConfig): string[] {
    const benefits = [config.description];

    if (config.category === 'therapeutic') {
      benefits.push('Enhanced therapeutic insights', 'Better progress tracking');
    } else if (config.category === 'sync') {
      benefits.push('Seamless device synchronization', 'Secure data backup');
    } else if (config.category === 'analytics') {
      benefits.push('Detailed progress analytics', 'Personalized recommendations');
    }

    return benefits;
  }

  private getTherapeuticValue(config: FeatureGateConfig): string {
    switch (config.therapeuticPriority) {
      case 'critical':
        return 'Essential for therapeutic progress and safety';
      case 'important':
        return 'Significantly enhances therapeutic outcomes';
      case 'enhancement':
        return 'Supports and enriches your mindfulness journey';
      case 'optional':
        return 'Additional convenience and insights';
      default:
        return 'Supports your therapeutic goals';
    }
  }

  private getTherapeuticImpact(config: FeatureGateConfig): 'none' | 'minimal' | 'moderate' | 'significant' {
    switch (config.therapeuticPriority) {
      case 'critical':
        return 'significant';
      case 'important':
        return 'moderate';
      case 'enhancement':
        return 'minimal';
      case 'optional':
        return 'none';
      default:
        return 'minimal';
    }
  }

  private cacheFeatureResult(key: string, result: FeatureAccessResult): void {
    this.featureCache.set(key, {
      result: { ...result, cacheHit: false },
      timestamp: Date.now()
    });

    // Clean old cache entries periodically
    if (this.featureCache.size > 100) {
      const cutoff = Date.now() - this.CACHE_TTL;
      for (const [cacheKey, entry] of this.featureCache.entries()) {
        if (entry.timestamp < cutoff) {
          this.featureCache.delete(cacheKey);
        }
      }
    }
  }

  private async loadFeatureCache(): Promise<void> {
    try {
      const encryptedCache = await SecureStore.getItemAsync(this.FEATURE_CACHE_KEY);
      if (encryptedCache) {
        const parsedData = JSON.parse(encryptedCache);
        const cacheData = await encryptionService.decryptData(parsedData, 'SYSTEM');

        // Restore cache entries that are still valid
        const cutoff = Date.now() - this.CACHE_TTL;
        for (const [key, entry] of Object.entries(cacheData)) {
          if ((entry as any).timestamp > cutoff) {
            this.featureCache.set(key, entry as any);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load feature cache:', error);
    }
  }

  private async trackFeatureUsage(
    config: FeatureGateConfig,
    context: FeatureAccessContext,
    result: FeatureAccessResult
  ): Promise<void> {
    try {
      const usageRecord: FeatureUsageRecord = {
        featureId: config.featureId,
        userId: context.userId,
        timestamp: new Date().toISOString(),
        accessGranted: result.granted,
        subscriptionTier: context.subscriptionTier || 'none',
        crisisMode: context.crisisMode,
        therapeuticContext: context.therapeuticSession,
        performanceMetrics: {
          responseTime: result.responseTime,
          cacheHit: result.cacheHit
        }
      };

      const encryptedRecord = await encryptionService.encryptData(
        usageRecord,
        'SYSTEM',
        { analyticsData: true }
      );

      await SecureStore.setItemAsync(
        `${this.USAGE_TRACKING_KEY}_${Date.now()}`,
        JSON.stringify(encryptedRecord)
      );

    } catch (error) {
      console.error('Feature usage tracking failed:', error);
      // Don't fail feature access due to tracking issues
    }
  }
}

// Export singleton instance
export const paymentAwareFeatureGates = PaymentAwareFeatureGates.getInstance();