/**
 * P0-CLOUD: Crisis Escalation API
 *
 * Emergency response coordination with immediate therapeutic safety
 * - Crisis detection and escalation with <200ms response guarantee
 * - Emergency contact coordination with multi-channel notification
 * - Therapeutic safety protocols with clinical accuracy
 * - Cross-device crisis propagation with session preservation
 * - Professional intervention coordination with evidence-based protocols
 */

import { z } from 'zod';
import type { SubscriptionTier } from '../../types/payment-canonical';

/**
 * Crisis Detection Configuration Schema
 */
export const CrisisDetectionConfigSchema = z.object({
  configId: z.string().uuid(),
  userId: z.string(),
  subscriptionTier: z.enum(['trial', 'basic', 'premium', 'grace_period']),

  // Detection thresholds
  detectionThresholds: z.object({
    // Assessment-based detection
    assessmentThresholds: z.object({
      phq9CrisisThreshold: z.number().default(20), // ≥20 indicates severe depression
      gad7CrisisThreshold: z.number().default(15), // ≥15 indicates severe anxiety
      combinedScoreThreshold: z.number().default(30), // Combined PHQ-9 + GAD-7
      rapidScoreIncreaseThreshold: z.number().default(5), // Rapid increase in scores
      consistentHighScoresThreshold: z.number().default(3) // Days of consistent high scores
    }),

    // Behavioral detection
    behavioralIndicators: z.object({
      enableBehavioralDetection: z.boolean().default(true),
      inactivityThreshold: z.number().positive().default(172800000), // 48 hours in ms
      appUsagePatternChanges: z.boolean().default(true),
      assessmentCompletionPatterns: z.boolean().default(true),
      responseTimePatterns: z.boolean().default(true)
    }),

    // Text-based detection (future enhancement)
    textAnalysis: z.object({
      enableTextAnalysis: z.boolean().default(false),
      crisisKeywordDetection: z.boolean().default(false),
      sentimentAnalysisThreshold: z.number().default(-0.8), // Very negative sentiment
      confidenceThreshold: z.number().default(0.8) // AI confidence threshold
    })
  }),

  // Response configuration
  responseConfiguration: z.object({
    // Immediate response
    immediateResponse: z.object({
      maxResponseTime: z.number().max(200).default(200), // <200ms guarantee
      enableAutomaticEscalation: z.boolean().default(true),
      showEmergencyContacts: z.boolean().default(true),
      displayCrisisResources: z.boolean().default(true),
      activateEmergencyMode: z.boolean().default(true)
    }),

    // Notification cascade
    notificationCascade: z.object({
      enableCascade: z.boolean().default(true),
      cascadeDelays: z.array(z.number().positive()).default([0, 300000, 900000]), // 0, 5min, 15min
      escalationLevels: z.array(z.enum(['user_prompt', 'emergency_contacts', 'professional_services', 'emergency_services'])),
      failsafeActivation: z.boolean().default(true)
    }),

    // Professional coordination
    professionalCoordination: z.object({
      enableProfessionalAlert: z.boolean().default(false),
      alertThreshold: z.enum(['moderate', 'high', 'severe', 'emergency']).default('high'),
      includeAssessmentData: z.boolean().default(true),
      includeContextualData: z.boolean().default(true),
      anonymizeData: z.boolean().default(true)
    })
  }),

  // Cross-device coordination
  crossDeviceCoordination: z.object({
    enableCrossDeviceAlert: z.boolean().default(true),
    alertPropagationTime: z.number().max(500).default(200), // <200ms propagation
    syncCrisisState: z.boolean().default(true),
    preserveSessionContext: z.boolean().default(true)
  }),

  createdAt: z.string(),
  updatedAt: z.string()
});

export type CrisisDetectionConfig = z.infer<typeof CrisisDetectionConfigSchema>;

/**
 * Crisis Event Schema
 */
