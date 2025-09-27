/**
 * P0-CLOUD: Orchestration Service API Index
 *
 * Centralized export of all orchestration service APIs with therapeutic safety
 * and performance guarantees. Provides comprehensive API coordination with
 * crisis override capabilities and subscription-aware resource allocation.
 */

// Core Orchestration APIs
export {
  SyncOrchestrationAPI,
  type PriorityQueueConfig,
  type OrchestrationOperation,
  type SLAMonitoring,
  type AdaptiveBatchingConfig,
  type ResourceAllocation,
  ORCHESTRATION_TIER_LIMITS,
  CRISIS_PRIORITY_MAPPING
} from './sync-orchestration-api';

export {
  ConflictResolutionAPI,
  type TherapeuticConflict,
  type ClinicalValidationRequest,
  type AIResolutionConfig,
  THERAPEUTIC_PRECEDENCE_HIERARCHY
} from './conflict-resolution-api';

export {
  PerformanceMonitoringAPI,
  type PerformanceMetrics,
  type AdaptiveBatchingConfig as BatchingConfig,
  type ResourceAllocation as ResourceAllocationConfig,
  PERFORMANCE_SLA_TARGETS
} from './performance-monitoring-api';

// Integration APIs
export {
  EnhancedStoreAPI,
  type StoreIntegrationConfig,
  type StoreOperation,
  type StoreStateSnapshot,
  STORE_INTEGRATION_PERFORMANCE_TARGETS
} from '../integration/enhanced-store-api';

export {
  TherapeuticSafetyAPI,
  type TherapeuticSafetyConfig,
  type ClinicalDataProtectionRequest,
  type TherapeuticContinuityValidation,
  type CrisisSafetyIncident,
  type AssessmentIntegrityValidation,
  THERAPEUTIC_SAFETY_STANDARDS
} from '../integration/therapeutic-safety-api';

export {
  SubscriptionOrchestrationAPI,
  type SubscriptionOrchestrationConfig,
  type PaymentAwareOperation,
  type FeatureGateConfig,
  SUBSCRIPTION_TIER_POLICIES
} from '../integration/subscription-orchestration-api';

export {
  CrisisEscalationAPI,
  type CrisisDetectionConfig,
  type CrisisEvent,
  type EmergencyResponseAction,
  type ProfessionalInterventionRequest,
  CRISIS_RESPONSE_STANDARDS
} from '../integration/crisis-escalation-api';

// Cross-Device Coordination (from existing integration)
export {
  CrossDeviceCoordinationAPI,
  type DeviceInfo,
  type CrossDeviceSyncSession,
  type DeviceConflict,
  type TherapeuticSessionTransfer,
  DEVICE_TIER_LIMITS,
  THERAPEUTIC_TRANSFER_PRIORITIES
} from '../integration/cross-device-coordination-api';

/**
 * Orchestration Service Factory
 *
 * Creates and configures orchestration services with proper dependencies
 */
export class OrchestrationServiceFactory {
  private baseUrl: string;
  private apiKey: string;
  private defaultTimeout: number;

