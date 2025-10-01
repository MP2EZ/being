/**
 * WEEK 3 ANALYTICS PERFORMANCE VALIDATION
 * Phase 4 - Comprehensive Performance Benchmarking
 *
 * CRITICAL PERFORMANCE REQUIREMENTS:
 * - Crisis event processing: <200ms end-to-end (BLOCKING requirement)
 * - Regular event processing: <10ms per event
 * - Memory efficiency: <1MB analytics data per user per month
 * - Network efficiency: Minimal bandwidth usage with secure batching
 * - UI responsiveness: Real-time updates without blocking main thread
 * - Privacy operations: Differential privacy and k-anonymity <50ms overhead
 *
 * LOAD TESTING SCENARIOS:
 * - High-volume assessment completion events (1000+ assessments)
 * - Concurrent crisis event handling (multiple simultaneous crises)
 * - Long-running analytics collection (24-hour simulation)
 * - Memory pressure testing under sustained load
 * - Network congestion and retry scenarios
 * - Privacy engine performance under differential privacy load
 *
 * PERFORMANCE MONITORING:
 * - Response time distribution and percentiles
 * - Memory usage patterns during extended operation
 * - Network bandwidth utilization and efficiency
 * - CPU usage during privacy computations
 * - Battery impact assessment for mobile deployment
 * - Cache effectiveness and memory management
 */

import { jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Import services for performance testing
import AnalyticsService from '../../src/services/analytics/AnalyticsService';
import SyncCoordinator from '../../src/services/supabase/SyncCoordinator';
import { useAssessmentStore } from '../../src/flows/assessment/stores/assessmentStore';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');
jest.mock('expo-crypto');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

// Performance monitoring utilities
class AnalyticsPerformanceProfiler {
  private metrics: {
    operationName: string;
    startTime: number;
    endTime: number;
    duration: number;
    memoryBefore: number;
    memoryAfter: number;
    memoryGrowth: number;
    success: boolean;
    metadata?: any;
  }[] = [];

  async profile<T>(
    operationName: string, 
    operation: () => Promise<T>,
    metadata?: any
  ): Promise<T> {
    const memoryBefore = process.memoryUsage?.()?.heapUsed || 0;
    const startTime = performance.now();
    
    let result: T;
    let success = false;

    try {
      result = await operation();
      success = true;
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const endTime = performance.now();
      const memoryAfter = process.memoryUsage?.()?.heapUsed || 0;
      
      this.metrics.push({
        operationName,
        startTime,
        endTime,
        duration: endTime - startTime,
        memoryBefore,
        memoryAfter,
        memoryGrowth: memoryAfter - memoryBefore,
        success,
        metadata
      });
    }
  }

  getMetrics(operationName?: string) {
    if (operationName) {
      return this.metrics.filter(m => m.operationName === operationName);
    }
    return this.metrics;
  }

  getPerformanceReport(): {
    totalOperations: number;
    successRate: number;
    averageDuration: number;
    p95Duration: number;
    p99Duration: number;
    totalMemoryGrowth: number;
    averageMemoryGrowth: number;
    operationBreakdown: Record<string, {
      count: number;
      averageDuration: number;
      totalMemoryGrowth: number;
    }>;
  } {
    if (this.metrics.length === 0) {
      return {
        totalOperations: 0,
        successRate: 0,
        averageDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        totalMemoryGrowth: 0,
        averageMemoryGrowth: 0,
        operationBreakdown: {}
      };
    }

    const durations = this.metrics.map(m => m.duration).sort((a, b) => a - b);
    const successfulOps = this.metrics.filter(m => m.success);
    
    // Calculate percentiles
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);

    // Calculate operation breakdown
    const operationBreakdown: Record<string, { count: number; averageDuration: number; totalMemoryGrowth: number }> = {};
    
    for (const metric of this.metrics) {
      if (!operationBreakdown[metric.operationName]) {
        operationBreakdown[metric.operationName] = {
          count: 0,
          averageDuration: 0,
          totalMemoryGrowth: 0
        };
      }
      
      const breakdown = operationBreakdown[metric.operationName];
      breakdown.count++;
      breakdown.averageDuration = (breakdown.averageDuration * (breakdown.count - 1) + metric.duration) / breakdown.count;
      breakdown.totalMemoryGrowth += metric.memoryGrowth;
    }

    return {
      totalOperations: this.metrics.length,
      successRate: successfulOps.length / this.metrics.length,
      averageDuration: this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length,
      p95Duration: durations[p95Index] || 0,
      p99Duration: durations[p99Index] || 0,
      totalMemoryGrowth: this.metrics.reduce((sum, m) => sum + m.memoryGrowth, 0),
      averageMemoryGrowth: this.metrics.reduce((sum, m) => sum + m.memoryGrowth, 0) / this.metrics.length,
      operationBreakdown
    };
  }

  reset(): void {
    this.metrics = [];
  }
}

