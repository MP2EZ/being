import { z } from 'zod';

// Base Webhook Event Schema
export const WebhookEventSchema = z.object({
  id: z.string(),
  object: z.literal('event'),
  api_version: z.string().optional(),
  created: z.number(),
  data: z.object({
    object: z.any(),
    previous_attributes: z.record(z.any()).optional(),
  }),
  livemode: z.boolean(),
  pending_webhooks: z.number(),
  request: z.object({
    id: z.string().nullable(),
    idempotency_key: z.string().nullable(),
  }),
  type: z.string(),
});

export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

// Webhook Event Types
export type WebhookEventType =
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'customer.subscription.trial_will_end'
  | 'invoice.created'
  | 'invoice.finalized'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed'
  | 'invoice.payment_action_required'
  | 'payment_method.attached'
  | 'payment_method.detached'
  | 'customer.created'
  | 'customer.updated'
  | 'customer.deleted';

// Subscription Webhook Event Data
export const SubscriptionWebhookDataSchema = z.object({
  object: z.object({
    id: z.string(),
    object: z.literal('subscription'),
    customer: z.string(),
    status: z.enum(['trialing', 'active', 'past_due', 'canceled', 'unpaid']),
    current_period_start: z.number(),
    current_period_end: z.number(),
    trial_start: z.number().nullable(),
    trial_end: z.number().nullable(),
    cancel_at_period_end: z.boolean(),
    canceled_at: z.number().nullable(),
    items: z.object({
      data: z.array(z.object({
        id: z.string(),
        price: z.object({
          id: z.string(),
          nickname: z.string().nullable(),
          recurring: z.object({
            interval: z.enum(['day', 'week', 'month', 'year']),
          }).nullable(),
        }),
      })),
    }),
    metadata: z.record(z.string()),
  }),
  previous_attributes: z.record(z.any()).optional(),
});

export type SubscriptionWebhookData = z.infer<typeof SubscriptionWebhookDataSchema>;

// Invoice Webhook Event Data
export const InvoiceWebhookDataSchema = z.object({
  object: z.object({
    id: z.string(),
    object: z.literal('invoice'),
    customer: z.string(),
    subscription: z.string().nullable(),
    status: z.enum(['draft', 'open', 'paid', 'void', 'uncollectible']),
    amount_due: z.number(),
    amount_paid: z.number(),
    amount_remaining: z.number(),
    payment_intent: z.string().nullable(),
    hosted_invoice_url: z.string().nullable(),
    invoice_pdf: z.string().nullable(),
    lines: z.object({
      data: z.array(z.object({
        id: z.string(),
        amount: z.number(),
        description: z.string().nullable(),
        period: z.object({
          start: z.number(),
          end: z.number(),
        }),
      })),
    }),
    metadata: z.record(z.string()),
  }),
  previous_attributes: z.record(z.any()).optional(),
});

export type InvoiceWebhookData = z.infer<typeof InvoiceWebhookDataSchema>;

// Webhook Processing Result
export const WebhookProcessingResultSchema = z.object({
  eventId: z.string(),
  success: z.boolean(),
  processingTime: z.number(),
  error: z.string().optional(),
  retryCount: z.number().default(0),
  timestamp: z.date(),
});

export type WebhookProcessingResult = z.infer<typeof WebhookProcessingResultSchema>;

// Webhook Status Types
export interface WebhookConnectionStatus {
  connected: boolean;
  lastHeartbeat: Date | null;
  endpoint: string;
  secretConfigured: boolean;
}

export interface WebhookMetrics {
  totalEvents: number;
  processedEvents: number;
  failedEvents: number;
  averageProcessingTime: number;
  successRate: number;
  lastProcessedAt: Date | null;
  queueSize: number;
}

export interface WebhookQueueItem {
  id: string;
  event: WebhookEvent;
  attempts: number;
  maxAttempts: number;
  nextRetryAt: Date;
  priority: 'low' | 'normal' | 'high' | 'critical';
  createdAt: Date;
  error?: string;
}

