/**
 * Feature Flag Store - P0-CLOUD Control Center
 * Zustand store for comprehensive feature flag management with safety guards
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  P0CloudFeatureFlags, 
  FeatureFlagState,
  FeatureFlagMetadata,
  UserEligibility,
  ProgressiveRolloutConfig,
  FeatureCostManager,
  FeatureSafetyGuardian,
  DEFAULT_FEATURE_FLAGS,
  FEATURE_FLAG_METADATA,
  FEATURE_FLAG_CONSTANTS,
  isP0CloudFeatureFlags
} from '../types/feature-flags';
import { secureDataStore } from '../services/storage/SecureDataStore';
import { networkService } from '../services/NetworkService';
import { crisisProtectionService } from '../services/CrisisProtectionService';
import { costMonitoringService } from '../services/cloud/CostMonitoring';
import { cloudMonitoringService } from '../services/cloud/CloudMonitoring';

/**
 * Feature Access Result
 */
export interface FeatureAccessResult {
  readonly granted: boolean;
  readonly reason?: string;
  readonly requiresConsent?: boolean;
  readonly requiresUpgrade?: boolean;
  readonly waitlisted?: boolean;
  readonly estimatedAvailability?: string;
}

/**
 * Feature Flag Health Status
 */
export interface FeatureFlagHealthStatus {
  readonly overall: 'healthy' | 'warning' | 'critical';
  readonly features: Record<keyof P0CloudFeatureFlags, 'healthy' | 'degraded' | 'disabled'>;
  readonly crisisResponseOk: boolean;
  readonly costWithinLimits: boolean;
  readonly complianceOk: boolean;
  readonly lastCheck: string;
}

/**
 * Cost Status Information
 */
export interface CostStatus {
  readonly currentSpend: number;
  readonly budgetRemaining: number;
  readonly projectedMonthlySpend: number;
  readonly featureCosts: Record<keyof P0CloudFeatureFlags, number>;
  readonly limitedFeatures: readonly (keyof P0CloudFeatureFlags)[];
  readonly recommendations: readonly string[];
  readonly breakEvenUsers: number;
  readonly costEfficiency: number; // 0-1
}

/**
 * Safety Status Information
 */
export interface SafetyStatus {
  readonly crisisResponseTime: number; // ms
  readonly hipaaCompliant: boolean;
  readonly offlineFallbackReady: boolean;
  readonly encryptionValidated: boolean;
  readonly emergencyOverrideActive: boolean;
  readonly protectedFeaturesCount: number;
  readonly lastValidation: string;
}

/**
 * Feature Usage Statistics
 */
export interface FeatureUsageStats {
  readonly enabled: boolean;
  readonly activations: number;
  readonly deactivations: number;
  readonly errorCount: number;
  readonly averageLatency: number;
  readonly userAdoption: number; // 0-1
  readonly costPerUser: number;
  readonly satisfactionScore: number; // 0-5
}

/**
 * Feature Flag Store Interface
 */
interface FeatureFlagStore {
  // Core State
  flags: P0CloudFeatureFlags;
  metadata: Record<keyof P0CloudFeatureFlags, FeatureFlagMetadata>;
  userConsents: Record<keyof P0CloudFeatureFlags, boolean>;
  rolloutPercentages: Record<keyof P0CloudFeatureFlags, number>;
  userEligibility: UserEligibility | null;
  
  // Status Information
  costStatus: CostStatus;
  safetyStatus: SafetyStatus;
  healthStatus: FeatureFlagHealthStatus;
  
  // Loading States
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  
  // Core Actions
  initializeFlags: () => Promise<void>;
  evaluateFlag: (flag: keyof P0CloudFeatureFlags) => boolean;
  requestFeatureAccess: (flag: keyof P0CloudFeatureFlags) => Promise<FeatureAccessResult>;
  updateUserConsent: (flag: keyof P0CloudFeatureFlags, consent: boolean) => Promise<void>;
  
  // Administrative Actions
  emergencyDisable: (flag: keyof P0CloudFeatureFlags, reason: string) => Promise<void>;
  emergencyEnableOfflineMode: () => Promise<void>;
  validateAllFeatures: () => Promise<boolean>;
  
