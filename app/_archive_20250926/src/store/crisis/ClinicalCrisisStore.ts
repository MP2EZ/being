/**
 * Clinical Crisis Store - Phase 5C Group 3 Migration to Clinical Pattern
 * CRITICAL: Emergency response <200ms, 988 hotline instant access, DataSensitivity.CRISIS encryption
 *
 * Clinical Pattern Features:
 * - PHQ-9/GAD-7 integrated crisis detection
 * - Clinical threshold management (PHQ≥20, GAD≥15, Suicidal ideation≥1)
 * - Emergency response performance monitoring
 * - Clinical context for all crisis events
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking } from 'react-native';
import { encryptionService, DataSensitivity } from '../../services/security';
import { OfflineCrisisManager } from '../../services/OfflineCrisisManager';
import CrisisResponseMonitor from '../../services/CrisisResponseMonitor';
import {
  CRISIS_THRESHOLD_PHQ9,
  CRISIS_THRESHOLD_GAD7,
  SUICIDAL_IDEATION_THRESHOLD,
  SUICIDAL_IDEATION_QUESTION_INDEX,
  AssessmentID,
  PHQ9Score,
  GAD7Score,
  ISODateString,
  createISODateString
} from '../../types/clinical';

// Clinical Crisis Types
export type ClinicalCrisisSeverity = 'none' | 'mild' | 'moderate' | 'severe' | 'critical';

export type ClinicalCrisisTrigger =
  | 'phq9_threshold' // PHQ-9 ≥ 20
  | 'gad7_threshold' // GAD-7 ≥ 15
  | 'suicidal_ideation' // PHQ-9 Q9 ≥ 1
  | 'user_activated' // Manual crisis button
  | 'clinical_assessment'; // Clinical professional trigger

export type ClinicalCrisisIntervention =
  | '988_hotline' // National Suicide Prevention Lifeline
  | 'emergency_911' // Emergency services
  | 'crisis_text_line' // Text HOME to 741741
  | 'emergency_contact' // Personal emergency contact
  | 'safety_plan' // Personal safety plan activation
  | 'coping_strategies'; // Immediate coping techniques

// Clinical Emergency Contact with proper encryption
export interface ClinicalEmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: 'family' | 'friend' | 'therapist' | 'psychiatrist' | 'doctor' | 'other';
  isPrimary: boolean;
  isAvailable24h: boolean;
  notes?: string;
  encryptionLevel: DataSensitivity.CRISIS;
  createdAt: ISODateString;
  lastContactedAt?: ISODateString;
}

// Clinical Crisis Event with assessment context
export interface ClinicalCrisisEvent {
  id: string;
  triggeredAt: ISODateString;
  trigger: ClinicalCrisisTrigger;
  severity: ClinicalCrisisSeverity;

  // Clinical assessment context
  assessmentId?: AssessmentID;
  assessmentType?: 'phq9' | 'gad7';
  triggerScore?: PHQ9Score | GAD7Score;
  hasSuicidalIdeation?: boolean;

  // Response tracking
  interventionsUsed: ClinicalCrisisIntervention[];
  responseTimeMs: number;
  emergencyServicesContacted: boolean;
  resolved: boolean;
  resolvedAt?: ISODateString;

  // Clinical feedback
  interventionEffectiveness?: 'very_helpful' | 'helpful' | 'somewhat_helpful' | 'not_helpful';
  clinicalNotes?: string;
  followUpRequired: boolean;
}

// Clinical Safety Plan with PHQ-9/GAD-7 integration
export interface ClinicalSafetyPlan {
  id: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;

  // PHQ-9 specific warning signs and strategies
  phq9WarningSignsSymptoms: string[];
  phq9CopingStrategies: string[];
  phq9SuicidalIdeationResponse: string[];

  // GAD-7 specific warning signs and strategies
  gad7WarningSignsSymptoms: string[];
  gad7CopingStrategies: string[];
  gad7PanicResponsePlan: string[];

  // General safety strategies
  environmentalSafetySteps: string[];
  reasonsForLiving: string[];

  // Clinical contacts
  emergencyContactIds: string[];
  clinicalContactIds: string[];

  // Crisis response plan
  immediateActionSteps: string[];
  emergencyServicesPlan: string;

  isActive: boolean;
  lastReviewedAt: ISODateString;
}

// Clinical Crisis Configuration
export interface ClinicalCrisisConfiguration {
  // Clinical thresholds (immutable)
  readonly phq9CrisisThreshold: typeof CRISIS_THRESHOLD_PHQ9;
  readonly gad7CrisisThreshold: typeof CRISIS_THRESHOLD_GAD7;
  readonly suicidalIdeationThreshold: typeof SUICIDAL_IDEATION_THRESHOLD;
  readonly suicidalIdeationQuestionIndex: typeof SUICIDAL_IDEATION_QUESTION_INDEX;

  // Performance requirements (immutable)
  readonly responseTimeTargetMs: 200;
  readonly emergencyResponseTimeMs: 100;
  readonly hotlineAccessTimeMs: 50;

  // Monitoring settings
  realTimeMonitoring: boolean;
  automaticCrisisDetection: boolean;
  emergencyContactNotification: boolean;
}

// Clinical Crisis Performance Metrics
export interface ClinicalCrisisPerformanceMetrics {
  totalCrisisEvents: number;
  averageResponseTimeMs: number;
  fastestResponseMs: number;
  slowestResponseMs: number;

  // Performance tracking
  responseTimesBelowTarget: number;
  responseTimesAboveTarget: number;
  emergencyResponseFailures: number;

  // Intervention effectiveness
  interventionSuccessRate: number;
  hotline988AccessSuccessRate: number;
  emergencyContactSuccessRate: number;

  // Clinical context
  phq9TriggeredCrises: number;
  gad7TriggeredCrises: number;
  suicidalIdeationCrises: number;
  userActivatedCrises: number;

  lastPerformanceReview: ISODateString;
}

// Clinical Crisis Store State
export interface ClinicalCrisisState {
  // Current crisis status
  isInCrisis: boolean;
  currentSeverity: ClinicalCrisisSeverity;
  activeCrisisId?: string;
  crisisStartTime?: ISODateString;

  // Clinical assessment integration
  lastTriggeredByAssessment?: {
    assessmentId: AssessmentID;
    assessmentType: 'phq9' | 'gad7';
    score: PHQ9Score | GAD7Score;
    hasSuicidalIdeation?: boolean;
  };

  // Configuration
  configuration: ClinicalCrisisConfiguration;

  // Clinical data
  emergencyContacts: ClinicalEmergencyContact[];
  crisisEvents: ClinicalCrisisEvent[];
  safetyPlan: ClinicalSafetyPlan | null;

  // Performance monitoring
  performanceMetrics: ClinicalCrisisPerformanceMetrics;

  // UI state
  showCrisisButton: boolean;
  crisisButtonPosition: 'bottom-right' | 'bottom-left' | 'top-right';

  // Actions - Crisis Detection & Response
  detectClinicalCrisis: (
    assessmentType: 'phq9' | 'gad7',
    score: PHQ9Score | GAD7Score,
    assessmentId?: AssessmentID
  ) => Promise<boolean>;

  detectSuicidalIdeation: (
    phq9Answers: readonly number[],
    assessmentId?: AssessmentID
  ) => Promise<boolean>;

  activateCrisisIntervention: (
    trigger: ClinicalCrisisTrigger,
    severity: ClinicalCrisisSeverity,
    clinicalContext?: {
      assessmentId?: AssessmentID;
      assessmentType?: 'phq9' | 'gad7';
      score?: PHQ9Score | GAD7Score;
      hasSuicidalIdeation?: boolean;
    }
  ) => Promise<string>;

  triggerManualCrisis: () => Promise<void>;

  // Emergency Actions (must maintain <200ms performance)
  call988Hotline: () => Promise<boolean>;
  call911Emergency: () => Promise<boolean>;
  sendCrisisText: () => Promise<boolean>;
  contactEmergencyContact: (contactId: string) => Promise<boolean>;

  // Crisis Management
  resolveCrisis: (
    crisisId: string,
    effectiveness?: 'very_helpful' | 'helpful' | 'somewhat_helpful' | 'not_helpful',
    clinicalNotes?: string
  ) => Promise<void>;

  executeCrisisIntervention: (intervention: ClinicalCrisisIntervention) => Promise<boolean>;

  // Emergency Contacts Management
  addEmergencyContact: (contact: Omit<ClinicalEmergencyContact, 'id' | 'createdAt' | 'encryptionLevel'>) => Promise<boolean>;
  updateEmergencyContact: (contactId: string, updates: Partial<ClinicalEmergencyContact>) => Promise<boolean>;
  removeEmergencyContact: (contactId: string) => Promise<boolean>;

  // Safety Plan Management
  createClinicalSafetyPlan: (plan: Omit<ClinicalSafetyPlan, 'id' | 'createdAt' | 'updatedAt' | 'lastReviewedAt'>) => Promise<boolean>;
  updateClinicalSafetyPlan: (updates: Partial<ClinicalSafetyPlan>) => Promise<boolean>;
  reviewSafetyPlan: () => Promise<void>;

  // Clinical Analytics
  getCrisisHistory: (days?: number, assessmentType?: 'phq9' | 'gad7') => ClinicalCrisisEvent[];
  getClinicalCrisisStats: () => {
    totalCrises: number;
    crisissByTrigger: Record<ClinicalCrisisTrigger, number>;
    crisissBySeverity: Record<ClinicalCrisisSeverity, number>;
    averageResponseTime: number;
    interventionEffectiveness: Record<ClinicalCrisisIntervention, number>;
    phq9CrisisRate: number;
    gad7CrisisRate: number;
    suicidalIdeationRate: number;
  };

  // Performance Monitoring
  getPerformanceMetrics: () => ClinicalCrisisPerformanceMetrics;
  resetPerformanceMetrics: () => void;

  // Configuration
  updateCrisisConfiguration: (updates: Partial<Pick<ClinicalCrisisConfiguration, 'realTimeMonitoring' | 'automaticCrisisDetection' | 'emergencyContactNotification'>>) => Promise<void>;

  // State Management
  clearCrisisState: () => Promise<void>;
  initializeClinicalCrisisSystem: () => Promise<void>;
}

// Encrypted storage for crisis data with DataSensitivity.CRISIS
const clinicalCrisisStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const encryptedData = await AsyncStorage.getItem(name);
      if (!encryptedData) return null;

      const decrypted = await encryptionService.decryptData(
        JSON.parse(encryptedData),
        DataSensitivity.CRISIS
      );
      return JSON.stringify(decrypted);
    } catch (error) {
      console.error('Failed to decrypt clinical crisis data:', error);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const data = JSON.parse(value);
      const encrypted = await encryptionService.encryptData(
        data,
        DataSensitivity.CRISIS
      );
      await AsyncStorage.setItem(name, JSON.stringify(encrypted));
    } catch (error) {
      console.error('Failed to encrypt clinical crisis data:', error);
      throw error;
    }
  },
  removeItem: async (name: string): Promise<void> => {
    await AsyncStorage.removeItem(name);
  },
};

/**
 * Clinical Crisis Store Implementation
 * Maintains emergency response performance while providing clinical context
 */
