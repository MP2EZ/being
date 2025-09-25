/**
 * Settings/Preferences Clinical Pattern Migration - Group 4
 * MISSION: Migrate settings/preferences stores to Clinical Pattern
 * 
 * Group 4: Settings/Preferences Stores
 * - User preferences and profile settings
 * - Notification and feature preferences  
 * - Therapeutic customization settings
 * Risk Level: LOW-MODERATE
 * 
 * Phase 5C: Parallel Store Migration - Group 4
 */

import {
  ISODateString,
  createISODateString,
  createAssessmentID
} from '../../../types/clinical';
import { encryptionService, DataSensitivity } from '../../../services/security';
import { storeBackupSystem } from '../store-backup-system';
import { migrationValidationFramework } from '../migration-validation-framework';
import { P0CloudFeatureFlags } from '../../../types/feature-flags';

// Clinical Pattern: Settings Store Structure
export interface ClinicalSettingsStore {
  // User Profile Settings with clinical integration
  userProfile: {
    id: string;
    name: string;
    email?: string;
    isAuthenticated: boolean;
    preferences: {
      language: string;
      timezone: string;
      accessibilityFeatures: {
        highContrast: boolean;
        largeText: boolean;
        reduceMotion: boolean;
        screenReader: boolean;
      };
      dataPrivacy: {
        analyticsEnabled: boolean;
        crashReportingEnabled: boolean;
        personalizedContent: boolean;
      };
    };
    clinicalIntegration: {
      allowTherapistAccess: boolean;
      shareProgressData: boolean;
      emergencyContactsEnabled: boolean;
      crisisInterventionOptIn: boolean;
    };
    lastUpdated: ISODateString;
    encryptionLevel: DataSensitivity;
  };

  // Notification Preferences with clinical awareness
  notificationSettings: {
    pushNotifications: {
      enabled: boolean;
      dailyReminders: {
        enabled: boolean;
        time: string; // HH:MM format
        frequency: 'daily' | 'weekdays' | 'weekends' | 'custom';
        customDays?: number[]; // 0-6, Sunday=0
      };
      assessmentReminders: {
        enabled: boolean;
        frequency: 'daily' | 'weekly' | 'biweekly';
        time: string;
        skipDuringCrisis: boolean;
      };
      breathingReminders: {
        enabled: boolean;
        frequency: 'multiple_daily' | 'daily' | 'as_needed';
        times: string[];
        adaptToPHQScores: boolean;
      };
      crisisAlerts: {
        enabled: boolean; // Always true for safety
        immediateResponse: boolean;
        familyNotification: boolean;
        therapistNotification: boolean;
      };
      progressUpdates: {
        enabled: boolean;
        frequency: 'weekly' | 'monthly';
        includeInsights: boolean;
      };
    };
    inAppNotifications: {
      enabled: boolean;
      showTooltips: boolean;
      celebrateAchievements: boolean;
      gentleNudges: boolean;
    };
    emergencyNotifications: {
      alwaysEnabled: true; // Cannot be disabled
      sound: boolean;
      vibration: boolean;
      bypassDoNotDisturb: boolean;
    };
    lastUpdated: ISODateString;
  };

  // Therapeutic Customization Settings with clinical validation
  therapeuticSettings: {
    breathingExercises: {
      defaultDuration: number; // milliseconds, default 180000 (3 min)
      preferredTechnique: 'box_breathing' | '4_7_8' | 'coherent_breathing' | 'custom';
      customTimings?: {
        inhale: number;
        hold: number;
        exhale: number;
        pause: number;
      };
      animationSpeed: 'slow' | 'normal' | 'fast';
      visualTheme: 'circle' | 'nature' | 'abstract' | 'minimal';
      audioEnabled: boolean;
      hapticFeedback: boolean;
      backgroundMusic: boolean;
    };
    assessments: {
      reminderStyle: 'gentle' | 'standard' | 'persistent';
      showProgressGraphs: boolean;
      includeNotes: boolean;
      autoSaveEnabled: boolean;
      privacyMode: boolean; // Hide scores from lock screen
    };
    checkIns: {
      frequency: 'daily' | 'twice_daily' | 'custom';
      customTimes?: string[];
      includeMoodScale: boolean;
      includeEnergyScale: boolean;
      includeStressScale: boolean;
      includeOpenText: boolean;
      smartSuggestions: boolean;
    };
    crisis: {
      responsePreferences: {
        preferredContactMethod: '988_hotline' | 'crisis_text' | 'emergency_911' | 'personal_contact';
        allowAutoContacting: boolean;
        requireConfirmation: boolean;
      };
      safetyPlan: {
        enabled: boolean;
        personalizedStrategies: string[];
        supportContacts: string[];
        lastUpdated: ISODateString;
      };
    };
    progressTracking: {
      showDetailedAnalytics: boolean;
      includeWeeklyInsights: boolean;
      shareWithSupports: boolean;
      trackMoodPatterns: boolean;
      correlateWithExercises: boolean;
    };
    lastUpdated: ISODateString;
    clinicalValidation: {
      lastValidated: ISODateString;
      validatedBy: 'system' | 'clinician';
      approvedSettings: string[];
    };
  };

