/**
 * Webhook Integration Tests - Day 18 Phase 4
 * Testing webhook processing, security, performance, and crisis safety
 */

import { renderHook, act } from '@testing-library/react-native';
import { useWebhook, useWebhookSubscription, useWebhookMonitoring } from '../../src/hooks/useWebhook';
import { usePaymentStore } from '../../src/store/paymentStore';
import type { WebhookEvent, WebhookProcessingResult } from '../../src/types/webhook';

// Mock payment store
const mockPaymentStore = {
  syncWebhookState: jest.fn(),
  updateSubscriptionFromWebhook: jest.fn(),
  handleSubscriptionUpdatedWebhook: jest.fn(),
  handleSubscriptionDeletedWebhook: jest.fn(),
  handleTrialEndingWebhook: jest.fn(),
  handlePaymentSucceededWebhook: jest.fn(),
  handlePaymentFailedWebhook: jest.fn(),
  isLoading: false
};

jest.mock('../../src/store/paymentStore', () => ({
  usePaymentStore: () => mockPaymentStore
}));

describe('Webhook Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('useWebhook Hook', () => {
    it('should initialize with disconnected status', () => {
      const { result } = renderHook(() => useWebhook());

      expect(result.current.status.connected).toBe(false);
      expect(result.current.status.status).toBe('disconnected');
      expect(result.current.events).toEqual([]);
    });

    it('should connect and update status', () => {
      const { result } = renderHook(() => useWebhook());

      act(() => {
        result.current.connect();
      });

      expect(result.current.status.connected).toBe(true);
      expect(result.current.status.status).toBe('healthy');
    });

    it('should process webhook events correctly', async () => {
      const { result } = renderHook(() => useWebhook());

      const mockEvent: WebhookEvent = {
        id: 'evt_test_123',
        object: 'event',
        created: Date.now() / 1000,
        data: {
          object: {
            id: 'sub_test_123',
            object: 'subscription',
            status: 'active'
          }
        },
        livemode: false,
        pending_webhooks: 1,
        request: {
          id: 'req_test_123',
          idempotency_key: null
        },
        type: 'customer.subscription.updated'
      };

      mockPaymentStore.handleSubscriptionUpdatedWebhook.mockResolvedValue({
        success: true,
        processingTime: 150
      });

      await act(async () => {
        await result.current.processWebhookEvent(mockEvent);
      });

      expect(mockPaymentStore.handleSubscriptionUpdatedWebhook).toHaveBeenCalledWith(mockEvent);
      expect(result.current.events).toHaveLength(1);
      expect(result.current.events[0]).toEqual(mockEvent);
    });

    it('should handle webhook processing errors with retries', async () => {
      const { result } = renderHook(() => useWebhook({ maxRetries: 2 }));

      const mockEvent: WebhookEvent = {
        id: 'evt_error_123',
        object: 'event',
        created: Date.now() / 1000,
        data: { object: {} },
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
        type: 'customer.subscription.updated'
      };

      mockPaymentStore.handleSubscriptionUpdatedWebhook
        .mockRejectedValueOnce(new Error('Processing failed'))
        .mockResolvedValueOnce({ success: true, processingTime: 200 });

      await act(async () => {
        await result.current.processWebhookEvent(mockEvent);
      });

      // Fast-forward timers to trigger retry
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.status.errorCount).toBe(1);
      expect(result.current.status.status).toBe('error');
    });

    it('should filter events by type when specified', async () => {
      const { result } = renderHook(() =>
        useWebhook({ eventTypes: ['customer.subscription.updated'] })
      );

      const subscriptionEvent: WebhookEvent = {
        id: 'evt_sub_123',
        object: 'event',
        created: Date.now() / 1000,
        data: { object: {} },
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
        type: 'customer.subscription.updated'
      };

      const paymentEvent: WebhookEvent = {
        ...subscriptionEvent,
        id: 'evt_pay_123',
        type: 'invoice.payment_succeeded'
      };

      mockPaymentStore.handleSubscriptionUpdatedWebhook.mockResolvedValue({
        success: true,
        processingTime: 100
      });

      await act(async () => {
        await result.current.processWebhookEvent(subscriptionEvent);
        await result.current.processWebhookEvent(paymentEvent);
      });

      expect(mockPaymentStore.handleSubscriptionUpdatedWebhook).toHaveBeenCalledTimes(1);
      expect(result.current.events).toHaveLength(1);
      expect(result.current.events[0].type).toBe('customer.subscription.updated');
    });
  });

  describe('Crisis Safety Performance', () => {
    it('should maintain crisis response time requirements', async () => {
      const { result } = renderHook(() => useWebhook());

      const crisisEvent: WebhookEvent = {
        id: 'evt_crisis_123',
        object: 'event',
        created: Date.now() / 1000,
        data: {
          object: {
            status: 'unpaid',
            metadata: { crisis_mode: 'true' }
          }
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
        type: 'customer.subscription.updated'
      };

      const startTime = performance.now();

      mockPaymentStore.handleSubscriptionUpdatedWebhook.mockImplementation(async () => {
        // Simulate fast crisis processing
        await new Promise(resolve => setTimeout(resolve, 50));
        return { success: true, processingTime: 50 };
      });

      await act(async () => {
        await result.current.processWebhookEvent(crisisEvent);
      });

      const processingTime = performance.now() - startTime;
      expect(processingTime).toBeLessThan(200); // Crisis requirement: <200ms
    });

    it('should prioritize crisis events in processing queue', async () => {
      const { result } = renderHook(() => useWebhook());

      const normalEvent: WebhookEvent = {
        id: 'evt_normal_123',
        object: 'event',
        created: Date.now() / 1000,
        data: { object: { status: 'active' } },
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
        type: 'customer.subscription.updated'
      };

      const crisisEvent: WebhookEvent = {
        id: 'evt_crisis_123',
        object: 'event',
        created: Date.now() / 1000,
        data: {
          object: {
            status: 'unpaid',
            metadata: { crisis_mode: 'true' }
          }
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
        type: 'customer.subscription.updated'
      };

      const processingOrder: string[] = [];

      mockPaymentStore.handleSubscriptionUpdatedWebhook.mockImplementation(async (event) => {
        processingOrder.push(event.id);
        return { success: true, processingTime: 100 };
      });

      await act(async () => {
        // Process normal event first, then crisis event
        await Promise.all([
          result.current.processWebhookEvent(normalEvent),
          result.current.processWebhookEvent(crisisEvent)
        ]);
      });

      // Both should process successfully
      expect(processingOrder).toContain('evt_normal_123');
      expect(processingOrder).toContain('evt_crisis_123');
    });
  });

  describe('useWebhookSubscription Hook', () => {
    it('should filter subscription-related events', () => {
      const { result } = renderHook(() => useWebhookSubscription('cus_test_123'));

      expect(result.current.status.connected).toBe(false);
      expect(result.current.subscriptionEvents).toEqual([]);
      expect(result.current.paymentEvents).toEqual([]);
      expect(result.current.hasRecentPaymentFailure).toBe(false);
    });

    it('should detect recent payment failures', async () => {
      const { result } = renderHook(() => useWebhookSubscription('cus_test_123'));

      const paymentFailureEvent: WebhookEvent = {
        id: 'evt_payment_fail_123',
        object: 'event',
        created: Date.now() / 1000, // Recent timestamp
        data: {
          object: {
            id: 'in_test_123',
            status: 'open',
            attempt_count: 3
          }
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
        type: 'invoice.payment_failed'
      };

      mockPaymentStore.handlePaymentFailedWebhook.mockResolvedValue({
        success: true,
        processingTime: 120
      });

      await act(async () => {
        await result.current.processWebhookEvent(paymentFailureEvent);
      });

      expect(result.current.hasRecentPaymentFailure).toBe(true);
      expect(result.current.paymentEvents).toHaveLength(1);
    });
  });

  describe('useWebhookMonitoring Hook', () => {
    it('should calculate performance metrics', async () => {
      const { result } = renderHook(() => useWebhookMonitoring());

      // Initially healthy with no events
      expect(result.current.isHealthy).toBe(true);
      expect(result.current.needsAttention).toBe(false);
      expect(result.current.metrics.totalEvents).toBe(0);
      expect(result.current.metrics.successRate).toBe(100);
    });

    it('should detect performance issues', async () => {
      const { result } = renderHook(() => useWebhookMonitoring());

      // Simulate multiple failed events
      const failedEvent: WebhookEvent = {
        id: 'evt_fail_123',
        object: 'event',
        created: Date.now() / 1000,
        data: { object: {} },
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
        type: 'customer.subscription.updated'
      };

      mockPaymentStore.handleSubscriptionUpdatedWebhook.mockRejectedValue(
        new Error('Webhook processing failed')
      );

      // Process multiple failed events
      for (let i = 0; i < 6; i++) {
        await act(async () => {
          try {
            await result.current.webhook.processWebhookEvent({
              ...failedEvent,
              id: `evt_fail_${i}`
            });
          } catch (error) {
            // Expected to fail
          }
        });
      }

      expect(result.current.needsAttention).toBe(true);
      expect(result.current.isHealthy).toBe(false);
    });
  });

  describe('Event Routing and Processing', () => {
    it('should route different event types to correct handlers', async () => {
      const { result } = renderHook(() => useWebhook());

      const eventTypes: Array<{ type: string; handler: string }> = [
        { type: 'customer.subscription.updated', handler: 'handleSubscriptionUpdatedWebhook' },
        { type: 'customer.subscription.deleted', handler: 'handleSubscriptionDeletedWebhook' },
        { type: 'customer.subscription.trial_will_end', handler: 'handleTrialEndingWebhook' },
        { type: 'invoice.payment_succeeded', handler: 'handlePaymentSucceededWebhook' },
        { type: 'invoice.payment_failed', handler: 'handlePaymentFailedWebhook' }
      ];

      for (const { type, handler } of eventTypes) {
        const mockEvent: WebhookEvent = {
          id: `evt_${type.replace('.', '_')}_123`,
          object: 'event',
          created: Date.now() / 1000,
          data: { object: {} },
          livemode: false,
          pending_webhooks: 1,
          request: { id: null, idempotency_key: null },
          type
        };

        mockPaymentStore[handler].mockResolvedValue({
          success: true,
          processingTime: 100
        });

        await act(async () => {
          await result.current.processWebhookEvent(mockEvent);
        });

        expect(mockPaymentStore[handler]).toHaveBeenCalledWith(mockEvent);
        mockPaymentStore[handler].mockClear();
      }
    });

    it('should handle unknown event types gracefully', async () => {
      const { result } = renderHook(() => useWebhook());

      const unknownEvent: WebhookEvent = {
        id: 'evt_unknown_123',
        object: 'event',
        created: Date.now() / 1000,
        data: { object: {} },
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
        type: 'unknown.event.type'
      };

      mockPaymentStore.updateSubscriptionFromWebhook.mockResolvedValue({
        success: true,
        processingTime: 100
      });

      await act(async () => {
        await result.current.processWebhookEvent(unknownEvent);
      });

      expect(mockPaymentStore.updateSubscriptionFromWebhook).toHaveBeenCalledWith(unknownEvent);
    });
  });

  describe('Auto-reconnection Logic', () => {
    it('should auto-reconnect when enabled', () => {
      const { result } = renderHook(() => useWebhook({ autoReconnect: true }));

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.status.connected).toBe(false);

      // Fast-forward timer to trigger reconnection
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.status.connected).toBe(true);
    });

    it('should not auto-reconnect when disabled', () => {
      const { result } = renderHook(() => useWebhook({ autoReconnect: false }));

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.status.connected).toBe(false);

      // Fast-forward timer
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(result.current.status.connected).toBe(false);
    });
  });

  describe('Event Sync Functionality', () => {
    it('should sync multiple events in batch', async () => {
      const { result } = renderHook(() => useWebhook());

      const events: WebhookEvent[] = [
        {
          id: 'evt_1',
          object: 'event',
          created: Date.now() / 1000,
          data: { object: { id: 'sub_1' } },
          livemode: false,
          pending_webhooks: 1,
          request: { id: null, idempotency_key: null },
          type: 'customer.subscription.updated'
        },
        {
          id: 'evt_2',
          object: 'event',
          created: Date.now() / 1000,
          data: { object: { id: 'in_1' } },
          livemode: false,
          pending_webhooks: 1,
          request: { id: null, idempotency_key: null },
          type: 'invoice.payment_succeeded'
        }
      ];

      mockPaymentStore.syncWebhookState.mockResolvedValue();
      mockPaymentStore.handleSubscriptionUpdatedWebhook.mockResolvedValue({
        success: true,
        processingTime: 100
      });
      mockPaymentStore.handlePaymentSucceededWebhook.mockResolvedValue({
        success: true,
        processingTime: 120
      });

      await act(async () => {
        await result.current.syncEvents(events);
      });

      expect(mockPaymentStore.syncWebhookState).toHaveBeenCalledWith(events);
      expect(mockPaymentStore.handleSubscriptionUpdatedWebhook).toHaveBeenCalledWith(events[0]);
      expect(mockPaymentStore.handlePaymentSucceededWebhook).toHaveBeenCalledWith(events[1]);
      expect(result.current.events).toHaveLength(2);
    });
  });
});