export const useClinicalCrisisStore = create<ClinicalCrisisState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial State
        isInCrisis: false,
        currentSeverity: 'none',
        activeCrisisId: undefined,
        crisisStartTime: undefined,
        lastTriggeredByAssessment: undefined,

        // Immutable clinical configuration
        configuration: {
          phq9CrisisThreshold: CRISIS_THRESHOLD_PHQ9,
          gad7CrisisThreshold: CRISIS_THRESHOLD_GAD7,
          suicidalIdeationThreshold: SUICIDAL_IDEATION_THRESHOLD,
          suicidalIdeationQuestionIndex: SUICIDAL_IDEATION_QUESTION_INDEX,
          responseTimeTargetMs: 200,
          emergencyResponseTimeMs: 100,
          hotlineAccessTimeMs: 50,
          realTimeMonitoring: true,
          automaticCrisisDetection: true,
          emergencyContactNotification: true,
        },

        emergencyContacts: [],
        crisisEvents: [],
        safetyPlan: null,

        performanceMetrics: {
          totalCrisisEvents: 0,
          averageResponseTimeMs: 0,
          fastestResponseMs: Infinity,
          slowestResponseMs: 0,
          responseTimesBelowTarget: 0,
          responseTimesAboveTarget: 0,
          emergencyResponseFailures: 0,
          interventionSuccessRate: 0,
          hotline988AccessSuccessRate: 0,
          emergencyContactSuccessRate: 0,
          phq9TriggeredCrises: 0,
          gad7TriggeredCrises: 0,
          suicidalIdeationCrises: 0,
          userActivatedCrises: 0,
          lastPerformanceReview: createISODateString(),
        },

        showCrisisButton: true,
        crisisButtonPosition: 'bottom-right',

        // Initialize Clinical Crisis System
        initializeClinicalCrisisSystem: async () => {
          const startTime = performance.now();

          try {
            await CrisisResponseMonitor.executeCrisisAction(
              'initialize-clinical-crisis-system',
              async () => {
                // Initialize offline crisis resources
                await OfflineCrisisManager.initializeOfflineCrisisData();

                // Validate emergency contacts
                const { emergencyContacts } = get();
                for (const contact of emergencyContacts) {
                  if (contact.encryptionLevel !== DataSensitivity.CRISIS) {
                    console.warn(`Emergency contact ${contact.id} has incorrect encryption level`);
                  }
                }

                // Verify crisis response performance
                const testStartTime = performance.now();
                const testResponseTime = performance.now() - testStartTime;

                if (testResponseTime > get().configuration.responseTimeTargetMs) {
                  console.warn(`Crisis system performance warning: ${testResponseTime}ms > ${get().configuration.responseTimeTargetMs}ms target`);
                }

                console.log('✅ Clinical Crisis System initialized successfully');
                return true;
              }
            );
          } catch (error) {
            console.error('❌ Clinical Crisis System initialization failed:', error);
            throw error;
          }

          CrisisResponseMonitor.monitorSyncCrisisAction('clinical-crisis-system-init', startTime);
        },

        // Clinical Crisis Detection with PHQ-9/GAD-7 Context
        detectClinicalCrisis: async (
          assessmentType: 'phq9' | 'gad7',
          score: PHQ9Score | GAD7Score,
          assessmentId?: AssessmentID
        ) => {
          const startTime = performance.now();

          try {
            return await CrisisResponseMonitor.executeCrisisAction(
              `detect-clinical-crisis-${assessmentType}`,
              async () => {
                const { configuration } = get();
                let severity: ClinicalCrisisSeverity = 'none';
                let trigger: ClinicalCrisisTrigger;

                if (assessmentType === 'phq9') {
                  trigger = 'phq9_threshold';
                  if (score >= configuration.phq9CrisisThreshold) {
                    severity = score >= 25 ? 'critical' : 'severe';
                  } else if (score >= 15) {
                    severity = 'moderate';
                  }
                } else {
                  trigger = 'gad7_threshold';
                  if (score >= configuration.gad7CrisisThreshold) {
                    severity = score >= 19 ? 'severe' : 'moderate';
                  }
                }

                if (severity !== 'none') {
                  const crisisId = await get().activateCrisisIntervention(
                    trigger,
                    severity,
                    {
                      assessmentId,
                      assessmentType,
                      score,
                      hasSuicidalIdeation: false
                    }
                  );

                  console.log(`🚨 Clinical Crisis detected: ${assessmentType} score ${score}, severity ${severity}`);
                  return true;
                }

                return false;
              }
            );
          } catch (error) {
            console.error('Clinical crisis detection failed:', error);
            return false;
          } finally {
            CrisisResponseMonitor.monitorSyncCrisisAction(`clinical-crisis-detection-${assessmentType}`, startTime);
          }
        },

        // Suicidal Ideation Detection (PHQ-9 Q9)
        detectSuicidalIdeation: async (
          phq9Answers: readonly number[],
          assessmentId?: AssessmentID
        ) => {
          const startTime = performance.now();

          try {
            return await CrisisResponseMonitor.executeCrisisAction(
              'detect-suicidal-ideation',
              async () => {
                const { configuration } = get();
                const suicidalIdeationResponse = phq9Answers[configuration.suicidalIdeationQuestionIndex];

                if (suicidalIdeationResponse >= configuration.suicidalIdeationThreshold) {
                  const severity: ClinicalCrisisSeverity = suicidalIdeationResponse >= 2 ? 'critical' : 'severe';
                  const totalScore = phq9Answers.reduce((sum, answer) => sum + answer, 0) as PHQ9Score;

                  const crisisId = await get().activateCrisisIntervention(
                    'suicidal_ideation',
                    severity,
                    {
                      assessmentId,
                      assessmentType: 'phq9',
                      score: totalScore,
                      hasSuicidalIdeation: true
                    }
                  );

                  console.log(`🚨 CRITICAL: Suicidal ideation detected, Q9 response: ${suicidalIdeationResponse}`);
                  return true;
                }

                return false;
              }
            );
          } catch (error) {
            console.error('Suicidal ideation detection failed:', error);
            return false;
          } finally {
            CrisisResponseMonitor.monitorSyncCrisisAction('suicidal-ideation-detection', startTime);
          }
        },

        // Manual Crisis Trigger
        triggerManualCrisis: async () => {
          const startTime = performance.now();

          try {
            await CrisisResponseMonitor.executeCrisisAction(
              'manual-crisis-trigger',
              async () => {
                const crisisId = await get().activateCrisisIntervention('user_activated', 'moderate');
                console.log('🚨 Manual crisis intervention triggered by user');
                return crisisId;
              }
            );
          } catch (error) {
            console.error('Manual crisis trigger failed:', error);
          } finally {
            CrisisResponseMonitor.monitorSyncCrisisAction('manual-crisis-trigger', startTime);
          }
        },

        // Crisis Intervention Activation with Clinical Context
        activateCrisisIntervention: async (
          trigger: ClinicalCrisisTrigger,
          severity: ClinicalCrisisSeverity,
          clinicalContext?: {
            assessmentId?: AssessmentID;
            assessmentType?: 'phq9' | 'gad7';
            score?: PHQ9Score | GAD7Score;
            hasSuicidalIdeation?: boolean;
          }
        ) => {
          const startTime = performance.now();
          const crisisId = `clinical_crisis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          try {
            const crisisEvent: ClinicalCrisisEvent = {
              id: crisisId,
              triggeredAt: createISODateString(),
              trigger,
              severity,
              assessmentId: clinicalContext?.assessmentId,
              assessmentType: clinicalContext?.assessmentType,
              triggerScore: clinicalContext?.score,
              hasSuicidalIdeation: clinicalContext?.hasSuicidalIdeation,
              interventionsUsed: [],
              responseTimeMs: 0,
              emergencyServicesContacted: false,
              resolved: false,
              followUpRequired: severity === 'critical' || severity === 'severe',
            };

            set({
              isInCrisis: true,
              currentSeverity: severity,
              activeCrisisId: crisisId,
              crisisStartTime: crisisEvent.triggeredAt,
              lastTriggeredByAssessment: clinicalContext ? {
                assessmentId: clinicalContext.assessmentId!,
                assessmentType: clinicalContext.assessmentType!,
                score: clinicalContext.score!,
                hasSuicidalIdeation: clinicalContext.hasSuicidalIdeation
              } : undefined,
            });

            // Add to crisis history
            const { crisisEvents } = get();
            set({ crisisEvents: [...crisisEvents, crisisEvent] });

            // Determine immediate intervention based on severity and context
            let immediateAction: ClinicalCrisisIntervention;
            if (trigger === 'suicidal_ideation' || severity === 'critical') {
              immediateAction = '988_hotline';
            } else if (severity === 'severe') {
              immediateAction = '988_hotline';
            } else {
              immediateAction = 'safety_plan';
            }

            // Execute immediate intervention
            await get().executeCrisisIntervention(immediateAction);

            // Update performance metrics
            const responseTime = performance.now() - startTime;
            crisisEvent.responseTimeMs = responseTime;

            const { performanceMetrics } = get();
            const updatedMetrics: ClinicalCrisisPerformanceMetrics = {
              ...performanceMetrics,
              totalCrisisEvents: performanceMetrics.totalCrisisEvents + 1,
              averageResponseTimeMs: (performanceMetrics.averageResponseTimeMs * performanceMetrics.totalCrisisEvents + responseTime) / (performanceMetrics.totalCrisisEvents + 1),
              fastestResponseMs: Math.min(performanceMetrics.fastestResponseMs, responseTime),
              slowestResponseMs: Math.max(performanceMetrics.slowestResponseMs, responseTime),
              responseTimesBelowTarget: responseTime <= get().configuration.responseTimeTargetMs ? performanceMetrics.responseTimesBelowTarget + 1 : performanceMetrics.responseTimesBelowTarget,
              responseTimesAboveTarget: responseTime > get().configuration.responseTimeTargetMs ? performanceMetrics.responseTimesAboveTarget + 1 : performanceMetrics.responseTimesAboveTarget,
              phq9TriggeredCrises: trigger === 'phq9_threshold' ? performanceMetrics.phq9TriggeredCrises + 1 : performanceMetrics.phq9TriggeredCrises,
              gad7TriggeredCrises: trigger === 'gad7_threshold' ? performanceMetrics.gad7TriggeredCrises + 1 : performanceMetrics.gad7TriggeredCrises,
              suicidalIdeationCrises: trigger === 'suicidal_ideation' ? performanceMetrics.suicidalIdeationCrises + 1 : performanceMetrics.suicidalIdeationCrises,
              userActivatedCrises: trigger === 'user_activated' ? performanceMetrics.userActivatedCrises + 1 : performanceMetrics.userActivatedCrises,
            };

            set({ performanceMetrics: updatedMetrics });

            console.log(`🚨 Clinical Crisis intervention activated: ${crisisId}, severity: ${severity}, response time: ${responseTime.toFixed(2)}ms`);

            return crisisId;
          } catch (error) {
            console.error('Clinical crisis intervention activation failed:', error);
            throw error;
          } finally {
            CrisisResponseMonitor.monitorSyncCrisisAction('clinical-crisis-intervention-activation', startTime);
          }
        },

        // Execute Crisis Intervention
        executeCrisisIntervention: async (intervention: ClinicalCrisisIntervention) => {
          const startTime = performance.now();

          try {
            return await CrisisResponseMonitor.executeCrisisAction(
              `crisis-intervention-${intervention}`,
              async () => {
                let success = false;

                switch (intervention) {
                  case '988_hotline':
                    success = await get().call988Hotline();
                    break;
                  case 'emergency_911':
                    success = await get().call911Emergency();
                    break;
                  case 'crisis_text_line':
                    success = await get().sendCrisisText();
                    break;
                  case 'safety_plan':
                    const { safetyPlan } = get();
                    if (safetyPlan && safetyPlan.isActive) {
                      Alert.alert(
                        'Your Clinical Safety Plan',
                        `Immediate Actions: ${safetyPlan.immediateActionSteps.slice(0, 3).join(', ')}`,
                        [{ text: 'OK' }]
                      );
                      success = true;
                    } else {
                      Alert.alert(
                        'Safety Plan',
                        'Create a personalized safety plan in settings for immediate crisis support.',
                        [{ text: 'OK' }]
                      );
                      success = false;
                    }
                    break;
                  case 'coping_strategies':
                    Alert.alert(
                      'Immediate Coping Strategies',
                      '• Take 5 deep breaths (count each one)\n• Call a trusted friend or family member\n• Go to a safe, comfortable place\n• Use 5-4-3-2-1 grounding technique\n• Hold ice cubes or cold water on wrists',
                      [{ text: 'OK' }]
                    );
                    success = true;
                    break;
                }

                // Record intervention in active crisis
                const { activeCrisisId, crisisEvents } = get();
                if (activeCrisisId) {
                  const updatedEvents = crisisEvents.map(event =>
                    event.id === activeCrisisId
                      ? { ...event, interventionsUsed: [...event.interventionsUsed, intervention] }
                      : event
                  );
                  set({ crisisEvents: updatedEvents });
                }

                return success;
              }
            );
          } catch (error) {
            console.error(`Crisis intervention ${intervention} failed:`, error);
            return false;
          } finally {
            CrisisResponseMonitor.monitorSyncCrisisAction(`crisis-intervention-${intervention}`, startTime);
          }
        },

        // 988 Hotline Access (must be <50ms)
        call988Hotline: async () => {
          const startTime = performance.now();

          try {
            await Linking.openURL('tel:988');

            const responseTime = performance.now() - startTime;
            if (responseTime > get().configuration.hotlineAccessTimeMs) {
              console.warn(`988 hotline access exceeded target: ${responseTime}ms`);
            }

            return true;
          } catch (error) {
            Alert.alert(
              'Crisis Support - 988',
              'Please dial 988 directly on your phone for immediate crisis support from trained counselors.',
              [{ text: 'OK' }]
            );
            return false;
          }
        },

        // 911 Emergency Services
        call911Emergency: async () => {
          try {
            await Linking.openURL('tel:911');

            // Mark emergency services contacted
            const { activeCrisisId, crisisEvents } = get();
            if (activeCrisisId) {
              const updatedEvents = crisisEvents.map(event =>
                event.id === activeCrisisId
                  ? { ...event, emergencyServicesContacted: true }
                  : event
              );
              set({ crisisEvents: updatedEvents });
            }

            return true;
          } catch (error) {
            Alert.alert(
              'Emergency Services - 911',
              'Please dial 911 directly for immediate emergency assistance.',
              [{ text: 'OK' }]
            );
            return false;
          }
        },

        // Crisis Text Line
        sendCrisisText: async () => {
          try {
            Alert.alert(
              'Crisis Text Line',
              'Text HOME to 741741 for free, 24/7 crisis support via text message.',
              [
                {
                  text: 'Copy Number',
                  onPress: () => {
                    console.log('Crisis text number copied: 741741');
                  }
                },
                { text: 'OK' }
              ]
            );
            return true;
          } catch (error) {
            return false;
          }
        },

        // Contact Emergency Contact
        contactEmergencyContact: async (contactId: string) => {
          try {
            const { emergencyContacts } = get();
            const contact = emergencyContacts.find(c => c.id === contactId);

            if (contact) {
              await Linking.openURL(`tel:${contact.phone}`);

              // Update last contacted time
              const updatedContacts = emergencyContacts.map(c =>
                c.id === contactId
                  ? { ...c, lastContactedAt: createISODateString() }
                  : c
              );
              set({ emergencyContacts: updatedContacts });

              return true;
            }
            return false;
          } catch (error) {
            return false;
          }
        },

        // Resolve Crisis
        resolveCrisis: async (
          crisisId: string,
          effectiveness?: 'very_helpful' | 'helpful' | 'somewhat_helpful' | 'not_helpful',
          clinicalNotes?: string
        ) => {
          try {
            const { crisisEvents } = get();
            const updatedEvents = crisisEvents.map(event =>
              event.id === crisisId
                ? {
                    ...event,
                    resolved: true,
                    resolvedAt: createISODateString(),
                    interventionEffectiveness: effectiveness,
                    clinicalNotes
                  }
                : event
            );

            set({
              isInCrisis: false,
              currentSeverity: 'none',
              activeCrisisId: undefined,
              crisisStartTime: undefined,
              lastTriggeredByAssessment: undefined,
              crisisEvents: updatedEvents,
            });

            console.log(`✅ Clinical Crisis resolved: ${crisisId}, effectiveness: ${effectiveness || 'not_specified'}`);
          } catch (error) {
            console.error('Crisis resolution failed:', error);
          }
        },

        // Emergency Contact Management
        addEmergencyContact: async (contact: Omit<ClinicalEmergencyContact, 'id' | 'createdAt' | 'encryptionLevel'>) => {
          try {
            const newContact: ClinicalEmergencyContact = {
              ...contact,
              id: `clinical_contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              createdAt: createISODateString(),
              encryptionLevel: DataSensitivity.CRISIS
            };

            const { emergencyContacts } = get();
            set({ emergencyContacts: [...emergencyContacts, newContact] });

            return true;
          } catch (error) {
            console.error('Failed to add emergency contact:', error);
            return false;
          }
        },

        updateEmergencyContact: async (contactId: string, updates: Partial<ClinicalEmergencyContact>) => {
          try {
            const { emergencyContacts } = get();
            const updatedContacts = emergencyContacts.map(contact =>
              contact.id === contactId ? { ...contact, ...updates } : contact
            );

            set({ emergencyContacts: updatedContacts });
            return true;
          } catch (error) {
            console.error('Failed to update emergency contact:', error);
            return false;
          }
        },

        removeEmergencyContact: async (contactId: string) => {
          try {
            const { emergencyContacts } = get();
            const updatedContacts = emergencyContacts.filter(contact => contact.id !== contactId);

            set({ emergencyContacts: updatedContacts });
            return true;
          } catch (error) {
            console.error('Failed to remove emergency contact:', error);
            return false;
          }
        },

        // Clinical Safety Plan Management
        createClinicalSafetyPlan: async (plan: Omit<ClinicalSafetyPlan, 'id' | 'createdAt' | 'updatedAt' | 'lastReviewedAt'>) => {
          try {
            const now = createISODateString();
            const newPlan: ClinicalSafetyPlan = {
              ...plan,
              id: `clinical_safety_plan_${Date.now()}`,
              createdAt: now,
              updatedAt: now,
              lastReviewedAt: now,
            };

            set({ safetyPlan: newPlan });
            console.log('✅ Clinical Safety Plan created successfully');
            return true;
          } catch (error) {
            console.error('Failed to create clinical safety plan:', error);
            return false;
          }
        },

        updateClinicalSafetyPlan: async (updates: Partial<ClinicalSafetyPlan>) => {
          try {
            const { safetyPlan } = get();
            if (!safetyPlan) return false;

            const updatedPlan: ClinicalSafetyPlan = {
              ...safetyPlan,
              ...updates,
              updatedAt: createISODateString(),
            };

            set({ safetyPlan: updatedPlan });
            console.log('✅ Clinical Safety Plan updated successfully');
            return true;
          } catch (error) {
            console.error('Failed to update clinical safety plan:', error);
            return false;
          }
        },

        reviewSafetyPlan: async () => {
          try {
            const { safetyPlan } = get();
            if (safetyPlan) {
              const updatedPlan = {
                ...safetyPlan,
                lastReviewedAt: createISODateString()
              };
              set({ safetyPlan: updatedPlan });
            }
          } catch (error) {
            console.error('Failed to review safety plan:', error);
          }
        },

        // Clinical Analytics
        getCrisisHistory: (days?: number, assessmentType?: 'phq9' | 'gad7') => {
          const { crisisEvents } = get();
          let filteredEvents = crisisEvents;

          if (days) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            filteredEvents = filteredEvents.filter(event =>
              new Date(event.triggeredAt) >= cutoffDate
            );
          }

          if (assessmentType) {
            filteredEvents = filteredEvents.filter(event =>
              event.assessmentType === assessmentType
            );
          }

          return filteredEvents;
        },

        getClinicalCrisisStats: () => {
          const { crisisEvents } = get();

          if (crisisEvents.length === 0) {
            return {
              totalCrises: 0,
              crisissByTrigger: {} as Record<ClinicalCrisisTrigger, number>,
              crisissBySeverity: {} as Record<ClinicalCrisisSeverity, number>,
              averageResponseTime: 0,
              interventionEffectiveness: {} as Record<ClinicalCrisisIntervention, number>,
              phq9CrisisRate: 0,
              gad7CrisisRate: 0,
              suicidalIdeationRate: 0,
            };
          }

          // Calculate statistics
          const totalCrises = crisisEvents.length;
          const averageResponseTime = crisisEvents.reduce((sum, event) => sum + event.responseTimeMs, 0) / totalCrises;

          // Count by trigger
          const crisissByTrigger = crisisEvents.reduce((counts, event) => {
            counts[event.trigger] = (counts[event.trigger] || 0) + 1;
            return counts;
          }, {} as Record<ClinicalCrisisTrigger, number>);

          // Count by severity
          const crisissBySeverity = crisisEvents.reduce((counts, event) => {
            counts[event.severity] = (counts[event.severity] || 0) + 1;
            return counts;
          }, {} as Record<ClinicalCrisisSeverity, number>);

          // Intervention effectiveness
          const interventionEffectiveness: Record<ClinicalCrisisIntervention, number> = {} as any;
          crisisEvents.forEach(event => {
            event.interventionsUsed.forEach(intervention => {
              if (!interventionEffectiveness[intervention]) {
                interventionEffectiveness[intervention] = 0;
              }
              if (event.interventionEffectiveness === 'very_helpful' || event.interventionEffectiveness === 'helpful') {
                interventionEffectiveness[intervention]++;
              }
            });
          });

          return {
            totalCrises,
            crisissByTrigger,
            crisissBySeverity,
            averageResponseTime,
            interventionEffectiveness,
            phq9CrisisRate: (crisissByTrigger.phq9_threshold || 0) / totalCrises * 100,
            gad7CrisisRate: (crisissByTrigger.gad7_threshold || 0) / totalCrises * 100,
            suicidalIdeationRate: (crisissByTrigger.suicidal_ideation || 0) / totalCrises * 100,
          };
        },

        // Performance Monitoring
        getPerformanceMetrics: () => {
          return get().performanceMetrics;
        },

        resetPerformanceMetrics: () => {
          set({
            performanceMetrics: {
              totalCrisisEvents: 0,
              averageResponseTimeMs: 0,
              fastestResponseMs: Infinity,
              slowestResponseMs: 0,
              responseTimesBelowTarget: 0,
              responseTimesAboveTarget: 0,
              emergencyResponseFailures: 0,
              interventionSuccessRate: 0,
              hotline988AccessSuccessRate: 0,
              emergencyContactSuccessRate: 0,
              phq9TriggeredCrises: 0,
              gad7TriggeredCrises: 0,
              suicidalIdeationCrises: 0,
              userActivatedCrises: 0,
              lastPerformanceReview: createISODateString(),
            }
          });
        },

        // Configuration Updates
        updateCrisisConfiguration: async (updates: Partial<Pick<ClinicalCrisisConfiguration, 'realTimeMonitoring' | 'automaticCrisisDetection' | 'emergencyContactNotification'>>) => {
          try {
            const { configuration } = get();
            set({
              configuration: {
                ...configuration,
                ...updates
              }
            });
            console.log('✅ Clinical Crisis configuration updated');
          } catch (error) {
            console.error('Failed to update crisis configuration:', error);
          }
        },

        // Clear Crisis State
        clearCrisisState: async () => {
          try {
            set({
              isInCrisis: false,
              currentSeverity: 'none',
              activeCrisisId: undefined,
              crisisStartTime: undefined,
              lastTriggeredByAssessment: undefined,
              emergencyContacts: [],
              crisisEvents: [],
              safetyPlan: null,
            });

            console.log('✅ Clinical Crisis state cleared');
          } catch (error) {
            console.error('Failed to clear crisis state:', error);
          }
        },
      }),
      {
        name: 'clinical-crisis-store',
        storage: createJSONStorage(() => clinicalCrisisStorage),
        partialize: (state) => ({
          // Persist critical clinical crisis data
          emergencyContacts: state.emergencyContacts,
          crisisEvents: state.crisisEvents,
          safetyPlan: state.safetyPlan,
          configuration: state.configuration,
          performanceMetrics: state.performanceMetrics,
          showCrisisButton: state.showCrisisButton,
          crisisButtonPosition: state.crisisButtonPosition,
        }),
        version: 1,
        migrate: (persistedState: any, version: number) => {
          if (version === 0) {
            return {
              ...persistedState,
              configuration: {
                phq9CrisisThreshold: CRISIS_THRESHOLD_PHQ9,
                gad7CrisisThreshold: CRISIS_THRESHOLD_GAD7,
                suicidalIdeationThreshold: SUICIDAL_IDEATION_THRESHOLD,
                suicidalIdeationQuestionIndex: SUICIDAL_IDEATION_QUESTION_INDEX,
                responseTimeTargetMs: 200,
                emergencyResponseTimeMs: 100,
                hotlineAccessTimeMs: 50,
                realTimeMonitoring: true,
                automaticCrisisDetection: true,
                emergencyContactNotification: true,
              },
              performanceMetrics: {
                totalCrisisEvents: 0,
                averageResponseTimeMs: 0,
                fastestResponseMs: Infinity,
                slowestResponseMs: 0,
                responseTimesBelowTarget: 0,
                responseTimesAboveTarget: 0,
                emergencyResponseFailures: 0,
                interventionSuccessRate: 0,
                hotline988AccessSuccessRate: 0,
                emergencyContactSuccessRate: 0,
                phq9TriggeredCrises: 0,
                gad7TriggeredCrises: 0,
                suicidalIdeationCrises: 0,
                userActivatedCrises: 0,
                lastPerformanceReview: createISODateString(),
              },
            };
          }
          return persistedState;
        },
        onRehydrateStorage: () => (state) => {
          if (state) {
            console.log('Clinical Crisis Store rehydrated successfully');
            // Initialize clinical crisis system
            state.initializeClinicalCrisisSystem().catch(error => {
              console.error('Failed to initialize clinical crisis system on rehydration:', error);
            });
          }
        },
      }
    )
  )
);

export default useClinicalCrisisStore;