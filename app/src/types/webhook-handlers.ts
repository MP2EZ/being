/**
 * Type-Safe Webhook Handlers for Being. P0-CLOUD Payment System
 *
 * Comprehensive TypeScript interfaces providing strict type safety for all webhook handlers
 * with crisis safety guarantees, performance constraints, and therapeutic continuity support.
 *
 * Features:
 * - Strict type definitions for all webhook event handlers
 * - Crisis safety typing with <200ms performance guarantees
 * - Grace period management with therapeutic continuity
 * - Integration with BillingEventHandler and WebhookEvent infrastructure
 * - Error handling and recovery type definitions
 * - Performance monitoring and compliance tracking
 */

import { z } from 'zod';
import type {
  WebhookEvent,
  BillingEventResult,
  WebhookProcessingResult,
  ClinicalWebhookEvent,
  ClinicalWebhookRequirements,
  PaymentWebhookContext,
  HIPAAWebhookLog
} from './webhook';
import type {
  PaymentError,
  SubscriptionResult,
  CustomerResult,
  CrisisPaymentOverride
} from './payment';

/**
 * =============================================================================
 * WEBHOOK HANDLER CORE TYPES
 * =============================================================================
 */

/**
 * Webhook Handler Performance Constraints for Crisis Safety
 */
export interface WebhookPerformanceConstraints {
  readonly maxProcessingTime: number; // 200ms for crisis events, 2000ms for normal
  readonly crisisResponseTime: number; // Must be ≤200ms
  readonly maxRetryAttempts: number;
  readonly gracePeriodTimeout: number; // 7 days in milliseconds
  readonly emergencyBypassEnabled: boolean;
}

/**
 * Webhook Handler Result with Crisis Safety Integration
 */
export const WebhookHandlerResultSchema = z.object({
  success: z.boolean(),
  processingTime: z.number(), // Milliseconds
  eventId: z.string(),
  eventType: z.string(),
  crisisOverride: z.boolean().optional(),
  gracePeriodActivated: z.boolean().optional(),
  subscriptionUpdate: z.object({
    userId: z.string().optional(),
    subscriptionId: z.string(),
    status: z.enum(['trialing', 'active', 'past_due', 'canceled', 'unpaid', 'crisis_access']),
    tier: z.enum(['basic', 'premium', 'crisis_access', 'none']),
    gracePeriod: z.boolean(),
    gracePeriodEnd: z.string().optional(), // ISO timestamp
    emergencyAccess: z.boolean().optional(),
    therapeuticContinuity: z.boolean().optional()
  }).optional(),
  errorDetails: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
    crisisImpact: z.enum(['none', 'degraded', 'blocked'])
  }).optional(),
  auditTrail: z.array(z.string()).optional(),
  performanceMetrics: z.object({
    startTime: z.number(),
    endTime: z.number(),
    duration: z.number(),
    crisisCompliant: z.boolean(), // True if ≤200ms
    memoryUsage: z.number().optional(),
    networkLatency: z.number().optional()
  }).optional()
});

export type WebhookHandlerResult = z.infer<typeof WebhookHandlerResultSchema>;

/**
 * Crisis-Safe Webhook Context with Therapeutic Data
 */
export interface CrisisSafeWebhookContext extends PaymentWebhookContext {
  readonly crisisDetected: boolean;
  readonly emergencyBypassActive: boolean;
  readonly therapeuticSessionActive: boolean;
  readonly userSafetyScore: number; // 0-100, <20 triggers crisis mode
  readonly currentAssessmentActive: boolean;
  readonly lastCrisisCheck: string; // ISO timestamp
  readonly gracePeriodManager: {
    readonly active: boolean;
    readonly startDate: string;
    readonly endDate: string;
    readonly remainingDays: number;
    readonly therapeuticAccess: boolean;
  };
}

/**
 * =============================================================================
 * SUBSCRIPTION WEBHOOK HANDLER TYPES
 * =============================================================================
 */

/**
 * Subscription Created Webhook Handler
 */
