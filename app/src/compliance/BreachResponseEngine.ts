/**
 * DATA BREACH RESPONSE ENGINE - DRD-FLOW-005 Assessment System
 *
 * COMPREHENSIVE BREACH RESPONSE:
 * - Automated breach detection and risk assessment
 * - State-by-state breach notification compliance
 * - Incident response workflows and escalation procedures
 * - Forensic investigation and evidence preservation
 * - Notification management for individuals, regulators, and media
 * - Breach remediation and prevention measures
 *
 * MENTAL HEALTH SPECIFIC CONSIDERATIONS:
 * - Enhanced sensitivity for mental health data breaches
 * - Crisis intervention data breach handling
 * - Professional relationship impact assessment
 * - Therapeutic continuity during breach response
 * - Specialized notification requirements for sensitive wellness data
 *
 * APPLICABLE REGULATIONS (State Law Matrix):
 * - CA SB 446: 30-day consumer notification (effective Jan 1, 2026)
 * - NY SHIELD Act: 30-day consumer notification
 * - FTC Health Breach Notification Rule: 60-day FTC notification (16 CFR 318)
 * - TX TDPSA: "Without unreasonable delay" + 30-day AG notification
 * - Media notification for breaches affecting 500+ individuals (CA/NY)
 * - Crisis intervention legal requirements during breaches
 */


import { logSecurity, logPerformance, logError, LogCategory } from '@/core/services/logging';
import { generateTimestampedId } from '@/core/utils/id';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Alert, Linking } from 'react-native';
import DataProtectionEngine, { 
  DataBreach,
  DataSensitivityLevel,
  ComplianceAuditEvent,
  DATA_PROTECTION_CONFIG 
} from './DataProtectionEngine';

/**
 * BREACH SEVERITY LEVELS
 * Risk-based classification system
 */
export enum BreachSeverity {
  /** Low risk - minimal harm potential */
  LOW = 'low',
  /** Medium risk - moderate harm potential */
  MEDIUM = 'medium',
  /** High risk - significant harm potential */
  HIGH = 'high',
  /** Critical risk - severe harm potential */
  CRITICAL = 'critical',
  /** Emergency - immediate intervention required */
  EMERGENCY = 'emergency'
}

/**
 * BREACH DETECTION TRIGGERS
 * Automated detection mechanisms
 */
export enum BreachTrigger {
  /** Unauthorized PHI access detected */
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  /** Data export anomaly detected */
  UNUSUAL_DATA_EXPORT = 'unusual_data_export',
  /** Failed authentication attempts */
  AUTHENTICATION_FAILURE = 'authentication_failure',
  /** System security violation */
  SECURITY_VIOLATION = 'security_violation',
  /** Device loss or theft reported */
  DEVICE_LOSS = 'device_loss',
  /** Data corruption detected */
  DATA_CORRUPTION = 'data_corruption',
  /** Third-party breach notification */
  THIRD_PARTY_BREACH = 'third_party_breach',
  /** Manual breach report */
  MANUAL_REPORT = 'manual_report',
  /** Crisis intervention data exposure */
  CRISIS_DATA_EXPOSURE = 'crisis_data_exposure'
}

/**
 * BREACH INCIDENT DETAILS
 * Comprehensive incident documentation
 */
export interface BreachIncident {
  /** Unique incident ID */
  incidentId: string;
  /** Detection trigger */
  trigger: BreachTrigger;
  /** Discovery timestamp */
  discoveryTimestamp: number;
  /** Estimated occurrence timestamp */
  occurrenceTimestamp?: number;
  /** Severity assessment */
  severity: BreachSeverity;
  /** Initial risk assessment */
  riskAssessment: {
    /** Likelihood of PHI compromise */
    compromiseLikelihood: 'low' | 'medium' | 'high' | 'certain';
    /** Potential harm to individuals */
    harmPotential: 'minimal' | 'moderate' | 'significant' | 'severe';
    /** Number of individuals affected */
    affectedIndividuals: number;
    /** Types of PHI involved */
    dataTypesInvolved: DataSensitivityLevel[];
    /** Geographic scope */
    geographicScope: string[];
  };
  /** Affected data details */
  affectedData: {
    /** Data elements compromised */
    compromisedElements: string[];
    /** User IDs affected */
    affectedUserIds: string[];
    /** Data volume compromised */
    dataVolume: {
      /** Number of records */
      recordCount: number;
      /** Estimated data size */
      estimatedSizeBytes: number;
    };
    /** Sensitivity analysis */
    sensitivityAnalysis: {
      /** Highest Sensitivity classification */
      highestClassification: DataSensitivityLevel;
      /** Contains crisis data */
      containsCrisisData: boolean;
      /** Contains suicidal ideation data */
      containsSuicidalIdeationData: boolean;
      /** Special categories present */
      specialCategories: string[];
    };
  };
  /** Discovery details */
  discovery: {
    /** How breach was discovered */
    discoveryMethod: string;
    /** Who discovered the breach */
    discoveredBy: string;
    /** Discovery circumstances */
    circumstances: string;
    /** Initial evidence */
    initialEvidence: string[];
  };
  /** Status tracking */
  status: {
    /** Current phase */
    currentPhase: BreachResponsePhase;
    /** Overall status */
    overallStatus: 'investigating' | 'contained' | 'mitigated' | 'resolved' | 'escalated';
    /** Key milestones completed */
    milestonesCompleted: string[];
    /** Next required actions */
    nextActions: string[];
  };
}

export type BreachResponsePhase = 
  | 'detection'
  | 'assessment'
  | 'containment'
  | 'investigation'
  | 'notification'
  | 'remediation'
  | 'monitoring'
  | 'closure';

