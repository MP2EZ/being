/**
 * Feature Flag System for P0-CLOUD Phase 1 Security Infrastructure
 *
 * Controls progressive rollout of cloud integration features while preserving
 * offline functionality and zero-knowledge architecture requirements.
 *
 * Features:
 * - Secure feature flag storage with encryption
 * - Default OFF for all cloud features (offline-first)
 * - Progressive enablement based on security readiness
 * - Clinical safety overrides for crisis scenarios
 * - Performance monitoring for flag evaluation
 */

import { encryptionService, DataSensitivity } from './EncryptionService';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface CloudFeatureFlags {
  // Core Cloud Infrastructure
  cloudSyncEnabled: boolean;
  zeroKnowledgeEncryption: boolean;
  remoteBackupEnabled: boolean;

  // Authentication & Authorization
  biometricAuthRequired: boolean;
  multiDeviceSync: boolean;
  sessionTimeout: number; // minutes

  // Data Sync Features
  realTimeSync: boolean;
  batchSyncEnabled: boolean;
  conflictResolutionEnabled: boolean;
  syncRetryEnabled: boolean;

  // Security Features
  endToEndEncryption: boolean;
  auditLoggingEnabled: boolean;
  threatDetectionEnabled: boolean;
  securityHeadersEnabled: boolean;

  // Performance & Monitoring
  performanceMonitoringEnabled: boolean;
  errorTrackingEnabled: boolean;
  analyticsEnabled: boolean;

  // Emergency Controls
  emergencyOfflineMode: boolean;
  crisisResponseOverride: boolean;

  // Feature Rollout Controls
  betaFeaturesEnabled: boolean;
  advancedFeaturesEnabled: boolean;
  debugModeEnabled: boolean;
}

export interface FeatureFlagMetadata {
  flagName: keyof CloudFeatureFlags;
  enabledAt?: string;
  disabledAt?: string;
  lastModified: string;
  modifiedBy: 'system' | 'user' | 'admin';
  securityContext: {
    encryptionReady: boolean;
    complianceLevel: 'none' | 'partial' | 'full';
    riskLevel: 'low' | 'medium' | 'high';
  };
  performanceImpact: {
    cpuOverhead: number; // percentage
    memoryOverhead: number; // MB
    networkUsage: number; // KB per operation
    batteryImpact: 'minimal' | 'low' | 'moderate' | 'high';
  };
  dependencies: Array<keyof CloudFeatureFlags>;
  conflicts: Array<keyof CloudFeatureFlags>;
}

export interface FeatureFlagEvaluation {
  flagName: keyof CloudFeatureFlags;
  enabled: boolean;
  evaluationTime: number; // milliseconds
  reason: string;
  securityValidated: boolean;
  performanceValidated: boolean;
  dependenciesMet: boolean;
  overrides: Array<{
    type: 'emergency' | 'crisis' | 'security' | 'performance';
    active: boolean;
    reason: string;
  }>;
}

export interface SecurityContext {
  encryptionServiceReady: boolean;
  zeroKnowledgeCapable: boolean;
  biometricAvailable: boolean;
  deviceSecurityLevel: 'high' | 'medium' | 'low';
  networkSecurityLevel: 'secure' | 'unsecure' | 'unknown';
  threatLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Secure Feature Flag Management Service
 *
 * Implements encrypted feature flag storage with security-aware evaluation
 * and performance monitoring for cloud integration features.
 */
export class FeatureFlagService {
  private static instance: FeatureFlagService;
  private flags: CloudFeatureFlags;
  private metadata: Map<keyof CloudFeatureFlags, FeatureFlagMetadata>;
  private evaluationCache: Map<string, FeatureFlagEvaluation>;
  private securityContext: SecurityContext | null = null;

  // Storage keys
  private readonly FLAGS_STORAGE_KEY = '@being_feature_flags_v1';
  private readonly METADATA_STORAGE_KEY = '@being_flag_metadata_v1';

  // Performance monitoring
  private evaluationMetrics: Map<keyof CloudFeatureFlags, {
    evaluationCount: number;
    totalEvaluationTime: number;
    averageEvaluationTime: number;
    lastEvaluation: string;
  }>;

