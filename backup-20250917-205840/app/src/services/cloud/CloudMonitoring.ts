/**
 * Cloud Monitoring and Health Check Service
 *
 * Monitors Supabase health, performance, cost, and HIPAA compliance
 * Provides real-time alerts for crisis response requirements
 */

import { supabaseClient } from './SupabaseClient';
import { CLOUD_CONSTANTS } from '../../types/cloud';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'offline';
  latency: number;
  timestamp: string;
  details?: {
    error?: string;
    region?: string;
    responseTime?: number;
    dataIntegrity?: boolean;
  };
}

export interface CostMetrics {
  service: string;
  period: 'daily' | 'weekly' | 'monthly';
  requestCount: number;
  storageUsedMB: number;
  estimatedCost: number;
  budgetUsed: number; // Percentage 0-1
  alertThreshold: number; // Percentage 0-1
  timestamp: string;
}

export interface PerformanceMetrics {
  crisisResponseTime: number;
  appLaunchTime: number;
  assessmentLoadTime: number;
  breathingFPS: number;
  checkinTransitionTime: number;
  timestamp: string;
  withinThresholds: boolean;
}

export interface ComplianceStatus {
  hipaaCompliant: boolean;
  encryptionActive: boolean;
  rlsPoliciesActive: boolean;
  regionCompliant: boolean;
  auditTrailActive: boolean;
  dataRetentionCompliant: boolean;
  timestamp: string;
  issues: string[];
}

/**
 * Cloud monitoring service for health, performance, and compliance
 */
export class CloudMonitoringService {
  private monitoringActive = false;
  private alertCallbacks: Map<string, (alert: any) => void> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private costCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize monitoring service
   */
  private initialize(): void {
    // Only enable monitoring if cloud features are configured
    const cloudEnabled = process.env.EXPO_PUBLIC_CLOUD_FEATURES_ENABLED === 'true';
    const monitoringEnabled = process.env.EXPO_PUBLIC_PERFORMANCE_MONITORING === 'true';

    if (cloudEnabled || monitoringEnabled) {
      this.startMonitoring();
    }
  }

  /**
   * Start monitoring services
   */
  public startMonitoring(): void {
    if (this.monitoringActive) {
      return;
    }

    this.monitoringActive = true;
    console.log('[CloudMonitoring] Starting monitoring services...');

    // Health checks every 60 seconds
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 60000);

    // Cost monitoring every 5 minutes
    this.costCheckInterval = setInterval(() => {
      this.checkCostMetrics();
    }, 300000);

