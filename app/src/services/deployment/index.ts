/**
 * DEPLOYMENT SERVICES - CI/CD Pipeline Hardening
 * Week 4 Phase 2c - Critical Production Infrastructure
 *
 * BLUE/GREEN DEPLOYMENT WITH SAFETY GUARANTEES:
 * - Zero-downtime deployment for mental health services
 * - 30-second rollback guarantee for production
 * - Crisis intervention protection during deployments
 * - Comprehensive health checks and validation
 * - Integration with monitoring and resilience systems
 *
 * DEPLOYMENT STRATEGIES:
 * - Blue/Green: Zero-downtime with instant rollback (production default)
 * - Canary: Gradual rollout with performance monitoring
 * - Rolling: Progressive update with health validation
 * - Emergency: Immediate deployment for critical fixes
 *
 * SAFETY-CRITICAL GUARANTEES:
 * - Crisis detection remains functional during all deployments
 * - Authentication services cannot be interrupted
 * - Assessment data integrity maintained throughout process
 * - Automatic rollback on health check failures
 * - PHI protection remains active during deployment
 *
 * USAGE:
 * import { deploymentService, deployToProduction, emergencyDeploy } from '@/services/deployment';
 */

// Core Deployment Service
export {
  DeploymentService,
  deploymentService,
  DeploymentStrategy,
  Environment,
  DeploymentStatus
} from './DeploymentService';

// Convenience Deployment Functions
export {
  deployToProduction,
  emergencyDeploy
} from './DeploymentService';

// Re-export monitoring integration
export {
  resilienceOrchestrator,
  ProtectedService
} from '../resilience';

// Re-export logging for deployment tracking
export {
  logSecurity,
  logPerformance,
  logError
} from '../logging';

/**
 * DEPLOYMENT ORCHESTRATOR - Central Management
 */
export class DeploymentOrchestrator {
  private static instance: DeploymentOrchestrator;
  private isInitialized: boolean = false;

  private constructor() {}

  static getInstance(): DeploymentOrchestrator {
    if (!DeploymentOrchestrator.instance) {
      DeploymentOrchestrator.instance = new DeploymentOrchestrator();
    }
    return DeploymentOrchestrator.instance;
  }

  /**
   * Initialize deployment orchestrator
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize deployment service
      await deploymentService.initialize();

      this.isInitialized = true;

      logSecurity('Deployment orchestrator initialized', 'low', {
        component: 'deployment_orchestrator',
        services: ['deployment_service']
      });

    } catch (error) {
      logError(LogCategory.SECURITY, 'Deployment orchestrator initialization failed', error);
      throw error;
    }
  }

  /**
   * Get deployment readiness status
   */
  getDeploymentReadiness(): {
    isReady: boolean;
    readinessScore: number;
    blockingIssues: string[];
    warnings: string[];
    systemHealth: 'healthy' | 'degraded' | 'critical';
  } {
    try {
      const deploymentStatus = deploymentService.getDeploymentStatus();
      const resilienceStatus = resilienceOrchestrator.getResilienceStatus();

      const blockingIssues: string[] = [];
      const warnings: string[] = [];

      // Check for blocking issues
      if (!this.isInitialized) {
        blockingIssues.push('Deployment orchestrator not initialized');
      }

      if (deploymentStatus.currentDeployment) {
        blockingIssues.push('Another deployment is currently in progress');
      }

      if (resilienceStatus.criticalServicesStatus === 'critical_failure') {
        blockingIssues.push('Critical services are failing - deployment blocked');
      }

      // Check for warnings
      if (resilienceStatus.systemHealth.degradedServices > 0) {
        warnings.push(`${resilienceStatus.systemHealth.degradedServices} services are degraded`);
      }

      if (deploymentStatus.successRate < 0.9) {
        warnings.push(`Recent deployment success rate: ${(deploymentStatus.successRate * 100).toFixed(1)}%`);
      }

      // Calculate readiness score
      let readinessScore = 100;

      readinessScore -= blockingIssues.length * 30;
      readinessScore -= warnings.length * 10;
      readinessScore -= (resilienceStatus.systemHealth.degradedServices * 5);

      readinessScore = Math.max(0, readinessScore);

      const isReady = blockingIssues.length === 0 && readinessScore >= 70;

      return {
        isReady,
        readinessScore,
        blockingIssues,
        warnings,
        systemHealth: resilienceStatus.systemHealth.overall
      };

    } catch (error) {
      return {
        isReady: false,
        readinessScore: 0,
        blockingIssues: ['Failed to assess deployment readiness'],
        warnings: [],
        systemHealth: 'critical'
      };
    }
  }