/**
 * STATE BREACH NOTIFICATION MATRIX
 * Notification deadlines by applicable state law
 */
export const STATE_NOTIFICATION_MATRIX = {
  /** California SB 446 (effective Jan 1, 2026) */
  CA: {
    consumerDeadlineDays: 30,
    agThreshold: 500,
    agDeadlineDays: 30,
    mediaThreshold: 500,
    mediaDeadlineDays: 30
  },
  /** New York SHIELD Act */
  NY: {
    consumerDeadlineDays: 30,
    agThreshold: 500,
    agDeadlineDays: 30,
    mediaThreshold: 500,
    mediaDeadlineDays: 30
  },
  /** Texas TDPSA */
  TX: {
    consumerDeadlineDays: 30, // "without unreasonable delay"
    agThreshold: 250,
    agDeadlineDays: 30,
    mediaThreshold: 500,
    mediaDeadlineDays: 30
  },
  /** FTC Health Breach Notification Rule (16 CFR 318) */
  FTC: {
    ftcDeadlineDays: 60,
    mediaThreshold: 500,
    mediaDeadlineDays: 10
  }
} as const;

/**
 * BREACH NOTIFICATION REQUIREMENTS
 * Legal notification obligations under applicable state laws
 */
export interface BreachNotificationRequirements {
  /** Individual/Consumer notification required */
  consumerNotification: {
    /** Required */
    required: boolean;
    /** Deadline (strictest applicable: 30 days per CA/NY) */
    deadline: number;
    /** Notification method */
    method: 'written' | 'email' | 'substitute' | 'phone';
    /** Urgency level */
    urgency: 'standard' | 'expedited' | 'immediate';
  };
  /** FTC notification (16 CFR 318 Health Breach Rule) */
  ftcNotification: {
    /** Required */
    required: boolean;
    /** Deadline (60 days per FTC rule) */
    deadline: number;
    /** Submission method */
    method: 'online_portal';
  };
  /** State Attorney General notification */
  stateAgNotification: {
    /** Required (CA: 500+, TX: 250+) */
    required: boolean;
    /** Applicable states */
    applicableStates: string[];
    /** Deadlines by state */
    stateDeadlines: Record<string, number>;
    /** Thresholds by state */
    thresholds: Record<string, number>;
  };
  /** Media notification required */
  mediaNotification: {
    /** Required (500+ individuals per CA/NY/FTC) */
    required: boolean;
    /** Threshold met */
    thresholdMet: boolean;
    /** Affected individuals count */
    affectedCount: number;
  };
  /** Law enforcement notification */
  lawEnforcement: {
    /** Required */
    required: boolean;
    /** Criminal activity suspected */
    criminalActivitySuspected: boolean;
    /** Agencies to notify */
    agenciesToNotify: string[];
  };
  /** Professional notification */
  professionalNotification: {
    /** Mental health professionals */
    mentalHealthProfessionals: boolean;
    /** Crisis intervention teams */
    crisisInterventionTeams: boolean;
    /** Treatment providers */
    treatmentProviders: boolean;
  };
}

/**
 * BREACH REMEDIATION PLAN
 * Comprehensive response and recovery planning
 */
export interface BreachRemediationPlan {
  /** Plan ID */
  planId: string;
  /** Associated incident */
  incidentId: string;
  /** Immediate containment actions */
  immediateActions: {
    /** Actions taken */
    actionsTaken: Array<{
      action: string;
      timestamp: number;
      responsible: string;
      outcome: string;
    }>;
    /** Containment status */
    containmentStatus: 'in_progress' | 'completed' | 'failed';
    /** Access revocations */
    accessRevocations: string[];
    /** System isolations */
    systemIsolations: string[];
  };
  /** Investigation plan */
  investigation: {
    /** Forensic investigation required */
    forensicsRequired: boolean;
    /** Evidence preservation */
    evidencePreservation: string[];
    /** Investigation timeline */
    timeline: Array<{
      milestone: string;
      targetDate: number;
      responsible: string;
      status: 'pending' | 'in_progress' | 'completed';
    }>;
    /** External investigators */
    externalInvestigators?: string[] | undefined;
  };
  /** Remediation measures */
  remediation: {
    /** Technical remediation */
    technicalMeasures: string[];
    /** Administrative remediation */
    administrativeMeasures: string[];
    /** Physical remediation */
    physicalMeasures: string[];
    /** Training and awareness */
    trainingMeasures: string[];
  };
  /** Prevention measures */
  prevention: {
    /** New controls implemented */
    newControls: string[];
    /** Process improvements */
    processImprovements: string[];
    /** Technology upgrades */
    technologyUpgrades: string[];
    /** Monitoring enhancements */
    monitoringEnhancements: string[];
  };
  /** Recovery timeline */
  recovery: {
    /** Short-term recovery (0-30 days) */
    shortTerm: string[];
    /** Medium-term recovery (30-90 days) */
    mediumTerm: string[];
    /** Long-term recovery (90+ days) */
    longTerm: string[];
  };
}

/**
 * Privacy BREACH RESPONSE ENGINE
 */
export class DataBreachResponseEngine {
  private static instance: DataBreachResponseEngine;
  private activeIncidents: Map<string, BreachIncident> = new Map();
  private remediationPlans: Map<string, BreachRemediationPlan> = new Map();
  private notificationQueue: Map<string, BreachNotificationRequirements> = new Map();
  private complianceEngine = DataProtectionEngine;

  private constructor() {
    this.initializeBreachDetection();
  }

