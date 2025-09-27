/**
 * P0-CLOUD: Conflict Resolution API
 *
 * Therapeutic data conflict resolution with clinical accuracy preservation
 * - Therapeutic data conflict resolution with clinical accuracy preservation
 * - AI-assisted conflict resolution with confidence scoring
 * - Crisis-safe conflict handling with emergency escalation
 * - Cross-device conflict coordination with session continuity
 * - Hierarchical resolution with therapeutic safety precedence
 */

import { z } from 'zod';
import type { SyncConflict } from '../../types/cross-device-sync-canonical';
import type { ConflictResolutionStrategy } from '../../types/sync';
import type { SubscriptionTier } from "../../types/payment-canonical";

/**
 * Therapeutic Conflict Schema
 */
export const TherapeuticConflictSchema = z.object({
  conflictId: z.string().uuid(),
  userId: z.string(),
  sessionId: z.string().optional(),

  // Conflict identification
  conflictType: z.enum([
    'assessment_score_divergence',
    'therapeutic_session_overlap',
    'crisis_data_inconsistency',
    'mood_tracking_discrepancy',
    'progress_data_conflict',
    'preference_modification_conflict',
    'device_time_synchronization',
    'concurrent_session_modification',
    'clinical_data_corruption'
  ]),

  // Conflict context
  context: z.object({
    entityType: z.enum([
      'phq9_assessment',
      'gad7_assessment',
      'mood_entry',
      'therapeutic_session',
      'crisis_plan',
      'user_preferences',
      'progress_tracking',
      'session_state'
    ]),
    entityId: z.string(),

    // Data versions involved
    localVersion: z.object({
      version: z.number().positive(),
      timestamp: z.string(),
      deviceId: z.string(),
      data: z.any(),
      checksum: z.string()
    }),

    remoteVersion: z.object({
      version: z.number().positive(),
      timestamp: z.string(),
      deviceId: z.string(),
      data: z.any(),
      checksum: z.string()
    }),

    // Additional conflict sources
    additionalVersions: z.array(z.object({
      version: z.number().positive(),
      timestamp: z.string(),
      deviceId: z.string(),
      data: z.any(),
      checksum: z.string()
    })).optional()
  }),

  // Therapeutic impact assessment
  therapeuticImpact: z.object({
    impactLevel: z.enum(['none', 'low', 'medium', 'high', 'critical']),
    clinicalAccuracyRisk: z.boolean(),
    sessionContinuityRisk: z.boolean(),
    crisisSafetyRisk: z.boolean(),
    assessmentIntegrityRisk: z.boolean(),
    therapeuticProgressRisk: z.boolean(),

    // Impact details
    impactDescription: z.string(),
    clinicalRecommendation: z.string().optional(),
    riskMitigation: z.array(z.string()),
    requiredValidations: z.array(z.string())
  }),

  // AI-assisted analysis
  aiAnalysis: z.object({
    confidenceScore: z.number().min(0).max(1),
    recommendedStrategy: z.enum([
      'automatic_merge',
      'latest_timestamp_wins',
      'therapeutic_priority_merge',
      'clinical_validation_required',
      'user_intervention_required',
      'expert_clinical_review'
    ]),

    // AI reasoning
    analysisReasoning: z.string(),
    therapeuticConsiderations: z.array(z.string()),
    riskFactors: z.array(z.string()),
    mergePossible: z.boolean(),
    dataIntegrityScore: z.number().min(0).max(1)
  }),

  // Crisis safety evaluation
  crisisSafetyEvaluation: z.object({
    involvesCrisisData: z.boolean(),
    emergencyResponseRequired: z.boolean(),
    crisisEscalationRisk: z.boolean(),
    safetyProtocolsRequired: z.array(z.string()),
    maxResolutionTime: z.number().positive(), // milliseconds
    crisisPriorityOverride: z.boolean()
  }),

  // Cross-device coordination
  crossDeviceContext: z.object({
    multipleDevicesInvolved: z.boolean(),
    deviceCount: z.number().positive(),
    primaryDeviceId: z.string().optional(),
    sessionCoordinationRequired: z.boolean(),
    handoffInProgress: z.boolean()
  }).optional(),

  // Resolution tracking
  resolution: z.object({
    status: z.enum(['pending', 'analyzing', 'resolved_automatic', 'resolved_manual', 'escalated', 'failed']),
    strategy: z.enum([
      'automatic_merge',
      'latest_timestamp_wins',
      'therapeutic_priority_merge',
      'clinical_validation_required',
      'user_intervention_required',
      'expert_clinical_review'
    ]).optional(),

    // Resolution result
    resolvedData: z.any().optional(),
    resolutionConfidence: z.number().min(0).max(1).optional(),
    therapeuticValidationComplete: z.boolean(),
    clinicalAccuracyMaintained: z.boolean(),
    userApprovalRequired: z.boolean(),

    // Resolution metadata
    resolvedAt: z.string().optional(),
    resolvedBy: z.enum(['ai_automatic', 'user_choice', 'clinical_expert', 'system_admin']).optional(),
    resolutionTime: z.number().min(0).optional(), // milliseconds
    validationSteps: z.array(z.string())
  }),

  // Subscription context
  subscriptionContext: z.object({
    tier: z.enum(['trial', 'basic', 'premium', 'grace_period']),
    aiResolutionEnabled: z.boolean(),
    expertReviewAvailable: z.boolean(),
    prioritySupport: z.boolean()
  }),

  detectedAt: z.string(),
  updatedAt: z.string()
});

