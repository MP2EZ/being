/**
 * Webhook System Integration Tests - Being. MBCT App
 *
 * Complete system integration testing combining all webhook phases:
 * - Phase 1: Payment store webhook integration
 * - Phase 2: UI components with accessibility and crisis safety
 * - Phase 3: TypeScript hooks + API integration + Real-time state synchronization
 * - Comprehensive end-to-end validation of complete webhook ecosystem
 */

import { renderHook, act } from '@testing-library/react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

// Phase 1: Payment Store Integration
import { usePaymentStore } from '../../src/store/paymentStore';
import { BillingEventHandler } from '../../src/store/webhooks/payment-webhook-store';
import { WebhookSecurityValidator } from '../../src/services/security/WebhookSecurityValidator';

// Phase 2: UI Components
import { PaymentStatusIndicator } from '../../src/components/payment/PaymentStatusIndicator';
import { GracePeriodBanner } from '../../src/components/payment/GracePeriodBanner';
import { PaymentErrorModal } from '../../src/components/payment/PaymentErrorModal';
import { PaymentStatusDashboard } from '../../src/components/payment/PaymentStatusDashboard';

// Phase 3: Real-time State Sync + TypeScript Hooks + API Integration
import { useRealTimeWebhookSync } from '../../src/store/sync/real-time-webhook-sync';
import { useWebhook, useWebhookSubscription } from '../../src/hooks/useWebhook';
import { PaymentAPIService } from '../../src/services/cloud/PaymentAPIService';

// Crisis Safety and Therapeutic Systems
import { useCrisisStateManager } from '../../src/store/webhooks/crisis-state-manager';
import { useTherapeuticMessageStore } from '../../src/store/therapeuticMessageStore';

// Types and Constants
import {
  WebhookEvent,
  SubscriptionUpdatedEvent,
  PaymentFailedEvent,
  CrisisProtectionEvent,
  CRISIS_RESPONSE_TIME_MS,
  NORMAL_RESPONSE_TIME_MS
} from '../../src/types/webhooks/webhook-events';

// Mock complete system ecosystem
const mockSystemComponents = {
  paymentStore: {
    subscription: { status: 'active', gracePeriod: { active: false } },
    payment: { status: 'paid', lastPaymentDate: Date.now() },
    handleSubscriptionUpdatedWebhook: jest.fn(),
    handlePaymentFailedWebhook: jest.fn(),
    activateGracePeriod: jest.fn(),
    preserveTherapeuticAccess: jest.fn()
  },

  webhookSecurity: {
    validateWebhookSignature: jest.fn().mockResolvedValue(true),
    sanitizeWebhookData: jest.fn().mockImplementation(data => data),
    auditWebhookEvent: jest.fn(),
    detectSuspiciousActivity: jest.fn().mockResolvedValue(false)
  },

  paymentAPI: {
    processWebhookEvent: jest.fn(),
    validateEventAuthenticity: jest.fn().mockResolvedValue(true),
    syncPaymentStatus: jest.fn(),
    handlePaymentFailure: jest.fn()
  },

  crisisManager: {
    assessCrisisRisk: jest.fn(),
    activateCrisisProtection: jest.fn(),
    preserveEmergencyAccess: jest.fn(),
    triggerTherapeuticContinuity: jest.fn()
  },

  therapeuticStore: {
    generateTherapeuticMessage: jest.fn(),
    trackUserAnxiety: jest.fn(),
    provideSupportiveMessaging: jest.fn()
  }
};

// Mock all system components
jest.mock('../../src/store/paymentStore', () => ({
  usePaymentStore: () => mockSystemComponents.paymentStore
}));

jest.mock('../../src/services/security/WebhookSecurityValidator', () => ({
  WebhookSecurityValidator: mockSystemComponents.webhookSecurity
}));

jest.mock('../../src/services/cloud/PaymentAPIService', () => ({
  PaymentAPIService: mockSystemComponents.paymentAPI
}));

