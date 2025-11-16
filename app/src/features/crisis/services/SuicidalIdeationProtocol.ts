/**
 * SUICIDAL IDEATION DETECTION PROTOCOL - DRD-FLOW-005
 *
 * CRITICAL SAFETY REQUIREMENTS:
 * - PHQ-9 Question 9 ANY response >0 = IMMEDIATE INTERVENTION
 * - Real-time detection during assessment (<50ms)
 * - Immediate crisis alert display (<200ms)
 * - Direct 988 access within 3 taps
 * - Cannot be dismissed without safety acknowledgment
 * - Mandatory clinical follow-up tracking
 *
 * REGULATORY COMPLIANCE:
 * - Follows 988 Suicide & Crisis Lifeline protocols
 * - Meets clinical standard of care requirements
 * - Encrypted audit trail for legal/clinical review
 * - Performance monitoring for quality assurance
 *
 * PHQ-9 Question 9: "Thoughts that you would be better off dead,
 * or of hurting yourself in some way"
 * - 0: Not at all
 * - 1: Several days  → CRISIS
 * - 2: More than half the days → CRISIS
 * - 3: Nearly every day → CRISIS
 */


import { logSecurity, logPerformance, logError, LogCategory } from '@/core/services/logging';
import { Alert, Linking } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type {
  CrisisDetection,
  CrisisIntervention,
  AssessmentAnswer
} from '@/features/assessment/types';

/**
 * SUICIDAL IDEATION CONSTANTS
 */
export const SUICIDAL_IDEATION_CONFIG = {
  /** PHQ-9 Question 9 ID */
  QUESTION_ID: 'phq9_9',
  /** Any response above this triggers crisis */
  TRIGGER_THRESHOLD: 0,
  /** Maximum detection time (ms) */
  MAX_DETECTION_TIME_MS: 50,
  /** Maximum intervention display time (ms) */
  MAX_INTERVENTION_TIME_MS: 200,
  /** Minimum intervention duration before any dismissal option */
  MIN_INTERVENTION_DURATION_MS: 60000, // 60 seconds
  /** Follow-up requirement duration (24 hours) */
  MANDATORY_FOLLOWUP_DURATION_MS: 24 * 60 * 60 * 1000,
} as const;

/**
 * SUICIDAL IDEATION SEVERITY LEVELS
 * Based on PHQ-9 Q9 response frequency
 */
export type SuicidalIdeationSeverity =
  | 'several_days'        // Response = 1
  | 'more_than_half'      // Response = 2
  | 'nearly_every_day';   // Response = 3

/**
 * SUICIDAL IDEATION RESPONSE LABELS
 * Exact PHQ-9 clinical language
 */
export const SUICIDAL_IDEATION_RESPONSES = {
  0: "Not at all",
  1: "Several days",
  2: "More than half the days",
  3: "Nearly every day"
} as const;

/**
 * SUICIDAL IDEATION DETECTION PROTOCOL
 * Real-time monitoring and immediate intervention
 */
export class SuicidalIdeationProtocol {
  private static instance: SuicidalIdeationProtocol;
  private activeInterventions: Map<string, SuicidalIdeationIntervention> = new Map();
  private detectionMetrics: Map<string, number> = new Map();

  private constructor() {}

  public static getInstance(): SuicidalIdeationProtocol {
    if (!SuicidalIdeationProtocol.instance) {
      SuicidalIdeationProtocol.instance = new SuicidalIdeationProtocol();
    }
    return SuicidalIdeationProtocol.instance;
  }

  /**
   * REAL-TIME SUICIDAL IDEATION DETECTION
   * Monitors PHQ-9 Question 9 responses in real-time
   * PERFORMANCE: <50ms detection, <200ms intervention display
   */
  public async detectSuicidalIdeation(
    questionId: string,
    response: number,
    userId: string,
    assessmentId: string,
    totalScore?: number
  ): Promise<SuicidalIdeationDetection | null> {
    const detectionStartTime = performance.now();

    try {
      // Only process PHQ-9 Question 9
      if (questionId !== SUICIDAL_IDEATION_CONFIG.QUESTION_ID) {
        return null;
      }

      // Check if response indicates suicidal ideation
      if (response <= SUICIDAL_IDEATION_CONFIG.TRIGGER_THRESHOLD) {
        return null;
      }

      // Create suicidal ideation detection
      const detection = this.createSuicidalIdeationDetection(
        response,
        userId,
        assessmentId,
        totalScore,
        detectionStartTime
      );

      // Validate detection timing
      this.validateDetectionTiming(detection);

      // Trigger immediate intervention
      await this.triggerImmediateIntervention(detection);

      // Log for clinical audit
      await this.logSuicidalIdeationDetection(detection);

      // Record performance metrics
      this.recordDetectionMetrics(detection);

      return detection;

    } catch (error) {
      logError(LogCategory.CRISIS, '🚨 SUICIDAL IDEATION DETECTION ERROR:', error instanceof Error ? error : new Error(String(error)));

      // FAIL-SAFE: Emergency intervention
      await this.emergencyFailsafeIntervention(questionId, response);

      throw error;
    }
  }

