/**
 * Crisis Intervention Manager - Central orchestration of all crisis systems
 * CRITICAL: Coordinates real-time detection, intervention protocols, and emergency response
 */

import { Alert, Linking } from 'react-native';
import CrisisResponseMonitor from './CrisisResponseMonitor';
import crisisDetectionService, { CrisisDetectionResult } from './CrisisDetectionService';
import CrisisPreventionService from './CrisisPreventionService';
import { OfflineCrisisManager } from './OfflineCrisisManager';
import { useCrisisStore, CrisisSeverity, CrisisTrigger, InterventionType } from '../store/crisisStore';
import { useAssessmentStore } from '../store/assessmentStore';
import {
  CRISIS_THRESHOLD_PHQ9,
  CRISIS_THRESHOLD_GAD7,
  SUICIDAL_IDEATION_THRESHOLD,
  CLINICAL_CONSTANTS,
  AssessmentID,
  PHQ9Score,
  GAD7Score,
  PHQ9Answers,
  GAD7Answers,
  ISODateString,
  createISODateString
} from '../types/clinical';

// Crisis Intervention Orchestration
export interface CrisisInterventionPlan {
  interventionId: string;
  severity: CrisisSeverity;
  trigger: CrisisTrigger;
  immediateActions: InterventionType[];
  followUpActions: InterventionType[];
  timelineMinutes: number;
  escalationTriggers: string[];
  successCriteria: string[];
}

export interface InterventionStatus {
  isActive: boolean;
  interventionId?: string;
  startTime?: ISODateString;
  currentPhase: 'detection' | 'immediate' | 'stabilization' | 'follow_up' | 'resolved';
  actionsCompleted: InterventionType[];
  nextAction?: InterventionType;
  timeRemaining?: number;
}

export interface CrisisMetrics {
  totalInterventions: number;
  averageResponseTime: number;
  interventionSuccess_rate: number;
  mostEffectiveActions: InterventionType[];
  escalationRate: number;
  preventionSuccess_rate: number;
}

// Crisis Intervention Manager - Central Controller
export class CrisisInterventionManager {
  private static instance: CrisisInterventionManager;
  private interventionCallbacks: Set<(status: InterventionStatus) => void> = new Set();
  private currentIntervention: InterventionStatus | null = null;
  private interventionHistory: InterventionStatus[] = [];
  private emergencyOverride = false;

  private constructor() {
    this.initializeInterventionSystem();
  }

  static getInstance(): CrisisInterventionManager {
    if (!CrisisInterventionManager.instance) {
      CrisisInterventionManager.instance = new CrisisInterventionManager();
    }
    return CrisisInterventionManager.instance;
  }

  /**
   * Initialize comprehensive crisis intervention system
   */
  private async initializeInterventionSystem(): Promise<void> {
    try {
      console.log('🚨 Initializing Crisis Intervention Manager...');

      // Initialize all crisis subsystems
      await this.initializeSubsystems();

      // Set up real-time crisis detection monitoring
      this.setupCrisisDetectionMonitoring();

      // Set up offline crisis resources
      await this.ensureOfflineResources();

      console.log('✅ Crisis Intervention Manager initialized successfully');
    } catch (error) {
      console.error('❌ Crisis Intervention Manager initialization failed:', error);
      // Continue with limited functionality
    }
  }

  /**
   * Initialize all crisis subsystems
   */
  private async initializeSubsystems(): Promise<void> {
    const startTime = performance.now();

    try {
      await CrisisResponseMonitor.executeCrisisAction(
        'initialize-crisis-subsystems',
        async () => {
          // Initialize crisis store
          const crisisStore = useCrisisStore.getState();
          await crisisStore.initializeCrisisSystem();

          // Initialize offline crisis manager
          await OfflineCrisisManager.initializeOfflineCrisisData();

          // Initialize crisis detection service
          crisisDetectionService.setMonitoringActive(true);

          return true;
        }
      );
    } catch (error) {
      console.error('Crisis subsystem initialization failed:', error);
      throw error;
    } finally {
      CrisisResponseMonitor.monitorSyncCrisisAction('init-crisis-subsystems', startTime);
    }
  }

