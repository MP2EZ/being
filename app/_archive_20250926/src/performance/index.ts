/**
 * Being. Performance Optimization System - Comprehensive Export
 *
 * Complete performance optimization suite delivering:
 * - <500ms sync propagation with crisis priority <200ms guarantee
 * - Subscription tier optimization with resource allocation
 * - Cross-device performance coordination and session handoff
 * - Mobile memory optimization with <50MB memory constraints
 * - Real-time performance monitoring with SLA compliance tracking
 *
 * PHASE 2 PERFORMANCE SYSTEM ARCHITECTURE:
 *
 * Core Sync Performance:
 * - sync-performance-optimizer.ts: Real-time sync optimization engine
 * - crisis-performance-guarantee.ts: <200ms emergency response system
 * - subscription-tier-optimization.ts: Tier-based resource allocation
 * - cross-device-performance.ts: Multi-device coordination optimization
 *
 * Resource Management:
 * - mobile-memory-optimization.ts: Memory-efficient patterns for mobile
 * - battery-efficient-sync.ts: Power-optimized synchronization
 * - network-optimization.ts: Bandwidth-aware sync strategies
 * - adaptive-batching.ts: Intelligent request batching
 *
 * Monitoring & Analytics:
 * - real-time-performance-monitor.ts: Live performance tracking
 * - sla-compliance-tracker.ts: Subscription tier SLA validation
 * - crisis-response-validator.ts: <200ms guarantee monitoring
 * - optimization-analytics.ts: Performance improvement suggestions
 */

// ============================================================================
// CORE SYNC PERFORMANCE EXPORTS
// ============================================================================

// Primary sync performance optimizer
export {
  useSyncPerformanceOptimizerStore,
  useSyncPerformanceOptimizer,
  type SyncPerformanceConfig,
  type PerformanceMetrics,
  type AdaptiveBatchingStrategy,
  type NetworkOptimization,
  type MemoryOptimization,
  type SyncPerformanceOptimizerStore,
} from './sync/sync-performance-optimizer';

// Crisis performance guarantee system
export {
  useCrisisPerformanceGuaranteeStore,
  useCrisisPerformanceGuarantee,
  type CrisisSeverityLevel,
  type CrisisPerformanceMetrics,
  type CrisisPerformanceGuaranteeConfig,
  type EmergencyResourceAllocation,
  type CrisisOperationPriority,
  type CrisisPerformanceViolation,
  type CrisisPerformanceGuaranteeStore,
} from './sync/crisis-performance-guarantee';

// Subscription tier optimization
export {
  useSubscriptionTierOptimizationStore,
  useSubscriptionTierOptimization,
  type TierPerformanceConfig,
  type TierUsageMetrics,
  type TierOptimizationStrategy,
  type GracePeriodConfig,
  type SubscriptionTierOptimizationStore,
} from './sync/subscription-tier-optimization';

// Cross-device performance optimization
export {
  useCrossDevicePerformanceStore,
  useCrossDevicePerformance,
  type DevicePerformanceProfile,
  type SessionHandoffMetrics,
  type MultiDeviceSyncPerformance,
  type NetworkTopologyOptimization,
  type OfflineQueuePerformance,
  type CrossDevicePerformanceStore,
} from './sync/cross-device-performance';

// ============================================================================
// RESOURCE MANAGEMENT EXPORTS
// ============================================================================

// Mobile memory optimization
export {
  useMobileMemoryOptimizationStore,
  useMobileMemoryOptimization,
  type MemoryUsageStats,
  type ObjectPoolConfig,
  type ObjectPoolStats,
  type CacheOptimizationConfig,
  type MemoryOptimizationStrategy,
  type MemoryAlert,
  type MobileMemoryOptimizationStore,
} from './resources/mobile-memory-optimization';

// ============================================================================
// MONITORING & ANALYTICS EXPORTS
// ============================================================================

// Real-time performance monitoring
export {
  useRealTimePerformanceMonitorStore,
  useRealTimePerformanceMonitor,
  type RealTimePerformanceMetrics,
  type PerformanceViolation,
  type PerformanceTrend,
  type SLACompliance,
  type PerformanceAlert,
  type PerformanceDashboardData,
  type RealTimePerformanceMonitorStore,
} from './monitoring/real-time-performance-monitor';

