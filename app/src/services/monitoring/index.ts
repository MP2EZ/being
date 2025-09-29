/**
 * PRODUCTION MONITORING SERVICES
 * Week 4 Phase 1c - Critical Production Infrastructure
 *
 * COMPREHENSIVE MONITORING INFRASTRUCTURE:
 * - Real-time error monitoring with PHI sanitization
 * - Intelligent alerting with crisis escalation
 * - Performance tracking integration
 * - Security event monitoring
 * - HIPAA-compliant error aggregation
 *
 * USAGE:
 * import { errorMonitoringService, trackCrisisError, trackSyncError } from '@/services/monitoring';
 */

// Core Error Monitoring Service
export {
  ErrorMonitoringService,
  errorMonitoringService,
  ErrorSeverity,
  ErrorCategory
} from './ErrorMonitoringService';

// Convenience Error Tracking Functions
export {
  trackError,
  trackCrisisError,
  trackAuthError,
  trackSyncError,
  trackAnalyticsError,
  trackSecurityError,
  trackPerformanceError
} from './ErrorMonitoringService';

// Re-export logging for integrated monitoring
export {
  logError,
  logSecurity,
  logCrisis,
  logPerformance,
  LogCategory
} from '../logging';

/**
 * MONITORING ORCHESTRATOR - Central Management
 */
export class MonitoringOrchestrator {
  private static instance: MonitoringOrchestrator;
  private isInitialized: boolean = false;

  private constructor() {}

  static getInstance(): MonitoringOrchestrator {
    if (!MonitoringOrchestrator.instance) {
      MonitoringOrchestrator.instance = new MonitoringOrchestrator();
    }
    return MonitoringOrchestrator.instance;
  }

  /**
   * Initialize all monitoring services
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize error monitoring
      await errorMonitoringService.initialize();

      this.isInitialized = true;

      logSecurity('Monitoring orchestrator initialized', 'low', {
        component: 'monitoring_orchestrator',
        services: ['error_monitoring'],
        status: 'initialized'
      });

    } catch (error) {
      logError(LogCategory.SECURITY, 'Monitoring orchestrator initialization failed', error);
      throw error;
    }
  }

  /**
   * Get comprehensive monitoring status
   */
  getMonitoringStatus(): {
    isInitialized: boolean;
    errorMonitoring: ReturnType<typeof errorMonitoringService.getMonitoringStatus>;
    healthCheck: 'healthy' | 'degraded' | 'unhealthy';
  } {
    const errorStatus = errorMonitoringService.getMonitoringStatus();

    // Determine overall health
    let healthCheck: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (!this.isInitialized || !errorStatus.isInitialized) {
      healthCheck = 'unhealthy';
    } else if (errorStatus.criticalErrors > 0 || errorStatus.alertsInLastHour > 10) {
      healthCheck = 'degraded';
    }

    return {
      isInitialized: this.isInitialized,
      errorMonitoring: errorStatus,
      healthCheck
    };
  }

  /**
   * Emergency shutdown all monitoring services
   */
  async emergencyShutdown(): Promise<void> {
    try {
      await errorMonitoringService.emergencyShutdown();

      this.isInitialized = false;

      logSecurity('Monitoring orchestrator emergency shutdown', 'critical', {
        component: 'monitoring_orchestrator',
        reason: 'emergency_shutdown'
      });

    } catch (error) {
      logError(LogCategory.SECURITY, 'Monitoring orchestrator shutdown failed', error);
    }
  }
}

// Export singleton instance
export const monitoringOrchestrator = MonitoringOrchestrator.getInstance();

/**
 * INTEGRATION HELPERS - For Service Integration
 */

/**
 * Initialize monitoring for a service
 */
export async function initializeServiceMonitoring(serviceName: string): Promise<void> {
  try {
    await monitoringOrchestrator.initialize();

    logSecurity(`Service monitoring initialized for ${serviceName}`, 'low', {
      component: serviceName,
      action: 'monitoring_init'
    });

  } catch (error) {
    logError(LogCategory.SECURITY, `Failed to initialize monitoring for ${serviceName}`, error);
    throw error;
  }
}

/**
 * Health check for monitoring services
 */
export function getMonitoringHealthCheck(): 'healthy' | 'degraded' | 'unhealthy' {
  return monitoringOrchestrator.getMonitoringStatus().healthCheck;
}

/**
 * Quick error tracking with service context
 */
export function trackServiceError(
  serviceName: string,
  category: ErrorCategory,
  message: string,
  error?: Error
): void {
  trackError(category, message, error, {
    component: serviceName,
    service: serviceName
  });
}

/**
 * CRISIS ESCALATION HELPER
 */
export function escalateCrisisError(
  message: string,
  context?: {
    detectionTime?: number;
    assessmentType?: 'PHQ-9' | 'GAD-7';
    interventionTriggered?: boolean;
  }
): void {
  // Track as crisis error for immediate alerting
  trackCrisisError(message, undefined, {
    ...context,
    escalation: 'crisis',
    timestamp: Date.now()
  });

  // Also log as crisis event for clinical monitoring
  logCrisis(message, {
    severity: 'critical',
    interventionType: context?.interventionTriggered ? 'automated' : 'manual',
    detectionTime: context?.detectionTime
  });
}

export default monitoringOrchestrator;