/**
 * Comprehensive Webhook Event Type System for Being. MBCT App
 *
 * Crisis-safe webhook event definitions with:
 * - <200ms performance constraints for emergency responses
 * - HIPAA-compliant event structure (no PII)
 * - Therapeutic continuity guarantees
 * - Type-safe event routing and validation
 * - MBCT-compliant error handling patterns
 */

import { z } from 'zod';

/**
 * Core Performance Constraints for Crisis Safety
 */
export const CRISIS_RESPONSE_TIME_MS = 200;
export const NORMAL_RESPONSE_TIME_MS = 2000;
export const THERAPEUTIC_GRACE_PERIOD_DAYS = 7;

/**
 * Base Webhook Event Schema
 */
export const BaseWebhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  created: z.number(),
  livemode: z.boolean(),
  pending_webhooks: z.number().optional(),
  api_version: z.string().optional(),
  request: z.object({
    id: z.string().nullable(),
    idempotency_key: z.string().nullable(),
  }).optional(),
});

/**
 * Crisis Safety Metadata
 */
export const CrisisSafetyMetadataSchema = z.object({
  crisisMode: z.boolean().default(false),
  emergencyBypass: z.boolean().default(false),
  therapeuticContinuity: z.boolean().default(true),
  gracePeriodActive: z.boolean().default(false),
  responseTimeConstraint: z.number().default(NORMAL_RESPONSE_TIME_MS),
  priority: z.enum(['emergency', 'high', 'normal', 'low']).default('normal'),
});

export type CrisisSafetyMetadata = z.infer<typeof CrisisSafetyMetadataSchema>;

/**
 * Performance Tracking Metadata
 */
export const PerformanceMetadataSchema = z.object({
  processingStartTime: z.number(),
  maxProcessingTime: z.number(),
  actualProcessingTime: z.number().optional(),
  crisisTimeoutTriggered: z.boolean().default(false),
  retryAttempt: z.number().default(0),
  maxRetries: z.number().default(3),
});

export type PerformanceMetadata = z.infer<typeof PerformanceMetadataSchema>;

/**
 * Subscription Event Types
 */
export const SubscriptionEventDataSchema = z.object({
  object: z.object({
    id: z.string(),
    customer: z.string(),
    status: z.enum([
      'active',
      'canceled',
      'incomplete',
      'incomplete_expired',
      'past_due',
      'paused',
      'trialing',
      'unpaid'
    ]),
    current_period_start: z.number(),
    current_period_end: z.number(),
    trial_start: z.number().optional(),
    trial_end: z.number().optional(),
    cancel_at_period_end: z.boolean(),
    items: z.object({
      data: z.array(z.object({
        id: z.string(),
        price: z.object({
          id: z.string(),
          nickname: z.string().optional(),
          metadata: z.record(z.string()).optional(),
        }),
      })),
    }),
    metadata: z.record(z.string()).optional(),
  }),
  previous_attributes: z.record(z.any()).optional(),
});

export type SubscriptionEventData = z.infer<typeof SubscriptionEventDataSchema>;

/**
 * Payment Event Types
 */
export const PaymentEventDataSchema = z.object({
  object: z.object({
    id: z.string(),
    customer: z.string(),
    subscription: z.string().optional(),
    amount_paid: z.number(),
    amount_due: z.number(),
    status: z.enum(['paid', 'open', 'void', 'uncollectible', 'draft']),
    payment_intent: z.string().optional(),
    attempt_count: z.number(),
    next_payment_attempt: z.number().optional(),
    hosted_invoice_url: z.string().optional(),
    invoice_pdf: z.string().optional(),
    period_start: z.number(),
    period_end: z.number(),
  }),
  previous_attributes: z.record(z.any()).optional(),
});

export type PaymentEventData = z.infer<typeof PaymentEventDataSchema>;

/**
 * Crisis Protection Event Data
 */
export const CrisisProtectionEventDataSchema = z.object({
  userId: z.string(),
  triggeredAt: z.number(),
  crisisLevel: z.enum(['low', 'medium', 'high', 'critical']),
  protectionType: z.enum([
    'payment_grace_period',
    'emergency_access',
    'crisis_bypass',
    'therapeutic_continuity'
  ]),
  gracePeriodEnd: z.number().optional(),
  emergencyAccess: z.boolean().default(true),
  therapeuticFeatures: z.array(z.string()).default([]),
});

export type CrisisProtectionEventData = z.infer<typeof CrisisProtectionEventDataSchema>;

/**
 * Webhook Event Types with Crisis Safety
 */
export interface CrisisSafeWebhookEvent<T = any> {
  // Core event data
  id: string;
  type: string;
  created: number;
  data: T;
  livemode: boolean;

  // Crisis safety metadata
  crisisSafety: CrisisSafetyMetadata;
  performance: PerformanceMetadata;

  // Optional fields
  pending_webhooks?: number;
  api_version?: string;
  request?: {
    id: string | null;
    idempotency_key: string | null;
  };
}

/**
 * Specific Event Types
 */
export interface SubscriptionUpdatedEvent extends CrisisSafeWebhookEvent<SubscriptionEventData> {
  type: 'customer.subscription.updated';
}

export interface SubscriptionDeletedEvent extends CrisisSafeWebhookEvent<SubscriptionEventData> {
  type: 'customer.subscription.deleted';
}