// ============================================================================
// UNIFIED PERFORMANCE SYSTEM
// ============================================================================

/**
 * Unified Performance System Integration Hook
 *
 * Provides integrated access to all performance optimization systems
 * with coordinated state management and cross-system optimization.
 */
import { useSyncPerformanceOptimizer } from './sync/sync-performance-optimizer';
import { useCrisisPerformanceGuarantee } from './sync/crisis-performance-guarantee';
import { useSubscriptionTierOptimization } from './sync/subscription-tier-optimization';
import { useCrossDevicePerformance } from './sync/cross-device-performance';
import { useMobileMemoryOptimization } from './resources/mobile-memory-optimization';
import { useRealTimePerformanceMonitor } from './monitoring/real-time-performance-monitor';

// Import the hook functions to make them available
export const useUnifiedPerformanceSystem = () => {
  // Core performance systems
  const syncOptimizer = useSyncPerformanceOptimizer();
  const crisisGuarantee = useCrisisPerformanceGuarantee();
  const tierOptimization = useSubscriptionTierOptimization();
  const crossDevicePerformance = useCrossDevicePerformance();

  // Resource management
  const memoryOptimization = useMobileMemoryOptimization();

  // Monitoring
  const performanceMonitor = useRealTimePerformanceMonitor();

  return {
    // System status
    isOptimizing: syncOptimizer.isOptimizing || tierOptimization.isOptimizing,
    isMonitoring: performanceMonitor.isMonitoring,
    crisisMode: crisisGuarantee.crisisActive,

    // Performance metrics
    metrics: {
      sync: syncOptimizer.metrics,
      crisis: crisisGuarantee.metrics,
      memory: memoryOptimization.memoryStats,
      realTime: performanceMonitor.currentMetrics,
    },

    // Optimization actions
    optimize: {
      sync: syncOptimizer.optimize,
      crisis: crisisGuarantee.activate,
      tier: tierOptimization.optimize,
      memory: memoryOptimization.optimize,
      crossDevice: crossDevicePerformance.optimizeTopology,
    },

    // Monitoring actions
    monitoring: {
      start: performanceMonitor.start,
      stop: performanceMonitor.stop,
      getHealthScore: performanceMonitor.getHealthScore,
      generateReport: performanceMonitor.generateReport,
    },

    // Crisis operations
    crisis: {
      activate: crisisGuarantee.activate,
      deactivate: crisisGuarantee.deactivate,
      guarantee: crisisGuarantee.validate,
      measureResponse: crisisGuarantee.measureButtonResponse,
    },

    // Subscription integration
    subscription: {
      switchTier: tierOptimization.switchTier,
      checkCompliance: tierOptimization.validateCompliance,
      enterGrace: tierOptimization.enterGrace,
      exitGrace: tierOptimization.exitGrace,
    },

    // Cross-device coordination
    crossDevice: {
      initialize: crossDevicePerformance.initialize,
      optimizeHandoff: crossDevicePerformance.optimizeHandoff,
      validateTargets: crossDevicePerformance.validateTargets,
      identifyBottlenecks: crossDevicePerformance.identifyBottlenecks,
    },

    // Memory management
    memory: {
      trackUsage: memoryOptimization.trackUsage,
      optimizePools: memoryOptimization.optimizePools,
      triggerGC: memoryOptimization.triggerGC,
      checkAlerts: memoryOptimization.checkAlerts,
    },

    // Performance constants
    TARGETS: {
      SYNC_LATENCY: 500,                    // ms
      CRISIS_RESPONSE: 200,                 // ms
      MEMORY_USAGE: 50 * 1024 * 1024,      // 50MB
      CROSS_DEVICE_HANDOFF: 2000,          // ms
      SLA_COMPLIANCE: 0.99,                 // 99%
    },
  };
};

// ============================================================================
// THERAPEUTIC PERFORMANCE SYSTEM EXPORTS
// ============================================================================

// Core therapeutic performance system
export {
  therapeuticPerformanceSystem,
  useTherapeuticPerformance,
  useBreathingPerformanceMonitor,
  useCrisisPerformanceMonitor,
  useNavigationPerformanceMonitor,
  type TherapeuticPerformanceMetrics,
  type PerformanceRegression,
  type RealTimePerformanceData,
  type PerformanceContext,
} from '../utils/TherapeuticPerformanceSystem';