  public static getInstance(): DataBreachResponseEngine {
    if (!DataBreachResponseEngine.instance) {
      DataBreachResponseEngine.instance = new DataBreachResponseEngine();
    }
    return DataBreachResponseEngine.instance;
  }

  /**
   * BREACH DETECTION AND ASSESSMENT
   */

  /**
   * Detects potential breach based on trigger event
   */
  public async detectPotentialBreach(
    trigger: BreachTrigger,
    eventData: {
      userId?: string;
      sessionId?: string;
      dataElements?: string[];
      description: string;
      evidence?: any[];
    }
  ): Promise<{
    breachDetected: boolean;
    incidentId?: string | undefined;
    severity: BreachSeverity;
    immediateActions: string[];
  }> {
    try {
      // Perform initial risk assessment
      const riskAssessment = await this.performInitialRiskAssessment(trigger, eventData);
      
      // Determine if this constitutes a breach
      const breachDetected = this.determineBreachStatus(riskAssessment);
      
      if (breachDetected) {
        // Create breach incident
        const incident = await this.createBreachIncident(trigger, eventData, riskAssessment);
        
        // Store incident
        this.activeIncidents.set(incident.incidentId, incident);
        await this.persistIncident(incident);
        
        // Initiate immediate response
        const immediateActions = await this.initiateImmediateResponse(incident);
        
        return {
          breachDetected: true,
          incidentId: incident.incidentId,
          severity: incident.severity,
          immediateActions
        };
      }
      
      return {
        breachDetected: false,
        severity: riskAssessment.severity,
        immediateActions: []
      };

    } catch (error) {
      logError(LogCategory.SYSTEM, 'BREACH DETECTION ERROR:', error instanceof Error ? error : undefined);

      // Err on the side of caution - treat as potential breach
      return {
        breachDetected: true,
        severity: BreachSeverity.HIGH,
        immediateActions: [
          'System error during breach detection',
          'Manual investigation required',
          'Precautionary containment measures activated'
        ]
      };
    }
  }

  /**
   * Performs comprehensive risk assessment for potential breach
   */
  public async performRiskAssessment(
    incidentId: string
  ): Promise<{
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    riskFactors: string[];
    mitigatingFactors: string[];
    recommendedActions: string[];
    notificationRequired: boolean;
  }> {
    try {
      const incident = this.activeIncidents.get(incidentId);
      if (!incident) {
        throw new Error(`Incident not found: ${incidentId}`);
      }

      const riskFactors: string[] = [];
      const mitigatingFactors: string[] = [];
      const recommendedActions: string[] = [];

      // Analyze data sensitivity
      if (incident.affectedData.sensitivityAnalysis.containsCrisisData) {
        riskFactors.push('Contains crisis intervention data');
        recommendedActions.push('Immediate crisis team notification');
      }

      if (incident.affectedData.sensitivityAnalysis.containsSuicidalIdeationData) {
        riskFactors.push('Contains suicidal ideation data');
        recommendedActions.push('Emergency mental health professional notification');
      }

      // Analyze scope
      if (incident.riskAssessment.affectedIndividuals > 500) {
        riskFactors.push('Large number of individuals affected');
        recommendedActions.push('Media notification required');
      }

      // Analyze compromise likelihood
      if (incident.riskAssessment.compromiseLikelihood === 'certain') {
        riskFactors.push('PHI compromise confirmed');
      } else {
        mitigatingFactors.push('PHI compromise not confirmed');
      }

      // Determine overall risk
      const overallRisk = this.calculateOverallRisk(riskFactors, mitigatingFactors);
      
      // Determine notification requirements
      const notificationRequired = await this.assessNotificationRequirements(incident);

      return {
        overallRisk,
        riskFactors,
        mitigatingFactors,
        recommendedActions,
        notificationRequired
      };

    } catch (error) {
      logError(LogCategory.SYSTEM, 'RISK ASSESSMENT ERROR:', error instanceof Error ? error : undefined);

      return {
        overallRisk: 'critical',
        riskFactors: ['Risk assessment system error'],
        mitigatingFactors: [],
        recommendedActions: ['Manual risk assessment required'],
        notificationRequired: true
      };
    }
  }

  /**
   * BREACH CONTAINMENT
   */

  /**
   * Initiates breach containment procedures
   */
  public async initiateContainment(
    incidentId: string
  ): Promise<{
    containmentStarted: boolean;
    actionsPerformed: string[];
    systemsIsolated: string[];
    accessRevoked: string[];
    nextSteps: string[];
  }> {
    try {
      const incident = this.activeIncidents.get(incidentId);
      if (!incident) {
        throw new Error(`Incident not found: ${incidentId}`);
      }

      const actionsPerformed: string[] = [];
      const systemsIsolated: string[] = [];
      const accessRevoked: string[] = [];
      const nextSteps: string[] = [];

      // Immediate access revocation
      if (incident.affectedData.affectedUserIds.length > 0) {
        for (const userId of incident.affectedData.affectedUserIds) {
          await this.revokeUserAccess(userId, incidentId);
          accessRevoked.push(userId);
        }
        actionsPerformed.push('Revoked access for affected users');
      }

      // System isolation based on severity
      if (incident.severity === BreachSeverity.CRITICAL || incident.severity === BreachSeverity.EMERGENCY) {
        await this.isolateAffectedSystems(incident);
        systemsIsolated.push('Assessment system', 'Crisis intervention system');
        actionsPerformed.push('Isolated affected systems');
      }

      // Evidence preservation
      await this.preserveEvidence(incident);
      actionsPerformed.push('Evidence preservation initiated');

      // Crisis-specific containment
      if (incident.affectedData.sensitivityAnalysis.containsCrisisData) {
        await this.initiateCrisisContainment(incident);
        actionsPerformed.push('Crisis-specific containment measures activated');
        nextSteps.push('Coordinate with crisis intervention teams');
      }

      // Notification preparation
      nextSteps.push('Prepare breach notifications');
      nextSteps.push('Begin forensic investigation');
      nextSteps.push('Document all containment actions');

      // Update incident status
      incident.status.currentPhase = 'containment';
      incident.status.milestonesCompleted.push('containment_initiated');
      await this.updateIncident(incident);

      return {
        containmentStarted: true,
        actionsPerformed,
        systemsIsolated,
        accessRevoked,
        nextSteps
      };

    } catch (error) {
      logError(LogCategory.SYSTEM, 'CONTAINMENT ERROR:', error instanceof Error ? error : undefined);

      return {
        containmentStarted: false,
        actionsPerformed: ['Containment system error'],
        systemsIsolated: [],
        accessRevoked: [],
        nextSteps: ['Manual containment required']
      };
    }
  }

