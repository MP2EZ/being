/**
 * Webhook-Sync Integration API
 *
 * Seamless integration with Day 18 webhook system for payment-aware sync
 * - Real-time payment status updates from webhook processing
 * - Subscription tier changes trigger sync policy updates
 * - Crisis detection integration from webhook events
 * - Therapeutic session coordination with payment events
 */

import { z } from 'zod';
import type { SyncPriority } from '../sync/payment-sync-context-api';
import type { SubscriptionTier } from '../../types/subscription';

/**
 * Webhook Event Types for Sync Integration
 */
export const WebhookEventTypeSchema = z.enum([
  'payment.succeeded',
  'payment.failed',
  'subscription.created',
  'subscription.updated',
  'subscription.canceled',
  'subscription.trial_ending',
  'invoice.payment_failed',
  'customer.subscription.trial_will_end',
  'crisis.detected',
  'assessment.high_risk_score',
  'user.emergency_access_requested'
]);

export type WebhookEventType = z.infer<typeof WebhookEventTypeSchema>;

/**
 * Webhook-Triggered Sync Event
 */
export const WebhookSyncEventSchema = z.object({
  webhookId: z.string().uuid(),
  eventType: WebhookEventTypeSchema,
  userId: z.string(),

  // Webhook payload (encrypted/sanitized)
  webhookPayload: z.object({
    subscriptionId: z.string().optional(),
    customerId: z.string().optional(),
    paymentAmount: z.number().optional(),
    subscriptionTier: z.enum(['trial', 'basic', 'premium', 'grace_period']).optional(),
    subscriptionStatus: z.string().optional(),
    crisisLevel: z.enum(['none', 'watch', 'elevated', 'high', 'critical', 'emergency']).optional(),
    assessmentScores: z.record(z.number()).optional(),
    errorCode: z.string().optional(),
    timestamp: z.string()
  }),

  // Sync implications
  syncImplications: z.object({
    requiresPolicyUpdate: z.boolean(),
    requiresQuotaReset: z.boolean(),
    requiresCrisisEscalation: z.boolean(),
    requiresGracePeriodActivation: z.boolean(),
    affectedSyncOperations: z.array(z.string()).default([])
  }),

  // Priority and urgency
  priority: z.number().min(1).max(10),
  urgency: z.enum(['low', 'normal', 'high', 'critical', 'emergency']),

  // Processing requirements
  requirements: z.object({
    maxProcessingTime: z.number().positive().default(5000), // ms
    requiresAuditTrail: z.boolean().default(true),
    requiresCrisisCheck: z.boolean().default(false),
    requiresUserNotification: z.boolean().default(false)
  }),

  receivedAt: z.string(),
  processedAt: z.string().optional()
});

export type WebhookSyncEvent = z.infer<typeof WebhookSyncEventSchema>;

/**
 * Sync Policy Update Request from Webhook
 */
export const SyncPolicyUpdateRequestSchema = z.object({
  updateId: z.string().uuid(),
  triggeredBy: z.object({
    webhookId: z.string(),
    eventType: WebhookEventTypeSchema,
    timestamp: z.string()
  }),

  // User context
  userId: z.string(),
  previousTier: z.enum(['trial', 'basic', 'premium', 'grace_period']).optional(),
  newTier: z.enum(['trial', 'basic', 'premium', 'grace_period']),
  previousStatus: z.string().optional(),
  newStatus: z.string(),

  // Policy changes
  policyChanges: z.object({
    quotaChanges: z.object({
      resetQuota: z.boolean(),
      newHourlyLimit: z.number().positive(),
      newDataLimit: z.number().positive(),
      effectiveImmediately: z.boolean()
    }).optional(),

    capabilityChanges: z.object({
      realTimeSync: z.boolean().optional(),
      crossDeviceSync: z.boolean().optional(),
      priorityQueueAccess: z.boolean().optional(),
      batchOperations: z.boolean().optional()
    }).optional(),

    gracePeriodChanges: z.object({
      activateGracePeriod: z.boolean(),
      graceDays: z.number().min(0),
      allowedFeatures: z.array(z.string()).default([]),
      therapeuticContinuity: z.boolean().default(true)
    }).optional()
  }),

  // Crisis context
  crisisContext: z.object({
    paymentFailureDetected: z.boolean(),
    subscriptionCanceledVoluntarily: z.boolean(),
    financialStressIndicators: z.array(z.string()).default([]),
    requiresCrisisCheck: z.boolean(),
    therapeuticEngagement: z.enum(['low', 'medium', 'high'])
  }).optional(),

  // Immediate actions required
  immediateActions: z.array(z.enum([
    'update_sync_policies',
    'reset_quota_counters',
    'activate_grace_period',
    'trigger_crisis_check',
    'notify_user',
    'preserve_therapeutic_data',
    'escalate_priority_operations'
  ])).default([]),

  requestedAt: z.string()
});

