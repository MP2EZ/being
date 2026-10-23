/**
 * SYSTEM RESILIENCE SERVICES
 *
 * Circuit breakers for external services, plus a health-reporting orchestrator.
 *
 * What this module does NOT do (MAINT-794): it does not protect crisis
 * detection. detectCrisis() is a pure, synchronous score function over PHQ-9 /
 * GAD-7 integers and is not routed through any circuit breaker here. The crisis
 * button, the 988 dial and crisis telemetry do not depend on this module either
 * (SupabaseService keeps its own breaker state).
 *
 * Live surface: resilienceOrchestrator.initialize() and getResilienceStatus(),
 * read by CrisisMonitoringService for infrastructure-health metrics and alerts.
 *
 * USAGE:
 * import { circuitBreakerService, resilienceOrchestrator } from '@/core/services/resilience';
 */

// Import for internal use
import { circuitBreakerService, CircuitBreakerState, ProtectedService } from './CircuitBreakerService';
import { logSecurity, logError, logPerformance, LogCategory } from '../logging';

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
    // INFRA-177: Skip interval setup in test environment to prevent Jest
    // worker hang from unguarded timers (INFRA-144/175 pattern).
    if (process.env.NODE_ENV === 'test') return;

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
}

// Export singleton instance
export const resilienceOrchestrator = ResilienceOrchestrator.getInstance();

export default resilienceOrchestrator;