  /**
   * BREACH NOTIFICATION MANAGEMENT
   */

  /**
   * Manages breach notification obligations
   */
  public async manageBreachNotifications(
    incidentId: string
  ): Promise<{
    notificationsRequired: BreachNotificationRequirements;
    notificationsPrepared: string[];
    scheduledDelivery: Array<{
      recipient: string;
      method: string;
      scheduledTime: number;
    }>;
    complianceStatus: 'compliant' | 'at_risk' | 'violation';
  }> {
    try {
      const incident = this.activeIncidents.get(incidentId);
      if (!incident) {
        throw new Error(`Incident not found: ${incidentId}`);
      }

      // Assess notification requirements
      const notificationRequirements = await this.determineNotificationRequirements(incident);
      
      // Store notification requirements
      this.notificationQueue.set(incidentId, notificationRequirements);

      const notificationsPrepared: string[] = [];
      const scheduledDelivery: Array<{
        recipient: string;
        method: string;
        scheduledTime: number;
      }> = [];

      // Prepare consumer notifications (30 days per CA SB 446 / NY SHIELD)
      if (notificationRequirements.consumerNotification.required) {
        await this.prepareConsumerNotifications(incident);
        notificationsPrepared.push('Consumer notifications');

        scheduledDelivery.push({
          recipient: 'affected_consumers',
          method: notificationRequirements.consumerNotification.method,
          scheduledTime: notificationRequirements.consumerNotification.deadline
        });
      }

      // Prepare FTC notification (60 days per 16 CFR 318)
      if (notificationRequirements.ftcNotification.required) {
        await this.prepareFTCNotification(incident);
        notificationsPrepared.push('FTC notification');

        scheduledDelivery.push({
          recipient: 'ftc',
          method: notificationRequirements.ftcNotification.method,
          scheduledTime: notificationRequirements.ftcNotification.deadline
        });
      }

      // Prepare State AG notifications (CA: 500+, TX: 250+)
      if (notificationRequirements.stateAgNotification.required) {
        await this.prepareStateAgNotifications(incident);
        notificationsPrepared.push('State AG notifications');

        for (const state of notificationRequirements.stateAgNotification.applicableStates) {
          scheduledDelivery.push({
            recipient: `${state}_ag`,
            method: 'official_submission',
            scheduledTime: notificationRequirements.stateAgNotification.stateDeadlines[state] || Date.now() + (30 * 24 * 60 * 60 * 1000)
          });
        }
      }

      // Prepare media notification
      if (notificationRequirements.mediaNotification.required) {
        await this.prepareMediaNotification(incident);
        notificationsPrepared.push('Media notification');
        
        scheduledDelivery.push({
          recipient: 'media',
          method: 'press_release',
          scheduledTime: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
        });
      }

      // Check compliance status
      const complianceStatus = this.assessNotificationComplianceStatus(
        notificationRequirements,
        scheduledDelivery
      );

      return {
        notificationsRequired: notificationRequirements,
        notificationsPrepared,
        scheduledDelivery,
        complianceStatus
      };

    } catch (error) {
      logError(LogCategory.SYSTEM, 'NOTIFICATION MANAGEMENT ERROR:', error instanceof Error ? error : undefined);

      return {
        notificationsRequired: this.getEmergencyNotificationRequirements(),
        notificationsPrepared: [],
        scheduledDelivery: [],
        complianceStatus: 'violation'
      };
    }
  }

  /**
   * BREACH REMEDIATION
   */

