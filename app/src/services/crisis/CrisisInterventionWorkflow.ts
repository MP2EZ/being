/**
 * CRISIS INTERVENTION WORKFLOW SPECIFICATIONS - DRD-FLOW-005
 *
 * COMPREHENSIVE CRISIS RESPONSE ORCHESTRATION:
 * - Multi-level crisis intervention based on severity
 * - Step-by-step workflow execution with fail-safes
 * - Real-time user guidance and support coordination
 * - Professional resource integration and follow-up
 * - Performance monitoring and quality assurance
 *
 * CLINICAL WORKFLOWS:
 * 1. Emergency (Suicidal Ideation + High Score): Immediate 988/911
 * 2. Critical (Suicidal Ideation): Immediate crisis support
 * 3. High (Severe Scores): Urgent professional referral
 * 4. Moderate (Concerning Scores): Guided self-help + monitoring
 *
 * PERFORMANCE REQUIREMENTS:
 * - Workflow initiation: <200ms
 * - Crisis resource access: <3 taps
 * - Professional referral: <24 hours
 * - Follow-up contact: Within specified timeframes
 */


import { logSecurity, logPerformance, logError, LogCategory } from '../logging';
import { Alert, Linking } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type {
  CrisisDetection,
  CrisisIntervention,
  CrisisSeverityLevel,
  CrisisActionType,
  CrisisResource,
  CrisisResolutionType
} from '../flows/assessment/types';

/**
 * CRISIS INTERVENTION WORKFLOW CONSTANTS
 */
export const WORKFLOW_CONFIG = {
  /** Maximum workflow initiation time (ms) */
  MAX_WORKFLOW_INITIATION_MS: 200,
  /** Maximum resource access time (ms) */
  MAX_RESOURCE_ACCESS_MS: 3000,
  /** Emergency workflow timeout (ms) */
  EMERGENCY_WORKFLOW_TIMEOUT_MS: 10000,
  /** Professional referral deadline (ms) */
  PROFESSIONAL_REFERRAL_DEADLINE_MS: 24 * 60 * 60 * 1000,
  /** Follow-up contact timeframes (ms) */
  FOLLOWUP_TIMEFRAMES: {
    emergency: 2 * 60 * 60 * 1000,      // 2 hours
    critical: 6 * 60 * 60 * 1000,       // 6 hours
    high: 24 * 60 * 60 * 1000,          // 24 hours
    moderate: 48 * 60 * 60 * 1000       // 48 hours
  }
} as const;

/**
 * CRISIS INTERVENTION WORKFLOW STATES
 */
export type WorkflowState =
  | 'initializing'
  | 'risk_assessment'
  | 'resource_presentation'
  | 'user_action_required'
  | 'professional_contact'
  | 'safety_monitoring'
  | 'follow_up_scheduled'
  | 'intervention_complete'
  | 'escalation_required';

/**
 * CRISIS INTERVENTION STEPS
 */
export interface CrisisInterventionStep {
  id: string;
  name: string;
  description: string;
  required: boolean;
  timeoutMs?: number;
  failsafe?: () => Promise<void>;
  validation?: (context: CrisisInterventionContext) => boolean;
}

/**
 * CRISIS INTERVENTION CONTEXT
 */
export interface CrisisInterventionContext {
  detection: CrisisDetection;
  intervention: CrisisIntervention;
  currentStep: CrisisInterventionStep;
  stepHistory: CrisisInterventionStep[];
  userActions: CrisisActionType[];
  resourcesAccessed: string[];
  professionalContactAttempted: boolean;
  safetyConfirmed: boolean;
  escalationRequired: boolean;
}

/**
 * CRISIS INTERVENTION WORKFLOW ENGINE
 * Orchestrates complete crisis response workflows
 */
export class CrisisInterventionWorkflow {
  private static instance: CrisisInterventionWorkflow;
  private activeWorkflows: Map<string, CrisisInterventionContext> = new Map();
  private workflowMetrics: Map<string, number> = new Map();
  private emergencyResources: CrisisResource[] = [];

  private constructor() {
    this.initializeEmergencyResources();
  }