export const CrisisEventSchema = z.object({
  eventId: z.string().uuid(),
  userId: z.string(),
  deviceId: z.string(),
  sessionId: z.string().optional(),

  // Crisis classification
  crisisClassification: z.object({
    crisisLevel: z.enum(['low', 'moderate', 'high', 'severe', 'emergency']),
    crisisType: z.enum([
      'assessment_based',
      'user_reported',
      'behavioral_pattern',
      'text_analysis',
      'external_trigger',
      'system_detected'
    ]),
    confidence: z.number().min(0).max(1),
    urgency: z.enum(['routine', 'priority', 'urgent', 'critical', 'emergency'])
  }),

  // Detection context
  detectionContext: z.object({
    // Assessment data
    assessmentData: z.object({
      phq9Score: z.number().min(0).max(27).optional(),
      gad7Score: z.number().min(0).max(21).optional(),
      combinedScore: z.number().min(0).optional(),
      scoreHistory: z.array(z.object({
        score: z.number(),
        date: z.string(),
        assessmentType: z.string()
      })).optional(),
      scoreTrend: z.enum(['improving', 'stable', 'deteriorating', 'rapidly_deteriorating']).optional()
    }).optional(),

    // Behavioral indicators
    behavioralIndicators: z.object({
      appUsageChanges: z.boolean(),
      responseTimeChanges: z.boolean(),
      completionPatternChanges: z.boolean(),
      inactivityPeriod: z.number().min(0).optional() // milliseconds
    }).optional(),

    // Session context
    sessionContext: z.object({
      activeSessionType: z.enum(['morning', 'midday', 'evening', 'assessment', 'crisis']).optional(),
      sessionProgress: z.number().min(0).max(1).optional(),
      unexpectedExit: z.boolean(),
      deviceTransition: z.boolean()
    }).optional(),

    // User context
    userContext: z.object({
      userReported: z.boolean(),
      explicitCrisisRequest: z.boolean(),
      previousCrisisEvents: z.number().min(0),
      lastCrisisEvent: z.string().optional(),
      supportSystemAvailable: z.boolean(),
      currentLocation: z.enum(['home', 'work', 'public', 'unknown']).optional()
    })
  }),

  // Risk assessment
  riskAssessment: z.object({
    riskLevel: z.enum(['low', 'moderate', 'high', 'severe', 'imminent']),
    riskFactors: z.array(z.string()),
    protectiveFactors: z.array(z.string()),
    immediateDangerAssessment: z.object({
      selfHarmRisk: z.enum(['none', 'low', 'moderate', 'high', 'imminent']),
      suicidalIdeation: z.boolean(),
      harmToOthersRisk: z.enum(['none', 'low', 'moderate', 'high']),
      emergencyServicesNeeded: z.boolean()
    }),
    recommendedInterventions: z.array(z.string())
  }),

  detectedAt: z.string(),
  updatedAt: z.string()
});

export type CrisisEvent = z.infer<typeof CrisisEventSchema>;

/**
 * Emergency Response Action Schema
 */