export type SyncPolicyUpdateRequest = z.infer<typeof SyncPolicyUpdateRequestSchema>;

/**
 * Real-time Payment Status Update
 */
export const PaymentStatusUpdateSchema = z.object({
  updateId: z.string().uuid(),
  userId: z.string(),

  // Payment context
  paymentContext: z.object({
    subscriptionId: z.string(),
    customerId: z.string(),
    paymentStatus: z.enum(['succeeded', 'failed', 'pending', 'canceled']),
    subscriptionStatus: z.enum(['active', 'past_due', 'canceled', 'incomplete']),
    tier: z.enum(['trial', 'basic', 'premium', 'grace_period']),
    amount: z.number().optional(),
    currency: z.string().default('USD'),
    nextBillingDate: z.string().optional(),
    trialEnd: z.string().optional()
  }),

  // Sync impact assessment
  syncImpact: z.object({
    immediateChanges: z.array(z.enum([
      'quota_reset',
      'policy_upgrade',
      'policy_downgrade',
      'grace_period_activation',
      'emergency_access_granted',
      'premium_features_enabled',
      'premium_features_disabled'
    ])).default([]),

    queueOperationsAffected: z.number().min(0),
    pendingSyncOperations: z.number().min(0),
    requiresPriorityEscalation: z.boolean(),

    // Crisis considerations
    crisisRiskAssessment: z.object({
      paymentFailureRisk: z.enum(['none', 'low', 'medium', 'high']),
      subscriptionCancellationRisk: z.enum(['none', 'low', 'medium', 'high']),
      therapeuticDisruptionRisk: z.enum(['none', 'low', 'medium', 'high']),
      requiresCrisisCheck: z.boolean()
    })
  }),

  // User communication
  userCommunication: z.object({
    shouldNotifyUser: z.boolean(),
    notificationPriority: z.enum(['low', 'normal', 'high', 'urgent']),
    therapeuticMessage: z.string().optional(),
    actionRequired: z.boolean(),
    actionType: z.enum(['update_payment', 'choose_plan', 'contact_support', 'none']).optional()
  }),

  updatedAt: z.string()
});

export type PaymentStatusUpdate = z.infer<typeof PaymentStatusUpdateSchema>;

/**
 * Crisis Detection from Webhook Events
 */
export const WebhookCrisisDetectionSchema = z.object({
  detectionId: z.string().uuid(),
  triggeredBy: z.object({
    webhookId: z.string(),
    eventType: WebhookEventTypeSchema,
    rawEvent: z.record(z.any()).optional()
  }),

  // Crisis analysis
  crisisAnalysis: z.object({
    crisisLevel: z.enum(['none', 'watch', 'elevated', 'high', 'critical', 'emergency']),
    crisisType: z.enum([
      'payment_failure_stress',
      'subscription_cancellation_distress',
      'assessment_triggered_crisis',
      'user_reported_emergency',
      'therapeutic_engagement_drop'
    ]),

    // Contributing factors
    contributingFactors: z.object({
      paymentFailures: z.number().min(0),
      subscriptionCancellation: z.boolean(),
      recentHighAssessmentScores: z.boolean(),
      therapeuticEngagementDrop: z.boolean(),
      previousCrisisHistory: z.boolean(),
      timeOfDayRisk: z.enum(['low', 'medium', 'high'])
    }),

    // Confidence scoring
    confidenceScore: z.number().min(0).max(1),
    riskFactors: z.array(z.string()).default([]),
    protectiveFactors: z.array(z.string()).default([])
  }),

  // Recommended actions
  recommendedActions: z.object({
    immediate: z.array(z.enum([
      'activate_crisis_monitoring',
      'provide_crisis_resources',
      'extend_grace_period',
      'emergency_subscription_override',
      'contact_emergency_services',
      'notify_emergency_contacts',
      'escalate_sync_priority'
    ])).default([]),

    followUp: z.array(z.enum([
      'schedule_check_in',
      'therapeutic_outreach',
      'payment_assistance',
      'clinical_consultation',
      'family_notification'
    ])).default([]),

    timeframe: z.enum(['immediate', 'within_1_hour', 'within_24_hours', 'within_week'])
  }),

  // Sync implications
  syncPriorityChanges: z.object({
    escalateAllOperations: z.boolean(),
    newMinimumPriority: z.number().min(1).max(10),
    enableEmergencyBypass: z.boolean(),
    guaranteeResponseTime: z.number().positive().default(200) // ms
  }),

  detectedAt: z.string()
});

