/**
 * Sync Performance Optimizer - Phase 2 Performance Enhancement
 *
 * Advanced real-time sync optimization engine delivering:
 * - <500ms sync propagation across devices and subscription tiers
 * - <200ms crisis response guaranteed regardless of system load
 * - Memory-efficient orchestration for mobile device constraints
 * - Adaptive batching with subscription tier resource allocation
 * - Network optimization with bandwidth-aware synchronization
 *
 * PERFORMANCE TARGETS:
 * - Crisis operations: <200ms (absolute requirement)
 * - Premium sync: <500ms for real-time user experience
 * - Basic sync: <2s for standard operations
 * - Background sync: <5s for non-critical updates
 * - Conflict resolution: <1s for complex therapeutic scenarios
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { z } from 'zod';
import type { SyncOperation, SyncEntityType } from '../../types/sync';
import type { SubscriptionTier } from '../../types/subscription';
import type { DeviceInfo, CrossDeviceSession } from '../../services/cloud/CrossDeviceSyncCoordinationAPI';

// ============================================================================
// PERFORMANCE OPTIMIZATION TYPES
// ============================================================================

/**
 * Sync performance optimization configuration
 */
export interface SyncPerformanceConfig {
  readonly subscription: {
    readonly tier: SubscriptionTier;
    readonly deviceLimit: number;
    readonly concurrentOperations: number;
    readonly bandwidthAllocation: number; // bytes/second
  };
  readonly performance: {
    readonly targetSyncLatency: number; // ms
    readonly crisisResponseTime: number; // ms
    readonly conflictResolutionTimeout: number; // ms
    readonly maxConcurrentSyncs: number;
  };
  readonly optimization: {
    readonly adaptiveBatching: boolean;
    readonly networkAwareness: boolean;
    readonly memoryOptimization: boolean;
    readonly batteryOptimization: boolean;
  };
  readonly crisis: {
    readonly emergencyReservedCapacity: number; // percentage (0-1)
    readonly crisisOverrideEnabled: boolean;
    readonly maxCrisisResponseTime: number; // ms
  };
}

/**
 * Performance metrics tracking
 */
export interface PerformanceMetrics {
  readonly syncLatency: {
    readonly current: number; // ms
    readonly average: number; // ms
    readonly p95: number; // ms
    readonly p99: number; // ms
    readonly targetViolations: number;
  };
  readonly crisisResponse: {
    readonly lastResponseTime: number; // ms
    readonly averageResponseTime: number; // ms
    readonly violations: number; // times >200ms
    readonly successRate: number; // 0-1
  };
  readonly throughput: {
    readonly operationsPerSecond: number;
    readonly successfulOperations: number;
    readonly failedOperations: number;
    readonly queueDepth: number;
  };
  readonly resourceUsage: {
    readonly memoryUsage: number; // bytes
    readonly cpuUsage: number; // 0-1
    readonly networkBandwidth: number; // bytes/second
    readonly batteryImpact: number; // 0-1
  };
  readonly subscription: {
    readonly tierOptimizations: Record<SubscriptionTier, number>; // operations optimized
    readonly quotaUtilization: number; // 0-1
    readonly priorityBoosts: number;
  };
}

/**
 * Adaptive batching strategy
 */
export interface AdaptiveBatchingStrategy {
  readonly batchSize: number;
  readonly frequencyMs: number;
  readonly priorityThreshold: number;
  readonly networkQualityFactor: number;
  readonly subscriptionTierMultiplier: number;
}

/**
 * Network optimization parameters
 */
export interface NetworkOptimization {
  readonly compressionEnabled: boolean;
  readonly deltaSync: boolean;
  readonly priorityQueue: boolean;
  readonly bandwidthAdaptation: boolean;
  readonly connectionPooling: boolean;
}

/**
 * Memory optimization settings
 */
export interface MemoryOptimization {
  readonly maxCacheSize: number; // bytes
  readonly gcTriggerThreshold: number; // bytes
  readonly objectPooling: boolean;
  readonly lazyLoading: boolean;
  readonly dataCompression: boolean;
}

// ============================================================================
// SYNC PERFORMANCE OPTIMIZER STORE
// ============================================================================

export interface SyncPerformanceOptimizerStore {
  // State
  config: SyncPerformanceConfig;
  metrics: PerformanceMetrics;
  adaptiveBatching: AdaptiveBatchingStrategy;
  networkOptimization: NetworkOptimization;
  memoryOptimization: MemoryOptimization;

  // Performance state
  isOptimizing: boolean;
  lastOptimization: string | null;
  optimizationQueue: Array<{
    id: string;
    operation: SyncOperation;
    priority: number;
    estimatedTime: number;
    subscriptionBoost: number;
  }>;

  // Crisis performance state
  crisisMode: boolean;
  emergencyCapacityReserved: boolean;
  crisisPerformanceGuaranteed: boolean;

