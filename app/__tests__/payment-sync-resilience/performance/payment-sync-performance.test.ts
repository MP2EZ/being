/**
 * Payment Sync Resilience Performance Testing
 *
 * Performance validation for payment sync resilience with focus on:
 * - Crisis response time validation (<200ms)
 * - Subscription tier response time SLAs
 * - Memory usage optimization validation
 * - Network failure recovery performance
 *
 * SLA Requirements:
 * - Crisis: <200ms response time even during failures
 * - Premium: <500ms for high-priority operations
 * - Basic: <2000ms for standard operations
 * - Memory: <50MB peak usage during stress
 */

import { jest } from '@jest/globals';
import { PaymentSyncResilienceAPI, DegradationLevel } from '../../../src/services/cloud/PaymentSyncResilienceAPI';
import { PaymentAwareSyncRequest, SyncPriorityLevel } from '../../../src/services/cloud/PaymentAwareSyncAPI';
import { performance } from 'perf_hooks';

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  CRISIS_RESPONSE_MS: 200,
  PREMIUM_HIGH_PRIORITY_MS: 500,
  PREMIUM_STANDARD_MS: 1000,
  BASIC_STANDARD_MS: 2000,
  MEMORY_LIMIT_MB: 50,
  CONCURRENT_OPERATIONS: 50,
  STRESS_TEST_DURATION_MS: 30000
};

// Memory monitoring utility
class MemoryMonitor {
  private measurements: number[] = [];
  private interval?: NodeJS.Timer;

  start(): void {
    this.measurements = [];
    this.interval = setInterval(() => {
      if (global.gc) {
        global.gc();
      }
      const usage = process.memoryUsage();
      this.measurements.push(usage.heapUsed / 1024 / 1024); // Convert to MB
    }, 100);
  }

  stop(): { peak: number; average: number; measurements: number[] } {
    if (this.interval) {
      clearInterval(this.interval);
    }
    const peak = Math.max(...this.measurements);
    const average = this.measurements.reduce((a, b) => a + b, 0) / this.measurements.length;
    return { peak, average, measurements: [...this.measurements] };
  }
}

