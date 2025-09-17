/**
 * Type-Safe Webhook Handlers Test Suite
 *
 * Comprehensive tests for webhook handlers ensuring:
 * - Type safety and strict TypeScript compliance
 * - Crisis response time guarantees (<200ms)
 * - Grace period management accuracy
 * - Therapeutic continuity preservation
 * - Error handling and fallback mechanisms
 * - Performance monitoring and compliance validation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type {
  WebhookEvent,
  WebhookHandlerResult,
  CrisisSafeWebhookContext,
  GracePeriodState
} from '../../../types/webhook-handlers';
import {
  TypeSafeWebhookHandlerRegistry,
  CrisisSafetyValidator,
  TherapeuticGracePeriodManager,
  CrisisWebhookFallbackHandler,
  handleSubscriptionCreated,
  handleSubscriptionDeleted,
  handlePaymentFailed
} from '../TypeSafeWebhookHandlers';

// Mock webhook events for testing
const createMockSubscriptionCreatedEvent = (userId: string): WebhookEvent & { data: any } => ({
  id: `evt_${Date.now()}`,
  type: 'customer.subscription.created',
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: `sub_${userId}`,
      customer: `cus_${userId}`,
      status: 'trialing',
      trial_start: Math.floor(Date.now() / 1000),
      trial_end: Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000),
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
      items: {
        data: [{
          id: 'si_test',
          price: {
            id: 'price_test',
            lookup_key: 'fullmind_monthly',
            recurring: { interval: 'month' as const }
          }
        }]
      },
      metadata: {
        userId,
        deviceId: 'test_device',
        therapeuticConsent: 'true',
        crisisContactConsent: 'true'
      }
    }
  },
  livemode: false,
  pending_webhooks: 1,
  request: { id: null, idempotency_key: null },
  api_version: '2023-10-16'
});

const createMockSubscriptionDeletedEvent = (userId: string): WebhookEvent & { data: any } => ({
  id: `evt_${Date.now()}`,
  type: 'customer.subscription.deleted',
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: `sub_${userId}`,
      customer: `cus_${userId}`,
      status: 'canceled',
      canceled_at: Math.floor(Date.now() / 1000),
      cancel_at_period_end: false,
      ended_at: Math.floor(Date.now() / 1000),
      metadata: {
        userId,
        cancellationReason: 'user_requested'
      }
    }
  },
  livemode: false,
  pending_webhooks: 1,
  request: { id: null, idempotency_key: null },
  api_version: '2023-10-16'
});

const createMockPaymentFailedEvent = (userId: string): WebhookEvent & { data: any } => ({
  id: `evt_${Date.now()}`,
  type: 'payment_intent.payment_failed',
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: `pi_${userId}`,
      customer: `cus_${userId}`,
      amount: 999,
      currency: 'usd',
      status: 'requires_payment_method',
      last_payment_error: {
        code: 'card_declined',
        decline_code: 'insufficient_funds',
        message: 'Your card was declined.',
        type: 'card_error'
      },
      invoice: null,
      metadata: {
        userId,
        subscriptionId: `sub_${userId}`,
        crisisMode: 'false'
      }
    }
  },
  livemode: false,
  pending_webhooks: 1,
  request: { id: null, idempotency_key: null },
  api_version: '2023-10-16'
});

const createMockCrisisSafeContext = (
  crisisDetected: boolean = false,
  gracePeriodActive: boolean = false
): CrisisSafeWebhookContext => ({
  customerId: 'cus_test',
  subscriptionId: 'sub_test',
  invoiceId: 'in_test',
  crisisMode: crisisDetected,
  emergencyContact: 'emergency@test.com',
  gracePeriodActive,
  crisisDetected,
  emergencyBypassActive: false,
  therapeuticSessionActive: false,
  userSafetyScore: crisisDetected ? 10 : 60,
  currentAssessmentActive: false,
  lastCrisisCheck: new Date().toISOString(),
  gracePeriodManager: {
    active: gracePeriodActive,
    startDate: gracePeriodActive ? new Date().toISOString() : '',
    endDate: gracePeriodActive ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : '',
    remainingDays: gracePeriodActive ? 7 : 0,
    therapeuticAccess: true
  }
});

describe('TypeSafeWebhookHandlers', () => {
  let registry: TypeSafeWebhookHandlerRegistry;
  let crisisSafetyValidator: CrisisSafetyValidator;
  let gracePeriodManager: TherapeuticGracePeriodManager;
  let fallbackHandler: CrisisWebhookFallbackHandler;

  beforeEach(() => {
    registry = new TypeSafeWebhookHandlerRegistry();
    crisisSafetyValidator = CrisisSafetyValidator.getInstance();
    gracePeriodManager = new TherapeuticGracePeriodManager();
    fallbackHandler = new CrisisWebhookFallbackHandler();

    // Reset performance metrics
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Crisis Safety Validator', () => {
    it('should validate crisis response time compliance', () => {
      expect(crisisSafetyValidator.validateCrisisCompliance(150, true)).toBe(true);
      expect(crisisSafetyValidator.validateCrisisCompliance(250, true)).toBe(false);
      expect(crisisSafetyValidator.validateCrisisCompliance(1500, false)).toBe(true);
      expect(crisisSafetyValidator.validateCrisisCompliance(2500, false)).toBe(false);
    });

    it('should measure processing time with compliance validation', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await crisisSafetyValidator.measureProcessingTime(
        mockOperation,
        true // Crisis mode
      );

      expect(result.result).toBe('success');
      expect(typeof result.processingTime).toBe('number');
      expect(typeof result.compliant).toBe('boolean');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should timeout crisis operations after 200ms', async () => {
      const slowOperation = () => new Promise(resolve => setTimeout(resolve, 300));

      await expect(
        crisisSafetyValidator.measureProcessingTime(slowOperation, true)
      ).rejects.toThrow('Webhook processing timeout after 200ms');
    });

    it('should allow longer timeouts for normal operations', async () => {
      const slowOperation = () => new Promise(resolve => setTimeout(resolve, 1500));

      const result = await crisisSafetyValidator.measureProcessingTime(slowOperation, false);

      expect(result.result).toBeUndefined();
      expect(result.processingTime).toBeGreaterThan(1400);
      expect(result.compliant).toBe(true);
    });
  });

  describe('Therapeutic Grace Period Manager', () => {
    it('should activate grace period with correct parameters', async () => {
      const params = {
        userId: 'user_test',
        customerId: 'cus_test',
        subscriptionId: 'sub_test',
        reason: 'payment_failed' as const,
        duration: 7,
        therapeuticAccess: true,
        crisisProtection: true,
        emergencyBypass: false
      };

      const gracePeriod = await gracePeriodManager.activateGracePeriod(params);

      expect(gracePeriod.active).toBe(true);
      expect(gracePeriod.reason).toBe('payment_failed');
      expect(gracePeriod.remainingDays).toBe(7);
      expect(gracePeriod.therapeuticAccessMaintained).toBe(true);
      expect(gracePeriod.crisisProtectionActive).toBe(true);
    });

    it('should check grace period status correctly', async () => {
      const userId = 'user_test';

      // No grace period initially
      let status = await gracePeriodManager.checkGracePeriodStatus(userId);
      expect(status).toBeNull();

      // Activate grace period
      await gracePeriodManager.activateGracePeriod({
        userId,
        customerId: 'cus_test',
        subscriptionId: 'sub_test',
        reason: 'subscription_canceled',
        duration: 5,
        therapeuticAccess: true,
        crisisProtection: true,
        emergencyBypass: false
      });

      // Check status
      status = await gracePeriodManager.checkGracePeriodStatus(userId);
      expect(status).not.toBeNull();
      expect(status!.active).toBe(true);
      expect(status!.remainingDays).toBe(5);
    });

    it('should extend grace period correctly', async () => {
      const userId = 'user_test';

      // Activate initial grace period
      await gracePeriodManager.activateGracePeriod({
        userId,
        customerId: 'cus_test',
        subscriptionId: 'sub_test',
        reason: 'payment_failed',
        duration: 3,
        therapeuticAccess: true,
        crisisProtection: true,
        emergencyBypass: false
      });

      // Extend grace period
      const extended = await gracePeriodManager.extendGracePeriod(userId, 4, 'therapeutic_need');

      expect(extended.remainingDays).toBe(7); // 3 + 4
      expect(extended.reason).toContain('extended: therapeutic_need');
    });

    it('should handle grace period expiry', async () => {
      const userId = 'user_test';

      // Activate grace period
      await gracePeriodManager.activateGracePeriod({
        userId,
        customerId: 'cus_test',
        subscriptionId: 'sub_test',
        reason: 'payment_failed',
        duration: 7,
        therapeuticAccess: true,
        crisisProtection: true,
        emergencyBypass: false
      });

      // Handle expiry
      const result = await gracePeriodManager.handleGracePeriodExpiry(userId);

      expect(result.success).toBe(true);
      expect(result.eventType).toBe('grace_period_expired');
      expect(result.subscriptionUpdate?.status).toBe('canceled');
      expect(result.subscriptionUpdate?.therapeuticContinuity).toBe(true);

      // Grace period should be deactivated
      const status = await gracePeriodManager.checkGracePeriodStatus(userId);
      expect(status).toBeNull();
    });
  });

  describe('Crisis Webhook Fallback Handler', () => {
    it('should handle crisis webhook failure with safety fallback', async () => {
      const event = createMockSubscriptionDeletedEvent('user_crisis');
      const error = {
        eventId: event.id,
        eventType: event.type,
        message: 'Processing failed',
        processingTime: 300,
        crisisImpact: 'blocked' as const,
        retryable: false,
        recoveryStrategy: 'crisis_fallback' as const,
        therapeuticImpact: 'high' as const,
        name: 'WebhookProcessingError'
      };
      const context = createMockCrisisSafeContext(true);

      const result = await fallbackHandler.handleCrisisWebhookFailure(event, error, context);

      expect(result.success).toBe(true);
      expect(result.crisisOverride).toBe(true);
      expect(result.subscriptionUpdate?.status).toBe('crisis_access');
      expect(result.subscriptionUpdate?.tier).toBe('crisis_access');
      expect(result.subscriptionUpdate?.therapeuticContinuity).toBe(true);
    });

    it('should activate emergency bypass correctly', async () => {
      const override = await fallbackHandler.activateEmergencyBypass('user_test', 'crisis_detected');

      expect(override.overrideReason).toBe('emergency_access');
      expect(override.overrideType).toBe('full_access');
      expect(override.auditTrail.safetyScore).toBe(0);
      expect(override.auditTrail.accessGranted).toContain('crisis_tools');
      expect(override.auditTrail.accessGranted).toContain('therapeutic_content');
    });
  });

  describe('Individual Webhook Handlers', () => {
    describe('Subscription Created Handler', () => {
      it('should process subscription creation successfully', async () => {
        const event = createMockSubscriptionCreatedEvent('user_test');
        const context = createMockCrisisSafeContext();

        const result = await handleSubscriptionCreated(event, context);

        expect(result.success).toBe(true);
        expect(result.eventType).toBe('customer.subscription.created');
        expect(result.subscriptionUpdate?.userId).toBe('user_test');
        expect(result.subscriptionUpdate?.status).toBe('trialing');
        expect(result.subscriptionUpdate?.tier).toBe('premium');
        expect(result.subscriptionUpdate?.gracePeriod).toBe(false);
        expect(result.performanceMetrics?.crisisCompliant).toBeDefined();
      });

      it('should complete within crisis time limits', async () => {
        const event = createMockSubscriptionCreatedEvent('user_crisis');
        const context = createMockCrisisSafeContext(true);

        const startTime = Date.now();
        const result = await handleSubscriptionCreated(event, context);
        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(200);
        expect(result.success).toBe(true);
        expect(result.performanceMetrics?.crisisCompliant).toBe(true);
      });
    });

    describe('Subscription Deleted Handler', () => {
      it('should activate grace period for normal cancellation', async () => {
        const event = createMockSubscriptionDeletedEvent('user_test');
        const context = createMockCrisisSafeContext();

        const result = await handleSubscriptionDeleted(event, context);

        expect(result.success).toBe(true);
        expect(result.gracePeriodActivated).toBe(true);
        expect(result.subscriptionUpdate?.status).toBe('canceled');
        expect(result.subscriptionUpdate?.tier).toBe('basic');
        expect(result.subscriptionUpdate?.gracePeriod).toBe(true);
        expect(result.subscriptionUpdate?.therapeuticContinuity).toBe(true);
      });

      it('should maintain crisis access during crisis mode', async () => {
        const event = createMockSubscriptionDeletedEvent('user_crisis');
        const context = createMockCrisisSafeContext(true);

        const result = await handleSubscriptionDeleted(event, context);

        expect(result.success).toBe(true);
        expect(result.crisisOverride).toBe(true);
        expect(result.subscriptionUpdate?.status).toBe('crisis_access');
        expect(result.subscriptionUpdate?.tier).toBe('crisis_access');
        expect(result.subscriptionUpdate?.emergencyAccess).toBe(true);
      });
    });

    describe('Payment Failed Handler', () => {
      it('should activate grace period for payment failure', async () => {
        const event = createMockPaymentFailedEvent('user_test');
        const context = createMockCrisisSafeContext();

        const result = await handlePaymentFailed(event, context);

        expect(result.success).toBe(true);
        expect(result.gracePeriodActivated).toBe(true);
        expect(result.subscriptionUpdate?.status).toBe('past_due');
        expect(result.subscriptionUpdate?.tier).toBe('basic');
        expect(result.subscriptionUpdate?.gracePeriod).toBe(true);
      });

      it('should maintain access during crisis mode', async () => {
        const event = createMockPaymentFailedEvent('user_crisis');
        const context = createMockCrisisSafeContext(true);

        const result = await handlePaymentFailed(event, context);

        expect(result.success).toBe(true);
        expect(result.crisisOverride).toBe(true);
        expect(result.subscriptionUpdate?.status).toBe('crisis_access');
        expect(result.subscriptionUpdate?.emergencyAccess).toBe(true);
      });
    });
  });

  describe('Webhook Handler Registry', () => {
    it('should register and process webhooks correctly', async () => {
      const event = createMockSubscriptionCreatedEvent('user_test');
      const context = createMockCrisisSafeContext();

      const result = await registry.processWebhook(event, context);

      expect(result.success).toBe(true);
      expect(result.eventType).toBe('customer.subscription.created');
    });

    it('should handle unknown event types gracefully', async () => {
      const unknownEvent = {
        ...createMockSubscriptionCreatedEvent('user_test'),
        type: 'unknown.event.type'
      };
      const context = createMockCrisisSafeContext();

      const result = await registry.processWebhook(unknownEvent, context);

      expect(result.success).toBe(false);
      expect(result.errorDetails?.code).toBe('no_handler');
      expect(result.errorDetails?.retryable).toBe(false);
    });

    it('should process webhook batches correctly', async () => {
      const events = [
        createMockSubscriptionCreatedEvent('user_1'),
        createMockSubscriptionCreatedEvent('user_2'),
        createMockPaymentFailedEvent('user_3')
      ];
      const context = createMockCrisisSafeContext();

      const result = await registry.processWebhookBatch(events, context);

      expect(result.processed).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.totalProcessingTime).toBeGreaterThan(0);
    });

    it('should enable and disable crisis mode', () => {
      expect(registry.isCrisisMode()).toBe(false);

      registry.enableCrisisMode();
      expect(registry.isCrisisMode()).toBe(true);

      registry.disableCrisisMode();
      expect(registry.isCrisisMode()).toBe(false);
    });

    it('should track performance metrics', async () => {
      const event = createMockSubscriptionCreatedEvent('user_test');
      const context = createMockCrisisSafeContext();

      // Process some events
      await registry.processWebhook(event, context);
      await registry.processWebhook(event, context);

      const metrics = registry.getPerformanceMetrics();

      expect(metrics.totalEvents).toBe(2);
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
      expect(metrics.crisisComplianceRate).toBeDefined();
      expect(metrics.failureRate).toBeDefined();
    });
  });

  describe('Type Safety and Validation', () => {
    it('should enforce strict typing for webhook events', () => {
      const event = createMockSubscriptionCreatedEvent('user_test');

      // TypeScript should enforce these types
      expect(event.type).toBe('customer.subscription.created');
      expect(event.data.object.metadata.userId).toBe('user_test');
      expect(event.data.object.status).toBe('trialing');
    });

    it('should enforce strict typing for webhook results', async () => {
      const event = createMockSubscriptionCreatedEvent('user_test');
      const context = createMockCrisisSafeContext();

      const result = await handleSubscriptionCreated(event, context);

      // TypeScript should enforce these types
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.processingTime).toBe('number');
      expect(typeof result.eventId).toBe('string');
      expect(typeof result.eventType).toBe('string');

      if (result.subscriptionUpdate) {
        expect(['trialing', 'active', 'past_due', 'canceled', 'unpaid', 'crisis_access'])
          .toContain(result.subscriptionUpdate.status);
        expect(['basic', 'premium', 'crisis_access', 'none'])
          .toContain(result.subscriptionUpdate.tier);
      }
    });

    it('should validate grace period parameters', async () => {
      const validParams = {
        userId: 'user_test',
        customerId: 'cus_test',
        subscriptionId: 'sub_test',
        reason: 'payment_failed' as const,
        duration: 7,
        therapeuticAccess: true,
        crisisProtection: true,
        emergencyBypass: false
      };

      // Should not throw
      await expect(gracePeriodManager.activateGracePeriod(validParams))
        .resolves.toBeDefined();

      // Invalid duration should be handled gracefully
      const invalidParams = { ...validParams, duration: 0 };
      await expect(gracePeriodManager.activateGracePeriod(invalidParams))
        .rejects.toThrow();
    });
  });

  describe('Performance and Crisis Compliance', () => {
    it('should maintain crisis response times under load', async () => {
      const events = Array.from({ length: 10 }, (_, i) =>
        createMockSubscriptionCreatedEvent(`user_${i}`)
      );
      const context = createMockCrisisSafeContext(true);

      const startTime = Date.now();
      const results = await Promise.all(
        events.map(event => registry.processWebhook(event, context))
      );
      const totalTime = Date.now() - startTime;

      // All should complete successfully
      expect(results.every(r => r.success)).toBe(true);

      // Average time should still be under crisis limit
      const averageTime = totalTime / events.length;
      expect(averageTime).toBeLessThan(200);
    });

    it('should handle concurrent webhook processing', async () => {
      const events = Array.from({ length: 5 }, (_, i) => [
        createMockSubscriptionCreatedEvent(`user_${i}`),
        createMockPaymentFailedEvent(`user_${i}`)
      ]).flat();
      const context = createMockCrisisSafeContext();

      const results = await Promise.allSettled(
        events.map(event => registry.processWebhook(event, context))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBe(events.length);
    });

    it('should maintain therapeutic continuity under all scenarios', async () => {
      const scenarios = [
        { event: createMockSubscriptionDeletedEvent('user_1'), crisis: false },
        { event: createMockSubscriptionDeletedEvent('user_2'), crisis: true },
        { event: createMockPaymentFailedEvent('user_3'), crisis: false },
        { event: createMockPaymentFailedEvent('user_4'), crisis: true }
      ];

      for (const scenario of scenarios) {
        const context = createMockCrisisSafeContext(scenario.crisis);
        const result = await registry.processWebhook(scenario.event, context);

        expect(result.success).toBe(true);

        // Therapeutic continuity should always be maintained
        if (result.subscriptionUpdate) {
          expect(result.subscriptionUpdate.therapeuticContinuity).toBe(true);
        }

        // Crisis scenarios should maintain access
        if (scenario.crisis) {
          expect(result.crisisOverride || result.subscriptionUpdate?.emergencyAccess).toBeTruthy();
        }
      }
    });
  });
});

describe('Integration Tests', () => {
  let registry: TypeSafeWebhookHandlerRegistry;

  beforeEach(() => {
    registry = new TypeSafeWebhookHandlerRegistry();
  });

  it('should integrate gracefully with existing PaymentStore infrastructure', async () => {
    const event = createMockSubscriptionCreatedEvent('integration_test');
    const context = createMockCrisisSafeContext();

    const result = await registry.processWebhook(event, context);

    // Verify result format is compatible with BillingEventResult
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('processingTime');
    expect(result).toHaveProperty('eventId');
    expect(result).toHaveProperty('eventType');

    // Should be transformable to store update format
    expect(result.subscriptionUpdate).toBeDefined();
    expect(result.subscriptionUpdate?.subscriptionId).toBe(`sub_integration_test`);
  });

  it('should maintain backward compatibility with existing webhook handlers', async () => {
    const event = createMockSubscriptionCreatedEvent('compatibility_test');
    const context = createMockCrisisSafeContext();

    // Should work with the same interface as existing handlers
    const result = await registry.processWebhook(event, context);

    expect(result.success).toBe(true);
    expect(result.eventType).toBe('customer.subscription.created');

    // Result should contain all expected fields for store integration
    expect(result.subscriptionUpdate).toMatchObject({
      userId: 'compatibility_test',
      subscriptionId: 'sub_compatibility_test',
      status: 'trialing',
      tier: 'premium',
      gracePeriod: false,
      therapeuticContinuity: true
    });
  });
});