/**
 * Webhook Integration Service for FullMind P0-CLOUD Payment System
 *
 * Orchestrates comprehensive webhook processing with:
 * - Complete webhook lifecycle management with security validation
 * - Real-time subscription state synchronization with payment store
 * - Crisis-safe webhook processing with <200ms emergency bypass
 * - State management integration for seamless user experience
 * - Performance monitoring and compliance audit logging
 * - Cross-device sync preparation for webhook-triggered updates
 */

import { billingEventHandler, BillingEventResult } from './BillingEventHandler';
import { webhookSecurityValidator, SecurityValidationResult } from './WebhookSecurityValidator';
import { webhookEventQueue } from './WebhookEventQueue';
import { encryptionService } from '../security/EncryptionService';

export interface WebhookIntegrationConfig {
  webhookSecret: string;
  enableSecurityValidation: boolean;
  enableEventQueueing: boolean;
  enableStateSync: boolean;
  enableAuditLogging: boolean;
  maxWebhookSize: number;
  processingTimeoutMs: number;
  crisisProcessingTimeoutMs: number;
  retryConfiguration: {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
  };
}

export interface WebhookProcessingResult {
  success: boolean;
  processingTime: number;
  securityValidation?: SecurityValidationResult;
  billingResult?: BillingEventResult;
  queueItemId?: string;
  stateUpdated: boolean;
  crisisOverride?: boolean;
  error?: {
    code: string;
    message: string;
    category: 'security' | 'processing' | 'state_sync' | 'validation';
    retryable: boolean;
  };
  auditId?: string;
}

export interface WebhookMetrics {
  totalWebhooks: number;
  successfulWebhooks: number;
  failedWebhooks: number;
  securityBlocked: number;
  crisisOverrides: number;
  averageProcessingTime: number;
  stateUpdateFailures: number;
  queuedForRetry: number;
  uptime: number;
  healthScore: number;
}

export interface StateUpdateContext {
  userId?: string;
  subscriptionId: string;
  previousStatus?: string;
  newStatus: string;
  tier: string;
  gracePeriod: boolean;
  crisisMode: boolean;
  effectiveDate: string;
}

/**
 * Comprehensive Webhook Integration Service
 *
 * Provides end-to-end webhook processing orchestration:
 * - Security validation and threat protection
 * - Event processing with reliability guarantees
 * - Real-time state synchronization
 * - Crisis safety with therapeutic continuity
 * - Performance monitoring and compliance
 * - Cross-device update coordination
 */
export class WebhookIntegrationService {
  private static instance: WebhookIntegrationService;

  private config: WebhookIntegrationConfig;
  private initialized = false;

  // Service metrics
  private metrics: WebhookMetrics = {
    totalWebhooks: 0,
    successfulWebhooks: 0,
    failedWebhooks: 0,
    securityBlocked: 0,
    crisisOverrides: 0,
    averageProcessingTime: 0,
    stateUpdateFailures: 0,
    queuedForRetry: 0,
    uptime: 0,
    healthScore: 100
  };

  // Performance tracking
  private processingTimes: number[] = [];
  private initializationTime = 0;

  // State sync integration
  private paymentStore: any; // Will be injected during initialization

  private constructor() {
    this.config = {
      webhookSecret: '',
      enableSecurityValidation: true,
      enableEventQueueing: true,
      enableStateSync: true,
      enableAuditLogging: true,
      maxWebhookSize: 1024 * 1024, // 1MB
      processingTimeoutMs: 30000, // 30 seconds
      crisisProcessingTimeoutMs: 200, // 200ms for crisis events
      retryConfiguration: {
        maxAttempts: 5,
        baseDelayMs: 1000,
        maxDelayMs: 60000
      }
    };
  }

  public static getInstance(): WebhookIntegrationService {
    if (!WebhookIntegrationService.instance) {
      WebhookIntegrationService.instance = new WebhookIntegrationService();
    }
    return WebhookIntegrationService.instance;
  }

