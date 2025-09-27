/**
 * Crisis Scenario Integration Tests - Being. MBCT App
 *
 * Comprehensive crisis safety validation including:
 * - <200ms crisis response guarantee across entire system
 * - Emergency access preservation during payment failures
 * - Therapeutic continuity during webhook processing failures
 * - Crisis-triggered grace period activation
 * - 988 hotline integration during payment crises
 * - Emergency bypass protocols and failsafe mechanisms
 */

import { renderHook, act } from '@testing-library/react-native';
import { useRealTimeWebhookSync } from '../../src/store/sync/real-time-webhook-sync';
import { useCrisisStateManager } from '../../src/store/webhooks/crisis-state-manager';
import { usePaymentStore } from '../../src/store/paymentStore';
import { useCrisisStore } from '../../src/store/crisisStore';
import {
  WebhookEvent,
  CrisisProtectionEvent,
  PaymentFailedEvent,
  SubscriptionUpdatedEvent,
  CRISIS_RESPONSE_TIME_MS,
  CrisisSafetyMetadata
} from '../../src/types/webhooks/webhook-events';
import { CrisisLevel, TherapeuticContinuity } from '../../src/types/webhooks/crisis-safety-types';
import { performance } from 'perf_hooks';

// Mock comprehensive crisis management system
const mockCrisisStateManager = {
  activateCrisisProtection: jest.fn(),
  deactivateCrisisProtection: jest.fn(),
  assessCrisisLevel: jest.fn(),
  triggerEmergencyProtocols: jest.fn(),
  preserveTherapeuticContinuity: jest.fn(),
  activateGracePeriod: jest.fn(),
  enableEmergencyBypass: jest.fn(),
  integrate988Hotline: jest.fn(),
  trackCrisisResponse: jest.fn(),
  validateCrisisSafety: jest.fn(),
  crisisState: {
    level: 'none' as CrisisLevel,
    protectionActive: false,
    emergencyBypass: false,
    gracePeriodActive: false,
    therapeuticContinuity: true,
    lastCrisisCheck: Date.now()
  }
};

const mockPaymentStore = {
  handlePaymentFailedWebhook: jest.fn(),
  handleSubscriptionUpdatedWebhook: jest.fn(),
  activateEmergencyAccess: jest.fn(),
  preserveCrisisAccess: jest.fn(),
  initiateCrisisGracePeriod: jest.fn(),
  bypassPaymentValidation: jest.fn(),
  maintainTherapeuticFeatures: jest.fn(),
  getCrisisPaymentStatus: jest.fn(),
  subscription: {
    status: 'active',
    gracePeriod: { active: false, reason: null },
    crisisProtection: { active: false, level: 'none' }
  },
  payment: {
    status: 'paid',
    crisisOverride: false,
    emergencyAccess: true
  }
};

const mockCrisisStore = {
  activateCrisisMode: jest.fn(),
  updateCrisisLevel: jest.fn(),
  preserveEmergencyFeatures: jest.fn(),
  activateHotlineIntegration: jest.fn(),
  enableCrisisButton: jest.fn(),
  trackCrisisMetrics: jest.fn(),
  validateCrisisResponse: jest.fn(),
  crisis: {
    level: 'none' as CrisisLevel,
    active: false,
    emergencyFeatures: ['crisis_button', 'hotline_988'],
    therapeuticAccess: true,
    responseTime: 0
  }
};

// Mock 988 hotline integration
const mock988Integration = {
  initiate: jest.fn(),
  validateAvailability: jest.fn().mockResolvedValue(true),
  trackCall: jest.fn(),
  emergencyEscalation: jest.fn()
};

jest.mock('../../src/store/webhooks/crisis-state-manager', () => ({
  useCrisisStateManager: () => mockCrisisStateManager
}));

jest.mock('../../src/store/paymentStore', () => ({
  usePaymentStore: () => mockPaymentStore
}));

jest.mock('../../src/store/crisisStore', () => ({
  useCrisisStore: () => mockCrisisStore
}));

