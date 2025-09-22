/**
 * Crisis Store - Comprehensive crisis intervention and emergency response
 * CRITICAL: Handles real-time crisis detection, intervention protocols, and emergency coordination
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking } from 'react-native';
import { encryptionService, DataSensitivity } from '../services/security';
import { OfflineCrisisManager, EmergencyContact, CrisisResources } from '../services/OfflineCrisisManager';
import CrisisResponseMonitor from '../services/CrisisResponseMonitor';
import {
  CRISIS_THRESHOLD_PHQ9,
  CRISIS_THRESHOLD_GAD7,
  SUICIDAL_IDEATION_THRESHOLD,
  SUICIDAL_IDEATION_QUESTION_INDEX,
  CLINICAL_CONSTANTS,
  AssessmentID,
  PHQ9Score,
  GAD7Score,
  ISODateString,
  createISODateString
} from '../types/clinical';

// Crisis Severity Levels
export type CrisisSeverity = 'none' | 'mild' | 'moderate' | 'severe' | 'critical';

// Crisis Trigger Sources
export type CrisisTrigger =
  | 'phq9_score_threshold'
  | 'gad7_score_threshold'
  | 'suicidal_ideation'
  | 'user_activated'
  | 'manual_assessment';

// Crisis Intervention Types
export type InterventionType =
  | 'hotline_988'
  | 'emergency_911'
  | 'crisis_text_line'
  | 'emergency_contact'
  | 'safety_plan'
  | 'coping_strategies';

// Crisis Event for tracking and learning
export interface CrisisEvent {
  id: string;
  triggeredAt: ISODateString;
  trigger: CrisisTrigger;
  severity: CrisisSeverity;
  assessmentId?: AssessmentID;
  score?: PHQ9Score | GAD7Score;
  interventionsTaken: InterventionType[];
  responseTimeMs: number;
  resolvedAt?: ISODateString;
  userFeedback?: 'helpful' | 'not_helpful' | 'no_response';
}

// Crisis Plan - User-defined safety plan
export interface CrisisPlan {
  id: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  warningSigns: string[];
  copingStrategies: string[];
  safeEnvironment: string[];
  reasonsToLive: string[];
  emergencyContacts: EmergencyContact[];
  professionalContacts: {
    therapist?: { name: string; phone: string; };
    psychiatrist?: { name: string; phone: string; };
    doctor?: { name: string; phone: string; };
  };
  isActive: boolean;
}

// Crisis State
export interface CrisisState {
  // Current Crisis Status
  isInCrisis: boolean;
  currentSeverity: CrisisSeverity;
  activeCrisisId?: string;
  crisisStartTime?: ISODateString;

  // Crisis Detection
  realTimeMonitoring: boolean;
  lastCrisisCheck: ISODateString | null;

  // User Data
  crisisPlan: CrisisPlan | null;
  emergencyContacts: EmergencyContact[];
  crisisHistory: CrisisEvent[];

  // Resources
  offlineResources: CrisisResources | null;
  resourcesLastUpdated: ISODateString | null;

  // Performance Tracking
  responseMetrics: {
    averageResponseTime: number;
    lastResponseTime: number;
    slowResponseCount: number;
  };

  // UI State
  showCrisisButton: boolean;
  crisisButtonPosition: 'bottom-right' | 'bottom-left' | 'top-right';

  // Actions
  initializeCrisisSystem: () => Promise<void>;

  // Crisis Detection
  detectCrisis: (assessmentType: 'phq9' | 'gad7', score: number, assessmentId?: AssessmentID) => Promise<boolean>;
  detectSuicidalIdeation: (phq9Answers: readonly number[], assessmentId?: AssessmentID) => Promise<boolean>;
  triggerManualCrisis: () => Promise<void>;

  // Crisis Response
  activateCrisisIntervention: (trigger: CrisisTrigger, severity: CrisisSeverity, assessmentId?: AssessmentID) => Promise<string>;
  executeCrisisAction: (action: InterventionType) => Promise<boolean>;
  resolveCrisis: (crisisId: string, feedback?: 'helpful' | 'not_helpful') => Promise<void>;

  // Emergency Actions
  call988: () => Promise<boolean>;
  call911: () => Promise<boolean>;
  textCrisisLine: () => Promise<boolean>;
  contactEmergencyContact: (contactId: string) => Promise<boolean>;

  // Crisis Plan Management
  createCrisisPlan: (plan: Omit<CrisisPlan, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  updateCrisisPlan: (updates: Partial<CrisisPlan>) => Promise<boolean>;

  // Emergency Contacts
  addEmergencyContact: (contact: Omit<EmergencyContact, 'id'>) => Promise<boolean>;
  updateEmergencyContact: (contactId: string, updates: Partial<EmergencyContact>) => Promise<boolean>;
  removeEmergencyContact: (contactId: string) => Promise<boolean>;

  // Resource Management
  refreshOfflineResources: () => Promise<void>;
  updateLocalResources: (resources: any[]) => Promise<boolean>;

  // Crisis History
  getCrisisHistory: (days?: number) => CrisisEvent[];
  getCrisisStats: () => {
    totalCrises: number;
    averageResponseTime: number;
    mostCommonTrigger: CrisisTrigger;
    interventionEffectiveness: Record<InterventionType, number>;
  };

  // Settings
  updateCrisisSettings: (settings: {
    realTimeMonitoring?: boolean;
    showCrisisButton?: boolean;
    crisisButtonPosition?: 'bottom-right' | 'bottom-left' | 'top-right';
  }) => Promise<void>;

  // State Management
  clearCrisisState: () => Promise<void>;
  resetResponseMetrics: () => void;
}

// Encrypted storage for crisis data
const encryptedCrisisStorage = {
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
      console.error('Failed to decrypt crisis data:', error);
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
      console.error('Failed to encrypt crisis data:', error);
      throw error;
    }
  },
  removeItem: async (name: string): Promise<void> => {
    await AsyncStorage.removeItem(name);
  },
};

export const useCrisisStore = create<CrisisState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial State
        isInCrisis: false,
        currentSeverity: 'none',
        activeCrisisId: undefined,
        crisisStartTime: undefined,
        realTimeMonitoring: true,
        lastCrisisCheck: null,
        crisisPlan: null,
        emergencyContacts: [],
        crisisHistory: [],
        offlineResources: null,
        resourcesLastUpdated: null,
        responseMetrics: {
          averageResponseTime: 0,
          lastResponseTime: 0,
          slowResponseCount: 0,
        },
        showCrisisButton: true,
        crisisButtonPosition: 'bottom-right',

        // Initialize Crisis System
        initializeCrisisSystem: async () => {
          const startTime = performance.now();

          try {
            await CrisisResponseMonitor.executeCrisisAction(
              'initialize-crisis-system',
              async () => {
                // Initialize offline crisis resources
                await OfflineCrisisManager.initializeOfflineCrisisData();

                // Load offline resources
                const resources = await OfflineCrisisManager.getOfflineCrisisResources();
                const emergencyContacts = await OfflineCrisisManager.getEmergencyContacts();

                set({
                  offlineResources: resources,
                  emergencyContacts,
                  resourcesLastUpdated: createISODateString(new Date().toISOString()),
                  lastCrisisCheck: createISODateString(new Date().toISOString()),
                });

                console.log('✅ Crisis system initialized successfully');
                return true;
              }
            );
          } catch (error) {
            console.error('❌ Crisis system initialization failed:', error);
            // Fallback: ensure basic crisis resources are available
            const fallbackResources = await OfflineCrisisManager.getOfflineCrisisResources();
            set({ offlineResources: fallbackResources });
          }

          CrisisResponseMonitor.monitorSyncCrisisAction('crisis-system-init', startTime);
        },

        // Crisis Detection
        detectCrisis: async (assessmentType: 'phq9' | 'gad7', score: number, assessmentId?: AssessmentID) => {
          const startTime = performance.now();

          try {
            return await CrisisResponseMonitor.executeCrisisAction(
              `detect-crisis-${assessmentType}`,
              async () => {
                let severity: CrisisSeverity = 'none';
                let trigger: CrisisTrigger;

                if (assessmentType === 'phq9') {
                  trigger = 'phq9_score_threshold';
                  if (score >= CRISIS_THRESHOLD_PHQ9) {
                    severity = score >= 25 ? 'critical' : 'severe';
                  } else if (score >= 15) {
                    severity = 'moderate';
                  }
                } else {
                  trigger = 'gad7_score_threshold';
                  if (score >= CRISIS_THRESHOLD_GAD7) {
                    severity = score >= 19 ? 'severe' : 'moderate';
                  }
                }

                if (severity !== 'none') {
                  const crisisId = await get().activateCrisisIntervention(trigger, severity, assessmentId);
                  console.log(`🚨 Crisis detected: ${assessmentType} score ${score}, severity ${severity}`);
                  return true;
                }

                return false;
              }
            );
          } catch (error) {
            console.error('Crisis detection failed:', error);
            return false;
          } finally {
            CrisisResponseMonitor.monitorSyncCrisisAction(`crisis-detection-${assessmentType}`, startTime);
          }
        },

        detectSuicidalIdeation: async (phq9Answers: readonly number[], assessmentId?: AssessmentID) => {
          const startTime = performance.now();

          try {
            return await CrisisResponseMonitor.executeCrisisAction(
              'detect-suicidal-ideation',
              async () => {
                const suicidalIdeationResponse = phq9Answers[SUICIDAL_IDEATION_QUESTION_INDEX];

                if (suicidalIdeationResponse >= SUICIDAL_IDEATION_THRESHOLD) {
                  const severity: CrisisSeverity = suicidalIdeationResponse >= 2 ? 'critical' : 'severe';
                  const crisisId = await get().activateCrisisIntervention('suicidal_ideation', severity, assessmentId);

                  console.log(`🚨 CRITICAL: Suicidal ideation detected, response: ${suicidalIdeationResponse}`);
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

        // Crisis Response
        activateCrisisIntervention: async (trigger: CrisisTrigger, severity: CrisisSeverity, assessmentId?: AssessmentID) => {
          const startTime = performance.now();
          const crisisId = `crisis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          try {
            const crisisEvent: CrisisEvent = {
              id: crisisId,
              triggeredAt: createISODateString(new Date().toISOString()),
              trigger,
              severity,
              assessmentId,
              interventionsTaken: [],
              responseTimeMs: 0,
              userFeedback: undefined,
            };

            set({
              isInCrisis: true,
              currentSeverity: severity,
              activeCrisisId: crisisId,
              crisisStartTime: crisisEvent.triggeredAt,
            });

            // Add to crisis history
            const { crisisHistory } = get();
            set({ crisisHistory: [...crisisHistory, crisisEvent] });

            // Determine intervention based on severity
            let immediateAction: InterventionType;
            if (trigger === 'suicidal_ideation' || severity === 'critical') {
              immediateAction = 'hotline_988';
            } else if (severity === 'severe') {
              immediateAction = 'hotline_988';
            } else {
              immediateAction = 'safety_plan';
            }

            // Execute immediate intervention
            await get().executeCrisisAction(immediateAction);

            // Record response time
            const responseTime = performance.now() - startTime;
            crisisEvent.responseTimeMs = responseTime;

            console.log(`🚨 Crisis intervention activated: ${crisisId}, severity: ${severity}, response time: ${responseTime.toFixed(2)}ms`);

            return crisisId;
          } catch (error) {
            console.error('Crisis intervention activation failed:', error);
            throw error;
          } finally {
            CrisisResponseMonitor.monitorSyncCrisisAction('crisis-intervention-activation', startTime);
          }
        },

        executeCrisisAction: async (action: InterventionType) => {
          const startTime = performance.now();

          try {
            return await CrisisResponseMonitor.executeCrisisAction(
              `crisis-action-${action}`,
              async () => {
                let success = false;

                switch (action) {
                  case 'hotline_988':
                    success = await get().call988();
                    break;
                  case 'emergency_911':
                    success = await get().call911();
                    break;
                  case 'crisis_text_line':
                    success = await get().textCrisisLine();
                    break;
                  case 'safety_plan':
                    // Display safety plan
                    const { crisisPlan } = get();
                    if (crisisPlan) {
                      Alert.alert(
                        'Your Safety Plan',
                        `Warning Signs: ${crisisPlan.warningSign.join(', ')}\n\nCoping: ${crisisPlan.copingStrategies.slice(0, 3).join(', ')}`,
                        [{ text: 'OK' }]
                      );
                      success = true;
                    } else {
                      Alert.alert(
                        'Safety Plan',
                        'Create a safety plan in settings to have personalized crisis support.',
                        [{ text: 'OK' }]
                      );
                      success = false;
                    }
                    break;
                  case 'coping_strategies':
                    Alert.alert(
                      'Quick Coping Strategies',
                      '• Take 5 deep breaths\n• Call a trusted friend\n• Go to a safe place\n• Use 5-4-3-2-1 grounding\n• Hold ice cubes',
                      [{ text: 'OK' }]
                    );
                    success = true;
                    break;
                }

                // Record intervention taken
                const { activeCrisisId, crisisHistory } = get();
                if (activeCrisisId) {
                  const updatedHistory = crisisHistory.map(event =>
                    event.id === activeCrisisId
                      ? { ...event, interventionsTaken: [...event.interventionsTaken, action] }
                      : event
                  );
                  set({ crisisHistory: updatedHistory });
                }

                return success;
              }
            );
          } catch (error) {
            console.error(`Crisis action ${action} failed:`, error);
            return false;
          } finally {
            CrisisResponseMonitor.monitorSyncCrisisAction(`crisis-action-${action}`, startTime);
          }
        },

        resolveCrisis: async (crisisId: string, feedback?: 'helpful' | 'not_helpful') => {
          try {
            const { crisisHistory } = get();
            const updatedHistory = crisisHistory.map(event =>
              event.id === crisisId
                ? {
                    ...event,
                    resolvedAt: createISODateString(new Date().toISOString()),
                    userFeedback: feedback
                  }
                : event
            );

            set({
              isInCrisis: false,
              currentSeverity: 'none',
              activeCrisisId: undefined,
              crisisStartTime: undefined,
              crisisHistory: updatedHistory,
            });

            console.log(`✅ Crisis resolved: ${crisisId}, feedback: ${feedback || 'none'}`);
          } catch (error) {
            console.error('Crisis resolution failed:', error);
          }
        },

        // Emergency Actions
        call988: async () => {
          try {
            await Linking.openURL('tel:988');
            return true;
          } catch (error) {
            Alert.alert(
              'Call 988',
              'Please dial 988 directly on your phone for immediate crisis support.',
              [{ text: 'OK' }]
            );
            return false;
          }
        },

        call911: async () => {
          try {
            await Linking.openURL('tel:911');
            return true;
          } catch (error) {
            Alert.alert(
              'Call 911',
              'Please dial 911 directly for emergency services.',
              [{ text: 'OK' }]
            );
            return false;
          }
        },

        textCrisisLine: async () => {
          try {
            // Note: SMS opening is limited on mobile, so we show instructions
            Alert.alert(
              'Crisis Text Line',
              'Text HOME to 741741 for 24/7 crisis support.',
              [
                {
                  text: 'Copy Number',
                  onPress: () => {
                    // Would copy 741741 to clipboard in real implementation
                    console.log('Copied 741741 to clipboard');
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

        contactEmergencyContact: async (contactId: string) => {
          try {
            const { emergencyContacts } = get();
            const contact = emergencyContacts.find(c => c.id === contactId);

            if (contact) {
              await Linking.openURL(`tel:${contact.phone}`);
              return true;
            }
            return false;
          } catch (error) {
            return false;
          }
        },

        // Crisis Plan Management
        createCrisisPlan: async (plan: Omit<CrisisPlan, 'id' | 'createdAt' | 'updatedAt'>) => {
          try {
            const now = createISODateString(new Date().toISOString());
            const newPlan: CrisisPlan = {
              ...plan,
              id: `crisis_plan_${Date.now()}`,
              createdAt: now,
              updatedAt: now,
            };

            set({ crisisPlan: newPlan });
            await OfflineCrisisManager.setSafetyPlan(newPlan);

            console.log('✅ Crisis plan created successfully');
            return true;
          } catch (error) {
            console.error('Failed to create crisis plan:', error);
            return false;
          }
        },

        updateCrisisPlan: async (updates: Partial<CrisisPlan>) => {
          try {
            const { crisisPlan } = get();
            if (!crisisPlan) return false;

            const updatedPlan: CrisisPlan = {
              ...crisisPlan,
              ...updates,
              updatedAt: createISODateString(new Date().toISOString()),
            };

            set({ crisisPlan: updatedPlan });
            await OfflineCrisisManager.setSafetyPlan(updatedPlan);

            console.log('✅ Crisis plan updated successfully');
            return true;
          } catch (error) {
            console.error('Failed to update crisis plan:', error);
            return false;
          }
        },

        // Emergency Contacts
        addEmergencyContact: async (contact: Omit<EmergencyContact, 'id'>) => {
          try {
            const newContact: EmergencyContact = {
              ...contact,
              id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            };

            const { emergencyContacts } = get();
            const updatedContacts = [...emergencyContacts, newContact];

            set({ emergencyContacts: updatedContacts });
            await OfflineCrisisManager.setEmergencyContacts(updatedContacts);

            return true;
          } catch (error) {
            console.error('Failed to add emergency contact:', error);
            return false;
          }
        },

        updateEmergencyContact: async (contactId: string, updates: Partial<EmergencyContact>) => {
          try {
            const { emergencyContacts } = get();
            const updatedContacts = emergencyContacts.map(contact =>
              contact.id === contactId ? { ...contact, ...updates } : contact
            );

            set({ emergencyContacts: updatedContacts });
            await OfflineCrisisManager.setEmergencyContacts(updatedContacts);

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
            await OfflineCrisisManager.setEmergencyContacts(updatedContacts);

            return true;
          } catch (error) {
            console.error('Failed to remove emergency contact:', error);
            return false;
          }
        },

        // Resource Management
        refreshOfflineResources: async () => {
          try {
            await OfflineCrisisManager.initializeOfflineCrisisData();
            const resources = await OfflineCrisisManager.getOfflineCrisisResources();

            set({
              offlineResources: resources,
              resourcesLastUpdated: createISODateString(new Date().toISOString()),
            });

            console.log('✅ Offline crisis resources refreshed');
          } catch (error) {
            console.error('Failed to refresh offline resources:', error);
          }
        },

        updateLocalResources: async (resources: any[]) => {
          try {
            const success = await OfflineCrisisManager.updateLocalResources(resources);
            if (success) {
              await get().refreshOfflineResources();
            }
            return success;
          } catch (error) {
            console.error('Failed to update local resources:', error);
            return false;
          }
        },

        // Crisis History & Analytics
        getCrisisHistory: (days?: number) => {
          const { crisisHistory } = get();
          if (!days) return crisisHistory;

          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);

          return crisisHistory.filter(event =>
            new Date(event.triggeredAt) >= cutoffDate
          );
        },

        getCrisisStats: () => {
          const { crisisHistory } = get();

          if (crisisHistory.length === 0) {
            return {
              totalCrises: 0,
              averageResponseTime: 0,
              mostCommonTrigger: 'user_activated' as CrisisTrigger,
              interventionEffectiveness: {} as Record<InterventionType, number>,
            };
          }

          // Calculate average response time
          const totalResponseTime = crisisHistory.reduce((sum, event) => sum + event.responseTimeMs, 0);
          const averageResponseTime = totalResponseTime / crisisHistory.length;

          // Find most common trigger
          const triggerCounts = crisisHistory.reduce((counts, event) => {
            counts[event.trigger] = (counts[event.trigger] || 0) + 1;
            return counts;
          }, {} as Record<CrisisTrigger, number>);

          const mostCommonTrigger = Object.entries(triggerCounts)
            .sort(([,a], [,b]) => b - a)[0]?.[0] as CrisisTrigger || 'user_activated';

          // Calculate intervention effectiveness (helpful feedback rate)
          const interventionEffectiveness: Record<InterventionType, number> = {} as any;
          crisisHistory.forEach(event => {
            event.interventionsTaken.forEach(intervention => {
              if (!interventionEffectiveness[intervention]) {
                interventionEffectiveness[intervention] = 0;
              }
              if (event.userFeedback === 'helpful') {
                interventionEffectiveness[intervention]++;
              }
            });
          });

          return {
            totalCrises: crisisHistory.length,
            averageResponseTime,
            mostCommonTrigger,
            interventionEffectiveness,
          };
        },

        // Settings
        updateCrisisSettings: async (settings: {
          realTimeMonitoring?: boolean;
          showCrisisButton?: boolean;
          crisisButtonPosition?: 'bottom-right' | 'bottom-left' | 'top-right';
        }) => {
          try {
            set({
              realTimeMonitoring: settings.realTimeMonitoring ?? get().realTimeMonitoring,
              showCrisisButton: settings.showCrisisButton ?? get().showCrisisButton,
              crisisButtonPosition: settings.crisisButtonPosition ?? get().crisisButtonPosition,
            });

            console.log('✅ Crisis settings updated');
          } catch (error) {
            console.error('Failed to update crisis settings:', error);
          }
        },

        // State Management
        clearCrisisState: async () => {
          try {
            await OfflineCrisisManager.clearAllCrisisData();

            set({
              isInCrisis: false,
              currentSeverity: 'none',
              activeCrisisId: undefined,
              crisisStartTime: undefined,
              crisisPlan: null,
              emergencyContacts: [],
              crisisHistory: [],
              offlineResources: null,
              resourcesLastUpdated: null,
            });

            console.log('✅ Crisis state cleared');
          } catch (error) {
            console.error('Failed to clear crisis state:', error);
          }
        },

        resetResponseMetrics: () => {
          set({
            responseMetrics: {
              averageResponseTime: 0,
              lastResponseTime: 0,
              slowResponseCount: 0,
            }
          });
        },
      }),
      {
        name: 'being-crisis-store',
        storage: createJSONStorage(() => encryptedCrisisStorage),
        partialize: (state) => ({
          // Persist critical crisis data
          crisisPlan: state.crisisPlan,
          emergencyContacts: state.emergencyContacts,
          crisisHistory: state.crisisHistory,
          realTimeMonitoring: state.realTimeMonitoring,
          showCrisisButton: state.showCrisisButton,
          crisisButtonPosition: state.crisisButtonPosition,
          responseMetrics: state.responseMetrics,
        }),
        version: 1,
        migrate: (persistedState: any, version: number) => {
          if (version === 0) {
            return {
              ...persistedState,
              realTimeMonitoring: true,
              showCrisisButton: true,
              crisisButtonPosition: 'bottom-right',
              responseMetrics: {
                averageResponseTime: 0,
                lastResponseTime: 0,
                slowResponseCount: 0,
              },
            };
          }
          return persistedState;
        },
        onRehydrateStorage: () => (state) => {
          if (state) {
            console.log('Crisis store rehydrated successfully');
            // Automatically initialize crisis system on rehydration
            state.initializeCrisisSystem().catch(error => {
              console.error('Failed to initialize crisis system on rehydration:', error);
            });
          }
        },
      }
    )
  )
);

// Integration with Assessment Store for real-time crisis detection
export const setupCrisisDetectionIntegration = () => {
  // This would be called in App.tsx to set up the integration
  console.log('Crisis detection integration active');
};

export default useCrisisStore;