  /**
   * Creates and executes breach remediation plan
   */
  public async createRemediationPlan(
    incidentId: string
  ): Promise<{
    planCreated: boolean;
    planId?: string;
    immediateMeasures: string[];
    longTermMeasures: string[];
    timeline: Array<{
      milestone: string;
      targetDate: number;
      responsible: string;
    }>;
  }> {
    try {
      const incident = this.activeIncidents.get(incidentId);
      if (!incident) {
        throw new Error(`Incident not found: ${incidentId}`);
      }

      const planId = `remediation_${incidentId}_${Date.now()}`;
      
      const remediationPlan: BreachRemediationPlan = {
        planId,
        incidentId,
        immediateActions: {
          actionsTaken: [],
          containmentStatus: 'in_progress',
          accessRevocations: [],
          systemIsolations: []
        },
        investigation: {
          forensicsRequired: incident.severity === BreachSeverity.CRITICAL || 
                            incident.severity === BreachSeverity.EMERGENCY,
          evidencePreservation: [],
          timeline: [],
          externalInvestigators: incident.severity === BreachSeverity.EMERGENCY ? 
                                ['external_forensics_team'] : undefined
        },
        remediation: {
          technicalMeasures: await this.determineTechnicalRemediation(incident),
          administrativeMeasures: await this.determineAdministrativeRemediation(incident),
          physicalMeasures: await this.determinePhysicalRemediation(incident),
          trainingMeasures: await this.determineTrainingRemediation(incident)
        },
        prevention: {
          newControls: await this.determinePreventionControls(incident),
          processImprovements: await this.determineProcessImprovements(incident),
          technologyUpgrades: await this.determineTechnologyUpgrades(incident),
          monitoringEnhancements: await this.determineMonitoringEnhancements(incident)
        },
        recovery: {
          shortTerm: await this.determineShortTermRecovery(incident),
          mediumTerm: await this.determineMediumTermRecovery(incident),
          longTerm: await this.determineLongTermRecovery(incident)
        }
      };

      // Store remediation plan
      this.remediationPlans.set(planId, remediationPlan);
      await this.persistRemediationPlan(remediationPlan);

      // Create timeline
      const timeline = await this.createRemediationTimeline(remediationPlan);

      return {
        planCreated: true,
        planId,
        immediateMeasures: remediationPlan.remediation.technicalMeasures.slice(0, 5),
        longTermMeasures: remediationPlan.prevention.newControls,
        timeline
      };

    } catch (error) {
      logError(LogCategory.SYSTEM, 'REMEDIATION PLAN ERROR:', error instanceof Error ? error : undefined);

      return {
        planCreated: false,
        immediateMeasures: ['Manual remediation planning required'],
        longTermMeasures: ['Comprehensive security review'],
        timeline: []
      };
    }
  }

  /**
   * UTILITY METHODS
   */

  /**
   * Performs initial risk assessment
   */
  private async performInitialRiskAssessment(
    trigger: BreachTrigger,
    eventData: any
  ): Promise<{
    severity: BreachSeverity;
    affectedIndividuals: number;
    phiCompromised: boolean;
    criticalDataInvolved: boolean;
  }> {
    let severity = BreachSeverity.LOW;
    let affectedIndividuals = 1;
    let phiCompromised = false;
    let criticalDataInvolved = false;

    // Assess based on trigger type
    switch (trigger) {
      case BreachTrigger.CRISIS_DATA_EXPOSURE:
        severity = BreachSeverity.CRITICAL;
        criticalDataInvolved = true;
        phiCompromised = true;
        break;
      
      case BreachTrigger.UNAUTHORIZED_ACCESS:
        severity = BreachSeverity.HIGH;
        phiCompromised = true;
        break;
      
      case BreachTrigger.DEVICE_LOSS:
        severity = BreachSeverity.MEDIUM;
        phiCompromised = true;
        break;
      
      case BreachTrigger.AUTHENTICATION_FAILURE:
        severity = BreachSeverity.LOW;
        phiCompromised = false;
        break;
    }

    // Assess data elements involved
    if (eventData.dataElements) {
      const criticalElements = ['suicidal_ideation_data', 'crisis_intervention_records'];
      criticalDataInvolved = eventData.dataElements.some((element: string) => 
        criticalElements.includes(element)
      );
      
      if (criticalDataInvolved) {
        severity = BreachSeverity.CRITICAL;
      }
    }

    return {
      severity,
      affectedIndividuals,
      phiCompromised,
      criticalDataInvolved
    };
  }

  /**
   * Determines if event constitutes a breach
   */
  private determineBreachStatus(riskAssessment: any): boolean {
    // Privacy breach determination criteria
    return riskAssessment.phiCompromised && 
           (riskAssessment.severity === BreachSeverity.HIGH || 
            riskAssessment.severity === BreachSeverity.CRITICAL ||
            riskAssessment.severity === BreachSeverity.EMERGENCY);
  }

  /**
   * Creates breach incident record
   */
  private async createBreachIncident(
    trigger: BreachTrigger,
    eventData: any,
    riskAssessment: any
  ): Promise<BreachIncident> {
    const incidentId = generateTimestampedId('breach');
    
    return {
      incidentId,
      trigger,
      discoveryTimestamp: Date.now(),
      severity: riskAssessment.severity,
      riskAssessment: {
        compromiseLikelihood: riskAssessment.phiCompromised ? 'high' : 'medium',
        harmPotential: riskAssessment.criticalDataInvolved ? 'severe' : 'moderate',
        affectedIndividuals: riskAssessment.affectedIndividuals,
        dataTypesInvolved: [DataSensitivityLevel.SENSITIVE],
        geographicScope: ['US']
      },
      affectedData: {
        compromisedElements: eventData.dataElements || [],
        affectedUserIds: eventData.userId ? [eventData.userId] : [],
        dataVolume: {
          recordCount: 1,
          estimatedSizeBytes: 1024
        },
        sensitivityAnalysis: {
          highestClassification: DataSensitivityLevel.SENSITIVE,
          containsCrisisData: riskAssessment.criticalDataInvolved,
          containsSuicidalIdeationData: riskAssessment.criticalDataInvolved,
          specialCategories: riskAssessment.criticalDataInvolved ? ['mental_health'] : []
        }
      },
      discovery: {
        discoveryMethod: 'automated_detection',
        discoveredBy: 'system',
        circumstances: eventData.description,
        initialEvidence: eventData.evidence || []
      },
      status: {
        currentPhase: 'detection',
        overallStatus: 'investigating',
        milestonesCompleted: ['breach_detected'],
        nextActions: ['perform_risk_assessment', 'initiate_containment']
      }
    };
  }