export interface SubscriptionCreatedWebhookData {
  readonly subscription: {
    readonly id: string;
    readonly customer: string;
    readonly status: 'trialing' | 'active' | 'incomplete';
    readonly trial_start: number | null;
    readonly trial_end: number | null;
    readonly current_period_start: number;
    readonly current_period_end: number;
    readonly items: {
      readonly data: Array<{
        readonly id: string;
        readonly price: {
          readonly id: string;
          readonly lookup_key: string;
          readonly recurring: {
            readonly interval: 'month' | 'year';
          };
        };
      }>;
    };
    readonly metadata: {
      readonly userId: string;
      readonly deviceId: string;
      readonly therapeuticConsent: string;
      readonly crisisContactConsent: string;
    };
  };
}

export type SubscriptionCreatedWebhookHandler = (
  event: WebhookEvent & { data: SubscriptionCreatedWebhookData },
  context: CrisisSafeWebhookContext
) => Promise<WebhookHandlerResult>;

/**
 * Subscription Updated Webhook Handler
 */
export interface SubscriptionUpdatedWebhookData extends SubscriptionCreatedWebhookData {
  readonly previous_attributes: {
    readonly status?: string;
    readonly trial_end?: number;
    readonly cancel_at_period_end?: boolean;
    readonly canceled_at?: number;
  };
}

export type SubscriptionUpdatedWebhookHandler = (
  event: WebhookEvent & { data: SubscriptionUpdatedWebhookData },
  context: CrisisSafeWebhookContext
) => Promise<WebhookHandlerResult>;

/**
 * Subscription Deleted Webhook Handler with Crisis Protection
 */
export interface SubscriptionDeletedWebhookData {
  readonly subscription: {
    readonly id: string;
    readonly customer: string;
    readonly status: 'canceled';
    readonly canceled_at: number;
    readonly cancel_at_period_end: boolean;
    readonly ended_at: number | null;
    readonly metadata: {
      readonly userId: string;
      readonly cancellationReason?: string;
      readonly therapeuticImpact?: string;
    };
  };
}

export type SubscriptionDeletedWebhookHandler = (
  event: WebhookEvent & { data: SubscriptionDeletedWebhookData },
  context: CrisisSafeWebhookContext
) => Promise<WebhookHandlerResult>;

/**
 * Trial Ending Webhook Handler with Therapeutic Messaging
 */
export interface TrialEndingWebhookData {
  readonly subscription: {
    readonly id: string;
    readonly customer: string;
    readonly status: 'trialing';
    readonly trial_end: number;
    readonly metadata: {
      readonly userId: string;
      readonly trialEngagement?: string;
      readonly therapeuticProgress?: string;
    };
  };
}

export type TrialEndingWebhookHandler = (
  event: WebhookEvent & { data: TrialEndingWebhookData },
  context: CrisisSafeWebhookContext
) => Promise<WebhookHandlerResult>;

/**
 * =============================================================================
 * PAYMENT WEBHOOK HANDLER TYPES
 * =============================================================================
 */

/**
 * Payment Succeeded Webhook Handler
 */
export interface PaymentSucceededWebhookData {
  readonly payment_intent: {
    readonly id: string;
    readonly customer: string;
    readonly amount: number;
    readonly currency: string;
    readonly status: 'succeeded';
    readonly invoice: string | null;
    readonly metadata: {
      readonly userId: string;
      readonly subscriptionId?: string;
      readonly therapeuticPlan?: string;
    };
  };
}

export type PaymentSucceededWebhookHandler = (
  event: WebhookEvent & { data: PaymentSucceededWebhookData },
  context: CrisisSafeWebhookContext
) => Promise<WebhookHandlerResult>;

/**
 * Payment Failed Webhook Handler with Grace Period Activation
 */
