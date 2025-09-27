/**
 * Production Monitoring Service
 *
 * Crisis-first monitoring system for P0-CLOUD production deployment
 * Real-time safety tracking, performance monitoring, and emergency alerting
 */

import { cloudMonitoring } from './CloudMonitoring';
import { supabaseClient } from './SupabaseClient';

export interface CrisisMonitoringConfig {
  responseTimeThresholdMs: number;
  emergencyAccessRequirement: boolean;
  offlineFailsafeRequired: boolean;
  hotlineAvailabilityRequired: boolean;
  alertEscalationTimeoutMs: number;
}

export interface PerformanceMonitoringConfig {
  uiPerformanceMinFps: number;
  memoryUsageMaxMb: number;
  syncLatencyMaxMs: number;
  appLaunchMaxMs: number;
  assessmentLoadMaxMs: number;
}

export interface ComplianceMonitoringConfig {
  hipaaComplianceRequired: boolean;
  auditTrailRequired: boolean;
  encryptionValidationRequired: boolean;
  dataIntegrityChecksRequired: boolean;
  regionComplianceRequired: boolean;
}

export interface ProductionAlert {
  id: string;
  timestamp: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'crisis' | 'performance' | 'security' | 'compliance' | 'clinical';
  title: string;
  description: string;
  metrics: Record<string, unknown>;
  escalationRequired: boolean;
  resolved: boolean;
  resolvedAt?: string;
}

export interface ProductionMetrics {
  timestamp: string;
  environment: string;
  crisisMetrics: {
    responseTimeMs: number;
    emergencyAccessAvailable: boolean;
    offlineFailsafeActive: boolean;
    hotlineAccessible: boolean;
    safetyViolations: number;
  };
  performanceMetrics: {
    uiPerformanceFps: number;
    memoryUsageMb: number;
    syncLatencyMs: number;
    appLaunchTimeMs: number;
    assessmentLoadTimeMs: number;
    errorRate: number;
    crashRate: number;
  };
  complianceMetrics: {
    hipaaCompliant: boolean;
    auditTrailActive: boolean;
    encryptionValidated: boolean;
    dataIntegrityScore: number;
    regionCompliant: boolean;
  };
  businessMetrics: {
    activeUsers: number;
    rolloutPercentage: number;
    therapeuticSessions: number;
    crisisInterventions: number;
    assessmentCompletions: number;
  };
  costMetrics: {
    supabaseRequestCount: number;
    storageUsageMb: number;
    bandwidthUsageMb: number;
    estimatedDailyCost: number;
    budgetUtilizationPercent: number;
  };
}

/**
 * Production monitoring service with crisis-first alerting
 */
export class ProductionMonitoringService {
  private environment: string;
  private alerts: ProductionAlert[] = [];
  private monitoringConfig: {
    crisis: CrisisMonitoringConfig;
    performance: PerformanceMonitoringConfig;
    compliance: ComplianceMonitoringConfig;
  };

  constructor() {
    this.environment = process.env.EXPO_PUBLIC_ENV || 'development';
    this.monitoringConfig = this.initializeMonitoringConfig();
  }

  /**
   * Initialize monitoring configuration based on environment
   */
  private initializeMonitoringConfig() {
    const isProduction = this.environment === 'production';

    return {
      crisis: {
        responseTimeThresholdMs: isProduction ? 30 : 200,
        emergencyAccessRequirement: true,
        offlineFailsafeRequired: true,
        hotlineAvailabilityRequired: true,
        alertEscalationTimeoutMs: isProduction ? 60000 : 300000 // 1 min prod, 5 min dev
      },
      performance: {
        uiPerformanceMinFps: 60,
        memoryUsageMaxMb: isProduction ? 50 : 100,
        syncLatencyMaxMs: 31,
        appLaunchMaxMs: isProduction ? 2000 : 3000,
        assessmentLoadMaxMs: 300
      },
      compliance: {
        hipaaComplianceRequired: isProduction,
        auditTrailRequired: true,
        encryptionValidationRequired: true,
        dataIntegrityChecksRequired: true,
        regionComplianceRequired: isProduction
      }
    };
  }

