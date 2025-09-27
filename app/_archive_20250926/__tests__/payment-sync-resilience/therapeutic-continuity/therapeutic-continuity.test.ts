/**
 * Payment Sync Resilience Therapeutic Continuity Testing
 *
 * Comprehensive testing to ensure therapeutic continuity during payment sync issues:
 * - Crisis access preservation during payment failures
 * - PHQ-9/GAD-7 assessment availability during sync issues
 * - Emergency contact access during payment outages
 * - 988 hotline integration resilience
 *
 * Therapeutic Continuity Requirements:
 * - Crisis intervention must never be blocked by payment issues
 * - Assessment tools available even during payment service outages
 * - Emergency contacts accessible within 3 seconds during failures
 * - Therapeutic progress preserved during all sync failure modes
 * - Mental health safety takes absolute priority over payment concerns
 */

import { jest } from '@jest/globals';
import { PaymentSyncResilienceAPI, DegradationLevel } from '../../../src/services/cloud/PaymentSyncResilienceAPI';
import { PaymentAwareSyncRequest, SyncPriorityLevel } from '../../../src/services/cloud/PaymentAwareSyncAPI';
import { EncryptionService } from '../../../src/services/security/EncryptionService';

// Mock dependencies
jest.mock('../../../src/services/security/EncryptionService');
jest.mock('expo-secure-store');

// Therapeutic continuity test utilities
class TherapeuticContinuityValidator {
  static validateCrisisAccess(result: any): boolean {
    return result.success &&
           result.result?.crisisResources &&
           result.result.crisisResources.hotlineNumber === '988';
  }

  static validateAssessmentAvailability(result: any): boolean {
    return result.success &&
           result.result?.assessmentAccess !== false;
  }

  static validateEmergencyContactAccess(result: any, responseTime: number): boolean {
    return result.success &&
           responseTime < 3000 && // 3 second requirement
           result.result?.emergencyContactAccess === true;
  }

  static validateTherapeuticProgress(result: any): boolean {
    return result.result?.therapeuticContinuity === true ||
           result.result?.localStorageUsed === true; // Progress preserved locally
  }

  static validateMentalHealthPriority(result: any): boolean {
    // Mental health operations should succeed even when payment fails
    return result.crisisOverrideUsed ||
           result.result?.mentalHealthPriority === true ||
           result.fallbackTriggered;
  }
}