export interface PaymentFailedWebhookData {
  readonly payment_intent: {
    readonly id: string;
    readonly customer: string;
    readonly amount: number;
    readonly currency: string;
    readonly status: 'requires_payment_method' | 'payment_failed';
    readonly last_payment_error: {
      readonly code: string;
      readonly decline_code?: string;
      readonly message: string;
      readonly type: string;
    } | null;
    readonly invoice: string | null;
    readonly metadata: {
      readonly userId: string;
      readonly subscriptionId?: string;
      readonly crisisMode?: string;
    };
  };
}

export type PaymentFailedWebhookHandler = (
  event: WebhookEvent & { data: PaymentFailedWebhookData },
  context: CrisisSafeWebhookContext
) => Promise<WebhookHandlerResult>;

/**
 * =============================================================================
 * INVOICE WEBHOOK HANDLER TYPES
 * =============================================================================
 */

/**
 * Invoice Payment Succeeded Webhook Handler
 */
export interface InvoicePaymentSucceededWebhookData {
  readonly invoice: {
    readonly id: string;
    readonly customer: string;
    readonly subscription: string;
    readonly status: 'paid';
    readonly amount_paid: number;
    readonly amount_due: number;
    readonly currency: string;
    readonly period_start: number;
    readonly period_end: number;
    readonly subscription_details: {
      readonly metadata: {
        readonly userId: string;
        readonly therapeuticTier?: string;
      };
    };
  };
}

export type InvoicePaymentSucceededWebhookHandler = (
  event: WebhookEvent & { data: InvoicePaymentSucceededWebhookData },
  context: CrisisSafeWebhookContext
) => Promise<WebhookHandlerResult>;

/**
 * Invoice Payment Failed Webhook Handler with Therapeutic Grace Period
 */
export interface InvoicePaymentFailedWebhookData {
  readonly invoice: {
    readonly id: string;
    readonly customer: string;
    readonly subscription: string;
    readonly status: 'open';
    readonly amount_due: number;
    readonly currency: string;
    readonly next_payment_attempt: number | null;
    readonly attempt_count: number;
    readonly subscription_details: {
      readonly metadata: {
        readonly userId: string;
        readonly gracePeriodPreference?: string;
      };
    };
  };
}

export type InvoicePaymentFailedWebhookHandler = (
  event: WebhookEvent & { data: InvoicePaymentFailedWebhookData },
  context: CrisisSafeWebhookContext
) => Promise<WebhookHandlerResult>;

/**
 * =============================================================================
 * CUSTOMER WEBHOOK HANDLER TYPES
 * =============================================================================
 */

/**
 * Customer Created Webhook Handler
 */
export interface CustomerCreatedWebhookData {
  readonly customer: {
    readonly id: string;
    readonly email: string;
    readonly name?: string;
    readonly created: number;
    readonly metadata: {
      readonly userId: string;
      readonly deviceId: string;
      readonly therapeuticConsent: string;
      readonly crisisContactConsent: string;
    };
  };
}

export type CustomerCreatedWebhookHandler = (
  event: WebhookEvent & { data: CustomerCreatedWebhookData },
  context: CrisisSafeWebhookContext
) => Promise<WebhookHandlerResult>;

/**
 * =============================================================================
 * GRACE PERIOD MANAGEMENT TYPES
 * =============================================================================
 */

/**
 * Grace Period Activation Parameters
 */
export interface GracePeriodActivationParams {
  readonly userId: string;
  readonly customerId: string;
  readonly subscriptionId: string;
  readonly reason: 'payment_failed' | 'subscription_canceled' | 'invoice_failed' | 'crisis_protection';
  readonly duration: number; // Days
  readonly therapeuticAccess: boolean;
  readonly crisisProtection: boolean;
  readonly emergencyBypass: boolean;
}

/**
 * Grace Period State Management
 */
export interface GracePeriodState {
  readonly active: boolean;
  readonly startDate: string; // ISO timestamp
  readonly endDate: string; // ISO timestamp
  readonly reason: string;
  readonly remainingDays: number;
  readonly therapeuticAccessMaintained: boolean;
  readonly crisisProtectionActive: boolean;
  readonly warningsSent: number;
  readonly lastWarningDate?: string;
}