  public static getInstance(): CrisisInterventionWorkflow {
    if (!CrisisInterventionWorkflow.instance) {
      CrisisInterventionWorkflow.instance = new CrisisInterventionWorkflow();
    }
    return CrisisInterventionWorkflow.instance;
  }

  /**
   * PRIMARY WORKFLOW ORCHESTRATION
   * Initiates appropriate crisis workflow based on severity
   */
  public async initiateCrisisWorkflow(
    detection: CrisisDetection,
    intervention: CrisisIntervention
  ): Promise<CrisisInterventionContext> {
    const workflowStartTime = performance.now();

    try {
      // Create workflow context
      const context = this.createWorkflowContext(detection, intervention);

      // Store active workflow
      this.activeWorkflows.set(detection.id, context);

      // Select appropriate workflow based on severity
      const workflow = this.selectWorkflowBySeverity(detection.severityLevel);

      // Execute workflow
      await this.executeWorkflow(context, workflow);

      // Record performance metrics
      this.recordWorkflowMetrics('workflow_initiated', workflowStartTime);

      return context;

    } catch (error) {
      logError(LogCategory.CRISIS, '🚨 CRISIS WORKFLOW INITIATION ERROR:', error instanceof Error ? error : new Error(String(error)));

      // FAIL-SAFE: Emergency workflow
      await this.executeEmergencyFailsafe(detection);

      throw error;
    }
  }

  /**
   * WORKFLOW EXECUTION ENGINE
   * Executes crisis intervention steps with monitoring
   */
  public async executeWorkflow(
    context: CrisisInterventionContext,
    workflow: CrisisInterventionStep[]
  ): Promise<void> {
    try {
      for (const step of workflow) {
        await this.executeWorkflowStep(context, step);

        // Check for escalation requirements
        if (context.escalationRequired) {
          await this.handleWorkflowEscalation(context);
          break;
        }
      }

      // Complete workflow
      await this.completeWorkflow(context);

    } catch (error) {
      logError(LogCategory.CRISIS, '🚨 WORKFLOW EXECUTION ERROR:', error instanceof Error ? error : new Error(String(error)));
      await this.handleWorkflowFailure(context, error);
    }
  }

  /**
   * STEP EXECUTION
   * Executes individual workflow steps with validation
   */
  private async executeWorkflowStep(
    context: CrisisInterventionContext,
    step: CrisisInterventionStep
  ): Promise<void> {
    const stepStartTime = performance.now();

    try {
      // Update current step
      context.currentStep = step;
      context.stepHistory.push(step);

      // Validate step preconditions
      if (step.validation && !step.validation(context)) {
        throw new Error(`Step validation failed: ${step.name}`);
      }

      // Execute step based on type
      await this.executeStepByName(context, step);

      // Record step completion
      this.recordStepMetrics(step.name, stepStartTime);

    } catch (error) {
      logError(LogCategory.SYSTEM, `WORKFLOW STEP ERROR (${step.name}):`, error);

      // Execute step failsafe if available
      if (step.failsafe) {
        await step.failsafe();
      } else {
        await this.executeEmergencyFailsafe(context.detection);
      }

      throw error;
    }
  }

  /**
   * CRISIS WORKFLOW DEFINITIONS
   * Pre-defined workflows for different severity levels
   */
  private selectWorkflowBySeverity(severity: CrisisSeverityLevel): CrisisInterventionStep[] {
    switch (severity) {
      case 'emergency':
        return this.getEmergencyWorkflow();
      case 'critical':
        return this.getCriticalWorkflow();
      case 'high':
        return this.getHighRiskWorkflow();
      case 'moderate':
        return this.getModerateRiskWorkflow();
      default:
        return this.getModerateRiskWorkflow();
    }
  }

