/**
 * Feature Flag Manager - Type-Safe Progressive Enablement
 *
 * HIPAA-compliant feature flag system with secure storage,
 * progressive rollout, and crisis safety overrides.
 */

import { z } from 'zod';
import * as SecureStore from 'expo-secure-store';
import {
  TypeSafeFeatureFlags,
  FeatureFlagConfiguration,
  FeatureFlagValidation,
  CLOUD_CLIENT_CONSTANTS
} from '../../types/cloud-client';
import { CloudFeatureFlags, CLOUD_CONSTANTS } from '../../types/cloud';
import { encryptionService, DataSensitivity } from '../security/EncryptionService';

/**
 * Feature flag profiles for different environments
 */
export interface FeatureFlagProfile {
  readonly name: 'development' | 'staging' | 'production';
  readonly description: string;
  readonly flags: TypeSafeFeatureFlags;
  readonly validatedAt: string;
  readonly restrictions: {
    readonly requiresUserConsent: readonly (keyof CloudFeatureFlags)[];
    readonly requiresBackup: readonly (keyof CloudFeatureFlags)[];
    readonly emergencyDisable: readonly (keyof CloudFeatureFlags)[];
  };
}

/**
 * Feature flag dependencies and rollout configuration
 */
export interface FeatureFlagRollout {
  readonly feature: keyof CloudFeatureFlags;
  readonly rolloutPercentage: number; // 0-100
  readonly userTierRequirement: 'anonymous' | 'authenticated' | 'premium';
  readonly dependencies: readonly (keyof CloudFeatureFlags)[];
  readonly conflictsWith: readonly (keyof CloudFeatureFlags)[];
  readonly minimumAppVersion: string;
  readonly regions: readonly string[];
  readonly emergencyKillSwitch: boolean;
}

/**
 * Crisis safety configuration for feature flags
 */
export interface CrisisSafetyConfig {
  readonly enforceOfflineFirst: boolean;
  readonly disableCloudOnCrisis: boolean;
  readonly prioritizeEmergencySync: boolean;
  readonly bypassNormalLimits: boolean;
  readonly forceLocalStorage: boolean;
  readonly alertEmergencyContacts: boolean;
}

/**
 * Feature flag audit entry for compliance
 */
export interface FeatureFlagAudit {
  readonly id: string;
  readonly timestamp: string;
  readonly userId?: string;
  readonly deviceId: string;
  readonly operation: 'read' | 'update' | 'reset' | 'override';
  readonly changes: {
    readonly flag: keyof CloudFeatureFlags;
    readonly oldValue: boolean;
    readonly newValue: boolean;
    readonly reason?: string;
  }[];
  readonly context: {
    readonly userTier: string;
    readonly appVersion: string;
    readonly environment: string;
    readonly crisisMode: boolean;
  };
  readonly ipAddress?: string; // Anonymized
  readonly userAgent?: string;
}

/**
 * Type-safe feature flag manager implementation
 */
export class FeatureFlagManager {
  private static instance: FeatureFlagManager;
  private currentFlags: TypeSafeFeatureFlags | null = null;
  private initialized = false;

  // Secure storage keys
  private readonly FEATURE_FLAGS_KEY = 'being_feature_flags_v1';
  private readonly FEATURE_FLAGS_PROFILE_KEY = 'being_feature_profile_v1';
  private readonly FEATURE_FLAGS_AUDIT_KEY = 'being_feature_audit_v1';
  private readonly CRISIS_SAFETY_KEY = 'being_crisis_safety_v1';