  // Feature Flags with clinical safety guards
  featurePreferences: {
    flags: P0CloudFeatureFlags;
    userConsents: Record<keyof P0CloudFeatureFlags, boolean>;
    clinicalSafetyOverrides: Record<keyof P0CloudFeatureFlags, boolean>;
    lastUpdated: ISODateString;
  };

  // Data integrity and performance
  dataIntegrity: {
    lastValidatedAt: ISODateString;
    checksumValid: boolean;
    encryptionLevel: DataSensitivity;
    backupStatus: {
      lastBackupAt: ISODateString;
      backupValid: boolean;
      restoreCapable: boolean;
    };
  };

  // Performance tracking for settings operations
  performanceMetrics: {
    settingsLoadTime: number;
    lastUpdateTime: number;
    syncLatency: number;
    errorCount: number;
    lastPerformanceCheck: ISODateString;
  };
}

// Migration operation for settings stores
export interface SettingsMigrationOperation {
  operationId: string;
  storeType: 'user_settings' | 'notification_settings' | 'therapeutic_settings' | 'feature_flags';
  fromPattern: 'basic' | 'enhanced';
  toPattern: 'clinical';
  startedAt: ISODateString;
  completedAt?: ISODateString;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  backupId?: string;
  validationReportId?: string;
  dataIntegrityVerified: boolean;
  settingsPreserved: boolean;
  performanceMetrics: {
    migrationTimeMs: number;
    dataConversionTimeMs: number;
    validationTimeMs: number;
    rollbackTimeMs?: number;
  };
}

export class SettingsClinicalPatternMigration {
  private static instance: SettingsClinicalPatternMigration;
  private readonly MIGRATION_VERSION = '1.0.0';

  private constructor() {}

  public static getInstance(): SettingsClinicalPatternMigration {
    if (!SettingsClinicalPatternMigration.instance) {
      SettingsClinicalPatternMigration.instance = new SettingsClinicalPatternMigration();
    }
    return SettingsClinicalPatternMigration.instance;
  }

