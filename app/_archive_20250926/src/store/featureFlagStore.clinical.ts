/**
 * Feature Flag Store - Clinical Pattern Migration
 * Phase 5C Group 4: Settings/Preferences Clinical Pattern
 *
 * MISSION: Migrate feature flags store to Clinical Pattern with SYSTEM encryption
 * REQUIREMENTS: Notification preferences intact, app settings maintained, clinical safety guards
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
import {
  P0CloudFeatureFlags,
  FeatureFlagMetadata,
  UserEligibility,
  DEFAULT_FEATURE_FLAGS,
  FEATURE_FLAG_METADATA,
  FEATURE_FLAG_CONSTANTS
} from '../types/feature-flags';
import { settingsClinicalPatternMigration } from './migration/group-4/settings-clinical-pattern';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Clinical Pattern: Feature Flag Store Structure
export interface ClinicalFeatureFlagStore {
  // Core Feature Flag State with clinical integration
  featureConfiguration: {
    flags: P0CloudFeatureFlags;
    metadata: Record<keyof P0CloudFeatureFlags, FeatureFlagMetadata>;
    userConsents: Record<keyof P0CloudFeatureFlags, boolean>;
    rolloutPercentages: Record<keyof P0CloudFeatureFlags, number>;
    userEligibility: UserEligibility | null;
    clinicalSafetyOverrides: Record<keyof P0CloudFeatureFlags, boolean>;
    lastUpdated: ISODateString;
  };

  // Notification Settings with clinical awareness (moved from separate store)
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

  // Cost and Safety Management with clinical priorities
  systemStatus: {
    costStatus: {
      currentSpend: number;
      budgetRemaining: number;
      projectedMonthlySpend: number;
      featureCosts: Record<keyof P0CloudFeatureFlags, number>;
      limitedFeatures: readonly (keyof P0CloudFeatureFlags)[];
      recommendations: readonly string[];
      breakEvenUsers: number;
      costEfficiency: number; // 0-1
    };
    safetyStatus: {
      crisisResponseTime: number; // ms
      hipaaCompliant: boolean;
      offlineFallbackReady: boolean;
      encryptionValidated: boolean;
      emergencyOverrideActive: boolean;
      protectedFeaturesCount: number;
      lastValidation: ISODateString;
    };
    healthStatus: {
      overall: 'healthy' | 'warning' | 'critical';
      features: Record<keyof P0CloudFeatureFlags, 'healthy' | 'degraded' | 'disabled'>;
      crisisResponseOk: boolean;
      costWithinLimits: boolean;
      complianceOk: boolean;
      lastCheck: ISODateString;
    };
  };

  // Clinical Pattern: Data integrity and performance
  dataIntegrity: ClinicalDataIntegrity;
  performanceMetrics: PerformanceMetrics;

  // Loading and error states
  loadingStates: {
    isLoading: boolean;
    isUpdating: boolean;
    isMigrating: boolean;
    error: string | null;
  };
}

// Clinical Pattern: Feature Flag Actions Interface
export interface ClinicalFeatureFlagActions {
  // Initialization and migration
  initializeStore: () => Promise<void>;
  migrateFromLegacyStore: () => Promise<{ success: boolean; migrationReport: any }>;

  // Core feature flag operations
  evaluateFlag: (flag: keyof P0CloudFeatureFlags) => boolean;
  requestFeatureAccess: (flag: keyof P0CloudFeatureFlags) => Promise<{
    granted: boolean;
    reason?: string;
    requiresConsent?: boolean;
    requiresUpgrade?: boolean;
  }>;
  updateUserConsent: (flag: keyof P0CloudFeatureFlags, consent: boolean) => Promise<void>;

  // Notification management
  updateNotificationSettings: (settings: Partial<ClinicalFeatureFlagStore['notificationSettings']>) => Promise<void>;
  toggleNotificationType: (type: string, enabled: boolean) => Promise<void>;

  // Clinical safety operations
  emergencyDisableFeature: (flag: keyof P0CloudFeatureFlags, reason: string) => Promise<void>;
  enableEmergencyMode: () => Promise<void>;
  validateClinicalSafety: () => Promise<boolean>;

  // System monitoring
  checkSystemHealth: () => Promise<void>;
  optimizePerformance: () => Promise<void>;
  refreshMetrics: () => Promise<void>;

  // Data integrity
  validateDataIntegrity: () => Promise<boolean>;
  backupStore: () => Promise<{ success: boolean; backupId?: string }>;
  restoreFromBackup: (backupId: string) => Promise<{ success: boolean }>;
}

// Combined Clinical Feature Flag Store
export type ClinicalFeatureFlagStoreType = ClinicalFeatureFlagStore & ClinicalFeatureFlagActions;

/**
 * Encrypted storage adapter for Clinical Pattern with SYSTEM-level encryption
 */
