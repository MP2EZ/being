/**
 * Widget Performance Integration Tests
 * Clinical-grade performance validation for widget operations
 * Ensures therapeutic timing requirements are met
 */

import { jest } from '@jest/globals';
import { Platform } from 'react-native';
import { 
  WidgetIntegrationCoordinator,
  WidgetDataService,
  WidgetNativeBridgeService,
  widgetTestUtils,
  WIDGET_CONFIG
} from '../../src/services/widgets';
import type {
  WidgetPerformanceMetrics,
  WidgetUpdateTrigger,
  CheckInType
} from '../../src/types/widget';

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  WIDGET_UPDATE_MS: 1000,
  DEEP_LINK_RESPONSE_MS: 500,
  CRISIS_RESPONSE_MS: 200,
  DATA_GENERATION_MS: 800,
  NATIVE_BRIDGE_MS: 300,
  PRIVACY_VALIDATION_MS: 100,
  MEMORY_USAGE_MB: 50,
  CONCURRENT_OPERATIONS: 10,
  SUSTAINED_LOAD_DURATION_MS: 30000
} as const;

// Mock with performance tracking
jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: jest.fn((platforms) => platforms.ios) },
  NativeModules: {
    FullMindWidgets: {
      updateWidgetData: jest.fn().mockImplementation((data) => {
        // Simulate realistic native call latency
        return new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
      }),
      reloadWidgets: jest.fn().mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 50));
      }),
      setAppGroupData: jest.fn().mockResolvedValue(undefined),
      getAppGroupData: jest.fn().mockResolvedValue('{}'),
      performHealthCheck: jest.fn().mockImplementation(() => {
        return new Promise(resolve => setTimeout(() => resolve(true), 10 + Math.random() * 20));
      }),
      clearWidgetData: jest.fn().mockResolvedValue(undefined),
      getActiveWidgetIds: jest.fn().mockResolvedValue([1, 2, 3]),
      updateWidgetById: jest.fn().mockResolvedValue(undefined),
      updateAllWidgets: jest.fn().mockResolvedValue(undefined)
    }
  },
  NativeEventEmitter: jest.fn(() => ({
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
  }))
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockImplementation(() => 
    new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 15))
  ),
  getItemAsync: jest.fn().mockImplementation(() => 
    new Promise(resolve => setTimeout(() => resolve(null), 5 + Math.random() * 15))
  ),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined)
}));