jest.mock('../../src/services/crisis/988-integration', () => ({
  use988Integration: () => mock988Integration
}));

describe('Crisis Scenario Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset crisis states
    mockCrisisStateManager.crisisState.level = 'none';
    mockCrisisStateManager.crisisState.protectionActive = false;
    mockPaymentStore.subscription.status = 'active';
    mockPaymentStore.subscription.gracePeriod.active = false;
    mockCrisisStore.crisis.level = 'none';
    mockCrisisStore.crisis.active = false;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Crisis Response Time Validation', () => {
    it('should guarantee <200ms crisis response across entire system', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('crisis', mockCrisisStore, { syncPriority: 'immediate' });
        result.current.connectStore('payment', mockPaymentStore, { syncPriority: 'immediate' });
      });

      // Create critical crisis event
      const crisisEvent: CrisisProtectionEvent = {
        id: 'evt_crisis_critical_001',
        type: 'crisis.protection.activated',
        created: Date.now() / 1000,
        livemode: true,
        data: {
          userId: 'user_crisis_test',
          triggeredAt: Date.now(),
          crisisLevel: 'critical',
          protectionType: 'crisis_bypass',
          emergencyAccess: true,
          therapeuticFeatures: ['crisis_button', 'hotline_988', 'emergency_chat']
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

      const startTime = performance.now();

      // Mock crisis response handlers
      mockCrisisStateManager.activateCrisisProtection.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50)); // 50ms processing
        return { activated: true, responseTime: 50 };
      });

      mockCrisisStore.activateCrisisMode.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 30)); // 30ms processing
        return { crisisMode: true, responseTime: 30 };
      });

      mockPaymentStore.activateEmergencyAccess.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 40)); // 40ms processing
        return { emergencyAccess: true, responseTime: 40 };
      });

      // Activate crisis sync mode
      await act(async () => {
        await result.current.activateCrisisSync('critical');
      });

      // Process crisis event
      const syncEventId = result.current.queueSyncEvent(
        'crisis_level_change',
        crisisEvent.data,
        ['crisis', 'payment'],
        'immediate'
      );

      await act(async () => {
        await result.current.processEventQueue();
      });

      const totalResponseTime = performance.now() - startTime;

      // Validate crisis response time requirement
      expect(totalResponseTime).toBeLessThan(CRISIS_RESPONSE_TIME_MS);

      // Validate all crisis components activated
      expect(mockCrisisStateManager.activateCrisisProtection).toHaveBeenCalled();
      expect(mockCrisisStore.activateCrisisMode).toHaveBeenCalled();
      expect(mockPaymentStore.activateEmergencyAccess).toHaveBeenCalled();

      // Validate crisis sync mode
      expect(result.current.crisisSyncState.crisisMode).toBe(true);
      expect(result.current.crisisSyncState.crisisLevel).toBe('critical');
      expect(result.current.syncInterval).toBe(500); // Crisis sync interval
    });

    it('should maintain <100ms emergency access during payment failures', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockPaymentStore, { syncPriority: 'immediate' });
        result.current.connectStore('crisis', mockCrisisStore, { syncPriority: 'immediate' });
      });

      // Create payment failure during crisis scenario
      const paymentFailureEvent: PaymentFailedEvent = {
        id: 'evt_payment_crisis_failure',
        type: 'invoice.payment_failed',
        created: Date.now() / 1000,
        livemode: true,
        data: {
          object: {
            id: 'in_crisis_payment_fail',
            customer: 'cus_crisis_user',
            subscription: 'sub_crisis_sub',
            amount_paid: 0,
            amount_due: 2999,
            status: 'open',
            attempt_count: 3,
            period_start: Date.now() / 1000,
            period_end: (Date.now() + 86400000) / 1000
          }
        },
        crisisSafety: {
          crisisMode: true,
          emergencyBypass: true,
          therapeuticContinuity: true,
          gracePeriodActive: false,
          responseTimeConstraint: 100, // Emergency access constraint
          priority: 'emergency'
        },
        performance: {
          processingStartTime: Date.now(),
          maxProcessingTime: 100,
          retryAttempt: 0,
          maxRetries: 5
        }
      };

      const emergencyStartTime = performance.now();

      // Mock rapid emergency access activation
      mockPaymentStore.preserveCrisisAccess.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 20)); // Ultra-fast emergency access
        return { emergencyAccess: true, responseTime: 20 };
      });

      mockCrisisStore.preserveEmergencyFeatures.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 15)); // Ultra-fast feature preservation
        return { featuresPreserved: true, responseTime: 15 };
      });

      // Process payment failure with emergency protocols
      const syncEventId = result.current.queueSyncEvent(
        'payment_status_update',
        paymentFailureEvent.data,
        ['payment', 'crisis'],
        'immediate'
      );

      await act(async () => {
        await result.current.processEventQueue();
      });

      const emergencyResponseTime = performance.now() - emergencyStartTime;

      // Validate emergency access time
      expect(emergencyResponseTime).toBeLessThan(100);

      // Validate emergency preservation
      expect(mockPaymentStore.preserveCrisisAccess).toHaveBeenCalled();
      expect(mockCrisisStore.preserveEmergencyFeatures).toHaveBeenCalled();
    });

    it('should track and validate crisis response timing accuracy', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('crisis', mockCrisisStore, { syncPriority: 'immediate' });
      });

      // Create multiple crisis events for timing validation
      const crisisEvents = [
        { level: 'medium', expectedTime: 150 },
        { level: 'high', expectedTime: 100 },
        { level: 'critical', expectedTime: 50 },
        { level: 'emergency', expectedTime: 25 }
      ];

      const responseTimes: number[] = [];

      mockCrisisStore.trackCrisisMetrics.mockImplementation((level, responseTime) => {
        responseTimes.push(responseTime);
      });

      for (const { level, expectedTime } of crisisEvents) {
        const startTime = performance.now();

        const eventId = result.current.queueSyncEvent(
          'crisis_level_change',
          { crisisLevel: level, timestamp: Date.now() },
          ['crisis'],
          'immediate'
        );

        await act(async () => {
          await result.current.processEventQueue();
        });

        const responseTime = performance.now() - startTime;

        // Track individual response time
        act(() => {
          result.current.trackSyncPerformance(eventId, startTime, performance.now(), true);
        });

        // Validate response time meets crisis level requirements
        expect(responseTime).toBeLessThan(expectedTime);
      }

      // Validate all crisis timings were tracked
      expect(mockCrisisStore.trackCrisisMetrics).toHaveBeenCalledTimes(4);

      // Validate crisis sync metrics
      const crisisSyncTime = result.current.syncPerformanceMetrics.crisisSyncTime;
      expect(crisisSyncTime).toBeLessThan(CRISIS_RESPONSE_TIME_MS);
    });
  });

  describe('Payment Crisis Integration', () => {
    it('should activate crisis intervention during payment failures', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockPaymentStore, { syncPriority: 'high' });
        result.current.connectStore('crisis', mockCrisisStore, { syncPriority: 'immediate' });
      });

      // Create payment failure that triggers crisis assessment
      const paymentCrisisEvent: PaymentFailedEvent = {
        id: 'evt_payment_triggers_crisis',
        type: 'invoice.payment_failed',
        created: Date.now() / 1000,
        livemode: true,
        data: {
          object: {
            id: 'in_payment_crisis',
            customer: 'cus_vulnerable_user',
            subscription: 'sub_therapy_access',
            amount_paid: 0,
            amount_due: 2999,
            status: 'open',
            attempt_count: 3, // Multiple failed attempts indicate potential crisis
            period_start: Date.now() / 1000,
            period_end: (Date.now() + 86400000) / 1000
          }
        },
        crisisSafety: {
          crisisMode: false, // Will be activated during processing
          emergencyBypass: false,
          therapeuticContinuity: true,
          gracePeriodActive: false,
          responseTimeConstraint: CRISIS_RESPONSE_TIME_MS,
          priority: 'high'
        },
        performance: {
          processingStartTime: Date.now(),
          maxProcessingTime: CRISIS_RESPONSE_TIME_MS,
          retryAttempt: 0,
          maxRetries: 3
        }
      };

      // Mock crisis assessment based on payment failure
      mockCrisisStateManager.assessCrisisLevel.mockImplementation(async (paymentData) => {
        if (paymentData.object.attempt_count >= 3) {
          return {
            crisisLevel: 'medium',
            protectionRequired: true,
            gracePeriodNeeded: true,
            emergencyAccess: true
          };
        }
        return { crisisLevel: 'none' };
      });

      mockPaymentStore.handlePaymentFailedWebhook.mockImplementation(async (event) => {
        // Trigger crisis assessment during payment processing
        const assessment = await mockCrisisStateManager.assessCrisisLevel(event.data);
        if (assessment.protectionRequired) {
          await mockCrisisStateManager.activateCrisisProtection('medium');
          await mockPaymentStore.initiateCrisisGracePeriod();
        }
        return {
          success: true,
          eventId: event.id,
          crisisOverride: assessment.protectionRequired,
          gracePeriodActive: assessment.gracePeriodNeeded
        };
      });

      // Process payment failure
      const syncEventId = result.current.queueSyncEvent(
        'payment_status_update',
        paymentCrisisEvent.data,
        ['payment', 'crisis'],
        'high'
      );

      await act(async () => {
        await result.current.processEventQueue();
      });

      // Validate crisis assessment was triggered
      expect(mockCrisisStateManager.assessCrisisLevel).toHaveBeenCalledWith(
        paymentCrisisEvent.data
      );

      // Validate crisis protection was activated
      expect(mockCrisisStateManager.activateCrisisProtection).toHaveBeenCalledWith('medium');

      // Validate grace period was initiated
      expect(mockPaymentStore.initiateCrisisGracePeriod).toHaveBeenCalled();
    });

    it('should integrate 988 hotline during payment crises', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('crisis', mockCrisisStore, { syncPriority: 'immediate' });
        result.current.connectStore('payment', mockPaymentStore, { syncPriority: 'high' });
      });

      // Create payment crisis requiring hotline integration
      const paymentCrisisData = {
        paymentFailure: true,
        crisisIndicators: ['multiple_failures', 'therapeutic_dependency', 'financial_stress'],
        userProfile: { vulnerabilityLevel: 'high', activeTherapy: true }
      };

      // Mock 988 integration activation
      mockCrisisStateManager.integrate988Hotline.mockImplementation(async () => {
        await mock988Integration.initiate();
        return {
          hotlineActivated: true,
          availability: await mock988Integration.validateAvailability(),
          integrationTime: Date.now()
        };
      });

      const syncEventId = result.current.queueSyncEvent(
        'emergency_access_granted',
        paymentCrisisData,
        ['crisis', 'payment'],
        'immediate'
      );

      await act(async () => {
        await result.current.processEventQueue();
      });

      // Validate 988 hotline integration
      expect(mockCrisisStateManager.integrate988Hotline).toHaveBeenCalled();
      expect(mock988Integration.initiate).toHaveBeenCalled();
      expect(mock988Integration.validateAvailability).toHaveBeenCalled();

      // Validate crisis store hotline activation
      expect(mockCrisisStore.activateHotlineIntegration).toHaveBeenCalled();
    });

    it('should preserve therapeutic access during payment disruptions', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockPaymentStore, { syncPriority: 'high' });
        result.current.connectStore('crisis', mockCrisisStore, { syncPriority: 'immediate' });
      });

      // Create subscription cancellation during active therapy
      const therapeuticDisruptionEvent: SubscriptionUpdatedEvent = {
        id: 'evt_therapeutic_disruption',
        type: 'customer.subscription.updated',
        created: Date.now() / 1000,
        livemode: true,
        data: {
          object: {
            id: 'sub_active_therapy',
            customer: 'cus_therapy_user',
            status: 'canceled',
            current_period_start: Date.now() / 1000,
            current_period_end: (Date.now() + 86400000) / 1000,
            cancel_at_period_end: true,
            items: { data: [] },
            metadata: {
              activeTherapy: 'true',
              sessionInProgress: 'true',
              therapeuticDependency: 'high'
            }
          }
        },
        crisisSafety: {
          crisisMode: false,
          emergencyBypass: false,
          therapeuticContinuity: true, // Must preserve continuity
          gracePeriodActive: false,
          responseTimeConstraint: CRISIS_RESPONSE_TIME_MS,
          priority: 'high'
        },
        performance: {
          processingStartTime: Date.now(),
          maxProcessingTime: CRISIS_RESPONSE_TIME_MS,
          retryAttempt: 0,
          maxRetries: 3
        }
      };

      // Mock therapeutic continuity preservation
      mockPaymentStore.maintainTherapeuticFeatures.mockImplementation(async () => {
        return {
          therapeuticAccess: true,
          preservedFeatures: ['crisis_button', 'breathing_exercises', 'mood_tracking'],
          gracePeriodActivated: true,
          continuityGuaranteed: true
        };
      });

      mockCrisisStateManager.preserveTherapeuticContinuity.mockImplementation(async () => {
        return {
          continuityMaintained: true,
          emergencyFeatures: ['crisis_button', 'hotline_988'],
          sessionProtection: true
        };
      });

      // Process therapeutic disruption
      const syncEventId = result.current.queueSyncEvent(
        'therapeutic_continuity_update',
        therapeuticDisruptionEvent.data,
        ['payment', 'crisis'],
        'immediate'
      );

      await act(async () => {
        await result.current.preserveTherapeuticSyncContinuity();
        await result.current.processEventQueue();
      });

      // Validate therapeutic continuity preservation
      expect(mockPaymentStore.maintainTherapeuticFeatures).toHaveBeenCalled();
      expect(mockCrisisStateManager.preserveTherapeuticContinuity).toHaveBeenCalled();

      // Validate continuity state
      expect(result.current.crisisSyncState.therapeuticContinuityProtected).toBe(true);
    });
  });

  describe('Emergency Bypass Protocols', () => {
    it('should activate emergency bypass during system failures', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockPaymentStore, { syncPriority: 'immediate' });
        result.current.connectStore('crisis', mockCrisisStore, { syncPriority: 'immediate' });
      });

      // Simulate system failure scenario
      const systemFailureEvent = {
        systemFailure: true,
        affectedServices: ['payment_processing', 'subscription_validation'],
        crisisUser: true,
        emergencyBypassRequired: true
      };

      // Mock system failure with bypass requirement
      mockPaymentStore.handleSubscriptionUpdatedWebhook.mockRejectedValue(
        new Error('Payment system temporarily unavailable')
      );

      mockCrisisStateManager.enableEmergencyBypass.mockImplementation(async () => {
        return {
          bypassActivated: true,
          emergencyFeatures: ['crisis_button', 'hotline_988', 'emergency_chat'],
          bypassDuration: 86400000, // 24 hours
          fallbackProtocols: ['offline_mode', 'local_storage', 'emergency_contacts']
        };
      });

      const syncEventId = result.current.queueSyncEvent(
        'emergency_access_granted',
        systemFailureEvent,
        ['payment', 'crisis'],
        'immediate'
      );

      await act(async () => {
        await result.current.processEventQueue();
      });

      // Validate emergency bypass activation
      expect(mockCrisisStateManager.enableEmergencyBypass).toHaveBeenCalled();

      // Validate bypass state
      expect(result.current.crisisSyncState.emergencyBypassActive).toBe(true);

      // Validate emergency protocols
      expect(mockCrisisStore.preserveEmergencyFeatures).toHaveBeenCalled();
    });

    it('should maintain crisis button accessibility during all failure scenarios', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('crisis', mockCrisisStore, { syncPriority: 'immediate' });
      });

      // Test multiple failure scenarios
      const failureScenarios = [
        { type: 'network_failure', description: 'Network connectivity lost' },
        { type: 'payment_system_down', description: 'Payment processing unavailable' },
        { type: 'webhook_processing_error', description: 'Webhook system failure' },
        { type: 'database_connectivity', description: 'Database connection issues' }
      ];

      for (const scenario of failureScenarios) {
        // Mock crisis button preservation for each scenario
        mockCrisisStore.enableCrisisButton.mockImplementation(async () => {
          return {
            crisisButtonActive: true,
            accessibleDuringFailure: true,
            responseTime: 50, // Always fast
            bypassedSystems: [scenario.type]
          };
        });

        const eventId = result.current.queueSyncEvent(
          'crisis_level_change',
          {
            scenario: scenario.type,
            crisisButtonRequired: true,
            emergencyAccess: true
          },
          ['crisis'],
          'immediate'
        );

        await act(async () => {
          await result.current.processEventQueue();
        });

        // Validate crisis button remains accessible
        expect(mockCrisisStore.enableCrisisButton).toHaveBeenCalled();
      }

      // Validate all scenarios were handled
      expect(mockCrisisStore.enableCrisisButton).toHaveBeenCalledTimes(4);
    });

    it('should provide graceful degradation with emergency features', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockPaymentStore, { syncPriority: 'high' });
        result.current.connectStore('crisis', mockCrisisStore, { syncPriority: 'immediate' });
      });

      // Create degraded system state
      const degradedSystemEvent = {
        systemHealth: 'degraded',
        availableServices: ['crisis_support', 'emergency_contacts'],
        unavailableServices: ['payment_processing', 'subscription_management'],
        fallbackMode: true
      };

      // Mock graceful degradation
      mockCrisisStateManager.triggerEmergencyProtocols.mockImplementation(async () => {
        return {
          emergencyMode: true,
          availableFeatures: ['crisis_button', 'hotline_988', 'offline_support'],
          degradedFeatures: ['payment_features', 'premium_content'],
          fallbackProtocols: ['local_storage', 'offline_mode', 'emergency_contacts']
        };
      });

      const syncEventId = result.current.queueSyncEvent(
        'emergency_access_granted',
        degradedSystemEvent,
        ['payment', 'crisis'],
        'immediate'
      );

      await act(async () => {
        await result.current.processEventQueue();
      });

      // Validate emergency protocols were triggered
      expect(mockCrisisStateManager.triggerEmergencyProtocols).toHaveBeenCalled();

      // Validate system maintained critical functions
      expect(result.current.crisisSyncState.therapeuticContinuityProtected).toBe(true);
      expect(result.current.syncActive).toBe(true); // System remains operational
    });
  });

  describe('Grace Period Crisis Management', () => {
    it('should activate crisis-triggered grace periods with therapeutic messaging', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockPaymentStore, { syncPriority: 'high' });
        result.current.connectStore('crisis', mockCrisisStore, { syncPriority: 'immediate' });
      });

      // Create crisis situation requiring grace period
      const crisisGracePeriodEvent = {
        crisisLevel: 'high',
        paymentIssues: true,
        therapeuticDependency: 'critical',
        gracePeriodRequired: true,
        therapeuticMessaging: {
          anxietyReducing: true,
          supportive: true,
          actionable: false // Don't pressure during crisis
        }
      };

      // Mock grace period activation with therapeutic considerations
      mockPaymentStore.initiateCrisisGracePeriod.mockImplementation(async () => {
        return {
          gracePeriodActive: true,
          duration: 7 * 24 * 60 * 60 * 1000, // 7 days
          therapeuticAccess: true,
          crisisSupport: true,
          messaging: {
            title: 'Your wellbeing is our priority',
            message: 'Take time to breathe. Your access continues safely while you address this mindfully.',
            anxietyReducing: true,
            therapeutic: true
          }
        };
      });

      mockCrisisStateManager.activateGracePeriod.mockImplementation(async () => {
        return {
          gracePeriodActivated: true,
          crisisProtection: true,
          emergencyAccess: true,
          therapeuticContinuity: true
        };
      });

      const syncEventId = result.current.queueSyncEvent(
        'grace_period_activation',
        crisisGracePeriodEvent,
        ['payment', 'crisis'],
        'immediate'
      );

      await act(async () => {
        await result.current.processEventQueue();
      });

      // Validate grace period activation
      expect(mockPaymentStore.initiateCrisisGracePeriod).toHaveBeenCalled();
      expect(mockCrisisStateManager.activateGracePeriod).toHaveBeenCalled();

      // Validate therapeutic messaging
      expect(result.current.realTimeCommunication.anxietyReducingMode).toBe(true);
    });

    it('should handle grace period expiration with crisis safety', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockPaymentStore, { syncPriority: 'high' });
        result.current.connectStore('crisis', mockCrisisStore, { syncPriority: 'immediate' });
      });

      // Simulate grace period nearing expiration
      const gracePeriodExpirationEvent = {
        gracePeriodExpiring: true,
        timeRemaining: 24 * 60 * 60 * 1000, // 24 hours
        userCrisisState: 'stable',
        therapeuticContinuityRequired: true
      };

      // Mock crisis assessment during grace period expiration
      mockCrisisStateManager.assessCrisisLevel.mockImplementation(async () => {
        return {
          crisisLevel: 'low', // Stable user
          extensionRequired: false,
          emergencyAccess: true,
          therapeuticTransition: true
        };
      });

      const syncEventId = result.current.queueSyncEvent(
        'grace_period_activation',
        gracePeriodExpirationEvent,
        ['payment', 'crisis'],
        'high'
      );

      await act(async () => {
        await result.current.processEventQueue();
      });

      // Validate crisis assessment during expiration
      expect(mockCrisisStateManager.assessCrisisLevel).toHaveBeenCalled();

      // Validate therapeutic transition planning
      expect(mockCrisisStateManager.preserveTherapeuticContinuity).toHaveBeenCalled();
    });
  });

  describe('System Resilience and Failsafe Mechanisms', () => {
    it('should maintain crisis safety during complete webhook system failure', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('crisis', mockCrisisStore, { syncPriority: 'immediate' });
        result.current.connectStore('payment', mockPaymentStore, { syncPriority: 'high' });
      });

      // Simulate complete webhook system failure
      const systemFailureEvent = {
        totalSystemFailure: true,
        webhookProcessingDown: true,
        crisisUserActive: true,
        emergencyProtocolsRequired: true
      };

      // Mock total system failure
      mockCrisisStore.syncFromWebhook.mockRejectedValue(
        new Error('Crisis system completely unavailable')
      );
      mockPaymentStore.syncFromWebhook.mockRejectedValue(
        new Error('Payment system completely unavailable')
      );

      // Mock emergency failsafe activation
      mockCrisisStateManager.triggerEmergencyProtocols.mockImplementation(async () => {
        return {
          failsafeActivated: true,
          offlineMode: true,
          localCrisisSupport: true,
          emergencyContacts: true,
          therapeuticContinuity: true
        };
      });

      const syncEventId = result.current.queueSyncEvent(
        'emergency_access_granted',
        systemFailureEvent,
        ['crisis', 'payment'],
        'immediate'
      );

      await act(async () => {
        await result.current.processEventQueue();
      });

      // Even with system failure, validate failsafe protocols
      expect(mockCrisisStateManager.triggerEmergencyProtocols).toHaveBeenCalled();

      // Validate system maintained emergency state
      expect(result.current.crisisSyncState.emergencyBypassActive).toBe(true);
      expect(result.current.crisisSyncState.therapeuticContinuityProtected).toBe(true);

      // Validate offline queue preserved crisis events
      expect(result.current.offlineSyncQueue.length).toBeGreaterThan(0);
    });

    it('should provide seamless recovery after crisis resolution', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('crisis', mockCrisisStore, { syncPriority: 'immediate' });
        result.current.connectStore('payment', mockPaymentStore, { syncPriority: 'high' });
      });

      // Start in crisis mode
      await act(async () => {
        await result.current.activateCrisisSync('critical');
      });

      expect(result.current.crisisSyncState.crisisMode).toBe(true);

      // Create crisis resolution event
      const crisisResolutionEvent = {
        crisisResolved: true,
        newCrisisLevel: 'none',
        systemRecovery: true,
        gradualTransition: true
      };

      // Mock crisis resolution
      mockCrisisStateManager.deactivateCrisisProtection.mockImplementation(async () => {
        return {
          crisisDeactivated: true,
          gradualTransition: true,
          therapeuticSupport: true,
          monitoringContinued: true
        };
      });

      const syncEventId = result.current.queueSyncEvent(
        'crisis_level_change',
        crisisResolutionEvent,
        ['crisis', 'payment'],
        'high'
      );

      await act(async () => {
        await result.current.processEventQueue();
      });

      // Deactivate crisis mode
      await act(async () => {
        await result.current.deactivateCrisisSync();
      });

      // Validate smooth crisis resolution
      expect(mockCrisisStateManager.deactivateCrisisProtection).toHaveBeenCalled();
      expect(result.current.crisisSyncState.crisisMode).toBe(false);
      expect(result.current.crisisSyncState.crisisLevel).toBe('none');

      // Validate system returned to normal operation
      expect(result.current.syncInterval).toBe(1000); // Back to normal interval
      expect(result.current.crisisSyncState.therapeuticContinuityProtected).toBe(true); // Still protected
    });

    it('should validate end-to-end crisis scenario with performance tracking', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('crisis', mockCrisisStore, { syncPriority: 'immediate' });
        result.current.connectStore('payment', mockPaymentStore, { syncPriority: 'high' });
      });

      // Complete crisis scenario: payment failure → crisis detection → intervention → resolution
      const crisisScenario = {
        phase1: { type: 'payment_failure', data: { attemptCount: 3, crisisRisk: true } },
        phase2: { type: 'crisis_detection', data: { level: 'high', interventionRequired: true } },
        phase3: { type: 'crisis_intervention', data: { gracePeriod: true, hotline: true } },
        phase4: { type: 'crisis_resolution', data: { resolved: true, followUp: true } }
      };

      const scenarioMetrics: Array<{ phase: string; responseTime: number; success: boolean }> = [];

      // Process complete crisis scenario
      for (const [phase, config] of Object.entries(crisisScenario)) {
        const startTime = performance.now();

        const eventId = result.current.queueSyncEvent(
          config.type as any,
          config.data,
          ['crisis', 'payment'],
          'immediate'
        );

        await act(async () => {
          await result.current.processEventQueue();
        });

        const responseTime = performance.now() - startTime;
        const success = result.current.completedEvents.has(eventId);

        scenarioMetrics.push({ phase, responseTime, success });

        // Validate each phase meets crisis response requirements
        expect(responseTime).toBeLessThan(CRISIS_RESPONSE_TIME_MS);
        expect(success).toBe(true);
      }

      // Validate complete scenario performance
      const totalScenarioTime = scenarioMetrics.reduce((total, metric) => total + metric.responseTime, 0);
      const allPhasesSuccessful = scenarioMetrics.every(metric => metric.success);

      expect(totalScenarioTime).toBeLessThan(CRISIS_RESPONSE_TIME_MS * 4); // Reasonable total time
      expect(allPhasesSuccessful).toBe(true);

      // Validate crisis tracking
      expect(mockCrisisStore.trackCrisisMetrics).toHaveBeenCalled();
    });
  });
});