/**
 * Webhook Handlers Export Index for Being. P0-CLOUD Payment System
 *
 * Provides a centralized export interface for all type-safe webhook handlers,
 * integration utilities, and performance monitoring components. Maintains
 * crisis safety guarantees and therapeutic continuity.
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

// Core webhook handler types
export type {
  // Core types
  WebhookHandlerResult,
  WebhookPerformanceConstraints,
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
} from '../../types/webhook-handlers';

// =============================================================================
// VALIDATION SCHEMA EXPORTS
// =============================================================================

export { WebhookHandlerSchemas } from '../../types/webhook-handlers';

// =============================================================================
// HANDLER IMPLEMENTATION EXPORTS
// =============================================================================

// Individual webhook handlers
export {
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleTrialEnding,
  handlePaymentSucceeded,
  handlePaymentFailed,
  handleInvoicePaymentSucceeded,
  handleInvoicePaymentFailed,
  handleCustomerCreated
} from './TypeSafeWebhookHandlers';

// Main registry
export {
  typeSafeWebhookHandlerRegistry,
  TypeSafeWebhookHandlerRegistry
} from './TypeSafeWebhookHandlers';

// Utility classes
export {
  CrisisSafetyValidator,
  TherapeuticGracePeriodManager,
  CrisisWebhookFallbackHandler
} from './TypeSafeWebhookHandlers';

// =============================================================================
// INTEGRATION EXPORTS
// =============================================================================

// Integration bridge
export {
  webhookStoreIntegrationBridge,
  WebhookStoreIntegrationBridge
} from './WebhookStoreIntegration';

// Utility classes
export {
  WebhookContextBuilder,
  WebhookResultTransformer,
  WebhookPerformanceMonitor,
  webhookPerformanceMonitor
} from './WebhookStoreIntegration';

// =============================================================================
// CONVENIENCE EXPORTS FOR COMMON USE CASES
// =============================================================================

/**
 * Main webhook processing interface
 * Provides simple access to the most commonly used webhook functionality
 */
export interface WebhookProcessorInterface {
  // Process single webhook
  processWebhook: (event: any, context?: any) => Promise<any>;

  // Process webhook batch
  processWebhookBatch: (events: any[], context?: any) => Promise<any>;

  // Grace period management
  activateGracePeriod: (userId: string, reason: string) => Promise<void>;
  checkGracePeriodStatus: (userId: string) => Promise<any>;

  // Crisis management
  enableCrisisMode: () => void;
  disableCrisisMode: () => void;
  isCrisisMode: () => boolean;

  // Performance monitoring
  getPerformanceMetrics: () => any;
  checkCrisisCompliance: () => boolean;
}

/**
 * Create webhook processor with default configuration
 */
