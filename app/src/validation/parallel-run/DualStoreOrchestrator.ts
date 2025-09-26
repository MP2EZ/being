/**
 * Dual Store Orchestrator - Phase 5E: Store Pattern Transition
 * 
 * MISSION: Orchestrate seamless operation of both old and clinical pattern stores
 * CRITICAL: Zero downtime, data integrity, performance maintained
 */

import ParallelValidationEngine, { 
  ParallelRunConfig, 
  StoreOperation 
} from './ParallelValidationEngine';
import { ISODateString, createISODateString } from '../../types/clinical';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Store Registry
interface StoreRegistry {
  old: {
    userStore: any;
    assessmentStore: any;
    crisisStore: any;
    settingsStore: any;
  };
  clinical: {
    userStore: any;
    assessmentStore: any;
    crisisStore: any;
    settingsStore: any;
  };
}

interface DualOperationResult<T> {
  result: T;
  source: 'OLD' | 'CLINICAL' | 'HYBRID';
  validationPassed: boolean;
  responseTime: number;
  discrepancies: number;
}

class DualStoreOrchestrator {
  private validationEngine: ParallelValidationEngine;
  private storeRegistry: StoreRegistry;
  private isParallelMode: boolean = false;
  private operationCount: number = 0;

  constructor(stores: StoreRegistry) {
    this.storeRegistry = stores;
    
    // Initialize validation engine with 24-hour config
    const config: ParallelRunConfig = {
      enabled: true,
      startTime: createISODateString(),
      duration: 24, // 24 hours
      validationInterval: 5000, // 5 second validation checks
      crisisResponseThreshold: 200, // <200ms crisis response
      assessmentResponseThreshold: 500, // <500ms assessment response
      autoRollbackEnabled: true,
      discrepancyTolerance: 0 // Zero tolerance for discrepancies
    };

    this.validationEngine = new ParallelValidationEngine(config);
    this.setupRollbackCallbacks();
  }

  /**
   * Initialize 24-hour parallel run
   */
  async initializeParallelRun(): Promise<void> {
    console.log('🚀 Initializing 24-hour dual store parallel run');
    
    this.isParallelMode = true;
    await this.validationEngine.startParallelRun();

    // Create operation log
    await AsyncStorage.setItem('DUAL_STORE_LOG', JSON.stringify({
      startTime: createISODateString(),
      mode: 'PARALLEL',
      operationCount: 0
    }));
  }

  /**
   * User Store Operations
   */
  async executeUserOperation<T>(
    operation: (store: any) => Promise<T>,
    operationType: 'READ' | 'write' | 'update'
  ): Promise<DualOperationResult<T>> {
    return this.executeDualOperation(
      'USER',
      operation,
      this.storeRegistry.old.userStore,
      this.storeRegistry.clinical.userStore,
      operationType
    );
  }

  /**
   * Assessment Store Operations (CRITICAL)
   */
  async executeAssessmentOperation<T>(
    operation: (store: any) => Promise<T>,
    operationType: 'read' | 'write' | 'update'
  ): Promise<DualOperationResult<T>> {
    // Assessment operations require extra validation
    return this.executeDualOperation(
      'ASSESSMENT',
      operation,
      this.storeRegistry.old.assessmentStore,
      this.storeRegistry.clinical.assessmentStore,
      operationType,
      true // Enhanced validation for clinical data
    );
  }

  /**
   * Crisis Store Operations (ULTRA-CRITICAL)
   */
  async executeCrisisOperation<T>(
    operation: (store: any) => Promise<T>,
    operationType: 'read' | 'write' | 'update'
  ): Promise<DualOperationResult<T>> {
    const startTime = Date.now();

    // Crisis operations use validation engine's crisis-specific handler
    const result = await this.validationEngine.validateCrisisOperation(
      () => operation(this.storeRegistry.clinical.crisisStore),
      this.storeRegistry.old.crisisStore,
      this.storeRegistry.clinical.crisisStore
    );

    const responseTime = Date.now() - startTime;

    return {
      result,
      source: 'CLINICAL',
      validationPassed: responseTime < 200,
      responseTime,
      discrepancies: 0 // Would be populated by validation engine
    };
  }

