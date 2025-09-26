/**
 * Phase 5E Orchestrator - Complete 24-Hour Parallel Run System
 * 
 * MISSION: Execute seamless 24-hour dual store validation with zero downtime
 * CRITICAL: Coordinate all systems for successful clinical pattern transition
 */

import ParallelValidationEngine, { ParallelRunConfig } from './ParallelValidationEngine';
import DualStoreOrchestrator, { StoreRegistry } from './DualStoreOrchestrator';
import AutomatedRollbackSystem from './AutomatedRollbackSystem';
import ParallelRunPerformanceMonitor from './ParallelRunPerformanceMonitor';
import { ISODateString, createISODateString } from '../../types/clinical';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import stores
import { useUserStore } from '../../store/userStore';
import { useUserStore as useClinicalUserStore } from '../../store/userStore.clinical';
import { useAssessmentStore } from '../../store/assessmentStore';
import { useCrisisStore } from '../../store/crisisStore';
import { useCrisisStore as useClinicalCrisisStore } from '../../store/crisisStore.clinical';
import { useFeatureFlagStore } from '../../store/featureFlagStore';
import { useFeatureFlagStore as useClinicalFeatureFlagStore } from '../../store/featureFlagStore.clinical';

interface Phase5EResult {
  success: boolean;
  duration: number;
  totalOperations: number;
  discrepanciesFound: number;
  rollbacksTriggered: number;
  performanceViolations: number;
  finalHealthScore: number;
  migrationDecision: 'COMPLETE_MIGRATION' | 'PARTIAL_ROLLBACK' | 'FULL_ROLLBACK';
  nextSteps: string[];
}

interface Phase5EConfig {
  durationHours: number;
  validationInterval: number; // ms
  performanceThresholds: {
    crisis: number;
    assessment: number;
    user: number;
    settings: number;
  };
  autoRollback: boolean;
  emergencyContacts: string[];
}

class Phase5EOrchestrator {
  private validationEngine: ParallelValidationEngine;
  private storeOrchestrator: DualStoreOrchestrator;
  private rollbackSystem: AutomatedRollbackSystem;
  private performanceMonitor: ParallelRunPerformanceMonitor;
  private isRunning: boolean = false;
  private config: Phase5EConfig;
  private startTime: ISODateString | null = null;

  constructor(config: Phase5EConfig) {
    this.config = config;
    
    // Initialize systems
    this.rollbackSystem = new AutomatedRollbackSystem();
    this.performanceMonitor = new ParallelRunPerformanceMonitor();
    
    // Setup store registry
    const storeRegistry: StoreRegistry = {
      old: {
        userStore: useUserStore.getState(),
        assessmentStore: useAssessmentStore.getState(),
        crisisStore: useCrisisStore.getState(),
        settingsStore: useFeatureFlagStore.getState()
      },
      clinical: {
        userStore: useClinicalUserStore.getState(),
        assessmentStore: useAssessmentStore.getState(), // Already migrated
        crisisStore: useClinicalCrisisStore.getState(),
        settingsStore: useClinicalFeatureFlagStore.getState()
      }
    };

    this.storeOrchestrator = new DualStoreOrchestrator(storeRegistry);

    // Initialize validation engine
    const validationConfig: ParallelRunConfig = {
      enabled: true,
      startTime: createISODateString(),
      duration: config.durationHours,
      validationInterval: config.validationInterval,
      crisisResponseThreshold: config.performanceThresholds.crisis,
      assessmentResponseThreshold: config.performanceThresholds.assessment,
      autoRollbackEnabled: config.autoRollback,
      discrepancyTolerance: 0
    };

    this.validationEngine = new ParallelValidationEngine(validationConfig);
  }

