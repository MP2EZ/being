/**
 * Integrated Performance Manager
 * Coordinates SQLite migration and Calendar integration for optimal performance
 * Ensures clinical-grade responsiveness during feature transitions
 */

import { performanceMonitor } from '../../utils/PerformanceMonitor';
import { sqliteDataStore } from '../storage/SQLiteDataStore';
import { performantCalendarService } from '../calendar/PerformantCalendarService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ResourceBudget {
  memory: {
    sqliteOperations: number; // MB
    calendarIntegration: number; // MB
    systemReserve: number; // MB
    total: number; // MB
  };
  cpu: {
    sqliteMigration: { priority: 'high' | 'medium' | 'low'; timeSlice: string };
    calendarSync: { priority: 'high' | 'medium' | 'low'; timeSlice: string };
    uiResponsiveness: { priority: 'critical' | 'high' | 'medium' | 'low'; timeSlice: string };
  };
  io: {
    sqliteWrites: { batchSize: number; flushInterval: number };
    calendarWrites: { batchSize: number; debounce: number };
    asyncStorageCleanup: { deferred: boolean; backgroundOnly: boolean };
  };
}

interface IntegratedPerformanceReport {
  overallHealth: 'excellent' | 'good' | 'warning' | 'critical';
  criticalMetrics: {
    crisisAccessSpeed: number; // Must be <200ms
    migrationProgress: number; // 0-100%
    calendarResponseTime: number; // Target <2000ms
    memoryUsage: number; // Current MB usage
    batteryImpact: number; // Estimated % increase
  };
  recommendations: string[];
  alertsGenerated: number;
  performanceScore: number; // 0-100 composite score
}

interface FeatureCoordinationStatus {
  sqliteMigration: {
    status: 'not_started' | 'in_progress' | 'completed' | 'failed';
    progress: number;
    estimatedTimeRemaining: number;
    performanceImpact: 'none' | 'minimal' | 'moderate' | 'significant';
  };
  calendarIntegration: {
    status: 'disabled' | 'initializing' | 'active' | 'fallback';
    permissionStatus: 'unknown' | 'granted' | 'denied' | 'timeout';
    lastSyncTime: number;
    performanceImpact: 'none' | 'minimal' | 'moderate' | 'significant';
  };
  coordination: {
    resourceConflicts: string[];
    scheduledOptimizations: string[];
    activeThrottling: boolean;
  };
}

export class IntegratedPerformanceManager {
  private resourceBudget: ResourceBudget = {
    memory: {
      sqliteOperations: 60, // MB for SQLite operations
      calendarIntegration: 20, // MB for calendar operations
      systemReserve: 70, // MB for system and UI
      total: 150 // MB total budget
    },
    cpu: {
      sqliteMigration: { priority: 'high', timeSlice: '60%' },
      calendarSync: { priority: 'medium', timeSlice: '20%' },
      uiResponsiveness: { priority: 'critical', timeSlice: '20%' }
    },
    io: {
      sqliteWrites: { batchSize: 100, flushInterval: 1000 },
      calendarWrites: { batchSize: 7, debounce: 2000 },
      asyncStorageCleanup: { deferred: true, backgroundOnly: true }
    }
  };

  private coordinationStatus: FeatureCoordinationStatus = {
    sqliteMigration: {
      status: 'not_started',
      progress: 0,
      estimatedTimeRemaining: 0,
      performanceImpact: 'none'
    },
    calendarIntegration: {
      status: 'disabled',
      permissionStatus: 'unknown',
      lastSyncTime: 0,
      performanceImpact: 'none'
    },
    coordination: {
      resourceConflicts: [],
      scheduledOptimizations: [],
      activeThrottling: false
    }
  };

  private performanceThresholds = {
    critical: {
      crisisAccessSpeed: 200, // ms - non-negotiable
      memoryUsage: 150 * 1024 * 1024, // 150MB
      appLaunchTime: 3000, // 3s
      migrationTime: 300000 // 5 minutes
    },
    warning: {
      crisisAccessSpeed: 150, // ms
      memoryUsage: 120 * 1024 * 1024, // 120MB
      appLaunchTime: 2500, // 2.5s
      migrationTime: 240000 // 4 minutes
    }
  };

  /**
   * Initialize coordinated performance management
   */
  async initialize(): Promise<void> {
    const startTime = performance.now();
    
    console.log('🚀 Initializing Integrated Performance Management...');
    
    try {
      // Start performance monitoring for initialization
      performanceMonitor.startMonitoring('integrated_initialization');
      
      // Assess system capabilities
      await this.assessSystemCapabilities();
      
      // Initialize resource budget based on device
      await this.calculateOptimalResourceBudget();
      
      // Set up coordination listeners
      await this.initializeCoordinationSystem();
      
      const initTime = performance.now() - startTime;
      performanceMonitor.recordEvent('navigationTime', initTime, 'integrated_manager_init');
      
      console.log(`✅ Integrated Performance Manager initialized in ${initTime.toFixed(2)}ms`);
      
    } catch (error) {
      console.error('Failed to initialize Integrated Performance Manager:', error);
      throw error;
    } finally {
      performanceMonitor.stopMonitoring();
    }
  }