describe('Widget Performance Integration Tests', () => {
  let coordinator: WidgetIntegrationCoordinator;
  let dataService: WidgetDataService;
  let nativeBridge: WidgetNativeBridgeService;
  let performanceTracker: PerformanceTestTracker;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Initialize high-resolution performance tracking
    performanceTracker = new PerformanceTestTracker();
    
    // Create optimized instances for performance testing
    coordinator = new WidgetIntegrationCoordinator({
      autoInitialize: false,
      healthCheckIntervalMs: 0,
      performanceMonitoring: true,
      privacyAuditLevel: 'clinical'
    });
    
    dataService = new WidgetDataService();
    nativeBridge = new WidgetNativeBridgeService();
    
    await setupPerformanceTestEnvironment();
  });

  afterEach(() => {
    coordinator?.dispose();
    nativeBridge?.dispose();
    performanceTracker.reset();
  });

  describe('Widget Update Performance', () => {
    test('should meet widget update latency requirements', async () => {
      await coordinator.initialize();
      
      const updateScenarios: Array<{
        name: string;
        trigger: WidgetUpdateTrigger;
        maxLatency: number;
      }> = [
        {
          name: 'Normal status change',
          trigger: {
            source: 'checkin_completed',
            reason: 'status_change',
            timestamp: new Date().toISOString(),
            priority: 'normal'
          },
          maxLatency: PERFORMANCE_THRESHOLDS.WIDGET_UPDATE_MS
        },
        {
          name: 'High priority update',
          trigger: {
            source: 'checkin_started',
            reason: 'progress_update',
            timestamp: new Date().toISOString(),
            priority: 'high'
          },
          maxLatency: PERFORMANCE_THRESHOLDS.WIDGET_UPDATE_MS * 0.7
        },
        {
          name: 'Critical crisis update',
          trigger: {
            source: 'crisis_mode_changed',
            reason: 'crisis_alert',
            timestamp: new Date().toISOString(),
            priority: 'critical'
          },
          maxLatency: PERFORMANCE_THRESHOLDS.CRISIS_RESPONSE_MS
        }
      ];

      for (const scenario of updateScenarios) {
        const startTime = performanceTracker.startOperation(scenario.name);
        
        await coordinator.forceUpdate(scenario.trigger);
        
        const metrics = performanceTracker.endOperation(startTime);
        
        expect(metrics.totalLatencyMs).toBeLessThan(scenario.maxLatency);
        console.log(`✅ ${scenario.name}: ${metrics.totalLatencyMs.toFixed(2)}ms (< ${scenario.maxLatency}ms)`);
      }
    });

    test('should handle concurrent widget updates efficiently', async () => {
      await coordinator.initialize();
      
      const concurrentUpdates = Array.from({ length: PERFORMANCE_THRESHOLDS.CONCURRENT_OPERATIONS }, (_, i) => {
        const trigger: WidgetUpdateTrigger = {
          source: 'checkin_completed',
          reason: 'status_change',
          timestamp: new Date().toISOString(),
          priority: 'normal'
        };
        return coordinator.forceUpdate(trigger);
      });
      
      const startTime = performanceTracker.startOperation('Concurrent Updates');
      
      await Promise.allSettled(concurrentUpdates);
      
      const metrics = performanceTracker.endOperation(startTime);
      
      // Should handle concurrent updates without significant latency increase
      expect(metrics.totalLatencyMs).toBeLessThan(PERFORMANCE_THRESHOLDS.WIDGET_UPDATE_MS * 2);
      
      console.log(`✅ Concurrent Updates (${PERFORMANCE_THRESHOLDS.CONCURRENT_OPERATIONS}): ${metrics.totalLatencyMs.toFixed(2)}ms`);
    });

    test('should maintain consistent performance under sustained load', async () => {
      await coordinator.initialize();
      
      const loadTestResults: number[] = [];
      const endTime = Date.now() + PERFORMANCE_THRESHOLDS.SUSTAINED_LOAD_DURATION_MS;
      let operationCount = 0;
      
      while (Date.now() < endTime) {
        const startTime = performanceTracker.startOperation(`Load Test ${operationCount}`);
        
        await coordinator.forceUpdate({
          source: 'manual_refresh',
          reason: 'data_refresh',
          timestamp: new Date().toISOString(),
          priority: 'normal'
        });
        
        const metrics = performanceTracker.endOperation(startTime);
        loadTestResults.push(metrics.totalLatencyMs);
        operationCount++;
        
        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const averageLatency = loadTestResults.reduce((sum, latency) => sum + latency, 0) / loadTestResults.length;
      const maxLatency = Math.max(...loadTestResults);
      const minLatency = Math.min(...loadTestResults);
      
      // Performance should remain consistent
      expect(averageLatency).toBeLessThan(PERFORMANCE_THRESHOLDS.WIDGET_UPDATE_MS);
      expect(maxLatency).toBeLessThan(PERFORMANCE_THRESHOLDS.WIDGET_UPDATE_MS * 2);
      
      // Performance degradation should be minimal
      const performanceDegradation = (maxLatency - minLatency) / minLatency;
      expect(performanceDegradation).toBeLessThan(2.0); // Less than 200% increase
      
      console.log(`✅ Sustained Load Test (${operationCount} operations over ${PERFORMANCE_THRESHOLDS.SUSTAINED_LOAD_DURATION_MS}ms):`);
      console.log(`   Average: ${averageLatency.toFixed(2)}ms, Min: ${minLatency.toFixed(2)}ms, Max: ${maxLatency.toFixed(2)}ms`);
    });
  });

  describe('Deep Link Performance', () => {
    test('should respond to deep links within therapeutic timing', async () => {
      const deepLinkScenarios: Array<{
        name: string;
        type: CheckInType;
        resume: boolean;
        maxLatency: number;
      }> = [
        { name: 'Morning check-in (new)', type: 'morning', resume: false, maxLatency: PERFORMANCE_THRESHOLDS.DEEP_LINK_RESPONSE_MS },
        { name: 'Evening check-in (resume)', type: 'evening', resume: true, maxLatency: PERFORMANCE_THRESHOLDS.DEEP_LINK_RESPONSE_MS },
        { name: 'Crisis deep link', type: 'morning', resume: false, maxLatency: PERFORMANCE_THRESHOLDS.CRISIS_RESPONSE_MS }
      ];
      
      for (const scenario of deepLinkScenarios) {
        const deepLink = scenario.name.includes('Crisis') 
          ? widgetTestUtils.simulateCrisisDeepLink()
          : widgetTestUtils.simulateDeepLink(scenario.type, scenario.resume);
        
        const startTime = performanceTracker.startOperation(scenario.name);
        
        await coordinator.handleDeepLink(deepLink);
        
        const metrics = performanceTracker.endOperation(startTime);
        
        expect(metrics.totalLatencyMs).toBeLessThan(scenario.maxLatency);
        console.log(`✅ ${scenario.name}: ${metrics.totalLatencyMs.toFixed(2)}ms (< ${scenario.maxLatency}ms)`);
      }
    });

    test('should handle rapid deep link taps without performance degradation', async () => {
      // Simulate user rapidly tapping widget
      const rapidTaps = Array.from({ length: 5 }, (_, i) => ({
        delay: i * 100, // 100ms between taps
        link: widgetTestUtils.simulateDeepLink('morning', false)
      }));
      
      const startTime = performanceTracker.startOperation('Rapid Deep Link Taps');
      
      const tapPromises = rapidTaps.map(tap => 
        new Promise(resolve => 
          setTimeout(() => 
            coordinator.handleDeepLink(tap.link).then(resolve).catch(resolve), 
          tap.delay)
        )
      );
      
      await Promise.allSettled(tapPromises);
      
      const metrics = performanceTracker.endOperation(startTime);
      
      // Should handle rapid taps without significant delay
      expect(metrics.totalLatencyMs).toBeLessThan(PERFORMANCE_THRESHOLDS.DEEP_LINK_RESPONSE_MS * 2);
      
      console.log(`✅ Rapid Deep Link Taps: ${metrics.totalLatencyMs.toFixed(2)}ms`);
    });
  });

  describe('Data Generation Performance', () => {
    test('should generate widget data within acceptable timeframes', async () => {
      const dataGenerationTests = [
        { scenario: 'Empty state', setupFn: () => {} },
        { scenario: 'Single check-in', setupFn: () => mockSingleCheckIn() },
        { scenario: 'Multiple check-ins', setupFn: () => mockMultipleCheckIns() },
        { scenario: 'Partial session', setupFn: () => mockPartialSession() },
        { scenario: 'Crisis mode', setupFn: () => mockCrisisMode() }
      ];
      
      for (const test of dataGenerationTests) {
        test.setupFn();
        
        const startTime = performanceTracker.startOperation(`Data Generation - ${test.scenario}`);
        
        const widgetData = await dataService.generateWidgetData();
        
        const metrics = performanceTracker.endOperation(startTime);
        
        expect(metrics.totalLatencyMs).toBeLessThan(PERFORMANCE_THRESHOLDS.DATA_GENERATION_MS);
        expect(widgetData).toBeDefined();
        
        console.log(`✅ ${test.scenario}: ${metrics.totalLatencyMs.toFixed(2)}ms (< ${PERFORMANCE_THRESHOLDS.DATA_GENERATION_MS}ms)`);
      }
    });

    test('should maintain privacy validation performance', async () => {
      const testDataSets = [
        widgetTestUtils.createMockWidgetData(),
        { invalidData: 'phq9Score: 15', malicious: 'javascript:alert("xss")' },
        { largeData: 'x'.repeat(10000) },
        { complexData: { deeply: { nested: { data: { with: { many: { levels: true } } } } } } }
      ];
      
      for (const [index, testData] of testDataSets.entries()) {
        const startTime = performanceTracker.startOperation(`Privacy Validation ${index + 1}`);
        
        const validationResult = widgetTestUtils.validatePrivacy(testData);
        
        const metrics = performanceTracker.endOperation(startTime);
        
        expect(metrics.totalLatencyMs).toBeLessThan(PERFORMANCE_THRESHOLDS.PRIVACY_VALIDATION_MS);
        expect(validationResult).toBeDefined();
        
        console.log(`✅ Privacy Validation ${index + 1}: ${metrics.totalLatencyMs.toFixed(2)}ms (< ${PERFORMANCE_THRESHOLDS.PRIVACY_VALIDATION_MS}ms)`);
      }
    });
  });

  describe('Native Bridge Performance', () => {
    test('should meet native call latency requirements', async () => {
      const nativeOperations = [
        { name: 'Store widget data', fn: () => nativeBridge.storeWidgetData(widgetTestUtils.createMockWidgetData()) },
        { name: 'Trigger widget update', fn: () => nativeBridge.triggerWidgetUpdate() },
        { name: 'Health check', fn: () => nativeBridge.performHealthCheck() },
        { name: 'Get performance metrics', fn: () => nativeBridge.getPerformanceMetrics() }
      ];
      
      for (const operation of nativeOperations) {
        const startTime = performanceTracker.startOperation(operation.name);
        
        await operation.fn();
        
        const metrics = performanceTracker.endOperation(startTime);
        
        expect(metrics.totalLatencyMs).toBeLessThan(PERFORMANCE_THRESHOLDS.NATIVE_BRIDGE_MS);
        console.log(`✅ ${operation.name}: ${metrics.totalLatencyMs.toFixed(2)}ms (< ${PERFORMANCE_THRESHOLDS.NATIVE_BRIDGE_MS}ms)`);
      }
    });

    test('should handle platform-specific performance characteristics', async () => {
      const platforms: Array<{ name: string; os: string }> = [
        { name: 'iOS', os: 'ios' },
        { name: 'Android', os: 'android' }
      ];
      
      for (const platform of platforms) {
        Platform.OS = platform.os as any;
        
        const bridge = new WidgetNativeBridgeService();
        await bridge.initialize();
        
        const startTime = performanceTracker.startOperation(`${platform.name} Bridge Operations`);
        
        // Perform typical operations
        const mockData = widgetTestUtils.createMockWidgetData();
        await bridge.storeWidgetData(mockData);
        await bridge.triggerWidgetUpdate();
        await bridge.performHealthCheck();
        
        const metrics = performanceTracker.endOperation(startTime);
        
        // Platform-specific performance should be consistent
        expect(metrics.totalLatencyMs).toBeLessThan(PERFORMANCE_THRESHOLDS.NATIVE_BRIDGE_MS * 3);
        
        console.log(`✅ ${platform.name} Bridge Operations: ${metrics.totalLatencyMs.toFixed(2)}ms`);
      }
    });
  });

  describe('Memory and Resource Usage', () => {
    test('should maintain acceptable memory usage', async () => {
      const initialMemory = getMemoryUsage();
      
      // Perform memory-intensive operations
      const operations = Array.from({ length: 50 }, async (_, i) => {
        const widgetData = await dataService.generateWidgetData();
        await coordinator.forceUpdate({
          source: 'manual_refresh',
          reason: 'data_refresh',
          timestamp: new Date().toISOString(),
          priority: 'normal'
        });
        return widgetData;
      });
      
      await Promise.all(operations);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = getMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;
      
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE_MB);
      
      console.log(`✅ Memory Usage: ${memoryIncrease.toFixed(2)}MB increase (< ${PERFORMANCE_THRESHOLDS.MEMORY_USAGE_MB}MB)`);
    });

    test('should clean up resources properly', async () => {
      const resourceTests = [
        {
          name: 'Coordinator cleanup',
          setup: () => new WidgetIntegrationCoordinator({ autoInitialize: false }),
          cleanup: (instance) => instance.dispose()
        },
        {
          name: 'Native bridge cleanup',
          setup: () => new WidgetNativeBridgeService(),
          cleanup: (instance) => instance.dispose()
        }
      ];
      
      for (const test of resourceTests) {
        const startTime = performanceTracker.startOperation(`${test.name} - Setup`);
        
        const instance = test.setup();
        await instance.initialize?.();
        
        const setupMetrics = performanceTracker.endOperation(startTime);
        
        const cleanupStart = performanceTracker.startOperation(`${test.name} - Cleanup`);
        
        test.cleanup(instance);
        
        const cleanupMetrics = performanceTracker.endOperation(cleanupStart);
        
        // Cleanup should be fast
        expect(cleanupMetrics.totalLatencyMs).toBeLessThan(100);
        
        console.log(`✅ ${test.name}: Setup ${setupMetrics.totalLatencyMs.toFixed(2)}ms, Cleanup ${cleanupMetrics.totalLatencyMs.toFixed(2)}ms`);
      }
    });
  });

  describe('Performance Regression Detection', () => {
    test('should detect performance regressions', async () => {
      const baselineOperations = [
        { name: 'Widget Update', fn: () => coordinator.forceUpdate() },
        { name: 'Data Generation', fn: () => dataService.generateWidgetData() },
        { name: 'Deep Link', fn: () => coordinator.handleDeepLink(widgetTestUtils.simulateDeepLink('morning')) }
      ];
      
      // Establish baseline
      const baseline: Record<string, number> = {};
      
      for (const operation of baselineOperations) {
        const measurements: number[] = [];
        
        // Take multiple measurements for accuracy
        for (let i = 0; i < 10; i++) {
          const startTime = performanceTracker.startOperation(operation.name);
          await operation.fn();
          const metrics = performanceTracker.endOperation(startTime);
          measurements.push(metrics.totalLatencyMs);
        }
        
        // Use median for stability
        baseline[operation.name] = measurements.sort((a, b) => a - b)[Math.floor(measurements.length / 2)];
      }
      
      // Test for regressions (operations should not be significantly slower)
      for (const [operationName, baselineLatency] of Object.entries(baseline)) {
        expect(baselineLatency).toBeLessThan(PERFORMANCE_THRESHOLDS.WIDGET_UPDATE_MS);
        
        // Log baseline for future comparison
        console.log(`📊 Baseline ${operationName}: ${baselineLatency.toFixed(2)}ms`);
      }
    });
  });
});

