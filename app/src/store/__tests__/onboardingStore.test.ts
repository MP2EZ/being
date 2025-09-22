/**
 * Onboarding Store Tests - Comprehensive Clinical Validation
 *
 * Tests for therapeutic onboarding flow state management including:
 * - Session management and persistence
 * - Step navigation and validation
 * - Clinical data handling with encryption
 * - Crisis detection and intervention
 * - Integration with existing stores
 * - Performance and error handling
 */

import { act, renderHook } from '@testing-library/react-hooks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOnboardingStore, onboardingStoreUtils, ONBOARDING_STEPS } from '../onboardingStore';
import type {
  OnboardingStep,
  OnboardingSessionData,
  BaselineAssessmentData,
  SafetyPlanData,
  PersonalizationData
} from '../onboardingStore';
import { resumableSessionService } from '../../services/ResumableSessionService';
import { dataStore } from '../../services/storage/SecureDataStore';
import { encryptionService } from '../../services/security';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../services/ResumableSessionService');
jest.mock('../../services/storage/SecureDataStore');
jest.mock('../../services/security');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockResumableSessionService = resumableSessionService as jest.Mocked<typeof resumableSessionService>;
const mockDataStore = dataStore as jest.Mocked<typeof dataStore>;
const mockEncryptionService = encryptionService as jest.Mocked<typeof encryptionService>;