  private constructor() {
    this.flags = this.getDefaultFlags();
    this.metadata = new Map();
    this.evaluationCache = new Map();
    this.evaluationMetrics = new Map();
    this.initialize();
  }

  public static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService();
    }
    return FeatureFlagService.instance;
  }

  /**
   * Initialize feature flag service with security validation
   */
  private async initialize(): Promise<void> {
    try {
      // Load encrypted flags from secure storage
      await this.loadFlags();

      // Initialize security context
      await this.updateSecurityContext();

      // Validate security requirements for current flags
      await this.validateSecurityRequirements();

      // Set up performance monitoring
      this.initializePerformanceMonitoring();

      console.log('Feature flag service initialized with security validation');

    } catch (error) {
      console.error('Feature flag service initialization failed:', error);
      // Fallback to default (all OFF) flags on error
      this.flags = this.getDefaultFlags();
    }
  }

  /**
   * Get default feature flags - ALL CLOUD FEATURES OFF by default
   * to preserve current offline functionality
   */
  private getDefaultFlags(): CloudFeatureFlags {
    return {
      // Core Cloud Infrastructure - OFF by default
      cloudSyncEnabled: false,
      zeroKnowledgeEncryption: false,
      remoteBackupEnabled: false,

      // Authentication & Authorization - Conservative defaults
      biometricAuthRequired: true, // Security-first
      multiDeviceSync: false,
      sessionTimeout: 30, // 30 minutes default

      // Data Sync Features - OFF by default
      realTimeSync: false,
      batchSyncEnabled: false,
      conflictResolutionEnabled: false,
      syncRetryEnabled: false,

      // Security Features - Local security ON, cloud security OFF
      endToEndEncryption: false, // For cloud communications
      auditLoggingEnabled: true, // Local audit logging
      threatDetectionEnabled: true, // Local threat detection
      securityHeadersEnabled: false, // For API communications

      // Performance & Monitoring - Conservative
      performanceMonitoringEnabled: true,
      errorTrackingEnabled: true,
      analyticsEnabled: false, // No cloud analytics by default

      // Emergency Controls - Safety first
      emergencyOfflineMode: false, // Not in emergency mode by default
      crisisResponseOverride: true, // Always allow crisis response

      // Feature Rollout Controls - OFF by default
      betaFeaturesEnabled: false,
      advancedFeaturesEnabled: false,
      debugModeEnabled: __DEV__ // Only in development
    };
  }

  /**
   * Evaluate feature flag with comprehensive security and performance checks
   */
  async evaluateFlag(
    flagName: keyof CloudFeatureFlags,
    context?: Partial<SecurityContext>
  ): Promise<FeatureFlagEvaluation> {
    const evaluationStart = Date.now();

    try {
      // Check cache first for performance
      const cacheKey = `${flagName}_${JSON.stringify(context || {})}`;
      const cached = this.evaluationCache.get(cacheKey);
      if (cached && Date.now() - evaluationStart < 100) { // 100ms cache TTL
        return cached;
      }

      // Update security context if provided
      if (context) {
        this.securityContext = { ...this.securityContext, ...context } as SecurityContext;
      }

      // Base flag value
      const baseValue = this.flags[flagName];
      let enabled = baseValue;
      let reason = `Base value: ${baseValue}`;

      // Security validation
      const securityValidated = await this.validateFlagSecurity(flagName);
      if (!securityValidated && this.requiresSecurityValidation(flagName)) {
        enabled = false;
        reason = 'Security validation failed';
      }

      // Performance validation
      const performanceValidated = await this.validateFlagPerformance(flagName);
      if (!performanceValidated && this.requiresPerformanceValidation(flagName)) {
        enabled = false;
        reason = 'Performance requirements not met';
      }

      // Dependency validation
      const dependenciesMet = await this.validateFlagDependencies(flagName);
      if (!dependenciesMet) {
        enabled = false;
        reason = 'Required dependencies not met';
      }

      // Emergency overrides
      const overrides = await this.getActiveOverrides(flagName);
      for (const override of overrides) {
        if (override.active) {
          if (override.type === 'crisis' || override.type === 'emergency') {
            // Crisis/emergency always takes priority
            enabled = override.type === 'crisis' ? true : false;
            reason = `${override.type} override: ${override.reason}`;
            break;
          } else if (override.type === 'security') {
            enabled = false;
            reason = `Security override: ${override.reason}`;
          }
        }
      }

      const evaluationTime = Date.now() - evaluationStart;

      const evaluation: FeatureFlagEvaluation = {
        flagName,
        enabled,
        evaluationTime,
        reason,
        securityValidated,
        performanceValidated,
        dependenciesMet,
        overrides
      };

      // Cache the evaluation
      this.evaluationCache.set(cacheKey, evaluation);

      // Update performance metrics
      this.updateEvaluationMetrics(flagName, evaluationTime);

      return evaluation;

    } catch (error) {
      console.error(`Flag evaluation failed for ${flagName}:`, error);

      // Fail-safe: return disabled for cloud features, enabled for safety features
      const safeValue = this.getSafeValueForFlag(flagName);

      return {
        flagName,
        enabled: safeValue,
        evaluationTime: Date.now() - evaluationStart,
        reason: `Evaluation error: ${error}`,
        securityValidated: false,
        performanceValidated: false,
        dependenciesMet: false,
        overrides: []
      };
    }
  }

  /**
   * Get current flag value with security validation
   */
  async getFlag(flagName: keyof CloudFeatureFlags): Promise<boolean> {
    const evaluation = await this.evaluateFlag(flagName);
    return evaluation.enabled;
  }

  /**
   * Set feature flag with security and dependency validation
   */
  async setFlag(
    flagName: keyof CloudFeatureFlags,
    enabled: boolean,
    context: {
      modifiedBy: 'system' | 'user' | 'admin';
      reason?: string;
      securityApproved?: boolean;
    }
  ): Promise<boolean> {
    try {
      // PREVENT DISABLING CRISIS-CRITICAL FLAGS
      if (this.isCrisisCriticalFlag(flagName) && !enabled) {
        console.error(`🚨 CRISIS SAFETY: Cannot disable critical flag ${flagName}`);
        return false;
      }

      // Validate security requirements before enabling
      if (enabled && this.requiresSecurityValidation(flagName)) {
        const securityValidated = await this.validateFlagSecurity(flagName);
        if (!securityValidated && !context.securityApproved) {
          console.warn(`Cannot enable ${flagName}: Security validation failed`);
          return false;
        }
      }

      // Validate dependencies before enabling
      if (enabled) {
        const dependenciesMet = await this.validateFlagDependencies(flagName);
        if (!dependenciesMet) {
          console.warn(`Cannot enable ${flagName}: Dependencies not met`);
          return false;
        }
      }

      // Check for conflicts
      if (enabled) {
        const conflicts = await this.checkFlagConflicts(flagName);
        if (conflicts.length > 0) {
          console.warn(`Cannot enable ${flagName}: Conflicts with ${conflicts.join(', ')}`);
          return false;
        }
      }

      // Update flag value
      const previousValue = this.flags[flagName];
      this.flags[flagName] = enabled;

      // Update metadata
      const metadata: FeatureFlagMetadata = this.metadata.get(flagName) || this.createDefaultMetadata(flagName);
      metadata.lastModified = new Date().toISOString();
      metadata.modifiedBy = context.modifiedBy;

      if (enabled && !previousValue) {
        metadata.enabledAt = new Date().toISOString();
      } else if (!enabled && previousValue) {
        metadata.disabledAt = new Date().toISOString();
      }

      this.metadata.set(flagName, metadata);

      // Persist changes securely
      await this.saveFlags();

      // Clear evaluation cache for this flag
      this.clearFlagCache(flagName);

      console.log(`Feature flag ${flagName} ${enabled ? 'enabled' : 'disabled'} by ${context.modifiedBy}`);

      return true;

    } catch (error) {
      console.error(`Failed to set flag ${flagName}:`, error);
      return false;
    }
  }

  /**
   * Enable cloud features progressively based on security readiness
   */
  async enableCloudFeaturesProgressive(): Promise<{
    success: boolean;
    enabledFeatures: Array<keyof CloudFeatureFlags>;
    failedFeatures: Array<{
      feature: keyof CloudFeatureFlags;
      reason: string;
    }>;
    securityStatus: SecurityContext;
  }> {
    try {
      await this.updateSecurityContext();

      const enabledFeatures: Array<keyof CloudFeatureFlags> = [];
      const failedFeatures: Array<{ feature: keyof CloudFeatureFlags; reason: string }> = [];

      // Phase 1: Core security infrastructure
      const phase1Features: Array<keyof CloudFeatureFlags> = [
        'zeroKnowledgeEncryption',
        'endToEndEncryption',
        'securityHeadersEnabled'
      ];

      for (const feature of phase1Features) {
        const enabled = await this.setFlag(feature, true, {
          modifiedBy: 'system',
          reason: 'Progressive cloud enablement - Phase 1'
        });

        if (enabled) {
          enabledFeatures.push(feature);
        } else {
          failedFeatures.push({
            feature,
            reason: 'Security requirements not met'
          });
        }
      }

      // Phase 2: Basic sync capabilities (only if Phase 1 successful)
      if (failedFeatures.length === 0) {
        const phase2Features: Array<keyof CloudFeatureFlags> = [
          'batchSyncEnabled',
          'conflictResolutionEnabled'
        ];

        for (const feature of phase2Features) {
          const enabled = await this.setFlag(feature, true, {
            modifiedBy: 'system',
            reason: 'Progressive cloud enablement - Phase 2'
          });

          if (enabled) {
            enabledFeatures.push(feature);
          } else {
            failedFeatures.push({
              feature,
              reason: 'Dependencies not ready'
            });
          }
        }
      }

      // Phase 3: Full cloud sync (only if Phase 2 successful)
      if (failedFeatures.length === 0 && enabledFeatures.length >= 4) {
        const cloudSyncEnabled = await this.setFlag('cloudSyncEnabled', true, {
          modifiedBy: 'system',
          reason: 'Progressive cloud enablement - Phase 3'
        });

        if (cloudSyncEnabled) {
          enabledFeatures.push('cloudSyncEnabled');
        } else {
          failedFeatures.push({
            feature: 'cloudSyncEnabled',
            reason: 'Full sync requirements not met'
          });
        }
      }

      return {
        success: failedFeatures.length === 0,
        enabledFeatures,
        failedFeatures,
        securityStatus: this.securityContext!
      };

    } catch (error) {
      console.error('Progressive cloud enablement failed:', error);
      return {
        success: false,
        enabledFeatures: [],
        failedFeatures: [{ feature: 'cloudSyncEnabled', reason: `System error: ${error}` }],
        securityStatus: this.securityContext!
      };
    }
  }

  /**
   * Emergency disable all cloud features while preserving local functionality
   */
  async emergencyDisableCloudFeatures(reason: string): Promise<void> {
    try {
      const cloudFeatures: Array<keyof CloudFeatureFlags> = [
        'cloudSyncEnabled',
        'realTimeSync',
        'remoteBackupEnabled',
        'multiDeviceSync',
        'analyticsEnabled'
      ];

      for (const feature of cloudFeatures) {
        await this.setFlag(feature, false, {
          modifiedBy: 'system',
          reason: `Emergency disable: ${reason}`
        });
      }

      // Enable emergency offline mode
      await this.setFlag('emergencyOfflineMode', true, {
        modifiedBy: 'system',
        reason: `Emergency mode activated: ${reason}`
      });

      console.warn(`EMERGENCY: Cloud features disabled - ${reason}`);

    } catch (error) {
      console.error('Emergency cloud disable failed:', error);
    }
  }

  /**
   * Get comprehensive feature flag status for monitoring and debugging
   */
  async getFeatureFlagStatus(): Promise<{
    flags: CloudFeatureFlags;
    securityContext: SecurityContext | null;
    performanceMetrics: Map<keyof CloudFeatureFlags, any>;
    evaluationCacheSize: number;
    lastSecurityUpdate: string | null;
  }> {
    await this.updateSecurityContext();

    return {
      flags: { ...this.flags },
      securityContext: this.securityContext,
      performanceMetrics: new Map(this.evaluationMetrics),
      evaluationCacheSize: this.evaluationCache.size,
      lastSecurityUpdate: this.securityContext ? new Date().toISOString() : null
    };
  }

  // ===========================================
  // PRIVATE HELPER METHODS
  // ===========================================

  private async loadFlags(): Promise<void> {
    try {
      const encryptedFlags = await SecureStore.getItemAsync(this.FLAGS_STORAGE_KEY);
      if (encryptedFlags) {
        const decryptedFlags = await encryptionService.decryptData(
          { encryptedData: encryptedFlags, iv: '', timestamp: new Date().toISOString() },
          DataSensitivity.SYSTEM
        );
        this.flags = { ...this.getDefaultFlags(), ...decryptedFlags };
      }

      const encryptedMetadata = await SecureStore.getItemAsync(this.METADATA_STORAGE_KEY);
      if (encryptedMetadata) {
        const decryptedMetadata = await encryptionService.decryptData(
          { encryptedData: encryptedMetadata, iv: '', timestamp: new Date().toISOString() },
          DataSensitivity.SYSTEM
        );
        this.metadata = new Map(Object.entries(decryptedMetadata));
      }

    } catch (error) {
      console.error('Failed to load feature flags:', error);
      // Fall back to defaults on error
      this.flags = this.getDefaultFlags();
    }
  }

  private async saveFlags(): Promise<void> {
    try {
      const encryptedFlags = await encryptionService.encryptData(
        this.flags,
        DataSensitivity.SYSTEM
      );
      await SecureStore.setItemAsync(this.FLAGS_STORAGE_KEY, encryptedFlags.encryptedData);

      const metadataObj = Object.fromEntries(this.metadata);
      const encryptedMetadata = await encryptionService.encryptData(
        metadataObj,
        DataSensitivity.SYSTEM
      );
      await SecureStore.setItemAsync(this.METADATA_STORAGE_KEY, encryptedMetadata.encryptedData);

    } catch (error) {
      console.error('Failed to save feature flags:', error);
    }
  }

  private async updateSecurityContext(): Promise<void> {
    try {
      const encryptionStatus = await encryptionService.getSecurityReadiness();

      this.securityContext = {
        encryptionServiceReady: encryptionStatus.ready,
        zeroKnowledgeCapable: encryptionStatus.zeroKnowledgeReady,
        biometricAvailable: Platform.OS === 'ios', // Simplified for demo
        deviceSecurityLevel: encryptionStatus.encryptionStrength === 'production' ? 'high' : 'low',
        networkSecurityLevel: 'unknown', // Would be determined by network analysis
        threatLevel: encryptionStatus.issues.length > 0 ? 'medium' : 'none'
      };

    } catch (error) {
      console.error('Failed to update security context:', error);
      this.securityContext = {
        encryptionServiceReady: false,
        zeroKnowledgeCapable: false,
        biometricAvailable: false,
        deviceSecurityLevel: 'low',
        networkSecurityLevel: 'unknown',
        threatLevel: 'high'
      };
    }
  }

  private async validateFlagSecurity(flagName: keyof CloudFeatureFlags): Promise<boolean> {
    if (!this.securityContext) {
      await this.updateSecurityContext();
    }

    switch (flagName) {
      case 'cloudSyncEnabled':
        return this.securityContext!.encryptionServiceReady &&
               this.securityContext!.zeroKnowledgeCapable;

      case 'zeroKnowledgeEncryption':
        return this.securityContext!.encryptionServiceReady;

      case 'endToEndEncryption':
        return this.securityContext!.encryptionServiceReady;

      case 'multiDeviceSync':
        return this.securityContext!.encryptionServiceReady &&
               this.securityContext!.deviceSecurityLevel === 'high';

      default:
        return true; // Non-security-critical flags
    }
  }

  private async validateFlagPerformance(flagName: keyof CloudFeatureFlags): Promise<boolean> {
    // For demo purposes, always return true
    // In production, this would check actual performance metrics
    return true;
  }

  private async validateFlagDependencies(flagName: keyof CloudFeatureFlags): Promise<boolean> {
    const dependencies = this.getFlagDependencies(flagName);

    for (const dependency of dependencies) {
      if (!this.flags[dependency]) {
        return false;
      }
    }

    return true;
  }

  private async checkFlagConflicts(flagName: keyof CloudFeatureFlags): Promise<Array<keyof CloudFeatureFlags>> {
    const conflicts: Array<keyof CloudFeatureFlags> = [];

    // Define conflict rules
    if (flagName === 'emergencyOfflineMode') {
      const cloudFeatures: Array<keyof CloudFeatureFlags> = [
        'cloudSyncEnabled', 'realTimeSync', 'remoteBackupEnabled'
      ];

      for (const feature of cloudFeatures) {
        if (this.flags[feature]) {
          conflicts.push(feature);
        }
      }
    }

    return conflicts;
  }

  private getFlagDependencies(flagName: keyof CloudFeatureFlags): Array<keyof CloudFeatureFlags> {
    const dependencies: Record<keyof CloudFeatureFlags, Array<keyof CloudFeatureFlags>> = {
      cloudSyncEnabled: ['zeroKnowledgeEncryption', 'endToEndEncryption'],
      realTimeSync: ['cloudSyncEnabled'],
      multiDeviceSync: ['cloudSyncEnabled'],
      batchSyncEnabled: ['zeroKnowledgeEncryption'],
      conflictResolutionEnabled: ['batchSyncEnabled'],
      remoteBackupEnabled: ['cloudSyncEnabled'],
      // ... other dependencies
    } as any;

    return dependencies[flagName] || [];
  }

  private requiresSecurityValidation(flagName: keyof CloudFeatureFlags): boolean {
    const securityCriticalFlags: Array<keyof CloudFeatureFlags> = [
      'cloudSyncEnabled',
      'zeroKnowledgeEncryption',
      'endToEndEncryption',
      'multiDeviceSync',
      'remoteBackupEnabled'
    ];

    return securityCriticalFlags.includes(flagName);
  }

  private requiresPerformanceValidation(flagName: keyof CloudFeatureFlags): boolean {
    const performanceCriticalFlags: Array<keyof CloudFeatureFlags> = [
      'realTimeSync',
      'performanceMonitoringEnabled'
    ];

    return performanceCriticalFlags.includes(flagName);
  }

  /**
   * Check if a flag is crisis-critical and should never be disabled
   */
  private isCrisisCriticalFlag(flagName: keyof CloudFeatureFlags): boolean {
    const CRISIS_CRITICAL_FLAGS = [
      'auditLoggingEnabled',
      'threatDetectionEnabled',
      'crisisResponseOverride',
      'emergencyOfflineMode'
    ];
    return CRISIS_CRITICAL_FLAGS.includes(flagName);
  }

  private async getActiveOverrides(flagName: keyof CloudFeatureFlags): Promise<FeatureFlagEvaluation['overrides']> {
    const overrides: FeatureFlagEvaluation['overrides'] = [];

    // CRISIS SAFETY OVERRIDE - Crisis features are NEVER disabled
    const CRISIS_CRITICAL_FLAGS = [
      'auditLoggingEnabled',
      'threatDetectionEnabled',
      'emergencyOfflineMode'
    ] as const;

    if (CRISIS_CRITICAL_FLAGS.includes(flagName as any)) {
      overrides.push({
        type: 'crisis',
        active: true, // ALWAYS ACTIVE for crisis safety
        reason: 'Crisis safety requires this feature to remain enabled'
      });
    }

    // Crisis response override should ENABLE crisis features, not disable them
    if (this.flags.crisisResponseOverride) {
      if (CRISIS_CRITICAL_FLAGS.includes(flagName as any)) {
        overrides.push({
          type: 'crisis',
          active: true, // ALWAYS ENABLE crisis features during crisis
          reason: 'Crisis response override requires enhanced safety features'
        });
      }
    }

    // Emergency offline mode
    if (this.flags.emergencyOfflineMode) {
      const cloudFeatures = ['cloudSyncEnabled', 'realTimeSync', 'remoteBackupEnabled'];
      overrides.push({
        type: 'emergency',
        active: cloudFeatures.includes(flagName),
        reason: 'Emergency offline mode active'
      });
    }

    // Security overrides
    if (this.securityContext?.threatLevel === 'high' || this.securityContext?.threatLevel === 'critical') {
      const securitySensitiveFlags = ['cloudSyncEnabled', 'multiDeviceSync', 'analyticsEnabled'];
      overrides.push({
        type: 'security',
        active: securitySensitiveFlags.includes(flagName),
        reason: `High threat level detected: ${this.securityContext.threatLevel}`
      });
    }

    return overrides;
  }

  private getSafeValueForFlag(flagName: keyof CloudFeatureFlags): boolean {
    // Safety-critical flags should default to enabled
    const safetyFlags = ['crisisResponseOverride', 'auditLoggingEnabled', 'threatDetectionEnabled'];
    if (safetyFlags.includes(flagName)) {
      return true;
    }

    // Cloud features should default to disabled for safety
    const cloudFlags = ['cloudSyncEnabled', 'realTimeSync', 'remoteBackupEnabled', 'multiDeviceSync'];
    if (cloudFlags.includes(flagName)) {
      return false;
    }

    // Return current value for other flags
    return this.flags[flagName];
  }

  private createDefaultMetadata(flagName: keyof CloudFeatureFlags): FeatureFlagMetadata {
    return {
      flagName,
      lastModified: new Date().toISOString(),
      modifiedBy: 'system',
      securityContext: {
        encryptionReady: false,
        complianceLevel: 'none',
        riskLevel: 'medium'
      },
      performanceImpact: {
        cpuOverhead: 0,
        memoryOverhead: 0,
        networkUsage: 0,
        batteryImpact: 'minimal'
      },
      dependencies: this.getFlagDependencies(flagName),
      conflicts: []
    };
  }

  private updateEvaluationMetrics(flagName: keyof CloudFeatureFlags, evaluationTime: number): void {
    const existing = this.evaluationMetrics.get(flagName) || {
      evaluationCount: 0,
      totalEvaluationTime: 0,
      averageEvaluationTime: 0,
      lastEvaluation: new Date().toISOString()
    };

    existing.evaluationCount++;
    existing.totalEvaluationTime += evaluationTime;
    existing.averageEvaluationTime = existing.totalEvaluationTime / existing.evaluationCount;
    existing.lastEvaluation = new Date().toISOString();

    this.evaluationMetrics.set(flagName, existing);
  }

  private clearFlagCache(flagName: keyof CloudFeatureFlags): void {
    const keysToDelete: string[] = [];
    for (const [key] of this.evaluationCache) {
      if (key.startsWith(flagName)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.evaluationCache.delete(key);
    }
  }

  private initializePerformanceMonitoring(): void {
    // Clear old cache entries periodically
    setInterval(() => {
      if (this.evaluationCache.size > 1000) {
        this.evaluationCache.clear();
        console.log('Feature flag evaluation cache cleared');
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private async validateSecurityRequirements(): Promise<void> {
    try {
      // Ensure critical security flags are properly configured
      const criticalFlags: Array<keyof CloudFeatureFlags> = [
        'biometricAuthRequired',
        'auditLoggingEnabled',
        'threatDetectionEnabled',
        'crisisResponseOverride'
      ];

      for (const flag of criticalFlags) {
        const evaluation = await this.evaluateFlag(flag);
        if (!evaluation.securityValidated) {
          console.warn(`Critical security flag ${flag} failed validation`);
        }
      }

    } catch (error) {
      console.error('Security requirements validation failed:', error);
    }
  }
}

// Export singleton instance
export const featureFlagService = FeatureFlagService.getInstance();

// Convenience methods for common flag checks
export const isCloudSyncEnabled = () => featureFlagService.getFlag('cloudSyncEnabled');
export const isZeroKnowledgeEnabled = () => featureFlagService.getFlag('zeroKnowledgeEncryption');
export const isBiometricRequired = () => featureFlagService.getFlag('biometricAuthRequired');
export const isEmergencyMode = () => featureFlagService.getFlag('emergencyOfflineMode');
export const isAuditLoggingEnabled = () => featureFlagService.getFlag('auditLoggingEnabled');