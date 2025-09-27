/**
 * Crisis Prevention Service - Early warning systems and safety planning
 * CRITICAL: Proactive crisis prevention and user empowerment for self-management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { encryptionService, DataSensitivity } from './security';
import CrisisResponseMonitor from './CrisisResponseMonitor';
import { useCrisisStore, CrisisSeverity } from '../store/crisisStore';
import { useAssessmentStore } from '../store/assessmentStore';
import {
  ISODateString,
  createISODateString,
  AssessmentID,
  PHQ9Score,
  GAD7Score
} from '../types/clinical';

// Early Warning System Types
export interface WarningSign {
  id: string;
  type: 'behavioral' | 'emotional' | 'physical' | 'cognitive' | 'social';
  description: string;
  severity: 'mild' | 'moderate' | 'severe';
  userDefined: boolean;
  frequency: number; // How often this appears before crisis
  lastObserved?: ISODateString;
}

export interface TriggerEvent {
  id: string;
  name: string;
  category: 'life_event' | 'relationship' | 'work' | 'health' | 'financial' | 'anniversary' | 'other';
  severity: 'low' | 'medium' | 'high';
  description?: string;
  coping_strategies: string[];
  userDefined: boolean;
}

export interface SafetyPlanElement {
  id: string;
  type: 'warning_signs' | 'coping_strategies' | 'social_contacts' | 'professional_help' | 'environment_safety' | 'reasons_to_live';
  content: string[];
  priority: number;
  createdAt: ISODateString;
  lastUpdated: ISODateString;
  effectiveness?: number; // 1-5 user rating
}

export interface CrisisPreventionPlan {
  id: string;
  userId?: string;
  createdAt: ISODateString;
  lastUpdated: ISODateString;
  isActive: boolean;

  // Early Warning System
  personalWarningSign: WarningSign[];
  triggerEvents: TriggerEvent[];

  // Safety Plan Components
  safetyElements: SafetyPlanElement[];

  // Emergency Protocols
  emergencyContacts: {
    primary: { name: string; phone: string; relationship: string; };
    secondary?: { name: string; phone: string; relationship: string; };
    professional?: { name: string; phone: string; type: 'therapist' | 'psychiatrist' | 'doctor'; };
  };

  // Environmental Safety
  environmentalMeasures: {
    meansRestriction: string[]; // Safety measures taken
    safeLocations: string[]; // Places to go when in crisis
    unsafeLocations: string[]; // Places to avoid
  };

  // Recovery Tools
  copingToolkit: {
    immediate: string[]; // For acute distress
    shortTerm: string[]; // For ongoing challenges
    longTerm: string[]; // For sustained recovery
  };

  // Reasons for Living
  reasonsToLive: string[];

  // Plan Settings
  settings: {
    dailyCheckIns: boolean;
    warningSignMonitoring: boolean;
    automaticCrisisDetection: boolean;
    shareWithSupports: boolean;
  };
}

export interface PreventionMetrics {
  planCreatedAt: ISODateString;
  lastPlanUpdate: ISODateString;
  timesSafetyPlanAccessed: number;
  copingStrategiesUsed: Record<string, number>;
  warningSignsIdentified: number;
  crisesPrevented: number;
  planEffectivenessRating: number; // 1-5
}

// Crisis Prevention Service
export class CrisisPreventionService {
  private static readonly PREVENTION_STORAGE_KEY = 'being_crisis_prevention_plan';
  private static readonly METRICS_STORAGE_KEY = 'being_prevention_metrics';
  private static readonly WARNING_SIGNS_KEY = 'being_warning_signs_monitoring';

  /**
   * Create comprehensive safety plan with user input
   */
  static async createSafetyPlan(planData: Partial<CrisisPreventionPlan>): Promise<string | null> {
    const startTime = performance.now();

    try {
      return await CrisisResponseMonitor.executeCrisisAction(
        'create-safety-plan',
        async () => {
          const now = createISODateString(new Date().toISOString());
          const planId = `safety_plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          const safetyPlan: CrisisPreventionPlan = {
            id: planId,
            createdAt: now,
            lastUpdated: now,
            isActive: true,
            personalWarningSign: planData.personalWarningSign || this.getDefaultWarningSign(),
            triggerEvents: planData.triggerEvents || [],
            safetyElements: planData.safetyElements || this.getDefaultSafetyElements(),
            emergencyContacts: planData.emergencyContacts || {
              primary: { name: '', phone: '', relationship: '' }
            },
            environmentalMeasures: planData.environmentalMeasures || {
              meansRestriction: [],
              safeLocations: [],
              unsafeLocations: []
            },
            copingToolkit: planData.copingToolkit || this.getDefaultCopingToolkit(),
            reasonsToLive: planData.reasonsToLive || [],
            settings: planData.settings || {
              dailyCheckIns: true,
              warningSignMonitoring: true,
              automaticCrisisDetection: true,
              shareWithSupports: false
            },
            ...planData
          };

          // Encrypt and store safety plan
          const encrypted = await encryptionService.encryptData(
            safetyPlan,
            DataSensitivity.CRISIS
          );

          await AsyncStorage.setItem(
            this.PREVENTION_STORAGE_KEY,
            JSON.stringify(encrypted)
          );

          // Initialize metrics
          const metrics: PreventionMetrics = {
            planCreatedAt: now,
            lastPlanUpdate: now,
            timesSafetyPlanAccessed: 0,
            copingStrategiesUsed: {},
            warningSignsIdentified: 0,
            crisesPrevented: 0,
            planEffectivenessRating: 0
          };

          await this.saveMetrics(metrics);

          // Integrate with crisis store
          const crisisStore = useCrisisStore.getState();
          await crisisStore.createCrisisPlan({
            warningSigns: safetyPlan.personalWarningSign.map(ws => ws.description),
            copingStrategies: safetyPlan.copingToolkit.immediate,
            safeEnvironment: safetyPlan.environmentalMeasures.safeLocations,
            reasonsToLive: safetyPlan.reasonsToLive,
            emergencyContacts: safetyPlan.emergencyContacts.primary ? [{
              id: 'primary',
              name: safetyPlan.emergencyContacts.primary.name,
              phone: safetyPlan.emergencyContacts.primary.phone,
              relationship: safetyPlan.emergencyContacts.primary.relationship,
              isPrimary: true
            }] : [],
            professionalContacts: safetyPlan.emergencyContacts.professional ? {
              therapist: safetyPlan.emergencyContacts.professional.type === 'therapist' ? {
                name: safetyPlan.emergencyContacts.professional.name,
                phone: safetyPlan.emergencyContacts.professional.phone
              } : undefined
            } : {},
            isActive: true
          });

          console.log('✅ Safety plan created successfully:', planId);
          return planId;
        }
      );
    } catch (error) {
      console.error('Failed to create safety plan:', error);
      return null;
    } finally {
      CrisisResponseMonitor.monitorSyncCrisisAction('create-safety-plan', startTime);
    }
  }

  /**
   * Load existing safety plan
   */
  static async loadSafetyPlan(): Promise<CrisisPreventionPlan | null> {
    try {
      const encryptedData = await AsyncStorage.getItem(this.PREVENTION_STORAGE_KEY);
      if (!encryptedData) return null;

      const decrypted = await encryptionService.decryptData(
        JSON.parse(encryptedData),
        DataSensitivity.CRISIS
      );

      return decrypted as CrisisPreventionPlan;
    } catch (error) {
      console.error('Failed to load safety plan:', error);
      return null;
    }
  }

  /**
   * Update safety plan
   */
  static async updateSafetyPlan(updates: Partial<CrisisPreventionPlan>): Promise<boolean> {
    try {
      const existingPlan = await this.loadSafetyPlan();
      if (!existingPlan) return false;

      const updatedPlan: CrisisPreventionPlan = {
        ...existingPlan,
        ...updates,
        lastUpdated: createISODateString(new Date().toISOString())
      };

      const encrypted = await encryptionService.encryptData(
        updatedPlan,
        DataSensitivity.CRISIS
      );

      await AsyncStorage.setItem(
        this.PREVENTION_STORAGE_KEY,
        JSON.stringify(encrypted)
      );

      // Update metrics
      const metrics = await this.loadMetrics();
      if (metrics) {
        metrics.lastPlanUpdate = updatedPlan.lastUpdated;
        await this.saveMetrics(metrics);
      }

      console.log('✅ Safety plan updated successfully');
      return true;
    } catch (error) {
      console.error('Failed to update safety plan:', error);
      return false;
    }
  }

  /**
   * Monitor warning signs in real-time
   */
  static async checkWarningSign(observedSigns: string[]): Promise<{
    riskLevel: 'low' | 'moderate' | 'high' | 'critical';
    matchedSigns: WarningSign[];
    recommendedActions: string[];
  }> {
    try {
      const safetyPlan = await this.loadSafetyPlan();
      if (!safetyPlan) {
        return {
          riskLevel: 'low',
          matchedSigns: [],
          recommendedActions: ['Create a safety plan to monitor warning signs']
        };
      }

      const matchedSigns = safetyPlan.personalWarningSign.filter(warningSign =>
        observedSigns.some(observed =>
          observed.toLowerCase().includes(warningSign.description.toLowerCase()) ||
          warningSign.description.toLowerCase().includes(observed.toLowerCase())
        )
      );

      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      const recommendedActions: string[] = [];

      if (matchedSigns.length > 0) {
        // Calculate risk level based on matched signs
        const severeSigns = matchedSigns.filter(sign => sign.severity === 'severe').length;
        const moderateSigns = matchedSigns.filter(sign => sign.severity === 'moderate').length;

        if (severeSigns >= 2 || matchedSigns.length >= 4) {
          riskLevel = 'critical';
          recommendedActions.push('Consider immediate crisis support');
          recommendedActions.push('Contact emergency services if feeling unsafe');
        } else if (severeSigns >= 1 || matchedSigns.length >= 3) {
          riskLevel = 'high';
          recommendedActions.push('Use immediate coping strategies');
          recommendedActions.push('Contact support person');
        } else if (moderateSigns >= 2 || matchedSigns.length >= 2) {
          riskLevel = 'moderate';
          recommendedActions.push('Practice coping skills');
          recommendedActions.push('Monitor closely');
        }

        // Add specific coping strategies from safety plan
        if (safetyPlan.copingToolkit.immediate.length > 0) {
          recommendedActions.push(`Try: ${safetyPlan.copingToolkit.immediate.slice(0, 2).join(', ')}`);
        }

        // Update metrics
        const metrics = await this.loadMetrics();
        if (metrics) {
          metrics.warningSignsIdentified += matchedSigns.length;
          await this.saveMetrics(metrics);
        }
      }

      return {
        riskLevel,
        matchedSigns,
        recommendedActions
      };

    } catch (error) {
      console.error('Warning sign check failed:', error);
      return {
        riskLevel: 'low',
        matchedSigns: [],
        recommendedActions: ['Unable to check warning signs - consider reaching out for support']
      };
    }
  }

  /**
   * Access safety plan during crisis
   */
  static async accessSafetyPlan(): Promise<{
    plan: CrisisPreventionPlan | null;
    quickAccess: {
      copingStrategies: string[];
      emergencyContacts: string[];
      reasonsToLive: string[];
      safeLocations: string[];
    };
  }> {
    const startTime = performance.now();

    try {
      const plan = await this.loadSafetyPlan();

      if (!plan) {
        return {
          plan: null,
          quickAccess: {
            copingStrategies: this.getEmergencyCopingStrategies(),
            emergencyContacts: ['988 - Crisis Lifeline', '911 - Emergency'],
            reasonsToLive: [],
            safeLocations: []
          }
        };
      }

      // Update access metrics
      const metrics = await this.loadMetrics();
      if (metrics) {
        metrics.timesSafetyPlanAccessed += 1;
        await this.saveMetrics(metrics);
      }

      const quickAccess = {
        copingStrategies: plan.copingToolkit.immediate.slice(0, 5),
        emergencyContacts: [
          plan.emergencyContacts.primary.name ?
            `${plan.emergencyContacts.primary.name} - ${plan.emergencyContacts.primary.phone}` :
            '988 - Crisis Lifeline',
          '911 - Emergency Services',
          ...(plan.emergencyContacts.professional ? [
            `${plan.emergencyContacts.professional.name} - ${plan.emergencyContacts.professional.phone}`
          ] : [])
        ],
        reasonsToLive: plan.reasonsToLive.slice(0, 5),
        safeLocations: plan.environmentalMeasures.safeLocations.slice(0, 3)
      };

      console.log('✅ Safety plan accessed during crisis');
      return { plan, quickAccess };

    } catch (error) {
      console.error('Failed to access safety plan:', error);
      return {
        plan: null,
        quickAccess: {
          copingStrategies: this.getEmergencyCopingStrategies(),
          emergencyContacts: ['988 - Crisis Lifeline', '911 - Emergency'],
          reasonsToLive: [],
          safeLocations: []
        }
      };
    } finally {
      CrisisResponseMonitor.monitorSyncCrisisAction('access-safety-plan', startTime);
    }
  }

  /**
   * Record coping strategy usage
   */
  static async recordCopingStrategyUse(strategy: string, effectiveness: number): Promise<void> {
    try {
      const metrics = await this.loadMetrics();
      if (metrics) {
        if (!metrics.copingStrategiesUsed[strategy]) {
          metrics.copingStrategiesUsed[strategy] = 0;
        }
        metrics.copingStrategiesUsed[strategy] += 1;

        // Update effectiveness if strategy is being tracked
        if (effectiveness >= 4) {
          metrics.crisesPrevented += 0.5; // Partial credit for effective coping
        }

        await this.saveMetrics(metrics);
        console.log(`Recorded coping strategy use: ${strategy}, effectiveness: ${effectiveness}`);
      }
    } catch (error) {
      console.error('Failed to record coping strategy use:', error);
    }
  }

  /**
   * Generate safety plan effectiveness report
   */
  static async getSafetyPlanReport(): Promise<{
    metrics: PreventionMetrics | null;
    effectiveness: 'low' | 'moderate' | 'high';
    recommendations: string[];
    mostUsedStrategies: Array<{ strategy: string; uses: number; }>;
  }> {
    try {
      const metrics = await this.loadMetrics();
      const plan = await this.loadSafetyPlan();

      if (!metrics || !plan) {
        return {
          metrics: null,
          effectiveness: 'low',
          recommendations: ['Create a safety plan to track effectiveness'],
          mostUsedStrategies: []
        };
      }

      // Calculate effectiveness
      let effectiveness: 'low' | 'moderate' | 'high' = 'low';
      if (metrics.timesSafetyPlanAccessed > 5 && metrics.planEffectivenessRating >= 4) {
        effectiveness = 'high';
      } else if (metrics.timesSafetyPlanAccessed > 2 && metrics.planEffectivenessRating >= 3) {
        effectiveness = 'moderate';
      }

      // Generate recommendations
      const recommendations: string[] = [];
      if (metrics.timesSafetyPlanAccessed === 0) {
        recommendations.push('Practice using your safety plan during calm moments');
      }
      if (Object.keys(metrics.copingStrategiesUsed).length < 3) {
        recommendations.push('Try different coping strategies to find what works best');
      }
      if (metrics.planEffectivenessRating < 3) {
        recommendations.push('Consider updating your safety plan with more effective strategies');
      }

      // Most used strategies
      const mostUsedStrategies = Object.entries(metrics.copingStrategiesUsed)
        .map(([strategy, uses]) => ({ strategy, uses }))
        .sort((a, b) => b.uses - a.uses)
        .slice(0, 5);

      return {
        metrics,
        effectiveness,
        recommendations,
        mostUsedStrategies
      };

    } catch (error) {
      console.error('Failed to generate safety plan report:', error);
      return {
        metrics: null,
        effectiveness: 'low',
        recommendations: ['Error generating report - contact support'],
        mostUsedStrategies: []
      };
    }
  }

  /**
   * Helper Methods
   */
  private static getDefaultWarningSign(): WarningSign[] {
    return [
      {
        id: 'ws1',
        type: 'emotional',
        description: 'Feeling hopeless or overwhelmed',
        severity: 'severe',
        userDefined: false,
        frequency: 2
      },
      {
        id: 'ws2',
        type: 'behavioral',
        description: 'Withdrawing from friends and family',
        severity: 'moderate',
        userDefined: false,
        frequency: 3
      },
      {
        id: 'ws3',
        type: 'cognitive',
        description: 'Having thoughts of self-harm',
        severity: 'severe',
        userDefined: false,
        frequency: 1
      },
      {
        id: 'ws4',
        type: 'physical',
        description: 'Significant changes in sleep or appetite',
        severity: 'moderate',
        userDefined: false,
        frequency: 4
      }
    ];
  }

  private static getDefaultSafetyElements(): SafetyPlanElement[] {
    const now = createISODateString(new Date().toISOString());
    return [
      {
        id: 'se1',
        type: 'warning_signs',
        content: ['Feeling hopeless', 'Withdrawing from others', 'Thoughts of self-harm'],
        priority: 1,
        createdAt: now,
        lastUpdated: now
      },
      {
        id: 'se2',
        type: 'coping_strategies',
        content: ['Deep breathing exercises', 'Call a friend', 'Go for a walk', 'Listen to music'],
        priority: 2,
        createdAt: now,
        lastUpdated: now
      }
    ];
  }

  private static getDefaultCopingToolkit() {
    return {
      immediate: [
        'Take 5 deep breaths',
        'Hold ice cubes in your hands',
        'Call 988 Crisis Lifeline',
        'Go to a safe, public place'
      ],
      shortTerm: [
        'Talk to a trusted friend',
        'Practice mindfulness meditation',
        'Write in a journal',
        'Exercise or go for a walk'
      ],
      longTerm: [
        'Maintain regular therapy appointments',
        'Build a support network',
        'Develop healthy routines',
        'Practice self-care activities'
      ]
    };
  }

  private static getEmergencyCopingStrategies(): string[] {
    return [
      'Call 988 Crisis Lifeline immediately',
      'Take slow, deep breaths',
      'Go to a safe place with other people',
      'Call a trusted friend or family member',
      'Use grounding: 5 things you see, 4 you hear, 3 you touch'
    ];
  }

  private static async loadMetrics(): Promise<PreventionMetrics | null> {
    try {
      const data = await AsyncStorage.getItem(this.METRICS_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load prevention metrics:', error);
      return null;
    }
  }

  private static async saveMetrics(metrics: PreventionMetrics): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.METRICS_STORAGE_KEY,
        JSON.stringify(metrics)
      );
    } catch (error) {
      console.error('Failed to save prevention metrics:', error);
    }
  }
}

export default CrisisPreventionService;