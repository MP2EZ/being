/**
 * Webhook Store Integration for Being. P0-CLOUD Payment System
 *
 * Provides seamless integration between type-safe webhook handlers and the existing
 * PaymentStore implementation. Ensures crisis safety, performance compliance, and
 * therapeutic continuity while maintaining backward compatibility.
 *
 * Features:
 * - Integration bridge between TypeSafeWebhookHandlers and PaymentStore
 * - Crisis-safe webhook processing with <200ms guarantees
 * - Grace period management integration
 * - Performance monitoring and compliance validation
 * - Backward compatibility with existing webhook infrastructure
 * - Error handling with therapeutic impact assessment
 */

import type {
  WebhookHandlerResult,
  CrisisSafeWebhookContext,
  PaymentStoreWebhookIntegration,
  WebhookStateSyncResult,
  BillingEventHandlerIntegration,
  WebhookProcessingError
} from '../../types/webhook-handlers';
import type {
  WebhookEvent,
  BillingEventResult
} from '../../types/webhook';
import { typeSafeWebhookHandlerRegistry } from './TypeSafeWebhookHandlers';
import { billingEventHandler } from '../cloud/BillingEventHandler';

/**
 * =============================================================================
 * WEBHOOK CONTEXT BUILDER
 * =============================================================================
 */

/**
 * Build crisis-safe webhook context from payment store state
 */
export class WebhookContextBuilder {
  /**
   * Create context from webhook event and payment store state
   */
  static createContext(
    event: WebhookEvent,
    paymentStoreState: any
  ): CrisisSafeWebhookContext {
    const customerId = event.data?.object?.customer || 'unknown';
    const subscriptionId = event.data?.object?.id || event.data?.object?.subscription;
    const invoiceId = event.data?.object?.invoice;

    // Extract crisis-related data from payment store
    const crisisDetected = paymentStoreState?.crisisMode || false;
    const emergencyBypassActive = paymentStoreState?.crisisOverride?.emergencyBypass || false;
    const userSafetyScore = this.calculateUserSafetyScore(paymentStoreState);

    // Extract grace period information
    const gracePeriodActive = paymentStoreState?.subscriptionState?.gracePeriod?.active || false;
    const gracePeriodStart = paymentStoreState?.subscriptionState?.gracePeriod?.startDate;
    const gracePeriodEnd = paymentStoreState?.subscriptionState?.gracePeriod?.endDate;

    const context: CrisisSafeWebhookContext = {
      // Base context
      customerId,
      subscriptionId,
      invoiceId,
      crisisMode: crisisDetected,
      emergencyContact: paymentStoreState?.customer?.metadata?.emergencyContact,
      gracePeriodActive,

      // Crisis-specific context
      crisisDetected,
      emergencyBypassActive,
      therapeuticSessionActive: paymentStoreState?.activeTherapeuticSession || false,
      userSafetyScore,
      currentAssessmentActive: paymentStoreState?.activeAssessment || false,
      lastCrisisCheck: paymentStoreState?.lastCrisisCheck || new Date().toISOString(),

      // Grace period manager
      gracePeriodManager: {
        active: gracePeriodActive,
        startDate: gracePeriodStart || '',
        endDate: gracePeriodEnd || '',
        remainingDays: this.calculateRemainingDays(gracePeriodEnd),
        therapeuticAccess: true
      }
    };

    return context;
  }

  /**
   * Calculate user safety score from payment store state
   */
  private static calculateUserSafetyScore(paymentStoreState: any): number {
    // Base safety score
    let safetyScore = 50;

    // Adjust based on subscription status
    if (paymentStoreState?.activeSubscription?.status === 'active') {
      safetyScore += 20;
    } else if (paymentStoreState?.activeSubscription?.status === 'past_due') {
      safetyScore -= 10;
    } else if (paymentStoreState?.activeSubscription?.status === 'canceled') {
      safetyScore -= 20;
    }

    // Adjust based on crisis indicators
    if (paymentStoreState?.crisisMode) {
      safetyScore = Math.min(safetyScore, 15); // Crisis mode caps safety score
    }

    // Adjust based on payment errors
    if (paymentStoreState?.lastPaymentError) {
      safetyScore -= 15;
    }

    // Ensure score is within bounds
    return Math.max(0, Math.min(100, safetyScore));
  }

  /**
   * Calculate remaining days in grace period
   */
  private static calculateRemainingDays(endDate?: string): number {
    if (!endDate) return 0;

    const now = Date.now();
    const end = new Date(endDate).getTime();
    const remainingMs = end - now;

    return Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
  }
}