  /**
   * Execute complete Phase 5E: 24-Hour Parallel Run
   */
  async executePhase5E(): Promise<Phase5EResult> {
    console.log('🚀 PHASE 5E: Starting 24-Hour Parallel Validation Run');
    
    if (this.isRunning) {
      throw new Error('Phase 5E already in progress');
    }

    this.isRunning = true;
    this.startTime = createISODateString();
    
    try {
      // Step 1: Initialize all systems
      await this.initializeSystems();
      
      // Step 2: Start monitoring and validation
      await this.startMonitoring();
      
      // Step 3: Execute parallel run
      const result = await this.executeParallelRun();
      
      // Step 4: Analyze results and make migration decision
      const migrationDecision = await this.analyzeMigrationDecision(result);
      
      // Step 5: Execute final migration or rollback
      await this.executeFinalDecision(migrationDecision);
      
      console.log('✅ PHASE 5E COMPLETE:', migrationDecision);
      
      return {
        success: migrationDecision === 'COMPLETE_MIGRATION',
        duration: this.config.durationHours,
        totalOperations: result.totalOperations,
        discrepanciesFound: result.discrepanciesFound,
        rollbacksTriggered: result.rollbacksTriggered,
        performanceViolations: result.performanceViolations,
        finalHealthScore: result.healthScore,
        migrationDecision,
        nextSteps: this.generateNextSteps(migrationDecision)
      };
      
    } catch (error) {
      console.error('❌ PHASE 5E FAILED:', error);
      
      // Emergency rollback
      await this.executeEmergencyRollback(error as Error);
      
      return {
        success: false,
        duration: this.config.durationHours,
        totalOperations: 0,
        discrepanciesFound: 0,
        rollbacksTriggered: 1,
        performanceViolations: 0,
        finalHealthScore: 0,
        migrationDecision: 'FULL_ROLLBACK',
        nextSteps: ['Review error logs', 'Fix issues', 'Retry Phase 5E']
      };
    } finally {
      this.isRunning = false;
      await this.cleanup();
    }
  }

  /**
   * Initialize all monitoring systems
   */
  private async initializeSystems(): Promise<void> {
    console.log('🔧 Initializing Phase 5E systems...');
    
    // Initialize validation engine
    await this.validationEngine.startParallelRun();
    
    // Initialize dual store orchestrator
    await this.storeOrchestrator.initializeParallelRun();
    
    // Start performance monitoring
    this.performanceMonitor.startMonitoring();
    
    // Create system checkpoint
    await AsyncStorage.setItem('PHASE_5E_CHECKPOINT', JSON.stringify({
      timestamp: createISODateString(),
      systems: {
        validationEngine: 'INITIALIZED',
        storeOrchestrator: 'INITIALIZED',
        rollbackSystem: 'INITIALIZED',
        performanceMonitor: 'INITIALIZED'
      }
    }));

    console.log('✅ All systems initialized successfully');
  }

  /**
   * Start monitoring and validation
   */
  private async startMonitoring(): Promise<void> {
    console.log('👁️ Starting comprehensive monitoring...');
    
    // Monitor performance continuously
    setInterval(async () => {
      if (!this.isRunning) return;
      
      await this.performHealthCheck();
    }, 30000); // Health check every 30 seconds
    
    // Monitor for rollback triggers
    setInterval(async () => {
      if (!this.isRunning) return;
      
      await this.checkRollbackTriggers();
    }, 10000); // Rollback check every 10 seconds
    
    console.log('✅ Monitoring systems active');
  }

  /**
   * Execute the parallel run
   */
  private async executeParallelRun(): Promise<{
    totalOperations: number;
    discrepanciesFound: number;
    rollbacksTriggered: number;
    performanceViolations: number;
    healthScore: number;
  }> {
    console.log('⚡ Executing parallel run operations...');
    
    const durationMs = this.config.durationHours * 60 * 60 * 1000;
    const startTime = Date.now();
    let operationCount = 0;
    
    // Simulate store operations during parallel run
    while (Date.now() - startTime < durationMs && this.isRunning) {
      try {
        // Execute test operations on all stores
        await this.executeTestOperations();
        operationCount++;
        
        // Wait between operations
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error('Operation failed during parallel run:', error);
      }
    }

    // Get final metrics
    const validationStatus = this.validationEngine.getValidationStatus();
    const performanceStatus = this.performanceMonitor.getMonitoringStatus();
    const rollbackStatus = this.rollbackSystem.getSystemStatus();
    
    return {
      totalOperations: operationCount,
      discrepanciesFound: validationStatus.discrepancies,
      rollbacksTriggered: rollbackStatus.totalRollbacks,
      performanceViolations: performanceStatus.recentViolations,
      healthScore: performanceStatus.healthScore
    };
  }

