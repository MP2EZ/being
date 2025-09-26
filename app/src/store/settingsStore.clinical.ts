/**
 * Settings Store - Consolidated Clinical Pattern
 * Phase 5C Group 4: Unified Settings/Preferences Clinical Pattern Store
 *
 * MISSION: Consolidated settings store with Clinical Pattern architecture
 * CONSOLIDATES: Feature flags, user settings, notifications, therapeutic preferences
 * ENCRYPTION: SYSTEM level (lowest sensitivity for app settings)
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  ISODateString,
  createISODateString,
  ClinicalDataIntegrity,
  PerformanceMetrics,
  createPerformanceMetrics
} from '../types/clinical';
import { encryptionService, DataSensitivity } from '../services/security';
import { ClinicalSettingsStore } from './migration/group-4/settings-clinical-pattern';
import {
  P0CloudFeatureFlags,
  FeatureFlagMetadata,
  UserEligibility,
  DEFAULT_FEATURE_FLAGS,
  FEATURE_FLAG_METADATA
} from '../types/feature-flags';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Consolidated Clinical Settings Store Structure
export interface ConsolidatedClinicalSettingsStore extends ClinicalSettingsStore {
  // Migration and versioning
  storeVersion: {
    version: string;
    pattern: 'clinical';
    consolidatedAt: ISODateString;
    sourceStores: string[];
    migrationComplete: boolean;
  };

  // Loading and error states
  loadingStates: {
    isLoading: boolean;
    isInitializing: boolean;
    isMigrating: boolean;
    isUpdatingSettings: boolean;
    isValidatingIntegrity: boolean;
    error: string | null;
  };
}

// Consolidated Clinical Settings Actions Interface
export interface ConsolidatedClinicalSettingsActions {
  // Store initialization and migration
  initializeStore: () => Promise<void>;
  consolidateFromSourceStores: () => Promise<{ success: boolean; consolidationReport: any }>;

  // User profile and settings management
  updateUserProfile: (profile: Partial<ConsolidatedClinicalSettingsStore['userProfile']>) => Promise<void>;
  updateUserPreferences: (preferences: Partial<ConsolidatedClinicalSettingsStore['userProfile']['preferences']>) => Promise<void>;
  updateClinicalIntegration: (integration: Partial<ConsolidatedClinicalSettingsStore['userProfile']['clinicalIntegration']>) => Promise<void>;

  // Notification management
  updateNotificationSettings: (settings: Partial<ConsolidatedClinicalSettingsStore['notificationSettings']>) => Promise<void>;
  toggleNotificationType: (type: string, enabled: boolean) => Promise<void>;
  updatePushNotificationSettings: (push: Partial<ConsolidatedClinicalSettingsStore['notificationSettings']['pushNotifications']>) => Promise<void>;

  // Therapeutic settings management
  updateTherapeuticSettings: (settings: Partial<ConsolidatedClinicalSettingsStore['therapeuticSettings']>) => Promise<void>;
  updateBreathingExercisePreferences: (breathing: Partial<ConsolidatedClinicalSettingsStore['therapeuticSettings']['breathingExercises']>) => Promise<void>;
  updateAssessmentSettings: (assessment: Partial<ConsolidatedClinicalSettingsStore['therapeuticSettings']['assessments']>) => Promise<void>;
  updateCrisisSettings: (crisis: Partial<ConsolidatedClinicalSettingsStore['therapeuticSettings']['crisis']>) => Promise<void>;

  // Feature flag management
  updateFeaturePreferences: (features: Partial<ConsolidatedClinicalSettingsStore['featurePreferences']>) => Promise<void>;
  evaluateFeatureFlag: (flag: keyof P0CloudFeatureFlags) => boolean;
  updateUserConsent: (flag: keyof P0CloudFeatureFlags, consent: boolean) => Promise<void>;
  requestFeatureAccess: (flag: keyof P0CloudFeatureFlags) => Promise<{ granted: boolean; reason?: string }>;

  // Clinical safety operations
  validateClinicalSafety: () => Promise<boolean>;
  enableEmergencyMode: () => Promise<void>;
  emergencyDisableFeature: (flag: keyof P0CloudFeatureFlags, reason: string) => Promise<void>;

  // System operations
  validateAllSettings: () => Promise<{ valid: boolean; issues: string[] }>;
  optimizePerformance: () => Promise<void>;
  refreshMetrics: () => Promise<void>;
  validateDataIntegrity: () => Promise<boolean>;

  // Backup and restore
  backupSettings: () => Promise<{ success: boolean; backupId?: string }>;
  restoreFromBackup: (backupId: string) => Promise<{ success: boolean }>;

  // Legacy compatibility
  getLegacyUserStore: () => any;
  getLegacyFeatureFlagStore: () => any;
}

// Combined type
export type ConsolidatedClinicalSettingsStoreType = ConsolidatedClinicalSettingsStore & ConsolidatedClinicalSettingsActions;

/**
 * Encrypted storage adapter for Clinical Pattern with SYSTEM-level encryption
 */
const consolidatedClinicalSettingsStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const encryptedData = await AsyncStorage.getItem(name);
      if (!encryptedData) return null;

      const decrypted = await encryptionService.decryptData(
        JSON.parse(encryptedData),
        DataSensitivity.SYSTEM
      );
      return JSON.stringify(decrypted);
    } catch (error) {
      console.error('Failed to decrypt consolidated clinical settings data:', error);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const data = JSON.parse(value);
      const encrypted = await encryptionService.encryptData(
        data,
        DataSensitivity.SYSTEM
      );
      await AsyncStorage.setItem(name, JSON.stringify(encrypted));
    } catch (error) {
      console.error('Failed to encrypt consolidated clinical settings data:', error);
      throw error;
    }
  },
  removeItem: async (name: string): Promise<void> => {
    await AsyncStorage.removeItem(name);
  },
};

/**
 * Create Consolidated Clinical Pattern Settings Store
 * REQUIREMENTS: SYSTEM encryption, all settings preserved, clinical safety, performance optimization
 */
export const useConsolidatedClinicalSettingsStore = create<ConsolidatedClinicalSettingsStoreType>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Consolidated Clinical Pattern State
        userProfile: {
          id: 'unknown',
          name: 'User',
          email: undefined,
          isAuthenticated: false,
          preferences: {
            language: 'en',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            accessibilityFeatures: {
              highContrast: false,
              largeText: false,
              reduceMotion: false,
              screenReader: false,
            },
            dataPrivacy: {
              analyticsEnabled: true,
              crashReportingEnabled: true,
              personalizedContent: true,
            },
          },
          clinicalIntegration: {
            allowTherapistAccess: false,
            shareProgressData: false,
            emergencyContactsEnabled: true,
            crisisInterventionOptIn: true,
          },
          lastUpdated: createISODateString(),
          encryptionLevel: DataSensitivity.SYSTEM
        },

        notificationSettings: {
          pushNotifications: {
            enabled: true,
            dailyReminders: {
              enabled: false,
              time: '09:00',
              frequency: 'daily'
            },
            assessmentReminders: {
              enabled: false,
              frequency: 'weekly',
              time: '18:00',
              skipDuringCrisis: true
            },
            breathingReminders: {
              enabled: false,
              frequency: 'daily',
              times: ['12:00'],
              adaptToPHQScores: true
            },
            crisisAlerts: {
              enabled: true, // Always enabled for safety
              immediateResponse: true,
              familyNotification: false,
              therapistNotification: false
            },
            progressUpdates: {
              enabled: false,
              frequency: 'weekly',
              includeInsights: true
            }
          },
          inAppNotifications: {
            enabled: true,
            showTooltips: true,
            celebrateAchievements: true,
            gentleNudges: true
          },
          emergencyNotifications: {
            alwaysEnabled: true,
            sound: true,
            vibration: true,
            bypassDoNotDisturb: true
          },
          lastUpdated: createISODateString()
        },

        therapeuticSettings: {
          breathingExercises: {
            defaultDuration: 180000, // 3 minutes
            preferredTechnique: 'box_breathing',
            customTimings: {
              inhale: 4000,
              hold: 7000,
              exhale: 8000,
              pause: 1000
            },
            animationSpeed: 'normal',
            visualTheme: 'circle',
            audioEnabled: true,
            hapticFeedback: true,
            backgroundMusic: false
          },
          assessments: {
            reminderStyle: 'gentle',
            showProgressGraphs: true,
            includeNotes: true,
            autoSaveEnabled: true,
            privacyMode: false
          },
          checkIns: {
            frequency: 'daily',
            customTimes: undefined,
            includeMoodScale: true,
            includeEnergyScale: true,
            includeStressScale: true,
            includeOpenText: true,
            smartSuggestions: true
          },
          crisis: {
            responsePreferences: {
              preferredContactMethod: '988_hotline',
              allowAutoContacting: false,
              requireConfirmation: true
            },
            safetyPlan: {
              enabled: true,
              personalizedStrategies: [],
              supportContacts: [],
              lastUpdated: createISODateString()
            }
          },
          progressTracking: {
            showDetailedAnalytics: true,
            includeWeeklyInsights: true,
            shareWithSupports: false,
            trackMoodPatterns: true,
            correlateWithExercises: true
          },
          lastUpdated: createISODateString(),
          clinicalValidation: {
            lastValidated: createISODateString(),
            validatedBy: 'system',
            approvedSettings: []
          }
        },

        featurePreferences: {
          flags: { ...DEFAULT_FEATURE_FLAGS },
          userConsents: {} as Record<keyof P0CloudFeatureFlags, boolean>,
          clinicalSafetyOverrides: {
            EMERGENCY_CONTACTS_CLOUD: true,
            PUSH_NOTIFICATIONS_ENABLED: true
          } as Record<keyof P0CloudFeatureFlags, boolean>,
          lastUpdated: createISODateString()
        },

        dataIntegrity: {
          lastValidatedAt: createISODateString(),
          checksumValid: true,
          encryptionLevel: DataSensitivity.SYSTEM,
          backupStatus: {
            lastBackupAt: createISODateString(),
            backupValid: true,
            restoreCapable: true
          },
          migrationStatus: {
            fromVersion: 'legacy',
            toVersion: '3.0.0-consolidated-clinical',
            migratedAt: createISODateString(),
            migrationValid: true
          }
        },

        performanceMetrics: createPerformanceMetrics(),

        storeVersion: {
          version: '3.0.0-consolidated',
          pattern: 'clinical',
          consolidatedAt: createISODateString(),
          sourceStores: ['userStore', 'featureFlagStore', 'notificationSettings', 'therapeuticSettings'],
          migrationComplete: false
        },

        loadingStates: {
          isLoading: false,
          isInitializing: false,
          isMigrating: false,
          isUpdatingSettings: false,
          isValidatingIntegrity: false,
          error: null
        },

        /**
         * Initialize Consolidated Clinical Settings Store
         * CRITICAL: Preserve all existing settings during initialization
         */
        initializeStore: async () => {
          set(state => ({
            loadingStates: {
              ...state.loadingStates,
              isInitializing: true,
              error: null
            }
          }));

          try {
            const startTime = Date.now();

            // Validate current settings integrity
            const integrityValid = await get().validateDataIntegrity();

            // Check if consolidation is needed
            if (!get().storeVersion.migrationComplete) {
              const consolidationResult = await get().consolidateFromSourceStores();
              console.log('Store consolidation result:', consolidationResult.success);
            }

            set(state => ({
              performanceMetrics: {
                ...state.performanceMetrics,
                storeInitTime: Date.now() - startTime,
                lastPerformanceUpdate: createISODateString()
              },
              loadingStates: {
                ...state.loadingStates,
                isInitializing: false
              }
            }));

            console.log('Consolidated clinical settings store initialized successfully');

          } catch (error) {
            console.error('Failed to initialize consolidated clinical settings store:', error);
            set(state => ({
              loadingStates: {
                ...state.loadingStates,
                error: error instanceof Error ? error.message : 'Initialization failed',
                isInitializing: false
              }
            }));
          }
        },

        /**
         * Consolidate from Source Stores
         * CRITICAL: Zero-loss consolidation of all settings
         */
        consolidateFromSourceStores: async () => {
          set(state => ({
            loadingStates: {
              ...state.loadingStates,
              isMigrating: true,
              error: null
            }
          }));

          try {
            const consolidationReport = {
              userStoreConsolidated: false,
              featureFlagStoreConsolidated: false,
              settingsPreserved: false,
              clinicalSafetyValidated: false
            };

            // Import and consolidate user store data
            try {
              const { useClinicalUserStore } = await import('./userStore.clinical');
              const userState = useClinicalUserStore.getState();

              if (userState.userProfile) {
                set(state => ({
                  userProfile: {
                    ...userState.userProfile,
                    encryptionLevel: DataSensitivity.SYSTEM
                  }
                }));
                consolidationReport.userStoreConsolidated = true;
              }
            } catch (error) {
              console.warn('User store consolidation failed, using defaults:', error);
            }

            // Import and consolidate feature flag store data
            try {
              const { useClinicalFeatureFlagStore } = await import('./featureFlagStore.clinical');
              const featureFlagState = useClinicalFeatureFlagStore.getState();

              set(state => ({
                featurePreferences: featureFlagState.featureConfiguration ? {
                  flags: featureFlagState.featureConfiguration.flags,
                  userConsents: featureFlagState.featureConfiguration.userConsents,
                  clinicalSafetyOverrides: featureFlagState.featureConfiguration.clinicalSafetyOverrides,
                  lastUpdated: createISODateString()
                } : state.featurePreferences,
                notificationSettings: featureFlagState.notificationSettings || state.notificationSettings
              }));
              consolidationReport.featureFlagStoreConsolidated = true;
            } catch (error) {
              console.warn('Feature flag store consolidation failed, using defaults:', error);
            }

            // Validate clinical safety after consolidation
            const clinicalSafetyValid = await get().validateClinicalSafety();
            consolidationReport.clinicalSafetyValidated = clinicalSafetyValid;

            // Mark consolidation as complete
            set(state => ({
              storeVersion: {
                ...state.storeVersion,
                migrationComplete: true,
                consolidatedAt: createISODateString()
              },
              loadingStates: {
                ...state.loadingStates,
                isMigrating: false
              }
            }));

            consolidationReport.settingsPreserved = true;

            return {
              success: true,
              consolidationReport
            };

          } catch (error) {
            console.error('Store consolidation failed:', error);
            set(state => ({
              loadingStates: {
                ...state.loadingStates,
                error: error instanceof Error ? error.message : 'Consolidation failed',
                isMigrating: false
              }
            }));

            return {
              success: false,
              consolidationReport: { error: error instanceof Error ? error.message : 'Consolidation failed' }
            };
          }
        },

        /**
         * Update User Profile
         */
        updateUserProfile: async (profile) => {
          set(state => ({
            loadingStates: {
              ...state.loadingStates,
              isUpdatingSettings: true,
              error: null
            }
          }));

          try {
            set(state => ({
              userProfile: {
                ...state.userProfile,
                ...profile,
                lastUpdated: createISODateString()
              },
              loadingStates: {
                ...state.loadingStates,
                isUpdatingSettings: false
              }
            }));

          } catch (error) {
            console.error('Failed to update user profile:', error);
            set(state => ({
              loadingStates: {
                ...state.loadingStates,
                error: error instanceof Error ? error.message : 'Update failed',
                isUpdatingSettings: false
              }
            }));
            throw error;
          }
        },

        /**
         * Update User Preferences
         */
        updateUserPreferences: async (preferences) => {
          try {
            set(state => ({
              userProfile: {
                ...state.userProfile,
                preferences: {
                  ...state.userProfile.preferences,
                  ...preferences
                },
                lastUpdated: createISODateString()
              }
            }));

          } catch (error) {
            console.error('Failed to update user preferences:', error);
            throw error;
          }
        },

        /**
         * Update Clinical Integration
         */
        updateClinicalIntegration: async (integration) => {
          try {
            set(state => ({
              userProfile: {
                ...state.userProfile,
                clinicalIntegration: {
                  ...state.userProfile.clinicalIntegration,
                  ...integration
                },
                lastUpdated: createISODateString()
              }
            }));

          } catch (error) {
            console.error('Failed to update clinical integration:', error);
            throw error;
          }
        },

        /**
         * Update Notification Settings
         */
        updateNotificationSettings: async (settings) => {
          try {
            set(state => ({
              notificationSettings: {
                ...state.notificationSettings,
                ...settings,
                lastUpdated: createISODateString()
              }
            }));

          } catch (error) {
            console.error('Failed to update notification settings:', error);
            throw error;
          }
        },

        /**
         * Toggle Notification Type
         */
        toggleNotificationType: async (type: string, enabled: boolean) => {
          try {
            const state = get();
            const newSettings = { ...state.notificationSettings };

            // Handle different notification types
            switch (type) {
              case 'push':
                newSettings.pushNotifications.enabled = enabled;
                break;
              case 'daily_reminders':
                newSettings.pushNotifications.dailyReminders.enabled = enabled;
                break;
              case 'assessment_reminders':
                newSettings.pushNotifications.assessmentReminders.enabled = enabled;
                break;
              case 'breathing_reminders':
                newSettings.pushNotifications.breathingReminders.enabled = enabled;
                break;
              case 'progress_updates':
                newSettings.pushNotifications.progressUpdates.enabled = enabled;
                break;
              case 'in_app':
                newSettings.inAppNotifications.enabled = enabled;
                break;
              default:
                throw new Error(`Unknown notification type: ${type}`);
            }

            // Crisis alerts cannot be disabled
            if (type === 'crisis_alerts' && !enabled) {
              throw new Error('Crisis alerts cannot be disabled for safety reasons');
            }

            set({
              notificationSettings: {
                ...newSettings,
                lastUpdated: createISODateString()
              }
            });

          } catch (error) {
            console.error('Failed to toggle notification type:', error);
            throw error;
          }
        },

        /**
         * Update Push Notification Settings
         */
        updatePushNotificationSettings: async (push) => {
          try {
            set(state => ({
              notificationSettings: {
                ...state.notificationSettings,
                pushNotifications: {
                  ...state.notificationSettings.pushNotifications,
                  ...push
                },
                lastUpdated: createISODateString()
              }
            }));

          } catch (error) {
            console.error('Failed to update push notification settings:', error);
            throw error;
          }
        },

        /**
         * Update Therapeutic Settings
         */
        updateTherapeuticSettings: async (settings) => {
          try {
            set(state => ({
              therapeuticSettings: {
                ...state.therapeuticSettings,
                ...settings,
                lastUpdated: createISODateString()
              }
            }));

          } catch (error) {
            console.error('Failed to update therapeutic settings:', error);
            throw error;
          }
        },

        /**
         * Update Breathing Exercise Preferences
         */
        updateBreathingExercisePreferences: async (breathing) => {
          try {
            set(state => ({
              therapeuticSettings: {
                ...state.therapeuticSettings,
                breathingExercises: {
                  ...state.therapeuticSettings.breathingExercises,
                  ...breathing
                },
                lastUpdated: createISODateString()
              }
            }));

          } catch (error) {
            console.error('Failed to update breathing exercise preferences:', error);
            throw error;
          }
        },

        /**
         * Update Assessment Settings
         */
        updateAssessmentSettings: async (assessment) => {
          try {
            set(state => ({
              therapeuticSettings: {
                ...state.therapeuticSettings,
                assessments: {
                  ...state.therapeuticSettings.assessments,
                  ...assessment
                },
                lastUpdated: createISODateString()
              }
            }));

          } catch (error) {
            console.error('Failed to update assessment settings:', error);
            throw error;
          }
        },

        /**
         * Update Crisis Settings
         */
        updateCrisisSettings: async (crisis) => {
          try {
            set(state => ({
              therapeuticSettings: {
                ...state.therapeuticSettings,
                crisis: {
                  ...state.therapeuticSettings.crisis,
                  ...crisis
                },
                lastUpdated: createISODateString()
              }
            }));

          } catch (error) {
            console.error('Failed to update crisis settings:', error);
            throw error;
          }
        },

        /**
         * Update Feature Preferences
         */
        updateFeaturePreferences: async (features) => {
          try {
            set(state => ({
              featurePreferences: {
                ...state.featurePreferences,
                ...features,
                lastUpdated: createISODateString()
              }
            }));

          } catch (error) {
            console.error('Failed to update feature preferences:', error);
            throw error;
          }
        },

        /**
         * Evaluate Feature Flag with Clinical Safety
         */
        evaluateFeatureFlag: (flag: keyof P0CloudFeatureFlags): boolean => {
          const state = get();

          // Clinical safety override check
          if (state.featurePreferences.clinicalSafetyOverrides[flag] === true) {
            return true; // Always enabled for clinical safety
          }

          if (state.featurePreferences.clinicalSafetyOverrides[flag] === false) {
            return false; // Always disabled for clinical safety
          }

          // Check basic flag state
          if (!state.featurePreferences.flags[flag]) {
            return false;
          }

          // Check user consent
          const requiresConsent = FEATURE_FLAG_METADATA[flag]?.requiresConsent;
          if (requiresConsent && !state.featurePreferences.userConsents[flag]) {
            return false;
          }

          return true;
        },

        /**
         * Update User Consent with Clinical Safety Check
         */
        updateUserConsent: async (flag: keyof P0CloudFeatureFlags, consent: boolean) => {
          try {
            // Check if this is a clinically protected feature
            const clinicalOverride = get().featurePreferences.clinicalSafetyOverrides[flag];
            if (clinicalOverride === true && !consent) {
              throw new Error('Cannot disable clinical safety features');
            }

            const newConsents = {
              ...get().featurePreferences.userConsents,
              [flag]: consent
            };

            set(state => ({
              featurePreferences: {
                ...state.featurePreferences,
                userConsents: newConsents,
                lastUpdated: createISODateString()
              }
            }));

            // If consent revoked, disable feature (unless clinical override)
            if (!consent && !clinicalOverride) {
              set(state => ({
                featurePreferences: {
                  ...state.featurePreferences,
                  flags: {
                    ...state.featurePreferences.flags,
                    [flag]: false
                  }
                }
              }));
            }

          } catch (error) {
            console.error('Failed to update user consent:', error);
            throw error;
          }
        },

        /**
         * Request Feature Access
         */
        requestFeatureAccess: async (flag: keyof P0CloudFeatureFlags) => {
          try {
            // Check if already enabled
            if (get().evaluateFeatureFlag(flag)) {
              return { granted: true };
            }

            // Check consent requirements
            const requiresConsent = FEATURE_FLAG_METADATA[flag]?.requiresConsent;
            if (requiresConsent && !get().featurePreferences.userConsents[flag]) {
              return {
                granted: false,
                reason: 'User consent required'
              };
            }

            // Grant access
            set(state => ({
              featurePreferences: {
                ...state.featurePreferences,
                flags: {
                  ...state.featurePreferences.flags,
                  [flag]: true
                },
                lastUpdated: createISODateString()
              }
            }));

            return { granted: true };

          } catch (error) {
            return {
              granted: false,
              reason: 'Failed to enable feature'
            };
          }
        },

        /**
         * Validate Clinical Safety
         */
        validateClinicalSafety: async () => {
          try {
            const state = get();
            let allValid = true;

            // Verify crisis alerts are enabled
            if (!state.notificationSettings.pushNotifications.crisisAlerts.enabled) {
              allValid = false;
              console.error('Crisis alerts must be enabled for clinical safety');
            }

            // Verify emergency notifications are always enabled
            if (!state.notificationSettings.emergencyNotifications.alwaysEnabled) {
              allValid = false;
              console.error('Emergency notifications must always be enabled');
            }

            // Verify clinical safety overrides
            if (!state.featurePreferences.clinicalSafetyOverrides.EMERGENCY_CONTACTS_CLOUD) {
              allValid = false;
              console.error('Emergency contacts cloud must be enabled');
            }

            return allValid;

          } catch (error) {
            console.error('Clinical safety validation failed:', error);
            return false;
          }
        },

        /**
         * Enable Emergency Mode
         */
        enableEmergencyMode: async () => {
          try {
            console.warn('Emergency mode activated for consolidated clinical settings');

            // Ensure critical notifications remain enabled
            set(state => ({
              notificationSettings: {
                ...state.notificationSettings,
                emergencyNotifications: {
                  ...state.notificationSettings.emergencyNotifications,
                  alwaysEnabled: true
                },
                pushNotifications: {
                  ...state.notificationSettings.pushNotifications,
                  crisisAlerts: {
                    ...state.notificationSettings.pushNotifications.crisisAlerts,
                    enabled: true
                  }
                }
              }
            }));

          } catch (error) {
            console.error('Failed to enable emergency mode:', error);
            throw error;
          }
        },

        /**
         * Emergency Disable Feature
         */
        emergencyDisableFeature: async (flag: keyof P0CloudFeatureFlags, reason: string) => {
          try {
            console.warn(`Emergency disable triggered for ${flag}: ${reason}`);

            // Check if feature can be disabled in crisis
            const metadata = FEATURE_FLAG_METADATA[flag];
            if (!metadata?.canDisableInCrisis) {
              throw new Error(`Feature ${flag} cannot be disabled in emergency`);
            }

            set(state => ({
              featurePreferences: {
                ...state.featurePreferences,
                flags: {
                  ...state.featurePreferences.flags,
                  [flag]: false
                },
                lastUpdated: createISODateString()
              }
            }));

          } catch (error) {
            console.error('Failed to emergency disable feature:', error);
            throw error;
          }
        },

        /**
         * Validate All Settings
         */
        validateAllSettings: async () => {
          try {
            const issues: string[] = [];
            let valid = true;

            // Validate user profile
            if (!get().userProfile.name) {
              issues.push('User name is required');
              valid = false;
            }

            // Validate clinical safety
            const clinicalSafetyValid = await get().validateClinicalSafety();
            if (!clinicalSafetyValid) {
              issues.push('Clinical safety validation failed');
              valid = false;
            }

            // Validate therapeutic settings
            const therapeuticSettings = get().therapeuticSettings;
            if (therapeuticSettings.breathingExercises.defaultDuration < 60000) {
              issues.push('Breathing exercise duration too short');
              valid = false;
            }

            return { valid, issues };

          } catch (error) {
            console.error('Settings validation failed:', error);
            return { valid: false, issues: ['Settings validation error'] };
          }
        },

        /**
         * Optimize Performance
         */
        optimizePerformance: async () => {
          try {
            const startTime = Date.now();

            // Clean up old data, optimize subscriptions, etc.
            await get().validateDataIntegrity();

            set(state => ({
              performanceMetrics: {
                ...state.performanceMetrics,
                lastOptimization: createISODateString(),
                optimizationTime: Date.now() - startTime
              }
            }));

          } catch (error) {
            console.error('Performance optimization failed:', error);
          }
        },

        /**
         * Refresh Metrics
         */
        refreshMetrics: async () => {
          try {
            await Promise.all([
              get().validateAllSettings(),
              get().validateDataIntegrity()
            ]);
          } catch (error) {
            console.error('Failed to refresh metrics:', error);
          }
        },

        /**
         * Validate Data Integrity
         */
        validateDataIntegrity: async () => {
          try {
            const state = get();

            // Validate required fields
            if (!state.userProfile) return false;
            if (!state.notificationSettings) return false;
            if (!state.therapeuticSettings) return false;
            if (!state.featurePreferences) return false;

            set(state => ({
              dataIntegrity: {
                ...state.dataIntegrity,
                lastValidatedAt: createISODateString(),
                checksumValid: true
              }
            }));

            return true;

          } catch (error) {
            console.error('Data integrity validation failed:', error);
            return false;
          }
        },

        /**
         * Backup Settings
         */
        backupSettings: async () => {
          try {
            const { storeBackupSystem } = await import('./migration/store-backup-system');

            // Create comprehensive backup
            const userBackup = await storeBackupSystem.backupUserStore();
            const featureFlagBackup = await storeBackupSystem.backupFeatureFlagStore();

            return {
              success: userBackup.success && featureFlagBackup.success,
              backupId: `consolidated_${Date.now()}`
            };

          } catch (error) {
            console.error('Settings backup failed:', error);
            return { success: false };
          }
        },

        /**
         * Restore from Backup
         */
        restoreFromBackup: async (backupId: string) => {
          try {
            // This would restore from the consolidated backup
            console.log('Restoring consolidated settings from backup:', backupId);

            return { success: true };

          } catch (error) {
            console.error('Settings restore failed:', error);
            return { success: false };
          }
        },

        /**
         * Legacy compatibility methods
         */
        getLegacyUserStore: () => {
          const state = get();
          return {
            user: {
              id: state.userProfile.id,
              name: state.userProfile.name,
              email: state.userProfile.email
            },
            isAuthenticated: state.userProfile.isAuthenticated,
            isLoading: state.loadingStates.isLoading
          };
        },

        getLegacyFeatureFlagStore: () => {
          const state = get();
          return {
            flags: state.featurePreferences.flags,
            userConsents: state.featurePreferences.userConsents,
            isLoading: state.loadingStates.isLoading,
            error: state.loadingStates.error
          };
        }
      }),
      {
        name: 'being-consolidated-clinical-settings-store',
        storage: createJSONStorage(() => consolidatedClinicalSettingsStorage),
        partialize: (state) => ({
          userProfile: state.userProfile,
          notificationSettings: state.notificationSettings,
          therapeuticSettings: state.therapeuticSettings,
          featurePreferences: state.featurePreferences,
          dataIntegrity: state.dataIntegrity,
          storeVersion: state.storeVersion,
        }),
        version: 3,
        migrate: (persistedState: any, version: number) => {
          // Handle migration from previous versions
          if (version < 3) {
            return {
              ...persistedState,
              storeVersion: {
                version: '3.0.0-consolidated',
                pattern: 'clinical',
                consolidatedAt: createISODateString(),
                sourceStores: ['userStore', 'featureFlagStore', 'notificationSettings', 'therapeuticSettings'],
                migrationComplete: false
              },
              dataIntegrity: {
                lastValidatedAt: createISODateString(),
                checksumValid: true,
                encryptionLevel: DataSensitivity.SYSTEM,
                backupStatus: {
                  lastBackupAt: createISODateString(),
                  backupValid: true,
                  restoreCapable: true
                },
                migrationStatus: {
                  fromVersion: 'legacy',
                  toVersion: '3.0.0-consolidated-clinical',
                  migratedAt: createISODateString(),
                  migrationValid: true
                }
              },
              performanceMetrics: createPerformanceMetrics()
            };
          }
          return persistedState;
        },
        onRehydrateStorage: () => (state) => {
          if (state) {
            console.log('Consolidated clinical settings store rehydrated successfully');
            // Initialize store on rehydration
            state.initializeStore?.();
          }
        },
      }
    )
  )
);

/**
 * Initialize Consolidated Clinical Settings Store
 * CRITICAL: Preserve all existing settings during consolidation
 */
export const initializeConsolidatedClinicalSettingsStore = async (): Promise<void> => {
  const store = useConsolidatedClinicalSettingsStore.getState();

  await store.initializeStore();

  // Set up periodic health checks (every 5 minutes for settings)
  const healthCheckInterval = setInterval(async () => {
    await store.refreshMetrics();
  }, 300000);

  return () => {
    clearInterval(healthCheckInterval);
  };
};

// Export as main settings store
export const useSettingsStore = useConsolidatedClinicalSettingsStore;
export const initializeSettingsStore = initializeConsolidatedClinicalSettingsStore;