  /**
   * Settings Store Operations
   */
  async executeSettingsOperation<T>(
    operation: (store: any) => Promise<T>,
    operationType: 'read' | 'write' | 'update'
  ): Promise<DualOperationResult<T>> {
    return this.executeDualOperation(
      'SETTINGS',
      operation,
      this.storeRegistry.old.settingsStore,
      this.storeRegistry.clinical.settingsStore,
      operationType
    );
  }

  /**
   * Core dual operation execution
   */
  private async executeDualOperation<T>(
    storeType: 'USER' | 'ASSESSMENT' | 'CRISIS' | 'SETTINGS',
    operation: (store: any) => Promise<T>,
    oldStore: any,
    clinicalStore: any,
    operationType: 'read' | 'write' | 'update',
    enhancedValidation: boolean = false
  ): Promise<DualOperationResult<T>> {
    this.operationCount++;
    
    if (!this.isParallelMode) {
      // Default to clinical store if not in parallel mode
      const startTime = Date.now();
      const result = await operation(clinicalStore);
      return {
        result,
        source: 'CLINICAL',
        validationPassed: true,
        responseTime: Date.now() - startTime,
        discrepancies: 0
      };
    }

    const storeOperation: StoreOperation = {
      type: operationType.toUpperCase() as any,
      store: storeType,
      payload: null,
      expectedResult: null,
      timestamp: createISODateString()
    };

    const startTime = Date.now();

    try {
      const result = await this.validationEngine.executeWithValidation(
        storeOperation,
        () => operation(oldStore),
        () => operation(clinicalStore)
      );

      const responseTime = Date.now() - startTime;

      // Log operation
      await this.logOperation(storeType, operationType, responseTime, true);

      return {
        result,
        source: 'CLINICAL',
        validationPassed: true,
        responseTime,
        discrepancies: 0 // Would be populated by validation engine
      };
    } catch (error) {
      console.error(`❌ Dual ${storeType} operation failed:`, error);
      
      // Fallback to old store
      const result = await operation(oldStore);
      const responseTime = Date.now() - startTime;
      
      await this.logOperation(storeType, operationType, responseTime, false);

      return {
        result,
        source: 'OLD',
        validationPassed: false,
        responseTime,
        discrepancies: 1
      };
    }
  }

  /**
   * Setup rollback callbacks for all stores
   */
  private setupRollbackCallbacks(): void {
    // User Store Rollback
    this.validationEngine.registerRollback('USER', async () => {
      console.log('🔄 Rolling back User Store to old implementation');
      // Would implement actual rollback logic
      this.storeRegistry.clinical.userStore = this.storeRegistry.old.userStore;
    });

    // Assessment Store Rollback (CRITICAL)
    this.validationEngine.registerRollback('ASSESSMENT', async () => {
      console.log('🔄 Rolling back Assessment Store to old implementation');
      this.storeRegistry.clinical.assessmentStore = this.storeRegistry.old.assessmentStore;
      
      // Clear any cached assessment data
      await AsyncStorage.removeItem('ASSESSMENT_CLINICAL_CACHE');
    });

    // Crisis Store Rollback (ULTRA-CRITICAL)
    this.validationEngine.registerRollback('CRISIS', async () => {
      console.log('🚨 EMERGENCY: Rolling back Crisis Store to old implementation');
      this.storeRegistry.clinical.crisisStore = this.storeRegistry.old.crisisStore;
      
      // Ensure crisis functionality remains available
      await AsyncStorage.setItem('CRISIS_STORE_STATUS', 'ROLLED_BACK');
    });

    // Settings Store Rollback
    this.validationEngine.registerRollback('SETTINGS', async () => {
      console.log('🔄 Rolling back Settings Store to old implementation');
      this.storeRegistry.clinical.settingsStore = this.storeRegistry.old.settingsStore;
    });
  }