  constructor(config: {
    baseUrl: string;
    apiKey: string;
    defaultTimeout?: number;
  }) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.defaultTimeout = config.defaultTimeout || 5000;
  }

  /**
   * Create sync orchestration service
   */
  createSyncOrchestrationService(): SyncOrchestrationAPI {
    return new SyncOrchestrationAPI({
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      defaultTimeout: this.defaultTimeout
    });
  }

  /**
   * Create conflict resolution service
   */
  createConflictResolutionService(): ConflictResolutionAPI {
    return new ConflictResolutionAPI({
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      defaultTimeout: 5000 // Faster for conflicts
    });
  }

  /**
   * Create performance monitoring service
   */
  createPerformanceMonitoringService(): PerformanceMonitoringAPI {
    return new PerformanceMonitoringAPI({
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      defaultTimeout: this.defaultTimeout
    });
  }

  /**
   * Create enhanced store service
   */
  createEnhancedStoreService(): EnhancedStoreAPI {
    return new EnhancedStoreAPI({
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      defaultTimeout: this.defaultTimeout
    });
  }

  /**
   * Create therapeutic safety service
   */
  createTherapeuticSafetyService(): TherapeuticSafetyAPI {
    return new TherapeuticSafetyAPI({
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      defaultTimeout: 3000 // Faster for safety
    });
  }

  /**
   * Create subscription orchestration service
   */
  createSubscriptionOrchestrationService(): SubscriptionOrchestrationAPI {
    return new SubscriptionOrchestrationAPI({
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      defaultTimeout: this.defaultTimeout
    });
  }

  /**
   * Create crisis escalation service
   */
  createCrisisEscalationService(): CrisisEscalationAPI {
    return new CrisisEscalationAPI({
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      defaultTimeout: 2000 // Fastest for crisis
    });
  }

  /**
   * Create cross-device coordination service
   */
  createCrossDeviceCoordinationService(): CrossDeviceCoordinationAPI {
    return new CrossDeviceCoordinationAPI({
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      defaultTimeout: this.defaultTimeout
    });
  }

  /**
   * Create complete orchestration service suite
   */
  createOrchestrationSuite(): {
    syncOrchestration: SyncOrchestrationAPI;
    conflictResolution: ConflictResolutionAPI;
    performanceMonitoring: PerformanceMonitoringAPI;
    enhancedStore: EnhancedStoreAPI;
    therapeuticSafety: TherapeuticSafetyAPI;
    subscriptionOrchestration: SubscriptionOrchestrationAPI;
    crisisEscalation: CrisisEscalationAPI;
    crossDeviceCoordination: CrossDeviceCoordinationAPI;
  } {
    return {
      syncOrchestration: this.createSyncOrchestrationService(),
      conflictResolution: this.createConflictResolutionService(),
      performanceMonitoring: this.createPerformanceMonitoringService(),
      enhancedStore: this.createEnhancedStoreService(),
      therapeuticSafety: this.createTherapeuticSafetyService(),
      subscriptionOrchestration: this.createSubscriptionOrchestrationService(),
      crisisEscalation: this.createCrisisEscalationService(),
      crossDeviceCoordination: this.createCrossDeviceCoordinationService()
    };
  }
}

/**
 * Orchestration Service Coordinator
 *
 * Coordinates between multiple orchestration services for complex operations
 */
export class OrchestrationServiceCoordinator {
  private services: ReturnType<OrchestrationServiceFactory['createOrchestrationSuite']>;

  constructor(services: ReturnType<OrchestrationServiceFactory['createOrchestrationSuite']>) {
    this.services = services;
  }

  /**
   * Execute coordinated crisis response across all services
   */
  async executeCoordinatedCrisisResponse(
    userId: string,
    crisisEvent: CrisisEvent
  ): Promise<{
    crisisResponseExecuted: boolean;
    servicesInvolved: string[];
    responseTime: number;
    userSafetyMaintained: boolean;
    therapeuticContinuityPreserved: boolean;
    crossDeviceCoordinated: boolean;
    performanceOptimized: boolean;
  }> {
    const startTime = Date.now();

    try {
      // Parallel execution of crisis-related services
      const [
        crisisDetection,
        therapeuticSafety,
        crossDeviceAlert,
        performanceOptimization
      ] = await Promise.all([
        this.services.crisisEscalation.detectCrisis(crisisEvent),
        this.services.therapeuticSafety.handleCrisisSafetyProtocols(
          userId,
          crisisEvent.eventId,
          crisisEvent.crisisClassification.crisisLevel,
          200
        ),
        this.services.crossDeviceCoordination.grantEmergencyDeviceAccess(
          userId,
          crisisEvent.deviceId,
          crisisEvent.crisisClassification.crisisLevel,
          'Crisis detected - emergency access required'
        ),
        this.services.performanceMonitoring.detectPerformanceViolations(
          userId,
          crisisEvent.deviceId,
          {
            currentLatency: 0,
            currentThroughput: 0,
            currentErrorRate: 0,
            currentMemoryUsage: 0,
            crisisOperationActive: true
          }
        )
      ]);

      return {
        crisisResponseExecuted: true,
        servicesInvolved: ['crisisEscalation', 'therapeuticSafety', 'crossDeviceCoordination', 'performanceMonitoring'],
        responseTime: Date.now() - startTime,
        userSafetyMaintained: therapeuticSafety.crisisSafeResolutionComplete,
        therapeuticContinuityPreserved: therapeuticSafety.continuityMaintained,
        crossDeviceCoordinated: crossDeviceAlert.accessGranted,
        performanceOptimized: performanceOptimization.automaticOptimizationsApplied.length > 0
      };
    } catch (error) {
      throw new Error(`Coordinated crisis response failed: ${error}`);
    }
  }