export function createWebhookProcessor(): WebhookProcessorInterface {
  return {
    // Process single webhook with automatic context building
    processWebhook: async (event: any, context?: any) => {
      try {
        const { typeSafeWebhookHandlerRegistry } = await import('./TypeSafeWebhookHandlers');
        const { WebhookContextBuilder } = await import('./WebhookStoreIntegration');

        const webhookContext = context || WebhookContextBuilder.createContext(event, {});
        return await typeSafeWebhookHandlerRegistry.processWebhook(event, webhookContext);
      } catch (error) {
        console.error('Webhook processing failed:', error);
        throw error;
      }
    },

    // Process webhook batch
    processWebhookBatch: async (events: any[], context?: any) => {
      try {
        const { typeSafeWebhookHandlerRegistry } = await import('./TypeSafeWebhookHandlers');
        const { WebhookContextBuilder } = await import('./WebhookStoreIntegration');

        const webhookContext = context || WebhookContextBuilder.createContext(events[0], {});
        return await typeSafeWebhookHandlerRegistry.processWebhookBatch(events, webhookContext);
      } catch (error) {
        console.error('Webhook batch processing failed:', error);
        throw error;
      }
    },

    // Grace period management
    activateGracePeriod: async (userId: string, reason: string) => {
      try {
        const { typeSafeWebhookHandlerRegistry } = await import('./TypeSafeWebhookHandlers');
        const gracePeriodManager = typeSafeWebhookHandlerRegistry.getGracePeriodManager();

        await gracePeriodManager.activateGracePeriod({
          userId,
          customerId: userId,
          subscriptionId: 'manual_activation',
          reason: reason as any,
          duration: 7,
          therapeuticAccess: true,
          crisisProtection: true,
          emergencyBypass: true
        });
      } catch (error) {
        console.error('Grace period activation failed:', error);
        throw error;
      }
    },

    checkGracePeriodStatus: async (userId: string) => {
      try {
        const { typeSafeWebhookHandlerRegistry } = await import('./TypeSafeWebhookHandlers');
        const gracePeriodManager = typeSafeWebhookHandlerRegistry.getGracePeriodManager();

        return await gracePeriodManager.checkGracePeriodStatus(userId);
      } catch (error) {
        console.error('Grace period status check failed:', error);
        return null;
      }
    },

    // Crisis management
    enableCrisisMode: () => {
      import('./TypeSafeWebhookHandlers').then(({ typeSafeWebhookHandlerRegistry }) => {
        typeSafeWebhookHandlerRegistry.enableCrisisMode();
      });
    },

    disableCrisisMode: () => {
      import('./TypeSafeWebhookHandlers').then(({ typeSafeWebhookHandlerRegistry }) => {
        typeSafeWebhookHandlerRegistry.disableCrisisMode();
      });
    },

    isCrisisMode: () => {
      // This is synchronous, so we need to handle it differently
      try {
        const { typeSafeWebhookHandlerRegistry } = require('./TypeSafeWebhookHandlers');
        return typeSafeWebhookHandlerRegistry.isCrisisMode();
      } catch {
        return false;
      }
    },

    // Performance monitoring
    getPerformanceMetrics: () => {
      try {
        const { typeSafeWebhookHandlerRegistry } = require('./TypeSafeWebhookHandlers');
        return typeSafeWebhookHandlerRegistry.getPerformanceMetrics();
      } catch (error) {
        console.error('Failed to get performance metrics:', error);
        return {
          averageProcessingTime: 0,
          crisisComplianceRate: 0,
          totalEvents: 0,
          failureRate: 0
        };
      }
    },

    checkCrisisCompliance: () => {
      try {
        const { webhookPerformanceMonitor } = require('./WebhookStoreIntegration');
        return webhookPerformanceMonitor.checkCrisisCompliance();
      } catch (error) {
        console.error('Failed to check crisis compliance:', error);
        return false;
      }
    }
  };
}

// =============================================================================
// DEFAULT WEBHOOK PROCESSOR INSTANCE
// =============================================================================

/**
 * Default webhook processor instance for convenience
 */
export const webhookProcessor = createWebhookProcessor();

// =============================================================================
// CRISIS SAFETY UTILITIES
// =============================================================================

/**
 * Crisis safety utilities for webhook processing
 */
export const CrisisSafetyUtils = {
  /**
   * Validate if processing time meets crisis requirements
   */
  validateCrisisResponseTime: (processingTime: number): boolean => {
    return processingTime <= 200; // 200ms requirement
  },

  /**
   * Check if event is crisis-related
   */
  isCrisisEvent: (eventType: string): boolean => {
    const crisisEventTypes = [
      'customer.subscription.deleted',
      'payment_intent.payment_failed',
      'invoice.payment_failed'
    ];
    return crisisEventTypes.includes(eventType);
  },

  /**
   * Create crisis-safe timeout for webhook processing
   */
  createCrisisTimeout: (crisisMode: boolean): number => {
    return crisisMode ? 200 : 2000; // 200ms for crisis, 2s for normal
  },

  /**
   * Calculate user safety score from context
   */
  calculateSafetyScore: (context: any): number => {
    let score = 50; // Base score

    if (context.crisisDetected) score = Math.min(score, 15);
    if (context.emergencyBypassActive) score = Math.min(score, 10);
    if (context.gracePeriodActive) score -= 10;
    if (context.therapeuticSessionActive) score += 20;

    return Math.max(0, Math.min(100, score));
  }
};

// =============================================================================
// THERAPEUTIC CONTINUITY UTILITIES
// =============================================================================

/**
 * Therapeutic continuity utilities for maintaining user access
 */