  // Cost Management
  checkCostLimits: () => Promise<CostStatus>;
  disableExpensiveFeatures: () => Promise<void>;
  optimizeCosts: () => Promise<void>;
  
  // Safety & Compliance
  validateCrisisAccess: () => Promise<boolean>;
  checkHIPAACompliance: () => Promise<boolean>;
  validateEncryption: () => Promise<boolean>;
  
  // Monitoring & Analytics
  getFeatureUsage: (flag: keyof P0CloudFeatureFlags) => FeatureUsageStats;
  getHealthStatus: () => Promise<FeatureFlagHealthStatus>;
  refreshMetrics: () => Promise<void>;
  
  // User Eligibility
  updateUserEligibility: (eligibility: UserEligibility) => Promise<void>;
  checkFeatureEligibility: (flag: keyof P0CloudFeatureFlags) => boolean;
  
  // Progressive Rollout
  updateRolloutPercentage: (flag: keyof P0CloudFeatureFlags, percentage: number) => Promise<void>;
  checkRolloutEligibility: (flag: keyof P0CloudFeatureFlags) => boolean;
}

/**
 * Create Feature Flag Store
 */
export const useFeatureFlagStore = create<FeatureFlagStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    flags: { ...DEFAULT_FEATURE_FLAGS },
    metadata: { ...FEATURE_FLAG_METADATA },
    userConsents: {} as Record<keyof P0CloudFeatureFlags, boolean>,
    rolloutPercentages: {} as Record<keyof P0CloudFeatureFlags, number>,
    userEligibility: null,
    
    costStatus: {
      currentSpend: 0,
      budgetRemaining: 100,
      projectedMonthlySpend: 0,
      featureCosts: {} as Record<keyof P0CloudFeatureFlags, number>,
      limitedFeatures: [],
      recommendations: [],
      breakEvenUsers: 75,
      costEfficiency: 1.0
    },
    
    safetyStatus: {
      crisisResponseTime: 150, // ms
      hipaaCompliant: true,
      offlineFallbackReady: true,
      encryptionValidated: true,
      emergencyOverrideActive: false,
      protectedFeaturesCount: 0,
      lastValidation: new Date().toISOString()
    },
    
    healthStatus: {
      overall: 'healthy',
      features: {} as Record<keyof P0CloudFeatureFlags, 'healthy' | 'degraded' | 'disabled'>,
      crisisResponseOk: true,
      costWithinLimits: true,
      complianceOk: true,
      lastCheck: new Date().toISOString()
    },
    
    isLoading: false,
    isUpdating: false,
    error: null,

    /**
     * Initialize Feature Flags
     */
    initializeFlags: async () => {
      set({ isLoading: true, error: null });
      
      try {
        // Load stored flags and consents
        const storedFlags = await secureDataStore.getFeatureFlags();
        const storedConsents = await secureDataStore.getUserConsents();
        const storedEligibility = await secureDataStore.getUserEligibility();
        
        // Validate and merge with defaults
        const flags = isP0CloudFeatureFlags(storedFlags) 
          ? { ...DEFAULT_FEATURE_FLAGS, ...storedFlags }
          : { ...DEFAULT_FEATURE_FLAGS };
        
        // Initialize rollout percentages
        const rolloutPercentages: Record<keyof P0CloudFeatureFlags, number> = {} as any;
        Object.keys(DEFAULT_FEATURE_FLAGS).forEach(key => {
          rolloutPercentages[key as keyof P0CloudFeatureFlags] = FEATURE_FLAG_CONSTANTS.DEFAULT_ROLLOUT_PERCENTAGE;
        });
        
        // Initialize feature health status
        const featureHealth: Record<keyof P0CloudFeatureFlags, 'healthy' | 'degraded' | 'disabled'> = {} as any;
        Object.keys(DEFAULT_FEATURE_FLAGS).forEach(key => {
          featureHealth[key as keyof P0CloudFeatureFlags] = flags[key as keyof P0CloudFeatureFlags] ? 'healthy' : 'disabled';
        });
        
        set({
          flags,
          userConsents: storedConsents || {},
          userEligibility: storedEligibility,
          rolloutPercentages,
          healthStatus: {
            overall: 'healthy',
            features: featureHealth,
            crisisResponseOk: true,
            costWithinLimits: true,
            complianceOk: true,
            lastCheck: new Date().toISOString()
          },
          isLoading: false
        });
        
        // Start monitoring
        get().refreshMetrics();
        
      } catch (error) {
        console.error('Failed to initialize feature flags:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to initialize feature flags',
          isLoading: false 
        });
      }
    },

    /**
     * Evaluate Feature Flag
     */
    evaluateFlag: (flag: keyof P0CloudFeatureFlags): boolean => {
      const state = get();
      
      // Emergency override check
      if (state.safetyStatus.emergencyOverrideActive) {
        const metadata = state.metadata[flag];
        if (metadata.canDisableInCrisis) {
          return false;
        }
      }
      
      // Crisis protection check
      if (crisisProtectionService.isInCrisisMode()) {
        const metadata = state.metadata[flag];
        if (!metadata.canDisableInCrisis) {
          return true; // Always enabled for crisis-safe features
        }
      }
      
      // Check basic flag state
      if (!state.flags[flag]) {
        return false;
      }
      
      // Check user eligibility
      if (!state.checkFeatureEligibility(flag)) {
        return false;
      }
      
      // Check rollout eligibility
      if (!state.checkRolloutEligibility(flag)) {
        return false;
      }
      
      // Check cost limits
      if (state.costStatus.limitedFeatures.includes(flag)) {
        return false;
      }
      
      // Check user consent
      const metadata = state.metadata[flag];
      if (metadata.requiresConsent && !state.userConsents[flag]) {
        return false;
      }
      
      return true;
    },

    /**
     * Request Feature Access
     */
    requestFeatureAccess: async (flag: keyof P0CloudFeatureFlags): Promise<FeatureAccessResult> => {
      const state = get();
      const metadata = state.metadata[flag];
      
      // Check if already enabled
      if (state.evaluateFlag(flag)) {
        return { granted: true };
      }
      
      // Check user eligibility
      if (!state.checkFeatureEligibility(flag)) {
        const eligibility = state.userEligibility;
        if (eligibility?.waitlistFeatures.includes(flag)) {
          return {
            granted: false,
            reason: 'Feature is waitlisted for your account',
            waitlisted: true,
            estimatedAvailability: 'Coming soon'
          };
        }
        
        if (eligibility && metadata.minimumPlan !== 'free' && eligibility.planType === 'free') {
          return {
            granted: false,
            reason: `Requires ${metadata.minimumPlan} plan`,
            requiresUpgrade: true
          };
        }
        
        return {
          granted: false,
          reason: 'Not eligible for this feature'
        };
      }
      
      // Check consent requirements
      if (metadata.requiresConsent && !state.userConsents[flag]) {
        return {
          granted: false,
          reason: 'User consent required',
          requiresConsent: true
        };
      }
      
      // Check rollout
      if (!state.checkRolloutEligibility(flag)) {
        return {
          granted: false,
          reason: 'Feature not yet available in your region/segment',
          estimatedAvailability: 'Rolling out gradually'
        };
      }
      
      // Check cost limits
      if (state.costStatus.limitedFeatures.includes(flag)) {
        return {
          granted: false,
          reason: 'Feature temporarily limited due to budget constraints'
        };
      }
      
      // Grant access
      try {
        await set(state => ({
          flags: {
            ...state.flags,
            [flag]: true
          }
        }));
        
        // Save to storage
        await secureDataStore.saveFeatureFlags(get().flags);
        
        return { granted: true };
        
      } catch (error) {
        console.error('Failed to grant feature access:', error);
        return {
          granted: false,
          reason: 'Failed to enable feature'
        };
      }
    },

    /**
     * Update User Consent
     */
    updateUserConsent: async (flag: keyof P0CloudFeatureFlags, consent: boolean): Promise<void> => {
      set({ isUpdating: true, error: null });
      
      try {
        const newConsents = {
          ...get().userConsents,
          [flag]: consent
        };
        
        set({ userConsents: newConsents });
        
        // Save to storage with encryption
        await secureDataStore.saveUserConsents(newConsents);
        
        // If consent revoked, disable feature
        if (!consent && get().flags[flag]) {
          await set(state => ({
            flags: {
              ...state.flags,
              [flag]: false
            }
          }));
          
          await secureDataStore.saveFeatureFlags(get().flags);
        }
        
        set({ isUpdating: false });
        
      } catch (error) {
        console.error('Failed to update user consent:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to update consent',
          isUpdating: false 
        });
      }
    },

    /**
     * Emergency Disable Feature
     */
    emergencyDisable: async (flag: keyof P0CloudFeatureFlags, reason: string): Promise<void> => {
      try {
        console.warn(`Emergency disable triggered for ${flag}: ${reason}`);
        
        // Immediately disable feature
        await set(state => ({
          flags: {
            ...state.flags,
            [flag]: false
          },
          healthStatus: {
            ...state.healthStatus,
            features: {
              ...state.healthStatus.features,
              [flag]: 'disabled'
            },
            overall: 'warning'
          }
        }));
        
        // Save to storage
        await secureDataStore.saveFeatureFlags(get().flags);
        
        // Notify monitoring service
        await cloudMonitoringService.reportEmergencyDisable(flag, reason);
        
      } catch (error) {
        console.error('Failed to emergency disable feature:', error);
        throw error;
      }
    },

    /**
     * Emergency Enable Offline Mode
     */
    emergencyEnableOfflineMode: async (): Promise<void> => {
      try {
        console.warn('Emergency offline mode activated');
        
        set(state => ({
          safetyStatus: {
            ...state.safetyStatus,
            emergencyOverrideActive: true,
            offlineFallbackReady: true
          },
          healthStatus: {
            ...state.healthStatus,
            overall: 'warning'
          }
        }));
        
        // Disable all non-critical features
        const criticalFeatures = ['EMERGENCY_CONTACTS_CLOUD', 'PUSH_NOTIFICATIONS_ENABLED'];
        const newFlags = { ...get().flags };
        
        Object.keys(newFlags).forEach(key => {
          if (!criticalFeatures.includes(key)) {
            newFlags[key as keyof P0CloudFeatureFlags] = false;
          }
        });
        
        set({ flags: newFlags });
        await secureDataStore.saveFeatureFlags(newFlags);
        
      } catch (error) {
        console.error('Failed to enable emergency offline mode:', error);
        throw error;
      }
    },

    /**
     * Validate All Features
     */
    validateAllFeatures: async (): Promise<boolean> => {
      try {
        const state = get();
        let allValid = true;
        
        // Validate crisis response time
        const crisisResponseTime = await crisisProtectionService.measureResponseTime();
        if (crisisResponseTime > FEATURE_FLAG_CONSTANTS.CRISIS_RESPONSE_MAX_MS) {
          allValid = false;
          console.error(`Crisis response time ${crisisResponseTime}ms exceeds limit`);
        }
        
        // Validate HIPAA compliance
        const hipaaCompliant = await get().checkHIPAACompliance();
        if (!hipaaCompliant) {
          allValid = false;
          console.error('HIPAA compliance validation failed');
        }
        
        // Validate encryption
        const encryptionValid = await get().validateEncryption();
        if (!encryptionValid) {
          allValid = false;
          console.error('Encryption validation failed');
        }
        
        // Update safety status
        set(state => ({
          safetyStatus: {
            ...state.safetyStatus,
            crisisResponseTime,
            hipaaCompliant,
            encryptionValidated: encryptionValid,
            lastValidation: new Date().toISOString()
          }
        }));
        
        return allValid;
        
      } catch (error) {
        console.error('Feature validation failed:', error);
        return false;
      }
    },

    /**
     * Check Cost Limits
     */
    checkCostLimits: async (): Promise<CostStatus> => {
      try {
        const costData = await costMonitoringService.getCurrentCosts();
        const projections = await costMonitoringService.getProjectedCosts();
        
        const costStatus: CostStatus = {
          currentSpend: costData.total,
          budgetRemaining: costData.budgetRemaining,
          projectedMonthlySpend: projections.monthly,
          featureCosts: costData.byFeature,
          limitedFeatures: costData.limitedFeatures,
          recommendations: costData.recommendations,
          breakEvenUsers: projections.breakEvenUsers,
          costEfficiency: costData.efficiency
        };
        
        set({ costStatus });
        
        // Auto-limit expensive features if needed
        if (costStatus.budgetRemaining < 0.15) { // 15% remaining
          await get().disableExpensiveFeatures();
        }
        
        return costStatus;
        
      } catch (error) {
        console.error('Failed to check cost limits:', error);
        throw error;
      }
    },

    /**
     * Disable Expensive Features
     */
    disableExpensiveFeatures: async (): Promise<void> => {
      try {
        const state = get();
        const expensiveFeatures = Object.entries(state.metadata)
          .filter(([_, metadata]) => metadata.costImpact === 'high' || metadata.costImpact === 'variable')
          .map(([key, _]) => key as keyof P0CloudFeatureFlags);
        
        const newFlags = { ...state.flags };
        expensiveFeatures.forEach(flag => {
          if (state.metadata[flag].canDisableInCrisis) {
            newFlags[flag] = false;
          }
        });
        
        set({ 
          flags: newFlags,
          costStatus: {
            ...state.costStatus,
            limitedFeatures: expensiveFeatures
          }
        });
        
        await secureDataStore.saveFeatureFlags(newFlags);
        
        console.warn('Expensive features disabled due to budget constraints');
        
      } catch (error) {
        console.error('Failed to disable expensive features:', error);
        throw error;
      }
    },

    /**
     * Optimize Costs
     */
    optimizeCosts: async (): Promise<void> => {
      try {
        const recommendations = await costMonitoringService.getOptimizationRecommendations();
        
        // Apply automatic optimizations
        for (const rec of recommendations.filter(r => r.automated)) {
          // Implementation depends on specific optimization type
          console.log(`Applying optimization: ${rec.description}`);
        }
        
        await get().refreshMetrics();
        
      } catch (error) {
        console.error('Failed to optimize costs:', error);
        throw error;
      }
    },

    /**
     * Validate Crisis Access
     */
    validateCrisisAccess: async (): Promise<boolean> => {
      try {
        // Ensure crisis features are always accessible
        const crisisFeatures = ['EMERGENCY_CONTACTS_CLOUD'];
        const state = get();
        
        let crisisAccessOk = true;
        
        for (const feature of crisisFeatures) {
          const responseTime = await crisisProtectionService.testFeatureResponse(feature);
          if (responseTime > FEATURE_FLAG_CONSTANTS.CRISIS_RESPONSE_MAX_MS) {
            crisisAccessOk = false;
            console.error(`Crisis feature ${feature} response time ${responseTime}ms too slow`);
          }
        }
        
        return crisisAccessOk;
        
      } catch (error) {
        console.error('Crisis access validation failed:', error);
        return false;
      }
    },

    /**
     * Check HIPAA Compliance
     */
    checkHIPAACompliance: async (): Promise<boolean> => {
      try {
        // Validate encryption for HIPAA-relevant features
        const state = get();
        const hipaaFeatures = Object.entries(state.metadata)
          .filter(([_, metadata]) => metadata.hipaaRelevant)
          .map(([key, _]) => key);
        
        for (const feature of hipaaFeatures) {
          if (state.flags[feature as keyof P0CloudFeatureFlags]) {
            const encryptionValid = await secureDataStore.validateEncryption();
            if (!encryptionValid) {
              console.error(`HIPAA encryption validation failed for ${feature}`);
              return false;
            }
          }
        }
        
        return true;
        
      } catch (error) {
        console.error('HIPAA compliance check failed:', error);
        return false;
      }
    },

    /**
     * Validate Encryption
     */
    validateEncryption: async (): Promise<boolean> => {
      try {
        return await secureDataStore.validateEncryption();
      } catch (error) {
        console.error('Encryption validation failed:', error);
        return false;
      }
    },

    /**
     * Get Feature Usage Stats
     */
    getFeatureUsage: (flag: keyof P0CloudFeatureFlags): FeatureUsageStats => {
      // This would integrate with analytics service
      return {
        enabled: get().flags[flag],
        activations: 0,
        deactivations: 0,
        errorCount: 0,
        averageLatency: 0,
        userAdoption: 0,
        costPerUser: 0,
        satisfactionScore: 4.5
      };
    },

    /**
     * Get Health Status
     */
    getHealthStatus: async (): Promise<FeatureFlagHealthStatus> => {
      try {
        const state = get();
        const crisisOk = await state.validateCrisisAccess();
        const complianceOk = await state.checkHIPAACompliance();
        const costStatus = await state.checkCostLimits();
        
        const overall = crisisOk && complianceOk && costStatus.budgetRemaining > 0.1 
          ? 'healthy' 
          : costStatus.budgetRemaining <= 0 ? 'critical' : 'warning';
        
        const healthStatus: FeatureFlagHealthStatus = {
          overall,
          features: state.healthStatus.features,
          crisisResponseOk: crisisOk,
          costWithinLimits: costStatus.budgetRemaining > 0.1,
          complianceOk,
          lastCheck: new Date().toISOString()
        };
        
        set({ healthStatus });
        return healthStatus;
        
      } catch (error) {
        console.error('Failed to get health status:', error);
        const healthStatus: FeatureFlagHealthStatus = {
          overall: 'critical',
          features: get().healthStatus.features,
          crisisResponseOk: false,
          costWithinLimits: false,
          complianceOk: false,
          lastCheck: new Date().toISOString()
        };
        set({ healthStatus });
        return healthStatus;
      }
    },

    /**
     * Refresh Metrics
     */
    refreshMetrics: async (): Promise<void> => {
      try {
        await Promise.all([
          get().checkCostLimits(),
          get().getHealthStatus(),
          get().validateAllFeatures()
        ]);
      } catch (error) {
        console.error('Failed to refresh metrics:', error);
      }
    },

    /**
     * Update User Eligibility
     */
    updateUserEligibility: async (eligibility: UserEligibility): Promise<void> => {
      set({ userEligibility: eligibility });
      await secureDataStore.saveUserEligibility(eligibility);
    },

    /**
     * Check Feature Eligibility
     */
    checkFeatureEligibility: (flag: keyof P0CloudFeatureFlags): boolean => {
      const eligibility = get().userEligibility;
      if (!eligibility) return false;
      
      const metadata = get().metadata[flag];
      
      // Check plan requirements
      const planHierarchy = ['free', 'premium', 'family', 'enterprise'];
      const userPlanIndex = planHierarchy.indexOf(eligibility.planType);
      const requiredPlanIndex = planHierarchy.indexOf(metadata.minimumPlan);
      
      if (userPlanIndex < requiredPlanIndex) {
        return false;
      }
      
      // Check beta opt-in for experimental features
      if (metadata.category === 'experimental' && !eligibility.betaOptIn) {
        return false;
      }
      
      // Check if explicitly eligible
      return eligibility.eligibleFeatures.includes(flag);
    },

    /**
     * Update Rollout Percentage
     */
    updateRolloutPercentage: async (flag: keyof P0CloudFeatureFlags, percentage: number): Promise<void> => {
      set(state => ({
        rolloutPercentages: {
          ...state.rolloutPercentages,
          [flag]: Math.max(0, Math.min(100, percentage))
        }
      }));
      
      await secureDataStore.saveRolloutPercentages(get().rolloutPercentages);
    },

    /**
     * Check Rollout Eligibility
     */
    checkRolloutEligibility: (flag: keyof P0CloudFeatureFlags): boolean => {
      const eligibility = get().userEligibility;
      const rolloutPercentage = get().rolloutPercentages[flag] || 0;
      
      if (rolloutPercentage >= 100) {
        return true;
      }
      
      if (rolloutPercentage <= 0) {
        return false;
      }
      
      // Use consistent hash based on user ID and feature
      if (!eligibility?.userId) {
        return false;
      }
      
      const hash = simpleHash(eligibility.userId + flag);
      const userPercentile = hash % 100;
      
      return userPercentile < rolloutPercentage;
    }
  }))
);

/**
 * Simple hash function for rollout eligibility
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Initialize feature flags on app start
 */
export const initializeFeatureFlags = async (): Promise<void> => {
  const store = useFeatureFlagStore.getState();
  await store.initializeFlags();
  
  // Set up periodic health checks
  const healthCheckInterval = setInterval(async () => {
    await store.refreshMetrics();
  }, 60000); // Every minute
  
  // Clean up on app unmount (if needed)
  return () => {
    clearInterval(healthCheckInterval);
  };
};