/**
 * Grace Period Manager Interface
 */
export interface GracePeriodManager {
  activateGracePeriod: (params: GracePeriodActivationParams) => Promise<GracePeriodState>;
  deactivateGracePeriod: (userId: string) => Promise<void>;
  checkGracePeriodStatus: (userId: string) => Promise<GracePeriodState | null>;
  extendGracePeriod: (userId: string, additionalDays: number, reason: string) => Promise<GracePeriodState>;
  sendGracePeriodWarning: (userId: string, daysRemaining: number) => Promise<void>;
  handleGracePeriodExpiry: (userId: string) => Promise<WebhookHandlerResult>;
}

/**
 * =============================================================================
 * WEBHOOK STATE SYNCHRONIZATION TYPES
 * =============================================================================
 */

/**
 * Webhook State Update Parameters
 */
export interface WebhookStateUpdateParams {
  readonly eventId: string;
  readonly eventType: string;
  readonly userId?: string;
  readonly subscriptionUpdate?: {
    readonly subscriptionId: string;
    readonly status: string;
    readonly tier: string;
    readonly gracePeriod: boolean;
    readonly emergencyAccess?: boolean;
  };
  readonly customerUpdate?: {
    readonly customerId: string;
    readonly status: string;
    readonly paymentMethodValid: boolean;
  };
  readonly paymentUpdate?: {
    readonly paymentIntentId: string;
    readonly status: string;
    readonly amount?: number;
    readonly currency?: string;
  };
  readonly crisisOverride?: boolean;
  readonly therapeuticContinuity?: boolean;
}

/**
 * Bulk Webhook State Synchronization
 */
export interface WebhookStateSyncParams {
  readonly events: WebhookEvent[];
  readonly forceSync: boolean;
  readonly crisisMode: boolean;
  readonly maxProcessingTime: number;
  readonly batchSize: number;
}

/**
 * Webhook State Synchronization Result
 */
export interface WebhookStateSyncResult {
  readonly processed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly totalProcessingTime: number;
  readonly crisisOverrides: number;
  readonly gracePeriodActivations: number;
  readonly errors: Array<{
    readonly eventId: string;
    readonly error: string;
    readonly retryable: boolean;
  }>;
}

/**
 * =============================================================================
 * MAIN WEBHOOK HANDLER REGISTRY TYPES
 * =============================================================================
 */

/**
 * Webhook Handler Function Map
 */
export interface WebhookHandlerMap {
  // Subscription handlers
  'customer.subscription.created': SubscriptionCreatedWebhookHandler;
  'customer.subscription.updated': SubscriptionUpdatedWebhookHandler;
  'customer.subscription.deleted': SubscriptionDeletedWebhookHandler;
  'customer.subscription.trial_will_end': TrialEndingWebhookHandler;

  // Payment handlers
  'payment_intent.succeeded': PaymentSucceededWebhookHandler;
  'payment_intent.payment_failed': PaymentFailedWebhookHandler;

  // Invoice handlers
  'invoice.payment_succeeded': InvoicePaymentSucceededWebhookHandler;
  'invoice.payment_failed': InvoicePaymentFailedWebhookHandler;

  // Customer handlers
  'customer.created': CustomerCreatedWebhookHandler;
}

/**
 * Webhook Handler Registry Interface
 */
export interface WebhookHandlerRegistry {
  // Handler registration
  registerHandler: <T extends keyof WebhookHandlerMap>(
    eventType: T,
    handler: WebhookHandlerMap[T]
  ) => void;

  unregisterHandler: (eventType: keyof WebhookHandlerMap) => void;

  // Handler execution
  processWebhook: (
    event: WebhookEvent,
    context: CrisisSafeWebhookContext
  ) => Promise<WebhookHandlerResult>;

  // Batch processing
  processWebhookBatch: (
    events: WebhookEvent[],
    context: CrisisSafeWebhookContext
  ) => Promise<WebhookStateSyncResult>;

