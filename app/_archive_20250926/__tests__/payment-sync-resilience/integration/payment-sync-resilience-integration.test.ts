/**
 * Payment Sync Resilience Integration Testing
 *
 * Comprehensive testing of end-to-end payment sync resilience workflows
 * Tests API + State + Security resilience coordination
 * Validates crisis safety preservation during all failure modes
 *
 * Critical Requirements:
 * - Crisis response < 200ms even during payment failures
 * - HIPAA audit trail preservation during outages
 * - Zero data exposure during recovery scenarios
 * - Therapeutic continuity during payment sync issues
 */

import { jest } from '@jest/globals';
import { PaymentSyncResilienceAPI, CircuitBreakerState, DegradationLevel } from '../../../src/services/cloud/PaymentSyncResilienceAPI';
import { PaymentAwareSyncRequest, SyncPriorityLevel } from '../../../src/services/cloud/PaymentAwareSyncAPI';
import { EncryptionService } from '../../../src/services/security/EncryptionService';
import { CrisisResponseMonitor } from '../../../src/services/CrisisResponseMonitor';

// Mock dependencies
jest.mock('../../../src/services/security/EncryptionService');
jest.mock('../../../src/services/CrisisResponseMonitor');
jest.mock('expo-secure-store');

describe('Payment Sync Resilience Integration', () => {
  let resilienceAPI: PaymentSyncResilienceAPI;
  let mockEncryption: jest.Mocked<EncryptionService>;
  let mockCrisisMonitor: jest.Mocked<CrisisResponseMonitor>;
  let mockSyncOperation: jest.MockedFunction<any>;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Initialize resilience API
    resilienceAPI = PaymentSyncResilienceAPI.getInstance();

    // Setup mocks
    mockEncryption = EncryptionService.getInstance() as jest.Mocked<EncryptionService>;
    mockCrisisMonitor = CrisisResponseMonitor.getInstance() as jest.Mocked<CrisisResponseMonitor>;

    mockSyncOperation = jest.fn();

    // Initialize with test configuration
    await resilienceAPI.initialize({
      retry: {
        maxAttempts: 3,
        initialDelayMs: 100,
        maxDelayMs: 1000,
        backoffMultiplier: 2.0,
        jitterMax: 50,
        retryableErrors: ['network_error', 'timeout_error'],
        nonRetryableErrors: ['auth_error'],
        crisisOverride: true
      },
      circuitBreaker: {
        failureThreshold: 2,
        recoveryTimeoutMs: 5000,
        halfOpenMaxCalls: 1,
        successThreshold: 1,
        monitoringWindowMs: 10000,
        crisisExempt: true
      }
    });
  });

  afterEach(() => {
    // Cleanup
    resilienceAPI.destroy();
  });

  describe('End-to-End Payment Sync Resilience Workflows', () => {
    it('should handle complete payment sync failure and recovery', async () => {
      const startTime = Date.now();

      // Setup test request
      const request: PaymentAwareSyncRequest = {
        operationId: 'test-sync-001',
        priority: SyncPriorityLevel.HIGH_CLINICAL,
        subscriptionContext: {
          tier: 'premium',
          status: 'active',
          entitlements: ['sync_unlimited']
        },
        operation: {
          id: 'sync-op-001',
          type: 'create',
          entityType: 'assessment_data',
          entityId: 'phq9-001',
          priority: 'high',
          data: { scores: { phq9: 15 }, timestamp: new Date().toISOString() },
          metadata: {
            entityId: 'phq9-001',
            entityType: 'assessment_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: 'abc123',
            deviceId: 'device-001',
            userId: 'user-001'
          },
          conflictResolution: 'merge',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
          clinicalSafety: true
        },
        crisisMode: false,
        requestId: 'req-001'
      };

      // Mock initial failure, then success
      mockSyncOperation
        .mockRejectedValueOnce(new Error('network_error: Connection timeout'))
        .mockRejectedValueOnce(new Error('network_error: Service unavailable'))
        .mockResolvedValueOnce({
          operationId: request.operationId,
          status: 'success',
          syncedAt: new Date().toISOString(),
          conflicts: [],
          metadata: { retryCount: 2, totalTime: 500 }
        });

      // Execute resilient sync
      const result = await resilienceAPI.executeResilientSync(request, mockSyncOperation);

      // Verify successful recovery
      expect(result.success).toBe(true);
      expect(result.performanceMetrics.totalAttempts).toBe(3);
      expect(result.retryRecommended).toBe(false);
      expect(mockSyncOperation).toHaveBeenCalledTimes(3);

      // Verify crisis response time maintained (< 200ms overhead)
      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(2000); // Allowing for retry delays
    });

    it('should coordinate API + State + Security resilience during payment outage', async () => {
      // Setup complex sync request with payment data
      const request: PaymentAwareSyncRequest = {
        operationId: 'payment-sync-001',
        priority: SyncPriorityLevel.CRITICAL_SAFETY,
        subscriptionContext: {
          tier: 'basic',
          status: 'past_due',
          entitlements: ['sync_limited']
        },
        operation: {
          id: 'payment-op-001',
          type: 'update',
          entityType: 'subscription_data',
          entityId: 'sub-001',
          priority: 'critical',
          data: {
            subscriptionStatus: 'past_due',
            gracePeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            crisisAccessMaintained: true
          },
          metadata: {
            entityId: 'sub-001',
            entityType: 'subscription_data',
            version: 2,
            lastModified: new Date().toISOString(),
            checksum: 'def456',
            deviceId: 'device-001',
            userId: 'user-001'
          },
          conflictResolution: 'force_remote',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 5,
          clinicalSafety: true
        },
        crisisMode: false,
        requestId: 'req-payment-001'
      };

      // Mock payment service outage
      mockSyncOperation.mockRejectedValue(new Error('service_unavailable: Payment service down'));

      // Execute resilient sync
      const result = await resilienceAPI.executeResilientSync(request, mockSyncOperation);

      // Verify graceful degradation
      expect(result.fallbackTriggered).toBe(true);
      expect(result.success).toBe(true); // Should succeed with fallback

      // Verify security maintained during failure
      expect(mockEncryption.encryptData).toHaveBeenCalled();

      // Verify crisis access preserved
      expect(result.result?.status).toMatch(/stored_locally|fallback_activated/);
    });

    it('should handle cross-device sync failure and recovery scenarios', async () => {
      const deviceRequests = [
        {
          operationId: 'device1-sync-001',
          deviceId: 'device-001',
          conflictData: { lastModified: '2024-01-01T10:00:00Z', version: 1 }
        },
        {
          operationId: 'device2-sync-001',
          deviceId: 'device-002',
          conflictData: { lastModified: '2024-01-01T10:01:00Z', version: 2 }
        }
      ];

      const requests = deviceRequests.map(device => ({
        operationId: device.operationId,
        priority: SyncPriorityLevel.MEDIUM_USER,
        subscriptionContext: {
          tier: 'premium' as const,
          status: 'active' as const,
          entitlements: ['multi_device_sync']
        },
        operation: {
          id: device.operationId,
          type: 'update' as const,
          entityType: 'check_in_data' as const,
          entityId: 'checkin-001',
          priority: 'medium' as const,
          data: { mood: 7, energy: 6, ...device.conflictData },
          metadata: {
            entityId: 'checkin-001',
            entityType: 'check_in_data',
            version: device.conflictData.version,
            lastModified: device.conflictData.lastModified,
            checksum: `checksum-${device.deviceId}`,
            deviceId: device.deviceId,
            userId: 'user-001'
          },
          conflictResolution: 'merge' as const,
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
          clinicalSafety: false
        },
        crisisMode: false,
        requestId: `req-${device.deviceId}`
      }));

      // Mock conflict resolution scenario
      mockSyncOperation
        .mockRejectedValueOnce(new Error('network_error: Sync conflict detected'))
        .mockResolvedValueOnce({
          operationId: requests[0].operationId,
          status: 'success',
          syncedAt: new Date().toISOString(),
          conflicts: [{ field: 'version', resolution: 'merge' }],
          metadata: { conflictResolved: true }
        })
        .mockResolvedValueOnce({
          operationId: requests[1].operationId,
          status: 'success',
          syncedAt: new Date().toISOString(),
          conflicts: [],
          metadata: { conflictResolved: true }
        });

      // Execute parallel resilient sync operations
      const results = await Promise.all(
        requests.map(request => resilienceAPI.executeResilientSync(request, mockSyncOperation))
      );

      // Verify conflict resolution
      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
      expect(results[0].performanceMetrics.totalAttempts).toBe(2); // First failed then succeeded
      expect(results[1].performanceMetrics.totalAttempts).toBe(1); // Succeeded immediately
    });

    it('should preserve crisis safety during all failure modes', async () => {
      const crisisRequest = {
        emergencyId: 'crisis-001',
        userId: 'user-001',
        deviceId: 'device-001',
        timestamp: new Date().toISOString(),
        criticalData: {
          phq9Score: 22, // Crisis threshold
          suicidalIdeation: true,
          emergencyContacts: ['988'],
          safetyPlan: 'active'
        }
      };

      // Mock total service failure
      const mockCrisisSync = jest.fn().mockRejectedValue(new Error('Total system failure'));

      // Execute crisis emergency handling
      const result = await resilienceAPI.handleCrisisEmergency(crisisRequest, mockCrisisSync);

      // Verify crisis fallback activated
      expect(result.success).toBe(true); // Should succeed via fallback
      expect(result.crisisOverrideUsed).toBe(true);
      expect(result.fallbackTriggered).toBe(true);

      // Verify emergency resources available
      expect(result.result).toMatchObject({
        emergencyId: crisisRequest.emergencyId,
        status: 'fallback_activated',
        crisisResources: {
          hotlineNumber: '988',
          localCrisisPlan: true,
          offlineSupport: true
        }
      });

      // Verify response time < 200ms (crisis requirement)
      expect(result.performanceMetrics.totalTime).toBeLessThan(200);
    });
  });

  describe('API + State + Security Coordination', () => {
    it('should maintain security during resilience operations', async () => {
      const sensitiveRequest: PaymentAwareSyncRequest = {
        operationId: 'sensitive-sync-001',
        priority: SyncPriorityLevel.HIGH_CLINICAL,
        subscriptionContext: {
          tier: 'premium',
          status: 'active',
          entitlements: ['encryption_enhanced']
        },
        operation: {
          id: 'sensitive-op-001',
          type: 'create',
          entityType: 'phi_data',
          entityId: 'phi-001',
          priority: 'high',
          data: {
            assessmentData: { phq9: 18, gad7: 16 },
            personalInfo: { age: 35, condition: 'depression' }
          },
          metadata: {
            entityId: 'phi-001',
            entityType: 'phi_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: 'phi123',
            deviceId: 'device-001',
            userId: 'user-001'
          },
          conflictResolution: 'merge',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
          clinicalSafety: true
        },
        crisisMode: false,
        requestId: 'req-phi-001'
      };

      // Mock encryption service
      mockEncryption.encryptData.mockResolvedValue('encrypted-phi-data-token');
      mockEncryption.decryptData.mockResolvedValue(JSON.stringify(sensitiveRequest.operation.data));

      // Mock sync failure requiring persistence
      mockSyncOperation.mockRejectedValue(new Error('network_error: Temporary outage'));

      // Execute resilient sync
      const result = await resilienceAPI.executeResilientSync(sensitiveRequest, mockSyncOperation);

      // Verify encryption used for persistence
      expect(mockEncryption.encryptData).toHaveBeenCalledWith(
        JSON.stringify(sensitiveRequest.operation.data),
        sensitiveRequest.operationId
      );

      // Verify fallback maintained security
      expect(result.fallbackTriggered).toBe(true);

      // Verify sensitive data never exposed in logs or errors
      if (result.error) {
        expect(result.error.message).not.toContain('phq9');
        expect(result.error.message).not.toContain('personalInfo');
      }
    });

    it('should coordinate state management during outages', async () => {
      // Test state consistency during partial failures
      const stateRequests = [
        { entity: 'user_preferences', priority: SyncPriorityLevel.LOW_SYNC },
        { entity: 'assessment_data', priority: SyncPriorityLevel.HIGH_CLINICAL },
        { entity: 'crisis_plan', priority: SyncPriorityLevel.CRISIS_EMERGENCY }
      ];

      const requests = stateRequests.map((req, index) => ({
        operationId: `state-sync-${index}`,
        priority: req.priority,
        subscriptionContext: {
          tier: 'premium' as const,
          status: 'active' as const,
          entitlements: ['state_sync']
        },
        operation: {
          id: `state-op-${index}`,
          type: 'update' as const,
          entityType: req.entity as any,
          entityId: `${req.entity}-001`,
          priority: req.priority >= SyncPriorityLevel.HIGH_CLINICAL ? 'high' as const : 'low' as const,
          data: { updated: true, timestamp: new Date().toISOString() },
          metadata: {
            entityId: `${req.entity}-001`,
            entityType: req.entity as any,
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: `checksum-${index}`,
            deviceId: 'device-001',
            userId: 'user-001'
          },
          conflictResolution: 'merge' as const,
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
          clinicalSafety: req.priority >= SyncPriorityLevel.HIGH_CLINICAL
        },
        crisisMode: req.priority === SyncPriorityLevel.CRISIS_EMERGENCY,
        requestId: `req-state-${index}`
      }));

      // Mock different failure modes for different priorities
      mockSyncOperation
        .mockRejectedValueOnce(new Error('rate_limited')) // Low priority fails
        .mockResolvedValueOnce({ status: 'success' }) // High priority succeeds
        .mockResolvedValueOnce({ status: 'success' }); // Crisis succeeds

      // Set degraded mode
      resilienceAPI.setDegradationLevel(DegradationLevel.LIMITED, 'Test degradation');

      // Execute state sync operations
      const results = await Promise.all(
        requests.map(request => resilienceAPI.executeResilientSync(request, mockSyncOperation))
      );

      // Verify priority-based handling
      expect(results[0].success).toBe(false); // Low priority blocked in degraded mode
      expect(results[1].success).toBe(true);  // High clinical allowed
      expect(results[2].success).toBe(true);  // Crisis always allowed
    });
  });

  describe('Multi-Device Conflict Resolution Under Stress', () => {
    it('should resolve conflicts during network instability', async () => {
      const conflictScenario = {
        entityId: 'shared-data-001',
        device1Version: { version: 5, lastModified: '2024-01-01T10:00:00Z' },
        device2Version: { version: 6, lastModified: '2024-01-01T10:01:00Z' },
        device3Version: { version: 4, lastModified: '2024-01-01T09:59:00Z' }
      };

      const conflictRequests = [
        {
          operationId: 'conflict-device1',
          deviceId: 'device-001',
          data: { mood: 8, ...conflictScenario.device1Version }
        },
        {
          operationId: 'conflict-device2',
          deviceId: 'device-002',
          data: { mood: 6, ...conflictScenario.device2Version }
        },
        {
          operationId: 'conflict-device3',
          deviceId: 'device-003',
          data: { mood: 7, ...conflictScenario.device3Version }
        }
      ];

      // Mock intermittent network failures
      mockSyncOperation
        .mockRejectedValueOnce(new Error('network_error: Packet loss'))
        .mockRejectedValueOnce(new Error('timeout_error: Request timeout'))
        .mockResolvedValueOnce({
          operationId: 'conflict-device1',
          status: 'success',
          conflicts: [{ field: 'mood', resolution: 'device2_wins' }]
        })
        .mockResolvedValueOnce({
          operationId: 'conflict-device2',
          status: 'success',
          conflicts: []
        })
        .mockResolvedValueOnce({
          operationId: 'conflict-device3',
          status: 'success',
          conflicts: [{ field: 'version', resolution: 'merge' }]
        });

      const requests = conflictRequests.map(req => ({
        operationId: req.operationId,
        priority: SyncPriorityLevel.MEDIUM_USER,
        subscriptionContext: {
          tier: 'premium' as const,
          status: 'active' as const,
          entitlements: ['conflict_resolution']
        },
        operation: {
          id: req.operationId,
          type: 'update' as const,
          entityType: 'check_in_data' as const,
          entityId: conflictScenario.entityId,
          priority: 'medium' as const,
          data: req.data,
          metadata: {
            entityId: conflictScenario.entityId,
            entityType: 'check_in_data',
            version: req.data.version,
            lastModified: req.data.lastModified,
            checksum: `checksum-${req.deviceId}`,
            deviceId: req.deviceId,
            userId: 'user-001'
          },
          conflictResolution: 'auto_resolve' as const,
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
          clinicalSafety: false
        },
        crisisMode: false,
        requestId: `req-${req.deviceId}`
      }));

      // Execute concurrent conflict resolution
      const results = await Promise.all(
        requests.map(request => resilienceAPI.executeResilientSync(request, mockSyncOperation))
      );

      // Verify all conflicts resolved
      expect(results.every(r => r.success)).toBe(true);

      // Verify retry logic worked for network failures
      expect(results[0].performanceMetrics.totalAttempts).toBe(2); // Failed once, succeeded on retry
      expect(results[1].performanceMetrics.totalAttempts).toBe(2); // Failed once, succeeded on retry
      expect(results[2].performanceMetrics.totalAttempts).toBe(1); // Succeeded immediately
    });

    it('should handle authentication failure recovery during conflicts', async () => {
      const authFailureRequest: PaymentAwareSyncRequest = {
        operationId: 'auth-recovery-001',
        priority: SyncPriorityLevel.HIGH_CLINICAL,
        subscriptionContext: {
          tier: 'premium',
          status: 'active',
          entitlements: ['authenticated_sync']
        },
        operation: {
          id: 'auth-op-001',
          type: 'update',
          entityType: 'assessment_data',
          entityId: 'auth-data-001',
          priority: 'high',
          data: { authenticated: true, timestamp: new Date().toISOString() },
          metadata: {
            entityId: 'auth-data-001',
            entityType: 'assessment_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: 'auth123',
            deviceId: 'device-001',
            userId: 'user-001'
          },
          conflictResolution: 'require_auth',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
          clinicalSafety: true
        },
        crisisMode: false,
        requestId: 'req-auth-001'
      };

      // Mock authentication failure (non-retryable)
      mockSyncOperation.mockRejectedValue(new Error('authentication_error: Token expired'));

      // Execute resilient sync
      const result = await resilienceAPI.executeResilientSync(authFailureRequest, mockSyncOperation);

      // Verify no retry attempted for auth errors
      expect(result.success).toBe(false);
      expect(result.retryRecommended).toBe(false);
      expect(result.error?.retryable).toBe(false);
      expect(mockSyncOperation).toHaveBeenCalledTimes(1);

      // Verify error properly categorized
      expect(result.error?.category).toBe('security');
      expect(result.error?.severity).toBe('medium'); // High clinical but not crisis
    });
  });

  describe('Performance Metrics and Monitoring', () => {
    it('should track comprehensive performance metrics', async () => {
      const performanceRequest: PaymentAwareSyncRequest = {
        operationId: 'perf-test-001',
        priority: SyncPriorityLevel.MEDIUM_USER,
        subscriptionContext: {
          tier: 'basic',
          status: 'active',
          entitlements: ['basic_sync']
        },
        operation: {
          id: 'perf-op-001',
          type: 'create',
          entityType: 'performance_data',
          entityId: 'perf-001',
          priority: 'medium',
          data: { metric: 'test', value: 100 },
          metadata: {
            entityId: 'perf-001',
            entityType: 'performance_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: 'perf123',
            deviceId: 'device-001',
            userId: 'user-001'
          },
          conflictResolution: 'merge',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 2,
          clinicalSafety: false
        },
        crisisMode: false,
        requestId: 'req-perf-001'
      };

      // Mock performance scenario with retries
      mockSyncOperation
        .mockRejectedValueOnce(new Error('timeout_error: Slow response'))
        .mockResolvedValueOnce({
          operationId: performanceRequest.operationId,
          status: 'success',
          syncedAt: new Date().toISOString(),
          conflicts: [],
          metadata: { performanceOptimized: true }
        });

      const startTime = Date.now();
      const result = await resilienceAPI.executeResilientSync(performanceRequest, mockSyncOperation);
      const totalRealTime = Date.now() - startTime;

      // Verify performance metrics captured
      expect(result.performanceMetrics).toMatchObject({
        totalAttempts: 2,
        totalTime: expect.any(Number),
        queueTime: 0
      });

      // Verify reasonable performance bounds
      expect(result.performanceMetrics.totalTime).toBeLessThan(totalRealTime + 100); // Allow 100ms variance
      expect(result.performanceMetrics.totalTime).toBeGreaterThan(0);

      // Verify health status updated
      const healthStatus = resilienceAPI.getHealthStatus();
      expect(healthStatus).toMatchObject({
        overall: expect.any(String),
        retry: expect.any(Boolean),
        circuitBreaker: expect.any(Boolean),
        persistence: expect.any(Boolean),
        degradation: expect.any(Boolean)
      });
    });

    it('should provide detailed resilience statistics', async () => {
      // Generate some operations for statistics
      const requests = Array.from({ length: 5 }, (_, i) => ({
        operationId: `stats-test-${i}`,
        priority: SyncPriorityLevel.MEDIUM_USER,
        subscriptionContext: {
          tier: 'premium' as const,
          status: 'active' as const,
          entitlements: ['stats_tracking']
        },
        operation: {
          id: `stats-op-${i}`,
          type: 'create' as const,
          entityType: 'stats_data' as const,
          entityId: `stats-${i}`,
          priority: 'medium' as const,
          data: { index: i },
          metadata: {
            entityId: `stats-${i}`,
            entityType: 'stats_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: `stats${i}`,
            deviceId: 'device-001',
            userId: 'user-001'
          },
          conflictResolution: 'merge' as const,
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 2,
          clinicalSafety: false
        },
        crisisMode: false,
        requestId: `req-stats-${i}`
      }));

      // Mock mixed success/failure for statistics
      mockSyncOperation
        .mockResolvedValueOnce({ status: 'success' })
        .mockRejectedValueOnce(new Error('network_error'))
        .mockResolvedValueOnce({ status: 'success' })
        .mockResolvedValueOnce({ status: 'success' })
        .mockRejectedValueOnce(new Error('timeout_error'))
        .mockResolvedValueOnce({ status: 'success' }); // For retry

      // Execute operations
      await Promise.allSettled(
        requests.map(request => resilienceAPI.executeResilientSync(request, mockSyncOperation))
      );

      // Get resilience statistics
      const stats = resilienceAPI.getResilienceStatistics();

      // Verify statistics structure
      expect(stats).toMatchObject({
        retry: expect.objectContaining({
          totalAttempts: expect.any(Number),
          successRate: expect.any(Number),
          averageAttempts: expect.any(Number),
          recentFailures: expect.any(Number)
        }),
        circuitBreaker: expect.objectContaining({
          state: expect.any(String),
          failureCount: expect.any(Number),
          successCount: expect.any(Number),
          recentFailureRate: expect.any(Number)
        }),
        persistence: expect.objectContaining({
          totalOperations: expect.any(Number),
          crisisOperations: expect.any(Number),
          memoryUsage: expect.any(Number)
        }),
        degradation: expect.any(String)
      });

      // Verify retry statistics make sense
      expect(stats.retry.successRate).toBeGreaterThan(0);
      expect(stats.retry.successRate).toBeLessThanOrEqual(1);
    });
  });

  describe('Recovery and Persistence', () => {
    it('should recover persisted operations after outage', async () => {
      // Create operations to persist
      const persistedRequests = [
        {
          operationId: 'persist-001',
          priority: SyncPriorityLevel.HIGH_CLINICAL,
          data: { clinical: true }
        },
        {
          operationId: 'persist-002',
          priority: SyncPriorityLevel.CRISIS_EMERGENCY,
          data: { crisis: true }
        }
      ];

      const requests = persistedRequests.map(req => ({
        operationId: req.operationId,
        priority: req.priority,
        subscriptionContext: {
          tier: 'premium' as const,
          status: 'active' as const,
          entitlements: ['persistence']
        },
        operation: {
          id: req.operationId,
          type: 'create' as const,
          entityType: 'persisted_data' as const,
          entityId: req.operationId,
          priority: req.priority >= SyncPriorityLevel.HIGH_CLINICAL ? 'high' as const : 'medium' as const,
          data: req.data,
          metadata: {
            entityId: req.operationId,
            entityType: 'persisted_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: `persist-${req.operationId}`,
            deviceId: 'device-001',
            userId: 'user-001'
          },
          conflictResolution: 'merge' as const,
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
          clinicalSafety: req.priority >= SyncPriorityLevel.HIGH_CLINICAL
        },
        crisisMode: req.priority === SyncPriorityLevel.CRISIS_EMERGENCY,
        requestId: `req-${req.operationId}`
      }));

      // Mock complete failure to force persistence
      mockSyncOperation.mockRejectedValue(new Error('service_unavailable: Complete outage'));

      // Execute operations (will be persisted due to failure)
      const initialResults = await Promise.all(
        requests.map(request => resilienceAPI.executeResilientSync(request, mockSyncOperation))
      );

      // Verify operations were persisted
      expect(initialResults.every(r => r.fallbackTriggered)).toBe(true);

      // Mock service recovery
      mockSyncOperation
        .mockResolvedValueOnce({ status: 'success', operationId: 'persist-001' })
        .mockResolvedValueOnce({ status: 'success', operationId: 'persist-002' });

      // Attempt recovery
      const recoveryResult = await resilienceAPI.recoverPersistedOperations(mockSyncOperation);

      // Verify successful recovery
      expect(recoveryResult.recovered).toBe(2);
      expect(recoveryResult.failed).toBe(0);
      expect(recoveryResult.totalTime).toBeGreaterThan(0);
    });
  });
});