  /**
   * Pre-flight check for deployment
   */
  async performPreFlightCheck(): Promise<{
    passed: boolean;
    checks: Array<{
      name: string;
      status: 'passed' | 'failed' | 'warning';
      message: string;
    }>;
  }> {
    const checks: Array<{
      name: string;
      status: 'passed' | 'failed' | 'warning';
      message: string;
    }> = [];

    try {
      logSecurity('Starting deployment pre-flight check', 'medium', {
        component: 'deployment_orchestrator'
      });

      // Check 1: System Health
      try {
        const resilienceStatus = resilienceOrchestrator.getResilienceStatus();

        if (resilienceStatus.criticalServicesStatus === 'all_healthy') {
          checks.push({
            name: 'Critical Services Health',
            status: 'passed',
            message: 'All critical services are healthy'
          });
        } else if (resilienceStatus.criticalServicesStatus === 'degraded') {
          checks.push({
            name: 'Critical Services Health',
            status: 'warning',
            message: 'Some critical services are degraded'
          });
        } else {
          checks.push({
            name: 'Critical Services Health',
            status: 'failed',
            message: 'Critical services are failing'
          });
        }
      } catch (error) {
        checks.push({
          name: 'Critical Services Health',
          status: 'failed',
          message: `Health check failed: ${error.message}`
        });
      }

      // Check 2: Circuit Breaker Status
      try {
        const circuitStatuses = resilienceOrchestrator.getResilienceStatus().circuitBreakers;
        const openCircuits = Object.values(circuitStatuses).filter(s => s.state === 'open');

        if (openCircuits.length === 0) {
          checks.push({
            name: 'Circuit Breaker Status',
            status: 'passed',
            message: 'All circuit breakers are closed'
          });
        } else if (openCircuits.length <= 2) {
          checks.push({
            name: 'Circuit Breaker Status',
            status: 'warning',
            message: `${openCircuits.length} circuit breakers are open`
          });
        } else {
          checks.push({
            name: 'Circuit Breaker Status',
            status: 'failed',
            message: `${openCircuits.length} circuit breakers are open - system unstable`
          });
        }
      } catch (error) {
        checks.push({
          name: 'Circuit Breaker Status',
          status: 'failed',
          message: `Circuit breaker check failed: ${error.message}`
        });
      }

      // Check 3: Recent Deployment History
      try {
        const deploymentStatus = deploymentService.getDeploymentStatus();

        if (deploymentStatus.currentDeployment) {
          checks.push({
            name: 'Deployment Availability',
            status: 'failed',
            message: 'Another deployment is currently in progress'
          });
        } else {
          checks.push({
            name: 'Deployment Availability',
            status: 'passed',
            message: 'No active deployments - ready to proceed'
          });
        }

        if (deploymentStatus.successRate >= 0.9) {
          checks.push({
            name: 'Deployment History',
            status: 'passed',
            message: `Recent success rate: ${(deploymentStatus.successRate * 100).toFixed(1)}%`
          });
        } else if (deploymentStatus.successRate >= 0.7) {
          checks.push({
            name: 'Deployment History',
            status: 'warning',
            message: `Recent success rate: ${(deploymentStatus.successRate * 100).toFixed(1)}%`
          });
        } else {
          checks.push({
            name: 'Deployment History',
            status: 'failed',
            message: `Poor recent success rate: ${(deploymentStatus.successRate * 100).toFixed(1)}%`
          });
        }
      } catch (error) {
        checks.push({
          name: 'Deployment History',
          status: 'failed',
          message: `Deployment history check failed: ${error.message}`
        });
      }

      // Check 4: Crisis Detection Service
      try {
        const circuitStatuses = resilienceOrchestrator.getResilienceStatus().circuitBreakers;
        const crisisService = circuitStatuses[ProtectedService.CRISIS_DETECTION];

        if (crisisService && crisisService.healthStatus === 'healthy') {
          checks.push({
            name: 'Crisis Detection Service',
            status: 'passed',
            message: 'Crisis detection service is healthy'
          });
        } else {
          checks.push({
            name: 'Crisis Detection Service',
            status: 'failed',
            message: 'Crisis detection service is not healthy - deployment blocked'
          });
        }
      } catch (error) {
        checks.push({
          name: 'Crisis Detection Service',
          status: 'failed',
          message: `Crisis detection check failed: ${error.message}`
        });
      }

      const failedChecks = checks.filter(c => c.status === 'failed');
      const passed = failedChecks.length === 0;

      logSecurity('Deployment pre-flight check completed', 'medium', {
        component: 'deployment_orchestrator',
        passed,
        totalChecks: checks.length,
        failedChecks: failedChecks.length
      });

      return { passed, checks };

    } catch (error) {
      logError(LogCategory.SECURITY, 'Pre-flight check failed', error);

      return {
        passed: false,
        checks: [{
          name: 'Pre-flight Check System',
          status: 'failed',
          message: `System error: ${error.message}`
        }]
      };
    }
  }

