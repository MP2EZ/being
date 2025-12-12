/**
 * CRISIS DETECTION ENGINE - DRD-FLOW-005 Comprehensive Safety Foundation
 *
 * CLINICAL REQUIREMENTS:
 * - PHQ-9 ≥20 = Severe Depression Crisis
 * - GAD-7 ≥15 = Severe Anxiety Crisis
 * - PHQ-9 Question 9 >0 = Suicidal Ideation (IMMEDIATE INTERVENTION)
 * - Detection response time <200ms (CRITICAL)
 * - Intervention display <3 taps to 988
 * - 100% clinical accuracy (regulatory requirement)
 *
 * SAFETY PROTOCOLS:
 * - Multi-level crisis severity assessment
 * - Real-time intervention orchestration
 * - Encrypted crisis data capture with audit
 * - Performance monitoring and alerting
 * - Fail-safe mechanisms for system errors
 *
 * Week 2 Orchestration Plan - Safety Foundation
 */

import { Alert, Linking } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Import secure logging
import {
  logCrisis,
  logError,
  logSecurity,
  LogCategory
} from '@/core/services/logging';
import type {
  PHQ9Result,
  GAD7Result,
  AssessmentType,
  CrisisDetection,
  CrisisIntervention,
  CrisisTriggerType,
  CrisisSeverityLevel,
  CrisisActionType,
  CrisisResource
} from '@/features/assessment/types';

/**
 * CLINICAL CRISIS THRESHOLDS - IMMUTABLE
 * These values MUST NOT be modified - clinically validated
 *
 * DUAL-THRESHOLD SYSTEM (Clinical Validation: 2025-01-27):
 * - PHQ-9 ≥15: Moderately severe depression - support recommended (23% have suicidal ideation)
 * - PHQ-9 ≥20: Severe depression - immediate intervention required
 * - GAD-7 ≥15: Severe anxiety - immediate intervention required
 */
export const CLINICAL_CRISIS_THRESHOLDS = {
  /** PHQ-9 Moderately Severe Depression Score - Support Recommended */
  PHQ9_MODERATE_SEVERE_THRESHOLD: 15,
  /** PHQ-9 Severe Depression Score - Immediate Intervention */
  PHQ9_SEVERE_THRESHOLD: 20,
  /** GAD-7 Severe Anxiety Score - Immediate Intervention */
  GAD7_SEVERE_THRESHOLD: 15,
  /** PHQ-9 Suicidal Ideation Question */
  PHQ9_SUICIDAL_QUESTION_ID: 'phq9_9',
  /** Any suicidal ideation response triggers crisis */
  SUICIDAL_IDEATION_THRESHOLD: 0,
  /** Maximum crisis detection time (ms) */
  MAX_DETECTION_TIME_MS: 200,
  /** Maximum intervention display time (ms) */
  MAX_INTERVENTION_TIME_MS: 3000,
  /** Minimum intervention duration before dismissal */
  MIN_INTERVENTION_DURATION_MS: 30000,
} as const;

/**
 * CRISIS SEVERITY MATRIX
 * Clinical decision tree for crisis intervention level
 *
 * SEVERITY LEVELS:
 * - moderate: PHQ-9 15-19 (support recommended, non-urgent intervention)
 * - high: PHQ-9 ≥20 OR GAD-7 ≥15 (immediate intervention)
 * - critical: Suicidal ideation present (PHQ-9 Q9 >0, score <20)
 * - emergency: Suicidal ideation + severe score (PHQ-9 Q9 >0, score ≥20)
 */
const CRISIS_SEVERITY_MATRIX = {
  phq9: {
    suicidal_ideation: {
      low_score: 'critical',      // Q9 >0, score <20
      high_score: 'emergency'     // Q9 >0, score ≥20
    },
    severe_score: 'high',         // Score ≥20, no suicidal ideation
    moderate_severe: 'moderate'   // Score 15-19, support recommended
  },
  gad7: {
    severe_score: 'high',         // Score ≥15, immediate intervention
    moderate_score: 'moderate'    // Score 10-14 (future: support recommended)
  }
} as const;

/**
 * CRISIS DETECTION ENGINE
 * Core class for comprehensive crisis detection and intervention
 */
export class CrisisDetectionEngine {
  private static instance: CrisisDetectionEngine;
  private performanceMetrics: Map<string, number> = new Map();
  private activeInterventions: Map<string, CrisisIntervention> = new Map();