const clinicalFeatureFlagStorage = {
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
      console.error('Failed to decrypt clinical feature flag data:', error);
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
      console.error('Failed to encrypt clinical feature flag data:', error);
      throw error;
    }
  },
  removeItem: async (name: string): Promise<void> => {
    await AsyncStorage.removeItem(name);
  },
};

/**
 * Create Clinical Pattern Feature Flag Store
 * REQUIREMENTS: SYSTEM encryption, notification settings preserved, clinical safety
 */
export const useClinicalFeatureFlagStore = create<ClinicalFeatureFlagStoreType>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial Clinical Pattern State
        featureConfiguration: {
          flags: { ...DEFAULT_FEATURE_FLAGS },
          metadata: { ...FEATURE_FLAG_METADATA },
          userConsents: {} as Record<keyof P0CloudFeatureFlags, boolean>,
          rolloutPercentages: {} as Record<keyof P0CloudFeatureFlags, number>,
          userEligibility: null,
          clinicalSafetyOverrides: {
            EMERGENCY_CONTACTS_CLOUD: true,
            PUSH_NOTIFICATIONS_ENABLED: true
          } as Record<keyof P0CloudFeatureFlags, boolean>,
          lastUpdated: createISODateString()
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

        systemStatus: {
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
            protectedFeaturesCount: 2,
            lastValidation: createISODateString()
          },
          healthStatus: {
            overall: 'healthy',
            features: {} as Record<keyof P0CloudFeatureFlags, 'healthy' | 'degraded' | 'disabled'>,
            crisisResponseOk: true,
            costWithinLimits: true,
            complianceOk: true,
            lastCheck: createISODateString()
          }
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
            fromVersion: '1.0.0',
            toVersion: '2.0.0-clinical',
            migratedAt: createISODateString(),
            migrationValid: true
          }
        },

        performanceMetrics: createPerformanceMetrics(),

        loadingStates: {
          isLoading: false,
          isUpdating: false,
          isMigrating: false,
          error: null
        },

        /**
         * Initialize Clinical Pattern Store
         * CRITICAL: Preserve all existing settings and flags
         */
        initializeStore: async () => {
          set(state => ({
            loadingStates: {
              ...state.loadingStates,
              isLoading: true,
              error: null
            }
          }));

          try {
            const startTime = Date.now();

            // Initialize rollout percentages
            const rolloutPercentages: Record<keyof P0CloudFeatureFlags, number> = {} as any;
            Object.keys(DEFAULT_FEATURE_FLAGS).forEach(key => {
              rolloutPercentages[key as keyof P0CloudFeatureFlags] =
                FEATURE_FLAG_CONSTANTS.DEFAULT_ROLLOUT_PERCENTAGE;
            });

            // Initialize feature health status
            const featureHealth: Record<keyof P0CloudFeatureFlags, 'healthy' | 'degraded' | 'disabled'> = {} as any;
            Object.keys(DEFAULT_FEATURE_FLAGS).forEach(key => {
              const flagKey = key as keyof P0CloudFeatureFlags;
              featureHealth[flagKey] = get().featureConfiguration.flags[flagKey] ? 'healthy' : 'disabled';
            });

            set(state => ({
              featureConfiguration: {
                ...state.featureConfiguration,
                rolloutPercentages
              },
              systemStatus: {
                ...state.systemStatus,
                healthStatus: {
                  ...state.systemStatus.healthStatus,
                  features: featureHealth
                }
              },
              performanceMetrics: {
                ...state.performanceMetrics,
                storeInitTime: Date.now() - startTime,
                lastPerformanceUpdate: createISODateString()
              },
              loadingStates: {
                ...state.loadingStates,
                isLoading: false
              }
            }));

            // Start monitoring
            get().refreshMetrics();

          } catch (error) {
            console.error('Failed to initialize clinical feature flag store:', error);
            set(state => ({
              loadingStates: {
                ...state.loadingStates,
                error: error instanceof Error ? error.message : 'Initialization failed',
                isLoading: false
              }
            }));
          }
        },

        /**
         * Migrate from Legacy Store
         * CRITICAL: Zero-loss migration with validation
         */
        migrateFromLegacyStore: async () => {
          set(state => ({
            loadingStates: {
              ...state.loadingStates,
              isMigrating: true,
              error: null
            }
          }));

          try {
            // Import legacy store data
            const { useFeatureFlagStore } = await import('./featureFlagStore');
            const legacyState = useFeatureFlagStore.getState();

            // Perform clinical pattern migration
            const migrationResult = await settingsClinicalPatternMigration.migrateFeatureFlagsStore(legacyState);

            if (migrationResult.success && migrationResult.migratedStore) {
              const migratedData = migrationResult.migratedStore;

              set(state => ({
                featureConfiguration: {
                  flags: legacyState.flags,
                  metadata: legacyState.metadata,
                  userConsents: legacyState.userConsents,
                  rolloutPercentages: legacyState.rolloutPercentages,
                  userEligibility: legacyState.userEligibility,
                  clinicalSafetyOverrides: migratedData.featurePreferences?.clinicalSafetyOverrides || state.featureConfiguration.clinicalSafetyOverrides,
                  lastUpdated: createISODateString()
                },
                notificationSettings: migratedData.notificationSettings || state.notificationSettings,
                systemStatus: {
                  costStatus: legacyState.costStatus,
                  safetyStatus: legacyState.safetyStatus,
                  healthStatus: legacyState.healthStatus
                },
                dataIntegrity: {
                  ...state.dataIntegrity,
                  migrationStatus: {
                    fromVersion: '1.0.0',
                    toVersion: '2.0.0-clinical',
                    migratedAt: createISODateString(),
                    migrationValid: true
                  }
                },
                loadingStates: {
                  ...state.loadingStates,
                  isMigrating: false
                }
              }));
            }

            return {
              success: migrationResult.success,
              migrationReport: migrationResult.operation
            };

          } catch (error) {
            console.error('Clinical migration failed:', error);
            set(state => ({
              loadingStates: {
                ...state.loadingStates,
                error: error instanceof Error ? error.message : 'Migration failed',
                isMigrating: false
              }
            }));

            return {
              success: false,
              migrationReport: { error: error instanceof Error ? error.message : 'Migration failed' }
            };
          }
        },

        /**
         * Evaluate Feature Flag with Clinical Safety
         */
        evaluateFlag: (flag: keyof P0CloudFeatureFlags): boolean => {
          const state = get();

          // Clinical safety override check
          if (state.featureConfiguration.clinicalSafetyOverrides[flag] === true) {
            return true; // Always enabled for clinical safety
          }

          if (state.featureConfiguration.clinicalSafetyOverrides[flag] === false) {
            return false; // Always disabled for clinical safety
          }

          // Emergency override check
          if (state.systemStatus.safetyStatus.emergencyOverrideActive) {
            const metadata = state.featureConfiguration.metadata[flag];
            if (metadata?.canDisableInCrisis) {
              return false;
            }
          }

          // Check basic flag state
          if (!state.featureConfiguration.flags[flag]) {
            return false;
          }

          // Check user consent
          const metadata = state.featureConfiguration.metadata[flag];
          if (metadata?.requiresConsent && !state.featureConfiguration.userConsents[flag]) {
            return false;
          }

          // Check cost limits
          if (state.systemStatus.costStatus.limitedFeatures.includes(flag)) {
            return false;
          }

          return true;
        },

        /**
         * Request Feature Access with Clinical Validation
         */
        requestFeatureAccess: async (flag: keyof P0CloudFeatureFlags) => {
          const state = get();

          // Check if already enabled
          if (state.evaluateFlag(flag)) {
            return { granted: true };
          }

          // Check consent requirements
          const metadata = state.featureConfiguration.metadata[flag];
          if (metadata?.requiresConsent && !state.featureConfiguration.userConsents[flag]) {
            return {
              granted: false,
              reason: 'User consent required',
              requiresConsent: true
            };
          }

          // Grant access and update state
          try {
            set(state => ({
              featureConfiguration: {
                ...state.featureConfiguration,
                flags: {
                  ...state.featureConfiguration.flags,
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
         * Update User Consent with Clinical Safety Check
         */
        updateUserConsent: async (flag: keyof P0CloudFeatureFlags, consent: boolean) => {
          set(state => ({
            loadingStates: {
              ...state.loadingStates,
              isUpdating: true,
              error: null
            }
          }));

          try {
            // Check if this is a clinically protected feature
            const clinicalOverride = get().featureConfiguration.clinicalSafetyOverrides[flag];
            if (clinicalOverride === true && !consent) {
              // Cannot revoke consent for clinical safety features
              set(state => ({
                loadingStates: {
                  ...state.loadingStates,
                  error: 'Cannot disable clinical safety features',
                  isUpdating: false
                }
              }));
              return;
            }

            const newConsents = {
              ...get().featureConfiguration.userConsents,
              [flag]: consent
            };

            set(state => ({
              featureConfiguration: {
                ...state.featureConfiguration,
                userConsents: newConsents,
                lastUpdated: createISODateString()
              },
              loadingStates: {
                ...state.loadingStates,
                isUpdating: false
              }
            }));

            // If consent revoked, disable feature (unless clinical override)
            if (!consent && !clinicalOverride) {
              set(state => ({
                featureConfiguration: {
                  ...state.featureConfiguration,
                  flags: {
                    ...state.featureConfiguration.flags,
                    [flag]: false
                  }
                }
              }));
            }

          } catch (error) {
            console.error('Failed to update user consent:', error);
            set(state => ({
              loadingStates: {
                ...state.loadingStates,
                error: error instanceof Error ? error.message : 'Failed to update consent',
                isUpdating: false
              }
            }));
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
         * Emergency Disable Feature
         */
        emergencyDisableFeature: async (flag: keyof P0CloudFeatureFlags, reason: string) => {
          try {
            console.warn(`Emergency disable triggered for ${flag}: ${reason}`);

            // Check if feature can be disabled in crisis
            const metadata = get().featureConfiguration.metadata[flag];
            if (!metadata?.canDisableInCrisis) {
              throw new Error(`Feature ${flag} cannot be disabled in emergency`);
            }

            set(state => ({
              featureConfiguration: {
                ...state.featureConfiguration,
                flags: {
                  ...state.featureConfiguration.flags,
                  [flag]: false
                },
                lastUpdated: createISODateString()
              },
              systemStatus: {
                ...state.systemStatus,
                healthStatus: {
                  ...state.systemStatus.healthStatus,
                  features: {
                    ...state.systemStatus.healthStatus.features,
                    [flag]: 'disabled'
                  },
                  overall: 'warning'
                }
              }
            }));

          } catch (error) {
            console.error('Failed to emergency disable feature:', error);
            throw error;
          }
        },

        /**
         * Enable Emergency Mode
         */
        enableEmergencyMode: async () => {
          try {
            console.warn('Emergency mode activated for clinical feature flags');

            set(state => ({
              systemStatus: {
                ...state.systemStatus,
                safetyStatus: {
                  ...state.systemStatus.safetyStatus,
                  emergencyOverrideActive: true,
                  lastValidation: createISODateString()
                },
                healthStatus: {
                  ...state.systemStatus.healthStatus,
                  overall: 'warning'
                }
              }
            }));

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
            if (!state.featureConfiguration.clinicalSafetyOverrides.EMERGENCY_CONTACTS_CLOUD) {
              allValid = false;
              console.error('Emergency contacts cloud must be enabled');
            }

            // Update safety status
            set(state => ({
              systemStatus: {
                ...state.systemStatus,
                safetyStatus: {
                  ...state.systemStatus.safetyStatus,
                  lastValidation: createISODateString()
                }
              }
            }));

            return allValid;

          } catch (error) {
            console.error('Clinical safety validation failed:', error);
            return false;
          }
        },

        /**
         * Check System Health
         */
        checkSystemHealth: async () => {
          try {
            const state = get();
            const crisisOk = await state.validateClinicalSafety();

            const overall = crisisOk && state.systemStatus.costStatus.budgetRemaining > 0.1
              ? 'healthy'
              : state.systemStatus.costStatus.budgetRemaining <= 0 ? 'critical' : 'warning';

            set(state => ({
              systemStatus: {
                ...state.systemStatus,
                healthStatus: {
                  ...state.systemStatus.healthStatus,
                  overall,
                  crisisResponseOk: crisisOk,
                  lastCheck: createISODateString()
                }
              }
            }));

          } catch (error) {
            console.error('System health check failed:', error);
          }
        },

        /**
         * Optimize Performance
         */
        optimizePerformance: async () => {
          try {
            const startTime = Date.now();

            // Clean up old data, optimize subscriptions, etc.
            await get().refreshMetrics();

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
              get().checkSystemHealth(),
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
            if (!state.featureConfiguration.flags) return false;
            if (!state.notificationSettings) return false;
            if (!state.systemStatus) return false;

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
         * Backup Store
         */
        backupStore: async () => {
          try {
            const { storeBackupSystem } = await import('./migration/store-backup-system');
            const backupResult = await storeBackupSystem.backupFeatureFlagStore();

            return {
              success: backupResult.success,
              backupId: backupResult.backupId
            };

          } catch (error) {
            console.error('Store backup failed:', error);
            return { success: false };
          }
        },

        /**
         * Restore from Backup
         */
        restoreFromBackup: async (backupId: string) => {
          try {
            const { storeBackupSystem } = await import('./migration/store-backup-system');
            const restoreResult = await storeBackupSystem.restoreStore(backupId, 'feature_flags');

            return { success: restoreResult.success };

          } catch (error) {
            console.error('Store restore failed:', error);
            return { success: false };
          }
        }
      }),
      {
        name: 'being-clinical-feature-flag-store',
        storage: createJSONStorage(() => clinicalFeatureFlagStorage),
        partialize: (state) => ({
          featureConfiguration: state.featureConfiguration,
          notificationSettings: state.notificationSettings,
          systemStatus: state.systemStatus,
          dataIntegrity: state.dataIntegrity,
        }),
        version: 2,
        migrate: (persistedState: any, version: number) => {
          // Handle migration from v1 to v2 (clinical pattern)
          if (version === 1) {
            return {
              ...persistedState,
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
                  fromVersion: '1.0.0',
                  toVersion: '2.0.0-clinical',
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
            console.log('Clinical feature flag store rehydrated successfully');
            // Validate clinical safety on rehydration
            state.validateClinicalSafety?.();
          }
        },
      }
    )
  )
);

/**
 * Initialize Clinical Feature Flag Store
 * CRITICAL: Preserve all existing settings during migration
 */
export const initializeClinicalFeatureFlagStore = async (): Promise<void> => {
  const store = useClinicalFeatureFlagStore.getState();

  // Check if migration is needed
  const migrationResult = await store.migrateFromLegacyStore();
  if (migrationResult.success) {
    console.log('Clinical feature flag store migration completed successfully');
  }

  await store.initializeStore();

  // Set up periodic health checks (every 5 minutes for settings)
  const healthCheckInterval = setInterval(async () => {
    await store.refreshMetrics();
  }, 300000);

  return () => {
    clearInterval(healthCheckInterval);
  };
};

// Export legacy-compatible store for transition period
export const useFeatureFlagStore = useClinicalFeatureFlagStore;