export type TherapeuticConflict = z.infer<typeof TherapeuticConflictSchema>;

/**
 * Clinical Validation Request Schema
 */
export const ClinicalValidationRequestSchema = z.object({
  validationId: z.string().uuid(),
  conflictId: z.string(),

  // Clinical context
  clinicalContext: z.object({
    dataType: z.enum(['phq9', 'gad7', 'mood_entry', 'crisis_plan', 'therapeutic_session']),
    clinicalSignificance: z.enum(['routine', 'important', 'critical', 'emergency']),
    patientSafetyImplications: z.boolean(),
    therapeuticContinuityImpact: z.boolean()
  }),

  // Validation requirements
  validationRequirements: z.object({
    accuracyValidationRequired: z.boolean(),
    clinicalReviewRequired: z.boolean(),
    expertConsultationRequired: z.boolean(),
    patientConsentRequired: z.boolean(),
    documentationRequired: z.boolean()
  }),

  // Data for validation
  conflictingData: z.array(z.object({
    version: z.string(),
    data: z.any(),
    clinicalContext: z.string(),
    riskAssessment: z.string()
  })),

  // Expert assignment
  expertAssignment: z.object({
    assignmentRequired: z.boolean(),
    expertType: z.enum(['clinical_coordinator', 'licensed_therapist', 'crisis_specialist', 'technical_expert']).optional(),
    urgencyLevel: z.enum(['routine', 'priority', 'urgent', 'emergency']),
    maxResponseTime: z.number().positive() // milliseconds
  }),

  requestedAt: z.string(),
  completedAt: z.string().optional()
});

export type ClinicalValidationRequest = z.infer<typeof ClinicalValidationRequestSchema>;

/**
 * AI Resolution Engine Configuration
 */
