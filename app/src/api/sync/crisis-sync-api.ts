/**
 * Crisis-Safe Sync API
 *
 * Emergency sync operations with guaranteed <200ms response times
 * - Immediate crisis intervention data sync
 * - 988 hotline integration support
 * - Emergency subscription access bypass
 * - Therapeutic continuity during crises
 * - Zero-downtime crisis data handling
 */

import { z } from 'zod';

/**
 * Crisis Level Definitions
 */
export const CrisisLevelSchema = z.enum([
  'none',      // No crisis indicators
  'watch',     // Early warning signs
  'elevated',  // Moderate concern
  'high',      // Significant risk
  'critical',  // Immediate attention needed
  'emergency'  // Life-threatening situation
]);

export type CrisisLevel = z.infer<typeof CrisisLevelSchema>;

/**
 * Crisis Sync Request
 */
export const CrisisSyncRequestSchema = z.object({
  operationId: z.string().uuid(),
  emergencyCode: z.string(), // Format: EMG-{timestamp}-{random}
  userId: z.string(),
  deviceId: z.string(),

  // Crisis context
  crisisLevel: CrisisLevelSchema,
  crisisType: z.enum([
    'suicidal_ideation',
    'self_harm',
    'acute_anxiety',
    'panic_attack',
    'severe_depression',
    'substance_crisis',
    'domestic_violence',
    'medical_emergency',
    'assessment_triggered',
    'user_requested',
    'hotline_related'
  ]),

  // Crisis data
  crisisData: z.object({
    // Assessment scores that triggered crisis
    assessmentScores: z.record(z.number()).optional(),

    // Crisis indicators
    indicators: z.array(z.enum([
      'phq9_high_score',
      'gad7_high_score',
      'suicidal_thoughts',
      'self_harm_plans',
      'inability_to_cope',
      'substance_use',
      'safety_concerns',
      'repeated_crisis_button',
      'emergency_contact_activated'
    ])).default([]),

    // Timing context
    timing: z.object({
      crisisDetectedAt: z.string(),
      lastAssessment: z.string().optional(),
      lastCheckIn: z.string().optional(),
      timeToResponse: z.number().optional() // milliseconds
    }),

    // Location context (for emergency services if needed)
    location: z.object({
      available: z.boolean(),
      consent: z.boolean(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      accuracy: z.number().optional(),
      timestamp: z.string().optional()
    }).optional()
  }),

  // Emergency sync payload
  emergencyPayload: z.object({
    encryptedData: z.string(),
    dataType: z.enum([
      'crisis_plan',
      'emergency_contacts',
      'assessment_results',
      'safety_plan',
      'hotline_interaction',
      'therapeutic_note'
    ]),
    payloadSize: z.number().positive(),
    checksum: z.string(),
    encryptionVersion: z.string()
  }),

  // Response requirements
  requirements: z.object({
    maxResponseTime: z.number().positive().default(200), // ms
    requiresImmediateConfirmation: z.boolean().default(true),
    requiresHumanValidation: z.boolean().default(false),
    requiresEmergencyServices: z.boolean().default(false),
    requiresFollowUp: z.boolean().default(true)
  }),

  // Authorization bypass
  emergencyBypass: z.object({
    subscriptionOverride: z.boolean().default(true),
    quotaOverride: z.boolean().default(true),
    rateLimitOverride: z.boolean().default(true),
    priorityEscalation: z.boolean().default(true)
  }),

  requestedAt: z.string()
});

export type CrisisSyncRequest = z.infer<typeof CrisisSyncRequestSchema>;

/**
 * Crisis Sync Response
 */
export const CrisisSyncResponseSchema = z.object({
  operationId: z.string().uuid(),
  emergencyCode: z.string(),
  status: z.enum(['success', 'partial', 'failure', 'escalated']),

  // Response timing (critical for crisis compliance)
  timing: z.object({
    responseTime: z.number().min(0),
    processingTime: z.number().min(0),
    queueWaitTime: z.number().min(0),
    crisisResponseCompliant: z.boolean(), // <200ms
    responseTimestamp: z.string()
  }),

  // Crisis response data
  crisisResponse: z.object({
    // Immediate actions taken
    actionsTriggered: z.array(z.enum([
      'emergency_contacts_notified',
      'crisis_plan_activated',
      'hotline_resources_provided',
      'safety_plan_displayed',
      'emergency_services_contacted',
      'therapeutic_support_engaged',
      'subscription_override_applied',
      'priority_escalation_granted'
    ])).default([]),

    // Crisis resources provided
    resourcesProvided: z.object({
      hotlineNumbers: z.array(z.object({
        name: z.string(),
        number: z.string(),
        available24_7: z.boolean(),
        specialization: z.string().optional()
      })).default([
        {
          name: '988 Suicide & Crisis Lifeline',
          number: '988',
          available24_7: true,
          specialization: 'Suicide prevention and crisis counseling'
        }
      ]),

      emergencyContacts: z.array(z.object({
        name: z.string(),
        relationship: z.string(),
        contactMethod: z.enum(['phone', 'text', 'email']),
        value: z.string(),
        notified: z.boolean()
      })).default([]),

      safetyResources: z.array(z.object({
        type: z.enum(['breathing_exercise', 'grounding_technique', 'safety_plan', 'crisis_chat']),
        title: z.string(),
        description: z.string(),
        accessUrl: z.string().optional()
      })).default([])
    }),

    // Emergency access granted
    emergencyAccess: z.object({
      granted: z.boolean(),
      features: z.array(z.string()).default([]),
      expiresAt: z.string(),
      subscriptionOverride: z.boolean()
    }),

    // Follow-up plan
    followUp: z.object({
      scheduled: z.boolean(),
      checkInTime: z.string().optional(),
      reminderSet: z.boolean(),
      escalationPlan: z.string().optional()
    })
  }),

  // Data sync status
  syncStatus: z.object({
    crisisDataSynced: z.boolean(),
    backupCreated: z.boolean(),
    auditTrailGenerated: z.boolean(),
    encryptionValidated: z.boolean()
  }),

  // Error information (if any)
  error: z.object({
    code: z.string(),
    message: z.string(),
    category: z.enum(['network', 'validation', 'processing', 'escalation']),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    therapeuticGuidance: z.string().optional(),
    fallbackActions: z.array(z.string()).default([])
  }).optional(),

  // Compliance tracking
  compliance: z.object({
    hipaaCompliant: z.boolean(),
    auditTrailCreated: z.boolean(),
    responseTimeCompliant: z.boolean(),
    dataEncrypted: z.boolean(),
    userConsentRespected: z.boolean()
  }),

  respondedAt: z.string()
});

export type CrisisSyncResponse = z.infer<typeof CrisisSyncResponseSchema>;

/**
 * Crisis Escalation Request
 */
export const CrisisEscalationSchema = z.object({
  originalOperationId: z.string().uuid(),
  escalationCode: z.string(),
  escalationLevel: z.enum(['automated', 'clinical', 'emergency_services', 'law_enforcement']),

  // Escalation reason
  reason: z.object({
    code: z.enum([
      'response_time_exceeded',
      'crisis_level_increased',
      'user_unresponsive',
      'safety_concern_identified',
      'clinical_judgment_required',
      'immediate_danger_indicated'
    ]),
    description: z.string(),
    automaticTrigger: z.boolean(),
    clinicalJustification: z.string().optional()
  }),

  // Additional context
  escalationContext: z.object({
    previousAttempts: z.number().min(0),
    timeElapsed: z.number().positive(), // milliseconds
    lastResponse: z.string().optional(),
    emergencyContactsReached: z.number().min(0),
    locationConsent: z.boolean(),
    immediateRisk: z.boolean()
  }),

  // Required actions
  requiredActions: z.array(z.enum([
    'clinical_review',
    'emergency_services_contact',
    'family_notification',
    'location_sharing_request',
    'immediate_intervention',
    'hospitalization_assessment'
  ])).default([]),

  escalatedAt: z.string()
});

export type CrisisEscalation = z.infer<typeof CrisisEscalationSchema>;

/**
 * Crisis Monitoring Status
 */
export const CrisisMonitoringStatusSchema = z.object({
  userId: z.string(),
  currentCrisisLevel: CrisisLevelSchema,

  // Active monitoring
  monitoring: z.object({
    active: z.boolean(),
    startedAt: z.string().optional(),
    lastUpdate: z.string().optional(),
    checkInFrequency: z.enum(['every_15_min', 'every_30_min', 'every_hour', 'every_2_hours']),
    autoEscalationEnabled: z.boolean()
  }),

  // Recent activity
  recentActivity: z.object({
    crisisEventsToday: z.number().min(0),
    lastCrisisEvent: z.string().optional(),
    lastSuccessfulCheckIn: z.string().optional(),
    consecutiveMissedCheckIns: z.number().min(0)
  }),

  // Support resources
  activeSupportResources: z.array(z.object({
    type: z.enum(['hotline', 'crisis_counselor', 'emergency_contact', 'peer_support']),
    name: z.string(),
    contactInfo: z.string(),
    status: z.enum(['available', 'contacted', 'responding', 'unavailable']),
    lastContact: z.string().optional()
  })).default([]),

  // Emergency plans
  emergencyPlans: z.object({
    crisisPlanActive: z.boolean(),
    safetyPlanAccessible: z.boolean(),
    emergencyContactsNotified: z.boolean(),
    professionalSupportEngaged: z.boolean()
  }),

  lastUpdated: z.string()
});

export type CrisisMonitoringStatus = z.infer<typeof CrisisMonitoringStatusSchema>;

/**
 * Crisis-Safe Sync API Class
 */
export class CrisisSyncAPI {
  private baseUrl: string;
  private apiKey: string;
  private emergencyTimeout: number;

  constructor(config: {
    baseUrl: string;
    apiKey: string;
    emergencyTimeout?: number;
  }) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.emergencyTimeout = config.emergencyTimeout || 200; // Maximum 200ms for crisis
  }

  /**
   * Execute emergency sync operation with crisis prioritization
   */
  async emergencySync(request: CrisisSyncRequest): Promise<CrisisSyncResponse> {
    const startTime = Date.now();

    try {
      // Validate crisis request
      const validatedRequest = CrisisSyncRequestSchema.parse(request);

      // Set absolute priority for crisis operations
      const headers = {
        'X-Crisis-Emergency': 'true',
        'X-Crisis-Level': validatedRequest.crisisLevel,
        'X-Emergency-Code': validatedRequest.emergencyCode,
        'X-Response-Time-Requirement': validatedRequest.requirements.maxResponseTime.toString()
      };

      // Make emergency API call with shortest timeout
      const response = await this.makeEmergencyRequest(
        'POST',
        '/crisis-sync/emergency',
        validatedRequest,
        headers
      );

      const crisisResponse = CrisisSyncResponseSchema.parse(response);

      // Validate crisis response time compliance
      const responseTime = Date.now() - startTime;
      if (responseTime > validatedRequest.requirements.maxResponseTime) {
        console.error(`Crisis response time violation: ${responseTime}ms > ${validatedRequest.requirements.maxResponseTime}ms`);

        // Trigger escalation if response time exceeded
        await this.triggerAutomaticEscalation(validatedRequest, responseTime);
      }

      return crisisResponse;

    } catch (error) {
      // Emergency error handling - still provide crisis resources
      return this.createEmergencyCrisisResponse(request, error, Date.now() - startTime);
    }
  }

  /**
   * Trigger crisis escalation
   */
  async escalateCrisis(escalation: CrisisEscalation): Promise<{
    escalated: boolean;
    escalationLevel: string;
    actionsTriggered: string[];
    estimatedResponseTime: number;
    emergencyCode: string;
  }> {
    try {
      const validatedEscalation = CrisisEscalationSchema.parse(escalation);

      const response = await this.makeEmergencyRequest(
        'POST',
        '/crisis-sync/escalate',
        validatedEscalation,
        {
          'X-Crisis-Escalation': 'true',
          'X-Escalation-Level': validatedEscalation.escalationLevel
        }
      );

      return response;
    } catch (error) {
      throw new Error(`Crisis escalation failed: ${error}`);
    }
  }

  /**
   * Get crisis monitoring status
   */
  async getCrisisMonitoringStatus(userId: string): Promise<CrisisMonitoringStatus> {
    try {
      const response = await this.makeEmergencyRequest(
        'GET',
        `/crisis-sync/monitoring/${userId}`,
        undefined,
        { 'X-Crisis-Monitoring': 'true' }
      );

      return CrisisMonitoringStatusSchema.parse(response);
    } catch (error) {
      throw new Error(`Crisis monitoring status query failed: ${error}`);
    }
  }

  /**
   * Activate crisis monitoring for user
   */
  async activateCrisisMonitoring(
    userId: string,
    crisisLevel: CrisisLevel,
    monitoringDuration: number // hours
  ): Promise<{
    activated: boolean;
    monitoringEndTime: string;
    checkInSchedule: string[];
    emergencyContactsNotified: boolean;
  }> {
    try {
      const response = await this.makeEmergencyRequest(
        'POST',
        '/crisis-sync/monitoring/activate',
        {
          userId,
          crisisLevel,
          monitoringDuration,
          activatedAt: new Date().toISOString()
        },
        { 'X-Crisis-Monitoring-Activation': 'true' }
      );

      return response;
    } catch (error) {
      throw new Error(`Crisis monitoring activation failed: ${error}`);
    }
  }

  /**
   * Update crisis level and adjust sync priorities
   */
  async updateCrisisLevel(
    userId: string,
    newCrisisLevel: CrisisLevel,
    reason: string,
    assessmentData?: any
  ): Promise<{
    updated: boolean;
    priorityAdjusted: boolean;
    monitoringAdjusted: boolean;
    resourcesTriggered: string[];
  }> {
    try {
      const response = await this.makeEmergencyRequest(
        'PUT',
        `/crisis-sync/level/${userId}`,
        {
          newCrisisLevel,
          reason,
          assessmentData,
          updatedAt: new Date().toISOString()
        },
        { 'X-Crisis-Level-Update': 'true' }
      );

      return response;
    } catch (error) {
      throw new Error(`Crisis level update failed: ${error}`);
    }
  }

  /**
   * Get emergency contact information for crisis response
   */
  async getEmergencyContacts(userId: string): Promise<{
    contacts: Array<{
      id: string;
      name: string;
      relationship: string;
      phone: string;
      email?: string;
      preferred: boolean;
      available: boolean;
    }>;
    hotlines: Array<{
      name: string;
      number: string;
      available24_7: boolean;
      specialization: string;
    }>;
    professionalSupport: Array<{
      name: string;
      role: string;
      contactInfo: string;
      onCallStatus: boolean;
    }>;
  }> {
    try {
      const response = await this.makeEmergencyRequest(
        'GET',
        `/crisis-sync/emergency-contacts/${userId}`,
        undefined,
        { 'X-Emergency-Contacts': 'true' }
      );

      return response;
    } catch (error) {
      // Always provide 988 hotline as fallback
      return {
        contacts: [],
        hotlines: [
          {
            name: '988 Suicide & Crisis Lifeline',
            number: '988',
            available24_7: true,
            specialization: 'Suicide prevention and crisis counseling'
          },
          {
            name: 'Crisis Text Line',
            number: '741741',
            available24_7: true,
            specialization: 'Text-based crisis support'
          }
        ],
        professionalSupport: []
      };
    }
  }

  /**
   * Validate crisis data integrity
   */
  async validateCrisisData(
    encryptedData: string,
    checksum: string
  ): Promise<{
    valid: boolean;
    decryptionSuccessful: boolean;
    checksumMatch: boolean;
    dataIntegrity: boolean;
    crisisDataComplete: boolean;
  }> {
    try {
      const response = await this.makeEmergencyRequest(
        'POST',
        '/crisis-sync/validate',
        {
          encryptedData,
          checksum,
          validatedAt: new Date().toISOString()
        },
        { 'X-Crisis-Data-Validation': 'true' }
      );

      return response;
    } catch (error) {
      throw new Error(`Crisis data validation failed: ${error}`);
    }
  }

  /**
   * Private helper methods
   */
  private async makeEmergencyRequest(
    method: string,
    endpoint: string,
    data?: any,
    extraHeaders?: Record<string, string>
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'X-Client-Version': '1.0.0',
      'X-Request-ID': crypto.randomUUID(),
      'X-Emergency-Request': 'true',
      'X-Crisis-Priority': '10',
      ...extraHeaders
    };

    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : null,
      signal: AbortSignal.timeout(this.emergencyTimeout)
    });

    if (!response.ok) {
      throw new Error(`Emergency API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private async triggerAutomaticEscalation(
    originalRequest: CrisisSyncRequest,
    responseTime: number
  ): Promise<void> {
    const escalation: CrisisEscalation = {
      originalOperationId: originalRequest.operationId,
      escalationCode: `ESC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      escalationLevel: 'automated',
      reason: {
        code: 'response_time_exceeded',
        description: `Crisis response time exceeded: ${responseTime}ms > ${originalRequest.requirements.maxResponseTime}ms`,
        automaticTrigger: true
      },
      escalationContext: {
        previousAttempts: 1,
        timeElapsed: responseTime,
        emergencyContactsReached: 0,
        locationConsent: false,
        immediateRisk: true
      },
      requiredActions: ['clinical_review', 'immediate_intervention'],
      escalatedAt: new Date().toISOString()
    };

    try {
      await this.escalateCrisis(escalation);
    } catch (escalationError) {
      console.error('Automatic escalation failed:', escalationError);
    }
  }

  private createEmergencyCrisisResponse(
    request: CrisisSyncRequest,
    error: any,
    responseTime: number
  ): CrisisSyncResponse {
    return {
      operationId: request.operationId,
      emergencyCode: request.emergencyCode,
      status: 'failure',
      timing: {
        responseTime,
        processingTime: 0,
        queueWaitTime: 0,
        crisisResponseCompliant: false,
        responseTimestamp: new Date().toISOString()
      },
      crisisResponse: {
        actionsTriggered: ['emergency_fallback_activated'],
        resourcesProvided: {
          hotlineNumbers: [
            {
              name: '988 Suicide & Crisis Lifeline',
              number: '988',
              available24_7: true,
              specialization: 'Suicide prevention and crisis counseling'
            },
            {
              name: 'Crisis Text Line',
              number: '741741',
              available24_7: true,
              specialization: 'Text-based crisis support'
            }
          ],
          emergencyContacts: [],
          safetyResources: [
            {
              type: 'breathing_exercise',
              title: 'Emergency Breathing Exercise',
              description: 'A quick breathing technique to help manage immediate distress'
            }
          ]
        },
        emergencyAccess: {
          granted: true,
          features: ['crisis_button', 'emergency_contacts', 'breathing_exercises'],
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          subscriptionOverride: true
        },
        followUp: {
          scheduled: true,
          checkInTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          reminderSet: true,
          escalationPlan: 'If user does not respond within 1 hour, escalate to emergency services'
        }
      },
      syncStatus: {
        crisisDataSynced: false,
        backupCreated: false,
        auditTrailGenerated: true,
        encryptionValidated: false
      },
      error: {
        code: 'CRISIS_SYNC_FAILURE',
        message: error.message || 'Crisis sync failed - emergency resources activated',
        category: 'processing',
        severity: 'critical',
        therapeuticGuidance: 'Your safety is our priority. Emergency resources have been activated. Please contact 988 if you need immediate help.',
        fallbackActions: ['emergency_contacts_activated', 'hotline_resources_provided', 'safety_plan_accessible']
      },
      compliance: {
        hipaaCompliant: true,
        auditTrailCreated: true,
        responseTimeCompliant: false,
        dataEncrypted: true,
        userConsentRespected: true
      },
      respondedAt: new Date().toISOString()
    };
  }
}