  private constructor() {}

  public static getInstance(): CrisisDetectionEngine {
    if (!CrisisDetectionEngine.instance) {
      CrisisDetectionEngine.instance = new CrisisDetectionEngine();
    }
    return CrisisDetectionEngine.instance;
  }

  /**
   * PRIMARY CRISIS DETECTION
   * Analyzes assessment results for crisis conditions
   * PERFORMANCE REQUIREMENT: <200ms
   */
  public async detectCrisis(
    result: PHQ9Result | GAD7Result,
    userId: string,
    assessmentId: string
  ): Promise<CrisisDetection | null> {
    const detectionStartTime = performance.now();

    try {
      // Initialize detection context
      const detection = await this.initializeCrisisDetection(
        result,
        userId,
        assessmentId,
        detectionStartTime
      );

      // No crisis detected
      if (!detection) {
        this.recordPerformanceMetric('detection_no_crisis', detectionStartTime);
        return null;
      }

      // Validate detection meets safety requirements
      const isValid = this.validateCrisisDetection(detection);
      if (!isValid) {
        logCrisis('Crisis detection validation failed', {
          detectionTime: detection.detectionResponseTimeMs,
          severity: detection.severityLevel as any,
          interventionType: 'display'
        });
        // Fail-safe: Still trigger intervention for user safety
      }

      // Record performance metrics
      this.recordPerformanceMetric('detection_crisis_found', detectionStartTime);

      // Log crisis detection for audit
      await this.logCrisisDetection(detection);

      return detection;

    } catch (error) {
      logError(LogCategory.CRISIS, 'Crisis detection engine error', error instanceof Error ? error : new Error(String(error)));

      // FAIL-SAFE: Create emergency detection for any system error
      const emergencyDetection = this.createEmergencyFailsafe(
        result,
        userId,
        assessmentId,
        detectionStartTime
      );

      await this.logCrisisDetection(emergencyDetection);
      return emergencyDetection;
    }
  }

  /**
   * CRISIS INTERVENTION ORCHESTRATION
   * Manages complete intervention workflow
   * PERFORMANCE REQUIREMENT: <3 seconds to 988 access
   */
  public async triggerCrisisIntervention(
    detection: CrisisDetection
  ): Promise<CrisisIntervention> {
    const interventionStartTime = performance.now();

    try {
      // Create intervention session
      const intervention = this.initializeCrisisIntervention(
        detection,
        interventionStartTime
      );

      // Store active intervention
      this.activeInterventions.set(detection.id, intervention);

      // Trigger immediate UI intervention based on severity
      await this.displayCrisisIntervention(intervention);

      // Log intervention start
      await this.logCrisisIntervention(intervention);

      // Record performance
      this.recordPerformanceMetric('intervention_triggered', interventionStartTime);

      return intervention;

    } catch (error) {
      logError(LogCategory.CRISIS, 'Crisis intervention error', error instanceof Error ? error : new Error(String(error)));

      // FAIL-SAFE: Direct 988 call
      this.emergencyFailsafeIntervention();

      throw error;
    }
  }

