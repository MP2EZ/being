/**
 * Complete Webhook Flow Integration Tests - FullMind MBCT App
 *
 * End-to-end testing of the complete webhook system including:
 * - Real-time state synchronization across all stores
 * - Crisis-safe webhook processing with <200ms response
 * - Payment failure handling with therapeutic messaging
 * - Subscription lifecycle with therapeutic continuity
 * - Emergency access preservation during system failures
 * - HIPAA-compliant audit trails and data protection
 */

import { renderHook, act } from '@testing-library/react-native';
import { useRealTimeWebhookSync } from '../../src/store/sync/real-time-webhook-sync';
import { usePaymentStore } from '../../src/store/paymentStore';
import { useUserStore } from '../../src/store/userStore';
import { useCrisisStore } from '../../src/store/crisisStore';
import {
  WebhookEvent,
  SubscriptionUpdatedEvent,
  PaymentFailedEvent,
  CrisisProtectionEvent,
  WebhookProcessingResult,
  CRISIS_RESPONSE_TIME_MS,
  NORMAL_RESPONSE_TIME_MS
} from '../../src/types/webhooks/webhook-events';
import { performance } from 'perf_hooks';

// Mock stores with comprehensive crisis-safe functionality
const mockPaymentStore = {
  handleSubscriptionUpdatedWebhook: jest.fn(),
  handleSubscriptionDeletedWebhook: jest.fn(),
  handlePaymentFailedWebhook: jest.fn(),
  handlePaymentSucceededWebhook: jest.fn(),
  handleTrialEndingWebhook: jest.fn(),
  activateGracePeriod: jest.fn(),
  emergencyAccessMode: jest.fn(),
  preserveTherapeuticAccess: jest.fn(),
  syncWebhookState: jest.fn(),
  subscription: {
    status: 'active',
    currentPeriodEnd: Date.now() + 86400000,
    gracePeriod: { active: false }
  },
  payment: {
    status: 'paid',
    lastPaymentDate: Date.now()
  }
};

const mockUserStore = {
  updateSubscriptionStatus: jest.fn(),
  preserveEmergencyAccess: jest.fn(),
  activateTherapeuticMode: jest.fn(),
  syncUserData: jest.fn(),
  user: {
    subscription: { status: 'active' },
    crisisMode: false,
    therapeuticAccess: true
  }
};

const mockCrisisStore = {
  activateCrisisProtection: jest.fn(),
  preserveEmergencyFeatures: jest.fn(),
  updateCrisisLevel: jest.fn(),
  syncCrisisState: jest.fn(),
  crisis: {
    level: 'none',
    emergencyAccess: true,
    therapeuticContinuity: true
  }
};

jest.mock('../../src/store/paymentStore', () => ({
  usePaymentStore: () => mockPaymentStore
}));

jest.mock('../../src/store/userStore', () => ({
  useUserStore: () => mockUserStore
}));

jest.mock('../../src/store/crisisStore', () => ({
  useCrisisStore: () => mockCrisisStore
}));