// Crisis-specific webhook handling
export interface CrisisWebhookOverride {
  eventType: WebhookEventType;
  crisisMode: boolean;
  emergencyBypass: boolean;
  processingTimeLimit: number; // ms
}

// Payment webhook with crisis safety
export interface PaymentWebhookContext {
  customerId: string;
  subscriptionId?: string;
  invoiceId?: string;
  crisisMode: boolean;
  emergencyContact?: string;
  gracePeriodActive: boolean;
}

// Webhook Event Handler Function Type
export type WebhookEventHandler<T = any> = (
  event: WebhookEvent,
  data: T,
  context: PaymentWebhookContext
) => Promise<WebhookProcessingResult>;

// Webhook Configuration
export interface WebhookConfig {
  endpoint: string;
  secret: string;
  enabledEvents: WebhookEventType[];
  retryPolicy: {
    maxAttempts: number;
    backoffMultiplier: number;
    maxDelay: number;
  };
  crisisOverrides: CrisisWebhookOverride[];
  securitySettings: {
    enforceSignatureVerification: boolean;
    toleranceSeconds: number;
    rateLimitPerMinute: number;
  };
}

// Webhook Subscription State
export interface WebhookSubscriptionState {
  status: 'idle' | 'processing' | 'error' | 'crisis_mode';
  connectedAt: Date | null;
  lastEventAt: Date | null;
  eventCount: number;
  errorCount: number;
  currentSubscription?: {
    id: string;
    status: string;
    tier: string;
  };
}

// Clinical Safety Webhook Requirements
export interface ClinicalWebhookRequirements {
  maxProcessingTime: number; // 200ms for crisis events
  emergencyBypass: boolean;
  requiresAuditLog: boolean;
  crisisPriority: 'immediate' | 'urgent' | 'standard';
  therapeuticImpact: 'none' | 'low' | 'medium' | 'high';
}

// Webhook Event with Clinical Context
export interface ClinicalWebhookEvent extends WebhookEvent {
  clinicalContext: {
    userInCrisis: boolean;
    activeAssessment: boolean;
    therapeuticSession: boolean;
    emergencyContactNeeded: boolean;
  };
  safetyRequirements: ClinicalWebhookRequirements;
}

// HIPAA Compliant Webhook Logging
export interface HIPAAWebhookLog {
  eventId: string;
  timestamp: Date;
  eventType: WebhookEventType;
  processingResult: 'success' | 'failure' | 'retry';
  processingTime: number;
  userIdHash?: string; // Hashed, never plain text
  errorCode?: string;
  auditTrail: string[];
}

// Webhook Security Validation
export const WebhookSecurityValidationSchema = z.object({
  signature: z.string(),
  timestamp: z.number(),
  payload: z.string(),
  tolerance: z.number().default(300), // 5 minutes
});

export type WebhookSecurityValidation = z.infer<typeof WebhookSecurityValidationSchema>;

// Export all webhook-related types
export type {
  WebhookEvent,
  WebhookEventType,
  SubscriptionWebhookData,
  InvoiceWebhookData,
  WebhookProcessingResult,
  WebhookConnectionStatus,
  WebhookMetrics,
  WebhookQueueItem,
  CrisisWebhookOverride,
  PaymentWebhookContext,
  WebhookEventHandler,
  WebhookConfig,
  WebhookSubscriptionState,
  ClinicalWebhookRequirements,
  ClinicalWebhookEvent,
  HIPAAWebhookLog,
  WebhookSecurityValidation,
};

// Schema exports for runtime validation
export {
  WebhookEventSchema,
  SubscriptionWebhookDataSchema,
  InvoiceWebhookDataSchema,
  WebhookProcessingResultSchema,
  WebhookSecurityValidationSchema,
};