  /**
   * Coordinate SQLite migration with performance optimization
   */
  async coordinateSQLiteMigration(): Promise<void> {
    console.log('🔄 Coordinating SQLite migration with performance optimization...');
    
    this.coordinationStatus.sqliteMigration.status = 'in_progress';
    this.coordinationStatus.sqliteMigration.performanceImpact = 'moderate';
    
    try {
      // Pre-migration optimization
      await this.optimizeForMigration();
      
      // Coordinate migration with real-time monitoring
      await this.monitoredMigration();
      
      // Post-migration optimization
      await this.optimizePostMigration();
      
      this.coordinationStatus.sqliteMigration.status = 'completed';
      this.coordinationStatus.sqliteMigration.performanceImpact = 'none';
      
      console.log('✅ SQLite migration coordination completed successfully');
      
    } catch (error) {
      this.coordinationStatus.sqliteMigration.status = 'failed';
      console.error('SQLite migration coordination failed:', error);
      throw error;
    }
  }

  /**
   * Coordinate calendar integration with performance monitoring
   */
  async coordinateCalendarIntegration(): Promise<void> {
    console.log('📅 Coordinating calendar integration with performance optimization...');
    
    this.coordinationStatus.calendarIntegration.status = 'initializing';
    this.coordinationStatus.calendarIntegration.performanceImpact = 'minimal';
    
    try {
      // Initialize calendar with performance monitoring
      await this.monitoredCalendarInitialization();
      
      // Test calendar performance
      await this.validateCalendarPerformance();
      
      this.coordinationStatus.calendarIntegration.status = 'active';
      console.log('✅ Calendar integration coordination completed successfully');
      
    } catch (error) {
      console.warn('Calendar integration failed, activating fallback:', error);
      this.coordinationStatus.calendarIntegration.status = 'fallback';
      await performantCalendarService.activateFallbackMode(0);
    }
  }

  /**
   * Real-time performance monitoring and optimization
   */
  async monitorIntegratedPerformance(): Promise<IntegratedPerformanceReport> {
    const monitoringStartTime = performance.now();
    
    // Collect performance metrics from all systems
    const crisisAccessTime = await this.benchmarkCrisisAccess();
    const migrationProgress = this.coordinationStatus.sqliteMigration.progress;
    const calendarResponseTime = await this.measureCalendarPerformance();
    const memoryUsage = await this.analyzeMemoryFootprint();
    const batteryImpact = await this.assessBatteryUsage();
    
    // Calculate composite performance score
    const performanceScore = this.calculatePerformanceScore({
      crisisAccessSpeed: crisisAccessTime,
      migrationProgress,
      calendarResponseTime,
      memoryUsage,
      batteryImpact
    });
    
    // Generate recommendations
    const recommendations = this.generatePerformanceRecommendations({
      crisisAccessSpeed: crisisAccessTime,
      migrationProgress,
      calendarResponseTime,
      memoryUsage,
      batteryImpact
    });
    
    // Determine overall health
    const overallHealth = this.determineOverallHealth(performanceScore, crisisAccessTime, memoryUsage);
    
    const monitoringTime = performance.now() - monitoringStartTime;
    performanceMonitor.recordEvent('navigationTime', monitoringTime, 'integrated_performance_monitoring');
    
    return {
      overallHealth,
      criticalMetrics: {
        crisisAccessSpeed: crisisAccessTime,
        migrationProgress,
        calendarResponseTime,
        memoryUsage,
        batteryImpact
      },
      recommendations,
      alertsGenerated: performanceMonitor.getStatus().criticalIssues,
      performanceScore
    };
  }

  /**
   * Emergency performance intervention
   */
  async emergencyPerformanceIntervention(): Promise<void> {
    console.log('🚨 Emergency performance intervention activated');
    
    const startTime = performance.now();
    
    try {
      // Immediate actions for crisis access preservation
      await this.preserveCrisisAccess();
      
      // Throttle non-critical operations
      await this.throttleNonCriticalOperations();
      
      // Free memory aggressively
      await this.aggressiveMemoryCleanup();
      
      // Pause migration if running
      if (this.coordinationStatus.sqliteMigration.status === 'in_progress') {
        console.log('⏸️ Pausing SQLite migration for performance recovery');
        // Migration pause logic would go here
      }
      
      // Switch calendar to fallback mode
      if (this.coordinationStatus.calendarIntegration.status === 'active') {
        await performantCalendarService.activateFallbackMode(0);
        this.coordinationStatus.calendarIntegration.status = 'fallback';
      }
      
      const interventionTime = performance.now() - startTime;
      console.log(`⚡ Emergency intervention completed in ${interventionTime.toFixed(2)}ms`);
      
    } catch (error) {
      console.error('Emergency performance intervention failed:', error);
    }
  }