// Performance regression detection
export {
  performanceRegressionDetector,
  usePerformanceRegressionDetection,
  type PerformanceBaseline,
  type RegressionAnalysis,
  type MetricTrend,
  type PerformanceBenchmark,
} from '../utils/PerformanceRegressionDetector';

// Performance testing suite
export {
  performanceTestSuite,
  THERAPEUTIC_SCENARIOS,
  type PerformanceTestCase,
  type PerformanceTestResult,
  type PerformanceTestSuiteResult,
  type TherapeuticScenario,
} from '../utils/PerformanceTestSuite';

// Comprehensive performance hooks
export {
  usePerformanceMonitoring,
  useComponentPerformance,
  useCrisisButtonPerformance,
  useBreathingAnimationPerformance,
  useNavigationPerformance,
  useMemoryPerformance,
  useTherapeuticSessionPerformance,
  usePerformanceRegressions,
  usePerformanceTesting,
} from '../utils/PerformanceHooks';

// Legacy performance utilities
export { performanceMonitor, usePerformanceTracking } from '../utils/PerformanceMonitor';
export { syncPerformanceOptimizer, useSyncPerformanceOptimization } from '../utils/SyncPerformanceOptimizer';

// ============================================================================
// PERFORMANCE OPTIMIZATION UTILITIES
// ============================================================================

/**
 * Performance optimization configuration builder
 */
export const createPerformanceConfig = (options: {
  subscriptionTier: 'trial' | 'basic' | 'premium';
  deviceType: 'mobile' | 'tablet' | 'desktop';
  networkQuality: 'poor' | 'good' | 'excellent';
  memoryConstraints?: boolean;
  crisisModeEnabled?: boolean;
}) => {
  const baseConfig = {
    syncLatencyTarget: options.subscriptionTier === 'premium' ? 500 : options.subscriptionTier === 'basic' ? 2000 : 5000,
    memoryLimit: options.deviceType === 'mobile' ? 50 * 1024 * 1024 : 100 * 1024 * 1024,
    crisisResponseTarget: 200,
    optimizationLevel: options.subscriptionTier === 'premium' ? 'aggressive' : 'balanced',
  };

  // Apply network quality adjustments
  if (options.networkQuality === 'poor') {
    baseConfig.syncLatencyTarget *= 2;
  } else if (options.networkQuality === 'excellent') {
    baseConfig.syncLatencyTarget *= 0.8;
  }

  // Apply memory constraints
  if (options.memoryConstraints) {
    baseConfig.memoryLimit *= 0.8;
  }

  return baseConfig;
};

/**
 * Therapeutic Performance System initialization helper
 */
