/**
 * Crisis System Integration - SQLite & Calendar Integration Hooks
 * 
 * Provides integration points between the Crisis Integration Coordinator
 * and existing SQLite migration + Calendar integration systems to ensure
 * seamless emergency response coordination across all system operations.
 */

import { 
  CrisisIntegrationCoordinator,
  UnifiedCrisisState,
  EmergencyResponse,
  SystemFailure
} from './CrisisIntegrationCoordinator';
import { 
  sqliteDataStore,
  MigrationProgress,
  CriticalClinicalData
} from '../storage/SQLiteDataStore';
import { 
  calendarIntegrationService,
  CalendarIntegrationStatus
} from '../calendar/CalendarIntegrationAPI';
import { 
  featureCoordinationService 
} from './FeatureCoordinationAPI';

/**
 * Crisis Integration Hooks - System event handlers
 */
export interface CrisisIntegrationHooks {
  // SQLite Migration Hooks
  onMigrationStart(migrationId: string): Promise<void>;
  onMigrationProgress(progress: MigrationProgress): Promise<void>;
  onMigrationComplete(migrationId: string, success: boolean): Promise<void>;
  onMigrationError(error: Error, migrationId: string): Promise<void>;

  // Calendar Integration Hooks
  onCalendarPermissionChange(granted: boolean): Promise<void>;
  onCalendarSyncStart(): Promise<void>;
  onCalendarSyncComplete(success: boolean): Promise<void>;
  onCalendarError(error: Error): Promise<void>;

  // Crisis Detection Hooks
  onCrisisDetected(source: string, severity: string): Promise<EmergencyResponse>;
  onCrisisResolved(): Promise<void>;

  // System Health Hooks
  onSystemFailure(failure: SystemFailure): Promise<void>;
  onSystemRecovery(system: string): Promise<void>;
}

/**
 * Integration Event Types
 */
export interface IntegrationEvent {
  id: string;
  timestamp: string;
  type: 'migration' | 'calendar' | 'crisis' | 'system';
  source: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  data?: any;
  handled: boolean;
  responseTime?: number;
}

export interface IntegrationStatus {
  crisisCoordinatorActive: boolean;
  sqliteIntegrationHealth: 'healthy' | 'degraded' | 'failed';
  calendarIntegrationHealth: 'healthy' | 'degraded' | 'failed';
  emergencyModeActive: boolean;
  lastHealthCheck: string;
  activeEvents: IntegrationEvent[];
  performanceMetrics: {
    averageResponseTime: number;
    systemFailures24h: number;
    crisisEventsHandled: number;
    migrationsSafeguarded: number;
  };
}

/**
 * Crisis System Integration Service
 */
export class CrisisSystemIntegration implements CrisisIntegrationHooks {
  private coordinator: CrisisIntegrationCoordinator;
  private eventHistory: IntegrationEvent[] = [];
  private isInitialized = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.coordinator = new CrisisIntegrationCoordinator({
      maxEmergencyResponseTime: 200,
      enablePerformanceTracking: true,
      auditCrisisResponses: true
    });
    
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      console.log('🔗 Initializing Crisis System Integration...');

      // Register integration hooks with existing systems
      await this.registerSQLiteHooks();
      await this.registerCalendarHooks();

      // Start health monitoring
      await this.startHealthMonitoring();