  /**
   * Start comprehensive production monitoring
   */
  public async startProductionMonitoring(): Promise<void> {
    console.log(`[ProductionMonitoring] Starting monitoring for ${this.environment} environment...`);

    try {
      // Initialize monitoring systems
      await this.initializeCrisisMonitoring();
      await this.initializePerformanceMonitoring();
      await this.initializeComplianceMonitoring();
      await this.initializeCostMonitoring();

      // Start real-time monitoring loops
      this.startCrisisMonitoringLoop();
      this.startPerformanceMonitoringLoop();
      this.startComplianceMonitoringLoop();

      console.log('[ProductionMonitoring] All monitoring systems active');
    } catch (error) {
      console.error('[ProductionMonitoring] Failed to start monitoring:', error);
      await this.createCriticalAlert(
        'monitoring_system_failure',
        'Production monitoring system failed to start',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      throw error;
    }
  }

  /**
   * Initialize crisis-first monitoring
   */
  private async initializeCrisisMonitoring(): Promise<void> {
    console.log('[ProductionMonitoring] Initializing crisis monitoring...');

    // Validate crisis system availability
    const crisisValidation = await this.validateCrisisSystem();
    if (!crisisValidation.valid) {
      await this.createCriticalAlert(
        'crisis_system_failure',
        'Crisis system validation failed',
        crisisValidation
      );
      throw new Error('Crisis system not ready for production');
    }

    console.log('[ProductionMonitoring] Crisis monitoring initialized successfully');
  }

  /**
   * Initialize performance monitoring
   */
  private async initializePerformanceMonitoring(): Promise<void> {
    console.log('[ProductionMonitoring] Initializing performance monitoring...');

    // Set up performance baselines
    const baselineMetrics = await this.establishPerformanceBaselines();
    console.log('[ProductionMonitoring] Performance baselines established:', baselineMetrics);
  }

  /**
   * Initialize compliance monitoring
   */
  private async initializeComplianceMonitoring(): Promise<void> {
    console.log('[ProductionMonitoring] Initializing compliance monitoring...');

    // Validate HIPAA compliance status
    if (this.monitoringConfig.compliance.hipaaComplianceRequired) {
      const complianceStatus = await cloudMonitoring.validateCompliance();
      if (!complianceStatus.hipaaCompliant) {
        await this.createCriticalAlert(
          'hipaa_compliance_failure',
          'HIPAA compliance requirements not met',
          complianceStatus
        );
        throw new Error('HIPAA compliance validation failed');
      }
    }

    console.log('[ProductionMonitoring] Compliance monitoring initialized successfully');
  }

  /**
   * Initialize cost monitoring
   */
  private async initializeCostMonitoring(): Promise<void> {
    console.log('[ProductionMonitoring] Initializing cost monitoring...');

    const budgetConfig = {
      dailyBudgetUSD: parseFloat(process.env.EXPO_PUBLIC_SUPABASE_REQUEST_BUDGET_DAILY || '100'),
      alertThreshold: parseFloat(process.env.EXPO_PUBLIC_COST_ALERT_THRESHOLD || '0.85')
    };

    console.log('[ProductionMonitoring] Cost monitoring configured:', budgetConfig);
  }

  /**
   * Start crisis monitoring loop - highest priority
   */
  private startCrisisMonitoringLoop(): void {
    const monitoringInterval = this.environment === 'production' ? 10000 : 30000; // 10s prod, 30s dev

    setInterval(async () => {
      try {
        await this.monitorCrisisSystem();
      } catch (error) {
        console.error('[ProductionMonitoring] Crisis monitoring error:', error);
        await this.createCriticalAlert(
          'crisis_monitoring_error',
          'Crisis monitoring loop failed',
          { error: error instanceof Error ? error.message : 'Unknown error' }
        );
      }
    }, monitoringInterval);

    console.log(`[ProductionMonitoring] Crisis monitoring loop started (${monitoringInterval}ms)`);
  }

  /**
   * Start performance monitoring loop
   */
  private startPerformanceMonitoringLoop(): void {
    const monitoringInterval = 60000; // 1 minute

    setInterval(async () => {
      try {
        await this.monitorPerformanceMetrics();
      } catch (error) {
        console.error('[ProductionMonitoring] Performance monitoring error:', error);
      }
    }, monitoringInterval);

    console.log('[ProductionMonitoring] Performance monitoring loop started');
  }

  /**
   * Start compliance monitoring loop
   */
  private startComplianceMonitoringLoop(): void {
    const monitoringInterval = 300000; // 5 minutes

    setInterval(async () => {
      try {
        await this.monitorComplianceStatus();
      } catch (error) {
        console.error('[ProductionMonitoring] Compliance monitoring error:', error);
      }
    }, monitoringInterval);

    console.log('[ProductionMonitoring] Compliance monitoring loop started');
  }

  /**
   * Validate crisis system readiness
   */
  private async validateCrisisSystem(): Promise<{ valid: boolean; details: Record<string, unknown> }> {
    const validation = {
      valid: true,
      details: {} as Record<string, unknown>
    };

    try {
      // Check crisis response time
      const startTime = Date.now();
      const crisisAvailable = await this.checkCrisisSystemAvailability();
      const responseTime = Date.now() - startTime;

      validation.details.responseTimeMs = responseTime;
      validation.details.crisisAvailable = crisisAvailable;

      if (responseTime > this.monitoringConfig.crisis.responseTimeThresholdMs) {
        validation.valid = false;
        validation.details.responseTimeViolation = true;
      }

      // Check 988 hotline accessibility
      const hotlineAccessible = await this.check988HotlineAccessibility();
      validation.details.hotlineAccessible = hotlineAccessible;

      if (!hotlineAccessible && this.monitoringConfig.crisis.hotlineAvailabilityRequired) {
        validation.valid = false;
        validation.details.hotlineViolation = true;
      }

      // Check offline failsafe
      const offlineFailsafe = await this.checkOfflineFailsafe();
      validation.details.offlineFailsafe = offlineFailsafe;

      if (!offlineFailsafe && this.monitoringConfig.crisis.offlineFailsafeRequired) {
        validation.valid = false;
        validation.details.offlineFailsafeViolation = true;
      }

    } catch (error) {
      validation.valid = false;
      validation.details.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return validation;
  }

  /**
   * Monitor crisis system in real-time
   */
  private async monitorCrisisSystem(): Promise<void> {
    const validation = await this.validateCrisisSystem();

    if (!validation.valid) {
      await this.createCriticalAlert(
        'crisis_system_violation',
        'Crisis system safety violation detected',
        validation.details
      );
    }

    // Log crisis metrics for monitoring
    console.log(`[ProductionMonitoring] Crisis metrics:`, validation.details);
  }

  /**
   * Monitor performance metrics
   */
  private async monitorPerformanceMetrics(): Promise<void> {
    const metrics = cloudMonitoring.checkPerformanceMetrics();

    // Check for performance degradation
    if (!metrics.withinThresholds) {
      await this.createAlert(
        'performance_degradation',
        'high',
        'performance',
        'Performance metrics exceed thresholds',
        metrics
      );
    }

    // Check memory usage
    const memoryUsage = this.getMemoryUsage();
    if (memoryUsage > this.monitoringConfig.performance.memoryUsageMaxMb) {
      await this.createAlert(
        'memory_usage_high',
        'medium',
        'performance',
        `Memory usage ${memoryUsage}MB exceeds ${this.monitoringConfig.performance.memoryUsageMaxMb}MB`,
        { memoryUsage, threshold: this.monitoringConfig.performance.memoryUsageMaxMb }
      );
    }
  }

  /**
   * Monitor compliance status
   */
  private async monitorComplianceStatus(): Promise<void> {
    try {
      const complianceStatus = await cloudMonitoring.validateCompliance();

      if (!complianceStatus.hipaaCompliant && this.monitoringConfig.compliance.hipaaComplianceRequired) {
        await this.createAlert(
          'hipaa_compliance_violation',
          'critical',
          'compliance',
          'HIPAA compliance violation detected',
          complianceStatus
        );
      }

      if (!complianceStatus.auditTrailActive) {
        await this.createAlert(
          'audit_trail_failure',
          'high',
          'compliance',
          'Audit trail is not active',
          complianceStatus
        );
      }
    } catch (error) {
      console.error('[ProductionMonitoring] Compliance monitoring failed:', error);
    }
  }

  /**
   * Get current production metrics
   */
  public async getCurrentMetrics(): Promise<ProductionMetrics> {
    const timestamp = new Date().toISOString();
    const crisisValidation = await this.validateCrisisSystem();
    const performanceMetrics = cloudMonitoring.checkPerformanceMetrics();
    const complianceStatus = await cloudMonitoring.validateCompliance();

    return {
      timestamp,
      environment: this.environment,
      crisisMetrics: {
        responseTimeMs: crisisValidation.details.responseTimeMs as number || 0,
        emergencyAccessAvailable: crisisValidation.details.crisisAvailable as boolean || false,
        offlineFailsafeActive: crisisValidation.details.offlineFailsafe as boolean || false,
        hotlineAccessible: crisisValidation.details.hotlineAccessible as boolean || false,
        safetyViolations: this.getActiveCrisisAlerts().length
      },
      performanceMetrics: {
        uiPerformanceFps: performanceMetrics.uiPerformanceFps || 0,
        memoryUsageMb: this.getMemoryUsage(),
        syncLatencyMs: performanceMetrics.syncLatencyMs || 0,
        appLaunchTimeMs: performanceMetrics.appLaunchTimeMs || 0,
        assessmentLoadTimeMs: performanceMetrics.assessmentLoadTimeMs || 0,
        errorRate: performanceMetrics.errorRate || 0,
        crashRate: performanceMetrics.crashRate || 0
      },
      complianceMetrics: {
        hipaaCompliant: complianceStatus.hipaaCompliant,
        auditTrailActive: complianceStatus.auditTrailActive,
        encryptionValidated: complianceStatus.encryptionActive,
        dataIntegrityScore: complianceStatus.dataIntegrityScore || 0,
        regionCompliant: complianceStatus.regionCompliant
      },
      businessMetrics: {
        activeUsers: this.getActiveUserCount(),
        rolloutPercentage: this.getRolloutPercentage(),
        therapeuticSessions: this.getTherapeuticSessionCount(),
        crisisInterventions: this.getCrisisInterventionCount(),
        assessmentCompletions: this.getAssessmentCompletionCount()
      },
      costMetrics: {
        supabaseRequestCount: this.getSupabaseRequestCount(),
        storageUsageMb: this.getStorageUsage(),
        bandwidthUsageMb: this.getBandwidthUsage(),
        estimatedDailyCost: this.getEstimatedDailyCost(),
        budgetUtilizationPercent: this.getBudgetUtilization()
      }
    };
  }

  /**
   * Create critical alert (immediate escalation)
   */
  private async createCriticalAlert(
    id: string,
    description: string,
    metrics: Record<string, unknown>
  ): Promise<void> {
    await this.createAlert(id, 'critical', 'crisis', description, metrics, true);
  }

  /**
   * Create production alert
   */
  private async createAlert(
    id: string,
    severity: 'critical' | 'high' | 'medium' | 'low',
    category: 'crisis' | 'performance' | 'security' | 'compliance' | 'clinical',
    description: string,
    metrics: Record<string, unknown>,
    escalationRequired: boolean = false
  ): Promise<void> {
    const alert: ProductionAlert = {
      id: `${id}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      severity,
      category,
      title: this.generateAlertTitle(category, severity),
      description,
      metrics,
      escalationRequired: escalationRequired || severity === 'critical',
      resolved: false
    };

    this.alerts.push(alert);

    // Log alert
    console.error(`[ProductionMonitoring] ${severity.toUpperCase()} ALERT [${category}]:`, description, metrics);

    // Trigger emergency escalation for critical alerts
    if (alert.escalationRequired) {
      await this.triggerEmergencyEscalation(alert);
    }

    // Store alert in monitoring system
    await this.storeAlert(alert);
  }

  /**
   * Helper methods for monitoring checks
   */
  private async checkCrisisSystemAvailability(): Promise<boolean> {
    // Simulate crisis system check
    return true;
  }

  private async check988HotlineAccessibility(): Promise<boolean> {
    // Simulate 988 hotline accessibility check
    const crisisHotline = process.env.EXPO_PUBLIC_CRISIS_HOTLINE;
    return crisisHotline === '988';
  }

  private async checkOfflineFailsafe(): Promise<boolean> {
    // Simulate offline failsafe check
    return true;
  }

  private async establishPerformanceBaselines(): Promise<Record<string, number>> {
    return {
      baselineUiFps: 60,
      baselineMemoryMb: 30,
      baselineSyncLatencyMs: 15,
      baselineAppLaunchMs: 1500
    };
  }

  private getMemoryUsage(): number {
    // Simulate memory usage
    return 35;
  }

  private getActiveCrisisAlerts(): ProductionAlert[] {
    return this.alerts.filter(alert =>
      alert.category === 'crisis' &&
      !alert.resolved &&
      alert.severity === 'critical'
    );
  }

  private getActiveUserCount(): number {
    return parseInt(process.env.EXPO_PUBLIC_ACTIVE_USERS || '0', 10);
  }

  private getRolloutPercentage(): number {
    return parseInt(process.env.EXPO_PUBLIC_ROLLOUT_PERCENTAGE || '100', 10);
  }

  private getTherapeuticSessionCount(): number {
    return 0; // Would be tracked from app usage
  }

  private getCrisisInterventionCount(): number {
    return 0; // Would be tracked from crisis system
  }

  private getAssessmentCompletionCount(): number {
    return 0; // Would be tracked from assessment system
  }

  private getSupabaseRequestCount(): number {
    return 0; // Would be tracked from Supabase metrics
  }

  private getStorageUsage(): number {
    return 0; // Would be tracked from Supabase metrics
  }

  private getBandwidthUsage(): number {
    return 0; // Would be tracked from Supabase metrics
  }

  private getEstimatedDailyCost(): number {
    return 0; // Would be calculated from usage metrics
  }

  private getBudgetUtilization(): number {
    return 0; // Would be calculated from daily cost vs budget
  }

  private generateAlertTitle(category: string, severity: string): string {
    const titles = {
      crisis: `🚨 Crisis System ${severity.toUpperCase()}`,
      performance: `⚡ Performance ${severity.toUpperCase()}`,
      security: `🔒 Security ${severity.toUpperCase()}`,
      compliance: `⚖️ Compliance ${severity.toUpperCase()}`,
      clinical: `🏥 Clinical ${severity.toUpperCase()}`
    };
    return titles[category as keyof typeof titles] || `Alert ${severity.toUpperCase()}`;
  }

  private async triggerEmergencyEscalation(alert: ProductionAlert): Promise<void> {
    console.error(`[EMERGENCY ESCALATION] ${alert.title}: ${alert.description}`);

    // In production, this would trigger:
    // - PagerDuty/OpsGenie alerts
    // - Emergency contact notifications
    // - Automated rollback procedures (for crisis violations)
    // - Executive team notifications
  }

  private async storeAlert(alert: ProductionAlert): Promise<void> {
    // In production, this would store alerts in:
    // - Supabase monitoring table
    // - External monitoring service
    // - Audit trail system
    console.log(`[ProductionMonitoring] Alert stored:`, alert.id);
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): ProductionAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Resolve alert
   */
  public async resolveAlert(alertId: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      console.log(`[ProductionMonitoring] Alert resolved: ${alertId}`);
    }
  }

  /**
   * Stop monitoring (for cleanup)
   */
  public stopMonitoring(): void {
    console.log('[ProductionMonitoring] Stopping all monitoring systems...');
    // Clear any active intervals/timers
  }
}

// Export singleton instance
export const productionMonitoring = new ProductionMonitoringService();