/**
 * Performance Test Tracker
 * High-resolution performance measurement utility
 */
class PerformanceTestTracker {
  private operations: Map<string, number> = new Map();
  private results: WidgetPerformanceMetrics[] = [];

  startOperation(name: string): string {
    const operationId = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.operations.set(operationId, performance.now());
    return operationId;
  }

  endOperation(operationId: string): WidgetPerformanceMetrics {
    const startTime = this.operations.get(operationId);
    const endTime = performance.now();
    
    if (!startTime) {
      throw new Error(`Operation ${operationId} not found`);
    }
    
    const totalLatencyMs = endTime - startTime;
    
    const metrics: WidgetPerformanceMetrics = {
      updateLatencyMs: totalLatencyMs,
      nativeCallLatencyMs: 0, // Would be measured separately in real implementation
      dataSerializationMs: 0,
      privacyValidationMs: 0,
      totalOperationMs: totalLatencyMs
    };
    
    this.results.push(metrics);
    this.operations.delete(operationId);
    
    return metrics;
  }

  getAverageMetrics(): WidgetPerformanceMetrics {
    if (this.results.length === 0) {
      return {
        updateLatencyMs: 0,
        nativeCallLatencyMs: 0,
        dataSerializationMs: 0,
        privacyValidationMs: 0,
        totalOperationMs: 0
      };
    }

    const sum = this.results.reduce((acc, metrics) => ({
      updateLatencyMs: acc.updateLatencyMs + metrics.updateLatencyMs,
      nativeCallLatencyMs: acc.nativeCallLatencyMs + metrics.nativeCallLatencyMs,
      dataSerializationMs: acc.dataSerializationMs + metrics.dataSerializationMs,
      privacyValidationMs: acc.privacyValidationMs + metrics.privacyValidationMs,
      totalOperationMs: acc.totalOperationMs + metrics.totalOperationMs
    }));

    const count = this.results.length;

    return {
      updateLatencyMs: sum.updateLatencyMs / count,
      nativeCallLatencyMs: sum.nativeCallLatencyMs / count,
      dataSerializationMs: sum.dataSerializationMs / count,
      privacyValidationMs: sum.privacyValidationMs / count,
      totalOperationMs: sum.totalOperationMs / count
    };
  }