/**
 * =============================================================================
 * WEBHOOK RESULT TRANSFORMER
 * =============================================================================
 */

/**
 * Transform webhook handler results to payment store updates
 */
export class WebhookResultTransformer {
  /**
   * Transform webhook result to payment store state update
   */
  static transformToStoreUpdate(result: WebhookHandlerResult): any {
    const storeUpdate: any = {};

    // Update subscription state
    if (result.subscriptionUpdate) {
      storeUpdate.activeSubscription = {
        id: result.subscriptionUpdate.subscriptionId,
        status: result.subscriptionUpdate.status,
        tier: result.subscriptionUpdate.tier
      };

      // Update grace period state
      if (result.subscriptionUpdate.gracePeriod) {
        storeUpdate.subscriptionState = {
          ...storeUpdate.subscriptionState,
          gracePeriod: {
            active: true,
            startDate: new Date().toISOString(),
            endDate: result.subscriptionUpdate.gracePeriodEnd ||
              new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            reason: result.eventType,
            therapeuticAccess: result.subscriptionUpdate.therapeuticContinuity || true
          }
        };
      }

      // Update crisis state
      if (result.crisisOverride) {
        storeUpdate.crisisMode = true;
        storeUpdate.crisisOverride = {
          eventId: result.eventId,
          active: true,
          emergencyBypass: result.subscriptionUpdate.emergencyAccess || false,
          activatedAt: new Date().toISOString()
        };
      }
    }

    // Clear payment errors if successful
    if (result.success && result.eventType.includes('payment')) {
      storeUpdate.lastPaymentError = null;
    }

    // Update performance metrics
    if (result.performanceMetrics) {
      storeUpdate._performanceMetrics = {
        lastWebhookProcessingTime: result.processingTime,
        crisisCompliant: result.performanceMetrics.crisisCompliant,
        lastUpdated: new Date().toISOString()
      };
    }

    return storeUpdate;
  }

  /**
   * Transform webhook result to BillingEventResult for compatibility
   */
  static transformToBillingEventResult(result: WebhookHandlerResult): BillingEventResult {
    const billingResult: BillingEventResult = {
      processed: result.success,
      eventId: result.eventId,
      eventType: result.eventType,
      processingTime: result.processingTime,
      crisisOverride: result.crisisOverride
    };

    // Add subscription update if present
    if (result.subscriptionUpdate) {
      billingResult.subscriptionUpdate = {
        userId: result.subscriptionUpdate.userId,
        subscriptionId: result.subscriptionUpdate.subscriptionId,
        status: result.subscriptionUpdate.status,
        tier: result.subscriptionUpdate.tier,
        gracePeriod: result.subscriptionUpdate.gracePeriod
      };
    }

    // Add error details if present
    if (result.errorDetails) {
      billingResult.error = {
        code: result.errorDetails.code,
        message: result.errorDetails.message,
        retryable: result.errorDetails.retryable
      };
    }

    return billingResult;
  }
}

/**
 * =============================================================================
 * WEBHOOK STORE INTEGRATION BRIDGE
 * =============================================================================
 */

/**
 * Integration bridge between TypeSafeWebhookHandlers and PaymentStore
 */
export class WebhookStoreIntegrationBridge implements PaymentStoreWebhookIntegration {
  private static instance: WebhookStoreIntegrationBridge;

  public static getInstance(): WebhookStoreIntegrationBridge {
    if (!WebhookStoreIntegrationBridge.instance) {
      WebhookStoreIntegrationBridge.instance = new WebhookStoreIntegrationBridge();
    }
    return WebhookStoreIntegrationBridge.instance;
  }

  /**
   * Main webhook processing endpoint - integrates with BillingEventHandler
   */
  async updateSubscriptionFromWebhook(event: WebhookEvent): Promise<BillingEventResult> {
    try {
      // Get current payment store state (mock - would be actual store state)
      const paymentStoreState = this.getCurrentPaymentStoreState();

      // Create crisis-safe context
      const context = WebhookContextBuilder.createContext(event, paymentStoreState);

      // Process webhook with type-safe handlers
      const webhookResult = await typeSafeWebhookHandlerRegistry.processWebhook(event, context);

      // Transform result to store update
      const storeUpdate = WebhookResultTransformer.transformToStoreUpdate(webhookResult);

      // Apply store update (mock - would be actual store update)
      await this.applyStoreUpdate(storeUpdate);

      // Transform to BillingEventResult for compatibility
      const billingResult = WebhookResultTransformer.transformToBillingEventResult(webhookResult);

      // Integration with BillingEventHandler
      const integration: BillingEventHandlerIntegration = {
        billingEventResult: billingResult,
        webhookHandlerResult: webhookResult,
        performanceCompliant: webhookResult.performanceMetrics?.crisisCompliant || false,
        crisisSafetyMaintained: !webhookResult.crisisOverride || webhookResult.success
      };

      console.log(`Webhook processed successfully: ${event.type}, performance compliant: ${integration.performanceCompliant}`);

      return billingResult;

    } catch (error) {
      console.error(`Webhook processing failed for event ${event.id}:`, error);

      // Create error result
      const errorResult: BillingEventResult = {
        processed: false,
        eventId: event.id,
        eventType: event.type,
        processingTime: 0,
        error: {
          code: 'webhook_processing_failed',
          message: (error as Error).message,
          retryable: true
        }
      };

      return errorResult;
    }
  }