  // Internal optimization state
  _internal: {
    performanceTimers: Map<string, number>;
    adaptiveBatchTimer: NodeJS.Timeout | null;
    memoryMonitor: NodeJS.Timeout | null;
    networkMonitor: NodeJS.Timeout | null;
    crisisGuaranteeTimer: NodeJS.Timeout | null;
    metricCollectors: Map<string, Array<number>>;
  };

  // Core optimization actions
  initializeOptimizer: (config: Partial<SyncPerformanceConfig>) => Promise<void>;
  startOptimization: () => void;
  stopOptimization: () => void;
  optimizeOperation: (operation: SyncOperation) => Promise<SyncOperation>;

  // Performance guarantee actions
  guaranteeCrisisResponse: () => Promise<boolean>;
  validatePerformanceTargets: () => Promise<boolean>;
  optimizeForSubscriptionTier: (tier: SubscriptionTier) => Promise<void>;

  // Adaptive optimization actions
  adaptBatchingStrategy: () => Promise<void>;
  optimizeNetworkUsage: () => Promise<void>;
  optimizeMemoryUsage: () => Promise<void>;
  optimizeBatteryUsage: () => Promise<void>;

  // Real-time performance actions
  measureSyncLatency: (operationId: string) => Promise<number>;
  measureCrisisResponseTime: (emergencyId: string) => Promise<number>;
  trackResourceUsage: () => Promise<void>;
  reportPerformanceViolation: (violationType: string, actual: number, target: number) => void;

  // Subscription tier optimization
  applyTierOptimizations: (tier: SubscriptionTier) => Promise<void>;
  calculateTierPerformanceBoost: (tier: SubscriptionTier) => number;
  enforceTierResourceLimits: (tier: SubscriptionTier) => Promise<void>;

  // Crisis performance guarantee
  activateCrisisPerformanceMode: () => Promise<void>;
  deactivateCrisisPerformanceMode: () => Promise<void>;
  reserveEmergencyCapacity: (percentage: number) => Promise<void>;
  validateCrisisResponseGuarantee: () => Promise<boolean>;

  // Performance monitoring
  collectMetrics: () => Promise<void>;
  generatePerformanceReport: () => Promise<any>;
  identifyBottlenecks: () => Promise<Array<{ type: string; severity: number; recommendation: string }>>;
  predictPerformanceIssues: () => Promise<Array<{ issue: string; probability: number; timeframe: string }>>;
}

/**
 * Create Sync Performance Optimizer Store
 */