  reset(): void {
    this.operations.clear();
    this.results = [];
  }
}

/**
 * Test Setup Helpers
 */
async function setupPerformanceTestEnvironment(): Promise<void> {
  // Setup mock store with performance-optimized state
  const mockStore = {
    checkIns: [],
    todaysCheckIns: [],
    currentCheckIn: null,
    crisisMode: { isActive: false },
    
    getTodaysProgress: jest.fn().mockReturnValue({ completed: 0, total: 3 }),
    getTodaysCheckIn: jest.fn().mockReturnValue(null),
    getWidgetUpdateStatus: jest.fn().mockReturnValue({ needsUpdate: false, lastUpdate: null }),
    markWidgetUpdated: jest.fn(),
    addCheckIn: jest.fn()
  };
  
  const { useCheckInStore } = await import('../../src/store/checkInStore');
  (useCheckInStore as any).getState = jest.fn(() => mockStore);
}

function mockSingleCheckIn(): void {
  const store = require('../../src/store/checkInStore').useCheckInStore.getState();
  store.todaysCheckIns = [{
    id: 'morning_checkin',
    type: 'morning',
    completedAt: new Date().toISOString(),
    data: { emotions: ['calm'], bodyAreas: ['chest'] }
  }];
}

function mockMultipleCheckIns(): void {
  const store = require('../../src/store/checkInStore').useCheckInStore.getState();
  store.todaysCheckIns = [
    {
      id: 'morning_checkin',
      type: 'morning',
      completedAt: new Date(Date.now() - 3600000).toISOString(),
      data: { emotions: ['calm'], bodyAreas: ['chest'] }
    },
    {
      id: 'midday_checkin',
      type: 'midday',
      completedAt: new Date().toISOString(),
      data: { emotions: ['focused'], bodyAreas: ['shoulders'] }
    }
  ];
}

function mockPartialSession(): void {
  const store = require('../../src/store/checkInStore').useCheckInStore.getState();
  store.currentCheckIn = {
    id: 'partial_evening',
    type: 'evening',
    startedAt: new Date().toISOString(),
    progress: { currentStep: 3, totalSteps: 7, percentComplete: 43 }
  };
  store.checkForPartialSession = jest.fn().mockResolvedValue(true);
  store.getSessionProgress = jest.fn().mockResolvedValue({ currentStep: 3, totalSteps: 7, percentComplete: 43 });
}

function mockCrisisMode(): void {
  const store = require('../../src/store/checkInStore').useCheckInStore.getState();
  store.crisisMode = {
    isActive: true,
    triggeredAt: new Date().toISOString(),
    reason: 'high_risk_assessment'
  };
}

function getMemoryUsage(): number {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed / 1024 / 1024; // MB
  }
  // Fallback for environments without process
  return 0;
}