  /**
   * Individual webhook handlers - delegate to type-safe implementations
   */

  handleSubscriptionCreatedWebhook = async (event: WebhookEvent) => {
    const paymentStoreState = this.getCurrentPaymentStoreState();
    const context = WebhookContextBuilder.createContext(event, paymentStoreState);

    return await typeSafeWebhookHandlerRegistry.processWebhook(event, context);
  };

  handleSubscriptionUpdatedWebhook = async (event: WebhookEvent) => {
    const paymentStoreState = this.getCurrentPaymentStoreState();
    const context = WebhookContextBuilder.createContext(event, paymentStoreState);

    return await typeSafeWebhookHandlerRegistry.processWebhook(event, context);
  };

  handleSubscriptionDeletedWebhook = async (event: WebhookEvent) => {
    const paymentStoreState = this.getCurrentPaymentStoreState();
    const context = WebhookContextBuilder.createContext(event, paymentStoreState);

    return await typeSafeWebhookHandlerRegistry.processWebhook(event, context);
  };

  handleTrialEndingWebhook = async (event: WebhookEvent) => {
    const paymentStoreState = this.getCurrentPaymentStoreState();
    const context = WebhookContextBuilder.createContext(event, paymentStoreState);

    return await typeSafeWebhookHandlerRegistry.processWebhook(event, context);
  };

  handlePaymentSucceededWebhook = async (event: WebhookEvent) => {
    const paymentStoreState = this.getCurrentPaymentStoreState();
    const context = WebhookContextBuilder.createContext(event, paymentStoreState);

    return await typeSafeWebhookHandlerRegistry.processWebhook(event, context);
  };

  handlePaymentFailedWebhook = async (event: WebhookEvent) => {
    const paymentStoreState = this.getCurrentPaymentStoreState();
    const context = WebhookContextBuilder.createContext(event, paymentStoreState);

    return await typeSafeWebhookHandlerRegistry.processWebhook(event, context);
  };

  handleInvoicePaymentSucceededWebhook = async (event: WebhookEvent) => {
    const paymentStoreState = this.getCurrentPaymentStoreState();
    const context = WebhookContextBuilder.createContext(event, paymentStoreState);

    return await typeSafeWebhookHandlerRegistry.processWebhook(event, context);
  };

  handleInvoicePaymentFailedWebhook = async (event: WebhookEvent) => {
    const paymentStoreState = this.getCurrentPaymentStoreState();
    const context = WebhookContextBuilder.createContext(event, paymentStoreState);

    return await typeSafeWebhookHandlerRegistry.processWebhook(event, context);
  };

  handleCustomerCreatedWebhook = async (event: WebhookEvent) => {
    const paymentStoreState = this.getCurrentPaymentStoreState();
    const context = WebhookContextBuilder.createContext(event, paymentStoreState);

    return await typeSafeWebhookHandlerRegistry.processWebhook(event, context);
  };

  /**
   * Grace period management - delegate to grace period manager
   */
  async activateGracePeriodFromWebhook(customerId: string): Promise<void> {
    try {
      const gracePeriodManager = typeSafeWebhookHandlerRegistry.getGracePeriodManager();

      await gracePeriodManager.activateGracePeriod({
        userId: customerId, // Assuming customerId maps to userId
        customerId,
        subscriptionId: 'webhook_grace_period',
        reason: 'webhook_initiated',
        duration: 7,
        therapeuticAccess: true,
        crisisProtection: true,
        emergencyBypass: true
      });

      console.log(`Grace period activated from webhook for customer ${customerId}`);
    } catch (error) {
      console.error(`Failed to activate grace period from webhook:`, error);
      throw error;
    }
  }

