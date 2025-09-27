/**
 * Clinical Onboarding Store - Integration with Clinical User Store
 * Phase 5C: Group 1 Migration - Onboarding Clinical Pattern
 * 
 * CLINICAL REQUIREMENTS:
 * - Seamless integration with Clinical User Store
 * - HIPAA-compliant therapeutic onboarding data handling
 * - Clinical-grade encryption for assessment and safety plan data
 * - Crisis-aware onboarding with immediate intervention capability
 * - Performance: <200ms for step transitions, <500ms for data persistence
 * - Session recovery with complete state restoration
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist, createJSONStorage } from 'zustand/middleware';
import { useClinicalUserStore, ClinicalUserProfile } from './userStore.clinical';
import { encryptionService, DataSensitivity } from '../services/security';
import { resumableSessionService } from '../services/ResumableSessionService';
import { 
  PHQ9Score, 
  GAD7Score, 
  PHQ9Answers,
  GAD7Answers,
  ISODateString, 
  createISODateString,
  CRISIS_THRESHOLD_PHQ9,
  CRISIS_THRESHOLD_GAD7,
  SUICIDAL_IDEATION_THRESHOLD
} from '../types/clinical';
import { Assessment } from '../types/clinical';

// === CLINICAL ONBOARDING INTERFACES ===

export type ClinicalOnboardingStep = 
  | 'welcome'
  | 'consent_privacy'
  | 'clinical_baseline'
  | 'therapeutic_preferences'
  | 'safety_planning'
  | 'accessibility_setup'
  | 'practice_introduction'
  | 'completion';

export interface ClinicalOnboardingStepConfig {
  id: ClinicalOnboardingStep;
  title: string;
  description: string;
  estimatedDuration: number; // minutes
  requiresValidation: boolean;
  clinicalDataLevel: DataSensitivity;
  crisisAware: boolean;
  hipaaRequired: boolean;
}

export const CLINICAL_ONBOARDING_STEPS: Record<ClinicalOnboardingStep, ClinicalOnboardingStepConfig> = {
  welcome: {
    id: 'welcome',
    title: 'Welcome to Being',
    description: 'Introduction to MBCT and therapeutic support',
    estimatedDuration: 3,
    requiresValidation: false,
    clinicalDataLevel: DataSensitivity.PUBLIC,
    crisisAware: false,
    hipaaRequired: false
  },
  consent_privacy: {
    id: 'consent_privacy',
    title: 'Privacy & Consent',
    description: 'HIPAA consent and privacy settings',
    estimatedDuration: 5,
    requiresValidation: true,
    clinicalDataLevel: DataSensitivity.CLINICAL,
    crisisAware: false,
    hipaaRequired: true
  },
  clinical_baseline: {
    id: 'clinical_baseline',
    title: 'Clinical Assessment',
    description: 'PHQ-9 and GAD-7 baseline assessments',
    estimatedDuration: 12,
    requiresValidation: true,
    clinicalDataLevel: DataSensitivity.CLINICAL,
    crisisAware: true,
    hipaaRequired: true
  },
  therapeutic_preferences: {
    id: 'therapeutic_preferences',
    title: 'Therapeutic Preferences',
    description: 'Session settings and therapeutic customization',
    estimatedDuration: 6,
    requiresValidation: true,
    clinicalDataLevel: DataSensitivity.PERSONAL,
    crisisAware: false,
    hipaaRequired: false
  },
  safety_planning: {
    id: 'safety_planning',
    title: 'Safety Planning',
    description: 'Emergency contacts and crisis intervention setup',
    estimatedDuration: 8,
    requiresValidation: true,
    clinicalDataLevel: DataSensitivity.CRISIS,
    crisisAware: false,
    hipaaRequired: true
  },
  accessibility_setup: {
    id: 'accessibility_setup',
    title: 'Accessibility Setup',
    description: 'Accessibility and accommodation preferences',
    estimatedDuration: 4,
    requiresValidation: false,
    clinicalDataLevel: DataSensitivity.PERSONAL,
    crisisAware: false,
    hipaaRequired: false
  },
  practice_introduction: {
    id: 'practice_introduction',
    title: 'Practice Introduction',
    description: 'First breathing session and app familiarization',
    estimatedDuration: 10,
    requiresValidation: true,
    clinicalDataLevel: DataSensitivity.PUBLIC,
    crisisAware: false,
    hipaaRequired: false
  },
  completion: {
    id: 'completion',
    title: 'Onboarding Complete',
    description: 'Final setup and welcome to therapeutic journey',
    estimatedDuration: 2,
    requiresValidation: false,
    clinicalDataLevel: DataSensitivity.PUBLIC,
    crisisAware: false,
    hipaaRequired: false
  }
};

// Onboarding data structures integrated with Clinical User Store
export interface ClinicalConsentData {
  hipaaConsent: {
    acknowledged: boolean;
    consentDate: ISODateString;
    version: string;
  };
  privacyPolicy: {
    accepted: boolean;
    acceptedDate: ISODateString;
    version: string;
  };
  dataProcessing: {
    analyticsConsent: boolean;
    crisisDataSharing: boolean;
    therapeuticDataCollection: boolean;
  };
  emergencyConsent: {
    allow988Redirect: boolean;
    allowEmergencyContacts: boolean;
    allowCrisisText: boolean;
  };
}

export interface ClinicalBaselineData {
  phq9Assessment: {
    answers: PHQ9Answers;
    score: PHQ9Score;
    completedAt: ISODateString;
    hasSuicidalIdeation: boolean;
    requiresCrisis: boolean;
  } | null;
  gad7Assessment: {
    answers: GAD7Answers;
    score: GAD7Score;
    completedAt: ISODateString;
    requiresCrisis: boolean;
  } | null;
  overallRiskLevel: 'minimal' | 'mild' | 'moderate' | 'severe';
  crisisDetected: boolean;
  crisisInterventionCompleted: boolean;
}

export interface ClinicalSafetyPlanData {
  emergencyContacts: Array<{
    id: string;
    name: string;
    relationship: string;
    phone: string;
    isPrimary: boolean;
    available24Hours: boolean;
  }>;
  warningSignsIdentified: string[];
  copingStrategies: string[];
  professionalContacts: Array<{
    name: string;
    role: 'therapist' | 'psychiatrist' | 'doctor';
    phone?: string;
    emergencyAccess: boolean;
  }>;
  crisisHotlinePreferences: {
    preferred988: boolean;
    localHotlines: string[];
    textSupport: boolean;
  };
}

export interface OnboardingSessionMetrics {
  startedAt: ISODateString;
  completedAt?: ISODateString;
  totalDuration: number; // minutes
  stepDurations: Record<ClinicalOnboardingStep, number>;
  pauseCount: number;
  resumeCount: number;
  crisisInterventionCount: number;
  validationErrors: number;
  performanceMetrics: {
    averageStepTime: number;
    slowestStep: { step: ClinicalOnboardingStep; duration: number };
    fastestStep: { step: ClinicalOnboardingStep; duration: number };
  };
}

export interface OnboardingValidationResult {
  isValid: boolean;
  step: ClinicalOnboardingStep;
  errors: string[];
  warnings: string[];
  hipaaCompliant: boolean;
  clinicalRequirementsMet: boolean;
  validationTime: number;
}

// === CLINICAL ONBOARDING STORE INTERFACE ===

interface ClinicalOnboardingStore {
  // Core State
  isActive: boolean;
  currentStep: ClinicalOnboardingStep;
  currentStepIndex: number;
  completedSteps: ClinicalOnboardingStep[];
  isLoading: boolean;
  error: string | null;
  
  // Session Management
  sessionId: string | null;
  sessionMetrics: OnboardingSessionMetrics | null;
  canResume: boolean;
  
  // Onboarding Data (encrypted)
  consentData: ClinicalConsentData | null;
  baselineData: ClinicalBaselineData | null;
  safetyPlanData: ClinicalSafetyPlanData | null;
  
  // Clinical State
  crisisDetected: boolean;
  crisisInterventionActive: boolean;
  requiresImmediateSupport: boolean;
  
  // Performance & Validation
  validationEnabled: boolean;
  lastValidationResult: OnboardingValidationResult | null;
  
  // === CORE SESSION ACTIONS ===
  
  // Session Management
  startOnboarding: () => Promise<void>;
  resumeOnboarding: () => Promise<boolean>;
  pauseOnboarding: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  abandonOnboarding: () => Promise<void>;
  
  // Step Navigation
  goToStep: (step: ClinicalOnboardingStep) => Promise<void>;
  goToNextStep: () => Promise<void>;
  goToPreviousStep: () => Promise<void>;
  canAdvanceToStep: (step: ClinicalOnboardingStep) => boolean;
  
  // === DATA MANAGEMENT ===
  
  // Consent & Privacy (HIPAA Required)
  updateConsentData: (consent: Partial<ClinicalConsentData>) => Promise<void>;
  validateHIPAACompliance: () => Promise<boolean>;
  
  // Clinical Baseline
  recordPHQ9Assessment: (answers: PHQ9Answers) => Promise<void>;
  recordGAD7Assessment: (answers: GAD7Answers) => Promise<void>;
  handleCrisisDetection: (assessmentType: 'phq9' | 'gad7', score: number) => Promise<void>;
  
  // Safety Planning
  updateSafetyPlan: (safetyData: Partial<ClinicalSafetyPlanData>) => Promise<void>;
  addEmergencyContact: (contact: ClinicalSafetyPlanData['emergencyContacts'][0]) => Promise<void>;
  
  // === CLINICAL INTEGRATION ===
  
  // User Store Integration
  syncWithClinicalUserStore: () => Promise<void>;
  applyOnboardingDataToUser: () => Promise<void>;
  
  // Crisis Integration
  triggerCrisisIntervention: (context: string) => Promise<void>;
  completeCrisisIntervention: () => Promise<void>;
  
  // === VALIDATION & UTILITIES ===
  
  // Step Validation
  validateCurrentStep: () => Promise<OnboardingValidationResult>;
  validateAllData: () => Promise<OnboardingValidationResult[]>;
  
  // Progress Tracking
  getOverallProgress: () => number;
  getEstimatedTimeRemaining: () => number;
  getSessionSummary: () => OnboardingSessionMetrics | null;
  
  // Utilities
  clearError: () => void;
  enableValidation: () => void;
  disableValidation: () => void;
}

// === CLINICAL VALIDATION FUNCTIONS ===

const validateOnboardingStep = async (
  step: ClinicalOnboardingStep,
  data: any
): Promise<OnboardingValidationResult> => {
  const startTime = performance.now();
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    switch (step) {
      case 'consent_privacy':
        if (!data?.hipaaConsent?.acknowledged) {
          errors.push('HIPAA consent is required');
        }
        if (!data?.privacyPolicy?.accepted) {
          errors.push('Privacy policy acceptance is required');
        }
        break;
        
      case 'clinical_baseline':
        if (!data?.phq9Assessment && !data?.gad7Assessment) {
          errors.push('At least one clinical assessment is required');
        }
        if (data?.phq9Assessment) {
          if (data.phq9Assessment.score < 0 || data.phq9Assessment.score > 27) {
            errors.push('Invalid PHQ-9 score');
          }
          if (data.phq9Assessment.answers?.[8] >= SUICIDAL_IDEATION_THRESHOLD && 
              !data.phq9Assessment.hasSuicidalIdeation) {
            errors.push('Suicidal ideation detection inconsistent');
          }
        }
        break;
        
      case 'safety_planning':
        if (!data?.emergencyContacts || data.emergencyContacts.length === 0) {
          warnings.push('No emergency contacts configured');
        }
        if (!data?.warningSignsIdentified || data.warningSignsIdentified.length < 2) {
          warnings.push('Consider identifying more warning signs');
        }
        break;
        
      default:
        // Basic validation for other steps
        break;
    }
    
    const validationTime = performance.now() - startTime;
    const isValid = errors.length === 0;
    const stepConfig = CLINICAL_ONBOARDING_STEPS[step];
    const hipaaCompliant = !stepConfig.hipaaRequired || 
      (data?.hipaaConsent?.acknowledged && data?.privacyPolicy?.accepted);
    
    return {
      isValid,
      step,
      errors,
      warnings,
      hipaaCompliant,
      clinicalRequirementsMet: isValid && (!stepConfig.requiresValidation || isValid),
      validationTime
    };
    
  } catch (error) {
    return {
      isValid: false,
      step,
      errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
      hipaaCompliant: false,
      clinicalRequirementsMet: false,
      validationTime: performance.now() - startTime
    };
  }
};

// === CLINICAL ONBOARDING STORAGE ===

const clinicalOnboardingStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const encryptedData = await encryptionService.getEncryptedData(name);
      if (!encryptedData) return null;
      
      const decrypted = await encryptionService.decryptData(
        encryptedData,
        DataSensitivity.CLINICAL
      );
      return JSON.stringify(decrypted);
    } catch (error) {
      console.error('Failed to decrypt onboarding data:', error);
      return null;
    }
  },
  
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const data = JSON.parse(value);
      const encrypted = await encryptionService.encryptData(
        data,
        DataSensitivity.CLINICAL
      );
      await encryptionService.storeEncryptedData(name, encrypted);
    } catch (error) {
      console.error('Failed to encrypt onboarding data:', error);
      throw error;
    }
  },
  
  removeItem: async (name: string): Promise<void> => {
    await encryptionService.removeEncryptedData(name);
  },
};

// === CLINICAL ONBOARDING STORE IMPLEMENTATION ===

export const useClinicalOnboardingStore = create<ClinicalOnboardingStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // === INITIAL STATE ===
        isActive: false,
        currentStep: 'welcome',
        currentStepIndex: 0,
        completedSteps: [],
        isLoading: false,
        error: null,
        
        sessionId: null,
        sessionMetrics: null,
        canResume: false,
        
        consentData: null,
        baselineData: null,
        safetyPlanData: null,
        
        crisisDetected: false,
        crisisInterventionActive: false,
        requiresImmediateSupport: false,
        
        validationEnabled: true,
        lastValidationResult: null,

        // === CORE SESSION ACTIONS ===

        startOnboarding: async () => {
          const startTime = performance.now();
          set({ isLoading: true, error: null });

          try {
            const sessionId = `onboarding_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
            const now = createISODateString();

            // Initialize session metrics
            const sessionMetrics: OnboardingSessionMetrics = {
              startedAt: now,
              totalDuration: 0,
              stepDurations: {} as Record<ClinicalOnboardingStep, number>,
              pauseCount: 0,
              resumeCount: 0,
              crisisInterventionCount: 0,
              validationErrors: 0,
              performanceMetrics: {
                averageStepTime: 0,
                slowestStep: { step: 'welcome', duration: 0 },
                fastestStep: { step: 'welcome', duration: Infinity }
              }
            };

            // Create resumable session
            const session = {
              id: sessionId,
              type: 'onboarding' as const,
              subType: 'clinical' as const,
              startedAt: now,
              progress: {
                currentStep: 0,
                totalSteps: Object.keys(CLINICAL_ONBOARDING_STEPS).length,
                completedSteps: [],
                percentComplete: 0,
                estimatedTimeRemaining: Object.values(CLINICAL_ONBOARDING_STEPS)
                  .reduce((sum, step) => sum + step.estimatedDuration, 0) * 60 // seconds
              },
              data: {},
              metadata: {
                resumeCount: 0,
                totalDuration: 0,
                lastScreen: 'onboarding_welcome',
                navigationStack: ['onboarding_welcome']
              }
            };

            await resumableSessionService.saveSession(session);

            const initTime = performance.now() - startTime;

            set({
              isActive: true,
              sessionId,
              sessionMetrics,
              currentStep: 'welcome',
              currentStepIndex: 0,
              completedSteps: [],
              isLoading: false
            });

            console.log(`✅ Clinical onboarding started: ${initTime.toFixed(2)}ms`);

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to start onboarding';
            console.error('Onboarding start failed:', error);
            
            set({
              error: errorMessage,
              isLoading: false
            });
          }
        },

        resumeOnboarding: async () => {
          set({ isLoading: true, error: null });

          try {
            const existingSessions = await resumableSessionService.getAllSessions();
            const onboardingSession = existingSessions.find(s => 
              s.type === 'onboarding' && s.subType === 'clinical'
            );

            if (onboardingSession && resumableSessionService.canResumeSession(onboardingSession)) {
              // Update resume count
              const updatedSession = {
                ...onboardingSession,
                metadata: {
                  ...onboardingSession.metadata,
                  resumeCount: onboardingSession.metadata.resumeCount + 1
                }
              };

              await resumableSessionService.saveSession(updatedSession);

              // Reconstruct state from session
              const stepNames = Object.keys(CLINICAL_ONBOARDING_STEPS) as ClinicalOnboardingStep[];
              const currentStep = stepNames[onboardingSession.progress.currentStep] || 'welcome';

              set({
                isActive: true,
                sessionId: onboardingSession.id,
                currentStep,
                currentStepIndex: onboardingSession.progress.currentStep,
                completedSteps: onboardingSession.progress.completedSteps as ClinicalOnboardingStep[],
                canResume: true,
                isLoading: false,
                sessionMetrics: {
                  ...get().sessionMetrics!,
                  resumeCount: get().sessionMetrics!.resumeCount + 1
                }
              });

              console.log(`✅ Clinical onboarding resumed: ${onboardingSession.id}`);
              return true;
            }

            set({ isLoading: false, canResume: false });
            return false;

          } catch (error) {
            console.error('Onboarding resume failed:', error);
            set({
              error: 'Failed to resume onboarding session',
              isLoading: false
            });
            return false;
          }
        },

        pauseOnboarding: async () => {
          try {
            const { sessionId, sessionMetrics } = get();
            if (!sessionId || !sessionMetrics) return;

            const updatedMetrics = {
              ...sessionMetrics,
              pauseCount: sessionMetrics.pauseCount + 1
            };

            const session = await resumableSessionService.getSession('onboarding', 'clinical');
            if (session) {
              await resumableSessionService.saveSession({
                ...session,
                metadata: {
                  ...session.metadata,
                  interruptionReason: 'manual_pause'
                }
              });
            }

            set({ sessionMetrics: updatedMetrics });
            console.log('✅ Onboarding session paused');

          } catch (error) {
            console.error('Onboarding pause failed:', error);
          }
        },

        completeOnboarding: async () => {
          const startTime = performance.now();
          set({ isLoading: true, error: null });

          try {
            // Validate all required data
            const validationResults = await get().validateAllData();
            const hasErrors = validationResults.some(result => !result.isValid);
            
            if (hasErrors) {
              throw new Error('Cannot complete onboarding: validation errors exist');
            }

            // Apply onboarding data to Clinical User Store
            await get().applyOnboardingDataToUser();

            // Complete session
            const { sessionMetrics, sessionId } = get();
            const now = createISODateString();
            const completionTime = performance.now() - startTime;

            if (sessionMetrics) {
              const updatedMetrics: OnboardingSessionMetrics = {
                ...sessionMetrics,
                completedAt: now,
                totalDuration: sessionMetrics.totalDuration + completionTime / (1000 * 60) // convert to minutes
              };

              set({ sessionMetrics: updatedMetrics });
            }

            // Clean up session
            if (sessionId) {
              const session = await resumableSessionService.getSession('onboarding', 'clinical');
              if (session) {
                await resumableSessionService.deleteSession(sessionId);
              }
            }

            // Mark as complete in Clinical User Store
            const userStore = useClinicalUserStore.getState();
            await userStore.markOnboardingComplete({
              completedAt: now,
              totalDuration: sessionMetrics?.totalDuration || 0,
              finalStep: 'completion'
            });

            set({
              isActive: false,
              currentStep: 'completion',
              completedSteps: Object.keys(CLINICAL_ONBOARDING_STEPS) as ClinicalOnboardingStep[],
              isLoading: false
            });

            console.log(`✅ Clinical onboarding completed: ${completionTime.toFixed(2)}ms`);

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to complete onboarding';
            console.error('Onboarding completion failed:', error);
            
            set({
              error: errorMessage,
              isLoading: false
            });
          }
        },

        abandonOnboarding: async () => {
          try {
            const { sessionId } = get();
            
            if (sessionId) {
              const session = await resumableSessionService.getSession('onboarding', 'clinical');
              if (session) {
                await resumableSessionService.deleteSession(sessionId);
              }
            }

            set({
              isActive: false,
              sessionId: null,
              sessionMetrics: null,
              currentStep: 'welcome',
              currentStepIndex: 0,
              completedSteps: [],
              consentData: null,
              baselineData: null,
              safetyPlanData: null,
              error: null
            });

            console.log('✅ Onboarding session abandoned');

          } catch (error) {
            console.error('Onboarding abandon failed:', error);
          }
        },

        // === STEP NAVIGATION ===

        goToStep: async (step) => {
          const stepNames = Object.keys(CLINICAL_ONBOARDING_STEPS) as ClinicalOnboardingStep[];
          const stepIndex = stepNames.indexOf(step);
          
          if (stepIndex === -1) {
            set({ error: `Invalid step: ${step}` });
            return;
          }

          // Validate can advance to this step
          if (!get().canAdvanceToStep(step)) {
            set({ error: `Cannot advance to ${step}: requirements not met` });
            return;
          }

          set({
            currentStep: step,
            currentStepIndex: stepIndex,
            error: null
          });

          // Update user store progress
          const userStore = useClinicalUserStore.getState();
          await userStore.updateOnboardingProgress(step, 0);
        },

        goToNextStep: async () => {
          const stepNames = Object.keys(CLINICAL_ONBOARDING_STEPS) as ClinicalOnboardingStep[];
          const { currentStepIndex } = get();
          const nextIndex = currentStepIndex + 1;
          
          if (nextIndex >= stepNames.length) {
            await get().completeOnboarding();
            return;
          }

          const nextStep = stepNames[nextIndex];
          await get().goToStep(nextStep);
        },

        goToPreviousStep: async () => {
          const stepNames = Object.keys(CLINICAL_ONBOARDING_STEPS) as ClinicalOnboardingStep[];
          const { currentStepIndex } = get();
          
          if (currentStepIndex > 0) {
            const prevStep = stepNames[currentStepIndex - 1];
            await get().goToStep(prevStep);
          }
        },

        canAdvanceToStep: (step) => {
          const stepNames = Object.keys(CLINICAL_ONBOARDING_STEPS) as ClinicalOnboardingStep[];
          const targetIndex = stepNames.indexOf(step);
          const { currentStepIndex, completedSteps } = get();
          
          // Can always go back
          if (targetIndex <= currentStepIndex) return true;
          
          // Check if all previous steps are completed
          for (let i = currentStepIndex; i < targetIndex; i++) {
            const requiredStep = stepNames[i];
            if (!completedSteps.includes(requiredStep)) {
              return false;
            }
          }
          
          return true;
        },

        // === DATA MANAGEMENT ===

        updateConsentData: async (consent) => {
          const startTime = performance.now();
          
          try {
            const updatedConsent = {
              ...get().consentData,
              ...consent
            };

            set({ consentData: updatedConsent });

            // Validate HIPAA compliance
            const isCompliant = await get().validateHIPAACompliance();
            if (!isCompliant) {
              console.warn('HIPAA compliance not yet met');
            }

            // Update user store
            if (updatedConsent.hipaaConsent?.acknowledged && updatedConsent.privacyPolicy?.accepted) {
              const userStore = useClinicalUserStore.getState();
              await userStore.updatePrivacySettings({
                consentGiven: true,
                consentDate: updatedConsent.hipaaConsent.consentDate,
                hipaaAcknowledged: true,
                dataProcessingConsent: updatedConsent.dataProcessing?.therapeuticDataCollection || false,
                analyticsConsent: updatedConsent.dataProcessing?.analyticsConsent || false,
                crisisDataSharing: updatedConsent.dataProcessing?.crisisDataSharing || false
              });
            }

            const updateTime = performance.now() - startTime;
            console.log(`✅ Consent data updated: ${updateTime.toFixed(2)}ms`);

          } catch (error) {
            console.error('Consent update failed:', error);
            set({ error: 'Failed to update consent data' });
          }
        },

        validateHIPAACompliance: async () => {
          const { consentData } = get();
          
          return !!(
            consentData?.hipaaConsent?.acknowledged &&
            consentData?.privacyPolicy?.accepted &&
            consentData?.dataProcessing?.therapeuticDataCollection !== undefined
          );
        },

        recordPHQ9Assessment: async (answers) => {
          try {
            const score = answers.reduce((sum, answer) => sum + answer, 0) as PHQ9Score;
            const hasSuicidalIdeation = answers[8] >= SUICIDAL_IDEATION_THRESHOLD;
            const requiresCrisis = score >= CRISIS_THRESHOLD_PHQ9 || hasSuicidalIdeation;

            const phq9Assessment = {
              answers,
              score,
              completedAt: createISODateString(),
              hasSuicidalIdeation,
              requiresCrisis
            };

            const updatedBaseline: ClinicalBaselineData = {
              ...get().baselineData,
              phq9Assessment,
              overallRiskLevel: score >= 20 ? 'severe' : score >= 15 ? 'moderate' : score >= 10 ? 'mild' : 'minimal',
              crisisDetected: requiresCrisis,
              crisisInterventionCompleted: false
            };

            set({ baselineData: updatedBaseline });

            // Handle crisis detection
            if (requiresCrisis) {
              await get().handleCrisisDetection('phq9', score);
            }

            // Update user store
            const userStore = useClinicalUserStore.getState();
            await userStore.recordAssessmentCompletion('phq9', score);

            console.log(`✅ PHQ-9 assessment recorded: score ${score}`);

          } catch (error) {
            console.error('PHQ-9 recording failed:', error);
            set({ error: 'Failed to record PHQ-9 assessment' });
          }
        },

        recordGAD7Assessment: async (answers) => {
          try {
            const score = answers.reduce((sum, answer) => sum + answer, 0) as GAD7Score;
            const requiresCrisis = score >= CRISIS_THRESHOLD_GAD7;

            const gad7Assessment = {
              answers,
              score,
              completedAt: createISODateString(),
              requiresCrisis
            };

            const currentBaseline = get().baselineData;
            const updatedBaseline: ClinicalBaselineData = {
              ...currentBaseline,
              gad7Assessment,
              overallRiskLevel: (() => {
                const phq9Risk = currentBaseline?.phq9Assessment?.score || 0;
                const combinedRisk = Math.max(
                  phq9Risk >= 20 ? 4 : phq9Risk >= 15 ? 3 : phq9Risk >= 10 ? 2 : phq9Risk >= 5 ? 1 : 0,
                  score >= 15 ? 4 : score >= 10 ? 3 : score >= 5 ? 2 : 1
                );
                
                return combinedRisk >= 4 ? 'severe' : combinedRisk >= 3 ? 'moderate' : 
                       combinedRisk >= 2 ? 'mild' : 'minimal';
              })(),
              crisisDetected: requiresCrisis || currentBaseline?.crisisDetected || false,
              crisisInterventionCompleted: currentBaseline?.crisisInterventionCompleted || false
            };

            set({ baselineData: updatedBaseline });

            // Handle crisis detection
            if (requiresCrisis) {
              await get().handleCrisisDetection('gad7', score);
            }

            // Update user store
            const userStore = useClinicalUserStore.getState();
            await userStore.recordAssessmentCompletion('gad7', score);

            console.log(`✅ GAD-7 assessment recorded: score ${score}`);

          } catch (error) {
            console.error('GAD-7 recording failed:', error);
            set({ error: 'Failed to record GAD-7 assessment' });
          }
        },

        handleCrisisDetection: async (assessmentType, score) => {
          try {
            set({
              crisisDetected: true,
              requiresImmediateSupport: true
            });

            // Record crisis event in user store
            const userStore = useClinicalUserStore.getState();
            await userStore.recordCrisisEvent();

            // Update session metrics
            const { sessionMetrics } = get();
            if (sessionMetrics) {
              set({
                sessionMetrics: {
                  ...sessionMetrics,
                  crisisInterventionCount: sessionMetrics.crisisInterventionCount + 1
                }
              });
            }

            console.log(`🚨 Crisis detected during onboarding: ${assessmentType} score ${score}`);

          } catch (error) {
            console.error('Crisis detection handling failed:', error);
          }
        },

        updateSafetyPlan: async (safetyData) => {
          try {
            const updatedSafetyPlan = {
              ...get().safetyPlanData,
              ...safetyData
            };

            set({ safetyPlanData: updatedSafetyPlan });

            // Update user store
            const userStore = useClinicalUserStore.getState();
            await userStore.updateSafetyPlanStatus(true);
            await userStore.updateEmergencyContactsCount(
              updatedSafetyPlan.emergencyContacts?.length || 0
            );

            console.log('✅ Safety plan updated');

          } catch (error) {
            console.error('Safety plan update failed:', error);
            set({ error: 'Failed to update safety plan' });
          }
        },

        addEmergencyContact: async (contact) => {
          try {
            const currentSafetyPlan = get().safetyPlanData;
            const updatedContacts = [
              ...(currentSafetyPlan?.emergencyContacts || []),
              contact
            ];

            await get().updateSafetyPlan({
              emergencyContacts: updatedContacts
            });

            console.log(`✅ Emergency contact added: ${contact.name}`);

          } catch (error) {
            console.error('Emergency contact addition failed:', error);
            set({ error: 'Failed to add emergency contact' });
          }
        },

        // === CLINICAL INTEGRATION ===

        syncWithClinicalUserStore: async () => {
          // This method ensures data consistency between stores
          try {
            const userStore = useClinicalUserStore.getState();
            const { consentData, baselineData, safetyPlanData } = get();

            if (userStore.user && consentData) {
              // Sync consent and privacy settings
              if (consentData.hipaaConsent.acknowledged) {
                await userStore.updatePrivacySettings({
                  consentGiven: true,
                  hipaaAcknowledged: true,
                  consentDate: consentData.hipaaConsent.consentDate
                });
              }
            }

            console.log('✅ Synced with Clinical User Store');

          } catch (error) {
            console.error('Sync with user store failed:', error);
          }
        },

        applyOnboardingDataToUser: async () => {
          try {
            const userStore = useClinicalUserStore.getState();
            const { consentData, baselineData, safetyPlanData } = get();

            if (!userStore.user) {
              throw new Error('No user profile to update');
            }

            // Apply clinical baseline data
            if (baselineData) {
              await userStore.updateClinicalProfile({
                phq9Baseline: baselineData.phq9Assessment?.score,
                gad7Baseline: baselineData.gad7Assessment?.score,
                riskLevel: baselineData.overallRiskLevel,
                lastAssessmentDate: baselineData.phq9Assessment?.completedAt || 
                                  baselineData.gad7Assessment?.completedAt
              });
            }

            // Apply safety plan data
            if (safetyPlanData) {
              await userStore.updateSafetyPlanStatus(true);
              await userStore.updateEmergencyContactsCount(safetyPlanData.emergencyContacts.length);
            }

            // Apply consent data
            if (consentData) {
              await userStore.updatePrivacySettings({
                consentGiven: consentData.hipaaConsent.acknowledged,
                hipaaAcknowledged: consentData.hipaaConsent.acknowledged,
                consentDate: consentData.hipaaConsent.consentDate,
                dataProcessingConsent: consentData.dataProcessing.therapeuticDataCollection,
                analyticsConsent: consentData.dataProcessing.analyticsConsent,
                crisisDataSharing: consentData.dataProcessing.crisisDataSharing
              });
            }

            console.log('✅ Onboarding data applied to user profile');

          } catch (error) {
            console.error('Failed to apply onboarding data:', error);
            throw error;
          }
        },

        triggerCrisisIntervention: async (context) => {
          try {
            set({ 
              crisisInterventionActive: true,
              requiresImmediateSupport: true 
            });

            // This would integrate with crisis intervention systems
            console.log(`🚨 Crisis intervention triggered: ${context}`);

          } catch (error) {
            console.error('Crisis intervention trigger failed:', error);
          }
        },

        completeCrisisIntervention: async () => {
          try {
            set({
              crisisInterventionActive: false,
              requiresImmediateSupport: false
            });

            // Update baseline data
            const { baselineData } = get();
            if (baselineData) {
              set({
                baselineData: {
                  ...baselineData,
                  crisisInterventionCompleted: true
                }
              });
            }

            console.log('✅ Crisis intervention completed');

          } catch (error) {
            console.error('Crisis intervention completion failed:', error);
          }
        },

        // === VALIDATION & UTILITIES ===

        validateCurrentStep: async () => {
          const { currentStep, consentData, baselineData, safetyPlanData } = get();
          
          let data;
          switch (currentStep) {
            case 'consent_privacy':
              data = consentData;
              break;
            case 'clinical_baseline':
              data = baselineData;
              break;
            case 'safety_planning':
              data = safetyPlanData;
              break;
            default:
              data = {};
          }

          const result = await validateOnboardingStep(currentStep, data);
          set({ lastValidationResult: result });
          
          return result;
        },

        validateAllData: async () => {
          const { consentData, baselineData, safetyPlanData } = get();
          
          const validations = await Promise.all([
            validateOnboardingStep('consent_privacy', consentData),
            validateOnboardingStep('clinical_baseline', baselineData),
            validateOnboardingStep('safety_planning', safetyPlanData)
          ]);

          return validations;
        },

        getOverallProgress: () => {
          const { completedSteps } = get();
          const totalSteps = Object.keys(CLINICAL_ONBOARDING_STEPS).length;
          return Math.round((completedSteps.length / totalSteps) * 100);
        },

        getEstimatedTimeRemaining: () => {
          const { currentStepIndex } = get();
          const stepNames = Object.keys(CLINICAL_ONBOARDING_STEPS) as ClinicalOnboardingStep[];
          
          let timeRemaining = 0;
          for (let i = currentStepIndex; i < stepNames.length; i++) {
            const step = stepNames[i];
            timeRemaining += CLINICAL_ONBOARDING_STEPS[step].estimatedDuration;
          }
          
          return timeRemaining;
        },

        getSessionSummary: () => {
          return get().sessionMetrics;
        },

        clearError: () => {
          set({ error: null });
        },

        enableValidation: () => {
          set({ validationEnabled: true });
        },

        disableValidation: () => {
          set({ validationEnabled: false });
        }
      }),
      {
        name: 'being-clinical-onboarding-storage',
        storage: createJSONStorage(() => clinicalOnboardingStorage),
        partialize: (state) => ({
          isActive: state.isActive,
          currentStep: state.currentStep,
          currentStepIndex: state.currentStepIndex,
          completedSteps: state.completedSteps,
          sessionId: state.sessionId,
          sessionMetrics: state.sessionMetrics,
          consentData: state.consentData,
          baselineData: state.baselineData,
          safetyPlanData: state.safetyPlanData,
          validationEnabled: state.validationEnabled
        }),
        version: 1,
        migrate: (persistedState: any, version: number) => {
          if (version === 0) {
            return {
              ...persistedState,
              validationEnabled: true,
              crisisDetected: false,
              crisisInterventionActive: false
            };
          }
          return persistedState;
        },
        onRehydrateStorage: () => (state) => {
          if (state) {
            console.log('✅ Clinical onboarding store rehydrated');
            
            // Auto-resume if active
            if (state.isActive && state.sessionId) {
              setTimeout(() => {
                state.resumeOnboarding?.();
              }, 500);
            }
          }
        }
      }
    )
  )
);

// === STORE UTILITIES ===

export const clinicalOnboardingStoreUtils = {
  // Status Checks
  isOnboardingActive: (): boolean => {
    const state = useClinicalOnboardingStore.getState();
    return state.isActive;
  },

  getCurrentProgress: (): number => {
    const state = useClinicalOnboardingStore.getState();
    return state.getOverallProgress();
  },

  canCompleteOnboarding: (): boolean => {
    const state = useClinicalOnboardingStore.getState();
    return state.completedSteps.length >= 6; // Minimum required steps
  },

  requiresCrisisSupport: (): boolean => {
    const state = useClinicalOnboardingStore.getState();
    return state.crisisDetected || state.requiresImmediateSupport;
  },

  getBaselineScores: () => {
    const state = useClinicalOnboardingStore.getState();
    const baseline = state.baselineData;
    return {
      phq9: baseline?.phq9Assessment?.score,
      gad7: baseline?.gad7Assessment?.score,
      riskLevel: baseline?.overallRiskLevel
    };
  },

  // Integration Support
  getOnboardingSummary: () => {
    const state = useClinicalOnboardingStore.getState();
    return {
      isActive: state.isActive,
      currentStep: state.currentStep,
      progress: state.getOverallProgress(),
      timeRemaining: state.getEstimatedTimeRemaining(),
      hasConsent: !!state.consentData?.hipaaConsent?.acknowledged,
      hasBaselineAssessments: !!(state.baselineData?.phq9Assessment || state.baselineData?.gad7Assessment),
      hasSafetyPlan: !!state.safetyPlanData?.emergencyContacts?.length,
      crisisDetected: state.crisisDetected,
      canComplete: state.completedSteps.length >= 6
    };
  }
};

// React Hook for easier component integration
export const useClinicalOnboarding = () => {
  const store = useClinicalOnboardingStore();
  
  return {
    // State
    isActive: store.isActive,
    currentStep: store.currentStep,
    progress: store.getOverallProgress(),
    isLoading: store.isLoading,
    error: store.error,
    crisisDetected: store.crisisDetected,
    
    // Session Actions
    start: store.startOnboarding,
    resume: store.resumeOnboarding,
    pause: store.pauseOnboarding,
    complete: store.completeOnboarding,
    abandon: store.abandonOnboarding,
    
    // Navigation
    goToStep: store.goToStep,
    nextStep: store.goToNextStep,
    previousStep: store.goToPreviousStep,
    canAdvance: store.canAdvanceToStep,
    
    // Data Management
    updateConsent: store.updateConsentData,
    recordPHQ9: store.recordPHQ9Assessment,
    recordGAD7: store.recordGAD7Assessment,
    updateSafetyPlan: store.updateSafetyPlan,
    
    // Utilities
    validate: store.validateCurrentStep,
    clearError: store.clearError,
    getTimeRemaining: store.getEstimatedTimeRemaining,
    getSummary: store.getSessionSummary
  };
};

export default useClinicalOnboardingStore;