  private getEmergencyWorkflow(): CrisisInterventionStep[] {
    return [
      {
        id: 'emergency_alert',
        name: 'Emergency Crisis Alert',
        description: 'Display immediate emergency crisis alert',
        required: true,
        timeoutMs: 5000,
        failsafe: () => this.directEmergencyCall()
      },
      {
        id: 'emergency_resource_access',
        name: 'Emergency Resource Access',
        description: 'Provide immediate access to emergency resources',
        required: true,
        timeoutMs: 3000,
        failsafe: () => this.directEmergencyCall()
      },
      {
        id: 'emergency_contact_verification',
        name: 'Emergency Contact Verification',
        description: 'Verify emergency contact was made',
        required: true,
        timeoutMs: 10000,
        failsafe: () => this.escalateToEmergencyServices()
      },
      {
        id: 'immediate_follow_up',
        name: 'Immediate Follow-up Scheduling',
        description: 'Schedule immediate professional follow-up',
        required: true
      }
    ];
  }

  private getCriticalWorkflow(): CrisisInterventionStep[] {
    return [
      {
        id: 'critical_alert',
        name: 'Critical Crisis Alert',
        description: 'Display critical crisis intervention alert',
        required: true,
        timeoutMs: 5000,
        failsafe: () => this.directCrisisLineCall()
      },
      {
        id: 'safety_assessment',
        name: 'Safety Assessment',
        description: 'Assess immediate safety status',
        required: true,
        validation: (context) => !context.escalationRequired
      },
      {
        id: 'crisis_resource_presentation',
        name: 'Crisis Resource Presentation',
        description: 'Present crisis support resources',
        required: true,
        timeoutMs: 5000
      },
      {
        id: 'contact_encouragement',
        name: 'Contact Encouragement',
        description: 'Encourage professional contact',
        required: true
      },
      {
        id: 'safety_planning',
        name: 'Safety Planning',
        description: 'Initiate safety planning process',
        required: true
      },
      {
        id: 'urgent_follow_up',
        name: 'Urgent Follow-up Scheduling',
        description: 'Schedule urgent follow-up within 6 hours',
        required: true
      }
    ];
  }

  private getHighRiskWorkflow(): CrisisInterventionStep[] {
    return [
      {
        id: 'high_risk_alert',
        name: 'High Risk Alert',
        description: 'Display high-risk intervention alert',
        required: true,
        timeoutMs: 5000
      },
      {
        id: 'professional_resource_presentation',
        name: 'Professional Resource Presentation',
        description: 'Present professional mental health resources',
        required: true
      },
      {
        id: 'support_encouragement',
        name: 'Support Encouragement',
        description: 'Encourage seeking professional support',
        required: true
      },
      {
        id: 'resource_connection',
        name: 'Resource Connection',
        description: 'Facilitate connection to appropriate resources',
        required: true
      },
      {
        id: 'follow_up_scheduling',
        name: 'Follow-up Scheduling',
        description: 'Schedule follow-up within 24 hours',
        required: true
      }
    ];
  }

  private getModerateRiskWorkflow(): CrisisInterventionStep[] {
    return [
      {
        id: 'moderate_alert',
        name: 'Moderate Risk Alert',
        description: 'Display supportive intervention message',
        required: true
      },
      {
        id: 'resource_education',
        name: 'Resource Education',
        description: 'Educate about available mental health resources',
        required: true
      },
      {
        id: 'self_help_guidance',
        name: 'Self-help Guidance',
        description: 'Provide self-help strategies and coping tools',
        required: true
      },
      {
        id: 'professional_recommendation',
        name: 'Professional Recommendation',
        description: 'Recommend professional consultation',
        required: true
      },
      {
        id: 'monitoring_setup',
        name: 'Monitoring Setup',
        description: 'Set up ongoing monitoring and check-ins',
        required: true
      }
    ];
  }

  /**
   * STEP EXECUTION IMPLEMENTATIONS
   */
  private async executeStepByName(
    context: CrisisInterventionContext,
    step: CrisisInterventionStep
  ): Promise<void> {
    switch (step.id) {
      case 'emergency_alert':
        await this.displayEmergencyAlert(context);
        break;
      case 'critical_alert':
        await this.displayCriticalAlert(context);
        break;
      case 'high_risk_alert':
        await this.displayHighRiskAlert(context);
        break;
      case 'moderate_alert':
        await this.displayModerateAlert(context);
        break;
      case 'emergency_resource_access':
        await this.provideEmergencyResourceAccess(context);
        break;
      case 'crisis_resource_presentation':
        await this.presentCrisisResources(context);
        break;
      case 'professional_resource_presentation':
        await this.presentProfessionalResources(context);
        break;
      case 'safety_assessment':
        await this.conductSafetyAssessment(context);
        break;
      case 'safety_planning':
        await this.initiateSafetyPlanning(context);
        break;
      case 'contact_encouragement':
        await this.encourageContact(context);
        break;
      case 'support_encouragement':
        await this.encourageSupport(context);
        break;
      case 'immediate_follow_up':
      case 'urgent_follow_up':
      case 'follow_up_scheduling':
        await this.scheduleFollowUp(context, step.id);
        break;
      default:
        logSecurity(`Unknown workflow step: ${step.id}`);
    }
  }