  /**
   * Emergency shutdown
   */
  async emergencyShutdown(): Promise<void> {
    try {
      await deploymentService.emergencyShutdown();

      this.isInitialized = false;

      logSecurity('Deployment orchestrator emergency shutdown', 'critical', {
        component: 'deployment_orchestrator',
        reason: 'emergency_shutdown'
      });

    } catch (error) {
      logError(LogCategory.SECURITY, 'Deployment orchestrator shutdown failed', error);
    }
  }
}

// Export singleton instance
export const deploymentOrchestrator = DeploymentOrchestrator.getInstance();

/**
 * CONVENIENCE FUNCTIONS FOR PRODUCTION DEPLOYMENT
 */

/**
 * Check if system is ready for deployment
 */
export function isSystemReadyForDeployment(): boolean {
  const readiness = deploymentOrchestrator.getDeploymentReadiness();
  return readiness.isReady;
}

/**
 * Get deployment readiness report
 */
export function getDeploymentReadinessReport(): ReturnType<typeof deploymentOrchestrator.getDeploymentReadiness> {
  return deploymentOrchestrator.getDeploymentReadiness();
}

/**
 * Perform comprehensive pre-deployment validation
 */
export async function validateDeploymentReadiness(): Promise<{
  canDeploy: boolean;
  report: string;
  criticalIssues: string[];
}> {
  try {
    const readiness = deploymentOrchestrator.getDeploymentReadiness();
    const preFlightCheck = await deploymentOrchestrator.performPreFlightCheck();

    const criticalIssues = [
      ...readiness.blockingIssues,
      ...preFlightCheck.checks.filter(c => c.status === 'failed').map(c => c.message)
    ];

    const canDeploy = readiness.isReady && preFlightCheck.passed;

    const report = `
Deployment Readiness Report:
- Overall Readiness Score: ${readiness.readinessScore}/100
- System Health: ${readiness.systemHealth}
- Pre-flight Check: ${preFlightCheck.passed ? 'PASSED' : 'FAILED'}
- Blocking Issues: ${criticalIssues.length}
- Warnings: ${readiness.warnings.length}

${criticalIssues.length > 0 ? `\nCritical Issues:\n${criticalIssues.map(i => `- ${i}`).join('\n')}` : ''}
${readiness.warnings.length > 0 ? `\nWarnings:\n${readiness.warnings.map(w => `- ${w}`).join('\n')}` : ''}
    `.trim();

    return { canDeploy, report, criticalIssues };

  } catch (error) {
    return {
      canDeploy: false,
      report: `Deployment validation failed: ${error.message}`,
      criticalIssues: ['System validation error']
    };
  }
}

/**
 * Initialize deployment for a service
 */
export async function initializeServiceDeployment(serviceName: string): Promise<void> {
  try {
    await deploymentOrchestrator.initialize();

    logSecurity(`Service deployment initialized for ${serviceName}`, 'low', {
      component: serviceName,
      action: 'deployment_init'
    });

  } catch (error) {
    logError(LogCategory.SECURITY, `Failed to initialize deployment for ${serviceName}`, error);
    throw error;
  }
}

// Import required dependencies at the end to avoid circular imports
import { logSecurity, logError, LogCategory } from '../logging';

export default deploymentOrchestrator;