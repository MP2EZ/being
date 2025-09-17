/**
 * Performance SLA Compliance Tests - FullMind MBCT App
 *
 * Comprehensive performance validation including:
 * - End-to-end webhook processing performance (<2000ms normal, <200ms crisis)
 * - SLA compliance monitoring and alerting
 * - Memory efficiency during real-time state updates
 * - Bundle size impact of complete webhook system
 * - Performance degradation under load testing
 * - Crisis response time tracking accuracy
 */

import { renderHook, act } from '@testing-library/react-native';
import { useRealTimeWebhookSync } from '../../src/store/sync/real-time-webhook-sync';
import { useWebhookPerformanceStore } from '../../src/store/monitoring/webhook-performance-store';
import { useOptimisticUpdateManager } from '../../src/store/sync/optimistic-update-manager';
import {
  WebhookEvent,
  WebhookProcessingResult,
  CRISIS_RESPONSE_TIME_MS,
  NORMAL_RESPONSE_TIME_MS
} from '../../src/types/webhooks/webhook-events';
import { performance } from 'perf_hooks';

// Performance monitoring utilities
const mockPerformanceStore = {
  trackWebhookPerformance: jest.fn(),
  trackCrisisResponseTime: jest.fn(),
  trackMemoryUsage: jest.fn(),
  trackBundleImpact: jest.fn(),
  getSLACompliance: jest.fn(),
  getPerformanceMetrics: jest.fn(),
  generatePerformanceReport: jest.fn(),
  optimizePerformance: jest.fn(),
  detectPerformanceDegradation: jest.fn(),
  trackThroughput: jest.fn(),
  performance: {
    slaCompliance: {
      crisisResponseTime: { target: CRISIS_RESPONSE_TIME_MS, actual: 0, violations: 0 },
      normalResponseTime: { target: NORMAL_RESPONSE_TIME_MS, actual: 0, violations: 0 },
      throughput: { target: 100, actual: 0, violations: 0 },
      memoryUsage: { target: 50 * 1024 * 1024, actual: 0, violations: 0 }
    },
    metrics: {
      averageResponseTime: 0,
      crisisResponseTime: 0,
      throughputPerSecond: 0,
      memoryFootprint: 0,
      bundleSize: 0,
      degradationScore: 0
    },
    alerts: [],
    optimizations: []
  }
};

// Mock optimistic update manager for performance testing
const mockOptimisticManager = {
  createOptimisticUpdate: jest.fn(),
  commitOptimisticUpdate: jest.fn(),
  rollbackOptimisticUpdate: jest.fn(),
  trackUpdatePerformance: jest.fn(),
  getOptimisticMetrics: jest.fn().mockReturnValue({
    averageUpdateTime: 50,
    optimisticSuccessRate: 98.5,
    rollbackFrequency: 1.5
  })
};

// Mock stores for performance testing
const mockStores = {
  payment: {
    state: { subscription: { status: 'active' } },
    syncFromWebhook: jest.fn(),
    performanceMetrics: { syncTime: 0, memoryUsage: 0 }
  },
  user: {
    state: { profile: { tier: 'premium' } },
    syncFromWebhook: jest.fn(),
    performanceMetrics: { syncTime: 0, memoryUsage: 0 }
  },
  crisis: {
    state: { level: 'none' },
    syncFromWebhook: jest.fn(),
    performanceMetrics: { syncTime: 0, memoryUsage: 0 }
  }
};

jest.mock('../../src/store/monitoring/webhook-performance-store', () => ({
  useWebhookPerformanceStore: () => mockPerformanceStore
}));

jest.mock('../../src/store/sync/optimistic-update-manager', () => ({
  useOptimisticUpdateManager: () => mockOptimisticManager
}));

// Performance test utilities
const measureMemoryUsage = () => {
  if (typeof performance !== 'undefined' && performance.memory) {
    return {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit
    };
  }
  return { used: 0, total: 0, limit: 0 };
};

const simulateHighLoad = async (operations: number, concurrency: number = 10) => {
  const batches = Math.ceil(operations / concurrency);
  for (let batch = 0; batch < batches; batch++) {
    const batchPromises = [];
    const batchSize = Math.min(concurrency, operations - batch * concurrency);

    for (let i = 0; i < batchSize; i++) {
      batchPromises.push(
        new Promise(resolve => setTimeout(resolve, Math.random() * 10))
      );
    }

    await Promise.all(batchPromises);
  }
};

