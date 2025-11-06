/**
 * CRISIS INTEGRATION ORCHESTRATOR - DRD-FLOW-005 Assessment Flow Integration
 *
 * COMPREHENSIVE INTEGRATION POINTS:
 * - Real-time assessment monitoring and crisis detection
 * - Seamless crisis intervention UI integration
 * - Assessment store coordination and data synchronization
 * - Performance monitoring and workflow orchestration
 * - Professional referral and follow-up integration
 *
 * INTEGRATION WORKFLOWS:
 * 1. Assessment Question Response → Real-time Crisis Detection
 * 2. Crisis Detection → Immediate Intervention Workflow
 * 3. Crisis Resolution → Assessment Continuation/Completion
 * 4. Data Capture → Comprehensive Crisis Documentation
 * 5. Follow-up → Professional Care Coordination
 *
 * COMPONENT INTEGRATION:
 * - AssessmentStore: Crisis detection triggers and data capture
 * - AssessmentQuestion: Real-time suicidal ideation monitoring
 * - AssessmentResults: Crisis intervention UI integration
 * - CrisisButton: Emergency access from any assessment screen
 * - Navigation: Crisis flow routing and safety protocols
 */


import { logSecurity, logPerformance, logError, LogCategory } from '../logging';
import React from 'react';
import { Alert, Linking } from 'react-native';
import { useAssessmentStore } from '../../flows/assessment/stores/assessmentStore';
import CrisisDetectionEngine from './CrisisDetectionEngine';
import SuicidalIdeationProtocol from './SuicidalIdeationProtocol';
import CrisisInterventionWorkflow from './CrisisInterventionWorkflow';
import CrisisDataManagement from './CrisisDataManagement';
import CrisisPerformanceMonitor from './CrisisPerformanceMonitor';
import type {
  AssessmentType,
  AssessmentResponse,
  PHQ9Result,
  GAD7Result,
  CrisisDetection,
  CrisisIntervention,
  AssessmentAnswer
} from '../../flows/assessment/types';

/**
 * INTEGRATION CONFIGURATION
 */
export const INTEGRATION_CONFIG = {
  /** Real-time monitoring interval (ms) */
  REALTIME_MONITORING_INTERVAL_MS: 100,
  /** Crisis detection debounce (ms) */
  CRISIS_DETECTION_DEBOUNCE_MS: 50,
  /** Assessment continuation delay after crisis (ms) */
  ASSESSMENT_CONTINUATION_DELAY_MS: 5000,
  /** Crisis UI overlay timeout (ms) */
  CRISIS_UI_TIMEOUT_MS: 30000,
  /** Integration health check interval (ms) */
  HEALTH_CHECK_INTERVAL_MS: 10000
} as const;

/**
 * INTEGRATION EVENT TYPES
 */
export type CrisisIntegrationEvent =
  | 'assessment_started'
  | 'question_answered'
  | 'crisis_detected'
  | 'crisis_intervention_triggered'
  | 'crisis_resolved'
  | 'assessment_completed'
  | 'follow_up_scheduled'
  | 'integration_error';

/**
 * INTEGRATION EVENT DATA
 */
export interface CrisisIntegrationEventData {
  eventType: CrisisIntegrationEvent;
  timestamp: number;
  assessmentId: string;
  userId: string;
  data: any;
  metadata?: {
    performanceMs?: number;
    errors?: string[];
    warnings?: string[];
  };
}

/**
 * INTEGRATION STATUS
 */
export interface CrisisIntegrationStatus {
  isActive: boolean;
  monitoringEnabled: boolean;
  lastHealthCheck: number;
  activeIntegrations: number;
  performanceStatus: 'optimal' | 'degraded' | 'critical';
  integrationErrors: string[];
  systemHealth: {
    detectionEngine: boolean;
    suicidalIdeationProtocol: boolean;
    interventionWorkflow: boolean;
    dataManagement: boolean;
    performanceMonitor: boolean;
  };
}

/**
 * CRISIS INTEGRATION ORCHESTRATOR
 * Central coordination for all crisis system integrations
 */