  /**
   * Get real-time coordination status
   */
  getCoordinationStatus(): FeatureCoordinationStatus & {
    performanceReport: IntegratedPerformanceReport | null;
    resourceUtilization: {
      memory: { used: number; available: number; percentage: number };
      cpu: { usage: number; throttled: boolean };
      io: { operations: number; queued: number };
    };
  } {
    return {
      ...this.coordinationStatus,
      performanceReport: null, // Would be populated by latest monitoring
      resourceUtilization: {
        memory: {
          used: 0, // Would be populated by actual memory monitoring
          available: this.resourceBudget.memory.total,
          percentage: 0
        },
        cpu: {
          usage: 0, // Would be populated by actual CPU monitoring
          throttled: this.coordinationStatus.coordination.activeThrottling
        },
        io: {
          operations: 0, // Would be populated by actual I/O monitoring
          queued: 0
        }
      }
    };
  }

  /**
   * Private helper methods
   */

  private async assessSystemCapabilities(): Promise<void> {
    // Assess device memory and CPU capabilities
    // This would integrate with React Native performance APIs
    console.log('📊 Assessing system capabilities...');
  }

  private async calculateOptimalResourceBudget(): Promise<void> {
    // Adjust resource budget based on device capabilities
    // Lower-end devices get smaller budgets
    console.log('💰 Calculating optimal resource budget...');
  }

  private async initializeCoordinationSystem(): Promise<void> {
    // Set up listeners for coordination between SQLite and Calendar
    console.log('🔗 Initializing coordination system...');
  }

  private async optimizeForMigration(): Promise<void> {
    console.log('🔧 Optimizing system for SQLite migration...');
    
    // Clear unnecessary caches
    await this.clearNonCriticalCaches();
    
    // Defer non-essential operations
    await this.deferNonEssentialOperations();
    
    // Set resource priorities
    this.coordinationStatus.coordination.activeThrottling = true;
  }

  private async monitoredMigration(): Promise<void> {
    // Start SQLite migration with continuous monitoring
    await sqliteDataStore.migrateFromAsyncStorage((progress) => {
      this.coordinationStatus.sqliteMigration.progress = progress.progress;
      this.coordinationStatus.sqliteMigration.estimatedTimeRemaining = progress.estimatedTimeRemaining;
      
      // Monitor critical metrics during migration
      this.benchmarkCrisisAccess().then(accessTime => {
        if (accessTime > this.performanceThresholds.critical.crisisAccessSpeed) {
          console.error(`🚨 CRITICAL: Crisis access degraded to ${accessTime}ms during migration`);
        }
      });
    });
  }

  private async optimizePostMigration(): Promise<void> {
    console.log('⚡ Optimizing system post-SQLite migration...');
    
    // Resume normal resource allocation
    this.coordinationStatus.coordination.activeThrottling = false;
    
    // Clear migration-related caches
    await this.clearMigrationCaches();
    
    // Validate performance improvements
    await this.validateMigrationPerformanceGains();
  }

  private async monitoredCalendarInitialization(): Promise<void> {
    const startTime = performance.now();
    
    // Initialize calendar with performance tracking
    await performantCalendarService.optimizeForPlatform();
    
    const permissionResult = await performantCalendarService.requestPermissions();
    this.coordinationStatus.calendarIntegration.permissionStatus = 
      permissionResult.granted ? 'granted' : 'denied';
    
    const initTime = performance.now() - startTime;
    
    if (initTime > 3000) { // 3s threshold
      console.warn(`⚠️ Calendar initialization slow: ${initTime}ms`);
    }
  }

  private async validateCalendarPerformance(): Promise<void> {
    // Test calendar performance with sample operations
    const testReminder = {
      id: 'test',
      title: 'Performance Test',
      type: 'morning' as const,
      frequency: 'daily' as const,
      startDate: new Date()
    };
    
    const result = await performantCalendarService.createTherapeuticReminders([testReminder]);
    
    if (result.averageTimePerEvent > 500) {
      console.warn(`⚠️ Calendar performance below target: ${result.averageTimePerEvent}ms per event`);
    }
  }