export const initializeTherapeuticPerformanceSystem = async (config: {
  subscriptionTier?: 'trial' | 'basic' | 'premium';
  deviceInfo?: any;
  enableMonitoring?: boolean;
  enableRegressionDetection?: boolean;
  enableTesting?: boolean;
  appVersion?: string;
  environment?: 'development' | 'staging' | 'production';
}) => {
  console.log('🏥 Initializing Therapeutic Performance System...');

  const {
    subscriptionTier = 'trial',
    enableMonitoring = true,
    enableRegressionDetection = true,
    enableTesting = false,
    appVersion = '1.0.0',
    environment = 'development',
  } = config;

  try {
    // Initialize core therapeutic performance system
    await therapeuticPerformanceSystem.initialize();
    console.log('✅ Core therapeutic performance system initialized');

    // Initialize regression detection if enabled
    if (enableRegressionDetection) {
      await performanceRegressionDetector.initialize();
      console.log('✅ Performance regression detection initialized');
    }

    // Initialize testing suite if enabled
    if (enableTesting) {
      await performanceTestSuite.initialize();
      console.log('✅ Performance testing suite initialized');
    }

    // Start monitoring if enabled
    if (enableMonitoring) {
      therapeuticPerformanceSystem.startRealTimeMonitoring();
      console.log('✅ Real-time monitoring started');
    }

    // Record initial baseline for regression detection
    if (enableRegressionDetection) {
      const initialStatus = therapeuticPerformanceSystem.getTherapeuticStatus();
      await performanceRegressionDetector.recordBaseline(
        initialStatus.scores,
        appVersion,
        environment
      );
      console.log(`✅ Performance baseline recorded for ${appVersion}`);
    }

    // Generate initial health assessment
    const healthStatus = therapeuticPerformanceSystem.getTherapeuticStatus();
    const recommendations = therapeuticPerformanceSystem.getTherapeuticRecommendations();

    console.log('🏥 Therapeutic Performance System initialized successfully');

    return {
      success: true,
      healthStatus,
      recommendations,
      config: createPerformanceConfig({
        subscriptionTier,
        deviceType: config.deviceInfo?.deviceType || 'mobile',
        networkQuality: config.deviceInfo?.performance?.connectionQuality || 'good',
        memoryConstraints: config.deviceInfo?.deviceType === 'mobile',
        crisisModeEnabled: true,
      }),
    };

  } catch (error) {
    console.error('❌ Therapeutic performance system initialization failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Legacy performance system initialization helper (maintained for compatibility)
 */
export const initializePerformanceSystem = async (config: {
  subscriptionTier: 'trial' | 'basic' | 'premium';
  deviceInfo?: any;
  enableMonitoring?: boolean;
  enableCrisisGuarantee?: boolean;
}) => {
  console.log('Initializing Being. Performance System...');

  const performanceSystem = useUnifiedPerformanceSystem();

  try {
    // Initialize core sync optimizer
    await performanceSystem.optimize.sync({
      subscription: {
        tier: config.subscriptionTier,
        deviceLimit: config.subscriptionTier === 'premium' ? 10 : config.subscriptionTier === 'basic' ? 3 : 1,
        concurrentOperations: config.subscriptionTier === 'premium' ? 20 : config.subscriptionTier === 'basic' ? 5 : 1,
        bandwidthAllocation: config.subscriptionTier === 'premium' ? 500 * 1024 : config.subscriptionTier === 'basic' ? 100 * 1024 : 25 * 1024,
      },
    });

    // Initialize subscription tier optimization
    await performanceSystem.subscription.switchTier(config.subscriptionTier, 'initialization');

    // Initialize crisis performance guarantee if enabled
    if (config.enableCrisisGuarantee !== false) {
      await performanceSystem.crisis.activate('none'); // Initialize but don't activate
      await performanceSystem.crisis.deactivate();
    }

    // Initialize cross-device performance if device info provided
    if (config.deviceInfo) {
      await performanceSystem.crossDevice.initialize([config.deviceInfo]);
    }

    // Start performance monitoring if enabled
    if (config.enableMonitoring !== false) {
      await performanceSystem.monitoring.start();
    }

    // Initialize memory optimization
    await performanceSystem.memory.trackUsage();

    console.log('Being. Performance System initialized successfully');

    return {
      success: true,
      healthScore: performanceSystem.monitoring.getHealthScore(),
      config: createPerformanceConfig({
        subscriptionTier: config.subscriptionTier,
        deviceType: config.deviceInfo?.deviceType || 'mobile',
        networkQuality: config.deviceInfo?.performance?.connectionQuality || 'good',
        memoryConstraints: config.deviceInfo?.deviceType === 'mobile',
        crisisModeEnabled: config.enableCrisisGuarantee,
      }),
    };

  } catch (error) {
    console.error('Performance system initialization failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Performance system health check
 */
export const performHealthCheck = async () => {
  const performanceSystem = useUnifiedPerformanceSystem();

  const healthCheck = {
    timestamp: new Date().toISOString(),
    overall: 'healthy' as 'healthy' | 'degraded' | 'critical',
    systems: {
      sync: {
        status: performanceSystem.isOptimizing ? 'active' : 'inactive',
        latency: performanceSystem.metrics.sync?.syncLatency?.current || 0,
        target: 500,
        healthy: (performanceSystem.metrics.sync?.syncLatency?.current || 0) < 500,
      },
      crisis: {
        status: performanceSystem.crisisMode ? 'active' : 'ready',
        responseTime: performanceSystem.metrics.crisis?.totalResponseTime || 0,
        target: 200,
        healthy: (performanceSystem.metrics.crisis?.totalResponseTime || 0) < 200,
      },
      memory: {
        status: 'monitoring',
        usage: performanceSystem.metrics.memory?.current?.heapUsed || 0,
        target: 50 * 1024 * 1024,
        healthy: (performanceSystem.metrics.memory?.current?.heapUsed || 0) < 50 * 1024 * 1024,
      },
      monitoring: {
        status: performanceSystem.isMonitoring ? 'active' : 'inactive',
        healthScore: performanceSystem.monitoring.getHealthScore(),
        target: 80,
        healthy: performanceSystem.monitoring.getHealthScore() > 80,
      },
    },
  };

  // Determine overall health
  const systemsHealthy = Object.values(healthCheck.systems).filter(s => s.healthy).length;
  const totalSystems = Object.keys(healthCheck.systems).length;

  if (systemsHealthy === totalSystems) {
    healthCheck.overall = 'healthy';
  } else if (systemsHealthy >= totalSystems * 0.7) {
    healthCheck.overall = 'degraded';
  } else {
    healthCheck.overall = 'critical';
  }

  return healthCheck;
};

// ============================================================================
// TYPE EXPORTS FOR EXTERNAL USE
// ============================================================================

// Note: All key types are already exported from their respective modules above.
// No additional type exports needed here.

// ============================================================================
// PERFORMANCE CONSTANTS
// ============================================================================

/**
 * Performance optimization constants and targets
 */
export const PERFORMANCE_CONSTANTS = {
  // Core performance targets
  SYNC_LATENCY_TARGET: 500,              // ms
  CRISIS_RESPONSE_TARGET: 200,           // ms
  CROSS_DEVICE_HANDOFF_TARGET: 2000,     // ms
  CONFLICT_RESOLUTION_TARGET: 1000,      // ms

  // Resource constraints
  MOBILE_MEMORY_LIMIT: 50 * 1024 * 1024,  // 50MB
  BACKGROUND_MEMORY_LIMIT: 10 * 1024 * 1024, // 10MB
  CPU_USAGE_TARGET: 0.7,                 // 70%
  BATTERY_IMPACT_LIMIT: 0.1,             // 10%

  // Subscription tier limits
  TIER_LIMITS: {
    trial: {
      syncFrequency: 60000,               // 60s
      deviceLimit: 1,
      dailyOperations: 100,
      memoryAllocation: 25 * 1024 * 1024, // 25MB
    },
    basic: {
      syncFrequency: 15000,               // 15s
      deviceLimit: 3,
      dailyOperations: 1000,
      memoryAllocation: 50 * 1024 * 1024, // 50MB
    },
    premium: {
      syncFrequency: 2000,                // 2s
      deviceLimit: 10,
      dailyOperations: 10000,
      memoryAllocation: 100 * 1024 * 1024, // 100MB
    },
  },

  // SLA compliance targets
  SLA_TARGETS: {
    trial: { uptime: 0.95, successRate: 0.95, syncLatency: 30000 },
    basic: { uptime: 0.99, successRate: 0.98, syncLatency: 5000 },
    premium: { uptime: 0.999, successRate: 0.99, syncLatency: 500 },
  },

  // Crisis performance requirements
  CRISIS_REQUIREMENTS: {
    MAX_DETECTION_TIME: 50,               // ms
    MAX_ACTIVATION_TIME: 100,             // ms
    MAX_RESOURCE_DEPLOYMENT_TIME: 150,    // ms
    MAX_DATA_SYNC_TIME: 200,              // ms
    MAX_TOTAL_RESPONSE_TIME: 200,         // ms
    MAX_BUTTON_RESPONSE_TIME: 100,        // ms
    EMERGENCY_CAPACITY_RESERVATION: 0.2,  // 20%
  },

  // Monitoring intervals
  MONITORING_INTERVALS: {
    REAL_TIME: 1000,                      // 1s
    CRISIS_MODE: 500,                     // 500ms
    MEMORY_CHECK: 10000,                  // 10s
    TREND_ANALYSIS: 60000,                // 1min
    SLA_CALCULATION: 300000,              // 5min
  },
} as const;

export default {
  // Main exports
  useUnifiedPerformanceSystem,
  initializePerformanceSystem,
  createPerformanceConfig,
  performHealthCheck,

  // Constants
  PERFORMANCE_CONSTANTS,
};