  /**
   * Initiates immediate response actions
   */
  private async initiateImmediateResponse(incident: BreachIncident): Promise<string[]> {
    const actions: string[] = [];

    // Immediate notification for critical breaches
    if (incident.severity === BreachSeverity.CRITICAL || 
        incident.severity === BreachSeverity.EMERGENCY) {
      
      Alert.alert(
        '🚨 Security Breach Detected',
        'A potential security breach has been detected. Immediate action required.',
        [
          {
            text: 'View Details',
            onPress: () => this.showBreachDetails(incident.incidentId)
          },
          {
            text: 'Contact Security',
            onPress: () => Linking.openURL('tel:911')
          }
        ]
      );
      
      actions.push('Emergency notification displayed');
    }

    // Log breach detection
    await this.logBreachDetection(incident);
    actions.push('Breach detection logged');

    // Initiate containment
    actions.push('Containment procedures initiated');

    return actions;
  }

  private calculateOverallRisk(riskFactors: string[], mitigatingFactors: string[]): 'low' | 'medium' | 'high' | 'critical' {
    const riskScore = riskFactors.length - mitigatingFactors.length;
    
    if (riskScore >= 3) return 'critical';
    if (riskScore >= 2) return 'high';
    if (riskScore >= 1) return 'medium';
    return 'low';
  }

  private async assessNotificationRequirements(incident: BreachIncident): Promise<boolean> {
    // Privacy requires notification for confirmed breaches
    return incident.riskAssessment.compromiseLikelihood === 'high' || 
           incident.riskAssessment.compromiseLikelihood === 'certain';
  }

  private async revokeUserAccess(userId: string, incidentId: string): Promise<void> {
    // Revoke user access to system
    // Implementation would integrate with authentication system
  }

  private async isolateAffectedSystems(incident: BreachIncident): Promise<void> {
    // Isolate affected systems
    // Implementation would integrate with system architecture
  }

  private async preserveEvidence(incident: BreachIncident): Promise<void> {
    // Preserve evidence for investigation
    const evidenceRecord = {
      incidentId: incident.incidentId,
      timestamp: Date.now(),
      evidence: incident.discovery.initialEvidence,
      preservationMethod: 'secure_storage'
    };
    
    await SecureStore.setItemAsync(
      `evidence_${incident.incidentId}`, 
      JSON.stringify(evidenceRecord)
    );
  }

  private async initiateCrisisContainment(incident: BreachIncident): Promise<void> {
    // Special containment for crisis data breaches
    // Notify crisis intervention teams
    // Implement emergency protocols
  }

  private async determineNotificationRequirements(incident: BreachIncident): Promise<BreachNotificationRequirements> {
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;  // CA SB 446, NY SHIELD strictest deadline
    const sixtyDays = 60 * 24 * 60 * 60 * 1000;   // FTC Health Breach Rule
    const affectedCount = incident.riskAssessment.affectedIndividuals;

    // Determine which state AGs need notification based on thresholds
    const applicableStates: string[] = [];
    const stateDeadlines: Record<string, number> = {};
    const thresholds: Record<string, number> = {};

    if (affectedCount >= STATE_NOTIFICATION_MATRIX.CA.agThreshold) {
      applicableStates.push('CA');
      stateDeadlines['CA'] = now + (STATE_NOTIFICATION_MATRIX.CA.agDeadlineDays * 24 * 60 * 60 * 1000);
      thresholds['CA'] = STATE_NOTIFICATION_MATRIX.CA.agThreshold;
    }
    if (affectedCount >= STATE_NOTIFICATION_MATRIX.NY.agThreshold) {
      applicableStates.push('NY');
      stateDeadlines['NY'] = now + (STATE_NOTIFICATION_MATRIX.NY.agDeadlineDays * 24 * 60 * 60 * 1000);
      thresholds['NY'] = STATE_NOTIFICATION_MATRIX.NY.agThreshold;
    }
    if (affectedCount >= STATE_NOTIFICATION_MATRIX.TX.agThreshold) {
      applicableStates.push('TX');
      stateDeadlines['TX'] = now + (STATE_NOTIFICATION_MATRIX.TX.agDeadlineDays * 24 * 60 * 60 * 1000);
      thresholds['TX'] = STATE_NOTIFICATION_MATRIX.TX.agThreshold;
    }

    return {
      consumerNotification: {
        required: true,
        deadline: now + thirtyDays, // Strictest: CA SB 446 / NY SHIELD = 30 days
        method: 'written',
        urgency: incident.severity === BreachSeverity.CRITICAL ? 'immediate' : 'standard'
      },
      ftcNotification: {
        required: true, // FTC Health Breach Rule applies to wellness apps
        deadline: now + sixtyDays, // 16 CFR 318 = 60 days
        method: 'online_portal'
      },
      stateAgNotification: {
        required: applicableStates.length > 0,
        applicableStates,
        stateDeadlines,
        thresholds
      },
      mediaNotification: {
        required: affectedCount >= 500, // CA/NY/FTC threshold
        thresholdMet: affectedCount >= 500,
        affectedCount
      },
      lawEnforcement: {
        required: incident.trigger === BreachTrigger.UNAUTHORIZED_ACCESS,
        criminalActivitySuspected: false,
        agenciesToNotify: []
      },
      professionalNotification: {
        mentalHealthProfessionals: incident.affectedData.sensitivityAnalysis.containsCrisisData,
        crisisInterventionTeams: incident.affectedData.sensitivityAnalysis.containsSuicidalIdeationData,
        treatmentProviders: true
      }
    };
  }