  // Crisis safety
  enableCrisisMode: () => void;
  disableCrisisMode: () => void;
  isCrisisMode: () => boolean;

  // Performance monitoring
  getPerformanceMetrics: () => {
    readonly averageProcessingTime: number;
    readonly crisisComplianceRate: number; // % under 200ms
    readonly totalEvents: number;
    readonly failureRate: number;
  };

  // Grace period management
  getGracePeriodManager: () => GracePeriodManager;
}

/**
 * =============================================================================
 * INTEGRATION WITH EXISTING INFRASTRUCTURE
 * =============================================================================
 */

/**
 * Integration with BillingEventHandler
 */
export interface BillingEventHandlerIntegration {
  readonly billingEventResult: BillingEventResult;
  readonly webhookHandlerResult: WebhookHandlerResult;
  readonly performanceCompliant: boolean;
  readonly crisisSafetyMaintained: boolean;
}

/**
 * Integration with PaymentStore Webhook Actions
 */
export interface PaymentStoreWebhookIntegration {
  // Main webhook processing
  updateSubscriptionFromWebhook: (event: WebhookEvent) => Promise<BillingEventResult>;

  // Individual handlers
  handleSubscriptionCreatedWebhook: SubscriptionCreatedWebhookHandler;
  handleSubscriptionUpdatedWebhook: SubscriptionUpdatedWebhookHandler;
  handleSubscriptionDeletedWebhook: SubscriptionDeletedWebhookHandler;
  handleTrialEndingWebhook: TrialEndingWebhookHandler;
  handlePaymentSucceededWebhook: PaymentSucceededWebhookHandler;
  handlePaymentFailedWebhook: PaymentFailedWebhookHandler;
  handleInvoicePaymentSucceededWebhook: InvoicePaymentSucceededWebhookHandler;
  handleInvoicePaymentFailedWebhook: InvoicePaymentFailedWebhookHandler;
  handleCustomerCreatedWebhook: CustomerCreatedWebhookHandler;

  // Grace period management
  activateGracePeriodFromWebhook: (customerId: string) => Promise<void>;

  // State synchronization
  syncWebhookState: (events: WebhookEvent[]) => Promise<WebhookStateSyncResult>;
}

/**
 * =============================================================================
 * ERROR HANDLING AND RECOVERY TYPES
 * =============================================================================
 */

/**
 * Webhook Processing Error
 */
export interface WebhookProcessingError extends Error {
  readonly eventId: string;
  readonly eventType: string;
  readonly processingTime: number;
  readonly crisisImpact: 'none' | 'degraded' | 'blocked';
  readonly retryable: boolean;
  readonly recoveryStrategy: 'retry' | 'graceful_degradation' | 'crisis_fallback';
  readonly therapeuticImpact: 'none' | 'low' | 'medium' | 'high';
}

/**
 * Crisis Fallback Handler
 */
export interface CrisisFallbackHandler {
  handleCrisisWebhookFailure: (
    event: WebhookEvent,
    error: WebhookProcessingError,
    context: CrisisSafeWebhookContext
  ) => Promise<WebhookHandlerResult>;

  activateEmergencyBypass: (
    userId: string,
    reason: string
  ) => Promise<CrisisPaymentOverride>;

  maintainTherapeuticAccess: (
    userId: string,
    duration: number
  ) => Promise<void>;
}

/**
 * =============================================================================
 * AUDIT AND COMPLIANCE TYPES
 * =============================================================================
 */

/**
 * Webhook Audit Entry
 */
export interface WebhookAuditEntry extends HIPAAWebhookLog {
  readonly handlerResult: WebhookHandlerResult;
  readonly performanceCompliant: boolean;
  readonly crisisSafetyMaintained: boolean;
  readonly therapeuticContinuityPreserved: boolean;
  readonly gracePeriodActivated: boolean;
  readonly dataProcessed: {
    readonly subscriptionData: boolean;
    readonly paymentData: boolean;
    readonly customerData: boolean;
    readonly crisisData: boolean;
  };
}