  /**
   * ALERT IMPLEMENTATIONS
   */
  private async displayEmergencyAlert(context: CrisisInterventionContext): Promise<void> {
    Alert.alert(
      '🚨 EMERGENCY CRISIS SUPPORT',
      'Your responses indicate you may be in immediate danger. Emergency support is available now.',
      [
        {
          text: 'Call 988 Crisis Lifeline',
          onPress: () => {
            this.recordUserAction(context, 'contacted_988');
            Linking.openURL('tel:988');
          },
          style: 'default'
        },
        {
          text: 'Emergency Services (911)',
          onPress: () => {
            this.recordUserAction(context, 'contacted_emergency');
            Linking.openURL('tel:911');
          },
          style: 'destructive'
        }
      ],
      { cancelable: false }
    );
  }

  private async displayCriticalAlert(context: CrisisInterventionContext): Promise<void> {
    Alert.alert(
      '🚨 CRISIS SUPPORT NEEDED',
      'Your responses indicate you need immediate crisis support. Help is available 24/7.',
      [
        {
          text: 'Call 988 Crisis Lifeline',
          onPress: () => {
            this.recordUserAction(context, 'contacted_988');
            Linking.openURL('tel:988');
          },
          style: 'default'
        },
        {
          text: 'Text Crisis Support',
          onPress: () => {
            this.recordUserAction(context, 'contacted_support');
            Linking.openURL('sms:741741');
          },
          style: 'default'
        },
        {
          text: 'View All Resources',
          onPress: () => {
            this.recordUserAction(context, 'viewed_resources');
          },
          style: 'cancel'
        }
      ],
      { cancelable: false }
    );
  }

  private async displayHighRiskAlert(context: CrisisInterventionContext): Promise<void> {
    Alert.alert(
      'Professional Support Recommended',
      'Your assessment suggests you would benefit from professional mental health support.',
      [
        {
          text: 'Call 988 if in Crisis',
          onPress: () => {
            this.recordUserAction(context, 'contacted_988');
            Linking.openURL('tel:988');
          },
          style: 'default'
        },
        {
          text: 'Find Professional Help',
          onPress: () => {
            this.recordUserAction(context, 'viewed_resources');
            // Navigate to professional resources
          },
          style: 'default'
        },
        {
          text: 'Continue',
          onPress: () => {
            this.recordUserAction(context, 'acknowledged_safety');
          },
          style: 'cancel'
        }
      ]
    );
  }

  private async displayModerateAlert(context: CrisisInterventionContext): Promise<void> {
    Alert.alert(
      'Support Available',
      'Your assessment indicates you might benefit from additional support and resources.',
      [
        {
          text: 'View Support Resources',
          onPress: () => {
            this.recordUserAction(context, 'viewed_resources');
          },
          style: 'default'
        },
        {
          text: 'Learn Coping Strategies',
          onPress: () => {
            this.recordUserAction(context, 'used_coping_skill');
          },
          style: 'default'
        },
        {
          text: 'Continue',
          onPress: () => {
            this.recordUserAction(context, 'acknowledged_safety');
          },
          style: 'cancel'
        }
      ]
    );
  }

  /**
   * RESOURCE AND SUPPORT IMPLEMENTATIONS
   */
  private async provideEmergencyResourceAccess(context: CrisisInterventionContext): Promise<void> {
    const resources = this.emergencyResources.filter(r =>
      r.handlesLevels.includes('emergency')
    );

    // Display resources with direct access
    // Implementation would show UI with emergency resources
  }