  /**
   * Initialize webhook integration service with all components
   */
  async initialize(
    customConfig?: Partial<WebhookIntegrationConfig>,
    paymentStore?: any
  ): Promise<void> {
    try {
      if (this.initialized) return;

      this.initializationTime = Date.now();
      this.config = { ...this.config, ...customConfig };
      this.paymentStore = paymentStore;

      // Validate configuration
      if (!this.config.webhookSecret) {
        throw new Error('Webhook secret is required for initialization');
      }

      // Initialize encryption service
      await encryptionService.initialize();

      // Initialize security validator
      if (this.config.enableSecurityValidation) {
        await webhookSecurityValidator.initialize({
          maxRequestSizeBytes: this.config.maxWebhookSize,
          enableOriginValidation: true,
          enableRateLimiting: true,
          enablePayloadSanitization: true,
          crisisSecurityBypass: false
        });
      }

      // Initialize event queue
      if (this.config.enableEventQueueing) {
        await webhookEventQueue.initialize({
          maxQueueSize: 10000,
          maxRetryAttempts: this.config.retryConfiguration.maxAttempts,
          baseRetryDelayMs: this.config.retryConfiguration.baseDelayMs,
          maxRetryDelayMs: this.config.retryConfiguration.maxDelayMs,
          crisisProcessingTimeoutMs: this.config.crisisProcessingTimeoutMs,
          processingIntervalMs: 1000,
          persistentStorage: true
        });
      }

      // Initialize billing event handler
      await billingEventHandler.initialize(this.config.webhookSecret, {
        maxRetryAttempts: this.config.retryConfiguration.maxAttempts,
        retryDelayMs: this.config.retryConfiguration.baseDelayMs,
        crisisTimeoutMs: this.config.crisisProcessingTimeoutMs,
        enableAuditLogging: this.config.enableAuditLogging
      });

      // Start monitoring
      this.startPerformanceMonitoring();

      this.initialized = true;
      console.log('Webhook integration service initialized with full crisis safety');

    } catch (error) {
      console.error('Webhook integration service initialization failed:', error);
      throw new Error(`WebhookIntegrationService initialization failed: ${error}`);
    }
  }

  /**
   * Process incoming webhook with complete orchestration
   */
  async processWebhook(
    payload: string,
    signature: string,
    headers: Record<string, string>,
    ipAddress: string,
    crisisMode = false
  ): Promise<WebhookProcessingResult> {
    const startTime = Date.now();

    try {
      this.metrics.totalWebhooks++;

      // Determine if this is a crisis-related webhook
      const isCrisisWebhook = this.isCrisisWebhook(payload) || crisisMode;

      // PHASE 1: Security Validation
      let securityValidation: SecurityValidationResult | undefined;
      if (this.config.enableSecurityValidation && !isCrisisWebhook) {
        securityValidation = await webhookSecurityValidator.validateWebhookSecurity(
          payload,
          headers,
          ipAddress,
          isCrisisWebhook
        );

        // Block if security validation fails
        if (!securityValidation.isValid && securityValidation.recommendedAction === 'block') {
          this.metrics.securityBlocked++;
          return this.createFailureResult(
            startTime,
            'SECURITY_VALIDATION_FAILED',
            `Security validation failed: ${securityValidation.blockedReason}`,
            'security',
            false,
            securityValidation
          );
        }
      }

      // PHASE 2: Crisis Processing (High Priority)
      if (isCrisisWebhook) {
        return await this.processCrisisWebhook(
          payload,
          signature,
          headers,
          startTime,
          securityValidation
        );
      }

      // PHASE 3: Normal Processing
      return await this.processNormalWebhook(
        payload,
        signature,
        headers,
        startTime,
        securityValidation
      );

    } catch (error) {
      console.error('Webhook processing failed:', error);
      this.metrics.failedWebhooks++;

      // For crisis situations, always provide fallback
      if (crisisMode || this.isCrisisWebhook(payload)) {
        return await this.createCrisisFailsafeResult(payload, startTime, error);
      }

      return this.createFailureResult(
        startTime,
        'PROCESSING_ERROR',
        error.message,
        'processing',
        true
      );
    }
  }