  /**
   * Set up real-time crisis detection monitoring
   */
  private setupCrisisDetectionMonitoring(): void {
    // Monitor for crisis detection events
    crisisDetectionService.onCrisisDetection(async (result: CrisisDetectionResult) => {
      if (result.isCrisis) {
        await this.handleCrisisDetection(result);
      }
    });

    console.log('🔍 Crisis detection monitoring active');
  }

  /**
   * Ensure offline crisis resources are available
   */
  private async ensureOfflineResources(): Promise<void> {
    try {
      const resourcesAvailable = await OfflineCrisisManager.isCrisisDataCurrent();
      if (!resourcesAvailable) {
        await OfflineCrisisManager.initializeOfflineCrisisData();
        console.log('📱 Offline crisis resources updated');
      }
    } catch (error) {
      console.error('Failed to ensure offline resources:', error);
    }
  }

  /**
   * Handle detected crisis with comprehensive intervention
   */
  private async handleCrisisDetection(result: CrisisDetectionResult): Promise<void> {
    const startTime = performance.now();

    try {
      await CrisisResponseMonitor.executeCrisisAction(
        'handle-crisis-detection',
        async () => {
          // Create intervention plan based on detection result
          const plan = this.createInterventionPlan(result);

          // Start intervention
          await this.startIntervention(plan);

          return true;
        }
      );
    } catch (error) {
      console.error('Crisis detection handling failed:', error);
      // Fallback to emergency protocols
      await this.emergencyFallback(result);
    } finally {
      CrisisResponseMonitor.monitorSyncCrisisAction('handle-crisis-detection', startTime);
    }
  }