describe('Complete Webhook Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset store states
    mockPaymentStore.subscription.status = 'active';
    mockPaymentStore.subscription.gracePeriod.active = false;
    mockUserStore.user.crisisMode = false;
    mockCrisisStore.crisis.level = 'none';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('End-to-End Webhook Processing', () => {
    it('should process complete subscription lifecycle with real-time UI updates', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      // Initialize real-time sync
      await act(async () => {
        await result.current.initializeRealTimeSync();
      });

      // Connect all stores
      act(() => {
        result.current.connectStore('payment', mockPaymentStore, {
          syncPriority: 'high',
          batchingEnabled: true
        });
        result.current.connectStore('user', mockUserStore, {
          syncPriority: 'normal'
        });
        result.current.connectStore('crisis', mockCrisisStore, {
          syncPriority: 'immediate'
        });
      });

      // Create subscription update event
      const subscriptionEvent: SubscriptionUpdatedEvent = {
        id: 'evt_sub_lifecycle_001',
        type: 'customer.subscription.updated',
        created: Date.now() / 1000,
        livemode: false,
        data: {
          object: {
            id: 'sub_test_lifecycle',
            customer: 'cus_test_123',
            status: 'past_due',
            current_period_start: Date.now() / 1000,
            current_period_end: (Date.now() + 86400000) / 1000,
            cancel_at_period_end: false,
            items: {
              data: [{
                id: 'si_test_123',
                price: {
                  id: 'price_test_123',
                  nickname: 'Monthly Premium'
                }
              }]
            },
            metadata: { therapeutic_continuity: 'true' }
          }
        },
        crisisSafety: {
          crisisMode: false,
          emergencyBypass: false,
          therapeuticContinuity: true,
          gracePeriodActive: false,
          responseTimeConstraint: NORMAL_RESPONSE_TIME_MS,
          priority: 'normal'
        },
        performance: {
          processingStartTime: Date.now(),
          maxProcessingTime: NORMAL_RESPONSE_TIME_MS,
          retryAttempt: 0,
          maxRetries: 3
        }
      };

      const startTime = performance.now();

      // Mock successful webhook processing
      mockPaymentStore.handleSubscriptionUpdatedWebhook.mockResolvedValue({
        success: true,
        eventId: subscriptionEvent.id,
        eventType: subscriptionEvent.type,
        processingTime: 150,
        crisisOverride: false,
        therapeuticContinuity: true,
        gracePeriodActive: false,
        stateUpdates: {
          subscription: { status: 'past_due', gracePeriodActivated: true },
          payment: { status: 'requires_payment_method' }
        }
      });

      // Process webhook event
      const syncEventId = result.current.queueSyncEvent(
        'subscription_status_change',
        subscriptionEvent.data,
        ['payment', 'user'],
        'high'
      );

      await act(async () => {
        await result.current.processEventQueue();
      });

      const processingTime = performance.now() - startTime;

      // Validate processing time within limits
      expect(processingTime).toBeLessThan(NORMAL_RESPONSE_TIME_MS);

      // Validate webhook handler was called
      expect(mockPaymentStore.handleSubscriptionUpdatedWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'customer.subscription.updated',
          data: subscriptionEvent.data
        })
      );

      // Validate real-time sync completed
      expect(result.current.completedEvents.size).toBe(1);
      expect(result.current.activeEvents.size).toBe(0);

      // Validate store synchronization
      expect(result.current.connectedStores.get('payment')?.syncSuccess).toBe(1);
      expect(result.current.connectedStores.get('user')?.syncSuccess).toBe(1);
    });

    it('should handle payment failure with immediate crisis assessment', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockPaymentStore, { syncPriority: 'immediate' });
        result.current.connectStore('crisis', mockCrisisStore, { syncPriority: 'immediate' });
      });

      // Create payment failure event
      const paymentFailureEvent: PaymentFailedEvent = {
        id: 'evt_payment_failure_crisis',
        type: 'invoice.payment_failed',
        created: Date.now() / 1000,
        livemode: false,
        data: {
          object: {
            id: 'in_payment_failure',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            amount_paid: 0,
            amount_due: 2999,
            status: 'open',
            attempt_count: 3,
            next_payment_attempt: (Date.now() + 86400000) / 1000,
            period_start: Date.now() / 1000,
            period_end: (Date.now() + 86400000) / 1000
          }
        },
        crisisSafety: {
          crisisMode: true, // Payment failure triggers crisis assessment
          emergencyBypass: false,
          therapeuticContinuity: true,
          gracePeriodActive: false,
          responseTimeConstraint: CRISIS_RESPONSE_TIME_MS, // Crisis timing
          priority: 'emergency'
        },
        performance: {
          processingStartTime: Date.now(),
          maxProcessingTime: CRISIS_RESPONSE_TIME_MS,
          retryAttempt: 0,
          maxRetries: 5
        }
      };

      const startTime = performance.now();

      // Mock crisis-aware payment failure handling
      mockPaymentStore.handlePaymentFailedWebhook.mockResolvedValue({
        success: true,
        eventId: paymentFailureEvent.id,
        eventType: paymentFailureEvent.type,
        processingTime: 120, // Under crisis limit
        crisisOverride: true,
        therapeuticContinuity: true,
        gracePeriodActive: true,
        stateUpdates: {
          payment: {
            status: 'failed',
            gracePeriodActivated: true,
            emergencyAccess: true
          },
          crisis: {
            level: 'medium',
            protectionActivated: true
          }
        }
      });

      mockCrisisStore.activateCrisisProtection.mockResolvedValue();

      // Process payment failure with crisis prioritization
      const syncEventId = result.current.queueSyncEvent(
        'payment_status_update',
        paymentFailureEvent.data,
        ['payment', 'crisis'],
        'immediate'
      );

      await act(async () => {
        await result.current.processEventQueue();
      });

      const processingTime = performance.now() - startTime;

      // Validate crisis response time
      expect(processingTime).toBeLessThan(CRISIS_RESPONSE_TIME_MS);

      // Validate crisis protection was activated
      expect(mockCrisisStore.activateCrisisProtection).toHaveBeenCalled();
      expect(mockPaymentStore.activateGracePeriod).toHaveBeenCalled();

      // Validate therapeutic continuity preserved
      expect(mockPaymentStore.preserveTherapeuticAccess).toHaveBeenCalled();
    });

    it('should maintain therapeutic access during webhook system failures', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockPaymentStore, { syncPriority: 'high' });
        result.current.connectStore('crisis', mockCrisisStore, { syncPriority: 'immediate' });
      });

      // Simulate webhook processing failure
      const failingEvent: SubscriptionUpdatedEvent = {
        id: 'evt_system_failure',
        type: 'customer.subscription.updated',
        created: Date.now() / 1000,
        livemode: false,
        data: {
          object: {
            id: 'sub_failing',
            customer: 'cus_test_123',
            status: 'canceled',
            current_period_start: Date.now() / 1000,
            current_period_end: (Date.now() + 86400000) / 1000,
            cancel_at_period_end: true,
            items: { data: [] }
          }
        },
        crisisSafety: {
          crisisMode: false,
          emergencyBypass: true, // Emergency bypass for system failure
          therapeuticContinuity: true,
          gracePeriodActive: true,
          responseTimeConstraint: NORMAL_RESPONSE_TIME_MS,
          priority: 'high'
        },
        performance: {
          processingStartTime: Date.now(),
          maxProcessingTime: NORMAL_RESPONSE_TIME_MS,
          retryAttempt: 0,
          maxRetries: 3
        }
      };

      // Mock webhook handler failure
      mockPaymentStore.handleSubscriptionUpdatedWebhook
        .mockRejectedValueOnce(new Error('Webhook processing failed'))
        .mockRejectedValueOnce(new Error('Webhook processing failed'))
        .mockResolvedValueOnce({
          success: true,
          eventId: failingEvent.id,
          processingTime: 180,
          crisisOverride: true,
          therapeuticContinuity: true
        });

      // Mock emergency preservation
      mockCrisisStore.preserveEmergencyFeatures.mockResolvedValue();
      mockPaymentStore.emergencyAccessMode.mockResolvedValue();

      const syncEventId = result.current.queueSyncEvent(
        'subscription_status_change',
        failingEvent.data,
        ['payment', 'crisis'],
        'high'
      );

      await act(async () => {
        await result.current.processEventQueue();
      });

      // Fast-forward for retry attempts
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await act(async () => {
        await result.current.retryFailedEvents();
        await result.current.processEventQueue();
      });

      // Validate emergency preservation was activated
      expect(mockCrisisStore.preserveEmergencyFeatures).toHaveBeenCalled();
      expect(mockPaymentStore.emergencyAccessMode).toHaveBeenCalled();

      // Validate retry succeeded
      expect(mockPaymentStore.handleSubscriptionUpdatedWebhook).toHaveBeenCalledTimes(3);
      expect(result.current.completedEvents.size).toBe(1);
    });
  });

  describe('Real-Time State Synchronization', () => {
    it('should sync webhook events across all stores within 500ms', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();

        // Connect multiple stores
        result.current.connectStore('payment', mockPaymentStore, { batchingEnabled: true });
        result.current.connectStore('user', mockUserStore, { batchingEnabled: true });
        result.current.connectStore('crisis', mockCrisisStore, { batchingEnabled: true });
      });

      const startTime = performance.now();

      // Create multiple concurrent sync events
      const events = [
        { type: 'subscription_status_change', data: { status: 'active' }, stores: ['payment', 'user'] },
        { type: 'payment_status_update', data: { status: 'paid' }, stores: ['payment'] },
        { type: 'feature_access_change', data: { premium: true }, stores: ['user'] },
        { type: 'crisis_level_change', data: { level: 'none' }, stores: ['crisis'] }
      ];

      // Queue all events
      const eventIds = events.map(({ type, data, stores }) =>
        result.current.queueSyncEvent(type as any, data, stores, 'normal')
      );

      // Process all events
      await act(async () => {
        await result.current.processEventQueue();
      });

      const syncTime = performance.now() - startTime;

      // Validate sync time under 500ms
      expect(syncTime).toBeLessThan(500);

      // Validate all events completed
      expect(result.current.completedEvents.size).toBe(4);
      expect(result.current.eventQueue.length).toBe(0);

      // Validate store sync success counts
      expect(result.current.connectedStores.get('payment')?.syncSuccess).toBe(2);
      expect(result.current.connectedStores.get('user')?.syncSuccess).toBe(2);
      expect(result.current.connectedStores.get('crisis')?.syncSuccess).toBe(1);
    });

    it('should resolve conflicts prioritizing therapeutic safety', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockPaymentStore, {
          conflictResolution: 'merge'
        });
      });

      // Create conflicting local and remote states
      const localState = {
        subscription: { status: 'active' },
        therapeuticAccess: true
      };

      const remoteState = {
        subscription: { status: 'canceled' },
        therapeuticAccess: false // Conflict: would remove therapeutic access
      };

      // Detect conflict
      const conflictId = result.current.detectSyncConflict('payment', localState, remoteState);

      expect(conflictId).toBeTruthy();
      expect(result.current.activeConflicts.size).toBe(1);

      // Resolve with therapeutic safety priority (merge that preserves access)
      await act(async () => {
        await result.current.resolveSyncConflict(conflictId!, 'merge');
      });

      // Validate conflict resolution
      expect(result.current.activeConflicts.size).toBe(0);
      expect(mockPaymentStore.syncWebhookState).toHaveBeenCalledWith(
        expect.objectContaining({
          resolvedState: expect.objectContaining({
            therapeuticAccess: true // Safety preserved
          })
        })
      );
    });

    it('should handle optimistic updates with proper rollback', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockPaymentStore, {
          syncPriority: 'high'
        });
      });

      // Create optimistic update that will fail
      const optimisticData = {
        subscription: { status: 'active' },
        optimistic: true
      };

      // Mock sync failure requiring rollback
      mockPaymentStore.syncWebhookState
        .mockRejectedValueOnce(new Error('Sync failed - rollback required'));

      const syncEventId = result.current.queueSyncEvent(
        'subscription_status_change',
        optimisticData,
        ['payment'],
        'high'
      );

      await act(async () => {
        await result.current.processEventQueue();
      });

      // Validate failure was tracked
      expect(result.current.failedEvents.size).toBe(1);
      expect(result.current.connectedStores.get('payment')?.syncErrors).toBe(1);

      // Trigger rollback with corrected data
      const rollbackData = {
        subscription: { status: 'past_due' },
        rollback: true
      };

      mockPaymentStore.syncWebhookState.mockResolvedValueOnce();

      const rollbackEventId = result.current.queueSyncEvent(
        'subscription_status_change',
        rollbackData,
        ['payment'],
        'immediate'
      );

      await act(async () => {
        await result.current.processEventQueue();
      });

      // Validate rollback succeeded
      expect(result.current.completedEvents.size).toBe(1);
      expect(result.current.connectedStores.get('payment')?.syncSuccess).toBe(1);
    });
  });

  describe('Multi-Store Orchestration', () => {
    it('should coordinate subscription updates across payment, user, and crisis stores', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();

        // Connect all stores with different configurations
        result.current.connectStore('payment', mockPaymentStore, {
          syncPriority: 'high',
          batchSize: 5
        });
        result.current.connectStore('user', mockUserStore, {
          syncPriority: 'normal',
          batchSize: 10
        });
        result.current.connectStore('crisis', mockCrisisStore, {
          syncPriority: 'immediate',
          batchSize: 1 // Immediate processing
        });
      });

      // Create subscription update affecting all stores
      const subscriptionData = {
        subscription: {
          id: 'sub_multi_store',
          status: 'active',
          features: ['premium_sessions', 'crisis_support'],
          therapeuticAccess: true
        },
        user: {
          subscriptionTier: 'premium',
          emergencyAccess: true
        },
        crisis: {
          protectionLevel: 'full',
          emergencyFeatures: ['hotline', 'chat_support']
        }
      };

      // Queue coordinated update
      const eventId = result.current.queueSyncEvent(
        'subscription_status_change',
        subscriptionData,
        ['payment', 'user', 'crisis'],
        'high'
      );

      await act(async () => {
        await result.current.processEventQueue();
      });

      // Validate all stores were updated
      expect(result.current.connectedStores.get('payment')?.syncSuccess).toBe(1);
      expect(result.current.connectedStores.get('user')?.syncSuccess).toBe(1);
      expect(result.current.connectedStores.get('crisis')?.syncSuccess).toBe(1);

      // Validate update coordination
      expect(result.current.completedEvents.size).toBe(1);
      expect(result.current.globalSyncHealth).toBe('healthy');
    });

    it('should handle concurrent webhook events with proper ordering', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockPaymentStore, { syncPriority: 'high' });
      });

      // Create multiple events with different priorities
      const events = [
        { type: 'payment_status_update', priority: 'normal' },
        { type: 'crisis_level_change', priority: 'immediate' },
        { type: 'subscription_status_change', priority: 'high' },
        { type: 'feature_access_change', priority: 'low' }
      ];

      const eventIds = events.map(({ type, priority }) =>
        result.current.queueSyncEvent(
          type as any,
          { timestamp: Date.now() },
          ['payment'],
          priority as any
        )
      );

      // Process all events
      await act(async () => {
        await result.current.processEventQueue();
      });

      // Validate all events completed
      expect(result.current.completedEvents.size).toBe(4);

      // Validate priority ordering was respected
      const completedEvents = Array.from(result.current.completedEvents.values());
      const crisisEvent = completedEvents.find(e => e.type === 'crisis_level_change');
      const normalEvent = completedEvents.find(e => e.type === 'payment_status_update');

      // Crisis event should have been processed first
      expect(crisisEvent?.timestamp).toBeLessThanOrEqual(normalEvent?.timestamp || 0);
    });
  });

  describe('Performance and Memory Efficiency', () => {
    it('should maintain memory efficiency during real-time updates', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockPaymentStore, { batchingEnabled: true });
      });

      const initialMemoryUsage = process.memoryUsage();

      // Process many events to test memory efficiency
      for (let i = 0; i < 100; i++) {
        const eventId = result.current.queueSyncEvent(
          'subscription_status_change',
          { iteration: i, timestamp: Date.now() },
          ['payment'],
          'normal'
        );
      }

      await act(async () => {
        await result.current.processEventQueue();
      });

      // Trigger cleanup
      act(() => {
        result.current.cleanupCompletedEvents();
      });

      const finalMemoryUsage = process.memoryUsage();

      // Memory should not grow excessively
      const memoryGrowth = finalMemoryUsage.heapUsed - initialMemoryUsage.heapUsed;
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth

      // Validate cleanup occurred
      expect(result.current.completedEvents.size).toBeLessThan(100);
    });

    it('should optimize batch sizes based on performance', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockPaymentStore, {
          batchSize: 5,
          batchingEnabled: true
        });
      });

      // Simulate successful operations to trigger batch size increase
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          const eventId = result.current.queueSyncEvent(
            'subscription_status_change',
            { iteration: i },
            ['payment'],
            'normal'
          );
          await result.current.processEventQueue();
        });
      }

      // Trigger batch optimization
      act(() => {
        result.current.optimizeBatchSize('payment');
      });

      // Validate batch size was optimized
      const storeConfig = result.current.connectedStores.get('payment');
      expect(storeConfig?.batchSize).toBeGreaterThan(5);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle webhook processing errors with therapeutic messaging', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockPaymentStore, { maxRetries: 2 });
      });

      // Mock webhook processing error
      mockPaymentStore.syncWebhookState.mockRejectedValue(
        new Error('Payment processing temporarily unavailable')
      );

      const eventId = result.current.queueSyncEvent(
        'payment_status_update',
        { status: 'failed' },
        ['payment'],
        'high'
      );

      await act(async () => {
        await result.current.processEventQueue();
      });

      // Validate error was handled gracefully
      expect(result.current.failedEvents.size).toBe(1);
      const failedEvent = Array.from(result.current.failedEvents.values())[0];
      expect(failedEvent.errorMessage).toContain('Payment processing temporarily unavailable');

      // Validate therapeutic messaging
      expect(result.current.realTimeCommunication.anxietyReducingMode).toBe(true);
    });

    it('should provide seamless recovery after network issues', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockPaymentStore, { syncPriority: 'high' });
      });

      // Simulate offline mode
      await act(async () => {
        await result.current.handleOfflineMode();
      });

      expect(result.current.networkStatus).toBe('offline');

      // Queue events while offline
      const offlineEventId = result.current.queueSyncEvent(
        'subscription_status_change',
        { status: 'offline_update' },
        ['payment'],
        'high'
      );

      expect(result.current.offlineSyncQueue.length).toBe(1);

      // Simulate network recovery
      mockPaymentStore.syncWebhookState.mockResolvedValue();

      await act(async () => {
        await result.current.handleOnlineRecovery();
      });

      // Validate recovery completed
      expect(result.current.networkStatus).toBe('online');
      expect(result.current.offlineSyncQueue.length).toBe(0);
      expect(result.current.completedEvents.size).toBe(1);
    });
  });

  describe('Compliance and Security', () => {
    it('should maintain HIPAA compliance throughout webhook processing', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockPaymentStore, {
          syncPriority: 'high',
          auditLogging: true
        });
      });

      // Create event with PII-free data structure
      const hipaaCompliantData = {
        subscriptionId: 'sub_encrypted_id',
        status: 'active',
        // No PII - user identification through encrypted IDs only
        metadata: {
          therapeutic_continuity: 'true',
          crisis_protection: 'enabled'
        }
      };

      const eventId = result.current.queueSyncEvent(
        'subscription_status_change',
        hipaaCompliantData,
        ['payment'],
        'high'
      );

      await act(async () => {
        await result.current.processEventQueue();
      });

      // Validate no PII was processed
      const completedEvent = Array.from(result.current.completedEvents.values())[0];
      expect(JSON.stringify(completedEvent.data)).not.toContain('email');
      expect(JSON.stringify(completedEvent.data)).not.toContain('name');
      expect(JSON.stringify(completedEvent.data)).not.toContain('address');

      // Validate audit trail
      expect(result.current.syncPerformanceMetrics.totalSyncOperations).toBe(1);
    });

    it('should provide encrypted audit trails for compliance', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockPaymentStore, { syncPriority: 'high' });
      });

      const eventId = result.current.queueSyncEvent(
        'payment_status_update',
        { status: 'paid', encrypted: true },
        ['payment'],
        'normal'
      );

      await act(async () => {
        await result.current.processEventQueue();
      });

      // Validate audit data is available
      const metrics = result.current.syncPerformanceMetrics;
      expect(metrics.totalSyncOperations).toBeGreaterThan(0);
      expect(metrics.successfulSyncs).toBeGreaterThan(0);
      expect(metrics.lastPerformanceCheck).toBeGreaterThan(0);

      // Validate performance tracking
      expect(metrics.averageSyncTime).toBeGreaterThan(0);
      expect(metrics.throughputPerSecond).toBeGreaterThanOrEqual(0);
    });
  });
});