export const AIResolutionConfigSchema = z.object({
  configId: z.string().uuid(),

  // AI model configuration
  modelConfig: z.object({
    model: z.string(),
    version: z.string(),
    confidenceThreshold: z.number().min(0).max(1),
    therapeuticWeighting: z.number().min(0).max(1),
    safetyPriorityWeight: z.number().min(0).max(1)
  }),

  // Resolution rules
  resolutionRules: z.object({
    autoResolveThreshold: z.number().min(0).max(1),
    clinicalValidationThreshold: z.number().min(0).max(1),
    crisisEscalationThreshold: z.number().min(0).max(1),
    maxAutoResolutionTime: z.number().positive(), // milliseconds

    // Safety constraints
    neverAutoResolve: z.array(z.enum([
      'crisis_plan_modifications',
      'emergency_contacts',
      'medication_references',
      'clinical_assessments_above_threshold'
    ])),

    alwaysRequireValidation: z.array(z.enum([
      'phq9_score_changes',
      'gad7_score_changes',
      'crisis_level_modifications',
      'therapeutic_plan_changes'
    ]))
  }),

  // Subscription tier features
  tierFeatures: z.object({
    trial: z.object({
      aiResolutionEnabled: z.boolean(),
      maxAutoResolutions: z.number(),
      expertReviewAvailable: z.boolean()
    }),
    basic: z.object({
      aiResolutionEnabled: z.boolean(),
      maxAutoResolutions: z.number(),
      expertReviewAvailable: z.boolean()
    }),
    premium: z.object({
      aiResolutionEnabled: z.boolean(),
      maxAutoResolutions: z.number(),
      expertReviewAvailable: z.boolean()
    })
  }),

  updatedAt: z.string()
});

export type AIResolutionConfig = z.infer<typeof AIResolutionConfigSchema>;

/**
 * Conflict Resolution API Class
 */
export class ConflictResolutionAPI {
  private baseUrl: string;
  private apiKey: string;
  private defaultTimeout: number;

  // Performance tracking
  private resolutionMetrics: Map<string, {
    startTime: number;
    conflictType: string;
    therapeuticImpact: string;
  }> = new Map();