  /**
   * Create intervention plan based on crisis detection
   */
  private createInterventionPlan(result: CrisisDetectionResult): CrisisInterventionPlan {
    const interventionId = `intervention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    let plan: CrisisInterventionPlan;

    if (result.trigger === 'suicidal_ideation' || result.severity === 'critical') {
      // IMMEDIATE CRISIS INTERVENTION
      plan = {
        interventionId,
        severity: 'critical' as CrisisSeverity,
        trigger: result.trigger === 'suicidal_ideation' ? 'suicidal_ideation' :
                 result.metadata.assessmentType === 'phq9' ? 'phq9_score_threshold' : 'gad7_score_threshold',
        immediateActions: ['hotline_988', 'crisis_text_line', 'emergency_contact'],
        followUpActions: ['safety_plan', 'coping_strategies'],
        timelineMinutes: 5,
        escalationTriggers: ['no_response_2min', 'user_distress_increase'],
        successCriteria: ['user_engagement', 'safety_confirmed']
      };
    } else if (result.severity === 'severe') {
      // URGENT INTERVENTION
      plan = {
        interventionId,
        severity: 'severe' as CrisisSeverity,
        trigger: result.metadata.assessmentType === 'phq9' ? 'phq9_score_threshold' : 'gad7_score_threshold',
        immediateActions: ['hotline_988', 'safety_plan'],
        followUpActions: ['coping_strategies', 'emergency_contact'],
        timelineMinutes: 10,
        escalationTriggers: ['no_improvement_5min', 'symptoms_worsen'],
        successCriteria: ['coping_activated', 'support_contacted']
      };
    } else {
      // MODERATE INTERVENTION
      plan = {
        interventionId,
        severity: 'moderate' as CrisisSeverity,
        trigger: result.metadata.assessmentType === 'phq9' ? 'phq9_score_threshold' : 'gad7_score_threshold',
        immediateActions: ['safety_plan', 'coping_strategies'],
        followUpActions: ['emergency_contact', 'hotline_988'],
        timelineMinutes: 15,
        escalationTriggers: ['crisis_worsens', 'coping_ineffective'],
        successCriteria: ['stabilization_achieved', 'resources_accessed']
      };
    }

    return plan;
  }

  /**
   * Start comprehensive crisis intervention
   */
  private async startIntervention(plan: CrisisInterventionPlan): Promise<void> {
    const startTime = performance.now();

    try {
      // Set intervention status
      this.currentIntervention = {
        isActive: true,
        interventionId: plan.interventionId,
        startTime: createISODateString(new Date().toISOString()),
        currentPhase: 'immediate',
        actionsCompleted: [],
        nextAction: plan.immediateActions[0],
        timeRemaining: plan.timelineMinutes
      };

      // Notify callbacks
      this.notifyInterventionCallbacks();

      // Execute immediate actions
      await this.executeInterventionPhase(plan, 'immediate');

      // Record intervention
      const crisisStore = useCrisisStore.getState();
      await crisisStore.activateCrisisIntervention(plan.trigger, plan.severity);

      console.log(`🚨 Crisis intervention started: ${plan.interventionId}, severity: ${plan.severity}`);

    } catch (error) {
      console.error('Failed to start intervention:', error);
      await this.emergencyFallback();
    } finally {
      CrisisResponseMonitor.monitorSyncCrisisAction('start-intervention', startTime);
    }
  }

  /**
   * Execute intervention phase (immediate, stabilization, follow-up)
   */
  private async executeInterventionPhase(
    plan: CrisisInterventionPlan,
    phase: 'immediate' | 'stabilization' | 'follow_up'
  ): Promise<void> {

    const actions = phase === 'immediate' ? plan.immediateActions :
                   phase === 'stabilization' ? [] : // Add stabilization actions if needed
                   plan.followUpActions;

    for (const action of actions) {
      try {
        await this.executeInterventionAction(action, plan.severity);

        // Update intervention status
        if (this.currentIntervention) {
          this.currentIntervention.actionsCompleted.push(action);
          this.currentIntervention.currentPhase = phase;
          this.notifyInterventionCallbacks();
        }

      } catch (error) {
        console.error(`Intervention action failed: ${action}`, error);
        // Continue with next action - don't let one failure stop intervention
      }
    }
  }

  /**
   * Execute specific intervention action
   */
  private async executeInterventionAction(action: InterventionType, severity: CrisisSeverity): Promise<void> {
    const startTime = performance.now();

    try {
      await CrisisResponseMonitor.executeCrisisAction(
        `intervention-action-${action}`,
        async () => {
          const crisisStore = useCrisisStore.getState();

          switch (action) {
            case 'hotline_988':
              await this.executeHotlineIntervention(severity);
              break;

            case 'emergency_911':
              await crisisStore.call911();
              break;

            case 'crisis_text_line':
              await crisisStore.textCrisisLine();
              break;

            case 'emergency_contact':
              await this.executeEmergencyContactIntervention();
              break;

            case 'safety_plan':
              await this.executeSafetyPlanIntervention();
              break;

            case 'coping_strategies':
              await this.executeCopingStrategiesIntervention();
              break;

            default:
              console.warn(`Unknown intervention action: ${action}`);
          }

          return true;
        }
      );
    } catch (error) {
      console.error(`Intervention action ${action} failed:`, error);
      throw error;
    } finally {
      CrisisResponseMonitor.monitorSyncCrisisAction(`intervention-action-${action}`, startTime);
    }
  }

  /**
   * Execute 988 hotline intervention with context
   */
  private async executeHotlineIntervention(severity: CrisisSeverity): Promise<void> {
    const crisisStore = useCrisisStore.getState();

    if (severity === 'critical') {
      // IMMEDIATE 988 call for critical situations
      Alert.alert(
        'IMMEDIATE CRISIS SUPPORT',
        'You indicated thoughts of self-harm. Crisis counselors are standing by to help.',
        [
          {
            text: 'Call 988 Now',
            onPress: async () => {
              await crisisStore.call988();
            },
            style: 'default'
          },
          {
            text: 'Text Crisis Line',
            onPress: async () => {
              await crisisStore.textCrisisLine();
            }
          },
          {
            text: 'Emergency Services',
            onPress: async () => {
              await crisisStore.call911();
            }
          }
        ],
        { cancelable: false }
      );
    } else {
      // Standard crisis support offering
      Alert.alert(
        'Crisis Support Available',
        'Your responses suggest you might benefit from crisis support. Trained counselors are available 24/7.',
        [
          {
            text: 'Call 988',
            onPress: async () => {
              await crisisStore.call988();
            }
          },
          {
            text: 'Safety Resources',
            onPress: async () => {
              await this.executeSafetyPlanIntervention();
            }
          },
          {
            text: 'Continue',
            style: 'cancel'
          }
        ]
      );
    }
  }

  /**
   * Execute emergency contact intervention
   */
  private async executeEmergencyContactIntervention(): Promise<void> {
    const crisisStore = useCrisisStore.getState();
    const emergencyContacts = crisisStore.emergencyContacts;

    if (emergencyContacts.length > 0) {
      const primaryContact = emergencyContacts.find(c => c.isPrimary) || emergencyContacts[0];

      Alert.alert(
        'Contact Support Person',
        `Would you like to contact ${primaryContact.name} (${primaryContact.relationship})?`,
        [
          {
            text: `Call ${primaryContact.name}`,
            onPress: async () => {
              await crisisStore.contactEmergencyContact(primaryContact.id);
            }
          },
          {
            text: 'Call 988 Instead',
            onPress: async () => {
              await crisisStore.call988();
            }
          },
          {
            text: 'Not Now',
            style: 'cancel'
          }
        ]
      );
    } else {
      // No emergency contacts - offer to add or use 988
      Alert.alert(
        'Emergency Contact',
        'You haven\'t set up emergency contacts yet. Would you like to call 988 for support?',
        [
          {
            text: 'Call 988',
            onPress: async () => {
              await crisisStore.call988();
            }
          },
          {
            text: 'Set Up Contacts Later',
            style: 'cancel'
          }
        ]
      );
    }
  }

  /**
   * Execute safety plan intervention
   */
  private async executeSafetyPlanIntervention(): Promise<void> {
    try {
      const { plan, quickAccess } = await CrisisPreventionService.accessSafetyPlan();

      if (plan) {
        Alert.alert(
          'Your Safety Plan',
          `Coping Strategies:\n• ${quickAccess.copingStrategies.slice(0, 3).join('\n• ')}\n\nReasons to Live:\n• ${quickAccess.reasonsToLive.slice(0, 2).join('\n• ')}`,
          [
            {
              text: 'View Full Plan',
              onPress: () => {
                // Navigate to full safety plan
                console.log('Navigate to full safety plan');
              }
            },
            {
              text: 'Call Support',
              onPress: async () => {
                const crisisStore = useCrisisStore.getState();
                await crisisStore.call988();
              }
            },
            {
              text: 'OK',
              style: 'cancel'
            }
          ]
        );
      } else {
        Alert.alert(
          'Safety Resources',
          'Crisis support is available:\n\n• Call 988 for immediate help\n• Text HOME to 741741\n• Go to a safe, public place\n• Call a trusted friend or family member',
          [
            {
              text: 'Call 988',
              onPress: async () => {
                const crisisStore = useCrisisStore.getState();
                await crisisStore.call988();
              }
            },
            {
              text: 'OK',
              style: 'cancel'
            }
          ]
        );
      }
    } catch (error) {
      console.error('Safety plan intervention failed:', error);
    }
  }

  /**
   * Execute coping strategies intervention
   */
  private async executeCopingStrategiesIntervention(): Promise<void> {
    Alert.alert(
      'Immediate Coping Strategies',
      'Try these right now:\n\n• Take 5 slow, deep breaths\n• Name 5 things you can see around you\n• Hold ice cubes or splash cold water on your face\n• Call someone you trust\n• Go to a safe, public place',
      [
        {
          text: 'More Help',
          onPress: async () => {
            const crisisStore = useCrisisStore.getState();
            await crisisStore.call988();
          }
        },
        {
          text: 'I\'m Trying These',
          style: 'cancel'
        }
      ]
    );

    // Record coping strategy use
    await CrisisPreventionService.recordCopingStrategyUse('immediate_crisis_coping', 3);
  }

  /**
   * Emergency fallback for system failures
   */
  private async emergencyFallback(result?: CrisisDetectionResult): Promise<void> {
    this.emergencyOverride = true;

    Alert.alert(
      'Crisis Support Available',
      'If you need immediate help:\n\n📞 988 - Crisis & Suicide Lifeline\n📞 911 - Emergency Services\n💬 Text HOME to 741741',
      [
        {
          text: 'Call 988',
          onPress: async () => {
            try {
              await Linking.openURL('tel:988');
            } catch {
              Alert.alert('Dial 988', 'Please dial 988 directly for crisis support.');
            }
          }
        },
        {
          text: 'Call 911',
          onPress: async () => {
            try {
              await Linking.openURL('tel:911');
            } catch {
              Alert.alert('Dial 911', 'Please dial 911 directly for emergency services.');
            }
          }
        },
        {
          text: 'OK',
          style: 'cancel'
        }
      ]
    );
  }

  /**
   * Complete intervention
   */
  async completeIntervention(interventionId: string, feedback?: 'helpful' | 'not_helpful'): Promise<void> {
    if (this.currentIntervention?.interventionId === interventionId) {
      this.currentIntervention.currentPhase = 'resolved';
      this.currentIntervention.isActive = false;

      // Add to history
      this.interventionHistory.push(this.currentIntervention);

      // Complete in crisis store
      const crisisStore = useCrisisStore.getState();
      if (crisisStore.activeCrisisId) {
        await crisisStore.resolveCrisis(crisisStore.activeCrisisId, feedback);
      }

      this.currentIntervention = null;
      this.notifyInterventionCallbacks();

      console.log(`✅ Crisis intervention completed: ${interventionId}`);
    }
  }

  /**
   * Get intervention status
   */
  getInterventionStatus(): InterventionStatus | null {
    return this.currentIntervention;
  }

  /**
   * Get crisis metrics
   */
  getCrisisMetrics(): CrisisMetrics {
    const crisisStore = useCrisisStore.getState();
    const stats = crisisStore.getCrisisStats();

    return {
      totalInterventions: this.interventionHistory.length,
      averageResponseTime: stats.averageResponseTime,
      interventionSuccess_rate: this.calculateSuccessRate(),
      mostEffectiveActions: this.getMostEffectiveActions(),
      escalationRate: this.calculateEscalationRate(),
      preventionSuccess_rate: this.calculatePreventionRate()
    };
  }

  /**
   * Public API for external components
   */
  onInterventionStatusChange(callback: (status: InterventionStatus) => void): () => void {
    this.interventionCallbacks.add(callback);
    return () => {
      this.interventionCallbacks.delete(callback);
    };
  }

  /**
   * Manual crisis trigger
   */
  async triggerManualCrisis(): Promise<void> {
    await crisisDetectionService.triggerManualDetection('phq9', [0, 0, 0, 0, 0, 0, 0, 0, 2]); // Simulate suicidal ideation
  }

  /**
   * Emergency override
   */
  async activateEmergencyMode(): Promise<void> {
    this.emergencyOverride = true;
    await this.emergencyFallback();
  }

  /**
   * Helper Methods
   */
  private notifyInterventionCallbacks(): void {
    if (this.currentIntervention) {
      this.interventionCallbacks.forEach(callback => {
        try {
          callback(this.currentIntervention!);
        } catch (error) {
          console.error('Intervention callback failed:', error);
        }
      });
    }
  }

  private calculateSuccessRate(): number {
    const successfulInterventions = this.interventionHistory.filter(
      intervention => intervention.currentPhase === 'resolved'
    ).length;

    return this.interventionHistory.length > 0
      ? (successfulInterventions / this.interventionHistory.length) * 100
      : 0;
  }

  private getMostEffectiveActions(): InterventionType[] {
    // Analyze which actions lead to successful resolutions
    return ['hotline_988', 'safety_plan', 'coping_strategies']; // Placeholder
  }

  private calculateEscalationRate(): number {
    // Calculate how often interventions escalate to emergency services
    return 5; // Placeholder percentage
  }

  private calculatePreventionRate(): number {
    // Calculate how often safety plans prevent crisis escalation
    return 85; // Placeholder percentage
  }
}

// Export singleton instance
export const crisisInterventionManager = CrisisInterventionManager.getInstance();
export default crisisInterventionManager;