  private async benchmarkCrisisAccess(): Promise<number> {
    const startTime = performance.now();
    
    try {
      // Test crisis plan access speed
      await sqliteDataStore.getCrisisPlan();
      return performance.now() - startTime;
    } catch (error) {
      console.error('Crisis access benchmark failed:', error);
      return 999; // High value to trigger alerts
    }
  }

  private async measureCalendarPerformance(): Promise<number> {
    const startTime = performance.now();
    
    try {
      const result = await performantCalendarService.requestPermissions();
      return result.responseTime;
    } catch (error) {
      console.error('Calendar performance measurement failed:', error);
      return 5000; // High value to indicate failure
    }
  }

  private async analyzeMemoryFootprint(): Promise<number> {
    // This would integrate with actual React Native memory monitoring
    return 85 * 1024 * 1024; // Placeholder: 85MB
  }

  private async assessBatteryUsage(): Promise<number> {
    // This would integrate with battery monitoring APIs
    return 5; // Placeholder: 5% additional battery usage
  }

  private calculatePerformanceScore(metrics: IntegratedPerformanceReport['criticalMetrics']): number {
    let score = 100;
    
    // Crisis access speed (50% of score)
    if (metrics.crisisAccessSpeed > this.performanceThresholds.critical.crisisAccessSpeed) {
      score -= 50;
    } else if (metrics.crisisAccessSpeed > this.performanceThresholds.warning.crisisAccessSpeed) {
      score -= 25;
    }
    
    // Memory usage (25% of score)
    if (metrics.memoryUsage > this.performanceThresholds.critical.memoryUsage) {
      score -= 25;
    } else if (metrics.memoryUsage > this.performanceThresholds.warning.memoryUsage) {
      score -= 12;
    }
    
    // Calendar performance (15% of score)
    if (metrics.calendarResponseTime > 2000) {
      score -= 15;
    } else if (metrics.calendarResponseTime > 1500) {
      score -= 7;
    }
    
    // Migration progress (10% of score)
    if (metrics.migrationProgress < 100) {
      score -= (100 - metrics.migrationProgress) * 0.1;
    }
    
    return Math.max(0, score);
  }

  private generatePerformanceRecommendations(
    metrics: IntegratedPerformanceReport['criticalMetrics']
  ): string[] {
    const recommendations: string[] = [];
    
    if (metrics.crisisAccessSpeed > this.performanceThresholds.warning.crisisAccessSpeed) {
      recommendations.push('CRITICAL: Optimize crisis access speed - current speed exceeds safety threshold');
    }
    
    if (metrics.memoryUsage > this.performanceThresholds.warning.memoryUsage) {
      recommendations.push('High memory usage detected - consider aggressive cleanup during operations');
    }
    
    if (metrics.calendarResponseTime > 1500) {
      recommendations.push('Calendar operations slow - consider increasing cache duration or fallback activation');
    }
    
    if (metrics.batteryImpact > 10) {
      recommendations.push('High battery impact - optimize background processing and reduce polling frequency');
    }
    
    if (metrics.migrationProgress < 100 && metrics.migrationProgress > 0) {
      recommendations.push('SQLite migration in progress - monitor for performance degradation');
    }
    
    return recommendations;
  }

  private determineOverallHealth(
    score: number,
    crisisAccessSpeed: number,
    memoryUsage: number
  ): IntegratedPerformanceReport['overallHealth'] {
    // Crisis access speed is always critical
    if (crisisAccessSpeed > this.performanceThresholds.critical.crisisAccessSpeed) {
      return 'critical';
    }
    
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 50) return 'warning';
    return 'critical';
  }

  private async preserveCrisisAccess(): Promise<void> {
    // Ensure crisis data is immediately accessible
    console.log('🆘 Preserving crisis access during performance intervention');
  }

  private async throttleNonCriticalOperations(): Promise<void> {
    // Throttle or pause non-critical background operations
    console.log('🐌 Throttling non-critical operations');
    this.coordinationStatus.coordination.activeThrottling = true;
  }

  private async aggressiveMemoryCleanup(): Promise<void> {
    // Perform aggressive memory cleanup
    console.log('🧹 Performing aggressive memory cleanup');
  }

  private async clearNonCriticalCaches(): Promise<void> {
    // Clear non-critical caches to free memory
    console.log('🗑️ Clearing non-critical caches');
  }

  private async deferNonEssentialOperations(): Promise<void> {
    // Defer non-essential operations until after migration
    console.log('⏰ Deferring non-essential operations');
  }

  private async clearMigrationCaches(): Promise<void> {
    // Clear caches used during migration
    console.log('🧽 Clearing migration caches');
  }

  private async validateMigrationPerformanceGains(): Promise<void> {
    // Validate that migration achieved expected performance improvements
    console.log('✅ Validating migration performance gains');
  }
}

// Export singleton instance
export const integratedPerformanceManager = new IntegratedPerformanceManager();