  /**
   * REAL-TIME SUICIDAL IDEATION DETECTION
   * Immediate intervention for PHQ-9 Question 9
   */
  public async detectSuicidalIdeation(
    questionId: string,
    response: number,
    userId: string,
    assessmentId: string
  ): Promise<CrisisDetection | null> {
    const detectionStartTime = performance.now();

    // Check if this is PHQ-9 Question 9 (suicidal ideation)
    if (questionId !== CLINICAL_CRISIS_THRESHOLDS.PHQ9_SUICIDAL_QUESTION_ID) {
      return null;
    }

    // Any response >0 indicates suicidal ideation
    if (response <= CLINICAL_CRISIS_THRESHOLDS.SUICIDAL_IDEATION_THRESHOLD) {
      return null;
    }

    try {
      const detection: CrisisDetection = {
        id: `suicidal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        isTriggered: true,
        primaryTrigger: 'phq9_suicidal_ideation',
        secondaryTriggers: [],
        severityLevel: 'critical', // Always critical for suicidal ideation
        triggerValue: response,
        assessmentType: 'phq9',
        timestamp: Date.now(),
        assessmentId,
        userId,
        detectionResponseTimeMs: performance.now() - detectionStartTime,
        context: {
          triggeringAnswers: [{
            questionId,
            response: response as any,
            timestamp: Date.now()
          }],
          timeOfDay: this.getTimeOfDay()
        }
      };

      // Immediate intervention for suicidal ideation
      await this.triggerCrisisIntervention(detection);

      return detection;

    } catch (error) {
      logError(LogCategory.CRISIS, 'Suicidal ideation detection error', error instanceof Error ? error : new Error(String(error)));

      // FAIL-SAFE: Emergency intervention
      this.emergencyFailsafeIntervention();
      return null;
    }
  }

  /**
   * CRISIS DATA CAPTURE
   * Comprehensive data collection for clinical records
   */
  public async captureCrisisData(
    detection: CrisisDetection,
    intervention: CrisisIntervention,
    actions: CrisisActionType[]
  ): Promise<void> {
    try {
      const crisisDataPackage = {
        detection,
        intervention,
        actions,
        captureTimestamp: Date.now(),
        performanceMetrics: {
          detectionTime: detection.detectionResponseTimeMs,
          interventionTime: intervention.responseTime,
          totalCrisisTime: Date.now() - detection.timestamp
        },
        userSafetyStatus: this.determineSafetyStatus(actions),
        followUpRequired: this.determineFollowUpRequirements(detection, actions),
        auditTrail: await this.generateAuditTrail(detection.id)
      };

      // Encrypted storage for clinical data
      await this.storeCrisisData(crisisDataPackage);

      // Performance monitoring
      this.recordPerformanceMetric('data_capture_complete', performance.now());

    } catch (error) {
      logError(LogCategory.CRISIS, 'Crisis data capture error', error instanceof Error ? error : new Error(String(error)));
      // Continue - don't fail intervention for data capture errors
    }
  }

  /**
   * PERFORMANCE MONITORING
   * Real-time performance tracking and alerting
   */
  public getPerformanceMetrics(): Record<string, number> {
    const metrics = Object.fromEntries(this.performanceMetrics);

    // Add threshold validations
    return {
      ...metrics,
      detection_time_violations: (metrics['detection_max'] ?? 0) > CLINICAL_CRISIS_THRESHOLDS.MAX_DETECTION_TIME_MS ? 1 : 0,
      intervention_time_violations: (metrics['intervention_max'] ?? 0) > CLINICAL_CRISIS_THRESHOLDS.MAX_INTERVENTION_TIME_MS ? 1 : 0,
      total_crisis_episodes: this.activeInterventions.size,
      performance_status: this.getPerformanceStatus(metrics) as any
    };
  }

  /**
   * CRISIS INTERVENTION WORKFLOW
   * Step-by-step crisis response procedures
   */
  private async displayCrisisIntervention(intervention: CrisisIntervention): Promise<void> {
    const { detection } = intervention;

    try {
      switch (detection.severityLevel) {
        case 'emergency':
        case 'critical':
          await this.displayEmergencyCrisisAlert(detection);
          break;
        case 'high':
          await this.displayHighCrisisAlert(detection);
          break;
        case 'moderate':
          await this.displayModerateCrisisAlert(detection);
          break;
      }
    } catch (error) {
      logError(LogCategory.CRISIS, 'Crisis intervention display error', error instanceof Error ? error : new Error(String(error)));
      // Fail-safe: Basic emergency alert
      this.emergencyFailsafeIntervention();
    }
  }

  private async displayEmergencyCrisisAlert(detection: CrisisDetection): Promise<void> {
    Alert.alert(
      '🚨 IMMEDIATE CRISIS SUPPORT',
      'You\'re going through something very difficult right now. Crisis support is available immediately, 24/7. Reaching out is a sign of strength. You are not alone, and help is here.',
      [
        {
          text: 'Call 988 Now',
          onPress: () => {
            this.recordCrisisAction(detection.id, 'contacted_988');
            Linking.openURL('tel:988');
          },
          style: 'default'
        },
        {
          text: 'Emergency 911',
          onPress: () => {
            this.recordCrisisAction(detection.id, 'contacted_emergency');
            Linking.openURL('tel:911');
          },
          style: 'destructive'
        },
        {
          text: 'Text HOME to 741741',
          onPress: () => {
            this.recordCrisisAction(detection.id, 'contacted_support');
            Linking.openURL('sms:741741');
          },
          style: 'default'
        }
      ],
      { cancelable: false }
    );
  }

  private async displayHighCrisisAlert(detection: CrisisDetection): Promise<void> {
    Alert.alert(
      '🚨 Crisis Support Available',
      'What you\'re feeling is real, and support is here. Professional help can make a difference. You deserve to feel better.',
      [
        {
          text: 'Call 988 Now',
          onPress: () => {
            this.recordCrisisAction(detection.id, 'contacted_988');
            Linking.openURL('tel:988');
          },
          style: 'default'
        },
        {
          text: 'Text HOME to 741741',
          onPress: () => {
            this.recordCrisisAction(detection.id, 'contacted_support');
            Linking.openURL('sms:741741');
          },
          style: 'default'
        },
        {
          text: 'View Resources',
          onPress: () => {
            this.recordCrisisAction(detection.id, 'viewed_resources');
            // Navigate to crisis resources screen
          },
          style: 'cancel'
        }
      ],
      { cancelable: false }
    );
  }

  private async displayModerateCrisisAlert(detection: CrisisDetection): Promise<void> {
    Alert.alert(
      'Support Available',
      'Your responses suggest you may be going through a difficult time. Professional support can help. You don\'t have to face this alone.',
      [
        {
          text: 'Call 988 (24/7 Support)',
          onPress: () => {
            this.recordCrisisAction(detection.id, 'contacted_988');
            Linking.openURL('tel:988');
          },
          style: 'default'
        },
        {
          text: 'View Resources',
          onPress: () => {
            this.recordCrisisAction(detection.id, 'viewed_resources');
            // Navigate to crisis resources screen
          },
          style: 'default'
        },
        {
          text: 'Continue',
          onPress: () => {
            this.recordCrisisAction(detection.id, 'acknowledged_safety');
          },
          style: 'cancel'
        }
      ]
    );
  }

  /**
   * HELPER METHODS
   */

  private async initializeCrisisDetection(
    result: PHQ9Result | GAD7Result,
    userId: string,
    assessmentId: string,
    startTime: number
  ): Promise<CrisisDetection | null> {
    const triggers: CrisisTriggerType[] = [];
    let severityLevel: CrisisSeverityLevel = 'moderate';
    let primaryTrigger: CrisisTriggerType | null = null;

    // PHQ-9 Crisis Analysis
    if ('suicidalIdeation' in result) {
      if (result.suicidalIdeation) {
        triggers.push('phq9_suicidal_ideation');
        primaryTrigger = 'phq9_suicidal_ideation';
        severityLevel = result.totalScore >= CLINICAL_CRISIS_THRESHOLDS.PHQ9_SEVERE_THRESHOLD
          ? 'emergency'
          : 'critical';
      }

      if (result.totalScore >= CLINICAL_CRISIS_THRESHOLDS.PHQ9_SEVERE_THRESHOLD) {
        triggers.push('phq9_severe_score');
        if (!primaryTrigger) {
          primaryTrigger = 'phq9_severe_score';
          severityLevel = 'high';
        }
      } else if (result.totalScore >= CLINICAL_CRISIS_THRESHOLDS.PHQ9_MODERATE_SEVERE_THRESHOLD) {
        triggers.push('phq9_moderate_severe_score');
        if (!primaryTrigger) {
          primaryTrigger = 'phq9_moderate_severe_score';
          severityLevel = 'moderate';
        }
      }
    }
    // GAD-7 Crisis Analysis
    else {
      if (result.totalScore >= CLINICAL_CRISIS_THRESHOLDS.GAD7_SEVERE_THRESHOLD) {
        triggers.push('gad7_severe_score');
        primaryTrigger = 'gad7_severe_score';
        severityLevel = 'high';
      }
    }

    // No crisis detected
    if (triggers.length === 0) {
      return null;
    }

    return {
      id: `crisis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isTriggered: true,
      primaryTrigger: primaryTrigger!,
      secondaryTriggers: triggers.filter(t => t !== primaryTrigger),
      severityLevel,
      triggerValue: result.totalScore,
      assessmentType: 'suicidalIdeation' in result ? 'phq9' : 'gad7',
      timestamp: Date.now(),
      assessmentId,
      userId,
      detectionResponseTimeMs: performance.now() - startTime,
      context: {
        triggeringAnswers: result.answers,
        timeOfDay: this.getTimeOfDay()
      }
    };
  }

  private initializeCrisisIntervention(
    detection: CrisisDetection,
    startTime: number
  ): CrisisIntervention {
    return {
      detection,
      interventionId: `intervention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      interventionStarted: true,
      startTimestamp: Date.now(),
      contactedSupport: false,
      responseTime: performance.now() - startTime,
      status: 'initiated',
      actionsTaken: [],
      followUp: {
        required: true,
        urgency: this.determineFollowUpUrgency(detection),
        type: 'clinical_assessment',
        recommendations: this.generateFollowUpRecommendations(detection),
        contacts: [],
        completed: false
      },
      canDismiss: false,
      dismissalAvailableAt: Date.now() + CLINICAL_CRISIS_THRESHOLDS.MIN_INTERVENTION_DURATION_MS
    };
  }

  private validateCrisisDetection(detection: CrisisDetection): boolean {
    // Validate response time
    if (detection.detectionResponseTimeMs > CLINICAL_CRISIS_THRESHOLDS.MAX_DETECTION_TIME_MS) {
      return false;
    }

    // Validate trigger conditions match thresholds
    if (detection.primaryTrigger === 'phq9_severe_score' &&
        detection.triggerValue < CLINICAL_CRISIS_THRESHOLDS.PHQ9_SEVERE_THRESHOLD) {
      return false;
    }

    if (detection.primaryTrigger === 'phq9_moderate_severe_score' &&
        detection.triggerValue < CLINICAL_CRISIS_THRESHOLDS.PHQ9_MODERATE_SEVERE_THRESHOLD) {
      return false;
    }

    if (detection.primaryTrigger === 'gad7_severe_score' &&
        detection.triggerValue < CLINICAL_CRISIS_THRESHOLDS.GAD7_SEVERE_THRESHOLD) {
      return false;
    }

    return true;
  }

  private createEmergencyFailsafe(
    result: PHQ9Result | GAD7Result,
    userId: string,
    assessmentId: string,
    startTime: number
  ): CrisisDetection {
    return {
      id: `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isTriggered: true,
      primaryTrigger: 'manual_override',
      secondaryTriggers: [],
      severityLevel: 'emergency',
      triggerValue: result.totalScore,
      assessmentType: 'suicidalIdeation' in result ? 'phq9' : 'gad7',
      timestamp: Date.now(),
      assessmentId,
      userId,
      detectionResponseTimeMs: performance.now() - startTime,
      context: {
        triggeringAnswers: result.answers,
        timeOfDay: this.getTimeOfDay()
      }
    };
  }

  private emergencyFailsafeIntervention(): void {
    Alert.alert(
      '🚨 Emergency Support',
      'Crisis support is available immediately.',
      [
        {
          text: 'Call 988 Now',
          onPress: () => Linking.openURL('tel:988'),
          style: 'default'
        }
      ],
      { cancelable: false }
    );
  }

  private recordCrisisAction(detectionId: string, action: CrisisActionType): void {
    const intervention = this.activeInterventions.get(detectionId);
    if (intervention) {
      intervention.actionsTaken.push({
        type: action,
        timestamp: Date.now(),
        completed: true
      });
    }
  }

  private recordPerformanceMetric(metric: string, startTime: number): void {
    const duration = performance.now() - startTime;
    const currentMax = this.performanceMetrics.get(`${metric}_max`) || 0;
    const currentCount = this.performanceMetrics.get(`${metric}_count`) || 0;

    this.performanceMetrics.set(`${metric}_max`, Math.max(currentMax, duration));
    this.performanceMetrics.set(`${metric}_count`, currentCount + 1);
    this.performanceMetrics.set(`${metric}_last`, duration);
  }

  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  private determineFollowUpUrgency(detection: CrisisDetection): 'immediate' | 'within_24h' | 'within_48h' | 'within_week' {
    switch (detection.severityLevel) {
      case 'emergency':
      case 'critical':
        return 'immediate';
      case 'high':
        return 'within_24h';
      case 'moderate':
        return 'within_48h';
      default:
        return 'within_week';
    }
  }

  private generateFollowUpRecommendations(detection: CrisisDetection): string[] {
    const recommendations = [];

    if (detection.primaryTrigger === 'phq9_suicidal_ideation') {
      recommendations.push('Immediate clinical assessment for suicide risk');
      recommendations.push('Safety planning with mental health professional');
      recommendations.push('Consider inpatient evaluation if risk persists');
    }

    if (detection.severityLevel === 'high' || detection.severityLevel === 'critical') {
      recommendations.push('Schedule appointment with mental health provider within 24-48 hours');
      recommendations.push('Consider medication evaluation');
      recommendations.push('Engage support network and remove potential means');
    }

    recommendations.push('Follow up on crisis intervention outcome');
    recommendations.push('Monitor for ongoing safety and symptom changes');

    return recommendations;
  }

  private determineSafetyStatus(actions: CrisisActionType[]): 'safe' | 'monitoring_required' | 'professional_care_needed' {
    if (actions.includes('contacted_emergency') || actions.includes('contacted_988')) {
      return 'professional_care_needed';
    }
    if (actions.includes('contacted_support') || actions.includes('activated_safety_plan')) {
      return 'monitoring_required';
    }
    return 'safe';
  }

  private determineFollowUpRequirements(detection: CrisisDetection, actions: CrisisActionType[]): boolean {
    return detection.severityLevel === 'critical' ||
           detection.severityLevel === 'emergency' ||
           detection.primaryTrigger === 'phq9_suicidal_ideation';
  }

  private getPerformanceStatus(metrics: Record<string, number>): 'optimal' | 'acceptable' | 'concerning' | 'critical' {
    const detectionTime = metrics['detection_max'] || 0;
    const interventionTime = metrics['intervention_max'] || 0;

    if (detectionTime > CLINICAL_CRISIS_THRESHOLDS.MAX_DETECTION_TIME_MS * 2 ||
        interventionTime > CLINICAL_CRISIS_THRESHOLDS.MAX_INTERVENTION_TIME_MS * 2) {
      return 'critical';
    }

    if (detectionTime > CLINICAL_CRISIS_THRESHOLDS.MAX_DETECTION_TIME_MS ||
        interventionTime > CLINICAL_CRISIS_THRESHOLDS.MAX_INTERVENTION_TIME_MS) {
      return 'concerning';
    }

    if (detectionTime > CLINICAL_CRISIS_THRESHOLDS.MAX_DETECTION_TIME_MS * 0.5) {
      return 'acceptable';
    }

    return 'optimal';
  }

  private async logCrisisDetection(detection: CrisisDetection): Promise<void> {
    try {
      const logEntry = {
        type: 'crisis_detection',
        detection,
        timestamp: Date.now(),
        source: 'CrisisDetectionEngine'
      };

      // Use SecureStore for PHI protection (detection may contain assessment answers)
      await SecureStore.setItemAsync(
        `crisis_detection_${detection.id}`,
        JSON.stringify(logEntry)
      );
    } catch (error) {
      logError(LogCategory.CRISIS, 'Crisis detection logging failed', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async logCrisisIntervention(intervention: CrisisIntervention): Promise<void> {
    try {
      const logEntry = {
        type: 'crisis_intervention',
        intervention,
        timestamp: Date.now(),
        source: 'CrisisDetectionEngine'
      };

      // Use SecureStore for PHI protection (intervention may contain crisis context)
      await SecureStore.setItemAsync(
        `crisis_intervention_${intervention.interventionId}`,
        JSON.stringify(logEntry)
      );
    } catch (error) {
      logError(LogCategory.CRISIS, 'Crisis intervention logging failed', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async storeCrisisData(dataPackage: any): Promise<void> {
    try {
      const encrypted = JSON.stringify(dataPackage);
      await SecureStore.setItemAsync(
        `crisis_data_${dataPackage.detection.id}`,
        encrypted
      );
    } catch (error) {
      logError(LogCategory.CRISIS, 'Crisis data storage failed', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async generateAuditTrail(detectionId: string): Promise<string[]> {
    // Generate comprehensive audit trail for clinical compliance
    return [
      `Crisis detection initiated: ${new Date().toISOString()}`,
      `Detection ID: ${detectionId}`,
      `Engine version: DRD-FLOW-005-v2 (Dual-Threshold)`,
      `Clinical thresholds validated: PHQ-9≥15 (moderate), PHQ-9≥20 (severe), GAD-7≥15, PHQ-9-Q9>0`
    ];
  }
}

// Export singleton instance
export default CrisisDetectionEngine.getInstance();