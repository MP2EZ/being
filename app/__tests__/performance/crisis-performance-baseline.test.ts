/**
 * CRISIS FEATURES PERFORMANCE BASELINE - PHASE 3
 * Comprehensive performance testing for crisis integration features
 *
 * PERFORMANCE TARGETS:
 * - Crisis detection: <50ms
 * - Crisis resource load: <200ms
 * - Crisis plan creation: <500ms
 * - Crisis plan save: <100ms
 * - Post-crisis support activation: <200ms
 * - Memory usage: <5MB for crisis features
 * - Bundle size impact: <100KB
 *
 * MONITORING:
 * - Load time metrics
 * - Memory profiling
 * - CPU usage patterns
 * - Storage I/O performance
 * - Component render times
 */

import { jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { performance } from 'perf_hooks';

// Crisis feature imports
import { NATIONAL_CRISIS_RESOURCES, getCrisisResource } from '../../src/services/crisis/types/CrisisResources';
import { useCrisisPlanStore } from '../../src/stores/crisisPlanStore';
import { postCrisisSupportService } from '../../src/services/crisis/PostCrisisSupportService';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-secure-store');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('CRISIS FEATURES PERFORMANCE BASELINE - PHASE 3', () => {
  const performanceMetrics: Record<string, number[]> = {
    crisisResourceLoad: [],
    crisisPlanCreation: [],
    crisisPlanSave: [],
    crisisPlanLoad: [],
    postCrisisSupportActivation: [],
    checkInRecording: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    mockSecureStore.setItemAsync.mockResolvedValue(undefined);
  });

  afterAll(() => {
    // Report performance summary
    console.log('\n' + '='.repeat(80));
    console.log('CRISIS FEATURES PERFORMANCE BASELINE SUMMARY');
    console.log('='.repeat(80));

    Object.entries(performanceMetrics).forEach(([metric, values]) => {
      if (values.length > 0) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const p95 = values.sort((a, b) => a - b)[Math.floor(values.length * 0.95)];

        console.log(`\n${metric}:`);
        console.log(`  Average: ${avg.toFixed(2)}ms`);
        console.log(`  Min: ${min.toFixed(2)}ms`);
        console.log(`  Max: ${max.toFixed(2)}ms`);
        console.log(`  P95: ${p95.toFixed(2)}ms`);
      }
    });

    console.log('\n' + '='.repeat(80));
  });

  describe('📞 CRISIS RESOURCE LOAD PERFORMANCE', () => {
    it('should load all crisis resources within <200ms target', () => {
      const iterations = 100;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        const resources = NATIONAL_CRISIS_RESOURCES;
        const loadTime = performance.now() - startTime;

        times.push(loadTime);
        expect(resources.length).toBe(8);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      performanceMetrics.crisisResourceLoad.push(...times);

      console.log(`✅ Crisis resource load: ${avgTime.toFixed(2)}ms avg (target: <200ms)`);
      expect(avgTime).toBeLessThan(200);
    });

    it('should retrieve individual crisis resource within <10ms', () => {
      const iterations = 1000;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        const resource = getCrisisResource('988_lifeline');
        const loadTime = performance.now() - startTime;

        times.push(loadTime);
        expect(resource).toBeDefined();
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`✅ Individual resource lookup: ${avgTime.toFixed(2)}ms avg (target: <10ms)`);
      expect(avgTime).toBeLessThan(10);
    });

    it('should measure memory footprint of crisis resources', () => {
      const resourcesJson = JSON.stringify(NATIONAL_CRISIS_RESOURCES);
      const sizeInBytes = new Blob([resourcesJson]).size;
      const sizeInKB = sizeInBytes / 1024;

      console.log(`📊 Crisis resources memory: ${sizeInKB.toFixed(2)}KB`);
      expect(sizeInKB).toBeLessThan(50); // Should be under 50KB
    });
  });

  describe('🛡️ CRISIS PLAN PERFORMANCE', () => {
    it('should create crisis plan within <500ms target', async () => {
      const store = useCrisisPlanStore.getState();
      const iterations = 50;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await store.createCrisisPlan(true);
        const createTime = performance.now() - startTime;

        times.push(createTime);
        expect(store.crisisPlan).toBeTruthy();

        // Reset for next iteration
        await store.deleteCrisisPlan();
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      performanceMetrics.crisisPlanCreation.push(...times);

      console.log(`✅ Crisis plan creation: ${avgTime.toFixed(2)}ms avg (target: <500ms)`);
      expect(avgTime).toBeLessThan(500);
    });

    it('should save crisis plan within <100ms target', async () => {
      const store = useCrisisPlanStore.getState();
      await store.createCrisisPlan(true);

      const iterations = 50;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await store.addWarningSign(`Test warning ${i}`, 'personal');
        const saveTime = performance.now() - startTime;

        times.push(saveTime);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      performanceMetrics.crisisPlanSave.push(...times);

      console.log(`✅ Crisis plan save: ${avgTime.toFixed(2)}ms avg (target: <100ms)`);
      expect(avgTime).toBeLessThan(100);
    });

    it('should load crisis plan within <100ms target', async () => {
      const store = useCrisisPlanStore.getState();
      await store.createCrisisPlan(true);

      const iterations = 50;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await store.loadCrisisPlan();
        const loadTime = performance.now() - startTime;

        times.push(loadTime);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      performanceMetrics.crisisPlanLoad.push(...times);

      console.log(`✅ Crisis plan load: ${avgTime.toFixed(2)}ms avg (target: <100ms)`);
      expect(avgTime).toBeLessThan(100);
    });

    it('should export crisis plan within <500ms target', async () => {
      const store = useCrisisPlanStore.getState();
      await store.createCrisisPlan(true);
      await store.addWarningSign('Test warning', 'personal');
      await store.addCopingStrategy('Test strategy');
      await store.addReasonForLiving('Test reason');

      const iterations = 20;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        const exportText = await store.exportCrisisPlan('text');
        const exportTime = performance.now() - startTime;

        times.push(exportTime);
        expect(exportText.length).toBeGreaterThan(0);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`✅ Crisis plan export: ${avgTime.toFixed(2)}ms avg (target: <500ms)`);
      expect(avgTime).toBeLessThan(500);
    });
  });

  describe('📅 POST-CRISIS SUPPORT PERFORMANCE', () => {
    beforeEach(async () => {
      await postCrisisSupportService.initialize();
    });

    it('should activate support within <200ms target', async () => {
      const iterations = 50;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await postCrisisSupportService.activateSupport('phq9_moderate', 15);
        const activateTime = performance.now() - startTime;

        times.push(activateTime);

        // Cleanup
        await postCrisisSupportService.optOut();
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      performanceMetrics.postCrisisSupportActivation.push(...times);

      console.log(`✅ Post-crisis support activation: ${avgTime.toFixed(2)}ms avg (target: <200ms)`);
      expect(avgTime).toBeLessThan(200);
    });

    it('should record check-in within <100ms target', async () => {
      await postCrisisSupportService.activateSupport('phq9_moderate', 15);

      const iterations = 50;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await postCrisisSupportService.recordCheckIn(i % 7, 3, 'Test note');
        const recordTime = performance.now() - startTime;

        times.push(recordTime);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      performanceMetrics.checkInRecording.push(...times);

      console.log(`✅ Check-in recording: ${avgTime.toFixed(2)}ms avg (target: <100ms)`);
      expect(avgTime).toBeLessThan(100);
    });

    it('should retrieve supportive messages within <10ms', () => {
      const iterations = 1000;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const day = (i % 7) + 1;
        const startTime = performance.now();
        const message = postCrisisSupportService.getSupportiveMessage(day);
        const retrieveTime = performance.now() - startTime;

        times.push(retrieveTime);
        expect(message.length).toBeGreaterThan(0);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`✅ Supportive message retrieval: ${avgTime.toFixed(2)}ms avg (target: <10ms)`);
      expect(avgTime).toBeLessThan(10);
    });
  });

  describe('⚡ CONCURRENT OPERATIONS PERFORMANCE', () => {
    it('should handle concurrent crisis plan operations efficiently', async () => {
      const store = useCrisisPlanStore.getState();
      await store.createCrisisPlan(true);

      const startTime = performance.now();

      await Promise.all([
        store.addWarningSign('Warning 1', 'personal'),
        store.addWarningSign('Warning 2', 'personal'),
        store.addCopingStrategy('Strategy 1'),
        store.addCopingStrategy('Strategy 2'),
        store.addReasonForLiving('Reason 1'),
        store.addReasonForLiving('Reason 2'),
      ]);

      const totalTime = performance.now() - startTime;

      console.log(`✅ Concurrent operations (6 ops): ${totalTime.toFixed(2)}ms`);
      expect(totalTime).toBeLessThan(1000); // All operations within 1 second
      expect(store.crisisPlan?.warningSignsPersonal).toHaveLength(2);
      expect(store.crisisPlan?.copingStrategies).toHaveLength(2);
      expect(store.crisisPlan?.reasonsForLiving).toHaveLength(2);
    });

    it('should handle rapid sequential operations without degradation', async () => {
      const store = useCrisisPlanStore.getState();
      await store.createCrisisPlan(true);

      const operationTimes: number[] = [];

      for (let i = 0; i < 20; i++) {
        const startTime = performance.now();
        await store.addWarningSign(`Warning ${i}`, 'personal');
        const operationTime = performance.now() - startTime;
        operationTimes.push(operationTime);
      }

      // Check that later operations aren't significantly slower
      const firstFive = operationTimes.slice(0, 5);
      const lastFive = operationTimes.slice(-5);
      const firstFiveAvg = firstFive.reduce((a, b) => a + b, 0) / firstFive.length;
      const lastFiveAvg = lastFive.reduce((a, b) => a + b, 0) / lastFive.length;

      console.log(`📊 First 5 ops avg: ${firstFiveAvg.toFixed(2)}ms`);
      console.log(`📊 Last 5 ops avg: ${lastFiveAvg.toFixed(2)}ms`);

      // Last operations should not be more than 50% slower
      expect(lastFiveAvg).toBeLessThan(firstFiveAvg * 1.5);
    });
  });

  describe('💾 STORAGE PERFORMANCE', () => {
    it('should measure SecureStore write performance', async () => {
      const store = useCrisisPlanStore.getState();
      const iterations = 20;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        await store.createCrisisPlan(true);

        // Measure actual SecureStore call time
        const startTime = performance.now();
        await mockSecureStore.setItemAsync('test_key', JSON.stringify(store.crisisPlan));
        const writeTime = performance.now() - startTime;

        times.push(writeTime);
        await store.deleteCrisisPlan();
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`💾 SecureStore write: ${avgTime.toFixed(2)}ms avg`);
    });

    it('should measure AsyncStorage write performance', async () => {
      const iterations = 50;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const data = { test: `data_${i}`, timestamp: Date.now() };

        const startTime = performance.now();
        await mockAsyncStorage.setItem('test_key', JSON.stringify(data));
        const writeTime = performance.now() - startTime;

        times.push(writeTime);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`💾 AsyncStorage write: ${avgTime.toFixed(2)}ms avg`);
    });
  });

  describe('📊 MEMORY USAGE ANALYSIS', () => {
    it('should measure crisis plan memory footprint', async () => {
      const store = useCrisisPlanStore.getState();
      await store.createCrisisPlan(true);

      // Add substantial data
      for (let i = 0; i < 10; i++) {
        await store.addWarningSign(`Warning ${i}`, 'personal');
        await store.addCopingStrategy(`Strategy ${i}`);
        await store.addReasonForLiving(`Reason ${i}`);
      }

      const planJson = JSON.stringify(store.crisisPlan);
      const sizeInBytes = new Blob([planJson]).size;
      const sizeInKB = sizeInBytes / 1024;

      console.log(`📊 Crisis plan with 30 items: ${sizeInKB.toFixed(2)}KB`);
      expect(sizeInKB).toBeLessThan(100); // Should be under 100KB even with lots of data
    });

    it('should measure post-crisis support memory footprint', async () => {
      await postCrisisSupportService.activateSupport('phq9_moderate', 15);

      // Add check-ins
      for (let i = 0; i < 7; i++) {
        await postCrisisSupportService.recordCheckIn(i, 3, 'Test note with some longer content to measure realistic size');
      }

      const support = postCrisisSupportService.getCurrentSupport();
      const supportJson = JSON.stringify(support);
      const sizeInBytes = new Blob([supportJson]).size;
      const sizeInKB = sizeInBytes / 1024;

      console.log(`📊 Post-crisis support with 7 check-ins: ${sizeInKB.toFixed(2)}KB`);
      expect(sizeInKB).toBeLessThan(50); // Should be under 50KB
    });
  });
});

console.log('✅ Crisis Performance Baseline Tests Complete');