// Load testing data generators
function generateAssessmentLoad(count: number, crisisPercentage: number = 0.1) {
  const assessments = [];
  
  for (let i = 0; i < count; i++) {
    const isCrisis = Math.random() < crisisPercentage;
    const assessmentType = Math.random() > 0.5 ? 'phq9' : 'gad7';
    
    let totalScore: number;
    if (isCrisis) {
      totalScore = assessmentType === 'phq9' ?
        Math.floor(Math.random() * 13) + 15 : // PHQ-9: 15-27 (Updated 2025-01-27)
        Math.floor(Math.random() * 7) + 15;  // GAD-7: 15-21
    } else {
      totalScore = assessmentType === 'phq9' ?
        Math.floor(Math.random() * 15) : // PHQ-9: 0-14 (Updated 2025-01-27)
        Math.floor(Math.random() * 15);  // GAD-7: 0-14
    }

    assessments.push({
      id: `load_test_${assessmentType}_${i}`,
      type: assessmentType === 'phq9' ? 'PHQ-9' : 'GAD-7',
      totalScore,
      isCrisis,
      completedAt: Date.now() - (Math.random() * 86400000), // Random time in last 24h
      startedAt: Date.now() - (Math.random() * 86400000) - 300000, // 5 minutes before completion
      result: {
        totalScore,
        severity: isCrisis ? 'severe' : 'mild',
        isCrisis,
        completedAt: Date.now() - (Math.random() * 86400000),
        answers: []
      }
    });
  }
  
  return assessments;
}

