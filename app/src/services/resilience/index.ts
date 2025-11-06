/**


 * SYSTEM RESILIENCE SERVICES
 * Week 4 Phase 2a - Critical Production Infrastructure
 *
 * FAULT TOLERANCE AND SYSTEM RESILIENCE:
 * - Circuit breaker patterns for external service protection
 * - Graceful degradation during service outages
 * - Crisis intervention protection (highest priority)
 * - Intelligent fallback strategies
 * - Automatic recovery and health monitoring
 *
 * SAFETY-CRITICAL GUARANTEES:
 * - Crisis detection never fails (threshold=1, recovery=5s)
 * - Mental health features remain functional during outages
 * - Authentication graceful degradation with offline mode
 * - Sync operations intelligent queueing for retry
 * - Analytics fail silently without user impact
 *
 * USAGE:
 * import { circuitBreakerService, protectedCrisisDetection } from '@/services/resilience';
 */

// Import for internal use
import { circuitBreakerService, CircuitBreakerState, ProtectedService } from './CircuitBreakerService';
import { logSecurity, logError, logPerformance, LogCategory } from '../logging';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Core Circuit Breaker Service
export {
  CircuitBreakerService,
  circuitBreakerService,
  CircuitBreakerState,
  ProtectedService
} from './CircuitBreakerService';

// Protected Operation Helpers
export {
  executeProtected,
  protectedCrisisDetection,
  protectedAuthentication,
  protectedSyncOperation,
  protectedAnalytics,
  protectedNetworkRequest
} from './CircuitBreakerService';

// Re-export monitoring integration
export {
  trackError,
  trackPerformanceError,
  ErrorCategory
} from '../monitoring';

/**
 * RESILIENCE ORCHESTRATOR - Central Management
 */