  /**
   * Log operation for monitoring
   */
  private async logOperation(
    store: string,
    operation: string,
    responseTime: number,
    success: boolean
  ): Promise<void> {
    const logEntry = {
      timestamp: createISODateString(),
      store,
      operation,
      responseTime,
      success,
      operationNumber: this.operationCount
    };

    try {
      const existingLog = await AsyncStorage.getItem('DUAL_STORE_OPERATIONS');
      const operations = existingLog ? JSON.parse(existingLog) : [];
      
      operations.push(logEntry);
      
      // Keep only last 1000 operations
      if (operations.length > 1000) {
        operations.splice(0, operations.length - 1000);
      }
      
      await AsyncStorage.setItem('DUAL_STORE_OPERATIONS', JSON.stringify(operations));
    } catch (error) {
      console.warn('Failed to log operation:', error);
    }
  }

  /**
   * Get operation statistics
   */
  async getOperationStats(): Promise<{
    totalOperations: number;
    successfulOperations: number;
    averageResponseTime: number;
    storeBreakdown: Record<string, number>;
    currentMode: string;
  }> {
    try {
      const operationsData = await AsyncStorage.getItem('DUAL_STORE_OPERATIONS');
      const operations = operationsData ? JSON.parse(operationsData) : [];
      
      const totalOperations = operations.length;
      const successfulOperations = operations.filter((op: any) => op.success).length;
      const avgResponseTime = operations.length > 0 ? 
        operations.reduce((sum: number, op: any) => sum + op.responseTime, 0) / operations.length : 0;

      const storeBreakdown = operations.reduce((acc: Record<string, number>, op: any) => {
        acc[op.store] = (acc[op.store] || 0) + 1;
        return acc;
      }, {});

      return {
        totalOperations,
        successfulOperations,
        averageResponseTime: Math.round(avgResponseTime),
        storeBreakdown,
        currentMode: this.isParallelMode ? 'PARALLEL' : 'CLINICAL_ONLY'
      };
    } catch (error) {
      console.error('Failed to get operation stats:', error);
      return {
        totalOperations: 0,
        successfulOperations: 0,
        averageResponseTime: 0,
        storeBreakdown: {},
        currentMode: 'UNKNOWN'
      };
    }
  }

  /**
   * Check parallel run health
   */
  getHealthStatus() {
    const validationStatus = this.validationEngine.getValidationStatus();
    
    return {
      parallelMode: this.isParallelMode,
      operationCount: this.operationCount,
      validationEngine: validationStatus,
      healthScore: this.calculateHealthScore(validationStatus)
    };
  }

  /**
   * Calculate health score (0-100)
   */
  private calculateHealthScore(validationStatus: any): number {
    let score = 100;

    // Deduct for discrepancies
    score -= validationStatus.discrepancies * 5;

    // Major deduction for critical issues
    score -= validationStatus.criticalIssues * 20;

    // Bonus for successful operations
    if (this.operationCount > 0 && validationStatus.discrepancies === 0) {
      score = Math.min(100, score + 10);
    }

    return Math.max(0, Math.round(score));
  }

  /**
   * Force rollback to old stores
   */
  async forceRollbackToOldStores(): Promise<void> {
    console.log('🔄 FORCE ROLLBACK: Switching to old store implementations');
    
    this.isParallelMode = false;
    
    // Update registry to use old stores
    this.storeRegistry.clinical = { ...this.storeRegistry.old };
    
    await AsyncStorage.setItem('FORCE_ROLLBACK_TIMESTAMP', createISODateString());
  }

  /**
   * Complete parallel run and switch to clinical stores
   */
  async completeParallelRun(): Promise<void> {
    console.log('✅ PARALLEL RUN COMPLETE: Switching to clinical pattern stores');
    
    this.isParallelMode = false;
    
    const stats = await this.getOperationStats();
    console.log('📊 Final Statistics:', stats);
    
    await AsyncStorage.setItem('PARALLEL_RUN_COMPLETION', JSON.stringify({
      timestamp: createISODateString(),
      stats,
      result: 'SUCCESS'
    }));
  }
}

export default DualStoreOrchestrator;
export type { DualOperationResult, StoreRegistry };