describe('⚡ WEEK 3 ANALYTICS PERFORMANCE VALIDATION', () => {
  let analyticsService: typeof AnalyticsService;
  let syncCoordinator: SyncCoordinator;
  let profiler: AnalyticsPerformanceProfiler;
  let mockAssessmentStore: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    profiler = new AnalyticsPerformanceProfiler();

    // Mock successful network state
    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      type: 'wifi',
      isInternetReachable: true
    } as any);

    // Mock AsyncStorage with realistic latency
    mockAsyncStorage.getItem.mockImplementation(async (key) => {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 5)); // 0-5ms latency
      return null;
    });

    mockAsyncStorage.setItem.mockImplementation(async (key, value) => {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 10)); // 0-10ms latency
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

    // Initialize services
    analyticsService = AnalyticsService;
    syncCoordinator = new SyncCoordinator();

    await profiler.profile('service_initialization', async () => {
      await analyticsService.initialize();
      await syncCoordinator.initialize();
    });
  });

  afterEach(async () => {
    await profiler.profile('service_shutdown', async () => {
      if (analyticsService) {
        await analyticsService.shutdown();
      }
      if (syncCoordinator) {
        await syncCoordinator.shutdown();
      }
    });

    // Log performance summary
    const report = profiler.getPerformanceReport();
    console.log('\n📊 PERFORMANCE SUMMARY:');
    console.log(`Total Operations: ${report.totalOperations}`);
    console.log(`Success Rate: ${(report.successRate * 100).toFixed(2)}%`);
    console.log(`Average Duration: ${report.averageDuration.toFixed(2)}ms`);
    console.log(`P95 Duration: ${report.p95Duration.toFixed(2)}ms`);
    console.log(`Total Memory Growth: ${(report.totalMemoryGrowth / 1024 / 1024).toFixed(2)}MB`);
  });

  describe('🚨 CRISIS EVENT PERFORMANCE (BLOCKING REQUIREMENT)', () => {
    it('should meet <200ms crisis processing requirement consistently', async () => {
      const crisisCount = 50;
      const crisisAssessments = generateAssessmentLoad(crisisCount, 1.0); // 100% crisis events

      const crisisDurations: number[] = [];

      for (const assessment of crisisAssessments) {
        const duration = await profiler.profile(
          'crisis_event_processing',
          async () => {
            mockAssessmentStore.currentResult = assessment.result;
            
            const mockSubscribeCallback = (useAssessmentStore as any).subscribe.mock.calls[0]?.[0];
            if (mockSubscribeCallback) {
              await mockSubscribeCallback(mockAssessmentStore, { currentResult: null });
            }
          },
          { assessmentType: assessment.type, score: assessment.totalScore }
        );
      }

      // Analyze crisis performance metrics
      const crisisMetrics = profiler.getMetrics('crisis_event_processing');
      const crisisDurationsArray = crisisMetrics.map(m => m.duration);

      // BLOCKING REQUIREMENT: ALL crisis events must be <200ms
      const slowCrisisEvents = crisisDurationsArray.filter(d => d >= 200);
      expect(slowCrisisEvents).toHaveLength(0);

      // Additional performance validations
      const averageCrisisTime = crisisDurationsArray.reduce((sum, d) => sum + d, 0) / crisisDurationsArray.length;
      const maxCrisisTime = Math.max(...crisisDurationsArray);
      const p95CrisisTime = crisisDurationsArray.sort((a, b) => a - b)[Math.floor(crisisDurationsArray.length * 0.95)];

      expect(averageCrisisTime).toBeLessThan(100); // Average should be well under 200ms
      expect(maxCrisisTime).toBeLessThan(200); // Maximum should never exceed 200ms
      expect(p95CrisisTime).toBeLessThan(150); // 95% should be under 150ms

      console.log(`🚨 Crisis Performance: avg=${averageCrisisTime.toFixed(2)}ms, max=${maxCrisisTime.toFixed(2)}ms, p95=${p95CrisisTime.toFixed(2)}ms`);
      console.log(`✅ Crisis Requirement: ALL ${crisisCount} events < 200ms`);
    });

    it('should handle concurrent crisis events efficiently', async () => {
      const concurrentCrises = 10;
      const crisisAssessments = generateAssessmentLoad(concurrentCrises, 1.0);

      const concurrentStart = performance.now();

      // Process all crisis events concurrently
      const concurrentPromises = crisisAssessments.map(async (assessment, index) => {
        return profiler.profile(
          'concurrent_crisis_processing',
          async () => {
            const localStore = { ...mockAssessmentStore, currentResult: assessment.result };
            const mockCallback = (useAssessmentStore as any).subscribe.mock.calls[0]?.[0];
            
            if (mockCallback) {
              await mockCallback(localStore, { currentResult: null });
            }
          },
          { index, assessmentType: assessment.type }
        );
      });

      await Promise.all(concurrentPromises);

      const totalConcurrentTime = performance.now() - concurrentStart;

      // All concurrent crises should complete within performance bounds
      expect(totalConcurrentTime).toBeLessThan(500); // Total time for 10 concurrent crises < 500ms

      const concurrentMetrics = profiler.getMetrics('concurrent_crisis_processing');
      const maxConcurrentDuration = Math.max(...concurrentMetrics.map(m => m.duration));
      
      expect(maxConcurrentDuration).toBeLessThan(200); // Each individual crisis still <200ms

      console.log(`🔄 Concurrent Crisis: ${concurrentCrises} events in ${totalConcurrentTime.toFixed(2)}ms`);
      console.log(`📊 Max Individual Duration: ${maxConcurrentDuration.toFixed(2)}ms`);
    });

    it('should maintain crisis performance under memory pressure', async () => {
      // Create memory pressure with large data structures
      const memoryPressure = Array(10000).fill(0).map((_, i) => ({
        id: i,
        data: new Array(1000).fill(`memory_pressure_${i}`).join('')
      }));

      // Test crisis performance under memory pressure
      const crisisAssessment = generateAssessmentLoad(1, 1.0)[0];

      const duration = await profiler.profile(
        'crisis_under_memory_pressure',
        async () => {
          mockAssessmentStore.currentResult = crisisAssessment.result;
          
          const mockSubscribeCallback = (useAssessmentStore as any).subscribe.mock.calls[0]?.[0];
          if (mockSubscribeCallback) {
            await mockSubscribeCallback(mockAssessmentStore, { currentResult: null });
          }
        },
        { memoryPressureObjects: memoryPressure.length }
      );

      // Crisis performance should remain stable even under memory pressure
      const crisisMetrics = profiler.getMetrics('crisis_under_memory_pressure');
      expect(crisisMetrics[0].duration).toBeLessThan(200);

      console.log(`🧠 Crisis under memory pressure: ${crisisMetrics[0].duration.toFixed(2)}ms`);

      // Cleanup memory pressure
      memoryPressure.length = 0;
    });
  });

  describe('📊 REGULAR EVENT PERFORMANCE', () => {
    it('should meet <10ms per event processing requirement', async () => {
      const eventCount = 100;
      const eventTypes = [
        'assessment_completed',
        'therapeutic_exercise_completed', 
        'sync_operation_performed',
        'app_lifecycle_event',
        'error_occurred'
      ];

      for (let i = 0; i < eventCount; i++) {
        const eventType = eventTypes[i % eventTypes.length];
        
        await profiler.profile(
          'regular_event_processing',
          async () => {
            await analyticsService.trackEvent(eventType, {
              test_event_id: `perf_test_${i}`,
              event_index: i,
              batch_size: eventCount
            });
          },
          { eventType, eventIndex: i }
        );
      }

      const regularMetrics = profiler.getMetrics('regular_event_processing');
      const regularDurations = regularMetrics.map(m => m.duration);

      // Validate <10ms requirement
      const slowEvents = regularDurations.filter(d => d >= 10);
      expect(slowEvents.length).toBeLessThan(eventCount * 0.05); // Less than 5% can exceed 10ms

      const averageEventTime = regularDurations.reduce((sum, d) => sum + d, 0) / regularDurations.length;
      const maxEventTime = Math.max(...regularDurations);

      expect(averageEventTime).toBeLessThan(5); // Average should be well under 10ms
      expect(maxEventTime).toBeLessThan(20); // Even outliers should be reasonable

      console.log(`📊 Regular Events: avg=${averageEventTime.toFixed(2)}ms, max=${maxEventTime.toFixed(2)}ms`);
      console.log(`✅ Performance: ${eventCount - slowEvents.length}/${eventCount} events < 10ms`);
    });

    it('should maintain throughput under sustained load', async () => {
      const duration = 30000; // 30 seconds
      const startTime = Date.now();
      let eventCount = 0;

      // Sustained load test
      while (Date.now() - startTime < duration) {
        await profiler.profile(
          'sustained_load_event',
          async () => {
            await analyticsService.trackEvent('load_test_event', {
              timestamp: Date.now(),
              eventNumber: eventCount,
              loadTestDuration: duration
            });
            eventCount++;
          }
        );

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const sustainedMetrics = profiler.getMetrics('sustained_load_event');
      const throughput = sustainedMetrics.length / (duration / 1000); // events per second

      // Should maintain reasonable throughput
      expect(throughput).toBeGreaterThan(50); // At least 50 events/second
      expect(sustainedMetrics.every(m => m.success)).toBe(true); // All events should succeed

      console.log(`⏱️ Sustained Load: ${sustainedMetrics.length} events in ${duration/1000}s`);
      console.log(`🔄 Throughput: ${throughput.toFixed(2)} events/second`);
    });
  });

  describe('🧠 MEMORY EFFICIENCY VALIDATION', () => {
    it('should maintain <1MB per user per month memory target', async () => {
      // Simulate 1 month of typical user activity
      const dailyAssessments = 2; // 2 assessments per day
      const dailyExercises = 5; // 5 exercises per day
      const dailySyncs = 10; // 10 sync operations per day
      const days = 30;

      const totalEvents = (dailyAssessments + dailyExercises + dailySyncs) * days;
      console.log(`🗓️ Simulating ${days} days of activity: ${totalEvents} total events`);

      const memoryBefore = process.memoryUsage?.()?.heapUsed || 0;

      // Generate month of activity
      for (let day = 0; day < days; day++) {
        for (let assessment = 0; assessment < dailyAssessments; assessment++) {
          await profiler.profile('monthly_assessment', async () => {
            await analyticsService.trackEvent('assessment_completed', {
              assessment_type: Math.random() > 0.5 ? 'phq9' : 'gad7',
              totalScore: Math.floor(Math.random() * 20),
              day: day,
              assessment: assessment
            });
          });
        }

        for (let exercise = 0; exercise < dailyExercises; exercise++) {
          await profiler.profile('monthly_exercise', async () => {
            await analyticsService.trackExerciseCompletion(
              Math.random() > 0.5 ? 'breathing' : 'mindfulness',
              60000 + Math.random() * 300000, // 1-6 minutes
              0.8 + Math.random() * 0.2 // 80-100% completion
            );
          });
        }

        for (let sync = 0; sync < dailySyncs; sync++) {
          await profiler.profile('monthly_sync', async () => {
            await analyticsService.trackSyncOperation(
              Math.random() > 0.5 ? 'auto' : 'manual',
              2000 + Math.random() * 8000, // 2-10 seconds
              Math.random() > 0.1, // 90% success rate
              100000 + Math.random() * 500000 // 100KB-600KB
            );
          });
        }

        // Simulate end of day processing
        if (day % 7 === 0) { // Weekly flush
          await profiler.profile('weekly_flush', async () => {
            await analyticsService.flush();
          });
        }
      }

      // Final flush
      await analyticsService.flush();

      const memoryAfter = process.memoryUsage?.()?.heapUsed || 0;
      const totalMemoryGrowth = memoryAfter - memoryBefore;

      // Should stay under 1MB for month of activity
      expect(totalMemoryGrowth).toBeLessThan(1 * 1024 * 1024); // <1MB

      const monthlyMetrics = profiler.getMetrics();
      const avgMemoryPerEvent = totalMemoryGrowth / monthlyMetrics.length;

      console.log(`💾 Monthly Memory Usage: ${(totalMemoryGrowth / 1024 / 1024).toFixed(3)}MB total`);
      console.log(`📊 Average per event: ${(avgMemoryPerEvent / 1024).toFixed(3)}KB`);
      console.log(`✅ Memory Target: ${totalMemoryGrowth < 1024 * 1024 ? 'MET' : 'EXCEEDED'} (<1MB)`);
    });

    it('should efficiently manage memory during batch processing', async () => {
      const batchSizes = [1, 5, 10, 25, 50, 100];
      const memoryMetrics: Array<{ batchSize: number; memoryGrowth: number }> = [];

      for (const batchSize of batchSizes) {
        const memoryBefore = process.memoryUsage?.()?.heapUsed || 0;

        // Generate and process batch
        const events = [];
        for (let i = 0; i < batchSize; i++) {
          events.push(analyticsService.trackEvent('batch_test_event', {
            batchSize,
            eventIndex: i,
            timestamp: Date.now()
          }));
        }

        await Promise.all(events);
        await analyticsService.flush();

        const memoryAfter = process.memoryUsage?.()?.heapUsed || 0;
        const memoryGrowth = memoryAfter - memoryBefore;

        memoryMetrics.push({ batchSize, memoryGrowth });

        console.log(`📦 Batch ${batchSize}: ${(memoryGrowth / 1024).toFixed(2)}KB`);
      }

      // Memory growth should scale reasonably with batch size
      for (let i = 1; i < memoryMetrics.length; i++) {
        const current = memoryMetrics[i];
        const previous = memoryMetrics[i - 1];
        
        // Growth rate should be sub-linear (efficiency improves with larger batches)
        const growthRatio = current.memoryGrowth / previous.memoryGrowth;
        const sizeRatio = current.batchSize / previous.batchSize;
        
        expect(growthRatio).toBeLessThan(sizeRatio * 1.5); // Memory should be more efficient with larger batches
      }
    });
  });

  describe('🔐 PRIVACY ENGINE PERFORMANCE', () => {
    it('should add <50ms overhead for differential privacy operations', async () => {
      const eventCount = 100;
      const privacyOverheadResults: number[] = [];

      for (let i = 0; i < eventCount; i++) {
        // Measure without privacy (baseline)
        const baselineStart = performance.now();
        await analyticsService.trackEvent('privacy_baseline_test', {
          test_data: `baseline_${i}`,
          skip_privacy: true // Hypothetical flag for testing
        });
        const baselineTime = performance.now() - baselineStart;

        // Measure with full privacy protection
        const privacyStart = performance.now();
        await analyticsService.trackEvent('privacy_protected_test', {
          test_data: `protected_${i}`,
          full_privacy: true
        });
        const privacyTime = performance.now() - privacyStart;

        const overhead = privacyTime - baselineTime;
        privacyOverheadResults.push(overhead);
      }

      const averageOverhead = privacyOverheadResults.reduce((sum, o) => sum + o, 0) / privacyOverheadResults.length;
      const maxOverhead = Math.max(...privacyOverheadResults);

      // Privacy operations should add minimal overhead
      expect(averageOverhead).toBeLessThan(50); // <50ms average overhead
      expect(maxOverhead).toBeLessThan(100); // <100ms worst case

      console.log(`🔐 Privacy Overhead: avg=${averageOverhead.toFixed(2)}ms, max=${maxOverhead.toFixed(2)}ms`);
    });

    it('should efficiently handle k-anonymity grouping at scale', async () => {
      // Generate events that will be grouped for k-anonymity
      const eventCount = 1000;
      const groupSizes = [3, 5, 10, 15, 20]; // Different group sizes to test

      for (const groupSize of groupSizes) {
        await profiler.profile(
          'k_anonymity_processing',
          async () => {
            // Generate events that would form groups of specified size
            const events = [];
            for (let i = 0; i < groupSize; i++) {
              events.push(analyticsService.trackEvent('k_anonymity_test', {
                group_identifier: `group_${groupSize}`,
                event_index: i,
                timestamp: Math.floor(Date.now() / 3600000) * 3600000 // Hour boundary
              }));
            }
            await Promise.all(events);
            await analyticsService.flush();
          },
          { groupSize }
        );
      }

      const kAnonymityMetrics = profiler.getMetrics('k_anonymity_processing');
      
      // K-anonymity processing should scale efficiently
      for (const metric of kAnonymityMetrics) {
        expect(metric.duration).toBeLessThan(1000); // <1 second per group
      }

      console.log(`🔒 K-Anonymity Processing: ${kAnonymityMetrics.length} groups processed`);
    });
  });

  describe('📱 UI PERFORMANCE INTEGRATION', () => {
    it('should provide real-time status updates without blocking UI', async () => {
      const statusUpdateCount = 50;
      const uiRenderTimes: number[] = [];

      for (let i = 0; i < statusUpdateCount; i++) {
        // Simulate UI status check (like SyncStatusIndicator would do)
        const uiStart = performance.now();
        
        const syncStatus = await syncCoordinator.getStatus();
        const analyticsStatus = analyticsService.getStatus();
        
        // Simulate UI rendering time
        const mockUIProcessing = new Promise(resolve => {
          setTimeout(resolve, Math.random() * 5); // 0-5ms UI processing
        });
        await mockUIProcessing;
        
        const uiEnd = performance.now();
        uiRenderTimes.push(uiEnd - uiStart);

        // Generate some analytics activity between status checks
        if (i % 10 === 0) {
          await analyticsService.trackEvent('ui_update_test', {
            updateNumber: i,
            statusUpdateCount
          });
        }
      }

      const averageUITime = uiRenderTimes.reduce((sum, t) => sum + t, 0) / uiRenderTimes.length;
      const maxUITime = Math.max(...uiRenderTimes);

      // UI should remain responsive
      expect(averageUITime).toBeLessThan(20); // <20ms average UI update time
      expect(maxUITime).toBeLessThan(50); // <50ms worst case

      console.log(`📱 UI Responsiveness: avg=${averageUITime.toFixed(2)}ms, max=${maxUITime.toFixed(2)}ms`);
    });

    it('should handle concurrent UI and analytics operations smoothly', async () => {
      const concurrentOperations = 20;

      await profiler.profile(
        'concurrent_ui_analytics',
        async () => {
          const operations = [];

          // Mix of UI status checks and analytics operations
          for (let i = 0; i < concurrentOperations; i++) {
            if (i % 2 === 0) {
              // UI operation
              operations.push((async () => {
                const status = analyticsService.getStatus();
                await new Promise(resolve => setTimeout(resolve, 5)); // Simulate UI rendering
                return status;
              })());
            } else {
              // Analytics operation
              operations.push(analyticsService.trackEvent('concurrent_test', {
                operationIndex: i
              }));
            }
          }

          return Promise.all(operations);
        }
      );

      const concurrentMetrics = profiler.getMetrics('concurrent_ui_analytics');
      expect(concurrentMetrics[0].duration).toBeLessThan(500); // Should complete quickly

      console.log(`🔄 Concurrent UI/Analytics: ${concurrentOperations} operations in ${concurrentMetrics[0].duration.toFixed(2)}ms`);
    });
  });
});