  /**
   * Execute test operations on all stores
   */
  private async executeTestOperations(): Promise<void> {
    const operations = [
      // User operations
      () => this.storeOrchestrator.executeUserOperation(
        store => Promise.resolve(store.user || { id: 'test', name: 'Test User' }),
        'read'
      ),
      
      // Assessment operations
      () => this.storeOrchestrator.executeAssessmentOperation(
        store => Promise.resolve(store.phq9Score || 0),
        'read'
      ),
      
      // Crisis operations (critical timing)
      () => this.storeOrchestrator.executeCrisisOperation(
        store => Promise.resolve(store.crisisLevel || 'LOW'),
        'read'
      ),
      
      // Settings operations
      () => this.storeOrchestrator.executeSettingsOperation(
        store => Promise.resolve(store.preferences || {}),
        'read'
      )
    ];

    // Execute operations in parallel for efficiency
    const results = await Promise.allSettled(operations.map(op => op()));
    
    // Record performance metrics
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const storeNames = ['USER', 'ASSESSMENT', 'CRISIS', 'SETTINGS'];
        const responseTime = result.value.responseTime || 0;
        
        this.performanceMonitor.recordMetric(
          'test_operation',
          storeNames[index] as any,
          responseTime
        );
      }
    });
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    const validationStatus = this.validationEngine.getValidationStatus();
    const performanceStatus = this.performanceMonitor.getMonitoringStatus();
    const orchestratorStatus = this.storeOrchestrator.getHealthStatus();
    
    // Log health status
    console.log('🏥 Health Check:', {
      validation: validationStatus,
      performance: performanceStatus,
      orchestrator: orchestratorStatus
    });
    
    // Store health check result
    await AsyncStorage.setItem('HEALTH_CHECK_LATEST', JSON.stringify({
      timestamp: createISODateString(),
      validation: validationStatus,
      performance: performanceStatus,
      orchestrator: orchestratorStatus
    }));
  }

  /**
   * Check for rollback triggers
   */
  private async checkRollbackTriggers(): Promise<void> {
    const validationStatus = this.validationEngine.getValidationStatus();
    const performanceStatus = this.performanceMonitor.getMonitoringStatus();
    
    // Check critical violations
    if (validationStatus.criticalIssues > 0) {
      console.warn('🚨 Critical issues detected, evaluating rollback...');
    }
    
    if (performanceStatus.recentViolations > 5) {
      console.warn('⚠️ Performance violations detected, evaluating rollback...');
    }
    
    // The rollback system will automatically trigger if thresholds are met
  }

  /**
   * Analyze migration decision based on results
   */
  private async analyzeMigrationDecision(result: {
    totalOperations: number;
    discrepanciesFound: number;
    rollbacksTriggered: number;
    performanceViolations: number;
    healthScore: number;
  }): Promise<'COMPLETE_MIGRATION' | 'PARTIAL_ROLLBACK' | 'FULL_ROLLBACK'> {
    console.log('🤔 Analyzing migration decision...', result);
    
    // Decision criteria
    const criticalIssues = result.discrepanciesFound > 0;
    const performanceIssues = result.performanceViolations > 10;
    const rollbacksOccurred = result.rollbacksTriggered > 0;
    const healthScoreLow = result.healthScore < 90;
    
    // Decision logic
    if (!criticalIssues && !performanceIssues && !rollbacksOccurred && result.healthScore >= 95) {
      return 'COMPLETE_MIGRATION';
    }
    
    if (criticalIssues || result.rollbacksTriggered > 2 || result.healthScore < 70) {
      return 'FULL_ROLLBACK';
    }
    
    return 'PARTIAL_ROLLBACK';
  }

  /**
   * Execute final migration decision
   */
  private async executeFinalDecision(
    decision: 'COMPLETE_MIGRATION' | 'PARTIAL_ROLLBACK' | 'FULL_ROLLBACK'
  ): Promise<void> {
    console.log('📋 Executing final decision:', decision);
    
    switch (decision) {
      case 'COMPLETE_MIGRATION':
        await this.completeSuccessfulMigration();
        break;
      
      case 'PARTIAL_ROLLBACK':
        await this.executePartialRollback();
        break;
      
      case 'FULL_ROLLBACK':
        await this.executeFullRollback();
        break;
    }
    
    // Log decision
    await AsyncStorage.setItem('PHASE_5E_FINAL_DECISION', JSON.stringify({
      timestamp: createISODateString(),
      decision,
      rationale: this.getDecisionRationale(decision)
    }));
  }

  /**
   * Complete successful migration
   */
  private async completeSuccessfulMigration(): Promise<void> {
    console.log('🎉 MIGRATION SUCCESS: Switching to clinical pattern stores');
    
    await this.storeOrchestrator.completeParallelRun();
    
    // Update store exports to use clinical patterns
    await AsyncStorage.setItem('STORE_MIGRATION_COMPLETE', JSON.stringify({
      timestamp: createISODateString(),
      stores: ['USER', 'ASSESSMENT', 'CRISIS', 'SETTINGS'],
      pattern: 'CLINICAL'
    }));
  }

  /**
   * Execute partial rollback
   */
  private async executePartialRollback(): Promise<void> {
    console.log('⚠️ PARTIAL ROLLBACK: Rolling back problematic stores only');
    
    // Rollback specific stores based on issues found
    await this.rollbackSystem.triggerManualRollback(
      'Partial rollback due to performance or minor data issues',
      ['USER', 'SETTINGS'] // Keep assessment and crisis on clinical pattern
    );
  }

  /**
   * Execute full rollback
   */
  private async executeFullRollback(): Promise<void> {
    console.log('🔄 FULL ROLLBACK: Rolling back all stores to old implementation');
    
    await this.storeOrchestrator.forceRollbackToOldStores();
    
    await this.rollbackSystem.triggerManualRollback(
      'Full rollback due to critical issues or data discrepancies',
      ['ALL']
    );
  }

  /**
   * Execute emergency rollback
   */
  private async executeEmergencyRollback(error: Error): Promise<void> {
    console.log('🚨 EMERGENCY ROLLBACK due to system failure:', error);
    
    try {
      await this.storeOrchestrator.forceRollbackToOldStores();
      await this.rollbackSystem.triggerManualRollback(
        `Emergency rollback due to system failure: ${error.message}`,
        ['ALL']
      );
    } catch (rollbackError) {
      console.error('❌ EMERGENCY ROLLBACK FAILED:', rollbackError);
    }
  }

  /**
   * Get decision rationale
   */
  private getDecisionRationale(decision: string): string {
    switch (decision) {
      case 'COMPLETE_MIGRATION':
        return 'All systems performed within acceptable parameters with no critical issues';
      case 'PARTIAL_ROLLBACK':
        return 'Some performance issues or minor data discrepancies detected';
      case 'FULL_ROLLBACK':
        return 'Critical issues, data discrepancies, or multiple rollbacks triggered';
      default:
        return 'Unknown decision rationale';
    }
  }

  /**
   * Generate next steps based on result
   */
  private generateNextSteps(decision: string): string[] {
    switch (decision) {
      case 'COMPLETE_MIGRATION':
        return [
          'Update store exports to use clinical patterns',
          'Remove old store implementations',
          'Update documentation',
          'Monitor production performance',
          'Conduct final validation testing'
        ];
      
      case 'PARTIAL_ROLLBACK':
        return [
          'Analyze specific issues that caused rollback',
          'Fix identified problems in clinical pattern stores',
          'Conduct targeted testing on problematic stores',
          'Re-run Phase 5E with fixes',
          'Consider gradual migration approach'
        ];
      
      case 'FULL_ROLLBACK':
        return [
          'Comprehensive analysis of all critical issues',
          'Review clinical pattern implementation',
          'Address data integrity and performance problems',
          'Enhance testing and validation procedures',
          'Plan Phase 5E retry with improved implementation'
        ];
      
      default:
        return ['Review system logs and determine appropriate action'];
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up Phase 5E resources...');
    
    // Stop monitoring
    this.performanceMonitor.stopMonitoring();
    
    // Create final report
    const finalReport = this.performanceMonitor.generatePerformanceReport(this.config.durationHours);
    await AsyncStorage.setItem('PHASE_5E_FINAL_REPORT', JSON.stringify(finalReport));
    
    console.log('✅ Phase 5E cleanup complete');
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      startTime: this.startTime,
      validationEngine: this.validationEngine.getValidationStatus(),
      performanceMonitor: this.performanceMonitor.getMonitoringStatus(),
      storeOrchestrator: this.storeOrchestrator.getHealthStatus(),
      rollbackSystem: this.rollbackSystem.getSystemStatus()
    };
  }
}

// Default configuration
const DEFAULT_PHASE_5E_CONFIG: Phase5EConfig = {
  durationHours: 24,
  validationInterval: 5000, // 5 seconds
  performanceThresholds: {
    crisis: 200,      // <200ms
    assessment: 500,  // <500ms
    user: 1000,       // <1s
    settings: 800     // <800ms
  },
  autoRollback: true,
  emergencyContacts: ['development-team@being.mbct']
};

export default Phase5EOrchestrator;
export { DEFAULT_PHASE_5E_CONFIG };
export type { Phase5EResult, Phase5EConfig };