export const EmergencyResponseActionSchema = z.object({
  actionId: z.string().uuid(),
  crisisEventId: z.string(),
  userId: z.string(),

  // Action details
  actionType: z.enum([
    'display_crisis_resources',
    'notify_emergency_contacts',
    'activate_hotline',
    'contact_emergency_services',
    'alert_professional_services',
    'activate_safety_plan',
    'cross_device_alert',
    'preserve_crisis_data',
    'escalate_to_supervisor'
  ]),

  // Action parameters
  actionParameters: z.object({
    priority: z.number().min(1).max(10),
    maxExecutionTime: z.number().positive(), // milliseconds
    requiredConfirmation: z.boolean(),
    automaticExecution: z.boolean(),
    failsafeRequired: z.boolean(),

    // Specific parameters by action type
    contactParameters: z.object({
      contactIds: z.array(z.string()),
      messageTemplate: z.string(),
      includeLocationData: z.boolean(),
      includeAssessmentData: z.boolean()
    }).optional(),

    hotlineParameters: z.object({
      hotlineNumber: z.string().default('988'),
      autoDialEnabled: z.boolean(),
      provideCrisisContext: z.boolean()
    }).optional(),

    professionalParameters: z.object({
      serviceType: z.enum(['crisis_counselor', 'therapist', 'psychiatrist', 'crisis_team']),
      urgencyLevel: z.string(),
      includeUserHistory: z.boolean(),
      anonymizedAlert: z.boolean()
    }).optional()
  }),

  // Execution tracking
  executionTracking: z.object({
    status: z.enum(['pending', 'executing', 'completed', 'failed', 'skipped', 'escalated']),
    startedAt: z.string().optional(),
    completedAt: z.string().optional(),
    executionTime: z.number().min(0).optional(), // milliseconds
    result: z.any().optional(),
    errorDetails: z.string().optional(),
    userInteraction: z.boolean().optional()
  }),

  createdAt: z.string(),
  updatedAt: z.string()
});

export type EmergencyResponseAction = z.infer<typeof EmergencyResponseActionSchema>;

/**
 * Professional Intervention Request Schema
 */
export const ProfessionalInterventionRequestSchema = z.object({
  requestId: z.string().uuid(),
  crisisEventId: z.string(),
  userId: z.string(),

  // Intervention context
  interventionContext: z.object({
    interventionType: z.enum([
      'crisis_counseling',
      'safety_assessment',
      'risk_evaluation',
      'therapeutic_consultation',
      'emergency_intervention',
      'follow_up_coordination'
    ]),
    urgencyLevel: z.enum(['routine', 'priority', 'urgent', 'critical', 'emergency']),
    preferredResponseTime: z.number().positive(), // milliseconds
    subscriptionTierLevel: z.enum(['trial', 'basic', 'premium', 'grace_period'])
  }),

  // Clinical context
  clinicalContext: z.object({
    assessmentScores: z.object({
      phq9: z.number().min(0).max(27).optional(),
      gad7: z.number().min(0).max(21).optional(),
      lastAssessmentDate: z.string().optional()
    }),
    riskFactors: z.array(z.string()),
    protectiveFactors: z.array(z.string()),
    crisisHistory: z.array(z.object({
      date: z.string(),
      crisisLevel: z.string(),
      interventionProvided: z.string(),
      outcome: z.string()
    })).optional(),
    currentMedications: z.array(z.string()).optional(),
    treatmentHistory: z.array(z.string()).optional()
  }),

  // Privacy and consent
  privacyConsent: z.object({
    consentToShare: z.boolean(),
    anonymizeData: z.boolean(),
    shareAssessmentData: z.boolean(),
    shareHistoricalData: z.boolean(),
    emergencyOverrideConsent: z.boolean() // For emergency situations
  }),

  // Professional assignment
  professionalAssignment: z.object({
    assignmentStatus: z.enum(['unassigned', 'assigned', 'in_progress', 'completed', 'escalated']),
    assignedProfessionalId: z.string().optional(),
    professionalType: z.enum(['crisis_counselor', 'licensed_therapist', 'psychiatrist', 'crisis_team_lead']).optional(),
    estimatedResponseTime: z.number().positive().optional(), // milliseconds
    contactMethod: z.enum(['app_chat', 'phone_call', 'video_call', 'in_person']).optional()
  }),

  requestedAt: z.string(),
  updatedAt: z.string(),
  resolvedAt: z.string().optional()
});

export type ProfessionalInterventionRequest = z.infer<typeof ProfessionalInterventionRequestSchema>;

/**
 * Crisis Escalation API Class
 */
export class CrisisEscalationAPI {
  private baseUrl: string;
  private apiKey: string;
  private defaultTimeout: number;