    // Initial checks
    this.performHealthCheck();
    this.checkCostMetrics();
    this.validateCompliance();
  }

  /**
   * Stop monitoring services
   */
  public stopMonitoring(): void {
    this.monitoringActive = false;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.costCheckInterval) {
      clearInterval(this.costCheckInterval);
      this.costCheckInterval = null;
    }

    console.log('[CloudMonitoring] Monitoring services stopped');
  }

  /**
   * Register alert callback
   */
  public registerAlertCallback(alertType: string, callback: (alert: any) => void): void {
    this.alertCallbacks.set(alertType, callback);
  }

  /**
   * Perform comprehensive health check
   */
  public async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      // Test Supabase connection
      const connectionResult = await supabaseClient.testConnection();
      const latency = Date.now() - startTime;

      const healthResult: HealthCheckResult = {
        service: 'supabase',
        status: connectionResult.success ? 'healthy' : 'offline',
        latency: connectionResult.latency || latency,
        timestamp,
        details: {
          error: connectionResult.error,
          region: process.env.EXPO_PUBLIC_SUPABASE_REGION,
          responseTime: connectionResult.latency,
          dataIntegrity: connectionResult.success
        }
      };

      // Check if latency exceeds thresholds
      const crisisThreshold = parseInt(process.env.EXPO_PUBLIC_PERFORMANCE_CRISIS_BUTTON_MAX_MS || '200', 10);
      if (healthResult.latency > crisisThreshold) {
        this.triggerAlert('performance', {
          type: 'crisis_response_threshold_exceeded',
          latency: healthResult.latency,
          threshold: crisisThreshold,
          timestamp
        });
      }

      // Check service status
      if (healthResult.status !== 'healthy') {
        this.triggerAlert('health', {
          type: 'service_unhealthy',
          service: 'supabase',
          status: healthResult.status,
          error: healthResult.details?.error,
          timestamp
        });
      }

      return healthResult;

    } catch (error) {
      const errorResult: HealthCheckResult = {
        service: 'supabase',
        status: 'offline',
        latency: Date.now() - startTime,
        timestamp,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };

      this.triggerAlert('health', {
        type: 'service_offline',
        service: 'supabase',
        error: errorResult.details?.error,
        timestamp
      });

      return errorResult;
    }
  }

  /**
   * Check cost metrics and budget usage
   */
  public async checkCostMetrics(): Promise<CostMetrics> {
    const timestamp = new Date().toISOString();

    try {
      // In a real implementation, this would query Supabase usage metrics
      // For now, we'll simulate based on configuration
      const dailyBudget = parseInt(process.env.EXPO_PUBLIC_SUPABASE_REQUEST_BUDGET_DAILY || '1000000', 10);
      const storageBudgetMB = parseInt(process.env.EXPO_PUBLIC_SUPABASE_STORAGE_BUDGET_MB || '50000', 10);
      const alertThreshold = parseFloat(process.env.EXPO_PUBLIC_COST_ALERT_THRESHOLD || '0.85');

      // Simulate metrics (in production, fetch from Supabase API)
      const mockRequestCount = Math.floor(dailyBudget * 0.1); // 10% of budget used
      const mockStorageUsedMB = Math.floor(storageBudgetMB * 0.05); // 5% of storage used
      const mockEstimatedCost = (mockRequestCount / 1000000) * 25; // $25 per million requests
      const budgetUsed = mockRequestCount / dailyBudget;

      const costMetrics: CostMetrics = {
        service: 'supabase',
        period: 'daily',
        requestCount: mockRequestCount,
        storageUsedMB: mockStorageUsedMB,
        estimatedCost: mockEstimatedCost,
        budgetUsed,
        alertThreshold,
        timestamp
      };

      // Check budget alerts
      if (budgetUsed > alertThreshold) {
        this.triggerAlert('cost', {
          type: 'budget_threshold_exceeded',
          budgetUsed: budgetUsed * 100,
          threshold: alertThreshold * 100,
          estimatedCost: mockEstimatedCost,
          timestamp
        });
      }

      return costMetrics;

    } catch (error) {
      console.error('[CloudMonitoring] Cost metrics check failed:', error);

      // Return default metrics in case of error
      return {
        service: 'supabase',
        period: 'daily',
        requestCount: 0,
        storageUsedMB: 0,
        estimatedCost: 0,
        budgetUsed: 0,
        alertThreshold: 0.85,
        timestamp
      };
    }
  }

  /**
   * Monitor performance metrics
   */
  public checkPerformanceMetrics(): PerformanceMetrics {
    const timestamp = new Date().toISOString();

    // Get thresholds from environment
    const crisisMaxMs = parseInt(process.env.EXPO_PUBLIC_PERFORMANCE_CRISIS_BUTTON_MAX_MS || '200', 10);
    const launchMaxMs = parseInt(process.env.EXPO_PUBLIC_PERFORMANCE_APP_LAUNCH_MAX_MS || '2000', 10);
    const assessmentMaxMs = parseInt(process.env.EXPO_PUBLIC_PERFORMANCE_ASSESSMENT_LOAD_MAX_MS || '300', 10);
    const breathingMinFPS = parseInt(process.env.EXPO_PUBLIC_PERFORMANCE_BREATHING_FPS_MIN || '60', 10);
    const checkinMaxMs = parseInt(process.env.EXPO_PUBLIC_PERFORMANCE_CHECKIN_TRANSITION_MAX_MS || '500', 10);

    // In a real implementation, these would be measured from actual app performance
    // For now, we'll use simulated values
    const metrics: PerformanceMetrics = {
      crisisResponseTime: 150, // Simulated: 150ms (under 200ms threshold)
      appLaunchTime: 1800, // Simulated: 1.8s (under 2s threshold)
      assessmentLoadTime: 250, // Simulated: 250ms (under 300ms threshold)
      breathingFPS: 60, // Simulated: 60 FPS (meets 60 FPS requirement)
      checkinTransitionTime: 400, // Simulated: 400ms (under 500ms threshold)
      timestamp,
      withinThresholds: true
    };

    // Check thresholds
    let withinThresholds = true;
    const issues: string[] = [];

    if (metrics.crisisResponseTime > crisisMaxMs) {
      withinThresholds = false;
      issues.push(`Crisis response time ${metrics.crisisResponseTime}ms exceeds ${crisisMaxMs}ms threshold`);
    }

    if (metrics.appLaunchTime > launchMaxMs) {
      withinThresholds = false;
      issues.push(`App launch time ${metrics.appLaunchTime}ms exceeds ${launchMaxMs}ms threshold`);
    }

    if (metrics.assessmentLoadTime > assessmentMaxMs) {
      withinThresholds = false;
      issues.push(`Assessment load time ${metrics.assessmentLoadTime}ms exceeds ${assessmentMaxMs}ms threshold`);
    }

    if (metrics.breathingFPS < breathingMinFPS) {
      withinThresholds = false;
      issues.push(`Breathing FPS ${metrics.breathingFPS} below ${breathingMinFPS} FPS requirement`);
    }

    if (metrics.checkinTransitionTime > checkinMaxMs) {
      withinThresholds = false;
      issues.push(`Check-in transition ${metrics.checkinTransitionTime}ms exceeds ${checkinMaxMs}ms threshold`);
    }

    metrics.withinThresholds = withinThresholds;

    // Trigger performance alerts if needed
    if (!withinThresholds) {
      this.triggerAlert('performance', {
        type: 'performance_threshold_exceeded',
        metrics,
        issues,
        timestamp
      });
    }

    return metrics;
  }

  /**
   * Validate HIPAA compliance status
   */
  public async validateCompliance(): Promise<ComplianceStatus> {
    const timestamp = new Date().toISOString();
    const issues: string[] = [];

    try {
      // Check encryption
      const encryptionActive = process.env.EXPO_PUBLIC_ENCRYPTION_ENABLED === 'true';
      if (!encryptionActive) {
        issues.push('Data encryption is not enabled');
      }

      // Check region compliance
      const region = process.env.EXPO_PUBLIC_SUPABASE_REGION || '';
      const regionCompliant = CLOUD_CONSTANTS.HIPAA_REGIONS.includes(region as any);
      if (!regionCompliant) {
        issues.push(`Region ${region} is not HIPAA compliant`);
      }

      // Check HIPAA mode
      const hipaaMode = process.env.EXPO_PUBLIC_HIPAA_COMPLIANCE_MODE;
      const hipaaCompliant = hipaaMode === 'ready' || hipaaMode === 'production' || hipaaMode === 'staging';
      if (!hipaaCompliant) {
        issues.push(`HIPAA compliance mode is ${hipaaMode}`);
      }

      // Check audit logging
      const auditLogging = process.env.EXPO_PUBLIC_AUDIT_LOGGING === 'true';
      if (!auditLogging) {
        issues.push('Audit logging is not enabled');
      }

      // Check data retention
      const retentionDays = parseInt(process.env.EXPO_PUBLIC_DATA_RETENTION_DAYS || '365', 10);
      const retentionCompliant = retentionDays >= 365 && retentionDays <= 2555; // 1-7 years
      if (!retentionCompliant) {
        issues.push(`Data retention period ${retentionDays} days is not compliant`);
      }

      const complianceStatus: ComplianceStatus = {
        hipaaCompliant: issues.length === 0,
        encryptionActive,
        rlsPoliciesActive: true, // Assumed from Supabase schema setup
        regionCompliant,
        auditTrailActive: auditLogging,
        dataRetentionCompliant: retentionCompliant,
        timestamp,
        issues
      };

      // Trigger compliance alerts if needed
      if (issues.length > 0) {
        this.triggerAlert('compliance', {
          type: 'compliance_violation',
          issues,
          status: complianceStatus,
          timestamp
        });
      }

      return complianceStatus;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      issues.push(`Compliance validation failed: ${errorMessage}`);

      return {
        hipaaCompliant: false,
        encryptionActive: false,
        rlsPoliciesActive: false,
        regionCompliant: false,
        auditTrailActive: false,
        dataRetentionCompliant: false,
        timestamp,
        issues
      };
    }
  }

  /**
   * Trigger alert to registered callbacks
   */
  private triggerAlert(alertType: string, alertData: any): void {
    const callback = this.alertCallbacks.get(alertType);

    if (callback) {
      try {
        callback(alertData);
      } catch (error) {
        console.error(`[CloudMonitoring] Alert callback failed for ${alertType}:`, error);
      }
    }

    // Log alert for audit trail
    console.warn(`[CloudMonitoring] ${alertType.toUpperCase()} ALERT:`, alertData);

    // In production, this would also send to external monitoring services
    this.logAlertToAuditTrail(alertType, alertData);
  }

  /**
   * Log alert to audit trail
   */
  private logAlertToAuditTrail(alertType: string, alertData: any): void {
    // In production, this would send to secure audit service
    if (__DEV__) {
      console.log('[CloudMonitoring] Audit Trail:', {
        type: 'monitoring_alert',
        alertType,
        alertData,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get current monitoring status
   */
  public getMonitoringStatus(): {
    active: boolean;
    services: string[];
    lastHealthCheck?: string;
    alertsRegistered: string[];
  } {
    return {
      active: this.monitoringActive,
      services: ['supabase', 'performance', 'cost', 'compliance'],
      alertsRegistered: Array.from(this.alertCallbacks.keys())
    };
  }

  /**
   * Cleanup monitoring service
   */
  public destroy(): void {
    this.stopMonitoring();
    this.alertCallbacks.clear();
  }
}

// Singleton instance
export const cloudMonitoring = new CloudMonitoringService();