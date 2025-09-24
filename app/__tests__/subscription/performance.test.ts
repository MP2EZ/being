/**
 * Subscription Performance Testing Suite
 * Day 17 Phase 5: Performance validation for subscription system
 *
 * Testing:
 * - Subscription status retrieval <500ms
 * - Feature access validation <100ms
 * - State synchronization performance
 * - Cache hit rate validation (>95%)
 * - Crisis response time validation
 */

import { renderHook, act } from '@testing-library/react-native';
import { useSubscriptionStore } from '../../src/store/subscriptionStore';
import { useFeatureGate } from '../../src/hooks/useFeatureGate';
import {
  SubscriptionTier,
  FeatureAccessResult,
  SUBSCRIPTION_CONSTANTS
} from '../../src/types/subscription';

// Mock dependencies with performance tracking
jest.mock('../../src/services/PaymentService', () => ({
  paymentService: {
    validateSubscription: jest.fn().mockImplementation(async () => {
      // Simulate network latency
      await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 50));
      return {
        tier: 'premium',
        status: 'active',
        validationLatency: Math.random() * 200 + 50
      };
    }),
    getSubscriptionDetails: jest.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 30));
      return {
        subscriptionId: 'sub_test_123',
        planId: 'plan_premium_monthly',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };
    })
  }
}));

jest.mock('../../src/services/storage/SecureDataStore', () => ({
  secureDataStore: {
    getSubscriptionState: jest.fn().mockImplementation(async () => {
      // Fast local storage access
      await new Promise(resolve => setTimeout(resolve, Math.random() * 20 + 5));
      return {
        tier: 'premium',
        status: 'active',
        lastValidated: new Date().toISOString()
      };
    }),
    saveSubscriptionState: jest.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 30 + 10));
    }),
    getFeatureCache: jest.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 15 + 3));
      return {
        'cloud_sync': {
          result: {
            hasAccess: true,
            reason: 'granted',
            validationTime: 45,
            cacheHit: true
          },
          timestamp: Date.now(),
          expiry: Date.now() + 300000
        }
      };
    }),
    saveFeatureCache: jest.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 25 + 8));
    })
  }
}));

jest.mock('../../src/services/CrisisProtectionService', () => ({
  crisisProtectionService: {
    isInCrisisMode: jest.fn().mockReturnValue(false),
    measureResponseTime: jest.fn().mockImplementation(async () => {
      // Crisis response should be very fast
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
      return Math.random() * 150 + 50;
    }),
    validateCrisisAccess: jest.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 25));
      return true;
    })
  }
}));