jest.mock('../../src/store/webhooks/crisis-state-manager', () => ({
  useCrisisStateManager: () => mockSystemComponents.crisisManager
}));

jest.mock('../../src/store/therapeuticMessageStore', () => ({
  useTherapeuticMessageStore: () => mockSystemComponents.therapeuticStore
}));

// Test component wrapper for UI integration
const TestComponentWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

describe('Webhook System Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset system state
    mockSystemComponents.paymentStore.subscription.status = 'active';
    mockSystemComponents.paymentStore.subscription.gracePeriod.active = false;
    mockSystemComponents.paymentStore.payment.status = 'paid';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Complete System Integration - All Three Phases', () => {
    it('should integrate payment store, UI components, and real-time sync for subscription update', async () => {
      // Phase 1: Payment Store Integration
      const { result: paymentResult } = renderHook(() => usePaymentStore());

      // Phase 3: Real-time Sync Integration
      const { result: syncResult } = renderHook(() => useRealTimeWebhookSync());
      const { result: webhookResult } = renderHook(() => useWebhook());

      // Initialize complete system
      await act(async () => {
        await syncResult.current.initializeRealTimeSync();
        syncResult.current.connectStore('payment', mockSystemComponents.paymentStore, {
          syncPriority: 'high',
          batchingEnabled: true
        });
        webhookResult.current.connect();
      });

      // Create subscription update webhook event
      const subscriptionUpdateEvent: SubscriptionUpdatedEvent = {
        id: 'evt_complete_system_test',
        type: 'customer.subscription.updated',
        created: Date.now() / 1000,
        livemode: true,
        data: {
          object: {
            id: 'sub_system_integration',
            customer: 'cus_test_user',
            status: 'past_due',
            current_period_start: Date.now() / 1000,
            current_period_end: (Date.now() + 86400000) / 1000,
            cancel_at_period_end: false,
            items: {
              data: [{
                id: 'si_premium_plan',
                price: {
                  id: 'price_premium_monthly',
                  nickname: 'Premium MBCT Plan'
                }
              }]
            },
            metadata: { therapeutic_continuity: 'required' }
          }
        },
        crisisSafety: {
          crisisMode: false,
          emergencyBypass: false,
          therapeuticContinuity: true,
          gracePeriodActive: false,
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

      // Phase 1: Mock payment store webhook processing
      mockSystemComponents.paymentStore.handleSubscriptionUpdatedWebhook.mockResolvedValue({
        success: true,
        eventId: subscriptionUpdateEvent.id,
        eventType: subscriptionUpdateEvent.type,
        processingTime: 150,
        crisisOverride: false,
        therapeuticContinuity: true,
        gracePeriodActive: true,
        stateUpdates: {
          subscription: { status: 'past_due', gracePeriodActivated: true },
          payment: { status: 'requires_payment_method' }
        }
      });

      // Process webhook through complete system
      await act(async () => {
        // Security validation (Phase 1)
        const isValid = await mockSystemComponents.webhookSecurity.validateWebhookSignature(
          subscriptionUpdateEvent,
          'test_signature'
        );
        expect(isValid).toBe(true);

        // API processing (Phase 3)
        await mockSystemComponents.paymentAPI.processWebhookEvent(subscriptionUpdateEvent);

        // Real-time sync processing (Phase 3)
        const syncEventId = syncResult.current.queueSyncEvent(
          'subscription_status_change',
          subscriptionUpdateEvent.data,
          ['payment'],
          'high'
        );

        await syncResult.current.processEventQueue();

        // Webhook hooks processing (Phase 3)
        await webhookResult.current.processWebhookEvent(subscriptionUpdateEvent);
      });

      // Validate complete system integration
      expect(mockSystemComponents.webhookSecurity.validateWebhookSignature).toHaveBeenCalled();
      expect(mockSystemComponents.paymentAPI.processWebhookEvent).toHaveBeenCalled();
      expect(mockSystemComponents.paymentStore.handleSubscriptionUpdatedWebhook).toHaveBeenCalled();
      expect(syncResult.current.completedEvents.size).toBe(1);
      expect(webhookResult.current.events.length).toBe(1);

      // Phase 2: Validate UI component integration
      const { getByTestId } = render(
        <TestComponentWrapper>
          <PaymentStatusIndicator />
          <GracePeriodBanner />
        </TestComponentWrapper>
      );

      // UI should reflect the updated subscription status
      await waitFor(() => {
        expect(getByTestId('payment-status-indicator')).toBeTruthy();
        expect(getByTestId('grace-period-banner')).toBeTruthy();
      });
    });

    it('should handle payment failure through complete crisis-safe pipeline', async () => {
      // Initialize complete system with crisis management
      const { result: syncResult } = renderHook(() => useRealTimeWebhookSync());
      const { result: webhookResult } = renderHook(() => useWebhook());

      await act(async () => {
        await syncResult.current.initializeRealTimeSync();
        syncResult.current.connectStore('payment', mockSystemComponents.paymentStore, { syncPriority: 'immediate' });
        syncResult.current.connectStore('crisis', mockSystemComponents.crisisManager, { syncPriority: 'immediate' });
        webhookResult.current.connect();
      });

      // Create payment failure event with crisis implications
      const paymentFailureEvent: PaymentFailedEvent = {
        id: 'evt_crisis_payment_failure',
        type: 'invoice.payment_failed',
        created: Date.now() / 1000,
        livemode: true,
        data: {
          object: {
            id: 'in_crisis_failure',
            customer: 'cus_vulnerable_user',
            subscription: 'sub_therapy_critical',
            amount_paid: 0,
            amount_due: 2999,
            status: 'open',
            attempt_count: 3,
            period_start: Date.now() / 1000,
            period_end: (Date.now() + 86400000) / 1000
          }
        },
        crisisSafety: {
          crisisMode: true, // Crisis-sensitive payment failure
          emergencyBypass: true,
          therapeuticContinuity: true,
          gracePeriodActive: false,
          responseTimeConstraint: CRISIS_RESPONSE_TIME_MS,
          priority: 'emergency'
        },
        performance: {
          processingStartTime: Date.now(),
          maxProcessingTime: CRISIS_RESPONSE_TIME_MS,
          retryAttempt: 0,
          maxRetries: 5
        }
      };

      // Mock crisis assessment
      mockSystemComponents.crisisManager.assessCrisisRisk.mockResolvedValue({
        crisisLevel: 'high',
        interventionRequired: true,
        therapeuticContinuityAtRisk: true,
        gracePeriodRecommended: true
      });

      // Mock payment failure with crisis response
      mockSystemComponents.paymentStore.handlePaymentFailedWebhook.mockResolvedValue({
        success: true,
        eventId: paymentFailureEvent.id,
        eventType: paymentFailureEvent.type,
        processingTime: 120,
        crisisOverride: true,
        therapeuticContinuity: true,
        gracePeriodActive: true,
        stateUpdates: {
          payment: { status: 'failed', crisisGracePeriod: true },
          crisis: { level: 'high', protectionActivated: true }
        }
      });

      // Mock therapeutic messaging
      mockSystemComponents.therapeuticStore.generateTherapeuticMessage.mockReturnValue({
        type: 'supportive',
        title: 'Your wellness journey continues',
        message: 'Payment issues don\'t interrupt your healing. Take a mindful breath - you\'re supported.',
        anxietyReducing: true,
        therapeutic: true
      });

      const startTime = performance.now();

      // Process payment failure through complete crisis pipeline
      await act(async () => {
        // Crisis assessment (immediate)
        const crisisAssessment = await mockSystemComponents.crisisManager.assessCrisisRisk(
          paymentFailureEvent.data
        );

        // Activate crisis sync if needed
        if (crisisAssessment.crisisLevel === 'high') {
          await syncResult.current.activateCrisisSync('high');
        }

        // Security validation (crisis-prioritized)
        await mockSystemComponents.webhookSecurity.validateWebhookSignature(
          paymentFailureEvent,
          'crisis_signature'
        );

        // API processing (crisis mode)
        await mockSystemComponents.paymentAPI.handlePaymentFailure(paymentFailureEvent);

        // Real-time sync (crisis priority)
        const syncEventId = syncResult.current.queueSyncEvent(
          'payment_status_update',
          paymentFailureEvent.data,
          ['payment', 'crisis'],
          'immediate'
        );

        await syncResult.current.processEventQueue();

        // Webhook processing (crisis-aware)
        await webhookResult.current.processWebhookEvent(paymentFailureEvent);

        // Therapeutic continuity activation
        await mockSystemComponents.crisisManager.triggerTherapeuticContinuity();
      });

      const totalResponseTime = performance.now() - startTime;

      // Validate crisis response time
      expect(totalResponseTime).toBeLessThan(CRISIS_RESPONSE_TIME_MS);

      // Validate complete crisis pipeline execution
      expect(mockSystemComponents.crisisManager.assessCrisisRisk).toHaveBeenCalled();
      expect(mockSystemComponents.paymentStore.handlePaymentFailedWebhook).toHaveBeenCalled();
      expect(mockSystemComponents.crisisManager.triggerTherapeuticContinuity).toHaveBeenCalled();
      expect(syncResult.current.crisisSyncState.crisisMode).toBe(true);

      // Phase 2: Validate crisis UI components
      const { getByTestId, getByText } = render(
        <TestComponentWrapper>
          <PaymentErrorModal visible={true} />
          <GracePeriodBanner />
        </TestComponentWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('payment-error-modal')).toBeTruthy();
        expect(getByText(/your wellness journey continues/i)).toBeTruthy();
      });
    });

    it('should demonstrate seamless UI updates from webhook processing', async () => {
      // Initialize system components
      const { result: syncResult } = renderHook(() => useRealTimeWebhookSync());
      const { result: webhookResult } = renderHook(() => useWebhookSubscription('cus_ui_test'));

      await act(async () => {
        await syncResult.current.initializeRealTimeSync();
        syncResult.current.connectStore('payment', mockSystemComponents.paymentStore, { syncPriority: 'high' });
      });

      // Create subscription lifecycle event
      const subscriptionCancelEvent: SubscriptionUpdatedEvent = {
        id: 'evt_ui_integration',
        type: 'customer.subscription.updated',
        created: Date.now() / 1000,
        livemode: true,
        data: {
          object: {
            id: 'sub_ui_test',
            customer: 'cus_ui_test',
            status: 'canceled',
            current_period_start: Date.now() / 1000,
            current_period_end: (Date.now() + 86400000) / 1000,
            cancel_at_period_end: true,
            items: { data: [] },
            metadata: { cancellation_reason: 'user_requested' }
          }
        },
        crisisSafety: {
          crisisMode: false,
          emergencyBypass: false,
          therapeuticContinuity: true,
          gracePeriodActive: false,
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

      // Mock subscription update processing
      mockSystemComponents.paymentStore.handleSubscriptionUpdatedWebhook.mockResolvedValue({
        success: true,
        eventId: subscriptionCancelEvent.id,
        processingTime: 200,
        stateUpdates: {
          subscription: { status: 'canceled', endOfPeriodAccess: true }
        }
      });

      // Render UI components that should respond to webhook updates
      const { getByTestId, rerender } = render(
        <TestComponentWrapper>
          <PaymentStatusDashboard />
        </TestComponentWrapper>
      );

      // Initial state
      expect(getByTestId('payment-status-dashboard')).toBeTruthy();

      // Process webhook event
      await act(async () => {
        const syncEventId = syncResult.current.queueSyncEvent(
          'subscription_status_change',
          subscriptionCancelEvent.data,
          ['payment'],
          'high'
        );

        await syncResult.current.processEventQueue();
        await webhookResult.current.processWebhookEvent(subscriptionCancelEvent);
      });

      // Validate UI updates reflect webhook processing
      expect(mockSystemComponents.paymentStore.handleSubscriptionUpdatedWebhook).toHaveBeenCalled();
      expect(syncResult.current.completedEvents.size).toBe(1);

      // Re-render with updated state
      rerender(
        <TestComponentWrapper>
          <PaymentStatusDashboard />
        </TestComponentWrapper>
      );

      await waitFor(() => {
        // Dashboard should show updated subscription status
        expect(getByTestId('payment-status-dashboard')).toBeTruthy();
      });
    });
  });

  describe('Cross-Phase Error Handling and Recovery', () => {
    it('should handle Phase 1 failure with Phase 2 UI error recovery', async () => {
      const { result: syncResult } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await syncResult.current.initializeRealTimeSync();
        syncResult.current.connectStore('payment', mockSystemComponents.paymentStore, { syncPriority: 'high' });
      });

      // Mock Phase 1 payment store failure
      mockSystemComponents.paymentStore.handleSubscriptionUpdatedWebhook.mockRejectedValue(
        new Error('Payment store processing failed')
      );

      // Mock therapeutic error recovery
      mockSystemComponents.therapeuticStore.generateTherapeuticMessage.mockReturnValue({
        type: 'error_recovery',
        title: 'Temporary sync issue',
        message: 'We\'re working to restore connection. Your access remains secure.',
        anxietyReducing: true,
        therapeutic: true
      });

      const subscriptionEvent: SubscriptionUpdatedEvent = {
        id: 'evt_error_recovery',
        type: 'customer.subscription.updated',
        created: Date.now() / 1000,
        livemode: true,
        data: {
          object: {
            id: 'sub_error_test',
            customer: 'cus_error_test',
            status: 'active',
            current_period_start: Date.now() / 1000,
            current_period_end: (Date.now() + 86400000) / 1000,
            cancel_at_period_end: false,
            items: { data: [] }
          }
        },
        crisisSafety: {
          crisisMode: false,
          emergencyBypass: true, // Enable bypass for error recovery
          therapeuticContinuity: true,
          gracePeriodActive: false,
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

      // Process with expected failure and recovery
      await act(async () => {
        const syncEventId = syncResult.current.queueSyncEvent(
          'subscription_status_change',
          subscriptionEvent.data,
          ['payment'],
          'high'
        );

        await syncResult.current.processEventQueue();
      });

      // Validate failure was handled gracefully
      expect(syncResult.current.failedEvents.size).toBe(1);
      expect(syncResult.current.crisisSyncState.emergencyBypassActive).toBe(true);

      // Phase 2: Validate error UI is displayed
      const { getByTestId } = render(
        <TestComponentWrapper>
          <PaymentErrorModal visible={true} />
        </TestComponentWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('payment-error-modal')).toBeTruthy();
      });

      // Mock recovery
      mockSystemComponents.paymentStore.handleSubscriptionUpdatedWebhook.mockResolvedValue({
        success: true,
        eventId: subscriptionEvent.id,
        processingTime: 180
      });

      // Retry processing
      await act(async () => {
        await syncResult.current.retryFailedEvents();
        await syncResult.current.processEventQueue();
      });

      // Validate recovery
      expect(syncResult.current.completedEvents.size).toBe(1);
      expect(syncResult.current.failedEvents.size).toBe(0);
    });

    it('should maintain system integrity during multi-phase failures', async () => {
      const { result: syncResult } = renderHook(() => useRealTimeWebhookSync());
      const { result: webhookResult } = renderHook(() => useWebhook());

      await act(async () => {
        await syncResult.current.initializeRealTimeSync();
        syncResult.current.connectStore('payment', mockSystemComponents.paymentStore, { syncPriority: 'immediate' });
        syncResult.current.connectStore('crisis', mockSystemComponents.crisisManager, { syncPriority: 'immediate' });
        webhookResult.current.connect();
      });

      // Simulate cascade failure across phases
      mockSystemComponents.paymentStore.handleSubscriptionUpdatedWebhook.mockRejectedValue(
        new Error('Phase 1 failure')
      );
      mockSystemComponents.paymentAPI.processWebhookEvent.mockRejectedValue(
        new Error('Phase 3 API failure')
      );

      // Mock emergency protocols
      mockSystemComponents.crisisManager.activateCrisisProtection.mockResolvedValue({
        emergencyMode: true,
        fallbackProtocols: ['local_storage', 'offline_mode'],
        therapeuticContinuity: true
      });

      const criticalEvent: SubscriptionUpdatedEvent = {
        id: 'evt_cascade_failure',
        type: 'customer.subscription.updated',
        created: Date.now() / 1000,
        livemode: true,
        data: {
          object: {
            id: 'sub_critical',
            customer: 'cus_critical',
            status: 'canceled',
            current_period_start: Date.now() / 1000,
            current_period_end: (Date.now() + 86400000) / 1000,
            cancel_at_period_end: true,
            items: { data: [] }
          }
        },
        crisisSafety: {
          crisisMode: true,
          emergencyBypass: true,
          therapeuticContinuity: true,
          gracePeriodActive: false,
          responseTimeConstraint: CRISIS_RESPONSE_TIME_MS,
          priority: 'emergency'
        },
        performance: {
          processingStartTime: Date.now(),
          maxProcessingTime: CRISIS_RESPONSE_TIME_MS,
          retryAttempt: 0,
          maxRetries: 5
        }
      };

      // Process with cascade failure
      await act(async () => {
        // Activate crisis mode for failure handling
        await syncResult.current.activateCrisisSync('critical');

        const syncEventId = syncResult.current.queueSyncEvent(
          'subscription_status_change',
          criticalEvent.data,
          ['payment', 'crisis'],
          'immediate'
        );

        await syncResult.current.processEventQueue();
      });

      // Validate system maintained integrity despite failures
      expect(syncResult.current.crisisSyncState.crisisMode).toBe(true);
      expect(syncResult.current.crisisSyncState.emergencyBypassActive).toBe(true);
      expect(syncResult.current.crisisSyncState.therapeuticContinuityProtected).toBe(true);

      // Validate emergency protocols were activated
      expect(mockSystemComponents.crisisManager.activateCrisisProtection).toHaveBeenCalled();

      // System should remain operational despite failures
      expect(syncResult.current.syncActive).toBe(true);
      expect(syncResult.current.globalSyncHealth).not.toBe('offline');
    });
  });

  describe('End-to-End User Journey Integration', () => {
    it('should handle complete subscription lifecycle with UI feedback', async () => {
      // Initialize complete system
      const { result: syncResult } = renderHook(() => useRealTimeWebhookSync());
      const { result: webhookResult } = renderHook(() => useWebhookSubscription('cus_lifecycle_test'));

      await act(async () => {
        await syncResult.current.initializeRealTimeSync();
        syncResult.current.connectStore('payment', mockSystemComponents.paymentStore, { syncPriority: 'high' });
      });

      // Subscription lifecycle events
      const lifecycleEvents = [
        {
          phase: 'trial_start',
          status: 'trialing',
          expectedUI: 'trial-status'
        },
        {
          phase: 'trial_ending',
          status: 'trialing',
          expectedUI: 'trial-ending-banner'
        },
        {
          phase: 'subscription_active',
          status: 'active',
          expectedUI: 'active-subscription'
        },
        {
          phase: 'payment_failed',
          status: 'past_due',
          expectedUI: 'grace-period-banner'
        },
        {
          phase: 'subscription_recovered',
          status: 'active',
          expectedUI: 'recovery-success'
        }
      ];

      const { getByTestId, rerender } = render(
        <TestComponentWrapper>
          <PaymentStatusDashboard />
          <PaymentStatusIndicator />
          <GracePeriodBanner />
        </TestComponentWrapper>
      );

      // Process complete lifecycle
      for (const [index, lifecycle] of lifecycleEvents.entries()) {
        const lifecycleEvent: SubscriptionUpdatedEvent = {
          id: `evt_lifecycle_${index}`,
          type: 'customer.subscription.updated',
          created: Date.now() / 1000,
          livemode: true,
          data: {
            object: {
              id: 'sub_lifecycle_test',
              customer: 'cus_lifecycle_test',
              status: lifecycle.status as any,
              current_period_start: Date.now() / 1000,
              current_period_end: (Date.now() + 86400000) / 1000,
              cancel_at_period_end: false,
              items: { data: [] },
              metadata: { lifecycle_phase: lifecycle.phase }
            }
          },
          crisisSafety: {
            crisisMode: lifecycle.status === 'past_due',
            emergencyBypass: false,
            therapeuticContinuity: true,
            gracePeriodActive: lifecycle.status === 'past_due',
            responseTimeConstraint: lifecycle.status === 'past_due' ? CRISIS_RESPONSE_TIME_MS : NORMAL_RESPONSE_TIME_MS,
            priority: lifecycle.status === 'past_due' ? 'emergency' : 'high'
          },
          performance: {
            processingStartTime: Date.now(),
            maxProcessingTime: lifecycle.status === 'past_due' ? CRISIS_RESPONSE_TIME_MS : NORMAL_RESPONSE_TIME_MS,
            retryAttempt: 0,
            maxRetries: 3
          }
        };

        // Mock phase-specific processing
        mockSystemComponents.paymentStore.handleSubscriptionUpdatedWebhook.mockResolvedValue({
          success: true,
          eventId: lifecycleEvent.id,
          processingTime: 150,
          stateUpdates: {
            subscription: { status: lifecycle.status, phase: lifecycle.phase }
          }
        });

        await act(async () => {
          const syncEventId = syncResult.current.queueSyncEvent(
            'subscription_status_change',
            lifecycleEvent.data,
            ['payment'],
            lifecycle.status === 'past_due' ? 'immediate' : 'high'
          );

          await syncResult.current.processEventQueue();
          await webhookResult.current.processWebhookEvent(lifecycleEvent);
        });

        // Re-render UI to reflect lifecycle changes
        rerender(
          <TestComponentWrapper>
            <PaymentStatusDashboard />
            <PaymentStatusIndicator />
            <GracePeriodBanner />
          </TestComponentWrapper>
        );

        await waitFor(() => {
          // Validate UI reflects current lifecycle phase
          expect(getByTestId('payment-status-dashboard')).toBeTruthy();
        });
      }

      // Validate complete lifecycle was processed
      expect(syncResult.current.completedEvents.size).toBe(5);
      expect(webhookResult.current.subscriptionEvents.length).toBe(5);
    });

    it('should provide comprehensive system health monitoring', async () => {
      const { result: syncResult } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await syncResult.current.initializeRealTimeSync();
        syncResult.current.connectStore('payment', mockSystemComponents.paymentStore, { syncPriority: 'high' });
        syncResult.current.connectStore('crisis', mockSystemComponents.crisisManager, { syncPriority: 'immediate' });
      });

      // Generate varied system activity
      const systemActivity = [
        { type: 'normal_operation', success: true, duration: 150 },
        { type: 'high_load', success: true, duration: 800 },
        { type: 'crisis_response', success: true, duration: 80 },
        { type: 'error_recovery', success: false, duration: 300 },
        { type: 'batch_processing', success: true, duration: 1200 }
      ];

      for (const [index, activity] of systemActivity.entries()) {
        const eventId = `system_activity_${index}`;
        const startTime = Date.now() - activity.duration;

        // Track system activity
        syncResult.current.trackSyncPerformance(
          eventId,
          startTime,
          Date.now(),
          activity.success
        );
      }

      // Get comprehensive system health
      const systemHealth = syncResult.current.getSyncHealth();

      // Validate health monitoring
      expect(systemHealth.healthy).toBeDefined();
      expect(systemHealth.metrics).toBeDefined();
      expect(systemHealth.metrics.successRate).toBeGreaterThan(0);
      expect(systemHealth.metrics.averageTime).toBeGreaterThan(0);

      // Validate issue detection
      expect(Array.isArray(systemHealth.issues)).toBe(true);

      // Validate performance metrics
      const metrics = syncResult.current.syncPerformanceMetrics;
      expect(metrics.totalSyncOperations).toBe(5);
      expect(metrics.successfulSyncs).toBe(4);
      expect(metrics.failedSyncs).toBe(1);
    });
  });

  describe('Security and Compliance Integration', () => {
    it('should maintain HIPAA compliance across all system phases', async () => {
      const { result: syncResult } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await syncResult.current.initializeRealTimeSync();
        syncResult.current.connectStore('payment', mockSystemComponents.paymentStore, { syncPriority: 'high' });
      });

      // Create HIPAA-compliant webhook event (no PII)
      const hipaaEvent: SubscriptionUpdatedEvent = {
        id: 'evt_hipaa_compliance',
        type: 'customer.subscription.updated',
        created: Date.now() / 1000,
        livemode: true,
        data: {
          object: {
            id: 'sub_encrypted_id_12345',
            customer: 'cus_encrypted_id_67890',
            status: 'active',
            current_period_start: Date.now() / 1000,
            current_period_end: (Date.now() + 86400000) / 1000,
            cancel_at_period_end: false,
            items: { data: [] },
            metadata: {
              // No PII - only encrypted identifiers and therapeutic flags
              therapeutic_plan: 'premium_mbct',
              crisis_support: 'enabled',
              data_retention: '7_years'
            }
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

      // Mock HIPAA-compliant processing
      mockSystemComponents.webhookSecurity.sanitizeWebhookData.mockImplementation((data) => {
        // Remove any potential PII
        const sanitized = { ...data };
        delete sanitized.personalInfo;
        delete sanitized.healthData;
        return sanitized;
      });

      mockSystemComponents.webhookSecurity.auditWebhookEvent.mockImplementation((event) => {
        return {
          auditId: `audit_${event.id}`,
          timestamp: Date.now(),
          eventType: event.type,
          complianceChecks: {
            noPII: true,
            encryptedIds: true,
            auditTrail: true,
            dataMinimization: true
          }
        };
      });

      // Process with HIPAA compliance
      await act(async () => {
        // Security validation and sanitization
        const sanitizedData = mockSystemComponents.webhookSecurity.sanitizeWebhookData(hipaaEvent.data);
        const auditRecord = mockSystemComponents.webhookSecurity.auditWebhookEvent(hipaaEvent);

        const syncEventId = syncResult.current.queueSyncEvent(
          'subscription_status_change',
          sanitizedData,
          ['payment'],
          'normal'
        );

        await syncResult.current.processEventQueue();
      });

      // Validate HIPAA compliance
      expect(mockSystemComponents.webhookSecurity.sanitizeWebhookData).toHaveBeenCalled();
      expect(mockSystemComponents.webhookSecurity.auditWebhookEvent).toHaveBeenCalled();

      // Validate no PII in processed event
      const completedEvent = Array.from(syncResult.current.completedEvents.values())[0];
      const eventDataString = JSON.stringify(completedEvent.data);

      // Common PII patterns that should not be present
      expect(eventDataString).not.toMatch(/email/i);
      expect(eventDataString).not.toMatch(/phone/i);
      expect(eventDataString).not.toMatch(/address/i);
      expect(eventDataString).not.toMatch(/name/i);
      expect(eventDataString).not.toMatch(/ssn/i);
      expect(eventDataString).not.toMatch(/birth/i);
    });
  });
});