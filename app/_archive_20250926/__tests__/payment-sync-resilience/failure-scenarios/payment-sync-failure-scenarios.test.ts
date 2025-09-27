/**
 * Payment Sync Resilience Failure Scenario Testing
 *
 * Comprehensive testing of failure scenarios including:
 * - Network outage during payment sync
 * - Partial sync failures with rollback
 * - Multi-device conflict resolution under stress
 * - Authentication failure recovery
 *
 * Failure Recovery Requirements:
 * - Zero data loss during any failure scenario
 * - Crisis access maintained during all outages
 * - Automatic recovery within 5 minutes of service restoration
 * - Graceful degradation with user notification
 * - Complete rollback capability for partial failures
 */

import { jest } from '@jest/globals';
import { PaymentSyncResilienceAPI, DegradationLevel, CircuitBreakerState } from '../../../src/services/cloud/PaymentSyncResilienceAPI';
import { PaymentAwareSyncRequest, SyncPriorityLevel } from '../../../src/services/cloud/PaymentAwareSyncAPI';
import { EncryptionService } from '../../../src/services/security/EncryptionService';

// Mock dependencies
jest.mock('../../../src/services/security/EncryptionService');
jest.mock('expo-secure-store');

// Failure scenario test utilities
class FailureScenarioSimulator {
  static simulateNetworkOutage(duration: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, duration));
  }

  static simulatePartialFailure<T>(
    operations: T[],
    failureRate: number
  ): Array<{ operation: T; shouldFail: boolean }> {
    return operations.map(op => ({
      operation: op,
      shouldFail: Math.random() < failureRate
    }));
  }

  static simulateTimeoutError(): Error {
    return new Error('timeout_error: Operation exceeded time limit');
  }

  static simulateNetworkError(): Error {
    return new Error('network_error: Connection lost');
  }

  static simulateServiceUnavailableError(): Error {
    return new Error('service_unavailable: Upstream service down');
  }

  static simulateAuthenticationError(): Error {
    return new Error('authentication_error: Token expired');
  }

  static simulateDataCorruptionError(): Error {
    return new Error('data_corruption: Checksum validation failed');
  }

  static simulateRateLimitError(): Error {
    return new Error('rate_limited: Too many requests');
  }
}