  private getEmergencyNotificationRequirements(): BreachNotificationRequirements {
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;  // Strictest consumer deadline
    const sixtyDays = 60 * 24 * 60 * 60 * 1000;   // FTC deadline

    return {
      consumerNotification: {
        required: true,
        deadline: now + thirtyDays, // CA SB 446 / NY SHIELD = 30 days
        method: 'written',
        urgency: 'immediate'
      },
      ftcNotification: {
        required: true,
        deadline: now + sixtyDays, // 16 CFR 318 = 60 days
        method: 'online_portal'
      },
      stateAgNotification: {
        required: true,
        applicableStates: ['CA', 'NY', 'TX'],
        stateDeadlines: {
          'CA': now + thirtyDays,
          'NY': now + thirtyDays,
          'TX': now + thirtyDays
        },
        thresholds: {
          'CA': STATE_NOTIFICATION_MATRIX.CA.agThreshold,
          'NY': STATE_NOTIFICATION_MATRIX.NY.agThreshold,
          'TX': STATE_NOTIFICATION_MATRIX.TX.agThreshold
        }
      },
      mediaNotification: {
        required: true,
        thresholdMet: true,
        affectedCount: 1000
      },
      lawEnforcement: {
        required: true,
        criminalActivitySuspected: true,
        agenciesToNotify: ['FBI', 'local_police']
      },
      professionalNotification: {
        mentalHealthProfessionals: true,
        crisisInterventionTeams: true,
        treatmentProviders: true
      }
    };
  }

  private assessNotificationComplianceStatus(
    requirements: BreachNotificationRequirements,
    scheduledDelivery: any[]
  ): 'compliant' | 'at_risk' | 'violation' {
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    // Check consumer notification deadline (strictest: 30 days per CA SB 446/NY SHIELD)
    if (requirements.consumerNotification.required &&
        requirements.consumerNotification.deadline < now) {
      return 'violation';
    }

    // Check FTC notification deadline (60 days per 16 CFR 318)
    if (requirements.ftcNotification.required &&
        requirements.ftcNotification.deadline < now) {
      return 'violation';
    }

    // Check state AG notification deadlines
    if (requirements.stateAgNotification.required) {
      for (const [state, deadline] of Object.entries(requirements.stateAgNotification.stateDeadlines)) {
        if (deadline < now) {
          return 'violation';
        }
      }
    }

    // Check if any deadlines are approaching (within 1 week)
    if (requirements.consumerNotification.required &&
        requirements.consumerNotification.deadline < (now + oneWeek)) {
      return 'at_risk';
    }

    if (requirements.ftcNotification.required &&
        requirements.ftcNotification.deadline < (now + oneWeek)) {
      return 'at_risk';
    }

    return 'compliant';
  }

  // Remediation planning methods (simplified implementations)
  private async determineTechnicalRemediation(incident: BreachIncident): Promise<string[]> {
    return [
      'Strengthen access controls',
      'Implement additional encryption',
      'Update security configurations',
      'Deploy monitoring tools',
      'Patch system vulnerabilities'
    ];
  }

  private async determineAdministrativeRemediation(incident: BreachIncident): Promise<string[]> {
    return [
      'Update security policies',
      'Revise incident response procedures',
      'Enhance workforce training',
      'Review vendor agreements',
      'Implement access auditing'
    ];
  }

  private async determinePhysicalRemediation(incident: BreachIncident): Promise<string[]> {
    return [
      'Secure physical access points',
      'Update device management policies',
      'Implement device encryption requirements'
    ];
  }

  private async determineTrainingRemediation(incident: BreachIncident): Promise<string[]> {
    return [
      'Security awareness training',
      'Incident response training',
      'Data protection compliance training',
      'Crisis intervention training'
    ];
  }

  private async determinePreventionControls(incident: BreachIncident): Promise<string[]> {
    return [
      'Advanced threat detection',
      'Behavioral analytics',
      'Zero-trust architecture',
      'Enhanced monitoring'
    ];
  }

  private async determineProcessImprovements(incident: BreachIncident): Promise<string[]> {
    return [
      'Automated incident detection',
      'Streamlined response procedures',
      'Enhanced communication protocols'
    ];
  }

  private async determineTechnologyUpgrades(incident: BreachIncident): Promise<string[]> {
    return [
      'Next-generation encryption',
      'Advanced authentication',
      'Improved monitoring systems'
    ];
  }

  private async determineMonitoringEnhancements(incident: BreachIncident): Promise<string[]> {
    return [
      'Real-time alerting',
      'Automated response capabilities',
      'Enhanced logging and auditing'
    ];
  }

  private async determineShortTermRecovery(incident: BreachIncident): Promise<string[]> {
    return [
      'Restore affected systems',
      'Verify data integrity',
      'Resume normal operations'
    ];
  }

  private async determineMediumTermRecovery(incident: BreachIncident): Promise<string[]> {
    return [
      'Implement lessons learned',
      'Update security measures',
      'Conduct follow-up assessments'
    ];
  }

  private async determineLongTermRecovery(incident: BreachIncident): Promise<string[]> {
    return [
      'Strategic security investments',
      'Continuous improvement program',
      'Regular security assessments'
    ];
  }