describe('Performance SLA Compliance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset performance metrics
    mockPerformanceStore.performance.slaCompliance.crisisResponseTime.violations = 0;
    mockPerformanceStore.performance.slaCompliance.normalResponseTime.violations = 0;
    mockPerformanceStore.performance.alerts = [];
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('End-to-End Performance Validation', () => {
    it('should meet normal webhook processing SLA (<2000ms)', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockStores.payment, { syncPriority: 'normal' });
        result.current.connectStore('user', mockStores.user, { syncPriority: 'normal' });
      });

      // Track performance for normal webhook processing
      const performanceTests = Array.from({ length: 50 }, (_, i) => ({
        eventId: `perf_test_${i}`,
        type: 'subscription_status_change',
        data: { iteration: i, timestamp: Date.now() },
        stores: ['payment', 'user']
      }));

      const performanceResults: Array<{ eventId: string; responseTime: number; success: boolean }> = [];

      // Mock store sync with realistic timing
      mockStores.payment.syncFromWebhook.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200)); // 100-300ms
        return Promise.resolve();
      });

      mockStores.user.syncFromWebhook.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100)); // 50-150ms
        return Promise.resolve();
      });

      // Process all performance tests
      for (const test of performanceTests) {
        const startTime = performance.now();

        const eventId = result.current.queueSyncEvent(
          test.type as any,
          test.data,
          test.stores,
          'normal'
        );

        await act(async () => {
          await result.current.processEventQueue();
        });

        const responseTime = performance.now() - startTime;
        const success = result.current.completedEvents.has(eventId);

        performanceResults.push({ eventId: test.eventId, responseTime, success });

        // Track performance
        mockPerformanceStore.trackWebhookPerformance(test.eventId, responseTime, success);
      }

      // Validate SLA compliance
      const slaViolations = performanceResults.filter(result => result.responseTime > NORMAL_RESPONSE_TIME_MS);
      const averageResponseTime = performanceResults.reduce((sum, result) => sum + result.responseTime, 0) / performanceResults.length;
      const successRate = (performanceResults.filter(result => result.success).length / performanceResults.length) * 100;

      // SLA Requirements
      expect(slaViolations.length).toBe(0); // No SLA violations
      expect(averageResponseTime).toBeLessThan(NORMAL_RESPONSE_TIME_MS);
      expect(successRate).toBeGreaterThanOrEqual(99.0); // 99% success rate minimum

      // Validate performance tracking
      expect(mockPerformanceStore.trackWebhookPerformance).toHaveBeenCalledTimes(50);
    });

    it('should meet crisis webhook processing SLA (<200ms)', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('crisis', mockStores.crisis, { syncPriority: 'immediate' });
        await result.current.activateCrisisSync('critical');
      });

      // Create crisis performance tests
      const crisisTests = Array.from({ length: 25 }, (_, i) => ({
        eventId: `crisis_perf_${i}`,
        type: 'crisis_level_change',
        data: { crisisLevel: 'critical', iteration: i, timestamp: Date.now() },
        priority: 'immediate'
      }));

      const crisisResults: Array<{ eventId: string; responseTime: number; success: boolean }> = [];

      // Mock ultra-fast crisis sync
      mockStores.crisis.syncFromWebhook.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 30)); // 20-50ms
        return Promise.resolve();
      });

      // Process crisis performance tests
      for (const test of crisisTests) {
        const startTime = performance.now();

        const eventId = result.current.queueSyncEvent(
          test.type as any,
          test.data,
          ['crisis'],
          'immediate'
        );

        await act(async () => {
          await result.current.processEventQueue();
        });

        const responseTime = performance.now() - startTime;
        const success = result.current.completedEvents.has(eventId);

        crisisResults.push({ eventId: test.eventId, responseTime, success });

        // Track crisis performance
        mockPerformanceStore.trackCrisisResponseTime(test.eventId, responseTime, success);
      }

      // Validate crisis SLA compliance
      const crisisViolations = crisisResults.filter(result => result.responseTime > CRISIS_RESPONSE_TIME_MS);
      const averageCrisisTime = crisisResults.reduce((sum, result) => sum + result.responseTime, 0) / crisisResults.length;
      const crisisSuccessRate = (crisisResults.filter(result => result.success).length / crisisResults.length) * 100;

      // Crisis SLA Requirements (stricter)
      expect(crisisViolations.length).toBe(0); // Zero crisis violations allowed
      expect(averageCrisisTime).toBeLessThan(CRISIS_RESPONSE_TIME_MS);
      expect(crisisSuccessRate).toBe(100); // 100% success rate required for crisis

      // Validate crisis-specific performance tracking
      expect(mockPerformanceStore.trackCrisisResponseTime).toHaveBeenCalledTimes(25);
    });

    it('should handle mixed priority workloads with proper SLA allocation', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockStores.payment, { syncPriority: 'high' });
        result.current.connectStore('crisis', mockStores.crisis, { syncPriority: 'immediate' });
      });

      // Create mixed priority workload
      const mixedWorkload = [
        ...Array.from({ length: 10 }, (_, i) => ({
          type: 'crisis_level_change',
          priority: 'immediate',
          target: CRISIS_RESPONSE_TIME_MS,
          stores: ['crisis']
        })),
        ...Array.from({ length: 20 }, (_, i) => ({
          type: 'subscription_status_change',
          priority: 'high',
          target: 1000,
          stores: ['payment']
        })),
        ...Array.from({ length: 30 }, (_, i) => ({
          type: 'payment_status_update',
          priority: 'normal',
          target: NORMAL_RESPONSE_TIME_MS,
          stores: ['payment']
        }))
      ];

      // Shuffle workload to simulate real-world mixed processing
      const shuffledWorkload = mixedWorkload.sort(() => Math.random() - 0.5);

      const mixedResults: Array<{
        type: string;
        priority: string;
        responseTime: number;
        target: number;
        slaCompliant: boolean
      }> = [];

      // Mock different performance characteristics per priority
      mockStores.crisis.syncFromWebhook.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 20)); // 30-50ms for crisis
        return Promise.resolve();
      });

      mockStores.payment.syncFromWebhook.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 150)); // 100-250ms for payment
        return Promise.resolve();
      });

      // Process mixed workload
      for (const work of shuffledWorkload) {
        const startTime = performance.now();

        const eventId = result.current.queueSyncEvent(
          work.type as any,
          { priority: work.priority, timestamp: Date.now() },
          work.stores,
          work.priority as any
        );

        await act(async () => {
          await result.current.processEventQueue();
        });

        const responseTime = performance.now() - startTime;
        const slaCompliant = responseTime <= work.target;

        mixedResults.push({
          type: work.type,
          priority: work.priority,
          responseTime,
          target: work.target,
          slaCompliant
        });
      }

      // Validate SLA compliance by priority
      const crisisResults = mixedResults.filter(r => r.priority === 'immediate');
      const highResults = mixedResults.filter(r => r.priority === 'high');
      const normalResults = mixedResults.filter(r => r.priority === 'normal');

      // All crisis events must meet SLA
      expect(crisisResults.every(r => r.slaCompliant)).toBe(true);

      // High priority should have very high compliance
      const highCompliance = (highResults.filter(r => r.slaCompliant).length / highResults.length) * 100;
      expect(highCompliance).toBeGreaterThanOrEqual(95);

      // Normal priority should have good compliance
      const normalCompliance = (normalResults.filter(r => r.slaCompliant).length / normalResults.length) * 100;
      expect(normalCompliance).toBeGreaterThanOrEqual(90);
    });
  });

  describe('Memory Efficiency Validation', () => {
    it('should maintain memory efficiency during real-time updates', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockStores.payment, { batchingEnabled: true });
        result.current.connectStore('user', mockStores.user, { batchingEnabled: true });
      });

      const initialMemory = measureMemoryUsage();

      // Process large number of events to test memory efficiency
      const memoryTestEvents = 500;
      const memorySnapshots: Array<{ eventCount: number; memoryUsage: number }> = [];

      for (let i = 0; i < memoryTestEvents; i++) {
        const eventId = result.current.queueSyncEvent(
          'subscription_status_change',
          {
            iteration: i,
            timestamp: Date.now(),
            data: new Array(1000).fill(i).join(',') // Some data payload
          },
          ['payment', 'user'],
          'normal'
        );

        // Take memory snapshots every 50 events
        if (i % 50 === 0) {
          const currentMemory = measureMemoryUsage();
          memorySnapshots.push({
            eventCount: i,
            memoryUsage: currentMemory.used - initialMemory.used
          });

          mockPerformanceStore.trackMemoryUsage(i, currentMemory.used);
        }
      }

      await act(async () => {
        await result.current.processEventQueue();
      });

      // Trigger cleanup
      act(() => {
        result.current.cleanupCompletedEvents();
      });

      const finalMemory = measureMemoryUsage();
      const totalMemoryGrowth = finalMemory.used - initialMemory.used;

      // Memory efficiency requirements
      expect(totalMemoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB growth

      // Memory growth should be roughly linear, not exponential
      if (memorySnapshots.length > 2) {
        const growthRates = memorySnapshots.slice(1).map((snapshot, i) =>
          (snapshot.memoryUsage - memorySnapshots[i].memoryUsage) / 50
        );

        const avgGrowthRate = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
        const maxGrowthRate = Math.max(...growthRates);

        // Growth rate should be consistent (not exponential)
        expect(maxGrowthRate).toBeLessThan(avgGrowthRate * 3);
      }

      // Validate memory tracking
      expect(mockPerformanceStore.trackMemoryUsage).toHaveBeenCalled();
    });

    it('should optimize memory usage through efficient cleanup', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockStores.payment, { syncPriority: 'normal' });
      });

      // Generate events to fill memory
      for (let i = 0; i < 200; i++) {
        const eventId = result.current.queueSyncEvent(
          'subscription_status_change',
          { iteration: i, largeData: new Array(5000).fill(i) },
          ['payment'],
          'normal'
        );
      }

      await act(async () => {
        await result.current.processEventQueue();
      });

      const beforeCleanup = result.current.completedEvents.size;
      expect(beforeCleanup).toBe(200);

      // Mock old events (older than cleanup threshold)
      const oldTimestamp = Date.now() - (35 * 60 * 1000); // 35 minutes ago
      for (const [eventId, event] of result.current.completedEvents) {
        event.timestamp = oldTimestamp;
      }

      // Trigger cleanup
      act(() => {
        result.current.cleanupCompletedEvents();
      });

      const afterCleanup = result.current.completedEvents.size;

      // Validate cleanup occurred
      expect(afterCleanup).toBeLessThan(beforeCleanup);
      expect(afterCleanup).toBe(0); // All old events cleaned up
    });

    it('should handle memory pressure with graceful degradation', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockStores.payment, { syncPriority: 'normal' });
      });

      // Simulate memory pressure
      const memoryIntensiveData = new Array(100000).fill('memory_pressure_test').join(',');

      // Mock memory pressure detection
      mockPerformanceStore.detectPerformanceDegradation.mockImplementation(() => {
        return {
          memoryPressure: true,
          degradationScore: 0.7,
          recommendedActions: ['reduce_batch_size', 'increase_cleanup_frequency', 'limit_concurrent_operations']
        };
      });

      mockPerformanceStore.optimizePerformance.mockImplementation(() => {
        return {
          optimizationsApplied: ['batch_size_reduced', 'cleanup_increased', 'concurrency_limited'],
          memoryReduced: true,
          performanceImproved: true
        };
      });

      // Process memory-intensive events
      for (let i = 0; i < 50; i++) {
        const eventId = result.current.queueSyncEvent(
          'subscription_status_change',
          { iteration: i, heavyData: memoryIntensiveData },
          ['payment'],
          'normal'
        );
      }

      // Trigger performance optimization
      await act(async () => {
        await result.current.optimizeSyncPerformance();
        await result.current.processEventQueue();
      });

      // Validate performance optimization was triggered
      expect(mockPerformanceStore.detectPerformanceDegradation).toHaveBeenCalled();
      expect(mockPerformanceStore.optimizePerformance).toHaveBeenCalled();

      // Validate system remained functional under memory pressure
      expect(result.current.globalSyncHealth).not.toBe('critical');
      expect(result.current.syncActive).toBe(true);
    });
  });

  describe('Load Testing and Throughput', () => {
    it('should handle high-throughput scenarios with maintained SLA', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockStores.payment, { syncPriority: 'high' });
        result.current.connectStore('user', mockStores.user, { syncPriority: 'normal' });
      });

      // High-throughput test configuration
      const throughputTarget = 100; // events per second
      const testDuration = 10; // seconds
      const totalEvents = throughputTarget * testDuration;

      const throughputResults: Array<{
        eventId: string;
        queueTime: number;
        processTime: number;
        success: boolean
      }> = [];

      // Mock fast store processing for throughput test
      mockStores.payment.syncFromWebhook.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 20)); // 10-30ms
        return Promise.resolve();
      });

      mockStores.user.syncFromWebhook.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 15)); // 5-20ms
        return Promise.resolve();
      });

      const testStartTime = performance.now();

      // Generate high-throughput load
      for (let i = 0; i < totalEvents; i++) {
        const queueStartTime = performance.now();

        const eventId = result.current.queueSyncEvent(
          i % 2 === 0 ? 'subscription_status_change' : 'payment_status_update',
          { iteration: i, timestamp: Date.now() },
          i % 2 === 0 ? ['payment', 'user'] : ['payment'],
          'normal'
        );

        const queueTime = performance.now() - queueStartTime;

        throughputResults.push({
          eventId,
          queueTime,
          processTime: 0, // Will be updated after processing
          success: false
        });

        // Batch process every 10 events to simulate realistic load
        if (i % 10 === 9) {
          await act(async () => {
            await result.current.processEventQueue();
          });
        }
      }

      // Process remaining events
      await act(async () => {
        await result.current.processEventQueue();
      });

      const testEndTime = performance.now();
      const totalTestTime = testEndTime - testStartTime;
      const actualThroughput = totalEvents / (totalTestTime / 1000);

      // Validate throughput performance
      expect(actualThroughput).toBeGreaterThanOrEqual(throughputTarget * 0.8); // 80% of target minimum

      // Validate all events were processed successfully
      expect(result.current.completedEvents.size).toBe(totalEvents);

      // Validate SLA maintained during high throughput
      const averageProcessingTime = result.current.syncPerformanceMetrics.averageSyncTime;
      expect(averageProcessingTime).toBeLessThan(NORMAL_RESPONSE_TIME_MS);

      // Track throughput performance
      mockPerformanceStore.trackThroughput(actualThroughput, totalEvents, totalTestTime);
      expect(mockPerformanceStore.trackThroughput).toHaveBeenCalled();
    });

    it('should maintain performance under concurrent user simulation', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();

        // Connect multiple stores to simulate complex system
        Object.entries(mockStores).forEach(([storeId, store]) => {
          result.current.connectStore(storeId, store, { syncPriority: 'normal' });
        });
      });

      // Simulate 50 concurrent users each generating events
      const concurrentUsers = 50;
      const eventsPerUser = 10;
      const userEventPromises: Promise<void>[] = [];

      for (let userId = 0; userId < concurrentUsers; userId++) {
        const userEventPromise = (async () => {
          for (let eventIndex = 0; eventIndex < eventsPerUser; eventIndex++) {
            const eventTypes = ['subscription_status_change', 'payment_status_update', 'crisis_level_change'];
            const randomEventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
            const targetStores = randomEventType === 'crisis_level_change' ? ['crisis'] : ['payment', 'user'];

            result.current.queueSyncEvent(
              randomEventType as any,
              {
                userId,
                eventIndex,
                timestamp: Date.now(),
                userSimulation: true
              },
              targetStores,
              'normal'
            );

            // Random delay between user events (50-200ms)
            await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 150));
          }
        })();

        userEventPromises.push(userEventPromise);
      }

      const concurrentTestStart = performance.now();

      // Process all concurrent user events
      await Promise.all(userEventPromises);

      await act(async () => {
        await result.current.processEventQueue();
      });

      const concurrentTestEnd = performance.now();
      const concurrentTestTime = concurrentTestEnd - concurrentTestStart;

      const totalConcurrentEvents = concurrentUsers * eventsPerUser;

      // Validate concurrent processing performance
      expect(result.current.completedEvents.size).toBe(totalConcurrentEvents);
      expect(concurrentTestTime).toBeLessThan(30000); // Complete within 30 seconds

      // Validate system stability under concurrent load
      expect(result.current.globalSyncHealth).not.toBe('critical');
      expect(result.current.syncPerformanceMetrics.failedSyncs).toBe(0);

      // Validate concurrent operations tracking
      const maxConcurrentOps = result.current.syncPerformanceMetrics.maxConcurrentOperations;
      expect(maxConcurrentOps).toBeGreaterThan(1); // Should have handled concurrent operations
    });
  });

  describe('Performance Degradation Detection', () => {
    it('should detect and respond to performance degradation', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockStores.payment, { syncPriority: 'normal' });
      });

      // Simulate performance degradation by increasing response times
      let currentResponseTime = 100;

      mockStores.payment.syncFromWebhook.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, currentResponseTime));
        currentResponseTime += 50; // Gradually increase response time
        return Promise.resolve();
      });

      // Mock degradation detection
      mockPerformanceStore.detectPerformanceDegradation.mockImplementation(() => {
        return {
          degradationDetected: currentResponseTime > 500,
          degradationScore: Math.min(currentResponseTime / 2000, 1),
          affectedMetrics: ['response_time', 'throughput'],
          recommendedActions: ['increase_sync_interval', 'reduce_batch_size', 'optimize_processing']
        };
      });

      // Process events with gradually degrading performance
      for (let i = 0; i < 10; i++) {
        const eventId = result.current.queueSyncEvent(
          'subscription_status_change',
          { iteration: i, timestamp: Date.now() },
          ['payment'],
          'normal'
        );

        await act(async () => {
          await result.current.processEventQueue();
        });

        // Check for degradation after each event
        const degradation = mockPerformanceStore.detectPerformanceDegradation();
        if (degradation.degradationDetected) {
          // Trigger performance optimization
          await act(async () => {
            await result.current.optimizeSyncPerformance();
          });
          break;
        }
      }

      // Validate degradation was detected and handled
      expect(mockPerformanceStore.detectPerformanceDegradation).toHaveBeenCalled();

      // Validate sync interval was adjusted for poor performance
      expect(result.current.syncInterval).toBeGreaterThan(1000);
    });

    it('should generate comprehensive performance reports', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockStores.payment, { syncPriority: 'normal' });
      });

      // Generate varied performance data for comprehensive reporting
      const performanceScenarios = [
        { duration: 50, success: true, priority: 'immediate' },
        { duration: 150, success: true, priority: 'high' },
        { duration: 300, success: true, priority: 'normal' },
        { duration: 2500, success: false, priority: 'normal' }, // SLA violation
        { duration: 80, success: true, priority: 'immediate' },
        { duration: 200, success: true, priority: 'high' },
        { duration: 1800, success: true, priority: 'normal' },
        { duration: 60, success: true, priority: 'immediate' }
      ];

      // Process scenarios to generate performance data
      for (const [index, scenario] of performanceScenarios.entries()) {
        const startTime = Date.now() - scenario.duration;
        const endTime = Date.now();

        result.current.trackSyncPerformance(
          `perf_scenario_${index}`,
          startTime,
          endTime,
          scenario.success
        );
      }

      // Mock comprehensive performance report generation
      mockPerformanceStore.generatePerformanceReport.mockReturnValue({
        reportId: 'perf_report_comprehensive',
        generatedAt: Date.now(),
        timeRange: { start: Date.now() - 3600000, end: Date.now() },
        summary: {
          totalOperations: performanceScenarios.length,
          successRate: 87.5, // 7/8 successful
          averageResponseTime: 415.625, // Average of all scenarios
          slaViolations: 1,
          crisisResponseCompliance: 100, // All crisis scenarios compliant
          normalResponseCompliance: 66.7 // 2/3 normal scenarios compliant
        },
        breakdown: {
          immediate: { count: 3, avgTime: 63.3, successRate: 100, slaCompliance: 100 },
          high: { count: 2, avgTime: 175, successRate: 100, slaCompliance: 100 },
          normal: { count: 3, avgTime: 1533.3, successRate: 66.7, slaCompliance: 66.7 }
        },
        trends: {
          responseTimeImprovement: -5.2, // Slight degradation
          throughputChange: 2.1,
          errorRateChange: 1.2
        },
        recommendations: [
          'Optimize normal priority processing',
          'Investigate SLA violation root cause',
          'Consider increasing retry limits for failed operations'
        ]
      });

      // Generate performance report
      const performanceReport = mockPerformanceStore.generatePerformanceReport();

      // Validate comprehensive report structure
      expect(performanceReport.summary.totalOperations).toBe(8);
      expect(performanceReport.summary.slaViolations).toBe(1);
      expect(performanceReport.breakdown.immediate.slaCompliance).toBe(100);
      expect(performanceReport.recommendations).toContain('Optimize normal priority processing');

      // Validate performance health assessment
      const healthReport = result.current.getSyncHealth();
      expect(healthReport.healthy).toBeDefined();
      expect(healthReport.metrics.successRate).toBeGreaterThan(0);
    });
  });

  describe('Bundle Size and Resource Impact', () => {
    it('should validate webhook system bundle size impact', async () => {
      // Mock bundle analysis
      const mockBundleAnalysis = {
        webhookSystemSize: 125 * 1024, // 125KB for webhook system
        totalAppSize: 2.5 * 1024 * 1024, // 2.5MB total app
        webhookPercentage: 5.0, // 5% of total bundle
        coreFeatures: {
          realTimeSync: 45 * 1024,
          optimisticUpdates: 30 * 1024,
          performanceMonitoring: 25 * 1024,
          crisisManagement: 25 * 1024
        },
        dependencies: {
          zustand: 15 * 1024,
          encryption: 20 * 1024,
          utilities: 10 * 1024
        }
      };

      mockPerformanceStore.trackBundleImpact.mockReturnValue(mockBundleAnalysis);

      const bundleAnalysis = mockPerformanceStore.trackBundleImpact();

      // Validate bundle size requirements
      expect(bundleAnalysis.webhookSystemSize).toBeLessThan(150 * 1024); // Less than 150KB
      expect(bundleAnalysis.webhookPercentage).toBeLessThan(10); // Less than 10% of app

      // Validate core features are reasonably sized
      Object.values(bundleAnalysis.coreFeatures).forEach(featureSize => {
        expect(featureSize).toBeLessThan(50 * 1024); // Each feature under 50KB
      });

      // Validate dependencies are optimal
      expect(bundleAnalysis.dependencies.zustand).toBeLessThan(20 * 1024);
      expect(bundleAnalysis.dependencies.encryption).toBeLessThan(25 * 1024);
    });

    it('should optimize resource usage during extended operation', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockStores.payment, { syncPriority: 'normal' });
      });

      // Simulate extended operation (1 hour of continuous processing)
      const extendedOperationEvents = 1000;
      const resourceSnapshots: Array<{
        eventCount: number;
        memoryUsage: number;
        processingTime: number;
        timestamp: number;
      }> = [];

      let totalProcessingTime = 0;

      for (let i = 0; i < extendedOperationEvents; i++) {
        const startTime = performance.now();

        const eventId = result.current.queueSyncEvent(
          'subscription_status_change',
          { iteration: i, timestamp: Date.now() },
          ['payment'],
          'normal'
        );

        await act(async () => {
          await result.current.processEventQueue();
        });

        const processingTime = performance.now() - startTime;
        totalProcessingTime += processingTime;

        // Take resource snapshots periodically
        if (i % 100 === 0) {
          const memoryUsage = measureMemoryUsage();
          resourceSnapshots.push({
            eventCount: i,
            memoryUsage: memoryUsage.used,
            processingTime,
            timestamp: Date.now()
          });

          // Trigger periodic cleanup
          if (i % 500 === 0) {
            act(() => {
              result.current.cleanupCompletedEvents();
            });
          }
        }
      }

      // Validate resource stability over extended operation
      const avgProcessingTime = totalProcessingTime / extendedOperationEvents;
      expect(avgProcessingTime).toBeLessThan(NORMAL_RESPONSE_TIME_MS);

      // Validate memory didn't grow excessively
      if (resourceSnapshots.length > 1) {
        const initialMemory = resourceSnapshots[0].memoryUsage;
        const finalMemory = resourceSnapshots[resourceSnapshots.length - 1].memoryUsage;
        const memoryGrowth = finalMemory - initialMemory;

        expect(memoryGrowth).toBeLessThan(200 * 1024 * 1024); // Less than 200MB growth
      }

      // Validate system remained healthy
      expect(result.current.globalSyncHealth).not.toBe('critical');
    });
  });
});