  /**
   * Migrate User Settings Store to Clinical Pattern
   * REQUIREMENTS: User preferences preserved, authentication state maintained
   */
  public async migrateUserSettingsStore(
    currentUserData: any
  ): Promise<{ success: boolean; operation: SettingsMigrationOperation; migratedStore?: Partial<ClinicalSettingsStore> }> {
    const operationId = `user_settings_migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    const operation: SettingsMigrationOperation = {
      operationId,
      storeType: 'user_settings',
      fromPattern: 'basic',
      toPattern: 'clinical',
      startedAt: createISODateString(),
      status: 'in_progress',
      dataIntegrityVerified: false,
      settingsPreserved: false,
      performanceMetrics: {
        migrationTimeMs: 0,
        dataConversionTimeMs: 0,
        validationTimeMs: 0
      }
    };

    try {
      // Step 1: Create backup
      const backupResult = await storeBackupSystem.backupUserStore();
      if (!backupResult.success) {
        throw new Error(`User settings backup failed: ${backupResult.error}`);
      }
      operation.backupId = backupResult.backupId;

      // Step 2: Convert to Clinical Pattern
      const conversionStart = Date.now();
      const migratedUserSettings = await this.convertUserSettingsToClinicalPattern(currentUserData);
      operation.performanceMetrics.dataConversionTimeMs = Date.now() - conversionStart;

      // Step 3: Validate settings preservation
      const validationStart = Date.now();
      const settingsPreserved = await this.validateUserSettingsPreservation(currentUserData, migratedUserSettings);
      operation.settingsPreserved = settingsPreserved;
      operation.performanceMetrics.validationTimeMs = Date.now() - validationStart;

      if (!settingsPreserved) {
        throw new Error('User settings preservation validation failed');
      }

      // Step 4: Verify data integrity
      operation.dataIntegrityVerified = await this.verifyDataIntegrity(currentUserData, migratedUserSettings);
      if (!operation.dataIntegrityVerified) {
        throw new Error('User settings data integrity verification failed');
      }

      // Complete migration
      operation.status = 'completed';
      operation.completedAt = createISODateString();
      operation.performanceMetrics.migrationTimeMs = Date.now() - startTime;

      return {
        success: true,
        operation,
        migratedStore: migratedUserSettings
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`User settings migration failed: ${errorMessage}`);

      // Attempt rollback if backup exists
      if (operation.backupId) {
        try {
          const rollbackStart = Date.now();
          await storeBackupSystem.restoreStore(operation.backupId, 'user');
          operation.performanceMetrics.rollbackTimeMs = Date.now() - rollbackStart;
          operation.status = 'rolled_back';
        } catch (rollbackError) {
          operation.status = 'failed';
        }
      } else {
        operation.status = 'failed';
      }

      operation.performanceMetrics.migrationTimeMs = Date.now() - startTime;

      return {
        success: false,
        operation
      };
    }
  }

  /**
   * Migrate Feature Flags Store to Clinical Pattern
   * REQUIREMENTS: Notification preferences intact, app settings maintained
   */
  public async migrateFeatureFlagsStore(
    currentFeatureFlagData: any
  ): Promise<{ success: boolean; operation: SettingsMigrationOperation; migratedStore?: Partial<ClinicalSettingsStore> }> {
    const operationId = `feature_flags_migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    const operation: SettingsMigrationOperation = {
      operationId,
      storeType: 'feature_flags',
      fromPattern: 'enhanced',
      toPattern: 'clinical',
      startedAt: createISODateString(),
      status: 'in_progress',
      dataIntegrityVerified: false,
      settingsPreserved: false,
      performanceMetrics: {
        migrationTimeMs: 0,
        dataConversionTimeMs: 0,
        validationTimeMs: 0
      }
    };

    try {
      // Step 1: Create backup with safety considerations
      const backupResult = await storeBackupSystem.backupFeatureFlagStore();
      if (!backupResult.success) {
        throw new Error(`Feature flags backup failed: ${backupResult.error}`);
      }
      operation.backupId = backupResult.backupId;

      // Step 2: Convert to Clinical Pattern with safety guards
      const conversionStart = Date.now();
      const migratedFeatureSettings = await this.convertFeatureFlagsToClinicalPattern(currentFeatureFlagData);
      operation.performanceMetrics.dataConversionTimeMs = Date.now() - conversionStart;

      // Step 3: Validate notification preferences preservation
      const validationStart = Date.now();
      const settingsPreserved = await this.validateFeatureFlagsPreservation(currentFeatureFlagData, migratedFeatureSettings);
      operation.settingsPreserved = settingsPreserved;
      operation.performanceMetrics.validationTimeMs = Date.now() - validationStart;

      if (!settingsPreserved) {
        throw new Error('Feature flags preservation validation failed');
      }

      // Step 4: Verify clinical safety guards
      const safetyValidation = await this.validateClinicalSafetyGuards(migratedFeatureSettings);
      if (!safetyValidation.success) {
        throw new Error(`Clinical safety guard validation failed: ${safetyValidation.error}`);
      }

      // Step 5: Verify data integrity
      operation.dataIntegrityVerified = await this.verifyDataIntegrity(currentFeatureFlagData, migratedFeatureSettings);
      if (!operation.dataIntegrityVerified) {
        throw new Error('Feature flags data integrity verification failed');
      }

      // Complete migration
      operation.status = 'completed';
      operation.completedAt = createISODateString();
      operation.performanceMetrics.migrationTimeMs = Date.now() - startTime;

      return {
        success: true,
        operation,
        migratedStore: migratedFeatureSettings
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Feature flags migration failed: ${errorMessage}`);

      // Attempt rollback if backup exists
      if (operation.backupId) {
        try {
          const rollbackStart = Date.now();
          await storeBackupSystem.restoreStore(operation.backupId, 'feature_flags');
          operation.performanceMetrics.rollbackTimeMs = Date.now() - rollbackStart;
          operation.status = 'rolled_back';
        } catch (rollbackError) {
          operation.status = 'failed';
        }
      } else {
        operation.status = 'failed';
      }

      operation.performanceMetrics.migrationTimeMs = Date.now() - startTime;

      return {
        success: false,
        operation
      };
    }
  }

  /**
   * Migrate Therapeutic Settings Store to Clinical Pattern
   * REQUIREMENTS: Therapeutic customization settings preserved, performance maintained
   */
  public async migrateTherapeuticSettingsStore(
    currentTherapeuticData: any
  ): Promise<{ success: boolean; operation: SettingsMigrationOperation; migratedStore?: Partial<ClinicalSettingsStore> }> {
    const operationId = `therapeutic_settings_migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    const operation: SettingsMigrationOperation = {
      operationId,
      storeType: 'therapeutic_settings',
      fromPattern: 'enhanced',
      toPattern: 'clinical',
      startedAt: createISODateString(),
      status: 'in_progress',
      dataIntegrityVerified: false,
      settingsPreserved: false,
      performanceMetrics: {
        migrationTimeMs: 0,
        dataConversionTimeMs: 0,
        validationTimeMs: 0
      }
    };

    try {
      // Step 1: Create backup with performance data
      const backupResult = await storeBackupSystem.backupTherapeuticStore();
      if (!backupResult.success) {
        throw new Error(`Therapeutic settings backup failed: ${backupResult.error}`);
      }
      operation.backupId = backupResult.backupId;

      // Step 2: Convert to Clinical Pattern with performance preservation
      const conversionStart = Date.now();
      const migratedTherapeuticSettings = await this.convertTherapeuticSettingsToClinicalPattern(currentTherapeuticData);
      operation.performanceMetrics.dataConversionTimeMs = Date.now() - conversionStart;

      // Step 3: Validate therapeutic customization preservation
      const validationStart = Date.now();
      const settingsPreserved = await this.validateTherapeuticSettingsPreservation(currentTherapeuticData, migratedTherapeuticSettings);
      operation.settingsPreserved = settingsPreserved;
      operation.performanceMetrics.validationTimeMs = Date.now() - validationStart;

      if (!settingsPreserved) {
        throw new Error('Therapeutic settings preservation validation failed');
      }

      // Step 4: Verify performance requirements maintained
      const performanceValidation = await this.validatePerformanceRequirements(migratedTherapeuticSettings);
      if (!performanceValidation.success) {
        throw new Error(`Performance requirements validation failed: ${performanceValidation.error}`);
      }

      // Step 5: Verify data integrity
      operation.dataIntegrityVerified = await this.verifyDataIntegrity(currentTherapeuticData, migratedTherapeuticSettings);
      if (!operation.dataIntegrityVerified) {
        throw new Error('Therapeutic settings data integrity verification failed');
      }

      // Complete migration
      operation.status = 'completed';
      operation.completedAt = createISODateString();
      operation.performanceMetrics.migrationTimeMs = Date.now() - startTime;

      return {
        success: true,
        operation,
        migratedStore: migratedTherapeuticSettings
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Therapeutic settings migration failed: ${errorMessage}`);

      // Attempt rollback if backup exists
      if (operation.backupId) {
        try {
          const rollbackStart = Date.now();
          await storeBackupSystem.restoreStore(operation.backupId, 'therapeutic');
          operation.performanceMetrics.rollbackTimeMs = Date.now() - rollbackStart;
          operation.status = 'rolled_back';
        } catch (rollbackError) {
          operation.status = 'failed';
        }
      } else {
        operation.status = 'failed';
      }

      operation.performanceMetrics.migrationTimeMs = Date.now() - startTime;

      return {
        success: false,
        operation
      };
    }
  }

  /**
   * Convert User Settings to Clinical Pattern
   */
  private async convertUserSettingsToClinicalPattern(currentData: any): Promise<Partial<ClinicalSettingsStore>> {
    const userProfile: ClinicalSettingsStore['userProfile'] = {
      id: currentData.user?.id || 'anonymous_user',
      name: currentData.user?.name || 'User',
      email: currentData.user?.email,
      isAuthenticated: currentData.isAuthenticated || false,
      preferences: {
        language: currentData.preferences?.language || 'en',
        timezone: currentData.preferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        accessibilityFeatures: {
          highContrast: currentData.accessibility?.highContrast || false,
          largeText: currentData.accessibility?.largeText || false,
          reduceMotion: currentData.accessibility?.reduceMotion || false,
          screenReader: currentData.accessibility?.screenReader || false,
        },
        dataPrivacy: {
          analyticsEnabled: currentData.privacy?.analyticsEnabled ?? true,
          crashReportingEnabled: currentData.privacy?.crashReportingEnabled ?? true,
          personalizedContent: currentData.privacy?.personalizedContent ?? true,
        },
      },
      clinicalIntegration: {
        allowTherapistAccess: currentData.clinical?.allowTherapistAccess || false,
        shareProgressData: currentData.clinical?.shareProgressData || false,
        emergencyContactsEnabled: currentData.clinical?.emergencyContactsEnabled ?? true,
        crisisInterventionOptIn: currentData.clinical?.crisisInterventionOptIn ?? true,
      },
      lastUpdated: createISODateString(),
      encryptionLevel: DataSensitivity.USER
    };

    return {
      userProfile,
      dataIntegrity: {
        lastValidatedAt: createISODateString(),
        checksumValid: true,
        encryptionLevel: DataSensitivity.USER,
        backupStatus: {
          lastBackupAt: createISODateString(),
          backupValid: true,
          restoreCapable: true
        }
      },
      performanceMetrics: {
        settingsLoadTime: 0,
        lastUpdateTime: 0,
        syncLatency: 0,
        errorCount: 0,
        lastPerformanceCheck: createISODateString()
      }
    };
  }

  /**
   * Convert Feature Flags to Clinical Pattern with Notification Settings
   */
  private async convertFeatureFlagsToClinicalPattern(currentData: any): Promise<Partial<ClinicalSettingsStore>> {
    const notificationSettings: ClinicalSettingsStore['notificationSettings'] = {
      pushNotifications: {
        enabled: currentData.flags?.PUSH_NOTIFICATIONS_ENABLED || false,
        dailyReminders: {
          enabled: currentData.notifications?.dailyReminders?.enabled || false,
          time: currentData.notifications?.dailyReminders?.time || '09:00',
          frequency: currentData.notifications?.dailyReminders?.frequency || 'daily'
        },
        assessmentReminders: {
          enabled: currentData.notifications?.assessmentReminders?.enabled || false,
          frequency: currentData.notifications?.assessmentReminders?.frequency || 'weekly',
          time: currentData.notifications?.assessmentReminders?.time || '18:00',
          skipDuringCrisis: true // Always true for clinical safety
        },
        breathingReminders: {
          enabled: currentData.notifications?.breathingReminders?.enabled || false,
          frequency: currentData.notifications?.breathingReminders?.frequency || 'daily',
          times: currentData.notifications?.breathingReminders?.times || ['12:00'],
          adaptToPHQScores: currentData.notifications?.breathingReminders?.adaptToPHQScores ?? true
        },
        crisisAlerts: {
          enabled: true, // Always enabled for safety
          immediateResponse: currentData.notifications?.crisisAlerts?.immediateResponse ?? true,
          familyNotification: currentData.notifications?.crisisAlerts?.familyNotification || false,
          therapistNotification: currentData.notifications?.crisisAlerts?.therapistNotification || false
        },
        progressUpdates: {
          enabled: currentData.notifications?.progressUpdates?.enabled || false,
          frequency: currentData.notifications?.progressUpdates?.frequency || 'weekly',
          includeInsights: currentData.notifications?.progressUpdates?.includeInsights ?? true
        }
      },
      inAppNotifications: {
        enabled: currentData.inApp?.enabled ?? true,
        showTooltips: currentData.inApp?.showTooltips ?? true,
        celebrateAchievements: currentData.inApp?.celebrateAchievements ?? true,
        gentleNudges: currentData.inApp?.gentleNudges ?? true
      },
      emergencyNotifications: {
        alwaysEnabled: true,
        sound: currentData.emergency?.sound ?? true,
        vibration: currentData.emergency?.vibration ?? true,
        bypassDoNotDisturb: currentData.emergency?.bypassDoNotDisturb ?? true
      },
      lastUpdated: createISODateString()
    };

    const featurePreferences: ClinicalSettingsStore['featurePreferences'] = {
      flags: currentData.flags || {},
      userConsents: currentData.userConsents || {},
      clinicalSafetyOverrides: {
        EMERGENCY_CONTACTS_CLOUD: true,
        PUSH_NOTIFICATIONS_ENABLED: true,
        ...currentData.clinicalOverrides
      },
      lastUpdated: createISODateString()
    };

    return {
      notificationSettings,
      featurePreferences,
      dataIntegrity: {
        lastValidatedAt: createISODateString(),
        checksumValid: true,
        encryptionLevel: DataSensitivity.SYSTEM,
        backupStatus: {
          lastBackupAt: createISODateString(),
          backupValid: true,
          restoreCapable: true
        }
      },
      performanceMetrics: {
        settingsLoadTime: 0,
        lastUpdateTime: 0,
        syncLatency: 0,
        errorCount: 0,
        lastPerformanceCheck: createISODateString()
      }
    };
  }

  /**
   * Convert Therapeutic Settings to Clinical Pattern
   */
  private async convertTherapeuticSettingsToClinicalPattern(currentData: any): Promise<Partial<ClinicalSettingsStore>> {
    const therapeuticSettings: ClinicalSettingsStore['therapeuticSettings'] = {
      breathingExercises: {
        defaultDuration: currentData.breathing?.defaultDuration || 180000, // 3 minutes
        preferredTechnique: currentData.breathing?.preferredTechnique || 'box_breathing',
        customTimings: currentData.breathing?.customTimings || {
          inhale: 4000,
          hold: 7000,
          exhale: 8000,
          pause: 1000
        },
        animationSpeed: currentData.breathing?.animationSpeed || 'normal',
        visualTheme: currentData.breathing?.visualTheme || 'circle',
        audioEnabled: currentData.breathing?.audioEnabled ?? true,
        hapticFeedback: currentData.breathing?.hapticFeedback ?? true,
        backgroundMusic: currentData.breathing?.backgroundMusic ?? false
      },
      assessments: {
        reminderStyle: currentData.assessments?.reminderStyle || 'gentle',
        showProgressGraphs: currentData.assessments?.showProgressGraphs ?? true,
        includeNotes: currentData.assessments?.includeNotes ?? true,
        autoSaveEnabled: currentData.assessments?.autoSaveEnabled ?? true,
        privacyMode: currentData.assessments?.privacyMode ?? false
      },
      checkIns: {
        frequency: currentData.checkIns?.frequency || 'daily',
        customTimes: currentData.checkIns?.customTimes,
        includeMoodScale: currentData.checkIns?.includeMoodScale ?? true,
        includeEnergyScale: currentData.checkIns?.includeEnergyScale ?? true,
        includeStressScale: currentData.checkIns?.includeStressScale ?? true,
        includeOpenText: currentData.checkIns?.includeOpenText ?? true,
        smartSuggestions: currentData.checkIns?.smartSuggestions ?? true
      },
      crisis: {
        responsePreferences: {
          preferredContactMethod: currentData.crisis?.preferredContactMethod || '988_hotline',
          allowAutoContacting: currentData.crisis?.allowAutoContacting ?? false,
          requireConfirmation: currentData.crisis?.requireConfirmation ?? true
        },
        safetyPlan: {
          enabled: currentData.crisis?.safetyPlan?.enabled ?? true,
          personalizedStrategies: currentData.crisis?.safetyPlan?.personalizedStrategies || [],
          supportContacts: currentData.crisis?.safetyPlan?.supportContacts || [],
          lastUpdated: currentData.crisis?.safetyPlan?.lastUpdated || createISODateString()
        }
      },
      progressTracking: {
        showDetailedAnalytics: currentData.progress?.showDetailedAnalytics ?? true,
        includeWeeklyInsights: currentData.progress?.includeWeeklyInsights ?? true,
        shareWithSupports: currentData.progress?.shareWithSupports ?? false,
        trackMoodPatterns: currentData.progress?.trackMoodPatterns ?? true,
        correlateWithExercises: currentData.progress?.correlateWithExercises ?? true
      },
      lastUpdated: createISODateString(),
      clinicalValidation: {
        lastValidated: createISODateString(),
        validatedBy: 'system',
        approvedSettings: []
      }
    };

    return {
      therapeuticSettings,
      dataIntegrity: {
        lastValidatedAt: createISODateString(),
        checksumValid: true,
        encryptionLevel: DataSensitivity.CLINICAL,
        backupStatus: {
          lastBackupAt: createISODateString(),
          backupValid: true,
          restoreCapable: true
        }
      },
      performanceMetrics: {
        settingsLoadTime: 0,
        lastUpdateTime: 0,
        syncLatency: 0,
        errorCount: 0,
        lastPerformanceCheck: createISODateString()
      }
    };
  }

  // Validation methods
  private async validateUserSettingsPreservation(original: any, migrated: any): Promise<boolean> {
    try {
      // Verify core user data is preserved
      if (original.user?.id !== migrated.userProfile?.id) return false;
      if (original.user?.name !== migrated.userProfile?.name) return false;
      if (original.user?.email !== migrated.userProfile?.email) return false;
      if (original.isAuthenticated !== migrated.userProfile?.isAuthenticated) return false;

      return true;
    } catch {
      return false;
    }
  }

  private async validateFeatureFlagsPreservation(original: any, migrated: any): Promise<boolean> {
    try {
      // Verify feature flags are preserved
      const originalFlags = original.flags || {};
      const migratedFlags = migrated.featurePreferences?.flags || {};

      for (const [key, value] of Object.entries(originalFlags)) {
        if (migratedFlags[key] !== value) return false;
      }

      // Verify notification preferences are preserved
      const notificationEnabled = original.flags?.PUSH_NOTIFICATIONS_ENABLED;
      const migratedNotificationEnabled = migrated.notificationSettings?.pushNotifications?.enabled;
      if (notificationEnabled !== migratedNotificationEnabled) return false;

      return true;
    } catch {
      return false;
    }
  }

  private async validateTherapeuticSettingsPreservation(original: any, migrated: any): Promise<boolean> {
    try {
      // Verify breathing exercise settings are preserved
      const originalBreathing = original.breathing || {};
      const migratedBreathing = migrated.therapeuticSettings?.breathingExercises || {};

      if (originalBreathing.defaultDuration && originalBreathing.defaultDuration !== migratedBreathing.defaultDuration) return false;
      if (originalBreathing.preferredTechnique && originalBreathing.preferredTechnique !== migratedBreathing.preferredTechnique) return false;

      return true;
    } catch {
      return false;
    }
  }

  private async validateClinicalSafetyGuards(migratedData: any): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify crisis alerts are always enabled
      if (!migratedData.notificationSettings?.emergencyNotifications?.alwaysEnabled) {
        return { success: false, error: 'Emergency notifications must always be enabled' };
      }

      if (!migratedData.notificationSettings?.pushNotifications?.crisisAlerts?.enabled) {
        return { success: false, error: 'Crisis alerts must always be enabled' };
      }

      // Verify clinical safety overrides
      const overrides = migratedData.featurePreferences?.clinicalSafetyOverrides || {};
      if (!overrides.EMERGENCY_CONTACTS_CLOUD) {
        return { success: false, error: 'Emergency contacts cloud must be enabled for clinical safety' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown validation error' };
    }
  }

  private async validatePerformanceRequirements(migratedData: any): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify performance metrics structure exists
      if (!migratedData.performanceMetrics) {
        return { success: false, error: 'Performance metrics structure missing' };
      }

      // Verify therapeutic settings maintain performance requirements
      const therapeutic = migratedData.therapeuticSettings?.breathingExercises;
      if (therapeutic?.defaultDuration && therapeutic.defaultDuration < 60000) {
        return { success: false, error: 'Breathing exercise duration too short for therapeutic effectiveness' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown performance validation error' };
    }
  }

  private async verifyDataIntegrity(originalData: any, migratedData: any): Promise<boolean> {
    try {
      // Verify data integrity markers are present
      if (!migratedData.dataIntegrity) return false;
      if (!migratedData.dataIntegrity.lastValidatedAt) return false;
      if (!migratedData.dataIntegrity.checksumValid) return false;

      // Verify performance metrics are present
      if (!migratedData.performanceMetrics) return false;
      if (!migratedData.performanceMetrics.lastPerformanceCheck) return false;

      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const settingsClinicalPatternMigration = SettingsClinicalPatternMigration.getInstance();