describe('Payment Sync Resilience Therapeutic Continuity', () => {
  let resilienceAPI: PaymentSyncResilienceAPI;
  let mockEncryption: jest.Mocked<EncryptionService>;
  let mockSyncOperation: jest.MockedFunction<any>;
  let therapeuticLogs: any[] = [];

  beforeEach(async () => {
    jest.clearAllMocks();
    therapeuticLogs = [];

    // Capture therapeutic operation logs
    jest.spyOn(console, 'log').mockImplementation((...args) => {
      therapeuticLogs.push({ level: 'log', args, timestamp: Date.now() });
    });
    jest.spyOn(console, 'warn').mockImplementation((...args) => {
      therapeuticLogs.push({ level: 'warn', args, timestamp: Date.now() });
    });
    jest.spyOn(console, 'error').mockImplementation((...args) => {
      therapeuticLogs.push({ level: 'error', args, timestamp: Date.now() });
    });

    resilienceAPI = PaymentSyncResilienceAPI.getInstance();
    mockEncryption = EncryptionService.getInstance() as jest.Mocked<EncryptionService>;
    mockSyncOperation = jest.fn();

    // Setup encryption mocks
    mockEncryption.encryptData.mockResolvedValue('encrypted_therapeutic_data');
    mockEncryption.decryptData.mockResolvedValue('{"therapeutic": "data"}');

    await resilienceAPI.initialize({
      fallback: {
        enableFallbacks: true,
        fallbackLevels: [DegradationLevel.LIMITED, DegradationLevel.CRITICAL_ONLY],
        crisisAlwaysAvailable: true,
        localStorageFallback: true,
        offlineQueueEnabled: true,
        emergencyContactEnabled: true,
        maxFallbackDurationMs: 3600000
      }
    });
  });

  afterEach(() => {
    resilienceAPI.destroy();
    jest.restoreAllMocks();
  });

  describe('Crisis Access Preservation During Payment Failures', () => {
    it('should maintain crisis access during complete payment service outage', async () => {
      const crisisScenario = {
        emergencyId: 'crisis-payment-outage-001',
        userId: 'user-crisis-001',
        deviceId: 'device-001',
        timestamp: new Date().toISOString(),
        criticalData: {
          phq9Score: 24,
          suicidalIdeation: true,
          previousAttempts: true,
          immediateRisk: true,
          currentMood: 1, // Extremely low
          energyLevel: 1,
          hopelessness: true,
          paymentStatus: 'failed', // Payment issues during crisis
          subscriptionExpired: true
        }
      };

      // Mock complete payment service failure
      const mockCrisisSync = jest.fn().mockRejectedValue(
        new Error('payment_service_complete_outage: All payment infrastructure down')
      );

      const startTime = Date.now();
      const result = await resilienceAPI.handleCrisisEmergency(crisisScenario, mockCrisisSync);
      const responseTime = Date.now() - startTime;

      // Verify crisis access maintained
      expect(TherapeuticContinuityValidator.validateCrisisAccess(result)).toBe(true);
      expect(result.crisisOverrideUsed).toBe(true);
      expect(responseTime).toBeLessThan(200); // Crisis SLA maintained

      // Verify crisis resources immediately available
      expect(result.result?.crisisResources).toMatchObject({
        hotlineNumber: '988',
        emergencyContacts: expect.any(Array),
        localCrisisPlan: true,
        offlineSupport: true
      });

      // Verify payment issues don't impact crisis intervention
      expect(result.result?.emergencyId).toBe(crisisScenario.emergencyId);
      expect(result.result?.status).toBe('fallback_activated');

      console.log(`Crisis access preserved during payment outage in ${responseTime}ms`);
    });

    it('should prioritize crisis over subscription status', async () => {
      const expiredSubscriptionCrisis = {
        emergencyId: 'crisis-expired-sub-001',
        userId: 'user-expired-001',
        deviceId: 'device-001',
        timestamp: new Date().toISOString(),
        criticalData: {
          phq9Score: 22,
          suicidalIdeation: true,
          subscriptionStatus: 'expired',
          paymentFailed: true,
          gracePeriodExpired: true,
          lastPaymentAttempt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago
        }
      };

      // Mock payment validation that would normally block access
      const mockCrisisSync = jest.fn().mockRejectedValue(
        new Error('subscription_expired: Access denied due to payment failure')
      );

      const result = await resilienceAPI.handleCrisisEmergency(expiredSubscriptionCrisis, mockCrisisSync);

      // Verify crisis override bypassed subscription check
      expect(result.success).toBe(true);
      expect(result.crisisOverrideUsed).toBe(true);
      expect(TherapeuticContinuityValidator.validateMentalHealthPriority(result)).toBe(true);

      // Verify therapeutic continuity maintained
      expect(result.result?.crisisResources).toMatchObject({
        hotlineNumber: '988',
        localCrisisPlan: true,
        offlineSupport: true
      });

      // Verify subscription issues documented but didn't block crisis care
      expect(result.result?.localStorageUsed).toBe(true);
    });

    it('should handle crisis during payment processing failures', async () => {
      const paymentProcessingCrisis = {
        emergencyId: 'crisis-payment-processing-001',
        userId: 'user-processing-001',
        deviceId: 'device-001',
        timestamp: new Date().toISOString(),
        criticalData: {
          phq9Score: 25,
          suicidalIdeation: true,
          activeCrisis: true,
          paymentInProgress: true,
          paymentProcessingError: 'card_declined',
          needsImmediateHelp: true
        }
      };

      // Mock payment processing failure during crisis
      const mockCrisisSync = jest.fn().mockImplementation(async () => {
        // Simulate payment processing delay then failure
        await new Promise(resolve => setTimeout(resolve, 500));
        throw new Error('payment_processing_failed: Card declined during crisis intervention');
      });

      const startTime = Date.now();
      const result = await resilienceAPI.handleCrisisEmergency(paymentProcessingCrisis, mockCrisisSync);
      const responseTime = Date.now() - startTime;

      // Verify crisis intervention wasn't delayed by payment processing
      expect(responseTime).toBeLessThan(200); // Crisis SLA maintained despite payment delays
      expect(result.success).toBe(true);
      expect(result.crisisOverrideUsed).toBe(true);

      // Verify immediate crisis resources provided
      expect(result.result?.crisisResources).toMatchObject({
        hotlineNumber: '988',
        localCrisisPlan: true,
        offlineSupport: true
      });

      // Verify payment processing failure didn't affect crisis care
      expect(result.result?.emergencyId).toBe(paymentProcessingCrisis.emergencyId);
    });
  });

  describe('PHQ-9/GAD-7 Assessment Availability During Sync Issues', () => {
    it('should maintain assessment access during payment sync failures', async () => {
      const assessmentRequest: PaymentAwareSyncRequest = {
        operationId: 'assessment-payment-failure-001',
        priority: SyncPriorityLevel.CRITICAL_SAFETY,
        subscriptionContext: {
          tier: 'basic',
          status: 'past_due',
          entitlements: ['assessment_access']
        },
        operation: {
          id: 'assessment-op-001',
          type: 'create',
          entityType: 'assessment_data',
          entityId: 'phq9-gad7-001',
          priority: 'critical',
          data: {
            assessmentType: 'phq9',
            phq9Responses: [2, 2, 3, 2, 1, 2, 3, 2, 1], // Score: 18
            phq9Score: 18,
            assessmentDate: new Date().toISOString(),
            clinicalSignificance: true,
            paymentSyncRequired: true
          },
          metadata: {
            entityId: 'phq9-gad7-001',
            entityType: 'assessment_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: 'assessment-payment-failure',
            deviceId: 'device-001',
            userId: 'user-001'
          },
          conflictResolution: 'preserve_assessment',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
          clinicalSafety: true
        },
        crisisMode: false,
        requestId: 'req-assessment-001'
      };

      // Mock payment sync failure
      mockSyncOperation.mockRejectedValue(
        new Error('payment_sync_failure: Unable to sync assessment due to payment issues')
      );

      const result = await resilienceAPI.executeResilientSync(assessmentRequest, mockSyncOperation);

      // Verify assessment data preserved despite payment failure
      expect(TherapeuticContinuityValidator.validateAssessmentAvailability(result)).toBe(true);
      expect(result.fallbackTriggered).toBe(true);

      // Verify assessment encrypted and stored locally
      expect(mockEncryption.encryptData).toHaveBeenCalledWith(
        expect.stringContaining('phq9Score'),
        assessmentRequest.operationId
      );

      // Verify therapeutic continuity maintained
      expect(TherapeuticContinuityValidator.validateTherapeuticProgress(result)).toBe(true);

      // Verify assessment available for local access
      expect(result.result?.status).toMatch(/stored_locally|fallback_activated/);
    });

    it('should handle GAD-7 assessment during subscription issues', async () => {
      const gad7AssessmentRequest: PaymentAwareSyncRequest = {
        operationId: 'gad7-subscription-issue-001',
        priority: SyncPriorityLevel.HIGH_CLINICAL,
        subscriptionContext: {
          tier: 'premium',
          status: 'payment_failed',
          entitlements: []
        },
        operation: {
          id: 'gad7-op-001',
          type: 'create',
          entityType: 'assessment_data',
          entityId: 'gad7-001',
          priority: 'high',
          data: {
            assessmentType: 'gad7',
            gad7Responses: [3, 3, 2, 3, 2, 1, 3], // Score: 17
            gad7Score: 17,
            anxietyLevel: 'severe',
            assessmentDate: new Date().toISOString(),
            clinicalSignificance: true,
            requiresFollowUp: true
          },
          metadata: {
            entityId: 'gad7-001',
            entityType: 'assessment_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: 'gad7-subscription-issue',
            deviceId: 'device-001',
            userId: 'user-001'
          },
          conflictResolution: 'clinical_priority',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
          clinicalSafety: true
        },
        crisisMode: false,
        requestId: 'req-gad7-001'
      };

      // Mock subscription service failure
      mockSyncOperation.mockRejectedValue(
        new Error('subscription_service_unavailable: Cannot validate entitlements')
      );

      const result = await resilienceAPI.executeResilientSync(gad7AssessmentRequest, mockSyncOperation);

      // Verify GAD-7 assessment preserved
      expect(result.fallbackTriggered).toBe(true);
      expect(TherapeuticContinuityValidator.validateAssessmentAvailability(result)).toBe(true);

      // Verify clinical significance preserved
      expect(result.result?.status).toMatch(/stored_locally|fallback_activated/);

      // Verify therapeutic data encrypted
      expect(mockEncryption.encryptData).toHaveBeenCalled();
    });

    it('should maintain assessment history during payment outages', async () => {
      const assessmentHistoryRequests = [
        {
          operationId: 'assessment-history-1',
          assessmentType: 'phq9',
          score: 16,
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 1 week ago
        },
        {
          operationId: 'assessment-history-2',
          assessmentType: 'gad7',
          score: 14,
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
        },
        {
          operationId: 'assessment-history-3',
          assessmentType: 'phq9',
          score: 18,
          date: new Date() // Current
        }
      ];

      const requests = assessmentHistoryRequests.map(assessment => ({
        operationId: assessment.operationId,
        priority: SyncPriorityLevel.HIGH_CLINICAL,
        subscriptionContext: {
          tier: 'premium' as const,
          status: 'payment_processing' as const,
          entitlements: ['assessment_history']
        },
        operation: {
          id: assessment.operationId,
          type: 'update' as const,
          entityType: 'assessment_history' as const,
          entityId: 'user-assessment-history-001',
          priority: 'high' as const,
          data: {
            assessmentType: assessment.assessmentType,
            score: assessment.score,
            assessmentDate: assessment.date.toISOString(),
            historicalData: true,
            therapeuticTrend: assessment.score > 15 ? 'concerning' : 'stable'
          },
          metadata: {
            entityId: 'user-assessment-history-001',
            entityType: 'assessment_history',
            version: 1,
            lastModified: assessment.date.toISOString(),
            checksum: assessment.operationId,
            deviceId: 'device-001',
            userId: 'user-001'
          },
          conflictResolution: 'preserve_history' as const,
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
          clinicalSafety: true
        },
        crisisMode: false,
        requestId: `req-${assessment.operationId}`
      }));

      // Mock payment processing outage
      mockSyncOperation.mockRejectedValue(
        new Error('payment_processing_outage: Payment gateway timeout')
      );

      // Execute all assessment history syncs
      const results = await Promise.all(
        requests.map(request => resilienceAPI.executeResilientSync(request, mockSyncOperation))
      );

      // Verify all assessment history preserved
      expect(results.every(r => r.fallbackTriggered)).toBe(true);
      expect(results.every(r => TherapeuticContinuityValidator.validateAssessmentAvailability(r))).toBe(true);

      // Verify therapeutic trends preserved
      results.forEach(result => {
        expect(TherapeuticContinuityValidator.validateTherapeuticProgress(result)).toBe(true);
      });

      // Verify encryption used for all historical data
      expect(mockEncryption.encryptData).toHaveBeenCalledTimes(3);

      console.log(`Assessment history preserved: ${results.length} assessments during payment outage`);
    });
  });

  describe('Emergency Contact Access During Payment Outages', () => {
    it('should provide emergency contact access within 3 seconds during payment failure', async () => {
      const emergencyContactRequest: PaymentAwareSyncRequest = {
        operationId: 'emergency-contact-001',
        priority: SyncPriorityLevel.CRISIS_EMERGENCY,
        subscriptionContext: {
          tier: 'basic',
          status: 'suspended',
          entitlements: []
        },
        operation: {
          id: 'emergency-contact-op-001',
          type: 'read',
          entityType: 'emergency_contacts',
          entityId: 'user-emergency-contacts-001',
          priority: 'crisis',
          data: {
            requestType: 'emergency_access',
            contactTypes: ['crisis_hotline', 'emergency_contact', 'healthcare_provider'],
            urgencyLevel: 'immediate'
          },
          metadata: {
            entityId: 'user-emergency-contacts-001',
            entityType: 'emergency_contacts',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: 'emergency-contact',
            deviceId: 'device-001',
            userId: 'user-001'
          },
          conflictResolution: 'emergency_priority',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 1, // Single attempt for emergency
          clinicalSafety: true
        },
        crisisMode: true,
        requestId: 'req-emergency-contact-001'
      };

      // Mock payment service blocking access
      mockSyncOperation.mockRejectedValue(
        new Error('payment_service_block: Access denied due to suspended subscription')
      );

      const startTime = Date.now();
      const result = await resilienceAPI.executeResilientSync(emergencyContactRequest, mockSyncOperation);
      const responseTime = Date.now() - startTime;

      // Verify emergency contact access within SLA
      expect(TherapeuticContinuityValidator.validateEmergencyContactAccess(result, responseTime)).toBe(true);
      expect(result.crisisOverrideUsed).toBe(true);

      // Verify emergency contacts provided via fallback
      expect(result.result?.status).toMatch(/stored_locally|fallback_activated/);

      console.log(`Emergency contact access provided in ${responseTime}ms during payment block`);
    });

    it('should maintain 988 hotline access during all payment failures', async () => {
      const hotlineAccessScenarios = [
        'payment_gateway_down',
        'subscription_expired',
        'credit_card_declined',
        'billing_service_unavailable',
        'payment_processing_timeout'
      ];

      for (const scenario of hotlineAccessScenarios) {
        const hotlineRequest = {
          emergencyId: `hotline-${scenario}-001`,
          userId: 'user-hotline-test',
          deviceId: 'device-001',
          timestamp: new Date().toISOString(),
          criticalData: {
            phq9Score: 20,
            suicidalIdeation: true,
            needsHotline: true,
            paymentFailureType: scenario
          }
        };

        // Mock specific payment failure scenario
        const mockHotlineSync = jest.fn().mockRejectedValue(
          new Error(`${scenario}: Payment system unavailable`)
        );

        const startTime = Date.now();
        const result = await resilienceAPI.handleCrisisEmergency(hotlineRequest, mockHotlineSync);
        const responseTime = Date.now() - startTime;

        // Verify 988 hotline always accessible
        expect(result.success).toBe(true);
        expect(result.result?.crisisResources?.hotlineNumber).toBe('988');
        expect(responseTime).toBeLessThan(200);

        // Verify payment failure didn't affect hotline access
        expect(result.crisisOverrideUsed).toBe(true);
      }

      console.log(`988 hotline access verified across ${hotlineAccessScenarios.length} payment failure scenarios`);
    });

    it('should handle emergency contact sync during multi-device payment conflicts', async () => {
      const multiDeviceEmergencyRequests = [
        {
          operationId: 'emergency-device-1',
          deviceId: 'device-mobile',
          priority: SyncPriorityLevel.CRISIS_EMERGENCY
        },
        {
          operationId: 'emergency-device-2',
          deviceId: 'device-tablet',
          priority: SyncPriorityLevel.CRISIS_EMERGENCY
        },
        {
          operationId: 'emergency-device-3',
          deviceId: 'device-web',
          priority: SyncPriorityLevel.CRISIS_EMERGENCY
        }
      ];

      const requests = multiDeviceEmergencyRequests.map(device => ({
        operationId: device.operationId,
        priority: device.priority,
        subscriptionContext: {
          tier: 'premium' as const,
          status: 'payment_conflict' as const,
          entitlements: ['emergency_multi_device']
        },
        operation: {
          id: device.operationId,
          type: 'read' as const,
          entityType: 'emergency_contacts' as const,
          entityId: 'shared-emergency-contacts-001',
          priority: 'crisis' as const,
          data: {
            deviceId: device.deviceId,
            emergencyAccess: true,
            multiDeviceConflict: true
          },
          metadata: {
            entityId: 'shared-emergency-contacts-001',
            entityType: 'emergency_contacts',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: device.operationId,
            deviceId: device.deviceId,
            userId: 'user-multi-device'
          },
          conflictResolution: 'emergency_all_devices' as const,
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 1,
          clinicalSafety: true
        },
        crisisMode: true,
        requestId: `req-${device.operationId}`
      }));

      // Mock payment conflict affecting emergency sync
      mockSyncOperation.mockRejectedValue(
        new Error('payment_multi_device_conflict: Subscription conflict across devices')
      );

      const startTime = Date.now();
      const results = await Promise.all(
        requests.map(request => resilienceAPI.executeResilientSync(request, mockSyncOperation))
      );
      const totalTime = Date.now() - startTime;

      // Verify all devices got emergency access
      expect(results.every(r => r.success)).toBe(true);
      expect(results.every(r => r.crisisOverrideUsed)).toBe(true);

      // Verify emergency access time SLA met for all devices
      results.forEach((result, index) => {
        expect(TherapeuticContinuityValidator.validateEmergencyContactAccess(result, totalTime / results.length)).toBe(true);
      });

      console.log(`Multi-device emergency access: ${results.length} devices in ${totalTime}ms`);
    });
  });

  describe('988 Hotline Integration Resilience', () => {
    it('should maintain 988 hotline integration during payment infrastructure failure', async () => {
      const hotlineIntegrationRequest = {
        emergencyId: 'hotline-integration-001',
        userId: 'user-hotline-integration',
        deviceId: 'device-001',
        timestamp: new Date().toISOString(),
        criticalData: {
          phq9Score: 26,
          suicidalIdeation: true,
          immediateRisk: true,
          previousAttempts: true,
          currentCrisisLevel: 'severe',
          hotlineCallRequested: true,
          paymentInfrastructureDown: true
        }
      };

      // Mock complete payment infrastructure failure
      const mockHotlineSync = jest.fn().mockRejectedValue(
        new Error('payment_infrastructure_failure: Complete payment system down')
      );

      const startTime = Date.now();
      const result = await resilienceAPI.handleCrisisEmergency(hotlineIntegrationRequest, mockHotlineSync);
      const responseTime = Date.now() - startTime;

      // Verify 988 hotline integration maintained
      expect(result.success).toBe(true);
      expect(result.result?.crisisResources?.hotlineNumber).toBe('988');
      expect(responseTime).toBeLessThan(200);

      // Verify hotline integration bypassed payment checks
      expect(result.crisisOverrideUsed).toBe(true);
      expect(result.result?.status).toBe('fallback_activated');

      // Verify crisis support available offline
      expect(result.result?.crisisResources?.offlineSupport).toBe(true);
      expect(result.result?.crisisResources?.localCrisisPlan).toBe(true);
    });

    it('should provide 988 hotline access during degraded payment services', async () => {
      // Set system to degraded mode
      resilienceAPI.setDegradationLevel(DegradationLevel.CRITICAL_ONLY, 'Payment service degradation');

      const degradedHotlineRequest = {
        emergencyId: 'hotline-degraded-001',
        userId: 'user-degraded',
        deviceId: 'device-001',
        timestamp: new Date().toISOString(),
        criticalData: {
          phq9Score: 23,
          suicidalIdeation: true,
          systemDegraded: true,
          hotlineNeeded: true
        }
      };

      // Mock degraded service response
      const mockDegradedHotlineSync = jest.fn().mockRejectedValue(
        new Error('service_degraded: Limited functionality available')
      );

      const result = await resilienceAPI.handleCrisisEmergency(degradedHotlineRequest, mockDegradedHotlineSync);

      // Verify 988 hotline still accessible in degraded mode
      expect(result.success).toBe(true);
      expect(result.result?.crisisResources?.hotlineNumber).toBe('988');

      // Verify crisis override worked in degraded mode
      expect(result.crisisOverrideUsed).toBe(true);

      // Verify degraded mode didn't affect crisis care
      expect(result.result?.emergencyId).toBe(degradedHotlineRequest.emergencyId);
    });
  });

  describe('Therapeutic Progress Preservation', () => {
    it('should preserve therapeutic progress during payment sync failures', async () => {
      const therapeuticProgressRequest: PaymentAwareSyncRequest = {
        operationId: 'therapeutic-progress-001',
        priority: SyncPriorityLevel.HIGH_CLINICAL,
        subscriptionContext: {
          tier: 'premium',
          status: 'payment_retry',
          entitlements: ['therapeutic_tracking']
        },
        operation: {
          id: 'progress-op-001',
          type: 'update',
          entityType: 'therapeutic_progress',
          entityId: 'user-progress-001',
          priority: 'high',
          data: {
            progressTracking: true,
            weeklyProgress: {
              week1: { phq9: 20, gad7: 18, therapy: 'started' },
              week2: { phq9: 18, gad7: 16, therapy: 'progressing' },
              week3: { phq9: 16, gad7: 14, therapy: 'improving' },
              week4: { phq9: 15, gad7: 13, therapy: 'stable' }
            },
            therapeuticGoals: ['reduce_anxiety', 'improve_mood', 'develop_coping'],
            paymentSyncRequired: true
          },
          metadata: {
            entityId: 'user-progress-001',
            entityType: 'therapeutic_progress',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: 'therapeutic-progress',
            deviceId: 'device-001',
            userId: 'user-001'
          },
          conflictResolution: 'preserve_progress',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
          clinicalSafety: true
        },
        crisisMode: false,
        requestId: 'req-progress-001'
      };

      // Mock payment sync failure
      mockSyncOperation.mockRejectedValue(
        new Error('payment_sync_failed: Unable to validate subscription for progress sync')
      );

      const result = await resilienceAPI.executeResilientSync(therapeuticProgressRequest, mockSyncOperation);

      // Verify therapeutic progress preserved
      expect(TherapeuticContinuityValidator.validateTherapeuticProgress(result)).toBe(true);
      expect(result.fallbackTriggered).toBe(true);

      // Verify progress data encrypted and stored locally
      expect(mockEncryption.encryptData).toHaveBeenCalledWith(
        expect.stringContaining('weeklyProgress'),
        therapeuticProgressRequest.operationId
      );

      // Verify therapeutic continuity maintained
      expect(result.result?.status).toMatch(/stored_locally|fallback_activated/);
    });

    it('should maintain therapy session data during payment outages', async () => {
      const therapySessionRequests = [
        {
          operationId: 'therapy-session-1',
          sessionType: 'individual_therapy',
          duration: 50,
          progress: 'significant'
        },
        {
          operationId: 'therapy-session-2',
          sessionType: 'group_therapy',
          duration: 90,
          progress: 'moderate'
        },
        {
          operationId: 'therapy-session-3',
          sessionType: 'emergency_session',
          duration: 30,
          progress: 'crisis_stabilized'
        }
      ];

      const requests = therapySessionRequests.map(session => ({
        operationId: session.operationId,
        priority: session.sessionType === 'emergency_session' ?
                  SyncPriorityLevel.CRISIS_EMERGENCY : SyncPriorityLevel.HIGH_CLINICAL,
        subscriptionContext: {
          tier: 'premium' as const,
          status: 'payment_processing' as const,
          entitlements: ['therapy_sessions']
        },
        operation: {
          id: session.operationId,
          type: 'create' as const,
          entityType: 'therapy_session' as const,
          entityId: session.operationId,
          priority: session.sessionType === 'emergency_session' ? 'crisis' as const : 'high' as const,
          data: {
            sessionType: session.sessionType,
            duration: session.duration,
            progress: session.progress,
            sessionDate: new Date().toISOString(),
            therapeuticOutcome: 'positive',
            paymentDuringSession: true
          },
          metadata: {
            entityId: session.operationId,
            entityType: 'therapy_session',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: session.operationId,
            deviceId: 'device-001',
            userId: 'user-001'
          },
          conflictResolution: 'preserve_session' as const,
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
          clinicalSafety: true
        },
        crisisMode: session.sessionType === 'emergency_session',
        requestId: `req-${session.operationId}`
      }));

      // Mock payment processing outage
      mockSyncOperation.mockRejectedValue(
        new Error('payment_processing_outage: Payment processor unavailable')
      );

      // Execute therapy session syncs
      const results = await Promise.all(
        requests.map(request => resilienceAPI.executeResilientSync(request, mockSyncOperation))
      );

      // Verify all therapy sessions preserved
      expect(results.every(r => r.fallbackTriggered)).toBe(true);
      expect(results.every(r => TherapeuticContinuityValidator.validateTherapeuticProgress(r))).toBe(true);

      // Verify crisis session got special handling
      const crisisSession = results[2];
      expect(crisisSession.crisisOverrideUsed).toBe(true);

      // Verify therapeutic data encrypted
      expect(mockEncryption.encryptData).toHaveBeenCalledTimes(3);

      console.log(`Therapy sessions preserved: ${results.length} sessions during payment outage`);
    });
  });

  describe('Mental Health Safety Priority', () => {
    it('should prioritize mental health over payment concerns in all scenarios', async () => {
      const mentalHealthPriorityScenarios = [
        {
          scenario: 'crisis_during_payment_failure',
          priority: SyncPriorityLevel.CRISIS_EMERGENCY,
          crisisMode: true,
          phq9Score: 25
        },
        {
          scenario: 'assessment_during_subscription_expiry',
          priority: SyncPriorityLevel.HIGH_CLINICAL,
          crisisMode: false,
          phq9Score: 19
        },
        {
          scenario: 'therapy_session_during_payment_decline',
          priority: SyncPriorityLevel.HIGH_CLINICAL,
          crisisMode: false,
          phq9Score: 16
        },
        {
          scenario: 'emergency_contact_during_billing_issue',
          priority: SyncPriorityLevel.CRITICAL_SAFETY,
          crisisMode: false,
          phq9Score: 21
        }
      ];

      for (const scenario of mentalHealthPriorityScenarios) {
        const mentalHealthRequest: PaymentAwareSyncRequest = {
          operationId: `mental-health-${scenario.scenario}`,
          priority: scenario.priority,
          subscriptionContext: {
            tier: 'basic',
            status: 'payment_failed',
            entitlements: []
          },
          operation: {
            id: `mental-health-op-${scenario.scenario}`,
            type: 'create',
            entityType: 'mental_health_data',
            entityId: scenario.scenario,
            priority: scenario.crisisMode ? 'crisis' : 'high',
            data: {
              scenario: scenario.scenario,
              phq9Score: scenario.phq9Score,
              mentalHealthPriority: true,
              paymentIssue: true,
              clinicalSignificance: true
            },
            metadata: {
              entityId: scenario.scenario,
              entityType: 'mental_health_data',
              version: 1,
              lastModified: new Date().toISOString(),
              checksum: scenario.scenario,
              deviceId: 'device-001',
              userId: 'user-001'
            },
            conflictResolution: 'mental_health_priority',
            createdAt: new Date().toISOString(),
            retryCount: 0,
            maxRetries: 3,
            clinicalSafety: true
          },
          crisisMode: scenario.crisisMode,
          requestId: `req-${scenario.scenario}`
        };

        // Mock payment blocking mental health operation
        mockSyncOperation.mockRejectedValue(
          new Error(`payment_blocks_mental_health: ${scenario.scenario} blocked by payment failure`)
        );

        const result = await resilienceAPI.executeResilientSync(mentalHealthRequest, mockSyncOperation);

        // Verify mental health priority overrode payment concerns
        expect(TherapeuticContinuityValidator.validateMentalHealthPriority(result)).toBe(true);
        expect(result.fallbackTriggered).toBe(true);

        if (scenario.crisisMode) {
          expect(result.crisisOverrideUsed).toBe(true);
        }

        // Verify mental health data preserved
        expect(result.result?.status).toMatch(/stored_locally|fallback_activated/);
      }

      console.log(`Mental health priority verified across ${mentalHealthPriorityScenarios.length} payment failure scenarios`);
    });

    it('should ensure therapeutic continuity during complete payment system failure', async () => {
      const completeSystemFailureRequest: PaymentAwareSyncRequest = {
        operationId: 'complete-system-failure-001',
        priority: SyncPriorityLevel.HIGH_CLINICAL,
        subscriptionContext: {
          tier: 'premium',
          status: 'system_failure',
          entitlements: []
        },
        operation: {
          id: 'system-failure-op-001',
          type: 'create',
          entityType: 'therapeutic_continuity',
          entityId: 'continuity-001',
          priority: 'high',
          data: {
            completeSystemFailure: true,
            therapeuticData: {
              phq9Score: 17,
              gad7Score: 15,
              therapyProgress: 'ongoing',
              medicationCompliance: true,
              crisisPlan: 'active'
            },
            continuityRequired: true
          },
          metadata: {
            entityId: 'continuity-001',
            entityType: 'therapeutic_continuity',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: 'complete-system-failure',
            deviceId: 'device-001',
            userId: 'user-001'
          },
          conflictResolution: 'continuity_priority',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
          clinicalSafety: true
        },
        crisisMode: false,
        requestId: 'req-system-failure-001'
      };

      // Mock complete payment system failure
      mockSyncOperation.mockRejectedValue(
        new Error('complete_payment_system_failure: All payment infrastructure down')
      );

      const result = await resilienceAPI.executeResilientSync(completeSystemFailureRequest, mockSyncOperation);

      // Verify therapeutic continuity maintained
      expect(TherapeuticContinuityValidator.validateTherapeuticProgress(result)).toBe(true);
      expect(result.fallbackTriggered).toBe(true);

      // Verify all therapeutic data preserved
      expect(mockEncryption.encryptData).toHaveBeenCalledWith(
        expect.stringContaining('therapeuticData'),
        completeSystemFailureRequest.operationId
      );

      // Verify mental health priority maintained
      expect(TherapeuticContinuityValidator.validateMentalHealthPriority(result)).toBe(true);

      // Verify continuity preserved locally
      expect(result.result?.status).toMatch(/stored_locally|fallback_activated/);
    });
  });
});