/**
 * Webhook Compliance Monitor
 */
export interface WebhookComplianceMonitor {
  recordWebhookProcessing: (
    event: WebhookEvent,
    result: WebhookHandlerResult,
    context: CrisisSafeWebhookContext
  ) => Promise<WebhookAuditEntry>;

  validateCrisisCompliance: (processingTime: number) => boolean;

  generateComplianceReport: (timeRange: {
    start: string;
    end: string;
  }) => Promise<{
    readonly totalEvents: number;
    readonly crisisComplianceRate: number;
    readonly gracePeriodActivations: number;
    readonly therapeuticContinuityMaintained: number;
    readonly averageProcessingTime: number;
    readonly errors: WebhookProcessingError[];
  }>;
}

/**
 * =============================================================================
 * EXPORTED VALIDATION SCHEMAS
 * =============================================================================
 */

export const WebhookHandlerSchemas = {
  WebhookHandlerResult: WebhookHandlerResultSchema,

  // Performance constraint validation
  performanceConstraints: z.object({
    maxProcessingTime: z.number().max(2000),
    crisisResponseTime: z.number().max(200),
    maxRetryAttempts: z.number().min(1).max(5),
    gracePeriodTimeout: z.number().min(1).max(30 * 24 * 60 * 60 * 1000), // Max 30 days
    emergencyBypassEnabled: z.boolean()
  }),

  // Grace period validation
  gracePeriodParams: z.object({
    userId: z.string().min(1),
    customerId: z.string().min(1),
    subscriptionId: z.string().min(1),
    reason: z.enum(['payment_failed', 'subscription_canceled', 'invoice_failed', 'crisis_protection']),
    duration: z.number().min(1).max(30), // 1-30 days
    therapeuticAccess: z.boolean(),
    crisisProtection: z.boolean(),
    emergencyBypass: z.boolean()
  }),

  // State sync validation
  stateSyncParams: z.object({
    events: z.array(z.any()).min(1).max(100), // Max 100 events per batch
    forceSync: z.boolean(),
    crisisMode: z.boolean(),
    maxProcessingTime: z.number().max(10000), // Max 10 seconds for batch
    batchSize: z.number().min(1).max(50)
  })
} as const;

/**
 * =============================================================================
 * TYPE EXPORTS
 * =============================================================================
 */

export type {
  // Core types
  WebhookPerformanceConstraints,
  WebhookHandlerResult,
  CrisisSafeWebhookContext,

  // Subscription handler types
  SubscriptionCreatedWebhookData,
  SubscriptionCreatedWebhookHandler,
  SubscriptionUpdatedWebhookData,
  SubscriptionUpdatedWebhookHandler,
  SubscriptionDeletedWebhookData,
  SubscriptionDeletedWebhookHandler,
  TrialEndingWebhookData,
  TrialEndingWebhookHandler,

  // Payment handler types
  PaymentSucceededWebhookData,
  PaymentSucceededWebhookHandler,
  PaymentFailedWebhookData,
  PaymentFailedWebhookHandler,

  // Invoice handler types
  InvoicePaymentSucceededWebhookData,
  InvoicePaymentSucceededWebhookHandler,
  InvoicePaymentFailedWebhookData,
  InvoicePaymentFailedWebhookHandler,

  // Customer handler types
  CustomerCreatedWebhookData,
  CustomerCreatedWebhookHandler,

  // Grace period types
  GracePeriodActivationParams,
  GracePeriodState,
  GracePeriodManager,

  // State synchronization types
  WebhookStateUpdateParams,
  WebhookStateSyncParams,
  WebhookStateSyncResult,

  // Registry types
  WebhookHandlerMap,
  WebhookHandlerRegistry,

  // Integration types
  BillingEventHandlerIntegration,
  PaymentStoreWebhookIntegration,

  // Error handling types
  WebhookProcessingError,
  CrisisFallbackHandler,

  // Audit and compliance types
  WebhookAuditEntry,
  WebhookComplianceMonitor
};