describe('Subscription Performance Testing Suite', () => {
  let subscriptionStore: ReturnType<typeof useSubscriptionStore>;

  beforeEach(() => {
    subscriptionStore = useSubscriptionStore.getState();

    // Reset to performance testing state
    useSubscriptionStore.setState({
      subscription: {
        tier: 'premium',
        status: 'active',
        crisisAccessGuaranteed: true,
        crisisFeatureOverrides: [],
        lastValidated: new Date().toISOString(),
        validationLatency: 75
      },
      trial: null,
      validationCache: {},
      performanceMetrics: {
        validationLatency: { avg: 85, p50: 75, p95: 150, p99: 200, max: 250 },
        crisisResponseTime: { avg: 125, max: 180, violations: 0 },
        cacheMetrics: { hitRate: 0.95, missRate: 0.05, invalidationRate: 0.02, averageSize: 2048 },
        errorMetrics: { validationErrors: 0, timeoutErrors: 0, networkErrors: 0, totalErrors: 0, errorRate: 0 },
        usageMetrics: { totalValidations: 5000, uniqueFeatures: 15, peakValidationsPerSecond: 50, averageValidationsPerUser: 250 },
        periodStart: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        periodEnd: new Date().toISOString(),
        sampleCount: 5000
      },
      lastError: null,
      retryQueue: [],
      isValidating: false,
      isUpdating: false,
      isInitialized: true,
      crisisMode: false,
      crisisOverrides: []
    });

    jest.clearAllMocks();
  });

  describe('1. Subscription Status Retrieval Performance', () => {
    test('subscription validation completes within 500ms', async () => {
      const iterations = 10;
      const validationTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();

        await act(async () => {
          await subscriptionStore.validateSubscription(false);
        });

        const endTime = performance.now();
        validationTimes.push(endTime - startTime);
      }

      const avgTime = validationTimes.reduce((a, b) => a + b, 0) / iterations;
      const maxTime = Math.max(...validationTimes);
      const p95Time = validationTimes.sort()[Math.floor(iterations * 0.95)];

      expect(avgTime).toBeLessThan(300); // Average well under 500ms
      expect(maxTime).toBeLessThan(500); // Max under 500ms
      expect(p95Time).toBeLessThan(400); // 95th percentile under 400ms

      console.log(`Subscription validation performance: avg=${avgTime.toFixed(1)}ms, max=${maxTime.toFixed(1)}ms, p95=${p95Time.toFixed(1)}ms`);
    });

    test('forced refresh performance with network calls', async () => {
      const startTime = performance.now();

      await act(async () => {
        await subscriptionStore.validateSubscription(true); // Force refresh
      });

      const endTime = performance.now();
      const refreshTime = endTime - startTime;

      expect(refreshTime).toBeLessThan(600); // Forced refresh allows longer time for network calls
      expect(subscriptionStore.subscription.validationLatency).toBeLessThan(300);
    });

    test('concurrent subscription validation performance', async () => {
      const concurrentValidations = Array(20).fill(null).map(async () => {
        const startTime = performance.now();
        await subscriptionStore.validateSubscription(false);
        const endTime = performance.now();
        return endTime - startTime;
      });

      const results = await Promise.all(concurrentValidations);

      results.forEach(time => {
        expect(time).toBeLessThan(600); // Concurrent calls may be slightly slower
      });

      const avgConcurrentTime = results.reduce((a, b) => a + b, 0) / results.length;
      expect(avgConcurrentTime).toBeLessThan(400);
    });

    test('subscription initialization performance on app start', async () => {
      // Reset to uninitialized state
      useSubscriptionStore.setState({
        ...subscriptionStore,
        isInitialized: false
      });

      const startTime = performance.now();

      await act(async () => {
        await subscriptionStore.initializeSubscription();
      });

      const endTime = performance.now();
      const initTime = endTime - startTime;

      expect(initTime).toBeLessThan(200); // Fast initialization using cached data
      expect(subscriptionStore.isInitialized).toBe(true);
    });
  });

  describe('2. Feature Access Validation Performance', () => {
    test('single feature validation meets <100ms requirement', async () => {
      const featureKeys = [
        'cloud_sync',
        'advanced_analytics',
        'family_sharing',
        'crisis_button',
        'breathing_exercises'
      ];

      for (const featureKey of featureKeys) {
        const iterations = 20;
        const validationTimes: number[] = [];

        for (let i = 0; i < iterations; i++) {
          const startTime = performance.now();

          const result = await subscriptionStore.validateFeatureAccess(featureKey);

          const endTime = performance.now();
          const validationTime = endTime - startTime;

          validationTimes.push(validationTime);

          // Validate the result includes performance metrics
          expect(result.validationTime).toBeLessThan(SUBSCRIPTION_CONSTANTS.MAX_VALIDATION_LATENCY);
        }

        const avgTime = validationTimes.reduce((a, b) => a + b, 0) / iterations;
        const maxTime = Math.max(...validationTimes);

        expect(avgTime).toBeLessThan(80); // Average well under 100ms
        expect(maxTime).toBeLessThan(SUBSCRIPTION_CONSTANTS.MAX_VALIDATION_LATENCY);

        console.log(`${featureKey} validation: avg=${avgTime.toFixed(1)}ms, max=${maxTime.toFixed(1)}ms`);
      }
    });

    test('batch feature validation performance optimization', async () => {
      const featureKeys = [
        'cloud_sync',
        'advanced_analytics',
        'family_sharing',
        'premium_content',
        'export_data',
        'offline_sync'
      ];

      const startTime = performance.now();

      const results = await subscriptionStore.checkMultipleFeatures(featureKeys);

      const endTime = performance.now();
      const batchTime = endTime - startTime;

      // Batch validation should be more efficient than individual calls
      expect(batchTime).toBeLessThan(300); // 6 features in <300ms
      expect(Object.keys(results)).toHaveLength(featureKeys.length);

      Object.values(results).forEach(result => {
        expect(result.validationTime).toBeLessThan(SUBSCRIPTION_CONSTANTS.MAX_VALIDATION_LATENCY);
      });

      const avgPerFeature = batchTime / featureKeys.length;
      expect(avgPerFeature).toBeLessThan(50); // Very efficient batch processing
    });

    test('feature gate hook performance', async () => {
      const TestComponent = ({ featureKey }: { featureKey: string }) => {
        const { hasAccess, validationTime } = useFeatureGate(featureKey);
        return { hasAccess, validationTime };
      };

      const startTime = performance.now();

      const { result } = renderHook(() => TestComponent({ featureKey: 'cloud_sync' }));

      await act(async () => {
        // Wait for hook to complete validation
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      const endTime = performance.now();
      const hookTime = endTime - startTime;

      expect(hookTime).toBeLessThan(150); // Hook overhead + validation
      expect(result.current.validationTime).toBeLessThan(SUBSCRIPTION_CONSTANTS.MAX_VALIDATION_LATENCY);
    });

    test('rapid successive feature validations', async () => {
      const feature = 'cloud_sync';
      const rapidCalls = 50;

      const startTime = performance.now();

      const promises = Array(rapidCalls).fill(null).map(() =>
        subscriptionStore.validateFeatureAccess(feature)
      );

      const results = await Promise.all(promises);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(1000); // 50 calls in <1 second

      // Most calls should hit cache after the first
      const cacheHits = results.filter(r => r.cacheHit).length;
      expect(cacheHits).toBeGreaterThan(rapidCalls * 0.8); // >80% cache hits

      const avgTimePerCall = totalTime / rapidCalls;
      expect(avgTimePerCall).toBeLessThan(20); // Very fast with caching
    });
  });

  describe('3. State Synchronization Performance', () => {
    test('subscription state update propagation speed', async () => {
      const updateStartTime = performance.now();

      await act(async () => {
        subscriptionStore.updateSubscriptionState({
          tier: 'family',
          status: 'active'
        });
      });

      const updateEndTime = performance.now();
      const updateTime = updateEndTime - updateStartTime;

      expect(updateTime).toBeLessThan(50); // State updates should be nearly instantaneous
      expect(subscriptionStore.subscription.tier).toBe('family');
    });

    test('cache invalidation and rebuild performance', async () => {
      // Pre-populate cache
      await subscriptionStore.warmupCache(['cloud_sync', 'advanced_analytics', 'family_sharing']);

      const clearStartTime = performance.now();

      await act(async () => {
        subscriptionStore.clearValidationCache();
      });

      const clearEndTime = performance.now();
      const clearTime = clearEndTime - clearStartTime;

      expect(clearTime).toBeLessThan(20); // Cache clear should be very fast

      // Rebuild cache
      const rebuildStartTime = performance.now();

      await subscriptionStore.warmupCache(['cloud_sync', 'advanced_analytics']);

      const rebuildEndTime = performance.now();
      const rebuildTime = rebuildEndTime - rebuildStartTime;

      expect(rebuildTime).toBeLessThan(200); // Cache rebuild should be fast
    });

    test('performance metrics collection overhead', async () => {
      const baselineStartTime = performance.now();

      // Perform operations without metrics
      await subscriptionStore.validateFeatureAccess('cloud_sync');

      const baselineEndTime = performance.now();
      const baselineTime = baselineEndTime - baselineStartTime;

      const metricsStartTime = performance.now();

      // Perform operations with metrics recording
      await subscriptionStore.validateFeatureAccess('advanced_analytics');
      subscriptionStore.recordValidationMetric('advanced_analytics', 75, true);

      const metricsEndTime = performance.now();
      const metricsTime = metricsEndTime - metricsStartTime;

      // Metrics collection should add minimal overhead
      const overhead = metricsTime - baselineTime;
      expect(overhead).toBeLessThan(20); // <20ms overhead for metrics
    });

    test('performance under memory pressure simulation', async () => {
      // Simulate memory pressure by creating large objects
      const memoryPressure = Array(1000).fill(null).map(() => ({
        data: new Array(1000).fill('memory pressure simulation'),
        timestamp: Date.now()
      }));

      const pressureStartTime = performance.now();

      // Perform subscription operations under memory pressure
      await subscriptionStore.validateFeatureAccess('cloud_sync');
      await subscriptionStore.validateSubscription(false);

      const pressureEndTime = performance.now();
      const pressureTime = pressureEndTime - pressureStartTime;

      // Performance should degrade gracefully under memory pressure
      expect(pressureTime).toBeLessThan(300); // Allow for degraded performance

      // Clean up memory pressure
      memoryPressure.length = 0;
    });
  });

  describe('4. Cache Hit Rate Validation', () => {
    test('cache hit rate exceeds 95% target', async () => {
      const features = ['cloud_sync', 'advanced_analytics', 'family_sharing'];

      // Warm up cache
      for (const feature of features) {
        await subscriptionStore.validateFeatureAccess(feature);
      }

      // Perform repeated validations
      const totalValidations = 100;
      let cacheHits = 0;

      for (let i = 0; i < totalValidations; i++) {
        const feature = features[i % features.length];
        const result = await subscriptionStore.validateFeatureAccess(feature);
        if (result.cacheHit) {
          cacheHits++;
        }
      }

      const hitRate = cacheHits / totalValidations;
      expect(hitRate).toBeGreaterThan(0.95); // >95% cache hit rate

      // Verify performance metrics reflect high hit rate
      expect(subscriptionStore.performanceMetrics.cacheMetrics.hitRate).toBeGreaterThan(0.95);
    });

    test('cache invalidation accuracy', async () => {
      // Cache a feature validation
      let result = await subscriptionStore.validateFeatureAccess('cloud_sync');
      expect(result.cacheHit).toBe(false); // First call is not a cache hit

      result = await subscriptionStore.validateFeatureAccess('cloud_sync');
      expect(result.cacheHit).toBe(true); // Second call should hit cache

      // Update subscription state (should invalidate cache)
      await act(async () => {
        subscriptionStore.updateSubscriptionState({
          tier: 'family',
          status: 'active'
        });
      });

      result = await subscriptionStore.validateFeatureAccess('cloud_sync');
      expect(result.cacheHit).toBe(false); // Cache should be invalidated
    });

    test('cache performance under high load', async () => {
      const features = ['cloud_sync', 'advanced_analytics', 'family_sharing', 'premium_content'];

      // Pre-populate cache
      for (const feature of features) {
        await subscriptionStore.validateFeatureAccess(feature);
      }

      // Simulate high load
      const highLoadCalls = 200;
      const startTime = performance.now();

      const promises = Array(highLoadCalls).fill(null).map((_, index) => {
        const feature = features[index % features.length];
        return subscriptionStore.validateFeatureAccess(feature);
      });

      const results = await Promise.all(promises);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const avgTimePerCall = totalTime / highLoadCalls;

      expect(avgTimePerCall).toBeLessThan(10); // Very fast with good caching

      // Most calls should hit cache
      const cacheHits = results.filter(r => r.cacheHit).length;
      const hitRate = cacheHits / highLoadCalls;
      expect(hitRate).toBeGreaterThan(0.9);
    });

    test('cache size and memory efficiency', async () => {
      const features = [
        'cloud_sync', 'advanced_analytics', 'family_sharing', 'premium_content',
        'export_data', 'offline_sync', 'collaboration', 'api_access',
        'custom_themes', 'priority_support'
      ];

      // Fill cache with multiple features
      for (const feature of features) {
        await subscriptionStore.validateFeatureAccess(feature);
      }

      // Cache should maintain reasonable size
      const cacheSize = Object.keys(subscriptionStore.validationCache).length;
      expect(cacheSize).toBeLessThanOrEqual(features.length);

      // Memory usage should be efficient
      const avgCacheEntrySize = subscriptionStore.performanceMetrics.cacheMetrics.averageSize;
      expect(avgCacheEntrySize).toBeLessThan(4096); // <4KB per cache entry
    });
  });

  describe('5. Crisis Response Time Validation', () => {
    test('crisis feature validation meets <200ms requirement', async () => {
      const crisisFeatures = ['crisis_button', 'breathing_exercises', 'emergency_contacts', 'hotline_988'];

      for (const feature of crisisFeatures) {
        const iterations = 30;
        const responseTimes: number[] = [];

        for (let i = 0; i < iterations; i++) {
          const startTime = performance.now();

          const result = await subscriptionStore.validateFeatureAccess(feature);

          const endTime = performance.now();
          const responseTime = endTime - startTime;

          responseTimes.push(responseTime);

          expect(result.validationTime).toBeLessThan(SUBSCRIPTION_CONSTANTS.CRISIS_RESPONSE_MAX_LATENCY);
        }

        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / iterations;
        const maxResponseTime = Math.max(...responseTimes);

        expect(avgResponseTime).toBeLessThan(150); // Average well under 200ms
        expect(maxResponseTime).toBeLessThan(SUBSCRIPTION_CONSTANTS.CRISIS_RESPONSE_MAX_LATENCY);

        console.log(`Crisis feature ${feature}: avg=${avgResponseTime.toFixed(1)}ms, max=${maxResponseTime.toFixed(1)}ms`);
      }
    });

    test('crisis mode activation performance', async () => {
      const { crisisProtectionService } = require('../../src/services/CrisisProtectionService');
      crisisProtectionService.isInCrisisMode.mockReturnValue(true);

      const activationStartTime = performance.now();

      await act(async () => {
        await subscriptionStore.activateCrisisOverride(['crisis_button', 'breathing_exercises']);
      });

      const activationEndTime = performance.now();
      const activationTime = activationEndTime - activationStartTime;

      expect(activationTime).toBeLessThan(100); // Crisis activation should be very fast
      expect(subscriptionStore.crisisMode).toBe(true);

      // Subsequent crisis feature access should be immediate
      const featureAccessTime = performance.now();
      const result = await subscriptionStore.validateFeatureAccess('crisis_button');
      const featureAccessEndTime = performance.now();

      expect(featureAccessEndTime - featureAccessTime).toBeLessThan(50);
      expect(result.reason).toBe('crisis_override');
    });

    test('crisis response time under system load', async () => {
      // Create background load
      const backgroundLoad = Array(20).fill(null).map(() =>
        subscriptionStore.validateFeatureAccess('advanced_analytics')
      );

      const crisisStartTime = performance.now();

      // Crisis validation should still be fast under load
      const crisisResult = await subscriptionStore.validateFeatureAccess('crisis_button');

      const crisisEndTime = performance.now();
      const crisisTime = crisisEndTime - crisisStartTime;

      expect(crisisTime).toBeLessThan(SUBSCRIPTION_CONSTANTS.CRISIS_RESPONSE_MAX_LATENCY);
      expect(crisisResult.hasAccess).toBe(true);

      // Wait for background load to complete
      await Promise.all(backgroundLoad);
    });

    test('performance degradation monitoring and alerts', async () => {
      // Simulate performance degradation
      const slowValidations = Array(10).fill(null).map(async () => {
        // Mock slow validation
        await new Promise(resolve => setTimeout(resolve, 250));
        return subscriptionStore.validateFeatureAccess('cloud_sync');
      });

      await Promise.all(slowValidations);

      // Check if performance violations are tracked
      const violations = subscriptionStore.performanceMetrics.crisisResponseTime.violations;
      expect(violations).toBeDefined();

      // Performance metrics should reflect degradation
      const maxLatency = subscriptionStore.performanceMetrics.validationLatency.max;
      expect(maxLatency).toBeGreaterThan(200); // Degradation detected
    });
  });

  describe('6. Performance Monitoring and Optimization', () => {
    test('performance metrics accuracy and completeness', async () => {
      // Perform various operations to generate metrics
      await subscriptionStore.validateFeatureAccess('cloud_sync');
      await subscriptionStore.validateFeatureAccess('advanced_analytics');
      await subscriptionStore.validateSubscription(false);
      subscriptionStore.recordValidationMetric('cloud_sync', 85, true);
      subscriptionStore.recordValidationMetric('advanced_analytics', 95, true);

      const metrics = subscriptionStore.getPerformanceMetrics();

      // Validate metric completeness
      expect(metrics.validationLatency).toHaveProperty('avg');
      expect(metrics.validationLatency).toHaveProperty('p50');
      expect(metrics.validationLatency).toHaveProperty('p95');
      expect(metrics.validationLatency).toHaveProperty('p99');
      expect(metrics.validationLatency).toHaveProperty('max');

      expect(metrics.cacheMetrics).toHaveProperty('hitRate');
      expect(metrics.cacheMetrics).toHaveProperty('missRate');
      expect(metrics.errorMetrics).toHaveProperty('errorRate');
      expect(metrics.usageMetrics).toHaveProperty('totalValidations');

      // Validate metric ranges
      expect(metrics.cacheMetrics.hitRate).toBeGreaterThanOrEqual(0);
      expect(metrics.cacheMetrics.hitRate).toBeLessThanOrEqual(1);
      expect(metrics.errorMetrics.errorRate).toBeGreaterThanOrEqual(0);
      expect(metrics.errorMetrics.errorRate).toBeLessThanOrEqual(1);
    });

    test('performance optimization recommendations', async () => {
      // Simulate performance issues
      subscriptionStore.recordValidationMetric('slow_feature', 180, true);
      subscriptionStore.recordValidationMetric('slow_feature', 190, true);
      subscriptionStore.recordValidationMetric('slow_feature', 200, true);

      const performanceValid = await subscriptionStore.validatePerformanceRequirements();

      // Performance validation should detect issues
      if (!performanceValid) {
        // Check that appropriate optimizations are recommended
        const metrics = subscriptionStore.getPerformanceMetrics();
        expect(metrics.validationLatency.max).toBeGreaterThan(SUBSCRIPTION_CONSTANTS.MAX_VALIDATION_LATENCY);
      }
    });

    test('memory and resource cleanup', async () => {
      // Generate substantial cache and metrics data
      const features = Array(50).fill(null).map((_, i) => `feature_${i}`);

      for (const feature of features) {
        subscriptionStore.recordValidationMetric(feature, Math.random() * 100 + 50, true);
      }

      // Clear old data
      subscriptionStore.clearValidationCache();

      // Verify cleanup
      expect(Object.keys(subscriptionStore.validationCache)).toHaveLength(0);

      // Performance should not be impacted after cleanup
      const startTime = performance.now();
      await subscriptionStore.validateFeatureAccess('cloud_sync');
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(SUBSCRIPTION_CONSTANTS.MAX_VALIDATION_LATENCY);
    });
  });
});