export const TherapeuticContinuityUtils = {
  /**
   * Determine if therapeutic access should be maintained
   */
  shouldMaintainTherapeuticAccess: (context: any): boolean => {
    return (
      context.crisisDetected ||
      context.therapeuticSessionActive ||
      context.currentAssessmentActive ||
      context.userSafetyScore < 20
    );
  },

  /**
   * Calculate grace period duration based on context
   */
  calculateGracePeriodDuration: (context: any, reason: string): number => {
    let days = 7; // Default 7 days

    if (context.crisisDetected) days = 14; // Extended for crisis
    if (reason === 'payment_failed') days = 7;
    if (reason === 'subscription_canceled') days = 7;
    if (reason === 'invoice_failed') days = 3;

    return days;
  },

  /**
   * Determine therapeutic messaging type based on event
   */
  getTherapeuticMessageType: (eventType: string, context: any): string | null => {
    const messageMap: { [key: string]: string } = {
      'customer.subscription.created': 'subscription_welcome',
      'customer.subscription.deleted': 'subscription_cancelled',
      'customer.subscription.trial_will_end': 'trial_ending',
      'payment_intent.succeeded': 'payment_succeeded',
      'payment_intent.payment_failed': 'payment_failed',
      'invoice.payment_failed': 'billing_failed'
    };

    if (context.crisisDetected) {
      return null; // No messaging during crisis
    }

    return messageMap[eventType] || null;
  }
};

// =============================================================================
// ERROR HANDLING UTILITIES
// =============================================================================

/**
 * Error handling utilities for webhook processing
 */
export const WebhookErrorUtils = {
  /**
   * Create standardized webhook error
   */
  createWebhookError: (
    eventId: string,
    eventType: string,
    error: Error,
    processingTime: number,
    crisisMode: boolean
  ): any => {
    return {
      eventId,
      eventType,
      message: error.message,
      processingTime,
      crisisImpact: crisisMode ? 'blocked' : 'none',
      retryable: !crisisMode, // Don't retry in crisis mode
      recoveryStrategy: crisisMode ? 'crisis_fallback' : 'retry',
      therapeuticImpact: crisisMode ? 'high' : 'low'
    };
  },

  /**
   * Determine if error is retryable
   */
  isRetryableError: (error: any): boolean => {
    const nonRetryableErrors = [
      'invalid_signature',
      'malformed_event',
      'unsupported_event_type'
    ];

    return !nonRetryableErrors.includes(error.code);
  },

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay: (attempt: number, baseDelay: number = 1000): number => {
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }
};

// =============================================================================
// DOCUMENTATION EXPORT
// =============================================================================

/**
 * Webhook handler documentation and usage examples
 */
export const WebhookHandlerDocs = {
  overview: `
    Being. P0-CLOUD Type-Safe Webhook Handlers

    Provides comprehensive, type-safe webhook handling with crisis safety guarantees,
    therapeutic continuity, and performance compliance. All handlers maintain <200ms
    response times for crisis events while ensuring therapeutic access is preserved.
  `,

  usage: {
    basic: `
      import { webhookProcessor } from './services/webhooks';

      // Process single webhook
      const result = await webhookProcessor.processWebhook(webhookEvent);

      // Process webhook batch
      const batchResult = await webhookProcessor.processWebhookBatch(events);
    `,

    advanced: `
      import {
        typeSafeWebhookHandlerRegistry,
        WebhookContextBuilder
      } from './services/webhooks';

      // Create custom context
      const context = WebhookContextBuilder.createContext(event, storeState);

      // Process with custom context
      const result = await typeSafeWebhookHandlerRegistry.processWebhook(event, context);
    `,

    crisisSafety: `
      import { CrisisSafetyUtils, webhookProcessor } from './services/webhooks';

      // Enable crisis mode
      webhookProcessor.enableCrisisMode();

      // Check crisis compliance
      const compliant = webhookProcessor.checkCrisisCompliance();

      // Validate response time
      const crisisCompliant = CrisisSafetyUtils.validateCrisisResponseTime(150); // true
    `
  },

  performance: `
    Crisis Safety Requirements:
    - Crisis events must process within 200ms
    - Normal events must process within 2000ms
    - 95% crisis compliance rate required
    - Automatic fallback for timeout scenarios
    - Therapeutic access maintained during failures
  `,

  types: `
    All webhook handlers are fully typed with strict TypeScript interfaces.
    Crisis safety, grace periods, and therapeutic continuity are enforced
    at the type level to prevent runtime errors affecting user safety.
  `
};

// =============================================================================
// FINAL EXPORTS
// =============================================================================

// Re-export everything for convenience
export * from '../../types/webhook-handlers';
export * from './TypeSafeWebhookHandlers';
export * from './WebhookStoreIntegration';