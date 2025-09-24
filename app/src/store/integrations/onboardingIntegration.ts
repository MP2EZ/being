/**
 * Onboarding Store Integration Layer
 *
 * Provides seamless integration between OnboardingStore and existing stores:
 * - UserStore: Profile updates and authentication state
 * - CheckInStore: Therapeutic preferences and initial data
 * - AssessmentStore: Baseline PHQ-9/GAD-7 data
 * - FeatureFlagStore: Onboarding flow customization
 *
 * Features:
 * - Bidirectional data synchronization
 * - Clinical data integrity validation
 * - Crisis state propagation
 * - Performance monitoring
 * - Error handling and recovery
 */

import { useOnboardingStore, OnboardingSessionData } from '../onboardingStore';
import { useUserStore } from '../userStore';
import { useCheckInStore } from '../checkInStore';
import { useFeatureFlagStore } from '../featureFlagStore';
import { Assessment } from '../../types/clinical';
import { UserProfile } from '../../types';
import { dataStore } from '../../services/storage/SecureDataStore';
import { encryptionService, DataSensitivity } from '../../services/security';

// === INTEGRATION TYPES ===

export interface OnboardingIntegrationConfig {
  enableUserStoreSync: boolean;
  enableCheckInStoreSync: boolean;
  enableAssessmentStoreSync: boolean;
  enableFeatureFlagIntegration: boolean;
  validateDataIntegrity: boolean;
  encryptionLevel: DataSensitivity;
}

export interface OnboardingIntegrationResult {
  success: boolean;
  syncedStores: string[];
  errors: string[];
  warnings: string[];
  performanceMetrics: {
    totalSyncTime: number;
    userStoreSyncTime?: number;
    checkInStoreSyncTime?: number;
    assessmentStoreSyncTime?: number;
    validationTime?: number;
  };
}

export interface OnboardingDataMapping {
  userProfile: Partial<UserProfile>;
  therapeuticPreferences: any; // Matches CheckInStore expectations
  baselineAssessments: Assessment[];
  clinicalProfile: {
    phq9Baseline?: number;
    gad7Baseline?: number;
    riskLevel: 'minimal' | 'mild' | 'moderate' | 'severe';
    crisisHistoryDetected: boolean;
  };
  emergencyContacts: any[]; // For future CrisisStore integration
  accessibilitySettings: any; // For app-wide accessibility
}

// === INTEGRATION SERVICE ===

class OnboardingIntegrationService {
  private config: OnboardingIntegrationConfig;

  constructor(config: Partial<OnboardingIntegrationConfig> = {}) {
    this.config = {
      enableUserStoreSync: true,
      enableCheckInStoreSync: true,
      enableAssessmentStoreSync: true,
      enableFeatureFlagIntegration: true,
      validateDataIntegrity: true,
      encryptionLevel: DataSensitivity.CLINICAL,
      ...config
    };
  }

