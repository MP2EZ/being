/**
 * Comprehensive Webhook Integration Tests for FullMind P0-CLOUD Payment System
 *
 * Tests all webhook processing components with:
 * - Security validation and threat protection testing
 * - Crisis mode processing with <200ms verification
 * - Event queuing and retry logic validation
 * - State synchronization accuracy testing
 * - Performance benchmarking and compliance verification
 * - Complete integration workflow testing
 */

import { jest, describe, beforeEach, afterEach, test, expect } from '@jest/globals';
import { webhookIntegrationService } from '../../src/services/cloud/WebhookIntegrationService';
import { billingEventHandler } from '../../src/services/cloud/BillingEventHandler';
import { webhookSecurityValidator } from '../../src/services/cloud/WebhookSecurityValidator';
import { webhookEventQueue } from '../../src/services/cloud/WebhookEventQueue';

// Mock implementations for testing
const mockPaymentStore = {
  updateSubscriptionFromWebhook: jest.fn().mockResolvedValue(true),
  getSubscriptionState: jest.fn().mockResolvedValue({
    subscriptionId: 'sub_test',
    status: 'active',
    tier: 'premium'
  })
};

// Test webhook payloads
const validWebhookPayloads = {
  subscriptionCreated: JSON.stringify({
    id: 'evt_test_subscription_created',
    type: 'customer.subscription.created',
    data: {
      object: {
        id: 'sub_test123',
        status: 'active',
        metadata: { userId: 'user_123' },
        items: { data: [{ price: { lookup_key: 'fullmind_monthly' } }] },
        trial_end: null
      }
    },
    created: Math.floor(Date.now() / 1000)
  }),

  subscriptionDeleted: JSON.stringify({
    id: 'evt_test_subscription_deleted',
    type: 'customer.subscription.deleted',
    data: {
      object: {
        id: 'sub_test123',
        status: 'canceled',
        metadata: { userId: 'user_123' }
      }
    },
    created: Math.floor(Date.now() / 1000)
  }),

  paymentFailed: JSON.stringify({
    id: 'evt_test_payment_failed',
    type: 'payment_intent.payment_failed',
    data: {
      object: {
        id: 'pi_test123',
        status: 'requires_payment_method',
        metadata: { userId: 'user_123', subscriptionId: 'sub_test123' },
        last_payment_error: { message: 'Your card was declined.' }
      }
    },
    created: Math.floor(Date.now() / 1000)
  }),

  trialWillEnd: JSON.stringify({
    id: 'evt_test_trial_ending',
    type: 'customer.subscription.trial_will_end',
    data: {
      object: {
        id: 'sub_test123',
        status: 'trialing',
        metadata: { userId: 'user_123' },
        trial_end: Math.floor(Date.now() / 1000) + (3 * 24 * 60 * 60) // 3 days
      }
    },
    created: Math.floor(Date.now() / 1000)
  })
};

// Mock headers for testing
const validHeaders = {
  'stripe-signature': 't=1234567890,v1=test_signature_hash',
  'user-agent': 'Stripe/1.0 (+https://stripe.com/docs/webhooks)',
  'content-type': 'application/json'
};

const maliciousHeaders = {
  'stripe-signature': 'invalid_signature',
  'user-agent': 'curl/7.64.1',
  'x-forwarded-for': '192.168.1.100'
};

