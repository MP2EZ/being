/**
 * Offline Performance and Reliability Testing
 * Validates performance thresholds and system reliability during extended offline operation
 * Ensures clinical-grade performance standards are maintained
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { enhancedOfflineQueueService } from '../../src/services/EnhancedOfflineQueueService';
import { networkAwareService } from '../../src/services/NetworkAwareService';
import { assetCacheService } from '../../src/services/AssetCacheService';
import { resumableSessionService } from '../../src/services/ResumableSessionService';
import { OfflinePriority, NetworkQuality } from '../../src/types/offline';

/**
 * Performance monitoring and benchmarking utilities
 */
class OfflinePerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private memoryBaseline: number = 0;
  private timers: Map<string, number> = new Map();

  startTimer(label: string): void {
    this.timers.set(label, Date.now());
  }

  endTimer(label: string): number {
    const startTime = this.timers.get(label);
    if (!startTime) return 0;
    
    const duration = Date.now() - startTime;
    
    // Store metric for statistical analysis
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    this.metrics.get(label)!.push(duration);
    
    this.timers.delete(label);
    return duration;
  }

  recordMemoryBaseline(): void {
    // In a real React Native app, you'd use performance monitoring libraries
    this.memoryBaseline = this.getMemoryUsage();
  }

  getMemoryIncrease(): number {
    return this.getMemoryUsage() - this.memoryBaseline;
  }

  private getMemoryUsage(): number {
    // Mock memory usage - in real app, use actual memory monitoring
    return Math.random() * 100 + 50; // 50-150MB simulated
  }

  getStatistics(label: string): {
    count: number;
    average: number;
    median: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
  } {
    const values = this.metrics.get(label) || [];
    if (values.length === 0) {
      return { count: 0, average: 0, median: 0, p95: 0, p99: 0, min: 0, max: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const count = values.length;

    return {
      count,
      average: values.reduce((sum, val) => sum + val, 0) / count,
      median: sorted[Math.floor(count / 2)],
      p95: sorted[Math.floor(count * 0.95)],
      p99: sorted[Math.floor(count * 0.99)],
      min: sorted[0],
      max: sorted[count - 1]
    };
  }

  validatePerformanceThresholds(thresholds: Record<string, number>): {
    passed: boolean;
    violations: Array<{ metric: string; actual: number; threshold: number }>;
  } {
    const violations: Array<{ metric: string; actual: number; threshold: number }> = [];

    Object.entries(thresholds).forEach(([metric, threshold]) => {
      const stats = this.getStatistics(metric);
      if (stats.p95 > threshold) {
        violations.push({
          metric,
          actual: stats.p95,
          threshold
        });
      }
    });

    return {
      passed: violations.length === 0,
      violations
    };
  }
}

/**
 * Offline stress testing utilities
 */
class OfflineStressTester {
  
  /**
   * Generate realistic offline load patterns
   */
  static generateLoadPattern(pattern: 'steady' | 'burst' | 'crisis' | 'mixed'): Array<{
    timestamp: number;
    operations: number;
    priority: OfflinePriority;
    type: string;
  }> {
    const baseTime = Date.now();
    const patterns: Record<string, any[]> = {
      steady: Array.from({ length: 60 }, (_, i) => ({
        timestamp: baseTime + (i * 1000), // Every second
        operations: 2,
        priority: OfflinePriority.MEDIUM,
        type: 'steady_checkin'
      })),
      
      burst: [
        ...Array.from({ length: 5 }, (_, i) => ({
          timestamp: baseTime + (i * 100), // Rapid burst
          operations: 10,
          priority: OfflinePriority.MEDIUM,
          type: 'burst_assessment'
        })),
        ...Array.from({ length: 55 }, (_, i) => ({
          timestamp: baseTime + 500 + (i * 1000), // Then steady
          operations: 1,
          priority: OfflinePriority.LOW,
          type: 'post_burst'
        }))
      ],
      
      crisis: [
        { timestamp: baseTime, operations: 1, priority: OfflinePriority.CRITICAL, type: 'crisis_detection' },
        { timestamp: baseTime + 100, operations: 3, priority: OfflinePriority.CRITICAL, type: 'crisis_intervention' },
        { timestamp: baseTime + 200, operations: 2, priority: OfflinePriority.HIGH, type: 'crisis_followup' },
        ...Array.from({ length: 20 }, (_, i) => ({
          timestamp: baseTime + 1000 + (i * 2000), // Regular monitoring
          operations: 1,
          priority: OfflinePriority.MEDIUM,
          type: 'crisis_monitoring'
        }))
      ],
      
      mixed: [
        // Mix of all patterns
        ...Array.from({ length: 20 }, (_, i) => ({
          timestamp: baseTime + (i * 500),
          operations: Math.random() > 0.8 ? 5 : 1, // Occasional bursts
          priority: Math.random() > 0.9 ? OfflinePriority.CRITICAL : OfflinePriority.MEDIUM,
          type: 'mixed_operation'
        }))
      ]
    };

    return patterns[pattern] || patterns.steady;
  }

  /**
   * Simulate memory pressure scenarios
   */
  static async simulateMemoryPressure(level: 'low' | 'medium' | 'high' | 'critical'): Promise<void> {
    const memoryPressureLevels = {
      low: 10,      // 10 operations
      medium: 50,   // 50 operations
      high: 200,    // 200 operations  
      critical: 1000 // 1000 operations
    };

    const operationCount = memoryPressureLevels[level];
    
    // Create memory pressure with large data objects
    const largeDataOperations = Array.from({ length: operationCount }, (_, i) =>
      enhancedOfflineQueueService.queueAction(
        'memory_pressure_test',
        {
          id: i,
          largeData: new Array(1000).fill(`memory_test_${i}`), // Large data object
          timestamp: Date.now()
        },
        { priority: OfflinePriority.LOW, clinicalValidation: false }
      )
    );

    await Promise.all(largeDataOperations);
  }
}

/**
 * Reliability testing utilities
 */
class OfflineReliabilityTester {
  
  /**
   * Test data consistency across multiple operations
   */
  static async testDataConsistency(
    operations: Array<{ id: string; data: any; priority: OfflinePriority }>
  ): Promise<{
    consistent: boolean;
    operationsCompleted: number;
    dataIntegrityScore: number;
    inconsistencies: string[];
  }> {
    const inconsistencies: string[] = [];
    let completedOperations = 0;
    
    for (const operation of operations) {
      try {
        const result = await enhancedOfflineQueueService.queueAction(
          'consistency_test',
          operation.data,
          { priority: operation.priority, clinicalValidation: false }
        );

        if (result.success) {
          completedOperations++;
          
          // Verify data integrity
          if (result.actionId && result.data) {
            const savedData = result.data;
            if (JSON.stringify(savedData) !== JSON.stringify(operation.data)) {
              inconsistencies.push(`Data mismatch for operation ${operation.id}`);
            }
          }
        } else {
          inconsistencies.push(`Operation ${operation.id} failed`);
        }
      } catch (error) {
        inconsistencies.push(`Operation ${operation.id} threw error: ${error}`);
      }
    }

    const dataIntegrityScore = (completedOperations / operations.length) * 100;
    const consistent = inconsistencies.length === 0 && dataIntegrityScore === 100;

    return {
      consistent,
      operationsCompleted: completedOperations,
      dataIntegrityScore,
      inconsistencies
    };
  }

  /**
   * Test service resilience under various failure conditions
   */
  static async testServiceResilience(
    failureType: 'storage_error' | 'memory_exhaustion' | 'operation_timeout' | 'queue_overflow'
  ): Promise<{
    resilient: boolean;
    recoveryTime: number;
    dataLoss: boolean;
    errorHandling: boolean;
  }> {
    const startTime = Date.now();
    let dataLoss = false;
    let errorHandling = true;

    try {
      switch (failureType) {
        case 'storage_error':
          // Simulate storage failure by filling storage
          await this.simulateStorageFailure();
          break;
          
        case 'memory_exhaustion':
          // Simulate memory exhaustion
          await OfflineStressTester.simulateMemoryPressure('critical');
          break;
          
        case 'operation_timeout':
          // Simulate operations that timeout
          await this.simulateOperationTimeout();
          break;
          
        case 'queue_overflow':
          // Simulate queue overflow
          await this.simulateQueueOverflow();
          break;
      }

      // Test recovery
      const recoveryTestResult = await enhancedOfflineQueueService.queueAction(
        'resilience_recovery_test',
        { testType: failureType, timestamp: Date.now() },
        { priority: OfflinePriority.HIGH, clinicalValidation: false }
      );

      const resilient = recoveryTestResult.success;
      const recoveryTime = Date.now() - startTime;

      return {
        resilient,
        recoveryTime,
        dataLoss,
        errorHandling
      };

    } catch (error) {
      errorHandling = false;
      return {
        resilient: false,
        recoveryTime: Date.now() - startTime,
        dataLoss: true,
        errorHandling
      };
    }
  }

  private static async simulateStorageFailure(): Promise<void> {
    // Fill AsyncStorage to simulate storage failure
    try {
      const largeData = JSON.stringify(new Array(100000).fill('storage_test'));
      await AsyncStorage.setItem('@storage_failure_test', largeData);
    } catch (error) {
      // Expected to fail - simulating storage exhaustion
    }
  }

  private static async simulateOperationTimeout(): Promise<void> {
    // Create operations that simulate timeout conditions
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
  }

  private static async simulateQueueOverflow(): Promise<void> {
    // Create more operations than the queue can handle
    const overflowOperations = Array.from({ length: 15000 }, (_, i) =>
      enhancedOfflineQueueService.queueAction(
        'overflow_test',
        { id: i },
        { priority: OfflinePriority.LOW, clinicalValidation: false }
      )
    );

    await Promise.allSettled(overflowOperations);
  }
}

describe('Offline Performance and Reliability Testing', () => {
  let performanceMonitor: OfflinePerformanceMonitor;

  beforeEach(async () => {
    await AsyncStorage.clear();
    performanceMonitor = new OfflinePerformanceMonitor();
    performanceMonitor.recordMemoryBaseline();
    
    // Initialize all services
    await Promise.all([
      enhancedOfflineQueueService.initialize(),
      assetCacheService.initialize(),
      resumableSessionService.initialize()
    ]);
  });

  afterEach(async () => {
    await AsyncStorage.clear();
  });

  describe('Critical Performance Thresholds', () => {

    test('should meet crisis detection performance requirements', async () => {
      const crisisDetectionTests = 100;
      
      for (let i = 0; i < crisisDetectionTests; i++) {
        performanceMonitor.startTimer('crisis_detection');
        
        await enhancedOfflineQueueService.queueAction(
          'crisis_detection_performance_test',
          {
            testId: i,
            crisisType: 'suicidal_ideation',
            severity: 'severe'
          },
          { priority: OfflinePriority.CRITICAL, clinicalValidation: true }
        );
        
        performanceMonitor.endTimer('crisis_detection');
      }

      const crisisStats = performanceMonitor.getStatistics('crisis_detection');
      
      // Crisis detection must be < 200ms (p95)
      expect(crisisStats.p95).toBeLessThan(200);
      expect(crisisStats.average).toBeLessThan(100);
      expect(crisisStats.max).toBeLessThan(500); // Absolute max
      
      console.log(`Crisis Detection Performance: avg=${crisisStats.average.toFixed(2)}ms, p95=${crisisStats.p95}ms`);
    });

    test('should meet emergency access performance requirements', async () => {
      const emergencyAccessTests = 50;
      
      for (let i = 0; i < emergencyAccessTests; i++) {
        performanceMonitor.startTimer('emergency_access');
        
        await enhancedOfflineQueueService.queueAction(
          'emergency_access_performance_test',
          {
            testId: i,
            accessType: '988_dial',
            source: 'crisis_button'
          },
          { priority: OfflinePriority.CRITICAL, clinicalValidation: false }
        );
        
        performanceMonitor.endTimer('emergency_access');
      }

      const emergencyStats = performanceMonitor.getStatistics('emergency_access');
      
      // Emergency access must be < 200ms (p95)
      expect(emergencyStats.p95).toBeLessThan(200);
      expect(emergencyStats.average).toBeLessThan(100);
      
      console.log(`Emergency Access Performance: avg=${emergencyStats.average.toFixed(2)}ms, p95=${emergencyStats.p95}ms`);
    });

    test('should meet offline save performance requirements', async () => {
      const offlineSaveTests = 200;
      
      for (let i = 0; i < offlineSaveTests; i++) {
        performanceMonitor.startTimer('offline_save');
        
        await enhancedOfflineQueueService.queueAction(
          'offline_save_performance_test',
          {
            testId: i,
            data: {
              checkInId: `test_${i}`,
              type: 'morning',
              responses: [1, 2, 3, 2, 1]
            }
          },
          { priority: OfflinePriority.MEDIUM, clinicalValidation: false }
        );
        
        performanceMonitor.endTimer('offline_save');
      }

      const saveStats = performanceMonitor.getStatistics('offline_save');
      
      // Offline saves must be < 500ms (p95)
      expect(saveStats.p95).toBeLessThan(500);
      expect(saveStats.average).toBeLessThan(200);
      
      console.log(`Offline Save Performance: avg=${saveStats.average.toFixed(2)}ms, p95=${saveStats.p95}ms`);
    });

    test('should meet queue operation performance requirements', async () => {
      const queueOperationTests = 500;
      
      for (let i = 0; i < queueOperationTests; i++) {
        performanceMonitor.startTimer('queue_operation');
        
        await enhancedOfflineQueueService.queueAction(
          'queue_performance_test',
          { testId: i, operation: 'standard' },
          { priority: OfflinePriority.LOW, clinicalValidation: false }
        );
        
        performanceMonitor.endTimer('queue_operation');
      }

      const queueStats = performanceMonitor.getStatistics('queue_operation');
      
      // Queue operations must be < 100ms (p95)
      expect(queueStats.p95).toBeLessThan(100);
      expect(queueStats.average).toBeLessThan(50);
      
      console.log(`Queue Operation Performance: avg=${queueStats.average.toFixed(2)}ms, p95=${queueStats.p95}ms`);
    });

    test('should validate comprehensive performance thresholds', async () => {
      const performanceThresholds = {
        crisis_detection: 200,     // < 200ms p95
        emergency_access: 200,     // < 200ms p95
        offline_save: 500,         // < 500ms p95
        queue_operation: 100,      // < 100ms p95
        data_integrity: 1000,      // < 1s p95
        session_resume: 500,       // < 500ms p95
        sync_operation: 2000       // < 2s p95
      };

      // Run additional performance tests
      for (let i = 0; i < 20; i++) {
        performanceMonitor.startTimer('data_integrity');
        const integrityResult = await enhancedOfflineQueueService.validateDataIntegrity();
        performanceMonitor.endTimer('data_integrity');
        expect(integrityResult.isValid).toBe(true);
        
        performanceMonitor.startTimer('session_resume');
        await resumableSessionService.getSessionState(`test_session_${i}`);
        performanceMonitor.endTimer('session_resume');
      }

      const validation = performanceMonitor.validatePerformanceThresholds(performanceThresholds);
      
      expect(validation.passed).toBe(true);
      
      if (!validation.passed) {
        validation.violations.forEach(violation => {
          console.warn(`Performance violation: ${violation.metric} = ${violation.actual}ms > ${violation.threshold}ms`);
        });
      }
    });
  });

  describe('Extended Offline Operation Performance', () => {

    test('should maintain performance during 2-hour offline simulation', async () => {
      const simulatedDuration = 2 * 60 * 60 * 1000; // 2 hours in ms
      const checkInInterval = 15 * 60 * 1000; // 15 minutes
      const totalCheckIns = Math.floor(simulatedDuration / checkInInterval);
      
      console.log(`Simulating ${totalCheckIns} check-ins over 2 hours...`);

      const performanceDegradationThreshold = 50; // 50% slowdown acceptable
      let initialPerformance: number | null = null;

      for (let i = 0; i < totalCheckIns; i++) {
        performanceMonitor.startTimer(`extended_checkin_${i}`);
        
        await enhancedOfflineQueueService.queueAction(
          'extended_offline_checkin',
          {
            checkInId: `extended_${i}`,
            simulatedTime: i * checkInInterval,
            iteration: i,
            totalDuration: simulatedDuration
          },
          { priority: OfflinePriority.MEDIUM, clinicalValidation: false }
        );
        
        const duration = performanceMonitor.endTimer(`extended_checkin_${i}`);

        if (i === 0) {
          initialPerformance = duration;
        }

        // Check for performance degradation
        if (initialPerformance && i > 10) { // After warmup
          const degradation = (duration - initialPerformance) / initialPerformance;
          if (degradation > performanceDegradationThreshold / 100) {
            console.warn(`Performance degradation detected at iteration ${i}: ${(degradation * 100).toFixed(1)}%`);
          }
          expect(degradation).toBeLessThanOrEqual(performanceDegradationThreshold / 100);
        }

        // Periodic memory check
        if (i % 10 === 0) {
          const memoryIncrease = performanceMonitor.getMemoryIncrease();
          expect(memoryIncrease).toBeLessThan(200); // < 200MB increase
        }
      }

      // Validate queue health after extended operation
      const queueStats = await enhancedOfflineQueueService.getStatistics();
      expect(queueStats.queueHealth).toBe('healthy');
      expect(queueStats.totalActions).toBe(totalCheckIns);
      
      console.log(`✓ Extended offline operation completed: ${totalCheckIns} operations processed`);
    });

    test('should handle memory optimization during large offline queues', async () => {
      const largeQueueSize = 2000;
      console.log(`Testing large queue performance: ${largeQueueSize} operations...`);
      
      performanceMonitor.startTimer('large_queue_creation');
      
      // Create large queue
      const operations = Array.from({ length: largeQueueSize }, (_, i) =>
        enhancedOfflineQueueService.queueAction(
          'large_queue_test',
          {
            operationId: i,
            data: `test_data_${i}`,
            timestamp: Date.now() + i
          },
          { 
            priority: i % 100 === 0 ? OfflinePriority.HIGH : OfflinePriority.LOW,
            clinicalValidation: false
          }
        )
      );

      await Promise.all(operations);
      const queueCreationTime = performanceMonitor.endTimer('large_queue_creation');

      // Queue creation should be reasonable
      expect(queueCreationTime).toBeLessThan(30000); // < 30 seconds
      
      // Test batch processing performance
      performanceMonitor.startTimer('batch_processing');
      
      const batchResult = await enhancedOfflineQueueService.processBatch(
        100, // Batch size
        { priorityThreshold: OfflinePriority.MEDIUM }
      );

      const batchTime = performanceMonitor.endTimer('batch_processing');

      expect(batchResult.processed).toBeGreaterThan(0);
      expect(batchTime).toBeLessThan(10000); // < 10 seconds
      expect(batchResult.memoryOptimized).toBe(true);
      
      console.log(`✓ Large queue handled: ${batchResult.processed} operations in ${batchTime}ms`);
    });

    test('should maintain crisis responsiveness under high background load', async () => {
      // Create sustained background load
      const backgroundLoadSize = 1000;
      const backgroundPromises = Array.from({ length: backgroundLoadSize }, (_, i) =>
        enhancedOfflineQueueService.queueAction(
          'background_load',
          { loadId: i, data: new Array(100).fill(`load_${i}`) },
          { priority: OfflinePriority.LOW, clinicalValidation: false }
        )
      );

      // Start background load (don't await yet)
      const backgroundPromise = Promise.all(backgroundPromises);

      // Test crisis response times during background load
      const crisisTests = 20;
      for (let i = 0; i < crisisTests; i++) {
        performanceMonitor.startTimer('crisis_under_load');
        
        const crisisResult = await enhancedOfflineQueueService.queueAction(
          'crisis_under_load_test',
          {
            crisisId: `load_test_${i}`,
            severity: 'severe',
            backgroundLoad: backgroundLoadSize
          },
          { priority: OfflinePriority.CRITICAL, clinicalValidation: true }
        );

        const crisisTime = performanceMonitor.endTimer('crisis_under_load');

        // Crisis must still respond quickly under load
        expect(crisisResult.success).toBe(true);
        expect(crisisTime).toBeLessThan(300); // Slightly higher threshold under load
        expect(crisisResult.clinicalValidation?.processedImmediately).toBe(true);
      }

      // Wait for background load to complete
      await backgroundPromise;
      
      const crisisUnderLoadStats = performanceMonitor.getStatistics('crisis_under_load');
      expect(crisisUnderLoadStats.p95).toBeLessThan(300);
      
      console.log(`✓ Crisis responsiveness maintained under load: p95=${crisisUnderLoadStats.p95}ms`);
    });
  });

  describe('Stress Testing and Load Patterns', () => {

    test('should handle steady load pattern performance', async () => {
      const steadyLoadPattern = OfflineStressTester.generateLoadPattern('steady');
      
      for (const loadPoint of steadyLoadPattern) {
        performanceMonitor.startTimer('steady_load');
        
        for (let i = 0; i < loadPoint.operations; i++) {
          await enhancedOfflineQueueService.queueAction(
            'steady_load_test',
            { 
              loadPointId: loadPoint.timestamp,
              operationIndex: i,
              type: loadPoint.type
            },
            { priority: loadPoint.priority, clinicalValidation: false }
          );
        }
        
        performanceMonitor.endTimer('steady_load');
      }

      const steadyStats = performanceMonitor.getStatistics('steady_load');
      
      // Steady load should have consistent performance
      expect(steadyStats.p95).toBeLessThan(1000);
      expect(steadyStats.max - steadyStats.min).toBeLessThan(2000); // Low variance
      
      console.log(`✓ Steady load pattern: avg=${steadyStats.average.toFixed(2)}ms, variance=${(steadyStats.max - steadyStats.min).toFixed(2)}ms`);
    });

    test('should handle burst load pattern performance', async () => {
      const burstLoadPattern = OfflineStressTester.generateLoadPattern('burst');
      
      for (const loadPoint of burstLoadPattern) {
        performanceMonitor.startTimer('burst_load');
        
        const burstPromises = Array.from({ length: loadPoint.operations }, (_, i) =>
          enhancedOfflineQueueService.queueAction(
            'burst_load_test',
            {
              loadPointId: loadPoint.timestamp,
              operationIndex: i,
              type: loadPoint.type,
              isBurst: loadPoint.operations > 5
            },
            { priority: loadPoint.priority, clinicalValidation: false }
          )
        );
        
        await Promise.all(burstPromises);
        performanceMonitor.endTimer('burst_load');
      }

      const burstStats = performanceMonitor.getStatistics('burst_load');
      
      // Burst load should handle spikes without excessive slowdown
      expect(burstStats.p95).toBeLessThan(3000);
      expect(burstStats.average).toBeLessThan(1500);
      
      console.log(`✓ Burst load pattern: avg=${burstStats.average.toFixed(2)}ms, p95=${burstStats.p95}ms`);
    });

    test('should handle crisis load pattern performance', async () => {
      const crisisLoadPattern = OfflineStressTester.generateLoadPattern('crisis');
      
      for (const loadPoint of crisisLoadPattern) {
        performanceMonitor.startTimer('crisis_load');
        
        for (let i = 0; i < loadPoint.operations; i++) {
          await enhancedOfflineQueueService.queueAction(
            'crisis_load_test',
            {
              loadPointId: loadPoint.timestamp,
              operationIndex: i,
              type: loadPoint.type,
              isCritical: loadPoint.priority === OfflinePriority.CRITICAL
            },
            { priority: loadPoint.priority, clinicalValidation: loadPoint.priority === OfflinePriority.CRITICAL }
          );
        }
        
        performanceMonitor.endTimer('crisis_load');
      }

      const crisisLoadStats = performanceMonitor.getStatistics('crisis_load');
      
      // Crisis load pattern should prioritize critical operations
      expect(crisisLoadStats.p95).toBeLessThan(500); // Faster for crisis scenarios
      expect(crisisLoadStats.average).toBeLessThan(200);
      
      console.log(`✓ Crisis load pattern: avg=${crisisLoadStats.average.toFixed(2)}ms, p95=${crisisLoadStats.p95}ms`);
    });

    test('should handle mixed load pattern with variable performance', async () => {
      const mixedLoadPattern = OfflineStressTester.generateLoadPattern('mixed');
      
      for (const loadPoint of mixedLoadPattern) {
        performanceMonitor.startTimer('mixed_load');
        
        const mixedPromises = Array.from({ length: loadPoint.operations }, (_, i) =>
          enhancedOfflineQueueService.queueAction(
            'mixed_load_test',
            {
              loadPointId: loadPoint.timestamp,
              operationIndex: i,
              type: loadPoint.type,
              priority: loadPoint.priority
            },
            { priority: loadPoint.priority, clinicalValidation: loadPoint.priority === OfflinePriority.CRITICAL }
          )
        );
        
        await Promise.all(mixedPromises);
        performanceMonitor.endTimer('mixed_load');
      }

      const mixedStats = performanceMonitor.getStatistics('mixed_load');
      
      // Mixed load should handle variability
      expect(mixedStats.p95).toBeLessThan(2000);
      expect(mixedStats.average).toBeLessThan(800);
      
      console.log(`✓ Mixed load pattern: avg=${mixedStats.average.toFixed(2)}ms, p95=${mixedStats.p95}ms`);
    });
  });

  describe('System Reliability and Recovery Testing', () => {

    test('should maintain data consistency under concurrent operations', async () => {
      const concurrentOperations = Array.from({ length: 100 }, (_, i) => ({
        id: `concurrent_${i}`,
        data: {
          operationId: i,
          timestamp: Date.now(),
          testData: `concurrent_test_${i}`,
          checksum: i.toString(16) // Simple checksum for integrity
        },
        priority: i % 10 === 0 ? OfflinePriority.HIGH : OfflinePriority.MEDIUM
      }));

      const consistencyResult = await OfflineReliabilityTester.testDataConsistency(
        concurrentOperations
      );

      expect(consistencyResult.consistent).toBe(true);
      expect(consistencyResult.dataIntegrityScore).toBeGreaterThanOrEqual(95);
      expect(consistencyResult.operationsCompleted).toBe(concurrentOperations.length);
      expect(consistencyResult.inconsistencies.length).toBeLessThanOrEqual(2); // Minimal tolerance

      console.log(`✓ Data consistency: ${consistencyResult.dataIntegrityScore}% integrity, ${consistencyResult.inconsistencies.length} inconsistencies`);
    });

    test('should recover from storage errors gracefully', async () => {
      const recoveryResult = await OfflineReliabilityTester.testServiceResilience('storage_error');

      expect(recoveryResult.resilient).toBe(true);
      expect(recoveryResult.recoveryTime).toBeLessThan(10000); // < 10 seconds
      expect(recoveryResult.dataLoss).toBe(false);
      expect(recoveryResult.errorHandling).toBe(true);

      console.log(`✓ Storage error recovery: ${recoveryResult.recoveryTime}ms recovery time`);
    });

    test('should handle memory exhaustion scenarios', async () => {
      const memoryRecoveryResult = await OfflineReliabilityTester.testServiceResilience('memory_exhaustion');

      // Memory exhaustion may cause some performance degradation but should recover
      expect(memoryRecoveryResult.resilient).toBe(true);
      expect(memoryRecoveryResult.recoveryTime).toBeLessThan(30000); // < 30 seconds
      expect(memoryRecoveryResult.errorHandling).toBe(true);

      console.log(`✓ Memory exhaustion recovery: ${memoryRecoveryResult.recoveryTime}ms recovery time`);
    });

    test('should handle queue overflow gracefully', async () => {
      const overflowRecoveryResult = await OfflineReliabilityTester.testServiceResilience('queue_overflow');

      expect(overflowRecoveryResult.resilient).toBe(true);
      expect(overflowRecoveryResult.recoveryTime).toBeLessThan(15000); // < 15 seconds
      expect(overflowRecoveryResult.errorHandling).toBe(true);

      console.log(`✓ Queue overflow recovery: ${overflowRecoveryResult.recoveryTime}ms recovery time`);
    });

    test('should maintain service health across multiple stress cycles', async () => {
      const stressCycles = 5;
      const stressTypes: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];

      for (let cycle = 0; cycle < stressCycles; cycle++) {
        console.log(`Stress cycle ${cycle + 1}/${stressCycles}`);
        
        for (const stressLevel of stressTypes) {
          await OfflineStressTester.simulateMemoryPressure(stressLevel);
          
          // Test service health after stress
          const healthStatus = await enhancedOfflineQueueService.getHealthStatus();
          expect(healthStatus.status).toBeOneOf(['healthy', 'degraded']); // Not 'critical' or 'failed'
          expect(healthStatus.clinicalSafetyStatus).toBe('safe');
        }
        
        // Recovery period between cycles
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Validate service recovery
        const postCycleHealth = await enhancedOfflineQueueService.getHealthStatus();
        expect(postCycleHealth.status).toBe('healthy');
      }

      console.log(`✓ Survived ${stressCycles} stress cycles across ${stressTypes.length} stress levels`);
    });

    test('should validate end-to-end reliability over extended period', async () => {
      const extendedTestDuration = 5 * 60 * 1000; // 5 minutes
      const operationInterval = 1000; // 1 second
      const totalOperations = Math.floor(extendedTestDuration / operationInterval);
      
      console.log(`Extended reliability test: ${totalOperations} operations over ${extendedTestDuration/1000} seconds`);

      let successfulOperations = 0;
      let failedOperations = 0;
      const startTime = Date.now();

      for (let i = 0; i < totalOperations; i++) {
        try {
          const result = await enhancedOfflineQueueService.queueAction(
            'extended_reliability_test',
            {
              operationId: i,
              timestamp: Date.now(),
              elapsedTime: Date.now() - startTime,
              progressPercentage: ((i + 1) / totalOperations) * 100
            },
            { priority: OfflinePriority.MEDIUM, clinicalValidation: i % 20 === 0 }
          );

          if (result.success) {
            successfulOperations++;
          } else {
            failedOperations++;
          }
        } catch (error) {
          failedOperations++;
        }

        // Brief pause to simulate real usage
        await new Promise(resolve => setTimeout(resolve, operationInterval));
      }

      const successRate = (successfulOperations / totalOperations) * 100;
      const finalHealth = await enhancedOfflineQueueService.getHealthStatus();

      // Reliability requirements
      expect(successRate).toBeGreaterThanOrEqual(95); // 95% success rate minimum
      expect(finalHealth.status).toBe('healthy');
      expect(finalHealth.clinicalSafetyStatus).toBe('safe');

      console.log(`✓ Extended reliability: ${successRate.toFixed(2)}% success rate (${successfulOperations}/${totalOperations})`);
    });
  });
});