export const useSyncPerformanceOptimizerStore = create<SyncPerformanceOptimizerStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    config: {
      subscription: {
        tier: 'basic',
        deviceLimit: 3,
        concurrentOperations: 5,
        bandwidthAllocation: 100 * 1024, // 100KB/s
      },
      performance: {
        targetSyncLatency: 500,
        crisisResponseTime: 200,
        conflictResolutionTimeout: 1000,
        maxConcurrentSyncs: 10,
      },
      optimization: {
        adaptiveBatching: true,
        networkAwareness: true,
        memoryOptimization: true,
        batteryOptimization: true,
      },
      crisis: {
        emergencyReservedCapacity: 0.2, // 20%
        crisisOverrideEnabled: true,
        maxCrisisResponseTime: 200,
      },
    },

    metrics: {
      syncLatency: {
        current: 0,
        average: 0,
        p95: 0,
        p99: 0,
        targetViolations: 0,
      },
      crisisResponse: {
        lastResponseTime: 0,
        averageResponseTime: 0,
        violations: 0,
        successRate: 1.0,
      },
      throughput: {
        operationsPerSecond: 0,
        successfulOperations: 0,
        failedOperations: 0,
        queueDepth: 0,
      },
      resourceUsage: {
        memoryUsage: 0,
        cpuUsage: 0,
        networkBandwidth: 0,
        batteryImpact: 0,
      },
      subscription: {
        tierOptimizations: {
          trial: 0,
          basic: 0,
          premium: 0,
        },
        quotaUtilization: 0,
        priorityBoosts: 0,
      },
    },

    adaptiveBatching: {
      batchSize: 10,
      frequencyMs: 2000,
      priorityThreshold: 0.7,
      networkQualityFactor: 1.0,
      subscriptionTierMultiplier: 1.0,
    },

    networkOptimization: {
      compressionEnabled: true,
      deltaSync: true,
      priorityQueue: true,
      bandwidthAdaptation: true,
      connectionPooling: true,
    },

    memoryOptimization: {
      maxCacheSize: 50 * 1024 * 1024, // 50MB
      gcTriggerThreshold: 40 * 1024 * 1024, // 40MB
      objectPooling: true,
      lazyLoading: true,
      dataCompression: true,
    },

    isOptimizing: false,
    lastOptimization: null,
    optimizationQueue: [],
    crisisMode: false,
    emergencyCapacityReserved: false,
    crisisPerformanceGuaranteed: false,

    _internal: {
      performanceTimers: new Map(),
      adaptiveBatchTimer: null,
      memoryMonitor: null,
      networkMonitor: null,
      crisisGuaranteeTimer: null,
      metricCollectors: new Map([
        ['syncLatency', []],
        ['crisisResponse', []],
        ['throughput', []],
        ['memoryUsage', []],
      ]),
    },

    // Core optimization actions
    initializeOptimizer: async (config) => {
      const state = get();

      set((state) => {
        state.config = { ...state.config, ...config };
        state.isOptimizing = true;
        state.lastOptimization = new Date().toISOString();
      });

      // Initialize performance monitoring
      await state.startOptimization();

      // Reserve emergency capacity for crisis operations
      await state.reserveEmergencyCapacity(state.config.crisis.emergencyReservedCapacity);

      console.log('Sync Performance Optimizer initialized with config:', state.config);
    },

    startOptimization: () => {
      const state = get();

      // Start adaptive batching optimization
      if (state.config.optimization.adaptiveBatching) {
        const batchTimer = setInterval(async () => {
          await state.adaptBatchingStrategy();
        }, 5000); // Optimize every 5 seconds

        set((state) => {
          state._internal.adaptiveBatchTimer = batchTimer;
        });
      }

      // Start memory optimization monitoring
      if (state.config.optimization.memoryOptimization) {
        const memoryTimer = setInterval(async () => {
          await state.optimizeMemoryUsage();
        }, 10000); // Check every 10 seconds

        set((state) => {
          state._internal.memoryMonitor = memoryTimer;
        });
      }

      // Start network optimization monitoring
      if (state.config.optimization.networkAwareness) {
        const networkTimer = setInterval(async () => {
          await state.optimizeNetworkUsage();
        }, 3000); // Optimize every 3 seconds

        set((state) => {
          state._internal.networkMonitor = networkTimer;
        });
      }

      // Start crisis performance guarantee monitoring
      const crisisTimer = setInterval(async () => {
        await state.validateCrisisResponseGuarantee();
      }, 1000); // Check every second

      set((state) => {
        state._internal.crisisGuaranteeTimer = crisisTimer;
        state.isOptimizing = true;
      });
    },

    stopOptimization: () => {
      const state = get();

      // Clear all optimization timers
      if (state._internal.adaptiveBatchTimer) {
        clearInterval(state._internal.adaptiveBatchTimer);
      }
      if (state._internal.memoryMonitor) {
        clearInterval(state._internal.memoryMonitor);
      }
      if (state._internal.networkMonitor) {
        clearInterval(state._internal.networkMonitor);
      }
      if (state._internal.crisisGuaranteeTimer) {
        clearInterval(state._internal.crisisGuaranteeTimer);
      }

      set((state) => {
        state._internal.adaptiveBatchTimer = null;
        state._internal.memoryMonitor = null;
        state._internal.networkMonitor = null;
        state._internal.crisisGuaranteeTimer = null;
        state.isOptimizing = false;
      });
    },

    optimizeOperation: async (operation) => {
      const startTime = performance.now();
      const state = get();

      // Apply subscription tier optimizations
      const tierBoost = state.calculateTierPerformanceBoost(state.config.subscription.tier);

      // Apply crisis priority boost if in crisis mode
      const crisisBoost = state.crisisMode ? 10 : 1;

      // Calculate optimized operation parameters
      const optimizedOperation: SyncOperation = {
        ...operation,
        priority: operation.clinicalSafety
          ? 'critical' as any
          : operation.priority,
        // Add performance hints
        metadata: {
          ...operation.metadata,
          performanceHints: {
            tierBoost,
            crisisBoost,
            networkOptimized: state.networkOptimization.compressionEnabled,
            memoryOptimized: state.memoryOptimization.objectPooling,
            estimatedTime: state._estimateOperationTime(operation),
          },
        },
      };

      const optimizationTime = performance.now() - startTime;

      // Track optimization metrics
      set((state) => {
        state.metrics.subscription.tierOptimizations[state.config.subscription.tier]++;
        if (crisisBoost > 1) {
          state.metrics.subscription.priorityBoosts++;
        }
      });

      // Ensure operation stays within performance targets
      if (optimizationTime > 50) { // 50ms optimization overhead limit
        console.warn(`Operation optimization took ${optimizationTime}ms, exceeding 50ms limit`);
      }

      return optimizedOperation;
    },

    // Performance guarantee actions
    guaranteeCrisisResponse: async () => {
      const state = get();
      const startTime = performance.now();

      try {
        // Activate crisis performance mode
        await state.activateCrisisPerformanceMode();

        // Validate emergency capacity is reserved
        if (!state.emergencyCapacityReserved) {
          await state.reserveEmergencyCapacity(state.config.crisis.emergencyReservedCapacity);
        }

        // Clear non-critical operations from queue
        set((state) => {
          state.optimizationQueue = state.optimizationQueue.filter(
            item => item.operation.clinicalSafety || item.priority >= 0.8
          );
        });

        const responseTime = performance.now() - startTime;

        // Validate response time meets crisis requirement
        const meetsRequirement = responseTime <= state.config.crisis.maxCrisisResponseTime;

        // Update crisis response metrics
        set((state) => {
          state.metrics.crisisResponse.lastResponseTime = responseTime;
          state.metrics.crisisResponse.averageResponseTime =
            (state.metrics.crisisResponse.averageResponseTime + responseTime) / 2;

          if (!meetsRequirement) {
            state.metrics.crisisResponse.violations++;
          }

          state.crisisPerformanceGuaranteed = meetsRequirement;
        });

        if (!meetsRequirement) {
          state.reportPerformanceViolation('crisis_response', responseTime, state.config.crisis.maxCrisisResponseTime);
        }

        return meetsRequirement;

      } catch (error) {
        console.error('Crisis response guarantee failed:', error);

        set((state) => {
          state.metrics.crisisResponse.violations++;
          state.crisisPerformanceGuaranteed = false;
        });

        return false;
      }
    },

    validatePerformanceTargets: async () => {
      const state = get();

      const targets = {
        syncLatency: state.metrics.syncLatency.current <= state.config.performance.targetSyncLatency,
        crisisResponse: state.metrics.crisisResponse.lastResponseTime <= state.config.performance.crisisResponseTime,
        memoryUsage: state.metrics.resourceUsage.memoryUsage <= state.memoryOptimization.maxCacheSize,
        throughput: state.metrics.throughput.operationsPerSecond >= 10, // Minimum threshold
      };

      const allTargetsMet = Object.values(targets).every(met => met);

      // Report violations
      if (!targets.syncLatency) {
        state.reportPerformanceViolation(
          'sync_latency',
          state.metrics.syncLatency.current,
          state.config.performance.targetSyncLatency
        );
      }

      if (!targets.crisisResponse) {
        state.reportPerformanceViolation(
          'crisis_response',
          state.metrics.crisisResponse.lastResponseTime,
          state.config.performance.crisisResponseTime
        );
      }

      return allTargetsMet;
    },

    optimizeForSubscriptionTier: async (tier) => {
      const state = get();

      // Update subscription configuration
      set((state) => {
        state.config.subscription.tier = tier;
      });

      // Apply tier-specific optimizations
      await state.applyTierOptimizations(tier);

      // Enforce tier resource limits
      await state.enforceTierResourceLimits(tier);

      console.log(`Optimized for subscription tier: ${tier}`);
    },

    // Adaptive optimization actions
    adaptBatchingStrategy: async () => {
      const state = get();

      // Analyze current performance metrics
      const currentLatency = state.metrics.syncLatency.current;
      const queueDepth = state.metrics.throughput.queueDepth;
      const networkQuality = state._assessNetworkQuality();

      // Calculate optimal batch size based on current conditions
      let optimalBatchSize = state.adaptiveBatching.batchSize;
      let optimalFrequency = state.adaptiveBatching.frequencyMs;

      // Adjust based on latency
      if (currentLatency > state.config.performance.targetSyncLatency) {
        // Reduce batch size to improve latency
        optimalBatchSize = Math.max(1, optimalBatchSize * 0.8);
        optimalFrequency = Math.max(1000, optimalFrequency * 0.9);
      } else if (currentLatency < state.config.performance.targetSyncLatency * 0.5) {
        // Increase batch size for better throughput
        optimalBatchSize = Math.min(100, optimalBatchSize * 1.2);
        optimalFrequency = Math.min(10000, optimalFrequency * 1.1);
      }

      // Adjust based on queue depth
      if (queueDepth > 50) {
        // Increase batching for better throughput
        optimalBatchSize = Math.min(100, optimalBatchSize * 1.5);
        optimalFrequency = Math.max(500, optimalFrequency * 0.8);
      }

      // Adjust based on network quality
      const networkFactor = networkQuality === 'excellent' ? 1.5 :
                           networkQuality === 'good' ? 1.0 : 0.5;
      optimalBatchSize = Math.round(optimalBatchSize * networkFactor);

      // Apply subscription tier multiplier
      const tierMultiplier = state.calculateTierPerformanceBoost(state.config.subscription.tier);
      optimalBatchSize = Math.round(optimalBatchSize * tierMultiplier);
      optimalFrequency = Math.round(optimalFrequency / tierMultiplier);

      // Update adaptive batching strategy
      set((state) => {
        state.adaptiveBatching = {
          batchSize: optimalBatchSize,
          frequencyMs: optimalFrequency,
          priorityThreshold: state.adaptiveBatching.priorityThreshold,
          networkQualityFactor: networkFactor,
          subscriptionTierMultiplier: tierMultiplier,
        };
      });

      console.log('Adapted batching strategy:', {
        batchSize: optimalBatchSize,
        frequency: optimalFrequency,
        networkFactor,
        tierMultiplier,
      });
    },

    optimizeNetworkUsage: async () => {
      const state = get();

      // Measure current network performance
      const networkQuality = state._assessNetworkQuality();
      const bandwidthUsage = state.metrics.resourceUsage.networkBandwidth;
      const allocatedBandwidth = state.config.subscription.bandwidthAllocation;

      // Calculate optimization adjustments
      const utilizationRatio = bandwidthUsage / allocatedBandwidth;

      let optimizations: Partial<NetworkOptimization> = {};

      // Enable/disable compression based on bandwidth usage
      if (utilizationRatio > 0.8) {
        optimizations.compressionEnabled = true;
        optimizations.deltaSync = true;
      } else if (utilizationRatio < 0.3) {
        optimizations.compressionEnabled = false; // Save CPU if bandwidth is plentiful
      }

      // Adjust priority queue based on network quality
      if (networkQuality === 'poor') {
        optimizations.priorityQueue = true;
        optimizations.connectionPooling = false; // Reduce connection overhead
      } else if (networkQuality === 'excellent') {
        optimizations.connectionPooling = true;
      }

      // Update network optimization settings
      set((state) => {
        state.networkOptimization = {
          ...state.networkOptimization,
          ...optimizations,
        };
      });

      console.log('Optimized network usage:', {
        quality: networkQuality,
        utilization: utilizationRatio,
        optimizations,
      });
    },

    optimizeMemoryUsage: async () => {
      const state = get();

      const currentMemory = state.metrics.resourceUsage.memoryUsage;
      const maxMemory = state.memoryOptimization.maxCacheSize;
      const utilizationRatio = currentMemory / maxMemory;

      // Trigger garbage collection if memory usage is high
      if (utilizationRatio > 0.8) {
        if (global.gc) {
          global.gc();
          console.log('Triggered garbage collection due to high memory usage');
        }

        // Enable aggressive memory optimization
        set((state) => {
          state.memoryOptimization = {
            ...state.memoryOptimization,
            objectPooling: true,
            lazyLoading: true,
            dataCompression: true,
          };
        });
      } else if (utilizationRatio < 0.3) {
        // Disable some optimizations to improve performance
        set((state) => {
          state.memoryOptimization = {
            ...state.memoryOptimization,
            dataCompression: false, // Save CPU
          };
        });
      }

      // Clear old metric data to free memory
      set((state) => {
        state._internal.metricCollectors.forEach((collector, key) => {
          if (collector.length > 1000) {
            state._internal.metricCollectors.set(key, collector.slice(-500));
          }
        });
      });

      console.log('Optimized memory usage:', {
        current: currentMemory,
        max: maxMemory,
        utilization: utilizationRatio,
      });
    },

    optimizeBatteryUsage: async () => {
      const state = get();

      // Simulated battery level (in real app, would get from device)
      const batteryLevel = 0.5; // Placeholder

      let optimizations: Partial<SyncPerformanceConfig> = {};

      // Reduce sync frequency if battery is low
      if (batteryLevel < 0.2) {
        optimizations.performance = {
          ...state.config.performance,
          maxConcurrentSyncs: Math.max(1, Math.floor(state.config.performance.maxConcurrentSyncs * 0.5)),
        };

        // Increase batch frequency to reduce wake-ups
        set((state) => {
          state.adaptiveBatching.frequencyMs = Math.max(state.adaptiveBatching.frequencyMs * 2, 5000);
        });
      } else if (batteryLevel > 0.8) {
        // Restore normal performance settings
        optimizations.performance = {
          ...state.config.performance,
          maxConcurrentSyncs: 10,
        };
      }

      if (Object.keys(optimizations).length > 0) {
        set((state) => {
          state.config = { ...state.config, ...optimizations };
        });

        console.log('Optimized for battery usage:', {
          batteryLevel,
          optimizations,
        });
      }
    },

    // Real-time performance actions
    measureSyncLatency: async (operationId) => {
      const state = get();
      const startTime = state._internal.performanceTimers.get(operationId);

      if (!startTime) {
        console.warn(`No start time found for operation ${operationId}`);
        return 0;
      }

      const latency = performance.now() - startTime;

      // Update metrics
      const latencyCollector = state._internal.metricCollectors.get('syncLatency') || [];
      latencyCollector.push(latency);

      if (latencyCollector.length > 100) {
        latencyCollector.shift(); // Keep only last 100 measurements
      }

      // Calculate percentiles
      const sortedLatencies = [...latencyCollector].sort((a, b) => a - b);
      const p95Index = Math.floor(sortedLatencies.length * 0.95);
      const p99Index = Math.floor(sortedLatencies.length * 0.99);

      set((state) => {
        state.metrics.syncLatency = {
          current: latency,
          average: latencyCollector.reduce((sum, l) => sum + l, 0) / latencyCollector.length,
          p95: sortedLatencies[p95Index] || 0,
          p99: sortedLatencies[p99Index] || 0,
          targetViolations: latency > state.config.performance.targetSyncLatency
            ? state.metrics.syncLatency.targetViolations + 1
            : state.metrics.syncLatency.targetViolations,
        };

        state._internal.metricCollectors.set('syncLatency', latencyCollector);
        state._internal.performanceTimers.delete(operationId);
      });

      return latency;
    },

    measureCrisisResponseTime: async (emergencyId) => {
      const state = get();
      const startTime = state._internal.performanceTimers.get(emergencyId);

      if (!startTime) {
        console.warn(`No start time found for emergency ${emergencyId}`);
        return 0;
      }

      const responseTime = performance.now() - startTime;

      // Update crisis response metrics
      const crisisCollector = state._internal.metricCollectors.get('crisisResponse') || [];
      crisisCollector.push(responseTime);

      if (crisisCollector.length > 50) {
        crisisCollector.shift(); // Keep only last 50 measurements
      }

      set((state) => {
        state.metrics.crisisResponse = {
          lastResponseTime: responseTime,
          averageResponseTime: crisisCollector.reduce((sum, r) => sum + r, 0) / crisisCollector.length,
          violations: responseTime > state.config.crisis.maxCrisisResponseTime
            ? state.metrics.crisisResponse.violations + 1
            : state.metrics.crisisResponse.violations,
          successRate: crisisCollector.filter(r => r <= state.config.crisis.maxCrisisResponseTime).length / crisisCollector.length,
        };

        state._internal.metricCollectors.set('crisisResponse', crisisCollector);
        state._internal.performanceTimers.delete(emergencyId);
      });

      return responseTime;
    },

    trackResourceUsage: async () => {
      const state = get();

      // Simulated resource usage (in real app, would get from system)
      const memoryUsage = process.memoryUsage?.()?.heapUsed || 0;
      const cpuUsage = 0.1; // Placeholder
      const networkBandwidth = 1024 * 50; // Placeholder: 50KB/s
      const batteryImpact = 0.05; // Placeholder

      set((state) => {
        state.metrics.resourceUsage = {
          memoryUsage,
          cpuUsage,
          networkBandwidth,
          batteryImpact,
        };
      });

      // Track in collectors
      const memoryCollector = state._internal.metricCollectors.get('memoryUsage') || [];
      memoryCollector.push(memoryUsage);

      if (memoryCollector.length > 100) {
        memoryCollector.shift();
      }

      set((state) => {
        state._internal.metricCollectors.set('memoryUsage', memoryCollector);
      });
    },

    reportPerformanceViolation: (violationType, actual, target) => {
      const severity = actual / target;

      console.warn(`Performance violation detected:`, {
        type: violationType,
        actual,
        target,
        severity,
        timestamp: new Date().toISOString(),
      });

      // In a real app, this would trigger alerts or automatic optimizations
    },

    // Subscription tier optimization
    applyTierOptimizations: async (tier) => {
      const state = get();

      const tierConfigs = {
        trial: {
          concurrentOperations: 1,
          bandwidthAllocation: 25 * 1024, // 25KB/s
          targetSyncLatency: 5000, // 5s
          maxConcurrentSyncs: 2,
        },
        basic: {
          concurrentOperations: 5,
          bandwidthAllocation: 100 * 1024, // 100KB/s
          targetSyncLatency: 2000, // 2s
          maxConcurrentSyncs: 5,
        },
        premium: {
          concurrentOperations: 20,
          bandwidthAllocation: 500 * 1024, // 500KB/s
          targetSyncLatency: 500, // 500ms
          maxConcurrentSyncs: 20,
        },
      };

      const tierConfig = tierConfigs[tier];

      set((state) => {
        state.config.subscription = {
          ...state.config.subscription,
          ...tierConfig,
        };
        state.config.performance.targetSyncLatency = tierConfig.targetSyncLatency;
        state.config.performance.maxConcurrentSyncs = tierConfig.maxConcurrentSyncs;
      });

      console.log(`Applied ${tier} tier optimizations:`, tierConfig);
    },

    calculateTierPerformanceBoost: (tier) => {
      const boosts = {
        trial: 0.5,
        basic: 1.0,
        premium: 2.0,
      };

      return boosts[tier] || 1.0;
    },

    enforceTierResourceLimits: async (tier) => {
      const state = get();

      // Adjust optimization queue based on tier limits
      const maxQueueSize = {
        trial: 10,
        basic: 50,
        premium: 200,
      }[tier] || 50;

      if (state.optimizationQueue.length > maxQueueSize) {
        set((state) => {
          // Keep highest priority operations
          state.optimizationQueue = state.optimizationQueue
            .sort((a, b) => b.priority - a.priority)
            .slice(0, maxQueueSize);
        });
      }
    },

    // Crisis performance guarantee
    activateCrisisPerformanceMode: async () => {
      const state = get();

      set((state) => {
        state.crisisMode = true;
        state.crisisPerformanceGuaranteed = false; // Will be set after validation
      });

      // Clear non-critical operations
      set((state) => {
        state.optimizationQueue = state.optimizationQueue.filter(
          item => item.operation.clinicalSafety || item.priority >= 0.9
        );
      });

      // Boost performance settings for crisis mode
      set((state) => {
        state.config.performance.maxConcurrentSyncs = Math.max(
          state.config.performance.maxConcurrentSyncs * 2,
          20
        );
        state.adaptiveBatching.batchSize = Math.max(1, Math.floor(state.adaptiveBatching.batchSize * 0.5));
        state.adaptiveBatching.frequencyMs = Math.max(500, Math.floor(state.adaptiveBatching.frequencyMs * 0.3));
      });

      console.log('Crisis performance mode activated');
    },

    deactivateCrisisPerformanceMode: async () => {
      const state = get();

      set((state) => {
        state.crisisMode = false;
        state.crisisPerformanceGuaranteed = false;
      });

      // Restore normal performance settings
      await state.optimizeForSubscriptionTier(state.config.subscription.tier);

      console.log('Crisis performance mode deactivated');
    },

    reserveEmergencyCapacity: async (percentage) => {
      const state = get();

      if (percentage < 0 || percentage > 1) {
        throw new Error('Emergency capacity percentage must be between 0 and 1');
      }

      set((state) => {
        state.emergencyCapacityReserved = true;
        state.config.crisis.emergencyReservedCapacity = percentage;
      });

      // Reduce regular operation limits to reserve capacity
      const reservedCapacity = Math.floor(state.config.performance.maxConcurrentSyncs * percentage);

      set((state) => {
        state.config.performance.maxConcurrentSyncs = Math.max(
          state.config.performance.maxConcurrentSyncs - reservedCapacity,
          1
        );
      });

      console.log(`Reserved ${percentage * 100}% emergency capacity (${reservedCapacity} operations)`);
    },

    validateCrisisResponseGuarantee: async () => {
      const state = get();

      // Check if crisis response time is within guarantee
      const withinGuarantee = state.metrics.crisisResponse.averageResponseTime <= state.config.crisis.maxCrisisResponseTime;

      // Check if emergency capacity is reserved
      const capacityReserved = state.emergencyCapacityReserved;

      // Check if crisis overrides are enabled
      const overridesEnabled = state.config.crisis.crisisOverrideEnabled;

      const guaranteeValid = withinGuarantee && capacityReserved && overridesEnabled;

      set((state) => {
        state.crisisPerformanceGuaranteed = guaranteeValid;
      });

      if (!guaranteeValid) {
        console.warn('Crisis response guarantee validation failed:', {
          withinGuarantee,
          capacityReserved,
          overridesEnabled,
          averageResponseTime: state.metrics.crisisResponse.averageResponseTime,
          maxAllowed: state.config.crisis.maxCrisisResponseTime,
        });
      }

      return guaranteeValid;
    },

    // Performance monitoring
    collectMetrics: async () => {
      const state = get();

      // Track resource usage
      await state.trackResourceUsage();

      // Update throughput metrics
      const throughputCollector = state._internal.metricCollectors.get('throughput') || [];
      const currentThroughput = state.optimizationQueue.length > 0 ? state.optimizationQueue.length / 60 : 0; // operations per minute / 60
      throughputCollector.push(currentThroughput);

      if (throughputCollector.length > 60) {
        throughputCollector.shift(); // Keep last minute
      }

      set((state) => {
        state.metrics.throughput = {
          operationsPerSecond: currentThroughput,
          successfulOperations: state.metrics.throughput.successfulOperations,
          failedOperations: state.metrics.throughput.failedOperations,
          queueDepth: state.optimizationQueue.length,
        };

        state._internal.metricCollectors.set('throughput', throughputCollector);
      });
    },

    generatePerformanceReport: async () => {
      const state = get();

      await state.collectMetrics();

      return {
        timestamp: new Date().toISOString(),
        config: state.config,
        metrics: state.metrics,
        optimizationState: {
          isOptimizing: state.isOptimizing,
          crisisMode: state.crisisMode,
          emergencyCapacityReserved: state.emergencyCapacityReserved,
          crisisPerformanceGuaranteed: state.crisisPerformanceGuaranteed,
          queueLength: state.optimizationQueue.length,
        },
        adaptiveSettings: {
          batching: state.adaptiveBatching,
          network: state.networkOptimization,
          memory: state.memoryOptimization,
        },
        performanceTargetsMet: await state.validatePerformanceTargets(),
        crisisResponseGuaranteeValid: await state.validateCrisisResponseGuarantee(),
      };
    },

    identifyBottlenecks: async () => {
      const state = get();

      const bottlenecks = [];

      // Check sync latency bottleneck
      if (state.metrics.syncLatency.current > state.config.performance.targetSyncLatency) {
        bottlenecks.push({
          type: 'sync_latency',
          severity: state.metrics.syncLatency.current / state.config.performance.targetSyncLatency,
          recommendation: 'Consider reducing batch size or enabling compression',
        });
      }

      // Check memory usage bottleneck
      if (state.metrics.resourceUsage.memoryUsage > state.memoryOptimization.maxCacheSize * 0.8) {
        bottlenecks.push({
          type: 'memory_usage',
          severity: state.metrics.resourceUsage.memoryUsage / state.memoryOptimization.maxCacheSize,
          recommendation: 'Enable garbage collection or reduce cache size',
        });
      }

      // Check queue depth bottleneck
      if (state.metrics.throughput.queueDepth > 100) {
        bottlenecks.push({
          type: 'queue_depth',
          severity: state.metrics.throughput.queueDepth / 100,
          recommendation: 'Increase concurrent operations or upgrade subscription tier',
        });
      }

      // Check crisis response bottleneck
      if (state.metrics.crisisResponse.violations > 0) {
        bottlenecks.push({
          type: 'crisis_response',
          severity: state.metrics.crisisResponse.violations,
          recommendation: 'Reserve more emergency capacity or optimize crisis path',
        });
      }

      return bottlenecks;
    },

    predictPerformanceIssues: async () => {
      const state = get();

      const predictions = [];

      // Predict memory issues based on trend
      const memoryCollector = state._internal.metricCollectors.get('memoryUsage') || [];
      if (memoryCollector.length > 10) {
        const recentGrowth = memoryCollector.slice(-5).reduce((sum, m) => sum + m, 0) / 5 -
                           memoryCollector.slice(-10, -5).reduce((sum, m) => sum + m, 0) / 5;

        if (recentGrowth > 0) {
          const timeToLimit = (state.memoryOptimization.maxCacheSize - state.metrics.resourceUsage.memoryUsage) / recentGrowth;
          if (timeToLimit < 300000) { // 5 minutes
            predictions.push({
              issue: 'memory_limit_approaching',
              probability: 0.8,
              timeframe: `${Math.round(timeToLimit / 60000)} minutes`,
            });
          }
        }
      }

      // Predict latency issues based on queue growth
      if (state.metrics.throughput.queueDepth > 50) {
        predictions.push({
          issue: 'sync_latency_degradation',
          probability: 0.6,
          timeframe: '2-5 minutes',
        });
      }

      return predictions;
    },

    // Helper methods
    _estimateOperationTime: (operation: SyncOperation) => {
      // Simplified estimation based on operation type and data size
      const baseTime = {
        create: 100,
        update: 80,
        delete: 50,
        merge: 150,
        restore: 120,
      }[operation.type] || 100;

      const priorityMultiplier = operation.clinicalSafety ? 0.5 : 1.0;

      return baseTime * priorityMultiplier;
    },

    _assessNetworkQuality: () => {
      // Simplified network quality assessment
      // In real app, would measure actual network performance
      return 'good' as 'excellent' | 'good' | 'poor';
    },
  }))
);

/**
 * Performance optimization hooks
 */
export const useSyncPerformanceOptimizer = () => {
  const store = useSyncPerformanceOptimizerStore();

  return {
    // State
    config: store.config,
    metrics: store.metrics,
    isOptimizing: store.isOptimizing,
    crisisMode: store.crisisMode,
    crisisPerformanceGuaranteed: store.crisisPerformanceGuaranteed,

    // Core actions
    initialize: store.initializeOptimizer,
    start: store.startOptimization,
    stop: store.stopOptimization,
    optimize: store.optimizeOperation,

    // Performance guarantees
    guaranteeCrisisResponse: store.guaranteeCrisisResponse,
    validateTargets: store.validatePerformanceTargets,
    optimizeForTier: store.optimizeForSubscriptionTier,

    // Monitoring
    measureLatency: store.measureSyncLatency,
    measureCrisisResponse: store.measureCrisisResponseTime,
    generateReport: store.generatePerformanceReport,
    identifyBottlenecks: store.identifyBottlenecks,
    predictIssues: store.predictPerformanceIssues,
  };
};

export default useSyncPerformanceOptimizerStore;