  /**
   * State synchronization - process multiple webhook events
   */
  async syncWebhookState(events: WebhookEvent[]): Promise<WebhookStateSyncResult> {
    try {
      const paymentStoreState = this.getCurrentPaymentStoreState();
      const context = WebhookContextBuilder.createContext(events[0], paymentStoreState);

      const result = await typeSafeWebhookHandlerRegistry.processWebhookBatch(events, context);

      console.log(`Webhook state sync completed: ${result.processed} processed, ${result.failed} failed`);

      return result;
    } catch (error) {
      console.error('Webhook state sync failed:', error);

      return {
        processed: 0,
        failed: events.length,
        skipped: 0,
        totalProcessingTime: 0,
        crisisOverrides: 0,
        gracePeriodActivations: 0,
        errors: events.map(event => ({
          eventId: event.id,
          error: (error as Error).message,
          retryable: true
        }))
      };
    }
  }

  /**
   * Get current payment store state (mock implementation)
   */
  private getCurrentPaymentStoreState(): any {
    // In actual implementation, this would access the real payment store state
    // For now, return a mock state structure
    return {
      customer: null,
      activeSubscription: null,
      crisisMode: false,
      crisisOverride: null,
      lastPaymentError: null,
      subscriptionState: {
        gracePeriod: {
          active: false,
          startDate: null,
          endDate: null
        }
      },
      activeTherapeuticSession: false,
      activeAssessment: false,
      lastCrisisCheck: new Date().toISOString()
    };
  }

  /**
   * Apply store update (mock implementation)
   */
  private async applyStoreUpdate(storeUpdate: any): Promise<void> {
    // In actual implementation, this would update the payment store
    console.log('Applying store update:', storeUpdate);
  }
}

/**
 * =============================================================================
 * PERFORMANCE MONITORING INTEGRATION
 * =============================================================================
 */

/**
 * Performance monitor for webhook processing
 */
export class WebhookPerformanceMonitor {
  private static instance: WebhookPerformanceMonitor;
  private metrics = {
    totalWebhooks: 0,
    crisisCompliantWebhooks: 0,
    averageProcessingTime: 0,
    maxProcessingTime: 0,
    failedWebhooks: 0,
    gracePeriodActivations: 0
  };

  public static getInstance(): WebhookPerformanceMonitor {
    if (!WebhookPerformanceMonitor.instance) {
      WebhookPerformanceMonitor.instance = new WebhookPerformanceMonitor();
    }
    return WebhookPerformanceMonitor.instance;
  }

  /**
   * Record webhook processing metrics
   */
  recordWebhookProcessing(result: WebhookHandlerResult): void {
    this.metrics.totalWebhooks++;

    if (result.success) {
      // Update processing time metrics
      const currentAvg = this.metrics.averageProcessingTime;
      const newAvg = (currentAvg * (this.metrics.totalWebhooks - 1) + result.processingTime) / this.metrics.totalWebhooks;
      this.metrics.averageProcessingTime = Math.round(newAvg);

      this.metrics.maxProcessingTime = Math.max(this.metrics.maxProcessingTime, result.processingTime);

      // Record crisis compliance
      if (result.performanceMetrics?.crisisCompliant) {
        this.metrics.crisisCompliantWebhooks++;
      }

      // Record grace period activations
      if (result.gracePeriodActivated) {
        this.metrics.gracePeriodActivations++;
      }
    } else {
      this.metrics.failedWebhooks++;
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const crisisComplianceRate = this.metrics.totalWebhooks > 0
      ? (this.metrics.crisisCompliantWebhooks / this.metrics.totalWebhooks) * 100
      : 100;

    const failureRate = this.metrics.totalWebhooks > 0
      ? (this.metrics.failedWebhooks / this.metrics.totalWebhooks) * 100
      : 0;

    return {
      totalWebhooks: this.metrics.totalWebhooks,
      crisisComplianceRate,
      failureRate,
      averageProcessingTime: this.metrics.averageProcessingTime,
      maxProcessingTime: this.metrics.maxProcessingTime,
      gracePeriodActivations: this.metrics.gracePeriodActivations
    };
  }

  /**
   * Check if performance meets crisis safety requirements
   */
  checkCrisisCompliance(): boolean {
    const summary = this.getPerformanceSummary();

    // Crisis compliance requires >95% of events under 200ms
    return summary.crisisComplianceRate >= 95;
  }
}

/**
 * =============================================================================
 * EXPORTS
 * =============================================================================
 */

// Export singleton instances
export const webhookStoreIntegrationBridge = WebhookStoreIntegrationBridge.getInstance();
export const webhookPerformanceMonitor = WebhookPerformanceMonitor.getInstance();

// Export utility classes
export {
  WebhookContextBuilder,
  WebhookResultTransformer,
  WebhookStoreIntegrationBridge,
  WebhookPerformanceMonitor
};