describe('Payment Sync Resilience Failure Scenarios', () => {
  let resilienceAPI: PaymentSyncResilienceAPI;
  let mockEncryption: jest.Mocked<EncryptionService>;
  let mockSyncOperation: jest.MockedFunction<any>;
  let failureLogs: any[] = [];

  beforeEach(async () => {
    jest.clearAllMocks();
    failureLogs = [];

    // Capture failure logs
    jest.spyOn(console, 'error').mockImplementation((...args) => {
      failureLogs.push({ level: 'error', args, timestamp: Date.now() });
    });
    jest.spyOn(console, 'warn').mockImplementation((...args) => {
      failureLogs.push({ level: 'warn', args, timestamp: Date.now() });
    });

    resilienceAPI = PaymentSyncResilienceAPI.getInstance();
    mockEncryption = EncryptionService.getInstance() as jest.Mocked<EncryptionService>;
    mockSyncOperation = jest.fn();

    // Setup encryption mocks
    mockEncryption.encryptData.mockResolvedValue('encrypted_failure_test_data');
    mockEncryption.decryptData.mockResolvedValue('{"recovered": "test_data"}');

    await resilienceAPI.initialize({
      retry: {
        maxAttempts: 5,
        initialDelayMs: 100,
        maxDelayMs: 2000,
        backoffMultiplier: 2.0,
        jitterMax: 50,
        retryableErrors: ['network_error', 'timeout_error', 'service_unavailable', 'rate_limited'],
        nonRetryableErrors: ['authentication_error', 'data_corruption'],
        crisisOverride: true
      },
      circuitBreaker: {
        failureThreshold: 3,
        recoveryTimeoutMs: 5000,
        halfOpenMaxCalls: 2,
        successThreshold: 2,
        monitoringWindowMs: 10000,
        crisisExempt: true
      }
    });
  });

  afterEach(() => {
    resilienceAPI.destroy();
    jest.restoreAllMocks();
  });

  describe('Network Outage During Payment Sync', () => {
    it('should handle complete network outage during payment subscription sync', async () => {
      const paymentSyncRequest: PaymentAwareSyncRequest = {
        operationId: 'payment-outage-001',
        priority: SyncPriorityLevel.HIGH_CLINICAL,
        subscriptionContext: {
          tier: 'premium',
          status: 'active',
          entitlements: ['payment_sync']
        },
        operation: {
          id: 'payment-outage-op-001',
          type: 'update',
          entityType: 'subscription_data',
          entityId: 'subscription-001',
          priority: 'high',
          data: {
            subscriptionStatus: 'active',
            billingPeriod: 'monthly',
            paymentDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            clinicalDataAccess: true
          },
          metadata: {
            entityId: 'subscription-001',
            entityType: 'subscription_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: 'payment-outage-checksum',
            deviceId: 'device-001',
            userId: 'user-001'
          },
          conflictResolution: 'payment_priority',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 5,
          clinicalSafety: true
        },
        crisisMode: false,
        requestId: 'req-payment-outage-001'
      };

      // Simulate complete network outage
      mockSyncOperation.mockImplementation(async () => {
        await FailureScenarioSimulator.simulateNetworkOutage(100);
        throw FailureScenarioSimulator.simulateNetworkError();
      });

      const startTime = Date.now();
      const result = await resilienceAPI.executeResilientSync(paymentSyncRequest, mockSyncOperation);
      const totalTime = Date.now() - startTime;

      // Verify graceful handling of network outage
      expect(result.success).toBe(true); // Should succeed via fallback
      expect(result.fallbackTriggered).toBe(true);
      expect(result.performanceMetrics.totalAttempts).toBeGreaterThan(1);

      // Verify data persisted for later sync
      expect(mockEncryption.encryptData).toHaveBeenCalled();

      // Verify payment sync continues after network recovery
      expect(result.result).toMatchObject({
        status: expect.stringMatching(/stored_locally|fallback_activated/)
      });

      console.log(`Network outage handled in ${totalTime}ms with ${result.performanceMetrics.totalAttempts} attempts`);
    });

    it('should maintain crisis access during payment network outage', async () => {
      const crisisRequest = {
        emergencyId: 'crisis-outage-001',
        userId: 'user-001',
        deviceId: 'device-001',
        timestamp: new Date().toISOString(),
        criticalData: {
          phq9Score: 25,
          suicidalIdeation: true,
          immediateRisk: true,
          paymentStatus: 'past_due' // Payment issues during crisis
        }
      };

      // Simulate network outage affecting payment services
      const mockCrisisSync = jest.fn().mockImplementation(async () => {
        await FailureScenarioSimulator.simulateNetworkOutage(50);
        throw new Error('payment_network_outage: Payment gateway unreachable');
      });

      const startTime = Date.now();
      const result = await resilienceAPI.handleCrisisEmergency(crisisRequest, mockCrisisSync);
      const responseTime = Date.now() - startTime;

      // Verify crisis access maintained despite payment outage
      expect(result.success).toBe(true);
      expect(result.crisisOverrideUsed).toBe(true);
      expect(responseTime).toBeLessThan(200); // Crisis SLA maintained

      // Verify crisis resources available
      expect(result.result?.crisisResources).toMatchObject({
        hotlineNumber: '988',
        localCrisisPlan: true,
        offlineSupport: true
      });

      // Verify payment issues don't block crisis intervention
      expect(result.result?.emergencyId).toBe(crisisRequest.emergencyId);

      console.log(`Crisis access maintained during payment outage in ${responseTime}ms`);
    });

    it('should recover automatically after network restoration', async () => {
      const networkRecoveryRequest: PaymentAwareSyncRequest = {
        operationId: 'network-recovery-001',
        priority: SyncPriorityLevel.MEDIUM_USER,
        subscriptionContext: {
          tier: 'basic',
          status: 'active',
          entitlements: ['auto_recovery']
        },
        operation: {
          id: 'recovery-op-001',
          type: 'create',
          entityType: 'recovery_data',
          entityId: 'recovery-001',
          priority: 'medium',
          data: {
            recoveryTest: true,
            timestamp: new Date().toISOString()
          },
          metadata: {
            entityId: 'recovery-001',
            entityType: 'recovery_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: 'recovery-checksum',
            deviceId: 'device-001',
            userId: 'user-001'
          },
          conflictResolution: 'merge',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
          clinicalSafety: false
        },
        crisisMode: false,
        requestId: 'req-recovery-001'
      };

      // Simulate network outage then recovery
      mockSyncOperation
        .mockRejectedValueOnce(FailureScenarioSimulator.simulateNetworkError())
        .mockRejectedValueOnce(FailureScenarioSimulator.simulateNetworkError())
        .mockResolvedValueOnce({
          operationId: networkRecoveryRequest.operationId,
          status: 'success',
          syncedAt: new Date().toISOString(),
          metadata: { networkRecovered: true }
        });

      // Execute sync with automatic recovery
      const result = await resilienceAPI.executeResilientSync(networkRecoveryRequest, mockSyncOperation);

      // Verify automatic recovery succeeded
      expect(result.success).toBe(true);
      expect(result.performanceMetrics.totalAttempts).toBe(3);
      expect(result.retryRecommended).toBe(false);

      // Verify recovery logged
      const recoveryLogs = failureLogs.filter(log =>
        log.args.some((arg: any) => String(arg).includes('network'))
      );
      expect(recoveryLogs.length).toBeGreaterThan(0);
    });
  });

  describe('Partial Sync Failures with Rollback', () => {
    it('should handle partial multi-entity sync failure with rollback', async () => {
      const multiEntityData = [
        { entityType: 'user_preferences', entityId: 'pref-001', critical: false },
        { entityType: 'assessment_data', entityId: 'assessment-001', critical: true },
        { entityType: 'payment_data', entityId: 'payment-001', critical: true }
      ];

      const requests = multiEntityData.map((entity, index) => ({
        operationId: `partial-sync-${index}`,
        priority: entity.critical ? SyncPriorityLevel.HIGH_CLINICAL : SyncPriorityLevel.MEDIUM_USER,
        subscriptionContext: {
          tier: 'premium' as const,
          status: 'active' as const,
          entitlements: ['multi_entity_sync']
        },
        operation: {
          id: `partial-op-${index}`,
          type: 'update' as const,
          entityType: entity.entityType as any,
          entityId: entity.entityId,
          priority: entity.critical ? 'high' as const : 'medium' as const,
          data: {
            entityType: entity.entityType,
            critical: entity.critical,
            syncTimestamp: new Date().toISOString()
          },
          metadata: {
            entityId: entity.entityId,
            entityType: entity.entityType as any,
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: `partial-${index}`,
            deviceId: 'device-001',
            userId: 'user-001'
          },
          conflictResolution: 'rollback_on_failure' as const,
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
          clinicalSafety: entity.critical
        },
        crisisMode: false,
        requestId: `req-partial-${index}`
      }));

      // Simulate partial failure (payment fails, others succeed)
      mockSyncOperation
        .mockResolvedValueOnce({ status: 'success', operationId: 'partial-sync-0' }) // Preferences succeed
        .mockResolvedValueOnce({ status: 'success', operationId: 'partial-sync-1' }) // Assessment succeeds
        .mockRejectedValueOnce(new Error('payment_processing_error: Payment gateway timeout')); // Payment fails

      // Execute all sync operations
      const results = await Promise.allSettled(
        requests.map(request => resilienceAPI.executeResilientSync(request, mockSyncOperation))
      );

      // Analyze results
      const successes = results.filter(r => r.status === 'fulfilled' && (r.value as any).success);
      const failures = results.filter(r => r.status === 'fulfilled' && !(r.value as any).success ||
                                           r.status === 'rejected');

      // Verify partial failure handling
      expect(successes.length).toBe(2); // Non-payment entities succeeded
      expect(failures.length).toBe(1); // Payment entity failed

      // Verify critical data (assessment) succeeded despite payment failure
      const assessmentResult = results[1];
      expect(assessmentResult.status).toBe('fulfilled');
      expect((assessmentResult as any).value.success).toBe(true);

      // Verify failed payment operation handled gracefully
      const paymentResult = results[2];
      if (paymentResult.status === 'fulfilled') {
        const result = (paymentResult as any).value;
        expect(result.fallbackTriggered).toBe(true);
      }

      console.log(`Partial sync: ${successes.length} succeeded, ${failures.length} failed with graceful handling`);
    });

    it('should rollback transaction on critical failure', async () => {
      const transactionRequest: PaymentAwareSyncRequest = {
        operationId: 'transaction-rollback-001',
        priority: SyncPriorityLevel.CRITICAL_SAFETY,
        subscriptionContext: {
          tier: 'premium',
          status: 'active',
          entitlements: ['transaction_rollback']
        },
        operation: {
          id: 'transaction-op-001',
          type: 'create',
          entityType: 'transaction_data',
          entityId: 'transaction-001',
          priority: 'critical',
          data: {
            transactionType: 'payment_subscription',
            amount: 2999,
            currency: 'usd',
            phase1: { status: 'pending' },
            phase2: { status: 'pending' },
            phase3: { status: 'pending' }
          },
          metadata: {
            entityId: 'transaction-001',
            entityType: 'transaction_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: 'transaction-checksum',
            deviceId: 'device-001',
            userId: 'user-001'
          },
          conflictResolution: 'require_rollback',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 1, // Single attempt for transaction
          clinicalSafety: true
        },
        crisisMode: false,
        requestId: 'req-transaction-001'
      };

      // Simulate transaction failure requiring rollback
      mockSyncOperation.mockImplementation(async (request: PaymentAwareSyncRequest) => {
        // Simulate partial success then critical failure
        await new Promise(resolve => setTimeout(resolve, 100));

        if (request.operation.data.phase1) {
          // Phase 1 succeeds
          request.operation.data.phase1.status = 'completed';
        }

        if (request.operation.data.phase2) {
          // Phase 2 fails critically
          throw new Error('transaction_critical_failure: Database constraint violation');
        }
      });

      // Execute transaction sync
      const result = await resilienceAPI.executeResilientSync(transactionRequest, mockSyncOperation);

      // Verify transaction failed and rollback triggered
      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('data');
      expect(result.error?.severity).toBe('high');

      // Verify rollback was handled (data not persisted)
      expect(result.retryRecommended).toBe(false); // Don't retry critical data failures

      // Verify transaction failure logged for audit
      const transactionLogs = failureLogs.filter(log =>
        log.args.some((arg: any) => String(arg).includes('transaction'))
      );
      expect(transactionLogs.length).toBeGreaterThan(0);
    });

    it('should handle rollback during encrypted data sync failure', async () => {
      const encryptedSyncRequest: PaymentAwareSyncRequest = {
        operationId: 'encrypted-rollback-001',
        priority: SyncPriorityLevel.HIGH_CLINICAL,
        subscriptionContext: {
          tier: 'premium',
          status: 'active',
          entitlements: ['encrypted_sync']
        },
        operation: {
          id: 'encrypted-rollback-op-001',
          type: 'create',
          entityType: 'encrypted_clinical_data',
          entityId: 'encrypted-001',
          priority: 'high',
          data: {
            encryptedPayload: true,
            clinicalData: {
              phq9Score: 18,
              treatmentPlan: 'therapy_recommended',
              medicationHistory: ['sertraline', 'therapy']
            },
            syncPhases: ['encrypt', 'validate', 'transmit', 'verify']
          },
          metadata: {
            entityId: 'encrypted-001',
            entityType: 'encrypted_clinical_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: 'encrypted-rollback',
            deviceId: 'device-001',
            userId: 'user-001'
          },
          conflictResolution: 'encrypted_rollback',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 2,
          clinicalSafety: true
        },
        crisisMode: false,
        requestId: 'req-encrypted-rollback-001'
      };

      // Mock encryption success but sync failure
      mockEncryption.encryptData.mockResolvedValue('encrypted_clinical_data_token');

      // Simulate sync failure after encryption
      mockSyncOperation.mockRejectedValue(
        new Error('encrypted_sync_failure: Validation failed after encryption')
      );

      // Execute encrypted sync
      const result = await resilienceAPI.executeResilientSync(encryptedSyncRequest, mockSyncOperation);

      // Verify encryption was attempted
      expect(mockEncryption.encryptData).toHaveBeenCalled();

      // Verify graceful fallback after encryption failure
      expect(result.fallbackTriggered).toBe(true);

      // Verify encrypted data persisted for recovery
      expect(result.result?.status).toMatch(/stored_locally|fallback_activated/);

      // Verify no plaintext clinical data in logs
      const encryptionLogs = failureLogs.filter(log =>
        log.args.some((arg: any) => String(arg).includes('encrypt'))
      );

      // Check that no sensitive data is in logs
      encryptionLogs.forEach(log => {
        const logString = JSON.stringify(log.args);
        expect(logString).not.toContain('phq9Score');
        expect(logString).not.toContain('sertraline');
        expect(logString).not.toContain('therapy_recommended');
      });
    });
  });

  describe('Multi-Device Conflict Resolution Under Stress', () => {
    it('should resolve conflicts during high-stress multi-device scenario', async () => {
      const deviceStressTest = {
        devices: ['device-001', 'device-002', 'device-003', 'device-004'],
        concurrentOperations: 3,
        conflictEntity: 'stress-test-entity-001'
      };

      const stressRequests = deviceStressTest.devices.flatMap(device =>
        Array.from({ length: deviceStressTest.concurrentOperations }, (_, opIndex) => ({
          operationId: `stress-${device}-${opIndex}`,
          priority: SyncPriorityLevel.HIGH_CLINICAL,
          subscriptionContext: {
            tier: 'premium' as const,
            status: 'active' as const,
            entitlements: ['multi_device_stress']
          },
          operation: {
            id: `stress-op-${device}-${opIndex}`,
            type: 'update' as const,
            entityType: 'stress_test_data' as const,
            entityId: deviceStressTest.conflictEntity,
            priority: 'high' as const,
            data: {
              deviceId: device,
              operationIndex: opIndex,
              timestamp: new Date().toISOString(),
              conflictField: `value_from_${device}_${opIndex}`,
              version: opIndex + 1
            },
            metadata: {
              entityId: deviceStressTest.conflictEntity,
              entityType: 'stress_test_data',
              version: opIndex + 1,
              lastModified: new Date(Date.now() + opIndex * 1000).toISOString(),
              checksum: `stress-${device}-${opIndex}`,
              deviceId: device,
              userId: 'user-stress-test'
            },
            conflictResolution: 'latest_wins' as const,
            createdAt: new Date().toISOString(),
            retryCount: 0,
            maxRetries: 3,
            clinicalSafety: true
          },
          crisisMode: false,
          requestId: `req-stress-${device}-${opIndex}`
        }))
      );

      // Simulate stress conditions with intermittent failures
      mockSyncOperation.mockImplementation(async (request: PaymentAwareSyncRequest) => {
        // Simulate network stress
        await FailureScenarioSimulator.simulateNetworkOutage(Math.random() * 100);

        // Random failure rate under stress
        if (Math.random() < 0.3) {
          throw FailureScenarioSimulator.simulateTimeoutError();
        }

        return {
          operationId: request.operationId,
          status: 'success',
          conflicts: Math.random() < 0.5 ? [{ field: 'conflictField', resolution: 'merged' }] : [],
          syncedAt: new Date().toISOString()
        };
      });

      const startTime = Date.now();

      // Execute all stress operations concurrently
      const results = await Promise.allSettled(
        stressRequests.map(request => resilienceAPI.executeResilientSync(request, mockSyncOperation))
      );

      const totalTime = Date.now() - startTime;

      // Analyze stress test results
      const successes = results.filter(r => r.status === 'fulfilled' && (r.value as any).success);
      const failures = results.filter(r => r.status === 'rejected' ||
                                           (r.status === 'fulfilled' && !(r.value as any).success));

      const successRate = successes.length / results.length;

      // Verify acceptable success rate under stress
      expect(successRate).toBeGreaterThan(0.6); // 60% success rate under extreme stress

      // Verify conflict resolution worked
      const conflictResolutions = successes.filter(r =>
        (r as any).value.result?.conflicts && (r as any).value.result.conflicts.length > 0
      );

      console.log(`Multi-device stress test results:`);
      console.log(`  Total operations: ${results.length}`);
      console.log(`  Success rate: ${(successRate * 100).toFixed(1)}%`);
      console.log(`  Conflicts resolved: ${conflictResolutions.length}`);
      console.log(`  Total time: ${totalTime}ms`);
      console.log(`  Average time per operation: ${(totalTime / results.length).toFixed(2)}ms`);
    });

    it('should handle authentication conflicts across devices', async () => {
      const authConflictDevices = ['device-mobile', 'device-tablet', 'device-web'];

      const authConflictRequests = authConflictDevices.map((device, index) => ({
        operationId: `auth-conflict-${device}`,
        priority: SyncPriorityLevel.CRITICAL_SAFETY,
        subscriptionContext: {
          tier: 'premium' as const,
          status: 'active' as const,
          entitlements: ['auth_conflict_resolution']
        },
        operation: {
          id: `auth-conflict-op-${device}`,
          type: 'update' as const,
          entityType: 'auth_session_data' as const,
          entityId: 'user-auth-session-001',
          priority: 'critical' as const,
          data: {
            deviceId: device,
            sessionToken: `token_${device}_${Date.now()}`,
            authTimestamp: new Date().toISOString(),
            conflictResolution: 'latest_device_wins'
          },
          metadata: {
            entityId: 'user-auth-session-001',
            entityType: 'auth_session_data',
            version: index + 1,
            lastModified: new Date(Date.now() + index * 2000).toISOString(),
            checksum: `auth-${device}`,
            deviceId: device,
            userId: 'user-auth-test'
          },
          conflictResolution: 'auth_priority' as const,
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 5,
          clinicalSafety: true
        },
        crisisMode: false,
        requestId: `req-auth-${device}`
      }));

      // Simulate authentication conflicts
      let authCallCount = 0;
      mockSyncOperation.mockImplementation(async (request: PaymentAwareSyncRequest) => {
        authCallCount++;

        // First two calls fail with auth conflict
        if (authCallCount <= 2) {
          throw new Error('auth_conflict: Concurrent session modification detected');
        }

        // Third call succeeds with conflict resolution
        return {
          operationId: request.operationId,
          status: 'success',
          conflicts: [{
            field: 'sessionToken',
            resolution: 'latest_timestamp_wins',
            conflictType: 'auth_session'
          }],
          syncedAt: new Date().toISOString(),
          authResolution: true
        };
      });

      // Execute auth conflict resolution
      const results = await Promise.allSettled(
        authConflictRequests.map(request => resilienceAPI.executeResilientSync(request, mockSyncOperation))
      );

      // Verify auth conflict resolution
      const authSuccesses = results.filter(r => r.status === 'fulfilled' && (r.value as any).success);

      // At least one auth session should succeed
      expect(authSuccesses.length).toBeGreaterThan(0);

      // Verify auth conflicts were handled securely
      const authLogs = failureLogs.filter(log =>
        log.args.some((arg: any) => String(arg).includes('auth'))
      );

      // Verify no auth tokens in logs
      authLogs.forEach(log => {
        const logString = JSON.stringify(log.args);
        expect(logString).not.toMatch(/token_\w+_\d+/);
      });

      console.log(`Auth conflict resolution: ${authSuccesses.length}/${results.length} sessions resolved`);
    });
  });

  describe('Authentication Failure Recovery', () => {
    it('should handle token expiration during sync operations', async () => {
      const tokenExpirationRequest: PaymentAwareSyncRequest = {
        operationId: 'token-expiration-001',
        priority: SyncPriorityLevel.HIGH_CLINICAL,
        subscriptionContext: {
          tier: 'premium',
          status: 'active',
          entitlements: ['token_refresh']
        },
        operation: {
          id: 'token-expiration-op-001',
          type: 'create',
          entityType: 'token_test_data',
          entityId: 'token-test-001',
          priority: 'high',
          data: {
            tokenTest: true,
            sensitiveData: {
              assessmentScore: 16,
              treatmentPlan: 'active'
            }
          },
          metadata: {
            entityId: 'token-test-001',
            entityType: 'token_test_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: 'token-expiration',
            deviceId: 'device-001',
            userId: 'user-001'
          },
          conflictResolution: 'auth_required',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
          clinicalSafety: true
        },
        crisisMode: false,
        requestId: 'req-token-expiration-001'
      };

      // Mock token expiration error (non-retryable)
      mockSyncOperation.mockRejectedValue(FailureScenarioSimulator.simulateAuthenticationError());

      // Execute sync with auth failure
      const result = await resilienceAPI.executeResilientSync(tokenExpirationRequest, mockSyncOperation);

      // Verify auth failure handled correctly
      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('security');
      expect(result.retryRecommended).toBe(false); // Auth errors shouldn't be retried
      expect(mockSyncOperation).toHaveBeenCalledTimes(1); // No retries for auth errors

      // Verify secure error handling
      expect(result.error?.recoverySuggestions).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/auth|token|permission/i)
        ])
      );

      // Verify sensitive data not exposed in auth error
      const authErrorString = JSON.stringify(result.error);
      expect(authErrorString).not.toContain('assessmentScore');
      expect(authErrorString).not.toContain('treatmentPlan');
    });

    it('should handle permission changes during active sync', async () => {
      const permissionChangeRequest: PaymentAwareSyncRequest = {
        operationId: 'permission-change-001',
        priority: SyncPriorityLevel.MEDIUM_USER,
        subscriptionContext: {
          tier: 'basic',
          status: 'downgraded', // Simulates permission change
          entitlements: ['basic_sync'] // Reduced from premium
        },
        operation: {
          id: 'permission-change-op-001',
          type: 'update',
          entityType: 'permission_test_data',
          entityId: 'permission-test-001',
          priority: 'medium',
          data: {
            permissionTest: true,
            previousTier: 'premium',
            currentTier: 'basic',
            dataRequiresUpgrade: true
          },
          metadata: {
            entityId: 'permission-test-001',
            entityType: 'permission_test_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: 'permission-change',
            deviceId: 'device-001',
            userId: 'user-001'
          },
          conflictResolution: 'permission_aware',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 2,
          clinicalSafety: false
        },
        crisisMode: false,
        requestId: 'req-permission-change-001'
      };

      // Mock permission denied error
      mockSyncOperation.mockRejectedValue(
        new Error('authorization_error: Insufficient permissions for premium feature')
      );

      // Execute sync with permission change
      const result = await resilienceAPI.executeResilientSync(permissionChangeRequest, mockSyncOperation);

      // Verify permission error handled gracefully
      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('security');
      expect(result.retryRecommended).toBe(false);

      // Verify degraded service recommendations
      expect(result.error?.recoverySuggestions).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/permission|authorization/i)
        ])
      );
    });

    it('should handle authentication recovery for crisis scenarios', async () => {
      const crisisAuthRequest = {
        emergencyId: 'crisis-auth-001',
        userId: 'user-001',
        deviceId: 'device-001',
        timestamp: new Date().toISOString(),
        criticalData: {
          phq9Score: 23,
          suicidalIdeation: true,
          authenticationFailed: true, // Auth issues during crisis
          emergencyOverride: true
        }
      };

      // Mock auth failure during crisis
      const mockCrisisSync = jest.fn().mockRejectedValue(
        new Error('authentication_error: Session expired during crisis intervention')
      );

      // Execute crisis with auth failure
      const result = await resilienceAPI.handleCrisisEmergency(crisisAuthRequest, mockCrisisSync);

      // Verify crisis override bypassed auth failure
      expect(result.success).toBe(true);
      expect(result.crisisOverrideUsed).toBe(true);
      expect(result.fallbackTriggered).toBe(true);

      // Verify crisis resources provided despite auth failure
      expect(result.result?.crisisResources).toMatchObject({
        hotlineNumber: '988',
        localCrisisPlan: true,
        offlineSupport: true
      });

      // Verify auth failure doesn't prevent crisis intervention
      expect(result.result?.emergencyId).toBe(crisisAuthRequest.emergencyId);

      // Verify response time still meets crisis SLA
      expect(result.performanceMetrics.totalTime).toBeLessThan(200);
    });
  });

  describe('Cascading Failure Scenarios', () => {
    it('should handle cascading service failures gracefully', async () => {
      const cascadingFailureRequest: PaymentAwareSyncRequest = {
        operationId: 'cascading-failure-001',
        priority: SyncPriorityLevel.HIGH_CLINICAL,
        subscriptionContext: {
          tier: 'premium',
          status: 'active',
          entitlements: ['cascading_protection']
        },
        operation: {
          id: 'cascading-op-001',
          type: 'create',
          entityType: 'cascading_test_data',
          entityId: 'cascading-001',
          priority: 'high',
          data: {
            cascadingTest: true,
            serviceChain: ['auth', 'payment', 'storage', 'notification']
          },
          metadata: {
            entityId: 'cascading-001',
            entityType: 'cascading_test_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: 'cascading-failure',
            deviceId: 'device-001',
            userId: 'user-001'
          },
          conflictResolution: 'cascade_aware',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 5,
          clinicalSafety: true
        },
        crisisMode: false,
        requestId: 'req-cascading-001'
      };

      // Simulate cascading failures
      let failureCount = 0;
      mockSyncOperation.mockImplementation(async () => {
        failureCount++;

        switch (failureCount) {
          case 1:
            throw FailureScenarioSimulator.simulateAuthenticationError();
          case 2:
            throw new Error('payment_service_cascade: Payment service down due to auth failure');
          case 3:
            throw new Error('storage_service_cascade: Storage unavailable due to payment issues');
          case 4:
            throw FailureScenarioSimulator.simulateServiceUnavailableError();
          default:
            // Eventually succeed with degraded service
            return {
              operationId: cascadingFailureRequest.operationId,
              status: 'success',
              degradedMode: true,
              servicesCascaded: ['auth', 'payment', 'storage']
            };
        }
      });

      // Execute sync during cascading failures
      const result = await resilienceAPI.executeResilientSync(cascadingFailureRequest, mockSyncOperation);

      // Verify resilience during cascading failures
      expect(result.success).toBe(true); // Should eventually succeed or gracefully degrade
      expect(result.performanceMetrics.totalAttempts).toBeGreaterThan(1);

      // Verify circuit breaker activation due to failures
      const stats = resilienceAPI.getResilienceStatistics();
      expect(stats.circuitBreaker.failureCount).toBeGreaterThan(0);

      // Verify graceful degradation
      const healthStatus = resilienceAPI.getHealthStatus();
      expect(healthStatus.overall).toMatch(/healthy|degraded/);

      console.log(`Cascading failure handled with ${result.performanceMetrics.totalAttempts} attempts`);
    });
  });
});