  // Built-in feature flag profiles
  private readonly profiles: Record<string, FeatureFlagProfile> = {
    development: {
      name: 'development',
      description: 'Development environment with all features enabled for testing',
      flags: {
        enabled: true,
        supabaseSync: true,
        encryptedBackup: true,
        crossDeviceSync: true,
        conflictResolution: true,
        auditLogging: true,
        emergencySync: true,
        profile: 'development',
        validatedAt: new Date().toISOString(),
        enabledFeatures: ['supabaseSync', 'encryptedBackup', 'crossDeviceSync', 'emergencySync'],
        emergencyOverrides: {
          crisisThresholdBypass: true,
          offlineToCloudForced: true,
          emergencySyncEnabled: true
        }
      },
      validatedAt: new Date().toISOString(),
      restrictions: {
        requiresUserConsent: [],
        requiresBackup: ['crossDeviceSync'],
        emergencyDisable: []
      }
    },
    staging: {
      name: 'staging',
      description: 'Staging environment with gradual feature rollout',
      flags: {
        enabled: false, // Default OFF for staging
        supabaseSync: false,
        encryptedBackup: true, // Safe to enable
        crossDeviceSync: false,
        conflictResolution: true,
        auditLogging: true,
        emergencySync: false,
        profile: 'staging',
        validatedAt: new Date().toISOString(),
        enabledFeatures: ['encryptedBackup', 'conflictResolution', 'auditLogging'],
        emergencyOverrides: {
          crisisThresholdBypass: false,
          offlineToCloudForced: false,
          emergencySyncEnabled: false
        }
      },
      validatedAt: new Date().toISOString(),
      restrictions: {
        requiresUserConsent: ['supabaseSync', 'crossDeviceSync'],
        requiresBackup: ['supabaseSync', 'crossDeviceSync'],
        emergencyDisable: ['crossDeviceSync']
      }
    },
    production: {
      name: 'production',
      description: 'Production environment with strict safety controls',
      flags: {
        enabled: false, // Default OFF for production
        supabaseSync: false,
        encryptedBackup: false,
        crossDeviceSync: false,
        conflictResolution: true, // Always enabled for safety
        auditLogging: true,      // Always enabled for compliance
        emergencySync: false,
        profile: 'production',
        validatedAt: new Date().toISOString(),
        enabledFeatures: ['conflictResolution', 'auditLogging'],
        emergencyOverrides: {
          crisisThresholdBypass: false,
          offlineToCloudForced: false,
          emergencySyncEnabled: false
        }
      },
      validatedAt: new Date().toISOString(),
      restrictions: {
        requiresUserConsent: ['enabled', 'supabaseSync', 'encryptedBackup', 'crossDeviceSync', 'emergencySync'],
        requiresBackup: ['supabaseSync', 'encryptedBackup', 'crossDeviceSync'],
        emergencyDisable: ['supabaseSync', 'crossDeviceSync', 'emergencySync']
      }
    }
  };

  private constructor() {}

  public static getInstance(): FeatureFlagManager {
    if (!FeatureFlagManager.instance) {
      FeatureFlagManager.instance = new FeatureFlagManager();
    }
    return FeatureFlagManager.instance;
  }

  /**
   * Initialize feature flag manager with environment detection
   */
  async initialize(environment?: 'development' | 'staging' | 'production'): Promise<void> {
    try {
      if (this.initialized) {
        return;
      }

      // Detect environment if not provided
      const detectedEnvironment = environment || this.detectEnvironment();

      // Load or create feature flags
      await this.loadFeatureFlags(detectedEnvironment);

      // Initialize crisis safety configuration
      await this.initializeCrisisSafety();

      // Validate current configuration
      const validation = await this.validateCurrentFlags();
      if (!validation.valid) {
        console.warn('Feature flag validation issues:', validation.errors);

        // Reset to safe defaults if validation fails
        await this.resetToProfile(detectedEnvironment);
      }

      this.initialized = true;

      // Log initialization audit
      await this.auditOperation('read', [], {
        reason: 'Feature flag manager initialized',
        environment: detectedEnvironment
      });

    } catch (error) {
      console.error('Failed to initialize feature flag manager:', error);

      // Fallback to safest defaults
      await this.resetToProfile('production');
      this.initialized = true;
    }
  }