  /**
   * IMMEDIATE CRISIS INTERVENTION
   * Cannot be dismissed - requires safety acknowledgment
   */
  public async triggerImmediateIntervention(
    detection: SuicidalIdeationDetection
  ): Promise<SuicidalIdeationIntervention> {
    const interventionStartTime = performance.now();

    try {
      // Create intervention session
      const intervention = this.createSuicidalIdeationIntervention(
        detection,
        interventionStartTime
      );

      // Store active intervention
      this.activeInterventions.set(detection.id, intervention);

      // Display emergency crisis alert
      await this.displayEmergencySuicidalIdeationAlert(intervention);

      // Log intervention start
      await this.logSuicidalIdeationIntervention(intervention);

      // Schedule mandatory follow-up
      await this.scheduleMandatoryFollowUp(intervention);

      return intervention;

    } catch (error) {
      logError(LogCategory.CRISIS, '🚨 SUICIDAL IDEATION INTERVENTION ERROR:', error instanceof Error ? error : new Error(String(error)));

      // FAIL-SAFE: Direct emergency call
      await this.emergencyFailsafeIntervention(
        detection.questionId,
        detection.response
      );

      throw error;
    }
  }

  /**
   * SAFETY ACKNOWLEDGMENT PROCESS
   * Required before any dismissal option
   */
  public async requireSafetyAcknowledgment(
    interventionId: string
  ): Promise<boolean> {
    const intervention = this.activeInterventions.get(interventionId);
    if (!intervention) {
      return false;
    }

    try {
      // Check minimum intervention duration
      const currentTime = Date.now();
      const interventionDuration = currentTime - intervention.startTimestamp;

      if (interventionDuration < SUICIDAL_IDEATION_CONFIG.MIN_INTERVENTION_DURATION_MS) {
        Alert.alert(
          'Safety First',
          `Please take ${Math.ceil((SUICIDAL_IDEATION_CONFIG.MIN_INTERVENTION_DURATION_MS - interventionDuration) / 1000)} more seconds to review the crisis resources.`,
          [{ text: 'Continue', style: 'default' }]
        );
        return false;
      }

      // Display safety commitment dialog
      return new Promise((resolve) => {
        Alert.alert(
          '🚨 Safety Commitment Required',
          'Before continuing, please confirm your commitment to safety. If you are having thoughts of self-harm, please contact crisis support immediately.',
          [
            {
              text: 'Call 988 Now',
              onPress: () => {
                this.recordSafetyAction(interventionId, 'contacted_988');
                Linking.openURL('tel:988');
                resolve(false); // Keep intervention active
              },
              style: 'default'
            },
            {
              text: 'I am safe and will seek help if needed',
              onPress: () => {
                this.recordSafetyAction(interventionId, 'safety_commitment');
                this.completeSafetyAcknowledgment(interventionId);
                resolve(true);
              },
              style: 'default'
            }
          ],
          { cancelable: false }
        );
      });

    } catch (error) {
      logError(LogCategory.CRISIS, '🚨 SAFETY ACKNOWLEDGMENT ERROR:', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * CRISIS INTERVENTION UI DISPLAY
   * Non-dismissible emergency alert
   */
  private async displayEmergencySuicidalIdeationAlert(
    intervention: SuicidalIdeationIntervention
  ): Promise<void> {
    const { detection } = intervention;

    const severityText = this.getSeverityText(detection.severity);
    const urgencyMessage = this.getUrgencyMessage(detection.severity);

    Alert.alert(
      '🚨 IMMEDIATE CRISIS SUPPORT NEEDED',
      `Your response indicates ${severityText}. ${urgencyMessage}\n\nYou are not alone. Crisis support is available 24/7.`,
      [
        {
          text: 'Call 988 Crisis Lifeline',
          onPress: () => {
            this.recordSafetyAction(intervention.interventionId, 'contacted_988');
            Linking.openURL('tel:988');
          },
          style: 'default'
        },
        {
          text: 'Text Crisis Support (741741)',
          onPress: () => {
            this.recordSafetyAction(intervention.interventionId, 'contacted_crisis_text');
            Linking.openURL('sms:741741');
          },
          style: 'default'
        },
        {
          text: 'Emergency Services (911)',
          onPress: () => {
            this.recordSafetyAction(intervention.interventionId, 'contacted_emergency');
            Linking.openURL('tel:911');
          },
          style: 'destructive'
        }
      ],
      { cancelable: false }
    );
  }

  /**
   * DETECTION DATA STRUCTURES
   */
  private createSuicidalIdeationDetection(
    response: number,
    userId: string,
    assessmentId: string,
    totalScore: number | undefined,
    startTime: number
  ): SuicidalIdeationDetection {
    const severity = this.determineSeverity(response);
    const riskLevel = this.determineRiskLevel(response, totalScore);

    return {
      id: `suicidal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      questionId: SUICIDAL_IDEATION_CONFIG.QUESTION_ID,
      response,
      severity,
      riskLevel,
      userId,
      assessmentId,
      detectionTimestamp: Date.now(),
      detectionResponseTimeMs: performance.now() - startTime,
      context: {
        totalScore,
        timeOfDay: this.getTimeOfDay(),
        dayOfWeek: new Date().getDay(),
        questionText: "Thoughts that you would be better off dead, or of hurting yourself in some way",
        responseText: SUICIDAL_IDEATION_RESPONSES[response as keyof typeof SUICIDAL_IDEATION_RESPONSES]
      }
    };
  }

  private createSuicidalIdeationIntervention(
    detection: SuicidalIdeationDetection,
    startTime: number
  ): SuicidalIdeationIntervention {
    return {
      interventionId: `si_intervention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      detection,
      startTimestamp: Date.now(),
      responseTimeMs: performance.now() - startTime,
      status: 'active',
      actionsTaken: [],
      safetyCommitment: null,
      dismissible: false,
      dismissalAvailableAt: Date.now() + SUICIDAL_IDEATION_CONFIG.MIN_INTERVENTION_DURATION_MS,
      followUp: {
        required: true,
        urgency: 'immediate',
        scheduledWithin: SUICIDAL_IDEATION_CONFIG.MANDATORY_FOLLOWUP_DURATION_MS,
        contactAttempts: [],
        completed: false
      }
    };
  }

  /**
   * SEVERITY AND RISK ASSESSMENT
   */
  private determineSeverity(response: number): SuicidalIdeationSeverity {
    switch (response) {
      case 1:
        return 'several_days';
      case 2:
        return 'more_than_half';
      case 3:
        return 'nearly_every_day';
      default:
        throw new Error(`Invalid suicidal ideation response: ${response}`);
    }
  }

  private determineRiskLevel(
    response: number,
    totalScore?: number
  ): 'moderate' | 'high' | 'critical' | 'emergency' {
    // Base risk from suicidal ideation response
    if (response === 3) {
      return totalScore && totalScore >= 20 ? 'emergency' : 'critical';
    }

    if (response === 2) {
      return totalScore && totalScore >= 20 ? 'critical' : 'high';
    }

    if (response === 1) {
      return totalScore && totalScore >= 20 ? 'high' : 'moderate';
    }

    return 'moderate';
  }

  private getSeverityText(severity: SuicidalIdeationSeverity): string {
    switch (severity) {
      case 'several_days':
        return 'thoughts of self-harm on several days';
      case 'more_than_half':
        return 'thoughts of self-harm on more than half of days';
      case 'nearly_every_day':
        return 'thoughts of self-harm nearly every day';
    }
  }

  private getUrgencyMessage(severity: SuicidalIdeationSeverity): string {
    switch (severity) {
      case 'nearly_every_day':
        return 'This indicates a very serious situation requiring immediate professional help.';
      case 'more_than_half':
        return 'This indicates a serious situation requiring prompt professional support.';
      case 'several_days':
        return 'This indicates concerning thoughts that warrant immediate attention.';
    }
  }

  /**
   * SAFETY ACTIONS AND LOGGING
   */
  private recordSafetyAction(
    interventionId: string,
    action: SuicidalIdeationActionType
  ): void {
    const intervention = this.activeInterventions.get(interventionId);
    if (intervention) {
      intervention.actionsTaken.push({
        type: action,
        timestamp: Date.now(),
        successful: true
      });

      // Update intervention status based on action
      if (action === 'contacted_988' || action === 'contacted_emergency') {
        intervention.status = 'professional_support_contacted';
      }
    }
  }

  private async completeSafetyAcknowledgment(interventionId: string): Promise<void> {
    const intervention = this.activeInterventions.get(interventionId);
    if (intervention) {
      intervention.safetyCommitment = {
        timestamp: Date.now(),
        commitment: 'I am safe and will seek help if I have thoughts of self-harm',
        followUpAgreed: true
      };
      intervention.status = 'safety_acknowledged';
      intervention.dismissible = true;

      // Log completion
      await this.logSafetyAcknowledgment(intervention);
    }
  }

  /**
   * PERFORMANCE AND VALIDATION
   */
  private validateDetectionTiming(detection: SuicidalIdeationDetection): void {
    if (detection.detectionResponseTimeMs > SUICIDAL_IDEATION_CONFIG.MAX_DETECTION_TIME_MS) {
      logSecurity('Suicidal ideation detection time violation', 'critical', {
        detectionTime: detection.detectionResponseTimeMs,
        maxTime: SUICIDAL_IDEATION_CONFIG.MAX_DETECTION_TIME_MS
      });
    }
  }

  private recordDetectionMetrics(detection: SuicidalIdeationDetection): void {
    const timestamp = Date.now();
    this.detectionMetrics.set('last_detection_time', detection.detectionResponseTimeMs);
    this.detectionMetrics.set('total_detections', (this.detectionMetrics.get('total_detections') || 0) + 1);
    this.detectionMetrics.set('last_detection_timestamp', timestamp);

    const maxTime = this.detectionMetrics.get('max_detection_time') || 0;
    if (detection.detectionResponseTimeMs > maxTime) {
      this.detectionMetrics.set('max_detection_time', detection.detectionResponseTimeMs);
    }
  }

  /**
   * EMERGENCY FAIL-SAFES
   */
  private async emergencyFailsafeIntervention(
    questionId: string,
    response: number
  ): Promise<void> {
    logError(LogCategory.SYSTEM, 'EMERGENCY FAILSAFE ACTIVATED - SUICIDAL IDEATION');

    Alert.alert(
      '🚨 EMERGENCY CRISIS SUPPORT',
      'Crisis support is available immediately. You are not alone.',
      [
        {
          text: 'Call 988 Crisis Lifeline',
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

    // Log emergency failsafe activation
    try {
      // Use SecureStore for failsafe logs (response contains PHI - suicide ideation answer)
      await SecureStore.setItemAsync(
        `emergency_failsafe_${Date.now()}`,
        JSON.stringify({
          type: 'suicidal_ideation_failsafe',
          questionId,
          response,
          timestamp: Date.now(),
          reason: 'System error during suicidal ideation detection'
        })
      );
    } catch (error) {
      logError(LogCategory.CRISIS, 'Failed to log emergency failsafe:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * FOLLOW-UP AND SCHEDULING
   */
  private async scheduleMandatoryFollowUp(
    intervention: SuicidalIdeationIntervention
  ): Promise<void> {
    try {
      const followUpSchedule = {
        interventionId: intervention.interventionId,
        userId: intervention.detection.userId,
        scheduledAt: Date.now() + SUICIDAL_IDEATION_CONFIG.MANDATORY_FOLLOWUP_DURATION_MS,
        type: 'suicidal_ideation_followup',
        urgency: 'mandatory',
        attempts: 0,
        maxAttempts: 3
      };

      await SecureStore.setItemAsync(
        `followup_${intervention.interventionId}`,
        JSON.stringify(followUpSchedule)
      );
    } catch (error) {
      logError(LogCategory.CRISIS, 'Failed to schedule mandatory follow-up:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * AUDIT AND LOGGING
   */
  private async logSuicidalIdeationDetection(
    detection: SuicidalIdeationDetection
  ): Promise<void> {
    try {
      const auditEntry = {
        type: 'suicidal_ideation_detection',
        detection,
        timestamp: Date.now(),
        clinicalNote: `PHQ-9 Q9 response: ${detection.response} (${detection.context.responseText})`,
        riskLevel: detection.riskLevel,
        immediateAction: 'Crisis intervention triggered',
        source: 'SuicidalIdeationProtocol'
      };

      await SecureStore.setItemAsync(
        `suicidal_detection_${detection.id}`,
        JSON.stringify(auditEntry)
      );
    } catch (error) {
      logError(LogCategory.CRISIS, 'Suicidal ideation detection logging failed:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async logSuicidalIdeationIntervention(
    intervention: SuicidalIdeationIntervention
  ): Promise<void> {
    try {
      const auditEntry = {
        type: 'suicidal_ideation_intervention',
        intervention,
        timestamp: Date.now(),
        clinicalNote: 'Emergency crisis intervention initiated for suicidal ideation',
        mandatoryFollowUp: true,
        source: 'SuicidalIdeationProtocol'
      };

      await SecureStore.setItemAsync(
        `suicidal_intervention_${intervention.interventionId}`,
        JSON.stringify(auditEntry)
      );
    } catch (error) {
      logError(LogCategory.CRISIS, 'Suicidal ideation intervention logging failed:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async logSafetyAcknowledgment(
    intervention: SuicidalIdeationIntervention
  ): Promise<void> {
    try {
      const auditEntry = {
        type: 'safety_acknowledgment',
        interventionId: intervention.interventionId,
        userId: intervention.detection.userId,
        safetyCommitment: intervention.safetyCommitment,
        actionsTaken: intervention.actionsTaken,
        timestamp: Date.now(),
        source: 'SuicidalIdeationProtocol'
      };

      await SecureStore.setItemAsync(
        `safety_ack_${intervention.interventionId}`,
        JSON.stringify(auditEntry)
      );
    } catch (error) {
      logError(LogCategory.CRISIS, 'Safety acknowledgment logging failed:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * UTILITY METHODS
   */
  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  /**
   * PUBLIC API METHODS
   */
  public getActiveInterventions(): SuicidalIdeationIntervention[] {
    return Array.from(this.activeInterventions.values());
  }

  public getDetectionMetrics(): Record<string, number> {
    return Object.fromEntries(this.detectionMetrics);
  }

  public async clearCompletedInterventions(): Promise<void> {
    for (const [id, intervention] of this.activeInterventions.entries()) {
      if (intervention.status === 'completed' || intervention.status === 'safety_acknowledged') {
        this.activeInterventions.delete(id);
      }
    }
  }
}

/**
 * TYPE DEFINITIONS
 */
export interface SuicidalIdeationDetection {
  id: string;
  questionId: string;
  response: number;
  severity: SuicidalIdeationSeverity;
  riskLevel: 'moderate' | 'high' | 'critical' | 'emergency';
  userId: string;
  assessmentId: string;
  detectionTimestamp: number;
  detectionResponseTimeMs: number;
  context: {
    totalScore?: number | undefined;
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    dayOfWeek: number;
    questionText: string;
    responseText: string;
  };
}

export interface SuicidalIdeationIntervention {
  interventionId: string;
  detection: SuicidalIdeationDetection;
  startTimestamp: number;
  responseTimeMs: number;
  status: SuicidalIdeationInterventionStatus;
  actionsTaken: SuicidalIdeationAction[];
  safetyCommitment: SuicidalIdeationSafetyCommitment | null;
  dismissible: boolean;
  dismissalAvailableAt: number;
  followUp: SuicidalIdeationFollowUp;
}

export type SuicidalIdeationInterventionStatus =
  | 'active'
  | 'professional_support_contacted'
  | 'safety_acknowledged'
  | 'completed';

export interface SuicidalIdeationAction {
  type: SuicidalIdeationActionType;
  timestamp: number;
  successful: boolean;
}

export type SuicidalIdeationActionType =
  | 'contacted_988'
  | 'contacted_emergency'
  | 'contacted_crisis_text'
  | 'viewed_resources'
  | 'safety_commitment'
  | 'professional_referral';

export interface SuicidalIdeationSafetyCommitment {
  timestamp: number;
  commitment: string;
  followUpAgreed: boolean;
}

export interface SuicidalIdeationFollowUp {
  required: boolean;
  urgency: 'immediate' | 'within_24h';
  scheduledWithin: number;
  contactAttempts: Array<{
    timestamp: number;
    method: string;
    successful: boolean;
  }>;
  completed: boolean;
}

// Export singleton instance
export default SuicidalIdeationProtocol.getInstance();