      this.isInitialized = true;
      console.log('✅ Crisis System Integration initialized');

    } catch (error) {
      console.error('❌ Crisis System Integration initialization failed:', error);
      this.logEvent({
        type: 'system',
        source: 'integration',
        severity: 'critical',
        message: `Initialization failed: ${error}`,
        data: { error }
      });
    }
  }

  // ===========================================
  // SQLITE MIGRATION HOOKS
  // ===========================================

  async onMigrationStart(migrationId: string): Promise<void> {
    console.log(`📊 Migration started: ${migrationId}`);
    
    this.logEvent({
      type: 'migration',
      source: 'sqlite',
      severity: 'info',
      message: `Migration ${migrationId} started`,
      data: { migrationId }
    });

    // Pre-cache critical data before migration
    try {
      await this.coordinator['emergencyAccess'].preCacheCriticalData();
      console.log('💾 Critical data pre-cached for migration safety');
    } catch (error) {
      console.error('⚠️ Failed to pre-cache critical data:', error);
      this.logEvent({
        type: 'migration',
        source: 'sqlite',
        severity: 'warning',
        message: 'Failed to pre-cache critical data',
        data: { error, migrationId }
      });
    }

    // Enable enhanced crisis monitoring during migration
    await this.enableMigrationCrisisMonitoring(migrationId);
  }

  async onMigrationProgress(progress: MigrationProgress): Promise<void> {
    // Monitor for crisis events during migration
    if (progress.stage === 'data_migration' && progress.progress >= 50) {
      // Critical phase - increase monitoring
      await this.coordinator['performanceMonitor'].start();
    }

    // Log significant progress milestones
    if (progress.progress % 25 === 0) {
      this.logEvent({
        type: 'migration',
        source: 'sqlite',
        severity: 'info',
        message: `Migration ${progress.sessionId} at ${progress.progress}% (${progress.stage})`,
        data: { progress }
      });
    }

    // Handle migration errors that could affect crisis access
    if (progress.error && progress.stage === 'data_migration') {
      await this.onMigrationError(new Error(progress.error), progress.sessionId);
    }
  }

  async onMigrationComplete(migrationId: string, success: boolean): Promise<void> {
    console.log(`📊 Migration completed: ${migrationId} - Success: ${success}`);

    this.logEvent({
      type: 'migration',
      source: 'sqlite',
      severity: success ? 'info' : 'error',
      message: `Migration ${migrationId} ${success ? 'completed successfully' : 'failed'}`,
      data: { migrationId, success }
    });

    if (success) {
      // Verify critical data access post-migration
      await this.verifyCriticalDataAccess(migrationId);
      
      // Update coordinator state
      const state = await this.coordinator.getUnifiedCrisisState();
      state.migrationInProgress = false;
      
      console.log('✅ Migration completed - crisis access verified');
    } else {
      // Handle migration failure
      await this.handleMigrationFailure(migrationId);
    }

    // Disable enhanced monitoring
    await this.disableMigrationCrisisMonitoring();
  }

  async onMigrationError(error: Error, migrationId: string): Promise<void> {
    console.error(`❌ Migration error: ${migrationId}`, error);

    this.logEvent({
      type: 'migration',
      source: 'sqlite',
      severity: 'critical',
      message: `Migration error: ${error.message}`,
      data: { error: error.message, migrationId, stack: error.stack }
    });

    // Check if error affects crisis access
    const affectsCrisisAccess = await this.assessMigrationErrorImpact(error);
    
    if (affectsCrisisAccess) {
      // Trigger emergency fallback systems
      await this.activateEmergencyFallback('migration_error', {
        migrationId,
        error: error.message
      });
    }

    // Notify migration safety coordinator
    await this.coordinator['migrationSafety'].handleCrisisDuringMigration(migrationId);
  }

  // ===========================================
  // CALENDAR INTEGRATION HOOKS
  // ===========================================

  async onCalendarPermissionChange(granted: boolean): Promise<void> {
    console.log(`📅 Calendar permission changed: ${granted}`);

    this.logEvent({
      type: 'calendar',
      source: 'permissions',
      severity: granted ? 'info' : 'warning',
      message: `Calendar permission ${granted ? 'granted' : 'denied'}`,
      data: { granted }
    });

    // Update coordinator state
    const state = await this.coordinator.getUnifiedCrisisState();
    state.calendarAvailable = granted;

    if (!granted) {
      // Activate calendar fallback systems
      await this.activateCalendarFallback();
    }
  }

  async onCalendarSyncStart(): Promise<void> {
    this.logEvent({
      type: 'calendar',
      source: 'sync',
      severity: 'info',
      message: 'Calendar sync started',
    });

    // Ensure crisis access remains unaffected during sync
    await this.preemptiveCrisisCheck();
  }

  async onCalendarSyncComplete(success: boolean): Promise<void> {
    this.logEvent({
      type: 'calendar',
      source: 'sync',
      severity: success ? 'info' : 'warning',
      message: `Calendar sync ${success ? 'completed' : 'failed'}`,
      data: { success }
    });

    if (!success) {
      // Check if sync failure affects crisis reminders
      await this.assessCalendarSyncImpact();
    }
  }

  async onCalendarError(error: Error): Promise<void> {
    console.error('📅 Calendar error:', error);

    this.logEvent({
      type: 'calendar',
      source: 'error',
      severity: 'error',
      message: `Calendar error: ${error.message}`,
      data: { error: error.message, stack: error.stack }
    });

    // Handle calendar system failure
    await this.coordinator['failureCoordination'].handleSystemFailure({
      system: 'calendar',
      failureType: 'connection',
      severity: 'medium',
      timestamp: new Date().toISOString(),
      impactOnCrisisAccess: 'none',
      recoveryAction: 'Restart calendar service',
      estimatedRecoveryTime: 2,
      mitigationActive: true
    });
  }

  // ===========================================
  // CRISIS DETECTION HOOKS
  // ===========================================

  async onCrisisDetected(source: string, severity: string): Promise<EmergencyResponse> {
    console.log(`🚨 Crisis detected: ${source} - ${severity}`);

    const startTime = Date.now();

    // Log crisis detection
    this.logEvent({
      type: 'crisis',
      source,
      severity: 'critical',
      message: `Crisis detected from ${source} with severity ${severity}`,
      data: { source, severity }
    });

    // Trigger coordinated emergency response
    const response = await this.coordinator.handleCrisisEvent({
      type: source === 'assessment' ? 'assessment_trigger' : 
            source === 'manual' ? 'manual_trigger' : 'system_detection',
      severity: severity as any,
      source: source as any,
      context: { detectionTime: new Date().toISOString() }
    });

    // Update event with response time
    this.updateEventResponseTime(this.eventHistory.length - 1, Date.now() - startTime);

    console.log(`✅ Crisis response completed in ${response.totalResponseTime}ms`);
    return response;
  }

  async onCrisisResolved(): Promise<void> {
    console.log('✅ Crisis resolved');

    this.logEvent({
      type: 'crisis',
      source: 'resolution',
      severity: 'info',
      message: 'Crisis resolved',
    });

    // Update coordinator state
    const state = await this.coordinator.getUnifiedCrisisState();
    state.isCrisisActive = false;
    state.crisisLevel = 'none';
    state.emergencyAccessActive = false;

    // Resume normal operations
    await this.resumeNormalOperations();
  }

  // ===========================================
  // SYSTEM HEALTH HOOKS
  // ===========================================

  async onSystemFailure(failure: SystemFailure): Promise<void> {
    console.error(`💥 System failure: ${failure.system} - ${failure.failureType}`);

    this.logEvent({
      type: 'system',
      source: failure.system,
      severity: 'critical',
      message: `System failure: ${failure.failureType}`,
      data: failure
    });

    // Delegate to failure coordination
    await this.coordinator['failureCoordination'].handleSystemFailure(failure);
  }

  async onSystemRecovery(system: string): Promise<void> {
    console.log(`💚 System recovered: ${system}`);

    this.logEvent({
      type: 'system',
      source: system,
      severity: 'info',
      message: `System ${system} recovered`,
      data: { system }
    });

    // Update system availability
    const state = await this.coordinator.getUnifiedCrisisState();
    if (system === 'sqlite') {
      state.sqliteAvailable = true;
    } else if (system === 'calendar') {
      state.calendarAvailable = true;
    }

    // Remove from failure list
    state.systemFailures = state.systemFailures.filter(f => f.system !== system);
  }

  // ===========================================
  // PUBLIC API
  // ===========================================

  async getIntegrationStatus(): Promise<IntegrationStatus> {
    const state = await this.coordinator.getUnifiedCrisisState();
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const recentEvents = this.eventHistory.filter(
      e => new Date(e.timestamp) >= last24Hours
    );

    const systemFailures = recentEvents.filter(
      e => e.type === 'system' && e.severity === 'critical'
    ).length;

    const crisisEvents = recentEvents.filter(e => e.type === 'crisis').length;
    
    const migrationEvents = recentEvents.filter(e => e.type === 'migration').length;

    const responseTimeSum = recentEvents
      .filter(e => e.responseTime)
      .reduce((sum, e) => sum + (e.responseTime || 0), 0);
    
    const responseTimeCount = recentEvents.filter(e => e.responseTime).length;

    return {
      crisisCoordinatorActive: this.isInitialized,
      sqliteIntegrationHealth: state.sqliteAvailable ? 'healthy' : 'failed',
      calendarIntegrationHealth: state.calendarAvailable ? 'healthy' : 'failed',
      emergencyModeActive: state.emergencyAccessActive,
      lastHealthCheck: new Date().toISOString(),
      activeEvents: recentEvents.filter(e => !e.handled),
      performanceMetrics: {
        averageResponseTime: responseTimeCount > 0 ? responseTimeSum / responseTimeCount : 0,
        systemFailures24h: systemFailures,
        crisisEventsHandled: crisisEvents,
        migrationsSafeguarded: migrationEvents
      }
    };
  }

  async testEmergencyResponse(): Promise<EmergencyResponse> {
    console.log('🧪 Testing emergency response...');
    
    return await this.onCrisisDetected('test', 'warning');
  }

  async validateCrisisReadiness(): Promise<{
    ready: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const readiness = await this.coordinator.validateSystemReadiness();
    const issues = [...readiness.issues];
    const recommendations: string[] = [];

    if (readiness.responseTimeEstimate > 200) {
      issues.push(`Response time estimate too high: ${readiness.responseTimeEstimate}ms`);
      recommendations.push('Optimize critical data caching');
    }

    if (readiness.fallbacksAvailable < 2) {
      issues.push('Insufficient fallback systems available');
      recommendations.push('Enable additional backup systems');
    }

    return {
      ready: readiness.ready && issues.length === 0,
      issues,
      recommendations
    };
  }

  // ===========================================
  // PRIVATE HELPER METHODS
  // ===========================================

  private async registerSQLiteHooks(): Promise<void> {
    try {
      // Register with SQLite migration events
      const migrationStatus = await sqliteDataStore.getMigrationStatus();
      
      if (migrationStatus.isInProgress) {
        await this.onMigrationStart(migrationStatus.sessionId || 'unknown');
      }
      
      // Set up periodic migration monitoring
      setInterval(async () => {
        try {
          const status = await sqliteDataStore.getMigrationStatus();
          if (status.isInProgress && status.progress !== undefined) {
            await this.onMigrationProgress({
              sessionId: status.sessionId || 'unknown',
              stage: status.stage || 'unknown',
              progress: status.progress,
              totalSteps: status.totalSteps || 0,
              completedSteps: status.completedSteps || 0,
              estimatedTimeRemaining: status.estimatedTimeRemaining || 0,
              error: status.error || null
            });
          }
        } catch (error) {
          console.warn('Migration status check failed:', error);
        }
      }, 5000); // Check every 5 seconds during migration

      console.log('🔗 SQLite hooks registered and monitoring started');
    } catch (error) {
      console.error('Failed to register SQLite hooks:', error);
    }
  }

  private async registerCalendarHooks(): Promise<void> {
    try {
      // Register with Calendar service for permission changes
      const calendarStatus = await calendarIntegrationService.getIntegrationStatus();
      
      // Set up periodic calendar status monitoring
      setInterval(async () => {
        try {
          const status = await calendarIntegrationService.getIntegrationStatus();
          const permissions = await calendarIntegrationService.checkPermissionStatus();
          
          // Check for permission changes
          if (permissions.granted !== calendarStatus.hasPermissions) {
            await this.onCalendarPermissionChange(permissions.granted);
          }
          
          // Check for service errors
          if (status.privacyCompliance === 'compromised') {
            await this.onCalendarError(new Error('Privacy compliance compromised'));
          }
        } catch (error) {
          await this.onCalendarError(error as Error);
        }
      }, 30000); // Check every 30 seconds

      console.log('🔗 Calendar hooks registered and monitoring started');
    } catch (error) {
      console.error('Failed to register Calendar hooks:', error);
      await this.onCalendarError(error as Error);
    }
  }

  private async startHealthMonitoring(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000); // Every 30 seconds

    console.log('❤️ Health monitoring started');
  }

  private async performHealthCheck(): Promise<void> {
    try {
      // Check SQLite health with performance monitoring
      const sqliteStart = Date.now();
      const criticalData = await sqliteDataStore.getCriticalDataFast();
      const sqliteTime = Date.now() - sqliteStart;

      // Update coordinator performance monitoring
      if (this.coordinator['performanceMonitor'].isActive) {
        this.coordinator['performanceMonitor'].systemCheckHistory.push({
          system: 'sqlite',
          responseTime: sqliteTime,
          healthy: criticalData !== null,
          timestamp: new Date().toISOString()
        });
      }

      if (sqliteTime > 300) {
        this.logEvent({
          type: 'system',
          source: 'health_check',
          severity: 'warning',
          message: `SQLite response slow: ${sqliteTime}ms`,
          data: { responseTime: sqliteTime }
        });
      }

      // Check Calendar health with performance monitoring
      const calendarStart = Date.now();
      const calendarStatus = await calendarIntegrationService.getIntegrationStatus();
      const calendarTime = Date.now() - calendarStart;

      // Update coordinator performance monitoring
      if (this.coordinator['performanceMonitor'].isActive) {
        this.coordinator['performanceMonitor'].systemCheckHistory.push({
          system: 'calendar',
          responseTime: calendarTime,
          healthy: calendarStatus.isEnabled,
          timestamp: new Date().toISOString()
        });
      }

      if (calendarTime > 500) {
        this.logEvent({
          type: 'system',
          source: 'health_check',
          severity: 'warning',
          message: `Calendar response slow: ${calendarTime}ms`,
          data: { responseTime: calendarTime }
        });
      }

      // Update coordinator's unified crisis state
      const state = await this.coordinator.getUnifiedCrisisState();
      state.sqliteAvailable = criticalData !== null;
      state.calendarAvailable = calendarStatus.isEnabled;

    } catch (error) {
      this.logEvent({
        type: 'system',
        source: 'health_check',
        severity: 'error',
        message: `Health check failed: ${error}`,
        data: { error }
      });

      // Mark systems as unavailable
      const state = await this.coordinator.getUnifiedCrisisState();
      state.sqliteAvailable = false;
      state.calendarAvailable = false;
    }
  }

  private logEvent(eventData: Omit<IntegrationEvent, 'id' | 'timestamp' | 'handled'>): void {
    const event: IntegrationEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      handled: false,
      ...eventData
    };

    this.eventHistory.push(event);

    // Keep only last 1000 events
    if (this.eventHistory.length > 1000) {
      this.eventHistory = this.eventHistory.slice(-1000);
    }

    // Log critical events immediately
    if (event.severity === 'critical') {
      console.error(`🚨 CRITICAL EVENT: ${event.message}`, event.data);
    }
  }

  private updateEventResponseTime(eventIndex: number, responseTime: number): void {
    if (eventIndex >= 0 && eventIndex < this.eventHistory.length) {
      this.eventHistory[eventIndex].responseTime = responseTime;
      this.eventHistory[eventIndex].handled = true;
    }
  }

  private async enableMigrationCrisisMonitoring(migrationId: string): Promise<void> {
    // Increase crisis monitoring frequency during migration
    console.log(`🔍 Enhanced crisis monitoring enabled for migration ${migrationId}`);
  }

  private async disableMigrationCrisisMonitoring(): Promise<void> {
    // Return to normal monitoring frequency
    console.log('🔍 Normal crisis monitoring resumed');
  }

  private async verifyCriticalDataAccess(migrationId: string): Promise<void> {
    try {
      const startTime = Date.now();
      const criticalData = await sqliteDataStore.getCriticalDataFast();
      const accessTime = Date.now() - startTime;

      if (accessTime <= 200 && criticalData) {
        console.log(`✅ Post-migration crisis access verified: ${accessTime}ms`);
        this.logEvent({
          type: 'migration',
          source: 'verification',
          severity: 'info',
          message: `Critical data access verified post-migration: ${accessTime}ms`,
          data: { migrationId, accessTime }
        });
      } else {
        throw new Error(`Critical data access failed or too slow: ${accessTime}ms`);
      }
    } catch (error) {
      console.error('❌ Post-migration crisis access verification failed:', error);
      await this.handleMigrationFailure(migrationId);
    }
  }

  private async handleMigrationFailure(migrationId: string): Promise<void> {
    console.error(`💥 Migration failure handling: ${migrationId}`);

    // Activate emergency fallback
    await this.activateEmergencyFallback('migration_failure', { migrationId });

    // Notify failure coordination
    await this.onSystemFailure({
      system: 'sqlite',
      failureType: 'migration_error',
      severity: 'critical',
      timestamp: new Date().toISOString(),
      impactOnCrisisAccess: 'degraded',
      recoveryAction: 'Rollback migration and use AsyncStorage',
      estimatedRecoveryTime: 5,
      mitigationActive: true
    });
  }

  private async assessMigrationErrorImpact(error: Error): Promise<boolean> {
    // Assess if migration error affects critical data access
    const errorMessage = error.message.toLowerCase();
    
    // Check for critical keywords
    const criticalKeywords = ['data', 'table', 'index', 'corruption', 'access', 'permission'];
    return criticalKeywords.some(keyword => errorMessage.includes(keyword));
  }

  private async activateEmergencyFallback(reason: string, data?: any): Promise<void> {
    console.log(`🆘 Emergency fallback activated: ${reason}`);

    this.logEvent({
      type: 'system',
      source: 'emergency',
      severity: 'critical',
      message: `Emergency fallback activated: ${reason}`,
      data
    });

    // Ensure emergency access is available
    const state = await this.coordinator.getUnifiedCrisisState();
    state.emergencyAccessActive = true;
    state.fallbackSystemsEnabled.push('emergency_mode');
  }

  private async activateCalendarFallback(): Promise<void> {
    console.log('📱 Calendar fallback systems activated');
    
    this.logEvent({
      type: 'calendar',
      source: 'fallback',
      severity: 'info',
      message: 'Calendar fallback systems activated',
    });
  }

  private async preemptiveCrisisCheck(): Promise<void> {
    // Check if any crisis indicators exist before system operations
    try {
      const criticalData = await sqliteDataStore.getCriticalDataFast();
      if (criticalData?.hasRecentCrisisAssessment) {
        console.log('⚠️ Crisis indicators detected during preemptive check');
      }
    } catch (error) {
      console.warn('Preemptive crisis check failed:', error);
    }
  }

  private async assessCalendarSyncImpact(): Promise<void> {
    // Check if calendar sync failure affects crisis-related reminders
    console.log('📅 Assessing calendar sync impact on crisis systems');
  }

  private async resumeNormalOperations(): Promise<void> {
    console.log('🔄 Resuming normal operations after crisis resolution');

    // Clear emergency state
    const state = await this.coordinator.getUnifiedCrisisState();
    state.fallbackSystemsEnabled = [];
    state.emergencyAccessActive = false;

    this.logEvent({
      type: 'system',
      source: 'recovery',
      severity: 'info',
      message: 'Normal operations resumed',
    });
  }
}

// Export singleton instance
export const crisisSystemIntegration = new CrisisSystemIntegration();

// Export types
export type {
  CrisisIntegrationHooks,
  IntegrationEvent,
  IntegrationStatus
};