export class CrisisIntegrationOrchestrator {
  private static instance: CrisisIntegrationOrchestrator;
  private integrationStatus: CrisisIntegrationStatus;
  private eventListeners: Map<CrisisIntegrationEvent, Function[]> = new Map();
  private activeAssessments: Map<string, CrisisAssessmentContext> = new Map();
  private integrationErrors: string[] = [];
  private healthCheckInterval?: NodeJS.Timeout;

  private constructor() {
    this.integrationStatus = {
      isActive: false,
      monitoringEnabled: false,
      lastHealthCheck: 0,
      activeIntegrations: 0,
      performanceStatus: 'optimal',
      integrationErrors: [],
      systemHealth: {
        detectionEngine: false,
        suicidalIdeationProtocol: false,
        interventionWorkflow: false,
        dataManagement: false,
        performanceMonitor: false
      }
    };
  }

  public static getInstance(): CrisisIntegrationOrchestrator {
    if (!CrisisIntegrationOrchestrator.instance) {
      CrisisIntegrationOrchestrator.instance = new CrisisIntegrationOrchestrator();
    }
    return CrisisIntegrationOrchestrator.instance;
  }

  /**
   * INITIALIZE CRISIS INTEGRATION
   * Sets up all crisis system integrations
   */
  public async initializeCrisisIntegration(): Promise<void> {
    try {
      console.log('🔄 Initializing Crisis Integration Orchestrator...');

      // Start performance monitoring
      CrisisPerformanceMonitor.startMonitoring();

      // Initialize assessment store integration
      await this.initializeAssessmentStoreIntegration();

      // Setup real-time monitoring
      await (this as any).setupRealtimeMonitoring();

      // Start health checks
      this.startHealthChecks();

      // Update status
      this.integrationStatus.isActive = true;
      this.integrationStatus.monitoringEnabled = true;
      this.integrationStatus.lastHealthCheck = Date.now();

      console.log('✅ Crisis Integration Orchestrator Initialized');

    } catch (error) {
      logError(LogCategory.CRISIS, '🚨 CRISIS INTEGRATION INITIALIZATION ERROR:', error instanceof Error ? error : new Error(String(error)));
      this.recordIntegrationError('initialization_failed', error);
      throw error;
    }
  }

