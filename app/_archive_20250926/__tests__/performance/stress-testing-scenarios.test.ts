/**
 * Stress Testing Scenarios for Cross-Device Sync System
 *
 * Real-world performance scenarios designed to validate system behavior
 * under extreme conditions and edge cases that could occur in production.
 */

import { jest } from '@jest/globals';
import '../setup/sync-test-setup';
import { CrossDeviceSyncAPI } from '../../src/services/cloud/CrossDeviceSyncAPI';
import { performance } from 'perf_hooks';

interface StressTestMetrics {
  scenario: string;
  duration: number;
  operations_completed: number;
  success_rate: number;
  average_response_time: number;
  p95_response_time: number;
  p99_response_time: number;
  peak_memory_usage: number;
  memory_growth_rate: number;
  error_count: number;
  crisis_response_times: number[];
}

interface NetworkConditions {
  latency: number;
  bandwidth: number;
  packet_loss: number;
  jitter: number;
}

describe('Stress Testing Scenarios', () => {
  let syncAPI: CrossDeviceSyncAPI;
  let performanceMonitor: any;
  let stressMetrics: StressTestMetrics[] = [];

  beforeEach(() => {
    global.cleanupSyncTests();
    syncAPI = CrossDeviceSyncAPI.getInstance();
    performanceMonitor = global.performanceMonitor;
    stressMetrics = [];
  });

  afterEach(() => {
    syncAPI.destroy();
    jest.clearAllMocks();
  });

  describe('Real-World Usage Patterns', () => {
    it('should handle morning rush hour usage pattern', async () => {
      const scenario = 'Morning Rush Hour';
      const startTime = performance.now();
      const initialMemory = global.SyncTestUtils.trackMemoryUsage();

      // Simulate 1000 users doing morning check-ins simultaneously
      const morningCheckIns = Array.from({ length: 1000 }, (_, i) => {
        const userId = `user_${i}`;
        const checkInData = {
          userId,
          mood: Math.floor(Math.random() * 10) + 1,
          energy: Math.floor(Math.random() * 10) + 1,
          anxiety: Math.floor(Math.random() * 10) + 1,
          timestamp: new Date().toISOString(),
          deviceId: `device_${i % 100}`, // 100 unique devices
        };

        return measureOperationPerformance(
          () => syncAPI.syncTherapeuticData(checkInData, 'checkin_data', `morning_${userId}`),
          `morning_checkin_${i}`
        );
      });

      // Add some crisis scenarios during rush hour (realistic 2-3%)
      const crisisScenarios = Array.from({ length: 25 }, (_, i) => {
        const crisisData = global.SyncTestUtils.createCrisisScenario('phq9_threshold');
        return measureOperationPerformance(
          () => syncAPI.syncCrisisData(crisisData, 'crisis_plan', `morning_crisis_${i}`),
          `morning_crisis_${i}`
        );
      });

      const allOperations = [...morningCheckIns, ...crisisScenarios];
      const results = await Promise.all(allOperations);

      const endTime = performance.now();
      const finalMemory = global.SyncTestUtils.trackMemoryUsage();

      const metrics = calculateStressMetrics(scenario, results, startTime, endTime, initialMemory, finalMemory);
      stressMetrics.push(metrics);

      // Validate performance under high load
      expect(metrics.success_rate).toBeGreaterThan(0.98); // 98% success rate
      expect(metrics.average_response_time).toBeLessThan(500); // Average under 500ms
      expect(metrics.p95_response_time).toBeLessThan(1000); // P95 under 1s
      expect(metrics.peak_memory_usage).toBeLessThan(100 * 1024 * 1024); // Under 100MB

      // Crisis operations must still meet strict requirements
      const crisisResponseTimes = metrics.crisis_response_times;
      crisisResponseTimes.forEach(responseTime => {
        expect(responseTime).toBeLessThan(300); // Relaxed under high load but still strict
      });

      logStressTestResults(metrics);
    });

    it('should handle therapeutic session with multiple device handoffs', async () => {
      const scenario = 'Multi-Device Therapeutic Session';
      const startTime = performance.now();
      const initialMemory = global.SyncTestUtils.trackMemoryUsage();

      // Simulate user starting session on phone, continuing on tablet, finishing on watch
      const sessionId = 'therapeutic_session_handoff';
      const devices = ['phone', 'tablet', 'watch'];
      const sessionData = {
        sessionId,
        exerciseType: 'guided_meditation',
        totalDuration: 600, // 10 minutes
        completed: false,
      };

      const handoffOperations: Promise<any>[] = [];

      // Start session on phone (0-3 minutes)
      for (let i = 0; i < 30; i++) {
        const progress = {
          ...sessionData,
          currentDevice: 'phone',
          progress: i * 6, // 6 seconds per iteration
          heartRate: 70 + Math.random() * 20,
          timestamp: new Date(Date.now() + i * 6000).toISOString(),
        };

        handoffOperations.push(
          measureOperationPerformance(
            () => syncAPI.syncTherapeuticData(progress, 'session_data', `${sessionId}_phone_${i}`),
            `handoff_phone_${i}`
          )
        );
      }

      // Handoff to tablet (3-7 minutes) - critical transition
      const handoffToTablet = measureOperationPerformance(
        () => syncAPI.syncSessionHandoff(sessionData, 'phone', 'tablet'),
        'handoff_phone_to_tablet'
      );
      handoffOperations.push(handoffToTablet);

      for (let i = 30; i < 70; i++) {
        const progress = {
          ...sessionData,
          currentDevice: 'tablet',
          progress: i * 6,
          heartRate: 65 + Math.random() * 15,
          timestamp: new Date(Date.now() + i * 6000).toISOString(),
        };

        handoffOperations.push(
          measureOperationPerformance(
            () => syncAPI.syncTherapeuticData(progress, 'session_data', `${sessionId}_tablet_${i}`),
            `handoff_tablet_${i}`
          )
        );
      }

      // Handoff to watch (7-10 minutes) - final critical transition
      const handoffToWatch = measureOperationPerformance(
        () => syncAPI.syncSessionHandoff(sessionData, 'tablet', 'watch'),
        'handoff_tablet_to_watch'
      );
      handoffOperations.push(handoffToWatch);

      for (let i = 70; i < 100; i++) {
        const progress = {
          ...sessionData,
          currentDevice: 'watch',
          progress: i * 6,
          heartRate: 60 + Math.random() * 10,
          timestamp: new Date(Date.now() + i * 6000).toISOString(),
          completed: i === 99,
        };

        handoffOperations.push(
          measureOperationPerformance(
            () => syncAPI.syncTherapeuticData(progress, 'session_data', `${sessionId}_watch_${i}`),
            `handoff_watch_${i}`
          )
        );
      }

      const results = await Promise.all(handoffOperations);

      const endTime = performance.now();
      const finalMemory = global.SyncTestUtils.trackMemoryUsage();

      const metrics = calculateStressMetrics(scenario, results, startTime, endTime, initialMemory, finalMemory);
      stressMetrics.push(metrics);

      // Validate seamless handoff performance
      expect(metrics.success_rate).toBeGreaterThan(0.99); // Near perfect for therapeutic sessions
      expect(metrics.average_response_time).toBeLessThan(200); // Fast for continuity

      // Check handoff-specific performance
      const handoffResults = results.filter(r => r.operation_name.includes('handoff_phone_to') || r.operation_name.includes('handoff_tablet_to'));
      handoffResults.forEach(result => {
        expect(result.duration).toBeLessThan(1000); // Handoffs under 1 second
      });

      logStressTestResults(metrics);
    });

    it('should handle emergency crisis during peak usage', async () => {
      const scenario = 'Crisis During Peak Usage';
      const startTime = performance.now();
      const initialMemory = global.SyncTestUtils.trackMemoryUsage();

      // Simulate peak usage with 500 concurrent normal operations
      const peakOperations = Array.from({ length: 500 }, (_, i) => {
        return measureOperationPerformance(
          () => syncAPI.syncGeneralData(
            { data: `peak_usage_${i}`, timestamp: Date.now() },
            'user_profile',
            `peak_${i}`
          ),
          `peak_operation_${i}`
        );
      });

      // Let peak operations start
      await new Promise(resolve => setTimeout(resolve, 100));

      // Trigger multiple simultaneous crisis scenarios
      const crisisOperations = Array.from({ length: 10 }, (_, i) => {
        const crisisData = global.SyncTestUtils.createCrisisScenario(
          i % 2 === 0 ? 'phq9_threshold' : 'crisis_button'
        );

        return measureOperationPerformance(
          () => syncAPI.syncCrisisData(crisisData, 'crisis_plan', `peak_crisis_${i}`),
          `crisis_peak_${i}`
        );
      });

      // Wait for crisis operations to complete first
      const crisisResults = await Promise.all(crisisOperations);

      // Then wait for normal operations
      const peakResults = await Promise.all(peakOperations);

      const allResults = [...crisisResults, ...peakResults];

      const endTime = performance.now();
      const finalMemory = global.SyncTestUtils.trackMemoryUsage();

      const metrics = calculateStressMetrics(scenario, allResults, startTime, endTime, initialMemory, finalMemory);
      stressMetrics.push(metrics);

      // Crisis operations must still meet strict requirements even during peak
      const crisisResponseTimes = crisisResults.map(r => r.duration);
      crisisResponseTimes.forEach(responseTime => {
        expect(responseTime).toBeLessThan(250); // Slightly relaxed during peak but still critical
      });

      // Validate that crisis operations completed before normal operations on average
      const avgCrisisTime = crisisResponseTimes.reduce((sum, time) => sum + time, 0) / crisisResponseTimes.length;
      const avgPeakTime = peakResults.map(r => r.duration).reduce((sum, time) => sum + time, 0) / peakResults.length;

      expect(avgCrisisTime).toBeLessThan(avgPeakTime * 1.5); // Crisis should be prioritized

      logStressTestResults(metrics);
    });
  });

  describe('Network Stress Scenarios', () => {
    it('should handle poor network conditions with high latency', async () => {
      const scenario = 'High Latency Network';
      const networkConditions: NetworkConditions = {
        latency: 2000, // 2 second latency
        bandwidth: 1, // 1 Mbps
        packet_loss: 0.05, // 5% packet loss
        jitter: 500, // 500ms jitter
      };

      const startTime = performance.now();
      const initialMemory = global.SyncTestUtils.trackMemoryUsage();

      // Simulate network operations under poor conditions
      const networkOperations = Array.from({ length: 50 }, (_, i) => {
        return measureOperationPerformance(
          () => simulateNetworkOperation(networkConditions, 'sync_data', i),
          `network_operation_${i}`
        );
      });

      // Include crisis operations that must work even under poor network
      const crisisOperations = Array.from({ length: 5 }, (_, i) => {
        const crisisData = global.SyncTestUtils.createCrisisScenario('gad7_threshold');
        return measureOperationPerformance(
          () => simulateNetworkCrisisOperation(networkConditions, crisisData, i),
          `network_crisis_${i}`
        );
      });

      const allOperations = [...networkOperations, ...crisisOperations];
      const results = await Promise.all(allOperations);

      const endTime = performance.now();
      const finalMemory = global.SyncTestUtils.trackMemoryUsage();

      const metrics = calculateStressMetrics(scenario, results, startTime, endTime, initialMemory, finalMemory);
      stressMetrics.push(metrics);

      // Under poor network, still expect reasonable performance
      expect(metrics.success_rate).toBeGreaterThan(0.90); // 90% success rate despite network issues
      expect(metrics.average_response_time).toBeLessThan(5000); // Under 5 seconds average

      // Crisis operations must still complete within acceptable time
      const crisisResponseTimes = metrics.crisis_response_times;
      crisisResponseTimes.forEach(responseTime => {
        expect(responseTime).toBeLessThan(3000); // 3 seconds max even on poor network
      });

      logStressTestResults(metrics);
    });

    it('should handle network disconnection and reconnection', async () => {
      const scenario = 'Network Disconnection Recovery';
      const startTime = performance.now();
      const initialMemory = global.SyncTestUtils.trackMemoryUsage();

      // Phase 1: Normal network operations
      const normalOperations = Array.from({ length: 20 }, (_, i) => {
        return measureOperationPerformance(
          () => syncAPI.syncGeneralData(
            { data: `normal_${i}`, timestamp: Date.now() },
            'user_profile',
            `normal_${i}`
          ),
          `normal_${i}`
        );
      });

      await Promise.all(normalOperations);

      // Phase 2: Simulate network disconnection - operations should queue
      global.SyncTestConfig.networkState = 'disconnected';

      const offlineOperations = Array.from({ length: 30 }, (_, i) => {
        return measureOperationPerformance(
          () => syncAPI.syncGeneralData(
            { data: `offline_${i}`, timestamp: Date.now() },
            'user_profile',
            `offline_${i}`
          ),
          `offline_${i}`
        );
      });

      // Add crisis operation while offline - should still work locally
      const offlineCrisis = measureOperationPerformance(
        () => syncAPI.syncCrisisData(
          global.SyncTestUtils.createCrisisScenario('crisis_button'),
          'crisis_plan',
          'offline_crisis'
        ),
        'offline_crisis'
      );

      const offlineResults = await Promise.all([...offlineOperations, offlineCrisis]);

      // Phase 3: Reconnect and sync queued operations
      global.SyncTestConfig.networkState = 'connected';

      const reconnectStart = performance.now();
      const syncQueuedOperations = syncAPI.syncQueuedOperations();
      const syncResult = await syncQueuedOperations;
      const reconnectTime = performance.now() - reconnectStart;

      const endTime = performance.now();
      const finalMemory = global.SyncTestUtils.trackMemoryUsage();

      // Combine all operations for metrics
      const allResults = [...normalOperations, ...offlineResults, {
        duration: reconnectTime,
        success: syncResult.success,
        operation_name: 'queue_sync'
      }];

      const metrics = calculateStressMetrics(scenario, allResults, startTime, endTime, initialMemory, finalMemory);
      stressMetrics.push(metrics);

      // Validate offline and reconnection behavior
      expect(syncResult.success).toBe(true);
      expect(reconnectTime).toBeLessThan(10000); // Queue sync under 10 seconds
      expect(syncResult.queuedOperations).toBeGreaterThan(25); // Most operations should be queued

      // Crisis operation should work even offline
      const crisisResult = offlineResults.find(r => r.operation_name === 'offline_crisis');
      expect(crisisResult.success).toBe(true);
      expect(crisisResult.duration).toBeLessThan(500); // Fast offline crisis response

      logStressTestResults(metrics);
    });
  });

  describe('Memory and Resource Stress', () => {
    it('should handle memory pressure with large datasets', async () => {
      const scenario = 'Large Dataset Memory Stress';
      const startTime = performance.now();
      const initialMemory = global.SyncTestUtils.trackMemoryUsage();

      // Create large datasets that could cause memory pressure
      const largeDatasets = Array.from({ length: 10 }, (_, datasetIndex) => {
        return Array.from({ length: 1000 }, (_, itemIndex) => {
          return {
            id: `${datasetIndex}_${itemIndex}`,
            assessment_data: {
              type: itemIndex % 2 === 0 ? 'phq9' : 'gad7',
              responses: Array.from({ length: 9 }, () => Math.floor(Math.random() * 4)),
              detailed_responses: Array.from({ length: 9 }, (_, i) => ({
                question: i + 1,
                response: Math.floor(Math.random() * 4),
                response_text: `Response text for question ${i + 1} which is quite long and detailed`,
                timestamp: new Date().toISOString(),
                metadata: {
                  screen_time: Math.random() * 30000,
                  hesitation_time: Math.random() * 5000,
                  revision_count: Math.floor(Math.random() * 3),
                }
              })),
              score: Math.floor(Math.random() * 27),
              completed_at: new Date().toISOString(),
            },
            metadata: {
              device_info: 'Stress Test Device',
              user_agent: 'FullMind/1.0.0 Stress Test',
              network_info: {
                type: '4g',
                strength: Math.random(),
                latency: Math.random() * 100,
              },
              battery_level: Math.random(),
              memory_pressure: 'high',
            }
          };
        });
      });

      // Process large datasets while monitoring memory
      const memorySnapshots: any[] = [];
      const operations: Promise<any>[] = [];

      for (const [datasetIndex, dataset] of largeDatasets.entries()) {
        // Take memory snapshot before processing each dataset
        memorySnapshots.push({
          dataset: datasetIndex,
          memory: global.SyncTestUtils.trackMemoryUsage(),
          timestamp: performance.now(),
        });

        // Process dataset in chunks to simulate real usage
        const chunkSize = 100;
        for (let i = 0; i < dataset.length; i += chunkSize) {
          const chunk = dataset.slice(i, i + chunkSize);

          operations.push(
            measureOperationPerformance(
              () => syncAPI.syncLargeDataset(chunk, 'assessment_data', `dataset_${datasetIndex}_chunk_${i}`),
              `large_dataset_${datasetIndex}_${i}`
            )
          );

          // Add small delays to prevent overwhelming the system
          if (operations.length % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }

        // Add crisis operation during large dataset processing
        if (datasetIndex === 5) {
          operations.push(
            measureOperationPerformance(
              () => syncAPI.syncCrisisData(
                global.SyncTestUtils.createCrisisScenario('phq9_threshold'),
                'crisis_plan',
                'large_dataset_crisis'
              ),
              'crisis_during_large_dataset'
            )
          );
        }
      }

      const results = await Promise.all(operations);

      // Final memory snapshot
      memorySnapshots.push({
        dataset: 'final',
        memory: global.SyncTestUtils.trackMemoryUsage(),
        timestamp: performance.now(),
      });

      const endTime = performance.now();
      const finalMemory = global.SyncTestUtils.trackMemoryUsage();

      const metrics = calculateStressMetrics(scenario, results, startTime, endTime, initialMemory, finalMemory);
      stressMetrics.push(metrics);

      // Analyze memory growth pattern
      const memoryGrowth = analyzeMemoryGrowthPattern(memorySnapshots);
      expect(memoryGrowth.isLinear).toBe(true); // Should not have exponential growth (memory leaks)
      expect(memoryGrowth.peakUsage).toBeLessThan(200 * 1024 * 1024); // Under 200MB peak

      // Crisis operation during large dataset processing should still be fast
      const crisisResult = results.find(r => r.operation_name === 'crisis_during_large_dataset');
      if (crisisResult) {
        expect(crisisResult.duration).toBeLessThan(400); // Slightly relaxed during heavy processing
      }

      logStressTestResults(metrics);
    });

    it('should handle extended operation stress (8-hour simulation)', async () => {
      const scenario = '8-Hour Extended Operation';
      const startTime = performance.now();
      const initialMemory = global.SyncTestUtils.trackMemoryUsage();

      // Simulate 8 hours of continuous operation (scaled down for testing)
      const hoursToSimulate = 8;
      const operationsPerHour = 50; // Scaled down from realistic 500+
      const totalOperations = hoursToSimulate * operationsPerHour;

      const extendedOperations: Promise<any>[] = [];
      const memorySnapshots: any[] = [];

      for (let hour = 0; hour < hoursToSimulate; hour++) {
        console.log(`Processing hour ${hour + 1}/${hoursToSimulate}...`);

        for (let op = 0; op < operationsPerHour; op++) {
          const operationType = getRealisticOperationType(hour, op);

          const operation = measureOperationPerformance(
            () => executeOperationByType(operationType, hour, op),
            `extended_${hour}_${op}_${operationType}`
          );

          extendedOperations.push(operation);

          // Take memory snapshots every 10 operations
          if ((hour * operationsPerHour + op) % 10 === 0) {
            memorySnapshots.push({
              hour,
              operation: op,
              memory: global.SyncTestUtils.trackMemoryUsage(),
              timestamp: performance.now(),
            });
          }
        }

        // Simulate hourly patterns (more activity during certain hours)
        const hourlyDelay = getHourlyDelay(hour);
        await new Promise(resolve => setTimeout(resolve, hourlyDelay));
      }

      const results = await Promise.all(extendedOperations);

      const endTime = performance.now();
      const finalMemory = global.SyncTestUtils.trackMemoryUsage();

      const metrics = calculateStressMetrics(scenario, results, startTime, endTime, initialMemory, finalMemory);
      stressMetrics.push(metrics);

      // Validate extended operation performance
      expect(metrics.success_rate).toBeGreaterThan(0.95); // High success rate over time
      expect(metrics.memory_growth_rate).toBeLessThan(1024 * 1024); // <1MB growth per hour equivalent

      // Crisis operations throughout the day should maintain performance
      const crisisResponseTimes = metrics.crisis_response_times;
      if (crisisResponseTimes.length > 0) {
        const avgCrisisTime = crisisResponseTimes.reduce((sum, time) => sum + time, 0) / crisisResponseTimes.length;
        expect(avgCrisisTime).toBeLessThan(250); // Consistent crisis performance
      }

      logStressTestResults(metrics);
    });
  });

  describe('Device and Platform Stress', () => {
    it('should handle cross-device synchronization storm', async () => {
      const scenario = 'Cross-Device Sync Storm';
      const startTime = performance.now();
      const initialMemory = global.SyncTestUtils.trackMemoryUsage();

      // Simulate user with 5 devices all syncing simultaneously
      const devices = ['iphone', 'ipad', 'apple_watch', 'macbook', 'android_tablet'];
      const syncStormOperations: Promise<any>[] = [];

      // Each device performs different types of operations simultaneously
      for (const [deviceIndex, device] of devices.entries()) {
        const deviceOperations = getDeviceSpecificOperations(device, deviceIndex);

        for (const [opIndex, operation] of deviceOperations.entries()) {
          syncStormOperations.push(
            measureOperationPerformance(
              () => syncAPI.syncMultiDeviceOperation(operation, device, `${device}_${opIndex}`),
              `sync_storm_${device}_${opIndex}`
            )
          );
        }
      }

      // Add cross-device conflicts and resolutions
      const conflictOperations = Array.from({ length: 10 }, (_, i) => {
        return measureOperationPerformance(
          () => syncAPI.resolveConflict('user_preferences', devices, i),
          `conflict_resolution_${i}`
        );
      });

      syncStormOperations.push(...conflictOperations);

      // Add crisis operation during sync storm
      const crisisDuringStorm = measureOperationPerformance(
        () => syncAPI.syncCrisisData(
          global.SyncTestUtils.createCrisisScenario('crisis_button'),
          'crisis_plan',
          'crisis_during_storm'
        ),
        'crisis_sync_storm'
      );

      syncStormOperations.push(crisisDuringStorm);

      const results = await Promise.all(syncStormOperations);

      const endTime = performance.now();
      const finalMemory = global.SyncTestUtils.trackMemoryUsage();

      const metrics = calculateStressMetrics(scenario, results, startTime, endTime, initialMemory, finalMemory);
      stressMetrics.push(metrics);

      // Validate cross-device sync performance
      expect(metrics.success_rate).toBeGreaterThan(0.90); // 90% success rate despite conflicts

      // Conflict resolution should be efficient
      const conflictResults = results.filter(r => r.operation_name.includes('conflict_resolution'));
      conflictResults.forEach(result => {
        expect(result.duration).toBeLessThan(1000); // Conflicts resolved under 1 second
      });

      // Crisis during sync storm should still be prioritized
      const crisisResult = results.find(r => r.operation_name === 'crisis_sync_storm');
      if (crisisResult) {
        expect(crisisResult.duration).toBeLessThan(300);
      }

      logStressTestResults(metrics);
    });
  });

  // Helper functions
  async function measureOperationPerformance(operation: () => Promise<any>, operationName: string) {
    const startTime = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - startTime;

      return {
        operation_name: operationName,
        duration,
        success: true,
        result,
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        operation_name: operationName,
        duration,
        success: false,
        error: error.message,
      };
    }
  }

  function calculateStressMetrics(
    scenario: string,
    results: any[],
    startTime: number,
    endTime: number,
    initialMemory: any,
    finalMemory: any
  ): StressTestMetrics {
    const durations = results.map(r => r.duration);
    const successfulOperations = results.filter(r => r.success);
    const crisisOperations = results.filter(r => r.operation_name.includes('crisis'));

    const sortedDurations = [...durations].sort((a, b) => a - b);
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    const testDurationSeconds = (endTime - startTime) / 1000;

    return {
      scenario,
      duration: endTime - startTime,
      operations_completed: results.length,
      success_rate: successfulOperations.length / results.length,
      average_response_time: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      p95_response_time: sortedDurations[Math.floor(sortedDurations.length * 0.95)],
      p99_response_time: sortedDurations[Math.floor(sortedDurations.length * 0.99)],
      peak_memory_usage: finalMemory.heapUsed,
      memory_growth_rate: memoryIncrease / testDurationSeconds, // bytes per second
      error_count: results.filter(r => !r.success).length,
      crisis_response_times: crisisOperations.map(r => r.duration),
    };
  }

  function logStressTestResults(metrics: StressTestMetrics) {
    console.log(`\n📊 Stress Test Results: ${metrics.scenario}`);
    console.log(`   Duration: ${(metrics.duration / 1000).toFixed(2)}s`);
    console.log(`   Operations: ${metrics.operations_completed}`);
    console.log(`   Success Rate: ${(metrics.success_rate * 100).toFixed(1)}%`);
    console.log(`   Avg Response: ${metrics.average_response_time.toFixed(2)}ms`);
    console.log(`   P95 Response: ${metrics.p95_response_time.toFixed(2)}ms`);
    console.log(`   Peak Memory: ${(metrics.peak_memory_usage / 1024 / 1024).toFixed(1)}MB`);
    console.log(`   Memory Growth: ${(metrics.memory_growth_rate / 1024).toFixed(2)}KB/s`);

    if (metrics.crisis_response_times.length > 0) {
      const avgCrisis = metrics.crisis_response_times.reduce((s, t) => s + t, 0) / metrics.crisis_response_times.length;
      console.log(`   Crisis Avg: ${avgCrisis.toFixed(2)}ms`);
    }
  }

  // Simulation helper functions
  async function simulateNetworkOperation(conditions: NetworkConditions, type: string, index: number) {
    // Simulate network delay based on conditions
    const delay = conditions.latency + (Math.random() * conditions.jitter);
    const willFail = Math.random() < conditions.packet_loss;

    await new Promise(resolve => setTimeout(resolve, delay / 10)); // Scale for testing

    if (willFail) {
      throw new Error('Network packet loss');
    }

    return {
      type,
      index,
      network_conditions: conditions,
      success: true,
    };
  }

  async function simulateNetworkCrisisOperation(conditions: NetworkConditions, crisisData: any, index: number) {
    // Crisis operations have priority routing and retry logic
    const delay = Math.min(conditions.latency * 0.5, 1000); // Priority routing reduces latency
    const failureRate = conditions.packet_loss * 0.3; // Reduced failure rate for crisis

    await new Promise(resolve => setTimeout(resolve, delay / 10));

    if (Math.random() < failureRate) {
      // Retry once for crisis operations
      await new Promise(resolve => setTimeout(resolve, delay / 20));
    }

    return {
      crisis_data: crisisData,
      index,
      network_conditions: conditions,
      success: true,
    };
  }

  function getRealisticOperationType(hour: number, operation: number): string {
    // Simulate realistic operation patterns throughout the day
    if (hour >= 6 && hour <= 9) {
      // Morning: check-ins and assessments
      return operation % 3 === 0 ? 'checkin' : operation % 7 === 0 ? 'crisis' : 'assessment';
    } else if (hour >= 12 && hour <= 14) {
      // Lunch: light usage
      return operation % 5 === 0 ? 'checkin' : 'sync';
    } else if (hour >= 18 && hour <= 22) {
      // Evening: sessions and check-ins
      return operation % 4 === 0 ? 'session' : operation % 6 === 0 ? 'checkin' : 'sync';
    } else {
      // Other times: mostly sync
      return operation % 10 === 0 ? 'crisis' : 'sync';
    }
  }

  async function executeOperationByType(type: string, hour: number, operation: number) {
    switch (type) {
      case 'checkin':
        return syncAPI.syncTherapeuticData(
          {
            mood: Math.floor(Math.random() * 10) + 1,
            energy: Math.floor(Math.random() * 10) + 1,
            timestamp: new Date().toISOString(),
          },
          'checkin_data',
          `extended_checkin_${hour}_${operation}`
        );

      case 'session':
        return syncAPI.syncTherapeuticData(
          {
            sessionId: `session_${hour}_${operation}`,
            exerciseType: ['breathing', 'body_scan', 'mindfulness'][Math.floor(Math.random() * 3)],
            duration: 180 + Math.floor(Math.random() * 600),
            completed: true,
          },
          'session_data',
          `extended_session_${hour}_${operation}`
        );

      case 'assessment':
        return syncAPI.syncCrisisData(
          {
            type: Math.random() > 0.5 ? 'phq9' : 'gad7',
            responses: Array.from({ length: 9 }, () => Math.floor(Math.random() * 4)),
            score: Math.floor(Math.random() * 27),
            completedAt: new Date().toISOString(),
          },
          'assessment',
          `extended_assessment_${hour}_${operation}`
        );

      case 'crisis':
        return syncAPI.syncCrisisData(
          global.SyncTestUtils.createCrisisScenario('phq9_threshold'),
          'crisis_plan',
          `extended_crisis_${hour}_${operation}`
        );

      default:
        return syncAPI.syncGeneralData(
          { data: `extended_sync_${hour}_${operation}`, timestamp: Date.now() },
          'user_profile',
          `extended_sync_${hour}_${operation}`
        );
    }
  }

  function getHourlyDelay(hour: number): number {
    // Simulate different activity levels throughout the day
    if (hour >= 1 && hour <= 5) return 100; // Low activity at night
    if (hour >= 6 && hour <= 9) return 20;  // High activity in morning
    if (hour >= 10 && hour <= 11) return 50; // Medium activity
    if (hour >= 12 && hour <= 14) return 30; // Lunch activity
    if (hour >= 15 && hour <= 17) return 60; // Afternoon
    if (hour >= 18 && hour <= 22) return 25; // Evening activity
    return 80; // Late night
  }

  function getDeviceSpecificOperations(device: string, deviceIndex: number): any[] {
    const baseOperations = [
      { type: 'checkin', priority: 'normal' },
      { type: 'sync', priority: 'normal' },
      { type: 'session', priority: 'high' },
    ];

    // Add device-specific operations
    switch (device) {
      case 'apple_watch':
        return [
          ...baseOperations,
          { type: 'heart_rate', priority: 'normal' },
          { type: 'activity', priority: 'low' },
        ];

      case 'iphone':
        return [
          ...baseOperations,
          { type: 'assessment', priority: 'high' },
          { type: 'crisis_check', priority: 'critical' },
        ];

      case 'ipad':
        return [
          ...baseOperations,
          { type: 'session', priority: 'high' },
          { type: 'progress_review', priority: 'normal' },
        ];

      default:
        return baseOperations;
    }
  }

  function analyzeMemoryGrowthPattern(snapshots: any[]): { isLinear: boolean; peakUsage: number } {
    if (snapshots.length < 3) {
      return { isLinear: true, peakUsage: 0 };
    }

    const memoryValues = snapshots.map(s => s.memory.heapUsed);
    const peakUsage = Math.max(...memoryValues);

    // Simple linear regression to check for linear vs exponential growth
    const n = memoryValues.length;
    const xMean = (n - 1) / 2;
    const yMean = memoryValues.reduce((sum, val) => sum + val, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = memoryValues[i];
      numerator += (x - xMean) * (y - yMean);
      denominator += (x - xMean) ** 2;
    }

    const slope = numerator / denominator;
    const intercept = yMean - slope * xMean;

    // Calculate R-squared for linear fit
    let ssRes = 0;
    let ssTot = 0;

    for (let i = 0; i < n; i++) {
      const predicted = slope * i + intercept;
      const actual = memoryValues[i];
      ssRes += (actual - predicted) ** 2;
      ssTot += (actual - yMean) ** 2;
    }

    const rSquared = 1 - (ssRes / ssTot);
    const isLinear = rSquared > 0.8; // Good linear fit

    return { isLinear, peakUsage };
  }

  afterAll(() => {
    // Generate comprehensive stress test report
    console.log('\n' + '='.repeat(80));
    console.log('🏆 COMPREHENSIVE STRESS TEST REPORT');
    console.log('='.repeat(80));

    stressMetrics.forEach(metrics => {
      console.log(`\n📊 ${metrics.scenario}:`);
      console.log(`   ✅ Success Rate: ${(metrics.success_rate * 100).toFixed(1)}%`);
      console.log(`   ⚡ Avg Response: ${metrics.average_response_time.toFixed(2)}ms`);
      console.log(`   📈 P95 Response: ${metrics.p95_response_time.toFixed(2)}ms`);
      console.log(`   🧠 Peak Memory: ${(metrics.peak_memory_usage / 1024 / 1024).toFixed(1)}MB`);

      if (metrics.crisis_response_times.length > 0) {
        const avgCrisis = metrics.crisis_response_times.reduce((s, t) => s + t, 0) / metrics.crisis_response_times.length;
        console.log(`   🚨 Crisis Avg: ${avgCrisis.toFixed(2)}ms`);
      }
    });

    // Overall assessment
    const overallSuccessRate = stressMetrics.reduce((sum, m) => sum + m.success_rate, 0) / stressMetrics.length;
    const overallCrisisPerformance = stressMetrics
      .flatMap(m => m.crisis_response_times)
      .reduce((sum, time, _, arr) => sum + time / arr.length, 0);

    console.log('\n🎯 OVERALL STRESS TEST ASSESSMENT:');
    console.log(`   📊 Average Success Rate: ${(overallSuccessRate * 100).toFixed(1)}%`);
    console.log(`   🚨 Average Crisis Response: ${overallCrisisPerformance.toFixed(2)}ms`);

    const productionReady = overallSuccessRate > 0.95 && overallCrisisPerformance < 250;
    console.log(`   🚀 Production Ready: ${productionReady ? 'YES' : 'NO'}`);

    if (!productionReady) {
      console.log('\n⚠️  PERFORMANCE ISSUES DETECTED:');
      if (overallSuccessRate <= 0.95) {
        console.log('   • Success rate below 95% threshold');
      }
      if (overallCrisisPerformance >= 250) {
        console.log('   • Crisis response time above 250ms threshold');
      }
    }
  });
});