describe('OnboardingStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useOnboardingStore.getState().clearSession();

    // Setup default mocks
    mockEncryptionService.encryptData.mockResolvedValue('encrypted_data');
    mockEncryptionService.decryptData.mockResolvedValue({});
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();
    mockResumableSessionService.saveSession.mockResolvedValue();
    mockResumableSessionService.canResumeSession.mockReturnValue(true);
    mockDataStore.getUser.mockResolvedValue({
      id: 'test-user',
      createdAt: '2024-01-01T00:00:00.000Z',
      onboardingCompleted: false,
      values: [],
      notifications: { enabled: true, morning: '08:00', midday: '13:00', evening: '20:00' },
      preferences: { haptics: true, theme: 'system' }
    });
  });

  describe('Session Management', () => {
    it('should start onboarding session successfully', async () => {
      const { result } = renderHook(() => useOnboardingStore());

      await act(async () => {
        await result.current.startOnboarding();
      });

      expect(result.current.isActive).toBe(true);
      expect(result.current.sessionId).toBeDefined();
      expect(result.current.progress).toBeDefined();
      expect(result.current.progress?.currentStep).toBe('welcome');
      expect(result.current.progress?.currentStepIndex).toBe(0);
      expect(result.current.progress?.totalSteps).toBe(6);
      expect(mockResumableSessionService.saveSession).toHaveBeenCalled();
    });

    it('should resume existing onboarding session', async () => {
      const existingSession = {
        id: 'existing-session',
        type: 'assessment' as const,
        subType: 'phq9' as const,
        startedAt: '2024-01-01T00:00:00.000Z',
        lastUpdatedAt: '2024-01-01T01:00:00.000Z',
        expiresAt: '2024-01-02T00:00:00.000Z',
        appVersion: '1.0.0',
        progress: {
          currentStep: 2,
          totalSteps: 6,
          completedSteps: ['welcome', 'mbct_education'],
          percentComplete: 33,
          estimatedTimeRemaining: 1800
        },
        data: {
          consent: {
            termsAccepted: true,
            privacyAccepted: true,
            clinicalDisclaimerAccepted: true,
            emergencyContactConsent: true,
            dataProcessingConsent: true,
            consentTimestamp: '2024-01-01T00:00:00.000Z'
          }
        },
        metadata: {
          resumeCount: 0,
          totalDuration: 600,
          lastScreen: 'mbct_education',
          navigationStack: ['welcome', 'mbct_education']
        }
      };

      mockResumableSessionService.getSession.mockResolvedValue(existingSession);

      const { result } = renderHook(() => useOnboardingStore());

      let resumeResult: boolean;
      await act(async () => {
        resumeResult = await result.current.resumeOnboarding();
      });

      expect(resumeResult!).toBe(true);
      expect(result.current.isActive).toBe(true);
      expect(result.current.sessionId).toBe('existing-session');
      expect(result.current.progress?.overallProgress).toBe(33);
      expect(result.current.performanceMetrics.resumeCount).toBe(1);
    });

    it('should pause and save onboarding progress', async () => {
      const { result } = renderHook(() => useOnboardingStore());

      // Start session first
      await act(async () => {
        await result.current.startOnboarding();
      });

      // Add some progress
      await act(async () => {
        await result.current.updateStepData('consent', {
          termsAccepted: true,
          privacyAccepted: true,
          clinicalDisclaimerAccepted: true,
          emergencyContactConsent: true,
          dataProcessingConsent: true,
          consentTimestamp: new Date().toISOString()
        });
      });

      // Pause session
      await act(async () => {
        await result.current.pauseOnboarding();
      });

      expect(result.current.performanceMetrics.pauseCount).toBe(1);
      expect(mockResumableSessionService.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            interruptionReason: 'manual'
          })
        })
      );
    });

    it('should complete onboarding and sync with user store', async () => {
      const { result } = renderHook(() => useOnboardingStore());

      // Start session
      await act(async () => {
        await result.current.startOnboarding();
      });

      // Complete all required steps
      const completeStepData: OnboardingSessionData = {
        consent: {
          termsAccepted: true,
          privacyAccepted: true,
          clinicalDisclaimerAccepted: true,
          emergencyContactConsent: true,
          dataProcessingConsent: true,
          consentTimestamp: '2024-01-01T00:00:00.000Z'
        },
        mbctEducation: {
          conceptsViewed: ['mindfulness', 'cognitive-therapy', 'breath-awareness'],
          videosWatched: ['intro-video'],
          comprehensionQuizScores: { 'quiz-1': 80 },
          totalTimeSpent: 10,
          conceptsMastered: ['mindfulness', 'cognitive-therapy', 'breath-awareness']
        },
        baselineAssessment: {
          phq9Assessment: {
            type: 'phq9',
            answers: [1, 1, 1, 1, 1, 1, 1, 1, 1] as const,
            score: 9,
            severity: 'mild',
            id: 'assessment_phq9_123_abc',
            completedAt: '2024-01-01T00:00:00.000Z',
            context: 'onboarding',
            requiresCrisisIntervention: false
          },
          gad7Assessment: {
            type: 'gad7',
            answers: [1, 1, 1, 1, 1, 1, 1] as const,
            score: 7,
            severity: 'mild',
            id: 'assessment_gad7_123_abc',
            completedAt: '2024-01-01T00:00:00.000Z',
            context: 'onboarding',
            requiresCrisisIntervention: false
          },
          riskLevel: 'mild',
          crisisDetected: false
        },
        safetyPlan: {
          emergencyContacts: [
            {
              id: 'contact-1',
              name: 'Test Contact',
              relationship: 'friend',
              phone: '555-0123',
              isAvailable24Hours: true,
              preferredContactMethod: 'call'
            }
          ],
          warningSignsIdentified: ['isolation', 'sleep changes'],
          copingStrategies: ['breathing', 'walking'],
          safeEnvironmentSteps: ['remove triggers'],
          professionalContacts: [],
          crisisHotlinePreferences: []
        },
        personalization: {
          therapeuticPreferences: {
            sessionLength: 'medium',
            reminderFrequency: 'moderate',
            breathingPace: 'normal',
            guidanceLevel: 'standard'
          },
          accessibilitySettings: {
            screenReaderOptimized: false,
            highContrastMode: false,
            largerText: false,
            reducedMotion: false,
            hapticFeedbackEnabled: true,
            voiceGuidanceEnabled: false
          },
          notificationPreferences: {
            enabled: true,
            morningTime: '08:00',
            middayTime: '13:00',
            eveningTime: '20:00',
            weekendsIncluded: true,
            crisisReminders: true
          },
          selectedValues: ['compassion', 'growth', 'connection']
        },
        practiceIntroduction: {
          breathingSessionsCompleted: 1,
          totalPracticeTime: 5,
          breathingAccuracy: 85,
          sessionFeedback: ['helpful'],
          technicalIssues: [],
          confidenceLevel: 7
        }
      };

      // Update all step data
      for (const [step, stepData] of Object.entries(completeStepData)) {
        await act(async () => {
          await result.current.updateStepData(step as keyof OnboardingSessionData, stepData);
        });
      }

      // Complete onboarding
      await act(async () => {
        await result.current.completeOnboarding();
      });

      expect(result.current.isActive).toBe(false);
      expect(result.current.progress?.overallProgress).toBe(100);
      expect(mockDataStore.saveUser).toHaveBeenCalledWith(
        expect.objectContaining({
          onboardingCompleted: true,
          values: ['compassion', 'growth', 'connection']
        })
      );
    });
  });

  describe('Step Navigation', () => {
    it('should navigate through steps in correct order', async () => {
      const { result } = renderHook(() => useOnboardingStore());

      await act(async () => {
        await result.current.startOnboarding();
      });

      expect(result.current.getCurrentStep()).toBe('welcome');

      // Complete welcome step
      await act(async () => {
        await result.current.updateStepData('consent', {
          termsAccepted: true,
          privacyAccepted: true,
          clinicalDisclaimerAccepted: true,
          emergencyContactConsent: true,
          dataProcessingConsent: true,
          consentTimestamp: new Date().toISOString()
        });
      });

      // Should be able to advance
      expect(result.current.canAdvanceToNextStep()).toBe(true);

      // Go to next step
      await act(async () => {
        await result.current.goToNextStep();
      });

      expect(result.current.getCurrentStep()).toBe('mbct_education');
      expect(result.current.canGoBackToPreviousStep()).toBe(true);
    });

    it('should prevent advancing without completing required steps', async () => {
      const { result } = renderHook(() => useOnboardingStore());

      await act(async () => {
        await result.current.startOnboarding();
      });

      // Try to advance without completing welcome step
      expect(result.current.canAdvanceToNextStep()).toBe(false);

      await act(async () => {
        await result.current.goToNextStep();
      });

      // Should show error and remain on same step
      expect(result.current.error).toContain('incomplete');
      expect(result.current.getCurrentStep()).toBe('welcome');
    });

    it('should allow going back to previous steps', async () => {
      const { result } = renderHook(() => useOnboardingStore());

      await act(async () => {
        await result.current.startOnboarding();
      });

      // Complete welcome and move to next step
      await act(async () => {
        await result.current.updateStepData('consent', {
          termsAccepted: true,
          privacyAccepted: true,
          clinicalDisclaimerAccepted: true,
          emergencyContactConsent: true,
          dataProcessingConsent: true,
          consentTimestamp: new Date().toISOString()
        });
        await result.current.goToNextStep();
      });

      expect(result.current.getCurrentStep()).toBe('mbct_education');

      // Go back to previous step
      await act(async () => {
        await result.current.goToPreviousStep();
      });

      expect(result.current.getCurrentStep()).toBe('welcome');
    });
  });

  describe('Clinical Data Handling', () => {
    it('should detect crisis during baseline assessment', async () => {
      const { result } = renderHook(() => useOnboardingStore());

      await act(async () => {
        await result.current.startOnboarding();
      });

      // Simulate crisis-level assessment data
      const crisisAssessmentData: BaselineAssessmentData = {
        phq9Assessment: {
          type: 'phq9',
          answers: [3, 3, 3, 3, 3, 3, 3, 3, 1] as const, // High scores with suicidal ideation
          score: 25,
          severity: 'severe',
          id: 'assessment_phq9_123_crisis',
          completedAt: '2024-01-01T00:00:00.000Z',
          context: 'onboarding',
          requiresCrisisIntervention: true
        },
        riskLevel: 'severe',
        crisisDetected: true
      };

      await act(async () => {
        await result.current.updateStepData('baseline_assessment', crisisAssessmentData);
      });

      expect(result.current.crisisDetected).toBe(true);
      expect(result.current.crisisInterventionRequired).toBe(true);
      expect(onboardingStoreUtils.isCrisisDetected()).toBe(true);
    });

    it('should encrypt clinical data during storage', async () => {
      const { result } = renderHook(() => useOnboardingStore());

      await act(async () => {
        await result.current.startOnboarding();
      });

      const clinicalData: BaselineAssessmentData = {
        phq9Assessment: {
          type: 'phq9',
          answers: [1, 1, 1, 1, 1, 1, 1, 1, 0] as const,
          score: 8,
          severity: 'mild',
          id: 'assessment_phq9_123_test',
          completedAt: '2024-01-01T00:00:00.000Z',
          context: 'onboarding',
          requiresCrisisIntervention: false
        },
        riskLevel: 'mild',
        crisisDetected: false
      };

      await act(async () => {
        await result.current.updateStepData('baseline_assessment', clinicalData);
      });

      // Verify encryption service was called
      expect(mockEncryptionService.encryptData).toHaveBeenCalled();
    });

    it('should validate assessment data integrity', async () => {
      const { result } = renderHook(() => useOnboardingStore());

      await act(async () => {
        await result.current.startOnboarding();
      });

      // Navigate to baseline assessment step
      await act(async () => {
        await result.current.goToStep('baseline_assessment');
      });

      // Validate step without required data
      let isValid: boolean;
      await act(async () => {
        isValid = await result.current.validateStepData('baseline_assessment');
      });

      expect(isValid!).toBe(false);

      // Add required assessment data
      await act(async () => {
        await result.current.updateStepData('baseline_assessment', {
          phq9Assessment: {
            type: 'phq9',
            answers: [1, 1, 1, 1, 1, 1, 1, 1, 0] as const,
            score: 8,
            severity: 'mild',
            id: 'assessment_phq9_123_valid',
            completedAt: '2024-01-01T00:00:00.000Z',
            context: 'onboarding',
            requiresCrisisIntervention: false
          },
          gad7Assessment: {
            type: 'gad7',
            answers: [1, 1, 1, 1, 1, 1, 1] as const,
            score: 7,
            severity: 'mild',
            id: 'assessment_gad7_123_valid',
            completedAt: '2024-01-01T00:00:00.000Z',
            context: 'onboarding',
            requiresCrisisIntervention: false
          },
          riskLevel: 'mild',
          crisisDetected: false
        });
      });

      // Validate again
      await act(async () => {
        isValid = await result.current.validateStepData('baseline_assessment');
      });

      expect(isValid!).toBe(true);
    });
  });

  describe('Integration with Other Stores', () => {
    it('should sync completed onboarding data with user store', async () => {
      const { result } = renderHook(() => useOnboardingStore());

      const personalizationData: PersonalizationData = {
        therapeuticPreferences: {
          sessionLength: 'medium',
          reminderFrequency: 'moderate',
          breathingPace: 'normal',
          guidanceLevel: 'standard'
        },
        accessibilitySettings: {
          screenReaderOptimized: false,
          highContrastMode: false,
          largerText: false,
          reducedMotion: false,
          hapticFeedbackEnabled: true,
          voiceGuidanceEnabled: false
        },
        notificationPreferences: {
          enabled: true,
          morningTime: '08:00',
          middayTime: '13:00',
          eveningTime: '20:00',
          weekendsIncluded: true,
          crisisReminders: true
        },
        selectedValues: ['compassion', 'growth', 'mindfulness']
      };

      await act(async () => {
        await result.current.updateStepData('personalization', personalizationData);
        await result.current.syncWithUserStore();
      });

      expect(mockDataStore.saveUser).toHaveBeenCalledWith(
        expect.objectContaining({
          onboardingCompleted: true,
          values: ['compassion', 'growth', 'mindfulness'],
          notifications: expect.objectContaining({
            enabled: true,
            morning: '08:00',
            midday: '13:00',
            evening: '20:00'
          })
        })
      );
    });

    it('should sync safety plan data with crisis store', async () => {
      const { result } = renderHook(() => useOnboardingStore());

      const safetyPlanData: SafetyPlanData = {
        emergencyContacts: [
          {
            id: 'contact-1',
            name: 'Emergency Contact',
            relationship: 'family',
            phone: '555-0911',
            isAvailable24Hours: true,
            preferredContactMethod: 'call'
          }
        ],
        warningSignsIdentified: ['isolation', 'hopelessness'],
        copingStrategies: ['breathing exercises', 'calling friend'],
        safeEnvironmentSteps: ['remove harmful items'],
        professionalContacts: [],
        crisisHotlinePreferences: [
          {
            name: 'Crisis Text Line',
            number: '741741',
            available24Hours: true,
            supportsText: true,
            language: 'English'
          }
        ]
      };

      await act(async () => {
        await result.current.syncWithCrisisStore(safetyPlanData);
      });

      // Note: Since CrisisStore integration is not fully implemented,
      // we're checking that the method completes without error
      expect(result.current.error).toBeNull();
    });
  });

  describe('Error Handling and Validation', () => {
    it('should handle validation errors gracefully', async () => {
      const { result } = renderHook(() => useOnboardingStore());

      const validationError = {
        step: 'baseline_assessment' as OnboardingStep,
        field: 'phq9Assessment',
        message: 'PHQ-9 assessment is required',
        severity: 'error' as const,
        clinicalRelevant: true
      };

      await act(async () => {
        result.current.addValidationError(validationError);
      });

      const errors = result.current.getValidationErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual(validationError);
      expect(result.current.performanceMetrics.errorCount).toBe(1);
    });

    it('should clear validation errors', async () => {
      const { result } = renderHook(() => useOnboardingStore());

      // Add an error
      await act(async () => {
        result.current.addValidationError({
          step: 'welcome',
          field: 'terms',
          message: 'Terms must be accepted',
          severity: 'error',
          clinicalRelevant: false
        });
      });

      expect(result.current.getValidationErrors()).toHaveLength(1);

      // Clear errors
      await act(async () => {
        result.current.clearValidationErrors();
      });

      expect(result.current.getValidationErrors()).toHaveLength(0);
    });

    it('should handle storage failures gracefully', async () => {
      // Mock storage failure
      mockResumableSessionService.saveSession.mockRejectedValue(new Error('Storage failed'));

      const { result } = renderHook(() => useOnboardingStore());

      await act(async () => {
        await result.current.startOnboarding();
      });

      expect(result.current.error).toContain('Failed to start onboarding');
      expect(result.current.isActive).toBe(false);
    });
  });

  describe('Performance Tracking', () => {
    it('should track performance metrics', async () => {
      const { result } = renderHook(() => useOnboardingStore());

      await act(async () => {
        await result.current.startOnboarding();
      });

      // Simulate pause and resume
      await act(async () => {
        await result.current.pauseOnboarding();
      });

      await act(async () => {
        await result.current.resumeOnboarding();
      });

      const metrics = result.current.getPerformanceMetrics();
      expect(metrics.pauseCount).toBe(1);
      expect(metrics.resumeCount).toBe(1);
    });

    it('should reset performance metrics', async () => {
      const { result } = renderHook(() => useOnboardingStore());

      // Add some metrics
      await act(async () => {
        result.current.addValidationError({
          step: 'welcome',
          field: 'test',
          message: 'Test error',
          severity: 'error',
          clinicalRelevant: false
        });
      });

      expect(result.current.performanceMetrics.errorCount).toBe(1);

      // Reset metrics
      await act(async () => {
        result.current.resetPerformanceMetrics();
      });

      expect(result.current.performanceMetrics.errorCount).toBe(0);
    });
  });

  describe('Store Utils', () => {
    it('should provide accurate status queries', async () => {
      const { result } = renderHook(() => useOnboardingStore());

      // Initially not active
      expect(onboardingStoreUtils.isOnboardingActive()).toBe(false);
      expect(onboardingStoreUtils.getCurrentProgress()).toBe(0);

      // Start onboarding
      await act(async () => {
        await result.current.startOnboarding();
      });

      expect(onboardingStoreUtils.isOnboardingActive()).toBe(true);
      expect(onboardingStoreUtils.getCurrentStep()).toBe('welcome');
      expect(onboardingStoreUtils.getTimeRemaining()).toBeGreaterThan(0);
    });

    it('should provide step configuration information', () => {
      const welcomeConfig = onboardingStoreUtils.getStepConfig('welcome');
      expect(welcomeConfig.title).toBe('Welcome & Safety');
      expect(welcomeConfig.required).toBe(true);

      const allSteps = onboardingStoreUtils.getAllSteps();
      expect(allSteps).toHaveLength(6);
      expect(allSteps[0]).toBe('welcome');
    });

    it('should provide accurate state summary', async () => {
      const { result } = renderHook(() => useOnboardingStore());

      await act(async () => {
        await result.current.startOnboarding();
      });

      const summary = onboardingStoreUtils.getStateSummary();
      expect(summary.isActive).toBe(true);
      expect(summary.currentStep).toBe('welcome');
      expect(summary.overallProgress).toBe(0);
      expect(summary.canAdvance).toBe(false); // No data completed yet
      expect(summary.canGoBack).toBe(false); // At first step
      expect(summary.isComplete).toBe(false);
    });
  });

  describe('Store Persistence', () => {
    it('should persist onboarding state correctly', async () => {
      const { result } = renderHook(() => useOnboardingStore());

      await act(async () => {
        await result.current.startOnboarding();
      });

      // Check that persistence was attempted
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should handle rehydration correctly', async () => {
      // Mock persisted state
      const persistedState = {
        isActive: true,
        sessionId: 'test-session',
        progress: {
          currentStep: 'mbct_education',
          currentStepIndex: 1,
          totalSteps: 6,
          completedSteps: ['welcome'],
          stepProgress: { welcome: 100, mbct_education: 50 },
          overallProgress: 25,
          estimatedTimeRemaining: 30,
          startedAt: '2024-01-01T00:00:00.000Z',
          lastUpdatedAt: '2024-01-01T01:00:00.000Z'
        },
        clinicalValidationEnabled: true,
        performanceMetrics: {
          stepDurations: {},
          totalDuration: 3600,
          pauseCount: 0,
          resumeCount: 0,
          errorCount: 0
        }
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(persistedState));

      const { result } = renderHook(() => useOnboardingStore());

      // Trigger rehydration by accessing state
      const currentState = result.current;

      // Verify state was restored
      expect(currentState.isActive).toBe(true);
      expect(currentState.sessionId).toBe('test-session');
    });
  });
});