  /**
   * Process crisis webhook with <200ms guarantee
   */
  private async processCrisisWebhook(
    payload: string,
    signature: string,
    headers: Record<string, string>,
    startTime: number,
    securityValidation?: SecurityValidationResult
  ): Promise<WebhookProcessingResult> {
    try {
      this.metrics.crisisOverrides++;

      // Crisis events must complete within 200ms
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Crisis webhook timeout')), this.config.crisisProcessingTimeoutMs);
      });

      const processingPromise = this.executeCrisisProcessing(payload, signature, headers, startTime);

      const result = await Promise.race([processingPromise, timeoutPromise]);

      return {
        ...result,
        crisisOverride: true,
        securityValidation
      };

    } catch (error) {
      console.error('Crisis webhook processing failed:', error);

      // Crisis failsafe - always provide access
      return await this.createCrisisFailsafeResult(payload, startTime, error, securityValidation);
    }
  }

  /**
   * Execute crisis processing with immediate state updates
   */
  private async executeCrisisProcessing(
    payload: string,
    signature: string,
    headers: Record<string, string>,
    startTime: number
  ): Promise<WebhookProcessingResult> {
    try {
      // Process with billing event handler in crisis mode
      const billingResult = await billingEventHandler.processWebhook(
        payload,
        signature,
        headers['stripe-signature'] || signature,
        true // Crisis mode
      );

      // Immediate state update for crisis
      let stateUpdated = false;
      if (this.config.enableStateSync && billingResult.subscriptionUpdate) {
        stateUpdated = await this.updateSubscriptionState({
          ...billingResult.subscriptionUpdate,
          crisisMode: true,
          effectiveDate: new Date().toISOString()
        });
      }

      const processingTime = Date.now() - startTime;
      this.updateMetrics(true, processingTime);

      return {
        success: true,
        processingTime,
        billingResult,
        stateUpdated,
        crisisOverride: true
      };

    } catch (error) {
      console.error('Crisis processing execution failed:', error);
      throw error;
    }
  }

  /**
   * Process normal webhook with full validation and queuing
   */
  private async processNormalWebhook(
    payload: string,
    signature: string,
    headers: Record<string, string>,
    startTime: number,
    securityValidation?: SecurityValidationResult
  ): Promise<WebhookProcessingResult> {
    try {
      // STEP 1: Process with billing event handler
      const billingResult = await billingEventHandler.processWebhook(
        payload,
        signature,
        headers['stripe-signature'] || signature,
        false // Normal mode
      );

      // STEP 2: Queue for reliable processing if enabled
      let queueItemId: string | undefined;
      if (this.config.enableEventQueueing && billingResult.processed) {
        try {
          const webhookEvent = JSON.parse(payload);
          queueItemId = await webhookEventQueue.enqueueEvent(
            webhookEvent.id,
            webhookEvent.type,
            webhookEvent,
            this.determineEventPriority(webhookEvent.type),
            false
          );
        } catch (queueError) {
          console.warn('Event queuing failed, proceeding with direct processing:', queueError);
        }
      }

      // STEP 3: Update subscription state
      let stateUpdated = false;
      if (this.config.enableStateSync && billingResult.subscriptionUpdate) {
        stateUpdated = await this.updateSubscriptionState({
          ...billingResult.subscriptionUpdate,
          crisisMode: false,
          effectiveDate: new Date().toISOString()
        });
      }

      const processingTime = Date.now() - startTime;
      this.updateMetrics(true, processingTime);

      return {
        success: true,
        processingTime,
        securityValidation,
        billingResult,
        queueItemId,
        stateUpdated
      };

    } catch (error) {
      console.error('Normal webhook processing failed:', error);

      // Queue for retry if it's a retryable error
      if (this.isRetryableError(error) && this.config.enableEventQueueing) {
        try {
          const webhookEvent = JSON.parse(payload);
          const queueItemId = await webhookEventQueue.enqueueEvent(
            webhookEvent.id,
            webhookEvent.type,
            webhookEvent,
            'high', // Higher priority for retry
            false
          );

          this.metrics.queuedForRetry++;

          return {
            success: false,
            processingTime: Date.now() - startTime,
            securityValidation,
            queueItemId,
            stateUpdated: false,
            error: {
              code: 'QUEUED_FOR_RETRY',
              message: `Processing failed, queued for retry: ${error.message}`,
              category: 'processing',
              retryable: true
            }
          };

        } catch (queueError) {
          console.error('Failed to queue for retry:', queueError);
        }
      }

      throw error;
    }
  }

  /**
   * Update subscription state with payment store integration
   */
  private async updateSubscriptionState(context: StateUpdateContext): Promise<boolean> {
    try {
      if (!this.paymentStore) {
        console.warn('Payment store not available for state update');
        return false;
      }

      // Prepare state update
      const stateUpdate = {
        userId: context.userId,
        subscriptionId: context.subscriptionId,
        status: context.newStatus,
        tier: context.tier,
        gracePeriod: context.gracePeriod,
        lastUpdated: context.effectiveDate,
        crisisOverride: context.crisisMode,
        webhookSource: true
      };

      // Execute state update
      await this.paymentStore.updateSubscriptionFromWebhook(stateUpdate);

      // Trigger cross-device sync if needed
      if (context.userId && !context.crisisMode) {
        await this.triggerCrossDeviceSync(context.userId, stateUpdate);
      }

      console.log(`Subscription state updated: ${context.subscriptionId} -> ${context.newStatus}`);
      return true;

    } catch (error) {
      console.error('Subscription state update failed:', error);
      this.metrics.stateUpdateFailures++;

      // For crisis mode, don't throw - state will be synced later
      if (context.crisisMode) {
        console.warn('Crisis mode: State update failed but continuing for safety');
        return false;
      }

      throw error;
    }
  }

  /**
   * Trigger cross-device synchronization for state updates
   */
  private async triggerCrossDeviceSync(userId: string, stateUpdate: any): Promise<void> {
    try {
      // Mock cross-device sync trigger
      // In production, this would trigger sync across all user devices
      console.log(`Triggering cross-device sync for user ${userId}:`, stateUpdate);

      // Would integrate with cloud sync service for real-time updates

    } catch (error) {
      console.error('Cross-device sync trigger failed:', error);
      // Non-blocking - don't throw
    }
  }

  /**
   * Create crisis failsafe result
   */
  private async createCrisisFailsafeResult(
    payload: string,
    startTime: number,
    error: any,
    securityValidation?: SecurityValidationResult
  ): Promise<WebhookProcessingResult> {
    try {
      // Parse webhook to extract basic info
      let webhookEvent: any = {};
      try {
        webhookEvent = JSON.parse(payload);
      } catch {
        // If can't parse, create minimal fallback
      }

      // Create emergency subscription state
      const emergencyStateUpdate: StateUpdateContext = {
        userId: webhookEvent.data?.object?.metadata?.userId || 'unknown',
        subscriptionId: webhookEvent.data?.object?.id || `emergency_${Date.now()}`,
        newStatus: 'active',
        tier: 'crisis_access',
        gracePeriod: true,
        crisisMode: true,
        effectiveDate: new Date().toISOString()
      };

      // Apply emergency state update
      const stateUpdated = await this.updateSubscriptionState(emergencyStateUpdate);

      this.metrics.crisisOverrides++;

      return {
        success: true,
        processingTime: Date.now() - startTime,
        securityValidation,
        stateUpdated,
        crisisOverride: true,
        billingResult: {
          processed: true,
          eventId: webhookEvent.id || `crisis_${Date.now()}`,
          eventType: webhookEvent.type || 'crisis_failsafe',
          processingTime: Date.now() - startTime,
          crisisOverride: true,
          subscriptionUpdate: emergencyStateUpdate
        }
      };

    } catch (failsafeError) {
      console.error('Crisis failsafe creation failed:', failsafeError);

      // Ultimate fallback
      return {
        success: true, // Always success in crisis
        processingTime: Date.now() - startTime,
        stateUpdated: false,
        crisisOverride: true,
        error: {
          code: 'CRISIS_FAILSAFE_ERROR',
          message: `Crisis failsafe error: ${failsafeError.message}`,
          category: 'processing',
          retryable: false
        }
      };
    }
  }

  /**
   * Create failure result
   */
  private createFailureResult(
    startTime: number,
    code: string,
    message: string,
    category: 'security' | 'processing' | 'state_sync' | 'validation',
    retryable: boolean,
    securityValidation?: SecurityValidationResult
  ): WebhookProcessingResult {
    this.metrics.failedWebhooks++;

    return {
      success: false,
      processingTime: Date.now() - startTime,
      securityValidation,
      stateUpdated: false,
      error: {
        code,
        message,
        category,
        retryable
      }
    };
  }

  /**
   * Check if webhook is crisis-related
   */
  private isCrisisWebhook(payload: string): boolean {
    try {
      const event = JSON.parse(payload);
      const crisisEventTypes = [
        'customer.subscription.deleted',
        'payment_intent.payment_failed',
        'invoice.payment_failed'
      ];

      return crisisEventTypes.includes(event.type);
    } catch {
      return false;
    }
  }

  /**
   * Determine event priority for queuing
   */
  private determineEventPriority(eventType: string): 'crisis' | 'high' | 'normal' | 'low' {
    const priorityMap: { [key: string]: 'crisis' | 'high' | 'normal' | 'low' } = {
      'customer.subscription.deleted': 'crisis',
      'payment_intent.payment_failed': 'crisis',
      'invoice.payment_failed': 'crisis',
      'customer.subscription.created': 'high',
      'payment_intent.succeeded': 'high',
      'customer.subscription.updated': 'normal',
      'customer.subscription.trial_will_end': 'normal',
      'invoice.payment_succeeded': 'low'
    };

    return priorityMap[eventType] || 'normal';
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    const retryablePatterns = [
      /network/i,
      /timeout/i,
      /connection/i,
      /temporary/i,
      /503/,
      /502/,
      /504/
    ];

    const errorMessage = error.message || error.toString();
    return retryablePatterns.some(pattern => pattern.test(errorMessage));
  }

  /**
   * Update service metrics
   */
  private updateMetrics(success: boolean, processingTime: number): void {
    if (success) {
      this.metrics.successfulWebhooks++;
    } else {
      this.metrics.failedWebhooks++;
    }

    // Track processing time
    this.processingTimes.push(processingTime);
    if (this.processingTimes.length > 100) {
      this.processingTimes = this.processingTimes.slice(-50);
    }

    // Update average processing time
    this.metrics.averageProcessingTime = Math.round(
      this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length
    );

    // Update uptime
    this.metrics.uptime = Date.now() - this.initializationTime;

    // Calculate health score
    this.calculateHealthScore();
  }

  /**
   * Calculate service health score
   */
  private calculateHealthScore(): void {
    let healthScore = 100;

    // Success rate factor
    const totalProcessed = this.metrics.successfulWebhooks + this.metrics.failedWebhooks;
    if (totalProcessed > 0) {
      const successRate = this.metrics.successfulWebhooks / totalProcessed;
      if (successRate < 0.95) {
        healthScore -= (0.95 - successRate) * 200; // Up to 40 points penalty
      }
    }

    // Processing time factor
    if (this.metrics.averageProcessingTime > 5000) { // 5 seconds
      healthScore -= 20;
    }

    // Security blocks factor
    if (this.metrics.securityBlocked > this.metrics.totalWebhooks * 0.1) {
      healthScore -= 15; // Penalty for high security blocks
    }

    // State update failures factor
    if (this.metrics.stateUpdateFailures > 0) {
      const failureRate = this.metrics.stateUpdateFailures / this.metrics.totalWebhooks;
      if (failureRate > 0.05) {
        healthScore -= failureRate * 100;
      }
    }

    this.metrics.healthScore = Math.max(0, Math.min(100, healthScore));
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.calculateHealthScore();
    }, 30000); // Update health score every 30 seconds
  }

  /**
   * Get service metrics for monitoring
   */
  async getServiceMetrics(): Promise<WebhookMetrics> {
    return { ...this.metrics };
  }

  /**
   * Get comprehensive service status
   */
  async getServiceStatus(): Promise<{
    initialized: boolean;
    components: {
      billingEventHandler: any;
      securityValidator: any;
      eventQueue: any;
    };
    metrics: WebhookMetrics;
    configuration: {
      securityEnabled: boolean;
      queueingEnabled: boolean;
      stateSyncEnabled: boolean;
      auditLoggingEnabled: boolean;
    };
  }> {
    try {
      const [billingStatus, securityStatus, queueStatus] = await Promise.all([
        billingEventHandler.getBillingEventHandlerStatus(),
        this.config.enableSecurityValidation ? webhookSecurityValidator.getSecurityValidatorStatus() : null,
        this.config.enableEventQueueing ? webhookEventQueue.getQueueStatus() : null
      ]);

      return {
        initialized: this.initialized,
        components: {
          billingEventHandler: billingStatus,
          securityValidator: securityStatus,
          eventQueue: queueStatus
        },
        metrics: { ...this.metrics },
        configuration: {
          securityEnabled: this.config.enableSecurityValidation,
          queueingEnabled: this.config.enableEventQueueing,
          stateSyncEnabled: this.config.enableStateSync,
          auditLoggingEnabled: this.config.enableAuditLogging
        }
      };

    } catch (error) {
      console.error('Failed to get service status:', error);
      return {
        initialized: false,
        components: {
          billingEventHandler: null,
          securityValidator: null,
          eventQueue: null
        },
        metrics: this.metrics,
        configuration: {
          securityEnabled: false,
          queueingEnabled: false,
          stateSyncEnabled: false,
          auditLoggingEnabled: false
        }
      };
    }
  }

  /**
   * Manual webhook replay for debugging
   */
  async replayWebhook(
    webhookId: string,
    payload: string,
    signature: string,
    headers: Record<string, string>
  ): Promise<WebhookProcessingResult> {
    try {
      console.log(`Replaying webhook: ${webhookId}`);

      return await this.processWebhook(
        payload,
        signature,
        { ...headers, 'x-replay': 'true' },
        '127.0.0.1', // Local replay
        false
      );

    } catch (error) {
      console.error('Webhook replay failed:', error);
      throw error;
    }
  }

  /**
   * Emergency reset for crisis situations
   */
  async emergencyReset(): Promise<void> {
    try {
      console.log('Performing emergency reset for crisis safety');

      // Reset all components to safe state
      await billingEventHandler.cleanup();
      if (this.config.enableSecurityValidation) {
        await webhookSecurityValidator.cleanup();
      }
      if (this.config.enableEventQueueing) {
        await webhookEventQueue.cleanup();
      }

      // Reinitialize with crisis-safe defaults
      await this.initialize({
        ...this.config,
        enableSecurityValidation: false, // Disable for emergency
        crisisProcessingTimeoutMs: 100 // Faster crisis processing
      }, this.paymentStore);

      console.log('Emergency reset completed - crisis safety prioritized');

    } catch (error) {
      console.error('Emergency reset failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources on shutdown
   */
  async cleanup(): Promise<void> {
    try {
      // Cleanup all components
      await billingEventHandler.cleanup();

      if (this.config.enableSecurityValidation) {
        await webhookSecurityValidator.cleanup();
      }

      if (this.config.enableEventQueueing) {
        await webhookEventQueue.cleanup();
      }

      // Reset state
      this.initialized = false;
      this.metrics = {
        totalWebhooks: 0,
        successfulWebhooks: 0,
        failedWebhooks: 0,
        securityBlocked: 0,
        crisisOverrides: 0,
        averageProcessingTime: 0,
        stateUpdateFailures: 0,
        queuedForRetry: 0,
        uptime: 0,
        healthScore: 100
      };

      console.log('Webhook integration service cleanup completed');

    } catch (error) {
      console.error('Webhook integration service cleanup failed:', error);
      // Should not throw during cleanup
    }
  }
}

// Export singleton instance
export const webhookIntegrationService = WebhookIntegrationService.getInstance();