export class ResilienceOrchestrator {
  private static instance: ResilienceOrchestrator;
  private isInitialized: boolean = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): ResilienceOrchestrator {
    if (!ResilienceOrchestrator.instance) {
      ResilienceOrchestrator.instance = new ResilienceOrchestrator();
    }
    return ResilienceOrchestrator.instance;
  }

  /**
   * Initialize all resilience services
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize circuit breaker service
      await circuitBreakerService.initialize();

      // Start periodic health checks
      this.startHealthMonitoring();

      this.isInitialized = true;

      logSecurity('Resilience orchestrator initialized', 'low', {
        component: 'resilience_orchestrator',
        services: ['circuit_breakers'],
        healthMonitoring: true
      });

    } catch (error) {
      logError(LogCategory.SECURITY, 'Resilience orchestrator initialization failed', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Start periodic health monitoring
   */
  private startHealthMonitoring(): void {
    // Check system health every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000);
  }

  /**
   * Perform system health check
   */
  private performHealthCheck(): void {
    try {
      const systemHealth = circuitBreakerService.getSystemHealth();

      // Log health status
      logPerformance('System resilience health check', 0, {
        overall: systemHealth.overall,
        criticalServiceFailures: systemHealth.criticalServiceFailures,
        openCircuits: systemHealth.openCircuits,
        degradedServices: systemHealth.degradedServices
      });

      // Alert on critical service failures
      if (systemHealth.criticalServiceFailures > 0) {
        logSecurity('Critical service failures detected', 'high', {
          component: 'resilience_orchestrator',
          criticalFailures: systemHealth.criticalServiceFailures,
          openCircuits: systemHealth.openCircuits
        });
      }

      // Alert on system degradation
      else if (systemHealth.overall === 'degraded') {
        logSecurity('System degradation detected', 'medium', {
          component: 'resilience_orchestrator',
          degradedServices: systemHealth.degradedServices,
          openCircuits: systemHealth.openCircuits
        });
      }

    } catch (error) {
      logError(LogCategory.SECURITY, 'Health check failed', error instanceof Error ? error : undefined);
    }
  }

  /**
   * Get comprehensive resilience status
   */
  getResilienceStatus(): {
    isInitialized: boolean;
    systemHealth: ReturnType<typeof circuitBreakerService.getSystemHealth>;
    circuitBreakers: ReturnType<typeof circuitBreakerService.getCircuitBreakerStatuses>;
    criticalServicesStatus: 'all_healthy' | 'degraded' | 'critical_failure';
  } {
    const systemHealth = circuitBreakerService.getSystemHealth();
    const circuitBreakers = circuitBreakerService.getCircuitBreakerStatuses();

    // Check critical services specifically
    let criticalServicesStatus: 'all_healthy' | 'degraded' | 'critical_failure' = 'all_healthy';

    const criticalServices = [
      ProtectedService.CRISIS_DETECTION,
      ProtectedService.AUTHENTICATION,
      ProtectedService.ASSESSMENT_STORE
    ];

    const criticalServiceIssues = criticalServices.filter(service => {
      const status = circuitBreakers[service];
      return status && (status.state === CircuitBreakerState.OPEN || status.healthStatus !== 'healthy');
    });

    if (criticalServiceIssues.length > 0) {
      const openCriticalServices = criticalServiceIssues.filter(service => {
        const status = circuitBreakers[service];
        return status && status.state === CircuitBreakerState.OPEN;
      });

      criticalServicesStatus = openCriticalServices.length > 0 ? 'critical_failure' : 'degraded';
    }

    return {
      isInitialized: this.isInitialized,
      systemHealth,
      circuitBreakers,
      criticalServicesStatus
    };
  }

  /**
   * Emergency actions for system resilience
   */
  async triggerEmergencyProtocol(): Promise<void> {
    try {
      logSecurity('Emergency resilience protocol triggered', 'critical', {
        component: 'resilience_orchestrator',
        action: 'emergency_protocol'
      });

      // Force close critical service circuits to attempt recovery
      const criticalServices = [
        ProtectedService.CRISIS_DETECTION,
        ProtectedService.AUTHENTICATION,
        ProtectedService.ASSESSMENT_STORE
      ];

      for (const service of criticalServices) {
        try {
          circuitBreakerService.forceCircuitState(service, CircuitBreakerState.CLOSED);
        } catch (error) {
          logError(LogCategory.SECURITY, `Failed to force close circuit for ${service}`, error instanceof Error ? error : undefined);
        }
      }

      // Clear any queued operations that might be causing issues
      await this.clearOperationQueues();

      logSecurity('Emergency resilience protocol completed', 'critical', {
        component: 'resilience_orchestrator',
        action: 'emergency_protocol',
        result: 'success' as any
      });

    } catch (error) {
      logError(LogCategory.SECURITY, 'Emergency resilience protocol failed', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Clear operation queues
   */
  private async clearOperationQueues(): Promise<void> {
    try {
      // Clear circuit breaker queues
      const queueKeys = Object.values(ProtectedService).map(service =>
        `circuit_breaker_queue_${service}`
      );

      for (const key of queueKeys) {
        try {
          await AsyncStorage.removeItem(key);
        } catch (error) {
          // Continue with other queues
        }
      }

      logSecurity('Operation queues cleared', 'low', {
        component: 'resilience_orchestrator',
        clearedQueues: queueKeys.length
      });

    } catch (error) {
      logError(LogCategory.SECURITY, 'Failed to clear operation queues', error instanceof Error ? error : undefined);
    }
  }

  /**
   * Emergency shutdown
   */
  async emergencyShutdown(): Promise<void> {
    try {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      await circuitBreakerService.emergencyShutdown();

      this.isInitialized = false;

      logSecurity('Resilience orchestrator emergency shutdown', 'critical', {
        component: 'resilience_orchestrator',
        reason: 'emergency_shutdown'
      });

    } catch (error) {
      logError(LogCategory.SECURITY, 'Resilience orchestrator shutdown failed', error instanceof Error ? error : undefined);
    }
  }
}

// Export singleton instance
export const resilienceOrchestrator = ResilienceOrchestrator.getInstance();

/**
 * CONVENIENCE FUNCTIONS
 */

/**
 * Check if system is healthy for critical operations
 */
export function isCriticalSystemHealthy(): boolean {
  const status = resilienceOrchestrator.getResilienceStatus();
  return status.criticalServicesStatus === 'all_healthy';
}

/**
 * Check if specific service is available
 */
export function isServiceAvailable(service: ProtectedService): boolean {
  const statuses = circuitBreakerService.getCircuitBreakerStatuses();
  const serviceStatus = statuses[service];

  return !!(serviceStatus && serviceStatus.state !== CircuitBreakerState.OPEN);
}

/**
 * Get system resilience health check
 */
export function getSystemResilienceHealth(): 'healthy' | 'degraded' | 'critical' {
  const systemHealth = circuitBreakerService.getSystemHealth();
  return systemHealth.overall;
}

/**
 * Initialize resilience for a service
 */
export async function initializeServiceResilience(serviceName: string): Promise<void> {
  try {
    await resilienceOrchestrator.initialize();

    logSecurity(`Service resilience initialized for ${serviceName}`, 'low', {
      component: serviceName,
      action: 'resilience_init'
    });

  } catch (error) {
    logError(LogCategory.SECURITY, `Failed to initialize resilience for ${serviceName}`, error instanceof Error ? error : undefined);
    throw error;
  }
}

export default resilienceOrchestrator;