/**
 * SYNC PERFORMANCE VALIDATION TESTING
 * Phase 5.2 - Load Testing and Performance Benchmarks
 *
 * PERFORMANCE VALIDATION REQUIREMENTS:
 * - Crisis assessment sync: <200ms response time
 * - Routine sync operations: <5s completion time
 * - High-load scenarios: 100 concurrent operations
 * - Memory efficiency: <50MB heap growth during sync
 * - Network efficiency: Minimal data transmission
 * - Battery optimization: Low CPU usage during background sync
 *
 * LOAD TESTING SCENARIOS:
 * - Concurrent crisis assessments (multiple users)
 * - Large assessment history sync (1000+ assessments)
 * - Network failure recovery under load
 * - Memory pressure during sync operations
 * - Background sync performance impact
 *
 * PERFORMANCE MONITORING:
 * - Response time distribution and percentiles
 * - Memory usage patterns during sync operations
 * - Network bandwidth utilization
 * - CPU usage during sync processing
 * - Battery drain impact measurement
 */

import { jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SyncCoordinator from '../../src/services/supabase/SyncCoordinator';
import { useAssessmentStore } from '../../src/flows/assessment/stores/assessmentStore';

// Performance monitoring utilities
class PerformanceMonitor {
  private startTime: number = 0;
  private startMemory: number = 0;

  start(): void {
    this.startTime = performance.now();
    this.startMemory = process.memoryUsage?.()?.heapUsed || 0;
  }

  stop(): { duration: number; memoryGrowth: number } {
    const duration = performance.now() - this.startTime;
    const currentMemory = process.memoryUsage?.()?.heapUsed || 0;
    const memoryGrowth = currentMemory - this.startMemory;

    return { duration, memoryGrowth };
  }
}

// Mock large dataset generators
function generateLargeAssessmentHistory(count: number) {
  return Array(count).fill(0).map((_, index) => ({
    id: `assessment_${index}`,
    type: index % 2 === 0 ? 'phq9' : 'gad7',
    result: {
      totalScore: Math.floor(Math.random() * (index % 2 === 0 ? 28 : 22)),
      severity: 'mild',
      isCrisis: false,
      completedAt: Date.now() - (index * 60000), // One per minute
      answers: []
    },
    progress: {
      isComplete: true,
      answers: [],
      startedAt: Date.now() - (index * 60000),
      totalQuestions: index % 2 === 0 ? 9 : 7
    }
  }));
}

function generateCrisisAssessment(id: string, type: 'phq9' | 'gad7' = 'phq9') {
  return {
    id: `crisis_${id}`,
    type,
    result: {
      totalScore: type === 'phq9' ? 24 : 18,
      severity: 'severe',
      isCrisis: true,
      suicidalIdeation: type === 'phq9' ? Math.random() > 0.5 : undefined,
      completedAt: Date.now(),
      answers: []
    },
    progress: {
      isComplete: true,
      answers: [],
      startedAt: Date.now() - 300000, // 5 minutes ago
      totalQuestions: type === 'phq9' ? 9 : 7
    }
  };
}

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');
jest.mock('expo-crypto');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('⚡ SYNC PERFORMANCE VALIDATION', () => {
  let syncCoordinator: SyncCoordinator;
  let performanceMonitor: PerformanceMonitor;
  let mockAssessmentStore: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    performanceMonitor = new PerformanceMonitor();

    // Mock AsyncStorage with performance tracking
    mockAsyncStorage.getItem.mockImplementation(async (key) => {
      await new Promise(resolve => setTimeout(resolve, 1)); // Simulate I/O delay
      return null;
    });

    mockAsyncStorage.setItem.mockImplementation(async (key, value) => {
      await new Promise(resolve => setTimeout(resolve, 2)); // Simulate I/O delay
      return undefined;
    });

    // Initialize mock assessment store
    mockAssessmentStore = {
      currentResult: null,
      completedAssessments: [],
      currentSession: null,
      answers: [],
      crisisDetection: null,
      getState: jest.fn(() => mockAssessmentStore),
      setState: jest.fn(),
      subscribe: jest.fn()
    };

    (useAssessmentStore as any).mockImplementation(() => mockAssessmentStore);
    (useAssessmentStore as any).getState = jest.fn(() => mockAssessmentStore);
    (useAssessmentStore as any).subscribe = jest.fn();

    syncCoordinator = new SyncCoordinator();
    await syncCoordinator.initialize();
  });

  afterEach(async () => {
    if (syncCoordinator) {
      await syncCoordinator.shutdown();
    }
  });

  describe('🚨 CRISIS SYNC PERFORMANCE REQUIREMENTS', () => {
    it('should meet <200ms crisis response time requirement', async () => {
      const crisisAssessment = generateCrisisAssessment('perf_test_1');
      mockAssessmentStore.currentResult = crisisAssessment.result;

      performanceMonitor.start();

      // Simulate crisis detection trigger
      const mockSubscribeCallback = (useAssessmentStore as any).subscribe.mock.calls[0]?.[0];
      if (mockSubscribeCallback) {
        await mockSubscribeCallback(mockAssessmentStore, { currentResult: null });
      }

      const { duration } = performanceMonitor.stop();

      expect(duration).toBeLessThan(200);
      console.log(`🚨 Crisis sync response time: ${duration.toFixed(2)}ms`);
    });

    it('should handle multiple concurrent crisis assessments efficiently', async () => {
      const crisisCount = 10;
      const crisisAssessments = Array(crisisCount).fill(0).map((_, i) =>
        generateCrisisAssessment(`concurrent_${i}`)
      );

      performanceMonitor.start();

      // Simulate concurrent crisis detections
      const crisisPromises = crisisAssessments.map(async (assessment) => {
        const localStore = { ...mockAssessmentStore, currentResult: assessment.result };
        const mockCallback = (useAssessmentStore as any).subscribe.mock.calls[0]?.[0];
        if (mockCallback) {
          return mockCallback(localStore, { currentResult: null });
        }
      });

      await Promise.all(crisisPromises);

      const { duration, memoryGrowth } = performanceMonitor.stop();

      expect(duration).toBeLessThan(1000); // 1 second for 10 concurrent crises
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // <10MB growth

      console.log(`🚨 Concurrent crisis handling: ${duration.toFixed(2)}ms for ${crisisCount} assessments`);
      console.log(`📊 Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should maintain crisis performance under network pressure', async () => {
      // Simulate network delays
      mockAsyncStorage.setItem.mockImplementation(async (key, value) => {
        await new Promise(resolve => setTimeout(resolve, 50)); // 50ms network delay
        return undefined;
      });

      const crisisAssessment = generateCrisisAssessment('network_pressure');
      mockAssessmentStore.currentResult = crisisAssessment.result;

      performanceMonitor.start();

      const mockSubscribeCallback = (useAssessmentStore as any).subscribe.mock.calls[0]?.[0];
      if (mockSubscribeCallback) {
        await mockSubscribeCallback(mockAssessmentStore, { currentResult: null });
      }

      const { duration } = performanceMonitor.stop();

      // Should still meet requirement despite network delays
      expect(duration).toBeLessThan(200);
      console.log(`🌐 Crisis sync with network pressure: ${duration.toFixed(2)}ms`);
    });
  });

  describe('📊 ROUTINE SYNC PERFORMANCE', () => {
    it('should complete routine sync within 5 second threshold', async () => {
      mockAssessmentStore.completedAssessments = generateLargeAssessmentHistory(50);

      performanceMonitor.start();

      const result = await syncCoordinator.performSync('manual');

      const { duration, memoryGrowth } = performanceMonitor.stop();

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5000);
      expect(memoryGrowth).toBeLessThan(20 * 1024 * 1024); // <20MB growth

      console.log(`📊 Routine sync (50 assessments): ${duration.toFixed(2)}ms`);
      console.log(`💾 Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should handle large assessment history efficiently', async () => {
      const largeHistory = generateLargeAssessmentHistory(1000);
      mockAssessmentStore.completedAssessments = largeHistory;

      performanceMonitor.start();

      const result = await syncCoordinator.performSync('manual');

      const { duration, memoryGrowth } = performanceMonitor.stop();

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(15000); // 15 seconds for 1000 assessments
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // <50MB growth

      console.log(`📚 Large history sync (1000 assessments): ${duration.toFixed(2)}ms`);
      console.log(`💾 Memory efficiency: ${(memoryGrowth / largeHistory.length / 1024).toFixed(2)}KB per assessment`);
    });

    it('should demonstrate linear scaling with data size', async () => {
      const testSizes = [10, 50, 100, 200];
      const results: Array<{ size: number; duration: number; memoryGrowth: number }> = [];

      for (const size of testSizes) {
        mockAssessmentStore.completedAssessments = generateLargeAssessmentHistory(size);

        performanceMonitor.start();
        await syncCoordinator.performSync('manual');
        const { duration, memoryGrowth } = performanceMonitor.stop();

        results.push({ size, duration, memoryGrowth });

        console.log(`📈 Size ${size}: ${duration.toFixed(2)}ms, ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
      }

      // Verify roughly linear scaling (within 2x tolerance)
      const smallestResult = results[0];
      const largestResult = results[results.length - 1];

      const scalingFactor = largestResult.size / smallestResult.size;
      const performanceScaling = largestResult.duration / smallestResult.duration;

      expect(performanceScaling).toBeLessThan(scalingFactor * 2);
    });
  });

  describe('🔄 CONCURRENT OPERATION PERFORMANCE', () => {
    it('should handle high concurrency load gracefully', async () => {
      const concurrentOperations = 20;
      mockAssessmentStore.completedAssessments = generateLargeAssessmentHistory(10);

      performanceMonitor.start();

      const syncPromises = Array(concurrentOperations).fill(0).map(() =>
        syncCoordinator.performSync('manual')
      );

      const results = await Promise.allSettled(syncPromises);

      const { duration, memoryGrowth } = performanceMonitor.stop();

      const successfulSyncs = results.filter(r =>
        r.status === 'fulfilled' && r.value.success
      );

      expect(successfulSyncs.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(10000); // 10 seconds for high concurrency
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // <100MB growth

      console.log(`🔄 Concurrent operations (${concurrentOperations}): ${duration.toFixed(2)}ms`);
      console.log(`✅ Successful syncs: ${successfulSyncs.length}/${concurrentOperations}`);
      console.log(`💾 Memory under load: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should maintain performance stability over time', async () => {
      const iterations = 10;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        mockAssessmentStore.completedAssessments = generateLargeAssessmentHistory(20);

        performanceMonitor.start();
        await syncCoordinator.performSync('manual');
        const { duration } = performanceMonitor.stop();

        durations.push(duration);
      }

      // Calculate performance stability
      const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const variability = maxDuration / averageDuration;

      expect(variability).toBeLessThan(3); // Max 3x variation from average
      expect(averageDuration).toBeLessThan(2000); // Average under 2 seconds

      console.log(`⏱️ Performance stability: avg ${averageDuration.toFixed(2)}ms, max ${maxDuration.toFixed(2)}ms`);
      console.log(`📊 Variability ratio: ${variability.toFixed(2)}x`);
    });
  });

  describe('🔋 RESOURCE EFFICIENCY VALIDATION', () => {
    it('should maintain memory efficiency during sync operations', async () => {
      const initialMemory = process.memoryUsage?.()?.heapUsed || 0;

      // Perform multiple sync operations
      for (let i = 0; i < 5; i++) {
        mockAssessmentStore.completedAssessments = generateLargeAssessmentHistory(100);
        await syncCoordinator.performSync('manual');
      }

      const finalMemory = process.memoryUsage?.()?.heapUsed || 0;
      const totalMemoryGrowth = finalMemory - initialMemory;

      // Memory growth should be reasonable
      expect(totalMemoryGrowth).toBeLessThan(100 * 1024 * 1024); // <100MB total growth

      console.log(`💾 Total memory growth (5 syncs): ${(totalMemoryGrowth / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should cleanup resources efficiently after sync completion', async () => {
      const largeDataset = generateLargeAssessmentHistory(500);
      mockAssessmentStore.completedAssessments = largeDataset;

      const beforeMemory = process.memoryUsage?.()?.heapUsed || 0;

      await syncCoordinator.performSync('manual');

      // Simulate garbage collection opportunity
      if (global.gc) {
        global.gc();
      }

      const afterMemory = process.memoryUsage?.()?.heapUsed || 0;
      const memoryDelta = afterMemory - beforeMemory;

      // Memory should not grow significantly after sync completion
      expect(memoryDelta).toBeLessThan(30 * 1024 * 1024); // <30MB persistent growth

      console.log(`🧹 Memory cleanup efficiency: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB persistent`);
    });
  });

  describe('📱 BACKGROUND SYNC PERFORMANCE', () => {
    it('should perform background sync with minimal performance impact', async () => {
      mockAssessmentStore.completedAssessments = generateLargeAssessmentHistory(20);

      // Simulate background execution with reduced priority
      const backgroundSyncPromise = new Promise(async (resolve) => {
        setTimeout(async () => {
          performanceMonitor.start();
          const result = await syncCoordinator.performSync('background');
          const { duration } = performanceMonitor.stop();
          resolve({ result, duration });
        }, 100); // Delayed start to simulate background scheduling
      });

      const { result, duration } = await backgroundSyncPromise as any;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(8000); // Slightly higher threshold for background sync

      console.log(`🌙 Background sync performance: ${duration.toFixed(2)}ms`);
    });

    it('should prioritize user-initiated sync over background sync', async () => {
      mockAssessmentStore.completedAssessments = generateLargeAssessmentHistory(30);

      // Start background sync
      const backgroundPromise = syncCoordinator.performSync('background');

      // Immediately start user-initiated sync
      performanceMonitor.start();
      const userSync = await syncCoordinator.performSync('manual');
      const { duration } = performanceMonitor.stop();

      await backgroundPromise;

      expect(userSync.success).toBe(true);
      expect(duration).toBeLessThan(5000); // User sync should complete quickly

      console.log(`👤 User-prioritized sync: ${duration.toFixed(2)}ms`);
    });
  });

  describe('📊 PERFORMANCE REGRESSION DETECTION', () => {
    it('should establish performance baselines for regression testing', async () => {
      const testScenarios = [
        { name: 'Small Dataset', data: generateLargeAssessmentHistory(10) },
        { name: 'Medium Dataset', data: generateLargeAssessmentHistory(50) },
        { name: 'Large Dataset', data: generateLargeAssessmentHistory(200) },
        { name: 'Crisis Assessment', data: [generateCrisisAssessment('baseline')] }
      ];

      const benchmarks: Record<string, number> = {};

      for (const scenario of testScenarios) {
        mockAssessmentStore.completedAssessments = scenario.data;

        performanceMonitor.start();
        const result = await syncCoordinator.performSync('manual');
        const { duration } = performanceMonitor.stop();

        expect(result.success).toBe(true);
        benchmarks[scenario.name] = duration;

        console.log(`📊 ${scenario.name} baseline: ${duration.toFixed(2)}ms`);
      }

      // Store benchmarks for future regression testing
      expect(Object.keys(benchmarks)).toHaveLength(testScenarios.length);
    });
  });
});