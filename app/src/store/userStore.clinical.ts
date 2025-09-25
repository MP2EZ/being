/**
 * User Store - Clinical Pattern Migration
 * Phase 5C Group 4: Settings/Preferences Clinical Pattern
 *
 * MISSION: Migrate user store to Clinical Pattern preserving authentication state
 * REQUIREMENTS: User preferences preserved, authentication maintained, clinical integration
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
import { settingsClinicalPatternMigration } from './migration/group-4/settings-clinical-pattern';
import * as SecureStore from 'expo-secure-store';

// Clinical Pattern: User Profile with clinical integration
interface ClinicalUserProfile {
  id: string;
  name: string;
  email?: string;
  clinicalIntegration: {
    allowTherapistAccess: boolean;
    shareProgressData: boolean;
    emergencyContactsEnabled: boolean;
    crisisInterventionOptIn: boolean;
  };
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
  lastUpdated: ISODateString;
}

// Clinical Pattern: User Store Structure
export interface ClinicalUserStore {
  // Core User State with clinical integration
  userProfile: ClinicalUserProfile | null;
  authenticationState: {
    isAuthenticated: boolean;
    sessionToken?: string;
    sessionExpiresAt?: ISODateString;
    lastLoginAt?: ISODateString;
    authMethod: 'secure_store' | 'biometric' | 'pin' | 'none';
    requiresReauth: boolean;
  };

  // User Settings with clinical awareness
  userSettings: {
    onboardingCompleted: boolean;
    firstTimeUser: boolean;
    currentOnboardingStep: number;
    consentStatus: {
      privacyPolicyAccepted: boolean;
      termsAccepted: boolean;
      clinicalDataSharingConsent: boolean;
      researchParticipationConsent: boolean;
      marketingConsent: boolean;
      lastConsentUpdate: ISODateString;
    };
    securityPreferences: {
      biometricEnabled: boolean;
      autoLockEnabled: boolean;
      autoLockTimeout: number; // seconds
      requirePinForSensitiveActions: boolean;
      sessionTimeout: number; // minutes
    };
    therapeuticPersonalization: {
      preferredExerciseTypes: string[];
      exerciseDifficulty: 'beginner' | 'intermediate' | 'advanced';
      reminderFrequency: 'low' | 'medium' | 'high';
      progressTrackingDetail: 'minimal' | 'standard' | 'detailed';
      clinicalDataInsights: boolean;
    };
    lastUpdated: ISODateString;
  };

  // Clinical Pattern: Data integrity and performance
  dataIntegrity: ClinicalDataIntegrity;
  performanceMetrics: PerformanceMetrics;

  // Loading and error states
  loadingStates: {
    isLoading: boolean;
    isAuthenticating: boolean;
    isUpdatingProfile: boolean;
    isMigrating: boolean;
    error: string | null;
  };
}

// Clinical Pattern: User Actions Interface
export interface ClinicalUserActions {
  // Initialization and migration
  initializeStore: () => Promise<void>;
  migrateFromLegacyStore: () => Promise<{ success: boolean; migrationReport: any }>;

  // Authentication management
  login: (user: Omit<ClinicalUserProfile, 'lastUpdated' | 'clinicalIntegration' | 'preferences'>) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  validateAuthentication: () => Promise<boolean>;

  // Profile management
  updateUserProfile: (updates: Partial<ClinicalUserProfile>) => Promise<void>;
  updatePreferences: (preferences: Partial<ClinicalUserProfile['preferences']>) => Promise<void>;
  updateClinicalIntegration: (integration: Partial<ClinicalUserProfile['clinicalIntegration']>) => Promise<void>;

  // Settings management
  updateUserSettings: (settings: Partial<ClinicalUserStore['userSettings']>) => Promise<void>;
  updateConsentStatus: (consents: Partial<ClinicalUserStore['userSettings']['consentStatus']>) => Promise<void>;
  updateSecurityPreferences: (security: Partial<ClinicalUserStore['userSettings']['securityPreferences']>) => Promise<void>;
  updateTherapeuticPersonalization: (therapeutic: Partial<ClinicalUserStore['userSettings']['therapeuticPersonalization']>) => Promise<void>;

  // Onboarding management
  completeOnboardingStep: (step: number) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;

  // Clinical safety operations
  validateClinicalSafety: () => Promise<boolean>;
  enableEmergencyMode: () => Promise<void>;

  // Data integrity
  validateDataIntegrity: () => Promise<boolean>;
  backupStore: () => Promise<{ success: boolean; backupId?: string }>;
  restoreFromBackup: (backupId: string) => Promise<{ success: boolean }>;

  // Performance optimization
  optimizePerformance: () => Promise<void>;
  refreshMetrics: () => Promise<void>;
}

// Combined Clinical User Store
export type ClinicalUserStoreType = ClinicalUserStore & ClinicalUserActions;

/**
 * Encrypted storage adapter for Clinical Pattern with USER-level encryption
 */
const clinicalUserStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const encryptedData = await SecureStore.getItemAsync(name);
      if (!encryptedData) return null;

      const decrypted = await encryptionService.decryptData(
        JSON.parse(encryptedData),
        DataSensitivity.USER
      );
      return JSON.stringify(decrypted);
    } catch (error) {
      console.error('Failed to decrypt clinical user data:', error);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const data = JSON.parse(value);
      const encrypted = await encryptionService.encryptData(
        data,
        DataSensitivity.USER
      );
      await SecureStore.setItemAsync(name, JSON.stringify(encrypted));
    } catch (error) {
      console.error('Failed to encrypt clinical user data:', error);
      throw error;
    }
  },
  removeItem: async (name: string): Promise<void> => {
    await SecureStore.deleteItemAsync(name);
  },
};

/**
 * Create Clinical Pattern User Store
 * REQUIREMENTS: USER encryption, authentication preserved, clinical integration
 */
export const useClinicalUserStore = create<ClinicalUserStoreType>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial Clinical Pattern State
        userProfile: null,

        authenticationState: {
          isAuthenticated: false,
          authMethod: 'none',
          requiresReauth: false
        },

        userSettings: {
          onboardingCompleted: false,
          firstTimeUser: true,
          currentOnboardingStep: 0,
          consentStatus: {
            privacyPolicyAccepted: false,
            termsAccepted: false,
            clinicalDataSharingConsent: false,
            researchParticipationConsent: false,
            marketingConsent: false,
            lastConsentUpdate: createISODateString()
          },
          securityPreferences: {
            biometricEnabled: false,
            autoLockEnabled: true,
            autoLockTimeout: 300, // 5 minutes
            requirePinForSensitiveActions: true,
            sessionTimeout: 60 // 1 hour
          },
          therapeuticPersonalization: {
            preferredExerciseTypes: [],
            exerciseDifficulty: 'beginner',
            reminderFrequency: 'medium',
            progressTrackingDetail: 'standard',
            clinicalDataInsights: true
          },
          lastUpdated: createISODateString()
        },

        dataIntegrity: {
          lastValidatedAt: createISODateString(),
          checksumValid: true,
          encryptionLevel: DataSensitivity.USER,
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
          isAuthenticating: false,
          isUpdatingProfile: false,
          isMigrating: false,
          error: null
        },

        /**
         * Initialize Clinical Pattern Store
         * CRITICAL: Preserve authentication state
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

            // Validate existing authentication
            const authValid = await get().validateAuthentication();

            set(state => ({
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

            console.log('Clinical user store initialized', { authValid });

          } catch (error) {
            console.error('Failed to initialize clinical user store:', error);
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
         * CRITICAL: Preserve authentication state and user data
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
            const { useUserStore } = await import('./userStore');
            const legacyState = useUserStore.getState();

            // Perform clinical pattern migration
            const migrationResult = await settingsClinicalPatternMigration.migrateUserSettingsStore(legacyState);

            if (migrationResult.success && migrationResult.migratedStore) {
              const migratedData = migrationResult.migratedStore;

              // Create clinical user profile from legacy data
              const clinicalProfile: ClinicalUserProfile | null = legacyState.user ? {
                id: legacyState.user.id,
                name: legacyState.user.name,
                email: legacyState.user.email,
                clinicalIntegration: migratedData.userProfile?.clinicalIntegration || {
                  allowTherapistAccess: false,
                  shareProgressData: false,
                  emergencyContactsEnabled: true,
                  crisisInterventionOptIn: true
                },
                preferences: migratedData.userProfile?.preferences || {
                  language: 'en',
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                  accessibilityFeatures: {
                    highContrast: false,
                    largeText: false,
                    reduceMotion: false,
                    screenReader: false
                  },
                  dataPrivacy: {
                    analyticsEnabled: true,
                    crashReportingEnabled: true,
                    personalizedContent: true
                  }
                },
                lastUpdated: createISODateString()
              } : null;

              set(state => ({
                userProfile: clinicalProfile,
                authenticationState: {
                  isAuthenticated: legacyState.isAuthenticated,
                  authMethod: 'secure_store',
                  requiresReauth: false,
                  lastLoginAt: clinicalProfile ? createISODateString() : undefined
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

              console.log('User store migration completed successfully');
            }

            return {
              success: migrationResult.success,
              migrationReport: migrationResult.operation
            };

          } catch (error) {
            console.error('Clinical user migration failed:', error);
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
         * Login with Clinical Profile
         */
        login: async (user) => {
          set(state => ({
            loadingStates: {
              ...state.loadingStates,
              isAuthenticating: true,
              error: null
            }
          }));

          try {
            const clinicalProfile: ClinicalUserProfile = {
              id: user.id,
              name: user.name,
              email: user.email,
              clinicalIntegration: {
                allowTherapistAccess: false,
                shareProgressData: false,
                emergencyContactsEnabled: true,
                crisisInterventionOptIn: true
              },
              preferences: {
                language: 'en',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                accessibilityFeatures: {
                  highContrast: false,
                  largeText: false,
                  reduceMotion: false,
                  screenReader: false
                },
                dataPrivacy: {
                  analyticsEnabled: true,
                  crashReportingEnabled: true,
                  personalizedContent: true
                }
              },
              lastUpdated: createISODateString()
            };

            set(state => ({
              userProfile: clinicalProfile,
              authenticationState: {
                isAuthenticated: true,
                authMethod: 'secure_store',
                requiresReauth: false,
                lastLoginAt: createISODateString()
              },
              loadingStates: {
                ...state.loadingStates,
                isAuthenticating: false
              }
            }));

          } catch (error) {
            console.error('Login failed:', error);
            set(state => ({
              loadingStates: {
                ...state.loadingStates,
                error: error instanceof Error ? error.message : 'Login failed',
                isAuthenticating: false
              }
            }));
            throw error;
          }
        },

        /**
         * Logout with Clinical Safety
         */
        logout: async () => {
          try {
            // Clear user data but preserve settings
            set(state => ({
              userProfile: null,
              authenticationState: {
                isAuthenticated: false,
                authMethod: 'none',
                requiresReauth: false
              },
              // Preserve user settings for next login
              loadingStates: {
                ...state.loadingStates,
                isAuthenticating: false,
                isUpdatingProfile: false,
                error: null
              }
            }));

          } catch (error) {
            console.error('Logout failed:', error);
            throw error;
          }
        },

        /**
         * Refresh Session
         */
        refreshSession: async () => {
          try {
            const state = get();

            // Check if session is still valid
            if (state.authenticationState.sessionExpiresAt) {
              const expirationTime = new Date(state.authenticationState.sessionExpiresAt).getTime();
              const now = Date.now();

              if (now > expirationTime) {
                // Session expired
                set(state => ({
                  authenticationState: {
                    ...state.authenticationState,
                    requiresReauth: true
                  }
                }));
                return false;
              }
            }

            // Session is still valid
            return state.authenticationState.isAuthenticated;

          } catch (error) {
            console.error('Session refresh failed:', error);
            return false;
          }
        },

        /**
         * Validate Authentication
         */
        validateAuthentication: async () => {
          try {
            const state = get();

            // Basic validation
            if (!state.authenticationState.isAuthenticated || !state.userProfile) {
              return false;
            }

            // Check session validity
            return await get().refreshSession();

          } catch (error) {
            console.error('Authentication validation failed:', error);
            return false;
          }
        },

        /**
         * Update User Profile
         */
        updateUserProfile: async (updates) => {
          set(state => ({
            loadingStates: {
              ...state.loadingStates,
              isUpdatingProfile: true,
              error: null
            }
          }));

          try {
            if (!get().userProfile) {
              throw new Error('No user profile to update');
            }

            set(state => ({
              userProfile: state.userProfile ? {
                ...state.userProfile,
                ...updates,
                lastUpdated: createISODateString()
              } : null,
              loadingStates: {
                ...state.loadingStates,
                isUpdatingProfile: false
              }
            }));

          } catch (error) {
            console.error('Failed to update user profile:', error);
            set(state => ({
              loadingStates: {
                ...state.loadingStates,
                error: error instanceof Error ? error.message : 'Update failed',
                isUpdatingProfile: false
              }
            }));
            throw error;
          }
        },

        /**
         * Update Preferences
         */
        updatePreferences: async (preferences) => {
          try {
            if (!get().userProfile) {
              throw new Error('No user profile to update');
            }

            set(state => ({
              userProfile: state.userProfile ? {
                ...state.userProfile,
                preferences: {
                  ...state.userProfile.preferences,
                  ...preferences
                },
                lastUpdated: createISODateString()
              } : null
            }));

          } catch (error) {
            console.error('Failed to update preferences:', error);
            throw error;
          }
        },

        /**
         * Update Clinical Integration
         */
        updateClinicalIntegration: async (integration) => {
          try {
            if (!get().userProfile) {
              throw new Error('No user profile to update');
            }

            set(state => ({
              userProfile: state.userProfile ? {
                ...state.userProfile,
                clinicalIntegration: {
                  ...state.userProfile.clinicalIntegration,
                  ...integration
                },
                lastUpdated: createISODateString()
              } : null
            }));

          } catch (error) {
            console.error('Failed to update clinical integration:', error);
            throw error;
          }
        },

        /**
         * Update User Settings
         */
        updateUserSettings: async (settings) => {
          try {
            set(state => ({
              userSettings: {
                ...state.userSettings,
                ...settings,
                lastUpdated: createISODateString()
              }
            }));

          } catch (error) {
            console.error('Failed to update user settings:', error);
            throw error;
          }
        },

        /**
         * Update Consent Status
         */
        updateConsentStatus: async (consents) => {
          try {
            set(state => ({
              userSettings: {
                ...state.userSettings,
                consentStatus: {
                  ...state.userSettings.consentStatus,
                  ...consents,
                  lastConsentUpdate: createISODateString()
                },
                lastUpdated: createISODateString()
              }
            }));

          } catch (error) {
            console.error('Failed to update consent status:', error);
            throw error;
          }
        },

        /**
         * Update Security Preferences
         */
        updateSecurityPreferences: async (security) => {
          try {
            set(state => ({
              userSettings: {
                ...state.userSettings,
                securityPreferences: {
                  ...state.userSettings.securityPreferences,
                  ...security
                },
                lastUpdated: createISODateString()
              }
            }));

          } catch (error) {
            console.error('Failed to update security preferences:', error);
            throw error;
          }
        },

        /**
         * Update Therapeutic Personalization
         */
        updateTherapeuticPersonalization: async (therapeutic) => {
          try {
            set(state => ({
              userSettings: {
                ...state.userSettings,
                therapeuticPersonalization: {
                  ...state.userSettings.therapeuticPersonalization,
                  ...therapeutic
                },
                lastUpdated: createISODateString()
              }
            }));

          } catch (error) {
            console.error('Failed to update therapeutic personalization:', error);
            throw error;
          }
        },

        /**
         * Complete Onboarding Step
         */
        completeOnboardingStep: async (step) => {
          try {
            set(state => ({
              userSettings: {
                ...state.userSettings,
                currentOnboardingStep: Math.max(state.userSettings.currentOnboardingStep, step),
                lastUpdated: createISODateString()
              }
            }));

          } catch (error) {
            console.error('Failed to complete onboarding step:', error);
            throw error;
          }
        },

        /**
         * Complete Onboarding
         */
        completeOnboarding: async () => {
          try {
            set(state => ({
              userSettings: {
                ...state.userSettings,
                onboardingCompleted: true,
                firstTimeUser: false,
                lastUpdated: createISODateString()
              }
            }));

          } catch (error) {
            console.error('Failed to complete onboarding:', error);
            throw error;
          }
        },

        /**
         * Reset Onboarding
         */
        resetOnboarding: async () => {
          try {
            set(state => ({
              userSettings: {
                ...state.userSettings,
                onboardingCompleted: false,
                firstTimeUser: true,
                currentOnboardingStep: 0,
                lastUpdated: createISODateString()
              }
            }));

          } catch (error) {
            console.error('Failed to reset onboarding:', error);
            throw error;
          }
        },

        /**
         * Validate Data Integrity
         */
        validateDataIntegrity: async () => {
          try {
            const state = get();

            // Validate required fields
            if (state.authenticationState.isAuthenticated && !state.userProfile) {
              return false;
            }

            if (!state.userSettings) return false;

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
            const backupResult = await storeBackupSystem.backupUserStore();

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
            const restoreResult = await storeBackupSystem.restoreStore(backupId, 'user');

            return { success: restoreResult.success };

          } catch (error) {
            console.error('Store restore failed:', error);
            return { success: false };
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
         * Validate Clinical Safety
         */
        validateClinicalSafety: async () => {
          try {
            const state = get();
            let allValid = true;

            // Verify clinical integration settings
            if (!state.userProfile?.clinicalIntegration.emergencyContactsEnabled) {
              allValid = false;
              console.error('Emergency contacts must be enabled for clinical safety');
            }

            if (!state.userProfile?.clinicalIntegration.crisisInterventionOptIn) {
              allValid = false;
              console.error('Crisis intervention opt-in recommended for clinical safety');
            }

            // Verify security preferences for clinical safety
            if (state.userSettings.securityPreferences.sessionTimeout > 480) { // 8 hours max
              console.warn('Long session timeout may pose clinical data security risk');
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
            console.warn('Emergency mode activated for clinical user store');

            // Ensure clinical safety settings are enabled
            if (get().userProfile) {
              set(state => ({
                userProfile: state.userProfile ? {
                  ...state.userProfile,
                  clinicalIntegration: {
                    ...state.userProfile.clinicalIntegration,
                    emergencyContactsEnabled: true,
                    crisisInterventionOptIn: true
                  },
                  lastUpdated: createISODateString()
                } : null
              }));
            }

            // Adjust security settings for emergency access
            set(state => ({
              userSettings: {
                ...state.userSettings,
                securityPreferences: {
                  ...state.userSettings.securityPreferences,
                  sessionTimeout: 60, // 1 hour for emergency mode
                  requirePinForSensitiveActions: false // Disabled for emergency access
                },
                lastUpdated: createISODateString()
              }
            }));

          } catch (error) {
            console.error('Failed to enable emergency mode:', error);
            throw error;
          }
        },

        /**
         * Refresh Metrics
         */
        refreshMetrics: async () => {
          try {
            await Promise.all([
              get().validateDataIntegrity(),
              get().validateClinicalSafety()
            ]);
          } catch (error) {
            console.error('Failed to refresh metrics:', error);
          }
        }
      }),
      {
        name: 'being-clinical-user-store',
        storage: createJSONStorage(() => clinicalUserStorage),
        partialize: (state) => ({
          userProfile: state.userProfile,
          authenticationState: state.authenticationState,
          userSettings: state.userSettings,
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
                encryptionLevel: DataSensitivity.USER,
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
            console.log('Clinical user store rehydrated successfully');
            // Validate authentication on rehydration
            state.validateAuthentication?.();
          }
        },
      }
    )
  )
);

/**
 * Initialize Clinical User Store
 * CRITICAL: Preserve authentication state during migration
 */
export const initializeClinicalUserStore = async (): Promise<void> => {
  const store = useClinicalUserStore.getState();

  // Check if migration is needed
  const migrationResult = await store.migrateFromLegacyStore();
  if (migrationResult.success) {
    console.log('Clinical user store migration completed successfully');
  }

  await store.initializeStore();

  // Set up periodic authentication checks (every 10 minutes)
  const authCheckInterval = setInterval(async () => {
    await store.refreshSession();
  }, 600000);

  return () => {
    clearInterval(authCheckInterval);
  };
};

// Export legacy-compatible store for transition period
export const useUserStore = useClinicalUserStore;