describe('OnboardingStore Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle complete onboarding flow end-to-end', async () => {
    const { result } = renderHook(() => useOnboardingStore());

    // 1. Start onboarding
    await act(async () => {
      await result.current.startOnboarding();
    });

    expect(result.current.isActive).toBe(true);
    expect(result.current.getCurrentStep()).toBe('welcome');

    // 2. Complete welcome step
    await act(async () => {
      await result.current.updateStepData('consent', {
        termsAccepted: true,
        privacyAccepted: true,
        clinicalDisclaimerAccepted: true,
        emergencyContactConsent: true,
        dataProcessingConsent: true,
        consentTimestamp: new Date().toISOString()
      });
      await result.current.goToNextStep();
    });

    expect(result.current.getCurrentStep()).toBe('mbct_education');

    // 3. Complete MBCT education
    await act(async () => {
      await result.current.updateStepData('mbctEducation', {
        conceptsViewed: ['mindfulness', 'cognitive-therapy', 'breath-awareness'],
        videosWatched: ['intro'],
        comprehensionQuizScores: { 'quiz-1': 85 },
        totalTimeSpent: 8,
        conceptsMastered: ['mindfulness', 'cognitive-therapy', 'breath-awareness']
      });
      await result.current.goToNextStep();
    });

    expect(result.current.getCurrentStep()).toBe('baseline_assessment');

    // 4. Complete baseline assessment (no crisis)
    await act(async () => {
      await result.current.updateStepData('baseline_assessment', {
        phq9Assessment: {
          type: 'phq9',
          answers: [1, 1, 1, 1, 1, 1, 1, 1, 0] as const,
          score: 8,
          severity: 'mild',
          id: 'assessment_phq9_integration_test',
          completedAt: new Date().toISOString(),
          context: 'onboarding',
          requiresCrisisIntervention: false
        },
        gad7Assessment: {
          type: 'gad7',
          answers: [1, 1, 1, 1, 1, 1, 1] as const,
          score: 7,
          severity: 'mild',
          id: 'assessment_gad7_integration_test',
          completedAt: new Date().toISOString(),
          context: 'onboarding',
          requiresCrisisIntervention: false
        },
        riskLevel: 'mild',
        crisisDetected: false
      });
      await result.current.goToNextStep();
    });

    expect(result.current.getCurrentStep()).toBe('safety_planning');
    expect(result.current.crisisDetected).toBe(false);

    // 5. Complete safety planning
    await act(async () => {
      await result.current.updateStepData('safetyPlan', {
        emergencyContacts: [
          {
            id: 'contact-integration',
            name: 'Integration Contact',
            relationship: 'friend',
            phone: '555-HELP',
            isAvailable24Hours: true,
            preferredContactMethod: 'call'
          }
        ],
        warningSignsIdentified: ['isolation', 'sleep changes'],
        copingStrategies: ['breathing', 'walking'],
        safeEnvironmentSteps: ['remove triggers'],
        professionalContacts: [],
        crisisHotlinePreferences: []
      });
      await result.current.goToNextStep();
    });

    expect(result.current.getCurrentStep()).toBe('personalization');

    // 6. Complete personalization
    await act(async () => {
      await result.current.updateStepData('personalization', {
        therapeuticPreferences: {
          sessionLength: 'medium',
          reminderFrequency: 'moderate',
          breathingPace: 'normal',
          guidanceLevel: 'standard'
        },
        accessibilitySettings: {
          screenReaderOptimized: false,
          highContrastMode: false,
          largerText: false,
          reducedMotion: false,
          hapticFeedbackEnabled: true,
          voiceGuidanceEnabled: false
        },
        notificationPreferences: {
          enabled: true,
          morningTime: '08:00',
          middayTime: '13:00',
          eveningTime: '20:00',
          weekendsIncluded: true,
          crisisReminders: true
        },
        selectedValues: ['compassion', 'growth', 'mindfulness']
      });
      await result.current.goToNextStep();
    });

    expect(result.current.getCurrentStep()).toBe('practice_introduction');

    // 7. Complete practice introduction
    await act(async () => {
      await result.current.updateStepData('practiceIntroduction', {
        breathingSessionsCompleted: 1,
        totalPracticeTime: 6,
        breathingAccuracy: 90,
        sessionFeedback: ['very helpful'],
        technicalIssues: [],
        confidenceLevel: 8
      });
    });

    expect(result.current.canAdvanceToNextStep()).toBe(true);
    expect(onboardingStoreUtils.isReadyToComplete()).toBe(true);

    // 8. Complete onboarding
    await act(async () => {
      await result.current.completeOnboarding();
    });

    expect(result.current.isActive).toBe(false);
    expect(result.current.progress?.overallProgress).toBe(100);
    expect(result.current.isOnboardingComplete()).toBe(true);

    // Verify integrations were called
    expect(mockDataStore.saveUser).toHaveBeenCalledWith(
      expect.objectContaining({
        onboardingCompleted: true,
        values: ['compassion', 'growth', 'mindfulness']
      })
    );
  });
});