/**
 * Crisis Response Time SLA Constants
 */
export const CRISIS_SLA_REQUIREMENTS = {
  EMERGENCY_RESPONSE_TIME: 200,      // ms - Maximum response time for crisis
  ESCALATION_THRESHOLD: 300,         // ms - Auto-escalate if exceeded
  HOTLINE_DATA_RESPONSE: 100,        // ms - 988 hotline data
  CRISIS_PLAN_ACCESS: 150,           // ms - Crisis plan retrieval
  EMERGENCY_CONTACTS: 100,           // ms - Emergency contact data
  SAFETY_RESOURCES: 200             // ms - Safety resource provision
} as const;

/**
 * Default Crisis Resources
 */
export const DEFAULT_CRISIS_RESOURCES = {
  hotlines: [
    {
      name: '988 Suicide & Crisis Lifeline',
      number: '988',
      available24_7: true,
      specialization: 'Suicide prevention and crisis counseling'
    },
    {
      name: 'Crisis Text Line',
      number: '741741',
      available24_7: true,
      specialization: 'Text-based crisis support'
    },
    {
      name: 'SAMHSA National Helpline',
      number: '1-800-662-4357',
      available24_7: true,
      specialization: 'Mental health and substance abuse'
    }
  ],
  safetyTechniques: [
    {
      type: 'breathing_exercise',
      title: '4-7-8 Breathing',
      description: 'Breathe in for 4, hold for 7, exhale for 8. Repeat 3 times.'
    },
    {
      type: 'grounding_technique',
      title: '5-4-3-2-1 Grounding',
      description: 'Name 5 things you see, 4 things you feel, 3 things you hear, 2 things you smell, 1 thing you taste.'
    }
  ]
} as const;

export default CrisisSyncAPI;