  /**
   * Execute coordinated sync operation across devices
   */
  async executeCoordinatedCrossDeviceSync(
    userId: string,
    syncRequest: {
      sourceDevice: string;
      targetDevices: string[];
      syncType: string;
      preserveTherapeuticContinuity: boolean;
    }
  ): Promise<{
    syncExecuted: boolean;
    devicesCoordinated: number;
    conflictsResolved: number;
    performanceOptimized: boolean;
    therapeuticContinuityMaintained: boolean;
    subscriptionLimitsRespected: boolean;
  }> {
    try {
      // Sequential coordination for complex sync
      const syncSession = await this.services.crossDeviceCoordination.initiateSyncSession({
        sessionId: crypto.randomUUID(),
        userId,
        initiatingDeviceId: syncRequest.sourceDevice,
        targetDeviceIds: syncRequest.targetDevices,
        sessionType: syncRequest.syncType as any,
        therapeuticContext: {
          sessionInProgress: false,
          sessionType: undefined,
          completionPercentage: 0,
          criticalData: false,
          preserveState: syncRequest.preserveTherapeuticContinuity
        },
        paymentContext: {
          subscriptionTier: 'basic' as any,
          tierSupportsMultiDevice: true,
          deviceLimit: 10,
          currentDeviceCount: syncRequest.targetDevices.length + 1,
          crossDeviceEnabled: true
        },
        syncConfig: {
          syncTypes: ['session_data', 'user_profile'],
          priority: 5,
          conflictResolution: 'therapeutic_priority',
          encryptionRequired: true
        },
        status: 'pending',
        progress: {
          devicesConnected: 0,
          dataTransferred: 0,
          conflictsDetected: 0,
          conflictsResolved: 0
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Parallel conflict resolution and performance optimization
      const [conflictResolution, performanceOptimization] = await Promise.all([
        this.services.conflictResolution.testResolutionSystem(),
        this.services.performanceMonitoring.optimizePerformanceAutomatically(
          userId,
          syncRequest.sourceDevice,
          {
            prioritizeLatency: true,
            prioritizeThroughput: true,
            prioritizeMemoryEfficiency: true,
            maintainTherapeuticContinuity: syncRequest.preserveTherapeuticContinuity,
            respectSubscriptionLimits: true
          }
        )
      ]);

      return {
        syncExecuted: syncSession.initiated,
        devicesCoordinated: syncSession.devicesConnected,
        conflictsResolved: 0, // Would be populated from actual sync
        performanceOptimized: performanceOptimization.optimizationApplied,
        therapeuticContinuityMaintained: performanceOptimization.therapeuticContinuityMaintained,
        subscriptionLimitsRespected: performanceOptimization.subscriptionLimitsRespected
      };
    } catch (error) {
      throw new Error(`Coordinated cross-device sync failed: ${error}`);
    }
  }

  /**
   * Execute coordinated performance optimization
   */
  async executeCoordinatedPerformanceOptimization(
    userId: string,
    deviceId: string,
    optimizationContext: {
      subscriptionTier: 'trial' | 'basic' | 'premium' | 'grace_period';
      therapeuticSessionActive: boolean;
      crisisOperationsActive: boolean;
      crossDeviceSyncRequired: boolean;
    }
  ): Promise<{
    optimizationExecuted: boolean;
    servicesOptimized: string[];
    performanceGains: {
      latencyImprovement: number;
      throughputImprovement: number;
      memoryEfficiency: number;
      resourceUtilization: number;
    };
    therapeuticContinuityMaintained: boolean;
    subscriptionLimitsRespected: boolean;
  }> {
    try {
      // Parallel optimization across services
      const [
        syncOptimization,
        storeOptimization,
        subscriptionOptimization
      ] = await Promise.all([
        this.services.syncOrchestration.optimizePerformance(
          userId,
          {
            prioritizeLatency: true,
            prioritizeThroughput: true,
            optimizeResourceUsage: true,
            maintainTherapeuticContinuity: optimizationContext.therapeuticSessionActive,
            respectSubscriptionLimits: true
          }
        ),
        this.services.enhancedStore.optimizeStorePerformance(
          userId,
          optimizationContext.subscriptionTier,
          {
            prioritizeLatency: true,
            optimizeMemoryUsage: true,
            improveSyncThroughput: optimizationContext.crossDeviceSyncRequired,
            enhanceTherapeuticPerformance: optimizationContext.therapeuticSessionActive,
            respectSubscriptionLimits: true
          }
        ),
        this.services.subscriptionOrchestration.optimizePerformanceAutomatically(
          userId,
          deviceId,
          {
            prioritizeLatency: true,
            prioritizeThroughput: true,
            prioritizeMemoryEfficiency: true,
            maintainTherapeuticContinuity: optimizationContext.therapeuticSessionActive,
            respectSubscriptionLimits: true
          }
        )
      ]);

      return {
        optimizationExecuted: true,
        servicesOptimized: ['syncOrchestration', 'enhancedStore', 'subscriptionOrchestration'],
        performanceGains: {
          latencyImprovement: (syncOptimization.expectedPerformanceGains.latencyImprovement +
                              storeOptimization.performanceImprovements.latencyReduction +
                              subscriptionOptimization.expectedPerformanceGains.latencyImprovement) / 3,
          throughputImprovement: (syncOptimization.expectedPerformanceGains.throughputImprovement +
                                storeOptimization.performanceImprovements.syncThroughputIncrease +
                                subscriptionOptimization.expectedPerformanceGains.throughputImprovement) / 3,
          memoryEfficiency: (storeOptimization.performanceImprovements.memoryEfficiencyGain +
                           subscriptionOptimization.expectedPerformanceGains.memoryEfficiencyGain) / 2,
          resourceUtilization: subscriptionOptimization.expectedPerformanceGains.resourceUtilizationImprovement
        },
        therapeuticContinuityMaintained: syncOptimization.implementationRequired &&
                                       storeOptimization.rollbackAvailable &&
                                       subscriptionOptimization.therapeuticContinuityMaintained,
        subscriptionLimitsRespected: subscriptionOptimization.subscriptionLimitsRespected
      };
    } catch (error) {
      throw new Error(`Coordinated performance optimization failed: ${error}`);
    }
  }
}

/**
 * Default orchestration service configuration
 */
export const DEFAULT_ORCHESTRATION_CONFIG = {
  baseUrl: process.env.REACT_APP_ORCHESTRATION_API_URL || 'http://localhost:3001/api',
  apiKey: process.env.REACT_APP_ORCHESTRATION_API_KEY || 'dev-key',
  defaultTimeout: 5000,

  // Crisis response guaranteed times
  crisisResponseTime: 200,
  emergencyEscalationTime: 200,

  // Performance targets
  realTimeSyncLatency: 500,
  crossDeviceHandoffTime: 2000,
  conflictResolutionTime: 1000,

  // Subscription tier defaults
  trialResourceLimits: ORCHESTRATION_TIER_LIMITS.trial,
  basicResourceLimits: ORCHESTRATION_TIER_LIMITS.basic,
  premiumResourceLimits: ORCHESTRATION_TIER_LIMITS.premium,

  // Therapeutic safety standards
  therapeuticContinuityTarget: 0.95,
  clinicalAccuracyTarget: 1.0,
  crisisDetectionAccuracy: 0.98
};

/**
 * Orchestration service health check
 */
export async function performOrchestrationHealthCheck(
  services: ReturnType<OrchestrationServiceFactory['createOrchestrationSuite']>
): Promise<{
  healthy: boolean;
  serviceHealth: Record<string, boolean>;
  overallLatency: number;
  crisisResponseReady: boolean;
  therapeuticSafetyActive: boolean;
  recommendations: string[];
}> {
  const startTime = Date.now();
  const healthChecks: Record<string, boolean> = {};

  try {
    // Test crisis escalation (most critical)
    const crisisTest = await services.crisisEscalation.testCrisisEscalationSystem('test-user', {
      testCrisisDetection: true,
      testEmergencyResponse: true,
      testCrossDevicePropagation: true,
      testProfessionalCoordination: true,
      testTherapeuticSafety: true
    });
    healthChecks.crisisEscalation = crisisTest.testComplete && crisisTest.overallSystemReliability > 0.95;

    // Test therapeutic safety
    const safetyTest = await services.therapeuticSafety.testTherapeuticSafetySystems('test-user', {
      testCrisisResponse: true,
      testContinuityValidation: true,
      testAssessmentIntegrity: true,
      testDataProtection: true,
      testWorkflowSafeguards: true
    });
    healthChecks.therapeuticSafety = safetyTest.testComplete && safetyTest.overallSafetyScore > 0.95;

    // Test performance monitoring
    const performanceTest = await services.performanceMonitoring.detectPerformanceViolations('test-user', 'test-device', {
      currentLatency: 100,
      currentThroughput: 50,
      currentErrorRate: 0.01,
      currentMemoryUsage: 100 * 1024 * 1024,
      crisisOperationActive: false
    });
    healthChecks.performanceMonitoring = performanceTest.violationsDetected === 0;

    // Test store integration
    const storeTest = await services.enhancedStore.testStoreIntegration('test-user', {
      testRealTimeSync: true,
      testCrossDeviceCoordination: true,
      testConflictResolution: true,
      testTherapeuticValidation: true,
      testPerformanceUnderLoad: true
    });
    healthChecks.enhancedStore = storeTest.testComplete && storeTest.overallHealthScore > 0.95;

    const overallLatency = Date.now() - startTime;
    const healthy = Object.values(healthChecks).every(h => h) && overallLatency < 5000;

    return {
      healthy,
      serviceHealth: healthChecks,
      overallLatency,
      crisisResponseReady: healthChecks.crisisEscalation,
      therapeuticSafetyActive: healthChecks.therapeuticSafety,
      recommendations: healthy ? [] : [
        'Check service configurations',
        'Verify network connectivity',
        'Review error logs',
        'Test individual service endpoints'
      ]
    };
  } catch (error) {
    return {
      healthy: false,
      serviceHealth: healthChecks,
      overallLatency: Date.now() - startTime,
      crisisResponseReady: false,
      therapeuticSafetyActive: false,
      recommendations: [
        'Service connectivity issues detected',
        'Check API endpoints',
        'Verify authentication',
        'Review service logs'
      ]
    };
  }
}

export default {
  OrchestrationServiceFactory,
  OrchestrationServiceCoordinator,
  DEFAULT_ORCHESTRATION_CONFIG,
  performOrchestrationHealthCheck
};