export interface SubscriptionTrialEndingEvent extends CrisisSafeWebhookEvent<SubscriptionEventData> {
  type: 'customer.subscription.trial_will_end';
}

export interface PaymentSucceededEvent extends CrisisSafeWebhookEvent<PaymentEventData> {
  type: 'invoice.payment_succeeded';
}

export interface PaymentFailedEvent extends CrisisSafeWebhookEvent<PaymentEventData> {
  type: 'invoice.payment_failed';
}

export interface CrisisProtectionEvent extends CrisisSafeWebhookEvent<CrisisProtectionEventData> {
  type: 'crisis.protection.activated' | 'crisis.grace_period.started' | 'crisis.emergency_access.granted';
}

/**
 * Union type of all webhook events
 */
export type WebhookEvent =
  | SubscriptionUpdatedEvent
  | SubscriptionDeletedEvent
  | SubscriptionTrialEndingEvent
  | PaymentSucceededEvent
  | PaymentFailedEvent
  | CrisisProtectionEvent;

/**
 * Event Type Guards
 */
export const isSubscriptionEvent = (event: WebhookEvent): event is SubscriptionUpdatedEvent | SubscriptionDeletedEvent | SubscriptionTrialEndingEvent => {
  return event.type.startsWith('customer.subscription.');
};

export const isPaymentEvent = (event: WebhookEvent): event is PaymentSucceededEvent | PaymentFailedEvent => {
  return event.type.startsWith('invoice.payment_');
};

export const isCrisisEvent = (event: WebhookEvent): event is CrisisProtectionEvent => {
  return event.type.startsWith('crisis.');
};

/**
 * Event Processing Result Types
 */
export interface WebhookProcessingResult {
  success: boolean;
  eventId: string;
  eventType: string;
  processingTime: number;
  crisisOverride: boolean;
  therapeuticContinuity: boolean;
  gracePeriodActive: boolean;
  error?: {
    code: string;
    message: string;
    therapeuticMessage?: string;
    retryable: boolean;
    crisisImpact: boolean;
  };
  stateUpdates?: {
    subscription?: any;
    payment?: any;
    crisis?: any;
    features?: any;
  };
}

/**
 * Crisis Response Types
 */
export interface CrisisResponse<T extends number = typeof CRISIS_RESPONSE_TIME_MS> {
  responseTime: T;
  emergencyAccess: boolean;
  therapeuticContinuity: boolean;
  gracePeriodGranted: boolean;
  bypassedRestrictions: string[];
  therapeuticMessage: string;
}

/**
 * Performance Constraint Types
 */
export type PerformanceConstrained<T extends number> = Promise<T extends typeof CRISIS_RESPONSE_TIME_MS ? CrisisResponse<T> : WebhookProcessingResult>;

/**
 * Event Priority System
 */
export const EVENT_PRIORITIES = {
  'crisis.protection.activated': 'emergency',
  'crisis.grace_period.started': 'emergency',
  'crisis.emergency_access.granted': 'emergency',
  'invoice.payment_failed': 'high',
  'customer.subscription.deleted': 'high',
  'customer.subscription.trial_will_end': 'normal',
  'customer.subscription.updated': 'normal',
  'invoice.payment_succeeded': 'low',
} as const;

/**
 * Event Handler Type Definitions
 */
export type WebhookEventHandler<T extends WebhookEvent = WebhookEvent> = (
  event: T
) => PerformanceConstrained<T['crisisSafety']['responseTimeConstraint']>;

export type CrisisEventHandler<T extends CrisisProtectionEvent = CrisisProtectionEvent> = (
  event: T
) => PerformanceConstrained<typeof CRISIS_RESPONSE_TIME_MS>;

/**
 * Therapeutic Messaging Types
 */
export interface TherapeuticMessage {
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  mindfulLanguage: boolean;
  anxietyReducing: boolean;
  therapeutic: boolean;
  actionable?: {
    label: string;
    action: string;
    therapeutic: boolean;
  };
}

/**
 * Grace Period Management Types
 */
export interface GracePeriodState {
  active: boolean;
  startDate: Date;
  endDate: Date;
  remainingDays: number;
  reason: 'payment_failure' | 'crisis_protection' | 'therapeutic_continuity';
  therapeuticFeatures: string[];
  emergencyAccess: boolean;
}

/**
 * Webhook Configuration Types
 */
export interface WebhookConfiguration {
  crisisMode: boolean;
  therapeuticMode: boolean;
  gracePeriodEnabled: boolean;
  emergencyBypassEnabled: boolean;
  realTimeUpdates: boolean;
  performanceMonitoring: boolean;
  hipaaCompliance: boolean;
  auditLogging: boolean;
  retryConfiguration: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    exponentialBackoff: boolean;
  };
  timeouts: {
    crisis: number;
    normal: number;
    maximum: number;
  };
}

/**
 * Default Configuration
 */
export const DEFAULT_WEBHOOK_CONFIG: WebhookConfiguration = {
  crisisMode: false,
  therapeuticMode: true,
  gracePeriodEnabled: true,
  emergencyBypassEnabled: true,
  realTimeUpdates: true,
  performanceMonitoring: true,
  hipaaCompliance: true,
  auditLogging: true,
  retryConfiguration: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    exponentialBackoff: true,
  },
  timeouts: {
    crisis: CRISIS_RESPONSE_TIME_MS,
    normal: NORMAL_RESPONSE_TIME_MS,
    maximum: 30000,
  },
};