describe('Webhook Integration Service', () => {
  beforeEach(async () => {
    // Clear any previous state
    await webhookIntegrationService.cleanup();
    jest.clearAllMocks();

    // Initialize with test configuration
    await webhookIntegrationService.initialize({
      webhookSecret: 'whsec_test_secret_key_for_testing_purposes_only',
      enableSecurityValidation: true,
      enableEventQueueing: true,
      enableStateSync: true,
      enableAuditLogging: true,
      maxWebhookSize: 1024 * 1024,
      processingTimeoutMs: 30000,
      crisisProcessingTimeoutMs: 200,
      retryConfiguration: {
        maxAttempts: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000
      }
    }, mockPaymentStore);
  });

  afterEach(async () => {
    await webhookIntegrationService.cleanup();
  });

  describe('Service Initialization', () => {
    test('should initialize all components successfully', async () => {
      const status = await webhookIntegrationService.getServiceStatus();

      expect(status.initialized).toBe(true);
      expect(status.components.billingEventHandler).toBeTruthy();
      expect(status.components.securityValidator).toBeTruthy();
      expect(status.components.eventQueue).toBeTruthy();
      expect(status.configuration.securityEnabled).toBe(true);
      expect(status.configuration.queueingEnabled).toBe(true);
      expect(status.configuration.stateSyncEnabled).toBe(true);
    });

    test('should reject initialization with invalid webhook secret', async () => {
      await webhookIntegrationService.cleanup();

      await expect(
        webhookIntegrationService.initialize({
          webhookSecret: '', // Invalid secret
        })
      ).rejects.toThrow('Webhook secret is required for initialization');
    });
  });

  describe('Normal Webhook Processing', () => {
    test('should process subscription created webhook successfully', async () => {
      const result = await webhookIntegrationService.processWebhook(
        validWebhookPayloads.subscriptionCreated,
        'test_signature',
        validHeaders,
        '3.18.12.63' // Valid Stripe IP
      );

      expect(result.success).toBe(true);
      expect(result.billingResult?.processed).toBe(true);
      expect(result.billingResult?.eventType).toBe('customer.subscription.created');
      expect(result.stateUpdated).toBe(true);
      expect(result.securityValidation?.isValid).toBe(true);
      expect(mockPaymentStore.updateSubscriptionFromWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId: 'sub_test123',
          status: 'active',
          webhookSource: true
        })
      );
    });

    test('should process trial ending webhook with therapeutic messaging', async () => {
      const result = await webhookIntegrationService.processWebhook(
        validWebhookPayloads.trialWillEnd,
        'test_signature',
        validHeaders,
        '3.18.12.63'
      );

      expect(result.success).toBe(true);
      expect(result.billingResult?.eventType).toBe('customer.subscription.trial_will_end');
      expect(result.processingTime).toBeLessThan(5000); // Should be fast
    });

    test('should queue event for retry on processing failure', async () => {
      // Mock store to fail first time
      mockPaymentStore.updateSubscriptionFromWebhook
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce(true);

      const result = await webhookIntegrationService.processWebhook(
        validWebhookPayloads.subscriptionCreated,
        'test_signature',
        validHeaders,
        '3.18.12.63'
      );

      expect(result.queueItemId).toBeTruthy();
      expect(result.error?.retryable).toBe(true);
    });
  });

  describe('Crisis Mode Processing', () => {
    test('should process crisis webhook within 200ms timeout', async () => {
      const startTime = Date.now();

      const result = await webhookIntegrationService.processWebhook(
        validWebhookPayloads.subscriptionDeleted,
        'test_signature',
        validHeaders,
        '3.18.12.63',
        true // Crisis mode
      );

      const processingTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.crisisOverride).toBe(true);
      expect(processingTime).toBeLessThan(200); // Must be under 200ms
      expect(result.billingResult?.crisisOverride).toBe(true);
    });

    test('should process payment failure as crisis event automatically', async () => {
      const result = await webhookIntegrationService.processWebhook(
        validWebhookPayloads.paymentFailed,
        'test_signature',
        validHeaders,
        '3.18.12.63'
      );

      expect(result.success).toBe(true);
      expect(result.crisisOverride).toBe(true);
      expect(result.billingResult?.subscriptionUpdate?.tier).toBe('crisis_access');
      expect(result.billingResult?.subscriptionUpdate?.gracePeriod).toBe(true);
    });

    test('should provide failsafe result on crisis processing error', async () => {
      // Mock all components to fail
      mockPaymentStore.updateSubscriptionFromWebhook.mockRejectedValue(
        new Error('Complete system failure')
      );

      const result = await webhookIntegrationService.processWebhook(
        validWebhookPayloads.subscriptionDeleted,
        'invalid_signature',
        maliciousHeaders,
        '192.168.1.100', // Internal IP
        true // Crisis mode
      );

      expect(result.success).toBe(true); // Always success in crisis
      expect(result.crisisOverride).toBe(true);
      expect(result.billingResult?.subscriptionUpdate?.tier).toBe('crisis_access');
    });
  });

  describe('Security Validation', () => {
    test('should block webhook with invalid signature', async () => {
      const result = await webhookIntegrationService.processWebhook(
        validWebhookPayloads.subscriptionCreated,
        'invalid_signature',
        maliciousHeaders,
        '192.168.1.100' // Invalid IP
      );

      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('security');
      expect(result.securityValidation?.isValid).toBe(false);
      expect(mockPaymentStore.updateSubscriptionFromWebhook).not.toHaveBeenCalled();
    });

    test('should block webhook from malicious IP address', async () => {
      const result = await webhookIntegrationService.processWebhook(
        validWebhookPayloads.subscriptionCreated,
        'test_signature',
        {
          ...validHeaders,
          'user-agent': 'curl/7.64.1' // Suspicious user agent
        },
        '10.0.0.1' // Private IP range
      );

      expect(result.success).toBe(false);
      expect(result.securityValidation?.riskLevel).toBeOneOf(['high', 'critical']);
    });

    test('should handle rate limiting correctly', async () => {
      const ipAddress = '3.18.12.63';

      // Send many requests to trigger rate limiting
      const promises = Array.from({ length: 150 }, () =>
        webhookIntegrationService.processWebhook(
          validWebhookPayloads.subscriptionCreated,
          'test_signature',
          validHeaders,
          ipAddress
        )
      );

      const results = await Promise.allSettled(promises);
      const blockedResults = results.filter(
        result => result.status === 'fulfilled' &&
        result.value.error?.category === 'security'
      );

      expect(blockedResults.length).toBeGreaterThan(0);
    });

    test('should bypass security validation in crisis mode', async () => {
      const result = await webhookIntegrationService.processWebhook(
        validWebhookPayloads.paymentFailed,
        'completely_invalid_signature',
        maliciousHeaders,
        '127.0.0.1', // Local IP
        true // Crisis mode
      );

      expect(result.success).toBe(true);
      expect(result.crisisOverride).toBe(true);
      // Security validation should be skipped or bypassed
    });
  });

  describe('Event Queue Processing', () => {
    test('should queue events for reliable processing', async () => {
      const queueStatus = await webhookEventQueue.getQueueStatus();
      const initialQueueSize = queueStatus.queueSize;

      await webhookIntegrationService.processWebhook(
        validWebhookPayloads.subscriptionCreated,
        'test_signature',
        validHeaders,
        '3.18.12.63'
      );

      const updatedQueueStatus = await webhookEventQueue.getQueueStatus();
      expect(updatedQueueStatus.queueSize).toBeGreaterThan(initialQueueSize);
    });

    test('should prioritize crisis events in queue', async () => {
      // Add normal event first
      await webhookIntegrationService.processWebhook(
        validWebhookPayloads.subscriptionCreated,
        'test_signature',
        validHeaders,
        '3.18.12.63'
      );

      // Add crisis event
      await webhookIntegrationService.processWebhook(
        validWebhookPayloads.paymentFailed,
        'test_signature',
        validHeaders,
        '3.18.12.63'
      );

      const queueStatus = await webhookEventQueue.getQueueStatus();

      // Crisis events should be processed immediately or be at front of queue
      expect(queueStatus.stats.crisisEvents).toBeGreaterThan(0);
    });

    test('should handle queue capacity gracefully', async () => {
      // Mock queue to be near capacity
      const manyEvents = Array.from({ length: 50 }, () =>
        webhookIntegrationService.processWebhook(
          validWebhookPayloads.subscriptionCreated,
          'test_signature',
          validHeaders,
          '3.18.12.63'
        )
      );

      const results = await Promise.allSettled(manyEvents);
      const successfulResults = results.filter(
        result => result.status === 'fulfilled' && result.value.success
      );

      expect(successfulResults.length).toBeGreaterThan(0);
    });
  });

  describe('State Synchronization', () => {
    test('should update subscription state correctly', async () => {
      const result = await webhookIntegrationService.processWebhook(
        validWebhookPayloads.subscriptionCreated,
        'test_signature',
        validHeaders,
        '3.18.12.63'
      );

      expect(result.stateUpdated).toBe(true);
      expect(mockPaymentStore.updateSubscriptionFromWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          subscriptionId: 'sub_test123',
          status: 'active',
          tier: 'premium',
          webhookSource: true
        })
      );
    });

    test('should handle state update failures gracefully', async () => {
      mockPaymentStore.updateSubscriptionFromWebhook.mockRejectedValue(
        new Error('State update failed')
      );

      const result = await webhookIntegrationService.processWebhook(
        validWebhookPayloads.subscriptionCreated,
        'test_signature',
        validHeaders,
        '3.18.12.63'
      );

      expect(result.stateUpdated).toBe(false);
      expect(result.queueItemId).toBeTruthy(); // Should be queued for retry
    });

    test('should maintain crisis access on state update failure', async () => {
      mockPaymentStore.updateSubscriptionFromWebhook.mockRejectedValue(
        new Error('State store unavailable')
      );

      const result = await webhookIntegrationService.processWebhook(
        validWebhookPayloads.paymentFailed,
        'test_signature',
        validHeaders,
        '3.18.12.63',
        true // Crisis mode
      );

      expect(result.success).toBe(true);
      expect(result.crisisOverride).toBe(true);
      // Crisis access should be maintained even if state update fails
    });
  });

  describe('Performance and Monitoring', () => {
    test('should track processing metrics accurately', async () => {
      const initialMetrics = await webhookIntegrationService.getServiceMetrics();

      await webhookIntegrationService.processWebhook(
        validWebhookPayloads.subscriptionCreated,
        'test_signature',
        validHeaders,
        '3.18.12.63'
      );

      const updatedMetrics = await webhookIntegrationService.getServiceMetrics();

      expect(updatedMetrics.totalWebhooks).toBe(initialMetrics.totalWebhooks + 1);
      expect(updatedMetrics.successfulWebhooks).toBe(initialMetrics.successfulWebhooks + 1);
      expect(updatedMetrics.averageProcessingTime).toBeGreaterThan(0);
    });

    test('should maintain high health score for successful operations', async () => {
      // Process several successful webhooks
      const promises = Array.from({ length: 10 }, () =>
        webhookIntegrationService.processWebhook(
          validWebhookPayloads.subscriptionCreated,
          'test_signature',
          validHeaders,
          '3.18.12.63'
        )
      );

      await Promise.all(promises);

      const metrics = await webhookIntegrationService.getServiceMetrics();
      expect(metrics.healthScore).toBeGreaterThan(80);
    });

    test('should process webhooks within performance targets', async () => {
      const startTime = Date.now();

      await webhookIntegrationService.processWebhook(
        validWebhookPayloads.subscriptionCreated,
        'test_signature',
        validHeaders,
        '3.18.12.63'
      );

      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(5000); // Should be under 5 seconds
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle malformed webhook payload gracefully', async () => {
      const malformedPayload = '{"invalid": "json"'; // Malformed JSON

      const result = await webhookIntegrationService.processWebhook(
        malformedPayload,
        'test_signature',
        validHeaders,
        '3.18.12.63'
      );

      expect(result.success).toBe(false);
      expect(result.error?.category).toBeOneOf(['validation', 'processing']);
    });

    test('should implement circuit breaker pattern', async () => {
      // Mock to always fail
      mockPaymentStore.updateSubscriptionFromWebhook.mockRejectedValue(
        new Error('Service unavailable')
      );

      // Send many failing requests
      const promises = Array.from({ length: 15 }, () =>
        webhookIntegrationService.processWebhook(
          validWebhookPayloads.subscriptionCreated,
          'test_signature',
          validHeaders,
          '3.18.12.63'
        )
      );

      await Promise.allSettled(promises);

      const queueStatus = await webhookEventQueue.getQueueStatus();
      // Circuit breaker should eventually open
      expect(queueStatus.circuitBreakerOpen).toBe(true);
    });

    test('should recover from component failures', async () => {
      // Simulate component failure and recovery
      await webhookIntegrationService.emergencyReset();

      const result = await webhookIntegrationService.processWebhook(
        validWebhookPayloads.subscriptionCreated,
        'test_signature',
        validHeaders,
        '3.18.12.63',
        true // Crisis mode for emergency operation
      );

      expect(result.success).toBe(true);
      expect(result.crisisOverride).toBe(true);
    });
  });

  describe('Webhook Replay and Debugging', () => {
    test('should support webhook replay for debugging', async () => {
      const webhookId = 'evt_test_replay';

      const result = await webhookIntegrationService.replayWebhook(
        webhookId,
        validWebhookPayloads.subscriptionCreated,
        'test_signature',
        { ...validHeaders, 'x-replay': 'true' }
      );

      expect(result.success).toBe(true);
      // Should process normally even on replay
    });

    test('should provide detailed status for monitoring', async () => {
      const status = await webhookIntegrationService.getServiceStatus();

      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('components');
      expect(status).toHaveProperty('metrics');
      expect(status).toHaveProperty('configuration');
      expect(status.components.billingEventHandler).toBeTruthy();
      expect(status.components.securityValidator).toBeTruthy();
      expect(status.components.eventQueue).toBeTruthy();
    });
  });

  describe('Integration Workflow', () => {
    test('should handle complete subscription lifecycle', async () => {
      // 1. Create subscription
      const createResult = await webhookIntegrationService.processWebhook(
        validWebhookPayloads.subscriptionCreated,
        'test_signature',
        validHeaders,
        '3.18.12.63'
      );

      expect(createResult.success).toBe(true);
      expect(createResult.billingResult?.subscriptionUpdate?.status).toBe('active');

      // 2. Payment failure
      const failureResult = await webhookIntegrationService.processWebhook(
        validWebhookPayloads.paymentFailed,
        'test_signature',
        validHeaders,
        '3.18.12.63'
      );

      expect(failureResult.success).toBe(true);
      expect(failureResult.crisisOverride).toBe(true);

      // 3. Subscription cancellation
      const cancelResult = await webhookIntegrationService.processWebhook(
        validWebhookPayloads.subscriptionDeleted,
        'test_signature',
        validHeaders,
        '3.18.12.63',
        true // Crisis mode
      );

      expect(cancelResult.success).toBe(true);
      expect(cancelResult.crisisOverride).toBe(true);
      expect(cancelResult.billingResult?.subscriptionUpdate?.tier).toBe('crisis_access');
    });

    test('should maintain therapeutic continuity throughout lifecycle', async () => {
      const lifecycleEvents = [
        validWebhookPayloads.subscriptionCreated,
        validWebhookPayloads.paymentFailed,
        validWebhookPayloads.subscriptionDeleted
      ];

      const results = [];
      for (const payload of lifecycleEvents) {
        const result = await webhookIntegrationService.processWebhook(
          payload,
          'test_signature',
          validHeaders,
          '3.18.12.63'
        );
        results.push(result);
      }

      // All events should process successfully
      expect(results.every(r => r.success)).toBe(true);

      // Crisis events should maintain access
      const crisisResults = results.filter(r => r.crisisOverride);
      expect(crisisResults.length).toBeGreaterThan(0);
      expect(crisisResults.every(r =>
        r.billingResult?.subscriptionUpdate?.tier === 'crisis_access'
      )).toBe(true);
    });
  });
});

// Custom Jest matcher for testing one of multiple values
expect.extend({
  toBeOneOf(received: any, validOptions: any[]) {
    const pass = validOptions.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${validOptions.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${validOptions.join(', ')}`,
        pass: false,
      };
    }
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(validOptions: any[]): R;
    }
  }
}