  /**
   * Get current feature flags with validation
   */
  async getFlags(): Promise<TypeSafeFeatureFlags> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.currentFlags) {
      // Fallback to production defaults
      this.currentFlags = this.profiles.production.flags;
    }

    // Update validation timestamp
    this.currentFlags = {
      ...this.currentFlags,
      validatedAt: new Date().toISOString()
    };

    return this.currentFlags;
  }

  /**
   * Update feature flags with safety validation
   */
  async updateFlags(
    updates: Partial<TypeSafeFeatureFlags>,
    context?: {
      reason?: string;
      userConsent?: boolean;
      emergencyOverride?: boolean;
    }
  ): Promise<FeatureFlagValidation> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const currentFlags = await this.getFlags();
      const newFlags = { ...currentFlags, ...updates };

      // Validate the proposed changes
      const validation = await this.validateFlags(newFlags);

      if (!validation.valid && !context?.emergencyOverride) {
        return validation;
      }

      // Check if user consent is required
      const consentRequired = await this.checkUserConsentRequired(updates);
      if (consentRequired.length > 0 && !context?.userConsent) {
        return {
          valid: false,
          errors: [`User consent required for: ${consentRequired.join(', ')}`],
          warnings: validation.warnings,
          recommendations: validation.recommendations,
          safeToApply: false
        };
      }

      // Apply crisis safety checks
      const crisisSafetyCheck = await this.applyCrisisSafetyChecks(newFlags);
      if (!crisisSafetyCheck.safe) {
        return {
          valid: false,
          errors: [`Crisis safety violation: ${crisisSafetyCheck.reason}`],
          warnings: validation.warnings,
          recommendations: [...validation.recommendations, 'Review crisis safety settings'],
          safeToApply: false
        };
      }

      // Create audit record for changes
      const changes = this.detectChanges(currentFlags, newFlags);

      // Save encrypted feature flags
      await this.saveFeatureFlags(newFlags);
      this.currentFlags = newFlags;

      // Log audit entry
      await this.auditOperation('update', changes, {
        reason: context?.reason || 'Feature flags updated',
        userConsent: context?.userConsent || false,
        emergencyOverride: context?.emergencyOverride || false
      });

      return {
        valid: true,
        errors: [],
        warnings: validation.warnings,
        recommendations: validation.recommendations,
        safeToApply: true
      };

    } catch (error) {
      console.error('Failed to update feature flags:', error);
      return {
        valid: false,
        errors: [`Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        recommendations: ['Check system logs', 'Verify storage permissions'],
        safeToApply: false
      };
    }
  }

  /**
   * Reset feature flags to environment profile
   */
  async resetToProfile(profileName: 'development' | 'staging' | 'production'): Promise<void> {
    try {
      const profile = this.profiles[profileName];
      if (!profile) {
        throw new Error(`Unknown profile: ${profileName}`);
      }

      const newFlags = {
        ...profile.flags,
        validatedAt: new Date().toISOString()
      };

      await this.saveFeatureFlags(newFlags);
      this.currentFlags = newFlags;

      // Save current profile
      await this.saveCurrentProfile(profileName);

      // Log audit entry
      await this.auditOperation('reset', [], {
        reason: `Reset to ${profileName} profile`,
        profile: profileName
      });

    } catch (error) {
      console.error('Failed to reset to profile:', error);
      throw new Error(`Profile reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate feature flag configuration
   */
  async validateFlags(flags: TypeSafeFeatureFlags): Promise<FeatureFlagValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    try {
      // Schema validation
      const schemaResult = z.object({
        enabled: z.boolean(),
        supabaseSync: z.boolean(),
        encryptedBackup: z.boolean(),
        crossDeviceSync: z.boolean(),
        conflictResolution: z.boolean(),
        auditLogging: z.boolean(),
        emergencySync: z.boolean(),
        profile: z.enum(['development', 'staging', 'production']),
        validatedAt: z.string().datetime(),
        enabledFeatures: z.array(z.string()),
        emergencyOverrides: z.object({
          crisisThresholdBypass: z.boolean(),
          offlineToCloudForced: z.boolean(),
          emergencySyncEnabled: z.boolean()
        })
      }).safeParse(flags);

      if (!schemaResult.success) {
        errors.push(`Schema validation failed: ${schemaResult.error.message}`);
      }

      // Business logic validation
      if (flags.enabled && !flags.conflictResolution) {
        errors.push('Conflict resolution must be enabled when cloud features are active');
      }

      if (flags.crossDeviceSync && !flags.supabaseSync) {
        errors.push('Cross-device sync requires Supabase sync to be enabled');
      }

      if (flags.emergencySync && !flags.encryptedBackup) {
        warnings.push('Emergency sync works better with encrypted backup enabled');
      }

      // Production safety checks
      if (flags.profile === 'production') {
        if (flags.enabled && flags.supabaseSync) {
          warnings.push('Production cloud sync should be enabled gradually');
          recommendations.push('Consider staged rollout for production cloud features');
        }

        if (flags.emergencyOverrides.crisisThresholdBypass) {
          errors.push('Crisis threshold bypass should not be enabled in production');
        }
      }

      // Crisis safety validation
      const crisisFlags = await this.getCrisisSafetyConfig();
      if (crisisFlags.enforceOfflineFirst && flags.enabled) {
        warnings.push('Crisis safety mode enforces offline-first operation');
      }

      // Dependency validation
      const enabledFeatures = Object.entries(flags)
        .filter(([key, value]) => value === true && key !== 'enabled')
        .map(([key]) => key);

      const missingDependencies = this.checkFeatureDependencies(enabledFeatures);
      if (missingDependencies.length > 0) {
        errors.push(`Missing dependencies: ${missingDependencies.join(', ')}`);
      }

      // Security validation
      const securityIssues = await this.validateSecurityRequirements(flags);
      errors.push(...securityIssues.errors);
      warnings.push(...securityIssues.warnings);

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        recommendations,
        safeToApply: errors.length === 0
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings,
        recommendations: ['Check validation logic', 'Verify system configuration'],
        safeToApply: false
      };
    }
  }

  /**
   * Get feature flag configuration for rollout management
   */
  async getConfiguration(): Promise<FeatureFlagConfiguration> {
    const flags = await this.getFlags();
    const profile = flags.profile;

    return {
      environment: profile,
      userTier: 'anonymous', // Would be determined by auth state
      rolloutPercentage: profile === 'development' ? 100 : (profile === 'staging' ? 50 : 10),
      dependencies: this.getFeatureDependencies(),
      safeguards: {
        requiresUserConsent: profile === 'production',
        requiresBackup: true,
        allowsOfflineRevert: true,
        maxDataSize: CLOUD_CLIENT_CONSTANTS.DATA.MAX_ENTITY_SIZE_MB * 1024 * 1024
      }
    };
  }

  /**
   * Emergency feature flag override for crisis situations
   */
  async emergencyOverride(
    flags: Partial<TypeSafeFeatureFlags>,
    crisisContext: {
      assessmentId?: string;
      score?: number;
      triggerType: 'phq9_threshold' | 'gad7_threshold' | 'crisis_button' | 'manual';
    }
  ): Promise<void> {
    try {
      // Apply emergency overrides without normal validation
      const currentFlags = await this.getFlags();
      const emergencyFlags = {
        ...currentFlags,
        ...flags,
        emergencyOverrides: {
          crisisThresholdBypass: true,
          offlineToCloudForced: true,
          emergencySyncEnabled: true
        },
        validatedAt: new Date().toISOString()
      };

      await this.saveFeatureFlags(emergencyFlags);
      this.currentFlags = emergencyFlags;

      // Log emergency audit entry
      await this.auditOperation('override', [], {
        reason: 'Emergency crisis override',
        crisisContext,
        emergencyOverride: true
      });

      console.log('Emergency feature flag override applied for crisis situation');

    } catch (error) {
      console.error('Failed to apply emergency override:', error);
      throw new Error('Emergency override failed - manual intervention required');
    }
  }

  // Private helper methods

  private detectEnvironment(): 'development' | 'staging' | 'production' {
    if (__DEV__) {
      return 'development';
    }

    // Check for staging indicators
    const stagingIndicators = [
      process.env.EXPO_PUBLIC_ENVIRONMENT === 'staging',
      process.env.NODE_ENV === 'staging'
    ];

    if (stagingIndicators.some(Boolean)) {
      return 'staging';
    }

    return 'production';
  }

  private async loadFeatureFlags(environment: string): Promise<void> {
    try {
      // Try to load existing flags
      const encryptedFlags = await SecureStore.getItemAsync(this.FEATURE_FLAGS_KEY);

      if (encryptedFlags) {
        const decryptedFlags = await encryptionService.decryptData(
          { encryptedData: encryptedFlags, iv: '', timestamp: '' },
          DataSensitivity.SYSTEM
        );

        this.currentFlags = decryptedFlags as TypeSafeFeatureFlags;
      } else {
        // Use environment profile as default
        this.currentFlags = this.profiles[environment]?.flags || this.profiles.production.flags;
      }

    } catch (error) {
      console.error('Failed to load feature flags:', error);
      // Fallback to environment profile
      this.currentFlags = this.profiles[environment]?.flags || this.profiles.production.flags;
    }
  }

  private async saveFeatureFlags(flags: TypeSafeFeatureFlags): Promise<void> {
    try {
      const encryptedData = await encryptionService.encryptData(
        flags,
        DataSensitivity.SYSTEM
      );

      await SecureStore.setItemAsync(
        this.FEATURE_FLAGS_KEY,
        encryptedData.encryptedData
      );

    } catch (error) {
      console.error('Failed to save feature flags:', error);
      throw new Error('Feature flags save failed');
    }
  }

  private async saveCurrentProfile(profileName: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(this.FEATURE_FLAGS_PROFILE_KEY, profileName);
    } catch (error) {
      console.error('Failed to save current profile:', error);
    }
  }

  private async initializeCrisisSafety(): Promise<void> {
    try {
      const existingConfig = await SecureStore.getItemAsync(this.CRISIS_SAFETY_KEY);

      if (!existingConfig) {
        const defaultConfig: CrisisSafetyConfig = {
          enforceOfflineFirst: true,
          disableCloudOnCrisis: false,
          prioritizeEmergencySync: true,
          bypassNormalLimits: true,
          forceLocalStorage: true,
          alertEmergencyContacts: false
        };

        const encryptedConfig = await encryptionService.encryptData(
          defaultConfig,
          DataSensitivity.SYSTEM
        );

        await SecureStore.setItemAsync(
          this.CRISIS_SAFETY_KEY,
          encryptedConfig.encryptedData
        );
      }

    } catch (error) {
      console.error('Failed to initialize crisis safety:', error);
    }
  }

  private async getCrisisSafetyConfig(): Promise<CrisisSafetyConfig> {
    try {
      const encryptedConfig = await SecureStore.getItemAsync(this.CRISIS_SAFETY_KEY);

      if (encryptedConfig) {
        return await encryptionService.decryptData(
          { encryptedData: encryptedConfig, iv: '', timestamp: '' },
          DataSensitivity.SYSTEM
        ) as CrisisSafetyConfig;
      }

    } catch (error) {
      console.error('Failed to get crisis safety config:', error);
    }

    // Return safe defaults
    return {
      enforceOfflineFirst: true,
      disableCloudOnCrisis: false,
      prioritizeEmergencySync: true,
      bypassNormalLimits: true,
      forceLocalStorage: true,
      alertEmergencyContacts: false
    };
  }

  private async validateCurrentFlags(): Promise<{ valid: boolean; errors: string[] }> {
    if (!this.currentFlags) {
      return { valid: false, errors: ['No current flags'] };
    }

    const validation = await this.validateFlags(this.currentFlags);
    return { valid: validation.valid, errors: validation.errors };
  }

  private async checkUserConsentRequired(updates: Partial<TypeSafeFeatureFlags>): Promise<string[]> {
    const currentFlags = await this.getFlags();
    const profile = this.profiles[currentFlags.profile];

    const consentRequired: string[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (value === true && profile.restrictions.requiresUserConsent.includes(key as keyof CloudFeatureFlags)) {
        consentRequired.push(key);
      }
    }

    return consentRequired;
  }

  private async applyCrisisSafetyChecks(flags: TypeSafeFeatureFlags): Promise<{ safe: boolean; reason?: string }> {
    const crisisConfig = await this.getCrisisSafetyConfig();

    if (crisisConfig.enforceOfflineFirst && flags.enabled && flags.supabaseSync) {
      return {
        safe: false,
        reason: 'Crisis safety mode enforces offline-first operation'
      };
    }

    if (crisisConfig.disableCloudOnCrisis && flags.enabled) {
      return {
        safe: false,
        reason: 'Crisis mode disables all cloud features'
      };
    }

    return { safe: true };
  }

  private detectChanges(
    oldFlags: TypeSafeFeatureFlags,
    newFlags: TypeSafeFeatureFlags
  ): Array<{
    flag: keyof CloudFeatureFlags;
    oldValue: boolean;
    newValue: boolean;
  }> {
    const changes: Array<{
      flag: keyof CloudFeatureFlags;
      oldValue: boolean;
      newValue: boolean;
    }> = [];

    const flagKeys: (keyof CloudFeatureFlags)[] = [
      'enabled', 'supabaseSync', 'encryptedBackup', 'crossDeviceSync',
      'conflictResolution', 'auditLogging', 'emergencySync'
    ];

    for (const key of flagKeys) {
      if (oldFlags[key] !== newFlags[key]) {
        changes.push({
          flag: key,
          oldValue: oldFlags[key],
          newValue: newFlags[key]
        });
      }
    }

    return changes;
  }

  private checkFeatureDependencies(enabledFeatures: string[]): string[] {
    const dependencies: Record<string, string[]> = {
      crossDeviceSync: ['supabaseSync'],
      emergencySync: ['conflictResolution']
    };

    const missing: string[] = [];

    for (const feature of enabledFeatures) {
      const required = dependencies[feature] || [];
      for (const dep of required) {
        if (!enabledFeatures.includes(dep)) {
          missing.push(`${feature} requires ${dep}`);
        }
      }
    }

    return missing;
  }

  private getFeatureDependencies(): readonly (keyof CloudFeatureFlags)[] {
    return ['conflictResolution', 'auditLogging']; // Core dependencies
  }

  private async validateSecurityRequirements(flags: TypeSafeFeatureFlags): Promise<{
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check encryption readiness
      const encryptionStatus = await encryptionService.getSecurityReadiness();

      if (flags.enabled && !encryptionStatus.cloudSyncReady) {
        errors.push('Encryption not ready for cloud sync');
      }

      if (flags.encryptedBackup && !encryptionStatus.zeroKnowledgeReady) {
        warnings.push('Zero-knowledge encryption not fully ready');
      }

      // Check compliance requirements
      if (flags.auditLogging && encryptionStatus.issues.length > 0) {
        warnings.push('Encryption issues may affect audit logging');
      }

    } catch (error) {
      warnings.push('Could not validate security requirements');
    }

    return { errors, warnings };
  }

  private async auditOperation(
    operation: 'read' | 'update' | 'reset' | 'override',
    changes: Array<{ flag: keyof CloudFeatureFlags; oldValue: boolean; newValue: boolean }>,
    context: Record<string, any>
  ): Promise<void> {
    try {
      const auditEntry: FeatureFlagAudit = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        deviceId: context.deviceId || 'unknown',
        operation,
        changes,
        context: {
          userTier: context.userTier || 'unknown',
          appVersion: context.appVersion || 'unknown',
          environment: context.environment || 'unknown',
          crisisMode: context.crisisContext ? true : false
        }
      };

      // Store audit entry (would typically send to audit service)
      const encryptedAudit = await encryptionService.encryptData(
        auditEntry,
        DataSensitivity.SYSTEM
      );

      await SecureStore.setItemAsync(
        `${this.FEATURE_FLAGS_AUDIT_KEY}_${Date.now()}`,
        encryptedAudit.encryptedData
      );

    } catch (error) {
      console.error('Failed to create audit entry:', error);
      // Don't fail the operation due to audit issues
    }
  }
}

// Export singleton instance
export const featureFlagManager = FeatureFlagManager.getInstance();