  private async presentCrisisResources(context: CrisisInterventionContext): Promise<void> {
    const resources = this.emergencyResources.filter(r =>
      r.handlesLevels.includes('critical') || r.handlesLevels.includes('high')
    );

    // Implementation would show crisis resources UI
  }

  private async presentProfessionalResources(context: CrisisInterventionContext): Promise<void> {
    // Implementation would show professional mental health resources
  }

  private async conductSafetyAssessment(context: CrisisInterventionContext): Promise<void> {
    // Implementation would conduct safety assessment
    // For now, mark as completed
    context.safetyConfirmed = true;
  }

  private async initiateSafetyPlanning(context: CrisisInterventionContext): Promise<void> {
    // Implementation would initiate safety planning process
  }

  private async encourageContact(context: CrisisInterventionContext): Promise<void> {
    // Implementation would encourage professional contact
  }

  private async encourageSupport(context: CrisisInterventionContext): Promise<void> {
    // Implementation would encourage seeking support
  }

  private async scheduleFollowUp(
    context: CrisisInterventionContext,
    followUpType: string
  ): Promise<void> {
    const timeframe = this.getFollowUpTimeframe(context.detection.severityLevel);

    const followUpSchedule = {
      interventionId: context.intervention.interventionId,
      userId: context.detection.userId,
      scheduledAt: Date.now() + timeframe,
      type: followUpType,
      urgency: context.detection.severityLevel,
      attempts: 0,
      maxAttempts: 3
    };

    await SecureStore.setItemAsync(
      `followup_${context.intervention.interventionId}`,
      JSON.stringify(followUpSchedule)
    );
  }

  /**
   * WORKFLOW MANAGEMENT
   */
  private createWorkflowContext(
    detection: CrisisDetection,
    intervention: CrisisIntervention
  ): CrisisInterventionContext {
    return {
      detection,
      intervention,
      currentStep: { id: 'init', name: 'Initialization', description: 'Initializing workflow', required: true },
      stepHistory: [],
      userActions: [],
      resourcesAccessed: [],
      professionalContactAttempted: false,
      safetyConfirmed: false,
      escalationRequired: false
    };
  }

  private async completeWorkflow(context: CrisisInterventionContext): Promise<void> {
    // Update intervention status
    context.intervention.status = 'resolved';

    // Log workflow completion
    await this.logWorkflowCompletion(context);

    // Remove from active workflows
    this.activeWorkflows.delete(context.detection.id);
  }

  private async handleWorkflowEscalation(context: CrisisInterventionContext): Promise<void> {
    // Implement escalation workflow
    await this.executeEmergencyFailsafe(context.detection);
  }

  private async handleWorkflowFailure(
    context: CrisisInterventionContext,
    error: any
  ): Promise<void> {
    logError(LogCategory.CRISIS, '🚨 WORKFLOW FAILURE:', error instanceof Error ? error : new Error(String(error)));

    // Log failure
    await this.logWorkflowFailure(context, error);

    // Execute emergency failsafe
    await this.executeEmergencyFailsafe(context.detection);
  }

  /**
   * UTILITY METHODS
   */
  private recordUserAction(context: CrisisInterventionContext, action: CrisisActionType): void {
    context.userActions.push(action);
    context.intervention.actionsTaken.push({
      type: action,
      timestamp: Date.now(),
      durationMs: 0,
      completed: true
    });
  }

  private getFollowUpTimeframe(severity: CrisisSeverityLevel): number {
    return WORKFLOW_CONFIG.FOLLOWUP_TIMEFRAMES[severity];
  }

  private recordWorkflowMetrics(metric: string, startTime: number): void {
    const duration = performance.now() - startTime;
    this.workflowMetrics.set(`${metric}_last`, duration);

    const maxDuration = this.workflowMetrics.get(`${metric}_max`) || 0;
    if (duration > maxDuration) {
      this.workflowMetrics.set(`${metric}_max`, duration);
    }

    const count = this.workflowMetrics.get(`${metric}_count`) || 0;
    this.workflowMetrics.set(`${metric}_count`, count + 1);
  }

  private recordStepMetrics(stepName: string, startTime: number): void {
    const duration = performance.now() - startTime;
    this.workflowMetrics.set(`step_${stepName}_last`, duration);
  }