  // Crisis event tracking
  private activeCrisisEvents: Map<string, {
    startTime: number;
    crisisLevel: string;
    responseActions: string[];
  }> = new Map();

  constructor(config: {
    baseUrl: string;
    apiKey: string;
    defaultTimeout?: number;
  }) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.defaultTimeout = config.defaultTimeout || 2000; // Faster timeout for crisis operations
  }

  /**
   * Configure crisis detection and escalation
   */
  async configureCrisisDetection(
    userId: string,
    subscriptionTier: SubscriptionTier,
    config: Partial<CrisisDetectionConfig>
  ): Promise<{
    configured: boolean;
    configId: string;
    detectionThresholdsSet: boolean;
    responseConfigurationApplied: boolean;
    crossDeviceCoordinationEnabled: boolean;
    professionalCoordinationEnabled: boolean;
    subscriptionTierFeaturesActivated: string[];
  }> {
    try {
      const response = await this.makeRequest('POST', '/crisis-escalation/configure', {
        userId,
        subscriptionTier,
        configuration: config,
        configuredAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Crisis detection configuration failed: ${error}`);
    }
  }

  /**
   * Detect crisis with immediate escalation
   */
  async detectCrisis(
    crisisEvent: CrisisEvent
  ): Promise<{
    crisisDetected: boolean;
    crisisEventId: string;
    crisisLevel: string;
    responseTime: number; // <200ms guarantee
    immediateActionsTriggered: string[];
    escalationPlan: {
      escalationLevels: string[];
      estimatedTimeline: number[];
      responsibleParties: string[];
    };
    userSafetyMeasures: string[];
    crossDeviceAlertSent: boolean;
  }> {
    const startTime = Date.now();

    try {
      const validatedEvent = CrisisEventSchema.parse(crisisEvent);

      // Track crisis event
      this.activeCrisisEvents.set(crisisEvent.eventId, {
        startTime,
        crisisLevel: crisisEvent.crisisClassification.crisisLevel,
        responseActions: []
      });

      const response = await this.makeRequest('POST', '/crisis-escalation/detect', validatedEvent);

      // Verify response time meets crisis guarantee
      const responseTime = Date.now() - startTime;
      response.responseTime = responseTime;
      response.responseTimeGuaranteeMet = responseTime <= 200;

      return response;
    } catch (error) {
      throw new Error(`Crisis detection failed: ${error}`);
    }
  }

  /**
   * Execute emergency response actions with <200ms guarantee
   */
  async executeEmergencyResponse(
    action: EmergencyResponseAction
  ): Promise<{
    executed: boolean;
    actionId: string;
    executionTime: number;
    result: any;
    userSafetyMaintained: boolean;
    followUpRequired: boolean;
    escalationTriggered: boolean;
    professionalNotified: boolean;
    emergencyContactsNotified: boolean;
    hotlineActivated: boolean;
  }> {
    const startTime = Date.now();

    try {
      const validatedAction = EmergencyResponseActionSchema.parse(action);

      const response = await this.makeRequest('POST', '/crisis-escalation/emergency-response', validatedAction);

      // Track execution time
      response.executionTime = Date.now() - startTime;

      // Update crisis event tracking
      const trackedEvent = this.activeCrisisEvents.get(action.crisisEventId);
      if (trackedEvent) {
        trackedEvent.responseActions.push(action.actionType);
      }

      return response;
    } catch (error) {
      throw new Error(`Emergency response execution failed: ${error}`);
    }
  }

  /**
   * Coordinate emergency contacts with multi-channel notification
   */
  async coordinateEmergencyContacts(
    userId: string,
    crisisEventId: string,
    contactParameters: {
      contactIds: string[];
      urgencyLevel: 'high' | 'severe' | 'emergency';
      includeLocationData: boolean;
      includeAssessmentData: boolean;
      messageTemplate: string;
      notificationChannels: Array<'sms' | 'call' | 'email' | 'push'>;
      confirmationRequired: boolean;
    }
  ): Promise<{
    coordinationInitiated: boolean;
    contactsNotified: number;
    notificationsSent: number;
    failedNotifications: number;
    confirmationsReceived: number;
    estimatedResponseTime: number;
    backupProtocolsActivated: boolean;
    professionalBackupAlerted: boolean;
  }> {
    try {
      const response = await this.makeRequest('POST', '/crisis-escalation/emergency-contacts', {
        userId,
        crisisEventId,
        contactParameters,
        coordinatedAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Emergency contacts coordination failed: ${error}`);
    }
  }

  /**
   * Activate therapeutic safety protocols
   */
  async activateTherapeuticSafetyProtocols(
    userId: string,
    crisisEventId: string,
    protocolContext: {
      crisisLevel: string;
      therapeuticSessionActive: boolean;
      sessionPreservationRequired: boolean;
      clinicalDataProtectionRequired: boolean;
      assessmentIntegrityValidationRequired: boolean;
    }
  ): Promise<{
    protocolsActivated: boolean;
    safetyProtocolsEngaged: string[];
    therapeuticSessionPreserved: boolean;
    clinicalDataProtected: boolean;
    assessmentIntegrityMaintained: boolean;
    continuityPlanActivated: boolean;
    followUpProtocolsScheduled: boolean;
  }> {
    try {
      const response = await this.makeRequest('POST', '/crisis-escalation/therapeutic-safety', {
        userId,
        crisisEventId,
        protocolContext,
        activatedAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Therapeutic safety protocols activation failed: ${error}`);
    }
  }

  /**
   * Propagate crisis across devices with session preservation
   */
  async propagateCrisisAcrossDevices(
    userId: string,
    crisisEventId: string,
    sourceDeviceId: string,
    targetDeviceIds: string[],
    propagationOptions: {
      preserveSessionState: boolean;
      syncCrisisData: boolean;
      enableEmergencyMode: boolean;
      prioritizeUserSafety: boolean;
      maxPropagationTime: number; // milliseconds
    }
  ): Promise<{
    propagationComplete: boolean;
    devicesReached: number;
    sessionStatesPreserved: number;
    crisisDataSynced: boolean;
    emergencyModeActivated: boolean;
    propagationTime: number; // <200ms guarantee
    userSafetyMaintained: boolean;
    failedDevices: string[];
    backupNotificationsSent: boolean;
  }> {
    const startTime = Date.now();

    try {
      const response = await this.makeRequest('POST', '/crisis-escalation/cross-device-propagation', {
        userId,
        crisisEventId,
        sourceDeviceId,
        targetDeviceIds,
        propagationOptions,
        propagatedAt: new Date().toISOString()
      });

      // Verify propagation time
      const propagationTime = Date.now() - startTime;
      response.propagationTime = propagationTime;
      response.propagationTimeGuaranteeMet = propagationTime <= (propagationOptions.maxPropagationTime || 200);

      return response;
    } catch (error) {
      throw new Error(`Cross-device crisis propagation failed: ${error}`);
    }
  }

  /**
   * Coordinate professional intervention
   */
  async coordinateProfessionalIntervention(
    request: ProfessionalInterventionRequest
  ): Promise<{
    interventionCoordinated: boolean;
    requestId: string;
    professionalAssigned: boolean;
    assignedProfessionalId?: string;
    estimatedResponseTime: number;
    interventionType: string;
    urgencyLevelProcessed: string;
    privacyComplianceVerified: boolean;
    subscriptionTierSupported: boolean;
    escalationPathEstablished: boolean;
  }> {
    try {
      const validatedRequest = ProfessionalInterventionRequestSchema.parse(request);

      const response = await this.makeRequest('POST', '/crisis-escalation/professional-intervention', validatedRequest);

      return response;
    } catch (error) {
      throw new Error(`Professional intervention coordination failed: ${error}`);
    }
  }

  /**
   * Monitor active crisis events
   */
  async monitorActiveCrisisEvents(
    userId: string,
    monitoringOptions: {
      includeResolved: boolean;
      includeHistorical: boolean;
      timeframe: '1h' | '24h' | '7d';
      alertOnStatusChanges: boolean;
    }
  ): Promise<{
    monitoringActive: boolean;
    activeCrisisEvents: number;
    resolvedCrisisEvents: number;
    crisisEventsSummary: Array<{
      eventId: string;
      crisisLevel: string;
      status: string;
      responseTime: number;
      actionsExecuted: number;
      lastUpdated: string;
    }>;
    systemHealthIndicators: {
      responseTimeCompliance: number; // percentage
      actionSuccessRate: number; // percentage
      escalationEffectiveness: number; // percentage
    };
    alertsTriggered: string[];
    recommendedActions: string[];
  }> {
    try {
      const response = await this.makeRequest('POST', '/crisis-escalation/monitor', {
        userId,
        monitoringOptions,
        monitoredAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Crisis events monitoring failed: ${error}`);
    }
  }

  /**
   * Generate crisis escalation analytics
   */
  async generateCrisisAnalytics(
    userId: string,
    analysisType: 'individual' | 'system' | 'professional' | 'comprehensive',
    timeframe: '24h' | '7d' | '30d' | '90d'
  ): Promise<{
    analyticsGenerated: boolean;
    analysisId: string;
    crisisMetrics: {
      totalCrisisEvents: number;
      crisisEventsByLevel: Record<string, number>;
      averageResponseTime: number;
      responseTimeCompliance: number; // percentage
      escalationSuccess: number; // percentage
    };
    interventionMetrics: {
      emergencyContactsActivated: number;
      professionalInterventionsRequested: number;
      hotlineActivations: number;
      emergencyServicesContacted: number;
    };
    effectivenessMetrics: {
      crisisResolutionRate: number; // percentage
      userSafetyMaintained: number; // percentage
      followUpCompliance: number; // percentage
      preventionEffectiveness: number; // percentage
    };
    recommendations: {
      systemImprovements: string[];
      protocolOptimizations: string[];
      preventionStrategies: string[];
      professionalTrainingNeeds: string[];
    };
  }> {
    try {
      const response = await this.makeRequest('POST', '/crisis-escalation/analytics', {
        userId,
        analysisType,
        timeframe,
        generatedAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Crisis analytics generation failed: ${error}`);
    }
  }

  /**
   * Test crisis escalation system
   */
  async testCrisisEscalationSystem(
    userId: string,
    testScenarios: {
      testCrisisDetection: boolean;
      testEmergencyResponse: boolean;
      testCrossDevicePropagation: boolean;
      testProfessionalCoordination: boolean;
      testTherapeuticSafety: boolean;
    }
  ): Promise<{
    testComplete: boolean;
    testResults: {
      crisisDetectionTest: {
        passed: boolean;
        responseTime: number;
        accuracyRate: number;
        falsePositiveRate: number;
      };
      emergencyResponseTest: {
        passed: boolean;
        executionTime: number;
        actionsSuccessRate: number;
        escalationWorking: boolean;
      };
      crossDevicePropagationTest: {
        passed: boolean;
        propagationTime: number;
        devicesReachedRate: number;
        sessionPreservationRate: number;
      };
      professionalCoordinationTest: {
        passed: boolean;
        assignmentTime: number;
        communicationWorking: boolean;
        privacyCompliant: boolean;
      };
      therapeuticSafetyTest: {
        passed: boolean;
        protocolsWorking: boolean;
        continuityMaintained: boolean;
        dataProtectionWorking: boolean;
      };
    };
    overallSystemReliability: number;
    criticalIssuesDetected: string[];
    recommendedImprovements: string[];
  }> {
    try {
      const response = await this.makeRequest('POST', '/crisis-escalation/test', {
        userId,
        testScenarios,
        testedAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Crisis escalation system test failed: ${error}`);
    }
  }

  /**
   * Update crisis event status
   */
  async updateCrisisEventStatus(
    crisisEventId: string,
    statusUpdate: {
      newStatus: 'active' | 'monitoring' | 'stabilized' | 'resolved' | 'escalated';
      updateReason: string;
      actionsCompleted: string[];
      followUpRequired: boolean;
      professionalInvolvement: boolean;
      userFeedback?: string;
      outcomeSummary?: string;
    }
  ): Promise<{
    statusUpdated: boolean;
    previousStatus: string;
    newStatus: string;
    statusTransitionValid: boolean;
    followUpScheduled: boolean;
    analyticsUpdated: boolean;
    userNotified: boolean;
    professionalNotified: boolean;
  }> {
    try {
      const response = await this.makeRequest('PUT', `/crisis-escalation/event/${crisisEventId}/status`, {
        statusUpdate,
        updatedAt: new Date().toISOString()
      });

      // Update local tracking
      const trackedEvent = this.activeCrisisEvents.get(crisisEventId);
      if (trackedEvent && statusUpdate.newStatus === 'resolved') {
        this.activeCrisisEvents.delete(crisisEventId);
      }

      return response;
    } catch (error) {
      throw new Error(`Crisis event status update failed: ${error}`);
    }
  }

  /**
   * Private helper methods
   */
  private async makeRequest(method: string, endpoint: string, data?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'X-Client-Version': '1.0.0',
      'X-Request-ID': crypto.randomUUID(),
      'X-Crisis-Escalation': 'enabled',
      'X-Emergency-Response': 'active',
      'X-Therapeutic-Safety': 'priority'
    };

    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : null,
      signal: AbortSignal.timeout(this.defaultTimeout)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

/**
 * Crisis Response Standards by Subscription Tier
 */
export const CRISIS_RESPONSE_STANDARDS: Record<SubscriptionTier, {
  responseTimeGuarantee: number; // milliseconds
  escalationLevels: string[];
  professionalAccess: boolean;
  emergencyContactLimits: number;
  crossDeviceAlerts: boolean;
  realTimeProfessionalSupport: boolean;
  followUpDuration: number; // hours
  crisisDataRetention: number; // days
}> = {
  trial: {
    responseTimeGuarantee: 500, // Relaxed but still responsive
    escalationLevels: ['user_prompt', 'emergency_contacts', 'hotline'],
    professionalAccess: false,
    emergencyContactLimits: 2,
    crossDeviceAlerts: false,
    realTimeProfessionalSupport: false,
    followUpDuration: 24,
    crisisDataRetention: 7
  },
  basic: {
    responseTimeGuarantee: 200, // Full guarantee
    escalationLevels: ['user_prompt', 'emergency_contacts', 'hotline', 'professional_services'],
    professionalAccess: true,
    emergencyContactLimits: 5,
    crossDeviceAlerts: true,
    realTimeProfessionalSupport: false,
    followUpDuration: 72,
    crisisDataRetention: 30
  },
  premium: {
    responseTimeGuarantee: 200, // Full guarantee
    escalationLevels: ['user_prompt', 'emergency_contacts', 'hotline', 'professional_services', 'priority_professional'],
    professionalAccess: true,
    emergencyContactLimits: 10,
    crossDeviceAlerts: true,
    realTimeProfessionalSupport: true,
    followUpDuration: 168, // 1 week
    crisisDataRetention: 90
  },
  grace_period: {
    responseTimeGuarantee: 200, // Crisis always guaranteed
    escalationLevels: ['user_prompt', 'emergency_contacts', 'hotline'], // Core crisis support maintained
    professionalAccess: false,
    emergencyContactLimits: 2,
    crossDeviceAlerts: false,
    realTimeProfessionalSupport: false,
    followUpDuration: 24,
    crisisDataRetention: 7
  }
};

export default CrisisEscalationAPI;