export type WebhookCrisisDetection = z.infer<typeof WebhookCrisisDetectionSchema>;

/**
 * Webhook-Sync Integration API Class
 */
export class WebhookSyncIntegrationAPI {
  private baseUrl: string;
  private apiKey: string;
  private defaultTimeout: number;

  constructor(config: {
    baseUrl: string;
    apiKey: string;
    defaultTimeout?: number;
  }) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.defaultTimeout = config.defaultTimeout || 10000;
  }

  /**
   * Process webhook event and determine sync implications
   */
  async processWebhookEvent(event: WebhookSyncEvent): Promise<{
    processed: boolean;
    syncActions: string[];
    policyUpdates: SyncPolicyUpdateRequest[];
    crisisDetection?: WebhookCrisisDetection;
    immediateResponse: {
      priorityEscalations: number;
      quotaAdjustments: number;
      gracePeriodActivations: number;
    };
  }> {
    try {
      const validatedEvent = WebhookSyncEventSchema.parse(event);

      const response = await this.makeRequest('POST', '/webhook-sync/process', validatedEvent);
      return response;
    } catch (error) {
      throw new Error(`Webhook event processing failed: ${error}`);
    }
  }

  /**
   * Update sync policies based on webhook event
   */
  async updateSyncPolicies(
    updateRequest: SyncPolicyUpdateRequest
  ): Promise<{
    updated: boolean;
    policiesChanged: string[];
    quotaReset: boolean;
    gracePeriodActivated: boolean;
    userNotified: boolean;
    crisisCheckTriggered: boolean;
  }> {
    try {
      const validatedRequest = SyncPolicyUpdateRequestSchema.parse(updateRequest);

      const response = await this.makeRequest('PUT', '/webhook-sync/policies', validatedRequest);
      return response;
    } catch (error) {
      throw new Error(`Sync policy update failed: ${error}`);
    }
  }

  /**
   * Handle real-time payment status updates
   */
  async handlePaymentStatusUpdate(
    paymentUpdate: PaymentStatusUpdate
  ): Promise<{
    processed: boolean;
    syncPolicyUpdated: boolean;
    quotaAdjusted: boolean;
    userNotified: boolean;
    crisisRiskAssessed: boolean;
    emergencyActionsTriggered: string[];
  }> {
    try {
      const validatedUpdate = PaymentStatusUpdateSchema.parse(paymentUpdate);

      // Check for crisis risk
      if (validatedUpdate.syncImpact.crisisRiskAssessment.requiresCrisisCheck) {
        await this.triggerCrisisCheck(validatedUpdate.userId, 'payment_status_change');
      }

      const response = await this.makeRequest('POST', '/webhook-sync/payment-status', validatedUpdate);
      return response;
    } catch (error) {
      throw new Error(`Payment status update handling failed: ${error}`);
    }
  }

  /**
   * Register webhook endpoint for sync integration
   */
  async registerWebhookEndpoint(
    endpointUrl: string,
    eventTypes: WebhookEventType[],
    secret: string
  ): Promise<{
    registered: boolean;
    webhookId: string;
    verificationStatus: string;
    supportedEvents: WebhookEventType[];
  }> {
    try {
      const response = await this.makeRequest('POST', '/webhook-sync/register', {
        endpointUrl,
        eventTypes,
        secret,
        registeredAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Webhook endpoint registration failed: ${error}`);
    }
  }

  /**
   * Get webhook processing status and sync integration health
   */
  async getWebhookSyncStatus(): Promise<{
    healthy: boolean;
    webhooksProcessed24h: number;
    averageProcessingTime: number;
    syncActionsTriggered: number;
    crisisDetections: number;
    policyUpdates: number;
    errors: Array<{
      type: string;
      count: number;
      lastOccurred: string;
    }>;
    performance: {
      webhookToSyncLatency: number;
      policyUpdateLatency: number;
      crisisDetectionLatency: number;
    };
  }> {
    try {
      const response = await this.makeRequest('GET', '/webhook-sync/status');
      return response;
    } catch (error) {
      throw new Error(`Webhook sync status query failed: ${error}`);
    }
  }

  /**
   * Trigger crisis check based on webhook event
   */
  async triggerCrisisCheck(
    userId: string,
    triggerReason: string,
    webhookData?: any
  ): Promise<WebhookCrisisDetection> {
    try {
      const response = await this.makeRequest('POST', '/webhook-sync/crisis-check', {
        userId,
        triggerReason,
        webhookData,
        triggeredAt: new Date().toISOString()
      });

      return WebhookCrisisDetectionSchema.parse(response);
    } catch (error) {
      throw new Error(`Crisis check trigger failed: ${error}`);
    }
  }

  /**
   * Get subscription sync policy for current webhook context
   */
  async getSyncPolicyForWebhook(
    userId: string,
    webhookEventType: WebhookEventType
  ): Promise<{
    currentPolicy: any;
    requiredChanges: string[];
    crisisOverrides: string[];
    gracePeriodStatus: {
      active: boolean;
      daysRemaining: number;
      features: string[];
    };
  }> {
    try {
      const response = await this.makeRequest('GET', `/webhook-sync/policy/${userId}`, {
        params: { webhookEventType }
      });

      return response;
    } catch (error) {
      throw new Error(`Sync policy query for webhook failed: ${error}`);
    }
  }

  /**
   * Handle subscription trial ending webhook
   */
  async handleTrialEndingWebhook(
    userId: string,
    trialEndDate: string,
    subscriptionId: string
  ): Promise<{
    gracePeriodActivated: boolean;
    graceDays: number;
    syncPolicyAdjusted: boolean;
    userNotified: boolean;
    therapeuticContinuityMaintained: boolean;
  }> {
    try {
      const response = await this.makeRequest('POST', '/webhook-sync/trial-ending', {
        userId,
        trialEndDate,
        subscriptionId,
        processedAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Trial ending webhook handling failed: ${error}`);
    }
  }

  /**
   * Batch process multiple webhook events
   */
  async batchProcessWebhooks(
    events: WebhookSyncEvent[]
  ): Promise<{
    processed: number;
    failed: number;
    totalSyncActions: number;
    totalPolicyUpdates: number;
    crisisDetections: number;
    results: Array<{
      webhookId: string;
      status: 'success' | 'failure';
      syncActions: string[];
      error?: string;
    }>;
  }> {
    try {
      const validatedEvents = events.map(event => WebhookSyncEventSchema.parse(event));

      const response = await this.makeRequest('POST', '/webhook-sync/batch', {
        events: validatedEvents,
        processedAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Batch webhook processing failed: ${error}`);
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
      'X-Webhook-Integration': 'true'
    };

    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(this.defaultTimeout)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

/**
 * Webhook Event Priority Mapping
 */
export const WEBHOOK_SYNC_PRIORITIES: Record<WebhookEventType, SyncPriority> = {
  'crisis.detected': 10,                    // Crisis Emergency
  'assessment.high_risk_score': 9,          // Emergency High
  'user.emergency_access_requested': 8,     // Emergency Low
  'payment.failed': 6,                      // Urgent (potential crisis trigger)
  'subscription.canceled': 6,               // Urgent (potential crisis trigger)
  'invoice.payment_failed': 5,              // High
  'customer.subscription.trial_will_end': 4, // Elevated
  'subscription.updated': 3,                // Normal
  'subscription.created': 3,                // Normal
  'payment.succeeded': 2                    // Low
};

/**
 * Crisis Risk Assessment Weights
 */
export const CRISIS_RISK_WEIGHTS = {
  payment_failure: 0.6,
  subscription_cancellation: 0.8,
  multiple_payment_failures: 0.9,
  high_assessment_scores: 0.7,
  therapeutic_engagement_drop: 0.5,
  time_of_day_high_risk: 0.3,
  previous_crisis_history: 0.4
} as const;

export default WebhookSyncIntegrationAPI;