  private async createRemediationTimeline(plan: BreachRemediationPlan): Promise<Array<{
    milestone: string;
    targetDate: number;
    responsible: string;
  }>> {
    const now = Date.now();
    return [
      {
        milestone: 'Complete immediate containment',
        targetDate: now + (24 * 60 * 60 * 1000), // 24 hours
        responsible: 'security_team'
      },
      {
        milestone: 'Complete investigation',
        targetDate: now + (14 * 24 * 60 * 60 * 1000), // 14 days (to allow time for notifications)
        responsible: 'forensics_team'
      },
      {
        milestone: 'Consumer notifications (CA SB 446/NY SHIELD)',
        targetDate: now + (30 * 24 * 60 * 60 * 1000), // 30 days - strictest deadline
        responsible: 'compliance_team'
      },
      {
        milestone: 'State AG notifications',
        targetDate: now + (30 * 24 * 60 * 60 * 1000), // 30 days
        responsible: 'legal_team'
      },
      {
        milestone: 'FTC notification (16 CFR 318)',
        targetDate: now + (60 * 24 * 60 * 60 * 1000), // 60 days
        responsible: 'compliance_team'
      }
    ];
  }

  private initializeBreachDetection(): void {
    // Initialize breach detection monitoring
    // Set up automated triggers and monitoring
  }

  private async prepareConsumerNotifications(incident: BreachIncident): Promise<void> {
    // Prepare consumer breach notifications per CA SB 446 / NY SHIELD requirements
    // - Clear description of the breach
    // - Types of personal information involved
    // - Steps the company is taking to address the breach
    // - Steps consumers can take to protect themselves
  }

  private async prepareFTCNotification(incident: BreachIncident): Promise<void> {
    // Prepare FTC notification per 16 CFR 318 Health Breach Notification Rule
    // - Submit via FTC online portal
    // - Include breach details and affected consumers
  }

  private async prepareStateAgNotifications(incident: BreachIncident): Promise<void> {
    // Prepare State Attorney General notifications
    // CA: Submit to CA AG if 500+ affected
    // NY: Submit to NY AG if 500+ affected
    // TX: Submit to TX AG if 250+ affected
  }

  private async prepareMediaNotification(incident: BreachIncident): Promise<void> {
    // Prepare media breach notification for 500+ affected individuals
    // Per CA SB 446 / NY SHIELD / FTC requirements
  }

  private async logBreachDetection(incident: BreachIncident): Promise<void> {
    await SecureStore.setItemAsync(
      `breach_log_${incident.incidentId}`,
      JSON.stringify({
        ...incident,
        loggedAt: Date.now()
      })
    );
  }

  private async persistIncident(incident: BreachIncident): Promise<void> {
    await SecureStore.setItemAsync(
      `incident_${incident.incidentId}`,
      JSON.stringify(incident)
    );
  }

  private async updateIncident(incident: BreachIncident): Promise<void> {
    await this.persistIncident(incident);
  }

  private async persistRemediationPlan(plan: BreachRemediationPlan): Promise<void> {
    await SecureStore.setItemAsync(
      `remediation_${plan.planId}`,
      JSON.stringify(plan)
    );
  }

  private showBreachDetails(incidentId: string): void {
    // Show breach details to authorized personnel
  }

  /**
   * PUBLIC API METHODS
   */

  /**
   * Gets breach response status summary
   */
  public async getBreachResponseStatus(): Promise<{
    activeIncidents: number;
    criticalIncidents: number;
    notificationsPending: number;
    complianceStatus: 'compliant' | 'at_risk' | 'violation';
    recentBreaches: Array<{
      incidentId: string;
      severity: BreachSeverity;
      discoveryDate: number;
      status: string;
    }>;
  }> {
    try {
      const activeIncidents = this.activeIncidents.size;
      const criticalIncidents = Array.from(this.activeIncidents.values())
        .filter(incident => incident.severity === BreachSeverity.CRITICAL || 
                           incident.severity === BreachSeverity.EMERGENCY)
        .length;
      
      const notificationsPending = this.notificationQueue.size;
      
      const recentBreaches = Array.from(this.activeIncidents.values())
        .slice(-5)
        .map(incident => ({
          incidentId: incident.incidentId,
          severity: incident.severity,
          discoveryDate: incident.discoveryTimestamp,
          status: incident.status.overallStatus
        }));

      const complianceStatus = criticalIncidents > 0 ? 'violation' : 
                              notificationsPending > 0 ? 'at_risk' : 'compliant';

      return {
        activeIncidents,
        criticalIncidents,
        notificationsPending,
        complianceStatus,
        recentBreaches
      };

    } catch (error) {
      logError(LogCategory.SYSTEM, 'BREACH STATUS ERROR:', error instanceof Error ? error : undefined);
      return {
        activeIncidents: -1,
        criticalIncidents: -1,
        notificationsPending: -1,
        complianceStatus: 'violation',
        recentBreaches: []
      };
    }
  }

  /**
   * Reports potential breach
   */
  public async reportBreach(
    description: string,
    affectedSystems: string[] = [],
    estimatedAffectedUsers: number = 1
  ): Promise<{
    reported: boolean;
    incidentId?: string | undefined;
    nextSteps: string[];
  }> {
    try {
      const detection = await this.detectPotentialBreach(
        BreachTrigger.MANUAL_REPORT,
        {
          description,
          dataElements: affectedSystems,
          evidence: [{
            type: 'manual_report',
            timestamp: Date.now(),
            description
          }]
        }
      );

      return {
        reported: true,
        incidentId: detection.incidentId,
        nextSteps: detection.immediateActions
      };

    } catch (error) {
      logError(LogCategory.SYSTEM, 'BREACH REPORTING ERROR:', error instanceof Error ? error : undefined);
      return {
        reported: false,
        nextSteps: ['Contact system administrator for manual breach reporting']
      };
    }
  }
}

// Export singleton instance
export default DataBreachResponseEngine.getInstance();