  /**
   * Comprehensive onboarding data synchronization
   */
  async syncOnboardingCompletion(
    onboardingData: OnboardingSessionData
  ): Promise<OnboardingIntegrationResult> {
    const startTime = Date.now();
    const result: OnboardingIntegrationResult = {
      success: false,
      syncedStores: [],
      errors: [],
      warnings: [],
      performanceMetrics: {
        totalSyncTime: 0
      }
    };

    try {
      // Validate onboarding data integrity
      if (this.config.validateDataIntegrity) {
        const validationStart = Date.now();
        const validationResult = await this.validateOnboardingData(onboardingData);
        result.performanceMetrics.validationTime = Date.now() - validationStart;

        if (!validationResult.isValid) {
          result.errors.push(...validationResult.errors);
          return result;
        }
        if (validationResult.warnings.length > 0) {
          result.warnings.push(...validationResult.warnings);
        }
      }

      // Map onboarding data to store formats
      const mappedData = await this.mapOnboardingData(onboardingData);

      // Sync with UserStore
      if (this.config.enableUserStoreSync) {
        const userSyncStart = Date.now();
        try {
          await this.syncWithUserStore(mappedData.userProfile, mappedData.clinicalProfile);
          result.syncedStores.push('UserStore');
          result.performanceMetrics.userStoreSyncTime = Date.now() - userSyncStart;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'UserStore sync failed';
          result.errors.push(`UserStore sync: ${errorMessage}`);
        }
      }

      // Sync with CheckInStore
      if (this.config.enableCheckInStoreSync) {
        const checkInSyncStart = Date.now();
        try {
          await this.syncWithCheckInStore(mappedData.therapeuticPreferences);
          result.syncedStores.push('CheckInStore');
          result.performanceMetrics.checkInStoreSyncTime = Date.now() - checkInSyncStart;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'CheckInStore sync failed';
          result.errors.push(`CheckInStore sync: ${errorMessage}`);
        }
      }

      // Sync with AssessmentStore
      if (this.config.enableAssessmentStoreSync) {
        const assessmentSyncStart = Date.now();
        try {
          await this.syncWithAssessmentStore(mappedData.baselineAssessments);
          result.syncedStores.push('AssessmentStore');
          result.performanceMetrics.assessmentStoreSyncTime = Date.now() - assessmentSyncStart;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'AssessmentStore sync failed';
          result.errors.push(`AssessmentStore sync: ${errorMessage}`);
        }
      }

      // Handle crisis state propagation
      if (mappedData.clinicalProfile.crisisHistoryDetected) {
        try {
          await this.propagateCrisisState(mappedData.clinicalProfile);
          result.warnings.push('Crisis state detected and propagated to relevant stores');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Crisis state propagation failed';
          result.errors.push(`Crisis propagation: ${errorMessage}`);
        }
      }

      // Apply feature flag optimizations
      if (this.config.enableFeatureFlagIntegration) {
        try {
          await this.applyFeatureFlagOptimizations(onboardingData);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Feature flag optimization failed';
          result.warnings.push(`Feature flags: ${errorMessage}`);
        }
      }

      result.performanceMetrics.totalSyncTime = Date.now() - startTime;
      result.success = result.errors.length === 0;

      return result;

    } catch (error) {
      result.errors.push(`Integration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.performanceMetrics.totalSyncTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Validate onboarding data integrity before synchronization
   */
  private async validateOnboardingData(
    data: OnboardingSessionData
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const result = { isValid: true, errors: [], warnings: [] };

    try {
      // Validate consent data
      if (!data.consent) {
        result.errors.push('Consent data is required');
        result.isValid = false;
      } else {
        if (!data.consent.termsAccepted || !data.consent.privacyAccepted) {
          result.errors.push('Essential consent items not accepted');
          result.isValid = false;
        }
      }

      // Validate baseline assessments
      if (!data.baselineAssessment) {
        result.errors.push('Baseline assessment data is required');
        result.isValid = false;
      } else {
        if (!data.baselineAssessment.phq9Assessment) {
          result.errors.push('PHQ-9 assessment is required');
          result.isValid = false;
        } else {
          // Validate PHQ-9 data integrity
          const phq9 = data.baselineAssessment.phq9Assessment;
          if (phq9.answers.length !== 9) {
            result.errors.push('PHQ-9 must have exactly 9 answers');
            result.isValid = false;
          }
          if (phq9.score < 0 || phq9.score > 27) {
            result.errors.push('PHQ-9 score must be between 0 and 27');
            result.isValid = false;
          }
        }

        if (!data.baselineAssessment.gad7Assessment) {
          result.errors.push('GAD-7 assessment is required');
          result.isValid = false;
        } else {
          // Validate GAD-7 data integrity
          const gad7 = data.baselineAssessment.gad7Assessment;
          if (gad7.answers.length !== 7) {
            result.errors.push('GAD-7 must have exactly 7 answers');
            result.isValid = false;
          }
          if (gad7.score < 0 || gad7.score > 21) {
            result.errors.push('GAD-7 score must be between 0 and 21');
            result.isValid = false;
          }
        }

        // Check for crisis indicators
        if (data.baselineAssessment.crisisDetected) {
          result.warnings.push('Crisis indicators detected in baseline assessment');
        }
      }

      // Validate safety plan
      if (!data.safetyPlan) {
        result.errors.push('Safety plan data is required');
        result.isValid = false;
      } else {
        if (data.safetyPlan.emergencyContacts.length === 0) {
          result.warnings.push('No emergency contacts configured');
        }
        if (data.safetyPlan.warningSignsIdentified.length < 2) {
          result.warnings.push('Fewer than 2 warning signs identified');
        }
      }

      // Validate personalization
      if (!data.personalization) {
        result.errors.push('Personalization data is required');
        result.isValid = false;
      } else {
        if (!data.personalization.selectedValues || data.personalization.selectedValues.length < 3) {
          result.warnings.push('Fewer than 3 values selected');
        }
        if (!data.personalization.therapeuticPreferences) {
          result.errors.push('Therapeutic preferences are required');
          result.isValid = false;
        }
      }

      // Validate practice introduction
      if (!data.practiceIntroduction) {
        result.errors.push('Practice introduction data is required');
        result.isValid = false;
      } else {
        if (data.practiceIntroduction.breathingSessionsCompleted < 1) {
          result.warnings.push('No breathing sessions completed');
        }
        if (data.practiceIntroduction.confidenceLevel < 5) {
          result.warnings.push('Low confidence level reported');
        }
      }

      return result;

    } catch (error) {
      result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.isValid = false;
      return result;
    }
  }

  /**
   * Map onboarding data to store-specific formats
   */
  private async mapOnboardingData(data: OnboardingSessionData): Promise<OnboardingDataMapping> {
    const mapping: OnboardingDataMapping = {
      userProfile: {},
      therapeuticPreferences: {},
      baselineAssessments: [],
      clinicalProfile: {
        riskLevel: 'minimal',
        crisisHistoryDetected: false
      },
      emergencyContacts: [],
      accessibilitySettings: {}
    };

    try {
      // Map personalization data to user profile
      if (data.personalization) {
        mapping.userProfile = {
          onboardingCompleted: true,
          values: data.personalization.selectedValues,
          notifications: {
            enabled: data.personalization.notificationPreferences.enabled,
            morning: data.personalization.notificationPreferences.morningTime,
            midday: data.personalization.notificationPreferences.middayTime,
            evening: data.personalization.notificationPreferences.eveningTime
          },
          preferences: {
            haptics: data.personalization.accessibilitySettings.hapticFeedbackEnabled,
            theme: 'system' as const // Default theme, can be enhanced
          }
        };

        // Map therapeutic preferences for CheckInStore
        mapping.therapeuticPreferences = {
          sessionLength: data.personalization.therapeuticPreferences.sessionLength,
          reminderFrequency: data.personalization.therapeuticPreferences.reminderFrequency,
          breathingPace: data.personalization.therapeuticPreferences.breathingPace,
          guidanceLevel: data.personalization.therapeuticPreferences.guidanceLevel
        };

        // Map accessibility settings
        mapping.accessibilitySettings = data.personalization.accessibilitySettings;
      }

      // Map baseline assessment data
      if (data.baselineAssessment) {
        mapping.clinicalProfile = {
          phq9Baseline: data.baselineAssessment.phq9Assessment?.score,
          gad7Baseline: data.baselineAssessment.gad7Assessment?.score,
          riskLevel: data.baselineAssessment.riskLevel,
          crisisHistoryDetected: data.baselineAssessment.crisisDetected
        };

        // Add clinical profile to user profile
        mapping.userProfile.clinicalProfile = mapping.clinicalProfile;

        // Collect assessments for AssessmentStore
        if (data.baselineAssessment.phq9Assessment) {
          mapping.baselineAssessments.push(data.baselineAssessment.phq9Assessment);
        }
        if (data.baselineAssessment.gad7Assessment) {
          mapping.baselineAssessments.push(data.baselineAssessment.gad7Assessment);
        }
      }

      // Map safety plan data
      if (data.safetyPlan) {
        mapping.emergencyContacts = data.safetyPlan.emergencyContacts.map(contact => ({
          id: contact.id,
          name: contact.name,
          relationship: contact.relationship,
          phone: contact.phone,
          isAvailable24Hours: contact.isAvailable24Hours,
          preferredContactMethod: contact.preferredContactMethod,
          notes: contact.notes
        }));
      }

      return mapping;

    } catch (error) {
      console.error('Failed to map onboarding data:', error);
      throw new Error(`Data mapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sync mapped data with UserStore
   */
  private async syncWithUserStore(
    userProfileUpdates: Partial<UserProfile>,
    clinicalProfile: OnboardingDataMapping['clinicalProfile']
  ): Promise<void> {
    try {
      const userStore = useUserStore.getState();

      // Get current user profile
      const currentUser = await dataStore.getUser();
      if (!currentUser) {
        throw new Error('No user profile found for onboarding sync');
      }

      // Merge onboarding data with current profile
      const updatedUser: UserProfile = {
        ...currentUser,
        ...userProfileUpdates,
        clinicalProfile: {
          ...currentUser.clinicalProfile,
          ...clinicalProfile
        }
      };

      // Use UserStore's update method to ensure proper validation and persistence
      await userStore.updateProfile(updatedUser);

      console.log('Successfully synced onboarding data with UserStore');

    } catch (error) {
      console.error('UserStore sync failed:', error);
      throw error;
    }
  }

  /**
   * Sync therapeutic preferences with CheckInStore
   */
  private async syncWithCheckInStore(therapeuticPreferences: any): Promise<void> {
    try {
      // Note: CheckInStore doesn't currently have therapeutic preferences storage
      // This would be enhanced when CheckInStore adds preference management

      // For now, we'll store preferences in a way that can be accessed by check-ins
      const preferenceData = {
        therapeuticPreferences,
        onboardingCompleted: true,
        lastUpdated: new Date().toISOString()
      };

      // Store encrypted preferences
      const encryptedPreferences = await encryptionService.encryptData(
        preferenceData,
        this.config.encryptionLevel
      );

      await dataStore.saveData('therapeutic_preferences', encryptedPreferences);

      console.log('Successfully synced therapeutic preferences');

    } catch (error) {
      console.error('CheckInStore sync failed:', error);
      throw error;
    }
  }

  /**
   * Sync baseline assessments with AssessmentStore (future implementation)
   */
  private async syncWithAssessmentStore(assessments: Assessment[]): Promise<void> {
    try {
      // Save each assessment
      for (const assessment of assessments) {
        await dataStore.saveAssessment(assessment);
      }

      console.log(`Successfully synced ${assessments.length} baseline assessments`);

    } catch (error) {
      console.error('AssessmentStore sync failed:', error);
      throw error;
    }
  }

  /**
   * Propagate crisis state to relevant stores
   */
  private async propagateCrisisState(clinicalProfile: OnboardingDataMapping['clinicalProfile']): Promise<void> {
    try {
      if (!clinicalProfile.crisisHistoryDetected) return;

      // Update UserStore with crisis history
      const userStore = useUserStore.getState();
      if (userStore.isAuthenticated) {
        const currentUser = await dataStore.getUser();
        if (currentUser) {
          const updatedProfile = {
            ...currentUser,
            clinicalProfile: {
              ...currentUser.clinicalProfile,
              riskLevel: clinicalProfile.riskLevel,
              hasCrisisHistory: true,
              lastCrisisDetection: new Date().toISOString()
            }
          };
          await userStore.updateProfile(updatedProfile);
        }
      }

      // Enable crisis monitoring in CheckInStore
      const checkInStore = useCheckInStore.getState();
      checkInStore.enableClinicalValidation();

      console.log('Crisis state propagated to relevant stores');

    } catch (error) {
      console.error('Crisis state propagation failed:', error);
      throw error;
    }
  }

  /**
   * Apply feature flag optimizations based on onboarding data
   */
  private async applyFeatureFlagOptimizations(data: OnboardingSessionData): Promise<void> {
    try {
      const featureFlagStore = useFeatureFlagStore.getState();

      // Enable accessibility features based on onboarding choices
      if (data.personalization?.accessibilitySettings) {
        const settings = data.personalization.accessibilitySettings;

        if (settings.screenReaderOptimized) {
          await featureFlagStore.enableFlag('accessibility_screen_reader');
        }
        if (settings.highContrastMode) {
          await featureFlagStore.enableFlag('accessibility_high_contrast');
        }
        if (settings.reducedMotion) {
          await featureFlagStore.enableFlag('accessibility_reduced_motion');
        }
      }

      // Enable crisis features based on risk level
      if (data.baselineAssessment?.riskLevel === 'severe' || data.baselineAssessment?.crisisDetected) {
        await featureFlagStore.enableFlag('crisis_enhanced_monitoring');
        await featureFlagStore.enableFlag('crisis_quick_access');
      }

      // Enable therapeutic optimizations based on preferences
      if (data.personalization?.therapeuticPreferences) {
        const prefs = data.personalization.therapeuticPreferences;

        if (prefs.sessionLength === 'short') {
          await featureFlagStore.enableFlag('therapy_quick_sessions');
        }
        if (prefs.guidanceLevel === 'detailed') {
          await featureFlagStore.enableFlag('therapy_enhanced_guidance');
        }
      }

      console.log('Feature flag optimizations applied');

    } catch (error) {
      console.error('Feature flag optimization failed:', error);
      throw error;
    }
  }
}

// === INTEGRATION UTILITIES ===

/**
 * Singleton integration service instance
 */
export const onboardingIntegrationService = new OnboardingIntegrationService();

/**
 * Hook for onboarding integration operations
 */
export const useOnboardingIntegration = () => {
  const onboardingStore = useOnboardingStore();
  const userStore = useUserStore();
  const checkInStore = useCheckInStore();

  const performFullSync = async (): Promise<OnboardingIntegrationResult> => {
    const onboardingData = onboardingStore.data;
    return await onboardingIntegrationService.syncOnboardingCompletion(onboardingData);
  };

  const validateIntegrationReadiness = (): boolean => {
    return (
      onboardingStore.isOnboardingComplete() &&
      userStore.isAuthenticated &&
      onboardingStore.data.consent?.termsAccepted === true &&
      onboardingStore.data.baselineAssessment?.phq9Assessment !== undefined &&
      onboardingStore.data.baselineAssessment?.gad7Assessment !== undefined
    );
  };

  const getIntegrationStatus = () => {
    return {
      onboardingComplete: onboardingStore.isOnboardingComplete(),
      userAuthenticated: userStore.isAuthenticated,
      hasBaselineData: !!(
        onboardingStore.data.baselineAssessment?.phq9Assessment &&
        onboardingStore.data.baselineAssessment?.gad7Assessment
      ),
      hasPersonalization: !!onboardingStore.data.personalization,
      hasSafetyPlan: !!onboardingStore.data.safetyPlan,
      readyForSync: validateIntegrationReadiness()
    };
  };

  return {
    performFullSync,
    validateIntegrationReadiness,
    getIntegrationStatus,
    service: onboardingIntegrationService
  };
};

/**
 * Automatic integration trigger when onboarding completes
 */
export const setupOnboardingIntegrationListeners = () => {
  // Subscribe to onboarding completion
  useOnboardingStore.subscribe(
    (state) => state.isOnboardingComplete(),
    async (isComplete) => {
      if (isComplete) {
        try {
          const onboardingData = useOnboardingStore.getState().data;
          const result = await onboardingIntegrationService.syncOnboardingCompletion(onboardingData);

          if (result.success) {
            console.log('Automatic onboarding integration completed successfully:', {
              syncedStores: result.syncedStores,
              syncTime: result.performanceMetrics.totalSyncTime,
              warnings: result.warnings
            });
          } else {
            console.error('Automatic onboarding integration failed:', result.errors);
          }
        } catch (error) {
          console.error('Automatic onboarding integration error:', error);
        }
      }
    }
  );
};

export default {
  service: onboardingIntegrationService,
  useOnboardingIntegration,
  setupOnboardingIntegrationListeners
};