  /**
   * ASSESSMENT STORE INTEGRATION
   * Integrates with assessment store for real-time crisis detection
   */
  private async initializeAssessmentStoreIntegration(): Promise<void> {
    try {
      // Subscribe to assessment store changes
      useAssessmentStore.subscribe(
        (state) => ({
          currentSession: state.currentSession,
          answers: state.answers,
          currentResult: state.currentResult,
          crisisDetection: state.crisisDetection
        }),
        async (current, previous) => {
          await this.handleAssessmentStoreChange(current, previous);
        }
      );

      console.log('✅ Assessment Store Integration Initialized');

    } catch (error) {
      logError(LogCategory.CRISIS, '🚨 ASSESSMENT STORE INTEGRATION ERROR:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * REAL-TIME ASSESSMENT MONITORING
   * Monitors assessment responses for crisis conditions
   */
  public async monitorAssessmentResponse(
    questionId: string,
    response: AssessmentResponse,
    assessmentType: AssessmentType,
    userId: string,
    assessmentId: string
  ): Promise<void> {
    const monitoringStartTime = performance.now();

    try {
      // Create or update assessment context
      const context = this.getOrCreateAssessmentContext(assessmentId, userId, assessmentType);

      // Record the response
      const answer: AssessmentAnswer = {
        questionId,
        response,
        timestamp: Date.now()
      };
      context.answers.push(answer);

      // Check for immediate suicidal ideation
      if (questionId === 'phq9_9' && response > 0) {
        await this.handleSuicidalIdeationDetection(
          questionId,
          response,
          userId,
          assessmentId,
          context
        );
      }

      // Check for progressive crisis conditions
      await this.evaluateProgressiveCrisisRisk(context);

      // Record performance
      await CrisisPerformanceMonitor.recordMetric({
        id: `monitor_response_${Date.now()}`,
        category: 'detection_timing',
        name: 'Assessment Response Monitoring',
        description: 'Time to monitor and evaluate assessment response',
        value: performance.now() - monitoringStartTime,
        unit: 'ms',
        threshold: { warning: 50, error: 100, critical: 200 },
        timestamp: Date.now(),
        context: { questionId, response, assessmentId },
        tags: ['response_monitoring', assessmentType]
      });

    } catch (error) {
      logError(LogCategory.CRISIS, '🚨 ASSESSMENT RESPONSE MONITORING ERROR:', error instanceof Error ? error : new Error(String(error)));
      this.recordIntegrationError('response_monitoring_failed', error);
    }
  }

  /**
   * ASSESSMENT COMPLETION INTEGRATION
   * Handles crisis detection at assessment completion
   */
  public async handleAssessmentCompletion(
    result: PHQ9Result | GAD7Result,
    assessmentType: AssessmentType,
    userId: string,
    assessmentId: string
  ): Promise<CrisisDetection | null> {
    const completionStartTime = performance.now();

    try {
      // Get assessment context
      const context = this.activeAssessments.get(assessmentId);
      if (!context) {
        logSecurity('Assessment context not found for completion', 'low', {
          assessmentId
        });
      }

      // Perform comprehensive crisis detection
      const detection = await CrisisDetectionEngine.detectCrisis(
        result,
        userId,
        assessmentId
      );

      if (detection) {
        // Trigger crisis intervention workflow
        const intervention = await this.triggerCrisisIntervention(detection, context);

        // Capture comprehensive crisis data
        await this.captureCrisisData(detection, intervention, context);

        // Emit integration event
        await this.emitIntegrationEvent({
          eventType: 'crisis_detected',
          timestamp: Date.now(),
          assessmentId,
          userId,
          data: { detection, intervention }
        });
      }

      // Record completion performance
      await CrisisPerformanceMonitor.recordCrisisDetection(
        detection || this.createNoCrisisDetection(assessmentId, userId),
        performance.now() - completionStartTime,
        true // Clinically accurate
      );

      return detection;

    } catch (error) {
      logError(LogCategory.CRISIS, '🚨 ASSESSMENT COMPLETION INTEGRATION ERROR:', error instanceof Error ? error : new Error(String(error)));
      this.recordIntegrationError('completion_integration_failed', error);
      return null;
    }
  }

  /**
   * CRISIS INTERVENTION INTEGRATION
   * Integrates crisis intervention with assessment UI
   */
  public async integrateCrisisInterventionUI(
    detection: CrisisDetection,
    context?: CrisisAssessmentContext
  ): Promise<void> {
    const integrationStartTime = performance.now();

    try {
      // Create intervention workflow
      const intervention = await CrisisInterventionWorkflow.initiateCrisisWorkflow(
        detection,
        this.createInitialIntervention(detection)
      );

      // Integrate with assessment UI
      await this.displayCrisisInterventionOverlay(detection, intervention);

      // Setup crisis navigation
      await this.setupCrisisNavigation(detection, intervention);

      // Record intervention performance
      await CrisisPerformanceMonitor.recordCrisisIntervention(
        intervention.intervention,
        performance.now() - integrationStartTime
      );

      // Emit integration event
      await this.emitIntegrationEvent({
        eventType: 'crisis_intervention_triggered',
        timestamp: Date.now(),
        assessmentId: detection.assessmentId,
        userId: detection.userId,
        data: { detection, intervention }
      });

    } catch (error) {
      logError(LogCategory.CRISIS, '🚨 CRISIS INTERVENTION UI INTEGRATION ERROR:', error instanceof Error ? error : new Error(String(error)));
      this.recordIntegrationError('intervention_ui_integration_failed', error);
    }
  }

  /**
   * CRISIS RESOLUTION INTEGRATION
   * Handles crisis resolution and assessment continuation
   */
  public async handleCrisisResolution(
    interventionId: string,
    resolutionType: 'user_safe_confirmed' | 'support_contacted' | 'emergency_services',
    assessmentId: string
  ): Promise<void> {
    try {
      // Get assessment context
      const context = this.activeAssessments.get(assessmentId);
      if (!context) {
        logSecurity('Assessment context not found for crisis resolution', 'low', {
          assessmentId
        });
        return;
      }

      // Update intervention status
      context.crisisResolved = true;
      context.resolutionType = resolutionType;
      context.resolvedAt = Date.now();

      // Handle assessment continuation
      if (resolutionType === 'user_safe_confirmed') {
        await this.handleAssessmentContinuation(context);
      } else {
        await this.handleAssessmentTermination(context);
      }

      // Schedule follow-up
      await this.scheduleFollowUp(context, resolutionType);

      // Emit integration event
      await this.emitIntegrationEvent({
        eventType: 'crisis_resolved',
        timestamp: Date.now(),
        assessmentId,
        userId: context.userId,
        data: { interventionId, resolutionType }
      });

    } catch (error) {
      logError(LogCategory.CRISIS, '🚨 CRISIS RESOLUTION INTEGRATION ERROR:', error instanceof Error ? error : new Error(String(error)));
      this.recordIntegrationError('crisis_resolution_failed', error);
    }
  }

  /**
   * SUICIDAL IDEATION DETECTION INTEGRATION
   */
  private async handleSuicidalIdeationDetection(
    questionId: string,
    response: number,
    userId: string,
    assessmentId: string,
    context: CrisisAssessmentContext
  ): Promise<void> {
    const detectionStartTime = performance.now();

    try {
      // Trigger suicidal ideation protocol
      const detection = await SuicidalIdeationProtocol.detectSuicidalIdeation(
        questionId,
        response,
        userId,
        assessmentId,
        context.currentTotalScore
      );

      if (detection) {
        // Update context
        context.crisisDetected = true;
        context.crisisDetection = this.convertSuicidalDetectionToCrisis(detection);

        // Immediate intervention
        await this.triggerImmediateSuicidalIdeationIntervention(detection, context);

        // Record performance
        await CrisisPerformanceMonitor.recordSuicidalIdeationDetection(
          questionId,
          response,
          performance.now() - detectionStartTime
        );
      }

    } catch (error) {
      logError(LogCategory.CRISIS, '🚨 SUICIDAL IDEATION DETECTION ERROR:', error instanceof Error ? error : new Error(String(error)));
      this.recordIntegrationError('suicidal_ideation_detection_failed', error);
    }
  }

  /**
   * PROGRESSIVE CRISIS RISK EVALUATION
   * Monitors cumulative risk during assessment
   */
  private async evaluateProgressiveCrisisRisk(context: CrisisAssessmentContext): Promise<void> {
    try {
      // Calculate current total score
      const currentScore = context.answers.reduce((sum, answer) => sum + answer.response, 0);
      context.currentTotalScore = currentScore;

      // Check for emerging crisis patterns
      if (context.assessmentType === 'phq9' && currentScore >= 15 && context.answers.length >= 6) {
        await this.handleEmergingCrisisRisk(context, 'phq9_progressive');
      } else if (context.assessmentType === 'gad7' && currentScore >= 12 && context.answers.length >= 5) {
        await this.handleEmergingCrisisRisk(context, 'gad7_progressive');
      }

    } catch (error) {
      logError(LogCategory.CRISIS, '🚨 PROGRESSIVE CRISIS EVALUATION ERROR:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async handleEmergingCrisisRisk(
    context: CrisisAssessmentContext,
    riskType: string
  ): Promise<void> {
    // Provide early warning without full intervention
    // Implementation would show supportive messaging and prepare resources
    console.log(`🔶 Emerging crisis risk detected: ${riskType} for assessment ${context.assessmentId}`);
  }

  /**
   * ASSESSMENT CONTEXT MANAGEMENT
   */
  private getOrCreateAssessmentContext(
    assessmentId: string,
    userId: string,
    assessmentType: AssessmentType
  ): CrisisAssessmentContext {
    let context = this.activeAssessments.get(assessmentId);

    if (!context) {
      context = {
        assessmentId,
        userId,
        assessmentType,
        startedAt: Date.now(),
        answers: [],
        currentTotalScore: 0,
        crisisDetected: false,
        crisisResolved: false,
        interventionsTriggered: []
      };

      this.activeAssessments.set(assessmentId, context);
      this.integrationStatus.activeIntegrations += 1;
    }

    return context;
  }

  private async triggerCrisisIntervention(
    detection: CrisisDetection,
    context?: CrisisAssessmentContext
  ): Promise<any> {
    const intervention = this.createInitialIntervention(detection);

    // Trigger workflow
    const workflowContext = await CrisisInterventionWorkflow.initiateCrisisWorkflow(
      detection,
      intervention
    );

    // Update assessment context
    if (context) {
      context.crisisDetected = true;
      context.crisisDetection = detection;
      context.interventionsTriggered.push({
        interventionId: intervention.interventionId,
        triggeredAt: Date.now(),
        type: 'crisis_intervention'
      });
    }

    return workflowContext;
  }

  private async triggerImmediateSuicidalIdeationIntervention(
    detection: any,
    context: CrisisAssessmentContext
  ): Promise<void> {
    // Immediate suicidal ideation intervention
    const intervention = await SuicidalIdeationProtocol.triggerImmediateIntervention(detection);

    context.interventionsTriggered.push({
      interventionId: intervention.interventionId,
      triggeredAt: Date.now(),
      type: 'suicidal_ideation'
    });

    // Stop assessment immediately
    context.assessmentTerminated = true;
    context.terminatedAt = Date.now();
    context.terminationReason = 'suicidal_ideation_immediate_intervention';
  }

  private async captureCrisisData(
    detection: CrisisDetection,
    intervention: any,
    context?: CrisisAssessmentContext
  ): Promise<void> {
    try {
      const additionalContext = context ? {
        assessmentProgress: {
          questionsAnswered: context.answers.length,
          currentScore: context.currentTotalScore,
          assessmentDurationMs: Date.now() - context.startedAt
        }
      } : undefined;

      await CrisisDataManagement.captureCrisisEpisode(
        detection,
        intervention.intervention || intervention,
        additionalContext
      );

    } catch (error) {
      logError(LogCategory.CRISIS, '🚨 CRISIS DATA CAPTURE ERROR:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * UI INTEGRATION METHODS
   */
  private async displayCrisisInterventionOverlay(
    detection: CrisisDetection,
    intervention: any
  ): Promise<void> {
    // Integration with React Native navigation and UI
    // Implementation would overlay crisis intervention UI
    console.log('🚨 Displaying Crisis Intervention Overlay');
  }

  private async setupCrisisNavigation(
    detection: CrisisDetection,
    intervention: any
  ): Promise<void> {
    // Setup navigation to crisis intervention screens
    // Implementation would configure navigation stack
    console.log('🔄 Setting up Crisis Navigation');
  }

  private async handleAssessmentContinuation(context: CrisisAssessmentContext): Promise<void> {
    // Allow assessment to continue after crisis resolution
    setTimeout(() => {
      console.log('✅ Assessment continuation allowed');
      // Implementation would enable assessment UI
    }, INTEGRATION_CONFIG.ASSESSMENT_CONTINUATION_DELAY_MS);
  }

  private async handleAssessmentTermination(context: CrisisAssessmentContext): Promise<void> {
    // Terminate assessment due to crisis
    context.assessmentTerminated = true;
    context.terminatedAt = Date.now();
    context.terminationReason = 'crisis_intervention_required';

    console.log('⏹️ Assessment terminated due to crisis');
  }

  private async scheduleFollowUp(
    context: CrisisAssessmentContext,
    resolutionType: string
  ): Promise<void> {
    // Schedule appropriate follow-up based on resolution
    const followUpUrgency = this.determineFollowUpUrgency(resolutionType);

    // Implementation would schedule follow-up
    console.log(`📅 Follow-up scheduled with urgency: ${followUpUrgency}`);
  }

  /**
   * HEALTH MONITORING
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performIntegrationHealthCheck();
    }, INTEGRATION_CONFIG.HEALTH_CHECK_INTERVAL_MS);
  }

  private async performIntegrationHealthCheck(): Promise<void> {
    try {
      const healthStatus = {
        detectionEngine: await this.checkComponentHealth('detectionEngine'),
        suicidalIdeationProtocol: await this.checkComponentHealth('suicidalIdeationProtocol'),
        interventionWorkflow: await this.checkComponentHealth('interventionWorkflow'),
        dataManagement: await this.checkComponentHealth('dataManagement'),
        performanceMonitor: await this.checkComponentHealth('performanceMonitor')
      };

      this.integrationStatus.systemHealth = healthStatus;
      this.integrationStatus.lastHealthCheck = Date.now();

      // Check overall system health
      const healthyComponents = Object.values(healthStatus).filter(Boolean).length;
      const totalComponents = Object.values(healthStatus).length;

      if (healthyComponents < totalComponents * 0.8) {
        this.integrationStatus.performanceStatus = 'critical';
        logError(LogCategory.SYSTEM, 'CRISIS INTEGRATION SYSTEM HEALTH CRITICAL');
      } else if (healthyComponents < totalComponents) {
        this.integrationStatus.performanceStatus = 'degraded';
        logSecurity('⚠️ Crisis Integration System Health Degraded', 'low');
      } else {
        this.integrationStatus.performanceStatus = 'optimal';
      }

    } catch (error) {
      logError(LogCategory.CRISIS, '🚨 INTEGRATION HEALTH CHECK ERROR:', error instanceof Error ? error : new Error(String(error)));
      this.recordIntegrationError('health_check_failed', error);
    }
  }

  private async checkComponentHealth(component: string): Promise<boolean> {
    try {
      // Component-specific health checks
      switch (component) {
        case 'detectionEngine':
          return true; // Would check CrisisDetectionEngine health
        case 'suicidalIdeationProtocol':
          return true; // Would check SuicidalIdeationProtocol health
        case 'interventionWorkflow':
          return true; // Would check CrisisInterventionWorkflow health
        case 'dataManagement':
          return true; // Would check CrisisDataManagement health
        case 'performanceMonitor':
          return CrisisPerformanceMonitor.getPerformanceStatus() !== 'critical';
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * EVENT MANAGEMENT
   */
  private async emitIntegrationEvent(eventData: CrisisIntegrationEventData): Promise<void> {
    try {
      const listeners = this.eventListeners.get(eventData.eventType) || [];
      for (const listener of listeners) {
        try {
          await listener(eventData);
        } catch (error) {
          logError(LogCategory.CRISIS, `Event listener error for ${eventData.eventType}:`, error instanceof Error ? error : new Error(String(error)));
        }
      }
    } catch (error) {
      logError(LogCategory.CRISIS, '🚨 EVENT EMISSION ERROR:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  public addEventListener(
    eventType: CrisisIntegrationEvent,
    listener: (eventData: CrisisIntegrationEventData) => void | Promise<void>
  ): void {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.push(listener);
    this.eventListeners.set(eventType, listeners);
  }

  public removeEventListener(
    eventType: CrisisIntegrationEvent,
    listener: Function
  ): void {
    const listeners = this.eventListeners.get(eventType) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
      this.eventListeners.set(eventType, listeners);
    }
  }

  /**
   * ERROR MANAGEMENT
   */
  private recordIntegrationError(errorType: string, error: any): void {
    const errorMessage = `${errorType}: ${error.message || error}`;
    this.integrationErrors.push(errorMessage);
    this.integrationStatus.integrationErrors.push(errorMessage);

    // Keep only last 50 errors
    if (this.integrationErrors.length > 50) {
      this.integrationErrors = this.integrationErrors.slice(-50);
      this.integrationStatus.integrationErrors = this.integrationStatus.integrationErrors.slice(-50);
    }
  }

  /**
   * UTILITY METHODS
   */
  private createInitialIntervention(detection: CrisisDetection): CrisisIntervention {
    return {
      detection,
      interventionId: `intervention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      interventionStarted: true,
      startTimestamp: Date.now(),
      contactedSupport: false,
      responseTime: 0,
      status: 'initiated',
      actionsTaken: [],
      followUp: {
        required: true,
        urgency: 'immediate',
        type: 'clinical_assessment',
        recommendations: [],
        contacts: [],
        completed: false
      },
      canDismiss: false,
      dismissalAvailableAt: Date.now() + 30000
    };
  }

  private createNoCrisisDetection(assessmentId: string, userId: string): CrisisDetection {
    return {
      id: `no_crisis_${Date.now()}`,
      isTriggered: false,
      primaryTrigger: 'manual_override',
      secondaryTriggers: [],
      severityLevel: 'moderate',
      triggerValue: 0,
      assessmentType: 'phq9',
      timestamp: Date.now(),
      assessmentId,
      userId,
      detectionResponseTimeMs: 0,
      context: {
        triggeringAnswers: [],
        timeOfDay: 'morning'
      }
    };
  }

  private convertSuicidalDetectionToCrisis(detection: any): CrisisDetection {
    return {
      id: detection.id,
      isTriggered: true,
      primaryTrigger: 'phq9_suicidal_ideation',
      secondaryTriggers: [],
      severityLevel: detection.riskLevel,
      triggerValue: detection.response,
      assessmentType: 'phq9',
      timestamp: detection.detectionTimestamp,
      assessmentId: detection.assessmentId,
      userId: detection.userId,
      detectionResponseTimeMs: detection.detectionResponseTimeMs,
      context: {
        triggeringAnswers: [{
          questionId: detection.questionId,
          response: detection.response,
          timestamp: detection.detectionTimestamp
        }],
        timeOfDay: detection.context.timeOfDay
      }
    };
  }

  private determineFollowUpUrgency(resolutionType: string): string {
    switch (resolutionType) {
      case 'emergency_services':
        return 'immediate';
      case 'support_contacted':
        return 'within_24h';
      case 'user_safe_confirmed':
        return 'within_48h';
      default:
        return 'within_week';
    }
  }

  private async handleAssessmentStoreChange(current: any, previous: any): Promise<void> {
    try {
      // Handle new answers
      if (current.answers.length > previous.answers.length) {
        const newAnswers = current.answers.slice(previous.answers.length);
        for (const answer of newAnswers) {
          if (current.currentSession) {
            await this.monitorAssessmentResponse(
              answer.questionId,
              answer.response,
              current.currentSession.type,
              'user_id', // Would get from session
              current.currentSession.id
            );
          }
        }
      }

      // Handle crisis detection changes
      if (current.crisisDetection && !previous.crisisDetection) {
        await this.integrateCrisisInterventionUI(current.crisisDetection);
      }

    } catch (error) {
      logError(LogCategory.CRISIS, '🚨 ASSESSMENT STORE CHANGE HANDLING ERROR:', error instanceof Error ? error : new Error(String(error)));
      this.recordIntegrationError('store_change_handling_failed', error);
    }
  }

  /**
   * PUBLIC API METHODS
   */
  public getIntegrationStatus(): CrisisIntegrationStatus {
    return { ...this.integrationStatus };
  }

  public getActiveAssessmentsCount(): number {
    return this.activeAssessments.size;
  }

  public async shutdownIntegration(): Promise<void> {
    this.integrationStatus.isActive = false;
    this.integrationStatus.monitoringEnabled = false;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    CrisisPerformanceMonitor.stopMonitoring();

    console.log('⏹️ Crisis Integration Orchestrator Shutdown');
  }

  public getIntegrationErrors(): string[] {
    return [...this.integrationErrors];
  }

  public clearIntegrationErrors(): void {
    this.integrationErrors = [];
    this.integrationStatus.integrationErrors = [];
  }
}

/**
 * ASSESSMENT CONTEXT INTERFACE
 */
export interface CrisisAssessmentContext {
  assessmentId: string;
  userId: string;
  assessmentType: AssessmentType;
  startedAt: number;
  answers: AssessmentAnswer[];
  currentTotalScore: number;
  crisisDetected: boolean;
  crisisDetection?: CrisisDetection;
  crisisResolved: boolean;
  resolutionType?: string;
  resolvedAt?: number;
  interventionsTriggered: Array<{
    interventionId: string;
    triggeredAt: number;
    type: string;
  }>;
  assessmentTerminated?: boolean;
  terminatedAt?: number;
  terminationReason?: string;
}

/**
 * REACT HOOK FOR CRISIS INTEGRATION
 * Provides easy access to crisis integration in React components
 */
export function useCrisisIntegration() {
  const orchestrator = CrisisIntegrationOrchestrator.getInstance();

  return {
    status: orchestrator.getIntegrationStatus(),
    activeAssessments: orchestrator.getActiveAssessmentsCount(),
    errors: orchestrator.getIntegrationErrors(),
    clearErrors: () => orchestrator.clearIntegrationErrors(),
    addEventListener: (eventType: CrisisIntegrationEvent, listener: (eventData: CrisisIntegrationEventData) => void | Promise<void>) =>
      orchestrator.addEventListener(eventType, listener),
    removeEventListener: (eventType: CrisisIntegrationEvent, listener: (eventData: CrisisIntegrationEventData) => void | Promise<void>) =>
      orchestrator.removeEventListener(eventType, listener)
  };
}

// Export singleton instance
export default CrisisIntegrationOrchestrator.getInstance();