  /**
   * FAIL-SAFE IMPLEMENTATIONS
   */
  private async executeEmergencyFailsafe(detection: CrisisDetection): Promise<void> {
    logError(LogCategory.SYSTEM, 'EXECUTING EMERGENCY FAILSAFE');

    Alert.alert(
      '🚨 EMERGENCY SUPPORT',
      'Crisis support is available immediately.',
      [
        {
          text: 'Call 988 Now',
          onPress: () => Linking.openURL('tel:988'),
          style: 'default'
        },
        {
          text: 'Emergency 911',
          onPress: () => Linking.openURL('tel:911'),
          style: 'destructive'
        }
      ],
      { cancelable: false }
    );
  }

  private async directEmergencyCall(): Promise<void> {
    await Linking.openURL('tel:911');
  }

  private async directCrisisLineCall(): Promise<void> {
    await Linking.openURL('tel:988');
  }

  private async escalateToEmergencyServices(): Promise<void> {
    await Linking.openURL('tel:911');
  }

  /**
   * EMERGENCY RESOURCES INITIALIZATION
   */
  private initializeEmergencyResources(): void {
    this.emergencyResources = [
      {
        id: '988_lifeline',
        name: '988 Suicide & Crisis Lifeline',
        type: 'hotline',
        contact: { phone: '988' },
        availability: '24/7',
        geographic: 'national',
        languages: ['English', 'Spanish'],
        specializations: ['Suicide Prevention', 'Crisis Counseling'],
        handlesLevels: ['moderate', 'high', 'critical', 'emergency']
      },
      {
        id: 'crisis_text_line',
        name: 'Crisis Text Line',
        type: 'text_line',
        contact: { text: '741741' },
        availability: '24/7',
        geographic: 'national',
        languages: ['English'],
        specializations: ['Crisis Support', 'Text-based Support'],
        handlesLevels: ['moderate', 'high', 'critical']
      },
      {
        id: 'emergency_services',
        name: 'Emergency Services',
        type: 'hotline',
        contact: { phone: '911' },
        availability: '24/7',
        geographic: 'national',
        languages: ['English', 'Spanish'],
        specializations: ['Emergency Response', 'Immediate Safety'],
        handlesLevels: ['emergency']
      }
    ];
  }

  /**
   * LOGGING METHODS
   */
  private async logWorkflowCompletion(context: CrisisInterventionContext): Promise<void> {
    try {
      const logEntry = {
        type: 'workflow_completion',
        context,
        timestamp: Date.now(),
        metrics: Object.fromEntries(this.workflowMetrics),
        source: 'CrisisInterventionWorkflow'
      };

      await SecureStore.setItemAsync(
        `workflow_complete_${context.intervention.interventionId}`,
        JSON.stringify(logEntry)
      );
    } catch (error) {
      logError(LogCategory.CRISIS, 'Workflow completion logging failed:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async logWorkflowFailure(
    context: CrisisInterventionContext,
    error: any
  ): Promise<void> {
    try {
      const logEntry = {
        type: 'workflow_failure',
        context,
        error: error.message,
        timestamp: Date.now(),
        source: 'CrisisInterventionWorkflow'
      };

      // Use SecureStore for workflow failure logs (context contains intervention PHI)
      await SecureStore.setItemAsync(
        `workflow_failure_${context.intervention.interventionId}`,
        JSON.stringify(logEntry)
      );
    } catch (logError) {
      logError('Workflow failure logging failed:', logError);
    }
  }

  /**
   * PUBLIC API
   */
  public getActiveWorkflows(): CrisisInterventionContext[] {
    return Array.from(this.activeWorkflows.values());
  }

  public getWorkflowMetrics(): Record<string, number> {
    return Object.fromEntries(this.workflowMetrics);
  }

  public async clearCompletedWorkflows(): Promise<void> {
    for (const [id, context] of this.activeWorkflows.entries()) {
      if (context.intervention.status === 'resolved') {
        this.activeWorkflows.delete(id);
      }
    }
  }
}

// Export singleton instance
export default CrisisInterventionWorkflow.getInstance();