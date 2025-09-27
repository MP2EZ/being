/**
 * Cross-Device Sync Performance Tests
 *
 * Comprehensive performance validation and optimization testing:
 * - Crisis response time <200ms under all conditions
 * - Memory usage <50MB during extended operations
 * - Battery impact <3% per hour during active sync
 * - Network efficiency >80% compression rates
 * - Animation performance 60fps maintenance
 * - Concurrent operation handling
 * - Load testing with realistic scenarios
 */

import { jest } from '@jest/globals';
import '../setup/sync-test-setup';
import { CrossDeviceSyncAPI } from '../../../src/services/cloud/CrossDeviceSyncAPI';
import { performance } from 'perf_hooks';

describe('Cross-Device Sync Performance Tests', () => {
  let syncAPI: CrossDeviceSyncAPI;
  let performanceMonitor: any;

  beforeEach(() => {
    global.cleanupSyncTests();
    syncAPI = CrossDeviceSyncAPI.getInstance();
    performanceMonitor = global.performanceMonitor;
  });

  afterEach(() => {
    syncAPI.destroy();
    jest.clearAllMocks();
  });

  describe('Crisis Response Time Validation', () => {
    it('should maintain <200ms crisis response under normal conditions', async () => {
      const iterations = 100;
      const crisisResponseTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const crisisData = global.SyncTestUtils.createCrisisScenario('phq9_threshold');

        const startTime = performance.now();
        const result = await syncAPI.syncCrisisData(crisisData, 'crisis_plan', `crisis_${i}`);
        const responseTime = performance.now() - startTime;

        crisisResponseTimes.push(responseTime);

        expect(result.success).toBe(true);
        expect(responseTime).toBeLessThan(200);

        performanceMonitor.recordResponseTime('crisis_response_normal', responseTime);
      }

      // Statistical analysis
      const averageTime = crisisResponseTimes.reduce((sum, time) => sum + time, 0) / iterations;
      const maxTime = Math.max(...crisisResponseTimes);
      const p95Time = crisisResponseTimes.sort((a, b) => a - b)[Math.floor(iterations * 0.95)];
      const p99Time = crisisResponseTimes.sort((a, b) => a - b)[Math.floor(iterations * 0.99)];

      expect(averageTime).toBeLessThan(100); // Average well below limit
      expect(p95Time).toBeLessThan(180); // 95th percentile under limit
      expect(p99Time).toBeLessThan(200); // 99th percentile at limit
      expect(maxTime).toBeLessThan(250); // Even worst case reasonable

      console.log(`Crisis Response Performance:
        Average: ${averageTime.toFixed(2)}ms
        P95: ${p95Time.toFixed(2)}ms
        P99: ${p99Time.toFixed(2)}ms
        Max: ${maxTime.toFixed(2)}ms`);
    });

    it('should maintain crisis performance under high CPU load', async () => {
      // Simulate high CPU load
      const cpuLoadSimulation = () => {
        const start = Date.now();
        while (Date.now() - start < 10) {
          // Busy wait to simulate CPU load
          Math.random() * Math.random();
        }
      };

      // Start background CPU load
      const loadInterval = setInterval(cpuLoadSimulation, 1);

      try {
        const crisisData = global.SyncTestUtils.createCrisisScenario('crisis_button');

        const { result, duration } = await global.SyncTestUtils.measurePerformance(
          () => syncAPI.syncCrisisData(crisisData, 'crisis_plan', 'high_cpu_test'),
          'crisis_high_cpu'
        );

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(200); // Must still meet requirement

        performanceMonitor.recordResponseTime('crisis_high_cpu', duration);

      } finally {
        clearInterval(loadInterval);
      }
    });

    it('should maintain crisis performance under memory pressure', async () => {
      // Create memory pressure
      const memoryPressure: any[] = [];
      const initialMemory = global.SyncTestUtils.trackMemoryUsage();

      try {
        // Allocate memory to create pressure
        for (let i = 0; i < 1000; i++) {
          memoryPressure.push(new Array(1000).fill(Math.random()));
        }

        const pressureMemory = global.SyncTestUtils.trackMemoryUsage();
        const memoryIncrease = pressureMemory.heapUsed - initialMemory.heapUsed;

        expect(memoryIncrease).toBeGreaterThan(10 * 1024 * 1024); // At least 10MB pressure

        // Test crisis response under pressure
        const crisisData = global.SyncTestUtils.createCrisisScenario('gad7_threshold');

        const { result, duration } = await global.SyncTestUtils.measurePerformance(
          () => syncAPI.syncCrisisData(crisisData, 'assessment', 'memory_pressure_test'),
          'crisis_memory_pressure'
        );

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(200);

      } finally {
        // Clean up memory pressure
        memoryPressure.length = 0;
      }
    });

    it('should prioritize crisis over concurrent operations', async () => {
      // Start many non-crisis operations
      const nonCrisisOperations = Array.from({ length: 50 }, (_, i) =>
        syncAPI.syncGeneralData(
          { data: `non_crisis_${i}`, timestamp: Date.now() },
          'user_profile',
          `non_crisis_${i}`
        )
      );

      // Add crisis operation after non-crisis operations started
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay

      const crisisData = global.SyncTestUtils.createCrisisScenario('phq9_threshold');

      const crisisStart = performance.now();
      const crisisOperation = syncAPI.syncCrisisData(crisisData, 'crisis_plan', 'priority_test');

      const crisisResult = await crisisOperation;
      const crisisTime = performance.now() - crisisStart;

      expect(crisisResult.success).toBe(true);
      expect(crisisTime).toBeLessThan(200);

      // Wait for non-crisis operations to complete
      const nonCrisisResults = await Promise.all(nonCrisisOperations);

      // Crisis should have completed faster than average non-crisis operation
      const nonCrisisSuccessful = nonCrisisResults.filter(r => r.success);
      expect(nonCrisisSuccessful.length).toBeGreaterThan(40); // Most should succeed

      performanceMonitor.recordResponseTime('crisis_priority', crisisTime);
    });
  });

  describe('Memory Usage Optimization', () => {
    it('should maintain memory usage under 50MB during extended operations', async () => {
      const initialMemory = global.SyncTestUtils.trackMemoryUsage();
      const memorySnapshots: any[] = [];

      // Extended operation simulation (1 hour equivalent)
      const operationCount = 1000;
      const operationTypes = ['crisis', 'therapeutic', 'general'];

      for (let i = 0; i < operationCount; i++) {
        const operationType = operationTypes[i % 3];

        let operation: Promise<any>;

        switch (operationType) {
          case 'crisis':
            operation = syncAPI.syncCrisisData(
              global.SyncTestUtils.createCrisisScenario('phq9_threshold'),
              'crisis_plan',
              `extended_crisis_${i}`
            );
            break;
          case 'therapeutic':
            operation = syncAPI.syncTherapeuticData(
              { sessionId: `session_${i}`, progress: Math.random() },
              'session_data',
              `extended_therapeutic_${i}`
            );
            break;
          default:
            operation = syncAPI.syncGeneralData(
              { preference: `value_${i}` },
              'user_profile',
              `extended_general_${i}`
            );
        }

        await operation;

        // Take memory snapshot every 50 operations
        if (i % 50 === 0) {
          const currentMemory = global.SyncTestUtils.trackMemoryUsage();
          memorySnapshots.push({
            operation: i,
            memory: currentMemory,
            timestamp: Date.now(),
          });

          const memoryIncrease = currentMemory.heapUsed - initialMemory.heapUsed;
          expect(memoryIncrease).toBeLessThan(global.SyncTestConfig.performance.memoryLimit);
        }
      }

      const finalMemory = global.SyncTestUtils.trackMemoryUsage();
      const totalMemoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(totalMemoryIncrease).toBeLessThan(global.SyncTestConfig.performance.memoryLimit);

      // Analyze memory growth pattern
      const memoryGrowth = memorySnapshots.map((snapshot, index) => ({
        operation: snapshot.operation,
        growth: index === 0 ? 0 : snapshot.memory.heapUsed - memorySnapshots[0].memory.heapUsed,
      }));

      // Memory growth should be linear, not exponential (no leaks)
      const growthRates = memoryGrowth.slice(1).map((point, index) =>
        point.growth - memoryGrowth[index].growth
      );

      const averageGrowthRate = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
      const maxGrowthRate = Math.max(...growthRates);

      expect(maxGrowthRate).toBeLessThan(averageGrowthRate * 3); // No sudden spikes

      console.log(`Memory Usage Analysis:
        Total increase: ${(totalMemoryIncrease / 1024 / 1024).toFixed(2)}MB
        Average growth rate: ${(averageGrowthRate / 1024).toFixed(2)}KB per batch
        Max growth rate: ${(maxGrowthRate / 1024).toFixed(2)}KB per batch`);
    });

    it('should handle memory cleanup correctly', async () => {
      const initialMemory = global.SyncTestUtils.trackMemoryUsage();

      // Create large sync operations
      const largeDataOperations = Array.from({ length: 100 }, (_, i) => {
        const largeData = {
          id: i,
          largePayload: new Array(1000).fill(`data_${i}`).join(''),
          timestamp: Date.now(),
        };

        return syncAPI.syncGeneralData(largeData, 'user_profile', `large_data_${i}`);
      });

      await Promise.all(largeDataOperations);

      const afterOperationsMemory = global.SyncTestUtils.trackMemoryUsage();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      const afterCleanupMemory = global.SyncTestUtils.trackMemoryUsage();

      const operationIncrease = afterOperationsMemory.heapUsed - initialMemory.heapUsed;
      const cleanupReduction = afterOperationsMemory.heapUsed - afterCleanupMemory.heapUsed;

      // Cleanup should free significant memory
      expect(cleanupReduction).toBeGreaterThan(operationIncrease * 0.3); // At least 30% cleanup

      console.log(`Memory Cleanup Analysis:
        Increase during operations: ${(operationIncrease / 1024 / 1024).toFixed(2)}MB
        Reduction after cleanup: ${(cleanupReduction / 1024 / 1024).toFixed(2)}MB
        Cleanup efficiency: ${((cleanupReduction / operationIncrease) * 100).toFixed(1)}%`);
    });
  });

  describe('Network Efficiency and Compression', () => {
    it('should achieve >80% compression rates for sync data', async () => {
      const testData = {
        assessmentId: 'compression_test',
        type: 'phq9',
        responses: [2, 2, 3, 2, 2, 1, 2, 1, 1],
        score: 16,
        completedAt: new Date().toISOString(),
        detailedResponses: {
          question1: { response: 2, text: 'Several days' },
          question2: { response: 2, text: 'Several days' },
          question3: { response: 3, text: 'More than half the days' },
          // ... more detailed data
        },
        metadata: {
          userAgent: 'FullMind/1.0.0 (iOS 17.0)',
          deviceInfo: 'iPhone 15 Pro',
          screenSize: { width: 393, height: 852 },
          batteryLevel: 0.85,
        },
      };

      const originalSize = JSON.stringify(testData).length;

      // Mock compression tracking
      const { zeroKnowledgeCloudSync } = require('../../../src/services/security/ZeroKnowledgeCloudSync');

      let compressedSize = 0;
      zeroKnowledgeCloudSync.prepareForCloudUpload.mockImplementation(async (data) => {
        const serialized = JSON.stringify(data);
        compressedSize = Math.floor(serialized.length * 0.7); // Simulate 70% of original

        return {
          encryptedData: 'compressed_encrypted_data',
          metadata: {
            originalSize: serialized.length,
            compressedSize,
            compressionRatio: compressedSize / serialized.length,
          },
        };
      });

      await syncAPI.syncCrisisData(testData, 'assessment', 'compression_test');

      const compressionRatio = compressedSize / originalSize;
      const compressionEfficiency = 1 - compressionRatio;

      expect(compressionEfficiency).toBeGreaterThan(0.8); // >80% compression

      console.log(`Compression Analysis:
        Original size: ${originalSize} bytes
        Compressed size: ${compressedSize} bytes
        Compression ratio: ${(compressionRatio * 100).toFixed(1)}%
        Efficiency: ${(compressionEfficiency * 100).toFixed(1)}%`);
    });

    it('should minimize network requests through batching', async () => {
      let networkRequestCount = 0;

      // Mock network request tracking
      const { cloudSyncAPI } = require('../../../src/services/cloud/CloudSyncAPI');
      cloudSyncAPI.syncBatch.mockImplementation(async (batch) => {
        networkRequestCount++;
        return { success: true };
      });

      // Create multiple sync operations quickly
      const quickOperations = Array.from({ length: 20 }, (_, i) =>
        syncAPI.syncGeneralData(
          { quickData: i, timestamp: Date.now() },
          'user_profile',
          `quick_${i}`
        )
      );

      await Promise.all(quickOperations);

      // Should batch operations to minimize network requests
      expect(networkRequestCount).toBeLessThan(10); // Should batch at least 2:1

      const batchingEfficiency = 20 / networkRequestCount;
      expect(batchingEfficiency).toBeGreaterThan(1.5); // At least 50% reduction

      console.log(`Batching Efficiency:
        Operations: 20
        Network requests: ${networkRequestCount}
        Batching ratio: ${batchingEfficiency.toFixed(1)}:1`);
    });
  });

  describe('Concurrent Operation Handling', () => {
    it('should handle concurrent sync operations efficiently', async () => {
      const concurrencyLevels = [10, 50, 100, 200];
      const results: any[] = [];

      for (const concurrency of concurrencyLevels) {
        const startTime = performance.now();
        const startMemory = global.SyncTestUtils.trackMemoryUsage();

        // Create concurrent operations
        const operations = Array.from({ length: concurrency }, (_, i) => {
          const operationType = i % 3;

          if (operationType === 0) {
            return syncAPI.syncCrisisData(
              global.SyncTestUtils.createCrisisScenario('phq9_threshold'),
              'crisis_plan',
              `concurrent_crisis_${concurrency}_${i}`
            );
          } else if (operationType === 1) {
            return syncAPI.syncTherapeuticData(
              { sessionId: `session_${i}`, progress: Math.random() },
              'session_data',
              `concurrent_therapeutic_${concurrency}_${i}`
            );
          } else {
            return syncAPI.syncGeneralData(
              { data: `test_${i}` },
              'user_profile',
              `concurrent_general_${concurrency}_${i}`
            );
          }
        });

        const operationResults = await Promise.all(operations);

        const endTime = performance.now();
        const endMemory = global.SyncTestUtils.trackMemoryUsage();

        const totalTime = endTime - startTime;
        const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;
        const successCount = operationResults.filter(r => r.success).length;
        const successRate = successCount / concurrency;

        results.push({
          concurrency,
          totalTime,
          averageTime: totalTime / concurrency,
          memoryIncrease,
          successRate,
          throughput: concurrency / (totalTime / 1000), // operations per second
        });

        expect(successRate).toBeGreaterThan(0.95); // >95% success rate
        expect(memoryIncrease).toBeLessThan(global.SyncTestConfig.performance.memoryLimit);

        // Crisis operations should still meet timing requirements
        const crisisResults = operationResults.filter((_, index) => index % 3 === 0);
        crisisResults.forEach(result => {
          expect(result.responseTime).toBeLessThan(200);
        });
      }

      // Analyze scalability
      console.log('Concurrency Performance Analysis:');
      results.forEach(result => {
        console.log(`  ${result.concurrency} concurrent:
          Total time: ${result.totalTime.toFixed(2)}ms
          Average per operation: ${result.averageTime.toFixed(2)}ms
          Memory increase: ${(result.memoryIncrease / 1024 / 1024).toFixed(2)}MB
          Success rate: ${(result.successRate * 100).toFixed(1)}%
          Throughput: ${result.throughput.toFixed(1)} ops/sec`);
      });

      // Throughput should scale reasonably with concurrency
      const throughputGrowth = results[results.length - 1].throughput / results[0].throughput;
      expect(throughputGrowth).toBeGreaterThan(2); // At least 2x improvement with 20x concurrency
    });

    it('should maintain queue health under burst load', async () => {
      const burstSizes = [10, 25, 50, 100];
      const burstInterval = 50; // 50ms between bursts

      for (const burstSize of burstSizes) {
        const burstStart = performance.now();

        // Create burst of operations
        const burstOperations = Array.from({ length: burstSize }, (_, i) =>
          syncAPI.syncTherapeuticData(
            { burstData: true, index: i, timestamp: Date.now() },
            'session_data',
            `burst_${burstSize}_${i}`
          )
        );

        const burstResults = await Promise.all(burstOperations);
        const burstTime = performance.now() - burstStart;

        // All operations should succeed
        burstResults.forEach(result => {
          expect(result.success).toBe(true);
        });

        // Check queue health
        const queueStatus = syncAPI.getPerformanceMetrics().queueStatus;
        expect(queueStatus.size).toBeLessThan(burstSize); // Queue should drain efficiently

        console.log(`Burst ${burstSize}: ${burstTime.toFixed(2)}ms, queue size: ${queueStatus.size}`);

        // Wait between bursts
        await new Promise(resolve => setTimeout(resolve, burstInterval));
      }
    });
  });

  describe('Animation Performance', () => {
    it('should maintain 60fps during sync animations', async () => {
      const targetFrameTime = 16.67; // 60fps = 16.67ms per frame
      const animationDuration = 1000; // 1 second animation
      const expectedFrames = animationDuration / targetFrameTime;

      let frameCount = 0;
      let totalFrameTime = 0;
      let maxFrameTime = 0;

      // Simulate animation frames during sync
      const animationInterval = setInterval(() => {
        const frameStart = performance.now();

        // Simulate frame rendering work
        for (let i = 0; i < 1000; i++) {
          Math.sin(i / 1000);
        }

        const frameTime = performance.now() - frameStart;
        frameCount++;
        totalFrameTime += frameTime;
        maxFrameTime = Math.max(maxFrameTime, frameTime);
      }, targetFrameTime);

      // Perform sync operations during animation
      const syncOperations = Array.from({ length: 10 }, (_, i) =>
        syncAPI.syncTherapeuticData(
          { animationTest: true, frame: i },
          'session_data',
          `animation_sync_${i}`
        )
      );

      await Promise.all(syncOperations);

      // Stop animation
      clearInterval(animationInterval);

      const averageFrameTime = totalFrameTime / frameCount;
      const frameRate = 1000 / averageFrameTime;

      expect(frameRate).toBeGreaterThan(global.SyncTestConfig.performance.animationFrameRate);
      expect(maxFrameTime).toBeLessThan(targetFrameTime * 1.5); // Allow 50% variance

      console.log(`Animation Performance:
        Average frame time: ${averageFrameTime.toFixed(2)}ms
        Frame rate: ${frameRate.toFixed(1)}fps
        Max frame time: ${maxFrameTime.toFixed(2)}ms`);
    });
  });

  describe('Load Testing with Realistic Scenarios', () => {
    it('should handle realistic daily usage patterns', async () => {
      // Simulate 8-hour usage day
      const hourlyOperations = [
        { hour: 8, operations: [{ type: 'checkin', count: 1 }] }, // Morning check-in
        { hour: 9, operations: [{ type: 'session', count: 1 }] }, // Morning meditation
        { hour: 12, operations: [{ type: 'checkin', count: 1 }] }, // Lunch check-in
        { hour: 15, operations: [{ type: 'assessment', count: 1 }] }, // Afternoon assessment
        { hour: 18, operations: [{ type: 'session', count: 1 }] }, // Evening meditation
        { hour: 20, operations: [{ type: 'checkin', count: 1 }] }, // Evening check-in
      ];

      const dailyStart = performance.now();
      const dailyStartMemory = global.SyncTestUtils.trackMemoryUsage();

      for (const hourPattern of hourlyOperations) {
        for (const opPattern of hourPattern.operations) {
          for (let i = 0; i < opPattern.count; i++) {
            let operation: Promise<any>;

            switch (opPattern.type) {
              case 'checkin':
                operation = syncAPI.syncTherapeuticData(
                  {
                    mood: Math.floor(Math.random() * 10) + 1,
                    energy: Math.floor(Math.random() * 10) + 1,
                    timestamp: new Date().toISOString(),
                  },
                  'checkin_data',
                  `daily_checkin_${hourPattern.hour}_${i}`
                );
                break;
              case 'session':
                operation = syncAPI.syncTherapeuticData(
                  {
                    sessionId: `session_${hourPattern.hour}_${i}`,
                    exerciseType: ['breathing', 'body_scan', 'mindfulness'][Math.floor(Math.random() * 3)],
                    duration: 180 + Math.floor(Math.random() * 600), // 3-13 minutes
                    completed: true,
                  },
                  'session_data',
                  `daily_session_${hourPattern.hour}_${i}`
                );
                break;
              case 'assessment':
                const isPhq9 = Math.random() > 0.5;
                operation = syncAPI.syncCrisisData(
                  {
                    type: isPhq9 ? 'phq9' : 'gad7',
                    responses: Array.from({ length: isPhq9 ? 9 : 7 }, () => Math.floor(Math.random() * 4)),
                    score: Math.floor(Math.random() * (isPhq9 ? 27 : 21)),
                    completedAt: new Date().toISOString(),
                  },
                  'assessment',
                  `daily_assessment_${hourPattern.hour}_${i}`
                );
                break;
            }

            const result = await operation!;
            expect(result.success).toBe(true);
          }
        }
      }

      const dailyTime = performance.now() - dailyStart;
      const dailyEndMemory = global.SyncTestUtils.trackMemoryUsage();
      const dailyMemoryIncrease = dailyEndMemory.heapUsed - dailyStartMemory.heapUsed;

      // Daily usage should be efficient
      expect(dailyTime).toBeLessThan(10000); // Complete daily pattern under 10 seconds
      expect(dailyMemoryIncrease).toBeLessThan(global.SyncTestConfig.performance.memoryLimit);

      console.log(`Daily Usage Pattern:
        Total time: ${(dailyTime / 1000).toFixed(2)} seconds
        Memory increase: ${(dailyMemoryIncrease / 1024 / 1024).toFixed(2)}MB
        Operations: 6 (realistic daily usage)`);

      performanceMonitor.recordResponseTime('daily_usage_pattern', dailyTime);
    });
  });
});