  constructor(config: {
    baseUrl: string;
    apiKey: string;
    defaultTimeout?: number;
  }) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.defaultTimeout = config.defaultTimeout || 5000; // Faster for conflicts
  }

  /**
   * Detect and analyze therapeutic conflicts
   */
  async detectConflict(
    localData: any,
    remoteData: any,
    entityType: string,
    userId: string
  ): Promise<{
    conflictDetected: boolean;
    conflict?: TherapeuticConflict;
    severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
    aiAnalysisComplete: boolean;
    immediateActionRequired: boolean;
    estimatedResolutionTime: number;
  }> {
    try {
      const response = await this.makeRequest('POST', '/conflict-resolution/detect', {
        localData,
        remoteData,
        entityType,
        userId,
        detectedAt: new Date().toISOString()
      });

      // Track conflict for performance monitoring
      if (response.conflictDetected && response.conflict) {
        this.resolutionMetrics.set(response.conflict.conflictId, {
          startTime: Date.now(),
          conflictType: response.conflict.conflictType,
          therapeuticImpact: response.conflict.therapeuticImpact.impactLevel
        });
      }

      return response;
    } catch (error) {
      throw new Error(`Conflict detection failed: ${error}`);
    }
  }

  /**
   * Execute AI-assisted conflict resolution
   */
  async resolveWithAI(
    conflictId: string,
    subscriptionTier: SubscriptionTier,
    maxResolutionTime: number = 1000
  ): Promise<{
    resolved: boolean;
    resolutionStrategy: ConflictResolutionStrategy;
    resolvedData: any;
    confidence: number;
    therapeuticValidationRequired: boolean;
    clinicalAccuracyMaintained: boolean;
    resolutionTime: number;
    aiReasoning: string;
    requiresUserApproval: boolean;
  }> {
    const startTime = Date.now();

    try {
      const response = await this.makeRequest('POST', `/conflict-resolution/${conflictId}/ai-resolve`, {
        subscriptionTier,
        maxResolutionTime,
        resolvedAt: new Date().toISOString()
      });

      // Calculate actual resolution time
      const resolutionTime = Date.now() - startTime;
      response.resolutionTime = resolutionTime;

      return response;
    } catch (error) {
      throw new Error(`AI conflict resolution failed: ${error}`);
    }
  }

  /**
   * Handle crisis-safe conflict resolution with emergency escalation
   */
  async handleCrisisSafeResolution(
    conflictId: string,
    crisisLevel: 'low' | 'medium' | 'high' | 'emergency',
    maxResponseTime: number = 200
  ): Promise<{
    crisisSafeResolutionComplete: boolean;
    emergencyEscalationTriggered: boolean;
    safetyProtocolsActivated: string[];
    resolvedData: any;
    crisisDataPreserved: boolean;
    emergencyContactsNotified: boolean;
    responseTime: number; // <200ms guarantee
    continuityMaintained: boolean;
  }> {
    const startTime = Date.now();

    try {
      const response = await this.makeRequest('POST', `/conflict-resolution/${conflictId}/crisis-safe`, {
        crisisLevel,
        maxResponseTime,
        crisisResolvedAt: new Date().toISOString()
      });

      // Verify response time meets crisis guarantee
      const responseTime = Date.now() - startTime;
      response.responseTime = responseTime;
      response.responseTimeGuaranteeMet = responseTime <= maxResponseTime;

      return response;
    } catch (error) {
      throw new Error(`Crisis-safe conflict resolution failed: ${error}`);
    }
  }

  /**
   * Coordinate conflict resolution across multiple devices
   */
  async coordinateCrossDeviceResolution(
    conflictId: string,
    deviceIds: string[],
    sessionHandoffRequired: boolean
  ): Promise<{
    crossDeviceResolutionComplete: boolean;
    devicesCoordinated: number;
    sessionHandoffSuccessful: boolean;
    sessionContinuityMaintained: boolean;
    conflictResolvedOnAllDevices: boolean;
    synchronizationTime: number;
    dataConsistencyVerified: boolean;
  }> {
    try {
      const response = await this.makeRequest('POST', `/conflict-resolution/${conflictId}/cross-device`, {
        deviceIds,
        sessionHandoffRequired,
        coordinatedAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Cross-device conflict coordination failed: ${error}`);
    }
  }

  /**
   * Apply hierarchical resolution with therapeutic safety precedence
   */
  async applyHierarchicalResolution(
    conflictId: string,
    precedenceRules: {
      crisisSafetyFirst: boolean;
      clinicalAccuracySecond: boolean;
      therapeuticContinuityThird: boolean;
      userPreferenceLast: boolean;
    }
  ): Promise<{
    hierarchicalResolutionApplied: boolean;
    precedenceOrder: string[];
    finalResolution: any;
    safetyChecksComplete: boolean;
    clinicalValidationComplete: boolean;
    therapeuticContinuityMaintained: boolean;
    hierarchyJustification: string;
  }> {
    try {
      const response = await this.makeRequest('POST', `/conflict-resolution/${conflictId}/hierarchical`, {
        precedenceRules,
        appliedAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Hierarchical resolution failed: ${error}`);
    }
  }

  /**
   * Request clinical validation for complex conflicts
   */
  async requestClinicalValidation(
    conflictId: string,
    urgencyLevel: 'routine' | 'priority' | 'urgent' | 'emergency',
    subscriptionTier: SubscriptionTier
  ): Promise<{
    validationRequested: boolean;
    validationId: string;
    expertAssigned: boolean;
    estimatedResponseTime: number;
    clinicalReviewRequired: boolean;
    validationTierSupported: boolean;
    priorityEscalationAvailable: boolean;
  }> {
    try {
      const response = await this.makeRequest('POST', `/conflict-resolution/${conflictId}/clinical-validation`, {
        urgencyLevel,
        subscriptionTier,
        requestedAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Clinical validation request failed: ${error}`);
    }
  }

  /**
   * Get conflict resolution status and analytics
   */
  async getConflictStatus(conflictId: string): Promise<{
    conflict: TherapeuticConflict;
    currentStatus: string;
    resolutionProgress: {
      analysisComplete: boolean;
      aiResolutionAttempted: boolean;
      clinicalValidationComplete: boolean;
      resolutionApplied: boolean;
      verificationComplete: boolean;
    };
    performanceMetrics: {
      totalResolutionTime: number;
      aiProcessingTime?: number;
      validationTime?: number;
      applicationTime?: number;
    };
    therapeuticImpactAssessment: {
      continuityMaintained: boolean;
      clinicalAccuracyPreserved: boolean;
      safetyProtocolsFollowed: boolean;
    };
  }> {
    try {
      const response = await this.makeRequest('GET', `/conflict-resolution/${conflictId}/status`);

      // Add client-side metrics
      const trackedConflict = this.resolutionMetrics.get(conflictId);
      if (trackedConflict) {
        response.performanceMetrics.clientTrackingTime = Date.now() - trackedConflict.startTime;
      }

      return response;
    } catch (error) {
      throw new Error(`Conflict status query failed: ${error}`);
    }
  }

  /**
   * Configure AI resolution engine
   */
  async configureAIResolution(
    subscriptionTier: SubscriptionTier,
    configuration: Partial<AIResolutionConfig>
  ): Promise<{
    configured: boolean;
    configurationId: string;
    aiResolutionEnabled: boolean;
    tierFeaturesActivated: string[];
    safetyConstraintsApplied: string[];
    performanceOptimized: boolean;
  }> {
    try {
      const response = await this.makeRequest('POST', '/conflict-resolution/ai/configure', {
        subscriptionTier,
        configuration,
        configuredAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`AI resolution configuration failed: ${error}`);
    }
  }

  /**
   * Get conflict resolution analytics
   */
  async getResolutionAnalytics(
    userId: string,
    timeframe: '24h' | '7d' | '30d'
  ): Promise<{
    totalConflicts: number;
    resolvedConflicts: number;
    aiResolvedConflicts: number;
    clinicalValidationConflicts: number;
    averageResolutionTime: number;
    conflictTypes: Array<{
      type: string;
      count: number;
      averageResolutionTime: number;
      successRate: number;
    }>;
    therapeuticImpact: {
      continuityPreserved: number;
      clinicalAccuracyMaintained: number;
      safetyProtocolsFollowed: number;
    };
    performanceMetrics: {
      averageAIResolutionTime: number;
      averageValidationTime: number;
      successRateByType: any;
    };
  }> {
    try {
      const response = await this.makeRequest('GET', `/conflict-resolution/analytics/${userId}`, {
        params: { timeframe }
      });

      return response;
    } catch (error) {
      throw new Error(`Resolution analytics query failed: ${error}`);
    }
  }

  /**
   * Test conflict resolution system
   */
  async testResolutionSystem(): Promise<{
    systemHealthy: boolean;
    aiEngineResponsive: boolean;
    clinicalValidationAvailable: boolean;
    performanceWithinSLA: boolean;
    safetyProtocolsActive: boolean;
    testResults: {
      conflictDetectionTime: number;
      aiResolutionTime: number;
      crisisResponseTime: number;
      crossDeviceCoordinationTime: number;
    };
  }> {
    try {
      const response = await this.makeRequest('POST', '/conflict-resolution/test', {
        testedAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Resolution system test failed: ${error}`);
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
      'X-Conflict-Resolution': 'true',
      'X-Therapeutic-Safe': 'enabled'
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
 * Therapeutic Safety Resolution Precedence
 */
export const THERAPEUTIC_PRECEDENCE_HIERARCHY: Array<{
  priority: number;
  category: string;
  description: string;
  examples: string[];
  autoResolutionAllowed: boolean;
  validationRequired: boolean;
}> = [
  {
    priority: 1,
    category: 'crisis_safety',
    description: 'Crisis safety and emergency response data',
    examples: ['crisis_plans', 'emergency_contacts', 'safety_protocols'],
    autoResolutionAllowed: false,
    validationRequired: true
  },
  {
    priority: 2,
    category: 'clinical_accuracy',
    description: 'Clinical assessment scores and therapeutic data',
    examples: ['phq9_scores', 'gad7_scores', 'clinical_notes'],
    autoResolutionAllowed: false,
    validationRequired: true
  },
  {
    priority: 3,
    category: 'therapeutic_continuity',
    description: 'Active therapeutic sessions and progress',
    examples: ['session_state', 'progress_tracking', 'therapeutic_plans'],
    autoResolutionAllowed: true,
    validationRequired: true
  },
  {
    priority: 4,
    category: 'user_preferences',
    description: 'User settings and non-clinical preferences',
    examples: ['ui_preferences', 'notification_settings', 'app_configuration'],
    autoResolutionAllowed: true,
    validationRequired: false
  }
];

export default ConflictResolutionAPI;