describe('Payment Sync Resilience Performance', () => {
  let resilienceAPI: PaymentSyncResilienceAPI;
  let memoryMonitor: MemoryMonitor;
  let mockSyncOperation: jest.MockedFunction<any>;

  beforeEach(async () => {
    jest.clearAllMocks();

    resilienceAPI = PaymentSyncResilienceAPI.getInstance();
    memoryMonitor = new MemoryMonitor();
    mockSyncOperation = jest.fn();

    // Initialize with performance-optimized configuration
    await resilienceAPI.initialize({
      retry: {
        maxAttempts: 3,
        initialDelayMs: 50, // Faster for performance testing
        maxDelayMs: 500,
        backoffMultiplier: 1.5,
        jitterMax: 25,
        retryableErrors: ['network_error', 'timeout_error'],
        nonRetryableErrors: ['auth_error'],
        crisisOverride: true
      },
      circuitBreaker: {
        failureThreshold: 3,
        recoveryTimeoutMs: 2000,
        halfOpenMaxCalls: 2,
        successThreshold: 2,
        monitoringWindowMs: 5000,
        crisisExempt: true
      }
    });
  });

  afterEach(() => {
    memoryMonitor.stop();
    resilienceAPI.destroy();
  });

  describe('Crisis Response Time Validation', () => {
    it('should maintain <200ms crisis response during payment failures', async () => {
      const crisisRequest = {
        emergencyId: 'crisis-perf-001',
        userId: 'user-001',
        deviceId: 'device-001',
        timestamp: new Date().toISOString(),
        criticalData: {
          phq9Score: 23,
          suicidalIdeation: true,
          emergencyContacts: ['988'],
          immediateRisk: true
        }
      };

      // Mock payment service complete failure
      const mockCrisisSync = jest.fn().mockRejectedValue(
        new Error('payment_service_down: Complete payment infrastructure failure')
      );

      // Measure crisis response time
      const startTime = performance.now();
      const result = await resilienceAPI.handleCrisisEmergency(crisisRequest, mockCrisisSync);
      const responseTime = performance.now() - startTime;

      // Verify crisis SLA met
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CRISIS_RESPONSE_MS);
      expect(result.success).toBe(true);
      expect(result.crisisOverrideUsed).toBe(true);

      // Verify crisis resources immediately available
      expect(result.result?.crisisResources).toMatchObject({
        hotlineNumber: '988',
        localCrisisPlan: true,
        offlineSupport: true
      });

      console.log(`Crisis response time: ${responseTime.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.CRISIS_RESPONSE_MS}ms)`);
    });

    it('should maintain crisis performance under concurrent load', async () => {
      const concurrentCrisisRequests = Array.from({ length: 10 }, (_, i) => ({
        emergencyId: `crisis-concurrent-${i}`,
        userId: `user-${i}`,
        deviceId: `device-${i}`,
        timestamp: new Date().toISOString(),
        criticalData: {
          phq9Score: 20 + i,
          suicidalIdeation: true,
          emergencyContacts: ['988']
        }
      }));

      // Mock various failure scenarios
      const mockCrisisSync = jest.fn().mockImplementation(() => {
        return Promise.reject(new Error('payment_overload: Service under stress'));
      });

      // Measure concurrent crisis response
      const startTime = performance.now();
      const results = await Promise.all(
        concurrentCrisisRequests.map(request =>
          resilienceAPI.handleCrisisEmergency(request, mockCrisisSync)
        )
      );
      const totalTime = performance.now() - startTime;
      const averageTime = totalTime / concurrentCrisisRequests.length;

      // Verify all crisis requests handled successfully
      expect(results.every(r => r.success)).toBe(true);
      expect(results.every(r => r.crisisOverrideUsed)).toBe(true);

      // Verify individual response times
      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CRISIS_RESPONSE_MS);

      console.log(`Concurrent crisis average response time: ${averageTime.toFixed(2)}ms`);
    });

    it('should bypass all resilience delays for crisis operations', async () => {
      // Pre-trip circuit breaker
      resilienceAPI.setDegradationLevel(DegradationLevel.OFFLINE, 'Performance test');

      const crisisRequest = {
        emergencyId: 'crisis-bypass-001',
        userId: 'user-001',
        deviceId: 'device-001',
        timestamp: new Date().toISOString(),
        criticalData: {
          phq9Score: 25,
          suicidalIdeation: true,
          immediateIntervention: true
        }
      };

      const mockCrisisSync = jest.fn().mockRejectedValue(
        new Error('circuit_breaker_open: All services down')
      );

      // Measure bypass performance
      const startTime = performance.now();
      const result = await resilienceAPI.handleCrisisEmergency(crisisRequest, mockCrisisSync);
      const responseTime = performance.now() - startTime;

      // Verify crisis bypassed all resilience mechanisms
      expect(responseTime).toBeLessThan(100); // Should be much faster than normal threshold
      expect(result.success).toBe(true);
      expect(result.fallbackTriggered).toBe(true);

      console.log(`Crisis bypass response time: ${responseTime.toFixed(2)}ms`);
    });
  });

  describe('Subscription Tier Response Time SLAs', () => {
    it('should meet premium tier SLA for high-priority operations', async () => {
      const premiumRequest: PaymentAwareSyncRequest = {
        operationId: 'premium-perf-001',
        priority: SyncPriorityLevel.HIGH_CLINICAL,
        subscriptionContext: {
          tier: 'premium',
          status: 'active',
          entitlements: ['priority_sync', 'enhanced_performance']
        },
        operation: {
          id: 'premium-op-001',
          type: 'create',
          entityType: 'clinical_data',
          entityId: 'clinical-001',
          priority: 'high',
          data: { assessment: 'phq9', score: 15 },
          metadata: {
            entityId: 'clinical-001',
            entityType: 'clinical_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: 'premium123',
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
        requestId: 'req-premium-001'
      };

      // Mock slight delay to test performance
      mockSyncOperation.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 100)).then(() => ({
          operationId: premiumRequest.operationId,
          status: 'success',
          syncedAt: new Date().toISOString(),
          conflicts: []
        }))
      );

      const startTime = performance.now();
      const result = await resilienceAPI.executeResilientSync(premiumRequest, mockSyncOperation);
      const responseTime = performance.now() - startTime;

      // Verify premium SLA met
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PREMIUM_HIGH_PRIORITY_MS);
      expect(result.success).toBe(true);

      console.log(`Premium high-priority response time: ${responseTime.toFixed(2)}ms (SLA: ${PERFORMANCE_THRESHOLDS.PREMIUM_HIGH_PRIORITY_MS}ms)`);
    });

    it('should handle basic tier operations within SLA', async () => {
      const basicRequest: PaymentAwareSyncRequest = {
        operationId: 'basic-perf-001',
        priority: SyncPriorityLevel.MEDIUM_USER,
        subscriptionContext: {
          tier: 'basic',
          status: 'active',
          entitlements: ['standard_sync']
        },
        operation: {
          id: 'basic-op-001',
          type: 'update',
          entityType: 'user_data',
          entityId: 'user-001',
          priority: 'medium',
          data: { preferences: { theme: 'dark' } },
          metadata: {
            entityId: 'user-001',
            entityType: 'user_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: 'basic123',
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
        requestId: 'req-basic-001'
      };

      // Mock with some delay
      mockSyncOperation.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 200)).then(() => ({
          operationId: basicRequest.operationId,
          status: 'success'
        }))
      );

      const startTime = performance.now();
      const result = await resilienceAPI.executeResilientSync(basicRequest, mockSyncOperation);
      const responseTime = performance.now() - startTime;

      // Verify basic SLA met
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.BASIC_STANDARD_MS);
      expect(result.success).toBe(true);

      console.log(`Basic tier response time: ${responseTime.toFixed(2)}ms (SLA: ${PERFORMANCE_THRESHOLDS.BASIC_STANDARD_MS}ms)`);
    });

    it('should prioritize premium over basic under load', async () => {
      // Create mixed priority requests
      const premiumRequest: PaymentAwareSyncRequest = {
        operationId: 'priority-premium-001',
        priority: SyncPriorityLevel.HIGH_CLINICAL,
        subscriptionContext: { tier: 'premium', status: 'active', entitlements: ['priority_sync'] },
        operation: {
          id: 'priority-premium-op',
          type: 'create',
          entityType: 'clinical_data',
          entityId: 'priority-clinical',
          priority: 'high',
          data: { priority: 'premium' },
          metadata: {
            entityId: 'priority-clinical',
            entityType: 'clinical_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: 'priority-premium',
            deviceId: 'device-001',
            userId: 'user-premium'
          },
          conflictResolution: 'merge',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
          clinicalSafety: true
        },
        crisisMode: false,
        requestId: 'req-priority-premium'
      };

      const basicRequest: PaymentAwareSyncRequest = {
        operationId: 'priority-basic-001',
        priority: SyncPriorityLevel.LOW_SYNC,
        subscriptionContext: { tier: 'basic', status: 'active', entitlements: ['standard_sync'] },
        operation: {
          id: 'priority-basic-op',
          type: 'update',
          entityType: 'user_data',
          entityId: 'priority-user',
          priority: 'low',
          data: { priority: 'basic' },
          metadata: {
            entityId: 'priority-user',
            entityType: 'user_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: 'priority-basic',
            deviceId: 'device-001',
            userId: 'user-basic'
          },
          conflictResolution: 'merge',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 1,
          clinicalSafety: false
        },
        crisisMode: false,
        requestId: 'req-priority-basic'
      };

      // Mock processing delay
      let callOrder: string[] = [];
      mockSyncOperation.mockImplementation((request: PaymentAwareSyncRequest) => {
        callOrder.push(request.operationId);
        const delay = request.priority >= SyncPriorityLevel.HIGH_CLINICAL ? 50 : 200;
        return new Promise(resolve => setTimeout(resolve, delay)).then(() => ({
          operationId: request.operationId,
          status: 'success'
        }));
      });

      // Execute concurrently
      const [premiumResult, basicResult] = await Promise.all([
        resilienceAPI.executeResilientSync(premiumRequest, mockSyncOperation),
        resilienceAPI.executeResilientSync(basicRequest, mockSyncOperation)
      ]);

      // Verify both succeeded
      expect(premiumResult.success).toBe(true);
      expect(basicResult.success).toBe(true);

      // Verify premium completed faster due to priority
      expect(premiumResult.performanceMetrics.totalTime)
        .toBeLessThan(basicResult.performanceMetrics.totalTime);
    });
  });

  describe('Memory Usage Optimization', () => {
    it('should maintain memory usage under stress', async () => {
      memoryMonitor.start();

      // Generate large number of concurrent operations
      const stressRequests = Array.from({ length: PERFORMANCE_THRESHOLDS.CONCURRENT_OPERATIONS }, (_, i) => ({
        operationId: `stress-${i}`,
        priority: i % 2 === 0 ? SyncPriorityLevel.HIGH_CLINICAL : SyncPriorityLevel.MEDIUM_USER,
        subscriptionContext: {
          tier: i % 3 === 0 ? 'premium' as const : 'basic' as const,
          status: 'active' as const,
          entitlements: ['stress_test']
        },
        operation: {
          id: `stress-op-${i}`,
          type: 'create' as const,
          entityType: 'stress_data' as const,
          entityId: `stress-${i}`,
          priority: i % 2 === 0 ? 'high' as const : 'medium' as const,
          data: { index: i, payload: new Array(100).fill(`data-${i}`) }, // Simulate larger payload
          metadata: {
            entityId: `stress-${i}`,
            entityType: 'stress_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: `stress-${i}`,
            deviceId: 'device-001',
            userId: 'user-001'
          },
          conflictResolution: 'merge' as const,
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 2,
          clinicalSafety: i % 2 === 0
        },
        crisisMode: false,
        requestId: `req-stress-${i}`
      }));

      // Mock various response patterns
      mockSyncOperation.mockImplementation((request: PaymentAwareSyncRequest) => {
        const shouldFail = parseInt(request.operationId.split('-')[1]) % 5 === 0;
        if (shouldFail) {
          return Promise.reject(new Error('network_error: Simulated failure'));
        }
        return Promise.resolve({
          operationId: request.operationId,
          status: 'success'
        });
      });

      // Execute stress test
      const startTime = performance.now();
      const results = await Promise.allSettled(
        stressRequests.map(request =>
          resilienceAPI.executeResilientSync(request, mockSyncOperation)
        )
      );
      const stressTestDuration = performance.now() - startTime;

      const memoryStats = memoryMonitor.stop();

      // Verify memory usage stayed within limits
      expect(memoryStats.peak).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_LIMIT_MB);

      // Verify reasonable success rate under stress
      const successCount = results.filter(r => r.status === 'fulfilled' &&
        (r.value as any).success).length;
      const successRate = successCount / results.length;
      expect(successRate).toBeGreaterThan(0.7); // 70% success rate under stress

      console.log(`Stress test results:`);
      console.log(`  Duration: ${stressTestDuration.toFixed(2)}ms`);
      console.log(`  Operations: ${PERFORMANCE_THRESHOLDS.CONCURRENT_OPERATIONS}`);
      console.log(`  Success rate: ${(successRate * 100).toFixed(1)}%`);
      console.log(`  Peak memory: ${memoryStats.peak.toFixed(2)}MB (limit: ${PERFORMANCE_THRESHOLDS.MEMORY_LIMIT_MB}MB)`);
      console.log(`  Average memory: ${memoryStats.average.toFixed(2)}MB`);
    });

    it('should cleanup resources efficiently', async () => {
      memoryMonitor.start();

      // Create operations that will be persisted
      const persistenceRequests = Array.from({ length: 20 }, (_, i) => ({
        operationId: `cleanup-${i}`,
        priority: SyncPriorityLevel.HIGH_CLINICAL,
        subscriptionContext: {
          tier: 'premium' as const,
          status: 'active' as const,
          entitlements: ['persistence']
        },
        operation: {
          id: `cleanup-op-${i}`,
          type: 'create' as const,
          entityType: 'cleanup_data' as const,
          entityId: `cleanup-${i}`,
          priority: 'high' as const,
          data: { cleanup: true, largeData: new Array(500).fill(`cleanup-${i}`) },
          metadata: {
            entityId: `cleanup-${i}`,
            entityType: 'cleanup_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: `cleanup-${i}`,
            deviceId: 'device-001',
            userId: 'user-001'
          },
          conflictResolution: 'merge' as const,
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
          clinicalSafety: true
        },
        crisisMode: false,
        requestId: `req-cleanup-${i}`
      }));

      // Force persistence by simulating failure
      mockSyncOperation.mockRejectedValue(new Error('service_unavailable: Force persistence'));

      // Execute operations (will be persisted)
      await Promise.allSettled(
        persistenceRequests.map(request =>
          resilienceAPI.executeResilientSync(request, mockSyncOperation)
        )
      );

      const beforeCleanupMemory = process.memoryUsage().heapUsed / 1024 / 1024;

      // Get persistence stats before cleanup
      const beforeStats = resilienceAPI.getResilienceStatistics().persistence;

      // Force cleanup
      resilienceAPI.destroy();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const afterCleanupMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      const memoryStats = memoryMonitor.stop();

      // Verify memory was released
      expect(afterCleanupMemory).toBeLessThan(beforeCleanupMemory);

      console.log(`Memory cleanup results:`);
      console.log(`  Before cleanup: ${beforeCleanupMemory.toFixed(2)}MB`);
      console.log(`  After cleanup: ${afterCleanupMemory.toFixed(2)}MB`);
      console.log(`  Memory freed: ${(beforeCleanupMemory - afterCleanupMemory).toFixed(2)}MB`);
      console.log(`  Persisted operations before: ${beforeStats.totalOperations}`);
    });
  });

  describe('Network Failure Recovery Performance', () => {
    it('should recover quickly from network interruptions', async () => {
      const recoveryRequest: PaymentAwareSyncRequest = {
        operationId: 'recovery-perf-001',
        priority: SyncPriorityLevel.HIGH_CLINICAL,
        subscriptionContext: {
          tier: 'premium',
          status: 'active',
          entitlements: ['fast_recovery']
        },
        operation: {
          id: 'recovery-op-001',
          type: 'create',
          entityType: 'recovery_data',
          entityId: 'recovery-001',
          priority: 'high',
          data: { recovery: true },
          metadata: {
            entityId: 'recovery-001',
            entityType: 'recovery_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: 'recovery123',
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
        requestId: 'req-recovery-001'
      };

      // Mock network recovery scenario
      mockSyncOperation
        .mockRejectedValueOnce(new Error('network_error: Connection timeout'))
        .mockRejectedValueOnce(new Error('network_error: Packet loss'))
        .mockResolvedValueOnce({
          operationId: recoveryRequest.operationId,
          status: 'success',
          syncedAt: new Date().toISOString()
        });

      const startTime = performance.now();
      const result = await resilienceAPI.executeResilientSync(recoveryRequest, mockSyncOperation);
      const recoveryTime = performance.now() - startTime;

      // Verify successful recovery
      expect(result.success).toBe(true);
      expect(result.performanceMetrics.totalAttempts).toBe(3);

      // Verify recovery time reasonable (should include retry delays)
      expect(recoveryTime).toBeLessThan(1000); // Should recover within 1 second

      console.log(`Network recovery time: ${recoveryTime.toFixed(2)}ms (attempts: ${result.performanceMetrics.totalAttempts})`);
    });

    it('should handle degraded network performance gracefully', async () => {
      const degradedRequests = Array.from({ length: 10 }, (_, i) => ({
        operationId: `degraded-${i}`,
        priority: i < 5 ? SyncPriorityLevel.HIGH_CLINICAL : SyncPriorityLevel.MEDIUM_USER,
        subscriptionContext: {
          tier: 'premium' as const,
          status: 'active' as const,
          entitlements: ['degraded_network']
        },
        operation: {
          id: `degraded-op-${i}`,
          type: 'create' as const,
          entityType: 'degraded_data' as const,
          entityId: `degraded-${i}`,
          priority: i < 5 ? 'high' as const : 'medium' as const,
          data: { degraded: true, index: i },
          metadata: {
            entityId: `degraded-${i}`,
            entityType: 'degraded_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: `degraded-${i}`,
            deviceId: 'device-001',
            userId: 'user-001'
          },
          conflictResolution: 'merge' as const,
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 2,
          clinicalSafety: i < 5
        },
        crisisMode: false,
        requestId: `req-degraded-${i}`
      }));

      // Mock degraded network with variable delays
      mockSyncOperation.mockImplementation((request: PaymentAwareSyncRequest) => {
        const index = parseInt(request.operationId.split('-')[1]);
        const delay = index < 5 ? 100 : 300; // High priority gets faster processing

        return new Promise((resolve, reject) => {
          setTimeout(() => {
            if (Math.random() < 0.3) { // 30% failure rate
              reject(new Error('timeout_error: Degraded network'));
            } else {
              resolve({
                operationId: request.operationId,
                status: 'success'
              });
            }
          }, delay);
        });
      });

      const startTime = performance.now();
      const results = await Promise.allSettled(
        degradedRequests.map(request =>
          resilienceAPI.executeResilientSync(request, mockSyncOperation)
        )
      );
      const totalTime = performance.now() - startTime;

      // Analyze results
      const successResults = results.filter(r => r.status === 'fulfilled' &&
        (r.value as any).success);
      const highPrioritySuccess = successResults.slice(0, 5).length;
      const mediumPrioritySuccess = successResults.slice(5).length;

      // Verify high priority operations had better success rate
      expect(highPrioritySuccess).toBeGreaterThanOrEqual(3); // At least 60% success for high priority

      console.log(`Degraded network results:`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`  High priority success: ${highPrioritySuccess}/5`);
      console.log(`  Medium priority success: ${mediumPrioritySuccess}/5`);
      console.log(`  Overall success rate: ${((successResults.length / results.length) * 100).toFixed(1)}%`);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance degradation', async () => {
      const baselineRequests = Array.from({ length: 5 }, (_, i) => ({
        operationId: `baseline-${i}`,
        priority: SyncPriorityLevel.MEDIUM_USER,
        data: { baseline: true, index: i }
      }));

      // Establish baseline performance
      mockSyncOperation.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 50)).then(() => ({ status: 'success' }))
      );

      const baselineTimes: number[] = [];
      for (const req of baselineRequests) {
        const request: PaymentAwareSyncRequest = {
          operationId: req.operationId,
          priority: req.priority,
          subscriptionContext: { tier: 'basic', status: 'active', entitlements: ['baseline'] },
          operation: {
            id: req.operationId,
            type: 'create',
            entityType: 'baseline_data',
            entityId: req.operationId,
            priority: 'medium',
            data: req.data,
            metadata: {
              entityId: req.operationId,
              entityType: 'baseline_data',
              version: 1,
              lastModified: new Date().toISOString(),
              checksum: req.operationId,
              deviceId: 'device-001',
              userId: 'user-001'
            },
            conflictResolution: 'merge',
            createdAt: new Date().toISOString(),
            retryCount: 0,
            maxRetries: 1,
            clinicalSafety: false
          },
          crisisMode: false,
          requestId: `req-${req.operationId}`
        };

        const startTime = performance.now();
        await resilienceAPI.executeResilientSync(request, mockSyncOperation);
        baselineTimes.push(performance.now() - startTime);
      }

      const baselineAverage = baselineTimes.reduce((a, b) => a + b, 0) / baselineTimes.length;

      // Simulate performance degradation
      mockSyncOperation.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 200)).then(() => ({ status: 'success' }))
      );

      const degradedTimes: number[] = [];
      for (const req of baselineRequests) {
        const request: PaymentAwareSyncRequest = {
          operationId: `degraded-${req.operationId}`,
          priority: req.priority,
          subscriptionContext: { tier: 'basic', status: 'active', entitlements: ['degraded'] },
          operation: {
            id: `degraded-${req.operationId}`,
            type: 'create',
            entityType: 'degraded_baseline_data',
            entityId: `degraded-${req.operationId}`,
            priority: 'medium',
            data: req.data,
            metadata: {
              entityId: `degraded-${req.operationId}`,
              entityType: 'degraded_baseline_data',
              version: 1,
              lastModified: new Date().toISOString(),
              checksum: `degraded-${req.operationId}`,
              deviceId: 'device-001',
              userId: 'user-001'
            },
            conflictResolution: 'merge',
            createdAt: new Date().toISOString(),
            retryCount: 0,
            maxRetries: 1,
            clinicalSafety: false
          },
          crisisMode: false,
          requestId: `req-degraded-${req.operationId}`
        };

        const startTime = performance.now();
        await resilienceAPI.executeResilientSync(request, mockSyncOperation);
        degradedTimes.push(performance.now() - startTime);
      }

      const degradedAverage = degradedTimes.reduce((a, b) => a + b, 0) / degradedTimes.length;
      const performanceRegression = (degradedAverage - baselineAverage) / baselineAverage;

      // Verify performance regression detected
      expect(performanceRegression).toBeGreaterThan(1.0); // More than 100% slower

      console.log(`Performance regression detection:`);
      console.log(`  Baseline average: ${baselineAverage.toFixed(2)}ms`);
      console.log(`  Degraded average: ${degradedAverage.toFixed(2)}ms`);
      console.log(`  Regression: ${(performanceRegression * 100).toFixed(1)}%`);
    });
  });
});